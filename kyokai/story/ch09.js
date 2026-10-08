/* ══════════════════════════════════════════════════════════
   kyokai/story/ch09.js — 第九章「30」（担当D）
   30 という数字（観測期間・記録番号・実験周期）／B-30 の DAY 01〜30 の断片を並べ直すパズル
   （経過時間から DAY を割り出す）→ DAY 30 の黒塗りの推理（まだ確定していない）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN9 = function (K) { return K.has('ch9') && !K.has('ch9_done'); };

  P2.area('old_lab', { name: '旧研究施設', danger: { B: 3, C: 5 }, worlds: {
    B: { scene: 'old_lab', spots: [
      { id: 'd9_plate', obj: 'blackboard', x: .36, y: .22, w: .26, h: .3, label: '黒板', acts: ['look', 'photo', 'scan'], cond: IN9,
        on: {
          look: async function (K) { await K.say(['n:この世界の旧研究施設は、廃墟ではない。床は磨かれ、装置には電源が入っている。', 'n:黒板に、きれいな字で。「境界共鳴実験　観測周期 T=30」', 'n:その下に、もう一行。「固定観測者 1」。']); },
          photo: async function (K) { await K.say(['#se shutter', 'n:黒板を撮った。']); K.gain('d9_cycle'); if (K.has('paper_viewer1')) await K.say(['p:固定観測者 1……。古新聞の「固定視聴者：1」と、同じ数字。']); },
          scan: async function (K) { await K.say(['t:境界反応 2.6（周期的）', 't:周期：30.0', 'p:単位が書いていない。30日？　30秒？　……30回？']); }
        } },
      { id: 'd9_desk', obj: 'family_photo', x: .7, y: .45, w: .2, h: .3, label: '机の写真立て', acts: ['look'], cond: IN9,
        on: { look: async function (K) { await K.say(['n:整頓された机。書類はすべて持ち去られている。', 'n:写真立てが一つ。三人家族の影。顔を見ようと近づくと、指が額を通り抜けた。', 'p:……見るだけの世界、か。']); K.flag('d9_frame_seen', true); } } },
    ] },
  } });
  P2.area('station', { name: '月代駅', worlds: { B: { scene: 'station_live', spots: [
    { id: 'd9_gate', obj: 'conductor', x: .55, y: .45, w: .16, h: .3, label: '改札の駅員', acts: ['talk'], cond: IN9,
      on: { talk: async function (K) {
        await K.say(['x:駅員|ああ、またあなた。切符は……いいです、いいです。', 'x:駅員|変な話ですがね。夜中の二時四十分すぎ、誰もいない改札を、誰かが通る音がするんですよ。']);
        await P2.t444(K, 'gate', ['x:駅員|朝に通過カウンターを見ると、決まって数字が増えてる。……ここ半年で、ちょうど444。', 'x:駅員|気味が悪いから、もう数えるのやめました。'], { title: '改札の通過カウンター', text: '世界Bの月代駅。誰もいない深夜の改札を「誰か」が通る。通過数はちょうど444。' });
      } } },
  ] } } });

  P2.area('shrine', { name: '月代神社', worlds: { A: { scene: 'shrine', spots: [
    { id: 'd9_shiramine', fig: 'shiramine', x: .57, y: .46, w: .08, h: .28, label: '宮司の白峰さん', acts: ['talk'], cond: IN9,
      on: { talk: async function (K) { await K.say(['x:白峰|三十、ですか。……この神社にも、三十にまつわる古い神事がありましてね。「月送り」と言います。',
        'x:白峰|月の満ち欠けはおよそ三十日。昔の人は、三十日ごとに「今月の自分」を神さまにお返しして、新しい月の自分をいただいた。',
        'x:白峰|返しそびれた月は、どこかで続いてしまう――そんな言い伝えもあります。', 'p:続いてしまう？', 'x:白峰|終わらない三十日目、というやつです。子どもを寝かしつける脅し文句ですよ。']); K.flag('d9_tsukiokuri', true); } } },
  ] } } });

  // 断片を並べ直す：経過時間 → DAY（観測開始の瞬間が DAY 01 の 0時）
  var FRAGS = [
    { day: 4, txt: '睡眠時間 2.1時間。観測強度 微増。', t: '+3日 05:12', opts: [3, 4, 5, 8] },
    { day: 7, txt: '深夜、定期の映像配信を確認。', t: '+6日 23:40', opts: [6, 7, 8, 13] },
    { day: 11, txt: '職場で設備停止。対象が対応。帰宅が遅れる。', t: '+10日 08:05', opts: [10, 11, 12, 18] },
    { day: 15, txt: '怪異反応 上昇。', t: '+14日 02:17', opts: [14, 15, 16, 21] },
    { day: 18, txt: '歌唱。歌っている間、境界ノイズが一時消失。', t: '+17日 22:30', opts: [17, 18, 19, 23] },
    { day: 23, txt: '精神状態 低下。', t: '+22日 03:00', opts: [22, 23, 24, 27] },
    { day: 27, txt: '異常視聴者を確認。', t: '+26日 02:44', opts: [26, 27, 28, 30] },
  ];
  P2.puzzle30 = async function (K) {
    await K.say(['n:B-30 の写しは、三十個の小さな記録に分かれていた。順番はばらばら。', 'n:DAY の番号は壊れている。残っているのは「観測開始からの経過時間」だけ。', 'y:並べ直せ。開始の瞬間が DAY 01 の始まりだ。', 'y:……一日目は「+0日」だぞ。そこを間違えるやつが多い。']);
    var miss = 0;
    for (var i = 0; i < FRAGS.length; i++) {
      var f = FRAGS[i];
      await K.say(['t:断片 ' + (i + 1) + '／7　経過 ' + f.t, 't:「' + f.txt + '」']);
      for (;;) {
        var v = await K.choice('経過 ' + f.t + '「' + f.txt + '」――これは DAY いくつ？', f.opts.map(function (d) { return { t: 'DAY ' + (d < 10 ? '0' : '') + d, v: d }; }));
        if (+v === f.day) { await K.say(['#se beep', 't:DAY ' + (f.day < 10 ? '0' : '') + f.day + '　' + f.txt]); break; }
        miss++;
        await K.say([miss === 1 ? 'y:違う。「+0日」が DAY 01 だ。なら「+3日」は？' : (+v === f.day - 1 ? 'y:一日ずれてる。経過日数に、一日目のぶんを足せ。' : 'y:経過時間を、日にちだけ見てみろ。時刻は日をまたがない。')]);
      }
    }
    var b = P2.link().b30;
    var extra = [];
    if (b.stream) extra.push('n:DAY 07 の欄外に小さく「コメント流量 多」。');
    if (b.study) extra.push('n:DAY 11 の欄外に「業務後、学習の継続を確認」。');
    if (b.child) extra.push('n:DAY 18 の欄外に「歌唱中、近くで子どもの寝息」。');
    if (b.anomaly) extra.push('n:DAY 27 の欄外に「対象、異常を自覚」。');
    await K.say(['n:七つの断片が並んだ。', 't:DAY 04 睡眠不足', 't:DAY 07 配信', 't:DAY 11 仕事上のトラブル', 't:DAY 15 怪異反応上昇', 't:DAY 18 歌唱', 't:DAY 23 精神状態低下', 't:DAY 27 異常視聴者を確認', 't:DAY 30 ――――']
      .concat(extra).concat(['n:DAY 30 だけが、完全に黒く塗りつぶされている。']));
    K.gain('d9_fragments');
  };

  P2.area('center_server', { name: 'サーバー室', worlds: { A: { scene: 'center_server', spots: [
    { id: 'd9_copy', obj: 'log_terminal', x: .12, y: .4, w: .28, h: .3, label: 'B-30 の写し', acts: ['look', 'scan'], cond: function (K) { return IN9(K) && K.has('d9_copy_ready'); },
      on: {
        look: async function (K) {
          if (!K.got('d9_fragments')) { await P2.puzzle30(K); return; }
          await K.say(['n:DAY 30 の行の状態欄。', 't:DAY 01〜29　状態：CLOSED', 't:DAY 30　　　状態：OPEN', 'p:30日目だけ、閉じていない。']);
          K.gain('d9_status');
        },
        scan: async function (K) {
          if (!K.got('d9_fragments')) { await K.say(['n:まず断片を並べ直そう。']); return; }
          await K.say(['#se beep', 't:黒塗り部 走査 1回目：ｦ8ﾅ……', 't:黒塗り部 走査 2回目：ｹ1ﾏ……', 't:黒塗り部 走査 3回目：ﾈ0ﾙ……', 'p:読むたびに、下の文字が違う。', 'p:消されたんじゃない。……まだ、書かれている途中？']);
          K.gain('d9_scan30');
        }
      } },
  ] } } });

  /* ── 第九章 ── */
  window.KY_STORY.register('ch09', async function (K) {
    await K.step('d9_open', async function () {
      K.flag('ch9', true);
      await K.title('第九章', '30');
      await K.say([
        '#scene center_office A', '#amb clock',
        'n:対策局から戻って二日。私の端末には、向こうで開いた画面の写しが、壊れかけで残っていた。',
        'y:修復に一晩かかる。その間に、数字の話をしよう。',
        'p:数字？',
        'y:お前が持ち帰った資料、「30」が多すぎる。',
        'n:ユウがホワイトボードに書き出していく。',
        't:B-30　（記録番号）', 't:観測期間 30日　（B-30 の表紙）', 't:黒板の正の字 = 30　（誰もいない町の学校）',
        'y:偶然かもしれない。偶然じゃないかもしれない。',
        'm:……もう一つある。',
        'n:御堂室長が、古い封筒を机に置いた。',
        'm:旧研究施設の、昔の実験の名前だ。「境界共鳴実験」。周期の欄が黒塗りになってる。',
        'm:別の世界の旧研究施設なら、黒塗りの前の銘板が残っているかもしれない。',
      ]);
      K.gain('d9_period');
      K.flag('old_lab_open', true); K.unlock('old_lab');
      K.note('term', 'd9_30', { title: '30', text: '記録番号30・観測期間30日・正の字30・実験周期？　偶然かどうか、まだ分からない。' });
    });

    await K.step('d9_lab', async function () {
      await K.explore({
        hint: '旧研究施設を境界観測で別の歴史（B）に切り替え、「周期」を確かめる',
        areas: ['old_lab', 'station', 'shotengai', 'shrine', 'center_office'],
        goal: function (K) { return K.got('d9_cycle'); }
      });
      await K.say(['#scene center_office A', 'p:周期30。単位はありませんでした。', 'y:記録番号30、観測期間30日、実験周期30。', 'm:……三つ並ぶと、偶然と言うには少し重いね。', 'y:写しの修復が終わった。サーバー室で見られる。']);
      K.flag('d9_copy_ready', true);
      K.note('term', 'd9_30', { title: '30', text: '記録番号30・観測期間30日・正の字30・実験周期30。B-30 の対象は、30日を区切りに観測されていた。' });
    });

    await K.step('d9_frag', async function () {
      await K.explore({
        hint: function (K) {
          if (!K.got('d9_fragments')) return 'サーバー室で B-30 の写しを調べ、断片を並べ直す';
          var left = [];
          if (!K.got('d9_status')) left.push('もう一度「調べる」で DAY 30 の行を見る');
          if (!K.got('d9_scan30')) left.push('黒塗りを「スキャン」する');
          return 'サーバー室の B-30 の写しで、DAY 30 を調べる：' + left.join('／');
        },
        areas: ['center_server', 'center_office', 'center_lab'],
        goal: function (K) { return K.got('d9_fragments') && K.got('d9_status') && K.got('d9_scan30'); }
      });
    });

    await K.step('d9_deduce', async function () {
      var ok = await K.deduce({
        id: 'd9_day30',
        q: 'DAY 30 は、なぜ黒塗りなのか',
        options: [
          { id: 'secret', text: '機密なので、対策局が消した', need: ['d9_fragments'], refute: ['d9_status'] },
          { id: 'broken', text: '記録装置が壊れた', need: ['d9_fragments'], refute: ['d9_scan30'] },
          { id: 'open', text: '30日目は、まだ終わっていない（記録が確定していない）', need: ['d9_status', 'd9_scan30'] },
          { id: 'end', text: '対象がいなくなり、記録が途絶えた', need: ['d8_b30'], refute: ['d9_scan30'] },
        ],
        answer: 'open',
        hint: {
          secret: '消したなら、状態欄は他と同じ「CLOSED」になるはずだ。DAY 30 だけ「OPEN」なのはなぜだ？',
          broken: '壊れた記録は変わらない。読むたびに文字が変わるのは、何かが書き込まれ続けているからだ。',
          end: '途絶えたなら、黒塗りの下は空のはずだ。でも中身は、読むたびに動いている。',
        },
        link: 2,
      });
      if (ok) {
        K.flag('d9_day30', true);
        await K.say([
          'p:DAY 30 は消されたんじゃない。',
          'p:まだ、終わっていないんです。三十日目が。',
          'y:記録の向こうで、誰かがまだ三十日目を生きてる、と。',
          'm:……あるいは、三十日目がいくつもあって、どれに決まるか分からないのかもしれない。',
          'n:その言い方が、なぜか少し怖かった。',
          '#scene center_office A', '#stage nagi',
          'n:ナギが、ボードの「DAY」の文字を指でなぞっている。',
          'g:これ、テレビの人も言ってた。',
          'p:テレビの人？',
          'g:夜の人。「あと何日」って。指で数えてた。',
          'g:……あと何日で、何があるのか、ナギは知らないけど。',
          '#stage nagi off',
        ]);
        K.note('b30', 'b30_days', { title: 'B-30 の DAY 01〜30', text: '30日間の観測記録。睡眠不足・配信・仕事のトラブル・怪異反応・歌唱・精神状態の低下・異常視聴者。DAY 30 だけ「OPEN」――まだ確定していない。', solved: true });
      }
      K.flag('ch9_done', true);
    });
  });
})();
