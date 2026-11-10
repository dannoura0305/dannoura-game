// 演出場面のデータ（CUTSCENE_SPEC §2）。座標は各区画の座標。台詞の「仮：」は SCENARIO_FLOW・CUTSCENE_SPEC の仮台詞・本作の仮台詞。
// fixed:true（原文・確定）の台詞は、この試作の範囲（序章〜第2章）には出てこない（第3章以降）。
import { CUTSCENES3 } from './cutscenes3.js';
import { CUTSCENES4 } from './cutscenes4.js';
import { CUTSCENES5 } from './cutscenes5.js';
import { CUTSCENES6 } from './cutscenes6.js';
import { CUTSCENES7 } from './cutscenes7.js';
import { homeW } from '../data/town.js';
const HP = (x, y, z) => { const [wx, wz] = homeW(x, z); return [wx, y, wz]; };   // 家の中（ローカル）→ 住宅地の自宅
// 形：{ id, area, letterbox, skippable, cam:[{t,pos,look,fov,cut?}], lines:[{t,who,text,dur}], actors:[{t,id,pos?|to?,yaw?,run?,anim?}], events:[{t,do,arg}], sounds:[{t,s}] }
export const CUTSCENES = {
  // CS-00「明かりが消える」（序章）
  cs00_lightsout: {
    id: 'cs00_lightsout', area: 'shotengai', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.6, 2.0, -26.5], look: [-1.2, 1.4, -34], fov: 46 },
      { t: 2.0, pos: [0.4, 2.2, -27.5], look: [0, 2.6, -60], fov: 50 },
      { t: 8.0, pos: [0.3, 2.0, -30.5], look: [0.6, 1.6, -46], fov: 44 },
      { t: 9.2, pos: [0.3, 2.0, -30.7], look: [0.65, 1.55, -45.8], fov: 42 },
      { t: 9.25, shot: { shot: 'close', on: 'companion', from: 'kiro_t', side: -1, dist: 1.4 }, cut: true },   // 前：声だけで、誰が見つけたか分からなかった → 指さす（相棒）の寄り
      { t: 10.6, shot: { shot: 'close', on: 'companion', from: 'kiro_t', side: -1, dist: 1.25 } },
      { t: 10.65, pos: [0.3, 1.9, -30.9], look: [0.8, 1.42, -45.2], fov: 38, cut: true },                     // その指の先＝明かりの下の帰路
      { t: 11.9, pos: [0.3, 1.9, -31.0], look: [0.8, 1.4, -45], fov: 34 },
      { t: 12.2, pos: [-0.2, 1.7, -29.0], look: [-1.8, 1.3, -34], fov: 48, cut: true },
      { t: 15.0, pos: [0.2, 1.8, -28.0], look: [-1.2, 1.2, -36], fov: 50 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [-1.3, -32.4], yaw: -2.5 },
      { t: 0, id: 'companion', pos: [-2.5, -33.8], yaw: 0.6, mode: 'scripted' },
      { t: 0.8, id: 'companion', yaw: Math.PI, anim: 'warn' },
      { t: 3.6, id: 'companion', anim: 'idle' },
      { t: 8.6, id: 'kiro_t', pos: [0.9, -45.5], yaw: 0, show: true },
      { t: 9.1, id: 'companion', face: 'kiro_t', anim: 'warn' },
      { t: 12.4, id: 'companion', path: [[-3.2, -30.55], [-4.6, -30.55], [-10.5, -29.9]], run: true, anim: 'run', hideAtEnd: true },   // 脇道の口の「立入禁止」の柵の南の端を回って奥へ（前は柵を突き抜けた）
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
      { t: 0, pos: HP(-2.4, 1.3, 14.6), look: HP(-3.5, 0.98, 9.3), fov: 48 },
      { t: 5.0, pos: HP(-2.9, 1.15, 13.2), look: HP(-3.5, 0.98, 9.3), fov: 34 },
      { t: 7.2, pos: HP(-2.6, 1.4, 11.2), look: HP(-3.4, 0.95, 14.4), fov: 46, cut: true, tr: 'dissolve', trDur: 0.6 },   // P14：テレビ（奥の壁）とソファが向き合う
      { t: 10.0, pos: HP(-2.2, 1.5, 11.6), look: HP(-3.4, 1.05, 14.4), fov: 42 },
    ],
    actors: [{ t: 0, id: 'player', pos: homeW(-3.4, 14.35), yaw: Math.PI, anim: 'sit' }],
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
      { t: 0, shot: { shot: 'ots', on: 'companion', from: 'dan', side: 1, dist: 1.2, fov: 44 } },   // だんのうらの肩越しに、くぼみに隠れていた（相棒）
      { t: 2.7, shot: { shot: 'ots', on: 'companion', from: 'dan', side: 1, dist: 1.0, fov: 40 } },
      { t: 2.75, shot: { shot: 'close', on: 'dan', from: 'companion', side: -1, dist: 1.5 }, cut: true },   // 前：カメラがだんのうらの頭の中で、話す人が映らなかった
      { t: 5.0, shot: { shot: 'close', on: 'dan', from: 'companion', side: -1, dist: 1.35 } },
      { t: 5.1, pos: [7.4, 1.6, -22.6], look: [4.6, 1.3, -21.4], fov: 44, cut: true },
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
    // 前：カメラが床と収容者だけを映し、だんのうらと（相棒）が一度も画面に入らなかった（誰が・どこで、が分からない）。
    // 今：二人の背中ごしに体育館（成立）→ 起き上がる瞬間を下から → 名札に気づく（相棒）→ 前に出るだんのうら → 向き合う二人
    cam: [
      { t: 0, pos: [1.6, 1.85, 4.6], look: [-0.2, 1.0, -4.6], fov: 50 },
      { t: 4.6, pos: [1.2, 1.7, 3.9], look: [-0.1, 1.0, -4.8], fov: 44 },
      { t: 4.7, pos: [-3.5, 0.8, -1.5], look: [0, 1.6, -5.2], fov: 52, cut: true },
      { t: 8.0, pos: [-4.2, 0.85, -0.9], look: [0, 2.2, -5.0], fov: 55 },
      { t: 8.1, shot: { shot: 'close', on: 'companion', from: 'boss', dist: 1.45, side: -1 }, cut: true },
      { t: 10.6, shot: { shot: 'close', on: 'companion', from: 'boss', dist: 1.3, side: -1 } },
      { t: 10.7, shot: { shot: 'close', on: 'dan', from: 'boss', dist: 1.7 }, cut: true },
      { t: 13.0, shot: { shot: 'close', on: 'dan', from: 'boss', dist: 1.45 } },
      { t: 13.1, shot: { shot: 'back', on: 'dan', from: 'boss', dist: 2.0, h: 1.75 }, cut: true },
      { t: 15.0, shot: { shot: 'back', on: 'dan', from: 'boss', dist: 2.4, h: 1.85 } },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0.3, 2.6], yaw: Math.PI },
      { t: 0, id: 'companion', pos: [-1.2, 4.0], yaw: Math.PI, mode: 'scripted' },
      { t: 7.9, id: 'companion', anim: 'warn' },
      { t: 10.9, id: 'player', to: [0.3, 1.6] },
      { t: 12.0, id: 'companion', anim: 'idle' },
      { t: 12.2, id: 'companion', path: [[-7.4, -2.0], [-8.64, -2.0], [-8.64, 3.8]], run: true },   // 低い仕切りの切れ目（z −2.4〜−0.4）を通って陰へ（前は仕切りを突き抜けた）
    ],
    lines: [
      { t: 0.8, who: 'pa', text: '（放送）点呼を、はじめます', dur: 2.2 },
      { t: 2.8, who: 'pa', text: '（放送）……いち……に……さん……', dur: 2.0 },
      { t: 5.6, who: 'pa', text: '（放送）……よんじゅう……よんじゅう……', dur: 2.4 },
      { t: 8.4, who: 'companion', text: 'あれ……胸に、名札', dur: 2.0 },
      { t: 11.0, who: 'dan', text: '下がってなさい。……アタシが相手よ', dur: 2.4 },
    ],
    events: [{ t: 4.75, do: 'bossRise' }, { t: 4.5, do: 'gymFlicker' }, { t: 15.0, do: 'bossWake' }, { t: 15.0, do: 'setStep', arg: 'ch2_boss' }, { t: 15.0, do: 'companionFollow' }],
    sounds: [{ t: 0.6, s: 'pa_chime' }, { t: 0.8, s: 'pa_voice' }, { t: 2.8, s: 'pa_voice' }, { t: 4.75, s: 'boss_rise' }, { t: 5.6, s: 'pa_voice' }],
  },
  // 第2章の終わり（3 通り）。戦いの後は立ち位置が毎回ちがうので、カメラは人物に合わせる（shot）。
  // 前：カメラは体育館の決まった位置から床を映すだけで、だんのうらも（相棒）も画面に入らず、誰が話しているか分からなかった
  cs02_end_rescue: {
    id: 'cs02_end_rescue', area: 'shelter', letterbox: true, skippable: true,
    cam: [
      { t: 0, shot: { shot: 'two', on: 'dan', from: 'boss', h: 1.9, fov: 46 } },                      // 成立：だんのうらと、名前を呼ばれた収容者
      { t: 2.7, shot: { shot: 'close', on: 'boss', from: 'dan', dist: 2.6, fov: 40 } , cut: true, tr: 'dissolve', trDur: 0.5 },  // 「……はい」の主
      { t: 3.6, shot: { shot: 'close', on: 'boss', from: 'dan', dist: 2.2, fov: 38 } },
      { t: 3.8, shot: { shot: 'close', on: 'companion', from: 'dan', side: -1 }, cut: true },          // （相棒）
      { t: 6.0, shot: { shot: 'close', on: 'dan', from: 'boss', side: -1, dist: 1.6 }, cut: true },    // だんのうら：収容者へ
      { t: 9.2, shot: { shot: 'close', on: 'dan', from: 'boss', side: -1, dist: 1.3 } },
      { t: 9.4, shot: { shot: 'back', on: 'dan', from: 'boss', dist: 1.8 }, cut: true, tr: 'dissolve', trDur: 0.7 },   // 見送る背中
      { t: 11.2, shot: { shot: 'back', on: 'dan', from: 'boss', dist: 2.3, h: 1.8 } },
    ],
    actors: [
      { t: 0, id: 'player', face: 'boss' },
      { t: 0.2, id: 'companion', near: { id: 'dan', d: 1.3, side: -1, face: false }, mode: 'scripted', show: true },
      { t: 3.0, id: 'companion', face: 'boss' },
    ],
    lines: [
      { t: 1.0, who: 'pa', text: '（放送）……はい', dur: 2.2 },
      { t: 4.0, who: 'companion', text: '……返事、しましたね', dur: 2.2 },
      { t: 6.4, who: 'dan', text: '名前を呼ばれるのを、ずっと待ってたのね。……おやすみなさい', dur: 3.2 },
    ],
    events: [{ t: 11.2, do: 'endCard' }],
    outro: { kind: 'black', out: 0.9, hold: 0.2, in: 0.8 },
  },
  cs02_end_neutral: {
    id: 'cs02_end_neutral', area: 'shelter', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [9.5, 1.6, 1.0], look: [14.4, 2.0, -4.1], fov: 48 },                                    // 閉じたシャッター（向こうで数える声）
      { t: 3.0, pos: [10.0, 1.7, 1.8], look: [14.4, 2.0, -4.1], fov: 42 },
      { t: 3.2, shot: { shot: 'close', on: 'companion', from: [14.4, -4.1, 2.0], dist: 1.5 }, cut: true, tr: 'dissolve', trDur: 0.45 },
      { t: 5.6, shot: { shot: 'two', on: 'dan', from: 'companion', fov: 44 }, cut: true },
      { t: 9.2, shot: { shot: 'two', on: 'dan', from: 'companion', fov: 40, dist: 2.6 } },
    ],
    actors: [
      { t: 0, id: 'player', face: [14.4, -4.1] },
      { t: 0.2, id: 'companion', near: { id: 'dan', d: 1.3, side: 1, face: false }, mode: 'scripted', show: true },
      { t: 2.6, id: 'companion', face: [14.4, -4.1] },
      { t: 6.0, id: 'player', face: 'companion' },
    ],
    lines: [
      { t: 0.8, who: 'pa', text: '（シャッターの向こうで）……よんじゅう……に……', dur: 2.4 },
      { t: 3.6, who: 'companion', text: '閉じ込めて……よかったんでしょうか', dur: 2.2 },
      { t: 6.0, who: 'dan', text: '今は、これしかできないわ。……あとで、ちゃんと迎えに来ましょ', dur: 3.0 },
    ],
    events: [{ t: 9.4, do: 'endCard' }],
    outro: { kind: 'black', out: 0.9, hold: 0.2, in: 0.8 },
  },
  cs02_end_kill: {
    id: 'cs02_end_kill', area: 'shelter', letterbox: true, skippable: true,
    cam: [
      { t: 0, shot: { shot: 'back', on: 'dan', from: 'boss', dist: 2.0, h: 1.9 } },                      // 崩れていく収容者を見下ろす背中
      { t: 1.6, shot: { shot: 'close', on: 'companion', from: 'boss', dist: 1.5 }, cut: true, tr: 'dissolve', trDur: 0.5 },
      { t: 4.0, shot: { shot: 'close', on: 'dan', from: 'boss', dist: 1.5, side: -1 }, cut: true },
      { t: 7.6, shot: { shot: 'close', on: 'dan', from: 'boss', dist: 1.25, side: -1 } },
    ],
    actors: [
      { t: 0, id: 'player', face: 'boss' },
      { t: 0.2, id: 'companion', near: { id: 'dan', d: 1.3, side: 1, face: false }, mode: 'scripted', show: true },
      { t: 1.4, id: 'companion', face: 'boss' },
    ],
    lines: [
      { t: 1.8, who: 'companion', text: '……名札だけ、残ってる', dur: 2.2 },
      { t: 4.4, who: 'dan', text: '……ごめんなさいね', dur: 2.4 },
    ],
    events: [{ t: 8.2, do: 'endCard' }],
    outro: { kind: 'black', out: 0.9, hold: 0.2, in: 0.8 },
  },
};
// 第3章（病院・地下通路）
Object.assign(CUTSCENES, CUTSCENES3, CUTSCENES4, CUTSCENES5, CUTSCENES6, CUTSCENES7);
