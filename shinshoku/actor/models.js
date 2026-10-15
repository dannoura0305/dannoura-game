// コードで組む仮のキャラクター（provisional）：骨つきのスキン網・アニメ調（トゥーン＋縁の光＋輪郭線）。
// 本番は外部で作ったモデル（VRM／glTF）に差し替える：shinshoku/assets/characters/manifest.json（actor/vrm.js・docs/shinshoku/ASSET_IMPORT.md）。
// デザインはすべて本作独自（他作品の意匠を写さない）。異形は不気味だが流血・欠損の表現はしない。
import * as THREE from 'three';
import { SkinBody, DIM, headDeform, faceAtlas, faceAtlasExpr, UVR, drawEye, drawBrow, drawMouth, drawNose, drawBlush } from './skin.js';
import { toon, addOutlines } from '../render/toon.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const xfm = (p, r = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, 'YXZ')), typeof s === 'number' ? V(s, s, s) : V(...s));
const JP = '"IPAGothic","Noto Sans CJK JP","Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';

export function torus(sb, R, r, xf, opt = {}) {
  const g = new THREE.TorusGeometry(R, r, opt.rs || 6, opt.ts || 14); g.applyMatrix4(xf);
  sb.push(opt.group || 'body', g, { weights: opt.weights, color: opt.color, oth: opt.oth ?? 0.6 });
}
/** 骨の休みの姿勢の行列（回転つきの骨の子に付ける物用） */
export function boneXf(sb, name) { sb.root.updateMatrixWorld(true); return sb.B[name].matrixWorld.clone(); }

// ───────────────────────── 共通の人型 ─────────────────────────
/**
 * s = { torso:[[f,rx,rz,zoff],...], torsoColor(p,t,a), armR:[肩,肘,手首], armColor(t,which), legR:[付け根,膝,ふくらはぎ,足首],
 *       legColor(t,which), skin, shoe, sole, hand, neckR, R(頭), headScale }
 */
/** 手：手のひら・指 4 本（少し曲げる）・親指。腕を下ろした休みの姿勢で、手のひらは体の内側（-sx）を向く */
export function handShape(sb, HA, wr, sx, hk = 1, color = 0xffe1d2, glove = null) {
  const w = sb.rigid(HA), c = glove || color;
  const y0 = wr.y - 0.012 * hk;
  sb.blob([wr.x - sx * 0.002, y0 - 0.034 * hk, 0.004], [0.017 * hk, 0.038 * hk, 0.031 * hk], { weights: w, color: c, w: 14, h: 10, oth: 0.6 });
  const fingers = [[0.022, 1.0], [0.0075, 1.1], [-0.0075, 1.02], [-0.021, 0.84]];
  for (const [z, L] of fingers) {
    const bx = wr.x - sx * 0.001, by = y0 - 0.068 * hk, l = 0.024 * L * hk;
    const pts = [[bx, by, z * hk + 0.004], [bx - sx * 0.006 * hk, by - l * 0.95, z * hk + 0.004], [bx - sx * 0.019 * hk, by - l * 1.6, z * hk + 0.003], [bx - sx * 0.03 * hk, by - l * 1.8, z * hk + 0.002]];
    sb.tube(pts.map((q, i) => ({ c: q, r: [0.0075 * hk * (1 - i * 0.09), 0.0068 * hk * (1 - i * 0.09)] })), { sides: 6, weights: w, color: c, capStart: false, capEnd: true, capBulge: 0.8, oth: 0.35, ref: [0, 0, 1] });
  }
  const tb = [wr.x - sx * 0.008 * hk, y0 - 0.024 * hk, 0.03 * hk];
  sb.tube([{ c: tb, r: [0.0095 * hk, 0.0085 * hk] }, { c: [tb[0] - sx * 0.012 * hk, tb[1] - 0.022 * hk, tb[2] + 0.012 * hk], r: [0.0082 * hk, 0.0075 * hk] }, { c: [tb[0] - sx * 0.024 * hk, tb[1] - 0.038 * hk, tb[2] + 0.012 * hk], r: [0.007 * hk, 0.0065 * hk] }], { sides: 6, weights: w, color: c, capStart: false, capEnd: true, capBulge: 0.8, oth: 0.35 });
}
export function humanBody(sb, s) {
  const d = sb.d, W = n => sb.W(n);
  const crotchY = W('hips').y - 0.09, neckY = W('neck').y;
  const fy = y => (y - crotchY) / (neckY - crotchY);
  // 胴（股〜首の付け根）。重み：腰→背骨→胸→首
  const tStops = [[0, 'hips'], [fy(W('spine').y) - 0.06, 'hips'], [fy(W('spine').y) + 0.1, 'spine'], [fy(W('chest').y) - 0.04, 'spine'], [fy(W('chest').y) + 0.12, 'chest'], [0.96, 'chest'], [1.04, 'neck']];
  const rings = s.torso.map(([f, rx, rz, zo]) => ({ c: [0, crotchY + f * (neckY - crotchY), 0], r: [rx, rz], off: [0, zo || 0] }));
  sb.tube(rings, { sides: Math.max(24, s.torsoSides || 18), sub: Math.max(4, s.torsoSub || 3), weights: sb.along(tStops), color: s.torsoColor, capStart: true, capEnd: true, fold: s.torsoFold ?? 0.55 });
  // 首
  const nk = W('neck'), hd = W('head');
  sb.tube([{ c: [0, nk.y - 0.03, 0.005], r: [s.neckR, s.neckR * 0.95] }, { c: [0, (nk.y + hd.y) / 2, 0.008], r: [s.neckR * 0.92, s.neckR * 0.9] }, { c: [0, hd.y + 0.035, 0.012], r: [s.neckR * 0.9, s.neckR * 0.9] }],
    { sides: 10, weights: sb.along([[0, 'neck'], [0.5, 'neck'], [1, 'head']]), color: s.skin, capStart: false, capEnd: false, oth: 0.7 });
  // 腕
  for (const [side, sx] of [['left', 1], ['right', -1]]) {
    const UA = side + 'UpperArm', LA = side + 'LowerArm', HA = side + 'Hand';
    const sh = W(UA), el = W(LA), wr = W(HA);
    // 肩の丸み（胸と上腕を半々）
    // 首から肩への傾斜（僧帽筋）：胴の上と肩の丸みの間を埋める
    const nk0 = W('neck');
    sb.tube([{ c: [sx * 0.03, nk0.y - 0.012, -0.008], r: [0.042, 0.03] }, { c: [sh.x * 0.55, (nk0.y + sh.y) / 2 - 0.004, -0.004], r: [0.046, 0.036] }, { c: [sh.x - sx * 0.012, sh.y + 0.004, 0], r: [s.armR[0] * 0.98, s.armR[0] * 0.82] }],
      { sides: 14, weights: (p) => { const k = Math.max(0, Math.min(1, (Math.abs(p.x) - 0.09) / 0.08)); return [[sb.bi('chest'), 1 - k * 0.4], [sb.bi(UA), k * 0.4]]; }, color: s.shoulderColor || s.armColor(0, 'upper'), capStart: false, capEnd: false, oth: 0.8, ref: [0, 1, 0], fold: 0.3 });
    // 肩の丸み（胸と上腕を半々。小さめにして胴とつなぐ）
    sb.blob([sh.x - sx * 0.014, sh.y - 0.014, sh.z - 0.002], [s.armR[0] * 0.95, s.armR[0] * 0.86, s.armR[0] * 1.02], { weights: () => [[sb.bi('chest'), 0.5], [sb.bi(UA), 0.5]], color: s.armColor(0, 'upper'), w: 16, h: 12, fold: 0.4 });
    const uaR = [[0, s.armR[0]], [0.2, s.armR[0] * 1.02], [0.45, s.armR[0] * 0.95], [0.75, s.armR[1] * 1.06], [1, s.armR[1]]];
    sb.tube(uaR.map(([t, r]) => ({ c: [sh.x - sx * 0.004 * t, sh.y + (el.y - sh.y) * t, -0.003 * Math.sin(t * Math.PI)], r: [r, r * 0.94] })), { sides: 16, sub: 2, weights: sb.along([[0, 'chest'], [0.18, UA], [0.78, UA], [1.25, LA]]), color: (p, t) => s.armColor(t, 'upper'), capStart: false, capEnd: true, fold: s.armFold ?? 1 });
    const laR = [[0, s.armR[1]], [0.25, s.armR[1] * 1.06], [0.55, s.armR[1] * 0.98], [0.85, s.armR[2] * 1.03], [1, s.armR[2]]];
    sb.tube(laR.map(([t, r]) => ({ c: [el.x, el.y + (wr.y - el.y) * t, 0.004 * Math.sin(t * Math.PI)], r: [r, r * 0.88] })), { sides: 16, sub: 2, weights: sb.along([[-0.25, UA], [0.2, LA], [0.85, LA], [1.2, HA]]), color: (p, t) => s.armColor(t, 'lower'), capStart: true, capEnd: false, fold: s.armFold ?? 1 });
    if (s.cuff) sb.tube([{ c: [wr.x, wr.y + 0.06, 0], r: [s.armR[2] * 1.35, s.armR[2] * 1.3] }, { c: [wr.x, wr.y + 0.005, 0], r: [s.armR[2] * 1.4, s.armR[2] * 1.32] }], { sides: 10, weights: sb.along([[0, LA], [1, LA]]), color: s.cuff, capStart: false, capEnd: false, oth: 0.6 });
    // 手（手のひら＋指 4 本＋親指。少し握った形）
    handShape(sb, HA, wr, sx, s.hand || 1, s.handColor || s.skin, s.glove);
  }
  // 脚
  for (const [side, sx] of [['left', 1], ['right', -1]]) {
    const UL = side + 'UpperLeg', LL = side + 'LowerLeg', FT = side + 'Foot';
    const hp = W(UL), kn = W(LL), an = W(FT);
    const r = s.legR;
    const ul = [[0, r[0]], [0.4, r[0] * 0.92], [0.85, r[1] * 1.05], [1, r[1]]];
    sb.tube(ul.map(([t, rr]) => ({ c: [hp.x + sx * 0.006 * (1 - t), hp.y + 0.03 + (kn.y - hp.y - 0.03) * t, 0.006 * Math.sin(t * Math.PI)], r: [rr, rr * 1.02] })), { sides: 16, sub: Math.max(2, s.legSub || 1), weights: sb.along([[0, 'hips'], [0.2, UL], [0.8, UL], [1.25, LL]]), color: (p, t) => s.legColor(t, 'upper', p), capStart: true, capEnd: true, fold: s.legFold ?? 0.9 });
    const ll = [[0, r[1]], [0.3, r[2]], [0.85, r[3] * 1.05], [1, r[3]]];
    sb.tube(ll.map(([t, rr]) => ({ c: [kn.x, kn.y + (an.y + 0.02 - kn.y) * t, t < 0.5 ? -0.006 * Math.sin(t * Math.PI * 2) : 0], r: [rr, rr * 1.05] })), { sides: 16, sub: Math.max(2, s.legSub || 1), weights: sb.along([[-0.25, UL], [0.2, LL], [0.85, LL], [1.2, FT]]), color: (p, t) => s.legColor(t, 'lower', p), capStart: true, capEnd: false, fold: s.legFold ?? 0.9 });
    // 靴
    const shoeW = s.shoeW || 1;
    sb.blob([an.x, an.y - 0.012, an.z + 0.05], [0.046 * shoeW, 0.044, 0.112 * shoeW], { weights: sb.rigid(FT), color: (p) => (p.y < 0.014 ? s.sole : s.shoe), w: 18, h: 12, deform: v => { if (v.y < -0.3) v.y = -0.3 - (v.y + 0.3) * 0.3; if (v.z > 0.3) v.y *= 1 - (v.z - 0.3) * 0.35; return v; } });
    if (s.shoeDeco) s.shoeDeco(an, FT);
  }
}

/** 頭（変形した球）・耳・顔の絵（目・眉・口・鼻・頬）。o = { R, skin, iris…, male } 戻り値：顔の面の関数 */
export function humanHead(sb, o) {
  const R = o.R, hc = sb.hc;
  const surf = dir => { const v = headDeform(dir.clone(), o); return V(hc.x + v.x * R * 0.98, hc.y + v.y * R * 1.04, hc.z + v.z * R); };
  sb.blob([hc.x, hc.y, hc.z], [R * 0.98, R * 1.04, R], { deform: v => headDeform(v, o), weights: sb.rigid('head'), color: o.skin, w: 36, h: 26, oth: 1 });
  if (o.ears !== false) for (const sx of [1, -1]) sb.blob([hc.x + sx * R * 0.93, hc.y - R * 0.12, hc.z - R * 0.04], [R * 0.13, R * 0.25, R * 0.1], { rot: [0, sx * 0.3, sx * 0.15], weights: sb.rigid('head'), color: o.skin, w: 12, h: 8, oth: 0.5 });
  // 目の骨（まばたき：大きさの y を縮める）・口の骨
  const eyeY = -0.1, eyeX = o.eyeX ?? 0.36;
  const eL = surf(V(eyeX, eyeY, 0.92).normalize()), eR = surf(V(-eyeX, eyeY, 0.92).normalize()), mo = surf(V(0, -0.56, 0.83).normalize());
  sb.addBone('eyeL', 'head', eL.x - sb.W('head').x, eL.y - sb.W('head').y, eL.z - sb.W('head').z);
  sb.addBone('eyeR', 'head', eR.x - sb.W('head').x, eR.y - sb.W('head').y, eR.z - sb.W('head').z);
  sb.addBone('mouth', 'head', mo.x, mo.y - sb.W('head').y, mo.z);
  if (o.faceless) return surf;
  const ew = o.eyeW ?? 0.44, eh = o.eyeH ?? 0.6;
  sb.decal([eyeX, eyeY, 0.92], [R * ew, R * eh], UVR(0, 0, 128, 128), { surface: surf, weights: sb.rigid('eyeL'), lift: 0.003 });
  sb.decal([-eyeX, eyeY, 0.92], [R * ew, R * eh], UVR(0, 0, 128, 128), { surface: surf, weights: sb.rigid('eyeR'), mirrorU: true, lift: 0.003 });
  sb.decal([eyeX + 0.02, 0.24, 0.9], [R * 0.42, R * 0.17], UVR(128, 0, 256, 48), { surface: surf, weights: sb.rigid('head'), lift: 0.004, nx: 3, ny: 1 });
  sb.decal([-eyeX - 0.02, 0.24, 0.9], [R * 0.42, R * 0.17], UVR(128, 0, 256, 48), { surface: surf, weights: sb.rigid('head'), mirrorU: true, lift: 0.004, nx: 3, ny: 1 });
  sb.decal([0, -0.56, 0.83], [R * 0.34, R * 0.17], UVR(128, 48, 256, 96), { surface: surf, weights: sb.rigid('mouth'), lift: 0.003, nx: 3, ny: 1 });
  sb.decal([0, -0.3, 0.95], [R * 0.16, R * 0.16], UVR(128, 96, 192, 128), { surface: surf, weights: sb.rigid('head'), lift: 0.003, nx: 1, ny: 1 });
  if (o.blush) for (const sx of [1, -1]) sb.decal([sx * 0.56, -0.33, 0.8], [R * 0.34, R * 0.17], UVR(192, 96, 256, 128), { surface: surf, weights: sb.rigid('head'), lift: 0.0035, nx: 2, ny: 1 });
  return surf;
}

/** 髪の帽子（頭を包む部分。顔は抜く）。band：天使の輪の明るい帯 */
export function hairCap(sb, R, o) {
  const hc = sb.hc;
  sb.blob([hc.x, hc.y + R * (o.lift ?? 0.02), hc.z - R * 0.02], [R * (o.sx ?? 1.08), R * (o.sy ?? 1.1), R * (o.sz ?? 1.1)], {
    deform: v => headDeform(v, o), w: 22, h: 16, weights: sb.rigid('head'),
    color: p => { const y = (p.y - hc.y) / R, z = (p.z - hc.z) / R; if (o.band && y > 0.42 && y < 0.62 && z > -0.5) return o.band; return y < -0.2 ? o.dark : o.base; },
    keep: c => { const y = (c.y - hc.y) / R, z = (c.z - hc.z) / R, x = (c.x - hc.x) / R; if (z > (o.faceZ ?? 0.2) && y < (o.hairline ?? 0.42)) return false; if (y < (o.nape ?? -0.55) && z > -0.25) return false; if (y < (o.bottom ?? -0.95)) return false; if (Math.abs(x) > 0.75 && y < -0.1 && z > 0.05) return false; return true; },
    oth: 0.9,
  });
}
/** 頭の中心からの向き（単位）と距離 k（R の倍）で頭の外側の点 */
export const onHead = (sb, R, dir, k = 1.1) => { const d = V(...dir).normalize(); const v = headDeform(d.clone()); return [sb.hc.x + v.x * R * k, sb.hc.y + v.y * R * k * 1.03, sb.hc.z + v.z * R * k]; };

// ───────────────────────── だんのうら ─────────────────────────
/** だんのうら（紫の姿）。男性・164cm・細身の若い男性。紫の長い髪のポニーテール・小さなピンクのシルクハット・黒い四角いめがね・ピンクの花の髪飾り・ラベンダーの上着 */
export function buildDannoura() {
  const d = Object.assign({}, DIM);
  const sb = new SkinBody(d);
  // 紫の姿の服（イメージ資料 concept_01・05 に合わせる：ラベンダーと白のフードつき上着・ピンクと白のボーダーのシャツ・暗い格子のズボン・猫の顔のリュック）
  const SKIN = 0xffe1d2, JK = 0xe6def6, JK2 = 0xb9a6e6, JKD = 0x8a70c8, PINK = 0xf2a0c6, WHITE = 0xfaf6ff, PANTS = 0x2a2236, PL1 = 0x46385e, PL2 = 0x7a4a7a;
  const R = d.headR;
  const plaid = (p) => { const k = Math.floor(p.y * 14) % 4; return k === 0 ? PL1 : k === 2 && Math.floor(p.y * 28) % 2 ? PL2 : PANTS; };
  humanBody(sb, {
    torso: [[0, 0.094, 0.072, 0], [0.1, 0.122, 0.084, -0.006], [0.28, 0.11, 0.078, 0], [0.48, 0.122, 0.082, 0.004], [0.66, 0.14, 0.088, 0.008], [0.82, 0.15, 0.086, 0.004], [0.93, 0.12, 0.072, -0.004], [1, 0.05, 0.045, 0]],
    torsoColor: (p, t) => {
      if (t < 0.06) return plaid(p);
      const front = p.z > 0.03, y = p.y, open = 0.03 + Math.max(0, y - 0.95) * 0.16;
      if (front && Math.abs(p.x) < open && y < 1.31) return Math.floor(y * 20) % 2 ? PINK : WHITE;          // 開いた前から見えるボーダーのシャツ
      if (front && Math.abs(p.x) < open + 0.012 && y < 1.31) return JK2;                                     // 前立て
      if (t < 0.11) return JK2;                                                                              // すそのリブ
      if (Math.abs(p.x) > 0.11 && y > 1.0) return JK2;                                                       // わきの切り替え
      return JK;
    },
    torsoSub: 5,
    armR: [0.046, 0.039, 0.032], armColor: (t, w) => (w === 'lower' && t > 0.84 ? JK2 : w === 'upper' && t < 0.08 ? JK2 : JK), cuff: JKD,
    legR: [0.07, 0.049, 0.052, 0.034], legColor: (t, w, p) => (p ? plaid(p) : PANTS), legSub: 3, skin: SKIN, shoe: 0x241a28, sole: 0xe8e0f0, neckR: 0.036,
    shoeDeco: (an, FT) => sb.blob([an.x, an.y + 0.02, an.z + 0.11], [0.012, 0.008, 0.012], { weights: sb.rigid(FT), color: 0xf06aa8, w: 6, h: 4, oth: 0.3 }),
  });
  humanHead(sb, { R, skin: SKIN, male: true, jaw: 0.3, eyeW: 0.5, eyeH: 0.6 });
  // フード（首の後ろ）・ひも
  sb.blob([0, 1.31, -0.085], [0.13, 0.07, 0.06], { rot: [0.5, 0, 0], weights: sb.rigid('chest'), color: JK, w: 14, h: 8 });
  sb.blob([0, 1.33, -0.07], [0.1, 0.045, 0.04], { rot: [0.5, 0, 0], weights: sb.rigid('chest'), color: JKD, w: 10, h: 6, oth: 0.3 });
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.04, 1.3, 0.085], r: [0.004, 0.004] }, { c: [sx * 0.045, 1.2, 0.098], r: [0.004, 0.004] }, { c: [sx * 0.046, 1.12, 0.1], r: [0.005, 0.005] }], { sides: 4, weights: sb.rigid('chest'), color: 0xf06aa8, oth: 0.3 });
  // 猫の顔のリュック（黒）・肩ひも・小さな飾り
  const BK = 0x1c1824;
  sb.box([0, 1.13, -0.165], [0.25, 0.3, 0.12], { weights: sb.rigid('chest'), color: BK, oth: 1 });
  sb.blob([0, 1.13, -0.22], [0.12, 0.14, 0.03], { weights: sb.rigid('chest'), color: BK, w: 10, h: 8, oth: 0.6 });
  for (const sx of [1, -1]) sb.blob([sx * 0.085, 1.29, -0.2], [0.035, 0.04, 0.02], { rot: [0, 0, sx * 0.4], weights: sb.rigid('chest'), color: BK, w: 6, h: 4, oth: 0.5 });   // 猫の耳
  sb.card([0, 1.13, -0.2545], [0.19, 0.19], UVR(128, 128, 192, 192), { rot: [0, Math.PI, 0], weights: sb.rigid('chest') });
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.09, 1.25, -0.11], r: [0.016, 0.006] }, { c: [sx * 0.11, 1.33, -0.02], r: [0.016, 0.006] }, { c: [sx * 0.1, 1.26, 0.085], r: [0.016, 0.006] }, { c: [sx * 0.095, 1.06, 0.09], r: [0.015, 0.006] }], { sides: 5, weights: (p) => [[sb.bi('chest'), 1]], color: 0x2a2232, capStart: false, capEnd: false, oth: 0.4, ref: [0, 0, 1] });
  for (const [x, y, c] of [[0.1, 1.02, 0xf2a0c6], [0.07, 0.99, 0xb9a6e6]]) { sb.tube([{ c: [x, 1.07, -0.18], r: [0.003, 0.003] }, { c: [x, y + 0.02, -0.19], r: [0.003, 0.003] }], { sides: 3, weights: sb.rigid('chest'), color: 0xd0d0d8, oth: 0 }); sb.blob([x, y, -0.19], [0.016, 0.018, 0.01], { weights: sb.rigid('chest'), color: c, w: 6, h: 4, oth: 0.4 }); }
  // ── 髪（紫）──
  const H = 0x7d4fc4, HD = 0x5a3596, HL = 0xa88ae6, HT = 0x9a72dc;
  hairCap(sb, R, { base: H, dark: HD, band: HL, faceZ: 0.22, hairline: 0.4, nape: -0.62, bottom: -0.98 });
  const hw = sb.rigid('head');
  // 前髪（少し右へ流す）
  const bangs = [[-0.62, 0.2, -0.1], [-0.36, 0.24, -0.04], [-0.12, 0.25, 0.0], [0.12, 0.24, 0.05], [0.36, 0.24, 0.1], [0.58, 0.2, 0.14]];
  for (const [x, len, lean] of bangs) {
    const r0 = onHead(sb, R, [x * 0.8, 0.82, 0.55], 1.06), r1 = onHead(sb, R, [x * 0.92 - lean * 0.6, 0.45, 0.92], 1.12);
    const r2 = onHead(sb, R, [x * 0.95 - lean, 0.4 - len, 0.97], 1.1);
    sb.strand([r0, r1, r2], R * 0.2, { base: H, root: HD, tip: HT, weights: hw, out: [x, 0.3, 1], segs: 6 });
  }
  // 横の房（顔の両側・あごまで）
  for (const sx of [1, -1]) {
    sb.strand([onHead(sb, R, [sx * 0.8, 0.45, 0.35], 1.05), onHead(sb, R, [sx * 0.98, -0.1, 0.42], 1.12), onHead(sb, R, [sx * 0.86, -0.75, 0.5], 1.1), onHead(sb, R, [sx * 0.7, -1.05, 0.45], 1.05)], R * 0.2, { base: H, root: HD, tip: HT, weights: hw, out: [sx, 0, 0.3], segs: 7 });
    sb.strand([onHead(sb, R, [sx * 0.7, 0.6, 0.0], 1.05), onHead(sb, R, [sx * 1.0, 0.0, -0.1], 1.14), onHead(sb, R, [sx * 0.9, -0.7, -0.15], 1.12)], R * 0.28, { base: H, root: HD, tip: HD, weights: hw, out: [sx, 0, -0.2], segs: 6 });
  }
  // 後ろ（うなじへ）
  for (const x of [-0.6, -0.2, 0.2, 0.6]) sb.strand([onHead(sb, R, [x, 0.5, -0.8], 1.05), onHead(sb, R, [x * 1.1, -0.2, -1], 1.13), onHead(sb, R, [x * 0.9, -0.85, -0.85], 1.1)], R * 0.3, { base: H, root: H, tip: HD, weights: hw, out: [x, 0, -1], segs: 6 });
  // 髪のかさ（外側にもう一重：頭の形が帽子に見えないよう、房を重ねる）
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.78 + i / 9 * Math.PI * 1.56, dx = Math.sin(a), dz = -Math.cos(a), len = 0.55 + (i % 3) * 0.12;
    sb.strand([onHead(sb, R, [dx * 0.75, 0.75, dz * 0.75], 1.08), onHead(sb, R, [dx * 1.02, 0.1, dz * 1.02], 1.2), onHead(sb, R, [dx * 0.98, -0.2 - len * 0.5, dz * 0.92], 1.16)], R * 0.34, { base: i % 2 ? H : HT, root: HD, tip: HL, weights: hw, out: [dx, 0.2, dz], segs: 6, flat: 0.32 });
  }
  // 頭頂のはね毛
  sb.strand([onHead(sb, R, [0.05, 1, 0.1], 1.02), onHead(sb, R, [0.1, 1.25, 0.35], 1.12), onHead(sb, R, [0.28, 1.2, 0.6], 1.16)], R * 0.12, { base: H, tip: HL, weights: hw, out: [0, 1, 0.2], segs: 5, flat: 0.5 });
  // ポニーテール（4 本の骨の鎖：揺れは actor 側のばね）
  const tie = onHead(sb, R, [0, 0.15, -1], 1.06);
  const tailOff = [[0, 0, 0], [0, -0.11, -0.05], [0, -0.13, -0.025], [0, -0.13, -0.005]];
  let par = 'head', acc = V(...tie).sub(sb.W('head'));
  const tailNames = [];
  for (let i = 0; i < 4; i++) { const o = tailOff[i]; const pos = i === 0 ? acc : V(...o); sb.addBone('tail' + i, par, pos.x, pos.y, pos.z); tailNames.push('tail' + i); par = 'tail' + i; }
  const tp = tailNames.map(n => sb.W(n)); const tip = tp[3].clone().add(V(0, -0.11, 0.012));
  const chain = [tp[0], tp[0].clone().lerp(tp[1], 0.5), tp[1], tp[2], tp[3], tip];
  const rad = [0.03, 0.05, 0.052, 0.046, 0.034, 0.012];
  sb.tube(chain.map((c, i) => ({ c: [c.x, c.y, c.z], r: [rad[i], rad[i] * 0.78] })), { sides: 10, weights: sb.along([[0, 'tail0'], [0.2, 'tail0'], [0.4, 'tail1'], [0.6, 'tail2'], [0.8, 'tail3'], [1, 'tail3']]), color: (p, t) => (t < 0.15 ? HD : t > 0.85 ? HT : H), capStart: true, capEnd: true, capBulge: 0.9 });
  for (const sx of [1, -1]) sb.tube(chain.map((c, i) => ({ c: [c.x + sx * rad[i] * 0.55, c.y - 0.01, c.z - 0.012], r: [rad[i] * 0.45, rad[i] * 0.35] })), { sides: 6, weights: sb.along([[0, 'tail0'], [0.2, 'tail0'], [0.4, 'tail1'], [0.6, 'tail2'], [0.8, 'tail3'], [1, 'tail3']]), color: (p, t) => (t > 0.8 ? HT : H), capStart: false, capEnd: true, oth: 0.5 });
  torus(sb, R * 0.2, R * 0.08, xfm([tie[0], tie[1], tie[2] + 0.004], [Math.PI / 2 - 0.4, 0, 0]), { weights: sb.rigid('tail0'), color: PINK });
  // ── 小さなピンクのシルクハット（右側へ傾ける） ──
  const hatXf = xfm([sb.hc.x - R * 0.42, sb.hc.y + R * 1.02, sb.hc.z + R * 0.06], [-0.12, 0.25, 0.38], 0.82);
  const hcyl = (y, rt, rb, h, c) => sb.cyl([0, y, 0], rt, rb, h, { xf: hatXf, weights: hw, color: c, seg: 18 });
  hcyl(0, R * 0.78, R * 0.78, R * 0.06, 0xe86aa6);
  hcyl(R * 0.36, R * 0.47, R * 0.5, R * 0.66, 0xf08cbc);
  hcyl(R * 0.1, R * 0.515, R * 0.515, R * 0.14, 0x8a2a66);
  sb.blob([R * 0.4, R * 0.12, R * 0.3], [R * 0.12, R * 0.09, R * 0.05], { xf: hatXf, weights: hw, color: 0xffb6d8, w: 8, h: 6, oth: 0.4 });
  // ── 黒い四角いめがね（輪郭線なし） ──
  const FR = 0x16101c;
  for (const sx of [1, -1]) {
    const c = onHead(sb, R, [sx * 0.37, -0.08, 0.93], 1.0);
    const cz = c[2] + 0.016, cx = c[0], cy = c[1], w = R * 0.52, h = R * 0.36, t = 0.0045, ry = sx * 0.22;
    const L = (x, y, z, sw, sh) => sb.box([x, y, z], [sw, sh, 0.004], { rot: [0, ry, 0], weights: hw, color: FR, group: 'plain' });
    L(cx, cy + h / 2, cz, w, t * 1.3); L(cx, cy - h / 2, cz, w, t);
    L(cx + Math.cos(ry) * w / 2, cy, cz - Math.sin(ry) * w / 2, t, h); L(cx - Math.cos(ry) * w / 2, cy, cz + Math.sin(ry) * w / 2, t, h);
    // つる（耳へ）
    const ex = sx * R * 0.95;
    sb.box([(cx + sx * w / 2 + ex) / 2, cy + h * 0.35, (cz - Math.sin(ry) * w / 2 + sb.hc.z - R * 0.05) / 2], [0.004, 0.004, Math.abs(cz - sb.hc.z) + 0.02], { rot: [0, -sx * 0.2, 0], weights: hw, color: FR, group: 'plain' });
  }
  sb.box([0, onHead(sb, R, [0, -0.02, 1], 1.0)[1] + R * 0.06, onHead(sb, R, [0, -0.02, 1], 1.0)[2] + 0.014], [R * 0.2, 0.005, 0.004], { weights: hw, color: FR, group: 'plain' });
  // ── ピンクの花の髪飾り（左の耳の上） ──
  const flXf = xfm(onHead(sb, R, [0.85, 0.45, 0.2], 1.13), [0, 1.25, 0.2], 1.6);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * R * 0.13, Math.sin(a) * R * 0.13, 0], [R * 0.11, R * 0.1, R * 0.05], { rot: [0, 0, a], xf: flXf, weights: hw, color: 0xff8cc8, w: 8, h: 6, oth: 0.35 }); }
  sb.blob([0, 0, R * 0.04], [R * 0.06, R * 0.06, R * 0.04], { xf: flXf, weights: hw, color: 0xffe070, w: 6, h: 4, oth: 0 });
  // ── 武器（専用の骨。大きさ 0 で隠す） ──
  const weapons = buildWeaponBones(sb);
  const tex = faceAtlasExpr((g, E) => {
    drawEye(g, 0, 0, { iris: '#8a5cd6', dark: '#2a0f45', light: '#f2dcff', lash: '#21122e', lashW: 9, rw: 41, rh: 47, flick: true, lid: E.lid, happy: E.happy });
    drawBrow(g, Object.assign({ color: '#4b2a78', w: 8, arch: 0 }, E.brow, { tilt: 2 + (E.brow.tilt || 0) }));
    drawMouth(g, Object.assign({ color: '#9a4058', smile: 3, w: 4.5 }, E.mouth));
    drawNose(g, { color: 'rgba(190,120,120,.7)' });
    drawBlush(g, { color: 'rgba(255,150,170,.25)', lines: false });
    // リュックの猫の顔（線の絵）
    g.save(); g.translate(128, 128); g.fillStyle = '#141018'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#e8dcff'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 26); g.lineTo(18, 10); g.lineTo(27, 20); g.quadraticCurveTo(32, 18, 37, 20); g.lineTo(46, 10); g.lineTo(50, 26); g.quadraticCurveTo(52, 50, 32, 52); g.quadraticCurveTo(12, 50, 14, 26); g.stroke();
    g.fillStyle = '#e8dcff'; g.beginPath(); g.arc(25, 32, 2.5, 0, 7); g.arc(39, 32, 2.5, 0, 7); g.fill(); g.beginPath(); g.moveTo(28, 40); g.quadraticCurveTo(32, 44, 32, 40); g.quadraticCurveTo(32, 44, 36, 40); g.stroke();
    g.restore();
  });
  const m = sb.build(tex, { rim: 0.6, rimColor: 0xc8b0ff });
  const tail = tailNames.map(n => sb.B[n]);
  return Object.assign(m, { tail, coat: [], weapons, height: 1.64, provisional: true, kind: 'dannoura', eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

/** 武器の骨と形（刀・鞘・拳銃・ホルスター・鉄パイプ）。出し入れは骨の大きさ。戻り値は actor が使う */
export function buildWeaponBones(sb) {
  const bone = (name, parent, p, r) => { const b = sb.addBone(name, parent, ...p); b.rotation.set(...r); return b; };
  bone('wKatana', 'rightHand', [0, -0.06, 0.02], [2.1, 0, 0]);
  bone('wSaya', 'hips', [-0.2, 0.15, -0.16], [0, 0.15, -1.85]);
  bone('wSayaHilt', 'wSaya', [0, 0, 0], [0, 0, 0]);
  bone('wGun', 'rightHand', [0, -0.07, 0.03], [0, 0, 0]);
  bone('wHolster', 'hips', [-0.15, -0.08, 0.02], [0, 0, 0]);
  bone('wHolsterGun', 'wHolster', [0, 0, 0], [0, 0, 0]);
  bone('wPipe', 'rightHand', [0, -0.06, 0.02], [2.0, 0, 0]);
  bone('wPipeBack', 'chest', [-0.13, -0.02, -0.17], [0, 0, 0.35]);
  bone('wMatch', 'rightHand', [0, -0.06, 0.02], [2.0, 0, 0]);                  // 火縄銃（第4章から・登録証つきの古い持ち物）
  bone('wMatchBack', 'chest', [0.12, 0.0, -0.19], [0, 0, -0.42]);
  const steel = 0xdde2ee, dark = 0x1c1822, tsuba = 0xb08a3a, saya = 0x2a1630, wrap = 0x5a2a6a;
  const K = boneXf(sb, 'wKatana'), w = sb.rigid('wKatana');
  sb.box([0, -0.02, 0], [0.03, 0.2, 0.034], { xf: K, weights: w, color: wrap, oth: 0.4 });
  sb.cyl([0, 0.085, 0], 0.045, 0.045, 0.012, { xf: K, weights: w, color: tsuba, seg: 10, oth: 0.3 });
  sb.box([0, 0.46, 0.004], [0.011, 0.74, 0.03], { xf: K, weights: w, color: steel, oth: 0.35 });
  sb.box([0, 0.46, 0.017], [0.012, 0.74, 0.004], { xf: K, weights: w, color: 0xffffff, oth: 0 });
  sb.blob([0, 0.85, 0.004], [0.006, 0.035, 0.015], { xf: K, weights: w, color: steel, w: 6, h: 4, oth: 0.3 });
  const SA = boneXf(sb, 'wSaya');
  sb.box([0, 0.3, 0], [0.036, 0.78, 0.044], { xf: SA, weights: sb.rigid('wSaya'), color: saya, oth: 0.5 });
  const SH = boneXf(sb, 'wSayaHilt'), sw = sb.rigid('wSayaHilt');
  sb.box([0, -0.18, 0], [0.03, 0.2, 0.034], { xf: SH, weights: sw, color: wrap, oth: 0.4 }); sb.cyl([0, -0.08, 0], 0.045, 0.045, 0.012, { xf: SH, weights: sw, color: tsuba, seg: 10, oth: 0.3 });
  const G = boneXf(sb, 'wGun'), gw = sb.rigid('wGun');
  sb.box([0, 0.02, 0.06], [0.03, 0.045, 0.17], { xf: G, weights: gw, color: dark, oth: 0.4 });
  sb.box([0, -0.03, -0.005], [0.028, 0.1, 0.045], { rot: [-0.25, 0, 0], xf: G, weights: gw, color: dark, oth: 0.4 });
  sb.box([0, 0.048, 0.12], [0.02, 0.012, 0.04], { xf: G, weights: gw, color: 0x8888a0, oth: 0 });
  const HO = boneXf(sb, 'wHolster');
  sb.box([0, 0, 0], [0.04, 0.12, 0.07], { xf: HO, weights: sb.rigid('wHolster'), color: 0x2a2026, oth: 0.4 });
  const HG = boneXf(sb, 'wHolsterGun');
  sb.box([0, 0.085, -0.01], [0.032, 0.05, 0.05], { xf: HG, weights: sb.rigid('wHolsterGun'), color: dark, oth: 0.3 });
  const PI = boneXf(sb, 'wPipe'), pw = sb.rigid('wPipe');
  sb.cyl([0, 0.38, 0], 0.017, 0.017, 0.92, { xf: PI, weights: pw, color: 0x8a8580, seg: 8, oth: 0.45 });
  sb.cyl([0, -0.04, 0], 0.02, 0.02, 0.12, { xf: PI, weights: pw, color: 0x3a2a24, seg: 8, oth: 0.4 });
  for (const y of [0.15, 0.55, 0.8]) sb.cyl([0, y, 0], 0.0185, 0.0185, 0.03, { xf: PI, weights: pw, color: 0x8a4a2a, seg: 8, oth: 0 });
  const PB = boneXf(sb, 'wPipeBack');
  sb.cyl([0, 0, 0], 0.016, 0.016, 0.9, { xf: PB, weights: sb.rigid('wPipeBack'), color: 0x8a8580, seg: 8, oth: 0.45 });
  // 火縄銃：木の銃床・黒い銃身・真鍮の帯・火ばさみと火縄（赤茶）。長さ 1.3m ほど
  const matchParts = (X, w) => {
    sb.box([0, -0.05, 0.0], [0.045, 0.34, 0.05], { xf: X, weights: w, color: 0x6a3a22, oth: 0.45 });
    sb.box([0, 0.2, 0.004], [0.036, 0.3, 0.04], { xf: X, weights: w, color: 0x7a4428, oth: 0.45 });
    sb.cyl([0, 0.72, 0.012], 0.012, 0.015, 0.92, { xf: X, weights: w, color: 0x26242a, seg: 8, oth: 0.45 });
    for (const y of [0.34, 0.58, 0.86]) sb.cyl([0, y, 0.01], 0.019, 0.019, 0.02, { xf: X, weights: w, color: 0xb8902a, seg: 8, oth: 0 });
    sb.box([0.024, 0.12, 0.02], [0.01, 0.07, 0.02], { xf: X, weights: w, color: 0x8a7a50, oth: 0.2 });
    sb.tube([[0.03, 0.15, 0.03], [0.04, 0.05, 0.05], [0.03, -0.08, 0.03]].map(q => { const v = V(...q).applyMatrix4(X); return { c: [v.x, v.y, v.z], r: [0.004, 0.004] }; }), { sides: 4, weights: w, color: 0x8a3a1a, oth: 0 });
  };
  matchParts(boneXf(sb, 'wMatch'), sb.rigid('wMatch'));
  matchParts(boneXf(sb, 'wMatchBack'), sb.rigid('wMatchBack'));
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 0.15); sb.B.wGun.add(muzzle);
  const mMuzzle = new THREE.Object3D(); mMuzzle.position.set(0, 1.18, 0.012); sb.B.wMatch.add(mMuzzle);
  const B = sb.B;
  return { katana: B.wKatana, sayaHilt: B.wSayaHilt, saya: B.wSaya, gun: B.wGun, holster: B.wHolster, holsterGun: B.wHolsterGun, pipe: B.wPipe, pipeBack: B.wPipeBack, match: B.wMatch, matchBack: B.wMatchBack, muzzle, mMuzzle, bones: true };
}

/** VRM／glTF のモデル用：手の骨に普通の網で武器を付ける（スキン網の武器の骨と同じ取り扱いができる形） */
export function attachRigidWeapons(J) {
  const mk = (parent, p, r) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); parent.add(g); return g; };
  const katana = mk(J.rightHand, [0, -0.06, 0.02], [2.1, 0, 0]);
  const add = (g, geo, c, p) => { const m = new THREE.Mesh(geo, toon(c)); m.position.set(...p); m.castShadow = true; g.add(m); return m; };
  add(katana, new THREE.BoxGeometry(0.03, 0.2, 0.034), 0x5a2a6a, [0, -0.02, 0]); add(katana, new THREE.BoxGeometry(0.011, 0.74, 0.03), 0xdde2ee, [0, 0.46, 0]);
  const gun = mk(J.rightHand, [0, -0.07, 0.03], [0, 0, 0]); add(gun, new THREE.BoxGeometry(0.03, 0.045, 0.17), 0x1c1822, [0, 0.02, 0.06]);
  const pipe = mk(J.rightHand, [0, -0.06, 0.02], [2.0, 0, 0]); add(pipe, new THREE.CylinderGeometry(0.017, 0.017, 0.92, 8), 0x8a8580, [0, 0.38, 0]);
  const match = mk(J.rightHand, [0, -0.06, 0.02], [2.0, 0, 0]); add(match, new THREE.BoxGeometry(0.04, 0.6, 0.045), 0x6a3a22, [0, 0.1, 0]); add(match, new THREE.CylinderGeometry(0.013, 0.015, 0.92, 8), 0x26242a, [0, 0.72, 0.012]);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 0.15); gun.add(muzzle);
  const mMuzzle = new THREE.Object3D(); mMuzzle.position.set(0, 1.18, 0.012); match.add(mMuzzle);
  const none = new THREE.Group(); J.hips.add(none);
  addOutlines(katana, 0.006); addOutlines(gun, 0.006); addOutlines(pipe, 0.006); addOutlines(match, 0.006);
  return { katana, gun, pipe, match, muzzle, mMuzzle, sayaHilt: none, saya: none, holster: none, holsterGun: none, pipeBack: none, matchBack: none, bones: false };
}

// ───────────────────────── 相棒 ─────────────────────────
/** 相棒（仮 ID companion・名前未定 Q8）。ふつうの人：実用的な普段着（オリーブのパーカー・ボーダーのシャツ・ジーンズ・白いスニーカー・斜めがけの鞄）、あご丈のボブ。158cm */
export function buildCompanion() {
  const k = 0.963, d = {};
  for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  Object.assign(d, { shoulderX: 0.15, hipX: 0.088, headR: 0.118 });
  const sb = new SkinBody(d);
  const SKIN = 0xffe6da, PK = 0x6f7a4f, PK2 = 0x5c6642, JEANS = 0x3c5a8a, NAVY = 0x2a3456, WHITE = 0xf2f0ea, R = d.headR;
  humanBody(sb, {
    torso: [[-0.12, 0.13, 0.11, -0.005], [0, 0.124, 0.096, -0.005], [0.12, 0.128, 0.094, -0.006], [0.3, 0.112, 0.084, 0], [0.5, 0.122, 0.092, 0.008], [0.68, 0.132, 0.096, 0.012], [0.83, 0.134, 0.086, 0.004], [0.93, 0.108, 0.07, -0.004], [1, 0.048, 0.044, 0]],
    torsoColor: (p, t) => {
      const front = p.z > 0.04, y = p.y;
      if (front && Math.abs(p.x) < 0.028 + Math.max(0, y - 1.15) * 0.1 && y > 0.86 && y < 1.3) return Math.floor(y * 55) % 2 ? NAVY : WHITE;
      if (front && Math.abs(p.x) < 0.034 && Math.abs(p.x) > 0.026 && y < 1.3) return 0xb8b8a0;     // ファスナー
      if (t < 0.02) return PK2;
      return PK;
    },
    armR: [0.046, 0.04, 0.032], armColor: (t, w) => (w === 'lower' && t > 0.84 ? PK2 : PK), cuff: PK2,
    legR: [0.07, 0.05, 0.053, 0.034], legColor: (t, w) => (w === 'lower' && t > 0.86 ? 0x2e4870 : JEANS), skin: SKIN, shoe: WHITE, sole: 0x9a9aa0, neckR: 0.033, shoeW: 0.95,
  });
  // パーカーのすそ（腰の下に少し広がる。脚に沿う重み）
  const hy = sb.W('hips').y;
  const hem = [[hy + 0.02, 0.14, 0.11], [hy - 0.07, 0.175, 0.13], [hy - 0.16, 0.19, 0.14]];
  const skirtW = (p) => { const wl = sm(-0.02, 0.06, p.x) * sm(hy, hy - 0.16, p.y) * 0.45, wr = sm(0.02, -0.06, p.x) * sm(hy, hy - 0.16, p.y) * 0.45; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube(hem.map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz] })), { sides: 16, weights: skirtW, color: (p, t) => (t > 0.8 ? PK2 : PK), capStart: false, capEnd: false, oth: 0.8 });
  // フード（首の後ろ）・ひも
  sb.blob([0, 1.27, -0.075], [0.11, 0.065, 0.05], { rot: [0.4, 0, 0], weights: sb.rigid('chest'), color: PK2, w: 12, h: 8 });
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.03, 1.27, 0.08], r: [0.004, 0.004] }, { c: [sx * 0.034, 1.17, 0.095], r: [0.004, 0.004] }], { sides: 4, weights: sb.rigid('chest'), color: 0xeae0c8, oth: 0.3 });
  // 斜めがけの鞄（右肩→左の腰）
  const strap = [[-0.11, 1.31, 0.03], [-0.07, 1.25, 0.1], [0.02, 1.08, 0.105], [0.1, 0.92, 0.085], [0.14, 0.84, 0.03]];
  sb.tube(strap.map(c => ({ c, r: [0.012, 0.004] })), { sides: 4, weights: (p) => { const t = sm(1.25, 0.9, p.y); return [[sb.bi('chest'), 1 - t], [sb.bi('hips'), t]]; }, color: 0x3a2a22, capStart: false, capEnd: false, oth: 0.5, ref: [0, 0, 1] });
  sb.box([0.15, 0.8, 0.02], [0.05, 0.14, 0.17], { rot: [0, 0.2, 0], weights: sb.rigid('hips'), color: 0x8a5a3a, oth: 0.7 });
  sb.box([0.155, 0.85, 0.02], [0.054, 0.05, 0.172], { rot: [0, 0.2, 0], weights: sb.rigid('hips'), color: 0x6a4228, oth: 0.4 });
  humanHead(sb, { R, skin: SKIN, jaw: 0.36, eyeW: 0.52, eyeH: 0.66, blush: true });
  // 髪：あご丈のボブ（左わけ）・黄色の髪留め
  const H = 0x4a3028, HD = 0x2e1c18, HL = 0x7a5444, hw = sb.rigid('head');
  hairCap(sb, R, { base: H, dark: HD, band: HL, faceZ: 0.25, hairline: 0.44, nape: -0.7, bottom: -1.0, sx: 1.12, sz: 1.13 });
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * 0.62 + i / 11 * Math.PI * 1.24;   // 横から後ろを回って反対の横へ
    const dx = Math.sin(a + Math.PI), dz = Math.cos(a + Math.PI);
    const front = Math.max(0, -dz);
    sb.strand([onHead(sb, R, [dx * 0.9, 0.55, dz * 0.9], 1.06), onHead(sb, R, [dx * 1.0, -0.15, dz * 1.0], 1.16), onHead(sb, R, [dx * 0.98, -0.75 + front * 0.1, dz * 0.95], 1.18), onHead(sb, R, [dx * 0.86, -1.02 + front * 0.12, dz * 0.82 + 0.05], 1.12)], R * 0.36, { base: H, root: HD, tip: HL, weights: hw, out: [dx, 0, dz], segs: 6, flat: 0.38 });
  }
  const bangs = [[-0.55, 0.42], [-0.25, 0.48], [0.05, 0.5], [0.35, 0.36], [0.62, 0.22]];
  for (const [x, len] of bangs) sb.strand([onHead(sb, R, [x * 0.5 - 0.15, 0.85, 0.5], 1.06), onHead(sb, R, [x * 0.85, 0.5, 0.9], 1.12), onHead(sb, R, [x * 0.95 + 0.06, 0.48 - len, 0.97], 1.1)], R * 0.24, { base: H, root: HD, tip: H, weights: hw, out: [x, 0.3, 1], segs: 5 });
  sb.box(onHead(sb, R, [0.72, 0.42, 0.55], 1.13), [0.012, 0.012, 0.05], { rot: [0.2, 0.9, 0.5], weights: hw, color: 0xf2c440, oth: 0.4 });
  // フェーズ5の細部：髪の明るい房・パーカーのポケットとファスナーの引き手・腕時計・ジーンズの縫い目とポケット・靴ひも・鞄の金具
  for (const [x, len] of [[-0.35, 0.3], [0.2, 0.36]]) sb.strand([onHead(sb, R, [x * 0.5, 0.88, 0.45], 1.08), onHead(sb, R, [x * 0.8, 0.55, 0.88], 1.13), onHead(sb, R, [x * 0.9, 0.5 - len, 0.97], 1.11)], R * 0.12, { base: HL, root: H, tip: HL, weights: hw, out: [x, 0.3, 1], segs: 4 });
  const cw2 = sb.rigid('spine'), hy2 = sb.W('hips').y;
  for (const sx of [1, -1]) { sb.box([sx * 0.07, hy2 + 0.035, 0.112], [0.075, 0.085, 0.006], { rot: [0.12, sx * 0.25, 0], weights: cw2, color: PK2, oth: 0.2 }); sb.box([sx * 0.07, hy2 + 0.078, 0.115], [0.075, 0.006, 0.004], { rot: [0.12, sx * 0.25, 0], weights: cw2, color: 0x4a5236, oth: 0 }); }
  sb.box([0.03, 1.12, 0.1], [0.008, 0.026, 0.006], { weights: sb.rigid('chest'), color: 0xc8c8b0, oth: 0 });
  { const w = sb.W('leftHand'); sb.tube([{ c: [w.x, w.y + 0.03, 0], r: [0.03, 0.028] }, { c: [w.x, w.y + 0.012, 0], r: [0.03, 0.028] }], { sides: 10, weights: sb.rigid('leftLowerArm'), color: 0x3a2a22, capStart: false, capEnd: false, oth: 0.3 }); sb.box([w.x + 0.026, w.y + 0.021, 0], [0.008, 0.024, 0.024], { weights: sb.rigid('leftLowerArm'), color: 0xd8d4c8, oth: 0.2 }); }
  for (const [UL, sx] of [['leftUpperLeg', 1], ['rightUpperLeg', -1]]) { const h = sb.W(UL), k = sb.W(UL === 'leftUpperLeg' ? 'leftLowerLeg' : 'rightLowerLeg'); sb.box([h.x + sx * 0.068, (h.y + k.y) / 2, 0], [0.004, h.y - k.y - 0.02, 0.012], { weights: sb.rigid(UL), color: 0x2e4870, oth: 0 }); sb.box([h.x, h.y - 0.04, -0.072], [0.06, 0.06, 0.006], { rot: [0.1, 0, 0], weights: sb.rigid(UL), color: 0x34507e, oth: 0.15 }); }
  for (const FT of ['leftFoot', 'rightFoot']) { const a = sb.W(FT); for (let i = 0; i < 3; i++) sb.box([a.x, a.y + 0.03 - i * 0.004, a.z + 0.06 + i * 0.022], [0.04, 0.004, 0.006], { weights: sb.rigid(FT), color: 0xd8d4cc, oth: 0 }); }
  sb.box([0.158, 0.855, 0.11], [0.03, 0.018, 0.012], { rot: [0, 0.2, 0], weights: sb.rigid('hips'), color: 0xc8a050, oth: 0.2 });
  const tex = faceAtlasExpr((g, E) => {
    drawEye(g, 0, 0, { iris: '#7a5232', dark: '#24140a', light: '#f5dcbc', lash: '#20120c', lashW: 10, rw: 40, rh: 48, lid: E.lid, happy: E.happy });
    drawBrow(g, Object.assign({ color: '#3a2618', w: 6, arch: 4 }, E.brow, { tilt: -2 + (E.brow.tilt || 0) }));
    drawMouth(g, Object.assign({ color: '#b05060', smile: 5, w: 4.5 }, E.mouth));
    drawNose(g, {});
    drawBlush(g, {});
  });
  const m = sb.build(tex, { rim: 0.5, rimColor: 0xffd8b0 });
  return Object.assign(m, { height: 1.58, provisional: true, kind: 'companion', eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

// ───────────────────────── 町の人（序章のふだんの商店街） ─────────────────────────
export function buildCivilian(seed = 1) {
  const rnd = (() => { let a = seed * 9301 + 49297; return () => ((a = (a * 9301 + 49297) % 233280) / 233280); })();
  const coat = [0x5a4a3a, 0x3a4a5a, 0x6a3a40, 0x4a5a3a, 0x7a6a5a][Math.floor(rnd() * 5)];
  const k = 0.95 + rnd() * 0.1, d = {}; for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  const sb = new SkinBody(d), R = d.headR;
  humanBody(sb, {
    torso: [[0, 0.1, 0.08, 0], [0.12, 0.13, 0.09, 0], [0.3, 0.12, 0.085, 0], [0.55, 0.13, 0.09, 0.005], [0.8, 0.145, 0.088, 0], [0.93, 0.11, 0.07, 0], [1, 0.05, 0.045, 0]],
    torsoColor: (p, t) => (t < 0.06 ? 0x2a2a30 : coat), armR: [0.045, 0.038, 0.031], armColor: () => coat, legR: [0.068, 0.048, 0.05, 0.034], legColor: () => 0x2a2a34, skin: 0xf0d6c4, shoe: 0x221c1c, sole: 0x3a3030, neckR: 0.035,
  });
  humanHead(sb, { R, skin: 0xf0d6c4, jaw: 0.32, eyeW: 0.38, eyeH: 0.46 });
  const H = [0x2a1e1a, 0x4a3a30, 0x6a6a6a][Math.floor(rnd() * 3)];
  hairCap(sb, R, { base: H, dark: H, faceZ: 0.25, hairline: 0.48, nape: -0.55, bottom: -0.7 });
  const tex = faceAtlas(g => { drawEye(g, 0, 0, { iris: '#3a2a20', rw: 30, rh: 34, lashW: 7 }); drawBrow(g, { color: '#2a1a14', w: 6 }); drawMouth(g, { kind: 'line', color: '#8a5050' }); drawNose(g, {}); });
  const m = sb.build(tex, { rim: 0.3 });
  return Object.assign(m, { height: 1.64 * k, provisional: true, kind: 'civilian', eyes: [sb.B.eyeL, sb.B.eyeR] });
}

// ───────────────────────── 異形 ─────────────────────────
/** 帰路：家に帰る途中の住人。顔は形を失い（のっぺりした面に黒いにじみ）、首と腕が少し長い。マフラーの色＝自分の家の戸の灯りの色（手掛かり） */
export function buildKiro(color = 0xd04848) {
  const d = Object.assign({}, DIM, { leg: 0.92, thigh: 0.43, shin: 0.43, neck: 0.25, headJ: 0.07, upperArm: 0.33, lowerArm: 0.32, shoulderX: 0.17, headR: 0.112 });
  const sb = new SkinBody(d), R = d.headR;
  const COAT = 0x3d4656, COAT2 = 0x2f3644, SKIN = 0xc8ccd4;
  humanBody(sb, {
    torso: [[0, 0.1, 0.08, 0], [0.12, 0.13, 0.095, 0], [0.32, 0.12, 0.09, 0], [0.55, 0.13, 0.095, 0.006], [0.8, 0.15, 0.092, 0], [0.94, 0.11, 0.07, -0.006], [1, 0.05, 0.045, 0]],
    torsoColor: (p) => (p.z > 0.05 && Math.abs(p.x) < 0.01 ? COAT2 : COAT), armR: [0.045, 0.038, 0.03], armColor: (t, w) => (w === 'lower' && t > 0.88 ? COAT2 : COAT), cuff: COAT2,
    legR: [0.07, 0.05, 0.052, 0.034], legColor: () => 0x262a33, skin: SKIN, shoe: 0x1a1a1f, sole: 0x2a2a30, neckR: 0.034, hand: 1.25,
  });
  // コートのすそ（ひざまで）
  const hy = sb.W('hips').y;
  const skirtW = (p) => { const k = sm(hy, hy - 0.45, p.y) * 0.6; const wl = sm(-0.03, 0.06, p.x) * k, wr = sm(0.03, -0.06, p.x) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube([[hy + 0.02, 0.135, 0.1], [hy - 0.15, 0.16, 0.12], [hy - 0.32, 0.185, 0.135], [hy - 0.46, 0.2, 0.145]].map(([y, rx, rz]) => ({ c: [0, y, -0.006], r: [rx, rz] })), { sides: 16, weights: skirtW, color: (p, t) => (t > 0.85 ? COAT2 : p.z > 0.1 && Math.abs(p.x) < 0.012 ? COAT2 : COAT), capStart: false, capEnd: false, oth: 0.9 });
  // 立てたえり
  sb.tube([{ c: [0, 1.38, -0.01], r: [0.075, 0.07] }, { c: [0, 1.46, -0.015], r: [0.085, 0.08] }], { sides: 12, weights: sb.rigid('neck'), color: COAT2, capStart: false, capEnd: false, oth: 0.7, ref: [0, 0, 1] });
  // マフラー（家の戸の灯りと同じ色）
  const nk = sb.W('neck');
  torusLike(sb, nk.y + 0.04, 0.072, 0.03, color, 'neck');
  sb.tube([{ c: [-0.05, nk.y + 0.02, 0.07], r: [0.035, 0.01] }, { c: [-0.06, nk.y - 0.12, 0.1], r: [0.036, 0.01] }, { c: [-0.055, nk.y - 0.27, 0.105], r: [0.034, 0.009] }], { sides: 6, weights: sb.along([[0, 'neck'], [0.4, 'chest'], [1, 'chest']]), color: (p, t) => (t > 0.85 ? 0xffffff : color), oth: 0.6 });
  // 頭：のっぺりした面・黒いにじみ（顔の絵）
  const surf = humanHead(sb, { R, skin: 0xd6d9e0, jaw: 0.25, faceless: true, ears: false });
  sb.decal([0, -0.05, 0.95], [R * 0.95, R * 1.15], UVR(0, 0, 128, 128), { surface: surf, weights: sb.rigid('head'), lift: 0.002, nx: 5, ny: 5 });
  // 短い髪のなごり
  hairCap(sb, R, { base: 0x3a3a40, dark: 0x2a2a30, faceZ: 0.1, hairline: 0.55, nape: -0.4, bottom: -0.5, sy: 1.06 });
  // 買い物袋（左手）
  const lh = sb.W('leftHand');
  sb.box([lh.x + 0.01, lh.y - 0.24, lh.z], [0.22, 0.26, 0.1], { weights: sb.rigid('leftHand'), color: 0xe8e2d0, oth: 0.8 });
  sb.tube([{ c: [lh.x - 0.06, lh.y - 0.11, lh.z], r: [0.006, 0.006] }, { c: [lh.x, lh.y - 0.03, lh.z], r: [0.006, 0.006] }, { c: [lh.x + 0.08, lh.y - 0.11, lh.z], r: [0.006, 0.006] }], { sides: 4, weights: sb.rigid('leftHand'), color: 0xd8d0b8, oth: 0.3 });
  sb.blob([lh.x + 0.03, lh.y - 0.1, lh.z + 0.01], [0.03, 0.05, 0.03], { weights: sb.rigid('leftHand'), color: 0x6a8a3a, w: 6, h: 6, oth: 0.4 });   // ねぎ
  const tex = faceAtlas(g => {
    // 顔のかわりの黒いにじみ（目・口の場所がぼやけて混ざる）
    const gr = g.createRadialGradient(64, 60, 4, 64, 66, 60); gr.addColorStop(0, 'rgba(8,8,14,.95)'); gr.addColorStop(0.45, 'rgba(10,10,18,.55)'); gr.addColorStop(1, 'rgba(10,10,18,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(64, 66, 34, 56, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(5,5,10,.9)'; for (const x of [44, 84]) { g.beginPath(); g.ellipse(x, 52, 9, 13, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(5,5,10,.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(44, 92); g.quadraticCurveTo(64, 100, 86, 90); g.stroke();
  });
  const m = sb.build(tex, { rim: 0.35, rimColor: 0x8aa0d0, outline: 0.01, outlineColor: 0x08080e, faceEmissive: 0 });
  const weak = new THREE.Object3D(); weak.position.set(0, R * 1.3, -R * 0.25); m.J.head.add(weak);
  const eyeGlow = glowEyes(m, m.J, [[R * 0.36, R * 0.82, R * 0.95], [-R * 0.36, R * 0.82, R * 0.95]]);
  return Object.assign(m, { height: 1.78, provisional: true, kind: 'kiro', weak, bodyR: 0.34, weakY: 1.68, weakColor: 0xffd27a, eyeGlow });
}
/** 光る目（紫）：頭の骨に付ける目印（光は main の光のにじみで描く） */
export function glowEyes(m, J, pts) { return pts.map(p => { const o = new THREE.Object3D(); o.position.set(...p); J.head.add(o); return o; }); }
function torusLike(sb, y, R, r, color, bone) {
  torus(sb, R, r, xfm([0, y, 0.005], [Math.PI / 2, 0, 0]), { weights: sb.rigid(bone), color, oth: 0.6, rs: 6, ts: 16 });
}

/** 閉店：閉店の手順を守り続ける店員。背中のシャッター・右腕のレジ・顔の「閉店」の札が体と混ざっている */
export function buildHeiten() {
  const d = Object.assign({}, DIM, { leg: 0.98, spine: 0.11, chest: 0.27, neck: 0.3, headJ: 0.05, headR: 0.14, shoulderX: 0.28, shoulderY: 0.24, upperArm: 0.36, lowerArm: 0.34, hipX: 0.12, thigh: 0.47, shin: 0.45 });
  const sb = new SkinBody(d), R = d.headR;
  const SH = 0x4c6a52, SH2 = 0x3f5a46, APRON = 0x2f8f5a, SKIN = 0xb9b2a6;
  humanBody(sb, {
    torso: [[0, 0.16, 0.13, 0], [0.12, 0.2, 0.15, 0], [0.32, 0.2, 0.16, 0.01], [0.55, 0.22, 0.17, 0.02], [0.78, 0.26, 0.16, 0.0], [0.92, 0.2, 0.12, -0.01], [1, 0.07, 0.065, 0]],
    torsoColor: (p, t) => (p.z > 0.06 && Math.abs(p.x) < 0.16 && t > 0.05 && t < 0.72 ? APRON : t < 0.05 ? 0x2a2b30 : SH), torsoSides: 18,
    armR: [0.064, 0.055, 0.045], armColor: (t, w) => (w === 'lower' ? SH2 : SH), legR: [0.1, 0.07, 0.072, 0.05], legColor: () => 0x2a2b30, skin: SKIN, shoe: 0x16161a, sole: 0x2a2a2a, neckR: 0.05, hand: 1.4, shoeW: 1.3,
  });
  humanHead(sb, { R, skin: SKIN, faceless: true, ears: false });
  // 顔：「閉店」の札（頭に打ち付けた板）・吊り下げのひも
  const hc = sb.hc;
  sb.card([hc.x, hc.y + 0.01, hc.z + R * 0.985 + 0.0115], [0.27, 0.31], UVR(0, 128, 128, 256), { weights: sb.rigid('head') });
  sb.box([hc.x, hc.y + 0.01, hc.z + R * 0.985], [0.29, 0.33, 0.02], { weights: sb.rigid('head'), color: 0x6b1a1a, oth: 0.8 });
  sb.tube([{ c: [hc.x - 0.1, hc.y + 0.16, hc.z + R], r: [0.004, 0.004] }, { c: [hc.x, hc.y + R * 1.2, hc.z + R * 0.6], r: [0.004, 0.004] }, { c: [hc.x + 0.1, hc.y + 0.16, hc.z + R], r: [0.004, 0.004] }], { sides: 4, weights: sb.rigid('head'), color: 0x222222, oth: 0 });
  hairCap(sb, R, { base: 0x3a3438, dark: 0x2a2428, faceZ: -0.2, hairline: 0.6, nape: -0.5, bottom: -0.6 });
  // 背中のシャッター（波板）
  const ch = sb.W('chest'), sx = xfm([0, ch.y + 0.12, -0.24], [0.14, 0, 0]);
  for (let i = 0; i < 10; i++) sb.box([0, 0.46 - i * 0.075, (i % 2) * 0.015], [0.92, 0.07, 0.035], { xf: sx, weights: sb.rigid('chest'), color: i % 2 ? 0x8d9299 : 0xa9aeb5, oth: 0.6 });
  sb.box([0, 0.54, 0], [0.98, 0.12, 0.08], { xf: sx, weights: sb.rigid('chest'), color: 0x5e6268, oth: 0.7 });
  // 右腕：レジ（引き出しが弱点）。右手はレジに飲まれている
  const la = sb.W('rightLowerArm'), rw = sb.rigid('rightLowerArm');
  sb.box([la.x, la.y - 0.3, la.z + 0.04], [0.3, 0.22, 0.34], { weights: rw, color: 0x30343a, oth: 0.8 });
  sb.box([la.x, la.y - 0.16, la.z - 0.02], [0.24, 0.08, 0.16], { rot: [-0.4, 0, 0], weights: rw, color: 0x9aa0a8, oth: 0.6 });
  sb.box([la.x, la.y - 0.43, la.z + 0.06], [0.26, 0.06, 0.3], { weights: rw, color: 0xffb040, oth: 0.3 });
  // 左手：値札の束
  const lh = sb.W('leftHand');
  for (let i = 0; i < 4; i++) sb.box([lh.x + 0.01 * i, lh.y - 0.1 - i * 0.012, lh.z + 0.05], [0.06, 0.09, 0.006], { rot: [0, 0, 0.2 * i], weights: sb.rigid('leftHand'), color: 0xf2e6c8, oth: 0.3 });
  const tex = faceAtlas(g => {
    g.fillStyle = '#efe7d0'; g.fillRect(0, 128, 128, 128); g.strokeStyle = '#6b1a1a'; g.lineWidth = 6; g.strokeRect(6, 134, 116, 116);
    g.fillStyle = '#8a1010'; g.font = 'bold 50px ' + JP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('閉', 64, 166); g.fillText('店', 64, 220);
  });
  const m = sb.build(tex, { rim: 0.3, rimColor: 0x9ad0b0, outline: 0.012, outlineColor: 0x08080e, faceEmissive: 0x101010 });
  const weak = new THREE.Object3D(); weak.position.set(0, -0.43, 0.06); m.J.rightLowerArm.add(weak);
  const eyeGlow = glowEyes(m, m.J, [[0.05, R * 1.32, R * 1.05], [-0.05, R * 1.32, R * 1.05]]);
  return Object.assign(m, { height: 2.15, provisional: true, kind: 'heiten', weak, bodyR: 0.5, weakColor: 0xffb040, eyeGlow });
}

/**
 * 収容者（避難所の個体・仮）：避難所の備品と混ざった大きな異形。銀と金の非常用毛布を重ねた胴、背中に折りたたみ椅子、
 * 頭のかわりに館内放送のスピーカー（弱点：中が光る）、胸から名札の束（「No.4?」：二桁目が破れている）。
 * 右腕の先は段ボールの仕切り板、左腕は簡易ベッドの脚のパイプ。足に小さな上履き。【仮】ENEMY_AI_SPEC の収容者を避難所に置いた版
 */
export function buildShuuyou() {
  const d = Object.assign({}, DIM, { leg: 1.0, spine: 0.15, chest: 0.36, neck: 0.18, headJ: 0.06, headR: 0.17, shoulderX: 0.38, shoulderY: 0.26, upperArm: 0.52, lowerArm: 0.5, hipX: 0.17, thigh: 0.5, shin: 0.45 });
  const sb = new SkinBody(d);
  const SIL = 0x9aa2ae, GOLD = 0xc8a850, GREY = 0x6a6e78, DARK = 0x3a3c44;
  humanBody(sb, {
    torso: [[0, 0.24, 0.2, 0], [0.12, 0.3, 0.24, 0], [0.3, 0.33, 0.27, 0.02], [0.5, 0.36, 0.3, 0.03], [0.7, 0.4, 0.3, 0.0], [0.86, 0.36, 0.25, -0.03], [0.95, 0.2, 0.15, -0.02], [1, 0.1, 0.09, 0]],
    torsoColor: (p, t, i) => { const band = Math.floor(p.y * 9 + Math.sin(p.x * 13) * 0.6); return band % 3 === 0 ? GOLD : band % 3 === 1 ? SIL : 0xb8bec8; }, torsoSides: 20,
    armR: [0.09, 0.07, 0.055], armColor: (t) => (Math.floor(t * 6) % 2 ? SIL : GREY), legR: [0.17, 0.125, 0.125, 0.085], legColor: (t) => (Math.floor(t * 5) % 2 ? GREY : SIL), skin: 0xb0b4bc, shoe: 0xf2f2ee, sole: 0x3a6ad0, neckR: 0.08, hand: 1.8, shoeW: 1.1,
  });
  // 毛布の重なり（しわ）
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; sb.blob([Math.sin(a) * 0.3, 1.35 + (i % 2) * 0.12, Math.cos(a) * 0.25], [0.16, 0.08, 0.1], { rot: [0, a, 0.3], weights: sb.rigid('spine'), color: i % 2 ? GOLD : SIL, w: 10, h: 6, oth: 0.6 }); }
  // 頭：館内放送のスピーカー（ラッパ）
  const hc = sb.hc, hw = sb.rigid('head');
  const sp = xfm([hc.x, hc.y - 0.02, hc.z + 0.04], [Math.PI / 2 + 0.25, 0, 0]);
  sb.cyl([0, 0, 0], 0.07, 0.24, 0.32, { xf: sp, weights: hw, color: 0xe8e8e0, seg: 16, open: true, oth: 0.9 });
  sb.cyl([0, -0.04, 0], 0.06, 0.2, 0.26, { xf: sp, weights: hw, color: 0x2a2a30, seg: 16, open: true, oth: 0 });
  sb.cyl([0, -0.2, 0], 0.09, 0.09, 0.12, { xf: sp, weights: hw, color: 0xc8c8c0, seg: 12, oth: 0.7 });
  sb.box([0, hc.y - 0.12, hc.z - 0.05], [0.1, 0.16, 0.1], { weights: sb.rigid('neck'), color: DARK, oth: 0.6 });
  // 名札の束（胸）
  const cy = sb.W('chest').y;
  for (let i = 0; i < 5; i++) sb.card([-0.14 + i * 0.07, cy + 0.08 - (i % 2) * 0.06, 0.33 + i * 0.002], [0.09, 0.06], i === 2 ? UVR(0, 128, 128, 192) : UVR(128, 128, 256, 192), { rot: [0.25, 0, (i - 2) * 0.15], weights: sb.rigid('chest') });
  sb.card([0.05, cy - 0.05, 0.34], [0.16, 0.1], UVR(0, 192, 128, 256), { rot: [0.2, 0, -0.1], weights: sb.rigid('chest') });
  // 背中の折りたたみ椅子（3 脚・背骨のように）
  for (let i = 0; i < 3; i++) {
    const cx = xfm([(i - 1) * 0.22, cy + 0.12 + (i === 1 ? 0.12 : 0), -0.3], [0.5 + (i === 1 ? -0.2 : 0), (i - 1) * 0.35, (i - 1) * 0.25]);
    const w = sb.rigid('chest');
    for (const x of [-0.18, 0.18]) sb.cyl([x, 0.25, 0], 0.012, 0.012, 0.8, { xf: cx, weights: w, color: 0x707880, seg: 6, oth: 0.4 });
    sb.box([0, 0.5, 0], [0.38, 0.22, 0.02], { xf: cx, weights: w, color: 0x5a6a8a, oth: 0.6 });
    sb.box([0, 0.1, 0.12], [0.38, 0.02, 0.3], { rot: [0.3, 0, 0], xf: cx, weights: w, color: 0x5a6a8a, oth: 0.6 });
  }
  // 簡易ベッドの枠が胴を貫いている（人とモノの融合）
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.55, cy - 0.35, 0.35], r: [0.018, 0.018] }, { c: [sx * 0.15, cy - 0.1, 0.1], r: [0.018, 0.018] }, { c: [-sx * 0.35, cy + 0.25, -0.35], r: [0.018, 0.018] }], { sides: 6, weights: sb.rigid('chest'), color: 0x8a929a, oth: 0.5 });
  sb.box([0, cy - 0.2, 0.32], [0.7, 0.05, 0.36], { rot: [0.9, 0.3, 0.1], weights: sb.rigid('spine'), color: 0x6a7a5a, oth: 0.6 });
  // 右腕の先：段ボールの仕切り板
  const rh = sb.W('rightHand');
  sb.box([rh.x - 0.02, rh.y - 0.32, rh.z + 0.05], [0.04, 0.72, 0.56], { weights: sb.rigid('rightHand'), color: 0xc8a878, oth: 0.8 });
  sb.box([rh.x - 0.045, rh.y - 0.32, rh.z + 0.05], [0.006, 0.6, 0.02], { weights: sb.rigid('rightHand'), color: 0x8a6a48, oth: 0 });
  // 左腕の先：簡易ベッドの脚（パイプの爪）
  const lh = sb.W('leftHand');
  for (let i = 0; i < 3; i++) sb.tube([{ c: [lh.x, lh.y - 0.04, lh.z], r: [0.016, 0.016] }, { c: [lh.x + (i - 1) * 0.06, lh.y - 0.2, lh.z + 0.08], r: [0.015, 0.015] }, { c: [lh.x + (i - 1) * 0.09, lh.y - 0.34, lh.z + 0.18], r: [0.012, 0.012] }], { sides: 6, weights: sb.rigid('leftHand'), color: 0x9098a0, oth: 0.5 });
  const tex = faceAtlas(g => {
    const tag = (x, y, w, h, text, sub) => { g.fillStyle = '#f4f2ea'; g.fillRect(x, y, w, h); g.strokeStyle = '#3a6ad0'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.fillStyle = '#1a1a2a'; g.font = 'bold 30px ' + JP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w / 2, y + h / 2 - (sub ? 8 : 0)); if (sub) { g.font = '16px ' + JP; g.fillText(sub, x + w / 2, y + h - 12); } };
    tag(0, 128, 128, 64, 'No.4', '');
    g.fillStyle = '#0c0c14'; g.beginPath(); g.moveTo(96, 128); g.lineTo(128, 128); g.lineTo(128, 192); g.lineTo(104, 192); g.lineTo(112, 160); g.closePath(); g.fill();   // 破れ
    tag(128, 128, 128, 64, 'No.—', '');
    tag(0, 192, 128, 64, '避難所', '名札');
  });
  const m = sb.build(tex, { rim: 0.35, rimColor: 0xd0d8ff, outline: 0.014, outlineColor: 0x08080e, faceEmissive: 0x202020 });
  const weak = new THREE.Object3D(); weak.position.set(0, 0.02, 0.17); m.J.head.add(weak);
  const eyeGlow = glowEyes(m, m.J, [[0.06, d.headR * 0.9, 0.2], [-0.06, d.headR * 0.9, 0.2], [0, d.headR * 0.6, 0.22]]);
  return Object.assign(m, { height: 2.6, provisional: true, kind: 'shuuyou', weak, bodyR: 0.75, weakY: 2.3, weakColor: 0xd8b0ff, eyeGlow });
}
