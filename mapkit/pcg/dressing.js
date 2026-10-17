// 層 7「飾り（dressing）」（フェーズ 3）：建物・道・村の場所から、生活の跡の小物を決まった規則で置く。DOM・three.js なし・種で決まる。
// 散布（層 5・6）の**後ろ**に足す＝前の層（木・岩・下草・小物）は 1 つも変わらない（試験：後ろに足した層は前の層を変えない）。
// 置く時の検査は小物（props）と同じ（立入禁止・建物の足元・坂・重なり・足元の高さの差）。置けない物は理由つきで stats に残す（黙って消さない）。
// 当たり：中に置く物（布団・倒れた障子・囲炉裏・倒れた棚）と倒れた自転車は「当たりなし」（低い・歩きを止めない）。井戸・電柱・札・柵・狛犬・灯籠・石垣は当たりあり。
import { toWorld, deg } from '../core/geom.js';
import { childRng, range } from '../core/rng.js';
import { nearestOnPath } from './paths.js';

/** 置く物の型（STANDINS に足す。大きさは tools/blender/kit の部品に合わせた） */
export const DRESSING_STANDINS = {
  'prop.irori': { ja: '囲炉裏', cls: 'prop', size: [0.9, 0.36, 0.9], occ: 0.2 },
  'prop.futon': { ja: '朽ちた布団', cls: 'prop', size: [1.0, 0.35, 1.9], occ: 0.2 },
  'prop.shelf_fallen': { ja: '倒れた棚', cls: 'prop', size: [0.8, 0.37, 1.6], occ: 0.2 },
  'prop.door_fallen': { ja: '倒れた障子', cls: 'prop', size: [0.9, 0.14, 1.8], occ: 0.2 },
  'prop.bicycle': { ja: '錆びた自転車（横倒し）', cls: 'prop', size: [1.75, 0.15, 0.6], occ: 0.3 },
  'prop.well': { ja: '井戸', cls: 'prop', size: [1.4, 1.8, 1.2], col: { shape: 'cyl', r: 0.62 }, occ: 0.8 },
  'prop.utility_pole': { ja: '古い木の電柱', cls: 'prop', size: [0.3, 8.3, 0.3], col: { shape: 'cyl', r: 0.15 }, occ: 0.5 },
  'prop.sign': { ja: '色あせた立て札', cls: 'prop', size: [0.72, 1.62, 0.2], col: { shape: 'cyl', r: 0.06 }, occ: 0.4 },
  'prop.fence': { ja: '壊れかけの木の柵', cls: 'prop', size: [2.05, 1.1, 0.14], col: { shape: 'box' }, occ: 0.3 },
  'prop.komainu': { ja: '狛犬', cls: 'prop', size: [0.5, 0.97, 0.64], col: { shape: 'box' }, occ: 0.3 },
  'prop.stone_lantern': { ja: '石灯籠', cls: 'prop', size: [0.55, 1.22, 0.55], col: { shape: 'box' }, occ: 0.3 },
  'prop.ishigaki': { ja: '石垣（2m）', cls: 'prop', size: [2.0, 0.8, 0.5], col: { shape: 'box' }, occ: 0.3, embedFrac: 0.45 },
};

/**
 * 置く物の候補の列（順に試す）。ctx = { seed, plans（建物の組み立て）, paths, W, D }
 * 戻り値：[{ kind, x, z, rot, y?（床の高さ・中の物）, building?, inside?, tries?: [[x,z,rot], ...]（置けない時の代わりの場所） }]
 */
export function planDressing(ctx) {
  const out = [], r = childRng(ctx.seed, 'dressing');
  const W = (pl, u, v) => toWorld(pl.at[0], pl.at[2], deg(pl.rot), u, v);
  for (const pl of ctx.plans) {
    if (pl.kind === 'jp_house_abandoned') {
      // 中：部屋ごとに 1〜2 個（奥の壁ぎわ・扉の中の立入禁止と部屋の目的地を避ける＝置く時の検査で落ちたら次の候補）
      for (const rm of pl.rooms) {
        if (rm.name === 'doma') continue;
        const [w, d] = rm.size, list = rm.name === 'daidokoro' ? ['prop.irori', 'prop.shelf_fallen'] : /washitsu/.test(rm.name) ? ['prop.futon', 'prop.door_fallen'] : ['prop.shelf_fallen'];
        const rot = pl.rot;
        list.forEach((kind, k) => {
          const cands = [];
          for (const [fu, fv, rr] of [[-0.22, -0.18, 90], [0.22, -0.2, 90], [-0.2, 0.15, 0], [0.2, 0.18, 0], [0, -0.25, 90]]) {
            const lu = fu * (w - 1.0) * (k ? -1 : 1), lv = fv * (d - 1.0);
            const [x, z] = toWorld(rm.center[0], rm.center[2], deg(rot), lu, lv);
            cands.push([x, z, rot + rr + range(r, -8, 8)]);
          }
          out.push({ kind, x: cands[0][0], z: cands[0][1], rot: cands[0][2], y: rm.floorY, building: pl.id, inside: true, tries: cands.slice(1) });
        });
      }
      // 外：家の横の倒れた自転車・裏の柵・裏の石垣（坂の上側）
      const f = pl.obb, s = r() < 0.5 ? 1 : -1;
      const [bx, bz] = toWorld(f.cx, f.cz, f.rot, s * (f.hx + 1.6), range(r, -1, 1));
      out.push({ kind: 'prop.bicycle', x: bx, z: bz, rot: pl.rot + 90 * s + range(r, -20, 20), building: pl.id, tries: [toWorld(f.cx, f.cz, f.rot, -s * (f.hx + 1.6), 0).concat(pl.rot - 90 * s)] });
      const [fx, fz] = toWorld(f.cx, f.cz, f.rot, range(r, -f.hx * 0.5, f.hx * 0.5), -f.hz - 1.8);
      out.push({ kind: 'prop.fence', x: fx, z: fz, rot: pl.rot + range(r, -6, 6), building: pl.id, tries: [toWorld(f.cx, f.cz, f.rot, s * (f.hx + 2.0), -f.hz * 0.5).concat(pl.rot + 90)] });
      const [ix, iz] = toWorld(f.cx, f.cz, f.rot, range(r, -f.hx * 0.4, f.hx * 0.4), -f.hz - 3.2);
      out.push({ kind: 'prop.ishigaki', x: ix, z: iz, rot: pl.rot, building: pl.id, tries: [toWorld(f.cx, f.cz, f.rot, 0, -f.hz - 4.2).concat(pl.rot)] });
    }
    if (pl.kind === 'hokora_small') {
      // 狛犬 1 対（石段の下の左右・参道を向く）。祠の足元の範囲の中なので「中の物」と同じ扱い（土台の高さ・建物の範囲の検査をしない。当たりはある）
      const half = (Math.max(...pl.footprint) + 1.6) / 2, base = half + 5 * 0.45;
      for (const s of [-1, 1]) out.push({ kind: 'prop.komainu', x: W(pl, s * 1.45, base - 0.6)[0], z: W(pl, s * 1.45, base - 0.6)[1], rot: pl.rot, y: pl.at[1], building: pl.id, inside: true, tries: [W(pl, s * 1.5, base - 0.2).concat(pl.rot)] });   // 祠の土台（平らな所）の中
    }
  }
  // 参道：石灯籠 1 対（道の中ほど・道の外 2.0m）。山道：電柱（村へ入る所から 30m おき・道の外 2.4m）。分かれ道：立て札
  const sando = ctx.paths.find(p => p.kind === 'shrine_approach'), yama = ctx.paths.find(p => p.kind === 'mountain_path');
  const alongside = (p, i, off) => { const a = p.points[Math.max(0, i - 1)], b = p.points[Math.min(p.points.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1, q = p.points[i]; return [q[0] - dz / L * off, q[2] + dx / L * off, Math.atan2(dx, dz) * 180 / Math.PI]; };
  if (sando) {
    const i = Math.floor(sando.points.length * 0.45), off = sando.width / 2 + 2.0;
    for (const s of [-1, 1]) { const [x, z, a] = alongside(sando, i, s * off); out.push({ kind: 'prop.stone_lantern', x, z, rot: a, tries: [alongside(sando, i + 3, s * off), alongside(sando, i - 3, s * off)] }); }
    const [sx, sz, sa] = alongside(sando, 2, sando.width / 2 + 2.2); out.push({ kind: 'prop.sign', x: sx, z: sz, rot: sa + 90, tries: [alongside(sando, 4, -(sando.width / 2 + 2.2))] });
  }
  if (yama) {
    const n = yama.points.length;
    for (let i = n - 12, k = 0; i > 20 && k < 5; i -= 30, k++) {
      const s = k % 2 ? 1 : -1, off = yama.width / 2 + 2.4, [x, z, a] = alongside(yama, i, s * off);
      out.push({ kind: 'prop.utility_pole', x, z, rot: a, tries: [alongside(yama, i - 4, s * off), alongside(yama, i + 4, -s * off)] });
    }
  }
  // 井戸：村の平らな所の中心から 8〜12m（道と家を避ける）
  if (ctx.village) {
    const [cx, cz] = ctx.village.c, cands = [];
    for (let k = 0; k < 12; k++) { const a = r() * Math.PI * 2, d = range(r, 7, 12); cands.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d, r() * 360]); }
    out.push({ kind: 'prop.well', x: cands[0][0], z: cands[0][1], rot: cands[0][2], tries: cands.slice(1) });
  }
  return out;
}

/** 道の上の点か（道の幅の中） */
export function onPath(paths, x, z, margin = 0) {
  return paths.some(p => nearestOnPath(p.points, x, z).d < p.width / 2 + margin);
}
