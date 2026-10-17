// 層 8「遊びの定義」（フェーズ 4）：地図仕様の gameplay（戸・門・チェックポイント・敵の巡回）を、組み立ての結果（建物の扉・仕切りの開口・道・地形の高さ）
// に合わせて絶対の座標にする。DOM・three.js なし・種を使わない（同じ仕様＋同じ配置 → 同じ結果）。前の層（建物・散布・飾り）は 1 つも変えない。
// 出力：layout.gameplay = { doors:[…], checkpoints:[…], enemies:[…], notes:[…] }。検査は validate.js（auto.gameplay）。
import { toWorld, deg, obbOverlap } from '../core/geom.js';
import { DOOR_KINDS } from '../game/doors.js';

const r3 = v => Math.round(v * 1000) / 1000;

/** 道の上で (x,z) に一番近い区間の向き（度：ローカル +z＝道の進む向き） */
function pathHeading(paths, x, z, pathId) {
  let best = null;
  for (const p of paths) {
    if (pathId && p.id !== pathId) continue;
    for (let i = 0; i + 1 < p.points.length; i++) {
      const a = p.points[i], b = p.points[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / L2)), d = Math.hypot(a[0] + dx * t - x, a[2] + dz * t - z);
      if (!best || d < best.d) best = { d, rot: Math.atan2(dx, dz) * 180 / Math.PI, at: [a[0] + dx * t, a[2] + dz * t] };
    }
  }
  return best;
}

/**
 * spec.gameplay → { doors, checkpoints, enemies, notes }
 * ctx = { plans（建物の組み立て）, paths（道・高さ入り）, hf（最終の地形）, objects（置いた物：門の柵を木に当てない）, start }
 */
export function planGameplay(spec, ctx) {
  const g = spec.gameplay || {}, notes = [], doors = [], hf = ctx.hf;
  const byDoor = new Map(), byOpening = new Map();
  for (const pl of ctx.plans) { for (const d of pl.doors || []) byDoor.set(d.id, d); for (const o of pl.openings || []) byOpening.set(o.id, o); }
  for (const d of g.doors || []) {
    const kind = d.kind || (byDoor.has(d.id) ? 'sliding' : byOpening.has(d.id) ? 'fusuma' : 'hinged');
    if (!DOOR_KINDS[kind]) { notes.push({ id: d.id, issue: `戸の型 ${kind} が無い` }); continue; }
    const base = { id: d.id, kind, initial: d.initial || 'closed', ...(d.locked ? { locked: true } : {}) };
    if (byDoor.has(d.id)) {
      const b = byDoor.get(d.id);
      doors.push({ ...base, building: b.building, at: b.at.slice(), rotY: b.rotY, width: b.width, height: b.height, wallT: b.wallT || 0.15, face: 1, slide: d.slide || 1 });
    } else if (byOpening.has(d.id)) {
      const o = byOpening.get(d.id);
      doors.push({ ...base, building: o.building, at: o.at.slice(), rotY: o.rotY, width: o.width, height: o.height, wallT: o.wallT, face: d.face || 1, slide: d.slide || o.slide, rooms: o.rooms });
    } else if (d.at) {
      // 外の門（開き戸）：道の上なら道の向きに合わせる。両側の柵（当たり）は木・岩に当たらない長さまで
      const h = d.onPath || d.rotY == null ? pathHeading(ctx.paths, d.at[0], d.at[1], d.onPath) : null;
      const at2 = h && d.snap !== false ? h.at : d.at, rot = d.rotY ?? (h ? h.rot : 0), w = d.width || 1.8, y = r3(hf.at(at2[0], at2[1]));
      const rr = deg(rot), wings = [];
      for (const s of [-1, 1]) {
        let L = d.fence ?? 1.6;
        for (; L > 0.3; L -= 0.2) {
          const [cx, cz] = toWorld(at2[0], at2[1], rr, s * (w / 2 + 0.1 + L / 2), 0), o = { cx, cz, hx: L / 2, hz: 0.08, rot: rr };
          if (!(ctx.objects || []).some(q => q.col && Math.hypot(q.at[0] - cx, q.at[2] - cz) < L + 2 && obbOverlap(o, q.col.shape === 'cyl' ? { cx: q.at[0], cz: q.at[2], hx: q.col.r, hz: q.col.r, rot: 0 } : { cx: q.at[0], cz: q.at[2], hx: q.col.hx, hz: q.col.hz, rot: deg(q.rotY) }))) break;
        }
        if (L > 0.3) { const [cx, cz] = toWorld(at2[0], at2[1], rr, s * (w / 2 + 0.1 + L / 2), 0); wings.push({ c: [r3(cx), y, r3(cz)], len: r3(L), rotY: r3(rot) }); }
      }
      const posts = [-1, 1].map(s => { const [px, pz] = toWorld(at2[0], at2[1], rr, s * (w / 2 + 0.06), 0); return [r3(px), y, r3(pz)]; });
      doors.push({ ...base, kind, building: null, at: [r3(at2[0]), y, r3(at2[1])], rotY: r3(rot), width: w, height: d.height || 1.5, wallT: 0.12, hinge: d.hinge || 'left', posts, wings, ...(d.onPath ? { path: d.onPath } : {}) });
    } else notes.push({ id: d.id, issue: '戸が建物の扉・仕切りの開口のどれでもなく、at も無い' });
  }
  // チェックポイント：最初はスタート（いつも記録済み）
  const cps = [{ id: 'cp.start', ja: 'スタート', at: ctx.start.slice(), r: 4 }];
  for (const c of g.checkpoints || []) cps.push({ id: c.id, ja: c.ja || c.id, at: [c.at[0], r3(surfaceY(ctx, c.at[0], c.at[1])), c.at[1]], r: c.r || 3 });
  // 敵：出る所・巡回の点（地面の高さ）
  const enemies = (g.enemies || []).map((e, i) => {
    const id = e.id || `enemy${i}`, P = p => [p[0], r3(surfaceY(ctx, p[0], p[1])), p[1]];
    const out = { id, ai: e.ai, spawn: P(e.spawn), route: (e.route && e.route.length ? e.route : [e.spawn]).map(P), chase: e.chase !== false };
    for (const k of ['speed', 'sight', 'hear', 'catchR', 'loseT', 'searchT']) if (e[k] != null) out[k] = e[k];
    return out;
  });
  return { doors, checkpoints: cps, enemies, notes };
}

/** 地面か建物の床の高さ（床の箱の中なら床の上） */
function surfaceY(ctx, x, z) {
  let y = ctx.hf.at(x, z);
  for (const pl of ctx.plans) for (const p of pl.parts) {
    if (!p.walk) continue;
    const r = deg(p.rotY || 0), dx = x - p.c[0], dz = z - p.c[2], u = dx * Math.cos(r) - dz * Math.sin(r), v = dx * Math.sin(r) + dz * Math.cos(r);
    if (Math.abs(u) <= p.size[0] / 2 && Math.abs(v) <= p.size[2] / 2) y = Math.max(y, p.c[1] + p.size[1] / 2);
  }
  return y;
}
