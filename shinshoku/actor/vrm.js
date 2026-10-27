// 外部で作ったキャラクターの読み込み（VRM／glTF／GLB）。コードの変更なしで差し替えられる：
//   shinshoku/assets/characters/manifest.json の file に「.vrm」「.glb」「.gltf」を書く（docs/shinshoku/ASSET_IMPORT.md）。
// 読めなかったら null を返し、ゲームはコードで組んだ仮のキャラクターのまま続ける（コンソールに警告）。
// 骨の名前：VRM は humanoid の骨を使う。glTF は manifest の bones（対応表）→ よくある名前（Mixamo・Blender の Rigify 風・VRM 風）の順で探す。
// 動き：VRM は本物の動き（VRMA のクリップの組 entry.anim）＋手続きの予備（charkit/anim/clipanim.js・2026-10-17 の方針：外部のモデル＋モーキャプが本番）。
//       glTF は本作の手続きアニメ（actor/anim.js）を骨に当てる（glTF に入っているアニメーションは animations:"clips" で将来対応）。
import * as THREE from 'three';

const BASE = new URL('../assets/characters/', import.meta.url);
import { JOINT_NAMES, matchBones } from './bones.js';
import { attachRigidWeapons } from './models.js';
export { JOINT_NAMES, matchBones };

export async function loadManifest() {
  try { const r = await fetch(new URL('manifest.json', BASE), { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}
/** 会話の顔絵（manifest の portrait）。URL か null */
export function portraitURL(entry) { return entry && entry.portrait ? new URL(entry.portrait, BASE).href : null; }

/** 種類で振り分け（.vrm／.glb／.gltf）。戻り値は { root, J, rest, isExternal, height, portrait } か null */
export async function loadCharacter(entry, opt = {}) {
  if (!entry || !entry.file) return null;
  const f = String(entry.file).toLowerCase();
  if (f.endsWith('.vrm')) return loadVRM(entry, opt);
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

/**
 * VRM（0.x／1.0）：本番の道（charkit/runtime/vrmrt.js）。normalized の人型の骨に、
 *  ・手続きの姿勢（予備）：腕を下ろした休みの値を T ポーズの骨へ付け替えて当てる（Poser の tpose）。脚は歩きの係（足の IK）
 *  ・本物の動き：entry.anim（クリップの組 clips.json）があれば VRMA を読み、ClipAnimator（charkit/anim/clipanim.js）で動かす（actors.js の Player）
 *  ・武器・背中の物：手の骨・胸の骨に「差し込み口」（sockets）を作り、そこへ持たせる（entry.sockets で位置を直せる）
 * opt：{ quality:'low'|'mid'|'high'（スマホの低は輪郭線なし・テクスチャ 1024・揺れ物 30Hz） }
 */
export async function loadVRM(entry, opt = {}) {
  if (!entry || !entry.file) return null;
  try {
    const { loadVRMModel } = await import('../../charkit/runtime/vrmrt.js');
    const low = opt.quality === 'low';
    const file = low && entry.fileLow ? entry.fileLow : entry.file;
    const m = await loadVRMModel(new URL(file, BASE).href, {
      height: entry.height || 1.64, fit: entry.fit || 'bbox', scale: entry.scale, rotateY: entry.rotateY,
      shader: entry.shader || 'mtoon', outline: low ? false : entry.outline !== false, maxTex: low ? (entry.maxTexLow || 1024) : (entry.maxTex || 0), shadows: true,
      springs: entry.springs || null, lowSpec: low, toon2: entry.shader === 'toon2' ? { materials: entry.toonMaterials || {}, rim: 0.4 } : null,
    });
    if (!m) return null;
    const vrm = m.vrm, J17 = {}, Jx = {};
    for (const [k, b] of Object.entries(m.J)) (JOINT_NAMES.includes(k) ? J17 : Jx)[k] = b;
    const sockets = makeSockets(m.J, entry.sockets || {}, vrm, m.stats.metaVersion === '0');
    const model = {
      root: m.root, J: J17, Jx, vrm, rest: {}, tpose: true, vrm0: m.stats.metaVersion === '0', hipScale: 1 / (m.sceneScale || 1), isVRM: true, isExternal: true,
      height: entry.height || 1.64, provisional: !!entry.provisional, test: !!entry.test, portrait: portraitURL(entry),
      legDims: m.legDims ? scaleDims(m.legDims, m.sceneScale || 1) : null, legScale: m.legScale, sockets, springs: m.springs, stats: m.stats,
      kind: entry.kind === 'white' ? 'dannoura' : entry.kind || 'vrm', white: entry.kind === 'white', update: dt => m.update(dt),
    };
    // 武器は差し込み口へ（コードの武器の形：腕を下ろした手の向きに合わせた口）
    // P17：武器はだんのうら（紫・白い姿）だけ。相棒・娘の VRM に付けると刀・銃・鉄パイプ・火縄銃が全部手に見えていた
    if (!entry.kind || entry.kind === 'dannoura' || entry.kind === 'white') model.weapons = attachRigidWeapons(Object.assign({}, J17, { rightHand: sockets.rightHand || J17.rightHand, hips: sockets.hips || J17.hips }));
    if (entry.anim) {
      try {
        const { loadClipSet } = await import('../../charkit/runtime/vrma.js');
        const set = await loadClipSet(new URL(entry.anim, BASE).href, vrm);
        if (set.errors.length) console.warn('[shinshoku] VRMA の一部が読めません', set.errors);
        if (Object.keys(set.clips).length) {
          const { ClipAnimator } = await import('../../charkit/anim/clipanim.js');
          const scene = vrm.scene, inv = new THREE.Matrix4(), v = new THREE.Vector3();
          model.clips = set;
          model.clipAnim = new ClipAnimator(scene, m.J, set, { legDims: m.legDims, sceneScale: m.sceneScale || 1, vrm0: m.stats.metaVersion === '0', blendS: entry.blendS || 0.2, footIK: entry.footIK !== false,
            ground: () => { m.root.updateWorldMatrix(true, false); inv.copy(scene.matrixWorld).invert(); return v.setFromMatrixPosition(m.root.matrixWorld).applyMatrix4(inv).y; } });
          m.stats.clips = Object.keys(set.clips).length; m.stats.clipMs = set.ms;
        }
      } catch (e) { console.warn('[shinshoku] 動きのクリップを読めません。手続きの動きで続けます', e); }
    }
    return model;
  } catch (e) {
    console.warn('[shinshoku] VRM の読み込みに失敗。仮のキャラクターで続けます', e);
    return null;
  }
}
const scaleDims = (L, k) => { if (k === 1) return L; const o = {}; for (const [n, x] of Object.entries(L)) o[n] = typeof x === 'number' ? x * k : x; return o; };

/**
 * 差し込み口：骨の名前（人型の名前か、モデルの中の節の名前）に子の Group を作る。
 * 既定：rightHand・leftHand（腕を下ろした休みの手の向き＝コードの武器の形がそのまま合う）・back（胸）・hips。
 * def：{ 名前: { bone, pos:[x,y,z], rot:[x,y,z] } }（manifest の sockets）
 */
export function makeSockets(J, def = {}, vrm = null, vrm0 = false) {
  const find = n => J[n] || (vrm && vrm.humanoid && vrm.humanoid.getNormalizedBoneNode && vrm.humanoid.getNormalizedBoneNode(n)) || (vrm && vrm.scene.getObjectByName(n)) || null;
  const D = Object.assign({
    rightHand: { bone: 'rightHand', pos: [0, 0, 0], rot: [0, 0, -Math.PI / 2] },
    leftHand: { bone: 'leftHand', pos: [0, 0, 0], rot: [0, 0, Math.PI / 2] },
    back: { bone: J.upperChest ? 'upperChest' : 'chest', pos: [0, 0, -0.14], rot: [0, 0, 0] },
    hips: { bone: 'hips', pos: [0, 0, 0], rot: [0, 0, 0] },
  }, def);
  const out = {};
  for (const [k, d] of Object.entries(D)) {
    const b = find(d.bone); if (!b) continue;
    const g = new THREE.Group(); g.name = 'socket_' + k; g.position.set(...(d.pos || [0, 0, 0])); g.rotation.set(...(d.rot || [0, 0, 0]));
    if (vrm0 && !def[k]) { g.quaternion.x = -g.quaternion.x; g.quaternion.z = -g.quaternion.z; g.position.x = -g.position.x; g.position.z = -g.position.z; }   // VRM 0.x の normalized は 180° 回っている（実物では未確認）
    b.add(g); out[k] = g;
  }
  return out;
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

/** 敵など、同じモデルを何体も出す時の複製（glTF 推奨。VRM は 1 体用） */
let _clone = null;
export async function prepareClone() { if (!_clone) _clone = (await import('three/addons/utils/SkeletonUtils.js')).clone; return _clone; }
export function cloneCharacter(m) {
  if (!_clone || !m) return null;
  const root = _clone(m.root); const J = {};
  for (const [k, b] of Object.entries(m.J)) { const o = root.getObjectByName(b.name); if (o) J[k] = o; }
  return Object.assign({}, m, { root, J, update: null, mixer: null });
}
