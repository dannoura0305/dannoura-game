// 第4章の区画【仮】：観測分室（地上）・地下研究区画（concept_03 の雰囲気：試験槽の影・キャットウォーク・警告の札）・搬入ヤード（巨大猫又の戦場）。
// world/areas.js と同じ形の区画を返す。静的な箱は材質ごとに 1 つの網、繰り返す物はインスタンス網、光るものは安い発光（MeshBasic・加算）。
// 名前・表示はすべて仮。concept 画像の文字は使わない（独自の札）。
import * as THREE from 'three';
import { furnKit } from './furn.js';
import { Builder, Atlas, signDraw, groundTex } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex, JP_FONT } from '../render/toon.js';
import { instanced, finish, BUILDERS3 } from './areas.js';
import { lightShafts, stainDecals } from '../render/shafts.js';
import { skyDome } from '../render/sky.js';
import { YARD, LAB } from '../data/ch4.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const warnDraw = (text, sub) => (g, w, h) => {
  g.fillStyle = '#2a0608'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff3a3a'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#ff5a4a'; g.font = `bold 30px ${JP_FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.beginPath(); g.moveTo(22, 50); g.lineTo(40, 14); g.lineTo(58, 50); g.closePath(); g.fill(); g.fillStyle = '#2a0608'; g.fillRect(38, 26, 4, 14); g.fillRect(38, 43, 4, 4);
  g.fillStyle = '#ffd0c8'; g.fillText(text, 74, sub ? 22 : 33); if (sub) { g.font = `18px ${JP_FONT}`; g.fillStyle = '#ff8a7a'; g.fillText(sub, 74, 48); }
};
const stripeTex = () => { const t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e8c020'; g.fillRect(0, 0, w, h); g.fillStyle = '#141014'; for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 11, 0); g.lineTo(i + 11 - 64, 64); g.lineTo(i - 64, 64); g.fill(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

// ───────────────────────── 観測分室（地上） ─────────────────────────
export function buildOffice() {
  const root = new THREE.Group(); root.name = 'area_office';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 3.4, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const H = 3.2, WL = 0xb8bcc8, WL2 = 0x9ea4b4, DK = 0x4a4e5a;
  const wall = (cx, cz, w, d, c = WL, h = H) => { B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  // 床（灰青のタイルカーペット）
  const ft = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a6070'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#626878' : '#565c6c'; g.fillRect(x + 1, y + 1, 62, 62); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(30,34,44,.18)'; g.fillRect(x + 4, y + 6 + k * 10, 56, 2); } } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(8, 9);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(24.6, 28.6), new THREE.MeshToonMaterial({ map: ft, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  B.box('wall', 0, H + 0.1, 0, 24.6, 0.2, 28.6, 0x6a6e78, { edges: false });
  // 外周（南に入口：ガラスの自動扉）
  wall(-12.2, 0, 0.4, 28.6); wall(12.2, 0, 0.4, 28.6); wall(0, -14.2, 24.6, 0.4);
  wall(-6.9, 14.2, 10.6, 0.4); wall(6.9, 14.2, 10.6, 0.4); B.box('wall', 0, H - 0.4, 14.2, 3.2, 0.8, 0.4, WL);
  for (const x of [-0.8, 0.8]) B.box('glass', x, 1.2, 14.35, 1.5, 2.4, 0.05, 0x1a2638, { edges: false });
  // 前の広間と奥を分ける壁（z=6）・廊下の壁（x=±2.5）・部屋の仕切り（z=−4）
  wall(-7.35, 6, 9.7, 0.3); wall(7.35, 6, 9.7, 0.3);
  const corridor = (x, gaps) => { let z0 = 6; for (const [a, b] of gaps.concat([[-14, -14]])) { if (z0 - b > 0.05) wall(x, (z0 + b) / 2, 0.3, z0 - b); z0 = a; } for (const [a, b] of gaps) B.box('wall', x, H - 0.35, (a + b) / 2, 0.3, 0.7, b - a, WL); };
  corridor(-2.5, [[0.0, 1.8], [-9.0, -7.2]]); corridor(2.5, [[0.0, 1.8], [-9.0, -7.2]]);
  wall(-7.35, -4, 9.7, 0.3, WL2); wall(7.35, -4, 9.7, 0.3, WL2);
  for (const x of [-2.36, 2.36]) B.box('prop', x, 0.07, -4, 0.04, 0.14, 20, 0x3a3e4a, { edges: false });
  // ── 前の広間：受付・長いす・観葉植物・札・時計 ──
  B.box('prop', -6.2, 0.5, 10.2, 5.0, 1.0, 0.8, 0x5a6478); B.box('prop', -6.2, 1.03, 10.2, 5.2, 0.06, 1.0, 0xd8d4cc, { edges: false }); solid(-6.2, 10.2, 5.0, 0.8, 1.1);
  B.box('prop', -8.6, 0.5, 11.6, 0.8, 1.0, 2.0, 0x5a6478); solid(-8.6, 11.6, 0.8, 2.0, 1.1);
  B.box('prop', -6.6, 1.25, 10.05, 0.5, 0.36, 0.06, 0x14161c, { edges: false }); B.box('glow', -6.6, 1.26, 10.0, 0.44, 0.3, 0.01, 0x6a8ac0, { edges: false });
  halos.push({ p: [-6.6, 1.26, 9.8], size: 0.9, color: 0x6a8ac0, k: 0.4 });
  spots.push({ id: 'of_pc', kind: 'save', x: -6.6, z: 9.2, r: 1.1, label: '受付の端末（セーブ）' });
  spots.push({ id: 'of_diary', kind: 'read', x: -4.6, z: 9.3, r: 1.0, label: '当直日誌', text: 'of_diary' });
  const sofa = [[0, 0.22, 0, 2.2, 0.44, 0.8, 0x3a4a6a], [0, 0.62, -0.32, 2.2, 0.5, 0.16, 0x34425e], [1.06, 0.4, 0, 0.12, 0.36, 0.8, 0x34425e], [-1.06, 0.4, 0, 0.12, 0.36, 0.8, 0x34425e]];
  const sofas = [{ x: 6.4, z: 11.8, ry: Math.PI }, { x: 6.4, z: 8.4, ry: 0 }]; root.add(instanced(sofa, sofas, { name: 'sofas', shadow: true })); for (const s of sofas) solid(s.x, s.z, 2.2, 0.8, 0.8);
  B.box('prop', 6.4, 0.22, 10.1, 1.2, 0.44, 0.7, 0x7a6a5a); solid(6.4, 10.1, 1.2, 0.7, 0.5);
  for (const [x, z] of [[11.2, 13.2], [-11.2, 13.2], [2.0, 6.6]]) { B.box('prop', x, 0.3, z, 0.5, 0.6, 0.5, 0x6a5a4a); B.box('prop', x, 0.95, z, 0.7, 0.7, 0.7, 0x2e5a3a, { edges: false }); B.box('prop', x, 1.45, z, 0.45, 0.5, 0.45, 0x3a6a42, { edges: false }); solid(x, z, 0.6, 0.6, 1.2); }
  const nm = atlas.add(signDraw('観測分室（第二）', { bg: '#1a2230', fg: '#d8e4ff', size: 36, frameColor: '#6a8ac0' }));
  B.box('wall', 0, (2.35 + H) / 2, 6, 4.7, H - 2.35, 0.3, WL);   // P13：廊下の口の上の壁（名前の札を付ける・前は札が宙に浮いていた）
  B.box('sign', 0, 2.66, 6.17, 3.4, 0.5, 0.04, 0xffffff, { uv: nm, face: 4, edges: false });
  const notes = [['夜間の入館は職員証で', '#f0f0e8', '#203050'], ['非常電源：点検 毎月第2週', '#f4f0e0', '#5a3a1a'], ['研究区画 B：関係者以外立入禁止', '#f4e8e8', '#8a1a1a']];
  notes.forEach(([t, bg, fg], i) => { const u = atlas.add(signDraw(t, { bg, fg, size: 26, dirt: true })); B.box('sign', 12.0 - 0.02, 1.6, 12.6 - i * 1.9, 0.03, 0.42, 1.7, 0xffffff, { uv: u, face: 1, edges: false }); });
  // 時計（止まった針：数字は描かない）
  { const g = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20); g.rotateX(Math.PI / 2); g.translate(-3.6, 2.5, 6.18); B.add('prop', g, 0xeeeae0); for (const [l, a] of [[0.24, 2.6], [0.17, 0.4]]) { const hg = new THREE.BoxGeometry(0.02, l, 0.02); hg.translate(0, l / 2, 0); hg.rotateZ(a); hg.translate(-3.6, 2.5, 6.22); B.add('prop', hg, 0x111111); } }
  // ── 監視室（西）：画面の壁・ログの端末・事故報告書 ──
  B.box('prop', -11.7, 1.6, 1.0, 0.4, 2.2, 7.6, 0x24262e); B.box('prop', -11.75, 0.25, 1.0, 0.5, 0.5, 7.6, 0x3a3c44); solid(-11.7, 1.0, 0.4, 7.6, 2.4);   // P13：画面の壁の下の台
  const scr = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) scr.push([-11.46, 1.15 + r * 1.0, -1.9 + c * 1.95]);
  const screenCol = [0x3a6a9a, 0x5a3a8a, 0x2a7a6a, 0x8a3a4a];
  const scrDraw = (i) => (g, w, h) => {                                     // 監視画面：区画の図・波形・時刻の止まった表示（独自の画面）
    const base = ['#0e2a3a', '#1e1236', '#0e2e26', '#2e1018'][i % 4], fg = ['#7ad8ff', '#c8a0ff', '#7affc8', '#ff8a8a'][i % 4];
    g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 2; g.globalAlpha = 0.85;
    if (i % 4 === 0) { for (let k = 0; k < 6; k++) g.strokeRect(20 + k * 70, 12, 56, 40); g.fillRect(20 + 3 * 70 + 20, 24, 10, 10); }
    else if (i % 4 === 1) { g.beginPath(); for (let x = 0; x < w; x += 6) g.lineTo(x, 32 + Math.sin(x * 0.07 + i) * 14 * Math.sin(x * 0.013)); g.stroke(); }
    else if (i % 4 === 2) { g.font = `bold 26px ${JP_FONT}`; g.fillText('23:41　—　SIGNAL LOST', 24, 42); }
    else { for (let k = 0; k < 9; k++) g.fillRect(24 + k * 52, 52 - (k * 37 % 40), 30, (k * 37 % 40)); }
    g.globalAlpha = 0.18; g.fillStyle = '#000'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); g.globalAlpha = 1;
  };
  scr.forEach(([x, y, z], i) => { const u = atlas.add(scrDraw(i)); B.box('glow', x - 0.01, y, z, 0.02, 0.8, 1.74, 0x101418, { edges: false }); B.box('sign', x + 0.01, y, z, 0.02, 0.74, 1.66, 0xffffff, { uv: u, face: 0, edges: false }); halos.push({ p: [x + 0.2, y, z], size: 1.5, color: screenCol[i % 4], k: 0.3, flicker: i % 3 === 0 }); });
  // 机の上の散らかり（書類・湯のみ・ファイル）・倒れた椅子
  const rc = rngOf(29); for (let i = 0; i < 14; i++) { const [x, z] = [[-7.4, 2.6], [-9.6, -2.2], [-6.2, 10.2], [-8.0, -10.6]][i % 4]; B.box('prop', x + (rc() - 0.5) * 1.4, 0.8 + (i % 4 === 1 ? 0 : 0.27) - 0.27 + (i % 4 === 2 ? 0.27 : 0), z + (rc() - 0.5) * 0.5, 0.21, 0.01 + rc() * 0.03, 0.3, [0xf2f0e8, 0xe8e4d8, 0xd8e0e8][i % 3], { ry: rc() * 3, edges: false }); }
  B.box('prop', -4.4, 0.25, 3.6, 0.5, 0.5, 0.06, 0x2a2a34, { rx: 1.4, ry: 0.6 }); B.box('prop', -4.6, 0.12, 3.9, 0.5, 0.06, 0.5, 0x2a2a34, { ry: 0.6 });
  B.box('prop', -7.4, 0.38, 2.6, 2.6, 0.76, 1.0, 0x8a8a92); solid(-7.4, 2.6, 2.6, 1.0, 0.8);
  B.box('prop', -7.4, 0.98, 2.9, 0.7, 0.44, 0.05, 0x101218, { edges: false }); B.box('glow', -7.4, 0.99, 2.87, 0.62, 0.36, 0.01, 0x9adcff, { edges: false });
  halos.push({ p: [-7.4, 1.0, 2.6], size: 1.0, color: 0x9adcff, k: 0.5 });
  spots.push({ id: 'of_logs', kind: 'logs', x: -7.4, z: 1.7, r: 1.2, label: '監視室の端末（入退室の記録）' });
  B.box('prop', -9.6, 0.38, -2.2, 1.8, 0.76, 0.9, 0x7a7068); solid(-9.6, -2.2, 1.8, 0.9, 0.8);
  B.box('prop', -9.4, 0.79, -2.2, 0.42, 0.03, 0.56, 0xf2f0e8, { edges: false });
  spots.push({ id: 'of_report', kind: 'clue', clue: 'report', x: -9.6, z: -1.2, r: 1.1, label: '事故報告書（机の上）' });
  { const FK = furnKit(B); for (const [x, z, ry] of [[-7.6, 1.6, 0.2], [-9.4, -1.4, 2.8]]) FK.chair(x, z, ry, 0x2a2a34, { w: 0.5 }); }   // P13：脚のある椅子
  const kanshi = atlas.add(signDraw('監視室', { bg: '#e8ecf4', fg: '#203050', size: 34 }));
  B.box('sign', -2.66, 2.6, 0.9, 0.03, 0.34, 1.2, 0xffffff, { uv: kanshi, face: 1, edges: false });
  // ── 保管庫（東）：収容物品の棚・ロッカー・返却箱・火縄銃のケース ──
  const shelf = [[0, 1.0, 0, 0.5, 2.0, 2.2, 0x6a6a72], [0, 0.4, 0, 0.56, 0.04, 2.2, 0x8a8a92], [0, 1.0, 0, 0.56, 0.04, 2.2, 0x8a8a92], [0, 1.6, 0, 0.56, 0.04, 2.2, 0x8a8a92]];
  const shelves = [{ x: 5.0, z: 3.6 }, { x: 5.0, z: -1.6 }, { x: 8.0, z: 3.6 }, { x: 8.0, z: -1.6 }]; root.add(instanced(shelf, shelves, { name: 'shelves', shadow: true })); for (const s of shelves) solid(s.x, s.z, 0.6, 2.2, 2.0);
  const items = []; const rr = rngOf(19); for (const s of shelves) for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) items.push({ x: s.x, y: 0.42 + k * 0.6, z: s.z - 0.7 + i * 0.7 + (rr() - 0.5) * 0.1, ry: rr() * 0.4, color: [0xb89a6a, 0x6a7a8a, 0x8a5a4a, 0x9aa080, 0x5a4a6a][Math.floor(rr() * 5)] });
  root.add(instanced([[0, 0.16, 0, 0.36, 0.32, 0.42, 0xffffff]], items, { name: 'boxes' }));
  for (let i = 0; i < 5; i++) B.box('prop', 11.75, 0.95, -3.0 + i * 0.62, 0.45, 1.9, 0.6, i % 2 ? 0x5a6a7a : 0x52606e);
  solid(11.75, -1.76, 0.5, 3.2, 2.0);
  B.box('prop', 9.6, 0.4, 4.9, 1.0, 0.8, 0.7, 0x3a3e46); B.box('prop', 9.6, 0.82, 4.9, 1.04, 0.06, 0.74, 0x6a6e78, { edges: false }); solid(9.6, 4.9, 1.0, 0.7, 0.9);
  B.box('glow', 9.2, 0.62, 4.53, 0.12, 0.06, 0.01, 0xff6040, { edges: false }); const rbh = halos.push({ p: [9.2, 0.62, 4.45], size: 0.5, color: 0xff6040, k: 0.8 }) - 1; dyn.returnHalo = rbh;
  spots.push({ id: 'of_return', kind: 'returnbox', x: 9.6, z: 3.9, r: 1.1, label: '返却箱（職員証）' });
  // 火縄銃のケース（壁掛け・ガラスの蓋）：登録証つきの古い持ち物（鑑定のため分室に預けていた・仮）
  B.box('prop', 11.9, 1.5, 1.6, 0.18, 0.5, 2.0, 0x3a2418); B.box('glass', 11.8, 1.5, 1.6, 0.02, 0.44, 1.92, 0x3a3020, { edges: false });
  const mlk = new THREE.Group(); const mlm = new THREE.MeshToonMaterial({ color: 0x5a3a24, gradientMap: gradientMap() }), mlb = new THREE.MeshToonMaterial({ color: 0x2a2a30, gradientMap: gradientMap() });
  { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 1.2), mlm); st.position.set(11.8, 1.48, 1.3); mlk.add(st); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 1.0, 8), mlb); br.rotation.x = Math.PI / 2; br.position.set(11.8, 1.53, 2.2); mlk.add(br); }
  root.add(mlk); dyn.matchlockCase = mlk;
  halos.push({ p: [11.6, 1.6, 1.6], size: 1.2, color: 0xffd8a0, k: 0.3 });
  spots.push({ id: 'of_matchlock', kind: 'matchlock', x: 11.0, z: 1.6, r: 1.1, label: '火縄銃のケース（登録証つき）' });
  const hokan = atlas.add(signDraw('収容物品　保管庫', { bg: '#e8ecf4', fg: '#203050', size: 30 }));
  B.box('sign', 2.66, 2.6, 0.9, 0.03, 0.34, 1.6, 0xffffff, { uv: hokan, face: 0, edges: false });
  // ── 所長室（北西・任意の記録） ──
  B.box('prop', -8.0, 0.38, -10.6, 2.2, 0.76, 1.1, 0x5a3e2e); solid(-8.0, -10.6, 2.2, 1.1, 0.8);
  B.box('prop', -8.2, 0.79, -10.5, 0.5, 0.03, 0.36, 0xf0ece0, { edges: false }); B.box('prop', -7.5, 0.82, -10.7, 0.32, 0.08, 0.22, 0x1a1a1e, { edges: false });
  B.box('prop', -11.75, 1.1, -9.0, 0.4, 2.2, 3.6, 0x4a3628); for (let k = 0; k < 4; k++) B.box('prop', -11.5, 0.35 + k * 0.5, -9.0, 0.1, 0.34, 3.3, [0x8a3a3a, 0x3a5a8a, 0xc0a050, 0x4a7a4a][k], { edges: false }); solid(-11.75, -9.0, 0.4, 3.6, 2.2);
  B.box('glass', -7.0, 1.9, -14.0, 3.6, 1.4, 0.05, 0x1a2234, { edges: false });
  spots.push({ id: 'of_coverup', kind: 'clue', clue: 'coverup', x: -8.0, z: -9.6, r: 1.1, label: '所長室の机（報告書の控え）' });
  const shocho = atlas.add(signDraw('分室長室', { bg: '#e8ecf4', fg: '#203050', size: 34 }));
  B.box('sign', -2.66, 2.6, -8.1, 0.03, 0.34, 1.2, 0xffffff, { uv: shocho, face: 1, edges: false });
  // ── エレベーターの前（北東）：エレベーター・電気室の盤（非常電源の保全記録） ──
  B.box('wall', 7.6, H / 2, -13.9, 2.4, H, 0.2, 0x8a8e98); B.box('prop', 7.0, 1.2, -13.78, 1.1, 2.3, 0.04, 0xa8acb6, { edges: false }); B.box('prop', 8.2, 1.2, -13.78, 1.1, 2.3, 0.04, 0xa8acb6, { edges: false });
  B.box('glow', 7.6, 2.75, -13.78, 0.6, 0.18, 0.02, 0xffb060, { edges: false }); halos.push({ p: [7.6, 2.75, -13.6], size: 0.8, color: 0xffb060, k: 0.5 });
  B.box('wall', 9.2, H / 2, -13.9, 0.8, H, 0.2, 0x8a8e98); B.box('prop', 9.2, 1.2, -13.8, 0.22, 0.3, 0.06, 0x2a2a30, { edges: false }); B.box('glow', 9.2, 1.24, -13.76, 0.1, 0.06, 0.01, 0x40ff80, { edges: false }); const evh = halos.push({ p: [9.2, 1.24, -13.6], size: 0.4, color: 0xff4040, k: 0.9 }) - 1; dyn.evHalo = evh;
  const ev = atlas.add(signDraw('研究区画 B（地下）直通', { bg: '#1a1a22', fg: '#ffd8a0', size: 28 }));
  B.box('sign', 7.6, 3.0, -13.78, 2.4, 0.3, 0.02, 0xffffff, { uv: ev, face: 4, edges: false });
  spots.push({ id: 'exit_lab', kind: 'exit', to: 'lab', spawn: 'elevator', x: 7.6, z: -12.8, r: 1.2, label: 'エレベーター（地下の研究区画へ）', needFlag: 'card_b07', lockedText: 'of_ev_locked' });
  B.box('prop', 11.8, 1.3, -8.0, 0.4, 1.8, 1.4, 0x6a7064); B.box('glow', 11.58, 1.6, -8.0, 0.02, 0.2, 0.8, 0x40ff80, { edges: false }); solid(11.8, -8.0, 0.4, 1.4, 2.0);
  spots.push({ id: 'of_power', kind: 'clue', clue: 'power', x: 11.0, z: -8.0, r: 1.1, label: '電気室の盤（非常電源の保全記録）' });
  // 館内放送のスピーカー（廊下の天井）
  B.box('prop', 0, H - 0.06, -2.0, 0.5, 0.12, 0.5, 0xd8d8d0, { edges: false }); B.box('prop', 0, H - 0.13, -2.0, 0.36, 0.02, 0.36, 0x3a3a40, { edges: false });
  spots.push({ id: 'exit_shelter', kind: 'exit', to: 'shelter', spawn: 'from_tunnel', x: 0, z: 13.6, r: 1.0, label: '避難所へ戻る（迎えの車）', auto: false });
  hideSpots.push({ x: -8.6, z: 8.4 }, { x: 4.8, z: 9.8 }, { x: -6.0, z: 0.0 }, { x: 6.6, z: 1.0 }, { x: -6.0, z: -8.0 }, { x: 5.0, z: -9.0 });
  // 明かり：蛍光灯（いくつか消え・ちらつく）・画面・非常灯
  const lights = [
    { id: 'h1', pos: [-5, 3.0, 10.5], color: 0xe8f0ff, intensity: 8, dist: 11 },
    { id: 'h2', pos: [5, 3.0, 10.5], color: 0xe8f0ff, intensity: 6, dist: 11, flicker: true },
    { id: 'c1', pos: [0, 3.0, 2], color: 0xdfe8f8, intensity: 4.5, dist: 8 },
    { id: 'c2', pos: [0, 3.0, -8], color: 0xdfe8f8, intensity: 3.5, dist: 8, flicker: true },
    { id: 'mon', pos: [-9.5, 1.6, 1.0], color: 0x7a8ad8, intensity: 4.5, dist: 7 },
    { id: 'vault', pos: [7.0, 2.9, 1.0], color: 0xffe0b0, intensity: 4, dist: 8 },
    { id: 'chief', pos: [-7, 2.9, -9], color: 0xffd8a0, intensity: 2.5, dist: 6 },
    { id: 'evl', pos: [7.6, 2.9, -10], color: 0xffb070, intensity: 3.5, dist: 7 },
    { id: 'emg', pos: [0, 2.6, 13.6], color: 0x30ff60, intensity: 1.5, dist: 5 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (['h1', 'h2', 'c1', 'c2', 'vault', 'chief'].includes(l.id)) { B.box('glow', l.pos[0], H - 0.03, l.pos[2], l.id[0] === 'c' ? 0.3 : 1.6, 0.04, l.id[0] === 'c' ? 1.6 : 0.4, 0xf4f8ff, { edges: false }); halos.push({ p: [l.pos[0], H - 0.15, l.pos[2]], size: 1.0, color: l.color, k: 0.4, light: l }); }
  const wet = lights.filter(l => l.id[0] === 'c' || l.id[0] === 'h').map(l => ({ p: [l.pos[0], 0, l.pos[2]], size: 1.3, color: l.color, k: 0.2, light: l.id }));
  root.add(lightShafts([{ p: [0, 2.6, 14.0], dir: [0, -0.5, -0.86], len: 4.5, w0: 1.4, w1: 2.4, color: 0x8a9ad8, k: 0.1 }, { p: [-7.0, 2.4, -13.9], dir: [0, -0.6, 0.8], len: 4, w0: 1.4, w1: 2.4, color: 0x7a8ad0, k: 0.3 }, { p: [0, H - 0.05, 2], dir: [0, -1, 0], len: 3, w0: 0.8, w1: 1.8, color: 0xc8d8f0, k: 0.12 }]));
  const sr = rngOf(43), st = [];
  for (let i = 0; i < 16; i++) st.push({ p: [(sr() - 0.5) * 22, 0, (sr() - 0.5) * 26], n: 'floor', size: 0.6 + sr() * 1.2, kind: [1, 3, 4, 7][Math.floor(sr() * 4)], rot: sr() * 6, k: 0.55 });
  for (let i = 0; i < 6; i++) st.push({ p: [(sr() - 0.5) * 20, 0, (sr() - 0.5) * 24], n: 'floor', size: 0.5, kind: 7, rot: sr() * 6, k: 0.8 });   // 散らばった書類
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('office', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -12, maxX: 12, minZ: -14, maxZ: 14 }, spawns: { entrance: [0, 12.4, Math.PI], elevator: [7.6, -12.2, 0] },
    fog: { color: 0x0c0e16, density: 0.04 }, rain: false, amb: 'office',
  });
}

// ───────────────────────── 地下研究区画 ─────────────────────────
export function buildLab() {
  const root = new THREE.Group(); root.name = 'area_lab';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const H = 7.2, M1 = 0x3a3e4a, M2 = 0x2e3240, M3 = 0x4a4e5c;
  const wall = (cx, cz, w, d, c = M1, h = H) => { B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  // 床：濡れた金属の床板（格子の筋）
  const ft = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2e3038'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#34363f' : '#2a2c34'; g.fillRect(x + 1, y + 1, 62, 62); g.fillStyle = 'rgba(160,170,200,.08)'; for (let k = 0; k < 8; k++) g.fillRect(x + 4, y + 4 + k * 7, 56, 1); } for (let i = 0; i < 6; i++) { const x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 20; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(14,10,30,.55)'); gr.addColorStop(1, 'rgba(14,10,30,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(10, 10);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(38, 36), new THREE.MeshToonMaterial({ map: ft, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(3.5, 0, -8); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  B.box('wall', 3.5, H + 0.1, -8, 38, 0.2, 36, 0x16181e, { edges: false });
  // 外周：広間（x −14〜14）・制御室（x 14〜22, z −24〜−12）
  wall(-14.2, -8, 0.4, 34); wall(0, 9.6, 28.8, 0.4); wall(-9.2, -24.6, 10.4, 0.4); wall(9.2, -24.6, 10.4, 0.4); B.box('wall', 0, H - 1.2, -24.6, 8, 2.4, 0.4, M1);
  wall(14.2, 0.4, 0.4, 18.8); wall(14.2, -11.0, 0.4, 2.2); wall(14.2, -21.8, 0.4, 5.6); wall(14.2, -14.6, 0.4, 3.0);     // 制御室の口（z −16.6〜−19）
  B.box('wall', 14.2, H - 1.5, -17.8, 0.4, 3.0, 2.4, M1);
  wall(18.2, -11.8, 8.0, 0.4, M2, 3.6); wall(18.3, -24.6, 7.8, 0.4, M2, 3.6); wall(22.2, -18.2, 0.4, 13.2, M2, 3.6);
  B.box('wall', 18.2, 3.7, -18.2, 8.2, 0.2, 13.2, 0x22242c, { edges: false });
  // 隔壁（制御室の戸）：閉じている間は当たり判定（配電盤で開く）
  const bulk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 2.4), new THREE.MeshToonMaterial({ color: 0x6a6040, gradientMap: gradientMap(), map: stripeTex() }));
  bulk.position.set(14.2, 1.7, -17.8); bulk.castShadow = true; root.add(bulk);
  const bbox = cbox(14.2, -17.8, 0.5, 2.4, 3.4); boxes.push(bbox);
  dyn.bulkhead = { mesh: bulk, box: bbox, open: false, up: 1.7 + 3.3, down: 1.7 };
  B.box('glow', 14.06, 3.6, -17.8, 0.04, 0.12, 0.5, 0xff3030, { edges: false }); dyn.bulkHalo = halos.push({ p: [13.8, 3.6, -17.8], size: 0.7, color: 0xff3030, k: 0.9, hazard: true }) - 1;
  // ── 試験槽（左右 4 つずつ）：ガラス・発光する液・中の影（丸まった人影）── concept_03 の雰囲気を独自に
  const tanks = []; for (const x of [-11.2, 11.2]) for (const z of [2, -4, -10, -16]) tanks.push({ x, z });
  const tankR = 1.25, tankH = 4.0;
  for (const t of tanks) { B.box('prop', t.x, 0.3, t.z, 3.0, 0.6, 3.0, 0x2a2c34); B.box('prop', t.x, tankH + 0.85, t.z, 3.0, 0.5, 3.0, 0x2a2c34); B.box('glow', t.x, 0.62, t.z, 2.7, 0.04, 2.7, 0x7a3aff, { edges: false }); B.box('prop', t.x, tankH + 1.4 + 1.0, t.z, 0.4, 2.2, 0.4, 0x22242c, { edges: false }); solid(t.x, t.z, 2.9, 2.9, 5.2); halos.push({ p: [t.x, 2.4, t.z], size: 3.2, color: 0x9a5aff, k: 0.38, tank: true }); halos.push({ p: [t.x, 0.7, t.z], size: 1.8, color: 0xc070ff, k: 0.5 }); }
  const glassG = [], liqG = [];
  for (const t of tanks) { const g = new THREE.CylinderGeometry(tankR, tankR, tankH, 20, 1, true); g.translate(t.x, 0.6 + tankH / 2, t.z); glassG.push(g); const l = new THREE.CylinderGeometry(tankR * 0.94, tankR * 0.94, tankH * 0.92, 16, 1, true); l.translate(t.x, 0.6 + tankH * 0.46, t.z); liqG.push(l); }
  const merge = list => { const pos = [], nrm = [], uvs = [], idx = []; let o = 0; for (const g of list) { const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nrm.push(N.getX(i), N.getY(i), N.getZ(i)); uvs.push(U.getX(i), U.getY(i)); } for (let i = 0; i < g.index.count; i++) idx.push(o + g.index.getX(i)); o += P.count; } const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); m.setIndex(idx); return m; };
  const liqTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#c060ff'); gr.addColorStop(0.6, '#6a2aa8'); gr.addColorStop(1, '#2a1048'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,220,255,.35)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 0, 7); g.fill(); } });
  liqTex.wrapS = liqTex.wrapT = THREE.RepeatWrapping;
  const liq = new THREE.Mesh(merge(liqG), new THREE.MeshBasicMaterial({ map: liqTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  liq.name = 'tank_liquid'; liq.renderOrder = 3; root.add(liq); dyn.liquid = liqTex;
  const glass = new THREE.Mesh(merge(glassG), new THREE.MeshBasicMaterial({ color: 0x9ab8ff, transparent: true, opacity: 0.12, depthWrite: false, fog: true }));
  glass.name = 'tank_glass'; glass.renderOrder = 4; root.add(glass);
  // 槽の中の影（丸まった人影・ひざを抱えた形）：インスタンス 1 回
  const sil = [[0, 2.7, 0, 0.36, 0.42, 0.34, 0x0c0814], [0, 2.15, 0.05, 0.46, 0.7, 0.36, 0x0c0814], [0.14, 1.75, 0.18, 0.18, 0.5, 0.2, 0x0c0814], [-0.14, 1.75, 0.18, 0.18, 0.5, 0.2, 0x0c0814], [0.24, 2.25, 0.1, 0.12, 0.6, 0.14, 0x0c0814], [-0.24, 2.25, 0.1, 0.12, 0.6, 0.14, 0x0c0814], [0, 3.1, -0.05, 0.08, 0.6, 0.08, 0x2a1440]];
  const sr0 = rngOf(71); root.add(instanced(sil, tanks.map(t => ({ x: t.x + (sr0() - 0.5) * 0.3, y: 0.3 + sr0() * 0.4, z: t.z, ry: sr0() * 6 })), { name: 'tank_silhouettes' }));
  // ── キャットウォーク（上の通路・y 3.6）と柱・手すり・階段（見た目） ──
  for (const sx of [-1, 1]) {
    const x = sx * 12.6;
    B.box('prop', x, 3.6, -7.5, 2.4, 0.12, 33, 0x3a3e48); B.box('prop', x - sx * 1.18, 4.15, -7.5, 0.05, 0.05, 33, 0x8a8e98, { edges: false }); B.box('prop', x - sx * 1.18, 3.85, -7.5, 0.04, 0.04, 33, 0x6a6e78, { edges: false });
    for (let z = 8; z >= -23; z -= 3.1) { B.box('prop', x - sx * 1.18, 3.9, z, 0.05, 0.6, 0.05, 0x6a6e78, { edges: false }); B.box('prop', x, 3.5, z, 2.4, 0.1, 0.1, 0x22242c, { edges: false }); }
    for (let z = 6; z >= -22; z -= 7) { B.box('wall', x - sx * 1.1, 1.8, z, 0.2, 3.6, 0.2, 0x2a2c34); }
    B.box('glow', x - sx * 1.2, 3.52, -7.5, 0.03, 0.03, 33, 0x60a0ff, { edges: false });
  }
  B.box('prop', 0, 3.6, -21.0, 22.8, 0.12, 2.2, 0x3a3e48); B.box('prop', 0, 4.15, -20.0, 22.8, 0.05, 0.05, 0x8a8e98, { edges: false }); B.box('prop', 0, 4.15, -22.0, 22.8, 0.05, 0.05, 0x8a8e98, { edges: false });
  for (let k = 0; k < 10; k++) B.box('prop', -12.6 + 0.0, (0.21 + k * 0.36) / 2, 7.4 - k * 0.42, 1.6, 0.21 + k * 0.36, 0.42, 0x4a4e58, { edges: false });   // 階段（南西）。P13：段の下まで詰めた階段（前は板だけ浮いていた）
  // キャットウォークの上の影（立ったまま動かない応答体の影・頭の上の輪がうっすら光る）
  const watch = [[-12.6, -3.0], [12.6, -6.5], [-12.6, -14.0], [5.0, -21.0], [-6.0, -21.0], [12.6, 4.0]];
  root.add(instanced([[0, 4.5, 0, 0.3, 1.2, 0.22, 0x0a0810], [0, 5.25, 0, 0.22, 0.26, 0.22, 0x0a0810], [0.2, 4.4, 0.05, 0.08, 0.9, 0.08, 0x0a0810], [-0.2, 4.4, 0.05, 0.08, 0.9, 0.08, 0x0a0810], [0.1, 3.95, 0, 0.1, 0.7, 0.1, 0x0a0810], [-0.1, 3.95, 0, 0.1, 0.7, 0.1, 0x0a0810]], watch.map(([x, z], i) => ({ x, z, ry: i * 1.3 })), { name: 'catwalk_watchers' }));
  for (const [x, z] of watch) halos.push({ p: [x, 5.62, z], size: 0.5, color: 0xd0a0ff, k: 0.55 });
  // ── 中央の試験床：輪の線（発光）・4 本の柱・天井の応答装置 ──
  const C = LAB.trapCenter;
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; B.box('glow', C[0] + Math.sin(a) * 5, 0.02, C[1] + Math.cos(a) * 5, 0.7, 0.02, 0.12, 0x9a5aff, { edges: false, ry: a }); }
  for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; B.box('glow', C[0] + Math.sin(a) * 3.2, 0.02, C[1] + Math.cos(a) * 3.2, 0.6, 0.02, 0.08, 0xff7ad8, { edges: false, ry: a }); }
  for (const [dx, dz] of [[5.6, 5.6], [-5.6, 5.6], [5.6, -5.6], [-5.6, -5.6]]) { B.box('prop', C[0] + dx, 1.1, C[1] + dz, 0.6, 2.2, 0.6, 0x4a4e5c); B.box('glow', C[0] + dx, 2.25, C[1] + dz, 0.3, 0.1, 0.3, 0xff7ad8, { edges: false }); solid(C[0] + dx, C[1] + dz, 0.6, 0.6, 2.2); halos.push({ p: [C[0] + dx, 2.3, C[1] + dz], size: 0.8, color: 0xff7ad8, k: 0.7 }); }
  { const g = new THREE.CylinderGeometry(2.2, 1.4, 1.6, 16); g.translate(C[0], H - 1.2, C[1]); B.add('prop', g, 0x2a2c36); const g2 = new THREE.CylinderGeometry(0.5, 0.5, 2.0, 10); g2.translate(C[0], H - 0.2, C[1]); B.add('prop', g2, 0x22242c); for (let k = 0; k < 3; k++) { const r = new THREE.TorusGeometry(1.6 - k * 0.35, 0.04, 6, 24); r.rotateX(Math.PI / 2); r.translate(C[0], H - 2.04 - k * 0.08, C[1]); B.add('glow', r, 0xd08aff); } }
  halos.push({ p: [C[0], H - 2.2, C[1]], size: 3.4, color: 0xc070ff, k: 0.45 });
  // 床を這う太い配線（試験床から槽・端末へ）
  const cable = [[0, 0.06, 0, 0.16, 0.12, 1.98, 0x14161c]]; const cab = [];
  for (const t of tanks) { const dx = t.x - C[0], dz = t.z - C[1], L = Math.hypot(dx, dz), n = Math.floor(L / 2); for (let i = 1; i < n - 1; i++) cab.push({ x: C[0] + dx * i / n, z: C[1] + dz * i / n, ry: Math.atan2(dx, dz) }); }
  root.add(instanced(cable, cab, { name: 'cables' }));
  // ── 警告の札（北の壁・搬入口の上）・床の黄黒の帯 ──
  const wn = atlas.add(warnDraw('警告　境界応答 試験中', '関係者以外 立入禁止・試験槽に近づかないこと'));
  B.box('sign', 0, 5.6, -24.38, 7.4, 1.1, 0.04, 0xffffff, { uv: wn, face: 4, edges: false });
  for (const x of [-4.4, 4.4]) { B.box('glow', x, 5.6, -24.36, 0.3, 0.3, 0.04, 0xff2a2a, { edges: false }); halos.push({ p: [x, 5.6, -24.1], size: 1.4, color: 0xff2a2a, k: 1.0, hazard: true }); }
  const wn2 = atlas.add(warnDraw('第二研究区画', '応答試験室'));
  B.box('sign', -14.0, 2.4, 0, 0.04, 0.7, 3.6, 0xffffff, { uv: wn2, face: 0, edges: false });
  const wn3 = atlas.add(warnDraw('高電圧', '配電盤：保全担当のみ'));
  B.box('sign', -13.98, 2.6, -18.0, 0.04, 0.5, 2.4, 0xffffff, { uv: wn3, face: 0, edges: false });
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.0), new THREE.MeshToonMaterial({ map: stripeTex(), gradientMap: gradientMap() })); stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.012, -23.6); stripe.material.map.repeat.set(8, 1); root.add(stripe);
  // 搬入口の大きなシャッター（reveal：巨大戦の場へ）
  B.box('shutter', 0, 2.4, -24.5, 7.8, 4.8, 0.12, 0x8a8e94);
  spots.push({ id: 'exit_yard', kind: 'exit', to: 'yard', spawn: 'giant', x: 0, z: -23.4, r: 1.6, label: '搬入口', needFlag: 'ch4_rise', lockedText: 'lab_yard_locked', auto: true });
  // エレベーター（南）
  B.box('wall', 0, 1.3, 9.3, 2.6, 2.6, 0.3, 0x8a8e98); B.box('prop', -0.6, 1.2, 9.12, 1.1, 2.3, 0.04, 0xa8acb6, { edges: false }); B.box('prop', 0.6, 1.2, 9.12, 1.1, 2.3, 0.04, 0xa8acb6, { edges: false });
  spots.push({ id: 'exit_office', kind: 'exit', to: 'office', spawn: 'elevator', x: 0, z: 8.4, r: 1.0, label: 'エレベーター（分室へ戻る）' });
  // ── 試験端末（救う：試験終了の合図）・机の手順書（任意の手掛かり） ──
  const T = LAB.terminal;
  B.box('prop', T[0], 0.55, T[1] - 0.6, 1.6, 1.1, 0.7, 0x4a4e58); B.box('prop', T[0], 1.25, T[1] - 0.8, 1.2, 0.6, 0.06, 0x101218, { rx: -0.4, edges: false }); B.box('glow', T[0], 1.26, T[1] - 0.77, 1.08, 0.5, 0.01, 0x60e0c0, { rx: -0.4, edges: false }); solid(T[0], T[1] - 0.6, 1.6, 0.7, 1.2);
  halos.push({ p: [T[0], 1.3, T[1] - 0.5], size: 1.2, color: 0x60e0c0, k: 0.5 });
  spots.push({ id: 'lab_terminal', kind: 'terminal', x: T[0], z: T[1] + 0.4, r: 1.3, label: '試験端末' });
  B.box('prop', -9.6, 0.38, 6.4, 2.0, 0.76, 0.9, 0x5a5e68); B.box('prop', -9.4, 0.79, 6.4, 0.42, 0.03, 0.3, 0xf0eee6, { edges: false }); solid(-9.6, 6.4, 2.0, 0.9, 0.8);
  spots.push({ id: 'lab_manual', kind: 'clue', clue: 'manual', x: -9.6, z: 5.4, r: 1.1, label: '机の上の試験手順書' });
  spots.push({ id: 'lab_save', kind: 'save', x: 2.6, z: 7.8, r: 1.0, label: '非常電話（セーブ）' });
  B.box('prop', 2.6, 1.3, 9.35, 0.4, 0.5, 0.12, 0xd8c040); B.box('prop', 2.6, 1.35, 9.27, 0.12, 0.2, 0.04, 0x2a2a2a, { edges: false });
  // ── 配電盤（西の壁・secret の必須）・保全記録 ──
  B.box('prop', -13.85, 1.4, -18.0, 0.5, 2.2, 2.0, 0x5a6064); for (let i = 0; i < 5; i++) { B.box('prop', -13.58, 1.0 + i * 0.3, -18.0, 0.04, 0.12, 1.2, 0x2a2a30, { edges: false }); B.box('glow', -13.56, 1.0 + i * 0.3, -18.5, 0.02, 0.06, 0.06, 0xff4040, { edges: false }); }
  solid(-13.85, -18.0, 0.5, 2.0, 2.2); dyn.breakerHalo = halos.push({ p: [-13.4, 1.6, -18.0], size: 1.2, color: 0xffb040, k: 0.0 }) - 1;
  spots.push({ id: 'lab_breaker', kind: 'breaker', x: -12.9, z: -18.0, r: 1.2, label: '配電盤（非常電源）' });
  spots.push({ id: 'lab_maint', kind: 'clue', clue: 'maint', x: -12.9, z: -15.4, r: 1.0, label: '盤の横の保全記録' });
  B.box('prop', -13.98, 1.5, -15.4, 0.04, 0.5, 0.36, 0xf0eee0, { edges: false });
  // ── 弁（制御室への通路・蒸気で姿を隠す） ──
  const pipe = [[0, 0, 0, 0.22, 0.22, 1.98, 0x6a5a4a], [0, 0.32, 0, 0.12, 0.12, 1.98, 0x4a5a6a], [0.13, 0.15, 0.8, 0.14, 0.5, 0.05, 0x3a3a3e]]; const pipes = [];   // P13：壁に留める金具
  for (let z = -11; z > -24; z -= 2) pipes.push({ x: 13.8, y: 2.6, z }); for (let x = 6; x < 14; x += 2) pipes.push({ x, y: 3.2, z: -24.2, ry: Math.PI / 2 });
  root.add(instanced(pipe, pipes, { name: 'pipes' }));
  for (const [id, x, z] of [['lab_valve1', 13.6, -13.0], ['lab_valve2', 13.6, -22.4]]) { const r = new THREE.TorusGeometry(0.22, 0.04, 6, 14); r.rotateY(Math.PI / 2); r.translate(x - 0.25, 1.4, z); B.add('prop', r, 0xc03030); B.box('prop', x - 0.03, 1.4, z, 0.4, 0.08, 0.08, 0x6a6a6a, { edges: false }); B.box('prop', 13.8, 1.3, z, 0.14, 2.6, 0.14, 0x6a5a4a, { edges: false }); spots.push({ id, kind: 'valve', x: x - 0.9, z, r: 1.1, label: '蒸気の弁' }); }
  // ── 制御室：応答炉の制御卓・炉の窓 ──
  const HC = LAB.hold.console;
  B.box('prop', HC[0] + 1.2, 0.55, HC[1], 1.0, 1.1, 3.0, 0x3a3e48); B.box('glow', HC[0] + 0.74, 1.15, HC[1], 0.02, 0.4, 2.6, 0xff6ad8, { edges: false }); solid(HC[0] + 1.2, HC[1], 1.0, 3.0, 1.2);
  halos.push({ p: [HC[0] + 0.6, 1.2, HC[1]], size: 1.6, color: 0xff6ad8, k: 0.5 });
  B.box('glass', 22.0, 2.0, -18.2, 0.06, 1.6, 6.0, 0x2a0a30, { edges: false }); B.box('glow', 22.1, 2.0, -18.2, 0.02, 1.4, 5.6, 0x8a2ad0, { edges: false });
  halos.push({ p: [21.6, 2.0, -18.2], size: 4.0, color: 0xb050ff, k: 0.45, flicker: true });
  for (const [x, z] of LAB.hold.doors) { B.box('prop', x, 0.5, z, 1.0, 1.0, 0.1, 0x1a1a20); B.box('prop', x, 0.5, z + 0.06, 0.9, 0.9, 0.02, 0x2a2a30, { edges: false }); }
  const sei = atlas.add(warnDraw('応答炉　制御室', '緊急停止の手順：保全担当'));
  B.box('sign', 14.42, 3.0, -14.0, 0.04, 0.5, 2.6, 0xffffff, { uv: sei, face: 0, edges: false });
  // 隠れ場所（柱の陰・槽の陰）
  hideSpots.push({ x: -8.8, z: 2 }, { x: 8.8, z: -4 }, { x: -8.8, z: -10 }, { x: 8.8, z: -16 }, { x: -12.4, z: 7.0 }, { x: 18.0, z: -14.0 });
  // 明かり：広間の青白い灯・槽の紫・警告の赤・試験床・制御室
  const lights = [
    { id: 'm1', pos: [0, 6.6, 4], color: 0xa8b8ff, intensity: 9, dist: 14, hall: true },
    { id: 'm2', pos: [0, 6.6, -9], color: 0xc8a8ff, intensity: 10, dist: 14, hall: true },
    { id: 'm3', pos: [0, 6.6, -19], color: 0xa8b8ff, intensity: 7, dist: 12, hall: true, flicker: true },
    { id: 'tl', pos: [-9.5, 2.5, -7], color: 0x9a4aff, intensity: 6, dist: 10, tank: true },
    { id: 'tr', pos: [9.5, 2.5, -7], color: 0x9a4aff, intensity: 6, dist: 10, tank: true },
    { id: 'wr', pos: [0, 5.0, -23.5], color: 0xff3030, intensity: 5, dist: 10, warn: true },
    { id: 'ctl', pos: [18, 3.2, -18], color: 0xff6ad8, intensity: 4.5, dist: 8 },
    { id: 'brk', pos: [-12.5, 2.6, -17], color: 0xffd0a0, intensity: 2.5, dist: 6 },
    { id: 'ev', pos: [0, 2.8, 7.5], color: 0xffd0a0, intensity: 3, dist: 7 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (l.hall) { B.box('glow', l.pos[0], H - 0.05, l.pos[2], 4.0, 0.06, 0.5, 0xe8eeff, { edges: false }); halos.push({ p: [l.pos[0], H - 0.3, l.pos[2]], size: 2.6, color: l.color, k: 0.45, light: l }); }
  const wet = lights.filter(l => l.hall || l.tank).map(l => ({ p: [l.pos[0], 0, l.pos[2]], size: 2.2, color: l.color, k: 0.45, light: l.id }));
  for (const t of tanks) wet.push({ p: [t.x - Math.sign(t.x) * 2.2, 0, t.z], size: 1.6, color: 0xa060ff, k: 0.4 });
  const shafts = [{ p: [0, H - 0.1, 4], dir: [0, -1, 0.05], len: 6.5, w0: 2.4, w1: 4.2, color: 0xa0b0ff, k: 0.16 }, { p: [0, H - 0.1, -9], dir: [0, -1, 0], len: 6.6, w0: 3.0, w1: 6.0, color: 0xc090ff, k: 0.2 }, { p: [0, H - 0.1, -19], dir: [0, -1, -0.05], len: 6.5, w0: 2.4, w1: 4.0, color: 0xa0b0ff, k: 0.12 }];
  root.add(lightShafts(shafts));
  const sr = rngOf(59), st = [];
  for (let i = 0; i < 22; i++) st.push({ p: [(sr() - 0.5) * 26, 0, 8 - sr() * 32], n: 'floor', size: 1 + sr() * 2.2, kind: [5, 1, 6, 3][Math.floor(sr() * 4)], rot: sr() * 6, k: 0.7 });
  for (let i = 0; i < 10; i++) { const sx = sr() < 0.5 ? -1 : 1; st.push({ p: [sx * 13.98, 0.4 + sr() * 3, 6 - sr() * 28], n: sx < 0 ? '+x' : '-x', size: 0.8 + sr(), kind: [0, 2, 1][Math.floor(sr() * 3)], rot: sr(), k: 0.6 }); }
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('lab', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: () => 'wet', rainRoof: () => true, indoor: (x, z) => x > 14 || z > 7,
    bounds: { minX: -14, maxX: 22, minZ: -24.4, maxZ: 9.4 }, spawns: { elevator: [0, 7.4, Math.PI], trap: [0, -3.2, Math.PI], control: [12.4, -17.8, Math.PI / 2], giant: [0, -20, 0] },
    fog: { color: 0x0a0812, density: 0.035 }, rain: false, amb: 'lab', tanks,
  });
}

// ───────────────────────── 搬入ヤード（巨大猫又の戦場） ─────────────────────────
export function buildYard() {
  const root = new THREE.Group(); root.name = 'area_yard';
  root.add(skyDome({ top: 0x0a0414, mid: 0x2a0c34, horizon: 0x6a1430, moon: [0.25, 0.42, -0.86] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [];
  const gt = groundTex({ base: '#2a2630', repeat: [36, 36] });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  const rr = rngOf(83);
  // 研究施設の建物（北・崩れかけ）：窓の光・折れた煙突
  for (let i = 0; i < 7; i++) { const x = -60 + i * 20, h = 18 + rr() * 22, d = 14 + rr() * 8, bz = -78 - rr() * 6; B.box('wall', x, h / 2, bz, 18, h, d, i % 2 ? 0x24202e : 0x2c2638); for (let k = 0; k < 8; k++) if (rr() < 0.55) B.box('glow', x - 7 + rr() * 14, 3 + rr() * (h - 6), bz + d / 2 + 0.05, 1.4, 1.0, 0.1, rr() < 0.3 ? 0xff6a4a : 0xc890ff, { edges: false }); }
  for (const [x, h] of [[-30, 46], [26, 38]]) { const g = new THREE.CylinderGeometry(2.4, 3.2, h, 12); g.translate(x, h / 2, -90); B.add('wall', g, 0x1e1a26); B.box('glow', x, h + 0.3, -90, 2.6, 0.6, 2.6, 0xff4a3a, { edges: false }); halos.push({ p: [x, h + 1, -90], size: 4, color: 0xff4a3a, k: 0.8, hazard: true }); }
  // 遠くの町（低い家並みの影・窓の灯）：周りを囲む
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 105 + rr() * 12, h = 6 + rr() * 16; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (z < -70) continue; B.box('wall', x, h / 2, z, 8 + rr() * 10, h, 8 + rr() * 6, 0x1a1622, { ry: a, edges: false }); if (rr() < 0.7) B.box('glow', x - Math.sin(a) * 4.5, h * 0.6, z - Math.cos(a) * 4.5, 2, 1.2, 0.2, rr() < 0.4 ? 0xffc890 : 0x9ab0ff, { ry: a, edges: false }); }
  // 鳥居（町の神社・遠く）
  for (const [x, z, ry] of [[-84, 40, 1.2], [80, -20, -1.0]]) { for (const s of [-3, 3]) B.box('wall', x + s * Math.sin(ry), 6, z + s * Math.cos(ry), 0.9, 12, 0.9, 0xb82a2a, { ry });   // P13：柱は鳥居の向きに並べる（前は梁とずれて浮いていた）
    B.box('wall', x, 12.4, z, 1.2, 0.9, 9.4, 0x2a1414, { ry }); B.box('wall', x, 11, z, 0.8, 0.6, 8, 0xb82a2a, { ry }); }
  // 外周のフェンス（低い）・地面の亀裂の筋・境界の裂け目（北の地面の発光）
  for (let i = 0; i < 24; i++) { const x = -66 + i * 5.7; B.box('prop', x, 1.2, -64, 5.4, 2.4, 0.2, 0x3a3a44, { edges: false }); }
  for (let i = 0; i < 18; i++) { const x = (rr() - 0.5) * 60, z = -42 + (rr() - 0.5) * 34; B.box('glow', x, 0.03, z, 0.5 + rr(), 0.03, 6 + rr() * 10, rr() < 0.5 ? 0xff4ad8 : 0x9a3aff, { ry: rr() * 3, edges: false }); }
  halos.push({ p: [0, 1, -40], size: 30, color: 0xb03aff, k: 0.35 });
  // 壊れる小物（インスタンス）：コンテナ・ガスの槽・照明の塔・小屋・柵・クレーン
  const K = {
    container: [[0, 1.3, 0, 6.0, 2.6, 2.4, 0xffffff], [0, 2.62, 0, 6.1, 0.06, 2.5, 0x2a2a30], [-2.95, 1.3, 0, 0.1, 2.5, 2.3, 0x3a3a42]],
    tank: [[0, 3.0, 0, 4.4, 6.0, 4.4, 0xc8ccd4], [0, 6.2, 0, 3.2, 0.4, 3.2, 0x8a8e98], [0, 0.4, 0, 4.8, 0.8, 4.8, 0x5a5e68]],
    tower: [[0, 7, 0, 0.6, 14, 0.6, 0x5a5e68], [0, 14.2, 0, 3.0, 1.0, 1.0, 0x2a2a30], [0, 14.2, 0.55, 2.8, 0.8, 0.1, 0xfff4d8]],
    shed: [[0, 2.2, 0, 8, 4.4, 5, 0x6a6a72], [0, 4.6, 0, 8.4, 0.4, 5.4, 0x4a3a3a], [0, 1.4, 2.52, 2.4, 2.8, 0.06, 0x2a2a30]],
    fence: [[0, 1.4, 0, 7.6, 2.8, 0.12, 0x6a6e78], [-3.8, 1.5, 0, 0.16, 3.0, 0.16, 0x4a4e58], [3.8, 1.5, 0, 0.16, 3.0, 0.16, 0x4a4e58]],
    crane: [[0, 11, 0, 1.6, 22, 1.6, 0xd8a020], [6, 21.5, 0, 16, 1.2, 1.2, 0xd8a020], [-4, 21.5, 0, 6, 1.6, 1.6, 0x4a4a52], [12, 15, 0, 0.1, 13, 0.1, 0x2a2a2a], [0, 0.6, 0, 4, 1.2, 4, 0x4a4a52]],
  };
  const conCol = [0x2a6a9a, 0xb83a2a, 0x3a8a4a, 0xc89a2a, 0x6a4a8a];
  dyn.props = [];
  for (const [kind, parts] of Object.entries(K)) {
    const list = YARD.props.filter(p => p.kind === kind); if (!list.length) continue;
    const m = instanced(parts, list.map((p, i) => ({ x: p.x, z: p.z, ry: p.ry || 0, color: kind === 'container' ? conCol[i % conCol.length] : null })), { name: 'prop_' + kind, shadow: true });
    root.add(m);
    list.forEach((p, i) => dyn.props.push({ id: p.id, kind, x: p.x, z: p.z, ry: p.ry || 0, r: YARD.propR[kind], hp: YARD.propHp[kind], hpMax: YARD.propHp[kind], alive: true, mesh: m, idx: i }));
    if (kind === 'tower') list.forEach(p => halos.push({ p: [p.x, 14.2, p.z + 0.8], size: 6, color: 0xfff0d0, k: 0.55, prop: p.id }));
  }
  // 壊れた跡のがれき（インスタンスの置き場：最初は見えない）・火の光
  const debG = new THREE.DodecahedronGeometry(0.9, 0); const debris = new THREE.InstancedMesh(debG, new THREE.MeshToonMaterial({ color: 0x4a4650, gradientMap: gradientMap() }), 90);
  const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 90; i++) debris.setMatrixAt(i, Z); debris.name = 'debris'; debris.castShadow = true; root.add(debris);
  dyn.debris = { mesh: debris, n: 0 };
  // （相棒）が避難したポンプ小屋（守る）：窓の灯・印
  const S = YARD.shelter;
  B.box('wall', S.x, 2.0, S.z, 7.0, 4.0, 5.2, 0x8a8a84); B.box('wall', S.x, 4.2, S.z, 7.6, 0.4, 5.8, 0x4a3e3a); B.box('glow', S.x + 3.52, 1.8, S.z, 0.06, 1.0, 1.4, 0xffd8a0, { edges: false });
  halos.push({ p: [S.x + 3.8, 1.8, S.z], size: 2.4, color: 0xffd8a0, k: 0.8 }); dyn.shelterHalo = halos.length - 1;
  const sh = atlas.add(signDraw('ポンプ室', { bg: '#e8e4d8', fg: '#2a2a2a', size: 34 }));
  B.box('sign', S.x + 3.53, 3.2, S.z, 0.04, 0.5, 2.0, 0xffffff, { uv: sh, face: 0, edges: false });
  // 明かり（巨体の縮尺：遠くまで届く）
  const lights = [
    { id: 'moonfill', pos: [0, 40, 20], color: 0x8a6ad8, intensity: 60, dist: 160 },
    { id: 'rift', pos: [0, 6, -40], color: 0xc040ff, intensity: 120, dist: 70 },
    { id: 'shel', pos: [S.x + 5, 4, S.z], color: 0xffd8a0, intensity: 30, dist: 24 },
    ...YARD.props.filter(p => p.kind === 'tower').map((p, i) => ({ id: 'tw' + i, pos: [p.x, 13.5, p.z + 1.5], color: 0xfff0d0, intensity: 40, dist: 34, prop: p.id })),
  ].map(l => Object.assign({ base: l.intensity }, l));
  return finish('yard', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots: [], surface: () => 'asphalt', rainRoof: () => false, indoor: () => false,
    bounds: { minX: -64, maxX: 64, minZ: -60, maxZ: 60 }, spawns: { giant: [YARD.giantStart[0], YARD.giantStart[1], YARD.giantStart[2]] },
    fog: { color: 0x160a1c, density: 0.009 }, rain: false, amb: 'yard', far: 420, giant: true,
  });
}

BUILDERS3.office = buildOffice;
BUILDERS3.lab = buildLab;
BUILDERS3.yard = buildYard;
