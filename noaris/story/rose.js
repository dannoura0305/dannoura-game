/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 第一エリア「白薔薇の宮殿」試作ルート（仮の台本）  noaris/story/rose.js
   ・仕組みを確かめるための仮の文。人物の名前・掟・出来事は企画者と決めてから書き直す
   ・好感度：rose（白薔薇の貴族（仮））。選択肢 3 回 → GOOD 1・BAD 1・GAME OVER 1
   ・企画書の演出方針：精神崩壊を隠す。普段は冷静、ゲームオーバー直後に一瞬だけ表情が崩れる（#fx crack）
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const NA = root.NA;
  NA.scene('rose_01', [
    '#bgm rose',
    '#bg rose_gate',
    '#fx fadein',
    '扉を抜けると、白い薔薇の咲き誇る門の前だった。',
    '門の向こうに、月明かりを跳ね返す宮殿が建っている。どの窓にも灯りがともり、遠く円舞曲が聞こえた。',
    '#chara rose normal',
    'rose|――ようこそ、白薔薇の宮殿へ。',
    'rose|今宵も舞踏会が始まる。君の席は、もう用意してある。',
    'me|わたしの席……？ わたし、招かれた覚えは――',
    '?loop>=1 rose|……そうだったね。君はいつも、初めて来たような顔をする。',
    '?loop>=1 #face cold',
    '?loop>=1 rose|いや。何でもない。忘れてくれ。',
    '#face normal',
    'rose|この宮殿には、一つだけ掟がある。',
    'rose|零時の鐘が鳴り終わるまで、宮殿の外へ出てはならない。',
    'rose|守れるね？',
    '#choice',
    '- 差し出された手を取る => rose_02 +rose 2',
    '- 「先に、お庭を見てみたいです」 => rose_02 +rose 1 =garden',
    '- 「わたし、すぐに帰らないと」 => rose_02 =wantleave',
  ], { title: '白薔薇の宮殿' });

  NA.scene('rose_02', [
    '#bg rose_hall',
    '#chara rose normal',
    '?garden 庭を見たいと言うと、彼はほんの少し困ったように笑い、それでも窓辺から庭を見せてくれた。',
    '?wantleave 帰りたいと言っても、彼は答えなかった。ただ、掴んだ手を離さなかった。',
    '舞踏の間は、白い薔薇と蝋燭の光で満ちていた。',
    '踊る人々の顔は、どれもよく見えない。けれど、誰もが同じ曲を、同じ足取りで繰り返している。',
    '#cg rose_dance',
    'rose|曲が終わるまで、僕だけを見ていればいい。',
    'rose|そうすれば、何も君を傷つけない。',
    '#cg off',
    '#se bell',
    '遠くで、鐘が鳴り始めた。一つ、二つ――',
    '?loop>=1 （この鐘の音を、前にも聞いた。最後まで聞いてはいけない、と誰かが言っていた気がする）',
    '#choice',
    '- 彼の手を離さない => rose_03 +rose 2',
    '- 鐘の数を数える => rose_03 +rose 1',
    '?wantleave - 扉の外へ走る => rose_go',
    '?!wantleave - 鐘の音のする方へ、外へ出てみる => rose_go',
  ], { title: '舞踏の間' });

  NA.scene('rose_03', [
    '#bg rose_garden',
    '#chara rose normal',
    '鐘は十二回鳴って、止んだ。',
    '夜の庭に出ると、白い薔薇が月の色に染まっていた。',
    'rose|……掟を守ってくれて、ありがとう。',
    'rose|ねえ、{name}。ずっとここにいればいい。',
    'rose|この宮殿の中なら、時間は進まない。君は、何にも奪われない。',
    '#face sad',
    'rose|僕は、君を失いたくないんだ。',
    '#choice',
    '- 「……ここに、残ります」 => rose_bad',
    '- 「明日も、きっと会いに来ます」 => rose_04',
  ], { title: '夜の庭' });

  NA.scene('rose_04', [
    '#if rose>=3 => rose_good',
    '#face cold',
    'rose|……明日。',
    'rose|君は、明日が来ると信じているんだね。',
    '彼の声は穏やかだった。けれど、背後で門の閉まる音がした。',
    '#jump rose_bad',
  ]);

  NA.scene('rose_good', [
    '#bg rose_dawn',
    '#chara rose smile',
    '彼は長いこと黙っていた。それから、そっと微笑んだ。',
    'rose|……分かった。なら、僕は待とう。明日も、その次の夜も。',
    'rose|君が来ると言ったんだ。信じるよ。',
    '#cg rose_vow',
    '東の空が、薄く白み始めていた。この宮殿で、夜が明けるのを見るのは初めてだった。',
    '#cg off',
    '#chara cat',
    '門の外に、黒い猫が座っていた。猫はこちらを見て、安心したように目を細めた。',
    '#chara off',
    '#end good rose_good',
  ], { title: '夜明け' });

  NA.scene('rose_bad', [
    '#bg rose_cage',
    '#chara rose smile',
    '#bgm dark',
    'それから、どれくらいの夜が過ぎたのだろう。',
    '塔の部屋の窓からは、白い薔薇と、毎晩同じ舞踏会が見える。',
    '#cg rose_cage',
    'rose|大丈夫。ここにいれば、君は何も失わない。',
    'rose|明日なんて、来なくていい。',
    '部屋の扉に、鍵はかかっていない。けれど、外へ出る理由を、もう思い出せなかった。',
    '#cg off',
    '#end bad rose_bad',
  ], { title: '塔の部屋' });

  // ゲームオーバー：零時の鐘が鳴り終わる前に外へ出た
  NA.scene('rose_go', [
    '#bgm off',
    '#bg rose_garden',
    '#chara off',
    '扉を開けた瞬間、音が消えた。',
    '白い薔薇が、一斉に黒く枯れていく。足もとの石畳が、砂のように崩れた。',
    '#se bell',
    '十二回目の鐘が鳴った。',
    '#fx blackout',
    '#chara rose cold',
    'rose|――だから、言ったのに。',
    '#fx crack',
    '#chara off',
    '#gameover rose_go1',
  ], { title: '零時' });
})(typeof window !== 'undefined' ? window : globalThis);
