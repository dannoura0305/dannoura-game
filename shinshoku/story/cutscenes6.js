// 第6章（A の続き：崩れた商店街 → 中央通りの塗替／B：中央管理棟）の演出場面（CUTSCENE_SPEC の形）。台詞はすべて【仮】。
// 原文の決め台詞（第3章のだんのうら・第4章の相棒の 2 回だけ）は、ここには書かない。結末A の原文も書かない（結末A を作るまで）。
// だんのうらは男性の化け猫（自分で知っている）。白い姿・巨大猫又は本来の姿（暴走は終わった＝自分の意思で大きくなる）。口調はいつものオネェ言葉。
// 娘は電話・留守電の声だけ（危ない所に出てこない）。研究者は声と影だけ（名前・顔を出さない。九条とは別人）。
// reveal：（相棒）は病院（正体を知っている・メッセージで送り出す）／secret：（相棒）は一緒（正体を知らない）。
const P = Math.PI;
export const CUTSCENES6 = {
  // ── 第6章A の続き：崩れた商店街へ（人の大きさ・白い姿）。娘の電話・（相棒）のメッセージ・置換の糸が見える ──
  cs06r_ruins: {
    id: 'cs06r_ruins', area: 'ruins', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [2.8, 1.9, 32.0], look: [0, 1.4, 24.0], fov: 52 },
      { t: 6.0, pos: [2.4, 1.8, 31.0], look: [0, 1.5, 22.0], fov: 48 },
      { t: 6.2, pos: [0.45, 1.62, 26.7], look: [0, 1.56, 28.0], fov: 34, cut: true },
      { t: 17.6, pos: [0.42, 1.62, 26.8], look: [0, 1.56, 28.0], fov: 32 },
      { t: 17.8, pos: [0.6, 2.0, 30.6], look: [0, 9.0, -40.0], fov: 50, cut: true },
      { t: 24.0, pos: [0.4, 2.1, 30.2], look: [0, 10.0, -40.0], fov: 46 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 30.5], yaw: P }, { t: 0.4, id: 'player', to: [0, 28.0] }],
    lines: [
      { t: 0.6, who: 'sys', text: '（暴走の跡。アーケードの屋根が落ち、看板が通りに散っている）', dur: 3.2 },
      { t: 3.8, who: 'dan', text: '……アタシが、やったのね。落ち込むのは、あとにするわ', dur: 2.6, expr: 'sad' },
      { t: 6.6, who: 'sys', text: '（スマホが震える。お隣の千代さんの番号）', dur: 2.0 },
      { t: 8.6, who: 'daughter', text: 'パパ？ ……おそと、むらさきいろ', dur: 2.2 },
      { t: 10.8, who: 'dan', text: '大丈夫よ。千代さんのそばにいてね。……すぐ帰るから', dur: 2.8, expr: 'smile' },
      { t: 13.6, who: 'daughter', text: 'うん。はやくね', dur: 1.6 },
      { t: 15.4, who: 'sys', text: '（（相棒）からメッセージ：「処置、終わりました。行ってください。だんのうらさんにしか、できないことですよね」）', dur: 3.6 },
      { t: 19.0, who: 'dan', text: '……ええ。行ってくるわ', dur: 1.8, expr: 'calm' },
      { t: 21.0, who: 'sys', text: '（目をこらすと、紫の糸が見える。北の光の柱から、町の灯りへ）', dur: 3.0 },
    ],
    events: [{ t: 0.0, do: 'ensureWhite' }, { t: 0.1, do: 'chapterCard', arg: 'ch6a' }, { t: 21.0, do: 'flag', arg: 'threads_seen6' }, { t: 24.2, do: 'setStep', arg: 'ch6a_threads' }],
    sounds: [{ t: 0.3, s: 'rumble' }, { t: 6.6, s: 'phone_ring' }, { t: 15.4, s: 'notify' }],
  },
  // 糸の元（3 つ目を切った）：光の柱が脈打つ。研究者の声（防災スピーカー）
  cs06r_source: {
    id: 'cs06r_source', area: 'ruins', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [3.2, 2.0, 22.0], look: [0, 11.0, -60.0], fov: 46 }, { t: 9.6, pos: [3.0, 2.2, 21.0], look: [0, 13.0, -60.0], fov: 42 }],
    actors: [],
    lines: [
      { t: 0.4, who: 'sys', text: '（三つ目の中継がほどけると、糸は北へ縮んでいった。光の柱が、大きく脈打つ）', dur: 3.2 },
      { t: 3.8, who: 'researcher', text: '糸を切ったか。……だが、元はここだ。見に来るといい', dur: 3.0 },
      { t: 7.0, who: 'dan', text: '言われなくても、行くわよ', dur: 2.0, expr: 'serious', cond: 'white' },
    ],
    events: [{ t: 9.8, do: 'setStep', arg: 'ch6a_avenue' }],
    sounds: [{ t: 0.2, s: 'wave' }, { t: 3.6, s: 'pa_voice' }],
  },
  // 中央通り：自分の意思で巨大猫又へ。光の柱の根もとから塗替が立ち上がる
  cs06a_boss: {
    id: 'cs06a_boss', area: 'avenue', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [5.0, 1.6, 44.0], look: [0, 2.0, 34.0], fov: 50 },
      { t: 3.4, pos: [5.4, 2.6, 46.0], look: [0, 5.0, 34.0], fov: 52 },
      { t: 3.6, pos: [8.0, 6.0, 52.0], look: [0, 8.0, 30.0], fov: 56, cut: true },
      { t: 7.4, pos: [9.0, 9.0, 54.0], look: [0, 9.0, 30.0], fov: 54 },
      { t: 7.6, pos: [14.0, 10.0, 26.0], look: [0, 16.0, -14.0], fov: 52, cut: true },
      { t: 14.6, pos: [12.0, 9.0, 24.0], look: [0, 18.0, -14.0], fov: 50 },
      { t: 14.8, pos: [1.4, 8.8, 24.6], look: [0, 8.9, 29.4], fov: 40, cut: true },
      { t: 19.0, pos: [1.3, 8.8, 24.8], look: [0, 8.9, 29.4], fov: 38 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, 34.0], yaw: P }],
    lines: [
      { t: 0.5, who: 'dan', text: '……今度は、アタシの意思で', dur: 2.4, expr: 'serious', cond: 'white' },
      { t: 7.8, who: 'sys', text: '（光の柱の根もとで、町の夜の物が寄り集まっていく。シャッター、街灯、電線、変圧器）', dur: 3.6 },
      { t: 11.4, who: 'researcher', text: '灯りは、人が毎晩見上げた記憶だ。塗り替えれば、戻る', dur: 3.2 },
      { t: 15.0, who: 'dan', text: '戻すんじゃない。塗りつぶしてるだけよ', dur: 2.6, expr: 'angry' },
    ],
    events: [{ t: 3.6, do: 'giantGrowAv6' }, { t: 7.6, do: 'bossRise6' }, { t: 19.2, do: 'setStep', arg: 'ch6a_boss' }, { t: 19.2, do: 'bossWake6' }],
    sounds: [{ t: 3.6, s: 'transform' }, { t: 6.6, s: 'giant_roar' }, { t: 7.8, s: 'boss_rise' }, { t: 11.2, s: 'pa_voice' }],
  },
  // 塗替が崩れる → 町の灯りが少し戻る → 白い姿（人の大きさ）へ → 研究者の声 → 最終章の入口
  cs06a_boss_end: {
    id: 'cs06a_boss_end', area: 'avenue', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [11.0, 17.0, 46.0], look: [0, 10.0, -10.0], fov: 54 },
      { t: 6.0, pos: [10.0, 15.0, 44.0], look: [0, 10.0, -10.0], fov: 52 },
      { t: 6.2, pos: [3.0, 1.8, 24.6], look: [0, 1.5, 20.0], fov: 44, cut: true },
      { t: 15.4, pos: [2.8, 1.8, 24.2], look: [0, 1.6, 20.0], fov: 40 },
      { t: 15.6, pos: [0.6, 2.0, 24.0], look: [0, 16.0, -80.0], fov: 46, cut: true },
      { t: 21.0, pos: [0.5, 2.1, 23.6], look: [0, 18.0, -80.0], fov: 42 },
    ],
    actors: [],
    lines: [
      { t: 0.6, who: 'sys', text: '（塗替がほどけ、シャッターと街灯が通りに落ちる。集合住宅の窓に、暖かい灯りが戻っていく）', dur: 3.6 },
      { t: 6.6, who: 'sys', text: '（巨大な姿がほどけ、白い姿のだんのうらが通りに立つ）', dur: 2.6 },
      { t: 9.4, who: 'researcher', text: '……壊すために生まれた体で、守るのか', dur: 2.6 },
      { t: 12.2, who: 'researcher', text: '最後の場所で待っている。光の柱の根もと、研究施設の奥だ', dur: 3.0 },
      { t: 15.8, who: 'dan', text: 'アンタの言う「取り戻す」が何なのか……聞かせてもらうわよ', dur: 3.2, expr: 'serious', cond: 'white' },
      { t: 19.2, who: 'sys', text: '（第6章A　巨躯　―― 終わり）', dur: 1.8 },
    ],
    events: [{ t: 0.1, do: 'bossCollapse6' }, { t: 3.0, do: 'pillarDim6' }, { t: 6.2, do: 'giantPose6', arg: { x: 0, z: 20, yaw: P } }, { t: 6.3, do: 'giantShrink' }, { t: 6.4, do: 'ensureWhite' }, { t: 21.2, do: 'setStep', arg: 'ch6a_fin' }, { t: 21.3, do: 'endCard6a' }],
    sounds: [{ t: 0.2, s: 'crash' }, { t: 3.0, s: 'rescue' }, { t: 6.3, s: 'revert' }, { t: 9.2, s: 'pa_voice' }],
  },

  // ── 第6章B：中央管理棟（（相棒）と一緒・正体は知らない） ──
  cs06s_arrive: {
    id: 'cs06s_arrive', area: 'admin', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [3.4, 1.8, 13.0], look: [0, 1.4, 20.5], fov: 48 },
      { t: 6.0, pos: [3.2, 1.8, 13.4], look: [0, 1.4, 18.0], fov: 46 },
      { t: 6.2, pos: [-1.0, 1.7, 19.0], look: [6.0, 1.1, 15.4], fov: 40, cut: true },
      { t: 13.6, pos: [-0.8, 1.7, 18.8], look: [6.0, 1.1, 15.4], fov: 38 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0, 21.2], yaw: P }, { t: 0, id: 'companion', pos: [0.9, 21.8], yaw: P, mode: 'scripted', show: true },
      { t: 0.4, id: 'player', to: [0, 17.6] }, { t: 0.8, id: 'companion', to: [1.0, 18.4] },
    ],
    lines: [
      { t: 0.6, who: 'sys', text: '（連絡橋の先、中央管理棟。受付の灯りはついているのに、人の気配が無い）', dur: 3.2 },
      { t: 4.0, who: 'companion', text: 'ここが、中央管理棟……', dur: 1.8 },
      { t: 6.4, who: 'sys', text: '（待合の長いすに、誰かが座っている。壁の時計を、何度も見上げている）', dur: 3.0 },
      { t: 9.6, who: 'companion', text: 'あの人も……？', dur: 1.4, expr: 'sad' },
      { t: 11.2, who: 'dan', text: '近づきすぎないで。待ってるだけなら、そっとしときましょ', dur: 2.6, expr: 'serious' },
    ],
    events: [{ t: 0.1, do: 'chapterCard', arg: 'ch6b' }, { t: 13.8, do: 'companionFollow' }, { t: 13.8, do: 'setStep', arg: 'ch6_s_monitor' }],
    sounds: [{ t: 0.4, s: 'door' }, { t: 6.4, s: 'chime' }],
  },
  // 保守扉が開く（時刻の矛盾を解いた）→ 留守電（娘の声：記憶）
  cs06s_door: {
    id: 'cs06s_door', area: 'admin', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [2.4, 1.8, -3.2], look: [0, 1.6, -7.0], fov: 46 }, { t: 5.4, pos: [2.2, 1.8, -3.4], look: [0, 1.8, -8.0], fov: 44 }, { t: 5.6, pos: [0.35, 1.62, -6.2], look: [0, 1.55, -5.2], fov: 34, cut: true }, { t: 14.0, pos: [0.32, 1.62, -6.25], look: [0, 1.55, -5.2], fov: 32 }],
    actors: [{ t: 0, id: 'player', pos: [0, -5.2], yaw: P }, { t: 0, id: 'companion', pos: [1.2, -4.2], yaw: P, mode: 'scripted', show: true }],
    lines: [
      { t: 0.4, who: 'companion', text: '時計がずれてたんですね……よく気づきましたね', dur: 2.4, expr: 'surprised' },
      { t: 2.9, who: 'dan', text: '設備屋の癖よ。記録と現場が合わない時は、まず時計を疑うの', dur: 2.6, expr: 'smile' },
      { t: 5.8, who: 'sys', text: '（ポケットのスマホに、留守電が一件。千代さんの番号から）', dur: 2.4 },
      { t: 8.4, who: 'daughter', text: 'パパ、おやすみ。……あしたは、いっしょにごはんね', dur: 2.8 },
      { t: 11.4, who: 'dan', text: '……ええ。約束よ', dur: 1.8, expr: 'calm' },
    ],
    events: [{ t: 0.2, do: 'openMdoor6' }, { t: 14.2, do: 'companionFollow' }, { t: 14.2, do: 'setStep', arg: 'ch6_s_rounds' }],
    sounds: [{ t: 0.2, s: 'door' }, { t: 5.8, s: 'notify' }],
  },
  // 隔離の手順で P-2 を止めた → 拡大が落ちる → 当直が現れる
  cs06s_isolate: {
    id: 'cs06s_isolate', area: 'admin', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-5.0, 2.4, -13.0], look: [-3.0, 0.9, -20.0], fov: 46 },
      { t: 3.8, pos: [-4.6, 2.3, -13.4], look: [-3.0, 0.9, -20.0], fov: 44 },
      { t: 4.0, pos: [-3.8, 2.2, -11.6], look: [8.0, 1.6, -14.0], fov: 48, cut: true },
      { t: 8.6, pos: [-3.6, 2.2, -11.8], look: [5.0, 1.8, -14.0], fov: 46 },
      { t: 8.8, pos: [2.2, 2.3, -13.4], look: [4.6, 2.1, -14.0], fov: 36, cut: true },
      { t: 16.4, pos: [2.3, 2.3, -13.5], look: [4.6, 2.1, -14.0], fov: 34 },
    ],
    actors: [{ t: 0, id: 'player', pos: [-1.6, -16.6], yaw: P }, { t: 0, id: 'companion', pos: [-0.6, -12.6], yaw: P, mode: 'scripted', show: true }, { t: 3.9, id: 'touchoku', pos: [11.0, -13.6], yaw: -P / 2, show: true }, { t: 4.2, id: 'touchoku', to: [4.6, -14.0] }],
    lines: [
      { t: 0.4, who: 'sys', text: '（P-2 のうなりが小さくなり、止まった。監視の画面の数字が下がっていく。拡大　出力 68% → 31%）', dur: 3.4 },
      { t: 4.2, who: 'touchoku', text: '……巡回の、時間だ。P-2 を止めたのは、誰だ', dur: 2.6 },
      { t: 7.0, who: 'dan', text: 'アタシよ。軸受がもう持たない。……アンタも分かってたんでしょ', dur: 3.0, expr: 'serious' },
      { t: 10.2, who: 'touchoku', text: '止めるな、と……言われている。引き継ぎが……まだだ', dur: 2.8 },
      { t: 13.2, who: 'dan', text: 'アンタは廊下に下がってて。……この人の巡回、アタシが終わらせる', dur: 3.0, expr: 'serious' },
    ],
    events: [{ t: 0.2, do: 'expandDown6' }, { t: 13.4, do: 'companionHide6' }, { t: 16.6, do: 'setStep', arg: 'ch6_s_boss' }, { t: 16.6, do: 'bossWake6s' }],
    sounds: [{ t: 0.2, s: 'power_down' }, { t: 3.9, s: 'steam' }],
  },
  // 当直の決着（救う／無力化／倒す：台詞の差は bark）→ 制御室が開く
  cs06s_after: {
    id: 'cs06s_after', area: 'admin', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [0, 2.6, -8.4], look: [2.0, 1.0, -16.0], fov: 48 }, { t: 8.2, pos: [0.4, 2.5, -9.0], look: [0, 1.6, -26.0], fov: 46 }],
    actors: [{ t: 0, id: 'companion', pos: [0, -8.0], yaw: P, mode: 'scripted', show: true }],
    lines: [
      { t: 0.5, who: 'sys', text: '（機械室が静かになる。制御室の扉の灯りが、赤から緑に変わった）', dur: 3.0 },
      { t: 3.8, who: 'companion', text: '……終わった、んですか', dur: 1.8 },
      { t: 5.8, who: 'dan', text: 'まだよ。制御室が開いたわ。拡大の元を止めないと', dur: 2.4, expr: 'serious' },
    ],
    events: [{ t: 0.2, do: 'openCdoor6' }, { t: 8.4, do: 'companionFollow' }, { t: 8.4, do: 'setStep', arg: 'ch6_s_control' }],
    sounds: [{ t: 0.4, s: 'end_signal' }],
  },
  // 制御装置を止めた：画面に人影（顔は見えない）・研究者の声。最終章（記録の間）の入口
  cs06s_control: {
    id: 'cs06s_control', area: 'admin', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [2.6, 2.0, -26.8], look: [0, 2.8, -32.0], fov: 46 },
      { t: 8.6, pos: [2.2, 2.0, -27.2], look: [0, 2.8, -32.0], fov: 42 },
      { t: 8.8, pos: [0.35, 1.62, -29.6], look: [0, 1.56, -28.6], fov: 34, cut: true },
      { t: 15.4, pos: [0.33, 1.62, -29.65], look: [0, 1.56, -28.6], fov: 32 },
      { t: 15.6, pos: [-2.4, 1.7, -25.6], look: [0.5, 1.4, -28.0], fov: 44, cut: true },
      { t: 22.4, pos: [-2.2, 1.7, -25.8], look: [0.5, 1.4, -28.0], fov: 42 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -28.6], yaw: P }, { t: 0, id: 'companion', pos: [1.4, -27.4], yaw: P, mode: 'scripted', show: true }],
    lines: [
      { t: 0.4, who: 'sys', text: '（拡大の出力を 0 まで下げ、主幹を切る。窓の外の紫の光が、町の縁で止まった）', dur: 3.4 },
      { t: 4.0, who: 'sys', text: '（大きな画面がひとりでにつく。逆光の人影。顔は見えない）', dur: 2.8 },
      { t: 6.9, who: 'researcher', text: '……止めたのか。保全の手つきだな。君は、何者だ', dur: 2.8 },
      { t: 9.9, who: 'dan', text: '通りすがりの、設備屋さんよ', dur: 2.0, expr: 'calm' },
      { t: 12.1, who: 'researcher', text: '記録の間で待っている。君の「異常」は……証明できないなら、無いのと同じだからな', dur: 3.4 },
      { t: 16.0, who: 'companion', text: '……機械の音だけで分かるなんて、すごいですね', dur: 2.4, expr: 'smile' },
      { t: 18.6, who: 'dan', text: '本職だもの。機械はね、ちゃんと聞いてあげれば、教えてくれるのよ', dur: 3.0, expr: 'smile' },
      { t: 21.8, who: 'sys', text: '（第6章B　制御　―― 終わり）', dur: 1.6 },
    ],
    events: [{ t: 0.2, do: 'expandOff6' }, { t: 4.0, do: 'screenOn6' }, { t: 15.6, do: 'screenOff6' }, { t: 22.6, do: 'setStep', arg: 'ch6_s_end' }, { t: 22.7, do: 'endCard6s' }],
    sounds: [{ t: 0.2, s: 'power_down' }, { t: 4.0, s: 'tv_blip' }, { t: 6.8, s: 'pa_voice' }],
  },
};
