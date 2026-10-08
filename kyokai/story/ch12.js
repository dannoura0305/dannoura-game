/* ══════════════════════════════════════════════════════════
   kyokai/story/ch12.js — 第十二章「444番目の観測者」（担当D）
   観測者番号 001, 002, 003 …… 444。登録名不明・所属なし・観測方法不明・接続元不明。
   推理で分かるのは「どこにも属していない」ことだけ。正体は最後まで明かさない。
   任意：ナギの家（myst_nagi）／シロの同時観測（myst_shiro）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN12 = function (K) { return K.has('ch12') && !K.has('ch12_done'); };

  P2.area('bureau', { name: '境界現象対策局', worlds: { C: { scene: 'bureau', spots: [
    { id: 'd12_reg', obj: 'observer_panel', x: .2, y: .4, w: .26, h: .32, label: '観測者名簿', acts: ['look', 'scan'], cond: IN12,
      on: {
        look: async function (K) {
          P2.view(K, { flags: { observers: true } });
          await K.say(['n:右の表示板に、対策局の観測者名簿。',
            't:001　御堂　分室', 't:002　如月　分室', 't:003　' + P2.nm(K) + '　対策局', 't:004　佐伯　分室', 't:005 …… 017',
            't:444　――　所属なし　観測方法：不明　接続元：不明',
            'n:017 の次が、いきなり 444。間に何もない。']);
          K.gain('d12_registry');
          P2.view(K, {});
        },
        scan: async function (K) { await K.say(['t:444 の項目　作成日時：不明　更新日時：いま', 'p:……更新日時が「いま」。読んでいる最中に、書き換わっている。']); }
      } },
  ] } } });
  P2.area('old_lab', { name: '旧研究施設', worlds: { C: { scene: 'old_lab', spots: [
    { id: 'd12_notes', obj: 'shelf', x: .62, y: .4, w: .24, h: .32, label: '研究ノート', acts: ['look', 'photo'], cond: IN12,
      on: {
        look: async function (K) { await K.say(['n:崩れた研究室に、新しいノートが一冊だけ置いてある。誰かが最近まで、ここに通っていた。', 'n:観測者の一覧。分室、対策局、そして「K」で始まる番号がいくつも。', 'n:444 の欄にだけ、赤いペンで――', 't:誰だ', 'p:このノートの持ち主にも、分からない。']); },
        photo: async function (K) { await K.say(['#se shutter', 'n:ノートを撮った。表紙の名前は、九条。']); K.gain('d12_kujo_list'); K.flag('kujo_note', true); }
      } },
  ] } } });
  P2.area('center_server', { name: 'サーバー室', worlds: { A: { scene: 'center_server', spots: [
    { id: 'd12_conn', obj: 'log_terminal', x: .12, y: .4, w: .28, h: .3, label: '接続履歴', acts: ['look'], cond: IN12,
      on: { look: async function (K) {
        await K.say(['n:分室のサーバーで、444 の接続履歴を引く。', 't:接続先：月代町の端末（2:44:44）', 't:接続先：分室', 't:接続先：対策局', 't:接続先：B-30 配信 × 多数', 'n:B-30 の配信に接続した夜は、どれも配信が深夜を越えた日だった。', 'p:あの人の配信を、ずっと見ている。']);
        K.gain('d12_444_streams');
      } } },
  ] } } });
  P2.area('residential', { name: '住宅街', worlds: { B: { scene: 'residential', spots: [
    { id: 'd12_nagihome', obj: 'house_2', x: .4, y: .35, w: .22, h: .4, label: '三丁目十四番の家', acts: ['look', 'photo'], cond: IN12,
      on: {
        look: async function (K) { await K.say(['n:こちらの世界では売家の前の空き地だった場所に、二階建ての家がある。', 'n:表札。窓辺に「月代鉄道」の時刻表。物干しに、小さな体操服。', 'n:台所の窓に、人影。誰かが夕飯を作っている。']); },
        photo: async function (K) { await K.say(['#se shutter', 'n:家を撮った。']); K.gain('d12_nagi_home'); }
      } },
  ] } } });
  P2.area('center_office', { name: '観測センター 分室', worlds: { A: { scene: 'center_office', spots: [
    { id: 'd12_nagi', x: .62, y: .45, w: .16, h: .4, label: 'ナギ', acts: ['talk'], cond: function (K) { return IN12(K) && !K.has('myst_nagi'); },
      on: { talk: async function (K) {
        if (!K.got('d12_nagi_home')) { await K.say(['g:お母さん、ナギのこと探してるかな。', 'p:……きっと。', 'n:ナギの家は、別の世界の三丁目十四番にある――はずだ。']); return; }
        await K.say(['p:ナギさん。家、見てきたよ。', 'g:……ほんと？', 'p:窓に時刻表が貼ってあった。台所に、誰かいた。', 'g:お母さんだ。', 'n:ナギは膝を抱えて、少しだけ泣いた。',
          'g:ねえ。テレビの人のこと、見てるもう一人の人、知ってる？', 'p:もう一人？', 'g:よんよんよんの人。テレビの人も、ナギのことも、町のことも、ぜんぶ見てる。', 'g:でも、どこにもいないの。駅にも、学校にも、どっちの町にも。',
          'p:怖い人？', 'g:わかんない。……見てるだけ。']);
        K.flag('myst_nagi', true);
        K.note('person', 'nagi_p2', { title: 'ナギ', text: '別の歴史の月代町（世界B）、三丁目十四番の家の子。母親が待っている。444 を「どこにもいない、見てるだけの人」と言う。', solved: true });
      } } },
  ] } } });
  P2.area('center_lab', { name: '観測装置室', worlds: { A: { scene: 'center_lab', spots: [
    { id: 'd12_shiro', obj: 'apparatus', x: .1, y: .55, w: .18, h: .3, label: 'シロ', acts: ['look', 'scan'], cond: function (K) { return IN12(K) && !K.has('myst_shiro'); },
      on: {
        look: async function (K) { await K.say(['s:きゅ。', 'n:シロが装置の上で、こちらを見ている。輪郭が、いつもより少しだけはっきりしている。']); },
        scan: async function (K) {
          await K.say(['n:三つの世界を同時にスキャンする。', 't:世界A　反応位置 (0.21,0.68)　波形 S', 't:世界B　反応位置 (0.21,0.68)　波形 S', 't:世界C　反応位置 (0.21,0.68)　波形 S', 'p:三つとも、まったく同じ。']);
          K.gain('d12_shiro_all');
          var ok = await K.deduce({
            id: 'd12_shiro',
            q: 'なぜシロだけは、どの世界でも「ずれない」のか',
            options: [
              { id: 'one', text: 'シロは世界Aの生き物で、ほかの世界は映っているだけ', need: ['d12_shiro_all'], refute: ['c5_shiro_scan'] },
              { id: 'many', text: '世界ごとに、そっくりな別のシロがいる', need: ['c5_shiro_photo'], refute: ['d12_shiro_all'] },
              { id: 'between', text: 'シロは境界そのものに棲んでいる。どの世界でも同じ一匹', need: ['d12_shiro_all', 'c5_shiro_scan'] },
            ],
            answer: 'between',
            hint: {
              one: '最初にシロを測ったとき、A・B・C の三つの波形が同時に出ていた。Aだけの生き物じゃない。',
              many: '別々の個体なら、位置も波形も少しずつずれるはずだ。三つともまったく同じ座標にいる。',
            },
            link: 2,
          });
          if (ok) {
            K.flag('myst_shiro', true);
            await K.say(['p:シロは、世界と世界の「間」にいる。だから、どの世界から見ても同じ形をしている。', 'y:境界の住人か。……世界が混ざったら、迷わないのはこいつだけだな。', 's:きゅ。']);
            K.note('creature', 'shiro_p2', { title: 'シロ', text: '境界そのものに棲む生き物。どの世界から観測しても同じ一匹。世界が混ざっても迷わない。', solved: true });
          }
        }
      } },
  ] } } });

  /* ── 第十二章 ── */
  window.KY_STORY.register('ch12', async function (K) {
    await K.step('d12_open', async function () {
      K.flag('ch12', true);
      await K.title('第十二章', '444番目の観測者');
      await K.say([
        '#scene center_office A', '#amb clock',
        'm:分室の観測者には番号がある。001 が私、002 が如月。', 'm:地下の記録は 003 で止まっていたね。',
        'p:対策局の名簿なら、もっと先まであるはずです。', 'm:もう一度、誰もいない側へ行けるか。', 'p:シロが一緒なら。', 's:きゅ。',
        'y:持ってけ。シロ同期装置。境界観測しても安定度が減らない。……シロが気にしてる場所も分かる。',
      ]);
      K.equip('shiro_link');
    });

    await K.step('d12_gather', async function () {
      await K.explore({
        hint: '444番の観測者を追う（対策局の名簿・誰もいない側（C）の旧研究施設・分室の接続履歴）',
        areas: ['bureau', 'old_lab', 'center_server', 'center_office', 'center_lab', 'residential', 'empty_town'],
        goal: function (K) { return K.got('d12_registry') && K.got('d12_kujo_list') && K.got('d12_444_streams'); }
      });
    });

    await K.step('d12_mido', async function () {
      await K.say([
        '#scene center_office A',
        'n:名簿の写しを、御堂室長の机に置いた。001、002、003……そして、444。',
        'm:これはうちの観測者じゃない。',
        'p:じゃあ誰です？',
        'm:分からない。',
        '#wait 700',
        'm:……三十年近くこの仕事をしてきて、こんなに正直に「分からない」と言ったのは初めてだよ。',
      ]);
      var ok = await K.deduce({
        id: 'd12_444',
        q: '444番の観測者は、どこに属しているのか',
        options: [
          { id: 'bureau', text: '境界現象対策局の観測者', need: ['d12_registry'], refute: ['d12_registry'] },
          { id: 'kujo', text: '九条という人物の仲間', need: ['d12_kujo_list'], refute: ['d12_kujo_list'] },
          { id: 'center', text: '分室の誰か（昔の職員）', need: ['d11_obs_log'], refute: ['d12_444_streams'] },
          { id: 'none', text: 'どこにも属していない', need: ['d12_registry', 'd12_kujo_list'] },
        ],
        answer: 'none',
        hint: {
          bureau: '対策局の名簿そのものに「所属なし」と書いてある。',
          kujo: '九条のノートには「誰だ」とある。九条にも分かっていない。',
          center: '分室が試験運用を止めたあとも、444 は B-30 の配信に接続し続けている。',
        },
        link: 2,
      });
      if (ok) {
        K.flag('d12_444', true);
        await K.say([
          'p:対策局でもない。分室でもない。九条という人でもない。',
          'p:どの世界の名簿にも載っていて、どの世界にも属していない。',
          'y:……それで、何をしてる。', 'p:見ています。月代町も、あの人の配信も。私たちのことも。',
          'y:見てるだけか。', 'p:見てるだけ、です。……今のところは。',
        ]);
      }
      await K.say(['#scene center_office A', '#amb clock',
        'n:その夜、一人で日報を書いていた。', 'n:ふと、私の端末の隅に、小さな数字が出ているのに気づいた。', 't:視聴者　1',
        'p:……視聴者？', 'n:瞬きをすると、もう消えていた。', 'n:誰かが、こちらを見ている。私たちがあの人を見ていたように。', 'n:そう思っても、不思議と怖くはなかった。怖くないのが、少しだけ怖かった。']);
      K.note('444', 'n444_who', { title: 'USER_444／444番の観測者', text: '登録名不明・所属なし・観測方法不明・接続元不明。B-30 の配信にも何度も接続。どこにも属していない。――正体は、分からない。', solved: false });
      K.flag('ch12_done', true);
    });
  });
})();
