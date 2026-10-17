// 人型の骨の名前の対応（VRM の humanoid 名 ← glTF の骨の名前）。本体は共通の charkit/rig/bonemap.js へ移した（二重の実装を残さない）。
// ここは作品側の入口として再輸出するだけ。matchBones(names, map) の挙動は移す前と同じ。
export { JOINT_NAMES, ALIASES, matchBones } from '../../charkit/rig/bonemap.js';
