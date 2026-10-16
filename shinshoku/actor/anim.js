// 手続きのアニメーション（骨の回転を状態から作る）。モーション素材が来たら AnimationMixer に置き換えられる。
// 角度はラジアン [x, y, z]。前へ振る＝x マイナス／ひざを曲げる＝x プラス／前かがみ＝背骨 x プラス。
// 歩き・走りは「足を地面に置く」ように、進んだ距離で位相を進める（phaseRate）。脚の振れ幅と歩幅を合わせて足が滑らない。
const S = Math.sin, C = Math.cos, lerp = (a, b, t) => a + (b - a) * t;
export const mix = (A, B, t) => { const o = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { if (k === 'hipsY') { o.hipsY = lerp(A.hipsY || 0, B.hipsY || 0, t); continue; } const a = A[k] || [0, 0, 0], b = B[k] || [0, 0, 0]; o[k] = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; } return o; };
export const add = (A, B) => { const o = Object.assign({}, A); for (const k of Object.keys(B)) { if (k === 'hipsY') { o.hipsY = (A.hipsY || 0) + B.hipsY; continue; } const a = A[k] || [0, 0, 0], b = B[k]; o[k] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; } return o; };
export const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const easeOut = t => t < 0 ? 0 : t > 1 ? 1 : 1 - (1 - t) * (1 - t) * (1 - t);

/** 歩幅の振れ（ラジアン）：速いほど大きく */
export function strideAmp(speed) { return Math.min(0.92, 0.42 + 0.1 * speed); }
/** 進んだ 1m あたりの位相（ラジアン）。足が地面で滑らない：支える脚が半周期（π）で動く距離 2·L·sin(A) と体の移動を合わせる */
export function phaseRate(speed, legLen = 0.78) { const A = strideAmp(Math.max(0.3, speed)); return Math.PI / (2 * legLen * Math.sin(A)); }
/** 位相 ph が「かかとが着く」瞬間をまたいだか（足音用）。戻り値 'L'|'R'|null */
export function footfall(prev, cur) {
  const k = x => Math.floor((x - Math.PI / 2) / Math.PI);
  if (k(cur) === k(prev)) return null;
  return (((k(cur) % 2) + 2) % 2) === 0 ? 'L' : 'R';
}

/** 歩き・走り（ph：位相、speed：m/s、opt.k：振れの倍率、opt.noArms） */
export function locomotion(ph, speed, opt = {}) {
  const run = speed > 3.2, A = strideAmp(speed) * (opt.k || 1) * Math.min(1, speed / 0.8);
  const L = opt.legLen || 0.78, p = {};
  let drop = 0;
  for (const [side, off] of [['left', 0], ['right', Math.PI]]) {
    const q = ph + off, th = -A * S(q), swing = C(q) > 0;
    const knee = swing ? (run ? 1.55 : 0.95) * A * Math.pow(C(q), 1.2) : 0.06 + (run ? 0.25 : 0.06) * Math.max(0, -C(q)) * A;
    p[side + 'UpperLeg'] = [th - (run ? 0.12 : 0), 0, 0];
    p[side + 'LowerLeg'] = [knee, 0, 0];
    p[side + 'Foot'] = [-(th + knee) * 0.85 + (swing ? -0.2 * A : 0), 0, 0];
    if (!swing) drop = Math.max(drop, L * (1 - C(th)));
  }
  p.hipsY = -drop * (run ? 0.4 : 0.55) - (run ? 0.04 : 0.005);
  p.hips = [0, S(ph) * 0.09 * A, S(ph) * 0.03 * A];
  p.spine = [(run ? 0.26 : 0.05) * Math.min(1, speed / 2), -S(ph) * 0.12 * A, 0];
  p.chest = [0, -S(ph) * 0.12 * A, 0];
  p.neck = [0, S(ph) * 0.1 * A, 0]; p.head = [-(run ? 0.15 : 0.03), S(ph) * 0.06 * A, 0];
  if (!opt.noArms) {
    const aL = A * S(ph + Math.PI) * -0.75, aR = A * S(ph) * -0.75;
    p.leftUpperArm = [aL * (run ? 1.3 : 1), 0, 0.1]; p.rightUpperArm = [aR * (run ? 1.3 : 1), 0, -0.1];
    p.leftLowerArm = [-(run ? 1.45 : 0.25) - Math.max(0, -aL) * 0.4, 0, 0]; p.rightLowerArm = [-(run ? 1.45 : 0.25) - Math.max(0, -aR) * 0.4, 0, 0];
  }
  return p;
}
/** 立っている：呼吸（胸がふくらむ）・重心の小さな移動 */
export function idle(t, k = 1) {
  const b = S(t * 1.7) * 0.025 * k, sw = S(t * 0.45) * 0.025 * k;
  return {
    hips: [0, 0, sw], spine: [b * 0.6, 0, -sw * 0.5], chest: [-b, 0, -sw * 0.5], neck: [b * 0.5, 0, 0], head: [-b * 0.6, S(t * 0.31) * 0.06 * k, sw * 0.4],
    leftUpperArm: [0.04 + b, 0, 0.1 + b * 0.5], rightUpperArm: [0.04 + b, 0, -0.1 - b * 0.5], leftLowerArm: [-0.18, 0, 0], rightLowerArm: [-0.18, 0, 0],
    leftUpperLeg: [0, 0, 0.03 - sw], rightUpperLeg: [0, 0, -0.03 - sw], leftLowerLeg: [0.03, 0, 0], rightLowerLeg: [0.03, 0, 0], hipsY: -Math.abs(sw) * 0.2,
  };
}
const base = ctx => (ctx.speed > 0.1 ? locomotion(ctx.phase, ctx.speed, ctx.loco) : idle(ctx.time));

// ── だんのうら ──
const KATANA_READY = { rightUpperArm: [-0.3, 0, -0.22], rightLowerArm: [-0.85, 0, 0], rightHand: [-0.15, 0, 0.25] };
const PIPE_READY = { rightUpperArm: [-0.9, 0.2, -0.55], rightLowerArm: [-1.9, 0, 0], rightHand: [0.2, 0, 0.3] };
const ATK = [
  { a: { spine: [0.05, 0.7, 0], chest: [0, 0.25, 0], rightUpperArm: [-1.6, -0.4, -1.4], rightLowerArm: [-1.0, 0, 0], rightHand: [0, 0, 0.6], leftUpperArm: [-0.4, 0, 0.4], leftUpperLeg: [-0.25, 0, 0.05], rightUpperLeg: [0.2, 0, 0] },
    b: { spine: [0.18, -0.7, 0], chest: [0, -0.3, 0], rightUpperArm: [-1.3, 0.3, 1.0], rightLowerArm: [-0.15, 0, 0], rightHand: [0, 0, -0.5], leftUpperArm: [0.3, 0, 0.5], hipsY: -0.06, leftUpperLeg: [-0.45, 0, 0.05], leftLowerLeg: [0.4, 0, 0], rightUpperLeg: [0.3, 0, 0] } },
  { a: { spine: [0.05, -0.55, 0], chest: [0, -0.2, 0], rightUpperArm: [-2.5, 0, 0.6], rightLowerArm: [-1.2, 0, 0], rightHand: [0.4, 0, 0], leftUpperArm: [-0.3, 0, 0.3], rightUpperLeg: [-0.2, 0, 0] },
    b: { spine: [0.25, 0.6, 0], chest: [0, 0.25, 0], rightUpperArm: [-0.5, 0, -0.95], rightLowerArm: [-0.25, 0, 0], rightHand: [-0.5, 0, 0], leftUpperArm: [0.2, 0, 0.6], hipsY: -0.07, rightUpperLeg: [-0.5, 0, 0], rightLowerLeg: [0.45, 0, 0], leftUpperLeg: [0.3, 0, 0] } },
  { a: { spine: [-0.18, 0, 0], rightUpperArm: [-2.95, 0, -0.1], rightLowerArm: [-0.6, 0, 0], leftUpperArm: [-2.75, 0, 0.1], leftLowerArm: [-0.6, 0, 0], rightHand: [0.6, 0, 0], leftUpperLeg: [0.3, 0, 0], rightUpperLeg: [-0.6, 0, 0], rightLowerLeg: [0.8, 0, 0] },
    b: { spine: [0.5, 0, 0], chest: [0.1, 0, 0], rightUpperArm: [-1.0, 0, 0], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-0.9, 0, 0.1], leftLowerArm: [-0.2, 0, 0], rightHand: [-0.2, 0, 0], leftUpperLeg: [-1.0, 0, 0], leftLowerLeg: [1.0, 0, 0], rightUpperLeg: [0.55, 0, 0], hipsY: -0.18 } },
];
const HEAVY = { a: { spine: [-0.25, 0.45, 0], chest: [-0.1, 0.2, 0], rightUpperArm: [-2.95, 0, -0.3], rightLowerArm: [-0.9, 0, 0], leftUpperArm: [-2.6, 0, 0.3], rightHand: [0.8, 0, 0], hipsY: -0.04, leftUpperLeg: [-0.3, 0, 0.1] },
  b: { spine: [0.65, -0.25, 0], chest: [0.15, 0, 0], rightUpperArm: [-0.7, 0, -0.2], rightLowerArm: [0, 0, 0], leftUpperArm: [-0.7, 0, 0.3], rightHand: [-0.4, 0, 0], leftUpperLeg: [-1.05, 0, 0], leftLowerLeg: [1.15, 0, 0], rightUpperLeg: [0.6, 0, 0], hipsY: -0.22 } };
// 鉄パイプ：両手で重く振る
const PIPE_ATK = [
  { a: { spine: [0.0, 0.95, 0], chest: [0, 0.35, 0], rightUpperArm: [-1.2, -0.6, -1.5], rightLowerArm: [-1.3, 0, 0], leftUpperArm: [-1.2, 0.3, -0.6], leftLowerArm: [-1.4, 0, 0], rightHand: [0.3, 0, 0.6], leftUpperLeg: [0.25, 0, 0], rightUpperLeg: [-0.3, 0, 0], hipsY: -0.05 },
    b: { spine: [0.25, -0.95, 0], chest: [0, -0.4, 0], rightUpperArm: [-1.4, 0.4, 0.9], rightLowerArm: [-0.2, 0, 0], leftUpperArm: [-1.3, -0.2, 0.9], leftLowerArm: [-0.4, 0, 0], rightHand: [0, 0, -0.6], leftUpperLeg: [-0.55, 0, 0], leftLowerLeg: [0.5, 0, 0], rightUpperLeg: [0.35, 0, 0], hipsY: -0.1 } },
  { a: { spine: [-0.3, -0.35, 0], rightUpperArm: [-2.9, 0, 0.3], rightLowerArm: [-1.1, 0, 0], leftUpperArm: [-2.8, 0, -0.2], leftLowerArm: [-1.0, 0, 0], rightHand: [0.7, 0, 0], rightUpperLeg: [-0.3, 0, 0] },
    b: { spine: [0.7, 0.3, 0], chest: [0.15, 0, 0], rightUpperArm: [-0.6, 0, -0.3], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-0.6, 0, 0.2], leftLowerArm: [-0.2, 0, 0], rightHand: [-0.4, 0, 0], rightUpperLeg: [-0.9, 0, 0], rightLowerLeg: [1.0, 0, 0], leftUpperLeg: [0.5, 0, 0], hipsY: -0.2 } },
];
const PIPE_HEAVY = { a: { spine: [-0.4, 0, 0], chest: [-0.15, 0, 0], rightUpperArm: [-3.1, 0, 0.1], rightLowerArm: [-0.5, 0, 0], leftUpperArm: [-3.0, 0, -0.1], leftLowerArm: [-0.5, 0, 0], rightHand: [0.9, 0, 0], leftUpperLeg: [0.2, 0, 0], rightUpperLeg: [-0.4, 0, 0], hipsY: 0.0 },
  b: { spine: [0.85, 0, 0], chest: [0.2, 0, 0], rightUpperArm: [-0.4, 0, 0], rightLowerArm: [0, 0, 0], leftUpperArm: [-0.45, 0, 0.1], rightHand: [-0.6, 0, 0], leftUpperLeg: [-1.1, 0, 0], leftLowerLeg: [1.2, 0, 0], rightUpperLeg: [0.65, 0, 0], hipsY: -0.26 } };
const IAI_STANCE = { spine: [0.3, 0.7, 0], chest: [0, 0.2, 0], head: [-0.2, -0.8, 0], rightUpperArm: [0.4, 0, -0.5], rightLowerArm: [-1.6, 0, 0], rightHand: [0.8, 0, 0], leftUpperArm: [0.1, 0, 0.3], leftLowerArm: [-1.2, 0, 0], leftUpperLeg: [-0.7, 0, 0.1], leftLowerLeg: [1.0, 0, 0], rightUpperLeg: [0.5, 0, -0.1], rightLowerLeg: [0.6, 0, 0], hipsY: -0.16 };
const ISSEN_END = { spine: [0.5, -0.9, 0], chest: [0, -0.3, 0], head: [-0.4, 0.9, 0], rightUpperArm: [-1.3, 0, -1.5], rightLowerArm: [0, 0, 0], rightHand: [0, 0, -0.3], leftUpperArm: [0.4, 0, 0.6], leftUpperLeg: [-1.1, 0, 0.2], leftLowerLeg: [1.3, 0, 0], rightUpperLeg: [0.8, 0, -0.1], rightLowerLeg: [0.5, 0, 0], hipsY: -0.26 };
const PARRY = { spine: [0.05, -0.3, 0], rightUpperArm: [-1.5, 0, 0.5], rightLowerArm: [-1.2, 0, 0], rightHand: [0, 0, 1.3], leftUpperArm: [-1.2, 0, -0.1], leftLowerArm: [-1.4, 0, 0], hipsY: -0.06, leftUpperLeg: [-0.3, 0, 0], leftLowerLeg: [0.3, 0, 0] };
const PIPE_PARRY = { spine: [0.1, -0.2, 0], rightUpperArm: [-1.7, 0.3, 0.4], rightLowerArm: [-1.3, 0, 0], rightHand: [0, 0, 1.4], leftUpperArm: [-1.6, -0.3, -0.4], leftLowerArm: [-1.3, 0, 0], hipsY: -0.08, leftUpperLeg: [-0.3, 0, 0], leftLowerLeg: [0.35, 0, 0] };
const AIM = { chest: [0, 0.15, 0], rightUpperArm: [-1.5, 0.15, 0.08], rightLowerArm: [-0.05, 0, 0], rightHand: [0, 0, 0], leftUpperArm: [-1.35, -0.2, -0.55], leftLowerArm: [-0.5, 0, 0], head: [0, -0.1, 0] };
const HIP = { rightUpperArm: [-1.3, 0, 0.0], rightLowerArm: [-0.2, 0, 0] };
const RELOAD = { rightUpperArm: [-0.8, 0, 0.3], rightLowerArm: [-1.0, 0, 0], leftUpperArm: [-0.7, 0, -0.5], leftLowerArm: [-1.4, 0, 0], head: [0.4, 0, 0] };
const HURT_F = { spine: [-0.4, 0.2, 0], chest: [-0.15, 0, 0], head: [-0.35, 0, 0], leftUpperArm: [-0.4, 0, 0.6], rightUpperArm: [-0.2, 0, -0.6], hipsY: -0.05, leftUpperLeg: [0.25, 0, 0], rightUpperLeg: [-0.2, 0, 0] };
const HURT_B = { spine: [0.45, -0.15, 0], chest: [0.15, 0, 0], head: [0.3, 0, 0], leftUpperArm: [0.4, 0, 0.5], rightUpperArm: [0.3, 0, -0.5], hipsY: -0.07, leftUpperLeg: [-0.3, 0, 0], leftLowerLeg: [0.4, 0, 0] };
const DEAD = { spine: [0.3, 0, 0], head: [0.5, 0, 0], leftUpperArm: [0, 0, 0.9], rightUpperArm: [0, 0, -0.9], leftUpperLeg: [-1.4, 0, 0.1], rightUpperLeg: [-1.3, 0, -0.1], leftLowerLeg: [2.0, 0, 0], rightLowerLeg: [2.0, 0, 0], hipsY: -0.55 };
const TUCK = { spine: [1.3, 0, 0], chest: [0.4, 0, 0], neck: [0.5, 0, 0], head: [0.4, 0, 0], leftUpperArm: [-0.9, 0, 0.3], rightUpperArm: [-0.9, 0, -0.3], leftLowerArm: [-1.7, 0, 0], rightLowerArm: [-1.7, 0, 0], leftUpperLeg: [-2.0, 0, 0.1], rightUpperLeg: [-1.9, 0, -0.1], leftLowerLeg: [2.3, 0, 0], rightLowerLeg: [2.2, 0, 0], hipsY: -0.1 };

/** だんのうら。ctx：{ st, f, w, speed, phase, time, aiming, issen, hurtDir } */
export function dannouraPose(ctx) {
  if (ctx.white) return whitePose(ctx);
  const { st, f, w } = ctx;
  let b = base(ctx);
  let rate = ctx.speed > 0.1 ? 0.55 : 0.2;
  const pipe = w === 'pipe' || w === 'matchlock';
  if (w === 'katana' && !['attack', 'issen', 'parry', 'charge'].includes(st.name)) b = Object.assign(b, KATANA_READY);
  if (w === 'pipe' && !['attack', 'parry', 'charge'].includes(st.name)) b = Object.assign(b, PIPE_READY);
  if (w === 'matchlock' && !['attack', 'parry', 'charge'].includes(st.name)) b = Object.assign(b, MATCH_READY);
  if (st.name === 'attack') {
    const a = st.atk; const P = pipe ? (st.step >= 8 ? PIPE_HEAVY : PIPE_ATK[st.step] || PIPE_ATK[0]) : st.step >= 8 ? HEAVY : ATK[st.step] || ATK[0];
    let t;
    if (f < a.startup) t = 0; else if (f < a.startup + a.active) t = (f - a.startup + 1) / a.active; else t = 1 + Math.min(1, (f - a.startup - a.active) / Math.max(1, a.recovery));
    let pose;
    if (f < a.startup) pose = mix(b, P.a, easeOut(f / Math.max(1, a.startup)));
    else if (t <= 1) pose = mix(P.a, P.b, easeOut(t));
    else pose = mix(P.b, Object.assign({}, b, w === 'matchlock' ? MATCH_READY : pipe ? PIPE_READY : KATANA_READY), ease((t - 1 - 0.35) / 0.65));   // 戻り：残心から構えへ
    return { pose: st.iai ? mix(IAI_STANCE, ISSEN_END, ease(Math.min(1, t))) : pose, rate: f < a.startup ? 0.5 : 0.9 };
  }
  if (st.name === 'charge') return { pose: pipe ? mix(PIPE_READY, PIPE_HEAVY.a, ease(f / 18)) : mix(HEAVY.a, IAI_STANCE, ease((f - 10) / 26)), rate: 0.25 };
  if (st.name === 'issen') {
    const k = ctx.issen || {}; const strike = k.strike || 8;
    if (f < strike) return { pose: mix(IAI_STANCE, ISSEN_END, ease(f / strike) * 0.3), rate: 0.6 };
    return { pose: ISSEN_END, rate: 0.9 };
  }
  if (st.name === 'parry') return { pose: pipe ? PIPE_PARRY : PARRY, rate: 0.7 };
  if (st.name === 'dodge') return { pose: mix(b, TUCK, Math.min(1, S(Math.min(1, f / 18) * Math.PI) * 1.6)), rate: 0.7 };
  if (st.name === 'hurt') return { pose: ctx.hurtDir === 'back' ? HURT_B : HURT_F, rate: 0.5 };
  if (st.name === 'dead') return { pose: DEAD, rate: 0.12 };
  if (st.name === 'reload') return { pose: Object.assign({}, b, RELOAD), rate: 0.3 };
  if (st.name === 'hipfire') return { pose: Object.assign({}, b, HIP), rate: 0.6 };
  if (st.name === 'swap') return { pose: Object.assign({}, b, { rightUpperArm: [-0.3, 0, -0.5], rightLowerArm: [-1.3, 0, 0] }), rate: 0.6 };
  if (w === 'handgun' && ctx.aiming) return { pose: Object.assign({}, b, AIM, { spine: [0, 0, 0] }), rate: 0.5 };
  if (w === 'handgun') return { pose: Object.assign(b, { rightUpperArm: [-0.25, 0, -0.15], rightLowerArm: [-0.6, 0, 0] }), rate };
  return { pose: b, rate };
}
/** 回避の転がり（体の回転の角度・腰の下がり）。f：回避のフレーム（全体 24） */
export function rollAt(f) {
  const t = Math.max(0, Math.min(1, (f - 1) / 17));
  const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return { angle: k * Math.PI * 2, drop: S(t * Math.PI) * 0.42 };
}

// ── 相棒・町の人 ──
export function companionPose(ctx) {
  const b = base(ctx);
  if (ctx.mode === 'hide') return { pose: { hipsY: -0.42, spine: [0.75, 0, 0], neck: [0.2, 0, 0], head: [-0.4, S(ctx.time * 0.9) * 0.3, 0], leftUpperLeg: [-1.6, 0, 0.25], rightUpperLeg: [-1.5, 0, -0.25], leftLowerLeg: [2.2, 0, 0], rightLowerLeg: [2.2, 0, 0], leftFoot: [-0.6, 0, 0], rightFoot: [-0.6, 0, 0], leftUpperArm: [-0.9, 0, 0.3], rightUpperArm: [-0.9, 0, -0.3], leftLowerArm: [-1.7, 0, 0], rightLowerArm: [-1.7, 0, 0] }, rate: 0.15 };
  if (ctx.mode === 'grabbed') return { pose: { spine: [-0.3, S(ctx.time * 9) * 0.3, 0], head: [-0.4, 0, 0], leftUpperArm: [-2.2, 0, 0.5], rightUpperArm: [-1.9, 0, -0.6], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.8, 0, 0], hipsY: 0.02 }, rate: 0.3 };
  if (ctx.mode === 'warn') return { pose: Object.assign(b, { chest: [0, 0.3, 0], rightUpperArm: [-1.55, 0.2, -0.2], rightLowerArm: [-0.1, 0, 0], head: [-0.05, 0.3, 0] }), rate: 0.35 };
  // 第6章A：瓦礫で負傷して座り込む（左腕を押さえる）／座ったまま顔を上げ、右手を伸ばして名前を呼ぶ（演出のみ・致命傷ではない）
  if (ctx.mode === 'injured' || ctx.mode === 'call') { const c = ctx.mode === 'call'; return { pose: { hipsY: -0.62, spine: [c ? -0.25 : 0.35, 0, 0.1], chest: [c ? -0.1 : 0.1, 0, 0], neck: [c ? -0.35 : 0.2, 0, 0], head: [c ? -0.4 : 0.25, c ? 0.1 * S(ctx.time * 2) : 0.15, 0.1], leftUpperLeg: [-1.3, 0, 0.35], rightUpperLeg: [-0.2, 0, -0.25], leftLowerLeg: [2.0, 0, 0], rightLowerLeg: [0.3, 0, 0], leftUpperArm: [-0.6, 0, 0.4], leftLowerArm: [-1.9, 0, 0], rightUpperArm: c ? [-2.4, 0, -0.35] : [-0.9, 0, -0.6], rightLowerArm: c ? [-0.2, 0, 0] : [-1.6, 0, 0] }, rate: c ? 0.12 : 0.2 }; }
  // 結末A：病室のベッドで上体を起こしている（足は前へ・布団の中）
  if (ctx.mode === 'bed') return { pose: { hipsY: -0.32, spine: [-0.18, 0, 0], chest: [0.05, 0, 0], neck: [0.1, 0, 0], head: [0.05, -0.25 + S(ctx.time * 0.4) * 0.05, 0], leftUpperLeg: [-1.5, 0, 0.05], rightUpperLeg: [-1.5, 0, -0.05], leftLowerLeg: [0.05, 0, 0], rightLowerLeg: [0.05, 0, 0], leftUpperArm: [-0.15, 0, 0.12], rightUpperArm: [-0.15, 0, -0.12], leftLowerArm: [-1.25, 0, 0.2], rightLowerArm: [-1.25, 0, -0.2] }, rate: 0.1 };
  if (ctx.mode === 'cower') return { pose: Object.assign(b, { spine: [0.3, 0, 0], head: [0.3, 0, 0], leftUpperArm: [-1.2, 0, 0.6], rightUpperArm: [-1.2, 0, -0.6], leftLowerArm: [-2.0, 0, 0], rightLowerArm: [-2.0, 0, 0] }), rate: 0.2 };
  if (ctx.talking) return { pose: Object.assign(b, { head: [0.05, 0.2 * S(ctx.time * 1.3), 0.05], leftUpperArm: [-0.5, 0, 0.2], leftLowerArm: [-1.2 - S(ctx.time * 2.3) * 0.2, 0, 0] }), rate: 0.12 };
  if (ctx.speed > 0.1) return { pose: b, rate: 0.55 };
  return { pose: Object.assign(b, { leftUpperArm: [-0.2, 0, 0.12], rightUpperArm: [-0.15, 0, -0.12], leftLowerArm: [-0.9, 0, 0], rightLowerArm: [-0.3, 0, 0] }), rate: 0.1 };
}
export function civilianPose(ctx) { return { pose: ctx.speed > 0.1 ? locomotion(ctx.phase, ctx.speed) : idle(ctx.time, 0.8), rate: 0.4 }; }

// ── 敵 ──
export function kiroPose(ctx) {
  const { state, t, sub } = ctx;
  const hunch = { spine: [0.32, 0, 0], chest: [0.15, 0, 0], neck: [0.28, 0, 0.08], head: [0.1, 0, 0.32 + 0.12 * S(t * 0.7)] };
  if (state === 'home') return { pose: { hipsY: -0.5, leftUpperLeg: [-1.5, 0, 0.1], rightUpperLeg: [-1.5, 0, -0.1], leftLowerLeg: [1.6, 0, 0], rightLowerLeg: [1.6, 0, 0], spine: [0.5, 0, 0], neck: [0.6, 0, 0], leftUpperArm: [-0.6, 0, 0], rightUpperArm: [-0.6, 0, 0], leftLowerArm: [-0.8, 0, 0], rightLowerArm: [-0.8, 0, 0] }, rate: 0.05 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk; const w = a.phase === 'windup' ? ease(a.t / ctx.atkDef.windup) : 1;
    if (a.name === 'grab') {
      const P = a.phase === 'windup' ? { spine: [-0.15, 0, 0], neck: [-0.2, 0, 0], leftUpperArm: [-1.6, 0, 1.3 * w], rightUpperArm: [-1.6, 0, -1.3 * w], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0], head: [-0.4, 0, 0.5 * w] }
        : { spine: [0.55, 0, 0], leftUpperArm: [-1.5, 0, 0.1], rightUpperArm: [-1.5, 0, -0.1], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0], leftUpperLeg: [-0.5, 0, 0], leftLowerLeg: [0.4, 0, 0] };
      return { pose: P, rate: a.phase === 'windup' ? 0.15 : 0.6 };
    }
    const P = a.phase === 'windup' ? { spine: [-0.2, 0.35 * w, 0], leftUpperArm: [0.7 * w, 0, 0.3], rightUpperArm: [0.7 * w, 0, -0.3], leftLowerArm: [-1.2, 0, 0], rightLowerArm: [-1.2, 0, 0], head: [0, 0, 0.5] }
      : { spine: [0.45, -0.2, 0], leftUpperArm: [-1.5, 0, 0], rightUpperArm: [-1.5, 0, 0], leftLowerArm: [0, 0, 0], rightLowerArm: [0, 0, 0], rightUpperLeg: [-0.5, 0, 0], rightLowerLeg: [0.3, 0, 0] };
    return { pose: P, rate: a.phase === 'windup' ? 0.2 : 0.7 };
  }
  if (state === 'stagger') return { pose: { spine: [-0.5, 0.3, 0], head: [-0.6, 0, 0.3], leftUpperArm: [-0.5, 0, 0.8], rightUpperArm: [0.2, 0, -0.9], hipsY: -0.06, leftUpperLeg: [0.3, 0, 0], rightUpperLeg: [-0.3, 0, 0], rightLowerLeg: [0.5, 0, 0] }, rate: 0.3 };
  if (state === 'loop' && sub === 'knock') return { pose: Object.assign(idle(t, 0.5), hunch, { rightUpperArm: [-1.45, 0, 0.1], rightLowerArm: [-0.5 - Math.max(0, S(t * 7.8)) * 0.7, 0, 0], leftUpperArm: [0.05, 0, 0.1] }), rate: 0.3 };
  if (state === 'assess') return { pose: Object.assign({}, idle(t, 0.4), hunch, { head: [0.0, 0, 0.6 * S(t * 2)], neck: [0.1, 0, 0.25] }), rate: 0.1 };
  if (state === 'family') return { pose: Object.assign(locomotion(ctx.phase, ctx.speed || 0, { k: 0.7 }), { spine: [0.1, 0, 0], head: [-0.1, 0, 0.1] }), rate: 0.4 };
  const sp = ctx.speed || 0;
  const loc = sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.75 }) : idle(t, 0.5);
  return { pose: Object.assign(loc, hunch, sp > 2.5 ? { spine: [0.6, 0, 0], leftUpperArm: [-0.9, 0, 0.2], rightUpperArm: [-0.9, 0, -0.2] } : { leftUpperArm: [-0.1, 0, 0.08], rightUpperArm: [-0.25 + S(ctx.phase) * 0.15, 0, -0.08] }), rate: 0.4 };
}
export function heitenPose(ctx) {
  const { state, t } = ctx;
  if (state === 'rest') return { pose: { spine: [1.0, 0, 0], neck: [0.4, 0, 0], leftUpperArm: [0.1, 0, 0.1], rightUpperArm: [0.1, 0, -0.1], hipsY: -0.05 }, rate: 0.03 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk; const w = a.phase === 'windup' ? ease(a.t / ctx.atkDef.windup) : 1; const act = a.phase !== 'windup';
    if (a.name === 'jab') return { pose: act ? { spine: [0.3, -0.4, 0], rightUpperArm: [-1.6, 0, 0], rightLowerArm: [0, 0, 0] } : { spine: [-0.1, 0.5 * w, 0], rightUpperArm: [0.6 * w, 0, -0.4], rightLowerArm: [-1.5, 0, 0] }, rate: act ? 0.7 : 0.2 };
    if (a.name === 'shelf') return { pose: act ? { spine: [0.3, 0.7, 0], leftUpperArm: [-1.4, 0, -1.0], leftLowerArm: [0, 0, 0] } : { spine: [0, -0.8 * w, 0], leftUpperArm: [-1.2, 0, 1.4 * w], leftLowerArm: [-0.4, 0, 0] }, rate: act ? 0.7 : 0.2 };
    return { pose: act ? { spine: [1.1, 0, 0], leftUpperArm: [-1.2, 0, 0.2], rightUpperArm: [-1.2, 0, -0.2], hipsY: -0.25, leftUpperLeg: [-0.6, 0, 0], leftLowerLeg: [0.8, 0, 0] }
      : { spine: [-0.35 * w, 0, 0], leftUpperArm: [-2.9 * w, 0, 0.2], rightUpperArm: [-2.9 * w, 0, -0.2], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0] }, rate: act ? 0.8 : 0.12 };
  }
  if (state === 'stagger') return { pose: { spine: [-0.5, 0.3, 0], head: [-0.5, 0, 0.2], leftUpperArm: [-0.3, 0, 0.9] }, rate: 0.3 };
  if (state === 'loop' && ctx.atStation) {
    const id = ctx.step;
    if (id === 'lights') return { pose: { leftUpperArm: [-2.2, 0, 0.2], leftLowerArm: [-0.4, 0, 0], head: [-0.3, 0, 0] }, rate: 0.1 };
    if (id === 'register') return { pose: { spine: [0.35, 0, 0], rightUpperArm: [-1.0, 0, 0], rightLowerArm: [-0.4 - Math.max(0, S(t * 6)) * 0.3, 0, 0] }, rate: 0.2 };
    if (id === 'shutter') return { pose: { leftUpperArm: [-2.8 + Math.min(1, ctx.stepT / 4) * 1.6, 0, 0.2], rightUpperArm: [-2.8 + Math.min(1, ctx.stepT / 4) * 1.6, 0, -0.2] }, rate: 0.1 };
    if (id === 'bow') return { pose: { spine: [0.9 * S(Math.min(1, ctx.stepT / 2.5) * Math.PI), 0, 0], neck: [0.3, 0, 0], leftUpperArm: [0.1, 0, 0.05], rightUpperArm: [0.1, 0, -0.05] }, rate: 0.12 };
  }
  const sp = ctx.speed || 0;
  const loc = sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.8, legLen: 0.92 }) : idle(t, 0.6);
  return { pose: Object.assign(loc, { spine: [0.15, 0, 0] }), rate: 0.35 };
}
/** 収容者（避難所の個体）：重い足取り・点呼の構え・椅子の薙ぎ払い・突進・叩きつけ・毛布投げ・倒れる／座り込む */
export function shuuyouPose(ctx) {
  const { state, t } = ctx;
  const hunch = { spine: [0.42, 0, 0], chest: [0.2, 0, 0], neck: [-0.3, 0, 0], head: [-0.2, 0, 0.1 * S(t * 0.5)], leftUpperArm: [-0.15, 0, 0.35], rightUpperArm: [-0.15, 0, -0.35], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0] };
  if (state === 'rest' || state === 'dormant' || state === 'neutral') return { pose: { hipsY: -0.8, spine: [0.9, 0, 0], neck: [0.3, 0, 0], leftUpperLeg: [-1.5, 0, 0.3], rightUpperLeg: [-1.5, 0, -0.3], leftLowerLeg: [2.0, 0, 0], rightLowerLeg: [2.0, 0, 0], leftUpperArm: [-1.1, 0, 0.3], rightUpperArm: [-1.1, 0, -0.3], leftLowerArm: [-1.4, 0, 0], rightLowerArm: [-1.4, 0, 0] }, rate: 0.03 };
  if (state === 'down') return { pose: { hipsY: -0.55, spine: [0.8, 0, 0.2], head: [0.4, 0, 0.3], leftUpperLeg: [-1.3, 0, 0.2], rightUpperLeg: [-0.4, 0, -0.2], leftLowerLeg: [1.9, 0, 0], rightLowerLeg: [1.2, 0, 0], leftUpperArm: [-0.6, 0, 0.5], rightUpperArm: [-0.9, 0, -0.4] }, rate: 0.12 };
  if (state === 'stagger') return { pose: Object.assign({}, hunch, { spine: [-0.2, 0.4 * S(t * 7), 0], head: [-0.5, 0, 0.4], hipsY: -0.08 }), rate: 0.3 };
  if (state === 'rollcall') return { pose: { spine: [0.05, 0, 0], neck: [-0.4, 0, 0], head: [-0.2, S(t * 0.8) * 0.4, 0], leftUpperArm: [0, 0, 0.15], rightUpperArm: [0, 0, -0.15], leftLowerArm: [-0.1, 0, 0], rightLowerArm: [-0.1, 0, 0], hipsY: 0.02 }, rate: 0.08 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}; const w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'sweep') return { pose: act ? { spine: [0.3, -1.0, 0], chest: [0, -0.4, 0], leftUpperArm: [-1.5, 0, -1.2], leftLowerArm: [-0.1, 0, 0], rightUpperArm: [-0.3, 0, -0.5] } : { spine: [0.2, 0.9 * w, 0], chest: [0, 0.3 * w, 0], leftUpperArm: [-1.3, 0, 1.5 * w], leftLowerArm: [-0.4, 0, 0], rightUpperArm: [-0.3, 0, -0.5] }, rate: act ? 0.6 : 0.15 };
    if (a.name === 'charge') return { pose: act ? Object.assign(locomotion(t * 14, 6, { k: 0.9, legLen: 0.95 }), { spine: [0.9, 0, 0], leftUpperArm: [0.6, 0, 0.6], rightUpperArm: [0.6, 0, -0.6] }) : { spine: [0.7 * w, 0, 0], hipsY: -0.2 * w, leftUpperLeg: [-0.6 * w, 0, 0.2], leftLowerLeg: [0.9 * w, 0, 0], rightUpperLeg: [0.3, 0, -0.2], leftUpperArm: [0.7 * w, 0, 0.5], rightUpperArm: [0.7 * w, 0, -0.5] }, rate: act ? 0.6 : 0.12 };
    if (a.name === 'slam') return { pose: act ? { spine: [1.1, 0, 0], leftUpperArm: [-1.3, 0, 0.2], rightUpperArm: [-1.3, 0, -0.2], leftLowerArm: [0, 0, 0], rightLowerArm: [0, 0, 0], hipsY: -0.3, leftUpperLeg: [-0.8, 0, 0], leftLowerLeg: [1.0, 0, 0] } : { spine: [-0.3 * w, 0, 0], leftUpperArm: [-2.9 * w, 0, 0.3], rightUpperArm: [-2.9 * w, 0, -0.3], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0], hipsY: 0.05 * w }, rate: act ? 0.8 : 0.1 };
    if (a.name === 'blanket') return { pose: act ? { spine: [0.4, 0.5, 0], rightUpperArm: [-1.8, 0, 0.6], rightLowerArm: [-0.1, 0, 0] } : { spine: [0.0, -0.7 * w, 0], rightUpperArm: [-1.0 * w, 0, -1.4 * w], rightLowerArm: [-1.0, 0, 0] }, rate: act ? 0.6 : 0.15 };
    if (a.name === 'grab') return { pose: act ? { spine: [0.7, 0, 0], leftUpperArm: [-1.6, 0, 0.1], rightUpperArm: [-1.6, 0, -0.1], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0] } : { spine: [-0.1, 0, 0], leftUpperArm: [-1.6, 0, 1.2 * w], rightUpperArm: [-1.6, 0, -1.2 * w], head: [-0.3, 0, 0] }, rate: act ? 0.6 : 0.15 };
  }
  const sp = ctx.speed || 0;
  const loc = sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.85, legLen: 0.95 }) : idle(t, 1.4);
  return { pose: Object.assign(loc, hunch, { hipsY: (loc.hipsY || 0) - 0.06 }), rate: 0.35 };
}

// ───────────────────────── 第3章：白髪形態・新しい異形・子ども ─────────────────────────
// 白い姿（妖爪 5 段：左右の手で交互に裂く・最後は両手で大きく。妖刀：刀を横に大きく払う。瞬歩：低く前へ滑る。幻術・猫火：手を前へ）
const CLAW = [
  { a: { spine: [0.1, 0.5, 0], rightUpperArm: [-1.2, -0.3, -1.3], rightLowerArm: [-1.4, 0, 0], leftUpperArm: [-0.6, 0, 0.5], leftLowerArm: [-1.2, 0, 0], hipsY: -0.08, leftUpperLeg: [-0.4, 0, 0.1], leftLowerLeg: [0.5, 0, 0], rightUpperLeg: [0.25, 0, 0] },
    b: { spine: [0.25, -0.55, 0], rightUpperArm: [-1.5, 0.4, 0.7], rightLowerArm: [-0.2, 0, 0], rightHand: [0, 0, -0.4], leftUpperArm: [-0.5, 0, 0.6], leftLowerArm: [-1.3, 0, 0], hipsY: -0.12, leftUpperLeg: [-0.55, 0, 0.1], leftLowerLeg: [0.6, 0, 0], rightUpperLeg: [0.35, 0, 0] } },
  { a: { spine: [0.1, -0.5, 0], leftUpperArm: [-1.2, 0.3, 1.3], leftLowerArm: [-1.4, 0, 0], rightUpperArm: [-0.6, 0, -0.5], rightLowerArm: [-1.2, 0, 0], hipsY: -0.08, rightUpperLeg: [-0.4, 0, -0.1], rightLowerLeg: [0.5, 0, 0], leftUpperLeg: [0.25, 0, 0] },
    b: { spine: [0.25, 0.55, 0], leftUpperArm: [-1.5, -0.4, -0.7], leftLowerArm: [-0.2, 0, 0], leftHand: [0, 0, 0.4], rightUpperArm: [-0.5, 0, -0.6], rightLowerArm: [-1.3, 0, 0], hipsY: -0.12, rightUpperLeg: [-0.55, 0, -0.1], rightLowerLeg: [0.6, 0, 0], leftUpperLeg: [0.35, 0, 0] } },
  { a: { spine: [-0.15, 0.3, 0], rightUpperArm: [-2.6, 0, -0.3], rightLowerArm: [-0.9, 0, 0], leftUpperArm: [-0.4, 0, 0.6], hipsY: -0.04 },
    b: { spine: [0.45, -0.2, 0], rightUpperArm: [-0.8, 0, 0.2], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-0.3, 0, 0.7], hipsY: -0.16, leftUpperLeg: [-0.7, 0, 0], leftLowerLeg: [0.7, 0, 0], rightUpperLeg: [0.4, 0, 0] } },
  { a: { spine: [0.1, -0.7, 0], leftUpperArm: [-1.0, 0.5, 1.4], leftLowerArm: [-1.1, 0, 0], rightUpperArm: [-1.0, -0.5, -1.4], rightLowerArm: [-1.1, 0, 0], hipsY: -0.1 },
    b: { spine: [0.3, 0.7, 0], leftUpperArm: [-1.5, -0.6, -0.4], leftLowerArm: [-0.1, 0, 0], rightUpperArm: [-1.5, 0.6, 0.4], rightLowerArm: [-0.1, 0, 0], hipsY: -0.14, leftUpperLeg: [-0.5, 0, 0.1], leftLowerLeg: [0.5, 0, 0], rightUpperLeg: [0.3, 0, 0] } },
  { a: { spine: [-0.35, 0, 0], chest: [-0.15, 0, 0], leftUpperArm: [-2.8, 0, 0.5], rightUpperArm: [-2.8, 0, -0.5], leftLowerArm: [-0.8, 0, 0], rightLowerArm: [-0.8, 0, 0], hipsY: 0.02, leftUpperLeg: [0.2, 0, 0], rightUpperLeg: [-0.5, 0, 0], rightLowerLeg: [0.7, 0, 0] },
    b: { spine: [0.7, 0, 0], chest: [0.2, 0, 0], leftUpperArm: [-0.9, 0, -0.2], rightUpperArm: [-0.9, 0, 0.2], leftLowerArm: [0, 0, 0], rightLowerArm: [0, 0, 0], hipsY: -0.28, leftUpperLeg: [-1.2, 0, 0.1], leftLowerLeg: [1.3, 0, 0], rightUpperLeg: [0.7, 0, 0], rightLowerLeg: [0.4, 0, 0] } },
];
const BLADE = { a: { spine: [0.1, 1.1, 0], chest: [0, 0.4, 0], rightUpperArm: [-1.4, -0.6, -1.5], rightLowerArm: [-0.6, 0, 0], rightHand: [0, 0, 0.9], leftUpperArm: [-0.4, 0, 0.6], hipsY: -0.14, leftUpperLeg: [-0.5, 0, 0.2], leftLowerLeg: [0.6, 0, 0], rightUpperLeg: [0.4, 0, -0.1] },
  b: { spine: [0.3, -1.2, 0], chest: [0, -0.5, 0], rightUpperArm: [-1.5, 0.5, 1.3], rightLowerArm: [-0.05, 0, 0], rightHand: [0, 0, -0.8], leftUpperArm: [0.2, 0, 0.9], hipsY: -0.22, leftUpperLeg: [-0.9, 0, 0.2], leftLowerLeg: [1.0, 0, 0], rightUpperLeg: [0.6, 0, -0.1], rightLowerLeg: [0.3, 0, 0] } };
// 火縄銃：紫は両手で斜めに持つ（銃床で打つ）。白は肩づけで構える（妖弾）・込め直し（槊杖を上下）
const MATCH_READY = { rightUpperArm: [-0.55, 0.2, -0.3], rightLowerArm: [-1.35, 0, 0], rightHand: [0.1, 0, 0.5], leftUpperArm: [-0.85, -0.35, 0.25], leftLowerArm: [-1.25, 0, 0], leftHand: [0, 0, -0.3] };
const MATCH_AIM = { spine: [0.05, 0.25, 0], chest: [0, 0.15, 0], head: [0.1, -0.35, 0.05], rightUpperArm: [-1.42, 0.25, 0.05], rightLowerArm: [-0.12, 0, 0], rightHand: [1.14, 0, 0], leftUpperArm: [-1.45, -0.42, 0.05], leftLowerArm: [-0.1, 0, 0], leftHand: [0.6, 0, -0.3], leftUpperLeg: [-0.25, 0, 0.1], rightUpperLeg: [0.15, 0, -0.1], hipsY: -0.04 };
const MATCH_RELOAD = { spine: [0.15, 0, 0], head: [0.35, 0, 0], rightUpperArm: [-0.3, 0, -0.25], rightLowerArm: [-1.5, 0, 0], rightHand: [-0.6, 0, 0], leftUpperArm: [-1.1, 0, 0.35], leftLowerArm: [-1.0, 0, 0] };
const W_READY = { spine: [0.12, 0, 0], leftUpperArm: [-0.5, 0, 0.45], leftLowerArm: [-1.1, 0, 0], rightUpperArm: [-0.5, 0, -0.45], rightLowerArm: [-1.1, 0, 0], leftHand: [0.3, 0, 0], rightHand: [0.3, 0, 0], hipsY: -0.04 };
const DASH = { spine: [0.7, 0, 0], chest: [0.2, 0, 0], head: [-0.5, 0, 0], leftUpperArm: [0.9, 0, 0.3], rightUpperArm: [0.9, 0, -0.3], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0], leftUpperLeg: [-0.9, 0, 0], leftLowerLeg: [0.9, 0, 0], rightUpperLeg: [0.5, 0, 0], rightLowerLeg: [0.6, 0, 0], hipsY: -0.22 };
const CAST_ILL = { spine: [0, 0, 0], leftUpperArm: [-1.3, 0.4, -0.5], leftLowerArm: [-1.5, 0, 0], rightUpperArm: [-1.3, -0.4, 0.5], rightLowerArm: [-1.5, 0, 0], head: [0.15, 0, 0], hipsY: -0.04 };
const CAST_FIRE = { spine: [0.05, 0.4, 0], rightUpperArm: [-1.6, 0, 0.1], rightLowerArm: [-0.1, 0, 0], rightHand: [-0.5, 0, 0], leftUpperArm: [-0.3, 0, 0.5], leftLowerArm: [-1.0, 0, 0], hipsY: -0.04 };
const W_TRANSFORM = { spine: [-0.1, 0, 0], head: [-0.3, 0, 0], leftUpperArm: [-0.3, 0, 0.9], rightUpperArm: [-0.3, 0, -0.9], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0], hipsY: 0.0 };
export { W_TRANSFORM };
export function whitePose(ctx) {
  const { st, f } = ctx;
  let b = ctx.speed > 0.1 ? locomotion(ctx.phase, ctx.speed, { k: 1.05 }) : idle(ctx.time, 0.8);
  if (!['attack', 'issen', 'cast', 'dodge', 'charge'].includes(st.name)) { if (ctx.speed > 3.2) b = Object.assign(b, { spine: [0.38, 0, 0], leftUpperArm: [0.7, 0, 0.3], rightUpperArm: [0.7, 0, -0.3], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0] }); else b = Object.assign(b, W_READY); }
  if (st.name === 'attack') {
    const a = st.atk, P = st.blade ? BLADE : CLAW[st.step] || CLAW[0];
    let t; if (f < a.startup) t = 0; else if (f < a.startup + a.active) t = (f - a.startup + 1) / a.active; else t = 1 + Math.min(1, (f - a.startup - a.active) / Math.max(1, a.recovery));
    let pose;
    if (f < a.startup) pose = mix(b, P.a, easeOut(f / Math.max(1, a.startup)));
    else if (t <= 1) pose = mix(P.a, P.b, easeOut(t));
    else pose = mix(P.b, Object.assign({}, b, W_READY), ease((t - 1 - 0.2) / 0.8));
    return { pose, rate: 0.95 };
  }
  if (st.name === 'charge') return { pose: mix(W_READY, BLADE.a, ease(f / 12)), rate: 0.4 };
  if (st.name === 'dodge') return { pose: mix(b, DASH, Math.min(1, Math.sin(Math.min(1, f / 14) * Math.PI) * 1.8)), rate: 0.8 };
  if (st.name === 'cast') return { pose: st.what === 'foxfire' ? CAST_FIRE : CAST_ILL, rate: 0.5 };
  if (st.name === 'mcharge') return { pose: Object.assign({}, b, MATCH_AIM), rate: 0.4 };
  if (st.name === 'mrecoil') return { pose: Object.assign({}, b, MATCH_AIM, { spine: [-0.22, 0.25, 0], head: [-0.15, -0.35, 0.05], rightUpperArm: [-1.75, 0.25, 0.05], leftUpperArm: [-1.8, -0.42, 0.05] }), rate: 0.8 };
  if (st.name === 'mreload') return { pose: Object.assign({}, b, MATCH_RELOAD, { leftUpperArm: [-1.1 - Math.max(0, Math.sin(f * 0.25)) * 0.6, 0, 0.35] }), rate: 0.35 };
  if (ctx.w === 'matchlock' && !['attack', 'dodge', 'issen', 'hurt', 'dead'].includes(st.name)) return { pose: Object.assign({}, b, MATCH_READY), rate: ctx.speed > 0.1 ? 0.55 : 0.2 };
  if (st.name === 'issen') { const k = ctx.issen || {}; const strike = k.strike || 8; return { pose: f < strike ? mix(W_READY, CLAW[4].a, ease(f / strike)) : CLAW[4].b, rate: 0.8 }; }
  if (st.name === 'hurt') return { pose: ctx.hurtDir === 'back' ? HURT_B : HURT_F, rate: 0.5 };
  if (st.name === 'dead') return { pose: DEAD, rate: 0.12 };
  return { pose: b, rate: ctx.speed > 0.1 ? 0.55 : 0.2 };
}

/** 記録のない患者：すり足・首をかしげる・点滴の柱（左手）。管で打つ（右手）・すがりつく（両手）・眠る（座り込む） */
export function kanjaPose(ctx) {
  const { state, t } = ctx;
  const lean = { spine: [0.2, 0, 0.05], neck: [0.2, 0, 0.35 + 0.1 * S(t * 0.6)], head: [0.1, 0, 0.25], leftUpperArm: [-0.25, 0, 0.12], leftLowerArm: [-1.1, 0, 0] };
  if (state === 'sleep') return { pose: { hipsY: -0.62, spine: [0.7, 0, 0.1], neck: [0.5, 0, 0.3], leftUpperLeg: [-1.5, 0, 0.2], rightUpperLeg: [-1.4, 0, -0.2], leftLowerLeg: [1.7, 0, 0], rightLowerLeg: [1.6, 0, 0], leftUpperArm: [-0.4, 0, 0.1], leftLowerArm: [-1.1, 0, 0], rightUpperArm: [-0.2, 0, -0.1] }, rate: 0.05 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk; const w = a.phase === 'windup' ? ease(a.t / (ctx.atkDef.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'clutch') return { pose: act ? Object.assign({}, lean, { spine: [0.6, 0, 0], rightUpperArm: [-1.5, 0, -0.1], rightLowerArm: [-0.3, 0, 0], leftUpperArm: [-1.4, 0, 0.1] }) : Object.assign({}, lean, { spine: [-0.2 * w, 0, 0], rightUpperArm: [-1.4, 0, -1.2 * w], rightLowerArm: [-0.6, 0, 0], head: [-0.4 * w, 0, 0.5] }), rate: act ? 0.6 : 0.15 };
    return { pose: act ? Object.assign({}, lean, { spine: [0.35, -0.6, 0], rightUpperArm: [-1.4, 0, 0.8], rightLowerArm: [-0.1, 0, 0] }) : Object.assign({}, lean, { spine: [0.05, 0.6 * w, 0], rightUpperArm: [-1.3 * w, 0, -1.4 * w], rightLowerArm: [-0.9, 0, 0] }), rate: act ? 0.7 : 0.18 };
  }
  if (state === 'stagger') return { pose: Object.assign({}, lean, { spine: [-0.4, 0.3, 0], head: [-0.5, 0, 0.4] }), rate: 0.3 };
  if (state === 'assess') return { pose: Object.assign({}, idle(t, 0.3), lean, { neck: [0.0, 0, 0.6 * S(t * 1.6)], head: [-0.2, 0, 0.5] }), rate: 0.08 };
  if (state === 'nurse') return { pose: Object.assign(ctx.speed > 0.05 ? locomotion(ctx.phase, ctx.speed, { k: 0.5 }) : idle(t, 0.4), lean, { rightUpperArm: [-0.7, 0, -0.1], rightLowerArm: [-0.8, 0, 0] }), rate: 0.25 };
  if (ctx.sub === 'ask') return { pose: Object.assign(idle(t, 0.4), lean, { rightUpperArm: [-1.2, 0, -0.1], rightLowerArm: [-0.5 - S(t * 2.4) * 0.2, 0, 0], head: [0.3, 0, 0.5] }), rate: 0.12 };
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: sp > 2 ? 0.9 : 0.45 }) : idle(t, 0.5), lean, sp > 2 ? { spine: [0.5, 0, 0], rightUpperArm: [-0.9, 0, -0.2] } : {}), rate: 0.35 };
}

/** 模倣する影・写し身：低く構えた人影。崩れる（化けが解ける）・写した攻め（連撃・突き・影の弾・つかみ・影の波） */
export function mimicPose(ctx) {
  const { state, t } = ctx;
  const crouch = { spine: [0.45, 0, 0], chest: [0.15, 0, 0], neck: [-0.3, 0, 0], head: [-0.15, 0, 0.15 * S(t * 1.3)], leftUpperArm: [-0.4, 0, 0.5], rightUpperArm: [-0.4, 0, -0.5], leftLowerArm: [-0.8, 0, 0], rightLowerArm: [-0.8, 0, 0], hipsY: -0.12, leftUpperLeg: [-0.4, 0, 0.12], rightUpperLeg: [-0.4, 0, -0.12], leftLowerLeg: [0.6, 0, 0], rightLowerLeg: [0.6, 0, 0] };
  if (state === 'dormant' || state === 'rest' || state === 'tenki') return { pose: { hipsY: -0.5, spine: [0.9, 0, 0], neck: [0.5, 0, 0], head: [0.3, 0, 0], leftUpperLeg: [-1.4, 0, 0.3], rightUpperLeg: [-1.4, 0, -0.3], leftLowerLeg: [1.8, 0, 0], rightLowerLeg: [1.8, 0, 0], leftUpperArm: [-0.2, 0, 0.3], rightUpperArm: [-0.2, 0, -0.3] }, rate: state === 'tenki' ? 0.05 : 0.04 };
  if (state === 'reveal') return { pose: Object.assign({}, crouch, { spine: [0.2 + S(t * 14) * 0.3, S(t * 9) * 0.4, 0], head: [-0.6, S(t * 11) * 0.5, 0.4], leftUpperArm: [-2.2, 0, 1.0], rightUpperArm: [-2.0, 0, -1.1] }), rate: 0.4 };
  if (state === 'voice') return { pose: { spine: [-0.1, 0, 0], neck: [-0.3, 0, 0.2], head: [-0.2, 0.3 * S(t * 0.7), 0.2], leftUpperArm: [-0.9, 0, 0.3], rightUpperArm: [-0.9, 0, -0.3], leftLowerArm: [-1.4, 0, 0], rightLowerArm: [-1.4, 0, 0] }, rate: 0.06 };
  if (state === 'stagger' || state === 'down') return { pose: Object.assign({}, crouch, { spine: [-0.4, 0.4, 0], head: [-0.5, 0, 0.5], hipsY: state === 'down' ? -0.45 : -0.1 }), rate: 0.3 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}; const w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    const alt = (a.hitN || 0) % 2;
    if (a.name === 'mslash') {
      const R = { spine: [0.2, -0.7, 0], rightUpperArm: [-1.6, 0.5, 0.9], rightLowerArm: [-0.1, 0, 0] }, L = { spine: [0.2, 0.7, 0], leftUpperArm: [-1.6, -0.5, -0.9], leftLowerArm: [-0.1, 0, 0] };
      const RW = { spine: [0, 0.6 * w, 0], rightUpperArm: [-1.3, 0, -1.3 * w], rightLowerArm: [-1.2, 0, 0] }, LW = { spine: [0, -0.6 * w, 0], leftUpperArm: [-1.3, 0, 1.3 * w], leftLowerArm: [-1.2, 0, 0] };
      return { pose: Object.assign({}, crouch, act ? (alt ? L : R) : (alt ? LW : RW)), rate: act ? 0.8 : 0.25 };
    }
    if (a.name === 'mlunge') return { pose: act ? Object.assign({}, DASH, { leftUpperArm: [-1.6, 0, 0.2], rightUpperArm: [-1.6, 0, -0.2] }) : Object.assign({}, crouch, { hipsY: -0.3 * w, spine: [0.8 * w, 0, 0] }), rate: act ? 0.6 : 0.2 };
    if (a.name === 'mshot') return { pose: act ? Object.assign({}, crouch, { spine: [0.2, 0.4, 0], rightUpperArm: [-1.7, 0, 0.2], rightLowerArm: [0, 0, 0] }) : Object.assign({}, crouch, { spine: [0.1, -0.6 * w, 0], rightUpperArm: [-0.4, 0, -1.5 * w], rightLowerArm: [-1.6, 0, 0] }), rate: act ? 0.7 : 0.2 };
    if (a.name === 'mgrab') return { pose: act ? Object.assign({}, crouch, { spine: [0.7, 0, 0], leftUpperArm: [-1.5, 0, 0.1], rightUpperArm: [-1.5, 0, -0.1], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0] }) : Object.assign({}, crouch, { spine: [-0.1, 0, 0], leftUpperArm: [-1.6, 0, 1.3 * w], rightUpperArm: [-1.6, 0, -1.3 * w] }), rate: act ? 0.6 : 0.15 };
    if (a.name === 'mwave') return { pose: act ? Object.assign({}, crouch, { spine: [-0.3, 0, 0], leftUpperArm: [-1.6, 0, 1.4], rightUpperArm: [-1.6, 0, -1.4], hipsY: 0.02 }) : Object.assign({}, crouch, { spine: [0.9 * w, 0, 0], hipsY: -0.35 * w, leftUpperArm: [0.2, 0, 0.2], rightUpperArm: [0.2, 0, -0.2] }), rate: act ? 0.7 : 0.12 };
  }
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.9 }) : idle(t, 0.8), crouch, sp > 0.05 ? { hipsY: -0.08 } : {}), rate: 0.35 };
}

/** 守り手：子どものベッドの前で腕を広げる（守る）・押し返す・影を払う・ひざをつく */
export function mamoriPose(ctx) {
  const { state, t } = ctx;
  const shield = { spine: [0.55, 0, 0], chest: [0.2, 0, 0], neck: [-0.35, 0, 0], head: [-0.1, 0, 0.18 + 0.08 * S(t * 0.5)], leftUpperArm: [-1.05, 0.25, 0.55], rightUpperArm: [-1.05, -0.25, -0.55], leftLowerArm: [-1.05, 0, 0], rightLowerArm: [-1.05, 0, 0], leftHand: [0.3, 0, 0], rightHand: [0.3, 0, 0], hipsY: -0.16, leftUpperLeg: [-0.45, 0, 0.18], rightUpperLeg: [-0.45, 0, -0.18], leftLowerLeg: [0.6, 0, 0], rightLowerLeg: [0.6, 0, 0] };
  if (state === 'rest') return { pose: { hipsY: -0.75, spine: [0.6, 0, 0], neck: [0.4, 0, 0], leftUpperLeg: [-1.6, 0, 0.2], rightUpperLeg: [-0.4, 0, -0.2], leftLowerLeg: [1.9, 0, 0], rightLowerLeg: [2.0, 0, 0], leftUpperArm: [-0.4, 0, 0.3], rightUpperArm: [-0.4, 0, -0.3], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0] }, rate: 0.04 };
  if (ctx.atk) {
    const a = ctx.atk; const w = a.phase === 'windup' ? ease(a.t / (ctx.atkDef ? ctx.atkDef.windup : 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'push') return { pose: act ? Object.assign({}, shield, { spine: [0.4, 0, 0], leftUpperArm: [-1.5, 0, 0.2], rightUpperArm: [-1.5, 0, -0.2], leftLowerArm: [-0.1, 0, 0], rightLowerArm: [-0.1, 0, 0] }) : Object.assign({}, shield, { spine: [0.1 * w, 0, 0], leftUpperArm: [-1.2, 0, 0.6], rightUpperArm: [-1.2, 0, -0.6], leftLowerArm: [-1.6 * w, 0, 0], rightLowerArm: [-1.6 * w, 0, 0] }), rate: act ? 0.6 : 0.2 };
    return { pose: act ? Object.assign({}, shield, { spine: [0.4, -1.0, 0], rightUpperArm: [-1.5, 0.4, 1.2], rightLowerArm: [-0.1, 0, 0] }) : Object.assign({}, shield, { spine: [0.2, 0.9 * w, 0], rightUpperArm: [-1.2, 0, -1.6 * w], rightLowerArm: [-0.6, 0, 0] }), rate: act ? 0.75 : 0.2 };
  }
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.6, legLen: 1.0 }) : idle(t, 1.2), shield), rate: 0.25 };
}

/** 子ども：ベッドに座る・（相棒）と手をつないで歩く・おびえる */
export function childPose(ctx) {
  const b = ctx.speed > 0.1 ? locomotion(ctx.phase, ctx.speed, { k: 0.9, legLen: 0.55 }) : idle(ctx.time, 0.7);
  if (ctx.mode === 'sit') return { pose: { hipsY: -0.3, leftUpperLeg: [-1.5, 0, 0.1], rightUpperLeg: [-1.5, 0, -0.1], leftLowerLeg: [1.4, 0, 0], rightLowerLeg: [1.5, 0, 0], spine: [0.15, 0, 0], head: [0.3, 0, 0], leftUpperArm: [-0.4, 0, 0.3], rightUpperArm: [-0.4, 0, -0.3], leftLowerArm: [-1.2, 0, 0], rightLowerArm: [-1.2, 0, 0] }, rate: 0.12 };
  if (ctx.mode === 'cower') return { pose: { hipsY: -0.32, spine: [0.8, 0, 0], neck: [0.4, 0, 0], leftUpperLeg: [-1.7, 0, 0.2], rightUpperLeg: [-1.7, 0, -0.2], leftLowerLeg: [2.2, 0, 0], rightLowerLeg: [2.2, 0, 0], leftUpperArm: [-1.6, 0, 0.6], rightUpperArm: [-1.6, 0, -0.6], leftLowerArm: [-2.0, 0, 0], rightLowerArm: [-2.0, 0, 0] }, rate: 0.2 };
  return { pose: Object.assign(b, { leftUpperArm: [-0.35, 0, 0.35], leftLowerArm: [-0.4, 0, 0], head: [0.05, 0, 0] }), rate: 0.4 };
}
