// VRM（0.x・1.0）の本番の読み込み（three-vrm・normalized の人型）。docs/wakaba-charkit/12「外部モデルへの切り替え」・14 §3.2。
// 作品（shinshoku/actor/vrm.js）から呼ぶ。読めなかったら null（作品はコードで組んだ予備のキャラクターのまま続ける）。
//
//  ・表情（瞬き・感情・aa/ih/ou/ee/oh）は three-vrm の expressionManager（charkit/face/driver.js の vrmFaceAdapter がつなぐ）
//  ・視線は VRM の lookAt（bone／expression のどちらでも）。VRMA の視線のため VRMLookAtQuaternionProxy を付ける
//  ・揺れ物は VRM の SpringBone（three-vrm）。VRM に揺れ物が無く opt.springs（鎖の表）がある時だけ charkit の SpringBones で代わり
//  ・材質：'mtoon'（そのまま・既定）／'toon2'（本作の段の陰影 charkit/shader/toon2.js へ変換・不透明の物だけ）／'basic'（一番軽い）
//  ・輪郭線：MToon の輪郭線は opt.outline=false で消す（スマホの低）。初めの人称：三人称のゲームなので firstPersonOnly の網は隠す
//  ・大きさ：opt.height（m）に合わせる（fit:'bbox'＝見た目の上下の幅・'none'＝作ったままの大きさ）。足を地面に
//  ・テクスチャ：opt.maxTex（px）より大きい物は縮める（スマホ）。影：castShadow／receiveShadow
import * as THREE from 'three';
import { HUMAN17 } from './tpose.js';
import { legDims as legDimsOf } from '../anim/loco.js';

let _mods = null;
/** three-vrm と GLTFLoader を必要な時に読む（起動を遅くしない） */
export async function vrmModules() {
  if (!_mods) {
    const [{ GLTFLoader }, V] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('@pixiv/three-vrm')]);
    _mods = { GLTFLoader, V };
  }
  return _mods;
}

/** 人型の 17 本（normalized）。chest が無いモデルは upperChest か spine で代わり */
export function humanoidJoints(vrm) {
  const H = vrm.humanoid, J = {};
  for (const n of HUMAN17) {
    let b = H.getNormalizedBoneNode(n);
    if (!b && n === 'chest') b = H.getNormalizedBoneNode('upperChest') || H.getNormalizedBoneNode('spine');
    if (!b && n === 'neck') b = H.getNormalizedBoneNode('head');
    if (b) J[n] = b;
  }
  for (const n of ['upperChest', 'leftShoulder', 'rightShoulder', 'leftToes', 'rightToes', 'leftEye', 'rightEye', 'jaw']) { const b = H.getNormalizedBoneNode(n); if (b) J[n] = b; }
  return J;
}

/** 脚の寸法（charkit/anim/loco.js の legDims の形）を normalized の骨から。k：縮尺（vrm.scene の大きさ） */
export function vrmLegDims(J, k = 1) {
  if (!J.hips || !J.leftUpperLeg || !J.leftLowerLeg || !J.leftFoot) return null;
  const leg = J.hips.position.y, hipDY = J.leftUpperLeg.position.y;
  const d = { leg: leg * k, hipDY: hipDY * k, thigh: J.leftLowerLeg.position.length() * k, shin: J.leftFoot.position.length() * k, hipX: Math.abs(J.leftUpperLeg.position.x) * k };
  return legDimsOf(d);
}

/** 材質の名前（VRoid の命名を含む）→ 本作の材質の種類の名前（charkit/shader/toon2.js の kindOfName へ渡す名前） */
export function classOfMaterialName(name = '') {
  const s = String(name).toLowerCase();
  if (/hair|髪/.test(s)) return 'hair';
  if (/face|顔|mouth|brow|lash/.test(s)) return 'face';
  if (/eye|iris|目/.test(s)) return 'eye';
  if (/skin|body|肌/.test(s)) return 'skin';
  if (/glass|metal|めがね/.test(s)) return 'metal';
  if (/acc|hat|ribbon|flower|帽|花/.test(s)) return 'acc';
  return 'cloth';
}

/** テクスチャを縮める（canvas がある時だけ・ブラウザ） */
function downscaleTexture(tex, maxPx, stats) {
  const img = tex && tex.image; if (!img || !maxPx || typeof document === 'undefined') return;
  const w = img.width || 0, h = img.height || 0; if (Math.max(w, h) <= maxPx) return;
  const k = maxPx / Math.max(w, h), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  tex.image = c; tex.needsUpdate = true; stats.texDownscaled++;
}

/**
 * VRM を読む。src：URL か ArrayBuffer。opt：
 *  { height（m）, fit:'bbox'|'none', scale, rotateY, shader:'mtoon'|'toon2'|'basic', outline:bool, maxTex:px, shadows:bool,
 *    springs: [{ name, bones:[骨の名前…], ... }]（VRM に揺れ物が無い時の代わり）, toon2:{ table（classTable）, materials（character.json の shader.materials）, rim, env }, loader（plugin を足す関数・試験用） }
 * 戻り値：{ root, vrm, J, legDims, legScale, sceneScale, height, update(dt), springs:{ reset() }, stats } か null
 */
export async function loadVRMModel(src, opt = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const { GLTFLoader, V } = await vrmModules();
  const loader = new GLTFLoader();
  if (opt.loader) opt.loader(loader);
  loader.register(p => new V.VRMLoaderPlugin(p));
  const gltf = typeof src === 'string' ? await loader.loadAsync(src) : await loader.parseAsync(src, opt.path || '');
  const vrm = gltf.userData.vrm; if (!vrm) return null;
  const stats = { metaVersion: vrm.meta && vrm.meta.metaVersion, tris: 0, meshes: 0, materials: 0, textures: 0, texDownscaled: 0, springJoints: 0, expressions: 0, shader: opt.shader || 'mtoon', loadMs: 0 };
  try { V.VRMUtils.removeUnnecessaryVertices(gltf.scene); if (V.VRMUtils.combineSkeletons) V.VRMUtils.combineSkeletons(gltf.scene); } catch (e) { /* 古い版 */ }
  if (vrm.meta && vrm.meta.metaVersion === '0') V.VRMUtils.rotateVRM0(vrm);   // VRM0 は -z 向き → 本作の +z 向き
  // VRMA の視線（lookAt のクリップ）のための代わりの節
  try { if (vrm.lookAt && V.VRMLookAtQuaternionProxy) { const px = new V.VRMLookAtQuaternionProxy(vrm.lookAt); px.name = 'lookAtQuaternionProxy'; vrm.scene.add(px); } } catch (e) { /* 古い版 */ }
  // 三人称：初めの人称だけの網は隠す
  try { for (const a of (vrm.firstPerson && vrm.firstPerson.meshAnnotations) || []) if (a.type === 'firstPersonOnly') for (const m of a.meshes || [a.mesh]) if (m) m.visible = false; } catch (e) { /* 無し */ }
  const root = new THREE.Group(); root.name = 'vrm_root'; root.add(vrm.scene);
  if (opt.rotateY) vrm.scene.rotation.y += opt.rotateY;
  // 材質・影・テクスチャ
  const mats = new Set(), texs = new Set();
  vrm.scene.traverse(o => {
    if (!o.isMesh) return;
    stats.meshes++; stats.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    o.castShadow = opt.shadows !== false; o.receiveShadow = opt.shadows !== false; o.frustumCulled = false;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      mats.add(m);
      for (const k of ['map', 'shadeMultiplyTexture', 'normalMap', 'emissiveMap', 'rimMultiplyTexture', 'matcapTexture', 'outlineWidthMultiplyTexture', 'shadingShiftTexture']) if (m[k] && m[k].isTexture) texs.add(m[k]);
    }
  });
  if (opt.outline === false) vrm.scene.traverse(o => { if (o.isMesh && Array.isArray(o.material)) { const keep = o.material.filter(m => !m.isOutline); if (keep.length !== o.material.length && keep.length) { o.material = keep.length === 1 ? keep[0] : keep; if (o.geometry.groups) o.geometry.clearGroups(); } } });
  stats.materials = mats.size; stats.textures = texs.size;
  for (const t of texs) downscaleTexture(t, opt.maxTex, stats);
  if (opt.shader === 'toon2' && opt.toon2) await toToon2(vrm, opt.toon2, stats);
  else if (opt.shader === 'basic') vrm.scene.traverse(o => { if (o.isMesh) { const conv = m => { const b = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, vertexColors: !!m.vertexColors, alphaTest: m.alphaTest || 0, transparent: !!m.transparent, side: m.side }); return b; }; o.material = Array.isArray(o.material) ? o.material.filter(m => !m.isOutline).map(conv) : conv(o.material); } });
  // 大きさ・足を地面へ
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene, true); const h = box.max.y - box.min.y;
  let k = 1;
  if (opt.scale && opt.scale !== 1) k = opt.scale;
  else if (opt.fit !== 'none' && opt.height && h > 0.05 && Math.abs(h - opt.height) / opt.height > 0.03) k = opt.height / h;
  if (k !== 1) vrm.scene.scale.multiplyScalar(k);
  vrm.scene.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(vrm.scene, true); vrm.scene.position.y -= b2.min.y;
  stats.heightM = +((b2.max.y - b2.min.y)).toFixed(3); stats.scale = +k.toFixed(4);
  const J = humanoidJoints(vrm);
  // 揺れ物
  let springs;
  const sbm = vrm.springBoneManager; stats.springJoints = sbm && sbm.joints ? sbm.joints.size : 0;
  stats.expressions = vrm.expressionManager ? vrm.expressionManager.expressions.length : 0;
  let charkitSprings = null;
  if (!stats.springJoints && opt.springs && opt.springs.length) {
    const { SpringBones } = await import('../motion/spring.js');
    const byName = n => { let f = null; vrm.scene.traverse(o => { if (!f && o.name === n) f = o; }); return f; };
    const chains = opt.springs.map(c => Object.assign({}, c, { bones: (c.bones || []).map(byName).filter(Boolean) })).filter(c => c.bones.length);
    if (chains.length) { charkitSprings = new SpringBones(chains, [], { hz: opt.lowSpec ? 30 : 60 }); stats.springFallback = chains.length; }
  }
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  springs = { reset() { try { if (sbm && sbm.reset) sbm.reset(); } catch (e) { /* */ } if (charkitSprings) charkitSprings.reset(); } };
  const L = vrmLegDims(J, 1);
  stats.loadMs = Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0);
  return {
    root, vrm, J, sceneScale: k, legDims: L, legScale: L ? L.thigh * k / 0.4 : 1, height: opt.height || stats.heightM, springs, stats, gltf,
    update(dt) {
      vrm.update(dt);
      if (charkitSprings) { root.updateWorldMatrix(true, false); root.matrixWorld.decompose(wp, wq, ws); charkitSprings.update(dt, wp, wq); }
    },
  };
}

/** MToon → 本作の段の陰影（toon2）。不透明・半透明でない材質だけ。顔の影は平ら（SDF は VRM の顔の形を知らないため） */
async function toToon2(vrm, cfg, stats) {
  const T2 = await import('../shader/toon2.js');
  const used = new Set();
  vrm.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && !m.isOutline) used.add(classOfMaterialName(m.name)); });
  const table = cfg.table || T2.classTable(cfg.materials || {}, [...used]);
  let n = 0, W = null;
  const white = () => { if (!W) { W = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); W.needsUpdate = true; } return W; };
  vrm.scene.traverse(o => {
    if (!o.isMesh) return;
    const list = [].concat(o.material);
    const conv = m => {
      if (!m || m.isOutline || m.transparent) return m;
      const cls = table.index(classOfMaterialName(m.name));
      const nm = T2.charMaterialV2({ table, map: m.map || white(), alphaTest: m.alphaTest || 0, rim: cfg.rim ?? 0.4, rimColor: cfg.rimColor, env: cfg.env, face: { mode: 'none' }, faceClass: cls });
      if (m.color) nm.color.copy(m.color);
      nm.vertexColors = !!m.vertexColors;
      nm.side = m.side; nm.name = m.name + '_toon2'; n++;
      return nm;
    };
    const out = list.filter(m => !(m && m.isOutline)).map(conv);
    o.material = out.length === 1 ? out[0] : out;
    if (out.length === 1 && o.geometry.groups && o.geometry.groups.length > 1) { /* 輪郭線の組だけだった */ o.geometry.clearGroups(); }
  });
  stats.toon2 = n;
}
