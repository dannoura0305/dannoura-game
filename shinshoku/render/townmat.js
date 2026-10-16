// 町の材質（フェーズ9）：手続きで描いた「町の地図帳」1 枚（2048×2048・256px の枠 8×8）と、枠の中で繰り返す材質。
// 道（アスファルト・ひび・補修跡）・歩道（インターロッキング）・縁石・ブロック塀・外壁（サイディング・モルタル・タイル）・瓦・トタン・
// 窓（枠・カーテン・点いた窓）・止まれ・マンホール（独自の柄）など。どの面も 1 つの材質＝描画呼び出し 1 回で描ける。
// 仕組み：頂点の属性 tileR（枠の u0,v0,幅,高さ）と uv（枠の単位＝1 で 1 回）から、シェーダーで fract して枠の中を繰り返す。
// 境目の線が出ないよう textureGrad（元の uv の微分）で読む。すべて独自の柄（実在の自治体・会社の意匠を使わない）。
import * as THREE from 'three';
import { gradientMap, JP_FONT, ctx2d } from './toon.js';

const N = 8, S = 256, W = N * S;                      // 横 8 枠（2048px）
export const TILES = [
  'asphalt', 'asphalt2', 'interlock', 'concrete', 'curb', 'block', 'siding', 'siding2',
  'mortar', 'tilewall', 'wood', 'kawara', 'kawara2', 'galv', 'win_dark', 'win_lit',
  'win_curtain', 'win_shoji', 'door_house', 'garage', 'shopglass', 'konbini', 'rail', 'brick',
  'grass', 'gravel', 'water', 'tomare', 'manhole', 'fence', 'hedge', 'field',
  'arcade_floor', 'shutter', 'balcony', 'acunit', 'win_lit2', 'stone', 'lane', 'crosswalk',
  'pole', 'roof_flat', 'win_office', 'win_office_lit', 'paving', 'drain', 'leaves', 'puddle',
  // フェーズ10：町家の格子（暗い・灯り）・ガラスの壁（暗い・灯り）・広場の石・さびの跡（消雪の水）・点字ブロック・雪囲いのわら・路面電車の軌道・バスの路面の字
  'koshi', 'koshi_lit', 'curtainwall', 'curtainwall_lit', 'granite', 'rust', 'tactile', 'straw',
  'trackbed', 'busmark', 'panel', 'louver', 'white',
];
const IDX = Object.fromEntries(TILES.map((k, i) => [k, i]));
const ROWS = Math.ceil(TILES.length / N), HH = ROWS * S;   // 縦は使う行だけ（2048×1536）
/** 枠の範囲（UV）：[u0, v0, du, dv]（内側へ少し寄せる＝隣の枠がにじまない） */
export function tileRect(name) {
  const i = IDX[name] ?? 0, col = i % N, row = Math.floor(i / N), pu = 3 / W, pv = 3 / HH;
  return [col / N + pu, 1 - (row + 1) / ROWS + pv, 1 / N - pu * 2, 1 / ROWS - pv * 2];
}

// 決まった乱数（毎回同じ絵）
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
function noise(g, w, h, r, n, a, col = '0,0,0', sz = [1, 3]) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${col},${(a * (0.4 + r() * 0.6)).toFixed(3)})`; const s = sz[0] + r() * (sz[1] - sz[0]); g.fillRect(r() * w, r() * h, s, s); } }
function cracks(g, r, n, w, h) { g.strokeStyle = 'rgba(10,10,14,.55)'; g.lineWidth = 1.2; for (let i = 0; i < n; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } }
function rectsGrid(g, w, h, cw, ch, gap, base, vary, r, stagger = 0) {
  for (let y = 0, row = 0; y < h; y += ch, row++) for (let x = -cw; x < w + cw; x += cw) {
    const ox = stagger && row % 2 ? cw * stagger : 0; const k = vary * (r() - 0.5);
    g.fillStyle = shade(base, k); g.fillRect(x + ox + gap / 2, y + gap / 2, cw - gap, ch - gap);
  }
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * (1 + k)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function windowTile(g, w, h, r, kind) {
  // 窓：アルミの枠・2 枚の引き違い・内側（暗い／点いた／カーテン／障子）
  g.fillStyle = '#c8ccd2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#9aa0a8'; g.fillRect(6, 6, w - 12, h - 12);
  const inner = (x, y, ww, hh) => {
    if (kind === 'dark') { const gr = g.createLinearGradient(x, y, x + ww, y + hh); gr.addColorStop(0, '#1c2230'); gr.addColorStop(1, '#0c0f18'); g.fillStyle = gr; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(160,180,220,.18)'; g.beginPath(); g.moveTo(x + ww * 0.15, y); g.lineTo(x + ww * 0.45, y); g.lineTo(x + ww * 0.1, y + hh); g.lineTo(x - ww * 0.2, y + hh); g.fill(); }
    if (kind === 'lit' || kind === 'lit2') { const gr = g.createRadialGradient(x + ww / 2, y + hh * 0.3, 4, x + ww / 2, y + hh / 2, ww); gr.addColorStop(0, kind === 'lit' ? '#ffe2a8' : '#e8f0ff'); gr.addColorStop(1, kind === 'lit' ? '#c88a4a' : '#8aa0c8'); g.fillStyle = gr; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(60,40,30,.35)'; g.fillRect(x + ww * 0.1, y + hh * 0.62, ww * 0.35, hh * 0.38); }
    if (kind === 'curtain') { g.fillStyle = '#3a2a3a'; g.fillRect(x, y, ww, hh); for (let i = 0; i < ww; i += 7) { g.fillStyle = i % 14 ? '#e0b088' : '#c89068'; g.fillRect(x + i, y, 5, hh); } const gr = g.createLinearGradient(x, y, x, y + hh); gr.addColorStop(0, 'rgba(255,220,160,.0)'); gr.addColorStop(1, 'rgba(120,60,30,.35)'); g.fillStyle = gr; g.fillRect(x, y, ww, hh); }
    if (kind === 'shoji') { g.fillStyle = '#f4e4bc'; g.fillRect(x, y, ww, hh); g.strokeStyle = '#8a6a44'; g.lineWidth = 3; for (let i = 0; i <= 3; i++) { g.beginPath(); g.moveTo(x + ww * i / 3, y); g.lineTo(x + ww * i / 3, y + hh); g.stroke(); } for (let i = 0; i <= 5; i++) { g.beginPath(); g.moveTo(x, y + hh * i / 5); g.lineTo(x + ww, y + hh * i / 5); g.stroke(); } }
  };
  const mx = w / 2; inner(12, 12, mx - 16, h - 24); inner(mx + 4, 12, mx - 16, h - 24);
  g.fillStyle = '#d8dce2'; g.fillRect(mx - 4, 8, 8, h - 16);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(6, h - 12, w - 12, 6);
  void r;
}
const DRAW = {
  asphalt(g, w, h, r) { g.fillStyle = '#3a3a40'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 2600, 0.22, '0,0,0', [1, 2]); noise(g, w, h, r, 900, 0.10, '200,200,210', [1, 2]); cracks(g, r, 2, w, h); },
  asphalt2(g, w, h, r) { DRAW.asphalt(g, w, h, r); g.fillStyle = 'rgba(20,20,26,.55)'; g.fillRect(40, 30, 120, 90); g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeRect(40, 30, 120, 90); cracks(g, r, 5, w, h); const gr = g.createRadialGradient(180, 190, 4, 180, 190, 60); gr.addColorStop(0, 'rgba(30,40,70,.6)'); gr.addColorStop(1, 'rgba(30,40,70,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(180, 190, 70, 40, 0.2, 0, 7); g.fill(); },
  interlock(g, w, h, r) { g.fillStyle = '#3a3438'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 64, 32, 3, '#8a7a72', 0.22, r, 0.5); noise(g, w, h, r, 500, 0.12); },
  concrete(g, w, h, r) { g.fillStyle = '#8c8a88'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 2200, 0.12, '0,0,0', [1, 2]); noise(g, w, h, r, 600, 0.08, '255,255,255', [1, 2]); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, h - 2, w, 2); g.fillRect(w - 2, 0, 2, h); },
  curb(g, w, h, r) { g.fillStyle = '#a8a6a2'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, 0, 3, h); } noise(g, w, h, r, 900, 0.14); },
  block(g, w, h, r) { g.fillStyle = '#6a6866'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 128, 64, 5, '#9a9894', 0.08, r, 0.5); noise(g, w, h, r, 1400, 0.16); g.fillStyle = 'rgba(30,40,20,.25)'; g.fillRect(0, h - 26, w, 26); },
  siding(g, w, h, r) { g.fillStyle = '#d6cdbc'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y + 2, w, 2); } for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, 0, 2, h); } noise(g, w, h, r, 400, 0.06); },
  siding2(g, w, h, r) { g.fillStyle = '#c4c8cc'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x, 0, 2, h); } noise(g, w, h, r, 500, 0.07); g.fillStyle = 'rgba(40,40,30,.2)'; for (let i = 0; i < 6; i++) g.fillRect(r() * w, 0, 3, h * r()); },
  mortar(g, w, h, r) { g.fillStyle = '#c8c0b2'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 3000, 0.08, '0,0,0', [1, 3]); cracks(g, r, 1, w, h); g.fillStyle = 'rgba(40,36,30,.22)'; for (let i = 0; i < 8; i++) { const x = r() * w; g.fillRect(x, 0, 2 + r() * 4, h * (0.3 + r() * 0.7)); } },
  tilewall(g, w, h, r) { g.fillStyle = '#4a3a34'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 64, 21, 3, '#8a6450', 0.14, r, 0); noise(g, w, h, r, 400, 0.08); },
  wood(g, w, h, r) { g.fillStyle = '#5a3e2c'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 22) { g.fillStyle = shade('#6a4a34', (r() - 0.5) * 0.25); g.fillRect(x, 0, 20, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 20, 0, 2, h); } noise(g, w, h, r, 800, 0.1, '0,0,0', [1, 4]); },
  kawara(g, w, h, r) { g.fillStyle = '#23262e'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#2a2e38'); gr.addColorStop(0.5, shade('#5a6070', (r() - 0.5) * 0.15)); gr.addColorStop(1, '#2a2e38'); g.fillStyle = gr; g.fillRect(x, y, 32, 30); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y + 28, 32, 4); } },
  kawara2(g, w, h, r) { g.fillStyle = '#3a2826'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#3a2a28'); gr.addColorStop(0.5, shade('#7a5048', (r() - 0.5) * 0.18)); gr.addColorStop(1, '#3a2a28'); g.fillStyle = gr; g.fillRect(x, y, 32, 30); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y + 28, 32, 4); } },
  galv(g, w, h, r) { g.fillStyle = '#4a6a7a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#2e4652'); gr.addColorStop(0.5, '#6a8c9a'); gr.addColorStop(1, '#2e4652'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } g.fillStyle = 'rgba(120,60,30,.35)'; for (let i = 0; i < 20; i++) g.fillRect(r() * w, r() * h, 4 + r() * 20, 2 + r() * 30); },
  win_dark(g, w, h, r) { windowTile(g, w, h, r, 'dark'); },
  win_lit(g, w, h, r) { windowTile(g, w, h, r, 'lit'); },
  win_lit2(g, w, h, r) { windowTile(g, w, h, r, 'lit2'); },
  win_curtain(g, w, h, r) { windowTile(g, w, h, r, 'curtain'); },
  win_shoji(g, w, h, r) { windowTile(g, w, h, r, 'shoji'); },
  door_house(g, w, h, r) { // フェーズ11：玄関の戸（アルミの枠・木目の板・縦の型板ガラス（中の灯り）・銀の取っ手・鍵）
    g.fillStyle = '#4a4440'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(14, 0, w - 14, 0); gr.addColorStop(0, '#8a6448'); gr.addColorStop(0.5, '#a07a58'); gr.addColorStop(1, '#7a5640'); g.fillStyle = gr; g.fillRect(14, 10, w - 28, h - 14);
    for (let x = 16; x < w - 14; x += 6) { g.fillStyle = `rgba(40,24,14,${(0.08 + r() * 0.14).toFixed(2)})`; g.fillRect(x, 10, 2, h - 14); }
    g.strokeStyle = 'rgba(30,20,12,.45)'; g.lineWidth = 2; g.strokeRect(30, 24, w - 60, h - 44);
    const gl = g.createLinearGradient(0, 30, 0, h - 30); gl.addColorStop(0, '#f2e2c0'); gl.addColorStop(1, '#c8a878'); g.fillStyle = gl; g.fillRect(44, 30, 26, h - 60);
    g.fillStyle = 'rgba(255,255,255,.25)'; for (let y = 34; y < h - 34; y += 8) g.fillRect(46, y, 22, 2);
    g.fillStyle = '#d8dce0'; g.fillRect(w - 58, h * 0.36, 12, h * 0.22); g.fillStyle = '#8a8e92'; g.fillRect(w - 56, h * 0.36, 3, h * 0.22);
    g.fillStyle = '#c8ccd0'; g.beginPath(); g.arc(w - 52, h * 0.31, 4, 0, 7); g.fill(); },
  garage(g, w, h, r) { g.fillStyle = '#8a9098'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 10) { g.fillStyle = y % 20 ? '#a0a6ae' : '#747a82'; g.fillRect(0, y, w, 4); } noise(g, w, h, r, 300, 0.1); },
  shopglass(g, w, h, r) { g.fillStyle = '#0e1018'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a5e66'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8); g.fillRect(w / 2 - 3, 0, 6, h); g.fillStyle = 'rgba(150,170,210,.15)'; g.beginPath(); g.moveTo(30, 8); g.lineTo(90, 8); g.lineTo(40, h - 8); g.lineTo(-20, h - 8); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 5; i++) g.fillRect(20 + r() * 200, 120 + r() * 100, 20, 30); },
  konbini(g, w, h, r) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f8fbff'); gr.addColorStop(1, '#c8d8ec'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let x = 10; x < w; x += 40) { g.fillStyle = ['#d84a4a', '#4a8ad8', '#e8c040', '#4ab070', '#c86ad8'][Math.floor(r() * 5)]; g.fillRect(x, h * 0.45, 30, h * 0.22); g.fillStyle = '#7a8090'; g.fillRect(x - 4, h * 0.42, 38, 4); g.fillRect(x - 4, h * 0.68, 38, 4); } g.fillStyle = '#6a7080'; g.fillRect(0, 0, w, 6); g.fillRect(w / 2 - 3, 0, 6, h); },
  rail(g, w, h, r) { g.clearRect(0, 0, w, h); g.fillStyle = '#d8dad8'; g.fillRect(0, 20, w, 14); g.fillRect(0, h - 40, w, 10); for (let x = 8; x < w; x += 32) g.fillRect(x, 20, 6, h - 40); void r; },
  brick(g, w, h, r) { g.fillStyle = '#3a2e2c'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 64, 32, 3, '#7a5a4c', 0.2, r, 0.5); noise(g, w, h, r, 500, 0.1); },
  grass(g, w, h, r) { g.fillStyle = '#2a3a26'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${60 + r() * 50 | 0},${90 + r() * 60 | 0},${40 + r() * 30 | 0},.6)`; g.fillRect(r() * w, r() * h, 1.5, 3 + r() * 5); } },
  gravel(g, w, h, r) { g.fillStyle = '#6a6662'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = shade('#9a948c', (r() - 0.5) * 0.6); const s = 2 + r() * 4; g.fillRect(r() * w, r() * h, s, s * 0.8); } },
  water(g, w, h, r) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0e1a26'); gr.addColorStop(1, '#162838'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(140,170,210,.25)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const y = r() * h, x = r() * w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 4, x + 40, y); g.stroke(); } },
  tomare(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.scale(1, 1.6); g.fillStyle = '#eceae2'; g.font = `bold 88px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('止まれ', 0, 0); g.restore(); },
  manhole(g, w, h, r) { g.clearRect(0, 0, w, h); g.fillStyle = '#2a2826'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.strokeStyle = '#5a5650'; g.lineWidth = 8; g.stroke();
    // 独自の柄：波と猫の足あと（どこの自治体の意匠でもない）
    g.strokeStyle = '#6a6660'; g.lineWidth = 5; for (let k = -2; k <= 2; k++) { g.beginPath(); for (let x = 30; x <= w - 30; x += 6) { const y = h / 2 + k * 30 + Math.sin(x / 18) * 8; if (x === 30) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = '#7a766e'; const px = w / 2, py = h / 2; g.beginPath(); g.ellipse(px, py + 10, 22, 18, 0, 0, 7); g.fill(); for (const [dx, dy] of [[-24, -20], [-8, -32], [8, -32], [24, -20]]) { g.beginPath(); g.arc(px + dx, py + dy, 8, 0, 7); g.fill(); } noise(g, w, h, r, 400, 0.2); },
  fence(g, w, h, r) { g.clearRect(0, 0, w, h); g.strokeStyle = '#8a9088'; g.lineWidth = 2; for (let i = -h; i < w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); } g.fillStyle = '#5a6058'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 6, h); void r; },
  hedge(g, w, h, r) { g.fillStyle = '#1a2a1a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${30 + r() * 40 | 0},${60 + r() * 60 | 0},${30 + r() * 30 | 0},.8)`; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, 7); g.fill(); } },
  field(g, w, h, r) { g.fillStyle = '#1c2420'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 14) { g.fillStyle = `rgba(${70 + r() * 30 | 0},${80 + r() * 40 | 0},${40},.8)`; g.fillRect(x + r() * 3, y, 2, 6); } g.fillStyle = 'rgba(90,120,160,.15)'; g.fillRect(0, 0, w, h); },
  arcade_floor(g, w, h, r) { g.fillStyle = '#2a2830'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 64, 64, 4, '#5a5660', 0.12, r, 0); for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.fillStyle = 'rgba(140,110,90,.25)'; g.fillRect(x + 2, y + 2, 60, 60); } noise(g, w, h, r, 600, 0.12); },
  shutter(g, w, h, r) { g.fillStyle = '#9aa0a8'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#b4bac2' : '#7f858d'; g.fillRect(0, y, w, 3); } g.fillStyle = 'rgba(40,30,20,.18)'; for (let i = 0; i < 60; i++) g.fillRect(r() * w, r() * h, 1 + r() * 3, 6 + r() * 40); },
  balcony(g, w, h, r) { g.clearRect(0, 0, w, h); g.fillStyle = '#c8ccd0'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); for (let x = 4; x < w; x += 14) g.fillRect(x, 0, 4, h); void r; },
  acunit(g, w, h, r) { g.fillStyle = '#d8dad6'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a4c50'; g.beginPath(); g.arc(w * 0.62, h / 2, h * 0.36, 0, 7); g.fill(); g.strokeStyle = '#9a9c98'; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(w * 0.62, h / 2); g.lineTo(w * 0.62 + Math.cos(k) * h * 0.34, h / 2 + Math.sin(k) * h * 0.34); g.stroke(); } g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 20; y < h - 20; y += 10) g.fillRect(16, y, w * 0.3, 4); noise(g, w, h, r, 300, 0.1); },
  stone(g, w, h, r) { g.fillStyle = '#4a4a48'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 86, 52, 4, '#8a8682', 0.2, r, 0.33); noise(g, w, h, r, 900, 0.15); },
  lane(g, w, h, r) { DRAW.asphalt(g, w, h, r); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 4; i++) g.fillRect(r() * w, r() * h, 30 + r() * 60, 20 + r() * 40); },
  crosswalk(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = '#e8e6de'; for (let x = 0; x < w; x += 64) g.fillRect(x + 8, 0, 40, h); },
  pole(g, w, h, r) { g.fillStyle = '#8a8682'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 1600, 0.14); for (let y = 30; y < h; y += 70) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, w, 2); } g.fillStyle = '#e8d040'; g.fillRect(0, h - 40, w, 14); g.fillStyle = '#1a1a1a'; for (let x = 0; x < w; x += 24) g.fillRect(x, h - 40, 12, 14); },
  roof_flat(g, w, h, r) { g.fillStyle = '#4a4a4c'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 1600, 0.15); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) g.fillRect(r() * w, r() * h, 60, 2); },
  win_office(g, w, h, r) { g.fillStyle = '#585c64'; g.fillRect(0, 0, w, h); g.fillStyle = '#121620'; g.fillRect(10, 30, w - 20, h - 70); g.fillStyle = 'rgba(160,180,220,.16)'; g.fillRect(20, 34, 50, h - 80); g.fillStyle = '#6a6e76'; g.fillRect(w / 2 - 3, 30, 6, h - 70); void r; },
  win_office_lit(g, w, h, r) { g.fillStyle = '#585c64'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 30, 0, h - 40); gr.addColorStop(0, '#f0f6ff'); gr.addColorStop(1, '#a8c0e0'); g.fillStyle = gr; g.fillRect(10, 30, w - 20, h - 70); g.fillStyle = 'rgba(40,50,70,.35)'; for (let i = 0; i < 4; i++) g.fillRect(20 + r() * 180, 60 + r() * 80, 30, 40); g.fillStyle = '#6a6e76'; g.fillRect(w / 2 - 3, 30, 6, h - 70); },
  paving(g, w, h, r) { g.fillStyle = '#3c383c'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 42, 42, 3, '#7c7476', 0.18, r, 0); noise(g, w, h, r, 500, 0.12); },
  drain(g, w, h) { g.fillStyle = '#5a5a58'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161a'; for (let x = 10; x < w; x += 18) g.fillRect(x, 20, 8, h - 40); },
  leaves(g, w, h, r) { g.clearRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.fillStyle = ['#8a4a20', '#a86a28', '#6a3a1a', '#b88a30'][Math.floor(r() * 4)]; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6); g.beginPath(); g.ellipse(0, 0, 7, 3.5, 0, 0, 7); g.fill(); g.restore(); } },
  koshi(g, w, h, r, lit) { // 町家の格子（細い縦の桟・上下の貫）：奥が暗い（lit＝障子越しの灯り）
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, lit ? '#f0c888' : '#1a1410'); gr.addColorStop(1, lit ? '#c8884a' : '#0c0a08'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (lit) { g.fillStyle = 'rgba(255,240,200,.35)'; for (let y = 0; y < h; y += 64) g.fillRect(0, y + 30, w, 2); }
    for (let x = 0; x < w; x += 16) { g.fillStyle = shade('#5a3a22', (r() - 0.5) * 0.2); g.fillRect(x, 0, 9, h); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 9, 0, 1, h); }
    g.fillStyle = '#4a3020'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, h / 2 - 4, w, 8);
    noise(g, w, h, r, 300, 0.12); },
  koshi_lit(g, w, h, r) { DRAW.koshi(g, w, h, r, true); },
  curtainwall(g, w, h, r, lit) { // ガラスの壁（縦横の方立て・空の映り込み・ところどころ灯り）
    g.fillStyle = '#3a4048'; g.fillRect(0, 0, w, h);
    const cw = 64, ch = 128;
    for (let y = 0; y < h; y += ch) for (let x = 0; x < w; x += cw) {
      const on = lit ? r() < 0.55 : r() < 0.08; const gr = g.createLinearGradient(x, y, x + cw, y + ch);
      if (on) { gr.addColorStop(0, '#f4ead0'); gr.addColorStop(1, '#c8a878'); } else { gr.addColorStop(0, '#1c2a3c'); gr.addColorStop(0.5, '#2a3c52'); gr.addColorStop(1, '#101824'); }
      g.fillStyle = gr; g.fillRect(x + 4, y + 4, cw - 8, ch - 8);
      if (on) { g.fillStyle = 'rgba(60,40,30,.3)'; g.fillRect(x + 8, y + ch * 0.6, cw * 0.4, ch * 0.35); } else { g.fillStyle = 'rgba(160,190,230,.12)'; g.fillRect(x + 8, y + 6, 8, ch - 12); }
    }
    g.fillStyle = '#7a828c'; for (let y = 0; y < h; y += ch) g.fillRect(0, y, w, 4); for (let x = 0; x < w; x += cw) g.fillRect(x, 0, 4, h); },
  curtainwall_lit(g, w, h, r) { DRAW.curtainwall(g, w, h, r, true); },
  granite(g, w, h, r) { g.fillStyle = '#2c2a2e'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 128, 64, 3, '#8a8488', 0.12, r, 0.5); noise(g, w, h, r, 1600, 0.10, '255,255,255', [1, 2]); noise(g, w, h, r, 1200, 0.12); },
  rust(g, w, h, r) { g.clearRect(0, 0, w, h); // 消雪の水の出口から伸びるさびの跡（橙〜茶色）
    for (let i = 0; i < 26; i++) { const y = h * 0.5 + (r() - 0.5) * h * 0.9, x = w / 2 + (r() - 0.5) * w * 0.25 * (1 - Math.abs(y - h / 2) / h); g.fillStyle = `rgba(${150 + r() * 50 | 0},${60 + r() * 30 | 0},${20 + r() * 10 | 0},${(0.55 + r() * 0.4).toFixed(2)})`; g.beginPath(); g.ellipse(x, y, 10 + r() * 28, 20 + r() * 60, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(200,90,30,.85)'; g.beginPath(); g.ellipse(w / 2, h / 2, 26, 40, 0, 0, 7); g.fill(); },
  tactile(g, w, h, r) { g.fillStyle = '#d8b020'; g.fillRect(0, 0, w, h); for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.fillStyle = '#f0c830'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 2, y + 2, 9, 0, 7); g.fill(); } noise(g, w, h, r, 400, 0.15); },
  straw(g, w, h, r) { g.fillStyle = '#8a6a3a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${170 + r() * 50 | 0},${130 + r() * 40 | 0},${70 + r() * 30 | 0},.7)`; g.lineWidth = 1 + r(); const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 20 + r() * 30); g.stroke(); }
    g.fillStyle = '#3a2a1a'; for (let y = 40; y < h; y += 80) g.fillRect(0, y, w, 6); },
  trackbed(g, w, h, r) { g.fillStyle = '#5a5856'; g.fillRect(0, 0, w, h); noise(g, w, h, r, 2400, 0.16, '0,0,0', [1, 3]); rectsGrid(g, w, h, 256, 64, 2, '#6a6866', 0.1, r, 0); g.fillStyle = 'rgba(30,24,20,.35)'; g.fillRect(w * 0.3, 0, w * 0.4, h); },
  busmark(g, w, h) { g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.scale(1, 1.6); g.fillStyle = '#e8d070'; g.strokeStyle = '#e8d070'; g.lineWidth = 9; g.lineJoin = 'round'; g.font = `900 104px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('バス', 0, 0); g.fillText('バス', 0, 0); g.restore(); },
  panel(g, w, h, r) { g.fillStyle = '#9aa0a4'; g.fillRect(0, 0, w, h); rectsGrid(g, w, h, 128, 128, 4, '#b8bcc0', 0.06, r, 0); noise(g, w, h, r, 500, 0.06); g.fillStyle = 'rgba(40,40,40,.18)'; for (let i = 0; i < 5; i++) g.fillRect(r() * w, 0, 2, h); },
  white(g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); },
  louver(g, w, h, r) { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 20) { g.fillStyle = '#8a9096'; g.fillRect(0, y, w, 8); g.fillStyle = '#c8ccd0'; g.fillRect(0, y, w, 2); } noise(g, w, h, r, 200, 0.08); },
  puddle(g, w, h, r) { g.clearRect(0, 0, w, h); const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(14,20,40,.85)'); gr.addColorStop(0.7, 'rgba(18,26,48,.6)'); gr.addColorStop(1, 'rgba(18,26,48,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2.6, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(150,170,220,.25)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(w / 2 + (r() - 0.5) * 60, h / 2 + (r() - 0.5) * 30, 10 + r() * 20, 5 + r() * 8, 0, 0, 7); g.stroke(); } },
};

let _atlas = null;
/** 町の地図帳（1 回だけ描く） */
export function townAtlas() {
  if (_atlas) return _atlas;
  const t0 = performance.now();
  const c = document.createElement('canvas'); c.width = W; c.height = HH; const g = ctx2d(c);
  TILES.forEach((name, i) => {
    const x = (i % N) * S, y = Math.floor(i / N) * S;
    g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, S, S); g.clip();
    (DRAW[name] || DRAW.concrete)(g, S, S, rng(1000 + i * 97));
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  _atlas = t; townAtlas.ms = Math.round(performance.now() - t0); return t;
}

// 枠の中で繰り返す（textureGrad：元の uv の微分＝境目の線が出ない）
function patch(m, alpha) {
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec4 tileR; varying vec4 vTileR;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vTileR = tileR;');
    sh.fragmentShader = 'varying vec4 vTileR;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec2 tUv = vTileR.xy + fract(vMapUv) * vTileR.zw;
  vec4 sampledDiffuseColor = textureGrad(map, tUv, dFdx(vMapUv) * vTileR.zw, dFdy(vMapUv) * vTileR.zw);
  ${alpha ? 'if (sampledDiffuseColor.a < 0.45) discard;' : ''}
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  m.customProgramCacheKey = () => 'shtile' + (alpha ? 'a' : '') + (m.isMeshBasicMaterial ? 'b' : 't');
  return m;
}
/** 町の材質の組：tex（陰影つき。透ける枠＝手すり・金網・止まれは捨てる）・texglow（自ら光る：点いた窓・店の中）。texa は tex と同じ（古い呼び名） */
export function townMats() {
  const map = townAtlas();
  return {
    tex: patch(new THREE.MeshToonMaterial({ vertexColors: true, map, gradientMap: gradientMap() }), true),
    texglow: patch(new THREE.MeshBasicMaterial({ vertexColors: true, map })),
  };
}
export const TILE_KEYS = new Set(['tex', 'texglow']);

/**
 * 箱の形に枠の属性をつける。fit：面ごとに 0〜1（窓・扉・看板 1 枚）／それ以外：世界の座標で ts（m）ごとに 1 回（隣の箱とつながる）。
 * geo は位置・回転を済ませた後（世界の座標）に呼ぶ。
 */
export function applyTile(geo, name, opt = {}) {
  const P = geo.attributes.position, Nn = geo.attributes.normal, n = P.count;
  const rect = tileRect(name), tr = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) tr.set(rect, i * 4);
  geo.setAttribute('tileR', new THREE.BufferAttribute(tr, 4));
  if (opt.fit) return geo;
  const ts = opt.ts || 2, tsy = opt.tsy || ts, uv = geo.attributes.uv;
  for (let i = 0; i < n; i++) {
    const nx = Math.abs(Nn.getX(i)), ny = Math.abs(Nn.getY(i)), nz = Math.abs(Nn.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ny >= nx && ny >= nz) uv.setXY(i, x / ts, -z / tsy);
    else if (nx >= nz) uv.setXY(i, (Nn.getX(i) > 0 ? -z : z) / ts, y / tsy);
    else uv.setXY(i, (Nn.getZ(i) > 0 ? x : -x) / ts, y / tsy);
  }
  uv.needsUpdate = true;
  return geo;
}
