// わかば 方式 C（ブラウザ版＋UE5 版・素材置き場は 1 つ）：配信先ごとの門・共有素材ライブラリの目録・配置のスキーマ・UE の高さマップの計算・
// Blender／UE の Python スクリプトの座標の式（素の python3 の --selftest）が mapkit/core/ue.js と一致すること。docs/wakaba-mapkit/10。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { makeContext, evaluate, evaluateTargets } from '../mapkit/assets/gate.js';
import { checkPackage, makeCatalog, ue5AssetMap, sniff } from '../mapkit/assets/library.js';
import { validate } from '../mapkit/core/schema.js';
import { IDS, detectKind } from '../mapkit/core/schemas.js';
import { validateLayoutFile } from '../mapkit/core/layoutfile.js';
import * as UE from '../mapkit/core/ue.js';
import { heightfieldFromPNG } from '../mapkit/terrain/heightmap.js';
import { decodePNG, encodePNG16 } from '../mapkit/terrain/png.js';
import { makeUEHeightmap, pointsCSV } from '../tools/mapkit/export_ue_heightmap.mjs';
import { ROOT, registry, readJson, loadConfig } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const config = loadConfig();
const okMeta = readJson('tests/fixtures/wakaba/assets/ok_cc0_rock.meta.json');
const codes = r => r.reasons.map(x => x.code);
const L = readJson('maps/haison/build/layout.json');
const node = (...a) => spawnSync(process.execPath, a, { encoding: 'utf8', cwd: ROOT });
const py = spawnSync('python3', ['-c', 'print(1)'], { encoding: 'utf8' }).status === 0;

// ───────── 設定と門
await t('設定：配信先は web（公開・three.js・glb/KTX2）と ue5（非公開・unreal・FBX/USD/Nanite）・商用は利用者の回答で確定', () => {
  const p = config.projects.shinshoku;
  assert.deepEqual(p.targets.map(x => x.id), ['web', 'ue5']);
  const [w, u] = p.targets;
  assert.equal(w.public, true); assert.equal(w.engine, 'threejs'); assert.ok(w.settings.formats.includes('glb')); assert.equal(w.settings.textures.preferred, 'ktx2'); assert.ok(w.settings.textures.maxSize <= 2048);
  assert.equal(u.public, false); assert.equal(u.engine, 'unreal'); assert.ok(u.settings.formats.includes('fbx') && u.settings.formats.includes('usd')); assert.equal(u.settings.nanite, true);
  assert.equal(p.commercial, true); assert.match(p.commercialSource, /^user-2026-10-17$/);
  assert.equal(config.assetLibrary.root, 'wakaba-assets', '置き場所＝このリポジトリ（Q-B2）');
});

await t('門は配信先ごと：Fab・Megascans・Mixamo は web で止まり、ue5 では license が通れば通る（KNOWN_NO_WEB）', () => {
  const ue = makeContext(config, 'shinshoku', { target: 'ue5' });
  assert.deepEqual(ue.target, { id: 'ue5', engine: 'unreal', public: false }); assert.equal(ue.settings.nanite, true);
  for (const [name, mut] of [
    ['Fab', m => { m.source = { type: 'fab', url: 'https://www.fab.com/listings/x' }; m.license.id = 'Fab-Standard'; }],
    ['Megascans', m => { m.source = { type: 'purchased_other', url: 'https://quixel.com/megascans/x' }; m.license.id = 'custom:megascans'; }],
    ['Mixamo', m => { m.source = { type: 'purchased_other', url: 'https://www.mixamo.com/' }; m.license.id = 'custom:mixamo'; }],
  ]) {
    const m = clone(okMeta); mut(m); m.license.redistributeRaw = 'no'; m.license.engines = ['unreal'];
    const r = evaluateTargets(m, config, 'shinshoku');
    assert.equal(r.web.result, 'block', name); assert.ok(codes(r.web).includes('KNOWN_NO_WEB'), name + '：' + codes(r.web));
    assert.equal(r.ue5.result, 'pass', name + ' は UE5 版なら通る：' + codes(r.ue5));
  }
  // 商用不可は両方で止まる（商用＝利用者の回答）・ue5 でも engines に unreal が無ければ止まる
  const nc = clone(okMeta); nc.license.commercial = 'no';
  const r2 = evaluateTargets(nc, config, 'shinshoku'); assert.equal(r2.web.result, 'block'); assert.equal(r2.ue5.result, 'block');
  const tj = clone(okMeta); tj.license.engines = ['threejs'];
  const r3 = evaluateTargets(tj, config, 'shinshoku'); assert.equal(r3.web.result, 'pass'); assert.deepEqual(codes(r3.ue5), ['ENGINE']);
  // 研究用のモーション AI・Gaea Community（非商用）も止まる
  const g = clone(okMeta); g.category = 'terrain'; g.source = { type: 'self_made', author: 'user' }; g.license.id = 'custom:gaea-community-export'; g.license.commercial = 'no';
  assert.ok(Object.values(evaluateTargets(g, config, 'shinshoku')).every(r => r.result === 'block'), 'Gaea Community の書き出しは商用の作品で使えない');
});

await t('CLI：--target all で配信先を順に門に通す（どれかで block なら 1）', () => {
  const ok = node('mapkit/assets/license-gate.mjs', 'tests/fixtures/wakaba/assets/ok_cc0_rock.meta.json', '--target', 'all');
  assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /配信先 web/); assert.match(ok.stdout, /配信先 ue5（unreal）/);
  assert.equal(node('mapkit/assets/license-gate.mjs', 'tests/fixtures/wakaba/assets', '--target', 'all').status, 1);
  assert.equal(node('mapkit/assets/license-gate.mjs', '--uses', '--target', 'all').status, 0);
});

// ───────── 共有素材ライブラリ
const sha = b => createHash('sha256').update(b).digest('hex');
const glb = () => { const b = new Uint8Array(20); b.set([0x67, 0x6c, 0x54, 0x46], 0); b[4] = 2; b[8] = 20; return b; };
const pngOf = async (w, h) => encodePNG16(w, h, new Uint16Array(w * h));
const sources = (id, files) => ({ sources: 'wakaba-asset-sources/1', id, files });
const ue5imp = (id, extra = {}) => Object.assign({ ue5import: 'wakaba-ue5-import/1', id, assetType: 'StaticMesh', gamePath: '/Game/Wakaba/Rock/SM_' + id.replace(/\./g, '_'), pivot: 'bottom_center', source: { file: `source/${id}.fbx`, format: 'fbx' }, import: { nanite: true, collision: 'simple_box' } }, extra);

await t('スキーマ：sources.json・ue5/import.json・layout.json の形（種類の当て＝detectKind）', () => {
  const s = sources(okMeta.id, [{ role: 'fbx', path: `source/${okMeta.id}.fbx`, storage: 'local-ignored', sha256: 'a'.repeat(64), bytes: 10 }]);
  assert.equal(validate(IDS.assetSources, s, { registry: reg }).valid, true); assert.equal(detectKind(s), 'assetSources');
  for (const mut of [o => { o.files[0].sha256 = 'xyz'; }, o => { o.files[0].storage = 'dropbox?'; }, o => { delete o.files[0].path; }, o => { o.sources = 'v2'; }]) { const b = clone(s); mut(b); assert.equal(validate(IDS.assetSources, b, { registry: reg }).valid, false); }
  const u = ue5imp(okMeta.id); assert.equal(validate(IDS.ue5Import, u, { registry: reg }).valid, true); assert.equal(detectKind(u), 'ue5Import');
  for (const mut of [o => { o.gamePath = 'C:/x'; }, o => { o.assetType = 'Blueprint'; }, o => { o.import.collision = 'magic'; }]) { const b = clone(u); mut(b); assert.equal(validate(IDS.ue5Import, b, { registry: reg }).valid, false); }
  assert.equal(detectKind(L), 'mapLayout');
});

await t('1 素材＝1 フォルダの検査：正しい物は目録に載る・配信先ごとの結果・ue5 の /Game の表', async () => {
  const pkg = { dir: 'rock/' + okMeta.id, meta: okMeta, sources: sources(okMeta.id, [{ role: 'fbx', path: `source/${okMeta.id}.fbx`, storage: 'local-ignored', sha256: sha('fbx'), bytes: 3 }]), ue5: ue5imp(okMeta.id), web: [{ name: okMeta.id + '.glb', bytes: glb() }, { name: 'rock_base.png', bytes: await pngOf(64, 32) }], sourceFiles: { [`source/${okMeta.id}.fbx`]: sha('fbx') } };
  const r = checkPackage(pkg, { config, registry: reg });
  assert.deepEqual(r.errors, []); assert.equal(r.entry.targets.web.result, 'pass'); assert.equal(r.entry.targets.ue5.result, 'pass');
  assert.deepEqual(r.entry.web.map(w => w.file), [`web/${okMeta.id}.glb`, 'web/rock_base.png']); assert.equal(r.entry.web[1].width, 64);
  const cat = makeCatalog([r.entry], { config });
  assert.deepEqual(cat.targets, ['web', 'ue5']);
  assert.deepEqual(ue5AssetMap(cat), { [okMeta.id]: { path: '/Game/Wakaba/Rock/SM_rock_test_boulder_small', pivot: 'bottom_center' } });
  // 誤り：フォルダと id・分類のずれ・壊れた glb・大きすぎるテクスチャ・形式・sha256 のずれ
  const bad = async (mut, code) => { const p = clone({ ...pkg, web: [] }); p.web = pkg.web.slice(); p.sourceFiles = { ...pkg.sourceFiles }; await mut(p); const x = checkPackage(p, { config, registry: reg }); assert.ok(x.errors.some(e => e.code === code), `${code}：${x.errors.map(e => e.code)}`); };
  await bad(p => { p.dir = 'rock/rock.other'; }, 'FOLDER_ID');
  await bad(p => { p.dir = 'prop/' + okMeta.id; }, 'FOLDER_CATEGORY');
  await bad(p => { p.web = [{ name: 'x.glb', bytes: new Uint8Array(20) }]; }, 'WEB_BAD_FILE');
  await bad(async p => { p.web = [{ name: 'big.png', bytes: await pngOf(4096, 4) }]; }, 'WEB_TEX_SIZE');
  await bad(p => { p.web = [{ name: 'x.fbx', bytes: new Uint8Array(4) }]; }, 'WEB_FORMAT');
  await bad(p => { p.sourceFiles[`source/${okMeta.id}.fbx`] = sha('changed'); }, 'SOURCE_HASH');
  await bad(p => { p.ue5 = ue5imp('rock.other'); }, 'UE5_ID');
  await bad(p => { p.meta = null; }, 'NO_META');
  assert.equal(sniff('a.ktx2', Uint8Array.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 0, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0])).width, 2048);
});

await t('Fab の素材：UE5 版の目録には載るが、web/ に書き出しを置くと止まる（公開のリポジトリ・Pages に出さない）', () => {
  const m = clone(okMeta); m.id = 'rock.test.fab_cliff'; m.source = { type: 'fab', url: 'https://www.fab.com/listings/x' }; m.license.id = 'Fab-Standard'; m.license.redistributeRaw = 'no'; m.license.engines = ['unreal'];
  const pkg = { dir: 'rock/' + m.id, meta: m, ue5: ue5imp(m.id), sources: sources(m.id, [{ role: 'fbx', path: `source/${m.id}.fbx`, storage: 'store-account', sha256: 'b'.repeat(64) }]), web: [] };
  const ok = checkPackage(pkg, { config, registry: reg });
  assert.deepEqual(ok.errors, []); assert.equal(ok.entry.targets.web.result, 'block'); assert.equal(ok.entry.targets.ue5.result, 'pass');
  assert.ok(ue5AssetMap(makeCatalog([ok.entry])).hasOwnProperty(m.id));
  const ng = checkPackage({ ...pkg, web: [{ name: m.id + '.glb', bytes: glb() }] }, { config, registry: reg });
  assert.deepEqual(ng.errors.map(e => e.code), ['WEB_BLOCKED']); assert.equal(ng.entry.targets.web.result, 'block');
});

await t('catalog.mjs：フォルダを読んで目録を書く・同じ中身なら同じバイト列・--check（古い・誤りで 1）・本物の目録（フェーズ 3 の自作の材質・部品）が最新', () => {
  const d = mkdtempSync(join(tmpdir(), 'wk-lib-'));
  try {
    const put = (rel, data) => { const p = join(d, 'entries', rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, typeof data === 'string' || data instanceof Uint8Array ? data : JSON.stringify(data)); };
    put(`rock/${okMeta.id}/meta.json`, okMeta); put(`rock/${okMeta.id}/web/${okMeta.id}.glb`, glb()); put(`rock/${okMeta.id}/ue5/import.json`, ue5imp(okMeta.id));
    put(`rock/${okMeta.id}/sources.json`, sources(okMeta.id, [{ role: 'fbx', path: `source/${okMeta.id}.fbx`, storage: 'local-ignored', sha256: sha('FBX'), bytes: 3 }]));
    put(`rock/${okMeta.id}/source/${okMeta.id}.fbx`, 'FBX');
    const args = ['tools/mapkit/catalog.mjs', '--root', join(d, 'entries'), '--out', join(d, 'catalog.json')];
    const a = node(...args, '--verify-sources', '--ue5-map', join(d, 'map.json')); assert.equal(a.status, 0, a.stdout + a.stderr);
    const c1 = readFileSync(join(d, 'catalog.json'), 'utf8'), cat = JSON.parse(c1);
    assert.equal(cat.entries.length, 1); assert.equal(cat.entries[0].targets.ue5.result, 'pass');
    assert.equal(JSON.parse(readFileSync(join(d, 'map.json'), 'utf8')).assets[okMeta.id].path, '/Game/Wakaba/Rock/SM_rock_test_boulder_small');
    assert.equal(node(...args, '--check').status, 0, '最新');
    assert.equal(node(...args).status, 0); assert.equal(readFileSync(join(d, 'catalog.json'), 'utf8'), c1, '同じ中身なら同じバイト列');
    put(`rock/${okMeta.id}/source/${okMeta.id}.fbx`, 'FBX2');
    const b = node(...args, '--verify-sources'); assert.equal(b.status, 1); assert.match(b.stdout, /SOURCE_HASH/);
    cpSync(join(d, 'entries/rock', okMeta.id), join(d, 'entries/rock/rock.test.copy'), { recursive: true });
    const c = node(...args); assert.equal(c.status, 1); assert.match(c.stdout, /FOLDER_ID/);
  } finally { rmSync(d, { recursive: true, force: true }); }
  const real = node('tools/mapkit/catalog.mjs', '--check'); assert.equal(real.status, 0, real.stdout);
});

// ───────── 配置（layout.json）
await t('配置のスキーマと中身：山の廃村の layout.json が通る（指紋も合う）・壊した例が落ちる', () => {
  const ex = p => existsSync(join(ROOT, 'maps/haison/build', p));
  const r = validateLayoutFile(L, reg, { terrainExists: ex });
  assert.equal(r.valid, true, JSON.stringify(r.errors.slice(0, 3))); assert.deepEqual(r.warnings, []);
  assert.equal(r.counts.objects, L.objects.length); assert.ok(L.objects.length > 900, '木・岩・小物・飾り'); assert.equal(r.counts.instances, L.stats.instances.grass);
  assert.ok(L.objects.some(o => o.layer === 'dressing' && o.col === null), 'フェーズ 3 の飾り（当たりなし＝null）も形に合う');
  const cases = {
    '指紋': o => { o.objects[0].at[0] += 1; },
    'id の重複': o => { o.objects[1].id = o.objects[0].id; },
    '地図の外': o => { o.objects[0].at[0] = 999; o.hash = undefined; },
    '格子と大きさ': o => { o.terrain.nx = 300; },
    '下草の数': o => { o.instances[0].count += 1; },
    '目的地の建物': o => { o.goals[0].building = 'h9'; },
    '形（版）': o => { o.layout = 'wakaba-map-layout/2'; },
    '形（部品の形）': o => { o.buildings[0].parts[0].shape = 'sphere'; },
    '形（kind）': o => { o.objects[0].kind = 'Tree'; },
  };
  for (const [k, mut] of Object.entries(cases)) { const o = clone(L); mut(o); if (o.hash === undefined) delete o.hash; assert.equal(validateLayoutFile(o, reg, { terrainExists: ex }).valid, false, k); }
  assert.equal(validateLayoutFile(L, reg, { terrainExists: () => false }).valid, false, '高さの PNG が無い');
  const cli = node('tools/mapkit/validate_spec.mjs', 'maps/haison/build/layout.json'); assert.equal(cli.status, 0, cli.stdout); assert.match(cli.stdout, /配置/);
});

// ───────── UE の座標・Landscape の計算
await t('UE の座標：(x, z, y)×100・Yaw＝−rotY・Roll＝tilt・大きさ (幅, 奥行, 高さ)・Blender は (x, −z, y)', () => {
  assert.deepEqual(UE.toUE([1.5, 2.25, -3.125]), [150, -312.5, 225]);
  assert.deepEqual(UE.toUERot(15, 26), { roll: 26, pitch: 0, yaw: -15 }); assert.deepEqual(UE.toUERot(0), { roll: 0, pitch: 0, yaw: 0 });
  assert.deepEqual(UE.toUESize([0.6, 2.8, 0.15]), [0.6, 0.15, 2.8]);
  assert.deepEqual(UE.toBlender([1.5, 2.25, -3.125]), [1.5, 3.125, 2.25]); assert.deepEqual(UE.toBlenderRot(15, 26), [26, 0, 15]);
  // 鏡写しにならない：2 軸の入れ替え（y↔z）は行列式 −1＝右手系 → 左手系（UE）。形はそのまま
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const col = v => UE.toUE(v).map(x => x / 100);
  assert.equal(det([col([1, 0, 0]), col([0, 1, 0]), col([0, 0, 1])]), -1);
  // 回転の向き：Three.js の rotation.y ＝ r でローカル +z → 世界 (sin r, 0, cos r)。UE の Yaw ψ でローカル +Y → (−sin ψ, cos ψ)。ψ ＝ −r で一致
  for (const r of [0, 15, 90, -40, 180]) { const psi = UE.toUERot(r).yaw * Math.PI / 180, rr = r * Math.PI / 180; assert.ok(Math.abs(-Math.sin(psi) - Math.sin(rr)) < 1e-9 && Math.abs(Math.cos(psi) - Math.cos(rr)) < 1e-9, r); }
  const o = L.objects[0];
  assert.deepEqual(UE.objectToUE(o).location, UE.toUE([o.at[0], o.at[1] + o.size[1] / 2 - o.embed / 2, o.at[2]]));
  assert.deepEqual(UE.objectToUE(o, { pivot: 'bottom_center' }).scale, [1, 1, 1]);
});

await t('Landscape：推奨の大きさの区画の割り方（Epic の表）・Scale・Location の式（16bit の 0 と 65535 が最低・最高に戻る）', () => {
  const lay = n => UE.landscapeLayout(n);
  assert.deepEqual(lay(1009), { quadsPerSection: 63, sectionsPerComponent: 2, components: 8, total: 64 });
  assert.deepEqual(lay(2017), { quadsPerSection: 63, sectionsPerComponent: 2, components: 16, total: 256 });
  assert.deepEqual(lay(505), { quadsPerSection: 63, sectionsPerComponent: 2, components: 4, total: 16 });
  assert.deepEqual(lay(253), { quadsPerSection: 63, sectionsPerComponent: 2, components: 2, total: 4 });
  assert.deepEqual(lay(127), { quadsPerSection: 63, sectionsPerComponent: 2, components: 1, total: 1 });
  assert.deepEqual(lay(4033), { quadsPerSection: 63, sectionsPerComponent: 2, components: 32, total: 1024 });
  assert.deepEqual(lay(8129), { quadsPerSection: 127, sectionsPerComponent: 2, components: 32, total: 1024 });
  for (const n of UE.UE_RECOMMENDED) { const l = lay(n); assert.equal(l.components * l.sectionsPerComponent * l.quadsPerSection + 1, n); }
  assert.equal(lay(257), null, '257 は割り切れない（取り直しが要る）');
  assert.equal(UE.pickLandscapeSize(257), 505); assert.equal(UE.pickLandscapeSize(1009), 1009); assert.equal(UE.pickLandscapeSize(99999), 8129);
  const s = UE.landscapeSettings({ n: 1009, sizeM: 1008, minM: -20, maxM: 236 });
  assert.equal(s.scale.x, 100, '1m＝100cm／四角形'); assert.ok(Math.abs(s.scale.z - 50.000763) < 1e-5, 'ScaleZ 100＝512m の範囲 → 256m は約 50');
  assert.ok(Math.abs(UE.ueHeightCm(0, s) - -2000) < 0.01); assert.ok(Math.abs(UE.ueHeightCm(65535, s) - 23600) < 0.01, '0.1mm 以内');
  assert.throws(() => UE.landscapeSettings({ n: 505, sizeM: 256, minM: 5, maxM: 5 }));
});

await t('export_ue_heightmap：山の廃村 → 505×505 の 16bit PNG（高さが元の地形と 1cm 以内）・CLI が landscape.json を書く', async () => {
  const T = L.terrain, hf = await heightfieldFromPNG(readFileSync(join(ROOT, 'maps/haison/build', T.file)), { size: L.size, minY: T.minY, maxY: T.maxY });
  const r = await makeUEHeightmap(hf, { sizeM: L.size[0] });
  assert.equal(r.n, 505); const img = await decodePNG(r.png); assert.equal(img.width, 505); assert.equal(img.bitDepth, 16);
  let worst = 0;
  for (const [i, j] of [[0, 0], [504, 504], [252, 100], [37, 411], [400, 3]]) {
    const ueZ = UE.ueHeightCm(img.data[j * 505 + i], r.settings) / 100, x = i * r.settings.cellM, z = j * r.settings.cellM;
    worst = Math.max(worst, Math.abs(ueZ - hf.at(x, z)));
  }
  assert.ok(worst < 0.01, `差 ${worst}m`);
  await assert.rejects(() => makeUEHeightmap(hf, { size: 300 }), /推奨/);
  const csv = pointsCSV(L, hf).split('\n'); assert.equal(csv[0], 'Name,Kind,Layer,X,Y,Z,Yaw,Scale'); assert.equal(csv.length - 2, L.objects.length + L.stats.instances.grass);
  const d = mkdtempSync(join(tmpdir(), 'wk-ue-'));
  try {
    const c = node('tools/mapkit/export_ue_heightmap.mjs', 'maps/haison', '--out', d); assert.equal(c.status, 0, c.stdout + c.stderr);
    const j = JSON.parse(readFileSync(join(d, 'landscape.json'), 'utf8'));
    assert.equal(j.landscape.overallResolution, '505x505'); assert.equal(j.landscape.components, '4x4'); assert.equal(j.layoutHash, L.hash);
    assert.equal(j.heightmap.sha256, sha(readFileSync(join(d, j.heightmap.file))));
  } finally { rmSync(d, { recursive: true, force: true }); }
  // リポジトリに置いた書き出しが、今の layout と合っている（作り直し忘れ）
  const kept = join(ROOT, 'maps/haison/build/ue/landscape.json');
  if (existsSync(kept)) { const k = JSON.parse(readFileSync(kept, 'utf8')); assert.equal(k.layoutHash, L.hash, 'maps/haison/build/ue/ を export_ue_heightmap.mjs で作り直す'); assert.equal(k.heightmap.sha256, sha(readFileSync(join(ROOT, 'maps/haison/build/ue', k.heightmap.file)))); }
});

// ───────── Python（Blender・UE）の座標の式が JS と同じ
await t('Blender・UE の Python の座標の式・PNG の読みが mapkit/core/ue.js・heightmap.js と一致（素の python3 の --selftest）', async () => {
  if (!py) { console.log('    （python3 が無いので飛ばす）'); return; }
  const run = f => { const r = spawnSync('python3', ['-I', join(ROOT, f), '--selftest'], { encoding: 'utf8', cwd: ROOT }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  const B = run('tools/blender/import_layout.py'), U = run('tools/ue5/import_layout.py'), K = run('tools/blender/export_kit.py');
  const tests = [[0, 0, 0], [1.5, 2.25, -3.125], L.start];
  assert.deepEqual(B.to_blender, tests.map(UE.toBlender)); assert.deepEqual(U.to_ue, tests.map(UE.toUE));
  assert.deepEqual(B.to_blender_rot, [UE.toBlenderRot(15, 0), UE.toBlenderRot(-40, 30)]);
  assert.deepEqual(U.to_ue_rot, [UE.toUERot(15, 0), UE.toUERot(-40, 30)]);
  assert.deepEqual(U.to_ue_size, UE.toUESize([0.6, 2.8, 0.15])); assert.deepEqual(B.to_blender_size, UE.toBlenderSize([0.6, 2.8, 0.15]));
  const part = L.buildings[0].parts[0], tilted = L.buildings.flatMap(b => b.parts).find(p => p.tilt);
  assert.deepEqual(U.part, UE.partToUE(part)); assert.deepEqual(U.tilted, UE.partToUE(tilted)); assert.ok(tilted.tilt, '傾いた部品（屋根）でも');
  assert.deepEqual(U.object_basic, UE.objectToUE(L.objects[0])); assert.deepEqual(U.object_real, UE.objectToUE(L.objects[0], { pivot: 'bottom_center' }));
  assert.deepEqual(B.part.loc, UE.toBlender(part.c));
  assert.equal(U.plan.count, L.buildings.reduce((s, b) => s + b.parts.filter(p => p.visible !== false).length, 0) + L.objects.length);
  // PNG の読み（Python の自前の読み）＝ node の heightmap.js
  const T = L.terrain, hf = await heightfieldFromPNG(readFileSync(join(ROOT, 'maps/haison/build', T.file)), { size: L.size, minY: T.minY, maxY: T.maxY });
  for (const [i, j, h] of B.heights) assert.ok(Math.abs(hf.get(i, j) - h) < 1e-3, `${i},${j}`);
  assert.equal(B.grass, L.stats.instances.grass);
  assert.equal(K.name, 'SM_rock_test_boulder_small'); assert.equal(K.path, '/Game/Wakaba/BuildingModule/SM_bld_jp_house_wall_plaster_1x1');
  assert.equal(K.web_ok, true); assert.equal(K.web_fab, false);
  assert.equal(validate(IDS.ue5Import, K.template, { registry: reg }).valid, true, 'export_kit の雛形は ue5-import のスキーマに合う');
});

console.log(`wakaba-mapkit-bridge: ${n} ok`);
