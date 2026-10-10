// tobinezumi/client/net.js — 通信の窓口。オフライン（この端末だけ・localStorage）とオンライン（WebSocket）で同じ API。
//
//   const net = await chooseBackend();       // ?offline=1 / ?server=ws://… / tobi-server.json で決める
//   await net.hello() → {ok, account, character}
//   await net.register(user, pass) / net.login(user, pass) / net.logout()
//   await net.createCharacter({name, fur})
//   await net.joinField() → {ok, world:{you, resources, players, entrances, serverTime}}
//   net.sendInput({seq, mx, my, jump})        … 予測用。確定は 'snapshot' イベントの ack / you
//   await net.pickup(resId) / net.digBurrow(x, y) / net.enterNest(ownerId) / net.leaveNest()
//   await net.nestOp(nestId, rev, op) / net.store(nestId, 'deposit'|'withdraw', item, n)
//   await net.chat(text) / net.setVisitPolicy(policy) / net.nestMove(state)
//   net.tick(dt)                               … 毎フレーム呼ぶ（入力の送信・オフラインのシミュレーション）
//   net.on('snapshot'|'player_join'|'player_leave'|'chat'|'res_gone'|'res_spawn'|'entrance'|'nest_update'|'nest_peers'|'toast'|'status', fn)
//
// オフラインの保存は localStorage の 'tobi_' で始まる鍵だけ（本編 dannoura_* ・境界事象 kyokai_* には触れない）。
import { C2S, S2C, encode, decode, cleanChat, validName, validUsername, validPassword, FUR_IDS, INPUT_SEND_MS, INTERP_DELAY_MS, SNAPSHOT_HZ, POS_SAVE_MS, PROTOCOL_VERSION } from '../shared/protocol.js';
import { buildFieldMap, initialResources, resourceSpawnPoints, pickRespawnPoint, canDigBurrow, RESPAWN_MIN, RESPAWN_MAX, TILE } from '../shared/regions.js';
import { stepField, makeFieldState, STEP_DT } from '../shared/move.js';
import { createNest, migrateNest, tryOp, KIND_COST } from '../shared/nest-rules.js';
import { makeInventory, normalizeInventory, addItem, removeItem, canAdd, payCost, refund, countItem, START_INVENTORY, STORAGE_SLOTS, ITEMS } from '../shared/items.js';
import { hash2 } from '../shared/rng.js';

export const SAVE_KEY = 'tobi_save_v1';
export const SETTINGS_KEY = 'tobi_settings';
export const TOKEN_KEY = 'tobi_token';
export const SAVE_VERSION = 1;
const PICK_RANGE = 28, ENTER_RANGE = 34;

export class Emitter {
  constructor() { this._ev = new Map(); }
  on(ev, fn) { if (!this._ev.has(ev)) this._ev.set(ev, new Set()); this._ev.get(ev).add(fn); return () => this.off(ev, fn); }
  off(ev, fn) { const s = this._ev.get(ev); if (s) s.delete(fn); }
  emit(ev, data) { const s = this._ev.get(ev); if (s) for (const fn of [...s]) { try { fn(data); } catch (e) { console.error(e); } } }
}

// ───────── クライアント予測 ─────────
/** 自分の移動：入力を即時に当て、サーバーの確定（ack と位置）が来たら、未確認の入力を当て直す */
export class Predictor {
  constructor(state, stepFn) {
    this.state = state; this.step = stepFn; this.pending = []; this.seq = state.seq || 0;
    this.err = { x: 0, y: 0 };    // 補正のずれ（見た目だけ少しずつ寄せる）
    this.onReconcile = null;      // (info) => {} 補正が起きたとき
  }
  input(inp) {
    const i = { seq: ++this.seq, mx: inp.mx | 0, my: inp.my | 0, jump: !!inp.jump };
    this.state = this.step(this.state, i);
    this.state.seq = i.seq;
    this.pending.push(i);
    if (this.pending.length > 600) this.pending.splice(0, this.pending.length - 600);
    return i;
  }
  reconcile(ack, auth) {
    this.pending = this.pending.filter(p => p.seq > ack);
    if (!auth) return;
    let s = { ...auth };
    for (const p of this.pending) s = this.step(s, p);
    s.seq = this.seq;
    const dx = this.state.x - s.x, dy = this.state.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.01) {
      if (d < 24) { this.err.x += dx; this.err.y += dy; } else { this.err.x = 0; this.err.y = 0; }   // 大きくずれたら即座に合わせる
      if (this.onReconcile) this.onReconcile({ ack, dx, dy });
    }
    this.state = s;
  }
  /** 描画位置（ずれは 0.1 秒ほどで消える） */
  view(dt) {
    const k = Math.min(1, dt * 12);
    this.err.x -= this.err.x * k; this.err.y -= this.err.y * k;
    return { ...this.state, x: this.state.x + this.err.x, y: this.state.y + this.err.y };
  }
  reset(state) { this.state = { ...state, seq: this.seq }; this.pending = []; this.err = { x: 0, y: 0 }; }
}

/** 他人の表示：スナップショットをためて、INTERP_DELAY_MS 遅れで線形補間（大ジャンプ中は放物線をそのまま再生） */
export class Interp {
  constructor(delay = INTERP_DELAY_MS) { this.delay = delay; this.buf = []; }
  push(t, snap) {
    if (this.buf.length && t <= this.buf[this.buf.length - 1].t) return;
    this.buf.push({ t, s: snap });
    if (this.buf.length > 30) this.buf.shift();
  }
  sample(now) {
    const T = now - this.delay, b = this.buf;
    if (!b.length) return null;
    if (T <= b[0].t) return { ...b[0].s };
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i].t <= T) {
        const a = b[i], c = b[i + 1];
        if (a.s.jump) {   // ジャンプ中：開始時の値から正確な軌道
          const j = a.s.jump, tt = Math.min(j.dur, j.t + (T - a.t) / 1000), k = tt / j.dur;
          return { ...a.s, x: j.x0 + (j.x1 - j.x0) * k, y: j.y0 + (j.y1 - j.y0) * k, z: 4 * 20 * k * (1 - k), anim: k < 1 ? 'jump' : a.s.anim };
        }
        if (!c) return { ...a.s };
        const k = (T - a.t) / Math.max(1, c.t - a.t);
        return { ...a.s, x: a.s.x + (c.s.x - a.s.x) * k, y: a.s.y + (c.s.y - a.s.y) * k, z: (a.s.z || 0) + ((c.s.z || 0) - (a.s.z || 0)) * k };
      }
    }
    return { ...b[b.length - 1].s };
  }
}

// ───────── オフライン ─────────
const NPCS = [
  { id: 'npc_nuts', name: 'ナッツ', fur: 'rust',  home: { x: 30 * TILE + 8, y: 40 * TILE + 8 }, policy: 'private' },
  { id: 'npc_moka', name: 'モカ',   fur: 'cream', home: { x: 56 * TILE + 8, y: 24 * TILE + 8 }, policy: 'public' },
  { id: 'npc_riko', name: 'リコ',   fur: 'gray',  home: { x: 66 * TILE + 8, y: 38 * TILE + 8 }, policy: 'private' },
];
const NPC_LINES = ['ここに木の実がありますよ！', '巣の場所を探してます', 'いい風だね', '夜になると種が増えるらしい', 'ぴょん！', 'オアシスの水はつめたい'];
const NPC_REPLY = [[/こんにち|やあ|はじめ|hello|hi/i, 'こんにちは！'], [/ありがと/, 'どういたしまして'], [/巣|すみか/, 'モカの巣は だれでも遊びに来ていいよ'], [/種|たね/, '低木のまわりに よく落ちてるよ']];

/** モカの巣（見学用）。ルールどおりの操作だけで作る */
function buildNpcNest(seed) {
  let d = createNest({ seed, entranceX: 10 });
  const ops = [
    { op: 'set-kind', id: d.rooms[0].id, kind: 'bed' },
    { op: 'tunnel', x: 14, y: 9, len: 6, dir: 'h' },
    { op: 'room', x: 20, y: 7, w: 7, h: 4, kind: 'store' },
    { op: 'place', type: 'lamp', x: 22, y: 7 },
    { op: 'place', type: 'seed_pile', x: 20, y: 10 },
    { op: 'tunnel', x: 23, y: 11, len: 4, dir: 'v' },
    { op: 'room', x: 19, y: 15, w: 9, h: 3, kind: 'plain' },
    { op: 'place', type: 'rug', x: 21, y: 17 }, { op: 'place', type: 'dried_flower', x: 24, y: 17 },
    { op: 'place', type: 'lamp', x: 25, y: 15 }, { op: 'place', type: 'shelf', x: 26, y: 16 },
  ];
  for (const op of ops) { const r = tryOp(d, op); if (r.ok) d = r.data; }
  return d;
}

export class OfflineBackend extends Emitter {
  constructor({ storage = globalThis.localStorage, now = () => Date.now(), npc = true, map = null } = {}) {
    super();
    this.mode = 'offline';
    this.storage = storage;
    this.now = now;
    this.map = map || buildFieldMap();
    this.spawnPts = resourceSpawnPoints(this.map);
    this.npcOn = npc;
    this.save = this._read();
    this.auth = null;          // 確定した自分の地上の状態
    this.ack = 0;
    this.snapT = 0; this.saveT = 0; this.npcChatT = 30 + Math.random() * 30;
    this.npcs = [];
    this.npcNests = {};
    this.place = 'none';
  }
  _read() {
    try {
      const raw = this.storage && this.storage.getItem(SAVE_KEY);
      if (!raw) return null;
      return this._migrate(JSON.parse(raw));
    } catch (e) { console.warn('[tobi] セーブを読めない', e); return null; }
  }
  _migrate(s) {
    if (!s || typeof s !== 'object') return null;
    if (!s.v) s.v = 1;
    if (s.player) s.player.inv = normalizeInventory(s.player.inv);
    for (const id in s.nests || {}) {
      const n = s.nests[id];
      n.data = migrateNest(n.data);     // 巣データの版の移行（v0 → v1 …）
      n.storage = normalizeInventory(n.storage, STORAGE_SLOTS);
    }
    return s;
  }
  flush() {
    if (!this.storage || !this.save) return;
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { console.warn('[tobi] 保存できない', e); }
  }
  /** トビネズミの保存だけ消す（tobi_ で始まる鍵だけ） */
  resetAll() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) { const k = this.storage.key(i); if (k && k.startsWith('tobi_')) keys.push(k); }
    for (const k of keys) this.storage.removeItem(k);
    this.save = null;
  }
  serverTime() { return this.now(); }

  async hello() { return { ok: true, mode: 'offline', account: this.save ? this.save.account : null, character: this.save ? this.save.character : null }; }
  async register(username) { return this._local(username); }
  async login(username) { return this._local(username); }
  async _local(username) {
    if (!this.save) this.save = { v: SAVE_VERSION, account: { id: 'local', username: username || 'local', createdAt: this.now() }, character: null, player: null, nests: {}, entrances: [], world: null };
    this.flush();
    return { ok: true, account: this.save.account, character: this.save.character };
  }
  async logout() { this.flush(); this.place = 'none'; return { ok: true }; }

  async createCharacter({ name, fur }) {
    if (!this.save) await this._local('local');
    const e = validName(name);
    if (e) return { ok: false, reason: e };
    if (!FUR_IDS.includes(fur)) return { ok: false, reason: '毛色が変' };
    const ch = { id: 'c1', name: String(name).trim(), fur, createdAt: this.now(),
      individual: { species: 'jerboa', sex: null, generation: 1, father_id: null, mother_id: null, genes: { fur }, traits: {}, status: {} } };
    this.save.character = ch;
    this.save.player = { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down', inv: makeInventory(undefined, START_INVENTORY), nestId: null, place: 'field', savedAt: this.now() };
    this.flush();
    return { ok: true, character: ch };
  }

  _ensureWorld() {
    const s = this.save;
    if (!s.world) s.world = { resources: initialResources(this.map), respawns: [], nextId: 1000 };
    if (!s.entrances) s.entrances = [];
    if (!s.nests) s.nests = {};
  }
  _entrances() {
    const npcE = this.npcOn ? NPCS.map(n => ({ owner: n.id, name: n.name, nestId: 'n_' + n.id, x: n.home.x, y: n.home.y - 20, own: false, policy: n.policy })) : [];
    const mine = this.save.entrances.map(e => ({ ...e, own: e.owner === this.save.account.id, policy: (this.save.nests[e.nestId] || {}).policy || 'private' }));
    return [...mine, ...npcE];
  }

  async joinField() {
    if (!this.save || !this.save.character) return { ok: false, reason: 'キャラクターが無い' };
    this._ensureWorld();
    const p = this.save.player;
    this.auth = makeFieldState(p.x, p.y);
    this.auth.dir = p.dir || 'down';
    this.ack = 0;
    this.place = 'field';
    p.place = 'field';
    if (this.npcOn && !this.npcs.length) {
      this.npcs = NPCS.map((n, i) => ({ ...n, st: makeFieldState(n.home.x + 10, n.home.y + 6), brain: { t: 1 + i, mx: 0, my: 0, jump: false } }));
    }
    const me = this.save.character;
    const nest = p.nestId ? this.save.entrances.find(e => e.nestId === p.nestId) : null;
    return { ok: true, world: {
      serverTime: this.now(),
      you: { id: this.save.account.id, name: me.name, fur: me.fur, x: p.x, y: p.y, dir: p.dir || 'down', inv: p.inv, nest: nest ? { id: nest.nestId, x: nest.x, y: nest.y } : null },
      resources: this.save.world.resources.map(r => ({ ...r })),
      players: this.npcs.map(n => ({ id: n.id, name: n.name, fur: n.fur, x: n.st.x, y: n.st.y, dir: n.st.dir })),
      entrances: this._entrances(),
    } };
  }

  sendInput(inp) {
    if (this.place !== 'field' || !this.auth) return;
    this.auth = stepField(this.auth, inp, STEP_DT, this.map);
    this.ack = inp.seq;
  }

  tick(dt) {
    if (!this.save || this.place === 'none') return;
    const now = this.now();
    // 採集物の再出現
    const w = this.save.world;
    if (w && w.respawns.length) {
      const due = w.respawns.filter(r => r.at <= now);
      if (due.length) {
        w.respawns = w.respawns.filter(r => r.at > now);
        for (const d of due) {
          const pt = pickRespawnPoint(this.spawnPts, d.kind, w.resources, Math.random);
          if (!pt) continue;
          const res = { id: 'r' + (w.nextId++), kind: d.kind, x: pt.x, y: pt.y };
          w.resources.push(res);
          this.emit('res_spawn', { res });
        }
        this.flush();
      }
    }
    if (this.place !== 'field') return;
    // NPC
    for (const n of this.npcs) {
      const b = n.brain;
      b.t -= dt;
      if (b.t <= 0) {
        const r = Math.random();
        if (r < 0.4) { b.mx = 0; b.my = 0; b.t = 1 + Math.random() * 2.5; }
        else {
          // 家の近くへ戻りがち
          const hx = n.home.x - n.st.x, hy = n.home.y - n.st.y, far = Math.hypot(hx, hy) > 6 * TILE;
          b.mx = far ? Math.sign(Math.round(hx / 40)) : Math.floor(Math.random() * 3) - 1;
          b.my = far ? Math.sign(Math.round(hy / 40)) : Math.floor(Math.random() * 3) - 1;
          b.t = 0.6 + Math.random() * 1.6;
        }
        b.jump = Math.random() < 0.18;
      }
      const steps = Math.max(1, Math.round(dt / STEP_DT));
      for (let i = 0; i < steps && i < 4; i++) { n.st = stepField(n.st, { mx: b.mx, my: b.my, jump: b.jump && i === 0 }, STEP_DT, this.map); }
      b.jump = false;
    }
    this.npcChatT -= dt;
    if (this.npcOn && this.npcs.length && this.npcChatT <= 0) {
      this.npcChatT = 45 + Math.random() * 40;
      const n = this.npcs[Math.floor(Math.random() * this.npcs.length)];
      this.emit('chat', { from: n.id, name: n.name, text: NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)], where: 'field', at: now });
    }
    // スナップショット（10Hz）
    this.snapT -= dt;
    if (this.snapT <= 0) {
      this.snapT = 1 / SNAPSHOT_HZ;
      this.emit('snapshot', { st: now, ack: this.ack, you: this.auth ? { ...this.auth } : null,
        players: this.npcs.map(n => ({ id: n.id, x: n.st.x, y: n.st.y, z: n.st.z, dir: n.st.dir, anim: n.st.anim, jump: n.st.jump ? { ...n.st.jump } : null })) });
    }
    // 位置の保存（30 秒ごと）
    this.saveT += dt * 1000;
    if (this.saveT >= POS_SAVE_MS) { this.saveT = 0; this._savePos(); }
  }
  _savePos() {
    if (!this.auth || !this.save || !this.save.player) return;
    const p = this.save.player;
    p.x = Math.round(this.auth.x * 10) / 10; p.y = Math.round(this.auth.y * 10) / 10; p.dir = this.auth.dir; p.savedAt = this.now();
    this.flush();
  }
  savePosition() { this._savePos(); }

  async pickup(resId) {
    const w = this.save.world, p = this.save.player;
    const i = w.resources.findIndex(r => r.id === resId);
    if (i < 0) return { ok: false, reason: 'もう無い' };
    const r = w.resources[i];
    if (!this.auth || Math.hypot(r.x - this.auth.x, r.y - this.auth.y) > PICK_RANGE) return { ok: false, reason: '遠すぎる' };
    if (!canAdd(p.inv, r.kind, 1)) return { ok: false, reason: '持ち物がいっぱい' };
    w.resources.splice(i, 1);
    addItem(p.inv, r.kind, 1);
    w.respawns.push({ kind: r.kind, at: this.now() + (RESPAWN_MIN + Math.random() * (RESPAWN_MAX - RESPAWN_MIN)) * 1000 });
    this.flush();
    this.emit('res_gone', { id: resId, by: this.save.account.id });
    return { ok: true, item: r.kind, inv: p.inv.map(s => s && { ...s }) };
  }

  async digBurrow() {
    const p = this.save.player;
    if (p.nestId) return { ok: false, reason: 'もう巣がある' };
    const chk = canDigBurrow(this.map, this.auth.x, this.auth.y, this._entrances());
    if (!chk.ok) return chk;
    const nestId = 'n_' + this.save.account.id;
    const seed = Math.floor(hash2(chk.x, chk.y, 7) * 1e9);
    this.save.nests[nestId] = { id: nestId, owner: this.save.account.id, ownerName: this.save.character.name, rev: 1, data: createNest({ seed }), storage: makeInventory(STORAGE_SLOTS), policy: 'private' };
    const ent = { owner: this.save.account.id, name: this.save.character.name, nestId, x: chk.x, y: chk.y };
    this.save.entrances.push(ent);
    p.nestId = nestId;
    this.flush();
    const out = { ...ent, own: true, policy: 'private' };
    this.emit('entrance', { entrance: out });
    return { ok: true, entrance: out };
  }

  _nestRec(nestId) {
    if (this.save.nests[nestId]) return this.save.nests[nestId];
    const npc = NPCS.find(n => 'n_' + n.id === nestId);
    if (!npc) return null;
    if (!this.npcNests[nestId]) this.npcNests[nestId] = { id: nestId, owner: npc.id, ownerName: npc.name, rev: 1, data: buildNpcNest(77 + npc.name.length), storage: makeInventory(STORAGE_SLOTS, [{ id: 'seed', n: 40 }, { id: 'grass', n: 22 }]), policy: npc.policy };
    return this.npcNests[nestId];
  }
  _nestOut(rec) {
    const own = rec.owner === this.save.account.id;
    return { id: rec.id, owner: rec.owner, ownerName: rec.ownerName, rev: rec.rev, data: rec.data, storage: rec.storage.map(s => s && { ...s }), policy: rec.policy, canEdit: own, own };
  }

  async enterNest(owner) {
    const ent = this._entrances().find(e => e.owner === owner);
    if (!ent) return { ok: false, reason: '巣が無い' };
    if (this.auth && Math.hypot(ent.x - this.auth.x, ent.y - this.auth.y) > ENTER_RANGE) return { ok: false, reason: '入口から遠い' };
    const rec = this._nestRec(ent.nestId);
    if (!rec) return { ok: false, reason: '巣が無い' };
    const own = rec.owner === this.save.account.id;
    if (!own && rec.policy !== 'public') return { ok: false, reason: (rec.ownerName || '') + 'の巣は 今は入れないようだ' };
    this._savePos();
    this.place = 'nest';
    this.curNestId = ent.nestId;
    this.save.player.place = 'nest';
    this.flush();
    return { ok: true, nest: this._nestOut(rec) };
  }
  async leaveNest() {
    const ent = this._entrances().find(e => e.nestId === this.curNestId) || null;
    this.place = 'field';
    const p = this.save.player;
    if (ent) { p.x = ent.x; p.y = ent.y + 12; }
    this.auth = makeFieldState(p.x, p.y);
    p.place = 'field';
    this.flush();
    return { ok: true, x: p.x, y: p.y };
  }
  set curNestId(v) { this._curNest = v; }
  get curNestId() { return this._curNest; }

  async nestOp(nestId, rev, op) {
    const rec = this.save.nests[nestId];
    if (!rec) return { ok: false, reason: '巣が無い', code: 'not_found' };
    if (rec.owner !== this.save.account.id) return { ok: false, reason: '自分の巣ではない', code: 'forbidden' };
    if (rev !== rec.rev) return { ok: false, reason: '巣が更新された。もう一度', code: 'stale_rev', rev: rec.rev, data: rec.data };
    const inv = this.save.player.inv;
    const r = tryOp(rec.data, op, inv);
    if (!r.ok) return { ok: false, reason: r.reason, code: 'rule' };
    payCost(inv, r.cost);
    const back = refund(inv, r.refund);
    rec.data = r.data;
    rec.rev++;
    this.flush();
    this.emit('nest_update', { nestId, rev: rec.rev, op, data: rec.data });
    return { ok: true, rev: rec.rev, data: rec.data, inv: inv.map(s => s && { ...s }), created: r.created, cost: r.cost, refund: back };
  }

  async store(nestId, dir, item, n = 1) {
    const rec = this.save.nests[nestId];
    if (!rec || rec.owner !== this.save.account.id) return { ok: false, reason: '自分の巣の倉庫ではない' };
    if (!rec.data.rooms.some(r => r.kind === 'store')) return { ok: false, reason: '倉庫が無い' };
    if (!ITEMS[item] || !(n > 0)) return { ok: false, reason: '預けられない' };
    const inv = this.save.player.inv;
    const [from, to] = dir === 'deposit' ? [inv, rec.storage] : [rec.storage, inv];
    const k = Math.min(n, countItem(from, item));
    if (k <= 0) return { ok: false, reason: dir === 'deposit' ? '持っていない' : '倉庫に無い' };
    if (!canAdd(to, item, k)) return { ok: false, reason: 'いっぱいで入らない' };
    removeItem(from, item, k); addItem(to, item, k);
    this.flush();
    return { ok: true, moved: k, inv: inv.map(s => s && { ...s }), storage: rec.storage.map(s => s && { ...s }) };
  }

  async chat(text) {
    const t = cleanChat(text);
    if (!t) return { ok: false };
    const me = this.save.character;
    this.emit('chat', { from: this.save.account.id, name: me.name, text: t, where: this.place, at: this.now() });   // 自分の発言はそのまま返す（ローカルエコー）
    if (this.npcOn && this.place === 'field') {
      const hit = NPC_REPLY.find(([re]) => re.test(t));
      if (hit) setTimeout(() => { const n = this.npcs[Math.floor(Math.random() * this.npcs.length)]; if (n) this.emit('chat', { from: n.id, name: n.name, text: hit[1], where: 'field', at: this.now() }); }, 900);
    }
    return { ok: true };
  }
  async setVisitPolicy(policy) {
    const p = this.save.player;
    const rec = p.nestId && this.save.nests[p.nestId];
    if (!rec) return { ok: false, reason: '巣が無い' };
    rec.policy = policy; this.flush();
    return { ok: true };
  }
  nestMove() { /* オフラインでは見る人がいない */ }
  kindCost(kind) { return KIND_COST[kind]; }
}

// ───────── オンライン（サーバー担当と合わせる・PROTOCOL.md）─────────
// ★ 未検証のひな形：サーバーはまだ無い。メッセージの形は shared/protocol.js と docs/PROTOCOL.md のとおり。
export class OnlineBackend extends Emitter {
  constructor(url, { storage = globalThis.localStorage } = {}) {
    super();
    this.mode = 'online';
    this.url = url;
    this.storage = storage;
    this.ws = null; this.rid = 0; this.waiting = new Map();
    this.queue = []; this.sendT = 0;
    this.backoff = 500; this.closedByUser = false; this.place = 'none';
    this.clockOffset = 0;
    this.map = buildFieldMap();
  }
  serverTime() { return Date.now() + this.clockOffset; }
  connect(timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      let done = false;
      let ws;
      try { ws = new WebSocket(this.url); } catch (e) { reject(e); return; }
      this.ws = ws;
      const t = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} reject(new Error('timeout')); } }, timeoutMs);
      ws.onopen = () => { if (done) return; done = true; clearTimeout(t); this.backoff = 500; this.emit('status', { state: 'online' }); resolve(this); };
      ws.onerror = () => { if (!done) { done = true; clearTimeout(t); reject(new Error('ws error')); } };
      ws.onclose = () => { this._closed(); };
      ws.onmessage = ev => this._msg(decode(ev.data));
    });
  }
  _closed() {
    for (const [, w] of this.waiting) w.reject(new Error('切断'));
    this.waiting.clear();
    if (this.closedByUser) return;
    this.emit('status', { state: 'reconnecting' });
    const wait = this.backoff; this.backoff = Math.min(30000, this.backoff * 2);   // 指数バックオフ
    setTimeout(async () => {
      try {
        await this.connect();
        const h = await this.hello();
        if (h.ok && this.place === 'field') { const j = await this.joinField(); if (j.ok) this.emit('rejoin', j.world); }
        this.emit('status', { state: 'online' });
      } catch (e) { this._closed(); }
    }, wait);
  }
  _send(msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(encode(msg)); }
  _req(t, payload = {}, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const rid = ++this.rid;
      const timer = setTimeout(() => { this.waiting.delete(rid); resolve({ ok: false, reason: '返事が無い' }); }, timeoutMs);
      this.waiting.set(rid, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); resolve({ ok: false, reason: e.message }); } });
      this._send({ t, rid, ...payload });
    });
  }
  _msg(m) {
    if (!m) return;
    if (m.t === S2C.RES) { const w = this.waiting.get(m.rid); if (w) { this.waiting.delete(m.rid); w.resolve(m); } return; }
    if (m.t === S2C.WELCOME) { if (m.serverTime) this.clockOffset = m.serverTime - Date.now(); return; }
    if (m.t === S2C.PONG) { this.clockOffset = m.st - (m.ct + Date.now()) / 2; return; }
    const map = { [S2C.SNAPSHOT]: 'snapshot', [S2C.PLAYER_JOIN]: 'player_join', [S2C.PLAYER_LEAVE]: 'player_leave', [S2C.CHAT]: 'chat', [S2C.RES_GONE]: 'res_gone', [S2C.RES_SPAWN]: 'res_spawn', [S2C.NEST_UPDATE]: 'nest_update', [S2C.NEST_PEERS]: 'nest_peers', [S2C.ENTRANCE]: 'entrance', [S2C.TOAST]: 'toast', [S2C.KICK]: 'kick' };
    if (map[m.t]) this.emit(map[m.t], m);
  }
  _token() { try { return this.storage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  _setToken(t) { try { if (t) this.storage.setItem(TOKEN_KEY, t); else this.storage.removeItem(TOKEN_KEY); } catch (e) {} }

  async hello() { const r = await this._req(C2S.HELLO, { v: PROTOCOL_VERSION, token: this._token() }); return { mode: 'online', ...r }; }
  async register(username, password) {
    const e = validUsername(username) || validPassword(password);
    if (e) return { ok: false, reason: e };
    const r = await this._req(C2S.REGISTER, { username, password });
    if (r.ok) this._setToken(r.token);
    return r;
  }
  async login(username, password) {
    const r = await this._req(C2S.LOGIN, { username, password });
    if (r.ok) this._setToken(r.token);
    return r;
  }
  async logout() { await this._req(C2S.LOGOUT); this._setToken(null); this.place = 'none'; return { ok: true }; }
  async createCharacter({ name, fur }) { const e = validName(name); if (e) return { ok: false, reason: e }; return this._req(C2S.CREATE_CHAR, { name, fur }); }
  async joinField() { const r = await this._req(C2S.JOIN_FIELD); if (r.ok) this.place = 'field'; return r; }
  sendInput(inp) { this.queue.push({ seq: inp.seq, mx: inp.mx, my: inp.my, jump: inp.jump ? 1 : 0 }); }
  tick(dt) {
    this.sendT += dt * 1000;
    if (this.sendT >= INPUT_SEND_MS && this.queue.length) { this.sendT = 0; this._send({ t: C2S.INPUT, inputs: this.queue.splice(0) }); }
  }
  async pickup(resId) { return this._req(C2S.PICKUP, { resId }); }
  async digBurrow(x, y) { return this._req(C2S.DIG_BURROW, { x, y }); }
  async enterNest(owner) { const r = await this._req(C2S.ENTER_NEST, { owner }); if (r.ok) this.place = 'nest'; return r; }
  async leaveNest() { const r = await this._req(C2S.LEAVE_NEST); if (r.ok) this.place = 'field'; return r; }
  async nestOp(nestId, rev, op) { return this._req(C2S.NEST_OP, { nestId, rev, op }); }
  async store(nestId, dir, item, n) { return this._req(C2S.STORE, { nestId, dir, item, n }); }
  async chat(text) { const t = cleanChat(text); if (!t) return { ok: false }; this._send({ t: C2S.CHAT, text: t }); return { ok: true }; }
  async setVisitPolicy(policy, list) { return this._req(C2S.VISIT_POLICY, { policy, list }); }
  nestMove(st) { this._send({ t: C2S.NEST_MOVE, x: Math.round(st.x), y: Math.round(st.y), facing: st.facing, anim: st.anim }); }
  savePosition() {}
  flush() {}
  close() { this.closedByUser = true; try { this.ws && this.ws.close(); } catch (e) {} }
}

// ───────── どちらを使うか ─────────
/**
 * ?offline=1 → オフライン。?server=ws://… → そこへ接続。
 * それ以外は tobi-server.json（Node サーバーが配る {ws:"/ws"} など）を探し、あればオンライン。
 * GitHub Pages では見つからないのでオフライン。オンラインにつながらなければオフラインへ戻る。
 */
export async function chooseBackend({ search = (globalThis.location && location.search) || '', storage = globalThis.localStorage } = {}) {
  const q = new URLSearchParams(search);
  if (q.get('offline') === '1') return new OfflineBackend({ storage });
  let url = q.get('server');
  if (!url) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 1200);
      const r = await fetch('tobi-server.json', { cache: 'no-store', signal: ctl.signal });
      clearTimeout(t);
      if (r.ok) { const j = await r.json(); url = j && j.ws; }
    } catch (e) { url = null; }
  }
  if (url) {
    if (url.startsWith('/')) url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + url;
    const on = new OnlineBackend(url, { storage });
    try { await on.connect(); return on; }
    catch (e) { const off = new OfflineBackend({ storage }); off.fallbackFrom = url; return off; }
  }
  return new OfflineBackend({ storage });
}
