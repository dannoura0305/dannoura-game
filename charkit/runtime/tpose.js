// 「腕を下ろした休みの姿勢」（コードで組んだ骨・手続きの姿勢 shinshoku/actor/anim*.js の約束）と
// 「T ポーズの休みの姿勢」（VRM 1.0 の normalized の骨・VRMA）の回転の付け替え。
//
// 手続きの骨：腕は休みで下（-y）。VRM の normalized：腕は休みで横（左腕 +x・右腕 -x）。どちらも他の骨は回転なし。
// 骨 b の T の休みの世界の回転を C_b（左腕の鎖＝Rz(+90°)、右腕の鎖＝Rz(-90°)、他は単位）とすると、
// 手続きの局所の回転 P_b と同じ見た目になる T の骨の局所の回転は  Q_b = C_parent(b) · P_b · C_b⁻¹ 。
import * as THREE from 'three';

export const HUMAN17 = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
export const PARENT17 = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', leftUpperArm: 'chest', leftLowerArm: 'leftUpperArm', leftHand: 'leftLowerArm',
  rightUpperArm: 'chest', rightLowerArm: 'rightUpperArm', rightHand: 'rightLowerArm', leftUpperLeg: 'hips', leftLowerLeg: 'leftUpperLeg', leftFoot: 'leftLowerLeg',
  rightUpperLeg: 'hips', rightLowerLeg: 'rightUpperLeg', rightFoot: 'rightLowerLeg' };

const Z = new THREE.Vector3(0, 0, 1);
const QL = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2), QR = new THREE.Quaternion().setFromAxisAngle(Z, -Math.PI / 2), QI = new THREE.Quaternion();
/** 腕の鎖の名前 → 'left'|'right'|null（上腕・前腕・手・指・肩は含まない＝肩は胴の一部） */
export function armSide(name) {
  if (/^left(UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.test(name)) return 'left';
  if (/^right(UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.test(name)) return 'right';
  return null;
}
/** 骨の T の休みの世界の回転 C_b（腕を下ろした休みに対して） */
export function convOf(name) { const s = armSide(name); return s === 'left' ? QL : s === 'right' ? QR : QI; }

const _a = new THREE.Quaternion();
export const tpConv = {
  left: QL, right: QR,
  /** 手続きの局所の回転 q（骨 name）→ T の骨の局所の回転。Wq（骨の名前 → T の世界の回転）を渡すとそちらを使う。out を省くと新しく作る */
  toT(name, q, Wq = null, out = new THREE.Quaternion()) {
    const p = PARENT17[name] ?? null;
    const Cp = Wq ? (p ? Wq[p] : QI) : (p ? convOf(p) : QI), Cb = Wq ? Wq[name] : convOf(name);
    _a.copy(Cb).invert();
    return out.copy(Cp).multiply(q).multiply(_a);
  },
  /** 逆：T の骨の局所の回転 → 手続きの局所の回転 */
  fromT(name, q, out = new THREE.Quaternion()) {
    const p = PARENT17[name] ?? null; const Cp = p ? convOf(p) : QI, Cb = convOf(name);
    _a.copy(Cp).invert();
    return out.copy(_a).multiply(q).multiply(Cb);
  },
};
