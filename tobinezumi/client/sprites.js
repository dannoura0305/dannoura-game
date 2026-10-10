// tobinezumi/client/sprites.js — 素材の読み込み（assets/manifest.json）と、無いときのプレースホルダ（art.js）
//
// manifest.json の形（素材担当と共通）：
//   { "jerboa.field.hop": {"file":"sprites/jerboa_field_hop.png", "cell":[32,32], "frames":4, "dirs":3}, "tile.sand": {...}, ... }
//   ・file は assets/ からの相対パス。cell=1 コマの大きさ、frames=横に並ぶコマ数。
//   ・dirs があれば縦に方向の行が並ぶ。行の順は "order"（例 ["down","up","side"]）、無ければ
//       dirs=3 → ["down","up","side"]（left は side を左右反転）／dirs=4 → ["down","left","right","up"]／dirs=2 → ["right","left"]
//       side 系（jerboa.side.*）は dirs が無ければ右向き 1 行（左は反転）。
//   ・anchor:[ax,ay] は足元の点（既定はセルの下辺中央）。fur:"sand" は描いてある毛色（既定 sand）。
//   ・palette:{"l":"#..","m":"#..","d":"#..","s":"#..","belly":"#.."} があれば、その色を毛色ごとに置き換える。
//     無ければ art.js の砂色パレットに近い色を置き換える（近似）。
// 画像が無い・読めない鍵は、いつでも art.js のコード描画に戻る（ゲームは素材ゼロでも動く）。
import * as A from './art.js';

const entries = new Map();      // key → {img, cell, frames, dirs, order, anchor, ...}
const recolorCache = new Map(); // key|fur → canvas
const frameCache = new Map();   // プレースホルダのコマ

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
    const list = Object.entries(man).filter(([k, v]) => v && typeof v === 'object' && typeof v.file === 'string');
    await Promise.all(list.map(([k, v]) => new Promise(res => {
      const img = new Image();
      const timer = setTimeout(() => { this.failed++; res(); }, 8000);
      img.onload = () => { clearTimeout(timer); entries.set(k, { ...v, img, cell: v.cell || [img.naturalWidth, img.naturalHeight], frames: v.frames || 1 }); this.loaded++; res(); };
      img.onerror = () => { clearTimeout(timer); this.failed++; res(); };
      img.src = this.base + v.file;
    })));
    return this;
  },

  has(key) { return entries.has(key); },
  get(key) { return entries.get(key) || null; },

  /** 画像素材 1 コマを描く。(x,y) は足元（anchor）。row は方向の行。成功したら true */
  drawEntry(g, key, frame, x, y, { row = 0, flip = false, fur = null, scale = 1 } = {}) {
    const e = entries.get(key);
    if (!e) return false;
    const [cw, ch] = e.cell;
    const fr = ((frame % e.frames) + e.frames) % e.frames;
    const ax = e.anchor ? e.anchor[0] : cw / 2, ay = e.anchor ? e.anchor[1] : ch;
    const src = fur && fur !== (e.fur || 'sand') ? recolored(key, e, fur) : e.img;
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    g.drawImage(src, fr * cw, row * ch, cw, ch, Math.round(-ax * scale), Math.round(-ay * scale), cw * scale, ch * scale);
    g.restore();
    return true;
  },

  /** 方向名 → {row, flip}（manifest の dirs/order に合わせる） */
  dirRow(e, dir) {
    const n = e.dirs || 1;
    const order = e.order || (n === 3 ? ['down', 'up', 'side'] : n === 4 ? ['down', 'left', 'right', 'up'] : n === 2 ? ['right', 'left'] : ['side']);
    let i = order.indexOf(dir);
    if (i >= 0) return { row: i, flip: false };
    if (dir === 'left' || dir === 'right') {
      const si = order.indexOf('side'); const ri = order.indexOf('right'); const li = order.indexOf('left');
      if (si >= 0) return { row: si, flip: dir === 'left' };
      if (ri >= 0) return { row: ri, flip: dir === 'left' };
      if (li >= 0) return { row: li, flip: dir === 'right' };
    }
    return { row: 0, flip: dir === 'left' };
  },

  /**
   * トビネズミを描く。view='field'（見下ろし：dir=down/up/left/right）|'side'（巣：dir=left/right）
   * (x,y) は足元。画像があれば画像、無ければ art.js のコマ
   */
  drawJerboa(g, fur, view, anim, dir, frame, x, y) {
    const key = 'jerboa.' + view + '.' + anim;
    const e = entries.get(key) || (anim === 'walk' ? entries.get('jerboa.' + view + '.hop') : null) || (anim === 'climb_idle' ? entries.get('jerboa.' + view + '.climb') : null);
    if (e) {
      const k = entries.get(key) ? key : (anim === 'walk' ? 'jerboa.' + view + '.hop' : 'jerboa.' + view + '.climb');
      const { row, flip } = view === 'side' && !e.dirs ? { row: 0, flip: dir === 'left' } : this.dirRow(e, dir);
      return this.drawEntry(g, k, frame, x, y, { row, flip, fur });
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

  /** アニメのコマ数 */
  frames(view, anim) {
    const e = entries.get('jerboa.' + view + '.' + anim);
    return e ? e.frames : (A.ANIMS[anim] || A.ANIMS.idle).length;
  },

  /** キャラ作成の立ち絵（ui.portrait か jerboa.portrait があれば） */
  portrait(fur) {
    const e = entries.get('jerboa.portrait') || entries.get('ui.portrait');
    if (e) {
      const c = A.mk(e.cell[0], e.cell[1]);
      const g = c.getContext('2d');
      g.drawImage(fur !== (e.fur || 'sand') ? recolored(entries.get('jerboa.portrait') ? 'jerboa.portrait' : 'ui.portrait', e, fur) : e.img, 0, 0, e.cell[0], e.cell[1], 0, 0, e.cell[0], e.cell[1]);
      return c;
    }
    return A.portrait(fur);
  },
};

// ───────── 毛色の差し替え ─────────
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function recolored(key, e, furId) {
  const ck = key + '|' + furId;
  let c = recolorCache.get(ck);
  if (c) return c;
  const img = e.img;
  c = A.mk(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  try {
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    const basePal = e.palette || A.furById(e.fur || 'sand');
    const target = A.furById(furId);
    const names = ['l', 'm', 'd', 's', 'belly'].filter(n => basePal[n]);
    const from = names.map(n => hex(basePal[n])), to = names.map(n => hex(target[n]));
    const tol = e.palette ? 6 : 34;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 20) continue;
      let best = -1, bd = 1e9;
      for (let k = 0; k < from.length; k++) {
        const dr = d[i] - from[k][0], dg = d[i + 1] - from[k][1], db = d[i + 2] - from[k][2];
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist < bd) { bd = dist; best = k; }
      }
      if (best >= 0 && bd <= tol) {
        // 元の色との差（陰影の微妙な違い）を保ったまま置き換える
        d[i] = Math.max(0, Math.min(255, to[best][0] + (d[i] - from[best][0])));
        d[i + 1] = Math.max(0, Math.min(255, to[best][1] + (d[i + 1] - from[best][1])));
        d[i + 2] = Math.max(0, Math.min(255, to[best][2] + (d[i + 2] - from[best][2])));
      }
    }
    g.putImageData(im, 0, 0);
  } catch (err) { /* file:// などで読めなければそのまま */ }
  recolorCache.set(ck, c);
  return c;
}
