// 主要キャラクター v2：だんのうら（紫の姿・白髪形態）・相棒・娘。部品は hero.js、陰影の値は charcfg.js（キャラクターの設定 *.character.json と同じ値）。
// 返す形は今のモデル（models.js）と同じ：{ root, J, X, mesh, faceMesh, outline, mats, weapons, tail, coat, sway, eyes, mouth, faceTex, setExpr, height, kind, update, springs, face }
import * as THREE from 'three';
import { SkinBody, DIM, UVR, detail } from './skin.js';
import { buildWeaponBones, xfm, torus } from './models.js';
import { addHelpers, updateHelpers, headPoint, heroHead, hairCap2, lock, heroBody, coatShell, coatTrim, shellZ, heroFaceTex, boneChain, chainWeights, bodyColliders, rng, MOUTH_SLOTS } from './hero.js';
import { SHADER_CFG } from './charcfg.js';
import { SpringBones } from '../../charkit/motion/spring.js';
import { legDims } from './anim8.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/** 仕上げ：網を作り、補助の骨・揺れ物を毎フレーム動かす update を付ける */
function finish(sb, tex, buildOpt, extra, springDef) {
  const m = sb.build(tex, buildOpt);
  const helpers = sb.helpers || [];
  const low = detail() < 0.9;
  const springs = springDef ? new SpringBones(springDef.chains(sb.B), springDef.colliders(sb.B), { hz: low ? 30 : 60, mainOnly: low }) : null;
  const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
  const prevUpdate = extra.update;
  const out = Object.assign(m, extra, {
    springs, helpers, mouthSlots: MOUTH_SLOTS, talkingMouth: false, legDims: legDims(sb.d), legScale: sb.d.thigh / 0.4,
    /** 姿勢を当てた後に毎フレーム（補助の骨・揺れ物） */
    update(dt) {
      updateHelpers(sb.B, helpers);
      if (springs) { m.root.updateWorldMatrix(true, false); m.root.matrixWorld.decompose(wp, wq, ws); springs.update(dt, wp, wq); }
      if (prevUpdate) prevUpdate(dt);
    },
  });
  return out;
}

// ───────────────────────── だんのうら（紫の姿） ─────────────────────────
/**
 * 男性・164cm・細身の若い男性。紫の長い髪のポニーテール・小さなピンクのシルクハット・黒い四角いめがね・ピンクの花の髪飾り・
 * ラベンダーのフードつきの上着（前は開く）・ピンクと白のしまのシャツ・暗い格子のズボン・猫の顔のリュック・背の刀（武器の骨）
 */
export function buildDannouraV2() {
  const d = Object.assign({}, DIM);
  const sb = new SkinBody(d), R = d.headR, W = n => sb.W(n);
  addHelpers(sb);
  const SKIN = 0xffe3d6, JK = 0xe8e0f6, JK2 = 0xc2afe8, JKD = 0x8d76c6, SH_W = 0xfbf6fb, PANTS = 0x2c2436, SHOE = 0x2a2032, SOLE = 0xf1ecf6, PINK = 0xf27ab6;
  // ── 体（シャツ・ズボン・袖・靴）──
  const torso = [[0.9, 0.124, 0.088, 0], [0.97, 0.12, 0.084, 0.002], [1.04, 0.124, 0.086, 0.004], [1.12, 0.134, 0.09, 0.006], [1.2, 0.144, 0.093, 0.006], [1.27, 0.149, 0.091, 0.002], [1.32, 0.142, 0.084, -0.004], [1.355, 0.108, 0.07, -0.006], [1.385, 0.05, 0.045, 0]];
  heroBody(sb, {
    torso, torsoMat: 'cloth_shirt', torsoColor: SH_W, chestFlat: 0.9,
    pelvis: [[0.76, 0.098, 0.084, 0], [0.8, 0.124, 0.092, -0.004], [0.86, 0.13, 0.094, -0.004], [0.92, 0.127, 0.09, 0], [0.95, 0.124, 0.088, 0]], pantsMat: 'cloth_pants', pantsColor: PANTS,
    arm: { upper: [[0, 0.05], [0.25, 0.05], [0.6, 0.048], [0.9, 0.046], [1, 0.045]], lower: [[0, 0.046], [0.3, 0.047], [0.65, 0.044], [0.85, 0.042], [1, 0.041]], mat: 'cloth_jacket', color: () => JK, cuff: { color: JK2 }, fold: 0.55 },
    hand: { k: 1.08, color: SKIN },
    leg: { upper: [[0, 0.082, 0.086], [0.3, 0.075, 0.078], [0.65, 0.066, 0.068], [1, 0.057, 0.06]], lower: [[0, 0.057, 0.06], [0.25, 0.058, 0.061], [0.6, 0.053, 0.055], [0.9, 0.056, 0.058], [1, 0.06, 0.062]], mat: 'cloth_pants', color: () => PANTS, hemY: 0.075, cuff: { color: 0x3a3048 }, fold: 0.45 },
    shoe: { upper: SHOE, sole: SOLE, toe: 0x3a3044, lace: 0xf4f0fa, collar: 0x1c1622, deco: PINK, len: 0.25, wid: 0.05 },
    skin: SKIN, neckR: 0.036, adamsApple: true,
  });
  // ベルト（前の開きから見える）
  sb.tube([{ c: [0, 0.925, 0], r: [0.13, 0.093] }, { c: [0, 0.95, 0], r: [0.128, 0.091] }], { sides: 28, weights: sb.rigid('hips'), color: 0x1e1824, mat: 'cloth', capStart: false, capEnd: false, oth: 0.5 });
  sb.box([0, 0.937, 0.093], [0.032, 0.022, 0.008], { weights: sb.rigid('hips'), color: 0xb8b0c8, mat: 'metal', oth: 0.2 });
  // ── 上着（前の開いたフードつき）──
  const jr = [[0.8, 0.142, 0.106, -0.004], [0.86, 0.14, 0.104, -0.004], [0.95, 0.136, 0.1, 0], [1.04, 0.138, 0.1, 0.004], [1.12, 0.148, 0.104, 0.006], [1.2, 0.158, 0.106, 0.004], [1.27, 0.16, 0.1, 0], [1.315, 0.164, 0.094, -0.006], [1.352, 0.15, 0.084, -0.01], [1.38, 0.1, 0.068, -0.012], [1.398, 0.068, 0.058, -0.01]];
  const open = y => 0.05 + Math.max(0, y - 1.24) * 0.32;
  const jw = coatShell(sb, { rings: jr, open, color: (p, t) => (p.y < 0.83 ? JK2 : JK), mat: 'cloth_jacket', fold: 0.3 });
  coatTrim(sb, jr, open, 0.8, 1.365, { color: JK2, mat: 'cloth_jacket', weights: jw, w: 0.011, t: 0.006 });
  // ポケット（前の左右）
  for (const sx of [1, -1]) { const x = sx * 0.1, y = 0.93; sb.box([x, y, shellZ(jr, y, Math.abs(x)) + 0.003], [0.075, 0.08, 0.006], { rot: [0.06, sx * 0.62, 0], weights: jw, color: JK2, mat: 'cloth_jacket', oth: 0.35 }); }
  // フード（首の後ろに下ろしている）：首の周りの巻き＋背中の袋
  const hood = [];
  for (let i = 0; i <= 14; i++) { const a = lerp(-1.75, 1.75, i / 14), back = Math.max(0, -Math.cos(a)); hood.push({ c: [Math.sin(a) * (0.088 + 0.008 * back), 1.384 + 0.006 * Math.cos(a) - 0.012 * back, -Math.cos(a) * 0.074 - 0.012], r: [0.016 + 0.012 * back, 0.016] }); }
  sb.tube(hood, { sides: 8, weights: p => [[sb.bi('chest'), 0.8], [sb.bi('neck'), 0.2]], color: JK, mat: 'cloth_jacket', capStart: true, capEnd: true, oth: 0.7, ref: [0, 1, 0] });
  sb.blob([0, 1.285, -0.125], [0.124, 0.098, 0.046], { rot: [0.32, 0, 0], deform: v => { if (v.z > 0) v.z *= 0.4; v.x *= 1 - 0.25 * Math.max(0, -v.y); return v; }, weights: sb.rigid('chest'), color: JK, mat: 'cloth_jacket', w: 20, h: 14, oth: 0.85, fold: 0.5 });
  sb.blob([0, 1.33, -0.117], [0.092, 0.042, 0.03], { rot: [0.45, 0, 0], weights: sb.rigid('chest'), color: JKD, mat: 'cloth_jacket', w: 14, h: 8, oth: 0 });
  // ひも（ピンク）
  for (const sx of [1, -1]) {
    const x0 = sx * 0.052, z0 = shellZ(jr, 1.35, 0.052) + 0.008;
    sb.tube([{ c: [x0, 1.352, z0], r: [0.0035, 0.0035] }, { c: [sx * 0.056, 1.27, shellZ(jr, 1.27, 0.056) + 0.008], r: [0.0035, 0.0035] }, { c: [sx * 0.058, 1.19, shellZ(jr, 1.19, 0.058) + 0.008], r: [0.0035, 0.0035] }], { sides: 5, weights: sb.rigid('chest'), color: PINK, mat: 'acc', capStart: false, capEnd: false, oth: 0.3 });
    sb.cyl([sx * 0.058, 1.178, shellZ(jr, 1.18, 0.058) + 0.008], 0.005, 0.005, 0.02, { weights: sb.rigid('chest'), color: 0xf6f0ff, mat: 'metal', seg: 6, oth: 0.2 });
  }
  // ── 頭・顔 ──
  heroHead(sb, { R, skin: SKIN, male: true, eyeX: 0.37, eyeY: -0.12, eyeW: 0.54, eyeH: 0.52, browY: 0.17, blush: true });
  // ── 髪（紫）──
  const H = 0x7a4cc0, HD = 0x51308e, HL = 0xa98ae8, HT = 0x9068d8, hw = sb.rigid('head');
  const P = (dir, k) => headPoint(sb, R, dir, k, { male: true });
  hairCap2(sb, R, { base: H, dark: HD, faceZ: 0.24, hairline: 0.36, nape: -0.62, bottom: -0.9, male: true, sx: 1.06, sy: 1.06, sz: 1.07 });
  const tie = P([0, 0.2, -1], 1.04);
  // 頭の上の流れ（前の生え際 → 後ろの結び目へ）
  for (let i = 0; i < 13; i++) {
    const a = lerp(-0.82, 0.82, i / 12) * Math.PI, s = Math.sin(a), c = Math.cos(a);
    const p0 = P([s * 0.86, 0.62, c * 0.6], 1.055), p1 = P([s * 0.86, 0.82 - 0.35 * Math.abs(s), c * 0.12 - 0.3], 1.1), p2 = P([s * 0.22, 0.32, -0.95], 1.075);
    lock(sb, [p0, p1, p2], R * (0.34 + (i % 3) * 0.04), { base: i % 4 === 1 ? HT : H, root: H, tip: HD, weights: hw, out: [s, 0.6, c], flat: 0.2, taper: 0.45, bulge: 0.12, segs: 10, oth: 0.6 });
  }
  // 前髪（少し右へ流す・毛先がとがる）
  // 前髪：眉の高さで止まる房（真ん中の 2 本だけ目の間へ）。毛先は前へ少し浮かせる（めがねの前）
  const bangs = [[-0.7, 0.32, 0.02, 0.3], [-0.46, 0.2, 0.04, 0.32], [-0.22, 0.12, 0.05, 0.3], [-0.04, -0.02, 0.06, 0.24], [0.12, 0.04, 0.07, 0.26], [0.32, 0.16, 0.09, 0.3], [0.54, 0.22, 0.1, 0.32], [0.74, 0.34, 0.08, 0.28]];
  for (const [x, tipY, sw, wk] of bangs) {
    const r0 = P([x * 0.7, 0.76, 0.6], 1.05), r1 = P([x * 0.84 - sw * 0.4, 0.5, 0.94], 1.14), r2 = P([x * 0.9 - sw, tipY + 0.16, 0.99], 1.17), r3 = P([x * 0.92 - sw * 1.5, tipY, 0.99], 1.16);
    lock(sb, [r0, r1, r2, r3], R * wk, { base: H, root: HD, tip: HT, weights: hw, out: [x, 0.25, 1], flat: 0.26, taper: 1.3, bulge: 0.2, segs: 10 });
  }
  // 横の房（顔のわき・あごまで）：揺れ物の鎖 2 本ずつ
  const side = {};
  for (const sx of [1, -1]) {
    const nm = sx > 0 ? 'sideL' : 'sideR';
    const a0 = P([sx * 0.82, 0.32, 0.42], 1.08), a1 = P([sx * 0.98, -0.2, 0.46], 1.14), a2 = P([sx * 0.88, -0.72, 0.5], 1.13), a3 = P([sx * 0.72, -1.08, 0.46], 1.1);
    const Hh = W('head');
    const names = boneChain(sb, nm, 'head', [a1[0] - Hh.x, a1[1] - Hh.y, a1[2] - Hh.z], [[0, 0, 0], [a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]]]);
    side[nm] = { names, tail: [a3[0] - a2[0], a3[1] - a2[1], a3[2] - a2[2]] };
    const wt = sb.along([[0, 'head'], [0.3, 'head'], [0.5, names[0]], [0.8, names[1]], [1, names[1]]]);
    lock(sb, [P([sx * 0.7, 0.62, 0.35], 1.06), a0, a1, a2, a3], R * 0.25, { base: H, root: HD, tip: HT, weights: wt, out: [sx, 0, 0.4], flat: 0.3, taper: 1.2, segs: 12 });
    lock(sb, [P([sx * 0.8, 0.5, 0.15], 1.07), P([sx * 1.02, -0.1, 0.24], 1.15), P([sx * 0.94, -0.62, 0.3], 1.13)], R * 0.28, { base: HT, root: HD, tip: HD, weights: hw, out: [sx, 0, 0.2], flat: 0.28, taper: 1.1, segs: 9 });
    // 耳の上を後ろへ
    lock(sb, [P([sx * 0.8, 0.45, -0.1], 1.07), P([sx * 1.0, 0.05, -0.35], 1.13), P([sx * 0.72, -0.1, -0.75], 1.1)], R * 0.3, { base: H, root: HD, tip: HD, weights: hw, out: [sx, 0, -0.3], flat: 0.24, taper: 0.8, segs: 8 });
  }
  // うなじ（結び目の下）
  for (const x of [-0.55, -0.28, 0, 0.28, 0.55]) lock(sb, [P([x * 0.9, -0.15, -0.95], 1.07), P([x * 1.0, -0.6, -0.9], 1.1), P([x * 0.9, -0.95, -0.78], 1.06)], R * 0.28, { base: H, root: HD, tip: HD, weights: hw, out: [x, -0.2, -1], flat: 0.26, taper: 1.1, segs: 7 });
  // 頭頂のはね毛
  lock(sb, [P([0.04, 1, 0.12], 1.02), P([0.08, 1.25, 0.32], 1.12), P([0.22, 1.18, 0.58], 1.16)], R * 0.13, { base: H, tip: HL, weights: hw, out: [0, 1, 0.2], flat: 0.45, segs: 6 });
  // ポニーテール（5 本の骨の鎖：揺れ物）
  const Hh = W('head');
  const ptNames = boneChain(sb, 'tail', 'head', [tie[0] - Hh.x, tie[1] - Hh.y, tie[2] - Hh.z], [[0, 0, 0], [0, -0.065, -0.05], [0, -0.07, -0.032], [0, -0.068, -0.018], [0, -0.062, -0.008]]);
  const tp = ptNames.map(n => sb.W(n)); const tipP = tp[4].clone().add(V(0, -0.065, -0.002));
  const pts = [tp[0], tp[0].clone().lerp(tp[1], 0.5), tp[1], tp[2], tp[3], tp[4], tipP];
  const pw = chainWeights(sb, ptNames);
  const pr = rng(3);
  // 束の芯
  lock(sb, pts.map(p => [p.x, p.y, p.z]), 0.05, { base: H, root: HD, tip: HT, weights: pw, out: [0, 0, -1], flat: 0.78, taper: 1.05, bulge: 0.35, segs: 14, sides: 12 });
  // 房（芯の周り）
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3, ox = Math.cos(a), oz = Math.sin(a);
    const q = pts.map((p, k) => { const t = k / (pts.length - 1), r = 0.03 * Math.sin(Math.min(1, t * 1.4 + 0.15) * Math.PI) + 0.006; return [p.x + ox * r + (pr() - 0.5) * 0.006, p.y + (k === pts.length - 1 ? -0.01 - pr() * 0.03 : 0), p.z + oz * r * 0.8]; });
    lock(sb, q, 0.026, { base: i % 2 ? HT : H, root: HD, tip: HL, weights: pw, out: [ox, 0, oz], flat: 0.42, taper: 1.2, bulge: 0.25, segs: 12, sides: 8 });
  }
  torus(sb, 0.03, 0.011, xfm([tie[0], tie[1] - 0.002, tie[2] - 0.002], [Math.PI / 2 - 0.55, 0, 0]), { weights: sb.rigid('tail0'), color: PINK, oth: 0.5 });
  // ── 小さなピンクのシルクハット（右へ傾ける）・リボンの端（揺れ物）──
  const hatP = P([-0.42, 0.92, 0.1], 1.02);
  const hatXf = xfm(hatP, [-0.12, 0.3, 0.36], 0.8);
  const hcyl = (y, rt, rb, h, c, seg = 22) => sb.cyl([0, y, 0], rt, rb, h, { xf: hatXf, weights: hw, color: c, seg, mat: 'acc_hat', oth: 0.8 });
  hcyl(0.002, 0.07, 0.072, 0.007, 0xe866a6);
  torus(sb, 0.069, 0.0045, hatXf.clone().multiply(xfm([0, 0.006, 0], [Math.PI / 2, 0, 0])), { weights: hw, color: 0xe866a6, oth: 0.4, rs: 6, ts: 22 });
  hcyl(0.042, 0.043, 0.046, 0.072, 0xf28cbe);
  sb.blob([0, 0.078, 0], [0.043, 0.008, 0.043], { xf: hatXf, weights: hw, color: 0xf6a2cc, mat: 'acc_hat', w: 16, h: 6, oth: 0.6 });
  hcyl(0.014, 0.0475, 0.0478, 0.015, 0x7a2a5e);
  // リボン（帯の横）・端 2 本
  const bowL = V(0.046, 0.016, 0.018).applyMatrix4(hatXf);
  for (const s of [1, -1]) sb.blob([0.047, 0.017, 0.018 + s * 0.016], [0.008, 0.011, 0.016], { rot: [s * 0.5, 0, 0], xf: hatXf, weights: hw, color: 0xffc0dc, mat: 'acc_hat', w: 8, h: 6, oth: 0.4 });
  const Hw = W('head');
  const ribbons = [];
  for (const s of [1, -1]) {
    const nm = s > 0 ? 'ribA' : 'ribB';
    const names = boneChain(sb, nm, 'head', [bowL.x - Hw.x, bowL.y - Hw.y, bowL.z - Hw.z], [[0, 0, 0], [-0.004, -0.032, -0.012 * s - 0.01]]);
    const a = sb.W(names[0]), b = sb.W(names[1]), c = b.clone().add(V(-0.003, -0.03, -0.006 * s - 0.006));
    sb.tube([a, a.clone().lerp(b, 0.5), b, c].map((p, i) => ({ c: [p.x, p.y, p.z], r: [0.008 - i * 0.0008, 0.0022] })), { sides: 6, weights: sb.along([[0, names[0]], [0.66, names[1]], [1, names[1]]]), color: 0xffb0d4, mat: 'acc_hat', capStart: true, capEnd: true, oth: 0.35, ref: [1, 0, 0] });
    ribbons.push({ names, tail: [c.x - b.x, c.y - b.y, c.z - b.z] });
  }
  // ── 黒い四角いめがね（輪郭線なし） ──
  glasses(sb, R, P, hw, 0x16101c);
  // ── ピンクの花の髪飾り（左の耳の上） ──
  flower(sb, R, P([0.86, 0.36, 0.26], 1.13), [0, 1.2, 0.25], hw, 0xff8cc8, 0xffe070);
  // ── 猫の顔のリュック（黒）・肩ひも・飾り（揺れ物）──
  const pack = catPack(sb, jr, 0x1c1824, PINK);
  // ── 武器（専用の骨。大きさ 0 で隠す） ──
  const weapons = sb.withMat('metal', () => buildWeaponBones(sb));
  const tex = heroFaceTex({
    eye: { shape: 'male', iris: '#8a5cd6', irisDark: '#2a0f45', irisLight: '#f0dcff', lash: '#22122e', lashW: 7.5, lidShadow: 'rgba(80,40,120,.5)' },
    brow: { color: '#4b2a78', w: 6.5, tilt: 2 },
    mouth: { color: '#8a3a52', smile: 3, w: 4 },
    nose: { color: 'rgba(190,120,125,.75)' }, blush: { color: 'rgba(255,150,170,.16)' },
    extra: catFace,
  });
  const springDef = {
    chains: B => [
      { name: 'ponytail', bones: ptNames.map(n => B[n]), tail: [0, -0.065, -0.002], stiffness: 3.2, drag: 0.32, gravity: 5, radius: 0.03, maxAngleDeg: 70, main: true },
      ...Object.values(side).map(s => ({ name: 'sidelock', bones: s.names.map(n => B[n]), tail: s.tail, stiffness: 7, drag: 0.45, gravity: 2.5, radius: 0.012, maxAngleDeg: 30 })),
      ...ribbons.map(r => ({ name: 'ribbon', bones: r.names.map(n => B[n]), tail: r.tail, stiffness: 4, drag: 0.28, gravity: 4, radius: 0.004, maxAngleDeg: 60 })),
      ...pack.charms.map(c => ({ name: 'charm', bones: c.names.map(n => B[n]), tail: c.tail, stiffness: 1.6, drag: 0.22, gravity: 8, radius: 0.012, maxAngleDeg: 65 })),
    ],
    colliders: B => bodyColliders(B, { headR: R, pack: { offset: [0, -0.09, -0.172], tail: [0, 0.04, -0.172], radius: 0.055 } }),
  };
  const m = finish(sb, tex, { rim: 0.55, rimColor: 0xc8b0ff, shader: SHADER_CFG.dannoura, lineTint: 0.65 }, {}, springDef);
  return Object.assign(m, { tail: [], coat: [], weapons, height: 1.64, provisional: true, kind: 'dannoura', v2: true, eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

/** めがね（黒・四角）：前の枠・鼻あて・つる。輪郭線なし（plain の組） */
export function glasses(sb, R, P, hw, FR) {
  for (const sx of [1, -1]) {
    const c = P([sx * 0.37, -0.12, 0.92], 1.0);
    const cz = c[2] + 0.017, cx = c[0], cy = c[1], w = R * 0.58, h = R * 0.4, ry = sx * 0.2;
    const L = (x, y, z, sw, sh, d = 0.0045) => sb.box([x, y, z], [sw, sh, d], { rot: [0, ry, 0], weights: hw, color: FR, group: 'plain', mat: 'metal_glasses_frame' });
    L(cx, cy + h / 2, cz, w + 0.004, 0.0062); L(cx, cy - h / 2, cz, w, 0.0042);
    L(cx + Math.cos(ry) * w / 2, cy, cz - Math.sin(ry) * w / 2, 0.0048, h); L(cx - Math.cos(ry) * w / 2, cy, cz + Math.sin(ry) * w / 2, 0.0042, h);
    // つる（耳へ）
    const ex = P([sx * 1, -0.05, -0.1], 1.02);
    const a = V(cx + sx * Math.cos(0.2) * w / 2, cy + h * 0.36, cz - Math.sin(0.2) * w / 2), b = V(ex[0] + sx * 0.004, ex[1] + 0.004, ex[2]);
    const mid = a.clone().lerp(b, 0.5), len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(0.0035, 0.0045, len); g.lookAt(b.clone().sub(a)); g.translate(mid.x, mid.y, mid.z);
    sb.push('plain', g, { weights: hw, color: FR, mat: 'metal_glasses_frame', oth: 0 });
  }
  const br = P([0, -0.08, 1], 1.0);
  sb.box([0, br[1] + R * 0.07, br[2] + 0.02], [R * 0.2, 0.0045, 0.004], { weights: hw, color: FR, group: 'plain', mat: 'metal_glasses_frame' });
}
/** 花の髪飾り（5 枚の花びら＋芯） */
export function flower(sb, R, at, rot, hw, petal, center) {
  const flXf = xfm(at, rot, 1.55);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, 0], [R * 0.105, R * 0.085, R * 0.04], { rot: [0, 0, a], deform: v => { v.z += 0.35 * (1 - v.x * v.x) * 0.5; return v; }, xf: flXf, weights: hw, color: petal, mat: 'acc', w: 10, h: 6, oth: 0.35 }); }
  sb.blob([0, 0, R * 0.04], [R * 0.055, R * 0.055, R * 0.035], { xf: flXf, weights: hw, color: center, mat: 'acc', w: 8, h: 6, oth: 0 });
}
/** リュックの猫の顔（地図帳の 128,128 の 64×64） */
function catFace(g) {
  g.save(); g.translate(128, 128); g.fillStyle = '#16121c'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#ece2ff'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(12, 30); g.lineTo(16, 10); g.lineTo(26, 21); g.quadraticCurveTo(32, 19, 38, 21); g.lineTo(48, 10); g.lineTo(52, 30); g.quadraticCurveTo(54, 52, 32, 54); g.quadraticCurveTo(10, 52, 12, 30); g.stroke();
  g.fillStyle = '#ece2ff'; g.beginPath(); g.ellipse(24, 34, 2.6, 3.2, 0, 0, 7); g.ellipse(40, 34, 2.6, 3.2, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(28, 42); g.quadraticCurveTo(32, 46, 32, 42); g.quadraticCurveTo(32, 46, 36, 42); g.stroke();
  g.lineWidth = 1.4; for (const s of [-1, 1]) for (const dy of [-2, 2]) { g.beginPath(); g.moveTo(32 + s * 14, 40 + dy); g.lineTo(32 + s * 24, 39 + dy * 2); g.stroke(); }
  g.restore();
}
/** 猫の顔のリュック（胸の骨）。jr：上着の殻（肩ひもを面に沿わせる）。戻り値 { charms:[{names, tail}] } */
function catPack(sb, jr, BK, PINK) {
  const cw = sb.rigid('chest'), C0 = V(0, 1.1, -0.178);
  // 角の丸い箱（超楕円で角を出す）
  sb.blob([C0.x, C0.y, C0.z], [0.125, 0.14, 0.058], { deform: v => { const f = x => Math.sign(x) * Math.pow(Math.abs(x), 0.6); v.set(f(v.x), f(v.y), f(v.z)); return v; }, weights: cw, color: BK, mat: 'cloth', w: 24, h: 18, oth: 1, fold: 0.2 });
  // 前のふた（少し明るい縁）
  sb.blob([C0.x, C0.y - 0.005, C0.z - 0.052], [0.11, 0.12, 0.012], { deform: v => { const f = x => Math.sign(x) * Math.pow(Math.abs(x), 0.55); v.set(f(v.x), f(v.y), v.z); return v; }, weights: cw, color: 0x2a2432, mat: 'cloth', w: 20, h: 14, oth: 0.4 });
  // 猫の耳
  for (const sx of [1, -1]) sb.blob([sx * 0.082, C0.y + 0.14, C0.z], [0.036, 0.042, 0.03], { rot: [0, 0, sx * 0.35], deform: v => { const k = (v.y + 1) / 2; v.x *= 1 - k * 0.85; v.z *= 1 - k * 0.6; return v; }, weights: cw, color: BK, mat: 'cloth', w: 10, h: 8, oth: 0.7 });
  // 顔の絵
  sb.card([C0.x, C0.y - 0.005, C0.z - 0.0655], [0.17, 0.17], UVR(128, 128, 192, 192), { rot: [0, Math.PI, 0], weights: cw });
  // 肩ひも（後ろの上 → 肩 → 前 → わきの下 → 後ろの下）
  for (const sx of [1, -1]) {
    const pts = [[sx * 0.07, 1.215, -0.13], [sx * 0.1, 1.33, -0.07], [sx * 0.105, 1.355, 0.0], [sx * 0.1, 1.31, shellZ(jr, 1.31, 0.1) + 0.006], [sx * 0.11, 1.2, shellZ(jr, 1.2, 0.11) + 0.007], [sx * 0.135, 1.06, shellZ(jr, 1.06, 0.135) + 0.006], [sx * 0.15, 0.99, 0.05], [sx * 0.11, 0.985, -0.13]];
    sb.tube(pts.map(c => ({ c, r: [0.016, 0.0055] })), { sides: 6, weights: sb.rigid('chest'), color: 0x26202e, mat: 'cloth', capStart: false, capEnd: false, oth: 0.45, ref: [0, 0, 1] });
    sb.box([sx * 0.11, 1.22, shellZ(jr, 1.22, 0.11) + 0.012], [0.022, 0.014, 0.006], { weights: sb.rigid('chest'), color: 0xb8b0c8, mat: 'metal', oth: 0.2 });
  }
  // 飾り（揺れ物：ピンクの猫・ラベンダーの肉球）
  const Ch = sb.W('chest'), charms = [];
  for (const [x, col, kind] of [[0.095, PINK, 'cat'], [0.065, 0xc0a8f0, 'paw']]) {
    const top = V(x, 0.985, -0.205);
    const nm = kind === 'cat' ? 'charmA' : 'charmB';
    const names = boneChain(sb, nm, 'chest', [top.x - Ch.x, top.y - Ch.y, top.z - Ch.z], [[0, 0, 0], [0, -0.035, 0]]);
    const a = sb.W(names[0]), b = sb.W(names[1]);
    sb.tube([{ c: [a.x, a.y, a.z], r: [0.0022, 0.0022] }, { c: [b.x, b.y + 0.004, b.z], r: [0.0022, 0.0022] }], { sides: 4, weights: sb.along([[0, names[0]], [1, names[0]]]), color: 0xd8d0e0, mat: 'metal', capStart: false, capEnd: false, oth: 0 });
    const cc = [b.x, b.y - 0.016, b.z];
    if (kind === 'cat') {
      sb.blob(cc, [0.016, 0.014, 0.008], { weights: sb.rigid(names[1]), color: col, mat: 'acc', w: 10, h: 8, oth: 0.4 });
      for (const sx of [1, -1]) sb.blob([cc[0] + sx * 0.01, cc[1] + 0.012, cc[2]], [0.006, 0.008, 0.005], { rot: [0, 0, sx * 0.4], weights: sb.rigid(names[1]), color: col, mat: 'acc', w: 6, h: 5, oth: 0.3 });
    } else {
      sb.blob(cc, [0.012, 0.011, 0.007], { weights: sb.rigid(names[1]), color: col, mat: 'acc', w: 10, h: 8, oth: 0.4 });
      for (let i = 0; i < 3; i++) sb.blob([cc[0] + (i - 1) * 0.008, cc[1] + 0.013 - Math.abs(i - 1) * 0.003, cc[2]], [0.004, 0.004, 0.004], { weights: sb.rigid(names[1]), color: col, mat: 'acc', w: 6, h: 4, oth: 0.2 });
    }
    charms.push({ names, tail: [0, -0.03, 0] });
  }
  return { charms };
}

// ───────────────────────── だんのうら（白髪形態） ─────────────────────────
/**
 * 化け猫の本来の姿（男性・性格も記憶も同じ。暴走ではない）。白い乱れ髪・白い猫耳（内側ピンク）・白い尾（揺れ物）・
 * 体に沿った黒いパーカー（すそはリブで締める：スカートに見せない）・白い帯（胸で交差・腰・腿・袖）・白い毛皮の襟・爪・ピンクの花・めがね。
 * opt.mixed：結末A の見舞いの姿（白と紫の混ざった髪。耳・尾・爪は隠れている）
 */
export function buildDannouraWhiteV2(opt = {}) {
  const MIX = !!opt.mixed;
  const d = Object.assign({}, DIM);
  const sb = new SkinBody(d), R = d.headR, W = n => sb.W(n);
  addHelpers(sb);
  const SKIN = 0xfbe7de, BK = 0x19151f, BK2 = 0x2a2234, ST = 0xf3eefb, FUR = 0xf7f3fc, PINK = 0xff9ccc, PANTS = 0x17131c;
  const hy = W('hips').y;
  // パーカー（体に沿う・すそはリブ）
  const torso = [[0.835, 0.136, 0.098, 0], [0.86, 0.134, 0.097, 0], [0.93, 0.13, 0.093, 0.002], [1.0, 0.128, 0.09, 0.004], [1.08, 0.136, 0.094, 0.006], [1.16, 0.146, 0.098, 0.006], [1.24, 0.154, 0.097, 0.002], [1.3, 0.16, 0.092, -0.004], [1.345, 0.148, 0.082, -0.01], [1.375, 0.1, 0.066, -0.012], [1.395, 0.066, 0.056, -0.01]];
  heroBody(sb, {
    torso, torsoMat: 'cloth_hoodie', torsoColor: p => (p.y < 0.865 ? BK2 : BK), chestFlat: 0.92, torsoFold: 0.35,
    pelvis: [[0.76, 0.096, 0.082, 0], [0.8, 0.12, 0.09, -0.004], [0.86, 0.126, 0.092, -0.004]], pantsMat: 'cloth_pants', pantsColor: PANTS,
    arm: { upper: [[0, 0.05], [0.25, 0.05], [0.6, 0.048], [0.9, 0.046], [1, 0.045]], lower: [[0, 0.045], [0.3, 0.047], [0.65, 0.045], [0.85, 0.043], [1, 0.042]], mat: 'cloth_hoodie', color: () => BK, cuff: { color: BK2 }, fold: 0.7 },
    hand: { k: 1.08, color: SKIN },
    leg: { upper: [[0, 0.078, 0.082], [0.3, 0.071, 0.074], [0.65, 0.062, 0.064], [1, 0.054, 0.057]], lower: [[0, 0.054, 0.057], [0.25, 0.055, 0.058], [0.6, 0.049, 0.051], [0.9, 0.05, 0.052], [1, 0.053, 0.055]], mat: 'cloth_pants', color: () => PANTS, hemY: 0.08, fold: 0.55 },
    shoe: { upper: 0x1c1822, sole: 0xf2eef8, toe: 0x2a2432, lace: 0xf3eefb, collar: 0x0e0b12, len: 0.25, wid: 0.05 },
    skin: SKIN, neckR: 0.036, adamsApple: true,
  });
  const tw = p => [[sb.bi(p.y > W('chest').y ? 'chest' : 'spine'), 1]];
  // ファスナー・胸の当て布
  sb.tube([[0, 0.86], [0, 1.0], [0, 1.15], [0, 1.3], [0, 1.37]].map(([x, y]) => ({ c: [x, y, (() => { let i = 0; while (i < torso.length - 2 && torso[i + 1][0] < y) i++; const a = torso[i], b = torso[i + 1], t = (y - a[0]) / (b[0] - a[0]); return lerp(a[2], b[2], t) * 0.9 + lerp(a[3], b[3], t) + 0.003; })()], r: [0.004, 0.0022] })), { sides: 4, weights: p => (p.y > W('chest').y ? [[sb.bi('chest'), 1]] : [[sb.bi('spine'), 1]]), color: 0x6a5a7a, mat: 'metal', capStart: false, capEnd: false, oth: 0, ref: [0, 0, 1] });
  // 白い帯：胸で交差（前と後ろ）・腰のベルト・腿・袖
  for (const sx of [1, -1]) {
    const F = [[sx * 0.12, 1.33, 0.05], [sx * 0.07, 1.23, 0.094], [-sx * 0.03, 1.1, 0.1], [-sx * 0.1, 0.98, 0.093], [-sx * 0.128, 0.92, 0.05]];
    sb.tube(F.map(c => ({ c, r: [0.014, 0.0045] })), { sides: 6, weights: p => { const k = sm(1.2, 1.0, p.y); return [[sb.bi('chest'), 1 - k], [sb.bi('spine'), k]]; }, color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.45, ref: [0, 0, 1] });
    const Bk = [[sx * 0.12, 1.33, 0.05], [sx * 0.14, 1.3, -0.05], [sx * 0.08, 1.15, -0.1], [-sx * 0.06, 1.0, -0.095], [-sx * 0.12, 0.93, -0.06]];
    sb.tube(Bk.map(c => ({ c, r: [0.013, 0.0045] })), { sides: 6, weights: p => { const k = sm(1.2, 1.0, p.y); return [[sb.bi('chest'), 1 - k], [sb.bi('spine'), k]]; }, color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.45, ref: [0, 0, -1] });
  }
  sb.blob([0, 1.105, 0.104], [0.02, 0.02, 0.007], { weights: sb.rigid('chest'), color: 0xc8c0d8, mat: 'metal', w: 10, h: 8, oth: 0.2 });
  sb.tube([{ c: [0, 0.895, 0], r: [0.134, 0.099] }, { c: [0, 0.922, 0], r: [0.132, 0.097] }], { sides: 28, weights: sb.rigid('hips'), color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.5 });
  sb.box([0.05, 0.908, 0.099], [0.036, 0.03, 0.008], { weights: sb.rigid('hips'), color: 0xb8b0c8, mat: 'metal', oth: 0.2 });
  for (const sx of [1, -1]) {
    const UL = sx > 0 ? 'leftUpperLeg' : 'rightUpperLeg', hp = W(UL), y = hp.y - 0.17;
    sb.tube([{ c: [hp.x, y + 0.012, 0.004], r: [0.075, 0.077] }, { c: [hp.x, y - 0.012, 0.004], r: [0.074, 0.076] }], { sides: 20, weights: sb.rigid(UL), color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.4 });
    const UA = sx > 0 ? 'leftUpperArm' : 'rightUpperArm', sh = W(UA), el = W(sx > 0 ? 'leftLowerArm' : 'rightLowerArm'), ay = (sh.y + el.y) / 2 - 0.02;
    sb.tube([{ c: [sh.x, ay + 0.012, 0], r: [0.051, 0.049] }, { c: [sh.x, ay - 0.012, 0], r: [0.05, 0.048] }], { sides: 16, weights: sb.rigid(UA), color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.4 });
    const wr = W(sx > 0 ? 'leftHand' : 'rightHand');
    sb.tube([{ c: [wr.x, wr.y + 0.075, 0], r: [0.047, 0.044] }, { c: [wr.x, wr.y + 0.06, 0], r: [0.047, 0.044] }], { sides: 16, weights: sb.rigid(sx > 0 ? 'leftLowerArm' : 'rightLowerArm'), color: ST, mat: 'cloth_strap', capStart: false, capEnd: false, oth: 0.35 });
  }
  // フード（下ろしている）・白い毛皮の襟（房を重ねる）
  sb.blob([0, 1.29, -0.118], [0.12, 0.09, 0.044], { rot: [0.32, 0, 0], deform: v => { if (v.z > 0) v.z *= 0.4; return v; }, weights: sb.rigid('chest'), color: BK, mat: 'cloth_hoodie', w: 18, h: 12, oth: 0.85, fold: 0.5 });
  const fr = rng(31);
  // 毛皮の襟：とがった房を外へ・下へ（3 段）
  const furW = p => [[sb.bi('chest'), 0.85], [sb.bi('neck'), 0.15]];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 24; i++) {
    const a = -Math.PI * 0.88 + i / 23 * Math.PI * 1.76 + row * 0.06 + (fr() - 0.5) * 0.05, back = Math.max(0, Math.cos(a)), s0 = Math.sin(a), c0 = -Math.cos(a);
    const rx = 0.088 + row * 0.022, rz = 0.07 + row * 0.018, y0 = 1.392 - row * 0.022 - (1 - back) * 0.012;
    const L = 0.035 + back * 0.02 + fr() * 0.015, out = 0.6 + row * 0.15;
    const p0 = [s0 * rx, y0, c0 * rz - 0.016], p1 = [s0 * (rx + L * out * 0.6), y0 - L * 0.35 + 0.01, c0 * (rz + L * out * 0.6) - 0.016], p2 = [s0 * (rx + L * out), y0 - L * (0.6 + row * 0.15), c0 * (rz + L * out) - 0.016];
    lock(sb, [p0, p1, p2], 0.02 + back * 0.008 + fr() * 0.005, { base: fr() < 0.3 ? 0xe4ddf0 : FUR, root: 0xe0d8ee, tip: 0xffffff, weights: furW, out: [s0, 0.6, c0], flat: 0.75, taper: 0.7, bulge: 0.7, segs: 5, sides: 7, mat: 'fur', oth: 0.3 });
  }
  // 背中の猫の足あと
  for (const [x, y, r] of [[0, 1.12, 0.022], [-0.026, 1.155, 0.009], [-0.009, 1.168, 0.009], [0.009, 1.168, 0.009], [0.026, 1.155, 0.009]]) sb.blob([x, y, -0.099], [r, r, 0.004], { weights: sb.rigid('chest'), color: ST, mat: 'cloth_strap', w: 8, h: 4, oth: 0 });
  // 爪
  if (!MIX) for (const [HA, sx] of [['leftHand', 1], ['rightHand', -1]]) {
    const wr = W(HA), w = sb.rigid(HA), hk = 1.08;
    for (const z of [0.022, 0.0075, -0.0075, -0.021]) {
      const bx = wr.x - sx * 0.031 * hk, by = wr.y - (0.012 + 0.068 + 0.044) * hk, zz = z * hk + 0.003;
      sb.tube([{ c: [bx, by, zz], r: [0.006, 0.0045] }, { c: [bx - sx * 0.012, by - 0.024, zz], r: [0.0036, 0.003] }, { c: [bx - sx * 0.03, by - 0.034, zz], r: [0.0006, 0.0006] }], { sides: 6, weights: w, color: 0x3a1a52, mat: 'acc_claw', capStart: false, capEnd: true, oth: 0.25 });
    }
  }
  // ── 頭・顔（耳は猫耳だけ）──
  heroHead(sb, { R, skin: SKIN, male: true, eyeX: 0.37, eyeY: -0.12, eyeW: 0.54, eyeH: 0.52, browY: 0.17, ears: MIX, blush: true });
  // ── 白い乱れ髪 ──
  const H = 0xf2eefa, HD = 0xcfc4e6, HL = 0xffffff, HT = 0xe4dcf4, hw = sb.rigid('head'), PU = 0x9a7ad8, PUD = 0x6a4aa8;
  const P = (dir, k) => headPoint(sb, R, dir, k, { male: true });
  const col = (i, a, b) => (MIX && i % 3 === 1 ? a : b);
  hairCap2(sb, R, { base: H, dark: HD, faceZ: 0.24, hairline: 0.36, nape: -0.66, bottom: -0.95, male: true, sx: 1.07, sy: 1.07, sz: 1.08 });
  const r = rng(77);
  // 前髪（乱れて重なる・毛先が跳ねる）
  for (let i = 0; i < 10; i++) {
    const x = -0.74 + i / 9 * 1.48 + (r() - 0.5) * 0.08, tipY = (Math.abs(x) < 0.3 ? 0.1 : Math.abs(x) < 0.55 ? 0.22 : 0.14) + r() * 0.08, sw = (r() - 0.5) * 0.35 + x * 0.2;
    lock(sb, [P([x * 0.7, 0.8, 0.55], 1.05), P([x * 0.86 + sw * 0.2, 0.5, 0.94], 1.17), P([x * 0.95 + sw * 0.6, tipY + 0.18, 0.99], 1.2), P([x * 1.0 + sw, tipY, 0.98], 1.18)], R * (0.2 + r() * 0.08), { base: col(i, PU, i % 2 ? H : HT), root: col(i, PUD, HD), tip: col(i, 0xc8b0f0, HL), weights: hw, out: [x, 0.25, 1], flat: 0.26, taper: 1.3, bulge: 0.22, segs: 9 });
  }
  // 横と後ろ：外へ跳ねる房（量感）
  for (let i = 0; i < 24; i++) {
    const a = -Math.PI * 0.7 + i / 23 * Math.PI * 1.4 + (r() - 0.5) * 0.06, dx = Math.sin(a), dz = -Math.cos(a), up = 0.78 - r() * 0.3, back = Math.max(0, -dz);
    const len = 0.45 + r() * 0.35 + back * 0.25, flick = 0.12 + r() * 0.22;
    lock(sb, [P([dx * 0.7, up, dz * 0.7], 1.07), P([dx * 1.02, 0.1, dz * 1.02], 1.24 + r() * 0.06), P([dx * (1.08 + flick * 0.5), -0.25 - len * 0.45, dz * (1.05 + flick * 0.4)], 1.28 + r() * 0.06), P([dx * (1.2 + flick), -0.3 - len * 0.7, dz * (1.12 + flick)], 1.26 + r() * 0.08)], R * (0.28 + r() * 0.1), { base: col(i, PU, i % 3 ? H : HT), root: col(i, PUD, HD), tip: col(i, 0xc8b0f0, HL), weights: hw, out: [dx, 0.1, dz], flat: 0.24, taper: 1.15, bulge: 0.3, segs: 9 });
  }
  // 頭頂のはね毛
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, x = Math.sin(a) * 0.35, z = Math.cos(a) * 0.35; lock(sb, [P([x, 1, z], 1.03), P([x * 1.4, 1.2, z * 1.4 + 0.1], 1.14), P([x * 2.2, 1.0, z * 2.0 + 0.2], 1.2)], R * 0.14, { base: H, tip: HL, weights: hw, out: [x, 1, z], flat: 0.42, segs: 6 }); }
  // ── 猫耳（外は白・内はピンク）。耳の骨（ぴくっと動く） ──
  const ears = [];
  if (!MIX) for (const sx of [1, -1]) {
    const base = P([sx * 0.55, 0.86, -0.06], 0.99), nm = sx > 0 ? 'earL' : 'earR', Hh = W('head');
    sb.addBone(nm, 'head', base[0] - Hh.x, base[1] - Hh.y, base[2] - Hh.z); ears.push(nm);
    const B = sb.W(nm), exf = new THREE.Matrix4().makeTranslation(B.x, B.y, B.z).multiply(xfm([0, R * 0.34, 0], [-0.18, sx * 0.28, -sx * 0.3]));
    const earDeform = v => { const k = (v.y + 1) / 2; v.x *= 1 - k * 0.86; v.z *= 1 - k * 0.66; if (v.z > 0) v.z *= 0.6; return v; };
    sb.blob([0, 0, 0], [R * 0.37, R * 0.52, R * 0.17], { deform: earDeform, xf: exf, weights: sb.rigid(nm), color: p => (p.y > B.y + R * 0.66 ? HD : H), mat: 'fur', w: 16, h: 12, oth: 0.9 });
    sb.blob([0, -R * 0.04, R * 0.08], [R * 0.25, R * 0.37, R * 0.07], { deform: earDeform, xf: exf, weights: sb.rigid(nm), color: PINK, mat: 'skin', w: 12, h: 8, oth: 0 });
    for (let k = 0; k < 4; k++) sb.blob([(k - 1.5) * R * 0.07, -R * 0.2 + Math.abs(k - 1.5) * R * 0.04, R * 0.13], [R * 0.05, R * 0.15, R * 0.04], { rot: [0.35, 0, (k - 1.5) * 0.35], xf: exf, weights: sb.rigid(nm), color: FUR, mat: 'fur', w: 6, h: 5, oth: 0 });
  }
  // ── 尾（白・ふわふわ・8 本の骨の鎖：揺れ物） ──
  let tailNames = [];
  if (!MIX) {
    tailNames = boneChain(sb, 'ctail', 'hips', [0, -0.03, -0.11], [[0, 0, 0], [0, -0.05, -0.065], [0, -0.075, -0.06], [0, -0.07, -0.05], [0, -0.04, -0.075], [0, 0.0, -0.09], [0, 0.065, -0.085], [0, 0.09, -0.05]]);
    const tp = tailNames.map(n => sb.W(n)), tipP = tp[tp.length - 1].clone().add(V(0, 0.06, -0.02));
    const pts = tp.concat([tipP]), tr = rng(5);
    const rad = pts.map((_, i) => { const t = i / (pts.length - 1); return 0.026 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.85) * 0.034 + (t > 0.9 ? -0.014 : 0); });
    sb.tube(pts.map((c, i) => ({ c: [c.x, c.y, c.z], r: [rad[i], rad[i]], shape: a => { const k = 1 + Math.sin(a * 6 + i * 1.7) * 0.1 + (tr() - 0.5) * 0.05; return [k, k]; } })), { sides: 16, sub: 3, weights: chainWeights(sb, tailNames), color: (p, t) => (t > 0.88 ? 0xe2d8f4 : t < 0.08 ? HD : FUR), mat: 'fur', capStart: true, capEnd: true, capBulge: 0.9, oth: 0.9 });
    // 毛の房（尾の外側に沿う）
    for (let i = 1; i < pts.length - 1; i++) for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2 + i, c = pts[i], n = pts[i + 1].clone().sub(pts[i - 1]).normalize();
      const side = V(Math.cos(a), Math.sin(a) * 0.3, Math.sin(a)).sub(n.clone().multiplyScalar(n.dot(V(Math.cos(a), Math.sin(a) * 0.3, Math.sin(a))))).normalize();
      const p0 = c.clone().addScaledVector(side, rad[i] * 0.7), p1 = c.clone().addScaledVector(side, rad[i] * 1.25).addScaledVector(n, 0.03);
      const w = sb.along([[0, tailNames[Math.min(tailNames.length - 1, i - 1)]], [1, tailNames[Math.min(tailNames.length - 1, i)]]]);
      lock(sb, [[p0.x, p0.y, p0.z], [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2], [p1.x, p1.y, p1.z]], rad[i] * 0.45, { base: FUR, tip: 0xffffff, weights: () => w(p0, 0.5), out: [side.x, side.y, side.z], flat: 0.5, taper: 1.2, segs: 4, sides: 5, mat: 'fur', oth: 0.3 });
    }
  }
  // ── めがね・ピンクの花 ──
  glasses(sb, R, P, hw, 0x16101c);
  flower(sb, R, P([0.86, 0.3, 0.3], 1.16), [0, 1.2, 0.25], hw, 0xff8cc8, 0xffe070);
  const weapons = sb.withMat('metal', () => buildWeaponBones(sb));
  const tex = heroFaceTex({
    eye: { shape: 'male', iris: '#b48cff', irisDark: '#3a1458', irisLight: '#fbefff', lash: '#2a1838', lashW: 7.5, slit: !MIX, glow: MIX ? null : 'rgba(230,180,255,.45)', ringColor: 'rgba(255,220,255,.5)', lidShadow: 'rgba(90,60,130,.45)' },
    brow: { color: MIX ? '#8a70b8' : '#cfc4e4', w: 6.5, tilt: 2 },
    mouth: { color: '#8a3a52', smile: 3, w: 4 },
    nose: { color: 'rgba(190,120,125,.65)' }, blush: { color: 'rgba(255,150,190,.16)' },
  }, 'calm');
  const springDef = {
    chains: B => tailNames.length ? [{ name: 'tail', bones: tailNames.map(n => B[n]), tail: [0, 0.06, -0.02], stiffness: 5, drag: 0.35, gravity: 1.2, radius: 0.04, maxAngleDeg: 55, main: true,
      drive: (i, t) => _wag.setFromEuler(_wagE.set(0, Math.sin(t * 1.7 - i * 0.55) * 0.09 * (0.4 + i * 0.12), Math.sin(t * 1.1 - i * 0.4) * 0.05)) }] : [],
    colliders: B => bodyColliders(B, { headR: R }).concat([{ bone: B.hips, offset: [0, -0.02, 0], radius: 0.12 }, { bone: B.leftUpperLeg, offset: [0, -0.05, 0], tail: [0, -0.35, 0], radius: 0.07 }, { bone: B.rightUpperLeg, offset: [0, -0.05, 0], tail: [0, -0.35, 0], radius: 0.07 }]),
  };
  const m = finish(sb, tex, { rim: 0.6, rimColor: 0xe8d8ff, outline: 0.0085, outlineColor: 0x1a1024, faceEmissive: 0x3a3048, shader: SHADER_CFG.dannoura_white, lineTint: 0.5 }, {}, springDef);
  return Object.assign(m, { tail: [], coat: [], sway: [], earBones: ears.map(n => sb.B[n]), weapons, height: 1.66, provisional: true, kind: MIX ? 'dannoura_mixed' : 'dannoura_white', v2: true, white: true, mixed: MIX, eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}
const _wag = new THREE.Quaternion(), _wagE = new THREE.Euler();

// ───────────────────────── 相棒 ─────────────────────────
/**
 * 相棒（仮 ID companion・名前未定）。ふつうの女性・158cm：実用的な普段着（オリーブのパーカー：前のファスナーを胸まで開ける・
 * しまの T シャツ・ジーンズ・白いスニーカー・斜めがけの鞄（揺れ物）・腕時計）、あご丈のボブ（左わけ・黄色の髪留め）
 */
export function buildCompanionV2() {
  const k = 0.963, d = {};
  for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  Object.assign(d, { shoulderX: 0.148, hipX: 0.086, headR: 0.118 });
  const sb = new SkinBody(d), R = d.headR, W = n => sb.W(n);
  addHelpers(sb);
  const SKIN = 0xffe6da, PK = 0x6f7a4f, PK2 = 0x58623e, PKL = 0x8a9466, TEE = 0xf2f0ea, JEANS = 0x3c5a8a, JE2 = 0x2c4670, WHITE = 0xf4f2ee;
  const ys = y => W('hips').y + (y - 0.86) * k;   // だんのうらの高さ → 相棒の高さ
  const torso = [[0.9, 0.122, 0.09, 0], [0.97, 0.114, 0.084, 0.002], [1.04, 0.116, 0.086, 0.004], [1.11, 0.124, 0.094, 0.01], [1.18, 0.13, 0.098, 0.012], [1.24, 0.134, 0.092, 0.006], [1.3, 0.13, 0.082, -0.004], [1.34, 0.1, 0.066, -0.006], [1.37, 0.048, 0.042, 0]].map(([y, a, b, c]) => [ys(y), a, b, c]);
  heroBody(sb, {
    torso, torsoMat: 'cloth_shirt', torsoColor: TEE, chestFlat: 0.98,
    pelvis: [[0.76, 0.104, 0.088, 0], [0.8, 0.13, 0.096, -0.004], [0.86, 0.136, 0.098, -0.004], [0.92, 0.128, 0.092, 0], [0.95, 0.122, 0.09, 0]].map(([y, a, b, c]) => [ys(y), a, b, c]), pantsMat: 'cloth_jeans', pantsColor: JEANS,
    arm: { upper: [[0, 0.047], [0.25, 0.047], [0.6, 0.045], [0.9, 0.043], [1, 0.042]], lower: [[0, 0.043], [0.3, 0.044], [0.65, 0.041], [0.85, 0.039], [1, 0.038]], mat: 'cloth_parka', color: () => PK, cuff: { color: PK2 }, fold: 0.6 },
    hand: { k: 0.95, color: SKIN },
    leg: { upper: [[0, 0.08, 0.084], [0.3, 0.072, 0.075], [0.65, 0.062, 0.064], [1, 0.052, 0.055]], lower: [[0, 0.052, 0.055], [0.25, 0.054, 0.056], [0.6, 0.047, 0.049], [0.9, 0.047, 0.049], [1, 0.05, 0.052]], mat: 'cloth_jeans', color: () => JEANS, hemY: 0.085, cuff: { color: 0x5a7aa8, mat: 'cloth_jeans' }, fold: 0.5 },
    shoe: { upper: WHITE, sole: 0x9a9aa0, toe: 0xe6e4de, lace: 0xffffff, collar: 0xd8d6d0, len: 0.235, wid: 0.046 },
    skin: SKIN, neckR: 0.032, adamsApple: false,
  });
  // ジーンズの縫い目（外側）・後ろのポケット
  for (const [UL, sx] of [['leftUpperLeg', 1], ['rightUpperLeg', -1]]) { const h = W(UL), kn = W(UL === 'leftUpperLeg' ? 'leftLowerLeg' : 'rightLowerLeg'); sb.box([h.x + sx * 0.077, (h.y + kn.y) / 2, 0], [0.004, h.y - kn.y - 0.03, 0.01], { weights: sb.rigid(UL), color: JE2, mat: 'cloth_jeans', oth: 0 }); sb.box([h.x, h.y - 0.03, -0.082], [0.058, 0.06, 0.006], { rot: [0.12, 0, 0], weights: sb.rigid('hips'), color: 0x34507e, mat: 'cloth_jeans', oth: 0.15 }); }
  // パーカー（胸までファスナーを開ける）
  const jr = [[0.78, 0.14, 0.108, -0.004], [0.86, 0.138, 0.106, -0.004], [0.95, 0.13, 0.1, 0], [1.04, 0.13, 0.1, 0.004], [1.12, 0.138, 0.106, 0.01], [1.2, 0.144, 0.108, 0.01], [1.27, 0.148, 0.1, 0.002], [1.31, 0.15, 0.092, -0.006], [1.345, 0.136, 0.082, -0.01], [1.372, 0.092, 0.064, -0.012], [1.39, 0.064, 0.056, -0.01]].map(([y, a, b, c]) => [ys(y), a, b, c]);
  const zipY = ys(1.13);
  const open = y => (y > zipY ? 0.012 + (y - zipY) * 0.28 : 0);
  const jw = coatShell(sb, { rings: jr, open, color: (p) => (p.y < ys(0.81) ? PK2 : PK), mat: 'cloth_parka', fold: 0.4 });
  coatTrim(sb, jr, open, zipY, ys(1.385), { color: PK2, mat: 'cloth_parka', weights: jw, w: 0.009, t: 0.005 });
  sb.tube([[0, ys(0.79)], [0, ys(0.95)], [0, zipY]].map(([x, y]) => ({ c: [x, y, shellZ(jr, y, 0) + 0.003], r: [0.006, 0.003] })), { sides: 4, weights: jw, color: 0xb8b8a0, mat: 'metal', capStart: false, capEnd: true, oth: 0.2, ref: [0, 0, 1] });
  sb.box([0.004, zipY - 0.012, shellZ(jr, zipY, 0) + 0.006], [0.008, 0.024, 0.005], { weights: jw, color: 0xc8c8b0, mat: 'metal', oth: 0.2 });
  // ポケットのふた
  for (const sx of [1, -1]) { const x = sx * 0.09, y = ys(0.93); sb.box([x, y, shellZ(jr, y, Math.abs(x)) + 0.004], [0.075, 0.03, 0.007], { rot: [0.1, sx * 0.55, 0], weights: jw, color: PK2, mat: 'cloth_parka', oth: 0.35 }); }
  // フード・ひも
  const hood = [];
  for (let i = 0; i <= 14; i++) { const a = lerp(-1.8, 1.8, i / 14), back = Math.max(0, -Math.cos(a)); hood.push({ c: [Math.sin(a) * (0.084 + 0.01 * back), ys(1.386) + 0.006 * Math.cos(a) - 0.012 * back, -Math.cos(a) * 0.072 - 0.012], r: [0.018 + 0.014 * back, 0.018] }); }
  sb.tube(hood, { sides: 8, weights: p => [[sb.bi('chest'), 0.8], [sb.bi('neck'), 0.2]], color: PK, mat: 'cloth_parka', capStart: true, capEnd: true, oth: 0.7, ref: [0, 1, 0] });
  sb.blob([0, ys(1.29), -0.122], [0.118, 0.094, 0.048], { rot: [0.3, 0, 0], deform: v => { if (v.z > 0) v.z *= 0.4; return v; }, weights: sb.rigid('chest'), color: PK, mat: 'cloth_parka', w: 18, h: 12, oth: 0.85, fold: 0.5 });
  sb.blob([0, ys(1.335), -0.112], [0.088, 0.04, 0.028], { rot: [0.45, 0, 0], weights: sb.rigid('chest'), color: PK2, mat: 'cloth_parka', w: 12, h: 8, oth: 0 });
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.03, ys(1.36), shellZ(jr, ys(1.36), 0.03) + 0.008], r: [0.003, 0.003] }, { c: [sx * 0.034, ys(1.26), shellZ(jr, ys(1.26), 0.034) + 0.008], r: [0.003, 0.003] }, { c: [sx * 0.035, ys(1.2), shellZ(jr, ys(1.2), 0.035) + 0.008], r: [0.0035, 0.0035] }], { sides: 4, weights: sb.rigid('chest'), color: 0xeae0c8, mat: 'cloth', oth: 0.3 });
  // 腕時計（左）
  { const w = W('leftHand'); sb.tube([{ c: [w.x, w.y + 0.03, 0], r: [0.029, 0.027] }, { c: [w.x, w.y + 0.012, 0], r: [0.029, 0.027] }], { sides: 12, weights: sb.rigid('leftLowerArm'), color: 0x3a2a22, mat: 'cloth_bag', capStart: false, capEnd: false, oth: 0.3 }); sb.cyl([w.x + 0.026, w.y + 0.021, 0], 0.012, 0.012, 0.006, { rot: [0, 0, Math.PI / 2], weights: sb.rigid('leftLowerArm'), color: 0xd8d4c8, mat: 'metal', seg: 12, oth: 0.2 }); }
  // 斜めがけの鞄（右肩 → 左の腰）：鞄は揺れ物の骨 1 本
  const strap = [[-0.11, ys(1.33), 0.02], [-0.075, ys(1.27), shellZ(jr, ys(1.27), 0.075) + 0.008], [0.0, ys(1.13), shellZ(jr, ys(1.13), 0) + 0.008], [0.08, ys(0.98), shellZ(jr, ys(0.98), 0.08) + 0.008], [0.13, ys(0.9), shellZ(jr, ys(0.9), 0.13) + 0.004]];
  sb.tube(strap.map(c => ({ c, r: [0.012, 0.004] })), { sides: 5, weights: p => { const t = sm(ys(1.25), ys(0.92), p.y); return [[sb.bi('chest'), 1 - t], [sb.bi('spine'), t]]; }, color: 0x3a2a22, mat: 'cloth_bag', capStart: false, capEnd: false, oth: 0.5, ref: [0, 0, 1] });
  sb.tube([[-0.11, ys(1.33), 0.02], [-0.12, ys(1.33), -0.05], [-0.06, ys(1.2), -0.11], [0.08, ys(1.0), -0.1], [0.14, ys(0.9), -0.04]].map(c => ({ c, r: [0.012, 0.004] })), { sides: 5, weights: p => { const t = sm(ys(1.25), ys(0.92), p.y); return [[sb.bi('chest'), 1 - t], [sb.bi('spine'), t]]; }, color: 0x3a2a22, mat: 'cloth_bag', capStart: false, capEnd: false, oth: 0.5, ref: [0, 0, -1] });
  const Hp = W('hips'), bagTop = V(0.148, ys(0.885), 0.0);
  const bagNames = boneChain(sb, 'bag', 'hips', [bagTop.x - Hp.x, bagTop.y - Hp.y, bagTop.z - Hp.z], [[0, 0, 0]]);
  const bw = sb.rigid(bagNames[0]);
  sb.box([bagTop.x + 0.012, bagTop.y - 0.075, bagTop.z + 0.0], [0.05, 0.13, 0.17], { rot: [0, 0.12, 0], weights: bw, color: 0x8a5a3a, mat: 'cloth_bag', oth: 0.7 });
  sb.box([bagTop.x + 0.034, bagTop.y - 0.035, bagTop.z], [0.008, 0.065, 0.172], { rot: [0, 0.12, 0], weights: bw, color: 0x6a4228, mat: 'cloth_bag', oth: 0.4 });
  sb.box([bagTop.x + 0.04, bagTop.y - 0.065, bagTop.z + 0.0], [0.006, 0.018, 0.026], { rot: [0, 0.12, 0], weights: bw, color: 0xc8a050, mat: 'metal', oth: 0.2 });
  // ── 頭・顔 ──
  heroHead(sb, { R, skin: SKIN, male: false, eyeX: 0.36, eyeY: -0.12, eyeW: 0.56, eyeH: 0.56, browY: 0.18, blush: true });
  // ── 髪：あご丈のボブ（左わけ） ──
  const H = 0x4a3028, HD = 0x2e1c18, HL = 0x7a5444, HT = 0x5c3c30, hw = sb.rigid('head');
  const P = (dir, kk) => headPoint(sb, R, dir, kk, {});
  hairCap2(sb, R, { base: H, dark: HD, faceZ: 0.26, hairline: 0.42, nape: -0.72, bottom: -1.0, sx: 1.1, sy: 1.08, sz: 1.11 });
  const rb = rng(12);
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI * 0.62 + i / 17 * Math.PI * 1.24, dx = Math.sin(a + Math.PI), dz = Math.cos(a + Math.PI), front = Math.max(0, -dz) * 0;
    const fr = Math.max(0, Math.cos(a)) ; void fr; void front;
    const side = Math.abs(dx);
    const tipY = -1.02 + (dz > 0.3 ? 0.12 : 0) + (rb() - 0.5) * 0.06;
    lock(sb, [P([dx * 0.8, 0.62, dz * 0.8], 1.06), P([dx * 1.0, 0.0, dz * 1.0], 1.17), P([dx * 0.98, -0.7, dz * 0.96], 1.2), P([dx * 0.84, tipY, dz * 0.82 + 0.04 * side], 1.13)], R * (0.36 + rb() * 0.06), { base: i % 3 ? H : HT, root: HD, tip: HL, weights: hw, out: [dx, 0, dz], flat: 0.3, taper: 0.9, bulge: 0.3, segs: 10 });
  }
  // 前髪（左わけ・右へ流す）
  for (const [x, len, sw] of [[-0.62, 0.42, 0.06], [-0.38, 0.4, 0.1], [-0.12, 0.38, 0.14], [0.14, 0.32, 0.18], [0.38, 0.22, 0.2], [0.62, 0.26, 0.12]]) {
    lock(sb, [P([0.25 + x * 0.3, 0.86, 0.48], 1.06), P([x * 0.85 - sw * 0.3, 0.52, 0.93], 1.13), P([x * 0.95 - sw, 0.46 - len, 0.98], 1.13)], R * 0.26, { base: H, root: HD, tip: HT, weights: hw, out: [x, 0.3, 1], flat: 0.28, taper: 1.2, segs: 9 });
  }
  // 横の房：揺れ物
  const side = {};
  for (const sx of [1, -1]) {
    const nm = sx > 0 ? 'sideL' : 'sideR', Hh = W('head');
    const a0 = P([sx * 0.84, 0.3, 0.4], 1.1), a1 = P([sx * 0.96, -0.3, 0.44], 1.16), a2 = P([sx * 0.86, -0.8, 0.44], 1.15), a3 = P([sx * 0.7, -1.02, 0.42], 1.1);
    const names = boneChain(sb, nm, 'head', [a1[0] - Hh.x, a1[1] - Hh.y, a1[2] - Hh.z], [[0, 0, 0], [a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]]]);
    side[nm] = { names, tail: [a3[0] - a2[0], a3[1] - a2[1], a3[2] - a2[2]] };
    lock(sb, [P([sx * 0.7, 0.62, 0.36], 1.06), a0, a1, a2, a3], R * 0.3, { base: H, root: HD, tip: HL, weights: sb.along([[0, 'head'], [0.3, 'head'], [0.5, names[0]], [0.8, names[1]], [1, names[1]]]), out: [sx, 0, 0.4], flat: 0.3, taper: 0.95, segs: 12 });
  }
  // 黄色の髪留め
  const clip = P([0.72, 0.42, 0.52], 1.15);
  sb.box(clip, [0.012, 0.012, 0.05], { rot: [0.2, 0.9, 0.5], weights: hw, color: 0xf2c440, mat: 'acc', oth: 0.4 });
  const tex = heroFaceTex({
    eye: { shape: 'female', iris: '#7a5232', irisDark: '#24140a', irisLight: '#f5dcbc', lash: '#20120c', lashW: 8.5, lidShadow: 'rgba(90,50,40,.4)' },
    brow: { color: '#3a2618', w: 5.5, arch: 4, tilt: -2 },
    mouth: { color: '#b05060', smile: 5, w: 4 },
    nose: {}, blush: { color: 'rgba(255,130,160,.32)', lines: false },
  });
  const springDef = {
    chains: B => [
      ...Object.values(side).map(s => ({ name: 'sidelock', bones: s.names.map(n => B[n]), tail: s.tail, stiffness: 6, drag: 0.42, gravity: 2.5, radius: 0.012, maxAngleDeg: 30, main: true })),
      { name: 'bag', bones: bagNames.map(n => B[n]), tail: [0.012, -0.14, 0], stiffness: 3, drag: 0.3, gravity: 6, radius: 0.05, maxAngleDeg: 35 },
    ],
    colliders: B => bodyColliders(B, { headR: R, chestR: 0.09 }).concat([{ bone: B.leftUpperLeg, offset: [0, -0.04, 0], tail: [0, -0.3, 0], radius: 0.07 }, { bone: B.hips, offset: [0, 0, 0], radius: 0.12 }]),
  };
  const m = finish(sb, tex, { rim: 0.45, rimColor: 0xffd8b0, shader: SHADER_CFG.companion, lineTint: 0.6 }, {}, springDef);
  return Object.assign(m, { height: 1.58, provisional: true, kind: 'companion', v2: true, eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

// ───────────────────────── 娘（4 歳・結末の家の場面だけ） ─────────────────────────
/** だんのうらの娘（4 歳）。ピンクのワンピース（白いえり）・白いくつした・ピンクのくつ・二つ結び（揺れ物）。危険な場面には出さない */
export function buildDaughterV2() {
  const k = 0.6, d = {}; for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  Object.assign(d, { headR: 0.1, neck: d.neck * 0.8, shoulderX: 0.1 });
  const sb = new SkinBody(d), R = d.headR, W = n => sb.W(n);
  addHelpers(sb);
  const DR = 0xf4a6c4, DR2 = 0xfff0f6, SKIN = 0xffe8dc, SOCK = 0xfff6f0;
  const ys = y => W('hips').y + (y - 0.86) * k;
  const torso = [[0.9, 0.082, 0.07, 0], [1.0, 0.08, 0.068, 0.004], [1.1, 0.084, 0.07, 0.006], [1.2, 0.088, 0.066, 0.004], [1.28, 0.086, 0.06, 0], [1.33, 0.07, 0.05, -0.004], [1.37, 0.034, 0.03, 0]].map(([y, a, b, c]) => [ys(y), a, b, c]);
  heroBody(sb, {
    torso, torsoMat: 'cloth_dress', torsoColor: p => (p.y > ys(1.3) ? DR2 : DR), chestFlat: 0.98,
    pelvis: [[0.78, 0.07, 0.06, 0], [0.86, 0.085, 0.07, 0], [0.92, 0.084, 0.07, 0]].map(([y, a, b, c]) => [ys(y), a, b, c]), pantsMat: 'cloth_dress', pantsColor: DR2,
    arm: { upper: [[0, 0.032], [0.3, 0.031], [0.6, 0.026], [1, 0.024]], lower: [[0, 0.024], [0.5, 0.023], [1, 0.021]], mat: 'skin', color: (t, w) => (w === 'upper' && t < 0.35 ? DR2 : SKIN), fold: 0.1 },
    hand: { k: 0.66, color: SKIN },
    leg: { upper: [[0, 0.046, 0.048], [0.5, 0.04, 0.042], [1, 0.034, 0.036]], lower: [[0, 0.034, 0.036], [0.4, 0.035, 0.037], [1, 0.028, 0.03]], mat: 'skin', color: (t, w) => (w === 'lower' && t > 0.45 ? SOCK : SKIN), hemY: 0.06, fold: 0.1 },
    shoe: { upper: 0xe86a8a, sole: 0xf4f0f0, toe: 0xf08aa4, collar: 0xd85a7a, len: 0.15, wid: 0.034 },
    skin: SKIN, neckR: 0.024,
  });
  // ワンピースのすそ（ひざの上まで・ふんわり）・白いえり・リボン
  const hy = W('hips').y;
  const skirt = [[hy + 0.06, 0.088, 0.074], [hy - 0.0, 0.11, 0.094], [hy - 0.07, 0.13, 0.112], [hy - 0.12, 0.138, 0.12]];
  const sw = p => { const kk = sm(hy, hy - 0.14, p.y) * 0.5; const l = sm(-0.02, 0.05, p.x) * kk, r = sm(0.02, -0.05, p.x) * kk; return [[sb.bi('hips'), 1 - l - r], [sb.bi('leftHipH'), l], [sb.bi('rightHipH'), r]]; };
  sb.tube(skirt.map(([y, rx, rz]) => ({ c: [0, y, 0], r: [rx, rz], shape: a => [1 + 0.05 * Math.sin(a * 8), 1 + 0.05 * Math.sin(a * 8)] })), { sides: 32, sub: 2, weights: sw, color: (p, t) => (t > 0.85 ? DR2 : DR), mat: 'cloth_dress', capStart: false, capEnd: false, oth: 0.8, fold: 0.5 });
  const ny = ys(1.36);
  for (const sx of [1, -1]) sb.blob([sx * 0.03, ny - 0.004, 0.034], [0.04, 0.012, 0.03], { rot: [0.25, sx * 0.4, sx * 0.2], weights: sb.rigid('chest'), color: DR2, mat: 'cloth_dress', w: 12, h: 6, oth: 0.5 });
  for (const sx of [1, -1]) sb.blob([sx * 0.016, ny - 0.03, 0.06], [0.016, 0.01, 0.008], { rot: [0, 0, sx * 0.4], weights: sb.rigid('chest'), color: 0xe85a8a, mat: 'acc', w: 8, h: 6, oth: 0.4 });
  heroHead(sb, { R, skin: SKIN, child: true, eyeX: 0.36, eyeY: -0.16, eyeW: 0.62, eyeH: 0.64, browY: 0.12, blush: true });
  const H = 0x3a2a22, HD = 0x241812, HL = 0x5a4236, hw = sb.rigid('head');
  const P = (dir, kk) => headPoint(sb, R, dir, kk, { child: true });
  hairCap2(sb, R, { base: H, dark: HD, faceZ: 0.24, hairline: 0.36, nape: -0.7, bottom: -0.92, child: true, sx: 1.1, sy: 1.08, sz: 1.1 });
  for (let i = 0; i < 8; i++) { const x = -0.66 + i / 7 * 1.32; lock(sb, [P([x * 0.7, 0.82, 0.55], 1.06), P([x * 0.88, 0.48, 0.92], 1.13), P([x * 0.94, 0.16 + Math.abs(x) * 0.1, 0.98], 1.12)], R * 0.26, { base: H, root: HD, tip: HL, weights: hw, out: [x, 0.3, 1], flat: 0.3, taper: 1.0, segs: 7 }); }
  for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.7 + i / 11 * Math.PI * 1.4, dx = Math.sin(a), dz = -Math.cos(a); lock(sb, [P([dx * 0.8, 0.6, dz * 0.8], 1.06), P([dx, -0.05, dz], 1.15), P([dx * 0.9, -0.55, dz * 0.9], 1.12)], R * 0.36, { base: H, root: HD, tip: HL, weights: hw, out: [dx, 0, dz], flat: 0.3, taper: 0.9, segs: 7 }); }
  // 二つ結び（揺れ物）・ピンクのゴム
  const tails = [], Hh = W('head');
  for (const sx of [1, -1]) {
    const b = P([sx * 0.88, 0.12, -0.38], 1.1), nm = sx > 0 ? 'pigL' : 'pigR';
    const names = boneChain(sb, nm, 'head', [b[0] - Hh.x, b[1] - Hh.y, b[2] - Hh.z], [[0, 0, 0], [sx * 0.03, -0.045, -0.006]]);
    const a0 = sb.W(names[0]), a1 = sb.W(names[1]), tip = a1.clone().add(V(sx * 0.012, -0.05, 0.004));
    sb.blob(b, [R * 0.13, R * 0.13, R * 0.13], { weights: sb.rigid(names[0]), color: 0xff6aa0, mat: 'acc', w: 10, h: 8, oth: 0.6 });
    lock(sb, [[a0.x, a0.y, a0.z], [(a0.x + a1.x) / 2 + sx * 0.008, (a0.y + a1.y) / 2, (a0.z + a1.z) / 2], [a1.x, a1.y, a1.z], [tip.x, tip.y, tip.z]], R * 0.3, { base: H, root: HD, tip: HL, weights: sb.along([[0, names[0]], [0.6, names[1]], [1, names[1]]]), out: [sx, 0, 0], flat: 0.5, taper: 1.0, bulge: 0.4, segs: 9 });
    tails.push({ names, tail: [tip.x - a1.x, tip.y - a1.y, tip.z - a1.z] });
  }
  const tex = heroFaceTex({
    eye: { shape: 'child', iris: '#5a3a28', irisDark: '#1a0e08', irisLight: '#f0d0b0', lash: '#2a1810', lashW: 7, lidShadow: 'rgba(90,50,40,.3)' },
    brow: { color: '#3a2a22', w: 4.5, arch: 5, tilt: -2 },
    mouth: { color: '#c05068', smile: 6, w: 4 },
    nose: { color: 'rgba(200,130,130,.6)' }, blush: { color: 'rgba(255,130,160,.4)', lines: true },
  }, 'smile');
  const springDef = {
    chains: B => tails.map(t => ({ name: 'pigtail', bones: t.names.map(n => B[n]), tail: t.tail, stiffness: 4, drag: 0.3, gravity: 6, radius: 0.02, maxAngleDeg: 60, main: true })),
    colliders: B => [{ bone: B.head, offset: [0, R * 1.0, -R * 0.05], radius: R * 0.95 }, { bone: B.neck, offset: [0, 0, 0], radius: 0.035 }],
  };
  const m = finish(sb, tex, { rim: 0.4, rimColor: 0xffe0c0, shader: SHADER_CFG.daughter, lineTint: 0.6, outline: 0.007 }, {}, springDef);
  return Object.assign(m, { height: 1.0, provisional: true, kind: 'daughter', v2: true, eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}
