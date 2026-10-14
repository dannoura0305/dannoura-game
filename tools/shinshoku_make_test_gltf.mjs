// 試験用の人型 glTF（Mixamo 風の骨の名前・T ポーズ・骨ごとの箱）を作る：manifest の差し替え（コード変更なし）の確認用。
// node tools/shinshoku_make_test_gltf.mjs → tests/fixtures/shinshoku_char_test.gltf
import { writeFileSync } from 'node:fs';
const B = [ // [名前, 親, x, y, z]（親からの位置）
  ['mixamorig:Hips', null, 0, 0.9, 0], ['mixamorig:Spine', 'mixamorig:Hips', 0, 0.1, 0], ['mixamorig:Spine2', 'mixamorig:Spine', 0, 0.2, 0], ['mixamorig:Neck', 'mixamorig:Spine2', 0, 0.2, 0], ['mixamorig:Head', 'mixamorig:Neck', 0, 0.08, 0],
  ['mixamorig:LeftArm', 'mixamorig:Spine2', 0.18, 0.16, 0], ['mixamorig:LeftForeArm', 'mixamorig:LeftArm', 0.27, 0, 0], ['mixamorig:LeftHand', 'mixamorig:LeftForeArm', 0.24, 0, 0],
  ['mixamorig:RightArm', 'mixamorig:Spine2', -0.18, 0.16, 0], ['mixamorig:RightForeArm', 'mixamorig:RightArm', -0.27, 0, 0], ['mixamorig:RightHand', 'mixamorig:RightForeArm', -0.24, 0, 0],
  ['mixamorig:LeftUpLeg', 'mixamorig:Hips', 0.09, -0.04, 0], ['mixamorig:LeftLeg', 'mixamorig:LeftUpLeg', 0, -0.42, 0], ['mixamorig:LeftFoot', 'mixamorig:LeftLeg', 0, -0.4, 0],
  ['mixamorig:RightUpLeg', 'mixamorig:Hips', -0.09, -0.04, 0], ['mixamorig:RightLeg', 'mixamorig:RightUpLeg', 0, -0.42, 0], ['mixamorig:RightFoot', 'mixamorig:RightLeg', 0, -0.4, 0],
];
const world = {}; for (const [n, p, x, y, z] of B) { const o = p ? world[p] : [0, 0, 0]; world[n] = [o[0] + x, o[1] + y, o[2] + z]; }
const pos = [], nrm = [], joints = [], weights = [], idx = [];
B.forEach(([n], bi) => {
  const [cx, cy, cz] = world[n], s = n.endsWith('Head') ? 0.12 : 0.05, base = pos.length / 3;
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const f of faces) {
    const [ax, ay, az] = f, u = Math.abs(ax) ? [0, 1, 0] : [1, 0, 0], v = [ay * u[2] - az * u[1], az * u[0] - ax * u[2], ax * u[1] - ay * u[0]];
    const b0 = pos.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(cx + (ax + u[0] * su + v[0] * sv) * s, cy + (ay + u[1] * su + v[1] * sv) * s, cz + (az + u[2] * su + v[2] * sv) * s); nrm.push(ax, ay, az); joints.push(bi, 0, 0, 0); weights.push(1, 0, 0, 0); }
    idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
  }
  void base;
});
const f32 = a => Buffer.from(new Float32Array(a).buffer), u16 = a => Buffer.from(new Uint16Array(a).buffer);
const ibm = []; for (const [n] of B) { const [x, y, z] = world[n]; ibm.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1); }
const parts = [f32(pos), f32(nrm), u16(joints), f32(weights), u16(idx), f32(ibm)];
const views = []; let off = 0; const bufs = [];
for (const b of parts) { const pad = (4 - (b.length % 4)) % 4; views.push({ buffer: 0, byteOffset: off, byteLength: b.length }); bufs.push(b, Buffer.alloc(pad)); off += b.length + pad; }
const all = Buffer.concat(bufs);
const nV = pos.length / 3;
const min = [0, 1, 2].map(k => Math.min(...pos.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map(k => Math.max(...pos.filter((_, i) => i % 3 === k)));
const nodes = B.map(([n, p, x, y, z]) => ({ name: n, translation: [x, y, z], children: [] }));
B.forEach(([n, p], i) => { if (p) nodes[B.findIndex(q => q[0] === p)].children.push(i); });
for (const nd of nodes) if (!nd.children.length) delete nd.children;
nodes.push({ name: 'Body', mesh: 0, skin: 0 }, { name: 'TestChar', children: [0, B.length] });
const gltf = {
  asset: { version: '2.0', generator: 'shinshoku test fixture' }, scene: 0, scenes: [{ nodes: [B.length + 1] }], nodes,
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, JOINTS_0: 2, WEIGHTS_0: 3 }, indices: 4, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.4, 0.8, 0.5, 1], metallicFactor: 0, roughnessFactor: 1 } }],
  skins: [{ joints: B.map((_, i) => i), inverseBindMatrices: 5 }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: nV, type: 'VEC3', min, max }, { bufferView: 1, componentType: 5126, count: nV, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: nV, type: 'VEC4' }, { bufferView: 3, componentType: 5126, count: nV, type: 'VEC4' },
    { bufferView: 4, componentType: 5123, count: idx.length, type: 'SCALAR' }, { bufferView: 5, componentType: 5126, count: B.length, type: 'MAT4' },
  ],
  bufferViews: views, buffers: [{ byteLength: all.length, uri: 'data:application/octet-stream;base64,' + all.toString('base64') }],
};
writeFileSync(new URL('../tests/fixtures/shinshoku_char_test.gltf', import.meta.url), JSON.stringify(gltf));
console.log('written', B.length, 'bones', nV, 'verts');
