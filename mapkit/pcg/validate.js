// 層 8「検証」（07 §4.5）：立入禁止・浮き/めり込み・重なり・坂・入口の確保・到達（格子）・室内・落下・予算。DOM・three.js なし。
// 結果は検証レポート（wakaba-map-report/1・mapkit/report/report.js）の auto と conditions の形で返す。黙って消さない：問題は items に理由付きで出す。
import { RULES, hitsKeepOut, footSlope } from './rules.js';
import { obbCorners, obbOverlapArea, obbBounds, deg } from '../core/geom.js';
import { World } from '../core/world.js';
import { buildWalkGrid, distanceField, nearestCell, descend } from '../nav/grid.js';
import { unb64, STANDINS } from './scatter.js';
import { estimateBudget, checkBudget } from '../render/quality.js';
import { applyOpenPose, fixtureColliders } from '../game/doors.js';
import { toWorld } from '../core/geom.js';

const r2 = v => Math.round(v * 100) / 100;
const shapeBounds = s => s.shape === 'capsule' ? [Math.min(s.a[0], s.b[0]) - s.r, Math.min(s.a[1], s.b[1]) - s.r, Math.max(s.a[0], s.b[0]) + s.r, Math.max(s.a[1], s.b[1]) + s.r]
  : s.shape === 'circle' ? [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r] : obbBounds(s.obb);
const objObb = o => o.col && o.col.shape === 'box' ? { cx: o.at[0], cz: o.at[2], hx: o.col.hx, hz: o.col.hz, rot: deg(o.rotY) } : { cx: o.at[0], cz: o.at[2], hx: (o.col ? o.col.r : 0.25), hz: (o.col ? o.col.r : 0.25), rot: deg(o.rotY) };

/**
 * layout（wakaba-map-layout/1）＋最終の地形 → { auto, conditions, fixes, world, grid, dist, routes }
 * opt = { spec, preset: 'low'（予算を見る段）, deterministic: bool|null }
 */
export function validateLayout(layout, hf, opt = {}) {
  const spec = opt.spec || {}, world = opt.world || new World(layout, hf), auto = {}, fixes = [];
  // 戸・門（フェーズ 4）：歩ける格子と到達は「全部の戸が開いた形」で調べる（遊ぶ時の格子 main.js と同じ）。柱・柵は当たりに入れる
  const GP = layout.gameplay || { doors: [], checkpoints: [], enemies: [] };
  applyOpenPose(world, GP.doors);
  const keepOut = layout.keepOut.map(s => Object.assign({}, s, { bounds: shapeBounds(s) }));
  // ── 立入禁止（物 × 形）
  const kv = [];
  for (const o of layout.objects) { const s = hitsKeepOut(objObb(o), keepOut, false); if (s) kv.push({ id: o.id, shape: s.id, at: o.at }); }
  let grassN = 0;
  for (const inst of layout.instances || []) {
    const d = unb64(inst.data); grassN += d.length / 2;
    for (let i = 0; i < d.length; i += 2) { const x = d[i] / 100, z = d[i + 1] / 100, s = hitsKeepOut({ cx: x, cz: z, hx: 0.25, hz: 0.25, rot: 0 }, keepOut, true); if (s) kv.push({ id: `${inst.layer}#${i / 2}`, shape: s.id, at: [x, 0, z] }); }
  }
  // 建物が道の上にある（道の幅）
  for (const c of world.colliders) if (c.building) { const o = c.kind === 'cyl' ? { cx: c.x, cz: c.z, hx: c.r, hz: c.r, rot: 0 } : c.obb; for (const s of keepOut) if (s.kind === 'path' && hitsKeepOut(o, [Object.assign({}, s, { r: s.rSmall, bounds: s.bounds })], false)) kv.push({ id: c.id, shape: s.id }); }
  auto.keepOut = { pass: kv.length === 0, violations: kv.slice(0, 50), checked: { objects: layout.objects.length, small: grassN, buildings: layout.buildings.length, shapes: keepOut.length } };
  // ── 入口の確保（扉の前の形 × 当たり）
  const ent = [];
  for (const s of keepOut.filter(s => s.kind === 'door' || s.kind === 'stairs')) for (const c of world.colliders) {
    const b = c.bounds, sb = s.bounds; if (b[2] < sb[0] || b[0] > sb[2] || b[3] < sb[1] || b[1] > sb[3]) continue;
    const gy = world.surfaceY(s.obb.cx, s.obb.cz); if (c.minY >= gy + RULES.walk.height || c.maxY <= gy + RULES.walk.step) continue;   // 頭の上（鴨居）・足元の低い物は通るのを止めない
    const o = c.kind === 'cyl' ? { cx: c.x, cz: c.z, hx: c.r, hz: c.r, rot: 0 } : c.obb;
    if (obbOverlapArea(o, { ...s.obb, hx: s.obb.hx - 0.02, hz: s.obb.hz - 0.02 }) > 1e-4) ent.push({ id: c.id, shape: s.id });
  }
  auto.entrances = { pass: ent.length === 0, violations: ent };
  // ── 浮き・めり込み（物の底の 4 隅と中心 × 歩く面）
  const fl = [], pen = [];
  for (const o of layout.objects) {
    const thr = o.cls === 'rock' ? RULES.float.rock : RULES.float.default, pts = [[o.at[0], o.at[2]], ...obbCorners(objObb(o))];
    const gaps = pts.map(([x, z]) => o.at[1] - (o.inside ? world.surfaceY(x, z) : hf.at(x, z)));
    const mx = Math.max(...gaps), mn = Math.min(...gaps);
    if (mx > thr) fl.push({ id: o.id, gap: r2(mx), at: o.at, fix: `y を ${r2(-mx)}`, reason: `底と地面の差 ${r2(mx)}m > ${thr}m` });
    if (mn < RULES.penetrate - (o.embed || 0)) pen.push({ id: o.id, gap: r2(mn), at: o.at, fix: `y を +${r2(-mn + RULES.penetrate)}`, reason: `めり込み ${r2(mn)}m（許す ${r2(RULES.penetrate - (o.embed || 0))}m）` });
  }
  for (const b of layout.buildings) {
    const pts = obbCorners(b.obb), gaps = pts.map(([x, z]) => b.padY - hf.at(x, z)), mx = Math.max(...gaps), mn = Math.min(...gaps);
    if (mx > RULES.float.default) fl.push({ id: b.id, gap: r2(mx), at: b.at, reason: '建物の土台の角が浮く' });
    if (mn < RULES.penetrate) pen.push({ id: b.id, gap: r2(mn), at: b.at, reason: '建物の土台の角が埋まる' });
  }
  auto.float = { pass: fl.length === 0 && pen.length === 0, items: [...fl, ...pen].slice(0, 50), counts: { float: fl.length, penetrate: pen.length } };
  // ── 重なり（当たりの箱どうし・同じ建物の部品どうしは除く）
  const ov = [], seen = new Set(), vol = c => (c.kind === 'cyl' ? Math.PI * c.r * c.r : 4 * c.obb.hx * c.obb.hz) * (c.maxY - c.minY);
  world.colliders.forEach((a, ia) => {
    for (const b of world._near(world.cBins, world.colliders, (a.bounds[0] + a.bounds[2]) / 2, (a.bounds[1] + a.bounds[3]) / 2, Math.max(a.bounds[2] - a.bounds[0], a.bounds[3] - a.bounds[1]) / 2)) {
      if (a === b || (a.building && a.building === b.building)) continue;
      const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id; if (seen.has(key)) continue; seen.add(key);
      const yo = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY); if (yo <= 0) continue;
      const oa = a.kind === 'cyl' ? { cx: a.x, cz: a.z, hx: a.r, hz: a.r, rot: 0 } : a.obb, ob = b.kind === 'cyl' ? { cx: b.x, cz: b.z, hx: b.r, hz: b.r, rot: 0 } : b.obb;
      const v = obbOverlapArea(oa, ob) * yo, frac = v / Math.min(vol(a), vol(b));
      if (frac > RULES.overlapFrac) ov.push({ id: `${a.id}×${b.id}`, gap: r2(frac), reason: `体積の ${Math.round(frac * 100)}% が重なる` });
    }
  });
  auto.overlap = { pass: ov.length === 0, items: ov.slice(0, 50), count: ov.length };
  // ── 坂（置く所の傾き）
  const sl = [];
  for (const o of layout.objects) { if (o.inside) continue; const lim = RULES.slopeMax[o.cls] ?? 90, s = footSlope(hf, objObb(o)); if (s > lim + 3) sl.push({ id: o.id, slope: r2(s), max: lim }); }
  const bSlope = layout.buildings.map(b => ({ id: b.id, slope: r2(footSlope(hf, b.obb)) }));
  for (const b of bSlope) if (b.slope > RULES.slopeMax.building) sl.push({ id: b.id, slope: b.slope, max: RULES.slopeMax.building });
  auto.slope = { pass: sl.length === 0, items: sl.slice(0, 50), buildings: bSlope };
  // ── 到達（格子 BFS：0.5m・坂 35°・段差 0.4m）
  const grid = opt.grid || buildWalkGrid(world);
  const sk = nearestCell(grid, layout.start[0], layout.start[2], 2);
  const dist = distanceField(grid, [sk]);
  const goals = {}, unreachable = [], ratios = {};
  for (const g of layout.goals) {
    const k = g.at ? nearestCell(grid, g.at[0], g.at[2], 1.0, g.at[1]) : -1;
    const d = k >= 0 && isFinite(dist[k]) ? r2(dist[k]) : null;
    goals[g.id] = d; if (d == null) unreachable.push(g.id);
    else ratios[g.id] = r2(d / Math.max(1, Math.hypot(g.at[0] - layout.start[0], g.at[2] - layout.start[2])));
  }
  const ratioBad = Object.entries(ratios).filter(([, r]) => r >= RULES.walk.ratioMax).map(([id]) => id);
  let walkable = 0, reached = 0; for (let k = 0; k < grid.ok.length; k++) { if (grid.ok[k]) walkable++; if (isFinite(dist[k])) reached++; }
  auto.reach = { pass: unreachable.length === 0 && ratioBad.length === 0, goals, unreachable, ratio: ratios, grid: { cell: grid.cell, maxSlope: RULES.walk.maxSlope, step: RULES.walk.step, walkable, reached } };
  // ── 室内（入れる家：全部屋に届く・天井高）
  const rooms = [];
  for (const b of layout.buildings.filter(b => b.enterable)) for (const rm of b.rooms) {
    const k = nearestCell(grid, rm.center[0], rm.center[2], 1.0, rm.center[1]), d = k >= 0 && isFinite(dist[k]) ? r2(dist[k]) : null, ceil = r2(rm.ceilY - rm.floorY);
    rooms.push({ id: rm.id, reach: d, ceiling: ceil, pass: d != null && ceil >= RULES.interior.ceilingMin });
  }
  auto.interiors = { pass: rooms.length > 0 && rooms.every(r => r.pass), rooms };
  // ── 落下（歩ける升目の隣が 0.6m より低くて歩けない＝崖の縁。操作は坂 40° 超を壁にするので落ちない）
  let edges = 0;
  for (let j = 1; j < grid.nz - 1; j++) for (let i = 1; i < grid.nx - 1; i++) { const k = j * grid.nx + i; if (!grid.ok[k] || !isFinite(dist[k])) continue; for (const k2 of [k + 1, k - 1, k + grid.nx, k - grid.nx]) if (!grid.ok[k2] && grid.y[k] - grid.y[k2] > 0.6) { edges++; break; } }
  auto.fall = { pass: true, edgeCells: edges, guard: '坂 40° を超える所・段差 0.4m を超える所は操作（mapkit/runtime/controller.js）が壁として止める＝落ちない（boundary: invisible_wall_on_cliff）' };
  // ── 遊びの定義（フェーズ 4）：戸の両側に届く・門の柱と柵が物に重ならない・敵の出る所と巡回の点が立入禁止の外で届く・チェックポイントに届く
  auto.gameplay = checkGameplay(GP, { world, grid, dist, keepOut, start: layout.start });
  // ── 予算（見積もり。実際の数は play_map.mjs が測って上書き）
  const preset = opt.preset || 'low', est = estimateBudget(layout, preset), bc = checkBudget(preset, est);
  auto.budget = { pass: bc.pass, preset, drawCalls: est.drawCalls, tris: est.tris, texMB: est.texMB, source: 'estimate', over: bc.over };
  // ── 直し方の案
  for (const f of auto.float.items) fixes.push({ issue: `浮き/めり込み ${f.id}`, proposal: f.fix || '土台を直す', auto: !!f.fix });
  for (const v of kv.slice(0, 20)) fixes.push({ issue: `立入禁止 ${v.id}（${v.shape}）`, proposal: '外す（または位置をずらす）', auto: true });
  for (const o of ov.slice(0, 20)) fixes.push({ issue: `重なり ${o.id}`, proposal: '小さい方を外す', auto: true });
  for (const p of auto.gameplay.problems.slice(0, 20)) fixes.push({ issue: `遊びの定義 ${p.id}：${p.reason}`, proposal: '地図仕様の gameplay（戸・敵の巡回・チェックポイント）の位置を直す', auto: false });
  for (const u of unreachable) fixes.push({ issue: `届かない ${u}`, proposal: '道の坂・扉の前の物を確かめる。配置を種を変えてやり直す（#retry）', auto: false });
  return { auto, fixes, world, grid, dist, startCell: sk };
}

/** フェーズ 4 の検査（validateLayout の中・試験からも呼ぶ） */
export function checkGameplay(GP, { world, grid, dist, keepOut, start }) {
  const problems = [], reachAt = (x, z, y, R = 1.2) => { const k = nearestCell(grid, x, z, R, y); return k >= 0 && isFinite(dist[k]) ? r2(dist[k]) : null; };
  const ids = new Set();
  const doors = (GP.doors || []).map(d => {
    if (ids.has(d.id)) problems.push({ id: d.id, reason: 'id が重複' }); ids.add(d.id);
    const rot = deg(d.rotY), side = s => { const [x, z] = toWorld(d.at[0], d.at[2], rot, 0, s * ((d.wallT || 0.15) / 2 + 0.75)); return reachAt(x, z, d.at[1], 0.9); };
    const sides = [side(1), side(-1)];
    if (sides.some(v => v == null)) problems.push({ id: d.id, reason: `開いた形で戸の両側に届かない（前 ${sides[0]}・後 ${sides[1]}）` });
    // 門の柱・柵：置いた物（木・岩）や建物に重ならない
    for (const f of fixtureColliders(d)) for (const c of world._near(world.cBins, world.colliders, f.c.obb.cx, f.c.obb.cz, f.c.obb.hx + 0.5)) {
      const o = c.kind === 'cyl' ? { cx: c.x, cz: c.z, hx: c.r, hz: c.r, rot: 0 } : c.obb;
      if (obbOverlapArea(o, f.c.obb) > 1e-3) problems.push({ id: f.id, reason: `門の柱・柵が ${c.id} に重なる` });
    }
    return { id: d.id, kind: d.kind, initial: d.initial, sides };
  });
  const banned = (keepOut || []).filter(s => s.kind === 'start' || s.kind === 'door' || s.kind === 'goal' || s.kind === 'stairs');
  const inKO = (x, z, kinds) => { for (const s of banned) if (kinds.includes(s.kind) && hitsKeepOut({ cx: x, cz: z, hx: 0.35, hz: 0.35, rot: 0 }, [s], false)) return s.id; return null; };
  const enemies = (GP.enemies || []).map(e => {
    const sp = e.spawn, ko = inKO(sp[0], sp[2], ['start', 'door', 'goal', 'stairs']), d0 = reachAt(sp[0], sp[2], sp[1]), far = r2(Math.hypot(sp[0] - start[0], sp[2] - start[2]));
    if (ko) problems.push({ id: e.id, reason: `出る所が立入禁止（${ko}）の中` });
    if (d0 == null) problems.push({ id: e.id, reason: '出る所に歩いて届かない（格子）' });
    if (far < 40) problems.push({ id: e.id, reason: `出る所がスタートに近い（${far}m < 40m）` });
    const route = e.route.map((w, i) => { const k = inKO(w[0], w[2], ['start', 'door']), d = reachAt(w[0], w[2], w[1], 1.5); if (k) problems.push({ id: `${e.id}#${i}`, reason: `巡回の点が立入禁止（${k}）の中` }); if (d == null) problems.push({ id: `${e.id}#${i}`, reason: '巡回の点に届かない' }); return d; });
    return { id: e.id, ai: e.ai, spawnReach: d0, fromStart: far, route };
  });
  const checkpoints = (GP.checkpoints || []).map(c => { const d = reachAt(c.at[0], c.at[2], c.at[1], 2); if (d == null) problems.push({ id: c.id, reason: 'チェックポイントに届かない' }); return { id: c.id, reach: d }; });
  return { pass: problems.length === 0, doors, enemies, checkpoints, problems };
}

/** 道案内のための道（スタート → 目的地の順）：[{ id, pts:[[x,y,z]…] }] */
export function goalRoutes(grid, layout) {
  const out = []; let from = nearestCell(grid, layout.start[0], layout.start[2], 2);
  for (const g of layout.goals) {
    const k = nearestCell(grid, g.at[0], g.at[2], 1.0, g.at[1]); if (k < 0) continue;
    const d = distanceField(grid, [k]); out.push({ id: g.id, pts: descend(grid, d, from) }); from = k;
  }
  return out;
}
export { STANDINS };
