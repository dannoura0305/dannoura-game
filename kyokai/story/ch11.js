/* ══════════════════════════════════════════════════════════
   kyokai/story/ch11.js — 第十一章「観測されていたのは誰か」（担当D）
   反転：向こうの配信者が感じていた「誰かに見られている」怪異は、分室の境界観測だった「可能性」。
   ただし、すべては説明できない（「30日目まで見ています」「寝たら終わりますよ」はログにない）。
   本編UI侵食（§40）1回目。
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN11 = function (K) { return K.has('ch11') && !K.has('ch11_done'); };

  P2.area('center_server', { name: 'サーバー室', worlds: { A: { scene: 'center_server', spots: [
    { id: 'd11_archive', obj: 'log_terminal', x: .55, y: .3, w: .3, h: .35, label: '受動観測アーカイブ', acts: ['look', 'scan'], cond: IN11,
      on: {
        look: async function (K) {
          if (!K.got('d11_obs_log')) {
            await K.say(['n:サーバーの奥に、何年も触られていないフォルダがあった。「受動観測（試験運用）」。',
              't:対象世界：B-30系　接続：深夜　周期的', 't:備考：対象側の表示への干渉 1件（視聴者数表示が一時的に変動）', 't:備考：音声漏出の疑い（雨音帯域）',
              'p:分室が……ずっと前から、向こうを見ていた？', 'y:試験運用、ってことになってる。俺がここに来る前からだ。']);
            K.gain('d11_obs_log'); return;
          }
          if (!K.got('d11_test_strings')) {
            await K.say(['n:同じフォルダに「送信試験」というテキスト。回線の確認のために、観測員が打ち込んだ定型文。',
              't:送信試験 #01　昨日も同じ時間にここにいた', 't:送信試験 #02　後ろ、雨の音だけじゃないですよ', 't:送信試験 #03　さっきも同じ話、聞きました', 't:送信先：なし（ループバック）',
              'p:送信先は「なし」。……でも、どこかに届いていたとしたら。']);
            K.gain('d11_test_strings'); return;
          }
          await K.say(['n:送信記録をすべて検索する。', 't:検索「30日目まで見ています」　該当なし', 't:検索「寝たら終わりますよ」　該当なし', 'p:この二つは、分室からは一度も送られていない。']);
          K.gain('d11_missing');
        },
        scan: async function (K) { await K.say(['t:アーカイブ作成者：主任 九■', 'p:九……。地下の記録で、墨で消されかけていた名前。']); K.flag('d11_kujo_hint', true); }
      } },
  ] } } });
  P2.area('center_lab', { name: '観測装置室', worlds: { A: { scene: 'center_lab', spots: [
    { id: 'd11_frames', obj: 'console', x: .3, y: .22, w: .4, h: .36, label: '操作卓（録画をコマ送り）', acts: ['look', 'photo', 'record'], cond: IN11,
      on: {
        look: async function (K) { await K.say(['n:第七章の夜の録画を、一コマずつ送る。', 'n:受信が始まった瞬間――向こうの画面の右上、視聴者数の表示が、一コマだけ跳ねた。', 't:視聴者数 3 → 444 → 3', 'p:……分室がつながった、その瞬間に。']); },
        photo: async function (K) { await K.say(['#se shutter', 'n:そのコマを撮った。']); K.gain('d11_counter'); },
        record: async function (K) {
          await K.say(['#se rec', 'n:録画の音声を、高感度録音機に通す。', 'n:ほとんどが雨の音。……いや、雨の帯域の底に、規則正しい音がある。', '#se clock', 'n:秒針。', 'p:この周期……分室の壁時計と、同じだ。', 'y:向こうの部屋に、こっちの時計の音が漏れてた、ってことか。', 'p:「後ろ、雨の音だけじゃないですよ」。……あのコメントの意味が、少しだけ分かった気がします。']);
          K.gain('d11_leak');
        }
      } },
  ] } } });

  /* ── 第十一章 ── */
  window.KY_STORY.register('ch11', async function (K) {
    await K.step('d11_open', async function () {
      K.flag('ch11', true);
      await K.title('第十一章', '観測されていたのは誰か');
      await K.say([
        '#scene center_office A', '#amb rain',
        'n:雨の夜。',
        'p:あの人のことを、もっと知りたいんです。', 'y:B-30か。', 'p:名前も知らない人です。でも、私たちはあの人の部屋を見て、未来まで見た。',
        'p:向こうからは、どう見えていたんだろう、って。',
        'y:……どう見えていたか、か。', 'n:ユウが少し黙った。',
        'y:お前が来る前の話だ。この分室には、受動観測の試験運用があった。向こうの世界を、こっちから黙って見るだけの試験。', 'y:アーカイブはサーバー室にまだ残ってるはずだ。',
      ]);
    });

    await K.step('d11_gather', async function () {
      await K.explore({
        hint: function (K) {
          var left = [];
          if (!K.got('d11_obs_log')) left.push('サーバー室の受動観測アーカイブを調べる');
          else if (!K.got('d11_test_strings')) left.push('アーカイブをもう一度調べる（同じフォルダに、まだ記録がある）');
          else if (!K.got('d11_missing')) left.push('アーカイブをもう一度調べて、送信記録を検索する');
          if (!K.got('d11_counter')) left.push('観測装置室の操作卓で第七章の録画をコマ送りし、そのコマを撮影する');
          return '受動観測と、第七章の録画を調べ直す：' + left.join('／');
        },
        areas: ['center_server', 'center_lab', 'center_office'],
        goal: function (K) { return K.got('d11_obs_log') && K.got('d11_test_strings') && K.got('d11_counter') && K.got('d11_missing'); }
      });
    });

    await K.step('d11_deduce', async function () {
      await K.say(['#scene center_office A', 'y:並べろ。今度は「向こう側」から考えるんだ。']);
      var ok = await K.deduce({
        id: 'd11_reverse',
        q: '画面の男性が感じていたかもしれない「誰かに見られている」怪異。その正体は？',
        options: [
          { id: 'ghost', text: '向こうの世界の幽霊', need: ['d11_counter'], refute: ['d11_obs_log'] },
          { id: 'mind', text: '男性の思い込み・疲れ', need: ['d8_b30'], refute: ['d11_counter'] },
          { id: 'us', text: 'こちら（分室）の境界観測が、向こうでは怪異に見えていた', need: ['d11_obs_log', 'd11_counter'] },
          { id: 'only444', text: '444番の誰かの仕業', need: ['d7_recv_scan'], refute: ['d11_test_strings'] },
        ],
        answer: 'us',
        hint: {
          ghost: '向こうの視聴者数が跳ねた時刻は、分室がつながった時刻と一致している。幽霊が、うちの接続に合わせて出るか？',
          mind: '思い込みなら、表示の数字までは変わらない。録画には 444 がはっきり残っている。',
          only444: '分室の送信試験の文字列と、向こうのコメントが同じだ。444だけでは説明できない部分がある。',
        },
        link: 2,
      });
      if (ok) {
        K.flag('d11_reverse', true);
        await K.say([
          'p:私たちは、知らない配信者を見ていた。',
          'p:向こうから見れば、知らない「視聴者」が、こっちを見ていた。',
          'p:視聴者数が一瞬だけ跳ねる。雨の音に混じる、聞こえないはずの声。送った覚えのない言葉がコメント欄に出る。',
          'y:……同じ出来事を、両側から見ていたわけか。',
          'p:かもしれない、です。「かもしれない」としか言えない。',
        ]);
      }
    });

    await K.step('d11_partial', async function () {
      var v = await K.deduce({
        id: 'd11_partial',
        q: '向こうで起きていた怪異は、すべて分室の観測で説明できるか',
        options: [
          { id: 'all', text: 'すべて説明できる', need: ['d11_test_strings'], refute: ['d11_missing'] },
          { id: 'some', text: '一部だけ。分室から送っていない言葉が残る', need: ['d11_test_strings', 'd11_missing'] },
          { id: 'none', text: '何も説明できない（全部偶然）', need: ['d11_counter'], refute: ['d11_test_strings'] },
        ],
        answer: 'some',
        hint: {
          all: '「30日目まで見ています」「寝たら終わりますよ」――この二つは、分室の送信記録に一度も出てこない。',
          none: '送信試験の文字列が、向こうのコメントと一字一句同じだ。全部が偶然とは言えない。',
        },
        link: 2,
      });
      await K.say([
        'p:分室が送った言葉は三つ。でも、向こうのコメント欄には、もっと多くの「知らない言葉」があったはず。',
        'p:「30日目まで見ています」。「寝たら終わりますよ」。',
        'y:それを書いたのは、俺たちじゃない。',
        'm:……444番、か。',
        'n:いつの間にか、御堂室長が戸口に立っていた。',
      ]);
      K.note('b30', 'b30_reverse', { title: '観測されていたのは誰か', text: '分室の受動観測は、向こうでは「知らない視聴者」「聞こえないはずの声」として現れていた可能性がある。ただし、分室が送っていない言葉が残っている。', solved: true });
      if (K.has('d9_day30') && K.has('d11_reverse')) K.flag('myst_b30', true);
    });

    await K.step('d11_ui', async function () {
      await K.say(['#scene center_office A', '#amb clock', 'n:深夜。一人でアーカイブの続きを読んでいた。', 'n:目が疲れて、まばたきを一つ――']);
      await K.mainUI(1400);
      await K.say(['#wait 1500', 'p:……何だ、今の？', 'n:画面の右上に、一瞬だけ、知らない表示があった気がした。', 'n:体力。疲労。精神。……残り日数。', 'n:もう、何もない。', 'p:疲れてるんだ。たぶん。']);
      var c = await K.choice('向こうの男性に、言えるとしたら', [
        { t: '「見ていてごめんなさい」', v: 'sorry', s: '謝りたい' },
        { t: '「あなたのことを、記録に残します」', v: 'record', s: '観測を続ける' },
        { t: '……何も言えない', v: 'none', s: 'まだ分からない' },
      ]);
      K.flag('d11_feel', c);
      if (c === 'sorry') await K.say(['p:勝手に見て、勝手に怖がらせていたのかもしれない。', 'y:謝る相手がどこにいるのかも分からないのにな。', 'p:だから、言いたいんです。']);
      if (c === 'record') await K.say(['p:記録は、誰かの味方になれる。……室長が最初の日に言いました。', 'y:向こうの味方にも、か。', 'p:そうであってほしいです。']);
      if (c === 'none') await K.say(['p:何を言っても、ずるい気がします。', 'y:……そうだな。']);
      K.flag('ch11_done', true);
    });
  });
})();
