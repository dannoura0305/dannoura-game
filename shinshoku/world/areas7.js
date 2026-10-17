// フェーズ7 の区画【仮】：world/areas.js と同じ形の区画を返す。
// ・ruins（あけぼの通り商店街・暴走の後）：人の大きさ。アーケードの骨が崩れ、看板が落ち、店のシャッターが曲がっている。
//   北の光の柱から「置換の糸」が中継（時計店の看板・アーケードの配電箱・銭湯の煙突）を通って町へ伸びる（白い姿の目でよく見える）。
// ・avenue（中央通り・巨大用）：集合住宅の棟（窓に灯り＝人が残る）・電線・中央管理棟の塔（遠景）・光の柱。塗替との戦い。
// ・admin（中央管理棟）：受付の待合（待人）・監視室（監視カメラの壁）・記録室・機械室（ポンプ・圧縮機・ファン・配管・蒸気弁・点検表）・制御室（ガラス張り）。
// 静的な箱は材質ごとに 1 つの網、繰り返す物はインスタンス網、光るものは安い発光（MeshBasic）。名前・表示はすべて仮。町は月代町ではない。
import * as THREE from 'three';
import { Builder, Atlas, signDraw, groundTex } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex, JP_FONT } from '../render/toon.js';
import { instanced, finish, BUILDERS3 } from './areas.js';
import { lightShafts, stainDecals } from '../render/shafts.js';
import { skyDome } from '../render/sky.js';
import { RELAYS, RUINS, AVENUE, ROUNDS, ADMIN } from '../data/ch6.js';

const rngOf = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const addMesh = (root, geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.name = name; root.add(m); return m; };

/** 細い光の線（たわんだ糸）：点の列 → 板の帯（加算・両面）。戻り：BufferGeometry */
function threadGeo(pts, w) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) { const p = pts[i]; pos.push(p.x, p.y - w / 2, p.z, p.x, p.y + w / 2, p.z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  for (let i = 0; i < pts.length; i++) { const p = pts[i]; pos.push(p.x - w / 2, p.y, p.z, p.x + w / 2, p.y, p.z); if (i) { const a = pts.length * 2 + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
/** a → b のたわんだ曲線の点（sag：中ほどの下がり） */
function sagPts(a, b, sag, n = 16) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n; out.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t)); } return out; }

// ───────────────────────── 崩れた商店街（第6章A・人の大きさ） ─────────────────────────
export function buildRuins() {
  const root = new THREE.Group(); root.name = 'area_ruins';
  root.add(skyDome({ top: 0x0a0412, mid: 0x30103a, horizon: 0x7a1a4a, moon: [0.1, 0.3, -0.95] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 4, y0 = 0) => { const b = cbox(cx, cz, w, d, h, y0); boxes.push(b); return b; };
  const rr = rngOf(919);
  const gt = groundTex({ base: '#2a2630', repeat: [8, 36] });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(22, 84), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -3); fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  B.box('tex', 0, -0.045, -3, 15.2, 0.1, 84, 0xa8a0b0, { tile: 'arcade_floor', ts: 2.6, edges: false });   // フェーズ9：アーケードの床（割れたタイル）
  { const pr = rngOf(4242); for (let i = 0; i < 8; i++) B.box('tex', (pr() - 0.5) * 12, 0.012, -36 + pr() * 64, 2.2, 0.01, 1.6, 0xffffff, { tile: 'puddle', fit: true, edges: false, ry: pr() * 3 }); }   // 別の乱数（他の配置を変えない）
  // 店の並び（両側）：シャッター（曲がった・破れた）・看板・2 階の窓
  const SHOPS = ['喫茶 灯', '八百屋', 'クリーニング', '書店', '薬局', '時計店', '金物屋', 'たい焼き', '写真館', '銭湯 松の湯', '和菓子', '精肉店'];
  const cols = [0x6a5e58, 0x5e6470, 0x6e6268, 0x5a6a5e, 0x746a5a, 0x5e5a6a];
  let si = 0;
  for (const sx of [-1, 1]) for (let z = -40; z < 34; z += 7.4) {
    const h = 5.2 + rr() * 2.2, x = sx * 10.5, i = si++;
    B.box('tex', x, h / 2, z + 3.7, 5, h, 7.2, new THREE.Color(cols[i % cols.length]).lerp(new THREE.Color(0xb8b0b0), 0.5).getHex(), { tile: ['mortar', 'tilewall', 'siding2'][i % 3], ts: 2, ao: true }); solid(x, z + 3.7, 5, 7.2, h);   // フェーズ9：外壁の材質
    const fx = sx * 7.96, bent = rr() < 0.4;
    B.box('shutter', fx, bent ? 1.2 : 1.5, z + 3.7, 0.08, bent ? 2.4 : 3.0, 5.6, 0x8a8e94, { rz: bent ? sx * 0.12 : 0 });
    if (rr() < 0.5) B.box('glow', fx - sx * 0.02, 0.6, z + 3.7 + (rr() - 0.5) * 3, 0.03, 1.2, 0.8, 0x1a0c22, { edges: false });           // 破れ目の暗がり
    const u = atlas.add(signDraw(SHOPS[i % SHOPS.length] + '（仮）', { bg: ['#f0e8d0', '#2a1a14', '#e8f0f0'][i % 3], fg: ['#6a1a1a', '#ffd8a0', '#1a3a6a'][i % 3], size: 40, dirt: true }));
    if (rr() < 0.7) B.box('sign', fx - sx * 0.08, 3.6, z + 3.7, 0.06, 0.8, 4.4, 0xffffff, { uv: u, face: sx > 0 ? 1 : 0, edges: false, rz: rr() < 0.3 ? sx * 0.18 : 0 });
    else B.box('sign', fx - sx * 1.2, 0.3, z + 3.2, 0.8, 0.06, 4.0, 0xffffff, { uv: u, face: 2, edges: false, ry: 0.2 });          // 落ちた看板
    for (let k = 0; k < 3; k++) { const lit = rr() < 0.3; B.box(lit ? 'texglow' : 'tex', fx - sx * 0.02, 4.6 + (k % 2) * 0.1, z + 1.8 + k * 1.9, 0.03, 0.7, 1.0, lit ? 0xd8b890 : 0x8a8098, { tile: lit ? 'win_lit' : 'win_dark', fit: true, edges: false }); }
  }
  // アーケードの骨（y 6）・崩れた梁（地面に斜め）・屋根板の破片
  for (let z = -38; z < 32; z += 8) { B.box('prop', -7.6, 3.1, z, 0.25, 6.2, 0.25, 0x4a4e58); B.box('prop', 7.6, 3.1, z, 0.25, 6.2, 0.25, 0x4a4e58); solid(-7.6, z, 0.3, 0.3, 6); solid(7.6, z, 0.3, 0.3, 6); if (rr() < 0.6) B.box('prop', 0, 6.2, z, 15.4, 0.22, 0.22, 0x4a4e58); }
  for (const [x, z, ry, rz, L] of [[2.4, -10, 0.4, 0.5, 9], [-3, 4, -0.6, 0.35, 8], [3.2, 22, 0.2, 0.45, 7], [-2.0, -32, 0.9, 0.3, 8]]) { B.box('prop', x, 1.2, z, L, 0.3, 0.3, 0x5a5e68, { ry, rz }); solid(x, z, Math.abs(Math.cos(ry)) * L * 0.8 + 0.4, Math.abs(Math.sin(ry)) * L * 0.8 + 0.4, 1.0); }
  for (let i = 0; i < 26; i++) { const x = (rr() - 0.5) * 13, z = -36 + rr() * 66, s = 0.3 + rr() * 0.8; B.box('prop', x, s * 0.3, z, s * 1.6, s * 0.6, s * 1.2, [0x5a5660, 0x6a6470, 0x4a4650][i % 3], { ry: rr() * 3, rx: (rr() - 0.5) * 0.4 }); if (s > 0.8) solid(x, z, s * 1.2, s, 0.5); }
  for (let i = 0; i < 10; i++) { const x = (rr() - 0.5) * 12, z = -36 + rr() * 64; B.box('prop', x, 0.08, z, 2.4 + rr() * 2, 0.12, 1.6 + rr(), 0x8a9aa8, { ry: rr() * 3, rx: 0.1 }); }
  // 地面の紫の割れ目（置き換えの膜）
  for (let i = 0; i < 18; i++) B.box('glow', (rr() - 0.5) * 12, 0.02, -36 + rr() * 64, 0.08 + rr() * 0.1, 0.02, 2 + rr() * 5, rr() < 0.5 ? 0xd050ff : 0x7a2ab8, { ry: rr() * 3, edges: false });
  // 中継（時計店の看板・アーケードの配電箱・銭湯の煙突）と糸
  const [T, P, Y] = RELAYS.list;
  B.box('prop', T.pos[0] + 2.4, 3.8, T.pos[1], 0.2, 2.4, 2.4, 0x3a2a24); { const g = new THREE.CylinderGeometry(1.0, 1.0, 0.2, 24); g.rotateZ(Math.PI / 2); g.translate(T.pos[0] + 2.2, 3.8, T.pos[1]); B.add('prop', g, 0xe8e0c8); }
  B.box('prop', P.pos[0] - 2.3, 2.0, P.pos[1], 0.5, 1.4, 1.0, 0x5a6066); B.box('glow', P.pos[0] - 2.0, 2.3, P.pos[1] + 0.3, 0.02, 0.1, 0.1, 0xff4040, { edges: false });
  { const g = new THREE.CylinderGeometry(0.55, 0.75, 14, 12); g.translate(Y.pos[0] + 3.4, 7, Y.pos[1]); B.add('prop', g, 0x8a5a4a); solid(Y.pos[0] + 3.4, Y.pos[1], 1.4, 1.4, 14); }
  const relayAt = { T: [T.pos[0] + 2.0, 3.8, T.pos[1]], P: [P.pos[0] - 2.0, 2.4, P.pos[1]], Y: [Y.pos[0] + 2.8, 2.2, Y.pos[1]] };
  const srcTop = [0, 14, -46];
  const tMat = () => new THREE.MeshBasicMaterial({ color: 0xd060ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  dyn.threads = {}; dyn.relayHalo = {}; dyn.relayAt = relayAt; dyn.threadPts = {};
  const chainPts = { T: sagPts(srcTop, relayAt.T, 2.4), P: sagPts(relayAt.T, relayAt.P, 1.8), Y: sagPts(relayAt.P, relayAt.Y, 1.8) };
  for (const id of ['T', 'P', 'Y']) {
    const m = addMesh(root, threadGeo(chainPts[id], 0.09), tMat(), 'thread_' + id); m.renderOrder = 4; dyn.threads[id] = m; dyn.threadPts[id] = chainPts[id];
    dyn.relayHalo[id] = halos.push({ p: relayAt[id], size: 1.6, color: 0xe070ff, k: 0.8 }) - 1;
    const r = RELAYS.list.find(q => q.id === id);
    spots.push({ id: 'relay_' + id, kind: 'relay6', relay: id, x: r.pos[0], z: r.pos[1], r: 1.6, label: '置換の糸の中継（' + r.name + '）' });
  }
  // 糸の先：町へ伸びる細い糸（中継を切ると消える物ではない飾り）
  for (let i = 0; i < 4; i++) { const g = threadGeo(sagPts(relayAt.Y, [(rr() - 0.5) * 30, 0.2, 30 + rr() * 10], 1.2, 10), 0.05); const m = addMesh(root, g, tMat(), 'thread_tail'); m.material.opacity = 0.35; dyn.threadTail = dyn.threadTail || []; dyn.threadTail.push(m); }
  // バス停（待人）・忘れ物の傘・公衆電話（セーブ）・防災スピーカー（任意の記録）・録音
  const [bx, bz] = RUINS.busStop;
  B.box('prop', bx - 1.0, 1.25, bz, 0.08, 2.5, 3.2, 0x5a6a7a); B.box('glass', bx - 0.95, 1.4, bz, 0.04, 1.6, 3.0, 0x2a3a4a, { edges: false }); B.box('prop', bx - 0.4, 2.5, bz, 1.4, 0.08, 3.4, 0x4a5a6a);
  B.box('prop', bx - 0.5, 0.42, bz, 0.4, 0.06, 2.2, 0x6a5a4a); solid(bx - 0.6, bz, 0.8, 3.2, 2.5);
  const bus = atlas.add(signDraw('あけぼの通り　バス停（仮）', { bg: '#1a3a6a', fg: '#ffffff', size: 30 })); B.box('prop', bx + 1.1, 1.4, bz - 1.9, 0.08, 2.8, 0.08, 0x8a8a90); B.box('sign', bx + 1.1, 2.6, bz - 1.9, 0.5, 0.5, 0.04, 0xffffff, { uv: bus, face: 4, edges: false });
  { const g = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 18); g.rotateX(Math.PI / 2); g.translate(bx + 1.1, 2.0, bz - 1.85); B.add('prop', g, 0xe8e0c8); B.box('prop', bx + 1.1, 2.0, bz - 1.8, 0.03, 0.22, 0.01, 0x1a1a1a, { rz: 0.6, edges: false }); }
  spots.push({ id: 'ru_clock', kind: 'clock6', x: bx + 2.0, z: bz - 1.8, r: 1.0, label: 'バス停の時計（止められる）' });
  B.box('prop', RUINS.umbrella[0], 0.06, RUINS.umbrella[1], 0.9, 0.06, 0.08, 0x3a5a8a, { ry: 0.4 });
  spots.push({ id: 'ru_umbrella', kind: 'item6', x: RUINS.umbrella[0], z: RUINS.umbrella[1], r: 1.1, label: '店先の忘れ物（紺の傘）' });
  B.box('prop', -6.6, 1.1, 26.0, 0.6, 2.2, 0.6, 0x3a7a4a); B.box('glow', -6.3, 1.5, 26.0, 0.02, 0.4, 0.3, 0x9affb0, { edges: false }); solid(-6.6, 26.0, 0.6, 0.6, 2.2);
  spots.push({ id: 'ru_save', kind: 'save', x: -5.8, z: 26.0, r: 1.0, label: '公衆電話（セーブ）' });
  B.box('prop', 6.8, 3.0, -6.0, 0.2, 6.0, 0.2, 0x6a6a70); B.box('prop', 6.6, 5.6, -6.0, 0.4, 0.5, 0.9, 0xd8d0b0);
  spots.push({ id: 'ru_damage', kind: 'clue6', clue: 'damage', x: 6.0, z: -6.0, r: 1.1, label: '防災スピーカーの記録箱（任意）' });
  B.box('prop', -6.8, 0.6, -30.0, 0.6, 1.2, 0.6, 0x4a4a52); B.box('glow', -6.5, 0.9, -30.0, 0.02, 0.15, 0.15, 0xff6060, { edges: false });
  spots.push({ id: 'ru_voice', kind: 'clue6', clue: 'voice6a', x: -6.0, z: -30.0, r: 1.0, label: '倒れた防災スピーカー（録音）' });
  // 北：中央通りへ（光の柱）・南：町（崩れていて戻れない）
  spots.push({ id: 'exit_avenue', kind: 'exit6', to: 'avenue', x: 0, z: RUINS.exitNorth[1], r: 2.0, label: '中央通りへ（光の柱）' });
  spots.push({ id: 'ru_south', kind: 'read', sign: '町の通りは瓦礫でふさがっている。……人の大きさでは、もう戻れない。', x: 0, z: 32.6, r: 1.6, label: '南の通り（瓦礫）' });
  B.box('prop', 0, 1.6, 33.6, 14, 3.2, 1.2, 0x4a4650); solid(0, 33.6, 16, 1.2, 3.2);
  B.box('prop', -5, 1.6, -40.6, 6, 3.2, 0.6, 0x4a4650); B.box('prop', 5, 1.6, -40.6, 6, 3.2, 0.6, 0x4a4650); solid(-5, -40.6, 6, 0.6, 3.2); solid(5, -40.6, 6, 0.6, 3.2);
  // 遠景：光の柱と中央管理棟の塔
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(3, 7, 160, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  pillar.position.set(0, 80, -90); root.add(pillar); dyn.pillar = pillar;
  for (const [x, h] of [[-26, 46], [22, 38], [-6, 58]]) B.box('wall', x, h / 2, -100, 14, h, 12, 0x1e1626, { edges: false });
  halos.push({ p: [0, 12, -80], size: 26, color: 0xb040ff, k: 0.5 });
  // 明かり
  const lights = [
    { id: 'pil', pos: [0, 12, -38], color: 0xc050ff, intensity: 14, dist: 30 },
    { id: 'em1', pos: [-6, 3.2, 20], color: 0xff5040, intensity: 3, dist: 9, flicker: true },
    { id: 'vend', pos: [5.6, 1.4, 6], color: 0xc8e0ff, intensity: 3, dist: 7 },
    { id: 'tel', pos: [-6.0, 2.0, 26], color: 0x9affb0, intensity: 2, dist: 5 },
    { id: 'clk', pos: [5.6, 3.6, -24], color: 0xe070ff, intensity: 4, dist: 8 },
    { id: 'bus', pos: [-4.6, 2.4, 8], color: 0xffe0b0, intensity: 2.4, dist: 6, flicker: true },
    { id: 'm1', pos: [0, 5.6, 0], color: 0x8a6ad8, intensity: 4, dist: 14 },
    { id: 'm2', pos: [0, 5.6, -24], color: 0x8a6ad8, intensity: 4, dist: 14 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  B.box('prop', 5.6, 0.9, 6.0, 0.8, 1.8, 0.7, 0xd83a3a); B.box('glow', 5.21, 1.2, 6.0, 0.02, 0.9, 0.55, 0xe8f0ff, { edges: false }); solid(5.6, 6.0, 0.8, 0.7, 1.8);
  for (const l of lights) if (l.id === 'em1' || l.id === 'bus') halos.push({ p: l.pos, size: 0.9, color: l.color, k: 0.7, light: l });
  hideSpots.push({ x: -6, z: 12 }, { x: 6, z: -16 }, { x: -6, z: -20 });
  root.add(lightShafts([{ p: [0, 7, -30], dir: [0, -1, 0.3], len: 7, w0: 3, w1: 6, color: 0xb070ff, k: 0.16 }, { p: [0, 7, 4], dir: [0.2, -1, 0], len: 7, w0: 2, w1: 4, color: 0x9a7ae0, k: 0.12 }]));
  const sr = rngOf(23), st = []; for (let i = 0; i < 24; i++) st.push({ p: [(sr() - 0.5) * 14, 0, -36 + sr() * 66], n: 'floor', size: 1 + sr() * 2.2, kind: [1, 3, 5, 6][Math.floor(sr() * 4)], rot: sr() * 6, k: 0.7 });
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('ruins', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots, surface: () => 'wet', rainRoof: () => false, indoor: () => false,
    bounds: { minX: -7.6, maxX: 7.6, minZ: -40, maxZ: 33 }, spawns: { south: [RUINS.spawn[0], RUINS.spawn[1], RUINS.spawn[2]], north: [0, -36, 0] },
    fog: { color: 0x1a0a22, density: 0.03 }, rain: false, amb: 'ruins', far: 220,
  });
}

// ───────────────────────── 中央通り（第6章A・巨大用） ─────────────────────────
export function buildAvenue() {
  const root = new THREE.Group(); root.name = 'area_avenue';
  root.add(skyDome({ top: 0x0a0412, mid: 0x3a0c3a, horizon: 0x9a1a4a, moon: [-0.3, 0.42, -0.85] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [];
  const rr = rngOf(733);
  const gt = groundTex({ base: '#26222c', repeat: [28, 28] });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshToonMaterial({ map: gt, gradientMap: gradientMap() })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; fl.name = 'ground'; root.add(fl);
  for (let z = -56; z < 56; z += 6) { B.box('glow', -3, 0.02, z, 0.25, 0.02, 3.0, 0xd8d0a0, { edges: false }); B.box('glow', 3, 0.02, z, 0.25, 0.02, 3.0, 0xd8d0a0, { edges: false }); }
  for (let x = -12; x <= 12; x += 2) B.box('glow', x, 0.02, 20, 1.0, 0.02, 5.0, 0xe8e8e8, { edges: false });   // 横断歩道
  // 歩道の縁石
  B.box('prop', -14, 0.15, 0, 1, 0.3, 112, 0x6a6a72, { edges: false }); B.box('prop', 14, 0.15, 0, 1, 0.3, 112, 0x6a6a72, { edges: false });
  // 集合住宅・店の並び（窓の灯り＝人が残る）。守る 3 棟は大きく、窓の灯りが暖かい
  const winGlow = (x, z, w, h, d, face, warm, n) => { for (let k = 0; k < n; k++) { const fy = 3 + Math.floor(k / 4) * 3.2, fx = (k % 4 - 1.5) * (w / 4.6); if (fy > h - 2) break; const lit = rr() < (warm ? 0.7 : 0.3); B.box('glow', x + (face === 'x' ? 0 : fx), fy, z + (face === 'x' ? fx : 0), face === 'x' ? 0.1 : 1.6, 1.4, face === 'x' ? 1.6 : 0.1, lit ? (warm ? 0xffc880 : 0x8a6ad8) : 0x14101c, { edges: false }); } };
  for (const b of AVENUE.blocks) {
    const [x, z] = b.pos, h = 26, w = 14, d = 12, sx = Math.sign(x);
    B.box('wall', x, h / 2, z, w, h, d, b.id === 'C' ? 0xd8d4cc : 0x8a8478); boxes.push(cbox(x, z, w, d, h));
    winGlow(x - sx * (w / 2 + 0.06), z, w, h, d, 'x', true, 32);
    for (let k = 0; k < 7; k++) B.box('prop', x - sx * (w / 2 + 0.5), 3 + k * 3.2, z, 1.0, 0.15, d * 0.9, 0x5a5650);          // ベランダ
    if (b.id === 'C') { B.box('glow', x - sx * (w / 2 + 0.08), h - 2.5, z, 0.1, 2.2, 2.2, 0x40d080, { edges: false }); B.box('glow', x - sx * (w / 2 + 0.09), h - 2.5, z, 0.1, 0.5, 1.6, 0xffffff, { edges: false }); }
    const u = atlas.add(signDraw(b.name + '（仮）', { bg: '#20202a', fg: '#ffe0b0', size: 34 })); B.box('sign', x - sx * (w / 2 + 0.1), 1.6, z + d / 2 - 2, 0.05, 0.9, 3.6, 0xffffff, { uv: u, face: sx > 0 ? 1 : 0, edges: false });
    dyn['block' + b.id] = { halo: halos.push({ p: [x - sx * (w / 2 + 1), 12, z], size: 16, color: 0xffb070, k: 0.0 }) - 1 };
  }
  const rows = [];
  for (const sx of [-1, 1]) for (let z = -54; z < 56; z += 12) { if (AVENUE.blocks.some(b => Math.sign(b.pos[0]) === sx && Math.abs(b.pos[1] - z) < 12)) continue; rows.push({ x: sx * (24 + rr() * 4), z, h: 10 + rr() * 16 }); }
  rows.forEach((r, i) => { B.box('wall', r.x, r.h / 2, r.z, 12, r.h, 10, [0x5a5048, 0x4a5060, 0x5e5460][i % 3]); boxes.push(cbox(r.x, r.z, 12, 10, r.h)); winGlow(r.x - Math.sign(r.x) * 6.06, r.z, 12, r.h, 10, 'x', false, 16); });
  // 遠景：中央管理棟の塔（赤い航空灯）・研究施設・光の柱
  B.box('wall', 0, 45, -104, 18, 90, 16, 0x1a1624, { edges: false }); for (let k = 0; k < 12; k++) B.box('glow', 0, 8 + k * 7, -95.9, 12, 0.6, 0.1, k % 3 ? 0x2a1a3a : 0x8a40d8, { edges: false });
  B.box('glow', 0, 91, -104, 1.2, 1.2, 1.2, 0xff3030, { edges: false }); halos.push({ p: [0, 91, -104], size: 4, color: 0xff3030, k: 0.9, hazard: true });
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 90 + rr() * 20, h = 10 + rr() * 26, x = Math.sin(a) * r, z = Math.cos(a) * r; if (z < -80 && Math.abs(x) < 20) continue; B.box('wall', x, h / 2, z, 10 + rr() * 10, h, 8 + rr() * 6, 0x1a1422, { ry: a, edges: false }); if (rr() < 0.5) B.box('glow', x - Math.sin(a) * 5.5, h * 0.6, z - Math.cos(a) * 5.5, 2, 1.2, 0.2, rr() < 0.5 ? 0x8a3aff : 0xffb880, { ry: a, edges: false }); }
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(5, 11, 240, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  pillar.position.set(0, 120, -86); root.add(pillar); dyn.pillar = pillar; halos.push({ p: [0, 14, -80], size: 46, color: 0xb040ff, k: 0.55 });
  // 電線（電柱の間・紫の糸が絡む）
  const tMat = new THREE.MeshBasicMaterial({ color: 0xc050ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const lines = []; for (const x of [-11, 11]) for (let z = -48; z < 48; z += 16) lines.push(...sagPts([x, 9, z], [x, 9, z + 16], 1.4, 8).map((p, i, a) => (i ? [a[i - 1], p] : null)).filter(Boolean));
  { const pos = []; for (const [a, b] of lines) { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xd070ff, transparent: true, opacity: 0.7, fog: false })); l.name = 'wires'; root.add(l); }
  void tMat;
  // 壊れる小物：街灯・電柱・車・看板・バス停（yard／town と同じ dyn.props の形）
  const K = {
    lamp: [[0, 3.5, 0, 0.25, 7.0, 0.25, 0x4a4e58], [0.8, 7.0, 0, 1.8, 0.2, 0.3, 0x4a4e58], [1.6, 6.8, 0, 0.6, 0.25, 0.5, 0xffe8c0]],
    pole: [[0, 4.5, 0, 0.36, 9.0, 0.36, 0x6a6460], [0, 8.4, 0, 2.6, 0.2, 0.2, 0x4a4440], [0.9, 8.6, 0, 0.3, 0.3, 0.3, 0x8a8a90]],
    car: [[0, 0.7, 0, 1.8, 0.9, 4.2, 0xffffff], [0, 1.4, -0.3, 1.6, 0.6, 2.2, 0x2a3040], [0.7, 0.3, 1.3, 0.3, 0.6, 0.6, 0x1a1a1a], [-0.7, 0.3, -1.3, 0.3, 0.6, 0.6, 0x1a1a1a]],
    sign: [[0, 2.4, 0, 0.25, 4.8, 0.25, 0x4a4e58], [0, 5.2, 0, 3.2, 1.4, 0.2, 0xffffff]],
  };
  const P = []; let n = 0; const add = (kind, x, z, ry = 0, color) => P.push({ id: kind + '_' + (n++), kind, x, z, ry, color });
  for (let z = -50; z < 54; z += 10) { add('lamp', -13, z, 0); add('lamp', 13, z + 5, Math.PI); }
  for (const x of [-11, 11]) for (let z = -48; z <= 48; z += 16) add('pole', x, z);
  for (let i = 0; i < 10; i++) add('car', (rr() < 0.5 ? -1 : 1) * (5 + rr() * 4), -46 + rr() * 90, rr() * 0.4 - 0.2 + (rr() < 0.5 ? Math.PI : 0), [0xd84a3a, 0x3a6ad8, 0xe8e8e8, 0x2a2a30, 0xd8b03a][i % 5]);
  for (let z = -40; z < 40; z += 20) add('sign', -12.5, z + 8, Math.PI / 2, [0xd84a3a, 0x3a8ad8, 0xd8b03a][Math.abs(z) % 3]);
  dyn.props = [];
  const HP = { lamp: 6, pole: 10, car: 8, sign: 8 }, PR = { lamp: 1.0, pole: 1.2, car: 2.2, sign: 1.8 };
  for (const [kind, parts] of Object.entries(K)) {
    const list = P.filter(p => p.kind === kind); if (!list.length) continue;
    const m = instanced(parts, list.map(p => ({ x: p.x, z: p.z, ry: p.ry, color: p.color })), { name: 'prop_' + kind, shadow: true });
    root.add(m);
    list.forEach((p, i) => dyn.props.push({ id: p.id, kind, x: p.x, z: p.z, ry: p.ry, r: PR[kind], hp: HP[kind], hpMax: HP[kind], alive: true, mesh: m, idx: i }));
  }
  const debG = new THREE.DodecahedronGeometry(0.7, 0); const debris = new THREE.InstancedMesh(debG, new THREE.MeshToonMaterial({ color: 0x4a4650, gradientMap: gradientMap() }), 100);
  const Z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < 100; i++) debris.setMatrixAt(i, Z); debris.name = 'debris'; debris.castShadow = true; root.add(debris);
  dyn.debris = { mesh: debris, n: 0 };
  // 道の紫の膜（塗替が近いほど濃い）
  for (let i = 0; i < 22; i++) B.box('glow', (rr() - 0.5) * 30, 0.03, -50 + rr() * 50, 0.6 + rr(), 0.03, 8 + rr() * 14, rr() < 0.5 ? 0xff4ad8 : 0x9a3aff, { ry: rr() * 0.6 - 0.3, edges: false });
  const lights = [
    { id: 'moonfill', pos: [0, 40, 20], color: 0x9a6ad8, intensity: 55, dist: 160 },
    { id: 'pillar', pos: [0, 20, -60], color: 0xc040ff, intensity: 120, dist: 100 },
    { id: 'blkA', pos: [-20, 10, -2], color: 0xffb070, intensity: 30, dist: 26 },
    { id: 'blkB', pos: [20, 10, 6], color: 0xffb070, intensity: 30, dist: 26 },
    { id: 'blkC', pos: [-16, 10, 30], color: 0xffd8b0, intensity: 30, dist: 26 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  return finish('avenue', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots: [], surface: () => 'asphalt', rainRoof: () => false, indoor: () => false,
    bounds: { minX: -54, maxX: 54, minZ: -54, maxZ: 54 }, spawns: { giant: [AVENUE.giantStart[0], AVENUE.giantStart[1], AVENUE.giantStart[2]] },
    fog: { color: 0x1a0a20, density: 0.008 }, rain: false, amb: 'yard', far: 420, giant: true,
  });
}

// ───────────────────────── 中央管理棟（第6章B） ─────────────────────────
/** 監視カメラの壁の絵（キャンバス 1 枚）：4 台のカメラ・波形・置き換えの広がりの地図 */
function monitorWallTex() {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
    const cam = (x, y, cw, ch, label, k) => { g.fillStyle = '#0a140c'; g.fillRect(x, y, cw, ch); g.strokeStyle = '#3a5a4a'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + cw / 2, y + ch * 0.4); g.lineTo(x + (i / 4) * cw, y + ch); g.stroke(); } g.fillStyle = '#2a4a3a'; g.fillRect(x + cw * (0.3 + k * 0.1), y + ch * 0.5, 10, 26); g.fillStyle = '#9affb0'; g.font = '14px monospace'; g.fillText(label, x + 6, y + 16); g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = y; yy < y + ch; yy += 3) g.fillRect(x, yy, cw, 1); };
    cam(8, 8, 240, 116, 'CAM-1 01:43', 0); cam(256, 8, 240, 116, 'CAM-2 01:45', 1); cam(8, 132, 240, 116, 'CAM-3 02:31 ?', 2); cam(256, 132, 240, 116, 'CAM-4 02:33', 3);
    // 波形と地図
    g.strokeStyle = '#c060ff'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < 500; x++) { const y = 70 + Math.sin(x * 0.05) * 30 * Math.sin(x * 0.007) + (x % 97 < 6 ? -30 : 0); if (x) g.lineTo(512 + x, y); else g.moveTo(512, y); } g.stroke();
    g.fillStyle = '#ff4a6a'; g.font = 'bold 22px ' + JP_FONT; g.fillText('拡大　出力 68%', 530, 30);
    g.fillStyle = '#140a1c'; g.fillRect(520, 132, 496, 116); g.strokeStyle = '#3a2a4a'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(520 + i * 42, 132); g.lineTo(520 + i * 42, 248); g.stroke(); }
    const gr = g.createRadialGradient(780, 190, 4, 780, 190, 90); gr.addColorStop(0, 'rgba(200,80,255,.9)'); gr.addColorStop(1, 'rgba(200,80,255,0)'); g.fillStyle = gr; g.fillRect(520, 132, 496, 116);
    g.fillStyle = '#e0c0ff'; g.font = '14px ' + JP_FONT; g.fillText('置き換えの範囲（町の地図）', 530, 150);
  });
}
/** 警告の札（赤地に白）の絵 */
const warnDraw = text => (g, w, h) => { g.fillStyle = '#7a0a10'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff6a6a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); for (let x = -h; x < w; x += 28) { g.fillStyle = 'rgba(255,200,60,.25)'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 14, h); g.lineTo(x + 14 + h, 0); g.lineTo(x + h, 0); g.fill(); } g.fillStyle = '#ffe8e8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold 34px ${JP_FONT}`; g.fillText(text, w / 2, h / 2 + 2); };

export function buildAdmin() {
  const root = new THREE.Group(); root.name = 'area_admin';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 4, y0 = 0) => { const b = cbox(cx, cz, w, d, h, y0); boxes.push(b); return b; };
  const H = 4.2, HM = 7.5, W1 = 0x7a7e86, W2 = 0x5e626c, W3 = 0x3e424c;
  const wall = (cx, cz, w, d, c = W1, h = H) => { B.box('wall', cx, h / 2, cz, w, h, d, c); return solid(cx, cz, w, d, h); };
  const rr = rngOf(4401);
  // 床：南（受付・監視室・記録室）は明るいタイル、北（機械室）は塗装の床と黄色い線
  const ft = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a5e64'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#62666c' : '#565a60'; g.fillRect(x + 1, y + 1, 62, 62); } g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 10, 1); });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(7, 7);
  addMesh(root, new THREE.PlaneGeometry(28.4, 30), new THREE.MeshToonMaterial({ map: ft, gradientMap: gradientMap() }), 'ground').position.set(0, 0, 7);
  root.children[root.children.length - 1].rotation.x = -Math.PI / 2;
  const mt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a4a46'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 30, 2 + Math.random() * 3); g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 20; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 20 + Math.random() * 40); });
  mt.wrapS = mt.wrapT = THREE.RepeatWrapping; mt.repeat.set(6, 6);
  const mf = addMesh(root, new THREE.PlaneGeometry(28.4, 28), new THREE.MeshToonMaterial({ map: mt, gradientMap: gradientMap() }), 'ground'); mf.rotation.x = -Math.PI / 2; mf.position.set(0, 0.005, -22); mf.receiveShadow = true;
  for (const x of [-7, 7]) B.box('glow', x, 0.012, -16, 0.15, 0.01, 19, 0xd8b030, { edges: false });
  for (const z of [-7.2, -24.8]) B.box('glow', 0, 0.012, z, 14.2, 0.01, 0.15, 0xd8b030, { edges: false });
  // 外周
  wall(0, 22.2, 28.4, 0.4); wall(-14.2, 7, 0.4, 30); wall(14.2, 7, 0.4, 30);
  wall(-14.2, -19, 0.4, 26, W2, HM); wall(14.2, -19, 0.4, 26, W2, HM); wall(0, -32.2, 28.4, 0.4, W3, HM);
  B.box('wall', 0, H + 0.1, 7, 28.4, 0.2, 30, 0x4a4e56, { edges: false });
  B.box('wall', 0, HM + 0.1, -19, 28.4, 0.2, 26.4, 0x2a2c34, { edges: false });
  // 南：連絡橋の入口（ガラスの戸）
  B.box('glass', 0, 1.4, 22.0, 3.0, 2.8, 0.1, 0x2a3a50, { edges: false });
  const sign0 = atlas.add(signDraw('中央管理棟（仮）', { bg: '#1a1e26', fg: '#d8e0f0', size: 40 })); B.box('sign', 0, 3.5, 21.95, 4.4, 0.6, 0.04, 0xffffff, { uv: sign0, face: 5, edges: false });
  // 受付（東）と待合（長いす・大きな壁時計）
  B.box('prop', 9.6, 0.55, 12.0, 0.8, 1.1, 5.0, 0x5a4e46); B.box('prop', 9.6, 1.12, 12.0, 1.0, 0.06, 5.2, 0xd0c8b8, { edges: false }); solid(9.6, 12.0, 0.8, 5.0, 1.2);
  B.box('prop', 11.8, 0.4, 12.0, 0.6, 0.8, 3.0, 0x4a4e58); B.box('glow', 9.95, 1.2, 11.0, 0.02, 0.32, 0.45, 0x6a9ad8, { edges: false });
  const bench = [[0, 0.22, 0, 2.4, 0.08, 0.5, 0x4a4e66], [0, 0.11, -0.2, 0.08, 0.22, 0.08, 0x2a2a2a], [0, 0.11, 0.2, 0.08, 0.22, 0.08, 0x2a2a2a], [0, 0.55, -0.24, 2.4, 0.5, 0.06, 0x4a4e66]];
  const benches = [{ x: 4.0, z: 16.4, ry: Math.PI }, { x: 4.0, z: 13.0, ry: Math.PI }, { x: -3.6, z: 16.4, ry: Math.PI }, { x: -3.6, z: 13.0, ry: Math.PI }]; root.add(instanced(bench, benches, { name: 'benches6', shadow: true , kit: 'prop.int.bench_row', kitS: [1.09, 1, 1], kitColor: 0x4a4e66 })); for (const b of benches) solid(b.x, b.z, 2.4, 0.6, 0.6);
  const [ckx, ckz] = ADMIN.machibito.clock;
  { const g = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 28); g.rotateX(Math.PI / 2); g.translate(ckx, 3.0, ckz + 4.45); B.add('prop', g, 0xe8e0c8); const r = new THREE.TorusGeometry(0.92, 0.06, 6, 28); r.translate(ckx, 3.0, ckz + 4.38); B.add('prop', r, 0x8a6a3a); B.box('prop', ckx, 3.0, ckz + 4.36, 0.06, 0.7, 0.02, 0x1a1a1a, { rz: -0.4, edges: false }); B.box('prop', ckx, 3.0, ckz + 4.36, 0.05, 0.5, 0.02, 0x1a1a1a, { rz: 1.8, edges: false }); }
  spots.push({ id: 'ad_clock', kind: 'clock6', x: ckx, z: ckz + 3.2, r: 1.4, label: '待合の壁時計（止められる）' });
  B.box('prop', ADMIN.machibito.item[0], 0.5, ADMIN.machibito.item[1], 0.5, 0.06, 0.4, 0xd8c8a0); B.box('prop', ADMIN.machibito.item[0], 0.25, ADMIN.machibito.item[1], 0.5, 0.5, 0.4, 0x5a4a3a);
  spots.push({ id: 'ad_item', kind: 'item6', x: ADMIN.machibito.item[0] + 0.8, z: ADMIN.machibito.item[1], r: 1.1, label: '受付の落とし物の箱（封筒）' });
  B.box('prop', -12.6, 1.3, 18.6, 0.4, 0.5, 0.14, 0xc8b040); B.box('prop', -12.6, 1.35, 18.52, 0.14, 0.22, 0.04, 0x2a2a2a, { edges: false });
  spots.push({ id: 'ad_save', kind: 'save', x: -12.0, z: 18.6, r: 1.0, label: '内線電話（セーブ）' });
  const info = atlas.add(signDraw('監視室 ←　　機械室 ↑　　→ 記録室', { bg: '#20242c', fg: '#e0e8f0', size: 30 })); B.box('sign', 0, 3.4, 8.2, 6.0, 0.5, 0.04, 0xffffff, { uv: info, face: 4, edges: false });
  // 南と北を分ける壁（z 8）：中央の通路だけ
  wall(-10.1, 8.0, 8.2, 0.3); wall(10.1, 8.0, 8.2, 0.3); B.box('wall', 0, H - 0.35, 8.0, 12, 0.7, 0.3, W1);
  // 監視室（西）：監視カメラの壁・机・当番表
  wall(-6.0, 2.0, 0.3, 4.4); wall(-6.0, -4.6, 0.3, 2.6); B.box('wall', -6.0, H - 0.4, -1.4, 0.3, 0.8, 3.0, W1);
  wall(-10.1, -6.0, 8.2, 0.3, W2);
  const mon = addMesh(root, new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: monitorWallTex() }), 'monitor_wall'); mon.rotation.y = Math.PI / 2; mon.position.set(-13.95, 2.2, 1.0);
  B.box('prop', -13.9, 2.2, 1.0, 0.2, 2.3, 8.0, 0x15161c, { edges: false });
  B.box('prop', -11.6, 0.4, 1.0, 1.0, 0.8, 5.0, 0x3a3e48); B.box('prop', -11.6, 0.82, 1.0, 1.2, 0.04, 5.2, 0x2a2c34, { edges: false }); solid(-11.6, 1.0, 1.0, 5.0, 0.9);
  for (let i = 0; i < 4; i++) B.box('glow', -11.9, 1.05, -0.8 + i * 1.2, 0.3, 0.2, 0.5, [0x3aff8a, 0x3a8aff, 0xff4a6a, 0x3aff8a][i], { edges: false });
  dyn.monHalo = halos.push({ p: [-13.2, 2.2, 1.0], size: 4.5, color: 0x6ac8ff, k: 0.45 }) - 1;
  spots.push({ id: 'ad_monitor', kind: 'monitor6', x: -10.6, z: 1.0, r: 1.4, label: '監視卓（カメラの記録）' });
  B.box('prop', -6.2, 1.6, -3.6, 0.04, 0.8, 0.6, 0xf0eee0, { edges: false });
  spots.push({ id: 'ad_duty', kind: 'clue6', clue: 'duty6', x: -7.0, z: -3.6, r: 1.0, label: '壁の当番表と巡回記録（任意）' });
  // 記録室（東）：棚・事故報告書・音声記録
  wall(6.0, 2.0, 0.3, 4.4); wall(6.0, -4.6, 0.3, 2.6); B.box('wall', 6.0, H - 0.4, -1.4, 0.3, 0.8, 3.0, W1); wall(10.1, -6.0, 8.2, 0.3, W2);
  const shelf = [[0, 1.0, 0, 0.5, 2.0, 2.0, 0x5a5048], [0, 0.4, 0, 0.56, 0.04, 2.0, 0x7a7068], [0, 1.0, 0, 0.56, 0.04, 2.0, 0x7a7068], [0, 1.6, 0, 0.56, 0.04, 2.0, 0x7a7068]];
  const shelves = [{ x: 13.6, z: 4.0 }, { x: 13.6, z: 1.0 }, { x: 13.6, z: -2.0 }]; root.add(instanced(shelf, shelves, { name: 'shelves6', shadow: true })); for (const s of shelves) solid(s.x, s.z, 0.6, 2.0, 2.0);
  B.box('prop', 9.6, 0.38, 2.0, 1.8, 0.76, 0.9, 0x5a5048); B.box('prop', 9.6, 0.79, 2.0, 0.44, 0.03, 0.32, 0xf0ece0, { edges: false }); solid(9.6, 2.0, 1.8, 0.9, 0.8);
  spots.push({ id: 'ad_cover', kind: 'clue6', clue: 'cover', x: 9.6, z: 3.0, r: 1.1, label: '机の上の事故報告書（任意）' });
  B.box('prop', 9.4, 0.38, -3.4, 1.2, 0.76, 0.8, 0x4a4e58); B.box('glow', 9.4, 0.8, -3.4, 0.2, 0.06, 0.12, 0xff4040, { edges: false }); solid(9.4, -3.4, 1.2, 0.8, 0.8);
  spots.push({ id: 'ad_rec', kind: 'clue6', clue: 'rec6', x: 9.4, z: -2.4, r: 1.0, label: '音声記録の機械（任意）' });
  // 中央の廊下 → 機械室の保守扉（z −6.6）
  const mdoor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.2), new THREE.MeshToonMaterial({ color: 0x6a6e40, gradientMap: gradientMap() })); mdoor.position.set(0, 1.6, -6.6); root.add(mdoor);
  wall(-4.0, -6.6, 4.0, 0.4, W2); wall(4.0, -6.6, 4.0, 0.4, W2); B.box('wall', 0, (H + 3.2) / 2, -6.6, 4.2, H - 3.2, 0.4, W2);
  const mbox = cbox(0, -6.6, 4.2, 0.6, 3.2); boxes.push(mbox);
  dyn.mdoor = { mesh: mdoor, box: mbox, open: false, up: 1.6 + 3.1, down: 1.6, target: 1.6 };
  dyn.mdoorHalo = halos.push({ p: [2.4, 2.9, -6.3], size: 0.7, color: 0xff3030, k: 0.9, hazard: true }) - 1;
  const hosyu = atlas.add(warnDraw('保守扉　機械室')); B.box('sign', 0, 3.45, -6.38, 3.0, 0.4, 0.02, 0xffffff, { uv: hosyu, face: 4, edges: false });
  B.box('prop', 2.6, 1.3, -6.3, 0.4, 0.5, 0.12, 0x2a2e36); B.box('glow', 2.6, 1.35, -6.23, 0.3, 0.12, 0.01, 0x70e0a0, { edges: false });
  spots.push({ id: 'ad_mdoor', kind: 'mdoor6', x: 0, z: -5.4, r: 1.6, label: '機械室の保守扉（時刻の入力）' });
  // ── 機械室（z −7〜−26）：4 台・配管・蒸気弁・点検表・当直の机・キャットウォーク ──
  const M = ROUNDS.machines;
  for (const m of M) {
    const [x, z] = m.pos, big = m.id === 'C1';
    B.box('prop', x, 0.15, z, big ? 3.6 : 2.6, 0.3, 1.8, 0x4a5058);                                       // 基礎
    if (m.id[0] === 'P') {                                                                               // ポンプ：電動機＋渦巻きの胴
      { const g = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 16); g.rotateZ(Math.PI / 2); g.translate(x - 0.5, 0.75, z); B.add('prop', g, m.id === 'P2' ? 0x3a6a9a : 0x3a7a5a); }
      { const g = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 18); g.rotateZ(Math.PI / 2); g.translate(x + 0.55, 0.8, z); B.add('prop', g, 0x5a6066); }
      for (let k = 0; k < 6; k++) B.box('prop', x - 0.5, 0.75, z - 0.3 + k * 0.12, 1.1, 0.88, 0.02, 0x2a3a4a, { edges: false });
      { const g = new THREE.CylinderGeometry(0.16, 0.16, HM - 1.4, 10); g.translate(x + 0.55, (HM - 1.4) / 2 + 1.2, z - 0.2); B.add('prop', g, 0x6a7078); }       // 吐出管（天井の母管へ）
      { const g = new THREE.TorusGeometry(0.22, 0.04, 6, 14); g.translate(x + 0.55, 2.2, z + 0.0); B.add('prop', g, 0xc83a2a); }
    } else if (big) {                                                                                     // 圧縮機
      B.box('prop', x, 1.1, z, 3.0, 1.8, 1.4, 0x6a7a5a); B.box('prop', x - 1.0, 2.2, z, 0.9, 0.5, 0.9, 0x5a5e66);
      { const g = new THREE.CylinderGeometry(0.5, 0.5, 2.6, 16); g.translate(x + 2.2, 1.3, z - 0.4); B.add('prop', g, 0x8a8e94); }
    } else {                                                                                              // 排気ファン
      { const g = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 20); g.rotateX(Math.PI / 2); g.translate(x, 1.4, z); B.add('prop', g, 0x7a7e86); }
      B.box('prop', x, 0.7, z, 1.0, 1.0, 1.0, 0x5a6066); { const g = new THREE.CylinderGeometry(0.5, 0.5, HM - 2.0, 10); g.translate(x, (HM - 2) / 2 + 2, z - 0.4); B.add('prop', g, 0x6a7078); }
    }
    solid(x, z, big ? 3.6 : 2.6, 1.8, 2.4);
    const u = atlas.add(signDraw(m.name.replace(/^.* /, ''), { bg: '#f0e8c0', fg: '#2a2a2a', size: 40 })); B.box('sign', x, 1.95, z + 0.92, 1.4, 0.22, 0.02, 0xffffff, { uv: u, face: 4, edges: false });
    spots.push({ id: 'ad_m_' + m.id, kind: 'measure6', machine: m.id, x, z: z + 1.6, r: 1.3, label: m.name + '（振動計を当てる）' });
  }
  dyn.p2Halo = halos.push({ p: [M[1].pos[0], 1.0, M[1].pos[1] + 0.6], size: 2.2, color: 0xd060ff, k: 0.6 }) - 1;
  // P-2 の現場盤と弁（隔離の手順）
  B.box('prop', -1.2, 1.0, -17.4, 0.6, 1.4, 0.3, 0x5a6066); B.box('glow', -1.2, 1.35, -17.24, 0.12, 0.12, 0.01, 0x40ff80, { edges: false }); B.box('glow', -1.05, 1.35, -17.24, 0.12, 0.12, 0.01, 0xff3a3a, { edges: false }); solid(-1.2, -17.4, 0.6, 0.3, 1.6);
  B.box('prop', -1.2, 1.6, -17.24, 0.5, 0.25, 0.01, 0xf0e8c0, { edges: false });
  spots.push({ id: 'ad_loto', kind: 'loto6', x: -1.6, z: -16.6, r: 1.3, label: 'P-2 の現場盤・弁（止める手順）' });
  // 配管：天井の母管・壁の配管・蒸気弁（赤い輪）
  for (const z of [-21.4, -9.0]) { const g = new THREE.CylinderGeometry(0.25, 0.25, 27, 12); g.rotateZ(Math.PI / 2); g.translate(0, HM - 1.0, z); B.add('prop', g, 0x7a7e86); }
  for (const x of [-13.6, 13.6]) for (const y of [1.2, 2.4, 3.6]) { const g = new THREE.CylinderGeometry(0.12, 0.12, 18, 8); g.rotateX(Math.PI / 2); g.translate(x, y, -16); B.add('prop', g, y === 2.4 ? 0x9a6a3a : 0x6a7078); }
  dyn.steam = {};
  for (const v of ADMIN.steam) {
    const [x, z] = v.at; { const g = new THREE.TorusGeometry(0.32, 0.06, 6, 16); if (Math.abs(v.dir[0]) > 0) g.rotateY(Math.PI / 2); g.translate(x, 1.3, z); B.add('prop', g, 0xd83a2a); }
    B.box('prop', x, 1.3, z, Math.abs(v.dir[0]) ? 0.4 : 0.2, 0.2, Math.abs(v.dir[0]) ? 0.2 : 0.4, 0x5a5a62);
    dyn.steam[v.id] = { halo: halos.push({ p: [x, 1.4, z], size: 1.1, color: 0xffa080, k: 0.45 }) - 1 };
    spots.push({ id: 'ad_' + v.id, kind: 'steam6', valve: v.id, x: x + (v.dir[0] ? v.dir[0] * 0.9 : 0), z: z + (v.dir[1] ? v.dir[1] * 0.9 : 0), r: 1.3, label: '蒸気弁 ' + v.id + '（開けて噴かせる）' });
  }
  // 点検表の板（機械室の入口の右）・当直の机
  B.box('prop', 13.9, 1.7, -10.5, 0.06, 1.4, 1.8, 0x3a3a2a); B.box('prop', 13.85, 1.7, -10.5, 0.02, 1.2, 1.6, 0xf2eedc, { edges: false });
  spots.push({ id: 'ad_board', kind: 'board6', x: 12.8, z: -10.5, r: 1.3, label: '点検表の板（前回の値・診断）' });
  const [dx, dz] = ADMIN.boss.desk; B.box('prop', dx, 0.38, dz, 1.6, 0.76, 0.9, 0x4a4a52); B.box('prop', dx - 0.3, 0.8, dz, 0.4, 0.03, 0.3, 0xf2eedc, { edges: false }); solid(dx, dz, 1.6, 0.9, 0.8);
  spots.push({ id: 'ad_log', kind: 'clue6', clue: 'log6', x: dx - 1.2, z: dz, r: 1.1, label: '当直の机の点検日誌（任意）' });
  // キャットウォーク（北の壁ぎわ・高さ 3.6）と手すり・警告灯・警告の札
  B.box('prop', 0, 3.6, -24.4, 27, 0.12, 2.0, 0x4a4e56); for (let x = -13; x <= 13; x += 2) { B.box('prop', x, 1.8, -23.5, 0.1, 3.6, 0.1, 0x3a3e46, { edges: false }); B.box('prop', x, 4.1, -23.45, 0.05, 1.0, 0.05, 0xd8b030, { edges: false }); }
  B.box('prop', 0, 4.6, -23.45, 27, 0.06, 0.06, 0xd8b030, { edges: false });
  const keikoku = atlas.add(warnDraw('⚠ 警告　拡大運転中（仮）')); B.box('sign', 0, 5.8, -25.3, 6.0, 0.8, 0.04, 0xffffff, { uv: keikoku, face: 4, edges: false });
  dyn.warnHalo = halos.push({ p: [0, 5.8, -25.0], size: 5, color: 0xff2a3a, k: 0.6, hazard: true }) - 1;
  for (const x of [-12, 12]) { B.box('glow', x, 6.6, -7.4, 0.3, 0.3, 0.3, 0xff3020, { edges: false }); halos.push({ p: [x, 6.6, -7.2], size: 1.3, color: 0xff3020, k: 0.8, hazard: true }); }
  // ── 制御室（z −26〜−32）：ガラス張り・制御装置の盤・大きなモニター（研究者の影） ──
  B.box('glass', -7.6, 2.2, -26.2, 12.4, 3.4, 0.1, 0x2a2048, { edges: false }); B.box('glass', 7.6, 2.2, -26.2, 12.4, 3.4, 0.1, 0x2a2048, { edges: false });
  solid(-7.6, -26.2, 12.4, 0.3, 3.4); solid(7.6, -26.2, 12.4, 0.3, 3.4);
  B.box('prop', 0, 0.02, -26.2, 28, 0.05, 0.4, 0x2a2a30, { edges: false }); B.box('wall', 0, 4.6, -26.2, 28.4, 1.4, 0.3, W3);
  const cdoor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 0.15), new THREE.MeshToonMaterial({ color: 0x3a3a5a, gradientMap: gradientMap() })); cdoor.position.set(0, 1.6, -26.2); root.add(cdoor);
  const cbx = cbox(0, -26.2, 2.8, 0.5, 3.2); boxes.push(cbx); dyn.cdoor = { mesh: cdoor, box: cbx, open: false, up: 1.6 + 3.1, down: 1.6, target: 1.6 };
  spots.push({ id: 'ad_cdoor', kind: 'cdoor6', x: 0, z: -25.0, r: 1.4, label: '制御室の扉' });
  B.box('prop', 0, 0.55, -29.6, 5.0, 1.1, 1.2, 0x2a2c3a); B.box('glow', 0, 1.13, -29.4, 4.6, 0.02, 0.9, 0x5a3a9a, { edges: false }); solid(0, -29.6, 5.0, 1.2, 1.2);
  for (let i = 0; i < 6; i++) B.box('glow', -2.0 + i * 0.8, 1.16, -29.2, 0.3, 0.02, 0.18, [0xff3a3a, 0x40ff80, 0xffd040, 0x40a0ff, 0x40ff80, 0xff3a3a][i], { edges: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.6), new THREE.MeshBasicMaterial({ color: 0x1a0a2a })); screen.position.set(0, 3.0, -32.0); root.add(screen); dyn.screen = screen;
  const sil = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.9), new THREE.MeshBasicMaterial({ color: 0x050208, transparent: true, opacity: 0 })); sil.position.set(0.4, 2.7, -31.95); sil.visible = false; root.add(sil); dyn.silhouette = sil;
  // 画面の絵（研究者の影）：逆光の研究室・人影（顔は見えない）・走査線
  dyn.screenTex = canvasTex(512, 224, (g, w, h) => {
    const bg = g.createRadialGradient(w * 0.56, h * 0.45, 10, w * 0.56, h * 0.45, w * 0.6); bg.addColorStop(0, '#f2e6ff'); bg.addColorStop(0.25, '#b88ae8'); bg.addColorStop(0.7, '#3a1a5a'); bg.addColorStop(1, '#0a0412'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,6,34,.75)'; for (const [x, tw, th] of [[40, 46, 150], [110, 40, 120], [400, 52, 160], [462, 34, 110]]) { g.fillRect(x, h - th, tw, th); g.fillStyle = 'rgba(200,120,255,.35)'; g.fillRect(x + 6, h - th + 12, tw - 12, th * 0.5); g.fillStyle = 'rgba(20,6,34,.75)'; }
    g.fillStyle = '#06020a'; const cx = w * 0.56; g.beginPath(); g.arc(cx, 70, 24, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx - 70, h); g.quadraticCurveTo(cx - 64, 112, cx - 26, 100); g.lineTo(cx + 26, 100); g.quadraticCurveTo(cx + 66, 112, cx + 72, h); g.closePath(); g.fill();
    g.fillRect(cx - 10, 88, 20, 16);
    g.strokeStyle = 'rgba(255,240,255,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, 70, 25, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '14px monospace'; g.fillText('記録の間 ― 映像（顔は映っていない）', 12, 20);
  });
  dyn.ctlHalo = halos.push({ p: [0, 3.0, -31.6], size: 6, color: 0x9a50ff, k: 0.5 }) - 1;
  spots.push({ id: 'ad_control', kind: 'control6', x: 0, z: -28.6, r: 1.5, label: '制御装置の盤' });
  // 明かり
  const lights = [
    { id: 'lob', pos: [0, 3.8, 14], color: 0xe8f0f8, intensity: 7, dist: 13 },
    { id: 'lob2', pos: [-8, 3.8, 14], color: 0xe8f0f8, intensity: 4, dist: 10, flicker: true },
    { id: 'mon', pos: [-12, 2.4, 1], color: 0x6ac8ff, intensity: 5, dist: 9 },
    { id: 'rec', pos: [10, 3.6, 1], color: 0xffe0b0, intensity: 3.5, dist: 8 },
    { id: 'cor', pos: [0, 3.8, 0], color: 0xd8e0e8, intensity: 3.5, dist: 9 },
    { id: 'm1', pos: [-7, 6.8, -12], color: 0xffe8c8, intensity: 12, dist: 15 },
    { id: 'm2', pos: [7, 6.8, -12], color: 0xffe8c8, intensity: 12, dist: 15 },
    { id: 'desk', pos: [11, 2.6, -13], color: 0xffd8a0, intensity: 3, dist: 6 },
    { id: 'm3', pos: [0, 6.8, -20], color: 0xffd8b0, intensity: 8, dist: 14, flicker: true },
    { id: 'p2', pos: [-3, 1.4, -18.6], color: 0xc060ff, intensity: 4, dist: 6 },
    { id: 'warn', pos: [0, 5.6, -24.6], color: 0xff2a3a, intensity: 5, dist: 10 },
    { id: 'ctl', pos: [0, 3.0, -30], color: 0x9a50ff, intensity: 6, dist: 10 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (['lob', 'lob2', 'cor', 'm1', 'm2', 'm3'].includes(l.id)) { const top = l.pos[1] > 6 ? HM : H; B.box('glow', l.pos[0], top - 0.03, l.pos[2], 0.3, 0.04, 1.8, 0xf4f8ff, { edges: false }); halos.push({ p: [l.pos[0], top - 0.15, l.pos[2]], size: 1.4, color: l.color, k: 0.4, light: l }); }
  root.add(lightShafts([{ p: [-7, HM - 0.1, -12], dir: [0, -1, 0], len: 7, w0: 1.0, w1: 3.2, color: 0xffe8c8, k: 0.1 }, { p: [7, HM - 0.1, -12], dir: [0, -1, 0], len: 7, w0: 1.0, w1: 3.2, color: 0xffe8c8, k: 0.1 }, { p: [0, 3.0, -31.8], dir: [0, -0.2, 1], len: 6, w0: 3, w1: 5, color: 0x9a50ff, k: 0.14 }]));
  hideSpots.push({ x: -10, z: 16 }, { x: 10, z: 16 }, { x: -10, z: -10 }, { x: 10, z: -14 });
  const sr = rngOf(61), st = []; for (let i = 0; i < 22; i++) st.push({ p: [(sr() - 0.5) * 26, 0, 20 - sr() * 50], n: 'floor', size: 0.8 + sr() * 1.8, kind: [1, 3, 5][Math.floor(sr() * 3)], rot: sr() * 6, k: 0.55 });
  const sd = stainDecals(st); if (sd) root.add(sd);
  return finish('admin', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet: [], hideSpots, surface: () => 'tile', rainRoof: () => true, indoor: () => true,
    bounds: { minX: -14, maxX: 14, minZ: -32, maxZ: 22 }, spawns: Object.fromEntries(Object.entries(ADMIN.spawn).map(([k, v]) => [k, v])),
    fog: { color: 0x0a0a10, density: 0.035 }, rain: false, amb: 'admin', far: 140,
  });
}

BUILDERS3.ruins = buildRuins;
BUILDERS3.avenue = buildAvenue;
BUILDERS3.admin = buildAdmin;
