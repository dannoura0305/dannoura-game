// 第3章の区画【仮】：病院（記録のない患者）・地下通路（白髪形態の転機）。world/areas.js と同じ形の区画を返す。
// 静的な箱は材質ごとに 1 つの網へ、繰り返す物（ベッド・カーテン・車いす・点滴の柱・長いす・配管）はインスタンス網、
// 光の筋・しみはそれぞれ 1 回の描画（render/shafts.js）。床の近くは頂点の陰で暗く（world/level.js の bakedAO）。
import * as THREE from 'three';
import { Builder, Atlas, signDraw } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex, JP_FONT } from '../render/toon.js';
import { mats, ground, instanced, finish, BUILDERS3 } from './areas.js';
import { lightShafts, stainDecals } from '../render/shafts.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

/** 子どもの絵（小児病棟の掲示）：クレヨンの家と太陽・猫 */
function kidsDrawing(seed) {
  return (g, w, h) => {
    const r = rngOf(seed); g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, w, h);
    g.lineWidth = 4; g.lineCap = 'round';
    g.strokeStyle = '#e05a3a'; g.beginPath(); g.moveTo(40, 52); g.lineTo(70, 22); g.lineTo(100, 52); g.stroke();
    g.strokeStyle = '#3a7ad0'; g.strokeRect(46, 52, 48, 8);
    g.fillStyle = '#f0c030'; g.beginPath(); g.arc(w - 50, 22, 12, 0, 7); g.fill();
    g.strokeStyle = '#4a4a4a'; g.beginPath(); g.arc(200 + r() * 40, 44, 10, 0, 7); g.moveTo(192 + r() * 4, 36); g.lineTo(196, 28); g.lineTo(200, 36); g.stroke();
    g.fillStyle = '#2a2a2a'; g.font = `bold 18px ${JP_FONT}`; g.fillText(['ゆう', 'けい さん', 'ママ'][seed % 3], 300, 40);
  };
}
function plateDraw(text, sub) { return signDraw(text + (sub ? '　' + sub : ''), { bg: '#eef2f0', fg: '#1a3a4a', size: 34, frameColor: '#7aa0a8' }); }

// ───────────────────────── 病院 ─────────────────────────
export function buildHospital() {
  const root = new THREE.Group(); root.name = 'area_hospital';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 4, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const wall = (cx, cz, w, d, h, c) => { B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  const H = 3.6, WL = 0x8c9894, WL2 = 0x7e8a86, WLD = 0x6a7874, TRIM = 0x4a6a64;   // フェーズ10：壁を少し暗く（白く飛ばない）
  // 床：ロビー（大きなタイル）・廊下と病室（リノリウム：細長い）
  const floorTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5e6a66'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? '#6c7874' : '#5a6662'; g.fillRect(x + 1, y + 1, 30, 30); }
    g.fillStyle = 'rgba(40,50,48,.12)'; for (let i = 0; i < 90; i++) g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 10, 1);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(12, 22);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(25, 44.5), new THREE.MeshToonMaterial({ map: floorTex, gradientMap: gradientMap() }));
  fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -2.5); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  // 天井（1 枚・光を受けない暗い面＝点光源の白い楕円が出ない）・巾木（壁の下の帯）
  B.box('glow', 0, H + 0.1, -2.5, 25, 0.2, 44.5, 0x2e3634, { edges: false });
  // 外周
  wall(-12.2, -2.5, 0.4, 44.5, H, WL2); wall(12.2, -2.5, 0.4, 44.5, H, WL2);
  wall(0, -24.6, 25, 0.4, H, WL2);
  wall(-6.7, 19.6, 11.0, 0.4, H, WL); wall(6.7, 19.6, 11.0, 0.4, H, WL); B.box('wall', 0, H - 0.5, 19.6, 2.4, 1.0, 0.4, WL);   // 南（入口：避難所への連絡通路）
  // フェーズ10：正面玄関（自動ドアは開いたまま・左右に寄った 2 枚のガラス）
  for (const s2 of [-1, 1]) B.box('glass', s2 * 1.75, 1.25, 19.75, 1.1, 2.5, 0.05, 0x1a2430, { edges: false });
  // ロビーの北の壁（廊下の入口 x −2〜2）
  wall(-7.1, 8.0, 9.8, 0.3, H, WL); wall(7.1, 8.0, 9.8, 0.3, H, WL);
  // 廊下の壁（x ±2）。病室の戸口・ナースステーションの開口を空ける
  const gaps = { w: [[-1.0, 2.2], [-4.7, -3.3], [-10.7, -9.3], [-16.7, -15.3], [-22.2, -20.8]], e: [[0.9, 2.5], [-4.7, -3.3], [-10.7, -9.3], [-16.7, -15.3]] };
  for (const [side, x] of [['w', -2.0], ['e', 2.0]]) {
    let z0 = 8.0; const G = gaps[side].slice().sort((a, b) => b[1] - a[1]);
    for (const [a, b] of G) { if (z0 - b > 0.05) { if (side === 'w' && b >= 2.2) { B.box('wall', x, 0.55, (z0 + b) / 2, 0.3, 1.1, z0 - b, 0xa8b8b4); solid(x, (z0 + b) / 2, 0.3, z0 - b, 1.1); B.box('glass', x, 2.3, (z0 + b) / 2, 0.05, 1.6, z0 - b, 0x0e1418, { edges: false }); B.box('wall', x, H - 0.25, (z0 + b) / 2, 0.3, 0.5, z0 - b, WL); } else wall(x, (z0 + b) / 2, 0.3, z0 - b, H, WL); } z0 = a; }
    if (z0 > -24.4) wall(x, (z0 - 24.4) / 2, 0.3, z0 + 24.4, H, WL);
    for (const [a, b] of G) B.box('wall', x, H - 0.4, (a + b) / 2, 0.3, 0.8, b - a, WL);   // 戸口の上
  }
  // 病室の仕切り（x −12〜−2・2〜12、z −1・−7・−13・−19）
  for (const z of [-1, -7, -13, -19]) { wall(-7, z, 10, 0.3, H, WL2); wall(7, z, 10, 0.3, H, WL2); }
  // 巾木（廊下）
  for (const x of [-1.84, 1.84]) B.box('prop', x, 0.08, -8, 0.04, 0.16, 32, TRIM, { edges: false });
  // 手すり（廊下）
  for (const x of [-1.8, 1.8]) B.box('prop', x, 0.85, -8, 0.06, 0.05, 30, 0xd8d0b8, { edges: false });

  // ── ロビー：受付・長いす・車いす・柱・観葉植物 ──
  B.box('prop', 0, 0.52, 10.7, 6.2, 1.04, 0.8, 0x6a8aa0); solid(0, 10.7, 6.2, 0.8, 1.1);
  B.box('prop', 0, 1.08, 10.7, 6.4, 0.06, 1.0, 0xe8e4dc, { edges: false });
  B.box('prop', -2.2, 1.25, 10.55, 0.5, 0.36, 0.06, 0x1a2228, { edges: false }); B.box('glow', -2.2, 1.26, 10.52, 0.44, 0.3, 0.01, 0x3a6a8a, { edges: false });
  B.box('glow', 1.6, 1.3, 10.6, 0.3, 0.16, 0.3, 0xffd8a0, { edges: false }); halos.push({ p: [1.6, 1.35, 11.0], size: 1.2, color: 0xffc888, k: 0.6 });   // 受付の机の灯り（フェーズ10）
  const rcp = atlas.add(signDraw('受付・会計', { bg: '#2a6a8a', fg: '#ffffff', size: 36 }));
  B.box('sign', 0, 2.9, 10.3, 3.2, 0.5, 0.05, 0xffffff, { uv: rcp, face: 4, edges: false });
  spots.push({ id: 'hosp_reception', kind: 'read', x: 0.6, z: 11.6, r: 1.2, label: '受付の机（入院の記録）', text: 'hosp_reception' });
  for (const x of [-6, 6]) { B.box('wall', x, H / 2, 9.0, 0.5, H, 0.5, 0xb8c4c0); solid(x, 9.0, 0.5, 0.5, H); }
  const bench = [[0, 0.44, 0, 1.8, 0.07, 0.5, 0x4a7a9a], [0, 0.22, -0.18, 0.06, 0.44, 0.06, 0x5a5a62], [0.8, 0.22, 0, 0.05, 0.44, 0.45, 0x5a5a62], [-0.8, 0.22, 0, 0.05, 0.44, 0.45, 0x5a5a62], [0, 0.75, 0.24, 1.8, 0.5, 0.06, 0x4a7a9a]];
  const benches = []; for (const z of [14.2, 16.4]) for (const x of [-8.2, -5.4, 5.4, 8.2]) benches.push({ x, z, ry: Math.PI });
  root.add(instanced(bench, benches, { name: 'benches' })); for (const b of benches) solid(b.x, b.z, 1.8, 0.55, 0.8);
  // 車いす（インスタンス：座面・背・大きな車輪・小さな車輪・握り）
  const wc = [[0, 0.48, 0, 0.46, 0.05, 0.44, 0x2a3a4a], [0, 0.78, -0.22, 0.46, 0.5, 0.04, 0x2a3a4a], [0.26, 0.32, -0.04, 0.03, 0.62, 0.62, 0x9aa0a8], [-0.26, 0.32, -0.04, 0.03, 0.62, 0.62, 0x9aa0a8], [0.2, 0.08, 0.24, 0.03, 0.14, 0.14, 0x30343a], [-0.2, 0.08, 0.24, 0.03, 0.14, 0.14, 0x30343a], [0, 1.02, -0.3, 0.5, 0.03, 0.03, 0xb0b4bc], [0.22, 0.6, 0.0, 0.03, 0.03, 0.5, 0xb0b4bc], [-0.22, 0.6, 0.0, 0.03, 0.03, 0.5, 0xb0b4bc]];
  const wcs = [{ x: -10.8, z: 9.6, ry: 1.4 }, { x: -10.8, z: 10.6, ry: 1.5 }, { x: 10.6, z: 18.2, ry: -0.4 }, { x: 4.6, z: 9.4, ry: 2.6 }, { x: 1.2, z: -11.6, ry: 0.3 }, { x: -0.8, z: -17.8, ry: 3.6 }];
  root.add(instanced(wc, wcs, { name: 'wheelchairs', shadow: true })); for (const w of wcs) solid(w.x, w.z, 0.7, 0.7, 1.0);
  // 観葉植物（鉢と葉）
  for (const [x, z] of [[-11.2, 18.6], [11.2, 9.0], [-3.0, 8.6]]) { B.box('prop', x, 0.3, z, 0.5, 0.6, 0.5, 0x8a6a4a); B.box('prop', x, 0.95, z, 0.75, 0.7, 0.75, 0x3a6a3a, { edges: false }); B.box('prop', x, 1.4, z, 0.5, 0.5, 0.5, 0x4a7a4a, { edges: false }); solid(x, z, 0.6, 0.6, 1.2); }
  // 掲示（ロビー）
  const posters = [['面会時間　13:00〜20:00', '#f4f0e0', '#1a3a6a'], ['院内では静かに', '#f0f4f4', '#2a5a5a'], ['手洗い・うがいを', '#f4f4ea', '#2a6a3a'], ['お薬の受け取りは 2 番窓口', '#eef0f6', '#3a3a6a']];
  posters.forEach(([t, bg, fg], i) => { const u = atlas.add(signDraw(t, { bg, fg, size: 30, dirt: true })); B.box('sign', -12.0 + 0.02, 1.7, 17.6 - i * 2.1, 0.03, 0.5, 1.6, 0xffffff, { uv: u, face: 0, edges: false }); });
  // ── ナースステーション（x −12〜−2、z −1〜8）：カルテ棚・病室の札（ホワイトボード）・鍵箱・パソコン（セーブ）──
  B.box('prop', -11.6, 1.1, 3.4, 0.6, 2.2, 5.4, 0x8a7a64); solid(-11.6, 3.4, 0.6, 5.4, 2.2);
  const rr = rngOf(11); for (let k = 0; k < 4; k++) for (let i = 0; i < 18; i++) B.box('prop', -11.28, 0.35 + k * 0.5, 1.0 + i * 0.27, 0.06, 0.34, 0.22, [0xd04848, 0x3a7ad0, 0xe0b030, 0x4aa060, 0xe8e8e0][Math.floor(rr() * 5)], { edges: false });
  spots.push({ id: 'hosp_charts', kind: 'clue', clue: 'charts', x: -10.6, z: 3.4, r: 1.3, label: 'カルテ棚' });
  B.box('prop', -6.0, 1.6, -0.82, 3.2, 1.3, 0.05, 0xf4f6f6); B.box('prop', -6.0, 1.6, -0.84, 3.3, 1.4, 0.02, 0x8a9294, { edges: false });
  const board = atlas.add(signDraw('病室 301 東 / 302 西川 / 303 北原 / 304 南 / 305 日向 / 306 小野寺', { bg: '#f8faf8', fg: '#2a3a4a', size: 22 }));
  B.box('sign', -6.0, 1.75, -0.79, 3.0, 0.4, 0.01, 0xffffff, { uv: board, face: 4, edges: false });
  spots.push({ id: 'hosp_board', kind: 'clue', clue: 'board', x: -6.0, z: 0.2, r: 1.2, label: '病室の札（ホワイトボード）' });
  B.box('prop', -9.6, 1.5, -0.8, 0.6, 0.7, 0.12, 0x6a6a72); B.box('prop', -9.6, 1.5, -0.73, 0.5, 0.6, 0.02, 0x9a9aa2, { edges: false });
  spots.push({ id: 'hosp_keybox', kind: 'keybox', x: -9.6, z: 0.2, r: 1.1, label: '鍵箱（病室の鍵）' });
  B.box('prop', -5.5, 0.38, 4.6, 2.4, 0.76, 1.0, 0xc8c0b0); solid(-5.5, 4.6, 2.4, 1.0, 0.8);
  B.box('prop', -5.5, 0.95, 4.6, 0.6, 0.38, 0.05, 0x1a1a22, { edges: false }); B.box('glow', -5.5, 0.96, 4.57, 0.52, 0.3, 0.01, 0x8ab8e0, { edges: false });
  halos.push({ p: [-5.5, 0.96, 4.4], size: 0.9, color: 0x8ab8e0, k: 0.4 });
  spots.push({ id: 'hosp_pc', kind: 'save', x: -5.5, z: 3.7, r: 1.1, label: 'ナースステーションのパソコン（セーブ）' });
  B.box('prop', -3.4, 0.5, 6.8, 1.4, 1.0, 0.6, 0x9aa0a8); solid(-3.4, 6.8, 1.4, 0.6, 1.0);   // カート
  const ns = atlas.add(signDraw('ナースステーション', { bg: '#e8f4f0', fg: '#1a5a4a', size: 34 }));
  B.box('sign', -2.05, 3.05, 4.8, 0.05, 0.4, 2.6, 0xffffff, { uv: ns, face: 1, edges: false });
  // ── 処置室（x 2〜12、z −1〜8・任意）：看護記録・落とし物（子ども用の携帯）・白衣の名札 ──
  B.box('prop', 8.5, 0.45, 5.6, 2.0, 0.9, 0.9, 0xe0e4e8); solid(8.5, 5.6, 2.0, 0.9, 0.9);
  B.box('prop', 11.6, 1.0, 2.0, 0.6, 2.0, 2.4, 0xd8dce0); solid(11.6, 2.0, 0.6, 2.4, 2.0);
  B.box('prop', 5.0, 0.4, 1.6, 1.0, 0.8, 1.9, 0xe8ecea); solid(5.0, 1.6, 1.0, 1.9, 0.8);
  spots.push({ id: 'hosp_treat', kind: 'treat', x: 8.4, z: 4.7, r: 1.2, label: '処置室の机（看護記録・落とし物）' });
  const tr = atlas.add(signDraw('処置室', { bg: '#e8f0f4', fg: '#203a5a', size: 36 }));
  B.box('sign', 2.05, 3.05, 1.7, 0.05, 0.36, 1.2, 0xffffff, { uv: tr, face: 0, edges: false });
  // ── 病室 301〜306：ベッド・カーテン・点滴の柱・床頭台（インスタンス） ──
  const rooms = { 301: [-7, -4], 302: [-7, -10], 303: [-7, -16], 304: [7, -4], 305: [7, -10], 306: [7, -16] };
  const beds = [], curtains = [], drips = [], lockers = [];
  for (const [no, [cx, cz]] of Object.entries(rooms)) {
    const sx = Math.sign(cx);
    const ry = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (no === '306') beds.push({ x: cx + sx * 2.6, z: cz - 1.2, ry });
    else for (const dz of [-1.5, 1.5]) beds.push({ x: cx + sx * 2.7, z: cz + dz, ry });
    for (const dz of [-1.5, 1.5]) curtains.push({ x: cx + sx * 0.9, z: cz + dz, ry: 0, color: [0xa8d0c8, 0xc8d8b0, 0xb8c8e0][Math.abs(cz) % 3] });
    drips.push({ x: cx + sx * 3.6, z: cz + 2.4 }); lockers.push({ x: cx + sx * 4.4, z: cz - 2.4 });
    const pl = atlas.add(plateDraw(no, { 301: '東', 302: '西川', 303: '北原', 304: '南', 305: '日向', 306: '小野寺' }[no]));
    B.box('sign', sx * 2.17, 2.55, cz + 1.2, 0.03, 0.28, 0.9, 0xffffff, { uv: pl, face: sx > 0 ? 1 : 0, edges: false });
    B.box('glass', sx * 12.0, 2.0, cz, 0.05, 1.5, 3.2, 0x182436, { edges: false });
  }
  const bed = [[0, 0.5, 0, 0.95, 0.16, 2.0, 0xe8ecec], [0, 0.32, 0, 0.9, 0.08, 1.9, 0x9aa0a8], [0, 0.85, -0.95, 0.95, 0.6, 0.06, 0xb0b8c0], [0, 0.6, 0.98, 0.95, 0.3, 0.05, 0xb0b8c0], [0, 0.62, -0.7, 0.6, 0.12, 0.35, 0xf8f8f4], [0, 0.6, 0.25, 0.92, 0.1, 1.2, 0xa8c8d0]];
  root.add(instanced(bed, beds, { name: 'beds', shadow: true }));
  for (const b of beds) solid(b.x, b.z, 2.0, 1.0, 0.7);
  root.add(instanced([[0, 1.25, 0, 0.03, 2.1, 1.3, 0xffffff], [0, 2.35, 0, 0.04, 0.04, 1.4, 0xb0b4b8]], curtains, { name: 'curtains' }));
  root.add(instanced([[0, 1.0, 0, 0.03, 2.0, 0.03, 0xb8bcc4], [0, 1.85, 0, 0.14, 0.22, 0.06, 0xd8f0f0], [0, 0.04, 0, 0.5, 0.04, 0.04, 0x6a6e76], [0, 0.04, 0, 0.04, 0.04, 0.5, 0x6a6e76]], drips, { name: 'drips' }));
  root.add(instanced([[0, 0.45, 0, 0.5, 0.9, 0.45, 0xd8d0c0], [0, 0.92, 0, 0.52, 0.04, 0.47, 0xb8b0a0]], lockers, { name: 'bedside' }));
  for (const l of lockers) solid(l.x, l.z, 0.5, 0.45, 0.9);
  // 小児病棟の飾り：壁の子どもの絵・星の飾り・「小児病棟」の札
  for (let i = 0; i < 3; i++) { const u = atlas.add(kidsDrawing(i + 1)); B.box('sign', 11.98, 1.5, -12.2 - i * 1.2, 0.02, 0.38, 0.9, 0xffffff, { uv: u, face: 1, edges: false }); }
  const ped = atlas.add(signDraw('小児病棟（305・306）', { bg: '#fff4d8', fg: '#c05a20', size: 32, frameColor: '#f0a040' }));
  B.box('sign', 0, 3.05, -8.6, 2.6, 0.36, 0.05, 0xffffff, { uv: ped, face: 4, edges: false });
  for (let i = 0; i < 6; i++) B.box('glow', 4 + i * 1.2, 3.2, -13.2 - (i % 2) * 0.4, 0.12, 0.12, 0.02, [0xffd060, 0xff9ac8, 0x9ad8ff][i % 3], { edges: false });
  // 306 の戸（鍵）：閉じている間は当たり判定
  const doorMat = new THREE.MeshToonMaterial({ color: 0x8ab0a8, gradientMap: gradientMap() });
  const d306 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.4), doorMat); d306.position.set(2.0, 1.1, -16.0); d306.castShadow = true; root.add(d306);
  const dbox = cbox(2.0, -16.0, 0.35, 1.4, 2.4); boxes.push(dbox);
  dyn.door306 = { mesh: d306, box: dbox, open: false };
  spots.push({ id: 'door_306', kind: 'hdoor', x: 1.0, z: -16.0, r: 1.2, label: '306 号室の戸' });
  B.box('glow', 2.0, 2.4, -15.1, 0.06, 0.08, 0.08, 0xff6040, { edges: false }); const dh = halos.push({ p: [1.9, 2.4, -15.1], size: 0.5, color: 0xff6040, k: 0.7 }) - 1; dyn.door306.halo = dh;
  // 照明のスイッチ（病棟）：落とすと戦っていない患者は眠る（無力化）
  B.box('prop', -1.86, 1.3, -6.2, 0.04, 0.16, 0.1, 0xe8e8e0, { edges: false }); B.box('glow', -1.83, 1.32, -6.2, 0.02, 0.04, 0.04, 0x40ff80, { edges: false });
  spots.push({ id: 'hosp_switch', kind: 'wardswitch', x: -1.2, z: -6.2, r: 1.0, label: '病棟の照明のスイッチ' });
  // 階段（北西：地下 1 階へ）
  for (let k = 0; k < 6; k++) B.box('prop', -10.2, 0.02 + k * 0.0, -20.0 - k * 0.5, 3.2, 0.04, 0.46, k % 2 ? 0x5a5e60 : 0x6a6e70, { edges: false });
  B.box('prop', -10.2, 1.0, -19.4, 3.2, 0.06, 0.06, 0xd8d0b8, { edges: false });
  const ex = atlas.add(signDraw('非常口　階段（地下 1 階）', { bg: '#1a8a3a', fg: '#ffffff', size: 28 }));
  B.box('glow', -2.05, 2.75, -21.5, 0.06, 0.36, 1.2, 0x30ff60, { edges: false }); B.box('sign', -2.1, 2.75, -21.5, 0.03, 0.3, 1.1, 0xffffff, { uv: ex, face: 1, edges: false });
  halos.push({ p: [-1.8, 2.75, -21.5], size: 1.2, color: 0x30ff60, k: 0.5 });
  spots.push({ id: 'exit_tunnel', kind: 'exit', to: 'tunnel', spawn: 'from_hospital', x: -9.8, z: -21.6, r: 1.3, label: '地下 1 階へ（地下通路）', auto: true, needFlag: 'child_saved', lockedText: 'hosp_stairs_locked' });
  spots.push({ id: 'exit_shelter', kind: 'exit', to: 'shelter', spawn: 'from_hospital', x: -15.6, z: 28.0, r: 1.3, label: '避難所へ戻る（連絡通路）', auto: true });
  // ── フェーズ10：病院の外（正面玄関の前・車寄せ・外観・連絡通路の口） ──
  const EXT = buildHospitalFront(B, atlas, boxes, spots, halos, hideSpots);
  hideSpots.push({ x: -8.6, z: 12.6 }, { x: 8.6, z: 12.6 }, { x: -4.4, z: 2.4 }, { x: 4.6, z: 3.6 }, { x: -9.0, z: -5.5 }, { x: 9.0, z: -9.0 }, { x: -9, z: -15 });
  // 明かり：ロビー 3・受付・廊下の蛍光灯 6（いくつかは消え・ちらつく）・病室の常夜灯・非常灯
  const lights = [
    { id: 'lob1', pos: [-6, 3.0, 14], color: 0xe0ecff, intensity: 6, dist: 11 },
    { id: 'lob2', pos: [6, 3.0, 14], color: 0xe0ecff, intensity: 5, dist: 11, flicker: true },
    { id: 'lob3', pos: [0, 3.0, 17], color: 0xd0e0ff, intensity: 4, dist: 9 },
    { id: 'rcp', pos: [0, 2.3, 11.8], color: 0xffd8a8, intensity: 6, dist: 6 },
    { id: 'c1', pos: [0, 3.4, 5], color: 0xd8f0f0, intensity: 5, dist: 8, ward: true },
    { id: 'c2', pos: [0, 3.4, -2], color: 0xd8f0f0, intensity: 4.5, dist: 8, ward: true, flicker: true },
    { id: 'c3', pos: [0, 3.4, -9], color: 0xd8f0f0, intensity: 4, dist: 8, ward: true },
    { id: 'c4', pos: [0, 3.4, -15], color: 0xd8f0f0, intensity: 3.5, dist: 7, ward: true, flicker: true },
    { id: 'c5', pos: [0, 3.4, -21], color: 0xd8f0f0, intensity: 3, dist: 7, ward: true },
    { id: 'ns', pos: [-6, 1.6, 4.2], color: 0xffd8a0, intensity: 3.5, dist: 6 },
    { id: 'n306', pos: [9.5, 2.4, -16], color: 0x8aa0ff, intensity: 2.5, dist: 7 },
    { id: 'n302', pos: [-9.5, 2.4, -10], color: 0x6ac0a0, intensity: 1.6, dist: 5 },
    { id: 'emg', pos: [-2.4, 2.7, -21.5], color: 0x30ff60, intensity: 2, dist: 5 },
  ].concat(EXT.lights).map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (l.id[0] === 'c' || l.id.startsWith('lob')) { B.box('glow', l.pos[0], H - 0.04, l.pos[2], l.id[0] === 'c' ? 0.3 : 1.6, 0.05, l.id[0] === 'c' ? 1.6 : 0.4, 0xf4fbff, { edges: false }); halos.push({ p: [l.pos[0], H - 0.15, l.pos[2]], size: 1.0, color: l.color, k: 0.45, light: l }); }
  const wet = lights.filter(l => l.id[0] === 'c').map(l => ({ p: [l.pos[0], 0, l.pos[2]], size: 1.4, color: l.color, k: 0.28, light: l.id })).concat(EXT.wet);
  // 光の筋（窓の月明かり・蛍光灯の下）
  const shafts = [];
  for (const [no, [cx, cz]] of Object.entries(rooms)) { const sx = Math.sign(cx); shafts.push({ p: [sx * 11.9, 2.6, cz], dir: [-sx * 0.75, -0.6, 0.15], len: 4.2, w0: 1.4, w1: 2.6, color: no === '306' ? 0x9ab0ff : 0x7a90d0, k: no === '306' ? 0.5 : 0.28 }); }
  for (const l of lights.filter(l => l.id[0] === 'c' && !l.flicker)) shafts.push({ p: [l.pos[0], H - 0.06, l.pos[2]], dir: [0, -1, 0], len: 3.2, w0: 1.0, w1: 2.2, color: 0xc8e8f0, k: 0.12 });
  shafts.push({ p: [0, 2.6, 19.4], dir: [0, -0.55, -0.85], len: 5, w0: 1.6, w1: 2.6, color: 0x8a9ad8, k: 0.1 });
  root.add(lightShafts(shafts));
  // しみ・汚れ（床・壁）
  const sr = rngOf(23), st = [];
  for (let i = 0; i < 14; i++) st.push({ p: [(sr() - 0.5) * 3.2, 0, 6 - sr() * 28], n: 'floor', size: 0.6 + sr() * 1.2, kind: [0, 1, 3, 4, 5][Math.floor(sr() * 5)], rot: sr() * 6, k: 0.75 });
  for (let i = 0; i < 8; i++) st.push({ p: [(sr() - 0.5) * 18, 0, 10 + sr() * 8], n: 'floor', size: 0.5 + sr(), kind: [1, 3, 4][Math.floor(sr() * 3)], rot: sr() * 6, k: 0.6 });
  for (let i = 0; i < 10; i++) { const side = sr() < 0.5 ? -1 : 1; st.push({ p: [side * 1.83, 0.4 + sr() * 2.4, 6 - sr() * 28], n: side < 0 ? '+x' : '-x', size: 0.5 + sr() * 0.9, kind: [0, 2, 7, 0][Math.floor(sr() * 4)], rot: sr() * 0.6, k: 0.6 }); }
  for (let i = 0; i < 4; i++) st.push({ p: [-6 + i * 4, H - 0.01, 2 - i * 6], n: 'ceil', size: 1.2, kind: 0, rot: sr() * 6, k: 0.5 });
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('hospital', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: (x, z) => (z < 19.7 ? 'tile' : 'wet'), rainRoof: (x, z) => z < 19.8 || EXT.roof(x, z), indoor: (x, z) => z < 19.7,
    bounds: { minX: -17, maxX: 17, minZ: -24.4, maxZ: 34 }, spawns: { from_shelter: [-13.4, 28.2, 2.15], lobby: [0, 17.4, Math.PI], from_tunnel: [-9.0, -20.0, 0], ward: [0, -12, Math.PI], room306: [3.4, -16.0, -Math.PI / 2] },
    // フェーズ10：受付が霧で白く飛ばないように（霧を薄く暗く・空の明かりを弱く）
    fog: { color: 0x0a1014, density: 0.028 }, light: { hemi: 0.62, amb: 0.34 }, fogAt: (x, z) => (z > 19.8 ? 0.034 : 0.028), rain: true, amb: 'hospital', rooms,
  });
}

/** フェーズ10：病院の正面（外）。外観（上の階のガラスの帯・名前の灯り）・車寄せの屋根と柱・自動ドア・救急車・バス停・植え込み・連絡通路の口。
 *  名前は仮（区画の名前と同じ「あけぼの台中央病院（仮）」）。赤十字の印は使わない。 */
function buildHospitalFront(B, atlas, boxes, spots, halos, hideSpots) {
  const solid = (cx, cz, w, d, h = 3, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const lights = [], wet = [];
  // 地面：敷石の前庭・車の道（アスファルト）・縁石
  B.box('tex', 0, -0.06, 27, 34, 0.12, 14.6, 0xffffff, { tile: 'paving', ts: 2.2, edges: false });
  B.box('tex', 0, -0.05, 29.6, 34, 0.12, 6.4, 0xffffff, { tile: 'asphalt', ts: 6, edges: false });
  for (const z of [26.4, 32.8]) B.box('tex', 0, 0.08, z, 34, 0.18, 0.22, 0xd0ccc4, { tile: 'curb', ts: 2, edges: false });
  for (let x = -14; x <= 14; x += 3.4) B.box('prop', x, 0.012, 29.6, 1.6, 0.02, 0.12, 0xe8e6de, { edges: false });
  // 外観：1 階の外壁（玄関の左右・明るいロビーの窓）・上の階（ガラスの帯）・屋上の名前
  for (const s2 of [-1, 1]) {
    const cx = s2 * 7.6;
    B.box('tex', cx, 2.0, 19.92, 12.6, 4.0, 0.2, 0xb8c0c4, { tile: 'panel', ts: 3, edges: true });
    B.box('texglow', cx, 1.6, 20.04, 9, 2.2, 0.06, 0x9ab0c0, { tile: 'win_office_lit', ts: 2.6, tsy: 2.2, edges: false });
  }
  B.box('tex', 0, 3.6, 19.92, 2.6, 0.8, 0.2, 0xb8c0c4, { tile: 'panel', ts: 3, edges: false });
  B.box('tex', 0, 12.0, 2.0, 30, 16, 36, 0xa8b0b4, { tile: 'panel', ts: 3.2, edges: true });   // 上の階（ロビーの天井より上）
  for (let k = 0; k < 4; k++) { const y = 5.6 + k * 3.4, lit = k === 1 || k === 3; B.box(lit ? 'texglow' : 'tex', 0, y, 20.04, 27, 2.2, 0.06, lit ? 0xa8b8c8 : 0xffffff, { tile: lit ? 'curtainwall_lit' : 'curtainwall', ts: 2.4, tsy: 2.2, edges: false }); B.box('prop', 0, y - 1.5, 20.1, 30, 0.3, 0.3, 0x6a7276, { edges: false }); }
  for (const x of [-15.02, 15.02]) for (let k = 0; k < 4; k++) B.box('texglow', x, 5.6 + k * 3.4, 10, 0.06, 2.0, 16, k % 2 ? 0xa8b8c8 : 0x7a8a98, { tile: k % 2 ? 'win_office_lit' : 'win_office', ts: 2.6, tsy: 2, edges: false });
  const nm = atlas.add(signDraw('あけぼの台中央病院（仮）', { bg: '#0e1a22', fg: '#e8fff8', size: 44, frameColor: '#4a9a8a' }));
  B.box('sign', 0, 18.4, 20.15, 16, 1.6, 0.2, 0xffffff, { uv: nm, face: 4, edges: false });
  halos.push({ p: [0, 18.4, 21.2], size: 9, color: 0xc8fff0, k: 0.28 });
  // 車寄せの屋根（柱 2 本）・灯り・名前と「正面玄関」・自動ドアの上の灯り
  B.box('prop', 0, 4.15, 23.8, 16, 0.3, 8.0, 0x8a9296, { edges: false }); B.box('prop', 0, 3.95, 27.75, 16.2, 0.5, 0.2, 0x4a5256, { edges: false });
  for (const x of [-7.4, 7.4]) { B.box('wall', x, 2.0, 27.4, 0.5, 4.0, 0.5, 0x9aa2a6); solid(x, 27.4, 0.5, 0.5, 4); }
  const fu = atlas.add(signDraw('あけぼの台中央病院（仮）　正面玄関', { bg: '#f2f6f6', fg: '#1a4a5a', size: 34, frameColor: '#3a7a8a' }));
  B.box('sign', 0, 3.95, 27.87, 9, 0.42, 0.04, 0xffffff, { uv: fu, face: 4, edges: false });
  for (const [x, z] of [[-4.5, 21.6], [4.5, 21.6], [-4.5, 25.4], [4.5, 25.4], [0, 23.5]]) { B.box('glow', x, 3.98, z, 0.9, 0.04, 0.9, 0xf4fbff, { edges: false }); halos.push({ p: [x, 3.8, z], size: 1.8, color: 0xe8f4ff, k: 0.5 }); wet.push({ p: [x, 0, z + 3.5], size: 1.6, color: 0xe8f4ff, k: 0.55 }); }
  lights.push({ id: 'front1', pos: [-3, 3.6, 23.5], color: 0xe8f4ff, intensity: 6, dist: 11, town: true }, { id: 'front2', pos: [3.5, 3.6, 24], color: 0xe8f4ff, intensity: 5, dist: 10, town: true });
  const gu = atlas.add(signDraw('正面玄関　自動ドア', { bg: '#1a3a4a', fg: '#ffffff', size: 32 }));
  B.box('sign', 0, 3.1, 20.06, 2.4, 0.4, 0.04, 0xffffff, { uv: gu, face: 4, edges: false });
  // 夜間・救急の案内・救急車（白に橙の帯。赤十字の印は描かない）
  prop(B, 10.8, 1.2, 32.6, 0.08, 2.4, 0.08, 0x8a8a8a);
  const qu = atlas.add(signDraw('夜間・救急入口　→', { bg: '#a01818', fg: '#ffffff', size: 34 }));
  B.box('sign', 10.8, 2.2, 32.66, 1.8, 0.42, 0.04, 0xffffff, { uv: qu, face: 4, edges: false }); halos.push({ p: [10.8, 2.2, 33.0], size: 1.6, color: 0xff5040, k: 0.4 });
  { const x = 11.2, z = 23.2; B.box('prop', x, 1.2, z, 2.0, 1.7, 5.4, 0xeef0f0); B.box('prop', x, 0.95, z + 2.8, 1.9, 1.0, 0.3, 0xeef0f0); B.box('glass', x, 1.65, z + 2.75, 1.7, 0.6, 0.06, 0x101418, { edges: false }); B.box('prop', x, 1.05, z, 2.02, 0.22, 5.42, 0xe86a20); B.box('glow', x, 2.15, z + 1.6, 1.0, 0.16, 0.3, 0x601010, { edges: false });
    for (const [wx, wz] of [[-0.9, 1.7], [0.9, 1.7], [-0.9, -1.8], [0.9, -1.8]]) { const g = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 12); g.rotateZ(Math.PI / 2); g.translate(x + wx, 0.38, z + wz); B.add('prop', g, 0x18181c); }
    const au = atlas.add(signDraw('救急', { bg: '#eef0f0', fg: '#c02a1a', size: 44, frame: false })); B.box('sign', x - 1.02, 1.5, z - 0.4, 0.02, 0.5, 1.6, 0xffffff, { uv: au, face: 1, edges: false });
    solid(x, z + 0.2, 2.1, 6.0, 2.2); hideSpots.push({ x: x - 1.8, z: z - 3.4 }); }
  // バス停（病院前）・植え込み・ベンチ・低い柵（まわりを閉じる）
  { const x = -6, z = 33.2; for (const dx of [-1.4, 1.4]) prop(B, x + dx, 1.2, z, 0.08, 2.4, 0.08, 0x5a6068); B.box('glass2', x, 2.4, z - 0.3, 3.2, 0.05, 1.2, 0x7088a8, { edges: false }); B.box('glow', x, 2.34, z - 0.3, 1.6, 0.03, 0.2, 0xe8f0ff, { edges: false }); halos.push({ p: [x, 2.2, z - 0.4], size: 1.6, color: 0xd8e8ff, k: 0.45 });
    const bu = atlas.add(signDraw('バス停　病院前（仮）', { bg: '#2a5aa8', fg: '#ffffff', size: 30 })); B.box('sign', x + 1.9, 2.5, z - 0.1, 0.9, 0.5, 0.04, 0xffffff, { uv: bu, face: 4, edges: false }); prop(B, x + 1.9, 1.3, z - 0.1, 0.07, 2.6, 0.07, 0x8a8a8a);
    solid(x, z + 0.05, 3.2, 0.3, 2.4); }
  for (const [x, z] of [[-10.5, 22.2], [-4.2, 21.6]]) { B.box('tex', x, 0.4, z, 2.4, 0.8, 1.2, 0xffffff, { tile: 'stone', ts: 0.8, edges: false }); const c = new THREE.IcosahedronGeometry(0.7, 1); c.scale(1.4, 0.7, 0.7); c.translate(x, 1.1, z); B.add('prop', c, 0x3a6a4a); solid(x, z, 2.4, 1.2, 1.0); }
  for (const [x, z] of [[-11.5, 32.6], [3.5, 32.6]]) { B.box('prop', x, 0.45, z, 1.6, 0.07, 0.45, 0x8a6a4a); for (const dx of [-0.65, 0.65]) prop(B, x + dx, 0.22, z, 0.06, 0.45, 0.4, 0x3a3a3a); solid(x, z, 1.6, 0.5, 0.8); }
  B.box('tex', 0, 0.6, 34.15, 34, 1.2, 0.1, 0xffffff, { tile: 'fence', ts: 1.1, edges: false }); solid(0, 34.15, 34, 0.3, 1.4);
  for (const x of [-17.05, 17.05]) { B.box('tex', x, 4.5, 27, 0.2, 9, 14.6, 0x8a8c90, { tile: 'mortar', ts: 2, edges: false }); solid(x, 27, 0.3, 14.6, 6); }
  // 向こうの町（霧の中の灯り）
  for (const [x, z, h] of [[-12, 44, 9], [4, 46, 14], [16, 42, 7]]) { B.box('tex', x, h / 2, z, 9, h, 6, 0x6a6e74, { tile: 'panel', ts: 3, edges: false }); B.box('texglow', x, h * 0.6, z - 3.04, 6, 1.2, 0.06, 0xb8a888, { tile: 'win_office_lit', ts: 2.4, tsy: 1.2, edges: false }); }
  // 連絡通路（避難所へ）の口：屋根・柱・案内
  { const x0 = -17, x1 = -12.2, z0 = 24.6, z1 = 31.4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.box('prop', cx, 3.0, cz, x1 - x0, 0.2, z1 - z0, 0x7a8288, { edges: false });
    for (const [x, z] of [[x1 - 0.2, z0 + 0.2], [x1 - 0.2, z1 - 0.2]]) { prop(B, x, 1.5, z, 0.15, 3.0, 0.15, 0x5a6068); solid(x, z, 0.2, 0.2, 3); }
    B.box('glow', cx, 2.86, cz, 2.4, 0.04, 0.3, 0xe8f0ff, { edges: false }); halos.push({ p: [cx, 2.7, cz], size: 1.6, color: 0xe8f0ff, k: 0.5 });
    const cu = atlas.add(signDraw('連絡通路　避難所（体育館）へ', { bg: '#1a3a2a', fg: '#e8fff0', size: 30 })); B.box('sign', x1 + 0.05, 2.4, cz, 0.04, 0.42, 3.0, 0xffffff, { uv: cu, face: 0, edges: false });
    B.box('glow', x0 + 0.3, 1.2, cz, 0.06, 2.4, 2.4, 0x101814, { edges: false }); }
  hideSpots.push({ x: -8.0, z: 27.4 }, { x: 8.0, z: 27.0 });
  spots.push({ id: 'hosp_front', kind: 'read', x: 0, z: 22.6, r: 1.4, label: '正面玄関の案内', text: 'hosp_front' });
  const roof = (x, z) => (x > -8 && x < 8 && z > 19.7 && z < 27.8) || (x < -12.2 && z > 24.6 && z < 31.4);
  return { lights, wet, roof };
}
const prop = (B, x, y, z, w, h, d, c) => B.box('prop', x, y, z, w, h, d, c, { edges: false });

// ───────────────────────── 地下通路 ─────────────────────────
export function buildTunnel() {
  const root = new THREE.Group(); root.name = 'area_tunnel';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 4, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const wall = (cx, cz, w, d, h, c) => { B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  const C1 = 0x6a6a68, C2 = 0x5a5a5c, C3 = 0x7a7470, H = 3.4;
  const gt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,20,22' : '110,108,104'},${Math.random() * 0.25})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 4); }
    g.strokeStyle = 'rgba(20,20,20,.35)'; g.lineWidth = 2; for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(8, 16);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(26, 50), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(2.5, 0, -20); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  B.box('wall', 2.5, H + 0.1, -20, 26, 0.2, 50, 0x3a3a3c, { edges: false });
  // 階段の下（z 3〜−2）・通路（x ±2.6、z −2〜−22）・広場（x ±8.6、z −22〜−43）・詰所（x 8.6〜14、z −26〜−32）
  wall(0, 3.3, 7, 0.4, H, C1); wall(-3.3, 0.6, 0.4, 5.4, H, C1); wall(3.3, 0.6, 0.4, 5.4, H, C1);
  wall(-2.8, -4.0, 0.4, 4.4, H, C2); wall(-2.8, -15.8, 0.4, 12.4, H, C2);         // 西（くぼみ z −6.2〜−9.6）
  wall(-5.0, -7.9, 0.4, 3.8, H, C2); wall(-3.9, -5.9, 2.2, 0.4, H, C2); wall(-3.9, -9.9, 2.2, 0.4, H, C2);
  wall(2.8, -3.1, 0.4, 2.6, H, C3); wall(2.8, -14.1, 0.4, 15.8, H, C3);            // 東（くぼみ z −4.4〜−6.2）
  wall(4.4, -5.3, 0.4, 2.2, H, C3); wall(3.6, -4.2, 1.6, 0.4, H, C3); wall(3.6, -6.4, 1.6, 0.4, H, C3);
  wall(-5.7, -22.0, 6.2, 0.4, H, C1); wall(5.7, -22.0, 6.2, 0.4, H, C1);
  wall(-8.8, -32.5, 0.4, 21, H, C2); wall(8.8, -23.9, 0.4, 3.8, H, C3); wall(8.8, -37.1, 0.4, 13.4, H, C3);   // 東：z −25.8〜−30.4 が詰所の口
  wall(-5.2, -43.2, 7.6, 0.4, H, C1); wall(5.2, -43.2, 7.6, 0.4, H, C1); B.box('wall', 0, H - 0.4, -43.2, 2.8, 0.8, 0.4, C1);
  wall(11.4, -25.6, 5.2, 0.4, H, C1); wall(11.4, -32.4, 5.2, 0.4, H, C1); wall(14.2, -29, 0.4, 7.2, H, C1);   // 詰所
  // 配管（壁沿い：インスタンス）・ケーブルの棚・柱・がれき
  const pipe = [[0, 0, 0, 0.16, 0.16, 1.98, 0x7a6a5a], [0, 0.3, 0, 0.1, 0.1, 1.98, 0x5a6a7a], [0, 0, 0.95, 0.24, 0.24, 0.08, 0x4a4a4a]];
  const pipes = []; for (let z = -1; z > -21; z -= 2) { pipes.push({ x: -2.45, y: 2.5, z }); pipes.push({ x: 2.45, y: 2.7, z }); }
  for (let z = -23; z > -42; z -= 2) { pipes.push({ x: -8.45, y: 2.6, z }); pipes.push({ x: 8.45, y: 2.8, z: z < -30.4 || z > -25.8 ? z : -99 }); }
  root.add(instanced(pipe, pipes.filter(p => p.z > -90), { name: 'pipes' }));
  B.box('prop', 0, 3.1, -12, 1.2, 0.06, 20, 0x3a3a3e, { edges: false });
  for (const [x, z] of [[-4.6, -27], [4.6, -27], [-4.6, -37.5], [4.6, -37.5]]) { B.box('wall', x, H / 2, z, 0.8, H, 0.8, 0x8a8682); solid(x, z, 0.8, 0.8, H); }
  for (const [x, z, w, h, d, c] of [[-7.2, -40.6, 1.4, 0.6, 1.0, 0x5a5048], [6.8, -23.6, 1.0, 0.8, 1.4, 0x6a5a48], [-7.4, -29, 0.9, 0.5, 1.6, 0x4a4a50], [7.6, -41.2, 1.2, 1.1, 0.9, 0x5a5a62]]) { B.box('prop', x, h / 2, z, w, h, d, c); solid(x, z, w, d, h); }
  // 詰所の防火シャッター（開いている → 演出で閉まる）
  const shut = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 4.6), new THREE.MeshToonMaterial({ color: 0xa04a3a, gradientMap: gradientMap() }));
  shut.position.set(8.8, H / 2 + H - 0.3, -28.1); shut.castShadow = true; root.add(shut);
  dyn.refugeShutter = { mesh: shut, up: H / 2 + H - 0.3, down: H / 2, target: H / 2 + H - 0.3, box: cbox(8.8, -28.1, 0.3, 4.6, H) };
  const tsume = atlas.add(signDraw('詰所（防火シャッター）', { bg: '#e8e0d0', fg: '#8a2a1a', size: 30 }));
  B.box('sign', 8.55, 3.0, -28.1, 0.04, 0.32, 1.6, 0xffffff, { uv: tsume, face: 1, edges: false });
  spots.push({ id: 'refuge', kind: 'refuge', x: 7.6, z: -28.1, r: 1.4, label: '詰所のシャッター' });
  // 非常電話（セーブ）・案内板・北の階段
  B.box('prop', 2.5, 1.3, -20.8, 0.12, 0.5, 0.36, 0xd8c040); B.box('prop', 2.42, 1.35, -20.8, 0.04, 0.2, 0.12, 0x2a2a2a, { edges: false });
  spots.push({ id: 'tun_phone', kind: 'save', x: 1.6, z: -20.6, r: 1.1, label: '非常電話（セーブ）' });
  const guide = atlas.add(signDraw('↑ 市民体育館（避難所）　↓ 病院', { bg: '#1a3a2a', fg: '#e8ffe8', size: 28 }));
  B.box('sign', -2.58, 2.2, -12, 0.03, 0.34, 2.4, 0xffffff, { uv: guide, face: 0, edges: false });
  for (let k = 0; k < 5; k++) B.box('prop', 0, 0.12 + k * 0.0, -43.6 - k * 0.0, 2.6, 0.24, 0.4, 0x5a5a5c);
  spots.push({ id: 'exit_shelter', kind: 'exit', to: 'shelter', spawn: 'from_tunnel', x: 0, z: -42.6, r: 1.2, label: '階段（避難所のロビーへ）', auto: true, needFlag: 'tunnel_clear', lockedText: 'tunnel_locked' });
  spots.push({ id: 'exit_hospital', kind: 'exit', to: 'hospital', spawn: 'from_tunnel', x: 0, z: 2.6, r: 1.2, label: '階段（病院へ戻る）', auto: true });
  hideSpots.push({ x: -3.9, z: -7.9 }, { x: 3.6, z: -5.3 }, { x: -5.4, z: -27.5 }, { x: 5.4, z: -37.8 }, { x: 11, z: -29 });
  // 明かり：かごの電球（いくつかは消え）・非常灯・詰所
  const lights = [
    { id: 'b0', pos: [0, 3.0, 0.5], color: 0xffd8a0, intensity: 4, dist: 7 },
    { id: 'b1', pos: [0, 3.0, -6], color: 0xffd8a0, intensity: 3.5, dist: 7, flicker: true },
    { id: 'b2', pos: [0, 3.0, -13], color: 0xffd8a0, intensity: 3, dist: 6.5 },
    { id: 'b3', pos: [0, 3.0, -19.5], color: 0xffd8a0, intensity: 3.5, dist: 7 },
    { id: 'g1', pos: [0, 3.0, -27], color: 0xd0d8ff, intensity: 6, dist: 11 },
    { id: 'g2', pos: [0, 3.0, -37], color: 0xd0d8ff, intensity: 5, dist: 11, flicker: true },
    { id: 'emg', pos: [0, 2.6, -42.6], color: 0x30ff60, intensity: 2.5, dist: 6 },
    { id: 'ref', pos: [11.4, 2.6, -29], color: 0xffc080, intensity: 3, dist: 6 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) { B.box('glow', l.pos[0], l.pos[1] + 0.12, l.pos[2], 0.16, 0.2, 0.16, l.color, { edges: false }); halos.push({ p: [l.pos[0], l.pos[1], l.pos[2]], size: l.id[0] === 'g' ? 2.4 : 1.2, color: l.color, k: 0.7, light: l }); }
  const wet = lights.filter(l => l.id !== 'ref').map(l => ({ p: [l.pos[0] + 0.3, 0, l.pos[2] + 0.4], size: 1.6, color: l.color, k: 0.55, light: l.id }));
  // 光の筋（天井の格子から：避難所の非常灯の光が落ちてくる）
  const shafts = [{ p: [-3.0, H, -32], dir: [0.1, -1, 0.05], len: 3.4, w0: 0.7, w1: 1.6, color: 0xb0b8ff, k: 0.35 }, { p: [3.4, H, -33.5], dir: [-0.05, -1, 0.1], len: 3.4, w0: 0.6, w1: 1.4, color: 0xb0b8ff, k: 0.3 }, { p: [0.5, H, -9], dir: [0, -1, 0], len: 3.2, w0: 0.5, w1: 1.2, color: 0xd8c8a0, k: 0.22 }];
  for (const s of shafts) B.box('prop', s.p[0], H - 0.02, s.p[2], 0.9, 0.04, 0.9, 0x2a2a2c, { edges: false });
  root.add(lightShafts(shafts));
  const sr = rngOf(37), st = [];
  for (let i = 0; i < 18; i++) st.push({ p: [(sr() - 0.5) * 4, 0, -sr() * 22], n: 'floor', size: 0.8 + sr() * 1.6, kind: [5, 1, 3, 6][Math.floor(sr() * 4)], rot: sr() * 6, k: 0.8 });
  for (let i = 0; i < 16; i++) st.push({ p: [(sr() - 0.5) * 15, 0, -23 - sr() * 19], n: 'floor', size: 1 + sr() * 2, kind: [5, 1, 6][Math.floor(sr() * 3)], rot: sr() * 6, k: 0.8 });
  for (let i = 0; i < 12; i++) { const side = sr() < 0.5 ? -1 : 1; st.push({ p: [side * 2.58, 0.3 + sr() * 2.2, -1 - sr() * 20], n: side < 0 ? '+x' : '-x', size: 0.6 + sr(), kind: [0, 2, 1][Math.floor(sr() * 3)], rot: sr(), k: 0.75 }); }
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('tunnel', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: () => 'wet', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -8.6, maxX: 14, minZ: -43, maxZ: 3.1 }, spawns: { from_hospital: [0, 1.2, Math.PI], from_shelter: [0, -41.6, 0], arena: [0, -24.5, Math.PI] },
    fog: { color: 0x0a0a10, density: 0.06 }, rain: false, amb: 'tunnel',
  });
}

BUILDERS3.hospital = buildHospital;
BUILDERS3.tunnel = buildTunnel;
