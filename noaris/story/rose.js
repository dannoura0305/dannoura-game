/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 第一ルート「白薔薇の宮殿」（初稿）  noaris/story/rose.js
   ・元：docs/noaris/route-rose.md（詳細仕様書・草案）。企画者が「とりあえず進めて」と言ったので、草案の【案】を仮の決定として書いた
   ・人物の名前など未確定の物は仮（主の本名は {w:rose_true}＝noaris/config.js の NA.WORDS）
   ・好感度：rose_love（愛情）・rose_will（意思）。結末：GOOD／NORMAL／BAD／ゲームオーバー 3 つ
   ・主は崩壊を隠す。崩れるのはゲームオーバー直後の一瞬だけ（#fx crack → #fx cateye）
   ・化け猫の正体は明かさない（黒猫・手袋・冷ました紅茶・「君が小さかった頃は――」・肖像画の日付）
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const NA = root.NA;

  // ── 序：白薔薇の門 ──
  NA.scene('rose_00', [
    '#bgm rose',
    '#bg rose_gate',
    '#fx fadein',
    '扉を抜けると、夜の匂いがした。',
    '白い薔薇の垣根が、月明かりの下でどこまでも続いている。その奥に、すべての窓に灯りをともした宮殿が建っていた。',
    '遠くで、円舞曲が鳴っている。',
    '#chara rose normal',
    '#cg rose_meet',
    '?loop==0 rose|――ようこそ、白薔薇の宮殿へ。',
    '?loop>=1 rose|――おかえり。',
    '?loop>=1 rose|……いや。ようこそ、と言うべきだったね。',
    '#cg off',
    '白い燕尾服の青年だった。銀に近い髪に、灰がかった紫の目。両手には、白い手袋をはめている。',
    'rose|今宵も舞踏会が始まる。君の席は、もう用意してある。',
    'me|わたしの、席……？',
    'rose|そう。君の席だ。ずっと前から。',
    'rose|さあ、手を。夜は短い。',
    '#choice',
    '- 差し出された手を取る => rose_00b +rose_love 2',
    '- 「先に、理由を聞かせてください」 => rose_00b +rose_love 1 +rose_will 1 =asked',
    '- 「……帰ります」 => rose_00c +rose_will 1 +rose_rule_broken 1',
  ], { title: '白薔薇の門' });

  NA.scene('rose_00c', [
    '振り返ると、さっき抜けてきたはずの扉が無かった。白い薔薇の垣根が、道をふさいでいる。',
    '#face cold',
    'rose|帰り道は、零時の鐘が鳴り終わるまで開かない。',
    'rose|それまでは、ここが君の居場所だ。',
    '#face normal',
    'rose|……怖がらせたなら、すまない。君を困らせたいわけじゃないんだ。',
    '#jump rose_00b',
  ]);

  NA.scene('rose_00b', [
    '?asked rose|理由は、いずれ話そう。今はただ、君がここにいてくれればいい。',
    '彼の手袋ごしの手は、驚くほど温かかった。',
    'rose|この宮殿には、いくつか掟がある。君の世話をする者が、教えてくれるだろう。',
    'rose|守ってくれるね？',
    '#jump rose_n1_01',
  ]);

  // ── 第一夜 ──
  NA.scene('rose_n1_01', [
    '#bg rose_room',
    '#chara maid normal',
    '通されたのは、白い薔薇の香りがする客室だった。ドレスが一着、寝台の上に広げてある。わたしの寸法に、ぴったりの。',
    'maid|お待ちしておりました。今夜から、お嬢様のお世話をいたします。',
    'maid|お召し替えの前に、宮殿の掟をお伝えいたしますね。',
    'maid|ひとつ。零時の鐘が鳴り終わるまで、宮殿の外へお出になってはなりません。',
    'maid|ふたつ。西の塔に上ってはなりません。',
    'maid|みっつ。旦那様の手袋に、お触れになってはなりません。',
    '#choice',
    '- 黙ってうなずく => rose_n1_02',
    '- 「どうして、そんな掟があるの？」 => rose_n1_01b +rose_will 1',
    '?loop>=1 - 「……零時の鐘、ですよね。知っています」 => rose_n1_01c +rose_will 1',
  ], { title: '第一夜' });

  NA.scene('rose_n1_01b', [
    '#face sad',
    'maid|……旦那様は、お嬢様を大切に思っておいでです。',
    'maid|以前にも――',
    '侍女は口をつぐみ、首を横に振った。',
    'maid|いいえ。何でもございません。さあ、お召し替えを。',
    '#jump rose_n1_02',
  ]);

  NA.scene('rose_n1_01c', [
    '#face sad',
    '侍女の顔から、さっと血の気が引いた。',
    'maid|……どうして、それを。',
    'maid|お嬢様は、今夜お越しになったばかりのはず……。',
    'わたしにも分からない。ただ、知っている。この部屋の匂いも、あのドレスの手触りも。',
    '#jump rose_n1_02',
  ]);

  NA.scene('rose_n1_02', [
    '#chara off',
    '#bg rose_hall',
    '舞踏の間は、白い薔薇と蝋燭の光で満ちていた。',
    '踊る人々の顔は、どれもよく見えない。けれど誰もが同じ曲を、同じ足取りで、楽しそうに繰り返している。',
    '#chara rose smile',
    'rose|よく似合っている。……そのドレスは、君のために仕立てたものだから。',
    'rose|一曲、付き合ってくれるかい？',
    '#cg rose_dance',
    '彼のリードは、まるでわたしの足の運びを最初から知っているかのようだった。',
    'くるりと回るたびに、天井のシャンデリアが流れ星みたいに滲む。',
    'rose|上手だね。――昔から、君は踊るのが好きだった。',
    'me|昔から……？',
    'rose|……そう見える、という意味だよ。',
    '#cg off',
    '#chara rose normal',
    'rose|ねえ。明日の夜も、こうして踊ってくれる？',
    '#choice',
    '- 「はい、喜んで」 => rose_n1_bell +rose_love 2',
    '- 「……明日、が来るなら」 => rose_n1_02b +rose_love 1 +rose_will 1',
  ]);

  NA.scene('rose_n1_02b', [
    '#face cold',
    '一瞬だけ、彼の顔から表情が消えた。',
    '#face normal',
    'rose|来るよ。……ここでは、毎晩。',
    '#jump rose_n1_bell',
  ]);

  NA.scene('rose_n1_bell', [
    '#se bell',
    '遠くで、鐘が鳴り始めた。ひとつ、ふたつ――',
    '踊っていた人々が、ぴたりと足を止める。誰も話さない。鐘の音だけが、大広間を満たしていく。',
    '?loop>=1 （この鐘を、最後まで聞いてはいけない。……違う。最後まで、外に出てはいけないんだ）',
    '#choice',
    '- 鐘の数を数える => rose_n1_end',
    '- 鐘の音のする方へ、外へ出てみる => rose_n1_stop',
  ]);

  NA.scene('rose_n1_stop', [
    '#chara maid sad',
    '扉に手をかけた瞬間、誰かに袖を強く引かれた。侍女だった。',
    'maid|いけません、お嬢様……！ 鐘が鳴り終わるまでは、決して。',
    'maid|お願いです。今夜だけは、旦那様に内緒にいたしますから。',
    '#add rose_rule_broken 1',
    '#chara off',
    '#jump rose_n1_end',
  ]);

  NA.scene('rose_n1_end', [
    '#bg rose_inner',
    '#chara rose normal',
    '鐘は十二回鳴って、止んだ。',
    '客室へ戻る回廊で、彼はわたしの少し前を歩いていた。',
    'rose|今夜はありがとう。よく眠って。',
    'rose|――おやすみ。また、今夜に。',
    'また、明日に――ではなく。そう言った気がした。',
    '#chara off',
    '#jump rose_n2_01',
  ]);

  // ── 第二夜 ──
  NA.scene('rose_n2_01', [
    '#bg rose_room',
    '#fx fadein',
    '目を覚ますと、窓の外は夜だった。',
    '寝台の上に、ドレスが一着広げてある。昨夜と同じ、わたしの寸法にぴったりの。',
    '#chara maid normal',
    'maid|お待ちしておりました。今夜から、お嬢様のお世話をいたします。',
    'me|……今夜から？ 昨日の夜も、あなたは同じことを――',
    'maid|お召し替えの前に、宮殿の掟をお伝えいたしますね。',
    '侍女は、昨夜とまったく同じ笑顔で、まったく同じ言葉を繰り返した。',
    '#chara off',
    '#bg rose_hall',
    '舞踏の間では、同じ人々が、同じ曲を、同じ足取りで踊っていた。',
    '?loop>=3 ……ただ、昨夜より一人だけ、踊る人が少ない気がした。',
    '#chara rose normal',
    'rose|今夜も来てくれたね。',
    '彼だけが、昨夜のことを覚えているようだった。',
    '#choice',
    '- 「同じ夜が、繰り返されている気がするんです」と打ち明ける => rose_n2_02a +rose_love 1 +rose_will 1',
    '- 侍女に、昨夜のことを尋ねに行く => rose_n2_02b +rose_will 1',
    '- 気づかないふりをして、踊る => rose_n2_03 +rose_love 1',
  ], { title: '第二夜' });

  NA.scene('rose_n2_02a', [
    'rose|……そうか。君は、気づいてしまうんだね。',
    'rose|この宮殿では、時間が少しだけ、ゆっくり流れる。それだけのことだよ。',
    'rose|怖がらなくていい。僕がそばにいる。',
    '彼はそう言って微笑んだ。けれど、その手袋の指先は、かすかに震えていた。',
    '#jump rose_n2_03',
  ]);

  NA.scene('rose_n2_02b', [
    '#chara maid normal',
    'maid|昨夜、でございますか？',
    'maid|お嬢様は、今夜お越しになったばかりでは……',
    '侍女は首をかしげ、それから、ふっと遠くを見るような目をした。',
    'maid|……いいえ。前にも、こんなふうにお尋ねになった方が、いらしたような。',
    '#chara rose normal',
    '#jump rose_n2_03',
  ]);

  NA.scene('rose_n2_03', [
    '#chara off',
    '#bg rose_garden',
    '曲の合間に、わたしは夜風にあたりたくて庭へ出た。鐘はまだ鳴っていない。',
    '白い薔薇の間を、黒い影が横切った。',
    '#chara cat',
    '#cg rose_cat',
    '黒い猫だった。宮殿の灯りを避けるように、門のそばに座ってこちらを見ている。',
    '#choice',
    '- しゃがんで、撫でようと手を伸ばす => rose_n2_04 +rose_cat 1 =cat_touch',
    '- そっと見送る => rose_n2_04 +rose_cat 1',
  ]);

  NA.scene('rose_n2_04', [
    '#cg off',
    '?cat_touch 指先が届く前に、猫はするりと身をかわし、門の外へ出ていった。',
    '?!cat_touch 猫は長いことわたしを見つめていた。それから、門の外へ出ていった。',
    '一度も、宮殿の中へは入ろうとしなかった。',
    '#chara rose normal',
    'rose|……猫が、いたのかい。',
    'rose|あれは宮殿には入れない。そういう決まりなんだ。',
    'その声は、なぜか少しだけ寂しそうだった。',
    '#jump rose_n2_bell',
  ]);

  NA.scene('rose_n2_bell', [
    '#bg rose_hall',
    '#se bell',
    '鐘が鳴り始めた。ひとつ、ふたつ――',
    '#choice',
    '- 鐘の数を数える => rose_n3_01',
    '- 鐘の音のする方へ、外へ出てみる => rose_go1',
  ]);

  // ── 第三夜 ──
  NA.scene('rose_n3_01', [
    '#bg rose_room',
    '#fx fadein',
    '目を覚ますと、窓の外は夜だった。寝台の上に、ドレスが一着。',
    '#chara maid normal',
    'maid|お待ちしておりました。今夜から――',
    '侍女の言葉は、もう最後まで聞かなくても分かった。',
    '#chara off',
    '#bg rose_hall',
    '踊りの輪の外で、顔の見えない二人の客がささやき合っていた。',
    'voice|西の塔には、花嫁がいるのですって。',
    'voice|ええ、ええ。旦那様の、大切な花嫁が。',
    '?end_rose_go2 （――知っている。あの塔の上に、何があるのか。わたしと同じ顔が、何十枚も）',
    '#choice',
    '?!end_rose_go2 - 西の塔へ、確かめに行く => rose_go2',
    '?end_rose_go2 - もう一度、塔へ上る => rose_go2',
    '- 彼に、塔のことを尋ねる => rose_n3_02 +rose_love 1 +rose_will 1 =asked_tower',
    '- 聞かなかったことにする => rose_n3_02',
  ], { title: '第三夜' });

  NA.scene('rose_n3_02', [
    '#bg rose_inner',
    '#chara rose normal',
    '?asked_tower rose|西の塔？ ……あそこは古いだけの場所だよ。床も傷んでいる。',
    '?asked_tower rose|君が怪我をしたら、僕は自分を許せない。だから掟にしたんだ。',
    '?asked_tower 彼は穏やかにそう言って、それきり塔の話はしなかった。',
    '回廊の小部屋で、彼は紅茶を淹れてくれた。',
    '彼は自分のカップにだけ、いつまでも口をつけない。湯気が消えるのを、じっと待っている。',
    'me|……熱いの、苦手なんですか？',
    'rose|昔からね。君が小さかった頃は――',
    'rose|……いや。何の話をしようとしたんだったかな。',
    '彼が言葉を探して視線を落とすと、白い手袋の指先が、カップの縁に触れていた。',
    '一度も外されたところを見たことのない、白い手袋。',
    '#choice',
    '- そっと、手袋に触れてみる => rose_n3_03 +rose_love -1 +rose_rule_broken 1',
    '- 触れずに、紅茶を飲む => rose_n3_04 +rose_love 1 =rose_glove',
  ]);

  NA.scene('rose_n3_03', [
    '#face cold',
    'rose|――触れるな！',
    '初めて聞く、鋭い声だった。カップが受け皿の上で鳴る。',
    '#face sad',
    'rose|……すまない。大きな声を出した。',
    'rose|お願いだ。それだけは、しないでくれ。',
    '彼の手は、まだわたしの指先のすぐそばにある。',
    '#choice',
    '- それでも、手を伸ばす => rose_go3',
    '- 手を引っ込めて、謝る => rose_n3_bell +rose_will -1',
  ]);

  NA.scene('rose_n3_04', [
    '#face smile',
    'rose|……ありがとう。',
    '?rose_love>=4 rose|君には、名前を教えておこうか。',
    '?rose_love>=4 rose|{w:rose_true}。――この宮殿で、その名を呼ぶ者は、もう誰もいないけれど。',
    '?rose_love>=4 #set rose_name 1',
    '?rose_love>=4 me|{w:rose_true}……さん。',
    '?rose_love>=4 rose|さん、は要らないよ。君には、そう呼ばれたい。',
    '#jump rose_n3_bell',
  ]);

  NA.scene('rose_n3_bell', [
    '#bg rose_hall',
    '#chara off',
    '#se bell',
    '鐘が鳴り始めた。ひとつ、ふたつ――',
    '#choice',
    '- 鐘の数を数える => rose_n4_01',
    '- 鐘の音のする方へ、外へ出てみる => rose_go1',
  ]);

  // ── 第四夜 ──
  NA.scene('rose_n4_01', [
    '#bg rose_dawn',
    '#fx fadein',
    'その夜、彼はわたしを舞踏の間ではなく、東のバルコニーへ連れ出した。',
    '空は、夜のまま。月は昨日と同じ高さで止まっている。',
    '#chara rose sad',
    'rose|ねえ、{name}。正直に話そう。',
    'rose|この宮殿では、時間が進まない。夜は明けないし、明日も来ない。',
    'rose|君がここにいる限り、何も君を奪えない。病も、事故も、運命も。',
    'rose|僕は――君を、失いたくないんだ。',
    '#choice',
    '- 「……わたしも、あなたを失いたくない」 => rose_n4_02 +rose_love 3',
    '- 「でも、閉じ込められたくはありません」 => rose_n4_02 +rose_love 1 +rose_will 2 =spoke_will',
  ], { title: '第四夜' });

  NA.scene('rose_n4_02', [
    '?spoke_will #face cold',
    '?spoke_will rose|閉じ込める……か。そうだね。君からは、そう見えるだろう。',
    '?!spoke_will #face smile',
    '?!spoke_will rose|……ありがとう。その言葉だけで、僕は何度でも――',
    '?!spoke_will 彼は言いかけて、口をつぐんだ。',
    '#face normal',
    'rose|ひとつだけ教えて。君は、この先にある明日が、怖くはないのかい。',
    'rose|明日の先に、何が待っていても？',
    'なぜだろう。その問いを、ずっと前から誰かにされていた気がした。',
    '#choice',
    '- 「怖いです。それでも、明日が見たい」 => rose_n4_bell +rose_will 2',
    '- 「ここでなら……怖くない気がします」 => rose_n4_bell +rose_love 1 +rose_will -2',
  ]);

  NA.scene('rose_n4_bell', [
    '#bg rose_hall',
    '#chara off',
    '#se bell',
    '鐘が鳴り始めた。ひとつ、ふたつ――',
    '#choice',
    '- 鐘の数を数える => rose_n5_01',
    '- 鐘の音のする方へ、外へ出てみる => rose_go1',
  ]);

  // ── 第五夜 ──
  NA.scene('rose_n5_01', [
    '?loop<3 #bgm rose',
    '?loop>=3 #bgm rose_slow',
    '#bg rose_hall',
    '#fx fadein',
    '最後の舞踏会――そう感じたのは、わたしだけだったのだろうか。',
    '同じ曲。同じ人々。同じ足取り。',
    '?loop>=3 円舞曲が、ほんの少しだけ遅い。踊る人々は、また一人減っていた。',
    '#chara rose normal',
    'rose|踊ろう、{name}。',
    '#cg rose_dance',
    '彼のリードは、初めての夜と少しも変わらなかった。',
    '#cg off',
    '#bg rose_garden',
    '曲が終わると、彼はわたしの手を取ったまま、白い薔薇の庭へ出た。',
    '?end_rose_bad （この庭を、塔の窓から見下ろしていたことがある。毎晩、毎晩。――そんなはずはないのに）',
    'rose|{name}。ずっと、ここにいればいい。',
    'rose|この宮殿の中なら、君は何にも奪われない。',
    '#face sad',
    'rose|お願いだ。僕のそばにいて。',
    '#choice',
    '- 「……ここに、残ります」 => rose_bad',
    '- 「明日も、きっと会いに来ます」 => rose_n5_02',
    '- 零時の鐘の前に、門の扉を開ける => rose_go1',
  ], { title: '第五夜' });

  NA.scene('rose_n5_02', [
    '#if rose_love>=9&rose_will>=5&rose_name => rose_good',
    '#if rose_will<5 => rose_bad',
    '#jump rose_normal',
  ]);

  // ── 結末 ──
  NA.scene('rose_good', [
    '#bgm rose',
    '#chara rose normal',
    '彼は長いこと黙っていた。',
    'rose|……明日、か。',
    'rose|君はいつも、そう言うんだね。',
    '#face smile',
    'rose|分かった。なら僕は、待とう。明日も、その次の夜も。',
    'rose|{w:rose_true}、と。もう一度だけ、呼んでくれるかい。',
    'me|{w:rose_true}。',
    '彼は右手の手袋を、ほんの少しだけずらした。指先は見えなかった。わたしの手を包むと、すぐに元へ戻してしまったから。',
    '#bg rose_dawn',
    '#cg rose_vow',
    '東の空が、薄く白み始めていた。この宮殿で夜が明けるのを、わたしは初めて見た。',
    '#cg off',
    '#chara cat',
    '門の外に、黒い猫が座っていた。猫はこちらを見て、安心したように目を細めた。',
    '#chara off',
    '手首の時計を見る。ずっと止まっていた日付が、一日だけ進んでいた。',
    '#end good rose_good',
  ], { title: '夜明け' });

  NA.scene('rose_normal', [
    '#chara rose normal',
    'rose|……そうか。',
    'rose|君の明日を、僕が止めることはできないね。',
    '彼はわたしの手を離し、門の扉を開けた。その先には、見覚えのある回廊が続いていた。',
    '#chara off',
    '#bg corridor',
    '振り返ると、もう宮殿は見えなかった。',
    '朝になると、白い宮殿のことは夢のようにぼやけていった。',
    'ただ、手のひらに、白い薔薇の花びらが一枚だけ残っていた。',
    '#end normal rose_normal',
  ], { title: '夢の舞踏会' });

  NA.scene('rose_bad', [
    '#bg rose_cage',
    '#chara rose smile',
    '#bgm dark',
    'それから、どれくらいの夜が過ぎたのだろう。',
    '塔の部屋の窓からは、白い薔薇の庭と、毎晩同じ舞踏会が見える。',
    '#cg rose_cage',
    'rose|大丈夫。ここにいれば、君は何も失わない。',
    'rose|明日なんて、来なくていい。',
    '部屋の扉に、鍵はかかっていない。けれど外へ出る理由を、わたしはもう思い出せなかった。',
    '#cg off',
    '#end bad rose_bad',
  ], { title: '塔の部屋' });

  // ── ゲームオーバー ──
  NA.scene('rose_go1', [
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
    '#fx cateye',
    '#chara off',
    '#gameover rose_go1',
  ], { title: '零時' });

  NA.scene('rose_go2', [
    '#bgm off',
    '#bg rose_tower',
    '#chara off',
    '螺旋の階段を、どこまでも上った。',
    '塔のいちばん上の部屋には、額縁が並んでいた。何十枚も、壁一面に。',
    '#cg rose_portraits',
    'どれも、白いドレスを着た娘の肖像画だった。',
    'どれも――わたしと、同じ顔をしていた。',
    '額の下に、日付が書き込まれている。どれも違う年。けれど、どれも同じ日。',
    'わたしの、誕生日の前の夜。',
    '最後の一枚だけ、額の中が空だった。',
    '#cg off',
    '#chara rose cold',
    'rose|……見てしまったね。',
    '#fx blackout',
    '#fx crack',
    '#fx cateye',
    '#chara off',
    '#gameover rose_go2',
  ], { title: '西の塔' });

  NA.scene('rose_go3', [
    '#bgm off',
    '指先が、白い手袋の縁にかかった。',
    '布がわずかにずれた、その瞬間――宮殿じゅうの灯りが、一斉に消えた。',
    '#bg void',
    '#chara off',
    '真っ暗な中で、彼の声だけが聞こえた。',
    'rose|……触れては、いけなかったんだ。',
    'rose|君にだけは、見せたくなかった。',
    '#fx crack',
    '#fx cateye',
    '#gameover rose_go3',
  ], { title: '手袋の下' });
})(typeof window !== 'undefined' ? window : globalThis);
