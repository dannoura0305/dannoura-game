// 境界侵食：利用者が自分の PC で VRoid Studio で作った VRM 1.0 への差し替え（2026-11-07）。docs/shinshoku/ASSET_IMPORT.md §6。
// だんのうら・白い姿・娘（musume）・相棒（瀬名 灯里）。tools/charkit/vroid_game.mjs で軽くした物が既定、前の Blender 製は *_bl.vrm（?vrmset=bl）。
// 確かめること：manifest（file・fileLow・sets.bl・利用条件の記録）・meta の sha256 と大きさ・VRM 1.0 の中身（人型・表情・揺れ物・MToon・WebP・利用条件の書き換え）
// ・three-vrm で読める（PC・スマホ）・VRMA の動きの組が当たる・権利の門（人が確かめるまで止まる：ゲートは緩めない）・?vrmset=bl と ?vrm=0。
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
const VG = await import('../tools/charkit/vroid_game.mjs');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
// WebP（EXT_texture_webp）とほかのテクスチャは node では読まない（代わりの空のテクスチャ）
const stubTex = l => { l.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) })); l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) })); };
const DIR = 'shinshoku/assets/characters/';
const man = readJson(DIR + 'manifest.json');
const CH = ['dannoura', 'dannoura_white', 'daughter', 'companion'];
const MB = 1048576;
const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
const REQ = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftEye', 'rightEye', 'leftShoulder', 'rightShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'];
for (const s of ['left', 'right']) for (const f of FINGERS) for (const g of f === 'Thumb' ? ['Metacarpal', 'Proximal', 'Distal'] : ['Proximal', 'Intermediate', 'Distal']) REQ.push(s + f + g);
const EXPR = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'neutral', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];

// ───────── manifest・meta ─────────
await t('manifest：4 体（だんのうら・白い姿・娘・相棒）は VRoid 製が既定・前の Blender 製は sets.bl・?vrm=0／?vrm=test は今まで通り', () => {
  for (const k of CH) {
    const e = man.characters[k];
    assert.equal(e.file, k + '.vrm'); assert.equal(e.fileLow, k + '_low.vrm'); assert.equal(e.meta, k + '.meta.json');
    assert.match(e.source, /VRoid Studio/); assert.match(e.source, /tools\/charkit\/vroid_game\.mjs/); assert.match(e.source, /models-from-pc/);
    assert.match(e.license, /VRM Public License 1\.0/); assert.match(e.license, /WAKABA Project/); assert.match(e.license, /VRoid Studio 標準パーツ＋自作/);
    assert.match(e.licenseChange, /2026-11-07 利用者の承認/); assert.match(e.author, /WAKABA Project/);
    const b = man.sets.bl[k];
    assert.equal(b.file, k + '_bl.vrm'); assert.equal(b.fileLow, k + '_bl_low.vrm'); assert.equal(b.kind, e.kind);
    for (const f of [e.file, e.fileLow, b.file, b.fileLow]) assert.ok(existsSync(P(DIR + f)), f);
  }
  assert.match(man.characters.daughter.license, /個人の非営利のみ/, '娘の元の条件（非営利のみ）を書く');
  assert.match(man.characters.companion.license, /個人の非営利のみ/, '灯里の元の条件（非営利のみ）を書く');
  assert.equal(man.characters.dannoura_white.kind, 'white'); assert.equal(man.characters.daughter.kind, 'daughter'); assert.equal(man.characters.companion.kind, 'companion');
  assert.equal(man.characters.daughter.height, 1.0); assert.equal(man.characters.dannoura.height, 1.64);
  assert.equal(man.characters.dannoura.anim, '../anim/dannoura/clips.json'); assert.equal(man.characters.companion.anim, '../anim/companion/clips.json');
  const src = readFileSync(P('shinshoku/main.js'), 'utf8');
  assert.match(src, /Q\.get\('vrm'\) === '0'/); assert.match(src, /man\.sets\[Q\.get\('vrmset'\)\]/); assert.match(src, /man\.testEntries\[Q\.get\('vrm'\)\]/);
  assert.ok(!existsSync(P('incoming')), 'PC から持ち込んだ元（incoming/）は main に入れない');
});
await t('meta：sha256・大きさ（PC 3.5MB 以下・スマホ 1.8MB 以下）・出典・利用条件の書き換えの記録・verifiedBy は空', () => {
  for (const k of CH) {
    const m = readJson(DIR + k + '.meta.json');
    assert.equal(m.id, 'char.' + k); assert.equal(m.source.generator, 'tools/charkit/vroid_game.mjs');
    assert.equal(m.license.verifiedBy, '', 'verifiedBy は人が確かめて書く（AI は書かない）'); assert.equal(m.license.redistributeRaw, 'no');
    assert.match(m.source.vrmMetaChange, /2026-11-07 利用者の承認/);
    assert.equal(m.source.vrmMeta.modification, 'allowModification'); assert.equal(m.source.vrmMeta.commercialUsage, 'corporation');
    assert.equal(m.source.vrmMetaOriginal.modification, 'prohibited');
    assert.equal(m.files.length, 2);
    for (const f of m.files) {
      const b = readFileSync(P(DIR + f.file)); assert.equal(createHash('sha256').update(b).digest('hex'), f.sha256, f.file); assert.equal(b.length, f.bytes);
      assert.ok(b.length <= (f.lod === 'low' ? 1.8 : 3.5) * MB, `${f.file} ${(b.length / MB).toFixed(2)}MB`);
    }
  }
  assert.equal(readJson(DIR + 'daughter.meta.json').source.vrmMetaOriginal.commercialUsage, 'personalNonProfit');
  assert.equal(readJson(DIR + 'companion.meta.json').source.vrmMetaOriginal.commercialUsage, 'personalNonProfit');
});

// ───────── VRM 1.0 の中身 ─────────
const J = {};
for (const k of CH) for (const low of [false, true]) J[k + (low ? '_low' : '')] = readGLB(new Uint8Array(buf(DIR + k + (low ? '_low' : '') + '.vrm'))).json;
for (const k of CH) {
  await t(`${k}：VRM 1.0・人型 54 本・表情 18・揺れ物・MToon・WebP・利用条件（作者のみ・法人可・改変可・再配布不可・クレジット必要）・PC とスマホで同じ骨と揺れ物`, () => {
    const info = readJson(DIR + k + '.meta.json').info;
    for (const low of [false, true]) {
      const json = J[k + (low ? '_low' : '')], v = json.extensions.VRMC_vrm;
      assert.equal(v.specVersion, '1.0');
      for (const b of REQ) assert.ok(v.humanoid.humanBones[b], '骨 ' + b);
      assert.equal(Object.keys(v.humanoid.humanBones).length, info.humanBones);
      for (const e of EXPR) assert.ok(v.expressions.preset[e], '表情 ' + e);
      for (const e of ['blink', 'aa', 'happy', 'angry', 'sad', 'surprised']) assert.ok(v.expressions.preset[e].morphTargetBinds.length, '表情のモーフ ' + e);
      assert.equal(v.meta.avatarPermission, 'onlyAuthor'); assert.equal(v.meta.commercialUsage, 'corporation'); assert.equal(v.meta.modification, 'allowModification');
      assert.equal(v.meta.allowRedistribution, false); assert.equal(v.meta.creditNotation, 'required'); assert.deepEqual(v.meta.authors, ['WAKABA Project']);
      assert.equal(v.meta.licenseUrl, 'https://vrm.dev/licenses/1.0/');
      const sb = json.extensions.VRMC_springBone;
      assert.equal(sb.springs.length, info.springs); assert.equal(sb.springs.reduce((s, x) => s + x.joints.length, 0), info.springJoints); assert.equal(sb.colliders.length, info.colliders);
      assert.ok(json.materials.every(m => m.extensions && m.extensions.VRMC_materials_mtoon), 'MToon');
      assert.ok(json.textures.every(x => x.extensions && x.extensions.EXT_texture_webp && x.source == null), 'WebP');
      assert.ok(json.extensionsRequired.includes('EXT_texture_webp'));
      for (const x of ['VRMC_vrm', 'VRMC_springBone', 'VRMC_materials_mtoon', 'KHR_materials_unlit', 'KHR_materials_emissive_strength']) assert.ok(json.extensionsUsed.includes(x), x);
      const th = json.images[v.meta.thumbnailImage]; assert.equal(th.mimeType, 'image/jpeg', 'サムネイルは JPEG（VRM の決まり）');
      const morphs = Math.max(...json.meshes.map(m => (m.primitives[0].targets || []).length));
      assert.equal(morphs, low ? 14 : 57, 'モーフ（スマホは表情に使う物だけ）');
      const face = json.meshes.find(m => m.extras && m.extras.targetNames && m.extras.targetNames.includes('Fcl_EYE_Close'));
      const bind = v.expressions.preset.blink.morphTargetBinds[0]; assert.equal(json.meshes[json.nodes[bind.node].mesh].extras.targetNames[bind.index], 'Fcl_EYE_Close');
      assert.ok(face);
      if (low) assert.ok(json.extensionsRequired.includes('KHR_mesh_quantization'));
      let tris = 0; for (const me of json.meshes) for (const p of me.primitives) tris += json.accessors[p.indices].count / 3;
      assert.ok(tris >= 30000 && tris <= 50000, '三角形 ' + tris);
    }
    // PC とスマホ：骨（nodes）と揺れ物は同じ
    assert.deepEqual(J[k].nodes, J[k + '_low'].nodes); assert.deepEqual(J[k].extensions.VRMC_springBone, J[k + '_low'].extensions.VRMC_springBone);
  });
}
await t('姿ごとの部品：白い姿は猫の耳・しっぽの揺れ物・娘はスカートの揺れ物・だんのうらは眼鏡と帽子', () => {
  const names = k => J[k].extensions.VRMC_springBone.springs.map(s => s.name);
  assert.ok(names('dannoura_white').includes('CatTail') && names('dannoura_white').includes('CatEar'));
  assert.ok(names('daughter').filter(x => x === 'Skirt').length >= 6);
  assert.ok(!names('dannoura').includes('CatTail'));
  assert.ok(J.dannoura.meshes.some(m => m.name === 'HQ3D_Glasses') && J.dannoura.meshes.some(m => m.name === 'HQ3D_Hat'));
  assert.equal(J.dannoura.extensions.VRMC_vrm.meta.name, 'Dannoura'); assert.equal(J.companion.extensions.VRMC_vrm.meta.name, 'Sena Akari');
});

// ───────── three-vrm で読む・動き ─────────
const models = {};
for (const k of CH) for (const low of [false, true]) models[k + (low ? '_low' : '')] = await loadVRMModel(buf(DIR + k + (low ? '_low' : '') + '.vrm'), { height: man.characters[k].height, fit: 'none', loader: stubTex });
await t('three-vrm で読める（PC・スマホ）：表情 18・揺れ物の関節・高さ・脚の寸法・スマホも同じ高さ（量子化した法線・UV・重み）', () => {
  const H = { dannoura: [1.62, 1.72], dannoura_white: [1.6, 1.7], daughter: [0.95, 1.05], companion: [1.53, 1.63] };
  for (const k of CH) for (const low of [false, true]) {
    const m = models[k + (low ? '_low' : '')]; assert.ok(m, k);
    assert.equal(m.stats.metaVersion, '1'); assert.equal(m.stats.expressions, 18, k);
    assert.ok(m.stats.springJoints >= 40, k + ' 揺れ物 ' + m.stats.springJoints);
    assert.ok(m.stats.heightM > H[k][0] && m.stats.heightM < H[k][1], `${k} 高さ ${m.stats.heightM}`);
    const L = m.legDims; assert.ok(L.thigh > (k === 'daughter' ? 0.15 : 0.33) && L.ankleY > 0.03 && L.ankleY < 0.12, k + JSON.stringify(L));
  }
  for (const k of CH) assert.equal(models[k].stats.heightM, models[k + '_low'].stats.heightM, k + '：PC とスマホで高さが同じ');
});
await t('表情：瞬き・口・感情で顔のモーフが動く（PC・スマホ）', () => {
  for (const k of ['dannoura', 'dannoura_low', 'daughter_low']) {
    const vrm = models[k].vrm, em = vrm.expressionManager;
    for (const e of ['blink', 'aa', 'happy', 'angry']) {
      em.setValue(e, 1); em.update(); let mx = 0; vrm.scene.traverse(o => { if (o.morphTargetInfluences) for (const x of o.morphTargetInfluences) mx = Math.max(mx, x); });
      assert.ok(mx > 0.99, k + ' ' + e); em.setValue(e, 0); em.update();
    }
  }
});
await t('男性の体つき（だんのうら・白い姿）：肩幅 > 腰幅（骨）・娘は 100cm', () => {
  for (const k of ['dannoura', 'dannoura_white']) {
    const Hm = models[k].vrm.humanoid, p = nm => Hm.getNormalizedBoneNode(nm).getWorldPosition(new THREE.Vector3());
    assert.ok(p('leftUpperArm').distanceTo(p('rightUpperArm')) > p('leftUpperLeg').distanceTo(p('rightUpperLeg')) * 1.2, k);
    assert.equal(readJson(DIR + k + '.meta.json').body.sex, 'male');
  }
  assert.ok(Math.abs(models.daughter.stats.heightM - 1.0) < 0.02);
});
await t('動きの組：だんのうらの VRMA（待機・歩き・刀・ひるみ）と相棒の VRMA が VRoid 製に当たる（ClipAnimator：待機 → 歩き）', async () => {
  for (const [k, a] of [['dannoura', 'dannoura'], ['dannoura_white', 'dannoura'], ['companion', 'companion'], ['dannoura_low', 'dannoura']]) {
    const set = readJson(`shinshoku/assets/anim/${a}/clips.json`), m = models[k];
    const cs = await loadClipSet(set, m.vrm, { fetchBinary: async (u, f) => buf(`shinshoku/assets/anim/${a}/` + f) });
    assert.equal(cs.errors.length, 0, JSON.stringify(cs.errors));
    if (a === 'dannoura') for (const id of ['idle', 'loco.walk', 'cmb_katana_light_1', 'react_hit_front']) assert.ok(cs.clips[id], id);
    // 歩幅の倍率（このモデルの腰の高さ ÷ 動きを録った腰の高さ）で足の滑りを抑える
    const w = cs.clips['loco.walk'].meta; assert.ok(w.strideScale > 0.8 && w.strideScale < 1.3, k + ' strideScale ' + w.strideScale);
    const ca = new ClipAnimator(m.vrm.scene, m.J, cs, { legDims: m.legDims, sceneScale: 1 });
    let r = ca.update(1 / 60, { st: 'free', speed: 0, phase: 0, turn: 0 }); assert.equal(r.key, 'idle');
    for (let i = 0; i < 30; i++) r = ca.update(1 / 60, { st: 'free', speed: 2.2, phase: i * 0.1, turn: 0 });
    assert.equal(r.key, 'loco');
  }
});

await t('足の固定（P18 と同じ測り方・manifest の strideK）：VRoid 製の歩き 2.2m/s の滑り ≤1.4cm/s（Blender 製は 0.4〜0.7）・走りも固定なしより小さい・床に入らない（だんのうら・白い姿・相棒）', async () => {
  const MET = await import('../charkit/anim/metrics.js');
  for (const [k, a] of [['dannoura', 'dannoura'], ['dannoura_white', 'dannoura'], ['companion', 'companion']]) {
    const m = models[k], set = readJson(`shinshoku/assets/anim/${a}/clips.json`);
    const cs = await loadClipSet(set, m.vrm, { fetchBinary: async (u, f) => buf(`shinshoku/assets/anim/${a}/` + f) });
    const holder = new THREE.Group(); holder.add(m.vrm.scene); const L = m.legDims;
    const v0 = 2.2, v1 = 3.4;
    const run = (ik, v) => {
      const A = new ClipAnimator(m.vrm.scene, m.J, cs, { legDims: L, footIK: ik, sceneScale: 1, ground: () => 0, strideK: man.characters[k].strideK });
      holder.position.set(0, 0, 0); let ph = 0; const tr = { lh: [], lt: [], rh: [], rt: [] };
      for (let i = 0; i < 240; i++) {
        const dz = v / 60; holder.position.z += dz; holder.updateMatrixWorld(true); ph += dz * A.phaseRate(v);
        A.update(1 / 60, { st: 'free', f: 0, speed: v, phase: ph, weapon: 'none' }); m.vrm.scene.updateMatrixWorld(true);
        if (i < 40) continue;
        for (const sd of ['left', 'right']) {
          const F = m.J[sd + 'Foot'], c = sd[0];
          const h = new THREE.Vector3(0, -L.ankleY, -L.heel).applyMatrix4(F.matrixWorld), b = new THREE.Vector3(0, -L.ankleY, L.ball).applyMatrix4(F.matrixWorld);
          tr[c + 'h'].push([i / 60, h.x, h.y, h.z]); tr[c + 't'].push([i / 60, b.x, b.y, b.z]);
        }
      }
      const r = MET.footSlide(tr); return { mean: r.meanCmS, pen: r.maxPenCm, n: r.contactFrames };
    };
    const walk = run(true, v0), walkOff = run(false, v0), jog = run(true, v1), jogOff = run(false, v1);
    console.log(`    ${k}：歩き ${v0}m/s 固定なし ${walkOff.mean.toFixed(2)} → 固定 ${walk.mean.toFixed(2)}cm/s（着いたこま ${walk.n}・床へ ${walk.pen.toFixed(2)}cm）・走り ${v1}m/s ${jogOff.mean.toFixed(2)} → ${jog.mean.toFixed(2)}cm/s`);
    assert.ok(walk.mean <= 1.4, k + ' 歩き ' + walk.mean); assert.ok(walk.n > 200, k + ' 足が床に着いている ' + walk.n);
    assert.ok(jog.mean <= jogOff.mean, k + ' 走り'); assert.ok(walk.pen < 1 && jog.pen < 1, k + ' 床に入らない');
    holder.remove(m.vrm.scene);
  }
});

// ───────── 権利の門 ─────────
await t('権利の門：VRoid 製は人が確かめる（verifiedBy）まで web・ue5 とも block（UNVERIFIED・web は NO_WEB_REDIST）── ゲートは緩めない。非営利の止め（VRM_META_NONCOMMERCIAL）は書き換えで出ない・Blender 製は pass', () => {
  const cfg = readJson('wakaba.config.json'), cat = readJson('wakaba-assets/catalog.json');
  for (const k of CH) {
    const meta = readJson(`wakaba-assets/entries/character/char.${k}/meta.json`);
    assert.equal(meta.license.verifiedBy, ''); assert.equal(meta.license.redistributeRaw, 'no'); assert.equal(meta.source.gameBuild, 'tools/charkit/vroid_game.mjs');
    const web = evaluate(meta, makeContext(cfg, 'shinshoku', { target: 'web' })), ue5 = evaluate(meta, makeContext(cfg, 'shinshoku', { target: 'ue5' }));
    assert.equal(web.result, 'block'); assert.deepEqual(web.reasons.map(r => r.code).sort(), ['NO_WEB_REDIST', 'UNVERIFIED']);
    assert.equal(ue5.result, 'block'); assert.deepEqual(ue5.reasons.map(r => r.code), ['UNVERIFIED']);
    const e = cat.entries.find(x => x.id === 'char.' + k); assert.ok(e, '目録に char.' + k); assert.equal(e.targets.web.result, 'block');
    const bl = cat.entries.find(x => x.id === 'char.' + k + '_bl'); assert.ok(bl && bl.targets.web.result === 'pass', 'char.' + k + '_bl');
  }
});

// ───────── 作る道具 ─────────
await t('作る道具（tools/charkit/vroid_game.mjs・vroid_tex.py）：拡張の突き合わせ（check）・承認した利用条件・使わないモーフの省き方', () => {
  assert.ok(existsSync(P('tools/charkit/vroid_tex.py')));
  assert.deepEqual(VG.META_APPROVED, { avatarPermission: 'onlyAuthor', commercialUsage: 'corporation', modification: 'allowModification', allowRedistribution: false, creditNotation: 'required' });
  assert.deepEqual(Object.keys(VG.SOURCES), CH); assert.equal(VG.SOURCES.daughter.src, 'musume/model/musume.vrm'); assert.equal(VG.SOURCES.companion.src, 'akari/model/akari.vrm');
  // PC 版を「元」として、スマホ版と同じ省き方を当てると、表情の割り当てが同じ名前を指す
  const pc = JSON.parse(JSON.stringify(J.dannoura)); const keep = VG.pruneMorphs(pc);
  assert.equal([...keep.values()][0].length, 14);
  assert.deepEqual(pc.extensions.VRMC_vrm.expressions, J.dannoura_low.extensions.VRMC_vrm.expressions);
  // check は拡張の違いを見つける
  const a = J.dannoura, b = JSON.parse(JSON.stringify(J.dannoura)); b.extensions.VRMC_springBone.springs.pop();
  const aa = JSON.parse(JSON.stringify(a)); aa.textures = aa.textures.map(x => ({ sampler: x.sampler, source: x.extensions.EXT_texture_webp.source }));
  assert.throws(() => VG.check(aa, b), /VRMC_springBone/);
  assert.ok(VG.check(aa, a));
});

console.log(`shinshoku-vroid: ${n} ok`);
