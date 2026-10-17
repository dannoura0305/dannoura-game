// わかば mapkit フェーズ 2：種つきの配置（同じ種 → 同じ・違う種 → 違う）・立入禁止・浮き/めり込み/重なり・到達（格子）・道案内で歩く・レポート
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { heightfieldFromPNG } from '../mapkit/terrain/heightmap.js';
import { buildLayout, layoutHash } from '../mapkit/pcg/layout.js';
import { validateLayout } from '../mapkit/pcg/validate.js';
import { RULES, keepOutShapes } from '../mapkit/pcg/rules.js';
import { unb64, matchStandins, PointHash } from '../mapkit/pcg/scatter.js';
import { resample, profile } from '../mapkit/pcg/paths.js';
import { obbCapsule, obbOverlap, obbCorners, deg } from '../mapkit/core/geom.js';
import { World } from '../mapkit/core/world.js';
import { buildWalkGrid, distanceField, nearestCell } from '../mapkit/nav/grid.js';
import { Controller } from '../mapkit/runtime/controller.js';
import { Navigator } from '../mapkit/runtime/nav.js';
import { makeReport, validateReport } from '../mapkit/report/report.js';
import { readJson, rootPath, registry } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const spec = readJson('maps/haison/map.spec.json'), S = spec.terrain.source;
const raw = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/heightmap.png')), { size: [spec.size.w, spec.size.d], minY: S.minY, maxY: S.maxY });
const A = buildLayout(spec, raw), L = A.layout;
const V = validateLayout(L, A.hf, { spec });
const objObb = o => o.col && o.col.shape === 'box' ? { cx: o.at[0], cz: o.at[2], hx: o.col.hx, hz: o.col.hz, rot: deg(o.rotY) } : { cx: o.at[0], cz: o.at[2], hx: o.col.r, hz: o.col.r, rot: 0 };

await t('同じ種で 2 回作った配置が完全に一致（指紋と JSON）・違う種なら違う・層を足しても他の層は変わらない', () => {
  const B = buildLayout(spec, raw);
  assert.equal(B.layout.hash, L.hash); assert.equal(JSON.stringify(B.layout), JSON.stringify(L)); assert.equal(layoutHash(L), L.hash);
  const C = buildLayout(spec, raw, { seed: 'haison-002' });
  assert.notEqual(C.layout.hash, L.hash);
  const tr = l => l.objects.filter(o => o.layer === 'trees').map(o => o.at.join()).join('|');
  assert.notEqual(tr(C.layout), tr(L), '木の位置が違う');
  const s2 = clone(spec); s2.scatter.push({ layer: 'extra_rocks', asset: { category: 'rock' }, density: 0.001, minDist: 3 });
  const D = buildLayout(s2, raw).layout, keep = l => l.objects.filter(o => o.layer !== 'extra_rocks').map(o => o.id + o.at.join()).join('|');
  assert.equal(keep(D), keep(L), '後ろに足した層は前の層を変えない');
  assert.ok(D.objects.some(o => o.layer === 'extra_rocks'));
});

await t('置いた結果（maps/haison/build）が今のコードと仕様から作り直した物と同じ（build_map.mjs を回し忘れていない）', async () => {
  const f = readJson('maps/haison/build/layout.json');
  assert.equal(f.hash, L.hash, 'node tools/mapkit/build_map.mjs maps/haison を回す');
  const tp = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/build/terrain.png')), { size: f.size, minY: f.terrain.minY, maxY: f.terrain.maxY });
  assert.equal(tp.fingerprint(), f.terrain.fingerprint);
});

await t('道（幅）・入口の前（扉＋0.6m × 2m）・目的地・スタートに物が 0 個（下草も道の幅には 0）', () => {
  assert.ok(L.objects.length > 400, '物が置かれている ' + L.objects.length);
  let onPath = 0, nearPath = 0, door = 0, goal = 0;
  const caps = L.keepOut.filter(s => s.kind === 'path'), doors = L.keepOut.filter(s => s.kind === 'door' || s.kind === 'stairs');
  for (const o of L.objects) {
    const ob = objObb(o);
    if (caps.some(c => obbCapsule(ob, c.a, c.b, c.rSmall))) onPath++;
    if (caps.some(c => obbCapsule(ob, c.a, c.b, c.r))) nearPath++;
    if (doors.some(d => obbOverlap(ob, d.obb))) door++;
    if (L.goals.some(g => g.kind !== 'interior' && Math.hypot(g.at[0] - o.at[0], g.at[2] - o.at[2]) < RULES.keepOut.goalR)) goal++;
  }
  for (const I of L.instances) { const d = unb64(I.data); for (let i = 0; i < d.length; i += 2) if (caps.some(c => obbCapsule({ cx: d[i] / 100, cz: d[i + 1] / 100, hx: 0.25, hz: 0.25, rot: 0 }, c.a, c.b, c.rSmall))) onPath++; }
  assert.deepEqual({ onPath, nearPath, door, goal }, { onPath: 0, nearPath: 0, door: 0, goal: 0 });
  assert.ok(L.keepOut.filter(s => s.kind === 'door').length >= 6, '扉の外と中');
  const d0 = L.keepOut.find(s => s.id === 'h1.door:out'); assert.ok(Math.abs(d0.obb.hz * 2 - 2.0) < 1e-6 && Math.abs(d0.obb.hx * 2 - (L.buildings[0].doors[0].width + 0.6)) < 1e-3, '扉の前の大きさ');
  assert.equal(V.auto.keepOut.pass, true, JSON.stringify(V.auto.keepOut.violations.slice(0, 3)));
  assert.equal(V.auto.entrances.pass, true, JSON.stringify(V.auto.entrances.violations.slice(0, 3)));
});

await t('浮き（> 0.05m）・めり込み（< −0.3m）・重なり（箱の交差）・坂が 0 件。わざと壊すと見つかる', () => {
  for (const k of ['float', 'overlap', 'slope']) assert.equal(V.auto[k].pass, true, k + ' ' + JSON.stringify(V.auto[k].items.slice(0, 3)));
  const bad = clone(L), rock = bad.objects.find(o => o.cls === 'rock'), tree = bad.objects.find(o => o.cls === 'tree'), t2 = bad.objects.filter(o => o.cls === 'tree')[1];
  rock.at[1] += 0.5; tree.at[1] -= 2; t2.at = [tree.at[0] + 0.1, tree.at[1] + 2, tree.at[2]];
  const crate = { id: 'props#bad', layer: 'props', kind: 'prop.crate', cls: 'prop', at: [...L.goals[0].at], rotY: 0, scale: 1, size: [0.7, 0.6, 0.7], col: { shape: 'box', hx: 0.35, hz: 0.35, h: 0.6 }, embed: 0.1 };
  const pp = L.paths[0].points[40]; const rock2 = Object.assign(clone(rock), { id: 'rocks#onpath', at: [pp[0], pp[1], pp[2]] });
  bad.objects.push(crate, rock2);
  const W = validateLayout(bad, A.hf, { spec });
  const ids = k => W.auto[k].items.map(i => i.id).join(' ');
  assert.match(ids('float'), new RegExp(rock.id.replace('#', '\\#'))); assert.match(ids('float'), new RegExp(tree.id.replace('#', '\\#')));
  assert.equal(W.auto.overlap.pass, false); assert.equal(W.auto.keepOut.pass, false);
  assert.ok(W.auto.keepOut.violations.some(v => v.id === 'props#bad') && W.auto.keepOut.violations.some(v => v.id === 'rocks#onpath'));
  assert.ok(W.fixes.length > 0, '直し方の案が出る');
});

await t('到達：スタートから全ての目的地（祠・家の入口 3 つ以上・家の中）へ坂 35° 以下・段差 0.4m 以下で届く', () => {
  const R = V.auto.reach;
  assert.equal(R.pass, true, JSON.stringify(R)); assert.deepEqual(R.unreachable, []);
  const doors = L.goals.filter(g => g.kind === 'door'); assert.ok(doors.length >= 3, '入口 3 つ以上');
  for (const g of L.goals) assert.ok(R.goals[g.id] > 0 && R.ratio[g.id] < RULES.walk.ratioMax, g.id);
  assert.ok(L.goals.some(g => /^shrine\./.test(g.id)) && L.goals.some(g => g.kind === 'interior'));
  assert.equal(V.auto.interiors.pass, true); assert.ok(V.auto.interiors.rooms.length >= 5 && V.auto.interiors.rooms.every(r => r.ceiling >= 2.0));
  // 扉を塞ぐと中に届かない
  const bad = clone(L), h1 = bad.buildings.find(b => b.id === 'h1'), d = h1.doors[0];
  h1.parts.push({ id: 'h1.block', type: 'wall', mat: 'wood', shape: 'box', c: [d.at[0], d.at[1] + 1, d.at[2]], size: [d.width + 0.4, 2, 0.3], rotY: d.rotY, collide: true, walk: false });
  const W = validateLayout(bad, A.hf, { spec });
  assert.ok(W.auto.reach.unreachable.includes('h1.center'), '扉を塞ぐと h1 の中に届かない');
  assert.equal(W.auto.entrances.pass, false, '入口の確保でも見つかる');
});

await t('道案内に沿って、操作（当たり・坂の上限・段差）で全ての目的地まで歩ける（ヘッドレス）', () => {
  const nav = new Navigator(V.grid, L), c = new Controller(V.world, L.start); nav.setGoal(0);
  let tt = 0; while (!nav.done && tt < 400) { c.update(1 / 60, nav.steer(c.x, c.y, c.z), true); nav.check(c.x, c.y, c.z); tt += 1 / 60; assert.ok(c.blockedT < 3, `引っかかった ${c.x.toFixed(1)},${c.z.toFixed(1)}`); }
  assert.ok(nav.done, '着いた：' + [...nav.reached].join(','));
  // 崖（坂 40° 超）へは入らない・建物の壁は抜けない
  const w = V.world, hf = A.hf; let steep = null;
  for (let x = 40; x < 120 && !steep; x += 0.5) for (let z = 170; z < 205 && !steep; z += 0.5) if (hf.slopeDeg(x, z) > 50) steep = [x, z];
  const c2 = new Controller(w, [steep[0], 0, steep[1] - 8]); for (let i = 0; i < 400; i++) c2.update(1 / 60, [0, 1], true);
  assert.ok(hf.slopeDeg(c2.x, c2.z) <= 40.5, '崖の面に乗らない');
  const h1 = L.buildings.find(b => b.id === 'h1'), back = obbCorners(h1.obb);
  const c3 = new Controller(w, [h1.at[0], 0, h1.at[2]]); c3.x = (back[0][0] + back[1][0]) / 2; c3.z = (back[0][1] + back[1][1]) / 2;
  const f = [Math.sin(deg(h1.rot)), Math.cos(deg(h1.rot))]; c3.x -= f[0] * 2; c3.z -= f[1] * 2; c3.y = w.surfaceY(c3.x, c3.z);
  for (let i = 0; i < 300; i++) c3.update(1 / 60, f, false);
  assert.ok(!c3.building, '後ろの壁を抜けて中に入らない');
});

await t('検証レポート：作った物が wakaba-map-report/1 に合う・人が見る項目は pass: null・置いたレポートも合う', async () => {
  const reg = await registry(), rep = makeReport({ map: 'haison', seed: L.seed }); Object.assign(rep.auto, V.auto);
  rep.conditions.push({ text: '夕暮れの雰囲気', check: 'human', pass: null });
  assert.equal(validateReport(rep, reg).valid, true, JSON.stringify(validateReport(rep, reg).errors));
  const f = readJson('maps/haison/report/report.json'), v = validateReport(f, reg);
  assert.equal(v.valid, true, JSON.stringify(v.errors));
  assert.ok(f.conditions.some(c => c.check === 'human') && f.conditions.filter(c => c.check === 'human').every(c => c.pass === null));
  for (const k of ['deterministic', 'keepOut', 'float', 'overlap', 'reach', 'interiors']) assert.equal(f.auto[k].pass, true, k);
  assert.ok(f.gaps.length > 0 && f.gaps.every(g => g.status === 'proposed'), '不足の素材は計画だけ（承認待ち）');
});

await t('部品：道のなめらかな線と坂の上限・仮の形の検索・点のハッシュ・地図の外の物が無い', () => {
  const pts = resample([[0, 0], [10, 0], [10, 10]], 1); assert.ok(pts.length >= 19 && pts.length <= 22);
  const hf = { at: (x) => x * 2 }; const pr = profile(hf, resample([[0, 0], [20, 0]], 1), 20);
  for (let i = 1; i < pr.length; i++) assert.ok(Math.abs(pr[i][1] - pr[i - 1][1]) <= Math.tan(deg(20)) + 1e-6, '道の坂 ≤ 20°');
  assert.deepEqual(matchStandins({ tags: ['杉', '広葉樹'] }), ['veg.tree.sugi', 'veg.tree.broadleaf']); assert.deepEqual(matchStandins({ category: 'rock' }), ['rock.boulder']); assert.deepEqual(matchStandins({ tags: ['存在しない'] }), []);
  const h = new PointHash(10, 10, 1); h.add(5, 5, 0.5); assert.ok(h.near(5.4, 5, 1, p => p.r + 0.1)); assert.ok(!h.near(6, 5, 1, p => p.r + 0.1));
  for (const o of L.objects) assert.ok(o.at[0] > 0 && o.at[2] > 0 && o.at[0] < L.size[0] && o.at[2] < L.size[1], o.id);
  assert.ok(keepOutShapes({ start: [1, 0, 1] })[0].r === RULES.keepOut.startR);
});

console.log(`wakaba-mapkit-pcg: ${n} ok`);
