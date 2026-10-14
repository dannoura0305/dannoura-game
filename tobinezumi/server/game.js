// tobinezumi/server/game.js — 接続ごとの受け付け（認証・振り分け）と、地上・巣の部屋をまとめる本体。ws には依存しない
// （テストでは偽の接続 {send, close} をつないで、そのまま動かせる）。
//
//   const game = new Game({ store, auth });  game.start();      … 20Hz のティック・30 秒ごとの位置保存
//   const s = game.connect({ ip, sendRaw(text), close(code, reason) });
//   s.onMessage(text) / s.onClose()
import { gateAt } from '../shared/regions.js';
import { REGION, REGION_IDS, OPEN_REGIONS, regionMap, arrivalPoint, isRegion } from '../shared/world.js';
import { CURIOS, isCurio, gateOpen, gateHint, GATE_R, ACH, collectAchievements, unlockedDecor, SANDSTORM_MS, VISIT_GOAL } from '../shared/collect.js';
import { MAX_RESIDENTS, TRAVEL_GAP_MS } from '../shared/protocol.js';
import { boxFree } from '../shared/move.js';
import { makeInventory, swapSlots, removeItem, countItem, addItem, START_INVENTORY, INV_SLOTS, ITEMS } from '../shared/items.js';
import { C2S, S2C, ERR, decode, cleanChat, validName, validUsername, validPassword, FUR_IDS, PROTOCOL_VERSION, SERVER_TICK_HZ, POS_SAVE_MS, RECONNECT_GRACE_MS, MAX_FRIENDS, FRIEND_OPS_PER_MIN } from '../shared/protocol.js';
import { normalizeLife, stepLife, lifeOut, eatSeed, eatRareSeed, canEat, caughtLife, LIFE } from '../shared/life.js';
import { makeClock, dayPhase } from '../shared/daynight.js';
import { envAt, WEATHERS, SEASONS } from '../shared/season.js';
import { TUNING, PRED, INVULN_MS, dropItems, dropSpots, safePoint, raidLoss, RAID_COOLDOWN_MS } from '../shared/predators.js';
import { landAt, landOut } from '../shared/lands.js';
import { makeFieldState } from '../shared/move.js';
import { Household, walkerOut } from '../shared/household.js';
import { toyamaEventBlock, TEV, TOYAMA_EVENT_IDS } from '../shared/toyama.js';
import { festivalAt, festActBlock, makeMark, FEST_ACTS, FEST } from '../shared/festival.js';
import { founderInd, indOut, courtBlock, needsFood, friendBlock } from '../shared/family.js';
import { traitMoveMods, traitMods, lookOf, seedOf } from '../shared/genetics.js';
import { lifeEnvWithTraits, makeLife } from '../shared/life.js';
import { WILD, devWildGenes } from '../shared/wild.js';
import { PET } from '../shared/family-life.js';
import { pickTour } from '../shared/tour.js';
import { devFamily } from '../shared/dev-family.js';
import { DAY_MS } from '../shared/daynight.js';
import { SEXES } from '../shared/protocol.js';
import { FieldRoom } from './rooms/field.js';
import { NestHub } from './rooms/nest.js';

export const ENTER_RANGE = 34;
export const CHAT_BURST = 5, CHAT_WINDOW_MS = 10000, CHAT_GAP_MS = 400;
export const MSG_PER_SEC = 150;
export const LIFE_STEP_MS = 500, LIFE_SEND_MS = 2000;
export const VISIT_REPEAT_MS = 2 * 60 * 1000;   // 同じ子が 2 分以内にまた入っても記録・通知しない
export const FAMILY_SEND_MS = 4000;              // 家族の様子（年齢・おなか）を本人へ送る間隔

const fail = (code, reason, extra = {}) => ({ ok: false, code, reason, ...extra });

export class Game {
  /**
   * timeScale / startHour：開発用の早回し（index.js は TOBI_DEV=1 のときだけ渡す）。世界の時計・暮らしの減り・採集物の戻りが速くなる
   * Ver.0.3：env（天気・季節・気候の影響。テストでは切れる）・predators（'normal'|'easy'|'off'）・raids（キツネの巣の襲撃）・
   *   weather / season（固定：開発用）・devMode（C2S dev を受ける：TOBI_DEV=1 のときだけ）・relocateCooldownMs・predSeed
   */
  constructor({ store, auth, now = () => Date.now(), random = Math.random, log = console.log, respawnScale = 1, graceMs = RECONNECT_GRACE_MS, saveMs = POS_SAVE_MS, timeScale = 1, startHour = null,
    env = true, predators = 'normal', raids = true, weather = null, season = null, devMode = false, relocateCooldownMs = undefined, predSeed = null, wild = true, wildSeed = null, curios = null } = {}) {
    this.store = store; this.auth = auth; this.now = now; this.random = random; this.log = log;
    this.graceMs = graceMs; this.saveMs = saveMs;
    this.clock = makeClock({ scale: timeScale, startHour, now: now() });
    if (weather && WEATHERS[weather]) this.clock.weather = weather;
    if (season && SEASONS.some(x => x.id === season)) this.clock.season = season;
    this.envOn = env !== false; this.devMode = !!devMode;
    this.tuning = { ...(TUNING[predators] || TUNING.normal) };
    if (raids === false) this.tuning.raids = false;
    this.stats = { msgIn: 0, msgOut: 0, bytesIn: 0, bytesOut: 0, errors: 0, conns: 0, startedAt: now() };
    this.players = new Map();    // accountId → Player（いま接続中）
    this.nests = new NestHub({ store, now, log });
    this.nests.onWake = p => this.wake(p);
    this._lifeAt = now(); this._lifeSendAt = now();
    // Ver.0.5：土地（地図）ごとに 1 部屋。はじまりの原（plains）が this.field（前からのテスト・道具と同じ）
    this.fields = new Map();
    this.curiosOn = curios != null ? !!curios : this.envOn;
    REGION_IDS.forEach((id, k) => {
      const room = new FieldRoom({ store, map: regionMap(id), region: id, now, random, log, respawnScale, stats: this.stats, clock: this.clock, env: this.envOn, tuning: this.tuning,
        predSeed: predSeed != null ? predSeed + k : null, wild, wildSeed: wildSeed != null ? wildSeed + k : null, curios: this.curiosOn,
        ...(relocateCooldownMs != null ? { relocateCooldownMs } : {}) });
      room.nestInfo = nid => this.nests.meta(nid);
      room.onCatch = (p, e) => this.caught(p, e);
      room.onRaid = e => this.raid(e);
      room.canShelter = (p, e) => this.canShelter(p, e);
      room.raidInfo = (e, t) => this.raidInfo(e, t);
      room.onRelocate = (p, nest, ent, fromRegion) => this.relocated(p, nest, ent, fromRegion);
      room.courtOk = p => !this._courtBlock(p);
      room.friendOk = p => !this._friendBlock(p);
      room.onWild = e => { const o = this.players.get(e.by); if (o && o.conn) o.conn.send({ t: S2C.WILD, type: e.type, id: e.id, name: e.name || (room.wild.get(e.id) || {}).name }); };
      room.onCollect = (p, cid, at) => this.collected(p, cid, at);
      room.ownedOf = p => p.owned || new Set();
      room.onDig = p => this.grant(p, 'first_burrow');
      room.homeOf = acct => { const o = this.players.get(acct); return o ? o.homeNest : this.store.residentNestOf(acct); };
      this.fields.set(id, room);
    });
    this.field = this.fields.get('plains');
    this.map = this.field.map;
    this.nests.relocateCooldownMs = this.field.relocateCooldownMs;
    this.nests.familyOf = nest => this.nestFamilyOf(nest);
    this.nests.talesOf = nest => this.nestTalesOf(nest);   // Ver.0.7：家族のやりとりの文脈（富山へ行ったことがある・地上へ出た なかま）
    this.nests.ctxOf = p => ({ owned: p.owned || new Set(), unlocks: new Set(unlockedDecor(p.ach || [])), isCurio });
    this.nests.onPlug = nest => this.refreshEntrance(nest.owner);
    this.nests.onPlace = (p, nest, op, data) => { if (op.type === 'curio' && data.objects.filter(o => o.type === 'curio').length >= 3) this.grant(p, 'display3'); };
    for (const room of this.fields.values()) room.load();
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
    try { for (const room of this.fields.values()) room.tick(); this.nests.tick(); this.lifeTick(); this.gateTick(); }
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
      p.life = stepLife(p.life, dt, { sleeping: p.sleeping, env: lifeEnvWithTraits(env.life, p.traitLife) });
      try { this.progressTick(p, env, dt * 1000, send); } catch (e) { this.stats.errors++; this.log('[progress] ' + (e && e.stack || e)); }
      if (was && !p.life.sleep) this.wake(p, false);        // 満タンで自然に起きる
      else if (send) this.sendLife(p);
      try { this.familyTick(p, dt * 1000, env); } catch (e) { this.stats.errors++; this.log('[family] ' + (e && e.stack || e)); }
    }
  }
  sendLife(p) { if (p.conn) p.conn.send({ t: S2C.LIFE, life: lifeOut(p.life), ...(p.env && p.env.labels.length ? { env: p.env.labels } : {}), ...(p.env && p.env.rest && p.sleeping ? { rest: p.env.rest } : {}) }); }
  /** その子のいる場所の天気・季節・気候の影響（shared/season.js） */
  envOf(p, t = this.now()) {
    const ent = p.place === 'nest' ? this._entranceOfNest(p.nestId) : null;
    const pos = p.place === 'field' && p.st ? p.st : ent || { x: 0, y: 0 };
    const room = p.place === 'nest' ? this.fields.get((ent && ent.region) || 'plains') : this.fieldOf(p);
    return envAt(this.clock, t, { map: room.map, x: pos.x, y: pos.y, place: p.place, entrances: [...room.entrances.values()], enabled: this.envOn });
  }
  /** その子のいる土地の部屋（地上でなければ最後にいた土地） */
  fieldOf(p) { return this.fields.get(p && p.region) || this.field; }
  /** 巣穴の入口（どの土地でも） */
  entranceOf(acct) { for (const room of this.fields.values()) { const e = room.entrances.get(acct); if (e) return e; } return null; }
  roomOfEntrance(e) { return this.fields.get((e && e.region) || 'plains') || this.field; }
  /** 入口の表示が変わった（ふさいだ・名前）：その土地の子へ */
  refreshEntrance(owner) {
    const e = this.entranceOf(owner);
    if (!e) return;
    const room = this.roomOfEntrance(e);
    for (const o of room.players.values()) if (o.conn) o.conn.send({ t: S2C.ENTRANCE, entrance: room.entranceOut(e, o.accountId) });
  }

  /** 位置の保存（地上にいる人は確定位置、巣の中の人は巣の入口の下） */
  savePlayer(p, exit = 'live') {
    if (!p.charId) return;
    let pos;
    if (p.place === 'field' && p.st) { this.fieldOf(p).drain(p); pos = { x: p.st.x, y: p.st.y, dir: p.st.dir, place: 'field', region: p.region || 'plains' }; }
    else if (p.place === 'nest' && p.nestId != null) {
      const e = this._entranceOfNest(p.nestId);
      pos = e ? { x: e.x, y: e.y + 12, dir: 'down', place: 'nest:' + p.nestId, region: e.region || 'plains' } : null;
    } else if (p.lastField) pos = { region: p.region || 'plains', ...p.lastField, place: 'field' };
    if (p.indId && p.life) this.store.setLife(p.indId, { ...lifeOut(p.life), sleep: false });
    if (p.house) this.saveHouse(p);
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
  _entranceOfNest(nestId) { for (const room of this.fields.values()) for (const e of room.entrances.values()) if (e.nestId === nestId) return e; return null; }

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
    if (p.place === 'field') this.fieldOf(p).leave(p, exit === 'logout' ? 'logout' : 'leave');
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
    if (m.t === C2S.INPUT) { if (s.player) this.fieldOf(s.player).queueInput(s.player, m.inputs); return; }
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
      case C2S.PICKUP: return this.fieldOf(p).pickup(p, m.resId);
      case C2S.DIG_BURROW: return this.fieldOf(p).dig(p);
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
      case C2S.SURVEY: return this.fieldOf(p).survey(p);
      case C2S.RELOCATE: return this.fieldOf(p).relocate(p);
      case C2S.PLUG: return this.nests.plug(p, !!m.on);
      case C2S.DEV: return this.dev(p, m);
      case C2S.COURT: return this.court(p, m);
      case C2S.FAMILY: return p.house ? { ok: true, family: p.house.out() } : fail(ERR.NOT_FOUND, 'キャラクターが無い');
      case C2S.NAME_PUPS: return this.namePups(p, m);
      case C2S.FEED_PUP: return this.feedPup(p, m);
      case C2S.MATE_AGAIN: return this.mateAgain(p);
      case C2S.KIDS_FOLLOW: return this.kidsFollow(p, m);
      case C2S.LINEAGE: return this.lineage(p);
      case C2S.SUCCEED: return this.succeed(p, m);
      case C2S.FAREWELL: return this.succeed(p, m, true);
      // Ver.0.5
      case C2S.TRAVEL: return this.travel(p, m);
      case C2S.ENTER_GATE: return this.enterGate(p);
      case C2S.COLLECTION: return this.collectionOut(p);
      case C2S.NEST_TOUR: case C2S.RANKING: return this.nestTour(p);   // Ver.0.6：巣めぐり（'ranking' は前の版のクライアントのための別名）
      case C2S.RESIDENTS: return { ok: true, ...this.residentsInfo(p.accountId) };
      case C2S.RESIDENT_INVITE: return this.residentInvite(p, m.name);
      case C2S.RESIDENT_ANSWER: return this.residentAnswer(p, m.nestId, !!m.ok);
      case C2S.RESIDENT_LEAVE: return this.residentLeave(p);
      case C2S.RESIDENT_REMOVE: return this.residentRemove(p, m.id);
      // Ver.0.6
      case C2S.FAMILY_PET: return this.petFamily(p, m);
      // Ver.0.7
      case C2S.COMPANION: return this.setCompanion(p, m);
      case C2S.TOYAMA_EVENT: return this.toyamaEvent(p, m);
      case C2S.FEST_ACT: return this.festAct(p, m);   // Ver.0.8
    }
    return fail(ERR.BAD_REQUEST, '知らない要求: ' + String(m.t).slice(0, 20));
  }

  // ───────── 認証 ─────────
  _accountOut(a) { return { id: a.id, username: a.username }; }
  _characterOut(c) { return c ? { id: c.id, name: c.name, fur: c.fur, createdAt: c.createdAt, individual: { ...c.individual, status: undefined } } : null; }
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
      conn: s.conn, session: s, place: 'none', st: null, lastSeq: 0, inbox: [], budget: 0, nestId: null, chatT: [], life, sleeping: false, actT: 0, friendT: [],
      region: (c.pos && c.pos.region) || 'plains' };
    this._loadProgress(p);
    this._loadHouse(p);
    s.player = p;
    this.players.set(account.id, p);
    this.pushFriends(account.id, true);     // フレンドに「オンラインになった」
    return p;
  }
  /** 家（Ver.0.4）：操作個体の年齢・遺伝子・巣の家族・お産の予定を DB から */
  _loadHouse(p) {
    const hj = this.store.household(p.accountId);
    p.house = hj ? new Household(hj) : null;
    this._applyTraits(p);
  }
  _applyTraits(p) {
    const me = p.house && p.house.me;
    p.traits = me ? me.traits : null;
    p.traitMove = me ? traitMoveMods(me.traits) : null;
    p.traitLife = me ? traitMods(me.traits) : null;
    p.look = me ? lookOf(me.traits) : null;
    p.kids = this._kidsOf(p);
  }
  _kidsOf(p) { return p.house ? p.house.walkers().map(walkerOut) : []; }   // Ver.0.7：若者 3 匹まで＋なかま 1 匹（comp:1）
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
    const ind = founderInd({ id: 0, name, fur: m.fur, sex: SEXES.includes(m.sex) ? m.sex : null, seed: seedOf(name, this.now(), Math.floor(this.random() * 1e9)) });
    this.store.createCharacter(s.account.id, { name, fur: m.fur, x: this.map.spawn.x, y: this.map.spawn.y, inv: makeInventory(INV_SLOTS, START_INVENTORY), ind }, this.now());
    const c = this.store.activeCharacter(s.account.id);
    this._makePlayer(s, s.account, c);
    return { ok: true, character: this._characterOut(c) };
  }

  // ───────── 地上 ─────────
  /** どこに出すか：同じ接続で地上・巣にいた → その場 / ログアウト・停止・保存済み → 保存位置 /
   *  切断から 60 秒以内 → 保存位置 / それより後 → 自分の巣の入口（無ければ出発点） */
  _joinPos(p) {
    if (p.place === 'field' && p.st) return { x: p.st.x, y: p.st.y, dir: p.st.dir, region: p.region || 'plains' };
    const c = this.store.activeCharacter(p.accountId);
    const pos = c && c.pos;
    const ent = this._homeEntrance(p);
    const home = ent ? { x: ent.x, y: ent.y + 12, dir: 'down', region: ent.region || 'plains' } : { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down', region: 'plains' };
    if (!pos || pos.x == null) return home;
    const fresh = pos.exit !== 'disconnect' || (this.now() - (pos.savedAt || 0)) <= this.graceMs;
    if (!fresh) return home;
    const region = isRegion(pos.region) ? pos.region : 'plains';
    // 保存位置が壁の中・地図の外（地図が変わったなど）なら入口へ
    if (!boxFree(regionMap(region), pos.x, pos.y)) return home;
    return { x: pos.x, y: pos.y, dir: pos.dir || 'down', region };
  }
  /** 帰る家の入口：自分の巣、無ければ住人になっている共同巣（Ver.0.5） */
  _homeEntrance(p) {
    const own = this.entranceOf(p.accountId);
    if (own) return own;
    return p.homeNest != null ? this._entranceOfNest(p.homeNest) : null;
  }
  joinField(p) {
    if (p.place === 'nest') this.nests.leave(p);
    const pos = this._joinPos(p);
    p.sleeping = false; p.life.sleep = false;
    if (p.place === 'field' && p.region !== pos.region) this.fieldOf(p).leave(p, 'leave');
    p.region = pos.region || 'plains';
    const world = this.fieldOf(p).join(p, pos);
    this.store.savePosition(p.charId, { x: pos.x, y: pos.y, dir: pos.dir, place: 'field', exit: 'live', region: p.region }, this.now());
    this._decorateWorld(p, world);
    this._visitRegion(p, p.region);
    return { ok: true, world };
  }
  /** WorldInit に暮らし・フレンド・家族・収集品などを足す（join_field と旅で同じ） */
  _decorateWorld(p, world, extra = true) {
    world.life = lifeOut(p.life);
    world.friends = this.friendList(p.accountId);
    world.family = p.house ? p.house.out() : null;
    // 留守のあいだに巣を訪ねてきた子（1 回見せたら既読）
    const own = this.store.nestByOwner(p.accountId);
    world.visitors = own ? this.store.unseenVisits(own.id) : [];
    if (own && world.visitors.length) this.store.markVisitsSeen(own.id);
    // Ver.0.3：留守のあいだの襲撃（1 回見せたら既読）・自分の巣の土地・捕食者の設定
    world.raids = own ? this.store.unseenNestEvents(own.id) : [];
    if (own && world.raids.length) this.store.markNestEventsSeen(own.id);
    if (own && world.you.nest) { world.you.nest.land = own.land || landOut(landAt(this.map, own.x, own.y)); world.you.nest.plugged = own.plugged; world.you.nest.relocatedAt = own.relocatedAt; }
    world.danger = { predators: this.tuning.enabled ? (this.tuning.easy ? 'easy' : 'normal') : 'off', env: this.envOn, relocateCooldownMs: this.field.relocateCooldownMs };
    // Ver.0.5：自分の巣がほかの土地にあっても場所を教える・共同巣の家・図鑑と実績・富山
    const ownE = this.entranceOf(p.accountId);
    if (ownE && !world.you.nest) world.you.nest = { id: ownE.nestId, x: ownE.x, y: ownE.y, region: ownE.region || 'plains' };
    if (own && world.you.nest) { world.you.nest.land = own.land || landOut(landAt(this.map, own.x, own.y)); world.you.nest.plugged = own.plugged; world.you.nest.relocatedAt = own.relocatedAt; world.you.nest.region = own.field || 'plains'; }
    const he = p.homeNest != null ? this._entranceOfNest(p.homeNest) : null;
    world.you.home = he ? { nestId: he.nestId, x: he.x, y: he.y, region: he.region || 'plains', ownerName: (this.nests.meta(he.nestId) || {}).ownerName || '' } : null;
    world.collection = { owned: Object.fromEntries([...p.owned].map(k => [k, 1])), achievements: Object.fromEntries([...p.ach].map(k => [k, 1])), found: !!p.toyamaFound, tev: { ...(p.tev || {}) } };
    world.gate = p.gate || null;
    void extra;
  }

  // ───────── 巣 ─────────
  enterNest(p, m) {
    const owner = Number(m.owner);
    const ent = m.resume ? this.entranceOf(owner) : this.fieldOf(p).entrances.get(owner);
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
      this.fieldOf(p).drain(p);
      if (Math.hypot(ent.x - p.st.x, ent.y - p.st.y) > ENTER_RANGE) return fail(ERR.TOO_FAR, '入口から遠い');
    }
    if (!this.nests.canVisit(nest, p.accountId)) return fail(ERR.FORBIDDEN, (nest.ownerName || '') + 'の巣は 今は入れないようだ' + (nest.plugged ? '（入口がふさがれている）' : ''));
    const invite = !m.resume && nest.id === this._homeNestId(p) && p.place === 'field' ? this._tryInvite(p, nest) : null;
    if (p.place === 'field') { p.lastField = { x: ent.x, y: ent.y + 12, dir: 'down' }; this.fieldOf(p).leave(p, 'nest'); }
    p.region = ent.region || 'plains';
    p.sleeping = false; p.life.sleep = false;
    const r = this.nests.enter(p, nest);
    if (!r.ok) return r;
    this.savePlayer(p, 'live');
    if (!m.resume && nest.owner !== p.accountId) { this._recordVisit(nest, p); this._visitedFriend(p, nest); }
    if (invite) { r.invite = invite; if (invite.ok) r.nest.family = p.house.publicOut(); }
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
    p.region = ent ? ent.region || 'plains' : 'plains';
    this.fieldOf(p).join(p, pos, 'nest');
    this.savePlayer(p, 'live');
    return { ok: true, x: pos.x, y: pos.y, region: p.region };
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
    const r = this.fieldOf(p).drink(p, m.resId);
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
    const room = this.fieldOf(p);
    const spots = dropSpots(room.map, p.st.x, p.st.y, drops.length);
    this.store.setCharInventory(p.charId, inv);
    p.inv = inv;
    const placed = room.placeDrops(drops, spots);
    const he = this._homeEntrance(p);
    const sp = safePoint(room.map, he && (he.region || 'plains') === room.region ? he : null);
    const st = makeFieldState(sp.x, sp.y); st.seq = p.lastSeq;
    p.st = st; p.stillT = 0;
    p.invulnUntil = t + INVULN_MS;
    p.caughtN = (p.caughtN || 0) + 1;
    if (p.conn) p.conn.send({ t: S2C.CAUGHT, kind: e.kind, name: PRED[e.kind].name, at: { x: Math.round(e.x), y: Math.round(e.y) }, x: sp.x, y: sp.y, life: lifeOut(p.life), inv: inv.map(x => x && { ...x }),
      drops: placed.map(r => ({ id: r.id, kind: r.kind, n: r.n })), until: p.invulnUntil });
    room.broadcast({ t: S2C.TOAST, text: p.name + ' が ' + PRED[e.kind].name + ' につかまった！' }, p);
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
    const builder = this.store.hasNestAccess(ent.nestId, p.accountId, 'builder') || p.homeNest === ent.nestId;
    if (builder) return true;
    if (m.plugged) return false;
    if (m.policy === 'public') return true;
    if (m.policy === 'friends') return this.store.isFriend(ent.owner, p.accountId);
    if (m.policy === 'list') return this.store.hasNestAccess(ent.nestId, p.accountId, 'visitor');
    return false;
  }
  /** 引っ越した：フレンドに巣の場所の変化を知らせる */
  relocated(p, nest, ent, fromRegion = null) {
    this.nests.forget(nest.id);
    // ほかの土地から引っ越してきた：前の土地の入口を消す（そこにいる子へ entrance {gone}）
    if (fromRegion && this.fields.get(fromRegion)) {
      const old = this.fields.get(fromRegion);
      const oe = old.entrances.get(p.accountId);
      if (oe) { old.entrances.delete(p.accountId); old.broadcast({ t: S2C.ENTRANCE, entrance: { owner: p.accountId, nestId: nest.id, x: oe.x, y: oe.y, region: fromRegion, gone: true } }); }
    }
    this.pushFriends(p.accountId, true);
    for (const id of this.store.nestMembers(nest.id, 'resident')) this.pushResidents(id);
    void ent;
  }
  /** 開発用（devMode のときだけ）：天気・季節を変える（全員の時計へ）・捕食者を近くに出す */
  dev(p, m) {
    if (!this.devMode) return fail(ERR.FORBIDDEN, '開発用（TOBI_DEV=1 のときだけ）');
    if (m.weather !== undefined) { if (m.weather && WEATHERS[m.weather]) this.clock.weather = m.weather; else delete this.clock.weather; }
    if (m.season !== undefined) { if (m.season && SEASONS.some(x => x.id === m.season)) this.clock.season = m.season; else delete this.clock.season; }
    if (m.hour != null && Number.isFinite(Number(m.hour))) {   // Ver.0.7：時計をその時刻へ（全員）
      const c = makeClock({ scale: this.clock.scale, startHour: Number(m.hour), now: this.now() });
      this.clock.origin = c.origin; this.clock.base = c.base;   // 同じ入れ物を書きかえる（部屋も同じ時計を見ている）
    }
    if (m.tevReset) { p.tev = {}; this.store.q("DELETE FROM account_flags WHERE account_id = ? AND substr(key, 1, 4) = 'tev:'").run(p.accountId); }
    if (m.fest !== undefined) { if (m.fest === 'on' || m.fest === 'off') this.clock.fest = m.fest; else delete this.clock.fest; }   // Ver.0.8：いつでも行事の夜（全員）
    if (m.festReset) {   // Ver.0.8：自分の印と 行事の品を消す（確認用）
      this.store.deleteFestMarks(p.accountId);
      for (const room of this.fields.values()) room.festMarks = room.festMarks.filter(x => x.owner !== p.accountId);
      for (const cid of [...p.owned]) if (CURIOS[cid] && CURIOS[cid].kind === 'fest') { p.owned.delete(cid); this.store.q('DELETE FROM account_collectibles WHERE account_id = ? AND collectible_id = ?').run(p.accountId, cid); }
    }
    if (m.weather !== undefined || m.season !== undefined || m.hour != null || m.fest !== undefined) { const msg = { t: S2C.CLOCK, clock: { ...this.clock }, st: this.now() }; for (const s of this.sessions) if (s.player) s.conn.send(msg); }
    let spawned = null;
    const room = this.fieldOf(p);
    if (m.spawn && PRED[m.spawn] && p.place === 'field') {
      const dx = Number(m.dx) || 70, dy = Number(m.dy) || 0;
      const q = room.preds.spawn(m.spawn, p.st.x + dx, p.st.y + dy);
      spawned = q && q.id;
    }
    if (m.clear) room.preds.preds = [];
    // Ver.0.4：年齢を進める（日）・野生の子を近くに出す・信頼をほぼ満たす・お産を今に
    const h = p.house;
    if (h && Number(m.age) > 0) {
      const env = this.envOf(p);
      for (let left = Math.min(40, Number(m.age)) * DAY_MS; left > 0; left -= DAY_MS / 20) this.familyTick(p, Math.min(left, DAY_MS / 20), env);
      this.saveHouse(p);
    }
    let wild = null;
    if (m.wild && p.place === 'field') { const n = room.wild.spawn(p.st.x + (Number(m.dx) || 40), p.st.y + (Number(m.dy) || 0), devWildGenes(room.wild, m), m.species === 'longear' ? 'longear' : 'jerboa'); wild = n.id; }
    if (m.trust && p.place === 'field') { const n = room.wild.get(String(m.trust)) || room.wild.npcs[0]; if (n) { n.trust[p.accountId] = 99.5; n.st = makeFieldState(p.st.x + 12, p.st.y); } }
    if (m.birth && h && h.pending) h.pending.dueAgeMs = h.me.ageMs;
    if (m.family && typeof m.family === 'object' && h) {   // Ver.0.6：家族をすぐに作る（{mate, pups, young, friend}）
      const nid = this._ownNestId(p);
      const made = devFamily(h, m.family, () => this.store.allocIndividual(p.accountId, this.now()), this.now());
      this.store.tx(() => { for (const x of made) this.store.saveInd(x, { accountId: p.accountId, nestId: nid }); });
      this._updateKids(p, true); this._sendFamily(p);
      if (nid != null) this.nests.forget(nid);
    }
    // 持ち物・倉庫へ足す（{give:{seed:10}}・{store:{seed:40}}）
    let inv = null;
    if (m.give && typeof m.give === 'object') {
      inv = p.inv.map(x => x && { ...x });
      for (const [k, v] of Object.entries(m.give)) if (ITEMS[k] && Number(v) > 0) addItem(inv, k, Math.min(99, Number(v) | 0));
      this.store.setCharInventory(p.charId, inv); p.inv = inv;
    }
    if (m.store && typeof m.store === 'object') {
      const nest = this.store.nestByOwner(p.accountId);
      if (nest) { const st = this.store.nestStorage(nest.id); for (const [k, v] of Object.entries(m.store)) if (ITEMS[k] && Number(v) > 0) addItem(st, k, Math.min(99, Number(v) | 0)); this.store.setNestStorage(nest.id, st); }
    }
    // Ver.0.5：土地へ飛ぶ（出口を通らずに）・不思議な穴を開ける・収集品を出す／図鑑へ入れる・実績
    let world = null, curio = null;
    if (m.gate !== undefined) { p.gateForce = !!m.gate; this.gateTick(true); }
    if (m.region && isRegion(m.region) && (p.place === 'field' || p.place === 'nest')) {
      if (p.place === 'nest') { this.nests.leave(p); p.place = 'none'; }
      const map = regionMap(m.region);
      const r = this._moveRegion(p, m.region, { x: Number(m.x) || map.spawn.x, y: Number(m.y) || map.spawn.y, dir: 'down' }, 'travel');
      world = r.world;
    }
    if (m.curio && CURIOS[m.curio] && p.place === 'field') {
      const rm = this.fieldOf(p);
      curio = rm.placeCurio(m.curio, p.st.x + (Number(m.dx) || 20), p.st.y + (Number(m.dy) || 0)).spawned;
    }
    if (Array.isArray(m.collect)) for (const cid of m.collect.slice(0, 30)) if (CURIOS[cid] && this.store.addCollectible(p.accountId, cid, this.now(), { dev: true }) === 1) this.collected(p, cid, this.now());
    if (m.achieve && ACH[m.achieve]) this.grant(p, m.achieve);
    return { ok: true, clock: { ...this.clock }, spawned, wild, family: h ? h.out() : null, ...(inv ? { inv: inv.map(x => x && { ...x }) } : {}), ...(world ? { world } : {}), ...(curio ? { curio } : {}), gate: p.gate || null };
  }


  // ───────── いのちをつなぐ（Ver.0.4）─────────
  _houseFlags(h) { return { follow: h.follow, lastBirthMs: h.lastBirthMs, litters: h.litters, promptDay: h.promptDay, companion: h.companion ?? null }; }
  _ownNestId(p) { return this._homeNestId(p); }
  /** 家族が暮らす巣：自分の巣、無ければ住人になっている共同巣（Ver.0.5） */
  _homeNestId(p) { const e = this.entranceOf(p.accountId); if (e) return e.nestId; return p.homeNest != null ? p.homeNest : null; }
  /** 年齢・おなかを DB へ（30 秒ごと・切断・入退室のとき） */
  saveHouse(p) {
    const h = p.house;
    if (!h || !h.me) return;
    this.store.tx(() => {
      this.store.saveIndAge(h.me);
      for (const m of h.members) this.store.saveIndAge(m);
      this.store.setHouseFlags(h.me.id, this._houseFlags(h));
    });
  }
  _sendFamily(p, events = []) { if (p.conn && p.house) p.conn.send({ t: S2C.FAMILY, family: p.house.out(), events }); }
  /** 連れている若者が変わった：地上のみんなへ名札・見た目を */
  _updateKids(p, force = false) {
    const kids = this._kidsOf(p), key = kids.map(k => k.id).join(',');
    if (!force && key === (p.kids || []).map(k => k.id).join(',')) return;
    p.kids = kids;
    if (p.place === 'field' && p.st) this.fieldOf(p).broadcast({ t: S2C.PLAYER_UPDATE, player: this.fieldOf(p).playerInfo(p) });
  }
  /** 家族の時間（親が地上か巣の中にいる間だけ）：年齢・おなか・自動で食べる・お産・育った */
  familyTick(p, dtMs, env) {
    const h = p.house;
    if (!h || !h.me || !(dtMs > 0)) return;
    const nestId = this._ownNestId(p);
    let storage = null, seeds = 0;
    if (nestId != null && h.members.some(needsFood)) { storage = this.store.nestStorage(nestId); seeds = countItem(storage, 'seed'); }
    const pend = h.pending;
    const t = this.now();
    const r = h.tick(dtMs, { seeds, season: env.season, newId: () => this.store.allocIndividual(p.accountId, t), now: t });
    if (r.used && storage) { removeItem(storage, 'seed', r.used); this.store.setNestStorage(nestId, storage); }
    const events = [];
    for (const e of r.events) {
      if (e.type === 'born') {
        this.store.tx(() => {
          for (const m of e.pups) this.store.saveInd(m, { accountId: p.accountId, nestId });
          if (pend && pend.litterId) this.store.litterBorn(pend.litterId, { bornAt: t, size: e.pups.length, season: e.season, seed: e.seed });
          this.store.setHouseFlags(h.me.id, this._houseFlags(h));
        });
        events.push({ ...e, pups: e.pups.map(m => indOut(m)) });
        this.log(`[family] ${p.name} に ${e.pups.length} 匹うまれた（${e.season}）`);
        this.grant(p, 'first_pups');
      } else events.push(e);
    }
    if (h.wantsPrompt()) { events.push({ type: 'lifespan' }); this.store.setHouseFlags(h.me.id, this._houseFlags(h)); }
    if (r.events.some(e => e.type === 'stage')) this._updateKids(p);
    if (events.length || r.used || t - (p.famT || 0) >= FAMILY_SEND_MS) { p.famT = t; this._sendFamily(p, events); }
  }
  /** なかよくなれるか（おとな・体調・季節・お産の予定） */
  _courtBlock(p) {
    const h = p.house;
    if (!h || !h.me) return 'キャラクターが無い';
    return courtBlock({ ageMs: h.me.ageMs, life: p.life, season: this.envOf(p).season, pending: !!h.pending });
  }
  /** Ver.0.6：ほかの種の子と なかよくなれるか */
  _friendBlock(p) {
    const h = p.house;
    if (!h || !h.me) return 'キャラクターが無い';
    return friendBlock({ ageMs: h.me.ageMs, friends: h.friends().length });
  }
  /** 野生の子に種子をあげる */
  court(p, m) {
    if (p.place !== 'field') return fail(ERR.FORBIDDEN, '地上にいない');
    const room = this.fieldOf(p);
    room.drain(p);
    const n = room.wild.get(String(m.wildId));
    if (!n) return fail(ERR.NOT_FOUND, 'もう どこかへ行ってしまった');
    const other = n.species && n.species !== 'jerboa';
    const why = other ? this._friendBlock(p) : this._courtBlock(p);
    if (why) return fail(ERR.RULE, why, { shy: true });
    const inv = p.inv.map(x => x && { ...x });
    if (!removeItem(inv, 'seed', 1)) return fail(ERR.RULE, '種子を持っていない');
    const r = room.wild.offer(n.id, { id: p.accountId, x: p.st.x, y: p.st.y, eligible: true, friendOk: true }, this.now());
    if (!r.ok) return fail(ERR.RULE, r.reason);
    this.store.setCharInventory(p.charId, inv);
    p.inv = inv;
    if (r.befriended && p.conn) p.conn.send({ t: S2C.WILD, type: 'befriend', id: n.id, name: n.name });
    return { ok: true, trust: r.trust, befriended: r.befriended, name: r.name, inv: inv.map(x => x && { ...x }) };
  }
  _breedCtx(p, nest) {
    const storage = this.store.nestStorage(nest.id);
    return { life: p.life, season: this.envOf(p).season, nestData: nest.data, seeds: countItem(storage, 'seed'), newId: () => this.store.allocIndividual(p.accountId, this.now()), now: this.now() };
  }
  _addPending(p, nest) {
    const h = p.house, pd = h.pending;
    const motherId = h.me.sex === 'f' ? h.me.id : pd.mateId, fatherId = h.me.sex === 'f' ? pd.mateId : h.me.id;
    pd.litterId = this.store.addLitter({ accountId: p.accountId, nestId: nest.id, motherId, fatherId, nth: pd.nth, conceivedAt: this.now(), duePlay: pd.dueAgeMs });
  }
  /** 自分の巣へ入るとき：ついてきた野生の子（90px 以内）をつれあいに迎える */
  _tryInvite(p, nest) {
    const h = p.house;
    const room = this.fieldOf(p);
    const n = room.wild.followerOf(p.accountId);
    if (!h || !n || !p.st || Math.hypot(n.st.x - p.st.x, n.st.y - p.st.y) > WILD.INVITE_R) return null;
    const r = h.invite({ name: n.name, genes: n.genes, species: n.species }, this._breedCtx(p, nest));
    if (!r.ok) return { ok: false, name: n.name, reason: r.reason };
    room.wild.take(n.id);
    if (r.friend) {   // Ver.0.6：ほかの種のなかま（つれあいにはならない・お産の予定は作らない）
      this.store.tx(() => { this.store.saveInd(r.mate, { accountId: p.accountId, nestId: nest.id }); });
      this._sendFamily(p, [{ type: 'friend', name: r.mate.name, species: r.mate.species }]);
      return { ok: true, friend: true, name: n.name, species: r.mate.species, mate: indOut(r.mate), note: r.note };
    }
    this.store.tx(() => {
      this.store.dropPendingLitters(p.accountId);
      this.store.saveInd(r.mate, { accountId: p.accountId, nestId: nest.id });
      for (const l of r.left) this.store.saveInd(l, { accountId: p.accountId });
      this._addPending(p, nest);
      this.store.setHouseFlags(h.me.id, this._houseFlags(h));
    });
    this._sendFamily(p, [{ type: 'mate', name: r.mate.name }]);
    return { ok: true, name: n.name, mate: indOut(r.mate) };
  }
  mateAgain(p) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    const hid = this._homeNestId(p), nest = hid != null ? this.store.nest(hid) : null;
    if (!nest || p.place !== 'nest' || p.nestId !== nest.id) return fail(ERR.FORBIDDEN, '自分の巣の中で');
    const r = h.mateAgain(this._breedCtx(p, nest));
    if (!r.ok) return fail(ERR.RULE, r.reason);
    this.store.tx(() => { this.store.dropPendingLitters(p.accountId); this._addPending(p, nest); this.store.setHouseFlags(h.me.id, this._houseFlags(h)); });
    return { ok: true, family: h.out() };
  }
  namePups(p, m) {
    const h = p.house;
    if (!h || !Array.isArray(m.list) || m.list.length > 16) return fail(ERR.BAD_REQUEST, '名前が変');
    for (const it of m.list) { const e = validName(it && it.name); if (e) return fail(ERR.BAD_REQUEST, e); }
    const done = [];
    for (const it of m.list) {
      const r = h.rename(Number(it.id), String(it.name).trim());
      if (!r.ok) return fail(ERR.RULE, r.reason);
      done.push(r.member);
    }
    const nestId = this._ownNestId(p);
    this.store.tx(() => { for (const x of done) this.store.saveInd(x, { accountId: p.accountId, nestId }); });
    this._updateKids(p, true);
    return { ok: true, family: h.out() };
  }
  feedPup(p, m) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    const nestId = this._ownNestId(p);
    if (p.place !== 'nest' || nestId == null || p.nestId !== nestId) return fail(ERR.FORBIDDEN, '自分の巣の中で あげよう');
    if (this._actGap(p)) return fail(ERR.RATE, 'もぐもぐ…（ちょっと待って）');
    const inv = p.inv.map(x => x && { ...x });
    if (countItem(inv, 'seed') < 1) return fail(ERR.RULE, '種子を持っていない');
    const r = h.feed(Number(m.id));
    if (!r.ok) return fail(ERR.RULE, r.reason);
    removeItem(inv, 'seed', 1);
    this.store.tx(() => { this.store.setCharInventory(p.charId, inv); this.store.saveIndAge(r.member); });
    p.inv = inv;
    return { ok: true, inv: inv.map(x => x && { ...x }), member: indOut(r.member), family: h.out() };
  }
  /** Ver.0.6：巣の家族をなでる（自分の家の巣の中で・1 匹ごとに PET.COOLDOWN_MS）。体調 +PET.COND */
  petFamily(p, m) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    const nestId = this._ownNestId(p);
    if (p.place !== 'nest' || nestId == null || p.nestId !== nestId) return fail(ERR.FORBIDDEN, '自分の巣の中で');
    if (p.sleeping) return fail(ERR.RULE, '眠っている');
    const id = Number(m.id);
    if (!Number.isInteger(id)) return fail(ERR.BAD_REQUEST, 'だれ？');
    const r = h.pet(id, this.now());
    if (!r.ok) return fail(r.cooldown ? ERR.RATE : ERR.RULE, r.reason);
    p.life = { ...p.life, cond: Math.min(PET.MAX_COND, p.life.cond + r.cond) };
    this.store.tx(() => { this.store.saveInd(r.member, { accountId: p.accountId, nestId }); this.store.setLife(p.indId, { ...lifeOut(p.life), sleep: false }); });
    this.sendLife(p);
    return { ok: true, member: indOut(r.member), life: lifeOut(p.life), family: h.out(), cond: r.cond };
  }
  /** Ver.0.7：なかま（ほかの種）を地上へ連れて行く・巣で待つ。連れて行けるのは 1 匹（別の子を選ぶと入れかわる） */
  setCompanion(p, m) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    const id = m.id == null || m.id === false ? null : Number(m.id);
    if (id !== null && !Number.isInteger(id)) return fail(ERR.BAD_REQUEST, 'id が変');
    const r = h.setCompanion(id);
    if (!r.ok) return fail(ERR.RULE, r.reason);
    this.store.setHouseFlags(h.me.id, this._houseFlags(h));
    this._updateKids(p);
    return { ok: true, family: h.out(), kids: p.kids, swapped: r.swapped };
  }
  /**
   * Ver.0.8：季節の行事に参加する（1 回の行事に 1 回・条件は shared/festival.js の festActBlock をサーバーの確定位置で）。
   * 費用（種子・草）を払い、印を DB（fest_marks：UNIQUE(account_id, occ)）とその土地のみんなへ。はじめての行事なら図鑑の品（1 回だけ）。
   */
  festAct(p, m) {
    const act = String(m.act || '');
    if (!FEST_ACTS[act]) return fail(ERR.BAD_REQUEST, 'そんな行事は ない');
    if (p.place !== 'field' || !p.st) return fail(ERR.RULE, '地上で');
    const room = this.fieldOf(p), t = this.now();
    room.drain(p);
    if (p.festT && t - p.festT < 800) return fail(ERR.RATE, 'ちょっと待って');
    p.festT = t;
    const f = festivalAt(this.clock, t);
    const ent = room.entrances.get(p.accountId) || null;
    const done = this.store.festJoined(p.accountId, f.occ);
    const why = festActBlock({ fest: f, act, region: room.region, x: p.st.x, y: p.st.y, entrance: ent, spawn: room.map.spawn, done, inv: p.inv, still: p.stillT || 0, place: 'field' });
    if (why) return fail(ERR.RULE, why);
    const mark = makeMark({ fest: f, region: room.region, x: p.st.x, y: p.st.y + (act === 'lantern' ? 2 : 0), owner: p.accountId, name: p.name, at: t });
    if (room.festMarks.filter(x => x.occ === f.occ).length >= FEST.MAX_MARKS) return fail(ERR.FULL, 'もう いっぱい（また次の季節に）');
    const inv = p.inv.map(x => x && { ...x });
    for (const [k, n] of Object.entries(f.cost)) removeItem(inv, k, n);
    let wrote = 0;
    this.store.tx(() => { wrote = this.store.addFestMark(mark); if (wrote) this.store.setCharInventory(p.charId, inv); });
    if (!wrote) return fail(ERR.RULE, 'この夜は もう 参加した（また次の季節に）');
    p.inv = inv;
    room.addFestMark(mark);
    let reward = null;
    if (this.store.addCollectible(p.accountId, f.reward, t, { fest: f.id, occ: f.occ }) === 1) { reward = f.reward; this.collected(p, f.reward, t); }
    this.log(`[fest] ${p.name}: ${f.id}（${act}）`);
    return { ok: true, mark, inv: inv.map(x => x && { ...x }), reward, fest: { id: f.id, occ: f.occ } };
  }
  /** Ver.0.7：富山の小さな出来事（1 回だけ）。条件はサーバーが確かめる（shared/toyama.js の toyamaEventBlock） */
  toyamaEvent(p, m) {
    const id = String(m.id || '');
    if (!TOYAMA_EVENT_IDS.includes(id)) return fail(ERR.BAD_REQUEST, 'そんな出来事は ない');
    if (p.place !== 'field' || !p.st) return fail(ERR.RULE, '地上で');
    if (!p.tev) p.tev = {};
    if (p.tev[id]) return { ok: true, id, first: false, seen: { ...p.tev } };
    const room = this.fieldOf(p), t = this.now(), env = this.envOf(p, t);
    const why = toyamaEventBlock(id, { region: room.region, season: env.season, period: env.period, hour: dayPhase(this.clock, t) * 24, x: p.st.x, y: p.st.y, owned: p.owned, seen: p.tev, slack: TEV.TRAIN_SLACK });
    if (why) return fail(ERR.RULE, why);
    const first = this.store.setFlagOnce(p.accountId, 'tev:' + id, t) > 0;
    p.tev[id] = t;
    if (first) this.log(`[toyama] ${p.name}: ${id}`);
    return { ok: true, id, first, seen: { ...p.tev } };
  }
  kidsFollow(p, m) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    h.follow = !!m.on;
    this.store.setHouseFlags(h.me.id, this._houseFlags(h));
    this._updateKids(p);
    return { ok: true, family: h.out(), kids: p.kids };
  }
  /** 家系図：その家の個体すべて（いまの家族は記憶の中の新しい年齢で） */
  lineage(p) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    const live = new Map([h.me, ...h.members].map(m => [m.id, m]));
    const nodes = this.store.lineage(p.accountId).map(m => indOut(live.get(m.id) || m));
    return { ok: true, nodes, current: h.me.id };
  }
  /** 世代交代（自分の育った子だけ）・旅立ち（子がいない年寄り：親せきの子）。巣・倉庫・持ち物・フレンド・収集品はアカウントのまま */
  succeed(p, m, farewell = false) {
    const h = p.house;
    if (!h) return fail(ERR.NOT_FOUND, 'キャラクターが無い');
    if (p.sleeping) this.wake(p, false);
    const t = this.now();
    const r = farewell ? h.farewell({ newId: () => this.store.allocIndividual(p.accountId, t), now: t }) : h.succeed(Number(m.id), t);
    if (!r.ok) return fail(ERR.RULE, r.reason);
    const nestId = this._ownNestId(p);
    this.saveHouse(p);
    this.store.tx(() => {
      for (const x of r.retired) this.store.saveInd(x, { accountId: p.accountId });
      for (const x of r.left) this.store.saveInd(x, { accountId: p.accountId });
      for (const x of h.members) this.store.saveInd(x, { accountId: p.accountId, nestId });
      this.store.saveInd(h.me, { accountId: p.accountId });
      this.store.dropPendingLitters(p.accountId);
      this.store.setHouseFlags(h.me.id, this._houseFlags(h));
    });
    const charId = this.store.switchCharacter(p.accountId, h.me, t);
    const c = this.store.activeCharacter(p.accountId);
    p.charId = charId; p.indId = h.me.id; p.name = c.name; p.fur = c.fur;
    p.inv = this.store.charInventory(charId);
    p.life = makeLife();
    this._applyTraits(p);
    // まわりへ：名札・見た目（地上）、巣の中の子、入口の名前、フレンドの一覧
    if (p.place === 'field' && p.st) this.fieldOf(p).broadcast({ t: S2C.PLAYER_UPDATE, player: this.fieldOf(p).playerInfo(p) });
    if (p.place === 'nest') this.nests.flushPeers(p.nestId);
    if (nestId != null) {
      this.nests.forget(nestId);
      this.refreshEntrance(p.accountId);
    }
    if (h.me.generation >= 3) this.grant(p, 'gen3');
    this.pushFriends(p.accountId, true);
    this.sendLife(p);
    this.log(`[family] ${r.retired[0].name} → ${p.name}（${farewell ? '旅立ち' : '世代交代'}）`);
    return { ok: true, character: this._characterOut(c), family: h.out(), life: lifeOut(p.life), inv: p.inv.map(x => x && { ...x }), look: p.look, kids: p.kids,
      retired: r.retired.map(x => indOut(x)), left: r.left.map(x => indOut(x)) };
  }

  // ───────── フレンド（Ver.0.2）─────────
  /** 一覧：{id, name, fur, state:'friend'|'incoming'|'outgoing', online, where, nest:{x,y}|null} */
  friendList(acct) {
    return this.store.friendsOf(acct).map(f => {
      const c = this.store.charBrief(f.other) || { name: '？', fur: 'sand' };
      const o = this.players.get(f.other);
      const isF = f.state === 'friend';
      const ent = isF ? this.entranceOf(f.other) : null;
      return { id: f.other, name: c.name, fur: c.fur, state: f.state, online: isF && !!(o && o.conn), where: isF && o ? (o.place === 'field' || o.place === 'nest' ? o.place : null) : null,
        region: isF && o && o.conn ? o.region || 'plains' : null, nest: ent ? { x: ent.x, y: ent.y, region: ent.region || 'plains' } : null, at: f.at };
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

  // ───────── 広がり（Ver.0.5）：土地の旅・不思議な穴・収集品・実績・共同巣（Ver.0.6：豊かな巣 → 巣めぐり）─────────
  /** 図鑑・実績・進み具合（印）を DB から */
  _loadProgress(p) {
    p.owned = new Set(Object.keys(this.store.collection(p.accountId)));
    p.ach = new Set(Object.keys(this.store.achievements(p.accountId)));
    const csv = k => new Set(String(this.store.flag(p.accountId, k, '') || '').split(',').filter(Boolean));
    p.seasonsSeen = csv('seasons'); p.regionsSeen = csv('regions'); p.visitedNests = csv('visited');
    p.toyamaFound = this.store.flag(p.accountId, 'toyama') === '1';
    p.tev = {};   // Ver.0.7：見た富山の小さな出来事 {id: 時刻}
    for (const [k, v] of Object.entries(this.store.flagsLike(p.accountId, 'tev:'))) p.tev[k.slice(4)] = Number(v) || 1;
    p.homeNest = this.store.residentNestOf(p.accountId);
    p.stormMs = 0; p.gate = null;
  }
  /** 実績をとる（1 回だけ）。本人へ achievement */
  grant(p, id) {
    if (!p || !ACH[id] || (p.ach && p.ach.has(id))) return false;
    const at = this.now();
    if (this.store.addAchievement(p.accountId, id, at) !== 1) { if (p.ach) p.ach.add(id); return false; }
    if (p.ach) p.ach.add(id);
    if (p.conn) p.conn.send({ t: S2C.ACHIEVEMENT, id, at, ...(ACH[id].reward ? { reward: ACH[id].reward } : {}) });
    this.log(`[achieve] ${p.name}：${ACH[id].name}`);
    return true;
  }
  /** 収集品が図鑑に入った（拾った・開発用）。本人へ collect、収集品の数の実績 */
  collected(p, cid, at) {
    p.owned.add(cid);
    if (p.conn) p.conn.send({ t: S2C.COLLECT, cid, at, total: p.owned.size });
    this.log(`[collect] ${p.name}：${(CURIOS[cid] || {}).name}`);
    for (const a of collectAchievements(p.owned)) this.grant(p, a);
  }
  /** 季節・砂嵐の実績の進み具合（暮らしの刻みごと。dtMs は世界の時間） */
  progressTick(p, env, dtMs, save) {
    if (env && env.season && !p.seasonsSeen.has(env.season)) {
      p.seasonsSeen.add(env.season);
      this.store.setFlag(p.accountId, 'seasons', [...p.seasonsSeen].join(','));
      if (p.seasonsSeen.size >= 4) this.grant(p, 'seasons4');
    }
    if (p.place === 'field' && env && env.weather === 'sandstorm') p.stormMs += dtMs;
    else {
      if (p.place === 'field' && p.stormMs >= SANDSTORM_MS) this.grant(p, 'sandstorm');
      p.stormMs = 0;
    }
    void save;
  }
  _visitRegion(p, region) {
    if (!region || p.regionsSeen.has(region)) return;
    p.regionsSeen.add(region);
    this.store.setFlag(p.accountId, 'regions', [...p.regionsSeen].join(','));
    if (OPEN_REGIONS.every(r => p.regionsSeen.has(r))) this.grant(p, 'regions4');
  }
  _visitedFriend(p, nest) {
    if (!this.store.isFriend(nest.owner, p.accountId)) return;
    const k = String(nest.id);
    if (p.visitedNests.has(k)) return;
    p.visitedNests.add(k);
    this.store.setFlag(p.accountId, 'visited', [...p.visitedNests].slice(-50).join(','));
    if (p.visitedNests.size >= VISIT_GOAL) this.grant(p, 'visit5');
  }
  /** 不思議な穴：谷にいる子ごとに 1 秒ごと（条件は shared/collect.js の gateOpen。サーバーが確かめる）。富山では「来た穴」 */
  gateTick(force = false) {
    const t = this.now();
    if (!force && t < (this._gateT || 0)) return;
    this._gateT = t + 1000;
    for (const p of this.players.values()) {
      const was = p.gate;
      if (p.place !== 'field') { p.gate = null; continue; }
      const room = this.fieldOf(p);
      if (room.region === 'toyama') p.gate = { x: room.map.back.x, y: room.map.back.y, back: true };
      else if (room.region === 'canyon') {
        const env = p.env || this.envOf(p, t);
        p.gate = gateOpen({ region: 'canyon', env, owned: p.owned, found: p.toyamaFound, force: p.gateForce || this.gateForce }) ? { x: room.map.secret.x, y: room.map.secret.y } : null;
      } else p.gate = null;
      if (!was && p.gate && !p.gate.back && p.conn) p.conn.send({ t: S2C.TOAST, text: '谷の奥で、なにかが ぼんやり光った…' });
    }
  }
  /** 地図の端の出口から、となりの土地へ */
  travel(p, m) {
    if (p.place !== 'field' || !p.st) return fail(ERR.FORBIDDEN, '地上にいない');
    const room = this.fieldOf(p);
    room.drain(p);
    const to = String(m.to || '');
    if (!isRegion(to) || REGION[to].hidden) return fail(ERR.BAD_REQUEST, '知らない土地');
    const g = gateAt(room.map, p.st.x, p.st.y);
    if (!g || g.to !== to) return fail(ERR.TOO_FAR, 'ここは その土地への出口ではない');
    if (p.st.jump) return fail(ERR.RULE, '跳んでいる最中');
    const t = this.now();
    if (p.travelT && t - p.travelT < TRAVEL_GAP_MS) return fail(ERR.RATE, 'ちょっと待って');
    p.travelT = t;
    return this._moveRegion(p, to, arrivalPoint(regionMap(to), room.region), 'travel');
  }
  /** 部屋を移る（旅・不思議な穴・開発用）。返り値は join_field と同じ形の world */
  _moveRegion(p, to, pos, why = 'travel') {
    const from = this.fieldOf(p);
    if (p.place === 'field') from.leave(p, why);
    if (p.sleeping) this.wake(p, false);
    p.region = to;
    const world = this.fields.get(to).join(p, { x: pos.x, y: pos.y, dir: pos.dir || 'down' }, why);
    this.store.savePosition(p.charId, { x: pos.x, y: pos.y, dir: pos.dir || 'down', place: 'field', exit: 'live', region: to }, this.now());
    this._decorateWorld(p, world);
    this._visitRegion(p, to);
    this.gateTick(true);
    world.gate = p.gate || null;
    this.pushFriends(p.accountId, true);
    this.log(`[travel] ${p.name}：${from.region} → ${to}`);
    return { ok: true, world, from: from.region };
  }
  /** 不思議な穴に入る（谷の奥 → 富山）・来た穴（富山 → 谷の奥） */
  enterGate(p) {
    if (p.place !== 'field' || !p.st) return fail(ERR.FORBIDDEN, '地上にいない');
    const room = this.fieldOf(p);
    room.drain(p);
    if (p.st.jump) return fail(ERR.RULE, '跳んでいる最中');
    if (room.region === 'toyama') {
      const b = room.map.back;
      if (Math.hypot(b.x - p.st.x, b.y - p.st.y) > GATE_R) return fail(ERR.TOO_FAR, '穴から遠い');
      const sec = regionMap('canyon').secret;
      return this._moveRegion(p, 'canyon', { x: sec.x + 22, y: sec.y + 2, dir: 'right' }, 'gate');
    }
    if (room.region !== 'canyon') return fail(ERR.NOT_FOUND, 'ここには穴が無い');
    const sec = room.map.secret;
    if (Math.hypot(sec.x - p.st.x, sec.y - p.st.y) > GATE_R) return fail(ERR.TOO_FAR, '穴から遠い');
    const env = this.envOf(p);
    if (!gateOpen({ region: 'canyon', env, owned: p.owned, found: p.toyamaFound, force: p.gateForce || this.gateForce })) {
      return fail(ERR.RULE, '古い石の標がある。' + gateHint({ env, owned: p.owned, found: p.toyamaFound }));
    }
    const first = !p.toyamaFound;
    if (first) { p.toyamaFound = true; this.store.setFlag(p.accountId, 'toyama', '1'); }
    const tm = regionMap('toyama');
    const r = this._moveRegion(p, 'toyama', arrivalPoint(tm, 'canyon'), 'gate');
    r.first = first;
    this.grant(p, 'toyama');
    return r;
  }
  collectionOut(p) {
    return { ok: true, owned: this.store.collection(p.accountId), achievements: this.store.achievements(p.accountId),
      stats: { seasons: [...p.seasonsSeen], regions: [...p.regionsSeen], visited: p.visitedNests.size, found: !!p.toyamaFound } };
  }
  /**
   * Ver.0.6「巣めぐり」：その子が入れる巣（公開・フレンドだけ公開でフレンド・許可リスト）をいくつか紹介する。順位・点数はつけない
   * （shared/tour.js：最近 手を入れた巣を少し＋その子と時間の枠で混ぜた巣。10 分ごとに入れかわる）。自分の巣・住んでいる共同巣は出さない。
   */
  nestTour(p) {
    const t = this.now();
    const home = this._homeNestId(p);
    const friends = new Set(this.store.friendIds(p.accountId));
    const cands = [];
    for (const n of this.store.allNests()) {
      if (n.owner === p.accountId || n.id === home || n.x == null) continue;
      if (!this.nests.canVisit(n, p.accountId)) continue;
      cands.push({ nestId: n.id, name: n.ownerName, region: n.field || 'plains', data: n.data, updatedAt: n.updatedAt, policy: n.policy, friend: friends.has(n.owner), x: n.x, y: n.y });
    }
    const list = pickTour(cands, { viewer: p.accountId, now: t });
    return { ok: true, tour: true, list, count: cands.length };
  }

  // ── 共同巣：所有者がフレンドを住人に誘う（nest_access の role 'invite' → 'resident'）──
  residentsInfo(acct) {
    const nm = id => (this.store.charBrief(id) || { name: '？' }).name;
    const own = this.store.nestByOwner(acct);
    const mine = own ? { nestId: own.id, residents: this.store.nestMembers(own.id, 'resident').map(id => ({ id, name: nm(id) })), invites: this.store.nestMembers(own.id, 'invite').map(id => ({ id, name: nm(id) })) } : null;
    const hid = this.store.residentNestOf(acct), hn = hid != null ? this.store.nest(hid) : null;
    const home = hn ? { nestId: hn.id, owner: hn.owner, ownerName: hn.ownerName, region: hn.field || 'plains', x: hn.x, y: hn.y, others: this.store.nestMembers(hn.id, 'resident').filter(id => id !== acct).map(id => ({ id, name: nm(id) })) } : null;
    const invites = this.store.invitesFor(acct).map(id => { const n = this.store.nest(id); return n ? { nestId: n.id, owner: n.owner, ownerName: n.ownerName, region: n.field || 'plains' } : null; }).filter(Boolean);
    return { mine, home, invites, max: MAX_RESIDENTS };
  }
  pushResidents(acct, text = null) { const o = this.players.get(acct); if (o && o.conn) o.conn.send({ t: S2C.RESIDENTS, ...this.residentsInfo(acct), ...(text ? { text } : {}) }); }
  /** 住人が変わった：その巣にいる子の役割（nest_role）と、入口の「自分の家」を新しく */
  _residentChanged(nest, acct) {
    const o = this.players.get(acct);
    if (o) {
      o.homeNest = this.store.residentNestOf(acct);
      if (o.place === 'nest' && o.nestId === nest.id && o.conn) { const role = this.nests.role(nest, acct); o.conn.send({ t: S2C.NEST_ROLE, nestId: nest.id, canEdit: role !== 'visitor', role }); }
      const e = this._entranceOfNest(nest.id);
      if (e && o.conn) o.conn.send({ t: S2C.ENTRANCE, entrance: this.roomOfEntrance(e).entranceOut(e, acct) });
    }
    this.nests.forget(nest.id);
  }
  residentInvite(p, name) {
    if (this._friendRate(p)) return fail(ERR.RATE, '操作が多すぎる。少し待ってね');
    const own = this.store.nestByOwner(p.accountId);
    if (!own) return fail(ERR.NOT_FOUND, 'まだ巣が無い（先に巣を掘ろう）');
    const nm = String(name || '').trim();
    if (validName(nm)) return fail(ERR.BAD_REQUEST, validName(nm));
    const ids = this.store.accountsByCharName(nm).filter(id => id !== p.accountId);
    if (!ids.length) return fail(ERR.NOT_FOUND, '「' + nm + '」という子は見つからない');
    if (ids.length > 1) return fail(ERR.RULE, '同じ名前の子が何匹もいる');
    const other = ids[0];
    if (!this.store.isFriend(p.accountId, other)) return fail(ERR.RULE, 'フレンドだけ誘える');
    if (this.store.hasNestAccess(own.id, other, 'resident')) return fail(ERR.RULE, 'もう いっしょに住んでいる');
    if (this.store.hasNestAccess(own.id, other, 'invite')) return fail(ERR.RULE, 'もう誘ってある（返事待ち）');
    if (this.store.nestMembers(own.id, 'resident').length + this.store.nestMembers(own.id, 'invite').length >= MAX_RESIDENTS) return fail(ERR.FULL, `いっしょに住めるのは ${MAX_RESIDENTS} 匹まで`);
    this.store.addNestAccess(own.id, other, 'invite', nm);
    this.pushResidents(other, p.name + ' から「いっしょに住もう」と誘われた（メニュー → 共同巣）');
    return { ok: true, ...this.residentsInfo(p.accountId) };
  }
  residentAnswer(p, nestId, yes) {
    const nest = this.store.nest(Number(nestId));
    if (!nest || !this.store.hasNestAccess(nest.id, p.accountId, 'invite')) return fail(ERR.NOT_FOUND, '誘いが見つからない');
    if (yes && this.store.residentNestOf(p.accountId) != null) return fail(ERR.RULE, 'もう ほかの巣に住んでいる（先に出よう）');
    this.store.tx(() => {
      this.store.removeNestAccess(nest.id, p.accountId, 'invite');
      if (yes) this.store.addNestAccess(nest.id, p.accountId, 'resident', p.name);
    });
    this._residentChanged(nest, p.accountId);
    const owner = this.players.get(nest.owner);
    this.pushResidents(nest.owner, yes ? p.name + ' が あなたの巣に住むことになった（共同巣）' : p.name + ' は 今回は見送った');
    if (yes) { this.grant(p, 'together'); if (owner) this.grant(owner, 'together'); else this.store.addAchievement(nest.owner, 'together', this.now()); }
    return { ok: true, ...this.residentsInfo(p.accountId) };
  }
  residentLeave(p) {
    const hid = this.store.residentNestOf(p.accountId);
    if (hid == null) return fail(ERR.NOT_FOUND, 'どこにも住んでいない');
    const nest = this.store.nest(hid);
    this.store.removeNestAccess(hid, p.accountId, 'resident');
    // 子どもたちは住人の家族のまま（家族の数え方は家ごと）。いまの巣が無くなるので、家族の居場所は次に巣を持ったときに決まる
    if (nest) { this._residentChanged(nest, p.accountId); this.pushResidents(nest.owner, p.name + ' が 共同巣を出た'); }
    return { ok: true, ...this.residentsInfo(p.accountId) };
  }
  residentRemove(p, id) {
    const own = this.store.nestByOwner(p.accountId);
    if (!own) return fail(ERR.NOT_FOUND, '巣が無い');
    const other = Number(id);
    const n = this.store.removeNestAccess(own.id, other, 'resident') + this.store.removeNestAccess(own.id, other, 'invite');
    if (!n) return fail(ERR.NOT_FOUND, '住人ではない');
    this._residentChanged(own, other);
    this.pushResidents(other, own.ownerName + 'の巣の 住人では なくなった');
    return { ok: true, ...this.residentsInfo(p.accountId) };
  }
  /** 巣にいる家族（所有者と住人の家族。いまオンラインの子は手元の最新）。acct で「どの家の子か」 */
  nestFamilyOf(nest) {
    const out = [];
    const accts = [nest.owner, ...this.store.nestMembers(nest.id, 'resident')];
    for (const a of accts) {
      const o = this.players.get(a);
      const list = o && o.house && this._homeNestId(o) === nest.id ? o.house.publicOut() : this.store.nestFamily(nest.id).filter(m => this._indAcct(m.id) === a).map(m => indOut(m));
      for (const m of list) out.push({ ...m, acct: a });
    }
    return out;
  }
  /** Ver.0.7：巣の家族のやりとりの文脈（所有者の印から。訪問者の画面でも同じ入力にするため、巣の記録に入れて送る） */
  nestTalesOf(nest) {
    const o = this.players.get(nest.owner);
    const toyama = o ? !!o.toyamaFound : this.store.flag(nest.owner, 'toyama') === '1';
    let companion = o && o.house ? o.house.companion ?? null : null;
    if (!o) { const hj = this.store.household(nest.owner); companion = hj ? hj.companion ?? null : null; }
    const fest = this.store.festJoined(nest.owner, festivalAt(this.clock, this.now()).occ);   // Ver.0.8：この季節の行事に参加した
    return { toyama, companion, fest };
  }
  _indAcct(id) { const r = this.store.q('SELECT account_id FROM individuals WHERE id = ?').get(id); return r ? r.account_id : null; }

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
    else if (p.place === 'field') this.fieldOf(p).broadcast(msg);
    else if (p.conn) p.conn.send(msg);
  }

  statsSnapshot() {
    const mem = process.memoryUsage();
    return {
      players: this.players.size, field: [...this.fields.values()].reduce((a, r) => a + r.players.size, 0), nests: this.nests.inst.size, sessions: this.sessions.size,
      regions: Object.fromEntries([...this.fields].map(([id, r]) => [id, r.players.size])),
      resources: [...this.fields.values()].reduce((a, r) => a + r.resources.size, 0), respawnQueue: [...this.fields.values()].reduce((a, r) => a + r.respawns.length, 0),
      msgIn: this.stats.msgIn, msgOut: this.stats.msgOut, bytesIn: this.stats.bytesIn, bytesOut: this.stats.bytesOut, errors: this.stats.errors,
      rss: mem.rss, heapUsed: mem.heapUsed, uptime: Math.round((this.now() - this.stats.startedAt) / 1000),
    };
  }
}
