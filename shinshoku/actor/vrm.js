// VRM（VRoid Studio などで作ったキャラクター）の読み込み。
// shinshoku/assets/characters/manifest.json の file に .vrm を書くと、仮のキャラクターの代わりに読み込む。
// three-vrm（@pixiv/three-vrm、MIT）は必要な時だけ読み込む（起動を軽く）。
// 姿勢は actor/anim.js の関節名（VRM の humanoid の骨の名前と同じ）で動かす。
import * as THREE from 'three';

const BASE = new URL('../assets/characters/', import.meta.url);

export async function loadManifest() {
  try { const r = await fetch(new URL('manifest.json', BASE), { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}

/**
 * VRM を読み込んで、仮のキャラクターと同じ形 { root, J, vrm } を返す。失敗したら null（仮のキャラのまま）。
 * entry = { file, scale?, rotateY? }
 */
export async function loadVRM(entry) {
  if (!entry || !entry.file) return null;
  try {
    const [{ GLTFLoader }, VRMmod] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('@pixiv/three-vrm')]);
    const loader = new GLTFLoader();
    loader.register(parser => new VRMmod.VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(new URL(entry.file, BASE).href);
    const vrm = gltf.userData.vrm; if (!vrm) return null;
    try { VRMmod.VRMUtils.removeUnnecessaryVertices(gltf.scene); VRMmod.VRMUtils.combineSkeletons ? VRMmod.VRMUtils.combineSkeletons(gltf.scene) : null; } catch (e) { /* 古い版 */ }
    // VRM0 は -z 向き。本作のキャラは +z 向き
    if (vrm.meta && vrm.meta.metaVersion === '0') VRMmod.VRMUtils.rotateVRM0(vrm);
    const root = new THREE.Group(); root.add(vrm.scene);
    if (entry.scale) vrm.scene.scale.setScalar(entry.scale);
    if (entry.rotateY) vrm.scene.rotation.y = entry.rotateY;
    vrm.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const J = {};
    const names = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
    for (const n of names) { const b = vrm.humanoid.getNormalizedBoneNode(n); if (b) J[n] = b; }
    // VRM は T ポーズが基準：腕を下ろした状態を 0 にするための補正（Poser の rest）
    const rest = { leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25] };
    return { root, J, vrm, rest, isVRM: true, height: entry.height || 1.64, provisional: !!entry.provisional };
  } catch (e) {
    console.warn('[shinshoku] VRM の読み込みに失敗。仮のキャラクターで続けます', e);
    return null;
  }
}
