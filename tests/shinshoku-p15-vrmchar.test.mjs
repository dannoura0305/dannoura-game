// 境界侵食 P15：リポジトリの中で Blender で作った VRM 1.0（だんのうら・白い姿・相棒）が本番の既定（docs/shinshoku/VROID_GUIDE.md §0・ASSET_IMPORT.md §5）。
// 確かめること：manifest の既定（file・fileLow・予備）・meta の sha256・VRM 1.0 の中身（人型の全部の骨・指・目・表情 14・視線・揺れ物の鎖と当たり・MToon・利用条件）
// ・予算（三角形・材質・テクスチャ・ファイルの大きさ）・男性の体つき（だんのうら：肩幅 > 腰幅・胸は平ら）・three-vrm で読める・VRMA の動きの組（本番・試験の印なし）
// ・権利の門（自作・商用可・リポジトリの道具で生成）・sw.js の版と振り分け。
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };
const origWarn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('VRMLookAtQuaternionProxy')) origWarn(...a); };

const THREE = await import('three');
const ROOT = new URL('../', import.meta.url);
const P = p => new URL(p, ROOT);
const buf = p => { const b = readFileSync(P(p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const readJson = p => JSON.parse(readFileSync(P(p), 'utf8'));
const { readGLB } = await import('../charkit/core/vrmwrite.js');
const { loadVRMModel } = await import('../charkit/runtime/vrmrt.js');
const { loadClipSet } = await import('../charkit/runtime/vrma.js');
const { ClipAnimator } = await import('../charkit/anim/clipanim.js');
const { evaluate, makeContext } = await import('../mapkit/assets/gate.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const stubTex = l => l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
const DIR = 'shinshoku/assets/characters/';
const man = readJson(DIR + 'manifest.json');
const CH = ['dannoura', 'dannoura_white', 'companion'];
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const REQ = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftEye', 'rightEye', 'leftShoulder', 'rightShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'];
for (const s of ['left', 'right']) for (const f of FINGERS) for (const g of f === 'Thumb' ? ['Metacarpal', 'Proximal', 'Distal'] : ['Proximal', 'Intermediate', 'Distal']) REQ.push(s + f + g);
const EXPR = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'neutral'];

// ───────── manifest・meta ─────────
await t('manifest：だんのうら・白い姿・相棒は Blender で作った VRM が既定（file・fileLow）・異形は今のまま null（予備）', () => {
  assert.ok(man.ver >= 3);
  for (const k of CH) {
    const e = man.characters[k];
    assert.ok(e && e.file === k + '.vrm' && e.fileLow === k + '_low.vrm', k);
    assert.equal(e.provisional, false); assert.ok(e.source.includes('tools/blender/char'), k); assert.ok(e.license && e.author);
    assert.equal(e.fit, 'none'); assert.ok(existsSync(P(DIR + e.file)) && existsSync(P(DIR + e.fileLow)));
  }
  assert.equal(man.characters.dannoura_white.kind, 'white');
  assert.equal(man.characters.dannoura.anim, '../anim/dannoura/clips.json');
  for (const k of ['kiro', 'heiten', 'shuuyou']) assert.equal(man.characters[k].file, null, k);
  assert.ok(man.testEntries.test.dannoura.test, '試験用の入口は残す（?vrm=test）');
});
await t('meta：sha256・三角形・出典（tools/blender/char）・利用条件（自作・商用可・verifiedBy は人が書く）', () => {
  for (const k of CH) {
    const m = readJson(DIR + k + '.meta.json');
    assert.equal(m.id, 'char.' + k); assert.equal(m.test, false);
    assert.equal(m.source.type, 'self_made'); assert.equal(m.source.generator, 'tools/blender/char/build_char.py');
    assert.equal(m.license.commercial, 'yes'); assert.equal(m.license.verifiedBy, '', 'verifiedBy は人が確かめて書く（AI は書かない）');
    assert.equal(m.files.length, 2);
    for (const f of m.files) { const b = readFileSync(P(DIR + f.file)); assert.equal(createHash('sha256').update(b).digest('hex'), f.sha256, f.file); assert.equal(b.length, f.bytes); }
  }
});

// ───────── VRM 1.0 の中身（JSON） ─────────
for (const k of CH) {
  for (const low of [false, true]) {
    const file = DIR + k + (low ? '_low' : '') + '.vrm';
    await t(`${k}${low ? '（スマホ）' : ''}：VRM 1.0・人型（指・目・肩・つま先まで）・表情 14・視線（骨）・揺れ物・MToon・利用条件・予算`, () => {
      const size = statSync(P(file)).size;
      assert.ok(size <= (low ? 2.5 : 6) * 1048576, `大きさ ${(size / 1048576).toFixed(2)}MB`);
      const { json } = readGLB(new Uint8Array(buf(file)));
      const v = json.extensions.VRMC_vrm;
      assert.equal(v.specVersion, '1.0');
      for (const b of REQ) assert.ok(v.humanoid.humanBones[b], '骨 ' + b);
      for (const e of EXPR) assert.ok(v.expressions.preset[e], '表情 ' + e);
      for (const e of ['blink', 'aa', 'happy', 'angry', 'sad', 'surprised']) if (e !== 'neutral') assert.ok(v.expressions.preset[e].morphTargetBinds && v.expressions.preset[e].morphTargetBinds.length, '表情のモーフ ' + e);
      assert.equal(v.expressions.preset.happy.overrideBlink, 'block');
      assert.equal(v.lookAt.type, 'bone'); assert.ok(v.lookAt.rangeMapHorizontalOuter.outputScale > 0);
      assert.equal(v.meta.commercialUsage, 'corporation'); assert.notEqual(v.meta.commercialUsage, 'personalNonProfit');
      assert.ok(v.meta.authors[0].includes('tools/blender/char'));
      for (const nd of json.nodes) assert.ok(!nd.rotation, '骨に回転なし（T ポーズ）：' + nd.name);
      const L = json.nodes[v.humanoid.humanBones.leftLowerArm.node]; assert.ok(L.translation[0] > 0.2, '左腕は +x（T ポーズ）');
      const sb = json.extensions.VRMC_springBone;
      assert.ok(sb && sb.springs.length >= 2 && sb.colliders.length >= 9 && sb.colliderGroups.length >= 4);
      const names = sb.springs.map(s => s.name);
      if (k === 'dannoura') for (const s of ['ponytail', 'side_L', 'side_R', 'cord_L', 'cord_R']) assert.ok(names.includes(s), s);
      if (k === 'dannoura_white') for (const s of ['tail', 'ear_L', 'ear_R', 'side_L']) assert.ok(names.includes(s), s);
      for (const s of sb.springs) assert.ok(s.joints.length >= 3 && s.joints.every(j => j.stiffness > 0), s.name);
      assert.ok(json.materials.length <= 8, '材質 ' + json.materials.length);
      assert.ok(json.materials.every(m => m.extensions && m.extensions.VRMC_materials_mtoon));
      let tris = 0; for (const me of json.meshes) for (const p of me.primitives) tris += json.accessors[p.indices].count / 3;
      assert.ok(tris <= (low ? 22000 : 44000) && tris >= (low ? 9000 : 25000), '三角形 ' + tris);
      for (const im of json.images) { const bv = json.bufferViews[im.bufferView]; assert.ok(bv.byteLength > 100); }
      const face = json.meshes.find(m => m.name === 'face');
      assert.ok(face && face.extras.targetNames.includes('blink_L') && face.extras.targetNames.includes('mouth_aa'));
    });
  }
}

// ───────── three-vrm で読む・体つき ─────────
const models = {};
for (const k of CH) models[k] = await loadVRMModel(buf(DIR + k + '.vrm'), { height: 1.64, fit: 'none', loader: stubTex });
await t('three-vrm で読める：人型の 17 本＋指・表情・揺れ物の関節・高さ（帽子と髪込み）・脚の寸法', () => {
  for (const k of CH) {
    const m = models[k];
    assert.equal(m.stats.metaVersion, '1', k);
    assert.equal(m.stats.expressions, 14, k);
    assert.ok(m.stats.springJoints >= (k === 'companion' ? 4 : 12), k + ' 揺れ物 ' + m.stats.springJoints);
    const h = m.stats.heightM, want = k === 'companion' ? 1.58 : 1.64;
    assert.ok(h > want - 0.01 && h < want + 0.09, `${k} 高さ ${h}`);
    assert.ok(m.vrm.humanoid.getNormalizedBoneNode('leftIndexProximal') && m.vrm.humanoid.getNormalizedBoneNode('rightThumbDistal'));
    const L = m.legDims; assert.ok(L.thigh > 0.35 && L.thigh < 0.45 && L.ankleY > 0.03 && L.ankleY < 0.09, JSON.stringify(L));
  }
});
function widthAt(vrm, y0, y1, maxX = 0.24) {
  let mx = 0; vrm.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  vrm.scene.traverse(o => { if (!o.isMesh || !o.material || /FACE|HAIR/.test([].concat(o.material)[0].name)) return; const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y >= y0 && v.y <= y1 && Math.abs(v.x) < maxX) mx = Math.max(mx, Math.abs(v.x)); } });
  return 2 * mx;
}
await t('男性の体つき（だんのうら・白い姿）：肩幅 > 腰幅（骨と網）・胸は平ら（胸の前の出っ張りが小さい）', () => {
  for (const k of ['dannoura', 'dannoura_white']) {
    const H = models[k].vrm.humanoid, p = n => H.getNormalizedBoneNode(n).getWorldPosition(new THREE.Vector3());
    const sh = p('leftUpperArm').distanceTo(p('rightUpperArm')), hp = p('leftUpperLeg').distanceTo(p('rightUpperLeg'));
    assert.ok(sh > hp * 1.6, `${k} 骨：肩 ${sh.toFixed(3)} 腰 ${hp.toFixed(3)}`);
    const chest = widthAt(models[k].vrm, 1.16, 1.26), hips = widthAt(models[k].vrm, 0.86, 0.94);
    assert.ok(chest > hips, `${k} 網：胸の幅 ${chest.toFixed(3)} > 腰の幅 ${hips.toFixed(3)}`);
    const mb = readJson(DIR + k + '.meta.json').body;
    assert.equal(mb.sex, 'male'); assert.ok(mb.shoulderW > mb.hipW);
  }
});
await t('白い姿：猫の耳・しっぽの骨（ext_ear・ext_tail）・スカートの形にしない（裾の広がり < 胸の幅）', () => {
  const names = []; models.dannoura_white.vrm.scene.traverse(o => names.push(o.name));
  assert.ok(names.some(x => /^ext_ear_L_01/.test(x)) && names.some(x => /^ext_tail_0[1-6]/.test(x)));
  const chest = widthAt(models.dannoura_white.vrm, 1.16, 1.26), hem = widthAt(models.dannoura_white.vrm, 0.80, 0.86);
  assert.ok(hem < chest, `裾 ${hem.toFixed(3)} < 胸 ${chest.toFixed(3)}`);
});
await t('表情：瞬きでまぶたが動く・口（aa）が開く（モーフの差が 0 でない）', () => {
  const vrm = models.dannoura.vrm, em = vrm.expressionManager;
  const face = []; vrm.scene.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'blink_L' in o.morphTargetDictionary) face.push(o); });
  assert.ok(face.length >= 1);
  em.setValue('blink', 1); em.setValue('aa', 1); em.update();
  const mi = face[0].morphTargetDictionary;
  assert.ok(face[0].morphTargetInfluences[mi.blink_L] > 0.99 && face[0].morphTargetInfluences[mi.mouth_aa] > 0.99);
  const pos = face[0].geometry.morphAttributes.position[mi.blink_L]; let mx = 0; for (let i = 0; i < pos.count; i++) mx = Math.max(mx, Math.abs(pos.getY(i)));
  assert.ok(mx > 0.005, 'まぶたの動き ' + mx);
  em.setValue('blink', 0); em.setValue('aa', 0); em.update();
});

// ───────── 動き（本番の VRMA の組） ─────────
await t('動きの組（anim/dannoura）：試験の印なし・自作の出典・Blender の VRM に当たる（ClipAnimator：待機 → 歩き）', async () => {
  const set = readJson('shinshoku/assets/anim/dannoura/clips.json');
  assert.ok(!set.test); assert.equal(set.source.type, 'self_made');
  for (const f of set.files) { const b = readFileSync(P('shinshoku/assets/anim/dannoura/' + f.file)); assert.equal(createHash('sha256').update(b).digest('hex'), f.sha256, f.file); }
  const m = models.dannoura;
  const cs = await loadClipSet(set, m.vrm, { fetchBinary: async (u, f) => buf('shinshoku/assets/anim/dannoura/' + f) });
  assert.equal(cs.errors.length, 0, JSON.stringify(cs.errors));
  assert.ok(Object.keys(cs.clips).length >= 8);
  const ca = new ClipAnimator(m.vrm.scene, m.J, cs, { legDims: m.legDims, sceneScale: 1 });
  let r = ca.update(1 / 60, { st: 'free', speed: 0, phase: 0, turn: 0 }); assert.equal(r.key, 'idle');
  for (let i = 0; i < 30; i++) r = ca.update(1 / 60, { st: 'free', speed: 2.2, phase: i * 0.1, turn: 0 });
  assert.equal(r.key, 'loco');
});

// ───────── 権利の門・sw.js ─────────
await t('権利の門：自作（リポジトリの道具）・商用可・再配布可 → web・ue5 とも pass（verifiedBy 空は注意だけ）', () => {
  const cfg = readJson('wakaba.config.json');
  for (const k of CH) {
    const meta = readJson(`wakaba-assets/entries/character/char.${k}/meta.json`);
    assert.equal(meta.category, 'character'); assert.equal(meta.license.verifiedBy, '');
    for (const target of ['web', 'ue5']) {
      const r = evaluate(meta, makeContext(cfg, 'shinshoku', { target }));
      assert.equal(r.result, 'pass', `${k} ${target} ${JSON.stringify(r.reasons)}`);
      assert.ok(r.warnings.some(w => w.code === 'UNVERIFIED_GENERATED'));
    }
  }
  const cat = readJson('wakaba-assets/catalog.json');
  for (const k of CH) assert.ok(cat.entries.find(e => e.id === 'char.' + k), '目録に char.' + k);
});
await t('sw.js：版を上げた・VRM／VRMA は素材（media）・clips.json はネット優先', async () => {
  const vm = await import('node:vm');
  const ctx = { self: { location: new URL('https://example.github.io/dannoura-game/sw.js'), addEventListener() {} }, URL, Set, Map, Promise, console, Response: class {}, Headers: class {} };
  vm.createContext(ctx); vm.runInContext(readFileSync(P('sw.js'), 'utf8') + '\n;globalThis.__sw={VERSION,kindOf};', ctx);
  const sw = ctx.__sw, k = p => sw.kindOf(new URL(p, 'https://example.github.io/dannoura-game/'));
  assert.ok(sw.VERSION >= '2026-10-31.2', sw.VERSION);
  for (const c of CH) { assert.equal(k(DIR + c + '.vrm'), 'media'); assert.equal(k(DIR + c + '_low.vrm'), 'media'); }
  assert.equal(k('shinshoku/assets/anim/dannoura/loco_walk.vrma'), 'media');
  assert.equal(k('shinshoku/assets/anim/dannoura/clips.json'), 'shell');
  assert.equal(k(DIR + 'manifest.json'), 'shell');
});
await t('作る道具が揃っている（tools/blender/char・tools/charkit/build_chars.mjs・vrm_from_pack.mjs）', () => {
  for (const f of ['tools/blender/char/build_char.py', 'tools/blender/char/sdf.py', 'tools/blender/char/head.py', 'tools/blender/char/hair.py', 'tools/blender/char/outfits.py', 'tools/blender/char/props.py',
    'tools/charkit/build_chars.mjs', 'tools/charkit/vrm_from_pack.mjs', 'tools/charkit/vrm_view.html']) assert.ok(existsSync(P(f)), f);
  const src = readFileSync(P('shinshoku/main.js'), 'utf8');
  assert.match(src, /Q\.get\('vrm'\) === '0'/, '?vrm=0 でコードの予備のキャラクター');
  assert.match(src, /dannoura_white/, '白い姿の VRM');
});

console.log(`shinshoku-p15-vrmchar: ${n} ok`);
