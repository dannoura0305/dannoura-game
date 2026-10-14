// 第4章「境界の夜」の演出場面（CUTSCENE_SPEC の形）。座標は観測分室（office）・地下研究区画（lab）・搬入ヤード（yard）の区画の座標。
// 台詞は【仮】、fixed:true だけが【原文・確定】。原文の台詞は第3章でだんのうらが 1 回（cutscenes3.js の cs03_line）、
// 第4章で相棒が同じ言葉をそのまま 1 回（cs04_line：reveal で白い姿を見たあと）。ほかの場所には書かない（3 回目は無い）。
// だんのうらは男性（化け猫であることを自分で知っている）。白い姿・巨大猫又は本来の姿で、暴走ではない。娘は千代さんに預けてある（危ない所へ連れてこない）。
// 研究者（放送の声）は九条とは別人で、名前は出さない（関係は伏せる）。
import { LINE_CH3 } from './cutscenes3.js';
export const LINE_CH4 = LINE_CH3;          // 第3章のだんのうらの言葉を、相棒がそのまま返す（一字一句同じ）

const P = Math.PI;
export const CUTSCENES4 = {
  // 観測分室に着く
  cs04_office: {
    id: 'cs04_office', area: 'office', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-3.4, 2.3, 7.4], look: [0.2, 1.2, 12.6], fov: 50 },
      { t: 6.0, pos: [-2.6, 2.0, 8.4], look: [0.2, 1.3, 12.2], fov: 44 },
      { t: 6.4, pos: [1.0, 1.55, 10.0], look: [0.0, 1.45, 12.0], fov: 40, cut: true },
      { t: 11.6, pos: [1.1, 1.55, 9.9], look: [0.0, 1.45, 12.0], fov: 38 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0, 13.0], yaw: P }, { t: 0, id: 'companion', pos: [0.9, 13.6], yaw: P, mode: 'scripted', show: true },
      { t: 0.8, id: 'player', to: [0, 11.6] }, { t: 1.1, id: 'companion', to: [0.9, 12.3] },
    ],
    lines: [
      { t: 1.0, who: 'sys', text: '（観測分室。受付にも、監視室にも、誰もいない。画面だけが点いている）', dur: 3.4 },
      { t: 4.6, who: 'companion', text: '無線の人、ここで待ってるって……', dur: 2.0 },
      { t: 6.8, who: 'dan', text: '留守ね。……監視室の端末から当たってみましょ。入退室の記録が残ってるはずよ', dur: 3.2, expr: 'serious' },
      { t: 10.2, who: 'companion', text: 'はい', dur: 1.2 },
    ],
    events: [{ t: 0.1, do: 'expr', arg: { who: 'player', name: 'serious' } }, { t: 11.6, do: 'companionFollow' }, { t: 11.6, do: 'setStep', arg: 'ch4_office' }],
    sounds: [{ t: 0.5, s: 'tv_blip' }],
  },
  // 研究者の放送（ネタばらしは避け、相棒とだんのうらの「違い」だけを言う）
  cs04_broadcast: {
    id: 'cs04_broadcast', area: 'office', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.6, 2.9, 0.4], look: [0, 3.0, -2.0], fov: 46 },
      { t: 4.0, pos: [0.4, 2.7, 0.0], look: [0, 3.0, -2.0], fov: 40 },
      { t: 4.4, pos: [1.8, 1.6, 0.6], look: [0, 1.4, -1.6], fov: 44, cut: true },
      { t: 13.6, pos: [1.6, 1.6, 0.4], look: [0, 1.4, -1.6], fov: 40 },
    ],
    actors: [{ t: 0, id: 'player', pos: [-0.3, -1.4], yaw: 0.4 }, { t: 0, id: 'companion', pos: [0.6, -1.8], yaw: -0.3, mode: 'scripted', show: true }],
    lines: [
      { t: 0.6, who: 'researcher', text: '……聞こえているかな。今夜、そこにいるのは分室の人間ではないね', dur: 3.2 },
      { t: 4.4, who: 'researcher', text: '彼女はほんの少し、こちら側に触れているだけだ。だが君は——触れているどころではない', dur: 4.2 },
      { t: 9.0, who: 'companion', text: '……今の、誰ですか。「こちら側」って……', dur: 2.4, expr: 'surprised' },
      { t: 11.6, who: 'dan', text: 'さあね。……地下にいるわ、あの声。行きましょ', dur: 2.6, expr: 'serious' },
    ],
    events: [{ t: 0.2, do: 'pa' }, { t: 14.2, do: 'companionFollow' }, { t: 14.2, do: 'setStep', arg: 'ch4_down' }],
    sounds: [{ t: 0.1, s: 'pa_chime' }, { t: 0.6, s: 'pa_voice' }, { t: 4.4, s: 'pa_voice' }],
  },
  // 地下研究区画に着く（concept_03 の雰囲気：試験槽の影・キャットウォーク・警告）
  cs04_lab: {
    id: 'cs04_lab', area: 'lab', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-6.0, 5.6, 6.6], look: [4.0, 2.0, -14.0], fov: 52 },
      { t: 7.0, pos: [-3.0, 4.8, 3.6], look: [6.0, 2.2, -12.0], fov: 46 },
      { t: 7.4, pos: [1.4, 1.6, 4.8], look: [0.0, 1.45, 7.0], fov: 40, cut: true },
      { t: 13.0, pos: [1.3, 1.6, 4.9], look: [0.0, 1.45, 7.0], fov: 38 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 7.6], yaw: P }, { t: 0, id: 'companion', pos: [0.8, 8.4], yaw: P, mode: 'scripted', show: true }, { t: 0.6, id: 'player', to: [0, 6.6] }, { t: 0.8, id: 'companion', to: [0.8, 7.4] }],
    lines: [
      { t: 1.0, who: 'sys', text: '（地下の研究区画。並んだ試験槽の中に、丸まった人影。……ひとつ残らず、こちらを向いている）', dur: 4.0 },
      { t: 7.6, who: 'companion', text: '……これ、全部……人、ですか', dur: 2.2, expr: 'sad' },
      { t: 10.0, who: 'dan', text: '見なくていいわ。なーん、大丈夫。アタシの後ろにいなさい', dur: 2.8, expr: 'serious' },
    ],
    events: [{ t: 13.0, do: 'companionFollow' }, { t: 13.0, do: 'setStep', arg: 'ch4_lab' }],
    sounds: [{ t: 0.4, s: 'heartbeat' }, { t: 4.0, s: 'outou_voice' }],
  },
  // 罠：相棒が試験床に呼び寄せられ、囲まれる（分岐の前）
  cs04_trap: {
    id: 'cs04_trap', area: 'lab', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [5.6, 3.4, -1.0], look: [0, 1.2, -9.0], fov: 50 },
      { t: 5.6, pos: [5.0, 3.0, -2.0], look: [0, 1.2, -9.0], fov: 46 },
      { t: 6.0, pos: [0.6, 1.05, -10.6], look: [0, 1.5, -3.0], fov: 46, cut: true },
      { t: 10.4, pos: [0.5, 1.0, -10.4], look: [0, 1.6, -3.0], fov: 44 },
      { t: 10.8, pos: [-6.8, 4.2, -2.6], look: [0, 0.8, -9.0], fov: 50, cut: true },
      { t: 14.0, pos: [-6.4, 3.8, -3.2], look: [0, 0.8, -9.0], fov: 48 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0, -2.4], yaw: P }, { t: 0, id: 'companion', pos: [0.9, -1.8], yaw: P, mode: 'scripted', show: true },
      { t: 1.8, id: 'companion', to: [0, -9.0], run: true }, { t: 6.0, id: 'companion', yaw: 0, anim: 'cower' },
      { t: 6.0, id: 'player', to: [0, -3.4], run: true },
    ],
    lines: [
      { t: 0.4, who: 'mimic', text: '「こっちよ。早く、こっちへいらっしゃい」', dur: 2.2 },
      { t: 2.8, who: 'dan', text: '待ちなさい！　今のはアタシじゃない！', dur: 2.4, expr: 'angry' },
      { t: 6.2, who: 'sys', text: '（試験床の輪が灯る。槽が割れ、白い影が次々に立ち上がる）', dur: 3.2 },
      { t: 9.6, who: 'companion', text: 'だんのうらさん……！', dur: 1.8 },
      { t: 11.2, who: 'dan', text: '……この数。人の姿のままじゃ、間に合わないかもしれないわね', dur: 3.0, expr: 'serious' },
    ],
    events: [{ t: 1.6, do: 'trapRing' }, { t: 6.0, do: 'spawnTrap' }, { t: 6.2, do: 'camShake', arg: 0.12 }, { t: 14.2, do: 'setStep', arg: 'ch4_branch' }],
    sounds: [{ t: 0.4, s: 'mimic_voice' }, { t: 6.0, s: 'glass_break' }, { t: 6.4, s: 'outou_voice' }, { t: 9.6, s: 'heartbeat' }],
  },
  // CS-04R「化けを解く」（reveal）：相棒の目線 → めがねに手をかける → 一瞬で白へ（長い変身の見せ場にしない）→ 操作する戦いへ
  cs04_reveal: {
    id: 'cs04_reveal', area: 'lab', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.2, 0.95, -8.6], look: [0, 1.5, -3.4], fov: 44 },
      { t: 2.6, pos: [0.2, 0.95, -8.4], look: [0, 1.55, -3.4], fov: 40 },
      { t: 2.8, pos: [0.42, 1.56, -4.62], look: [0, 1.5, -3.4], fov: 30, cut: true },
      { t: 4.6, pos: [0.4, 1.56, -4.58], look: [0, 1.5, -3.4], fov: 28 },
      { t: 5.0, pos: [0.2, 0.95, -8.6], look: [0, 1.4, -3.4], fov: 44, cut: true },
      { t: 8.6, pos: [0.4, 1.0, -8.2], look: [0, 1.5, -3.4], fov: 40 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -3.4], yaw: P }, { t: 0, id: 'companion', pos: [0, -9.0], yaw: 0, mode: 'scripted', show: true, anim: 'cower' }],
    lines: [
      { t: 0.5, who: 'dan', text: '……ごめんなさいね。ずっと、黙ってて', dur: 2.2, expr: 'calm' },
      { t: 2.9, who: 'sys', text: '（めがねに手をかける。——紫の髪が、一瞬で白に変わる）', dur: 2.0 },
      { t: 5.4, who: 'dan', text: 'その人から、離れてくれるかしら', dur: 2.4, expr: 'calm', cond: 'white' },
    ],
    events: [{ t: 2.8, do: 'playerAnim', arg: 'glasses' }, { t: 4.0, do: 'transform', arg: 'white' }, { t: 4.1, do: 'playerAnim', arg: null }, { t: 4.4, do: 'formCard', arg: '白髪形態' }, { t: 8.6, do: 'setStep', arg: 'ch4_r_fight' }, { t: 8.6, do: 'trapFight' }],
    sounds: [{ t: 4.0, s: 'transform' }],
  },
  // 相棒が白い姿を見たあと：沈黙 3 秒 → 原文の台詞（相棒がそのまま返す）【原文・確定】
  cs04_line: {
    id: 'cs04_line', area: 'lab', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [3.4, 1.45, -7.9], look: [0, 1.35, -7.9], fov: 40 },
      { t: 3.6, pos: [3.3, 1.45, -7.9], look: [0, 1.35, -7.9], fov: 38 },
      { t: 3.8, pos: [0.5, 1.62, -6.1], look: [0, 1.42, -9.0], fov: 30, cut: true },
      { t: 8.0, pos: [0.48, 1.62, -6.15], look: [0, 1.42, -9.0], fov: 28 },
      { t: 8.2, pos: [-0.45, 1.56, -9.65], look: [0, 1.5, -6.8], fov: 30, cut: true },
      { t: 10.8, pos: [-0.44, 1.56, -9.6], look: [0, 1.5, -6.8], fov: 28 },
      { t: 11.0, pos: [3.4, 1.45, -7.9], look: [0, 1.35, -7.9], fov: 40, cut: true },
      { t: 14.6, pos: [3.6, 1.6, -7.6], look: [0, 1.3, -8.0], fov: 44 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -6.8], yaw: P }, { t: 0, id: 'companion', pos: [0, -9.0], yaw: 0, mode: 'scripted', show: true, anim: 'idle' }],
    lines: [
      { t: 4.2, who: 'companion', text: LINE_CH4, dur: 3.6, fixed: true, expr: 'calm' },
      { t: 8.4, who: 'dan', text: '……それ、アタシの台詞よ', dur: 2.2, expr: 'smile' },
      { t: 11.2, who: 'companion', text: '……誰にも、言いません', dur: 2.4, expr: 'smile' },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 0.1, do: 'expr', arg: { who: 'companion', name: 'surprised' } }, { t: 3.8, do: 'expr', arg: { who: 'companion', name: 'calm' } }, { t: 15.0, do: 'flag', arg: 'line4_done' }, { t: 15.0, do: 'setStep', arg: 'ch4_r_rise' }, { t: 15.0, do: 'rumble' }],
    sounds: [{ t: 14.0, s: 'notify' }],
  },
  // 地響き：相棒を先に地上のポンプ室へ逃がす
  cs04_rise: {
    id: 'cs04_rise', area: 'lab', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [3.0, 2.0, -5.0], look: [0, 1.5, -12.0], fov: 46 }, { t: 7.0, pos: [2.6, 2.2, -5.4], look: [0, 2.5, -22.0], fov: 44 }],
    actors: [{ t: 0, id: 'player', pos: [0, -7.4], yaw: P }, { t: 0, id: 'companion', pos: [0.8, -8.6], yaw: P, mode: 'scripted', show: true, anim: 'idle' }, { t: 3.4, id: 'companion', to: [0.8, -23.0], run: true, hideAtEnd: true }],
    lines: [
      { t: 0.4, who: 'sys', text: '（足もとが揺れる。搬入口の向こう、地上で何かが目を覚ます）', dur: 2.8 },
      { t: 3.2, who: 'dan', text: '先に地上のポンプ室へ。……戸を閉めて、出てこないこと。いい？', dur: 3.0, expr: 'serious' },
      { t: 6.4, who: 'companion', text: '……はい。だんのうらさんも、必ず', dur: 2.0 },
    ],
    events: [{ t: 0.2, do: 'camShake', arg: 0.18 }, { t: 0.2, do: 'flag', arg: 'ch4_rise' }],
    sounds: [{ t: 0.2, s: 'rumble' }],
  },
  // 巨大猫又へ（reveal）：先触れが立ち上がる → 白い姿から巨大な姿へ（大きくなる）→ 戦いへ
  cs04_giant: {
    id: 'cs04_giant', area: 'yard', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [26, 5, 44], look: [0, 12, -30], fov: 52 },
      { t: 4.4, pos: [20, 6, 38], look: [0, 18, -30], fov: 48 },
      { t: 4.8, pos: [7.0, 1.62, 28.9], look: [6, 1.55, 30], fov: 34, cut: true },
      { t: 8.0, pos: [6.9, 1.62, 28.8], look: [6, 1.55, 30], fov: 32 },
      { t: 8.2, pos: [11, 2.0, 22], look: [6, 2.0, 30], fov: 50, cut: true, ease: 'linear' },
      { t: 11.4, pos: [30, 16, 52], look: [6, 6, 26], fov: 52 },
      { t: 14.6, pos: [24, 14, 52], look: [2, 8, 4], fov: 50 },
    ],
    actors: [{ t: 0, id: 'player', pos: [6, 30], yaw: P }, { t: 0, id: 'companion', pos: [-30.5, 30], yaw: -P / 2, mode: 'scripted', show: true }, { t: 0.6, id: 'companion', to: [-34.5, 30], run: true, hideAtEnd: true }],
    lines: [
      { t: 0.6, who: 'sys', text: '（研究施設の裂け目から、黒い膜の塊が立ち上がる。胸に、桃色の輪）', dur: 3.4 },
      { t: 5.0, who: 'dan', text: '……人の大きさじゃ、届かないわね', dur: 2.2, expr: 'serious', cond: 'white' },
      { t: 7.2, who: 'dan', text: 'いいわ。——本気で、行くわよ', dur: 1.8, expr: 'angry' },
      { t: 12.0, who: 'dan', text: 'この町を、喰わせない', dur: 2.4 },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 0.3, do: 'bossRise4' }, { t: 8.2, do: 'giantGrow' }, { t: 11.0, do: 'formCard', arg: '巨大猫又' }, { t: 11.2, do: 'camShake', arg: 0.3 }, { t: 14.8, do: 'setStep', arg: 'ch4_r_giant' }, { t: 14.8, do: 'bossWake4' }],
    sounds: [{ t: 0.3, s: 'boss_rise' }, { t: 8.2, s: 'transform' }, { t: 10.4, s: 'giant_roar' }, { t: 12.6, s: 'boss_roar' }],
  },
  // 決着（reveal）：先触れが裂け目へ崩れる → 相棒が名前を呼ぶ → 白い姿へ戻る
  cs04_giant_end: {
    id: 'cs04_giant_end', area: 'yard', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [30, 14, 14], look: [0, 6, -30], fov: 50 },
      { t: 4.4, pos: [26, 12, 10], look: [0, 3, -30], fov: 46 },
      { t: 4.8, pos: [-26, 2.0, 38], look: [-34.6, 1.6, 30], fov: 44, cut: true },
      { t: 8.6, pos: [-26.4, 2.0, 37.6], look: [-34.6, 1.6, 30], fov: 40 },
      { t: 9.0, pos: [-21, 3.0, 35], look: [-26, 1.6, 30], fov: 42, cut: true },
      { t: 16.0, pos: [-26.2, 1.65, 33.6], look: [-26.4, 1.45, 30.2], fov: 38 },
    ],
    actors: [{ t: 4.8, id: 'companion', pos: [-32.2, 30], yaw: P / 2, mode: 'scripted', show: true }, { t: 9.0, id: 'player', pos: [-25.4, 30.4], yaw: -P / 2 }, { t: 9.4, id: 'companion', to: [-27.4, 30.1] }],
    lines: [
      { t: 0.6, who: 'sys', text: '（黒い塊が、裂け目の中へ崩れていく。夜の音が、少しずつ戻ってくる）', dur: 3.4 },
      { t: 5.0, who: 'companion', text: 'だんのうらさん！', dur: 1.6 },
      { t: 6.8, who: 'companion', text: 'だんのうらさん……！', dur: 1.6 },
      { t: 9.6, who: 'dan', text: '……ただいま。驚かせたわね', dur: 2.2, expr: 'calm', cond: 'white' },
      { t: 12.2, who: 'companion', text: '……おかえりなさい', dur: 2.0, expr: 'smile' },
      { t: 14.4, who: 'dan', text: '帰りましょ。……娘を千代さんに預けっぱなしなのよ', dur: 2.4, expr: 'smile' },
    ],
    events: [{ t: 0.2, do: 'bossCollapse' }, { t: 8.8, do: 'giantShrink' }, { t: 16.6, do: 'setStep', arg: 'ch4_r_end' }, { t: 16.8, do: 'endCard4', arg: 'reveal' }],
    sounds: [{ t: 0.2, s: 'wave' }, { t: 8.8, s: 'revert' }],
  },
  // CS-04S「人として」（secret）：割れた槽のガラスに映る自分 → 白がにじみかけて、戻る（見るのはプレイヤーだけ）
  cs04_suppress: {
    id: 'cs04_suppress', area: 'lab', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [0.45, 1.57, -4.6], look: [0, 1.5, -3.4], fov: 30 }, { t: 7.0, pos: [0.55, 1.52, -4.8], look: [0, 1.45, -3.4], fov: 36 }],
    actors: [{ t: 0, id: 'player', pos: [0, -3.4], yaw: P }, { t: 0, id: 'companion', pos: [0, -9.0], yaw: 0, mode: 'scripted', show: true, anim: 'cower' }],
    lines: [
      { t: 0.4, who: 'sys', text: '（割れた槽のガラスに、自分の顔が映る。髪の根もとが、白くにじむ）', dur: 2.8 },
      { t: 3.4, who: 'dan', text: '……まだよ。まだ、この姿で', dur: 2.2, expr: 'serious' },
      { t: 5.8, who: 'dan', text: 'その人には、指一本触れさせないわ', dur: 2.2, expr: 'angry' },
    ],
    events: [{ t: 1.2, do: 'whiteFlicker' }, { t: 8.2, do: 'setStep', arg: 'ch4_s_trial' }, { t: 8.2, do: 'trapFight' }],
    sounds: [{ t: 1.2, s: 'heartbeat' }],
  },
  // 試練に勝った（secret）：相棒は疑わない → 非常停止（赤い灯）
  cs04_s_win: {
    id: 'cs04_s_win', area: 'lab', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [2.6, 1.5, -6.6], look: [0, 1.4, -8.6], fov: 42 }, { t: 6.0, pos: [2.4, 1.5, -6.8], look: [0, 1.4, -8.6], fov: 40 }, { t: 6.4, pos: [-8, 4.6, -2], look: [-12, 1.5, -18], fov: 50, cut: true }, { t: 12.0, pos: [-8.4, 4.4, -3], look: [-13.5, 1.5, -18], fov: 46 }],
    actors: [{ t: 0, id: 'player', pos: [0.2, -7.4], yaw: P }, { t: 0, id: 'companion', pos: [0, -9.0], yaw: 0, mode: 'scripted', show: true, anim: 'idle' }],
    lines: [
      { t: 0.5, who: 'companion', text: '……すごいですね。今の、全部……', dur: 2.4, expr: 'surprised' },
      { t: 3.2, who: 'dan', text: '伊達に毎晩、機械と喧嘩してないわよ', dur: 2.4, expr: 'smile' },
      { t: 6.6, who: 'sys', text: '（警報。灯りが落ち、非常灯の赤だけになる。制御室の隔壁が閉じたまま止まる）', dur: 3.2 },
      { t: 10.0, who: 'dan', text: '非常電源に切り替わったわね。……配電盤、見てくるわ', dur: 2.6, expr: 'serious' },
    ],
    events: [{ t: 6.4, do: 'emergency' }, { t: 12.6, do: 'companionFollow' }, { t: 12.6, do: 'setStep', arg: 'ch4_s_power' }],
    sounds: [{ t: 6.4, s: 'power_down' }, { t: 6.6, s: 'alarm' }],
  },
  // 制御室：相棒が炉を止める手順を進める（守り）
  cs04_s_hold: {
    id: 'cs04_s_hold', area: 'lab', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [15.4, 1.8, -15.0], look: [19.2, 1.2, -18.4], fov: 46 }, { t: 7.6, pos: [15.6, 1.8, -15.4], look: [19.2, 1.2, -18.4], fov: 42 }],
    actors: [{ t: 0, id: 'player', pos: [16.0, -18.2], yaw: P / 2 }, { t: 0, id: 'companion', pos: [15.4, -17.4], yaw: P / 2, mode: 'scripted', show: true }, { t: 0.6, id: 'companion', to: [18.2, -18.2] }],
    lines: [
      { t: 0.8, who: 'companion', text: '止める手順、ここに書いてあります。……でも、時間がかかりそう', dur: 2.8 },
      { t: 4.0, who: 'dan', text: 'アタシが戸口を見てる。アンタは手を動かして', dur: 2.6, expr: 'serious' },
      { t: 6.8, who: 'sys', text: '（換気口の奥で、何かが這う音）', dur: 1.8 },
    ],
    events: [{ t: 8.8, do: 'setStep', arg: 'ch4_s_hold' }, { t: 8.8, do: 'holdStart' }],
    sounds: [{ t: 6.8, s: 'outou_voice' }],
  },
  // 炉が止まる（secret の章の終わり）
  cs04_s_end: {
    id: 'cs04_s_end', area: 'lab', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [16.4, 1.7, -15.6], look: [21.8, 1.8, -18.2], fov: 46 }, { t: 5.0, pos: [16.2, 1.6, -16.0], look: [21.8, 1.6, -18.2], fov: 42 }, { t: 5.4, pos: [17.0, 1.55, -19.6], look: [17.2, 1.45, -18.2], fov: 38, cut: true }, { t: 12.0, pos: [17.1, 1.55, -19.7], look: [17.4, 1.45, -18.2], fov: 36 }],
    actors: [{ t: 0, id: 'player', pos: [16.6, -18.6], yaw: P / 2 }, { t: 0, id: 'companion', pos: [18.2, -18.0], yaw: -P / 2, mode: 'scripted', show: true }],
    lines: [
      { t: 0.6, who: 'sys', text: '（炉の窓の紫が、ゆっくり消えていく。槽の中の影も、静かに沈む）', dur: 3.2 },
      { t: 4.0, who: 'companion', text: '止まった……', dur: 1.6, expr: 'smile' },
      { t: 6.0, who: 'dan', text: 'お疲れさま。……帰りましょ。娘を千代さんに預けっぱなしなのよ', dur: 3.0, expr: 'smile' },
      { t: 9.4, who: 'companion', text: '……はい。帰りましょう', dur: 2.4, expr: 'smile' },
    ],
    events: [{ t: 0.4, do: 'reactorOff' }, { t: 12.2, do: 'setStep', arg: 'ch4_s_end' }, { t: 12.4, do: 'endCard4', arg: 'secret' }],
    sounds: [{ t: 0.4, s: 'power_down' }],
  },
};
