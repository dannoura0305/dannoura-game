// 自宅の金庫（WEAPON_SYSTEM_SPEC §5）。
// ★番号は【仮】。開発者の決定（OPEN_QUESTIONS Q9）まで、ここだけを差し替える前提。コードに番号を書かない。
// 金庫は「任意」（刀は居間の刀掛け＝登録証つきの古い持ち物）。中身は拳銃・弾 100 発・小型銃用ホルスター・救急箱。
// 拳銃と弾は「身に覚えのないまま金庫に増えていた物」（WEAPON_SYSTEM_SPEC §2 の推奨案・Q7 は未決定）。
export const SAFE = {
  provisional: true,
  code: '0000',          // 仮の番号（決定ではない）。手掛かりの表示もこの値から作る
  digits: 4,
  contents: [{ id: 'medkit_l', n: 1 }, { id: 'ammo_100', n: 1 }],
  gives: { weapons: ['handgun'], equip: ['holster'] },
  // 手掛かり（どれか 1 つで番号が全部分かる作り）。自宅のカレンダー（第1章から）と、商業施設の警備室の防犯映像（任意）
  clues: [
    { id: 'clue_calendar', place: 'home', text: c => `カレンダーの隅に、娘の字で数字が書いてある。「${c.split('').join(' ')}」` },
    { id: 'clue_cctv', place: 'plaza', text: c => `防犯映像のあり得ない時刻「${c.slice(0, 2)}:${c.slice(2, 4)}」` },
  ],
};
/** 手掛かりから番号を取り出す（テスト用：どの手掛かりも同じ番号を指す） */
export function codeFromClue(clue, code = SAFE.code) { return (clue.text(code).match(/\d/g) || []).join(''); }
