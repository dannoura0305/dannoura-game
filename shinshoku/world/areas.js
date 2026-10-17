// 区画の組み立て（裏路地・商業施設の前・避難所）。灰色の箱＋簡単な色・トゥーン。静的な箱は材質ごとに 1 つの網へ、
// 繰り返す物（簡易ベッド・毛布・荷物・靴箱・ベンチ）はインスタンス網（描画呼び出し 1 回）にまとめる。
// 区画の形（どれも同じ）：{ id, root, boxes, spots, dyn, lights, halos, wet, hideSpots, surface(x,z), rainRoof(x,z), indoor(x,z), bounds, spawns, fog, rain, amb }
// 座標：x 横・z 奥（−が奥）・y 上。単位 m。名前・表示はすべて【仮】。
import * as THREE from 'three';
import { Builder, Atlas, signDraw, groundTex, buildLevel } from './level.js';
import { box as cbox } from './collide.js';
import { gradientMap, canvasTex } from '../render/toon.js';
import { AREA_DATA } from '../data/areas.js';
import { skyDome } from '../render/sky.js';

export function mats(atlas) {
  const tex = atlas.texture();
  return {
    wall: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
    prop: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
    shutter: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
    sign: new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b0c0 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    glass: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    glass2: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    floor: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
  };
}
export function ground(w, d, cx, cz, opt) {
  const t = groundTex(opt); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: gradientMap() }));
  m.rotation.x = -Math.PI / 2; m.position.set(cx, 0, cz); m.receiveShadow = true; m.name = 'ground'; return m;
}
/** 部品の箱をまとめた形（頂点色）をインスタンス網に。parts=[[cx,cy,cz,w,h,d,color],…]、xf=[{x,z,ry,color?}] */
export function instanced(parts, xf, opt = {}) {
  const geos = parts.map(([cx, cy, cz, w, h, d, c]) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(cx, cy, cz);
    const col = new THREE.Color(c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.deleteAttribute('uv'); return g;
  });
  const merged = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) {
    let total = 0; for (const g of geos) total += g.attributes[k].array.length;
    const a = new Float32Array(total); let o = 0; for (const g of geos) { a.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    merged.setAttribute(k, new THREE.BufferAttribute(a, 3));
  }
  const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }), xf.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  xf.forEach((t, i) => { Q.setFromEuler(new THREE.Euler(0, t.ry || 0, 0)); P.set(t.x, t.y || 0, t.z); M.compose(P, Q, S); m.setMatrixAt(i, M); if (t.color != null) m.setColorAt(i, new THREE.Color(t.color)); });
  m.castShadow = !!opt.shadow; m.receiveShadow = true; m.name = opt.name || 'inst';
  return m;
}
export function finish(id, B, atlas, root, extra) {
  const lv = B.build(mats(atlas)); lv.name = 'lv_' + id; root.add(lv);
  root.updateMatrixWorld(true);
  return Object.assign({ id, root }, extra);
}

// ───────────────────────── 裏路地 ─────────────────────────
export function buildAlley() {
  const root = new THREE.Group(); root.name = 'area_alley'; root.add(skyDome({ moon: [0.2, 0.45, -0.9] }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const W1 = 0x6a6470, W2 = 0x5a5562, W3 = 0x726a66;
  // フェーズ9：床はコンクリートの板・壁は建物の裏（モルタル・波板・タイル）を町の地図帳の材質で
  B.box('tex', 6, -0.06, -11, 40, 0.12, 40, 0xa8a0a4, { tile: 'concrete', ts: 2.2, edges: false });
  const ALLEY_T = { [W1]: 'mortar', [W2]: 'siding2', [W3]: 'tilewall' };
  const wall = (cx, cz, w, d, h, c) => { const t = ALLEY_T[c]; if (t) B.box('tex', cx, h / 2, cz, w, h, d, new THREE.Color(c).lerp(new THREE.Color(0xc8c0c0), 0.55).getHex(), { tile: t, ts: 2, ao: true }); else B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  // 通路 A（南北）：x −1.3〜1.3、z 1.5〜−23.3
  wall(-1.55, -4.5, 0.5, 12, 7.5, W1);            // 左の壁（祠のくぼみの手前）
  wall(-1.55, -17.5, 0.5, 13, 7.5, W2);           // 左の壁（くぼみの先）
  wall(-3.55, -10, 0.5, 2.2, 7.5, W2);            // くぼみの奥
  wall(-2.55, -8.85, 2.0, 0.3, 7.5, W2); wall(-2.55, -11.15, 2.0, 0.3, 7.5, W2);
  wall(1.55, -9.6, 0.5, 22.2, 7.5, W3);           // 右の壁
  wall(0, 2.0, 3.6, 0.5, 4, 0x4a4652);            // 入口の後ろ（商店街の空き店舗の中）
  // 通路 B（東西）：z −20.7〜−23.3、x −1.3〜16
  // 北の壁（x 11〜13 に表通りへの抜け道：上だけ壁）
  wall(5.0, -23.55, 12.0, 0.5, 7.5, W1); wall(14.9, -23.55, 2.8, 0.5, 7.5, W1);
  B.box('wall', 12, 5.0, -23.55, 2.0, 5.0, 0.5, W1); B.box('glass', 12, 1.25, -24.2, 2.0, 2.5, 0.1, 0x0a0a12, { edges: false });
  wall(12, -24.6, 2.4, 0.4, 7.5, 0x2a2830);
  wall(4.6, -20.45, 6.6, 0.5, 7.5, W3);           // 南の壁（くぼみまで）
  wall(12.0, -20.45, 8.0, 0.5, 7.5, W3);
  wall(6.0, -18.35, 2.4, 0.5, 7.5, W2); wall(4.9, -19.4, 0.3, 2.2, 7.5, W2); wall(7.1, -19.4, 0.3, 2.2, 7.5, W2);   // くぼみ（自販機）
  wall(16.6, -22, 0.5, 3.6, 7.5, 0x4a4250);       // 突き当たり（坂口の家の裏口）
  // 壁の飾り：窓・配管・室外機・ごみ箱・自転車
  for (const [x, z, face] of [[1.3, -3, -1], [1.3, -9, -1], [1.3, -15, -1], [-1.3, -2, 1], [-1.3, -15, 1], [-1.3, -20, 1]]) {
    const lit = (Math.abs(z) % 3) < 1;
    B.box(lit ? 'texglow' : 'tex', x + face * 0.03, 4.6, z, 0.06, 1.0, 1.2, lit ? 0xc0b0a0 : 0xffffff, { tile: lit ? 'win_curtain' : 'win_dark', fit: true, edges: false }); B.box('prop', x + face * 0.08, 4.05, z, 0.1, 0.06, 1.3, 0x9a9ca0, { edges: false });
  }
  for (const z of [-4, -13, -19]) { B.box('tex', 1.05, 1.1, z, 0.5, 0.6, 0.8, 0xffffff, { tile: 'acunit', fit: true, edges: false }); solid(1.05, z, 0.5, 0.8, 1.4); B.box('prop', 1.05, 0.4, z, 0.4, 0.8, 0.1, 0x6a6a6a, { edges: false }); }
  // 頭の上の電線・配管・ガス管（裏路地らしさ）
  for (const [z, y] of [[-2.5, 5.8], [-8, 6.3], [-14.5, 5.6], [-19, 6.1]]) B.box('prop', 0, y, z, 3.0, 0.03, 0.03, 0x1a1a20, { edges: false });
  for (const [x, z] of [[1.25, -7.5], [-1.25, -12.5], [1.25, -16.5]]) B.box('prop', x, 3.2, z, 0.08, 6.4, 0.08, 0xb8a040, { edges: false });
  B.box('prop', 1.3, 3.5, -10, 0.12, 7, 0.12, 0x6a6a72, { edges: false }); B.box('prop', -1.3, 3.5, -6, 0.12, 7, 0.12, 0x6a6a72, { edges: false });
  B.box('prop', 8, 6.2, -23.25, 16, 0.1, 0.1, 0x5a5a62, { edges: false });
  for (const [x, z] of [[-0.9, -6.5], [9.5, -23]]) { B.box('prop', x, 0.45, z, 0.6, 0.9, 0.6, 0x3a5a3a); solid(x, z, 0.6, 0.6, 0.9); }
  B.box('prop', 3.5, 0.5, -23.0, 1.4, 1.0, 0.4, 0x2a2a30); solid(3.5, -23.0, 1.4, 0.4, 1.0);
  // 祠（小さな地蔵・賽銭箱）：見切り補助
  B.box('prop', -2.9, 0.35, -10, 0.6, 0.7, 0.8, 0x6a6a6a); B.box('prop', -2.95, 0.95, -10, 0.36, 0.5, 0.36, 0x8a8a84); B.box('prop', -2.95, 1.3, -10, 0.24, 0.24, 0.24, 0x8a8a84);
  B.box('prop', -2.55, 0.25, -10, 0.25, 0.3, 0.4, 0x6a4a2a); solid(-2.9, -10, 0.7, 0.9, 1.2);
  B.box('glow', -2.6, 1.15, -9.6, 0.08, 0.12, 0.08, 0xffa060, { edges: false }); halos.push({ p: [-2.5, 1.15, -9.6], size: 0.7, color: 0xffa060, k: 0.7, flicker: true });
  spots.push({ id: 'shrine', kind: 'pickupSpot', give: 'equip:mikiri', x: -2.0, z: -10, r: 1.3, label: '祠（賽銭箱）' });
  // 自販機（くぼみ）
  B.box('wall', 6.0, 0.9, -18.95, 1.0, 1.8, 0.7, 0x2a7ad0); B.box('glow', 6.0, 1.15, -19.31, 0.8, 0.9, 0.02, 0xbfe4ff, { edges: false }); solid(6.0, -18.95, 1.0, 0.7, 1.8);
  halos.push({ p: [6.0, 1.2, -19.5], size: 1.6, color: 0x9fd0ff, k: 0.55 });
  // 裏口の看板
  const s1 = atlas.add(signDraw('喫茶 灯　裏口', { bg: '#2a2620', fg: '#f0d8a0', size: 34 }));
  B.box('sign', 16.33, 2.6, -22, 0.04, 0.3, 1.2, 0xffffff, { uv: s1, face: 1, edges: false });
  const s2 = atlas.add(signDraw('関係者以外立入禁止', { bg: '#f0f0e8', fg: '#a02020', size: 30 }));
  B.box('sign', 1.27, 1.8, -12, 0.03, 0.22, 0.9, 0xffffff, { uv: s2, face: 1, edges: false });
  // フェーズ11：建物の裏口（鉄の戸・枠・段・小さな灯り）。飾り（開かない）：x＝壁の内側の面・n＝通路の向き（x か z の ±1）
  const backDoor = (x, z, nx, nz, lit) => {
    const ax = Math.abs(nx) > 0.5, w = 0.85, h = 2.0;
    B.box('tex', x + nx * 0.02, h / 2, z + nz * 0.02, ax ? 0.04 : w, h, ax ? w : 0.04, 0x9aa0a8, { tile: 'panel', fit: true, edges: false });
    for (const s of [-1, 1]) B.box('prop', x + nx * 0.03 + (ax ? 0 : s * (w / 2 + 0.04)), (h + 0.08) / 2, z + nz * 0.03 + (ax ? s * (w / 2 + 0.04) : 0), ax ? 0.06 : 0.08, h + 0.08, ax ? 0.08 : 0.06, 0x4a4e54, { edges: false });
    B.box('prop', x + nx * 0.03, h + 0.04, z + nz * 0.03, ax ? 0.06 : w + 0.16, 0.08, ax ? w + 0.16 : 0.06, 0x4a4e54, { edges: false });
    B.box('prop', x + nx * 0.06 + (ax ? 0 : 0.3), 1.0, z + nz * 0.06 + (ax ? 0.3 : 0), 0.05, 0.05, 0.05, 0xc8ccd0, { edges: false });
    B.box('tex', x + nx * 0.2, 0.07, z + nz * 0.2, ax ? 0.4 : 1.0, 0.14, ax ? 1.0 : 0.4, 0xb0aca8, { tile: 'concrete', ts: 1, edges: false });
    B.box('glow', x + nx * 0.08, h + 0.35, z + nz * 0.08, 0.14, 0.1, 0.14, lit ? 0xffd8a0 : 0x3a3428, { edges: false });
    if (lit) halos.push({ p: [x + nx * 0.2, h + 0.3, z + nz * 0.2], size: 0.8, color: 0xffd8a0, k: 0.6 });
  };
  backDoor(1.3, -11.0, -1, 0, true); backDoor(-1.3, -17.5, 1, 0, false); backDoor(10.0, -20.2, 0, -1, true);
  // 戸（帰路 a1 の家）
  const D = AREA_DATA.alley.doors.a1;
  const g = new THREE.Group(); const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 1.2), new THREE.MeshToonMaterial({ color: 0x4a3a30, gradientMap: gradientMap() })); leaf.position.set(0, 1.03, 0.6); leaf.castShadow = true;
  const pivot = new THREE.Group(); pivot.position.set(0, 0, -0.6); pivot.add(leaf); g.add(pivot); g.position.set(16.32, 0, -22); root.add(g);
  B.box('glow', 16.2, 2.4, -22.75, 0.12, 0.12, 0.12, D.color, { edges: false });
  const dh = halos.push({ p: [16.05, 2.4, -22.75], size: 0.9, color: D.color, k: 0.9, door: 'a1' }) - 1;
  dyn.door_a1 = { group: g, pivot, halo: dh, open: false, color: D.color, face: -1 };
  spots.push({ id: 'door_a1', kind: 'door', door: 'a1', x: 15.3, z: -22, r: 1.4, label: '裏口の鍵を開ける（表札「坂口」）' });
  // 出入り
  spots.push({ id: 'exit_street', kind: 'exit', to: 'shotengai', spawn: 'from_alley', x: 0, z: 1.3, r: 1.2, label: '商店街へ戻る', auto: true });
  spots.push({ id: 'exit_plaza', kind: 'exit', to: 'plaza', spawn: 'from_alley', x: 12, z: -23.0, r: 1.2, label: '表通りへ（商業施設の前）', auto: true });
  hideSpots.push({ x: -2.5, z: -9.3 }, { x: 6.0, z: -19.6 }, { x: 0.6, z: -4.9 }, { x: 0.6, z: -13.9 }, { x: 14.5, z: -21.0 });
  const lights = [
    { pos: [1.0, 3.2, -6], color: 0xffd8a0, intensity: 5, dist: 9, flicker: true },
    { pos: [-1.0, 3.0, -16], color: 0xc8ffd8, intensity: 4.5, dist: 8 },
    { pos: [8, 3.2, -22.9], color: 0xffd8a0, intensity: 5, dist: 9 },
    { pos: [6.0, 1.4, -19.7], color: 0x9fd0ff, intensity: 2.5, dist: 4, vending: true },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (!l.vending) { halos.push({ p: [l.pos[0], l.pos[1], l.pos[2]], size: 1.4, color: l.color, k: 0.85, light: l }); B.box('glow', l.pos[0], l.pos[1] + 0.12, l.pos[2], 0.12, 0.16, 0.12, l.color, { edges: false }); }
  const wet = lights.filter(l => !l.vending).map(l => ({ p: [l.pos[0] * 0.6, 0, l.pos[2]], size: 1.4, color: l.color, k: 0.9 }));
  return finish('alley', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: () => 'wet', rainRoof: () => false, indoor: () => true,
    bounds: { minX: -4, maxX: 17, minZ: -24, maxZ: 2.4 }, spawns: { from_street: [0, -0.8, Math.PI], from_plaza: [12, -21.5, Math.PI] },
    fog: { color: 0x0e0c18, density: 0.06 }, rain: true, amb: 'alley',
  });
}

// ───────────────────────── 商業施設の前 ─────────────────────────
export function buildPlaza() {
  const root = new THREE.Group(); root.name = 'area_plaza'; root.add(skyDome({ moon: [0.4, 0.3, -0.85], mountains: true }));
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  // フェーズ9：床は広場の舗装・建物は町の地図帳の材質
  B.box('tex', 0, -0.06, -1, 44, 0.12, 40, 0xb8b0b8, { tile: 'paving', ts: 2.4, edges: false });
  const PLAZA_T = { [0x7a7484]: ['tilewall', 0xc8b8b0], [0x5a5562]: ['block', 0xd0ccc8], [0x3a3640]: ['concrete', 0x8a8690], [0x4a6a4a]: ['hedge', 0xa0b890], [0x9a94a4]: ['mortar', 0xd8d0d0] };
  const wall = (cx, cz, w, d, h, c) => { const t = PLAZA_T[c]; if (t) B.box('tex', cx, h / 2, cz, w, h, d, t[1], { tile: t[0], ts: t[0] === 'block' ? 1.2 : 2, ao: true }); else B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  // 外周（見えない壁ではなく、植え込み・建物・柵で囲む）
  wall(0, -14.6, 38, 1.2, 11, 0x7a7484);                        // 商業施設の正面
  wall(-18.6, 7.5, 1, 13, 4, 0x5a5562); wall(-18.6, -9, 1, 10, 4, 0x5a5562);   // 西（x −18.6、z −2.5〜2.5 が裏路地からの道）
  wall(-19.6, 0, 1, 6, 4, 0x3a3640);
  wall(18.6, -6, 1, 16, 4, 0x5a5562); wall(18.6, 11, 1, 6, 4, 0x5a5562);        // 東（z 2〜8 が避難所への渡り廊下）
  wall(19.6, 5, 1, 6, 4, 0x3a3640);
  wall(0, 14.6, 38, 1, 2.2, 0x4a6a4a);                           // 南の植え込み
  for (let x = -16; x <= 16; x += 4) B.box('prop', x, 2.4, 14.4, 0.8, 1.2, 0.8, 0x2a4a2a, { edges: false });
  // 正面：ガラスの入口（閉まっている）・大きな看板・「本日は閉店しました」
  B.box('glass', 0, 1.6, -13.95, 7, 3.2, 0.1, 0x101824, { edges: false });
  B.box('glow', 0, 3.3, -13.95, 7.2, 0.12, 0.12, 0x6a8aaa, { edges: false });
  for (const x of [-3.5, 0, 3.5]) B.box('wall', x, 1.6, -13.9, 0.2, 3.2, 0.2, 0x3a3a44);
  const big = atlas.add(signDraw('ことぶきショッピングセンター', { bg: '#1a2a3a', fg: '#ffe8b0', size: 40, frameColor: '#ffb070' }));
  B.box('sign', 0, 7.6, -13.95, 14, 1.4, 0.2, 0xffffff, { uv: big, face: 4 });
  halos.push({ p: [-5, 7.6, -13.4], size: 4, color: 0xffd090, k: 0.35 }, { p: [5, 7.6, -13.4], size: 4, color: 0xffd090, k: 0.35 }, { p: [0, 7.6, -13.4], size: 5, color: 0xffd090, k: 0.3 });
  for (let x = -16; x <= 16; x += 4) if (Math.abs(x) > 5) { B.box(Math.abs(x) % 8 === 4 ? 'texglow' : 'tex', x, 5.0, -13.97, 3.0, 1.6, 0.06, Math.abs(x) % 8 === 4 ? 0x9aa8c0 : 0xffffff, { tile: Math.abs(x) % 8 === 4 ? 'win_office_lit' : 'win_office', fit: true, edges: false }); }
  for (let x = -14; x <= 14; x += 7) B.box('tex', x, 9.6, -14.0, 0.8, 0.6, 0.4, 0xffffff, { tile: 'acunit', fit: true, edges: false });
  const cl = atlas.add(signDraw('本日は閉店しました', { bg: '#f4f0e6', fg: '#8a1a1a', size: 32 }));
  B.box('sign', 0, 1.4, -13.85, 1.6, 0.3, 0.02, 0xffffff, { uv: cl, face: 4, edges: false });
  spots.push({ id: 'mall_door', kind: 'read', x: 0, z: -12.6, r: 1.8, label: '入口（閉まっている）', text: 'mall_door' });
  // 警備室（防犯映像）：x 8〜13、z −12〜−8。南に戸口（x 9〜10.4）
  wall(10.5, -12.2, 5.2, 0.3, 3, 0x9a94a4); wall(7.95, -10.1, 0.3, 4.2, 3, 0x9a94a4); wall(13.05, -10.1, 0.3, 4.2, 3, 0x9a94a4);
  wall(8.45, -7.95, 1.0, 0.3, 3, 0x9a94a4); wall(11.75, -7.95, 2.6, 0.3, 3, 0x9a94a4);
  // フェーズ11：警備室の戸（内へ開けたまま・枠）
  B.box('prop', 9.0, 1.05, -8.65, 0.05, 2.05, 1.3, 0x7a8088, { edges: false }); B.box('prop', 9.05, 1.0, -9.15, 0.06, 0.05, 0.05, 0xc8ccd0, { edges: false });
  for (const x of [8.98, 10.42]) B.box('prop', x, 1.1, -7.95, 0.06, 2.2, 0.34, 0x5a5e66, { edges: false }); B.box('prop', 9.7, 2.24, -7.95, 1.5, 0.08, 0.34, 0x5a5e66, { edges: false });
  B.box('wall', 10.5, 3.1, -10.1, 5.4, 0.2, 4.6, 0x6a6474); boxes.push(cbox(10.5, -10.1, 5.4, 4.6, 0.3, 3.0));
  B.box('prop', 11.6, 0.4, -11.6, 2.4, 0.8, 0.7, 0x5a5a62); solid(11.6, -11.6, 2.4, 0.7, 0.8);
  for (const [x, y] of [[10.9, 1.15], [11.6, 1.15], [12.3, 1.15], [11.25, 1.6], [11.95, 1.6]]) B.box('glow', x, y, -11.75, 0.6, 0.4, 0.04, 0x7ab0d8, { edges: false });
  halos.push({ p: [11.6, 1.35, -11.5], size: 1.6, color: 0x8ac8ff, k: 0.5 });
  const sec = atlas.add(signDraw('警備室', { bg: '#e8e8f0', fg: '#203050', size: 36 }));
  B.box('sign', 9.7, 2.7, -7.78, 0.9, 0.28, 0.03, 0xffffff, { uv: sec, face: 4, edges: false });
  spots.push({ id: 'cctv', kind: 'cctv', x: 11.4, z: -10.5, r: 1.2, label: '防犯カメラの映像' });
  // 枯れた噴水（真ん中・隠れ場所）
  B.box('prop', 2, 0.3, 0, 3.8, 0.6, 3.8, 0x8a8a92); solid(2, 0, 3.8, 3.8, 0.7);
  B.box('prop', 2, 0.9, 0, 0.6, 1.2, 0.6, 0x9a9aa2); B.box('floor', 2, 0.62, 0, 3.4, 0.02, 3.4, 0x2a3240, { edges: false });
  hideSpots.push({ x: 2, z: 2.5 }, { x: 2, z: -2.5 }, { x: -0.5, z: 0 }, { x: 4.5, z: 0 }, { x: 9.6, z: -9.0 }, { x: -6.5, z: 12.2 }, { x: -12.5, z: -8.8 });
  // バス停（市民体育館前 行き）・ベンチ
  B.box('wall', -6, 2.4, 12.6, 4, 0.12, 1.8, 0x3a4a5a); for (const x of [-7.8, -4.2]) B.box('prop', x, 1.2, 13.3, 0.1, 2.4, 0.1, 0x6a6a72);
  B.box('glass', -6, 1.4, 13.4, 3.6, 1.6, 0.04, 0x1a2a3a, { edges: false });
  const bus = atlas.add(signDraw('市民体育館前　（終バス 済）', { bg: '#f0f0e8', fg: '#1a3a6a', size: 28 }));
  B.box('prop', -3.6, 1.2, 12.4, 0.08, 2.4, 0.08, 0x6a6a72); B.box('sign', -3.6, 2.3, 12.4, 0.04, 0.4, 0.9, 0xffffff, { uv: bus, face: 0, edges: false });
  spots.push({ id: 'busstop', kind: 'read', x: -4.2, z: 11.2, r: 1.4, label: 'バス停の時刻表', text: 'busstop' });
  const bench = [[0, 0.42, 0, 1.6, 0.06, 0.45, 0x8a6a4a], [0, 0.2, -0.15, 0.08, 0.4, 0.08, 0x3a3a3a], [0.7, 0.2, 0, 0.06, 0.4, 0.4, 0x3a3a3a], [-0.7, 0.2, 0, 0.06, 0.4, 0.4, 0x3a3a3a], [0, 0.7, -0.2, 1.6, 0.35, 0.05, 0x8a6a4a]];
  const benches = [{ x: -6, z: 12.9, ry: Math.PI }, { x: -10, z: -2, ry: Math.PI / 2 }, { x: 8, z: 4.5, ry: 0 }, { x: -2, z: -9, ry: 0 }];
  root.add(instanced(bench, benches, { name: 'benches' }));
  for (const b of benches) solid(b.x, b.z, Math.abs(Math.sin(b.ry)) > 0.5 ? 0.5 : 1.6, Math.abs(Math.sin(b.ry)) > 0.5 ? 1.6 : 0.5, 0.8);
  // 自販機 2 台
  for (const x of [-13.2, -12.0]) { B.box('wall', x, 0.9, -11.1, 1.0, 1.8, 0.7, x < -12.5 ? 0xc83a3a : 0xe0e0e8); B.box('glow', x, 1.15, -10.74, 0.8, 0.9, 0.02, 0xbfe4ff, { edges: false }); solid(x, -11.1, 1.0, 0.7, 1.8); }
  halos.push({ p: [-12.6, 1.2, -10.4], size: 2.2, color: 0x9fd0ff, k: 0.55 });
  // 渡り廊下（避難所へ）・放送のスピーカーの柱
  B.box('wall', 18.6, 3.2, 5, 1.2, 0.2, 6, 0x5a5a62);
  const sh = atlas.add(signDraw('→ 避難所（市民体育館）', { bg: '#1a6a3a', fg: '#ffffff', size: 32 }));
  B.box('sign', 17.9, 2.6, 5, 0.04, 0.4, 2.2, 0xffffff, { uv: sh, face: 1, edges: false });
  halos.push({ p: [17.7, 2.6, 5], size: 1.5, color: 0x60ff90, k: 0.4 });
  B.box('prop', 14.5, 2.5, 8.5, 0.16, 5, 0.16, 0x6a6a72); B.box('prop', 14.5, 4.9, 8.2, 0.5, 0.4, 0.5, 0xd8d8d0);
  spots.push({ id: 'exit_shelter', kind: 'exit', to: 'shelter', spawn: 'from_plaza', x: 17.8, z: 5, r: 1.6, label: '避難所へ（渡り廊下）', auto: true, needFlag: 'plaza_broadcast', lockedText: 'shelter_wait' });
  spots.push({ id: 'exit_alley', kind: 'exit', to: 'alley', spawn: 'from_plaza', x: -18.4, z: 0, r: 1.3, label: '裏路地へ戻る', auto: true });
  // 街灯（高い柱）
  const lights = [
    { pos: [-9, 5.6, 5], color: 0xbfd8ff, intensity: 13, dist: 15 },
    { pos: [9, 5.6, 9], color: 0xbfd8ff, intensity: 11, dist: 14, flicker: true },
    { pos: [-6, 5.6, -8], color: 0xbfd8ff, intensity: 11, dist: 14 },
    { pos: [11, 2.7, -10], color: 0xd8f0ff, intensity: 3.5, dist: 6, booth: true },
    { pos: [14, 5.6, 0], color: 0xffd0a0, intensity: 9, dist: 12 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) if (!l.booth) {
    B.box('prop', l.pos[0], l.pos[1] / 2, l.pos[2], 0.18, l.pos[1], 0.18, 0x5a5a62); solid(l.pos[0], l.pos[2], 0.25, 0.25, 6);
    B.box('glow', l.pos[0], l.pos[1] + 0.1, l.pos[2], 0.5, 0.12, 0.3, l.color, { edges: false });
    halos.push({ p: [l.pos[0], l.pos[1], l.pos[2]], size: 3.0, color: l.color, k: 0.85, light: l });
  }
  const wet = lights.filter(l => !l.booth).map(l => ({ p: [l.pos[0], 0, l.pos[2]], size: 2.6, color: l.color, k: 0.9 })).concat([{ p: [0, 0, -12], size: 3, color: 0xffd090, k: 0.5 }]);
  return finish('plaza', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: (x, z) => (x > 8 && x < 13 && z < -8 ? 'tile' : 'wet'), rainRoof: (x, z) => (x > 8 && x < 13 && z < -8 && z > -12.2), indoor: (x, z) => x > 8 && x < 13 && z < -8,
    bounds: { minX: -19, maxX: 19, minZ: -14, maxZ: 14 }, spawns: { from_alley: [-16.2, 0, Math.PI / 2], from_shelter: [15.4, 5, -Math.PI / 2] },
    fog: { color: 0x100c1c, density: 0.042 }, rain: true, amb: 'plaza',
  });
}

// ───────────────────────── 避難所（市民体育館） ─────────────────────────
export function buildShelter() {
  const root = new THREE.Group(); root.name = 'area_shelter';
  const B = new Builder(), atlas = new Atlas(), boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const wall = (cx, cz, w, d, h, c) => { B.box('wall', cx, h / 2, cz, w, h, d, c); solid(cx, cz, w, d, h); };
  const GW = 0xc8c0b0, GW2 = 0xb0a898;
  // 床：体育館（板張り）とロビー（タイル）
  const gymFloor = new THREE.Mesh(new THREE.PlaneGeometry(28.4, 30.6), new THREE.MeshToonMaterial({ map: gymTex(), gradientMap: gradientMap() }));
  gymFloor.rotation.x = -Math.PI / 2; gymFloor.position.set(0, 0, -5.2); gymFloor.receiveShadow = true; gymFloor.name = 'ground'; root.add(gymFloor);
  root.add(ground(14.4, 10.4, 0, 15.2, { base: '#5a5862', repeat: [5, 4] }));
  // 体育館の壁（x ±14.2、z −20.4〜10）
  wall(-14.4, -5.2, 0.4, 30.8, 9, GW); wall(14.4, -14.8, 0.4, 11.6, 9, GW); wall(14.4, 5.4, 0.4, 9.2, 9, GW);   // 東：z −9〜0.8 が器具庫
  wall(0, -20.6, 29.2, 0.4, 9, GW2);
  wall(-7.85, 10.2, 12.9, 0.4, 9, GW); wall(7.85, 10.2, 12.9, 0.4, 9, GW);     // 南：x −1.4〜1.4 が戸
  B.box('wall', 0, 8.5, 10.2, 2.8, 1.0, 0.4, GW); B.box('wall', 0, 9.1, -5.2, 29.2, 0.2, 31, 0x8a8478);         // 天井
  // 高い窓（月明かり）
  for (let z = -18; z <= 8; z += 4) for (const x of [-14.18, 14.18]) if (!(x > 0 && z > -10 && z < 2)) B.box('texglow', x, 7.2, z, 0.06, 1.4, 2.4, 0x5a6a98, { tile: 'win_dark', fit: true, edges: false });
  // フェーズ9：腰板（木）・防球ネットの柱・壁の時計・ロビーの床タイル
  for (const [x, z0b, z1b] of [[-14.17, -20.2, 9.9], [14.17, -20.2, -9.1], [14.17, 0.9, 9.9]]) B.box('tex', x, 1.1, (z0b + z1b) / 2, 0.05, 2.2, z1b - z0b, 0xd8c8b0, { tile: 'wood', ts: 1.4, edges: false });
  for (const sx of [-1, 1]) B.box('tex', sx * 7.85, 1.1, 9.97, 12.8, 2.2, 0.05, 0xd8c8b0, { tile: 'wood', ts: 1.4, edges: false });
  B.box('prop', 0, 2.2, 9.95, 29, 0.08, 0.06, 0x5a4a3a, { edges: false });
  { const g = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 18); g.rotateX(Math.PI / 2); g.translate(-8, 6.5, -20.3); B.add('prop', g, 0xf0f0ea); B.box('prop', -8, 6.6, -20.24, 0.03, 0.26, 0.02, 0x1a1a1a, { edges: false }); B.box('prop', -7.92, 6.5, -20.24, 0.18, 0.03, 0.02, 0x1a1a1a, { edges: false }); }
  B.box('tex', 0, -0.042, 15.2, 14.4, 0.1, 10.4, 0xc8c0c8, { tile: 'arcade_floor', ts: 1.8, edges: false });
  // 舞台（北・高さ 1.1）・幕・横断幕
  B.box('wall', 0, 0.55, -17.8, 20, 1.1, 5.2, 0x7a5a3a); solid(0, -17.8, 20, 5.2, 1.1);
  B.box('wall', 0, 4.6, -20.2, 20, 7, 0.2, 0x7a2a3a);
  for (const x of [-10.3, 10.3]) wall(x, -17.8, 0.6, 5.2, 9, GW2);
  const ban = atlas.add(signDraw('市民体育館　避難所', { bg: '#f4f0e6', fg: '#1a3a6a', size: 40 }));
  B.box('sign', 0, 6.4, -20.05, 9, 0.9, 0.04, 0xffffff, { uv: ban, face: 4, edges: false });
  // 館内放送のマイク（舞台の前）
  B.box('prop', 5.6, 0.7, -14.6, 0.05, 1.4, 0.05, 0x2a2a30); B.box('prop', 5.6, 1.42, -14.5, 0.08, 0.14, 0.08, 0x1a1a1a);
  B.box('prop', 5.6, 0.45, -14.9, 0.6, 0.9, 0.4, 0x4a4a52); B.box('glow', 5.6, 0.75, -14.69, 0.1, 0.06, 0.02, 0xff5040, { edges: false });
  solid(5.6, -14.8, 0.7, 0.6, 1.2);
  halos.push({ p: [5.6, 0.8, -14.6], size: 0.5, color: 0xff5040, k: 0.6, mic: true });
  spots.push({ id: 'pa_mic', kind: 'mic', x: 5.6, z: -13.8, r: 1.3, label: '館内放送のマイク' });
  // 体育の道具：バスケットのゴール
  for (const x of [-13.6, 13.6]) { B.box('prop', x, 3.4, 4.5, 0.2, 6.8, 0.2, 0x6a6a72); B.box('prop', x - Math.sign(x) * 0.6, 3.6, 4.5, 0.06, 1.0, 1.6, 0xf0f0f0); }
  // 器具庫（東：x 14.4〜19.6、z −9〜0.8）
  wall(19.8, -4.1, 0.4, 10.2, 5, 0x9a9488); wall(17.1, -9.2, 5.6, 0.4, 5, 0x9a9488); wall(17.1, 1.0, 5.6, 0.4, 5, 0x9a9488);
  B.box('wall', 17.1, 5.1, -4.1, 5.8, 0.2, 10.6, 0x6a645a);
  wall(14.4, -7.6, 0.4, 2.8, 9, GW); wall(14.4, -0.6, 0.4, 2.8, 9, GW);           // 開口：z −6.2〜−2.0
  B.box('wall', 14.4, 6.0, -4.1, 0.4, 6.0, 4.2, GW);
  for (const [x, z, w, h, d, c] of [[18.8, -7.5, 1.4, 0.5, 2.0, 0x3a6ab0], [18.8, -7.5, 1.4, 0.5, 2.0, 0x3a6ab0], [18.9, -1.2, 1.2, 1.1, 1.6, 0xb08a5a], [16.0, 0.0, 1.2, 0.8, 0.8, 0x8a8a8a]]) { B.box('prop', x, h / 2, z, w, h, d, c); solid(x, z, w, d, h); }
  B.box('prop', 18.8, 0.75, -7.5, 1.4, 0.5, 2.0, 0x2a5aa0);
  const shut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 4.2), new THREE.MeshToonMaterial({ color: 0x9aa0a8, gradientMap: gradientMap() }));
  shut.position.set(14.45, 6.1, -4.1); shut.castShadow = true; root.add(shut);
  dyn.storageShutter = { mesh: shut, up: 6.1, down: 2.1, target: 6.1 };
  spots.push({ id: 'storage_shutter', kind: 'shutter', x: 13.4, z: -1.1, r: 1.6, label: '器具庫のシャッターを下ろす' });
  const st = atlas.add(signDraw('器具庫', { bg: '#e8e4d8', fg: '#2a2a2a', size: 36 }));
  B.box('sign', 14.17, 4.6, -4.1, 0.03, 0.3, 1.0, 0xffffff, { uv: st, face: 1, edges: false });
  // 簡易ベッド（36 床：左 18・右 14・入口側 4）＝インスタンス網 3 つ（枠・毛布・荷物）
  const cots = [];
  const rows = [7.5, 5.3, 3.1, 0.9, -1.3, -3.5, -5.7, -7.9, -10.1];
  for (const z of rows) for (const x of [-12.4, -9.9]) cots.push({ x, z });
  for (const z of rows) if (z > -2.5 || z < -6.5) for (const x of [9.9, 12.4]) cots.push({ x, z });
  for (const x of [-5.6, -3.3, 3.3, 5.6]) cots.push({ x, z: 8.4, ry: Math.PI / 2 });
  const rnd = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const frame = [[0, 0.36, 0, 1.9, 0.06, 0.74, 0x6a7a5a], [0.9, 0.18, 0.33, 0.04, 0.36, 0.04, 0x8a8a92], [-0.9, 0.18, 0.33, 0.04, 0.36, 0.04, 0x8a8a92], [0.9, 0.18, -0.33, 0.04, 0.36, 0.04, 0x8a8a92], [-0.9, 0.18, -0.33, 0.04, 0.36, 0.04, 0x8a8a92], [-0.78, 0.45, 0, 0.3, 0.1, 0.5, 0xf0f0ea]];
  const blanket = [[0.25, 0.43, 0, 1.25, 0.08, 0.76, 0xffffff]];
  const bag = [[0.95, 0.12, 0.55, 0.36, 0.24, 0.24, 0xffffff]];
  const bcol = [0x8a9ab8, 0xc8b070, 0xb07070, 0x7a9a7a, 0x9a8ab8, 0xc0c0c8];
  root.add(instanced(frame, cots, { name: 'cot_frames' }));
  root.add(instanced(blanket, cots.map(c => Object.assign({ color: bcol[Math.floor(rnd() * bcol.length)] }, c)), { name: 'cot_blankets' }));
  root.add(instanced(bag, cots.filter(() => rnd() < 0.7).map(c => Object.assign({ color: [0x3a3a4a, 0x6a4a3a, 0x2a4a6a][Math.floor(rnd() * 3)] }, c)), { name: 'cot_bags' }));
  for (const c of cots) { const along = c.ry ? 0.74 : 1.9, across = c.ry ? 1.9 : 0.74; solid(c.x, c.z, along, across, 0.5); }
  // 仕切り板（段ボール・1.3m）
  for (const x of [-8.3, 8.3]) for (const [z0, z1] of [[-11.2, -2.4], [-0.4, 8.0]]) { if (x > 0 && z0 < -2) { wall(x, -9.0, 0.08, 4.4, 1.3, 0xc8a878); continue; } wall(x, (z0 + z1) / 2, 0.08, z1 - z0, 1.3, 0xc8a878); }
  hideSpots.push({ x: -8.9, z: -6.5 }, { x: -8.9, z: 3.8 }, { x: 8.9, z: 4.5 }, { x: 8.9, z: -9.5 }, { x: -11.0, z: -14.0 }, { x: -2, z: 14.5 });
  // 調べる：簡易ベッドの名札（任意）・名札の切れ端（救う手掛かり）
  spots.push({ id: 'cot_a', kind: 'read', x: -11.2, z: 4.2, r: 1.0, label: '簡易ベッドの名札', text: 'cot_a' });
  spots.push({ id: 'cot_b', kind: 'read', x: 11.2, z: -9.0, r: 1.0, label: '簡易ベッドの名札', text: 'cot_b' });
  spots.push({ id: 'cot_c', kind: 'read', x: -4.4, z: 7.4, r: 1.0, label: '荷物の上の写真', text: 'cot_c' });
  B.box('prop', 3.0, 0.01, -11.6, 0.09, 0.01, 0.06, 0xf4f2ea, { edges: false });
  spots.push({ id: 'torn_tag', kind: 'clue', clue: 'torn_tag', x: 3.0, z: -11.2, r: 1.1, label: '床の紙切れ' });
  // ロビー（x −7〜7、z 10.4〜20）：受付・名簿・靴箱
  wall(-7.2, 15.2, 0.4, 10.4, 4, 0xd8d0c0); wall(7.2, 15.2, 0.4, 10.4, 4, 0xd8d0c0);
  wall(-4.6, 20.4, 5.2, 0.4, 4, 0xd8d0c0); wall(4.6, 20.4, 5.2, 0.4, 4, 0xd8d0c0);
  B.box('wall', 0, 4.1, 15.2, 14.8, 0.2, 10.6, 0xe8e0d0);
  B.box('prop', 0.4, 0.5, 12.6, 3.2, 1.0, 0.7, 0x8a6a4a); solid(0.4, 12.6, 3.2, 0.7, 1.0);       // 受付の机
  B.box('prop', -0.4, 1.12, 12.6, 0.5, 0.24, 0.35, 0xc8b890);                                    // 受付票の箱
  spots.push({ id: 'cards', kind: 'clue', clue: 'cards', x: -0.4, z: 13.6, r: 1.1, label: '受付票の箱' });
  spots.push({ id: 'drawer', kind: 'drawer', x: 1.4, z: 13.6, r: 1.0, label: '職員の机の引き出し' });
  B.box('prop', -6.95, 1.7, 15.4, 0.1, 1.6, 2.6, 0xf2eee0); B.box('prop', -6.9, 2.55, 15.4, 0.06, 0.1, 2.7, 0x3a6a3a);
  spots.push({ id: 'roster', kind: 'clue', clue: 'roster', x: -6.0, z: 15.4, r: 1.3, label: '避難者名簿（掲示）' });
  const lk = [[0, 0.9, 0, 0.4, 1.8, 1.8, 0x8a8a7a], [0.21, 0.9, 0, 0.02, 1.7, 1.7, 0x5a5a52]];
  root.add(instanced(lk, [{ x: 6.75, z: 13.2 }, { x: 6.75, z: 17.2 }], { name: 'lockers' })); solid(6.75, 15.2, 0.5, 6, 1.8);
  const lb = atlas.add(signDraw('受付　（避難者の方は名前を記入）', { bg: '#f4f0e6', fg: '#203050', size: 26 }));
  B.box('sign', 0.4, 1.6, 12.24, 2.4, 0.3, 0.03, 0xffffff, { uv: lb, face: 4, edges: false });
  // 体育館の戸（鍵）：閉まっている間は当たり判定あり
  const doorMat = new THREE.MeshToonMaterial({ color: 0x6a7a8a, gradientMap: gradientMap() });
  const leafs = [-0.7, 0.7].map(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.08), doorMat); m.position.set(x, 1.3, 10.2); m.castShadow = true; root.add(m); return m; });
  const doorBox = cbox(0, 10.2, 2.8, 0.4, 3); boxes.push(doorBox);
  dyn.gymDoor = { leafs, box: doorBox, open: false };
  spots.push({ id: 'gym_door', kind: 'gymdoor', x: 0, z: 11.0, r: 1.3, label: '体育館の戸' });
  spots.push({ id: 'exit_plaza', kind: 'exit', to: 'plaza', spawn: 'from_shelter', x: 0, z: 19.9, r: 1.3, label: '外へ（商業施設の前）', auto: true });
  spots.push({ id: 'exit_office', kind: 'exit', to: 'office', spawn: 'entrance', x: 2.6, z: 18.9, r: 1.0, label: '観測分室へ（迎えの車・第4章）', needFlag: 'ch4_started', lockedText: 'office_wait' });
  // 第3章【仮】：ロビー西の連絡通路（病院へ）・ロビー東の階段（地下通路から上がってくる）
  B.box('wall', -7.0, 1.2, 18.4, 0.06, 2.4, 1.3, 0x5a6a7a, { edges: false });
  const hc = atlas.add(signDraw('連絡通路 →　病院', { bg: '#2a5a7a', fg: '#ffffff', size: 30 }));
  B.box('sign', -6.95, 2.7, 18.4, 0.03, 0.3, 1.5, 0xffffff, { uv: hc, face: 0, edges: false });
  halos.push({ p: [-6.8, 2.7, 18.4], size: 1.0, color: 0x80c0ff, k: 0.35 });
  spots.push({ id: 'exit_hospital', kind: 'exit', to: 'hospital', spawn: 'from_shelter', x: -6.6, z: 18.4, r: 0.9, label: '連絡通路（病院へ）', auto: true, needFlag: 'ch3_started', lockedText: 'hosp_wait' });
  B.box('wall', 6.95, 1.2, 18.6, 0.06, 2.4, 1.2, 0x4a4a52, { edges: false });
  const ug = atlas.add(signDraw('地下通路（病院）', { bg: '#2a3a2a', fg: '#e8ffe8', size: 30 }));
  B.box('sign', 6.95, 2.7, 18.6, 0.03, 0.3, 1.4, 0xffffff, { uv: ug, face: 1, edges: false });
  spots.push({ id: 'exit_tunnel', kind: 'exit', to: 'tunnel', spawn: 'from_shelter', x: 6.6, z: 18.6, r: 0.9, label: '地下通路へ', auto: true, needFlag: 'tunnel_clear', lockedText: 'tunnel_from_shelter' });
  // 明かり：天井 4（第 2 段で消える）・非常灯 2・ロビー 1
  const lights = [
    { id: 'ceil1', pos: [-6, 8.2, -8], color: 0xe8f0ff, intensity: 16, dist: 18, gym: true },
    { id: 'ceil2', pos: [6, 8.2, -8], color: 0xe8f0ff, intensity: 16, dist: 18, gym: true, flicker: true },
    { id: 'ceil3', pos: [-6, 8.2, 3], color: 0xe8f0ff, intensity: 14, dist: 18, gym: true },
    { id: 'ceil4', pos: [6, 8.2, 3], color: 0xe8f0ff, intensity: 14, dist: 18, gym: true },
    { id: 'emg1', pos: [0, 3.0, 9.7], color: 0xff4030, intensity: 0, dist: 12, emergency: true },
    { id: 'emg2', pos: [13.8, 3.0, -4.1], color: 0xff4030, intensity: 0, dist: 10, emergency: true },
    { id: 'lobby', pos: [0, 3.6, 15.5], color: 0xffe0b0, intensity: 7, dist: 11 },
  ].map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) { if (l.gym) { B.box('glow', l.pos[0], 8.9, l.pos[2], 3.0, 0.1, 0.5, 0xf0f4ff, { edges: false }); halos.push({ p: [l.pos[0], 8.7, l.pos[2]], size: 3.2, color: l.color, k: 0.6, light: l }); } if (l.emergency) { B.box('glow', l.pos[0], l.pos[1] + 0.1, l.pos[2], 0.5, 0.18, 0.06, 0x30ff60, { edges: false }); halos.push({ p: [l.pos[0], l.pos[1] + 0.1, l.pos[2] - 0.15], size: 1.0, color: 0x30ff60, k: 0.6 }); } }
  const wet = [{ p: [-6, 0, -8], size: 3.0, color: 0xe8f0ff, k: 0.22, light: 'ceil1' }, { p: [6, 0, -8], size: 3.0, color: 0xe8f0ff, k: 0.22, light: 'ceil2' }, { p: [-6, 0, 3], size: 3.0, color: 0xe8f0ff, k: 0.22, light: 'ceil3' }, { p: [6, 0, 3], size: 3.0, color: 0xe8f0ff, k: 0.22, light: 'ceil4' }];
  return finish('shelter', B, atlas, root, {
    boxes, spots, dyn, lights, halos, wet, hideSpots, surface: (x, z) => (z > 10.2 ? 'tile' : 'gym'), rainRoof: () => true, indoor: (x, z) => z > 10.3,
    bounds: { minX: -14.3, maxX: 19.7, minZ: -20.5, maxZ: 20.3 }, spawns: { from_plaza: [0, 17.8, Math.PI], gym_in: [0, 8.8, Math.PI], boss_view: [0, 6.5, Math.PI], from_hospital: [-5.4, 18.4, Math.PI / 2], from_tunnel: [5.4, 18.6, -Math.PI / 2] },
    fog: { color: 0x0c0a14, density: 0.035 }, rain: false, amb: 'gym',
  });
}
function gymTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b08a5a'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#a88250' : '#b89262'; g.fillRect(x, 0, 31, h); g.fillStyle = 'rgba(60,30,10,.25)'; for (let y = Math.random() * 120; y < h; y += 100 + Math.random() * 80) g.fillRect(x, y, 31, 2); }
    g.strokeStyle = 'rgba(240,240,230,.75)'; g.lineWidth = 5; g.strokeRect(30, 30, w - 60, h - 60); g.beginPath(); g.arc(w / 2, h / 2, 70, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(30, h / 2); g.lineTo(w - 30, h / 2); g.stroke();
    g.strokeStyle = 'rgba(220,80,60,.6)'; g.strokeRect(60, 60, w - 120, h - 120);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); return t;
}

/** 区画を作る（作った物は使い回す） */
export const BUILDERS = { shotengai: () => buildLevel(null), alley: buildAlley, plaza: buildPlaza, shelter: buildShelter, hospital: (...a) => BUILDERS3.hospital(...a), tunnel: (...a) => BUILDERS3.tunnel(...a),
  office: (...a) => BUILDERS3.office(...a), lab: (...a) => BUILDERS3.lab(...a), yard: (...a) => BUILDERS3.yard(...a),
  oldwing: (...a) => BUILDERS3.oldwing(...a), atrium: (...a) => BUILDERS3.atrium(...a), town: (...a) => BUILDERS3.town(...a),
  ruins: (...a) => BUILDERS3.ruins(...a), avenue: (...a) => BUILDERS3.avenue(...a), admin: (...a) => BUILDERS3.admin(...a),
  abyss: (...a) => BUILDERS3.abyss(...a), kiroku: (...a) => BUILDERS3.kiroku(...a), epilogue: (...a) => BUILDERS3.epilogue(...a) };
/** 第3章の区画（world/areas3.js が登録する：循環 import を避ける） */
export const BUILDERS3 = {};
