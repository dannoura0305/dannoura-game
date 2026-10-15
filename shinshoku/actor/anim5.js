// フェーズ6 の手続きアニメ：巨大猫又（作り直し：長い脚の四つ足・暴走・守る）・境界の先触れ（作り直し）・継接・収容者（被験者）。
// 骨を直接回す（巨体・異形）。人型の収容者は anim.js の姿勢（Poser）を返す。
import { locomotion, idle, ease } from './anim.js';
import { Sway } from './actors.js';
const S = Math.sin, C = Math.cos;

/**
 * 巨大猫又の姿勢。g：{ phase, speed, st:{name,f,...}, turn, rampK（暴走の強さ 0〜1）, protect:{kind,f} }
 * 四つ足の歩き（対角の脚が組）・尾のばね・耳・咆哮で口が開く・低く構えた頭。
 * 暴走（rampage）：力があふれて体が言うことを聞かない＝頭を振り、前脚で地を掻き、背の毛が逆立つ。本人は抑えようとしている（抑える入力で揺れが小さくなる）。
 */
export class GiantAnimator {
  constructor(model) { this.m = model; this.sway = new Sway(model.sway || []); this.t = 0; this.by = model.bodyY || 0.62; }
  update(dt, g) {
    const B = this.m.G, t = (this.t += dt), sp = g.speed || 0, st = g.st || { name: 'free', f: 0 };
    const walk = Math.min(1, sp / 4), ph = g.phase || 0, rk = g.rampK || 0;
    const legs = [['FL', 'L', 0], ['FR', 'R', Math.PI], ['HL', 'L', Math.PI], ['HR', 'R', 0]];
    for (const [k, s, off] of legs) {
      const q = ph + off, front = k[0] === 'F', A = 0.5 * walk, sw = S(q) * A, lift = Math.max(0, C(q)) * A;
      if (front) { B['gFLu' + s].rotation.set(-sw * 0.85, 0, 0); B['gFLl' + s].rotation.x = lift * 0.9; B['gFLp' + s].rotation.x = -lift * 0.6 + sw * 0.3; }
      else { B['gHLu' + s].rotation.set(-sw * 0.75 - 0.05, 0, 0); B['gHLl' + s].rotation.x = lift * 0.6; B['gHLh' + s].rotation.x = -lift * 0.7; B['gHLp' + s].rotation.x = lift * 0.5; }
    }
    const breathe = S(t * 1.5) * 0.01;
    B.gBody.position.y = this.by + Math.abs(S(ph)) * 0.02 * walk + breathe;
    B.gBody.rotation.z = S(ph) * 0.025 * walk; B.gChest.rotation.x = breathe * 2;
    // 頭：低く構え、見回す
    let head = [0.12 + S(t * 0.7) * 0.03, S(t * 0.4) * 0.12, 0], neck = [0.05, 0, 0], jaw = 0.04, chest = [breathe * 2, 0, 0], body = [0, 0, B.gBody.rotation.z];
    const n = st.name, f = st.f || 0;
    if (n === 'claw') {
      const step = st.step || 0, a = st.atk || { startup: 10, active: 5 }, side = step % 2 ? 'R' : 'L', k = f < a.startup ? ease(f / a.startup) : Math.max(0, 1 - (f - a.startup) / (a.active + 8));
      const strike = f >= a.startup && f < a.startup + a.active + 4;
      B['gFLu' + side].rotation.x = strike ? 0.9 : -1.5 * k; B['gFLl' + side].rotation.x = strike ? -0.2 : 1.2 * k; B['gFLu' + side].rotation.z = (side === 'L' ? -1 : 1) * (strike ? 0.35 : -0.25 * k);
      if (step === 2) { chest = [-0.4 * k, 0, 0]; B.gFLuL.rotation.x = B.gFLuR.rotation.x = strike ? 0.8 : -1.4 * k; }
      head = [0.2, (side === 'L' ? 0.2 : -0.2) * k, 0]; jaw = 0.35 * k;
    } else if (n === 'roar') { const k = Math.min(1, f / 8); head = [-0.5 * k, 0, 0]; neck = [-0.3 * k, 0, 0]; jaw = 0.8 * k; chest = [-0.15 * k, 0, 0]; }
    else if (n === 'leap') { const L = 42, u = f / L; chest = [-0.5 * S(u * Math.PI), 0, 0]; for (const s of ['L', 'R']) { B['gFLu' + s].rotation.x = -1.0 * S(u * Math.PI); B['gHLu' + s].rotation.x = 0.9 * S(u * Math.PI); } }
    else if (n === 'beam' || n === 'beamEnd') { const k = n === 'beam' ? Math.min(1, f / 18) : Math.max(0, 1 - f / 18); head = [0.1 * k, 0, 0]; jaw = 0.65 * k; chest = [0.15 * k, 0, 0]; body = [-0.08 * k, 0, 0]; }
    else if (n === 'hurt') { head = [-0.3, 0.3, 0.2]; chest = [-0.2, 0, 0.1]; }
    else if (n === 'dead') { chest = [0.3, 0, 0.6]; head = [0.4, 0, 0.5]; }
    else if (n === 'rampage') {
      // 揺れの大きさ＝暴走の強さ。頭を振る・前脚で地を掻く・身をよじる
      const k = rk, w1 = S(t * 2.3), w2 = S(t * 3.7 + 1);
      head = [-0.2 * k + 0.25 * w2 * k, 0.55 * w1 * k, 0.25 * w2 * k]; neck = [-0.15 * k, 0.2 * w1 * k, 0]; jaw = 0.25 + 0.5 * k * Math.max(0, w2);
      chest = [-0.15 * k * Math.max(0, w1), 0.12 * w2 * k, 0.1 * w1 * k]; body = [0, 0, 0.08 * w2 * k];
      const paw = Math.max(0, S(t * 4.1)) * k; B.gFLuL.rotation.x += -1.1 * paw; B.gFLlL.rotation.x += 1.0 * paw;
    } else if (n === 'brace') { const k = Math.min(1, f / 20); head = [0.35 * k, 0, 0]; chest = [0.15 * k, 0, 0]; for (const s of ['L', 'R']) { B['gFLu' + s].rotation.x = -0.25 * k; B['gHLu' + s].rotation.x = 0.35 * k; } }
    else if (n === 'tailSweep') { const k = S(Math.min(1, f / 26) * Math.PI); body = [0, 0, 0.12 * k]; chest = [0, -0.35 * k, 0]; head = [0.1, 0.4 * k, 0]; }
    else if (n === 'shield') { const k = Math.min(1, f / 10); chest = [0.25 * k, 0, 0]; head = [0.4 * k, 0, 0]; for (const s of ['L', 'R']) { B['gFLu' + s].rotation.x = -0.4 * k; B['gFLl' + s].rotation.x = 0.5 * k; } B.gBody.position.y -= 0.08 * k; }
    else if (n === 'lift') { const k = S(Math.min(1, f / 50) * Math.PI); B.gFLuL.rotation.x = -1.4 * k; B.gFLlL.rotation.x = 0.4 * k; chest = [-0.3 * k, 0, 0]; head = [0.3 * k, 0, 0]; }
    B.gHead.rotation.set(head[0], head[1], head[2]); B.gNeck.rotation.set(neck[0], neck[1], 0); B.gJaw.rotation.x = jaw; B.gChest.rotation.set(chest[0], chest[1], chest[2]); B.gBody.rotation.x = body[0]; if (body[2]) B.gBody.rotation.z = body[2];
    // 耳：咆哮・暴走で伏せる（怒り）
    const tw = S(t * 3.1) > 0.97 ? 0.3 : 0, flat = n === 'roar' || n === 'rampage' ? 0.6 * (n === 'rampage' ? rk : 1) : 0;
    B.gEarL.rotation.z = -0.1 - tw - flat * 0.5; B.gEarR.rotation.z = 0.1 + tw * 0.5 + flat * 0.5; B.gEarL.rotation.x = B.gEarR.rotation.x = n === 'roar' ? 0.6 : -walk * 0.2 + flat;
    this.sway.step(dt, t, sp + rk * 3, g.turn || 0, n === 'leap' ? 1.2 : n === 'claw' ? 0.4 : n === 'tailSweep' ? 1.4 : n === 'rampage' ? 0.9 * rk : 0);
    if (this.m.update) this.m.update(dt);
  }
}

/** 収容者：うつむいて足を引きずる歩き。鐘で戸口に立つ（気をつけ）。休む（部屋の床に座る）。攻め：押しのけ・つかみ */
export function shuushaPose(ctx) {
  const { state, t } = ctx;
  const stoop = { spine: [0.22, 0, 0.03], chest: [0.1, 0, 0], neck: [0.32, 0, 0.1 * S(t * 0.5)], head: [0.2, 0, 0.12], leftUpperArm: [0.08, 0, 0.06], rightUpperArm: [0.08, 0, -0.06], leftLowerArm: [-0.25, 0, 0], rightLowerArm: [-0.25, 0, 0] };
  if (state === 'rest') return { pose: { hipsY: -0.62, spine: [0.5, 0, 0], neck: [0.5, 0, 0], head: [0.3, 0, 0], leftUpperLeg: [-1.45, 0, 0.12], rightUpperLeg: [-1.45, 0, -0.12], leftLowerLeg: [1.6, 0, 0], rightLowerLeg: [1.6, 0, 0], leftUpperArm: [-0.5, 0, 0.1], rightUpperArm: [-0.5, 0, -0.1], leftLowerArm: [-1.2, 0, 0], rightLowerArm: [-1.2, 0, 0] }, rate: 0.05 };
  if (state === 'bell' && ctx.speed < 0.1) return { pose: Object.assign(idle(t, 0.2), { spine: [0.02, 0, 0], neck: [0.05, 0, 0], head: [0.1, 0, 0], leftUpperArm: [0, 0, 0.04], rightUpperArm: [0, 0, -0.04] }), rate: 0.1 };
  if (state === 'hostile' && ctx.atk) {
    const a = ctx.atk, A = ctx.atkDef || {}, w = a.phase === 'windup' ? ease(a.t / (A.windup || 1)) : 1, act = a.phase !== 'windup';
    if (a.name === 'grab') return { pose: act ? Object.assign({}, stoop, { spine: [0.55, 0, 0], leftUpperArm: [-1.55, 0, 0.1], rightUpperArm: [-1.55, 0, -0.1], leftLowerArm: [-0.15, 0, 0], rightLowerArm: [-0.15, 0, 0] }) : Object.assign({}, stoop, { spine: [-0.15 * w, 0, 0], leftUpperArm: [-1.3, 0, 1.0 * w], rightUpperArm: [-1.3, 0, -1.0 * w] }), rate: act ? 0.6 : 0.15 };
    return { pose: act ? Object.assign({}, stoop, { spine: [0.4, 0.2, 0], rightUpperArm: [-1.4, 0, -0.1], rightLowerArm: [-0.1, 0, 0], leftUpperArm: [-1.2, 0, 0.1] }) : Object.assign({}, stoop, { spine: [-0.1 * w, -0.3 * w, 0], rightUpperArm: [-0.9 * w, 0, -0.5], leftUpperArm: [-0.7 * w, 0, 0.4] }), rate: act ? 0.7 : 0.2 };
  }
  if (state === 'stagger' || state === 'down') return { pose: Object.assign({}, stoop, { spine: [-0.35, 0.3, 0], head: [-0.5, 0, 0.4], hipsY: state === 'down' ? -0.4 : -0.06 }), rate: 0.3 };
  if (state === 'assess') return { pose: Object.assign({}, idle(t, 0.3), stoop, { neck: [0, 0, 0.6 * S(t * 2.0)], head: [-0.2, 0, 0.5] }), rate: 0.08 };
  const sp = ctx.speed || 0;
  return { pose: Object.assign(sp > 0.05 ? locomotion(ctx.phase, sp, { k: sp > 2 ? 0.95 : 0.4, legLen: 0.92 }) : idle(t, 0.45), stoop), rate: 0.3 };
}

/**
 * 継接：骨を直接回す。actor：EnemyActor（brain・speed・phase）。部分が壊れたら骨の大きさを 0 にして隠す（黒い霧はゲーム側）。
 * 輪＝脚で歩き、止まると右腕で戸を叩き、左腕は鞄を揺らす。攻め＝叩く（右腕を振り上げて落とす）・抱き寄せ（左腕を伸ばす）・踏みつけ（前脚を上げる）・暴れる・叫ぶ。
 */
export class TsugiAnimator {
  constructor(model) { this.m = model; this.sway = new Sway(model.sway || []); this.t = 0; this.k = {}; this.drop = 0; }
  update(dt, e) {
    const B = this.m.G, b = e.brain, t = (this.t += dt), st = b.state, a = b.atk, P = b.parts || {};
    const A = a ? b.def.attacks[a.name] : null, w = a ? (a.phase === 'windup' ? ease(a.t / A.windup) : a.phase === 'active' ? 1 : Math.max(0, 1 - a.t / A.recover)) : 0;
    const sp = e.speed || 0, ph = e.phase || 0, walk = Math.min(1, sp / 1.5);
    const want = { hip: [0, 0, S(t * 0.8) * 0.04], body: [0.12 + S(t * 0.9) * 0.03, 0, 0], chest: [0.1, S(t * 0.4) * 0.15, 0], hA: [S(t * 0.7) * 0.1, S(t * 0.5) * 0.3, 0], hB: [0.2, 0.3, 0.4 + S(t * 1.1) * 0.1], hC: [-0.1, -0.3, -0.3], r0: [0, 0, -0.15], r1: [-0.2, 0, 0], r2: [-0.3, 0, 0], l0: [-0.3, 0, 0.2], l1: [-0.9, 0, 0], l2: [-0.6, 0.4, 0] };
    // 輪：戸を叩く（止まっている間）・鞄を揺らす
    if (st === 'loop' && b.loopSub === 'knock') { const k = Math.max(0, S(t * 6)); want.r0 = [-1.8 + k * 0.9, 0, -0.3]; want.r1 = [-0.6 * k, 0, 0]; }
    want.l0[0] += S(t * 1.6) * 0.15; want.l2[1] += S(t * 1.6) * 0.2;
    if (a) {
      if (a.name === 'knock') { if (a.phase === 'windup') { want.r0 = [-2.6 * w, 0, -0.4]; want.r1 = [-0.8 * w, 0, 0]; want.chest = [-0.25 * w, -0.3 * w, 0]; } else { want.r0 = [-0.3, 0, -0.1]; want.r1 = [-0.1, 0, 0]; want.chest = [0.45, 0.2, 0]; } }
      if (a.name === 'embrace') { want.l0 = [-1.4 * w, 0, 0.6 * (1 - w)]; want.l1 = [-0.2, 0, 0]; want.l2 = [-0.2, 0, 0]; want.chest = [0.3 * w, 0.25 * w, 0]; }
      if (a.name === 'stomp') { want.hip = [-0.15 * w, 0, 0]; want.legA = a.phase === 'windup' ? -1.2 * w : 0.3; }
      if (a.name === 'thrash') { const k = a.phase === 'windup' ? w : 1; want.chest = [0.1, S(t * 14) * 0.6 * k, S(t * 11) * 0.2 * k]; want.r0 = [-1.0 + S(t * 13) * 0.8 * k, 0, -0.6]; want.l0 = [-1.0 + S(t * 12) * 0.8 * k, 0, 0.6]; }
      if (a.name === 'cry') { want.hA = [-0.6 * w, 0, 0]; want.hB = [-0.4 * w, 0.4, 0.6]; want.hC = [-0.5 * w, -0.4, -0.5]; want.chest = [-0.3 * w, 0, 0]; }
    }
    if (st === 'down') { want.hip = [0.2, 0, 0.1]; want.body = [0.6, 0, 0.1]; want.chest = [0.4, 0, 0]; want.hA = [0.5, 0, 0]; }
    if (st === 'unravel' || st === 'fallen' || st === 'dead') { want.body = [0.7, 0, 0.2]; want.chest = [0.5, 0, 0.1]; want.hA = [0.7, 0, 0.3]; want.r0 = [0.4, 0, -0.6]; want.l0 = [0.3, 0, 0.6]; }
    const L = (o, key, v, rate = 5) => { const c = this.k[key] || (this.k[key] = [0, 0, 0]); for (let i = 0; i < 3; i++) c[i] += ((v[i] || 0) - c[i]) * Math.min(1, dt * rate); o.rotation.set(c[0], c[1], c[2]); };
    L(B.tHip, 'hip', want.hip); L(B.tBody, 'body', want.body); L(B.tChest, 'chest', want.chest, a && a.name === 'thrash' ? 14 : 5);
    L(B.tHeadA, 'hA', want.hA); L(B.tHeadB, 'hB', want.hB); L(B.tHeadC, 'hC', want.hC);
    const R = this.m.names.R, Ln = this.m.names.L, fast = a && a.phase !== 'windup' ? 16 : 6;
    L(B[R[0]], 'r0', want.r0, fast); L(B[R[1]], 'r1', want.r1, fast); L(B[R[2]], 'r2', want.r2, fast);
    L(B[Ln[0]], 'l0', want.l0, fast); L(B[Ln[1]], 'l1', want.l1, fast); L(B[Ln[2]], 'l2', want.l2, fast);
    // 脚：歩き（対角）・踏みつけ
    this.m.legs.forEach((lg, i) => { const q = ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0); const sw = S(q) * 0.45 * walk, lift = Math.max(0, C(q)) * 0.5 * walk; B[lg.n[0]].rotation.x = -sw + (i === 0 && want.legA != null ? want.legA : 0); B[lg.n[1]].rotation.x = lift * 0.8; });
    // 部分の隠し（骨の大きさ 0）・脚が無い時は腰を落とす
    const vis = (bn, on) => { const s = on ? 1 : Math.max(0.0001, B[bn].scale.x - dt * 3); B[bn].scale.setScalar(on ? 1 : s); };
    vis(R[0], P.right ? P.right.alive : true); vis(Ln[0], P.left ? P.left.alive : true); vis('tLegs', P.legs ? P.legs.alive : true); vis('tBag', b.bag === 'held');
    const down = (P.legs && !P.legs.alive) || st === 'unravel' ? 1 : 0; this.drop += (down - this.drop) * Math.min(1, dt * 2.5);
    B.tHip.position.y = 1.3 - this.drop * 1.0 + (st === 'down' ? -0.25 : 0) + Math.abs(S(ph)) * 0.04 * walk;
    this.sway.step(dt, t, sp, 0, a && a.phase === 'active' ? 0.6 : 0);
  }
}
