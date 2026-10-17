// 層 5・6「大きい物・小さい物」（07 §4.2）：ポアソン円盤（投げ矢＋升目のハッシュ）の散布と、置ける所の規則。DOM・three.js なし・種で決まる。
// 素材はまだ無いので「仮の形（stand-in）」の一覧 STANDINS を使う（id は素材の目録と同じ書き方。実素材が来たら目録の id に差し替える）。
import { childRng, range, pick } from '../core/rng.js';
import { RULES, hitsKeepOut, footGround, footSlope } from './rules.js';
import { obbOverlap, deg } from '../core/geom.js';
import { makeNoise, fbm } from '../terrain/generate.js';

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const r3 = v => Math.round(v * 1000) / 1000;

/**
 * 仮の形の一覧。cls：tree|rock|prop|grass（坂・浮きのしきい値の組）。size は scale 1 の [幅, 高さ, 奥行]（m）。
 * col：当たり（cyl＝円柱の半径 r／box）。occ：他の物との間隔（半径）。tags：地図仕様の asset.tags と突き合わせる。
 */
export const STANDINS = {
  'veg.tree.sugi': { ja: '杉（仮の形）', cls: 'tree', tags: ['杉', '針葉樹', '木'], size: [4.4, 14, 4.4], col: { shape: 'cyl', r: 0.28 }, occ: 1.2, scale: [0.7, 1.3], sink: 0.05, embed: 0.6 },
  'veg.tree.broadleaf': { ja: '広葉樹（仮の形）', cls: 'tree', tags: ['広葉樹', '木'], size: [6, 9, 6], col: { shape: 'cyl', r: 0.24 }, occ: 1.4, scale: [0.7, 1.25], sink: 0.05, embed: 0.6 },
  'rock.boulder': { ja: '岩（仮の形）', cls: 'rock', category: 'rock', tags: ['岩'], size: [1.4, 0.9, 1.1], col: { shape: 'box' }, occ: 0.4, scale: [0.5, 2.2], sinkFrac: 0.15, embedFrac: 0.4 },
  'veg.grass': { ja: '下草（仮の形）', cls: 'grass', tags: ['下草', '草'], size: [0.5, 0.35, 0.5], small: true },
  'prop.barrel': { ja: '樽', cls: 'prop', size: [0.6, 0.85, 0.6], col: { shape: 'cyl', r: 0.3 }, occ: 0.4 },
  'prop.crate': { ja: '木箱', cls: 'prop', size: [0.7, 0.6, 0.7], col: { shape: 'box' }, occ: 0.4 },
  'prop.planks': { ja: '板の山', cls: 'prop', size: [1.8, 0.35, 0.7], col: { shape: 'box' }, occ: 0.4 },
  'prop.debris': { ja: '瓦礫', cls: 'prop', size: [1.2, 0.5, 1.0], col: { shape: 'box' }, occ: 0.4 },
  'prop.beam': { ja: '落ちた梁', cls: 'prop', size: [2.4, 0.25, 0.25], col: { shape: 'box' }, occ: 0.2 },
  'prop.kamado': { ja: 'かまど', cls: 'prop', size: [0.9, 0.75, 0.6], col: { shape: 'box' }, occ: 0.2 },
  'prop.tansu': { ja: '箪笥', cls: 'prop', size: [1.0, 1.1, 0.45], col: { shape: 'box' }, occ: 0.2 },
};

/** 地図仕様の asset の問い合わせ → 仮の形の id の一覧（無ければ []） */
export function matchStandins(asset = {}) {
  if (asset.ids && asset.ids.length) return asset.ids.filter(id => STANDINS[id]);
  const out = [];
  for (const [id, s] of Object.entries(STANDINS)) {
    if (asset.category && s.category === asset.category) out.push(id);
    else if ((asset.tags || []).some(t => (s.tags || []).includes(t)) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** 点のハッシュ（升目に連結リスト）。半径つきの点を入れ、近くを調べる */
export class PointHash {
  constructor(w, d, cell) { this.cell = cell; this.nx = Math.ceil(w / cell) + 1; this.nz = Math.ceil(d / cell) + 1; this.head = new Int32Array(this.nx * this.nz).fill(-1); this.next = []; this.pts = []; }
  add(x, z, r = 0, data = null) { const i = Math.max(0, Math.min(this.nx - 1, Math.floor(x / this.cell))), j = Math.max(0, Math.min(this.nz - 1, Math.floor(z / this.cell))), k = j * this.nx + i, n = this.pts.length; this.pts.push({ x, z, r, data }); this.next.push(this.head[k]); this.head[k] = n; }
  /** (x,z) から距離 < dist(p) の点があるか。dist(p) は点ごとの必要な間隔 */
  near(x, z, reach, dist) {
    const R = Math.ceil(reach / this.cell), ci = Math.floor(x / this.cell), cj = Math.floor(z / this.cell);
    for (let j = Math.max(0, cj - R); j <= Math.min(this.nz - 1, cj + R); j++) for (let i = Math.max(0, ci - R); i <= Math.min(this.nx - 1, ci + R); i++)
      for (let n = this.head[j * this.nx + i]; n >= 0; n = this.next[n]) { const p = this.pts[n], dd = dist(p); if ((p.x - x) ** 2 + (p.z - z) ** 2 < dd * dd) return p; }
    return null;
  }
}

/** 物の足元の OBB（仮の形の大きさ×scale・回転） */
export function objectObb(def, x, z, rotDeg, s) {
  if (def.col && def.col.shape === 'cyl') { const r = def.col.r * s; return { cx: x, cz: z, hx: r, hz: r, rot: deg(rotDeg) }; }
  return { cx: x, cz: z, hx: def.size[0] * s / 2, hz: def.size[2] * s / 2, rot: deg(rotDeg) };
}

/** 置き方の高さ：足元の低い所に合わせ、沈める（岩は高さの 15%）。浮きなし・めり込みは embed の内なら可 */
export function seatObject(hf, def, obb, s, surface = null) {
  const g = surface ? { min: surface, max: surface } : footGround(hf, obb);
  const h = def.size[1] * s, sink = def.sinkFrac ? def.sinkFrac * h : (def.sink || 0), embed = def.embedFrac ? def.embedFrac * h : (def.embed ?? 0.1);
  return { y: g.min - sink, range: g.max - g.min, sink, embed, h };
}

/** 1 つの物の記録（JSON・mm に丸める） */
export function makeObject(id, layer, kind, def, x, y, z, rotDeg, s, extra = {}) {
  const col = def.col ? (def.col.shape === 'cyl' ? { shape: 'cyl', r: r3(def.col.r * s), h: r3(def.size[1] * s) } : { shape: 'box', hx: r3(def.size[0] * s / 2), hz: r3(def.size[2] * s / 2), h: r3(def.size[1] * s) }) : null;
  const embed = def.embedFrac ? def.embedFrac * def.size[1] * s : (def.embed ?? 0.1);
  return Object.assign({ id, layer, kind, at: [r3(x), r3(y), r3(z)], rotY: r3(rotDeg), scale: r3(s), size: def.size.map(v => r3(v * s)), col, embed: r3(embed), cls: def.cls }, extra);
}

/**
 * 1 つの層を散布する。ctx = { spec, hf, keepOut, buildingAreas:[{id,obb}], cliff, occ: PointHash, W, D, villages:[{c,r}] }
 * 戻り値：{ objects, instances?, stats }
 */
export function scatterLayer(layer, ctx) {
  const kinds = matchStandins(layer.asset), stats = { layer: layer.layer, kinds, target: 0, placed: 0, tries: 0, rejected: {} };
  if (!kinds.length) return { objects: [], stats, gap: layer.asset };
  const r = childRng(ctx.spec.seed, `scatter.${layer.layer}`), mask = makeNoise(childRng(ctx.spec.seed, `mask.${layer.layer}`));
  const defs = kinds.map(k => [k, STANDINS[k]]), cls = defs[0][1].cls, small = cls === 'grass';
  const { hf, W, D } = ctx, area = W * D, N = Math.round((layer.density || 0) * area);
  const minDist = layer.minDist ?? (small ? 0.5 : 2), slope = layer.slope || [0, RULES.slopeMax[cls] ?? 35], maxSlope = Math.min(slope[1], RULES.slopeMax[cls] ?? 90);
  const avoid = new Set(layer.avoid || []), own = new PointHash(W, D, Math.max(0.5, minDist));
  const rej = k => { stats.rejected[k] = (stats.rejected[k] || 0) + 1; };
  const weight = (x, z, sl, h) => {
    let w = 1;
    if (cls === 'tree') { w = 0.2 + 0.8 * smooth(-0.3, 0.3, fbm(mask, x, z, 3, 55)); for (const v of ctx.villages) w *= 0.1 + 0.9 * smooth(v.r * 0.5, v.r * 1.1, Math.hypot(x - v.c[0], z - v.c[1])); }
    else if (cls === 'rock') w = 0.25 + 0.75 * smooth(15, 45, sl);
    else if (small) w = (1 - 0.8 * smooth(25, 40, sl)) * (0.4 + 0.6 * smooth(-0.4, 0.2, fbm(mask, x, z, 2, 25)));
    return w;
  };
  stats.target = N;
  const objects = [], packed = [], tries = N * (small ? 3 : 8);
  for (let t = 0; t < tries && stats.placed < N; t++) {
    stats.tries++;
    const x = 1 + r() * (W - 2), z = 1 + r() * (D - 2), u = r(), rot = r() * 360, sR = r(), kR = r();
    const sl = hf.slopeDeg(x, z), h = hf.at(x, z);
    if (sl < slope[0] || sl > maxSlope) { rej('slope'); continue; }
    if (layer.height && (h < layer.height[0] || h > layer.height[1])) { rej('height'); continue; }
    if (u > weight(x, z, sl, h)) { rej('density'); continue; }
    if (own.near(x, z, minDist, () => minDist)) { rej('minDist'); continue; }
    // 種類（木：高い所・坂は杉が多い）
    let kind = defs[0][0];
    if (defs.length > 1) { if (cls === 'tree') { const pS = 0.3 + 0.45 * smooth(18, 40, h) + 0.2 * smooth(12, 30, sl); kind = (kR < pS ? defs.find(d => /sugi/.test(d[0])) || defs[0] : defs.find(d => !/sugi/.test(d[0])) || defs[0])[0]; } else kind = pick(() => kR, defs)[0]; }
    const def = STANDINS[kind], s = range(() => sR, ...(def.scale || [0.8, 1.2]));
    const obb = objectObb(def, x, z, rot, small ? 1 : s);
    if (hitsKeepOut(obb, ctx.keepOut, small)) { rej('keepOut'); continue; }
    if (avoid.has('cliffEdge') && ctx.cliff.test(x, z)) { rej('cliffEdge'); continue; }
    const bm = cls === 'tree' && avoid.has('buildings') ? 2.5 : small ? 0.2 : 1.0;
    if (ctx.buildingAreas.some(a => obbOverlap(obb, { ...a.obb, hx: a.obb.hx + bm, hz: a.obb.hz + bm }))) { rej('buildings'); continue; }
    if (small) { own.add(x, z, 0); packed.push(Math.round(x * 100), Math.round(z * 100)); stats.placed++; continue; }
    const occR = (def.occ || 0.5) * s;
    if (ctx.occ.near(x, z, occR + 3, p => p.r + occR)) { rej('overlap'); continue; }
    const seat = seatObject(hf, def, obb, s);
    if (seat.range + seat.sink > -RULES.penetrate + seat.embed - 0.02) { rej('uneven'); continue; }
    own.add(x, z, 0); ctx.occ.add(x, z, occR);
    objects.push(makeObject(`${layer.layer}#${objects.length}`, layer.layer, kind, def, x, seat.y, z, rot, s));
    stats.placed++;
  }
  const out = { objects, stats };
  if (small) out.instances = { layer: layer.layer, kind: defs[0][0], count: packed.length / 2, encoding: 'u16le:x_cm,z_cm', data: b64(packed) };
  return out;
}

/** 数の並び（0〜65535）→ base64（u16 リトルエンディアン）。node・ブラウザ両方 */
export function b64(nums) {
  const b = new Uint8Array(nums.length * 2); nums.forEach((v, i) => { b[i * 2] = v & 255; b[i * 2 + 1] = (v >> 8) & 255; });
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return typeof btoa === 'function' ? btoa(s) : Buffer.from(b).toString('base64');
}
export function unb64(str) {
  const s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
  const out = new Uint16Array(s.length >> 1); for (let i = 0; i < out.length; i++) out[i] = s.charCodeAt(i * 2) | (s.charCodeAt(i * 2 + 1) << 8); return out;
}
