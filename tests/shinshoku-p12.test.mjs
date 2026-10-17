// 『境界侵食』P12「環境の写実化（テイルズ風の描き込み・光）」の点検。
// ・材質（matgen_town.py）が素材ライブラリにあり、目録の web の門を通る（自作・商用可）。PBR の地図帳（bake_town_pbr.py）の並びが townmat.js の枠と同じ・大きさが段の通り。
// ・Blender の部品（build_kit_town.py）が目録にあり、節の名前（LOD）・材質の名前（地図帳の枠に置き換えられる名前）。
// ・画質の段：ultra／high／mid は PBR・low（スマホ）は toon のまま・自動で ultra は選ばない。区画ごとの色の調整が全部の区画にある。
// ・手続きの形は部品の「代わりの網」（B.fb）：部品が読めない時も今まで通り描ける。当たり判定は変えない（townSolids は形と別）。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };

const { TILES, ATLAS_N, ATLAS_ROWS, tileRect } = await import('../shinshoku/render/townmat.js');
const { PRESETS, PRESET_KEYS, autoPreset, applyPreset } = await import('../shinshoku/render/quality.js');
const { GRADES, gradeAt, townZone } = await import('../shinshoku/data/envgrade.js');
const { INTERIOR, ENV } = await import('../shinshoku/render/envmat.js');
const { KIT_PIECES, kitCollector, envKitInit } = await import('../shinshoku/world/envkit.js');
const { AREA_GRAPH } = await import('../shinshoku/data/areas.js');
const cat = J('wakaba-assets/catalog.json'), byId = new Map(cat.entries.map(e => [e.id, e]));

function webpSize(b) {
  const tag = String.fromCharCode(...b.slice(12, 16));
  if (tag === 'VP8X') return { w: 1 + (b[24] | b[25] << 8 | b[26] << 16), h: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
  if (tag === 'VP8 ') return { w: (b[26] | b[27] << 8) & 0x3fff, h: (b[28] | b[29] << 8) & 0x3fff };
  if (tag === 'VP8L') { const bits = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24; return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }; }
  return null;
}

await t('町と屋内の材質（mat.town.*・mat.int.*）：目録にあり web の門を通る・自作で商用可・色／法線／ORH の段（512 と 256）がある', () => {
  const ids = cat.entries.filter(e => /^mat\.(town|int)\./.test(e.id)).map(e => e.id);
  assert.ok(ids.length >= 39, '材質の数 ' + ids.length);
  for (const id of ids) {
    const e = byId.get(id); assert.equal(e.targets.web.result, 'pass', id);
    const m = J(`wakaba-assets/entries/${e.dir}/meta.json`);
    assert.equal(m.license.id, 'own'); assert.equal(m.license.commercial, 'yes'); assert.equal(m.source.type, 'self_made'); assert.equal(m.license.verifiedBy, '', 'AI は verifiedBy を書かない');
    assert.ok(existsSync(new URL(m.source.generator, root)), m.source.generator);
    for (const k of ['albedo', 'normal']) for (const s of [512, 256]) assert.ok(m.material.maps[k][String(s)], `${id} ${k} ${s}`);
    assert.ok(m.material.maps.orh['256'], id + ' orh');
  }
});

await t('PBR の地図帳：枠の並び（70）が townmat.js と同じ・枠ごとの値・3 段（512／256／128）の大きさ・材質の枠は目録の門を通った物', () => {
  const man = J('shinshoku/assets/env/townpbr.json');
  assert.deepEqual(man.tiles, TILES); assert.equal(man.n, ATLAS_N); assert.equal(man.rows, ATLAS_ROWS);
  assert.equal(TILES.length, 70); assert.equal(new Set(TILES).size, TILES.length);
  for (const tl of TILES) { const p = man.params[tl]; assert.ok(p && p.length === 4, tl); assert.ok(p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1, tl); }
  for (const [tl, id] of Object.entries(man.sources)) { assert.ok(TILES.includes(tl)); const e = byId.get(id); assert.ok(e && e.targets.web.result === 'pass', id); }
  assert.ok(Object.keys(man.sources).length >= 40, '材質の枠 ' + Object.keys(man.sources).length);
  let total = 0;
  for (const s of [512, 256, 128]) {
    const S = man.sizes[String(s)]; assert.equal(S.w, ATLAS_N * s); assert.equal(S.h, ATLAS_ROWS * s);
    for (const k of ['albedo', 'normal', 'orh']) {
      const b = new Uint8Array(readFileSync(new URL('shinshoku/assets/env/' + S.files[k].file, root))); const sz = webpSize(b);
      assert.deepEqual(sz, { w: S.w, h: S.h }, `${S.files[k].file} の大きさ`); assert.ok(b.length < 4 * 1048576, S.files[k].file); total += b.length;
    }
  }
  assert.ok(total < 8 * 1048576, '地図帳の合計 ' + (total / 1048576).toFixed(2) + 'MB');
  // 枠の範囲：内側へ寄せる（隣の枠がにじまない）・全部 0〜1 の中
  for (const tl of TILES) { const [u0, v0, du, dv] = tileRect(tl); assert.ok(u0 > 0 && v0 > 0 && u0 + du < 1 && v0 + dv < 1, tl); }
});

await t('画質の段：ultra・high・mid は PBR（地図帳の枠 512／256／256）・low（スマホ）は toon・ブルームと映り込みは ultra と high だけ・自動で ultra は選ばない', () => {
  assert.deepEqual(PRESET_KEYS, ['ultra', 'high', 'mid', 'low']);
  assert.equal(PRESETS.ultra.envTile, 512); assert.equal(PRESETS.high.envTile, 256); assert.equal(PRESETS.mid.envTile, 256);
  for (const k of ['ultra', 'high', 'mid']) { assert.equal(PRESETS[k].pbr, true, k); assert.equal(PRESETS[k].kit, true, k); }
  assert.equal(PRESETS.low.pbr, false); assert.equal(PRESETS.low.kit, false); assert.ok(!PRESETS.low.post && !PRESETS.low.refl && !PRESETS.mid.post && !PRESETS.mid.refl);
  assert.ok(PRESETS.ultra.post && PRESETS.high.post && PRESETS.ultra.refl && PRESETS.high.refl);
  for (const env of [{ touch: true, w: 844, h: 390 }, { w: 1920, h: 1080, cores: 16, mem: 32 }, { touch: true, w: 1280, h: 800 }]) assert.notEqual(autoPreset(env), 'ultra');
  assert.equal(applyPreset({}, 'ultra').preset, 'ultra');
  assert.ok(PRESETS.low.envMB <= 8 && PRESETS.high.envMB <= 128 && PRESETS.ultra.envMB <= 320, 'テクスチャの量の目安');
});

await t('色の調整：全部の区画に値がある・町の中の場所（アーケード＝暖・住宅地・駅前・中央通り・自宅）・病院は冷たく濡れない・値の範囲', () => {
  for (const id of Object.keys(AREA_GRAPH)) { const g = gradeAt(id, 0, 0); assert.ok(g && g.expo > 0.6 && g.expo < 1.4, id); assert.ok(g.wet >= 0 && g.wet <= 1, id); }
  assert.equal(townZone(0, -30), 'arcade'); assert.equal(townZone(85, -95), 'station'); assert.equal(townZone(75, -28), 'avenue'); assert.equal(townZone(30, 41), 'residential'); assert.equal(townZone(23, -12), 'glassplaza');
  assert.equal(townZone(42, 50, (x, z) => Math.abs(x - 42) < 6 && z > 46), 'home');
  assert.ok(GRADES.arcade.gain[0] > GRADES.arcade.gain[2], 'アーケードは暖かい'); assert.ok(GRADES.hospital.gain[2] > GRADES.hospital.gain[0], '病院は冷たい'); assert.equal(GRADES.hospital.wet, 0);
  for (const g of Object.values(GRADES)) { assert.ok(g.sat > 0.7 && g.sat < 1.3 && g.contrast > 0.9 && g.contrast < 1.25); for (const v of [...g.lift, ...g.gain]) assert.ok(v >= 0 && v < 1.3); assert.ok(['town', 'indoor'].includes(g.env)); }
});

await t('屋内の材質：商店街以外の全部の区画に床・壁・天井の枠がある（地図帳にある枠）', () => {
  for (const id of Object.keys(AREA_GRAPH)) {
    if (id === 'shotengai') continue;
    const I = INTERIOR[id]; assert.ok(I, id); assert.ok(I.ts > 0.5 && I.ts < 8);
    for (const k of ['wall', 'floor']) for (const tl of Object.values(I[k])) assert.ok(TILES.includes(tl), `${id} ${k} ${tl}`);
  }
  assert.equal(ENV.pbr, false, 'node（初めの値）は PBR でない＝envInit が段で決める');
});

await t('Blender の部品（町・屋内 15）：目録にあり web の門を通る・glb の節は LOD<n>（種類は v<k>_）・材質は地図帳に置き換えられる名前・頂点の AO', () => {
  const ids = Object.keys(KIT_PIECES); assert.ok(ids.length >= 15);
  for (const id of ids) {
    const e = byId.get(id); assert.ok(e && e.kit, id); assert.equal(e.targets.web.result, 'pass', id);
    const m = J(`wakaba-assets/entries/${e.dir}/meta.json`); assert.equal(m.license.id, 'own'); assert.ok(m.source.generator.endsWith('build_kit_town.py'));
    const b = readFileSync(new URL(`wakaba-assets/entries/${e.dir}/web/${id}.glb`, root)); assert.ok(b.length < 1048576, id + ' の大きさ');
    const len = b.readUInt32LE(12), g = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
    const names = g.nodes.filter(nd => nd.mesh != null).map(nd => nd.name);
    assert.ok(names.length && names.every(nm => /^(v\d+_)?LOD\d$/.test(nm)), id + ' ' + names.join(','));
    for (const mt of g.materials) assert.ok(/^(mat\.(town|int)\.[a-z_]+(#[a-z_]+)?|glass\.[a-z]+|emit\.[a-z]+)$/.test(mt.name.replace(/\.\d+$/, '')), `${id} の材質 ${mt.name}`);
    for (const me of g.meshes) for (const p of me.primitives) assert.ok('COLOR_0' in p.attributes, id + ' AO');
  }
  const src = read('shinshoku/world/envkit.js');
  for (const id of ids) assert.ok(src.includes(`'${id}'`), id);
});

await t('部品の置き方：段で kit が off の時は何も記録しない（スマホは手続きの形だけ）・on の時は記録する', () => {
  envKitInit(PRESETS.low); const a = kitCollector(); assert.equal(a.on, false); assert.equal(a.put('prop.town.car', 0, 1, 0, 2), false); assert.equal(a.items.length, 0);
  envKitInit(PRESETS.high); const b = kitCollector(); assert.equal(b.on, true); assert.equal(b.put('prop.town.car', 1, 1, 0, 2, 0.5, 1, 0xff0000), true); assert.deepEqual(b.items[0].s, [1, 1, 1]);
  envKitInit(PRESETS.low);
});

await t('手続きの形は部品の代わりの網（B.fb）・当たり判定のデータ（townSolids）と部品は別・町の部品の置き場所', () => {
  const town = read('shinshoku/world/town.js'), level = read('shinshoku/world/level.js');
  for (const id of ['prop.town.utility_pole', 'prop.town.lamp_head', 'prop.town.lamp_modern', 'prop.town.vending', 'prop.town.car', 'prop.town.bicycle', 'prop.town.ac_unit', 'prop.town.guardrail']) assert.ok(town.includes(`'${id}'`), id);
  assert.ok(level.includes("'bld.town.arcade_arch'") && level.includes('fb(on, fn)') && level.includes('kitFallback'));
  assert.ok((town.match(/B\.fb\(/g) || []).length >= 8, '代わりの網');
  assert.ok(!/townSolids[^\n]*kit/.test(town), '当たり判定は部品に関係しない');
});

await t('sw.js：新しい素材（shinshoku/assets/env・wakaba-assets）を振り分ける・版を上げた', () => {
  const sw = read('sw.js');
  assert.ok(/shinshoku\/assets\/env/.test(sw), 'env の地図帳');
  const v = /VERSION\s*=\s*'([^']+)'/.exec(sw)[1]; assert.ok(v >= '2026-10-28.1', 'VERSION ' + v);
});

console.log(`shinshoku-p12: ${n} ok`);
