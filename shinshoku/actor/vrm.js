// 外部で作ったキャラクターの読み込み（VRM／glTF／GLB）。コードの変更なしで差し替えられる：
//   shinshoku/assets/characters/manifest.json の file に「.vrm」「.glb」「.gltf」を書く（docs/shinshoku/ASSET_IMPORT.md）。
// 読めなかったら null を返し、ゲームはコードで組んだ仮のキャラクターのまま続ける（コンソールに警告）。
// 骨の名前：VRM は humanoid の骨を使う。glTF は manifest の bones（対応表）→ よくある名前（Mixamo・Blender の Rigify 風・VRM 風）の順で探す。
// 動き：本作の手続きアニメ（actor/anim.js）を骨に当てる。glTF に入っているアニメーションは使わない（animations:"clips" で将来対応）。
import * as THREE from 'three';

const BASE = new URL('../assets/characters/', import.meta.url);
export const JOINT_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];

export async function loadManifest() {
  try { const r = await fetch(new URL('manifest.json', BASE), { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}
/** 会話の顔絵（manifest の portrait）。URL か null */
export function portraitURL(entry) { return entry && entry.portrait ? new URL(entry.portrait, BASE).href : null; }

/** よくある骨の名前の候補（小文字・記号を除いて比べる） */
const ALIASES = {
  hips: ['hips', 'pelvis', 'mixamorighips', 'hip', 'root_hips', 'jbipchips', 'cc_base_hip'],
  spine: ['spine', 'mixamorigspine', 'spine1', 'spine01', 'jbipcspine'],
  chest: ['chest', 'upperchest', 'mixamorigspine2', 'mixamorigspine1', 'spine2', 'spine03', 'spine02', 'jbipcchest'],
  neck: ['neck', 'mixamorigneck', 'neck01', 'jbipcneck'],
  head: ['head', 'mixamorighead', 'jbipchead'],
  leftUpperArm: ['leftupperarm', 'mixamorigleftarm', 'upperarml', 'upperarmleft', 'larm', 'leftarm', 'jbiplupperarm', 'upper_arml'],
  leftLowerArm: ['leftlowerarm', 'mixamorigleftforearm', 'forearml', 'lowerarml', 'leftforearm', 'jbipllowerarm'],
  leftHand: ['lefthand', 'mixamoriglefthand', 'handl', 'jbiplhand'],
  rightUpperArm: ['rightupperarm', 'mixamorigrightarm', 'upperarmr', 'upperarmright', 'rarm', 'rightarm', 'jbipr upperarm', 'jbiprupperarm', 'upper_armr'],
  rightLowerArm: ['rightlowerarm', 'mixamorigrightforearm', 'forearmr', 'lowerarmr', 'rightforearm', 'jbiprlowerarm'],
  rightHand: ['righthand', 'mixamorigrighthand', 'handr', 'jbiprhand'],
  leftUpperLeg: ['leftupperleg', 'mixamorigleftupleg', 'thighl', 'upperlegl', 'leftupleg', 'leftthigh', 'jbiplupperleg'],
  leftLowerLeg: ['leftlowerleg', 'mixamorigleftleg', 'shinl', 'calfl', 'lowerlegl', 'leftleg', 'leftcalf', 'jbipllowerleg'],
  leftFoot: ['leftfoot', 'mixamorigleftfoot', 'footl', 'jbiplfoot'],
  rightUpperLeg: ['rightupperleg', 'mixamorigrightupleg', 'thighr', 'upperlegr', 'rightupleg', 'rightthigh', 'jbiprupperleg'],
  rightLowerLeg: ['rightlowerleg', 'mixamorigrightleg', 'shinr', 'calfr', 'lowerlegr', 'rightleg', 'rightcalf', 'jbiprlowerleg'],
  rightFoot: ['rightfoot', 'mixamorigrightfoot', 'footr', 'jbiprfoot'],
};
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
/** glTF の骨の対応を探す（テスト用に純粋関数）。names：骨の名前の一覧、map：manifest の対応表 */
export function matchBones(names, map = {}) {
  const out = {}, byNorm = new Map(names.map(n => [norm(n), n]));
  for (const j of JOINT_NAMES) {
    if (map[j] && names.includes(map[j])) { out[j] = map[j]; continue; }
    for (const a of ALIASES[j]) { const hit = byNorm.get(norm(a)); if (hit) { out[j] = hit; break; } }
  }
  if (!out.chest && out.spine) out.chest = out.spine;
  return out;
}

/** 種類で振り分け（.vrm／.glb／.gltf）。戻り値は { root, J, rest, isExternal, height, portrait } か null */
export async function loadCharacter(entry) {
  if (!entry || !entry.file) return null;
  const f = String(entry.file).toLowerCase();
  if (f.endsWith('.vrm')) return loadVRM(entry);
  if (f.endsWith('.glb') || f.endsWith('.gltf')) return loadGLTF(entry);
  console.warn('[shinshoku] 対応していない形式：', entry.file, '（.vrm／.glb／.gltf）');
  return null;
}

/** 大きさを合わせる：entry.height（m）があれば全体の高さをそれに。無ければ scale */
function fitHeight(obj, entry, defH) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj); const h = box.max.y - box.min.y;
  const want = entry.height || defH;
  if (entry.scale && entry.scale !== 1) obj.scale.multiplyScalar(entry.scale);
  else if (want && h > 0.05 && Math.abs(h - want) / want > 0.03) obj.scale.multiplyScalar(want / h);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;   // 足を地面へ
}

export async function loadVRM(entry) {
  if (!entry || !entry.file) return null;
  try {
    const [{ GLTFLoader }, VRMmod] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('@pixiv/three-vrm')]);
    const loader = new GLTFLoader();
    loader.register(parser => new VRMmod.VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(new URL(entry.file, BASE).href);
    const vrm = gltf.userData.vrm; if (!vrm) return null;
    try { VRMmod.VRMUtils.removeUnnecessaryVertices(gltf.scene); if (VRMmod.VRMUtils.combineSkeletons) VRMmod.VRMUtils.combineSkeletons(gltf.scene); } catch (e) { /* 古い版 */ }
    if (vrm.meta && vrm.meta.metaVersion === '0') VRMmod.VRMUtils.rotateVRM0(vrm);   // VRM0 は -z 向き。本作は +z 向き
    const root = new THREE.Group(); root.add(vrm.scene);
    if (entry.rotateY) vrm.scene.rotation.y = entry.rotateY;
    if (entry.scale && entry.scale !== 1) vrm.scene.scale.setScalar(entry.scale);
    vrm.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const J = {};
    for (const n of JOINT_NAMES) { const b = vrm.humanoid.getNormalizedBoneNode(n) || (n === 'chest' ? vrm.humanoid.getNormalizedBoneNode('spine') : null); if (b) J[n] = b; }
    const rest = { leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25] };   // T ポーズの腕を下ろす
    return { root, J, vrm, rest, isVRM: true, isExternal: true, height: entry.height || 1.64, provisional: !!entry.provisional, portrait: portraitURL(entry), update: dt => vrm.update(dt) };
  } catch (e) {
    console.warn('[shinshoku] VRM の読み込みに失敗。仮のキャラクターで続けます', e);
    return null;
  }
}

/**
 * glTF／GLB。人型の骨がある前提（無ければ骨なしの置物として表示し、動きは向きと位置だけ）。
 * 骨の休みの姿勢：T ポーズ／A ポーズのどちらでもよい（manifest の restPose:"T"|"A"|"down" で腕の補正を変える。既定は自動）。
 */
export async function loadGLTF(entry) {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(new URL(entry.file, BASE).href);
    const scene = gltf.scene;
    const root = new THREE.Group(); const holder = new THREE.Group(); holder.add(scene); root.add(holder);
    if (entry.rotateY) holder.rotation.y = entry.rotateY;
    scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material && o.material.isMeshStandardMaterial && entry.toon !== false) { /* 本作の見た目に寄せる：金属感を消す */ o.material.metalness = 0; o.material.roughness = Math.max(0.6, o.material.roughness); } } });
    fitHeight(holder, entry, entry.height);
    const bones = []; scene.traverse(o => { if (o.isBone || o.type === 'Bone') bones.push(o); });
    if (!bones.length) scene.traverse(o => { if (o.name && !o.isMesh) bones.push(o); });
    const names = bones.map(b => b.name);
    const map = matchBones(names, entry.bones || {});
    const J = {};
    // 骨の今の回転（休みの姿勢）を基準にする：Poser は rest に足すので、元の回転を保つため別の子に包まずに「差分」で当てる
    for (const [j, n] of Object.entries(map)) { const b = bones.find(x => x.name === n); if (b) J[j] = b; }
    const found = Object.keys(J).length;
    if (found < 10) console.warn('[shinshoku] glTF の人型の骨が足りません（' + found + '/17）。manifest の bones で対応表を書いてください', names.slice(0, 40));
    // 休みの姿勢の回転を覚え、Poser の rest として使う（[x,y,z] オイラー）
    const rest = {};
    for (const [j, b] of Object.entries(J)) { const e = new THREE.Euler().setFromQuaternion(b.quaternion, 'YXZ'); rest[j] = [e.x, e.y, e.z]; }
    const pose = entry.restPose || 'auto';
    const tpose = pose === 'T' || (pose === 'auto' && J.leftUpperArm && J.leftHand && Math.abs(worldDir(J.leftUpperArm, J.leftLowerArm).y) < 0.5);
    if (tpose) { rest.leftUpperArm = add3(rest.leftUpperArm, [0, 0, -1.25]); rest.rightUpperArm = add3(rest.rightUpperArm, [0, 0, 1.25]); }
    const mixer = gltf.animations && gltf.animations.length && entry.animations === 'clips' ? new THREE.AnimationMixer(scene) : null;
    return { root, J, rest, isGLTF: true, isExternal: true, height: entry.height || 1.64, provisional: !!entry.provisional, portrait: portraitURL(entry), mixer, clips: gltf.animations || [], bonesFound: found, update: mixer ? dt => mixer.update(dt) : null };
  } catch (e) {
    console.warn('[shinshoku] glTF の読み込みに失敗。仮のキャラクターで続けます', e);
    return null;
  }
}
function worldDir(a, b) { const p = new THREE.Vector3(), q = new THREE.Vector3(); a.getWorldPosition(p); b.getWorldPosition(q); return q.sub(p).normalize(); }
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
