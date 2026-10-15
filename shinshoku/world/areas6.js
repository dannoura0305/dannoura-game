// 第6章A の冒頭の区画【仮】：巨大用の町（town）。研究者の広域計画で置き換えが始まった夜の商店街の通り。巨大猫又（scale 8・頭の高さ約 9m）の縮尺。
// 区画の形は world/areas.js と同じ。壊れる小物（看板・電柱・アーケードの骨・自販機・日よけ）はインスタンスの網（yard と同じ dyn.props の形）。
// 逃げる人は小さな人影のインスタンス（攻撃の対象にならない・当たり判定も無い）。（相棒）は本物の役者（CompanionActor）を置く。
// 名前・看板の文字はすべて仮。町は月代町ではない（だんのうらの住む町・名前未定）。
import * as THREE from 'three';
import { Builder, Atlas, signDraw, groundTex } from './level.js';
import { gradientMap } from '../render/toon.js';
import { instanced, finish, BUILDERS3 } from './areas.js';
import { skyDome } from '../render/sky.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
export const TOWN = {
  provisional: true,
  giantStart: [0, 6, Math.PI],
  companion: [7.5, 26.0],          // 負傷して座り込む場所（アーケードの入口の前）
  safe: [0, 44],                   // 避難の先（バスが行く所）
  // 逃げる人の群れ（小さな人影）：from → to を往復しない（一度逃げきる）
  crowds: [{ from: [-14, -6], to: [-4, 46], n: 6 }, { from: [14, 4], to: [4, 46], n: 5 }, { from: [-6, -22], to: [-2, 46], n: 5 }, { from: [18, -16], to: [6, 46], n: 4 }],
};
const SHOPS = ['喫茶 灯', '八百屋', 'クリーニング', '書店', '薬局', '精肉店', '金物屋', 'たい焼き', '銭湯', '写真館', '時計店', '和菓子'];

export function buildTown() {
  const root = new THREE.Group(); root.name = 'area_town';
  root.add(skyDome({ top: 0x0c0414, mid: 0x3a0c3a, horizon: 0x8a1a3a, moon: [0.3, 0.38, -0.87] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [];
  const rr = rngOf(613);
  const gt = groundTex({ base: '#2c2832', repeat: [30, 30] });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  // 道の白線（中央の通り：z 方向・横の通り：x 方向）
  for (let z = -56; z < 56; z += 6) B.box('glow', 0, 0.02, z, 0.25, 0.02, 3.0, 0x8a8890, { edges: false });
  for (let x = -56; x < 56; x += 6) if (Math.abs(x) > 8) B.box('glow', x, 0.02, 0, 3.0, 0.02, 0.25, 0x8a8890, { edges: false });
  // 店の並び（中央の通りの両側・横の通りの両側）：2〜3 階の店・シャッター・看板
  const shops = [];
  const addRow = (x0, z0, z1, side, alongX) => { for (let z = z0; z < z1; z += 7.4) { const h = 6 + rr() * 4, d = 8 + rr() * 2; shops.push({ x: alongX ? z : x0 + side * d / 2, z: alongX ? x0 + side * d / 2 : z + 3.5, w: alongX ? 7.0 : d, d: alongX ? d : 7.0, h, side, alongX }); } };
  addRow(6, -58, -6, 1, false); addRow(6, 6, 58, 1, false); addRow(-6, -58, -6, -1, false); addRow(-6, 6, 58, -1, false);
  addRow(6, 10, 58, 1, true); addRow(-6, 10, 58, -1, true); addRow(6, -58, -10, 1, true); addRow(-6, -58, -10, -1, true);
  const colors = [0x6a5a50, 0x5a6070, 0x70606a, 0x58665a, 0x7a6a58, 0x5e5a68];
  shops.forEach((s, i) => {
    B.box('wall', s.x, s.h / 2, s.z, s.w, s.h, s.d, colors[i % colors.length]);
    B.box('wall', s.x, s.h + 0.3, s.z, s.w + 0.4, 0.6, s.d + 0.4, 0x3a3238);
    const fx = s.alongX ? 0 : -s.side, fz = s.alongX ? -s.side : 0;                     // 通りに面した向き
    const fxp = s.x + fx * (s.w / 2 + 0.06), fzp = s.z + fz * (s.d / 2 + 0.06);
    B.box('shutter', fxp, 1.6, fzp, s.alongX ? 5.6 : 0.1, 3.2, s.alongX ? 0.1 : 5.6, 0x8a8e94);
    if (i % 2 === 0) { const u = atlas.add(signDraw(SHOPS[i % SHOPS.length] + '（仮）', { bg: ['#f0e8d0', '#2a1a14', '#e8f0f0'][i % 3], fg: ['#6a1a1a', '#ffd8a0', '#1a3a6a'][i % 3], size: 40 })); B.box('sign', fxp + fx * 0.05, 4.0, fzp + fz * 0.05, s.alongX ? 5.0 : 0.05, 1.0, s.alongX ? 0.05 : 5.0, 0xffffff, { uv: u, face: s.alongX ? (fz > 0 ? 4 : 5) : (fx > 0 ? 0 : 1), edges: false }); }
    for (let k = 0; k < 3; k++) if (rr() < 0.6) B.box('glow', fxp + fx * 0.02, 5.0 + (k % 2) * 1.2, fzp + fz * 0.02 + (s.alongX ? 0 : (k - 1) * 2), s.alongX ? 1.4 : 0.04, 0.9, s.alongX ? 0.04 : 1.4, rr() < 0.5 ? 0xffc890 : 0x6a4a8a, { edges: false });
  });
  // 遠くの町並み（影）・研究施設と広域計画の光の柱（北）
  for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, r = 85 + rr() * 20, h = 8 + rr() * 22; const x = Math.sin(a) * r, z = Math.cos(a) * r; B.box('wall', x, h / 2, z, 10 + rr() * 10, h, 8 + rr() * 6, 0x1a1422, { ry: a, edges: false }); if (rr() < 0.6) B.box('glow', x - Math.sin(a) * 5.5, h * 0.6, z - Math.cos(a) * 5.5, 2, 1.2, 0.2, rr() < 0.5 ? 0x8a3aff : 0xffb880, { ry: a, edges: false }); }
  for (const [x, h] of [[-20, 56], [16, 44], [0, 64]]) { B.box('wall', x, h / 2, -100, 16, h, 14, 0x1e1626, { edges: false }); }
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(4, 9, 220, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  pillar.position.set(0, 110, -100); root.add(pillar); dyn.pillar = pillar;
  halos.push({ p: [0, 10, -96], size: 40, color: 0xb040ff, k: 0.5 });
  // 置き換えの「膜」：町の縁から伸びる紫の筋（地面）
  for (let i = 0; i < 16; i++) { const x = (rr() - 0.5) * 90, z = -40 - rr() * 30; B.box('glow', x, 0.03, z, 0.6 + rr(), 0.03, 10 + rr() * 14, rr() < 0.5 ? 0xff4ad8 : 0x9a3aff, { ry: rr() * 0.6 - 0.3, edges: false }); }
  // アーケードの骨（中央の通りの上・高さ 7）
  for (let z = -54; z < 56; z += 9) if (Math.abs(z) > 6) { B.box('prop', -5.6, 3.6, z, 0.3, 7.2, 0.3, 0x5a5e68); B.box('prop', 5.6, 3.6, z, 0.3, 7.2, 0.3, 0x5a5e68); }
  // 壊れる小物：看板（柱の上）・電柱・アーケードの屋根の板・自販機・日よけ
  const K = {
    sign: [[0, 2.4, 0, 0.25, 4.8, 0.25, 0x4a4e58], [0, 5.2, 0, 3.2, 1.4, 0.2, 0xffffff]],
    pole: [[0, 4.5, 0, 0.36, 9.0, 0.36, 0x6a6460], [0, 8.4, 0, 2.6, 0.2, 0.2, 0x4a4440], [0.9, 8.6, 0, 0.3, 0.3, 0.3, 0x8a8a90]],
    roof: [[0, 7.3, 0, 11.4, 0.2, 8.6, 0x8a9aa8], [0, 7.6, 0, 11.4, 0.4, 0.3, 0x5a5e68]],
    vend: [[0, 0.9, 0, 1.0, 1.8, 0.8, 0xffffff], [0, 1.2, 0.41, 0.8, 0.9, 0.02, 0xe8f0ff]],
    awning: [[0, 3.3, 0, 5.0, 0.15, 1.8, 0xffffff]],
  };
  const P = []; let n = 0; const add = (kind, x, z, ry = 0, color) => P.push({ id: kind + '_' + (n++), kind, x, z, ry, color });
  for (let z = -50; z < 54; z += 12) { add('sign', -4.2, z + 3, Math.PI / 2, [0xd84a3a, 0x3a8ad8, 0xd8b03a, 0x5ac87a][Math.abs(z) % 4]); add('sign', 4.2, z - 3, -Math.PI / 2, [0x3a8ad8, 0xd84a3a, 0x5ac87a, 0xd8b03a][Math.abs(z) % 4]); }
  for (let x = -54; x < 56; x += 11) if (Math.abs(x) > 9) { add('pole', x, -5.0); add('pole', x + 5, 5.0); }
  for (let z = -48; z < 50; z += 9) if (Math.abs(z) > 8) add('roof', 0, z);
  for (const [x, z] of [[-4.6, 12], [4.6, -14], [-4.6, -30], [4.6, 34], [-12, -4.6], [16, 4.6]]) add('vend', x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, [0xd83a3a, 0x3a6ad8, 0xe8e8e8][Math.abs(x + z) % 3]);
  for (let z = -40; z < 44; z += 16) { add('awning', -5.0, z, Math.PI / 2, 0xc84a5a); add('awning', 5.0, z + 8, Math.PI / 2, 0x4a8ac8); }
  dyn.props = [];
  const HP = { sign: 8, pole: 10, roof: 6, vend: 6, awning: 4 }, PR = { sign: 1.8, pole: 1.2, roof: 4.6, vend: 1.0, awning: 2.2 };
  for (const [kind, parts] of Object.entries(K)) {
    const list = P.filter(p => p.kind === kind); if (!list.length) continue;
    const m = instanced(parts, list.map(p => ({ x: p.x, z: p.z, ry: p.ry, color: p.color })), { name: 'prop_' + kind, shadow: kind !== 'roof' });
    root.add(m);
    list.forEach((p, i) => dyn.props.push({ id: p.id, kind, x: p.x, z: p.z, ry: p.ry, r: PR[kind], hp: HP[kind], hpMax: HP[kind], alive: true, mesh: m, idx: i }));
  }
  const debG = new THREE.DodecahedronGeometry(0.7, 0); const debris = new THREE.InstancedMesh(debG, new THREE.MeshToonMaterial({ color: 0x4a4650, gradientMap: gradientMap() }), 120);
  const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 120; i++) debris.setMatrixAt(i, Z); debris.name = 'debris'; debris.castShadow = true; root.add(debris);
  dyn.debris = { mesh: debris, n: 0 };
  // 逃げる人（小さな人影のインスタンス：体＋頭。攻撃の対象にならない）
  const people = []; TOWN.crowds.forEach((c, ci) => { for (let i = 0; i < c.n; i++) people.push({ ci, i, x: c.from[0] + (rr() - 0.5) * 3, z: c.from[1] + (rr() - 0.5) * 3, to: [c.to[0] + (rr() - 0.5) * 4, c.to[1] + rr() * 4], sp: 2.4 + rr() * 1.2, ph: rr() * 6, color: [0x4a5a8a, 0x8a4a4a, 0x5a7a5a, 0x7a6a4a, 0x6a4a7a][Math.floor(rr() * 5)] }); });
  const pm = instanced([[0, 0.55, 0, 0.42, 1.1, 0.3, 0xffffff], [0, 1.32, 0, 0.3, 0.3, 0.3, 0xe8d0c0], [0.12, 0.2, 0, 0.14, 0.4, 0.14, 0x2a2a30], [-0.12, 0.2, 0, 0.14, 0.4, 0.14, 0x2a2a30]], people.map(p => ({ x: p.x, z: p.z, color: p.color })), { name: 'people' });
  root.add(pm); dyn.people = { mesh: pm, list: people };
  // 避難バス（守る：前足でつかんで安全な所へ）
  const bus = instanced([[0, 1.6, 0, 2.6, 2.6, 9.0, 0xe8e0c8], [0, 2.2, 0, 2.7, 0.9, 8.6, 0x2a3a5a], [0, 0.4, 3.2, 2.7, 0.8, 0.9, 0x2a2a30], [0, 0.4, -3.2, 2.7, 0.8, 0.9, 0x2a2a30], [0, 3.0, 0, 2.4, 0.1, 8.6, 0xd84a3a]], [{ x: -6, z: -16, ry: 0.3 }], { name: 'bus', shadow: true });
  root.add(bus); dyn.bus = { mesh: bus, x: -6, z: -16, ry: 0.3, lifted: false };
  // 明かり（巨体の縮尺）
  const lights = [
    { id: 'moonfill', pos: [0, 40, 20], color: 0x9a6ad8, intensity: 55, dist: 160 },
    { id: 'pillar', pos: [0, 20, -70], color: 0xc040ff, intensity: 110, dist: 90 },
    { id: 'shop1', pos: [-4, 6, 20], color: 0xffc890, intensity: 26, dist: 26 },
    { id: 'shop2', pos: [4, 6, -20], color: 0xffc890, intensity: 26, dist: 26 },
    { id: 'comp', pos: [8, 5, 26], color: 0xffd8b0, intensity: 22, dist: 18 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  halos.push({ p: [TOWN.companion[0], 2.0, TOWN.companion[1]], size: 3, color: 0xffd8a0, k: 0.4 });
  return finish('town', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots: [], surface: () => 'asphalt', rainRoof: () => false, indoor: () => false,
    bounds: { minX: -54, maxX: 54, minZ: -54, maxZ: 54 }, spawns: { giant: [TOWN.giantStart[0], TOWN.giantStart[1], TOWN.giantStart[2]] },
    fog: { color: 0x1a0a20, density: 0.008 }, rain: false, amb: 'yard', far: 420, giant: true,
  });
}
BUILDERS3.town = buildTown;
