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
import { lookKey } from '../shared/genetics.js';
import { hash2 } from '../shared/rng.js';

const entries = new Map();      // key → manifest の値 + img
const recolorCache = new Map(); // key|fur → canvas
const frameCache = new Map();   // プレースホルダのコマ
let palettes = null;            // fur.palettes

// 地上のアニメ名（クライアント → 素材）
const FIELD_ANIM = { jump: 'bigjump', walk: 'hop' };
const SIDE_ANIM = { hop: 'walk', climb_idle: 'climb' };
// 子どもの素材にあるアニメ（無いものは近いものへ）
const PUP_FIELD = { idle: 'idle', hop: 'hop', walk: 'hop', jump: 'hop', bigjump: 'hop', sleep: 'sleep', gather: 'idle', eat: 'idle', dig: 'idle', sniff: 'idle' };
const PUP_SIDE = { idle: 'idle', walk: 'walk', hop: 'walk', jump: 'walk', climb: 'walk', climb_idle: 'idle', sleep: 'sleep', gather: 'idle', eat: 'idle' };
const lookCache = new Map();    // 形質で描き分けたコマ

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
  drawJerboa(g, fur, view, anim, dir, frame, x, y, look = null, opts = {}) {
    if (look) { const L = look.fur ? look : { ...look, fur }; if (this._drawLook(g, L, view, anim, dir, frame, x, y, opts)) return true; }
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
  /**
   * Ver.0.4：形質で描き分ける（毛色・濃淡・斑・尾の房・耳の長さ・脚の長さ・尾の長さ・体の大きさ・子ども／若者）。
   * look = shared/genetics.js の lookOf。opts = {scale, alpha}
   */
  _drawLook(g, L, view, anim, dir, frame, x, y, opts = {}) {
    const pup = !!L.pup;
    let key, a;
    if (pup) { a = view === 'field' ? (PUP_FIELD[anim] || 'idle') : (PUP_SIDE[anim] || 'idle'); key = 'pup.' + view + '.' + a; }
    else { a = view === 'field' ? (FIELD_ANIM[anim] || anim) : (SIDE_ANIM[anim] || anim); key = 'jerboa.' + view + '.' + a; }
    const e = entries.get(key);
    if (!e || !palettes) return false;
    let row = 0, flip = dir === 'left';
    if (Array.isArray(e.dirs)) {
      const want = dir === 'left' || dir === 'right' ? 'side' : dir;
      row = Math.max(0, e.dirs.indexOf(want));
      flip = e.side_faces === 'left' ? dir === 'right' : dir === 'left';
    } else if (e.faces === 'left') flip = dir === 'right';
    const side = view === 'side' || (Array.isArray(e.dirs) && e.dirs[row] === 'side');
    const n = e.cols, c = ((Math.floor(frame) % n) + n) % n;
    const ck = key + '|' + c + '|' + row + '|' + lookKey(L);
    let cv = lookCache.get(ck);
    if (!cv) { cv = buildLook(e, c, row, L, side, pup); lookCache.set(ck, cv); if (lookCache.size > 3000) lookCache.clear(); }
    const s = (opts.scale || 1) * (1 + 0.05 * (L.size || 0)) * (L.young ? 0.84 : 1);
    const ax = (e.anchor ? e.anchor[0] : 16) + LM.x, ay = (e.anchor ? e.anchor[1] : 29) + LM.y;
    g.save();
    if (opts.alpha != null && opts.alpha !== 1) g.globalAlpha *= opts.alpha;
    g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    if (s === 1) g.drawImage(cv, -ax, -ay);
    else g.drawImage(cv, 0, 0, cv.width, cv.height, Math.round(-ax * s), Math.round(-ay * s), Math.round(cv.width * s), Math.round(cv.height * s));
    g.restore();
    return true;
  },
  /** 立ち絵の代わり：横向きの姿を大きく（家族・家系図）。size px の四角に */
  lookPortrait(look, size = 64, { anim = 'idle', bg = null } = {}) {
    const c = A.mk(size, size), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
    const sc = Math.max(1, size / 31);
    this.drawJerboa(g, look.fur || 'sand', 'side', anim, 'right', 0, size / 2, size - Math.max(2, Math.round(size * 0.05)), look, { scale: look.pup ? sc * 1.35 : sc });
    return c;
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

// ───────── 形質の描き分け（Ver.0.4）─────────
const LM = { x: 4, y: 8 };            // 伸ばす分の余白（左・上）
const OUT_W = 40, OUT_H = 42;
const mixc = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
/** 毛色＋濃淡＋尾の房 → 9 色 */
function lookPalette(L) {
  const base = (palettes[L.fur] || palettes.sand).map(hexRGB);
  const t = L.tint || 0;
  const out = base.map((c, i) => {
    if (i > 5) return c;
    if (t > 0) return mixc(c, [40, 22, 12], 0.11 * t * (i <= 3 ? 1 : 0.5));
    if (t < 0) return mixc(c, [255, 250, 240], 0.13 * -t * (i <= 3 ? 1 : 0.5));
    return c;
  });
  if (L.tuft) out[8] = out[5];
  return out;
}
/** 斑の模様（その子ごとに違う：ps の種）。セルの座標で */
function piedMask(ps, x, y, pup) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const cx = (pup ? 10 : 6) + hash2(ps, i, 31) * (pup ? 12 : 20), cy = (pup ? 18 : 10) + hash2(ps, i, 37) * (pup ? 10 : 18), r = (pup ? 2 : 2.6) + hash2(ps, i, 41) * (pup ? 2 : 3.4);
    if ((x - cx) ** 2 + ((y - cy) * 1.2) ** 2 < r * r) return true;
  }
  return false;
}
function buildLook(e, col, row, L, side, pup) {
  const [cw, ch] = e.cell;
  const src = A.mk(cw, ch), sg = src.getContext('2d');
  sg.drawImage(e.img, col * cw, row * ch, cw, ch, 0, 0, cw, ch);
  const out = A.mk(OUT_W, OUT_H), og = out.getContext('2d');
  let sd, od;
  try { sd = sg.getImageData(0, 0, cw, ch); od = og.createImageData(OUT_W, OUT_H); }
  catch (err) { og.drawImage(src, LM.x, LM.y); return out; }
  const S = sd.data, D = od.data;
  // 色：base の 9 色を、この子の 9 色へ（斑は毛の画素を腹の色へ）
  const pal = lookPalette(L), idx = new Map();
  palettes.base.forEach((h, i) => { const [r, g, b] = hexRGB(h); idx.set((r << 16) | (g << 8) | b, i); });
  // 形：耳（上の帯を伸ばす）・脚（足元の帯を伸ばして体を持ち上げる）・尾（横向きの左の帯を伸ばす）
  const k = pup ? 0.5 : 1;
  const dE = Math.round((L.ear || 0) * k), dL = Math.round((L.leg || 0) * (pup ? 0.5 : 1));
  const EAR_Y = pup ? 15 : 9, EAR_L = pup ? 5 : 7, LEG_T = pup ? 25 : 24, FOOT = 30;
  const TAIL_X = pup ? 12 : 10, tf = 1 + 0.2 * (L.tail || 0) * (pup ? 0.6 : 1);
  for (let Y = 0; Y < OUT_H; Y++) {
    const y = Y - LM.y;
    let y1;
    if (y < LEG_T - dL) y1 = y + dL;
    else if (y <= FOOT) y1 = LEG_T + (y - (LEG_T - dL)) * (FOOT - LEG_T) / (FOOT - LEG_T + dL);
    else y1 = y;
    let y2 = y1;
    if (y1 < EAR_Y) y2 = EAR_Y - (EAR_Y - y1) * EAR_L / (EAR_L + dE);
    const sy = Math.floor(y2);
    if (sy < 0 || sy >= ch) continue;
    for (let X = 0; X < OUT_W; X++) {
      const x = X - LM.x;
      const x2 = side && x < TAIL_X ? TAIL_X - (TAIL_X - x) / tf : x;
      const sx = Math.floor(x2);
      if (sx < 0 || sx >= cw) continue;
      const si = (sy * cw + sx) * 4;
      if (S[si + 3] === 0) continue;
      const di = (Y * OUT_W + X) * 4;
      let r = S[si], g = S[si + 1], b = S[si + 2];
      const i = idx.get((r << 16) | (g << 8) | b);
      if (i != null) {
        let c = pal[i];
        if (L.pied && i >= 1 && i <= 3 && piedMask(L.ps || 0, sx, sy, pup)) c = i === 1 ? pal[4] : pal[5];
        r = c[0]; g = c[1]; b = c[2];
      }
      D[di] = r; D[di + 1] = g; D[di + 2] = b; D[di + 3] = S[si + 3];
    }
  }
  og.putImageData(od, 0, 0);
  return out;
}

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
