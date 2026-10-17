// わかば charkit フェーズ 1：権利の門（docs/wakaba-charkit/07 §4）。mapkit のライセンス門（mapkit/assets/gate.js）に足した規則で、門は 1 つだけ。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeContext, evaluate, evaluateCharacter, RULES } from '../mapkit/assets/gate.js';
import { gateOne } from '../mapkit/assets/license-gate.mjs';
import { ROOT, registry, readJson, loadConfig } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const config = loadConfig();
const web = makeContext(config, 'shinshoku');
const pc = makeContext(config, 'shinshoku', { target: { id: 'pc', engine: 'unreal', public: false } });
const dev = makeContext(config, 'shinshoku', { stage: 'dev' });
const anim = f => readJson(`tests/fixtures/wakaba/anim/${f}.meta.json`);
const codes = r => r.reasons.map(x => x.code);

await t('門は 1 つ：charkit の権利の規則も mapkit/assets/gate.js の中（別の門の実装が無い）', () => {
  for (const c of ['NO_CONSENT', 'FOREIGN_VIDEO', 'SMPL_DEP', 'COMPARISON_ONLY', 'KNOWN_NO_WEB', 'NO_HUMAN_SCORE']) assert.ok(RULES[c], c);
  const src = readFileSync(join(ROOT, 'tools/charkit/validate_anim.mjs'), 'utf8') + readFileSync(join(ROOT, 'tools/charkit/validate_char.mjs'), 'utf8');
  assert.match(src, /mapkit\/assets\/gate\.js/);
});

await t('正しいモーション（手付け・確認済み・人の点数あり）は通る', () => {
  const r = gateOne(anim('ok_idle_stand'), web, reg); assert.equal(r.result, 'pass', JSON.stringify(r.reasons));
});

await t('同意の記録なしの撮影（self_capture・performerConsent が空）は止まる', () => {
  const r = gateOne(anim('blocked_no_consent'), web, reg); assert.equal(r.result, 'block'); assert.deepEqual(codes(r), ['NO_CONSENT']);
  // 撮影の元（motion_source）は配らないので Web・エンジンの規則は当てない（同意があれば通る）
  const m = anim('blocked_no_consent'); m.license.performerConsent = 'rights/x.json'; assert.equal(gateOne(m, web, reg).result, 'pass');
  // モーション（animation）も自分で撮影なら同意が要る
  const a = anim('ok_idle_stand'); a.source = { type: 'self_capture', author: 'user' }; assert.ok(codes(gateOne(a, web, reg)).includes('NO_CONSENT'));
});

await t('他人の映像（source.type: unknown・他人のサイトの URL）は止まる。自分の場所（ownDomains）なら止めない', () => {
  const r = gateOne(anim('blocked_foreign_video'), web, reg); assert.equal(r.result, 'block'); assert.ok(codes(r).includes('FOREIGN_VIDEO'));
  const m = anim('blocked_no_consent'); m.license.performerConsent = 'rights/x.json'; m.source.url = 'https://www.youtube.com/watch?v=me';
  assert.ok(codes(gateOne(m, web, reg)).includes('FOREIGN_VIDEO'));
  const own = makeContext({ projects: { shinshoku: { ...config.projects.shinshoku, ownDomains: ['youtube.com'] } } }, 'shinshoku');
  assert.equal(gateOne(m, own, reg).result, 'pass', '自分のチャンネルと人が書いた時だけ');
  m.source.url = 'NAS:/wakaba/chars-src/_motion/x/'; assert.equal(gateOne(m, web, reg).result, 'pass', 'NAS の場所は自分の物');
});

await t('SMPL／SMPL-X を通した物は、商用の許可が無ければ止まる（作品が商用か未定）。許可あり・非商用の作品なら止めない', () => {
  const r = gateOne(anim('blocked_smpl'), web, reg); assert.equal(r.result, 'block'); assert.deepEqual(codes(r), ['SMPL_DEP']);
  const lic = anim('blocked_smpl'); lic.license.deps = [{ id: 'smpl-x', licensed: true, terms: 'Meshcapade 商用ライセンス（証明は NAS）' }];
  assert.equal(gateOne(lic, web, reg).result, 'pass');
  const nc = makeContext({ projects: { hobby: { commercial: false } } }, 'hobby');
  assert.ok(!codes(gateOne(anim('blocked_smpl'), nc, reg)).includes('SMPL_DEP'));
  const unknown = makeContext({ projects: { p: { commercial: 'unknown' } } }, 'p');
  assert.ok(codes(gateOne(anim('blocked_smpl'), unknown, reg)).includes('SMPL_DEP'), '商用か未定でも止める');
});

await t('Mixamo（素のファイルの再配布不可）を Web の書き出しに入れると止まる。PC 版（UE・非公開）では止めない', () => {
  const r = gateOne(anim('blocked_mixamo_web'), web, reg); assert.equal(r.result, 'block');
  assert.ok(codes(r).includes('NO_WEB_REDIST') && codes(r).includes('KNOWN_NO_WEB'));
  const lie = anim('blocked_mixamo_web'); lie.license.redistributeRaw = 'yes';
  assert.deepEqual(codes(gateOne(lie, web, reg)), ['KNOWN_NO_WEB'], '再配布 yes と書いても Mixamo は Web に入れない');
  assert.equal(gateOne(anim('blocked_mixamo_web'), pc, reg).result, 'pass', 'PC 版だけ可（要確認）');
});

await t('研究用（非商用）の AI を通した物・「比較のみ」は作品に入れない', () => {
  const r = gateOne(anim('blocked_research_ai'), web, reg); assert.equal(r.result, 'block'); assert.deepEqual(codes(r), ['COMPARISON_ONLY']);
  const a = anim('ok_idle_stand'); a.source = { type: 'self_capture', author: 'user', aiModel: 'GVHMR 1.0' }; a.license.performerConsent = 'rights/x.json';
  assert.ok(codes(gateOne(a, web, reg)).includes('COMPARISON_ONLY'), '名前で分かる研究用の AI');
  a.source.aiModel = 'MediaPipe Pose'; a.source.aiCommercial = 'no'; assert.ok(codes(gateOne(a, web, reg)).includes('COMPARISON_ONLY'), 'aiCommercial: no');
  a.source.aiCommercial = 'yes'; assert.equal(gateOne(a, web, reg).result, 'pass');
});

await t('人の点数（quality.human）が空のモーションは本番の束に入れない（dev の段では注意だけ）', () => {
  const a = anim('ok_idle_stand'); a.anim.quality.human = null; a.anim.quality.score = a.anim.quality.auto;
  assert.deepEqual(codes(gateOne(a, web, reg)), ['NO_HUMAN_SCORE']);
  const d = evaluate(a, dev); assert.equal(d.result, 'pass'); assert.equal(d.warnings[0].code, 'NO_HUMAN_SCORE');
  // 07 §7 の例（確認者なし・人の点数なし）は門で止まる＝人の確認が要る
  for (const f of ['anim.loco_walk_fwd', 'anim.cmb_katana_light_1']) assert.deepEqual(codes(gateOne(anim(f), web, reg)), ['UNVERIFIED', 'NO_HUMAN_SCORE'], f);
});

await t('キャラクターの設定（だんのうら）の license も同じ門：commercial unknown・確認者なしで止まる＝利用者の確認（Q-L1）待ち', () => {
  const dan = readJson('shinshoku/assets/characters/dannoura.character.json');
  const r = evaluateCharacter(dan, web); assert.equal(r.result, 'block');
  assert.ok(codes(r).includes('COMMERCIAL_UNKNOWN') && codes(r).includes('UNVERIFIED'));
  const fixed = clone(dan); Object.assign(fixed.license, { commercial: 'yes', engines: ['any'], verifiedBy: 'user', verifiedAt: '2026-10-16' });
  assert.equal(evaluateCharacter(fixed, web).result, 'pass', '人が確かめて書けば通る（試験の中だけ・ファイルは変えない）');
  assert.equal(gateOne(dan, web, reg).kind, 'character');
});

console.log(`wakaba-charkit-gate: ${n} ok`);
