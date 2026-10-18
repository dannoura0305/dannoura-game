// キャラクターの「包み」（tools/blender/char の build_char.py が書く *.pack.json）→ VRM 1.0（charkit/core/vrmwrite.js の buildVRM1）。
//   node tools/charkit/vrm_from_pack.mjs <pack.json> <out.vrm> [--meta <meta.json>]
// 包みの中身：骨（世界の位置・回転なし＝T ポーズ）・人型の対応・網（材質ごとの primitive・モーフ）・材質（MToon）・表情・視線・揺れ物・meta。
// 画像（PNG）は包みと同じフォルダから読む。出す VRM は three-vrm 3.5.5（charkit/runtime/vrmrt.js）で読める形。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildVRM1 } from '../../charkit/core/vrmwrite.js';

const dec = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };

/** 包み（JSON）→ VRM の Uint8Array と要約 */
export function packToVRM(pack, readImage) {
  const bones = pack.bones.map(b => ({ name: b.name, parent: b.parent, pos: b.parent >= 0 ? b.pos.map((x, i) => x - pack.bones[b.parent].pos[i]) : b.pos.slice() }));
  const boneIdx = Object.fromEntries(pack.bones.map((b, i) => [b.name, i]));
  const images = [], imgOf = new Map();
  const img = f => { if (!imgOf.has(f)) { imgOf.set(f, images.length); images.push(readImage(f)); } return imgOf.get(f); };
  const materials = pack.materials.map(m => {
    const o = { name: m.name, color: m.color || [1, 1, 1, 1] };
    if (m.texture) o.texture = img(m.texture);
    if (m.alphaMode) o.alphaMode = m.alphaMode;
    if (m.alphaCutoff != null) o.alphaCutoff = m.alphaCutoff;
    if (m.doubleSided) o.doubleSided = true;
    if (m.mtoon) {
      o.mtoon = Object.assign({}, m.mtoon);
      if (m.shadeTexture) o.mtoon.shadeMultiplyTexture = { image: img(m.shadeTexture) };
    }
    if (m.extras) o.extras = m.extras;
    return o;
  });
  const meshIdx = {}, morphIdx = {};
  const meshes = pack.meshes.map((me, mi) => {
    meshIdx[me.name] = mi; morphIdx[me.name] = Object.fromEntries((me.morphs || []).map((k, i) => [k, i]));
    return {
      name: me.name, primitives: me.primitives.map(p => ({
        position: dec(p.position, Float32Array), normal: dec(p.normal, Float32Array), uv: dec(p.uv, Float32Array),
        joints: dec(p.joints, Uint16Array), weights: dec(p.weights, Float32Array), index: dec(p.index, p.indexType === 'u32' ? Uint32Array : Uint16Array),
        material: p.material, targets: (p.targets || []).map(t => ({ name: t.name, position: dec(t.position, Float32Array) })),
      })),
    };
  });
  const conv = e => ({ isBinary: !!e.isBinary, overrideBlink: e.overrideBlink, overrideLookAt: e.overrideLookAt, overrideMouth: e.overrideMouth,
    binds: (e.binds || []).filter(b => meshIdx[b.mesh] != null && morphIdx[b.mesh][b.morph] != null).map(b => ({ mesh: meshIdx[b.mesh], target: morphIdx[b.mesh][b.morph], weight: b.weight ?? 1 })) });
  const ex = pack.expressions || {};
  const expressions = { preset: Object.fromEntries(Object.entries(ex.preset || {}).map(([k, e]) => [k, conv(e)])), custom: Object.fromEntries(Object.entries(ex.custom || {}).map(([k, e]) => [k, conv(e)])) };
  const humanBones = Object.fromEntries(Object.entries(pack.humanBones).map(([k, v]) => [k, typeof v === 'number' ? v : boneIdx[v]]));
  const S = pack.springBone || {};
  const colliders = (S.colliders || []).map(c => Object.assign({}, c, { bone: boneIdx[c.bone] }));
  const springs = (S.springs || []).map(s => ({ name: s.name, colliderGroups: s.colliderGroups || [], joints: s.joints.map(j => Object.assign({}, j, { bone: boneIdx[j.bone] })) }));
  for (const s of springs) for (const j of s.joints) if (j.bone == null) throw new Error('揺れ物の骨が無い：' + s.name);
  const vrm = buildVRM1({
    meta: pack.meta, bones, humanBones, materials, images, meshes, expressions,
    lookAt: pack.lookAt, firstPerson: (pack.firstPerson || []).map(f => ({ mesh: meshIdx[f.mesh], type: f.type })).filter(f => f.mesh != null),
    springs, colliders, colliderGroups: S.colliderGroups || [],
  });
  const tris = pack.meshes.reduce((s, m) => s + m.primitives.reduce((t, p) => t + p.tris, 0), 0);
  return { vrm, info: { bones: bones.length, human: Object.keys(humanBones).length, tris, materials: materials.length, images: images.length, imageBytes: images.reduce((s, b) => s + b.length, 0),
    expressions: Object.keys(expressions.preset).length + Object.keys(expressions.custom).length, springs: springs.length, springJoints: springs.reduce((s, x) => s + x.joints.length, 0), colliders: colliders.length } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error('使い方：node tools/charkit/vrm_from_pack.mjs <pack.json> <out.vrm>'); process.exit(2); }
  const pack = JSON.parse(readFileSync(src, 'utf8'));
  const { vrm, info } = packToVRM(pack, f => new Uint8Array(readFileSync(join(dirname(src), f))));
  writeFileSync(out, vrm);
  info.bytes = vrm.length; info.sha256 = createHash('sha256').update(vrm).digest('hex');
  console.log(JSON.stringify(info));
}
