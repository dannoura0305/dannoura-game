// 道案内（目的地の順・距離の場・矢印の向き・自動で歩く）。DOM・three.js なし。
// 格子（mapkit/nav/grid.js）の距離の場を下る。遊ぶ画面の矢印・道の線と、自動試験（play_map.mjs・tests）の「道案内で歩く」が同じ物を使う。
import { distanceField, nearestCell, descend } from '../nav/grid.js';

const GOAL_JA = { door: '入口', front: '前', center: '中', interior: '中' };

export class Navigator {
  constructor(grid, layout) { this.G = grid; this.layout = layout; this.goals = layout.goals.filter(g => g.at); this.reached = new Set(); this.idx = 0; this.field = null; this.fieldFor = -1; this.arrive = 1.5; }
  get goal() { return this.goals[this.idx] || null; }
  /** 目的地の日本語の名前 */
  label(g) {
    if (!g) return '';
    const m = /^([a-z0-9_]+)\.([a-z0-9_]+)$/.exec(g.id), b = m && this.layout.buildings.find(x => x.id === m[1]);
    if (b && b.kind === 'hokora_small') return '祠の前';
    if (b && m[2] === 'center') { const rm = b.rooms.find(r => Math.hypot(r.center[0] - g.at[0], r.center[2] - g.at[2]) < 0.1); return `${b.id} の中（${rm ? rm.ja : '部屋'}）`; }
    if (b) return `${b.id} の${GOAL_JA[m[2]] || m[2]}`;
    return g.id;
  }
  setGoal(i) { this.idx = Math.max(0, Math.min(this.goals.length - 1, i)); this._field(); }
  next() { const n = this.goals.findIndex((g, i) => i > this.idx && !this.reached.has(g.id)); const m = n >= 0 ? n : this.goals.findIndex(g => !this.reached.has(g.id)); if (m >= 0) this.setGoal(m); return m >= 0; }
  _field() {
    const g = this.goal; if (!g || this.fieldFor === this.idx) return;
    this.goalCell = nearestCell(this.G, g.at[0], g.at[2], 1.0, g.at[1]);
    this.field = distanceField(this.G, [this.goalCell]); this.fieldFor = this.idx;
  }
  /** 今の位置からの道（[x,y,z] の並び・n 点）と残りの道のり */
  route(x, y, z, n = 80) {
    this._field(); if (!this.field) return { pts: [], dist: null };
    const k = nearestCell(this.G, x, z, 2.0, y);
    if (k < 0 || !isFinite(this.field[k])) return { pts: [], dist: null };
    return { pts: descend(this.G, this.field, k, n), dist: this.field[k] + 0 };
  }
  /** 着いたか（水平 arrive m・高さ 1.2m 以内）。着いたら印を付けて次へ。戻り値：着いた目的地か null */
  check(x, y, z) {
    const g = this.goal; if (!g) return null;
    if (Math.hypot(x - g.at[0], z - g.at[2]) < this.arrive && Math.abs(y - g.at[1]) < 1.2) { this.reached.add(g.id); this.next(); return g; }
    return null;
  }
  get done() { return this.goals.every(g => this.reached.has(g.id)); }
  /** 自動で歩く向き：道の look m 先の点へ。[dx, dz] */
  steer(x, y, z, look = 1.6) {
    const r = this.route(x, y, z, 40), g = this.goal;
    if (!r.pts.length) return g ? norm([g.at[0] - x, g.at[2] - z]) : [0, 0];
    let tgt = r.pts[r.pts.length - 1];
    for (const p of r.pts) if (Math.hypot(p[0] - x, p[2] - z) >= look) { tgt = p; break; }
    if (r.dist < look + 0.5) tgt = g.at;
    return norm([tgt[0] - x, tgt[2] - z]);
  }
}
const norm = v => { const L = Math.hypot(v[0], v[1]); return L > 1e-6 ? [v[0] / L, v[1] / L] : [0, 0]; };
