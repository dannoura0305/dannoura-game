#!/usr/bin/env node
// charkit の試験用の人型 glTF を作る（docs/wakaba-charkit/14 §7）：VRM 1.0 の名前の骨（指 30 本・目・あご・肩・つま先・上胸）＋
// ext_hair_ponytail_01〜04・ext_acc_hat・socket_hand_R ＋ 骨ごとの箱の網 ＋ 短いクリップ（立ち・歩き・わざと足が滑る歩き・刀の弱 1 段目）。
// クリップの extras.wakaba に fps・こまの数・印（足の着地・当たりの始め/終わり）を入れる（metrics・combatfit の試験用）。
//   node tools/charkit/make_test_char.mjs [出力（既定 tests/fixtures/charkit_test.gltf）]
// 同じ入力からいつも同じバイト列（乱数なし）。T ポーズ・+Z が前・原点は両足の間の床・単位 m。
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] || fileURLToPath(new URL('../../tests/fixtures/charkit_test.gltf', import.meta.url));

// ── 骨：[名前, 親, x, y, z]（親からの位置）。左は +X（+Z を向いた体の左）
const B = [
  ['hips', null, 0, 0.92, 0], ['spine', 'hips', 0, 0.08, 0], ['chest', 'spine', 0, 0.12, 0], ['upperChest', 'chest', 0, 0.12, 0], ['neck', 'upperChest', 0, 0.12, 0], ['head', 'neck', 0, 0.08, 0],
  ['leftEye', 'head', 0.032, 0.07, 0.08], ['rightEye', 'head', -0.032, 0.07, 0.08], ['jaw', 'head', 0, 0.0, 0.03],
];
for (const [s, sx] of [['left', 1], ['right', -1]]) {
  B.push([`${s}Shoulder`, 'upperChest', 0.03 * sx, 0.09, 0], [`${s}UpperArm`, `${s}Shoulder`, 0.12 * sx, 0, 0], [`${s}LowerArm`, `${s}UpperArm`, 0.26 * sx, 0, 0], [`${s}Hand`, `${s}LowerArm`, 0.24 * sx, 0, 0]);
  B.push([`${s}ThumbMetacarpal`, `${s}Hand`, 0.02 * sx, -0.01, 0.03], [`${s}ThumbProximal`, `${s}ThumbMetacarpal`, 0.03 * sx, 0, 0.015], [`${s}ThumbDistal`, `${s}ThumbProximal`, 0.025 * sx, 0, 0.005]);
  for (const [f, z] of [['Index', 0.025], ['Middle', 0.008], ['Ring', -0.01], ['Little', -0.025]]) B.push([`${s}${f}Proximal`, `${s}Hand`, 0.08 * sx, 0, z], [`${s}${f}Intermediate`, `${s}${f}Proximal`, 0.03 * sx, 0, 0], [`${s}${f}Distal`, `${s}${f}Intermediate`, 0.022 * sx, 0, 0]);
  B.push([`${s}UpperLeg`, 'hips', 0.085 * sx, -0.05, 0], [`${s}LowerLeg`, `${s}UpperLeg`, 0, -0.42, 0], [`${s}Foot`, `${s}LowerLeg`, 0, -0.4, 0], [`${s}Toes`, `${s}Foot`, 0, -0.04, 0.12]);
}
B.push(['ext_hair_ponytail_01', 'head', 0, 0.12, -0.1], ['ext_hair_ponytail_02', 'ext_hair_ponytail_01', 0, -0.07, -0.03], ['ext_hair_ponytail_03', 'ext_hair_ponytail_02', 0, -0.07, -0.01], ['ext_hair_ponytail_04', 'ext_hair_ponytail_03', 0, -0.06, 0]);
B.push(['ext_acc_hat', 'head', 0, 0.2, 0], ['socket_hand_R', 'rightHand', -0.07, -0.02, 0]);

const index = Object.fromEntries(B.map(([n], i) => [n, i]));
const world = {}; for (const [n, p, x, y, z] of B) { const o = p ? world[p] : [0, 0, 0]; world[n] = [o[0] + x, o[1] + y, o[2] + z]; }
const boxSize = n => n === 'head' ? 0.11 : /Eye$/.test(n) ? 0.012 : /Thumb|Index|Middle|Ring|Little/.test(n) ? 0.008 : /^ext_|^socket_|jaw/.test(n) ? 0.02 : /Toes|Foot/.test(n) ? 0.04 : 0.05;

// ── 網：骨ごとの箱（重み 1）
const pos = [], nrm = [], joints = [], weights = [], idx = [];
B.forEach(([n], bi) => {
  const [cx, cy, cz] = world[n], s = boxSize(n);
  for (const [ax, ay, az] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const u = Math.abs(ax) ? [0, 1, 0] : [1, 0, 0], v = [ay * u[2] - az * u[1], az * u[0] - ax * u[2], ax * u[1] - ay * u[0]];
    const b0 = pos.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(cx + (ax + u[0] * su + v[0] * sv) * s, cy + (ay + u[1] * su + v[1] * sv) * s, cz + (az + u[2] * su + v[2] * sv) * s); nrm.push(ax, ay, az); joints.push(bi, 0, 0, 0); weights.push(1, 0, 0, 0); }
    idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
  }
});
const ibm = []; for (const [n] of B) { const [x, y, z] = world[n]; ibm.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1); }

// ── バッファ・アクセサの組み立て
const bufs = [], views = [], accessors = []; let off = 0;
const r6 = x => Math.round(x * 1e6) / 1e6;
function add(data, ctor, componentType, type, count, extra = {}, target = undefined) {
  const b = Buffer.from(new ctor(data).buffer); const pad = (4 - (b.length % 4)) % 4;
  views.push(Object.assign({ buffer: 0, byteOffset: off, byteLength: b.length }, target ? { target } : {})); bufs.push(b, Buffer.alloc(pad)); off += b.length + pad;
  accessors.push({ bufferView: views.length - 1, componentType, count, type, ...extra });
  return accessors.length - 1;
}
const nV = pos.length / 3;
// min/max は 32bit の浮動小数に丸めた実際の値（gltf-validator の ACCESSOR_MIN/MAX_MISMATCH を出さない）
const f32 = Math.fround;
const min = [0, 1, 2].map(k => f32(Math.min(...pos.filter((_, i) => i % 3 === k).map(f32)))), max = [0, 1, 2].map(k => f32(Math.max(...pos.filter((_, i) => i % 3 === k).map(f32))));
const ARRAY = 34962, ELEMENT = 34963;
const aPos = add(pos, Float32Array, 5126, 'VEC3', nV, { min, max }, ARRAY);
const aNrm = add(nrm, Float32Array, 5126, 'VEC3', nV, {}, ARRAY);
const aJnt = add(joints, Uint16Array, 5123, 'VEC4', nV, {}, ARRAY);
const aWgt = add(weights, Float32Array, 5126, 'VEC4', nV, {}, ARRAY);
const aIdx = add(idx, Uint16Array, 5123, 'SCALAR', idx.length, {}, ELEMENT);
const aIbm = add(ibm, Float32Array, 5126, 'MAT4', B.length);

// ── クリップ
const qx = a => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)], qz = a => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
function clip(name, fps, frames, loop, tracks, events) {
  const samplers = [], channels = [];
  for (const { bone, path, keys } of tracks) {
    const times = keys.map(k => k[0] / fps), vals = keys.flatMap(k => k[1]);
    const input = add(times, Float32Array, 5126, 'SCALAR', times.length, { min: [f32(times[0])], max: [f32(times[times.length - 1])] });
    const output = add(vals, Float32Array, 5126, path === 'rotation' ? 'VEC4' : 'VEC3', keys.length);
    samplers.push({ input, output, interpolation: 'LINEAR' });
    channels.push({ sampler: samplers.length - 1, target: { node: index[bone], path } });
  }
  return { name, samplers, channels, extras: { wakaba: { fps, frames, loop, durationS: r6(frames / fps), events } } };
}
const H = world.hips;
function walk(name, slideK) {
  const F = 32, dist = 1.35 * F / 30 * slideK;   // 1 周期（2 歩）で進む距離。slideK > 1 は足の振りより体が速く進む＝足が滑る
  const sw = 0.4;
  return clip(name, 30, F, true, [
    { bone: 'leftUpperLeg', path: 'rotation', keys: [[0, qx(-sw)], [8, qx(0)], [16, qx(sw)], [24, qx(0)], [32, qx(-sw)]] },
    { bone: 'rightUpperLeg', path: 'rotation', keys: [[0, qx(sw)], [8, qx(0)], [16, qx(-sw)], [24, qx(0)], [32, qx(sw)]] },
    { bone: 'leftLowerLeg', path: 'rotation', keys: [[0, qx(0.05)], [8, qx(0.6)], [16, qx(0.05)], [32, qx(0.05)]] },
    { bone: 'rightLowerLeg', path: 'rotation', keys: [[0, qx(0.05)], [16, qx(0.05)], [24, qx(0.6)], [32, qx(0.05)]] },
    { bone: 'leftUpperArm', path: 'rotation', keys: [[0, qz(-1.25)], [16, qz(-1.25)], [32, qz(-1.25)]] },
    { bone: 'rightUpperArm', path: 'rotation', keys: [[0, qz(1.25)], [16, qz(1.25)], [32, qz(1.25)]] },
    { bone: 'hips', path: 'translation', keys: [0, 8, 16, 24, 32].map(f => [f, [0, r6(H[1] + (f % 16 === 8 ? 0.02 : -0.01)), r6(dist * f / F)]]) },
  ], [{ t: 'footL', frame: 0 }, { t: 'footR', frame: 16 }]);
}
const animations = [
  clip('idle_stand', 30, 30, true, [
    { bone: 'chest', path: 'rotation', keys: [[0, qx(0)], [15, qx(0.03)], [30, qx(0)]] },
    { bone: 'leftUpperArm', path: 'rotation', keys: [[0, qz(-1.25)], [30, qz(-1.25)]] },
    { bone: 'rightUpperArm', path: 'rotation', keys: [[0, qz(1.25)], [30, qz(1.25)]] },
  ], []),
  walk('loco_walk_fwd', 1.0),
  walk('loco_walk_fwd_slide', 1.3),
  // 刀・弱 1 段目：shinshoku/data/combat.js の COMBAT.katana.light[0]（startup 6・active 4・recovery 14＝24 こま・60fps）に合わせた印
  clip('cmb_katana_light_1', 60, 24, false, [
    { bone: 'rightUpperArm', path: 'rotation', keys: [[0, qz(1.25)], [6, qz(-0.3)], [10, qz(0.6)], [24, qz(1.25)]] },
    { bone: 'rightLowerArm', path: 'rotation', keys: [[0, qx(0)], [6, qx(-0.8)], [10, qx(-0.1)], [24, qx(0)]] },
    { bone: 'hips', path: 'translation', keys: [[0, [0, H[1], 0]], [10, [0, H[1], 0.6]], [24, [0, H[1], 0.6]]] },
  ], [{ t: 'hitStart', frame: 6 }, { t: 'hitEnd', frame: 10 }, { t: 'cancelOpen', frame: 14 }, { t: 'sfx', frame: 5, arg: 'swing_light' }]),
];

const all = Buffer.concat(bufs);
const nodes = B.map(([n, , x, y, z]) => ({ name: n, translation: [r6(x), r6(y), r6(z)], children: [] }));
B.forEach(([, p], i) => { if (p) nodes[index[p]].children.push(i); });
for (const nd of nodes) if (!nd.children.length) delete nd.children;
nodes.push({ name: 'Body', mesh: 0, skin: 0 }, { name: 'CharkitTest', children: [0] });   // 皮の網は根に置く（親の変換は皮の網に効かないため）
const gltf = {
  asset: { version: '2.0', generator: 'wakaba charkit test fixture (tools/charkit/make_test_char.mjs)' },
  scene: 0, scenes: [{ nodes: [B.length + 1, B.length] }], nodes,
  meshes: [{ name: 'Body', primitives: [{ attributes: { POSITION: aPos, NORMAL: aNrm, JOINTS_0: aJnt, WEIGHTS_0: aWgt }, indices: aIdx, material: 0 }] }],
  materials: [{ name: 'cloth_test', pbrMetallicRoughness: { baseColorFactor: [0.55, 0.45, 0.8, 1], metallicFactor: 0, roughnessFactor: 1 } }],
  skins: [{ joints: B.map((_, i) => i), inverseBindMatrices: aIbm, skeleton: 0 }],
  animations, accessors, bufferViews: views,
  buffers: [{ byteLength: all.length, uri: 'data:application/octet-stream;base64,' + all.toString('base64') }],
  extras: { wakaba: { skeleton: 'wakaba-humanoid/1', note: '試験用。VRM の拡張（VRMC_vrm）は付けない（docs/wakaba-charkit/14 §7）' } },
};
writeFileSync(OUT, JSON.stringify(gltf));
console.log('written', OUT, B.length, 'bones', nV, 'verts', animations.length, 'clips');
