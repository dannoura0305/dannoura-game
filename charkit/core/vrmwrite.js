// glTF（GLB）・VRM 1.0・VRMA 1.0 を書く小さな道具（純粋：DOM も three も使わない）。docs/wakaba-charkit/12「外部モデルへの切り替え」。
// 用途は**配管の試験**：コードで組んだだんのうらを VRM 1.0 に書き出し（試験用・本番の絵ではない）、手続きの動きを VRMA に書き出して、
// three-vrm／three-vrm-animation の読み込み・表情・視線・揺れ物・クリップの再生の道を確かめる（tools/charkit/export_test_vrm.mjs）。
// 本番のモデルは VRoid Studio などで作る（docs/shinshoku/VROID_GUIDE.md）。この書き手は VRM の全部の機能は書かない（必要な物だけ）。
//
// 形の約束（VRM 1.0）：+Z が前・Y が上・m。骨は休みの姿勢で回転なし（T ポーズ）。humanoid は VRM 1.0 の骨の名前。

const CT = { Float32Array: 5126, Uint32Array: 5125, Uint16Array: 5123, Uint8Array: 5121, Int16Array: 5122, Int8Array: 5120 };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const pad4 = n => (n + 3) & ~3;

/** glTF の JSON と 1 本のバイナリを組み立てる */
export class GLTFBuilder {
  constructor(generator = 'wakaba charkit vrmwrite/1') {
    this.json = { asset: { version: '2.0', generator }, scene: 0, scenes: [{ nodes: [] }], nodes: [], buffers: [], bufferViews: [], accessors: [] };
    this.parts = []; this.length = 0;
  }
  arr(key) { return this.json[key] || (this.json[key] = []); }
  useExt(name, required = false) { const u = this.arr('extensionsUsed'); if (!u.includes(name)) u.push(name); if (required) { const r = this.arr('extensionsRequired'); if (!r.includes(name)) r.push(name); } }
  /** バイト列を bufferView に（4 バイト境界） */
  view(bytes, target) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const off = this.length; this.parts.push({ off, u8 }); this.length = pad4(off + u8.byteLength);
    const v = { buffer: 0, byteOffset: off, byteLength: u8.byteLength }; if (target) v.target = target;
    this.json.bufferViews.push(v); return this.json.bufferViews.length - 1;
  }
  /** 型つき配列 → accessor。type：'SCALAR'|'VEC2'|'VEC3'|'VEC4'|'MAT4'。opt：{ target, normalized, minmax } */
  accessor(ta, type, opt = {}) {
    const ct = CT[ta.constructor.name]; if (!ct) throw new Error('vrmwrite: 型が未対応 ' + ta.constructor.name);
    const n = NCOMP[type], count = ta.length / n;
    if (!Number.isInteger(count)) throw new Error('vrmwrite: 要素の数が型と合わない');
    const a = { bufferView: this.view(ta, opt.target), componentType: ct, count, type };
    if (opt.normalized) a.normalized = true;
    if (opt.minmax) {
      const mn = new Array(n).fill(Infinity), mx = new Array(n).fill(-Infinity);
      for (let i = 0; i < count; i++) for (let k = 0; k < n; k++) { const x = ta[i * n + k]; if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x; }
      a.min = count ? mn : new Array(n).fill(0); a.max = count ? mx : new Array(n).fill(0);
    }
    this.json.accessors.push(a); return this.json.accessors.length - 1;
  }
  image(bytes, mimeType = 'image/png') { const bv = this.view(bytes); this.arr('images').push({ bufferView: bv, mimeType }); return this.json.images.length - 1; }
  texture(image, sampler = { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }) {
    const s = this.arr('samplers'); s.push(sampler); this.arr('textures').push({ source: image, sampler: s.length - 1 }); return this.json.textures.length - 1;
  }
  node(n) { this.json.nodes.push(n); return this.json.nodes.length - 1; }
  /** GLB（バイナリ glTF）にする */
  glb() {
    const bin = new Uint8Array(this.length); for (const p of this.parts) bin.set(p.u8, p.off);
    this.json.buffers = [{ byteLength: bin.byteLength }];
    const enc = new TextEncoder(); let js = enc.encode(JSON.stringify(this.json));
    const jl = pad4(js.byteLength); const jsonChunk = new Uint8Array(jl).fill(0x20); jsonChunk.set(js);
    const total = 12 + 8 + jl + 8 + bin.byteLength;
    const out = new Uint8Array(total); const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
    dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jsonChunk, 20);
    const o2 = 20 + jl; dv.setUint32(o2, bin.byteLength, true); dv.setUint32(o2 + 4, 0x004E4942, true); out.set(bin, o2 + 8);
    return out;
  }
}

/** GLB を読む（試験・検査用）：{ json, bin } */
export function readGLB(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB ではない');
  const jl = dv.getUint32(12, true); const json = JSON.parse(new TextDecoder().decode(u8.subarray(20, 20 + jl)));
  const o2 = 20 + jl; const bl = o2 < u8.byteLength ? dv.getUint32(o2, true) : 0;
  return { json, bin: bl ? u8.subarray(o2 + 8, o2 + 8 + bl) : null };
}

/** 休みの姿勢の骨（回転なし）の逆の結びの行列（列優先） */
function invBind(world) { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; m[12] = -world[0]; m[13] = -world[1]; m[14] = -world[2]; return m; }

/**
 * 骨の木を node にする。bones：[{ name, parent（番号 or -1）, pos:[x,y,z]（親の中の位置） }]（親が先）。
 * 戻り値：{ nodeOf: 骨の番号 → node の番号, world: 骨の番号 → 世界の位置, roots }
 */
function addBones(B, bones) {
  const nodeOf = [], world = [], roots = [];
  bones.forEach((b, i) => {
    const n = { name: b.name, translation: b.pos.map(x => +x.toFixed(6)) };
    nodeOf[i] = B.node(n);
    const pw = b.parent >= 0 ? world[b.parent] : [0, 0, 0];
    world[i] = [pw[0] + b.pos[0], pw[1] + b.pos[1], pw[2] + b.pos[2]];
    if (b.parent >= 0) { const p = B.json.nodes[nodeOf[b.parent]]; (p.children || (p.children = [])).push(nodeOf[i]); }
    else roots.push(nodeOf[i]);
  });
  return { nodeOf, world, roots };
}

const VRM_META_DEFAULT = {
  name: 'untitled', version: '0', authors: ['unknown'], copyrightInformation: '', contactInformation: '', references: [],
  licenseUrl: 'https://vrm.dev/licenses/1.0/', avatarPermission: 'onlyAuthor', allowExcessivelyViolentUsage: false, allowExcessivelySexualUsage: false,
  commercialUsage: 'personalNonProfit', allowPoliticalOrReligiousUsage: false, allowAntisocialOrHateUsage: false, creditNotation: 'required',
  allowRedistribution: false, modification: 'prohibited',
};

/**
 * VRM 1.0 を作る。
 * o = {
 *   meta: { name, version, authors, ... }（VRMC_vrm.meta）,
 *   bones: [{ name, parent, pos }], humanBones: { hips: 骨の番号, ... },
 *   materials: [{ name, color:[r,g,b,a], texture?: 画像の番号, alphaMode?, alphaCutoff?, doubleSided?, mtoon?: {...VRMC_materials_mtoon の値} }],
 *   images: [Uint8Array(PNG)],
 *   meshes: [{ name, primitives: [{ position: F32, normal?: F32, color?: F32|U8(VEC3/4), uv?: F32, joints: U8|U16 (VEC4・骨の番号), weights: F32(VEC4), index: U16|U32, material, targets?: [{ name, position: F32(差分), normal?: F32 }] }] }],
 *   expressions: { preset: { blink: { binds: [{ mesh: 番号, target: 番号, weight }], isBinary, overrideBlink, overrideLookAt, overrideMouth } }, custom: {} },
 *   lookAt: {...VRMC_vrm.lookAt}, firstPerson: [{ mesh: 番号, type }],
 *   springs: [{ name, joints: [{ bone, hitRadius, stiffness, gravityPower, gravityDir, dragForce }], colliderGroups:[番号] }],
 *   colliders: [{ bone, sphere?: { offset, radius }, capsule?: { offset, radius, tail } }], colliderGroups: [{ name, colliders: [番号] }]
 * }
 * 戻り値：GLB の Uint8Array
 */
export function buildVRM1(o) {
  const B = new GLTFBuilder();
  B.useExt('VRMC_vrm');
  const root = B.node({ name: 'Root', children: [] });
  B.json.scenes[0].nodes.push(root);
  const { nodeOf, world, roots } = addBones(B, o.bones);
  B.json.nodes[root].children.push(...roots);
  // 材質
  const images = (o.images || []).map(b => B.image(b));
  const texOf = new Map();
  const tex = i => { if (!texOf.has(i)) texOf.set(i, B.texture(images[i])); return texOf.get(i); };
  B.json.materials = (o.materials || []).map(m => {
    const mat = { name: m.name, pbrMetallicRoughness: { baseColorFactor: m.color || [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } };
    if (m.texture != null) mat.pbrMetallicRoughness.baseColorTexture = { index: tex(m.texture) };
    if (m.alphaMode) mat.alphaMode = m.alphaMode;
    if (m.alphaMode === 'MASK') mat.alphaCutoff = m.alphaCutoff ?? 0.5;
    if (m.doubleSided) mat.doubleSided = true;
    if (m.extras) mat.extras = m.extras;
    if (m.emissive) { mat.emissiveFactor = m.emissive.slice(0, 3); if (m.texture != null && m.emissiveFromTexture !== false) mat.emissiveTexture = { index: tex(m.texture) }; }
    if (m.mtoon) {
      B.useExt('VRMC_materials_mtoon'); B.useExt('KHR_materials_unlit');
      const mt = Object.assign({ specVersion: '1.0', transparentWithZWrite: false, renderQueueOffsetNumber: 0, shadeColorFactor: [0.8, 0.8, 0.8], shadingShiftFactor: 0, shadingToonyFactor: 0.9, giEqualizationFactor: 0.9,
        matcapFactor: [0, 0, 0], parametricRimColorFactor: [0, 0, 0], parametricRimFresnelPowerFactor: 5, parametricRimLiftFactor: 0, rimLightingMixFactor: 1,
        outlineWidthMode: 'none', outlineWidthFactor: 0, outlineColorFactor: [0, 0, 0], outlineLightingMixFactor: 1, uvAnimationScrollXSpeedFactor: 0, uvAnimationScrollYSpeedFactor: 0, uvAnimationRotationSpeedFactor: 0 }, m.mtoon);
      if (m.texture != null && !mt.shadeMultiplyTexture) mt.shadeMultiplyTexture = { index: tex(m.texture) };
      else if (mt.shadeMultiplyTexture && typeof mt.shadeMultiplyTexture.image === 'number') mt.shadeMultiplyTexture = { index: tex(mt.shadeMultiplyTexture.image) };
      mat.extensions = { VRMC_materials_mtoon: mt, KHR_materials_unlit: {} };
    }
    return mat;
  });
  // 網・皮
  const jointNodes = o.bones.map((_, i) => nodeOf[i]);
  const ibm = new Float32Array(o.bones.length * 16); world.forEach((w, i) => ibm.set(invBind(w), i * 16));
  B.json.skins = [{ name: 'skin', joints: jointNodes, inverseBindMatrices: B.accessor(ibm, 'MAT4'), skeleton: root }];
  const meshNode = [];
  B.json.meshes = o.meshes.map((me, mi) => {
    const prims = me.primitives.map(p => {
      const at = { POSITION: B.accessor(p.position, 'VEC3', { target: 34962, minmax: true }) };
      if (p.normal) at.NORMAL = B.accessor(p.normal, 'VEC3', { target: 34962 });
      if (p.uv) at.TEXCOORD_0 = B.accessor(p.uv, 'VEC2', { target: 34962 });
      if (p.color) at.COLOR_0 = B.accessor(p.color, p.colorType || 'VEC3', { target: 34962, normalized: !(p.color instanceof Float32Array) });
      at.JOINTS_0 = B.accessor(p.joints, 'VEC4', { target: 34962 });
      at.WEIGHTS_0 = B.accessor(p.weights, 'VEC4', { target: 34962 });
      const pr = { attributes: at, indices: B.accessor(p.index, 'SCALAR', { target: 34963 }), material: p.material, mode: 4 };
      if (p.targets && p.targets.length) pr.targets = p.targets.map(t => { const tt = { POSITION: B.accessor(t.position, 'VEC3', { minmax: true }) }; if (t.normal) tt.NORMAL = B.accessor(t.normal, 'VEC3'); return tt; });
      return pr;
    });
    const mesh = { name: me.name, primitives: prims };
    const tn = me.primitives.find(p => p.targets && p.targets.length);
    if (tn) { mesh.extras = { targetNames: tn.targets.map(t => t.name) }; mesh.weights = tn.targets.map(() => 0); }
    meshNode[mi] = B.node({ name: me.name, mesh: mi, skin: 0 });
    B.json.scenes[0].nodes.push(meshNode[mi]);
    return mesh;
  });
  // VRMC_vrm
  const humanBones = {}; for (const [k, i] of Object.entries(o.humanBones)) humanBones[k] = { node: nodeOf[i] };
  const vrm = { specVersion: '1.0', meta: Object.assign({}, VRM_META_DEFAULT, o.meta || {}), humanoid: { humanBones } };
  if (o.firstPerson) vrm.firstPerson = { meshAnnotations: o.firstPerson.map(f => ({ node: meshNode[f.mesh], type: f.type || 'auto' })) };
  if (o.lookAt) vrm.lookAt = o.lookAt;
  if (o.expressions) {
    const conv = e => {
      const x = { isBinary: !!e.isBinary, overrideBlink: e.overrideBlink || 'none', overrideLookAt: e.overrideLookAt || 'none', overrideMouth: e.overrideMouth || 'none' };
      if (e.binds && e.binds.length) x.morphTargetBinds = e.binds.map(b => ({ node: meshNode[b.mesh], index: b.target, weight: b.weight ?? 1 }));
      return x;
    };
    vrm.expressions = { preset: {}, custom: {} };
    for (const [k, e] of Object.entries(o.expressions.preset || {})) vrm.expressions.preset[k] = conv(e);
    for (const [k, e] of Object.entries(o.expressions.custom || {})) vrm.expressions.custom[k] = conv(e);
  }
  B.json.extensions = { VRMC_vrm: vrm };
  // VRMC_springBone
  if (o.springs && o.springs.length) {
    B.useExt('VRMC_springBone');
    const sb = { specVersion: '1.0', colliders: [], colliderGroups: [], springs: [] };
    for (const c of o.colliders || []) {
      const shape = c.capsule ? { capsule: { offset: c.capsule.offset, radius: c.capsule.radius, tail: c.capsule.tail } } : { sphere: { offset: c.sphere.offset, radius: c.sphere.radius } };
      sb.colliders.push({ node: nodeOf[c.bone], shape });
    }
    sb.colliderGroups = (o.colliderGroups || []).map(g => ({ name: g.name, colliders: g.colliders }));
    sb.springs = o.springs.map(s => {
      const x = { name: s.name, joints: s.joints.map(j => { const jj = { node: nodeOf[j.bone] }; for (const k of ['hitRadius', 'stiffness', 'gravityPower', 'gravityDir', 'dragForce']) if (j[k] != null) jj[k] = j[k]; return jj; }) };
      if (s.colliderGroups && s.colliderGroups.length) x.colliderGroups = s.colliderGroups;
      return x;
    });
    B.json.extensions.VRMC_springBone = sb;
  }
  return B.glb();
}

/**
 * VRMA 1.0（VRM Animation）を作る。骨は休みの姿勢で回転なし（T ポーズ）の人型。
 * o = { bones: [{ name, parent, pos }], humanBones: { hips: 骨の番号, ... }, name,
 *       times: Float32Array（秒）, rotations: { 骨の番号: Float32Array（x,y,z,w の並び・times と同じ数） }, hipsTranslation?: Float32Array（x,y,z）,
 *       expressions?: { preset: { blink: Float32Array（重み・times と同じ数） } }, extras?: {...}（asset.extras に入れる：クリップの印など） }
 */
export function buildVRMA(o) {
  const B = new GLTFBuilder('wakaba charkit vrmwrite/1 (vrma)');
  B.useExt('VRMC_vrm_animation');
  const { nodeOf, roots } = addBones(B, o.bones);
  B.json.scenes[0].nodes.push(...roots);
  const tIn = B.accessor(o.times, 'SCALAR', { minmax: true });
  const anim = { name: o.name || 'clip', samplers: [], channels: [] };
  for (const [bi, q] of Object.entries(o.rotations)) {
    const s = anim.samplers.push({ input: tIn, output: B.accessor(q, 'VEC4'), interpolation: 'LINEAR' }) - 1;
    anim.channels.push({ sampler: s, target: { node: nodeOf[+bi], path: 'rotation' } });
  }
  if (o.hipsTranslation) {
    const s = anim.samplers.push({ input: tIn, output: B.accessor(o.hipsTranslation, 'VEC3'), interpolation: 'LINEAR' }) - 1;
    anim.channels.push({ sampler: s, target: { node: nodeOf[o.humanBones.hips], path: 'translation' } });
  }
  const ext = { specVersion: '1.0', humanoid: { humanBones: {} } };
  for (const [k, i] of Object.entries(o.humanBones)) ext.humanoid.humanBones[k] = { node: nodeOf[i] };
  if (o.expressions && o.expressions.preset) {
    ext.expressions = { preset: {} };
    for (const [k, w] of Object.entries(o.expressions.preset)) {
      const n = B.node({ name: 'expr_' + k, translation: [0, 0, 0] }); B.json.scenes[0].nodes.push(n);
      const tr = new Float32Array(w.length * 3); for (let i = 0; i < w.length; i++) tr[i * 3] = w[i];
      const s = anim.samplers.push({ input: tIn, output: B.accessor(tr, 'VEC3'), interpolation: 'LINEAR' }) - 1;
      anim.channels.push({ sampler: s, target: { node: n, path: 'translation' } });
      ext.expressions.preset[k] = { node: n };
    }
  }
  B.json.animations = [anim];
  B.json.extensions = { VRMC_vrm_animation: ext };
  if (o.extras) B.json.asset.extras = o.extras;
  return B.glb();
}
