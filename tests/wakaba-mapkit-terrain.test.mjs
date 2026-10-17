// わかば mapkit フェーズ 2：PNG（16bit）の読み書き・高さマップ（高さ・法線・傾き）・手続きの地形・乱数/当たり/画質の共通化（境界侵食は再輸出）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePNG, encodePNG, encodePNG16 } from '../mapkit/terrain/png.js';
import { Heightfield, heightfieldFromPNG, heightfieldFromRAW16, fromUint16 } from '../mapkit/terrain/heightmap.js';
import { generateTerrain } from '../mapkit/terrain/generate.js';
import { rng, seeded, xorshift, childRng, hashStr } from '../mapkit/core/rng.js';
import * as geom from '../mapkit/core/geom.js';
import * as collide from '../shinshoku/world/collide.js';
import { rng as brainRng } from '../shinshoku/ai/brain.js';
import { seeded as townSeeded } from '../shinshoku/data/town.js';
import { autoPreset as shAuto } from '../shinshoku/render/quality.js';
import { autoPreset, MAP_PRESETS, checkBudget } from '../mapkit/render/quality.js';
import { readJson, rootPath } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const spec = readJson('maps/haison/map.spec.json');

await t('PNG：16bit グレーと 8bit RGB の書き → 読みで値が一致・壊れた PNG は止まる', async () => {
  const W = 33, H = 17, v = new Uint16Array(W * H).map((_, i) => (i * 7919 + (i >> 3) * 104729) & 0xffff);
  const d = await decodePNG(await encodePNG16(W, H, v));
  assert.deepEqual([d.width, d.height, d.bitDepth, d.colorType], [W, H, 16, 0]); assert.deepEqual([...d.data], [...v]);
  const c = new Uint8Array(W * H * 3).map((_, i) => (i * 31) & 255), e = await decodePNG(await encodePNG(W, H, c, { channels: 3 }));
  assert.equal(e.colorType, 2); assert.deepEqual([...e.data], [...c]);
  const png = await encodePNG16(W, H, v); png[40] ^= 0xff;
  await assert.rejects(decodePNG(png), /CRC/); await assert.rejects(decodePNG(new Uint8Array(20)), /PNG ではありません/);
});

await t('高さマップ：格子の点は値そのもの・間は双線形・平面の傾き 30° と法線・RAW16 と PNG の往復', async () => {
  const hf = new Heightfield({ nx: 5, nz: 4, cell: 2, minY: 0, maxY: 50 }), tan = Math.tan(Math.PI / 6);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) hf.set(i, j, 10 + i * 2 * tan);
  assert.equal(hf.at(4, 2), hf.get(2, 1)); assert.ok(Math.abs(hf.at(3, 3) - (10 + 3 * tan)) < 1e-5);
  assert.ok(Math.abs(hf.slopeDeg(4, 3) - 30) < 0.01, hf.slopeDeg(4, 3));
  const nn = hf.normal(4, 3); assert.ok(Math.abs(nn[0] + Math.sin(Math.PI / 6)) < 1e-4 && Math.abs(nn[1] - Math.cos(Math.PI / 6)) < 1e-4);
  const q = hf.clone().quantize(), back = await heightfieldFromPNG(await hf.toPNG16(), { size: [8, 6], minY: 0, maxY: 50 });
  assert.deepEqual([back.nx, back.nz, back.cell], [5, 4, 2]); for (let k = 0; k < q.data.length; k++) assert.ok(Math.abs(back.data[k] - q.data[k]) < 1e-5);
  const raw = heightfieldFromRAW16(hf.toRAW16(), { nx: 5, nz: 4, size: [8, 6], minY: 0, maxY: 50 }); assert.equal(raw.fingerprint(), back.fingerprint());
  assert.ok(Math.abs(hf.quantizeValue(12.3456) - 12.3456) < 50 / 65535);
  assert.throws(() => fromUint16(5, 4, new Uint16Array(20), { size: [8, 9] }), /正方形/);
});

await t('置いた高さマップ（maps/haison/heightmap.png）：257×257・1m・範囲の中・手続きの地形を作り直すと同じ', async () => {
  const s = spec.terrain.source, hf = await heightfieldFromPNG(readFileSync(rootPath('maps/haison/' + s.file)), { size: [spec.size.w, spec.size.d], minY: s.minY, maxY: s.maxY });
  assert.deepEqual([hf.nx, hf.nz, hf.cell], [257, 257, 1]);
  const [lo, hi] = hf.extent(); assert.ok(lo >= s.minY && hi <= s.maxY && hi - lo > 20, `${lo}〜${hi}`);
  assert.equal(generateTerrain(spec).quantize().fingerprint(), hf.fingerprint(), 'gen_heightmap.mjs で作り直せる（同じ仕様＋同じ種 → 同じ PNG）');
});

await t('手続きの地形：同じ種 → 同じ・違う種 → 違う・崖は急・平らな谷は坂の上限の内', () => {
  const a = generateTerrain(spec, { drops: 3000 }), b = generateTerrain(spec, { drops: 3000 }), c = generateTerrain(Object.assign({}, spec, { seed: 'other' }), { drops: 3000 });
  assert.equal(a.fingerprint(), b.fingerprint()); assert.notEqual(a.fingerprint(), c.fingerprint());
  const cliff = spec.terrain.features.find(f => f.type === 'cliff'), [p, q] = cliff.path, mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
  assert.ok(a.at(mx, mz + 8) - a.at(mx, mz - 8) > cliff.height * 0.6, '崖の北が高い');
  let steep = 0; for (let d = -2; d <= 2; d += 0.5) steep = Math.max(steep, a.slopeDeg(mx, mz + d)); assert.ok(steep > 45, '崖の面は 45° 超：' + steep);
  const v = spec.terrain.features.find(f => f.type === 'valley_flat'); let worst = 0;
  for (let r = 0; r < v.radius * 0.5; r += 3) for (let k = 0; k < 12; k++) worst = Math.max(worst, a.slopeDeg(v.center[0] + r * Math.cos(k), v.center[1] + r * Math.sin(k)));
  assert.ok(worst <= v.maxSlope + 1, '谷の内側の坂 ' + worst);
  // 平らな下地・特徴（川・池）も作れる
  const f = generateTerrain({ seed: 'x', size: { w: 64, d: 64 }, terrain: { source: { type: 'heightmap', minY: 0, maxY: 20 }, fallback: { type: 'flat', y: 10 }, features: [{ type: 'river', path: [[0, 32], [64, 32]], width: 4, height: 1.5 }, { type: 'pond', center: [16, 16], radius: 5, height: 1 }] }, gameplay: { start: [5, 5] } });
  assert.ok(f.at(32, 32) < 9 && Math.abs(f.at(32, 50) - 10) < 0.01 && f.at(16, 16) < 9.5, '川の溝・池のくぼみ');
});

await t('共通化：境界侵食の乱数・当たり・画質の自動の段は mapkit から再輸出（同じ関数・同じ数）', () => {
  assert.equal(brainRng, rng); assert.equal(townSeeded, seeded); assert.equal(shAuto, autoPreset);
  for (const k of ['box', 'resolveCircle', 'insideAny', 'rayBoxes', 'lineOfSight', 'rayCylinder', 'raySphere']) assert.equal(collide[k], geom[k], k);
  const r = rng(5); assert.deepEqual([r(), r()], [0.6897749109193683, 0.7727432732935995], '移す前と同じ数');
  assert.equal(seeded('abc')(), 0.8008); const x = xorshift(1000); assert.deepEqual([x(), x()], [0.72694, 0.17705], 'townmat の元の rng と同じ');
  assert.notEqual(childRng('s', 'trees')(), childRng('s', 'rocks')()); assert.equal(hashStr('a'), 0xe40c292c);
  assert.equal(autoPreset({ touch: true, w: 844, h: 390 }), 'low'); assert.equal(autoPreset({ touch: false, w: 1920, h: 1080, cores: 8 }), 'high');
  assert.deepEqual(Object.keys(MAP_PRESETS), ['ultra', 'high', 'mid', 'low']); assert.equal(MAP_PRESETS.low.drawCalls, 120);
  assert.equal(checkBudget('low', { drawCalls: 121 }).pass, false); assert.equal(checkBudget('ultra', { drawCalls: 300, tris: 1e6 }).pass, true);
});

await t('形：OBB の交差・重なりの面積・円の押し出し・線分との距離', () => {
  const a = { cx: 0, cz: 0, hx: 1, hz: 1, rot: 0 }, b = { cx: 1.5, cz: 0, hx: 1, hz: 1, rot: geom.deg(45) };
  assert.ok(geom.obbOverlap(a, b)); assert.ok(!geom.obbOverlap(a, { ...b, cx: 3.5 }));
  assert.ok(Math.abs(geom.obbOverlapArea(a, { cx: 1, cz: 0, hx: 1, hz: 1, rot: 0 }) - 2) < 1e-9);
  const p = { x: 2.1, z: 0 }; geom.pushCircleObb(p, 0.3, { cx: 0, cz: 0, hx: 2, hz: 1, rot: 0 }); assert.ok(Math.abs(p.x - 2.3) < 1e-9);
  const [wx, wz] = geom.toWorld(0, 0, geom.deg(90), 0, 1); assert.ok(Math.abs(wx - 1) < 1e-9 && Math.abs(wz) < 1e-9, '前（+z）は rot 90° で +x');
  assert.ok(geom.obbCapsule(a, [-5, 1.2], [5, 1.2], 0.3)); assert.ok(!geom.obbCapsule(a, [-5, 1.4], [5, 1.4], 0.3));
});

console.log(`wakaba-mapkit-terrain: ${n} ok`);
