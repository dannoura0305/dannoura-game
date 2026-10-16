// 町の組み立て（フェーズ9）：data/town.js の配置から、道・歩道・縁石・側溝・白線・止まれ・横断歩道・信号・電柱と電線・街灯・
// 家（外壁・窓・瓦・ひさし・ベランダ・室外機・塀・表札）・店・コンビニ・駐車場・公園・祠・用水路・車・自転車・自販機などを作る。
// 形は level.js の Builder（材質ごとにまとめる・区画を升目に分けて見えない升目は描かない）へ入れる。当たり判定は data/town.js の townSolids。
import * as THREE from 'three';
import { TOWN, townSolids, houseFoot, guardSpans, townLamps, homeW, houseDoor, lotEntrances, fillCells, fillEntrances, seeded } from '../data/town.js';
import { applyTile } from '../render/townmat.js';
import { makeTown2, isFar } from './town2.js';

// 決まった乱数（区画の id から）：data/town.js の seeded（出入り口の位置と同じ乱数）

/**
 * ctx = { B (Builder), atlas (看板の地図帳), signDraw, scene, state, part }
 * part：'near'（アーケード・住宅地・駅前通り・ガラスの屋根の広場・横丁）／'far'（中央通り・駅前：起動の後で組み立てる）／'all'
 * 戻り値：{ boxes, lights, halos, wet, spots, hideSpots, wires (LineSegments), pools (Mesh), signals }。当たり判定（boxes）は part に関係なく全部
 */
export function buildTown(ctx) {
  const { B, atlas, signDraw } = ctx, part = ctx.part || 'all';
  const inPart = (x, z) => part === 'all' || (part === 'far') === isFar(x, z);
  const inRect = r => inPart((r[0] + r[2]) / 2, (r[1] + r[3]) / 2);
  const T = TOWN, boxes = part === 'far' ? [] : townSolids(T), lights = [], halos = [], wet = [], spots = [], hideSpots = [];
  const wirePts = [];
  const tb = (key, cx, cy, cz, w, h, d, color, tile, opt = {}) => B.box(key, cx, cy, cz, w, h, d, color, Object.assign({ tile, edges: false }, opt));
  const prop = (cx, cy, cz, w, h, d, color, opt = {}) => B.box('prop', cx, cy, cz, w, h, d, color, Object.assign({ edges: false }, opt));
  const addTile = (key, geo, tile, color = 0xffffff, opt = {}) => { applyTile(geo, tile, opt); return B.add(key, geo, color, opt.ao || false); };
  const signUV = (text, opt) => atlas.addKey ? atlas.addKey(text + '|' + JSON.stringify(opt || {}), signDraw(text, opt)) : atlas.add(signDraw(text, opt));
  const poolGeos = [];
  const pool = (x, z, r, color, k = 1) => { const g = new THREE.PlaneGeometry(r * 2, r * 2); g.rotateX(-Math.PI / 2); g.translate(x, 0.035, z); const c = new THREE.Color(color).multiplyScalar(k); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); poolGeos.push(g); };

  // フェーズ10 の部品（中央通り・駅前・広場・町家・ビル）：同じ道具を渡す
  const X = makeTown2({ B, T, tb, prop, addTile, signUV, pool, halos, lights, wet, spots, hideSpots, frame, win, roofGable, tree, lampAt, car, bike, catenaryPts, wirePts, inPart, inRect, seeded, fenceFront, signDraw, atlas, doorFrame, glassDoor });
  // ── 地面：下敷き（用水路の底より下）・歩ける所・区画の庭 ──
  if (part !== 'far') { const b = T.bounds; tb('tex', (b.minX + b.maxX) / 2, -1.3, (b.minZ + 66) / 2 + 30, b.maxX - b.minX + 40, 0.2, 66 - b.minZ + 80, 0x2a2826, 'gravel', { ts: 4 }); }
  const SURF_TS = { asphalt: 6, asphalt2: 6, lane: 5, interlock: 1.6, paving: 2.2, gravel: 3, concrete: 3, granite: 4, arcade_floor: 2.6 };
  for (const w of T.walk) {
    const [x0, z0, x1, z1] = w.rect;
    if (w.id === 'park' || !inRect(w.rect)) continue;                   // 公園は下で（砂利と芝）
    tb('tex', (x0 + x1) / 2, -0.06, (z0 + z1) / 2, x1 - x0, 0.12, z1 - z0, w.kind === 'sidewalk' ? 0xb0a8a8 : w.kind === 'forecourt' ? 0xc0b8b4 : 0xffffff, w.surf, { ts: SURF_TS[w.surf] || 3 });
  }
  // 区画の地面（家の庭・店の前）
  for (const L of T.lots) {
    if (['fill', 'barrier', 'home', 'barrier2', 'station', 'fillB', 'tower', 'dept', 'machiya'].includes(L.kind) || !inRect(L.rect)) continue;
    const [x0, z0, x1, z1] = L.rect, r = seeded(L.id);
    const surf = L.kind === 'field' ? 'field' : L.kind === 'house' ? (r() < 0.5 ? 'gravel' : 'grass') : L.kind === 'parking' ? 'asphalt2' : 'concrete';
    tb('tex', (x0 + x1) / 2, -0.07, (z0 + z1) / 2, x1 - x0, 0.12, z1 - z0, L.kind === 'house' ? 0xc8c8c0 : 0xffffff, surf, { ts: surf === 'field' ? 4 : 3 });
  }
  if (part !== 'far') nearStreet();
  function nearStreet() {
  // 歩道の縁石（車道との境）・駅前通りの白線・中央線
  const curbGaps = [[8.2, 12.8], [-2.6, 2.6]];
  const spanX = (a, b, gaps, fn) => { let x = a; for (const [p, q] of gaps.slice().sort((m, n) => m[0] - n[0])) { if (p > x) fn(x, p); x = Math.max(x, q); } if (x < b) fn(x, b); };
  for (const z of [4.5, 11.5]) spanX(-44, 66, z === 4.5 ? curbGaps : curbGaps.concat([[13, 32.2]]), (a, b) => tb('tex', (a + b) / 2, 0.08, z, b - a, 0.18, 0.22, 0xd0ccc4, 'curb', { ts: 2 }));
  spanX(-44, 64, [[8.2, 12.8], [-2.6, 2.6]], (a, b) => { for (let x = a + 1; x < b - 1.5; x += 6) prop(x + 1.5, 0.012, 7.25, 3.0, 0.02, 0.14, 0xe8e6de); });   // 中央の破線（消雪の水の出口の列の横）
  for (const z of [4.95, 11.05]) spanX(-44, 64, [[8.2, 12.8]], (a, b) => prop((a + b) / 2, 0.012, z, b - a, 0.02, 0.12, 0xe8e6de));               // 外側線
  // 生活道路：両端の側溝（グレーチングのふた）・外側線
  const laneEdge = (x0, z0, x1, z1, alongX) => {
    if (alongX) { for (const z of [z0 + 0.25, z1 - 0.25]) tb('tex', (x0 + x1) / 2, 0.006, z, x1 - x0, 0.02, 0.45, 0xb0b0ac, 'drain', { ts: 0.9 }); for (const z of [z0 + 0.75, z1 - 0.75]) prop((x0 + x1) / 2, 0.012, z, x1 - x0, 0.02, 0.1, 0xd8d6ce); }
    else { for (const x of [x0 + 0.25, x1 - 0.25]) tb('tex', x, 0.006, (z0 + z1) / 2, 0.45, 0.02, z1 - z0, 0xb0b0ac, 'drain', { ts: 0.9 }); for (const x of [x0 + 0.75, x1 - 0.75]) prop(x, 0.012, (z0 + z1) / 2, 0.1, 0.02, z1 - z0, 0xd8d6ce); }
  };
  laneEdge(8, 15, 13, 37.8, false); laneEdge(1, 38, 65.5, 43, true);
  // 横断歩道・停止線（中央通りの横断歩道は town2）
  for (const c of T.crossings) { if (c.along === 'x' || c.id === 'x_aveW') continue; for (let z = c.z0 + 0.5; z < c.z1 - 0.3; z += 0.9) prop((c.x0 + c.x1) / 2, 0.014, z + 0.22, c.x1 - c.x0, 0.02, 0.45, 0xeceae2); }
  for (const [x, z] of [[7.1, 6.25], [13.9, 9.75]]) prop(x, 0.014, z, 0.35, 0.02, 3.4, 0xeceae2);                                 // 車道の停止線
  // 道の上の印（止まれ・停止線・マンホール・水たまり・落ち葉）
  for (const m of T.marks) {
    if (!inPart(m.x, m.z)) continue;
    if (m.kind === 'tomare') { const g = new THREE.PlaneGeometry(2.6, 3.2); g.rotateX(-Math.PI / 2); g.rotateY(m.ry || 0); g.translate(m.x, 0.02, m.z); addTile('tex', g, 'tomare', 0xffffff, { fit: true }); }
    if (m.kind === 'stopline') prop(m.x, 0.014, m.z, m.w, 0.02, 0.35, 0xeceae2, { ry: m.ry || 0 });
    if (m.kind === 'manhole') { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 18); g.translate(m.x, 0.012, m.z); addTile('tex', g, 'manhole', 0xc8c8c8, { fit: true }); }
    if (m.kind === 'puddle' || m.kind === 'leaves') { const g = new THREE.PlaneGeometry(m.s, m.s * (m.kind === 'puddle' ? 0.7 : 1)); g.rotateX(-Math.PI / 2); g.rotateY((m.x * 7 + m.z) % 3); g.translate(m.x, 0.016, m.z); addTile('tex', g, m.kind, 0xffffff, { fit: true }); }
  }
  // ガードレール（白い板と支柱）
  for (const [a, b] of guardSpans(T)) {
    tb('tex', (a + b) / 2, 0.7, 11.5, b - a, 0.32, 0.06, 0xe8eae8, 'concrete', { ts: 4 });
    for (let x = a + 0.2; x < b; x += 2) prop(x, 0.4, 11.55, 0.08, 0.8, 0.08, 0xd8dad8);
  }

  // ── 用水路：内側のコンクリート壁・水面・手すり・橋 ──
  { const C = T.channel, cx = (C.x0 + C.x1) / 2, len = C.z1 - C.z0, zc = (C.z0 + C.z1) / 2;
    for (const x of [C.x0 + 0.1, C.x1 - 0.1]) tb('tex', x, -0.45, zc, 0.2, 0.9, len, 0x9a9890, 'concrete', { ts: 2 });
    tb('tex', cx, -1.0, zc, C.x1 - C.x0, 0.1, len, 0x6a6a64, 'concrete', { ts: 2 });
    const wg = new THREE.PlaneGeometry(C.x1 - C.x0 - 0.4, len); wg.rotateX(-Math.PI / 2); wg.translate(cx, -0.6, zc); addTile('tex', wg, 'water', 0xa0b8d0, { ts: 1.6 });
    // 暗渠（道の下）：ふたの段
    for (const [a, b] of C.gaps) tb('tex', cx, -0.03, (a + b) / 2, C.x1 - C.x0 + 0.1, 0.1, b - a, 0xb8b4ac, a > 30 ? 'lane' : 'concrete', { ts: 3 });
    let z = C.z0;
    for (const [a, b] of C.gaps.concat([[C.z1, C.z1]])) {
      if (a > z) for (const x of [C.x0 + 0.05, C.x1 - 0.05]) { prop(x, 0.95, (z + a) / 2, 0.06, 0.06, a - z, 0x8a9aa0); prop(x, 0.55, (z + a) / 2, 0.05, 0.05, a - z, 0x8a9aa0); for (let p = z + 0.1; p < a; p += 2) prop(x, 0.5, p, 0.07, 1.0, 0.07, 0x7a8a90); }
      z = b;
    }
    // 公園への橋の手すり
    for (const zz of [22.05, 24.45]) prop(cx, 0.6, zz, C.x1 - C.x0, 0.06, 0.06, 0xc8b070);
  }
  }

  // ── 区画（家・店・ビル・コンビニ・駐車場・奥の家並み） ──
  for (const L of T.lots) {
    if (!inRect(L.rect)) continue;
    if (L.kind === 'house') house(L);
    else if (L.kind === 'shop' || L.kind === 'bldg') shop(L);
    else if (L.kind === 'apartment') apartment(L);
    else if (L.kind === 'konbini') konbini(L);
    else if (L.kind === 'parking') parking(L);
    else if (L.kind === 'fill') backHouses(L);
    else if (L.kind === 'field') field(L);
    else if (L.kind === 'barrier') barrier(L);
    else X.lot(L);
  }
  if (part !== 'far') { homeExterior(); park(); shrine(); }
  // ── 電柱・電線・街灯 ──
  for (const pl of T.poleLines) {
    pl.pts.forEach(([x, z], i) => { if (inPart(x, z)) pole(x, z, pl, i); });
    for (let i = 0; i < pl.pts.length - 1; i++) { const [ax, az] = pl.pts[i], [bx, bz] = pl.pts[i + 1]; if (!inPart((ax + bx) / 2, (az + bz) / 2)) continue; for (const [h, o] of [[8.4, -0.5], [8.4, 0.5], [7.6, 0]]) catenary(wirePts, ax, az, bx, bz, h, o); }
  }
  // 電線を家へ（引き込み線）：家の 2 階の角へ近い電柱から
  for (const L of T.lots) if (L.kind === 'house' && inRect(L.rect)) { const f = houseFoot(L), cx = (f[0] + f[2]) / 2, cz = (f[1] + f[3]) / 2; let best = null, bd = 1e9; for (const pl of T.poleLines) for (const p of pl.pts) { const d = Math.hypot(p[0] - cx, p[1] - cz); if (d < bd) { bd = d; best = p; } } if (best && bd < 22) { const hx = Math.max(f[0], Math.min(f[2], best[0])), hz = Math.max(f[1], Math.min(f[3], best[1])); catenaryPts(wirePts, [best[0], 7.0, best[1]], [hx, 5.4, hz], 0.35); } }
  for (const lamp of townLamps(T)) if (inPart(lamp.x, lamp.z)) lampAt(lamp);
  // ── 信号（用水路沿いの道の正面）：車の信号 2 つ・歩行者の信号 2 つ ──
  const signals = [];
  if (part !== 'far') { const X = T.crossings.find(c => c.id === 'x_main');
    const car = (x, z, ry, idx) => { prop(x, 2.9, z, 0.18, 5.8, 0.18, 0x6a6e70); const ax = Math.sin(ry), az = Math.cos(ry); prop(x + ax * 1.6, 5.6, z + az * 1.6, Math.abs(ax) > 0.5 ? 3.2 : 0.12, 0.12, Math.abs(ax) > 0.5 ? 0.12 : 3.2, 0x6a6e70);
      const hx = x + ax * 3.0, hz = z + az * 3.0; const along = Math.abs(ax) > 0.5; prop(hx, 5.35, hz, along ? 1.3 : 0.32, 0.42, along ? 0.32 : 1.3, 0x3a3c40);
      const heads = []; [-0.42, 0, 0.42].forEach((o, k) => { const px = hx + (along ? o : 0), pz = hz + (along ? 0 : o); const f = along ? [0, 0.17] : [0.17, 0]; const s = idx === 0 ? 1 : -1; B.box('glow', px + f[0] * s, 5.35, pz + f[1] * s, along ? 0.24 : 0.04, 0.24, along ? 0.04 : 0.24, [0x1a3a2a, 0x3a3010, 0x3a1010][k], { edges: false }); heads.push(halos.push({ p: [px + f[0] * s * 2, 5.35, pz + f[1] * s * 2], size: 1.1, color: [0x40ffb0, 0xffc030, 0xff3030][k], k: 0, signal: true }) - 1); });
      return heads; };
    const ped = (x, z) => { prop(x, 1.5, z, 0.12, 3.0, 0.12, 0x6a6e70); prop(x, 2.55, z, 0.42, 0.85, 0.3, 0x2a2c30); B.box('glow', x, 2.75, z - 0.16, 0.3, 0.3, 0.02, 0x3a1010, { edges: false }); B.box('glow', x, 2.35, z - 0.16, 0.3, 0.3, 0.02, 0x10301a, { edges: false }); B.box('glow', x, 2.75, z + 0.16, 0.3, 0.3, 0.02, 0x3a1010, { edges: false }); B.box('glow', x, 2.35, z + 0.16, 0.3, 0.3, 0.02, 0x10301a, { edges: false });
      return [halos.push({ p: [x, 2.75, z], size: 0.8, color: 0xff3030, k: 0, signal: true }) - 1, halos.push({ p: [x, 2.35, z], size: 0.8, color: 0x40ff90, k: 0, signal: true }) - 1]; };
    signals.push({ kind: 'car', heads: car(X.x1 + 1.0, 12.6, Math.PI, 0) }, { kind: 'car', heads: car(X.x0 - 1.0, 3.2, 0, 1) });
    signals.push({ kind: 'ped', heads: ped(X.x0 - 0.4, 12.2) }, { kind: 'ped', heads: ped(X.x1 + 0.4, 3.6) });
    // 押しボタン箱
    prop(X.x0 - 0.4, 1.1, 12.05, 0.18, 0.28, 0.1, 0xe8d040);
  }
  // ── 小物 ──
  for (const p of T.props) if (inPart(p.x, p.z)) propAt(p);
  // 隠れ場所（相棒）：電柱の陰・自販機の横・塀の角
  if (part !== 'far') for (const [x, z] of [[13.8, 26.5], [24.2, 38.8], [8.3, 31], [-1.2, 3.6], [18.3, 19.7], [36.6, 42.2]]) hideSpots.push({ x, z });
  // ── フェーズ10：中央通り・駅前・ガラスの屋根の広場・横丁 ──
  X.build(signals);

  // ── 光のたまり（街灯の下の地面：足し合わせの円・描画 1 回） ──
  let pools = null;
  if (poolGeos.length) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d', { willReadFrequently: true }); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const merged = mergeLite(poolGeos);
    pools = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    pools.name = 'town_pools'; pools.renderOrder = 2;
  }
  // ── 電線（線 1 本＝描画 1 回） ──
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3)); wg.computeBoundingSphere();
  const wires = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x0a0810, transparent: true, opacity: 0.85, fog: true })); wires.name = 'town_wires';

  return { boxes, lights, halos, wet, spots, hideSpots, wires, pools, signals };

  // ───────────── 区画ごとの形 ─────────────
  /** 区画の枠：u＝表に沿って、v＝表から奥へ */
  function frame(L) {
    const [x0, z0, x1, z1] = L.rect, f = L.face || 'N';
    const W = f === 'N' || f === 'S' ? x1 - x0 : z1 - z0, D = f === 'N' || f === 'S' ? z1 - z0 : x1 - x0;
    const at = (u, v) => f === 'N' ? [x0 + u, z0 + v] : f === 'S' ? [x0 + u, z1 - v] : f === 'E' ? [x1 - v, z0 + u] : [x0 + v, z0 + u];
    const out = f === 'N' ? [0, -1] : f === 'S' ? [0, 1] : f === 'E' ? [1, 0] : [-1, 0];
    const alongX = f === 'N' || f === 'S';
    const box = (key, u, v, y, a, b, h, color, tile, opt = {}) => { const [x, z] = at(u, v); return B.box(key, x, y, z, alongX ? a : b, h, alongX ? b : a, color, Object.assign({ tile, edges: false }, opt)); };
    const ry = f === 'N' ? Math.PI : f === 'S' ? 0 : f === 'E' ? Math.PI / 2 : -Math.PI / 2;     // 表の向き（+z を 0）
    return { W, D, at, out, alongX, box, ry, f };
  }
  /** 窓（表の面に薄い箱）。kind：dark|lit|curtain|shoji|lit2|office|office_lit */
  function win(F, u, v, y, w, h, kind) {
    const tile = { dark: 'win_dark', lit: 'win_lit', curtain: 'win_curtain', shoji: 'win_shoji', lit2: 'win_lit2', office: 'win_office', office_lit: 'win_office_lit' }[kind];
    const glow = ['lit', 'curtain', 'shoji', 'lit2', 'office_lit'].includes(kind);
    F.box(glow ? 'texglow' : 'tex', u, v - 0.04, y, w, 0.06, h, glow ? 0xd0c8b8 : 0xffffff, tile, { fit: true });
    F.box('prop', u, v - 0.02, y, w + 0.12, 0.04, h + 0.12, 0x5e6268);                         // フェーズ11：窓の枠（アルミ・壁から少し出る）
    F.box('prop', u, v - 0.1, y - h / 2 - 0.05, w + 0.16, 0.14, 0.06, 0xb8bcc0);               // 窓台
    if (glow && Math.abs(w) > 0.8) { const [x, z] = F.at(u, v - 0.3); halos.push({ p: [x, y, z], size: w * 1.5, color: kind.startsWith('office') || kind === 'lit2' ? 0xc8d8ff : 0xffc888, k: 0.22, window: true }); }
  }
  function roofGable(F, u0, v0, a, b, y, tile, tint, over = 0.5, wallTile = 'siding', wallTint = 0xd8d0c0) {
    // 棟は u の向き（表に沿う）。2 枚の傾いた板＋棟＋妻の三角
    const th = 0.42, half = b / 2 + over, len = half / Math.cos(th), rise = (b / 2) * Math.tan(th);
    for (const s of [-1, 1]) {
      const vc = v0 + b / 2 + s * (b / 4 + over / 2), yc = y + rise / 2 - (over / 2) * Math.tan(th) + 0.08;
      const [x, z] = F.at(u0 + a / 2, vc);
      const dir = F.alongX ? (F.at(0, 1)[1] - F.at(0, 0)[1]) : (F.at(0, 1)[0] - F.at(0, 0)[0]);     // v が増える時の世界の向き（±1）
      const sw = s * dir;                                                                       // 棟から見たこの板の側（世界の向き）
      if (F.alongX) B.box('tex', x, yc, z, a + over * 2, 0.16, len, tint, { tile, ts: 1.4, rx: -sw * th, edges: true });
      else B.box('tex', x, yc, z, len, 0.16, a + over * 2, tint, { tile, ts: 1.4, rz: -sw * th, edges: true });
    }
    const [rx, rz] = F.at(u0 + a / 2, v0 + b / 2);
    B.box('prop', rx, y + rise + 0.12, rz, F.alongX ? a + over * 2 + 0.1 : 0.32, 0.2, F.alongX ? 0.32 : a + over * 2 + 0.1, 0x1a1c22);
    // 妻の三角（両端）
    for (const e of [0, a]) {
      const tri = new THREE.BufferGeometry();
      const pts = [[0, 0], [b, 0], [b / 2, rise]];
      const P = [], Nn = [], U = [];
      for (const side of [-1, 1]) { const order = side > 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of order) { const [vv, yy] = pts[k]; const [x, z] = F.at(u0 + e + side * 0.0, v0 + vv); P.push(x, y + yy, z); U.push(vv / 2, yy / 2); } const nn = F.alongX ? [side * (e === 0 ? -1 : 1), 0, 0] : [0, 0, side * (e === 0 ? -1 : 1)]; for (let k = 0; k < 3; k++) Nn.push(...nn); }
      tri.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      tri.computeVertexNormals();
      applyTile(tri, wallTile, { ts: 2 }); B.add('tex', tri, wallTint, false);
    }
  }
  /** フェーズ11：戸の枠（表の面 v の前）：左右の縦枠・上枠・下の沓摺り。w・h＝開口 */
  function doorFrame(F, u, v, y0, w, h, color = 0x3a3430, t = 0.09) {
    for (const s of [-1, 1]) F.box('prop', u + s * (w / 2 + t / 2), v - 0.05, y0 + h / 2, t, 0.1, h + t, color);
    F.box('prop', u, v - 0.05, y0 + h + t / 2, w + t * 2, 0.1, t, color);
    F.box('prop', u, v - 0.06, y0 + 0.02, w, 0.12, 0.04, 0x8a8a88);
  }
  /** フェーズ11：ガラスの戸（店・ビル・集合住宅の入口）。n：枚数。lit：中の灯り */
  function glassDoor(F, u, v, w, h, n = 2, lit = false, frameColor = 0x2e3036, litTile = 'win_office_lit') {
    F.box(lit ? 'texglow' : 'tex', u, v - 0.07, h / 2 + 0.02, w, 0.04, h, lit ? 0xb8c0c8 : 0xffffff, lit ? litTile : 'shopglass', { fit: true });
    doorFrame(F, u, v - 0.04, 0, w, h, frameColor, 0.08);
    for (let i = 1; i < n; i++) F.box('prop', u - w / 2 + i * w / n, v - 0.1, h / 2, 0.06, 0.06, h, frameColor);
    for (let i = 0; i < n; i++) F.box('prop', u - w / 2 + (i + 0.5) * w / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.16), v - 0.14, h * 0.48, 0.03, 0.05, 0.5, 0xc8ccd0);   // 取っ手
  }
  /** フェーズ11：家の玄関：ポーチ（高さ 0.3）と段・枠つきの戸・袖のガラス・ひさし（裏に灯り）・門からの敷石 */
  function genkan(F, u, v0, lampOn, tint) {
    const py = 0.3, dw = 0.95, dh = 2.05;
    F.box('tex', u, v0 - 0.55, py / 2, 1.9, 1.1, py, 0xd8d4cc, 'stone', { ts: 0.6 });                      // ポーチ（タイル）
    F.box('tex', u, v0 - 1.28, 0.08, 1.6, 0.36, 0.16, 0xc8c4bc, 'stone', { ts: 0.6 });                     // 段
    F.box('tex', u, Math.max(0.2, (v0 - 1.46) / 2), 0.025, 1.0, Math.max(0.3, v0 - 1.46), 0.05, 0xb8b4ac, 'stone', { ts: 0.8 });   // 門から玄関への敷石
    F.box('tex', u, v0 - 0.08, py + dh / 2, dw, 0.06, dh, 0xffffff, 'door_house', { fit: true });          // 戸
    doorFrame(F, u, v0, py, dw, dh, 0x3a3430);
    F.box(lampOn ? 'texglow' : 'tex', u + dw / 2 + 0.28, v0 - 0.05, py + 1.1, 0.3, 0.04, 1.8, lampOn ? 0xb0a080 : 0xffffff, lampOn ? 'win_shoji' : 'win_dark', { fit: true });   // 袖のガラス
    F.box('prop', u + 0.15, v0 - 0.6, py + dh + 0.32, 1.9, 1.2, 0.12, 0x4a4642);                          // ひさし
    F.box('prop', u + 0.15, v0 - 1.18, py + dh + 0.32, 1.9, 0.04, 0.18, new THREE.Color(tint).multiplyScalar(0.7).getHex());
    const [lx, lz] = F.at(u - dw / 2 - 0.32, v0 - 0.1);
    B.box('glow', lx, 2.05, lz, 0.14, 0.22, 0.14, lampOn ? 0xffd8a0 : 0x3a3428, { edges: false });
    if (lampOn) { halos.push({ p: [lx + F.out[0] * 0.15, 2.05, lz + F.out[1] * 0.15], size: 0.9, color: 0xffd8a0, k: 0.7 }); const [px, pz] = F.at(u, v0 - 1.0); pool(px, pz, 1.8, 0xffd8a0, 0.35); }
  }
  function fenceFront(F, kind, gapU, gapW, h = 1.3) {
    const segs = gapU == null ? [[0, F.W]] : [[0, gapU - gapW / 2], [gapU + gapW / 2, F.W]];
    for (const [a, b] of segs) {
      if (b - a < 0.1) continue;
      if (kind === 'block') { F.box('tex', (a + b) / 2, 0.15, h / 2, b - a, 0.16, h, 0xffffff, 'block', { ts: 1.2, ao: true }); F.box('prop', (a + b) / 2, 0.15, h + 0.04, b - a, 0.2, 0.08, 0x8a8884); }
      else if (kind === 'hedge') { F.box('tex', (a + b) / 2, 0.4, 0.6, b - a, 0.7, 1.2, 0x9ab08a, 'hedge', { ts: 1.4 }); F.box('tex', (a + b) / 2, 0.4, 0.2, b - a, 0.74, 0.4, 0xffffff, 'block', { ts: 1.2 }); }
      else { F.box('tex', (a + b) / 2, 0.12, 0.65, b - a, 0.04, 1.1, 0xffffff, 'fence', { ts: 1.1 }); for (let u = a; u <= b; u += 2) F.box('prop', u, 0.12, 0.6, 0.06, 0.06, 1.2, 0x5a6058); F.box('tex', (a + b) / 2, 0.12, 0.1, b - a, 0.2, 0.2, 0xffffff, 'block', { ts: 1.2 }); }
    }
    if (gapU != null) {   // 門柱（表札・郵便受け）
      for (const s of [-1, 1]) F.box('tex', gapU + s * (gapW / 2 + 0.2), 0.2, 0.75, 0.4, 0.4, 1.5, 0xd8d0c4, 'stone', { ts: 0.8 });
    }
  }
  function house(L) {
    const F = frame(L), r = seeded(L.id), set = 3.2, side = 1.2, back = L.shallow ? 0.8 : 2.4;
    const maxD = Math.min(10, F.D - set - back), a = F.W - side * 2, v0 = set, h1 = 2.9, H = h1 * 2;
    const tint = L.tint || 0xd8d0c0;
    F.box('tex', side + a / 2, v0 + maxD / 2, H / 2, a, maxD, H, tint, L.wall || 'siding', { ts: 2, ao: true, edges: true });
    F.box('prop', side + a / 2, v0 + maxD / 2, h1, a + 0.08, maxD + 0.08, 0.14, 0x8a8478);                // 1 階と 2 階の間の帯
    F.box('prop', side + a / 2, v0 + maxD / 2, 0.12, a + 0.06, maxD + 0.06, 0.24, 0x6a6660);                // 基礎
    roofGable(F, side, v0, a, maxD, H, L.roof || 'kawara', L.roof === 'galv' ? 0xa0b0b8 : 0xc8c8d0, 0.5, L.wall || 'siding', tint);
    // 玄関（data/town.js の houseDoor：門の切れ目と同じ位置）：ポーチ・段・枠つきの戸・ひさし・灯り・門から玄関への敷石
    r(); const doorU = houseDoor(L).u;
    const lampOn = r() < 0.6;
    genkan(F, doorU, v0, lampOn, tint);
    // 窓：1 階（玄関の反対側に大きな窓）・2 階（2 つ）＋ベランダ
    const kinds = ['dark', 'dark', 'curtain', 'lit', 'shoji', 'dark', 'lit2'];
    const pick = () => kinds[Math.floor(r() * kinds.length)];
    const bigU = doorU < side + a / 2 ? side + a - 2.0 : side + 2.0;
    win(F, bigU, v0, 1.35, 2.2, 1.5, pick());
    if (a > 7) win(F, side + a / 2, v0, 1.6, 0.8, 0.8, 'dark');
    const w2 = [side + a * 0.28, side + a * 0.72];
    for (const u of w2) win(F, u, v0, h1 + 1.45, 1.5, 1.2, pick());
    if (r() < 0.65) {   // ベランダ（2 階）
      const bu = w2[r() < 0.5 ? 0 : 1];
      F.box('prop', bu, v0 - 0.5, h1 + 0.12, 2.6, 1.0, 0.12, 0x8a8a88);
      F.box('tex', bu, v0 - 0.98, h1 + 0.6, 2.6, 0.04, 0.9, 0xffffff, 'balcony', { fit: true });
      F.box('prop', bu, v0 - 0.7, h1 + 1.85, 2.2, 0.03, 0.03, 0xb0b4b8);   // 物干し竿
    }
    // 室外機・雨どい・電気メーター
    F.box('tex', side + (doorU < side + a / 2 ? a - 0.6 : 0.6), v0 - 0.35, 0.32, 0.8, 0.3, 0.6, 0xffffff, 'acunit', { fit: true });
    for (const u of [side + 0.1, side + a - 0.1]) F.box('prop', u, v0 - 0.08, H / 2, 0.08, 0.08, H, 0x5a5a58);
    F.box('prop', side + 0.05, v0 + 0.8, 1.4, 0.04, 0.3, 0.4, 0xd8d8d0);
    // 塀・門（表札）
    const gw = houseDoor(L).gate; fenceFront(F, L.fenceKind || 'block', doorU, gw);
    const puv = signUV(L.name, { bg: '#f1e9d6', fg: '#1d1712', size: 46, serif: true });
    { const [px, pz] = F.at(doorU - gw / 2 - 0.2, -0.03); B.box('sign', px, 1.25, pz, F.alongX ? 0.34 : 0.02, 0.1, F.alongX ? 0.02 : 0.34, 0xffffff, { uv: puv, face: F.f === 'N' ? 5 : F.f === 'S' ? 4 : F.f === 'E' ? 0 : 1, edges: false }); }
    F.box('prop', doorU - gw / 2 - 0.2, -0.03, 0.95, 0.13, 0.05, 0.19, 0x2a2c30);    // インターホン（門柱・表札の下）
    { const [ix, iz] = F.at(doorU - gw / 2 - 0.2, -0.06); B.box('glow', ix, 0.92, iz, 0.04, 0.04, 0.04, 0x90c8ff, { edges: false }); }
    F.box('prop', doorU + gw / 2 + 0.2, -0.05, 1.12, 0.3, 0.12, 0.22, 0xa83a2a);    // 郵便受け
    F.box('tex', doorU, 0.2, 0.62, gw - 0.04, 0.03, 1.0, 0x8a7a64, 'balcony', { fit: true });   // 門扉（閉じた格子・低い）
    // 横の塀（表からの奥行き）
    for (const u of [0.08, F.W - 0.08]) F.box('tex', u, F.D / 2, 0.7, 0.16, F.D, 1.4, 0xffffff, 'block', { ts: 1.2 });
    // 庭：植木（丸い木）・自転車
    if (r() < 0.7) tree(...F.at(r() < 0.5 ? 0.9 : F.W - 0.9, 1.4), 2.4 + r());
  }
  function shop(L) {
    const F = frame(L), r = seeded(L.id), floors = L.floors || 2, fh = 2.9, H = floors * fh + 0.3, D = Math.min(F.D, 10), tint = L.tint || 0xd0c8bc;
    F.box('tex', F.W / 2, D / 2, H / 2, F.W - 0.1, D, H, tint, L.wall || 'mortar', { ts: 2, ao: true, edges: true });
    // 1 階：シャッターかガラス・看板・ひさし
    const frontW = F.W - 0.8;
    if (L.shutter && !L.office) F.box('tex', F.W / 2, -0.06, 1.35, frontW, 0.08, 2.7, 0xffffff, 'shutter', { ts: 2.2, tsy: 2.7 });
    else F.box(L.litSign ? 'texglow' : 'tex', F.W / 2, -0.06, 1.35, frontW, 0.08, 2.7, L.litSign ? 0xd8c8a8 : 0xffffff, L.litSign ? 'win_lit' : 'shopglass', { ts: frontW / Math.max(1, Math.round(frontW / 3)), tsy: 2.7 });
    if (L.office) F.box('tex', F.W / 2, -0.07, 1.2, frontW * 0.5, 0.08, 2.4, 0xffffff, 'shutter', { ts: 2, tsy: 2.4 });
    // フェーズ11：ガラスの店・事務所は戸（枠・取っ手）。シャッターの店はシャッターが出入り口（data/town.js の lotEntrances）
    for (const e of lotEntrances(L)) if (e.kind === 'door') { glassDoor(F, e.u, -0.08, 1.0, 2.15, 1, !!L.litSign, 0x2e3036, 'win_lit'); F.box('prop', e.u, -0.5, 0.012, 1.2, 0.7, 0.02, 0x3a3634); }
    const uv = signUV(L.sign, { bg: L.litSign ? '#2a1a20' : '#efe6d2', fg: L.litSign ? '#ffd890' : '#2a1a14', dirt: !L.litSign });
    { const [sx, sz] = F.at(F.W / 2, -0.18); B.box('sign', sx, 3.15, sz, F.alongX ? frontW : 0.12, 0.62, F.alongX ? 0.12 : frontW, 0xffffff, { uv, face: F.f === 'N' ? 5 : F.f === 'S' ? 4 : F.f === 'E' ? 0 : 1 }); if (L.litSign) halos.push({ p: [sx + F.out[0] * 0.3, 3.15, sz + F.out[1] * 0.3], size: 3.2, color: 0xffb070, k: 0.35, neon: true }); }
    F.box('prop', F.W / 2, -0.55, 2.75, F.W - 0.2, 1.0, 0.1, [0x7a3030, 0x304a7a, 0x3a6a30, 0x5a4a30][Math.floor(r() * 4)], { rx: F.alongX ? 0.18 * (F.f === 'N' ? 1 : -1) : 0, rz: F.alongX ? 0 : 0.18 * (F.f === 'E' ? -1 : 1) });
    // 上の階：窓・室外機
    for (let k = 1; k < floors; k++) {
      const y = k * fh + 1.5, n = Math.max(1, Math.floor(F.W / 3.2));
      for (let i = 0; i < n; i++) { const u = (i + 0.5) * F.W / n; const kind = L.office ? (r() < 0.25 ? 'office_lit' : 'office') : ['dark', 'dark', 'curtain', 'lit', 'dark'][Math.floor(r() * 5)]; win(F, u, 0, y, Math.min(2.2, F.W / n - 0.6), 1.3, kind); }
      if (r() < 0.7) { const au = F.W * (0.2 + r() * 0.6); if (k > 1) F.box('tex', au, -0.32, k * fh + 0.45, 0.8, 0.3, 0.6, 0xffffff, 'acunit', { fit: true }); }   // フェーズ11：2 階の室外機は 1 階の看板に重なるので置かない（裏へ）
    }
    if (L.sign2) { const uv2 = signUV(L.sign2, { bg: '#1a2a3a', fg: '#a8e0ff', size: 34 }); const [sx, sz] = F.at(F.W * 0.5, -0.1); const sw2 = F.W * 0.6; B.box('sign', sx, fh * 2 - 0.15, sz, F.alongX ? sw2 : 0.08, 0.5, F.alongX ? 0.08 : sw2, 0xffffff, { uv: uv2, face: F.f === 'N' ? 5 : F.f === 'S' ? 4 : F.f === 'E' ? 0 : 1, edges: false }); halos.push({ p: [sx + F.out[0] * 0.4, fh * 2 - 0.15, sz + F.out[1] * 0.4], size: 2.6, color: 0x80c8ff, k: 0.35, neon: true, flicker: true }); }
    if (L.barber) { const [bx, bz] = F.at(0.8, -0.3); const g = new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10); g.translate(bx, 1.6, bz); B.add('glow', g, 0xf0e0e8); halos.push({ p: [bx + F.out[0] * 0.2, 1.6, bz + F.out[1] * 0.2], size: 1.0, color: 0xff6a6a, k: 0.3, flicker: true }); }
    // 屋上：平らな縁・給水タンク（3 階建て）
    if (floors >= 3) { const [tx, tz] = F.at(F.W * 0.7, D * 0.6); const g = new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12); g.translate(tx, H + 0.9, tz); B.add('prop', g, 0x9aa0a6); }
    F.box('prop', F.W / 2, 0.1, H + 0.15, F.W, 0.2, 0.3, 0x5a5654);
    // 横の面（広場・道に見える側）
    if (L.side) {
      const sx = L.side === 'E' ? L.rect[2] : L.rect[0], zc = (L.rect[1] + L.rect[3]) / 2, dz = L.rect[3] - L.rect[1];
      B.box('tex', sx + (L.side === 'E' ? 0.04 : -0.04), 1.35, zc + 0.6, 0.08, 2.7, dz - 2.4, 0xffffff, { tile: 'shutter', ts: 2.2, tsy: 2.7, edges: false });
      const y = fh + 1.5; B.box('tex', sx + (L.side === 'E' ? 0.05 : -0.05), y, zc, 0.06, 1.2, 1.6, 0xffffff, { tile: 'win_dark', fit: true, edges: false });
    }
  }
  function apartment(L) {
    const F = frame(L), r = seeded(L.id), floors = L.floors || 2, fh = 2.8, H = floors * fh + 0.4, set = 2.0, D = Math.min(F.D - set - 1, 9);
    F.box('tex', F.W / 2, set + D / 2, H / 2, F.W - 1.6, D, H, L.tint || 0xd0d0c8, L.wall || 'siding2', { ts: 2, ao: true, edges: true });
    F.box('tex', F.W / 2, set + D / 2, H + 0.05, F.W - 1.4, D + 0.2, 0.15, 0xffffff, 'roof_flat', { ts: 3 });
    const units = Math.max(2, Math.floor((F.W - 2) / 3.4));
    for (let k = 0; k < floors; k++) {
      const y0 = k * fh;
      // フェーズ11：閉じた形の集合住宅は 1 階の真ん中が入口（ベランダの手すりを空ける）
      const spans = k === 0 && !L.open ? [[0.8, F.W / 2 - 1.3], [F.W / 2 + 1.3, F.W - 0.8]] : [[0.8, F.W - 0.8]];
      if (k > 0 || !L.open) for (const [p, q] of spans) { F.box('prop', (p + q) / 2, set - 0.6, y0 + 0.08, q - p, 1.2, 0.14, 0x9a9a98); F.box('tex', (p + q) / 2, set - 1.18, y0 + 0.62, q - p, 0.04, 1.0, 0xffffff, 'balcony', { ts: 1.6, tsy: 1 }); }
      for (let i = 0; i < units; i++) {
        const u = 0.8 + (i + 0.5) * (F.W - 1.6) / units;
        if (k === 0 && !L.open && Math.abs(u - F.W / 2) < 1.9) { r(); r(); continue; }
        if (L.open) { F.box('tex', u - 0.7, set - 0.05, y0 + 1.0, 0.85, 0.08, 2.0, 0x9aa8b8, 'door_house', { fit: true }); win(F, u + 0.6, set, y0 + 1.55, 1.0, 0.7, r() < 0.3 ? 'lit' : 'dark'); }
        else { const kind = ['dark', 'curtain', 'lit', 'dark', 'lit2'][Math.floor(r() * 5)]; win(F, u, set, y0 + 1.25, 2.0, 1.8, kind); }
        if (r() < 0.6 && !(k === 0 && !L.open && Math.abs(u + 1.0 - F.W / 2) < 1.8)) F.box('tex', u + 1.0, set - 0.6, y0 + 0.5, 0.75, 0.28, 0.55, 0xffffff, 'acunit', { fit: true });
      }
      if (L.open && k > 0) { const [lx, lz] = F.at(F.W / 2, set - 0.8); B.box('glow', lx, y0 + 2.5, lz, 0.4, 0.06, 0.12, 0xe8f0ff, { edges: false }); halos.push({ p: [lx, y0 + 2.4, lz], size: 1.2, color: 0xd8e8ff, k: 0.4 }); }
    }
    if (!L.open) { // フェーズ11：入口（ガラスの両開き・ひさし・灯り・集合ポスト・入口から門への床）
      const eu = F.W / 2; glassDoor(F, eu, set, 1.6, 2.3, 2, true);
      F.box('prop', eu, set - 0.75, 2.62, 2.6, 1.5, 0.14, 0x4a4c50);
      { const [x, z] = F.at(eu, set - 0.9); B.box('glow', x, 2.53, z, 0.6, 0.04, 0.2, 0xf0f4ff, { edges: false }); halos.push({ p: [x, 2.4, z], size: 1.4, color: 0xe8f0ff, k: 0.5 }); pool(x, z, 2.6, 0xe8f0ff, 0.3); }
      F.box('prop', eu + 1.35, set - 0.12, 1.15, 0.6, 0.22, 0.9, 0x8a8e94);                          // 集合ポスト
      F.box('tex', eu, set / 2, 0.02, 1.8, set, 0.04, 0xc0bcb4, 'stone', { ts: 0.8 });
    }
    if (L.open) { // 外階段
      const [sx, sz] = F.at(F.W - 0.5, set + 1.0);
      for (let s = 0; s < 10; s++) { const [x, z] = F.at(F.W - 0.5, set + 0.2 + s * 0.28); prop(x, 0.14 + s * 0.28, z, F.alongX ? 0.9 : 0.28, 0.06, F.alongX ? 0.28 : 0.9, 0x6a6a6e); }
      void sx; void sz;
    }
    const uv = signUV(L.sign, { bg: '#f4f0e8', fg: '#2a2a3a', size: 34 }); const [sx, sz] = F.at(1.2, -0.06);
    B.box('sign', sx, 1.6, sz, F.alongX ? 1.6 : 0.04, 0.3, F.alongX ? 0.04 : 1.6, 0xffffff, { uv, face: F.f === 'N' ? 5 : F.f === 'S' ? 4 : F.f === 'E' ? 0 : 1, edges: false });
    fenceFront(F, 'block', F.W / 2, 2.4, 1.0);
    // 駐輪場の屋根
    F.box('prop', F.W - 2.5, 1.0, 2.2, 3.4, 1.4, 0.06, 0x8a9aa8);
  }
  function konbini(L) {
    const F = frame(L), [x0, z0, x1, z1] = L.rect, cx = (x0 + x1) / 2;
    F.box('tex', F.W / 2, F.D / 2, 1.9, F.W, F.D, 3.8, 0xe8ecef, 'siding2', { ts: 2, ao: true, edges: true });
    F.box('texglow', F.W / 2 - 1.5, -0.04, 1.3, F.W - 5.5, 0.06, 2.6, 0xe0e8f0, 'konbini', { ts: 3, tsy: 2.6 });
    F.box('texglow', F.W - 2.4, -0.04, 1.3, 1.8, 0.06, 2.6, 0xe0e8f0, 'konbini', { fit: true });   // 自動ドア
    // 看板の帯（独自の配色：白地に緑と橙の線）
    const uv = signUV(L.sign, { bg: '#ffffff', fg: '#1a5a3a', size: 36 });
    { const [sx, sz] = F.at(F.W / 2, -0.12); B.box('sign', sx, 3.25, sz, F.W - 0.2, 0.7, 0.12, 0xffffff, { uv, face: 5 }); }
    F.box('glow', F.W / 2, -0.13, 2.82, F.W - 0.2, 0.06, 0.12, 0x2aa060); F.box('glow', F.W / 2, -0.13, 3.68, F.W - 0.2, 0.06, 0.1, 0xff8a2a);
    F.box('prop', F.W / 2, -0.8, 2.75, F.W, 1.6, 0.1, 0xe8e8e8);
    lights.push({ id: 'konbini', pos: [cx, 2.6, z0 - 1.2], color: 0xf0f8ff, intensity: 12, dist: 16, town: true });
    for (let x = x0 + 2; x < x1 - 1; x += 3.4) halos.push({ p: [x, 2.6, z0 - 0.9], size: 2.2, color: 0xe8f4ff, k: 0.45 });
    pool(cx, z0 - 2.4, 7, 0xe8f0ff, 0.45);
    wet.push({ p: [cx - 3, 0, z0 - 3], size: 2.4, color: 0xe8f0ff, k: 0.8 }, { p: [cx + 4, 0, z0 - 3.5], size: 2.0, color: 0xe8f0ff, k: 0.7 });
    // 駐車場の白線・車止め
    for (let x = x0 + 2.5; x < x1 - 1; x += 2.7) { prop(x, 0.014, z0 - 3.2, 0.12, 0.02, 4.6, 0xe8e6de); prop(x + 1.35, 0.08, z0 - 1.2, 1.4, 0.16, 0.2, 0xd0c8b8); }
    // ごみ箱
    F.box('prop', 1.6, -0.45, 0.5, 1.6, 0.6, 1.0, 0x6a7a6a);
    spots.push({ id: 'konbini_door', kind: 'read', x: x1 - 2.4 - 0.0, z: z0 - 1.0, r: 1.4, label: 'コンビニの自動ドア', text: 'town_konbini' });
  }
  function parking(L) {
    const F = frame(L), [x0, z0, x1, z1] = L.rect;
    fenceFront(F, 'fence', F.W - 2.2, 3.6, 0.9);
    for (const u of [0.08]) F.box('tex', u, F.D / 2, 0.5, 0.04, F.D, 1.0, 0xffffff, 'fence', { ts: 1.1 });
    for (let x = x0 + 2.6; x < x1 - 1; x += 2.6) prop(x, 0.014, (z0 + z1) / 2 - 1, 0.1, 0.02, 5, 0xe8e6de);
    const [mx, mz] = F.at(1.0, 1.0); prop(mx, 0.7, mz, 0.5, 1.4, 0.4, 0xd8d0c0); B.box('glow', mx, 1.1, mz + 0.21, 0.3, 0.2, 0.02, 0x80ffb0, { edges: false });
    const uv = signUV(L.sign, { bg: '#2a4aa0', fg: '#ffffff', size: 40 }); const [px, pz] = F.at(F.W - 0.6, 0.4);
    prop(px, 1.6, pz, 0.1, 3.2, 0.1, 0x6a6a6a); B.box('sign', px, 3.2, pz + 0.05, 1.2, 0.6, 0.06, 0xffffff, { uv, face: 4 }); halos.push({ p: [px, 3.2, pz + 0.3], size: 1.8, color: 0x80a0ff, k: 0.4, neon: true });
  }
  function backHouses(L) {
    // フェーズ11：data/town.js の fillCells（細い区画も狭い家・物置に）。道に面した升目は戸（fillEntrances）・2.5m 未満は塀だけ
    const r = seeded(L.id), ents = fillEntrances(L);
    fillCells(L).forEach((c, ci) => {
      const [bx0, bz0, bx1, bz1] = c.rect, w = bx1 - bx0, d = bz1 - bz0, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
      if (c.small) { const alongX = w >= d; B.box('tex', cx, 0.7, cz, alongX ? w : 0.16, 1.4, alongX ? 0.16 : d, 0xffffff, { tile: 'block', ts: 1.2, edges: false }); return; }
      const h = c.narrow ? 5.6 : r() < 0.3 ? 2.9 : 5.6;
      B.box('tex', cx, h / 2, cz, w, h, d, [0xb0a898, 0x9aa0a8, 0xa89080, 0xc0b8a8][Math.floor(r() * 4)], { tile: r() < 0.5 ? 'siding' : 'mortar', ts: 2, edges: false });
      const roofT = r() < 0.6 ? 'kawara' : r() < 0.5 ? 'kawara2' : 'galv', th = 0.42;
      if (w >= d) { const rise = (d / 2) * Math.tan(th), len = (d / 2 + 0.4) / Math.cos(th); for (const s of [-1, 1]) B.box('tex', cx, h + rise / 2 + 0.05, cz + s * (d / 4 + 0.2), w + 0.8, 0.14, len, 0xb8b8c0, { tile: roofT, ts: 1.4, rx: -s * th, edges: false }); }
      else { const rise = (w / 2) * Math.tan(th), len = (w / 2 + 0.4) / Math.cos(th); for (const s of [-1, 1]) B.box('tex', cx + s * (w / 4 + 0.2), h + rise / 2 + 0.05, cz, len, 0.14, d + 0.8, 0xb8b8c0, { tile: roofT, ts: 1.4, rz: s * th, edges: false }); }
      if (r() < 0.35) B.box('texglow', cx + (r() - 0.5) * w * 0.6, h > 3 ? 4.3 : 1.5, bz0 - 0.04, Math.min(1.4, w - 0.6), 1.1, 0.06, 0xd0c0a8, { tile: r() < 0.5 ? 'win_lit' : 'win_curtain', fit: true, edges: false });
      const e = ents.find(q => q.cell === ci);
      if (e) {   // 戸（枠・ひさし・灯り）と横の窓
        const [ox, oz] = e.out, along = Math.abs(ox) < 0.5;
        const DF = { alongX: along, f: oz < 0 ? 'N' : oz > 0 ? 'S' : ox > 0 ? 'E' : 'W', out: e.out, at: (u, v) => [e.door[0] + (along ? u : 0) - v * ox, e.door[1] + (along ? 0 : u) - v * oz] };
        DF.box = (key, u, v, y, a2, b2, hh, color, tile, opt = {}) => { const [x, z] = DF.at(u, v); return B.box(key, x, y, z, along ? a2 : b2, hh, along ? b2 : a2, color, Object.assign({ tile, edges: false }, opt)); };
        DF.box('tex', 0, -0.05, 1.0, 0.9, 0.06, 2.0, 0xffffff, 'door_house', { fit: true });
        doorFrame(DF, 0, 0, 0, 0.9, 2.0, 0x3a3430, 0.08);
        DF.box('prop', 0, -0.45, 2.3, 1.3, 0.9, 0.08, 0x4a4642);
        const lit = r() < 0.5, [lx, lz] = DF.at(0.7, -0.1);
        B.box('glow', lx, 1.9, lz, 0.12, 0.18, 0.12, lit ? 0xffd8a0 : 0x3a3428, { edges: false });
        if (lit) halos.push({ p: [lx + ox * 0.12, 1.9, lz + oz * 0.12], size: 0.8, color: 0xffd8a0, k: 0.6 });
        if ((along ? w : d) > 3.6) win(DF, 1.9 * (r() < 0.5 ? 1 : -1), 0, 1.5, 1.0, 0.9, r() < 0.4 ? 'lit' : 'dark');
      }
    });
  }
  function field(L) {
    const [x0, z0, x1, z1] = L.rect;
    for (let z = z0; z <= z1; z += 2) prop(x0 + 0.1, 0.5, z, 0.08, 1.0, 0.08, 0x6a6a5a);
    prop(x0 + 0.1, 0.85, (z0 + z1) / 2, 0.04, 0.04, z1 - z0, 0x8a8a7a); prop(x0 + 0.1, 0.45, (z0 + z1) / 2, 0.04, 0.04, z1 - z0, 0x8a8a7a);
    // 田んぼの向こうに遠い家の灯り（霧の中）
    halos.push({ p: [x1 + 18, 2.0, (z0 + z1) / 2], size: 1.6, color: 0xffc888, k: 0.25 });
  }
  function barrier(L) {
    const [x0, z0, x1, z1] = L.rect, cx = (x0 + x1) / 2;
    const uv = signUV('この先 通行止め', { bg: '#f8f4ea', fg: '#c01818', size: 34 });
    for (const z of [5.5, 10.5]) {
      prop(cx, 0.5, z, 0.08, 1.0, 2.2, 0xe8e0d0); prop(cx, 0.85, z, 0.1, 0.26, 2.0, 0xe8a020);
      B.box('sign', cx + (x0 < 0 ? 0.06 : -0.06), 0.85, z, 0.02, 0.24, 1.9, 0xffffff, { uv, face: x0 < 0 ? 0 : 1, edges: false });
      halos.push({ p: [cx + (x0 < 0 ? 0.2 : -0.2), 1.15, z], size: 0.7, color: 0xffa020, k: 0.8, hazard: true });
    }
    B.box('glow', cx, 1.15, 8, 0.1, 0.1, 0.1, 0xffa020, { edges: false });
    void z0; void z1;
  }
  function tree(x, z, h = 3) {
    const g = new THREE.CylinderGeometry(0.1, 0.16, h * 0.5, 7); g.translate(x, h * 0.25, z); B.add('prop', g, 0x4a3628);
    const c = new THREE.IcosahedronGeometry(h * 0.36, 1); c.scale(1, 1.15, 1); c.translate(x, h * 0.66, z); applyTile(c, 'hedge', { ts: 1.2 }); B.add('tex', c, 0x8aa080, false);
  }
  function homeExterior() {
    // 自宅（2 階建て）：1 階の壁は level.js（家の中）。ここは外側の皮・2 階・瓦屋根・カーポート・前庭・小物
    const [x0, z0] = homeW(-6, 6), [x1, z1] = homeW(6, 16), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const tint = 0xd8c8b4, door = 1.4;
    // 1 階の外側（玄関の口を空ける）
    for (const [a, b] of [[x0 - 0.2, cx - door / 2], [cx + door / 2, x1 + 0.2]]) B.box('tex', (a + b) / 2, 1.6, z0 - 0.19, b - a, 3.2, 0.06, tint, { tile: 'siding', ts: 2, ao: true, edges: true });
    B.box('tex', cx, 2.75, z0 - 0.19, door, 0.9, 0.06, tint, { tile: 'siding', ts: 2, edges: false });
    // フェーズ11：玄関の戸（引き戸を右へ開けたまま＝出入りできる）・枠・上のレール・ポーチ（低いタイル）・表札・インターホン・灯り
    { const zf = z0 - 0.24, hh = 2.3;
      for (const s of [-1, 1]) B.box('prop', cx + s * (door / 2 + 0.05), hh / 2, zf + 0.02, 0.1, hh + 0.1, 0.1, 0x3a3430, { edges: false });
      B.box('prop', cx + 0.7, hh + 0.06, zf + 0.02, door + 1.6, 0.1, 0.12, 0x3a3430, { edges: false });              // 上のレール（戸袋の上まで）
      B.box('prop', cx + 0.7, 0.025, zf + 0.02, door + 1.6, 0.05, 0.12, 0x8a8a88, { edges: false });                // 下のレール
      B.box('tex', cx + door / 2 + 0.74, hh / 2, zf - 0.04, door + 0.04, hh - 0.04, 0.05, 0xffffff, { tile: 'door_house', fit: true, edges: false });   // 開けた戸（右の壁の前）
      B.box('tex', cx, 0.03, z0 - 0.75, 2.2, 0.06, 1.0, 0xd8d4cc, { tile: 'stone', ts: 0.6, edges: false });            // ポーチ
      const puv2 = signUV('だんのうら', { bg: '#f1e9d6', fg: '#1d1712', size: 46, serif: true });
      B.box('sign', cx - door / 2 - 0.45, 1.65, zf - 0.01, 0.36, 0.11, 0.02, 0xffffff, { uv: puv2, face: 5, edges: false });
      B.box('prop', cx - door / 2 - 0.45, 1.3, zf - 0.01, 0.13, 0.19, 0.05, 0x2a2c30, { edges: false });           // インターホン
      B.box('glow', cx - door / 2 - 0.45, 2.15, zf - 0.04, 0.16, 0.22, 0.12, 0xffd8a0, { edges: false }); }
    for (const x of [x0 - 0.19, x1 + 0.19]) B.box('tex', x, 1.6, cz, 0.06, 3.2, d + 0.4, tint, { tile: 'siding', ts: 2, ao: true, edges: true });
    B.box('tex', cx, 1.6, z1 + 0.19, w + 0.4, 3.2, 0.06, tint, { tile: 'siding', ts: 2, edges: false });
    // 2 階
    B.box('tex', cx, 3.2 + 1.45, cz, w + 0.4, 2.9, d + 0.4, tint, { tile: 'siding', ts: 2, edges: true });
    B.box('prop', cx, 3.25, cz, w + 0.5, 0.14, d + 0.5, 0x8a7a6a);
    const F = { W: w + 0.4, D: d + 0.4, alongX: true, f: 'N', out: [0, -1], at: (u, v) => [x0 - 0.2 + u, z0 - 0.2 + v] };
    F.box = (key, u, v, y, a, b, h, color, tile, opt = {}) => { const [x, z] = F.at(u, v); return B.box(key, x, y, z, a, h, b, color, Object.assign({ tile, edges: false }, opt)); };
    roofGable(F, 0, 0, F.W, F.D, 6.1, 'kawara', 0xc8c8d0, 0.6, 'siding', tint);
    // 窓：1 階の居間（点いている：家の中の灯り）・2 階（子ども部屋＝暗い・カーテン）
    win(F, 2.2, 0, 1.4, 2.0, 1.3, 'curtain'); win(F, F.W - 2.2, 0, 1.5, 1.6, 1.1, 'lit');
    win(F, 2.6, 0, 4.7, 1.6, 1.2, 'dark'); win(F, F.W - 2.8, 0, 4.7, 1.6, 1.2, 'curtain');
    F.box('prop', F.W - 2.8, -0.5, 3.3, 2.8, 1.0, 0.12, 0x8a8a88); F.box('tex', F.W - 2.8, -0.98, 3.8, 2.8, 0.04, 0.9, 0xffffff, 'balcony', { fit: true });
    // 室外機・雨どい・外の水道
    F.box('tex', F.W - 0.8, -0.35, 0.32, 0.8, 0.3, 0.6, 0xffffff, 'acunit', { fit: true });
    for (const u of [0.1, F.W - 0.1]) F.box('prop', u, -0.06, 3.0, 0.08, 0.08, 6.0, 0x5a5a58);
    // 前の塀（門）・門柱の表札・郵便受け・玄関灯の光
    const H = TOWN.homeLot;
    for (const [a, b] of [[36, H.gate[0]], [H.gate[1], 48]]) { B.box('tex', (a + b) / 2, 0.7, 43, b - a, 1.4, 0.16, 0xffffff, { tile: 'block', ts: 1.2, ao: true, edges: false }); B.box('prop', (a + b) / 2, 1.44, 43, b - a, 0.08, 0.2, 0x8a8884, { edges: false }); }
    for (const x of [H.gate[0] - 0.2, H.gate[1] + 0.2]) B.box('tex', x, 0.75, 43, 0.4, 1.5, 0.4, 0xd8d0c4, { tile: 'stone', ts: 0.8, edges: false });
    for (const [x, z0b, z1b] of [[48.1, 43, 66], [30.65, 43, 52]]) B.box('tex', x, 0.7, (z0b + z1b) / 2, 0.16, 1.4, z1b - z0b, 0xffffff, { tile: 'block', ts: 1.2, edges: false });
    B.box('tex', 39.2, 0.7, 56.5, 17.4, 1.4, 0.16, 0xffffff, { tile: 'block', ts: 1.2, edges: false });
    const puv = signUV('だんのうら', { bg: '#f1e9d6', fg: '#1d1712', size: 46, serif: true });
    B.box('sign', H.gate[0] - 0.2, 1.22, 42.79, 0.34, 0.1, 0.02, 0xffffff, { uv: puv, face: 5, edges: false });
    B.box('prop', H.gate[1] + 0.2, 1.1, 42.78, 0.3, 0.22, 0.1, 0x6a3a8a, { edges: false });    // 郵便受け（紫）
    halos.push({ p: [cx - 1.1, 2.3, z0 - 0.4], size: 1.1, color: 0xffd8a0, k: 0.85 });
    lights.push({ id: 'home_porch', pos: [cx - 0.6, 2.4, z0 - 1.0], color: 0xffd2a0, intensity: 4, dist: 7, town: true, home: true });
    // 前庭：飛び石・植木鉢・子ども用の自転車（娘の物・補助輪つき）
    for (let z = 43.6; z < 45.8; z += 0.7) B.box('tex', cx + 0.0, 0.03, z, 0.7, 0.06, 0.5, 0xd8d0c8, { tile: 'stone', ts: 0.8, edges: false });
    { const bx = 44.6, bz = 44.4; for (const dx of [-0.32, 0.32]) { const g = new THREE.TorusGeometry(0.2, 0.03, 6, 14); g.rotateY(Math.PI / 2); g.translate(bx + dx * 0.0, 0.22, bz + dx); B.add('prop', g, 0x2a2a2a); } prop(bx, 0.42, bz, 0.06, 0.06, 0.66, 0xf09ac8); prop(bx, 0.55, bz - 0.25, 0.1, 0.06, 0.18, 0x2a2a2a); for (const s of [-1, 1]) { const g = new THREE.TorusGeometry(0.08, 0.02, 5, 10); g.rotateY(Math.PI / 2); g.translate(bx + s * 0.18, 0.1, bz + 0.38); B.add('prop', g, 0xe8e8e8); } }
    // カーポート：柱と透明な屋根
    for (const [x, z] of [[30.9, 43.4], [30.9, 51.6], [35.6, 43.4], [35.6, 51.6]]) prop(x, 1.2, z, 0.1, 2.4, 0.1, 0xb8bcc0);
    B.box('glass', 33.25, 2.45, 47.5, 5.2, 0.05, 8.8, 0x6a8090, { edges: false });
    prop(33.25, 2.4, 47.5, 5.2, 0.08, 0.1, 0xb8bcc0);
    // 物置
    B.box('tex', 33.2, 1.1, 54.5, 4.4, 2.2, 3.4, 0xc8ccd0, { tile: 'galv', ts: 2, edges: true });
    spots.push({ id: 'home_gate', kind: 'read', x: 42, z: 42.3, r: 1.2, label: '表札を見る', text: 'town_nameplate', low: true });
  }
  function park() {
    const P = T.park, [x0, z0, x1, z1] = T.walk.find(w => w.id === 'park').rect;
    tb('tex', (x0 + x1) / 2, -0.06, (z0 + z1) / 2, x1 - x0, 0.12, z1 - z0, 0xb8b0a0, 'gravel', { ts: 3 });
    for (const [a, b, c, d] of [[x0, z0, x0 + 3, z1], [x1 - 3, z0, x1, z1]]) tb('tex', (a + c) / 2, -0.05, (b + d) / 2, c - a, 0.12, d - b, 0xffffff, 'grass', { ts: 2 });
    // 柵（表と横）
    for (const [a, b] of [[x0, -6], [-1, x1]]) { tb('tex', (a + b) / 2, 0.55, 14, b - a, 1.0, 0.04, 0xffffff, 'fence', { ts: 1.1 }); for (let x = a; x <= b; x += 2) prop(x, 0.55, 14, 0.07, 1.1, 0.07, 0x4a6a4a); }
    tb('tex', x0 + 0.05, 0.55, (z0 + z1) / 2, 0.04, 1.0, z1 - z0, 0xffffff, 'fence', { ts: 1.1 }); tb('tex', (x0 + x1) / 2, 0.55, z1 - 0.05, x1 - x0, 1.0, 0.04, 0xffffff, 'fence', { ts: 1.1 });
    for (const x of [-5.6, -1.4]) prop(x, 0.4, 14, 0.18, 0.8, 0.18, 0xd8d0c0);   // 車止め
    const uv = signUV('児童公園（仮）　ボール遊び禁止', { bg: '#f4f0e0', fg: '#2a4a2a', size: 28 });
    prop(-6.6, 0.8, 14.3, 0.08, 1.6, 0.08, 0x5a5a5a); B.box('sign', -6.6, 1.5, 14.33, 1.6, 0.4, 0.04, 0xffffff, { uv, face: 5, edges: false });
    // ぶらんこ・すべり台・砂場・ベンチ・トイレ・木
    { const [x, z] = P.swing; for (const s of [-1.5, 1.5]) { prop(x + s, 1.1, z - 0.25, 0.08, 2.2, 0.08, 0xc84a3a, { rx: 0.12 }); prop(x + s, 1.1, z + 0.25, 0.08, 2.2, 0.08, 0xc84a3a, { rx: -0.12 }); } prop(x, 2.2, z, 3.2, 0.1, 0.1, 0xc84a3a); for (const s of [-0.7, 0.7]) { prop(x + s, 1.4, z, 0.02, 1.4, 0.02, 0x8a8a8a); prop(x + s, 0.6, z, 0.5, 0.06, 0.22, 0xe8c040); } }
    { const [x, z] = P.slide; prop(x, 1.0, z - 1.2, 0.8, 0.1, 0.8, 0x4a8ad0); prop(x, 0.5, z - 1.5, 0.8, 1.0, 0.1, 0x3a7ac0); prop(x, 0.55, z + 0.1, 0.6, 0.06, 2.4, 0xe8e8e0, { rx: 0.42 }); for (const s of [-0.35, 0.35]) prop(x + s, 0.6, z - 1.2, 0.06, 1.2, 0.06, 0x3a3a3a); }
    { const [x, z] = P.sand; tb('tex', x, 0.02, z, 2.6, 0.04, 2.0, 0xe8d8b0, 'gravel', { ts: 1 }); for (const [dx, dz, w, d] of [[0, -1.05, 2.8, 0.12], [0, 1.05, 2.8, 0.12], [-1.35, 0, 0.12, 2.0], [1.35, 0, 0.12, 2.0]]) tb('tex', x + dx, 0.1, z + dz, w, 0.2, d, 0xffffff, 'wood', { ts: 1 }); }
    for (const [x, z] of P.bench) { tb('tex', x, 0.45, z, 1.6, 0.06, 0.45, 0xffffff, 'wood', { ts: 1 }); tb('tex', x, 0.75, z + 0.22, 1.6, 0.4, 0.05, 0xffffff, 'wood', { ts: 1 }); for (const s of [-0.65, 0.65]) prop(x + s, 0.22, z, 0.06, 0.45, 0.4, 0x3a3a3a); }
    { const [x, z] = P.toilet; tb('tex', x, 1.4, z, 3.2, 2.8, 2.8, 0xd8d4c8, 'tilewall', { ts: 1.5, ao: true, edges: true }); prop(x, 2.9, z, 3.6, 0.2, 3.2, 0x5a5a60); B.box('texglow', x + 1.62, 2.1, z, 0.06, 0.5, 1.2, 0xc8d8e8, { tile: 'win_lit2', fit: true, edges: false }); halos.push({ p: [x + 1.9, 2.1, z], size: 1.2, color: 0xd8e8ff, k: 0.35, flicker: true }); }
    for (const [x, z] of P.trees) tree(x, z, 4 + ((x * 3 + z) % 1.5));
    lampAt({ id: 'park', x: P.lamp[0], z: P.lamp[1], kind: 'park', h: 3.6, dead: false, flicker: false });
    hideSpots.push({ x: P.toilet[0] + 1.9, z: P.toilet[1] + 1.4 }, { x: P.slide[0] - 0.8, z: P.slide[1] - 2.2 });
    spots.push({ id: 'park_bench', kind: 'read', x: P.bench[0][0], z: P.bench[0][1] - 0.7, r: 1.2, label: 'ベンチ', text: 'town_park' });
  }
  function shrine() {
    const S = T.shrine, [tx, tz] = S.torii, red = 0xc8402a;
    for (const dz of [-1.1, 1.1]) { const g = new THREE.CylinderGeometry(0.13, 0.15, 2.8, 10); g.translate(tx, 1.4, tz + dz); B.add('prop', g, red); }
    prop(tx, 2.75, tz, 0.26, 0.18, 3.1, 0x1a1414); prop(tx, 2.6, tz, 0.2, 0.12, 2.9, red); prop(tx, 2.25, tz, 0.14, 0.12, 2.5, red);
    const [hx, hz] = S.hokora;
    tb('tex', hx, 0.3, hz, 1.2, 0.6, 1.2, 0xffffff, 'stone', { ts: 0.8 });
    tb('tex', hx, 0.95, hz, 0.8, 0.7, 0.7, 0xffffff, 'wood', { ts: 0.8 });
    prop(hx + 0.1, 1.42, hz, 1.1, 0.12, 1.0, 0x2a2a30, { rz: 0.0 });
    prop(hx + 0.42, 1.0, hz, 0.02, 0.5, 0.4, 0xe8e0c8);   // 紙垂の代わりの白い札
    for (const [x, z] of S.lanterns) { tb('tex', x, 0.5, z, 0.3, 1.0, 0.3, 0xffffff, 'stone', { ts: 0.6 }); tb('tex', x, 1.1, z, 0.46, 0.3, 0.46, 0xffffff, 'stone', { ts: 0.6 }); B.box('glow', x, 1.1, z, 0.2, 0.16, 0.48, 0xffb060, { edges: false }); halos.push({ p: [x + 0.3, 1.1, z], size: 0.8, color: 0xffa050, k: 0.55, flicker: true }); }
    tree(-5.5, 39.6, 5.5); tree(-5.6, 44.4, 4.6);
    spots.push({ id: 'town_shrine', kind: 'read', x: hx + 1.2, z: hz, r: 1.3, label: '祠に手を合わせる', text: 'town_shrine' });
  }
  function pole(x, z, pl, i) {
    const g = new THREE.CylinderGeometry(0.15, 0.19, 9.0, 10); g.translate(x, 4.5, z); applyTile(g, 'pole', { ts: 1.0, tsy: 9.0 }); B.add('tex', g, 0xffffff, true);
    const along = pl.pts.length > 1 ? (() => { const j = i < pl.pts.length - 1 ? i + 1 : i - 1; return Math.abs(pl.pts[j][0] - x) > Math.abs(pl.pts[j][1] - z); })() : true;
    prop(x, 8.4, z, along ? 0.12 : 1.4, 0.1, along ? 1.4 : 0.12, 0x5a5a58);
    prop(x, 7.6, z, along ? 0.1 : 0.9, 0.08, along ? 0.9 : 0.1, 0x5a5a58);
    if ((i + pl.id.length) % 3 === 0) { const g2 = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10); g2.translate(x + (along ? 0 : 0.38), 6.8, z + (along ? 0.38 : 0)); B.add('prop', g2, 0x7a7e80); }   // 変圧器
    for (let y = 2.6; y < 5.6; y += 0.45) prop(x + (along ? 0 : 0.2), y, z + (along ? 0.2 : 0), 0.04, 0.04, 0.18, 0x3a3a3a);   // 足場ボルト
    const uv = signUV(({ pl_main: '駅前', pl_mainS: '駅前南', pl_laneB: '用水', pl_laneA: '東町', pl_west: '西町', pl_yoko: '横丁' }[pl.id] || '町内') + ' ' + (i + 3), { bg: '#f0f0e8', fg: '#2a2a3a', size: 30 });
    B.box('sign', x + (along ? 0 : 0.2), 2.0, z + (along ? 0.2 : 0), along ? 0.3 : 0.02, 0.5, along ? 0.02 : 0.3, 0xffffff, { uv, face: along ? 4 : 0, edges: false });
  }
  function lampAt(L) {
    if (L.kind === 'modern') return modernLamp(L);
    // 腕の向き：近い歩ける所の中心へ
    let best = null, bd = 1e9; for (const w of T.walk) { const [a, b, c, d] = w.rect; const px = Math.max(a, Math.min(c, L.x)), pz = Math.max(b, Math.min(d, L.z)); const dd = Math.hypot(px - L.x, pz - L.z) + (w.kind === 'sidewalk' ? 2 : 0); if (dd < bd && w.kind !== 'yard') { bd = dd; best = w; } }
    let ax = 0, az = 0; if (best) { const [a, b, c, d] = best.rect; const tx = Math.max(a + 1, Math.min(c - 1, L.x)), tz = Math.max(b + 1, Math.min(d - 1, L.z)); const dx = (a + c) / 2 - L.x, dz = (b + d) / 2 - L.z; if (Math.abs(tx - L.x) + Math.abs(tz - L.z) < 0.2) { ax = Math.sign(dx); az = 0; } else { const l = Math.hypot(tx - L.x, tz - L.z); ax = (tx - L.x) / l; az = (tz - L.z) / l; } if (Math.abs(ax) > Math.abs(az)) { ax = Math.sign(ax); az = 0; } else { az = Math.sign(az); ax = 0; } }
    const reach = L.kind === 'tall' ? 1.8 : L.kind === 'park' ? 0 : 1.0, h = L.h;
    if (L.kind === 'park') { prop(L.x, h / 2, L.z, 0.1, h, 0.1, 0x3a4a3a); }
    else prop(L.x + ax * reach / 2, h + 0.1, L.z + az * reach / 2, Math.abs(ax) * reach + 0.08, 0.08, Math.abs(az) * reach + 0.08, 0x6a6a68);
    const lx = L.x + ax * reach, lz = L.z + az * reach;
    const warm = L.kind === 'tall', color = warm ? 0xffc890 : 0xdfeaff;
    B.box(L.dead ? 'prop' : 'glow', lx, h, lz, L.kind === 'tall' ? 0.6 : 0.42, 0.1, 0.24, L.dead ? 0x3a3a3c : color, { edges: false });
    prop(lx, h + 0.08, lz, L.kind === 'tall' ? 0.7 : 0.5, 0.06, 0.3, 0x4a4a4c);
    if (L.dead) return;
    const light = { id: 'lamp_' + L.id, pos: [lx, h - 0.25, lz], color, intensity: warm ? 10 : 7, dist: warm ? 15 : 11, town: true, flicker: !!L.flicker, base: warm ? 10 : 7 };
    lights.push(light);
    halos.push({ p: [lx, h - 0.15, lz], size: warm ? 2.4 : 1.8, color, k: 0.85, light });
    pool(lx, lz, warm ? 5.5 : 4.2, color, warm ? 0.32 : 0.26);
    wet.push({ p: [lx, 0, lz], size: warm ? 2.2 : 1.6, color, k: 0.85, light: light.id });
  }
  /** フェーズ10：中央通り・駅前の高い街灯（電線なし・細い柱と弓なりの腕・LED の灯具）。dir＝[0,0] は柱の上に灯（駅前） */
  function modernLamp(L) {
    const h = L.h, [dx, dz] = L.dir || [0, 0], reach = dx || dz ? 2.4 : 0;
    const g = new THREE.CylinderGeometry(0.09, 0.15, h, 10); g.translate(L.x, h / 2, L.z); B.add('prop', g, 0x5a5e66);
    prop(L.x, 0.2, L.z, 0.4, 0.4, 0.4, 0x4a4e56);
    let lx = L.x, lz = L.z;
    if (reach) { for (let k = 0; k < 4; k++) { const t0 = k / 4, t1 = (k + 1) / 4, y0 = h - 0.1 + Math.sin(t0 * 1.6) * 0.5, y1 = h - 0.1 + Math.sin(t1 * 1.6) * 0.5; const mx = L.x + dx * reach * (t0 + t1) / 2, mz = L.z + dz * reach * (t0 + t1) / 2; prop(mx, (y0 + y1) / 2, mz, Math.abs(dx) * reach / 4 + 0.08, Math.abs(y1 - y0) + 0.07, Math.abs(dz) * reach / 4 + 0.08, 0x5a5e66); } lx = L.x + dx * reach; lz = L.z + dz * reach; }
    const ly = reach ? h + 0.3 : h + 0.25, color = 0xffe2b8;
    prop(lx, ly + 0.08, lz, 0.9, 0.1, 0.42, 0x3a3e46);
    B.box(L.dead ? 'prop' : 'glow', lx, ly, lz, 0.8, 0.06, 0.34, L.dead ? 0x3a3a3c : color, { edges: false });
    if (L.dead) return;
    const light = { id: 'lamp_' + L.id, pos: [lx, ly - 0.3, lz], color, intensity: 13, dist: 17, town: true, flicker: !!L.flicker, base: 13 };
    lights.push(light);
    halos.push({ p: [lx, ly - 0.1, lz], size: 2.6, color, k: 0.85, light });
    pool(lx, lz, 6.5, color, 0.3);
    wet.push({ p: [lx, 0, lz], size: 2.6, color, k: 0.9, light: light.id });
  }
  function catenary(out, ax, az, bx, bz, h, off) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    catenaryPts(out, [ax + nx * off, h, az + nz * off], [bx + nx * off, h, bz + nz * off], 0.25 + L * 0.018);
  }
  function catenaryPts(out, a, b, sag) {
    const n = 10; let px = a[0], py = a[1], pz = a[2];
    for (let i = 1; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t); out.push(px, py, pz, x, y, z); px = x; py = y; pz = z; }
  }
  function propAt(p) {
    const ry = p.ry || 0, c = Math.cos(ry), s = Math.sin(ry);
    const at = (lx, lz) => [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
    const pb = (key, lx, y, lz, w, h, d, color, opt = {}) => { const [x, z] = at(lx, lz); return B.box(key, x, y, z, w, h, d, color, Object.assign({ ry, edges: false }, opt)); };
    switch (p.kind) {
      case 'mirror': { prop(p.x, 1.6, p.z, 0.08, 3.2, 0.08, 0xd8d8d8); const g = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 18); g.rotateX(Math.PI / 2); g.rotateY(ry); g.translate(p.x, 3.0, p.z); B.add('prop', g, 0xe86a20); const g2 = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 18); g2.rotateX(Math.PI / 2); g2.rotateY(ry); g2.translate(p.x, 3.0, p.z); B.add('glow', g2, 0x4a5a78); break; }
      case 'vending': { pb('prop', 0, 0.95, 0, 0.9, 1.9, 0.8, p.color); pb('glow', 0, 1.25, 0.41, 0.74, 0.8, 0.02, 0xd8ecff); pb('glow', 0, 0.55, 0.41, 0.6, 0.16, 0.02, 0x2a2a30); pb('prop', 0, 0.3, 0.42, 0.4, 0.14, 0.04, 0x1a1a1a);
        const [hx, hz] = at(0, 0.9); halos.push({ p: [hx, 1.2, hz], size: 1.6, color: 0xbfe4ff, k: 0.55 }); lights.push({ id: 'vend_' + p.x, pos: [hx, 1.4, hz], color: 0x9fd0ff, intensity: 3, dist: 5, town: true, vending: true }); pool(hx, hz, 1.6, 0xbfe4ff, 0.4); break; }
      case 'garbage': { pb('prop', 0, 0.02, 0, 2.2, 0.04, 1.2, 0x6a6a6a); for (const [lx, lz, w, d] of [[-1.08, 0, 0.04, 1.2], [1.08, 0, 0.04, 1.2], [0, -0.58, 2.2, 0.04]]) pb('tex', lx, 0.55, lz, w, 1.1, d, 0x60b070, { tile: 'fence', ts: 0.6 }); pb('prop', 0, 1.1, 0, 2.2, 0.05, 1.2, 0x3a7a4a);
        for (let k = 0; k < 4; k++) { const g = new THREE.IcosahedronGeometry(0.28, 0); const [x, z] = at(-0.7 + k * 0.45, 0.1 - (k % 2) * 0.2); g.translate(x, 0.26, z); B.add('prop', g, [0xe8e8e0, 0x40a0e0, 0xe8e8e0, 0xe0d040][k]); }
        const uv = signUV('ごみ集積所　第3班（仮）', { bg: '#f0f4e8', fg: '#2a5a2a', size: 28 }); const [x, z] = at(0, -0.6); B.box('sign', x, 0.9, z, 1.4, 0.3, 0.02, 0xffffff, { uv, face: 5, edges: false }); break; }
      case 'busstop': { prop(p.x - 1.4, 1.2, p.z, 0.08, 2.4, 0.08, 0x8a8a8a); const uv = signUV(p.name, { bg: '#2a6a3a', fg: '#ffffff', size: 28 }); B.box('sign', p.x - 1.4, 2.3, p.z + 0.05, 0.9, 0.5, 0.04, 0xffffff, { uv, face: 4, edges: false }); prop(p.x - 1.4, 1.2, p.z + 0.06, 0.4, 0.6, 0.04, 0xf0f0e8);
        tb('glass', p.x + 0.2, 1.2, p.z - 0.4, 3.0, 2.2, 0.04, 0x506070); prop(p.x + 0.2, 2.35, p.z, 3.2, 0.08, 1.0, 0x5a6068); tb('tex', p.x + 0.2, 0.45, p.z - 0.15, 2.4, 0.06, 0.38, 0xffffff, 'wood', { ts: 1 }); B.box('glow', p.x + 0.2, 2.28, p.z, 1.6, 0.04, 0.08, 0xe8f0ff, { edges: false }); halos.push({ p: [p.x + 0.2, 2.2, p.z + 0.2], size: 1.4, color: 0xd8e8ff, k: 0.45 }); break; }
      case 'bikes': for (let k = 0; k < p.n; k++) bike(p.x, p.z + (k - p.n / 2) * 0.7 + (p.x < 0 ? 0 : 0.3), ry, [0x2a2a30, 0xb03a3a, 0x3a6ab0, 0xe8e8e0, 0x3a7a4a][k % 5]); prop(p.x, 0.3, p.z, 0.06, 0.6, p.n * 0.7, 0x8a8a8a); break;
      case 'bike': bike(p.x, p.z, ry, 0x3a5ab0); break;
      case 'car': car(p); break;
      case 'cone': { const g = new THREE.ConeGeometry(0.18, 0.7, 10); g.translate(p.x, 0.35, p.z); B.add('prop', g, 0xe85a1a); prop(p.x, 0.03, p.z, 0.4, 0.06, 0.4, 0x2a2a2a); prop(p.x, 0.45, p.z, 0.2, 0.08, 0.2, 0xf0f0f0); break; }
      case 'sign': { prop(p.x, 1.2, p.z, 0.07, 2.4, 0.07, 0xb8b8b8); if (p.tri) { const g = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 3); g.rotateX(Math.PI / 2); g.translate(p.x, 2.25, p.z - 0.06); B.add('prop', g, 0xeeeeee); const g2 = new THREE.CylinderGeometry(0.34, 0.34, 0.035, 3); g2.rotateX(Math.PI / 2); g2.translate(p.x, 2.235, p.z - 0.035); B.add('prop', g2, p.color); } else { const uv = signUV(p.text, { bg: '#2a6ad0', fg: '#ffffff', size: 36 }); B.box('sign', p.x, 2.25, p.z - 0.05, 0.6, 0.5, 0.03, 0xffffff, { uv, face: 5, edges: false }); } break; }
      case 'planter': tb('tex', p.x, 0.35, p.z, 0.6, 0.7, 0.6, 0xffffff, 'concrete', { ts: 1 }); { const g = new THREE.IcosahedronGeometry(0.4, 1); g.translate(p.x, 0.95, p.z); applyTile(g, 'hedge', { ts: 1 }); B.add('tex', g, 0xa0c090, false); } break;
      case 'board': { const uv = signUV(p.text, { bg: '#f7f3e6', fg: '#203050', size: 24, weight: 'normal' }); B.box('sign', p.x, 1.2, p.z, 1.0, 0.4, 0.03, 0xffffff, { uv, face: 4, edges: false }); break; }
      case 'snowpole': { prop(p.x, 2.5, p.z, 0.06, 5.0, 0.06, 0xe8e8e8); for (let y = 0.4; y < 4.6; y += 0.6) prop(p.x, y, p.z, 0.07, 0.3, 0.07, 0xc8302a); const g = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 3); g.rotateZ(Math.PI / 2); g.translate(p.x - 0.1, 5.0, p.z); B.add('prop', g, 0xe8e8e8); break; }
    }
  }
  function bike(x, z, ry, color) {
    const c = Math.cos(ry), s = Math.sin(ry), at = (l) => [x + l * c, z - l * s];
    for (const l of [-0.48, 0.48]) { const g = new THREE.TorusGeometry(0.3, 0.03, 6, 16); g.rotateY(ry); const [px, pz] = at(l); g.translate(px, 0.32, pz); B.add('prop', g, 0x1a1a1a); }
    B.box('prop', x, 0.55, z, 0.9, 0.05, 0.05, color, { ry, edges: false }); B.box('prop', ...[at(-0.3)[0], 0.75, at(-0.3)[1]], 0.25, 0.06, 0.14, 0x1a1a1a, { ry, edges: false });
    B.box('prop', ...[at(0.45)[0], 0.85, at(0.45)[1]], 0.06, 0.06, 0.5, 0x5a5a5a, { ry, edges: false }); B.box('prop', ...[at(0.55)[0], 0.72, at(0.55)[1]], 0.3, 0.2, 0.3, 0x3a3a3a, { ry, edges: false });
  }
  function car(p) {
    const ry = p.ry || 0, c = Math.cos(ry), s = Math.sin(ry), L = p.kei ? 3.4 : 4.3, Wd = p.kei ? 1.48 : 1.75;
    const part = (w, h, d, ox, oy, oz, col, key = 'prop') => { const g = new THREE.BoxGeometry(w, h, d); g.translate(ox, oy, oz); g.rotateY(ry); g.translate(p.x, 0, p.z); return B.add(key, g, col); };
    part(Wd, 0.62, L, 0, 0.58, 0, p.color); part(Wd - 0.12, p.kei ? 0.7 : 0.55, L * (p.kei ? 0.62 : 0.5), 0, p.kei ? 1.2 : 1.13, p.kei ? -0.15 : -0.1, p.color);
    part(Wd - 0.18, p.kei ? 0.55 : 0.45, 0.04, 0, p.kei ? 1.2 : 1.12, L * (p.kei ? 0.31 : 0.25) - 0.1, 0x10141c, 'glass'); part(0.04, 0.42, L * 0.45, (Wd - 0.1) / 2, 1.13, -0.1, 0x10141c, 'glass'); part(0.04, 0.42, L * 0.45, -(Wd - 0.1) / 2, 1.13, -0.1, 0x10141c, 'glass');
    for (const [wx, wz] of [[-Wd / 2 + 0.1, L * 0.32], [Wd / 2 - 0.1, L * 0.32], [-Wd / 2 + 0.1, -L * 0.32], [Wd / 2 - 0.1, -L * 0.32]]) { const g = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 12); g.rotateZ(Math.PI / 2); g.translate(wx, 0.31, wz); g.rotateY(ry); g.translate(p.x, 0, p.z); B.add('prop', g, 0x1a1a1e); }
    for (const sx of [-1, 1]) { part(0.3, 0.12, 0.04, sx * (Wd / 2 - 0.25), 0.72, L / 2, p.abandoned ? 0xffe0a0 : 0xd8d8c8, 'glow'); part(0.3, 0.12, 0.04, sx * (Wd / 2 - 0.25), 0.72, -L / 2, 0x8a1a1a, 'glow'); }
    if (p.abandoned || p.hazard) { for (const sx of [-1, 1]) { const hx = p.x + (sx * (Wd / 2 - 0.25)) * c + (L / 2 + 0.3) * s, hz = p.z - (sx * (Wd / 2 - 0.25)) * s + (L / 2 + 0.3) * c; halos.push({ p: [hx, 0.72, hz], size: 0.9, color: 0xffa020, k: 0.8, hazard: true }); } if (p.abandoned) spots.push({ id: 'town_car', kind: 'read', x: p.x + 2.2 * s, z: p.z + 2.2 * c + 1.4, r: 1.6, label: '乗り捨てられた車', text: 'town_car' }); }
  }
}

function mergeLite(list) {
  const names = ['position', 'normal', 'uv', 'color'];
  const out = new THREE.BufferGeometry();
  const idx = []; let base = 0;
  for (const g of list) { const n = g.attributes.position.count; const ix = g.index ? g.index.array : [...Array(n).keys()]; for (const i of ix) idx.push(i + base); base += n; }
  for (const k of names) { const size = list[0].attributes[k].itemSize; let total = 0; for (const g of list) total += g.attributes[k].count; const arr = new Float32Array(total * size); let o = 0; for (const g of list) { arr.set(g.attributes[k].array, o); o += g.attributes[k].count * size; } out.setAttribute(k, new THREE.BufferAttribute(arr, size)); }
  out.setIndex(idx); out.computeBoundingSphere();
  return out;
}
