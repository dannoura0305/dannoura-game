// 手続きの簡易アニメーション（骨の回転を状態から作る）。モーション素材が来たら AnimationMixer に置き換える。
// 角度はラジアン [x, y, z]。前へ振る＝x マイナス／ひざを曲げる＝x プラス／前かがみ＝背骨 x プラス。
const S = Math.sin, C = Math.cos, lerp = (a, b, t) => a + (b - a) * t;
const mix = (A, B, t) => { const o = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { if (k === 'hipsY') { o.hipsY = lerp(A.hipsY || 0, B.hipsY || 0, t); continue; } const a = A[k] || [0, 0, 0], b = B[k] || [0, 0, 0]; o[k] = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; } return o; };
const add = (A, B) => { const o = Object.assign({}, A); for (const k of Object.keys(B)) { if (k === 'hipsY') { o.hipsY = (A.hipsY || 0) + B.hipsY; continue; } const a = A[k] || [0, 0, 0], b = B[k]; o[k] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; } return o; };
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

/** 歩き・走り（ph：位相、amp：0〜1 の強さ、run：走り） */
export function locomotion(ph, amp, run, opt = {}) {
  const A = (run ? 0.85 : 0.5) * amp, K = (run ? 1.2 : 0.7) * amp;
  const sL = S(ph), sR = S(ph + Math.PI);
  const p = {
    leftUpperLeg: [-sL * A, 0, 0], rightUpperLeg: [-sR * A, 0, 0],
    leftLowerLeg: [Math.max(0, C(ph)) * K + 0.05, 0, 0], rightLowerLeg: [Math.max(0, C(ph + Math.PI)) * K + 0.05, 0, 0],
    leftFoot: [sL * 0.2 * amp, 0, 0], rightFoot: [sR * 0.2 * amp, 0, 0],
    spine: [(run ? 0.22 : 0.05) * amp, S(ph) * 0.06 * amp, 0], chest: [0, -S(ph) * 0.1 * amp, 0],
    hipsY: -Math.abs(S(ph)) * (run ? 0.05 : 0.02) * amp,
  };
  if (!opt.noArms) {
    p.leftUpperArm = [sR * A * 0.9, 0, 0.12]; p.rightUpperArm = [sL * A * 0.9, 0, -0.12];
    p.leftLowerArm = [-(run ? 1.1 : 0.3) * amp - 0.1, 0, 0]; p.rightLowerArm = [-(run ? 1.1 : 0.3) * amp - 0.1, 0, 0];
  }
  return p;
}
export function idle(t) {
  const b = S(t * 1.6) * 0.02;
  return { spine: [b, 0, 0], chest: [b, 0, 0], leftUpperArm: [0.05, 0, 0.1], rightUpperArm: [0.05, 0, -0.1], leftLowerArm: [-0.15, 0, 0], rightLowerArm: [-0.15, 0, 0], head: [-b, 0, 0], leftUpperLeg: [0, 0, 0.02], rightUpperLeg: [0, 0, -0.02] };
}

// ── だんのうら ──
const KATANA_READY = { rightUpperArm: [-0.35, 0, -0.25], rightLowerArm: [-0.75, 0, 0], rightHand: [-0.2, 0, 0.2] };
const ATK = [
  { a: { spine: [0.05, 0.6, 0], rightUpperArm: [-1.5, -0.4, -1.4], rightLowerArm: [-1.0, 0, 0], rightHand: [0, 0, 0.6], leftUpperArm: [-0.4, 0, 0.4] },
    b: { spine: [0.15, -0.6, 0], rightUpperArm: [-1.3, 0.3, 0.9], rightLowerArm: [-0.2, 0, 0], rightHand: [0, 0, -0.4], leftUpperArm: [0.3, 0, 0.5], hipsY: -0.05 } },
  { a: { spine: [0.05, -0.5, 0], rightUpperArm: [-2.4, 0, 0.6], rightLowerArm: [-1.2, 0, 0], rightHand: [0.4, 0, 0], leftUpperArm: [-0.3, 0, 0.3] },
    b: { spine: [0.2, 0.55, 0], rightUpperArm: [-0.5, 0, -0.9], rightLowerArm: [-0.3, 0, 0], rightHand: [-0.5, 0, 0], leftUpperArm: [0.2, 0, 0.6], hipsY: -0.06 } },
  { a: { spine: [-0.15, 0, 0], rightUpperArm: [-2.9, 0, -0.1], rightLowerArm: [-0.6, 0, 0], leftUpperArm: [-2.7, 0, 0.1], leftLowerArm: [-0.6, 0, 0], rightHand: [0.6, 0, 0], leftUpperLeg: [0.3, 0, 0], rightUpperLeg: [-0.6, 0, 0], rightLowerLeg: [0.8, 0, 0] },
    b: { spine: [0.45, 0, 0], rightUpperArm: [-1.0, 0, 0], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-0.9, 0, 0.1], leftLowerArm: [-0.2, 0, 0], rightHand: [-0.2, 0, 0], leftUpperLeg: [-0.9, 0, 0], leftLowerLeg: [0.9, 0, 0], rightUpperLeg: [0.5, 0, 0], hipsY: -0.16 } },
];
const HEAVY = { a: { spine: [-0.2, 0.4, 0], rightUpperArm: [-2.9, 0, -0.3], rightLowerArm: [-0.9, 0, 0], leftUpperArm: [-2.6, 0, 0.3], rightHand: [0.8, 0, 0], hipsY: -0.04 },
  b: { spine: [0.6, -0.2, 0], rightUpperArm: [-0.7, 0, -0.2], rightLowerArm: [0, 0, 0], leftUpperArm: [-0.7, 0, 0.3], rightHand: [-0.4, 0, 0], leftUpperLeg: [-1.0, 0, 0], leftLowerLeg: [1.1, 0, 0], rightUpperLeg: [0.6, 0, 0], hipsY: -0.2 } };
const IAI_STANCE = { spine: [0.3, 0.7, 0], chest: [0, 0.2, 0], head: [-0.2, -0.8, 0], rightUpperArm: [0.4, 0, -0.5], rightLowerArm: [-1.6, 0, 0], rightHand: [0.8, 0, 0], leftUpperArm: [0.1, 0, 0.3], leftLowerArm: [-1.2, 0, 0], leftUpperLeg: [-0.7, 0, 0.1], leftLowerLeg: [1.0, 0, 0], rightUpperLeg: [0.5, 0, -0.1], rightLowerLeg: [0.6, 0, 0], hipsY: -0.16 };
const ISSEN_END = { spine: [0.5, -0.9, 0], chest: [0, -0.3, 0], head: [-0.4, 0.9, 0], rightUpperArm: [-1.3, 0, -1.5], rightLowerArm: [0, 0, 0], rightHand: [0, 0, -0.3], leftUpperArm: [0.4, 0, 0.6], leftUpperLeg: [-1.1, 0, 0.2], leftLowerLeg: [1.3, 0, 0], rightUpperLeg: [0.8, 0, -0.1], rightLowerLeg: [0.5, 0, 0], hipsY: -0.26 };
const PARRY = { spine: [0.05, -0.3, 0], rightUpperArm: [-1.5, 0, 0.5], rightLowerArm: [-1.2, 0, 0], rightHand: [0, 0, 1.3], leftUpperArm: [-1.2, 0, -0.1], leftLowerArm: [-1.4, 0, 0], hipsY: -0.06 };
const AIM = { spine: [0, 0, 0], chest: [0, 0.15, 0], rightUpperArm: [-1.5, 0.15, 0.08], rightLowerArm: [-0.05, 0, 0], rightHand: [0, 0, 0], leftUpperArm: [-1.35, -0.2, -0.55], leftLowerArm: [-0.5, 0, 0], head: [0, -0.1, 0] };
const HIP = { rightUpperArm: [-1.3, 0, 0.0], rightLowerArm: [-0.2, 0, 0] };
const RELOAD = { rightUpperArm: [-0.8, 0, 0.3], rightLowerArm: [-1.0, 0, 0], leftUpperArm: [-0.7, 0, -0.5], leftLowerArm: [-1.4, 0, 0], head: [0.4, 0, 0] };
const HURT = { spine: [-0.35, 0.2, 0], head: [-0.3, 0, 0], leftUpperArm: [-0.4, 0, 0.6], rightUpperArm: [-0.2, 0, -0.6], hipsY: -0.05 };
const DEAD = { spine: [0.3, 0, 0], head: [0.5, 0, 0], leftUpperArm: [0, 0, 0.9], rightUpperArm: [0, 0, -0.9], leftUpperLeg: [-0.1, 0, 0.1], hipsY: -0.0 };

export function dannouraPose(ctx) {
  const { st, f, w } = ctx;            // st：fighter の状態, w：武器
  let base = ctx.speed > 0.1 ? locomotion(ctx.phase, Math.min(1, ctx.speed / 2.2), ctx.speed > 3.2) : idle(ctx.time);
  let rate = 0.25;
  if (w === 'katana' && !['attack', 'issen', 'parry', 'charge'].includes(st.name)) base = Object.assign(base, KATANA_READY);
  if (st.name === 'attack') {
    const a = st.atk; const P = st.step >= 8 ? HEAVY : ATK[st.step] || ATK[0];
    let t;
    if (f < a.startup) t = 0; else if (f < a.startup + a.active) t = (f - a.startup + 1) / a.active; else t = 1;
    const pose = f < a.startup ? mix(base, P.a, ease(f / Math.max(1, a.startup))) : mix(P.a, P.b, ease(t));
    return { pose: st.iai ? mix(IAI_STANCE, ISSEN_END, ease(t)) : pose, rate: f < a.startup ? 0.45 : 0.85 };
  }
  if (st.name === 'charge') return { pose: mix(HEAVY.a, IAI_STANCE, ease((f - 10) / 26)), rate: 0.25 };
  if (st.name === 'issen') {
    const k = ctx.issen || {}; const strike = k.strike || 8;
    if (f < strike) return { pose: mix(IAI_STANCE, ISSEN_END, ease(f / strike) * 0.3), rate: 0.6 };
    return { pose: ISSEN_END, rate: 0.9 };
  }
  if (st.name === 'parry') return { pose: PARRY, rate: 0.7 };
  if (st.name === 'dodge') {
    const t = f / 24; const crouch = S(Math.min(1, t * 1.4) * Math.PI);
    return { pose: add(mix(base, { spine: [0.5, 0, 0], leftUpperArm: [0.6, 0, 0.5], rightUpperArm: [0.6, 0, -0.5], leftUpperLeg: [-0.8, 0, 0], leftLowerLeg: [1.2, 0, 0], rightUpperLeg: [0.3, 0, 0], rightLowerLeg: [0.9, 0, 0] }, crouch), { hipsY: -0.15 * crouch }), rate: 0.6 };
  }
  if (st.name === 'hurt') return { pose: HURT, rate: 0.5 };
  if (st.name === 'dead') return { pose: DEAD, rate: 0.15 };
  if (st.name === 'reload') return { pose: Object.assign({}, base, RELOAD), rate: 0.3 };
  if (st.name === 'hipfire') return { pose: Object.assign({}, base, HIP), rate: 0.6 };
  if (st.name === 'swap') return { pose: Object.assign({}, base, { rightUpperArm: [-0.3, 0, -0.5], rightLowerArm: [-1.3, 0, 0] }), rate: 0.6 };
  if (w === 'handgun' && ctx.aiming) return { pose: Object.assign({}, base, AIM, { spine: [0, 0, 0] }), rate: 0.5 };
  if (w === 'handgun') return { pose: Object.assign(base, { rightUpperArm: [-0.25, 0, -0.15], rightLowerArm: [-0.6, 0, 0] }), rate };
  return { pose: base, rate };
}

// ── 敵 ──
export function kiroPose(ctx) {
  const { state, t, sub } = ctx;
  const hunch = { spine: [0.35, 0, 0], chest: [0.15, 0, 0], neck: [0.25, 0, 0], head: [0.1, 0, 0.25 * S(t * 0.7)] };
  if (state === 'home') return { pose: { hipsY: -0.5, leftUpperLeg: [-1.5, 0, 0.1], rightUpperLeg: [-1.5, 0, -0.1], leftLowerLeg: [1.6, 0, 0], rightLowerLeg: [1.6, 0, 0], spine: [0.5, 0, 0], neck: [0.6, 0, 0], leftUpperArm: [-0.6, 0, 0], rightUpperArm: [-0.6, 0, 0], leftLowerArm: [-0.8, 0, 0], rightLowerArm: [-0.8, 0, 0] }, rate: 0.05 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk; const w = a.phase === 'windup' ? ease(a.t / ctx.atkDef.windup) : 1;
    if (a.name === 'grab') {
      const P = a.phase === 'windup' ? { spine: [-0.1, 0, 0], leftUpperArm: [-1.6, 0, 1.3 * w], rightUpperArm: [-1.6, 0, -1.3 * w], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0], head: [-0.3, 0, 0] }
        : { spine: [0.5, 0, 0], leftUpperArm: [-1.5, 0, 0.1], rightUpperArm: [-1.5, 0, -0.1], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0] };
      return { pose: P, rate: a.phase === 'windup' ? 0.15 : 0.6 };
    }
    const P = a.phase === 'windup' ? { spine: [-0.2, 0.3 * w, 0], leftUpperArm: [0.7 * w, 0, 0.3], rightUpperArm: [0.7 * w, 0, -0.3], leftLowerArm: [-1.2, 0, 0], rightLowerArm: [-1.2, 0, 0] }
      : { spine: [0.45, -0.2, 0], leftUpperArm: [-1.5, 0, 0], rightUpperArm: [-1.5, 0, 0], leftLowerArm: [0, 0, 0], rightLowerArm: [0, 0, 0], rightUpperLeg: [-0.5, 0, 0] };
    return { pose: P, rate: a.phase === 'windup' ? 0.2 : 0.7 };
  }
  if (state === 'stagger') return { pose: { spine: [-0.5, 0.3, 0], head: [-0.6, 0, 0.3], leftUpperArm: [-0.5, 0, 0.8], rightUpperArm: [0.2, 0, -0.9] }, rate: 0.3 };
  if (state === 'loop' && sub === 'knock') return { pose: Object.assign({}, hunch, { rightUpperArm: [-1.45, 0, 0.1], rightLowerArm: [-0.5 - Math.max(0, S(t * 7.8)) * 0.7, 0, 0], leftUpperArm: [0.05, 0, 0.1] }), rate: 0.3 };
  if (state === 'assess') return { pose: Object.assign({}, idle(t), hunch, { head: [0.0, 0, 0.5 * S(t * 2)], neck: [0.1, 0, 0.2] }), rate: 0.1 };
  const sp = ctx.speed || 0;
  const loc = sp > 0.05 ? locomotion(ctx.phase, Math.min(1, sp / 1.4), sp > 2.5) : idle(t);
  return { pose: Object.assign(loc, hunch, sp > 2.5 ? { spine: [0.6, 0, 0], leftUpperArm: [-0.9, 0, 0.2], rightUpperArm: [-0.9, 0, -0.2] } : { leftUpperArm: [-0.1, 0, 0.08], rightUpperArm: [-0.25 + S(ctx.phase) * 0.15, 0, -0.08] }), rate: 0.2 };
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
  const loc = sp > 0.05 ? locomotion(ctx.phase, Math.min(1, sp / 1.1), sp > 2) : idle(t);
  return { pose: Object.assign(loc, { spine: [0.15, 0, 0] }), rate: 0.15 };
}
export function companionPose(ctx) {
  const b = idle(ctx.time);
  if (ctx.talking) return { pose: Object.assign(b, { head: [0.05, 0.2 * S(ctx.time * 1.3), 0.05], leftUpperArm: [-0.5, 0, 0.2], leftLowerArm: [-1.2, 0, 0] }), rate: 0.1 };
  return { pose: Object.assign(b, { leftUpperArm: [-0.25, 0, 0.15], rightUpperArm: [-0.25, 0, -0.15], leftLowerArm: [-1.4, 0, 0], rightLowerArm: [-1.4, 0, 0] }), rate: 0.08 };
}
