// わかば mapkit フェーズ 1：小さなスキーマの検査・素材メタデータ v1.1・地図仕様（山の廃村）・検証レポートの形
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validate, createRegistry, formatErrors } from '../mapkit/core/schema.js';
import { IDS, SCHEMA_FILES, detectKind } from '../mapkit/core/schemas.js';
import { validateSpec, resolveGoal } from '../mapkit/core/spec.js';
import { makeReport, validateReport, reportToMarkdown } from '../mapkit/report/report.js';
import { ROOT, registry, readJson, loadConfig } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const spec = readJson('maps/haison/map.spec.json');
const specOpt = { fileExists: f => existsSync(join(ROOT, 'maps/haison', f)) };
const noFile = { fileExists: () => false };   // フェーズ 2 で heightmap.png を置いたので、無い時の扱いはこちらで見る

await t('検査の部品：type・required・enum・const・pattern・範囲・items・additionalProperties・$ref・allOf・anyOf', () => {
  const s = { $id: 'x', type: 'object', required: ['a'], properties: { a: { type: 'integer', minimum: 1 }, b: { enum: ['p', 'q'] }, c: { const: 1 }, d: { type: 'string', pattern: '^z' }, e: { type: 'array', items: { $ref: '#/$defs/n' }, minItems: 1, maxItems: 2 }, f: { type: ['string', 'null'] }, g: { anyOf: [{ type: 'string' }, { type: 'number' }] } }, additionalProperties: false, $defs: { n: { type: 'number' } } };
  assert.equal(validate(s, { a: 1, b: 'p', c: 1, d: 'zz', e: [1], f: null, g: 3 }).valid, true);
  const bad = validate(s, { b: 'r', c: 2, d: 'a', e: [], f: 1, g: true, h: 1 });
  const paths = bad.errors.map(e => e.path);
  for (const p of ['/a', '/b', '/c', '/d', '/e', '/f', '/g', '/h']) assert.ok(paths.includes(p), p + ' の誤りが出る：' + formatErrors(bad.errors).join(' | '));
  assert.equal(validate(s, { a: 0 }).valid, false, 'minimum');
  assert.equal(validate(s, { a: 1.5 }).valid, false, 'integer');
  // 別のスキーマ（$id）の $ref と allOf
  const r = createRegistry({ $id: 'base', type: 'object', required: ['id'], $defs: { lic: { type: 'object', required: ['k'] } } }, { $id: 'ext', allOf: [{ $ref: 'base' }, { properties: { lic: { $ref: 'base#/$defs/lic' } } }] });
  assert.equal(validate('ext', { id: 1, lic: { k: 1 } }, { registry: r }).valid, true);
  assert.equal(validate('ext', { lic: {} }, { registry: r }).errors.length, 2);
});

await t('スキーマのファイル：全部読める・$id が一覧と一致・ブラウザでも同じ一覧で読める', () => {
  for (const [id, p] of Object.entries(SCHEMA_FILES)) { const s = readJson(p); assert.equal(s.$id, id, p); assert.ok(s.title, p); }
  assert.equal(reg.size, Object.keys(SCHEMA_FILES).length);
});

await t('素材メタデータ v1.1：正しい例が通る・v1 の書き方も通る・必須の欄と列挙の誤りで落ちる', () => {
  const ok = readJson('tests/fixtures/wakaba/assets/ok_cc0_rock.meta.json');
  assert.equal(validate(IDS.asset, ok, { registry: reg }).valid, true);
  for (const f of ['blocked_license_unknown', 'blocked_noncommercial', 'ok_attribution']) assert.equal(validate(IDS.asset, readJson(`tests/fixtures/wakaba/assets/${f}.meta.json`), { registry: reg }).valid, true, f + ' は形としては正しい（止めるのは門）');
  const v1 = { id: 'bld.jp_house.wall_plaster_1x1', version: 1, name: { ja: '土壁' }, category: 'building_module', source: { type: 'self_made' }, license: { id: 'project', commercial: 'yes', redistributeRaw: 'yes', attribution: '', verifiedBy: 'user' }, tech: { pivot: 'grid_corner', grid: 0.5 }, status: 'draft' };
  assert.equal(validate(IDS.asset, v1, { registry: reg }).valid, true, 'v1 の例');
  for (const [k, mut] of [['id', o => { o.id = 'Bad Id'; }], ['category', o => { o.category = 'weapon'; }], ['license', o => { delete o.license.verifiedBy; }], ['commercial', o => { o.license.commercial = 'maybe'; }], ['sizeM', o => { o.tech.sizeM = [1, 2]; }], ['source', o => { o.source.type = 'stolen'; }]]) {
    const b = clone(ok); mut(b); assert.equal(validate(IDS.asset, b, { registry: reg }).valid, false, k);
  }
  // v1.1 の追加
  const a = clone(ok); a.category = 'motion_source'; a.source.type = 'self_capture'; a.license.performerConsent = 'rights/x.json'; a.license.deps = ['smpl-x', { id: 'smpl', licensed: true }]; a.id = 'msrc.x_L';
  assert.equal(validate(IDS.asset, a, { registry: reg }).valid, true, formatErrors(validate(IDS.asset, a, { registry: reg }).errors).join(' | '));
});

await t('地図仕様：「山の廃村」の例がスキーマと中身の検査を通る（高さマップが無い時は注意だけ）', () => {
  assert.equal(validateSpec(spec, reg, specOpt).warnings.some(w => /高さマップ/.test(w.msg)), false, 'heightmap.png がある（フェーズ 2）');
  const r = validateSpec(spec, reg, noFile);
  assert.equal(r.valid, true, formatErrors(r.errors).join(' | '));
  assert.ok(r.warnings.some(w => /高さマップ/.test(w.msg)), '高さマップが無い注意');
  assert.equal(spec.id, 'haison'); assert.equal(detectKind(spec), 'mapSpec');
  assert.ok(spec.buildings.filter(b => b.enterable).length >= 2, '入れる家 2 軒以上');
  assert.ok(spec.atmosphere.fog.density > 0 && spec.atmosphere.time === 'dusk', '霧と夕暮れ');
  for (const g of spec.gameplay.goals) assert.ok(!resolveGoal(spec, g).error, g);
  assert.equal(resolveGoal(spec, 'shrine.front').kind, 'building');
  assert.equal(resolveGoal(spec, 'h1.door').kind, 'anchor', 'anchors の扉が先');
  assert.ok(spec.anchors.some(a => a.type === 'door') && spec.anchors.some(a => a.type === 'stairs'), 'charkit の anchors（扉・階段など）');
});

await t('地図仕様：壊した例が落ちる（目的地・範囲・重複・入れない家の扉・坂の範囲・形）', () => {
  const cases = {
    '無い建物の目的地': s => { s.gameplay.goals.push('h9.door'); },
    '入れない家の扉': s => { s.gameplay.goals.push('h3.door'); },
    '道の点がマップの外': s => { s.paths[0].points.push([300, 10]); },
    'id の重複': s => { s.buildings[1].id = 'h1'; },
    '坂の範囲が逆': s => { s.scatter[0].slope = [35, 0]; },
    '仕様の版が違う': s => { s.spec = 'wakaba-map/2'; },
    '種が空': s => { s.seed = ''; },
    '敵の AI の書き方': s => { s.gameplay.enemies[0].ai = 'kiro'; },
    '高さマップも fallback も無い': s => { delete s.terrain.fallback; },
  };
  for (const [k, mut] of Object.entries(cases)) { const s = clone(spec); mut(s); assert.equal(validateSpec(s, reg, noFile).valid, false, k); }
});

await t('検証レポート：§7 の形の見本が通る・人が見る項目に pass を書くと落ちる・md に変換できる', () => {
  const ex = readJson('tests/fixtures/wakaba/map-report.example.json');
  const r = validateReport(ex, reg); assert.equal(r.valid, true, formatErrors(r.errors).join(' | '));
  const human = ex.conditions.find(c => c.check === 'human'); assert.equal(human.pass, null);
  const bad = clone(ex); bad.conditions.find(c => c.check === 'human').pass = true;
  assert.equal(validateReport(bad, reg).valid, false, 'AI が人の項目を合格にしない');
  const bad2 = clone(ex); bad2.auto.reach.unreachable = ['h2.door']; assert.equal(validateReport(bad2, reg).valid, false, '届かないのに pass');
  const md = reportToMarkdown(ex); assert.match(md, /# 検証レポート：haison/); assert.match(md, /人が見る \| ⏳ 未判定/);
  const empty = makeReport({ map: 'haison', seed: spec.seed, builtAt: '2026-10-16T00:00:00Z' });
  assert.equal(validateReport(empty, reg).valid, true, '空のレポート（全部 未判定）も形は正しい');
  assert.ok(Object.values(empty.auto).every(a => a.pass === null || a.pass === undefined));
});

await t('設定（wakaba.config.json）：素材ライブラリの場所の指し先・商用は厳しい側の既定（Q-L1 未回答）', () => {
  const c = loadConfig();
  assert.equal(c.assetLibrary.root, 'wakaba-assets');
  assert.ok(existsSync(join(ROOT, c.assetLibrary.catalog)));
  assert.equal(c.projects.shinshoku.commercial, true);
  assert.equal(c.projects.shinshoku.targets[0].public, true);
  assert.deepEqual(JSON.parse(readFileSync(join(ROOT, c.assetLibrary.catalog), 'utf8')).entries, []);
});

console.log(`wakaba-mapkit-schema: ${n} ok`);
