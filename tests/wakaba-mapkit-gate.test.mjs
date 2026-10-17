// わかば mapkit フェーズ 1：ライセンス門（docs/wakaba-mapkit/07 §3.1）と、作品が使う素材が全部 pass であること（CI）
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { makeContext, evaluate, summarize } from '../mapkit/assets/gate.js';
import { gateOne, gateUses } from '../mapkit/assets/license-gate.mjs';
import { ROOT, registry, readJson, loadConfig } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const config = loadConfig();
const web = makeContext(config, 'shinshoku');
const fx = f => readJson(`tests/fixtures/wakaba/assets/${f}.meta.json`);
const codes = r => r.reasons.map(x => x.code);

await t('門の条件：境界侵食は商用（Q-L1 未回答＝厳しい側）・配信先は公開の Web（three.js）', () => {
  assert.equal(web.commercial, true); assert.deepEqual(web.target, { id: 'web', engine: 'threejs', public: true }); assert.equal(web.stage, 'production');
  assert.equal(makeContext({ projects: { p: { commercial: 'unknown' } } }, 'p').commercial, true, '未定は商用として扱う');
  assert.equal(makeContext({ projects: { p: {} } }, 'p').commercial, true, '書いていなければ商用');
  assert.equal(makeContext({ projects: { p: { commercial: false } } }, 'p').commercial, false);
});

await t('正しい例は通る（CC0・自作・確認済み）／表記が要る物は通ってクレジット表に入る', () => {
  const ok = gateOne(fx('ok_cc0_rock'), web, reg); assert.equal(ok.result, 'pass', JSON.stringify(ok.reasons));
  const by = gateOne(fx('ok_attribution'), web, reg); assert.equal(by.result, 'pass'); assert.equal(by.credits.text, 'Rock by Test Author (CC BY 4.0)');
  const rep = summarize([ok, by], web, 'x'); assert.deepEqual(rep.summary, { total: 2, pass: 2, block: 0 }); assert.equal(rep.credits.length, 1);
});

await t('license 不明は止まる（unknown・commercial unknown・quarantine）', () => {
  const r = gateOne(fx('blocked_license_unknown'), web, reg);
  assert.equal(r.result, 'block'); for (const c of ['LICENSE_UNKNOWN', 'COMMERCIAL_UNKNOWN', 'STATUS']) assert.ok(codes(r).includes(c), c);
});

await t('商用不可は、作品が商用の時に止まる（非商用の作品なら通る）', () => {
  const m = fx('blocked_noncommercial');
  const r = gateOne(m, web, reg); assert.equal(r.result, 'block'); assert.deepEqual(codes(r), ['NON_COMMERCIAL']);
  const nc = makeContext({ projects: { hobby: { commercial: false, targets: [{ id: 'web', engine: 'threejs', public: true }] } } }, 'hobby');
  assert.equal(gateOne(m, nc, reg).result, 'pass');
});

await t('その他の規則：確認者なし・Web で再配布不可・エンジン・AI のモデル名なし・地域の制限・スキーマ違反', () => {
  const ok = fx('ok_cc0_rock');
  const cases = [
    ['UNVERIFIED', o => { o.license.verifiedBy = ''; }],
    ['NO_WEB_REDIST', o => { o.license.redistributeRaw = 'no'; }],
    ['NO_WEB_REDIST', o => { o.license.redistributeRaw = 'unknown'; }],
    ['KNOWN_NO_WEB', o => { o.source = { type: 'fab', url: 'https://www.fab.com/listings/x' }; o.license.id = 'Fab-Standard'; }],
    ['ENGINE', o => { o.license.engines = ['unreal']; }],
    ['ENGINE', o => { delete o.license.engines; }],
    ['AI_MODEL_MISSING', o => { o.source = { type: 'ai_generated' }; }],
    ['REGION_LIMIT', o => { o.license.regionLimit = 'EU・英国・韓国を除く'; }],
    ['SCHEMA', o => { delete o.version; }],
  ];
  for (const [code, mut] of cases) { const m = clone(ok); mut(m); const r = gateOne(m, web, reg); assert.equal(r.result, 'block', code); assert.ok(codes(r).includes(code), `${code}：${codes(r)}`); }
  // 配信先が PC（UE・非公開）なら、Web の再配布の規則は当てない
  const pc = makeContext(config, 'shinshoku', { target: { id: 'pc', engine: 'unreal', public: false } });
  const m = clone(ok); m.license.redistributeRaw = 'no'; assert.equal(evaluate(m, pc).result, 'pass');
});

await t('CI：作品（境界侵食）が使うと書いた素材・モーション・キャラクター設定は全部 pass（今は 0 件）', () => {
  const res = gateUses(config, 'shinshoku', web, reg);
  const blocked = res.filter(r => r.result !== 'pass');
  assert.deepEqual(blocked.map(r => `${r.id}: ${codes(r)}`), []);
  // 使う物を書いて目録に無ければ止まる
  const c2 = clone(config); c2.projects.shinshoku.uses.assets = ['rock.nothing.here'];
  assert.deepEqual(codes(gateUses(c2, 'shinshoku', web, reg)[0]), ['MISSING']);
});

await t('CLI：block があれば終了コード 1（--report-only なら 0）・素材でない JSON は対象外', () => {
  const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'mapkit/assets/license-gate.mjs'), ...a], { encoding: 'utf8', cwd: ROOT });
  const a = run('tests/fixtures/wakaba/assets/ok_cc0_rock.meta.json'); assert.equal(a.status, 0, a.stdout + a.stderr);
  const b = run('tests/fixtures/wakaba/assets'); assert.equal(b.status, 1); assert.match(b.stdout, /NON_COMMERCIAL/); assert.match(b.stdout, /LICENSE_UNKNOWN/);
  assert.equal(run('tests/fixtures/wakaba/assets', '--report-only').status, 0);
  const c = run('tests/fixtures/wakaba/map-report.example.json'); assert.equal(c.status, 0); assert.match(c.stdout, /対象外/);
  const d = run('--uses'); assert.equal(d.status, 0, d.stdout);
});

console.log(`wakaba-mapkit-gate: ${n} ok`);
