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
//   Ver.0.2「暮らし」：
//   await net.eat('inv'|'pile') / net.drink(resId?) / net.sleep() / net.wake()   → {ok, life, …}
//   await net.friends() / net.friendRequest(name) / net.friendAccept(id) / net.friendRemove(id) → {ok, list}
//   await net.setBuilders([name]) / net.visitors()
//   net.clock（世界の時計：shared/daynight.js）・net.on('life'|'friends'|'visit'|'nest_role'|'clock', fn)
//   Ver.0.3「危険と土地」：
//   snapshot に preds（捕食者）。net.on('caught'|'raid', fn)。await net.survey() / net.relocate() / net.plug(on) / net.dev({weather, season, spawn})
//   オフラインだけ：net.setDanger('normal'|'easy'|'off')（捕食者の強さ）
//   Ver.0.4「いのちをつなぐ」：
//   snapshot に wild（野生のトビネズミ）・wt（信頼）。net.on('family'|'player_update'|'wild', fn)
//   await net.court(wildId) / net.family() / net.namePups([{id,name}]) / net.feedPup(id) / net.mateAgain() / net.kidsFollow(on)
//   await net.lineage() / net.succeed(id) / net.farewell()
//
// オフラインの保存は localStorage の 'tobi_' で始まる鍵だけ（本編 dannoura_* ・境界事象 kyokai_* には触れない）。
import { C2S, S2C, encode, decode, cleanChat, validName, validUsername, validPassword, FUR_IDS, INPUT_SEND_MS, INTERP_DELAY_MS, SNAPSHOT_HZ, POS_SAVE_MS, PROTOCOL_VERSION } from '../shared/protocol.js';
import { buildFieldMap, initialResources, resourceSpawnPoints, pickRespawnPoint, canDigBurrow, nightSpawnPoints, nearWater, RESPAWN_MIN, RESPAWN_MAX, TILE } from '../shared/regions.js';
import { stepField, makeFieldState, STEP_DT } from '../shared/move.js';
import { createNest, migrateNest, tryOp, KIND_COST, objectsWithFixtures, CELL } from '../shared/nest-rules.js';
import { makeLife, normalizeLife, stepLife, lifeOut, moveMods, eatSeed, drink, canEat, canDrink, LIFE } from '../shared/life.js';
import { makeClock, dayPhase, periodOf, respawnScale, NIGHT_EXTRA, NIGHT_SPAWN_MS } from '../shared/daynight.js';
import { swapSlots, makeInventory, normalizeInventory, addItem, removeItem, canAdd, payCost, refund, countItem, START_INVENTORY, STORAGE_SLOTS, ITEMS } from '../shared/items.js';
import { hash2 } from '../shared/rng.js';
import { eatRareSeed, caughtLife } from '../shared/life.js';
import { PredatorWorld, PRED_DT, PRED, playerView, stillTime, TUNING, INVULN_MS, dropItems, dropSpots, safePoint, raidLoss, RAID_COOLDOWN_MS, DROP_TTL_MS } from '../shared/predators.js';
import { envAt, fieldMods, ENV, WEATHERS, SEASONS } from '../shared/season.js';
import { landAt, landOut, digCost, digTime, relocateCost, RELOCATE_COOLDOWN_MS, RELOCATE_MIN_DIST, buildLands, plotAt } from '../shared/lands.js';
import { PLUG_COST, SEXES } from '../shared/protocol.js';
import { Household } from '../shared/household.js';
import { founderInd, indOut, courtBlock, stageOf, ageDays, STAGE, FOUNDER_AGE_DAYS } from '../shared/family.js';
import { traitMoveMods, traitMods, lookOf, seedOf } from '../shared/genetics.js';
import { WildWorld, WILD, WILD_DT, devWildGenes } from '../shared/wild.js';
import { lifeEnvWithTraits } from '../shared/life.js';
import { DAY_MS } from '../shared/daynight.js';

export const SAVE_KEY = 'tobi_save_v1';
export const SETTINGS_KEY = 'tobi_settings';
export const TOKEN_KEY = 'tobi_token';
export const SAVE_VERSION = 4;   // v2（Ver.0.2）：player.life・friends・visits・lastPlayed。v3（Ver.0.3）：nests[].plugged・land・relocatedAt・raidedAt、events（襲撃）。
                                 // v4（Ver.0.4）：house（操作個体の年齢・遺伝子・巣の家族・お産の予定）・lineage（ご先祖・巣立った子）・nextInd。鍵の名前（tobi_save_v1）はそのまま
const NO_RESPAWN = new Set(['n', 'x', 'g', 'w', 'd']);
const RARE_MIN = 8 * 60, RARE_MAX = 12 * 60;
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
export const NPCS = [
  { id: 'npc_nuts', name: 'ナッツ', fur: 'rufous',  home: { x: 30 * TILE + 8, y: 40 * TILE + 8 }, policy: 'private' },
  { id: 'npc_moka', name: 'モカ',   fur: 'cream', home: { x: 56 * TILE + 8, y: 24 * TILE + 8 }, policy: 'public' },
  { id: 'npc_riko', name: 'リコ',   fur: 'graybrown',  home: { x: 66 * TILE + 8, y: 38 * TILE + 8 }, policy: 'friends' },   // フレンドになると入れる
];
export const NPC_VISIT_MIN_S = 240, NPC_VISIT_MAX_S = 420;   // NPC のフレンドが巣を訪ねてくる間隔（世界の時間・秒）
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
  /**
   * timeScale・startHour：動作確認用の早回し（?timescale=60&hour=22。オフラインだけ）
   * Ver.0.3：env（天気・季節・気候の影響）・predators（'normal'|'easy'|'off'）・weather / season（固定：?weather=rain&season=winter）・predSeed
   *   どれも指定しなければ切ってある（テスト用の既定）。ゲームは chooseBackend が設定から入れる
   */
  constructor({ storage = globalThis.localStorage, now = () => Date.now(), npc = true, map = null, timeScale = 1, startHour = null, random = Math.random,
    env = false, predators = 'off', weather = null, season = null, predSeed = null, relocateCooldownMs = RELOCATE_COOLDOWN_MS, wild = true, wildSeed = null } = {}) {
    super();
    this.mode = 'offline';
    this.storage = storage;
    this.now = now;
    this.random = random;
    this.clock = makeClock({ scale: timeScale, startHour, now: now() });
    if (weather && WEATHERS[weather]) this.clock.weather = weather;
    if (season && SEASONS.some(x => x.id === season)) this.clock.season = season;
    this.envOn = !!env;
    this.setDanger(predators, false);
    this.relocateCooldownMs = relocateCooldownMs;
    this.preds = new PredatorWorld({ map: map || buildFieldMap(), seed: predSeed != null ? predSeed : Math.floor(random() * 4294967296) });
    this.predAcc = 0; this.stillT = 0; this.invulnUntil = 0; this.puddleT = 0; this.rareT = new Map(); this.expireT = 0; this.moveEnvT = 0; this.moveEnv = null;
    this.nightPts = null; this.nightT = 0; this.lifeSendT = 0; this.visitT = null;
    this.map = map || this.preds.map;
    this.preds.map = this.map;
    this.spawnPts = resourceSpawnPoints(this.map);
    this.npcOn = npc;
    this.save = this._read();
    this.auth = null;          // 確定した自分の地上の状態
    this.ack = 0;
    this.snapT = 0; this.saveT = 0; this.npcChatT = 30 + Math.random() * 30;
    this.npcs = [];
    this.npcNests = {};
    this.place = 'none';
    // Ver.0.4：野生のトビネズミ（なかよくなる相手）。wild=false で出さない
    this.wildOn = wild !== false;
    this.wild = new WildWorld({ map: this.map, seed: wildSeed != null ? wildSeed : Math.floor(random() * 4294967296) });
    this.wildAcc = 0; this.famSendT = 0; this.hh = null;
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
    if (s.v < 2) {   // v1 → v2（Ver.0.2「暮らし」）：暮らしの数値・フレンド・訪問の記録を足す（持ち物・巣はそのまま）
      if (s.player && !s.player.life) s.player.life = makeLife();
      if (!Array.isArray(s.friends)) s.friends = [];
      if (!Array.isArray(s.visits)) s.visits = [];
      s.v = 2;
    }
    if (s.v < 3) {   // v2 → v3（Ver.0.3「危険と土地」）：巣に入口のふさぎ・土地・引っ越し・襲撃の時刻、巣の出来事（襲撃）の記録
      for (const id in s.nests || {}) {
        const n = s.nests[id], e = (s.entrances || []).find(x => x.nestId === id);
        if (n.plugged == null) n.plugged = false;
        if (!n.land && e) n.land = landOut(landAt(this.map, e.x, e.y));
        n.relocatedAt = n.relocatedAt || 0; n.raidedAt = n.raidedAt || 0;
      }
      if (!Array.isArray(s.events)) s.events = [];
      s.v = 3;
    }
    if (s.v < 4) {   // v3 → v4（Ver.0.4「いのちをつなぐ」）：いまの子を 1 代目のおとな（4 日）にして、遺伝子・性・家族の入れ物を足す
      if (s.character) {
        const ch = s.character, seed = seedOf(ch.name, ch.createdAt || 0);
        const me = founderInd({ id: 1, name: ch.name, fur: ch.fur, sex: ch.individual && SEXES.includes(ch.individual.sex) ? ch.individual.sex : null, seed, bornAt: ch.createdAt || 0 });
        me.ageMs = STAGE.YOUNG_END * DAY_MS;
        s.house = new Household({ me, nestKey: 'n_' + ((s.account && s.account.id) || 'local') }).toJSON();
        ch.individual = { ...(ch.individual || {}), id: 1, sex: me.sex, generation: 1, genes: me.genes, traits: me.traits };
      }
      s.lineage = []; s.nextInd = 2;
      s.v = 4;
    }
    if (!Array.isArray(s.lineage)) s.lineage = [];
    if (!s.nextInd) s.nextInd = 2;
    if (!Array.isArray(s.events)) s.events = [];
    if (s.player) { s.player.inv = normalizeInventory(s.player.inv); s.player.life = normalizeLife(s.player.life); s.player.life.sleep = false; }
    if (!Array.isArray(s.friends)) s.friends = [];
    if (!Array.isArray(s.visits)) s.visits = [];
    for (const id in s.nests || {}) {
      const n = s.nests[id];
      n.data = migrateNest(n.data);     // 巣データの版の移行（v0 → v1 …）
      n.storage = normalizeInventory(n.storage, STORAGE_SLOTS);
    }
    return s;
  }
  flush() {
    if (!this.storage || !this.save) return;
    if (this.hh) this.save.house = this.hh.toJSON();
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch (e) { console.warn('[tobi] 保存できない', e); }
  }
  /** トビネズミの保存だけ消す（tobi_ で始まる鍵だけ） */
  resetAll() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) { const k = this.storage.key(i); if (k && k.startsWith('tobi_')) keys.push(k); }
    for (const k of keys) this.storage.removeItem(k);
    this.save = null; this.hh = null;
  }
  /** 家（操作個体・巣の家族・お産の予定）。Ver.0.4 */
  get house() {
    if (!this.hh && this.save && this.save.house && this.save.house.me) this.hh = new Household(this.save.house);
    return this.hh;
  }
  _newInd() { const id = this.save.nextInd || 2; this.save.nextInd = id + 1; return id; }
  _myLook() { const h = this.house; return h && h.me ? lookOf(h.me.traits) : null; }
  _kidsLook() { const h = this.house; return h ? h.followers().map(m => ({ id: m.id, name: m.name, look: lookOf(m.traits, { young: 1, ps: m.id % 97 }) })) : []; }
  _traitMove() { const h = this.house; return h && h.me ? traitMoveMods(h.me.traits) : null; }
  _seedsInStore() { const p = this.save.player, rec = p && p.nestId && this.save.nests[p.nestId]; return rec ? countItem(rec.storage, 'seed') : 0; }
  _familyOut() { const h = this.house; return h ? h.out() : null; }
  serverTime() { return this.now(); }

  async hello() { return { ok: true, mode: 'offline', account: this.save ? this.save.account : null, character: this.save ? this.save.character : null }; }
  async register(username) { return this._local(username); }
  async login(username) { return this._local(username); }
  async _local(username) {
    if (!this.save) this.save = { v: SAVE_VERSION, account: { id: 'local', username: username || 'local', createdAt: this.now() }, character: null, player: null, nests: {}, entrances: [], world: null, friends: [], visits: [], events: [] };
    this.flush();
    return { ok: true, account: this.save.account, character: this.save.character };
  }
  async logout() { this.flush(); this.place = 'none'; return { ok: true }; }

  async createCharacter({ name, fur, sex }) {
    if (!this.save) await this._local('local');
    const e = validName(name);
    if (e) return { ok: false, reason: e };
    if (!FUR_IDS.includes(fur)) return { ok: false, reason: '毛色が変' };
    const nm = String(name).trim(), at = this.now();
    const me = founderInd({ id: 1, name: nm, fur, sex: SEXES.includes(sex) ? sex : null, seed: seedOf(nm, at, Math.floor(this.random() * 1e9)), bornAt: at });
    const ch = { id: 'c1', name: nm, fur, createdAt: at,
      individual: { id: 1, species: 'jerboa', sex: me.sex, generation: 1, father_id: null, mother_id: null, genes: me.genes, traits: me.traits, status: {} } };
    this.save.character = ch;
    this.hh = new Household({ me, nestKey: 'n_' + this.save.account.id });
    this.save.house = this.hh.toJSON(); this.save.lineage = []; this.save.nextInd = 2;
    this.save.player = { x: this.map.spawn.x, y: this.map.spawn.y, dir: 'down', inv: makeInventory(undefined, START_INVENTORY), nestId: null, place: 'field', savedAt: this.now(), life: makeLife() };
    this.save.friends = []; this.save.visits = []; this.save.events = [];
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
    const mine = this.save.entrances.map(e => ({ ...e, own: e.owner === this.save.account.id, policy: (this.save.nests[e.nestId] || {}).policy || 'private', plugged: !!(this.save.nests[e.nestId] || {}).plugged }));
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
    if (!this.joinedOnce) { this.joinedOnce = true; this._awayVisits(); }
    const visitors = this.save.visits.filter(v => !v.seen).map(v => ({ name: v.name, at: v.at }));
    for (const v of this.save.visits) v.seen = true;
    const raids = this.save.events.filter(v => !v.seen).map(v => ({ kind: v.kind, lost: v.lost, at: v.at }));
    for (const v of this.save.events) v.seen = true;
    p.life.sleep = false; this.sleeping = false;
    this.stillT = 0;
    this.flush();
    const rec = nest && this.save.nests[nest.nestId];
    return { ok: true, world: {
      serverTime: this.now(),
      clock: { ...this.clock },
      life: lifeOut(p.life), friends: this._friendList(), visitors, raids,
      danger: { predators: this.tuning.enabled ? (this.tuning.easy ? 'easy' : 'normal') : 'off', env: this.envOn, relocateCooldownMs: this.relocateCooldownMs },
      family: this._familyOut(),
      you: { id: this.save.account.id, name: me.name, fur: me.fur, look: this._myLook(), kids: this._kidsLook(), x: p.x, y: p.y, dir: p.dir || 'down', inv: p.inv,
        nest: nest ? { id: nest.nestId, x: nest.x, y: nest.y, land: rec && rec.land, plugged: !!(rec && rec.plugged), relocatedAt: rec ? rec.relocatedAt || 0 : 0 } : null },
      resources: this.save.world.resources.map(r => ({ ...r })),
      players: this.npcs.map(n => ({ id: n.id, name: n.name, fur: n.fur, x: n.st.x, y: n.st.y, dir: n.st.dir })),
      entrances: this._entrances(),
    } };
  }

  sendInput(inp) {
    if (this.place !== 'field' || !this.auth) return;
    this.auth = stepField(this.auth, inp, STEP_DT, this.map, fieldMods(moveMods(this.save.player.life), this._moveEnv(), this._traitMove()));
    this.stillT = stillTime(this.stillT, this.auth, STEP_DT);
    this.ack = inp.seq;
  }
  /** 移動に効く天気（砂嵐）。0.25 秒ごとに作りなおす（クライアントの予測と同じ） */
  _moveEnv() {
    const t = this.now();
    if (!this.moveEnv || t >= this.moveEnvT) { this.moveEnvT = t + 250; this.moveEnv = envAt(this.clock, t, { enabled: this.envOn }); }
    return this.moveEnv;
  }
  env(place = this.place) {
    const a = this.auth || { x: 0, y: 0 };
    const pos = place === 'nest' ? (this._entrances().find(e => e.nestId === this.curNestId) || a) : a;
    return envAt(this.clock, this.now(), { map: this.map, x: pos.x, y: pos.y, place, entrances: this._entrances(), enabled: this.envOn });
  }

  tick(dt) {
    if (!this.save || this.place === 'none') return;
    const now = this.now();
    // 暮らしの数値（遊んでいる間だけ減る）・夜の採集物・NPC の訪問
    this._lifeTick(dt);
    if (now >= this.nightT) this.nightTick(now);
    if (this.place === 'field') this._npcVisitTick(dt);
    // Ver.0.3：雨の水たまり・希少資源・落とし物の期限・捕食者（1/20 秒刻み）
    if (now >= this.puddleT) this.weatherTick(now);
    if (now >= this.expireT) { this.expireT = now + 1000; this._expireTick(now); }
    if (this.place === 'field' && this.auth) {
      this.predAcc += dt;
      let n = 0;
      while (this.predAcc >= PRED_DT && n++ < 6) { this.predAcc -= PRED_DT; this._predStep(this.now()); if (this.wildOn) this._wildStep(); }
      if (n >= 6) this.predAcc = 0;
    }
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
        players: this.npcs.map(n => ({ id: n.id, x: n.st.x, y: n.st.y, z: n.st.z, dir: n.st.dir, anim: n.st.anim, jump: n.st.jump ? { ...n.st.jump } : null })), preds: this.preds.snapshot(),
        wild: this.wild.snapshot(), wt: this.wild.trustOf(this.save.account.id) });
    }
    // 位置の保存（30 秒ごと）
    this.saveT += dt * 1000;
    if (this.saveT >= POS_SAVE_MS) { this.saveT = 0; this._savePos(); }
  }
  _savePos() {
    if (!this.auth || !this.save || !this.save.player) return;
    const p = this.save.player;
    p.x = Math.round(this.auth.x * 10) / 10; p.y = Math.round(this.auth.y * 10) / 10; p.dir = this.auth.dir; p.savedAt = this.now();
    this.save.lastPlayed = this.now();
    this.flush();
  }
  savePosition() { this._savePos(); }

  async pickup(resId) {
    const w = this.save.world, p = this.save.player;
    const i = w.resources.findIndex(r => r.id === resId);
    if (i < 0) return { ok: false, reason: 'もう無い' };
    const r = w.resources[i];
    if (r.kind === 'dew' || r.kind === 'puddle') return { ok: false, reason: (r.kind === 'dew' ? '夜露' : '水たまり') + 'は拾えない（E で飲む）' };
    if (!this.auth || Math.hypot(r.x - this.auth.x, r.y - this.auth.y) > PICK_RANGE) return { ok: false, reason: '遠すぎる' };
    const qty = r.n > 1 ? r.n : 1;
    if (!canAdd(p.inv, r.kind, qty)) return { ok: false, reason: '持ち物がいっぱい' };
    w.resources.splice(i, 1);
    addItem(p.inv, r.kind, qty);
    // 戻るまでの待ちは時間帯・季節・天気で変わる（夜は早い・雨はよく育つ）。夜の種子・落とし物・希少資源は戻らない
    if (!NO_RESPAWN.has(r.id[0])) w.respawns.push({ kind: r.kind, at: this.now() + (RESPAWN_MIN + this.random() * (RESPAWN_MAX - RESPAWN_MIN)) * 1000 * respawnScale(this.phase()) * this.env('field').respawnMul / this.clock.scale });
    if (r.id[0] === 'g') this.rareT.set(plotAt(r.x, r.y).id, this.now() + (RARE_MIN + this.random() * (RARE_MAX - RARE_MIN)) * 1000 / this.clock.scale);
    this.flush();
    this.emit('res_gone', { id: resId, by: this.save.account.id });
    return { ok: true, item: r.kind, n: qty, inv: p.inv.map(s => s && { ...s }) };
  }

  async digBurrow() {
    const p = this.save.player;
    if (p.nestId) return { ok: false, reason: 'もう巣がある' };
    const chk = canDigBurrow(this.map, this.auth.x, this.auth.y, this._entrances());
    if (!chk.ok) return chk;
    const land = landAt(this.map, chk.x, chk.y), cost = digCost(land);
    if (!payCost(p.inv, cost)) return { ok: false, reason: '土が硬い。素材が足りない（' + costLabel(cost) + '）' };
    const nestId = 'n_' + this.save.account.id;
    const seed = Math.floor(hash2(chk.x, chk.y, 7) * 1e9);
    this.save.nests[nestId] = { id: nestId, owner: this.save.account.id, ownerName: this.save.character.name, rev: 1, data: createNest({ seed }), storage: makeInventory(STORAGE_SLOTS), policy: 'private',
      plugged: false, land: landOut(land), relocatedAt: 0, raidedAt: 0 };
    const ent = { owner: this.save.account.id, name: this.save.character.name, nestId, x: chk.x, y: chk.y };
    this.save.entrances.push(ent);
    p.nestId = nestId;
    this.flush();
    const out = { ...ent, own: true, policy: 'private', plugged: false };
    this.emit('entrance', { entrance: out });
    return { ok: true, entrance: out, inv: p.inv.map(s => s && { ...s }), cost, land: landOut(land), digTime: digTime(land) };
  }

  _nestRec(nestId) {
    if (this.save.nests[nestId]) return this.save.nests[nestId];
    const npc = NPCS.find(n => 'n_' + n.id === nestId);
    if (!npc) return null;
    if (!this.npcNests[nestId]) this.npcNests[nestId] = { id: nestId, owner: npc.id, ownerName: npc.name, rev: 1, data: buildNpcNest(77 + npc.name.length), storage: makeInventory(STORAGE_SLOTS, [{ id: 'seed', n: 40 }, { id: 'grass', n: 22 }]), policy: npc.policy, hostFur: npc.fur };
    return this.npcNests[nestId];
  }
  _nestOut(rec) {
    const own = rec.owner === this.save.account.id;
    return { id: rec.id, owner: rec.owner, ownerName: rec.ownerName, rev: rec.rev, data: rec.data, storage: rec.storage.map(s => s && { ...s }), policy: rec.policy, canEdit: own, own, role: own ? 'owner' : 'visitor', hostFur: rec.hostFur || null,
      plugged: !!rec.plugged, land: rec.land || null, ...(own ? { relocatedAt: rec.relocatedAt || 0, relocateCooldownMs: this.relocateCooldownMs } : {}),
      family: own && this.house ? this.house.publicOut() : [] };
  }

  async enterNest(owner) {
    const ent = this._entrances().find(e => e.owner === owner);
    if (!ent) return { ok: false, reason: '巣が無い' };
    if (this.auth && Math.hypot(ent.x - this.auth.x, ent.y - this.auth.y) > ENTER_RANGE) return { ok: false, reason: '入口から遠い' };
    const rec = this._nestRec(ent.nestId);
    if (!rec) return { ok: false, reason: '巣が無い' };
    const own = rec.owner === this.save.account.id;
    const friendOk = rec.policy === 'friends' && this._isFriend(rec.owner);
    if (!own && rec.policy !== 'public' && !friendOk) return { ok: false, reason: (rec.ownerName || '') + 'の巣は 今は入れないようだ' + (rec.policy === 'friends' ? '（フレンドだけ）' : '') };
    if (!own && rec.plugged) return { ok: false, reason: (rec.ownerName || '') + 'の巣は 入口がふさがれている' };
    this._savePos();
    this.sleeping = false; this.save.player.life.sleep = false; this.nestPos = null;
    this.place = 'nest';
    this.curNestId = ent.nestId;
    this.save.player.place = 'nest';
    const inv = own ? this._tryInvite(rec) : null;
    this.flush();
    return { ok: true, nest: this._nestOut(rec), ...(inv ? { invite: inv } : {}) };
  }
  async leaveNest() {
    const ent = this._entrances().find(e => e.nestId === this.curNestId) || null;
    this.sleeping = false; this.save.player.life.sleep = false;
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
    const rec = this._nestRec(nestId);
    if (!rec) return { ok: false, reason: '巣が無い', code: 'not_found' };
    if (rec.owner !== this.save.account.id) return { ok: false, reason: '自分の巣ではない（見学中は編集できない）', code: 'forbidden' };
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
  nestMove(st) { this.nestPos = { x: st.x, y: st.y }; if (this.sleeping && st.anim !== 'sleep') this._wake(); }   // 見る人はいない。寝床の判定にだけ使う
  async moveSlot(from, to) {
    const inv = this.save.player.inv;
    if (!swapSlots(inv, from, to)) return { ok: false };
    this.flush();
    return { ok: true, inv: inv.map(s => s && { ...s }) };
  }
  kindCost(kind) { return KIND_COST[kind]; }

  // ───────── 昼夜・暮らし（Ver.0.2）─────────
  phase() { return dayPhase(this.clock, this.now()); }
  get life() { return this.save && this.save.player ? this.save.player.life : null; }
  _lifeTick(dt) {
    const p = this.save.player;
    if (!p) return;
    const before = p.life;
    this.lifeEnvT = (this.lifeEnvT || 0) - dt;
    if (!this.lifeEnv || this.lifeEnvT <= 0) { this.lifeEnvT = 0.5; this.lifeEnv = this.env(); }
    const env = this.lifeEnv;
    const h = this.house;
    p.life = stepLife(before, dt * this.clock.scale, { sleeping: this.sleeping, env: lifeEnvWithTraits(env.life, h && h.me ? traitMods(h.me.traits) : null) });
    if (h) this._familyTick(dt, env);
    if (this.sleeping && !p.life.sleep) { this.sleeping = false; this.emit('life', { life: lifeOut(p.life) }); return; }   // 満タンで自然に起きる
    this.lifeSendT -= dt;
    if (this.lifeSendT <= 0) { this.lifeSendT = 0.5; this.emit('life', { life: lifeOut(p.life), ...(env.labels.length ? { env: env.labels } : {}), ...(env.rest && this.sleeping ? { rest: env.rest } : {}) }); }
  }
  /** 夜：夜露・夜の種子を足す。昼：夜露が乾く（サーバーの FieldRoom.nightTick と同じ） */
  nightTick(now = this.now()) {
    this.nightT = now + NIGHT_SPAWN_MS / this.clock.scale;
    const w = this.save && this.save.world;
    if (!w) return;
    if (!this.nightPts) this.nightPts = nightSpawnPoints(this.spawnPts);
    const period = periodOf(this.phase());
    if (period === 'night') {
      for (const kind of ['dew', 'seed']) {
        const prefix = kind === 'dew' ? 'd' : 'n';
        if (w.resources.filter(r => r.id[0] === prefix).length >= NIGHT_EXTRA[kind]) continue;
        const pt = pickRespawnPoint(this.nightPts, kind, w.resources, this.random);
        if (!pt) continue;
        const res = { id: prefix + (w.nextId++), kind, x: pt.x, y: pt.y };
        w.resources.push(res);
        this.emit('res_spawn', { res });
      }
    } else if (period === 'day') {
      const dew = w.resources.filter(r => r.kind === 'dew');
      if (dew.length) { w.resources = w.resources.filter(r => r.kind !== 'dew'); for (const r of dew) this.emit('res_gone', { id: r.id, by: 0 }); }
    }
  }
  async eat(from = 'inv', which = 'seed') {
    const p = this.save.player;
    if (this.sleeping) return { ok: false, reason: '眠っている' };
    if (!canEat(p.life)) return { ok: false, reason: 'おなかいっぱい' };
    if (from === 'pile') {
      const rec = this.curNestId && this.save.nests[this.curNestId];
      if (this.place !== 'nest' || !rec) return { ok: false, reason: '自分の巣の種の山だけ' };
      if (!this._nearObject(rec.data, 'seed_pile')) return { ok: false, reason: '種の山から遠い' };
      if (!removeItem(rec.storage, 'seed', 1)) return { ok: false, reason: '倉庫に種子が無い' };
      p.life = eatSeed(p.life); this.flush();
      return { ok: true, life: lifeOut(p.life), inv: p.inv.map(s => s && { ...s }), storage: rec.storage.map(s => s && { ...s }), src: 'pile' };
    }
    const item = which === 'rare_seed' ? 'rare_seed' : 'seed';
    if (!removeItem(p.inv, item, 1)) return { ok: false, reason: item === 'seed' ? '種子を持っていない' : '珍しい種を持っていない' };
    p.life = item === 'rare_seed' ? eatRareSeed(p.life) : eatSeed(p.life); this.flush();
    return { ok: true, life: lifeOut(p.life), inv: p.inv.map(s => s && { ...s }), left: countItem(p.inv, item), src: 'inv', item };
  }
  async drink(resId) {
    const p = this.save.player, w = this.save.world;
    if (this.place !== 'field' || !this.auth) return { ok: false, reason: '地上にいない' };
    if (!canDrink(p.life)) return { ok: false, reason: 'もうおなかいっぱい（水分は満タン）' };
    if (resId != null) {
      const i = w.resources.findIndex(r => r.id === resId && (r.kind === 'dew' || r.kind === 'puddle'));
      if (i < 0) return { ok: false, reason: 'もう乾いてしまった' };
      const r = w.resources[i];
      if (Math.hypot(r.x - this.auth.x, r.y - this.auth.y) > PICK_RANGE) return { ok: false, reason: '遠すぎる' };
      w.resources.splice(i, 1);
      p.life = drink(p.life, r.kind === 'puddle' ? ENV.PUDDLE_DRINK : LIFE.DEW_DRINK); this.flush();
      this.emit('res_gone', { id: resId, by: this.save.account.id });
      return { ok: true, life: lifeOut(p.life), src: r.kind };
    }
    if (!nearWater(this.map, this.auth.x, this.auth.y)) return { ok: false, reason: '近くに水が無い（オアシスのふちか、夜の夜露で）' };
    p.life = drink(p.life, LIFE.WATER_DRINK); this.flush();
    return { ok: true, life: lifeOut(p.life), src: 'water' };
  }
  _nearObject(data, type, slack = 12) {
    const pos = this.nestPos;
    if (!pos) return null;
    for (const o of objectsWithFixtures(data)) {
      if (o.type !== type) continue;
      const x0 = o.x * CELL - slack, x1 = (o.x + o.w) * CELL + slack, floor = (o.y + o.h) * CELL;
      if (pos.x >= x0 && pos.x <= x1 && Math.abs(pos.y - floor) <= 12) return o;
    }
    return null;
  }
  async sleep() {
    if (this.place !== 'nest') return { ok: false, reason: '巣の中でだけ眠れる' };
    const rec = this._nestRec(this.curNestId);
    if (!rec) return { ok: false, reason: '巣が無い' };
    if (rec.owner !== this.save.account.id && !this._isFriend(rec.owner)) return { ok: false, reason: 'よその寝床では眠れない（フレンドならだいじょうぶ）' };
    if (!this._nearObject(rec.data, 'nestbed')) return { ok: false, reason: '寝床の上で眠ろう' };
    this.sleeping = true; this.save.player.life.sleep = true;
    return { ok: true, life: lifeOut(this.save.player.life) };
  }
  _wake() { const was = this.sleeping; this.sleeping = false; if (this.save.player) this.save.player.life.sleep = false; if (was) this.flush(); }
  async wake() { this._wake(); return { ok: true, life: lifeOut(this.save.player.life) }; }

  // ───────── 危険と土地（Ver.0.3）─────────
  /** 捕食者の強さ（'normal' / 'easy' / 'off'）。オフラインの設定から */
  setDanger(mode, keep = true) {
    this.dangerMode = TUNING[mode] ? mode : 'off';
    this.tuning = { ...TUNING[this.dangerMode] };
    if (keep && this.preds && !this.tuning.enabled) this.preds.preds = [];
    return { ok: true, mode: this.dangerMode };
  }
  /** 逃げ込める入口（自分・公開・フレンドだけ＋フレンド）。ふさいだ入口は自分の巣だけ */
  _shelters() {
    return this._entrances().filter(e => e.own || (!e.plugged && (e.policy === 'public' || (e.policy === 'friends' && this._isFriend(e.owner)))));
  }
  _predStep(t) {
    const env = this._moveEnv();
    const me = playerView(this.save.account.id, this.auth, this.map, { still: this.stillT, shelters: this._shelters(), invuln: this.invulnUntil > t });
    const ents = [];
    if (this.tuning.raids) for (const e of this.save.entrances) {
      const rec = this.save.nests[e.nestId];
      if (!rec) continue;
      const home = this.place === 'nest' && this.curNestId === e.nestId;
      ents.push({ owner: e.owner, nestId: e.nestId, x: e.x, y: e.y, plugged: !!rec.plugged, raidable: !home && t - (rec.raidedAt || 0) >= RAID_COOLDOWN_MS / this.clock.scale, danger: rec.land ? rec.land.danger : 2 });
    }
    const ev = this.preds.step({ map: this.map, period: env.period, weather: env.weather, vis: env.vis, pred: env.pred, players: [me], entrances: ents, tuning: this.tuning }, PRED_DT);
    for (const e of ev) {
      if (e.type === 'catch' && e.target === this.save.account.id) this._caught(e);
      else if (e.type === 'raid') this._raid(e);
    }
    return ev;
  }
  _caught(e) {
    const p = this.save.player, t = this.now(), easy = !!this.tuning.easy;
    p.life = caughtLife(p.life, easy);
    const drops = dropItems(p.inv, easy);
    const spots = dropSpots(this.map, this.auth.x, this.auth.y, drops.length);
    const w = this.save.world, placed = [];
    drops.forEach((d, i) => { const r = { id: 'x' + (w.nextId++), kind: d.id, x: spots[i].x, y: spots[i].y, n: d.n, exp: Math.round(t + DROP_TTL_MS / this.clock.scale) }; w.resources.push(r); placed.push(r); });
    for (const r of placed) this.emit('res_spawn', { res: { ...r } });
    const own = this.save.entrances.find(x => x.owner === this.save.account.id);
    const sp = safePoint(this.map, own);
    this.auth = makeFieldState(sp.x, sp.y);
    this.stillT = 0;
    this.invulnUntil = t + INVULN_MS;
    p.x = sp.x; p.y = sp.y;
    this.caughtN = (this.caughtN || 0) + 1;
    this.flush();
    this.emit('caught', { kind: e.kind, name: PRED[e.kind].name, at: { x: Math.round(e.x), y: Math.round(e.y) }, x: sp.x, y: sp.y, life: lifeOut(p.life), inv: p.inv.map(s => s && { ...s }), drops: placed.map(r => ({ id: r.id, kind: r.kind, n: r.n })), until: this.invulnUntil });
    this.emit('life', { life: lifeOut(p.life) });
  }
  _raid(e) {
    const rec = this.save.nests[e.nestId];
    if (!rec) return null;
    let lost = 0;
    if (!e.blocked) { lost = raidLoss(countItem(rec.storage, 'seed')); if (lost) removeItem(rec.storage, 'seed', lost); }
    const kind = e.blocked ? 'blocked' : 'raid', at = this.now();
    rec.raidedAt = at;
    const seen = this.place !== 'none';
    this.save.events.push({ kind, lost, at, seen });
    if (this.save.events.length > 50) this.save.events.splice(0, this.save.events.length - 50);
    this.flush();
    this.emit('raid', { nestId: rec.id, kind, lost, at });
    return { kind, lost };
  }
  /** 雨の水たまり（やむと乾く）・希少資源（サーバーの FieldRoom.weatherTick と同じ） */
  weatherTick(now = this.now()) {
    this.puddleT = now + ENV.PUDDLE_SPAWN_MS / this.clock.scale;
    const w = this.save && this.save.world;
    if (!w) return;
    const env = this._moveEnv();
    const puddles = w.resources.filter(r => r.kind === 'puddle');
    if (this.envOn && env.weather === 'rain') {
      if (puddles.length < ENV.PUDDLE_MAX) {
        if (!this.nightPts) this.nightPts = nightSpawnPoints(this.spawnPts);
        const pt = pickRespawnPoint(this.nightPts.filter(q => q.kind === 'dew'), 'dew', w.resources, this.random);
        if (pt) { const res = { id: 'w' + (w.nextId++), kind: 'puddle', x: pt.x, y: pt.y }; w.resources.push(res); this.emit('res_spawn', { res }); }
      }
    } else if (puddles.length) {
      const dry = puddles.slice(0, 2);
      w.resources = w.resources.filter(r => !dry.includes(r));
      for (const r of dry) this.emit('res_gone', { id: r.id, by: 0 });
    }
    if (!this.envOn) return;
    const have = new Set(w.resources.filter(r => r.id[0] === 'g').map(r => plotAt(r.x, r.y).id));
    for (const L of buildLands(this.map).values()) {
      if (!L.rare || have.has(L.id)) continue;
      if (!this.rareT.has(L.id)) { this.rareT.set(L.id, now + this.random() * RARE_MIN * 1000 / this.clock.scale); continue; }
      if (now < this.rareT.get(L.id)) continue;
      const pts = this.spawnPts.filter(q => q.kind !== 'pebble' && plotAt(q.x, q.y).id === L.id).map(q => ({ ...q, kind: L.rare }));
      const pt = pickRespawnPoint(pts, L.rare, w.resources, this.random);
      this.rareT.set(L.id, pt ? Infinity : now + 60000);
      if (pt) { const res = { id: 'g' + (w.nextId++), kind: L.rare, x: pt.x, y: pt.y }; w.resources.push(res); this.emit('res_spawn', { res }); }
    }
  }
  _expireTick(now) {
    const w = this.save && this.save.world;
    if (!w) return;
    const gone = w.resources.filter(r => r.exp && r.exp <= now);
    if (!gone.length) return;
    w.resources = w.resources.filter(r => !gone.includes(r));
    for (const r of gone) this.emit('res_gone', { id: r.id, by: 0 });
    this.flush();
  }
  /** 土地を調べる（いる場所の区画） */
  async survey() {
    if (this.place !== 'field' || !this.auth) return { ok: false, reason: '地上にいない' };
    const L = landAt(this.map, this.auth.x, this.auth.y);
    const p = this.save.player, rec = p.nestId && this.save.nests[p.nestId];
    const own = rec ? this.save.entrances.find(e => e.nestId === p.nestId) : null;
    const others = this._entrances().filter(e => !own || e.nestId !== own.nestId);
    const chk = canDigBurrow(this.map, this.auth.x, this.auth.y, others);
    const here = { canDig: chk.ok, reason: chk.ok ? null : chk.reason, digCost: digCost(L), digTime: digTime(L), relocateCost: relocateCost(L),
      nests: this._entrances().filter(e => plotAt(e.x, e.y).id === L.id).length, hasNest: !!rec, cooldownMs: rec ? Math.max(0, (rec.relocatedAt || 0) + this.relocateCooldownMs - this.now()) : 0, x: chk.x, y: chk.y };
    if (own && chk.ok && Math.hypot(own.x - chk.x, own.y - chk.y) < RELOCATE_MIN_DIST) { here.canMove = false; here.moveReason = '今の巣に近すぎる（8 マス以上はなれて）'; }
    else here.canMove = !!rec && chk.ok;
    const env = this.env('field');
    return { ok: true, land: { ...landOut(L), here: { weather: env.weather, season: env.season, sheltered: env.sheltered } }, here };
  }
  /** 引っ越し：いる場所へ巣の入口を移す（巣の中身・倉庫・訪問設定はそのまま）。10 分に 1 回・費用は土地しだい */
  async relocate() {
    if (this.place !== 'field' || !this.auth) return { ok: false, reason: '地上にいない' };
    if (this.auth.jump) return { ok: false, reason: '跳んでいる最中' };
    const p = this.save.player, rec = p.nestId && this.save.nests[p.nestId];
    if (!rec) return { ok: false, reason: 'まだ巣が無い（先に巣を掘ろう）' };
    const left = (rec.relocatedAt || 0) + this.relocateCooldownMs - this.now();
    if (left > 0) return { ok: false, reason: '引っ越したばかり（あと ' + Math.ceil(left / 60000) + ' 分）', cooldownMs: left };
    const ent = this.save.entrances.find(e => e.nestId === rec.id);
    const chk = canDigBurrow(this.map, this.auth.x, this.auth.y, this._entrances().filter(e => e.nestId !== rec.id));
    if (!chk.ok) return chk;
    if (ent && Math.hypot(ent.x - chk.x, ent.y - chk.y) < RELOCATE_MIN_DIST) return { ok: false, reason: '今の巣に近すぎる（8 マス以上はなれて）' };
    const land = landAt(this.map, chk.x, chk.y), cost = relocateCost(land);
    if (!payCost(p.inv, cost)) return { ok: false, reason: '素材が足りない（' + costLabel(cost) + '）', cost };
    const from = ent ? { x: ent.x, y: ent.y } : null;
    if (ent) { ent.x = chk.x; ent.y = chk.y; }
    rec.land = landOut(land); rec.relocatedAt = this.now(); rec.plugged = false;
    this.flush();
    const out = { ...(ent || {}), own: true, policy: rec.policy, plugged: false };
    this.emit('entrance', { entrance: out, moved: true, from });
    return { ok: true, entrance: out, inv: p.inv.map(s => s && { ...s }), cost, land: rec.land, from };
  }
  /** 巣の中から入口をふさぐ（小石 2）・ひらく（小石 1 つ戻る） */
  async plug(on) {
    if (this.place !== 'nest') return { ok: false, reason: '巣の中からだけ ふさげる' };
    const rec = this.save.nests[this.curNestId];
    if (!rec || rec.owner !== this.save.account.id) return { ok: false, reason: '自分の巣ではない' };
    if (!!rec.plugged === !!on) return { ok: false, reason: on ? 'もう ふさいである' : 'もう ひらいている' };
    const inv = this.save.player.inv;
    if (on && !payCost(inv, PLUG_COST)) return { ok: false, reason: '小石が足りない（小石×' + PLUG_COST.pebble + '）' };
    if (!on) addItem(inv, 'pebble', 1);
    rec.plugged = !!on;
    this.flush();
    const e = this._entrances().find(x => x.nestId === rec.id);
    if (e) this.emit('entrance', { entrance: e });
    return { ok: true, plugged: !!on, inv: inv.map(s => s && { ...s }) };
  }
  /** 開発用（オフライン）：天気・季節を固定する・捕食者を近くに出す */
  async dev(m = {}) {
    if (m.weather !== undefined) { if (m.weather && WEATHERS[m.weather]) this.clock.weather = m.weather; else delete this.clock.weather; this.moveEnv = null; this.lifeEnv = null; }
    if (m.season !== undefined) { if (m.season && SEASONS.some(x => x.id === m.season)) this.clock.season = m.season; else delete this.clock.season; this.moveEnv = null; this.lifeEnv = null; }
    if (m.weather !== undefined || m.season !== undefined) this.emit('clock', { clock: { ...this.clock } });
    let spawned = null;
    if (m.spawn && PRED[m.spawn] && this.auth) { const q = this.preds.spawn(m.spawn, this.auth.x + (Number(m.dx) || 70), this.auth.y + (Number(m.dy) || 0)); spawned = q && q.id; }
    if (m.clear) this.preds.preds = [];
    // Ver.0.4：年齢を進める（日）・野生の子を近くに出す・信頼を満たす・お産を今に
    const h = this.house;
    if (h && Number(m.age) > 0) {
      const events = [], rec = this.save.player.nestId && this.save.nests[this.save.player.nestId];
      for (let left = Math.min(40, Number(m.age)) * DAY_MS; left > 0; left -= DAY_MS / 20) {
        const r = h.tick(Math.min(left, DAY_MS / 20), { seeds: rec ? countItem(rec.storage, 'seed') : 0, season: this.env().season, newId: () => this._newInd(), now: this.now() });
        if (r.used && rec) removeItem(rec.storage, 'seed', r.used);
        events.push(...r.events);
      }
      this.flush();
      this.emit('family', { family: h.out(), events: events.map(e => (e.type === 'born' ? { ...e, pups: e.pups.map(x => indOut(x)) } : e)) });
    }
    let wild = null;
    if (m.wild && this.auth) { const n = this.wild.spawn(this.auth.x + (Number(m.dx) || 40), this.auth.y + (Number(m.dy) || 0), devWildGenes(this.wild, m)); wild = n.id; }
    if (m.trust && this.auth) { const n = this.wild.get(m.trust) || this.wild.npcs[0]; if (n) { n.trust[this.save.account.id] = 99.5; n.st = makeFieldState(this.auth.x + 12, this.auth.y); } }
    if (m.birth && h && h.pending) { h.pending.dueAgeMs = h.me.ageMs; }
    let inv = null;
    if (m.give && typeof m.give === 'object' && this.save.player) { inv = this.save.player.inv; for (const [k, v] of Object.entries(m.give)) if (ITEMS[k] && Number(v) > 0) addItem(inv, k, Math.min(99, Number(v) | 0)); }
    if (m.store && typeof m.store === 'object') { const rec = this.save.player && this.save.player.nestId && this.save.nests[this.save.player.nestId]; if (rec) for (const [k, v] of Object.entries(m.store)) if (ITEMS[k] && Number(v) > 0) addItem(rec.storage, k, Math.min(99, Number(v) | 0)); }
    if (inv || m.store) this.flush();
    return { ok: true, clock: { ...this.clock }, spawned, wild, family: h ? h.out() : null, ...(inv ? { inv: inv.map(x => x && { ...x }) } : {}) };
  }


  // ───────── いのちをつなぐ（Ver.0.4）─────────
  /** 年齢・家族の時間（遊んでいる間だけ）。お産・育った・おなかがすいた・寿命の目安を知らせる */
  _familyTick(dt, env) {
    const h = this.house;
    const p = this.save.player, rec = p.nestId && this.save.nests[p.nestId];
    const seeds = rec ? countItem(rec.storage, 'seed') : 0;
    const r = h.tick(dt * this.clock.scale * 1000, { seeds, season: env.season, newId: () => this._newInd(), now: this.now() });
    if (r.used && rec) removeItem(rec.storage, 'seed', r.used);
    const evs = r.events.slice();
    if (h.wantsPrompt()) evs.push({ type: 'lifespan' });
    const kidsKey = h.followers().map(m => m.id).join(',');
    if (kidsKey !== this._kidsKey) { this._kidsKey = kidsKey; }
    this.famSendT -= dt;
    if (evs.length || r.used || this.famSendT <= 0) {
      this.famSendT = 2;
      if (evs.length) this.flush();
      this.emit('family', { family: h.out(), events: evs.map(e => (e.type === 'born' ? { ...e, pups: e.pups.map(m => indOut(m)) } : e)) });
    }
  }
  /** なかよくなれるか（おとな・体調・季節）。null ならなれる */
  _courtBlock() {
    const h = this.house;
    if (!h || !h.me) return 'キャラクターがいない';
    return courtBlock({ ageMs: h.me.ageMs, life: this.save.player.life, season: this.env('field').season, pending: !!h.pending });
  }
  _wildStep() {
    if (!this.auth) return;
    const env = this._moveEnv();
    const me = { id: this.save.account.id, x: this.auth.x, y: this.auth.y, z: this.auth.z, jump: !!this.auth.jump, moving: this.auth.anim === 'hop', still: this.stillT, eligible: this._courtCache() === null };
    const ev = this.wild.step({ season: env.season, period: env.period, scale: this.clock.scale, players: [me] }, WILD_DT);
    for (const e of ev) if (e.type === 'befriend' || e.type === 'lost' || e.type === 'startle') this.emit('wild', { ...e, name: e.name || (this.wild.get(e.id) || {}).name });
  }
  _courtCache() { const t = this.now(); if (this._ccT == null || t >= this._ccT) { this._ccT = t + 500; this._cc = this._courtBlock(); } return this._cc; }
  /** 野生の子に種子をあげる（持ち物の種子 1 つ） */
  async court(wildId) {
    if (this.place !== 'field' || !this.auth) return { ok: false, reason: '地上にいない' };
    const n = this.wild.get(wildId);
    if (!n) return { ok: false, reason: 'もう どこかへ行ってしまった' };
    const why = this._courtBlock();
    if (why) return { ok: false, reason: why, shy: true };
    const inv = this.save.player.inv;
    if (countItem(inv, 'seed') < 1) return { ok: false, reason: '種子を持っていない' };
    const r = this.wild.offer(wildId, { id: this.save.account.id, x: this.auth.x, y: this.auth.y, eligible: true }, this.now());
    if (!r.ok) return r;
    removeItem(inv, 'seed', 1);
    this.flush();
    if (r.befriended) this.emit('wild', { type: 'befriend', id: wildId, by: this.save.account.id, name: r.name });
    return { ...r, inv: inv.map(x => x && { ...x }) };
  }
  /** 自分の巣へ入ったとき：ついてきた野生の子をつれあいに迎える */
  _tryInvite(rec) {
    const h = this.house;
    const n = this.wild.followerOf(this.save.account.id);
    if (!h || !n || !this.auth || Math.hypot(n.st.x - this.auth.x, n.st.y - this.auth.y) > WILD.INVITE_R) return null;
    const r = h.invite({ name: n.name, genes: n.genes }, { life: this.save.player.life, season: this.env('field').season, nestData: rec.data, seeds: countItem(rec.storage, 'seed'), newId: () => this._newInd(), now: this.now() });
    if (!r.ok) return { ok: false, name: n.name, reason: r.reason };
    this.wild.take(n.id);
    for (const l of r.left) this.save.lineage.push(l);
    this.flush();
    this.emit('family', { family: h.out(), events: [] });
    return { ok: true, name: n.name, mate: indOut(r.mate) };
  }
  async family() { const h = this.house; return h ? { ok: true, family: h.out() } : { ok: false, reason: 'キャラクターがいない' }; }
  async namePups(list) {
    const h = this.house;
    if (!h || !Array.isArray(list)) return { ok: false, reason: '名前が変' };
    for (const it of list.slice(0, 16)) {
      const nm = String(it && it.name || '').trim();
      if (validName(nm)) return { ok: false, reason: validName(nm) };
      const r = h.rename(it.id, nm);
      if (!r.ok) return r;
    }
    this.flush();
    return { ok: true, family: h.out() };
  }
  async feedPup(id) {
    const h = this.house;
    if (!h) return { ok: false, reason: 'キャラクターがいない' };
    if (this.place !== 'nest' || this.curNestId !== this.save.player.nestId) return { ok: false, reason: '自分の巣の中で あげよう' };
    const inv = this.save.player.inv;
    if (countItem(inv, 'seed') < 1) return { ok: false, reason: '種子を持っていない' };
    const r = h.feed(id);
    if (!r.ok) return r;
    removeItem(inv, 'seed', 1);
    this.flush();
    return { ok: true, inv: inv.map(x => x && { ...x }), member: indOut(r.member), family: h.out() };
  }
  async mateAgain() {
    const h = this.house;
    const rec = this.save.player.nestId && this.save.nests[this.save.player.nestId];
    if (!h || !rec) return { ok: false, reason: '巣が無い' };
    if (this.place !== 'nest' || this.curNestId !== rec.id) return { ok: false, reason: '自分の巣の中で' };
    const r = h.mateAgain({ life: this.save.player.life, season: this.env('nest').season, nestData: rec.data, seeds: countItem(rec.storage, 'seed'), now: this.now() });
    if (!r.ok) return r;
    this.flush();
    return { ok: true, family: h.out() };
  }
  async kidsFollow(on) { const h = this.house; if (!h) return { ok: false }; h.follow = !!on; this.flush(); return { ok: true, family: h.out(), kids: this._kidsLook() }; }
  /** 家系図：ご先祖・巣立った子・いまの家族（全員） */
  async lineage() {
    const h = this.house;
    if (!h) return { ok: false, reason: 'キャラクターがいない' };
    const nodes = [...this.save.lineage, h.me, ...h.members].map(m => indOut(m));
    return { ok: true, nodes, current: h.me.id };
  }
  /** 世代交代：選んだ子が新しい操作個体になる（巣・倉庫・持ち物・フレンドはそのまま） */
  async succeed(id) {
    const h = this.house;
    if (!h) return { ok: false, reason: 'キャラクターがいない' };
    if (this.sleeping) this._wake();
    const r = h.succeed(Number(id), this.now());
    if (!r.ok) return r;
    return this._afterSuccession(r);
  }
  async farewell() {
    const h = this.house;
    if (!h) return { ok: false, reason: 'キャラクターがいない' };
    const r = h.farewell({ newId: () => this._newInd(), now: this.now() });
    if (!r.ok) return r;
    return this._afterSuccession(r);
  }
  _afterSuccession(r) {
    const h = this.house, heir = r.heir;
    for (const x of [...r.retired, ...r.left]) this.save.lineage.push(x);
    const ch = this.save.character;
    ch.name = heir.name; ch.fur = heir.traits.fur;
    ch.individual = { id: heir.id, species: 'jerboa', sex: heir.sex, generation: heir.generation, father_id: heir.father_id, mother_id: heir.mother_id, genes: heir.genes, traits: heir.traits, status: {} };
    const p = this.save.player;
    p.life = makeLife();
    for (const e of this.save.entrances) if (e.owner === this.save.account.id) e.name = heir.name;
    for (const id in this.save.nests) if (this.save.nests[id].owner === this.save.account.id) this.save.nests[id].ownerName = heir.name;
    this.flush();
    this.emit('life', { life: lifeOut(p.life) });
    const own = this._entrances().find(e => e.own);
    if (own) this.emit('entrance', { entrance: own });
    return { ok: true, character: { ...ch }, family: h.out(), life: lifeOut(p.life), inv: p.inv.map(x => x && { ...x }), look: this._myLook(), kids: this._kidsLook(), retired: r.retired.map(m => indOut(m)), left: r.left.map(m => indOut(m)) };
  }

  // ───────── フレンド（オフライン：NPC だけ）─────────
  _isFriend(id) { return !!(this.save && this.save.friends.some(f => f.id === id && f.state === 'friend')); }
  _friendList() {
    if (!this.save) return [];
    return this.save.friends.map(f => {
      const n = NPCS.find(x => x.id === f.id);
      const ent = this._entrances().find(e => e.owner === f.id);
      const isF = f.state === 'friend';
      return { id: f.id, name: n ? n.name : f.name, fur: n ? n.fur : 'sand', state: f.state, online: isF && this.npcOn, where: isF && this.npcOn ? 'field' : null, nest: isF && ent ? { x: ent.x, y: ent.y } : null, at: f.at };
    });
  }
  async friends() { return { ok: true, list: this._friendList() }; }
  async friendRequest(name) {
    const nm = String(name || '').trim();
    const n = NPCS.find(x => x.name === nm);
    if (this.save.character && nm === this.save.character.name) return { ok: false, reason: '自分とはフレンドになれない' };
    if (!n || !this.npcOn) return { ok: false, reason: '「' + nm + '」という子は見つからない（オフラインでは ナッツ・モカ・リコ とフレンドになれる）' };
    const f = this.save.friends.find(x => x.id === n.id);
    if (f && f.state === 'friend') return { ok: false, reason: 'もうフレンド' };
    if (f) return { ok: false, reason: 'もう申請してある（返事待ち）' };
    this.save.friends.push({ id: n.id, name: n.name, state: 'outgoing', at: this.now() });
    this.flush();
    // NPC は少しして受けてくれる
    setTimeout(() => {
      const g = this.save && this.save.friends.find(x => x.id === n.id);
      if (!g || g.state !== 'outgoing') return;
      g.state = 'friend'; g.at = this.now(); this.flush();
      this.emit('toast', { text: n.name + ' が フレンド申請を受けてくれた' });
      this.emit('friends', { list: this._friendList() });
    }, 1500);
    return { ok: true, state: 'outgoing', list: this._friendList() };
  }
  async friendAccept(id) {
    const f = this.save.friends.find(x => x.id === id && x.state === 'incoming');
    if (!f) return { ok: false, reason: '申請が見つからない' };
    f.state = 'friend'; this.flush();
    return { ok: true, list: this._friendList() };
  }
  async friendRemove(id) {
    const n = this.save.friends.length;
    this.save.friends = this.save.friends.filter(x => x.id !== id);
    if (n === this.save.friends.length) return { ok: false, reason: 'フレンドではない' };
    this.flush();
    return { ok: true, list: this._friendList() };
  }
  async setBuilders() { return { ok: false, reason: '共同作業者はオンラインで使えます' }; }
  async visitors() { return { ok: true, list: this.save.visits.slice(-20).reverse().map(v => ({ name: v.name, at: v.at })) }; }

  // ───────── NPC の訪問（オフライン）─────────
  /** NPC のフレンドが自分の巣を訪ねてくる（巣が公開、またはフレンドだけ公開のとき）。遊んでいる最中は通知 */
  _canNpcVisit(npcId) {
    const p = this.save.player, rec = p.nestId && this.save.nests[p.nestId];
    if (!rec) return false;
    return rec.policy === 'public' || (rec.policy === 'friends' && this._isFriend(npcId));
  }
  _npcVisitTick(dt) {
    if (!this.npcOn) return;
    if (this.visitT == null) this.visitT = NPC_VISIT_MIN_S + this.random() * (NPC_VISIT_MAX_S - NPC_VISIT_MIN_S);
    this.visitT -= dt * this.clock.scale;
    if (this.visitT > 0) return;
    this.visitT = null;
    const cand = NPCS.filter(n => this._isFriend(n.id) && this._canNpcVisit(n.id));
    if (!cand.length) return;
    const n = cand[Math.floor(this.random() * cand.length)];
    const v = { name: n.name, at: this.now(), seen: true };
    this.save.visits.push(v);
    if (this.save.visits.length > 50) this.save.visits.splice(0, this.save.visits.length - 50);
    this.flush();
    this.emit('visit', { name: n.name, nestId: this.save.player.nestId, at: v.at });
  }
  /** 前に遊んでから時間がたっていたら、留守のあいだに NPC のフレンドが来ていたことにする（次のログインで一覧に出る） */
  _awayVisits() {
    const last = this.save.lastPlayed || 0;
    this.save.lastPlayed = this.now();
    if (!last || this.now() - last < 10 * 60 * 1000 || !this.npcOn) return;
    const cand = NPCS.filter(n => this._isFriend(n.id) && this._canNpcVisit(n.id));
    for (const n of cand) if (this.random() < 0.7) this.save.visits.push({ name: n.name, at: last + this.random() * (this.now() - last), seen: false });
    this.save.visits.sort((a, b) => a.at - b.at);
  }
}

function costLabel(c) { return Object.entries(c).map(([k, v]) => ({ pebble: '小石', grass: '草', seed: '種子' }[k] || k) + '×' + v).join('・'); }

// ───────── オンライン（PROTOCOL.md・tobinezumi/server）─────────
export const RECONNECT_MIN_MS = 500, RECONNECT_MAX_MS = 30000;
export const PING_MS = 2000, DEAD_MS = 6000;
export class OnlineBackend extends Emitter {
  constructor(url, { storage = globalThis.localStorage, WS = globalThis.WebSocket } = {}) {
    super();
    this.mode = 'online';
    this.url = url;
    this.storage = storage;
    this.WS = WS;
    this.ws = null; this.rid = 0; this.waiting = new Map();
    this.queue = []; this.sendT = 0;
    this.backoff = RECONNECT_MIN_MS; this.closedByUser = false; this.place = 'none';
    this.joining = false; this.curNestOwner = null;
    this.state = 'connecting';
    this.clockOffset = 0;
    this.lastRecv = Date.now(); this.pingT = 0;
    this.reconnects = 0;
    this.map = buildFieldMap();
    this.clock = makeClock();     // 世界の時計（welcome・join_field で受け取る）
    this.life = null;
  }
  phase() { return dayPhase(this.clock, this.serverTime()); }
  serverTime() { return Date.now() + this.clockOffset; }
  get online() { return !!this.ws && this.ws.readyState === 1 && this.state === 'online'; }

  /** 1 回つなぐ（失敗したら reject。再接続はしない） */
  connect(timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      let done = false, ws;
      try { ws = new this.WS(this.url); } catch (e) { reject(e); return; }
      const t = setTimeout(() => { if (!done) { done = true; this._drop(ws); reject(new Error('timeout')); } }, timeoutMs);
      ws.onopen = () => {
        if (done) return; done = true; clearTimeout(t);
        this.ws = ws; this.lastRecv = Date.now(); this.state = 'online';
        ws.onclose = () => { if (this.ws === ws) this._lost(); };
        resolve(this);
      };
      ws.onerror = () => { if (!done) { done = true; clearTimeout(t); this._drop(ws); reject(new Error('ws error')); } };
      ws.onclose = () => { if (!done) { done = true; clearTimeout(t); reject(new Error('closed')); } };
      ws.onmessage = ev => { if (this.ws === ws || !done) { this.lastRecv = Date.now(); this._msg(decode(ev.data)); } };
    });
  }
  /** ソケットを捨てる（ハンドラを外して閉じる。閉じる合図が届かないネット断でもすぐ次へ進める） */
  _drop(ws) {
    if (!ws) return;
    ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
    try { ws.close(); } catch (e) {}
  }
  /** 切れた：待っている要求を失敗にして、再接続を始める（1 本だけ） */
  _lost() {
    const ws = this.ws; this.ws = null; this._drop(ws);
    for (const [, w] of this.waiting) w.reject(new Error('切断'));
    this.waiting.clear();
    this.queue = [];
    if (this.closedByUser || this.state === 'reconnecting') return;
    this.state = 'reconnecting';
    this.emit('status', { state: 'reconnecting' });
    this._retry();
  }
  _retry() {
    if (this.closedByUser) return;
    const wait = this.backoff; this.backoff = Math.min(RECONNECT_MAX_MS, this.backoff * 2);   // 指数バックオフ 0.5→1→2…→30 秒
    clearTimeout(this._retryTimer);
    this._retryTimer = setTimeout(() => this._resume(), wait);
  }
  async _resume() {
    try { await this.connect(); }
    catch (e) { this._retry(); return; }
    this.reconnects++;
    try {
      const h = await this.hello();
      if (!h.ok || !h.account) { this.place = 'none'; this.backoff = RECONNECT_MIN_MS; this.emit('status', { state: 'online' }); this.emit('session_lost', h); return; }
      if (this.place === 'nest' && this.curNestOwner != null) {
        const r = await this.enterNest(this.curNestOwner, true);
        if (r.ok) this.emit('rejoin_nest', r.nest);
        else { const j = await this.joinField(); if (j.ok) this.emit('rejoin', j.world); else throw new Error(j.reason); }
      } else if (this.place === 'field') {
        const j = await this.joinField();
        if (j.ok) this.emit('rejoin', j.world); else throw new Error(j.reason);
      }
      this.backoff = RECONNECT_MIN_MS;
      this.emit('status', { state: 'online' });
    } catch (e) {
      if (this.ws) { const ws = this.ws; this.ws = null; this._drop(ws); }
      this._retry();
    }
  }
  _send(msg) { if (this.ws && this.ws.readyState === 1) { this.ws.send(encode(msg)); return true; } return false; }
  _flushInputs() {
    while (this.queue.length) {
      const chunk = this.queue.splice(0, 30);
      if (!this._send({ t: C2S.INPUT, inputs: chunk })) { this.queue = []; break; }
    }
  }
  _req(t, payload = {}, timeoutMs = 8000) {
    return new Promise(resolve => {
      if (!this.ws || this.ws.readyState !== 1) { resolve({ ok: false, reason: 'つながっていない', code: 'offline' }); return; }
      this._flushInputs();           // 拾う・掘るの前に、そこまでの移動をサーバーへ（確定位置を合わせる）
      const rid = ++this.rid;
      const timer = setTimeout(() => { this.waiting.delete(rid); resolve({ ok: false, reason: '返事が無い' }); }, timeoutMs);
      this.waiting.set(rid, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); resolve({ ok: false, reason: e.message, code: 'offline' }); } });
      this._send({ t, rid, ...payload });
    });
  }
  _msg(m) {
    if (!m) return;
    if (m.t === S2C.RES) { const w = this.waiting.get(m.rid); if (w) { this.waiting.delete(m.rid); w.resolve(m); } return; }
    if (m.t === S2C.WELCOME) { if (m.serverTime) this.clockOffset = m.serverTime - Date.now(); if (m.clock) this.clock = m.clock; this._ping(); return; }
    if (m.t === S2C.CLOCK) { if (m.clock) this.clock = m.clock; this.emit('clock', m); return; }
    if (m.t === S2C.LIFE) { this.life = m.life; this.emit('life', m); return; }
    if (m.t === S2C.PONG) { const now = Date.now(); this.rtt = now - m.ct; this.clockOffset = m.st - (m.ct + now) / 2; return; }
    if (m.t === S2C.KICK) { this.closedByUser = true; this.state = 'kicked'; this.emit('kick', m); this._drop(this.ws); this.ws = null; return; }
    const map = { [S2C.SNAPSHOT]: 'snapshot', [S2C.PLAYER_JOIN]: 'player_join', [S2C.PLAYER_LEAVE]: 'player_leave', [S2C.CHAT]: 'chat', [S2C.RES_GONE]: 'res_gone', [S2C.RES_SPAWN]: 'res_spawn', [S2C.NEST_UPDATE]: 'nest_update', [S2C.NEST_PEERS]: 'nest_peers', [S2C.ENTRANCE]: 'entrance', [S2C.TOAST]: 'toast',
      [S2C.FRIENDS]: 'friends', [S2C.VISIT]: 'visit', [S2C.NEST_ROLE]: 'nest_role', [S2C.CAUGHT]: 'caught', [S2C.RAID]: 'raid',
      [S2C.FAMILY]: 'family', [S2C.PLAYER_UPDATE]: 'player_update', [S2C.WILD]: 'wild' };
    if (map[m.t]) this.emit(map[m.t], m);
  }
  _ping() { this._send({ t: C2S.PING, ct: Date.now() }); }
  _token() { try { return this.storage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  _setToken(t) { try { if (t) this.storage.setItem(TOKEN_KEY, t); else this.storage.removeItem(TOKEN_KEY); } catch (e) {} }

  async hello() {
    const r = await this._req(C2S.HELLO, { v: PROTOCOL_VERSION, token: this._token() });
    if (r.ok && r.expired) this._setToken(null);
    return { mode: 'online', ...r };
  }
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
  async logout() { this.place = 'none'; this.queue = []; await this._req(C2S.LOGOUT); this._setToken(null); return { ok: true }; }
  async createCharacter({ name, fur, sex }) { const e = validName(name); if (e) return { ok: false, reason: e }; return this._req(C2S.CREATE_CHAR, sex ? { name, fur, sex } : { name, fur }); }
  async joinField() {
    this.joining = true; this.queue = [];
    const r = await this._req(C2S.JOIN_FIELD);
    this.joining = false;
    if (r.ok) { this.place = 'field'; this.curNestOwner = null; if (r.world.clock) this.clock = r.world.clock; if (r.world.life) this.life = r.world.life; if (r.world.danger) this.envOn = r.world.danger.env !== false; }
    return r;
  }
  /** 入力：地上にいて、つながっている間だけためる（50ms ごとにまとめて送る・1 通 30 個まで） */
  sendInput(inp) {
    if (this.place !== 'field' || this.joining || !this.ws || this.ws.readyState !== 1) return;
    this.queue.push({ seq: inp.seq, mx: inp.mx, my: inp.my, jump: inp.jump ? 1 : 0 });
    if (this.queue.length > 120) this.queue.splice(0, this.queue.length - 120);
  }
  tick(dt) {
    this.sendT += dt * 1000;
    if (this.sendT >= INPUT_SEND_MS) { this.sendT = 0; if (this.queue.length) this._flushInputs(); }
    // 生存確認：2 秒ごとに ping。6 秒なにも届かなければ切れたとみなして再接続へ
    if (this.ws && this.state === 'online') {
      this.pingT += dt * 1000;
      if (this.pingT >= PING_MS) { this.pingT = 0; this._ping(); }
      if (Date.now() - this.lastRecv > DEAD_MS) this._lost();
    }
  }
  async pickup(resId) { return this._req(C2S.PICKUP, { resId }); }
  async digBurrow(x, y) { return this._req(C2S.DIG_BURROW, { x, y }); }
  async enterNest(owner, resume = false) {
    const r = await this._req(C2S.ENTER_NEST, resume ? { owner, resume: true } : { owner });
    if (r.ok) { this.place = 'nest'; this.curNestOwner = owner; this.queue = []; }
    return r;
  }
  async leaveNest() { const r = await this._req(C2S.LEAVE_NEST); if (r.ok) { this.place = 'field'; this.curNestOwner = null; } return r; }
  async nestOp(nestId, rev, op) { return this._req(C2S.NEST_OP, { nestId, rev, op }); }
  async store(nestId, dir, item, n) { return this._req(C2S.STORE, { nestId, dir, item, n }); }
  async chat(text) { const t = cleanChat(text); if (!t) return { ok: false }; return this._send({ t: C2S.CHAT, text: t }) ? { ok: true } : { ok: false, reason: 'つながっていない' }; }
  async setVisitPolicy(policy, list) { return this._req(C2S.VISIT_POLICY, list ? { policy, list } : { policy }); }
  async moveSlot(from, to) { return this._req(C2S.INV_MOVE, { from, to }); }
  // Ver.0.2
  async eat(from = 'inv', item = 'seed') { const r = await this._req(C2S.EAT, item === 'rare_seed' ? { from, item } : { from }); if (r.ok && r.life) this.life = r.life; return r; }
  async drink(resId) { const r = await this._req(C2S.DRINK, resId != null ? { resId } : {}); if (r.ok && r.life) this.life = r.life; return r; }
  async sleep() { const r = await this._req(C2S.SLEEP); if (r.ok && r.life) this.life = r.life; return r; }
  async wake() { const r = await this._req(C2S.WAKE); if (r.ok && r.life) this.life = r.life; return r; }
  async friends() { return this._req(C2S.FRIENDS); }
  async friendRequest(name) { return this._req(C2S.FRIEND_REQ, { name }); }
  async friendAccept(id) { return this._req(C2S.FRIEND_OK, { id }); }
  async friendRemove(id) { return this._req(C2S.FRIEND_DEL, { id }); }
  async setBuilders(list) { return this._req(C2S.SET_BUILDERS, { list }); }
  async visitors() { return this._req(C2S.VISITORS); }
  nestMove(st) { this._send({ t: C2S.NEST_MOVE, x: Math.round(st.x), y: Math.round(st.y), facing: st.facing, anim: st.anim }); }
  // Ver.0.3
  async survey() { return this._req(C2S.SURVEY); }
  async relocate() { return this._req(C2S.RELOCATE); }
  async plug(on) { return this._req(C2S.PLUG, { on: !!on }); }
  async dev(m = {}) { return this._req(C2S.DEV, m); }
  setDanger() { return { ok: false, reason: 'オンラインではサーバーの設定に従います' }; }
  // Ver.0.4
  async court(wildId) { return this._req(C2S.COURT, { wildId }); }
  async family() { return this._req(C2S.FAMILY); }
  async namePups(list) { return this._req(C2S.NAME_PUPS, { list }); }
  async feedPup(id) { return this._req(C2S.FEED_PUP, { id }); }
  async mateAgain() { return this._req(C2S.MATE_AGAIN); }
  async kidsFollow(on) { return this._req(C2S.KIDS_FOLLOW, { on: !!on }); }
  async lineage() { return this._req(C2S.LINEAGE); }
  async succeed(id) { return this._req(C2S.SUCCEED, { id }); }
  async farewell() { return this._req(C2S.FAREWELL); }
  env(place = this.place) { return envAt(this.clock, this.serverTime(), { enabled: this.envOn !== false, place }); }
  savePosition() {}
  flush() {}
  kindCost(kind) { return KIND_COST[kind]; }
  close() { this.closedByUser = true; clearTimeout(this._retryTimer); const ws = this.ws; this.ws = null; this._drop(ws); }
  /** 動作確認用：ネットが切れたふり（ソケットを黙って捨てる） */
  _simulateDrop() { this._lost(); }
}

// ───────── どちらを使うか ─────────
/**
 * ?offline=1 → オフライン。?server=ws://… → そこへ接続。
 * それ以外は tobi-server.json（Node サーバーが配る {ws:"/ws"} など）を探し、あればオンライン。
 * GitHub Pages では見つからないのでオフライン。オンラインにつながらなければオフラインへ戻る。
 */
export async function chooseBackend({ search = (globalThis.location && location.search) || '', storage = globalThis.localStorage } = {}) {
  const q = new URLSearchParams(search);
  // 動作確認用：?timescale=60（時計・暮らしを 60 倍速）・?hour=22（22 時から）・?weather=sandstorm|rain|clear・?season=winter など。
  // オフラインだけ効く（オンラインはサーバーの時計）。捕食者の強さはメニューの設定（tobi_settings.danger）
  let settings = {};
  try { settings = JSON.parse(storage.getItem(SETTINGS_KEY)) || {}; } catch (e) { settings = {}; }
  const dev = { timeScale: Math.max(1, Math.min(600, Number(q.get('timescale')) || 1)), startHour: q.get('hour') != null && q.get('hour') !== '' ? Number(q.get('hour')) : null,
    env: true, predators: ['normal', 'easy', 'off'].includes(q.get('danger')) ? q.get('danger') : (['normal', 'easy', 'off'].includes(settings.danger) ? settings.danger : 'normal'),
    weather: q.get('weather') || null, season: q.get('season') || null };
  const Off = (extra = {}) => new OfflineBackend({ storage, ...dev, ...extra });
  if (q.get('offline') === '1') return Off();
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
    catch (e) { const off = Off(); off.fallbackFrom = url; return off; }
  }
  return Off();
}
