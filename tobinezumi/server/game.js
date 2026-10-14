// tobinezumi/server/game.js — 接続ごとの受け付け（認証・振り分け）と、地上・巣の部屋をまとめる本体。ws には依存しない
// （テストでは偽の接続 {send, close} をつないで、そのまま動かせる）。
//
//   const game = new Game({ store, auth });  game.start();      … 20Hz のティック・30 秒ごとの位置保存
//   const s = game.connect({ ip, sendRaw(text), close(code, reason) });
//   s.onMessage(text) / s.onClose()
import { buildFieldMap } from '../shared/regions.js';
import { boxFree } from '../shared/move.js';
import { makeInventory, swapSlots, removeItem, countItem, START_INVENTORY, INV_SLOTS } from '../shared/items.js';
import { C2S, S2C, ERR, decode, cleanChat, validName, validUsername, validPassword, FUR_IDS, PROTOCOL_VERSION, SERVER_TICK_HZ, POS_SAVE_MS, RECONNECT_GRACE_MS, MAX_FRIENDS, FRIEND_OPS_PER_MIN } from '../shared/protocol.js';
import { normalizeLife, stepLife, lifeOut, eatSeed, eatRareSeed, canEat, caughtLife, LIFE } from '../shared/life.js';
import { makeClock } from '../shared/daynight.js';
import { envAt, WEATHERS, SEASONS } from '../shared/season.js';
import { TUNING, PRED, INVULN_MS, dropItems, dropSpots, safePoint, raidLoss, RAID_COOLDOWN_MS } from '../shared/predators.js';
import { landAt, landOut } from '../shared/lands.js';
import { makeFieldState } from '../shared/move.js';
import { FieldRoom } from './rooms/field.js';
import { NestHub } from './rooms/nest.js';

export const ENTER_RANGE = 34;
export const CHAT_BURST = 5, CHAT_WINDOW_MS = 10000, CHAT_GAP_MS = 400;
export const MSG_PER_SEC = 150;
export const LIFE_STEP_MS = 500, LIFE_SEND_MS = 2000;
export const VISIT_REPEAT_MS = 2 * 60 * 1000;   // 同じ子が 2 分以内にまた入っても記録・通知しない

const fail = (code, reason, extra = {}) => ({ ok: false, code, reason, ...extra });

export class Game {
  /**
   * timeScale / startHour：開発用の早回し（index.js は TOBI_DEV=1 のときだけ渡す）。世界の時計・暮らしの減り・採集物の戻りが速くなる
   * Ver.0.3：env（天気・季節・気候の影響。テストでは切れる）・predators（'normal'|'easy'|'off'）・raids（キツネの巣の襲撃）・
   *   weather / season（固定：開発用）・devMode（C2S dev を受ける：TOBI_DEV=1 のときだけ）・relocateCooldownMs・predSeed
   */
  constructor({ store, auth, now = () => Date.now(), random = Math.random, log = console.log, respawnScale = 1, graceMs = RECONNECT_GRACE_MS, saveMs = POS_SAVE_MS, timeScale = 1, startHour = null,
    env = true, predators = 'normal', raids = true, weather = null, season = null, devMode = false, relocateCooldownMs = undefined, predSeed = null } = {}) {
    this.store = store; this.auth = auth; this.now = now; this.random = random; this.log = log;
    this.graceMs = graceMs; this.saveMs = saveMs;
    this.map = buildFieldMap();
    this.clock = makeClock({ scale: timeScale, startHour, now: now() });
    if (weather && WEATHERS[weather]) this.clock.weather = weather;
    if (season && SEASONS.some(x => x.id === season)) this.clock.season = season;
    this.envOn = env !== false; this.devMode = !!devMode;
    this.tuning = { ...(TUNING[predators] || TUNING.normal) };
    if (raids === false) this.tuning.raids = false;
    this.stats = { msgIn: 0, msgOut: 0, bytesIn: 0, bytesOut: 0, errors: 0, conns: 0, startedAt: now() };
    this.field = new FieldRoom({ store, map: this.map, now, random, log, respawnScale, stats: this.stats, clock: this.clock, env: this.envOn, tuning: this.tuning, predSeed,
      ...(relocateCooldownMs != null ? { relocateCooldownMs } : {}) });
    this.nests = new NestHub({ store, now, log });
    this.nests.onWake = p => this.wake(p);
    this._lifeAt = now(); this._lifeSendAt = now();
    this.field.nestInfo = id => this.nests.meta(id);
    this.field.onCatch = (p, e) => this.caught(p, e);
    this.field.onRaid = e => this.raid(e);
    this.field.canShelter = (p, e) => this.canShelter(p, e);
    this.field.raidInfo = (e, t) => this.raidInfo(e, t);
    this.field.onRelocate = (p, nest, ent) => this.relocated(p, nest, ent);
    this.nests.relocateCooldownMs = this.field.relocateCooldownMs;
    this.nests.onPlug = nest => { const e = this.field.entrances.get(nest.owner); if (e) for (const o of this.field.players.values()) if (o.conn) o.conn.send({ t: 'entrance', entrance: this.field.entranceOut(e, o.accountId) }); };
    this.field.load();
    this.players = new Map();    // accountId → Player（いま接続中）
    this.sessions = new Set();
    this._timers = [];
  }

  start() {
    const tickMs = 1000 / SERVER_TICK_HZ;
    this._timers.push(setInterval(() => this.tick(), tickMs));
    this._timers.push(setInterval(() => this.saveAll('live'), this.saveMs));
    this._timers.push(setInterval(() => { this.store.purgeSessions(this.now()); this.auth.loginFails.sweep(); this.auth.ipFails.sweep(); }, 3600 * 1000));
    return this;
  }
  stop() { for (const t of this._timers) clearInterval(t); this._timers = []; }
  tick() {
    try { this.field.tick(); this.nests.tick(); this.lifeTick(); }
    catch (e) { this.stats.errors++; this.log('[tick] ' + (e && e.stack || e)); }
  }
  /** 暮らしの数値を進める（地上・巣の中にいる人だけ。ログアウト中は減らない）。2 秒ごとに本人へ life を送る */
  lifeTick(force = false) {
    const t = this.now();
    if (!force && t - this._lifeAt < LIFE_STEP_MS) return;
    const dt = Math.max(0, Math.min(10, (t - this._lifeAt) / 1000)) * (this.clock.scale || 1);
    this._lifeAt = t;
    const send = force || t - this._lifeSendAt >= LIFE_SEND_MS;
    if (send) this._lifeSendAt = t;
    for (const p of this.players.values()) {
      if (p.place !== 'field' && p.place !== 'nest') continue;
      const was = p.sleeping;
      const env = this.envOf(p, t);
      p.env = env;
      p.life = stepLife(p.life, dt, { sleeping: p.sleeping, env: env.life });
      if (was && !p.life.sleep) this.wake(p, false);        // 満タンで自然に起きる
      else if (send) this.sendLife(p);
    }
  }
  sendLife(p) { if (p.conn) p.conn.send({ t: S2C.LIFE, life: lifeOut(p.life), ...(p.env && p.env.labels.length ? { env: p.env.labels } : {}), ...(p.env && p.env.rest && p.sleeping ? { rest: p.env.rest } : {}) }); }
  /** その子のいる場所の天気・季節・気候の影響（shared/season.js） */
  envOf(p, t = this.now()) {
    const pos = p.place === 'field' && p.st ? p.st : p.place === 'nest' ? (this._entranceOfNest(p.nestId) || { x: 0, y: 0 }) : { x: 0, y: 0 };
    return envAt(this.clock, t, { map: this.map, x: pos.x, y: pos.y, place: p.place, entrances: [...this.field.entrances.values()], enabled: this.envOn });
  }

  /** 位置の保存（地上にいる人は確定位置、巣の中の人は巣の入口の下） */
  savePlayer(p, exit = 'live') {
    if (!p.charId) return;
    let pos;
    if (p.place === 'field' && p.st) { this.field.drain(p); pos = { x: p.st.x, y: p.st.y, dir: p.st.dir, place: 'field' }; }
    else if (p.place === 'nest' && p.nestId != null) {
      const e = this._entranceOfNest(p.nestId);
      pos = e ? { x: e.x, y: e.y + 12, dir: 'down', place: 'nest:' + p.nestId } : null;
    } else if (p.lastField) pos = { ...p.lastField, place: 'field' };
    if (p.indId && p.life) this.store.setLife(p.indId, { ...lifeOut(p.life), sleep: false });
    if (!pos) return;
    this.store.savePosition(p.charId, { ...pos, exit }, this.now());
  }
  saveAll(exit = 'live') {
    for (const p of this.players.values()) { try { this.savePlayer(p, exit); } catch (e) { this.log('[save] ' + e.message); } }
  }
  /** 停止の前：全員の位置を保存して、接続を閉じる（クライアントは自動で再接続してくる） */
  shutdown() {
    this.stop();
    this.shuttingDown = true;
    for (const p of [...this.players.values()]) this._detach(p, 'shutdown');   // 保存して外す（あとで届く close では上書きしない）
    for (const s of [...this.sessions]) { try { s.conn.close(1012, 'server restart'); } catch (e) {} }
  }
  _entranceOfNest(nestId) { for (const e of this.field.entrances.values()) if (e.nestId === nestId) return e; return null; }

  // ───────── 接続 ─────────
  connect(conn) {
    const game = this;
    const s = {
      conn, ip: conn.ip || '?', account: null, token: null, player: null, chain: Promise.resolve(), closed: false,
      rate: { t: 0, n: 0 },
      onMessage(text) { game._onMessage(s, text); },
      onClose() { game._onClose(s); },
    };
    const raw = conn.sendRaw.bind(conn);
    conn.sendRaw = text => { if (s.closed) return; game.stats.msgOut++; game.stats.bytesOut += text.length; try { raw(text); } catch (e) {} };
    conn.send = msg => conn.sendRaw(JSON.stringify(msg));
    this.sessions.add(s);
    this.stats.conns++;
    conn.send({ t: S2C.WELCOME, v: PROTOCOL_VERSION, serverTime: this.now(), clock: { ...this.clock } });
    return s;
  }
  _onClose(s) {
    if (s.closed) return;
    s.closed = true;
    this.sessions.delete(s);
    if (s.player) this._detach(s.player, 'disconnect');
  }
  /** プレイヤーを接続から外す（位置を保存して、部屋から出す） */
  _detach(p, exit) {
    try { this.savePlayer(p, exit); } catch (e) { this.log('[save] ' + e.message); }
    if (p.place === 'field') this.field.leave(p, exit === 'logout' ? 'logout' : 'leave');
    else if (p.place === 'nest') this.nests.leave(p);
    p.place = 'none'; p.sleeping = false; if (p.life) p.life.sleep = false;
    const was = this.players.get(p.accountId) === p;
    if (was) this.players.delete(p.accountId);
    if (p.session) { p.session.player = null; p.session = null; }
    p.conn = null;
    if (was && !this.shuttingDown) this.pushFriends(p.accountId, true);    // フレンドに「オフラインになった」
  }

  _onMessage(s, text) {
    this.stats.msgIn++; this.stats.bytesIn += text.length;
    const t = this.now();
    if (t - s.rate.t > 1000) { s.rate.t = t; s.rate.n = 0; }
    if (++s.rate.n > MSG_PER_SEC) { s.conn.send({ t: S2C.KICK, reason: '送信が多すぎる' }); s.conn.close(1008, 'rate'); return; }
    const m = decode(text);
    if (!m) return;
    // 入力は返事なし・高頻度：その場でためるだけ
    if (m.t === C2S.INPUT) { if (s.player) this.field.queueInput(s.player, m.inputs); return; }
    if (m.t === C2S.PING) { s.conn.send({ t: S2C.PONG, ct: m.ct, st: this.now() }); return; }
    if (m.t === C2S.NEST_MOVE) { if (s.player) this.nests.move(s.player, m); return; }
    if (m.t === C2S.CHAT) { if (s.player) this.chat(s.player, m.text); return; }
    // 返事が要るもの：接続ごとに順番に（パスワードの計算を待つ間に次の要求が追い越さないように）
    s.chain = s.chain.then(async () => {
      let res;
      try { res = await this.handle(s, m); }
      catch (e) { this.stats.errors++; this.log('[err] ' + m.t + ': ' + (e && e.stack || e)); res = fail(ERR.BAD_REQUEST, 'サーバーで問題が起きた'); }
      if (m.rid != null && !s.closed) s.conn.send({ t: S2C.RES, rid: m.rid, ...(res || { ok: true }) });
    });
  }

  async handle(s, m) {
    switch (m.t) {
      case C2S.HELLO: return this.hello(s, m);
      case C2S.REGISTER: return this.register(s, m);
      case C2S.LOGIN: return this.login(s, m);
      case C2S.LOGOUT: return this.logout(s);
    }
    if (!s.account) return fail(ERR.AUTH, 'ログインしていない');
    if (m.t === C2S.CREATE_CHAR) return this.createChar(s, m);
    const p = s.player;
    if (!p) return fail(ERR.AUTH, 'キャラクターが無い');
    switch (m.t) {
      case C2S.JOIN_FIELD: return this.joinField(p);
      case C2S.PICKUP: return this.field.pickup(p, m.resId);
      case C2S.DIG_BURROW: return this.field.dig(p);
      case C2S.ENTER_NEST: return this.enterNest(p, m);
      case C2S.LEAVE_NEST: return this.leaveNest(p);
      case C2S.NEST_OP: return this.nests.op(p, m.nestId, m.rev, m.op);
      case C2S.STORE: return this.nests.storeItems(p, m.nestId, m.dir, m.item, m.n);
      case C2S.INV_MOVE: return this.invMove(p, m);
      case C2S.VISIT_POLICY: { const r = this.nests.setPolicy(p, m.policy, m.list); return r; }
      case C2S.EAT: return this.eat(p, m);
      case C2S.DRINK: return this.drink(p, m);
      case C2S.SLEEP: return this.sleep(p);
      case C2S.WAKE: return this.wake(p);
      case C2S.FRIENDS: return { ok: true, list: this.friendList(p.accountId) };
      case C2S.FRIEND_REQ: return this.friendReq(p, m.name);
      case C2S.FRIEND_OK: return this.friendOk(p, m.id);
      case C2S.FRIEND_DEL: return this.friendDel(p, m.id);
      case C2S.SET_BUILDERS: return this.nests.setBuilders(p, m.list, this.players);
      case C2S.VISITORS: { const n = this.store.nestByOwner(p.accountId); return { ok: true, list: n ? this.store.recentVisits(n.id) : [], events: n ? this.store.recentNestEvents(n.id) : [] }; }
      case C2S.SURVEY: return this.field.survey(p);
      case C2S.RELOCATE: return this.field.relocate(p);
      case C2S.PLUG: return this.nests.plug(p, !!m.on);
      case C2S.DEV: return this.dev(p, m);
    }
    return fail(ERR.BAD_REQUEST, '知らない要求: ' + String(m.t).slice(0, 20));
  }

  // ───────── 認証 ─────────
  _accountOut(a) { return { id: a.id, username: a.username }; }
  _characterOut(c) { return c ? { id: c.id, name: c.name, fur: c.fur, createdAt: c.createdAt, individual: c.individual } : null; }
  /** ログインできたら：同じアカウントの古い接続は追い出し、プレイヤーを作る */
  _bind(s, account, token) {
    if (s.player) this._detach(s.player, 'disconnect');
    s.account = account; s.token = token;
    const old = this.players.get(account.id);
    if (old) {
      const os = old.session;
      this._detach(old, 'disconnect');
      if (os && os !== s) { os.account = null; try { os.conn.send({ t: S2C.KICK, reason: '別の場所でログインしたので切断しました' }); os.conn.close(4001, 'replaced'); } catch (e) {} }
    }
    const c = this.store.activeCharacter(account.id);
    if (c) this._makePlayer(s, account, c);
    return c;
  }
  _makePlayer(s, account, c) {
    const life = normalizeLife(c.individual && c.individual.status && c.individual.status.life);
    life.sleep = false;
    const p = { accountId: account.id, username: account.username, charId: c.id, indId: c.individual && c.individual.id, name: c.name, fur: c.fur, inv: this.store.charInventory(c.id),
      conn: s.conn, session: s, place: 'none', st: null, lastSeq: 0, inbox: [], budget: 0, nestId: null, chatT: [], life, sleeping: false, actT: 0, friendT: [] };
    s.player = p;
    this.players.set(account.id, p);
    this.pushFriends(account.id, true);     // フレンドに「オンラインになった」
    return p;
  }
  async hello(s, m) {
    if (m.v !== PROTOCOL_VERSION) return fail(ERR.BAD_REQUEST, 'クライアントの版が違う。再読み込みしてね');
    if (!m.token) return { ok: true };
    const a = this.auth.check(m.token);
    if (!a) return { ok: true, expired: true };
    if (s.account && s.account.id === a.id && s.player) return { ok: true, account: this._accountOut(a), character: this._characterOut(this.store.activeCharacter(a.id)) };
    const c = this._bind(s, a, m.token);
    return { ok: true, account: this._accountOut(a), character: this._characterOut(c) };
  }
  async register(s, m) {
    const e = validUsername(m.username) || validPassword(m.password);
    if (e) return fail(ERR.BAD_REQUEST, e);
    if (String(m.password).length > 200) return fail(ERR.BAD_REQUEST, 'パスワードが長すぎる');
    const r = await this.auth.register(m.username, m.password, s.ip);
    if (!r.ok) return r;
    this._bind(s, r.account, r.token);
    return { ok: true, token: r.token, account: this._accountOut(r.account) };
  }
  async login(s, m) {
    if (typeof m.username !== 'string' || typeof m.password !== 'string' || m.username.length > 32 || m.password.length > 200) return fail(ERR.BAD_REQUEST, 'ユーザー名かパスワードが違う');
    const r = await this.auth.login(m.username, m.password, s.ip);
    if (!r.ok) return r;
    if (s.closed) return fail(ERR.AUTH, '切断');
    const c = this._bind(s, r.account, r.token);
    return { ok: true, token: r.token, account: this._accountOut(r.account), character: this._characterOut(c) };
  }
  logout(s) {
    if (s.player) this._detach(s.player, 'logout');
    if (s.token) this.auth.revoke(s.token);
    s.account = null; s.token = null;
    return { ok: true };
  }
  createChar(s, m) {
    if (this.store.activeCharacter(s.account.id)) return fail(ERR.RULE, 'もうキャラクターがいる（1 アカウント 1 匹）');
    const e = validName(m.name);
    if (e) return fail(ERR.BAD_REQUEST, e);
    if (!FUR_IDS.includes(m.fur)) return fail(ERR.BAD_REQUEST, '毛色が変');
    const name = String(m.name).trim();
    this.store.createCharacter(s.account.id, { name, fur: m.fur, x: this.map.spawn.x, y: this.map.spawn.y, inv: makeInventory(INV_SLOTS, START_INVENTORY) }, this.now());
    const c = this.store.activeCharacter(s.account.id);
    this._makePlayer(s, s.account, c);
    return { ok: true, character: this._characterOut(c) };
  }

  // ───────── 地上 ─────────
  /** どこに出すか：同じ接続で地上・巣にいた → その場 / ログアウト・停止・保存済み → 保存位置 /
   *  切断から 60 秒以内 → 保存位置 / それより後 → 自分の巣の入口（無ければ出発点） */
  _joinPos(p) {
    if (p.place === 'field' && p.st) return { x: p.st.x, y: p.st.y, dir: p.st.dir };
    const c = this.store.activeCharacter(p.accountId);
    const pos = c && c.pos;
    const ent = this.field.entrances.get(p.accountId);
    const home = ent ? { x: ent.x, y: ent.y + 12, dir: 'down' } : { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down' };
    if (!pos || pos.x == null) return home;
    const fresh = pos.exit !== 'disconnect' || (this.now() - (pos.savedAt || 0)) <= this.graceMs;
    if (!fresh) return home;
    // 保存位置が壁の中・地図の外（地図が変わったなど）なら入口へ
    if (!boxFree(this.map, pos.x, pos.y)) return home;
    return { x: pos.x, y: pos.y, dir: pos.dir || 'down' };
  }
  joinField(p) {
    if (p.place === 'nest') this.nests.leave(p);
    const pos = this._joinPos(p);
    p.sleeping = false; p.life.sleep = false;
    const world = this.field.join(p, pos);
    this.store.savePosition(p.charId, { x: pos.x, y: pos.y, dir: pos.dir, place: 'field', exit: 'live' }, this.now());
    world.life = lifeOut(p.life);
    world.friends = this.friendList(p.accountId);
    // 留守のあいだに巣を訪ねてきた子（1 回見せたら既読）
    const own = this.store.nestByOwner(p.accountId);
    world.visitors = own ? this.store.unseenVisits(own.id) : [];
    if (own && world.visitors.length) this.store.markVisitsSeen(own.id);
    // Ver.0.3：留守のあいだの襲撃（1 回見せたら既読）・自分の巣の土地・捕食者の設定
    world.raids = own ? this.store.unseenNestEvents(own.id) : [];
    if (own && world.raids.length) this.store.markNestEventsSeen(own.id);
    if (own && world.you.nest) { world.you.nest.land = own.land || landOut(landAt(this.map, own.x, own.y)); world.you.nest.plugged = own.plugged; world.you.nest.relocatedAt = own.relocatedAt; }
    world.danger = { predators: this.tuning.enabled ? (this.tuning.easy ? 'easy' : 'normal') : 'off', env: this.envOn, relocateCooldownMs: this.field.relocateCooldownMs };
    return { ok: true, world };
  }

  // ───────── 巣 ─────────
  enterNest(p, m) {
    const owner = Number(m.owner);
    const ent = this.field.entrances.get(owner);
    if (!ent) return fail(ERR.NOT_FOUND, '巣が無い');
    const nest = this.store.nest(ent.nestId);
    if (!nest) return fail(ERR.NOT_FOUND, '巣が無い');
    if (m.resume) {
      // 再接続：切断前に同じ巣の中にいて、60 秒以内なら入口まで戻らずに続きから
      const c = this.store.activeCharacter(p.accountId);
      const ok = (p.place === 'nest' && p.nestId === nest.id) ||
        (c && c.pos && c.pos.place === 'nest:' + nest.id && (c.pos.exit !== 'disconnect' || this.now() - (c.pos.savedAt || 0) <= this.graceMs));
      if (!ok) return fail(ERR.FORBIDDEN, '巣から出てしまった');
    } else {
      if (p.place !== 'field') return fail(ERR.FORBIDDEN, '地上にいない');
      this.field.drain(p);
      if (Math.hypot(ent.x - p.st.x, ent.y - p.st.y) > ENTER_RANGE) return fail(ERR.TOO_FAR, '入口から遠い');
    }
    if (!this.nests.canVisit(nest, p.accountId)) return fail(ERR.FORBIDDEN, (nest.ownerName || '') + 'の巣は 今は入れないようだ' + (nest.plugged ? '（入口がふさがれている）' : ''));
    if (p.place === 'field') { p.lastField = { x: ent.x, y: ent.y + 12, dir: 'down' }; this.field.leave(p, 'nest'); }
    p.sleeping = false; p.life.sleep = false;
    const r = this.nests.enter(p, nest);
    if (!r.ok) return r;
    this.savePlayer(p, 'live');
    if (!m.resume && nest.owner !== p.accountId) this._recordVisit(nest, p);
    return r;
  }
  /** 訪問の記録：所有者がオンラインなら visit を送って既読、留守なら次のログインで一覧に */
  _recordVisit(nest, p) {
    const t = this.now();
    if (t - this.store.lastVisit(nest.id, p.accountId) < VISIT_REPEAT_MS) return;
    const owner = this.players.get(nest.owner);
    const online = !!(owner && owner.conn);
    this.store.addVisit(nest.id, p.accountId, p.name, t, online);
    this.store.trimVisits(nest.id);
    if (online) owner.conn.send({ t: S2C.VISIT, name: p.name, nestId: nest.id, at: t });
  }
  leaveNest(p) {
    if (p.place !== 'nest') return fail(ERR.FORBIDDEN, '巣の中にいない');
    const ent = this._entranceOfNest(p.nestId);
    p.sleeping = false; p.life.sleep = false;
    this.nests.leave(p);
    const pos = ent ? { x: ent.x, y: ent.y + 12, dir: 'down' } : { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down' };
    this.field.join(p, pos, 'nest');
    this.savePlayer(p, 'live');
    return { ok: true, x: pos.x, y: pos.y };
  }

  // ───────── 暮らし（Ver.0.2）─────────
  _actGap(p) {
    const t = this.now();
    if (t - p.actT < LIFE.ACTION_GAP_MS) return true;
    p.actT = t; return false;
  }
  /** 種子を食べる：from 'inv'（持ち物）/ 'pile'（自分の巣の種の山＝倉庫の種子） */
  eat(p, m) {
    if (p.place !== 'field' && p.place !== 'nest') return fail(ERR.FORBIDDEN, '今は食べられない');
    if (this._actGap(p)) return fail(ERR.RATE, 'もぐもぐ…（ちょっと待って）');
    if (p.sleeping) return fail(ERR.RULE, '眠っている');
    if (!canEat(p.life)) return fail(ERR.RULE, 'おなかいっぱい');
    if (m.from === 'pile') {
      const r = this.nests.takeSeedFromPile(p);
      if (!r.ok) return r;
      this.store.setNestStorage(r.nest.id, r.storage);
      p.life = eatSeed(p.life);
      this.sendLife(p);
      return { ok: true, life: lifeOut(p.life), inv: p.inv.map(x => x && { ...x }), storage: r.storage.map(x => x && { ...x }), src: 'pile' };
    }
    const inv = p.inv.map(x => x && { ...x });
    const item = m.item === 'rare_seed' ? 'rare_seed' : 'seed';
    if (!removeItem(inv, item, 1)) return fail(ERR.RULE, item === 'seed' ? '種子を持っていない' : '珍しい種を持っていない');
    this.store.setCharInventory(p.charId, inv);
    p.inv = inv;
    p.life = item === 'rare_seed' ? eatRareSeed(p.life) : eatSeed(p.life);
    this.sendLife(p);
    return { ok: true, life: lifeOut(p.life), inv: inv.map(x => x && { ...x }), left: countItem(inv, item), src: 'inv', item };
  }
  drink(p, m) {
    if (this._actGap(p)) return fail(ERR.RATE, 'ごくごく…（ちょっと待って）');
    const r = this.field.drink(p, m.resId);
    if (!r.ok) return r;
    this.sendLife(p);
    return { ok: true, life: lifeOut(p.life), src: r.src };
  }
  sleep(p) {
    const r = this.nests.canSleep(p);
    if (!r.ok) return r;
    p.sleeping = true; p.life.sleep = true;
    if (p.nestPos) p.nestPos = { ...p.nestPos, anim: 'sleep' };
    this.nests.flushPeers(p.nestId);
    this.sendLife(p);
    return { ok: true, life: lifeOut(p.life) };
  }
  /** 起きる（自分で・動いた・体調が満タン）。reply=false は自然に起きたとき（本人へ life を送る） */
  wake(p, reply = true) {
    const was = p.sleeping;
    p.sleeping = false; p.life.sleep = false;
    if (was && p.place === 'nest') {
      if (p.nestPos && p.nestPos.anim === 'sleep') p.nestPos = { ...p.nestPos, anim: 'idle' };
      this.nests.flushPeers(p.nestId);
    }
    if (!reply || was) this.sendLife(p);
    return { ok: true, life: lifeOut(p.life) };
  }

  // ───────── 危険と土地（Ver.0.3）─────────
  /** 捕食者につかまった：体調が大きく減る・持ち物の一部を落とす（だれでも拾える）・安全な所へ戻る・しばらく狙われない。死なない */
  caught(p, e) {
    if (p.place !== 'field' || !p.st) return;
    const t = this.now(), easy = !!this.tuning.easy;
    p.life = caughtLife(p.life, easy);
    const inv = p.inv.map(x => x && { ...x });
    const drops = dropItems(inv, easy);
    const spots = dropSpots(this.map, p.st.x, p.st.y, drops.length);
    this.store.setCharInventory(p.charId, inv);
    p.inv = inv;
    const placed = this.field.placeDrops(drops, spots);
    const sp = safePoint(this.map, this.field.entrances.get(p.accountId));
    const st = makeFieldState(sp.x, sp.y); st.seq = p.lastSeq;
    p.st = st; p.stillT = 0;
    p.invulnUntil = t + INVULN_MS;
    p.caughtN = (p.caughtN || 0) + 1;
    if (p.conn) p.conn.send({ t: S2C.CAUGHT, kind: e.kind, name: PRED[e.kind].name, at: { x: Math.round(e.x), y: Math.round(e.y) }, x: sp.x, y: sp.y, life: lifeOut(p.life), inv: inv.map(x => x && { ...x }),
      drops: placed.map(r => ({ id: r.id, kind: r.kind, n: r.n })), until: p.invulnUntil });
    this.field.broadcast({ t: S2C.TOAST, text: p.name + ' が ' + PRED[e.kind].name + ' につかまった！' }, p);
    this.sendLife(p);
    this.savePlayer(p, 'live');
  }
  /** キツネが巣の入口を掘った：ふさいでいれば無事。ふさいでいなければ倉庫の種子を少し（1 割・最大 5）取られる。所有者へ知らせる（留守なら次のログインで） */
  raid(e) {
    const nest = this.store.nest(e.nestId);
    if (!nest) return null;
    const t = this.now();
    const owner = this.players.get(nest.owner);
    const online = !!(owner && owner.conn);
    let lost = 0;
    if (!e.blocked) {
      const storage = this.store.nestStorage(nest.id);
      lost = raidLoss(countItem(storage, 'seed'));
      if (lost) { removeItem(storage, 'seed', lost); this.store.setNestStorage(nest.id, storage); }
    }
    const kind = e.blocked ? 'blocked' : 'raid';
    this.store.setRaided(nest.id, t);
    this.store.addNestEvent(nest.id, kind, { lost }, t, online);
    this.nests.forget(nest.id);
    if (online) owner.conn.send({ t: S2C.RAID, nestId: nest.id, kind, lost, at: t });
    return { kind, lost };
  }
  /** キツネが掘りに行ける巣か（所有者が巣の中にいない・前の襲撃から 1 日（世界の時間）たった・危険の度合い） */
  raidInfo(ent, t) {
    if (!this.tuning.raids) return null;
    const m = this.nests.meta(ent.nestId);
    if (!m) return null;
    const o = this.players.get(ent.owner);
    const home = !!(o && o.place === 'nest' && o.nestId === ent.nestId);
    const ready = t - (m.raidedAt || 0) >= RAID_COOLDOWN_MS / (this.clock.scale || 1);
    return { plugged: !!m.plugged, raidable: !home && ready, danger: m.danger || 0 };
  }
  /** その子が逃げ込める入口か（自分・共同作業者・公開・フレンド・許可リスト。ふさいだ入口は所有者と共同作業者だけ） */
  canShelter(p, ent) {
    if (ent.owner === p.accountId) return true;
    const m = this.nests.meta(ent.nestId);
    if (!m) return false;
    const builder = this.store.hasNestAccess(ent.nestId, p.accountId, 'builder');
    if (builder) return true;
    if (m.plugged) return false;
    if (m.policy === 'public') return true;
    if (m.policy === 'friends') return this.store.isFriend(ent.owner, p.accountId);
    if (m.policy === 'list') return this.store.hasNestAccess(ent.nestId, p.accountId, 'visitor');
    return false;
  }
  /** 引っ越した：フレンドに巣の場所の変化を知らせる */
  relocated(p, nest, ent) {
    this.nests.forget(nest.id);
    this.pushFriends(p.accountId, true);
    void ent;
  }
  /** 開発用（devMode のときだけ）：天気・季節を変える（全員の時計へ）・捕食者を近くに出す */
  dev(p, m) {
    if (!this.devMode) return fail(ERR.FORBIDDEN, '開発用（TOBI_DEV=1 のときだけ）');
    if (m.weather !== undefined) { if (m.weather && WEATHERS[m.weather]) this.clock.weather = m.weather; else delete this.clock.weather; }
    if (m.season !== undefined) { if (m.season && SEASONS.some(x => x.id === m.season)) this.clock.season = m.season; else delete this.clock.season; }
    if (m.weather !== undefined || m.season !== undefined) { const msg = { t: S2C.CLOCK, clock: { ...this.clock }, st: this.now() }; for (const s of this.sessions) if (s.player) s.conn.send(msg); }
    let spawned = null;
    if (m.spawn && PRED[m.spawn] && p.place === 'field') {
      const dx = Number(m.dx) || 70, dy = Number(m.dy) || 0;
      const q = this.field.preds.spawn(m.spawn, p.st.x + dx, p.st.y + dy);
      spawned = q && q.id;
    }
    if (m.clear) this.field.preds.preds = [];
    return { ok: true, clock: { ...this.clock }, spawned };
  }

  // ───────── フレンド（Ver.0.2）─────────
  /** 一覧：{id, name, fur, state:'friend'|'incoming'|'outgoing', online, where, nest:{x,y}|null} */
  friendList(acct) {
    return this.store.friendsOf(acct).map(f => {
      const c = this.store.charBrief(f.other) || { name: '？', fur: 'sand' };
      const o = this.players.get(f.other);
      const isF = f.state === 'friend';
      const ent = isF ? this.field.entrances.get(f.other) : null;
      return { id: f.other, name: c.name, fur: c.fur, state: f.state, online: isF && !!(o && o.conn), where: isF && o ? (o.place === 'field' || o.place === 'nest' ? o.place : null) : null,
        nest: ent ? { x: ent.x, y: ent.y } : null, at: f.at };
    });
  }
  /** 一覧が変わった人（とそのフレンド）へ friends を送る */
  pushFriends(acct, toFriends = false) {
    const send = id => { const o = this.players.get(id); if (o && o.conn) o.conn.send({ t: S2C.FRIENDS, list: this.friendList(id) }); };
    if (toFriends) { for (const id of this.store.friendIds(acct)) send(id); }
    else send(acct);
  }
  _friendRate(p) {
    const t = this.now();
    p.friendT = p.friendT.filter(x => t - x < 60000);
    if (p.friendT.length >= FRIEND_OPS_PER_MIN) return true;
    p.friendT.push(t); return false;
  }
  friendReq(p, name) {
    if (this._friendRate(p)) return fail(ERR.RATE, 'フレンドの操作が多すぎる。少し待ってね');
    const nm = String(name || '').trim();
    if (validName(nm)) return fail(ERR.BAD_REQUEST, validName(nm));
    const ids = this.store.accountsByCharName(nm).filter(id => id !== p.accountId);
    if (nm === p.name && !ids.length) return fail(ERR.RULE, '自分とはフレンドになれない');
    if (!ids.length) return fail(ERR.NOT_FOUND, '「' + nm + '」という子は見つからない');
    if (ids.length > 1) return fail(ERR.RULE, '同じ名前の子が何匹もいる');
    const other = ids[0];
    const row = this.store.friendRow(p.accountId, other);
    let state;
    if (row && row.state === 'friend') return fail(ERR.RULE, 'もうフレンド');
    if (row && row.a === p.accountId) return fail(ERR.RULE, 'もう申請してある（返事待ち）');
    if (row) { this.store.friendAccept(other, p.accountId, this.now()); state = 'friend'; }   // 向こうからも申請が来ていた → そのままフレンド
    else {
      if (this.store.friendsOf(p.accountId).length >= MAX_FRIENDS || this.store.friendsOf(other).length >= MAX_FRIENDS) return fail(ERR.FULL, `フレンドは ${MAX_FRIENDS} 匹まで`);
      this.store.friendRequest(p.accountId, other, this.now()); state = 'outgoing';
    }
    const o = this.players.get(other);
    if (o && o.conn) o.conn.send({ t: S2C.TOAST, text: state === 'friend' ? p.name + ' と フレンドになった' : p.name + ' から フレンド申請が来た（メニュー → フレンド）' });
    this.pushFriends(other);
    return { ok: true, state, list: this.friendList(p.accountId) };
  }
  friendOk(p, id) {
    if (this._friendRate(p)) return fail(ERR.RATE, 'フレンドの操作が多すぎる。少し待ってね');
    const other = Number(id);
    if (!Number.isInteger(other)) return fail(ERR.BAD_REQUEST, '相手が変');
    if (!this.store.friendAccept(other, p.accountId, this.now())) return fail(ERR.NOT_FOUND, '申請が見つからない');
    const o = this.players.get(other);
    if (o && o.conn) o.conn.send({ t: S2C.TOAST, text: p.name + ' が フレンド申請を受けてくれた' });
    this.pushFriends(other);
    return { ok: true, list: this.friendList(p.accountId) };
  }
  friendDel(p, id) {
    if (this._friendRate(p)) return fail(ERR.RATE, 'フレンドの操作が多すぎる。少し待ってね');
    const other = Number(id);
    if (!Number.isInteger(other)) return fail(ERR.BAD_REQUEST, '相手が変');
    if (!this.store.friendDelete(p.accountId, other)) return fail(ERR.NOT_FOUND, 'フレンドではない');
    this.pushFriends(other);
    return { ok: true, list: this.friendList(p.accountId) };
  }

  // ───────── そのほか ─────────
  invMove(p, m) {
    const inv = p.inv.map(x => x && { ...x });
    const a = Number(m.from), b = Number(m.to);
    if (!Number.isInteger(a) || !Number.isInteger(b) || !swapSlots(inv, a, b)) return fail(ERR.BAD_REQUEST, '動かせない');
    this.store.setCharInventory(p.charId, inv);
    p.inv = inv;
    return { ok: true, inv: inv.map(x => x && { ...x }) };
  }
  /** チャット：80 文字・制御文字除去・連投制限（10 秒に 5 回・0.4 秒あける） */
  chat(p, text) {
    const t = cleanChat(text);
    if (!t) return;
    const now = this.now();
    p.chatT = p.chatT.filter(x => now - x < CHAT_WINDOW_MS);
    if (p.chatT.length >= CHAT_BURST || (p.chatT.length && now - p.chatT[p.chatT.length - 1] < CHAT_GAP_MS)) {
      if (p.conn) p.conn.send({ t: S2C.TOAST, text: 'ちょっと はやすぎる…（少し待ってから話してね）' });
      return;
    }
    p.chatT.push(now);
    const msg = { t: S2C.CHAT, from: p.accountId, name: p.name, text: t, where: p.place === 'nest' ? 'nest' : 'field', at: now };
    if (p.place === 'nest') this.nests.broadcast(p.nestId, msg);
    else if (p.place === 'field') this.field.broadcast(msg);
    else if (p.conn) p.conn.send(msg);
  }

  statsSnapshot() {
    const mem = process.memoryUsage();
    return {
      players: this.players.size, field: this.field.players.size, nests: this.nests.inst.size, sessions: this.sessions.size,
      resources: this.field.resources.size, respawnQueue: this.field.respawns.length,
      msgIn: this.stats.msgIn, msgOut: this.stats.msgOut, bytesIn: this.stats.bytesIn, bytesOut: this.stats.bytesOut, errors: this.stats.errors,
      rss: mem.rss, heapUsed: mem.heapUsed, uptime: Math.round((this.now() - this.stats.startedAt) / 1000),
    };
  }
}
