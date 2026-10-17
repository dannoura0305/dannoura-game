// 形の交差と当たり（DOM・three.js なし）。docs/wakaba-mapkit/07 §1。
// 前半は境界侵食の shinshoku/world/collide.js から移した物（挙動は同じ。作品側は再輸出するだけ）：
//   区画の壁・建物は軸に沿った箱（AABB）。キャラクターは「カプセル」＝ XZ 平面の円（半径 r）＋高さ。地面は y=0 の平ら。
//   box = { minX, maxX, minY, maxY, minZ, maxZ }
// 後半は mapkit の追加：回った箱（OBB）・多角形・線分・円の交差と距離（配置の検査・地形の上の当たり）。
export function box(cx, cz, w, d, h = 3, y0 = 0) {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: y0, maxY: y0 + h };
}

/** 円を箱から押し出す（数回繰り返す）。pos は {x,z} を書き換える。戻り値：当たったか */
export function resolveCircle(pos, r, boxes, height = 1.6, iters = 3) {
  let hit = false;
  for (let k = 0; k < iters; k++) {
    let moved = false;
    for (const b of boxes) {
      if (b.maxY <= 0.25 || b.minY >= height) continue;           // 足元の低い物・頭の上は無視
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2), push = r - d;
        pos.x += dx / d * push; pos.z += dz / d * push;
      } else {                                                     // 中心が箱の中：一番近い面へ
        const opts = [[pos.x - b.minX + r, -1, 0], [b.maxX - pos.x + r, 1, 0], [pos.z - b.minZ + r, 0, -1], [b.maxZ - pos.z + r, 0, 1]];
        opts.sort((a, c) => a[0] - c[0]);
        pos.x += opts[0][1] * opts[0][0]; pos.z += opts[0][2] * opts[0][0];
      }
      hit = moved = true;
    }
    if (!moved) break;
  }
  return hit;
}

/** 点が箱の中か（XZ） */
export function insideAny(p, boxes, r = 0, height = 1.6) {
  for (const b of boxes) {
    if (b.maxY <= 0.25 || b.minY >= height) continue;
    if (p.x > b.minX - r && p.x < b.maxX + r && p.z > b.minZ - r && p.z < b.maxZ + r) return true;
  }
  return false;
}

/** 3D の光線と箱。o,d は {x,y,z}（d は正規化）。最も近い交点までの距離（無ければ Infinity） */
export function rayBoxes(o, d, maxT, boxes) {
  let best = maxT;
  for (const b of boxes) {
    let t0 = 0, t1 = best, ok = true;
    for (const [oa, da, mn, mx] of [[o.x, d.x, b.minX, b.maxX], [o.y, d.y, b.minY, b.maxY], [o.z, d.z, b.minZ, b.maxZ]]) {
      if (Math.abs(da) < 1e-9) { if (oa < mn || oa > mx) { ok = false; break; } continue; }
      let ta = (mn - oa) / da, tb = (mx - oa) / da; if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < best) best = t0;
  }
  return best;
}

/** 2点の間に壁があるか（目の高さ y） */
export function lineOfSight(a, b, boxes, y = 1.4) {
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
  if (L < 1e-6) return true;
  return rayBoxes({ x: a.x, y, z: a.z }, { x: dx / L, y: 0, z: dz / L }, L, boxes) >= L - 1e-3;
}

/** 光線と円柱（敵の体）・球（弱点）の交差。戻り値 t か Infinity */
export function rayCylinder(o, d, c, r, h, maxT) {
  const ox = o.x - c.x, oz = o.z - c.z;
  const A = d.x * d.x + d.z * d.z, B = 2 * (ox * d.x + oz * d.z), Cc = ox * ox + oz * oz - r * r;
  if (A < 1e-9) return Infinity;
  const disc = B * B - 4 * A * Cc; if (disc < 0) return Infinity;
  const s = Math.sqrt(disc);
  for (const t of [(-B - s) / (2 * A), (-B + s) / (2 * A)]) {
    if (t < 0 || t > maxT) continue;
    const y = o.y + d.y * t; if (y >= (c.y || 0) && y <= (c.y || 0) + h) return t;
  }
  return Infinity;
}
export function raySphere(o, d, c, r, maxT) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const B = ox * d.x + oy * d.y + oz * d.z, Cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = B * B - Cc; if (disc < 0) return Infinity;
  const t = -B - Math.sqrt(disc); return t >= 0 && t <= maxT ? t : Infinity;
}

// ───────────── mapkit の追加：回った箱（OBB）と多角形（XZ 平面） ─────────────
// obb = { cx, cz, hx, hz, rot }（rot はラジアン・Y 軸。ローカルの (0,1)＝前 は世界の (sin rot, cos rot)）。高さは呼ぶ側（minY/maxY）で持つ。

/** 角度 deg → OBB の回転（ラジアン） */
export const deg = d => d * Math.PI / 180;
/** ローカル (u, v) → 世界 [x, z]（rot ラジアン） */
export function toWorld(cx, cz, rot, u, v) { const c = Math.cos(rot), s = Math.sin(rot); return [cx + u * c + v * s, cz - u * s + v * c]; }
/** 世界 → ローカル [u, v] */
export function toLocal(cx, cz, rot, x, z) { const c = Math.cos(rot), s = Math.sin(rot), dx = x - cx, dz = z - cz; return [dx * c - dz * s, dx * s + dz * c]; }
/** OBB の 4 隅（反時計回りとは限らない・凸） */
export function obbCorners(o) { return [[-o.hx, -o.hz], [o.hx, -o.hz], [o.hx, o.hz], [-o.hx, o.hz]].map(([u, v]) => toWorld(o.cx, o.cz, o.rot || 0, u, v)); }
/** OBB を囲む AABB [minX, minZ, maxX, maxZ] */
export function obbBounds(o) { const c = Math.abs(Math.cos(o.rot || 0)), s = Math.abs(Math.sin(o.rot || 0)); const ex = o.hx * c + o.hz * s, ez = o.hx * s + o.hz * c; return [o.cx - ex, o.cz - ez, o.cx + ex, o.cz + ez]; }

/** 点が OBB の中か（pad だけ広げる） */
export function pointInObb(x, z, o, pad = 0) { const [u, v] = toLocal(o.cx, o.cz, o.rot || 0, x, z); return Math.abs(u) <= o.hx + pad && Math.abs(v) <= o.hz + pad; }

/** 2 つの OBB が交わるか（分離軸） */
export function obbOverlap(a, b) {
  const A = obbCorners(a), B = obbCorners(b);
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const e = [P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]], n = [-e[1], e[0]];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of A) { const d = p[0] * n[0] + p[1] * n[1]; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const p of B) { const d = p[0] * n[0] + p[1] * n[1]; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}

/** 多角形の面積（符号なし） */
export function polyArea(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; }
const ccw = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s >= 0 ? P : P.slice().reverse(); };
/** 凸多角形どうしの重なり（Sutherland–Hodgman） */
export function clipConvex(subject, clip) {
  let out = ccw(subject); const C = ccw(clip);
  for (let i = 0; i < C.length && out.length; i++) {
    const a = C[i], b = C[(i + 1) % C.length], inp = out; out = [];
    const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
  }
  return out;
}
/** 2 つの OBB の重なりの面積（XZ） */
export function obbOverlapArea(a, b) { if (!obbOverlap(a, b)) return 0; const P = clipConvex(obbCorners(a), obbCorners(b)); return P.length >= 3 ? polyArea(P) : 0; }

/** 点と線分の距離（XZ）。戻り値 { d, t, x, z } */
export function pointSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  let t = L2 > 1e-12 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, z = az + dz * t; return { d: Math.hypot(px - x, pz - z), t, x, z };
}
/** 2 本の線分が交わるか */
export function segsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
/** 点が多角形の中か（偶奇） */
export function pointInPoly(x, z, P) { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } return inside; }
/** 凸多角形と線分の距離（交われば 0） */
export function polySegDist(P, a, b) {
  if (pointInPoly(a[0], a[1], P) || pointInPoly(b[0], b[1], P)) return 0;
  let d = Infinity;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length];
    if (segsCross(p, q, a, b)) return 0;
    d = Math.min(d, pointSeg(p[0], p[1], a[0], a[1], b[0], b[1]).d, pointSeg(a[0], a[1], p[0], p[1], q[0], q[1]).d, pointSeg(b[0], b[1], p[0], p[1], q[0], q[1]).d);
  }
  return d;
}
/** OBB とカプセル（線分＋半径 r）が交わるか */
export const obbCapsule = (o, a, b, r) => polySegDist(obbCorners(o), a, b) < r;
/** OBB と円が交わるか */
export function obbCircle(o, x, z, r) { const [u, v] = toLocal(o.cx, o.cz, o.rot || 0, x, z); const du = Math.max(Math.abs(u) - o.hx, 0), dv = Math.max(Math.abs(v) - o.hz, 0); return du * du + dv * dv < r * r; }

/** 円（pos {x,z}・半径 r）を OBB から押し出す。戻り値：押した量 [dx, dz] か null */
export function pushCircleObb(pos, r, o) {
  const rot = o.rot || 0, [u, v] = toLocal(o.cx, o.cz, rot, pos.x, pos.z);
  const cu = Math.max(-o.hx, Math.min(u, o.hx)), cv = Math.max(-o.hz, Math.min(v, o.hz));
  let du = u - cu, dv = v - cv; const d2 = du * du + dv * dv;
  if (d2 >= r * r) return null;
  let nu, nv;
  if (d2 > 1e-12) { const d = Math.sqrt(d2), k = (r - d) / d; nu = du * k; nv = dv * k; }
  else { const px = o.hx - Math.abs(u) + r, pz = o.hz - Math.abs(v) + r; if (px < pz) { nu = Math.sign(u || 1) * px; nv = 0; } else { nu = 0; nv = Math.sign(v || 1) * pz; } }
  const c = Math.cos(rot), s = Math.sin(rot), dx = nu * c + nv * s, dz = -nu * s + nv * c;
  pos.x += dx; pos.z += dz; return [dx, dz];
}
