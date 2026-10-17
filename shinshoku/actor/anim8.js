// 主要キャラクター（v2 モデル）の歩き・走り：足を地面に固定する（足の IK）。docs/wakaba-charkit/13 §1.1（足の滑り：平らな地面で平均 ≤2cm/s）。
// 考え方：1 歩き周期（位相 2π）で体が進む距離＝歩幅 S（strideLen）。片足は周期の β（立脚の割合）の間だけ地面に着き、その間の
// 「地面に対する足の位置」を動かさない（かかと → 足の裏全体 → つま先の付け根の順に転がる）。腰の高さは着いている脚が届く高さから決め、
// 太もも・すねの角度は 2 本の骨の IK で解く（ひざは前へ曲がる）。位相の進み方は heroPhaseRate（Player・相棒・演出の移動で同じ物を使う）。
// 角度の向き（actor/rig.js）：前へ振る＝x マイナス／ひざを曲げる＝x プラス／足首：つま先を下げる＝x プラス。
const S = Math.sin, C = Math.cos;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/** 歩き → 走りの混ぜ具合（0..1） */
export const runK = v => sm(2.6, 3.6, v);
/** 1 周期（2 歩）で進む距離（m）。scale：体の大きさ（脚の長さの比） */
export function strideLen(v, scale = 1) {
  const r = runK(v);
  const walk = 0.42 + 0.56 * v, run = 1.0 + 0.31 * v;
  return Math.max(0.35, lerp(walk, run, r)) * scale;
}
/** 進んだ 1m あたりの位相（ラジアン） */
export function heroPhaseRate(v, scale = 1) { return 2 * Math.PI / strideLen(Math.max(0.05, v), scale); }

/** 脚の寸法（skin.js の DIM から）：{ thigh, shin, hipY（股関節の休みの高さ）, ankleY（足首の休みの高さ）, heel, ball（足首から かかと・つま先の付け根 m） } */
export function legDims(d) {
  const hipY = d.leg - 0.02;
  return { thigh: d.thigh, shin: d.shin, hipY, ankleY: hipY - d.thigh - d.shin, heel: 0.05 * (d.thigh / 0.4), ball: 0.15 * (d.thigh / 0.4), hipX: d.hipX };
}

/** 2 本の骨の IK（矢状面）。x：前、y：上（股関節から足首へのずれ）。戻り値 [太ももの角度（x 回転）, ひざの曲げ] */
export function legIK(x, y, L1, L2) {
  let D = Math.hypot(x, y);
  D = clamp(D, Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-5);
  const cosK = clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1);
  const knee = Math.PI - Math.acos(cosK);
  const a = Math.atan2(x, -y);                                    // 真下からの角度（前が＋）
  const b = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  return [-(a + b), knee];
}
/** 足を下げる回転（つま先を下げる＝φ＋）で足に付いた向き (x,y) を回す */
const rot = (x, y, f) => [x * C(f) + y * S(f), -x * S(f) + y * C(f)];

/**
 * 片脚の足首の位置（股関節の真下を 0 とする前後 x・地面からの高さ y）と足の傾き φ。u：周期の中の位置（0＝かかとが着く）
 * D：立脚の間に体が進む距離、P：{ beta, phi0, phi1, lift, heel, ball, ankleY, ahead }
 */
export function footAt(u, D, P) {
  const s1 = 0.12, s2 = 0.62;
  const Xa = P.ahead * D;                                         // 足の裏が平らな間の足首の位置（立脚の始めの股関節から）
  const stance = s => {
    let ax, ay, f;
    if (s < s1) { f = P.phi0 * (1 - sm(0, s1, s)); const [vx, vy] = rot(P.heel, P.ankleY, f); ax = Xa - P.heel + vx; ay = vy; }
    else if (s < s2) { f = 0; ax = Xa; ay = P.ankleY; }
    else { f = P.phi1 * sm(s2, 1, s); const [vx, vy] = rot(-P.ball, P.ankleY, f); ax = Xa + P.ball + vx; ay = vy; }
    return [ax - D * s, ay, f];
  };
  if (u < P.beta) return Object.assign(stance(u / P.beta), { 3: true });
  // 遊脚：つま先が離れた形 → 次のかかとが着く形へ。持ち上げ・すねを後ろへ（走り）
  const s = (u - P.beta) / (1 - P.beta);
  const [x0, y0, f0] = stance(1), [x1, y1, f1] = stance(0);
  const e = s * s * (3 - 2 * s);
  const x = lerp(x0, x1, e) - P.kick * S(Math.PI * clamp(s * 1.6, 0, 1)) * (1 - e);
  const y = lerp(y0, y1, e) + P.lift * Math.pow(S(Math.PI * clamp(s * 1.1, 0, 1)), 0.9);
  const f = lerp(f0, f1, sm(0.0, 0.7, s)) - 0.15 * S(Math.PI * s);
  return [x, y, f, false];
}

/**
 * 歩き・走り（足の IK）。ph：位相、v：速さ（m/s）、o：{ dims（legDims）, rate（1m あたりの位相。省くと heroPhaseRate）, scale, arms（腕の振りの倍率）, lean }
 * 戻り値：姿勢（rig.js の形）＋ _exactLegs（脚は補間しないで当てる）・_feet（試験用：足首の位置）
 */
export function locomotionIK(ph, v, o = {}) {
  const L = o.dims || legDims({ leg: 0.86, thigh: 0.4, shin: 0.385, hipX: 0.085 });
  const sc = o.scale || 1;
  const rate = o.rate || heroPhaseRate(v, sc);
  const Sx = 2 * Math.PI / rate, r = runK(v);
  const beta = lerp(0.6, 0.36, r);
  const D = beta * Sx;
  const P = { beta, phi0: lerp(-0.28, -0.12, r), phi1: lerp(0.62, 0.85, r), lift: lerp(0.055, 0.16, r) * sc + 0.02 * Math.min(1, v / 1.5), kick: lerp(0.0, 0.18, r) * sc, heel: L.heel, ball: L.ball, ankleY: L.ankleY, ahead: lerp(0.5, 0.42, r) };
  const Lm = (L.thigh + L.shin) * lerp(0.992, 0.95, r);
  const p = {}, legs = [];
  // 腰のひねり（骨盤が前へ出る脚の側へ）：股関節の前後のずれ
  const yaw = S(ph) * lerp(0.08, 0.12, r) * Math.min(1, v / 1.2);
  for (const [side, off, sx] of [['left', 0, 1], ['right', Math.PI, -1]]) {
    const u = (((ph + off - Math.PI / 2) / (2 * Math.PI)) % 1 + 1) % 1;
    const [x, y, f, st] = footAt(u, D, P);
    const hz = -sx * L.hipX * S(yaw);                             // 腰のひねりで股関節が前後へずれる分
    legs.push({ side, x: x - hz, y, f, st, u });
  }
  // 腰の高さ：着いている脚が届く高さの柔らかい最小値（走りの宙に浮く間は前後の高さをつなぐ）
  const reach = l => l.y + Math.sqrt(Math.max(0.0001, Lm * Lm - l.x * l.x));
  const kk = 0.012;
  let hs = legs.filter(l => l.st).map(reach);
  const hRest = L.hipY - lerp(0.004, 0.06, r) * sc;
  if (!hs.length) { const a = legs.map(reach); hs = [Math.min(hRest, Math.max(...a)) + 0.012 * r]; }
  let h = -kk * Math.log(hs.reduce((s, x) => s + Math.exp(-x / kk), 0) + Math.exp(-hRest / kk));
  h = Math.min(h, hRest);
  for (const l of legs) {
    const [th, kn] = legIK(l.x, l.y - h, L.thigh, L.shin);
    p[l.side + 'UpperLeg'] = [th, -yaw, 0];                        // 腰のひねりを打ち消す（YXZ：Ry(-yaw)·Rx(th)）
    p[l.side + 'LowerLeg'] = [kn, 0, 0];
    p[l.side + 'Foot'] = [-(th + kn) + l.f, 0, 0];
    l.th = th;
  }
  p.hipsY = h - L.hipY;
  const A = Math.asin(clamp(D / 2 / (L.thigh + L.shin), 0, 0.95));
  p.hips = [0, yaw, 0];
  p.spine = [lerp(0.04, 0.24, r) * Math.min(1, v / 2) + (o.lean || 0), -yaw * 1.1, S(ph) * 0.03 * Math.min(1, v / 1.2)];
  p.chest = [lerp(0, 0.04, r), -yaw * 0.9, 0];
  p.neck = [0, yaw * 0.9, 0]; p.head = [-lerp(0.02, 0.14, r), yaw * 0.5, 0];
  if (!o.noArms) {
    const k = (o.arms ?? 1) * Math.min(1, v / 1.0);
    const aL = -legs[1].th * 0.75 * k, aR = -legs[0].th * 0.75 * k;   // 反対の脚と逆に振る
    p.leftUpperArm = [-aL * lerp(0.9, 1.25, r) + lerp(0.02, -0.1, r), 0, lerp(0.1, 0.16, r)]; p.rightUpperArm = [-aR * lerp(0.9, 1.25, r) + lerp(0.02, -0.1, r), 0, -lerp(0.1, 0.16, r)];
    p.leftLowerArm = [-lerp(0.25, 1.45, r) - Math.max(0, aL) * 0.5, 0, 0]; p.rightLowerArm = [-lerp(0.25, 1.45, r) - Math.max(0, aR) * 0.5, 0, 0];
  }
  p._exactLegs = true;
  p._feet = legs;
  void A;
  return p;
}

/** 止まっている時の向き替え（その場で足を踏み替える）：turn（rad/s）から小さな足踏みの姿勢。ph：足踏みの位相 */
export function turnStep(ph, turn, o = {}) {
  const k = clamp(Math.abs(turn) / 3, 0, 1);
  const p = {};
  for (const [side, off] of [['left', 0], ['right', Math.PI]]) {
    const s = S(ph + off), up = Math.max(0, s) * 0.07 * k;
    const L = o.dims || legDims({ leg: 0.86, thigh: 0.4, shin: 0.385, hipX: 0.085 });
    const [th, kn] = legIK(0.02 * s * k, L.ankleY + up - (L.hipY - 0.01), L.thigh, L.shin);
    p[side + 'UpperLeg'] = [th, 0, 0]; p[side + 'LowerLeg'] = [kn, 0, 0]; p[side + 'Foot'] = [-(th + kn), 0, 0];
  }
  p.hipsY = -0.01 * k;
  return p;
}

/**
 * 立っている姿勢の足を地面に置く（腰を下げた構えで足が床にめり込まない）：今の太ももの角度から足の前後の位置を出し、
 * 腰の高さ（hipsY）に合わせて IK で解き直す。p を書き換えて返す
 */
export function plantFeet(p, dims) {
  const L = dims, h = L.hipY + (p.hipsY || 0);
  for (const side of ['left', 'right']) {
    const ul = p[side + 'UpperLeg'] || [0, 0, 0], ll = p[side + 'LowerLeg'] || [0, 0, 0];
    if (Math.abs(ul[0]) > 0.5 || ll[0] > 0.6) continue;               // 大きく脚を上げた姿勢はそのまま
    const x = -(L.thigh * S(ul[0]) + L.shin * S(ul[0] + ll[0]));
    const [th, kn] = legIK(x, L.ankleY - h, L.thigh, L.shin);
    p[side + 'UpperLeg'] = [th, ul[1], ul[2]]; p[side + 'LowerLeg'] = [kn, ll[1], ll[2]];
    const ft = p[side + 'Foot'] || [0, 0, 0];
    p[side + 'Foot'] = [-(th + kn), ft[1], ft[2]];
  }
  return p;
}
