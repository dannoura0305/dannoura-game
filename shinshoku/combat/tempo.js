// だんのうらの動きの「緩急」（見た目の時間配分・移動の加減速・息切れ・よろけ）。DOM・three.js なし（node でテストする）。
// 2026-11-13：利用者の指摘「通常時も動きがよく戦闘が快調。白髪化との差別化ができていない」への対応。
//   紫（生身の人間）＝溜め（遅い）→ 打ち（速い）→ 余韻（止まる）→ 重い戻り。走り出し・止まり・振り向きに加減速。連続で動くと息が上がる。被弾でよろける。
//   白（猫又の力）＝予備動作が短く小さい・戻りも短い・加減速がほとんど無い・残像。
// 当たり判定のこま（startup・active・recovery）・ダメージ・パリィや回避の受付の窓は data/combat.js のまま変えない。
// ここは「同じこまの中で、見た目の進みをどう配るか」と、移動の速さの曲線だけを持つ。
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOutPow = (t, p) => 1 - Math.pow(1 - clamp(t), p);
/** 振り（0..1）：初めに加速し（1 こま目から 0 ではない）、終わりは減速して止まる（anim.js の前の swingK と同じ形） */
export const swingK = t => { t = clamp(t); return t < 0.35 ? 0.15 * t / 0.35 + 0.6 * (t / 0.35) ** 2 * 0.5 : 1 - (1 - 0.45) * Math.pow((1 - t) / 0.65, 2.2); };

export const TEMPO = {
  purple: {
    windPow: 2.6,          // 溜め：構えへ早めに入って（6 割で約 9 割）、残りはじわじわ詰める（ため）
    windAmp: 1,            // 構えの深さ（1＝振りかぶりの姿勢まで）
    hold: 0.38,            // 余韻：戻り（recovery）の初めの 38% は振り抜いた形のまま止まる（戻りの隙が見える）
    holdDrift: 0.08,       // 余韻の間のクリップの進み（止まりきらず、わずかに流れる）
    overrun: 0.12,         // 余韻で振り抜いた向きへ少し流れる量
    retEnd: 1,             // 戻りが終わる所（recovery の割合）：最後まで使ってゆっくり構えへ
    lunge: { wind: 0.6, strike: 1.3 },    // 踏み込みの配分：溜めの間は足を置き、打ちで踏み込む（合計の距離は data のまま）
    hitstop: { light: 4, heavy: 7 },      // こま（前は紫・白とも 3・5）：紫は当たりが重い
    punch: { light: 0.9, heavy: 2.6, t: 0.42 },   // カメラの寄り（画角を何度狭めるか・秒）：紫は重く長く
    move: { up: 7.5, down: 12, upMin: 3, downMin: 12, turn: 0.17 },   // 走り出し 90% まで約 0.3 秒・止まり約 0.25 秒（走りから約 0.33m 流れ、最後は一定の減速で止まり切る）・向きの変わる速さ（前は即時・0.25）
    hurtWarp: 'heavy', hurtLinger: 0.6, hurtSlow: 0.45,   // よろけ：被弾の後 0.6 秒まで体が前へ折れ、足が遅い（0.45 倍から戻る）
    rollRise: 0.32,        // 転がりの後の起き上がり（秒）
    tired: { atk: 0.09, heavy: 0.15, pipe: 0.13, dodge: 0.14, hurt: 0.1, run: 0.03, runCap: 0.3, idle: 0.22, walk: 0.08, delay: 0.6, slow: 0.1 },
  },
  white: {
    windPow: 1.6,
    windAmp: 0.62,         // 予備動作は小さく（振りかぶりの 6 割）
    windFast: 1.5,         // 予備動作の進み（startup の 2/3 で構え切って打つ）
    hold: 0.06, holdDrift: 0.02, overrun: 0.05,
    retEnd: 0.6,           // 戻りは recovery の 6 割で構えへ戻り切る（残りは構えのまま＝次へすぐ動ける見た目）
    lunge: { wind: 1.5, strike: 0.7 },    // 踏み込みは先に（すっと間合いへ入る）
    hitstop: { light: 2, heavy: 4 },
    punch: { light: 0.5, heavy: 1.4, t: 0.14 },
    move: { up: 24, down: 18, upMin: 12, downMin: 20, turn: 0.34 },
    hurtWarp: 'light', hurtLinger: 0.15, hurtSlow: 0.9,
    rollRise: 0,
    tired: null,
  },
};
const T = form => TEMPO[form === 'white' ? 'white' : 'purple'];

/**
 * 攻撃の見た目の進み。a：{ startup, active, recovery }、f：攻撃の状態のこま（0 から）。
 * 戻り値：{ seg: 'wind'|'strike'|'rec', k（その区間の見た目の進み 0..1）, amp（構えの深さ）, hold（余韻の重み 0..1） }
 * 区間の境（startup・startup＋active）は data のこまのまま：構え終わり＝startup の前のこま、振り抜き＝startup＋active の前のこま。
 */
export function atkProgress(form, a, f) {
  const P = T(form), s = Math.max(1, a.startup), A = Math.max(1, a.active), r = Math.max(1, a.recovery || 1);
  if (f < a.startup) {
    const u = (f + 1) / s;
    return { seg: 'wind', k: easeOutPow(clamp(u * (P.windFast || 1)), P.windPow), amp: P.windAmp, hold: 0 };
  }
  if (f < a.startup + a.active) return { seg: 'strike', k: swingK((f - a.startup + 1) / A), amp: P.windAmp, hold: 0 };
  const u = clamp((f - a.startup - a.active) / r);
  if (u < P.hold) { const h = u / P.hold; return { seg: 'rec', k: 0, over: ease(h / 0.6) * P.overrun, amp: P.windAmp, hold: 1 }; }
  const v = clamp((u - P.hold) / Math.max(0.05, P.retEnd - P.hold));
  return { seg: 'rec', k: ease(v), over: P.overrun * (1 - ease(v)), amp: P.windAmp, hold: 1 - ease(v / 0.35) };
}

/**
 * クリップ（VRMA）の攻撃の時刻のゆがめ：data のこま f → クリップの combatfit に渡すこま（小数）。区間の境はそのまま（当たりのこまと絵がそろう）。
 * 紫：溜めは早く入ってじわじわ・打ちはそのまま・戻りの初めは止まる（余韻）→ ゆっくり構えへ。
 * 白：溜めはクリップの途中から（予備動作を短く）・戻りは早く終える。
 */
export function atkClipF(form, a, f) {
  const P = T(form), s = a.startup, A = a.active, r = Math.max(1, a.recovery || 1);
  if (f < s) {
    const u = clamp((f + 1) / Math.max(1, s)), k = easeOutPow(clamp(u * (P.windFast || 1)), P.windPow);
    const from = form === 'white' ? 1 - P.windAmp : 0;          // 白：構えの前半を飛ばす（小さく短い予備動作）
    return Math.min(s - 1e-3, s * (from + (1 - from) * k));          // 構えの間は打ちのこま（startup）へ届かない
  }
  if (f < s + A) return f;
  const u = clamp((f - s - A) / r);
  let w;
  if (u < P.hold) w = P.holdDrift * (u / P.hold);
  else w = P.holdDrift + (1 - P.holdDrift) * ease((u - P.hold) / Math.max(0.05, P.retEnd - P.hold));
  return s + A + r * w;
}

/** 被弾（ひるみ）のクリップの進み（0..1 → 0..1）。紫：当たった瞬間に大きくのけぞり、ゆっくり戻る。白：短く受けて早く戻る */
export function hurtClipU(form, u) {
  u = clamp(u);
  if (T(form).hurtWarp === 'light') return clamp(u * 1.6);
  return u < 0.22 ? u / 0.22 * 0.5 : 0.5 + 0.5 * easeOutPow((u - 0.22) / 0.78, 1.6);
}

/** 踏み込み（lunge）の 1 こまの割合。f：0..dur-1（dur＝startup＋active＋2）。全部足すと 1（距離は data のまま） */
export function lungeShare(form, a, f) {
  const P = T(form).lunge, dur = a.startup + a.active + 2;
  if (f < 0 || f >= dur) return 0;
  const sum = a.startup * P.wind + (dur - a.startup) * P.strike;
  return (f < a.startup ? P.wind : P.strike) / sum;
}

/** ヒットストップのこま（紫は重く・白は鋭く）。issen・parry は data のまま */
export function hitstopFor(form, heavy) { const H = T(form).hitstop; return heavy ? H.heavy : H.light; }
/** カメラの寄り：{ deg（画角を狭める度）, t（秒） } */
export function punchFor(form, heavy) { const P = T(form).punch; return { deg: heavy ? P.heavy : P.light, t: P.t }; }

/**
 * 動きの係（シミュレーションの 60Hz で 1 こまずつ）：移動の加減速・息切れ（tired）・よろけの名残（hurtL）・転がりの後の起き上がり（riseL）。
 * 入力の取りこぼしは作らない：押した最初のこまから少しずつ動く（0 のこまは無い）。止まる時だけ少し流れる。
 */
export class Motion {
  constructor() { this.vx = 0; this.vz = 0; this.tired = 0; this.restT = 0; this.hurtL = 0; this.riseL = 0; this.acc = 0; this.prevSp = 0; this.wasHurt = false; this.wasDodge = false; }
  /** 戦いの出来事（Fighter の events）で息が上がる */
  onEvent(ev, form, weapon) {
    const D = T(form).tired; if (!D) return;
    let add = 0;
    if (ev.t === 'attackStart') add = ev.heavy ? D.heavy : (weapon === 'pipe' || weapon === 'matchlock') ? D.pipe : D.atk;
    else if (ev.t === 'dodge') add = D.dodge;
    else if (ev.t === 'hurt' || ev.t === 'guard') add = D.hurt;
    if (add) { this.tired = Math.min(1, this.tired + add); this.restT = 0; }
  }
  /** 足の速さの倍率（紫：息切れで最大 −10%・よろけの後しばらく遅い） */
  speedMul(form) {
    const P = T(form); let m = 1;
    if (P.tired) m *= 1 - P.tired.slow * clamp((this.tired - 0.35) / 0.65);
    if (this.hurtL > 0) m *= 1 - (1 - P.hurtSlow) * this.hurtL;
    return m;
  }
  /** 向きの変わる速さ（1 こまの割合） */
  turnRate(form) { return T(form).move.turn; }
  /**
   * 1 こま進める。o：{ form, state（Fighter の状態の名前）, want:{x,z}（入力から決めた速さ m/s）, smooth（移動の加減速をかける状態か）, run, dt }
   * 戻り値：{ x, z }（このこまの速さ）。smooth でない状態（回避・踏み込み）は want をそのまま使い、速さを覚える（つながり）
   */
  step(o) {
    const P = T(o.form), dt = o.dt || 1 / 60, D = P.tired;
    // よろけ・起き上がりの名残
    const hurt = o.state === 'hurt', dodge = o.state === 'dodge';
    if (this.wasHurt && !hurt) this.hurtL = 1;
    if (this.wasDodge && !dodge && P.rollRise > 0) this.riseL = 1;
    this.wasHurt = hurt; this.wasDodge = dodge;
    if (!hurt) this.hurtL = Math.max(0, this.hurtL - dt / Math.max(0.05, P.hurtLinger));
    if (!dodge) this.riseL = Math.max(0, this.riseL - dt / Math.max(0.05, P.rollRise || 0.05));
    let vx = o.want.x, vz = o.want.z;
    if (o.smooth) {
      // 指数で近づく分と、一定の加速度（upMin・downMin m/s²）の大きい方：走り出しは最初のこまから動き、止まりは最後に止まり切る
      const cur = Math.hypot(this.vx, this.vz), want = Math.hypot(vx, vz), up = want > cur + 1e-3;
      const dx = vx - this.vx, dz = vz - this.vz, L = Math.hypot(dx, dz);
      if (L > 1e-6) {
        const stepV = Math.min(L, Math.max(L * (1 - Math.exp(-(up ? P.move.up : P.move.down) * dt)), (up ? P.move.upMin : P.move.downMin) * dt));
        vx = this.vx + dx / L * stepV; vz = this.vz + dz / L * stepV;
      }
    }
    this.vx = vx; this.vz = vz;
    const sp = Math.hypot(vx, vz);
    this.acc += ((sp - this.prevSp) / dt - this.acc) * Math.min(1, dt * 8); this.prevSp = sp;
    // 息切れ：動いた分だけ上がり、休むと（少し間を置いて）下がる
    if (D) {
      if (o.run && sp > 3.5 && this.tired < D.runCap) this.tired = Math.min(D.runCap, this.tired + D.run * dt);
      this.restT += dt;
      if (this.restT > D.delay && !['attack', 'charge', 'dodge'].includes(o.state)) this.tired = Math.max(0, this.tired - (sp < 0.3 ? D.idle : sp < 3 ? D.walk : 0) * dt);
      if (o.run && sp > 3.5) this.restT = Math.min(this.restT, D.delay);
    } else this.tired = Math.max(0, this.tired - dt);
    return { x: vx, z: vz };
  }
}

/**
 * 体の重ね（クリップ・手続きの姿勢の後に、背骨・胸・首・頭へ足す回転 [x,y,z] ラジアン。x＋＝前へ折れる）。
 * ctx：{ form, st（状態の名前）, f, atk, weapon, time, speed, tired, hurtL, riseL, acc }
 * 紫：肩で息をする（息切れ）・振り抜いた後の重みの沈み・溜めの震え・被弾の後の前屈み・起き上がり・走り出しの前傾。白：ほぼ無し（静かな呼吸だけ）
 */
export function bodyOverlay(ctx) {
  const o = { spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0] };
  const add = (k, x, y = 0, z = 0) => { o[k][0] += x; o[k][1] += y; o[k][2] += z; };
  const white = ctx.form === 'white', st = ctx.st, t = ctx.time || 0, sp = ctx.speed || 0;
  if (white) {
    if (st === 'free' && sp > 3.2) add('spine', 0.05);                     // 白い姿の走り：低く前へ
    return o;
  }
  const tired = clamp(ctx.tired || 0);
  // 息：疲れるほど速く深く（休み 0.3Hz → 1.1Hz）。止まっている時は肩で息をする（胸が上下・前屈み）
  if (tired > 0.05 && ['free', 'reload', 'swap'].includes(st)) {
    const still = sp < 0.3 ? 1 : 0.35, fq = 0.3 + 0.8 * tired, b = Math.sin(t * 2 * Math.PI * fq);
    add('spine', 0.13 * tired * still); add('chest', -0.07 * tired * still * (0.5 + 0.5 * b)); add('neck', 0.03 * tired * still * b); add('head', 0.05 * tired * still - 0.03 * tired * still * b);
  }
  // 振り抜いた後の重み（余韻）：武器の重さで上体が沈む（鉄パイプ・火縄銃・強攻撃ほど深い）
  if (st === 'attack' && ctx.atk) {
    const p = atkProgress('purple', ctx.atk, ctx.f), heavyW = ctx.weapon === 'pipe' || ctx.weapon === 'matchlock' || ctx.heavy ? 1.6 : 1;
    if (p.seg === 'rec') add('spine', 0.07 * heavyW * p.hold);
    if (p.seg === 'wind') add('spine', 0.03 * p.k);                          // 構えに沈む
  }
  // 溜め（強攻撃の長押し）：溜め切ったら細かく震える（力をこめている）
  if (st === 'charge' && (ctx.f || 0) > 12) { const q = Math.sin(t * 2 * Math.PI * 9) * 0.012; add('spine', q); add('chest', -q * 0.5); }
  // 被弾：ひるみの後半から体が前へ折れていき（よろけ）、ひるみが終わった後もしばらく残る（名残）。頭が下がる
  if (st === 'hurt') { const k = ease(((ctx.f || 0) - 4) / 12); add('spine', 0.22 * k); add('chest', 0.06 * k); add('head', 0.12 * k); }
  else if (ctx.hurtL > 0) { const k = ease(ctx.hurtL); add('spine', 0.22 * k); add('chest', 0.06 * k); add('head', 0.12 * k, 0, 0.05 * k * Math.sin(t * 7)); }
  // 転がりの後の起き上がり
  if (ctx.riseL > 0 && st === 'free') { const k = ease(ctx.riseL); add('spine', 0.2 * k); add('head', -0.08 * k); }
  // 走り出しで前へ・止まりで後ろへ（加速度）
  if (st === 'free') { const l = clamp((ctx.acc || 0) * 0.012, -0.07, 0.1); add('spine', l); add('head', -l * 0.5); }
  return o;
}

/** 時間配分の表（秒）：溜め（構えに入る）・打ち（判定）・余韻（止まり）・戻り。報告とテストで使う */
export function tempoTable(form, a) {
  const P = T(form), fps = 60, r = a.recovery || 0;
  // 構えに入り切る（見た目の進み 0.9）までのこま
  let windIn = a.startup; for (let f = 0; f < a.startup; f++) if (atkProgress(form, a, f).k >= 0.9) { windIn = f + 1; break; }
  const hold = Math.round(r * P.hold), back = Math.round(r * (P.retEnd - P.hold)), ready = r - hold - back;
  return { windIn: windIn / fps, windHold: (a.startup - windIn) / fps, strike: a.active / fps, hold: hold / fps, back: back / fps, ready: ready / fps, total: (a.startup + a.active + r) / fps };
}

