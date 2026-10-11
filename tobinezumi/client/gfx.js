// tobinezumi/client/gfx.js — 画面：内部解像度のドット絵キャンバス（最近傍で拡大）＋
// その上に高解像度の UI キャンバス（名札・吹き出しなどの文字をくっきり描く）＋ DOM の HUD。
// PC（マウスとキーボード）：内部 480×270 を整数倍。タッチ端末：画面いっぱいに合わせて内部解像度を変え（W・H が変わる）、
// 拡大率は整数でなくてもよい（touch-logic.js の touchLayout）。W・H は live binding なので import 先でも最新の値になる。
import { touchLayout } from './touch-logic.js';
export let W = 480, H = 270;
export const FONT = "'DotGothic16', 'DotGothic16 Local', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif";

export class Screen {
  constructor(stage, game, ui) {
    this.stage = stage; this.cv = game; this.uiCv = ui;
    this.g = game.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.ug = ui.getContext('2d');
    this.scale = 1; this.dpr = 1; this.zoomPref = 'auto';
    this.touch = false;        // タッチ用の配置（main.js が決める）
    this.controls = false;     // いまの画面がタッチ操作の帯を使うか
    this.layout = null;
    this.listeners = [];
    // ノッチ（safe-area）を読むための見えない箱
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(this.probe);
    this.resize();
    let q = 0;
    const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; this.resize(); }); };
    addEventListener('resize', later);
    addEventListener('orientationchange', () => { later(); setTimeout(() => this.resize(), 250); });
  }
  onResize(fn) { this.listeners.push(fn); }
  setZoomPref(p) { this.zoomPref = p; this.resize(); }
  setTouch(on) { if (this.touch !== !!on) { this.touch = !!on; this.resize(); } }
  /** タッチ操作の帯を使うか・縦向きのときの帯の高さ（CSS px） */
  setControls(on, strip = 0) { if (this.controls !== !!on || this.strip !== strip) { this.controls = !!on; this.strip = strip; this.resize(); } }
  safeArea() {
    const cs = getComputedStyle(this.probe), n = v => parseFloat(v) || 0;
    return { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
  }
  resize() {
    const vw = innerWidth, vh = innerHeight;
    let s, w = 480, h = 270, pos = null;
    if (this.touch) {
      const pref = ['small', 'large'].includes(this.zoomPref) ? this.zoomPref : 'auto';
      const L = touchLayout(vw, vh, this.safeArea(), { controls: this.controls, pref, strip: this.strip || 0 });
      this.layout = L;
      s = L.scale; w = L.W; h = L.H; pos = L;
    } else {
      this.layout = null;
      const fit = Math.min(vw / 480, vh / 270);
      s = Math.max(1, Math.floor(fit));
      if (fit < 1) s = fit;                                  // とても小さい画面だけは縮小
      if (this.zoomPref !== 'auto' && +this.zoomPref) s = Math.min(Math.max(1, +this.zoomPref), Math.max(1, Math.floor(fit)) || 1);
    }
    const changed = w !== W || h !== H;
    W = w; H = h;
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; this.g.imageSmoothingEnabled = false; }
    this.scale = s;
    const cw = Math.round(W * s), ch = Math.round(H * s);
    Object.assign(this.stage.style, { width: cw + 'px', height: ch + 'px' });
    if (pos) Object.assign(this.stage.style, { position: 'fixed', left: pos.left + 'px', top: pos.top + 'px' });
    else Object.assign(this.stage.style, { position: '', left: '', top: '' });
    this.stage.style.setProperty('--u', String(s));
    const root = document.documentElement;
    root.classList.toggle('tb-vert', !!(pos && pos.portrait));
    root.classList.toggle('tb-horiz', !!(pos && !pos.portrait));
    root.style.setProperty('--ctlh', (pos ? pos.controlsH : 0) + 'px');
    root.style.setProperty('--stage-b', (pos ? pos.top + ch : 0) + 'px');
    this.dpr = Math.min(this.touch ? 2 : 3, devicePixelRatio || 1);   // 高精細すぎる画面は UI キャンバスを間引く
    const uw = Math.round(cw * this.dpr), uh = Math.round(ch * this.dpr);
    if (this.uiCv.width !== uw || this.uiCv.height !== uh) { this.uiCv.width = uw; this.uiCv.height = uh; }
    this.uiCv.style.width = cw + 'px'; this.uiCv.style.height = ch + 'px';
    this.ug.imageSmoothingEnabled = false;
    for (const f of this.listeners) { try { f({ W, H, scale: s, changed }); } catch (e) { console.error(e); } }
  }
  /** UI キャンバスの 1 内部ピクセルあたりの実ピクセル */
  get k() { return this.scale * this.dpr; }
  clearUI() { this.ug.setTransform(1, 0, 0, 1, 0, 0); this.ug.clearRect(0, 0, this.uiCv.width, this.uiCv.height); }
  /** 内部座標 (x,y) に文字。size は内部ピクセル */
  text(x, y, str, { size = 7, color = '#fff6e0', align = 'center', base = 'alphabetic', stroke = '#2a1a10', sw = 2, alpha = 1, bold = false } = {}) {
    const g = this.ug, k = this.k;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = alpha;
    g.font = `${bold ? 'bold ' : ''}${Math.round(size * k)}px ${FONT}`;
    g.textAlign = align; g.textBaseline = base;
    const px = Math.round(x * k), py = Math.round(y * k);
    if (stroke) { g.lineJoin = 'round'; g.strokeStyle = stroke; g.lineWidth = sw * k * 0.5 + 1; g.strokeText(str, px, py); }
    g.fillStyle = color; g.fillText(str, px, py);
    g.restore();
  }
  measure(str, size = 7) {
    const g = this.ug; g.save(); g.font = `${Math.round(size * this.k)}px ${FONT}`; const w = g.measureText(str).width / this.k; g.restore(); return w;
  }
  /** 吹き出し（内部座標、下の尖りが (x,y)） */
  bubble(x, y, str, { size = 7, alpha = 1, max = 140 } = {}) {
    const g = this.ug, k = this.k;
    const lines = wrap(str, size, max, s => this.measure(s, size));
    const lw = Math.max(...lines.map(l => this.measure(l, size)));
    const bw = lw + 8, bh = lines.length * (size + 2) + 5;
    const bx = Math.round(x - bw / 2), by = Math.round(y - bh - 4);
    g.save(); g.setTransform(k, 0, 0, k, 0, 0); g.globalAlpha = alpha;
    g.fillStyle = '#2a1a10'; rr(g, bx - 1, by - 1, bw + 2, bh + 2, 3); g.fill();
    g.fillStyle = '#fff4dc'; rr(g, bx, by, bw, bh, 2.5); g.fill();
    g.beginPath(); g.moveTo(x - 3, by + bh); g.lineTo(x, by + bh + 4); g.lineTo(x + 3, by + bh); g.closePath(); g.fill();
    g.restore();
    lines.forEach((l, i) => this.text(x, by + 3 + size + i * (size + 2) - 1, l, { size, color: '#3a2414', stroke: null, alpha }));
  }
  /** 名札 */
  nameTag(x, y, name, { me = false, alpha = 1 } = {}) {
    const g = this.ug, k = this.k, size = 6.5;
    const w = this.measure(name, size) + 6;
    g.save(); g.setTransform(k, 0, 0, k, 0, 0); g.globalAlpha = alpha * 0.85;
    g.fillStyle = me ? 'rgba(70,40,18,.9)' : 'rgba(40,26,16,.78)'; rr(g, x - w / 2, y - size - 2, w, size + 4, 2); g.fill();
    if (me) { g.strokeStyle = '#f0c870'; g.lineWidth = 1 / k * 2; g.stroke(); }
    g.restore();
    this.text(x, y, name, { size, color: me ? '#ffe9a8' : '#f4e6cc', stroke: null, alpha });
  }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(str, size, max, measure) {
  const out = []; let cur = '';
  for (const ch of String(str)) { if (measure(cur + ch) > max && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur);
  return out.slice(0, 4);
}

/** 夕暮れの空のグラデーション */
export function duskSky(g, x, y, w, h, t = 0) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#3a2a58'); gr.addColorStop(0.45, '#9a5a6a'); gr.addColorStop(0.8, '#e8a06a'); gr.addColorStop(1, '#f6c88a');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
