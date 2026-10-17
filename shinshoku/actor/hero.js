// 主要キャラクターのモデル v2（コードで組む・charkit フェーズ 4 の「1 体目」が来るまでの仮。12 フェーズ 3・7 と組）。
// 今の SkinBody（1 体＝本体・顔・輪郭線の 3 回の描画）のまま、形を作り直す：
//  ・補助の骨（肩・ひじ・股・ひざ）：子の関節の回転の半分を受け、関節の周りの頂点をなめらかに曲げる（つぶれ・ねじれを減らす）
//  ・アニメ調の頭の形（頭蓋・頬・あごの線・とがったあご・鼻・耳）。顔の陰影は charkit の SDF 風の顔影（頭の網の凸凹に左右されない）
//  ・髪は「房」を重ねる（前髪・横の房・頭の上の流れ・うなじ・ポニーテール）。毛先はとがる。揺れ物は骨の鎖（charkit/motion/spring.js）
//  ・服は層で作る（だんのうら：しまのシャツ → 前の開いたフードの上着・フード・ひも／格子のズボン・すそ／スニーカー／猫の顔のリュック・飾り）
//  ・柄（しま・格子）はシェーダーで休みの姿勢の位置から描く
// 向き：+z が前、+x がキャラクターの左。単位 m。デザインは本作独自（イメージ資料 concept_01・03・05 の設定に合わせ、他作品の意匠は写さない）。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlasExpr, UVR, filterTris, EXPR } from './skin.js';
import { handShape, buildWeaponBones, xfm, torus } from './models.js';
import { drawEyeLayers, drawBrow2, drawMouth2, drawVisemes, drawNose2, drawBlush2, MOUTH_SLOTS } from './face2.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ───────────────────────── 補助の骨 ─────────────────────────
/** 肩・ひじ・股・ひざの補助の骨を足す。sb.helpers：[補助の骨の名前, 元の関節の名前, 割合] */
export function addHelpers(sb) {
  const d = sb.d, H = [];
  for (const s of ['left', 'right']) {
    const UA = s + 'UpperArm', LA = s + 'LowerArm', UL = s + 'UpperLeg', LL = s + 'LowerLeg';
    const sp = sb.B[UA].position; sb.addBone(s + 'ShoulderH', 'chest', sp.x, sp.y, sp.z); H.push([s + 'ShoulderH', UA, 0.5]);
    sb.addBone(s + 'ElbowH', UA, 0, -d.upperArm, 0); H.push([s + 'ElbowH', LA, 0.5]);
    const hp = sb.B[UL].position; sb.addBone(s + 'HipH', 'hips', hp.x, hp.y, hp.z); H.push([s + 'HipH', UL, 0.5]);
    sb.addBone(s + 'KneeH', UL, 0, -d.thigh, 0); H.push([s + 'KneeH', LL, 0.5]);
  }
  sb.helpers = H;
  return H;
}
const _qI = new THREE.Quaternion();
/** 補助の骨を元の関節の回転の割合で回す（毎フレーム・姿勢の後） */
export function updateHelpers(B, helpers) {
  for (const [h, src, k] of helpers) { const hb = B[h], sb = B[src]; if (hb && sb) hb.quaternion.copy(_qI).slerp(sb.quaternion, k); }
}

// ───────────────────────── 頭 ─────────────────────────
/** アニメ調の頭の形：単位球の点 v を変える。o：{ jaw（あごの細さ）, chin（あごの出）, cheek, male, child } */
export function headShape(v, o = {}) {
  let x = v.x, y = v.y, z = v.z;
  const child = !!o.child;
  // 頭蓋：上を少し高く・後頭部を丸く後ろへ
  if (y > 0) y *= child ? 1.08 : 1.05;
  if (z < 0) z *= 1.07 + 0.05 * Math.max(0, y);
  // 顔の下半分：前ほど・下ほど細く（V のあご）
  const low = sm(0.02, -1.0, y), front = sm(-0.25, 0.75, z);
  const jaw = o.jaw ?? (child ? 0.3 : o.male ? 0.44 : 0.48);
  x *= 1 - jaw * low * low * (0.35 + 0.65 * front) - 0.08 * low * (1 - front);
  // 頬骨（目の下の横を少し張る：男性は少し角ばる）
  const cheek = sm(0.15, -0.25, y) * sm(-0.75, -0.25, y) * sm(0.0, 0.6, z);
  x *= 1 + (o.cheek ?? (o.male ? 0.05 : 0.03)) * cheek;
  // あごの先：前へ・下へ（男性はやや長い）
  const chin = sm(-0.5, -1.0, y) * sm(0.05, 0.85, z);
  z += (o.chin ?? (o.male ? 0.17 : 0.13)) * chin; y -= (o.male ? 0.07 : 0.04) * chin;
  // あごの下（首へつながる面）を上げる
  const under = sm(-0.45, -1.0, y) * sm(0.35, -0.55, z);
  y += 0.3 * under;
  // 顔の正面を少し平らに（目のあたり）
  if (z > 0.6) z = 0.6 + (z - 0.6) * 0.72;
  // こめかみを少しへこませる
  const temple = sm(0.55, 0.1, Math.abs(y - 0.12)) * sm(0.3, 0.75, Math.abs(x)) * sm(-0.1, 0.5, z);
  x *= 1 - 0.035 * temple;
  return v.set(x, y, z);
}
/** 頭の大きさの倍率（x,y,z） */
const HK = [0.97, 1.04, 1.0];
/** 頭の面の点（モデル空間）。dir：頭の中心からの向き、k：半径の倍 */
export function headPoint(sb, R, dir, k = 1, o = {}) {
  const d = V(...dir).normalize(); headShape(d, o);
  return [sb.hc.x + d.x * R * HK[0] * k, sb.hc.y + d.y * R * HK[1] * k, sb.hc.z + d.z * R * HK[2] * k];
}

/**
 * 頭（顔の面・鼻・耳）と顔の絵の網。o：{ R, skin, male, child, eyeX, eyeY, eyeW, eyeH, ears, blush, nose }
 * 目・口の骨（eyeL・eyeR・mouth）を足す。戻り値：顔の面の関数 surf(dir)
 */
export function heroHead(sb, o) {
  const R = o.R, hc = sb.hc, hw = sb.rigid('head');
  const surf = dir => { const v = headShape(dir.clone(), o); return V(hc.x + v.x * R * HK[0], hc.y + v.y * R * HK[1], hc.z + v.z * R * HK[2]); };
  sb.blob([hc.x, hc.y, hc.z], [R * HK[0], R * HK[1], R * HK[2]], { deform: v => headShape(v, o), weights: hw, color: o.skin, w: 44, h: 34, oth: 1, mat: 'face' });
  // 鼻（小さなくさび：横から見て鼻の線が出る）
  if (o.nose !== false) {
    const np = surf(V(0, -0.36, 1).normalize());
    sb.blob([np.x, np.y + R * 0.02, np.z - R * 0.03], [R * 0.06, R * 0.13, R * 0.08], { rot: [-0.35, 0, 0], deform: v => { if (v.z < 0) v.z *= 0.3; v.x *= 1 - 0.5 * Math.max(0, v.y); return v; }, weights: hw, color: o.skin, w: 10, h: 8, oth: 0.25, mat: 'face' });
  }
  // 耳：C の形（外の縁・内側の影）
  if (o.ears !== false) for (const sx of [1, -1]) {
    const ep = surf(V(sx, -0.12, -0.05).normalize());
    const exf = xfm([ep.x - sx * R * 0.02, ep.y, ep.z - R * 0.02], [0, sx * 0.35, sx * 0.12]);
    sb.blob([0, 0, 0], [R * 0.08, R * 0.24, R * 0.15], { xf: exf, deform: v => { v.z *= 1 - 0.3 * Math.max(0, -v.y); if (v.x * sx < 0) v.x *= 0.5; return v; }, weights: hw, color: o.skin, w: 12, h: 10, oth: 0.45, mat: 'skin' });
    sb.blob([sx * R * 0.04, -R * 0.02, R * 0.01], [R * 0.03, R * 0.15, R * 0.09], { xf: exf, weights: hw, color: new THREE.Color(o.skin).multiplyScalar(0.84), w: 8, h: 6, oth: 0, mat: 'skin' });
  }
  // 目・口の骨
  const eyeX = o.eyeX ?? 0.37, eyeY = o.eyeY ?? -0.1;
  const eL = surf(V(eyeX, eyeY, 0.92).normalize()), eR = surf(V(-eyeX, eyeY, 0.92).normalize()), mo = surf(V(0, -0.6, 0.8).normalize());
  const H = sb.W('head');
  sb.addBone('eyeL', 'head', eL.x - H.x, eL.y - H.y, eL.z - H.z);
  sb.addBone('eyeR', 'head', eR.x - H.x, eR.y - H.y, eR.z - H.z);
  sb.addBone('mouth', 'head', mo.x - H.x, mo.y - H.y, mo.z - H.z);
  const ew = o.eyeW ?? 0.5, eh = o.eyeH ?? 0.52;
  sb.decal([eyeX, eyeY, 0.92], [R * ew, R * eh], UVR(0, 0, 128, 128), { surface: surf, weights: sb.rigid('eyeL'), lift: 0.0028, nx: 5, ny: 5 });
  sb.decal([-eyeX, eyeY, 0.92], [R * ew, R * eh], UVR(0, 0, 128, 128), { surface: surf, weights: sb.rigid('eyeR'), mirrorU: true, lift: 0.0028, nx: 5, ny: 5 });
  const by = o.browY ?? 0.2;
  sb.decal([eyeX + 0.02, by, 0.9], [R * 0.46, R * 0.17], UVR(128, 0, 256, 48), { surface: surf, weights: hw, lift: 0.0034, nx: 4, ny: 1 });
  sb.decal([-eyeX - 0.02, by, 0.9], [R * 0.46, R * 0.17], UVR(128, 0, 256, 48), { surface: surf, weights: hw, mirrorU: true, lift: 0.0034, nx: 4, ny: 1 });
  sb.decal([0, -0.6, 0.8], [R * 0.34, R * 0.13], UVR(128, 48, 256, 96), { surface: surf, weights: sb.rigid('mouth'), lift: 0.0026, nx: 4, ny: 1 });
  sb.decal([0.035, -0.33, 0.96], [R * 0.12, R * 0.12], UVR(128, 96, 192, 128), { surface: surf, weights: hw, lift: 0.006, nx: 1, ny: 1 });
  if (o.blush) for (const sx of [1, -1]) sb.decal([sx * 0.55, -0.36, 0.8], [R * 0.32, R * 0.16], UVR(192, 96, 256, 128), { surface: surf, weights: hw, lift: 0.0032, nx: 2, ny: 1, mirrorU: sx < 0 });
  return surf;
}

/** 髪の帽子（頭を包む下地。顔と首は抜く） */
export function hairCap2(sb, R, o) {
  const hc = sb.hc;
  sb.blob([hc.x, hc.y + R * (o.lift ?? 0.02), hc.z - R * (o.back ?? 0.02)], [R * HK[0] * (o.sx ?? 1.07), R * HK[1] * (o.sy ?? 1.07), R * HK[2] * (o.sz ?? 1.08)], {
    deform: v => headShape(v, o), w: 34, h: 24, weights: sb.rigid('head'), mat: 'hair',
    color: p => { const y = (p.y - hc.y) / R; return y < (o.darkBelow ?? -0.25) ? o.dark : o.base; },
    keep: c => { const y = (c.y - hc.y) / R, z = (c.z - hc.z) / R, x = (c.x - hc.x) / R; if (z > (o.faceZ ?? 0.2) && y < (o.hairline ?? 0.42)) return false; if (y < (o.nape ?? -0.6) && z > -0.3) return false; if (y < (o.bottom ?? -0.95)) return false; if (Math.abs(x) > 0.72 && y < -0.05 && z > -0.1) return false; return true; },
    oth: 0.9,
  });
}

/**
 * 髪の房：根元から先へ細くなり、毛先がとがる平たい管。pts：制御点（モデル空間）、w：根元の幅。
 * opt：{ base, root, tip, weights, out（平たい面の外向き）, flat, segs, curl, mat, oth, sides, twist }
 */
export function lock(sb, pts, w, opt = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'centripetal');
  const N = Math.max(4, Math.round((opt.segs || 9))), rings = [];
  const flat = opt.flat ?? 0.32, pow = opt.taper ?? 1.15, bulge = opt.bulge ?? 0.3;
  for (let i = 0; i <= N; i++) {
    const t = i / N, c = curve.getPoint(t);
    const k = Math.max(0.02, Math.pow(1 - t, pow)) * (1 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * bulge);
    rings.push({ c: [c.x, c.y, c.z], r: [w * k, Math.max(0.0012, w * k * flat)], shape: a => [1, 1 - 0.35 * Math.abs(Math.cos(a))] });
  }
  const base = opt.base, cfn = opt.color || ((p, t) => (t < 0.15 ? opt.root ?? base : t > 0.78 ? opt.tip ?? base : base));
  return sb.tube(rings, { sides: opt.sides || 8, capStart: false, capEnd: true, capBulge: 0.15, weights: opt.weights, color: cfn, oth: opt.oth ?? ((p, t) => 0.75 * (1 - t) + 0.2), ref: opt.out, mat: opt.mat || 'hair', twist: opt.twist || 0 });
}

// ───────────────────────── 体 ─────────────────────────
/** 断面の形：前後が少し平たい楕円（a：sin(a)>0 が前） */
const torsoShape = (front = 0.92, back = 1.0) => a => { const s = Math.sin(a); return [1, s > 0 ? lerp(1, front, s * s) : lerp(1, back, s * s)]; };

/**
 * 胴の重み（腰→背骨→胸。肩のあたりは肩の補助の骨へ少し）。y の区切りは骨の位置から
 */
export function torsoWeights(sb) {
  const W = n => sb.W(n), hy = W('hips').y, sy = W('spine').y, cy = W('chest').y;
  const iH = sb.bi('hips'), iS = sb.bi('spine'), iC = sb.bi('chest'), iN = sb.bi('neck');
  const iSL = sb.B.leftShoulderH ? sb.bi('leftShoulderH') : iC, iSR = sb.B.rightShoulderH ? sb.bi('rightShoulderH') : iC;
  return p => {
    const y = p.y;
    let w;
    if (y < sy - 0.03) w = [[iH, 1]];
    else if (y < sy + 0.06) { const t = sm(sy - 0.03, sy + 0.06, y); w = [[iH, 1 - t], [iS, t]]; }
    else if (y < cy - 0.02) w = [[iS, 1]];
    else if (y < cy + 0.1) { const t = sm(cy - 0.02, cy + 0.1, y); w = [[iS, 1 - t], [iC, t]]; }
    else w = [[iC, 1]];
    // 首の付け根
    const nk = W('neck').y;
    if (y > nk - 0.02 && Math.abs(p.x) < 0.07) { const t = sm(nk - 0.02, nk + 0.03, y); w = w.map(([i, x]) => [i, x * (1 - t)]).concat([[iN, t]]); }
    // 肩
    const sh = sm(0.11, 0.18, Math.abs(p.x)) * sm(cy + 0.03, cy + 0.15, y);
    if (sh > 0) { const iSh = p.x > 0 ? iSL : iSR; w = w.map(([i, x]) => [i, x * (1 - sh * 0.7)]).concat([[iSh, sh * 0.7]]); }
    return w;
  };
}

/**
 * 体の土台：胴（下着の層＝シャツ）・首・腕（袖）・手・脚（ズボン）・靴。s：
 *  { torso:[[y,rx,rz,zoff]...], torsoMat, torsoColor, pelvis:[[y,rx,rz,zoff]...], pantsMat, pantsColor,
 *    arm:{ upper:[[t,r]...], lower:[[t,r]...], mat, color(t,which), cuff:{color,mat}, }, hand:{ k, color, glove },
 *    leg:{ upper:[[t,rx,rz]...], lower:[[t,rx,rz]...], mat, color }, shoe:{...}, skin, neckR, adamsApple }
 */
export function heroBody(sb, s) {
  const W = n => sb.W(n);
  const tw = torsoWeights(sb);
  // 胴（シャツ）
  sb.tube(s.torso.map(([y, rx, rz, zo]) => ({ c: [0, y, zo || 0], r: [rx, rz], shape: torsoShape(s.chestFlat ?? 0.9, 1.0) })), { sides: 28, sub: 2, weights: tw, color: s.torsoColor, mat: s.torsoMat || 'cloth', capStart: false, capEnd: true, fold: s.torsoFold ?? 0.25, ref: [0, 0, 1] });
  // 腰（ズボンの上）
  if (s.pelvis) sb.tube(s.pelvis.map(([y, rx, rz, zo]) => ({ c: [0, y, zo || 0], r: [rx, rz], shape: torsoShape(0.95, 0.92) })), { sides: 28, sub: 2, weights: tw, color: s.pantsColor, mat: s.pantsMat || 'cloth', capStart: true, capEnd: false, fold: 0.2, ref: [0, 0, 1] });
  // 首（男性はのど仏を少し）
  const nk = W('neck'), hd = W('head');
  sb.tube([{ c: [0, nk.y - 0.035, -0.004], r: [s.neckR * 1.15, s.neckR * 1.05] }, { c: [0, nk.y, 0.002], r: [s.neckR, s.neckR * 0.96] }, { c: [0, (nk.y + hd.y) / 2 + 0.01, 0.006], r: [s.neckR * 0.92, s.neckR * 0.92] }, { c: [0, hd.y + 0.05, 0.006], r: [s.neckR * 0.88, s.neckR * 0.9] }],
    { sides: 14, weights: sb.along([[0, 'chest'], [0.3, 'neck'], [0.7, 'neck'], [1, 'head']]), color: s.skin, capStart: false, capEnd: false, oth: 0.6, mat: 'skin' });
  if (s.adamsApple) sb.blob([0, nk.y + 0.012, s.neckR * 0.86], [0.009, 0.013, 0.008], { weights: sb.rigid('neck'), color: s.skin, w: 8, h: 6, oth: 0, mat: 'skin' });
  // 腕（袖）
  const A = s.arm;
  for (const [side, sx] of [['left', 1], ['right', -1]]) {
    const UA = side + 'UpperArm', LA = side + 'LowerArm', HA = side + 'Hand', SH = side + 'ShoulderH', EH = side + 'ElbowH';
    const sh = W(UA), el = W(LA), wr = W(HA);
    // 肩の丸み（胴と腕をつなぐ）
    sb.blob([sh.x - sx * 0.008, sh.y - 0.018, sh.z - 0.004], [A.upper[0][1] * 1.04, A.upper[0][1] * 0.82, A.upper[0][1] * 1.04], { weights: () => [[sb.bi('chest'), 0.35], [sb.bi(SH), 0.65]], color: A.color(0, 'upper'), w: 18, h: 14, mat: A.mat, fold: 0.2 });
    sb.tube(A.upper.map(([t, r]) => ({ c: [sh.x - sx * 0.004 * t, sh.y + (el.y - sh.y) * t, -0.004 * Math.sin(t * Math.PI)], r: [r, r * 0.95] })), { sides: 18, sub: 2, weights: sb.along([[0, SH], [0.2, UA], [0.78, UA], [0.98, EH]]), color: (p, t) => A.color(t, 'upper'), mat: A.mat, capStart: false, capEnd: false, fold: A.fold ?? 0.6 });
    sb.tube(A.lower.map(([t, r]) => ({ c: [el.x, el.y + (wr.y - el.y) * t, 0.004 * Math.sin(t * Math.PI)], r: [r, r * 0.9] })), { sides: 18, sub: 2, weights: sb.along([[0, EH], [0.18, LA], [0.86, LA], [1.15, HA]]), color: (p, t) => A.color(t, 'lower'), mat: A.mat, capStart: false, capEnd: !A.cuff, fold: A.fold ?? 0.6 });
    if (A.cuff) {
      const r = A.lower[A.lower.length - 1][1];
      sb.tube([{ c: [wr.x, wr.y + 0.055, 0], r: [r * 1.06, r * 1.0] }, { c: [wr.x, wr.y + 0.02, 0], r: [r * 1.04, r * 0.98] }, { c: [wr.x, wr.y + 0.006, 0], r: [r * 0.96, r * 0.9] }], { sides: 16, weights: sb.along([[0, LA], [1, LA]]), color: A.cuff.color, mat: A.cuff.mat || A.mat, capStart: false, capEnd: true, capBulge: 0.05, oth: 0.7 });
    }
    handShape(sb, HA, wr, sx, s.hand.k || 1, s.hand.color || s.skin, s.hand.glove || null);
  }
  // 脚（ズボン）
  const L = s.leg;
  for (const [side, sx] of [['left', 1], ['right', -1]]) {
    const UL = side + 'UpperLeg', LL = side + 'LowerLeg', FT = side + 'Foot', HH = side + 'HipH', KH = side + 'KneeH';
    const hp = W(UL), kn = W(LL), an = W(FT);
    sb.tube(L.upper.map(([t, rx, rz]) => ({ c: [hp.x + sx * 0.004 * (1 - t), hp.y + 0.04 + (kn.y - hp.y - 0.04) * t, 0.006 * Math.sin(t * Math.PI)], r: [rx, rz] })), { sides: 20, sub: 2, weights: sb.along([[0, HH], [0.22, UL], [0.8, UL], [0.98, KH]]), color: (p, t) => L.color(t, 'upper', p), mat: L.mat, capStart: false, capEnd: false, fold: L.fold ?? 0.5 });
    sb.tube(L.lower.map(([t, rx, rz]) => ({ c: [kn.x, kn.y + (an.y + (L.hemY ?? 0.07) - kn.y) * t, t < 0.5 ? -0.006 * Math.sin(t * Math.PI * 2) : 0], r: [rx, rz] })), { sides: 20, sub: 2, weights: sb.along([[0, KH], [0.16, LL], [0.9, LL], [1.2, FT]]), color: (p, t) => L.color(t, 'lower', p), mat: L.mat, capStart: false, capEnd: false, fold: L.fold ?? 0.5 });
    if (L.cuff) { const r = L.lower[L.lower.length - 1]; sb.tube([{ c: [an.x, an.y + (L.hemY ?? 0.07) + 0.03, 0], r: [r[1] * 1.04, r[2] * 1.04] }, { c: [an.x, an.y + (L.hemY ?? 0.07) - 0.004, 0], r: [r[1] * 1.06, r[2] * 1.06] }], { sides: 20, weights: sb.along([[0, LL], [1, LL]]), color: L.cuff.color, mat: L.cuff.mat || L.mat, capStart: false, capEnd: false, oth: 0.75 }); }
    shoe(sb, FT, an, sx, s.shoe);
  }
}

/** スニーカー（足首の骨。かかと z-0.05 〜 つま先 z+0.2） */
export function shoe(sb, FT, an, sx, o) {
  const w = sb.rigid(FT), len = o.len ?? 0.25, k = len / 0.25, wid = o.wid ?? 0.05;
  const cz = an.z + 0.072 * k;
  // 甲・つま先（下を平らに・つま先を下げる）
  sb.blob([an.x - sx * 0.002, 0.052, cz], [wid, 0.05, len * 0.5], { weights: w, color: o.upper, mat: o.mat || 'cloth', w: 22, h: 14, oth: 0.85, deform: v => { if (v.y < -0.45) v.y = -0.45; if (v.z > 0.25) v.y = Math.min(v.y, 0.62 - (v.z - 0.25) * 0.95); if (v.z < -0.5) v.y = Math.min(v.y, 0.9); v.x *= 1 - 0.18 * Math.max(0, v.z) ; return v; } });
  // 底（白・少し厚い）
  sb.blob([an.x - sx * 0.002, 0.015, cz + 0.004], [wid * 1.05, 0.017, len * 0.52], { weights: w, color: o.sole, mat: o.soleMat || 'cloth', w: 22, h: 6, oth: 0.85, deform: v => { if (v.y > 0.2) v.y = 0.2 + (v.y - 0.2) * 0.4; return v; } });
  // つま先の覆い・足首の口・ひも
  if (o.toe) sb.blob([an.x - sx * 0.002, 0.03, cz + len * 0.38], [wid * 0.92, 0.026, len * 0.16], { weights: w, color: o.toe, mat: o.soleMat || 'cloth', w: 12, h: 8, oth: 0.4 });
  sb.tube([{ c: [an.x, 0.105, an.z - 0.005], r: [0.044, 0.05] }, { c: [an.x, 0.095, an.z - 0.008], r: [0.047, 0.053] }], { sides: 14, weights: w, color: o.collar || o.upper, mat: o.mat || 'cloth', capStart: false, capEnd: false, oth: 0.5 });
  if (o.lace) for (let i = 0; i < 4; i++) sb.box([an.x - sx * 0.002, 0.085 - i * 0.008, cz + 0.005 + i * 0.024], [0.038, 0.005, 0.008], { rot: [-0.45, 0, 0], weights: w, color: o.lace, mat: 'cloth', oth: 0 });
  if (o.deco) sb.blob([an.x - sx * (wid + 0.001), 0.05, cz - 0.02], [0.004, 0.012, 0.02], { weights: w, color: o.deco, mat: 'acc', w: 6, h: 4, oth: 0 });
}

/**
 * 上着の殻（胴の外側の層）。rings：[[y,rx,rz,zoff]...]（下から）。open(y)：前の開きの半分の幅（0＝閉じる）。
 * 前の開きの縁に前立て（trim）。すそのリブ（hem）。weights は胴と同じ＋すそは股の補助の骨へ少し
 */
export function coatShell(sb, o) {
  const tw = torsoWeights(sb);
  const hy = sb.W('hips').y;
  const iHL = sb.B.leftHipH ? sb.bi('leftHipH') : sb.bi('hips'), iHR = sb.B.rightHipH ? sb.bi('rightHipH') : sb.bi('hips');
  const wfn = p => {
    let w = tw(p);
    const k = sm(hy + 0.02, hy - 0.12, p.y) * 0.45;
    if (k > 0) { const l = sm(-0.02, 0.07, p.x) * k, r = sm(0.02, -0.07, p.x) * k; w = w.map(([i, x]) => [i, x * (1 - l - r)]).concat([[iHL, l], [iHR, r]]); }
    return w;
  };
  const keep = o.open ? (c => !(c.z > 0 && Math.abs(c.x) < o.open(c.y))) : null;
  sb.tube(o.rings.map(([y, rx, rz, zo]) => ({ c: [0, y, zo || 0], r: [rx, rz], shape: torsoShape(o.frontFlat ?? 0.94, 1.0) })), { sides: 36, sub: 3, weights: wfn, color: o.color, mat: o.mat, capStart: false, capEnd: false, fold: o.fold ?? 0.35, ref: [0, 0, 1], oth: o.oth ?? 1, keep });
  return wfn;
}

/** 上着の殻の面の上の点（rings を y で補間した楕円の上で x の位置の z） */
export function shellZ(rings, y, x, frontFlat = 0.94) {
  let i = 0; while (i < rings.length - 2 && rings[i + 1][0] < y) i++;
  const a = rings[i], b = rings[i + 1], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0])));
  const rx = lerp(a[1], b[1], t), rz = lerp(a[2], b[2], t), zo = lerp(a[3] || 0, b[3] || 0, t);
  const c = Math.max(-1, Math.min(1, x / rx)), s = Math.sqrt(1 - c * c);
  return zo + rz * s * lerp(1, frontFlat, s * s);
}
/** 前立て（開きの縁）。左右 2 本の帯 */
export function coatTrim(sb, rings, open, y0, y1, o) {
  for (const sx of [1, -1]) {
    const pts = []; for (let i = 0; i <= 10; i++) { const y = lerp(y0, y1, i / 10), x = open(y) + 0.004; pts.push({ c: [sx * x, y, shellZ(rings, y, x, o.frontFlat) + 0.002], r: [o.w ?? 0.012, o.t ?? 0.006] }); }
    sb.tube(pts, { sides: 6, weights: o.weights, color: o.color, mat: o.mat, capStart: true, capEnd: true, oth: 0.55, ref: [0, 0, 1] });
  }
}

/** 顔の地図帳 v2（目の層・口の欄つき）。face：{ eye:{...drawEyeLayers の値}, brow, mouth, nose, blush, extra(g) } */
export function heroFaceTex(face, first = 'neutral') {
  const t = faceAtlasExpr((g, E) => {
    const lid = (face.eye.lid || 0) + (E.lid || 0) * 0.7;
    drawEyeLayers(g, Object.assign({}, face.eye, { lid, happy: E.happy }));
    drawBrow2(g, Object.assign({}, face.brow, E.brow, { tilt: (face.brow.tilt || 0) + (E.brow.tilt || 0), y: (face.brow.y || 0) + (E.brow.y || 0), arch: (face.brow.arch || 0) + (E.brow.arch || 0) }));
    drawMouth2(g, Object.assign({}, face.mouth, E.mouth));
    drawVisemes(g, face.mouth);
    drawNose2(g, face.nose || {});
    drawBlush2(g, face.blush || {});
    if (face.extra) face.extra(g, E);
  }, first);
  t.userData.eyeLayers = true;
  return t;
}

/** 揺れ物の鎖の骨を足す。start：親の骨の中の位置、offs：骨ごとのずれ。戻り値：骨の名前の並び */
export function boneChain(sb, prefix, parent, start, offs) {
  const names = []; let par = parent;
  offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; });
  return names;
}
/** 骨の鎖に沿った重み（t：0..1） */
export const chainWeights = (sb, names, lead = 0) => sb.along(names.map((nm, i) => [lead + (1 - lead) * i / Math.max(1, names.length - 1), nm]));

/** 体の当たり（揺れ物用）：頭・胸・腰・上腕・リュック。値は骨の中の位置（m） */
export function bodyColliders(B, o = {}) {
  const R = o.headR || 0.122;
  const list = [
    { bone: B.head, offset: [0, R * 1.0, -R * 0.08], radius: R * 0.92 },
    { bone: B.neck, offset: [0, 0.0, -0.01], radius: 0.05 },
    { bone: B.chest, offset: [-0.075, 0.09, -0.01], tail: [0.075, 0.09, -0.01], radius: o.chestR || 0.095 },
    { bone: B.chest, offset: [0, -0.02, -0.005], radius: 0.11 },
    { bone: B.spine, offset: [0, -0.02, 0], radius: 0.12 },
    { bone: B.leftUpperArm, offset: [0, 0, 0], tail: [0, -0.24, 0], radius: 0.05 },
    { bone: B.rightUpperArm, offset: [0, 0, 0], tail: [0, -0.24, 0], radius: 0.05 },
  ];
  if (o.pack) list.push({ bone: B.chest, offset: o.pack.offset, tail: o.pack.tail, radius: o.pack.radius });
  return list;
}

/** 顔の口の欄の番号（charkit/face/driver.js の codeFaceAdapter が使う） */
export { MOUTH_SLOTS };
export { EXPR };
