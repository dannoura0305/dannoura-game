// glTF／GLB／VRM の JSON の部分だけを読む（three.js なし・検査用）。純粋関数（DataView・TextDecoder だけ）。
// 本当の読み込み（網・骨・クリップ）は shinshoku/actor/vrm.js（将来は charkit/runtime/load.js）の three.js の GLTFLoader。

/** .gltf（JSON の文字列）か .glb／.vrm（バイナリ）の中身から glTF の JSON を取り出す */
export function readGltfJson(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (u8.length >= 20 && dv.getUint32(0, true) === 0x46546c67) {   // 'glTF'
    const len = dv.getUint32(12, true), type = dv.getUint32(16, true);
    if (type !== 0x4e4f534a) throw new Error('GLB の最初のかたまりが JSON ではありません');
    return JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + len)));
  }
  return JSON.parse(new TextDecoder().decode(u8));
}

/** 骨の名前の一覧（skins の joints。皮が無ければ名前のある全部のノード） */
export function boneNames(json) {
  const nodes = json.nodes || [];
  const joints = new Set((json.skins || []).flatMap(s => s.joints || []));
  const idx = joints.size ? [...joints] : nodes.map((_, i) => i);
  return idx.map(i => nodes[i] && nodes[i].name).filter(Boolean);
}

/** VRM 1.0（VRMC_vrm）／VRM 0.x（VRM）の humanoid の表 → { vrm 名: ノードの名前 }。VRM でなければ null */
export function vrmHumanBones(json) {
  const nodes = json.nodes || [], ext = json.extensions || {};
  if (ext.VRMC_vrm && ext.VRMC_vrm.humanoid) {
    const out = {}; for (const [k, v] of Object.entries(ext.VRMC_vrm.humanoid.humanBones || {})) if (nodes[v.node]) out[k] = nodes[v.node].name; return out;
  }
  if (ext.VRM && ext.VRM.humanoid) {
    const out = {}; for (const b of ext.VRM.humanoid.humanBones || []) if (nodes[b.node]) out[b.bone] = nodes[b.node].name; return out;
  }
  return null;
}

/** 形の検査（参照の範囲・数）。gltf-validator の代わりではなく、試験用の生成物の自己検査用。{ errors: [文] } */
export function checkStructure(json) {
  const errors = [];
  const n = k => (json[k] || []).length;
  if (!json.asset || json.asset.version !== '2.0') errors.push('asset.version が 2.0 ではありません');
  const ref = (what, i, k) => { if (!(Number.isInteger(i) && i >= 0 && i < n(k))) errors.push(`${what} が ${k}[${i}] を指していますが範囲外`); };
  (json.scenes || []).forEach((s, si) => (s.nodes || []).forEach(i => ref(`scenes[${si}]`, i, 'nodes')));
  (json.nodes || []).forEach((nd, ni) => { (nd.children || []).forEach(i => ref(`nodes[${ni}].children`, i, 'nodes')); if ('mesh' in nd) ref(`nodes[${ni}].mesh`, nd.mesh, 'meshes'); if ('skin' in nd) ref(`nodes[${ni}].skin`, nd.skin, 'skins'); });
  (json.skins || []).forEach((s, si) => { (s.joints || []).forEach(i => ref(`skins[${si}].joints`, i, 'nodes')); if ('inverseBindMatrices' in s) { ref(`skins[${si}].inverseBindMatrices`, s.inverseBindMatrices, 'accessors'); const a = (json.accessors || [])[s.inverseBindMatrices]; if (a && a.count !== s.joints.length) errors.push(`skins[${si}] の逆バインド行列の数 ${a.count} と骨の数 ${s.joints.length} が違う`); } });
  (json.accessors || []).forEach((a, ai) => { ref(`accessors[${ai}].bufferView`, a.bufferView, 'bufferViews'); const bv = (json.bufferViews || [])[a.bufferView]; const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type] * ({ 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType] || 0); if (bv && (a.byteOffset || 0) + a.count * size > bv.byteLength) errors.push(`accessors[${ai}] が bufferView の外まで読みます`); });
  (json.bufferViews || []).forEach((v, vi) => { ref(`bufferViews[${vi}].buffer`, v.buffer, 'buffers'); const b = (json.buffers || [])[v.buffer]; if (b && v.byteOffset + v.byteLength > b.byteLength) errors.push(`bufferViews[${vi}] がバッファの外`); });
  (json.animations || []).forEach((an, ai) => {
    (an.channels || []).forEach((c, ci) => { ref(`animations[${ai}].channels[${ci}].target.node`, c.target.node, 'nodes'); if (!(c.sampler >= 0 && c.sampler < (an.samplers || []).length)) errors.push(`animations[${ai}].channels[${ci}] の sampler が範囲外`); });
    (an.samplers || []).forEach((s, si) => { ref(`animations[${ai}].samplers[${si}].input`, s.input, 'accessors'); ref(`animations[${ai}].samplers[${si}].output`, s.output, 'accessors'); const i = (json.accessors || [])[s.input]; if (i && !(i.min && i.max)) errors.push(`animations[${ai}].samplers[${si}] の input に min/max が要ります`); });
  });
  return { errors };
}
