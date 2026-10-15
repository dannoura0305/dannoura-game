// 第5章（旧研究棟・観測棟）と第6章A の冒頭（暴走 → 我に返る → 守る）の演出場面（CUTSCENE_SPEC の形）。台詞はすべて【仮】。
// 原文の決め台詞（第3章のだんのうら・第4章の相棒の 2 回だけ）は、ここには書かない（相棒は名前を呼ぶ）。
// 結末A の原文（「でも、あの後……」）も、結末A を作るまで書かない。
// だんのうらは男性の化け猫（自分で知っている）。白い姿・巨大猫又は本来の姿。暴走は「巨大な姿の力があふれて体が言うことを聞かない」状態で、
// 性格や人格が変わるのではない（本人は抑えようとしている・台詞はいつもの口調のまま）。娘は千代さんに預けてあり、危ない所には出てこない（記憶だけ）。
// 研究者（放送の声）は九条とは別人で名前を出さない。配偶者の名前も出さない（記録は塗りつぶし）。
const P = Math.PI;
export const CUTSCENES5 = {
  // ── 第5章A（reveal）：搬入ヤードの崩れた壁から旧研究棟へ ──
  cs05_r_arrive: {
    id: 'cs05_r_arrive', area: 'oldwing', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-13.6, 1.4, 11.8], look: [-6, 1.6, 7.2], fov: 50 },
      { t: 5.6, pos: [-12.8, 1.6, 11.2], look: [-2, 1.6, 4.0], fov: 46 },
      { t: 6.0, pos: [-8.4, 1.62, 8.0], look: [-9.6, 1.5, 9.2], fov: 38, cut: true },
      { t: 12.6, pos: [-8.3, 1.62, 7.9], look: [-9.6, 1.5, 9.2], fov: 36 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [-13.2, 9.0], yaw: P / 2 }, { t: 0, id: 'companion', pos: [-13.6, 10.2], yaw: P / 2, mode: 'scripted', show: true },
      { t: 0.6, id: 'player', to: [-9.8, 9.0] }, { t: 1.0, id: 'companion', to: [-10.6, 10.0] },
    ],
    lines: [
      { t: 0.8, who: 'sys', text: '（崩れた壁の向こうに、古い棟の廊下。番号の札のかかった小さな部屋が並んでいる）', dur: 3.6 },
      { t: 6.2, who: 'companion', text: '……ここ、病室みたい。誰か、住んでたんですか', dur: 2.6, expr: 'sad' },
      { t: 9.0, who: 'dan', text: '収容棟、ね。札に被験者の番号。……見ていて気持ちのいいものじゃないわ', dur: 3.2, expr: 'serious', cond: 'white' },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 0.1, do: 'chapterCard', arg: 'ch5a' }, { t: 12.8, do: 'companionFollow' }, { t: 12.8, do: 'setStep', arg: 'ch5_r_ward' }],
    sounds: [{ t: 0.4, s: 'rumble' }, { t: 4.0, s: 'pa_chime' }],
  },
  // ── 第5章B（secret）：地下研究区画の連絡通路から、停電した旧研究棟へ（相棒の後ろで、白がにじみかけて戻る＝見るのはプレイヤーだけ） ──
  cs05_s_arrive: {
    id: 'cs05_s_arrive', area: 'oldwing', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [8.4, 1.5, 11.6], look: [13.0, 1.4, 9.6], fov: 48 },
      { t: 5.0, pos: [8.8, 1.5, 11.2], look: [11.0, 1.4, 9.6], fov: 44 },
      { t: 5.4, pos: [9.7, 1.6, 8.7], look: [11.0, 1.5, 9.5], fov: 32, cut: true },
      { t: 10.4, pos: [9.75, 1.58, 8.75], look: [11.0, 1.5, 9.5], fov: 30 },
      { t: 10.6, pos: [6.0, 1.8, 11.8], look: [10.6, 1.4, 9.2], fov: 46, cut: true },
      { t: 15.0, pos: [6.2, 1.8, 11.6], look: [10.6, 1.4, 9.2], fov: 44 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [13.2, 9.6], yaw: -P / 2 }, { t: 0, id: 'companion', pos: [13.6, 10.6], yaw: -P / 2, mode: 'scripted', show: true },
      { t: 0.5, id: 'player', to: [10.8, 9.5] }, { t: 0.9, id: 'companion', to: [11.8, 10.6] },
    ],
    lines: [
      { t: 0.6, who: 'sys', text: '（応答炉が止まって、旧研究棟は真っ暗だ。非常灯の赤だけが、廊下を細く照らしている）', dur: 3.8 },
      { t: 5.6, who: 'sys', text: '（暗がりに目が慣れる前に、髪の根もとが白くにじみかけて——戻る）', dur: 3.0 },
      { t: 8.4, who: 'dan', text: '……まだよ。この姿のまま', dur: 1.8, expr: 'serious' },
      { t: 10.8, who: 'companion', text: '真っ暗……。さっき炉を止めたから、ですか', dur: 2.4 },
      { t: 13.0, who: 'dan', text: 'そうね。電気室で非常電源を回せば、少しは戻るはずよ', dur: 2.6, expr: 'calm' },
    ],
    events: [{ t: 0.1, do: 'chapterCard', arg: 'ch5b' }, { t: 5.8, do: 'whiteFlicker' }, { t: 15.6, do: 'companionFollow' }, { t: 15.6, do: 'setStep', arg: 'ch5_s_power' }],
    sounds: [{ t: 0.4, s: 'power_down' }, { t: 5.8, s: 'heartbeat' }],
  },
  // ── 延期の記録（必須）：reveal は主任研究室（原本）・secret は記録保管庫（控え） ──
  cs05_delay_r: {
    id: 'cs05_delay_r', area: 'oldwing', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [10.8, 1.55, -19.0], look: [12.2, 0.9, -21.0], fov: 38 }, { t: 6.0, pos: [10.9, 1.5, -19.2], look: [12.2, 0.9, -21.0], fov: 34 }, { t: 6.4, pos: [12.6, 1.65, -18.6], look: [11.9, 1.5, -20.6], fov: 34, cut: true }, { t: 13.0, pos: [12.5, 1.65, -18.7], look: [11.9, 1.5, -20.6], fov: 32 }],
    actors: [{ t: 0, id: 'player', pos: [12.0, -20.0], yaw: P }],
    lines: [
      { t: 0.5, who: 'sys', text: '（「実施の延期について（提案）」。提案者の名前は黒く塗られている。端に小さな付箋：「お願い。延ばして」）', dur: 4.4 },
      { t: 5.2, who: 'companion', text: '（向こう側から）……何か、見つかりましたか？', dur: 2.2 },
      { t: 7.6, who: 'dan', text: '止めようとした人がいたのよ。……それでも、やった人がいた', dur: 2.8, expr: 'sad' },
      { t: 10.6, who: 'dan', text: 'どっちの気持ちも、紙に残ってる。……持っていくわ', dur: 2.4, expr: 'serious' },
    ],
    events: [{ t: 13.2, do: 'afterDelay5' }],
    sounds: [{ t: 0.4, s: 'pickup' }],
  },
  cs05_delay_s: {
    id: 'cs05_delay_s', area: 'oldwing', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [-11.2, 1.6, -18.0], look: [-12.1, 0.85, -20.6], fov: 40 }, { t: 6.0, pos: [-11.3, 1.55, -18.2], look: [-12.1, 0.85, -20.6], fov: 36 }, { t: 6.4, pos: [-10.6, 1.62, -21.2], look: [-11.6, 1.45, -18.6], fov: 40, cut: true }, { t: 13.0, pos: [-10.7, 1.62, -21.1], look: [-11.6, 1.45, -18.6], fov: 38 }],
    actors: [{ t: 0, id: 'player', pos: [-12.0, -19.4], yaw: P }, { t: 0, id: 'companion', pos: [-11.0, -17.6], yaw: -P * 0.85, mode: 'scripted', show: true }],
    lines: [
      { t: 0.5, who: 'sys', text: '（控えの綴り。「実施の延期について（提案）」。提案者の名前は黒く塗られ、差し戻しの印の下に「予定どおり実施」）', dur: 4.4 },
      { t: 5.2, who: 'companion', text: '「お願い。延ばして」……この付箋、写しにまで', dur: 2.4, expr: 'sad' },
      { t: 7.8, who: 'dan', text: '止めようとした人がいたのよ。……それでも、やった人がいた', dur: 2.8, expr: 'sad' },
      { t: 10.8, who: 'companion', text: '……持って行きましょう。誰かが、ちゃんと読むべきです', dur: 2.4 },
    ],
    events: [{ t: 13.2, do: 'afterDelay5' }],
    sounds: [{ t: 0.4, s: 'pickup' }],
  },
  // ── 観測棟の吹き抜け：継接（第5章のボス） ──
  cs05_r_boss: {
    id: 'cs05_r_boss', area: 'atrium', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-6.0, 2.2, 6.0], look: [0, 2.2, -6], fov: 46 },
      { t: 5.0, pos: [-4.6, 1.6, 4.0], look: [0, 2.6, -6], fov: 40 },
      { t: 5.4, pos: [1.6, 2.6, -1.8], look: [-0.3, 2.4, -6], fov: 34, cut: true },
      { t: 9.6, pos: [1.4, 2.4, -2.0], look: [-0.3, 2.0, -6], fov: 32 },
      { t: 9.8, pos: [1.2, 1.62, 5.6], look: [0, 1.5, 7.2], fov: 38, cut: true },
      { t: 15.0, pos: [1.1, 1.62, 5.5], look: [0, 1.5, 7.2], fov: 36 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 7.4], yaw: P }, { t: 0, id: 'companion', pos: [0.8, 8.0], yaw: P, mode: 'scripted', show: true }, { t: 12.6, id: 'companion', to: [10.6, 7.8], run: true }],
    lines: [
      { t: 0.6, who: 'sys', text: '（吹き抜けの真ん中で、いくつもの体を縫い合わせたものが、何もない所を叩いている。片腕に、古い鞄）', dur: 4.2 },
      { t: 5.6, who: 'tsugihagi', text: '……あけて……かえして……あけて……', dur: 2.6 },
      { t: 10.0, who: 'companion', text: 'あの鞄……ずっと、抱えてる', dur: 2.0, expr: 'sad' },
      { t: 12.2, who: 'dan', text: 'アンタは観測室へ。窓から出ないこと。——今度は隠さないわよ', dur: 3.0, expr: 'serious', cond: 'white' },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 15.4, do: 'companionWatch5' }, { t: 15.4, do: 'setStep', arg: 'ch5_r_boss' }, { t: 15.4, do: 'bossWake5' }],
    sounds: [{ t: 0.4, s: 'knock' }, { t: 2.4, s: 'knock' }, { t: 5.6, s: 'tsugi_voice' }],
  },
  cs05_s_boss: {
    id: 'cs05_s_boss', area: 'atrium', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-6.0, 2.2, 6.0], look: [0, 2.2, -6], fov: 46 },
      { t: 5.0, pos: [-4.6, 1.6, 4.0], look: [0, 2.6, -6], fov: 40 },
      { t: 5.4, pos: [1.6, 2.6, -1.8], look: [-0.3, 2.4, -6], fov: 34, cut: true },
      { t: 9.6, pos: [1.4, 2.4, -2.0], look: [-0.3, 2.0, -6], fov: 32 },
      { t: 9.8, pos: [1.2, 1.62, 5.6], look: [0, 1.5, 7.2], fov: 38, cut: true },
      { t: 15.0, pos: [1.1, 1.62, 5.5], look: [0, 1.5, 7.2], fov: 36 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 7.4], yaw: P }, { t: 0, id: 'companion', pos: [0.8, 8.0], yaw: P, mode: 'scripted', show: true }, { t: 12.6, id: 'companion', to: [10.6, 7.8], run: true }],
    lines: [
      { t: 0.6, who: 'sys', text: '（吹き抜けの真ん中で、いくつもの体を縫い合わせたものが、何もない所を叩いている。片腕に、古い鞄）', dur: 4.2 },
      { t: 5.6, who: 'tsugihagi', text: '……あけて……かえして……あけて……', dur: 2.6 },
      { t: 10.0, who: 'companion', text: 'あの鞄……ずっと、抱えてる', dur: 2.0, expr: 'sad' },
      { t: 12.2, who: 'dan', text: 'アンタは観測室へ。窓から出ないこと。……この姿のままで、片をつけるわ', dur: 3.0, expr: 'serious' },
    ],
    events: [{ t: 15.4, do: 'companionWatch5' }, { t: 15.4, do: 'setStep', arg: 'ch5_s_boss' }, { t: 15.4, do: 'bossWake5' }],
    sounds: [{ t: 0.4, s: 'knock' }, { t: 2.4, s: 'knock' }, { t: 5.6, s: 'tsugi_voice' }],
  },
  // 決着のあと（救う・無力化・倒すで共通）→ 研究者の放送 → reveal：屋上へ／secret：章の終わり
  cs05_r_after: {
    id: 'cs05_r_after', area: 'atrium', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [4.0, 2.4, 2.0], look: [0, 1.2, -7], fov: 46 }, { t: 5.0, pos: [3.6, 2.2, 1.0], look: [0, 1.0, -7], fov: 42 }, { t: 5.4, pos: [2.0, 1.0, 1.6], look: [-0.6, 5.6, -8], fov: 60, cut: true }, { t: 13.0, pos: [1.8, 1.1, 2.0], look: [-0.6, 6.0, -8], fov: 56 }],
    actors: [{ t: 0, id: 'player', pos: [0.6, -1.0], yaw: P }],
    lines: [
      { t: 0.6, who: 'sys', text: '（継ぎ目がひとつずつほどけ、縫い合わされた体が、静かに崩れていく）', dur: 3.6 },
      { t: 5.6, who: 'researcher', text: '……ここまで来たか。だが、もう遅い', dur: 2.4 },
      { t: 8.2, who: 'researcher', text: '始めよう。この町を、まるごと——取り戻す', dur: 3.0 },
      { t: 11.4, who: 'dan', text: '……屋上へ。町の様子を見るわ', dur: 2.0, expr: 'serious' },
    ],
    events: [{ t: 0.2, do: 'tsugiCollapse' }, { t: 5.4, do: 'pa' }, { t: 8.2, do: 'rumble' }, { t: 13.4, do: 'companionFollow' }, { t: 13.4, do: 'setStep', arg: 'ch5_r_end' }],
    sounds: [{ t: 0.2, s: 'wave' }, { t: 5.4, s: 'pa_chime' }, { t: 5.6, s: 'pa_voice' }],
  },
  cs05_s_after: {
    id: 'cs05_s_after', area: 'atrium', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [4.0, 2.4, 2.0], look: [0, 1.2, -7], fov: 46 }, { t: 5.0, pos: [3.6, 2.2, 1.0], look: [0, 1.0, -7], fov: 42 }, { t: 5.4, pos: [2.0, 1.0, 1.6], look: [-0.6, 5.6, -8], fov: 60, cut: true }, { t: 10.6, pos: [1.8, 1.1, 2.0], look: [-0.6, 6.0, -8], fov: 56 }, { t: 11.0, pos: [1.6, 1.62, -3.0], look: [0.2, 1.5, -5.0], fov: 36, cut: true }, { t: 18.6, pos: [1.5, 1.62, -3.1], look: [0.2, 1.5, -5.0], fov: 34 }],
    actors: [{ t: 0, id: 'player', pos: [0.6, -5.0], yaw: P }, { t: 10.8, id: 'companion', pos: [-0.4, -4.4], yaw: P * 0.75, mode: 'scripted', show: true }],
    lines: [
      { t: 0.6, who: 'sys', text: '（継ぎ目がひとつずつほどけ、縫い合わされた体が、静かに崩れていく）', dur: 3.6 },
      { t: 5.6, who: 'researcher', text: '……分室の誰かかと思ったが。君の記録は、どこにも残らないね', dur: 2.8 },
      { t: 8.6, who: 'researcher', text: '中央管理棟で待っている。……証明できないものは、無いのと同じだ', dur: 2.6 },
      { t: 11.4, who: 'companion', text: '……人の姿のままで、あんな大きなのを', dur: 2.4, expr: 'surprised' },
      { t: 14.0, who: 'dan', text: '伊達に毎晩、機械と喧嘩してないわよ。……行きましょ、管理棟へ', dur: 3.0, expr: 'smile' },
      { t: 17.2, who: 'companion', text: 'はい。……あなたがいると、怖くないです', dur: 2.2, expr: 'smile' },
    ],
    events: [{ t: 0.2, do: 'tsugiCollapse' }, { t: 5.4, do: 'pa' }, { t: 19.4, do: 'setStep', arg: 'ch5_s_end' }, { t: 19.6, do: 'endCard5', arg: 'secret' }],
    sounds: [{ t: 0.2, s: 'wave' }, { t: 5.4, s: 'pa_chime' }, { t: 5.6, s: 'pa_voice' }],
  },
  // reveal：屋上の階段 → 町へ出る（フェードで巨大用の町へ）→ 町の灯りが紫に塗り替わっていく（広域計画）
  cs05_r_roof: {
    id: 'cs05_r_roof', area: 'town', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [2.6, 1.7, 30.0], look: [-0.5, 4.0, 10.0], fov: 56 }, { t: 4.0, pos: [2.4, 2.0, 29.0], look: [0, 18.0, -60.0], fov: 52 }, { t: 4.4, pos: [1.2, 1.62, 21.4], look: [0.6, 1.5, 23.6], fov: 38, cut: true }, { t: 12.0, pos: [1.1, 1.62, 21.3], look: [0.6, 1.5, 23.6], fov: 36 }],
    actors: [{ t: 0, id: 'player', pos: [0.6, 23.6], yaw: P }, { t: 0, id: 'companion', pos: [2.2, 24.4], yaw: P, mode: 'scripted', show: true, anim: 'idle' }],
    lines: [
      { t: 0.6, who: 'sys', text: '（観測棟の外は、商店街の通りだった。町の灯りが、遠くから一列ずつ、紫に塗り替わっていく）', dur: 3.8 },
      { t: 4.6, who: 'companion', text: '町が……！　商店街の方まで', dur: 2.2, expr: 'surprised' },
      { t: 7.0, who: 'dan', text: '止めるわ。人の大きさじゃ届かない。……もう一度、あの姿で', dur: 3.0, expr: 'serious', cond: 'white' },
      { t: 10.2, who: 'dan', text: 'アンタは離れてなさい。……いいわね', dur: 1.8, expr: 'serious', cond: 'white' },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 3.0, do: 'rumble' }, { t: 12.2, do: 'rampageIntro' }],
    sounds: [{ t: 0.4, s: 'rumble' }],
  },
  // ── 第6章A の冒頭：CS-06A-1「暴走」（力があふれて体が言うことを聞かない）。操作は「抑える」と移動だけ（市民を攻撃する入力は無い） ──
  cs06_rampage: {
    id: 'cs06_rampage', area: 'town', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [3.6, 1.3, 28.0], look: [0.0, 3.0, 8.0], fov: 54 },
      { t: 3.6, pos: [3.4, 1.3, 27.6], look: [0, 4.0, 6.0], fov: 52 },
      { t: 4.0, pos: [3.8, 4, 20], look: [0, 3, 6], fov: 56, cut: true, ease: 'linear' },
      { t: 8.0, pos: [4, 12, 30], look: [0, 8, 4], fov: 54 },
      { t: 8.4, pos: [1.2, 8.7, -3.6], look: [0, 8.9, 1.4], fov: 40, cut: true },
      { t: 13.0, pos: [1.1, 8.7, -3.4], look: [0, 8.9, 1.4], fov: 38 },
      { t: 13.2, pos: [3.8, 1.3, 27.6], look: [0, 8.0, 6.0], fov: 56, cut: true },
      { t: 16.4, pos: [3.6, 1.4, 27.2], look: [0, 8.5, 6.0], fov: 54 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 6], yaw: P }, { t: 0, id: 'companion', pos: [3.4, 24.0], yaw: P * 0.95, mode: 'scripted', show: true, anim: 'idle' }],
    lines: [
      { t: 0.6, who: 'sys', text: '（光の柱から、置き換えの膜が町へ伸びる。だんのうらの体が、白い光に包まれて大きくなる）', dur: 3.4 },
      { t: 8.6, who: 'sys', text: '（大きくなった体に、力が流れ込み続ける。……止まらない）', dur: 2.6 },
      { t: 10.8, who: 'dan', text: '……っ、なに、これ……アタシの体よ……言うことを、聞きなさい……！', dur: 3.0, expr: 'angry' },
      { t: 13.6, who: 'companion', text: 'だんのうらさん……？', dur: 1.8, expr: 'surprised' },
    ],
    events: [{ t: 0.1, do: 'chapterCard', arg: 'ch6a' }, { t: 4.0, do: 'giantGrow6' }, { t: 8.6, do: 'giantRampK', arg: 1 }, { t: 9.0, do: 'camShake', arg: 0.3 }, { t: 16.6, do: 'setStep', arg: 'ch6a_rampage' }, { t: 16.6, do: 'rampageStart' }],
    sounds: [{ t: 4.0, s: 'transform' }, { t: 7.0, s: 'giant_roar' }, { t: 9.0, s: 'rumble' }, { t: 12.0, s: 'heartbeat' }],
  },
  // 暴走の途中：崩れた看板の破片で（相棒）が負傷する（直接の攻撃ではない・致命傷ではない・演出のみ）
  cs06_injury: {
    id: 'cs06_injury', area: 'town', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [1.0, 1.6, 27.8], look: [3.4, 0.9, 24.0], fov: 44 }, { t: 4.6, pos: [1.2, 1.4, 27.4], look: [3.4, 0.8, 24.0], fov: 40 }],
    actors: [{ t: 0, id: 'companion', pos: [3.4, 24.0], yaw: P * 0.95, mode: 'scripted', show: true, anim: 'cower' }],
    lines: [
      { t: 0.4, who: 'sys', text: '（尾に払われた看板が崩れ、破片が（相棒）の腕をかすめた）', dur: 2.6 },
      { t: 3.2, who: 'companion', text: 'っ……！　……大丈夫、です……', dur: 2.0, expr: 'sad' },
    ],
    events: [{ t: 0.2, do: 'debrisNearCompanion' }, { t: 2.8, do: 'companionInjured' }, { t: 5.4, do: 'rampageResume' }],
    sounds: [{ t: 0.2, s: 'crash' }],
  },
  // CS-06A-2「我に返る」：目のアップ → 瞳に映る（相棒）→ 倒れかけた電柱を尾で支える（最初の「守る」動き）→ 操作が「守る」へ
  cs06_calm: {
    id: 'cs06_calm', area: 'town', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.8, 9.4, 18.0], look: [0, 8.9, 10.8], fov: 34 },
      { t: 3.6, pos: [0.7, 9.3, 17.2], look: [0, 8.9, 10.8], fov: 30 },
      { t: 3.8, pos: [1.6, 1.2, 27.0], look: [3.4, 1.0, 24.0], fov: 38, cut: true },
      { t: 7.0, pos: [1.7, 1.3, 26.8], look: [3.4, 1.0, 24.0], fov: 36 },
      { t: 7.2, pos: [-3, 9, 34], look: [1, 5, 12], fov: 54, cut: true },
      { t: 13.6, pos: [-4, 10, 36], look: [1, 5, 12], fov: 52 },
    ],
    actors: [{ t: 0, id: 'companion', pos: [3.4, 24.0], yaw: P * 0.95, mode: 'scripted', show: true, anim: 'call' }],
    lines: [
      { t: 0.6, who: 'companion', text: 'だんのうらさん！', dur: 1.8 },
      { t: 2.6, who: 'sys', text: '（大きな瞳に、座り込んだ（相棒）が映る）', dur: 1.8 },
      { t: 4.2, who: 'companion', text: '……戻って、きた', dur: 2.0, expr: 'smile' },
      { t: 7.6, who: 'dan', text: '……ごめんなさいね。もう、大丈夫', dur: 2.4, expr: 'sad' },
      { t: 10.4, who: 'dan', text: '今度は、守る番よ', dur: 2.2, expr: 'serious' },
    ],
    events: [{ t: 0.0, do: 'giantPose6', arg: { x: 0, z: 6, yaw: 0 } }, { t: 0.1, do: 'giantRampK', arg: 0.35 }, { t: 3.8, do: 'giantRampK', arg: 0 }, { t: 7.2, do: 'poleCatch' }, { t: 13.8, do: 'setStep', arg: 'ch6a_protect' }, { t: 13.8, do: 'protectStart' }],
    sounds: [{ t: 0.4, s: 'heartbeat' }, { t: 7.4, s: 'giant_step' }],
  },
  // 守りきった（第6章A の冒頭の終わり）
  cs06_end: {
    id: 'cs06_end', area: 'town', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [-4, 12, 40], look: [0, 4, 12], fov: 54 }, { t: 5.0, pos: [-3, 11, 38], look: [0, 4, 12], fov: 52 }, { t: 5.4, pos: [1.4, 1.4, 27.2], look: [3.4, 1.0, 24.0], fov: 38, cut: true }, { t: 12.4, pos: [1.5, 1.4, 27.0], look: [3.4, 1.0, 24.0], fov: 36 }],
    actors: [{ t: 0, id: 'companion', pos: [3.4, 24.0], yaw: P * 0.95, mode: 'scripted', show: true, anim: 'injured' }],
    lines: [
      { t: 0.6, who: 'sys', text: '（逃げ遅れた人たちが、避難の列へ駆けていく。巨大な猫又は、その背中を見送った）', dur: 3.8 },
      { t: 5.6, who: 'companion', text: '……みんな、逃げられましたね', dur: 2.2, expr: 'smile' },
      { t: 8.0, who: 'dan', text: 'ええ。……光の柱は、まだ。でもその前に、アンタは病院よ', dur: 3.0, expr: 'calm' },
      { t: 11.2, who: 'companion', text: '……はい', dur: 1.4, expr: 'smile' },
    ],
    events: [{ t: 12.6, do: 'setStep', arg: 'ch6a_end' }, { t: 12.8, do: 'endCard6' }],
    sounds: [{ t: 0.2, s: 'notify' }],
  },
};
