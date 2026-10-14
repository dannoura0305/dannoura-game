// tobinezumi/shared/nest-rules.js — 巣データ（schema v1）と建築ルール。ブラウザと Node（サーバー）で同じものを使う。DOM なし。
//
// 巣データ（ARCHITECTURE.md §6）：
//   { v:1, w:48, h:24, surfaceY:2,
//     cells: "2a46s…"  … 各セルを RLE で（a=空 s=土 d=掘った空間 r=岩）。行優先。
//     rooms:   [{id, kind:'plain'|'bed'|'store', x, y, w, h}],
//     tunnels: [{id, x, y, len, dir:'h'|'v'|'slope', s?:1|-1, fixed?:true}],
//     objects: [{id, type, x, y, rot}],      … 家具（FURNITURE のキー）。寝床・倉庫の備え付けは保存しない（部屋から導く）
//     entrance: {x, y},  seq: 次の id 番号 }
//
// 編集はすべて「操作（op）」：
//   {op:'dig', x, y}                      土を 1 セル掘る
//   {op:'fill', x, y}                     掘ったセルを埋める（撤去・取り消し用）
//   {op:'tunnel', x, y, len, dir, s}      通路（h=右へ / v=下へ / slope=斜め下へ s=+1 右下・-1 左下。坂は 2 段の帯：上が通る空間・下が坂）
//   {op:'room', x, y, w, h, kind}         部屋（最小 4×3）
//   {op:'room-resize', id, x, y, w, h}    部屋の拡張・縮小（辺のドラッグ）
//   {op:'set-kind', id, kind}             寝床・倉庫・ふつう
//   {op:'place', type, x, y, rot}         家具
//   {op:'remove', id}                     家具・部屋・通路の撤去（素材の一部が戻る）
// validateOp → {ok, reason, cost, refund}　applyOp → {data, created}　tryOp は両方。
// 巣のつながり：掘った空間はすべて入口から 4 近傍でつながっていなければならない（足す操作も、消す操作も）。
import { FURNITURE, FIXTURES, hasCost, addCost, halfCost } from './items.js';
import { mulberry32 } from './rng.js';

export const NEST_SCHEMA = 1;
export const NEST_W = 48, NEST_H = 24, SURFACE_Y = 2, CELL = 16;
export const C = { SOIL: 0, OPEN: 1, ROCK: 2, AIR: 3 };
const CH = ['s', 'd', 'r', 'a'];
const CODE = { s: 0, d: 1, r: 2, a: 3 };

export const ROOM_MIN_W = 4, ROOM_MIN_H = 3, ROOM_MAX_W = 14, ROOM_MAX_H = 8;
export const TUNNEL_MIN = 2, TUNNEL_MAX = 20;
export const ROOM_COST = { pebble: 2 };
export const KIND_COST = { plain: {}, bed: { grass: 4 }, store: { pebble: 2, grass: 1 } };
export const KIND_NAME = { plain: '部屋', bed: '寝床', store: '倉庫' };
export const MAX_OPEN_CELLS = 700;

// ───────── セルの RLE ─────────
export function encodeCells(arr) {
  let out = '', prev = -1, n = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === prev) { n++; continue; }
    if (n) out += n + CH[prev];
    prev = arr[i]; n = 1;
  }
  if (n) out += n + CH[prev];
  return out;
}
export function decodeCells(str, w, h) {
  const arr = new Uint8Array(w * h);
  let i = 0;
  const re = /(\d+)([sdra])/g;
  let m;
  while ((m = re.exec(str)) && i < arr.length) {
    const n = +m[1], c = CODE[m[2]];
    for (let k = 0; k < n && i < arr.length; k++) arr[i++] = c;
  }
  if (i !== arr.length) throw new Error('cells の長さが合わない');
  return arr;
}

// 解いたセルは data ごとに覚えておく（data は書き換えない約束：変更は必ず新しい data を作る）
const cache = new WeakMap();
export function cellsOf(data) {
  let c = cache.get(data);
  if (!c) { c = decodeCells(data.cells, data.w, data.h); cache.set(data, c); }
  return c;
}
export function cellAt(data, x, y) {
  if (x < 0 || y < 0 || x >= data.w || y >= data.h) return -1;
  return cellsOf(data)[y * data.w + x];
}
export const isOpen = (data, x, y) => cellAt(data, x, y) === C.OPEN;

function clone(data) { return JSON.parse(JSON.stringify(data)); }

// ───────── 新しい巣 ─────────
/** 入口から短い縦穴＋小部屋 1 つ（ランタン付き）。岩の位置は seed で決まる */
export function createNest({ seed = 1, entranceX = 8 } = {}) {
  const w = NEST_W, h = NEST_H, sy = SURFACE_Y;
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < sy; y++) for (let x = 0; x < w; x++) cells[y * w + x] = C.AIR;
  for (let x = 0; x < w; x++) cells[(h - 1) * w + x] = C.ROCK;   // 底は岩盤
  const rnd = mulberry32(seed);
  const ex = Math.max(3, Math.min(w - 10, entranceX | 0));
  for (let k = 0; k < 9; k++) {   // 岩のかたまり
    const cx = 2 + Math.floor(rnd() * (w - 4)), cy = 9 + Math.floor(rnd() * (h - 11));
    const r = 1 + rnd() * 1.6;
    if (cx > ex - 7 && cx < ex + 22 && cy < 17) continue;     // 入口のまわり（最初に広げる場所）は空けておく
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
      if (x < 1 || x > w - 2 || y <= sy + 3 || y > h - 2) continue;
      if (Math.hypot(x - cx, (y - cy) * 1.3) <= r) cells[y * w + x] = C.ROCK;
    }
  }
  const data = { v: NEST_SCHEMA, w, h, surfaceY: sy, cells: '', rooms: [], tunnels: [], objects: [], entrance: { x: ex, y: sy }, seq: 1 };
  cells[sy * w + ex] = C.OPEN;
  const shaft = { id: 't' + data.seq++, x: ex, y: sy + 1, len: 4, dir: 'v', fixed: true };
  const room = { id: 'r' + data.seq++, kind: 'plain', x: ex - 2, y: sy + 5, w: 6, h: 3 };
  const lamp = { id: 'o' + data.seq++, type: 'lamp', x: ex + 2, y: room.y, rot: 0 };
  for (const [x, y] of tunnelCells(shaft)) cells[y * w + x] = C.OPEN;
  for (const [x, y] of rectCells(room)) cells[y * w + x] = C.OPEN;
  data.tunnels.push(shaft); data.rooms.push(room); data.objects.push(lamp);
  data.cells = encodeCells(cells);
  return data;
}

// ───────── 版の移行（セーブを失わない）─────────
// MIGRATIONS[n] は「版 n のデータ → 版 n+1」。版番号の無いものは v0（試作の形）とみなす。
//   v0：{ w, h, surface, grid:number[]（0 土/1 空間/2 岩、空の行も 0）, rooms:[{x,y,w,h,type}], items:[{kind,x,y}], door:{x} }
export const MIGRATIONS = {
  0(old) {
    const w = old.w || NEST_W, h = old.h || NEST_H, sy = old.surface != null ? old.surface : SURFACE_Y;
    const cells = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const y = Math.floor(i / w);
      const g = (old.grid && old.grid[i]) | 0;
      cells[i] = y < sy ? C.AIR : (g === 1 ? C.OPEN : g === 2 ? C.ROCK : C.SOIL);
    }
    let seq = 1;
    const ex = old.door && Number.isFinite(old.door.x) ? old.door.x : 8;
    cells[sy * w + ex] = C.OPEN;
    const tunnels = [{ id: 't' + seq++, x: ex, y: sy + 1, len: 4, dir: 'v', fixed: true }];
    for (const [x, y] of tunnelCells(tunnels[0])) cells[y * w + x] = C.OPEN;
    const kindMap = { sleep: 'bed', bed: 'bed', storage: 'store', store: 'store' };
    const rooms = (old.rooms || []).map(r => ({ id: 'r' + seq++, kind: kindMap[r.type] || 'plain', x: r.x, y: r.y, w: r.w, h: r.h }));
    for (const r of rooms) for (const [x, y] of rectCells(r)) cells[y * w + x] = C.OPEN;
    const objects = (old.items || []).filter(it => FURNITURE[it.kind]).map(it => ({ id: 'o' + seq++, type: it.kind, x: it.x, y: it.y, rot: 0 }));
    return { v: 1, w, h, surfaceY: sy, cells: encodeCells(cells), rooms, tunnels, objects, entrance: { x: ex, y: sy }, seq };
  },
};
/** どの版でも最新（v1）にして返す。読めないものは例外 */
export function migrateNest(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('巣データが無い');
  let d = raw;
  let v = Number.isFinite(d.v) ? d.v : 0;
  while (v < NEST_SCHEMA) {
    const f = MIGRATIONS[v];
    if (!f) throw new Error('移行できない版: ' + v);
    d = f(d); v = d.v;
  }
  if (v > NEST_SCHEMA) throw new Error('新しすぎる版: ' + v);
  const chk = validateNest(d);
  if (!chk.ok) throw new Error('巣データが壊れている: ' + chk.reason);
  return d;
}

/** データの形と、つながりの検査 */
export function validateNest(d) {
  if (!d || d.v !== NEST_SCHEMA) return { ok: false, reason: '版が違う' };
  if (!(d.w > 0 && d.h > 0 && typeof d.cells === 'string')) return { ok: false, reason: '大きさ・セルが無い' };
  try { cellsOf(d); } catch (e) { return { ok: false, reason: e.message }; }
  for (const k of ['rooms', 'tunnels', 'objects']) if (!Array.isArray(d[k])) return { ok: false, reason: k + ' が無い' };
  if (!d.entrance || !isOpen(d, d.entrance.x, d.entrance.y)) return { ok: false, reason: '入口が無い' };
  if (!connected(d.w, d.h, cellsOf(d), d.entrance)) return { ok: false, reason: '巣がつながっていない' };
  return { ok: true };
}

// ───────── 形 ─────────
export function rectCells(r) {
  const out = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
}
/** 通路が開けるセル。坂は 1 段ごとに「坂のセル」と「その上の頭の空間」 */
export function tunnelCells(t) {
  const out = [];
  if (t.dir === 'h') for (let i = 0; i < t.len; i++) out.push([t.x + i, t.y]);
  else if (t.dir === 'v') for (let i = 0; i < t.len; i++) out.push([t.x, t.y + i]);
  else { const s = t.s === -1 ? -1 : 1; for (let i = 0; i < t.len; i++) { out.push([t.x + s * i, t.y + i]); out.push([t.x + s * i, t.y + i + 1]); } }
  return out;
}
/**
 * 坂のセルだけ。坂は 1 段ごとに「上＝通れる空間（行 y+i）」と「下＝坂のセル（行 y+i+1、対角線より下は土）」。
 * 坂の上端は (x, y) の行の床の高さ、下端は (x+s*len, y+len) の行の床の高さにつながる。
 */
export function slopeCells(t) {
  const s = t.s === -1 ? -1 : 1, out = [];
  for (let i = 0; i < t.len; i++) out.push([t.x + s * i, t.y + i + 1]);
  return out;
}
const inRect = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function roomAt(data, x, y) { return data.rooms.find(r => inRect(r, x, y)) || null; }
export function findById(data, id) {
  return data.rooms.find(r => r.id === id) || data.tunnels.find(t => t.id === id) || data.objects.find(o => o.id === id) || null;
}
export function kindOfId(id) { return id && id[0] === 'r' ? 'room' : id && id[0] === 't' ? 'tunnel' : id && id[0] === 'o' ? 'object' : id && id.startsWith('fx:') ? 'fixture' : null; }

/** 備え付け（寝床の草の巣・倉庫の棚）の位置：部屋の矩形だけから決まる */
export function fixtureOf(room) {
  if (room.kind === 'bed') { const f = FIXTURES.nestbed; return { id: 'fx:' + room.id, type: 'nestbed', x: room.x + Math.floor((room.w - f.w) / 2), y: room.y + room.h - f.h, w: f.w, h: f.h, rot: 0, roomId: room.id, fixture: true }; }
  if (room.kind === 'store') { const f = FIXTURES.storage; return { id: 'fx:' + room.id, type: 'storage', x: room.x + room.w - f.w - (room.w >= 6 ? 1 : 0), y: room.y + room.h - f.h, w: f.w, h: f.h, rot: 0, roomId: room.id, fixture: true }; }
  return null;
}
/** 家具＋備え付けを、同じ形（セル座標の矩形）で。全体モードと閲覧モードはどちらもこれだけを見て描く */
export function objectsWithFixtures(data) {
  const out = [];
  for (const r of data.rooms) { const f = fixtureOf(r); if (f) out.push(f); }
  for (const o of data.objects) {
    const f = FURNITURE[o.type]; if (!f) continue;
    const r = roomAt(data, o.x, o.y);
    out.push({ id: o.id, type: o.type, x: o.x, y: o.y, w: f.w, h: f.h, rot: o.rot | 0, roomId: r ? r.id : null, fixture: false, ...(o.item ? { item: o.item } : {}) });
  }
  return out;
}
export function objectAt(data, x, y) {
  const all = objectsWithFixtures(data);
  for (let i = all.length - 1; i >= 0; i--) if (inRect(all[i], x, y)) return all[i];
  return null;
}

/** 坂のセル → 向き（+1 右下がり / -1 左下がり）。部屋の中は坂にしない */
export function slopeMap(data) {
  const m = new Map();
  for (const t of data.tunnels) if (t.dir === 'slope') for (const [x, y] of slopeCells(t)) if (!roomAt(data, x, y)) m.set(y * data.w + x, t.s === -1 ? -1 : 1);
  return m;
}
/** 縦の通路として登り降りできるセル */
export function climbMap(data) {
  const w = data.w, set = new Set(), slopes = slopeMap(data);
  for (const t of data.tunnels) if (t.dir === 'v') for (const [x, y] of tunnelCells(t)) set.add(y * w + x);
  set.add(data.entrance.y * w + data.entrance.x);
  // 幅 1 の縦穴（掘るで作ったもの）も登れる
  for (let y = data.surfaceY; y < data.h; y++) for (let x = 0; x < w; x++) {
    if (!isOpen(data, x, y) || slopes.has(y * w + x) || roomAt(data, x, y)) continue;
    if (!isOpen(data, x - 1, y) && !isOpen(data, x + 1, y) && (isOpen(data, x, y - 1) || isOpen(data, x, y + 1))) set.add(y * w + x);
  }
  return set;
}

/** 構造物がどのセルを持っているか（撤去のとき「ほかの構造が使っているセル」は残す） */
function heldCells(data, exceptId) {
  const s = new Set(), w = data.w;
  for (const r of data.rooms) if (r.id !== exceptId) for (const [x, y] of rectCells(r)) s.add(y * w + x);
  for (const t of data.tunnels) if (t.id !== exceptId) for (const [x, y] of tunnelCells(t)) s.add(y * w + x);
  s.add(data.entrance.y * w + data.entrance.x);
  return s;
}

function connected(w, h, cells, ent) {
  let total = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] === C.OPEN) total++;
  const start = ent.y * w + ent.x;
  if (cells[start] !== C.OPEN) return total === 0;
  const seen = new Uint8Array(w * h), q = [start];
  seen[start] = 1;
  let n = 0;
  while (q.length) {
    const i = q.pop(); n++;
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (!seen[j] && cells[j] === C.OPEN) { seen[j] = 1; q.push(j); }
    }
  }
  return n === total;
}
export function isConnected(data) { return connected(data.w, data.h, cellsOf(data), data.entrance); }

function inBuildArea(d, x, y) { return x >= 1 && x <= d.w - 2 && y >= d.surfaceY + 1 && y <= d.h - 2; }
function areaReason(d, x, y) {
  if (y <= d.surfaceY) return '地表は掘れない';
  if (y >= d.h - 1) return '底は固くて掘れない';
  return '巣の外だ';
}
const isInt = v => Number.isInteger(v);
const NG = reason => ({ ok: false, reason });

/** 家具・備え付けが部屋の中で正しい位置にあるか */
function objectFits(data, o, f, ignoreId) {
  const r = roomAt(data, o.x, o.y);
  if (!r || !inRect(r, o.x + f.w - 1, o.y + f.h - 1)) return '部屋の中に置こう';
  if (f.mount === 'floor' && o.y + f.h !== r.y + r.h) return '床に置こう';
  // mount 'any'（Ver.0.5：収集品・リース）：部屋の中ならどこでも（壁に掛ける・床に置く）
  if (f.mount === 'ceil' && o.y !== r.y) return '天井に吊るそう';
  const box = { x: o.x, y: o.y, w: f.w, h: f.h };
  for (const p of objectsWithFixtures(data)) if (p.id !== ignoreId && overlap(p, box)) return '物が重なる';
  return null;
}

// ───────── 操作の検査 ─────────
/**
 * @param data 巣データ（v1）　@param op 操作　@param inv 持ち物（素材の検査。null なら素材は見ない）
 * @param ctx Ver.0.5：{owned:Set（図鑑にある収集品）, unlocks:Set（実績で使える飾り）}。null なら見ない（受け取った確定済みの操作など）
 * @returns {ok, reason?, cost, refund}
 */
export function validateOp(data, op, inv = null, ctx = null) {
  const res = check(data, op, ctx);
  if (!res.ok) return res;
  if (inv && res.cost && !hasCost(inv, res.cost)) return { ok: false, reason: '素材が足りない', cost: res.cost, refund: res.refund };
  return res;
}

function check(d, op, ctx = null) {
  if (!op || typeof op.op !== 'string') return NG('操作が無い');
  const ok = (cost = {}, refund = {}) => ({ ok: true, cost, refund });
  switch (op.op) {
    case 'dig': {
      const { x, y } = op;
      if (!isInt(x) || !isInt(y)) return NG('位置が変');
      if (!inBuildArea(d, x, y)) return NG(areaReason(d, x, y));
      const c = cellAt(d, x, y);
      if (c === C.ROCK) return NG('岩は掘れない');
      if (c === C.OPEN) return NG('もう掘ってある');
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isOpen(d, x + dx, y + dy))) return NG('巣とつながっていない');
      if (countOpen(d) >= MAX_OPEN_CELLS) return NG('これ以上は広げられない');
      return ok();
    }
    case 'fill': {
      const { x, y } = op;
      if (!isInt(x) || !isInt(y) || !isOpen(d, x, y)) return NG('埋める所が無い');
      if (heldCells(d, null).has(y * d.w + x)) return NG(roomAt(d, x, y) ? '部屋は「撤去」で部屋ごと戻す' : '通路は「撤去」で通路ごと戻す');
      return afterCheck(d, op, ok());
    }
    case 'tunnel': {
      const { x, y, len, dir } = op;
      if (!isInt(x) || !isInt(y) || !isInt(len)) return NG('位置が変');
      if (!['h', 'v', 'slope'].includes(dir)) return NG('通路の向きが変');
      if (len < TUNNEL_MIN) return NG('通路が短すぎる');
      if (len > TUNNEL_MAX) return NG('通路が長すぎる');
      const cells = tunnelCells({ x, y, len, dir, s: op.s });
      let fresh = 0;
      for (const [cx, cy] of cells) {
        if (!inBuildArea(d, cx, cy)) return NG(areaReason(d, cx, cy));
        const c = cellAt(d, cx, cy);
        if (c === C.ROCK) return NG('岩がある');
        if (c === C.SOIL) fresh++;
      }
      if (!fresh) return NG('もう通れる');
      if (countOpen(d) + fresh > MAX_OPEN_CELLS) return NG('これ以上は広げられない');
      return afterCheck(d, op, ok());
    }
    case 'room': {
      const r = { x: op.x, y: op.y, w: op.w, h: op.h };
      const kind = op.kind || 'plain';
      if (![r.x, r.y, r.w, r.h].every(isInt)) return NG('位置が変');
      if (!KIND_COST[kind]) return NG('部屋の種類が変');
      const e = rectRules(d, r, null);
      if (e) return NG(e);
      return afterCheck(d, op, ok(addCost(ROOM_COST, KIND_COST[kind])));
    }
    case 'room-resize': {
      const room = d.rooms.find(q => q.id === op.id);
      if (!room) return NG('部屋が無い');
      const r = { x: op.x, y: op.y, w: op.w, h: op.h };
      if (![r.x, r.y, r.w, r.h].every(isInt)) return NG('位置が変');
      if (r.x === room.x && r.y === room.y && r.w === room.w && r.h === room.h) return NG('変わっていない');
      const e = rectRules(d, r, room.id);
      if (e) return NG(e);
      const ov = Math.max(0, Math.min(r.x + r.w, room.x + room.w) - Math.max(r.x, room.x)) * Math.max(0, Math.min(r.y + r.h, room.y + room.h) - Math.max(r.y, room.y));
      const added = r.w * r.h - ov;
      return afterCheck(d, op, ok(added > 0 ? { pebble: Math.ceil(added / 12) } : {}));
    }
    case 'set-kind': {
      const room = d.rooms.find(q => q.id === op.id);
      if (!room) return NG('部屋が無い');
      if (!KIND_COST[op.kind]) return NG('部屋の種類が変');
      if (room.kind === op.kind) return NG('もう' + KIND_NAME[op.kind] + 'だ');
      const fx = fixtureOf({ ...room, kind: op.kind });
      if (fx && d.objects.some(o => { const f = FURNITURE[o.type]; return f && overlap(fx, { x: o.x, y: o.y, w: f.w, h: f.h }); })) return NG('家具がじゃま');
      return ok(KIND_COST[op.kind]);
    }
    case 'place': {
      const f = FURNITURE[op.type];
      if (!f) return NG('知らない家具');
      if (!isInt(op.x) || !isInt(op.y)) return NG('位置が変');
      if (f.curio) {
        if (typeof op.item !== 'string' || !op.item) return NG('飾る物が無い');
        if (ctx && ctx.isCurio && !ctx.isCurio(op.item)) return NG('知らない品');
        if (ctx && ctx.owned && !ctx.owned.has(op.item)) return NG('図鑑に無い品は飾れない');
        if (d.objects.some(o => o.type === 'curio' && o.item === op.item)) return NG('もう この巣に飾ってある');
      }
      if (f.unlock && ctx && ctx.unlocks && !ctx.unlocks.has(op.type)) return NG('実績のごほうび（まだ使えない）');
      const e = objectFits(d, op, f, null);
      if (e) return NG(e);
      return ok(f.cost);
    }
    case 'remove': {
      const id = op.id;
      const kind = kindOfId(id);
      if (kind === 'fixture') return NG('部屋の種類を「ふつう」に戻すと片づく');
      const it = findById(d, id);
      if (!it) return NG('撤去するものが無い');
      if (kind === 'object') return ok({}, halfCost(FURNITURE[it.type] ? FURNITURE[it.type].cost : {}));
      if (kind === 'tunnel') {
        if (it.fixed) return NG('入口の縦穴は撤去できない');
        return afterCheck(d, op, ok());
      }
      if (kind === 'room') {
        let back = halfCost(addCost(ROOM_COST, KIND_COST[it.kind] || {}));
        for (const o of d.objects) if (inRect(it, o.x, o.y) && FURNITURE[o.type]) back = addCost(back, halfCost(FURNITURE[o.type].cost));
        return afterCheck(d, op, ok({}, back));
      }
      return NG('撤去できない');
    }
    default: return NG('知らない操作');
  }
}

function countOpen(d) { let n = 0; for (const c of cellsOf(d)) if (c === C.OPEN) n++; return n; }

function rectRules(d, r, selfId) {
  if (r.w < ROOM_MIN_W || r.h < ROOM_MIN_H) return `部屋は ${ROOM_MIN_W}×${ROOM_MIN_H} 以上`;
  if (r.w > ROOM_MAX_W || r.h > ROOM_MAX_H) return `部屋は ${ROOM_MAX_W}×${ROOM_MAX_H} まで`;
  if (r.y < d.surfaceY + 2) return '地表に近すぎる';
  if (r.x < 1 || r.x + r.w > d.w - 1) return '巣の外だ';
  if (r.y + r.h > d.h - 1) return '底は固くて掘れない';
  for (const o of d.rooms) if (o.id !== selfId && overlap(o, r)) return '部屋が重なる';
  for (const [x, y] of rectCells(r)) if (cellAt(d, x, y) === C.ROCK) return '岩がある';
  if (selfId) {   // 既にある家具・備え付けが新しい形でも収まるか
    const room = d.rooms.find(q => q.id === selfId);
    const nr = { ...room, ...r };
    const tmp = { ...d, rooms: d.rooms.map(q => q.id === selfId ? nr : q) };
    cache.set(tmp, cellsOf(d));
    for (const o of d.objects) {
      if (!inRect(room, o.x, o.y)) continue;
      const f = FURNITURE[o.type]; if (!f) continue;
      const e = objectFits(tmp, o, f, o.id);
      if (e) return '家具がはみ出る（' + e + '）';
    }
    const fx = fixtureOf(nr);
    if (fx && d.objects.some(o => { const f = FURNITURE[o.type]; return f && inRect(room, o.x, o.y) && overlap(fx, { x: o.x, y: o.y, w: f.w, h: f.h }); })) return KIND_NAME[nr.kind] + 'の場所に家具がある';
  }
  return null;
}

/** 操作を試しに当てて、つながりが保たれるか */
function afterCheck(d, op, res) {
  let next;
  try { next = applyRaw(d, op).data; } catch (e) { return NG(e.message); }
  if (countOpen(next) > MAX_OPEN_CELLS) return NG('これ以上は広げられない');
  if (!isConnected(next)) {
    const adds = op.op === 'tunnel' || op.op === 'room' || (op.op === 'room-resize');
    return NG(adds && countOpen(next) >= countOpen(d) ? '巣とつながっていない' : '通路が途切れてしまう');
  }
  return res;
}

// ───────── 操作の適用 ─────────
function applyRaw(d, op) {
  const nd = clone(d);
  const cells = new Uint8Array(cellsOf(d));
  const w = d.w;
  let created = null;
  const open = list => { for (const [x, y] of list) if (cells[y * w + x] !== C.ROCK) cells[y * w + x] = C.OPEN; };
  const closeExcept = (list, keepId) => {
    const held = heldCells(nd, keepId);
    for (const [x, y] of list) if (!held.has(y * w + x)) cells[y * w + x] = C.SOIL;
  };
  switch (op.op) {
    case 'dig': cells[op.y * w + op.x] = C.OPEN; break;
    case 'fill': cells[op.y * w + op.x] = C.SOIL; break;
    case 'tunnel': {
      const t = { id: 't' + nd.seq++, x: op.x, y: op.y, len: op.len, dir: op.dir };
      if (op.dir === 'slope') t.s = op.s === -1 ? -1 : 1;
      nd.tunnels.push(t); open(tunnelCells(t)); created = t.id; break;
    }
    case 'room': {
      const r = { id: 'r' + nd.seq++, kind: op.kind || 'plain', x: op.x, y: op.y, w: op.w, h: op.h };
      nd.rooms.push(r); open(rectCells(r)); created = r.id; break;
    }
    case 'room-resize': {
      const r = nd.rooms.find(q => q.id === op.id);
      const old = { ...r };
      Object.assign(r, { x: op.x, y: op.y, w: op.w, h: op.h });
      const gone = rectCells(old).filter(([x, y]) => !inRect(r, x, y));
      // いま部屋が持っているセルは残すので、縮んだ分だけ「この部屋以外が持っていなければ」土に
      const held = heldCells(nd, null);
      for (const [x, y] of gone) if (!held.has(y * w + x)) cells[y * w + x] = C.SOIL;
      open(rectCells(r));
      break;
    }
    case 'set-kind': { nd.rooms.find(q => q.id === op.id).kind = op.kind; break; }
    case 'place': {
      const o = { id: 'o' + nd.seq++, type: op.type, x: op.x, y: op.y, rot: op.rot ? 1 : 0 };
      if (op.type === 'curio' && op.item) o.item = String(op.item).slice(0, 32);
      nd.objects.push(o); created = o.id; break;
    }
    case 'remove': {
      const k = kindOfId(op.id);
      if (k === 'object') nd.objects = nd.objects.filter(o => o.id !== op.id);
      else if (k === 'tunnel') { const t = nd.tunnels.find(q => q.id === op.id); nd.tunnels = nd.tunnels.filter(q => q.id !== op.id); closeExcept(tunnelCells(t), null); }
      else if (k === 'room') {
        const r = nd.rooms.find(q => q.id === op.id);
        nd.rooms = nd.rooms.filter(q => q.id !== op.id);
        nd.objects = nd.objects.filter(o => !inRect(r, o.x, o.y));
        closeExcept(rectCells(r), null);
      } else throw new Error('撤去できない');
      break;
    }
    default: throw new Error('知らない操作');
  }
  nd.cells = encodeCells(cells);
  cache.set(nd, cells);
  return { data: nd, created };
}

/** 検査なしで当てる（サーバーで検査済みの操作を受け取ったとき）。data は書き換えず新しい data を返す */
export function applyOp(data, op) { return applyRaw(data, op); }

/** 検査して当てる。{ok, reason, data, cost, refund, created} */
export function tryOp(data, op, inv = null, ctx = null) {
  const v = validateOp(data, op, inv, ctx);
  if (!v.ok) return v;
  const r = applyRaw(data, op);
  return { ok: true, data: r.data, created: r.created, cost: v.cost || {}, refund: v.refund || {} };
}

/** 取り消し用の逆操作（配列。順に送る）。作れないときは null */
export function inverseOps(before, op, result) {
  switch (op.op) {
    case 'dig': return [{ op: 'fill', x: op.x, y: op.y }];
    case 'fill': return [{ op: 'dig', x: op.x, y: op.y }];
    case 'tunnel': case 'room': case 'place': return result && result.created ? [{ op: 'remove', id: result.created }] : null;
    case 'room-resize': { const r = before.rooms.find(q => q.id === op.id); return r ? [{ op: 'room-resize', id: r.id, x: r.x, y: r.y, w: r.w, h: r.h }] : null; }
    case 'set-kind': { const r = before.rooms.find(q => q.id === op.id); return r ? [{ op: 'set-kind', id: r.id, kind: r.kind }] : null; }
    case 'remove': {
      const it = findById(before, op.id);
      if (!it) return null;
      const k = kindOfId(op.id);
      if (k === 'object') return [{ op: 'place', type: it.type, x: it.x, y: it.y, rot: it.rot | 0, ...(it.item ? { item: it.item } : {}) }];
      if (k === 'tunnel') { const t = { op: 'tunnel', x: it.x, y: it.y, len: it.len, dir: it.dir }; if (it.dir === 'slope') t.s = it.s; return [t]; }
      if (k === 'room') return [{ op: 'room', x: it.x, y: it.y, w: it.w, h: it.h, kind: it.kind }];
      return null;
    }
  }
  return null;
}

/** 撤去ツールがカーソルの下に見つけるもの（家具 > 部屋 > 通路 > 掘ったセル） */
export function structureAt(data, x, y) {
  const o = objectAt(data, x, y);
  if (o) return o.fixture ? { kind: 'fixture', id: o.id, roomId: o.roomId, item: o } : { kind: 'object', id: o.id, item: o };
  const r = roomAt(data, x, y);
  if (r) return { kind: 'room', id: r.id, item: r };
  const w = data.w;
  for (let i = data.tunnels.length - 1; i >= 0; i--) {
    const t = data.tunnels[i];
    if (tunnelCells(t).some(([cx, cy]) => cx === x && cy === y)) return { kind: 'tunnel', id: t.id, item: t };
  }
  if (isOpen(data, x, y) && !(data.entrance.x === x && data.entrance.y === y)) return { kind: 'cell', id: null, x, y };
  void w;
  return null;
}

/** 部屋の辺（拡張ハンドル）：カーソル (fx,fy)（セル単位の小数）が辺の近くなら {room, edge:'l'|'r'|'t'|'b'} */
export function roomEdgeAt(data, fx, fy, tol = 0.4) {
  for (const r of data.rooms) {
    const inY = fy > r.y - tol && fy < r.y + r.h + tol, inX = fx > r.x - tol && fx < r.x + r.w + tol;
    if (inY && Math.abs(fx - r.x) < tol) return { room: r, edge: 'l' };
    if (inY && Math.abs(fx - (r.x + r.w)) < tol) return { room: r, edge: 'r' };
    if (inX && Math.abs(fy - r.y) < tol) return { room: r, edge: 't' };
    if (inX && Math.abs(fy - (r.y + r.h)) < tol) return { room: r, edge: 'b' };
  }
  return null;
}

/** 辺のドラッグ → 新しい矩形 */
export function resizeByEdge(room, edge, cellX, cellY) {
  let { x, y, w, h } = room;
  if (edge === 'l') { const nx = Math.min(cellX, x + w - 1); w = x + w - nx; x = nx; }
  if (edge === 'r') { w = Math.max(1, cellX - x + 1); }
  if (edge === 't') { const ny = Math.min(cellY, y + h - 1); h = y + h - ny; y = ny; }
  if (edge === 'b') { h = Math.max(1, cellY - y + 1); }
  return { x, y, w, h };
}

/** ドラッグ（始点・終点セル）→ 通路の操作。角度で横・縦・斜めを選ぶ */
export function tunnelFromDrag(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return null;
  if (ax >= 1 && ay >= 1 && Math.min(ax, ay) / Math.max(ax, ay) > 0.5) {
    // 斜め：上の端から下へ
    const len = Math.max(ax, ay) + 1;
    if (dy > 0) return { op: 'tunnel', x: x0, y: y0, len, dir: 'slope', s: dx > 0 ? 1 : -1 };
    return { op: 'tunnel', x: x0 + Math.sign(dx) * (len - 1), y: y0 - (len - 1), len, dir: 'slope', s: dx > 0 ? -1 : 1 };
  }
  if (ax >= ay) return { op: 'tunnel', x: Math.min(x0, x1), y: y0, len: ax + 1, dir: 'h' };
  return { op: 'tunnel', x: x0, y: Math.min(y0, y1), len: ay + 1, dir: 'v' };
}

/** 閲覧モード（横から歩く）用の問い合わせ。move.js の stepSide が使う */
export function nestQuery(data) {
  const w = data.w, h = data.h, slopes = slopeMap(data), climb = climbMap(data);
  const cells = cellsOf(data);
  const cellOpen = (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h && cells[cy * w + cx] === C.OPEN;
  return {
    w, h, cell: CELL, surfaceY: data.surfaceY, entrance: data.entrance,
    open: cellOpen,
    slope: (cx, cy) => slopes.get(cy * w + cx) || 0,
    climbable: (cx, cy) => cx >= 0 && cy >= 0 && cx < w && cy < h && climb.has(cy * w + cx),
    /** ピクセル (px,py) が固いか（土・岩・空・坂の下側） */
    solid(px, py) {
      const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
      if (!cellOpen(cx, cy)) return true;
      const s = slopes.get(cy * w + cx);
      if (!s) return false;
      const lx = px - cx * CELL, ly = py - cy * CELL;
      return s > 0 ? ly >= lx : ly >= CELL - lx;
    },
    room: (cx, cy) => roomAt(data, cx, cy),
  };
}
