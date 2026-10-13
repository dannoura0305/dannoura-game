// tobinezumi/server/rooms/field.js — 地上の共有フィールド（1 つ）。サーバーが正。
//
//  ・入力は受け取った順にためて、20Hz のティックで shared/move.js の stepField を「1 入力 = dt 1/60」で当てる
//    （クライアントの予測と同じ順・同じ dt → 正しい入力列なら同じ結果）。位置を直接受け取る口は無い。
//  ・速度上限：1 秒あたり 60 入力まで（トークンバケツ・最大 1.5 秒ぶんの貯め）。超えた入力は当てずに捨てる（ack は進める）
//    → 改造で入力を連打しても速くならず、クライアントの予測が巻き戻されるだけ。跳躍のクールダウン・壁は stepField の中。
//  ・スナップショットは 10Hz（ティック 2 回に 1 回）。
//  ・採集物は 1 プロセス内で同期的に処理：「存在の確認 → DB で消す＋持ち物を増やす（1 トランザクション）」の間に
//    ほかの要求は割り込めない → 同時に 2 人が拾っても先着 1 人だけ。
//  ・昼夜（Ver.0.2・shared/daynight.js）：拾った物が戻るまでの待ちは夜 ×0.45・昼 ×1.4。夜のあいだは 6 秒（世界の時間）ごとに
//    夜露（id 'd…'・飲める）と夜の種子（id 'n…'・拾っても再出現待ちに積まない）を 1 つずつ足す（上限 NIGHT_EXTRA）。
//    夜露は昼になると乾いて消える（res_gone の by = 0）。
//  ・体調が低い（shared/life.js の isTired）と stepField に tired を渡す（遅い・大ジャンプなし）。
import { stepField, makeFieldState, STEP_DT } from '../../shared/move.js';
import { initialResources, resourceSpawnPoints, pickRespawnPoint, canDigBurrow, regionAt, nightSpawnPoints, nearWater, RESPAWN_MIN, RESPAWN_MAX } from '../../shared/regions.js';
import { dayPhase, periodOf, respawnScale as timeRespawnScale, makeClock, NIGHT_EXTRA, NIGHT_SPAWN_MS } from '../../shared/daynight.js';
import { moveMods, drink, canDrink, LIFE } from '../../shared/life.js';
import { createNest } from '../../shared/nest-rules.js';
import { addItem, canAdd } from '../../shared/items.js';
import { hash2 } from '../../shared/rng.js';
import { SNAPSHOT_HZ, SERVER_TICK_HZ } from '../../shared/protocol.js';

export const PICK_RANGE = 28;
export const INPUT_RATE = 60;          // 1 秒あたりの入力（= クライアントの 60Hz）
export const INPUT_BURST = 90;         // 貯められる入力（1.5 秒ぶん：通信の揺れを吸収）
export const MAX_INPUTS_PER_MSG = 30;
export const MAX_INBOX = 240;

const r1 = v => Math.round(v * 10) / 10;
const clone = inv => inv.map(s => s && { ...s });

export class FieldRoom {
  constructor({ store, map, now = () => Date.now(), random = Math.random, log = () => {}, respawnScale = 1, stats = null, clock = null }) {
    this.store = store; this.map = map; this.now = now; this.random = random; this.log = log;
    this.respawnScale = respawnScale;
    this.clock = clock || makeClock();
    this.nightPts = nightSpawnPoints(resourceSpawnPoints(map));
    this.nightT = 0;           // 次に夜の物を足す時刻（実時間 ms）
    this.stats = stats || { out: 0, in: 0 };
    this.players = new Map();          // accountId → Player（地上にいる人）
    this.resources = new Map();        // id → {id, kind, x, y}
    this.respawns = [];                // [{id, kind, at}]
    this.entrances = new Map();        // owner(accountId) → {owner, nestId, x, y}
    this.spawnPts = resourceSpawnPoints(map);
    this.tickN = 0;
  }

  /** 起動時：DB から採集物・再出現待ち・巣穴を読む（初回は初期配置を作る） */
  load() {
    const st = this.store;
    if (!st.getMeta('resources_init')) {
      st.tx(() => {
        for (const r of initialResources(this.map)) st.insertResource(r, regionAt(this.map, r.x, r.y).id);
        st.setMeta('resources_init', '1');
        st.setMeta('next_res', '1000');
      });
    }
    for (const r of st.resources()) this.resources.set(r.id, r);
    this.respawns = st.respawnQueue();
    for (const n of st.allNests()) if (n.x != null) this.entrances.set(n.owner, { owner: n.owner, nestId: n.id, x: n.x, y: n.y });
  }
  _nextId(prefix) {
    const n = parseInt(this.store.getMeta('next_res', '1000'), 10) || 1000;
    this.store.setMeta('next_res', String(n + 1));
    return prefix + n;
  }

  // ───────── 出入り ─────────
  playerInfo(p) { return { id: p.accountId, name: p.name, fur: p.fur, x: r1(p.st.x), y: r1(p.st.y), dir: p.st.dir }; }
  /** 地上に入れる。pos = {x, y, dir} */
  join(p, pos, why = 'join') {
    const st = makeFieldState(pos.x, pos.y);
    st.dir = pos.dir || 'down';
    p.st = st; p.lastSeq = 0; p.inbox = []; p.budget = INPUT_BURST; p.place = 'field'; p.nestId = null;
    p.lastBudgetAt = this.now();
    const already = this.players.has(p.accountId);
    this.players.set(p.accountId, p);
    if (!already) this.broadcast({ t: 'player_join', player: this.playerInfo(p), why }, p);
    return this.worldInit(p);
  }
  leave(p, why = 'leave') {
    if (!this.players.has(p.accountId) || this.players.get(p.accountId) !== p) return false;
    this.drain(p);
    this.players.delete(p.accountId);
    this.broadcast({ t: 'player_leave', id: p.accountId, why }, p);
    return true;
  }
  worldInit(p) {
    const ent = this.entrances.get(p.accountId);
    return {
      serverTime: this.now(),
      clock: { ...this.clock },
      you: { id: p.accountId, name: p.name, fur: p.fur, x: p.st.x, y: p.st.y, dir: p.st.dir, inv: clone(p.inv), nest: ent ? { id: ent.nestId, x: ent.x, y: ent.y } : null },
      resources: [...this.resources.values()].map(r => ({ id: r.id, kind: r.kind, x: r.x, y: r.y })),
      players: [...this.players.values()].filter(o => o !== p).map(o => this.playerInfo(o)),
      entrances: this.entranceList(p.accountId),
    };
  }
  entranceOut(e, forAcct) {
    const nest = this.nestInfo ? this.nestInfo(e.nestId) : null;
    return { owner: e.owner, name: nest ? nest.ownerName : '', nestId: e.nestId, x: e.x, y: e.y, own: e.owner === forAcct, policy: nest ? nest.policy : 'private' };
  }
  entranceList(forAcct) { return [...this.entrances.values()].map(e => this.entranceOut(e, forAcct)); }

  broadcast(msg, except = null) {
    const s = JSON.stringify(msg);
    for (const o of this.players.values()) if (o !== except && o.conn) { o.conn.sendRaw(s); }
  }

  // ───────── 入力 ─────────
  /** input メッセージ：形を確かめてためるだけ（当てるのはティック） */
  queueInput(p, inputs) {
    if (p.place !== 'field' || !Array.isArray(inputs)) return false;
    if (inputs.length > MAX_INPUTS_PER_MSG) inputs = inputs.slice(0, MAX_INPUTS_PER_MSG);
    for (const i of inputs) {
      if (!i || typeof i !== 'object') continue;
      const seq = Number(i.seq);
      if (!Number.isInteger(seq) || seq <= 0) continue;
      p.inbox.push({ seq, mx: Math.sign(Number(i.mx) || 0), my: Math.sign(Number(i.my) || 0), jump: !!i.jump });
    }
    if (p.inbox.length > MAX_INBOX) { p.violations = (p.violations || 0) + (p.inbox.length - MAX_INBOX); p.inbox.splice(0, p.inbox.length - MAX_INBOX); }
    return true;
  }
  /** ためた入力を当てる（速度上限つき）。拾う・掘る・入る前にも呼んで、確定位置を最新にする */
  drain(p) {
    if (!p.inbox || !p.inbox.length) return;
    const t = this.now();
    p.budget = Math.min(INPUT_BURST, p.budget + (t - p.lastBudgetAt) / 1000 * INPUT_RATE);
    p.lastBudgetAt = t;
    for (const i of p.inbox) {
      if (i.seq <= p.lastSeq) continue;          // 古い・重複した入力
      p.lastSeq = i.seq;
      if (p.budget < 1) { p.dropped = (p.dropped || 0) + 1; continue; }   // 速すぎる：当てない
      p.budget -= 1;
      p.st = stepField(p.st, i, STEP_DT, this.map, moveMods(p.life));
    }
    p.st.seq = p.lastSeq;
    p.inbox.length = 0;
  }

  tick() {
    this.tickN++;
    const t = this.now();
    for (const p of this.players.values()) this.drain(p);
    // 再出現
    if (this.respawns.length && this.respawns[0].at <= t) this._respawn(t);
    // 夜だけの物（夜露・夜の種子）
    if (t >= this.nightT) this.nightTick(t);
    // スナップショット（10Hz）
    if (this.tickN % Math.max(1, Math.round(SERVER_TICK_HZ / SNAPSHOT_HZ)) === 0) this.snapshot(t);
  }
  snapshot(t = this.now()) {
    const list = [...this.players.values()];
    if (!list.length) return;
    const snaps = list.map(p => {
      const s = p.st;
      return { id: p.accountId, x: r1(s.x), y: r1(s.y), z: r1(s.z), dir: s.dir, anim: s.anim, jump: s.jump ? { t: s.jump.t, dur: s.jump.dur, x0: s.jump.x0, y0: s.jump.y0, x1: s.jump.x1, y1: s.jump.y1 } : null };
    });
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.conn) continue;
      const others = list.length > 1 ? snaps.filter((_, k) => k !== i) : [];
      p.conn.send({ t: 'snapshot', st: t, ack: p.lastSeq, you: p.st, players: others });
    }
  }
  _respawn(t) {
    const due = [];
    while (this.respawns.length && this.respawns[0].at <= t) due.push(this.respawns.shift());
    for (const d of due) {
      const pt = pickRespawnPoint(this.spawnPts, d.kind, [...this.resources.values()], this.random);
      if (!pt) {   // 置き場所が無い：30 秒後にもう一度
        const at = t + 30000; this.store.delayRespawn(d.id, at); this._queue({ ...d, at }); continue;
      }
      const res = { id: '', kind: d.kind, x: pt.x, y: pt.y };
      this.store.tx(() => {
        res.id = this._nextId('r');
        this.store.dropRespawn(d.id);
        this.store.insertResource(res, regionAt(this.map, res.x, res.y).id);
      });
      this.resources.set(res.id, res);
      this.broadcast({ t: 'res_spawn', res });
    }
  }
  _queue(r) { this.respawns.push(r); this.respawns.sort((a, b) => a.at - b.at); }

  /** 夜：夜露・夜の種子を 1 つずつ足す（上限まで）。昼：夜露を乾かす。NIGHT_SPAWN_MS（世界の時間）ごとに呼ぶ */
  nightTick(t = this.now()) {
    this.nightT = t + NIGHT_SPAWN_MS / (this.clock.scale || 1);
    const period = periodOf(dayPhase(this.clock, t));
    const out = { spawned: [], dried: [] };
    if (period === 'night') {
      for (const kind of ['dew', 'seed']) {
        const prefix = kind === 'dew' ? 'd' : 'n';
        let n = 0;
        for (const r of this.resources.values()) if (r.id[0] === prefix) n++;
        if (n >= NIGHT_EXTRA[kind]) continue;
        const pt = pickRespawnPoint(this.nightPts, kind, [...this.resources.values()], this.random);
        if (!pt) continue;
        const res = { id: '', kind, x: pt.x, y: pt.y };
        this.store.tx(() => { res.id = this._nextId(prefix); this.store.insertResource(res, regionAt(this.map, res.x, res.y).id); });
        this.resources.set(res.id, res);
        this.broadcast({ t: 'res_spawn', res });
        out.spawned.push(res);
      }
    } else if (period === 'day') {
      const dew = [...this.resources.values()].filter(r => r.kind === 'dew');
      if (dew.length) {
        this.store.tx(() => { for (const r of dew) this.store.takeResource(r.id); });
        for (const r of dew) { this.resources.delete(r.id); this.broadcast({ t: 'res_gone', id: r.id, by: 0 }); out.dried.push(r); }
      }
    }
    return out;
  }

  // ───────── 水を飲む（Ver.0.2）─────────
  /** 夜露（resId）か、水場のふち。飲めたら {ok, life, src}。体の数値は呼ぶ側（Game）が持つ p.life を書き換える */
  drink(p, resId) {
    if (p.place !== 'field') return { ok: false, code: 'forbidden', reason: '地上にいない' };
    this.drain(p);
    if (p.st.jump) return { ok: false, code: 'rule', reason: '跳んでいる最中' };
    if (!canDrink(p.life)) return { ok: false, code: 'rule', reason: 'もうおなかいっぱい（水分は満タン）' };
    if (resId != null) {
      const r = this.resources.get(String(resId));
      if (!r || r.kind !== 'dew') return { ok: false, code: 'not_found', reason: '夜露はもう乾いてしまった' };
      if (Math.hypot(r.x - p.st.x, r.y - p.st.y) > PICK_RANGE) return { ok: false, code: 'too_far', reason: '遠すぎる' };
      if (this.store.takeResource(r.id) !== 1) { this.resources.delete(r.id); return { ok: false, code: 'not_found', reason: '夜露はもう乾いてしまった' }; }
      this.resources.delete(r.id);
      this.broadcast({ t: 'res_gone', id: r.id, by: p.accountId });
      p.life = drink(p.life, LIFE.DEW_DRINK);
      return { ok: true, src: 'dew' };
    }
    if (!nearWater(this.map, p.st.x, p.st.y)) return { ok: false, code: 'too_far', reason: '近くに水が無い（オアシスのふちか、夜の夜露で）' };
    p.life = drink(p.life, LIFE.WATER_DRINK);
    return { ok: true, src: 'water' };
  }

  // ───────── 採集 ─────────
  pickup(p, resId) {
    if (p.place !== 'field') return { ok: false, code: 'forbidden', reason: '地上にいない' };
    this.drain(p);
    const r = this.resources.get(String(resId));
    if (!r) return { ok: false, code: 'not_found', reason: 'もう無い（だれかが拾った）' };
    if (r.kind === 'dew') return { ok: false, code: 'rule', reason: '夜露は拾えない（E で飲む）' };
    if (p.st.jump) return { ok: false, code: 'too_far', reason: '跳んでいる最中' };
    if (Math.hypot(r.x - p.st.x, r.y - p.st.y) > PICK_RANGE) return { ok: false, code: 'too_far', reason: '遠すぎる' };
    if (!canAdd(p.inv, r.kind, 1)) return { ok: false, code: 'full', reason: '持ち物がいっぱい' };
    const inv = clone(p.inv);
    addItem(inv, r.kind, 1);
    // 戻るまでの待ち：2〜5 分 × 時間帯の倍率（夜は早い）÷ 早回し。夜の種子（id 'n…'）は戻らない
    const at = this.now() + (RESPAWN_MIN + this.random() * (RESPAWN_MAX - RESPAWN_MIN)) * 1000 * this.respawnScale * timeRespawnScale(dayPhase(this.clock, this.now())) / (this.clock.scale || 1);
    const back = r.id[0] !== 'n';
    let qid = null;
    try {
      this.store.tx(() => {
        if (this.store.takeResource(r.id) !== 1) throw new Error('gone');
        this.store.setCharInventory(p.charId, inv);
        if (back) { qid = this._nextId('q'); this.store.queueRespawn(qid, r.kind, Math.round(at)); }
      });
    } catch (e) {
      this.resources.delete(r.id);
      return { ok: false, code: 'not_found', reason: 'もう無い（だれかが拾った）' };
    }
    this.resources.delete(r.id);
    p.inv = inv;
    if (back) this._queue({ id: qid, kind: r.kind, at: Math.round(at) });
    this.broadcast({ t: 'res_gone', id: r.id, by: p.accountId });
    return { ok: true, item: r.kind, inv: clone(inv) };
  }

  // ───────── 巣穴を掘る ─────────
  dig(p) {
    if (p.place !== 'field') return { ok: false, code: 'forbidden', reason: '地上にいない' };
    this.drain(p);
    if (this.entrances.has(p.accountId) || this.store.nestByOwner(p.accountId)) return { ok: false, code: 'rule', reason: 'もう巣がある' };
    if (p.st.jump) return { ok: false, code: 'rule', reason: '跳んでいる最中' };
    const chk = canDigBurrow(this.map, p.st.x, p.st.y, [...this.entrances.values()]);
    if (!chk.ok) return { ok: false, code: 'rule', reason: chk.reason };
    const seed = Math.floor(hash2(chk.x, chk.y, 7) * 1e9);
    const nestId = this.store.createNest(p.accountId, { data: createNest({ seed }), x: chk.x, y: chk.y, regionId: regionAt(this.map, chk.x, chk.y).id });
    const ent = { owner: p.accountId, nestId, x: chk.x, y: chk.y };
    this.entrances.set(p.accountId, ent);
    for (const o of this.players.values()) if (o !== p && o.conn) o.conn.send({ t: 'entrance', entrance: this.entranceOut(ent, o.accountId) });
    return { ok: true, entrance: this.entranceOut(ent, p.accountId) };
  }
}
