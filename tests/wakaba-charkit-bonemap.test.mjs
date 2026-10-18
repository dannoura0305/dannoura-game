// わかば charkit フェーズ 1：骨の対応（charkit/rig/bonemap.js）・骨の列（chains.json）・試験用の glTF（指・目・ext_・短いクリップ）。
// shinshoku/actor/bones.js は再輸出だけになったこと、2 引数の matchBones の挙動が移す前と同じこと、試験用 glTF が境界侵食の読み込み（vrm.js）で読めること。
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import * as BM from '../charkit/rig/bonemap.js';
import * as SB from '../shinshoku/actor/bones.js';
import { readGltfJson, boneNames, checkStructure, vrmHumanBones } from '../charkit/core/gltf.js';
import { checkModelBones } from '../charkit/core/validate.js';
import { checkCombatRef } from '../charkit/anim/combatfit.js';
import { COMBAT } from '../shinshoku/data/combat.js';
import { ROOT, readJson } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const FIX = join(ROOT, 'tests/fixtures/charkit_test.gltf');

// 移す前の shinshoku/actor/bones.js の matchBones（比べる用に写しを置く。本体は charkit/rig/bonemap.js の 1 つだけ）
const LEGACY_SRC = `const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
function matchBones(names, map = {}) { const out = {}, byNorm = new Map(names.map(n => [norm(n), n]));
  for (const j of JOINT_NAMES) { if (map[j] && names.includes(map[j])) { out[j] = map[j]; continue; } for (const a of ALIASES[j]) { const hit = byNorm.get(norm(a)); if (hit) { out[j] = hit; break; } } }
  if (!out.chest && out.spine) out.chest = out.spine; return out; }`;
const legacy = new Function('JOINT_NAMES', 'ALIASES', LEGACY_SRC + '\nreturn matchBones;')(BM.JOINT_NAMES, BM.ALIASES);

const UE5 = Object.values(BM.PROFILES.ue5), MIX = Object.values(BM.PROFILES.mixamo), RIG = Object.values(BM.PROFILES.rigify), VRM = Object.values(BM.PROFILES.vrm);

await t('shinshoku/actor/bones.js は charkit の再輸出だけ（同じ関数・同じ表・二重の実装なし）', () => {
  assert.equal(SB.matchBones, BM.matchBones); assert.equal(SB.JOINT_NAMES, BM.JOINT_NAMES); assert.equal(SB.ALIASES, BM.ALIASES);
  const src = readFileSync(join(ROOT, 'shinshoku/actor/bones.js'), 'utf8');
  assert.ok(!/function\s+matchBones/.test(src) && /from '\.\.\/\.\.\/charkit\/rig\/bonemap\.js'/.test(src));
  assert.equal(BM.JOINT_NAMES.length, 17);
});

await t('2 引数の matchBones は移す前と同じ結果（Mixamo・Rigify 風・UE5・VRM・指つき・ext_ 混じり・手書きの表）', () => {
  const sets = [
    ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2', 'mixamorig:Neck', 'mixamorig:Head', 'mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand', 'mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand', 'mixamorig:LeftUpLeg', 'mixamorig:LeftLeg', 'mixamorig:LeftFoot', 'mixamorig:RightUpLeg', 'mixamorig:RightLeg', 'mixamorig:RightFoot'],
    ['pelvis', 'spine.001', 'spine.003', 'neck', 'head', 'upper_arm.L', 'forearm.L', 'hand.L', 'upper_arm.R', 'forearm.R', 'hand.R', 'thigh.L', 'shin.L', 'foot.L', 'thigh.R', 'shin.R', 'foot.R'],
    UE5, MIX, RIG, VRM, [...VRM, 'ext_hair_ponytail_01', 'socket_hand_R'], ['Root', 'MyHip', 'spine'], [],
    boneNames(readGltfJson(readFileSync(FIX))), boneNames(readGltfJson(readFileSync(join(ROOT, 'tests/fixtures/shinshoku_char_test.gltf')))),
  ];
  for (const names of sets) for (const map of [{}, { hips: 'MyHip' }, { leftHand: names[0] }]) assert.deepEqual(BM.matchBones(names, map), legacy(names, map), names.slice(0, 2).join(','));
  assert.equal(BM.matchBones(sets[0]).chest, 'mixamorig:Spine2', '17 本だけの時の chest は今までどおり Spine2');
});

await t('骨格の形の当て（detectProfile）と、形の表での対応（指 30 本・目・あご・肩・つま先）', () => {
  assert.equal(BM.detectProfile(VRM), 'vrm'); assert.equal(BM.detectProfile(UE5), 'ue5'); assert.equal(BM.detectProfile(MIX), 'mixamo'); assert.equal(BM.detectProfile(RIG), 'rigify');
  assert.equal(BM.detectProfile(MIX.map(s => s.replace('mixamorig:', 'mixamorig1:'))), 'mixamo', 'Mixamo の頭の違い');
  assert.equal(BM.detectProfile(['Root', 'Body']), 'unknown');
  for (const [p, names] of [['ue5', UE5], ['mixamo', MIX], ['rigify', RIG], ['vrm', VRM]]) {
    const m = BM.matchBones(names, {}, { extended: true });
    const sk = BM.checkSkeleton(m);
    assert.deepEqual(sk.missingRequired, [], p);
    assert.equal(sk.fingers, 30, p + ' の指');
    for (const [j, nm] of Object.entries(BM.PROFILES[p])) assert.equal(m[j], nm, `${p} ${j}`);
  }
  const ue = BM.matchBones(UE5, {}, { extended: true });
  assert.equal(ue.leftShoulder, 'clavicle_l'); assert.equal(ue.rightToes, 'ball_r'); assert.equal(ue.leftIndexProximal, 'index_01_l'); assert.equal(ue.leftLittleDistal, 'pinky_03_l');
  const mx = BM.matchBones(MIX, {}, { extended: true });
  assert.equal(mx.chest, 'mixamorig:Spine1'); assert.equal(mx.upperChest, 'mixamorig:Spine2'); assert.equal(mx.leftThumbMetacarpal, 'mixamorig:LeftHandThumb1');
  assert.equal(BM.matchBones(RIG, {}, { extended: true }).jaw, 'DEF-jaw');
  // 手書きの表が先
  assert.equal(BM.matchBones(UE5, { head: 'neck_01' }, { extended: true }).head, 'neck_01');
  assert.equal(BM.VRM_RECOMMENDED.length, 38); assert.equal(BM.FINGERS.length, 30);
});

await t('ext_ の名前の分解（規則：ext_<組>_<部位>[_L|R|F|B|C]_<番号2桁>）と socket_', () => {
  const ok = BM.extBones(['ext_hair_ponytail_01', 'ext_hair_side_R_03', 'ext_cloth_jacketTail_L_02', 'ext_cloth_skirt_F_01', 'ext_acc_hat', 'ext_acc_charm_02', 'ext_tail_08', 'ext_ear_L_01', 'ext_weapon_sheath', 'socket_hand_R', 'socket_back', 'hips']);
  assert.equal(ok.length, 11, 'ext_・socket_ 以外は無視'); assert.ok(ok.every(e => !e.error), JSON.stringify(ok.filter(e => e.error)));
  assert.deepEqual(ok[0], { name: 'ext_hair_ponytail_01', group: 'hair', part: 'ponytail', side: null, index: 1 });
  assert.deepEqual(ok[1], { name: 'ext_hair_side_R_03', group: 'hair', part: 'side', side: 'R', index: 3 });
  assert.deepEqual(ok[6], { name: 'ext_tail_08', group: 'tail', part: null, side: null, index: 8 });
  assert.deepEqual(ok[7], { name: 'ext_ear_L_01', group: 'ear', part: null, side: 'L', index: 1 });
  for (const bad of ['ext_hair_ponytail_1', 'ext_Hair_x', 'ext_wing_01', 'ext_hair', 'socket_Hand']) assert.ok(BM.extBones([bad])[0].error, bad);
});

await t('骨の列（chains.json）：全部の骨が標準骨格の名前・IK の 3 本が列の中・ext の列の名前が規則どおり', () => {
  const c = readJson('charkit/rig/chains.json');
  assert.equal(c.skeleton, 'wakaba-humanoid/1');
  const all = new Set(BM.ALL_BONES);
  for (const [id, ch] of Object.entries(c.chains)) {
    for (const b of ch.bones) assert.ok(all.has(b), `${id}: ${b}`);
    if (ch.ik) for (const k of ['root', 'mid', 'end']) assert.ok(ch.bones.includes(ch.ik[k]), `${id}.ik.${k}`);
  }
  const used = Object.values(c.chains).flatMap(ch => ch.bones);
  assert.equal(new Set(used).size, used.length, '同じ骨が 2 つの列に入らない');
  assert.deepEqual(BM.ALL_BONES.filter(b => !used.includes(b)), [], '標準骨格の骨は全部どれかの列に入る');
  for (const [id, e] of Object.entries(c.extChains)) if (id !== '_note') { assert.ok(all.has(e.parent), id); assert.ok(!BM.extBones([e.pattern.replace('##', '01')])[0].error, e.pattern); }
  for (const [s, p] of Object.entries(c.sockets)) { assert.ok(!BM.extBones([s])[0].error, s); assert.ok(all.has(p)); }
});

await t('試験用の glTF：生成し直すと同じバイト列・形の自己検査・指 30 本・目・あご・ext_・クリップ 4 本の印', () => {
  const dir = mkdtempSync(join(tmpdir(), 'charkit-')); const out = join(dir, 'c.gltf');
  try {
    const r = spawnSync(process.execPath, [join(ROOT, 'tools/charkit/make_test_char.mjs'), out], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(readFileSync(out).equals(readFileSync(FIX)), 'tests/fixtures/charkit_test.gltf は make_test_char.mjs の出力と同じ（作り直したら入れ替える）');
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const json = readGltfJson(readFileSync(FIX));
  assert.deepEqual(checkStructure(json).errors, []);
  assert.equal(vrmHumanBones(json), null, 'VRM の拡張は付けない（14 §7）');
  const names = boneNames(json);
  const m = checkModelBones(names, null, { requireRecommended: true });
  assert.equal(m.valid, true, JSON.stringify(m.errors)); assert.equal(m.fingers, 30);
  assert.deepEqual(m.ext.map(e => e.name), ['ext_hair_ponytail_01', 'ext_hair_ponytail_02', 'ext_hair_ponytail_03', 'ext_hair_ponytail_04', 'ext_acc_hat', 'socket_hand_R']);
  assert.equal(BM.detectProfile(names), 'vrm');
  const clips = Object.fromEntries(json.animations.map(a => [a.name, a.extras.wakaba]));
  assert.deepEqual(Object.keys(clips), ['idle_stand', 'loco_walk_fwd', 'loco_walk_fwd_slide', 'cmb_katana_light_1']);
  assert.equal(checkCombatRef(clips.cmb_katana_light_1, COMBAT.katana.light[0]).ok, true, '刀の弱 1 段目の印が戦闘の数字と一致');
  assert.deepEqual(clips.loco_walk_fwd.events.map(e => e.t), ['footL', 'footR']);
});

await t('試験用の glTF が境界侵食の読み込み（shinshoku/actor/vrm.js の loadGLTF → bones.js）で読める（node・three.js 0.185.1）', async () => {
  register('./helpers/three-node-hooks.mjs', import.meta.url);
  globalThis.ProgressEvent ??= class ProgressEvent extends Event { constructor(type, o = {}) { super(type); this.lengthComputable = !!o.lengthComputable; this.loaded = o.loaded || 0; this.total = o.total || 0; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (req, o) => { const u = typeof req === 'string' ? req : req.url; return u.startsWith('file:') ? new Response(readFileSync(new URL(u))) : realFetch(req, o); };
  const warn = console.warn; const warns = []; console.warn = (...a) => warns.push(a.join(' '));
  try {
    const { loadGLTF, loadCharacter } = await import('../shinshoku/actor/vrm.js');
    const m = await loadGLTF({ file: '../../../tests/fixtures/charkit_test.gltf', height: 1.64, animations: 'clips' });
    assert.ok(m, warns.join(' | '));
    assert.equal(m.bonesFound, 17); assert.deepEqual(Object.keys(m.J).sort(), [...BM.JOINT_NAMES].sort());
    assert.deepEqual(m.clips.map(c => c.name), ['idle_stand', 'loco_walk_fwd', 'loco_walk_fwd_slide', 'cmb_katana_light_1']);
    assert.ok(Math.abs(m.clips[3].duration - 0.4) < 1e-6); assert.ok(m.mixer, 'animations:"clips" の時はミキサーができる');
    m.update(1 / 60);
    // 背の高さを 1.64m に合わせ、足を地面へ
    const { Box3 } = await import('three'); const b = new Box3().setFromObject(m.root);
    assert.ok(Math.abs(b.max.y - b.min.y - 1.64) < 0.06 && Math.abs(b.min.y) < 1e-6, `高さ ${b.max.y - b.min.y}`);
    // 前からある試験用の glTF（Mixamo 風）も同じく読める
    const old = await loadGLTF({ file: '../../../tests/fixtures/shinshoku_char_test.gltf', height: 1.64 });
    assert.equal(old.bonesFound, 17); assert.equal(old.mixer, null);
    // manifest の file が null（今の境界侵食）なら今と同じく null（コード製の仮のキャラクター）
    const manifest = readJson('shinshoku/assets/characters/manifest.json');
    assert.ok(manifest.ver >= 3);
    for (const [id, e] of Object.entries(manifest.characters)) {
      assert.equal(e.config, undefined, id + '：manifest に config はまだ入れない');
      if (e.file) { assert.ok(/\.vrm$/.test(e.file) && existsSync(join(ROOT, 'shinshoku/assets/characters', e.file)), id + '：P15 の Blender で作った VRM（tests/shinshoku-p15-vrmchar.test.mjs）'); continue; }
      assert.equal(await loadCharacter(e), null, id);
    }
  } finally { console.warn = warn; globalThis.fetch = realFetch; }
});

await t('gltf-validator（任意・dev だけ）：入っていればエラー 0、無ければ飛ばす', async () => {
  let gv = null;
  try { gv = await import('gltf-validator'); } catch (e) { console.log('    （gltf-validator が無いので飛ばす：npm i --no-save gltf-validator で確かめられる）'); return; }
  const r = await (gv.default || gv).validateBytes(new Uint8Array(readFileSync(FIX)), { uri: 'charkit_test.gltf' });
  assert.equal(r.issues.numErrors, 0, JSON.stringify(r.issues.messages.slice(0, 5)));
});

await t('sw.js：charkit・mapkit の ES モジュールはネット優先で保存（オフラインでも bones.js が読める）・スキーマや .mjs は扱わない', () => {
  const ctx = { self: { location: new URL('https://example.github.io/dannoura-game/sw.js'), addEventListener() {} }, URL, Set, Map, Promise, console, Response: class {}, Headers: class {} };
  vm.createContext(ctx); vm.runInContext(readFileSync(join(ROOT, 'sw.js'), 'utf8') + '\n;globalThis.__sw={kindOf,BASE,VERSION};', ctx);
  const k = p => ctx.__sw.kindOf(new URL(p, ctx.__sw.BASE));
  assert.equal(k('charkit/rig/bonemap.js'), 'shell'); assert.equal(k('mapkit/core/schema.js'), 'shell');
  assert.equal(k('charkit/schema/character.schema.json'), null); assert.equal(k('mapkit/assets/license-gate.mjs'), null); assert.equal(k('charkit/rig/chains.json'), null);
  assert.equal(k('shinshoku/actor/bones.js'), 'shell');
  assert.ok(existsSync(join(ROOT, 'charkit/rig/bonemap.js')));
});

console.log(`wakaba-charkit-bonemap: ${n} ok`);
