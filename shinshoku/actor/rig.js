// 人型の簡易リグ（関節＝Object3D の入れ子）と姿勢の補間。
// 関節の名前は VRM の humanoid の骨（hips/spine/chest/neck/head/leftUpperArm…）に対応させ、
// VRM のモデルに差し替えても同じ姿勢のコードで動かせるようにする（actor/vrm.js）。
// 向き：キャラクターは +z を向く。左＝+x。腕・脚は下（-y）に垂れた状態が 0。
//   前へ振る＝ x 回転がマイナス。左腕を外へ＝ z 回転がプラス（右腕はマイナス）。
import * as THREE from 'three';
import { convOf, armSide, PARENT17 } from '../../charkit/runtime/tpose.js';

export const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head',
  'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];

/** 寸法 d から関節の木を作る */
export function makeRig(d) {
  const J = {};
  const g = (name, parent, x, y, z) => { const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); (parent || root).add(o); J[name] = o; return o; };
  const root = new THREE.Group(); root.name = 'rig';
  g('hips', root, 0, d.leg, 0);
  g('spine', J.hips, 0, d.spine, 0);
  g('chest', J.spine, 0, d.chest, 0);
  g('neck', J.chest, 0, d.neck, 0);
  g('head', J.neck, 0, d.headJ, 0);
  for (const [s, sx] of [['left', 1], ['right', -1]]) {
    g(s + 'UpperArm', J.chest, sx * d.shoulderX, d.shoulderY, 0);
    g(s + 'LowerArm', J[s + 'UpperArm'], 0, -d.upperArm, 0);
    g(s + 'Hand', J[s + 'LowerArm'], 0, -d.lowerArm, 0);
    g(s + 'UpperLeg', J.hips, sx * d.hipX, -0.02, 0);
    g(s + 'LowerLeg', J[s + 'UpperLeg'], 0, -d.thigh, 0);
    g(s + 'Foot', J[s + 'LowerLeg'], 0, -d.shin, 0);
  }
  return { root, J };
}

const LEGS = new Set(['hips', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']);
const SPINE = new Set(['spine', 'chest', 'neck', 'head']);
/** 姿勢（関節名 → [x,y,z] ラジアン）を目標にして、毎フレーム補間で近づける */
export class Poser {
  /** opt.tpose：骨が T ポーズの休み（VRM の normalized）の時、腕を下ろした休みの姿勢の値を T の骨の回転へ付け替える（charkit/runtime/tpose.js）。
   *  opt.hipScale：腰の位置のずれ（m）に掛ける倍率（モデルを縮めた時：1 / 縮尺） */
  constructor(J, rest = {}, opt = {}) {
    this.J = J; this.rest = rest; this.q = {}; this.tmpE = new THREE.Euler(); this.tmpQ = new THREE.Quaternion();
    this.tp = !!opt.tpose; this.hipScale = opt.hipScale ?? 1; this.tmpC = new THREE.Quaternion();
    this.flip = !!opt.vrm0;   // VRM 0.x の normalized は向きが 180° 違う（three-vrm-animation と同じく x・z を反転）
    this.hipsBase = J.hips ? J.hips.position.y : 0;
    this.hipsBaseX = J.hips ? J.hips.position.x : 0; this.hipsBaseZ = J.hips ? J.hips.position.z : 0;
    for (const k of Object.keys(J)) this.q[k] = J[k].quaternion.clone();
  }
  /**
   * pose._exactLegs：脚（股関節〜足首・腰の高さ）は rate ではなく pose._legRate（既定 1＝そのまま）で当てる（足の IK：補間の遅れで足が滑らない）。
   * pose._bodyRate：背骨・首・頭の補間（P13：歩きの骨盤と肩の逆回りがずれないように速く当てる）。pose.hipsT：腰の左右・前後のずれ [x,0,z]（m）
   */
  apply(pose, rate) {
    const J = this.J;
    const legRate = pose._exactLegs ? Math.max(rate, pose._legRate ?? 1) : rate;
    const bodyRate = pose._bodyRate != null ? Math.max(rate, pose._bodyRate) : rate;
    for (const k of Object.keys(J)) {
      const r = pose[k] || [0, 0, 0], b = this.rest[k] || [0, 0, 0];
      this.tmpE.set(r[0] + b[0], r[1] + b[1], r[2] + b[2], 'YXZ');
      this.tmpQ.setFromEuler(this.tmpE);
      if (this.tp && (armSide(k) || armSide(PARENT17[k] || ''))) { this.tmpC.copy(convOf(k)).invert(); this.tmpQ.premultiply(convOf(PARENT17[k] || '')).multiply(this.tmpC); }
      if (this.flip) { this.tmpQ.x = -this.tmpQ.x; this.tmpQ.z = -this.tmpQ.z; }
      J[k].quaternion.slerp(this.tmpQ, Math.min(1, LEGS.has(k) ? legRate : SPINE.has(k) ? bodyRate : rate));
    }
    if (J.hips) {
      const lr = Math.min(1, legRate), t = pose.hipsT;
      const hs = this.hipScale, fs = this.flip ? -hs : hs;
      J.hips.position.y += ((this.hipsBase + (pose.hipsY || 0) * hs) - J.hips.position.y) * lr;
      J.hips.position.x += ((this.hipsBaseX + (t ? t[0] : 0) * fs) - J.hips.position.x) * lr;
      J.hips.position.z += ((this.hipsBaseZ + (t ? t[2] : 0) * fs) - J.hips.position.z) * lr;
    }
  }
}
