// tobinezumi/server/rooms/nest.js — 巣ごとのインスタンス（所有者＋許可された訪問者）。サーバーが正。
//
//  ・入れるか：自分の巣 / 共同作業者（builder） / public / list（nest_access の visitor） / friends（フレンド）。private は所有者と共同作業者だけ。
//  ・nest_op：所有者と共同作業者（Ver.0.2。素材は操作した本人の持ち物から）。訪問者は閲覧のみ。rev が今と違えば stale_rev（最新の rev・data を付けて返す）。
//    shared/nest-rules.js の tryOp で検査 → 素材を払う・返す → rev+1 → 1 トランザクションで保存 → 中にいる人へ nest_update。
//  ・倉庫：自分の巣・倉庫の部屋がある。持ち物と倉庫を 1 トランザクションで同時に書く。
//  ・nest_peers：中にいる人の位置（10Hz まで）。巣の中のチャットは中にいる人だけへ。
import { tryOp, CELL, objectsWithFixtures } from '../../shared/nest-rules.js';
import { payCost, refund, countItem, removeItem, addItem, canAdd, ITEMS } from '../../shared/items.js';
import { VISIT_POLICIES, validName, MAX_BUILDERS, PLUG_COST, PLUG_GAP_MS } from '../../shared/protocol.js';
import { RELOCATE_COOLDOWN_MS } from '../../shared/lands.js';

const clone = inv => inv.map(s => s && { ...s });
const OPS = new Set(['dig', 'fill', 'tunnel', 'room', 'room-resize', 'set-kind', 'place', 'remove']);
const NUM_KEYS = ['x', 'y', 'w', 'h', 'len', 's', 'rot'];
const STR_KEYS = ['id', 'dir', 'kind', 'type'];
export const MAX_ALLOW = 30;

/** 送られてきた op を、知っている形だけに切り詰める（余計なキー・変な値は落とす） */
export function sanitizeOp(op) {
  if (!op || typeof op !== 'object' || Array.isArray(op) || !OPS.has(op.op)) return null;
  const o = { op: op.op };
  for (const k of NUM_KEYS) if (op[k] != null) { const v = Number(op[k]); if (!Number.isInteger(v) || Math.abs(v) > 1000) return null; o[k] = v; }
  for (const k of STR_KEYS) if (op[k] != null) { if (typeof op[k] !== 'string' || op[k].length > 32) return null; o[k] = op[k]; }
  return o;
}

export class NestHub {
  constructor({ store, now = () => Date.now(), log = () => {} }) {
    this.store = store; this.now = now; this.log = log;
    this.inst = new Map();     // nestId → {members:Set<Player>, dirty}
    this.metaCache = new Map();
  }
  /** 入口の表示用：{ownerName, policy, plugged, raidedAt, danger}（Ver.0.3：ふさいだ入口・襲撃・土地の危険） */
  meta(nestId) {
    let m = this.metaCache.get(nestId);
    if (!m) {
      const n = this.store.nest(nestId); if (!n) return null;
      m = { ownerName: n.ownerName, policy: n.policy, owner: n.owner, plugged: n.plugged, raidedAt: n.raidedAt, danger: n.land ? n.land.danger || 0 : 0 };
      this.metaCache.set(nestId, m);
    }
    return m;
  }
  forget(nestId) { this.metaCache.delete(nestId); }

  /** 巣での役割：'owner' / 'builder'（共同作業者）/ 'visitor' */
  role(nest, accountId) {
    if (nest.owner === accountId) return 'owner';
    if (this.store.hasNestAccess(nest.id, accountId, 'builder')) return 'builder';
    return 'visitor';
  }
  canVisit(nest, accountId) {
    if (this.role(nest, accountId) !== 'visitor') return true;
    if (nest.plugged) return false;          // 入口がふさがれている（所有者と共同作業者だけ）
    if (nest.policy === 'public') return true;
    if (nest.policy === 'list') return this.store.hasNestAccess(nest.id, accountId, 'visitor');
    if (nest.policy === 'friends') return this.store.isFriend(nest.owner, accountId);
    return false;
  }
  _names(nestId, role) { return this.store.nestAccess(nestId).filter(a => a.role === role).map(a => a.name).filter((v, i, a) => v && a.indexOf(v) === i); }
  record(nest, p) {
    const role = this.role(nest, p.accountId), own = role === 'owner';
    const out = { id: nest.id, owner: nest.owner, ownerName: nest.ownerName, rev: nest.rev, data: nest.data, storage: this.store.nestStorage(nest.id), policy: nest.policy,
      canEdit: role !== 'visitor', own, role, hostFur: null, plugged: !!nest.plugged, land: nest.land || null,
      family: this.familyOf ? this.familyOf(nest) : [] };   // Ver.0.4：巣にいる家族（つれあい・子・きょうだい）。訪問者にも見える
    if (own) { out.relocatedAt = nest.relocatedAt || 0; out.relocateCooldownMs = this.relocateCooldownMs != null ? this.relocateCooldownMs : RELOCATE_COOLDOWN_MS; }
    if (own) { out.list = this._names(nest.id, 'visitor'); out.builders = this._names(nest.id, 'builder'); }
    return out;
  }

  /** 入る（入口の距離などは呼ぶ側で確認済み） */
  enter(p, nest) {
    if (!this.canVisit(nest, p.accountId)) return { ok: false, code: 'forbidden', reason: (nest.ownerName || '') + 'の巣は 今は入れないようだ' + (nest.plugged ? '（入口がふさがれている）' : '') };
    this.leave(p);
    let I = this.inst.get(nest.id);
    if (!I) { I = { members: new Set(), dirty: false }; this.inst.set(nest.id, I); }
    const d = nest.data;
    p.place = 'nest'; p.nestId = nest.id;
    p.nestPos = { x: d.entrance.x * CELL + CELL / 2, y: (d.surfaceY + 1) * CELL + 6, facing: 1, anim: 'climb' };
    I.members.add(p);
    if (nest.owner !== p.accountId) {
      // 中にいる子へ（所有者には Game が visit を送るので、ここでは送らない）
      for (const o of I.members) if (o !== p && o.conn && o.accountId !== nest.owner) o.conn.send({ t: 'toast', text: p.name + ' が 巣に たずねてきた' });
    }
    this.flushPeers(nest.id);
    return { ok: true, nest: this.record(nest, p) };
  }
  leave(p) {
    if (p.place !== 'nest' || p.nestId == null) return false;
    const id = p.nestId, I = this.inst.get(id);
    p.place = 'none'; p.nestId = null;
    if (!I) return true;
    I.members.delete(p);
    if (!I.members.size) this.inst.delete(id); else this.flushPeers(id);
    return true;
  }
  members(nestId) { const I = this.inst.get(nestId); return I ? [...I.members] : []; }

  peersMsg(nestId) {
    return { t: 'nest_peers', nestId, peers: this.members(nestId).map(o => ({ id: o.accountId, name: o.name, fur: o.fur, look: o.look || null, x: Math.round(o.nestPos.x), y: Math.round(o.nestPos.y), facing: o.nestPos.facing, anim: o.nestPos.anim })) };
  }
  flushPeers(nestId) {
    const I = this.inst.get(nestId);
    if (!I) return;
    I.dirty = false;
    const s = JSON.stringify(this.peersMsg(nestId));
    for (const o of I.members) if (o.conn) o.conn.sendRaw(s);
  }
  move(p, m) {
    if (p.place !== 'nest') return;
    const t = this.now();
    if (p._nmT && t - p._nmT < 80) return;     // 10Hz まで
    p._nmT = t;
    const x = Number(m.x), y = Number(m.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 48 * CELL || y > 24 * CELL) return;
    let anim = ['idle', 'walk', 'jump', 'climb', 'climb_idle', 'sleep'].includes(m.anim) ? m.anim : 'idle';
    if (anim === 'sleep' && !p.sleeping) anim = 'idle';            // 寝床で sleep を頼んだ人だけ眠って見える
    if (p.sleeping && anim !== 'sleep' && this.onWake) this.onWake(p);   // 動いたら起きる
    p.nestPos = { x, y, facing: Number(m.facing) < 0 ? -1 : 1, anim };
    const I = this.inst.get(p.nestId);
    if (I) I.dirty = true;
  }
  tick() { for (const [id, I] of this.inst) if (I.dirty) this.flushPeers(id); }
  broadcast(nestId, msg, except = null) {
    const s = JSON.stringify(msg);
    for (const o of this.members(nestId)) if (o !== except && o.conn) o.conn.sendRaw(s);
  }

  // ───────── 建築 ─────────
  op(p, nestId, rev, rawOp) {
    const nest = this.store.nest(Number(nestId));
    if (!nest) return { ok: false, code: 'not_found', reason: '巣が無い' };
    if (this.role(nest, p.accountId) === 'visitor') return { ok: false, code: 'forbidden', reason: '自分の巣ではない（見学中は編集できない）' };
    if (p.place !== 'nest' || p.nestId !== nest.id) return { ok: false, code: 'forbidden', reason: '巣の中にいない' };
    if (Number(rev) !== nest.rev) return { ok: false, code: 'stale_rev', reason: '巣が更新された。もう一度', rev: nest.rev, data: nest.data };
    const op = sanitizeOp(rawOp);
    if (!op) return { ok: false, code: 'bad_request', reason: '操作の形が変' };
    const inv = clone(p.inv);
    let r;
    try { r = tryOp(nest.data, op, inv); } catch (e) { return { ok: false, code: 'bad_request', reason: '操作の形が変' }; }
    if (!r.ok) return { ok: false, code: 'rule', reason: r.reason };
    if (!payCost(inv, r.cost)) return { ok: false, code: 'rule', reason: '素材が足りない' };
    const back = refund(inv, r.refund);
    let changed = 0;
    this.store.tx(() => {
      changed = this.store.updateNestData(nest.id, nest.rev, r.data, this.now());
      if (changed !== 1) return;
      this.store.setCharInventory(p.charId, inv);
    });
    if (changed !== 1) { const cur = this.store.nest(nest.id); return { ok: false, code: 'stale_rev', reason: '巣が更新された。もう一度', rev: cur.rev, data: cur.data }; }
    p.inv = inv;
    const newRev = nest.rev + 1;
    this.broadcast(nest.id, { t: 'nest_update', nestId: nest.id, rev: newRev, op, data: r.data }, p);
    return { ok: true, rev: newRev, data: r.data, inv: clone(inv), created: r.created, cost: r.cost, refund: back };
  }

  // ───────── 倉庫 ─────────
  storeItems(p, nestId, dir, item, n) {
    const nest = this.store.nest(Number(nestId));
    if (!nest || nest.owner !== p.accountId) return { ok: false, code: 'forbidden', reason: '自分の巣の倉庫ではない' };
    if (p.place !== 'nest' || p.nestId !== nest.id) return { ok: false, code: 'forbidden', reason: '巣の中にいない' };
    if (!nest.data.rooms.some(r => r.kind === 'store')) return { ok: false, code: 'rule', reason: '倉庫が無い' };
    n = Number(n);
    if (!ITEMS[item] || !Number.isInteger(n) || n <= 0 || n > 999) return { ok: false, code: 'bad_request', reason: '預けられない' };
    if (dir !== 'deposit' && dir !== 'withdraw') return { ok: false, code: 'bad_request', reason: '向きが変' };
    const inv = clone(p.inv), storage = this.store.nestStorage(nest.id);
    const [from, to] = dir === 'deposit' ? [inv, storage] : [storage, inv];
    const k = Math.min(n, countItem(from, item));
    if (k <= 0) return { ok: false, code: 'rule', reason: dir === 'deposit' ? '持っていない' : '倉庫に無い' };
    if (!canAdd(to, item, k)) return { ok: false, code: 'full', reason: 'いっぱいで入らない' };
    removeItem(from, item, k); addItem(to, item, k);
    this.store.tx(() => { this.store.setCharInventory(p.charId, inv); this.store.setNestStorage(nest.id, storage); });
    p.inv = inv;
    return { ok: true, moved: k, inv: clone(inv), storage: clone(storage) };
  }

  // ───────── 暮らし（Ver.0.2）─────────
  /** 巣の中の家具・備え付けで、いる場所（p.nestPos）の近くにある type の物 */
  nearObject(nest, p, type, slack = 12) {
    const pos = p.nestPos;
    if (!pos) return null;
    for (const o of objectsWithFixtures(nest.data)) {
      if (o.type !== type) continue;
      const x0 = o.x * CELL - slack, x1 = (o.x + o.w) * CELL + slack, floor = (o.y + o.h) * CELL;
      if (pos.x >= x0 && pos.x <= x1 && Math.abs(pos.y - floor) <= 12) return o;
    }
    return null;
  }
  /** 眠れるか：巣の中・所有者／共同作業者／所有者のフレンド・寝床の上 */
  canSleep(p) {
    if (p.place !== 'nest') return { ok: false, code: 'forbidden', reason: '巣の中でだけ眠れる' };
    const nest = this.store.nest(p.nestId);
    if (!nest) return { ok: false, code: 'not_found', reason: '巣が無い' };
    if (this.role(nest, p.accountId) === 'visitor' && !this.store.isFriend(nest.owner, p.accountId)) return { ok: false, code: 'forbidden', reason: 'よその寝床では眠れない（フレンドならだいじょうぶ）' };
    if (!this.nearObject(nest, p, 'nestbed')) return { ok: false, code: 'too_far', reason: '寝床の上で眠ろう' };
    return { ok: true, nest };
  }
  /** 種の山から食べる：自分の巣の倉庫の種子（無ければだめ）。所有者だけ */
  takeSeedFromPile(p) {
    if (p.place !== 'nest') return { ok: false, code: 'forbidden', reason: '巣の中にいない' };
    const nest = this.store.nest(p.nestId);
    if (!nest || nest.owner !== p.accountId) return { ok: false, code: 'forbidden', reason: '自分の巣の種の山だけ' };
    if (!this.nearObject(nest, p, 'seed_pile')) return { ok: false, code: 'too_far', reason: '種の山から遠い' };
    const storage = this.store.nestStorage(nest.id);
    if (!removeItem(storage, 'seed', 1)) return { ok: false, code: 'rule', reason: '倉庫に種子が無い' };
    return { ok: true, nest, storage };
  }

  // ───────── 入口をふさぐ（Ver.0.3）─────────
  /** 巣の中から入口を小石でふさぐ（小石 2）・ひらく（小石 1 つ戻る）。所有者と共同作業者。ふさぐとキツネに掘られても無事・訪問者は入れない */
  plug(p, on) {
    if (p.place !== 'nest') return { ok: false, code: 'forbidden', reason: '巣の中からだけ ふさげる' };
    const nest = this.store.nest(p.nestId);
    if (!nest) return { ok: false, code: 'not_found', reason: '巣が無い' };
    if (this.role(nest, p.accountId) === 'visitor') return { ok: false, code: 'forbidden', reason: '自分の巣ではない' };
    const t = this.now();
    if (p._plugT && t - p._plugT < PLUG_GAP_MS) return { ok: false, code: 'rate', reason: 'ちょっと待って' };
    p._plugT = t;
    if (!!nest.plugged === !!on) return { ok: false, code: 'rule', reason: on ? 'もう ふさいである' : 'もう ひらいている' };
    const inv = clone(p.inv);
    if (on && !payCost(inv, PLUG_COST)) return { ok: false, code: 'rule', reason: '小石が足りない（小石×' + PLUG_COST.pebble + '）' };
    if (!on) addItem(inv, 'pebble', 1);
    this.store.tx(() => { this.store.setPlugged(nest.id, on); this.store.setCharInventory(p.charId, inv); });
    p.inv = inv;
    this.forget(nest.id);
    for (const o of this.members(nest.id)) if (o !== p && o.conn) o.conn.send({ t: 'toast', text: on ? p.name + ' が 入口を小石でふさいだ' : p.name + ' が 入口をひらいた' });
    if (this.onPlug) this.onPlug(nest, on);
    return { ok: true, plugged: !!on, inv: clone(inv) };
  }

  // ───────── 共同作業者（Ver.0.2）─────────
  /** 所有者が共同作業者をキャラ名で決める（全部入れ替え・10 人まで）。外された／加わった人が中にいれば nest_role を送る */
  setBuilders(p, list, players = new Map()) {
    const nest = this.store.nestByOwner(p.accountId);
    if (!nest) return { ok: false, code: 'not_found', reason: '巣が無い' };
    if (!Array.isArray(list) || list.length > MAX_BUILDERS) return { ok: false, code: 'bad_request', reason: `共同作業者は ${MAX_BUILDERS} 匹まで` };
    const names = [...new Set(list.map(s => String(s || '').trim()).filter(s => s && !validName(s)))];
    const before = new Set(this.store.nestAccess(nest.id).filter(a => a.role === 'builder').map(a => a.accountId));
    const unknown = [], entries = [];
    for (const nm of names) {
      const ids = this.store.accountsByCharName(nm).filter(id => id !== p.accountId);
      if (!ids.length) unknown.push(nm);
      for (const id of ids) entries.push({ accountId: id, name: nm });
    }
    this.store.setNestAccess(nest.id, entries, 'builder');
    const after = new Set(entries.map(e => e.accountId));
    for (const id of new Set([...before, ...after])) {
      if (before.has(id) === after.has(id)) continue;
      const o = players.get(id);
      if (o && o.conn) {
        o.conn.send({ t: 'toast', text: after.has(id) ? (nest.ownerName + 'の巣の 共同作業者に なった') : (nest.ownerName + 'の巣の 共同作業者では なくなった') });
        if (o.place === 'nest' && o.nestId === nest.id) o.conn.send({ t: 'nest_role', nestId: nest.id, canEdit: after.has(id), role: after.has(id) ? 'builder' : 'visitor' });
      }
    }
    return { ok: true, list: names.filter(n => !unknown.includes(n)), unknown };
  }

  // ───────── 訪問設定 ─────────
  setPolicy(p, policy, list) {
    const nest = this.store.nestByOwner(p.accountId);
    if (!nest) return { ok: false, code: 'not_found', reason: '巣が無い' };
    if (!VISIT_POLICIES.includes(policy)) return { ok: false, code: 'bad_request', reason: '訪問設定が変' };
    let unknown = [], names = null;
    if (list != null) {
      if (!Array.isArray(list) || list.length > MAX_ALLOW) return { ok: false, code: 'bad_request', reason: `許可リストは ${MAX_ALLOW} 人まで` };
      names = [...new Set(list.map(s => String(s || '').trim()).filter(s => s && !validName(s)))];
      const entries = [];
      for (const nm of names) {
        const ids = this.store.accountsByCharName(nm).filter(id => id !== p.accountId);
        if (!ids.length) unknown.push(nm);
        for (const id of ids) entries.push({ accountId: id, name: nm });
      }
      this.store.setNestAccess(nest.id, entries, 'visitor');
    }
    this.store.setVisitPolicy(nest.id, policy);
    const m = this.metaCache.get(nest.id); if (m) m.policy = policy;
    return { ok: true, policy, list: names || undefined, unknown };
  }
}
