// 終章（A 崩れた町／B 記録の間）と結末（A 見舞い／B 信頼）・家の場面（両ルート）の演出場面（CUTSCENE_SPEC の形）。
// 台詞は【仮】。原文【確定】は結末A の（相棒）の一言だけで、fixed:true・その間カメラはだんのうらの白い髪（CUTSCENE_SPEC CS-END-A）。
// 第3章・第4章の決め台詞は、ここには一度も書かない（三度目は言わない。言いたくなる所では（相棒）が名前を呼ぶ）。
// だんのうらは男性の化け猫（自分で知っている）。白い姿・巨大猫又は本来の姿で、性格も口調も同じ（オネェ言葉・ときどき富山弁）。
// 研究者は名前を出さない（九条とは別人・関係は伏せる）。配偶者に似た異形は戦わない・話さない・本人かは決めない。
// 娘は家の場面だけ（安全な所で再会）。secret の（相棒）は最後まで正体を知らない（白い髪を見せない）。
import { ABYSS, KIROKU, EPILOGUE } from '../data/ch7.js';
const P = Math.PI;
const E = EPILOGUE, HX = E.hospital.x;
// 結末A：見舞いのだんのうら（ベッドの方を向く）と、白い髪を映すカメラ（頭の後ろの上から、髪に寄る。顔ではなく髪）
const DAN_A = E.hospital.dan, BED = E.hospital.bed, YAW_A = Math.atan2(BED[0] - DAN_A[0], BED[1] - DAN_A[1]);
const FW = [Math.sin(YAW_A), Math.cos(YAW_A)];
export const HAIR_A = [DAN_A[0] - FW[0] * 0.04, 1.6, DAN_A[1] - FW[1] * 0.04];                          // 白い髪（頭の上から後ろ）
const HAIR_CAM = [DAN_A[0] - FW[0] * 1.05 + FW[1] * 0.25, 2.02, DAN_A[1] - FW[1] * 1.05 - FW[0] * 0.25];
const HAIR_CAM2 = [DAN_A[0] - FW[0] * 0.9 + FW[1] * 0.32, 1.98, DAN_A[1] - FW[1] * 0.9 - FW[0] * 0.32];
const HOME = E.home, ST = E.street, RF = E.refugeRoof, K = KIROKU;

export const CUTSCENES7 = {
  // ── 終章A：崩れた町に着く（白い姿・人の大きさ）。研究者の声（淵の底から）。（相棒）のメッセージ ──
  cs07a_arrive: {
    id: 'cs07a_arrive', area: 'abyss', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [3.0, 2.0, 52.0], look: [0, 6, -30], fov: 52 },
      { t: 6.0, pos: [2.0, 2.6, 48.0], look: [0, 12, -34], fov: 48 },
      { t: 6.2, pos: [1.2, 1.7, 37.4], look: [0, 1.55, 40.0], fov: 36, cut: true },
      { t: 11.4, pos: [1.1, 1.7, 37.6], look: [0, 1.55, 40.0], fov: 34 },
      { t: 11.6, pos: [-1.2, 1.9, 42.6], look: [0, 1.5, 40.0], fov: 40, cut: true },
      { t: 18.2, pos: [-1.0, 1.9, 42.4], look: [0, 1.5, 40.0], fov: 38 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 46.0], yaw: P }, { t: 0.3, id: 'player', to: [0, 40.0] }],
    lines: [
      { t: 0.6, who: 'sys', text: '（町の北が、抜け落ちていた。底の見えない淵。崩れた家や看板の欠片が、ゆっくり浮かんでいる）', dur: 3.6 },
      { t: 4.4, who: 'researcher2', text: '来たか。……ここが境界の底だ。ここなら、全部やり直せる', dur: 3.4 },
      { t: 8.0, who: 'dan', text: 'やり直す、ね。……アンタが崩したものを、アタシは直しに来たのよ', dur: 3.2, expr: 'serious' },
      { t: 11.8, who: 'sys', text: '（スマホが震える。（相棒）から：「病院の屋上に、みんな集まってます。灯りを持って。……待ってます」）', dur: 3.8 },
      { t: 15.8, who: 'dan', text: '……ええ。待ってなさい', dur: 2.2, expr: 'calm' },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 0.1, do: 'chapterCard', arg: 'ch7a' }, { t: 18.4, do: 'setStep', arg: 'ch7a_edge' }, { t: 18.5, do: 'edgeHint7' }],
    sounds: [{ t: 0.3, s: 'rumble' }, { t: 4.2, s: 'pa_voice' }, { t: 11.8, s: 'notify' }],
  },
  // 淵の縁：自分の意思で巨大猫又へ → 淵の底から境界を喰らうものが立ち上がる
  cs07a_boss: {
    id: 'cs07a_boss', area: 'abyss', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [1.3, 1.7, ABYSS.edge[1] - 2.4], look: [0, 1.55, ABYSS.edge[1]], fov: 36 },
      { t: 2.8, pos: [1.2, 1.7, ABYSS.edge[1] - 2.2], look: [0, 1.6, ABYSS.edge[1]], fov: 34 },
      { t: 3.0, pos: [14, 8, 48], look: [0, 6, 20], fov: 54, cut: true },
      { t: 6.0, pos: [15, 10, 50], look: [0, 8, 18], fov: 54 },
      { t: 6.2, pos: [18, 12, 30], look: [0, 18, -30], fov: 52, cut: true },
      { t: 13.8, pos: [16, 11, 28], look: [0, 22, -30], fov: 50 },
      { t: 14.0, pos: [1.4, 8.8, ABYSS.giantStart[1] - 9.4], look: [0, 8.9, ABYSS.giantStart[1] - 4.6], fov: 40, cut: true },
      { t: 18.0, pos: [1.3, 8.8, ABYSS.giantStart[1] - 9.2], look: [0, 8.9, ABYSS.giantStart[1] - 4.6], fov: 38 },
    ],
    actors: [{ t: 0, id: 'player', pos: [ABYSS.edge[0], ABYSS.edge[1]], yaw: P }],
    lines: [
      { t: 0.4, who: 'dan', text: '……もう一度だけ。今度も、アタシの意思で', dur: 2.4, expr: 'serious' },
      { t: 6.6, who: 'sys', text: '（淵の底から、翼のようなものが開く。記録のこまを重ねた翼。いくつもの目。胸に、黒い目）', dur: 3.8 },
      { t: 10.6, who: 'researcher2', text: '応答を、全部ここに集める。町も、記録も、あの日も——', dur: 3.2 },
      { t: 14.4, who: 'dan', text: '全部、飲み込ませないわよ', dur: 2.4, expr: 'angry' },
    ],
    events: [{ t: 3.0, do: 'giantGrow7' }, { t: 6.2, do: 'bossRise7' }, { t: 18.2, do: 'setStep', arg: 'ch7a_boss' }, { t: 18.2, do: 'bossWake7' }],
    sounds: [{ t: 3.0, s: 'transform' }, { t: 5.6, s: 'giant_roar' }, { t: 6.4, s: 'boss_rise' }, { t: 10.4, s: 'pa_voice' }],
  },
  // 体力 66%：町の人と（相棒）の支え（病院の屋上・灯り）。ここで（相棒）は決め台詞を言わない：名前を呼ぶ
  cs07a_support: {
    id: 'cs07a_support', area: 'abyss', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [8, 30, 64], look: [10, 12, 10], fov: 50 },
      { t: 5.6, pos: [12, 28, 60], look: [16, 14, 14], fov: 48 },
      { t: 5.8, pos: [RF.pos[0] - 3.4, RF.y + 1.7, RF.pos[1] + 1.8], look: [RF.pos[0], RF.y + 1.3, RF.pos[1] + 0.2], fov: 38, cut: true },
      { t: 12.6, pos: [RF.pos[0] - 3.1, RF.y + 1.7, RF.pos[1] + 1.6], look: [RF.pos[0], RF.y + 1.35, RF.pos[1] + 0.2], fov: 36 },
      { t: 12.8, pos: [20, 18, 40], look: [0, 12, 0], fov: 52, cut: true },
      { t: 17.0, pos: [18, 18, 36], look: [0, 16, -22], fov: 50 },
    ],
    actors: [{ t: 0, id: 'companion', pos: RF.pos, yaw: -P / 2, show: true, mode: 'scripted', anim: 'warn' }],
    lines: [
      { t: 0.4, who: 'sys', text: '（避難の灯から、小さな光が上がる。懐中電灯、スマホの画面、提灯）', dur: 3.2 },
      { t: 3.6, who: 'townsfolk', text: 'こっちは大丈夫だ！ 灯りを消すなよ！', dur: 2.4 },
      { t: 6.2, who: 'companion', text: '……だんのうらさん！', dur: 2.2, expr: 'sad' },
      { t: 8.6, who: 'companion', text: 'みんな、見てます。……あなたのこと、見てますから！', dur: 3.2 },
      { t: 13.0, who: 'dan', text: '……聞こえてるわよ。ちゃんと', dur: 2.4, expr: 'calm' },
      { t: 15.4, who: 'sys', text: '（灯りが重なる。翼の目が、まぶしそうにひるんだ）', dur: 2.2 },
    ],
    events: [{ t: 0.2, do: 'support7' }, { t: 15.4, do: 'supportHit7' }, { t: 17.2, do: 'companionHide7' }],
    sounds: [{ t: 0.2, s: 'chime' }, { t: 3.4, s: 'notify' }],
  },
  // 体力 33%：胸の淵の目が開く。配偶者に似た異形（本人かは決めない）が研究者の方を見る
  cs07a_spouse: {
    id: 'cs07a_spouse', area: 'abyss', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [6, 20, -2], look: [0, 21, -24], fov: 34 },
      { t: 7.2, pos: [5, 20.5, -4], look: [0, 21, -24], fov: 30 },
      { t: 7.4, pos: [13.2, 1.7, -7.6], look: [7.6, 2.2, -11.2], fov: 40, cut: true },
      { t: 14.2, pos: [12.8, 1.8, -7.2], look: [7.6, 2.6, -11.2], fov: 38 },
      { t: 14.4, pos: [1.4, 8.8, 9.0], look: [0, 12, -20], fov: 46, cut: true },
      { t: 19.6, pos: [1.2, 8.8, 9.6], look: [0, 14, -20], fov: 44 },
    ],
    actors: [],
    lines: [
      { t: 0.5, who: 'sys', text: '（胸の黒い目が開く。奥に、うずくまる人影が見える）', dur: 3.2 },
      { t: 3.8, who: 'researcher2', text: '……君は、延期しようと言った。私は、聞かなかった', dur: 3.4 },
      { t: 7.6, who: 'sys', text: '（淵の縁に、白い上着の人影が立っている。誰なのかは、分からない）', dur: 3.2 },
      { t: 11.0, who: 'sys', text: '（人影は、研究者の方を見ている）', dur: 2.6 },
      { t: 14.6, who: 'researcher2', text: '延期、すべき……', dur: 2.0 },
      { t: 16.8, who: 'dan', text: '最後まで言いなさい。……ここから、連れ出してからね', dur: 2.8, expr: 'serious' },
    ],
    events: [{ t: 0.1, do: 'spouseShow7' }, { t: 19.8, do: 'finalHint7' }],
    sounds: [{ t: 0.1, s: 'wave' }, { t: 3.6, s: 'pa_voice' }],
  },
  // 体力 0：淵の目が砕ける → 巨大猫又が中の研究者を引き上げる（倒さない・守る）→ 夜明け → 白い姿（人の大きさ）へ → 結末A
  cs07a_end: {
    id: 'cs07a_end', area: 'abyss', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [8, 16, -4], look: [0, 18, -26], fov: 46 },
      { t: 4.4, pos: [7, 15, -2], look: [0, 16, -26], fov: 44 },
      { t: 4.6, pos: [3.2, 1.2, 7.2], look: [0, 0.7, 4.0], fov: 40, cut: true },
      { t: 10.6, pos: [3.0, 1.3, 7.4], look: [0, 0.8, 4.0], fov: 38 },
      { t: 10.8, pos: [13.2, 1.7, -7.6], look: [7.6, 1.8, -11.2], fov: 40, cut: true },
      { t: 14.4, pos: [13.0, 1.7, -7.4], look: [7.6, 1.8, -11.2], fov: 38 },
      { t: 14.6, pos: [-2.4, 1.0, 6.4], look: [0, 0.7, 4.0], fov: 38, cut: true },
      { t: 17.8, pos: [-2.2, 1.0, 6.6], look: [0, 0.7, 4.0], fov: 36 },
      { t: 18.0, pos: [10, 20, 62], look: [0, 6, -20], fov: 50, cut: true },
      { t: 21.0, pos: [9, 18, 58], look: [0, 8, -20], fov: 48 },
      { t: 21.2, pos: [3.8, 1.6, 9.2], look: [1.0, 1.3, 5.0], fov: 40, cut: true },
      { t: 27.4, pos: [3.6, 1.6, 9.0], look: [1.0, 1.3, 5.0], fov: 38 },
    ],
    actors: [],
    lines: [
      { t: 0.6, who: 'sys', text: '（淵の目が砕ける。巨大猫又の前足が、奥の人影をそっとすくい上げた）', dur: 3.6 },
      { t: 4.8, who: 'researcher2', text: '……なぜ、助ける', dur: 2.4 },
      { t: 7.4, who: 'dan', text: 'アタシは、壊すために大きくなったんじゃないわ', dur: 3.0, expr: 'calm' },
      { t: 11.0, who: 'sys', text: '（淵の縁の人影が、もう一度だけ研究者を見る。そして、光の粒になってほどけていった）', dur: 3.4 },
      { t: 14.8, who: 'researcher2', text: '……延期、すべきだった。……すまない', dur: 2.8 },
      { t: 18.2, who: 'sys', text: '（淵が閉じていく。東の空が、少しだけ明るい）', dur: 2.6 },
      { t: 21.4, who: 'companion', text: '（電話）……みんな、無事です。……帰ってきてください', dur: 3.0 },
      { t: 24.6, who: 'dan', text: 'ええ。……帰るわ', dur: 2.4, expr: 'smile' },
    ],
    events: [{ t: 0.1, do: 'bossBreak7' }, { t: 4.6, do: 'researcherOut7' }, { t: 11.0, do: 'spouseFade7' }, { t: 18.0, do: 'pitClose7' }, { t: 21.2, do: 'exitGiant7' }, { t: 27.6, do: 'setStep', arg: 'ch7a_end' }, { t: 27.7, do: 'toEnding7', arg: 'A' }],
    sounds: [{ t: 0.1, s: 'glass_break' }, { t: 0.4, s: 'giant_roar' }, { t: 18.0, s: 'power_down' }, { t: 21.4, s: 'phone_ring' }],
  },

  // ── 終章B：記録の間に入る（紫の姿のまま・（相棒）と一緒＝正体は知らない） ──
  cs07b_arrive: {
    id: 'cs07b_arrive', area: 'kiroku', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [1.3, 2.0, 6.4], look: [0, 2.4, -8], fov: 54 },
      { t: 4.4, pos: [1.1, 2.2, 4.8], look: [0, 2.6, -8], fov: 52 },
      { t: 4.6, pos: [0.9, 1.75, K.boss.pos[1] + 2.0], look: [0, 1.6, K.boss.pos[1]], fov: 36, cut: true },
      { t: 14.8, pos: [0.8, 1.75, K.boss.pos[1] + 2.1], look: [0, 1.6, K.boss.pos[1]], fov: 34 },
      { t: 15.0, pos: [K.companionAt[0] + 1.8, 1.5, K.companionAt[1] - 2.0], look: [K.companionAt[0], 1.25, K.companionAt[1]], fov: 38, cut: true },
      { t: 17.4, pos: [K.companionAt[0] + 1.7, 1.5, K.companionAt[1] - 1.9], look: [K.companionAt[0], 1.25, K.companionAt[1]], fov: 36 },
      { t: 17.6, pos: [1.4, 1.7, -0.4], look: [0, 1.55, 2.0], fov: 36, cut: true },
      { t: 20.2, pos: [1.3, 1.7, -0.3], look: [0, 1.55, 2.0], fov: 34 },
      { t: 20.4, pos: [3.0, 2.0, 1.6], look: [0, 1.5, K.boss.pos[1]], fov: 44, cut: true },
      { t: 23.4, pos: [2.8, 2.0, 1.4], look: [0, 1.5, K.boss.pos[1]], fov: 42 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 4.6], yaw: P }, { t: 0.2, id: 'player', to: [0, 2.0] }, { t: 0, id: 'companion', pos: [0.8, 6.0], yaw: P, mode: 'scripted', show: true }, { t: 15.0, id: 'companion', to: K.companionAt, run: true }, { t: 0, id: 'kenkyusha', show: true, pos: K.boss.pos, yaw: 0 }],
    lines: [
      { t: 0.6, who: 'sys', text: '（丸い部屋。壁一面の画面が、同じ場面をくり返している。閉じていく扉。赤い警報）', dur: 3.8 },
      { t: 4.8, who: 'researcher2', text: 'ようこそ、設備屋さん。ここは私の記録の間だ。……何度でも、あの日に戻れる', dur: 3.8 },
      { t: 8.8, who: 'dan', text: '戻って、どうするの', dur: 1.8, expr: 'serious' },
      { t: 10.8, who: 'researcher2', text: '今度こそ、正しかったと証明する。……あの判断は、間違っていなかったと', dur: 3.8 },
      { t: 15.0, who: 'companion', text: '……あの人、ずっと同じ場面を見てる', dur: 2.4 },
      { t: 17.6, who: 'dan', text: '下がってて。操作卓の陰に。……前には出ないで', dur: 2.6, expr: 'serious' },
      { t: 20.4, who: 'researcher2', text: '証明できないものは、無いのと同じだ。……君の「異常」も', dur: 3.0 },
    ],
    events: [{ t: 0.1, do: 'chapterCard', arg: 'ch7b' }, { t: 0.2, do: 'ensurePurple7' }, { t: 23.6, do: 'setStep', arg: 'ch7b_boss' }, { t: 23.6, do: 'bossWake7b' }],
    sounds: [{ t: 0.3, s: 'alarm' }, { t: 4.6, s: 'pa_voice' }],
  },
  // 研究者が膝をつく → 画面が暗くなる → 最後のこまの人影 → 「君は……何者だ」→ 答えない（正体は見せない）→ 結末B
  cs07b_end: {
    id: 'cs07b_end', area: 'kiroku', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [4.0, 2.6, 0.0], look: [0, 2.8, -12], fov: 50 },
      { t: 3.8, pos: [3.6, 2.6, -0.4], look: [0, 3.0, -12], fov: 48 },
      { t: 4.0, pos: [1.2, 3.3, -14.4], look: [2.36, 3.4, -18.95], fov: 36, cut: true },
      { t: 7.8, pos: [1.3, 3.3, -14.6], look: [2.36, 3.4, -18.95], fov: 34 },
      { t: 8.0, pos: [1.0, 1.0, K.boss.pos[1] + 1.8], look: [0, 0.9, K.boss.pos[1]], fov: 38, cut: true },
      { t: 14.4, pos: [0.9, 1.0, K.boss.pos[1] + 1.9], look: [0, 0.9, K.boss.pos[1]], fov: 36 },
      { t: 14.6, pos: [0.6, 1.62, -3.6], look: [0, 1.55, -1.6], fov: 34, cut: true },
      { t: 17.0, pos: [0.55, 1.62, -3.55], look: [0, 1.55, -1.6], fov: 32 },
      { t: 17.2, pos: [5.0, 1.8, -12.0], look: [K.spouseAt[0], 1.5, K.spouseAt[1]], fov: 40, cut: true },
      { t: 20.8, pos: [4.8, 1.8, -12.2], look: [K.spouseAt[0], 1.5, K.spouseAt[1]], fov: 38 },
      { t: 21.0, pos: [1.6, 1.6, 1.2], look: [-0.8, 1.3, 3.4], fov: 42, cut: true },
      { t: 26.4, pos: [1.5, 1.6, 1.0], look: [-0.8, 1.3, 3.4], fov: 40 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -1.6], yaw: P }, { t: 0, id: 'kenkyusha', pos: K.boss.pos, yaw: 0 }, { t: 0, id: 'companion', pos: K.companionAt, yaw: P * 0.85, mode: 'scripted', show: true, anim: 'idle' }, { t: 20.8, id: 'companion', to: [-0.6, 2.6] }, { t: 20.8, id: 'player', pos: [0.2, 1.4], yaw: 0.2 }],
    lines: [
      { t: 0.6, who: 'sys', text: '（最後の記録装置が止まると、画面がひとつずつ暗くなった）', dur: 3.2 },
      { t: 4.0, who: 'sys', text: '（残った一枚の中で、ガラスの向こうの人影が、こちらを——研究者を見ている）', dur: 3.6 },
      { t: 8.0, who: 'researcher2', text: '……延期、すべきだった。分かっていたんだ。最初から', dur: 3.6 },
      { t: 12.0, who: 'researcher2', text: '君は……何者だ', dur: 2.4 },
      { t: 14.8, who: 'dan', text: 'ただの、保全屋よ', dur: 2.2, expr: 'calm' },
      { t: 17.4, who: 'sys', text: '（画面の人影が、ほどけるように消えた。誰だったのかは、記録に残っていない）', dur: 3.4 },
      { t: 21.2, who: 'companion', text: '……終わったんですか？', dur: 2.0 },
      { t: 23.4, who: 'dan', text: 'ええ。止まったわ。……帰りましょ。みんなの所へ', dur: 2.8, expr: 'smile' },
    ],
    events: [{ t: 0.2, do: 'screensOff7' }, { t: 4.0, do: 'spouseShow7b' }, { t: 15.0, do: 'whiteFlicker' }, { t: 20.0, do: 'spouseFade7' }, { t: 26.6, do: 'setStep', arg: 'ch7b_end' }, { t: 26.7, do: 'toEnding7', arg: 'B' }],
    sounds: [{ t: 0.2, s: 'power_down' }, { t: 4.0, s: 'tv_blip' }],
  },

  // ── 結末A「見舞い」：病院の個室（昼）。白と紫が混ざった髪。原文の一言の間、カメラは白い髪 ──
  cs_end_a: {
    id: 'cs_end_a', area: 'epilogue', letterbox: true, skippable: true, ending: 'end_reveal',
    cam: [
      { t: 0, pos: [HX + 2.6, 1.7, 2.9], look: [HX - 1.2, 0.9, -1.2], fov: 50 },
      { t: 6.0, pos: [HX + 2.4, 1.6, 2.6], look: [HX - 1.2, 0.9, -1.2], fov: 46 },
      { t: 6.2, pos: [BED[0] + 1.3, 1.25, BED[1] + 1.6], look: [BED[0], 1.1, BED[1] - 0.2], fov: 38, cut: true },
      { t: 12.8, pos: [BED[0] + 1.2, 1.25, BED[1] + 1.5], look: [BED[0], 1.1, BED[1] - 0.2], fov: 36 },
      { t: 13.0, pos: [DAN_A[0] + FW[0] * 0.9 - FW[1] * 0.3, 1.55, DAN_A[1] + FW[1] * 0.9 + FW[0] * 0.3], look: [DAN_A[0], 1.5, DAN_A[1]], fov: 36, cut: true },
      { t: 18.6, pos: [DAN_A[0] + FW[0] * 0.85 - FW[1] * 0.28, 1.55, DAN_A[1] + FW[1] * 0.85 + FW[0] * 0.28], look: [DAN_A[0], 1.5, DAN_A[1]], fov: 34 },
      // 原文の一言：白い髪を映す（顔ではなく髪。相棒の声だけが聞こえる）
      { t: 18.8, pos: HAIR_CAM, look: HAIR_A, fov: 34, cut: true, hair: true },
      { t: 24.0, pos: HAIR_CAM2, look: HAIR_A, fov: 31, hair: true },
      { t: 24.2, pos: [HX + 2.2, 1.6, 2.4], look: [BED[0], 1.1, BED[1]], fov: 44, cut: true },
      { t: 33.0, pos: [HX + 2.0, 1.6, 2.2], look: [BED[0], 1.1, BED[1]], fov: 42 },
      { t: 33.2, pos: [HX + 0.1, 1.5, -0.2], look: [HX + 0.6, 1.75, -3.5], fov: 50, cut: true },
      { t: 38.0, pos: [HX + 0.2, 1.55, -0.8], look: [HX + 0.6, 1.75, -3.5], fov: 46 },
    ],
    actors: [{ t: 0, id: 'player', pos: DAN_A, yaw: YAW_A, anim: 'stand' }, { t: 0, id: 'companion', pos: BED, yaw: 0, show: true, mode: 'scripted', anim: 'bed' }],
    lines: [
      { t: 0.8, who: 'sys', text: '（数日後。病院の個室。昼の光）', dur: 2.6 },
      { t: 3.6, who: 'dan', text: '具合、どう？ ……リンゴ、むいてきたわ', dur: 2.8, expr: 'smile' },
      { t: 6.6, who: 'companion', text: '……まだ、怒ってますからね', dur: 2.6 },
      { t: 9.4, who: 'companion', text: '怖かったです。大きなあなたが、町の上にいて。……瓦礫が落ちてきて', dur: 3.6 },
      { t: 13.2, who: 'dan', text: '……ごめんなさい。言い訳は、しないわ', dur: 2.8, expr: 'sad' },
      { t: 16.2, who: 'sys', text: '（窓の外で、商店街を直す音がする）', dur: 2.4 },
      { t: 19.0, who: 'companion', text: 'でも、あの後……みんなを助けてくれたんですよね', dur: 4.6, fixed: true, hair: true },
      { t: 24.4, who: 'dan', text: '……ええ', dur: 1.6, expr: 'calm' },
      { t: 26.2, who: 'companion', text: '髪、まだ戻らないんですね。……誰にも言いませんよ。前にも、そう言いましたけど', dur: 3.8, expr: 'smile' },
      { t: 30.2, who: 'dan', text: 'ふふ。……アンタには、かなわないわね', dur: 2.6, expr: 'smile' },
      { t: 33.4, who: 'sys', text: '（窓の外：足場の組まれた商店街。青いシートの向こうで、店の看板が直されていく）', dur: 3.8 },
    ],
    events: [{ t: 0.0, do: 'epiMood7', arg: 'day' }, { t: 0.0, do: 'mixedHair7' }, { t: 0.1, do: 'chapterCard', arg: 'enda' }, { t: 38.2, do: 'toHome7', arg: 'A' }],
    sounds: [{ t: 16.2, s: 'knock' }],
  },
  // ── 結末B「信頼」：元に戻りつつある商店街（夕方）。（相棒）は何も知らない。紫の髪だけを映す ──
  cs_end_b: {
    id: 'cs_end_b', area: 'epilogue', letterbox: true, skippable: true, ending: 'end_secret',
    cam: [
      { t: 0, pos: [ST.x + 3.2, 2.4, -6], look: [ST.x, 1.6, 8], fov: 50 },
      { t: 6.0, pos: [ST.x + 2.8, 2.2, -3.4], look: [ST.x, 1.5, 8], fov: 48 },
      { t: 6.2, pos: [ST.x + 1.6, 1.6, ST.companion[1] - 2.2], look: [ST.x + 0.2, 1.5, ST.companion[1]], fov: 38, cut: true },
      { t: 17.4, pos: [ST.x + 1.5, 1.6, ST.companion[1] - 2.0], look: [ST.x + 0.2, 1.5, ST.companion[1]], fov: 36 },
      { t: 17.6, pos: [ST.x + 0.2, 1.85, ST.dan[1] - 2.2], look: [ST.x - 0.1, 1.55, ST.dan[1] + 6], fov: 40, cut: true, purpleHair: true },
      { t: 22.0, pos: [ST.x + 0.1, 1.85, ST.dan[1] - 1.4], look: [ST.x - 0.1, 1.6, ST.dan[1] + 6], fov: 36, purpleHair: true },
    ],
    actors: [{ t: 0, id: 'player', pos: [ST.dan[0], ST.dan[1] - 6], yaw: 0 }, { t: 0.2, id: 'player', to: ST.dan }, { t: 0, id: 'companion', pos: [ST.companion[0], ST.companion[1] - 6], yaw: 0, show: true, mode: 'scripted', anim: 'idle' }, { t: 0.2, id: 'companion', to: ST.companion },
      { t: 6.0, id: 'player', yaw: P / 2 }, { t: 6.0, id: 'companion', yaw: -P / 2 }, { t: 17.4, id: 'player', yaw: 0 }, { t: 17.4, id: 'companion', yaw: 0 }, { t: 17.6, id: 'player', to: [ST.dan[0], ST.dan[1] + 1.2] }, { t: 17.6, id: 'companion', to: [ST.companion[0], ST.companion[1] + 1.2] }],
    lines: [
      { t: 0.6, who: 'sys', text: '（数日後。夕方の商店街。足場の向こうで、店の灯りがひとつずつ戻っていく）', dur: 3.6 },
      { t: 4.4, who: 'companion', text: '喫茶「灯」、来週から開けるそうですよ', dur: 2.4, expr: 'smile' },
      { t: 6.9, who: 'dan', text: 'よかったわ。あそこのナポリタン、好きなのよ', dur: 2.6, expr: 'smile' },
      { t: 9.6, who: 'companion', text: '……あの夜、ずっと思ってたんです', dur: 2.4 },
      { t: 12.2, who: 'companion', text: 'あなたがいてくれて、よかった', dur: 2.6, expr: 'smile' },
      { t: 15.0, who: 'dan', text: '……アタシもよ。一人じゃ、帰ってこられなかったわ', dur: 2.6, expr: 'calm' },
      { t: 17.8, who: 'sys', text: '（二人の後ろ姿。紫の髪が、夕方の風にゆれる）', dur: 3.4 },
    ],
    events: [{ t: 0.0, do: 'epiMood7', arg: 'dusk' }, { t: 0.0, do: 'ensurePurple7' }, { t: 0.1, do: 'chapterCard', arg: 'endb' }, { t: 22.2, do: 'toHome7', arg: 'B' }],
    sounds: [{ t: 0.4, s: 'chime' }],
  },
  // ── 家の場面（両ルート）：娘と再会（安全な家で）。千代さん。町は直りつつある → スタッフロール ──
  cs_end_home_a: homeScene('A'),
  cs_end_home_b: homeScene('B'),
};

function homeScene(r) {
  const x = HOME.x, D = HOME.door, C = HOME.child;
  const lines = [
    { t: 0.6, who: 'sys', text: '（その夜。家の灯り）', dur: 2.2 },
    { t: 2.8, who: 'chiyo', text: 'おかえり。ずっと、待っとったよ', dur: 2.4 },
    { t: 5.4, who: 'daughter_home', text: 'パパ！', dur: 1.6 },
    { t: 7.2, who: 'dan', text: 'ただいま。……遅くなって、ごめんね', dur: 2.8, expr: 'smile' },
    { t: 10.2, who: 'daughter_home', text: 'おそと、もう むらさきじゃないよ', dur: 2.6 },
    { t: 12.9, who: 'dan', text: 'そうね。町のみんなで、なおしてるところよ', dur: 2.8, expr: 'smile' },
  ].concat(r === 'A' ? [
    { t: 15.9, who: 'daughter_home', text: 'パパ、かみのけ しろいの まざってる', dur: 2.6 },
    { t: 18.6, who: 'dan', text: 'ふふ、ちょっと疲れちゃったのよ。……すぐ戻るわ', dur: 2.8, expr: 'smile' },
  ] : [
    { t: 15.9, who: 'daughter_home', text: '……あしたは、いっしょにごはん？', dur: 2.6 },
    { t: 18.6, who: 'dan', text: 'ええ、約束したもんね。今夜から、いっしょよ', dur: 2.8, expr: 'smile' },
  ]).concat([
    { t: 21.6, who: 'dan', text: 'お腹すいたけ？ ……今夜は、あったかいもんにしよっか', dur: 2.8, expr: 'smile' },
    { t: 24.6, who: 'daughter_home', text: 'うん！', dur: 1.6 },
  ]);
  return {
    id: 'cs_end_home_' + r.toLowerCase(), area: 'epilogue', letterbox: true, skippable: true, route: r === 'A' ? 'reveal' : 'secret',
    cam: [
      { t: 0, pos: [x + 2.4, 1.6, -2.6], look: [x, 1.1, 2.4], fov: 48 },
      { t: 5.2, pos: [x + 2.2, 1.5, -2.4], look: [x, 1.0, 1.6], fov: 46 },
      { t: 5.4, pos: [x - 1.8, 1.1, -1.0], look: [x, 0.9, 1.0], fov: 44, cut: true },
      { t: 15.6, pos: [x - 1.6, 1.0, -0.6], look: [x, 0.8, 1.4], fov: 40 },
      { t: 15.8, pos: [x + 1.2, 0.9, -0.2], look: [x - 0.1, 0.8, 1.5], fov: 38, cut: true },
      { t: 21.4, pos: [x + 1.1, 0.9, 0.0], look: [x - 0.1, 0.8, 1.5], fov: 36 },
      { t: 21.6, pos: [x + 2.8, 1.9, -2.8], look: [x, 0.8, 0.6], fov: 50, cut: true },
      { t: 26.8, pos: [x + 2.6, 2.0, -2.6], look: [x, 0.8, 0.6], fov: 48 },
    ],
    actors: [{ t: 0, id: 'player', pos: D, yaw: P }, { t: 0.4, id: 'player', to: HOME.dan }, { t: 0, id: 'chiyo7', pos: HOME.chiyo, yaw: P * 0.8, show: true }, { t: 0, id: 'daughter7', pos: C, yaw: 0, show: true }, { t: 5.4, id: 'daughter7', to: [x, 1.22], run: true }, { t: 7.0, id: 'player', anim: 'hug' }],
    lines,
    events: [{ t: 0.0, do: 'epiMood7', arg: 'night' }, { t: 6.6, do: 'daughterHug7' }, { t: 27.0, do: 'credits7', arg: r }],
    sounds: [{ t: 0.2, s: 'door' }, { t: 24.6, s: 'chime' }],
  };
}

/** 対比の場面（両方の結末を見たあと・ギャラリー）：同じ病院の廊下を、左は白い髪、右は紫の髪のだんのうらが歩く。台詞なし（CS-BOTH・候補） */
export const CS_BOTH = { id: 'cs_both', sec: 9, provisional: true, lines: [] };
