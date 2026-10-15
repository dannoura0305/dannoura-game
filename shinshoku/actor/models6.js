// フェーズ7 で増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自（参考画像の雰囲気だけ）。
// ・塗替（ぬりかえ・第6章A のボス）：町の夜の物が寄り集まった巨体。電柱の脚と変圧器のひざ、巻き上げたシャッターの腰、
//   シャッターを積んだ胴、胸の開いた変圧器（核）、街灯を束ねた冠（灯が目）、垂れた看板の顔、電線の腕（がいしの玉・先はほつれた線の筆）、
//   背に刺さった看板の板、紫の塗料が垂れる（加算の網）。流血の表現はしない。
// ・待人（まちびと）：古い外套の細い人影。頭は駅の時計（針の止まった文字盤・小さな帽子）。左手に懐中時計。
// ・当直（とうちょく・第6章B のボス）：夜勤の保全員が置き換わった大柄な人影。作業着（反射の帯）・作業帽と頭の作業灯（一つ目）・
//   計器の顔・右前腕と一体の大きなレンチ・左手と一体の点検表・背の配管と弁の輪（蒸気がもれる）・脚に絡むホース。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlas, UVR } from './skin.js';
import { humanBody, humanHead, glowEyes, xfm, torus } from './models.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chain(sb, prefix, parent, start, offs) { const names = []; let par = parent; offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; }); return names; }
const chainW = (sb, names) => sb.along(names.map((nm, i) => [i / (names.length - 1), nm]));
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();
/** 垂れる光（glow の組・加算）：根もとが明るく先が黒＝見えない */
function drip(sb, root, len, opt = {}) {
  const b = opt.bend || [0, -1, 0], w = opt.w || 0.02;
  const p1 = [root[0] + b[0] * len * 0.5, root[1] + b[1] * len * 0.5, root[2] + b[2] * len * 0.5], p2 = [root[0] + b[0] * len, root[1] + b[1] * len, root[2] + b[2] * len];
  return sb.strand([root, p1, p2], w, { flat: 0.6, taper: 0.7, bulge: 0.6, segs: 4, sides: 4, out: [0, 0, 1], group: 'glow', weights: opt.weights,
    color: (p, t) => (t > 0.92 ? 0x000000 : lerpC(opt.col ?? 0xd060ff, opt.col1 ?? 0x2a0838, Math.pow(t, 0.8))), oth: (p, t) => t });
}

// ───────────────────────── 塗替（第6章A のボス） ─────────────────────────
/** 足もとを原点・+z が前。高さ約 2.1（scale 12 で約 25m）。骨：nHip・nBody・nChest・nHead・脚 nLegL/R・腕 nArmL/R・尾 nTail0..2 */
export function buildNurikae() {
  const sb = new SkinBody(DIM), r = rng(7171);
  const POLE = 0x6e6862, POLE2 = 0x4e4a46, SHUT = 0x9aa0a8, SHUT2 = 0x5e646c, TR = 0x4e5a62, CABLE = 0x18141e, INS = 0xe8e4dc, D = 0x0e0a14;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('nRoot', null, 0, 0, 0); B('nHip', 'nRoot', 0, 1.0, 0); B('nBody', 'nHip', 0, 0.36, -0.04); B('nChest', 'nBody', 0, 0.34, 0.08); B('nHead', 'nChest', 0, 0.3, 0.14);
  const legs = [['L', 1], ['R', -1]].map(([s, sx]) => ({ s, sx, n: chain(sb, 'nLeg' + s, 'nHip', [sx * 0.2, -0.04, 0], [[0, 0, 0], [sx * 0.06, -0.48, 0.06], [0, -0.46, -0.06]]) }));
  const arms = [['L', 1], ['R', -1]].map(([s, sx]) => ({ s, sx, n: chain(sb, 'nArm' + s, 'nChest', [sx * 0.3, 0.2, 0.02], [[0, 0, 0], [sx * 0.16, -0.26, 0.1], [sx * 0.06, -0.34, 0.12], [0, -0.34, 0.08], [0, -0.22, 0.06]]) }));
  const tails = [0, 1, 2].map(i => chain(sb, 'nTail' + i + '_', 'nHip', [(i - 1) * 0.12, 0.02, -0.16], [[0, 0, 0], [(i - 1) * 0.08, -0.2, -0.24], [(i - 1) * 0.06, -0.3, -0.22], [(i - 1) * 0.04, -0.3, -0.14]]));
  const W = n => sb.W(n), rw = n => sb.rigid(n);
  // 脚：電柱（足場のボルト）・変圧器のひざ・根のように広がる足の線
  for (const L of legs) {
    const P = L.n.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.04, 0.02)));
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.055 - i * 0.006, 0.055 - i * 0.006] })), { sides: 10, sub: 2, weights: chainW(sb, L.n), color: (p, t) => (Math.sin(p.y * 60) > 0.92 ? POLE2 : POLE), capStart: true, capEnd: true, oth: 0.9 });
    const k = W(L.n[1]);
    sb.cyl([k.x + L.sx * 0.02, k.y + 0.02, k.z + 0.03], 0.1, 0.1, 0.16, { weights: rw(L.n[1]), color: TR, seg: 12 });
    sb.box([k.x + L.sx * 0.02, k.y + 0.1, k.z + 0.03], [0.12, 0.03, 0.12], { weights: rw(L.n[1]), color: 0x3a3e42 });
    for (let i = 0; i < 3; i++) sb.cyl([k.x + L.sx * 0.02 + (i - 1) * 0.05, k.y + 0.14, k.z + 0.03], 0.012, 0.016, 0.06, { weights: rw(L.n[1]), color: INS, seg: 6 });
    for (let i = 0; i < 6; i++) sb.box([k.x + L.sx * 0.06, k.y + 0.28 - i * 0.06, k.z - 0.02], [0.05, 0.01, 0.01], { weights: rw(L.n[0]), color: 0x8a8a90, oth: 0.3 });   // 足場のボルト
    const f = P[P.length - 1];
    for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.4 + (L.sx > 0 ? 0.2 : -0.2); sb.strand([[f.x, f.y + 0.03, f.z], [f.x + Math.sin(a) * 0.1, 0.02, f.z + Math.cos(a) * 0.1], [f.x + Math.sin(a) * 0.2, 0.0, f.z + Math.cos(a) * 0.2]], 0.018, { base: CABLE, weights: rw(L.n[2]), segs: 4, sides: 4, out: [0, 1, 0] }); }
  }
  // 腰：巻き上げたシャッター（3 本の横の筒・縞）
  for (let i = 0; i < 3; i++) sb.tube([-1, 1].map(k => ({ c: [k * 0.3, 1.0 - i * 0.07 + (i === 1 ? 0.03 : 0), 0.05 * (i - 1)], r: [0.07, 0.07] })), { sides: 12, weights: rw('nHip'), color: p => (Math.sin(Math.atan2(p.y - 1, p.z) * 9) > 0 ? SHUT : SHUT2), capStart: true, capEnd: true, oth: 0.8, ref: [0, 1, 0] });
  // 胴：シャッターを積んだ柱（溝の帯）・少し前かがみ
  const hb = W('nBody'), hc0 = W('nChest');
  sb.box([0, (hb.y + hc0.y) / 2 - 0.04, hb.z], [0.5, 0.46, 0.34], { weights: sb.along([[0, 'nBody'], [1, 'nChest']]), color: SHUT });
  for (let i = 0; i < 10; i++) { const y = hb.y - 0.2 + i * 0.045; sb.box([0, y, hb.z + 0.172], [0.48, 0.008, 0.01], { weights: y > hc0.y - 0.1 ? rw('nChest') : rw('nBody'), color: SHUT2, oth: 0 }); sb.box([0, y, hb.z - 0.172], [0.48, 0.008, 0.01], { weights: y > hc0.y - 0.1 ? rw('nChest') : rw('nBody'), color: SHUT2, oth: 0 }); }
  sb.box([0, hb.y + 0.22, hb.z + 0.02], [0.56, 0.06, 0.4], { weights: rw('nBody'), color: 0x3a3e46 });
  // 胸：開いた変圧器（扉が左右に開き、中のコイルが光る＝核）
  const ch = W('nChest');
  sb.box([0, ch.y + 0.04, ch.z + 0.02], [0.46, 0.3, 0.32], { weights: rw('nChest'), color: TR });
  for (const sx of [1, -1]) sb.box([sx * 0.27, ch.y + 0.04, ch.z + 0.2], [0.14, 0.28, 0.02], { rot: [0, sx * 0.9, 0], weights: rw('nChest'), color: 0x5e6a72 });
  sb.box([0, ch.y + 0.04, ch.z + 0.17], [0.3, 0.24, 0.02], { weights: rw('nChest'), color: D, oth: 0 });
  for (let i = 0; i < 4; i++) sb.cyl([(i - 1.5) * 0.065, ch.y + 0.04, ch.z + 0.16], 0.028, 0.028, 0.2, { weights: rw('nChest'), color: 0xc060ff, group: 'glow', seg: 8 });
  for (let i = 0; i < 3; i++) sb.cyl([(i - 1) * 0.12, ch.y + 0.22, ch.z + 0.02], 0.02, 0.026, 0.08, { weights: rw('nChest'), color: INS, seg: 6 });
  const core = new THREE.Object3D(); core.position.set(0, 0.04, 0.2); sb.B.nChest.add(core);
  // 背の看板（刺さった板・色とりどり）
  const SIG = [0xd84a3a, 0x3a8ad8, 0xd8b03a, 0x5ac87a, 0xe86ab0, 0xf0f0e0];
  for (let i = 0; i < 6; i++) { const y = hb.y - 0.1 + i * 0.09, sx = i % 2 ? -1 : 1; sb.box([sx * (0.12 + r() * 0.1), y + 0.1, hb.z - 0.24 - r() * 0.06], [0.22 + r() * 0.1, 0.14, 0.02], { rot: [-0.5 - r() * 0.4, sx * (0.3 + r() * 0.3), sx * 0.3], weights: y > hc0.y - 0.1 ? rw('nChest') : rw('nBody'), color: SIG[i % SIG.length] }); }
  // 頭：街灯を束ねた冠（5 本・先の灯が目）と、垂れた看板の顔（紫の塗料がしたたる）
  const hd = W('nHead'), eyes = [];
  sb.box([0, hd.y, hd.z], [0.28, 0.12, 0.2], { weights: rw('nHead'), color: 0x3a3a44 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 4 - 0.5) * 1.9, base = [Math.sin(a) * 0.1, hd.y + 0.05, hd.z + Math.cos(a) * 0.04 - 0.02];
    const top = [Math.sin(a) * 0.3, hd.y + 0.32 + Math.cos(a) * 0.12, hd.z + 0.04], tip = [Math.sin(a) * 0.36, hd.y + 0.3 + Math.cos(a) * 0.1, hd.z + 0.14];
    sb.strand([base, [Math.sin(a) * 0.18, hd.y + 0.26, hd.z - 0.02], top, tip], 0.022, { base: POLE, weights: rw('nHead'), segs: 6, sides: 6, taper: 0.2, bulge: 0, out: [0, 0, 1], oth: 0.6 });
    sb.box([tip[0], tip[1] - 0.012, tip[2]], [0.08, 0.025, 0.06], { weights: rw('nHead'), color: 0x2a2a30 });
    sb.blob([tip[0], tip[1] - 0.04, tip[2]], [0.035, 0.022, 0.03], { weights: rw('nHead'), color: 0xff8ad8, w: 8, h: 6, oth: 0 });
    const e = new THREE.Object3D(); e.position.set(tip[0] - hd.x, tip[1] - 0.05 - hd.y, tip[2] - hd.z); sb.B.nHead.add(e); eyes.push(e);
  }
  sb.box([0, hd.y - 0.12, hd.z + 0.13], [0.3, 0.2, 0.02], { rot: [0.25, 0, 0.06], weights: rw('nHead'), color: 0xe8e2d4 });
  sb.box([0, hd.y - 0.12, hd.z + 0.145], [0.24, 0.035, 0.005], { rot: [0.25, 0, 0.06], weights: rw('nHead'), color: 0x6a1a8a, oth: 0 });
  for (let i = 0; i < 5; i++) drip(sb, [-0.11 + i * 0.055, hd.y - 0.2, hd.z + 0.15], 0.14 + r() * 0.1, { w: 0.016, weights: rw('nHead') });
  // 腕：電線（がいしの玉）・先はほつれた線の筆（光る塗料）
  for (const A of arms) {
    const P = A.n.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.12, 0.04)));
    sb.tube(P.map(c => ({ c: [c.x, c.y, c.z], r: [0.032, 0.032] })), { sides: 7, sub: 2, weights: chainW(sb, A.n), color: CABLE, capStart: true, capEnd: true, oth: 0.7 });
    for (let k = 1; k < P.length - 1; k++) for (let j = 0; j < 2; j++) { const q = P[k].clone().lerp(P[k + 1], 0.3 + j * 0.35); sb.cyl([q.x, q.y, q.z], 0.05, 0.05, 0.03, { weights: rw(A.n[Math.min(A.n.length - 1, k)]), color: INS, seg: 8 }); }
    sb.cyl([P[0].x, P[0].y + 0.02, P[0].z], 0.07, 0.08, 0.1, { weights: rw('nChest'), color: TR, seg: 10 });
    const e = P[P.length - 1];
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; drip(sb, [e.x, e.y + 0.04, e.z], 0.2 + r() * 0.12, { bend: [Math.sin(a) * 0.4, -1, Math.cos(a) * 0.4], w: 0.014, col: 0xe070ff, weights: rw(A.n[A.n.length - 1]) }); }
  }
  // 尾：絡まった電線（揺れる）
  const sway = [];
  tails.forEach((nm, i) => { const P = nm.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.08, -0.06))); sb.tube(P.map((c, k) => ({ c: [c.x, c.y, c.z], r: [0.028 - k * 0.003, 0.028 - k * 0.003] })), { sides: 6, weights: chainW(sb, nm), color: CABLE, capStart: true, capEnd: true, oth: 0.6 }); sway.push(...nm.map((n, k) => ({ b: sb.B[n], k: 10 + k * 2, d: 2.6, gain: 0.3, baseX: 0, amp: 0.18 + k * 0.04, freq: 0.5 + i * 0.17, ph: i * 1.3 + k * 0.5 }))); });
  // 胴からしたたる塗料
  for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2; drip(sb, [Math.sin(a) * 0.24, hb.y - 0.1 + r() * 0.4, hb.z + Math.cos(a) * 0.17], 0.18 + r() * 0.16, { w: 0.02, weights: rw('nBody') }); }
  const m = sb.build(null, { rim: 0.45, rimColor: 0xd070ff, outline: 0.012, outlineColor: 0x060408, flameAmp: 0.025, flameK: 1.3 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  return Object.assign(m, { provisional: true, kind: 'nurikae', height: 2.1, bodyR: 0.5, sway, eyes, core, legs, arms, tails, G: sb.B });
}

// ───────────────────────── 待人（まちびと） ─────────────────────────
/** 古い外套・細い体・頭は駅の時計（文字盤に小さな光る目）・小さな帽子・左手に懐中時計 */
export function buildMachibito(seed = 1) {
  const d = Object.assign({}, DIM, { leg: 0.9, thigh: 0.42, shin: 0.42, neck: 0.26, upperArm: 0.3, lowerArm: 0.28, shoulderX: 0.15, headR: 0.11, hipX: 0.08 });
  const sb = new SkinBody(d), R = d.headR;
  const COAT = [0x4a3a30, 0x3a3e4a, 0x4a4436][seed % 3], COAT2 = 0x2a221e, SK = 0xc8c0b8;
  humanBody(sb, {
    torso: [[0, 0.1, 0.075, 0], [0.12, 0.118, 0.082, 0], [0.32, 0.11, 0.078, 0], [0.55, 0.118, 0.08, 0.004], [0.8, 0.134, 0.084, 0], [0.93, 0.1, 0.066, 0], [1, 0.044, 0.042, 0]],
    torsoColor: p => (Math.abs(p.x) < 0.01 && p.z > 0.05 ? COAT2 : COAT), torsoFold: 1,
    armR: [0.04, 0.034, 0.028], armColor: (t) => (t > 0.92 ? SK : COAT), legR: [0.05, 0.038, 0.038, 0.028], legColor: () => 0x2a2828,
    skin: SK, shoe: 0x1a1414, sole: 0x0a0808, neckR: 0.028, hand: 1.05, cuff: COAT2,
  });
  // 外套の裾（ひざ下まで）
  const hy = sb.W('hips').y;
  const hemW = p => { const k = Math.max(0, Math.min(1, (hy - p.y) / 0.4)) * 0.6; const wl = Math.max(0, Math.min(1, (p.x + 0.03) / 0.09)) * k, wr = Math.max(0, Math.min(1, (0.03 - p.x) / 0.09)) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube([[hy + 0.02, 0.12, 0.09], [hy - 0.2, 0.16, 0.12], [hy - 0.42, 0.18, 0.13], [hy - 0.52, 0.185, 0.135]].map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz] })), { sides: 18, sub: 2, weights: hemW, color: (p, t) => (t > 0.9 ? COAT2 : COAT), capStart: false, capEnd: false, oth: 0.85, fold: 1.2 });
  // 頭：駅の時計（文字盤は前・縁は真鍮）・小さな帽子
  const h = sb.W('head'), hw = sb.rigid('head'), cy = h.y + R * 0.9;
  sb.cyl([h.x, cy, h.z], R * 1.25, R * 1.25, R * 0.42, { rot: [Math.PI / 2, 0, 0], weights: hw, color: 0xb8903a, seg: 24 });
  sb.cyl([h.x, cy, h.z + R * 0.06], R * 1.1, R * 1.1, R * 0.36, { rot: [Math.PI / 2, 0, 0], weights: hw, color: 0x2a2620, seg: 24 });
  sb.card([h.x, cy, h.z + R * 0.25], [R * 2.1, R * 2.1], UVR(0, 0, 128, 128), { weights: hw });
  sb.cyl([h.x, cy + R * 1.3, h.z - R * 0.02], R * 0.9, R * 0.95, R * 0.12, { weights: hw, color: 0x1a1618, seg: 16 });
  sb.cyl([h.x, cy + R * 1.55, h.z - R * 0.02], R * 0.6, R * 0.66, R * 0.45, { weights: hw, color: 0x241e20, seg: 16 });
  // 左手の懐中時計（鎖）
  const lh = sb.W('leftHand'), lw = sb.rigid('leftHand');
  sb.cyl([lh.x, lh.y - 0.06, lh.z + 0.03], 0.035, 0.035, 0.014, { rot: [Math.PI / 2, 0, 0], weights: lw, color: 0xc8a050, seg: 12 });
  sb.strand([[lh.x, lh.y - 0.03, lh.z], [lh.x - 0.04, lh.y + 0.06, lh.z + 0.02], [-0.06, sb.W('hips').y + 0.06, 0.09]], 0.004, { base: 0xc8a050, weights: sb.along([[0, 'leftHand'], [1, 'hips']]), segs: 4, sides: 3 });
  const tex = faceAtlas(g => {
    g.save(); g.translate(64, 64); g.fillStyle = '#efe8d4'; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill(); g.strokeStyle = '#3a3026'; g.lineWidth = 4; g.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 2 : 5; g.beginPath(); g.moveTo(Math.sin(a) * 50, -Math.cos(a) * 50); g.lineTo(Math.sin(a) * 58, -Math.cos(a) * 58); g.stroke(); }
    g.lineCap = 'round'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(-0.5) * 30, -Math.cos(-0.5) * 30); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(2.4) * 44, -Math.cos(2.4) * 44); g.stroke();
    g.fillStyle = '#2a0a2a'; for (const x of [-20, 20]) { g.beginPath(); g.ellipse(x, 14, 8, 4, 0, 0, 7); g.fill(); }
    g.restore();
  });
  const m = sb.build(tex, { rim: 0.3, rimColor: 0xd8c8a0, outline: 0.01, outlineColor: 0x08060a, faceEmissive: 0x1a1612 });
  const eyeGlow = glowEyes(m, m.J, [[R * 0.36, R * 0.62, R * 0.32], [-R * 0.36, R * 0.62, R * 0.32]]);
  return Object.assign(m, { height: 1.86, provisional: true, kind: 'machibito', bodyR: 0.32, eyeGlow });
}

// ───────────────────────── 当直（第6章B のボス） ─────────────────────────
/** 大柄な作業着の人影（高さ約 2.3m）。計器の顔・作業帽と作業灯・右前腕のレンチ・左手の点検表・背の配管と弁 */
export function buildTouchoku() {
  const k = 1.3;
  const d = Object.assign({}, DIM, { leg: 0.86 * k, thigh: 0.4 * k, shin: 0.385 * k, spine: 0.1 * k, chest: 0.22 * k, neck: 0.21 * k, headJ: 0.045 * k, shoulderX: 0.2 * k, shoulderY: 0.19 * k, upperArm: 0.29 * k, lowerArm: 0.26 * k, hipX: 0.1 * k, headR: 0.13 * k });
  const sb = new SkinBody(d), R = d.headR;
  const JK = 0x2a3448, JK2 = 0x1a2234, REF = 0xd8dce0, PANTS = 0x2a2e36, SK = 0x8a8e9a;
  const jacket = p => (Math.abs(p.y - 1.62) < 0.03 || Math.abs(p.y - 1.42) < 0.025 ? REF : Math.abs(p.x) < 0.012 && p.z > 0.05 ? JK2 : JK);
  humanBody(sb, {
    torso: [[0, 0.14, 0.11, 0], [0.12, 0.16, 0.12, 0], [0.32, 0.16, 0.12, 0], [0.55, 0.18, 0.13, 0.01], [0.8, 0.21, 0.14, 0], [0.93, 0.16, 0.11, 0], [1, 0.06, 0.055, 0]],
    torsoColor: jacket, torsoFold: 0.9,
    armR: [0.06, 0.05, 0.04], armColor: (t, w) => (w === 'lower' && Math.abs(t - 0.4) < 0.06 ? REF : JK), legR: [0.075, 0.058, 0.056, 0.042], legColor: (t) => (Math.abs(t - 0.62) < 0.04 ? REF : PANTS),
    skin: SK, shoe: 0x1a1a1e, sole: 0x0a0a0c, neckR: 0.045, hand: 1.4, cuff: JK2, shoeW: 1.3,
  });
  humanHead(sb, { R, skin: 0x6a6e7a, faceless: true, ears: false, jaw: 0.4 });
  const hc = sb.hc, hw = sb.rigid('head');
  // 作業帽（黄色）・つば・作業灯（一つ目）
  sb.blob([hc.x, hc.y + R * 0.35, hc.z - R * 0.02], [R * 1.12, R * 0.82, R * 1.18], { weights: hw, color: 0xd8b030, w: 18, h: 10, keep: c => c.y > hc.y + R * 0.18 });
  sb.box([hc.x, hc.y + R * 0.2, hc.z + R * 1.1], [R * 1.4, R * 0.08, R * 0.5], { weights: hw, color: 0xc8a028 });
  sb.cyl([hc.x, hc.y + R * 0.62, hc.z + R * 1.08], R * 0.26, R * 0.3, R * 0.3, { rot: [Math.PI / 2, 0, 0], weights: hw, color: 0x2a2a2e, seg: 12 });
  sb.cyl([hc.x, hc.y + R * 0.62, hc.z + R * 1.24], R * 0.2, R * 0.2, R * 0.04, { rot: [Math.PI / 2, 0, 0], weights: hw, color: 0xfff0c0, seg: 12 });
  // 顔：3 つの計器（圧力計の文字盤）
  for (const [x, y, s] of [[-0.42, -0.08, 0.6], [0.38, -0.02, 0.5], [0, -0.55, 0.42]]) {
    sb.cyl([hc.x + x * R, hc.y + y * R, hc.z + R * 0.96], R * s * 0.55, R * s * 0.55, R * 0.18, { rot: [Math.PI / 2, 0, 0], weights: hw, color: 0x8a8a90, seg: 14 });
    sb.card([hc.x + x * R, hc.y + y * R, hc.z + R * 1.06], [R * s * 0.95, R * s * 0.95], UVR(0, 0, 128, 128), { weights: hw });
  }
  // 右前腕のレンチ（柄が前腕に沿い、口が拳の先）
  const rl = sb.W('rightLowerArm'), rh = sb.W('rightHand'), rlw = sb.rigid('rightLowerArm'), rhw = sb.rigid('rightHand');
  sb.box([rl.x - 0.02, (rl.y + rh.y) / 2, rl.z + 0.06], [0.07, rl.y - rh.y + 0.1, 0.06], { weights: rlw, color: 0x9a3a2a });
  sb.box([rh.x, rh.y - 0.16, rh.z + 0.06], [0.1, 0.22, 0.08], { weights: rhw, color: 0x8a8e94 });
  sb.box([rh.x, rh.y - 0.3, rh.z + 0.12], [0.12, 0.06, 0.2], { weights: rhw, color: 0x9aa0a6 });
  sb.box([rh.x, rh.y - 0.3, rh.z + 0.0], [0.12, 0.06, 0.07], { weights: rhw, color: 0x7a7e84 });
  sb.cyl([rh.x, rh.y - 0.2, rh.z + 0.06], 0.035, 0.035, 0.11, { rot: [0, 0, Math.PI / 2], weights: rhw, color: 0x5a5e64, seg: 8 });
  // 左手と一体の点検表（紙がめくれる）
  const lh = sb.W('leftHand'), lhw = sb.rigid('leftHand');
  sb.box([lh.x + 0.02, lh.y - 0.1, lh.z + 0.08], [0.02, 0.3, 0.22], { weights: lhw, color: 0x6a4a2a });
  sb.card([lh.x + 0.035, lh.y - 0.1, lh.z + 0.08], [0.2, 0.27], UVR(128, 0, 256, 128), { rot: [0, Math.PI / 2, 0], weights: lhw });
  // 背の配管・弁の輪（赤）・蒸気（glow）
  const ch = sb.W('chest'), cw = sb.rigid('chest');
  for (const [x, h2] of [[-0.1, 0.5], [0.06, 0.62], [0.18, 0.44]]) { sb.tube([{ c: [x, ch.y - 0.16, -0.17], r: [0.035, 0.035] }, { c: [x, ch.y + h2 * 0.6, -0.19], r: [0.035, 0.035] }, { c: [x + 0.04, ch.y + h2, -0.12], r: [0.03, 0.03] }], { sides: 8, weights: cw, color: 0x7a7e86, capStart: true, capEnd: true, oth: 0.6 }); }
  for (const [x, y] of [[-0.1, 0.2], [0.18, 0.12]]) torus(sb, 0.07, 0.012, xfm([x, ch.y + y, -0.24], [0, 0, 0]), { weights: cw, color: 0xc83a2a, oth: 0.3 });
  sb.box([0, ch.y + 0.02, -0.18], [0.36, 0.34, 0.08], { weights: cw, color: 0x3a3e46 });
  for (let i = 0; i < 6; i++) drip(sb, [-0.12 + (i % 3) * 0.14, ch.y + 0.3 + (i > 2 ? 0.1 : 0), -0.16], 0.24 + (i % 2) * 0.1, { bend: [0, 1, -0.3], w: 0.03, col: 0xd8e0ff, col1: 0x202838, weights: cw });
  // 縫い目のような紫の筋（置き換わった所）
  for (let i = 0; i < 5; i++) drip(sb, [Math.sin(i * 2.1) * 0.15, ch.y - 0.25 + i * 0.08, Math.cos(i * 2.1) * 0.12], 0.12, { bend: [Math.sin(i) * 0.5, -1, 0.2], w: 0.012, col: 0x9a50ff, weights: i > 2 ? cw : sb.rigid('spine') });
  // 脚に絡むホース
  const sway = [];
  for (const [side, sx] of [['left', 1], ['right', -1]]) { const ul = sb.W(side + 'UpperLeg'), ll = sb.W(side + 'LowerLeg'); sb.strand([[ul.x + sx * 0.06, ul.y - 0.05, ul.z - 0.05], [ll.x + sx * 0.09, ll.y + 0.05, ll.z + 0.04], [ll.x + sx * 0.05, ll.y - 0.3, ll.z + 0.07]], 0.022, { base: 0x1a1a1a, weights: sb.along([[0, side + 'UpperLeg'], [1, side + 'LowerLeg']]), segs: 5, sides: 5, out: [sx, 0, 0] }); }
  const tex = faceAtlas(g => {
    g.save(); g.translate(64, 64); g.fillStyle = '#f2f0e8'; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 6; g.stroke();
    g.strokeStyle = '#c83a2a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 48, Math.PI * 0.15, Math.PI * 0.45); g.stroke();
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + i / 10 * Math.PI * 1.5; g.beginPath(); g.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); g.stroke(); }
    g.lineWidth = 5; g.lineCap = 'round'; g.strokeStyle = '#1a1a1a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(0.4) * 44, Math.sin(0.4) * 44); g.stroke(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill();
    g.restore();
    g.fillStyle = '#f4f0e2'; g.fillRect(132, 4, 120, 120); g.strokeStyle = '#3a3a40'; g.lineWidth = 2; g.font = 'bold 14px monospace'; g.fillStyle = '#2a2a30'; g.fillText('点検表', 160, 22);
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(140, 34 + i * 13); g.lineTo(244, 34 + i * 13); g.stroke(); g.fillRect(142, 28 + i * 13, 6, 6); }
  });
  const m = sb.build(tex, { rim: 0.4, rimColor: 0x9ab0ff, outline: 0.012, outlineColor: 0x06060a, faceEmissive: 0x101014, flameAmp: 0.03, flameK: 1.0 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  const eyeGlow = glowEyes(m, m.J, [[0, R * 0.62 + R * 0.9, R * 1.3]]);
  const weak = new THREE.Object3D(); weak.position.set(0, 0.02, -0.26); sb.B.chest.add(weak);
  return Object.assign(m, { height: 2.3, provisional: true, kind: 'touchoku', bodyR: 0.5, sway, eyeGlow, weak, weakColor: 0xd8e0ff });
}
