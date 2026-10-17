// 地図仕様 → 配置（layout）。07 §4.2 の層の順：1 地形 → 3 建物の土台 → 2 道（土台は守る）→ スタートの広場 → 建物の部品 → 4 立入禁止 → 小物 → 5・6 散布。
// DOM・three.js なし・種で決まる（同じ仕様＋同じ種＋同じ高さマップ → 同じ配置）。出力はエンジンに依らない JSON（wakaba-map-layout/1）。
// 座標：x＝東・z＝北（地図の左下が 0,0）・y＝上（m）。rotY は度（ローカルの +z＝前 が世界の (sin, cos)＝Three.js の rotation.y と同じ）。
import { generateTerrain } from '../terrain/generate.js';
import { resample, profile, carvePath, flattenCircle, nearestOnPath } from './paths.js';
import { planBuilding, plannedFoot, footObb, KINDS } from './buildings.js';
import { keepOutShapes, hitsKeepOut, cliffMask, RULES } from './rules.js';
import { scatterLayer, STANDINS, PointHash, objectObb, seatObject, makeObject, matchStandins } from './scatter.js';
import { obbOverlap, pointInObb, toWorld, deg } from '../core/geom.js';
import { childRng, range, pick, fingerprint } from '../core/rng.js';
import { resolveGoal } from '../core/spec.js';
import { planDressing } from './dressing.js';
import { planGameplay } from './gameplay.js';

const r3 = v => Math.round(v * 1000) / 1000;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 土台（OBB の中を y に・外 blend m で戻す） */
function flattenObb(hf, o, y, blend = 3) {
  const { nx, nz, cell } = hf, R = Math.hypot(o.hx, o.hz) + blend;
  for (let j = Math.max(0, Math.floor((o.cz - R) / cell)); j <= Math.min(nz - 1, Math.ceil((o.cz + R) / cell)); j++) for (let i = Math.max(0, Math.floor((o.cx - R) / cell)); i <= Math.min(nx - 1, Math.ceil((o.cx + R) / cell)); i++) {
    const x = i * cell, z = j * cell, c = Math.cos(o.rot), s = Math.sin(o.rot), dx = x - o.cx, dz = z - o.cz;
    const u = Math.abs(dx * c - dz * s) - o.hx, v = Math.abs(dx * s + dz * c) - o.hz, d = Math.hypot(Math.max(u, 0), Math.max(v, 0));
    if (d >= blend) continue;
    const w = 1 - smooth(0, blend, d), k = j * nx + i; hf.data[k] += (y - hf.data[k]) * w;
  }
}

/**
 * 配置を作る。raw：読み込んだ高さマップ（Heightfield）か null（手続きで作る）。
 * 戻り値：{ layout, hf（道・土台を入れて 16bit に丸めた最終の地形）, plans, gaps }
 */
export function buildLayout(spec, raw = null, opt = {}) {
  const W = spec.size.w, D = spec.size.d, seed = opt.seed || spec.seed;
  const sp = seed === spec.seed ? spec : Object.assign({}, spec, { seed });
  const base = raw || generateTerrain(sp, opt.terrain || {});
  if (Math.abs(base.sizeX - W) > 1e-6 || Math.abs(base.sizeZ - D) > 1e-6) throw new Error(`高さマップの大きさ ${base.sizeX}×${base.sizeZ}m が地図仕様 ${W}×${D}m と合いません`);
  const hf = base.clone(), gaps = [], notes = [];
  // 3. 建物の土台（先に作り、道はここを削らない）
  const pads = [];
  for (const b of spec.buildings || []) {
    const o = footObb(b, plannedFoot(b));
    const pts = [[o.cx, o.cz], ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => toWorld(o.cx, o.cz, o.rot, a * o.hx, c * o.hz))];
    const y = hf.quantizeValue(pts.reduce((s, p) => s + hf.at(p[0], p[1]), 0) / pts.length);
    flattenObb(hf, { ...o, hx: o.hx + 0.8, hz: o.hz + 0.8 }, y, 3.5);
    pads.push({ b, obb: o, core: { ...o, hx: o.hx + 0.8, hz: o.hz + 0.8 }, y });
  }
  // スタートの広場も土台と同じ扱い（先に平らにし、道はここを削らない）
  const st = spec.gameplay.start, sy = hf.quantizeValue(hf.at(st[0], st[1]));
  flattenCircle(hf, st[0], st[1], RULES.keepOut.startR + 0.5, sy, 4);
  const inPad = (x, z) => pads.some(p => pointInObb(x, z, p.core)) || Math.hypot(x - st[0], z - st[1]) < RULES.keepOut.startR + 0.5;
  // 2. 道
  const paths = [];
  for (const p of spec.paths || []) {
    const pts = resample(p.points, 1);
    let fix = null; for (const q of paths) { const n = nearestOnPath(q.points, pts[0][0], pts[0][1]); if (n.d < 3) fix = n.y; }
    const p3 = profile(hf, pts, p.maxSlope ?? 20, 5, fix);
    for (const q of p3) if (inPad(q[0], q[2])) q[1] = hf.at(q[0], q[2]);
    carvePath(hf, p3, p.width, 3, inPad);
    paths.push({ id: p.id, kind: p.kind, width: p.width, maxSlope: p.maxSlope ?? 20, points: p3 });
  }
  hf.quantize();
  for (const p of paths) for (const q of p.points) q[1] = r3(hf.at(q[0], q[2])), q[0] = r3(q[0]), q[2] = r3(q[2]);
  // 建物の部品
  const plans = [];
  for (const pd of pads) {
    const pl = planBuilding(pd.b, pd.y, { seed, anchors: spec.anchors || [] });
    if (!pl) { gaps.push({ need: `building_kind:${pd.b.kind}`, plan: `建物の型「${pd.b.kind}」が mapkit/pcg/buildings.js に無い：型を足すか、部品（bld.*）の組み合わせを決める`, status: 'proposed' }); continue; }
    plans.push(pl);
  }
  // 印（anchors）：自動の物は組み立ての結果で置き換え、手の物は y を地面からの高さ → 絶対の高さに
  const autoA = plans.flatMap(p => p.anchors), anchors = [], anchorDiff = [];
  for (const a of spec.anchors || []) {
    const g = autoA.find(x => x.id === a.id);
    if (g) { const pa = a.at || a.from, pg = g.at || g.from, dd = Math.hypot(pa[0] - pg[0], pa[2] - pg[2]); if (dd > 0.05) anchorDiff.push({ id: a.id, moved: r3(dd) }); continue; }
    const abs = v => v && [v[0], r3(hf.at(v[0], v[2]) + v[1]), v[2]];
    anchors.push(Object.assign({}, a, a.at ? { at: abs(a.at) } : {}, a.from ? { from: abs(a.from), to: abs(a.to) } : {}));
  }
  anchors.push(...autoA);
  // 目的地
  const start = [st[0], r3(hf.at(st[0], st[1])), st[1]];
  const goals = (spec.gameplay.goals || []).map(id => {
    const rg = resolveGoal(spec, id), m = /^([a-z0-9_]+)\.([a-z0-9_]+)$/.exec(id), pl = m && plans.find(p => p.id === m[1]);
    if (pl && pl.goals[m[2]]) { const g = pl.goals[m[2]]; return { id, kind: m[2] === 'door' ? 'door' : m[2] === 'center' ? 'interior' : 'front', building: pl.id, at: [r3(g[0]), r3(g[1]), r3(g[2])] }; }
    const a = anchors.find(x => x.id === id);
    if (a) { const p = a.at || a.from; return { id, kind: 'anchor', at: p.slice() }; }
    return { id, kind: 'unknown', at: rg.at ? [rg.at[0], r3(hf.at(rg.at[0], rg.at[1])), rg.at[1]] : null, error: rg.error };
  });
  // 4. 立入禁止
  const doors = plans.flatMap(p => p.doors), stairs = plans.flatMap(p => p.stairs || []);
  const keepOut = keepOutShapes({ paths, doors, goals: goals.filter(g => g.at && g.kind !== 'interior'), start, stairs });
  const interiorGoals = keepOutShapes({ goals: goals.filter(g => g.at && g.kind === 'interior') }).map(s => Object.assign(s, { r: 1.2 }));
  for (const s of interiorGoals) s.bounds = [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
  keepOut.push(...interiorGoals);
  const cliff = cliffMask(hf);
  const buildingAreas = plans.map(p => ({ id: p.id, obb: p.obb }));
  const occ = new PointHash(W, D, 2);
  const objects = [], instances = [], stats = [];
  // 小物（建物の中・まわり）
  const pr = childRng(seed, 'props'); let pn = 0, dn = 0; const propStats = { layer: 'props', placed: 0, dropped: [] };
  const addProp = (kind, x, z, rot, y = null, building = null, inside = false, layer = 'props') => {
    const def = STANDINS[kind], s = 1, obb = objectObb(def, x, z, rot, s), occR = Math.max(def.occ, Math.hypot(def.size[0], def.size[2]) / 2);
    const ko = hitsKeepOut(obb, keepOut, false);
    if (ko) return `keepOut:${ko.id}`;
    if (!inside && buildingAreas.some(a => obbOverlap(obb, { ...a.obb, hx: a.obb.hx + 0.3, hz: a.obb.hz + 0.3 }))) return 'building';
    if (!inside && hf.slopeDeg(x, z) > RULES.slopeMax.prop) return 'slope';
    if (occ.near(x, z, 4, p => p.r + occR)) return 'overlap';
    const seat = y == null ? seatObject(hf, def, obb, s) : { y, range: 0, sink: 0, embed: 0.1 };
    if (seat.range > -RULES.penetrate + seat.embed - 0.02) return 'uneven';
    if (x < 1 || z < 1 || x > W - 1 || z > D - 1) return 'edge';
    occ.add(x, z, occR);
    objects.push(makeObject(layer === 'props' ? `props#${pn++}` : `${layer}#${dn++}`, layer, kind, def, x, seat.y, z, rot, s, building ? { building, inside } : {}));
    if (layer === 'props') propStats.placed++; return null;
  };
  for (const pl of plans) {
    for (const p of pl.props || []) {
      const [x, z] = toWorld(pl.at[0], pl.at[2], deg(pl.rot), p.u, p.v);
      const why = addProp(p.kind, x, z, p.rot, pl.outsideProps ? null : p.y, pl.id, !pl.outsideProps);
      if (why) propStats.dropped.push({ id: `${pl.id}:${p.kind}`, why });
    }
    if (!/jp_house/.test(pl.kind)) continue;
    const n = 3 + Math.round((pl.decay || 0) * 4), f = { ...pl.obb };
    for (let k = 0, placed = 0; k < n * 12 && placed < n; k++) {
      const side = Math.floor(pr() * 4), t = pr() * 2 - 1, off = range(pr, 0.6, 2.0), kind = pick(pr, ['prop.barrel', 'prop.crate', 'prop.planks', 'prop.debris']), rot = pl.rot + (pr() < 0.5 ? 0 : 90) + range(pr, -12, 12);
      const [u, v] = side === 0 ? [t * f.hx, f.hz + off] : side === 1 ? [t * f.hx, -f.hz - off] : side === 2 ? [f.hx + off, t * f.hz] : [-f.hx - off, t * f.hz];
      const [x, z] = toWorld(f.cx, f.cz, f.rot, u, v);
      if (x < 2 || z < 2 || x > W - 2 || z > D - 2) continue;
      if (!addProp(kind, x, z, rot, null, pl.id, false)) placed++;
    }
  }
  stats.push(propStats);
  // 5・6. 散布（仕様の順）
  const villages = ((spec.terrain || {}).features || []).filter(f => f.type === 'valley_flat' && f.center).map(f => ({ c: f.center, r: f.radius || 30 }));
  const ctx = { spec: sp, hf, W, D, keepOut, buildingAreas, cliff, occ, villages };
  for (const L of spec.scatter || []) {
    const r = scatterLayer(L, ctx);
    stats.push(r.stats); objects.push(...r.objects); if (r.instances) instances.push(r.instances);
    if (r.gap) gaps.push({ need: `asset:${JSON.stringify(r.gap)}`, plan: `層「${L.layer}」の素材が目録にも仮の形にも無い`, status: 'proposed' });
  }
  // 7. 飾り（フェーズ 3：散布の後ろ＝前の層は変わらない。mapkit/pcg/dressing.js）
  if (spec.dressing !== false) {
    const dStats = { layer: 'dressing', placed: 0, dropped: [] };
    for (const q of planDressing({ seed, plans, paths, W, D, village: villages[0] })) {
      let why = null;
      for (const [x, z, rot] of [[q.x, q.z, q.rot], ...(q.tries || [])]) { why = addProp(q.kind, x, z, rot, q.inside ? q.y : null, q.building || null, !!q.inside, 'dressing'); if (!why) break; }
      if (why) dStats.dropped.push({ id: (q.building ? q.building + ':' : '') + q.kind, why }); else dStats.placed++;
    }
    stats.push(dStats);
  }
  // 8. 遊びの定義（フェーズ 4：戸・門・チェックポイント・敵の巡回。物は置かない＝前の層は変わらない。mapkit/pcg/gameplay.js）
  const gameplay = planGameplay(spec, { plans, paths, hf, objects, start });
  for (const n of gameplay.notes) notes.push({ issue: `遊びの定義 ${n.id}：${n.issue}`, proposal: '地図仕様の gameplay を直す', auto: false });
  // 実素材の不足（仮の形で置いた物）＝ gaps（計画のみ・承認待ち）。目録（opt.catalog：id → 名前）に Web で使える素材があれば done
  const usedKinds = [...new Set([...objects.map(o => o.kind), ...instances.map(i => i.kind)])].sort();
  const cat = opt.catalog || null;
  for (const k of usedKinds) {
    if (cat && cat[k]) gaps.push({ need: k, plan: `目録の素材 ${k}（${cat[k]}）で描く（ブラウザ版）。当たり・置き場所は仮の形（${STANDINS[k].ja}）の大きさのまま`, status: 'done' });
    else gaps.push({ need: k, plan: `仮の形（${STANDINS[k].ja}）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）`, status: 'proposed' });
  }
  for (const pl of plans) {
    const mods = pl.kind === 'hokora_small' ? ['bld.shrine.honden', 'bld.shrine.torii'] : ['bld.jp_house.wall_panel', 'bld.jp_house.post', 'bld.jp_house.roof_ridge'];
    if (cat && mods.every(m => cat[m])) gaps.push({ need: `bld.${pl.kind}`, plan: `建物「${pl.id}」は部品の箱（当たり・床）のまま、見た目を目録の部品（${mods.join('・')}）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手`, status: 'done' });
    else gaps.push({ need: `bld.${pl.kind}`, plan: `建物「${pl.id}」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）`, status: 'proposed' });
  }
  if (anchorDiff.length) notes.push({ issue: `地図仕様の自動の印（auto: true）と組み立ての結果がずれている：${anchorDiff.map(a => `${a.id} ${a.moved}m`).join('、')}`, proposal: '地図仕様の anchors を組み立ての結果（layout.json の anchors）に合わせる', auto: true });

  const layout = {
    layout: 'wakaba-map-layout/1', map: spec.id, seed,
    coords: { x: 'east', y: 'up', z: 'north', unit: 'm', origin: '地図の左下（0,0）', rotY: 'deg：ローカル +z（前）→ 世界 (sin, cos)（Three.js の rotation.y と同じ・UE へは軸の入れ替えが要る）' },
    size: [W, D],
    terrain: { file: 'terrain.png', format: 'png16-gray', nx: hf.nx, nz: hf.nz, cell: hf.cell, minY: hf.minY, maxY: hf.maxY, rows: '行 j ＝ z = j×cell（行 0 が z = 0）', source: raw ? 'heightmap' : 'fallback', fingerprint: hf.fingerprint() },
    start, goals, paths, buildings: plans.map(p => ({ id: p.id, kind: p.kind, enterable: p.enterable, at: p.at, rot: p.rot, footprint: p.footprint, decay: p.decay, padY: p.padY, obb: roundObb(p.obb), rooms: p.rooms, doors: p.doors, ...(p.openings && p.openings.length ? { openings: p.openings } : {}), parts: p.parts })),
    anchors, objects, instances,
    gameplay: { doors: gameplay.doors, checkpoints: gameplay.checkpoints, enemies: gameplay.enemies },
    keepOut: keepOut.map(s => { const o = Object.assign({}, s); delete o.bounds; if (o.obb) o.obb = roundObb(o.obb); if (o.a) { o.a = o.a.map(r3); o.b = o.b.map(r3); } if (o.c) o.c = o.c.map(r3); return o; }),
    stats: { counts: countBy(objects, 'layer'), instances: Object.fromEntries(instances.map(i => [i.layer, i.count])), layers: stats, cliffCells: cliff.steepCells },
  };
  layout.hash = layoutHash(layout);
  return { layout, hf, plans, gaps, notes, cliff };
}
const roundObb = o => ({ cx: r3(o.cx), cz: r3(o.cz), hx: r3(o.hx), hz: r3(o.hz), rot: r3(o.rot) });
const countBy = (a, k) => a.reduce((m, o) => (m[o[k]] = (m[o[k]] || 0) + 1, m), {});
/** 配置の指紋（hash の欄を除いた JSON） */
export function layoutHash(layout) { const { hash, ...rest } = layout; return 'fp:' + fingerprint(JSON.stringify(rest)); }
export { KINDS, matchStandins };
