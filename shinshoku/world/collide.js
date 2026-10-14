// 当たり判定（DOM・three.js なし）。区画の壁・建物は軸に沿った箱（AABB）で持つ。
// キャラクターは「カプセル」＝ XZ 平面の円（半径 r）＋高さ。地面は y=0 の平ら（フェーズ2：段差なし）。
// box = { minX, maxX, minY, maxY, minZ, maxZ }
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
