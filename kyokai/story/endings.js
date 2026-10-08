/* ══════════════════════════════════════════════════════════
   kyokai/story/endings.js — END A「帰還」／END B「置換」／END C「観測者」／TRUE END「境界」（担当D）

   条件（P2.decideEnding）
     C    … 最終章で「境界に残る」を選んだ
     B    … 帰り道を「ユウの声」で選んだ／「職員証」で選んだが安定度40未満（所属が対策局に見えていた）
            ／安定度0で研究所へ戻された回数（slipped）3回以上／最後の安定度20未満
     TRUE … B・Cでなく、主要な謎（B-30・USER_444の痕跡5つ以上・ナギ・九条・シロ）のうち4つ以上を解明
            ＋本編『だんのうら』のエンディングを1つ以上見ている（KY_LINK.cleared()）
     A    … それ以外
   TRUE は「視聴者一名」→ スタッフロール → ポストクレジット（KY.POSTCREDIT）。
   END B の違いは注意深い人だけが気づく程度（壁時計の銘・遠くの踏切・職員写真）。
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;

  P2.bCondition = function (K) {
    var anchor = K.get('anchor'), stab = P2.stab(K), slip = P2.slipped(K);
    return anchor === 'voice' || (anchor === 'id' && stab < 40) || slip >= 3 || stab < 20;
  };
  P2.decideEnding = function (K) {
    if (K.get('final_choice') === 'stay') return 'C';
    if (P2.bCondition(K)) return 'B';
    if (P2.mysteries(K) >= 4 && P2.link().cleared) return 'TRUE';
    return 'A';
  };

  // 帰ってきた分室（A・TRUE は本当の月代町。B は、ほとんど同じ別の月代町）
  P2.homecoming = async function (K, w) {
    var B = w === 'B';
    await K.say([
      '#scene center_office ' + (B ? 'B' : 'A'), '#amb clock',
      'n:気がつくと、分室の床に座り込んでいた。',
      'n:窓の外は、白みはじめている。',
      'y:……おかえり。',
      'p:ただいま、戻りました。',
      'm:よく戻った。町は――静かだよ。',
      B ? 'n:壁時計の秒針の音。文字盤の下に、小さく「月代時計」。' : 'n:壁時計の秒針の音。文字盤の下に、小さく「常盤時計」。',
      's:きゅ。',
      'n:シロが、私の膝の上で丸くなった。',
    ]);
  };
  P2.nagiHome = async function (K, whistle) {
    var promised = K.has('nagi_promise');
    await K.say([
      '#scene station_live B', '#amb station',
      'n:三日後の夜。山の中腹の、灯りのついた駅。',
      'g:ほんとに、帰れる？',
      promised ? 'p:約束したから。' : 'p:うん。きっと。',
      'n:二両の汽車が、ホームに入ってくる。',
      'g:……テレビの人にも、よろしくね。', 'p:会えないよ、たぶん。', 'g:でも、見てるでしょ。', 'n:ナギは笑って、汽車に乗った。',
      whistle ? '#se whistle' : '#se chime',
      'n:汽笛が鳴って、駅の灯りが、ゆっくりと山の闇にほどけていった。',
    ]);
  };
  P2.kujoFate = async function (K) {
    var kv = K.get('kujo_view');
    if (kv === 'understand') await K.say(['n:九条の行方は、分からないままだ。', 'n:ただ、旧研究施設の端末に、最後の一行が残っていた。', 't:世界 3,107　家族：在　観測者本人：不在　――見ている']);
    else if (kv === 'stop') await K.say(['n:九条は戻らなかった。', 'n:旧研究施設の端末は、電源を入れても、もう何も映さない。', 'm:……あいつは、止まったんだろう。それでいい。']);
    else await K.say(['n:九条の行方は、分からない。', 'n:旧研究施設の端末に、一行だけ。', 't:見つからなかった。だが、見ていた。']);
  };

  /* ── END A「帰還」 ── */
  P2.endA = async function (K) {
    await P2.homecoming(K, 'A');
    await P2.nagiHome(K, false);
    await P2.kujoFate(K);
    await K.say([
      '#scene center_office A', '#amb clock',
      'n:報告書は、四十枚になった。本部は、棚に入れるだろう。',
      'n:観測装置で、もう一度だけあの周波数を受けてみた。',
      't:受信中……', 't:接続できません',
      'p:……おやすみなさい。',
      'n:誰に言ったのか、自分でもよく分からなかった。',
    ]);
    await K.ending('A');
  };

  /* ── END B「置換」（プレイヤーだけが気づく違い） ── */
  P2.endB = async function (K) {
    await P2.homecoming(K, 'B');
    await K.say([
      'n:遠くで、踏切の音がした。',
      'n:壁の職員写真は四枚。御堂室長、如月さん、佐伯さん、そして私。',
      'n:いつ撮ったのか、思い出せない。来月のはずだった気がする。……たぶん、気のせいだ。',
      'y:報告書、手伝う。', 'p:珍しいですね。', 'y:……いつも手伝ってるだろ。',
    ]);
    await P2.nagiHome(K, false);
    await P2.kujoFate(K);
    await K.say([
      '#scene center_office B', '#amb clock',
      'n:事件は、終わった。月代町は、いつもどおりの朝を迎えている。',
      'n:商店街の時計屋の前を通ると、坂口さんが手を振ってくれた。',
      'n:観測装置で、もう一度だけあの周波数を受けてみた。',
      't:受信中……', 't:接続できません',
      'p:……おやすみなさい。',
      'n:どこにも、何もおかしなところはない。',
    ]);
    await K.ending('B');
  };

  /* ── END C「観測者」 ── */
  P2.endC = async function (K) {
    var kv = K.get('kujo_view');
    await K.say([
      '#scene core', '#amb whistle_far',
      'n:私は、境界の縁に残った。',
      'n:シロは少しのあいだ私の足元にいて、それから一度だけ鳴いて、月代町のほうへ帰っていった。',
      'n:ここからは、全部が見える。',
      '#scene center_office A',
      'n:分室で、ユウが私の机の上の書類を片づけている。一枚ずつ、丁寧に。',
      'n:御堂室長が、壁の写真の列に、空いた額を一つ足した。',
      '#scene station_live B',
      'n:灯りのついた駅で、ナギが母親と手をつないで汽車を待っている。',
      '#scene stream_room',
      'n:暗い部屋。モニターの光。マイクの前の背中。',
      'n:今夜も、彼は誰かに向かって話している。',
      'n:私はもう、コメントを書かない。視聴者数を揺らさない。ただ、見ている。',
    ].concat(kv === 'understand' ? ['#scene core', 'k:ようこそ。……ここは静かだろう。', 'p:静かすぎます。', 'k:すぐに慣れるよ。見ることを、やめられない人間なら。'] : [])
     .concat(['#scene core', 't:観測者名簿', 't:――　所属なし　観測方法：境界常駐', 'n:私の番号の欄は、空白のままだった。']));
    await K.ending('C');
  };

  /* ── TRUE END「境界」→「視聴者一名」 ── */
  P2.endTrue = async function (K) {
    await P2.homecoming(K, 'A');
    await P2.nagiHome(K, true);
    await P2.kujoFate(K);
    await K.say([
      '#scene center_office A', '#amb clock',
      'n:事件後、月代町は平穏を取り戻した。',
      'n:入れ替わった人たちは、みんな自分の家に帰った。時計屋は八百屋に戻り、八百屋は少しだけ時計に詳しくなった。',
      'n:私は分室で、最後のログを整理していた。',
      'n:B-30。DAY 30 の欄は、まだ「OPEN」のままだ。',
      'n:例の配信記録には、もう接続できない。',
      'p:結局、誰だったんだろう。',
      'y:向こうも同じこと思ってるんじゃないか？',
      'y:こっちから見てたんだろ？　じゃあ向こうから見れば、俺たちのほうが怪異だ。',
      'n:私は、少し笑った。',
      'n:端末を終了する。',
      '#wait 800',
      'n:画面が暗くなる。',
      '#wait 1600',
      '#se beep',
      'n:――端末が、勝手に再起動した。',
      '#se stream',
      'n:配信画面。真っ黒。',
      't:視聴者数　1',
      '#wait 800',
      'c:――|見つけた。',
      '#wait 1000',
      '#fx glitch',
      't:視聴者数　444',
      '#wait 600',
      '#fx blackout',
    ]);
    try { localStorage.setItem('kyokai_true_end', '1'); } catch (e) {}
    await K.ending('TRUE');
  };

  P2.finale = async function (K) {
    var id = P2.decideEnding(K);
    K.flag('ending_decided', id);
    if (id === 'C') return P2.endC(K);
    if (id === 'B') return P2.endB(K);
    if (id === 'TRUE') return P2.endTrue(K);
    return P2.endA(K);
  };

  // スタッフロール後（原案「最後の最後」）
  KY.POSTCREDIT = ['#wait 1200', '#se stream', '#wait 1600', 'c:USER_444|次はどの世界を見る？', '#wait 2600', 'c:UNKNOWN|まだ30日目が終わってない。', '#wait 2600', 't:END', '#wait 1400'];

  // エンジンから直接呼べるように（KY.run('endings') でも最終章の結末へ）
  if (window.KY_STORY && window.KY_STORY.register) window.KY_STORY.register('endings', function (K) { return P2.finale(K); });
})();
