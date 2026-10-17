// フェーズ8 の区画【仮】：world/areas.js と同じ形の区画を返す。
// ・abyss（崩れた町と境界の淵・巨大用）：町の北が抜け落ち、底の見えない淵が口を開ける。崩れた家・店・電柱の欠片が宙に浮く。
//   南に人の大きさで入る所（公衆電話＝最終戦の前のセーブ地点・淵の縁）。避難の灯（体育館・病院の屋上・商店街の南口）に人が残る。
// ・kiroku（記録の間・人の大きさ）：境界制御室の奥。丸い部屋の壁一面の画面が「事故の瞬間」をくり返す。記録装置（オープンリール）3 台。
//   中央の床に、閉じた隔離室の扉の再現（ガラスの箱）。入口の通路に内線電話（最終戦の前のセーブ地点）。
// ・epilogue（結末の場面）：病院の個室（昼）・自宅の居間・元に戻りつつある商店街（夕方）・病院の廊下（対比の場面）を離して置く。
// 静的な箱は材質ごとに 1 つの網、繰り返す物はインスタンス網、光るものは安い発光。名前・表示はすべて仮。町は月代町ではない。
import * as THREE from 'three';
import { Builder, Atlas, signDraw, groundTex } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex, JP_FONT } from '../render/toon.js';
import { instanced, finish, BUILDERS3 } from './areas.js';
import { lightShafts } from '../render/shafts.js';
import { skyDome } from '../render/sky.js';
import { ABYSS, KIROKU, EPILOGUE } from '../data/ch7.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// ───────────────────────── 崩れた町と境界の淵（終章A・巨大用） ─────────────────────────
export function buildAbyss() {
  const root = new THREE.Group(); root.name = 'area_abyss';
  root.add(skyDome({ top: 0x0a0414, mid: 0x3a0c46, horizon: 0xb02a7a, moon: [0.05, 0.38, -0.92] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [];
  const rr = rngOf(8181);
  const gt = groundTex({ base: '#241f2a', repeat: [30, 30] });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  // 境界の淵：底の見えない穴（黒い円盤・縁は紫に光る）。縁の割れ目
  const P = ABYSS.pit;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(P.r, 48), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })); hole.rotation.x = -Math.PI / 2; hole.position.set(P.x, 0.03, P.z); root.add(hole);
  const rimM = new THREE.MeshBasicMaterial({ color: 0xc040ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const rim = new THREE.Mesh(new THREE.RingGeometry(P.r - 0.4, P.r + 1.6, 64), rimM); rim.rotation.x = -Math.PI / 2; rim.position.set(P.x, 0.05, P.z); root.add(rim); dyn.rim = rim;
  // 淵から立ちのぼる光（下ほど濃い：頂点の色で上へ消える）
  const gGeo = new THREE.CylinderGeometry(P.r + 6, P.r - 2, 46, 40, 4, true), gc = [], gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) { const k = Math.max(0, 1 - (gp.getY(i) + 23) / 46); gc.push(0.6 * k * k, 0.19 * k * k, 1.0 * k * k); }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
  const glowUp = new THREE.Mesh(gGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  glowUp.position.set(P.x, 23, P.z); glowUp.visible = false; root.add(glowUp); dyn.pitGlow = glowUp;
  halos.push({ p: [P.x, 4, P.z], size: 46, color: 0x9a30ff, k: 0.45 });
  // 縁の崩れた地面（傾いた板）
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + rr() * 0.2, d = P.r + 2 + rr() * 5, s = 2 + rr() * 4; B.box('prop', P.x + Math.sin(a) * d, 0.3, P.z + Math.cos(a) * d, s, 0.6, s * 0.7, [0x3a343e, 0x4a4250, 0x2e2a34][i % 3], { ry: a, rx: (rr() - 0.5) * 0.5, rz: (rr() - 0.3) * 0.6 }); }
  boxes.push(cbox(P.x, P.z - 4, P.r * 1.4, P.r * 1.2, 40));                                             // 淵には入れない（巨大猫又も）
  for (let i = 0; i < 26; i++) { const a = rr() * Math.PI * 2, d = P.r + 1 + rr() * 14; B.box('glow', P.x + Math.sin(a) * d, 0.04, P.z + Math.cos(a) * d, 0.2 + rr() * 0.3, 0.03, 3 + rr() * 8, rr() < 0.5 ? 0xd050ff : 0x7a2ab8, { ry: a + (rr() - 0.5) * 0.6, edges: false }); }
  // 崩れた町：傾いた家・店・集合住宅（南と東西）。窓の灯り（避難の灯の周りは暖かい）
  const winGlow = (x, z, w, h, sx, warm, n) => { for (let k = 0; k < n; k++) { const fy = 2.6 + Math.floor(k / 3) * 3, fx = (k % 3 - 1) * (w / 3.2); if (fy > h - 1.6) break; B.box('glow', x - sx * (w / 2 + 0.06), fy, z + fx, 0.1, 1.2, 1.4, rr() < (warm ? 0.6 : 0.15) ? (warm ? 0xffc880 : 0x8a6ad8) : 0x14101c, { edges: false }); } };
  for (const R of ABYSS.refuges) {
    const [x, z] = R.pos, sx = Math.sign(x) || 1, w = 16, d = 14, h = R.id === 'H' ? 24 : R.id === 'S' ? 12 : 9;
    B.box('wall', x + sx * 6, h / 2, z, w, h, d, R.id === 'H' ? 0xd8d4cc : 0x8a8478); boxes.push(cbox(x + sx * 6, z, w, d, h));
    winGlow(x + sx * 6, z, w, h, sx, true, 18);
    if (R.id === 'H') { B.box('glow', x + sx * 6 - sx * (w / 2 + 0.08), h - 2.4, z, 0.1, 2.2, 2.2, 0x40d080, { edges: false }); B.box('glow', x + sx * 6 - sx * (w / 2 + 0.09), h - 2.4, z, 0.1, 0.5, 1.6, 0xffffff, { edges: false }); }
    const u = atlas.add(signDraw(R.name, { bg: '#20202a', fg: '#ffe0b0', size: 30 })); B.box('sign', x + sx * 6 - sx * (w / 2 + 0.1), 1.8, z + d / 2 - 2.5, 0.05, 1.0, 4.4, 0xffffff, { uv: u, face: sx > 0 ? 1 : 0, edges: false });
    // 屋上・入口に灯りを掲げる人たち（小さな光の点）
    const lx = x + sx * 6 - sx * (w / 2 - 1), top = h + 0.1;
    dyn['ref' + R.id] = { halo: halos.push({ p: [lx, top + 1.5, z], size: 10, color: 0xffd8a0, k: 0.35 }) - 1, lamps: [] };
    for (let k = 0; k < 8; k++) { const hz = z - d / 2 + 1 + k * (d - 2) / 7; dyn['ref' + R.id].lamps.push(halos.push({ p: [lx, top + 1.0, hz], size: 0.9, color: 0xfff0c0, k: 0.0 }) - 1); }
    B.box('prop', lx, h + 0.25, z, 0.15, 0.5, d - 1, 0x3a3640);                                  // 屋上の手すり（低い）
  }
  const rows = [];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 1.6 - Math.PI * 0.8 + Math.PI, d = 58 + rr() * 30; const x = Math.sin(a) * d, z = Math.cos(a) * d + 10; if (z < -10) continue; rows.push({ x, z, h: 8 + rr() * 18, ry: a, tilt: (rr() - 0.5) * 0.16 }); }
  rows.forEach((r, i) => { B.box('wall', r.x, r.h / 2, r.z, 10, r.h, 9, [0x4a4048, 0x3a4050, 0x4e4456][i % 3], { ry: r.ry, rz: r.tilt }); winGlow(r.x, r.z, 9, r.h, Math.sign(r.x) || 1, false, 9); });
  // 浮かぶ欠片（家の壁・看板・瓦礫・電柱）：淵の上と周り。インスタンス網（ゆっくり回る）
  const fl0 = [];
  for (let i = 0; i < 64; i++) { const a = rr() * Math.PI * 2, d = 14 + rr() * (P.r + 26), y = 4 + rr() * 40; fl0.push({ x: P.x + Math.sin(a) * d, y, z: P.z + Math.cos(a) * d * 0.8 - 8, s: 0.6 + rr() * 2.6, rx: rr() * 3, ry: rr() * 3, sp: (rr() - 0.5) * 0.3, bob: rr() * 6 }); }
  const fGeo = new THREE.BoxGeometry(1, 0.6, 1.4); const fMesh = new THREE.InstancedMesh(fGeo, new THREE.MeshToonMaterial({ color: 0x5a5060, gradientMap: gradientMap() }), fl0.length);
  fl0.forEach((f, i) => fMesh.setColorAt(i, new THREE.Color([0x8a7a90, 0x9a8a78, 0x6a6278, 0xb8a890][i % 4]))); fMesh.name = 'floaters'; fMesh.castShadow = false; root.add(fMesh);
  dyn.floaters = { mesh: fMesh, list: fl0, M: new THREE.Matrix4(), Q: new THREE.Quaternion(), E: new THREE.Euler(), S: new THREE.Vector3(), V: new THREE.Vector3() };
  // 道（南から淵の縁へ）・人の大きさで歩く所：公衆電話・淵の縁の柵
  for (let z = 14; z < 56; z += 4) B.box('glow', 0, 0.02, z, 0.25, 0.02, 2.0, 0xd8d0a0, { edges: false });
  B.box('prop', -6, 0.15, 36, 1, 0.3, 42, 0x6a6a72, { edges: false }); B.box('prop', 6, 0.15, 36, 1, 0.3, 42, 0x6a6a72, { edges: false });
  const [phx, phz] = ABYSS.phone;
  B.box('prop', phx, 1.1, phz, 0.9, 2.2, 0.9, 0x3a8a4a); B.box('glow', phx, 2.1, phz + 0.46, 0.6, 0.25, 0.02, 0xd8ffd8, { edges: false }); B.box('prop', phx, 1.2, phz + 0.4, 0.4, 0.6, 0.12, 0x1a2a1e);
  halos.push({ p: [phx, 2.2, phz + 0.6], size: 1.6, color: 0xa0ffb0, k: 0.5 });
  spots.push({ id: 'ab_phone', kind: 'save', x: phx, z: phz + 1.0, r: 1.3, label: '公衆電話（セーブ）' });
  for (let x = -5; x <= 5; x += 1) B.box('prop', x, 0.5, ABYSS.edge[1] - 1.2, 0.08, 1.0, 0.08, 0x8a7a6a, { rz: (rr() - 0.5) * 0.5 });
  spots.push({ id: 'ab_edge', kind: 'edge7', x: ABYSS.edge[0], z: ABYSS.edge[1], r: 2.4, label: '淵の縁へ ── 巨大猫又になる' });
  spots.push({ id: 'ab_tag', kind: 'clue7', clue: 'spouse7a', x: -3.2, z: 36.5, r: 1.2, label: '焼けた名札（任意）' });
  B.box('glow', -3.2, 0.05, 36.5, 0.3, 0.02, 0.2, 0xffe0a0, { edges: false }); halos.push({ p: [-3.2, 0.3, 36.5], size: 0.7, color: 0xffe0a0, k: 0.5 });
  // 壊れる小物（街灯・電柱・車）：dyn.props の形（巨大猫又の踏み・爪・光線で壊れる）
  const K = {
    lamp: [[0, 3.5, 0, 0.25, 7.0, 0.25, 0x4a4e58], [0.8, 7.0, 0, 1.8, 0.2, 0.3, 0x4a4e58], [1.6, 6.8, 0, 0.6, 0.25, 0.5, 0xffe8c0]],
    pole: [[0, 4.5, 0, 0.36, 9.0, 0.36, 0x6a6460], [0, 8.4, 0, 2.6, 0.2, 0.2, 0x4a4440]],
    car: [[0, 0.7, 0, 1.8, 0.9, 4.2, 0xffffff], [0, 1.4, -0.3, 1.6, 0.6, 2.2, 0x2a3040], [0.78, 0.3, 1.35, 0.26, 0.6, 0.62, 0x18181c], [-0.78, 0.3, 1.35, 0.26, 0.6, 0.62, 0x18181c], [0.78, 0.3, -1.35, 0.26, 0.6, 0.62, 0x18181c], [-0.78, 0.3, -1.35, 0.26, 0.6, 0.62, 0x18181c]],   // P13：車輪（前は車体が浮いていた）
  };
  const PL = []; let n = 0; const add = (kind, x, z, ry = 0, color) => PL.push({ id: kind + '_' + (n++), kind, x, z, ry, color });
  for (let z = -2; z < 56; z += 12) { add('lamp', -14, z, 0); add('lamp', 14, z + 6, Math.PI); }
  for (const x of [-20, 20]) for (let z = -6; z <= 50; z += 14) add('pole', x, z, 0);
  for (let i = 0; i < 8; i++) add('car', (rr() < 0.5 ? -1 : 1) * (8 + rr() * 10), -2 + rr() * 50, rr() * 3, [0xd84a3a, 0x3a6ad8, 0xe8e8e8, 0x2a2a30][i % 4]);
  dyn.props = [];
  const HP = { lamp: 6, pole: 10, car: 8 }, PR = { lamp: 1.0, pole: 1.2, car: 2.2 };
  for (const [kind, parts] of Object.entries(K)) {
    const list = PL.filter(p => p.kind === kind); if (!list.length) continue;
    const m = instanced(parts, list.map(p => ({ x: p.x, z: p.z, ry: p.ry, color: p.color })), { name: 'prop_' + kind, shadow: true }); root.add(m);
    list.forEach((p, i) => dyn.props.push({ id: p.id, kind, x: p.x, z: p.z, ry: p.ry, r: PR[kind], hp: HP[kind], hpMax: HP[kind], alive: true, mesh: m, idx: i }));
  }
  const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7, 0), new THREE.MeshToonMaterial({ color: 0x4a4650, gradientMap: gradientMap() }), 80);
  const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 80; i++) debris.setMatrixAt(i, Z); debris.name = 'debris'; root.add(debris); dyn.debris = { mesh: debris, n: 0 };
  const lights = [
    { id: 'moonfill', pos: [0, 40, 30], color: 0x9a6ad8, intensity: 55, dist: 170 },
    { id: 'pit', pos: [0, 16, -30], color: 0xc040ff, intensity: 140, dist: 110 },
    { id: 'refS', pos: [-28, 10, 6], color: 0xffb070, intensity: 24, dist: 24 },
    { id: 'refH', pos: [26, 18, 22], color: 0xffd8b0, intensity: 24, dist: 26 },
    { id: 'refM', pos: [-18, 8, 40], color: 0xffb070, intensity: 22, dist: 22 },
    { id: 'phone', pos: [7.4, 3, 39], color: 0xa0ffb0, intensity: 3, dist: 8 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  return finish('abyss', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots: [], surface: () => 'asphalt', rainRoof: () => false, indoor: () => false,
    bounds: { minX: -58, maxX: 58, minZ: -46, maxZ: 58 }, spawns: { human: ABYSS.humanStart, giant: ABYSS.giantStart },
    fog: { color: 0x1a0a22, density: 0.007 }, rain: false, amb: 'abyss', far: 440, giant: true,
  });
}

// ───────────────────────── 記録の間（終章B・人の大きさ） ─────────────────────────
/** 画面の絵：事故の瞬間（閉じる隔離室の扉・赤い警報・ガラスの向こうの人影・時刻）。k：こまの番号（少しずつ違う） */
export function accidentTex(k = 0, spouse = false) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#0a0612'; g.fillRect(0, 0, w, h);
    const al = g.createLinearGradient(0, 0, 0, h); al.addColorStop(0, 'rgba(255,40,60,.35)'); al.addColorStop(1, 'rgba(60,0,20,.1)'); g.fillStyle = al; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e1a28'; g.fillRect(60, 30, 136, 110); g.fillStyle = '#4a4058'; g.fillRect(64, 34, 128, 102);
    g.fillStyle = 'rgba(180,200,255,.18)'; g.fillRect(84, 46, 88, 60);                                        // 扉の窓
    const close = Math.min(1, 0.4 + k * 0.12); g.fillStyle = '#2a2436'; g.fillRect(64, 34, 64 * close, 102); g.fillRect(192 - 64 * close, 34, 64 * close, 102);
    if (spouse || k % 3 === 1) { g.fillStyle = 'rgba(210,225,255,.7)'; g.beginPath(); g.arc(128, 66, 8, 0, 7); g.fill(); g.fillRect(121, 74, 14, 30); }        // 窓の向こうの人影（顔は描かない）
    g.fillStyle = '#ff4a5a'; g.font = 'bold 13px monospace'; g.fillText('● REC  23:4' + (k % 10) + ':0' + (k % 6), 8, 16);
    g.fillStyle = 'rgba(255,220,230,.75)'; g.font = `12px ${JP_FONT}`; g.fillText(spouse ? '最後のこま' : '隔離室　閉鎖', 8, h - 8);
    g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  });
}
export function buildKiroku() {
  const root = new THREE.Group(); root.name = 'area_kiroku';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 4) => { const b = cbox(cx, cz, w, d, h); boxes.push(b); return b; };
  const C = KIROKU.center, R = KIROKU.r, H = 6.0;
  const gt = groundTex({ base: '#1a1622', repeat: [12, 12] });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(R + 0.5, 48), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(C[0], 0, C[1]); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  const cor = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); cor.rotation.x = -Math.PI / 2; cor.position.set(0, 0.001, 9.5); root.add(cor);
  // 丸い壁（24 枚の板）・壁の画面（12 枚：事故の瞬間をくり返す）
  const N = 24, screens = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, x = C[0] + Math.sin(a) * R, z = C[1] + Math.cos(a) * R;
    if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue;                                         // 入口（南）
    B.box('wall', x, H / 2, z, 3.4, H, 0.4, 0x1e1a28, { ry: a }); solid(x, z, 2.6, 2.6, H);
  }
  B.box('wall', C[0], H + 0.1, C[1], (R + 0.6) * 2, 0.2, (R + 0.6) * 2, 0x0e0c14, { edges: false });   // 天井
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * 0.32 + i / 11 * Math.PI * 1.36, x = C[0] + Math.sin(a) * (R - 0.32), z = C[1] + Math.cos(a) * (R - 0.32);
    const tex = accidentTex(i), sc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff }));
    sc.position.set(x, 3.4, z); sc.rotation.y = a + Math.PI; root.add(sc); screens.push(sc);
    halos.push({ p: [x - Math.sin(a) * 0.3, 3.4, z - Math.cos(a) * 0.3], size: 2.4, color: 0xff6a8a, k: 0.25 });
  }
  dyn.screens = screens; dyn.spouseTex = accidentTex(7, true);
  // 中央：隔離室の扉の再現（ガラスの箱・閉じた扉）
  { const bg = new THREE.BoxGeometry(3.2, 3.2, 3.2); const glass = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x8a70e0, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })); glass.position.set(C[0], 1.6, C[1] - 2.8); root.add(glass);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({ color: 0xc8b0ff, transparent: true, opacity: 0.7 })); ed.position.copy(glass.position); root.add(ed); }
  B.box('prop', C[0], 1.5, C[1] - 4.4, 3.2, 3.0, 0.2, 0x4a4058); B.box('glow', C[0], 2.4, C[1] - 4.28, 0.9, 0.5, 0.02, 0xa0b8ff, { edges: false });
  B.box('prop', C[0] - 0.8, 1.5, C[1] - 4.25, 1.5, 2.9, 0.08, 0x2a2436); B.box('prop', C[0] + 0.8, 1.5, C[1] - 4.25, 1.5, 2.9, 0.08, 0x2a2436);   // 閉じた扉（左右の戸）
  B.box('glow', C[0], 3.25, C[1] - 2.8, 3.2, 0.04, 3.2, 0x9a40ff, { edges: false });
  solid(C[0], C[1] - 2.8, 3.4, 3.4, 3.2);
  halos.push({ p: [C[0], 2.4, C[1] - 4.1], size: 2.0, color: 0xa0b8ff, k: 0.45 });
  // 記録装置（オープンリール：箱・2 つのリール・灯）
  dyn.decks = {};
  for (const D of KIROKU.decks) {
    const [x, z] = D.pos, face = Math.atan2(C[0] - x, C[1] - z);
    B.box('prop', x, 0.9, z, 1.6, 1.8, 0.9, 0x3a3a46, { ry: face }); solid(x, z, 1.7, 1.7, 1.8);
    const reels = [];
    for (const k of [-0.4, 0.4]) {
      const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18), new THREE.MeshToonMaterial({ color: 0x9a9aa8, gradientMap: gradientMap() }));
      rl.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.position.set(x + Math.cos(face) * k + Math.sin(face) * 0.48, 1.35, z - Math.sin(face) * k + Math.cos(face) * 0.48); g.rotation.y = face; g.add(rl); root.add(g); reels.push(rl);
    }
    const lampIdx = halos.push({ p: [x + Math.sin(face) * 0.5, 0.55, z + Math.cos(face) * 0.5], size: 0.8, color: 0xff3030, k: 0.9 }) - 1;
    const u = atlas.add(signDraw('書き込み中は電源を切らない', { bg: '#f0e8d0', fg: '#8a1a1a', size: 22 })); B.box('sign', x + Math.sin(face) * 0.47, 0.35, z + Math.cos(face) * 0.47, 1.2, 0.3, 0.02, 0xffffff, { uv: u, face: 4, ry: face, edges: false });
    dyn.decks[D.id] = { reels, lamp: lampIdx };
    spots.push({ id: 'ki_' + D.id, kind: 'deck7', deck: D.id, x: x + Math.sin(face) * 1.3, z: z + Math.cos(face) * 1.3, r: 1.4, label: D.name + 'を止める' });
  }
  spots.push({ id: 'ki_reel_note', kind: 'clue7', clue: 'reel7', x: -9.6 + 1.6, z: -7 + 1.6, r: 1.0, label: '記録装置の札（任意）' });
  // 入口の通路（南）：内線電話・操作卓（（相棒）が隠れる）
  B.box('wall', -2.2, 1.8, 9.5, 0.3, 3.6, 10, 0x2a2632); B.box('wall', 2.2, 1.8, 9.5, 0.3, 3.6, 10, 0x2a2632); solid(-2.25, 9.5, 0.4, 10, 3.6); solid(2.25, 9.5, 0.4, 10, 3.6);
  B.box('wall', 0, 3.7, 9.5, 4.6, 0.2, 10, 0x18141e, { edges: false }); solid(0, 14.6, 4.6, 0.4, 3.6);
  const [px, pz] = KIROKU.phone; B.box('prop', px + 0.25, 1.3, pz, 0.15, 0.5, 0.35, 0x2a3a2e); B.box('glow', px + 0.16, 1.4, pz, 0.02, 0.18, 0.24, 0xd8ffd8, { edges: false });
  halos.push({ p: [px, 1.5, pz], size: 0.9, color: 0xa0ffb0, k: 0.5 });
  spots.push({ id: 'ki_phone', kind: 'save', x: px - 0.4, z: pz, r: 1.1, label: '内線電話（セーブ）' });
  const [cx, cz] = KIROKU.companionAt; B.box('prop', cx - 0.6, 0.55, cz - 0.6, 1.8, 1.1, 0.7, 0x2a2c3a); B.box('glow', cx - 0.6, 1.12, cz - 0.6, 1.6, 0.02, 0.5, 0x5a3a9a, { edges: false }); solid(cx - 0.6, cz - 0.6, 1.8, 0.7, 1.1);
  hideSpots.push({ x: cx, z: cz });
  // 配偶者に似た異形の立つ所（北の壁の前）：資料（任意）
  spots.push({ id: 'ki_last', kind: 'clue7', clue: 'spouse7b', x: KIROKU.spouseAt[0] + 2.0, z: KIROKU.spouseAt[1] + 2.2, r: 1.2, label: '最後のこまの画面（任意）' });
  const lights = [
    { id: 'c1', pos: [0, 5.4, -7], color: 0xb070ff, intensity: 15, dist: 18 },
    { id: 'c0', pos: [0, 4.6, 1.5], color: 0xd8c8ff, intensity: 6, dist: 10 },
    { id: 'c2', pos: [-7, 4.2, -3], color: 0xff6a8a, intensity: 5, dist: 10 },
    { id: 'c3', pos: [7, 4.2, -3], color: 0xff6a8a, intensity: 5, dist: 10 },
    { id: 'c4', pos: [0, 4.2, -16], color: 0xff6a8a, intensity: 5, dist: 10 },
    { id: 'cor', pos: [0, 3.2, 9], color: 0xd8e0e8, intensity: 3, dist: 8, flicker: true },
    { id: 'booth', pos: [0, 2.6, -9], color: 0xa0b8ff, intensity: 4, dist: 6 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  root.add(lightShafts([{ p: [0, H - 0.1, -7], dir: [0, -1, 0], len: 6, w0: 1.2, w1: 4.0, color: 0xb070ff, k: 0.12 }]));
  return finish('kiroku', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots, surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -13, maxX: 13, minZ: -20, maxZ: 14 }, spawns: { corridor: KIROKU.spawn, room: [0, 1.0, Math.PI] },
    fog: { color: 0x0c0812, density: 0.03 }, rain: false, amb: 'kiroku', far: 120,
  });
}

// ───────────────────────── 結末の場面（病院の個室・自宅・商店街・廊下） ─────────────────────────
export function buildEpilogue() {
  const root = new THREE.Group(); root.name = 'area_epilogue';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [];
  const E = EPILOGUE, rr = rngOf(505);
  // ── 病院の個室（昼・窓の光） ──
  { const x = E.hospital.x;
    B.box('floor', x, 0, 0, 7, 0.02, 7, 0xd8d4c8, { edges: false }); B.box('wall', x, 1.6, -3.6, 7, 3.2, 0.2, 0xeef0ec); B.box('wall', x - 3.6, 1.6, 0, 0.2, 3.2, 7, 0xe8ece8); B.box('wall', x + 3.6, 1.6, 0, 0.2, 3.2, 7, 0xe8ece8);
    B.box('wall', x, 3.25, 0, 7.4, 0.1, 7.4, 0xf4f4f0, { edges: false });
    // 窓（昼の空と、修理中の商店街：足場・青いシート・直りかけの看板）
    const win = atlas.add((g, w, h) => {
      const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#9ac8f0'); sk.addColorStop(0.7, '#e8f2fa'); sk.addColorStop(1, '#f4f0e8'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
      const R = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(x * w, y * h, ww * w, hh * h); };
      for (let i = 0; i < 6; i++) R(0.02 + i * 0.165, 0.52 - (i % 3) * 0.06, 0.15, 0.5, ['#a89888', '#b8a898', '#9a8a7a'][i % 3]);
      R(0.18, 0.4, 0.17, 0.62, '#3a6ad8'); R(0.68, 0.46, 0.15, 0.56, '#3a6ad8');                                  // 青いシート
      g.strokeStyle = '#8a8a90'; g.lineWidth = 3; for (const x0 of [0.15, 0.36, 0.65, 0.86]) { g.beginPath(); g.moveTo(x0 * w, 0.38 * h); g.lineTo(x0 * w, h); g.stroke(); } for (const y0 of [0.5, 0.68, 0.86]) { g.beginPath(); g.moveTo(0.14 * w, y0 * h); g.lineTo(0.88 * w, y0 * h); g.stroke(); }
      R(0.42, 0.56, 0.2, 0.08, '#f0e8d0'); g.fillStyle = '#6a1a1a'; g.font = `bold ${Math.round(h * 0.06)}px ${JP_FONT}`; g.textAlign = 'center'; g.fillText('喫茶 灯', 0.52 * w, 0.62 * h);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, w * 0.08, h);
    });
    B.box('sign', x + 0.6, 1.7, -3.48, 2.8, 1.6, 0.02, 0xffffff, { uv: win, face: 4, edges: false });
    for (const dx of [-1.4, 0, 1.4]) B.box('prop', x + 0.6 + dx * 0.98, 1.7, -3.45, 0.05, 1.6, 0.04, 0xc8ccd0, { edges: false });
    const [bx, bz] = E.hospital.bed;
    B.box('prop', bx, 0.32, bz, 1.0, 0.64, 2.1, 0xc8ccd4); B.box('prop', bx, 0.66, bz + 0.1, 0.94, 0.08, 1.8, 0xf4f4f8); B.box('prop', bx, 0.9, bz - 0.95, 1.0, 0.6, 0.08, 0xb8bcc4);
    B.box('prop', bx, 0.72, bz + 0.35, 0.96, 0.08, 1.2, 0xbcd4e8);                                     // 布団
    B.box('prop', bx + 1.05, 0.4, bz - 0.7, 0.5, 0.8, 0.5, 0xc8b8a0); B.box('prop', bx + 1.05, 0.88, bz - 0.7, 0.18, 0.16, 0.18, 0xe8e8f0);   // 棚・花びん
    for (let i = 0; i < 5; i++) B.box('prop', bx + 1.05 + (i - 2) * 0.04, 1.02 + (i % 2) * 0.03, bz - 0.7, 0.06, 0.06, 0.06, [0xff9ccc, 0xffe070, 0xff9ccc, 0xffffff, 0xff9ccc][i], { edges: false });
    B.box('prop', bx + 1.0, 0.25, bz + 0.6, 0.45, 0.5, 0.45, 0x8a7a6a);                                 // 見舞いのいす
    dyn.hospWin = halos.push({ p: [x + 0.6, 1.9, -3.1], size: 2.2, color: 0xf0f8ff, k: 0.2 }) - 1;
    root.add(lightShafts([{ p: [x + 0.6, 2.3, -3.3], dir: [-0.15, -0.55, 1], len: 5, w0: 2.0, w1: 3.2, color: 0xfff6e0, k: 0.18 }]));
  }
  // ── 自宅の居間（夜・あたたかい灯り） ──
  { const x = E.home.x;
    B.box('floor', x, 0, 0, 7, 0.02, 7, 0x8a6a4a, { edges: false }); B.box('wall', x, 1.4, -3.6, 7, 2.8, 0.2, 0xe8dcc8); B.box('wall', x - 3.6, 1.4, 0, 0.2, 2.8, 7, 0xe0d4c0); B.box('wall', x + 3.6, 1.4, 0, 0.2, 2.8, 7, 0xe0d4c0);
    B.box('wall', x, 2.85, 0, 7.4, 0.1, 7.4, 0xf0e8d8, { edges: false });
    B.box('prop', x - 1.8, 0.3, -2.6, 2.2, 0.6, 0.9, 0x6a5a8a); B.box('prop', x - 1.8, 0.7, -3.0, 2.2, 0.5, 0.2, 0x5a4a7a);   // ソファ
    B.box('prop', x, 0.2, -1.2, 1.2, 0.4, 0.7, 0x9a7a5a);                                                // ちゃぶ台
    B.box('prop', x + 2.4, 0.5, -3.2, 1.6, 1.0, 0.4, 0x4a3a2a); B.box('glow', x + 2.4, 1.3, -3.25, 1.2, 0.7, 0.02, 0x2a3a5a, { edges: false });   // テレビ
    // 子どもの絵（壁に貼った紙：白い猫・紫の髪の人・家）
    const pic = atlas.add((g, w, h) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a070e0'; g.lineWidth = 6; g.beginPath(); g.arc(w * 0.3, h * 0.45, 26, 0, 7); g.stroke(); g.fillStyle = '#b08aff'; g.fillRect(w * 0.22, h * 0.15, 40, 18); g.fillStyle = '#ffb0d0'; g.beginPath(); g.arc(w * 0.68, h * 0.55, 18, 0, 7); g.fill(); g.fillStyle = '#4a3a2a'; g.font = `bold 22px ${JP_FONT}`; g.fillText('ぱぱ', w * 0.6, h * 0.9); });
    B.box('sign', x - 0.4, 1.5, -3.48, 0.8, 0.6, 0.02, 0xffffff, { uv: pic, face: 4, edges: false });
    B.box('glow', x + 0.6, 2.75, -0.5, 0.8, 0.05, 0.8, 0xfff0d0, { edges: false });
    dyn.homeLamp = halos.push({ p: [x + 0.6, 2.6, -0.5], size: 3.2, color: 0xffe0b0, k: 0.55 }) - 1;
    B.box('wall', x - 2.1, 1.4, 3.6, 3.0, 2.8, 0.2, 0xe0d4c0); B.box('wall', x + 2.1, 1.4, 3.6, 3.0, 2.8, 0.2, 0xe0d4c0); B.box('wall', x, 2.45, 3.6, 1.2, 0.7, 0.2, 0xe0d4c0);
    B.box('prop', x, 1.05, 3.62, 1.0, 2.1, 0.1, 0x6a4a3a);                                               // 玄関の戸
  }
  // ── 商店街（夕方・元に戻りつつある：足場・青いシート・灯りの入った店） ──
  { const x = E.street.x;
    B.box('floor', x, 0, 0, 14, 0.02, 40, 0x6a6470, { edges: false });
    const SH = ['喫茶 灯', '八百屋', '書店', '薬局', '時計店', 'たい焼き'];
    for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) {
      const z = -14 + k * 7, i = k * 2 + (sx > 0 ? 1 : 0), h = 5 + (i % 3) * 0.8;
      B.box('wall', x + sx * 6, h / 2, z, 2.4, h, 6.4, [0x8a7a6a, 0x7a8a9a, 0x9a8a7a][i % 3]);
      const open = i % 3 !== 2;
      B.box(open ? 'texglow' : 'shutter', x + sx * 4.77, 1.4, z, 0.06, 2.6, 5.2, open ? 0xffe8c8 : 0x9aa0a8, open ? { tile: ['konbini', 'win_lit', 'koshi_lit'][i % 3], ts: 2.6, tsy: 2.6, edges: false } : { edges: false });   // P13：開いた店は店の中の絵（ガラス越しの棚・灯り）
      const u = atlas.add(signDraw(SH[i % SH.length] + '（仮）', { bg: '#f0e8d0', fg: '#6a1a1a', size: 36 })); B.box('sign', x + sx * 4.775, 3.2, z, 0.05, 0.7, 4.0, 0xffffff, { uv: u, face: sx > 0 ? 1 : 0, edges: false });
      if (!open) { for (let j = 0; j < 4; j++) B.box('prop', x + sx * 4.6, 0.6 + j * 1.0, z, 0.08, 0.08, 6.0, 0x9a9aa0, { edges: false }); for (const dz of [-2.96, 0, 2.96]) B.box('prop', x + sx * 4.6, 2.0, z + dz, 0.08, 4.0, 0.08, 0x8a8a90, { edges: false }); B.box('prop', x + sx * 4.65, 2.2, z - 1, 0.04, 2.6, 3.0, 0x3a6ad8, { edges: false }); }   // 足場・青いシート
    }
    for (let z = -14; z <= 14; z += 7) { B.box('glow', x - 3, 4.2, z, 0.3, 0.4, 0.3, 0xffb070, { edges: false }); B.box('glow', x + 3, 4.2, z + 3.5, 0.3, 0.4, 0.3, 0xffb070, { edges: false }); for (const [px, pz] of [[x - 3, z], [x + 3, z + 3.5]]) B.box('prop', px, 4.77, pz, 0.02, 0.74, 0.02, 0x2a2a30, { edges: false }); halos.push({ p: [x - 3, 4.2, z], size: 1.6, color: 0xffb070, k: 0.5 }); halos.push({ p: [x + 3, 4.2, z + 3.5], size: 1.6, color: 0xffb070, k: 0.5 }); }
    B.box('prop', x, 5.2, 0, 10, 0.15, 40, 0x6a6e78, { edges: false });                                  // アーケードの屋根（直した）
    for (let z = -18; z < 20; z += 6) B.box('glow', x, 5.1, z, 9.4, 0.03, 0.4, 0xffe8c0, { edges: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a2a6a'); gr.addColorStop(0.5, '#e87a5a'); gr.addColorStop(1, '#ffd0a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false }));
    sky.position.set(x, 6, 22); sky.rotation.y = Math.PI; root.add(sky); const sky2 = sky.clone(); sky2.position.set(x, 6, -22); sky2.rotation.y = 0; root.add(sky2);
  }
  // ── 病院の廊下（対比の場面） ──
  { const x = E.corridor.x;
    B.box('floor', x, 0, 0, 4, 0.02, 30, 0xd0d4cc, { edges: false }); B.box('wall', x - 2, 1.5, 0, 0.2, 3, 30, 0xe8ece8); B.box('wall', x + 2, 1.5, 0, 0.2, 3, 30, 0xe8ece8); B.box('wall', x, 3.05, 0, 4.2, 0.1, 30, 0xd8dcd8);   // P13：天井（灯りを付ける）
    for (let z = -12; z <= 12; z += 4) { B.box('glow', x, 2.98, z, 0.5, 0.04, 1.6, 0xf4f8ff, { edges: false }); B.box('glow', x + 1.92, 1.6, z + 2, 0.02, 1.4, 1.0, 0xfff4e0, { edges: false }); }
  }
  const lights = [
    { id: 'hosp', pos: [E.hospital.x + 0.6, 2.4, -2.0], color: 0xfff6e8, intensity: 8, dist: 9 },
    { id: 'hosp2', pos: [E.hospital.x - 1.5, 2.8, 1.5], color: 0xf0f4ff, intensity: 6, dist: 8 },
    { id: 'home', pos: [E.home.x + 0.6, 2.5, -0.5], color: 0xffd8a8, intensity: 10, dist: 9 },
    { id: 'st1', pos: [E.street.x, 4.4, -6], color: 0xffc890, intensity: 12, dist: 16 },
    { id: 'st2', pos: [E.street.x, 4.4, 8], color: 0xffc890, intensity: 12, dist: 16 },
    { id: 'corr', pos: [E.corridor.x, 2.6, 0], color: 0xf0f4ff, intensity: 10, dist: 16 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  void rr;
  return finish('epilogue', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots: [], surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -46, maxX: 86, minZ: -20, maxZ: 20 }, spawns: { hospital: [E.hospital.dan[0], E.hospital.dan[1], Math.PI], home: [E.home.dan[0], E.home.dan[1], Math.PI], street: [E.street.dan[0], E.street.dan[1], Math.PI], corridor: [E.corridor.x - 0.8, 10, Math.PI] },
    fog: { color: 0x2a2430, density: 0.012 }, rain: false, amb: 'epi_day', far: 160,
  });
}

BUILDERS3.abyss = buildAbyss;
BUILDERS3.kiroku = buildKiroku;
BUILDERS3.epilogue = buildEpilogue;
