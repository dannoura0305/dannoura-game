// わかば charkit：外部モデル（VRM）＋本物の動き（VRMA）への切り替え（2026-10-17 の方針・docs/wakaba-charkit/12「外部モデルへの切り替え」）。
// 試験用の VRM 1.0（tools/charkit/export_test_vrm.mjs：コードで組んだだんのうらの書き出し・本番の絵ではない）を node で three-vrm に読ませ、
// 骨の対応・表情の対応・VRMA の読み込み・状態機械の切り替え・戦闘のこまの伸縮・足の固定・manifest が null の時は今のまま、を確かめる。
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };
const origWarn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('VRMLookAtQuaternionProxy')) origWarn(...a); };

const THREE = await import('three');
const ROOT = new URL('../', import.meta.url);
const P = p => new URL(p, ROOT);
const buf = p => { const b = readFileSync(P(p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const { readGLB, buildVRMA, GLTFBuilder } = await import('../charkit/core/vrmwrite.js');
const { loadVRMModel, humanoidJoints, vrmLegDims, classOfMaterialName } = await import('../charkit/runtime/vrmrt.js');
const { loadClipSet, stripRootMotion } = await import('../charkit/runtime/vrma.js');
const { ClipAnimator, warpTime, locoWeights } = await import('../charkit/anim/clipanim.js');
const { tpConv, HUMAN17, convOf } = await import('../charkit/runtime/tpose.js');
const { FaceDriver, vrmFaceAdapter } = await import('../charkit/face/driver.js');
const { matchBones, detectProfile } = await import('../charkit/rig/bonemap.js');
const { fitSegments } = await import('../charkit/anim/combatfit.js');
const { COMBAT } = await import('../shinshoku/data/combat.js');
const MET = await import('../charkit/anim/metrics.js');
const { Poser, makeRig } = await import('../shinshoku/actor/rig.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const stubTex = l => l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
const VRM_FILE = 'shinshoku/assets/characters/test/dannoura_test.vrm';
const SET_FILE = 'shinshoku/assets/anim/test/clips.json';
const loadTest = (opt = {}) => loadVRMModel(buf(VRM_FILE), Object.assign({ height: 1.64, fit: 'none', loader: stubTex }, opt));
const loadSet = vrm => loadClipSet(JSON.parse(readFileSync(P(SET_FILE), 'utf8')), vrm, { fetchBinary: async (u, f) => buf('shinshoku/assets/anim/test/' + f) });

// ───────── 試験用の素材・manifest ─────────
await t('manifest：異形は null（コード製の予備）・人の 3 体は Blender で作った VRM（P15）・testEntries は ?vrm= の時だけ・試験用の印と出典', () => {
  const man = JSON.parse(readFileSync(P('shinshoku/assets/characters/manifest.json'), 'utf8'));
  for (const [k, e] of Object.entries(man.characters)) {
    if (['dannoura', 'dannoura_white', 'companion'].includes(k)) { assert.ok(/\.vrm$/.test(e.file) && !e.test, k + '：リポジトリの中で作った VRM（tests/shinshoku-p15-vrmchar.test.mjs）'); continue; }
    assert.equal(e.file, null, k + ' は null（本番のモデルが来るまで）');
  }
  const te = man.testEntries.test.dannoura;
  assert.equal(te.test, true); assert.equal(te.provisional, true); assert.ok(te.license && te.source && te.author);
  assert.ok(existsSync(new URL('shinshoku/assets/characters/' + te.file, ROOT)));
  assert.ok(existsSync(new URL(te.anim, new URL('shinshoku/assets/characters/', ROOT))));
});
await t('試験用の素材：meta の sha256 が中身と一致・本番の絵ではない印', () => {
  const meta = JSON.parse(readFileSync(P('shinshoku/assets/characters/test/dannoura_test.meta.json'), 'utf8'));
  assert.equal(meta.test, true); assert.equal(meta.notFinalArt, true);
  for (const f of meta.files) { const b = readFileSync(P('shinshoku/assets/' + f.file)); assert.equal(createHash('sha256').update(b).digest('hex'), f.sha256, f.file); }
});
await t('vendor：three-vrm-animation 3.5.5（three-vrm と同じ版）の sha256 と LICENSE', () => {
  const b = readFileSync(P('vendor/three-esm/three-vrm-animation-3.5.5/three-vrm-animation.module.min.js'));
  assert.equal(createHash('sha256').update(b).digest('hex'), '31de9586a36a8ad806303b84358f11d74ce70ac1d2656b04e8a5da7a913aa907');
  assert.match(readFileSync(P('vendor/three-esm/three-vrm-animation-3.5.5/LICENSE'), 'utf8'), /MIT/);
  assert.match(readFileSync(P('vendor/three-esm/README.md'), 'utf8'), /three-vrm-animation@3\.5\.5/);
  assert.match(readFileSync(P('shinshoku.html'), 'utf8'), /"@pixiv\/three-vrm-animation": "\.\/vendor\/three-esm\/three-vrm-animation-3\.5\.5\//);
});

await t('sw.js：版を上げた・試験用の VRM／VRMA は素材（保存分）・動きの組 clips.json はネット優先・three-vrm-animation は code', async () => {
  const vm = await import('node:vm');
  const ctx = { self: { location: new URL('https://example.github.io/dannoura-game/sw.js'), addEventListener() {} }, URL, Set, Map, Promise, console, Response: class {}, Headers: class {} };
  vm.createContext(ctx); vm.runInContext(readFileSync(P('sw.js'), 'utf8') + '\n;globalThis.__sw={VERSION,kindOf};', ctx);
  const sw = ctx.__sw; const k = p => sw.kindOf(new URL(p, 'https://example.github.io/dannoura-game/'));
  assert.ok(sw.VERSION >= '2026-10-31.2', sw.VERSION);
  assert.equal(k('shinshoku/assets/characters/test/dannoura_test.vrm'), 'media');
  assert.equal(k('shinshoku/assets/anim/test/loco_walk.vrma'), 'media');
  assert.equal(k('shinshoku/assets/anim/test/clips.json'), 'shell');
  assert.equal(k('vendor/three-esm/three-vrm-animation-3.5.5/three-vrm-animation.module.min.js'), 'code');
  assert.equal(k('charkit/anim/clipanim.js'), 'shell');
});

// ───────── 書き手（GLB・VRM・VRMA） ─────────
await t('vrmwrite：GLB の往復（JSON・バイナリ・4 バイト境界・accessor の min/max）', () => {
  const B = new GLTFBuilder(); const a = B.accessor(new Float32Array([0, 1, 2, -1, 5, 3]), 'VEC3', { minmax: true }); B.node({ name: 'x' });
  const { json, bin } = readGLB(B.glb());
  assert.deepEqual(json.accessors[a].min, [-1, 1, 2]); assert.deepEqual(json.accessors[a].max, [0, 5, 3]);
  assert.equal(bin.byteLength % 4, 0); assert.equal(json.bufferViews[0].byteOffset % 4, 0);
});
await t('試験用の VRM の中身：VRMC_vrm 1.0・人型 19 本・表情 14・揺れ物・MToon・T ポーズ（骨に回転なし）', () => {
  const { json } = readGLB(new Uint8Array(buf(VRM_FILE)));
  const v = json.extensions.VRMC_vrm;
  assert.equal(v.specVersion, '1.0'); assert.match(v.meta.name, /試験/);
  assert.equal(Object.keys(v.humanoid.humanBones).length, 19);
  for (const k of ['blink', 'aa', 'ih', 'ou', 'ee', 'oh', 'happy', 'angry', 'sad', 'relaxed', 'surprised']) assert.ok(v.expressions.preset[k], k);
  assert.ok(json.extensions.VRMC_springBone.springs.length >= 5);
  assert.ok(json.materials.every(m => m.extensions && m.extensions.VRMC_materials_mtoon));
  for (const nd of json.nodes) assert.ok(!nd.rotation, '骨に回転なし：' + nd.name);
  const L = json.nodes[v.humanoid.humanBones.leftUpperArm.node], LL = json.nodes[v.humanoid.humanBones.leftLowerArm.node];
  assert.ok(LL.translation[0] > 0.2 && Math.abs(LL.translation[1]) < 0.02, '左腕は +x（T ポーズ）'); void L;
});

// ───────── 読み込み（three-vrm） ─────────
const M = await loadTest();
const vrm = M.vrm;
await t('VRM の読み込み（node・three-vrm 3.5.5）：normalized の人型・脚の寸法・高さ・表情・揺れ物', () => {
  assert.equal(M.stats.metaVersion, '1');
  for (const k of HUMAN17) assert.ok(M.J[k], '骨 ' + k);
  assert.ok(M.J.leftEye && M.J.rightEye);
  assert.ok(M.stats.springJoints >= 17, '揺れ物の関節 ' + M.stats.springJoints);
  assert.equal(M.stats.expressions, 14);
  assert.ok(Math.abs(M.stats.heightM - 1.7) < 0.08, '高さ（帽子込み）' + M.stats.heightM);
  const L = M.legDims; assert.ok(L.thigh > 0.3 && L.thigh < 0.5 && L.shin > 0.3 && L.shin < 0.5 && L.ankleY > 0.02 && L.ankleY < 0.15, JSON.stringify(L));
  assert.equal(M.stats.vertexColorMats, 20, '頂点色（材質の extras.useVertexColor）');
});
await t('高さ合わせ：fit:bbox で 1.64m・scale を渡せばそちら', async () => {
  const a = await loadTest({ fit: 'bbox', height: 1.64 }); assert.ok(Math.abs(a.stats.heightM - 1.64) < 0.01, a.stats.heightM);
  const b = await loadTest({ scale: 0.5 }); assert.ok(Math.abs(b.stats.heightM - M.stats.heightM * 0.5) < 0.01);
});
await t('骨の対応：VRM の骨の名前（生の名前）→ matchBones で 17 本・形は vrm', () => {
  const names = []; vrm.scene.traverse(o => { if (o.isBone) names.push(o.name); });
  const m = matchBones(names, {}); assert.equal(Object.keys(m).length, 17);
  assert.equal(detectProfile(names), 'vrm');
  assert.equal(Object.keys(humanoidJoints(vrm)).filter(k => HUMAN17.includes(k)).length, 17);
  assert.equal(classOfMaterialName('N00_000_00_HairBack_00_HAIR (Instance)'), 'hair'); assert.equal(classOfMaterialName('N00_000_00_Face_00_SKIN'), 'face');
});
await t('T ポーズの付け替え：腕を下ろした休み（単位）→ 左腕 Rz(-90°)・右腕 Rz(+90°)／往復で元に戻る', () => {
  const I = new THREE.Quaternion();
  const l = tpConv.toT('leftUpperArm', I), r = tpConv.toT('rightUpperArm', I);
  const down = new THREE.Vector3(1, 0, 0).applyQuaternion(l), down2 = new THREE.Vector3(-1, 0, 0).applyQuaternion(r);
  assert.ok(down.y < -0.999 && down2.y < -0.999, '休みで腕が下を向く');
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.2, 0.5, 'YXZ'));
  for (const k of ['leftUpperArm', 'leftLowerArm', 'rightHand', 'spine']) assert.ok(tpConv.fromT(k, tpConv.toT(k, q)).angleTo(q) < 1e-6, k);
  assert.ok(convOf('hips').equals(I));
});
await t('Poser の tpose：同じ手続きの姿勢で、腕を下ろした骨と T の骨の手の位置が同じ', () => {
  const D = { leg: 0.86, spine: 0.12, chest: 0.2, neck: 0.16, headJ: 0.06, shoulderX: 0.17, shoulderY: 0.12, upperArm: 0.27, lowerArm: 0.24, hipX: 0.085, thigh: 0.4, shin: 0.385 };
  const A = makeRig(D), Tr = makeRig(D);
  for (const s of ['left', 'right']) { const sx = s === 'left' ? 1 : -1; Tr.J[s + 'LowerArm'].position.set(sx * D.upperArm, 0, 0); Tr.J[s + 'Hand'].position.set(sx * D.lowerArm, 0, 0); }
  const pose = { leftUpperArm: [-0.6, 0.2, 0.3], leftLowerArm: [-0.9, 0, 0], rightUpperArm: [0.4, -0.1, -0.2], rightLowerArm: [-0.5, 0.1, 0], chest: [0.1, 0.3, 0], hips: [0, 0.2, 0.05] };
  new Poser(A.J, {}).apply(pose, 1); new Poser(Tr.J, {}, { tpose: true }).apply(pose, 1);
  A.root.updateMatrixWorld(true); Tr.root.updateMatrixWorld(true);
  for (const k of ['leftHand', 'rightHand', 'leftLowerArm']) { const a = A.J[k].getWorldPosition(new THREE.Vector3()), b = Tr.J[k].getWorldPosition(new THREE.Vector3()); assert.ok(a.distanceTo(b) < 1e-5, k + ' ' + a.distanceTo(b)); }
});

// ───────── 表情・口・視線 ─────────
await t('表情の対応：瞬き・文字の口（aa..oh）・感情（smile→happy）・視線（lookAt の yaw/pitch）', () => {
  const fd = new FaceDriver(vrmFaceAdapter(vrm), { seed: 3, blinkPerMin: 60 });
  const em = vrm.expressionManager;
  fd.say('だんのうらよ、よろしく', 3.5);
  const seen = new Set(); let blinkMax = 0;
  for (let i = 0; i < 240; i++) { fd.update(1 / 60); for (const v of ['aa', 'ih', 'ou', 'ee', 'oh']) if (em.getValue(v) > 0.3) seen.add(v); blinkMax = Math.max(blinkMax, em.getValue('blink')); }
  assert.ok(seen.has('aa') && seen.has('ou') && seen.has('oh'), [...seen].join(','));   // だ・の・う・ら・よ
  assert.ok(blinkMax > 0.9, '瞬き ' + blinkMax);
  fd.setExpr('smile'); assert.equal(em.getValue('happy'), 1); fd.setExpr('neutral'); assert.equal(em.getValue('happy'), 0);
  fd.lookAt(1, -0.5); for (let i = 0; i < 30; i++) fd.update(1 / 60);
  assert.ok(vrm.lookAt.yaw > 10 && vrm.lookAt.pitch < -2, vrm.lookAt.yaw + ' ' + vrm.lookAt.pitch);
  vrm.update(1 / 60); vrm.update(1 / 60);
  const eyeA = Math.max(vrm.humanoid.getRawBoneNode('leftEye').quaternion.angleTo(new THREE.Quaternion()), M.J.leftEye.quaternion.angleTo(new THREE.Quaternion()));
  assert.ok(eyeA > 0.02, '目の骨が回る（bone 型の lookAt・範囲の表で 20° → 約 2°）' + eyeA);
});

// ───────── VRMA ─────────
const S = await loadSet(vrm);
await t('VRMA の読み込み：8 本・normalized の骨のトラック・移動は周期の継ぎ目なし・速さと歩幅', () => {
  assert.deepEqual(S.errors, []);
  assert.equal(Object.keys(S.clips).length, 8);
  for (const [id, { clip, meta }] of Object.entries(S.clips)) {
    assert.ok(clip.tracks.some(tr => tr.name.endsWith('.quaternion')), id);
    assert.ok(clip.tracks.some(tr => /hips.*\.position$/.test(tr.name)), id + ' 腰の位置');
    if (meta.role === 'loco') {
      assert.ok(meta.speedMS > 1 && meta.durationS > 0.3 && meta.strideM > 0.4, id);
      for (const tr of clip.tracks) { const k = tr.getValueSize(), v = tr.values, nn = v.length / k; for (let c = 0; c < k; c++) assert.ok(Math.abs(v[c] - v[(nn - 1) * k + c]) < 1e-4, id + ' 継ぎ目 ' + tr.name); }
      assert.ok(Math.abs(meta.strideScale - 1) < 0.02, '同じ体なので歩幅の倍率 1：' + meta.strideScale);
    }
  }
  const atk = S.clips.cmb_katana_light_1.meta;
  assert.deepEqual(atk.events, [{ t: 'hitStart', frame: 6 }, { t: 'hitEnd', frame: 10 }]); assert.equal(atk.frames, 24);
});
await t('根の動きを抜く：腰の X・Z の直線の進みを引き、距離を返す', () => {
  const tr = new THREE.VectorKeyframeTrack('h.position', [0, 0.5, 1], [0, 0.9, 0, 0.1, 0.92, 0.7, 0, 0.9, 1.4]);
  const r = stripRootMotion(tr); assert.ok(Math.abs(r.dist - 1.4) < 1e-6);
  assert.ok(Math.abs(tr.values[6]) < 1e-6 && Math.abs(tr.values[8]) < 1e-6 && Math.abs(tr.values[5]) < 1e-6 && Math.abs(tr.values[3] - 0.1) < 1e-6);
});
await t('VRMA の書き出し → 読み込みの往復（自作の 2 こま・回転の値が normalized の骨に当たる）', async () => {
  const bones = HUMAN17.map(nm => ({ name: nm, parent: -1, pos: [0, 0, 0] }));
  const ix = Object.fromEntries(HUMAN17.map((x, i) => [x, i]));
  const PAR = { spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', leftUpperArm: 'chest', leftLowerArm: 'leftUpperArm', leftHand: 'leftLowerArm', rightUpperArm: 'chest', rightLowerArm: 'rightUpperArm', rightHand: 'rightLowerArm', leftUpperLeg: 'hips', leftLowerLeg: 'leftUpperLeg', leftFoot: 'leftLowerLeg', rightUpperLeg: 'hips', rightLowerLeg: 'rightUpperLeg', rightFoot: 'rightLowerLeg' };
  for (const b of bones) { if (PAR[b.name]) b.parent = ix[PAR[b.name]]; b.pos = b.name === 'hips' ? [0, 0.9, 0] : /UpperArm/.test(b.name) ? [b.name[0] === 'l' ? 0.15 : -0.15, 0.1, 0] : /LowerArm|Hand/.test(b.name) ? [b.name[0] === 'l' ? 0.25 : -0.25, 0, 0] : /UpperLeg/.test(b.name) ? [b.name[0] === 'l' ? 0.08 : -0.08, -0.05, 0] : /LowerLeg|Foot/.test(b.name) ? [0, -0.4, 0] : [0, 0.12, 0]; }
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.7);
  const rot = { [ix.leftUpperLeg]: new Float32Array([0, 0, 0, 1, q.x, q.y, q.z, q.w]) };
  const glb = buildVRMA({ name: 'x', bones, humanBones: Object.fromEntries(HUMAN17.map((x, i) => [x, i])), times: new Float32Array([0, 1]), rotations: rot, hipsTranslation: new Float32Array([0, 0.9, 0, 0, 0.88, 0]) });
  const set = { spec: 'wakaba-clipset/1', clips: { x: { file: 'x.vrma', role: 'loco', loop: true, speedMS: 1 } } };
  const r = await loadClipSet(set, vrm, { fetchBinary: async () => glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) });
  assert.deepEqual(r.errors, []);
  const clip = r.clips.x.clip, nm = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg').name;
  const tr = clip.tracks.find(x => x.name === nm + '.quaternion'); assert.ok(tr);
  const end = new THREE.Quaternion().fromArray(tr.values, 4); assert.ok(end.angleTo(q) < 1e-4, '回転 ' + end.angleTo(q));
});

// ───────── 状態機械・慣性の混ぜ・戦闘のこま・足の固定 ─────────
const holder = new THREE.Group(); holder.add(M.root);
const scene = vrm.scene, invM = new THREE.Matrix4(), gv = new THREE.Vector3();
const CA = new ClipAnimator(scene, M.J, S, { legDims: M.legDims, blendS: 0.2, ground: () => { M.root.updateWorldMatrix(true, false); invM.copy(scene.matrixWorld).invert(); return gv.setFromMatrixPosition(M.root.matrixWorld).applyMatrix4(invM).y; } });
const ctx0 = { st: 'free', f: 0, speed: 0, phase: 0, weapon: 'none' };
await t('移動の重み：速さで両隣を直線に・合計 1・端は 1 本', () => {
  const L = CA.loco; assert.deepEqual(L.map(x => x.id), ['loco.walk', 'loco.jog', 'loco.run', 'loco.sprint']);
  for (const v of [0.5, 2.2, 2.8, 4.1, 5.0, 6.0, 9]) { const w = locoWeights(L, v); assert.ok(Math.abs(w.reduce((s, x) => s + x.w, 0) - 1) < 1e-9, 'v=' + v); }
  assert.equal(locoWeights(L, 0.5)[0].it.id, 'loco.walk'); assert.equal(locoWeights(L, 9)[0].it.id, 'loco.sprint');
  // 1 周期の距離 → 位相の進み（distance matching）：歩きの速さで 2π / (速さ × 周期)
  const w = L[0]; assert.ok(Math.abs(CA.phaseRate(w.meta.speedMS) - 2 * Math.PI / (w.meta.speedMS * w.clip.duration)) < 1e-9);
});
await t('状態機械：待機 → 移動 → 攻撃（クリップ）→ 回避（手続きの予備）→ ひるみ（クリップ）→ 待機・切り替えで慣性の混ぜ', () => {
  const keys = [];
  const step = (c, n = 1) => { for (let i = 0; i < n; i++) keys.push(CA.update(1 / 60, c).key); return keys[keys.length - 1]; };
  assert.equal(step(ctx0, 10), 'idle');
  let ph = 0; for (let i = 0; i < 30; i++) { ph += 2.2 / 60 * CA.phaseRate(2.2); step(Object.assign({}, ctx0, { speed: 2.2, phase: ph })); }
  assert.equal(keys[keys.length - 1], 'loco');
  const a = COMBAT.katana.light[0];
  assert.match(step(Object.assign({}, ctx0, { st: 'attack', f: 3, atk: a, step: 0, weapon: 'katana' })), /^attack:cmb_katana_light_1/);
  assert.equal(step(Object.assign({}, ctx0, { st: 'dodge', f: 2, total: COMBAT.dodge.total })), 'proc:dodge', '回避のクリップは無い＝手続き');
  assert.match(step(Object.assign({}, ctx0, { st: 'hurt', f: 4, total: COMBAT.hurt.stun })), /^hurt:react_hit_front/);
  assert.equal(step(Object.assign({}, ctx0, { st: 'reload' })), 'proc:reload');
  assert.equal(step(ctx0, 20), 'idle');
  assert.ok(CA.stats.switches >= 6, '切り替え ' + CA.stats.switches);
});
await t('慣性の混ぜ：切り替えのこまは前のこまの姿勢から始まり、blendS（0.2 秒）で新しい源へ', () => {
  const B = CA.bones, prev = B.map(b => b.quaternion.clone());
  CA.update(1 / 60, Object.assign({}, ctx0, { st: 'hurt', f: 0, total: COMBAT.hurt.stun }));
  const d0 = Math.max(...B.map((b, i) => b.quaternion.angleTo(prev[i])));
  assert.ok(d0 < 0.12, '切り替えのこまの跳び ' + d0.toFixed(3) + ' rad');
  for (let i = 0; i < 16; i++) CA.update(1 / 60, Object.assign({}, ctx0, { st: 'hurt', f: 1 + i, total: COMBAT.hurt.stun }));
  assert.ok(CA.blendT >= 0.2, '混ぜ終わり');
  for (let i = 0; i < 20; i++) CA.update(1 / 60, ctx0);
});
await t('戦闘のこま：データ（combat.js）の startup・active にクリップの hitStart・hitEnd を合わせる（区間ごとの伸縮）', () => {
  const it = CA.find('attack', { weapon: 'katana', step: 0, heavy: false });
  const a = COMBAT.katana.light[0];
  assert.deepEqual([a.startup, a.active, a.recovery], [6, 4, 14], '戦闘の数字は変えていない');
  const f = CA.fit(it, a); assert.equal(f.ok, true); assert.deepEqual(f.scales.map(x => +x.toFixed(6)), [1, 1, 1]);
  // データが変わった時（startup 9・active 6・recovery 21）：作品のこま 9 → クリップの 6/60 秒、15 → 10/60
  const g = CA.fit(it, { startup: 9, active: 6, recovery: 21 });
  assert.ok(Math.abs(warpTime(g.map, 9 / 60) - 6 / 60) < 1e-9 && Math.abs(warpTime(g.map, 15 / 60) - 10 / 60) < 1e-9);
  assert.ok(g.ok, '倍率 1.5 は範囲内');
  const bad = fitSegments(it.meta.events, 24, 60, { startup: 30, active: 4, recovery: 14 }); assert.equal(bad.ok, false, '倍率 5 は作り直しの印');
  // 2 段目・強はクリップが無い／別：2 段目は手続き
  assert.equal(CA.find('attack', { weapon: 'katana', step: 1, heavy: false }), null);
  assert.ok(CA.find('attack', { weapon: 'katana', step: 9, heavy: true }));
});
await t('足の固定（IK）：移動のクリップで、着いた足の滑り（13 §1.1 の数え方）が固定なしより大きくならない・床に入らない', () => {
  const L = M.legDims;
  const run = (ik, v) => {
    const A = new ClipAnimator(scene, M.J, S, { legDims: L, footIK: ik, ground: CA.opt.ground });
    holder.position.set(0, 0, 0); let ph = 0; const tr = { lh: [], lt: [], rh: [], rt: [] };
    for (let i = 0; i < 180; i++) {
      const dz = v / 60; holder.position.z += dz; holder.updateMatrixWorld(true);
      ph += dz * A.phaseRate(v);
      A.update(1 / 60, Object.assign({}, ctx0, { speed: v, phase: ph }));
      scene.updateMatrixWorld(true);
      if (i < 30) continue;
      for (const s of ['left', 'right']) {
        const F = M.J[s + 'Foot'], k = s[0];
        const h = new THREE.Vector3(0, -L.ankleY, -L.heel).applyMatrix4(F.matrixWorld), b = new THREE.Vector3(0, -L.ankleY, L.ball).applyMatrix4(F.matrixWorld);
        tr[k + 'h'].push([i / 60, h.x, h.y, h.z]); tr[k + 't'].push([i / 60, b.x, b.y, b.z]);
      }
    }
    const r = MET.footSlide(tr); const minY = Math.min(...Object.values(tr).flatMap(a => a.map(p => p[2])));
    return { mean: r.meanCmS, n: r.contactFrames, minY };
  };
  for (const v of [1.4, 2.2, 3.4, 5.0]) {
    const off = run(false, v), on = run(true, v);
    assert.ok(on.n > 20, '着いたこま ' + on.n);
    assert.ok(on.mean <= off.mean + 0.5 && on.mean < 3, `v=${v} 滑り ${off.mean.toFixed(2)} → ${on.mean.toFixed(2)} cm/s`);
    assert.ok(on.minY > -0.01, `v=${v} 床に入らない ${(on.minY * 100).toFixed(1)}cm`);
    console.log(`    v=${v}：足の滑り 固定なし ${off.mean.toFixed(2)} → 固定 ${on.mean.toFixed(2)} cm/s（着いたこま ${on.n}・一番低い点 ${(on.minY * 100).toFixed(1)}cm／固定なし ${(off.minY * 100).toFixed(1)}cm）`);
  }
  holder.position.set(0, 0, 0);
});
await t('会話の手（gesture）：上半身だけ重なる（腰・脚は変わらない）', () => {
  const g = Object.assign({}, S.clips['react_hit_front']); g.meta = Object.assign({}, g.meta, { id: 'gest', role: 'gesture' });
  const A = new ClipAnimator(scene, M.J, { clips: { idle: S.clips.idle, gest: g } }, { footIK: false });
  for (let i = 0; i < 10; i++) A.update(1 / 60, ctx0);
  const base = ['hips', 'leftUpperLeg', 'spine', 'leftUpperArm'].map(k => M.J[k].quaternion.clone());
  for (let i = 0; i < 60; i++) A.update(1 / 60, Object.assign({}, ctx0, { talking: true }));
  assert.ok(A.gestW > 0.6);
  const d = ['hips', 'leftUpperLeg', 'spine', 'leftUpperArm'].map((k, i) => M.J[k].quaternion.angleTo(base[i]));
  assert.ok(d[0] < 0.05 && d[1] < 0.05, '腰・脚はそのまま ' + d.map(x => x.toFixed(3)));
  assert.ok(d[2] + d[3] > 0.02, '上半身は動く ' + d.map(x => x.toFixed(3)));
});

await t('速さが急に変わっても（歩き 2.2 → 走り 5.0 を 1 こまで）重ねは跳ばない：切り替えの間の骨の回転の速さが走り続けている時と同じくらい', () => {
  const A = new ClipAnimator(scene, M.J, S, { legDims: M.legDims, ground: CA.opt.ground, footIK: process.env.NOIK ? false : true });
  let ph = 0, trans = 0, steady = 0; const B = A.bones;
  for (let i = 0; i < 200; i++) {
    const v = i < 60 ? 2.2 : 5.0; ph += v / 60 * A.phaseRate(v);
    const prev = B.map(b => b.quaternion.clone());
    A.update(1 / 60, Object.assign({}, ctx0, { speed: v, phase: ph }));
    const w = Math.max(...B.map((b, k) => b.quaternion.angleTo(prev[k]) * 180 / Math.PI));
    if (i >= 60 && i < 90) trans = Math.max(trans, w); else if (i >= 140) steady = Math.max(steady, w);
  }
  assert.ok(trans <= steady * 1.15 + 3, `切り替えの間 ${trans.toFixed(1)}°/こま・走り続けて ${steady.toFixed(1)}°/こま`);
  console.log(`    切り替えの間の最大 ${trans.toFixed(1)}°/こま（走り続けて ${steady.toFixed(1)}°/こま）`);
});
await t('一度だけの動き（動き出し・止まり）：あれば動き出しのこまで再生し、終わったら移動へ／動きを止めたら取り消し', () => {
  const st = Object.assign({}, S.clips.react_hit_front); st.meta = Object.assign({}, st.meta, { id: 'loco.start', role: 'start' });
  const A = new ClipAnimator(scene, M.J, { clips: { idle: S.clips.idle, 'loco.walk': S.clips['loco.walk'], 'loco.start': st } }, { footIK: false });
  for (let i = 0; i < 5; i++) A.update(1 / 60, ctx0);
  let ph = 0; const keys = [];
  for (let i = 0; i < 40; i++) { ph += 2.2 / 60 * A.phaseRate(2.2); keys.push(A.update(1 / 60, Object.assign({}, ctx0, { speed: 2.2, phase: ph })).key); }
  assert.equal(keys[0], 'one:loco.start'); assert.equal(keys[keys.length - 1], 'loco');
  const n = keys.filter(k => k === 'one:loco.start').length; assert.ok(Math.abs(n - Math.round(st.clip.duration * 60)) <= 2, '長さ ' + n);
});

// ───────── 権利の門（外部の道具・VRM の利用条件・試験用） ─────────
const G = await import('../mapkit/assets/gate.js');
const cfg = JSON.parse(readFileSync(P('wakaba.config.json'), 'utf8'));
const web = G.makeContext(cfg, 'shinshoku', { target: 'web' });
const base = (o = {}) => Object.assign({ id: 'char.dannoura', category: 'character', status: 'draft', license: { id: 'own', commercial: 'yes', redistributeRaw: 'yes', engines: ['any'], verifiedBy: 'user', verifiedAt: '2026-11-01' }, source: { type: 'self_made', tool: 'vroid_studio 2.14.0', vrmMeta: { commercialUsage: 'corporation' } } }, o);
await t('権利の門：VRoid の自作は確認の印で通る（注意つき）・Tripo の無料・VRM の非商用・Mixamo を Web・試験用の素材は止まる', () => {
  const ok = G.evaluate(base(), web); assert.equal(ok.result, 'pass', JSON.stringify(ok.reasons)); assert.ok(ok.warnings.some(w => w.code === 'TOOL_TERMS'));
  assert.equal(G.evaluate(base({ license: Object.assign({}, base().license, { verifiedBy: '' }) }), web).reasons[0].code, 'UNVERIFIED');
  assert.ok(G.evaluate(base({ source: { type: 'ai_generated', aiModel: 'Tripo v2.5', tool: 'tripo', plan: 'free' } }), web).reasons.some(r => r.code === 'TOOL_PLAN'));
  assert.ok(G.evaluate(base({ source: { type: 'self_made', tool: 'vroid_studio', vrmMeta: { commercialUsage: 'personalNonProfit' } } }), web).reasons.some(r => r.code === 'VRM_META_NONCOMMERCIAL'));
  assert.ok(G.evaluate(base({ category: 'animation', source: { type: 'third_party', url: 'https://www.mixamo.com/' }, anim: { quality: { human: 4 } } }), web).reasons.some(r => r.code === 'KNOWN_NO_WEB'));
  assert.ok(G.evaluate(base({ test: true }), web).reasons.some(r => r.code === 'TEST_ONLY'));
  assert.equal(G.evaluate(base({ test: true }), G.makeContext(cfg, 'shinshoku', { target: 'web', stage: 'dev' })).result, 'pass', '開発中の試しは通る');
});

console.log(`wakaba-charkit-vrm: ${n} passed${process.exitCode ? ', FAILED' : ''}`);
