// tobinezumi/client/art.js — コードで描くプレースホルダ素材（画像が無くてもゲームが動くように）
// すべて独自に描いたドット絵。assets/manifest.json に画像があれば sprites.js がそちらに差し替える。
//
// 規格（ASSET_LIST.md）：輪郭 #2a1a10、1 タイル 16px、トビネズミのセルは 32×32（足元が y=30）。
// 毛色 5 色はパレット差し替え（同じ形を 5 色で描く）。
import { hash2 } from '../shared/rng.js';

export const OL = '#2a1a10';

export const FURS = [
  { id: 'sand',  name: '砂色',     l: '#ecd09a', m: '#d4ad6e', d: '#a8804c', s: '#7a5634', belly: '#f8eedb' },
  { id: 'cream', name: '淡黄',     l: '#f7e8b4', m: '#e6cc86', d: '#bf9f5e', s: '#8c6e3e', belly: '#fdf7e6' },
  { id: 'rufous',  name: '赤茶',     l: '#e2a676', m: '#c07a4c', d: '#8e5234', s: '#5e3422', belly: '#f4dfc8' },
  { id: 'graybrown',  name: '灰褐',     l: '#cbbcaa', m: '#a39280', d: '#7a6a5a', s: '#54483c', belly: '#eee7dc' },
  { id: 'white', name: '白っぽい', l: '#fffaf0', m: '#ece3d3', d: '#c6baa6', s: '#968b78', belly: '#ffffff' },
];
export const furById = id => FURS.find(f => f.id === id) || FURS[0];
const EAR_IN = '#e9a596', EYE = '#1a0f0c', NOSE = '#c46e64', TUFT_D = '#3a2a22';

export function mk(w, h) {
  const c = (typeof OffscreenCanvas !== 'undefined' && !globalThis.document) ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const P = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
/** 塗りつぶし楕円（アンチエイリアスなし） */
function ell(g, cx, cy, rx, ry, c, rot = 0) {
  g.fillStyle = c;
  const R = Math.max(rx, ry) + 1, cs = Math.cos(rot), sn = Math.sin(rot);
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
    if (u * u + v * v <= 1) g.fillRect(x, y, 1, 1);
  }
}
function line(g, c, x0, y0, x1, y1, wdt = 1) {
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(Math.round(x0 + (x1 - x0) * t - (wdt - 1) / 2), Math.round(y0 + (y1 - y0) * t - (wdt - 1) / 2), wdt, wdt); }
}
/** 不透明ピクセルの外側に 1px の輪郭 */
export function outline(cv, color = OL) {
  const g = cv.getContext('2d');
  const { width: w, height: h } = cv;
  const im = g.getImageData(0, 0, w, h), d = im.data;
  const a = i => d[i * 4 + 3] > 40;
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (a(i)) continue;
    if ((x > 0 && a(i - 1)) || (x < w - 1 && a(i + 1)) || (y > 0 && a(i - w)) || (y < h - 1 && a(i + w))) out.push(i);
  }
  g.fillStyle = color;
  for (const i of out) g.fillRect(i % w, (i / w) | 0, 1, 1);
  return cv;
}

// ───────── トビネズミ：横向き（右向き）─────────
// pose: {by:体の上下, crouch:0..1, leg:'stand'|'push'|'tuck'|'stretch'|'sit', ear:耳の傾き, tail:尾の角度, eye:'open'|'closed', arm:'down'|'up', curl:丸まる(眠り)}
export function drawJerboaSide(g, fur, pose = {}, ox = 2, oy = 0) {
  const by = pose.by || 0, cr = pose.crouch || 0;
  const X = x => ox + x, Y = y => oy + y + by;
  if (pose.curl) {   // 眠り：丸くなる
    const br = pose.breath || 0;
    ell(g, X(15), oy + 25 - br * 0.5, 9, 6 + br * 0.5, fur.m);
    ell(g, X(14), oy + 23 - br * 0.5, 7, 4, fur.l);
    ell(g, X(20), oy + 26, 4, 3.5, fur.m);           // 頭（伏せ）
    ell(g, X(18), oy + 21, 2, 5, fur.d, -1.0);       // 寝かせた耳
    ell(g, X(18), oy + 21, 1, 3.5, EAR_IN, -1.0);
    P(g, EYE, X(21), oy + 26, 2, 1);
    line(g, fur.d, X(7), oy + 28, X(25), oy + 29);   // 尾を体に沿わせる
    P(g, TUFT_D, X(25), oy + 28, 2, 2); P(g, '#fff', X(27), oy + 28, 2, 2);
    ell(g, X(16), oy + 29, 8, 1.5, fur.s);
    return;
  }
  // 尾（長く、先に房）
  const ta = pose.tail != null ? pose.tail : 0.15;
  const tx0 = 9, ty0 = 22 - cr * 2;
  let px = tx0, py = ty0;
  for (let i = 1; i <= 11; i++) {
    const a = Math.PI + ta + Math.sin(i / 11 * 2.2) * 0.35;
    const nx = tx0 + Math.cos(a) * i * 0.95, ny = ty0 - Math.sin(a) * i * 0.95 + i * i * 0.012;
    line(g, fur.d, X(px), Y(py), X(nx), Y(ny));
    px = nx; py = ny;
  }
  ell(g, X(px - 0.5), Y(py), 1.8, 1.6, TUFT_D);
  P(g, '#fbf8f2', X(px - 2), Y(py - 1), 2, 2);
  // 後ろ脚（長い）
  const leg = pose.leg || 'stand';
  if (leg === 'stretch') {        // 跳んで後ろへ伸ばす
    ell(g, X(11), Y(22 - cr), 4, 3.5, fur.m, -0.6);
    line(g, fur.d, X(9), Y(24), X(4), Y(28), 2);
    line(g, fur.s, X(4), Y(28), X(1), Y(29), 1);
  } else if (leg === 'tuck') {    // 空中で縮める
    ell(g, X(12), Y(23 - cr), 4.5, 3.5, fur.m);
    line(g, fur.d, X(12), Y(26), X(16), Y(27), 2);
  } else if (leg === 'push') {    // 蹴る：脚が下へ伸びる
    ell(g, X(12), Y(22), 4.5, 4, fur.m, 0.3);
    line(g, fur.d, X(12), Y(25), X(10), Y(29), 2);
    line(g, fur.s, X(10), Y(30) - by, X(15), Y(30) - by, 1);
  } else {                        // 立つ・座る
    ell(g, X(12), Y(24 + cr), 4.5, 4, fur.m);
    line(g, fur.d, X(11), Y(27 + cr), X(11), oy + 29, 2);
    line(g, fur.s, X(11), oy + 30, X(17), oy + 30, 1);
    P(g, fur.d, X(16), oy + 29);
  }
  // 胴
  const bodyRot = pose.bodyRot != null ? pose.bodyRot : -0.35;
  ell(g, X(15), Y(21 + cr), 6.5, 5, fur.m, bodyRot);
  ell(g, X(14.5), Y(19.5 + cr), 5, 3, fur.l, bodyRot);
  ell(g, X(18), Y(23 + cr), 2.8, 3, fur.belly, 0.2);   // 腹
  // 前脚（小さい）
  if (pose.arm === 'up') { line(g, fur.d, X(21), Y(20 + cr), X(23), Y(18 + cr)); P(g, fur.s, X(23), Y(17 + cr)); }
  else { line(g, fur.d, X(20), Y(24 + cr), X(21), Y(26 + cr)); P(g, fur.s, X(22), Y(26 + cr)); }
  // 頭
  const hx = 21 + (pose.headDx || 0), hy = 15 + cr + (pose.headDy || 0);
  ell(g, X(hx), Y(hy), 4.8, 4.2, fur.m);
  ell(g, X(hx - 0.5), Y(hy - 1.2), 3.6, 2.4, fur.l);
  ell(g, X(hx + 4), Y(hy + 1), 2.2, 1.8, fur.m);        // 鼻先
  ell(g, X(hx + 1.5), Y(hy + 2.4), 2.6, 1.3, fur.belly); // 口元
  P(g, NOSE, X(hx + 5.6), Y(hy + 0.4), 1, 1);
  // 耳（大きい）
  const ea = (pose.ear || 0) - 0.25;
  ell(g, X(hx - 2.2 + Math.sin(ea) * 3), Y(hy - 6.2), 2.4, 5.8, fur.d, ea);
  ell(g, X(hx - 2 + Math.sin(ea) * 3), Y(hy - 6), 1.3, 4.4, EAR_IN, ea);
  // 目（大きくて黒い）
  if (pose.eye === 'closed') line(g, EYE, X(hx + 0.5), Y(hy), X(hx + 2.5), Y(hy));
  else { ell(g, X(hx + 1.6), Y(hy - 0.4), 1.6, 1.8, EYE); P(g, '#ffffff', X(hx + 1), Y(hy - 1.6)); }
  // ひげ
  P(g, fur.s, X(hx + 7), Y(hy + 1)); P(g, fur.s, X(hx + 7), Y(hy + 3));
}

// ───────── トビネズミ：見下ろし（下向き＝こちらを向く／上向き＝背中）─────────
export function drawJerboaFront(g, fur, pose = {}, ox = 0, oy = 0) {
  const by = pose.by || 0, cr = pose.crouch || 0;
  const X = x => ox + x, Y = y => oy + y + by;
  // 尾（後ろへ上がって房）
  const tw = pose.tail != null ? pose.tail : 0;
  for (let i = 0; i < 9; i++) P(g, fur.d, X(16 + Math.sin(i / 3 + tw) * 2.5 + i * 0.6), Y(21 - i * 1.4));
  ell(g, X(16 + Math.sin(3 + tw) * 2.5 + 5.6), Y(7.6), 1.8, 1.6, TUFT_D); P(g, '#fbf8f2', X(22), Y(5.6), 2, 1);
  // 後ろ脚（左右）
  const sp = pose.leg === 'push' ? 1 : pose.leg === 'tuck' ? -1 : 0;
  ell(g, X(10.5 - sp), Y(25 + cr), 3, 3.5, fur.m); ell(g, X(21.5 + sp), Y(25 + cr), 3, 3.5, fur.m);
  if (pose.leg !== 'tuck') { line(g, fur.s, X(9 - sp), oy + 30, X(11 - sp), oy + 30, 1); line(g, fur.s, X(21 + sp), oy + 30, X(23 + sp), oy + 30, 1); }
  // 胴
  ell(g, X(16), Y(23 + cr), 6.5, 5.5, fur.m);
  ell(g, X(16), Y(24.5 + cr), 4, 4, fur.belly);
  P(g, fur.d, X(14), Y(27 + cr), 1, 2); P(g, fur.d, X(18), Y(27 + cr), 1, 2);   // 前脚
  // 頭
  const hy = 15 + cr;
  ell(g, X(16), Y(hy), 5.5, 4.6, fur.m);
  ell(g, X(16), Y(hy - 1.5), 4, 2.4, fur.l);
  ell(g, X(16), Y(hy + 2.6), 2.6, 1.6, fur.belly);
  P(g, NOSE, X(15.5), Y(hy + 2), 2, 1);
  // 耳
  const e = pose.ear || 0;
  ell(g, X(11 - e), Y(hy - 6.5), 2.4, 5.4, fur.d, -0.35 - e * 0.15); ell(g, X(11 - e), Y(hy - 6.3), 1.3, 4, EAR_IN, -0.35 - e * 0.15);
  ell(g, X(21 + e), Y(hy - 6.5), 2.4, 5.4, fur.d, 0.35 + e * 0.15); ell(g, X(21 + e), Y(hy - 6.3), 1.3, 4, EAR_IN, 0.35 + e * 0.15);
  if (pose.eye === 'closed') { P(g, EYE, X(12), Y(hy), 3, 1); P(g, EYE, X(17), Y(hy), 3, 1); }
  else { ell(g, X(13.3), Y(hy - 0.2), 1.5, 1.7, EYE); ell(g, X(18.7), Y(hy - 0.2), 1.5, 1.7, EYE); P(g, '#fff', X(13), Y(hy - 1.4)); P(g, '#fff', X(18), Y(hy - 1.4)); }
}
export function drawJerboaBack(g, fur, pose = {}, ox = 0, oy = 0) {
  const by = pose.by || 0, cr = pose.crouch || 0;
  const X = x => ox + x, Y = y => oy + y + by;
  const sp = pose.leg === 'push' ? 1 : pose.leg === 'tuck' ? -1 : 0;
  ell(g, X(10.5 - sp), Y(25 + cr), 3, 3.5, fur.d); ell(g, X(21.5 + sp), Y(25 + cr), 3, 3.5, fur.d);
  if (pose.leg !== 'tuck') { line(g, fur.s, X(9 - sp), oy + 30, X(11 - sp), oy + 30); line(g, fur.s, X(21 + sp), oy + 30, X(23 + sp), oy + 30); }
  ell(g, X(16), Y(21 + cr), 7, 6.5, fur.m);
  ell(g, X(16), Y(19 + cr), 5, 3.5, fur.l);
  const hy = 13 + cr, e = pose.ear || 0;
  ell(g, X(16), Y(hy), 5, 4.2, fur.m);
  ell(g, X(11.5 - e), Y(hy - 5.5), 2.5, 5.4, fur.m, -0.3); ell(g, X(20.5 + e), Y(hy - 5.5), 2.5, 5.4, fur.m, 0.3);
  ell(g, X(11.5 - e), Y(hy - 5.2), 1.2, 4, fur.d, -0.3); ell(g, X(20.5 + e), Y(hy - 5.2), 1.2, 4, fur.d, 0.3);
  // 尾（こちらへ垂れる）
  const tw = pose.tail != null ? pose.tail : 0;
  for (let i = 0; i < 6; i++) P(g, fur.d, X(16 + Math.sin(i / 2 + tw) * 1.5), Y(27 + cr + i * 0.6));
  ell(g, X(16 + Math.sin(3 + tw) * 1.5), Y(30.5), 1.7, 1.2, TUFT_D);
}

// アニメーション（コマごとのポーズ）。地上・巣で共通の名前
export const ANIMS = {
  idle:    [{ ear: 0 }, { ear: 0.25, by: 0.0, tail: 0.25 }],
  hop:     [{ crouch: 1.5, leg: 'stand' }, { leg: 'push', by: -2 }, { leg: 'stretch', by: -4, tail: -0.1 }, { leg: 'tuck', by: -1, crouch: 1 }],
  walk:    [{ crouch: 1.5, leg: 'stand' }, { leg: 'push', by: -2 }, { leg: 'stretch', by: -4, tail: -0.1 }, { leg: 'tuck', by: -1, crouch: 1 }],
  jump:    [{ crouch: 2.5 }, { leg: 'push', by: -3 }, { leg: 'stretch', by: -5, tail: -0.2, ear: -0.3 }, { leg: 'stretch', by: -5, tail: -0.25, ear: -0.4 }, { leg: 'tuck', by: -3, ear: -0.2 }, { crouch: 2 }],
  gather:  [{ crouch: 2, headDy: 3, headDx: 1 }, { crouch: 2.5, headDy: 4, headDx: 2, arm: 'up' }, { crouch: 1, arm: 'up' }],
  dig:     [{ crouch: 2, headDy: 3, arm: 'up' }, { crouch: 2.5, headDy: 4 }, { crouch: 2, headDy: 3, arm: 'up', ear: 0.2 }, { crouch: 2.5, headDy: 4, ear: 0.2 }],
  eat:     [{ crouch: 1, arm: 'up', headDy: 1 }, { crouch: 1, arm: 'up', headDy: 2 }, { crouch: 1, arm: 'up', headDy: 1, ear: 0.2 }],
  sleep:   [{ curl: 1, eye: 'closed', breath: 0 }, { curl: 1, eye: 'closed', breath: 1 }],
  climb:   [{ crouch: 0, arm: 'up', bodyRot: -1.0, headDy: -2, leg: 'push', by: -1 }, { crouch: 1, arm: 'up', bodyRot: -1.1, headDy: -3, leg: 'stand' }, { crouch: 0, arm: 'up', bodyRot: -1.0, headDy: -2, leg: 'tuck' }, { crouch: 1, arm: 'up', bodyRot: -1.1, headDy: -3, leg: 'stand' }],
};
ANIMS.climb_idle = [ANIMS.climb[1]];

/** 1 コマを描いた 32×32 キャンバス。view: 'side'|'front'|'back' */
export function jerboaFrame(furId, view, anim, frame) {
  const fur = furById(furId);
  const list = ANIMS[anim] || ANIMS.idle;
  const pose = list[frame % list.length];
  const c = mk(32, 32), g = c.getContext('2d');
  if (view === 'front' && !pose.curl) drawJerboaFront(g, fur, pose);
  else if (view === 'back' && !pose.curl) drawJerboaBack(g, fur, pose);
  else drawJerboaSide(g, fur, pose);
  return outline(c);
}

/** キャラ作成の立ち絵（128×128）：横向きを 4 倍、少し陰影を足す */
export function portrait(furId) {
  const c = mk(128, 128), g = c.getContext('2d');
  const s = jerboaFrame(furId, 'side', 'idle', 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(s, 0, 0, 32, 32, 0, 0, 128, 128);
  return c;
}

// ───────── 地上タイル ─────────
export const PAL = {
  sand: ['#e6bd80', '#dcb073', '#d0a266', '#f0cc92', '#c39058'],
  dirt: ['#b98552', '#ab7848', '#9c6b3f', '#c8945e', '#8a5d36'],
  grass: ['#a0a24e', '#8e9444', '#7d863c', '#b4b260', '#6c7634'],
  water: ['#3e7fb4', '#4f94c8', '#7ab8dc', '#2f6496', '#bfe3ef'],
  rock: ['#9a8a78', '#807060', '#62544a', '#b8a894', '#4a3e36'],
  shrub: ['#7f8c3e', '#66722f', '#4f5a26', '#9aa652', '#8a6a42'],
  soil: ['#7a4a2a', '#6c4024', '#5e381f', '#8a5634', '#4c2c18'],
  back: ['#3e2616', '#352012', '#2c1a0f', '#4a2e1b'],
  straw: ['#d9b45e', '#c09a46', '#a8843a', '#ecd081'],
  wood: ['#9a6a3c', '#7e5430', '#5e3c22', '#b48250'],
};
const pick = (arr, v) => arr[Math.min(arr.length - 1, Math.floor(v * arr.length))];

/** 下地タイル 16×16（砂・土・草）。variant で模様を変える */
export function groundTile(kind, tx, ty, seed = 0) {
  const c = mk(16, 16), g = c.getContext('2d');
  const pal = kind === 2 ? PAL.grass : kind === 1 ? PAL.dirt : PAL.sand;
  g.fillStyle = pal[0]; g.fillRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const h = hash2(tx * 16 + x, ty * 16 + y, seed + kind * 7);
    if (h < 0.18) P(g, pal[1], x, y); else if (h < 0.24) P(g, pal[2], x, y); else if (h > 0.96) P(g, pal[3], x, y);
  }
  if (kind === 0) {   // 砂の波紋
    const ph = hash2(tx, ty, seed + 3) * 16;
    for (let x = 0; x < 16; x++) { const y = Math.round(5 + Math.sin((x + ph) / 3) * 1.5); P(g, pal[3], x, y); P(g, pal[1], x, y + 1); const y2 = y + 7; P(g, pal[3], x, y2 % 16); }
  } else if (kind === 2) {   // 草の短い線
    for (let k = 0; k < 6; k++) { const x = Math.floor(hash2(tx, ty * 9 + k, seed) * 15), y = 2 + Math.floor(hash2(tx * 5 + k, ty, seed) * 13); P(g, pal[3], x, y - 1); P(g, pal[2], x, y); }
  } else {
    for (let k = 0; k < 3; k++) { const x = Math.floor(hash2(tx + k, ty, seed + 11) * 14), y = Math.floor(hash2(tx, ty + k, seed + 12) * 14); P(g, pal[4], x, y, 2, 1); P(g, pal[3], x, y - 1, 2, 1); }
  }
  return c;
}

export function drawShrub(g, x, y, v = 0) {
  // 根元 (x,y)＝タイルの中央下。幅 20、高さ 18 くらい
  const c = mk(24, 22), s = c.getContext('2d');
  const pal = PAL.shrub;
  line(s, pal[4], 12, 20, 9, 12); line(s, pal[4], 12, 20, 15, 11); line(s, pal[4], 12, 20, 12, 9);
  ell(s, 8, 12, 6, 5, pal[1]); ell(s, 16, 11, 6, 5.5, pal[1]); ell(s, 12, 8, 6, 5, pal[0]);
  ell(s, 10, 7, 3, 2, pal[3]); ell(s, 16, 9, 2.5, 2, pal[3]);
  for (let k = 0; k < 9; k++) { const px = 3 + Math.floor(hash2(k, v, 4) * 18), py = 4 + Math.floor(hash2(v, k, 5) * 12); P(s, pal[2], px, py); }
  if (v % 3 === 0) { P(s, '#e0a0c0', 7, 6); P(s, '#e0a0c0', 15, 5); P(s, '#d088b0', 11, 4); }  // 小さい花
  if (v % 3 === 1) { P(s, '#d8b060', 6, 10); P(s, '#d8b060', 17, 8); }
  outline(c);
  g.drawImage(c, Math.round(x - 12), Math.round(y - 20));
}
export function drawRock(g, x, y, v = 0) {
  const c = mk(20, 18), s = c.getContext('2d');
  const pal = PAL.rock;
  const w = 7 + (v % 3), h = 6 + (v % 2);
  ell(s, 10, 11, w, h, pal[1]); ell(s, 9, 9, w - 2, h - 2, pal[0]); ell(s, 8, 7, w - 4, h - 3.5, pal[3]);
  ell(s, 12, 14, w - 2, 2, pal[2]);
  line(s, pal[4], 10, 6, 12, 10); P(s, pal[2], 6, 12);
  outline(c);
  g.drawImage(c, Math.round(x - 10), Math.round(y - 16));
}
export function drawStones(g, x, y, v = 0) {
  const c = mk(20, 14), s = c.getContext('2d');
  const pal = PAL.rock;
  const pts = [[6, 9, 3.5], [12, 10, 3], [9, 6, 3], [15, 7, 2.5], [4, 6, 2]];
  for (let i = 0; i < pts.length; i++) { const [px, py, r] = pts[(i + v) % pts.length]; ell(s, px, py, r, r * 0.8, pal[i % 2]); P(s, pal[3], px - 1, py - 1); }
  outline(c);
  g.drawImage(c, Math.round(x - 10), Math.round(y - 12));
}
export function drawTree(g, x, y) {
  // アカシアのような平たい樹冠。幹の根元が (x, y)
  const c = mk(52, 64), s = c.getContext('2d');
  const W = PAL.wood, L = ['#7c8a3c', '#62702e', '#4e5a26', '#98a44e'];
  line(s, W[1], 26, 62, 25, 44, 4); line(s, W[1], 25, 47, 14, 34, 2); line(s, W[1], 26, 47, 38, 33, 2); line(s, W[2], 27, 62, 27, 46, 1);
  ell(s, 26, 30, 24, 10, L[1]); ell(s, 14, 26, 12, 8, L[0]); ell(s, 38, 26, 12, 8, L[0]); ell(s, 26, 22, 15, 8, L[0]);
  ell(s, 21, 19, 9, 3.5, L[3]); ell(s, 37, 22, 6, 2.5, L[3]);
  ell(s, 26, 36, 21, 3.5, L[2]);
  for (let k = 0; k < 40; k++) P(s, k % 2 ? L[2] : L[3], 5 + Math.floor(hash2(k, 1, 7) * 42), 16 + Math.floor(hash2(1, k, 7) * 20));
  outline(c);
  g.drawImage(c, Math.round(x - 26), Math.round(y - 62));
}
export function drawTuft(g, x, y, v = 0) {
  const pal = PAL.grass;
  for (let k = 0; k < 4; k++) { const dx = -3 + k * 2 + (v % 2); line(g, k % 2 ? pal[2] : pal[3], x + dx, y, x + dx + (k - 1.5) * 0.8, y - 4 - (k % 2) * 2); }
}
export function drawPebbleDeco(g, x, y, v = 0) {
  const pal = PAL.rock;
  P(g, pal[2], x - 3, y - 1, 3, 2); P(g, pal[3], x - 3, y - 1, 2, 1);
  P(g, pal[1], x + 2, y, 2, 2); P(g, pal[3], x + 2, y, 1, 1);
  if (v % 2) { P(g, pal[2], x, y - 3, 2, 1); }
}

/** 水場のタイル（t で揺らぐ）。edges: {n,s,e,w} 隣が陸か */
export function drawWater(g, x, y, t, edges, tx, ty) {
  const pal = PAL.water;
  g.fillStyle = pal[0]; g.fillRect(x, y, 16, 16);
  for (let k = 0; k < 3; k++) {
    const yy = (k * 6 + Math.floor(hash2(tx, ty, k) * 5)) % 16;
    const xx = Math.floor((hash2(tx, k, ty) * 16 + t * 6 * (k % 2 ? 1 : -1)) % 16 + 16) % 16;
    P(g, pal[1], x + xx, y + yy, 4, 1); P(g, pal[2], x + ((xx + 2) % 14), y + yy, 1, 1);
  }
  if (edges.n) { P(g, '#cfa86a', x, y, 16, 2); P(g, pal[4], x, y + 2, 16, 1); }
  if (edges.s) { P(g, pal[3], x, y + 13, 16, 1); P(g, '#a88a52', x, y + 14, 16, 2); }
  if (edges.w) { P(g, '#cfa86a', x, y, 2, 16); P(g, pal[4], x + 2, y, 1, 16); }
  if (edges.e) { P(g, '#cfa86a', x + 14, y, 2, 16); P(g, pal[4], x + 13, y, 1, 16); }
}

/** 巣穴の入口（地上）24×16。own=自分の */
export function drawBurrow(g, x, y, own) {
  ell(g, x, y + 1, 11, 6, '#b98552');
  ell(g, x, y, 9, 5, '#8a5d36');
  ell(g, x, y + 1, 7, 3.6, '#2a160c');
  ell(g, x - 1, y + 2, 4, 1.6, '#140a06');
  P(g, '#d6a46c', x - 9, y - 2, 3, 1); P(g, '#d6a46c', x + 6, y - 3, 3, 1);
  if (own) { line(g, '#7e5430', x + 8, y - 1, x + 8, y - 9); P(g, '#e8c46a', x + 9, y - 9, 4, 3); P(g, OL, x + 9, y - 6, 4, 1); }
}

// ───────── 採集物 ─────────
export function drawItem(g, id, x, y, big = false) {
  // 16×16 のアイコン（左上 x,y）
  const c = mk(16, 16), s = c.getContext('2d');
  if (id === 'seed') {
    const cols = ['#b07a3a', '#8e5a28', '#d0a060'];
    [[5, 9], [9, 8], [7, 11], [11, 11], [8, 5]].forEach(([px, py], i) => { ell(s, px, py, 2.2, 1.6, cols[i % 2], 0.6); P(s, cols[2], px - 1, py - 1); });
  } else if (id === 'grass') {
    const cols = ['#a9ae4a', '#8a9238', '#cfc879'];
    for (let k = 0; k < 6; k++) line(s, cols[k % 3], 6 + k, 14, 3 + k * 2, 2 + (k % 3));
    P(s, '#9a6a3c', 5, 11, 7, 2);
  } else if (id === 'pebble') {
    ell(s, 8, 9, 5, 4, '#9a8a78'); ell(s, 7, 8, 3.5, 2.5, '#b8a894'); P(s, '#d8ccbc', 6, 7, 2, 1); ell(s, 9, 12, 4, 1, '#6e6056');
  } else if (id === 'rare_seed') {
    ell(s, 8, 9, 4.5, 5.5, '#b8628a'); ell(s, 7, 8, 3, 3.6, '#e08eb0'); P(s, '#f6c4d6', 6, 6, 2, 1); line(s, '#7a6e62', 9, 3, 10, 1);
  } else if (id === 'pretty_stone') {
    ell(s, 8, 9, 5, 5, '#46a0b4'); ell(s, 7, 7, 3, 3, '#7ccede'); P(s, '#c8f2f4', 6, 6, 2, 1); ell(s, 10, 12, 3, 1, '#2c7088');
  } else if (String(id).startsWith('curio.')) {   // Ver.0.5：収集品（素材が無いとき）
    const h = hash2(String(id).length, String(id).charCodeAt(7) || 1, 5);
    ell(s, 8, 9, 5, 5, `hsl(${Math.floor(h * 360)},55%,55%)`); P(s, '#ffffff', 6, 6, 2, 2);
  } else return;
  outline(c);
  g.drawImage(c, x, y);
}

// ───────── 巣の断面 ─────────
export function soilColor(x, y, depthT, seed) {
  const h = hash2(x, y, seed);
  const base = PAL.soil;
  let c = h < 0.15 ? base[1] : h < 0.22 ? base[2] : h > 0.97 ? base[3] : base[0];
  if (depthT > 0.5 && h < 0.45) c = base[1];
  if (depthT > 0.8 && h < 0.3) c = base[2];
  return c;
}

/** 家具・備え付けを描く（ox,oy＝左上、セル 16px）。rot=1 は左右反転 */
export function drawFurniture(g, type, ox, oy, w, h, rot = 0, t = 0, extra = {}) {
  const c = mk(w * 16, h * 16), s = c.getContext('2d');
  const W = PAL.wood, S = PAL.straw;
  switch (type) {
    case 'lamp': {
      line(s, '#5a4a3a', 8, 0, 8, 4);
      P(s, W[2], 4, 4, 9, 2); P(s, W[1], 5, 13, 7, 2);
      P(s, '#ffd27a', 5, 6, 7, 7); P(s, '#fff1c0', 7, 7, 3, 4);
      P(s, W[2], 4, 6, 1, 7); P(s, W[2], 12, 6, 1, 7); P(s, W[2], 8, 6, 1, 7);
      const fl = 0.5 + 0.5 * Math.sin(t * 9);
      if (fl > 0.6) P(s, '#ffffff', 7, 8, 1, 1);
      break;
    }
    case 'rug': {
      const y0 = h * 16 - 5;
      P(s, S[1], 1, y0, w * 16 - 2, 4); P(s, S[0], 2, y0, w * 16 - 4, 1);
      for (let x = 3; x < w * 16 - 3; x += 3) P(s, '#b35a3c', x, y0 + 2, 1, 1);
      for (let x = 2; x < w * 16 - 2; x += 4) P(s, S[3], x, y0 + 1, 2, 1);
      break;
    }
    case 'pebble_deco': {
      ell(s, 8, 13, 5, 2.5, '#807060'); ell(s, 8, 10, 4, 2.2, '#9a8a78'); ell(s, 8, 7, 3, 2, '#b8a894'); ell(s, 8, 4.5, 2, 1.5, '#d8ccbc');
      break;
    }
    case 'seed_pile': {
      ell(s, 8, 13, 7, 4, '#9a6430'); ell(s, 8, 12, 5.5, 3.5, '#b07a3a'); ell(s, 7, 10, 3, 2, '#c99050');
      for (let k = 0; k < 8; k++) P(s, '#7a4a20', 3 + Math.floor(hash2(k, 2, 3) * 10), 10 + Math.floor(hash2(2, k, 3) * 5));
      break;
    }
    case 'dried_flower': {
      ell(s, 8, 13, 4, 3, '#8a7a6a'); P(s, '#a8988a', 6, 11, 3, 1);
      line(s, '#8a7a40', 8, 11, 6, 3); line(s, '#8a7a40', 8, 11, 10, 4); line(s, '#8a7a40', 8, 11, 8, 2);
      P(s, '#d896b0', 5, 2, 2, 2); P(s, '#e8c070', 9, 3, 2, 2); P(s, '#c47aa0', 7, 1, 2, 2);
      break;
    }
    case 'shelf': {
      P(s, W[1], 1, 2, 2, 30); P(s, W[1], 29, 2, 2, 30);
      P(s, W[0], 1, 4, 30, 2); P(s, W[0], 1, 16, 30, 2); P(s, W[2], 1, 6, 30, 1); P(s, W[2], 1, 18, 30, 1);
      ell(s, 8, 13, 4, 3, '#b07a3a'); ell(s, 17, 14, 3, 2, '#9a8a78'); ell(s, 24, 12, 3, 4, '#a9ae4a');
      ell(s, 9, 26, 5, 4, '#c99050'); ell(s, 21, 27, 6, 3, '#a9ae4a');
      break;
    }
    case 'nestbed': {
      const cx = w * 8, cy = 11;
      ell(s, cx, cy + 1, 15, 5, S[2]); ell(s, cx, cy, 14, 4, S[1]); ell(s, cx, cy - 0.5, 10, 2.4, '#7a5a2a');
      for (let k = 0; k < 22; k++) { const a = hash2(k, 1, 9) * Math.PI * 2; const r = 11 + hash2(1, k, 9) * 3; line(s, k % 2 ? S[0] : S[3], cx + Math.cos(a) * r, cy + Math.sin(a) * 3.5, cx + Math.cos(a + 0.3) * (r + 3), cy + Math.sin(a + 0.3) * 4.2); }
      break;
    }
    case 'stone_display': ell(s, 8, 13, 5, 2, '#c8b07a'); ell(s, 8, 8, 3.5, 3, '#46a0b4'); P(s, '#ffffff', 7, 6); break;
    case 'curio': P(s, W[2], 2, 14, 12, 2); break;
    case 'wreath': for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; P(s, k % 2 ? '#4f8236' : '#e890aa', 8 + Math.round(Math.cos(a) * 5), 8 + Math.round(Math.sin(a) * 5), 2, 2); } break;
    case 'star_lamp': line(s, '#5a4a3a', 8, 0, 8, 3); ell(s, 8, 8, 5, 5, '#f0cc5c'); P(s, '#fff0a0', 7, 6, 2, 2); break;
    case 'curio_shelf': P(s, W[1], 2, 2, 2, 30); P(s, W[1], 28, 2, 2, 30); for (const yy of [2, 12, 22, 30]) P(s, W[2], 2, yy, 28, 2); break;
    case 'family_tree': P(s, W[1], 7, 14, 2, 18); ell(s, 8, 9, 6, 6, '#699c42'); break;
    case 'snowman': ell(s, 8, 11, 4, 4, '#eaf0f6'); ell(s, 8, 5, 3, 3, '#ffffff'); P(s, '#c03428', 5, 8, 7, 1); break;
    case 'storage': {
      const fill = Math.max(0, Math.min(1, extra.fill || 0));
      P(s, W[1], 1, 4, 2, 28); P(s, W[1], 29, 4, 2, 28); P(s, W[0], 1, 4, 30, 2); P(s, W[0], 1, 17, 30, 2);
      P(s, W[2], 3, 6, 26, 1); P(s, W[2], 3, 19, 26, 1);
      // かご 3 つ（中身は倉庫の量で増える）
      for (let i = 0; i < 3; i++) {
        const bx = 5 + i * 8;
        P(s, '#8a5a2c', bx, 11, 7, 5); P(s, '#a8743c', bx, 11, 7, 1);
        if (fill > i / 3) { ell(s, bx + 3.5, 10.5, 3, 1.8, ['#c99050', '#a9ae4a', '#b8a894'][i]); }
      }
      ell(s, 10, 28, 6, 3.5, fill > 0.1 ? '#c99050' : '#8a5a2c'); ell(s, 22, 28, 6, 3.5, fill > 0.5 ? '#a9ae4a' : '#8a5a2c');
      break;
    }
    default: P(s, '#c040c0', 2, 2, w * 16 - 4, h * 16 - 4);
  }
  outline(c);
  if (rot) { g.save(); g.translate(ox + w * 16, oy); g.scale(-1, 1); g.drawImage(c, 0, 0); g.restore(); }
  else g.drawImage(c, ox, oy);
}

// ───────── UI のツールアイコン 16×16 ─────────
export function drawToolIcon(g, tool, x, y) {
  const c = mk(16, 16), s = c.getContext('2d');
  switch (tool) {
    case 'dig': line(s, '#c8c0b0', 3, 13, 11, 5, 2); P(s, '#8a5a30', 2, 13, 3, 2); ell(s, 12, 4, 3, 2, '#a8a090', -0.8); break;
    case 'tunnel': P(s, '#7a4a2a', 1, 1, 14, 14); P(s, '#2c1a0f', 1, 6, 14, 4); P(s, '#2c1a0f', 6, 1, 4, 6); break;
    case 'room': P(s, '#7a4a2a', 1, 1, 14, 14); P(s, '#2c1a0f', 3, 4, 10, 8); P(s, '#d9b45e', 3, 11, 10, 1); P(s, '#9a6a3c', 3, 4, 1, 8); P(s, '#9a6a3c', 12, 4, 1, 8); break;
    case 'bed': ell(s, 8, 10, 7, 3.5, '#c09a46'); ell(s, 8, 9.5, 4.5, 1.8, '#7a5a2a'); break;
    case 'store': P(s, '#7e5430', 2, 3, 12, 11); P(s, '#9a6a3c', 2, 3, 12, 1); P(s, '#9a6a3c', 2, 8, 12, 1); ell(s, 6, 6, 2, 1.4, '#c99050'); ell(s, 10, 11, 2, 1.4, '#a9ae4a'); break;
    case 'furniture': P(s, '#5a4a3a', 7, 0, 1, 3); P(s, '#ffd27a', 4, 4, 7, 7); P(s, '#5e3c22', 3, 3, 9, 1); P(s, '#5e3c22', 4, 11, 7, 2); break;
    case 'remove': line(s, '#e06050', 3, 3, 12, 12, 2); line(s, '#e06050', 12, 3, 3, 12, 2); break;
  }
  outline(c);
  g.drawImage(c, x, y);
}

/** 夜露（夜だけ草むらに出る水滴。E で飲む）。(x,y) は足元 */
export function drawDew(g, x, y, t = 0) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = 'rgba(30,50,60,.25)'; g.fillRect(x - 4, y + 1, 8, 1);
  // 草の葉
  g.fillStyle = '#6f8a3a'; g.fillRect(x - 3, y - 3, 1, 4); g.fillRect(x + 2, y - 4, 1, 5); g.fillRect(x - 1, y - 2, 1, 3);
  g.fillStyle = '#8fa84a'; g.fillRect(x - 4, y - 4, 1, 2); g.fillRect(x + 3, y - 5, 1, 2);
  // しずく
  const drops = [[-3, -5], [2, -6], [0, -3]];
  drops.forEach(([dx, dy], i) => {
    const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 2);
    g.fillStyle = '#5ab4d8'; g.fillRect(x + dx - 1, y + dy, 3, 2); g.fillRect(x + dx, y + dy - 1, 1, 4);
    g.fillStyle = `rgba(230,250,255,${tw})`; g.fillRect(x + dx, y + dy, 1, 1);
  });
}

// ───────── Ver.0.3：捕食者・水たまり・入口のふさぎ（素材が無いときのコード描画）─────────
/** キツネ（右向き。flip で左）。(x,y) は足元 */
export function drawFox(g, x, y, { frame = 0, flip = false, dig = false } = {}) {
  g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1);
  const bob = dig ? 2 : Math.round(Math.sin(frame * Math.PI / 2));
  ell(g, -9, -9 - bob, 4, 2.6, '#b85a24'); ell(g, -12, -11 - bob, 2, 1.6, '#f4ecdc');
  for (const lx of [-5, 4]) P(g, '#45301e', lx + (frame % 2 ? 1 : -1), -5, 2, 5);
  ell(g, 0, -8 - bob, 8, 3.6, '#d87a34'); ell(g, 1, -6 - bob, 6, 1.6, '#f4ecdc');
  const hy = dig ? -4 : -11 - bob;
  ell(g, 8, hy, 3.5, 3, '#d87a34'); ell(g, 12, hy + 1, 2.4, 1.3, '#d87a34'); P(g, OL, 14, hy + 1);
  P(g, '#b85a24', 6, hy - 6, 2, 3); P(g, '#b85a24', 9, hy - 6, 2, 3); P(g, OL, 9, hy - 1);
  g.restore();
}
/** フクロウ（空から。z は高さ。wings: 0/1 羽ばたき、2 急降下） */
export function drawOwl(g, x, y, { frame = 0, flip = false } = {}) {
  g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1);
  if (frame < 2) { const up = frame === 0 ? -5 : 2; line(g, '#7e6248', -3, 0, -13, up); line(g, '#7e6248', 3, 0, 13, up); line(g, '#a08262', -4, 1, -12, up + 2); line(g, '#a08262', 4, 1, 12, up + 2); }
  ell(g, 0, 2, 4.5, 6, '#7e6248'); ell(g, 0, 3, 3, 4, '#cbb48e');
  ell(g, 0, -5, 4.2, 3.6, '#7e6248'); ell(g, 0.5, -4.6, 3.2, 2.6, '#e2d0ae');
  P(g, '#f0c020', -2, -5, 1, 1); P(g, '#f0c020', 2, -5, 1, 1); P(g, OL, -2, -4, 1, 1); P(g, OL, 2, -4, 1, 1);
  P(g, '#5c4430', -4, -9, 2, 2); P(g, '#5c4430', 3, -9, 2, 2);
  g.restore();
}
/** ヘビ（待ち伏せ：とぐろ・飛びかかり） */
export function drawSnake(g, x, y, { frame = 0, flip = false, lunge = false } = {}) {
  g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1);
  if (lunge) { for (let i = 0; i < 6; i++) ell(g, -12 + i * 4, -2 - i * 0.8, 2.2, 1.6, i % 2 ? '#7a7234' : '#9c9448'); ell(g, 12, -7, 2.6, 1.8, '#9c9448'); }
  else { ell(g, -1, -3, 7.5, 3, '#7a7234'); ell(g, -1, -5, 5, 2.2, '#9c9448'); ell(g, 6, -9, 2.4, 1.7, '#9c9448'); line(g, '#7a7234', 3, -6, 5, -8); }
  P(g, '#f0c020', lunge ? 13 : 7, lunge ? -8 : -10, 1, 1);
  if (frame % 2) P(g, '#c02a2a', lunge ? 15 : 9, lunge ? -7 : -9, 2, 1);
  g.restore();
}
/** 水たまり（雨のあと。E で飲む） */
export function drawPuddle(g, x, y, t = 0) {
  ell(g, x, y, 6.5, 3, '#2f6e9a'); ell(g, x, y - 0.4, 5, 2, '#5fa9c9');
  const tw = 0.5 + 0.5 * Math.sin(t * 2 + x);
  g.fillStyle = `rgba(230,250,255,${0.5 + 0.4 * tw})`; g.fillRect(Math.round(x - 2), Math.round(y - 1), 2, 1);
}
/** ふさいだ入口（小石を積む） */
export function drawPlug(g, x, y) {
  for (const [dx, dy, r] of [[-4, 0, 2.4], [0, -1, 2.6], [4, 0, 2.3], [-2, 2, 2], [2, 2, 2.2]]) { ell(g, x + dx, y + dy, r, r * 0.75, '#a09080'); P(g, '#e2d6c4', x + dx - 1, y + dy - 1); }
}
