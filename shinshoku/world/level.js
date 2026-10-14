// 区画を組み立てる（灰色の箱＋簡単な色・トゥーン）。静的な箱は材質ごとに 1 つの網へまとめ、描画呼び出しを減らす。
// 看板の文字は 1 枚の地図帳（atlas）キャンバスにまとめる。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVEL } from '../data/level.js';
import { box as cbox } from './collide.js';
import { toon, gradientMap, canvasTex, JP_FONT, JP_SERIF } from '../render/toon.js';

const ATLAS_W = 1024, ATLAS_H = 1024, SLOT_W = 512, SLOT_H = 64;

export class Atlas {
  constructor() {
    this.c = document.createElement('canvas'); this.c.width = ATLAS_W; this.c.height = ATLAS_H;
    this.g = this.c.getContext('2d'); this.n = 0;
    this.g.fillStyle = '#222'; this.g.fillRect(0, 0, ATLAS_W, ATLAS_H);
  }
  /** 1 枠に描いて UV の範囲を返す */
  add(draw) {
    const col = this.n % 2, row = Math.floor(this.n / 2); this.n++;
    const x = col * SLOT_W, y = row * SLOT_H;
    this.g.save(); this.g.translate(x, y); this.g.beginPath(); this.g.rect(0, 0, SLOT_W, SLOT_H); this.g.clip(); draw(this.g, SLOT_W, SLOT_H); this.g.restore();
    return { u0: (x + 1) / ATLAS_W, u1: (x + SLOT_W - 1) / ATLAS_W, v0: 1 - (y + SLOT_H - 1) / ATLAS_H, v1: 1 - (y + 1) / ATLAS_H };
  }
  texture() { const t = new THREE.CanvasTexture(this.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
}
export function signDraw(text, opt = {}) {
  return (g, w, h) => {
    const bg = opt.bg || '#efe6d2', fg = opt.fg || '#2a1a14';
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (opt.frame !== false) { g.strokeStyle = opt.frameColor || 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = opt.size || 40; g.font = `${opt.weight || 'bold'} ${size}px ${opt.serif ? JP_SERIF : JP_FONT}`;
    while (g.measureText(text).width > w - 30 && size > 12) { size -= 2; g.font = `${opt.weight || 'bold'} ${size}px ${opt.serif ? JP_SERIF : JP_FONT}`; }
    g.fillText(text, w / 2, h / 2 + 2);
    if (opt.dirt) { g.fillStyle = 'rgba(30,20,10,.18)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 1 + Math.random() * 3); }
  };
}

/** 材質ごとに箱を集めて最後にまとめる */
export class Builder {
  constructor() { this.groups = new Map(); this.edges = []; }
  add(key, geo, color) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.attributes.position.count, c = new THREE.Color(color == null ? 0xffffff : color);
    const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    if (!this.groups.has(key)) this.groups.set(key, []);
    this.groups.get(key).push(g);
    return g;
  }
  box(key, cx, cy, cz, w, h, d, color, opt = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (opt.uv) {                                                  // 指定の面だけ地図帳の範囲へ。他の面は枠の端
      const uv = geo.attributes.uv; const face = opt.face;           // 面の順：+x,-x,+y,-y,+z,-z（各 4 頂点）
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
        const i = f * 4 + k; const u = uv.getX(i), v = uv.getY(i);
        if (f === face) uv.setXY(i, opt.uv.u0 + (opt.uv.u1 - opt.uv.u0) * u, opt.uv.v0 + (opt.uv.v1 - opt.uv.v0) * v);
        else uv.setXY(i, opt.uv.u0 + 0.001, opt.uv.v0 + 0.001);
      }
    } else if (opt.uvScale) {
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * opt.uvScale[0], uv.getY(i) * opt.uvScale[1]);
    }
    if (opt.ry) geo.rotateY(opt.ry);
    if (opt.rz) geo.rotateZ(opt.rz);
    if (opt.rx) geo.rotateX(opt.rx);
    geo.translate(cx, cy, cz);
    if (opt.edges !== false && key !== 'glow' && key !== 'glass' && key !== 'lamp') this.edges.push(new THREE.EdgesGeometry(geo, 30));
    return this.add(key, geo, color);
  }
  build(mats) {
    const root = new THREE.Group();
    for (const [key, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      const m = new THREE.Mesh(merged, mats[key]); m.name = 'lv_' + key;
      m.receiveShadow = key !== 'glow' && key !== 'glass' && key !== 'sign' && key !== 'lamp';
      m.castShadow = key === 'wall' || key === 'prop';
      root.add(m);
    }
    if (this.edges.length) {
      const e = new THREE.LineSegments(mergeGeometries(this.edges, false), new THREE.LineBasicMaterial({ color: 0x0b0710, transparent: true, opacity: 0.55, fog: true }));
      e.userData.isEdgeLines = true; e.name = 'lv_edges'; root.add(e);
    }
    return root;
  }
}

export function shutterTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#b4bac2' : '#7f858d'; g.fillRect(0, y, w, 3); }
    g.fillStyle = 'rgba(40,30,20,.18)'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 6 + Math.random() * 40);
    g.fillStyle = 'rgba(20,20,20,.35)'; g.fillRect(0, h - 18, w, 18);
  });
}
export function groundTex(opt = {}) {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = opt.base || '#3a3640'; g.fillRect(0, 0, w, h);
    const s = 64; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const k = ((x + y) / s) % 2; g.fillStyle = k ? '#45404c' : '#3c3843'; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 80; i++) g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 8, 1 + Math.random() * 2);
    // 水たまり（濡れた地面：少し暗く青い）
    for (let i = 0; i < 5; i++) { const x = Math.random() * w, y = Math.random() * h, r = 14 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(20,24,44,.55)'); gr.addColorStop(1, 'rgba(20,24,44,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); g.fill(); }
  }, opt);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...(opt.repeat || [30, 80])); return t;
}

/** 商店街＋自宅（area 'shotengai'）。戻り値は区画の組（world/areas.js の形）。opt.state：'normal'（序章）|'outbreak' */
export function buildLevel(_unused, opt = {}) {
  const scene = new THREE.Group(); scene.name = 'area_shotengai';
  const L = LEVEL, B = new Builder(), atlas = new Atlas();
  const boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => { boxes.push(cbox(cx, cz, w, d, h, y0)); };
  const WALL = 0x8a8494, WALL2 = 0x6e6878, DARK = 0x2a2630, PILLAR = 0x5a5560;

  // 地面
  const gtex = groundTex();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 160), new THREE.MeshToonMaterial({ color: 0xffffff, map: gtex, gradientMap: gradientMap() }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -30); ground.receiveShadow = true; ground.name = 'ground';
  scene.add(ground);
  // 道の中央の溝（排水）
  B.box('prop', 0, 0.01, -33, 0.25, 0.02, 76, 0x24222a, { edges: false });

  // ── 店の並び ──
  for (const s of L.shops) {
    const zc = (s.z0 + s.z1) / 2, len = Math.abs(s.z1 - s.z0), sx = s.side;
    const face = sx * 4.5;                                           // 通りに面した x
    if (s.open) { buildShopInterior(B, atlas, s, boxes, spots, dyn); continue; }
    const depth = 6, bx = face + sx * depth / 2;
    B.box('wall', bx, 3.5, zc, depth, 7, len - 0.02, WALL2);
    solid(bx, zc, depth, len, 7);
    // 柱
    for (const z of [s.z0 - 0.15 * Math.sign(s.z1 - s.z0), s.z1 + 0.15 * Math.sign(s.z1 - s.z0)]) B.box('wall', face - sx * 0.12, 1.5, z, 0.3, 3.0, 0.3, PILLAR);
    // シャッター（戸がある店は戸の分を空ける）
    const door = s.door ? L.doors[s.door] : null;
    const shW = len - 0.7;
    if (door) {
      const dz = door.z, a = Math.min(s.z0, s.z1) + 0.35, b = Math.max(s.z0, s.z1) - 0.35;
      const segs = [[a, dz - 0.75], [dz + 0.75, b]];
      for (const [p, q] of segs) if (q - p > 0.3) B.box('shutter', face - sx * 0.05, 1.3, (p + q) / 2, 0.08, 2.6, q - p, 0xffffff, { uvScale: [1, 1] });
    } else B.box('shutter', face - sx * 0.05, 1.3, zc, 0.08, 2.6, shW, 0xffffff);
    // 看板・ひさし・2 階の窓
    const uv = atlas.add(signDraw(s.sign, { bg: s.sign === '空き店舗' ? '#6d6870' : '#efe6d2', dirt: true }));
    B.box('sign', face - sx * 0.16, 3.25, zc, 0.22, 0.62, len - 0.6, 0xffffff, { uv, face: sx > 0 ? 1 : 0 });
    B.box('wall', face - sx * 0.45, 2.75, zc, 0.8, 0.08, len - 0.3, s.awn, { rz: sx * 0.18 });
    const lit = (Math.abs(zc * 7) % 5) < 1.2;
    for (const k of [-1, 1]) B.box(lit && k > 0 ? 'glow' : 'glass', face - sx * 0.03, 4.9, zc + k * len / 4, 0.06, 1.1, len / 3, lit && k > 0 ? 0x6a5236 : 0x14161c, { edges: false });
    if (s.note) {
      const nuv = atlas.add(signDraw(s.note, { bg: '#f4f1e8', fg: '#333', size: 30, weight: 'normal' }));
      B.box('sign', face - sx * 0.1, 1.6, zc + 0.6, 0.02, 0.22, 1.6, 0xffffff, { uv: nuv, face: sx > 0 ? 1 : 0 });
    }
    if (s.vending) {                                                 // 自販機（温かい缶コーヒー）
      const vx = face - sx * 0.55, vz = s.z1 + 1.6;
      B.box('wall', vx, 0.9, vz, 0.7, 1.8, 1.0, 0xc83a3a);
      B.box('glow', vx - sx * 0.36, 1.15, vz, 0.02, 0.9, 0.8, 0xbfe4ff, { edges: false });
      solid(vx, vz, 0.7, 1.0, 1.8);
      spots.push({ id: 'vending', kind: 'vending', x: vx - sx * 0.6, z: vz, r: 1.3, label: '自販機を調べる' });
    }
    if (s.board) {                                                   // 回覧板
      const buv = atlas.add(signDraw('回覧：夜間の外出はひかえてください', { bg: '#f7f3e6', fg: '#203050', size: 26, weight: 'normal' }));
      B.box('sign', face - sx * 0.12, 1.5, zc - 1.5, 0.04, 0.5, 2.2, 0xffffff, { uv: buv, face: sx > 0 ? 1 : 0 });
      spots.push({ id: 'board', kind: 'read', x: face - sx * 0.7, z: zc - 1.5, r: 1.3, label: '回覧板を読む', text: 'board' });
    }
    if (s.clock) {                                                   // 止まった時計（数字は決めない：針だけ）
      const clg = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 24); clg.rotateZ(Math.PI / 2); clg.translate(face - sx * 0.12, 3.95, zc + 1.6); B.add('prop', clg, 0xf2eee0);
      for (const [l, a] of [[0.3, 0.6], [0.22, 2.4]]) { const hg = new THREE.BoxGeometry(0.02, l, 0.03); hg.translate(0, l / 2, 0); hg.rotateX(a); hg.translate(face - sx * 0.17, 3.95, zc + 1.6); B.add('prop', hg, 0x111111); }
      halos.push({ p: [face - sx * 0.2, 3.95, zc + 1.6], size: 1.2, color: 0xf0e8d0, k: 0.25 });
      spots.push({ id: 'clock', kind: 'read', x: face - sx * 0.8, z: zc + 1.6, r: 1.4, label: '時計を見る', text: 'clock' });
    }
    spots.push({ id: 'shop_' + s.sign, kind: 'read', x: face - sx * 0.7, z: zc, r: 1.1, label: '調べる', text: 'shutter', sign: s.sign, low: true });
  }
  // 戸（帰路の家）
  for (const [id, d] of Object.entries(L.doors)) {
    // 戸の板だけ動く網（1 つ）。枠・表札・灯りは区画の網へまとめる（描画呼び出しを減らす）
    const g = new THREE.Group(); g.name = 'door_' + id;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 1.2), toon(0x5a3a2a)); leaf.position.y = 1.03; leaf.castShadow = true;
    const pivot = new THREE.Group(); pivot.position.set(0, 0, -0.6); leaf.position.z = 0.6; pivot.add(leaf); g.add(pivot);
    B.box('wall', d.x - d.face * 0.05, 1.1, d.z, 0.12, 2.2, 1.45, 0x2a2026);
    const puv = atlas.add(signDraw(d.name, { bg: '#f1e9d6', fg: '#1d1712', size: 46, serif: true }));
    B.box('sign', d.x + d.face * 0.07, 2.35, d.z + 0.45, 0.02, 0.13, 0.42, 0xffffff, { uv: puv, face: d.face > 0 ? 0 : 1, edges: false });
    B.box('glow', d.x + d.face * 0.18, 2.4, d.z - 0.45, 0.14, 0.14, 0.14, d.color, { edges: false });
    const halo = halos.push({ p: [d.x + d.face * 0.26, 2.4, d.z - 0.45], size: 0.9, color: d.color, k: 0.9, door: id }) - 1;
    g.position.set(d.x, 0, d.z);
    scene.add(g);
    if (!d.alongX) { /* 店の並びの戸：店の箱が当たり判定 */ } else solid(d.x - d.face * 0.25, d.z, 0.5, 3.2, 3);
    dyn['door_' + id] = { group: g, pivot, halo, open: false, color: d.color, face: d.face };
    spots.push({ id: 'door_' + id, kind: 'door', door: id, x: d.front[0], z: d.front[1], r: 1.4, label: `戸の鍵を開ける（表札「${d.name}」）` });
  }

  // ── 脇道 ──
  for (const a of L.alleys) {
    const sx = a.side, z0 = Math.max(a.z0, a.z1), z1 = Math.min(a.z0, a.z1), zc = (z0 + z1) / 2;
    const xA = sx * 4.5 + sx * 6, xEnd = sx * (4.5 + a.len);           // 店の奥（x=±10.5）からの区間
    const midX = (xA + xEnd) / 2, w = Math.abs(xEnd - xA);
    for (const z of [z0 + 0.2, z1 - 0.2]) { B.box('wall', midX, 2.5, z, w, 5, 0.4, WALL); solid(midX, z, w, 0.4, 5); }
    B.box('wall', xEnd + sx * 0.3, 2.5, zc, 0.6, 5, Math.abs(z0 - z1) + 0.8, WALL); solid(xEnd + sx * 0.3, zc, 0.6, Math.abs(z0 - z1) + 0.8, 5);
    // ごみ箱・室外機・配管
    B.box('prop', sx * 8.2, 0.45, z0 - 0.45, 0.6, 0.9, 0.6, 0x3a5a3a); solid(sx * 8.2, z0 - 0.45, 0.6, 0.6, 0.9);
    B.box('prop', sx * 12.5, 0.35, z1 + 0.45, 0.8, 0.7, 0.5, 0x8a8a8a); solid(sx * 12.5, z1 + 0.45, 0.8, 0.5, 0.7);
    B.box('prop', midX, 3.6, z0 - 0.1, w, 0.08, 0.08, 0x4a4a52, { edges: false });
  }

  // ── アーケードの屋根と入口のアーチ ──
  B.box('glass', 0, 6.6, -38, 9.6, 0.08, 68, 0x1a1c26, { edges: false });
  for (let z = -6; z >= -70; z -= 6) {
    B.box('wall', 0, 6.45, z, 9.4, 0.25, 0.25, DARK);
    const on = Math.abs(z) % 18 !== 0;
    B.box(on ? 'lamp' : 'prop', 0, 6.2, z + 3, 0.18, 0.06, 1.6, on ? 0xd8ecff : 0x3a3a44, { edges: false });
    halos.push({ p: [0, 6.05, z + 3], size: 1.7, color: 0xd8ecff, k: on ? 0.45 : 0.0, strip: true, z: z + 3, onOutbreak: on && Math.abs(z) % 24 === 0 });
  }
  for (const x of [-4.75, 4.75]) { B.box('wall', x, 3.4, -4, 0.45, 6.8, 0.45, DARK); solid(x, -4, 0.45, 0.45, 6.8); }
  const archUV = atlas.add(signDraw(L.streetName, { bg: '#2a1f3a', fg: '#ffd9a8', size: 44, frameColor: '#ffb070' }));
  B.box('sign', 0, 5.7, -4, 9.4, 1.0, 0.35, 0xffffff, { uv: archUV, face: 4 });
  B.box('sign', 0, 5.7, -4.001, 9.4, 1.0, 0.35, 0xffffff, { uv: archUV, face: 5, edges: false });

  // ── 自宅までの路地（z −4〜6）：隣の家の塀 ──
  for (const sx of [-1, 1]) {
    B.box('wall', sx * 7.5, 0.8, 1, 6, 1.6, 10, 0x6a6470); solid(sx * 7.5, 1, 6, 10, 1.6);
    B.box('wall', sx * 9.5, 3, 1, 4, 6, 9, WALL2); solid(sx * 9.5, 1, 4, 9, 6);
    B.box('wall', sx * 4.6, 0.8, 1, 0.2, 1.6, 10, 0x77707c); solid(sx * 4.6, 1, 0.2, 10, 1.6);
  }
  // 電柱と街灯
  B.box('prop', 3.9, 3.5, 3.6, 0.28, 7, 0.28, 0x5a5650); solid(3.9, 3.6, 0.3, 0.3, 7);
  B.box('prop', 3.3, 5.0, 3.6, 1.2, 0.08, 0.1, 0x5a5650);
  B.box('glow', 2.8, 4.92, 3.6, 0.4, 0.06, 0.2, 0xffe2b0, { edges: false });

  // ── 自宅 ──
  buildHome(B, atlas, scene, boxes, spots, dyn);

  // ── 通りの終わり（ふさがれた道） ──
  B.box('prop', 1.2, 1.3, -70.2, 3.6, 2.6, 2.2, 0xd8d8d8, { ry: 0.2 });
  B.box('prop', -2.6, 0.9, -69.5, 2.4, 1.8, 0.2, 0x8a9098, { rz: 0.5 });
  for (const x of [-3.5, -1.0, 3.6]) B.box('prop', x, 0.35, -68.2, 0.35, 0.7, 0.35, 0xe06a20);
  solid(0, -70.6, 9, 2.8, 3);
  B.box('wall', 0, 3.5, -73.5, 12, 7, 1, DARK); solid(0, -73.5, 12, 1, 7);
  spots.push({ id: 'barricade', kind: 'read', x: 0, z: -68, r: 2.2, label: '調べる', text: 'barricade' });
  // 通りの横の端（アーケードの外へ出ない）：店の箱が壁になる

  // 材質
  const atlasTex = atlas.texture();
  const mats = {
    wall: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
    prop: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
    shutter: new THREE.MeshToonMaterial({ vertexColors: true, map: shutterTex(), gradientMap: gradientMap() }),
    sign: new THREE.MeshBasicMaterial({ map: atlasTex, color: 0xb8b0c0 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    lamp: new THREE.MeshBasicMaterial({ vertexColors: true }),
    glass: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    floor: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
  };
  const root = B.build(mats); root.name = 'level';
  dyn.lampMat = mats.lamp;
  scene.add(root);
  if (dyn.heitenShutter) scene.add(dyn.heitenShutter.mesh);
  scene.updateMatrixWorld(true);

  // 点光源（区画の定義だけ返す。光の実体は main の使い回しの組に割り当てる＝光の数を変えない＝シェーダーを作り直さない）
  const lights = L.lights.concat([Object.assign({ home: true }, L.homeLight)]).map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) {
    if (l.shop || l.vending || l.home) continue;
    halos.push({ p: [l.pos[0], l.pos[1] - 0.15, l.pos[2]], size: 2.6, color: l.color, k: 0.8, light: l });
  }
  // 濡れた地面の光の筋（屋根の無い所＝自宅の前の路地）
  const wet = [{ p: [2.8, 0, 3.6], size: 1.6, color: 0xffd2a0, k: 0.9 }, { p: [0, 0, 4.5], size: 1.3, color: 0xffc890, k: 0.6 }];
  // 裏路地へ（空き店舗の奥）・隠れ場所（柱の陰・自販機の横）
  spots.push({ id: 'exit_alley', kind: 'exit', to: 'alley', spawn: 'from_street', x: -3.7, z: -66.5, r: 1.6, label: '空き店舗の奥へ（裏路地）' });
  B.box('glass', -4.47, 0.6, -66.5, 0.06, 1.2, 2.2, 0x050408, { edges: false });
  for (const [x, z] of [[-3.6, -9.8], [3.6, -21.8], [-3.6, -36.6], [3.6, -45.4], [-3.6, -55.2], [-1.6, 14.6], [3.8, -27.8]]) hideSpots.push({ x, z });
  const surface = (x, z) => (z > 6 ? (z > 9 ? 'wood' : 'tile') : x > 4.6 && z < -35 && z > -45 ? 'tile' : z > -4 ? 'wet' : 'asphalt');
  return { id: 'shotengai', root: scene, boxes, spots, dyn, lights, halos, wet, hideSpots, surface, atlas, ground,
    rainRoof: (x, z) => z < -4 && z > -72 && Math.abs(x) < 4.8, indoor: (x, z) => z > LEVEL.home.minZ - 0.5,
    bounds: { minX: -17.5, maxX: 17.5, minZ: -73, maxZ: 16.5 }, spawns: { start: [0, 11.5, Math.PI], from_alley: [-3.0, -66.5, Math.PI / 2], arcade: [0, -2, Math.PI], home_in: [0, 8.6, 0] } };
}

function buildShopInterior(B, atlas, s, boxes, spots, dyn) {
  const H = LEVEL.heiten, z0 = s.z0, z1 = s.z1, zc = (z0 + z1) / 2, len = Math.abs(z1 - z0);
  const solid = (cx, cz, w, d, h = 4, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  B.box('wall', 11.2, 2, zc, 0.4, 4, len, 0x7a8a80); solid(11.2, zc, 0.4, len, 4);
  for (const z of [z0 - 0.15, z1 + 0.15]) { B.box('wall', 7.8, 2, z, 6.8, 4, 0.3, 0x7a8a80); solid(7.8, z, 6.8, 0.3, 4); }
  B.box('wall', 7.8, 3.25, zc, 6.8, 0.2, len, 0x5a6a62);              // 天井
  boxes.push(cbox(7.8, zc, 6.8, len, 0.3, 3.2));
  B.box('wall', 7.8, 5.2, zc, 6.8, 3.6, len, 0x6e6878); solid(7.8, zc, 6.8, len, 3.6, 3.4);
  B.box('floor', 7.8, 0.01, zc, 6.6, 0.02, len - 0.3, 0xb8c4bc, { edges: false });
  // 棚 2 列・冷蔵ケース・レジの台
  for (const x of [6.8, 8.6]) { B.box('prop', x, 0.75, -40.2, 0.6, 1.5, 5.2, 0xc8c0a8); solid(x, -40.2, 0.6, 5.2, 1.5); for (let k = 0; k < 4; k++) B.box('prop', x, 0.35 + k * 0.35, -40.2, 0.66, 0.05, 5.0, [0xd04a3a, 0x3a8ad0, 0xe0c040, 0x50a060][k], { edges: false }); }
  B.box('wall', 10.6, 1.0, -39.5, 0.8, 2.0, 6, 0x9ab0c0); B.box('glow', 10.18, 1.1, -39.5, 0.02, 1.6, 5.6, 0xdff4ff, { edges: false }); solid(10.6, -39.5, 0.8, 6, 2);
  B.box('prop', 9.6, 0.5, -43.6, 1.8, 1.0, 0.7, 0x6a5a4a); solid(9.6, -43.6, 1.8, 0.7, 1.0);
  // 看板
  const uv = atlas.add(signDraw(s.sign, { bg: '#e8f4ea', fg: '#14502c', dirt: true }));
  B.box('sign', 4.62, 3.6, zc, 0.22, 0.62, len - 0.4, 0xffffff, { uv, face: 1 });
  // 半分下りたシャッター（動く・当たり判定なし：頭の上）
  const shMat = new THREE.MeshToonMaterial({ color: 0xa0a6ae, gradientMap: gradientMap() });
  const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, len - 0.4), shMat); shutter.position.set(4.62, 2.65, zc); shutter.castShadow = true;
  dyn.heitenShutter = { mesh: shutter, up: 2.65, down: 1.95 };
  // 照明のスイッチ盤・レジ・立て看板（手伝う所）
  const hp = H.help;
  spots.push({ id: 'help_lights', kind: 'help', help: 'lights', x: hp.lights[0] - 0.5, z: hp.lights[1] - 0.6, r: 1.3, label: '照明のスイッチ' });
  spots.push({ id: 'help_register', kind: 'help', help: 'register', x: hp.register[0], z: hp.register[1] + 0.9, r: 1.3, label: 'レジ' });
  spots.push({ id: 'help_sign', kind: 'help', help: 'sign', x: hp.sign[0] - 0.4, z: hp.sign[1], r: 1.4, label: '立て看板' });
  B.box('prop', hp.lights[0], 1.4, hp.lights[1], 0.1, 0.4, 0.3, 0xe8e8e0);
  dyn.heitenSignPos = hp.sign;
}

function buildHome(B, atlas, scene, boxes, spots, dyn) {
  const H = LEVEL.home, solid = (cx, cz, w, d, h = 3.2, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const W = 0xd8cbb8, IN = 0xe8dcc6, half = H.door.w / 2;
  // 前の壁（戸口あり）
  const fl = (H.minX + -half) / 2, fr = (half + H.maxX) / 2, fw = -half - H.minX;
  B.box('wall', fl, 1.6, H.minZ, fw, 3.2, 0.3, W); solid(fl, H.minZ, fw, 0.3);
  B.box('wall', fr, 1.6, H.minZ, fw, 3.2, 0.3, W); solid(fr, H.minZ, fw, 0.3);
  B.box('wall', 0, 2.75, H.minZ, H.door.w, 0.9, 0.3, W); boxes.push(cbox(0, H.minZ, H.door.w, 0.3, 0.9, 2.3));
  B.box('wall', 0, 4.2, (H.minZ + H.maxZ) / 2, 12.6, 2.0, 10.6, 0x4a3a44);          // 屋根
  boxes.push(cbox(0, (H.minZ + H.maxZ) / 2, 12.6, 10.6, 2, 3.2));
  B.box('wall', 0, 3.25, (H.minZ + H.maxZ) / 2, 12, 0.1, 10, 0xf2e8d8);              // 天井
  for (const x of [H.minX, H.maxX]) { B.box('wall', x, 1.6, 11, 0.3, 3.2, 10, IN); solid(x, 11, 0.3, 10); }
  B.box('wall', 0, 1.6, H.maxZ, 12, 3.2, 0.3, IN); solid(0, H.maxZ, 12, 0.3);
  // 玄関の段・靴箱・ひさし・表札・玄関灯
  B.box('floor', 0, 0.06, 7.5, 4, 0.12, 3, 0x8a7a6a, { edges: false });
  B.box('floor', 0, 0.02, 12.5, 11.6, 0.04, 6.6, 0xc8a878, { edges: false });
  B.box('prop', 2.4, 0.5, 7.0, 1.2, 1.0, 0.4, 0x7a5a3a); solid(2.4, 7.0, 1.2, 0.4, 1.0);
  B.box('wall', 0, 2.6, 5.4, 2.6, 0.08, 1.2, 0x3a2a30, { rx: 0.2 });
  const puv = atlas.add(signDraw('だんのうら', { bg: '#f1e9d6', fg: '#2a1a14', size: 40, serif: true }));
  B.box('sign', 1.3, 2.0, 5.84, 0.9, 0.12, 0.03, 0xffffff, { uv: puv, face: 5 });
  B.box('glow', -1.1, 2.3, 5.86, 0.22, 0.22, 0.06, 0xffd8a0, { edges: false });
  // 居間：ソファ・低い机（ノートPC）・テレビ・本棚・金庫・カレンダー
  B.box('prop', -3.5, 0.35, 15.0, 3.0, 0.7, 1.0, 0x7a6a9a); solid(-3.5, 15.0, 3.0, 1.0, 0.7);
  B.box('prop', -3.8, 0.22, 13.0, 1.3, 0.44, 0.8, 0x8a6a4a); solid(-3.8, 13.0, 1.3, 0.8, 0.44);
  B.box('prop', -3.8, 0.47, 13.0, 0.45, 0.04, 0.32, 0x2a2a30);
  B.box('glow', -3.8, 0.6, 13.12, 0.42, 0.24, 0.02, 0x9ad0ff, { edges: false, rx: -0.3 });
  B.box('prop', 3.5, 0.3, 9.6, 1.6, 0.6, 0.5, 0x3a3236); B.box('prop', 3.5, 0.95, 9.6, 1.4, 0.75, 0.08, 0x111116); solid(3.5, 9.6, 1.6, 0.5, 1.2);
  // テレビの画面（砂嵐・一瞬の顔）
  const tvC = document.createElement('canvas'); tvC.width = 128; tvC.height = 72; const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace;
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.66), new THREE.MeshBasicMaterial({ map: tvT, color: 0x9a9aa8 })); tv.position.set(3.5, 0.95, 9.65); scene.add(tv);
  const tvDraw = kind => { const g = tvC.getContext('2d'); const im = g.createImageData(128, 72); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0);
    if (kind === 'face') { g.fillStyle = 'rgba(230,230,240,.92)'; g.fillRect(0, 0, 128, 72); g.fillStyle = '#3a3a44'; g.beginPath(); g.ellipse(64, 30, 15, 19, 0, 0, Math.PI * 2); g.fill(); g.fillRect(40, 48, 48, 30); g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(52, 50); g.lineTo(64, 66); g.lineTo(76, 50); g.lineTo(88, 72); g.lineTo(40, 72); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 72; y += 3) g.fillRect(0, y, 128, 1); }
    tvT.needsUpdate = true; };
  tvDraw('static'); dyn.tv = { mesh: tv, draw: tvDraw, kind: 'static' };
  // 刀掛け（登録証つきの古い持ち物：WEAPON_SYSTEM_SPEC §2 案a）
  B.box('prop', 5.9, 1.25, 14.0, 0.1, 0.08, 0.5, 0x3a2418); B.box('prop', 5.9, 1.55, 14.0, 0.1, 0.08, 0.5, 0x3a2418);
  const rk = new THREE.Group(); const rkM = new THREE.MeshToonMaterial({ color: 0x2a1630, gradientMap: gradientMap() });
  for (const y of [1.33, 1.63]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.95), rkM); k.position.set(5.82, y, 14.0); rk.add(k); }
  scene.add(rk); dyn.rackKatana = rk;
  B.box('prop', 5.5, 0.9, 12.0, 0.6, 1.8, 2.2, 0x6a4a3a); solid(5.5, 12.0, 0.6, 2.2, 1.8);
  for (let k = 0; k < 3; k++) B.box('prop', 5.25, 0.45 + k * 0.5, 12, 0.1, 0.32, 1.9, [0xc06070, 0x6080c0, 0xd0b050][k], { edges: false });
  const safe = H.maxX - 1.1;
  B.box('prop', safe, 0.4, 15.2, 0.75, 0.8, 0.7, 0x3a3e46); solid(safe, 15.2, 0.75, 0.7, 0.8);
  B.box('prop', safe, 0.45, 14.84, 0.18, 0.18, 0.04, 0xb0b0b8, { edges: false });
  const cuv = atlas.add(signDraw('カレンダー', { bg: '#fffaf0', fg: '#a03030', size: 26 }));
  B.box('sign', -1.6, 1.7, H.maxZ - 0.17, 0.6, 0.075, 0.02, 0xffffff, { uv: cuv, face: 5 });
  B.box('prop', -1.6, 1.45, H.maxZ - 0.17, 0.6, 0.45, 0.02, 0xfffaf0);
  // 調べる所
  const hs = LEVEL.homeSpots;
  spots.push({ id: 'safe', kind: 'safe', x: safe, z: 14.2, r: 1.2, label: '金庫' });
  spots.push({ id: 'laptop', kind: 'save', x: -3.8, z: 12.2, r: 1.3, label: 'ノートPC（セーブ）' });
  spots.push({ id: 'calendar', kind: 'read', x: hs.calendar[0], z: hs.calendar[1] - 0.9, r: 1.2, label: 'カレンダーを見る', text: 'calendar' });
  spots.push({ id: 'tv', kind: 'read', x: 3.5, z: 10.3, r: 1.2, label: 'テレビ', text: 'tv' });
  spots.push({ id: 'katana_rack', kind: 'rack', x: 5.0, z: 14.0, r: 1.1, label: '刀掛け' });
  spots.push({ id: 'sofa', kind: 'sofa', x: -3.5, z: 14.0, r: 1.2, label: 'ソファ' });
  void scene; void dyn;
}
