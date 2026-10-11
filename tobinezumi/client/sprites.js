// tobinezumi/client/sprites.js — 素材の読み込み（tobinezumi/assets/manifest.json）と、無いときのプレースホルダ（art.js）
//
// manifest の形は docs/ASSET_LIST.md §8：
//   { "version":1, "tile":16, "<key>": {"file":"jerboa/field_hop.png", "cell":[32,32], "frames":4 | "variants":4,
//      "dirs":["down","up","side"], "side_faces":"right", "anchor":[16,29], ...}, "fur.palettes": {...}, ... }
//   ・シートは横＝コマ（またはバリエーション）、縦＝方向（dirs の順）または段。
//   ・anchor は足元（無ければセルの下辺中央）。
//   ・毛色：スプライトは fur.palettes.base の 9 色で描いてあり、完全一致の画素を fur.palettes[<毛色>] に置き換える。
// キーが無い・読めない素材は art.js のコード描画に戻る（素材ゼロでもゲームは動く）。
import * as A from './art.js';

const entries = new Map();      // key → manifest の値 + img
const recolorCache = new Map(); // key|fur → canvas
const frameCache = new Map();   // プレースホルダのコマ
let palettes = null;            // fur.palettes

// 地上のアニメ名（クライアント → 素材）
const FIELD_ANIM = { jump: 'bigjump', walk: 'hop' };
const SIDE_ANIM = { hop: 'walk', climb_idle: 'climb' };

export const Sprites = {
  base: 'tobinezumi/assets/',
  loaded: 0, failed: 0, manifest: null,

  async init(base) {
    if (base) this.base = base;
    let man = null;
    try {
      const r = await fetch(this.base + 'manifest.json', { cache: 'no-cache' });
      if (r.ok) man = await r.json();
    } catch (e) { man = null; }
    this.manifest = man;
    if (!man || typeof man !== 'object') return this;
    if (man['fur.palettes'] && man['fur.palettes'].base) palettes = man['fur.palettes'];
    const list = Object.entries(man).filter(([, v]) => v && typeof v === 'object' && typeof v.file === 'string');
    await Promise.all(list.map(([k, v]) => new Promise(res => {
      const img = new Image();
      const timer = setTimeout(() => { this.failed++; res(); }, 10000);
      img.onload = () => {
        clearTimeout(timer);
        const cell = v.cell || [img.naturalWidth, img.naturalHeight];
        entries.set(k, { ...v, img, cell, cols: Math.max(1, Math.floor(img.naturalWidth / cell[0])), rows: Math.max(1, Math.floor(img.naturalHeight / cell[1])) });
        this.loaded++; res();
      };
      img.onerror = () => { clearTimeout(timer); this.failed++; res(); };
      img.src = this.base + v.file;
    })));
    return this;
  },

  has(key) { return entries.has(key); },
  get(key) { return entries.get(key) || null; },
  /** 横に並ぶ数（frames か variants） */
  count(key) { const e = entries.get(key); return e ? (e.frames || e.variants || e.cols || 1) : 0; },
  meta(key) { return entries.get(key) || null; },

  /** 1 コマを描く。(x,y) は anchor（無ければ下辺中央）の位置。成功したら true */
  drawEntry(g, key, col, x, y, { row = 0, flip = false, fur = null, scale = 1, alpha = 1 } = {}) {
    const e = entries.get(key);
    if (!e) return false;
    const [cw, ch] = e.cell;
    const n = e.cols;
    const c = ((Math.floor(col) % n) + n) % n;
    const r = Math.max(0, Math.min(e.rows - 1, row | 0));
    const ax = e.anchor ? e.anchor[0] : cw / 2, ay = e.anchor ? e.anchor[1] : ch;
    const src = fur && fur !== 'sand' && palettes ? recolored(key, e, fur) : e.img;
    g.save();
    if (alpha !== 1) g.globalAlpha *= alpha;
    g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    g.drawImage(src, c * cw, r * ch, cw, ch, Math.round(-ax * scale), Math.round(-ay * scale), cw * scale, ch * scale);
    g.restore();
    return true;
  },
  /** 左上を (x,y) にして描く（タイル・オートタイル用） */
  drawCell(g, key, col, x, y, row = 0, flip = false) {
    const e = entries.get(key);
    if (!e) return false;
    const [cw, ch] = e.cell;
    const c = ((Math.floor(col) % e.cols) + e.cols) % e.cols, r = Math.max(0, Math.min(e.rows - 1, row | 0));
    if (flip) { g.save(); g.translate(x + cw, y); g.scale(-1, 1); g.drawImage(e.img, c * cw, r * ch, cw, ch, 0, 0, cw, ch); g.restore(); }
    else g.drawImage(e.img, c * cw, r * ch, cw, ch, x, y, cw, ch);
    return true;
  },
  /** names の中の位置 */
  nameIndex(key, name) { const e = entries.get(key); return e && e.names ? e.names.indexOf(name) : -1; },

  /**
   * トビネズミ。view='field'（dir=down/up/left/right）|'side'（dir=left/right）。(x,y) は足元
   */
  drawJerboa(g, fur, view, anim, dir, frame, x, y) {
    const a = view === 'field' ? (FIELD_ANIM[anim] || anim) : (SIDE_ANIM[anim] || anim);
    const key = 'jerboa.' + view + '.' + a;
    const e = entries.get(key);
    if (e) {
      let row = 0, flip = dir === 'left';
      if (Array.isArray(e.dirs)) {
        const want = dir === 'left' || dir === 'right' ? 'side' : dir;
        row = Math.max(0, e.dirs.indexOf(want));
        flip = dir === 'left';
        if (e.side_faces === 'left') flip = dir === 'right';
      } else if (e.faces === 'left') flip = dir === 'right';
      return this.drawEntry(g, key, frame, x, y, { row, flip, fur });
    }
    const pv = view === 'side' ? 'side' : dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side';
    const n = (A.ANIMS[anim] || A.ANIMS.idle).length;
    const f = ((frame % n) + n) % n;
    const ck = fur + '|' + pv + '|' + anim + '|' + f;
    let c = frameCache.get(ck);
    if (!c) { c = A.jerboaFrame(fur, pv, anim, f); frameCache.set(ck, c); }
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (dir === 'left') g.scale(-1, 1);
    g.drawImage(c, -16, -31);
    g.restore();
    return true;
  },
  /** 影（跳ぶと縮む）。k=1 で原寸 */
  drawShadow(g, x, y, k = 1) {
    const e = entries.get('jerboa.shadow');
    if (e) {
      const [cw, ch] = e.cell, w = Math.max(4, Math.round(cw * k)), h = Math.max(2, Math.round(ch * k));
      g.drawImage(e.img, 0, 0, cw, ch, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      return;
    }
    g.fillStyle = 'rgba(40,22,10,0.35)';
    g.beginPath(); g.ellipse(Math.round(x), Math.round(y), 7 * k, 2.6 * k, 0, 0, Math.PI * 2); g.fill();
  },

  /** アニメのコマ数 */
  frames(view, anim) {
    const a = view === 'field' ? (FIELD_ANIM[anim] || anim) : (SIDE_ANIM[anim] || anim);
    const e = entries.get('jerboa.' + view + '.' + a);
    return e ? (e.frames || e.cols) : (A.ANIMS[anim] || A.ANIMS.idle).length;
  },

  /** キャラ作成の立ち絵 128×128 */
  portrait(fur) {
    const e = entries.get('jerboa.portrait.' + fur);
    if (e) { const c = A.mk(e.cell[0], e.cell[1]); c.getContext('2d').drawImage(e.img, 0, 0); return c; }
    return A.portrait(fur);
  },
  furLabels() { return (this.manifest && this.manifest['fur.labels']) || null; },
};

// ───────── 毛色の差し替え（base の色と完全一致する画素だけ）─────────
function hexRGB(h) { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function recolored(key, e, furId) {
  const ck = key + '|' + furId;
  let c = recolorCache.get(ck);
  if (c) return c;
  const img = e.img;
  c = A.mk(img.naturalWidth, img.naturalHeight);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const to = palettes[furId];
  if (to) {
    try {
      const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
      const map = new Map();
      palettes.base.forEach((h, i) => { const [r, gg, b] = hexRGB(h); map.set((r << 16) | (gg << 8) | b, hexRGB(to[i])); });
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const v = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
        if (v) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; }
      }
      g.putImageData(im, 0, 0);
    } catch (err) { /* 読めなければそのまま */ }
  }
  recolorCache.set(ck, c);
  return c;
}
