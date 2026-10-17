// 人型の簡易リグ（関節＝Object3D の入れ子）と姿勢の補間。
// 関節の名前は VRM の humanoid の骨（hips/spine/chest/neck/head/leftUpperArm…）に対応させ、
// VRM のモデルに差し替えても同じ姿勢のコードで動かせるようにする（actor/vrm.js）。
// 向き：キャラクターは +z を向く。左＝+x。腕・脚は下（-y）に垂れた状態が 0。
//   前へ振る＝ x 回転がマイナス。左腕を外へ＝ z 回転がプラス（右腕はマイナス）。
import * as THREE from 'three';

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
/** 姿勢（関節名 → [x,y,z] ラジアン）を目標にして、毎フレーム補間で近づける */
export class Poser {
  constructor(J, rest = {}) {
    this.J = J; this.rest = rest; this.q = {}; this.tmpE = new THREE.Euler(); this.tmpQ = new THREE.Quaternion();
    this.hipsBase = J.hips ? J.hips.position.y : 0;
    for (const k of Object.keys(J)) this.q[k] = J[k].quaternion.clone();
  }
  /** pose._exactLegs：脚（股関節〜足首・腰の高さ）は rate ではなく pose._legRate（既定 1＝そのまま）で当てる（足の IK：補間の遅れで足が滑らない） */
  apply(pose, rate) {
    const J = this.J;
    const legRate = pose._exactLegs ? Math.max(rate, pose._legRate ?? 1) : rate;
    for (const k of Object.keys(J)) {
      const r = pose[k] || [0, 0, 0], b = this.rest[k] || [0, 0, 0];
      this.tmpE.set(r[0] + b[0], r[1] + b[1], r[2] + b[2], 'YXZ');
      this.tmpQ.setFromEuler(this.tmpE);
      J[k].quaternion.slerp(this.tmpQ, Math.min(1, LEGS.has(k) ? legRate : rate));
    }
    if (J.hips) J.hips.position.y += ((this.hipsBase + (pose.hipsY || 0)) - J.hips.position.y) * Math.min(1, legRate);
  }
}
