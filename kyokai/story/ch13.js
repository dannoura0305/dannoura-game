/* ══════════════════════════════════════════════════════════
   kyokai/story/ch13.js — 第十三章「九条シン」（担当D）
   九条の目的（家族を失わなかった世界を探す）・B-30 を観測していた理由（台詞は原案どおり）
   §32 選択「止めるべき」「理解できる」「まだ判断できない」→ kujo_view
   本編UI侵食（§40）2回目。
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN13 = function (K) { return K.has('ch13') && !K.has('ch13_done'); };

  P2.area('old_lab', { name: '旧研究施設', worlds: {
    C: { scene: 'old_lab', spots: [
      { id: 'd13_term', obj: 'old_pc', x: .3, y: .25, w: .3, h: .32, label: '九条の端末', acts: ['look', 'scan'], cond: IN13,
        on: {
          look: async function (K) {
            await K.say(['n:崩れた研究室の奥で、端末が一台だけ光っている。', 'n:画面には、無数の人生の記録。名前、年齢、世界番号。何千、何万。', 'n:その中に――B-30。', 'n:一人の男性の三十日が、何百通りも並んでいる。どの列も DAY 01 から始まって、DAY 30 で途切れている。']);
            K.gain('d13_kujo_terminal');
            if (!K.has('d13_ui')) {
              K.flag('d13_ui', true);
              await K.say(['n:列の一つに目を近づけた、そのとき。']);
              await K.mainUI(1100);
              await K.say(['#wait 1200', 'p:……また。', 'n:右上に、数字の並ぶ小さな枠。残り日数の欄だけが、こちらを見ていた気がする。']);
            }
          },
          scan: async function (K) {
            await K.say(['t:探索記録　世界数 4,812', 't:各行末尾：家族：不在', 'n:何千行も、同じ言葉で終わっている。', 'n:最後のほうに、一行だけ。', 't:世界 3,107　家族：在　――　観測者本人：不在']);
            K.gain('d13_search_log');
          }
        } },
      { id: 'd13_black', obj: 'blackboard', x: .66, y: .3, w: .2, h: .3, label: '黒板の隅', acts: ['look'], cond: IN13,
        on: { look: async function (K) {
          await P2.t444(K, 'kujo_black', ['n:黒板。かすれた数式と「T=30」。', 'n:隅に、何度も消した跡がある。チョークの粉の下から、同じ三桁が浮かぶ。444。', 'n:端末のログも同じだった。444 の記録だけが、一行残らず黒く塗りつぶされている。手で、何度も。', 'p:見たくなかったのか。見られたくなかったのか。'], { title: '九条の黒塗り', text: '九条の端末の 444 の記録は、すべて手作業で黒塗りにされていた。' });
        } } },
    ] },
    B: { scene: 'old_lab', spots: [
      { id: 'd13_frame', obj: 'family_photo', x: .7, y: .45, w: .2, h: .3, label: '机の写真立て', acts: ['look', 'photo'], cond: function (K) { return IN13(K) || (P2.lastChance(K) && !K.has('myst_kujo')); },
        on: {
          look: async function (K) { await K.say(['n:前に来たとき、指が通り抜けた写真立て。同期Lv4の今なら、手に取れる。', 'n:白衣の男性と、女性と、小さな男の子。三人とも笑っている。', 'n:白衣の名札。「九条」。', 'n:裏に日付。この世界の、去年の夏。']); },
          photo: async function (K) { await K.say(['#se shutter']); K.gain('d13_family'); }
        } },
    ] },
  } });

  // 九条の目的の推理（第十三章の探索のあと／最後の機会で写真立てを見たあと）
  async function kujoMotive(K) {
    var ok = await K.deduce({
      id: 'd13_motive',
      q: '九条は、無数の世界を観測して何を探しているのか',
      options: [
        { id: 'power', text: '境界を支配する方法', need: ['d13_kujo_terminal'], refute: ['d13_search_log'] },
        { id: 'study', text: '純粋な研究の対象', need: ['d13_kujo_terminal'], refute: ['d13_family'] },
        { id: 'family', text: '家族を失わなかった世界', need: ['d13_search_log', 'd13_family'] },
      ],
      answer: 'family',
      hint: {
        power: 'それなら記録の末尾がすべて「家族：在／不在」である必要はない。',
        study: '研究のためだけに、写真立てを伏せて置いていくか？',
      },
      link: 2,
    });
    if (ok) {
      K.flag('myst_kujo', true);
      await K.say(['p:家族が生きている世界を探していた。四千以上も。', 'p:見つけた一つには――九条さん自身が、いなかった。', 'y:……そこへは、行けないな。行ったら、その世界の何かを壊す。']);
      K.note('person', 'kujo_p', { title: '九条シン', text: '家族を失わなかった世界を探して、四千以上の世界を観測した。家族が生きている世界は一つだけ。そこには九条自身がいなかった。', solved: true });
    }
  }

  /* ── 第十三章 ── */
  window.KY_STORY.register('ch13', async function (K) {
    await K.step('d13_open', async function () {
      K.flag('ch13', true);
      await K.title('第十三章', '九条シン');
      await K.say([
        '#scene center_office A', '#amb clock',
        'm:九条シン。この分室の、最初の主任だ。', 'm:境界を「管理」する組織を作ろうとした。対策局の計画書を書いたのも彼だ。',
        'p:地下の記録で、名前が消されかけていた人。', 'm:消したのは私だよ。', 'n:御堂室長は、窓の外を見たまま言った。',
        'm:十数年前の冬、九条の奥さんと息子さんが、事故で亡くなった。', 'm:そのあと彼は、白いものを見たと報告して――旧研究施設で、いなくなった。',
        'm:境界の向こうへ行ったんだと思う。戻ってこなかった。',
        'y:旧研究施設の、誰もいない側に、最近まで誰かが通っていた跡がありました。', 'm:……そうか。生きているのか。',
      ]);
      if (K.has('staff_photo_9')) await K.say(['p:……壁の職員写真。名札に「九」の一文字だけ読めた、白衣の人。', 'm:あれは、誰も貼っていないんだ。いつの間にか増えていた。……私はずっと、彼が自分で戻ってきたんだと思っていたよ。']);
      await K.say(['#scene center_office A', 'y:……俺が分室に来たとき、九条さんはもういなかった。', 'y:でも、引き継いだ記録の書き方を見れば分かる。あの人は、誰より正確に「見る」人だった。', 'p:ユウさんの書き方と、似ていますか。', 'y:…………似せたんだよ。']);
      K.note('person', 'kujo_p', { title: '九条シン', text: '分室の最初の主任。対策局の計画者。十数年前に家族を事故で失い、境界の向こうへ消えた。' });
    });

    await K.step('d13_lab', async function () {
      // 必要：九条の端末（調べる＋スキャン）。任意（TRUE 用）：別の歴史（B）の写真立て。
      // 旧研究施設は A に調べる物がない。「境界観測」で C に切り替えるところまで目的に書く。
      var need13 = function (K) { return K.got('d13_kujo_terminal') && K.got('d13_search_log'); };
      await K.explore({
        hint: function (K) {
          var opt = K.got('d13_family') ? '' : '（別の歴史（B）の研究室の机にも、何かあるかもしれない）';
          if (!K.got('d13_kujo_terminal')) return '旧研究施設で「境界観測」を押し、誰もいない側（C）に切り替えて、九条の端末を調べる' + opt;
          if (!K.got('d13_search_log')) return '九条の端末を「スキャン」して、探索の記録を読む（電力が尽きたら分室で補給）' + opt;
          return '端末の記録はそろった。「調査を終える」で先へ進む' + (opt ? '（その前に：別の歴史（B）の研究室の机を確かめられる）' : '');
        },
        areas: ['old_lab', 'center_office', 'empty_town'],
        ready: need13,
        pending: function (K) { return K.got('d13_family') ? [] : ['旧研究施設・別の歴史（B）の机']; },
        pendingNote: '（九条さんが何を探しているのか、分かるかもしれない）',
        goal: function (K) { return need13(K) && K.got('d13_family'); }
      });
      if (K.got('d13_family')) await kujoMotive(K);
      else {
        await K.say(['p:九条さんが何を探しているのか。……まだ、分からない。']);
      }
    });

    await K.step('d13_meet', async function () {
      await K.say([
        '#scene old_lab C', '#amb whistle_far',
        'n:背後で、靴音がした。',
        'k:よく来たね。分室の新人。',
        'n:白衣の男性。痩せて、目だけが若い。',
        'p:九条さん。',
        'k:名前を知っているなら、御堂は元気か。……いい。答えなくていい。',
        'n:九条が端末の画面を指でなぞる。B-30 の列が流れる。',
        'p:どうして、この人をずっと観測していた？',
        'k:面白かったからだ。',
        '#wait 600',
        'k:一人の人間が、わずかな選択だけで、これほど違う人生になる。',
        'k:ある世界では成功する。ある世界では壊れる。ある世界では人を惹きつける。ある世界では誰にも知られず終わる。',
        'k:世界というものを理解するのに、これほど分かりやすい標本はなかった。',
        '#wait 800',
        'p:標本、ですか。', 'k:気に障ったかな。', 'p:……あの人は、毎晩、子どもが寝たあとにマイクの前に座っていました。', 'p:眠れない夜に、知らない誰かと話していました。',
        'k:知っているよ。どの世界の彼も、そうだった。', 'k:だから目が離せなかった。',
        'k:私には、一つの選択の差で家族が生きていた世界が、どうしても見つけられない。',
        'k:彼は――どの世界でも、子どもの手を離さなかった。',
        'n:九条の声が、少しだけ揺れた。',
        'k:明日の 2時17分、境界共鳴実験を最後まで回す。周期30。三十番目の共鳴で、世界と世界の壁が薄くなる。',
        'k:そうすれば、私は「家族がいる世界」と「私がいる世界」を重ねられる。',
        'p:そんなことをしたら、月代町は。', 'k:混ざる。……少しのあいだだけだ。',
      ]);
      var v = await K.choice('九条について、どう思う？', [
        { t: '止めるべき', v: 'stop', s: '町を混ぜてはいけない' },
        { t: '理解できる', v: 'understand', s: '失ったものを探す気持ちは分かる' },
        { t: 'まだ判断できない', v: 'undecided', s: '答えを出さない' },
      ]);
      K.flag('kujo_view', v);
      if (v === 'stop') await K.say(['p:止めます。あなたが探している世界にも、その世界の誰かが生きている。', 'k:正しいね。正しい人は、いつも私を止めに来る。']);
      if (v === 'understand') await K.say(['p:……分かる、と思います。分かってしまうのが、怖いです。', 'k:そう言ってくれた人は、君が初めてだ。', 'k:観測者には向いているよ。見ることを、やめられない人間だ。']);
      if (v === 'undecided') await K.say(['p:まだ、分かりません。あなたが正しいのか、間違っているのか。', 'k:……それでいい。決めるのは、たぶん君じゃない。世界のほうだ。']);
      await K.say(['#fx glitch', '#se static', 'n:九条の輪郭がぶれた。', 'k:明日の 2時17分。来るなら、シロを連れておいで。あれは迷わない。', 'n:そう言って、彼は崩れた壁の向こうへ、歩いて消えた。']);
      K.note('person', 'kujo_view', { title: '九条への態度', text: v === 'stop' ? '止めるべきだと伝えた。' : v === 'understand' ? '理解できると伝えた。' : 'まだ判断できないと伝えた。' });
      K.flag('ch13_done', true);
    });

    // ボス戦（kyokai/battle.js）：九条が旧研究施設に残した観測装置
    await K.step('d13_construct', async function () {
      await K.battle('kikou9', { lv: 18, world: 'C', pal: 'C',
        intro: ['#scene old_lab C', '#se scan', 'n:九条が消えたあと。', 'n:研究室の奥で、三脚に載った大きなレンズが、ひとりでに起き上がった。',
          't:観測機構〈九〉　起動', 't:対象：観測員 1 名・境界生物 1 体　――標本として固定します',
          'p:……見られている。九条さんの、観測装置。', 's:きゅ。', 'n:シロが、レンズと私のあいだに立った。'],
        outro: ['n:レンズにひびが走り、装置は静かに倒れた。', 't:観測機構〈九〉　停止', 't:記録：標本 0 件', 'p:……あの人は、これで何千もの世界を見ていた。', 'n:ひび割れたレンズには、もう何も映っていなかった。'] });
    });

    // 最後の機会：第十二・十三章で取り逃した任意の謎（ナギ・シロ・九条）を、最終章の前にもう一度だけ調べられる
    await K.step('d13_last', async function () {
      var left = function (K) { return P2.optLeft(K, true); };
      if (!left(K).length) return;
      K.flag('d13_last', true);
      await K.say(['#scene center_office A', '#amb clock',
        'n:分室に戻ると、窓の外はもう暗かった。',
        'y:2時17分まで、まだ丸一日ある。', 'y:……気になってることが残ってるなら、今のうちに片づけておけ。向こうへ行ったら、戻ってこられる保証はない。',
        'n:（最終章の前に、やり残した調べ物ができる。準備ができたら「調査を終える」）']);
      await K.explore({
        hint: function (K) { var a = left(K); return a.length ? '最終章の前に（任意）：' + a.join('／') : 'やり残しはない。'; },
        areas: ['center_office', 'center_lab', 'residential', 'old_lab'],
        start: 'center_office',
        ready: function () { return true; },
        pending: left,
        pendingNote: '（最終章が始まると、もう調べられない）',
        goal: function (K) { return !left(K).length; }
      });
      if (K.got('d13_family') && !K.has('myst_kujo')) await kujoMotive(K);
      K.flag('d13_last_done', true);
    });
  });
})();
