// tobinezumi/client/nest-view.js — 巣の断面を描く（全体モードと閲覧モードで共通）
// 巣データ 1 つ → 768×384 の下絵キャンバス（土・岩・掘った空間・部屋の梁・はしご・坂）を作り、
// 家具は毎フレーム同じセル座標に描く。灯りはランタンの位置から。
import * as A from './art.js';
import { Sprites } from './sprites.js';
import { C, CELL, cellsOf, roomAt } from '../shared/nest-rules.js';
import { walkLayout } from './nest-layout.js';
import { hash2 } from '../shared/rng.js';
import { FURN_ASSET } from './ui.js';

export class NestView {
  constructor() { this.data = null; this.base = null; this.layout = null; this.fill = 0; }
  setData(data, { fill = this.fill } = {}) {
    if (data === this.data && fill === this.fill) return;
    this.data = data; this.fill = fill;
    this.layout = walkLayout(data);
    this.assets = Sprites.has('nest.soil') && Sprites.has('nest.wall') && Sprites.has('nest.edge');
    this.lift = this.assets ? 3 : 0;   // 素材の床は縁の分だけ 3px 高い（見た目だけ。当たり判定はセルの下辺）
    const lm = Sprites.meta('nest.lantern');
    if (lm && lm.light) for (const l of this.layout.lights) { l.r = Math.round(lm.light.radius * 1.5); l.y = l.y - 9 + 2 + lm.light.y; }
    this.base = this.assets ? renderBaseAssets(data, this.layout) : renderBase(data, this.layout);
  }
  /** 家具・備え付け（t でランタンが揺れる） */
  drawObjects(g, t) {
    for (const o of this.layout.objects) drawObject(g, o, t, this.fill, this.lift);
  }
  /** 暗がりと灯り。cam=(x,y) は画面左上の巣座標、z は拡大率、(vx,vy) は画面上の原点 */
  drawLight(g, W, H, cam, z, dark, t, extra = []) {
    if (!this._lc || this._lc.width !== W) { this._lc = A.mk(W, H); }
    const lc = this._lc, lg = lc.getContext('2d');
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, W, H);
    lg.fillStyle = `rgba(14,7,18,${dark})`; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    const S = (x, y) => [(x - cam.x) * z, (y - cam.y) * z];
    const hole = (x, y, r, a) => {
      const [sx, sy] = S(x, y), R = r * z;
      const gr = lg.createRadialGradient(sx, sy, 0, sx, sy, R);
      gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(sx - R, sy - R, R * 2, R * 2);
    };
    for (const l of this.layout.lights) hole(l.x, l.y, l.r * (1 + 0.04 * Math.sin(t * 7 + l.x)), 1);
    const ex = this.layout.exit;
    hole(ex.x, ex.y - 16, 56, 0.95);
    for (const e of extra) hole(e.x, e.y, e.r, e.a || 0.8);
    g.drawImage(lc, 0, 0);
    // 暖かい灯りの色
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const l of this.layout.lights) {
      const [sx, sy] = S(l.x, l.y), R = l.r * 0.8 * z;
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, R);
      gr.addColorStop(0, 'rgba(255,170,70,0.22)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gr; g.fillRect(sx - R, sy - R, R * 2, R * 2);
    }
    g.restore();
  }
}

function P(g, c, x, y, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x, y, w, h); }

export function renderBase(data, layout) {
  const w = data.w, h = data.h, sy = data.surfaceY;
  const cv = A.mk(w * CELL, h * CELL), g = cv.getContext('2d');
  const cells = cellsOf(data);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? C.SOIL : cells[y * w + x];
  const open = (x, y) => at(x, y) === C.OPEN;
  const solidC = (x, y) => { const c = at(x, y); return c === C.SOIL || c === C.ROCK; };
  const seed = 17;
  const has = k => Sprites.has(k);

  // 空（地表より上）
  const sky = g.createLinearGradient(0, 0, 0, sy * CELL);
  sky.addColorStop(0, '#6a4a78'); sky.addColorStop(0.6, '#d8846a'); sky.addColorStop(1, '#f2b880');
  g.fillStyle = sky; g.fillRect(0, 0, w * CELL, sy * CELL);
  // 遠くの丘と低木のシルエット
  for (let x = 0; x < w * CELL; x++) {
    const hh = 6 + Math.round(Math.sin(x / 37) * 3 + Math.sin(x / 13 + 1) * 1.5);
    P(g, '#b5705a', x, sy * CELL - hh, 1, hh);
    const h2 = 3 + Math.round(Math.sin(x / 19 + 2) * 2);
    P(g, '#8e5a48', x, sy * CELL - h2, 1, h2);
  }
  for (let k = 0; k < 7; k++) { const x = Math.floor(hash2(k, 3, 9) * w * CELL); A.drawShrub(g, x, sy * CELL + 2, k); }

  // ── 1) 質感（ピクセル単位）は ImageData にまとめて書く ──
  const bw = w * CELL, bh = (h - sy) * CELL;
  const img = g.createImageData(bw, bh), buf = img.data;
  const rgbCache = new Map();
  const rgb = hex => { let v = rgbCache.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(hex, v); } return v; };
  const put = (x, y, hex) => { const yy = y - sy * CELL; if (yy < 0 || yy >= bh || x < 0 || x >= bw) return; const i = (yy * bw + x) * 4, v = rgb(hex); buf[i] = v[0]; buf[i + 1] = v[1]; buf[i + 2] = v[2]; buf[i + 3] = 255; };
  const soilTex = new Set(), useSprite = [];
  for (let y = sy; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y), ox = x * CELL, oy = y * CELL;
    const depthT = (y - sy) / (h - sy);
    if (c === C.SOIL) {
      if (has('nest.soil')) { useSprite.push(['nest.soil', x, y]); continue; }
      for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) put(ox + px, oy + py, A.soilColor(ox + px, oy + py, depthT, seed));
    } else if (c === C.ROCK) {
      if (has('nest.rock')) { useSprite.push(['nest.rock', x, y]); continue; }
      for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) { const hv = hash2(ox + px, oy + py, 61); put(ox + px, oy + py, hv < 0.2 ? '#62544a' : hv > 0.9 ? '#a8988a' : '#7e6f62'); }
    } else if (c === C.OPEN) {
      if (has('nest.back')) useSprite.push(['nest.back', x, y]);
      else for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) {
        const hv = hash2(ox + px, oy + py, 71);
        put(ox + px, oy + py, hv < 0.15 ? A.PAL.back[1] : hv < 0.2 ? A.PAL.back[2] : hv > 0.97 ? A.PAL.back[3] : A.PAL.back[0]);
      }
      const s = layout.slopes.get(y * w + x);
      if (s) for (let py = 0; py < CELL; py++) for (let px = 0; px < CELL; px++) {
        if (s > 0 ? py >= px : py >= CELL - px) put(ox + px, oy + py, A.soilColor(ox + px, oy + py, depthT, seed));
      }
    }
  }
  g.putImageData(img, 0, sy * CELL);
  for (const [k, x, y] of useSprite) Sprites.drawEntry(g, k, Math.floor(hash2(x, y, 4) * 9), x * CELL + 8, y * CELL + 16);
  void soilTex;

  // ── 2) 縁・飾り（数が少ないので fillRect）──
  for (let y = sy; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y), ox = x * CELL, oy = y * CELL;
    const depthT = (y - sy) / (h - sy);
    if (c === C.SOIL) {
      const r = hash2(x, y, 33);
      if (r < 0.12) { const px = 3 + Math.floor(r * 80) % 10, py = 4 + Math.floor(r * 130) % 9; P(g, '#8a7a6a', ox + px, oy + py, 2, 2); P(g, '#a8988a', ox + px, oy + py, 1, 1); }
      else if (r > 0.93 && depthT < 0.5) { for (let i = 0; i < 6; i++) P(g, '#9a7046', ox + 4 + i, oy + 6 + Math.round(Math.sin(i) * 2)); }
      if (y === sy) {
        for (let px = 0; px < CELL; px++) {
          const gh = 2 + Math.floor(hash2(ox + px, 1, 5) * 3);
          P(g, '#8a8e3c', ox + px, oy, 1, gh); if (hash2(ox + px, 2, 5) < 0.3) P(g, '#a8a24c', ox + px, oy - 2, 1, 3);
          if (hash2(ox + px, 7, 5) < 0.18) P(g, '#6a7030', ox + px, oy + gh, 1, 3);
        }
      }
    } else if (c === C.ROCK && !has('nest.rock')) {
      if (at(x, y - 1) !== C.ROCK) P(g, '#b8a894', ox, oy, CELL, 1);
      if (at(x, y + 1) !== C.ROCK) P(g, '#4a3e36', ox, oy + CELL - 1, CELL, 1);
      if (at(x - 1, y) !== C.ROCK) P(g, '#4a3e36', ox, oy, 1, CELL);
      if (at(x + 1, y) !== C.ROCK) P(g, '#4a3e36', ox + CELL - 1, oy, 1, CELL);
      P(g, '#5a4c42', ox + 4, oy + 7, 5, 1); P(g, '#5a4c42', ox + 9, oy + 8, 1, 3);
    } else if (c === C.OPEN) {
      const room = roomAt(data, x, y);
      if (room) { g.fillStyle = 'rgba(120,70,30,0.18)'; g.fillRect(ox, oy, CELL, CELL); }
      if (solidC(x, y + 1)) { P(g, '#8a5634', ox, oy + CELL - 2, CELL, 2); P(g, '#a8703f', ox, oy + CELL - 2, CELL, 1); }
      if (solidC(x, y - 1) && y > sy) { P(g, '#24140a', ox, oy, CELL, 2); for (let i = 0; i < 2; i++) if (hash2(x, y, 90 + i) < 0.35) { const rx = ox + 3 + Math.floor(hash2(x, y, 95 + i) * 10); P(g, '#7a5432', rx, oy + 2, 1, 2 + Math.floor(hash2(x, i, 3) * 4)); } }
      if (solidC(x - 1, y)) P(g, '#22130a', ox, oy, 2, CELL);
      if (solidC(x + 1, y)) P(g, '#4a2c18', ox + CELL - 1, oy, 1, CELL);
      const s = layout.slopes.get(y * w + x);
      if (s) {
        for (let i = 0; i < CELL; i++) { const px = s > 0 ? i : CELL - 1 - i; P(g, '#a8703f', ox + px, oy + i, 1, 1); P(g, '#8a5634', ox + px, oy + i + 1, 1, 1); }
        for (let i = 2; i < CELL; i += 5) { const px = s > 0 ? i : CELL - 1 - i; P(g, '#c08a52', ox + px - 1, oy + i - 1, 3, 1); }
      }
      if (layout.climb.has(y * w + x) && !room) {
        P(g, '#7a5432', ox + 3, oy, 1, CELL); P(g, '#7a5432', ox + 12, oy, 1, CELL);
        P(g, '#9a7046', ox + 4, oy, 1, CELL);
        for (let py = 2; py < CELL; py += 5) { P(g, '#a07848', ox + 3, oy + py, 10, 1); P(g, '#5e3c22', ox + 3, oy + py + 1, 10, 1); }
      }
    }
  }
  // 部屋：柱と梁、床の敷き草
  for (const r of layout.rooms) {
    const W = A.PAL.wood, S = A.PAL.straw;
    const x0 = r.px, y0 = r.py, x1 = r.px + r.pw, y1 = r.py + r.ph;
    P(g, W[1], x0 + 1, y0 + 2, 3, r.ph - 2); P(g, W[0], x0 + 1, y0 + 2, 1, r.ph - 2);
    P(g, W[1], x1 - 4, y0 + 2, 3, r.ph - 2); P(g, W[0], x1 - 4, y0 + 2, 1, r.ph - 2);
    P(g, W[1], x0 + 1, y0 + 1, r.pw - 2, 3); P(g, W[3], x0 + 1, y0 + 1, r.pw - 2, 1); P(g, W[2], x0 + 1, y0 + 4, r.pw - 2, 1);
    // 斜めの支え
    for (let i = 0; i < 6; i++) { P(g, W[1], x0 + 4 + i, y0 + 4 + i, 2, 1); P(g, W[1], x1 - 6 - i, y0 + 4 + i, 2, 1); }
    // 床
    for (let x = x0 + 2; x < x1 - 2; x++) {
      const hh = 2 + Math.floor(hash2(x, r.py, 13) * 2);
      P(g, hash2(x, 2, 13) < 0.5 ? S[1] : S[0], x, y1 - hh, 1, hh);
      if (hash2(x, 5, 13) < 0.15) P(g, S[3], x, y1 - hh - 1, 1, 1);
    }
  }
  // 入口：光の差し込み
  const ex = data.entrance.x * CELL, ey = sy * CELL;
  const gr = g.createLinearGradient(0, ey - 8, 0, ey + CELL * 3);
  gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = gr; g.fillRect(ex + 2, ey - 8, CELL - 4, CELL * 3 + 8);
  P(g, '#2a160c', ex - 2, ey - 2, CELL + 4, 2);
  return cv;
}

/** 家具・備え付け 1 つ（素材があれば素材、無ければコード描画）。全体モードの置く前の影もこれ */
export function drawObject(g, o, t, fill = 0, lift = 0) {
  const fa = FURN_ASSET[o.type];
  if (fa && Sprites.has(fa.key)) {
    const flip = !!o.rot;
    if (o.type === 'lamp') { Sprites.drawCell(g, fa.key, Math.floor(t * 4), o.px, o.py + 2, 0, flip); return; }
    const floorY = o.py + o.ph - lift;
    if (o.type === 'storage') {
      Sprites.drawEntry(g, 'nest.shelf', 0, o.px + o.pw / 2, floorY, { flip });
      if (fill > 0.05 && Sprites.has('nest.seed_pile')) Sprites.drawEntry(g, 'nest.seed_pile', fill > 0.6 ? 2 : fill > 0.25 ? 1 : 0, o.px - 6, floorY);
      return;
    }
    Sprites.drawEntry(g, fa.key, fa.col || 0, o.px + o.pw / 2, floorY, { flip });
    return;
  }
  A.drawFurniture(g, o.type, o.px, o.py, o.w, o.h, o.rot, t, { fill });
}

/** 素材（nest.*）で描く断面 */
export function renderBaseAssets(data, layout) {
  const w = data.w, h = data.h, sy = data.surfaceY;
  const cv = A.mk(w * CELL, h * CELL), g = cv.getContext('2d');
  const cells = cellsOf(data);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? C.SOIL : cells[y * w + x];
  const solidC = (x, y) => { const c = at(x, y); return c === C.SOIL || c === C.ROCK || c === C.AIR; };
  const ladder = (x, y) => at(x, y) === C.OPEN && layout.climb.has(y * w + x) && !roomAt(data, x, y);
  const slope = (x, y) => layout.slopes.get(y * w + x) || 0;
  // 空と遠くの丘
  const skyH = sy * CELL + 8;
  const sky = g.createLinearGradient(0, 0, 0, skyH);
  sky.addColorStop(0, '#2e284e'); sky.addColorStop(0.55, '#8a5468'); sky.addColorStop(1, '#e89658');
  g.fillStyle = sky; g.fillRect(0, 0, w * CELL, skyH);
  for (let x = 0; x < w * CELL; x++) {
    const hh = Math.round(10 + 8 * (Math.sin(x / 37) * 0.5 + Math.sin(x / 13 + 1) * 0.25 + 0.6));
    P(g, '#7a5446', x, sy * CELL - hh + 6, 1, hh);
  }
  for (let y = sy; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y), ox = x * CELL, oy = y * CELL, v = Math.floor(hash2(x, y, 4) * 9);
    if (y === sy) { Sprites.drawCell(g, 'nest.surface', x * 5, ox, oy); continue; }
    if (c === C.SOIL) { Sprites.drawCell(g, 'nest.soil', v, ox, oy); continue; }
    if (c === C.ROCK) { Sprites.drawCell(g, 'nest.soil', v, ox, oy); Sprites.drawCell(g, 'nest.rock', x, ox, oy); continue; }
    if (c !== C.OPEN) continue;
    const s = slope(x, y);
    if (s) {
      Sprites.drawCell(g, 'nest.wall', v, ox, oy);
      if (Sprites.has('nest.tunnel_d')) { Sprites.drawCell(g, 'nest.soil', v, ox, oy); Sprites.drawCell(g, 'nest.tunnel_d', 0, ox, oy, 0, s > 0); }
      continue;
    }
    if (ladder(x, y)) { Sprites.drawCell(g, 'nest.wall', v, ox, oy); Sprites.drawCell(g, 'nest.tunnel_v', 0, ox, oy); continue; }
    Sprites.drawCell(g, 'nest.wall', v, ox, oy);
    let bits = 0;
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], b) => {
      const nx = x + dx, ny = y + dy;
      if (solidC(nx, ny) || (dy === 0 && ladder(nx, ny) && !roomAt(data, x, y) && false) || slope(nx, ny)) bits |= 1 << b;
    });
    if (ladder(x, y - 1)) bits &= ~1;
    if (ladder(x, y + 1)) bits &= ~4;
    if (bits) Sprites.drawCell(g, 'nest.edge', bits, ox, oy);
  }
  // 部屋：敷き草・角の補強・柱
  for (const r of layout.rooms) {
    const fy = (r.y + r.h - 1) * CELL - 2;
    for (let x = r.x; x < r.x + r.w; x++) Sprites.drawCell(g, 'nest.straw', x, x * CELL, fy);
    if (Sprites.has('nest.brace')) { Sprites.drawCell(g, 'nest.brace', 0, r.x * CELL, r.y * CELL); Sprites.drawCell(g, 'nest.brace', 0, (r.x + r.w - 1) * CELL, r.y * CELL, 0, true); }
    if (Sprites.has('nest.post') && r.w >= 6) for (let y = r.y + 1; y < r.y + r.h; y++) { Sprites.drawCell(g, 'nest.post', 0, r.x * CELL - 6, y * CELL); Sprites.drawCell(g, 'nest.post', 0, (r.x + r.w - 1) * CELL + 6, y * CELL, 0, true); }
  }
  // 入口（地表の行＋その下のセル）
  if (!Sprites.drawCell(g, 'nest.entrance', 0, data.entrance.x * CELL, sy * CELL)) {
    P(g, '#2a160c', data.entrance.x * CELL - 2, sy * CELL - 2, CELL + 4, 2);
  }
  return cv;
}
