// 判定の窓（COMBAT_SYSTEM_SPEC §3・§7・§8）。DOM なし・純粋関数。
// すべてフレーム（60Hz）で考える。判定は「入力の時刻」と「攻撃判定が出た時刻」の差で行う。
import { COMBAT } from '../data/combat.js';

/** 難しさ・タッチ・手助けを反映した窓の一覧 */
export function windows(diff = 'normal', opt = {}, C = COMBAT) {
  const d = C.difficulty[diff] || C.difficulty.normal;
  const t = opt.touch ? C.touchBonus : 0;
  const a = opt.assist ? C.assist.windowBonus : 0;
  return {
    just: d.just + t + a,
    parryBefore: d.parryBefore + t + a,
    parryAfter: d.parryAfter + (opt.touch ? 1 : 0),
    mikiri: C.issen.mikiri.window + t + a,
    hajiki: C.issen.hajiki.window + t + a,
    utsu: C.issen.utsu.window + t + a,
    iaiHold: C.issen.iai.hold,
    iStart: C.dodge.iStart, iEnd: C.dodge.iEnd,
    dmgMul: d.dmgMul, dropMul: d.dropMul,
    slowFrames: C.justSlow.frames + (opt.assist ? C.assist.slowBonus : 0),
  };
}

/**
 * 回避中に攻撃判定が重なったときの結果。dodgeFrame＝回避開始からのフレーム（0 始まり）。
 * 'just'（ジャスト回避）／'iframe'（無敵で避けた）／'hit'（当たる）
 */
export function judgeDodge(dodgeFrame, w = windows()) {
  if (dodgeFrame < 0) return 'hit';
  if (dodgeFrame <= w.just) return 'just';
  if (dodgeFrame >= w.iStart && dodgeFrame <= w.iEnd) return 'iframe';
  return 'hit';
}

/**
 * パリィの判定。delta = 攻撃判定の発生フレーム − 「弾く」入力のフレーム。
 * 入力が発生の parryBefore f 前〜parryAfter f 後なら成功。
 * 'parry'／'early'（早すぎ：構えの硬直）／'late'（遅すぎ：当たる）
 */
export function judgeParry(delta, w = windows()) {
  if (delta >= -w.parryAfter && delta <= w.parryBefore) return 'parry';
  if (delta > w.parryBefore) return 'early';
  return 'late';
}

/** 一閃の窓が開いているか。since＝成功からのフレーム */
export function issenOpen(kind, since, w = windows()) {
  const win = w[kind];
  return typeof win === 'number' && since >= 0 && since <= win;
}

/** 抜刀一閃の構えに入れるか（長押しのフレーム数） */
export function iaiReady(holdFrames, w = windows()) { return holdFrames >= w.iaiHold; }
