// 配置の規則（07 §4.3 立入禁止・§4.5 検査のしきい値）。DOM・three.js なし。数値はここ 1 か所（検査と配置が同じ値を使う）。
import { obbCorners, obbBounds, obbCapsule, obbCircle, obbOverlap, pointInObb, polySegDist, toWorld, deg } from '../core/geom.js';

/** 既定の値（07 §4.3・§4.5） */
export const RULES = {
  keepOut: {
    door: { extraW: 0.6, out: 2.0, in: 1.2 },          // 扉の前：幅（扉＋0.6）× 外 2.0m・中 1.2m
    pathMargin: 0.5,                                    // 道：幅/2＋0.5m（小さい物＝下草は 幅/2 より外なら許す）
    goalR: 2.5, startR: 4.0, cliffEdge: 1.0,
  },
  slopeMax: { building: 8, tree: 35, rock: 60, prop: 20, grass: 40 },
  float: { default: 0.05, rock: 0.15 },                 // 浮き：底と地面の差 > これ
  penetrate: -0.30,                                     // めり込み：差 < これ（embed で許す量を足す）
  overlapFrac: 0.05,                                    // 重なり：小さい方の体積の 5% 超
  walk: { cell: 0.5, maxSlope: 35, step: 0.4, radius: 0.3, height: 1.6, ratioMax: 4 },
  interior: { ceilingMin: 2.0 },
  retries: 8,
};

/**
 * 立入禁止の形の一覧を作る。形：{ id, kind, shape:'capsule'|'obb'|'circle'|'mask', small: 小さい物を許すか, ... }
 *   capsule：{ a:[x,z], b:[x,z], r, rSmall }（道の 1 区間。rSmall＝小さい物の禁止の半径＝幅/2）
 *   obb：{ obb:{cx,cz,hx,hz,rot} }、circle：{ c:[x,z], r }
 */
export function keepOutShapes({ paths = [], doors = [], goals = [], start = null, stairs = [] }) {
  const K = RULES.keepOut, out = [];
  for (const p of paths) for (let i = 0; i + 1 < p.points.length; i++) {
    const a = p.points[i], b = p.points[i + 1];
    out.push({ id: `${p.id}#${i}`, kind: 'path', shape: 'capsule', a: [a[0], a[2]], b: [b[0], b[2]], r: p.width / 2 + K.pathMargin, rSmall: p.width / 2 });
  }
  for (const d of doors) {
    const w = (d.width + K.door.extraW) / 2, rot = deg(d.rotY), t = d.wallT || 0.15;
    const [ox, oz] = toWorld(d.at[0], d.at[2], rot, 0, t / 2 + K.door.out / 2), [ix, iz] = toWorld(d.at[0], d.at[2], rot, 0, -t / 2 - K.door.in / 2);
    out.push({ id: `${d.id}:out`, kind: 'door', shape: 'obb', obb: { cx: ox, cz: oz, hx: w, hz: K.door.out / 2, rot } });
    if (d.enterable !== false) out.push({ id: `${d.id}:in`, kind: 'door', shape: 'obb', obb: { cx: ix, cz: iz, hx: w, hz: K.door.in / 2, rot }, inside: d.building });
  }
  for (const s of stairs) out.push({ id: s.id, kind: 'stairs', shape: 'obb', obb: s.obb });
  for (const g of goals) out.push({ id: `goal:${g.id}`, kind: 'goal', shape: 'circle', c: [g.at[0], g.at[2]], r: K.goalR });
  if (start) out.push({ id: 'start', kind: 'start', shape: 'circle', c: [start[0], start[2]], r: K.startR });
  for (const s of out) s.bounds = shapeBounds(s);
  return out;
}
function shapeBounds(s) {
  if (s.shape === 'capsule') return [Math.min(s.a[0], s.b[0]) - s.r, Math.min(s.a[1], s.b[1]) - s.r, Math.max(s.a[0], s.b[0]) + s.r, Math.max(s.a[1], s.b[1]) + s.r];
  if (s.shape === 'circle') return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
  return obbBounds(s.obb);
}

/** 物の足元の形（OBB）が立入禁止に触れるか。small＝小さい物（下草）。戻り値：触れた形か null */
export function hitsKeepOut(o, shapes, small = false) {
  const b = obbBounds(o);
  for (const s of shapes) {
    const sb = s.bounds; if (b[2] < sb[0] || b[0] > sb[2] || b[3] < sb[1] || b[1] > sb[3]) continue;
    if (s.shape === 'capsule') { if (obbCapsule(o, s.a, s.b, small ? s.rSmall : s.r)) return s; }
    else if (s.shape === 'circle') { if (!small && obbCircle(o, s.c[0], s.c[1], s.r)) return s; }
    else if (s.shape === 'obb') { if (obbOverlap(o, s.obb)) return s; }
  }
  return null;
}

/** 崖の縁の印（升目ごと）：傾き > edgeDeg の所から dist m の範囲。{ test(x,z) } */
export function cliffMask(hf, edgeDeg = 45, dist = RULES.keepOut.cliffEdge) {
  const { nx, nz, cell } = hf, steep = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (hf.slopeDeg(i * cell, j * cell) > edgeDeg) steep[j * nx + i] = 1;
  const R = Math.ceil(dist / cell), m = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (!steep[j * nx + i]) continue;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) { const a = i + di, c = j + dj; if (a >= 0 && c >= 0 && a < nx && c < nz) m[c * nx + a] = 1; }
  }
  let n = 0; for (const v of steep) n += v;
  return { steepCells: n, test: (x, z) => { const i = Math.round(x / cell), j = Math.round(z / cell); return i >= 0 && j >= 0 && i < nx && j < nz && !!m[j * nx + i]; } };
}

/** 置く所の傾き（足元の 4 隅と中心の最大） */
export function footSlope(hf, o) { let s = hf.slopeDeg(o.cx, o.cz); for (const [x, z] of obbCorners(o)) s = Math.max(s, hf.slopeDeg(x, z)); return s; }
/** 足元の地面の高さ（4 隅と中心）：{ min, max, pts } */
export function footGround(hf, o) { const pts = [[o.cx, o.cz], ...obbCorners(o)].map(([x, z]) => hf.at(x, z)); return { min: Math.min(...pts), max: Math.max(...pts), pts }; }

export { pointInObb, polySegDist };
