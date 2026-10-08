/* ══════════════════════════════════════════════════════════
   kyokai/story/ch03.js — 第三章「存在しない少女」（担当C）
   河川敷でナギを保護 → 聞き取り（高感度録音機）→ 住民台帳・家（空き地）・卒業写真
   → 推理「ナギの駅と私たちの駅は同じか」→ 古い端末の乱れた配信映像（ナギ「見たことある」）
   フラグ：ch3 / ch3_done / nagi_met / nagi_stream / nagi_promise
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const NM = K => (K.name || (K.state && K.state.name) || '朝霧');
  const C3 = K => K.has('ch3') && !K.has('ch3_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };

  ext('center_office', 'A', [
    { id: 'c3_nagi', x: 0.42, y: 0.68, w: 0.1, h: 0.24, label: 'ナギ', acts: ['talk', 'record', 'look'], cond: C3,
      on: {
        look: async K => {
          if (!K.got('c3_pass')) {
            await K.say(['n:ナギの持ち物。角の丸い古い型のランドセル。給食袋。それから、首から下げた定期入れ。', 'g:それ、さわんないで。……見るだけなら、いい。', 't:月代鉄道 月代⇔海浜公園 通学 ナギ', 'n:書体も、紙の色も、駅で拾った切符とそっくりだ。']);
            K.gain('c3_pass'); return;
          }
          return K.say(['n:ナギは足をぶらぶらさせて、窓の外の山を見ている。']);
        },
        talk: async K => {
          const asked = q => K.has('c3_q_' + q);
          const opts = [];
          if (!asked('station')) opts.push({ t: '月代駅のことを聞く', v: 'station' });
          if (!asked('school')) opts.push({ t: '学校のことを聞く', v: 'school' });
          if (!asked('home')) opts.push({ t: '家のことを聞く', v: 'home' });
          opts.push({ t: '少し休ませる', v: 'rest' });
          const v = await K.choice('ナギに何を聞く？', opts);
          if (v === 'rest') return K.say(['g:……つかれてない。', 'n:そう言いながら、ナギはあくびをかみ殺した。']);
          K.flag('c3_q_' + v);
          if (v === 'station') { await K.say(['g:月代駅？ 知ってるよ。毎朝乗るもん。', 'g:二両の汽車。クリーム色と緑。海のほうに行くの。', 'g:先生がね、汽車の中でも宿題やれって言うの。揺れるから字がへにゃへにゃになる。', 'p:夜中の、2時17分の汽車は知ってる？', 'g:……知ってる。時刻表にのってない汽車。', 'g:子供は乗っちゃだめって、お母さんが言ってた。大人もほんとは乗っちゃだめなんだって。']); K.gain('c3_tes_train'); }
          if (v === 'school') { await K.say(['g:第二小。駅の向こうの。', 'p:月代第二小学校？', 'g:そう。第一小はぼろいから、第二小のほうがいいってみんな言ってる。', 'y:……月代町に、小学校は一つしかない。', 'g:うそだあ。']); K.gain('c3_school_name'); }
          if (v === 'home') { await K.say(['g:三丁目の十四番。二階建てで、窓のところに汽車の時刻表が貼ってあるの。', 'g:お母さんと住んでる。お母さんは駅のそばのパン屋さん。', 'g:……ねえ、いつ帰れるの？ お母さん、心配してる。', 'p:……調べるから。少しだけ、待っていてくれる？', 'g:少しだけ、ね。']); K.flag('c3_home_heard'); }
        },
        record: async K => { await K.say(['#se rec', 'g:録るの？ ……あたしの声、へんじゃない？', 'g:毎朝、二両の汽車。海のほうに行くの。']); K.gain('c3_tes_train'); },
      } },
    { id: 'c3_saeki', x: 0.02, y: 0.62, w: 0.1, h: 0.3, label: '佐伯さん', acts: ['talk'], cond: C3,
      on: { talk: async K => {
        if (K.got('c3_registry')) return K.say(['x:佐伯|ナギちゃん、甘いもの好きかな。プリン買ってきちゃった。']);
        await K.say(['x:佐伯|町役場に照会しました。', 'x:佐伯|「ナギ」という名前の子、月代町の住民台帳にはいません。転出入にも、近隣の市町村の捜索願にも。', 'x:佐伯|三丁目十四番は……空き地です。何年も前から。', 'p:三丁目。新聞配達の高野さんが「家が建っていた」と言った場所ですね。']);
        K.gain('c3_registry');
      } } },
  ]);

  ext('residential', 'A', [
    { id: 'c3_lot', x: 0.02, y: 0.72, w: 0.22, h: 0.24, label: '三丁目十四番', acts: ['look', 'photo', 'scan'], cond: K => C3(K) && K.has('c3_home_heard'),
      on: { look: async K => {
        await K.say(['n:空き地。傾いた「売地」の札。', 'g:……。', 'g:……うそ。', 'g:ここ。三丁目の、十四番。ここなのに。', 'n:ナギは雑草の中に入っていって、何もない地面の、玄関があったはずのあたりに立った。', 'g:ただいま。', 'n:返事はない。']);
        const v = await K.choice('ナギが振り返った。', [
          { t: 'そばに行って、しゃがむ', v: 'near' }, { t: '「必ず帰す」と言う', v: 'promise' }, { t: '黙って、撮影を続ける', v: 'record' }]);
        if (v === 'near') await K.say(['n:隣にしゃがむ。ナギは泣かなかった。', 'g:……泣かないよ。お母さんが、泣いたら負けって言うから。', 'p:強いね。', 'g:強くないよ。泣いたら負けだから、泣かないだけ。']);
        if (v === 'promise') { K.flag('nagi_promise'); await K.say(['p:ナギ。必ず、帰すから。', 'g:……ほんと？', 'p:本当。', 'y:（……言ったな、新人）', 'g:じゃあ、指きり。', 'n:小さな指が、思ったより強く絡んだ。']); }
        if (v === 'record') await K.say(['n:シャッターを切る。記録しなければならない。', 'g:……ねえ。それ、あたしの家、写る？', 'p:……写らない。', 'g:そっか。', 'n:それきり、ナギは何も聞かなかった。']);
        K.gain('c3_address');
      },
      photo: async K => { await K.say(['#se shutter', 'n:空き地を撮影した。']); K.gain('c3_address'); },
      scan: async K => K.say(['t:境界反応 1.2（弱い）', 'n:家の形の範囲だけ、数値がわずかに高い。']) } },
  ]);

  ext('school', 'A', [
    { id: 'c3_classphotos', x: 0.38, y: 0.4, w: 0.2, h: 0.25, label: '廊下の卒業写真', acts: ['look', 'photo'], cond: C3,
      on: { look: async K => {
        await K.say(['n:廊下に並ぶ、歴代の卒業写真。', 'g:お母さん、ここの卒業じゃないけど……第一小の、っていうか、この学校の写真なら、おばあちゃんが写ってるはず。', 'n:ナギは一枚ずつ指でなぞっていく。', 'g:……いない。', 'g:おばあちゃんも。お母さんの友だちのミヨちゃんのお母さんも。知ってる名前が、一人もいない。', 'p:……。']);
        K.gain('c3_classphoto');
      }, photo: async K => { await K.say(['#se shutter', 'n:卒業写真を撮影した。']); K.gain('c3_classphoto'); } } },
    { id: 'c3_terada', x: 0.23, y: 0.56, w: 0.07, h: 0.28, label: '寺田さん', acts: ['talk'], cond: C3,
      on: { talk: async K => K.say(['x:寺田|あっ、その子だ。あの朝の。', 'g:こんにちは。……おじさん、あたしのこと知ってるの？', 'x:寺田|いや……見かけただけだよ。', 'x:寺田|（小声で）分室さん。この子のランドセル、名札の住所が「月代町三丁目」なのに、学校名が知らない名前だ。']) } },
  ]);

  ext('center_lab', 'A', [
    { id: 'c3_oldterm', x: 0.091, y: 0.661, w: 0.113, h: 0.167, label: '古い端末', acts: ['look', 'record'], cond: K => C3(K) && K.has('c3_oldterm'),
      on: { look: async K => {
        if (K.got('c3_stream_video')) return K.say(['n:古い端末の画面は、もう砂嵐しか映さない。']);
        await K.say(['n:如月さんが倉庫から出してきた古い観測端末。昔の観測映像の断片が、何百本も入っている。', 'y:どれか、見覚えのあるものがあったら言え。駅でも、町でも。', 'n:ナギは画面を次々と送っていく。山。川。神社。ノイズ。ノイズ。', 'n:そして、指が止まった。', '#fx noise', '#scene stream_room', '#amb room', 'n:ひどく乱れた映像。', 'n:暗い部屋。机。モニターの光。マイクのような影。', 'n:画面の手前に、人影が一つ。こちらに背中を向けて座っている。顔は分からない。', '#se static', 'g:この人、見たことある。']);
        K.gain('c3_stream_video'); K.flag('nagi_stream');
        await K.say(['p:どこで？', 'g:夜になると、この人が出てくる。', 'p:どこに？', 'g:テレビ。', 'g:でもテレビじゃない。', 'y:……どういう意味だ。', 'g:わかんない。夜中に目がさめると、お母さんの部屋の小さい画面に、この人がいるの。ひとりでしゃべってる。', 'g:それとね。', '#wait 600', 'g:子供の声もする。', '#fx noise', 'n:映像が途切れた。', '#scene center_lab A', '#amb clock']);
        K.note('term', 'stream_video', { title: '乱れた配信映像', text: '古い観測端末に残っていた映像の断片。暗い部屋、机、モニター、マイク。後ろ姿の人影。ナギは「夜になると出てくる」「テレビ。でもテレビじゃない」「子供の声もする」と言った。', solved: false });
      },
      record: async K => {
        if (!K.got('c3_stream_video')) return K.say(['n:先に映像を確かめよう。']);
        await K.say(['#se rec', 'n:さっきのナギの言葉を、もう一度だけ話してもらって録音した。', 'g:この人、見たことある。夜になると出てくる。テレビ。でもテレビじゃない。……子供の声もする。', 'n:録音にはナギの声と、そのうしろに、かすかなノイズ。']);
        K.gain('c3_tes_tv');
      } } },
  ]);

  KY_STORY.register('ch03', async K => {
    await K.step('c3_start', async () => {
      K.flag('ch3'); K.stab(15);
      await K.title('第三章', '存在しない少女');
      await K.say(['#scene center_office A', '#amb clock', 'n:三日後の夜明け。分室の電話が鳴った。', 'x:佐伯|……はい、月代分室。……え、河川敷？ 女の子？', 'm:警察からかい。', 'x:佐伯|はい。崩れた橋のところで、女の子が一人で座り込んでいたそうです。名前は「ナギ」。「駅に行かなきゃ」って。', 'y:新人。', 'p:はい。']);
      K.unlock('riverbank');
      await K.say(['#scene riverbank A', '#amb wire', 'n:河川敷。川霧の中に、真ん中の落ちた橋が影になっている。', 'n:その橋のたもとに、ランドセルを抱えた女の子が座っていた。', 'g:……橋がない。', 'g:橋がないと、駅に行けない。学校に遅れちゃう。', 'p:こんにちは。月代分室の、' + NM(K) + 'です。', 'g:……ぶんしつ？', 'y:町の、変なことを調べる係だ。', 'g:変なことって？', 'y:橋がなくなる、みたいなことだ。', 'g:……じゃあ、あたしのこと、調べて。']);
      K.flag('nagi_met'); K.gain('c3_nagi');
      K.note('person', 'nagi', { title: 'ナギ', text: '河川敷の崩れた橋のそばで保護された少女。十歳くらい。月代駅を知っていて「駅に行かなきゃ」と言う。', solved: false });
      await K.say(['#scene center_office A', 'm:よく来たね、ナギちゃん。ここは安全だから。', 'g:おじさん、つかれた顔してる。', 'm:……よく言われる。', 'm:' + NM(K) + 'さん。彼女の話を聞くとき、これを使いなさい。', 'n:手渡されたのは、小さな録音機だった。', 'm:高感度録音機。普通のマイクでは拾えない帯域まで録れる。……あの汽笛も、これなら残ったかもしれないね。']);
      K.equip('hq_recorder'); K.item('battery', 3);
      K.note('term', 'hq_recorder', { title: '高感度録音機', text: '普通のマイクでは拾えない帯域まで録れる録音機。証言とノイズを同時に残せる。' });
    });

    await K.step('c3_interview', async () => {
      await K.explore({ goal: K => K.got('c3_pass') && K.got('c3_tes_train') && K.got('c3_school_name') && K.got('c3_registry') && K.got('c3_address') && K.got('c3_classphoto'),
        hint: 'ナギの話を聞き、持ち物を見る／佐伯さんに照会結果を聞く／ナギの家と学校を確かめる', areas: ['center_office', 'center_lab', 'residential', 'school', 'shotengai', 'riverbank'] });
    });

    await K.step('c3_deduce', async () => {
      await K.say(['#scene center_office A', 'n:夕方。ナギは佐伯さんのプリンを食べている。', 'y:新人。ボードを見ろ。あの子の言う「月代駅」は、俺たちが見た駅と同じものか。']);
      await K.deduce({ id: 'c3_same_station', q: 'ナギの言う「月代駅」と、私たちが見た月代駅は同じものか？', link: 2,
        options: [
          { id: 'same', text: '同じ駅だ', need: ['c3_pass', 'c1_ticket'] },
          { id: 'other', text: '別の場所の、似た名前の駅だ', need: ['c3_pass'], refute: ['c3_tes_train'] },
          { id: 'lie', text: 'ナギは作り話をしている', need: ['c3_registry'], refute: ['c3_pass'] },
        ],
        answer: 'same',
        hint: {
          other: 'ナギの話を聞き直せ。二両、クリーム色と緑、時刻表にない2時17分の汽車。俺たちが見た駅そのものだ。',
          lie: '作り話で、存在しない鉄道会社の定期券は作れない。拾った切符と、書体まで同じだ。',
          same: 'その通りだ。ナギの定期券と、駅で拾った切符を結べ。同じ鉄道会社の、同じ紙だ。',
        } });
      await K.say(['p:同じ駅です。ナギの定期券と、私が拾った切符は、同じ鉄道会社のもの。', 'y:あの子は、俺たちが一晩だけ見た駅を、毎朝使ってた。', 'p:それに住所は空き地。学校は存在しない。知っている名前が、卒業写真に一人もいない。', 'p:……まるで、昔の月代町から来たみたいです。', 'y:タイムスリップ、か？', 'p:……。', 'y:言葉にすると、それらしく見えてくる。前にも言ったな。', 'p:はい。だから、まだ言いません。']);
      K.note('hypo', 'nagi', { title: '仮説：ナギはどこから来たか', text: 'ナギの「月代駅」は、私たちが見た駅と同じ。住民台帳になく、家は空き地。昔の月代町から来た……？　タイムスリップ？　まだ決めない。', solved: false });
      K.flag('c3_oldterm');
      await K.say(['y:……一つ試したいことがある。', 'y:倉庫に古い観測端末がある。昔の観測映像の断片が入ってる。あの子に見せて、見覚えのある景色がないか聞いてみる。']);
    });

    await K.step('c3_tv', async () => {
      await K.explore({ goal: K => K.got('c3_stream_video') && K.got('c3_tes_tv'), hint: '観測装置室の古い端末をナギに見せる（見たら、言葉を録音する）', areas: ['center_lab', 'center_office'] });
    });

    await K.step('c3_end', async () => {
      await K.say(['#scene center_office A', '#amb clock', 'n:夜。ナギは仮眠室で眠った。', 'y:……暗い部屋で、一人でしゃべってる男。', 'p:男の人、でしたか。', 'y:肩幅が、たぶん。顔は分からない。', 'p:子供の声もする、と言っていました。', 'y:ああ。', 'n:しばらく、二人とも黙っていた。', 'y:新人。', 'p:はい。', 'y:あの子を、どうしたい。']);
      const v = await K.choice('如月「あの子を、どうしたい」', [
        { t: '元の場所に帰したい', v: 'home' }, { t: 'まず、あの子が何者か知りたい', v: 'know' }, { t: '……分かりません', v: 'idk' }]);
      if (v === 'home') await K.say(['y:そうか。', 'y:帰す場所が、どこにあるのか分からなくても、か。', 'p:分からないなら、探します。', 'y:……新人らしい答えだ。悪くない。']);
      if (v === 'know') await K.say(['y:観測員らしい答えだ。', 'y:でも、あの子は観測対象じゃない。そこだけは、間違えるな。', 'p:……はい。']);
      if (v === 'idk') await K.say(['y:正直だな。', 'y:俺も分からない。だから、とりあえず明日もプリンを買ってくる。', 'p:それは佐伯さんの役目では。', 'y:……今日のは俺が買った。']);
      await K.say(['n:窓の外。', '#se whistle', 'n:遠くで汽笛。', 'n:仮眠室で、ナギが寝言を言った。', 'g:……お母さん。汽車、行っちゃう。']);
      K.flag('ch3_done');
    });
  });
})();
