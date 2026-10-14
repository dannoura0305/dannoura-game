// 人型の骨の名前の対応（VRM の humanoid 名 ← glTF の骨の名前）。DOM・three.js なし（node でテスト）。
export const JOINT_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
/** よくある骨の名前の候補（小文字・記号を除いて比べる） */
export const ALIASES = {
  hips: ['hips', 'pelvis', 'mixamorighips', 'hip', 'root_hips', 'jbipchips', 'cc_base_hip'],
  spine: ['spine', 'mixamorigspine', 'spine1', 'spine01', 'spine001', 'jbipcspine'],
  chest: ['chest', 'upperchest', 'mixamorigspine2', 'mixamorigspine1', 'spine2', 'spine03', 'spine02', 'spine003', 'spine002', 'jbipcchest'],
  neck: ['neck', 'mixamorigneck', 'neck01', 'spine004', 'jbipcneck'],
  head: ['head', 'mixamorighead', 'spine006', 'jbipchead'],
  leftUpperArm: ['leftupperarm', 'mixamorigleftarm', 'upperarml', 'upperarmleft', 'larm', 'leftarm', 'jbiplupperarm', 'upper_arml'],
  leftLowerArm: ['leftlowerarm', 'mixamorigleftforearm', 'forearml', 'lowerarml', 'leftforearm', 'jbipllowerarm'],
  leftHand: ['lefthand', 'mixamoriglefthand', 'handl', 'jbiplhand'],
  rightUpperArm: ['rightupperarm', 'mixamorigrightarm', 'upperarmr', 'upperarmright', 'rarm', 'rightarm', 'jbipr upperarm', 'jbiprupperarm', 'upper_armr'],
  rightLowerArm: ['rightlowerarm', 'mixamorigrightforearm', 'forearmr', 'lowerarmr', 'rightforearm', 'jbiprlowerarm'],
  rightHand: ['righthand', 'mixamorigrighthand', 'handr', 'jbiprhand'],
  leftUpperLeg: ['leftupperleg', 'mixamorigleftupleg', 'thighl', 'upperlegl', 'leftupleg', 'leftthigh', 'jbiplupperleg'],
  leftLowerLeg: ['leftlowerleg', 'mixamorigleftleg', 'shinl', 'calfl', 'lowerlegl', 'leftleg', 'leftcalf', 'jbipllowerleg'],
  leftFoot: ['leftfoot', 'mixamorigleftfoot', 'footl', 'jbiplfoot'],
  rightUpperLeg: ['rightupperleg', 'mixamorigrightupleg', 'thighr', 'upperlegr', 'rightupleg', 'rightthigh', 'jbiprupperleg'],
  rightLowerLeg: ['rightlowerleg', 'mixamorigrightleg', 'shinr', 'calfr', 'lowerlegr', 'rightleg', 'rightcalf', 'jbiprlowerleg'],
  rightFoot: ['rightfoot', 'mixamorigrightfoot', 'footr', 'jbiprfoot'],
};
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
/** glTF の骨の対応を探す（テスト用に純粋関数）。names：骨の名前の一覧、map：manifest の対応表 */
export function matchBones(names, map = {}) {
  const out = {}, byNorm = new Map(names.map(n => [norm(n), n]));
  for (const j of JOINT_NAMES) {
    if (map[j] && names.includes(map[j])) { out[j] = map[j]; continue; }
    for (const a of ALIASES[j]) { const hit = byNorm.get(norm(a)); if (hit) { out[j] = hit; break; } }
  }
  if (!out.chest && out.spine) out.chest = out.spine;
  return out;
}

