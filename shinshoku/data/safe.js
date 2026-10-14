// 自宅の金庫（WEAPON_SYSTEM_SPEC §5）。
// ★番号は【仮】。開発者の決定（OPEN_QUESTIONS Q9）まで、ここだけを差し替える前提。コードに番号を書かない。
// フェーズ2の切片では金庫は「任意」。中身は回復品と弾（拳銃・刀は最初から持っている扱い）。
export const SAFE = {
  provisional: true,
  code: '0000',          // 仮の番号（決定ではない）。手掛かりの表示もこの値から作る
  digits: 4,
  contents: [{ id: 'medkit_l', n: 1 }, { id: 'ammo_box', n: 2 }],
  // 手掛かり（どれか 1 つで番号が全部分かる作り）。切片では自宅の中の 1 つだけ置く
  clues: [
    { id: 'clue_calendar', place: 'home', text: c => `カレンダーの隅に、娘の字で数字が書いてある。「${c.split('').join(' ')}」` },
  ],
};
/** 手掛かりから番号を取り出す（テスト用：どの手掛かりも同じ番号を指す） */
export function codeFromClue(clue, code = SAFE.code) { return (clue.text(code).match(/\d/g) || []).join(''); }
