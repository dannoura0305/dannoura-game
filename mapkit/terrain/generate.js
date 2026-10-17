// 手続きの地形（高さマップが無い時の fallback・gen_heightmap.mjs の中身）。DOM・three.js なし・種で決まる。
// 07 §4.2 の層 1「地形（高さ・川で削る）」。流れ：
//   1. 下地：大きな波（低地）＋遊ぶ所（道・建物・スタート）から離れるほど高くなる山（fBm）＋縁の山並み
//   2. 侵食：熱（崩れ：安息角を越えた分を下へ）＋水（雨粒が流れて削る・溜める）の簡単な物
//   3. 地形の特徴（spec.terrain.features）：cliff（崖）・valley_flat（平らな谷）・river（川の溝）・pond（池のくぼみ）・ridge（尾根）・plateau（台地）
// 道を平らにする・建物の土台（段）は層 2・3（mapkit/pcg/paths.js・layout.js）。Gaea などで作った高さマップを使う時は 1〜3 は済んでいる前提。
import { Heightfield } from './heightmap.js';
import { childRng, rng as mkRng } from '../core/rng.js';
import { pointSeg } from '../core/geom.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 種つきの勾配ノイズ（2D・-1〜1 くらい） */
export function makeNoise(r) {
  const perm = new Uint16Array(512), gx = new Float32Array(256), gz = new Float32Array(256);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; gx[i] = Math.cos(a); gz[i] = Math.sin(a); }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, X = xi & 255, Z = zi & 255;
    const g = (ix, iz, dx, dz) => { const h = perm[perm[ix] + iz]; return gx[h] * dx + gz[h] * dz; };
    const u = fade(xf), v = fade(zf);
    const a = g(X, Z, xf, zf), b = g(X + 1, Z, xf - 1, zf), c = g(X, Z + 1, xf, zf - 1), d = g(X + 1, Z + 1, xf - 1, zf - 1);
    return ((a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v) * 1.41;
  };
}
/** fBm（octaves 段・scale m で 1 周期の大きさ） */
export function fbm(noise, x, z, octaves = 5, scale = 90) {
  let s = 0, a = 1, f = 1 / scale, n = 0;
  for (let o = 0; o < octaves; o++) { s += a * noise(x * f + o * 17.3, z * f - o * 9.1); n += a; a *= 0.5; f *= 2; }
  return s / n;
}

/** 遊ぶ所（道・建物・スタート）までの距離の関数 */
function playDistance(spec) {
  const segs = [];
  for (const p of spec.paths || []) for (let i = 0; i + 1 < p.points.length; i++) segs.push([p.points[i], p.points[i + 1], (p.width || 2) / 2]);
  const pts = (spec.buildings || []).map(b => [b.at, Math.hypot(...(b.footprint || [4, 4])) / 2 + 4]);
  const st = spec.gameplay && spec.gameplay.start; if (st) pts.push([st, 6]);
  return (x, z) => {
    let d = Infinity;
    for (const [a, b, r] of segs) d = Math.min(d, pointSeg(x, z, a[0], a[1], b[0], b[1]).d - r);
    for (const [c, r] of pts) d = Math.min(d, Math.hypot(x - c[0], z - c[1]) - r);
    return Math.max(0, d);
  };
}

/** 熱の侵食：隣との差が talus（m／升目）を越えた分の rate を低い方へ */
export function thermalErosion(hf, iters = 20, talusDeg = 40, rate = 0.25, mask = null) {
  const { nx, nz } = hf, talus = Math.tan(talusDeg * Math.PI / 180) * hf.cell, d = hf.data, delta = new Float32Array(d.length);
  for (let it = 0; it < iters; it++) {
    delta.fill(0);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; if (mask && !mask[k]) continue;
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        const i2 = i + di, j2 = j + dj; if (i2 >= nx || j2 >= nz) continue;
        const k2 = j2 * nx + i2; if (mask && !mask[k2]) continue;
        const diff = d[k] - d[k2];
        if (Math.abs(diff) > talus) { const m = (Math.abs(diff) - talus) * rate * 0.5 * Math.sign(diff); delta[k] -= m; delta[k2] += m; }
      }
    }
    for (let k = 0; k < d.length; k++) d[k] += delta[k];
  }
  return hf;
}

/** 水の侵食（雨粒）：粒が坂を下り、速さと水の量で決まる運べる量より少なければ削り、多ければ溜める */
export function hydraulicErosion(hf, r, drops = 20000, opt = {}) {
  const { nx, nz, cell } = hf, d = hf.data;
  const P = Object.assign({ inertia: 0.05, capacity: 4, minSlope: 0.01, deposit: 0.3, erode: 0.3, evaporate: 0.02, gravity: 4, life: 40, maxStep: 0.6 }, opt);
  const hgt = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, k = j * nx + i; return { h: (d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + nx] * (1 - u) + d[k + nx + 1] * u) * v, gx: ((d[k + 1] - d[k]) * (1 - v) + (d[k + nx + 1] - d[k + nx]) * v), gz: ((d[k + nx] - d[k]) * (1 - u) + (d[k + nx + 1] - d[k + 1]) * u) }; };
  const add = (x, z, amt) => { const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, k = j * nx + i; d[k] += amt * (1 - u) * (1 - v); d[k + 1] += amt * u * (1 - v); d[k + nx] += amt * (1 - u) * v; d[k + nx + 1] += amt * u * v; };
  for (let n = 0; n < drops; n++) {
    let x = 1 + r() * (nx - 3), z = 1 + r() * (nz - 3), dx = 0, dz = 0, speed = 1, water = 1, sed = 0;
    for (let s = 0; s < P.life; s++) {
      const a = hgt(x, z);
      dx = dx * P.inertia - a.gx * (1 - P.inertia); dz = dz * P.inertia - a.gz * (1 - P.inertia);
      const L = Math.hypot(dx, dz); if (L < 1e-9) break; dx /= L; dz /= L;
      const x2 = x + dx, z2 = z + dz; if (x2 < 1 || z2 < 1 || x2 >= nx - 2 || z2 >= nz - 2) break;
      const dh = hgt(x2, z2).h - a.h;
      const cap = Math.max(-dh, P.minSlope) * speed * water * P.capacity;
      if (sed > cap || dh > 0) { const dep = dh > 0 ? Math.min(dh, sed) : (sed - cap) * P.deposit; sed -= dep; add(x, z, dep); }
      else { const er = Math.min((cap - sed) * P.erode, -dh, P.maxStep / cell); add(x, z, -er); sed += er; }
      speed = Math.sqrt(Math.max(0.01, speed * speed - dh * P.gravity)); water *= 1 - P.evaporate; x = x2; z = z2;
    }
  }
  return hf;
}

/** 地形の特徴を足す（spec.terrain.features）。戻り値：特徴ごとの記録 */
export function applyFeatures(hf, features = [], log = []) {
  const { nx, nz, cell } = hf, d = hf.data;
  const each = fn => { for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) fn(i * cell, j * cell, j * nx + i); };
  const sideNormal = (a, b, side) => {           // 線の向きの左右の法線のうち、side の向きに近い方
    const tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1, n1 = [-tz / L, tx / L];
    const want = { north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] }[side || 'north'];
    return n1[0] * want[0] + n1[1] * want[1] >= 0 ? n1 : [-n1[0], -n1[1]];
  };
  const nearest = (path, x, z) => {               // 折れ線の一番近い点（線の外への延長の距離 over も）
    let best = { d: Infinity };
    for (let s = 0; s + 1 < path.length; s++) { const a = path[s], b = path[s + 1], q = pointSeg(x, z, a[0], a[1], b[0], b[1]); if (q.d < best.d) best = Object.assign(q, { s, a, b }); }
    return best;
  };
  for (const f of features) {
    if (f.type === 'cliff' && f.path) {
      const H = f.height || 10, soft = 1.6;
      each((x, z, k) => {
        const q = nearest(f.path, x, z), n = sideNormal(q.a, q.b, f.side);
        const s = (x - q.x) * n[0] + (z - q.z) * n[1];
        const tx = q.b[0] - q.a[0], tz = q.b[1] - q.a[1], L = Math.hypot(tx, tz);
        let over = 0;                                     // 両端の外側：崖を 25m かけて下げる（端の回り込み）
        if (q.t <= 0 && q.s === 0) over = -((x - q.a[0]) * tx + (z - q.a[1]) * tz) / L;
        if (q.t >= 1 && q.s === f.path.length - 2) over = ((x - q.b[0]) * tx + (z - q.b[1]) * tz) / L;
        const w = smooth(-soft, soft, s) * (1 - smooth(35, 70, s)) * (1 - smooth(0, 25, over));
        d[k] += H * w;
      });
      log.push({ type: 'cliff', height: H });
    } else if (f.type === 'valley_flat' && f.center) {
      const R = f.radius || 30, [cx, cz] = f.center; let s = 0, n = 0;
      each((x, z, k) => { if (Math.hypot(x - cx, z - cz) < R * 0.5) { s += d[k]; n++; } });
      const hc = n ? s / n : hf.at(cx, cz), keep = 0.12;
      each((x, z, k) => { const w = 1 - smooth(R * 0.55, R, Math.hypot(x - cx, z - cz)); if (w > 0) d[k] = d[k] + (hc + (d[k] - hc) * keep - d[k]) * w; });
      const lim = slopeLimit(hf, (x, z) => Math.hypot(x - cx, z - cz) < R * 0.8, f.maxSlope || 8);
      log.push({ type: 'valley_flat', height: hc, slopeIters: lim });
    } else if ((f.type === 'river' || f.type === 'ridge') && f.path) {
      const W = (f.width || 4) / 2, H = f.height || (f.type === 'river' ? 1.5 : 6), sign = f.type === 'river' ? -1 : 1, fall = f.type === 'river' ? W + 3 : W + 18;
      each((x, z, k) => { const q = nearest(f.path, x, z); const w = 1 - smooth(W * 0.6, fall, q.d); if (w > 0) d[k] += sign * H * w; });
      log.push({ type: f.type, depth: H });
    } else if ((f.type === 'pond' || f.type === 'plateau') && f.center) {
      const R = f.radius || 10, [cx, cz] = f.center, target = hf.at(cx, cz) + (f.type === 'pond' ? -(f.height || 1.2) : (f.height || 4));
      each((x, z, k) => { const w = 1 - smooth(R * 0.7, R * 1.3, Math.hypot(x - cx, z - cz)); if (w > 0) d[k] += (target - d[k]) * w; });
      log.push({ type: f.type, height: target });
    }
  }
  return log;
}

/** 坂の上限：inside(x,z) の所の隣どうしの差を tan(maxDeg)×升目 に収まるまで平らにする（最大 400 回）。戻り値：回数 */
export function slopeLimit(hf, inside, maxDeg, maxIters = 400) {
  const { nx, nz, cell } = hf, d = hf.data, lim = Math.tan(maxDeg * Math.PI / 180) * cell * 0.92;
  const ks = []; for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) if (inside(i * cell, j * cell)) ks.push(j * nx + i);
  let it = 0;
  for (; it < maxIters; it++) {
    let worst = 0;
    for (const k of ks) {
      const nb = [d[k - 1], d[k + 1], d[k - nx], d[k + nx]];
      let m = 0; for (const v of nb) m = Math.max(m, Math.abs(d[k] - v));
      if (m > lim) { d[k] = d[k] * 0.5 + (nb[0] + nb[1] + nb[2] + nb[3]) / 8; worst = Math.max(worst, m); }
    }
    if (worst <= lim) break;
  }
  return it;
}

/**
 * 仕様 → 地形（Heightfield）。opt = { cell: 1, erosion: true, drops }
 * 範囲は terrain.source（minY・maxY）、下地は terrain.fallback（octaves・scale・amp）。
 */
export function generateTerrain(spec, opt = {}) {
  const cell = opt.cell || 1, W = spec.size.w, D = spec.size.d;
  const nx = Math.round(W / cell) + 1, nz = Math.round(D / cell) + 1;
  const src = (spec.terrain && spec.terrain.source) || {}, fb = (spec.terrain && spec.terrain.fallback) || {};
  const minY = src.minY ?? 0, maxY = src.maxY ?? 60, range = maxY - minY;
  const hf = new Heightfield({ nx, nz, cell, minY, maxY });
  const n1 = makeNoise(childRng(spec.seed, 'terrain.base')), n2 = makeNoise(childRng(spec.seed, 'terrain.hills'));
  const oct = fb.octaves || 5, scale = fb.scale || 90, amp = fb.amp ?? range * 0.6;
  const dist = playDistance(spec), log = [];
  if ((fb.type || 'noise') === 'flat') hf.data.fill(fb.y ?? minY + range * 0.2);
  else for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = i * cell, z = j * cell;
    const low = minY + range * 0.18 + amp * 0.22 * fbm(n1, x, z, 2, scale * 2.2);
    const far = smooth(4, 55, dist(x, z));
    const hills = amp * far * (0.55 + 0.75 * fbm(n2, x, z, oct, scale));
    const e = Math.min(x, z, W - x, D - z) / Math.min(W, D);
    const rim = amp * 0.55 * (1 - smooth(0.0, 0.14, e));
    hf.set(i, j, low + Math.max(0, hills) + rim);
  }
  if (opt.erosion !== false && (fb.type || 'noise') !== 'flat') {
    thermalErosion(hf, 12, 42, 0.3);
    hydraulicErosion(hf, childRng(spec.seed, 'terrain.rain'), opt.drops ?? Math.round(nx * nz * 0.35));
    thermalErosion(hf, 6, 45, 0.25);
    log.push({ type: 'erosion', drops: opt.drops ?? Math.round(nx * nz * 0.35) });
  }
  applyFeatures(hf, (spec.terrain && spec.terrain.features) || [], log);
  for (let k = 0; k < hf.data.length; k++) hf.data[k] = Math.max(minY + 0.5, Math.min(maxY - 0.5, hf.data[k]));
  hf.log = log;
  return hf;
}
export { mkRng as _rng };
