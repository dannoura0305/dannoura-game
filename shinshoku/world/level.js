// 区画を組み立てる（灰色の箱＋簡単な色・トゥーン）。静的な箱は材質ごとに 1 つの網へまとめ、描画呼び出しを減らす。
// 看板の文字は 1 枚の地図帳（atlas）キャンバスにまとめる。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVEL } from '../data/level.js';
import { skyDome } from '../render/sky.js';
import { box as cbox } from './collide.js';
import { toon, gradientMap, canvasTex, JP_FONT, JP_SERIF, ctx2d } from '../render/toon.js';
import { applyTile, townMats, TILE_KEYS } from '../render/townmat.js';
import { buildTown } from './town.js';
import { HOME_O, homeW, inHome, TOWN } from '../data/town.js';
import { kitCollector } from './envkit.js';
import { furnKit } from './furn.js';

const SLOT_W = 512, SLOT_H = 64;

export class Atlas {
  /** rows：枠の行の数・cols：1 行の枠の数。既定 32 行×2＝64 枠（1024×2048）。同じ絵（key）は 1 枠を使い回す */
  constructor(rows = 32, cols = 2) {
    this.H = rows * SLOT_H; this.cols = cols; this.W = cols * SLOT_W; this.max = rows * cols; this.memo = new Map();
    this.c = document.createElement('canvas'); this.c.width = this.W; this.c.height = this.H;
    this.g = ctx2d(this.c); this.n = 0;
    this.g.fillStyle = '#222'; this.g.fillRect(0, 0, this.W, this.H);
  }
  /** 同じ鍵なら同じ枠（看板の文字と色が同じ時） */
  addKey(key, draw) { if (this.memo.has(key)) return this.memo.get(key); const uv = this.add(draw); this.memo.set(key, uv); return uv; }
  /** 1 枠に描いて UV の範囲を返す（枠が足りない時は最後の枠を使い回す＝落ちない） */
  add(draw) {
    if (this.n >= this.max) { console.warn('atlas full'); this.n = this.max - 1; }
    const col = this.n % this.cols, row = Math.floor(this.n / this.cols); this.n++;
    const x = col * SLOT_W, y = row * SLOT_H, H = this.H, W = this.W;
    this.g.save(); this.g.translate(x, y); this.g.beginPath(); this.g.rect(0, 0, SLOT_W, SLOT_H); this.g.clip(); draw(this.g, SLOT_W, SLOT_H); this.g.restore();
    if (this.tex) this.tex.needsUpdate = true;
    return { u0: (x + 1) / W, u1: (x + SLOT_W - 1) / W, v0: 1 - (y + SLOT_H - 1) / H, v1: 1 - (y + 1) / H };
  }
  texture() { const t = new THREE.CanvasTexture(this.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; this.tex = t; return t; }
}
export function signDraw(text, opt = {}) {
  return (g, w, h) => {
    const bg = opt.bg || '#efe6d2', fg = opt.fg || '#2a1a14';
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (opt.frame !== false) { g.strokeStyle = opt.frameColor || 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opt.vertical) {   // P14：縦書き（袖看板・提灯）。枠の横（u）を板の縦に貼る：字は左回りに 90° 回して左から順に（world/shopkit.js の vsign）
      // aspect＝板の幅÷高さ：字が板の上で正方形になるように、枠の横（板の縦）へ伸ばす
      const ch = [...text].filter(c => c !== ' '), n = ch.length, sx = (w / h) * (opt.aspect || 0.4), size = Math.min(h * 0.84, (w - 24) / n / sx * 0.9), cell = size * sx / 0.9, x0 = (w - cell * n) / 2;
      g.font = `${opt.weight || 'bold'} ${size}px ${opt.serif ? JP_SERIF : JP_FONT}`;
      ch.forEach((c, i) => { g.save(); g.translate(x0 + cell * (i + 0.5), h / 2); g.rotate(-Math.PI / 2); g.scale(1, sx); g.fillText(c, 0, 1); g.restore(); });
      return;
    }
    let size = opt.size || 40; g.font = `${opt.weight || 'bold'} ${size}px ${opt.serif ? JP_SERIF : JP_FONT}`;
    while (g.measureText(text).width > w - 30 && size > 12) { size -= 2; g.font = `${opt.weight || 'bold'} ${size}px ${opt.serif ? JP_SERIF : JP_FONT}`; }
    g.fillText(text, w / 2, h / 2 + 2);
    if (opt.dirt) { g.fillStyle = 'rgba(30,20,10,.18)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 1 + Math.random() * 3); }
  };
}

// ── 焼いた頂点の陰（床との境目を暗く） ──
const AO_KEYS = new Set(['wall', 'prop', 'shutter']);
const sm01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function bakedAO(y) { return 0.58 + 0.42 * sm01(0.0, 1.1, y); }
/** 下の方だけ細かく分けた箱（陰のグラデーション用。上は 1 枚） */
function aoBox(w, h, d, hs) {
  const g = new THREE.BoxGeometry(w, h, d, 1, hs, 1);
  // 縦の分割を床の近く（下 2.4m）に寄せる
  const P = g.attributes.position, top = h / 2, bot = -h / 2, span = Math.min(h, 2.4);
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > bot + 1e-4 && y < top - 1e-4) { const t = (y - bot) / h; P.setY(i, bot + span * Math.pow(t, 1.4)); } }
  P.needsUpdate = true; g.computeVertexNormals(); return g;
}
/** まとめる材質（merge の時）：頂点色のトゥーン → tex、頂点色の光・暗いガラス（ほぼ不透明） → texglow、シャッター → tex（地図帳のシャッターの枠） */
const MERGE = { prop: 'tex', glow: 'texglow', shutter: 'tex', glass: 'texglow' };
/** 材質ごとに箱を集めて最後にまとめる */
/** Builder.edgesOff：辺の線を作らない（画質の段で線を使わない時：読み込みを速く） */
export class Builder {
  /** opt.cell：升目の大きさ（m）。升目ごとに網を分ける＝画面の外の升目は描かない（広い区画用）。無ければ材質ごとに 1 つ */
  constructor(opt = {}) { this.groups = new Map(); this.edges = new Map(); this.cell = opt.cell || 0; this.noEdges = Builder.edgesOff; this.merge = opt.merge ? MERGE : null; }
  cellOf(geo) {
    if (!this.cell) return '';
    geo.computeBoundingBox(); const b = geo.boundingBox;
    return Math.floor((b.min.x + b.max.x) / 2 / this.cell) + ',' + Math.floor((b.min.z + b.max.z) / 2 / this.cell);
  }
  add(key, geo, color, ao = AO_KEYS.has(key)) {
    if (this.cell && (key === 'wall' || key === 'floor')) key = 'prop';      // 広い区画：同じ材質（頂点色のトゥーン）はまとめる＝描画呼び出しを減らす
    if (this.merge && this.merge[key]) {                                    // フェーズ10：頂点色だけの材質も町の地図帳の白い枠で描く＝tex／texglow にまとめる（升目ごとの描画呼び出しを減らす）
      if (!geo.attributes.tileR) applyTile(geo, key === 'shutter' ? 'shutter' : 'white', key === 'shutter' ? { ts: 2.4, tsy: 2.6 } : { fit: true });
      key = this.merge[key];
    }
    if (TILE_KEYS.has(key) && !geo.attributes.tileR) applyTile(geo, 'concrete', { ts: 3 });
    if (!TILE_KEYS.has(key) && geo.attributes.tileR) geo.deleteAttribute('tileR');
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const n = g.attributes.position.count, c = new THREE.Color(color == null ? 0xffffff : color);
    const P = g.attributes.position;
    const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = ao ? bakedAO(P.getY(i)) : 1; arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    const gk = key + (this.fbOn ? '~fb' : '') + '@' + this.cellOf(g);
    if (!this.groups.has(gk)) this.groups.set(gk, []);
    this.groups.get(gk).push(g);
    return g;
  }
  /** P12：fn の中で作る形を「部品の代わりの網」にする（Blender の部品が読めたら隠す：world/envkit.js）。on＝false なら普通に作る */
  fb(on, fn) { if (!on) return fn(); const p = this.fbOn; this.fbOn = true; try { return fn(); } finally { this.fbOn = p; } }
  box(key, cx, cy, cz, w, h, d, color, opt = {}) {
    // フェーズ10：升目より長い箱（道・歩道・屋根）は升目の半分ずつに分ける＝遠くの升目の網の範囲が広がらない（画面の外で描かない）。
    // 絵は世界の座標で貼るので継ぎ目は出ない。回転は「分ける向きの軸のまわり」だけなら分けられる（アーケードの屋根）
    if (this.cell && !opt.uv && !opt.fit && !opt.uvScale && !opt.ry && !opt.noSplit) {
      const lim = this.cell * 0.6, sx = w > lim && !opt.rz && !opt.rx ? Math.ceil(w / (this.cell * 0.5)) : (w > lim && opt.rx && !opt.rz ? Math.ceil(w / (this.cell * 0.5)) : 1), sz = d > lim && !opt.rx && !opt.rz ? Math.ceil(d / (this.cell * 0.5)) : (d > lim && opt.rz && !opt.rx ? Math.ceil(d / (this.cell * 0.5)) : 1);
      if (sx > 1 || sz > 1) {
        if (!this.noEdges && !this.fbOn && opt.edges !== false && !['glow', 'glass', 'glass2', 'lamp', 'texglow'].includes(key)) { const g = new THREE.BoxGeometry(w, h, d); if (opt.rz) g.rotateZ(opt.rz); if (opt.rx) g.rotateX(opt.rx); g.translate(cx, cy, cz); const eg = new THREE.EdgesGeometry(g, 30), ek = this.cellOf(g); if (!this.edges.has(ek)) this.edges.set(ek, []); this.edges.get(ek).push(eg); }
        const o2 = Object.assign({}, opt, { edges: false, noSplit: true }), pw = w / sx, pd = d / sz;
        for (let i = 0; i < sx; i++) for (let j = 0; j < sz; j++) {
          // 回転した箱は、回転の軸の向き（z か x）にだけ分ける：中心は軸に沿ってずらす
          const ox = -w / 2 + (i + 0.5) * pw, oz = -d / 2 + (j + 0.5) * pd;
          this.box(key, cx + ox, cy, cz + oz, pw, h, pd, color, o2);
        }
        return null;
      }
    }
    // 床に近い所を暗くする（焼いた頂点の陰＝安いアンビエントオクルージョン）ため、高い箱は縦に分ける
    const aoOn = opt.ao ?? AO_KEYS.has(key);
    const y0 = cy - h / 2, hs = aoOn && y0 < 0.5 && h > 1.0 && !opt.uv && !opt.fit ? Math.min(6, Math.ceil(Math.min(h, 2.4) / 0.4)) : 1;
    const geo = hs > 1 ? aoBox(w, h, d, hs) : new THREE.BoxGeometry(w, h, d);
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
    if (opt.tile) applyTile(geo, opt.tile, opt);
    if (!this.noEdges && !this.fbOn && opt.edges !== false && key !== 'glow' && key !== 'glass' && key !== 'lamp' && key !== 'texglow') { const eg = new THREE.EdgesGeometry(geo, 30); const ek = this.cellOf(geo); if (!this.edges.has(ek)) this.edges.set(ek, []); this.edges.get(ek).push(eg); }
    return this.add(key, geo, color, aoOn);
  }
  build(mats) {
    const root = new THREE.Group();
    const all = Object.assign(this.groups.size && [...this.groups.keys()].some(k => TILE_KEYS.has(k.split('@')[0])) ? townMats() : {}, mats);
    for (const [gk, list] of this.groups) {
      const fb = gk.includes('~fb@'), key = gk.split('@')[0].replace('~fb', '');
      const merged = mergeGeometries(list, false);
      if (!merged) { console.warn('merge failed', gk); continue; }
      const m = new THREE.Mesh(merged, all[key] || all.prop); m.name = 'lv_' + key + (fb ? '_fb' : '') + (this.cell ? '_' + gk.split('@')[1] : '');
      if (fb) m.userData.kitFallback = true;
      m.receiveShadow = key !== 'glow' && key !== 'glass' && key !== 'sign' && key !== 'lamp' && key !== 'texglow';
      m.castShadow = key === 'wall' || key === 'prop' || key === 'tex';
      root.add(m);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0b0710, transparent: true, opacity: 0.55, fog: true });
    for (const [ek, list] of this.edges) {
      if (!list.length) continue;
      const e = new THREE.LineSegments(mergeGeometries(list, false), lineMat);
      e.userData.isEdgeLines = true; e.name = 'lv_edges' + (ek ? '_' + ek : ''); root.add(e);
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
  const scene = new THREE.Group(); scene.name = 'area_shotengai'; scene.add(skyDome({ mountains: true, clouds: 0.7, range: true }));
  const L = LEVEL, B = new Builder({ cell: 40, merge: true }), atlas = new Atlas(48, 4), KC = kitCollector();   // P12：Blender の部品を置く所
  const boxes = [], spots = [], dyn = {}, halos = [], hideSpots = [];
  const solid = (cx, cz, w, d, h = 7, y0 = 0) => { boxes.push(cbox(cx, cz, w, d, h, y0)); };
  const WALL = 0x8a8494, WALL2 = 0x6e6878, DARK = 0x2a2630, PILLAR = 0x5a5560;

  // 地面：アーケードの床（タイル）。アーケードの外（広場・駅前通り・住宅地）は world/town.js
  const ground = null;
  B.box('tex', 0, -0.06, -38.1, 9.3, 0.12, 68.2, 0xffffff, { tile: 'arcade_floor', ts: 2.6, edges: false });   // P13：前の広場の床と重ねない（ちらつき）
  // 道の中央の溝（排水）
  B.box('prop', 0, 0.01, -38, 0.25, 0.02, 68, 0x24222a, { edges: false });

  // ── 店の並び ──
  for (const s of L.shops) {
    const zc = (s.z0 + s.z1) / 2, len = Math.abs(s.z1 - s.z0), sx = s.side;
    const face = sx * 4.5;                                           // 通りに面した x
    if (s.open) { buildShopInterior(B, atlas, s, boxes, spots, dyn); continue; }
    if (s.passage) { buildPassage(B, atlas, s, halos, spots); continue; }   // フェーズ10：ガラスの屋根の広場への通り抜け（店の跡）
    const depth = 6, bx = face + sx * depth / 2;
    { // フェーズ9／10：外壁の材質と高さを店ごとに変える（高い屋根の下に 3〜4 階の表が見える。古い商家と新しいビルが混ざる）。当たり判定は 7m のまま
      const k = Math.abs(Math.round(zc * 3 + sx * 5)) % 4, tileW = ['mortar', 'tilewall', 'wood', 'panel'][k], hgt = [9.6, 11.6, 7.4, 12.4][k];
      const tint = k === 2 ? 0xb89070 : new THREE.Color(s.awn).lerp(new THREE.Color(0xd8d0c8), 0.72).getHex();
      B.box('tex', bx, hgt / 2, zc, depth, hgt, len - 0.02, tint, { tile: tileW, ts: 2, ao: true });
      B.box('prop', bx, hgt + 0.1, zc, depth + 0.1, 0.2, len + 0.06, 0x3a3640, { edges: false });
      if (k === 1) { const g = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10); g.translate(bx + sx * 1.2, hgt + 0.8, zc); B.add('prop', g, 0x8a9096); }
      if (k === 2) {   // 古い商家（漆喰の 2 階・虫籠の格子・小さな瓦のひさし）
        B.box('tex', face - sx * 0.03, 5.6, zc, 0.05, 2.6, len - 0.8, 0xe8e0d0, { tile: 'mortar', ts: 2, edges: false });
        for (const dz of [-len / 4, len / 4]) B.box('tex', face - sx * 0.07, 5.5, zc + dz, 0.06, 0.9, Math.min(1.6, len / 3), 0xffffff, { tile: 'koshi', fit: true, edges: false });
        B.box('tex', face - sx * 0.45, 4.15, zc, 1.0, 0.1, len - 0.2, 0xb8b8c0, { tile: 'kawara', ts: 1.4, rz: sx * 0.38, edges: false });
        B.box('tex', face - sx * 0.3, 7.25, zc, 0.8, 0.12, len, 0xb8b8c0, { tile: 'kawara', ts: 1.4, rz: sx * 0.42, edges: false });
      }
      if (k === 3) { B.box('tex', face - sx * 0.04, 9.2, zc, 0.06, 4.6, len - 0.6, 0xffffff, { tile: 'louver', ts: 2, tsy: 2, edges: false }); }
      // 3 階・4 階の窓（高い屋根の下で見える）
      for (const [y, need] of [[7.7, 8.5], [10.3, 11]]) if (hgt > need && k !== 2) for (const dz of [-len / 4, len / 4]) { const on = (Math.abs(zc * 3 + y + dz) % 5) < 1.3; B.box(on ? 'texglow' : 'tex', face - sx * 0.03, y, zc + dz, 0.06, 1.15, len / 3, on ? 0xc8b8a0 : 0xffffff, { tile: on ? (k === 3 ? 'win_office_lit' : 'win_lit') : k === 3 ? 'win_office' : 'win_dark', fit: true, edges: false }); }
      // 2 階の室外機・雨どい
      if (k !== 2) B.box('tex', face - sx * 0.2, 4.1, zc - len / 2 + 0.9, 0.3, 0.55, 0.75, 0xffffff, { tile: 'acunit', fit: true, edges: false });
      B.box('prop', face - sx * 0.06, hgt / 2, s.z0 + 0.25 * Math.sign(s.z1 - s.z0), 0.07, hgt, 0.07, 0x4a4a4c, { edges: false });
    }
    solid(bx, zc, depth, len, 7);
    // 柱
    for (const z of [s.z0 - 0.15 * Math.sign(s.z1 - s.z0), s.z1 + 0.15 * Math.sign(s.z1 - s.z0)]) B.box('wall', face - sx * 0.12, 1.5, z, 0.3, 3.0, 0.32, PILLAR);
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
    for (const k of [-1, 1]) { const on = lit && k > 0, cur = !on && (Math.abs(zc + k) % 3) < 1; B.box(on || cur ? 'texglow' : 'tex', face - sx * 0.03, 4.9, zc + k * len / 4, 0.06, 1.15, len / 3, on ? 0xc8b8a0 : cur ? 0x6a5a50 : 0xffffff, { tile: on ? 'win_lit' : cur ? 'win_curtain' : 'win_dark', fit: true, edges: false }); B.box('prop', face - sx * 0.08, 4.28, zc + k * len / 4, 0.12, 0.06, len / 3 + 0.12, 0x9a9ca0, { edges: false }); }
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
    if (d.alongX) B.box('wall', d.x - d.face * 0.3, 1.3, d.z, 0.62, 2.6, 1.45, 0x2a2026);   // P13：路地の奥の戸は奥の壁（0.5m 奥）まで枠を伸ばす（前は壁の前に枠だけ立っていた）
    else B.box('wall', d.x - d.face * 0.05, 1.3, d.z, 0.12, 2.6, 1.45, 0x2a2026);           // 枠は表札と灯りの高さまで
    const puv = atlas.add(signDraw(d.name, { bg: '#f1e9d6', fg: '#1d1712', size: 46, serif: true }));
    B.box('sign', d.x + d.face * 0.02, 2.35, d.z + 0.45, 0.02, 0.13, 0.42, 0xffffff, { uv: puv, face: d.face > 0 ? 0 : 1, edges: false });   // P13：表札は枠の面に付ける（前は 5cm 浮いていた）
    B.box('glow', d.x + d.face * 0.1, 2.4, d.z - 0.45, 0.14, 0.14, 0.14, d.color, { edges: false }); B.box('prop', d.x + d.face * 0.025, 2.4, d.z - 0.45, 0.05, 0.2, 0.1, 0x2a2628, { edges: false });   // P13：灯りの台座（枠に付ける）
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
    B.box('tex', sx * (4.65 + (a.len - 0.15) / 2), -0.06, zc, a.len - 0.15, 0.12, Math.abs(z0 - z1), 0xb8b0b0, { tile: 'concrete', ts: 2.5, edges: false });
    for (const z of [z0 + 0.2, z1 - 0.2]) { B.box('wall', midX, 2.5, z, w, 5, 0.4, WALL); solid(midX, z, w, 0.4, 5); }
    B.box('wall', xEnd + sx * 0.3, 2.5, zc, 0.6, 5, Math.abs(z0 - z1) + 0.8, WALL); solid(xEnd + sx * 0.3, zc, 0.6, Math.abs(z0 - z1) + 0.8, 5);
    // ごみ箱・室外機・配管
    B.box('prop', sx * 8.2, 0.45, z0 - 0.45, 0.6, 0.9, 0.6, 0x3a5a3a); solid(sx * 8.2, z0 - 0.45, 0.6, 0.6, 0.9);
    B.box('prop', sx * 12.5, 0.35, z1 + 0.45, 0.8, 0.7, 0.5, 0x8a8a8a); solid(sx * 12.5, z1 + 0.45, 0.8, 0.5, 0.7);
    B.box('prop', midX, 3.6, z0 - 0.1, w, 0.08, 0.08, 0x4a4a52, { edges: false });
  }

  // ── アーケードの屋根と入口のアーチ ──
  // フェーズ10：総曲輪のアーケードの雰囲気を参考に、高い屋根（軒 11m・棟 13.4m）にした。細い鉄骨の柱・トラスのアーチ・半透明のガラスの切妻屋根（独自の意匠）
  const EAVE = 11.0, RIDGE = 13.4, rth = Math.atan2(RIDGE - EAVE, 4.7), rsl = Math.hypot(4.7, RIDGE - EAVE);
  for (const s2 of [-1, 1]) B.box('glass2', s2 * 2.35, (EAVE + RIDGE) / 2, -38, rsl + 0.3, 0.05, 68.6, 0x7088b0, { edges: false, rz: -s2 * rth });
  for (let z = -4.2; z >= -72; z -= 2.6) for (const s2 of [-1, 1]) B.box('prop', s2 * 2.35, (EAVE + RIDGE) / 2 - 0.1, z, rsl, 0.12, 0.08, 0x2e2c36, { edges: false, rz: -s2 * rth });
  for (const f of [0.33, 0.66]) for (const s2 of [-1, 1]) B.box('prop', s2 * 4.7 * (1 - f), EAVE + (RIDGE - EAVE) * f - 0.1, -38, 0.1, 0.1, 68, 0x2e2c36, { edges: false });
  for (const s2 of [-1, 1]) { B.box('prop', s2 * 4.7, 6.45, -38, 0.2, 0.3, 68, 0x2e2c36, { edges: false }); B.box('prop', s2 * 4.62, EAVE, -38, 0.3, 0.36, 68, 0x2e2c36, { edges: false }); }
  B.box('prop', 0, RIDGE + 0.05, -38, 0.22, 0.2, 68.6, 0x2e2c36, { edges: false });
  // 柱（店の境目・戸の前は避ける）とトラスのアーチ（6m ごと）
  for (let z = -4; z >= -70; z -= 6) {
    for (const s2 of [-1, 1]) {
      if (Object.values(L.doors).some(d => !d.alongX && Math.sign(d.x) === s2 && Math.abs(d.z - z) < 1.2)) continue;
      B.box('prop', s2 * 4.55, (EAVE + 0.3) / 2 + 3.0, z, 0.2, EAVE - 3.3, 0.2, 0x34323c, { edges: false });
      B.fb(KC.on, () => B.box('prop', s2 * 4.3, EAVE - 0.6, z, 0.5, 0.12, 0.12, 0x34323c, { edges: false, rz: s2 * 0.7 }));
    }
    B.fb(KC.put('bld.town.arcade_arch', 0, 0, 0, z, 0), () => {   // P12：トラスの骨組みは Blender の部品（読めるまでは手続きの箱）
      B.box('prop', 0, EAVE, z, 9.3, 0.14, 0.14, 0x34323c, { edges: false });
      for (let k = 0; k < 4; k++) { const xa = -4.6 + k * 2.3, xb = xa + 2.3, ya = EAVE + (RIDGE - EAVE) * (1 - Math.abs(xa) / 4.7), yb = EAVE + (RIDGE - EAVE) * (1 - Math.abs(xb) / 4.7); B.box('prop', (xa + xb) / 2, (EAVE + (ya + yb) / 2) / 2, z, 0.08, ((ya + yb) / 2 - EAVE), 0.08, 0x34323c, { edges: false }); }
      B.box('prop', 0, (EAVE + RIDGE) / 2, z, 0.1, RIDGE - EAVE, 0.1, 0x34323c, { edges: false });
    });
  }
  for (let z = -6; z >= -70; z -= 6) {
    B.box('wall', 0, 6.45, z, 9.4, 0.25, 0.25, DARK);
    const on = Math.abs(z) % 18 !== 0;
    if (z + 3 > -4.3) continue;                                         // P13：アーケードの屋根の外（入口の手前）に吊る所が無い灯りは置かない
    B.box('prop', 0, (6.22 + RIDGE - 0.05) / 2, z + 3, 0.03, RIDGE - 0.05 - 6.22, 0.03, 0x2a2830, { edges: false });   // 灯りの吊り（P13：灯具から棟の梁まで。前は灯具とずれた所にあり、灯具も吊りも浮いていた）
    B.box(on ? 'lamp' : 'prop', 0, 6.2, z + 3, 0.18, 0.06, 1.6, on ? 0xd8ecff : 0x3a3a44, { edges: false });
    halos.push({ p: [0, 6.05, z + 3], size: 1.7, color: 0xd8ecff, k: on ? 0.45 : 0.0, strip: true, z: z + 3, onOutbreak: on && Math.abs(z) % 24 === 0 });
  }
  for (const x of [-4.75, 4.75]) { B.box('wall', x, 3.4, -4, 0.45, 6.8, 0.45, DARK); solid(x, -4, 0.45, 0.45, 6.8); B.box('prop', x, (6.8 + EAVE) / 2, -4, 0.35, EAVE - 6.8, 0.35, DARK, { edges: false }); }
  const archUV = atlas.add(signDraw(L.streetName, { bg: '#2a1f3a', fg: '#ffd9a8', size: 44, frameColor: '#ffb070' }));
  B.box('sign', 0, 5.7, -4, 9.4, 1.0, 0.35, 0xffffff, { uv: archUV, face: 4 });
  B.box('sign', 0, 5.7, -4.001, 9.4, 1.0, 0.35, 0xffffff, { uv: archUV, face: 5, edges: false });
  // 入口の上の妻（ガラスの三角と鉄骨の枠・灯りの列）
  { const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-4.7, EAVE, -3.9, 4.7, EAVE, -3.9, 0, RIDGE, -3.9], 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); B.add('glass2', tri, 0x7a90b8, false);
    B.box('glass2', 0, (6.4 + EAVE) / 2, -3.9, 9.4, EAVE - 6.4, 0.04, 0x6a80a8, { edges: false });
    B.box('prop', 0, EAVE, -3.9, 9.6, 0.4, 0.3, DARK, { edges: false });
    for (let x = -4; x <= 4.01; x += 1) { B.box('glow', x, EAVE - 0.26, -3.75, 0.2, 0.12, 0.06, 0xffe0b0, { edges: false }); }
    halos.push({ p: [0, EAVE - 0.4, -3.4], size: 5, color: 0xffd8a0, k: 0.25 }); }

  // ── 雰囲気（イメージ資料 concept_01）：赤い提灯・縦の看板（ネオン）・工事中の柵とコーン・事故の車 ──
  for (let z = -8; z >= -68; z -= 8) for (const sx of [-1, 1]) {
    const x = sx * 4.18, cz = z + (sx > 0 ? 2.5 : 0);
    if (L.alleys.some(a => a.side === sx && cz < Math.max(a.z0, a.z1) + 0.3 && cz > Math.min(a.z0, a.z1) - 0.3)) continue;   // P13：脇道の口（店の表が無い所）には吊らない
    const lg = new THREE.CylinderGeometry(0.15, 0.15, 0.34, 10); lg.translate(x, 2.95, cz); B.add('lamp', lg, 0xd8342a);
    for (const dy of [-0.19, 0.19]) B.box('prop', x, 2.95 + dy, cz, 0.22, 0.04, 0.22, 0x1a1414, { edges: false });
    B.box('prop', x, 3.4, cz, 0.02, 0.5, 0.02, 0x1a1414, { edges: false });                          // P13：吊りひもを看板の上まで・店の表から出した腕に掛ける（前は宙に浮いていた）
    B.box('prop', sx * 4.36, 3.65, cz, 0.36, 0.03, 0.03, 0x1a1414, { edges: false });
    halos.push({ p: [x, 2.95, cz], size: 1.1, color: 0xff5a3a, k: 0.75, lantern: true, z: cz, alt: ((z / 8) + (sx > 0 ? 1 : 0)) % 2 === 0 });
  }
  const neon = [[-1, -19.5, '喫茶', '#ff7ab8', 0xff6ab0], [1, -29.5, '電器', '#7ad8ff', 0x6ad0ff], [-1, -46.5, '精肉', '#ffb070', 0xffa060], [1, -58, '写真', '#c08aff', 0xb070ff], [-1, -52, 'ゆ', '#7affd0', 0x60ffc0]];
  for (const [sx, z, text, css, col] of neon) {
    const uv = atlas.add((g, w, h) => { g.fillStyle = '#120a18'; g.fillRect(0, 0, w, h); g.strokeStyle = css; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = css; g.font = `bold 40px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = css; g.shadowBlur = 12; g.fillText(text.split('').join('  '), w / 2, h / 2 + 2); });
    B.box('sign', sx * 4.32, 4.1, z, 0.12, 0.42, 2.0, 0xffffff, { uv, face: sx > 0 ? 1 : 0, edges: false });
    halos.push({ p: [sx * 4.05, 4.1, z], size: 2.4, color: col, k: 0.5, neon: true, flicker: text === '写真' });
  }
  // 工事中（序章の鉄パイプはここ）：柵・コーン・「立入禁止」
  const kj = atlas.add(signDraw('立入禁止', { bg: '#f4f2ea', fg: '#c01818', size: 40 }));
  const kj2 = atlas.add(signDraw('工事中　ご迷惑をおかけします', { bg: '#f8d830', fg: '#1a1a1a', size: 30 }));
  for (const [x, z, ry, uv] of [[-3.95, -29.4, Math.PI / 2, kj], [-1.6, -63.5, -0.3, kj2], [2.8, -64.5, 0.5, kj]]) {
    const geo = new THREE.BoxGeometry(1.4, 0.5, 0.04); geo.translate(0, 0.75, 0); geo.rotateY(ry); geo.translate(x, 0, z); B.add('prop', geo, 0xf4f2ea);
    B.box('sign', x, 0.75, z, 1.36, 0.44, 0.05, 0xffffff, { uv, face: 4, ry, edges: false });
    for (const lx of [-0.6, 0.6]) B.box('prop', x + Math.cos(ry) * lx, 0.45, z - Math.sin(ry) * lx, 0.05, 0.9, 0.3, 0x2a2a2a, { edges: false });
    solid(x, z, 1.4, 0.4, 1.0);
  }
  for (const [x, z] of [[-3.3, -28.2], [-3.3, -31.3], [-0.8, -64.2], [1.4, -63.0], [3.3, -63.4]]) { const cg = new THREE.ConeGeometry(0.16, 0.6, 10); cg.translate(x, 0.3, z); B.add('prop', cg, 0xe85a1a); B.box('prop', x, 0.03, z, 0.38, 0.05, 0.38, 0x2a2a2a, { edges: false }); }
  // 事故の車（右・電柱にぶつかって止まった）
  {
    const cx = 2.6, cz = -60.5, ry = 0.55;
    const part = (w, h, d, ox, oy, oz, c, key = 'prop') => { const g = new THREE.BoxGeometry(w, h, d); g.translate(ox, oy, oz); g.rotateZ(0.05); g.rotateY(ry); g.translate(cx, 0, cz); B.add(key, g, c); };
    part(1.7, 0.6, 3.9, 0, 0.55, 0, 0xc8ccd4); part(1.5, 0.55, 2.0, 0, 1.12, -0.2, 0xb8bcc4); part(1.45, 0.45, 0.04, 0, 1.12, 0.82, 0x10141c, 'glass'); part(0.04, 0.4, 1.7, 0.76, 1.12, -0.2, 0x10141c, 'glass');
    for (const [wx, wz] of [[-0.8, 1.3], [0.8, 1.3], [-0.8, -1.3], [0.8, -1.3]]) { const g = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12); g.rotateZ(Math.PI / 2); g.translate(wx, 0.32, wz); g.rotateY(ry); g.translate(cx, 0, cz); B.add('prop', g, 0x1a1a1e); }
    boxes.push(cbox(cx, cz, 2.6, 3.9, 1.4));
    for (const [hx, hz] of [[-0.6, 1.95], [0.6, 1.95]]) { const wx = cx + Math.cos(ry) * hx + Math.sin(ry) * hz, wz = cz - Math.sin(ry) * hx + Math.cos(ry) * hz; halos.push({ p: [wx, 0.6, wz], size: 0.8, color: 0xffa020, k: 0.8, hazard: true }); }
    spots.push({ id: 'car', kind: 'read', x: 1.4, z: -58.8, r: 1.6, label: '止まった車', text: 'car' });
  }

  // ── 自宅（住宅地の中：data/town.js の HOME_O へ置く）──
  buildHome(B, atlas, scene, boxes, spots, dyn);
  // ── 町（アーケード前の広場・駅前通り・交差点・用水路沿いの道・自宅の前の道・公園・祠・コンビニ）：data/town.js ──
  // フェーズ10：近い所（アーケードのまわり・住宅地・広場）は今、遠い所（中央通り・駅前）は最初のこまの後で（起動を速く）。当たり判定は今、全部
  const town = buildTown({ B, atlas, signDraw, scene, part: 'near', kit: KC });
  boxes.push(...town.boxes); spots.push(...town.spots); hideSpots.push(...town.hideSpots);
  const tH0 = halos.length; halos.push(...town.halos);
  for (const sg of town.signals) sg.heads = sg.heads.map(i => i + tH0);
  if (town.wires) scene.add(town.wires);
  if (town.pools) scene.add(town.pools);
  if (town.steam) scene.add(town.steam);

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
    glass2: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),   // 高い屋根のガラス（透ける）
    floor: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }),
  };
  const root = B.build(mats); root.name = 'level';
  dyn.lampMat = mats.lamp;
  scene.add(root);
  if (dyn.heitenShutter) scene.add(dyn.heitenShutter.mesh);
  scene.updateMatrixWorld(true);

  // 点光源（区画の定義だけ返す。光の実体は main の使い回しの組に割り当てる＝光の数を変えない＝シェーダーを作り直さない）
  const hl = L.homeLight, [hlx, hlz] = homeW(hl.pos[0], hl.pos[2]);
  const hl2 = L.homeLight2, [hl2x, hl2z] = homeW(hl2.pos[0], hl2.pos[2]);
  const lights = L.lights.concat([Object.assign({ home: true }, hl, { pos: [hlx, hl.pos[1], hlz] }), Object.assign({ home: true }, hl2, { pos: [hl2x, hl2.pos[1], hl2z] })]).concat(town.lights).map(l => Object.assign({ base: l.intensity }, l));
  for (const l of lights) {
    if (l.shop || l.vending || l.home || l.town) continue;
    halos.push({ p: [l.pos[0], l.pos[1] - 0.15, l.pos[2]], size: 2.6, color: l.color, k: 0.8, light: l });
  }
  // 濡れた地面の光の筋（屋根の無い所＝町の街灯の下）
  const wet = town.wet.slice();
  // 裏路地へ（空き店舗の奥）・隠れ場所（柱の陰・自販機の横）
  spots.push({ id: 'exit_alley', kind: 'exit', to: 'alley', spawn: 'from_street', x: -3.7, z: -66.5, r: 1.6, label: '空き店舗の奥へ（裏路地）' });
  B.box('glass', -4.47, 0.6, -66.5, 0.06, 1.2, 2.2, 0x050408, { edges: false });
  for (const [x, z] of [[-3.6, -9.8], [3.6, -21.8], [-3.6, -36.6], [3.6, -45.4], [-3.6, -55.2], [-1.6, 14.6], [3.8, -27.8], homeW(-1.6, 14.6)]) hideSpots.push({ x, z });
  const sidewalk = (x, z) => (z > 1 && z < 4.5) || (z > 11.5 && z < 14) || (z > -4 && z <= 1 && Math.abs(x) < 6);
  const surface = (x, z) => (inHome(x, z) ? (homeL0(z) > 9 ? 'wood' : 'tile') : x > 4.6 && x < 11.2 && z < -35 && z > -45 ? 'tile' : z < -4 && Math.abs(x) < 4.6 ? 'asphalt' : x > 4.4 && x < 36 && z < -6.4 && z > -34 ? 'tile' : sidewalk(x, z) ? 'tile' : 'wet');
  // 信号の移り変わり（車：青 9 秒・黄 2.5 秒・赤 11 秒／歩行者は逆）。区画の毎フレームの仕事（main.render から）
  // phase 1：中央通りの信号（駅前通りと半周ずれる）
  const tick = (dt, game) => {
    dyn.sigT = ((dyn.sigT || 0) + dt) % 22.5;
    for (const sg of dyn.signals) {
      const t = (dyn.sigT + (sg.phase ? 11.25 : 0)) % 22.5, car = t < 9 ? 0 : t < 11.5 ? 1 : 2, pedGo = t >= 12 && t < 20, pedBlink = t >= 18 && t < 20 && Math.floor(t * 4) % 2 === 0;
      sg.heads.forEach((hi, k) => { const h = halos[hi]; if (!h || h.idx == null || h.idx < 0) return; const on = sg.kind === 'car' ? k === car : (k === 0 ? !pedGo : pedGo && !pedBlink); game.halos.setK(h.idx, on ? 1.1 : 0); });
    }
  };
  dyn.signals = town.signals.slice();
  const MAPC = { main: 'rgba(118,104,150,1)', sidewalk: 'rgba(150,134,180,1)', lane: 'rgba(132,116,166,1)', forecourt: 'rgba(170,150,200,1)', yard: 'rgba(150,130,120,1)', park: 'rgba(96,130,110,1)', nook: 'rgba(140,120,110,1)', parking: 'rgba(120,110,140,1)', bridge: 'rgba(150,134,180,1)', avenue: 'rgba(110,98,146,1)', plaza: 'rgba(176,156,206,1)', passage: 'rgba(170,150,200,1)' };
  const mapWalk = [{ rect: [-4.5, -72, 4.5, -4], c: 'rgba(160,140,190,1)' }].concat(L.alleys.map(a => ({ rect: a.side > 0 ? [4.5, Math.min(a.z0, a.z1), 4.5 + a.len, Math.max(a.z0, a.z1)] : [-4.5 - a.len, Math.min(a.z0, a.z1), -4.5, Math.max(a.z0, a.z1)], c: 'rgba(140,124,170,1)' })))
    .concat([{ rect: [TOWN.channel.x0, TOWN.channel.z0, TOWN.channel.x1, TOWN.channel.z1], c: 'rgba(50,80,120,1)' }])
    .concat(TOWN.walk.map(w => ({ rect: w.rect, c: MAPC[w.kind] || 'rgba(140,124,170,1)' }))).concat([{ rect: [...homeW(-6, 6), ...homeW(6, 16)], c: 'rgba(170,140,110,1)' }]);
  // 雨の降らない屋根の下（アーケード・家の中・カーポート・コンビニのひさし・フェーズ10 のガラスの広場・通り抜け・駅の大屋根・電停とバス停の屋根・屋根つきの歩道）
  const roofs = TOWN.walk.filter(w => w.roof).map(w => w.rect).concat([TOWN.station.canopy.slice(0, 4), [TOWN.station.walkway.x0 - 0.3, TOWN.station.walkway.z0, TOWN.station.walkway.x1 + 0.3, TOWN.station.walkway.z1]],
    TOWN.avenue.stops.filter(s => s.shelter).map(s => [s.rect[0] - 0.2, s.shelter[0] - 0.3, s.rect[2] + 0.2, s.shelter[1] + 0.3]), TOWN.station.bus.islands.map(r => [r[0] - 0.4, r[1] + 0.5, r[2] + 0.4, r[3] - 0.5]), [[50.9, -102.6, 55.1, -100.8], TOWN.station.bikes.rect]);
  const inR = (r, x, z) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
  const A = { id: 'shotengai', root: scene, boxes, spots, dyn, lights, halos, wet, hideSpots, surface, atlas, ground, tick, rain: true, far: 105, fogFar: 2.5, layout: TOWN.version, mapWalk, kitItems: KC.items,
    // 霧：アーケードの中は濃く、外（住宅地）は少し遠くまで。中央通り・駅前は広いので、もう少し遠くまで見える
    fogAt: (x, z) => (z < -4 && Math.abs(x) < 4.8 ? 0.042 : z < -78 ? 0.024 : x > 62 ? 0.028 : x > 10.5 && z < -6 ? 0.03 : 0.034),
    rainRoof: (x, z) => (z < -4 && z > -72 && Math.abs(x) < 4.8) || inHome(x, z, 0.3) || (x > 30.5 && x < 36 && z > 43 && z < 52) || (x > 13 && x < 32 && z > 19.2 && z < 20.2) || roofs.some(r => inR(r, x, z)),
    indoor: (x, z) => inHome(x, z, 0.5),
    bounds: Object.assign({}, TOWN.bounds), spawns: { start: [...homeW(0, 11.5), Math.PI], from_alley: [-3.0, -66.5, Math.PI / 2], arcade: [0, -2, Math.PI], home_in: [...homeW(0, 8.6), 0], home_gate: [42, 41.6, 0], station: [84, -96, Math.PI], avenue: [68, -10, Math.PI], plaza: [23, -12, Math.PI] } };
  // P14：自宅の 2 階（歩ける）。floorAt＝足の高さ（階段は坂・家の中は 1 階 0／2 階 3.3）。boxesUp＝2 階にいる時の当たり（家の中の箱を 3.3m 下げた物）
  { const HF = L.homeFloor, [hx0, hz0] = homeW(L.home.minX, L.home.minZ), [hx1, hz1] = homeW(L.home.maxX, L.home.maxZ), [s0x, s0z] = homeW(HF.stair[0], HF.stair[1]), [s1x, s1z] = homeW(HF.stair[2], HF.stair[3]);
    A.floorAt = (x, z, y) => { if (x < hx0 - 0.4 || x > hx1 + 0.4 || z < hz0 - 0.1 || z > hz1 + 0.4) return null;
      if (x > s0x && x < s1x && z > s0z - 0.05 && z < s1z + 0.05) return Math.max(0, Math.min(1, (z - s0z) / (s1z - s0z))) * HF.y2;
      return (y || 0) > HF.y2 / 2 ? HF.y2 : 0; };
    A.boxesUp = boxes.filter(b => b.maxX > hx0 - 0.5 && b.minX < hx1 + 0.5 && b.maxZ > hz0 - 0.5 && b.minZ < hz1 + 0.5 && b.maxY > HF.y2 + 0.3).map(b => Object.assign({}, b, { minY: b.minY - HF.y2, maxY: b.maxY - HF.y2 }));
    A.upY = HF.y2 / 2;
    const tick0 = A.tick; A.tick = (dt, game) => { tick0(dt, game); homeDoorTick(dyn.homeDoor, dt, game); }; }
  // 遠い所（中央通り・駅前）：最初のこまの後で組み立てる（main の buildPending）。看板の地図帳は同じ物へ足す
  A.pending = [() => {
    const B2 = new Builder({ cell: 64, merge: true }), KC2 = kitCollector(), far = buildTown({ B: B2, atlas, signDraw, scene, part: 'far', kit: KC2 });
    const r = B2.build(mats); r.name = 'level_far';
    if (far.wires) r.add(far.wires); if (far.pools) r.add(far.pools); if (far.steam) r.add(far.steam);
    atlasTex.needsUpdate = true; r.updateMatrixWorld(true);
    return { root: r, halos: far.halos, wet: far.wet, lights: far.lights, signals: far.signals, spots: far.spots, hideSpots: far.hideSpots, kitItems: KC2.items };
  }];
  return A;
}
const homeL0 = z => z - HOME_O[1];

/** フェーズ10：アーケードの東の通り抜け（店の跡）→ ガラスの屋根の広場。低いガラスの屋根・案内の看板・花屋の名残（花のバケツ） */
function buildPassage(B, atlas, s, halos, spots) {
  const z0 = Math.min(s.z0, s.z1), z1 = Math.max(s.z0, s.z1), zc = (z0 + z1) / 2, len = z1 - z0, x0 = 4.5, x1 = 10.6, xc = (x0 + x1) / 2;
  const uv = atlas.add(signDraw('ひかり広場（仮）　→', { bg: '#1a1420', fg: '#ffe8c8', size: 36, frameColor: '#c8a070' }));
  B.box('sign', x0 + 0.1, 3.7, zc, 0.12, 0.6, len - 1.2, 0xffffff, { uv, face: 1, edges: false });
  for (const dz of [-(len - 1.2) * 0.4, (len - 1.2) * 0.4]) B.box('prop', x0 + 0.1, 4.4, zc + dz, 0.03, 0.82, 0.03, 0x2a2830, { edges: false });   // P13：上の梁から吊る（前は宙に浮いていた）
  halos.push({ p: [x0 - 0.4, 3.7, zc], size: 3.2, color: 0xffd8a0, k: 0.35, neon: true });
  // 通り抜けの上は建物（2・3 階：アーケード側に窓・広場側に看板）
  B.box('tex', xc, 7.6, zc, x1 - x0 - 0.1, 5.4, len, 0xc8b8a8, { tile: 'mortar', ts: 2, edges: false });
  for (const dz of [-1.5, 1.5]) for (const y of [6.4, 8.9]) B.box((dz > 0) === (y > 7) ? 'texglow' : 'tex', x0 + 0.02, y, zc + dz, 0.06, 1.15, 2.0, 0xc8b8a0, { tile: (dz > 0) === (y > 7) ? 'win_lit' : 'win_dark', fit: true, edges: false });
  B.box('prop', xc, 4.95, zc, x1 - x0, 0.3, len + 0.04, 0x3a3640, { edges: false });
  const uv2 = atlas.add(signDraw('あけぼの通り商店街　←', { bg: '#2a1f3a', fg: '#ffd9a8', size: 34, frameColor: '#ffb070' }));
  B.box('sign', x1 - 0.02, 5.6, zc, 0.06, 0.7, len - 1.2, 0xffffff, { uv: uv2, face: 0, edges: false });
  halos.push({ p: [x1 + 0.5, 5.6, zc], size: 3.0, color: 0xffb070, k: 0.3, neon: true });
  B.box('glow', xc, 4.78, zc, 3.2, 0.04, 0.3, 0xfff0d8, { edges: false }); halos.push({ p: [xc, 4.4, zc], size: 1.8, color: 0xfff0d8, k: 0.5 });
  // 花屋の名残（休業の札・花のバケツ）
  const fl = atlas.add(signDraw(s.sign + '（休業中）', { bg: '#f4f1e8', fg: '#7a3a5a', size: 30, weight: 'normal' }));
  B.box('sign', 7.5, 2.0, z0 + 0.005, 1.6, 0.36, 0.03, 0xffffff, { uv: fl, face: 4, edges: false });
  for (let i = 0; i < 5; i++) { const x = 5.6 + i * 0.7, g = new THREE.CylinderGeometry(0.17, 0.14, 0.42, 10); g.translate(x, 0.21, z0 + 0.3); B.add('prop', g, 0x6a7a8a); const f = new THREE.IcosahedronGeometry(0.2, 0); f.translate(x, 0.55, z0 + 0.3); B.add('prop', f, [0xd84a6a, 0xf0d040, 0xe8e8f0, 0xb06ad0, 0xf08a40][i]); }
  spots.push({ id: 'passage_flowers', kind: 'read', x: 7.2, z: z0 + 1.1, r: 1.2, label: '花のバケツ', text: 'town_flowers', low: true });
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
  B.box('prop', 10.95, 1.4, hp.lights[1], 0.1, 0.4, 0.3, 0xe8e8e0);   // P13：壁（x 11.0）に付ける
  dyn.heitenSignPos = hp.sign;
}

function buildHome(B0, atlas, scene0, boxes0, spots0, dyn) {
  // 家の中はローカル座標（data/level.js の home：x −6〜6・z 6〜16）で書き、住宅地の HOME_O へずらして置く。
  // P14（利用者の指摘「扉が開きっぱなし・内装と家具の配置が不自然・大きいのに 2 階がない」）：モデルハウスのように整えた 2 階建て。
  //  1 階：玄関（土間・上がり框・靴箱・傘立て）→ 廊下 → LDK（居間：テレビとソファが向き合う・ラグ・低い机／食卓と椅子 4・吊った灯り／
  //        奥の台所：流し台・こんろ・冷蔵庫・吊り戸棚）・和室（ふすま越し）・洗面所（閉じた戸）・居間の階段（右の壁ぞい）・刀掛けと金庫の一角。
  //  2 階（床 3.3m）：廊下・娘の部屋（ベッド・机・おもちゃ）・夫婦の寝室（ベランダの戸）・仕事部屋（設備保全：工具・点検の手引き・図面）・納戸（閉じた戸）。
  //  階段は歩いて上がれる（data/level.js の HOME_FLOOR・main の floorAt：床の高さ・2 階の当たり判定は 3.3m 下げて使う）。玄関の戸は近づくと開き、離れると閉じる（tick）。
  const [OX, OZ] = HOME_O;
  const B = { box: (key, cx, cy, cz, ...r) => B0.box(key, cx + OX, cy, cz + OZ, ...r), add: (key, geo, color, ao) => { geo.translate(OX, 0, OZ); return B0.add(key, geo, color, ao); } };
  const boxes = { push: (...bs) => { for (const b of bs) { b.minX += OX; b.maxX += OX; b.minZ += OZ; b.maxZ += OZ; boxes0.push(b); } return bs[0]; } };
  const spots = { push: (...ss) => { for (const s of ss) { s.x += OX; s.z += OZ; spots0.push(s); } } };
  const scene = { add: o => { o.position.x += OX; o.position.z += OZ; scene0.add(o); } };
  const H = LEVEL.home, HF = LEVEL.homeFloor, F2 = HF.y2, half = H.door.w / 2;
  const solid = (cx, cz, w, d, h = 3.2, y0 = 0) => boxes.push(cbox(cx, cz, w, d, h, y0));
  const FK = furnKit(B), FK2 = furnKit({ box: (k, x, y, z, ...r) => B.box(k, x, y + F2, z, ...r), add: (k, g, c, ao) => { g.translate(0, F2, 0); return B.add(k, g, c, ao); } });
  const WALL = 0xeee6da, WOOD = 0x8a6040, T = (tile, ts = 2) => ({ tile, ts, edges: false });
  const cyl = (key, x, y, z, r0, r1, h, color, seg = 12) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return B.add(key, g, color); };
  // 壁：[x0,z0]〜[x1,z1]（x か z のどちらかの向きの細い箱）・y0〜y1・gaps＝戸の口 [a,b,上の高さ]（壁の向きの座標）。当たり判定は戸の口を空ける
  function wall(x0, z0, x1, z1, y0, y1, gaps = [], color = WALL, t = 0.12, collide = true) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, c = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const seg = (a, b, ya, yb, col = collide) => { if (b - a < 0.01 || yb - ya < 0.01) return; const m = (a + b) / 2, L = b - a;
      if (alongX) { B.box('tex', m, (ya + yb) / 2, c, L, yb - ya, t, color, T('plaster')); if (col) solid(m, c, L, t, yb - ya, ya); }
      else { B.box('tex', c, (ya + yb) / 2, m, t, yb - ya, L, color, T('plaster')); if (col) solid(c, m, t, L, yb - ya, ya); } };
    let p = a0; for (const [a, b, top] of gaps.slice().sort((q, r) => q[0] - r[0])) { seg(p, a, y0, y1); seg(a, b, y0 + (top || 2.05), y1); p = b; } seg(p, a1, y0, y1);
  }
  // 戸の枠（口のまわり）と戸の板（open：開いて壁に沿う／閉じた）
  function doorway(alongX, c, a, b, y0, open, leafColor = 0xc8b8a0, side = 1) {
    const h = 2.05, fr = (x, z, w, d, hh, y) => B.box('prop', alongX ? x : c, y, alongX ? c : z, alongX ? w : d, hh, alongX ? d : w, 0x6a4a34, { edges: false });
    for (const e of [a, b]) fr(e, e, 0.06, 0.16, h, y0 + h / 2); fr((a + b) / 2, (a + b) / 2, b - a + 0.12, 0.16, 0.06, y0 + h + 0.03);
    if (open === null) return;
    const w = b - a, leaf = (cx, cz, lw, ld) => B.box('tex', cx, y0 + h / 2 - 0.01, cz, lw, h - 0.04, ld, leafColor, T('door_house', 1));
    if (!open) { if (alongX) leaf((a + b) / 2, c, w - 0.04, 0.04); else leaf(c, (a + b) / 2, 0.04, w - 0.04); return; }
    if (alongX) leaf(a + 0.03, c + side * (w / 2 + 0.06), 0.04, w - 0.04); else leaf(c + side * (w / 2 + 0.06), a + 0.03, w - 0.04, 0.04);   // 開いた戸（蝶番の側で壁に直角）
  }
  // 窓（内側）：夜の外（暗いガラス）・枠・カーテン（両脇に寄せた）・face：外の向き（N/S/E/W）
  function win(face, u, y, w, h, curtain = 0xd8c8b0, y0 = 0) {
    const [x, z] = face === 'N' ? [u, H.minZ + 0.07] : face === 'S' ? [u, H.maxZ - 0.07] : face === 'W' ? [H.minX + 0.07, u] : [H.maxX - 0.07, u];
    const along = face === 'N' || face === 'S', n = face === 'N' ? 1 : face === 'S' ? -1 : face === 'W' ? 1 : -1;
    const bx = (key, dn, du, yy, ww, hh, d, color, opt) => B.box(key, along ? x + du : x + n * dn, yy + y0, along ? z + n * dn : z + du, along ? ww : d, hh, along ? d : ww, color, Object.assign({ edges: false }, opt));
    bx('texglow', 0, 0, y, w, h, 0.03, 0x6a7088, { tile: 'win_dark', fit: true });
    bx('prop', 0.02, 0, y + h / 2 + 0.03, w + 0.1, 0.06, 0.06, 0xf4f0ea); bx('prop', 0.02, 0, y - h / 2 - 0.03, w + 0.14, 0.05, 0.12, 0xf4f0ea);
    bx('prop', 0.12, 0, y + h / 2 + 0.16, w + 0.6, 0.04, 0.04, 0x8a8a8a);                                    // カーテンレール
    for (const s of [-1, 1]) bx('prop', 0.12, s * (w / 2 + 0.12), y + 0.06, 0.34, h + 0.36, 0.06, curtain);  // 寄せたカーテン
  }
  const glowPanel = (x, y, z, w, d, color = 0xfff2dc) => { B.box('glow', x, y, z, w, 0.03, d, color, { edges: false }); B.box('prop', x, y + 0.03, z, w + 0.06, 0.03, d + 0.06, 0xf0ece4, { edges: false }); };

  // ───────── 外まわりの壁（内側の面）：1 階＋2 階（当たり判定は 6.2m の高さ＝2 階でも効く） ─────────
  wall(H.minX, H.minZ, -half, H.minZ, 0, 3.2, [], WALL, 0.3); wall(half, H.minZ, H.maxX, H.minZ, 0, 3.2, [], WALL, 0.3);
  B.box('tex', 0, 2.75, H.minZ, H.door.w, 0.9, 0.3, WALL, T('plaster')); solid(0, H.minZ, H.door.w, 0.3, 0.9, 2.3);
  wall(H.minX, H.minZ, H.maxX, H.minZ, 3.2, 6.2, [], WALL, 0.3);
  for (const x of [H.minX, H.maxX]) wall(x, H.minZ, x, H.maxZ, 0, 6.2, [], WALL, 0.3);
  wall(H.minX, H.maxZ, H.maxX, H.maxZ, 0, 6.2, [], WALL, 0.3);
  // 床・天井（1 階の天井＝2 階の床：階段の口を空ける）・2 階の天井
  const hole = HF.stair, [sx0, sz0, sx1, sz1] = hole;
  const slab = (y, h, tile, color, key = 'tex') => { for (const [a, b, c, d] of [[H.minX, H.minZ, H.maxX, sz0], [H.minX, sz1, H.maxX, H.maxZ], [H.minX, sz0, sx0, sz1]]) B.box(key, (a + c) / 2, y, (b + d) / 2, c - a, h, d - b, color, T(tile, tile === 'woodfloor' ? 1.8 : 2)); };
  B.box('tex', 0, 0.06 - 0.05, 6.8, 2.0, 0.1, 1.6, 0xb8b0a8, T('stone', 0.6));                                // 玄関の土間（石）
  for (const [a, b, c, d] of [[H.minX, H.minZ, -1, 9], [1, H.minZ, H.maxX, 8.5], [1, 8.5, H.maxX, 9], [-1, 7.6, 1, 9], [H.minX, 9, H.maxX, H.maxZ]]) B.box('tex', (a + c) / 2, 0.02, (b + d) / 2, c - a, 0.04, d - b, 0xf0e2cc, T('woodfloor', 1.8));
  B.box('tex', -3.5, 0.03, 7.5, 5.0, 0.03, 3.0, 0xc8c088, T('straw', 0.9));                                 // 和室の畳
  B.box('prop', 0, 0.05, 7.62, 2.0, 0.1, 0.1, 0x6a4a30, { edges: false });                                   // 上がり框
  slab(3.22, 0.04, 'ceiling', 0xf4f0e8); slab(3.28, 0.04, 'woodfloor', 0xe8d8c0); slab(6.0, 0.06, 'ceiling', 0xf4f0e8);
  for (const [x0, z0, x1, z1] of [[H.minX, H.minZ, H.maxX, sz0], [H.minX, sz1, H.maxX, H.maxZ], [H.minX, sz0, sx0, sz1]]) solid((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.1, 3.2);   // 2 階の床（カメラ用）

  // ───────── 1 階の間仕切り ─────────
  wall(-1, H.minZ, -1, 9, 0, 3.2, [[7.75, 8.85, 2.0]]);                                                       // 玄関・廊下 ↔ 和室（ふすまの口）
  wall(1, H.minZ, 1, 8.5, 0, 3.2, [[7.5, 8.3, 2.05]]); doorway(false, 1, 7.5, 8.3, 0, false, 0xe8e0d4);         // 廊下 ↔ 洗面所（閉じた戸）
  solid(1.1, 7.9, 0.12, 0.8, 2.05);
  wall(H.minX, 9, -1, 9, 0, 3.2); wall(1, 8.5, sx1, 8.5, 0, 3.2);   // 洗面所の奥の壁は 8.5（階段の下の口へ 1.1m の通り）                                                  // 和室・洗面所の奥の壁（居間の側）
  B.box('prop', -1.0, 1.02, 9.0, 0.1, 2.04, 0.14, 0x6a4a34, { edges: false }); B.box('prop', 1.0, 1.02, 9.0, 0.1, 2.04, 0.14, 0x6a4a34, { edges: false }); B.box('prop', 0, 2.1, 9.0, 2.1, 0.1, 0.14, 0x6a4a34, { edges: false });   // 居間の入口の枠
  // ふすま（和室の口の脇に寄せた 2 枚）・和室の中（座卓・座布団・掛け軸の床の間）
  for (const k of [0, 1]) B.box('tex', -1.03 - k * 0.04, 1.0, 7.2 + k * 0.1, 0.03, 1.96, 0.9, 0xf0e8d8, T('win_shoji', 1));
  cyl('prop', -3.4, 0.33, 7.6, 0.55, 0.55, 0.05, 0x7a4a2a, 18); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6; B.box('prop', -3.4 + Math.cos(a) * 0.35, 0.155, 7.6 + Math.sin(a) * 0.35, 0.05, 0.31, 0.05, 0x5a3a20, { edges: false }); }
  for (const [x, z] of [[-4.3, 7.6], [-2.5, 7.6], [-3.4, 8.45]]) B.box('prop', x, 0.08, z, 0.55, 0.08, 0.55, 0x8a3a3a, { edges: false });
  B.box('prop', -5.65, 0.1, 7.4, 0.6, 0.2, 1.6, 0x6a4a30, { edges: false }); B.box('tex', -5.84, 1.5, 7.4, 0.02, 1.1, 0.42, 0xffffff, T('win_shoji', 1));
  solid(-3.5, 7.5, 5.0, 2.8, 0.4);                                                                            // 和室（入れない：座卓の当たり）
  win('N', -4.0, 1.45, 1.4, 1.3, 0xe8e0d0);
  // 玄関：靴箱（上に花）・鏡・傘立て・スリッパ・灯り
  B.box('tex', -0.79, 0.48, 6.85, 0.4, 0.96, 1.3, 0xb89870, T('wood', 1)); solid(-0.79, 6.85, 0.4, 1.3, 1.0);
  B.box('prop', -0.79, 0.975, 6.85, 0.44, 0.03, 1.34, 0x6a4a30, { edges: false });
  cyl('prop', -0.79, 1.08, 7.2, 0.06, 0.05, 0.18, 0xe8e4dc, 10); { const f = new THREE.IcosahedronGeometry(0.12, 0); f.translate(-0.79, 1.28, 7.2); B.add('prop', f, 0xe86a8a); }
  B.box('glow', -0.965, 1.65, 6.85, 0.02, 0.7, 0.5, 0xb8c8d8, { edges: false }); B.box('prop', -0.975, 1.65, 6.85, 0.02, 0.76, 0.56, 0x6a4a30, { edges: false });
  cyl('prop', 0.75, 0.25, 6.35, 0.13, 0.12, 0.5, 0x3a4a5a, 12); for (const [dx, c] of [[-0.04, 0x2a3a8a], [0.05, 0xe8a0c0]]) { const g = new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6); g.translate(0.75 + dx, 0.55, 6.35); B.add('prop', g, c); }
  for (const dx of [-0.35, -0.1]) B.box('prop', dx, 0.055, 7.95, 0.12, 0.03, 0.26, 0x8a6a9a, { edges: false });
  glowPanel(0, 3.17, 7.0, 0.4, 0.4); glowPanel(0, 3.17, 8.3, 0.4, 0.4);
  // 洗面所（入れない：戸は閉じている）・その窓（外の灯り）

  // ───────── 居間：テレビ台とテレビ（奥の壁ぞい）↔ ラグ・低い机・ソファ（向き合う） ─────────
  B.box('tex', -3.5, 0.22, 9.3, 2.6, 0.44, 0.44, 0x6a4a34, T('wood', 1)); solid(-3.5, 9.3, 2.6, 0.5, 0.5);
  for (const x of [-4.4, -2.6]) B.box('prop', x, 0.22, 9.53, 0.6, 0.3, 0.02, 0x4a3424, { edges: false });
  B.box('prop', -3.5, 0.47, 9.25, 0.3, 0.05, 0.2, 0x1a1a1e, { edges: false }); B.box('prop', -3.5, 0.6, 9.25, 0.06, 0.24, 0.06, 0x1a1a1e, { edges: false });
  B.box('prop', -3.5, 0.98, 9.24, 1.42, 0.82, 0.06, 0x101014, { edges: false });                             // テレビの枠
  const tvC = document.createElement('canvas'); tvC.width = 128; tvC.height = 72; const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace;
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.72), new THREE.MeshBasicMaterial({ map: tvT, color: 0x9a9aa8 })); tv.position.set(-3.5, 0.98, 9.275); scene.add(tv);
  const tvG = ctx2d(tvC); const tvDraw = kind => { const g = tvG; const im = g.createImageData(128, 72); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 200; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0);
    if (kind === 'face') { g.fillStyle = 'rgba(230,230,240,.92)'; g.fillRect(0, 0, 128, 72); g.fillStyle = '#3a3a44'; g.beginPath(); g.ellipse(64, 30, 15, 19, 0, 0, Math.PI * 2); g.fill(); g.fillRect(40, 48, 48, 30); g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(52, 50); g.lineTo(64, 66); g.lineTo(76, 50); g.lineTo(88, 72); g.lineTo(40, 72); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 72; y += 3) g.fillRect(0, y, 128, 1); }
    tvT.needsUpdate = true; };
  tvDraw('static'); dyn.tv = { mesh: tv, draw: tvDraw, kind: 'static' };
  for (const x of [-4.6, -2.4]) { B.box('prop', x, 0.54, 9.25, 0.18, 0.2, 0.2, 0x2a2a2e, { edges: false }); }                // 小さなスピーカー（テレビ台の上）
  B.box('tex', -3.5, 0.012, 12.0, 3.2, 0.02, 2.6, 0xb8a0c8, T('carpet', 1));                                 // ラグ
  FK.table(-3.5, 12.0, 0, 1.1, 0.55, 0.4, 0x9a7050, 0x5a4030); solid(-3.5, 12.0, 1.1, 0.55, 0.42);
  B.box('prop', -3.65, 0.415, 11.95, 0.42, 0.02, 0.3, 0x2a2a30, { edges: false }); B.box('glow', -3.65, 0.53, 12.1, 0.4, 0.24, 0.02, 0x9ad0ff, { edges: false, rx: -0.25 });   // ノートPC
  cyl('prop', -3.15, 0.45, 11.9, 0.04, 0.035, 0.09, 0xf0ece4, 10); B.box('prop', -3.0, 0.405, 12.12, 0.05, 0.02, 0.16, 0x1a1a1e, { edges: false });   // 湯のみ・リモコン
  { // ソファ（3 人掛け・奥が背もたれ＝テレビの方を向く）：座面・背・肘・脚・クッション
    const x = -3.5, z = 14.45, L = 2.3, D = 0.9, col = 0x6a6a8a;
    B.box('prop', x, 0.27, z, L, 0.22, D, col); B.box('prop', x, 0.62, z + D / 2 - 0.12, L, 0.48, 0.24, col);
    for (const s of [-1, 1]) B.box('prop', x + s * (L / 2 - 0.1), 0.48, z, 0.2, 0.3, D, col);
    for (const k of [-1, 0, 1]) B.box('prop', x + k * 0.66, 0.42, z - 0.05, 0.6, 0.1, D - 0.3, 0x7a7a9a);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box('prop', x + sx * (L / 2 - 0.08), 0.08, z + sz * (D / 2 - 0.08), 0.06, 0.16, 0.06, 0x2a2420, { edges: false });
    for (const [dx, c] of [[-0.85, 0xe8c070], [0.8, 0xd890a8]]) B.box('prop', x + dx, 0.62, z + 0.12, 0.38, 0.36, 0.12, c, { rx: -0.2 });
    solid(x, z, L, D, 0.8);
  }
  // 床置きの灯り・観葉植物・本棚（左の壁）・壁の絵・カレンダー
  cyl('prop', -5.55, 0.02, 14.6, 0.16, 0.16, 0.04, 0x2a2a2e, 12); cyl('prop', -5.55, 0.8, 14.6, 0.015, 0.015, 1.56, 0x2a2a2e, 6); cyl('glow', -5.55, 1.6, 14.6, 0.14, 0.2, 0.26, 0xffe8c8, 14); solid(-5.55, 14.6, 0.3, 0.3, 1.7);
  cyl('prop', -5.5, 0.2, 9.7, 0.18, 0.14, 0.4, 0xb8805a, 10); { const f = new THREE.IcosahedronGeometry(0.42, 1); f.scale(1, 1.4, 1); f.translate(-5.5, 0.95, 9.7); B.add('prop', f, 0x4a7a4a); } solid(-5.5, 9.7, 0.5, 0.5, 1.2);
  B.box('tex', -5.75, 0.6, 11.4, 0.36, 1.2, 1.6, 0xb89070, T('wood', 1)); solid(-5.75, 11.4, 0.4, 1.6, 1.2);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 7; i++) B.box('prop', -5.6, 0.2 + k * 0.38 + 0.12, 10.75 + i * 0.2, 0.06, 0.26 + (i % 3) * 0.03, 0.12, [0xc06070, 0x6080c0, 0xd0b050, 0x5a8a5a, 0xe8e0d0][(i + k) % 5], { edges: false });
  win('W', 13.4, 1.5, 1.5, 1.3, 0xc8b8d8);
  B.box('prop', -3.5, 1.75, 15.83, 1.3, 0.8, 0.03, 0x3a3030, { edges: false }); B.box('glow', -3.5, 1.75, 15.81, 1.2, 0.7, 0.01, 0x6a8ab8, { edges: false });   // 壁の絵（夜の海の写真）
  const cuv = atlas.add(signDraw('カレンダー', { bg: '#fffaf0', fg: '#a03030', size: 26 }));
  B.box('sign', -1.6, 1.7, H.maxZ - 0.17, 0.6, 0.075, 0.02, 0xffffff, { uv: cuv, face: 5 });
  B.box('prop', -1.6, 1.45, H.maxZ - 0.17, 0.6, 0.45, 0.02, 0xfffaf0);
  glowPanel(-3.5, 3.17, 12.0, 0.9, 0.9);
  // ───────── 食卓（吊った灯りの下）・食器棚 ─────────
  FK.table(1.6, 11.4, 0, 1.4, 0.85, 0.72, 0xa07850, 0x6a4a34); solid(1.6, 11.4, 1.4, 0.85, 0.75);
  FK.chair(1.25, 10.72, 0, 0x8a6a4a); FK.chair(1.95, 10.72, 0, 0x8a6a4a); FK.chair(1.25, 12.08, Math.PI, 0x8a6a4a); FK.chair(1.95, 12.08, Math.PI, 0xf0a0c0, { h: 0.55, w: 0.38 });   // 娘の椅子（桃色・高い座面）
  for (const [x, z] of [[1.25, 11.15], [1.95, 11.15], [1.25, 11.65], [1.95, 11.65]]) B.box('prop', x, 0.755, z, 0.36, 0.01, 0.26, 0xe8dcc8, { edges: false });
  cyl('prop', 1.6, 0.79, 11.4, 0.12, 0.08, 0.07, 0xe8e4dc, 14); for (const dx of [-0.05, 0.05]) { const f = new THREE.SphereGeometry(0.045, 8, 6); f.translate(1.6 + dx, 0.84, 11.4); B.add('prop', f, dx < 0 ? 0xe85a3a : 0xf0c040); }
  B.box('prop', 1.6, 2.75, 11.4, 0.01, 0.9, 0.01, 0x2a2a2e, { edges: false }); cyl('glow', 1.6, 2.22, 11.4, 0.12, 0.3, 0.2, 0xffe8c0, 16);
  B.box('tex', 2.2, 0.9, 8.8, 1.8, 1.8, 0.45, 0xc8a880, T('wood', 1)); solid(2.2, 8.8, 1.8, 0.5, 1.8);   // 食器棚
  B.box('texglow', 2.2, 1.4, 9.03, 1.6, 0.7, 0.02, 0xb0b8c0, T('shopglass', 1));
  // ───────── 台所（奥の壁ぞい）：流し台・こんろ・吊り戸棚・冷蔵庫（娘の絵） ─────────
  B.box('tex', 1.9, 0.44, 15.68, 3.4, 0.88, 0.6, 0xe8e4dc, T('panel', 1)); B.box('prop', 1.9, 0.9, 15.66, 3.44, 0.04, 0.64, 0x8a8a88, { edges: false }); solid(1.9, 15.68, 3.4, 0.62, 0.95);
  B.box('prop', 1.2, 0.905, 15.66, 0.7, 0.02, 0.42, 0x3a3e44, { edges: false }); B.box('prop', 1.2, 1.05, 15.88, 0.04, 0.3, 0.04, 0xc8ccd0, { edges: false }); B.box('prop', 1.2, 1.18, 15.8, 0.04, 0.04, 0.18, 0xc8ccd0, { edges: false });
  for (const dx of [-0.2, 0.2]) cyl('prop', 2.7 + dx, 0.93, 15.66, 0.1, 0.1, 0.02, 0x1a1a1e, 14);
  cyl('prop', 2.5, 1.0, 15.66, 0.13, 0.12, 0.14, 0xb03a2a, 14); cyl('prop', 2.9, 0.99, 15.66, 0.09, 0.11, 0.13, 0xd0d4d8, 12);
  B.box('tex', 1.9, 1.95, 15.82, 3.4, 0.7, 0.34, 0xe8e4dc, T('panel', 1)); B.box('prop', 2.7, 1.52, 15.78, 0.7, 0.16, 0.42, 0x8a8a88, { edges: false });
  B.box('glow', 1.9, 1.59, 15.75, 3.2, 0.02, 0.1, 0xfff4e0, { edges: false });                              // 手元の灯り
  B.box('tex', -0.25, 0.9, 15.6, 0.72, 1.8, 0.68, 0xe8eaec, T('panel', 1)); solid(-0.25, 15.6, 0.72, 0.7, 1.8);   // 冷蔵庫
  B.box('prop', -0.25, 1.15, 15.25, 0.7, 0.01, 0.01, 0xa0a4a8, { edges: false }); B.box('prop', 0.05, 1.45, 15.24, 0.03, 0.4, 0.03, 0xa0a4a8, { edges: false });
  { const duv = atlas.add((g, w, h) => { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h); g.lineWidth = 4; g.strokeStyle = '#e8a020'; g.beginPath(); g.arc(60, 32, 16, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(60 + Math.cos(k) * 20, 32 + Math.sin(k) * 20); g.lineTo(60 + Math.cos(k) * 28, 32 + Math.sin(k) * 28); g.stroke(); } g.strokeStyle = '#8a3ab0'; g.beginPath(); g.arc(170, 20, 9, 0, 7); g.moveTo(170, 29); g.lineTo(170, 50); g.moveTo(158, 36); g.lineTo(182, 36); g.moveTo(170, 50); g.lineTo(160, 62); g.moveTo(170, 50); g.lineTo(180, 62); g.stroke(); g.strokeStyle = '#e04a7a'; g.beginPath(); g.arc(215, 32, 7, 0, 7); g.moveTo(215, 39); g.lineTo(215, 54); g.stroke(); g.fillStyle = '#3a6ad0'; g.font = `bold 26px ${JP_FONT}`; g.fillText('パパ', 290, 44); g.fillStyle = '#e04a7a'; g.fillText('と わたし', 360, 44); });
    B.box('sign', -0.25, 1.35, 15.255, 0.62, 0.16, 0.01, 0xffffff, { uv: duv, face: 5, edges: false });
    for (const [dx, dy, c] of [[-0.2, 1.62, 0xe85a3a], [0.15, 1.7, 0x3a8ae8], [-0.05, 1.05, 0xf0c040]]) B.box('prop', -0.25 + dx, dy, 15.25, 0.12, 0.16, 0.01, c, { edges: false }); }   // 冷蔵庫の扉の絵と紙（娘の）
  B.box('tex', 1.9, 0.012, 15.0, 2.4, 0.02, 0.6, 0x8a9aa8, T('carpet', 1));                                 // 台所のマット
  glowPanel(1.9, 3.17, 14.6, 1.6, 0.35);
  // ───────── 居間の階段（右の壁ぞい：z 9.6 → 13.8 で 3.3m 上がる）・階段の下の収納・手すり ─────────
  wall(4.9, sz0, 4.9, sz1, 0, 6.0, [], WALL, 0.1);
  wall(sx0 - 0.1, sz1, H.maxX, sz1, 0, 3.2, [], WALL, 0.1);                                                    // 階段の上の端の下（1 階から階段の上へ入れない）
  { const n = HF.steps, run = (sz1 - sz0) / n, rise = F2 / n;
    for (let i = 0; i < n; i++) { const z = sz0 + (i + 0.5) * run, y = (i + 1) * rise; B.box('tex', (sx0 + sx1) / 2 + 0.03, y - 0.025, z, sx1 - sx0 - 0.06, 0.05, run + 0.02, 0xc89a68, T('woodfloor', 1)); B.box('prop', (sx0 + sx1) / 2 + 0.03, y - rise / 2 - 0.02, z - run / 2 + 0.01, sx1 - sx0 - 0.06, rise - 0.04, 0.02, 0xf4f0e8, { edges: false }); }
    const hl = Math.hypot(sz1 - sz0, F2), ang = Math.atan2(F2, sz1 - sz0);
    B.box('prop', H.maxX - 0.2, F2 / 2 + 0.85, (sz0 + sz1) / 2, 0.05, 0.05, hl, 0x8a6040, { rx: -ang, edges: false });          // 手すり（右の壁）
    for (const t of [0.15, 0.85]) B.box('prop', H.maxX - 0.17, F2 * t + 0.85, sz0 + (sz1 - sz0) * t, 0.06, 0.04, 0.04, 0x8a8a88, { edges: false }); }
  for (let k = 0; k < 3; k++) B.box('tex', 4.84, 1.0, 10.4 + k * 1.1, 0.02, 1.9, 1.05, 0xe8dcc8, T('door_house', 1));   // 階段の下の収納の戸（居間の側）
  glowPanel(5.45, 6.0 - 0.04, 11.7, 0.5, 0.5);
  // ───────── 刀掛け・金庫の一角（階段の上の廊下の下） ─────────
  B.box('prop', 5.9, 1.25, 14.0, 0.1, 0.08, 0.5, 0x3a2418); B.box('prop', 5.9, 1.55, 14.0, 0.1, 0.08, 0.5, 0x3a2418);
  const rk = new THREE.Group(); const rkM = new THREE.MeshToonMaterial({ color: 0x2a1630, gradientMap: gradientMap() });
  for (const y of [1.33, 1.63]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.95), rkM); k.position.set(5.82, y, 14.0); rk.add(k); }
  scene.add(rk); dyn.rackKatana = rk;
  const safe = H.maxX - 1.1;
  B.box('prop', safe, 0.4, 15.2, 0.75, 0.8, 0.7, 0x3a3e46); solid(safe, 15.2, 0.75, 0.7, 0.8);
  B.box('prop', safe, 0.45, 14.84, 0.18, 0.18, 0.04, 0xb0b0b8, { edges: false });

  // ───────── 2 階（床 3.3m）：廊下・娘の部屋・夫婦の寝室・仕事部屋・納戸 ─────────
  const Y = F2, Y1 = 6.0;
  wall(-0.8, H.minZ, -0.8, 15.2, Y, Y1, [[9.4, 10.2, 2.05], [13.0, 13.8, 2.05]]);
  wall(0.8, H.minZ, 0.8, 13.75, Y, Y1, [[8.2, 9.0, 2.05], [10.8, 11.6, 2.05]]);
  wall(0.8, 9.5, H.maxX, 9.5, Y, Y1); wall(0.8, 13.75, 4.9, 13.75, Y, Y1); wall(-0.8, 15.2, H.maxX, 15.2, Y, Y1); wall(H.minX, 11.0, -0.8, 11.0, Y, Y1);
  doorway(false, -0.8, 9.4, 10.2, Y, true, 0xe8dcc8, 1); doorway(false, -0.8, 13.0, 13.8, Y, false, 0xd8ccb8); solid(-0.82, 13.4, 0.12, 0.8, 2.05, Y);
  doorway(false, 0.8, 8.2, 9.0, Y, true, 0xe8dcc8, -1); doorway(false, 0.8, 10.8, 11.6, Y, true, 0xe8dcc8, -1);
  for (let k = 0; k < 3; k++) B.box('tex', 1.4 + k * 1.6, Y + 1.0, 15.18, 1.5, 1.9, 0.02, 0xe8dcc8, T('door_house', 1));   // 廊下の奥の押し入れの戸
  glowPanel(0, Y1 - 0.04, 8.0, 0.4, 0.4); glowPanel(0, Y1 - 0.04, 12.5, 0.4, 0.4); glowPanel(3.0, Y1 - 0.04, 14.5, 0.4, 0.4);
  B.box('prop', H.maxX - 0.2, Y + 0.9, 14.5, 0.05, 0.05, 1.4, 0x8a6040, { edges: false });                   // 階段の上の手すり
  // 娘の部屋（左の前）：ベッド・机と椅子・おもちゃ・本棚・桃色のラグ・猫のぬいぐるみ
  win('N', -3.6, Y + 1.45, 1.4, 1.2, 0xf0b8d0);
  B.box('tex', -3.4, Y + 0.012, 8.4, 2.2, 0.02, 1.8, 0xf0c0d8, T('carpet', 1));
  { const x = -5.35, z = 8.9; B.box('tex', x, Y + 0.2, z, 1.0, 0.4, 2.0, 0xd8b890, T('wood', 1)); B.box('prop', x, Y + 0.47, z, 0.96, 0.14, 1.96, 0xf4f0f4); B.box('prop', x, Y + 0.56, z + 0.15, 0.94, 0.06, 1.5, 0xf0a0c0); B.box('prop', x, Y + 0.6, z - 0.75, 0.6, 0.1, 0.32, 0xffffff);
    B.box('tex', x, Y + 0.55, z - 1.02, 1.0, 1.1, 0.06, 0xd8b890, T('wood', 1)); solid(x, z, 1.0, 2.05, 0.6, Y);
    { const f = new THREE.SphereGeometry(0.13, 10, 8); f.translate(x - 0.1, Y + 0.72, z - 0.6); B.add('prop', f, 0x8a6a4a); const f2 = new THREE.SphereGeometry(0.09, 10, 8); f2.translate(x - 0.1, Y + 0.9, z - 0.62); B.add('prop', f2, 0x8a6a4a); } }   // くまのぬいぐるみ
  FK2.table(-3.6, 6.45, 0, 1.0, 0.5, 0.62, 0xe8d8c0, 0xd8c8b0); FK2.chair(-3.6, 7.0, Math.PI, 0xf0a0c0, { h: 0.38, w: 0.34 }); solid(-3.6, 6.6, 1.0, 0.8, 0.7, Y);
  B.box('prop', -3.75, Y + 0.65, 6.45, 0.32, 0.01, 0.24, 0xfffaf0, { edges: false }); for (const [dx, c] of [[0.1, 0xe85a3a], [0.18, 0x3a8ae8], [0.26, 0xf0c040]]) cyl('prop', -3.6 + dx, Y + 0.68, 6.42, 0.012, 0.012, 0.1, c, 6);
  B.box('tex', -1.45, Y + 0.3, 8.0, 0.9, 0.6, 0.5, 0xf0d070, T('wood', 1)); solid(-1.45, 8.0, 0.9, 0.5, 0.6, Y);   // おもちゃ箱
  for (const [dx, dz, c] of [[-0.2, 0, 0x3a8ae8], [0.1, 0.05, 0xe85a3a], [0.25, -0.1, 0x5ab05a]]) B.box('prop', -1.45 + dx, Y + 0.65, 8.0 + dz, 0.16, 0.12, 0.16, c);
  { const f = new THREE.SphereGeometry(0.16, 12, 10); f.translate(-2.4, Y + 0.16, 9.6); B.add('prop', f, 0xe8e0f0); for (const s of [-1, 1]) { const e = new THREE.ConeGeometry(0.05, 0.1, 6); e.translate(-2.4 + s * 0.08, Y + 0.32, 9.6); B.add('prop', e, 0xe8e0f0); } }   // 猫のぬいぐるみ
  B.box('tex', -5.75, Y + 0.5, 10.3, 0.36, 1.0, 1.0, 0xe8d8c0, T('wood', 1)); solid(-5.75, 10.3, 0.4, 1.0, 1.0, Y);
  for (let i = 0; i < 6; i++) B.box('prop', -5.62, Y + 0.68, 9.9 + i * 0.15, 0.06, 0.24, 0.1, [0xf0a0c0, 0x8ac0f0, 0xf0d070][i % 3], { edges: false });
  { const duv = atlas.add((g, w, h) => { g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8a020'; g.beginPath(); g.arc(50, 30, 18, 0, 7); g.fill(); g.strokeStyle = '#5ab05a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 56); g.lineTo(w, 52); g.stroke(); g.fillStyle = '#8a3ab0'; g.beginPath(); g.arc(200, 34, 12, 0, 7); g.fill(); g.fillStyle = '#e04a7a'; g.font = `bold 24px ${JP_FONT}`; g.fillText('ねこ と おうち', 270, 40); });
    B.box('sign', -2.0, Y + 1.6, H.minZ + 0.17, 0.9, 0.12, 0.01, 0xffffff, { uv: duv, face: 4, edges: false }); }
  glowPanel(-3.3, Y1 - 0.04, 8.5, 0.7, 0.7, 0xfff0e8);
  // 夫婦の寝室（右の前）：ベッド（2 人）・ベランダの戸・洋服だんす・鏡台・床の灯り
  { const x = 4.2, z = 7.3; B.box('tex', x, Y + 0.2, z, 1.6, 0.4, 2.1, 0xb89070, T('wood', 1)); B.box('prop', x, Y + 0.47, z, 1.56, 0.14, 2.06, 0xf4f0ea); B.box('prop', x, Y + 0.56, z + 0.25, 1.58, 0.06, 1.5, 0x8a9ab8);
    for (const dx of [-0.38, 0.38]) B.box('prop', x + dx, Y + 0.6, z - 0.78, 0.6, 0.1, 0.32, 0xffffff); B.box('tex', x, Y + 0.6, z - 1.08, 1.6, 1.2, 0.08, 0xb89070, T('wood', 1)); solid(x, z, 1.6, 2.2, 0.6, Y); }
  B.box('tex', 4.2, Y + 1.2, H.minZ + 0.06, 1.2, 2.2, 0.03, 0x6a7088, T('win_dark', 1)); B.box('prop', 4.2, Y + 1.2, H.minZ + 0.08, 1.3, 2.3, 0.02, 0xf4f0ea, { edges: false });   // ベランダの戸
  for (const s of [-1, 1]) B.box('prop', 4.2 + s * 0.8, Y + 1.2, H.minZ + 0.2, 0.36, 2.3, 0.06, 0xc8d0d8, { edges: false });
  B.box('tex', 1.85, Y + 0.95, 9.2, 1.6, 1.9, 0.55, 0xc8a880, T('wood', 1)); solid(1.85, 9.2, 1.6, 0.6, 1.9, Y);   // 洋服だんす
  B.box('tex', 5.7, Y + 0.38, 9.0, 0.5, 0.76, 0.8, 0xc8a880, T('wood', 1)); B.box('glow', 5.94, Y + 1.25, 9.0, 0.02, 0.8, 0.5, 0xb8c8d8, { edges: false }); solid(5.7, 9.0, 0.5, 0.8, 0.8, Y);
  cyl('prop', 2.6, Y + 0.22, 6.5, 0.18, 0.18, 0.44, 0xd8c8b0, 10); cyl('glow', 2.6, Y + 0.6, 6.5, 0.16, 0.2, 0.28, 0xffe0b0, 12);   // 枕元の灯り（小さな台の上）
  B.box('tex', 4.2, Y + 0.012, 8.9, 1.8, 0.02, 0.8, 0xa8b0c0, T('carpet', 1));
  glowPanel(3.4, Y1 - 0.04, 7.8, 0.7, 0.7);
  // 仕事部屋（設備保全）：作業机・画面・計測器・工具の壁（有孔板）・鉄の棚（工具箱・点検の手引き）・図面・ヘルメットと作業着
  { const z = 13.35; FK2.table(2.6, z, 0, 2.0, 0.65, 0.74, 0x8a8a84, 0x3a3a3e); solid(2.6, z, 2.0, 0.7, 0.8, Y);
    B.box('prop', 2.3, Y + 1.0, z + 0.15, 0.6, 0.38, 0.03, 0x1a1a1e, { edges: false }); B.box('glow', 2.3, Y + 1.0, z + 0.13, 0.56, 0.33, 0.01, 0x5a8ab0, { edges: false }); B.box('prop', 2.3, Y + 0.8, z + 0.18, 0.06, 0.12, 0.06, 0x1a1a1e, { edges: false });
    B.box('prop', 3.2, Y + 0.78, z, 0.14, 0.05, 0.22, 0xe8b020, { edges: false }); B.box('prop', 3.2, Y + 0.805, z - 0.03, 0.1, 0.005, 0.08, 0x2a3a2a, { edges: false });   // 振動計（黄）
    B.box('prop', 1.7, Y + 0.78, z - 0.05, 0.3, 0.04, 0.22, 0x2a4a8a, { edges: false }); B.box('prop', 3.5, Y + 0.79, z - 0.1, 0.24, 0.06, 0.12, 0xc83a2a, { edges: false });
    FK2.chair(2.5, z - 0.62, 0, 0x2a2a30); }
  B.box('tex', 2.6, Y + 1.7, 13.69, 2.0, 1.0, 0.02, 0xb89a70, T('wood', 1));                                  // 有孔板（工具の壁）
  for (let i = 0; i < 8; i++) { const x = 1.8 + i * 0.22; B.box('prop', x, Y + 1.75 + (i % 2) * 0.12, 13.66, 0.04, 0.3 + (i % 3) * 0.08, 0.02, [0xc8ccd0, 0xc83a2a, 0x2a2a30, 0xe8b020][i % 4], { edges: false }); }
  B.box('tex', 1.25, Y + 0.95, 12.2, 0.6, 1.9, 1.4, 0x8a8e94, T('metalpanel', 1)); solid(1.25, 12.2, 0.6, 1.4, 1.9, Y);   // 鉄の棚
  for (const [y, c] of [[0.35, 0xc83a2a], [0.85, 0x2a4a8a], [1.35, 0xe8e0d0]]) for (const dz of [-0.4, 0.05, 0.45]) B.box('prop', 1.3, Y + y, 12.2 + dz, 0.45, y > 1 ? 0.3 : 0.28, 0.36, y > 1 ? [0xe8e0d0, 0x3a6a3a, 0xd0b050][Math.round(dz * 10 + 4) % 3] : c, { edges: false });
  { const muv = atlas.add(signDraw('設備保全　点検の手引き', { bg: '#2a4a6a', fg: '#ffffff', size: 22 })); B.box('sign', 1.57, Y + 1.38, 12.2, 0.01, 0.12, 0.9, 0xffffff, { uv: muv, face: 0, edges: false }); }
  { const buv = atlas.add((g, w, h) => { g.fillStyle = '#1a3a6a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8e8ff'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.strokeRect(20 + i * 52, 12, 40, 26); g.beginPath(); g.moveTo(40 + i * 52, 38); g.lineTo(40 + i * 52, 56); g.stroke(); } g.beginPath(); g.moveTo(20, 56); g.lineTo(w - 20, 56); g.stroke(); });
    B.box('sign', 4.83, Y + 1.6, 11.6, 0.01, 0.6, 2.4, 0xffffff, { uv: buv, face: 1, edges: false }); }      // 配管の図面（右の壁）
  { const f = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); f.translate(1.0, Y + 1.9, 10.3); B.add('prop', f, 0xf0f0f0); B.box('prop', 0.88, Y + 1.5, 10.3, 0.04, 0.8, 0.5, 0x2a4a8a, { edges: false }); B.box('prop', 0.88, Y + 1.5, 10.3, 0.045, 0.06, 0.5, 0xe8f060, { edges: false }); }   // ヘルメットと作業着（壁の掛け金）
  B.box('prop', 0.92, Y + 1.88, 10.3, 0.12, 0.04, 0.04, 0x3a3a3e, { edges: false });
  B.box('prop', 3.6, Y + 0.17, 10.2, 0.6, 0.34, 0.3, 0xc83a2a); B.box('prop', 3.6, Y + 0.37, 10.2, 0.3, 0.04, 0.04, 0x2a2a2e, { edges: false }); solid(3.6, 10.2, 0.6, 0.3, 0.4, Y);   // 工具箱
  glowPanel(2.7, Y1 - 0.04, 11.6, 1.2, 0.3, 0xf4f8ff);
  // 2 階の窓（外から見えるのと同じ所）
  win('W', 9.7, Y + 1.7, 1.0, 0.8, 0xf0b8d0);

  // ───────── 玄関の戸（閉じている・近づくと開く・離れると閉じる）：蝶番は左（x −0.7）・外へ開く ─────────
  { const g = new THREE.Group(); g.name = 'home_door';
    const mat = new THREE.MeshToonMaterial({ color: 0x5a3a28, gradientMap: gradientMap() });
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.25, 0.05), mat); leaf.position.set(0.5, 1.13, 0); leaf.castShadow = true;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.06), new THREE.MeshBasicMaterial({ color: 0xe8c890 })); slit.position.set(0.22, 1.2, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.1), new THREE.MeshToonMaterial({ color: 0xc8ccd0, gradientMap: gradientMap() })); handle.position.set(0.88, 1.05, 0);
    const pivot = new THREE.Group(); pivot.add(leaf, slit, handle); pivot.position.set(-half + 0.02, 0, H.minZ - 0.12); g.add(pivot); scene.add(g);
    B.box('texglow', half - 0.2, 1.13, H.minZ - 0.12, 0.36, 2.2, 0.04, 0xd8c8a8, T('win_shoji', 1)); solid(half - 0.2, H.minZ - 0.12, 0.4, 0.12, 2.3);   // 袖の明かり取り（固定）
    const box = solid(-0.2, H.minZ - 0.12, 1.0, 0.14, 2.3);                                                   // 閉じた戸の当たり（開くと無効）
    dyn.homeDoor = { pivot, box, maxY: box.maxY, open: false, ang: 0, x: OX, z: H.minZ + OZ, y: 0 };
  }

  // ───────── 調べる所（floor：0＝1 階・1＝2 階。上の階からは下の階の物を調べない） ─────────
  const hs = LEVEL.homeSpots;
  spots.push({ id: 'safe', kind: 'safe', x: safe, z: 14.4, r: 1.2, label: '金庫', floor: 0 });
  spots.push({ id: 'laptop', kind: 'save', x: -3.6, z: 12.9, r: 1.3, label: 'ノートPC（セーブ）', floor: 0 });
  spots.push({ id: 'calendar', kind: 'read', x: hs.calendar[0], z: hs.calendar[1] - 0.9, r: 1.2, label: 'カレンダーを見る', text: 'calendar', floor: 0 });
  spots.push({ id: 'tv', kind: 'read', x: -3.5, z: 10.4, r: 1.2, label: 'テレビ', text: 'tv', floor: 0 });
  spots.push({ id: 'katana_rack', kind: 'rack', x: 5.0, z: 14.0, r: 1.1, label: '刀掛け', floor: 0 });
  spots.push({ id: 'sofa', kind: 'sofa', x: -3.5, z: 13.6, r: 1.2, label: 'ソファ', floor: 0 });
  spots.push({ id: 'home_daughter', kind: 'read', x: -3.6, z: 7.6, r: 1.2, label: '娘の机', text: 'home_daughter', floor: 1 });
  spots.push({ id: 'home_work', kind: 'read', x: 2.6, z: 12.5, r: 1.3, label: '仕事の机', text: 'home_work', floor: 1 });
  spots.push({ id: 'home_bedroom', kind: 'read', x: 4.2, z: 8.9, r: 1.2, label: '寝室', text: 'home_bedroom', floor: 1 });
  void scene; void dyn;
}

/** P14：自宅の玄関の戸。プレイヤー（か相棒）が戸から 1.9m に入ると開き（当たりを消す）、2.6m より離れると閉じる（当たりを戻す） */
function homeDoorTick(d, dt, game) {
  if (!d) return;
  const near = p => p && Math.hypot(p.x - d.x, p.z - d.z) < (d.open ? 2.6 : 1.9) && (p.y || 0) < 1;
  const want = near(game.player.pos) || (game.companion && game.companion.root.visible && near(game.companion.pos));
  if (want !== d.open) { d.open = want; if (game.sfx) game.sfx.play('door'); }
  d.box.maxY = d.open ? -1 : d.maxY;
  d.ang += ((d.open ? 1.75 : 0) - d.ang) * Math.min(1, dt * 7);
  d.pivot.rotation.y = d.ang;
}