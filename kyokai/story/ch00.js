/* ══════════════════════════════════════════════════════════
   kyokai/story/ch00.js — プロローグ「一分間の空白」＋ 月代町の場所（AREAS）の基本形（担当C）

   ■ 場所ID（KY.AREAS）— 担当Dは KY.extendArea(id, world, spots) で調べ物を足す
     center_office（分室）/ center_server（サーバー室）/ center_lab（観測装置室）/ center_basement（地下）
     shotengai（商店街）/ residential（住宅街）/ school（小学校）/ shrine（神社）/ riverbank（河川敷）
     mountain_road（山道）/ tunnel（廃トンネル）/ station（月代駅：A=廃墟 station_ruin, B=営業中 station_live, C=崩壊）
     old_lab（旧研究施設：未解放の基本形のみ）/ empty_town（誰もいない月代町：未解放の基本形のみ）

   ■ 章の進行フラグ（担当Cが立てる）
     ch0 … ch6           その章が始まった（章の中の調べ物の表示条件に使う）
     ch0_done … ch6_done その章が終わった
     side_open           任意調査（side.js）が解放された（第四章から）
     side_<id>_done      任意調査の解決（vending/dog/house/paper/twins/ema）。K.inc('side_solved') も加算

   ■ 後半（担当D）が使うフラグ
     saw_ad_name     第一章：駅の広告で「だんのうら」の表示名を一度読んだ（近づくと崩れた）
     user444_log     第二章：USER_444 のログと「後ろ。」を見た
     staff_photo_9   第二章：知らない職員写真（名札「九…」）を見つけた（九条の伏線）
     nagi_met        第三章：ナギと出会った
     nagi_stream     第三章：ナギが乱れた配信映像の男性を「見たことある」と言った
     paper_viewer1   第四章：新聞の小記事「固定視聴者：1」を読んだ
     nagi_world_b    第四章：ナギは「別の歴史を持つ月代町」から来たと結論した（仮説D）
     shiro_met       第五章：シロと出会った（同期Lv1）
     glimpse_factory 第五章：工場の幻を見た
     glimpse_stream  第五章：配信部屋の幻と「今日も生き延びたな」を見た
     traces_found    第六章：だんのうらの痕跡（参考書・マイク・工具箱・絵）を見つけた数（K.inc、0〜4）
     trace_book / trace_mic / trace_tools / trace_drawing  それぞれの痕跡
     basement_open   第六章：地下・第二観測室を開けた（三世界パズル）
     kujo_name       第六章：観測記録に「九条」の名を見た
     self_seen       第六章：別の世界の「主任観測員の私」の机を見た
   ■ 主人公の思想（§32）を形づくる選択フラグ
     motive_know / motive_help / motive_duty     プロローグ：観測員になった理由
     ad_reach                                    第一章：崩れる広告に手を伸ばした（好奇心が恐怖に勝つ）
     nagi_promise                                第三章：ナギに「必ず帰す」と約束した
     view_truth / view_people / view_undecided   第四章：「嘘をついているのは世界か」への答え
     shiro_trust / shiro_caution                 第五章：シロを信じた／警戒した
     sync_accept / sync_hesitate                 第六章：同期の危険を承知で進んだ／ためらいながら進んだ
     philosophy_observe / philosophy_protect / philosophy_unknown  第六章末：観測とは何か（後半の九条への態度の下地）
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY = window.KY || {};
  KY.AREAS = KY.AREAS || {};

  // ── 共通の小道具 ──
  const NM = K => (K.name || (K.state && K.state.name) || '朝霧');
  const chap = K => { for (let n = 14; n >= 0; n--) if (K.has('ch' + n)) return n; return 0; };
  // 章ごとに変わる台詞：{0:[...], 3:[...]} のうち現在の章以下で最も新しいもの
  const byCh = (K, table) => { const c = chap(K); let best = null; Object.keys(table).map(Number).sort((a, b) => a - b).forEach(k => { if (k <= c) best = table[k]; }); return best || []; };
  const sayCh = table => async K => { const l = byCh(K, table); if (typeof l === 'function') return l(K); return K.say(l); };

  // ── 場所の基本形 ──
  // spots は世界ごと。章固有の調べ物は各章ファイルが extend() で足す（cond で章を限定）。
  const W = (scene, spots) => ({ scene, spots: spots || [] });
  const area = (id, def) => { if (!KY.AREAS[id]) KY.AREAS[id] = def; };

  area('center_office', { name: '観測センター 分室', map: { x: 0.18, y: 0.30 }, danger: { A: 0, B: 1, C: 3 },
    worlds: {
      A: W('center_office', [
        { id: 'clock', x: 0.506, y: 0.172, w: 0.063, h: 0.122, label: '壁時計', acts: ['look', 'scan'],
          on: { look: sayCh({ 0: ['n:丸い壁時計。文字盤に小さく「TSUKUYO」。', 'n:秒針の音が、部屋の静けさを測っている。'],
                               2: ['n:壁時計。文字盤に「TSUKUYO」――今日は、ちゃんとそう書いてある。'] }),
                scan: async K => K.say(['t:磁場 0.04μT／温度 21.8℃／境界反応 ―', 'n:ただの時計だ。']) } },
        { id: 'window', x: 0.138, y: 0.144, w: 0.175, h: 0.322, label: '窓', acts: ['look'],
          on: { look: sayCh({ 0: ['n:窓の外に月代町の屋根が並ぶ。その向こう、山の稜線。', 'p:……静かな町ですね。', 'y:静かな町ほど、記録が残らない。'],
                               3: ['n:山の中腹。あの廃駅のあたりを、つい探してしまう。'],
                               5: ['n:窓の外を、白い何かが横切った気がした。', 'n:――気のせいだ。たぶん。'] }) } },
      ]),
      B: W('center_office', [
        { id: 'clock_b', x: 0.506, y: 0.172, w: 0.063, h: 0.2, label: '壁時計', acts: ['look'],
          on: { look: async K => K.say(['n:振り子の柱時計。文字盤の下に「明光舎」。', 'n:同じ場所に、まるで違う時計が掛かっている。']) } },
      ]),
      C: W('center_office', [
        { id: 'clock_c', x: 0.506, y: 0.172, w: 0.063, h: 0.122, label: '止まった時計', acts: ['look'],
          on: { look: async K => K.say(['#se clock', 'n:ひびの入った時計。針は 4時44分 で止まっている。']) } },
      ]),
    } });

  area('center_server', { name: 'サーバー室', map: { x: 0.12, y: 0.22 }, danger: { A: 0, B: 1, C: 3 },
    worlds: {
      A: W('center_server', [
        { id: 'racks', x: 0.1, y: 0.2, w: 0.28, h: 0.55, label: 'サーバーラック', acts: ['look', 'record', 'scan'],
          on: { look: async K => K.say(['n:冷却ファンの低い唸り。ランプが規則正しく瞬いている。']),
                record: async K => K.say(['#se rec', 'n:ファンの音だけが録れた。', 'y:それを証拠にするなら、空調の苦情にしかならないぞ。']),
                scan: async K => K.say(['t:磁場 2.1μT（機器由来）／境界反応 ―']) } },
      ]),
      B: W('center_server', []),
      C: W('center_server', [
        { id: 'racks_c', x: 0.1, y: 0.2, w: 0.28, h: 0.55, label: '倒れたラック', acts: ['look'],
          on: { look: async K => K.say(['n:ラックが倒れ、配線が床を這っている。ランプが一つだけ、まだ点滅している。', 'n:4回点いて、消える。4回点いて、消える。']) } },
      ]),
    } });

  area('center_lab', { name: '観測装置室', map: { x: 0.24, y: 0.22 }, danger: { A: 0, B: 1, C: 3 },
    worlds: {
      A: W('center_lab', [
        { id: 'monitor', x: 0.294, y: 0.089, w: 0.412, h: 0.411, label: '大型モニター', acts: ['look', 'scan'],
          on: { look: sayCh({ 0: ['n:町全体の観測値が、色の帯になって流れている。', 'm:ここが分室の心臓だ。といっても、ほとんどの夜は何も起きない。'],
                               2: ['n:町の観測値。山の中腹だけ、色の帯がかすかに濁っている。'],
                               6: ['n:モニターの隅に、同期率の表示が増えた。シロの小さな影が、波形の上で丸くなっている。'] }),
                scan: async K => K.say(['t:装置の自己診断：正常']) } },
      ]),
      B: W('center_lab', []),
      C: W('center_lab', []),
    } });

  area('center_basement', { name: '分室 地下', map: { x: 0.18, y: 0.38 }, danger: { A: 1, B: 2, C: 4 }, cond: K => K.has('ch6'),
    worlds: { A: W('center_basement', []), B: W('center_basement', []), C: W('center_basement', []) } });

  area('shotengai', { name: '月代商店街', map: { x: 0.45, y: 0.48 }, danger: { A: 0, B: 1, C: 3 },
    worlds: {
      A: W('shotengai', [
        { id: 'arcade', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: 'アーケード', acts: ['look', 'record'],
          on: { look: sayCh({ 0: ['n:入口の看板「月代商店街」。「街」の字のペンキが半分剥げている。'],
                               4: ['n:入口の看板。ナギの教科書の写真では、ここは「月代銀座」だった。'] }),
                record: async K => K.say(['#se rec', 'n:有線放送の古い歌謡曲。どこにでもある音。']) } },
      ]),
      B: W('shotengai', [
        { id: 'arcade_b', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: 'アーケード', acts: ['look'],
          on: { look: async K => K.say(['n:入口の看板は「月代銀座」。吊り下げの案内板に「月代駅 →」。', 'n:遠くで、踏切の音。']) } },
      ]),
      C: W('shotengai', [
        { id: 'arcade_c', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: '落ちたアーケード', acts: ['look'],
          on: { look: async K => K.say(['n:アーケードの屋根が道に落ちている。人の気配はない。', 'n:シャッターに、誰かが爪でひっかいたような「30」。']) } },
      ]),
    } });

  area('residential', { name: '住宅街', map: { x: 0.62, y: 0.36 }, danger: { A: 0, B: 1, C: 3 },
    worlds: {
      A: W('residential', [
        { id: 'wires', x: 0, y: 0, w: 1, h: 0.12, label: '電線', acts: ['look', 'record'],
          on: { look: async K => K.say(['n:電線が空を細かく区切っている。']),
                record: async K => K.say(['#amb wire', '#se rec', 'n:電線の唸り。風のない日なのに、鳴っている。']) } },
      ]),
      B: W('residential', []),
      C: W('residential', []),
    } });

  area('school', { name: '月代小学校', map: { x: 0.70, y: 0.58 }, danger: { A: 0, B: 1, C: 4 }, cond: K => K.has('ch2'),
    worlds: { A: W('school', []), B: W('school', []), C: W('school', []) } });

  area('shrine', { name: '月代神社', map: { x: 0.38, y: 0.20 }, danger: { A: 1, B: 1, C: 3 }, cond: K => K.has('ch1'),
    worlds: { A: W('shrine', []), B: W('shrine', []), C: W('shrine', []) } });

  area('riverbank', { name: '河川敷', map: { x: 0.80, y: 0.76 }, danger: { A: 1, B: 2, C: 4 }, cond: K => K.has('ch3'),
    worlds: { A: W('riverbank', []), B: W('riverbank', []), C: W('riverbank', []) } });

  area('mountain_road', { name: '山道', map: { x: 0.28, y: 0.10 }, danger: { A: 2, B: 3, C: 4 }, cond: K => K.has('ch1'),
    worlds: { A: W('mountain_road', []), B: W('mountain_road', []), C: W('mountain_road', []) } });

  area('tunnel', { name: '廃トンネル', map: { x: 0.10, y: 0.08 }, danger: { A: 3, B: 3, C: 4 }, cond: K => K.has('ch4'),
    worlds: { A: W('tunnel', []), B: W('tunnel', []), C: W('tunnel', []) } });

  area('station', { name: '月代駅', map: { x: 0.20, y: 0.04 }, danger: { A: 2, B: 2, C: 5 }, cond: K => K.has('ch1'),
    worlds: { A: W('station_ruin', []), B: W('station_live', []), C: W('station_ruin', []) } });

  area('old_lab', { name: '旧研究施設', map: { x: 0.90, y: 0.14 }, danger: { A: 2, B: 3, C: 5 }, cond: K => K.has('old_lab_open'),
    worlds: { A: W('old_lab', []), B: W('old_lab', []), C: W('old_lab', []) } });

  area('empty_town', { name: '誰もいない月代町', map: { x: 0.52, y: 0.88 }, danger: { A: 4, B: 4, C: 5 }, cond: K => K.has('empty_town_open'),
    worlds: { C: W('empty_town', []) } });


  // ── プロローグの調べ物 ──
  const P = K => K.has('ch0') && !K.has('ch0_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };

  ext('center_office', 'A', [
    { id: 'p_overview', x: 0.88, y: 0.21, w: 0.09, h: 0.47, label: '入口（部屋全体が見える）', acts: ['look', 'photo'], cond: P,
      on: { look: async K => K.say(['n:入口から見る分室。奥に机が二つ。私の席は、如月さんの向かいになるらしい。', 'n:壁には職員写真。右下の一枠だけが空いている。']),
            photo: async K => { await K.say(['#se shutter', 'n:分室全体を一枚。']); K.gain('p_office_photo'); await K.say(['y:……構図は悪くない。手ぶれもない。', 'y:撮った日時を必ず残せ。ここでは、記録の日付が一番の証拠になる。']); } } },
    { id: 'p_staffphotos', x: 0.588, y: 0.156, w: 0.163, h: 0.222, label: '職員写真', acts: ['look'], cond: P,
      on: { look: async K => K.say(['n:額に職員写真が五枚。御堂室長、如月さん、事務の佐伯さん、本部と兼任の二人。', 'n:御堂室長は写真でも疲れて見える。如月さんは写真でも無表情。佐伯さんだけが笑っている。', 'n:右下の一枠だけ、空いている。', 'p:そこに、私の写真が入るんでしょうか。', 'y:……ああ。来月な。カメラマンが月一でしか来ない。']) } },
    { id: 'p_plate', x: 0.35, y: 0.05, w: 0.3, h: 0.056, label: '入口のプレート', acts: ['look'], cond: P,
      on: { look: async K => K.say(['n:「特殊現象観測センター 月代分室」。', 'n:本部の人間はここを「月代の端っこ」と呼ぶらしい。']) } },
    { id: 'p_desk_mido', x: 0.62, y: 0.62, w: 0.12, h: 0.25, label: '御堂室長', acts: ['talk'], cond: P,
      on: { talk: async K => {
        if (K.got('p_office_photo')) return K.say(['m:撮れたか。じゃあ今日はもう、それで十分だ。', 'm:当直は如月と二人。何も起きなければ、朝まで日報を書くだけの夜になる。']);
        return K.say(['m:まずは分室の写真を一枚撮ってみてくれ。入口あたりから、全体が入るように。', 'm:ここでは毎日、同じ場所を同じ角度で撮る。変化に気づくためにね。']);
      } } },
    { id: 'p_yuu', x: 0.17, y: 0.64, w: 0.12, h: 0.27, label: '如月ユウ', acts: ['talk'], cond: P,
      on: { talk: async K => K.say(['y:……何か用か、新人。', 'p:ええと、ここではどういう現象を観測しているんですか。', 'y:説明のつかないもの全部。', 'y:九割九分は、説明がつく。残りの一分のために、ここがある。']) } },
  ]);

  // 朝の聞き込み（プロローグ後半）
  const PM = K => P(K) && K.has('p_morning');
  ext('center_server', 'A', [
    { id: 'p_powerlog', x: 0.412, y: 0.422, w: 0.175, h: 0.2, label: 'ログ端末', acts: ['look', 'scan'], cond: PM,
      on: { look: async K => {
        if (!K.got('p_power_log')) {
          await K.say(['n:電力会社の供給記録と、基地局の時刻同期ログを照会する。', 't:02:17:00 供給電圧 101.2V 正常', 't:02:17:30 供給電圧 101.1V 正常', 't:02:18:00 時刻同期 偏差 0.002s', 'p:停電していない。時計もずれていない。']);
          K.gain('p_power_log');
          await K.say(['y:機器の故障記録もない。……変な夜だな。']);
        } else await K.say(['n:何度見ても、正常値しか並んでいない。']);
      },
      scan: async K => K.say(['t:境界反応 ―', 'n:サーバー室自体には何もない。']) } },
  ]);

  ext('shotengai', 'A', [
    { id: 'p_sakaguchi', x: 0.25, y: 0.33, w: 0.12, h: 0.4, label: '八百屋の坂口さん', acts: ['talk', 'record'], cond: PM,
      on: { talk: async K => {
        await K.say(['x:坂口|ああ、分室の人？ 聞いてよ。', 'x:坂口|昨日の夜、配達の帰りにね、山のほうへ曲がる道があったの。ちゃんと舗装してあって、白線まで引いてあった。', 'x:坂口|けさ見に行ったら、ない。雑木林。', 'p:曲がり角はどのあたりでしたか。', 'x:坂口|林道の、お地蔵さんの先。……あんたも、私がボケたと思う？', 'p:いいえ。記録します。']);
        K.gain('p_tes_road');
      },
      record: async K => K.say(['#se rec', 'x:坂口|録るの？ じゃあ、ちゃんと言っとく。道は、あった。']) } },
    { id: 'p_takano', x: 0.8, y: 0.5, w: 0.1, h: 0.32, label: '新聞配達の青年', acts: ['talk'], cond: PM,
      on: { talk: async K => {
        await K.say(['x:高野|三丁目十四番の空き地、知ってます？ あそこに家が建ってたんすよ。', 'x:高野|二階の窓に灯りがついてて、テレビの音もしてた。2時過ぎっすよ。', 'x:高野|でも配達名簿に載ってないし、朝はただの空き地。……俺、疲れてるんすかね。', 'p:疲れていても、見たものは見たもの、だと思います。', 'x:高野|……なんか、ちょっと救われました。']);
        K.gain('p_tes_house');
      } } },
    { id: 'p_kissa', x: 0.525, y: 0.344, w: 0.225, h: 0.367, label: '月代書店の柏木さん', acts: ['look', 'talk'], cond: PM,
      on: { look: async K => K.say(['n:月代書店。古い紙の匂い。店主の柏木さんが、はたきで棚の埃を払っている。']),
            talk: async K => K.say(['x:柏木|ゆうべ？ 寝てたわよ。ラジオつけっぱなしでね。', 'x:柏木|そういえば、2時過ぎに一回だけ、ラジオが無音になった。……一分くらいかな。音楽の途中で。']) } },
  ]);

  ext('residential', 'A', [
    { id: 'p_hayase', x: 0.7, y: 0.42, w: 0.14, h: 0.26, label: '早瀬さん', acts: ['talk'], cond: PM,
      on: { talk: async K => {
        await K.say(['x:早瀬|夜中にトイレに起きたらね、居間のタンスが反対側の壁にあったの。', 'x:早瀬|祖母の代からのタンスよ。一人じゃ動かせない。', 'x:早瀬|朝起きたら元の場所。夫は「寝ぼけた」って。', 'x:早瀬|でも、タンスの上の写真立て。あっちの壁にあったとき、写真の中で娘が――', 'x:早瀬|……ごめんなさい、なんでもない。']);
        K.gain('p_tes_furniture');
      } } },
    { id: 'p_miura', x: 0.52, y: 0.62, w: 0.08, h: 0.28, label: 'ゴミ出しの女性', acts: ['talk'], cond: PM,
      on: { talk: async K => {
        await K.say(['x:三浦|2時半ごろ、ゴミを出しに出たの。……夜に出すなって？ 朝は忙しいのよ。', 'x:三浦|そしたら後ろから「お母さん」って。十歳くらいの女の子。', 'x:三浦|うちは子供いないの。振り返ったら、誰もいなかった。', 'x:三浦|ランドセルの金具が鳴る音だけ、しばらく残ってた。']);
        K.gain('p_tes_child');
      } } },
    { id: 'p_lot', x: 0.02, y: 0.72, w: 0.22, h: 0.24, label: '三丁目の空き地', acts: ['look', 'photo', 'scan'], cond: PM,
      on: { look: async K => K.say(['n:雑草の生えた空き地。「売地」の札が傾いている。', 'n:家が建っていた跡は、どこにもない。']),
            photo: async K => K.say(['#se shutter', 'n:空き地を撮影した。写っているのは、空き地だけだ。']),
            scan: async K => K.say(['t:磁場 0.31μT（やや高い）', 'n:簡易磁場計の針が、少しだけ揺れた。']) } },
  ]);

  // ── プロローグ本編 ──
  KY_STORY.register('ch00', async K => {
    await K.step('p_name', async () => {
      K.flag('ch0');
      await K.title('プロローグ', '一分間の空白');
      await K.say(['#amb wire', '#scene town_map', 'n:地方都市、月代町。', 'n:山と川に挟まれた、人口八千人ほどの静かな町。', 'n:その町外れに、看板の小さな建物がある。', 'n:――特殊現象観測センター 月代分室。']);
      if (!K.has('named')) {
        const nm = await K.input('観測員登録：あなたの姓を入力してください', NM(K), 6);
        if (K.setName) K.setName(nm || '朝霧'); else if (K.state) K.state.name = nm || '朝霧';
        K.flag('named');
      }
    });

    await K.step('p_arrive', async () => {
      const n = NM(K);
      await K.say(['#scene center_office A', '#amb clock', 'n:十月。着任初日の夕方。', 'x:佐伯|あ、新しい方ですね。' + n + 'さん？ 室長、いらっしゃいましたよー。',
        'm:ああ。遠いところをご苦労さま。室長の御堂だ。', 'm:本部から話は聞いている。……といっても、書類一枚分の話だけどね。', 'p:' + n + 'です。本日から月代分室に配属になりました。よろしくお願いします。',
        'm:よろしく。そこでコーヒーを飲んでいる無愛想なのが、如月。', 'y:如月ユウ。観測員。', 'y:……以上。', 'm:彼が君の指導役だ。言葉は少ないが、記録は誰より正確だよ。', 'y:記録は喋らないからな。']);
      await K.say(['m:ここは、町で起きる「説明のつかないこと」を記録する場所だ。', 'm:記録して、測って、たいていは説明がつく。', 'm:説明がつかなかったものは、本部に送る。本部は棚に入れる。……それで終わる。', 'p:終わる、んですか。', 'm:ほとんどはね。']);
      const v = await K.choice('御堂「一つ聞いておこうかな。どうしてこの仕事を？」', [
        { t: '分からないことを、分からないままにしておけなくて', v: 'know', s: '知りたい' },
        { t: '誰かが困っているなら、記録が役に立つと思って', v: 'help', s: '役に立ちたい' },
        { t: '……辞令が出たので', v: 'duty', s: '正直に' },
      ]);
      K.flag('motive_' + v);
      if (v === 'know') await K.say(['m:……いい答えだ。危ない答えでもあるけどね。', 'y:分からないものは、だいたい分からないままだぞ。']);
      if (v === 'help') await K.say(['m:そうだね。困っている人は、自分が見たものを信じてもらえないことに一番困る。', 'm:記録は、その人の味方になれる。']);
      if (v === 'duty') await K.say(['y:……ふっ。', 'm:如月が笑った。珍しい。', 'y:笑ってない。', 'm:正直なのは、観測員にいちばん大事な資質だよ。']);
      await K.say(['m:さて。最初の仕事だ。分室の写真を一枚撮ってみてくれ。', 'm:端末のカメラでいい。毎日同じ場所、同じ角度で撮る――それがここの基本だ。']);
    });

    await K.step('p_tutorial', async () => {
      K.equip('phone'); K.equip('flashlight'); K.equip('magnet');
      K.item('battery', 6); K.item('med', 1);
      await K.explore({ goal: K => K.got('p_office_photo'), hint: '分室の写真を撮る（入口から「撮影」）', areas: ['center_office'] });
      K.note('place', 'center_office', { title: '特殊現象観測センター 月代分室', text: '町外れの小さな観測拠点。職員は室長の御堂、観測員の如月、事務の佐伯、そして私。毎日同じ角度で分室を撮影するのが決まり。' });
      K.note('person', 'mido', { title: '御堂 室長', text: '月代分室の室長。穏やかで、いつも少し疲れて見える。「説明がつかなかったものは本部の棚に入る」。' });
      K.note('person', 'yuu', { title: '如月ユウ', text: '先輩観測員。口数が少なく、記録は正確。私のことは「新人」と呼ぶ。コーヒーは無糖。' });
    });

    await K.step('p_night', async () => {
      await K.say(['#scene center_office A', '#amb clock', 'n:その夜。初めての当直。', 'n:午前1時50分。', 'y:……新人。', 'p:はい。', 'y:俺は今から十分だけ目を閉じる。何かあったら起こせ。', 'p:寝る、ということですか。', 'y:目を閉じるだけだ。', 'n:三十秒後、寝息が聞こえた。']);
      await K.say(['#wait 800', 'n:モニターの観測値が、静かに流れていく。', 'n:秒針の音。冷却ファンの音。遠くの電線の唸り。', '#wait 600', 'n:午前2時17分。']);
      await K.say(['#fx noise', '#amb off', 'n:――音が、消えた。', 'n:モニターの映像が止まっている。いや、止まっていない。時刻表示だけは進んでいる。', 'n:秒針の音だけが、まだ聞こえる。', '#se clock', '#wait 900', '#se whistle', 'n:遠くで。', 'n:とても遠くで、何かが鳴った。', 'p:……汽笛？', 'n:月代町に、線路はない。', '#wait 1200', '#amb clock', '#fx flash', 'n:午前2時18分。映像も音も、何事もなかったように戻っていた。']);
      await K.say(['p:如月さん。如月さん、起きてください。', 'y:……起きてる。目を閉じてただけだ。', 'p:今、一分くらい、モニターが。それに汽笛のような音が。', 'y:汽笛？', 'n:如月さんは窓の外を見て、それから私の顔を見た。', 'y:……録音は。', 'p:回していました。でも、何も入っていません。', 'y:じゃあ、メモを書け。時刻と、聞こえたものを。', 'y:機械が拾わなかったものは、人間が書くしかない。']);
      K.gain('p_whistle_memo');
      K.note('term', 'whistle', { title: '汽笛', text: '2時17分、障害の一分間に聞こえた遠い汽笛。月代町に鉄道はない。録音には残らなかった。', solved: false });
    });

    await K.step('p_morning', async () => {
      await K.say(['#scene center_office A', '#amb clock', 'n:翌朝。', 'm:二人とも、徹夜明けにすまないね。', 'm:昨夜2時17分から一分間、町内のほぼ全域で通信障害があった。', 'm:正確には、通信は切れていない。映像と音声の一部だけが、記録から抜け落ちている。']);
      K.gain('p_outage_log');
      await K.say(['m:それと、けさから住民の方からの電話が止まらない。', 'x:佐伯|「昨日までなかった道」「知らない家」「家具が動いた」……もう八件目です。', 'm:手分けして聞いてきてほしい。それから、停電や機器の故障だったかどうかも確かめておきたい。', 'y:行くぞ、新人。', 'p:はい。']);
      K.flag('p_morning');
      K.unlock('shotengai'); K.unlock('residential'); K.unlock('center_server');
    });

    await K.step('p_investigate', async () => {
      const tes = ['p_tes_road', 'p_tes_house', 'p_tes_furniture', 'p_tes_child'];
      await K.explore({ goal: K => K.got('p_power_log') && tes.filter(t => K.got(t)).length >= 3,
        hint: '住民の証言を集め（3件以上）、サーバー室で停電・故障の有無を確かめる', areas: ['center_office', 'center_server', 'shotengai', 'residential'] });
      K.note('case', 'blank_minute', { title: '一分間の空白', text: '2時17分から一分間、町の映像と音声の一部だけが欠落。同じ夜、住民が「なかった道」「知らない家」「動いた家具」「知らない子供」を目撃。', solved: false });
    });

    await K.step('p_deduce', async () => {
      await K.say(['#scene center_office A', 'y:集まったな。並べてみろ。', 'n:観測ボードに、証拠のカードを並べる。', 'y:何が起きたのか。証拠と結べる説明を選べ。']);
      await K.deduce({ id: 'p_what', q: '一分間の空白――何が起きたのか？', link: 2,
        options: [
          { id: 'outage', text: '停電か、機器の故障', need: ['p_power_log'], refute: ['p_power_log'] },
          { id: 'jam', text: '誰かが通信を妨害した', need: ['p_outage_log'], refute: ['p_outage_log'] },
          { id: 'dream', text: '住民の思い込み・集団的な勘違い', need: ['p_tes_road'], refute: ['p_whistle_memo'] },
          { id: 'unknown', text: '機器は正常なのに、記録に残らない「何か」が町で起きた', need: ['p_power_log', 'p_outage_log'] },
        ],
        answer: 'unknown',
        hint: {
          outage: 'その仮説だと「電力・時刻同期ログ」が説明できない。電気も時計も、ずっと正常だった。',
          jam: '妨害なら通信ごと途切れるはずだ。「障害ログ」をよく見ろ。消えたのは映像と音声の一部だけだ。',
          dream: 'お前自身も汽笛を聞いている（当直メモ）。それに、思い込みで監視カメラの映像は欠けない。',
          unknown: '方向は合ってる。機械が正常だったこと、それでも記録が欠けたこと――その二つを結べ。',
        } });
      await K.say(['y:……そうなる。機械は正常。記録だけが欠けた。そして町の人間は、何かを見た。', 'm:説明がつかない、ということだね。', 'm:ようこそ、月代分室へ。']);
      K.note('hypo', 'blank_minute', { title: '仮説：一分間の空白', text: '停電でも故障でも妨害でもない。記録に残らない「何か」が、町の一部で起きた。', solved: false });
    });

    await K.step('p_444', async () => {
      await K.say(['#scene center_server A', '#amb room', 'n:夕方。サーバー室で障害ログを洗い直していた如月さんが、手を止めた。', 'y:新人。これを見ろ。', 't:[通信事業者 提供データ] 02:17〜02:18 町内端末の外部接続', 't:接続先：未登録の配信サーバー（アドレス該当なし）', 't:接続端末数：12', 't:接続時刻：02:44:44 / 02:44:44 / 02:44:44 / 02:44:44 …',
        'y:障害は2時17分から一分間。なのに、接続記録の時刻は全部 2時44分44秒。', 'y:十二台、全部同じ秒だ。', 'p:存在しない配信サーバーに……同じ時刻に。']);
      K.gain('p_conn_444');
      await K.say(['#wait 600', 'p:……444？', 'y:何か意味があるのか？', 'p:いや。', '#wait 400', 'p:偶然だと思います。', 'y:……そうか。', 'n:如月さんはそれ以上聞かなかった。', 'n:私も、それ以上は考えなかった。']);
      K.note('444', 'time_244444', { title: '2:44:44', text: '一分間の空白の夜、町の端末十二台が存在しない配信サーバーへ接続した時刻。障害の時刻と合わない。', solved: false });
    });

    await K.step('p_end', async () => {
      await K.say(['#scene center_office A', '#amb clock', 'm:坂口さんの言う「昨日までなかった道」。林道のお地蔵さんの先だったね。', 'm:明日、二人で見てきてくれないか。たぶん、何もないと思うけれど。', 'y:たぶん、な。', 'n:帰り道。', '#amb wire', 'n:月代町の夜は静かだった。', '#wait 700', '#se whistle', 'n:――遠くで、また何かが鳴った気がした。']);
      K.flag('ch0_done');
    });
  });
})();
