// tobinezumi/client/gfx.js — 画面：内部解像度 480×270 のドット絵キャンバス（最近傍で整数倍拡大）＋
// その上に高解像度の UI キャンバス（名札・吹き出しなどの文字をくっきり描く）＋ DOM の HUD。
export const W = 480, H = 270;
export const FONT = "'DotGothic16', 'DotGothic16 Local', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', sans-serif";

export class Screen {
  constructor(stage, game, ui) {
    this.stage = stage; this.cv = game; this.uiCv = ui;
    this.g = game.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.ug = ui.getContext('2d');
    this.scale = 1; this.dpr = 1; this.zoomPref = 'auto';
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  setZoomPref(p) { this.zoomPref = p; this.resize(); }
  resize() {
    const vw = innerWidth, vh = innerHeight;
    const fit = Math.min(vw / W, vh / H);
    let s = Math.max(1, Math.floor(fit));
    if (fit < 1) s = fit;                                  // とても小さい画面だけは縮小
    if (this.zoomPref !== 'auto') s = Math.min(Math.max(1, +this.zoomPref), Math.max(1, Math.floor(fit)) || 1);
    this.scale = s;
    const cw = Math.round(W * s), ch = Math.round(H * s);
    Object.assign(this.stage.style, { width: cw + 'px', height: ch + 'px' });
    this.stage.style.setProperty('--u', String(s));
    this.dpr = Math.min(3, devicePixelRatio || 1);
    this.uiCv.width = Math.round(cw * this.dpr); this.uiCv.height = Math.round(ch * this.dpr);
    this.uiCv.style.width = cw + 'px'; this.uiCv.style.height = ch + 'px';
    this.ug.imageSmoothingEnabled = false;
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
