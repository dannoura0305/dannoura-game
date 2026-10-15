// 第4章の手続きアニメ：応答体（人型の姿勢）・境界の先触れ（触腕の塊：骨を直接回す）。巨大猫又は anim5.js。
import { locomotion, idle, ease, mix } from './anim.js';
import { Sway } from './actors.js';
const S = Math.sin, C = Math.cos;

/** 応答体：首を傾けた細長い立ち姿。輪の中（habit）では端末に手をかざす。攻め：振り下ろし・叫び（両腕を広げて反る）・引き寄せ */
export function outouPose(ctx) {
  const { state, t } = ctx;
  const stoop = { spine: [0.18, 0, 0.04], chest: [0.08, 0, 0], neck: [0.25, 0, -0.35 + 0.08 * S(t * 0.7)], head: [0.15, 0.2, -0.2], leftUpperArm: [0.05, 0, 0.08], rightUpperArm: [0.05, 0, -0.08], leftLowerArm: [-0.15, 0, 0], rightLowerArm: [-0.15, 0, 0] };
  if (state === 'sedated') return { pose: { hipsY: -0.6, spine: [0.75, 0, 0.1], neck: [0.6, 0, 0.3], head: [0.3, 0, 0.2], leftUpperLeg: [-1.5, 0, 0.25], rightUpperLeg: [-1.4, 0, -0.25], leftLowerLeg: [1.8, 0, 0], rightLowerLeg: [1.7, 0, 0], leftUpperArm: [-0.2, 0, 0.1], rightUpperArm: [-0.2, 0, -0.1], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0] }, rate: 0.05 };
  if (state === 'rest') return { pose: { hipsY: -0.82, spine: [1.35, 0, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0], leftUpperLeg: [-1.2, 0, 0.1], rightUpperLeg: [-1.0, 0, -0.1], leftLowerLeg: [1.4, 0, 0], rightLowerLeg: [1.2, 0, 0], leftUpperArm: [-1.8, 0, 0.3], rightUpperArm: [-1.8, 0, -0.3], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0] }, rate: 0.04 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}; const w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'cry') return { pose: act ? Object.assign({}, stoop, { spine: [-0.45, 0, 0], neck: [-0.5, 0, 0], head: [-0.5, 0, 0], leftUpperArm: [-0.3, 0, 1.5], rightUpperArm: [-0.3, 0, -1.5], leftLowerArm: [-0.2, 0, 0], rightLowerArm: [-0.2, 0, 0] }) : Object.assign({}, stoop, { spine: [0.6 * w, 0, 0], leftUpperArm: [0.3, 0, 0.3 * w], rightUpperArm: [0.3, 0, -0.3 * w], hipsY: -0.15 * w }), rate: act ? 0.7 : 0.15 };
    if (a.name === 'pull') return { pose: act ? Object.assign({}, stoop, { spine: [0.6, 0, 0], leftUpperArm: [-1.5, 0, 0.1], rightUpperArm: [-1.5, 0, -0.1], leftLowerArm: [-0.2, 0, 0], rightLowerArm: [-0.2, 0, 0] }) : Object.assign({}, stoop, { spine: [-0.2 * w, 0, 0], leftUpperArm: [-1.4, 0, 1.2 * w], rightUpperArm: [-1.4, 0, -1.2 * w] }), rate: act ? 0.6 : 0.15 };
    return { pose: act ? Object.assign({}, stoop, { spine: [0.5, -0.3, 0], rightUpperArm: [-0.6, 0, -0.1], rightLowerArm: [-0.1, 0, 0] }) : Object.assign({}, stoop, { spine: [-0.15 * w, 0.4 * w, 0], rightUpperArm: [-2.6 * w, 0, -0.2], rightLowerArm: [-0.4, 0, 0], head: [-0.3 * w, 0, 0] }), rate: act ? 0.75 : 0.2 };
  }
  if (state === 'stagger' || state === 'down') return { pose: Object.assign({}, stoop, { spine: [-0.4, 0.3, 0], head: [-0.5, 0, 0.4], hipsY: state === 'down' ? -0.45 : -0.08 }), rate: 0.3 };
  if (state === 'assess') return { pose: Object.assign({}, idle(t, 0.3), stoop, { neck: [0, 0, 0.7 * S(t * 2.2)], head: [-0.25, 0, 0.6] }), rate: 0.08 };
  if (ctx.sub === 'answer') return { pose: Object.assign(idle(t, 0.3), stoop, { rightUpperArm: [-1.4, 0, -0.1], rightLowerArm: [-0.3, 0, 0], head: [0.1, 0, -0.3] }), rate: 0.1 };
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: sp > 2 ? 0.95 : 0.5, legLen: 0.95 }) : idle(t, 0.5), stoop, sp > 2 ? { spine: [0.45, 0, 0], leftUpperArm: [0.6, 0, 0.2], rightUpperArm: [0.6, 0, -0.2] } : {}), rate: 0.3 };
}

// 巨大猫又の姿勢はフェーズ6 で作り直した（actor/anim5.js の GiantAnimator）。

/** 境界の先触れ：触腕のばね・呼吸・攻めの姿勢（薙ぎ：腕を払う／光線：反って核を向ける／雨：翼を上げる／喰らう：前へかがむ）・ひるみ・崩れ */
export class SakibureAnimator {
  constructor(model) { this.m = model; this.sway = new Sway(model.sway || []); this.t = 0; this.k = {}; }
  update(dt, b) {
    const B = this.m.G, t = (this.t += dt), st = b.state, a = b.atk;
    const A = a ? b.def.attacks[a.name] : null, w = a ? (a.phase === 'windup' ? ease(a.t / A.windup) : a.phase === 'active' ? 1 : Math.max(0, 1 - a.t / A.recover)) : 0;
    const want = { body: [S(t * 0.6) * 0.04, 0, S(t * 0.5) * 0.03], chest: [S(t * 0.9) * 0.05, 0, 0], head: [0, S(t * 0.4) * 0.2, 0], armL: 0, armR: 0, wings: 0 };
    if (a && a.name === 'sweep') { want.chest = [0.2 * w, (a.phase === 'windup' ? -0.6 : 0.7) * w, 0]; want.armL = a.phase === 'windup' ? -0.8 * w : 1.0 * w; want.armR = -0.3 * w; }
    if (a && (a.name === 'beam' || a.name === 'feed')) { want.chest = [-0.35 * w, 0, 0]; want.head = [-0.3 * w, 0, 0]; want.wings = 0.4 * w; if (a.name === 'feed') { want.body = [0.35 * w, 0, 0]; want.chest = [0.25 * w, 0, 0]; } }
    if (a && a.name === 'rain') { want.wings = 1.0 * w; want.chest = [-0.25 * w, 0, 0]; want.armL = want.armR = -1.0 * w; }
    if (st === 'stagger' || st === 'down') { want.body = [0.35, 0, 0.15]; want.chest = [0.4, 0, 0]; want.head = [0.5, 0, 0.3]; want.wings = -0.6; }
    if (st === 'dead') { want.body = [0.8, 0, 0.3]; want.chest = [0.6, 0, 0]; want.wings = -1; }
    const L = (o, k, v, r = 4) => { const c = this.k[k] || (this.k[k] = [0, 0, 0]); for (let i = 0; i < 3; i++) c[i] += ((Array.isArray(v) ? v[i] : 0) - c[i]) * Math.min(1, dt * r); o.rotation.set(c[0], c[1], c[2]); };
    L(B.sBody, 'body', want.body); L(B.sChest, 'chest', want.chest); L(B.sHead, 'head', want.head);
    for (const [names, sx, k] of [[this.m.arms[0], 1, 'armL'], [this.m.arms[1], -1, 'armR']]) { const v = want[k]; names.forEach((n, i) => { const c = this.k[k + i] || (this.k[k + i] = [0]); c[0] += (v * (i < 2 ? 1 : 0.5) - c[0]) * Math.min(1, dt * 5); B[n].rotation.x = c[0] + S(t * 1.2 + i) * 0.05; B[n].rotation.z = sx * c[0] * 0.3; }); }
    this.sway.step(dt, t, 0, 0, 0);
    this.m.wings.forEach((names, wi) => { const sx = wi % 2 ? -1 : 1; const c = this.k['w' + wi] || (this.k['w' + wi] = [0]); c[0] += (want.wings - c[0]) * Math.min(1, dt * 3); B[names[0]].rotation.z += -sx * c[0] * 0.6; B[names[1]].rotation.z += -sx * c[0] * 0.3; });
  }
}
export { mix };
