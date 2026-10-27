// tobinezumi/client/goal.js — Ver.0.9：はじめの「めあて」（さいしょの数分だけ、次にすることを 1 行で出す）
// DOM なし（tests/tobinezumi-v09.test.mjs）。進み具合は設定（localStorage の tobi_settings.goal）に置く＝セーブの版は変えない。
// 順番：拾う（3 つ）→ 巣穴を掘る → 巣に入る → 種子を食べる → 巣を広げる（ビルド）→ おしまい。
// すでに巣のある子で はじめた（つづきから・前の版から）なら、最初から「おしまい」（出さない）。
export const GOAL_PICKS = 3;

/** 新しい進み具合。key＝どの子のものか（アカウント＋名前）、hasNest＝はじめた時点で巣があるか */
export function newGoal(key, hasNest) {
  return { key, picks: 0, entered: false, ate: false, built: false, done: !!hasNest, off: false };
}

/**
 * いまの めあて。st = 進み具合、hasNest = 巣があるか、touch = タッチ用の言葉。
 * 返り値 {id, text, n?, of?} か null（出さない）
 */
export function goalStep(st, { hasNest = false, touch = false } = {}) {
  if (!st || st.off || st.done) return null;
  const E = touch ? '「調べる」' : '<kbd>E</kbd>', Q = touch ? '「食べる」' : '<kbd>Q</kbd>', B = touch ? '「ビルド」' : '<kbd>B</kbd>';
  if (!hasNest && st.picks < GOAL_PICKS) return { id: 'gather', text: `地面の 種子・草・小石を 拾ってみよう（${touch ? 'タップ' : E}）`, n: st.picks, of: GOAL_PICKS };
  if (!hasNest) return { id: 'dig', text: `ひらけた土の上で ${E} → 自分の巣穴を掘ろう` };
  if (!st.entered) return { id: 'enter', text: `巣穴の入口で ${E} → 巣の中へ` };
  if (!st.ate) return { id: 'eat', text: `おなかが すいたら ${Q} で 種子を食べよう` };
  if (!st.built) return { id: 'build', text: `巣の中で ${B} → 通路や部屋を 掘り広げよう` };
  return { id: 'done', text: 'ぜんぶ できた！ あとは 思うままに 暮らそう' };
}

/** 出来事を進み具合へ（変わったら true）。ev = 'pick' | 'enter' | 'eat' | 'build' */
export function goalEvent(st, ev) {
  if (!st || st.done) return false;
  if (ev === 'pick') { st.picks = (st.picks || 0) + 1; return true; }
  if (ev === 'enter' && !st.entered) { st.entered = true; return true; }
  if (ev === 'eat' && !st.ate) { st.ate = true; return true; }
  if (ev === 'build' && !st.built) { st.built = true; return true; }
  return false;
}
