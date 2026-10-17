// わかば charkit フェーズ 1：キャラクターの設定（だんのうら）・モーションのメタデータ（v1.1 の拡張）・戦闘のこまの照合
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatErrors } from '../mapkit/core/schema.js';
import { detectKind } from '../mapkit/core/schemas.js';
import { ROOT, registry, readJson } from '../mapkit/core/node.mjs';
import { validateCharacter, validateAnim, resolveStateKey, MASCULINE_METRICS } from '../charkit/core/validate.js';
import { checkCombatRef, fitSegments, resolvePath, lungeScale } from '../charkit/anim/combatfit.js';
import * as combatMod from '../shinshoku/data/combat.js';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const clone = o => JSON.parse(JSON.stringify(o));
const reg = await registry();
const CHAR = 'shinshoku/assets/characters/dannoura.character.json';
const dan = readJson(CHAR);
const exists = f => existsSync(join(ROOT, 'shinshoku/assets/characters', f));
const combat = { 'shinshoku/data/combat.js': combatMod };
const anim = f => readJson(`tests/fixtures/wakaba/anim/${f}.meta.json`);

await t('だんのうらの設定（06 §7 の例）がスキーマと中身の検査を通る（モデルはまだ無い＝注意だけ）', () => {
  const r = validateCharacter(dan, reg, { fileExists: exists });
  assert.equal(r.valid, true, formatErrors(r.errors).join(' | '));
  assert.ok(r.warnings.every(w => /まだありません/.test(w.msg)), formatErrors(r.warnings).join(' | '));
  assert.equal(detectKind(dan), 'character');
});

await t('設定の正本：だんのうらは男性・男性の体の寸法の欄がそろう・肩幅 > 腰幅・女性の体つきにしない', () => {
  assert.equal(dan.body.sex, 'male');
  for (const k of MASCULINE_METRICS) assert.ok(typeof dan.body[k] === 'number', k);
  assert.ok(dan.body.shoulderWidthM > dan.body.hipWidthM);
  assert.ok(dan.canon.mustKeep.includes('男性'));
  assert.ok(dan.canon.mustNot.some(s => /女性の体つき/.test(s)));
  assert.equal(dan.license.verifiedBy, '', 'AI は verifiedBy を書かない');
  const asFemale = clone(dan); asFemale.body.sex = 'female';
  assert.equal(validateCharacter(asFemale, reg).valid, false, '「男性」の正本と体の作りが食い違えば落ちる');
  const noMetric = clone(dan); delete noMetric.body.shoulderWidthM;
  assert.equal(validateCharacter(noMetric, reg).valid, false, '男性の寸法の欄が無ければ落ちる');
  const wideHip = clone(dan); wideHip.body.hipWidthM = 0.4;
  assert.equal(validateCharacter(wideHip, reg).valid, false, '肩幅 ≤ 腰幅は落ちる');
});

await t('陰影（wakaba-toon/1）と性格の値：必須・範囲・色の形・状態のキーが実在の値を指す', () => {
  assert.equal(dan.shader.model, 'wakaba-toon/1');
  assert.equal(resolveStateKey(dan.personality, 'walkSpeed'), 'locomotion.walkSpeed');
  assert.equal(resolveStateKey(dan.personality, 'face.blinkPerMin'), 'face.blinkPerMin');
  assert.equal(resolveStateKey(dan.personality, 'nope'), null);
  const cases = {
    '色の形': c => { c.shader.materials.skin.base = 'pink'; },
    'softness の範囲': c => { c.shader.materials.hair.softness = 0.9; },
    '陰影の型': c => { c.shader.model = 'mtoon'; },
    '性格の必須の組': c => { delete c.personality.reaction; },
    '状態のキーが無い値': c => { c.personality.states.fear.flySpeed = 2; },
    '材質の名前の規則': c => { c.shader.materials.jacket = { base: '#ffffff' }; },
    '補正の形の名前と骨': c => { c.correctives[0].bone = 'rightLowerArm'; },
    '独自の表情の名前': c => { c.expressions.custom.push('smug'); },
    'ext_ の名前': c => { c.forms.white.extraBones.push('ext_tail_1'); },
    'id の形': c => { c.id = 'Dannoura'; },
    'AI が確認者を書く': c => { c.license.verifiedBy = 'claude-code'; },
    '体の高さの範囲': c => { c.body.heightM = 16.4; },
  };
  for (const [k, mut] of Object.entries(cases)) { const c = clone(dan); mut(c); assert.equal(validateCharacter(c, reg).valid, false, k); }
});

await t('モーションの例（07 §7：歩き・刀の弱・撮影の元）がスキーマ（mapkit v1.1 を allOf で拡張）を通る', () => {
  for (const f of ['anim.loco_walk_fwd', 'anim.cmb_katana_light_1']) { const r = validateAnim(anim(f), reg, { combat }); assert.equal(r.valid, true, f + '：' + formatErrors(r.errors).join(' | ')); }
  const ok = validateAnim(anim('ok_idle_stand'), reg); assert.equal(ok.valid, true, formatErrors(ok.errors).join(' | '));
  for (const f of ['blocked_smpl', 'blocked_mixamo_web', 'blocked_research_ai']) assert.equal(validateAnim(anim(f), reg).valid, true, f + ' は形としては正しい（止めるのは門）');
});

await t('モーションの壊した例が落ちる（category・fps・こまの範囲・durationS・点数の式・名前の組・人の点数の範囲）', () => {
  const base = anim('anim.loco_walk_fwd');
  const cases = {
    'category が animation でない': a => { a.category = 'prop'; },
    'fps は 30 か 60': a => { a.anim.fps = 24; },
    'こまの印が長さの外': a => { a.anim.events.push({ t: 'footL', frame: 99 }); },
    'durationS が frames/fps と違う': a => { a.anim.durationS = 2; },
    'score の式': a => { a.anim.quality.score = 50; },
    '名前の組': a => { a.id = 'anim.walk_fwd'; },
    '人の点数は 1〜5': a => { a.anim.quality.human = 7; },
    '印の種類': a => { a.anim.events[0].t = 'footC'; },
    'anim の必須の欄': a => { delete a.anim.rootMotion; },
    '素材メタデータの必須の欄（allOf）': a => { delete a.license; },
  };
  for (const [k, mut] of Object.entries(cases)) { const a = clone(base); mut(a); assert.equal(validateAnim(a, reg).valid, false, k); }
  const human = clone(base); human.anim.quality.human = 4; human.anim.quality.score = 0.4 * 88 + 0.6 * 80; human.anim.quality.reviewedBy = 'user';
  assert.equal(validateAnim(human, reg).valid, true, '人の点数がある時の式（0.4×auto＋0.6×human×20）');
});

await t('戦闘のこまの照合：刀の弱 1 段目（07 §7.2）は shinshoku/data/combat.js の COMBAT.katana.light[0]（6・4・14）と一致', () => {
  const data = resolvePath(combatMod, 'COMBAT.katana.light[0]');
  assert.deepEqual([data.startup, data.active, data.recovery], [6, 4, 14]);
  const r = validateAnim(anim('anim.cmb_katana_light_1'), reg, { combat });
  assert.equal(r.combat.ok, true); assert.deepEqual(r.combat.fit.scales, [1, 1, 1]);
  // 30fps で作ったクリップ（12 こま・当たり 3〜5）も 60Hz に直して一致
  const a30 = clone(anim('anim.cmb_katana_light_1').anim); a30.fps = 30; a30.frames = 12; a30.events = [{ t: 'hitStart', frame: 3 }, { t: 'hitEnd', frame: 5 }];
  assert.equal(checkCombatRef(a30, data).ok, true);
  // 2 段目（8・4・16）を指すとずれる → 伸縮で合わせられる（注意）
  const m2 = clone(anim('anim.cmb_katana_light_1')); m2.anim.combatRef.path = 'COMBAT.katana.light[1]';
  const r2 = validateAnim(m2, reg, { combat }); assert.equal(r2.valid, true); assert.equal(r2.combat.ok, false); assert.equal(r2.combat.fitOk, true);
  assert.ok(r2.warnings.some(w => /伸縮/.test(w.msg)));
  // 強攻撃（18・6・26 = 50 こま）に 24 こまのクリップ：倍率 3 → 作り直し（誤り）
  const m3 = clone(anim('anim.cmb_katana_light_1')); m3.anim.combatRef.path = 'COMBAT.katana.heavy';
  const r3 = validateAnim(m3, reg, { combat }); assert.equal(r3.valid, false); assert.equal(r3.combat.fitOk, false);
  // 無い道は誤り
  const m4 = clone(anim('anim.cmb_katana_light_1')); m4.anim.combatRef.path = 'COMBAT.katana.light[9]';
  assert.equal(validateAnim(m4, reg, { combat }).valid, false);
  // 区間の対応と踏み込みの倍率
  const f = fitSegments([{ t: 'hitStart', frame: 4 }, { t: 'hitEnd', frame: 8 }], 20, 30, data);
  assert.equal(f.map.length, 4); assert.ok(Math.abs(f.map[1][1] - 0.1) < 1e-9 && Math.abs(f.map[1][0] - 4 / 30) < 1e-9);
  assert.equal(lungeScale(0.3, 0.6), 2); assert.equal(lungeScale(0, 0.6), 1);
});

await t('CLI：validate_char（だんのうら＋試験用モデル）・validate_anim（戦闘の照合）', async () => {
  const { spawnSync } = await import('node:child_process');
  const run = (tool, ...a) => spawnSync(process.execPath, [join(ROOT, tool), ...a], { encoding: 'utf8', cwd: ROOT });
  const c = run('tools/charkit/validate_char.mjs', CHAR, '--model', 'tests/fixtures/charkit_test.gltf', '--require-recommended');
  assert.equal(c.status, 0, c.stdout + c.stderr); assert.match(c.stdout, /指 30\/30/); assert.match(c.stdout, /ライセンス門：block/);
  assert.equal(run('tools/charkit/validate_char.mjs', CHAR, '--strict-gate').status, 1, '門で止まる設定は --strict-gate で 1');
  const a = run('tools/charkit/validate_anim.mjs', 'tests/fixtures/wakaba/anim/anim.cmb_katana_light_1.meta.json');
  assert.equal(a.status, 0, a.stdout + a.stderr); assert.match(a.stdout, /戦闘のこま：一致/);
});

console.log(`wakaba-charkit-schema: ${n} ok`);
