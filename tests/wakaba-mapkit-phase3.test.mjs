// わかば mapkit フェーズ 3（写実の試験マップ）：自作の材質の組がそろっているか・大きさ・目録と門・部品（glb）の形・LOD の選び方・素材の予算・
// 飾りの層・地面の塗り分け・建物の組み立て（見た目だけ・当たりは変えない）。docs/wakaba-mapkit/11。
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, rootPath, loadConfig, registry } from '../mapkit/core/node.mjs';
import { makeContext, evaluate, evaluateTargets, isRepoGenerated } from '../mapkit/assets/gate.js';
import { lodIndex, assignLods, scaledDists } from '../mapkit/render/lod.js';
import { MAP_PRESETS, pickTexSize, texBytes, estimateTexMB, estimateBudget } from '../mapkit/render/quality.js';
import { STANDINS } from '../mapkit/pcg/scatter.js';
import { DRESSING_STANDINS } from '../mapkit/pcg/dressing.js';
import { heightfieldFromPNG } from '../mapkit/terrain/heightmap.js';
import { buildLayout } from '../mapkit/pcg/layout.js';
import { World } from '../mapkit/core/world.js';
register('./helpers/three-node-hooks.mjs', import.meta.url);

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const config = loadConfig(), cat = readJson('wakaba-assets/catalog.json'), byId = new Map(cat.entries.map(e => [e.id, e]));
const L = readJson('maps/haison/build/layout.json');
const webDir = e => join(ROOT, 'wakaba-assets/entries', e.dir, 'web');
/** WebP の幅・高さ・透過（VP8／VP8L／VP8X） */
function webpInfo(b) {
  const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (tag === 'VP8X') return { w: 1 + (b[24] | b[25] << 8 | b[26] << 16), h: 1 + (b[27] | b[28] << 8 | b[29] << 16), alpha: !!(b[20] & 0x10) };
  if (tag === 'VP8L') { const v = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24; return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, alpha: !!((v >> 28) & 1) }; }
  return { w: (b[26] | b[27] << 8) & 0x3fff, h: (b[28] | b[29] << 8) & 0x3fff, alpha: false };
}
/** glb の JSON の部分 */
const glbJson = f => { const b = readFileSync(f), jl = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + jl).toString()); };

// 依頼の材質（森の床・苔・草・砂利の道・土の道・岩（地衣類）・崖・杉材・銀灰の板・土壁・瓦・苔むした瓦・錆びたトタン・畳・障子・朱塗り・石・樹皮 2）
const WANT_MATS = ['mat.ground.forest_floor', 'mat.ground.moss', 'mat.ground.grass', 'mat.ground.gravel_path', 'mat.ground.dirt_path', 'mat.rock.andesite', 'mat.rock.cliff',
  'mat.wood.cedar', 'mat.wood.planks_silver', 'mat.wall.tsuchikabe', 'mat.roof.kawara', 'mat.roof.kawara_moss', 'mat.metal.tin_rust', 'mat.floor.tatami', 'mat.paper.shoji',
  'mat.paint.shu', 'mat.stone.granite', 'mat.bark.sugi', 'mat.bark.broadleaf', 'mat.foliage.sugi', 'mat.foliage.broadleaf', 'mat.foliage.fern', 'mat.foliage.grass'];

await t('材質の組：依頼の 23 種がそろう・各組に albedo／normal／orh・書いた大きさのファイルがあり辺が合う・透過の材質は RGBA・ORH は 512 まで・1 枚 8MB 未満', () => {
  for (const id of WANT_MATS) {
    const e = byId.get(id); assert.ok(e && e.material, '目録にある ' + id);
    const M = e.material; assert.equal(M.material, 'wakaba-material/1'); assert.ok(M.tileM > 0.2 && M.tileM < 10, id + ' tileM');
    for (const k of ['albedo', 'normal', 'orh']) {
      const sizes = Object.keys(M.maps[k] || {}).map(Number); assert.ok(sizes.length >= 2, `${id} ${k} の段の大きさ`);
      for (const s of sizes) {
        const f = join(webDir(e), M.maps[k][s]); assert.ok(existsSync(f), f);
        const b = readFileSync(f), info = webpInfo(b); assert.equal(String.fromCharCode(b[8], b[9], b[10], b[11]), 'WEBP');
        assert.equal(info.w, s, `${f} の幅`); assert.equal(info.h, s, `${f} の高さ`); assert.ok(b.length < 8 * 1048576);
        if (k === 'albedo' && M.alpha) assert.ok(info.alpha, `${f} は透過`);
        if (k === 'orh') assert.ok(s <= 512, 'ORH は 512 まで');
      }
    }
    assert.ok(Math.max(...M.sizes) <= config.projects.shinshoku.targets[0].settings.textures.maxSize);
  }
  // 地面・岩・壁・屋根は 1024 がある（近くで大きく見える）。葉のカードは 512 まで
  for (const id of ['mat.ground.forest_floor', 'mat.rock.cliff', 'mat.wall.tsuchikabe', 'mat.roof.kawara']) assert.ok(byId.get(id).material.maps.albedo['1024'], id);
  for (const id of WANT_MATS.filter(x => x.startsWith('mat.foliage'))) { assert.equal(byId.get(id).material.card, true); assert.ok(Math.max(...byId.get(id).material.sizes) <= 512); }
});

await t('目録と門：自作の素材（license own・source.generator が tools/ の下）は web・ue5 とも pass、verifiedBy が空なのは注意（UNVERIFIED_GENERATED）だけ。条件を外すと止まる', () => {
  for (const e of cat.entries) { assert.equal(e.targets.web.result, 'pass', e.id); assert.equal(e.targets.ue5.result, 'pass', e.id); }
  const meta = readJson(`wakaba-assets/entries/${byId.get('mat.ground.moss').dir}/meta.json`);
  assert.equal(meta.license.verifiedBy, '', 'AI は verifiedBy を書かない'); assert.ok(isRepoGenerated(meta));
  const web = makeContext(config, 'shinshoku', { target: 'web' }), r = evaluate(meta, web);
  assert.equal(r.result, 'pass'); assert.deepEqual(r.warnings.map(w => w.code), ['UNVERIFIED_GENERATED']);
  const clone = o => JSON.parse(JSON.stringify(o)), codes = m => evaluate(m, web).reasons.map(x => x.code);
  for (const [why, mut] of [['道具が tools/ の外', m => { m.source.generator = 'somewhere/gen.py'; }], ['.. を含む', m => { m.source.generator = 'tools/../x.py'; }], ['license が CC0', m => { m.license.id = 'CC0-1.0'; }],
    ['自作でない', m => { m.source.type = 'cc0_site'; }], ['再配布 no', m => { m.license.redistributeRaw = 'no'; }]]) { const m = clone(meta); mut(m); assert.ok(codes(m).includes('UNVERIFIED'), why); }
  const v = clone(meta); v.license.verifiedBy = 'user'; assert.deepEqual(evaluate(v, web).warnings, [], '人が確かめたら注意も消える');
  // generator のファイルが実在する
  for (const e of cat.entries) { const m = readJson(`wakaba-assets/entries/${e.dir}/meta.json`); assert.ok(existsSync(rootPath(m.source.generator)), m.source.generator); }
});

await t('部品（glb）：配置の全部の種類に部品がある・節の名前（LOD<n>／v<k>_LOD<n>／IMP）・材質は目録の材質の名前・頂点の AO（COLOR_0）と接線がある・大きさが仮の形に近い', () => {
  const kinds = [...new Set([...L.objects.map(o => o.kind), ...L.instances.map(i => i.kind)])];
  for (const k of [...kinds, 'bld.jp_house.wall_panel', 'bld.jp_house.post', 'bld.jp_house.roof_ridge', 'bld.jp_house.window_koshi', 'bld.jp_house.door_shoji', 'bld.shrine.honden', 'bld.shrine.torii', 'veg.fern']) {
    const e = byId.get(k); assert.ok(e && e.kit, '部品がある ' + k);
    const g = glbJson(join(webDir(e), `${k}.glb`));
    const names = g.nodes.filter(nd => nd.mesh != null || nd.children).map(nd => nd.name);
    assert.ok(names.every(nm => /^(v\d+_)?LOD\d$|^IMP$/.test(nm)), k + ' の節 ' + names.join(','));
    assert.ok(names.some(nm => /LOD0$/.test(nm)));
    for (const m of g.materials) assert.ok(byId.has(m.name) || m.name.startsWith('imp.'), `${k} の材質 ${m.name} が目録にある`);
    const impMesh = (g.nodes.find(nd => nd.name === 'IMP') || {}).mesh;
    g.meshes.forEach((me, mi) => { if (mi === impMesh) return; for (const p of me.primitives) { assert.ok('COLOR_0' in p.attributes, k + ' AO'); assert.ok('TANGENT' in p.attributes, k + ' 接線'); } });
    if (e.kit.impostor) assert.ok(names.includes('IMP') && g.images && g.images.length === 1, k + ' 遠景の板');
  }
  // 当たりのある物：見た目の足元が当たり（仮の形）から大きく外れない（±45%）
  for (const [k, d] of Object.entries(STANDINS)) {
    const e = byId.get(k); if (!e || !d.col || k.startsWith('veg.') || k === 'prop.utility_pole') continue;   // 電柱の腕木は頭の上（7.5m）
    const [w, h, dd] = e.tech.sizeM;
    assert.ok(Math.abs(w - d.size[0]) / d.size[0] < 0.45 && Math.abs(dd - d.size[2]) / Math.max(d.size[2], 0.3) < 0.6, `${k} 足元 ${e.tech.sizeM} ≈ ${d.size}`);
  }
});

await t('LOD の選び方：距離で段が上がる・境目で行ったり来たりしない（ヒステリシス）・遠い物と視野の外は描かない・スマホは LOD1 から', () => {
  const D = [20, 60];
  assert.equal(lodIndex(5, D), 0); assert.equal(lodIndex(25, D), 1); assert.equal(lodIndex(80, D), 2);
  assert.equal(lodIndex(20.9, D, 0), 0, '境目の少し外は前の段のまま'); assert.equal(lodIndex(24, D, 0), 1); assert.equal(lodIndex(19.5, D, 1), 1);
  assert.equal(lodIndex(3, D, -1, 0.08, 1), 1, 'lodMin');
  const items = [{ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 30 }, { x: 0, y: 0, z: 100 }, { x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: -10 }];
  const r = assignLods(items, { x: 0, y: 0, z: 0 }, D, { cull: 300, visible: it => it.z > 0 });
  assert.deepEqual(r.buckets, [[0], [1], [2]]); assert.equal(r.culled, 2); assert.equal(items[3].lod, -1);
  assert.deepEqual(scaledDists([28, 70], 0.6), [16.8, 42]); assert.deepEqual(scaledDists([5], 0.5), [4]);
});

await t('予算：新しい素材の合計 ≤ 30MB・スマホ（低）で読む量 ≤ 15MB・PC ≤ 60MB・GPU のテクスチャの見積もりが段の上限の中・描画の見積もりが段の上限の中', () => {
  let all = 0, low = 0, high = 0;
  for (const e of cat.entries) {
    for (const f of e.web) all += f.bytes;
    if (e.material) for (const [k, bySize] of Object.entries(e.material.maps)) {
      const sz = Object.keys(bySize).map(Number);
      low += statSync(join(webDir(e), bySize[pickTexSize(sz, MAP_PRESETS.low.texMax)])).size; high += statSync(join(webDir(e), bySize[pickTexSize(sz, MAP_PRESETS.high.texMax)])).size; void k;
    }
    if (e.kit) { const b = e.web.find(f => f.file.endsWith('.glb')).bytes; low += b; high += b; }
  }
  const MB = b => b / 1048576, B = config.projects.shinshoku.targets[0].settings.budget;
  assert.ok(MB(all) <= 30, `合計 ${MB(all).toFixed(1)}MB`); assert.ok(MB(low) <= B.downloadMBLow, `低 ${MB(low).toFixed(1)}MB`); assert.ok(MB(high) <= B.downloadMB, `高 ${MB(high).toFixed(1)}MB`);
  const mats = cat.entries.filter(e => e.material).map(e => e.material);
  for (const p of ['ultra', 'high', 'mid', 'low']) {
    const tex = estimateTexMB(mats, p, { layers: MAP_PRESETS[p].terrainLayers, size: 1024 }); assert.ok(tex <= MAP_PRESETS[p].texMB, `${p} テクスチャ ${tex}MB`);
    const est = estimateBudget(L, p); assert.ok(est.drawCalls <= MAP_PRESETS[p].drawCalls && est.tris <= MAP_PRESETS[p].tris, `${p} ${JSON.stringify(est)}`);
  }
  assert.equal(texBytes(1024), Math.round(1024 * 1024 * 4 * 4 / 3)); assert.equal(pickTexSize([1024, 512, 256], 512), 512); assert.equal(pickTexSize([512, 256, 128], 1024), 512);
});

await t('飾りの層（層 7）：決まった結果・散布の後ろ（前の層を変えない）・中の物は当たりなし・当たりのある物は歩きの検査に入る・仕様で止められる', async () => {
  const spec = readJson('maps/haison/map.spec.json'), S = spec.terrain.source;
  const raw = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/heightmap.png')), { size: [spec.size.w, spec.size.d], minY: S.minY, maxY: S.maxY });
  const A = buildLayout(spec, raw).layout, d = A.objects.filter(o => o.layer === 'dressing');
  assert.equal(A.hash, L.hash, 'maps/haison/build と同じ');
  assert.ok(d.length >= 15, '飾り ' + d.length);
  for (const k of ['prop.futon', 'prop.irori', 'prop.well', 'prop.utility_pole', 'prop.komainu', 'prop.stone_lantern']) assert.ok(d.some(o => o.kind === k), k);
  for (const o of d) { assert.ok(DRESSING_STANDINS[o.kind], o.kind); if (o.inside && !DRESSING_STANDINS[o.kind].col) assert.equal(o.col, null, o.id); }
  const off = JSON.parse(JSON.stringify(spec)); off.dressing = false;
  const B = buildLayout(off, raw).layout, keep = l => l.objects.filter(o => o.layer !== 'dressing').map(o => o.id + o.at.join()).join('|');
  assert.equal(keep(B), keep(A), '飾りは前の層を変えない'); assert.equal(B.objects.filter(o => o.layer === 'dressing').length, 0);
  const W = new World(A, raw); assert.ok(W.colliders.some(c => /^dressing#/.test(c.id)), '井戸・電柱などは当たりがある');
});

await t('地面の塗り分け：重みの合計 1・道は土／砂利・急な所は崖・木の下は森の床・壁ぎわは暗い（AO）', async () => {
  const { splatWeights, treeDensity, pathField } = await import('../mapkit/render/terrain.js');
  const hf = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/build/terrain.png')), { size: L.size, minY: L.terrain.minY, maxY: L.terrain.maxY });
  const ctx = { layout: L, trees: treeDensity(L), pads: L.buildings.map(b => b.obb), paths: L.paths, field: pathField(L), extent: hf.extent() };
  const w = (x, z) => splatWeights(x, z, hf, ctx);
  for (const [x, z] of [[10, 10], [128, 120], [60, 190], [200, 50], [160, 160]]) { const r = w(x, z); assert.ok(Math.abs(r.w.reduce((a, b) => a + b, 0) - 1) < 1e-6); assert.ok(r.ao > 0.3 && r.ao <= 1); }
  const yp = L.paths.find(p => p.kind === 'mountain_path').points[40], sp = L.paths.find(p => p.kind === 'shrine_approach').points[10];
  assert.ok(w(yp[0], yp[2]).w[3] > 0.6, '山道は土'); assert.ok(w(sp[0], sp[2]).w[4] > 0.5, '参道は砂利');
  let steep = null; for (let x = 40; x < 120 && !steep; x += 0.5) for (let z = 170; z < 205 && !steep; z += 0.5) if (hf.slopeDeg(x, z) > 50) steep = [x, z];
  assert.ok(w(...steep).w[5] > 0.8, '崖');
  const tr = L.objects.filter(o => o.cls === 'tree').sort((a, b) => ctx.trees.at(b.at[0], b.at[2]) - ctx.trees.at(a.at[0], a.at[2]))[0];
  assert.ok(w(tr.at[0] + 0.5, tr.at[2]).w[0] > 0.3, '森の中は森の床');
  const b = L.buildings[0].obb; assert.ok(w(b.cx + Math.sin(b.rot) * (b.hz + 0.2), b.cz + Math.cos(b.rot) * (b.hz + 0.2)).ao < 0.9, '壁ぎわは暗い');
  // 速さ：0.5m の距離の場＝道の近くは nearestOnPath と同じ値（±0.2m）
  const { nearestOnPath } = await import('../mapkit/pcg/paths.js'), p0 = L.paths[0];
  for (const [x, z] of [[yp[0] + 1.3, yp[2] - 0.7], [yp[0] - 2.1, yp[2] + 1.1]]) assert.ok(Math.abs(ctx.field.dirt(x, z) - Math.min(...L.paths.filter(p => p.kind !== 'shrine_approach').map(p => nearestOnPath(p.points, x, z).d - p.width / 2))) < 0.25);
  void p0;
});

await t('建物の組み立て（見た目だけ）：土壁の区画・柱・棟・格子窓・障子・本殿・鳥居・灯籠が置かれる・障子は扉の開口を塞がない・当たりの部品は変えない', async () => {
  const { buildBuildings } = await import('../mapkit/render/buildings.js');
  const before = JSON.stringify(L.buildings), B = buildBuildings(L);
  assert.equal(JSON.stringify(L.buildings), before, 'layout を書き換えない');
  const k = B.kitItems;
  assert.ok(k['bld.jp_house.wall_panel'].length > 60 && k['bld.jp_house.post'].length > 60, '区画と柱');
  for (const id of ['bld.jp_house.roof_ridge', 'bld.jp_house.window_koshi', 'bld.jp_house.door_shoji', 'bld.shrine.honden', 'bld.shrine.torii', 'prop.stone_lantern']) assert.ok(k[id] && k[id].length, id);
  assert.ok(new Set(k['bld.jp_house.wall_panel'].map(i => i.variant)).size >= 3, '傷みの種類');
  for (const m of ['mat.floor.tatami', 'mat.wood.planks_silver', 'mat.ground.dirt_path', 'mat.stone.granite']) assert.ok(B.geometries[m], m);
  assert.ok(B.geometries['mat.roof.kawara'] || B.geometries['mat.roof.kawara_moss'] || B.geometries['mat.metal.tin_rust'], '屋根');
  for (const b of L.buildings) for (const d of b.doors) for (const it of k['bld.jp_house.door_shoji']) {
    const dx = it.x - d.at[0], dz = it.z - d.at[2], r = d.rotY * Math.PI / 180, lat = Math.abs(dx * Math.cos(r) - dz * Math.sin(r));
    if (Math.hypot(dx, dz) < 3) assert.ok(lat >= d.width / 2 - 0.05, `${d.id} の障子は開口の横 ${lat.toFixed(2)}`);
  }
});

console.log(`wakaba-mapkit-phase3: ${n} ok`);
