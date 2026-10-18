// charkit の歩き・走りの仕組み（P13）：クリップ（charkit/anim/clips/*.json：1 周期の形をキーで持つデータ）と性格の値から、
// 足を地面に固定した姿勢（足の IK・3 次元・ひざの向き・柔らかい伸び切り）を作る。純粋な JS（three なし・node で試験できる）。
//
// 考え方（docs/wakaba-charkit/13 §1.1・07）：
//  ・1 周期（位相 0..1＝2 歩）：u＝0 で左のかかとが着く・0.5 で右。歩幅 S（1 周期で進む距離）と歩数（1 秒の歩数）は速さから決める
//    （歩数＝cadence.base＋perMS×v・脚の長さの √ で割る＝フルード数）。位相は「進んだ距離 × 2π/S」で進める（足が滑らない）。
//  ・立脚：かかと → 足の裏 → つま先の付け根の順に転がる（かかとの揺りかご・前足の揺りかご）。地面の点は世界で動かない。
//    届かない時は前足の揺りかご（かかとを上げる）を自動で増やす。
//  ・腰の高さはキーで描かない：立脚の脚の「ひざの曲げの曲線」（クリップの knee）から脚の長さを決め、両脚の柔らかい最小で出す。
//    → 着地で下がり、片脚の真ん中で上がる（歩き）／立脚の真ん中で沈む（走り）が自然に出て、ひざが「ぽん」と伸び切らない。
//    宙に浮く間（走り）は放物線でつなぐ。1 周期を 48 点で作り、なめらかにしてから使う（速さ・体の寸法ごとに覚えておく）。
//  ・骨盤：左右（立脚の側へ）・前後のゆれ・回り（踏み出す脚の側が前へ）・傾き（遊脚の側が下がる）。胸は逆に回る（肩の逆回り）。
//    首・頭は向きを保つ（安定）。腕は反対の脚と逆に振り、ひじは少し遅れて曲がる（遅れ）。
//  ・角度の向きは shinshoku/actor/rig.js と同じ：前へ振る＝x マイナス／ひざを曲げる＝x プラス／足首：つま先を下げる＝x プラス。
//    左＝+x、前＝+z、上＝+y。姿勢は [x,y,z] の YXZ のオイラー（ラジアン）。
import { CLIPS, PERSONALITY } from './clips/index.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const minJerk = t => { t = clamp(t, 0, 1); return t * t * t * (10 + t * (-15 + 6 * t)); };
const D2R = Math.PI / 180;
const wrap01 = u => ((u % 1) + 1) % 1;

// ───────── 周期のキーの補間（Catmull-Rom・継ぎ目なし）─────────
/** keys：[[u, 値], …]（u は 0..1・並び順）。周期 1 の Catmull-Rom（間隔が違ってもよい） */
export function samplePeriodic(keys, u) {
  const n = keys.length;
  if (!n) return 0;
  if (n === 1) return keys[0][1];
  u = wrap01(u);
  let i = n - 1;
  for (let k = 0; k < n; k++) if (keys[k][0] > u) { i = k - 1; break; }
  const at = j => { const m = ((j % n) + n) % n, off = Math.floor(j / n); return [keys[m][0] + off, keys[m][1]]; };
  const [u0, v0] = at(i - 1), [u1, v1] = at(i), [u2, v2] = at(i + 1), [u3, v3] = at(i + 2);
  let uu = u; if (uu < u1) uu += 1;
  const h = u2 - u1, t = h > 0 ? (uu - u1) / h : 0;
  const m1 = (v2 - v0) / (u2 - u0) * h, m2 = (v3 - v1) / (u3 - u1) * h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * v1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * v2 + (t3 - t2) * m2;
}
/** 周期でない曲線（立脚の進み s：0..1）。端は平ら */
export function sampleCurve(keys, s) {
  const n = keys.length; if (!n) return 0;
  if (s <= keys[0][0]) return keys[0][1];
  if (s >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && keys[i + 1][0] < s) i++;
  const p = j => keys[clamp(j, 0, n - 1)];
  const [u0, v0] = p(i - 1), [u1, v1] = p(i), [u2, v2] = p(i + 1), [u3, v3] = p(i + 2);
  const h = u2 - u1, t = (s - u1) / h;
  const m1 = (i === 0 ? 0 : (v2 - v0) / (u2 - u0)) * h, m2 = (i + 2 >= n ? 0 : (v3 - v1) / (u3 - u1)) * h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * v1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * v2 + (t3 - t2) * m2;
}

// ───────── 四元数（[x,y,z,w]）と YXZ のオイラー ─────────
export function qEuler(x, y, z) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3];
}
export const qMul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const qInv = a => [-a[0], -a[1], -a[2], a[3]];
export function qRot(q, v) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
/** 回転の行列の列（基底 X・Y・Z）から四元数 */
export function qFromBasis(X, Y, Z) {
  const m11 = X[0], m12 = Y[0], m13 = Z[0], m21 = X[1], m22 = Y[1], m23 = Z[1], m31 = X[2], m32 = Y[2], m33 = Z[2];
  const tr = m11 + m22 + m33;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); return [(m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s]; }
  if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); return [0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s]; }
  if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); return [(m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s]; }
  const s = 2 * Math.sqrt(1 + m33 - m11 - m22); return [(m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s];
}
/** 四元数 → YXZ のオイラー [x,y,z]（three.js の Euler.setFromQuaternion(q,'YXZ') と同じ） */
export function qToEuler(q) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  const m11 = 1 - (yy + zz), m13 = xz + wy, m21 = xy + wz, m22 = 1 - (xx + zz), m23 = yz - wx, m31 = xz - wy, m33 = 1 - (xx + yy);
  const ex = Math.asin(-clamp(m23, -1, 1));
  if (Math.abs(m23) < 0.9999999) return [ex, Math.atan2(m13, m33), Math.atan2(m21, m22)];
  return [ex, Math.atan2(-m31, m11), 0];
}
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]), cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] };
const norm = a => { const l = v3.len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// ───────── 体の寸法 ─────────
/** 脚の寸法（skin.js の DIM から）：{ thigh, shin, hipY（股関節の休みの高さ）, ankleY（足首の休みの高さ）, heel, ball, hipX, pelvisY（腰の骨の休みの高さ）} */
export function legDims(d) {
  const hipDY = d.hipDY ?? -0.02;            // 腰の骨 → 股関節の高さの差（コードの骨は -0.02。VRM は骨の位置から：charkit/runtime/vrmrt.js）
  const hipY = d.leg + hipDY;
  return { thigh: d.thigh, shin: d.shin, hipY, ankleY: hipY - d.thigh - d.shin, heel: 0.05 * (d.thigh / 0.4), ball: 0.15 * (d.thigh / 0.4), hipX: d.hipX, pelvisY: d.leg, hipDY };
}
const DEF_DIMS = legDims({ leg: 0.86, thigh: 0.4, shin: 0.385, hipX: 0.085 });

// ───────── クリップの混ぜ ─────────
/** 値：数 か [基準, 1m/s あたりの増え]（クリップの ref の速さから） */
const amp = (a, v, ref) => Array.isArray(a) ? a[0] + a[1] * (v - ref) : (a ?? 0);
/** 速さ → クリップの重み（歩き・小走り・走り・全力）。どのクリップも同じ位相（u＝0 で左のかかと）なので重ねられる */
export function gaitWeights(v, clips = CLIPS) {
  const list = clips.order.map(id => clips[id]);
  const out = list.map(() => 0);
  if (v <= list[0].blend[1]) { out[0] = 1; return out; }
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i].blend[1], b = list[i + 1].blend[0];
    if (v <= b) { if (v <= a) { out[i] = 1; return out; } const t = sm(a, b, v); out[i] = 1 - t; out[i + 1] = t; return out; }
    if (v <= list[i + 1].blend[1]) { out[i + 1] = 1; return out; }
  }
  out[list.length - 1] = 1; return out;
}
/** 走りの混ざり具合（0＝歩き・1＝走り）：歩きのクリップ以外の重み */
export function runK(v, clips = CLIPS) { const w = gaitWeights(v, clips); return 1 - w[0]; }

const PERS_DEF = { cadence: 1, stride: 1, armSwing: 1, elbow: 0, sway: 1, yaw: 1, roll: 1, bounce: 1, lean: 0, headDown: 0, stepWidth: 1, toeOut: 0, kick: 1, lift: 1, chestCounter: 1, armOut: 0, slouch: 0 };
export function personality(id) { return Object.assign({}, PERS_DEF, (PERSONALITY && PERSONALITY[id]) || {}); }

/** 1 秒の歩数（両足で）。scale：脚の長さの比 */
export function cadence(v, scale = 1, pers = PERS_DEF, clips = CLIPS) {
  const w = gaitWeights(v, clips); let c = 0;
  clips.order.forEach((id, i) => { if (w[i] > 0) { const k = clips[id].cadence; c += w[i] * (k.base + k.perMS * v); } });
  return c * (pers.cadence || 1) / Math.sqrt(scale);
}
/** 1 周期（2 歩）で進む距離（m） */
export function strideLen(v, scale = 1, pers = PERS_DEF) { const vv = Math.max(0.05, v); return Math.max(0.12, 2 * vv / cadence(vv, scale, pers)); }
/** 進んだ 1m あたりの位相（ラジアン） */
export function phaseRate(v, scale = 1, pers = PERS_DEF) { return 2 * Math.PI / strideLen(v, scale, pers); }

/** 速さ v の歩き方の値（クリップを重みで混ぜる）。tracks は関数で返す（u → 値） */
export function gaitAt(v, pers = PERS_DEF, clips = CLIPS) {
  const w = gaitWeights(v, clips), ids = clips.order;
  const g = { w, foot: {}, amp: {}, knee: null, clips: ids.map(id => clips[id]) };
  const num = (get) => ids.reduce((s, id, i) => s + (w[i] ? w[i] * get(clips[id]) : 0), 0);
  g.stance = clamp(num(c => amp(c.stance, v, c.speed.ref)), 0.25, 0.8);
  for (const k of ['heelStrikeDeg', 'toeOffDeg', 'liftM', 'kickM', 'aheadK', 'flatAt', 'heelRiseAt', 'toeOffMaxDeg', 'swingPitchDeg', 'flightG']) g.foot[k] = num(c => amp(c.foot[k], v, c.speed.ref));
  const AK = new Set(); for (const id of ids) for (const k of Object.keys(clips[id].amp)) AK.add(k);
  for (const k of AK) g.amp[k] = num(c => amp(c.amp[k], v, c.speed.ref));
  g.kneeAt = s => num(c => sampleCurve(c.knee, s));
  g.swingY = s => num(c => (c.swing ? sampleCurve(c.swing.y, s) : Math.sin(Math.PI * s)));
  g.swingZ = s => num(c => (c.swing ? sampleCurve(c.swing.z, s) : 0));
  g.track = (name, u) => num(c => (c.tracks[name] ? samplePeriodic(c.tracks[name], u) : 0));
  // 性格
  const P = pers;
  g.foot.liftM *= P.lift; g.foot.kickM *= P.kick;
  g.amp.armFwdDeg *= P.armSwing; g.amp.armBackDeg *= P.armSwing; g.amp.elbowBaseDeg += P.elbow; g.amp.armOutDeg += P.armOut;
  g.amp.swayCm *= P.sway; g.amp.pelvisYawDeg *= P.yaw; g.amp.pelvisRollDeg *= P.roll; g.amp.leanDeg += P.lean; g.amp.stepWidthM *= P.stepWidth; g.amp.toeOutDeg += P.toeOut;
  g.amp.chestCounter *= P.chestCounter; g.amp.bounce = P.bounce;
  return g;
}

// ───────── 足の軌道 ─────────
/** 足の向き φ（つま先を下げる＋）で足に付いた (z, y) を回す */
const rotZY = (z, y, f) => [y * Math.sin(f) + z * Math.cos(f), y * Math.cos(f) - z * Math.sin(f)];
/**
 * 立脚の足首（根の座標：前 z・高さ y）と足の傾き。s：立脚の進み 0..1、D：立脚の間に体が進む距離、fx：足の傾きを足す（届かない時の自動の揺りかご）
 * 戻り値 [z, y, f, 支点（'heel'|'flat'|'ball'）]
 */
export function stanceFoot(s, D, g, L, fAdd = 0) {
  const F = g.foot, s1 = F.flatAt, s2 = F.heelRiseAt;
  const Zf = F.aheadK * D - D * s;                                    // 足の裏が平らな時の足首の前後（立脚の始めは前・終わりは後ろ）
  if (s < s1) {
    const f = F.heelStrikeDeg * D2R * (1 - sm(0, s1, s)) - fAdd;
    const [dz, dy] = rotZY(L.heel, L.ankleY, f);
    return [Zf - L.heel + dz, dy, f, 'heel'];
  }
  const fr = s <= s2 ? 0 : F.toeOffDeg * D2R * Math.pow(sm(s2, 1, s), 1.2);
  if (fr + fAdd <= 0) return [Zf, L.ankleY, 0, 'flat'];
  const f = fr + fAdd;
  const [dz, dy] = rotZY(L.ball, -L.ankleY, f);
  return [Zf + L.ball - dz, -dy, f, 'ball'];
}
/** 遊脚：つま先が離れた形（立脚 s＝1）→ 次のかかとが着く形（s＝0）。σ：遊脚の進み 0..1 */
export function swingFoot(sg, D, g, L, toeOff) {
  const F = g.foot;
  const [z0, y0, f0] = toeOff || stanceFoot(1, D, g, L), [z1, y1, f1] = stanceFoot(0, D, g, L);
  const e = minJerk(sg);
  // 遊脚の形（クリップの swing.y・swing.z：持ち上げの高さ・かかとを後ろへ蹴る量の曲線）
  const z = lerp(z0, z1, e) - F.kickM * g.swingZ(sg);
  let y = lerp(y0, y1, sm(0.1, 1, sg)) + F.liftM * g.swingY(sg);
  const fm = F.swingPitchDeg * D2R;
  const f = sg < 0.5 ? lerp(f0, fm, sm(0, 0.5, sg)) : lerp(fm, f1, sm(0.5, 1, sg));
  // つま先・かかとが床にめり込まない
  const toeY = y + rotZY(L.ball, -L.ankleY, f)[1], heelY = y + rotZY(-L.heel, -L.ankleY, f)[1];
  const low = Math.min(toeY, heelY);
  if (low < 0.004 && sg > 0.05 && sg < 0.95) y += 0.004 - low;
  return [z, y, f];
}

// ───────── 脚の IK（3 次元・ひざの向き・柔らかい伸び切り）─────────
/**
 * 股関節 hj から足首の目標 t へ（根の座標）。pole：ひざの向き。戻り値 { thighQ（根の座標の太ももの回転）, knee（曲げ ラジアン）, reach（届いたか）, end（実際の足首）}
 */
export function solveLeg(hj, t, L1, L2, pole = [0, 0, 1]) {
  let d = v3.sub(t, hj); let D = v3.len(d);
  const Lmax = L1 + L2, Ls = Lmax * 0.993, Lc = Lmax * 0.9996;
  let Dc = D;
  if (D > Ls) Dc = Ls + (Lc - Ls) * (1 - Math.exp(-(D - Ls) / (Lc - Ls)));   // 柔らかい伸び切り（ひざが「ぽん」と伸びない）
  Dc = Math.max(Dc, Math.abs(L1 - L2) + 1e-3);
  const dir = D > 1e-6 ? v3.mul(d, 1 / D) : [0, -1, 0];
  const cosK = clamp((L1 * L1 + L2 * L2 - Dc * Dc) / (2 * L1 * L2), -1, 1);
  const knee = Math.PI - Math.acos(cosK);
  const b = Math.acos(clamp((L1 * L1 + Dc * Dc - L2 * L2) / (2 * L1 * Dc), -1, 1));
  let pp = v3.sub(pole, v3.mul(dir, v3.dot(pole, dir)));
  if (v3.len(pp) < 1e-5) pp = [0, 0, 1];
  pp = norm(pp);
  const w1 = norm(v3.add(v3.mul(dir, Math.cos(b)), v3.mul(pp, Math.sin(b))));   // 太ももの向き（股関節 → ひざ）
  // 太ももの骨の基底：Y＝骨の逆向き（骨は -y へ伸びる）、Z＝ひざの前、X＝Y×Z
  const Y = v3.mul(w1, -1);
  let Z = v3.sub(pp, v3.mul(w1, v3.dot(pp, w1))); Z = norm(Z);
  const X = v3.cross(Y, Z);
  return { thighQ: qFromBasis(X, Y, Z), knee, reach: D <= Ls + 1e-4, end: v3.add(hj, v3.mul(dir, Dc)), D };
}

/** 2 本の骨の IK（矢状面・前の版と同じ引数）。x：前、y：上。戻り値 [太ももの x 回転, ひざの曲げ] */
export function legIK(x, y, L1, L2) {
  let D = Math.hypot(x, y);
  D = clamp(D, Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-5);
  const cosK = clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1);
  const knee = Math.PI - Math.acos(cosK);
  const a = Math.atan2(x, -y);
  const b = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  return [-(a + b), knee];
}

/**
 * 骨盤と足の目標から脚の姿勢を作る（p に書く）。pelvis：{ y（腰の骨の高さ）, x（左右）, z（前後）, q（骨盤の回転）}、
 * feet：[{ side, x, y, z, f（足の傾き）, toeOut（ラジアン）}]
 */
export function poseLegs(p, pelvis, feet, L, o = {}) {
  const qInvP = qInv(pelvis.q);
  const out = [];
  for (const ft of feet) {
    const sx = ft.side === 'left' ? 1 : -1;
    const hj = v3.add([pelvis.x, pelvis.y, pelvis.z], qRot(pelvis.q, [sx * L.hipX, L.hipDY ?? -0.02, 0]));
    const toeOut = ft.toeOut || 0;
    const pole = [Math.sin(sx * toeOut * 0.8 + sx * (o.knock || 0)), 0, Math.cos(sx * toeOut * 0.8)];
    const r = solveLeg(hj, [ft.x, ft.y, ft.z], L.thigh, L.shin, pole);
    const thighLocal = qMul(qInvP, r.thighQ);
    const shinW = qMul(r.thighQ, qEuler(r.knee, 0, 0));
    const footW = qEuler(ft.f, sx * toeOut, 0);
    const footLocal = qMul(qInv(shinW), footW);
    p[ft.side + 'UpperLeg'] = qToEuler(thighLocal);
    p[ft.side + 'LowerLeg'] = [r.knee, 0, 0];
    p[ft.side + 'Foot'] = qToEuler(footLocal);
    out.push(Object.assign({}, ft, { knee: r.knee, reach: r.reach, end: r.end, hj }));
  }
  return out;
}

// ───────── 腰の高さの曲線（1 周期・覚えておく）─────────
const H_CACHE = new Map();
const N_H = 48;
function pelvisFrame(g, u, v) {
  const A = g.amp;
  const yaw = A.pelvisYawDeg * D2R * g.track('hips.yaw', u);
  const roll = A.pelvisRollDeg * D2R * g.track('hips.roll', u);
  const pitch = (A.pelvisTiltDeg + A.pelvisPitchDeg * g.track('hips.pitch', u)) * D2R;
  return { yaw, roll, pitch, x: A.swayCm / 100 * g.track('hips.sway', u), z: A.surgeCm / 100 * g.track('hips.surge', u), q: qEuler(pitch, yaw, roll) };
}
function footTargets(g, u, S, L) {
  const beta = g.stance, D = beta * S, W = g.amp.stepWidthM / 2, to = g.amp.toeOutDeg * D2R;
  const res = [];
  for (const [side, off, sx] of [['left', 0, 1], ['right', 0.5, -1]]) {
    const uu = wrap01(u + off);
    if (uu < beta) { const s = uu / beta; const [z, y, f, piv] = stanceFoot(s, D, g, L); res.push(Object.assign({ side, y, f, toeOut: to, st: true, s, u: uu, piv }, toeOutXZ(sx * W, z, g.foot.aheadK * D - D * s, sx * to))); }
    else {
      const sg = (uu - beta) / (1 - beta); const [z, y, f] = swingFoot(sg, D, g, L);
      const xz = toeOutXZ(sx * (W + 0.006 * Math.sin(Math.PI * sg)), z, g.foot.aheadK * D - D, sx * to * (1 - sm(0, 0.5, sg)));   // つま先の外向きのずれを遊脚の前半で戻す
      res.push({ side, x: xz.x, y, z: xz.z, f, toeOut: to, st: false, s: sg, u: uu });
    }
  }
  return res;
}
/** つま先を外へ向けた足（ψ）：足の線（平らな時の足首 Zf を通る）に沿ったずれを回す。戻り値 { x, z } */
const toeOutXZ = (x0, z, Zf, psi) => ({ x: x0 + Math.sin(psi) * (z - Zf), z: Zf + Math.cos(psi) * (z - Zf) });
/** 立脚の脚の重み（腰の高さを決める強さ）：立脚の始めに入り、かかとが上がる間に抜ける */
const legWeight = (ft) => ft.st ? 1 : sm(0.8, 1, ft.s);
function heightCurve(v, g, S, L, key) {
  if (key && H_CACHE.has(key)) return H_CACHE.get(key);
  const k = 0.006, hRest = L.pelvisY, Ls = (L.thigh + L.shin);
  const hs = new Array(N_H).fill(null);
  for (let i = 0; i < N_H; i++) {
    const u = i / N_H, P = pelvisFrame(g, u, v), feet = footTargets(g, u, S, L);
    let sum = Math.exp(-(hRest + 0.03) / k), wsum = 0;
    for (const f0 of feet) {
      const w = legWeight(f0); if (w <= 1e-4) continue;
      // 遊脚の終わり：次に着く所（かかとが着く形）へ届く高さを先に求める（着地の前に腰が下がり始める）
      let ft = f0;
      if (!f0.st) { const [z, y] = stanceFoot(0, g.stance * S, g, L); ft = Object.assign({}, f0, { z, y, s: 0 }); }
      else if (f0.s > g.foot.heelRiseAt) {                                      // かかとを上げる間：上げられる所まで上げた足首で届く高さ
        const fmax = (g.foot.toeOffMaxDeg || 55) * D2R * sm(g.foot.heelRiseAt, 1, f0.s) - g.foot.toeOffDeg * D2R * Math.pow(sm(g.foot.heelRiseAt, 1, f0.s), 1.2);
        const [z, y] = stanceFoot(f0.s, g.stance * S, g, L, Math.max(0, fmax)); ft = Object.assign({}, f0, { z, y });
      }
      const sx = ft.side === 'left' ? 1 : -1;
      const off = qRot(P.q, [sx * L.hipX, L.hipDY ?? -0.02, 0]);
      const kn = g.kneeAt(ft.s) * D2R;
      const Lk = Math.sqrt(L.thigh * L.thigh + L.shin * L.shin + 2 * L.thigh * L.shin * Math.cos(kn));
      const dx = ft.x - (P.x + off[0]), dz = ft.z - (P.z + off[2]);
      const r = ft.y + Math.sqrt(Math.max(1e-4, Lk * Lk - dx * dx - dz * dz)) - off[1];
      sum += w * Math.exp(-r / k); wsum += w;
    }
    hs[i] = wsum > 0.02 ? -k * Math.log(sum) : null;
    void Ls;
  }
  // 宙に浮く間：前後の点を放物線でつなぐ（重力 flightG）
  const T = S / Math.max(0.05, v);
  for (let i = 0; i < N_H; i++) {
    if (hs[i] != null) continue;
    let a = i, b = i; while (hs[((a - 1) % N_H + N_H) % N_H] == null && i - a < N_H) a--; a--; while (hs[(b + 1) % N_H] == null && b - i < N_H) b++; b++;
    const ia = ((a % N_H) + N_H) % N_H, ib = b % N_H;
    if (hs[ia] == null || hs[ib] == null) { hs[i] = hRest - 0.03; continue; }
    const ta = (i - a) / N_H * T, tb = (b - i) / N_H * T;
    hs[i] = lerp(hs[ia], hs[ib], (i - a) / (b - a)) + 0.5 * (g.foot.flightG || 9.8) * ta * tb;
  }
  // なめらかに（[1,2,1] を 2 回）・弾みの性格（平均からの振れを伸び縮み）
  const raw = hs.map(x => x ?? hRest);
  let cur = raw;
  for (let pass = 0; pass < 2; pass++) cur = cur.map((x, i) => (cur[(i + N_H - 1) % N_H] + 2 * x + cur[(i + 1) % N_H]) / 4);
  cur = cur.map((x, i) => -0.003 * Math.log(Math.exp(-x / 0.003) + Math.exp(-raw[i] / 0.003)));   // なめらかにしても届く高さは超えない
  const mean = cur.reduce((s, x) => s + x, 0) / N_H;
  const bn = g.amp.bounce ?? 1;
  cur = cur.map(x => (x > mean ? mean + (x - mean) * Math.min(1, bn) : x) - (g.amp.crouchCm || 0) / 100);   // 弾みを抑える性格は山だけ下げる（谷は届く高さ）
  const keys = cur.map((h, i) => [i / N_H, h]);
  if (key) { if (H_CACHE.size > 600) H_CACHE.clear(); H_CACHE.set(key, keys); }
  return keys;
}

// ───────── 歩き・走りの姿勢 ─────────
/**
 * 歩き・走り。ph：位相（ラジアン・左のかかとが着く＝π/2＋2πn：前の版と同じ）、v：速さ（m/s）
 * o：{ dims（legDims）, scale, pers（性格の id か値）, rate（1m あたりの位相：省くと phaseRate）, lean（前傾の足し：ラジアン）, noArms, turn（向きの変わる速さ rad/s）}
 * 戻り値：姿勢（rig.js の形）＋ hipsT（腰の左右・前後）・_exactLegs（脚は補間しない）・_feet（足首の目標）・_gait（試験・記録用）
 */
export function locoPose(ph, v, o = {}) {
  const L = o.dims || DEF_DIMS, sc = o.scale || 1;
  const pers = typeof o.pers === 'string' ? personality(o.pers) : Object.assign({}, PERS_DEF, o.pers || {});
  const vv = Math.max(0.05, v);
  const rate = o.rate || phaseRate(vv, sc, pers);
  const S = 2 * Math.PI / rate;
  const g = gaitAt(vv, pers);
  // 体の大きさ（脚の長さ）で長さの値を伸ばす
  g.foot.liftM *= sc; g.foot.kickM *= sc; g.amp.stepWidthM *= sc;
  const u = wrap01((ph - Math.PI / 2) / (2 * Math.PI));
  const P = pelvisFrame(g, u, vv);
  const key = o.cacheKey !== false ? `${Math.round(vv * 40)}|${Math.round(S * 400)}|${L.thigh.toFixed(3)}|${L.shin.toFixed(3)}|${L.hipX}|${o.persKey || (typeof o.pers === 'string' ? o.pers : '')}` : null;
  const hk = heightCurve(vv, g, S, L, key);
  let h = samplePeriodic(hk, u);
  const feet = footTargets(g, u, S, L);
  // 届かない立脚の足：かかとを上げる（前足の揺りかご）を自動で増やす（足の傾きの合計は toeOffMaxDeg まで）。
  // 遊脚の始めは「つま先が離れた時の形（自動の分を含む）」から始める（足が飛ばない）
  const D = g.stance * S;
  const autoRock = (side, s, uu) => {
    const sx = side === 'left' ? 1 : -1, hh = uu == null ? h : samplePeriodic(hk, wrap01(uu - (side === 'left' ? 0 : 0.5)));
    const PP = uu == null ? P : pelvisFrame(g, wrap01(uu - (side === 'left' ? 0 : 0.5)), vv);
    const hj = v3.add([PP.x, hh, PP.z], qRot(PP.q, [sx * L.hipX, L.hipDY ?? -0.02, 0]));
    const Lr = (L.thigh + L.shin) * 0.992;
    const Zf = g.foot.aheadK * D - D * s, W0 = sx * g.amp.stepWidthM / 2, psi = sx * g.amp.toeOutDeg * D2R;
    const at = f => { const [z, y, ff] = stanceFoot(s, D, g, L, f); return Object.assign({ y, f: ff, z0: z }, toeOutXZ(W0, z, Zf, psi)); };
    const far = f => { const q = at(f); return Math.hypot(q.x - hj[0], q.y - hj[1], q.z - hj[2]) - Lr; };
    if (s <= g.foot.flatAt || far(0) <= 0) return null;
    const base = stanceFoot(s, D, g, L)[2];
    let lo = 0, hi = Math.max(0, (g.foot.toeOffMaxDeg || 55) * D2R - Math.max(0, base));
    if (far(hi) <= 0) for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (far(m) > 0) lo = m; else hi = m; }
    return Object.assign(at(hi), { auto: hi });
  };
  for (const ft of feet) {
    if (ft.st) { const r = autoRock(ft.side, ft.s); if (r) Object.assign(ft, { x: r.x, y: r.y, z: r.z, f: r.f, auto: r.auto }); }
    else if (ft.s < 0.5) {
      const r = autoRock(ft.side, 1, g.stance);                              // つま先が離れた瞬間（立脚の終わり）の形
      if (r) {
        const sx = ft.side === 'left' ? 1 : -1, Zf = g.foot.aheadK * D - D, psi = sx * g.amp.toeOutDeg * D2R;
        const [z, y, f] = swingFoot(ft.s, D, g, L, [r.z0, r.y, r.f]);
        const W0 = sx * (g.amp.stepWidthM / 2 + 0.006 * Math.sin(Math.PI * ft.s)), e = sm(0, 0.5, ft.s);
        const xz = toeOutXZ(W0, z, Zf, psi * (1 - e));
        Object.assign(ft, { x: xz.x, y, z: xz.z, f });
      }
    }
  }
  const p = {};
  const legs = poseLegs(p, { x: P.x, y: h, z: P.z, q: P.q }, feet, L);
  // 骨盤
  const A = g.amp, r = runK(vv);
  p.hips = [P.pitch, P.yaw, P.roll];
  p.hipsY = h - L.pelvisY;
  p.hipsT = [P.x, 0, P.z];
  // 背骨：前傾（速さ・加速）・胸は骨盤と逆に回る（肩の逆回り）・左右の傾きは打ち消す
  const lean = (A.leanDeg * D2R) + (o.lean || 0);
  const cc = A.chestCounter;                 // 胸の世界の回り ＝ −cc × 骨盤の回り
  const spYaw = -P.yaw * (1 + cc) * 0.45, chYaw = -P.yaw * (1 + cc) * 0.55;
  const breathe = A.spineBobDeg * D2R * g.track('spine.pitch', u);
  p.spine = [lean * 0.55 - P.pitch * 0.6 + breathe + pers.slouch * 0.5, spYaw, -P.roll * 0.65];
  p.chest = [lean * 0.45 - P.pitch * 0.2 + pers.slouch * 0.3, chYaw, -P.roll * 0.3 + A.shoulderRollDeg * D2R * g.track('chest.roll', u)];
  // 首・頭：向きを保つ（胸の回りを打ち消す）・前傾を戻して前を見る・小さなうなずき
  const chestWorldYaw = P.yaw + spYaw + chYaw, stab = A.headStab;
  const pitchSum = P.pitch + p.spine[0] + p.chest[0];
  const nod = A.headNodDeg * D2R * g.track('head.nod', u);
  p.neck = [-pitchSum * stab * 0.45 + pers.headDown * 0.4, -chestWorldYaw * stab * 0.5, -(P.roll + p.spine[2] + p.chest[2]) * 0.5];
  p.head = [-pitchSum * stab * 0.45 + nod + pers.headDown * 0.6, -chestWorldYaw * stab * 0.5, -(P.roll + p.spine[2] + p.chest[2]) * 0.4];
  // 腕：反対の脚と逆（自分の脚が前の時は後ろ）・前へ大きく後ろへ小さく・ひじは遅れて曲がる・走りは体の前で内へ
  if (!o.noArms) {
    for (const [side, off, sx] of [['left', 0, 1], ['right', 0.5, -1]]) {
      const ua = wrap01(u + off);
      const sw = g.track('arm.swing', ua);                     // ＋1＝腕が前
      const ang = (sw > 0 ? A.armFwdDeg : A.armBackDeg) * sw * D2R;
      const el = A.elbowBaseDeg + A.elbowSwingDeg * g.track('arm.elbow', ua);
      const cross = A.armCrossDeg * D2R * Math.max(0, sw);
      p[side + 'UpperArm'] = [-(A.armBaseDeg * D2R + ang) - lean * 0.35, sx * cross * 0.6, sx * (A.armOutDeg * D2R + cross * 0.25)];
      p[side + 'LowerArm'] = [-el * D2R, sx * A.forearmTwistDeg * D2R, 0];
      p[side + 'Hand'] = [A.wristDeg * D2R * (0.5 + 0.5 * g.track('arm.elbow', ua)), 0, sx * 0.08];
    }
  }
  p._exactLegs = true;
  p._feet = legs.map(l => ({ side: l.side, x: l.z, y: l.y, z: l.x, f: l.f, st: l.st, u: l.u, toeOut: l.toeOut }));
  p._gait = { u, S, stance: g.stance, runK: r, h };
  return withTargets(p, L);
}

/**
 * 立っている：両足を地面に置いた IK の待機（重心の左右の移り・休む脚のひざ・呼吸）。t：秒、o：{ dims, pers, k（動きの大きさ）, turn:{ph,k}（その場の向き替えの足踏み）}
 */
export function idlePose(t, o = {}) {
  const L = o.dims || DEF_DIMS, k = o.k ?? 1;
  const pers = typeof o.pers === 'string' ? personality(o.pers) : Object.assign({}, PERS_DEF, o.pers || {});
  const sc = o.scale || 1;
  const W = 0.105 * sc * pers.stepWidth;
  // 重心の移り（8 秒ほど：左右の片方に乗って休む）
  const ws = Math.sin(t * 0.78) * 0.75 + Math.sin(t * 0.31 + 1.3) * 0.25;
  const shift = ws * 0.016 * k;
  const roll = ws * 0.045 * k;                                 // 重心の側の腰が上がる
  const br = Math.sin(t * 1.65);                               // 呼吸（約 16 回/分）
  // 腰はほとんど下げない（ひざは伸び切りの近くでとても敏感：1cm で約 20° 曲がる）。休む脚は骨盤の傾きで少し曲がる
  const P = { x: shift, y: L.pelvisY - 0.0035 - Math.abs(ws) * 0.002 * k, z: -0.004, q: qEuler(0.03, ws * 0.03 * k, roll) };
  const to = (8 + pers.toeOut * 57.3) * D2R;
  const feet = [
    { side: 'left', x: W, y: L.ankleY, z: 0.03, f: 0, toeOut: to },
    { side: 'right', x: -W, y: L.ankleY, z: -0.03, f: 0, toeOut: to * 1.2 },
  ];
  if (o.turn && o.turn.k > 0.01) {
    for (const [i, off] of [[0, 0], [1, Math.PI]]) { const s = Math.sin(o.turn.ph + off); const up = Math.max(0, s) * 0.06 * o.turn.k; feet[i].y += up; feet[i].z += 0.03 * s * o.turn.k; feet[i].f = -0.15 * Math.max(0, s) * o.turn.k; }
    P.y -= 0.012 * o.turn.k;
  }
  const p = {};
  poseLegs(p, P, feet, L);
  p.hips = qToEuler(P.q);
  p.hipsY = P.y - L.pelvisY; p.hipsT = [P.x, 0, P.z];
  p.spine = [0.02 + br * 0.012 * k + pers.slouch * 0.5, -ws * 0.02 * k, -roll * 0.55];
  p.chest = [-br * 0.022 * k + pers.slouch * 0.3, -ws * 0.015 * k, -roll * 0.3];
  p.neck = [br * 0.008 + pers.headDown * 0.4, Math.sin(t * 0.23) * 0.03 * k, roll * 0.2];
  p.head = [-br * 0.01 - 0.02 + pers.headDown * 0.6, Math.sin(t * 0.31) * 0.05 * k, roll * 0.25 + Math.sin(t * 0.19) * 0.02 * k];
  const ar = br * 0.02 * k;
  p.leftUpperArm = [0.06 + ar, -0.05, 0.1 + ar * 0.5 + roll * 0.2]; p.rightUpperArm = [0.06 + ar, 0.05, -0.1 - ar * 0.5 + roll * 0.2];
  p.leftLowerArm = [-0.22, 0.25, 0]; p.rightLowerArm = [-0.26, -0.25, 0];
  p.leftHand = [0.12, 0, 0.1]; p.rightHand = [0.12, 0, -0.1];
  p._exactLegs = true; p._planted = true;
  p._feet = feet.map(f => ({ side: f.side, x: f.z, y: f.y, z: f.x, f: f.f, st: true, toeOut: f.toeOut }));
  return withTargets(p, L);
}

/**
 * 足の目標で 2 つの姿勢をつなぐ（止まる時の「止まりの一歩」・動き出し）：from／to は locoPose／idlePose の結果（_feetT を持つ）、k：0..1。
 * 動く量の大きい足から先に（持ち上げて）運び、もう一方は後で小さく直す。腰は高さ・左右をなめらかに。上体は角度の補間。
 */
export function bridgePose(from, to, k, L = DEF_DIMS, firstEnd = 0.55, firstIdx = null) {
  const F0 = from._feetT, F1 = to._feetT;
  if (!F0 || !F1) return k < 0.5 ? from : to;
  const d = F0.map((f, i) => Math.hypot(f.x - F1[i].x, f.z - F1[i].z));
  // 先に運ぶ足：地面から離れている（高い）足。両方着いていれば動く量の大きい足。着いている足は後で（持ち上げて）直す
  const first = firstIdx != null ? firstIdx : Math.abs(F0[0].y - F0[1].y) > 0.01 ? (F0[0].y > F0[1].y ? 0 : 1) : Math.abs(F1[0].y - F1[1].y) > 0.01 ? (F1[0].y > F1[1].y ? 0 : 1) : (d[0] >= d[1] ? 0 : 1);   // 呼ぶ側が最初の値を覚えて渡す（途中で入れ替わらない）
  const feet = F0.map((f, i) => {
    const kk = i === first ? sm(0, firstEnd, k) : sm(Math.min(0.5, firstEnd - 0.05), 1, k);
    const lift = d[i] > 0.015 ? Math.sin(Math.PI * kk) * Math.min(0.06, 0.02 + d[i] * 0.25) : 0;
    const g = F1[i];
    return { side: f.side, x: lerp(f.x, g.x, kk), y: lerp(f.y, g.y, kk) + lift, z: lerp(f.z, g.z, kk), f: lerp(f.f, g.f, kk) - lift * 1.5, toeOut: lerp(f.toeOut || 0, g.toeOut || 0, kk) };
  });
  const e = sm(0, 1, k);
  const P0 = from._pelvis, P1 = to._pelvis;
  const pel = { x: lerp(P0.x, P1.x, e), y: lerp(P0.y, P1.y, e), z: lerp(P0.z, P1.z, e), q: qEuler(lerp(from.hips[0], to.hips[0], e), lerp(from.hips[1], to.hips[1], e), lerp(from.hips[2], to.hips[2], e)) };
  const p = {};
  for (const key of Object.keys(to)) if (Array.isArray(to[key]) && to[key].length === 3 && !key.endsWith('Leg') && !key.endsWith('Foot') && key !== 'hipsT') { const a = from[key] || [0, 0, 0], b = to[key]; p[key] = [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)]; }
  poseLegs(p, pel, feet, L);
  p.hips = [lerp(from.hips[0], to.hips[0], e), lerp(from.hips[1], to.hips[1], e), lerp(from.hips[2], to.hips[2], e)];
  p.hipsY = pel.y - L.pelvisY; p.hipsT = [pel.x, 0, pel.z];
  p._exactLegs = true; p._planted = true; p._feetT = feet; p._pelvis = pel; p._bridgeFirst = first;
  return p;
}
/** 姿勢に「足の目標と骨盤」を付ける（bridgePose のため）。locoPose／idlePose が呼ぶ */
export function withTargets(p, L = DEF_DIMS) {
  if (!p._feet) return p;
  p._feetT = p._feet.map(f => ({ side: f.side, x: f.z, y: f.y, z: f.x, f: f.f || 0, toeOut: f.toeOut || 0 }));
  p._pelvis = { x: p.hipsT ? p.hipsT[0] : 0, y: L.pelvisY + (p.hipsY || 0), z: p.hipsT ? p.hipsT[2] : 0 };
  return p;
}

/**
 * 床より下へ入った足を床の上へ戻す（攻撃・構え・ひるみの姿勢など、キーで描いた姿勢の脚が腰を下げた分だけ床にめり込むのを直す）。
 * 姿勢 p の脚を FK で解き、かかと・つま先の付け根が床（y=0）より下なら、足首を上げて脚を解き直す（ひざの向きは今の向き）。p を書き換えて返す
 */
export function groundClamp(p, L = DEF_DIMS, minY = -0.008) {
  const hp = p.hips || [0, 0, 0], qh = qEuler(hp[0], hp[1], hp[2]);
  const t = p.hipsT || [0, 0, 0], pel = [t[0], L.pelvisY + (p.hipsY || 0), t[2]];
  for (const side of ['left', 'right']) {
    const sx = side === 'left' ? 1 : -1;
    const ul = p[side + 'UpperLeg'] || [0, 0, 0], ll = p[side + 'LowerLeg'] || [0, 0, 0], ft = p[side + 'Foot'] || [0, 0, 0];
    const hj = v3.add(pel, qRot(qh, [sx * L.hipX, L.hipDY ?? -0.02, 0]));
    const qT = qMul(qh, qEuler(ul[0], ul[1], ul[2])), qS = qMul(qT, qEuler(ll[0], ll[1], ll[2])), qF = qMul(qS, qEuler(ft[0], ft[1], ft[2]));
    const knee = v3.add(hj, qRot(qT, [0, -L.thigh, 0])), ankle = v3.add(knee, qRot(qS, [0, -L.shin, 0]));
    const heel = v3.add(ankle, qRot(qF, [0, -L.ankleY, -L.heel])), ball = v3.add(ankle, qRot(qF, [0, -L.ankleY, L.ball]));
    const low = Math.min(heel[1], ball[1]);
    if (low >= minY) continue;
    // 足は床に平らに（向きの水平の回りだけ残す）・足首は床の上の休みの高さ（足の裏が床に着く）
    const fwd = qRot(qF, [0, 0, 1]); const yaw = Math.atan2(fwd[0], fwd[2]);
    const target = [ankle[0], Math.max(ankle[1], L.ankleY), ankle[2]];
    const kdir = v3.sub(knee, v3.mul(v3.add(hj, ankle), 0.5));
    const r = solveLeg(hj, target, L.thigh, L.shin, v3.len(kdir) > 1e-4 ? norm(kdir) : [0, 0, 1]);
    const qTl = qMul(qInv(qh), r.thighQ), shinW = qMul(r.thighQ, qEuler(r.knee, 0, 0));
    p[side + 'UpperLeg'] = qToEuler(qTl); p[side + 'LowerLeg'] = [r.knee, 0, 0];
    p[side + 'Foot'] = qToEuler(qMul(qInv(shinW), qEuler(0, yaw, 0)));
  }
  return p;
}
