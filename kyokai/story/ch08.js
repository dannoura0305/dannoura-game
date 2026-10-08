/* ══════════════════════════════════════════════════════════
   kyokai/story/ch08.js — 第八章「誰もいない月代町」（担当D）
   世界C（崩壊・無人）を探索（危険度3〜5、電力・存在安定度の管理、ヨドミからの逃走）
   → 境界現象対策局 → B-30 観測記録（本編データで差分。無ければ謎の男性）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY, P2 = KY.part2;
  var IN8 = function (K) { return K.has('ch8') && !K.has('ch8_done'); };

  /* ── B-30 の本文（KY_LINK.b30() の差分） ── */
  P2.b30Lines = function (K) {
    var L = P2.link(), b = L.b30, out = [
      't:境界観測記録 B-30',
      't:対象：男性',
      't:職業：設備関連業務',
      't:深夜に定期的な映像配信',
      't:対象周辺において低確率で境界ノイズを検出',
      't:特記事項：精神状態・睡眠状態により観測強度が変動している可能性',
      't:氏名：■■■■■（破損）',
    ];
    var img = ['n:添付の観測画像。暗い部屋、机、モニター、マイク。人物は後ろ姿で、ノイズの向こうにいる。'];
    if (b.study) img.push('n:机の端に、付箋だらけの資格の参考書。観測のたびに冊数が増えている、と注記がある。');
    if (b.factory) img.push('n:椅子の背に作業着。床に工具箱。画像の隅の注記「職場：工場設備の保全か」。');
    if (b.stream) img.push('n:配信画面のコメント欄が、静止画なのに読めないほど詰まっている。「視聴者：増加傾向」。');
    if (b.child) img.push('n:壁に、子どもが描いたような絵。小さな靴が一足、ドアのそばに。');
    if (b.unwell) img.push('t:追記：対象の生命反応低下（睡眠不足・過労の兆候）');
    if (b.variant === 'success') img.push('n:未来観測の一枚。同じ部屋で、男性が背筋を伸ばしてマイクに向かっている。肩の力が抜けていて、どこか自信がある。');
    if (b.variant === 'cert') img.push('n:未来観測の一枚。壁一面に、額に入った資格証が並んでいる。');
    if (b.variant === 'stream') img.push('n:未来観測の一枚。視聴者数の表示の桁が、ほかの画像より二つ多い。');
    if (b.variant === 'father') img.push('n:未来観測の一枚。部屋の明かりは消えていて、男性と小さな子が並んで眠っている。');
    if (b.variant === 'collapse') img.push('n:未来観測の一枚。部屋だけが映っている。本人がいない。椅子が少し回ったまま止まっている。', 't:観測映像　途絶（以後の記録なし）');
    if (!b.any) img.push('n:それ以上のことは、何も分からない。名前も知らない、どこかの誰か。');
    return { rec: out, img: img };
  };

  /* ── 場所（世界C） ── */
  // 誰もいない町の中心は危険度4（5は最終章の崩壊にとっておく）
  if (KY.AREAS && KY.AREAS.empty_town && KY.AREAS.empty_town.danger) KY.AREAS.empty_town.danger.C = 4;
  P2.area('empty_town', {
    name: '誰もいない月代町', map: { x: .52, y: .88 }, danger: { C: 4 },
    worlds: {
      C: { scene: 'empty_town', spots: [
        { id: 'd8_clocks', obj: 'street_clock', x: .06, y: .18, w: .24, h: .3, label: '止まった時計', acts: ['look', 'photo', 'scan'], cond: IN8,
          on: {
            look: async function (K) { await K.say(['#se clock', 'n:通りの時計。店先の掛け時計。腕時計の露店。見える時計が全部、2時17分 を指して止まっている。', 'n:一つだけ、秒針が逆に回っている。']); },
            photo: async function (K) { await K.say(['#se shutter', 'n:止まった時計たちを撮る。逆回りの秒針は、写真の中でも止まらなかった。']); K.gain('d8_empty_clock'); },
            scan: async function (K) { await K.say(['t:境界反応 4.1／時刻情報：取得不能', 'p:ここでは、時間が「2時17分」のまま止まっている……？']); }
          } },
        { id: 'd8_sign', obj: 'far_tower', x: .62, y: .2, w: .2, h: .3, label: '地平の白い塔', acts: ['look', 'photo'], cond: IN8,
          on: {
            look: async function (K) {
              await K.say(['n:町並みの向こう、白い空の地平に、白い塔が一本。', 'n:足元の白紙の看板に、一瞬だけ文字が浮かんで消えた。「境界現象対策局 月代支局 →」', 'n:矢印の先も、塔の方角も、分室のある場所だ。', 'p:……分室の場所に？']);
              K.flag('d8_sign_seen', true);
            },
            photo: async function (K) { await K.say(['#se shutter', 'n:塔を撮った。地図と照らし合わせると、やはり分室の場所だ。']); K.flag('d8_sign_seen', true); }
          } },
        { id: 'd8_radio', obj: 'bus_stop', x: .4, y: .55, w: .2, h: .3, label: 'バス停の無線', acts: ['talk'], cond: IN8,
          on: { talk: async function (K) { await K.say(['#se static', 'y:……聞こえるか。こっちからは、お前の端末の位置しか見えない。', 'y:電力を使いすぎるな。安定度が30を切ったら、何をしていても戻れ。', 'p:戻り方が分かりません。', 'y:……シロに聞け。']); } } },
      ] }
    }
  });
  P2.area('shotengai', { name: '月代商店街', danger: { C: 3 }, worlds: { C: { scene: 'shotengai', spots: [
    { id: 'd8_conv', obj: 'shop_3', x: .66, y: .38, w: .2, h: .38, label: '割れたコンビニ', acts: ['look'], cond: IN8,
      on: { look: async function (K) {
        if (K.has('d8_batt_taken')) { await K.say(['n:棚はもう空っぽだ。']); return; }
        await K.say(['n:割れたガラスの奥、レジ横の棚。乾電池と、包装の破れていない携帯電源が残っていた。', 'n:誰もいない店で、何かを取ることにためらいが残る。……ごめんなさい。']);
        K.item('battery', 8); K.item('light', 1); K.flag('d8_batt_taken', true);
      } } },
    { id: 'd8_term444', obj: 'vending', x: .18, y: .5, w: .14, h: .22, label: '壊れた端末', acts: ['look', 'scan'], cond: IN8,
      on: {
        look: async function (K) { await K.say(['n:店先に倒れた決済端末。画面が割れている。']); },
        scan: async function (K) {
          await K.say(['#se beep', 't:電源：なし／表示：あり']);
          await P2.t444(K, 'shop_term', ['n:電源の切れた画面に、電波強度の棒が四本。その横に数字が三つ。', 't:444', 'n:次の瞬間、何も映っていなかった。'], { title: '誰もいない町の端末', text: '世界Cの商店街。電源のない決済端末に、一瞬だけ「444」。' });
        }
      } },
  ] } } });
  P2.area('school', { name: '月代小学校', danger: { C: 4 }, worlds: { C: { scene: 'school', spots: [
    { id: 'd8_board', x: .3, y: .12, w: .4, h: .3, label: '黒板', acts: ['look', 'photo'], cond: IN8,
      on: {
        look: async function (K) { await K.say(['n:無人の教室の黒板に、チョークの「正」の字が並んでいる。', 'n:一つ、二つ……六つ。三十。', 'n:誰が、何を数えたのか。']); },
        photo: async function (K) { await K.say(['#se shutter', 'n:黒板を撮った。']); K.gain('d8_school_board'); }
      } },
    { id: 'd8_infirm', x: .76, y: .4, w: .18, h: .35, label: '保健室の戸棚', acts: ['look'], cond: IN8,
      on: { look: async function (K) {
        if (K.has('d8_med_taken')) { await K.say(['n:戸棚は空だ。']); return; }
        await K.say(['n:保健室の戸棚に、未開封の救急箱と、見慣れない銀色のアンプル。', 't:境界安定剤（対策局支給）', 'p:……支給品？　この世界の「私たち」の？']);
        K.item('med', 1); K.item('stab', 1); K.flag('d8_med_taken', true);
      } } },
  ] } } });
  P2.area('residential', { name: '住宅街', danger: { C: 3 }, worlds: { C: { scene: 'residential', spots: [
    { id: 'd8_alley', obj: 'house_2', x: .4, y: .35, w: .22, h: .45, label: '崩れた家の奥', acts: ['look', 'record'], cond: function (K) { return IN8(K) && !K.has('d8_chased'); },
      on: {
        look: async function (K) { await P2.chase8(K); },
        record: async function (K) { await K.say(['#se rec', 'n:路地の奥から、人の声を逆に回したような音。', 'p:……ヨドミ。']); await P2.chase8(K); }
      } },
    { id: 'd8_lot', obj: 'pole', x: .1, y: .55, w: .2, h: .3, label: '電柱の住所札', acts: ['look'], cond: IN8,
      on: { look: async function (K) { await K.say(['n:電柱の住所札。「月代町三丁目」。', 'n:足元の雑草の中に、汽車の時刻表の切れ端が落ちていた。この世界にも、どこかで汽車が走っていたのかもしれない。']); } } },
  ] } } });

  P2.area('station', { name: '月代駅', danger: { C: 5 }, worlds: { C: { scene: 'station_ruin', spots: [
    { id: 'd8_platform', obj: 'name_board', x: .3, y: .45, w: .36, h: .3, label: '崩れたホーム', acts: ['look', 'record', 'scan'], cond: IN8,
      on: {
        look: async function (K) { await K.say(['n:誰もいない世界の月代駅。ホームは崩れ、レールは途中で宙に消えている。', 'n:それなのに、時刻表の「2:17」の欄だけが新しい紙に貼り替えられていた。', 'y:（無線）そこは危険度5だ。長居するな。']); },
        record: async function (K) { await K.say(['#se whistle', 'n:録音機が、汽笛を拾った。', 'n:列車は来ない。音だけが、ホームを通り過ぎていく。', 'n:通り過ぎた後に、窓の灯りの残像が、二両分。']); },
        scan: async function (K) { await K.say(['t:境界反応 5.0（上限）', 't:世界：C → B → C → A → C', 'p:ここは、いくつもの世界の「通り道」だ。']); }
      } },
  ] } } });
  P2.area('shrine', { name: '月代神社', danger: { C: 3 }, worlds: { C: { scene: 'shrine', spots: [
    { id: 'd8_ema', obj: 'ema', x: .55, y: .4, w: .2, h: .25, label: '絵馬掛け', acts: ['look'], cond: IN8,
      on: { look: async function (K) { await K.say(['n:誰もいない神社。絵馬掛けに、絵馬が一枚も残っていない。', 'n:紐だけが、願い事の数だけ揺れている。', 'n:――いや。一枚だけ。裏返しで、何も書かれていない絵馬。', 'p:誰の願いも、ここには届かなかったのかな。']); } } },
  ] } } });

  P2.area('center_lab', { name: '観測装置室', worlds: { A: { scene: 'center_lab', spots: [
    { id: 'd8_return', obj: 'apparatus', x: .41, y: .47, w: .19, h: .32, label: 'シロ（誰もいない側へ戻る）', acts: ['look'],
      cond: function (K) { return IN8(K) && K.has('empty_town_open') && K.state.baseWorld !== 'C'; },
      on: { look: async function (K) { await K.say(['s:きゅ。', 'y:……まだ行くのか。', 'p:途中です。', 'n:シロに指先を触れる。視界の端が、白くほどけていく。', '#se whistle']); K.setWorld('C'); } } },
  ] } } });

  P2.chase8 = async function (K) {
    await K.say(['#amb voices', 'n:路地の奥の黒い溜まりが、こちらへ形を持ち上げた。', 's:きゅっ！', 'p:――ヨドミ！']);
    var safe = await K.chase({
      id: 'd8_yodomi', time: 6,
      intro: ['n:黒い影が路地を這ってくる。人の声を逆に回したような音。', 'n:シロが毛を逆立てている。端末の電力は残り少ない。'],
      rounds: [
        { text: '影が路地の入口をふさいだ。左に塀、右に植え込み。', ok: ['hide'] },
        { text: '影が塀の上から覗き込む。輪郭が光を嫌うように揺れた。', ok: ['repel'] },
        { text: '道が開いた。大通りまで二十メートル。', ok: ['run'] },
      ],
    });
    await K.say([safe ? 'n:影は塀の向こうで輪郭を失い、逆再生の声だけがしばらく残った。' : 'n:足首に冷たいものが触れた。……シロが鳴いて、影が退いた。']);
    K.flag('d8_chased', true);
    await K.say(['#amb off', 'n:静かになった。', 'n:影がいたところに、紙が一枚落ちている。', 't:境界現象対策局　夜間巡回表　月代支局', 'p:支局……あの標識の。']);
  };

  P2.area('bureau', {
    name: '境界現象対策局', map: { x: .27, y: .72 }, danger: { C: 4 }, cond: function (K) { return K.has('d8_bureau_open'); },
    worlds: {
      C: { scene: 'bureau', spots: [
        { id: 'd8_plate', obj: 'sign', x: .04, y: .2, w: .16, h: .14, label: '室名の札', acts: ['look', 'photo'],
          on: {
            look: async function (K) { await K.say(['n:札「境界現象対策局 第三記録保管室」。', 'n:その下に、小さな銘板。「月代支局（旧 特殊現象観測センター月代分室）」。', 'n:刻まれた年号は、こちらの暦より先だ。']); K.gain('d8_bureau_plate'); },
            photo: async function (K) { await K.say(['#se shutter']); K.gain('d8_bureau_plate'); }
          } },
        { id: 'd8_locker', obj: 'archive', x: .74, y: .3, w: .16, h: .45, label: '保管棚の引き出し', acts: ['look'],
          on: { look: async function (K) {
            if (K.got('d8_bureau_badge')) { await K.say(['n:空の引き出し。名札の跡。']); return; }
            var n = P2.nm(K);
            await K.say(['n:記録シリンダーの並ぶ保管棚。いちばん下の引き出しに、名札。「' + n + '」。', 'n:中に職員証が一枚。', 't:境界現象対策局　主任観測員　' + n, 'p:…………', 'p:私は、こんな部署にいた……？', '#fx glitch']);
            K.gain('d8_bureau_badge'); K.stab(-5);
          } } },
        { id: 'd8_cctv', obj: 'observer_panel', x: .42, y: .08, w: .18, h: .2, label: '右の表示板（入退室）', acts: ['look', 'photo'], cond: function (K) { return !K.has('ch12'); },
          on: {
            look: async function (K) {
              await K.say(['n:右の表示板。局内の監視カメラの映像と、入退室の記録。どの画面にも人はいない。在室者表示「0」。']);
              await P2.t444(K, 'cctv', ['n:入退室記録の最後の行だけ、名前の代わりに番号がある。', 't:2:44　入室　444　（退室記録なし）', 'p:……誰もいないのに。'], { title: '対策局の入退室記録', text: '無人の対策局。最後の入室者「444」。退室の記録はない。' });
              K.gain('d8_cctv');
            },
            photo: async function (K) { await K.say(['#se shutter', 'n:モニターを撮った。写真では、在室者表示が「1」になっていた。']); K.gain('d8_cctv'); }
          } },
        { id: 'd8_archive', obj: 'terminal', x: .2, y: .4, w: .26, h: .32, label: '記録端末', acts: ['look', 'scan'],
          on: {
            look: async function (K) {
              if (!K.has('b30_read')) { await P2.readB30(K); return; }
              await K.say(['n:B-30 の画面のまま、端末は止まっている。']);
            },
            scan: async function (K) { await K.say(['t:境界反応 3.0／記録媒体：対策局標準', 'n:端末だけが、まだ生きている。']); }
          } },
      ] }
    }
  });

  P2.readB30 = async function (K) {
    await K.say(['n:端末を起こす。大量の異常記録の一覧。月代町の事件番号が延々と続く。', 'n:その中に、一件だけ。月代町と関係のない記録がある。', '#se beep']);
    var t = P2.b30Lines(K);
    P2.view(K, { flags: { b30: true } });
    await K.say(t.rec);
    var rv = P2.roomVariant();
    P2.view(K, rv ? { variant: rv, noise: .35 } : { noise: .5 });
    await K.say(['#fx noise', '#scene stream_room']);
    await K.say(t.img);
    P2.view(K, {});
    await K.say(['#scene bureau C']);
    var tf = +K.get('traces_found') || 0;
    if (tf >= 2) await K.say(['p:……参考書。マイク。工具箱。子どもの絵。', 'p:別々の世界で、別々に見つけた物。それが、この一枚の画像の中に全部ある。', 'p:同じ人の、持ち物だった……？']);
    else if (K.has('glimpse_stream')) await K.say(['p:この部屋……シロを追ったときに一瞬だけ見えた、あの配信の部屋だ。']);
    K.gain('d8_b30'); K.gain('d8_b30_image'); K.flag('b30_read', true);
    await K.say(['#se static', 'y:……読める。設備関連、深夜の配信。', 'y:あの画面の男か。', 'p:名前の欄だけ、壊れています。', 'y:わざと壊したのか、壊れたのか。', 'p:……私たちが受信した配信と、この記録。同じ人だとしたら。', 'p:どうして、この世界の「対策局」が、あの人を観測していたんでしょう。']);
    K.note('b30', 'b30_rec', { title: '境界観測記録 B-30', text: '対象：男性。設備関連業務。深夜に定期的な映像配信。境界ノイズ。精神・睡眠状態で観測強度が変動。氏名破損。' });
    K.note('person', 'd7_man', { title: '画面の男性（B-30？）', text: '深夜に一人で配信している男性。対策局の記録 B-30 の対象と同一人物の可能性。名前は分からない。' });
  };

  /* ── 第八章 ── */
  window.KY_STORY.register('ch08', async function (K) {
    await K.step('d8_open', async function () {
      K.flag('ch8', true);
      await K.title('第八章', '誰もいない月代町');
      await K.say([
        '#scene center_lab A', '#amb wire',
        'n:三晩目の受信試験。',
        'm:発信元が「誰もいない側」なら、その側から受けてみるしかない。', 'm:――ただし、行くのはシロが行ける範囲まで。いいね。',
        'p:はい。',
        'y:安定剤と予備の電源。それから、これ。携帯型の境界観測器だ。切り替える前に、向こうの危険度が分かる。', 'y:端末の電力は、向こうで調べるたびに減る。', 'y:0になったら撮影もスキャンもできない。……戻ってこい。',
        's:きゅ。',
        'n:シロに指先を触れる。同期の感覚。視界の端が、少しずつ白くほどけていく――',
        '#fx whiteout', '#se whistle',
        'n:――汽笛。',
        '#scene empty_town C', '#amb off',
        'n:目を開けると、月代町だった。',
        'n:誰もいない月代町だった。',
        'n:信号は消えている。店のシャッターは半分開いたまま。洗濯物が干しっぱなしで、風もないのに揺れている。',
        'p:……ユウさん？',
        '#se static',
        'y:……聞こえる。こっちからは、お前の端末の位置しか見えない。',
        'y:そこは、お前の足元の町と同じ形をしてる。ただ、誰も残っていない。',
        'p:この世界の人たちは。',
        'y:分からない。それも調べろ。',
      ]);
      if (K.setWorld) K.setWorld('C');
      K.flag('empty_town_open', true); K.unlock('empty_town');
      K.item('battery', 6); K.item('stab', 1); K.equip('portable_observer');
      K.note('place', 'd8_empty', { title: '誰もいない月代町（世界C）', text: '人が一人もいない月代町。時計は 2:17 で止まっている。境界危険度が高い。' });
    });

    await K.step('d8_explore1', async function () {
      await K.explore({
        hint: '誰もいない町を調べる（時計・学校・路地の音）。電力と安定度に注意',
        areas: ['empty_town', 'shotengai', 'school', 'residential', 'station', 'shrine', 'center_lab'],
        goal: function (K) { return K.got('d8_empty_clock') && K.got('d8_school_board') && K.has('d8_chased') && K.has('d8_sign_seen'); }
      });
      await K.say(['#scene empty_town C', 'p:2時17分で止まった時計。三十を数えた黒板。対策局の巡回表。', 'p:この町には、人の代わりに「記録」だけが残っている。', 'p:――標識の矢印の先へ行ってみます。', 'y:分室のある場所だな。……気をつけろ。']);
      K.flag('d8_bureau_open', true); K.unlock('bureau');
    });

    await K.step('d8_bureau', async function () {
      await K.say(['#scene bureau C', '#amb clock',
        'n:分室があるはずの場所に、知らない建物が建っていた。', 'n:三階建て。ガラスの自動扉。こちらの世界の分室の、三倍は大きい。',
        'n:扉は、私の端末をかざすと開いた。', 'p:……開いた？', 'y:お前の端末を「知ってる」のか、そこは。']);
      K.flag('d8_bureau', true);
      await K.explore({
        hint: '対策局を調べる（室名の札・保管棚・記録端末）。電力が尽きたら観測装置室で補給',
        areas: ['bureau', 'center_lab'],
        goal: function (K) { return K.has('b30_read') && K.got('d8_bureau_plate') && K.got('d8_bureau_badge'); }
      });
    });

    await K.step('d8_deduce', async function () {
      var ok = await K.deduce({
        id: 'd8_what',
        q: '「境界現象対策局 月代支局」とは何か',
        options: [
          { id: 'future', text: 'この町の、未来の分室', need: ['d8_bureau_plate'], refute: ['d8_empty_clock'] },
          { id: 'other', text: '分室とは無関係の、別の組織の施設', need: ['d8_cctv'], refute: ['d8_bureau_plate'] },
          { id: 'branch', text: '別の歴史をたどった世界で、分室が育った姿', need: ['d8_bureau_plate', 'd8_bureau_badge'] },
          { id: 'fake', text: '誰かが作った偽物の建物', need: ['d8_cctv'], refute: ['d8_bureau_badge'] },
        ],
        answer: 'branch',
        hint: {
          future: 'この世界の時計は 2時17分で止まっている。こっちの町の「先」なら、なぜ人がいない？　同じ時間の続きとは言えない。',
          other: '定礎板に「旧 特殊現象観測センター月代分室」とある。無関係じゃない。',
          fake: '偽物なら、なぜ職員証に「私」の名前がある？　別の私が、ここで働いていた痕跡だ。',
        },
        link: 2,
      });
      if (ok) await K.say([
        'p:分室が、分室のまま終わらなかった世界。対策局になって、私は主任になっていた。',
        'p:前に地下で見た「主任観測員の私」の机と、同じ流れかもしれない。',
        'y:そしてその対策局が、B-30を観測していた。',
        'p:あの人は――この町の事件とは関係のない人のはずなのに。',
      ]);
      K.note('place', 'd8_bureau_p', { title: '境界現象対策局 月代支局', text: '世界Cで分室の場所に建つ施設。分室が別の歴史で「対策局」へ育った姿。職員証には私の名前。', solved: true });
    });

    await K.step('d8_back', async function () {
      await K.say([
        '#se static', '#fx shake',
        'n:床が、一度だけ大きく揺れた。', 'n:窓の外の町並みが、端からほどけはじめている。',
        'y:境界反応が跳ねた！　今すぐ戻れ！',
        's:きゅう！',
        'n:シロが私の袖を噛んで引く。走る。廊下が伸びる。扉が遠ざかる。',
        '#fx whiteout', '#se whistle',
        '#scene center_lab A', '#amb clock',
        'n:――気がつくと、観測装置室の床に座り込んでいた。', 'y:……戻ったな。', 'm:よく戻った。',
        'p:御堂さん。「境界現象対策局」という名前に、聞き覚えは。',
        'm:…………。', 'm:昔、本部に上がった計画書の名前だ。分室を拡張して、境界を「管理」する組織を作る。', 'm:計画は潰れた。言い出した人間が、いなくなったからね。',
        'p:言い出した人は。', 'm:……いずれ話すよ。',
      ]);
      if (K.setWorld) K.setWorld('A');
      K.flag('ch8_done', true);
    });
  });
})();
