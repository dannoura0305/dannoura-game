/* ══════════════════════════════════════════════════════════
   kyokai/story/ch14.js — 最終章「月代町崩壊」＋ラストバトル「境界核」（担当D）
   混ざり合う場所 → 「後ろ」イベント（最大級のファンサービス：stream_room・コメント「後ろ」・振り返る・目が合う）
   → 境界核：シロと世界を切り分けるパズル＋三つの音のリズム（戦闘ではない）
     途中で、たくさんの「彼」の姿が流れる（本編で見たエンディングの姿は輪郭がくっきり）
   → 選択（戻る／残る・帰り道の確かめ方）→ endings.js
   本編UI侵食（§40）3回目。
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN14 = function (K) { return K.has('ch14') && !K.has('ch14_done'); };

  P2.stab = function (K) {
    try { var v = +(K.state && K.state.stability); return isFinite(v) ? v : 100; } catch (e) { return 100; }
  };
  P2.slipped = function (K) { var v = +K.get('slipped'); return isFinite(v) ? v : 0; };

  /* ── 混ざり合う月代町（危険度5） ── */
  P2.area('collapse', {
    name: '混ざり合う月代町', map: { x: .5, y: .5 }, danger: { A: 5, B: 5, C: 5 }, cond: function (K) { return IN14(K); },
    worlds: {
      A: { scene: 'collapse', spots: [
        { id: 'd14_station', x: .05, y: .3, w: .2, h: .35, label: '駅のホーム', acts: ['look', 'record'],
          on: {
            look: async function (K) { await K.say(['n:月代駅のホーム。けれど線路の先は、別の世界の小学校の廊下へつながっている。', 'n:時刻表の最終列車の欄、「2:17」の文字が脈打っている。']); K.flag('d14_v_station', true); },
            record: async function (K) { await K.say(['#se whistle', 'n:汽笛。すぐ近く。録音機の針が振り切れた。']); K.flag('d14_v_station', true); }
          } },
        { id: 'd14_sea', x: .3, y: .55, w: .22, h: .3, label: '海', acts: ['look', 'scan'],
          on: {
            look: async function (K) { await K.say(['n:商店街の路面が、途中から海になっている。月代町に海はない。', 'n:ナギの切符の行き先――「海浜公園」の看板が、波に半分沈んでいる。']); K.flag('d14_v_sea', true); },
            scan: async function (K) { await K.say(['t:境界反応 5.0／世界：B', 'p:ナギの世界の海だ。']); K.flag('d14_v_sea', true); }
          } },
        { id: 'd14_sky', x: .55, y: .05, w: .3, h: .22, label: '空に浮かぶ街', acts: ['look', 'photo'],
          on: {
            look: async function (K) { await K.say(['n:空に、逆さまの街が浮かんでいる。ガラスの塔、空を走る線路。', 'n:どの世界のものでもない。まだ観測されたことのない、どこか。']); K.flag('d14_v_sky', true); },
            photo: async function (K) { await K.say(['#se shutter', 'n:撮った写真には、空しか写っていなかった。']); K.flag('d14_v_sky', true); }
          } },
        { id: 'd14_factory', x: .7, y: .45, w: .24, h: .38, label: '工場の配管', acts: ['look', 'record'],
          on: {
            look: async function (K) { await K.say(['#scene factory_glimpse', 'n:配管。機械の唸り。油の匂い。前にシロを追って一瞬だけ見た工場だ。', 'n:点検表が貼ってある。日付の欄は「30」まで埋まっていて、その先は空白。', '#scene collapse A']); K.flag('d14_v_factory', true); },
            record: async function (K) { await K.say(['#se rec', 'n:モーターの唸りの奥に、誰かの鼻歌。すぐに途切れた。']); K.flag('d14_v_factory', true); }
          } },
        { id: 'd14_cam', x: .42, y: .3, w: .12, h: .14, label: '監視カメラ', acts: ['look'],
          on: { look: async function (K) {
            await P2.t444(K, 'collapse_cam', ['n:どの世界のものとも分からない監視カメラが、電柱に一つ。', 'n:その小さな画面に、私の後ろ姿が映っている。', 't:CAM 444', 'n:振り返る。誰もいない。'], { title: '崩壊のなかのカメラ', text: '混ざり合う月代町で、私の後ろ姿を映していた「CAM 444」。' });
          } } },
        { id: 'd14_door', x: .44, y: .5, w: .12, h: .3, label: '光の漏れる扉', acts: ['look'],
          cond: function (K) { return ['d14_v_station', 'd14_v_sea', 'd14_v_sky', 'd14_v_factory'].filter(function (f) { return K.has(f); }).length >= 3; },
          on: { look: async function (K) { K.flag('d14_door', true); await K.say(['n:瓦礫のあいだに、ドアが一枚だけ立っている。壁はないのに、隙間から、青白いモニターの光が漏れている。', 's:……きゅ。', 'n:シロが、珍しく足を止めた。']); } } },
      ] }
    }
  });

  /* ── 「後ろ」イベント ── */
  P2.backEvent = async function (K) {
    var b = P2.link().b30;
    await K.say([
      '#amb off', '#wait 900',
      'n:ドアを押す。',
      '#se whistle', '#wait 400',
      '#scene stream_room', '#amb room',
      'n:暗い部屋だった。',
      'n:机。モニター。マイク。モニターの光の手前に、椅子に座った誰かの背中。',
      'n:長い髪を後ろで一つに結んでいる。紫に見えるのは、モニターの光のせいだろうか。頭の上に、小さな帽子が乗っている。',
      'n:耳にかかった、めがねのつる。',
      'p:……あの人だ。',
      'n:こちらは境界のこちら側。向こうからは見えていない――はずだ。',
      'n:彼はマイクに向かって、小さな声で話している。ノイズはない。今夜は、ちゃんと聞こえる。',
      'd:……なーん、今日はちょっとだけ、怖い話するわね。',
      'd:最近ね、配信してると、誰かに見られとる気がするのよ。',
      'd:……やだ、自分で言っといて鳥肌立ったわ。',
    ].concat(K.has('saw_ad_name') ? ['n:月代駅の広告で、一枚だけ顔がノイズで見えなかった配信者。表示名を読もうとした瞬間に、景色が崩れた。……あの写真の、後ろ姿と同じだ。'] : [])
     .concat(b.study ? ['n:机の端で、付箋だらけの参考書が、モニターの光を受けている。'] : [])
     .concat(b.factory ? ['n:椅子の背に、作業着。'] : [])
     .concat(b.child ? ['n:部屋の隅の布団で、小さな寝息がしている。彼は時々、そっちを見て、声を落とす。'] : [])
     .concat([
      'n:コメント欄が流れていく。',
      'c:深夜の常連|今夜も来たよ',
      'c:さくら|勉強おつかれ',
      'c:夜空の旅人|声かれてない？',
      'd:かれてないわよ。……ちょっとだけ。',
    ]).concat(b.stream ? ['n:コメントは途切れない。視聴者数の数字が、こちらの分室の端末では読み取れないほど速く変わっていく。'] : []));
    await K.mainUI(1600);
    await K.say([
      '#wait 1700',
      'p:……今、何か。',
      'n:右上に、また、あの数字の枠が見えた気がした。体力。疲労。精神。残り日数。',
      'n:――あれは、彼の画面の端に映っていたもの、なのかもしれない。',
      '#wait 700',
      'n:気づかれていない。私は、境界の向こうから、ただ見ている。',
      'n:七章の夜と同じように。分室が何年もそうしてきたように。',
      '#amb off', '#wait 1200',
      'n:コメント欄に、一件。',
      '#wait 600',
      'c:――|後ろ',
      '#wait 1400',
      'n:彼が、話すのをやめた。',
      '#se whistle',
      'n:ゆっくりと。',
      'n:肩越しに。',
      'n:後ろを――',
      '#wait 900',
      'n:振り返った。',
      '#wait 500',
      'n:めがねの奥の目が、まっすぐ、こちらを見た。',
      'n:一瞬だけ。',
      'n:目が、合った。',
      '#fx flash', '#fx noise', '#se static',
      '#wait 300',
      '#fx blackout',
      't:通信切断',
      '#wait 1200',
    ]);
    K.gain('d14_back'); K.flag('back_seen', true);
    await K.say([
      '#scene collapse A', '#amb whistle_far',
      'p:…………。',
      'n:膝が震えていた。',
      'p:見えて、た。……向こうから、私が。',
      's:きゅ。',
      'n:シロが私の指を噛んだ。痛みで、自分がどこにいるかを思い出す。',
      'n:あの「後ろ」というコメントを書いたのは、誰だったのか。',
      'n:私ではない。ユウでもない。分室の誰でもない。',
      'n:――あの部屋で彼がいつか感じた「後ろ」の気配の、いくつかは、もしかしたら今夜の私だったのかもしれない。',
      'n:でも、全部ではない。',
    ]);
  };

  /* ── 境界核 ── */
  var SEP = [
    { obj: '十円玉。刻印は「光文十一年」', ans: 'B' },
    { obj: '丸い壁時計。文字盤の下に「常盤時計」', ans: 'A' },
    { obj: '2時17分で止まった腕時計。持ち主の姿はない', ans: 'C' },
    { obj: '硬券「月代鉄道 月代→海浜公園」', ans: 'B' },
    { obj: '「月代銀座」の看板。「銀」の字が半分落ちている', ans: 'A' },
    { obj: '誰もいない教室。黒板の「正」の字が六つ', ans: 'C' },
  ];
  // 流れていく彼の姿（本編のエンディングとの対応）
  var VISIONS = [
    { t: '工具を握っている。配管の前で、汗をぬぐう。', e: ['engineer'] },
    { t: '机で参考書を開いている。夜中の二時。蛍光ペンのキャップをくわえて。', e: ['engineer'] },
    { t: 'マイクの前で話している。コメント欄が流れている。', e: ['king'] },
    { t: '歌っている。目を閉じて。', e: ['rebirth'] },
    { t: '小さな子と手をつないで、保育園の門の前に立っている。', e: ['father'] },
    { t: '疲れ果てて、玄関で靴も脱がずに座り込んでいる。', e: ['bankrupt'] },
    { t: '笑っている。誰かのコメントに、声を出して。', e: ['debtfree', 'rebirth'] },
    { t: '眠っている。机に突っ伏して、モニターだけが光っている。', e: ['normal'] },
    { t: '倒れる。膝から、ゆっくりと。', e: ['collapse', 'flame'] },
    { t: '――立ち上がる。', e: [] },
  ];
  P2.vision = async function (K, i) {
    var v = VISIONS[i], seen = P2.link().endings;
    var hit = v.e.some(function (e) { return seen.indexOf(e) >= 0; });
    await K.say(['#fx flash', 'n:' + v.t].concat(hit ? ['n:……その姿だけ、輪郭がくっきりしている。誰かが、確かに一度、見届けた姿のように。'] : []));
  };
  P2.coreBattle = async function (K) {
    await K.say([
      '#scene core', '#amb whistle_far',
      'n:世界の真ん中に、それはあった。', 'n:光でも闇でもない、脈打つ結び目。無数の世界の糸が、一点に絡まっている。',
      'y:（無線）……それが境界核か。', 'm:（無線）結び目をほどくんじゃない。一本ずつ、元の世界へ返すんだ。',
      's:きゅ！', 'n:シロが核の表面に飛び乗った。シロが触れたところだけ、糸の色が見分けられる。',
      'p:一つずつ、どの世界の物か見極めて――返す。',
    ]);
    var vi = 0;
    for (var i = 0; i < SEP.length; i++) {
      var r = SEP[i];
      await K.say(['n:核の表面に、絡まった物が浮かび上がる。', 't:［' + (i + 1) + '／' + SEP.length + '］ ' + r.obj]);
      for (;;) {
        var w = await K.choice(r.obj + '――どの世界へ返す？', [
          { t: '世界A（いつもの月代町）', v: 'A' }, { t: '世界B（別の歴史の月代町）', v: 'B' }, { t: '世界C（誰もいない月代町）', v: 'C' },
        ]);
        if (w === r.ans) { await K.say(['#se beep', 'n:シロが糸を一本くわえて、正しい方へ引いた。結び目が、一つほどける。']); break; }
        K.stab(-4);
        await K.say(['#fx shake', 's:きゅうっ……', 'n:糸が逆に締まった。違う。' + (r.ans === 'B' ? 'こっちの月代町に、鉄道や光文はない。' : r.ans === 'A' ? 'いつもの分室で見た物だ。' : '時間が止まって、人がいない場所の物だ。')]);
      }
      await P2.vision(K, vi++);
    }
    K.gain('d14_core_scan');
    await K.say([
      '#se whistle', '#se clock', '#se wire',
      'n:核の脈が、三つの音に分かれた。汽笛。時計。電線。',
      'y:（無線）波形が出た。三つの音が、決まった順番で重なってる。',
      'm:（無線）シロと拍を合わせろ。同じ順番で、境界を叩き返すんだ。',
    ]);
    var PATS = [['whistle', 'clock'], ['whistle', 'clock', 'wire'], ['clock', 'whistle', 'wire', 'whistle'], ['wire', 'clock', 'whistle', 'clock', 'whistle']];
    var NAME = { whistle: '汽笛', clock: '時計', wire: '電線' };
    for (var p = 0; p < PATS.length; p++) {
      var pat = PATS[p];
      for (;;) {
        await K.say(['n:シロの鼓動。核の脈。――聴け。'].concat(pat.map(function (s) { return '#se ' + s; }).reduce(function (a, s) { return a.concat([s, '#wait 450']); }, [])).concat(['t:' + pat.map(function (s) { return NAME[s]; }).join(' → ')]));
        var ok = true;
        for (var j = 0; j < pat.length; j++) {
          var c = await K.choice('拍 ' + (j + 1) + '／' + pat.length + '　次の音は？', [{ t: '汽笛', v: 'whistle' }, { t: '時計', v: 'clock' }, { t: '電線', v: 'wire' }]);
          if (c !== pat[j]) { ok = false; break; }
          await K.say(['#se ' + c]);
        }
        if (ok) { await K.say(['#fx flash', 'n:シロと拍が重なった。核が、一段、静かになる。']); break; }
        K.stab(-3);
        await K.say(['#fx shake', 'n:拍がずれた。核が跳ねる。', 's:きゅ。', 'n:シロが、もう一度最初から、と言うように鳴いた。']);
      }
      if (vi < VISIONS.length - 1) await P2.vision(K, vi++);
    }
    // 九条
    var kv = K.get('kujo_view');
    await K.say(['#se static', 'n:核の向こうに、九条が立っていた。']);
    if (kv === 'stop') await K.say(['k:止めに来たか。正しい人だ。', 'p:あなたの家族がいる世界にも、その世界の誰かが生きています。', 'k:……分かっているよ。四千回、分かっていた。']);
    else if (kv === 'understand') await K.say(['k:来てくれたね。', 'p:分かる、と言ったのは本当です。でも、町を混ぜたままにはできない。', 'k:そうだろうね。……君は、見ることをやめられない人間だ。私と同じで。']);
    else await K.say(['k:まだ決めていない顔だ。', 'p:決めていません。でも、この結び目はほどきます。', 'k:それでいい。決めるのは、世界のほうだ。']);
    await K.say([
      'k:一つだけ、聞かせてくれ。あの男は、最後に立ち上がったか。',
      'p:……はい。',
      'n:九条は、ほんの少しだけ笑った。',
      'k:そうか。どの世界でも、そうなんだな。',
    ]);
    await P2.vision(K, VISIONS.length - 1);
    await K.say(['#fx whiteout', '#se whistle', 'n:最後の糸が、ほどけた。', 'n:境界が、閉じていく。', 'n:九条の姿は、もう、どこにもなかった。']);
    K.flag('core_done', true);
  };

  /* ── 最終章 ── */
  window.KY_STORY.register('ch14', async function (K) {
    await K.step('d14_open', async function () {
      K.flag('ch14', true);
      await K.title('最終章', '月代町崩壊');
      await K.say([
        '#scene center_office A', '#amb clock',
        'n:午前2時16分。', 'm:行くのか。', 'p:シロが一緒なら。', 'y:無線は切るな。こっちから見えるのは、お前の端末の位置だけだ。', 'y:……戻ってこい。',
        'g:シロ、ちゃんと連れて帰ってきてね。', 's:きゅ。',
        '#se clock', '#wait 800', 'n:2時17分。', '#se whistle', '#fx shake',
        'n:分室の床が、ずれた。', 'n:窓の外の月代町が、ほどけていく。',
      ]);
      if (K.sync) K.sync(5);
      if (K.setWorld) K.setWorld('A');
      K.unlock('collapse');
      await K.say([
        '#scene collapse A', '#amb whistle_far',
        'n:月代駅のホームが、商店街の真ん中に浮いていた。', 'n:別の世界の小学校の窓から、未来の研究所の廊下が見える。', 'n:足元の舗装が、途中から海になっている。空には、逆さまの街。',
        'n:遠くで、工場の機械の唸り。', 'p:……全部、混ざってる。',
        'y:（無線）安定度に気をつけろ。そこは危険度5だ。長くいるな。',
      ]);
    });

    await K.step('d14_mixed', async function () {
      await K.explore({
        hint: '混ざり合う町を進む（三つ以上の場所を確かめると、道が開く）',
        areas: ['collapse'],
        goal: function (K) { return K.has('d14_door'); }
      });
    });

    await K.step('d14_back', async function () { await P2.backEvent(K); });
    await K.step('d14_core', async function () { await P2.coreBattle(K); });

    await K.step('d14_choice', async function () {
      await K.say(['#scene core', 'n:閉じかけた境界の縁に、私は立っていた。', 'n:向こうに、いつもの月代町の灯り。後ろには、無数の世界が、静かに離れていく。',
        'n:ここに残れば、全部が見える。どの世界も、どの人生も。', 'n:……九条が、四千回見ていた景色。']);
      var v = await K.choice('どうする？', [
        { t: '月代町へ戻る', v: 'return' },
        { t: '境界に残り、世界を観測し続ける', v: 'stay' },
      ]);
      K.flag('final_choice', v);
      if (v === 'return') {
        await K.say(['n:帰り道は、一本ではなかった。光の筋が何本も、似たような月代町へ延びている。', 'n:どれが、私の町だろう。']);
        var a = await K.choice('帰り道をどう確かめる？', [
          { t: '職員証の所属表記を確かめる', v: 'id', s: '自分の記録を信じる' },
          { t: 'ユウの声がする方へ', v: 'voice', s: '聞き慣れた声を信じる' },
          { t: 'シロについていく', v: 'shiro', s: 'どの世界でもずれない一匹を信じる' },
        ]);
        K.flag('anchor', a);
        if (a === 'id') {
          var low = P2.stab(K) < 40;
          await K.say(['n:職員証を取り出す。', low ? 't:境界現象対策局　主任観測員' : 't:特殊現象観測センター　月代分室　観測員', low ? 'p:……これで、合ってる。たぶん。' : 'p:これだ。']);
        }
        if (a === 'voice') await K.say(['y:……おい。聞こえるか。こっちだ。', 'p:ユウさん。', 'n:聞き慣れた声だった。いつもと、ほんの少しだけ違う呼び方をした気もしたけれど。']);
        if (a === 'shiro') await K.say(['s:きゅ。', 'n:シロは一度も振り返らずに、まっすぐ一本の光へ歩いていく。']);
      }
      K.flag('ch14_done', true);
    });

    await K.step('d14_end', async function () {
      if (P2.finale) await P2.finale(K);
      else await K.ending('A');
    });
  });
})();
