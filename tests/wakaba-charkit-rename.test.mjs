// わかば charkit（方式 C）：骨の名前の付け替え VRM → UE5 マネキン（charkit/rig/rename.js）と、Blender 用の対応表の JSON（生成物）が最新であること。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as BM from '../charkit/rig/bonemap.js';
import { renamePlan, applyRename, profileTable } from '../charkit/rig/rename.js';
import { ROOT, readJson } from '../mapkit/core/node.mjs';

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const VRM = Object.values(BM.PROFILES.vrm), UE5 = BM.PROFILES.ue5;
// VRoid の書き出しを Blender の VRM アドオンで開いた時に近い形：humanoid の名前＋髪・服の ext_・socket_
const SAMPLE = [...VRM, 'ext_hair_ponytail_01', 'ext_hair_ponytail_02', 'ext_cloth_skirt_F_01', 'socket_hand_R', 'Root'];

await t('VRM の名前の骨格 → UE5 マネキンの名前（hips→pelvis・腕・脚・指 30 本・肩・つま先）', () => {
  const p = renamePlan(SAMPLE, { to: 'ue5' });
  assert.equal(p.from, 'vrm');
  assert.deepEqual(p.collisions, []);
  const out = applyRename(SAMPLE, p);
  const ex = { hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', upperChest: 'spine_05', neck: 'neck_01', head: 'head', leftUpperArm: 'upperarm_l', rightLowerArm: 'lowerarm_r', leftHand: 'hand_l', rightUpperLeg: 'thigh_r', leftLowerLeg: 'calf_l', rightFoot: 'foot_r', leftToes: 'ball_l', leftShoulder: 'clavicle_l', leftThumbMetacarpal: 'thumb_01_l', rightIndexProximal: 'index_01_r', leftLittleDistal: 'pinky_03_l', rightMiddleIntermediate: 'middle_02_r' };
  for (const [v, u] of Object.entries(ex)) assert.equal(out[SAMPLE.indexOf(v)], u, v);
  // UE5 に無い骨（目・あご）は名前を変えずに残す。ext_・socket_・Root もそのまま
  assert.deepEqual(p.noTarget.sort(), ['jaw', 'leftEye', 'rightEye']);
  for (const k of ['leftEye', 'jaw', 'ext_hair_ponytail_01', 'ext_cloth_skirt_F_01', 'socket_hand_R', 'Root']) assert.equal(out[SAMPLE.indexOf(k)], k);
  assert.equal(new Set(out).size, out.length, '付け替えた後も名前が重ならない');
  assert.equal(Object.keys(p.rename).length, BM.ALL_BONES.length - 3 - 1, '全部の humanoid の骨（head は同じ名前）');
});

await t('一貫性：もう一度当てても変わらない・UE5 → VRM で元に戻る・Mixamo → UE5 は VRM 経由と同じ', () => {
  const p = renamePlan(SAMPLE, { to: 'ue5' }), ue = applyRename(SAMPLE, p);
  const again = renamePlan(ue, { from: 'ue5', to: 'ue5' }); assert.deepEqual(again.rename, {}, '同じ形への付け替えは何もしない');
  assert.equal(BM.detectProfile(ue), 'ue5');
  const back = applyRename(ue, renamePlan(ue, { from: 'ue5', to: 'vrm' })); assert.deepEqual(back, SAMPLE, 'UE5 → VRM で元の名前');
  const MIX = Object.values(BM.PROFILES.mixamo);
  const viaMix = applyRename(MIX, renamePlan(MIX, { to: 'ue5' }));
  const expect = MIX.map(m => { const v = Object.keys(BM.PROFILES.mixamo).find(k => BM.PROFILES.mixamo[k] === m); return UE5[v] || m; });
  assert.deepEqual(viaMix, expect);
  assert.throws(() => renamePlan(SAMPLE, { to: 'unity' }), /形/);
});

await t('Blender 用の対応表 tools/blender/bonemap_vrm_to_ue5.json は生成物として最新（export_bonemap.mjs --check）', () => {
  const j = readJson('tools/blender/bonemap_vrm_to_ue5.json');
  assert.deepEqual({ from: j.from, to: j.to, bones: j.bones, noTarget: j.noTarget }, profileTable('vrm', 'ue5'));
  assert.equal(j.bones.hips, 'pelvis'); assert.equal(j.bones.leftIndexProximal, 'index_01_l');
  const r = spawnSync(process.execPath, ['tools/charkit/export_bonemap.mjs', '--check'], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, r.stdout);
});

console.log(`wakaba-charkit-rename: ${n} ok`);
