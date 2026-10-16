// 第3章「見た目」の演出場面（CUTSCENE_SPEC の形）。座標は病院（hospital）・地下通路（tunnel）の区画の座標。台詞は【仮】、fixed:true だけが【原文・確定】。
// 原文の台詞「見た目だけで決めつけちゃ駄目ってことかしらね」は、だんのうらが第3章で 1 回だけ言う（cs03_line）。相棒が同じ台詞を言うのは第4章（未実装）で、ここには無い。
// だんのうらは男性。白い姿は化け猫としての本来の姿で、性格・記憶は同じ（暴走ではない）。白い姿を相棒に見せる場面は第4章（ここでは見せない）。
export const LINE_CH3 = '見た目だけで決めつけちゃ駄目ってことかしらね';

export const CUTSCENES3 = {
  // 病院に着く
  // フェーズ10：最初の 3 秒は外（正面玄関と車寄せ・病院の外観）→ 自動ドアを入ってロビーへ（台詞と出来事は同じ。時刻だけ 3 秒うしろへ）
  cs03_hospital: {
    id: 'cs03_hospital', area: 'hospital', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [9.5, 2.8, 33.0], look: [0, 6.5, 19.8], fov: 54 },
      { t: 2.9, pos: [5.2, 2.1, 28.2], look: [0, 2.4, 19.8], fov: 46 },
      { t: 3.0, pos: [8.6, 2.6, 18.4], look: [-1.5, 1.0, 9.5], fov: 50, cut: true },
      { t: 9.5, pos: [6.6, 2.0, 17.2], look: [-1.0, 1.2, 8.0], fov: 44 },
      { t: 10.0, pos: [-1.2, 1.55, 15.2], look: [0.4, 1.45, 17.4], fov: 42, cut: true },
      { t: 14.5, pos: [-1.0, 1.6, 15.0], look: [0.3, 1.45, 17.3], fov: 40 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0.4, 24.6], yaw: Math.PI },
      { t: 0, id: 'companion', pos: [1.5, 25.8], yaw: Math.PI, mode: 'scripted', show: true },
      { t: 0.6, id: 'player', to: [0.3, 17.4], run: true }, { t: 0.9, id: 'companion', to: [1.2, 18.5], run: true },
      { t: 4.0, id: 'player', to: [0.2, 16.6] }, { t: 4.4, id: 'companion', to: [1.1, 17.6] },
      { t: 10.2, id: 'player', yaw: -2.36 },
    ],
    lines: [
      { t: 4.0, who: 'sys', text: '（病院のロビー。誰もいない。車いすだけが、ばらばらの向きで止まっている）', dur: 3.4 },
      { t: 7.6, who: 'companion', text: '……静かすぎますね', dur: 2.0 },
      { t: 10.4, who: 'dan', text: '受付に入院の記録があるはずよ。……アタシから離れないでね', dur: 2.8, expr: 'serious' },
      { t: 13.4, who: 'companion', text: 'はい', dur: 1.2 },
    ],
    events: [{ t: 0.1, do: 'expr', arg: { who: 'player', name: 'serious' } }, { t: 14.5, do: 'companionFollow' }, { t: 14.5, do: 'setStep', arg: 'ch3_lobby' }],
    sounds: [{ t: 3.4, s: 'drip_stand' }],
  },
  // 306 号室：子どものベッドの前に、大きな異形
  cs03_guard: {
    id: 'cs03_guard', area: 'hospital', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [2.4, 1.7, -14.6], look: [7.4, 1.4, -17.0], fov: 52 },
      { t: 4.0, pos: [3.4, 1.9, -15.2], look: [6.6, 2.0, -17.0], fov: 40 },
      { t: 4.6, pos: [11.3, 1.15, -15.2], look: [6.8, 1.6, -17.0], fov: 50, cut: true },
      { t: 8.6, pos: [11.2, 1.2, -15.3], look: [6.8, 1.9, -17.0], fov: 46 },
      { t: 9.0, pos: [3.6, 1.6, -15.0], look: [5.2, 1.5, -16.4], fov: 40, cut: true },
      { t: 13.0, pos: [3.4, 1.65, -14.9], look: [5.2, 1.6, -16.4], fov: 38 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [3.4, -16.0], yaw: Math.PI / 2 },
      { t: 0, id: 'companion', pos: [1.6, -15.2], yaw: Math.PI / 2, mode: 'scripted', show: true },
      { t: 0, id: 'mamori', pos: [6.6, -16.8], yaw: -Math.PI / 2 },
      { t: 0, id: 'child', anim: 'cower' },
      { t: 9.0, id: 'player', yaw: Math.PI / 2 },
    ],
    lines: [
      { t: 0.8, who: 'sys', text: '（ベッドの前に、背の高い患者が立っている。白い紙が、何枚も体に巻きついている）', dur: 3.2 },
      { t: 4.8, who: 'child', text: '…………', dur: 1.6 },
      { t: 6.6, who: 'companion', text: 'だんのうらさん、あの子……！', dur: 2.0 },
      { t: 9.2, who: 'dan', text: '……その子から、離れなさい', dur: 2.2, expr: 'angry' },
      { t: 11.6, who: 'mamori', text: '……しー……っ……', dur: 1.6 },
    ],
    events: [{ t: 9.0, do: 'expr', arg: { who: 'player', name: 'angry' } }, { t: 13.0, do: 'setStep', arg: 'ch3_guard' }, { t: 13.0, do: 'guardStart' }],
    sounds: [{ t: 0.2, s: 'heartbeat' }, { t: 4.6, s: 'heartbeat' }, { t: 11.6, s: 'kanja_voice' }],
  },
  // 模倣する影が来る（母の声を真似る）：大きな患者が窓の方を向く
  cs03_mimics: {
    id: 'cs03_mimics', area: 'hospital', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [4.2, 1.7, -14.4], look: [11.6, 1.8, -15.6], fov: 48 },
      { t: 3.4, pos: [4.6, 1.6, -14.6], look: [11.6, 1.6, -15.4], fov: 40 },
      { t: 3.8, pos: [8.8, 1.3, -14.4], look: [6.2, 2.0, -17.0], fov: 46, cut: true },
      { t: 7.4, pos: [8.6, 1.4, -14.6], look: [6.2, 2.1, -17.0], fov: 42 },
    ],
    actors: [{ t: 0.0, id: 'mamori', yaw: -Math.PI / 2 }, { t: 3.6, id: 'mamori', yaw: Math.PI / 2 }],
    lines: [
      { t: 0.6, who: 'mimic', text: '……ユウ……ママよ……開けて……', dur: 2.6 },
      { t: 3.6, who: 'child', text: 'ママ……？', dur: 1.4 },
      { t: 5.0, who: 'mamori', text: '……こないで……こないで……', dur: 2.0 },
      { t: 7.0, who: 'dan', text: '……アンタ、守ってたの？', dur: 2.0, expr: 'surprised' },
    ],
    events: [{ t: 0.1, do: 'spawnTwist' }, { t: 7.0, do: 'expr', arg: { who: 'player', name: 'surprised' } }, { t: 9.0, do: 'expr', arg: { who: 'player', name: 'serious' } }],
    sounds: [{ t: 0.6, s: 'mimic_voice' }, { t: 3.0, s: 'mimic_reveal' }],
  },
  // 真相（大きな患者は子どもを守っていた）：救った場合
  cs03_truth_rescue: {
    id: 'cs03_truth_rescue', area: 'hospital', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [3.8, 1.5, -15.0], look: [7.6, 1.0, -17.4], fov: 46 }, { t: 9, pos: [4.2, 1.4, -15.2], look: [7.6, 0.9, -17.4], fov: 40 }],
    actors: [
      { t: 0, id: 'player', pos: [4.6, -16.2], yaw: Math.PI / 2 }, { t: 0, id: 'companion', pos: [3.2, -15.4], yaw: Math.PI / 2, mode: 'scripted', show: true },
      { t: 2.6, id: 'child', to: [4.2, -15.8], anim: 'follow' }, { t: 3.0, id: 'companion', to: [3.8, -15.6] },
    ],
    lines: [
      { t: 0.6, who: 'sys', text: '（大きな患者は、ゆっくりとひざをつき、ベッドの前から体をどけた）', dur: 2.8 },
      { t: 3.6, who: 'child', text: 'ケイさん、ずっと「しーっ」ってしてくれてたの。……ママの声がしても、開けちゃだめって', dur: 3.6 },
      { t: 7.4, who: 'companion', text: 'もう大丈夫だよ。お姉さんと一緒にいよう', dur: 2.4 },
    ],
    events: [{ t: 0.2, do: 'expr', arg: { who: 'player', name: 'sad' } }, { t: 10.0, do: 'flag', arg: 'truth_seen' }],
  },
  // 真相：倒してしまった場合
  cs03_truth_kill: {
    id: 'cs03_truth_kill', area: 'hospital', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [3.8, 1.5, -15.0], look: [7.6, 0.8, -17.4], fov: 46 }, { t: 9, pos: [4.0, 1.3, -15.2], look: [7.4, 0.7, -17.4], fov: 40 }],
    actors: [
      { t: 0, id: 'player', pos: [4.6, -16.2], yaw: Math.PI / 2 }, { t: 0, id: 'companion', pos: [3.2, -15.4], yaw: Math.PI / 2, mode: 'scripted', show: true },
      { t: 2.6, id: 'child', to: [4.2, -15.8], anim: 'follow' }, { t: 3.0, id: 'companion', to: [3.8, -15.6] },
    ],
    lines: [
      { t: 0.6, who: 'sys', text: '（ベッドの前に、白紙の記録だけが落ちている）', dur: 2.6 },
      { t: 3.4, who: 'child', text: 'ケイさん……ケイさんは、ママの声から守ってくれてたのに……', dur: 3.4 },
      { t: 7.0, who: 'dan', text: '……アタシ、何を見てたのかしら', dur: 2.4, expr: 'sad' },
      { t: 9.6, who: 'companion', text: '……行きましょう。この子を、安全な所へ', dur: 2.4 },
    ],
    events: [{ t: 0.2, do: 'expr', arg: { who: 'player', name: 'sad' } }, { t: 12.0, do: 'flag', arg: 'truth_seen' }],
  },
  // CS-03「見た目だけで」：子どもを相棒に預けたあと、だんのうらが言う【原文・確定】
  cs03_line: {
    id: 'cs03_line', area: 'hospital', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [5.9, 1.66, -16.95], look: [1.0, 1.05, -15.8], fov: 44 },
      { t: 3.6, pos: [5.8, 1.64, -16.9], look: [0.6, 1.0, -15.8], fov: 40 },
      { t: 4.0, pos: [4.05, 1.56, -15.92], look: [5.0, 1.49, -16.3], fov: 32, cut: true },
      { t: 9.0, pos: [4.1, 1.57, -15.95], look: [5.0, 1.49, -16.3], fov: 29 },
      { t: 9.4, pos: [3.2, 1.5, -15.0], look: [1.6, 1.25, -15.9], fov: 40, cut: true },
      { t: 12.4, pos: [3.1, 1.5, -15.0], look: [1.6, 1.25, -15.9], fov: 38 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [5.0, -16.3], yaw: -Math.PI / 2 },
      { t: 0, id: 'companion', pos: [3.6, -15.7], yaw: -Math.PI / 2, mode: 'scripted', show: true },
      { t: 0, id: 'child', pos: [3.6, -16.2], anim: 'follow' },
      { t: 0.6, id: 'companion', to: [1.6, -15.9] }, { t: 0.6, id: 'child', to: [1.6, -16.4] },
      { t: 9.6, id: 'companion', yaw: Math.PI / 2 },
    ],
    lines: [
      { t: 4.6, who: 'dan', text: LINE_CH3, dur: 3.6, fixed: true, expr: 'calm' },
      { t: 9.8, who: 'companion', text: '……そうですね', dur: 2.0, expr: 'smile' },
    ],
    events: [{ t: 4.0, do: 'expr', arg: { who: 'player', name: 'calm' } }, { t: 9.8, do: 'expr', arg: { who: 'companion', name: 'smile' } }, { t: 12.4, do: 'flag', arg: 'child_saved' }, { t: 12.4, do: 'setStep', arg: 'ch3_down' }, { t: 12.4, do: 'childFollow' }, { t: 12.4, do: 'companionFollow' }],
    sounds: [{ t: 9.0, s: 'pa_cut' }],
  },
  // 地下通路へ
  cs03_tunnel: {
    id: 'cs03_tunnel', area: 'tunnel', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [1.4, 2.3, -4.0], look: [0, 1.2, 1.4], fov: 48 }, { t: 7, pos: [1.0, 2.0, -3.0], look: [0, 1.2, 1.0], fov: 42 }],
    actors: [{ t: 0, id: 'player', pos: [0, 0.6], yaw: Math.PI }, { t: 0, id: 'companion', pos: [0.8, 1.8], yaw: Math.PI, mode: 'scripted', show: true }, { t: 0, id: 'child', pos: [1.3, 2.2], anim: 'follow' }, { t: 0.5, id: 'player', to: [0, -0.6] }, { t: 0.7, id: 'companion', to: [0.7, 0.6] }, { t: 0.7, id: 'child', to: [1.2, 1.0] }],
    lines: [
      { t: 0.8, who: 'companion', text: '地下、こんなに長いんですね', dur: 2.0 },
      { t: 3.0, who: 'dan', text: '避難所の下まで続いてるはずよ。……何か聞こえても、アタシから離れないで', dur: 3.2, expr: 'serious' },
      { t: 6.4, who: 'child', text: '……うん', dur: 1.0 },
    ],
    events: [{ t: 7.4, do: 'companionFollow' }, { t: 7.4, do: 'childFollow' }, { t: 7.4, do: 'setStep', arg: 'ch3_tunnel' }],
  },
  // 分かれ道の広場：二人を詰所へ。影が、だんのうらの形を写す
  cs03_boss: {
    id: 'cs03_boss', area: 'tunnel', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-3.2, 2.5, -22.8], look: [8.8, 1.4, -28.2], fov: 50 },
      { t: 6.4, pos: [-2.4, 2.2, -23.6], look: [8.8, 1.6, -28.2], fov: 44 },
      { t: 6.8, pos: [2.2, 1.35, -27.6], look: [0, 1.4, -35.2], fov: 48, cut: true },
      { t: 12.6, pos: [1.6, 1.5, -28.6], look: [0, 2.2, -35.2], fov: 52 },
      { t: 13.0, pos: [-1.0, 1.6, -26.6], look: [0, 1.55, -24.6], fov: 40, cut: true },
      { t: 16.4, pos: [-1.1, 1.6, -26.8], look: [0, 1.6, -24.6], fov: 38 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0, -24.6], yaw: Math.PI },
      { t: 0, id: 'companion', pos: [0.8, -23.2], yaw: Math.PI, mode: 'scripted', show: true }, { t: 0, id: 'child', pos: [1.4, -23.4], anim: 'follow' },
      { t: 3.0, id: 'companion', to: [11.2, -28.6], run: true, hideAtEnd: true }, { t: 3.2, id: 'child', to: [11.0, -29.4], hideAtEnd: true, run: true },
      { t: 6.8, id: 'utsushimi', pos: [0, -35.2], yaw: 0, show: true },
      { t: 13.0, id: 'player', yaw: Math.PI },
    ],
    lines: [
      { t: 0.6, who: 'dan', text: '詰所に入って。シャッター、閉めるわよ', dur: 2.2, expr: 'serious' },
      { t: 2.9, who: 'companion', text: 'だんのうらさんは！？', dur: 1.6 },
      { t: 4.6, who: 'dan', text: 'アタシは平気。……すぐ迎えに行くわ', dur: 2.0 },
      { t: 7.4, who: 'sys', text: '（床の水たまりの影が集まって、立ち上がる。……だんのうらと同じ背丈、同じ帽子の影）', dur: 3.8 },
      { t: 13.4, who: 'dan', text: '……アタシの真似？　趣味が悪いわね', dur: 2.6, expr: 'angry' },
    ],
    events: [{ t: 6.2, do: 'refugeShutter', arg: 'down' }, { t: 7.0, do: 'bossRise3' }, { t: 16.4, do: 'bossWake3' }, { t: 16.4, do: 'setStep', arg: 'ch3_boss' }],
    sounds: [{ t: 6.2, s: 'shutter' }, { t: 7.0, s: 'boss_rise' }, { t: 9.4, s: 'mimic_reveal' }],
  },
  // 転機：影は化けの下の姿まで写そうとする。白い髪がにじむ（このあと選択）
  cs03_tenki: {
    id: 'cs03_tenki', area: 'tunnel', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [2.2, 1.5, -28.4], look: [0, 1.9, -34.6], fov: 46 },
      { t: 4.4, pos: [1.6, 1.6, -29.2], look: [0, 2.2, -34.6], fov: 40 },
      { t: 4.8, pos: [0.55, 1.55, -31.1], look: [0, 1.52, -30.0], fov: 32, cut: true },
      { t: 10.4, pos: [0.5, 1.55, -31.0], look: [0, 1.5, -30.0], fov: 28 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -30.0], yaw: Math.PI }, { t: 0, id: 'utsushimi', pos: [0, -34.8], yaw: 0 }],
    lines: [
      { t: 0.6, who: 'utsushimi', text: '……だんのうらさん……開けて……', dur: 2.4 },
      { t: 3.2, who: 'dan', text: 'その声を使わないで', dur: 1.8, expr: 'angry' },
      { t: 5.2, who: 'sys', text: '（影の頭に、猫の耳の形が生える。背に、長い尾の影。……化けの下の姿を、写している）', dur: 3.6 },
      { t: 9.0, who: 'dan', text: '……見えてるのね。アタシの、本当の姿', dur: 2.6, expr: 'serious' },
    ],
    events: [{ t: 7.0, do: 'whiteFlicker' }, { t: 9.0, do: 'expr', arg: { who: 'player', name: 'serious' } }],
    sounds: [{ t: 0.6, s: 'mimic_voice' }, { t: 7.0, s: 'heartbeat' }],
  },
  // 化けを解く（reveal の構え）。暴走ではない：静かに、本来の姿に戻るだけ
  cs03_transform: {
    id: 'cs03_transform', area: 'tunnel', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [0.5, 1.55, -31.0], look: [0, 1.5, -30.0], fov: 30 },
      { t: 2.8, pos: [0.4, 1.4, -31.4], look: [0, 1.45, -30.0], fov: 34 },
      { t: 3.2, pos: [2.6, 0.6, -31.8], look: [0, 1.2, -30.0], fov: 46, cut: true, ease: 'linear' },
      { t: 7.6, pos: [-2.4, 1.0, -31.4], look: [0, 1.3, -30.0], fov: 44, ease: 'linear' },
      { t: 8.0, pos: [0.45, 1.5, -30.95], look: [0, 1.53, -30.0], fov: 32, cut: true },
      { t: 12.0, pos: [0.42, 1.5, -30.92], look: [0, 1.53, -30.0], fov: 30 },
    ],
    actors: [{ t: 0, id: 'player', pos: [0, -30.0], yaw: Math.PI }],
    lines: [
      { t: 0.4, who: 'dan', text: '……しょうがないわね。誰も見てないうちに、終わらせましょ', dur: 2.6, expr: 'calm' },
      { t: 3.4, who: 'sys', text: '（紫の髪が、根元から白くほどけていく。猫の耳と、白い尾）', dur: 3.4 },
      { t: 8.4, who: 'dan', text: '怖がらせたら、ごめんなさいね。……でも、ここは通さないわ', dur: 3.4, expr: 'calm' },
    ],
    events: [{ t: 0.1, do: 'expr', arg: { who: 'player', name: 'calm' } }, { t: 3.3, do: 'transform', arg: 'white' }, { t: 5.2, do: 'formCard', arg: '白髪形態' }],
    sounds: [{ t: 3.2, s: 'transform' }],
  },
  // このまま、人として（secret の構え）。白がにじみかけて、戻る（見るのはプレイヤーだけ）
  cs03_suppress: {
    id: 'cs03_suppress', area: 'tunnel', letterbox: true, skippable: true,
    cam: [{ t: 0, pos: [0.5, 1.55, -31.0], look: [0, 1.5, -30.0], fov: 30 }, { t: 6.8, pos: [0.6, 1.5, -31.3], look: [0, 1.45, -30.0], fov: 34 }],
    actors: [{ t: 0, id: 'player', pos: [0, -30.0], yaw: Math.PI }],
    lines: [
      { t: 0.5, who: 'dan', text: '……駄目よ。あの子たちが、すぐそこにいるんだから', dur: 2.8, expr: 'serious' },
      { t: 3.8, who: 'dan', text: 'このまま、人として片づけるわ', dur: 2.4, expr: 'angry' },
    ],
    events: [{ t: 1.4, do: 'whiteFlicker' }, { t: 3.8, do: 'expr', arg: { who: 'player', name: 'angry' } }],
    sounds: [{ t: 1.4, s: 'heartbeat' }],
  },
  // 決着：シャッターが上がる前に、紫の姿へ戻る（相棒は白い姿を見ない）
  cs03_end: {
    id: 'cs03_end', area: 'tunnel', letterbox: true, skippable: true,
    cam: [
      { t: 0, pos: [-2.6, 1.6, -27.6], look: [0, 1.0, -33.0], fov: 46 },
      { t: 3.6, pos: [-2.0, 1.55, -28.0], look: [0, 1.4, -30.0], fov: 38 },
      { t: 4.0, pos: [3.2, 1.6, -26.4], look: [8.8, 1.3, -28.6], fov: 46, cut: true },
      { t: 11.0, pos: [3.0, 1.6, -26.6], look: [6.2, 1.3, -28.4], fov: 42 },
    ],
    actors: [
      { t: 0, id: 'player', pos: [0.4, -29.6], yaw: 2.4 },
      { t: 4.4, id: 'companion', pos: [10.6, -28.4], yaw: -Math.PI / 2, mode: 'scripted', show: true }, { t: 4.4, id: 'child', pos: [10.8, -29.2], anim: 'follow', show: true },
      { t: 5.4, id: 'companion', to: [6.6, -28.2], run: true }, { t: 5.6, id: 'child', to: [6.9, -28.9] },
      { t: 4.2, id: 'player', to: [4.2, -28.4] },
    ],
    lines: [
      { t: 0.6, who: 'dan', text: '……ちゃんと、帰りなさい', dur: 2.0, expr: 'calm' },
      { t: 2.6, who: 'dan', text: '（……戻らなきゃ）', dur: 1.4, cond: 'white' },
      { t: 6.0, who: 'companion', text: 'だんのうらさん！　大丈夫でしたか？', dur: 2.2 },
      { t: 8.4, who: 'dan', text: '待たせたわね。……さ、帰りましょ。避難所はこの上よ', dur: 2.6, expr: 'smile' },
      { t: 11.2, who: 'child', text: '……ありがとう', dur: 1.6 },
    ],
    events: [{ t: 2.4, do: 'revertWhite' }, { t: 4.2, do: 'refugeShutter', arg: 'up' }, { t: 12.8, do: 'flag', arg: 'tunnel_clear' }, { t: 12.8, do: 'companionFollow' }, { t: 12.8, do: 'childFollow' }, { t: 12.9, do: 'setStep', arg: 'ch3_end' }, { t: 13.0, do: 'endCard3' }],
    sounds: [{ t: 4.2, s: 'shutter' }],
  },
};
