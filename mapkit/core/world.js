// 歩ける世界（地形＋当たり＋床）。配置（layout）と最終の地形（Heightfield）から作る。DOM・three.js なし。
// 検査（mapkit/pcg/validate.js の格子の到達）と、遊ぶ時の操作（mapkit/runtime/controller.js）が**同じ物**を使う（試験と遊びがずれない）。
// 当たり：{ kind:'obb'|'cyl', obb|{x,z,r}, minY, maxY, id }。床（walk）：{ obb, top, id }（上の面の高さで歩く）。
import { pointInObb, obbBounds, obbCircle, pushCircleObb, deg } from './geom.js';
import { RULES } from '../pcg/rules.js';

export class World {
  constructor(layout, hf, opt = {}) {
    this.layout = layout; this.hf = hf; this.W = layout.size[0]; this.D = layout.size[1];
    this.step = opt.step ?? RULES.walk.step; this.height = opt.height ?? RULES.walk.height;
    this.colliders = []; this.floors = []; this.cellSize = 4;
    this.nx = Math.ceil(this.W / this.cellSize) + 1; this.nz = Math.ceil(this.D / this.cellSize) + 1;
    this.cBins = new Map(); this.fBins = new Map();
    for (const b of layout.buildings || []) for (const p of b.parts || []) {
      if (p.walk) this.addFloor({ id: p.id, building: b.id, obb: partObb(p), top: p.c[1] + p.size[1] / 2 });
      else if (p.collide && !p.tilt) {
        if (p.shape === 'cyl') this.addCollider({ id: p.id, building: b.id, kind: 'cyl', x: p.c[0], z: p.c[2], r: p.size[0] / 2, minY: p.c[1] - p.size[1] / 2, maxY: p.c[1] + p.size[1] / 2 });
        else this.addCollider({ id: p.id, building: b.id, kind: 'obb', obb: partObb(p), minY: p.c[1] - p.size[1] / 2, maxY: p.c[1] + p.size[1] / 2 });
      }
    }
    for (const o of layout.objects || []) {
      if (!o.col) continue;
      const y0 = o.at[1], y1 = o.at[1] + (o.col.h || o.size[1]);
      if (o.col.shape === 'cyl') this.addCollider({ id: o.id, kind: 'cyl', x: o.at[0], z: o.at[2], r: o.col.r, minY: y0, maxY: y1 });
      else this.addCollider({ id: o.id, kind: 'obb', obb: { cx: o.at[0], cz: o.at[2], hx: o.col.hx, hz: o.col.hz, rot: deg(o.rotY) }, minY: y0, maxY: y1 });
    }
  }
  _bins(map, b, idx) {
    const s = this.cellSize;
    for (let j = Math.max(0, Math.floor(b[1] / s)); j <= Math.min(this.nz - 1, Math.floor(b[3] / s)); j++) for (let i = Math.max(0, Math.floor(b[0] / s)); i <= Math.min(this.nx - 1, Math.floor(b[2] / s)); i++) {
      const k = j * this.nx + i; let a = map.get(k); if (!a) map.set(k, a = []); a.push(idx);
    }
  }
  addCollider(c) { c.bounds = c.kind === 'cyl' ? [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r] : obbBounds(c.obb); this.colliders.push(c); this._bins(this.cBins, c.bounds, this.colliders.length - 1); }
  addFloor(f) { f.bounds = obbBounds(f.obb); this.floors.push(f); this._bins(this.fBins, f.bounds, this.floors.length - 1); }
  _near(map, list, x, z, r) {
    const s = this.cellSize, out = new Set();
    for (let j = Math.max(0, Math.floor((z - r) / s)); j <= Math.min(this.nz - 1, Math.floor((z + r) / s)); j++) for (let i = Math.max(0, Math.floor((x - r) / s)); i <= Math.min(this.nx - 1, Math.floor((x + r) / s)); i++) { const a = map.get(j * this.nx + i); if (a) for (const k of a) out.add(k); }
    return [...out].map(k => list[k]);
  }
  /** (x,z) の床（一番高い物）か null */
  floorAt(x, z) { let best = null; for (const f of this._near(this.fBins, this.floors, x, z, 0)) if (pointInObb(x, z, f.obb) && (!best || f.top > best.top)) best = f; return best; }
  /** 歩く面の高さ：地形と床の高い方 */
  surfaceY(x, z) { const g = this.hf.at(x, z), f = this.floorAt(x, z); return f && f.top > g ? f.top : g; }
  /** 足元が y の時に、半径 r の体を止める当たり（段差 step より上・頭 height より下） */
  blockersNear(x, z, y, r) { return this._near(this.cBins, this.colliders, x, z, r + 0.5).filter(c => c.maxY > y + this.step && c.minY < y + this.height); }
  blocked(x, z, y, r) {
    for (const c of this.blockersNear(x, z, y, r)) {
      if (c.kind === 'cyl') { if ((x - c.x) ** 2 + (z - c.z) ** 2 < (r + c.r) ** 2) return c; }
      else if (obbCircle(c.obb, x, z, r)) return c;
    }
    return null;
  }
  /** 円を当たりの外へ押し出す（pos {x,z} を書き換える）。戻り値：当たったか */
  pushOut(pos, r, y, iters = 3) {
    let hit = false;
    for (let it = 0; it < iters; it++) {
      let moved = false;
      for (const c of this.blockersNear(pos.x, pos.z, y, r)) {
        if (c.kind === 'cyl') { const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), R = r + c.r; if (d < R) { const k = d > 1e-6 ? (R - d) / d : 0; pos.x += d > 1e-6 ? dx * k : R; pos.z += dz * k; moved = hit = true; } }
        else if (pushCircleObb(pos, r, c.obb)) moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }
}
export function partObb(p) { return { cx: p.c[0], cz: p.c[2], hx: p.size[0] / 2, hz: p.size[2] / 2, rot: deg(p.rotY || 0) }; }
