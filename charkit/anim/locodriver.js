// charkit の歩きの係（P13）：1 体ごとの状態（見た目の速さ・動き出し／止まりのつなぎ・傾き・視線の先回り）を持ち、
// loco.js の locoPose／idlePose／bridgePose を選んで姿勢を返す。純粋な JS（three なし）。
//  ・見た目の速さ visV：本当の速さへ速く（0.1 秒）近づける。位相の進み（1m あたり）も visV の歩幅で計る（足が滑らない・
//    動き出しは小さく速い歩みから歩幅が伸びる＝加速が見える）
//  ・止まる：その時の足の位置から待機の足の位置へ「止まりの一歩」（動く量の大きい足を持ち上げて運ぶ）0.32 秒。体は前へ少し行き過ぎて戻る
//  ・動き出す：待機の足から歩きの足へ 0.2 秒でつなぐ（位相は「左が立脚の真ん中」から始める：Player が startPhase を使う）
//  ・前後の傾き：加速と減速でばね（行き過ぎて戻る）。曲がる：体を内へ傾ける（Player が根で回す）
import { locoPose, idlePose, bridgePose, phaseRate, personality, gaitAt, sm } from './loco.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class LocoDriver {
  /** o：{ dims（legDims）, scale, pers（性格の id）} */
  constructor(o = {}) {
    this.dims = o.dims; this.scale = o.scale || 1; this.persId = o.pers || ''; this.pers = personality(this.persId);
    this.visV = 0; this.mode = 'idle'; this.bridge = null; this.last = null; this.lean = { x: 0, v: 0 }; this.prevV = 0; this.idleT = Math.random() * 10;
  }
  /** 1m あたりの位相（今の見た目の速さの歩幅：姿勢と同じ値。v を渡すとその速さ） */
  rate(v) { return phaseRate(Math.max(0.12, v ?? this.vPose ?? 0.12), this.scale, this.pers); }
  /** 動き出しの位相：左が立脚の真ん中（右は遊脚の真ん中＝待機の足に近い） */
  startPhase(v) { const g = gaitAt(Math.max(0.3, v), this.pers); return Math.PI / 2 + 2 * Math.PI * g.stance * 0.42; }
  /**
   * dt：秒、s：{ speed（本当の速さ m/s）, phase（位相）, time, turn（その場の向き替え {ph, turn}）|null, k（待機の動きの大きさ）}
   * 戻り値：姿勢（_exactLegs・_bodyRate・hipsT つき）。this.leanX：前後の傾きのばね（ラジアン：背骨に足す）
   */
  update(dt, s) {
    dt = Math.min(Math.max(dt, 0), 0.1);
    const sp = Math.max(0, s.speed || 0);
    const up = sp > this.visV;
    this.visV += (sp - this.visV) * (1 - Math.exp(-dt / (up ? 0.09 : 0.12)));
    if (sp < 0.05 && this.visV < 0.05) this.visV = 0;
    // 前後の傾き：加速度でばねを押す（動き出しは前へ、止まると前へ行き過ぎてから戻る）
    const acc = (this.visV - this.prevV) / Math.max(dt, 1 / 240); this.prevV = this.visV;
    const L = this.lean, f = clamp(Math.abs(acc), 0, 30) * (acc > 0 ? 0.011 : 0.016);
    const w = 11, z = 0.42;
    L.v += (-(w * w) * L.x - 2 * z * w * L.v + f * w * w * 0.3) * dt; L.x += L.v * dt;
    L.x = clamp(L.x, -0.12, 0.2);
    // 状態：歩く／待機（つなぎ）
    const moving = sp > 0.08;
    const lean = L.x;
    let pose;
    this.vPose = Math.max(0.12, this.visV, 0.6 * sp);
    if (moving) {
      const v = this.vPose;
      pose = locoPose(s.phase, v, { dims: this.dims, scale: this.scale, pers: this.pers, persKey: this.persId, rate: this.rate(v), lean: lean * 0.8 });
      if (this.mode !== 'loco') { this.bridge = { from: this.last, t: 0, dur: 0.3, start: true }; this.mode = 'loco'; }
    } else {
      this.idleT += dt;
      pose = idlePose(this.idleT, { dims: this.dims, scale: this.scale, pers: this.pers, k: s.k ?? 1, turn: s.turn ? { ph: s.turn.ph, k: clamp(Math.abs(s.turn.turn) / 3, 0, 1) } : null });
      const sp0 = pose.spine; pose.spine = [sp0[0] + lean * 0.9, sp0[1], sp0[2]]; pose.chest = [pose.chest[0] + lean * 0.4, pose.chest[1], pose.chest[2]];
      if (this.mode !== 'idle') { this.bridge = { from: this.last, t: 0, dur: 0.42 }; this.mode = 'idle'; }
    }
    if (this.bridge && this.bridge.from) {
      const B = this.bridge; B.t += dt;
      const k = clamp(B.t / B.dur, 0, 1);
      if (k < 1) { pose = Object.assign(bridgePose(B.from, pose, B.start ? k : sm(0, 1, k), this.dims, B.start ? 0.8 : 0.55, B.first), { _exactLegs: true }); B.first = pose._bridgeFirst; }
      else this.bridge = null;
    } else this.bridge = null;
    pose._bodyRate = 0.85;
    this.last = pose;
    return pose;
  }
}
