// 骨の対応（標準骨格 wakaba-humanoid/1 ＝ VRM 1.0 の humanoid の名前 ⇔ VRM・UE5・Mixamo・Rigify・境界侵食の 17 本）。
// 純粋関数・DOM・three.js なし（node で試験）。docs/wakaba-charkit/04 §3・06 §3・14 §3.1。
// もとは shinshoku/actor/bones.js（JOINT_NAMES・ALIASES・matchBones）。ここへ移し、bones.js は再輸出だけにした。
// matchBones(names, map) の 2 引数の呼び方は、移す前と戻り値・挙動が全く同じ（17 本だけ・chest が無ければ spine で代用）。

/** 境界侵食の今の 17 本（＝ VRM の必須の骨） */
export const JOINT_NAMES = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
export const VRM_REQUIRED = JOINT_NAMES;

const SIDES = [['left', 'Left', 'l', 'L'], ['right', 'Right', 'r', 'R']];
const FINGER_PARTS = { Thumb: ['Metacarpal', 'Proximal', 'Distal'], Index: ['Proximal', 'Intermediate', 'Distal'], Middle: ['Proximal', 'Intermediate', 'Distal'], Ring: ['Proximal', 'Intermediate', 'Distal'], Little: ['Proximal', 'Intermediate', 'Distal'] };
/** 指 15 本×2（VRM 1.0 の名前） */
export const FINGERS = SIDES.flatMap(([s]) => Object.entries(FINGER_PARTS).flatMap(([f, parts]) => parts.map(p => `${s}${f}${p}`)));
/** 推奨（本基盤では必須にする）：upperChest・肩・つま先・目・あご・指 30 本 */
export const VRM_RECOMMENDED = ['upperChest', 'leftShoulder', 'rightShoulder', 'leftToes', 'rightToes', 'leftEye', 'rightEye', 'jaw', ...FINGERS];
export const ALL_BONES = [...VRM_REQUIRED, ...VRM_RECOMMENDED];

/** よくある骨の名前の候補（小文字・記号を除いて比べる）。2 引数の matchBones が使う（移す前と同じ表） */
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

// ── 既知の骨格の形（docs/wakaba-charkit/04 §3 の表）。UE5・Rigify の名前は各ソフトの画面で未確認（資料の表のとおり）
function sided(fn) { const o = {}; for (const [s, S, l, L] of SIDES) Object.assign(o, fn(s, S, l, L)); return o; }
const FINGER_KEYS = Object.entries(FINGER_PARTS).flatMap(([f, parts]) => parts.map((p, i) => [f, p, i]));
const PROFILE_VRM = Object.fromEntries(ALL_BONES.map(b => [b, b]));
const PROFILE_UE5 = {
  hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', upperChest: 'spine_05', neck: 'neck_01', head: 'head',
  ...sided((s, S, l) => ({
    [`${s}Shoulder`]: `clavicle_${l}`, [`${s}UpperArm`]: `upperarm_${l}`, [`${s}LowerArm`]: `lowerarm_${l}`, [`${s}Hand`]: `hand_${l}`,
    [`${s}UpperLeg`]: `thigh_${l}`, [`${s}LowerLeg`]: `calf_${l}`, [`${s}Foot`]: `foot_${l}`, [`${s}Toes`]: `ball_${l}`,
    ...Object.fromEntries(FINGER_KEYS.map(([f, p, i]) => [`${s}${f}${p}`, `${{ Thumb: 'thumb', Index: 'index', Middle: 'middle', Ring: 'ring', Little: 'pinky' }[f]}_0${i + 1}_${l}`])),
  })),
};
const PROFILE_MIXAMO = {
  hips: 'mixamorig:Hips', spine: 'mixamorig:Spine', chest: 'mixamorig:Spine1', upperChest: 'mixamorig:Spine2', neck: 'mixamorig:Neck', head: 'mixamorig:Head',
  ...sided((s, S) => ({
    [`${s}Eye`]: `mixamorig:${S}Eye`,   // 目の骨は Mixamo の一部のキャラクターだけにある
    [`${s}Shoulder`]: `mixamorig:${S}Shoulder`, [`${s}UpperArm`]: `mixamorig:${S}Arm`, [`${s}LowerArm`]: `mixamorig:${S}ForeArm`, [`${s}Hand`]: `mixamorig:${S}Hand`,
    [`${s}UpperLeg`]: `mixamorig:${S}UpLeg`, [`${s}LowerLeg`]: `mixamorig:${S}Leg`, [`${s}Foot`]: `mixamorig:${S}Foot`, [`${s}Toes`]: `mixamorig:${S}ToeBase`,
    ...Object.fromEntries(FINGER_KEYS.map(([f, p, i]) => [`${s}${f}${p}`, `mixamorig:${S}Hand${{ Thumb: 'Thumb', Index: 'Index', Middle: 'Middle', Ring: 'Ring', Little: 'Pinky' }[f]}${i + 1}`])),
  })),
};
const PROFILE_RIGIFY = {
  hips: 'DEF-spine', spine: 'DEF-spine.001', chest: 'DEF-spine.002', upperChest: 'DEF-spine.003', neck: 'DEF-spine.004', head: 'DEF-spine.006', jaw: 'DEF-jaw',
  ...sided((s, S, l, L) => ({
    [`${s}Shoulder`]: `DEF-shoulder.${L}`, [`${s}UpperArm`]: `DEF-upper_arm.${L}`, [`${s}LowerArm`]: `DEF-forearm.${L}`, [`${s}Hand`]: `DEF-hand.${L}`,
    [`${s}UpperLeg`]: `DEF-thigh.${L}`, [`${s}LowerLeg`]: `DEF-shin.${L}`, [`${s}Foot`]: `DEF-foot.${L}`, [`${s}Toes`]: `DEF-toe.${L}`,
    ...Object.fromEntries(FINGER_KEYS.map(([f, p, i]) => [`${s}${f}${p}`, f === 'Thumb' ? `DEF-thumb.0${i + 1}.${L}` : `DEF-f_${{ Index: 'index', Middle: 'middle', Ring: 'ring', Little: 'pinky' }[f]}.0${i + 1}.${L}`])),
  })),
};
const PROFILE_SHINSHOKU17 = Object.fromEntries(JOINT_NAMES.map(b => [b, b]));
/** 形ごとの対応：{ vrm 名: その形での骨の名前 } */
export const PROFILES = { vrm: PROFILE_VRM, ue5: PROFILE_UE5, mixamo: PROFILE_MIXAMO, rigify: PROFILE_RIGIFY, shinshoku17: PROFILE_SHINSHOKU17 };

// Mixamo は書き出しによって頭が mixamorig1: ・mixamorig_ などに変わるので、頭を外して比べる
const normProfile = (profile, s) => profile === 'mixamo' ? norm(s).replace(/^mixamorig\d*/, '') : norm(s);

/** 骨の名前の一覧から形を当てる：'vrm'|'ue5'|'mixamo'|'rigify'|'unknown'（必須の 17 本のうち 12 本以上が合う物） */
export function detectProfile(names) {
  let best = 'unknown', bestN = 11;
  for (const p of ['vrm', 'ue5', 'mixamo', 'rigify']) {
    const set = new Set(names.map(n => normProfile(p, n)));
    const n = JOINT_NAMES.filter(j => set.has(normProfile(p, PROFILES[p][j]))).length;
    if (n > bestN) { best = p; bestN = n; }
  }
  return best;
}

/**
 * 骨の対応を探す。names：モデルの骨の名前、map：手書きの対応表（manifest の bones）。
 * opt を渡さない時は移す前と同じ（17 本・ALIASES）。opt.extended（または opt.profile）の時は推奨の骨（指・目・あご・肩・つま先）も探す：
 *   手書きの対応 → 形（opt.profile、無ければ detectProfile）の表 → 17 本は ALIASES の順。
 *   形の表では chest＝Mixamo の Spine1・upperChest＝Spine2（17 本だけの時の chest＝Spine2 とは違う：上胸の骨を別に持つため）。
 */
export function matchBones(names, map = {}, opt = undefined) {
  const out = {}, byNorm = new Map(names.map(n => [norm(n), n]));
  if (!opt) {
    for (const j of JOINT_NAMES) {
      if (map[j] && names.includes(map[j])) { out[j] = map[j]; continue; }
      for (const a of ALIASES[j]) { const hit = byNorm.get(norm(a)); if (hit) { out[j] = hit; break; } }
    }
    if (!out.chest && out.spine) out.chest = out.spine;
    return out;
  }
  const profile = opt.profile && opt.profile !== 'auto' ? opt.profile : detectProfile(names);
  const table = PROFILES[profile] || {};
  const byProf = new Map(names.map(n => [normProfile(profile, n), n]));
  for (const j of ALL_BONES) {
    if (map[j] && names.includes(map[j])) { out[j] = map[j]; continue; }
    if (table[j]) { const hit = names.includes(table[j]) ? table[j] : byProf.get(normProfile(profile, table[j])); if (hit) { out[j] = hit; continue; } }
    if (ALIASES[j]) for (const a of ALIASES[j]) { const hit = byNorm.get(norm(a)); if (hit && !Object.values(out).includes(hit)) { out[j] = hit; break; } }
  }
  if (!out.chest && out.spine && !opt.strict) out.chest = out.spine;
  return out;
}

/** 追加の骨（ext_）の組。docs/wakaba-charkit/06 §3 */
export const EXT_GROUPS = ['hair', 'cloth', 'acc', 'tail', 'ear', 'weapon'];
const EXT_RE = /^ext_([a-z]+)(?:_([a-z][a-zA-Z0-9]*))?(?:_([LRFBC]))?(?:_(\d{2}))?$/;
const SOCKET_RE = /^socket_([a-z]+)(?:_([LR]))?$/;
/**
 * ext_（と socket_）の名前を分解する。ext_<組>_<部位>[_<L|R|F|B|C>]_<番号2桁>（部位・番号は片方だけでもよい：ext_tail_01・ext_acc_hat）。
 * 戻り値：[{ name, group, part, side, index }]、規則違反は { name, error }。ext_・socket_ で始まらない名前は無視
 */
export function extBones(names) {
  const out = [];
  for (const name of names) {
    if (name.startsWith('socket_')) {
      const m = SOCKET_RE.exec(name);
      out.push(m ? { name, group: 'socket', part: m[1], side: m[2] || null, index: null } : { name, error: 'socket_<場所>[_L|_R] の形ではありません' });
      continue;
    }
    if (!name.startsWith('ext_')) continue;
    const m = EXT_RE.exec(name);
    if (!m) { out.push({ name, error: 'ext_<組>_<部位>[_L|R|F|B|C]_<番号2桁> の形ではありません' }); continue; }
    const [, group, part, side, idx] = m;
    if (!EXT_GROUPS.includes(group)) { out.push({ name, error: `組「${group}」は ${EXT_GROUPS.join('/')} のどれでもありません` }); continue; }
    if (!part && !idx) { out.push({ name, error: '部位か番号のどちらかが要ります' }); continue; }
    out.push({ name, group, part: part || null, side: side || null, index: idx ? Number(idx) : null });
  }
  return out;
}

/** 見つかった対応（matchBones の extended の結果）から、足りない骨を数える */
export function checkSkeleton(found) {
  const has = j => !!found[j];
  return {
    missingRequired: VRM_REQUIRED.filter(j => !has(j)),
    missingRecommended: VRM_RECOMMENDED.filter(j => !has(j)),
    fingers: FINGERS.filter(has).length,
  };
}

/** VRM の humanoid の骨の名前か */
export const isHumanBone = n => ALL_BONES.includes(n);
