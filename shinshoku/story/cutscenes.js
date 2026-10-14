// 演出場面のデータ（CUTSCENE_SPEC §2）。座標は各区画の座標。台詞の「仮：」は SCENARIO_FLOW・CUTSCENE_SPEC の仮台詞・本作の仮台詞。
// fixed:true（原文・確定）の台詞は、この試作の範囲（序章〜第2章）には出てこない（第3章以降）。
import { CUTSCENES3 } from './cutscenes3.js';
import { CUTSCENES4 } from './cutscenes4.js';
// 形：{ id, area, letterbox, skippable, cam:[{t,pos,look,fov,cut?}], lines:[{t,who,text,dur}], actors:[{t,id,pos?|to?,yaw?,run?,anim?}], events:[{t,do,arg}], sounds:[{t,s}] }
export const CUTSCENES = {
  // CS-00「明かりが消える」（序章）
  cs00_lightsout: {
    id: 'cs00_lightsout', area: 'shotengai', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.6, 2.0, -26.5], look: [-1.2, 1.4, -34], fov: 46 },
      { t: 2.0, pos: [0.4, 2.2, -27.5], look: [0, 2.6, -60], fov: 50 },
      { t: 8.0, pos: [0.3, 2.0, -30.5], look: [0.6, 1.6, -46], fov: 44 },
      { t: 11.0, pos: [0.3, 1.9, -31.0], look: [0.8, 1.4, -45], fov: 36 },
      { t: 12.2, pos: [-0.2, 1.7, -29.0], look: [-1.8, 1.3, -34], fov: 48, cut: true },
      { t: 15.0, pos: [0.2, 1.8, -28.0], look: [-1.2, 1.2, -36], fov: 50 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [-1.3, -32.4], yaw: -2.5 },
      { t: 0, id: 'companion', pos: [-2.5, -33.8], yaw: 0.6, mode: 'scripted' },
      { t: 0.8, id: 'companion', yaw: Math.PI, anim: 'warn' },
      { t: 8.6, id: 'kiro_t', pos: [0.9, -45.5], yaw: 0, show: true },
      { t: 12.4, id: 'companion', to: [-4.0, -29.6], run: true, anim: 'run' },
      { t: 13.4, id: 'companion', to: [-10.5, -29.6], run: true, hideAtEnd: true },
      { t: 12.6, id: 'player', yaw: -0.9 },
    ],
    lines: [
      { t: 1.0, who: 'companion', text: '……今、奥の方', dur: 2.4 },
      { t: 4.4, who: 'dan', text: '停電、かしら', dur: 2.2 },
      { t: 9.4, who: 'companion', text: '……あそこ。人が、立ってる', dur: 2.2 },
      { t: 11.0, who: 'kiro', text: '……ただいま……ただいま……', dur: 1.8 },
      { t: 12.6, who: 'companion', text: '（悲鳴）', dur: 1.2 },
      { t: 13.8, who: 'dan', text: 'ちょっと、アンタ！　そっちは駄目よ！', dur: 2.0 },
    ],
    events: [
      { t: 2.0, do: 'lightsOut', arg: { from: -70, to: -24, step: 0.45 } },
      { t: 2.1, do: 'civiliansVanish' },
      { t: 6.4, do: 'vendingOff' },
      { t: 6.5, do: 'silence', arg: 1.6 },
      { t: 8.6, do: 'flickerKiroLight' },
      { t: 15.0, do: 'setStep', arg: 'pro_pipe' },
    ],
    sounds: [{ t: 2.0, s: 'power_down' }, { t: 8.6, s: 'notice' }, { t: 11.0, s: 'kiro_voice' }, { t: 12.6, s: 'scream' }],
  },
  // 序章の終わり：テレビに研究者の顔が一瞬（音声なし）。研究者は九条とは別人・名前未定（DECISIONS）
  cs00_tv: {
    id: 'cs00_tv', area: 'shotengai', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-2.6, 1.25, 14.2], look: [3.5, 0.95, 9.6], fov: 48 },
      { t: 5.0, pos: [-1.4, 1.15, 13.0], look: [3.5, 0.95, 9.6], fov: 34 },
      { t: 7.2, pos: [-1.0, 1.4, 12.6], look: [-3.2, 1.0, 15.0], fov: 46, cut: true },
      { t: 10.0, pos: [-0.8, 1.5, 12.4], look: [-3.4, 1.1, 15.0], fov: 42 },
    ],
    actors: [{ t: 0, id: 'player', pos: [-3.4, 14.4], yaw: Math.PI * 0.82, anim: 'sit' }],
    lines: [
      { t: 0.6, who: 'sys', text: '（テレビは砂嵐。音を消しても、ざらざらした音が続く）', dur: 3.0 },
      { t: 4.4, who: 'sys', text: '（一瞬、知らない人の顔が映る。白衣。声はない）', dur: 2.6 },
      { t: 7.4, who: 'dan', text: '……今の、誰？', dur: 2.0 },
      { t: 9.6, who: 'dan', text: 'あの子に電話……つながらない。……探しに行くしかないわね', dur: 3.0 },
    ],
    events: [
      { t: 4.3, do: 'tv', arg: 'face' }, { t: 5.6, do: 'tv', arg: 'static' },
      { t: 12.6, do: 'setStep', arg: 'ch1_katana' }, { t: 12.6, do: 'chapterCard', arg: 'ch1' },
    ],
    sounds: [{ t: 4.3, s: 'tv_blip' }],
  },
  // 第1章：裏路地で相棒と再会。帰路の一人が知り合いの店主だと気づく
  cs01_reunion: {
    id: 'cs01_reunion', area: 'alley', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [3.0, 1.6, -22.4], look: [6.0, 0.8, -19.8], fov: 46 },
      { t: 3.5, pos: [3.6, 1.5, -21.6], look: [5.6, 1.0, -20.0], fov: 40 },
      { t: 6.0, pos: [7.4, 1.6, -22.6], look: [4.6, 1.3, -21.4], fov: 44, cut: true },
      { t: 14.0, pos: [7.0, 1.7, -22.8], look: [4.4, 1.3, -21.6], fov: 42 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [3.6, -22.0], yaw: 0.9 },
      { t: 0, id: 'companion', pos: [6.0, -19.7], yaw: Math.PI, mode: 'scripted', anim: 'hide', show: true },
      { t: 2.6, id: 'companion', to: [5.0, -21.3], anim: 'idle' },
      { t: 3.0, id: 'player', yaw: 1.5 },
    ],
    lines: [
      { t: 0.6, who: 'companion', text: 'だんのうらさん……！', dur: 2.0 },
      { t: 2.8, who: 'dan', text: 'アンタ、こんな所に。けがは？', dur: 2.2 },
      { t: 5.2, who: 'companion', text: '大丈夫です。……さっきの人、喫茶「灯」の坂口さんでした。毎晩、この道を通って帰るんです', dur: 3.6 },
      { t: 9.0, who: 'dan', text: '……そう。じゃあ、道を開けてあげなきゃね', dur: 2.4 },
      { t: 11.6, who: 'companion', text: '一緒に行きます。……一人で待つほうが、怖いので', dur: 2.6 },
    ],
    events: [{ t: 14.0, do: 'companionFollow' }, { t: 14.0, do: 'flag', arg: 'reunited' }],
  },
  // 第1章の終わり：避難所の放送が同じ文で途切れる
  cs01_broadcast: {
    id: 'cs01_broadcast', area: 'plaza', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-13.0, 1.7, 1.5], look: [2, 1.5, 0], fov: 50 },
      { t: 4.0, pos: [-10.0, 2.2, 3.5], look: [14.5, 4.6, 8.3], fov: 40 },
      { t: 9.0, pos: [-9.0, 2.0, 4.0], look: [14.5, 4.9, 8.3], fov: 26 },
      { t: 10.5, pos: [-14.0, 1.6, 1.4], look: [-16.6, 1.3, -0.4], fov: 48, cut: true },
      { t: 15.0, pos: [-13.6, 1.7, 1.6], look: [-16.4, 1.3, -0.2], fov: 46 },
    ],
    actors: [{ t: 0, id: 'player', pos: [-15.6, -0.2], yaw: Math.PI / 2 }, { t: 0, id: 'companion', pos: [-16.6, 0.8], yaw: Math.PI / 2 }],
    lines: [
      { t: 1.0, who: 'pa', text: '（放送）避難者の皆さんは、市民体育館へ……', dur: 2.6 },
      { t: 4.0, who: 'pa', text: '（放送）避難者の皆さんは……', dur: 2.0 },
      { t: 6.4, who: 'pa', text: '（放送）避難者の皆さんは……', dur: 2.0 },
      { t: 9.0, who: 'sys', text: '（放送は、同じところで途切れた）', dur: 1.6 },
      { t: 10.8, who: 'companion', text: '……同じところで、止まってる', dur: 2.2 },
      { t: 13.0, who: 'dan', text: '体育館、ね。……行ってみましょ', dur: 2.0 },
    ],
    events: [{ t: 15.0, do: 'flag', arg: 'plaza_broadcast' }, { t: 15.0, do: 'setStep', arg: 'ch2_shelter' }, { t: 15.0, do: 'chapterCard', arg: 'ch2' }],
    sounds: [{ t: 0.8, s: 'pa_chime' }, { t: 1.0, s: 'pa_voice' }, { t: 4.0, s: 'pa_voice' }, { t: 6.4, s: 'pa_voice' }, { t: 8.6, s: 'pa_cut' }],
  },
  // 第2章：収容者が起き上がる（点呼）
  cs02_boss: {
    id: 'cs02_boss', area: 'shelter', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.5, 1.7, 2.5], look: [0, 1.0, -5], fov: 50 },
      { t: 3.0, pos: [0.3, 1.4, 0.8], look: [0, 0.8, -5], fov: 44 },
      { t: 5.0, pos: [-3.5, 0.8, -1.5], look: [0, 1.6, -5.2], fov: 52, cut: true },
      { t: 9.5, pos: [-4.5, 0.9, -0.5], look: [0, 2.3, -5.0], fov: 56 },
      { t: 11.0, pos: [1.2, 2.4, 3.6], look: [0, 1.6, -4.6], fov: 50, cut: true },
      { t: 15.0, pos: [1.6, 2.6, 4.4], look: [0, 1.6, -4.6], fov: 54 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0.3, 2.6], yaw: Math.PI },
      { t: 0, id: 'companion', pos: [-1.2, 4.0], yaw: Math.PI, mode: 'scripted' },
      { t: 12.2, id: 'companion', to: [-8.9, 3.8], run: true },
    ],
    lines: [
      { t: 0.8, who: 'pa', text: '（放送）点呼を、はじめます', dur: 2.2 },
      { t: 3.2, who: 'pa', text: '（放送）……いち……に……さん……', dur: 2.0 },
      { t: 5.6, who: 'pa', text: '（放送）……よんじゅう……よんじゅう……', dur: 2.4 },
      { t: 8.4, who: 'companion', text: 'あれ……胸に、名札', dur: 2.0 },
      { t: 11.2, who: 'dan', text: '下がってなさい。……アタシが相手よ', dur: 2.4 },
    ],
    events: [{ t: 5.0, do: 'bossRise' }, { t: 4.8, do: 'gymFlicker' }, { t: 15.0, do: 'bossWake' }, { t: 15.0, do: 'setStep', arg: 'ch2_boss' }, { t: 15.0, do: 'companionFollow' }],
    sounds: [{ t: 0.6, s: 'pa_chime' }, { t: 0.8, s: 'pa_voice' }, { t: 3.2, s: 'pa_voice' }, { t: 5.0, s: 'boss_rise' }, { t: 5.6, s: 'pa_voice' }],
  },
  cs02_end_rescue: {
    id: 'cs02_end_rescue', area: 'shelter', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [2.5, 1.5, -1.0], look: [0, 1.0, -5], fov: 48, follow: 'boss' }, { t: 9, pos: [3.2, 1.7, 0.0], look: [0, 0.9, -5], fov: 44, follow: 'boss' }],
    lines: [
      { t: 0.8, who: 'pa', text: '（放送）……はい', dur: 2.0 },
      { t: 3.0, who: 'companion', text: '……返事、しましたね', dur: 2.2 },
      { t: 5.4, who: 'dan', text: '名前を呼ばれるのを、ずっと待ってたのね。……おやすみなさい', dur: 3.2 },
    ],
    events: [{ t: 9.2, do: 'endCard' }],
  },
  cs02_end_neutral: {
    id: 'cs02_end_neutral', area: 'shelter', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [9.5, 1.6, 1.0], look: [14.4, 2.0, -4.1], fov: 48 }, { t: 9, pos: [10.0, 1.7, 1.8], look: [14.4, 2.0, -4.1], fov: 44 }],
    lines: [
      { t: 0.8, who: 'pa', text: '（シャッターの向こうで）……よんじゅう……に……', dur: 2.4 },
      { t: 3.4, who: 'companion', text: '閉じ込めて……よかったんでしょうか', dur: 2.2 },
      { t: 5.8, who: 'dan', text: '今は、これしかできないわ。……あとで、ちゃんと迎えに来ましょ', dur: 3.0 },
    ],
    events: [{ t: 9.2, do: 'endCard' }],
  },
  cs02_end_kill: {
    id: 'cs02_end_kill', area: 'shelter', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [2.5, 1.4, -1.0], look: [0, 0.4, -5], fov: 48, follow: 'boss' }, { t: 8, pos: [2.0, 1.2, -2.0], look: [0, 0.1, -5], fov: 40, follow: 'boss' }],
    lines: [
      { t: 1.4, who: 'companion', text: '……名札だけ、残ってる', dur: 2.2 },
      { t: 4.0, who: 'dan', text: '……ごめんなさいね', dur: 2.2 },
    ],
    events: [{ t: 8.2, do: 'endCard' }],
  },
};
// 第3章（病院・地下通路）
Object.assign(CUTSCENES, CUTSCENES3, CUTSCENES4);
