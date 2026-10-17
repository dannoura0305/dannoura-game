// 層 2「道」（07 §4.2）：折れ線 → なめらかな線（Catmull-Rom）→ 道の高さ（ならして坂の上限）→ 地形を平らにする。DOM・three.js なし。
import { pointSeg } from '../core/geom.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 折れ線 [[x,z]…] → step m ごとの点（Catmull-Rom・端の点は通る） */
export function resample(points, step = 1) {
  if (points.length < 2) return points.map(p => p.slice());
  const P = [points[0], ...points, points[points.length - 1]], dense = [];
  for (let i = 1; i + 2 < P.length; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(L / (step * 0.25)));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[points.length - 1].slice());
  const out = [dense[0]]; let acc = 0;                                // 弧の長さで step ごとに取り直す
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1], b = dense[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let t0 = 0;
    while (acc + L * (1 - t0) >= step) { const need = step - acc, t = t0 + need / L; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); t0 = t; acc = 0; }
    acc += L * (1 - t0);
  }
  const last = points[points.length - 1], o = out[out.length - 1];
  if (Math.hypot(last[0] - o[0], last[1] - o[1]) > step * 0.3) out.push(last.slice()); else out[out.length - 1] = last.slice();
  return out;
}

/** 道の高さ：地形からとって、ならし（前後 win 点の平均を 2 回）、隣との差を tan(maxSlope)×間隔 に収める */
export function profile(hf, pts, maxSlope = 20, win = 5, fixStart = null) {
  let h = pts.map(p => hf.at(p[0], p[1]));
  for (let pass = 0; pass < 2; pass++) h = h.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - win); k <= Math.min(h.length - 1, i + win); k++) { s += h[k]; n++; } return s / n; });
  if (fixStart != null) h[0] = fixStart;
  const seg = i => Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), t = Math.tan(maxSlope * Math.PI / 180) * 0.95;
  for (let it = 0; it < 20; it++) {
    let changed = false;
    for (let i = 1; i < h.length; i++) { const m = t * seg(i), c = Math.max(h[i - 1] - m, Math.min(h[i - 1] + m, h[i])); if (Math.abs(c - h[i]) > 1e-6) { h[i] = c; changed = true; } }
    if (fixStart == null) for (let i = h.length - 2; i >= 0; i--) { const m = t * seg(i + 1), c = Math.max(h[i + 1] - m, Math.min(h[i + 1] + m, h[i])); if (Math.abs(c - h[i]) > 1e-6) { h[i] = c; changed = true; } }
    if (!changed) break;
  }
  return pts.map((p, i) => [p[0], h[i], p[1]]);
}

/** 一番近い道の点（線の上の高さも）。pts3 は [[x,y,z]…] */
export function nearestOnPath(pts3, x, z) {
  let best = { d: Infinity };
  for (let i = 0; i + 1 < pts3.length; i++) {
    const a = pts3[i], b = pts3[i + 1], q = pointSeg(x, z, a[0], a[2], b[0], b[2]);
    if (q.d < best.d) best = { d: q.d, y: a[1] + (b[1] - a[1]) * q.t, i, t: q.t, x: q.x, z: q.z };
  }
  return best;
}

/** 地形を道に合わせる：芯（幅/2＋0.5）は道の高さ、その外 shoulder m で元へ戻す。protect(x,z)→true の所は触らない */
export function carvePath(hf, pts3, width, shoulder = 3, protect = null) {
  const core = width / 2 + 0.5, R = core + shoulder, { nx, nz, cell } = hf;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of pts3) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  const i0 = Math.max(0, Math.floor((x0 - R) / cell)), i1 = Math.min(nx - 1, Math.ceil((x1 + R) / cell)), j0 = Math.max(0, Math.floor((z0 - R) / cell)), j1 = Math.min(nz - 1, Math.ceil((z1 + R) / cell));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = i * cell, z = j * cell; if (protect && protect(x, z)) continue;
    const q = nearestOnPath(pts3, x, z); if (q.d >= R) continue;
    const w = 1 - smooth(core, R, q.d), k = j * nx + i; hf.data[k] += (q.y - hf.data[k]) * w;
  }
}

/** 円の範囲を高さ y に（start の広場など）。r の外 blend m で戻す */
export function flattenCircle(hf, cx, cz, r, y, blend = 3, protect = null) {
  const { nx, nz, cell } = hf, R = r + blend;
  for (let j = Math.max(0, Math.floor((cz - R) / cell)); j <= Math.min(nz - 1, Math.ceil((cz + R) / cell)); j++) for (let i = Math.max(0, Math.floor((cx - R) / cell)); i <= Math.min(nx - 1, Math.ceil((cx + R) / cell)); i++) {
    const x = i * cell, z = j * cell; if (protect && protect(x, z)) continue;
    const d = Math.hypot(x - cx, z - cz); if (d >= R) continue;
    const w = 1 - smooth(r, R, d), k = j * nx + i; hf.data[k] += (y - hf.data[k]) * w;
  }
}
