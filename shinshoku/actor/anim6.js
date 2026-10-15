// フェーズ7 の手続きアニメ：塗替（骨を直接回す）・当直／待人（人型の姿勢＝Poser）。
import { locomotion, idle, ease } from './anim.js';
import { Sway } from './actors.js';
const S = Math.sin, C = Math.cos;

/** 塗替：脚の歩き（電柱の脚がぎこちなく）・電線の腕の揺れ・攻めの姿勢（薙ぎ＝腕を払う／光線＝冠を向けて反る／雨＝腕を上げて振る／塗り替え＝前へ伸ばす）・崩れ */
export class NurikaeAnimator {
  constructor(model) { this.m = model; this.sway = new Sway(model.sway || []); this.t = 0; this.k = {}; this.ph = 0; }
  update(dt, e) {
    const B = this.m.G, b = e.brain, t = (this.t += dt), st = b.state, a = b.atk;
    const A = a ? b.def.attacks[a.name] : null, w = a ? (a.phase === 'windup' ? ease(a.t / A.windup) : a.phase === 'active' ? 1 : Math.max(0, 1 - a.t / A.recover)) : 0;
    const sp = e.speed || 0; this.ph += sp * dt * 0.35;
    const want = { hip: [0, S(t * 0.4) * 0.05, 0], body: [0.18 + S(t * 0.7) * 0.03, 0, S(t * 0.5) * 0.03], chest: [0.08, S(t * 0.3) * 0.12, 0], head: [S(t * 0.6) * 0.06, S(t * 0.35) * 0.2, 0], armL: [0.1, 0, 0.2], armR: [0.1, 0, -0.2], swing: 0.12 };
    if (a && a.name === 'sweep') { const sx = (b.patIdx % 2) ? 1 : -1; if (a.phase === 'windup') { want.chest = [-0.15 * w, sx * 0.6 * w, 0]; want['arm' + (sx > 0 ? 'L' : 'R')] = [-1.6 * w, 0, sx * 0.9 * w]; } else { want.chest = [0.3, -sx * 0.7, 0]; want['arm' + (sx > 0 ? 'L' : 'R')] = [-1.2, 0, -sx * 0.6]; } }
    if (a && (a.name === 'beam' || a.name === 'feed')) { want.body = [-0.25 * w, 0, 0]; want.head = [-0.35 * w, 0, 0]; if (a.name === 'feed') { want.body = [0.4 * w, 0, 0]; want.armL = [-1.4 * w, 0, 0.2]; want.armR = [-1.4 * w, 0, -0.2]; } }
    if (a && a.name === 'rain') { want.armL = [-2.6 * w, 0, 0.5]; want.armR = [-2.6 * w, 0, -0.5]; want.head = [-0.4 * w, 0, 0]; want.swing = 0.6 * w; }
    if (st === 'stagger' || st === 'down') { want.body = [0.55, 0, 0.18]; want.chest = [0.35, 0, 0]; want.head = [0.5, 0.3, 0.2]; want.armL = [0.4, 0, 0.6]; want.armR = [0.4, 0, -0.6]; }
    if (st === 'dead') { want.body = [0.9, 0, 0.3]; want.chest = [0.6, 0, 0.1]; want.head = [0.8, 0, 0.3]; }
    const L = (o, key, v, r = 4) => { const c = this.k[key] || (this.k[key] = [0, 0, 0]); for (let i = 0; i < 3; i++) c[i] += ((v[i] || 0) - c[i]) * Math.min(1, dt * r); o.rotation.set(c[0], c[1], c[2]); return c; };
    L(B.nHip, 'hip', want.hip); L(B.nBody, 'body', want.body); L(B.nChest, 'chest', want.chest, a && a.phase === 'active' ? 10 : 4); L(B.nHead, 'head', want.head);
    for (const Ar of this.m.arms) { const key = 'arm' + Ar.s, c = L(B[Ar.n[0]], key, want[key], a && a.phase === 'active' ? 9 : 3.5); Ar.n.slice(1).forEach((n, i) => { B[n].rotation.x = -0.15 + S(t * 1.3 + i + (Ar.sx > 0 ? 0 : 1.6)) * want.swing * (i + 1) * 0.5; B[n].rotation.z = Ar.sx * 0.08 * (i + 1); }); void c; }
    // 脚：重い歩き（交互に）
    const walk = Math.min(1, sp / 1.2);
    this.m.legs.forEach((Lg, i) => { const q = this.ph * 6 + (i ? Math.PI : 0); B[Lg.n[0]].rotation.x = -S(q) * 0.32 * walk; B[Lg.n[1]].rotation.x = Math.max(0, C(q)) * 0.45 * walk; });
    B.nHip.position.y = 1.0 + Math.abs(S(this.ph * 6)) * 0.03 * walk - (st === 'down' || st === 'stagger' ? 0.12 : 0) - (st === 'dead' ? 0.3 : 0);
    this.sway.step(dt, t, sp, 0, a && a.phase === 'active' ? 0.6 : 0);
  }
}

/** 当直：重い作業着の歩き。輪＝巡回（計器をのぞく）。攻め：レンチ（振り上げて落とす）・蒸気（前かがみで背の配管を向ける）・叩きつけ（両腕を頭上から）。
 *  round（弁をいじる）＝かがんで両手を前へ。down＝ひざをつく。rest＝座りこんで点検表を読む。locked＝片ひざで右腕が配管に留められている */
export function touchokuPose(ctx) {
  const { state, t } = ctx;
  const heavy = { spine: [0.14, 0, 0], chest: [0.06, 0, 0], neck: [0.1, 0, 0], head: [0.06, 0, 0], leftUpperArm: [-0.25, 0, 0.18], leftLowerArm: [-1.1, 0, 0], rightUpperArm: [0.05, 0, -0.22], rightLowerArm: [-0.3, 0, 0] };
  const kneel = { hipsY: -0.5, leftUpperLeg: [-1.4, 0, 0.1], leftLowerLeg: [1.6, 0, 0], rightUpperLeg: [-0.2, 0, -0.1], rightLowerLeg: [1.9, 0, 0], rightFoot: [0.4, 0, 0], spine: [0.45, 0, 0], neck: [0.4, 0, 0] };
  if (state === 'rest') return { pose: { hipsY: -0.82, spine: [0.3, 0, 0], neck: [0.45, 0, 0], head: [0.2, 0, 0], leftUpperLeg: [-1.45, 0, 0.15], rightUpperLeg: [-1.45, 0, -0.15], leftLowerLeg: [1.5, 0, 0], rightLowerLeg: [1.5, 0, 0], leftUpperArm: [-1.0, 0, 0.1], leftLowerArm: [-1.3, 0, 0], rightUpperArm: [-0.4, 0, -0.1], rightLowerArm: [-0.8, 0, 0] }, rate: 0.05 };
  if (state === 'locked') return { pose: Object.assign({}, kneel, { rightUpperArm: [-1.3, 0, -0.5], rightLowerArm: [-0.2, 0, 0], leftUpperArm: [-0.4, 0, 0.3], leftLowerArm: [-0.8, 0, 0], head: [0.3, 0, 0.2] }), rate: 0.08 };
  if (state === 'down') return { pose: Object.assign({}, kneel, { leftUpperArm: [-0.6, 0, 0.4], rightUpperArm: [-0.6, 0, -0.4], leftLowerArm: [-0.5, 0, 0], rightLowerArm: [-0.5, 0, 0], head: [0.5 + S(t * 3) * 0.05, 0, 0.2] }), rate: 0.18 };
  if (state === 'round' && (ctx.speed || 0) < 0.1) return { pose: Object.assign({}, heavy, { hipsY: -0.25, spine: [0.7, 0, 0], neck: [0.2, 0, 0], leftUpperLeg: [-0.7, 0, 0.1], rightUpperLeg: [-0.7, 0, -0.1], leftLowerLeg: [1.0, 0, 0], rightLowerLeg: [1.0, 0, 0], leftUpperArm: [-1.3, 0, 0.2], rightUpperArm: [-1.3 + S(t * 6) * 0.25, 0, -0.2], leftLowerArm: [-0.4, 0, 0], rightLowerArm: [-0.4, 0, 0] }), rate: 0.25 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}, w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'steam') return { pose: Object.assign({}, heavy, act ? { spine: [0.9, 0, 0], neck: [-0.4, 0, 0], leftUpperArm: [-0.6, 0, 0.6], rightUpperArm: [-0.6, 0, -0.6] } : { spine: [0.9 * w, 0, 0], neck: [-0.4 * w, 0, 0], leftUpperArm: [0.3 * w, 0, 0.5], rightUpperArm: [0.3 * w, 0, -0.5] }), rate: act ? 0.5 : 0.15 };
    if (a.name === 'slam') return { pose: Object.assign({}, heavy, act ? { spine: [0.65, 0, 0], leftUpperArm: [-1.4, 0, 0.2], rightUpperArm: [-1.4, 0, -0.2], leftLowerArm: [-0.1, 0, 0], rightLowerArm: [-0.1, 0, 0], hipsY: -0.2, leftUpperLeg: [-0.5, 0, 0], leftLowerLeg: [0.8, 0, 0] } : { spine: [-0.3 * w, 0, 0], leftUpperArm: [-2.9 * w, 0, 0.2], rightUpperArm: [-2.9 * w, 0, -0.2], leftLowerArm: [-0.5, 0, 0], rightLowerArm: [-0.5, 0, 0] }), rate: act ? 0.7 : 0.18 };
    return { pose: Object.assign({}, heavy, act ? { spine: [0.5, -0.4, 0], rightUpperArm: [-0.9, 0, -0.2], rightLowerArm: [-0.1, 0, 0] } : { spine: [-0.15 * w, 0.45 * w, 0], rightUpperArm: [-2.7 * w, 0, -0.3], rightLowerArm: [-0.6, 0, 0], head: [-0.2 * w, 0, 0] }), rate: act ? 0.75 : 0.2 };
  }
  if (state === 'stagger') return { pose: Object.assign({}, heavy, { spine: [-0.35, 0.3, 0], head: [-0.4, 0, 0.3], hipsY: -0.08 }), rate: 0.3 };
  if (state === 'loop' && (ctx.speed || 0) < 0.1) return { pose: Object.assign(idle(t, 0.4), heavy, { spine: [0.3, 0, 0], neck: [0.3, 0, 0], leftUpperArm: [-1.1, 0, 0.1], leftLowerArm: [-1.2, 0, 0] }), rate: 0.1 };
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.7, legLen: 1.05, noArms: true }) : idle(t, 0.5), heavy), rate: 0.3 };
}

/** 待人：時計を見る（左手を上げて懐中時計をのぞく）・ついてくる・悲しげに戻る（うなだれる）・怒る（押しのけ・時計を掲げる）・眠る（座って傾く）・休む（ベンチに座る） */
export function machibitoPose(ctx) {
  const { state, t } = ctx;
  const thin = { spine: [0.06, 0, 0], neck: [0.05, 0, 0] };
  if (state === 'rest') return { pose: { hipsY: -0.48, spine: [0.1, 0, 0], neck: [0.2, 0, 0], leftUpperLeg: [-1.5, 0, 0.08], rightUpperLeg: [-1.5, 0, -0.08], leftLowerLeg: [1.5, 0, 0], rightLowerLeg: [1.5, 0, 0], leftUpperArm: [-0.5, 0, 0.1], leftLowerArm: [-1.2, 0, 0], rightUpperArm: [-0.3, 0, -0.1], rightLowerArm: [-0.6, 0, 0] }, rate: 0.05 };
  if (state === 'sleep') return { pose: { hipsY: -0.5, spine: [0.55, 0, 0.15], neck: [0.6, 0, 0.3], leftUpperLeg: [-1.5, 0, 0.1], rightUpperLeg: [-1.5, 0, -0.1], leftLowerLeg: [1.6, 0, 0], rightLowerLeg: [1.6, 0, 0], leftUpperArm: [0.1, 0, 0.1], rightUpperArm: [0.1, 0, -0.1] }, rate: 0.04 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}, w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'stopclock') return { pose: Object.assign({}, thin, { leftUpperArm: [-2.8 * w, 0, 0.2], leftLowerArm: [-0.2, 0, 0], head: [-0.3 * w, 0, 0], spine: [-0.2 * w, 0, 0] }), rate: act ? 0.5 : 0.15 };
    return { pose: Object.assign({}, thin, act ? { spine: [0.4, 0.2, 0], rightUpperArm: [-1.4, 0, -0.1], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-1.2, 0, 0.1] } : { spine: [-0.1 * w, -0.3 * w, 0], rightUpperArm: [-0.8 * w, 0, -0.5], leftUpperArm: [-0.6 * w, 0, 0.4] }), rate: act ? 0.7 : 0.2 };
  }
  if (state === 'stagger' || state === 'down') return { pose: Object.assign({}, thin, { spine: [-0.35, 0.3, 0], head: [-0.4, 0, 0.3], hipsY: state === 'down' ? -0.4 : -0.06 }), rate: 0.3 };
  const sp = ctx.speed || 0;
  if (state === 'sad') return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.5 }) : idle(t, 0.3), { spine: [0.3, 0, 0], neck: [0.5, 0, 0], head: [0.2, 0, 0], leftUpperArm: [0.05, 0, 0.05], rightUpperArm: [0.05, 0, -0.05] }), rate: 0.25 };
  if (state === 'loop' && sp < 0.1) return { pose: Object.assign(idle(t, 0.4), thin, { leftUpperArm: [-1.0, 0.2, 0.25], leftLowerArm: [-1.5, 0, 0], neck: [0.35, 0, 0], head: [0.25, 0, 0], rightUpperArm: [0.05, 0, -0.08] }), rate: 0.1 };
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: 0.6 }) : idle(t, 0.4), thin), rate: 0.3 };
}
