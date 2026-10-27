// tobinezumi/client/pops.js — Ver.0.9：その場に小さく浮かぶ文字（「+1 種子」「空腹 +15」など）。
// よくある出来事（拾う・食べる・飲む）はトーストでなく、起きた場所にふわっと出して消す（上のトーストが混みあわない）。
// 位置は世界（地上・巣）の座標。UI キャンバス（くっきりした文字）に描く。
import * as A from './art.js';
import { Sprites } from './sprites.js';

const icons = new Map();
function iconCanvas(id) {
  let c = icons.get(id);
  if (!c) {
    c = A.mk(16, 16); const g = c.getContext('2d');
    if (!Sprites.drawCell(g, 'item.' + id + '.icon', 0, 0, 0)) A.drawItem(g, id, 0, 0);
    icons.set(id, c);
  }
  return c;
}

/** 浮かび方（0..1 → 上がる量・見え方）。テストできるように外へ */
export function popCurve(k) {
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  return { rise: 14 * e, alpha: k < 0.65 ? 1 : Math.max(0, (1 - k) / 0.35) };
}

export class Pops {
  constructor(max = 8) { this.list = []; this.max = max; }
  add(x, y, text, { color = '#fff6e0', icon = null, life = 1.3 } = {}) {
    // 同じ場所に続けて出たら少し上へずらす（重ならない）
    const near = this.list.filter(p => Math.abs(p.x - x) < 24 && Math.abs(p.y - y) < 8 && p.t < 0.5).length;
    this.list.push({ x, y: y - near * 9, text: String(text), color, icon, t: 0, life });
    while (this.list.length > this.max) this.list.shift();
  }
  update(dt) {
    let n = 0;
    for (const p of this.list) { p.t += dt; if (p.t < p.life) this.list[n++] = p; }
    this.list.length = n;
  }
  /** sc = gfx の Screen、(cx,cy) = 画面左上の世界座標 */
  draw(sc, cx, cy) {
    if (!this.list.length) return;
    const g = sc.ug, k = sc.k;
    for (const p of this.list) {
      const c = popCurve(p.t / p.life);
      const x = p.x - cx, y = p.y - cy - c.rise;
      const w = sc.measure(p.text, 7.5);
      const ix = p.icon ? 6 : 0;
      if (p.icon) {
        g.save(); g.setTransform(k, 0, 0, k, 0, 0); g.globalAlpha = c.alpha; g.imageSmoothingEnabled = false;
        g.drawImage(iconCanvas(p.icon), Math.round(x - w / 2 - ix - 3), Math.round(y - 9), 11, 11);
        g.restore();
      }
      sc.text(x + ix / 2, y, p.text, { size: 7.5, color: p.color, alpha: c.alpha, sw: 2.6 });
    }
  }
}
