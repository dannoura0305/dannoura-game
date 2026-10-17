// 歩ける格子と道のり（07 §4.5 の到達：0.5m の升目・坂 35° まで・段差 0.4m まで）。DOM・three.js なし。
// 検査（validate.js）と遊ぶ時の道案内（runtime）が同じ物を使う。
import { RULES } from '../pcg/rules.js';

/** 格子を作る。戻り値：{ nx, nz, cell, y: Float32Array, ok: Uint8Array, center(i,j) } */
export function buildWalkGrid(world, opt = {}) {
  const P = Object.assign({}, RULES.walk, opt), cell = P.cell, nx = Math.floor(world.W / cell), nz = Math.floor(world.D / cell);
  const y = new Float32Array(nx * nz), ok = new Uint8Array(nx * nz), hf = world.hf, margin = opt.margin ?? 0.75;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * cell, z = (j + 0.5) * cell, k = j * nx + i;
    if (x < margin || z < margin || x > world.W - margin || z > world.D - margin) { y[k] = hf.at(x, z); continue; }
    const f = world.floorAt(x, z), g = hf.at(x, z), sy = f && f.top > g ? f.top : g; y[k] = sy;
    if (!(f && f.top >= g - 0.05) && hf.slopeDeg(x, z) > P.maxSlope) continue;
    if (world.blocked(x, z, sy, P.radius)) continue;
    ok[k] = 1;
  }
  const tanS = Math.tan(P.maxSlope * Math.PI / 180) * 1.1;
  return { nx, nz, cell, y, ok, step: P.step, tanS, center: (i, j) => [(i + 0.5) * cell, (j + 0.5) * cell] };
}
const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
/** 隣へ行けるか（段差・坂・斜めは角を切らない） */
export function canStep(G, i, j, di, dj) {
  const i2 = i + di, j2 = j + dj; if (i2 < 0 || j2 < 0 || i2 >= G.nx || j2 >= G.nz) return false;
  const a = j * G.nx + i, b = j2 * G.nx + i2; if (!G.ok[b]) return false;
  if (di && dj && (!G.ok[j * G.nx + i2] || !G.ok[j2 * G.nx + i])) return false;
  const dist = G.cell * (di && dj ? Math.SQRT2 : 1), dy = Math.abs(G.y[b] - G.y[a]);
  return dy <= Math.max(G.step, dist * G.tanS);
}
/** (x,z) に一番近い歩ける升目（maxR m まで）。戻り値：升目の番号か -1 */
export function nearestCell(G, x, z, maxR = 1.5, y = null) {
  const ci = Math.floor(x / G.cell), cj = Math.floor(z / G.cell), R = Math.ceil(maxR / G.cell);
  let best = -1, bd = Infinity;
  for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
    if (i < 0 || j < 0 || i >= G.nx || j >= G.nz) continue; const k = j * G.nx + i; if (!G.ok[k]) continue;
    const [cx, cz] = G.center(i, j); let d = Math.hypot(cx - x, cz - z); if (y != null) d += Math.abs(G.y[k] - y) * 2;
    if (d < bd && Math.hypot(cx - x, cz - z) <= maxR) { bd = d; best = k; }
  }
  return best;
}
/** ダイクストラ（升目の番号の並び sources から）。戻り値：Float64Array の道のり（m・届かない所は Infinity） */
export function distanceField(G, sources) {
  const n = G.nx * G.nz, dist = new Float64Array(n).fill(Infinity), heap = new Heap();
  for (const s of sources) if (s >= 0) { dist[s] = 0; heap.push(s, 0); }
  while (heap.size) {
    const [k, d] = heap.pop(); if (d > dist[k]) continue;
    const i = k % G.nx, j = (k - i) / G.nx;
    for (const [di, dj, w] of N8) {
      if (!canStep(G, i, j, di, dj)) continue;
      const k2 = (j + dj) * G.nx + i + di, nd = d + w * G.cell; if (nd < dist[k2]) { dist[k2] = nd; heap.push(k2, nd); }
    }
  }
  return dist;
}
/** 距離の場を下って sources へ行く道（升目の中心 [x,y,z] の並び）。max 点まで */
export function descend(G, dist, k, max = 4000) {
  const out = []; if (k < 0 || !isFinite(dist[k])) return out;
  for (let n = 0; n < max; n++) {
    const i = k % G.nx, j = (k - i) / G.nx, [x, z] = G.center(i, j); out.push([x, G.y[k], z]);
    if (dist[k] === 0) break;
    let best = k, bd = dist[k];
    for (const [di, dj] of N8) { if (!canStep(G, i, j, di, dj)) continue; const k2 = (j + dj) * G.nx + i + di; if (dist[k2] < bd) { bd = dist[k2]; best = k2; } }
    if (best === k) break; k = best;
  }
  return out;
}
/**
 * A*（升目 s → t・8 方向・octile の見積もり）。距離の場（distanceField）を全部作るより速い：敵の追跡で 0.3 秒ごとに使う。
 * maxExpand 個を開いても着かない時は、t に一番近づいた升目までの道を返す（partial: true）。
 * 戻り値：{ cells: [k…]（s から t の順）, cost（m）, partial, expanded }。同じ入力なら同じ答え（同じ重みの時の順は升目の番号で決まる）
 */
export function findPath(G, s, t, { maxExpand = 30000 } = {}) {
  if (s < 0 || t < 0) return { cells: [], cost: Infinity, partial: true, expanded: 0 };
  const n = G.nx * G.nz;
  let A = G._astar; if (!A) A = G._astar = { g: new Float64Array(n).fill(Infinity), from: new Int32Array(n).fill(-1), closed: new Uint8Array(n), touched: [] };
  for (const k of A.touched) { A.g[k] = Infinity; A.from[k] = -1; A.closed[k] = 0; } A.touched.length = 0;
  const ti = t % G.nx, tj = (t - ti) / G.nx, D = G.cell, D2 = G.cell * Math.SQRT2;
  const hEst = k => { const i = k % G.nx, j = (k - i) / G.nx, dx = Math.abs(i - ti), dz = Math.abs(j - tj); return D * (dx + dz) + (D2 - 2 * D) * Math.min(dx, dz); };
  const heap = new Heap(); A.g[s] = 0; A.touched.push(s); heap.push(s, hEst(s));
  let best = s, bestH = hEst(s), expanded = 0;
  while (heap.size) {
    const [k] = heap.pop(); if (A.closed[k]) continue; A.closed[k] = 1; expanded++;
    if (k === t) { best = k; bestH = 0; break; }
    const hk = hEst(k); if (hk < bestH) { bestH = hk; best = k; }
    if (expanded >= maxExpand) break;
    const i = k % G.nx, j = (k - i) / G.nx;
    for (const [di, dj, w] of N8) {
      if (!canStep(G, i, j, di, dj)) continue;
      const k2 = (j + dj) * G.nx + i + di; if (A.closed[k2]) continue;
      const ng = A.g[k] + w * G.cell;
      if (ng < A.g[k2]) { if (A.g[k2] === Infinity) A.touched.push(k2); A.g[k2] = ng; A.from[k2] = k; heap.push(k2, ng + hEst(k2)); }
    }
  }
  const cells = []; for (let k = best; k >= 0; k = A.from[k]) { cells.push(k); if (k === s) break; }
  cells.reverse();
  return { cells, cost: A.g[best], partial: best !== t, expanded };
}
/** 升目の番号 → [x, y, z]（升目の中心・歩く面の高さ） */
export function cellPos(G, k) { const i = k % G.nx, j = (k - i) / G.nx; return [(i + 0.5) * G.cell, G.y[k], (j + 0.5) * G.cell]; }

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(k, v) { const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v); while (i > 0) { const p = (i - 1) >> 1; if (V[p] <= v) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = k; V[i] = v; }
  pop() {
    const K = this.k, V = this.v, rk = K[0], rv = V[0], lk = K.pop(), lv = V.pop(), n = K.length;
    if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && V[c + 1] < V[c]) c++; if (V[c] >= lv) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = lk; V[i] = lv; }
    return [rk, rv];
  }
}
