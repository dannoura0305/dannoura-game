/* ══════════════════════════════════════════════════════════
   kyokai/story/ch04.js — 第四章「嘘をついているのは世界か」（担当C）
   ナギの教科書・硬貨 → 月代橋の三つの証言（全員正しい：§28）→ 推理「嘘をついているのは誰か」
   → 任意調査の解放 → 廃トンネル（chase）→ 営業中の駅で掲示と古新聞（固定視聴者：1）
   → 推理「月代駅とナギの町」＝D 別の月代町
   フラグ：ch4 / ch4_done / side_open / paper_viewer1 / nagi_world_b / view_truth|view_people|view_undecided
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const NM = K => (K.name || (K.state && K.state.name) || '朝霧');
  const C4 = K => K.has('ch4') && !K.has('ch4_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };
  const scanW = async (K, who, lines) => {
    K.flag('c4_sc_' + who); await K.say(lines);
    if (K.has('c4_sc_gen') && K.has('c4_sc_kashi') && K.has('c4_sc_matsui') && !K.got('c4_scan_witness')) {
      await K.say(['n:三人分の測定結果がそろった。', 't:源さん　：B型（ナギと同じ波形）', 't:柏木さん：未知の型（第三の波形）', 't:松井さん：反応なし', 'p:……三人とも、違う。']);
      K.gain('c4_scan_witness');
    }
  };

  ext('center_office', 'A', [
    { id: 'c4_nagi', x: 0.42, y: 0.68, w: 0.1, h: 0.24, label: 'ナギ', acts: ['talk', 'look'], cond: C4,
      on: { talk: async K => {
        if (!K.got('c4_textbook')) {
          await K.say(['g:ひま。宿題やってる。', 'n:ナギが広げているのは、社会科の教科書だった。「わたしたちの月代町」。', 'p:ちょっと見せてもらってもいい？', 'g:いいけど、落書きは見ないで。', 'n:巻末の年表。', 't:昭和四十二年　月代鉄道 開通', 't:昭和四十五年　月代第二小学校 開校', 't:昭和八十八年　月代駅 新駅舎', 't:昭和百年　　 町制百周年', 'p:……昭和、百年。', 'g:去年だよ。お祭りあったもん。花火すごかった。', 'n:町長の名前も、町の花も、私の知っている月代町と違っていた。']);
          K.gain('c4_textbook'); return;
        }
        if (!K.got('c4_coin')) return K.say(['g:ねえ、おなかすいた。駄菓子屋さん、行きたい。', 'g:お金はあるよ。お母さんがくれたやつ。', 'y:……連れていってやれ。商店街の松井さんのところだ。']);
        return K.say(['g:あのおばあちゃん、あたしのお金、見たことないって。へんなの。', 'g:……へんなのは、あたしのほう？']);
      },
      look: async K => K.say(['n:ナギは教科書の隅に、汽車の絵を描いている。二両編成。クリーム色と緑。']) } },
    { id: 'c4_mido', x: 0.62, y: 0.62, w: 0.12, h: 0.25, label: '御堂室長', acts: ['talk'], cond: C4,
      on: { talk: async K => K.say(['m:佐伯くんが、町からの細かい相談をまとめてくれている。急ぎではないけれど、手が空いたら見てやってくれ。', 'm:小さな「変なこと」は、大きな「変なこと」の練習になる。', 'y:練習で死にかけたら笑えないけどな。', 'm:如月。', 'y:……冗談だ。']) } },
  ]);

  ext('shotengai', 'A', [
    { id: 'c4_dagashi', x: 0.42, y: 0.45, w: 0.10, h: 0.30, label: '駄菓子屋（ナギと）', acts: ['look', 'talk'], cond: K => C4(K) && K.got('c4_textbook') && !K.got('c4_coin'),
      on: { talk: async K => {
        await K.say(['g:これと、これと……これ！', 'x:松井|はい、六十円ね。', 'n:ナギが小さな財布から十円玉を六枚出して、台に並べた。', 'x:松井|……ん？', 'x:松井|お嬢ちゃん、このお金……', 'n:松井さんは老眼鏡をかけ直して、十円玉を一枚つまみ上げた。', 'x:松井|昭和、九十五年？', 'x:松井|昭和は六十四年でおしまいだよ。こんなお金、見たことない。', 'g:うそ。お母さんがくれたやつだもん。', 'x:松井|……いいよ、いいよ。今日はおばあちゃんのおごり。', 'n:一枚だけ、預からせてもらった。']);
        K.gain('c4_coin');
        K.note('diff', 'era', { title: '年号の違い', text: 'ナギの町では「昭和」が今も続いている（昭和百一年）。ナギの十円玉は昭和九十五年。昭和は六十四年で終わった――私たちの歴史では。', solved: false });
      }, look: async K => K.say(['n:駄菓子屋の店先。ナギが目を輝かせている。']) } },
    { id: 'c4_kashiwagi', x: 0.525, y: 0.344, w: 0.225, h: 0.367, label: '月代書店の柏木さん', acts: ['talk', 'scan', 'record'], cond: C4,
      on: { talk: async K => {
        await K.say(['x:柏木|月代橋の事故？ ええ、覚えてるわよ。', 'x:柏木|夜だった。町じゅう停電してて、真っ暗でね。', 'x:柏木|川のほうから、ずうん、って橋が崩れる音だけ聞こえたの。悲鳴も。車ごと落ちたって。', 'x:柏木|次の朝から、川向こうへは隣町の橋まで遠回り。……何年前だったかしら。', 'p:夜に、車ごと……。', 'x:柏木|そうよ？ 見たでしょう、河川敷の残骸。']);
        K.gain('c4_tes_kashiwagi');
        K.note('person', 'kashiwagi', { title: '柏木さん', text: '月代書店の店主。月代橋は「夜、停電の中で、車ごと崩れた」と記憶している。' });
      },
      scan: async K => scanW(K, 'kashi', ['n:本の埃を払う柏木さんに、そっと端末を向ける。', '#se beep', 't:境界反応 0.6（微弱）／波形：未登録', 'n:ナギとも違う、見たことのない形の波。']),
      record: async K => { await K.say(['#se rec', 'x:柏木|夜だったよ。真っ暗で、音だけ。']); K.gain('c4_tes_kashiwagi'); } } },
    { id: 'c4_matsui', x: 0.42, y: 0.45, w: 0.10, h: 0.30, label: '松井さん', acts: ['talk', 'scan'], cond: K => C4(K) && K.got('c4_coin'),
      on: { talk: async K => {
        await K.say(['x:松井|月代橋の事故？ 事故なんて、起きてないよ。', 'x:松井|あれは十五年前の大雨の朝。古くなってたところに水が出て、真ん中がすとんと落ちたの。', 'x:松井|誰も渡ってなかった。けが人ゼロ。町内放送で「通行止め」って言ってたのを覚えてる。', 'p:トラックの事故や、夜の停電、という話も聞いたんですが。', 'x:松井|ないない。朝の九時。晴れ間も出てた。あたしゃ、この目で見たんだから。']);
        K.gain('c4_tes_matsui');
      },
      scan: async K => scanW(K, 'matsui', ['n:端末を向ける。', 't:境界反応 0.0', 'n:何もない。松井さんは、この町そのものだ。']) } },
  ]);

  ext('riverbank', 'A', [
    { id: 'c4_bridge', x: 0.388, y: 0.4, w: 0.225, h: 0.222, label: '真ん中の落ちた橋', acts: ['look', 'photo', 'scan'], cond: C4,
      on: { look: async K => K.say(['n:月代橋。真ん中の区間が、川に落ちている。', 'n:たもとの銘板。「月代橋 昭和三十九年竣工」。その下に町の掲示。「平成二十三年 豪雨により落橋　人的被害なし」。', 'p:けが人なし。……車ごと落ちた、という話とは合わない。']),
            photo: async K => { await K.say(['#se shutter', 'n:落ちた橋と、銘板と掲示を撮影した。']); K.gain('c4_bridge_photo'); },
            scan: async K => K.say(['t:境界反応 1.6', 'n:ナギが座り込んでいた橋のたもとで、数値が高い。']) } },
    { id: 'c4_gen', x: 0.05, y: 0.6, w: 0.14, h: 0.3, label: '釣り人の源さん', acts: ['talk', 'scan', 'record'], cond: C4,
      on: { talk: async K => {
        await K.say(['x:源|事故？ 午後三時だ。間違いねえ。', 'x:源|橋の上で砂利のトラックが傾いてな。欄干にひっかかって止まった。', 'x:源|駅から帰る学生さんが大勢、橋のたもとで見てたよ。', 'p:……駅から、ですか。', 'x:源|おう。三時過ぎの汽車で帰ってくるだろ、第二小の……', 'x:源|……第二小？ ん？ なんだ、第二小って。', 'n:源さんは、自分の言葉に首をかしげた。']);
        K.gain('c4_tes_gen');
        K.note('person', 'gen', { title: '源さん', text: '河川敷の釣り人。月代橋の事故を「午後三時。駅から帰る学生が見ていた」と記憶している。' });
      },
      scan: async K => scanW(K, 'gen', ['n:釣り糸を垂れる源さんに、端末を向ける。', '#se beep', 't:境界反応 0.9（微弱）／波形：B型', 'p:ナギと、同じ型だ。']),
      record: async K => { await K.say(['#se rec', 'x:源|午後三時だ。汽車の学生さんが見てた。']); K.gain('c4_tes_gen'); } } },
  ]);

  // ── 廃トンネル ──
  ext('tunnel', 'A', [
    { id: 'c4_echo', x: 0.388, y: 0.4, w: 0.225, h: 0.4, label: 'トンネルの奥', acts: ['look', 'record', 'scan'], cond: C4,
      on: { look: async K => K.say(['n:真っ暗なトンネル。懐中電灯の光が、湿った壁を這う。', 'n:向こうの出口が、小さく白い。']),
            record: async K => { await K.say(['#se rec', '#se steps', 'n:自分たちの足音。その反響が、一拍遅れて――', 'n:もう一組、返ってくる。', 'y:……止まれ。', 'n:立ち止まる。反響が、もう一歩分だけ続いて、止まった。']); K.gain('c4_tunnel_rec'); K.flag('c4_echo'); },
            scan: async K => K.say(['t:境界反応 2.8（強い）', 'n:奥へ行くほど、数値が上がる。']) } },
    { id: 'c4_shelf', x: 0.05, y: 0.6, w: 0.14, h: 0.25, label: '壁際の木箱', acts: ['look'], cond: C4,
      on: { look: async K => { if (K.has('c4_box')) return K.say(['n:空の木箱。']); K.flag('c4_box'); K.item('battery', 2); K.item('stab', 1); await K.say(['n:古い保線用の木箱。中に、分室の支給品の袋が押し込まれている。', 't:予備バッテリー ×2／境界安定剤 ×1 を手に入れた', 'y:……また分室の支給品だ。誰かが、俺たちより先にここを通ってる。']); } } },
  ]);

  // 境界から押し戻されたとき（安定度0）の入口
  ext('station', 'A', [
    { id: 'c4_rewait', x: 0, y: 0.333, w: 0.144, h: 0.289, label: '待合室で、もう一度 2時17分を待つ', acts: ['look'], cond: K => C4(K) && K.has('c4_live_on') && !(K.got('c4_station_hist') && K.got('c4_newspaper')),
      on: { look: async K => { await K.say(['n:待合室で、もう一度その時刻を待つ。', '#wait 600', '#se whistle', '#fx glitch', 'n:――灯りが、ついた。']); K.setWorld('B'); } } },
  ]);

  // ── 営業中の駅（B）：掲示と売店 ──
  ext('station', 'B', [
    { id: 'c4_board', x: 0.184, y: 0.372, w: 0.069, h: 0.167, label: '掲示板', acts: ['look', 'photo'], cond: C4,
      on: { look: async K => K.say(['n:駅の掲示板。「月代鉄道 開業 昭和四十二年」「来年 開業六十周年 記念乗車券 予約受付中」。', 'p:ナギの教科書の年表と、同じだ。']),
            photo: async K => { await K.say(['#se shutter', 'n:掲示を撮影した。']); K.gain('c4_station_hist'); } } },
    { id: 'c4_kiosk', x: 0, y: 0.333, w: 0.144, h: 0.289, label: '売店', acts: ['look', 'photo'], cond: C4,
      on: { look: async K => {
        await K.say(['n:シャッターの半分下りた売店。古新聞が束になって積まれている。', 'n:一番上の一部の、日付のあたりは破れている。', 'n:社会面の隅。小さな記事が目に留まった。', 't:深夜配信中に不可解な障害', 't:――個人の配信者の映像に、存在しない視聴者が接続。', 't:配信終了後も、接続者数が1名から減少しなかった。', 'n:配信者の名前のところは、茶色い染みで読めない。', 'n:記事に添えられた小さな画面写真。暗い画面の片隅に、白い文字だけが残っている。', '#fx noise', 't:固定視聴者：1', '#wait 500', 'p:……配信。', 'y:また配信か。NIGHTCAST の広告、USER_444 のログ、ナギの見た映像。', 'p:それに、この新聞は、ナギの町の新聞です。', 'y:向こうの町でも、誰かが、誰かに見られてる。']);
        K.gain('c4_newspaper'); K.flag('paper_viewer1');
        K.note('444', 'viewer1', { title: '固定視聴者：1', text: 'ナギの町の古新聞の小記事。深夜配信に存在しない視聴者が接続し、配信終了後も接続者数が1名から減らなかった。配信者名は汚れて読めない。', solved: false });
      },
      photo: async K => { await K.say(['#se shutter', 'n:記事を撮影した。']); K.gain('c4_newspaper'); K.flag('paper_viewer1'); } } },
  ]);

  KY_STORY.register('ch04', async K => {
    await K.step('c4_start', async () => {
      K.flag('ch4'); K.stab(15);
      await K.title('第四章', '嘘をついているのは世界か');
      await K.say(['#scene center_office A', '#amb clock', 'n:ナギが分室に来て、三日が過ぎた。', 'n:佐伯さんの家に泊まり、昼は分室で宿題をしている。', 'x:佐伯|ナギちゃん、九九は完璧なんですよ。七の段なんて私より速い。', 'g:七の段は歌で覚えるの。汽車の歌。', 'y:……どんな歌だ。', 'g:おしえない。', 'm:さて。彼女がどこから来たのか、そろそろ確かめなければならない。', 'm:タイムスリップ、という言葉は使わないでおこう。まずは、彼女の町がどんな町なのか。']);
      K.flag('side_open');
      K.note('case', 'side_list', { title: '町の小さな相談（任意調査）', text: '佐伯さんがまとめた相談メモ。夜だけ現れる自動販売機／毎日違う犬／誰も住んでいない家の灯り／明日の新聞／同じ子供が二人／叶った絵馬。手が空いたら調べる。', solved: false });
      await K.say(['x:佐伯|あ、それと。町の細かい相談、メモにまとめておきました。急ぎじゃないので、手が空いたときに。', 'n:相談メモを受け取った。（任意調査が解放された）']);
    });

    await K.step('c4_nagi_town', async () => {
      await K.explore({ goal: K => K.got('c4_textbook') && K.got('c4_coin'),
        hint: 'ナギの町のことを知る：ナギの持ち物（教科書）を見せてもらい、商店街へ連れていく', areas: ['center_office', 'center_lab', 'shotengai', 'residential', 'school', 'shrine', 'riverbank'] });
    });

    await K.step('c4_bridge_intro', async () => {
      await K.say(['#scene shotengai A', 'n:駄菓子屋の帰り道。', 'g:ねえ。どうしてこの町には橋がないの？', 'g:あたしの町の月代橋は、ちゃんとあるよ。毎朝わたる。', 'p:……橋のこと、町の人に聞いてみようか。', 'y:月代橋は、人によって話が違うらしい。佐伯さんの相談メモにも一件あった。', 'y:「月代橋の事故の話をすると、近所の人とけんかになる」。']);
      K.note('case', 'bridge', { title: '月代橋の三つの記憶', text: '河川敷の月代橋について、住民の記憶が食い違う。事故の時刻、事故の有無、橋の有無。', solved: false });
    });

    await K.step('c4_testimony', async () => {
      await K.explore({ goal: K => K.got('c4_tes_gen') && K.got('c4_tes_kashiwagi') && K.got('c4_tes_matsui') && K.got('c4_scan_witness') && K.got('c4_bridge_photo'),
        hint: '月代橋について三人の証言を集め（源さん・柏木さん・松井さん）、落ちた橋を撮影し、三人を境界測定端末でスキャンする', areas: ['center_office', 'shotengai', 'riverbank', 'residential', 'school', 'shrine', 'center_lab'] });
    });

    await K.step('c4_deduce1', async () => {
      await K.say(['#scene center_office A', 'y:三人とも、真剣だった。', 'y:午後三時の事故。夜の崩落。事故なんて起きていない。', 'y:普通に考えれば、誰かが嘘をついてるか、記憶違いだ。', 'm:普通に考えれば、ね。']);
      await K.deduce({ id: 'c4_witness', q: '月代橋の三つの証言。嘘をついているのは誰か？', link: 2,
        options: [
          { id: 'gen', text: '源さん（午後三時の事故）', need: ['c4_tes_gen'], refute: ['c4_scan_witness'] },
          { id: 'kashi', text: '柏木さん（夜の崩落）', need: ['c4_tes_kashiwagi'], refute: ['c4_scan_witness'] },
          { id: 'matsui', text: '松井さん（事故なんてない。大雨の朝に自然に落ちた）', need: ['c4_tes_matsui'], refute: ['c4_bridge_photo'] },
          { id: 'none', text: '誰も嘘をついていない。三人は、それぞれ違う月代町の出来事を覚えている', need: ['c4_scan_witness', 'c4_tes_gen'] },
        ],
        answer: 'none',
        hint: {
          gen: '源さんは「駅から帰る学生」と言った。この町に駅はない。……嘘をつく人間は、自分の首をかしげるような細部は足さない。スキャン結果も見ろ。',
          kashi: '柏木さんの周りには、見たことのない波形が出てた。嘘で波形は変わらない。',
          matsui: '松井さんの話は、橋のたもとの掲示と一致してる。「豪雨により落橋 人的被害なし」。この町では、松井さんが正しい。',
          none: 'その線だ。源さんの話は「駅のある町」の話だ。スキャン結果と、源さんの証言を結べ。',
        } });
      await K.say(['p:三人とも、本当のことを言っている。', 'p:松井さんは、この町の月代橋を。源さんは、ナギと同じ――駅のある町の月代橋を。', 'p:柏木さんは、また別のどこかの月代橋を。', 'y:三つの町の、三つの記憶。', 'm:……一つの町に、記憶が三つ混ざっている。', 'g:じゃあ、あたしの町の橋も、ほんとにあるんだね。', 'p:うん。きっと、ある。']);
      K.note('hypo', 'bridge', { title: '仮説：三つの記憶', text: '月代橋の証言は全員正しい。源さんは駅のある町（ナギの町と同じ型）、柏木さんは第三の町、松井さんはこの町の出来事を覚えている。', solved: false });
      const v = await K.choice('如月「新人。嘘をついているのは誰だと思う」', [
        { t: '誰も。嘘をついているとしたら、世界のほうです', v: 'truth' },
        { t: '誰も。みんな、自分の見たものを信じているだけです', v: 'people' },
        { t: 'まだ分かりません。全部を見てからにします', v: 'undecided' },
      ]);
      K.flag('view_' + v);
      if (v === 'truth') await K.say(['y:世界が嘘をつく、か。', 'y:……だとしたら、俺たちの記録も、世界の嘘の一部かもしれないぞ。', 'p:だから、全部記録するんです。嘘のつき方が分かるまで。']);
      if (v === 'people') await K.say(['y:信じてるだけ、か。', 'y:それはそれで、怖い話だな。俺も、自分の記憶を信じてるだけだ。', 'p:私もです。']);
      if (v === 'undecided') await K.say(['y:……慎重だな。', 'y:いい観測員は、結論を急がない。悪い観測員も、急がない。違いは、最後に決められるかどうかだ。']);
    });

    await K.step('c4_tunnel', async () => {
      await K.say(['#scene center_office A', 'm:今夜、もう一度駅へ行ってほしい。', 'm:ナギちゃんの教科書には「月代鉄道 開業 昭和四十二年」とあった。駅にその記録が残っていれば、彼女の町の歴史が本物だと確かめられる。', 'y:山道の分かれ道は、ここ数日、見えたり見えなかったりだ。', 'm:旧道の廃トンネルを抜ければ、駅の裏手に出られるはずだ。……地図の上では、ね。', 'n:危険度の高い場所だ。懐中電灯と予備バッテリーを確かめる。']);
      K.unlock('tunnel');
      K.item('battery', 2);
      await K.explore({ goal: K => K.has('c4_echo'), hint: '廃トンネルを調べる（奥の音を録音する）', areas: ['tunnel'] });
      await K.say(['#amb off', '#se steps', 'n:反響が、止まらない。', 'n:こちらが止まっているのに、足音だけが近づいてくる。', 'y:……走るぞ。出口までだ。']);
      await K.chase({ id: 'c4_echo_chase', time: 10,
        intro: ['n:暗闇の中、自分たちの足音を真似る何かが、背後から近づいてくる。'],
        rounds: [
          { text: '足音が真後ろまで来た。息づかいまで、私と同じリズムだ。', ok: ['hide', 'run'], good: 'わざと歩幅を乱す。真似る足音のリズムが崩れた。', bad: '振り返っても誰もいない。足音だけが、顔のすぐ前で止まった。' },
          { text: '懐中電灯の光の端に、壁を這う「足音の形」をした影が映った。', ok: 'repel', good: '光をまっすぐ向ける。影は、靴底の形のままほどけて消えた。', bad: '影が、私の影に重なった。足が、自分のものではないように重い。' },
          { text: '出口の白い光。天井から落ちる水の音が、だんだん汽笛に聞こえてくる。', ok: 'run', good: '光の中へ飛び込んだ。', bad: '汽笛の方向を探すうちに、出口がひとつ遠くなった気がした。' },
        ] });
      await K.say(['#scene mountain_road A', '#amb wire', 'n:トンネルを抜けると、山の中腹だった。木々の向こうに、駅の屋根。', 'y:……はあ。新人、生きてるか。', 'p:生きてます。……如月さん、今の。', 'y:分からない。記録はあとだ。', 'n:録音機には、二組目の足音がはっきり残っていた。']);
      K.note('place', 'tunnel', { title: '廃トンネル', text: '旧道の廃トンネル。足音の反響が一拍遅れてもう一組返ってくる。反響は、こちらが止まっても近づいてきた。' });
    });

    await K.step('c4_station', async () => {
      await K.say(['#scene station_ruin A', 'n:午前2時16分。廃駅の待合室。', '#wait 600', '#se whistle', '#fx glitch']);
      K.setWorld('B'); K.flag('c4_live_on');
      await K.say(['#scene station_live B', '#amb station', 'n:灯りがつく。二度目でも、息をのむ。', 'y:今度は落ち着いて回れ。掲示板と、売店だ。']);
      await K.explore({ goal: K => K.got('c4_station_hist') && K.got('c4_newspaper'), hint: '営業中の駅で、駅の歴史が分かる掲示を撮影し、売店を調べる', areas: ['station'] });
      await K.say(['#fx noise', 'n:2時18分が近づく。灯りがまたたいた。', 'y:戻るぞ。今度は走らなくていい。歩いて出る。']);
      K.setWorld('A');
      await K.say(['#scene station_ruin A', '#amb wire', 'n:廃墟に戻った。手の中の端末には、掲示板の写真と、古新聞の記事の写真。', 'n:――明日の朝、これも林の写真に変わってしまうのだろうか。']);
    });

    await K.step('c4_deduce2', async () => {
      await K.say(['#scene center_office A', '#amb clock', 'm:おかえり。……ボードを、もう一度並べ直そう。', 'm:月代駅について、最初に立てた仮説を覚えているかい。', 't:A：昔、実際に存在した駅', 't:B：過去の月代町', 't:C：幻覚（否定済み）', 't:D：別の月代町']);
      await K.deduce({ id: 'c4_station_final', q: '月代駅と、ナギの町。最もよく説明できる仮説は？', link: 2,
        options: [
          { id: 'A', text: 'A：昔、この町に実在した駅（記録が失われた）', need: ['c4_station_hist'], refute: ['c1_shrine_record'] },
          { id: 'B', text: 'B：過去の月代町（ナギはタイムスリップしてきた）', need: ['c4_textbook'], refute: ['c4_coin'] },
          { id: 'D', text: 'D：別の歴史を持つ、もう一つの月代町', need: ['c4_coin', 'c4_station_hist'] },
        ],
        answer: 'D',
        hint: {
          A: '町史には「本町ニ鉄道ナシ」。松井さんの記憶にも、この町の駅はない。それに、営業中の駅は「昭和四十二年開業」――昭和が続くナギの町の年表とつながっている。この町の昔の駅じゃない。',
          B: '過去の月代町なら、「昭和九十五年」の十円玉は存在しない。昭和は六十四年で終わった。ナギの町は過去じゃない。',
          D: 'そうだ。昭和が続いている硬貨と、教科書と同じ年の開業記念――二つを結べ。過去でも未来でもない、もう一つの歴史だ。',
        } });
      K.flag('nagi_world_b');
      await K.say(['p:ナギは、過去から来たんじゃない。', 'p:昭和が終わらなかった月代町。鉄道が通って、第二小学校があって、月代橋が架かっている月代町。', 'p:……別の歴史を持つ、もう一つの月代町から来た。', 'y:言葉にすると、それらしく見えてくる。', 'p:今回は、証拠が先にあります。', 'y:……ああ。今回は、な。', 'm:――仮説D。', 'n:御堂室長はボードの「D」の札に、そっと印をつけた。指が、少しだけ震えていた。']);
      K.note('hypo', 'station', { title: '仮説：月代駅の正体（更新）', text: 'D 別の月代町。ナギの町は、昭和が終わらなかった月代町。過去ではない（昭和九十五年の硬貨）。駅の開業記念は、ナギの教科書の年表と一致。', solved: true });
      K.note('hypo', 'nagi', { title: '仮説：ナギはどこから来たか（更新）', text: '過去ではなく、別の歴史を持つ月代町から来た。月代駅は、その町の駅。', solved: true });
      K.note('place', 'station', { title: '月代駅', text: 'この町では廃墟。もう一つの月代町（昭和が続く町）では、昭和四十二年開業の営業中の駅。2時17分前後に、二つが重なる。', solved: false });
    });

    await K.step('c4_end', async () => {
      await K.say(['n:その夜。分室の屋上。', 'y:……新人。', 'p:はい。', 'y:御堂さんの指、震えてたな。', 'p:気づいていました。', 'y:あの人は、たぶん、前にも同じ札に印をつけたことがある。', 'p:前にも？', 'y:勘だ。記録じゃない。', 'n:風が吹いた。山の中腹の暗がりを、白い何かが横切った。', 'p:如月さん、今――', 'y:見た。', 'y:……猫にしては、輪郭がぼやけすぎてる。', '#se whistle', 'n:汽笛が、いつもより近くで鳴った。']);
      K.flag('ch4_done');
    });
  });
})();
