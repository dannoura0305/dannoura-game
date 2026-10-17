// 層 3「建物」（07 §4.2・§4.4）：建物の型（kind）→ 灰色の箱の部品・部屋・扉・印（anchors）・目的地の位置。DOM・three.js なし。
// 部品の形（エンジンに依らない JSON）：{ id, type, mat, shape:'box'|'cyl'|'gable', c:[x,y,z]（中心・世界）, size:[幅,高さ,奥行], rotY（度）, tilt?（度・ローカル x 軸）, collide, walk, visible? }
//   collide：当たり（壁・柱）。walk：上に乗れる床（上の面の高さで歩く）。どちらでもない物は見た目だけ（屋根・天井）。
// 規格（07 §4.4）：格子 0.5m・壁の厚さ 0.15m・扉 0.9×2.0（和風の引き戸 1.8×1.8）・窓の下端 0.9m。階高は 2.8m（天井 2.55m）にした（中の床 0.38m から 2.17m で 07 §4.5 の天井高 ≥ 2.0m）。
// 向き：ローカル (u, v) の v＋が建物の前（扉の側）。世界では (sin rot, cos rot)。rot は度（Y 軸）。
import { toWorld, deg } from '../core/geom.js';
import { childRng, range } from '../core/rng.js';

export const SPEC = { grid: 0.5, wallT: 0.15, wallH: 2.8, ceilH: 2.55, floorH: 0.38, domaH: 0.03, doorW: 1.8, doorH: 1.8, innerOpen: 1.2, innerOpenH: 2.1, sill: 0.9, winH: 0.8, pitch: 26, overhang: 0.6 };
const r3 = v => Math.round(v * 1000) / 1000;

/** 建物の型の一覧（見つからない型はレポートの gaps に出す） */
export const KINDS = {
  jp_house_abandoned: { ja: '廃屋（中に入れる和風の家）', make: houseAbandoned },
  jp_house_collapsed: { ja: '崩れた家', make: houseCollapsed },
  hokora_small: { ja: '小さな祠（石の基壇・石段・鳥居）', make: hokora },
};

function frame(b, padY) {
  const rot = deg(b.rot || 0), parts = [];
  const W = (u, v) => toWorld(b.at[0], b.at[1], rot, u, v);
  /** ローカルの箱（u・v は中心、y0 は下の面の高さ・土台から） */
  const box = (name, type, mat, u, v, w, d, y0, h, o = {}) => {
    const [x, z] = W(u, v);
    const p = Object.assign({ id: `${b.id}.${name}`, type, mat, shape: 'box', c: [r3(x), r3(padY + y0 + h / 2), r3(z)], size: [r3(w), r3(h), r3(d)], rotY: r3(b.rot || 0), collide: false, walk: false }, o);
    parts.push(p); return p;
  };
  return { rot, parts, W, box };
}

/** 壁 1 枚（ローカルの線：中心 (u,v)・長さ L・向き axis 'u'|'v'）を開口で割る。openings: [{ c（線の上の位置）, w, y0, y1 }] */
function wall(F, name, u, v, L, axis, h, openings = [], mat = 'plaster') {
  const T = SPEC.wallT, seg = (s0, s1, y0, y1, tag) => {
    if (s1 - s0 < 0.02 || y1 - y0 < 0.02) return;
    const m = (s0 + s1) / 2, len = s1 - s0;
    if (axis === 'u') F.box(`${name}${tag}`, 'wall', mat, u + m, v, len, T, y0, y1 - y0, { collide: true });
    else F.box(`${name}${tag}`, 'wall', mat, u, v + m, T, len, y0, y1 - y0, { collide: true });
  };
  const ops = openings.slice().sort((a, b) => a.c - b.c);
  let s = -L / 2, n = 0;
  for (const o of ops) {
    const a = o.c - o.w / 2, b = o.c + o.w / 2;
    seg(s, a, 0, h, `_${n++}`);
    seg(a, b, 0, o.y0, `_${n++}lo`); seg(a, b, o.y1, h, `_${n++}hi`);
    s = b;
  }
  seg(s, L / 2, 0, h, `_${n++}`);
}

/** 切妻の屋根（棟は u の向き）。holeAt：抜け落ちた所（u の範囲） */
function gableRoof(F, Wd, Dd, holes = []) {
  const S = SPEC, p = S.pitch * Math.PI / 180, E = Dd / 2 + S.overhang, len = E / Math.cos(p), th = 0.12, RW = Wd + S.overhang * 2;
  for (const sgn of [1, -1]) {
    const yc = S.wallH + (Dd / 2 - E / 2) * Math.tan(p) + th / 2;
    const pieces = holes.length ? splitRange(-RW / 2, RW / 2, holes) : [[-RW / 2, RW / 2]];
    pieces.forEach(([a, b], i) => { const q = F.box(`roof${sgn > 0 ? 'F' : 'B'}${i}`, 'roof', 'roof', (a + b) / 2, sgn * E / 2, b - a, len, yc - th / 2, th); q.tilt = sgn * S.pitch; });
  }
  for (const sgn of [1, -1]) F.box(`gable${sgn > 0 ? 'R' : 'L'}`, 'gable', 'plaster', sgn * (Wd / 2 - SPEC.wallT / 2), 0, SPEC.wallT, Dd, SPEC.wallH, Dd / 2 * Math.tan(p), { shape: 'gable' });
}
function splitRange(a, b, holes) { const out = []; let s = a; for (const [h0, h1] of holes.slice().sort((x, y) => x[0] - y[0])) { if (h0 > s) out.push([s, h0]); s = Math.max(s, h1); } if (b > s) out.push([s, b]); return out; }

const ROOM_JA = { doma: '土間', washitsu_6: '和室（六畳）', washitsu_8: '和室（八畳）', daidokoro: '台所', nando: '納戸', engawa: '縁側' };

function houseAbandoned(b, padY, ctx) {
  const S = SPEC, F = frame(b, padY), [Wd, Dd] = b.footprint, T = S.wallT, r = childRng(ctx.seed, `building.${b.id}`);
  const rooms = (b.rooms && b.rooms.length ? b.rooms : (Wd >= 9 ? ['doma', 'washitsu_6', 'daidokoro'] : ['doma', 'washitsu_6'])).slice(0, 4);
  // 部屋は u の向きの帯。左端が土間（扉がある）
  const domaW = Math.max(2.6, Math.min(3.4, Wd * 0.3)), restW = (Wd - domaW) / Math.max(1, rooms.length - 1);
  const strips = []; let u0 = -Wd / 2;
  rooms.forEach((name, i) => { const w = i === 0 ? domaW : restW; strips.push({ name, u0, u1: u0 + w }); u0 += w; });
  const door = { u: (strips[0].u0 + strips[0].u1) / 2, w: S.doorW, h: S.doorH };
  const anchW = (ctx.anchors || []).find(a => a.id === `${b.id}.door` && a.type === 'door'); if (anchW && anchW.width) door.w = Math.min(anchW.width, domaW - 0.4);
  // 外壁：前（扉）・後ろ・左右（窓は板の間の部屋に）
  const win = (c) => ({ c, w: 1.2, y0: S.sill, y1: S.sill + S.winH });
  wall(F, 'wallF', 0, Dd / 2 - T / 2, Wd, 'u', S.wallH, [{ c: door.u, w: door.w, y0: 0, y1: door.h }, ...strips.slice(1).map(s => win((s.u0 + s.u1) / 2))]);
  wall(F, 'wallB', 0, -Dd / 2 + T / 2, Wd, 'u', S.wallH, strips.slice(1).map(s => win((s.u0 + s.u1) / 2)));
  wall(F, 'wallL', -Wd / 2 + T / 2, 0, Dd - 2 * T, 'v', S.wallH, []);
  wall(F, 'wallR', Wd / 2 - T / 2, 0, Dd - 2 * T, 'v', S.wallH, [win(0)]);
  // 仕切り（開口つき）
  strips.slice(1).forEach((s, i) => wall(F, `part${i}`, s.u0, 0, Dd - 2 * T, 'v', S.wallH, [{ c: i === 0 ? 0.6 : -0.4, w: i === 0 ? 1.8 : S.innerOpen, y0: 0, y1: S.innerOpenH }], 'wood'));
  // 床・天井
  const out = { rooms: [], props: [] };
  strips.forEach((s, i) => {
    const u = (s.u0 + s.u1) / 2, w = s.u1 - s.u0 - (i ? T : 0) - (i === 0 ? T : 0), d = Dd - 2 * T, top = i === 0 ? S.domaH : S.floorH;
    F.box(`floor_${s.name}`, 'floor', i === 0 ? 'earth' : (/washitsu/.test(s.name) ? 'tatami' : 'wood'), u, 0, w, d, -0.25, top + 0.25, { walk: true });
    F.box(`ceil_${s.name}`, 'ceiling', 'wood', u, 0, s.u1 - s.u0, Dd, S.ceilH, 0.05);
    const [x, z] = F.W(u, 0);
    out.rooms.push({ id: `${b.id}.${s.name}`, name: s.name, ja: ROOM_JA[s.name] || s.name, center: [r3(x), r3(padY + top), r3(z)], size: [r3(s.u1 - s.u0), r3(Dd)], rotY: b.rot || 0, floorY: r3(padY + top), ceilY: r3(padY + S.ceilH) });
  });
  // 屋根（傷みが強いと一部が抜けている）
  const holes = (b.decay || 0) > 0.6 ? [[range(r, -Wd / 4, Wd / 6), 0]].map(([a]) => [a, a + 1.5]) : [];
  gableRoof(F, Wd, Dd, holes);
  // 縁側（前の右側・上に乗れる）
  const eu0 = door.u + door.w / 2 + 0.9, eu1 = Wd / 2;
  let engawa = null;
  if (eu1 - eu0 > 1.5) { F.box('engawa', 'floor', 'wood', (eu0 + eu1) / 2, Dd / 2 + 0.45, eu1 - eu0, 0.9, -0.3, 0.7, { walk: true }); const [x, z] = F.W((eu0 + eu1) / 2, Dd / 2 + 0.9); engawa = [x, z]; }
  // 中の小物（隅に寄せる：扉から部屋への道を塞がない）
  const last = strips[strips.length - 1], second = strips[1] || strips[0];
  out.props.push({ kind: 'prop.kamado', u: strips[0].u0 + 0.75, v: -Dd / 2 + 0.65, rot: b.rot || 0, y: padY + S.domaH, room: strips[0].name });
  out.props.push({ kind: 'prop.tansu', u: second.u1 - 0.75, v: -Dd / 2 + 0.5, rot: b.rot || 0, y: padY + S.floorH, room: second.name });
  if (last !== second) out.props.push({ kind: 'prop.tansu', u: last.u1 - 0.75, v: -Dd / 2 + 0.5, rot: b.rot || 0, y: padY + S.floorH, room: last.name });
  const [dx, dz] = F.W(door.u, Dd / 2);
  const doorRec = { id: `${b.id}.door`, building: b.id, at: [r3(dx), r3(padY), r3(dz)], rotY: b.rot || 0, width: door.w, height: door.h, wallT: T, kind: 'sliding', enterable: true };
  const [ax, az] = F.W(door.u, Dd / 2 + 0.8), [fx, fz] = F.W(0, Dd / 2 + 2.5);
  const main = out.rooms.find(x => /washitsu/.test(x.name)) || out.rooms[1] || out.rooms[0];
  return Object.assign(out, {
    parts: F.parts, doors: [doorRec],
    foot: { u0: -Wd / 2, u1: Wd / 2, v0: -Dd / 2, v1: Dd / 2 + (engawa ? 0.9 : 0) },
    goals: { door: [ax, padY, az], front: [fx, padY, fz], center: main.center },
    anchors: [
      { id: `${b.id}.door`, type: 'door', at: [r3(dx), r3(padY), r3(dz)], rotY: b.rot || 0, width: door.w, height: door.h, kind: 'sliding', handle: { side: 'right', height: 0.95 }, approach: 0.6, auto: true },
      ...(engawa ? [{ id: `${b.id}.engawa`, type: 'seat', at: [r3(engawa[0]), r3(padY), r3(engawa[1])], rotY: b.rot || 0, seatHeight: 0.4, depth: 0.9, kind: 'edge', auto: true }] : []),
    ],
  });
}

function houseCollapsed(b, padY, ctx) {
  const S = SPEC, F = frame(b, padY), [Wd, Dd] = b.footprint, T = S.wallT, r = childRng(ctx.seed, `building.${b.id}`);
  const sides = [['wallF', 0, Dd / 2 - T / 2, Wd, 'u'], ['wallB', 0, -Dd / 2 + T / 2, Wd, 'u'], ['wallL', -Wd / 2 + T / 2, 0, Dd - 2 * T, 'v'], ['wallR', Wd / 2 - T / 2, 0, Dd - 2 * T, 'v']];
  for (const [name, u, v, L, axis] of sides) {
    const n = Math.max(2, Math.round(L / 1.5)); let s = -L / 2;
    for (let i = 0; i < n; i++) {
      const len = L / n, h = r() < 0.25 ? 0 : range(r, 0.5, 2.2 * (1 - (b.decay || 0) * 0.5) + 0.3);
      if (h > 0) { const m = s + len / 2; if (axis === 'u') F.box(`${name}_${i}`, 'wall', 'plaster', u + m, v, len - 0.05, T, 0, h, { collide: true }); else F.box(`${name}_${i}`, 'wall', 'plaster', u, v + m, T, len - 0.05, 0, h, { collide: true }); }
      s += len;
    }
  }
  // 崩れた屋根：斜めに落ちた板（見た目）＋低い当たりの箱
  const p = F.box('roof_fallen', 'roof', 'roof', 0, -Dd * 0.1, Wd * 0.8, Dd * 0.75, 0.2, 0.15); p.tilt = 12; p.c[1] = r3(padY + 0.9);
  F.box('roof_fallen_col', 'col', 'none', 0, -Dd * 0.1, Wd * 0.8, Dd * 0.7, 0, 1.4, { collide: true, visible: false });
  const props = [];
  for (let i = 0; i < 4; i++) props.push({ kind: 'prop.beam', u: range(r, -Wd / 2, Wd / 2), v: Dd / 2 + range(r, 0.6, 1.6), rot: (b.rot || 0) + range(r, -40, 40), y: padY });
  const [fx, fz] = F.W(0, Dd / 2 + 2.5), [cx, cz] = F.W(0, 0);
  return { parts: F.parts, doors: [], rooms: [], props, outsideProps: true, foot: { u0: -Wd / 2, u1: Wd / 2, v0: -Dd / 2, v1: Dd / 2 }, goals: { front: [fx, padY, fz], center: [cx, padY, cz] }, anchors: [] };
}

function hokora(b, padY) {
  const F = frame(b, padY), PW = Math.max(...b.footprint) + 1.6, PH = 0.9, half = PW / 2, steps = 5, stepH = PH / steps, stepD = 0.45, SW = 1.6;
  F.box('kidan', 'platform', 'stone', 0, 0, PW, PW, -0.4, PH + 0.4, { walk: true });
  for (let k = 1; k <= steps; k++) F.box(`step${k}`, 'step', 'stone', 0, half + (steps - k + 0.5) * stepD, SW, stepD, -0.3, k * stepH + 0.3, { walk: true });
  F.box('honden', 'shrine', 'wood', 0, -half * 0.35, 1.2, 1.1, PH, 1.1, { collide: true });
  const p = SPEC.pitch * Math.PI / 180;
  for (const sgn of [1, -1]) { const q = F.box(`yane${sgn > 0 ? 'F' : 'B'}`, 'roof', 'roof', 0, -half * 0.35 + sgn * 0.45, 1.7, 0.95, PH + 1.1 + 0.18, 0.08); q.tilt = sgn * 30; }
  const tv = half + steps * stepD + 2.0;
  for (const s of [-1, 1]) F.box(`torii_hashira${s > 0 ? 'R' : 'L'}`, 'pillar', 'torii', s * 1.5, tv, 0.3, 0.3, 0, 3.2, { shape: 'cyl', collide: true });
  F.box('torii_kasagi', 'beam', 'torii', 0, tv, 4.2, 0.35, 3.2, 0.25);
  F.box('torii_nuki', 'beam', 'torii', 0, tv, 3.4, 0.2, 2.6, 0.15);
  for (const s of [-1, 1]) F.box(`touro${s > 0 ? 'R' : 'L'}`, 'lantern', 'stone', s * 1.8, half + steps * stepD + 0.5, 0.4, 0.4, 0, 1.2, { collide: true });
  const [sx, sz] = F.W(0, half + steps * stepD), [tx, tz] = F.W(0, half), [gx, gz] = F.W(0, half - 0.9), [cx, cz] = F.W(0, -half * 0.35);
  const stairs = { id: `${b.id}.steps`, obb: (() => { const [ox, oz] = F.W(0, half + steps * stepD / 2 + 0.5); return { cx: ox, cz: oz, hx: SW / 2 + 0.2, hz: steps * stepD / 2 + 0.5, rot: F.rot }; })() };
  return {
    parts: F.parts, doors: [], rooms: [], props: [], stairs: [stairs],
    foot: { u0: -half - 0.4, u1: half + 0.4, v0: -half - 0.4, v1: tv + 0.5 },
    goals: { front: [gx, padY + PH, gz], center: [cx, padY + PH, cz], door: null },
    anchors: [{ id: `${b.id}.steps`, type: 'stairs', from: [r3(sx), r3(padY), r3(sz)], to: [r3(tx), r3(padY + PH), r3(tz)], steps, stepHeight: r3(stepH), width: SW, rail: false, auto: true }],
  };
}

/** 建物の土台の OBB（足元＋margin） */
export function footObb(b, foot, margin = 0) {
  const rot = deg(b.rot || 0), cu = (foot.u0 + foot.u1) / 2, cv = (foot.v0 + foot.v1) / 2, [cx, cz] = toWorld(b.at[0], b.at[1], rot, cu, cv);
  return { cx, cz, hx: (foot.u1 - foot.u0) / 2 + margin, hz: (foot.v1 - foot.v0) / 2 + margin, rot };
}
/** 型の足元（土台を作る前に知りたい：kind ごとの大きさ） */
export function plannedFoot(b) {
  if (b.kind === 'hokora_small') { const half = (Math.max(...b.footprint) + 1.6) / 2; return { u0: -half - 0.4, u1: half + 0.4, v0: -half - 0.4, v1: half + 5 * 0.45 + 2.5 }; }
  const [Wd, Dd] = b.footprint; return { u0: -Wd / 2, u1: Wd / 2, v0: -Dd / 2, v1: Dd / 2 + (b.kind === 'jp_house_abandoned' ? 0.9 : 0) };
}

/** 建物 1 軒を組み立てる。型が無ければ null（gaps へ） */
export function planBuilding(b, padY, ctx = {}) {
  const K = KINDS[b.kind]; if (!K) return null;
  const o = K.make(b, padY, ctx);
  return Object.assign({ id: b.id, kind: b.kind, ja: K.ja, enterable: !!b.enterable && o.doors.length > 0, at: [r3(b.at[0]), r3(padY), r3(b.at[1])], rot: b.rot || 0, footprint: b.footprint, decay: b.decay ?? 0, padY: r3(padY), stairs: [] }, o, { obb: footObb(b, o.foot) });
}
