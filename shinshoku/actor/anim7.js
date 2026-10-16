// フェーズ8 の手続きアニメ：境界を喰らうもの（骨を直接回す）・研究者／配偶者に似た異形／娘（人型の姿勢＝Poser）。
import { locomotion, idle, ease } from './anim.js';
const S = Math.sin;

/** 境界を喰らうもの：淵の上で浮かぶ（上下にゆれる）・翼がゆっくり羽ばたく・根がゆれる。
 *  攻め：薙ぎ＝片側の翼を前へ払う／光線＝反って胸の目を向ける／雨＝翼を高く広げる／喰らう＝前へかがみ根を伸ばす。崩れ＝翼が垂れる・倒れ＝崩れて沈む */
export class KuramonoAnimator {
  constructor(model) { this.m = model; this.t = 0; this.k = {}; }
  update(dt, e) {
    const B = this.m.G, b = e.brain, t = (this.t += dt), st = b.state, a = b.atk;
    const A = a ? b.def.attacks[a.name] : null, w = a ? (a.phase === 'windup' ? ease(Math.min(1, a.t / A.windup)) : a.phase === 'active' ? 1 : Math.max(0, 1 - a.t / A.recover)) : 0;
    const want = { body: [0.12 + S(t * 0.5) * 0.03, S(t * 0.27) * 0.08, S(t * 0.4) * 0.03], chest: [0.06, S(t * 0.33) * 0.1, 0], crown: [S(t * 0.6) * 0.05, 0, S(t * 0.45) * 0.05], flap: 1, spread: 0, fwdL: 0, fwdR: 0, droop: 0, ten: 0 };
    if (a && a.name === 'sweep') { const sx = (b.patIdx % 2) ? 1 : -1; want['fwd' + (sx > 0 ? 'L' : 'R')] = a.phase === 'windup' ? -0.6 * w : 1.3 * w; want.chest = [0.1, sx * (a.phase === 'windup' ? 0.4 : -0.5) * w, 0]; }
    if (a && a.name === 'beam') { want.body = [-0.3 * w, 0, 0]; want.chest = [-0.2 * w, 0, 0]; want.spread = 0.5 * w; }
    if (a && a.name === 'rain') { want.spread = 1.0 * w; want.flap = 2.2; want.crown = [-0.3 * w, 0, 0]; }
    if (a && a.name === 'feed') { want.body = [0.45 * w, 0, 0]; want.chest = [0.25 * w, 0, 0]; want.ten = w; want.spread = -0.3 * w; }
    if (st === 'stagger' || st === 'down') { want.body = [0.5, 0, 0.12]; want.chest = [0.3, 0, 0]; want.droop = 1; want.flap = 0.3; }
    if (st === 'dead') { want.body = [0.8, 0, 0.3]; want.chest = [0.5, 0, 0.1]; want.droop = 1.6; want.flap = 0; }
    const L = (o, key, v, r = 3) => { const c = this.k[key] || (this.k[key] = [0, 0, 0]); for (let i = 0; i < 3; i++) c[i] += ((v[i] || 0) - c[i]) * Math.min(1, dt * r); o.rotation.set(c[0], c[1], c[2]); return c; };
    L(B.kBody, 'body', want.body); L(B.kChest, 'chest', want.chest, a && a.phase === 'active' ? 8 : 3); L(B.kCrown, 'crown', want.crown);
    B.kBody.position.y = 1.2 + S(t * 0.7) * 0.06 - (st === 'dead' ? Math.min(1.2, (this.deadT = (this.deadT || 0) + dt) * 0.3) : 0);
    const sm = (key, v, r = 3) => { this.k[key] = (this.k[key] ?? 0) + (v - (this.k[key] ?? 0)) * Math.min(1, dt * r); return this.k[key]; };
    const spread = sm('spread', want.spread), droop = sm('droop', want.droop), fL = sm('fL', want.fwdL, a && a.phase === 'active' ? 9 : 3), fR = sm('fR', want.fwdR, a && a.phase === 'active' ? 9 : 3);
    for (const Wg of this.m.wings) {
      const ph = t * 0.9 * want.flap + Wg.i * 0.7, fwd = Wg.sx > 0 ? fL : fR;
      Wg.n.forEach((n, j) => {
        const o = B[n]; if (!o) return;
        if (j === 0) o.rotation.set(-fwd * 0.5, -Wg.sx * fwd * 0.9, Wg.sx * (S(ph) * 0.18 + spread * 0.5 - droop * 0.6));
        else o.rotation.set(0, -Wg.sx * fwd * 0.2, Wg.sx * (S(ph - j * 0.6) * 0.12 + spread * 0.12 - droop * 0.25));
      });
    }
    const ten = sm('ten', want.ten);
    this.m.tendrils.forEach((nm, i) => nm.forEach((n, j) => { const o = B[n]; if (o) o.rotation.set(S(t * 1.1 + i + j) * 0.15 - ten * 0.35 * (j ? 1 : 0), 0, S(t * 0.8 + i * 1.7 + j) * 0.18); }));
  }
}

/** 研究者：背すじを伸ばして立つ（記録の板を胸に）・浮くように歩く。攻め：打つ（板で横に払う）／巻き戻し（左手を前にかざす）／
 *  残像（前へ低く走る）／事故の瞬間（両手を広げる）。崩れ＝片ひざ・膝をつく（kneel）＝両ひざで手をつく */
export function researcherPose(ctx) {
  const { state, t } = ctx;
  const stand = { spine: [-0.04, 0, 0], neck: [0.06, 0, 0], rightUpperArm: [-0.3, 0, -0.16], rightLowerArm: [-1.5, 0, 0], leftUpperArm: [0.05, 0, 0.12], leftLowerArm: [-0.2, 0, 0] };
  if (state === 'kneel') return { pose: { hipsY: -0.55, spine: [0.5, 0, 0], neck: [0.45, 0, 0], head: [0.2, 0, 0], leftUpperLeg: [-1.2, 0, 0.1], rightUpperLeg: [-1.2, 0, -0.1], leftLowerLeg: [2.1, 0, 0], rightLowerLeg: [2.1, 0, 0], leftUpperArm: [-0.7, 0, 0.1], rightUpperArm: [-0.7, 0, -0.1], leftLowerArm: [-0.3, 0, 0], rightLowerArm: [-0.3, 0, 0] }, rate: 0.06 };
  if (state === 'down') return { pose: { hipsY: -0.4, leftUpperLeg: [-1.3, 0, 0.1], leftLowerLeg: [1.7, 0, 0], rightUpperLeg: [-0.3, 0, -0.1], rightLowerLeg: [1.8, 0, 0], spine: [0.4, 0, 0], neck: [0.3, 0, 0], head: [0.3 + S(t * 3) * 0.04, 0, 0.1], leftUpperArm: [-0.5, 0, 0.3], rightUpperArm: [-0.5, 0, -0.3] }, rate: 0.18 };
  if (state === 'dormant') return { pose: Object.assign(idle(t, 0.3), stand, { neck: [0.25, 0, 0], head: [0.15, 0, 0] }), rate: 0.08 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}, w = a.phase === 'windup' ? ease(Math.min(1, a.t / (A.windup || 1))) : 1, act = a.phase !== 'windup';
    if (a.name === 'rewind') return { pose: Object.assign({}, stand, { leftUpperArm: [-1.5 * w, 0, 0.2], leftLowerArm: [-0.1, 0, 0], head: [-0.15 * w, 0, 0] }), rate: 0.2 };
    if (a.name === 'echo') return { pose: act ? Object.assign(locomotion(t * 9, 4, { k: 1 }), { spine: [0.5, 0, 0] }) : Object.assign({}, stand, { spine: [0.35 * w, 0, 0], hipsY: -0.15 * w, leftUpperLeg: [-0.6 * w, 0, 0], leftLowerLeg: [0.9 * w, 0, 0] }), rate: act ? 0.6 : 0.2 };
    if (a.name === 'accident') return { pose: Object.assign({}, stand, { leftUpperArm: [-0.2, 0, 1.4 * w], rightUpperArm: [-0.2, 0, -1.4 * w], rightLowerArm: [-0.2, 0, 0], leftLowerArm: [-0.2, 0, 0], spine: [-0.2 * w, 0, 0], head: [-0.3 * w, 0, 0] }), rate: act ? 0.5 : 0.15 };
    return { pose: Object.assign({}, stand, act ? { spine: [0.3, -0.5, 0], rightUpperArm: [-1.2, 0, -0.9], rightLowerArm: [-0.2, 0, 0] } : { spine: [-0.1, 0.5 * w, 0], rightUpperArm: [-1.6 * w, 0, -0.2], rightLowerArm: [-0.8, 0, 0] }), rate: act ? 0.75 : 0.2 };
  }
  if (state === 'stagger') return { pose: Object.assign({}, stand, { spine: [-0.3, 0.3, 0], head: [-0.4, 0, 0.3], hipsY: -0.06 }), rate: 0.3 };
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.6, noArms: true }) : idle(t, 0.4), stand), rate: 0.25 };
}
/** 配偶者に似た異形：静かに立つ。look（研究者の方を見る）は actor の向きで */
export function spousePose(ctx) { return { pose: Object.assign(idle(ctx.t || 0, 0.25), { spine: [0.02, 0, 0], neck: [0.12, 0, 0], leftUpperArm: [0.05, 0, 0.08], rightUpperArm: [0.05, 0, -0.08], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0] }), rate: 0.05 }; }
/** 娘：立つ・走る・だっこ（両腕を上へ）・しがみつく */
export function daughterPose(ctx) {
  const { mode, t } = ctx, sp = ctx.speed || 0;
  if (mode === 'hug') return { pose: { leftUpperArm: [-2.4, 0, 0.5], rightUpperArm: [-2.4, 0, -0.5], leftLowerArm: [-0.6, 0, 0], rightLowerArm: [-0.6, 0, 0], head: [-0.3, 0, 0], spine: [-0.1, 0, 0] }, rate: 0.2 };
  if (sp > 0.05) return { pose: locomotion(ctx.phase, sp, { k: 1.1 }), rate: 0.5 };
  return { pose: Object.assign(idle(t, 0.9), { head: [S(t * 0.8) * 0.05, S(t * 0.5) * 0.2, 0] }), rate: 0.15 };
}
