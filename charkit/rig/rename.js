// 骨の名前の付け替え（例 VRM の名前 → UE5 のマネキンの名前）。純粋関数・DOM なし。charkit/rig/bonemap.js の表（PROFILES）を使う。
// 方式 C：同じキャラクター（正本は .blend）を Web（VRM・three-vrm）と UE5（FBX・Skeletal Mesh）へ出す時、Blender で骨の名前を UE5 に揃えると
// UE の IK Retargeter でマネキン（Manny/Quinn）の動きを写す時の対応づけ（チェーン）が楽になる。docs/wakaba-charkit/04 §6・tools/blender/vrm_to_fbx.md。
// 注意：名前を揃えても骨の数は同じにならない（UE5 は spine_01〜05・neck_01〜02・metacarpal がある）。足りない骨は作らず、IK Retargeter のチェーンで合わせる。
// 境界侵食（ブラウザ版）はこのファイルを読まない（ゲームの動きは変わらない）。
import { PROFILES, ALL_BONES, matchBones, detectProfile } from './bonemap.js';

/**
 * names（モデルの骨の名前）を to の形の名前へ付け替える表を作る。
 * opt.from：'auto'（既定・detectProfile）|'vrm'|'ue5'|'mixamo'|'rigify'、opt.map：手書きの対応（{ vrm の名前: モデルの骨の名前 }）
 * 戻り値：{ from, to, rename: { 元の名前: 新しい名前 }（変わる物だけ）, kept: [変えない名前（ext_・socket_・対応なし）],
 *           noTarget: [to の形に無い humanoid の骨（例 UE5 の目・あご）], collisions: [同じ新しい名前になる組] }
 */
export function renamePlan(names, { from = 'auto', to = 'ue5', map = {} } = {}) {
  const src = from === 'auto' ? detectProfile(names) : from;
  const table = PROFILES[to];
  if (!table) throw new Error(`形「${to}」は ${Object.keys(PROFILES).join('/')} のどれでもありません`);
  const found = matchBones(names, map, { profile: src, strict: true });
  const rename = {}, noTarget = [], used = new Map(), collisions = [];
  for (const vrm of ALL_BONES) {
    const have = found[vrm];
    if (!have) continue;
    const dst = table[vrm];
    if (!dst) { noTarget.push(vrm); continue; }
    if (used.has(dst)) { collisions.push([used.get(dst), have, dst]); continue; }
    used.set(dst, have);
    if (have !== dst) rename[have] = dst;
  }
  const kept = names.filter(n => !(n in rename));
  // 付け替えの後の名前が、付け替えない骨の名前とぶつからないか
  const finalNames = new Set();
  for (const n of names) {
    const f = rename[n] || n;
    if (finalNames.has(f)) collisions.push([n, f, f]);
    finalNames.add(f);
  }
  return { from: src, to, rename, kept, noTarget, collisions };
}

/** 付け替えを当てた名前の一覧 */
export const applyRename = (names, plan) => names.map(n => plan.rename[n] || n);

/** 形 a → 形 b の全部の対応（Blender のスクリプトに渡す JSON 用）：{ a の名前: b の名前 }・b に無い物は noTarget */
export function profileTable(a = 'vrm', b = 'ue5') {
  const A = PROFILES[a], B = PROFILES[b], bones = {}, noTarget = [];
  for (const vrm of ALL_BONES) { if (!A[vrm]) continue; if (B[vrm]) bones[A[vrm]] = B[vrm]; else noTarget.push(A[vrm]); }
  return { from: a, to: b, bones, noTarget };
}
