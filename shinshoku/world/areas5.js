// 第5章の区画【仮】：旧研究棟の収容棟（oldwing）・観測棟の吹き抜け（atrium：継接）。world/areas.js と同じ形の区画を返す。
// 静的な箱は材質ごとに 1 つの網、繰り返す物（ベッド・棚・机）はインスタンス網、光るものは安い発光（MeshBasic・加算）。名前・表示はすべて仮。
// ルートによる違い（data/ch5.js）：reveal は東の廊下の床が崩れている（白い姿で跳ぶ）・電気がある。secret は停電（非常灯）・地下の記録保管庫が水につかっている。
// 区画は一度作ると使い回すので、ルートで変わる物（崩れた床・水・封印・灯り）は dyn に持ち、ゲーム側（game/ch5.js の applyRoute5）で切り替える。
import * as THREE from 'three';
import { Builder, Atlas, signDraw } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex, JP_FONT } from '../render/toon.js';
import { instanced, finish, BUILDERS3 } from './areas.js';
import { lightShafts, stainDecals } from '../render/shafts.js';
import { skyDome } from '../render/sky.js';
import { OLDWING, ATRIUM, SUBJECTS } from '../data/ch5.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const plateDraw = (room, name, no) => (g, w, h) => { g.fillStyle = '#e8e6dc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a4a50'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#1a1a24'; g.font = `bold 34px ${JP_FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(room, 18, 26); g.font = `26px ${JP_FONT}`; g.fillText(name, 18, h - 22); g.fillStyle = '#6a2a2a'; g.font = 'bold 22px monospace'; g.textAlign = 'right'; g.fillText(no, w - 16, 26); };
const sealTex = () => canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a1a1a'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#8a1a1a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w / 2, 20 + i * 22, 7, 0, 7); g.fill(); g.fillRect(w / 2 - 14, 18 + i * 22, 28, 3); } });

// ───────────────────────── 旧研究棟（収容棟） ─────────────────────────
export function buildOldwing() {
  const root = new THREE.Group(); root.name = 'area_oldwing';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 3.4, y0 = 0) => { const b = cbox(cx, cz, w, d, h, y0); boxes.push(b); return b; };
  const H = 3.4, W1 = 0x8e9488, W2 = 0x7a8078, TILE = 0x6a6e66;
  const wall = (cx, cz, w, d, c = W1, h = H) => { B.box('wall', cx, h / 2, cz, w, h, d, c); return solid(cx, cz, w, d, h); };
  // 床：古いリノリウム（市松・しみ）
  const ft = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5e6258'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? '#686c62' : '#585c54'; g.fillRect(x + 1, y + 1, 30, 30); } for (let i = 0; i < 10; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 24; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(40,30,20,.45)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(9, 12);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(28.4, 36.8), new THREE.MeshToonMaterial({ map: ft, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -4.2); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  B.box('wall', 0, H + 0.1, -4.2, 28.4, 0.2, 36.8, 0x4a4e48, { edges: false });
  // 外周
  wall(0, 14.2, 28.4, 0.4); wall(0, -22.6, 28.4, 0.4, W2);
  wall(14.2, 1.0, 0.4, 26.4); wall(14.2, 12.6, 0.4, 3.2);                                                    // 東（z 8.4〜11 が lab への連絡口）
  wall(-14.2, -4.0, 0.4, 20.4); wall(-14.2, 12.8, 0.4, 2.8);                                                  // 西（z 6.2〜11.4 が崩れた穴＝搬入ヤードから）
  wall(-14.2, -18.8, 0.4, 7.6);
  // 崩れた西の壁（reveal の入口）：瓦礫・外の夜
  for (const [x, z, s] of [[-13.2, 7.0, 0.8], [-12.8, 10.6, 1.0], [-13.6, 8.6, 0.6], [-12.2, 6.6, 0.5]]) { B.box('prop', x, s * 0.4, z, s * 1.6, s * 0.8, s * 1.4, 0x6a6a62, { ry: x + z }); }
  B.box('glow', -14.25, 1.6, 8.8, 0.05, 3.0, 5.0, 0x1a1030, { edges: false }); halos.push({ p: [-14.0, 2.0, 8.8], size: 4.0, color: 0x6a3aa8, k: 0.35 });
  // 入口の広間（z 6〜14）と、北の収容棟を分ける壁（廊下の口・西の帯・東の帯の口）
  wall(-6.2, 6.0, 7.2, 0.3); wall(6.2, 6.0, 7.2, 0.3); B.box('wall', 0, H - 0.35, 6.0, 5.2, 0.7, 0.3, W1); B.box('wall', -11.9, H - 0.35, 6.0, 4.2, 0.7, 0.3, W1); B.box('wall', 11.9, H - 0.35, 6.0, 4.2, 0.7, 0.3, W1);
  // 西の帯（記録保管庫：封印の戸）・東の帯（主任研究室への廊下：戸）
  const sealDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.12), new THREE.MeshToonMaterial({ color: 0x5a524a, gradientMap: gradientMap() })); sealDoor.position.set(-11.9, 1.3, 6.0); root.add(sealDoor);
  const sealBox = cbox(-11.9, 6.0, 4.0, 0.5, 2.8); boxes.push(sealBox);
  const sealCards = new THREE.Group(); const sm = new THREE.MeshBasicMaterial({ map: sealTex() });
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.68), sm); c.position.set(-12.9 + i * 1.0, 1.4 + (i % 2) * 0.2, 6.08 + 0.01); c.rotation.z = (i - 1) * 0.15; sealCards.add(c); }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 6), new THREE.MeshToonMaterial({ color: 0xd8c8a0, gradientMap: gradientMap() })); rope.rotation.z = Math.PI / 2; rope.position.set(-11.9, 1.9, 6.1); sealCards.add(rope);
  root.add(sealCards); dyn.seal = { door: sealDoor, box: sealBox, cards: sealCards, cut: false, halo: halos.push({ p: [-11.9, 1.6, 6.4], size: 1.6, color: 0xff6a5a, k: 0.35 }) - 1 };
  spots.push({ id: 'ow_seal', kind: 'seal5', x: -11.9, z: 7.0, r: 1.3, label: '札で封じられた戸（記録保管庫）' });
  const eastDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 0.12), new THREE.MeshToonMaterial({ color: 0x5a6070, gradientMap: gradientMap() })); eastDoor.position.set(11.9, 1.3, 6.0); root.add(eastDoor);
  const eastBox = cbox(11.9, 6.0, 4.0, 0.5, 2.8); boxes.push(eastBox); dyn.eastDoor = { mesh: eastDoor, box: eastBox, open: false };
  spots.push({ id: 'ow_east', kind: 'eastdoor5', x: 11.9, z: 7.0, r: 1.3, label: '東の廊下の戸（主任研究室へ）' });
  // 受付・長いす・案内板・内線電話（セーブ）
  B.box('prop', -6.0, 0.5, 9.6, 4.0, 1.0, 0.8, 0x6a5e50); B.box('prop', -6.0, 1.03, 9.6, 4.2, 0.06, 1.0, 0xd0c8b8, { edges: false }); solid(-6.0, 9.6, 4.0, 0.8, 1.1);
  const bench = [[0, 0.22, 0, 2.2, 0.08, 0.5, 0x5a4a3a], [0, 0.11, -0.2, 0.08, 0.22, 0.08, 0x2a2a2a], [0, 0.11, 0.2, 0.08, 0.22, 0.08, 0x2a2a2a], [0, 0.55, -0.24, 2.2, 0.5, 0.06, 0x5a4a3a]];
  const benches = [{ x: 6.4, z: 11.6, ry: Math.PI }, { x: 6.4, z: 9.0, ry: 0 }]; root.add(instanced(bench, benches, { name: 'benches', shadow: true })); for (const b of benches) solid(b.x, b.z, 2.2, 0.6, 0.6);
  const nm = atlas.add(signDraw('旧研究棟　収容棟', { bg: '#20241e', fg: '#d8e0c8', size: 40, frameColor: '#6a7a5a' }));
  B.box('sign', 0, 2.8, 6.17, 3.4, 0.5, 0.04, 0xffffff, { uv: nm, face: 4, edges: false });
  B.box('prop', 0, 1.3, 13.9, 0.4, 0.5, 0.14, 0xc8b040); B.box('prop', 0, 1.35, 13.82, 0.14, 0.22, 0.04, 0x2a2a2a, { edges: false });
  spots.push({ id: 'ow_save', kind: 'save', x: 0, z: 13.0, r: 1.0, label: '内線電話（セーブ）' });
  // 排水の弁（secret：記録保管庫の水を抜く。配電盤で排水ポンプに電気が要る）
  { const r = new THREE.TorusGeometry(0.24, 0.045, 6, 14); r.translate(-9.4, 1.3, 13.8); B.add('prop', r, 0x3070c0); B.box('prop', -9.4, 1.3, 13.92, 0.1, 0.1, 0.2, 0x6a6a6a, { edges: false }); }
  spots.push({ id: 'ow_valve', kind: 'valve5', x: -9.4, z: 13.0, r: 1.1, label: '排水の弁（地下の記録保管庫）' });
  // ── 廊下（x −2.6〜2.6）と収容室（西 101〜103・東 104〜106）・資料室（北西）・電気室（北東） ──
  const R = OLDWING.rooms;
  const plateFor = room => { const s = SUBJECTS.find(q => q.room === room); return s ? [s.name, s.no] : ['', '']; };
  dyn.doorLamps = {};
  for (const [room, [cx, cz]] of Object.entries(R)) {
    const sx = Math.sign(cx), wx = sx * 2.6, x0 = sx * 9.8;
    wall((wx + x0) / 2, cz + 3.5, Math.abs(x0 - wx), 0.25, W2);                         // 部屋の仕切り（南）
    wall(wx, cz + 2.2, 0.3, 2.6, W1); wall(wx, cz - 2.2, 0.3, 2.6, W1); B.box('wall', wx, H - 0.4, cz, 0.3, 0.8, 1.8, W1);   // 戸口（幅 1.8）
    // 戸（開いたまま・格子の窓）と札・戸口の灯（鐘で立つ順が見える）
    B.box('prop', wx + sx * 0.5, 1.15, cz + 0.9 - 0.02, 0.06, 2.3, 0.9, 0x6a6e78, { ry: sx * 0.9 });
    const [nmS, no] = plateFor(room); const pu = atlas.add(plateDraw(room, nmS, no));
    B.box('sign', wx - sx * 0.17, 1.9, cz + 1.55, 0.03, 0.32, 0.62, 0xffffff, { uv: pu, face: sx > 0 ? 1 : 0, edges: false });
    B.box('glow', wx - sx * 0.17, 2.75, cz, 0.04, 0.1, 0.4, 0xffd890, { edges: false });
    dyn.doorLamps[room] = halos.push({ p: [wx - sx * 0.3, 2.75, cz], size: 1.1, color: 0xffc860, k: 0.0 }) - 1;
    // 部屋の中：ベッド・いす・小さな窓・拘束の帯
    B.box('prop', cx + sx * 1.8, 0.3, cz - 1.6, 1.0, 0.6, 2.0, 0xd8d4c8); B.box('prop', cx + sx * 1.8, 0.62, cz - 1.6, 0.9, 0.06, 1.9, 0xb8c0b8, { edges: false }); solid(cx + sx * 1.8, cz - 1.6, 1.0, 2.0, 0.7);
    B.box('prop', cx + sx * 1.8, 0.66, cz - 1.0, 1.04, 0.03, 0.08, 0x3a3634, { edges: false }); B.box('prop', cx + sx * 1.8, 0.66, cz - 2.2, 1.04, 0.03, 0.08, 0x3a3634, { edges: false });
    B.box('prop', cx - sx * 0.6, 0.45, cz + 2.0, 0.5, 0.06, 0.5, 0x6a5a4a); B.box('prop', cx - sx * 0.6, 0.75, cz + 2.22, 0.5, 0.6, 0.06, 0x6a5a4a);
    B.box('glass', x0 - sx * 0.17, 2.2, cz, 0.04, 0.6, 1.2, 0x2a3040, { edges: false });
  }
  // 北の部屋：資料室（西）・電気室（東）
  wall(-9.8, -8.2, 0.3, 28.4, W2); wall(9.8, -8.2, 0.3, 28.4, W2);                                   // 帯と部屋の列の間（全長）
  for (const sx of [-1, 1]) { wall(sx * 6.2, -15.5, 7.2, 0.25, W2); wall(sx * 2.6, -16.6, 0.3, 2.0, W1); wall(sx * 2.6, -21.4, 0.3, 2.0, W1); B.box('wall', sx * 2.6, H - 0.4, -19.0, 0.3, 0.8, 2.8, W1); }
  const shelf = [[0, 1.0, 0, 0.5, 2.0, 2.0, 0x5a5048], [0, 0.4, 0, 0.56, 0.04, 2.0, 0x7a7068], [0, 1.0, 0, 0.56, 0.04, 2.0, 0x7a7068], [0, 1.6, 0, 0.56, 0.04, 2.0, 0x7a7068]];
  const shelves = [{ x: -9.2, z: -17.6 }, { x: -9.2, z: -20.6 }, { x: -6.0, z: -21.8, ry: Math.PI / 2 }]; root.add(instanced(shelf, shelves, { name: 'shelves5', shadow: true })); for (const s of shelves) solid(s.x, s.z, s.ry ? 2.0 : 0.6, s.ry ? 0.6 : 2.0, 2.0);
  const files = []; const rr = rngOf(37); for (const s of shelves) for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) files.push({ x: s.x + (s.ry ? -0.75 + i * 0.5 : 0), y: 0.42 + k * 0.6, z: s.z + (s.ry ? 0 : -0.75 + i * 0.5), ry: (s.ry || 0) + rr() * 0.2, color: [0xb89a6a, 0x6a7a8a, 0x8a5a4a, 0x9aa080][Math.floor(rr() * 4)] });
  root.add(instanced([[0, 0.16, 0, 0.3, 0.32, 0.4, 0xffffff]], files, { name: 'files5' }));
  B.box('prop', -5.6, 0.38, -18.4, 1.8, 0.76, 0.9, 0x6a6058); B.box('prop', -5.4, 0.79, -18.4, 0.42, 0.03, 0.3, 0xf0eee6, { edges: false }); solid(-5.6, -18.4, 1.8, 0.9, 0.8);
  spots.push({ id: 'ow_roster', kind: 'clue5', clue: 'roster', x: -5.6, z: -17.4, r: 1.1, label: '机の上の被験者名簿' });
  spots.push({ id: 'ow_notes', kind: 'clue5', clue: 'notes', x: -8.4, z: -19.0, r: 1.0, label: '棚の研究ノート' });
  const sir = atlas.add(signDraw('資料室', { bg: '#e8e8e0', fg: '#203020', size: 34 })); B.box('sign', -2.76, 2.6, -19.0, 0.03, 0.34, 1.2, 0xffffff, { uv: sir, face: 1, edges: false });
  // 電気室（secret の配電盤）
  B.box('prop', 9.5, 1.4, -19.0, 0.5, 2.2, 2.0, 0x5a6064); for (let i = 0; i < 5; i++) { B.box('prop', 9.22, 1.0 + i * 0.3, -19.0, 0.04, 0.12, 1.2, 0x2a2a30, { edges: false }); B.box('glow', 9.2, 1.0 + i * 0.3, -19.5, 0.02, 0.06, 0.06, 0xff4040, { edges: false }); }
  solid(9.5, -19.0, 0.5, 2.0, 2.2); dyn.breakerHalo = halos.push({ p: [9.0, 1.6, -19.0], size: 1.2, color: 0xffb040, k: 0.0 }) - 1;
  spots.push({ id: 'ow_breaker', kind: 'breaker5', x: 8.5, z: -19.0, r: 1.2, label: '配電盤（旧研究棟の非常電源）' });
  spots.push({ id: 'ow_maint', kind: 'clue5', clue: 'maint5', x: 8.5, z: -16.8, r: 1.0, label: '盤の横の保全記録' });
  B.box('prop', 9.6, 1.5, -16.8, 0.04, 0.5, 0.36, 0xf0eee0, { edges: false });
  const den = atlas.add(signDraw('電気室', { bg: '#e8e8e0', fg: '#203020', size: 34 })); B.box('sign', 2.76, 2.6, -19.0, 0.03, 0.34, 1.2, 0xffffff, { uv: den, face: 0, edges: false });
  // 103 号室の手紙（任意）
  spots.push({ id: 'ow_letter', kind: 'clue5', clue: 'letter', x: R['103'][0] + 1.0, z: R['103'][1] + 1.6, r: 1.0, label: '103 号室の机の手紙' });
  B.box('prop', R['103'][0] + 0.6, 0.78, R['103'][1] + 2.2, 0.22, 0.01, 0.3, 0xf4f0e4, { edges: false });
  // 点呼卓（廊下の北）・隔離扉（観測棟へ）
  B.box('prop', 0, 0.55, -20.4, 2.4, 1.1, 0.8, 0x4a5048); B.box('prop', 0, 1.2, -20.6, 1.6, 0.5, 0.06, 0x101410, { rx: -0.4, edges: false }); B.box('glow', 0, 1.21, -20.57, 1.4, 0.4, 0.01, 0x70e0a0, { rx: -0.4, edges: false });
  { const g = new THREE.CylinderGeometry(0.16, 0.2, 0.22, 12); g.translate(1.6, 1.25, -20.4); B.add('prop', g, 0xc8a040); }
  solid(0, -20.4, 2.4, 0.8, 1.2); dyn.consoleHalo = halos.push({ p: [0, 1.3, -20.1], size: 1.2, color: 0x70e0a0, k: 0.5 }) - 1;
  spots.push({ id: 'ow_console', kind: 'rollcall5', x: 0, z: -19.4, r: 1.3, label: '点呼卓' });
  const gate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.3), new THREE.MeshToonMaterial({ color: 0x5a5a40, gradientMap: gradientMap() })); gate.position.set(0, 1.5, -22.3); root.add(gate);
  B.box('wall', -2.0, H / 2, -22.3, 0.6, H, 0.5, W1); B.box('wall', 2.0, H / 2, -22.3, 0.6, H, 0.5, W1);
  const gateBox = cbox(0, -22.0, 3.4, 0.8, 3.0); boxes.push(gateBox);
  dyn.gate = { mesh: gate, box: gateBox, open: false, up: 1.5 + 2.9, down: 1.5, target: 1.5 };
  dyn.gateHalo = halos.push({ p: [0, 3.1, -22.0], size: 0.8, color: 0xff3030, k: 0.9, hazard: true }) - 1;
  const kakuri = atlas.add(signDraw('隔離扉　観測棟', { bg: '#2a1a14', fg: '#ffd0a0', size: 30 })); B.box('sign', 0, 3.25, -22.05, 2.4, 0.3, 0.02, 0xffffff, { uv: kakuri, face: 4, edges: false });
  spots.push({ id: 'exit_atrium', kind: 'exit', to: 'atrium', spawn: 'from_oldwing', x: 0, z: -21.6, r: 1.2, label: '隔離扉（観測棟へ）', needFlag: 'ow_gate', lockedText: 'ow_gate_locked' });
  // ── 東の帯：主任研究室への廊下（reveal は床が崩れている）・主任研究室 ──
  const G = OLDWING.gap;
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(G.maxX - G.minX, G.maxZ - G.minZ), new THREE.MeshBasicMaterial({ color: 0x050308 })); pit.rotation.x = -Math.PI / 2; pit.position.set((G.minX + G.maxX) / 2, 0.015, (G.minZ + G.maxZ) / 2); root.add(pit);
  const pitEdge = new THREE.Group(); for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (i % 3) * 0.12, 0), new THREE.MeshToonMaterial({ color: 0x6a6a62, gradientMap: gradientMap() })); m.position.set(G.minX + (i / 8) * (G.maxX - G.minX), 0.15, i % 2 ? G.maxZ + 0.3 : G.minZ - 0.3); m.rotation.set(i, i * 2, 0); pitEdge.add(m); } root.add(pitEdge);
  const pitBox = cbox((G.minX + G.maxX) / 2, (G.minZ + G.maxZ) / 2, G.maxX - G.minX, G.maxZ - G.minZ, 3.0);
  dyn.gap = { pit, edge: pitEdge, box: pitBox, on: false, halo: halos.push({ p: [(G.minX + G.maxX) / 2, 0.4, (G.minZ + G.maxZ) / 2], size: 4.0, color: 0x8a3ad8, k: 0.0 }) - 1 };
  // 東の帯（x 9.8〜14）：広間の戸 → 北へ。床の崩れ（z −10〜−13.6）の向こうが主任研究室（z −14〜−22.4）
  wall(10.4, -14.0, 1.2, 0.3, W2); wall(13.4, -14.0, 1.2, 0.3, W2); B.box('wall', 11.9, H - 0.4, -14.0, 1.8, 0.8, 0.3, W1);
  B.box('prop', 12.0, 0.38, -21.0, 2.2, 0.76, 1.0, 0x4a3a2e); B.box('prop', 12.2, 0.79, -21.0, 0.44, 0.03, 0.32, 0xf0ece0, { edges: false }); solid(12.0, -21.0, 2.2, 1.0, 0.8);
  B.box('prop', 13.6, 1.0, -17.5, 0.5, 2.0, 2.4, 0x4a3e34); solid(13.6, -17.5, 0.5, 2.4, 2.0);
  spots.push({ id: 'ow_chief', kind: 'delay5', where: 'chief', x: 12.0, z: -20.0, r: 1.2, label: '主任研究室の机（引き出し）' });
  const shu = atlas.add(signDraw('主任研究室', { bg: '#e8e8e0', fg: '#203020', size: 34 })); B.box('sign', 11.9, 2.75, -13.84, 1.6, 0.3, 0.03, 0xffffff, { uv: shu, face: 4, edges: false });
  spots.push({ id: 'ow_leap_s', kind: 'leap5', x: 11.9, z: -9.2, r: 1.2, to: [11.9, -14.8], label: '崩れた床の向こうへ跳ぶ' });
  spots.push({ id: 'ow_leap_n', kind: 'leap5', x: 11.9, z: -14.6, r: 1.0, to: [11.9, -8.8], label: '崩れた床を跳んで戻る' });
  // ── 西の帯：記録保管庫（secret：封印 → 水が引くと通れる）──
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 8.0), new THREE.MeshBasicMaterial({ color: 0x14304a, transparent: true, opacity: 0.82, fog: true })); water.rotation.x = -Math.PI / 2; water.position.set(-11.9, 0.9, 0.0); root.add(water);
  const waterBox = cbox(-11.9, 0.0, 4.0, 8.0, 1.0); boxes.push(waterBox);
  dyn.water = { mesh: water, box: waterBox, level: 0.9, target: 0.9, drained: false };
  for (let k = 0; k < 8; k++) B.box('prop', -11.9, 0.06 + k * 0.0, 3.6 - k * 1.0, 3.6, 0.12, 0.5, 0x4a4e48, { edges: false });
  B.box('prop', -12.0, 0.38, -20.4, 2.2, 0.76, 1.0, 0x4a4e58); B.box('prop', -11.8, 0.79, -20.4, 0.44, 0.03, 0.32, 0xf0ece0, { edges: false }); solid(-12.0, -20.4, 2.2, 1.0, 0.8);
  spots.push({ id: 'ow_archive', kind: 'delay5', where: 'archive', x: -12.0, z: -19.4, r: 1.2, label: '記録保管庫の机（控えの綴り）' });
  const arcShelf = [{ x: -13.6, z: -8.0 }, { x: -13.6, z: -12.0 }, { x: -13.6, z: -16.0 }]; root.add(instanced(shelf, arcShelf, { name: 'arcshelves', shadow: true })); for (const s of arcShelf) solid(s.x, s.z, 0.6, 2.0, 2.0);
  const kiroku = atlas.add(signDraw('記録保管庫', { bg: '#e8e8e0', fg: '#203020', size: 34 })); B.box('sign', -11.9, 2.9, 6.17, 2.0, 0.3, 0.02, 0xffffff, { uv: kiroku, face: 4, edges: false });
  // 隠れ場所
  hideSpots.push({ x: -6.2, z: 10.6 }, { x: 6.4, z: 10.4 }, { x: -6.0, z: 2.0 }, { x: 6.0, z: -5.0 }, { x: -6.0, z: -12.0 }, { x: 6.0, z: 2.0 });
  // 明かり：廊下の蛍光灯（いくつかちらつく）・部屋・非常灯（secret の停電で赤だけになる）
  const lights = [
    { id: 'hall', pos: [0, 3.1, 10.0], color: 0xe8f0e0, intensity: 6, dist: 12, main: true },
    { id: 'c1', pos: [0, 3.1, 2.0], color: 0xdfe8d8, intensity: 5, dist: 9, main: true },
    { id: 'c2', pos: [0, 3.1, -7.0], color: 0xdfe8d8, intensity: 4, dist: 9, main: true, flicker: true },
    { id: 'c3', pos: [0, 3.1, -16.0], color: 0xdfe8d8, intensity: 4.5, dist: 9, main: true },
    { id: 'arch', pos: [-11.9, 3.0, -12.0], color: 0xc8d0e0, intensity: 3, dist: 9, main: true },
    { id: 'east', pos: [11.9, 3.0, -6.0], color: 0xc8d0e0, intensity: 3, dist: 9, main: true },
    { id: 'chief', pos: [11.6, 2.8, -19.0], color: 0xffd8a0, intensity: 3.5, dist: 7, main: true },
    { id: 'docs', pos: [-6.0, 2.9, -19.0], color: 0xffe0b0, intensity: 3, dist: 7, main: true },
    { id: 'elec', pos: [6.0, 2.9, -19.0], color: 0xc8e0ff, intensity: 2.5, dist: 7, main: true },
    { id: 'em1', pos: [0, 2.8, 13.6], color: 0xff3020, intensity: 1.5, dist: 8, emergency: true },
    { id: 'em2', pos: [0, 2.8, -12.0], color: 0xff3020, intensity: 1.2, dist: 9, emergency: true },
    { id: 'em3', pos: [-11.9, 2.6, 4.0], color: 0xff3020, intensity: 1.2, dist: 7, emergency: true },
    { id: 'con', pos: [0, 1.6, -19.6], color: 0x70e0a0, intensity: 2.0, dist: 5 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (l.main && l.id[0] !== 'a' && l.id !== 'east') { B.box('glow', l.pos[0], H - 0.03, l.pos[2], 0.3, 0.04, 1.6, 0xf4f8ff, { edges: false }); halos.push({ p: [l.pos[0], H - 0.15, l.pos[2]], size: 1.2, color: l.color, k: 0.4, light: l }); }
  for (const l of lights) if (l.emergency) { B.box('glow', l.pos[0], l.pos[1], l.pos[2], 0.3, 0.12, 0.12, 0xff4030, { edges: false }); halos.push({ p: l.pos, size: 0.9, color: 0xff3020, k: 0.7, emergencyHalo: true }); }
  const wet = lights.filter(l => l.main).map(l => ({ p: [l.pos[0], 0, l.pos[2]], size: 1.3, color: l.color, k: 0.18, light: l.id }));
  root.add(lightShafts([{ p: [-14.0, 2.6, 8.8], dir: [1, -0.4, 0], len: 5, w0: 2.0, w1: 3.4, color: 0x8a6ad0, k: 0.22 }, { p: [0, H - 0.05, 2], dir: [0, -1, 0], len: 3, w0: 0.8, w1: 1.8, color: 0xc8d8c0, k: 0.1 }]));
  const sr = rngOf(91), st = [];
  for (let i = 0; i < 20; i++) st.push({ p: [(sr() - 0.5) * 26, 0, 12 - sr() * 34], n: 'floor', size: 0.8 + sr() * 1.6, kind: [1, 3, 5, 6][Math.floor(sr() * 4)], rot: sr() * 6, k: 0.6 });
  for (let i = 0; i < 8; i++) { const sx = sr() < 0.5 ? -1 : 1; st.push({ p: [sx * 2.45, 0.5 + sr() * 2, 4 - sr() * 24], n: sx < 0 ? '+x' : '-x', size: 0.7 + sr(), kind: [0, 2, 1][Math.floor(sr() * 3)], rot: sr(), k: 0.5 }); }
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('oldwing', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -14, maxX: 14, minZ: -22.4, maxZ: 14 }, spawns: { gate: [-12.4, 9.0, Math.PI / 2], tunnel: [12.6, 9.6, -Math.PI / 2], gatein: [0, -20.6, 0], hall: [0, 9.0, Math.PI] },
    fog: { color: 0x0c0e0c, density: 0.045 }, rain: false, amb: 'oldwing',
  });
}

// ───────────────────────── 観測棟の吹き抜け（継接） ─────────────────────────
export function buildAtrium() {
  const root = new THREE.Group(); root.name = 'area_atrium';
  root.add(skyDome({ top: 0x06040c, mid: 0x1a0c26, horizon: 0x3a1430, moon: [0.2, 0.7, -0.6] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 9, y0 = 0) => { const b = cbox(cx, cz, w, d, h, y0); boxes.push(b); return b; };
  const H = 9.0, W1 = 0x6a6e78, W2 = 0x565a64;
  const wall = (cx, cz, w, d, c = W1, h = H) => { B.box('wall', cx, h / 2, cz, w, h, d, c); return solid(cx, cz, w, d, h); };
  const ft = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3e4048'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#454750' : '#3a3c44'; g.fillRect(x + 2, y + 2, 60, 60); } for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(20,10,30,.6)'; g.lineWidth = 2; g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(7, 7);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(28.4, 28.4), new THREE.MeshToonMaterial({ map: ft, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -5); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  // 外周（高い吹き抜け）・2 階の回廊・割れたガラスの天井の骨組み
  wall(-14.2, -5, 0.4, 28.4); wall(14.2, -5, 0.4, 28.4); wall(0, -19.2, 28.4, 0.4, W2); wall(-8.0, 9.2, 12.4, 0.4); wall(8.0, 9.2, 12.4, 0.4); B.box('wall', 0, H - 2.5, 9.2, 3.6, 5.0, 0.4, W1);
  for (const sx of [-1, 1]) { B.box('prop', sx * 12.6, 4.4, -5, 3.0, 0.2, 28.0, 0x4a4e58); B.box('prop', sx * 11.2, 5.0, -5, 0.06, 1.0, 28.0, 0x8a8e98, { edges: false }); for (let z = 8; z > -19; z -= 4) B.box('wall', sx * 11.2, 2.2, z, 0.3, 4.4, 0.3, 0x3a3e48); }
  for (let i = -3; i <= 3; i++) { B.box('prop', i * 4, H, -5, 0.2, 0.3, 28.4, 0x2a2c34, { edges: false }); B.box('prop', 0, H, -5 + i * 4, 28.4, 0.3, 0.2, 0x2a2c34, { edges: false }); }
  for (let i = 0; i < 12; i++) { const x = (i % 4 - 1.5) * 6, z = -15 + Math.floor(i / 4) * 9; B.box('glass', x + 1.5, H - 0.05, z + 2, 3.6, 0.04, 3.6, 0x1a2234, { edges: false }); }
  // 窓（2 階の高い窓：月の光）
  for (const sx of [-1, 1]) for (let z = 4; z > -18; z -= 5) { B.box('glow', sx * 14.0, 6.6, z, 0.05, 2.2, 1.6, 0x2a3a6a, { edges: false }); }
  // 北の壁ぎわ：観測室の机 A・B・C（鞄の持ち主＝B）・名札・パソコン
  const D = ATRIUM.desks;
  for (const [k, [x, z]] of Object.entries(D)) {
    B.box('prop', x, 0.38, z, 2.4, 0.76, 1.0, 0x5a5048); solid(x, z, 2.4, 1.0, 0.8);
    B.box('prop', x - 0.5, 0.98, z - 0.2, 0.7, 0.44, 0.05, 0x101218, { edges: false }); B.box('glow', x - 0.5, 0.99, z - 0.17, 0.62, 0.36, 0.01, k === 'B' ? 0x8a6ad8 : 0x406a8a, { edges: false });
    const u = atlas.add(signDraw('机 ' + k, { bg: '#e8e4d8', fg: '#2a2a2a', size: 40 })); B.box('sign', x + 0.7, 0.86, z + 0.48, 0.5, 0.2, 0.03, 0xffffff, { uv: u, face: 4, edges: false });
    spots.push({ id: 'at_desk_' + k, kind: 'desk5', desk: k, x, z: z + 1.0, r: 1.3, label: '観測室の机 ' + k });
  }
  spots.push({ id: 'at_duty', kind: 'clue5', clue: 'duty', x: -12.6, z: -14.0, r: 1.1, label: '壁の当番表' });
  B.box('prop', -13.95, 1.6, -14.0, 0.04, 0.8, 0.6, 0xf0eee0, { edges: false });
  // 相棒が見守る観測室（南東・ガラス張りの小部屋）
  const [wx, wz] = ATRIUM.watch;
  wall(wx - 3.0, wz, 0.2, 2.6, W2, 2.8); wall(wx, wz - 1.3, 6.0, 0.2, W2, 1.0); B.box('glass', wx, 1.9, wz - 1.3, 6.0, 1.8, 0.04, 0x2a3a50, { edges: false });
  B.box('prop', wx + 1.5, 0.45, wz + 0.4, 1.6, 0.9, 0.6, 0x4a4e58); halos.push({ p: [wx, 2.4, wz], size: 2.0, color: 0xffd8a0, k: 0.45 });
  // 中央：割れた観測装置（中ボスの輪の中心）・床の縫い目のような亀裂（紫）
  { const g = new THREE.CylinderGeometry(1.6, 2.0, 0.6, 16); g.translate(0, 0.3, -6); B.add('prop', g, 0x3a3c46); solid(0, -6, 0.0, 0.0, 0.0); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, L = 3 + (i % 3) * 2.5; B.box('glow', Math.sin(a) * (2.2 + L / 2), 0.02, -6 + Math.cos(a) * (2.2 + L / 2), 0.14, 0.02, L, i % 2 ? 0x9a3aff : 0xff4ad8, { ry: a, edges: false }); }
  halos.push({ p: [0, 0.6, -6], size: 6, color: 0x9a3aff, k: 0.4 });
  // 入口（南：旧研究棟の隔離扉）・出口（北東の階段：屋上 reveal ／ 連絡橋 secret）
  spots.push({ id: 'exit_oldwing', kind: 'exit', to: 'oldwing', spawn: 'gatein', x: 0, z: 8.6, r: 1.0, label: '旧研究棟へ戻る' });
  for (let k = 0; k < 10; k++) B.box('prop', 9.0 + 0.0, 0.2 + k * 0.4, -14.0 - k * 0.45, 3.0, 0.1, 0.45, 0x4a4e58, { edges: false });
  const kaidan = atlas.add(signDraw('屋上・連絡橋', { bg: '#1a2a1a', fg: '#a0ffb0', size: 30 })); B.box('sign', 9.0, 3.6, -18.98, 2.2, 0.3, 0.02, 0xffffff, { uv: kaidan, face: 4, edges: false });
  spots.push({ id: 'at_stairs', kind: 'stairs5', x: 9.0, z: -13.0, r: 1.4, label: '北東の階段' });
  // 明かり
  const lights = [
    { id: 'moon', pos: [0, 8.5, -5], color: 0x8a9ae0, intensity: 14, dist: 22 },
    { id: 'core', pos: [0, 0.6, -6], color: 0xa050ff, intensity: 3.5, dist: 9 },
    { id: 'desk', pos: [0, 2.5, -15.5], color: 0xc8b0ff, intensity: 5, dist: 10 },
    { id: 'watch', pos: [wx, 2.4, wz], color: 0xffd8a0, intensity: 3, dist: 6 },
    { id: 'sw', pos: [-10, 3, 5], color: 0xdfe8f8, intensity: 3.5, dist: 9, flicker: true },
    { id: 'stair', pos: [9, 3.5, -15], color: 0xa0ffb0, intensity: 2.5, dist: 7 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  root.add(lightShafts([{ p: [0, H - 0.2, -5], dir: [0.1, -1, -0.15], len: 8.5, w0: 4.0, w1: 7.0, color: 0x8a9ae0, k: 0.16 }, { p: [-14, 6.6, -6], dir: [1, -0.5, 0], len: 9, w0: 1.4, w1: 3.0, color: 0x6a7ad0, k: 0.12 }]));
  hideSpots.push({ x: -11, z: 6 }, { x: 11, z: -2 }, { x: -11, z: -12 });
  const sr = rngOf(17), st = []; for (let i = 0; i < 18; i++) st.push({ p: [(sr() - 0.5) * 26, 0, 8 - sr() * 26], n: 'floor', size: 1 + sr() * 2, kind: [1, 3, 5][Math.floor(sr() * 3)], rot: sr() * 6, k: 0.6 });
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('atrium', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots, surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -14, maxX: 14, minZ: -19, maxZ: 9 }, spawns: { from_oldwing: [0, 7.4, Math.PI], center: [0, 2.0, Math.PI] },
    fog: { color: 0x0a0810, density: 0.035 }, rain: false, amb: 'atrium', far: 140,
  });
}

BUILDERS3.oldwing = buildOldwing;
BUILDERS3.atrium = buildAtrium;
