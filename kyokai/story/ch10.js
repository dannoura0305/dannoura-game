/* ══════════════════════════════════════════════════════════
   kyokai/story/ch10.js — 第十章「入れ替わる人間」（担当D）
   町で別の世界の人との入れ替わりが始まる（坂口さん：八百屋 → 時計屋）／証言推理
   → 観測装置が一人の男性の複数の未来を映す（本編で見たエンディングに対応する未来に印）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN10 = function (K) { return K.has('ch10') && !K.has('ch10_done'); };

  // 五つの未来（本編のエンディング種別との対応）
  P2.FUTURES = [
    { id: 'success', ends: ['debtfree', 'rebirth', 'normal', 'father'], label: '成功している',
      lines: ['n:一つ目。昼の光の入る部屋。机の上の書類はきれいに片づいて、男性が誰かと電話で笑っている。', 'n:窓辺に、子どもの描いた絵が増えている。'] },
    { id: 'cert', ends: ['engineer'], label: '資格を大量に取得した',
      lines: ['n:二つ目。作業着の男性。工場の配管の前で、若い作業員に何かを教えている。', 'n:部屋の壁には、額に入った資格証が何枚も並んでいる。'] },
    { id: 'stream', ends: ['king'], label: '深夜配信で大きな存在になった',
      lines: ['n:三つ目。同じ暗い部屋。けれどモニターのコメント欄が、滝のように流れている。', 'n:視聴者数の桁が、ほかの映像より二つ多い。'] },
    { id: 'tired', ends: ['collapse', 'bankrupt'], label: '完全に疲弊している',
      lines: ['n:四つ目。机に突っ伏した背中。モニターだけが光っている。', 'n:配信は始まっていない。マイクの前で、何かを言おうとして、やめている。'] },
    { id: 'gone', ends: ['flame'], label: '途中で記録が消えている',
      lines: ['n:五つ目。映像が始まってすぐ、コメント欄が真っ赤に埋まる。', '#fx noise', 'n:そこで、記録が途切れている。'] },
  ];

  P2.area('shotengai', { name: '月代商店街', worlds: {
    A: { scene: 'shotengai', spots: [
      { id: 'd10_sakaguchi', obj: 'shopkeeper', x: .08, y: .4, w: .18, h: .4, label: '坂口さん（時計屋？）', acts: ['talk', 'scan', 'record'], cond: IN10,
        on: {
          talk: async function (K) {
            await K.say(['n:八百屋だった店先に、振り子時計が並んでいる。', 'x:坂口|いらっしゃい。電池交換？　ああ、分室の人か。', 'p:坂口さん……ここは、八百屋さんでしたよね。', 'x:坂口|八百屋？　うちは親父の代から時計屋だよ。隣町の話かい。', 'x:坂口|それより、あんた誰だっけ。前に会ったかな。', 'n:嘘をついている顔ではない。困ったように笑っている。']);
            K.gain('d10_tes_shop');
          },
          scan: async function (K) { await K.say(['#se beep', 't:体温 36.4℃／脈拍 72', 't:境界反応：足元（影）のみ B側 2.2', 'p:影だけが、別の世界に傾いている。']); K.gain('d10_shadow_scan'); },
          record: async function (K) { await K.say(['#se rec', 'x:坂口|録るの？　……三代続いた時計屋だ。ちゃんと残してくれよ。']); }
        } },
      { id: 'd10_rumor', obj: 'shopkeeper', x: .5, y: .45, w: .16, h: .38, label: '柏木さん', acts: ['talk'], cond: IN10,
        on: { talk: async function (K) { await K.say(['x:柏木|坂口さん？　……昨日まで八百屋だったよね。私だけ？', 'x:柏木|今朝、商店会の名簿見たら「坂口時計店」って印刷されてるの。紙ごと。', 'x:柏木|怖いのはさ、坂口さん本人が全然困ってないことよ。']); } } },
    ] },
    B: { scene: 'shotengai', spots: [
      { id: 'd10_shop_b', obj: 'shop_3', x: .08, y: .3, w: .2, h: .45, label: '坂口時計店', acts: ['look', 'photo'], cond: IN10,
        on: {
          look: async function (K) { await K.say(['n:別の歴史の商店街。そこには、古い看板の「坂口時計店」がある。', 'n:店先の振り子時計の並びまで、さっきの店とそっくりだ。', 'n:店の奥では、エプロン姿の坂口さんが――大根を並べて困った顔をしている。']); },
          photo: async function (K) { await K.say(['#se shutter', 'n:坂口時計店を撮った。奥の坂口さんは、ピントが合わなかった。']); K.gain('d10_shop_b'); }
        } },
    ] },
  } });
  P2.area('residential', { name: '住宅街', worlds: { A: { scene: 'residential', spots: [
    { id: 'd10_hayase', obj: 'house_1', x: .15, y: .4, w: .16, h: .4, label: '早瀬さん', acts: ['talk', 'scan'], cond: IN10,
      on: {
        talk: async function (K) { await K.say(['x:早瀬|夫がね、今朝から左手でお箸を持ってるの。', 'x:早瀬|本人は「昔からだ」って。結婚して二十年、右だったのに。', 'x:早瀬|でもね。……優しいのよ。前より、ちょっとだけ。', 'x:早瀬|困ってるのは私だけ。困ってるって言っていいのかも、分からない。', 'p:……記録しておきます。早瀬さんが困っていることも、ちゃんと。']); },
        scan: async function (K) { await K.say(['t:早瀬さん：境界反応 ―', 'n:早瀬さん本人には、何の反応もない。入れ替わったのは、ご主人のほうだ。']); }
      } },
    { id: 'd10_miura', obj: 'house_3', x: .6, y: .42, w: .16, h: .4, label: '三浦さん', acts: ['talk'], cond: IN10,
      on: { talk: async function (K) { await K.say(['x:三浦|入れ替わり？　うちは平気よ。', 'x:三浦|……ただ、ゆうべ、また女の子に「お母さん」って呼ばれたの。今度はちゃんと顔を見た。', 'x:三浦|ランドセルに「月代第二小」って縫い取りがあった。', 'p:（ナギさんと同じ学校……？）', 'x:三浦|あの子、私の顔を見て「間違えました」って謝ったのよ。……間違えたのは、どっちなのかしらね。']); } } },
  ] } } });
  P2.area('school', { name: '月代小学校', worlds: { A: { scene: 'school', spots: [
    { id: 'd10_terada', obj: 'lit_window', x: .1, y: .45, w: .16, h: .4, label: '宿直室の寺田さん', acts: ['talk'], cond: IN10,
      on: { talk: async function (K) {
        await K.say(['x:寺田|最近、子どもらが変な噂をしててね。「よるのひと」がどうとか。']);
        await P2.t444(K, 'rumor', ['x:寺田|夜中にテレビをつけると、黒い画面に「よんよんよん」って数字が出て、ずっとこっちを見てる人がいるんだと。', 'x:寺田|見てるだけで、なんにもしないんだって。……それが一番気味悪いって、子どもらは言うんだ。'], { title: '子どもたちの噂', text: '「よるのひと」。真夜中の黒い画面に「444」。見ているだけで、何もしない。' });
      } } },
  ] } } });

  /* ── 第十章 ── */
  window.KY_STORY.register('ch10', async function (K) {
    await K.step('d10_open', async function () {
      K.flag('ch10', true);
      await K.title('第十章', '入れ替わる人間');
      await K.say([
        '#scene center_office A', '#amb clock',
        'x:佐伯|室長、また電話です。今日だけで七件目。',
        'm:内容は。', 'x:佐伯|「家族が少し違う」「隣の人が別人」「夫の利き手が逆」……。',
        'y:境界が、人を通しはじめてる。', 'm:別の世界の誰かと、こっちの誰かが入れ替わっている、ということか。',
        'p:本人たちは。', 'x:佐伯|入れ替わった本人は、みんな平気なんです。困ってるのは周りの人だけ。',
        'm:商店街の坂口さんから行ってみてくれ。……あの人の店が「変わった」という電話が三件来てる。',
      ]);
      if (K.sync) K.sync(4);
      K.equip('anchor');
      await K.say(['m:それから、これを持っていきなさい。本部から届いた試作品だ。「存在固定装置」。', 'm:境界の中で、自分がずれていく速さを半分にしてくれる。……半分だけだがね。']);
      K.note('case', 'd10_case', { title: '入れ替わる人々', text: '町の何人かが、別の世界の同じ人と入れ替わっている。本人は困っていない。' });
    });

    await K.step('d10_shop', async function () {
      await K.explore({
        hint: '坂口さんを調べる（話を聞く・スキャン・別の世界の商店街）',
        areas: ['shotengai', 'school', 'residential', 'center_office'],
        goal: function (K) { return K.got('d10_tes_shop') && K.got('d10_shop_b') && K.got('d10_shadow_scan'); }
      });
      var ok = await K.deduce({
        id: 'd10_swap',
        q: '時計屋の坂口さんは、誰なのか',
        options: [
          { id: 'lie', text: '坂口さんが嘘をついている', need: ['d10_tes_shop'], refute: ['d10_shadow_scan'] },
          { id: 'memory', text: '坂口さんの記憶がおかしくなった', need: ['d10_tes_shop'], refute: ['d10_shop_b'] },
          { id: 'swap', text: '別の世界で時計屋を営む坂口さんと、入れ替わった', need: ['d10_tes_shop', 'd10_shop_b'] },
        ],
        answer: 'swap',
        hint: {
          lie: '嘘をつく理由がない。それに、店ごと――名簿の印刷まで変わっている。',
          memory: '記憶だけの問題なら、別の世界に「坂口時計店」が本当にある説明がつかない。',
        },
        link: 2,
      });
      if (ok) await K.say([
        'p:どちらの坂口さんも、嘘はついていない。', 'p:時計屋の坂口さんの記憶は、時計屋の世界のもの。',
        'y:証言が食い違ったら、誰かが嘘をついてる――ここではそれが通用しない。',
        'p:二人を元に戻せますか。', 'm:同期Lv4なら、物を向こうへ渡せる。……「自分の物」を渡せば、持ち主は帰り道を思い出すかもしれない。',
        '#scene shotengai A',
        'n:私は時計屋の坂口さんから振り子時計を一つ借りて、シロと一緒に境界の向こうへ差し出した。',
        'n:向こうからは、泥のついた大根が一本、渡ってきた。',
        '#fx flash', '#se whistle',
        'n:……店先の振り子時計が、段ボールの野菜に変わっていた。',
        'x:坂口|あれ、あんた分室の。なんで大根なんか持ってんの？　うちの？',
        'p:……はい。お返しします。',
      ]);
      K.note('case', 'd10_case', { title: '入れ替わる人々', text: '別の世界の「同じ人」と入れ替わっていた。証言が食い違っても、全員が正しいことがある。持ち主の物を渡すと戻る。', solved: true });
    });

    await K.step('d10_futures', async function () {
      var L = P2.link(), seen = L.endings;
      await K.say([
        '#scene center_lab A', '#amb wire',
        'n:その夜、観測装置が勝手に動いた。', 'n:町の入れ替わりで境界がゆるんだせいか、モニターに、あの暗い部屋が映る。',
        'm:……待て。一つじゃない。',
        'n:画面が五つに割れた。どれも同じ男性。どれも、これから先の――未来の像。',
        '#scene stream_room',
      ]);
      for (var i = 0; i < P2.FUTURES.length; i++) {
        var f = P2.FUTURES[i], hit = f.ends.some(function (e) { return seen.indexOf(e) >= 0; });
        P2.view(K, f.id === 'success' ? { variant: 'success' } : f.id === 'cert' ? { variant: 'study' } : f.id === 'stream' ? { variant: 'stream' } : f.id === 'gone' ? { variant: 'collapse', noise: .8 } : { noise: .45 });
        await K.say(['t:未来観測 ' + (i + 1) + '／5　' + f.label + (hit ? '　［既観測］' : '')].concat(f.lines).concat(hit ? ['n:この像にだけ、装置が「すでに一度観測された未来」の印をつけている。誰が観測したのかは、記録にない。'] : []));
      }
      K.gain('d10_futures'); K.flag('d10_futures', true);
      await K.say([
        '#wait 300',
      ]);
      P2.view(K, {});
      await K.say([
        '#scene center_lab A',
        '#wait 600',
        'p:同じ人ですよね？',
        'm:ああ。どれも同じ人間だ。',
        'p:どれが本物なんです？',
        'm:その質問自体が間違っている。全部、本物なんだ。',
        '#wait 800',
        'y:……全部、か。',
        'm:一日ごとの小さな選択が、三十日でこれだけ違う場所へ行く。',
        'm:B-30 の「30」は、そういう意味かもしれないね。',
        'n:五つの画面が、一つずつ消えていく。最後に残ったのは、どの未来でもない、今夜の暗い部屋だった。',
        'n:男性がマイクに向かって、何か小さく歌っている。音は届かない。',
        '#fx noise',
      ]);
      K.note('b30', 'b30_futures', { title: 'B-30 の複数の未来', text: '成功・資格・配信・疲弊・途絶。すべて同じ男性の、本物の未来。', solved: true });
      K.flag('ch10_done', true);
    });
  });
})();
