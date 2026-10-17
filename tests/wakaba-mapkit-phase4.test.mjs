// わかば mapkit フェーズ 4（ゲームとして探索できる）：戸・門（開け閉め・当たり・開いた形で届く）・敵（巡回・見つける・追う・見失う・捕まえる・決まった動き）・
// A* の道・チェックポイント・足元の面・地図仕様と配置のスキーマ（gameplay）・検査（auto.gameplay）・描画の純粋な部分（遠くの地面のむら・葉のカードの写し）・
// UE5 の取り込みスクリプトの --selftest（偽の unreal）・sw.js（版・復号器の振り分け）。docs/wakaba-mapkit/06 フェーズ 4。
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { ROOT, readJson, rootPath, registry } from '../mapkit/core/node.mjs';
import { heightfieldFromPNG } from '../mapkit/terrain/heightmap.js';
import { buildLayout } from '../mapkit/pcg/layout.js';
import { validateLayout, checkGameplay } from '../mapkit/pcg/validate.js';
import { validateSpec } from '../mapkit/core/spec.js';
import { validate } from '../mapkit/core/schema.js';
import { IDS } from '../mapkit/core/schemas.js';
import { World } from '../mapkit/core/world.js';
import { buildWalkGrid, distanceField, nearestCell, findPath } from '../mapkit/nav/grid.js';
import { DoorSet, DOOR_KINDS, doorCollider, closedObb, panelPoses, leafObb, applyOpenPose } from '../mapkit/game/doors.js';
import { Enemy, footstepNoise, ENEMY_DEFAULTS } from '../mapkit/game/enemy.js';
import { Checkpoints } from '../mapkit/game/checkpoints.js';
import { surfaceIndex, surfaceAt } from '../mapkit/game/surface.js';
import { STEP_TONE } from '../mapkit/runtime/audio.js';
import { pointInObb, deg } from '../mapkit/core/geom.js';
register('./helpers/three-node-hooks.mjs', import.meta.url);

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const spec = readJson('maps/haison/map.spec.json'), S = spec.terrain.source;
const raw = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/heightmap.png')), { size: [spec.size.w, spec.size.d], minY: S.minY, maxY: S.maxY });
const A = buildLayout(spec, raw), L = A.layout, hf = A.hf, GP = L.gameplay;
const V = validateLayout(L, hf, { spec });
// 遊ぶ時と同じ：開いた形で格子 → 戸の今の状態
const mkWorld = () => { const w = new World(L, hf); applyOpenPose(w, GP.doors); const g = buildWalkGrid(w); return { w, g }; };
const { w: world, g: grid } = mkWorld();

await t('地図仕様（gameplay：戸 8・チェックポイント 2・敵 1）がスキーマと中身の検査に通る。誤りの例は止まる', () => {
  const v = validateSpec(spec, reg); assert.equal(v.valid, true, JSON.stringify(v.errors));
  assert.equal(spec.gameplay.doors.length, 8); assert.equal(spec.gameplay.enemies[0].ai, 'mapkit:ikei', '境界侵食の人物・敵を使わない（試験マップ専用の異形）');
  const bad = (f, re) => { const s = clone(spec); f(s); const r = validateSpec(s, reg); assert.equal(r.valid, false); assert.ok(r.errors.some(e => re.test(e.msg || '') || re.test(e.path || '')), JSON.stringify(r.errors)); };
  bad(s => s.gameplay.doors.push({ id: 'x.gate', kind: 'hinged' }), /at が要る/);
  bad(s => s.gameplay.doors.push(clone(s.gameplay.doors[0])), /重複/);
  bad(s => s.gameplay.doors.push({ id: 'h3.door' }), /入れない家/);
  bad(s => { s.gameplay.enemies[0].route.push([300, 10]); }, /巡回の点/);
  bad(s => { s.gameplay.enemies[0].speed.chase = 99; }, /maximum|以下|chase/);
  bad(s => { s.gameplay.doors[0].kind = 'portal'; }, /kind|enum/);
  const w = clone(spec); w.gameplay.enemies[0].speed.chase = 5.5; const r = validateSpec(w, reg); assert.ok(r.warnings.some(x => /逃げられない/.test(x.msg)));
});

await t('配置：gameplay（戸・開口・門の柱と柵・チェックポイント・敵）が配置のスキーマに合う。前の層（建物・木・岩・小物・飾り）は 1 つも変わらない', () => {
  assert.equal(validate(IDS.mapLayout, L, { registry: reg }).valid, true);
  assert.equal(GP.doors.length, 8); assert.deepEqual(GP.doors.map(d => d.kind).sort(), ['fusuma', 'fusuma', 'hinged', 'shoji', 'shoji', 'sliding', 'sliding', 'sliding']);
  const gate = GP.doors.find(d => d.kind === 'hinged'); assert.equal(gate.posts.length, 2); assert.equal(gate.wings.length, 2); assert.equal(gate.path, 'sando');
  assert.ok(L.buildings.find(b => b.id === 'h1').openings.length === 2, 'h1 の仕切りの開口 2 つ');
  assert.equal(GP.checkpoints[0].id, 'cp.start'); assert.equal(GP.checkpoints.length, 3);
  const s0 = clone(spec); delete s0.gameplay.doors; delete s0.gameplay.checkpoints; delete s0.gameplay.enemies;
  const B = buildLayout(s0, raw).layout, sig = l => JSON.stringify([l.objects, l.instances, l.keepOut, l.buildings.map(b => b.parts)]);
  assert.equal(sig(B), sig(L), '遊びの定義は物を置かない（層 8）');
  assert.equal(B.gameplay.doors.length, 0);
  // 書いた build/layout.json が今のコードと同じ
  assert.equal(readJson('maps/haison/build/layout.json').hash, L.hash, 'node tools/mapkit/build_map.mjs maps/haison を回す');
});

await t('検査 auto.gameplay：開いた形で戸の両側・敵の出る所と巡回・チェックポイントに届く。全部の目的地も（到達は開いた形で計算）', () => {
  const G = V.auto.gameplay; assert.equal(G.pass, true, JSON.stringify(G.problems));
  assert.equal(V.auto.reach.pass, true);
  for (const d of G.doors) assert.ok(d.sides.every(x => x != null), d.id);
  assert.ok(G.enemies[0].fromStart >= 40); assert.ok(G.enemies[0].route.every(x => x != null));
  // 閉じた形では h1 の和室（目的地 h1.center）に届かない＝戸が当たりとして効いている
  const w2 = new World(L, hf); const ds = new DoorSet(GP.doors, w2); void ds; const g2 = buildWalkGrid(w2);
  const dd = distanceField(g2, [nearestCell(g2, L.start[0], L.start[2], 2)]), c = L.goals.find(g => g.id === 'h1.center');
  assert.equal(isFinite(dd[nearestCell(g2, c.at[0], c.at[2], 1.0, c.at[1])]), false, '閉じた玄関・障子の向こうへは届かない');
});

await t('検査の誤りの例：敵の出る所がスタートの立入禁止の中・柵が玄関の開口を塞ぐ（開いても通れない）・チェックポイントが崖の上', () => {
  const G2 = clone(GP); G2.enemies[0].spawn = L.start.slice(); G2.enemies[0].route[0] = L.start.slice();
  const hd = G2.doors.find(d => d.id === 'h1.door'); hd.wings = [{ c: hd.at.slice(), len: hd.width + 0.4, rotY: hd.rotY }];   // 玄関の開口に柵（誤った定義）
  G2.checkpoints.push({ id: 'cp.bad', at: [80, hf.at(80, 196), 196], r: 3 });
  const w = new World(L, hf); applyOpenPose(w, G2.doors); const g = buildWalkGrid(w), dist = distanceField(g, [nearestCell(g, L.start[0], L.start[2], 2)]);
  const r = checkGameplay(G2, { world: w, grid: g, dist, keepOut: L.keepOut.map(s => Object.assign({}, s, { bounds: s.a ? [Math.min(s.a[0], s.b[0]) - s.r, Math.min(s.a[1], s.b[1]) - s.r, Math.max(s.a[0], s.b[0]) + s.r, Math.max(s.a[1], s.b[1]) + s.r] : s.c ? [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r] : [s.obb.cx - 9, s.obb.cz - 9, s.obb.cx + 9, s.obb.cz + 9] })), start: L.start });
  assert.equal(r.pass, false);
  const why = r.problems.map(p => p.reason).join('／');
  assert.match(why, /立入禁止（start）/); assert.match(why, /スタートに近い/); assert.match(why, /両側に届かない/); assert.match(why, /チェックポイントに届かない/);
});

await t('戸（DoorSet）：閉じた戸は当たり・E で開くと消える・閉める時に体が挟まると閉まらない・開き戸は 95° 振れる・板の位置（開くと開口の外）', () => {
  const w = new World(L, hf), D = new DoorSet(GP.doors, w), d = D.get('h1.door');
  assert.equal(d.open, 0); assert.ok(w.dyn.has('door:h1.door'));
  const front = [d.at[0] + Math.sin(deg(d.rotY)) * 0.5, d.at[2] + Math.cos(deg(d.rotY)) * 0.5], back = [d.at[0] - Math.sin(deg(d.rotY)) * 0.5, d.at[2] - Math.cos(deg(d.rotY)) * 0.5];
  assert.ok(w.blocked(d.at[0], d.at[2], d.at[1], 0.3), '閉じた戸の所は通れない');
  assert.equal(D.closedOnSegment(front, back).id, 'h1.door');
  assert.equal(D.toggle('h1.door').ok, true); let ev = []; for (let i = 0; i < 60; i++) ev.push(...D.update(1 / 60));
  assert.equal(d.open, 1); assert.ok(ev.some(e => e.type === 'start') && ev.some(e => e.type === 'end'));
  assert.equal(w.dyn.has('door:h1.door'), false); assert.equal(w.blocked(d.at[0], d.at[2], d.at[1], 0.3), null, '開いた戸は通れる');
  assert.equal(D.closedOnSegment(front, back), null);
  // 挟まる：体が開口の中にいる時は閉まらない
  const body = { x: d.at[0], z: d.at[2], r: 0.3 }; const r = D.setTarget('h1.door', 0, 'player', [body]); assert.equal(r.ok, false); assert.equal(r.reason, 'blocked');
  // 閉まる途中で体が入ると開け戻す
  D.setTarget('h1.door', 0, 'player', []); D.update(0.1); ev = D.update(0.05, [body]); assert.ok(ev.some(e => e.type === 'bounce'));
  // 板：閉じると開口の中、開くと開口の外（戸袋の側）
  const o = closedObb(d), p0 = panelPoses(d, 0), p1 = panelPoses(d, 1);
  assert.equal(p0.length, DOOR_KINDS.sliding.panels); for (const p of p0) assert.ok(pointInObb(p.x, p.z, { ...o, hz: 0.3 }), '閉じた板は開口に');
  for (const p of p1) assert.ok(!pointInObb(p.x, p.z, { ...o, hx: o.hx - 0.02, hz: 0.3 }), '開いた板は開口の外');
  // 開き戸
  const g = D.get('sando.gate'), l0 = leafObb(g, 0), l1 = leafObb(g, 1);
  assert.ok(Math.abs(l0.cx - g.at[0]) < 1e-6 && Math.abs(l0.cz - g.at[2]) < 1e-6); assert.ok(Math.abs(Math.abs(l1.rot - l0.rot) - deg(95)) < 1e-6);
  assert.ok(doorCollider(g, 1), '開き戸は開いても板が当たり'); assert.equal(doorCollider(d, 1), null);
  assert.ok(D.near(g.at[0], g.at[1], g.at[2]).door.id === 'sando.gate');
  D.reset(); assert.equal(D.get('h1.door').open, 0); assert.equal(D.get('h2.door').open, 1, 'initial: open');
});

await t('A*（findPath）：距離の場（ダイクストラ）と同じ長さ・届かない時は近くまで（partial）・同じ入力で同じ答え', () => {
  const pairs = [[L.start, L.goals[0].at], [L.goals[0].at, L.goals[4].at], [GP.enemies[0].spawn, L.goals[3].at]];
  for (const [a, b] of pairs) {
    const s = nearestCell(grid, a[0], a[2], 2, a[1]), e = nearestCell(grid, b[0], b[2], 1.5, b[1]);
    const r = findPath(grid, s, e, { maxExpand: 400000 }), d = distanceField(grid, [s]);
    assert.equal(r.partial, false); assert.ok(Math.abs(r.cost - d[e]) < 1e-6, `${r.cost} vs ${d[e]}`);
    assert.deepEqual(findPath(grid, s, e, { maxExpand: 400000 }).cells, r.cells);
  }
  const s = nearestCell(grid, L.start[0], L.start[2], 2), far = nearestCell(grid, L.goals[4].at[0], L.goals[4].at[2], 1.5, L.goals[4].at[1]);
  const p = findPath(grid, s, far, { maxExpand: 500 }); assert.equal(p.partial, true); assert.ok(p.cells.length > 1 && p.cells[0] === s);
});

// 敵を同じ入力で動かす（試験の台本）
function script(seedTag = 'x') {
  const { w, g } = mkWorld(), D = new DoorSet(GP.doors, w), E = new Enemy(GP.enemies[0], { world: w, grid: g, doors: D }, L.seed), log = [];
  const far = { x: 30, y: hf.at(30, 30), z: 30, yaw: 0, light: false, running: false, moving: false };
  for (let i = 0; i < 60 * 60; i++) { const ev = E.update(1 / 60, far, []); D.update(1 / 60); for (const e of ev) log.push(i + ':' + e.type + (e.id ? ':' + e.id : '')); if (i % 300 === 0) log.push(E.digest()); }
  void seedTag; return { E, D, w, g, log };
}
await t('敵：巡回（道の点を順に・閉じた戸は開けて通る）・同じ入力なら同じ動き（決まった乱数）', () => {
  const a = script(), b = script();
  assert.deepEqual(a.log, b.log, '2 回の動きが一致');
  assert.ok(a.log.some(x => /door:h1\.door/.test(x)), '巡回の途中で h1 の玄関を開ける');
  assert.equal(a.D.get('h1.door').open, 1);
  assert.notEqual(a.E.wp, 0); assert.equal(a.E.state, 'patrol');
});

await t('敵：見つける（扇形・遮る物・灯り）→ 追う（A*）→ 捕まえる／走れば離れる → 見失って探す → 巡回へ戻る。音で調べに来る', () => {
  const { w, g } = mkWorld(), D = new DoorSet(GP.doors, w), E = new Enemy(GP.enemies[0], { world: w, grid: g, doors: D }, L.seed);
  const P = (x, z, o = {}) => Object.assign({ x, z, y: w.surfaceY(x, z), yaw: 0, light: true, running: false, moving: false }, o);
  // 後ろ（扇形の外）・遠くは見えない
  E.reset([108, w.surfaceY(108, 89), 89]); E.yaw = Math.PI / 2;   // 東を向く（プレイヤーは西 6m）
  assert.equal(E._see(P(102, 89)), 0, '真後ろは見えない');
  E.yaw = -Math.PI / 2; assert.ok(E._see(P(102, 89)) > 0, '前は見える');
  assert.equal(E._see(P(102, 89, { light: false })) > 0, true);
  assert.equal(E._see(P(80, 89, { light: false })), 0, '灯りを消すと遠くは見えない（17m×0.75）');
  // 捕まえる
  let caught = -1; for (let i = 0; i < 60 * 6 && caught < 0; i++) if (E.update(1 / 60, P(104, 89)).some(e => e.type === 'caught')) caught = i;
  assert.ok(caught > 0 && caught < 60 * 3, `捕まえるまで ${caught} ステップ`);
  // 逃げる：プレイヤーが 5.2m/s で離れる → 見失う
  E.reset([108, w.surfaceY(108, 89), 89]); E.yaw = -Math.PI / 2; for (let i = 0; i < 75; i++) E.update(1 / 60, P(101, 89));
  assert.equal(E.state, 'chase');
  const path = g => { const out = []; for (let i = 0; i < 60 * 14; i++) { const k = i / (60 * 14); out.push([101 - 60 * k, 89 - 40 * k]); } return out; };
  const pts = path(); let lost = false, st = [];
  for (let i = 0; i < pts.length; i++) { const p = P(pts[i][0], pts[i][1], { light: false, running: true, moving: true }); const ev = E.update(1 / 60, p); if (ev.some(e => e.type === 'caught')) assert.fail('捕まった'); if (ev.some(e => e.type === 'lost')) lost = true; if (i % 120 === 0) st.push(E.state); }
  for (let i = 0; i < 60 * 30 && E.state !== 'patrol'; i++) E.update(1 / 60, P(41, 49, { light: false }));
  assert.ok(lost, '見失う（lost）'); assert.equal(E.state, 'patrol', '探してから巡回へ');
  // 音で調べに来る
  E.reset(); const ev = E.update(1 / 60, P(30, 30, { light: false }), [{ x: E.ctl.x - 8, y: E.ctl.y, z: E.ctl.z, r: 10, kind: 'door' }]);
  assert.ok(ev.some(e => e.type === 'heard')); assert.equal(E.state, 'investigate');
  // 足音：走る＝13m・歩く＝4.5m・止まっている＝なし
  const s = {}; assert.equal(footstepNoise(s, P(1, 1, { moving: false }), 1), null);
  assert.equal(footstepNoise(s, P(1, 1, { moving: true, running: true }), 1).r, ENEMY_DEFAULTS.hear.run);
});

await t('チェックポイント（近づくと記録・捕まったら最後の所）・足元の面（畳・板・土間・砂利・土・森）・足音の音色の表', () => {
  const C = new Checkpoints(GP.checkpoints); assert.deepEqual(C.respawnAt(), L.start);
  const v = GP.checkpoints[1]; assert.equal(C.check(v.at[0] + 1, v.at[1], v.at[2]).id, v.id); assert.equal(C.check(v.at[0], v.at[1], v.at[2]), null, '2 回目は出来事なし');
  assert.deepEqual(C.respawnAt(), v.at); C.reset(); assert.equal(C.last.id, 'cp.start');
  const idx = surfaceIndex(L), w = world, h1 = L.buildings.find(b => b.id === 'h1');
  const rm = n => h1.rooms.find(r => r.name === n).center;
  assert.equal(surfaceAt(w, idx, rm('washitsu_6')[0], rm('washitsu_6')[2]), 'tatami'); assert.equal(surfaceAt(w, idx, rm('doma')[0], rm('doma')[2]), 'earth');
  assert.equal(surfaceAt(w, idx, rm('daidokoro')[0], rm('daidokoro')[2]), 'wood');
  const sp = L.paths.find(p => p.id === 'sando').points[10]; assert.equal(surfaceAt(w, idx, sp[0], sp[2]), 'gravel');
  const yp = L.paths.find(p => p.id === 'yamamichi').points[40]; assert.equal(surfaceAt(w, idx, yp[0], yp[2]), 'dirt');
  assert.equal(surfaceAt(w, idx, 200, 40), 'forest');
  for (const k of ['tatami', 'wood', 'earth', 'stone', 'gravel', 'dirt', 'forest']) assert.ok(STEP_TONE[k] && STEP_TONE[k].f > 0, k);
});

await t('描画の純粋な部分：遠くの地面のむら（地図から決まる 256×256・同じ入力で同じ）・葉のカードの写し（数が 2 倍・幹のまわり）・量子化した属性を float に', async () => {
  const { macroVariation } = await import('../mapkit/render/terrain.js');
  const a = macroVariation(hf, L, 64), b = macroVariation(hf, L, 64);
  assert.deepEqual(a.data, b.data); assert.equal(a.data.length, 64 * 64 * 4);
  const ch = k => { let mn = 255, mx = 0; for (let i = k; i < a.data.length; i += 4) { mn = Math.min(mn, a.data[i]); mx = Math.max(mx, a.data[i]); } return mx - mn; };
  assert.ok(ch(0) > 60 && ch(1) > 60 && ch(2) > 40, '3 つの ch に幅がある');
  const THREE = await import('three'); const { moreCards, toFloat } = await import('../mapkit/render/assets.js');
  const g = new THREE.PlaneGeometry(1, 1).translate(1, 2, 0), m = moreCards(g, 1, 'veg.tree.sugi');
  assert.equal(m.attributes.position.count, g.toNonIndexed().attributes.position.count * 2);
  const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.BufferAttribute(new Int16Array([32767, 0, -32767]), 3, true));
  const f = toFloat(q); assert.ok(f.attributes.position.array instanceof Float32Array); assert.ok(Math.abs(f.attributes.position.getX(0) - 1) < 1e-4);
});

await t('UE5（5.8.3 向け・未検証）：import_layout.py --selftest が UE なしで通る（偽の unreal で置く・消す・Interchange／古い FBX の取り込み）。遊びの印が配置と同じ数', () => {
  const py = spawnSync('python3', ['-c', 'print(1)'], { encoding: 'utf8' }).status === 0; if (!py) { console.log('    （python3 が無いので飛ばす）'); return; }
  const r = spawnSync('python3', ['-I', join(ROOT, 'tools/ue5/import_layout.py'), '--selftest'], { encoding: 'utf8', cwd: ROOT }); assert.equal(r.status, 0, r.stderr);
  const U = JSON.parse(r.stdout), lay = readJson('maps/haison/build/layout.json');
  assert.equal(U.gameplay_marks['wakaba_door:'], lay.gameplay.doors.length); assert.equal(U.gameplay_marks.wakaba_checkpoint, lay.gameplay.checkpoints.length);
  assert.equal(U.gameplay_marks['wakaba_enemy_route:'], lay.gameplay.enemies[0].route.length);
  assert.equal(U.fake_unreal.place[1].removed, U.fake_unreal.place[0].placed + U.fake_unreal.place[0].marks + 1, '2 回目は前に置いた物（タグ）を消す');
  assert.equal(U.fake_unreal.interchange, 'interchange'); assert.equal(U.fake_unreal.legacy, 'fbx_legacy');
  for (const p of ['mesh_pipeline.build_nanite', 'common_meshes_properties.force_all_mesh_as_type', 'AssetImportTask.options', 'static_mesh_import_data.build_nanite']) assert.ok(U.fake_unreal.props.includes(p), p);
  assert.ok(U.kit_plan.count >= 31);
  const src = readFileSync(join(ROOT, 'tools/ue5/import_layout.py'), 'utf8');
  assert.ok(/EditorActorSubsystem/.test(src) && /InterchangeGenericAssetsPipeline/.test(src) && /FbxImportUI/.test(src));
  assert.ok(/未検証/.test(readFileSync(join(ROOT, 'tools/ue5/README.md'), 'utf8')), 'README に未検証の印');
});

await t('sw.js：版 2026-10-27.1・復号器（Meshopt・KTX2 の transcoder の wasm）と .mo.glb・.ktx2 を振り分ける。vendor の復号器がある', () => {
  const listeners = {}, ctx = { self: { location: new URL('https://example.github.io/dannoura-game/sw.js'), addEventListener: (k, f) => (listeners[k] = f) }, URL, Set, Map, Promise, console, Response: class {}, Headers: class {} };
  vm.createContext(ctx); vm.runInContext(readFileSync(join(ROOT, 'sw.js'), 'utf8') + '\n;globalThis.__sw={VERSION,kindOf};', ctx);
  const sw = ctx.__sw, u = p => new URL('https://example.github.io/dannoura-game/' + p);
  assert.equal(sw.VERSION, '2026-10-27.1');
  assert.equal(sw.kindOf(u('vendor/three-esm/three-0.185.1/addons/libs/basis/basis_transcoder.wasm')), 'code');
  assert.equal(sw.kindOf(u('vendor/three-esm/three-0.185.1/addons/libs/meshopt_decoder.module.js')), 'code');
  assert.equal(sw.kindOf(u('wakaba-assets/entries/rock/rock.boulder/web/rock.boulder.mo.glb')), 'media');
  assert.equal(sw.kindOf(u('wakaba-assets/entries/material/mat.wall.tsuchikabe/web/albedo_1024.ktx2')), 'media');
  for (const f of ['libs/meshopt_decoder.module.js', 'libs/basis/basis_transcoder.js', 'libs/basis/basis_transcoder.wasm', 'loaders/KTX2Loader.js', 'utils/WorkerPool.js', 'libs/ktx-parse.module.js', 'libs/zstddec.module.js', 'math/ColorSpaces.js']) assert.ok(existsSync(join(ROOT, 'vendor/three-esm/three-0.185.1/addons', f)), f);
  // Meshopt の写し：目録の web にある・元より小さい・節の名前（LOD0）と材質の名前（mat.*）が残る
  const cat = readJson('wakaba-assets/catalog.json'), rock = cat.entries.find(e => e.id === 'rock.boulder'), mo = rock.web.find(w => w.file.endsWith('.mo.glb')), raw0 = rock.web.find(w => w.file.endsWith('rock.boulder.glb'));
  assert.ok(mo && mo.bytes < raw0.bytes * 0.5);
  const b = readFileSync(join(ROOT, 'wakaba-assets/entries', rock.dir, mo.file)), J = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  assert.ok(J.extensionsUsed.includes('EXT_meshopt_compression')); assert.ok(J.nodes.some(n => /^v\d+_LOD0$|^LOD0$/.test(n.name))); assert.ok(J.materials.every(m => /^mat\./.test(m.name)));
});

console.log(`wakaba-mapkit-phase4: ${n} ok`);
