// 開け閉めできる戸と門（フェーズ 4）：引き戸（玄関の板戸）・襖・障子（家の中の仕切り）・開き戸（門の扉）。DOM・three.js なし（node で試験）。
// 戸の定義は配置の layout.gameplay.doors（地図仕様 gameplay.doors から build_map.mjs が作る）。
// 当たり：World の「動く当たり」（world.setDynamic）。閉じている間だけ開口を塞ぐ（引き戸は開くと壁の外の面へ寄る＝開口は全部あく）。
// 開き戸は扉の板そのものが当たり（開いた時は道の端に沿う）。歩ける格子（nav/grid.js）は「全部開いた形」で作る＝検査（validate.js）と同じ。
// 敵（enemy.js）は閉じた戸の前で開けてから通る（時間がかかる）。プレイヤーが戸を閉めると足止めになる。
import { toWorld, deg, obbCircle, pointInObb } from '../core/geom.js';


export const DOOR_KINDS = {
  sliding: { ja: '引き戸', panels: 2, time: 0.55, noise: 9 },
  fusuma: { ja: '襖', panels: 2, time: 0.45, noise: 5 },
  shoji: { ja: '障子', panels: 2, time: 0.4, noise: 4 },
  hinged: { ja: '木戸', panels: 1, time: 0.8, noise: 11 },
};
const SWING = 95;   // 開き戸の開く角度（度）
const r3 = v => Math.round(v * 1000) / 1000;

/** 閉じた時の当たりの箱（開口全体・壁の厚さ＋戸の分） */
export function closedObb(d) { return { cx: d.at[0], cz: d.at[2], hx: d.width / 2, hz: (d.wallT || 0.15) / 2 + 0.1, rot: deg(d.rotY) }; }

/** 開き戸の板の箱（open：0..1）。蝶番は左（ローカル u = −w/2）・開く向きは +z（前） */
export function leafObb(d, open) {
  const rot = deg(d.rotY), s = d.hinge === 'right' ? -1 : 1, a = s * open * SWING * Math.PI / 180;
  const [hx, hz] = toWorld(d.at[0], d.at[2], rot, -s * d.width / 2, 0);
  const lr = rot - a, [cx, cz] = toWorld(hx, hz, lr, s * d.width / 2, 0);
  return { cx, cz, hx: d.width / 2, hz: 0.05, rot: lr };
}

/** 開け具合 open の時の当たり（無ければ null） */
export function doorCollider(d, open) {
  const y0 = d.at[1], y1 = d.at[1] + d.height;
  if (d.kind === 'hinged') return { kind: 'obb', obb: leafObb(d, open), minY: y0, maxY: y1 };
  return open >= 0.92 ? null : { kind: 'obb', obb: closedObb(d), minY: y0, maxY: y1 };
}

/** 戸の板の置き場所（描画用）：[{ x, y, z, rotY（度）, w, h }]（底の中心） */
export function panelPoses(d, open) {
  const rot = deg(d.rotY), out = [], K = DOOR_KINDS[d.kind] || DOOR_KINDS.sliding;
  if (d.kind === 'hinged') { const o = leafObb(d, open); out.push({ x: o.cx, y: d.at[1], z: o.cz, rotY: o.rot * 180 / Math.PI, w: d.width, h: d.height }); return out; }
  const w = d.width / K.panels + 0.03, side = d.side || 1, face = (d.face || 1) * ((d.wallT || 0.15) / 2 + 0.035), sl = d.slide || 1;
  for (let i = 0; i < K.panels; i++) {
    const closedU = -d.width / 2 + w / 2 + i * (d.width - w), openU = sl * (d.width / 2 + w / 2 + 0.02) + (i - 0.5) * 0.02 * sl;
    // 2 枚目は 1 枚目より少し遅れて動く（重なって寄る）
    const t = Math.min(1, Math.max(0, i === 0 ? open * 1.15 : open * 1.15 - 0.15));
    const u = closedU + (openU - closedU) * t, v = face * side + (i ? 0.035 : 0) * side * (d.face || 1);
    const [x, z] = toWorld(d.at[0], d.at[2], rot, u, v);
    out.push({ x, y: d.at[1], z, rotY: d.rotY, w, h: d.height });
  }
  return out;
}

/** 門の柱・柵（動かない当たり）：[{ id, c }] */
export function fixtureColliders(d) {
  const out = [], h = d.height || 1.5;
  (d.posts || []).forEach((p, i) => out.push({ id: `door:${d.id}:post${i}`, c: { kind: 'obb', obb: { cx: p[0], cz: p[2], hx: 0.08, hz: 0.08, rot: deg(d.rotY) }, minY: p[1], maxY: p[1] + h + 0.2 } }));
  (d.wings || []).forEach((w, i) => out.push({ id: `door:${d.id}:wing${i}`, c: { kind: 'obb', obb: { cx: w.c[0], cz: w.c[2], hx: w.len / 2, hz: 0.08, rot: deg(w.rotY) }, minY: w.c[1], maxY: w.c[1] + 1.1 } }));
  return out;
}
/** 歩ける格子を作る前に：全部の戸を「開いた形」で World に入れる（柱・柵も）。検査（validate.js）と遊ぶ時（main.js）が同じ物を使う */
export function applyOpenPose(world, defs = []) {
  for (const d of defs) { for (const f of fixtureColliders(d)) world.setDynamic(f.id, f.c); world.setDynamic('door:' + d.id, doorCollider(d, 1)); }
}

export class DoorSet {
  /** defs：layout.gameplay.doors。world：World（動く当たりを入れる）か null */
  constructor(defs = [], world = null) {
    this.world = world; this.list = defs.map(d => Object.assign({}, d, { open: d.initial === 'open' ? 1 : 0, target: d.initial === 'open' ? 1 : 0, by: null }));
    this.byId = new Map(this.list.map(d => [d.id, d])); this.sync();
  }
  get(id) { return this.byId.get(id) || null; }
  reset() { for (const d of this.list) { d.open = d.target = d.initial === 'open' ? 1 : 0; d.by = null; } this.sync(); }
  sync() { if (this.world) for (const d of this.list) { for (const f of fixtureColliders(d)) this.world.setDynamic(f.id, f.c); this.world.setDynamic('door:' + d.id, doorCollider(d, d.open)); } }
  isClosed(d) { return d.kind === 'hinged' ? d.open < 0.85 : d.open < 0.92; }
  /** 体（{x,z,r} の並び）が閉める時に挟まるか */
  _pinches(d, bodies) {
    for (const b of bodies || []) {
      if (!b) continue;
      if (d.kind === 'hinged') { const r = deg(d.rotY), px = b.x - d.at[0], pz = b.z - d.at[2], u = px * Math.cos(r) - pz * Math.sin(r), v = px * Math.sin(r) + pz * Math.cos(r); if (Math.abs(u) < d.width / 2 + b.r && v > -b.r - 0.06 && v < d.width + b.r && d.open > 0.02) return true; if (obbCircle(closedObb(d), b.x, b.z, b.r)) return true; }
      else if (obbCircle(closedObb(d), b.x, b.z, b.r)) return true;
    }
    return false;
  }
  /** 前（+z）の側に何 m か（開き戸の振れる側の判定） */
  _front(d, p) { const r = deg(d.rotY); return (p.x - d.at[0]) * Math.sin(r) + (p.z - d.at[2]) * Math.cos(r); }
  /** 開ける／閉める。bodies＝挟まないか見る体。戻り値：{ ok, reason?, target } */
  setTarget(id, target, by = 'player', bodies = []) {
    const d = this.get(id); if (!d) return { ok: false, reason: 'none' };
    if (d.locked && by !== 'script') return { ok: false, reason: 'locked' };
    if (target === 0 && this._pinches(d, bodies)) return { ok: false, reason: 'blocked', target: d.target };
    d.target = target ? 1 : 0; d.by = by; return { ok: true, target: d.target };
  }
  toggle(id, by = 'player', bodies = []) { const d = this.get(id); if (!d) return { ok: false, reason: 'none' }; return this.setTarget(id, d.target > 0.5 ? 0 : 1, by, bodies); }
  /** dt 秒すすめる → 出来事 [{ id, type: 'start'|'end', target, by, kind, at }] */
  update(dt, bodies = []) {
    const ev = [];
    for (const d of this.list) {
      if (d.open === d.target) continue;
      // 閉まる途中で体が挟まったら止めて開け戻す
      if (d.target === 0 && this._pinches(d, bodies)) { d.target = 1; ev.push({ id: d.id, type: 'bounce', target: 1, by: d.by, kind: d.kind, at: d.at }); }
      const sp = dt / (DOOR_KINDS[d.kind] || DOOR_KINDS.sliding).time, was = d.open;
      if (was === 0 || was === 1) ev.push({ id: d.id, type: 'start', target: d.target, by: d.by, kind: d.kind, at: d.at });
      d.open = d.target > d.open ? Math.min(d.target, d.open + sp) : Math.max(d.target, d.open - sp);
      if (d.open === d.target) ev.push({ id: d.id, type: 'end', target: d.target, by: d.by, kind: d.kind, at: d.at });
      if (this.world) this.world.setDynamic('door:' + d.id, doorCollider(d, d.open));
    }
    return ev;
  }
  /** (x,y,z) から maxD m 以内で一番近い戸（開口の線分までの距離）。戻り値：{ door, dist } か null */
  near(x, y, z, maxD = 1.7) {
    let best = null;
    for (const d of this.list) {
      if (Math.abs(y - d.at[1]) > 1.6) continue;
      const r = deg(d.rotY), ux = Math.cos(r), uz = -Math.sin(r), px = x - d.at[0], pz = z - d.at[2];
      const t = Math.max(-d.width / 2, Math.min(d.width / 2, px * ux + pz * uz)), dist = Math.hypot(px - ux * t, pz - uz * t);
      if (dist <= maxD && (!best || dist < best.dist)) best = { door: d, dist };
    }
    return best;
  }
  /** 線分 a→b（[x,z]）が閉じた戸の開口を横切るか → 戸か null（敵の道・自動で歩く時） */
  closedOnSegment(a, b) {
    for (const d of this.list) {
      if (!this.isClosed(d)) continue;
      const o = closedObb(d), n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2));
      for (let i = 0; i <= n; i++) { const t = i / n; if (pointInObb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, o, 0.05)) return d; }
    }
    return null;
  }
  /** 状態の指紋（試験：決まった動き） */
  digest() { return this.list.map(d => `${d.id}:${r3(d.open)}/${d.target}`).join(','); }
}
