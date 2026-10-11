// tobinezumi/server/game.js — 接続ごとの受け付け（認証・振り分け）と、地上・巣の部屋をまとめる本体。ws には依存しない
// （テストでは偽の接続 {send, close} をつないで、そのまま動かせる）。
//
//   const game = new Game({ store, auth });  game.start();      … 20Hz のティック・30 秒ごとの位置保存
//   const s = game.connect({ ip, sendRaw(text), close(code, reason) });
//   s.onMessage(text) / s.onClose()
import { buildFieldMap } from '../shared/regions.js';
import { boxFree } from '../shared/move.js';
import { makeInventory, swapSlots, START_INVENTORY, INV_SLOTS } from '../shared/items.js';
import { C2S, S2C, ERR, decode, cleanChat, validName, validUsername, validPassword, FUR_IDS, PROTOCOL_VERSION, SERVER_TICK_HZ, POS_SAVE_MS, RECONNECT_GRACE_MS } from '../shared/protocol.js';
import { FieldRoom } from './rooms/field.js';
import { NestHub } from './rooms/nest.js';

export const ENTER_RANGE = 34;
export const CHAT_BURST = 5, CHAT_WINDOW_MS = 10000, CHAT_GAP_MS = 400;
export const MSG_PER_SEC = 150;

const fail = (code, reason, extra = {}) => ({ ok: false, code, reason, ...extra });

export class Game {
  constructor({ store, auth, now = () => Date.now(), random = Math.random, log = console.log, respawnScale = 1, graceMs = RECONNECT_GRACE_MS, saveMs = POS_SAVE_MS } = {}) {
    this.store = store; this.auth = auth; this.now = now; this.random = random; this.log = log;
    this.graceMs = graceMs; this.saveMs = saveMs;
    this.map = buildFieldMap();
    this.stats = { msgIn: 0, msgOut: 0, bytesIn: 0, bytesOut: 0, errors: 0, conns: 0, startedAt: now() };
    this.field = new FieldRoom({ store, map: this.map, now, random, log, respawnScale, stats: this.stats });
    this.nests = new NestHub({ store, now, log });
    this.field.nestInfo = id => this.nests.meta(id);
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
    try { this.field.tick(); this.nests.tick(); }
    catch (e) { this.stats.errors++; this.log('[tick] ' + (e && e.stack || e)); }
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
    conn.send({ t: S2C.WELCOME, v: PROTOCOL_VERSION, serverTime: this.now() });
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
    p.place = 'none';
    if (this.players.get(p.accountId) === p) this.players.delete(p.accountId);
    if (p.session) { p.session.player = null; p.session = null; }
    p.conn = null;
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
    const p = { accountId: account.id, username: account.username, charId: c.id, name: c.name, fur: c.fur, inv: this.store.charInventory(c.id),
      conn: s.conn, session: s, place: 'none', st: null, lastSeq: 0, inbox: [], budget: 0, nestId: null, chatT: [] };
    s.player = p;
    this.players.set(account.id, p);
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
    const world = this.field.join(p, pos);
    this.store.savePosition(p.charId, { x: pos.x, y: pos.y, dir: pos.dir, place: 'field', exit: 'live' }, this.now());
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
    if (!this.nests.canVisit(nest, p.accountId)) return fail(ERR.FORBIDDEN, (nest.ownerName || '') + 'の巣は 今は入れないようだ');
    if (p.place === 'field') { p.lastField = { x: ent.x, y: ent.y + 12, dir: 'down' }; this.field.leave(p, 'nest'); }
    const r = this.nests.enter(p, nest);
    if (!r.ok) return r;
    this.savePlayer(p, 'live');
    return r;
  }
  leaveNest(p) {
    if (p.place !== 'nest') return fail(ERR.FORBIDDEN, '巣の中にいない');
    const ent = this._entranceOfNest(p.nestId);
    this.nests.leave(p);
    const pos = ent ? { x: ent.x, y: ent.y + 12, dir: 'down' } : { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down' };
    this.field.join(p, pos, 'nest');
    this.savePlayer(p, 'live');
    return { ok: true, x: pos.x, y: pos.y };
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
