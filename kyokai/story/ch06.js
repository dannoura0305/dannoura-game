/* ══════════════════════════════════════════════════════════
   kyokai/story/ch06.js — 第六章「観測同期」（担当C）
   同期実験（Lv2：見るだけ）→ 世界を切り替えて町を観測（商店街の三つの姿・四つの「落とし物」）
   → 同期Lv3（短時間切替）→ 分室地下・第二観測室の三世界パズル（§27）
   → 封印された観測記録（九条の名）→ もう一つの「私」の机 → 仮説更新「重なり合う複数の月代町」
   フラグ：ch6 / ch6_done / sync_accept|sync_hesitate / traces_found / trace_* / basement_open / kujo_name / self_seen
           philosophy_observe|philosophy_protect|philosophy_unknown
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const C6 = K => K.has('ch6') && !K.has('ch6_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };
  const inRoom = K => K.has('c6_in_room');
  const trace = async (K, id, ev, lines, note) => {
    if (K.has('trace_' + id)) return K.say(lines.slice(0, 1));
    await K.say(lines);
    K.flag('trace_' + id); K.inc('traces_found', 1); K.gain(ev);
    K.note('diff', 'trace_' + id, note);
  };

  // ── 商店街：三つの姿 ──
  const shoSeen = async (K, w, lines) => {
    K.flag('c6_sho_' + w); await K.say(lines);
    if (K.has('c6_sho_A') && K.has('c6_sho_B') && K.has('c6_sho_C') && !K.got('c6_diff_shotengai')) {
      await K.say(['n:三つの商店街を、端末の中で並べる。同じ道、同じ角度。看板も、人も、空の色も違う。']);
      K.gain('c6_diff_shotengai');
      K.note('diff', 'shotengai', { title: '商店街の三つの姿', text: 'A：月代商店街。コインランドリー、やまだ精肉店、月代書店。B：月代銀座。銭湯「月代湯」、三ツ星食堂、貸本屋、「月代駅 →」の案内。C：アーケードが落ち、誰もいない。' });
    }
  };
  ext('shotengai', 'A', [
    { id: 'c6_shoA', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: '入口の看板', acts: ['look'], cond: C6,
      on: { look: async K => shoSeen(K, 'A', ['n:「月代商店街」。見慣れた看板。猫が一匹、日なたで寝ている。']) } },
  ]);
  ext('shotengai', 'B', [
    { id: 'c6_shoB', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: '入口の看板', acts: ['look', 'photo'], cond: C6,
      on: { look: async K => shoSeen(K, 'B', ['n:「月代銀座」。吊り下げの案内板に「月代駅 →」。', 'n:銭湯ののれんが揺れ、子供が走っていく。ナギの町だ。']),
            photo: async K => shoSeen(K, 'B', ['#se shutter', 'n:もう一つの商店街を撮影した。']) } },
  ]);
  ext('shotengai', 'C', [
    { id: 'c6_shoC', x: 0.325, y: 0.172, w: 0.35, h: 0.106, label: '入口の看板', acts: ['look', 'photo'], cond: C6,
      on: { look: async K => shoSeen(K, 'C', ['n:看板が傾き、文字が半分しか残っていない。', 'n:音がない。人がいない。自動販売機が倒れている。']),
            photo: async K => shoSeen(K, 'C', ['#se shutter', 'n:崩れた商店街を撮影した。']) } },
    { id: 'c6_mic', x: 0.525, y: 0.344, w: 0.225, h: 0.367, label: '崩れた書店の奥', acts: ['look', 'photo', 'scan'], cond: K => K.has('ch6'),
      on: { look: async K => trace(K, 'mic', 'c6_trace_mic',
              ['n:崩れた本屋の奥。埃をかぶった本棚の間に、ひとつだけ埃をかぶっていない物がある。', 'n:卓上のマイク。黒いスポンジの風防。', 'n:誰かが昨夜まで使っていたような――そんな気がした。', 'p:……この世界にも、誰か、いたんでしょうか。', 'y:さあな。マイクは喋らない。'],
              { title: '落とし物：マイク（C）', text: '崩壊した世界の商店街、書店の奥。埃をかぶっていない卓上マイク。' }),
            photo: async K => K.say(['#se shutter', 'n:マイクを撮影した。写真の中のマイクだけ、ピントが合いすぎている。']),
            scan: async K => K.say(['t:境界反応 3.1／型：未登録（A・B・C のどれでもない）', 'p:……四つ目の型？']) } },
  ]);

  // ── 住宅街：机の上の参考書（B） ──
  ext('residential', 'B', [
    { id: 'c6_book', x: 0.087, y: 0.311, w: 0.25, h: 0.356, label: '灯りのついた窓', acts: ['look', 'photo'], cond: K => K.has('ch6'),
      on: { look: async K => trace(K, 'book', 'c6_trace_book',
              ['n:もう一つの月代町の住宅街。こちらの世界では空き家の場所に、灯りのついた部屋がある。', 'n:窓の向こうに机。誰もいない。', 'n:机の上に、分厚い本が開いたまま。付箋がびっしり貼られ、蛍光ペンの線が何重にも引いてある。', 'n:資格試験の参考書のようだ。余白に小さな字。「ここ絶対出る」「眠い」「あと少し」。', 'p:……頑張っている人の机ですね。', 'y:眠いって書いてあるな。'],
              { title: '落とし物：参考書（B）', text: 'もう一つの月代町の住宅街。灯りのついた部屋の机に、付箋だらけの資格の参考書。余白に「ここ絶対出る」「眠い」「あと少し」。' }),
            photo: async K => K.say(['#se shutter', 'n:窓を撮影した。参考書の表紙だけが、白く飛んで読めない。']) } },
  ]);

  // ── 山道：工具箱（B） ──
  ext('mountain_road', 'B', [
    { id: 'c6_tools', x: 0.08, y: 0.66, w: 0.14, h: 0.18, label: '道ばたの工具箱', acts: ['look', 'photo'], cond: K => K.has('ch6'),
      on: { look: async K => trace(K, 'tools', 'c6_trace_tools',
              ['n:街灯のついた脇道の入口に、赤い工具箱が置き忘れられている。', 'n:中にはラチェット、検電器、絶縁テープ。手書きの点検表が一枚。', 't:点検表　No.3 ポンプ　異音あり→ベアリング交換　済', 'n:名前の欄だけ、雨でにじんで読めない。', 'y:……使い込まれてるな。手入れもいい。', 'p:丁寧な人なんでしょうね。'],
              { title: '落とし物：工具箱（B）', text: 'もう一つの月代町の山道。使い込まれた工具箱。点検表「No.3 ポンプ 異音あり→ベアリング交換 済」。名前はにじんで読めない。' }),
            photo: async K => K.say(['#se shutter', 'n:工具箱を撮影した。']) } },
  ]);

  // ── 小学校：子供の絵（C） ──
  ext('school', 'C', [
    { id: 'c6_drawing', x: 0.08, y: 0.7, w: 0.15, h: 0.15, label: '落ちている画用紙', acts: ['look', 'photo'], cond: K => K.has('ch6'),
      on: { look: async K => trace(K, 'drawing', 'c6_trace_drawing',
              ['n:誰もいない校庭の隅に、画用紙が一枚落ちている。', 'n:クレヨンの絵。長い紫の髪の人と、小さな子が手をつないでいる。', 'n:紫の人の頭の上に、ちょこんと小さな帽子。', 'n:二人とも、口が大きな弧を描いて笑っている。', 'p:……かわいい絵ですね。', 'y:崩れた世界には、似合わないな。'],
              { title: '落とし物：子供の絵（C）', text: '崩壊した世界の小学校。クレヨンの絵：長い紫の髪に小さな帽子の人と、手をつないだ小さな子。二人とも笑っている。' }),
            photo: async K => K.say(['#se shutter', 'n:絵を撮影した。']) } },
  ]);

  // ── 境界観測で見える、ほかの世界の町（第六章から・ずっと残る） ──
  const W6 = K => K.has('ch6');
  const L = (id, x, y, w, h, label, lines) => ({ id, x, y, w, h, label, acts: ['look'], cond: W6, on: { look: async K => K.say(lines) } });
  ext('shotengai', 'B', [
    L('w6_poster_b', 0.431, 0.35, 0.05, 0.122, '柱のポスター', ['n:「月代劇場　月の汽車　上映中」。', 'n:こちらの世界の月代町には、映画館がない。']),
    L('w6_phone_b', 0.941, 0.483, 0.044, 0.111, 'ピンク電話', ['n:たばこ屋の店先のピンク電話。受話器の横に、十円玉が積んである。', 'n:刻印は、どれも昭和九十年代。']),
    L('w6_kashihon_b', 0.662, 0.511, 0.056, 0.189, '貸本屋の主人', ['n:白髪の主人が、帳場で居眠りをしている。', 'n:こちらの世界の柏木さんの書店と、同じ場所。棚の並びまで同じだ。']),
  ]);
  ext('residential', 'B', [
    L('w6_tower_b', 0.156, 0.111, 0.063, 0.40, '火の見やぐら', ['n:火の見やぐら。半鐘が、風もないのにかすかに揺れている。']),
    L('w6_tsukimi_b', 0.297, 0.539, 0.056, 0.211, '自動販売機「ツキミ」', ['n:知らない銘柄の自販機。「ツキミ・サイダー」。', 'n:こちらの世界では、ここにはコンクリートの台しかない。']),
    L('w6_dog_b', 0.822, 0.622, 0.063, 0.10, '白黒のぶちの犬', ['n:白黒のぶちの犬。首輪の名札に「タロウ」。', 'n:こちらの世界の大野さんの犬と、同じ名前。']),
  ]);
  ext('residential', 'C', [
    L('w6_house_c', 0.381, 0.278, 0.25, 0.389, '崩れた家', ['n:崩れた家。表札は白紙。', 'n:瓦礫の中に、汽車の時刻表の切れ端。']),
  ]);
  ext('school', 'B', [
    L('w6_statue_b', 0.694, 0.578, 0.063, 0.20, '本を読む子供の銅像', ['n:本を読む子供の銅像。台座に「勤勉」。', 'n:銅像の子は、どこかナギに似ている気がした。']),
    L('w6_banner_b', 0.609, 0.317, 0.037, 0.289, '垂れ幕', ['n:「祝 創立百周年」。', 'n:こちらの世界の月代小は、まだ五十周年だ。']),
  ]);
  ext('school', 'C', [
    L('w6_clock_c', 0.472, 0.161, 0.056, 0.10, '針のない時計', ['n:校舎の時計には、針がない。', 'n:文字盤の「2」と「4」だけが、こすれて薄くなっている。']),
  ]);
  ext('shrine', 'B', [
    L('w6_plaque_b', 0.469, 0.328, 0.063, 0.122, '鳥居の額', ['n:石の鳥居の額は「月見」。', 'n:こちらの「月代」と、一文字だけ違う。']),
    L('w6_fox_b', 0.206, 0.544, 0.20, 0.222, '狐の像', ['n:狛犬のかわりに、赤い前掛けの狐。', 'n:灯籠に火が入っている。誰かが、毎晩つけている。']),
  ]);
  ext('riverbank', 'B', [
    L('w6_bridge_b', 0.0, 0.344, 1.0, 0.167, '鉄道の鉄橋', ['n:川を渡る鉄橋。クリーム色と緑の二両編成が、ゆっくり渡っていく。', 'n:ナギが毎朝渡る、月代橋。']),
    L('w6_angler_b', 0.219, 0.60, 0.20, 0.178, '夜釣りの男性', ['n:ランタンを置いて、夜釣りをしている男性。', 'n:横顔が、源さんにそっくりだった。']),
    L('w6_sign_b', 0.697, 0.572, 0.087, 0.228, '看板', ['n:「月代川 遊泳禁止 月代村」。', 'p:……村？', 'y:向こうでは、まだ町になってないのかもな。']),
  ]);
  ext('riverbank', 'C', [
    L('w6_bridge_c', 0.0, 0.40, 1.0, 0.167, '橋の残骸', ['n:橋の残骸。川の水は流れていない。止まった水面に、空が映っていない。']),
  ]);
  ext('tunnel', 'B', [
    L('w6_plate_b', 0.697, 0.539, 0.075, 0.111, '銘板', ['n:「月代線 第三隧道」。', 'n:トンネルの中に灯りが並び、線路が奥へ続いている。足音の反響は、一組だけだ。']),
  ]);
  ext('mountain_road', 'B', [
    L('w6_busstop_b', 0.747, 0.367, 0.056, 0.244, 'バス停', ['n:バス停「月代駅前」。時刻表の最終は 0:44。', 'n:時刻表の余白に、鉛筆で小さく「2:17」。誰かが書き足している。']),
  ]);
  ext('center_office', 'C', [
    L('w6_office_c', 0.338, 0.167, 0.144, 0.20, 'ホワイトボード', ['n:崩れた分室。ホワイトボードに「2:17」の文字だけが残っている。', 'n:書いたのは、こちらの世界の誰だったのだろう。']),
  ]);

  // ── 分室：もう一つの私の机（B） ──
  ext('center_office', 'B', [
    { id: 'c6_selfdesk', x: 0.72, y: 0.5, w: 0.14, h: 0.17, label: '私の席', acts: ['look', 'photo'], cond: K => C6(K) && K.has('basement_open'),
      on: { look: async K => {
        await K.say(['n:國立 月代觀測所。木の床、振り子時計、タイプライター。', 'n:私の席にあたる机に、名札が立っている。', 't:主任觀測員　{name}', '#wait 500', 'p:……。', 'n:机の上に、写真立て。知らない人たちと、知らない家の前で笑っている、私。', 'n:私は、こんな部署にいた……？', 'y:新人。', 'p:……はい。', 'y:見るな、とは言わない。でも、長く見るな。']);
        K.gain('c6_self_desk'); K.flag('self_seen');
        K.note('diff', 'self', { title: 'もう一つの私', text: 'もう一つの月代町の分室に、私の名前の札。肩書は主任観測員。机の上には、知らない家族と笑う私の写真。', solved: false });
      },
      photo: async K => { await K.say(['#se shutter', 'n:撮影した。写真の中の名札は、ちゃんと私の名前だった。']); K.gain('c6_self_desk'); K.flag('self_seen'); } } },
  ]);

  // ── 分室地下：三世界パズル ──
  const doorA = async K => {
    if (K.has('basement_open')) return K.say(['n:第二観測室の扉は開いている。']);
    if (K.has('c6_lock_cut')) {
      await K.say(['#se beep', 'n:電子錠のランプが消えている。取っ手に手をかける。', 'n:――カチリ。', 'n:扉が、開いた。', 'y:……停電時開放型。電気を切れば開く錠を、電気を切りに行けない場所に置いてたわけだ。', 'p:Cで壁を抜けて、Bで配電図を読んで、Aで切る。', 'y:三つの世界を一つの建物みたいに使ったな。']);
      K.flag('basement_open'); K.flag('unlocked'); return;
    }
    await K.say(['n:第二観測室。電子錠の赤いランプが点滅している。', 'n:テンキーの暗証番号は誰も知らない。御堂室長も「十年以上前に失われた」と言った。', 'n:錠の銘板。', 't:電子錠　停電時開放型（フェイルセーフ）', 'p:電源が切れると、開く錠……。']);
    K.gain('c6_lock_label');
  };
  ext('center_basement', 'A', [
    { id: 'c6_doorA', x: 0.39, y: 0.25, w: 0.22, h: 0.46, label: '第二観測室の扉', acts: ['look', 'photo', 'scan'], cond: K => C6(K) && !inRoom(K),
      on: { look: doorA, photo: async K => { await K.say(['#se shutter', 'n:扉と電子錠の銘板を撮影した。']); K.gain('c6_lock_label'); },
            scan: async K => K.say(['t:電子錠 給電中（系統不明）', 't:境界反応 2.2（扉の向こう）']) } },
    { id: 'c6_keypadA', x: 0.61, y: 0.44, w: 0.05, h: 0.11, label: '電子錠（テンキー）', acts: ['look'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => K.say(['n:適当な番号を押してみる。', '#se beep', 'n:赤いランプが三回点滅した。', 'y:……4、4、4、は押すなよ。', 'p:押していません。……押していません。']) } },
    { id: 'c6_panelA', x: 0.21, y: 0.32, w: 0.09, h: 0.22, label: '分電盤', acts: ['look'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => K.say(['n:通路の分電盤。蓋には鍵がかかっている。', 'n:隙間から見える表示は「照明」「換気」だけ。電子錠の系統は、ここにはない。', 'y:錠の電源は別のところから来てる。……この壁の向こうに、昔の配電室があったはずだ。', 'p:壁の向こう。でも、ここは壁です。']) } },
    { id: 'c6_wallA', x: 0.09, y: 0.33, w: 0.10, h: 0.38, label: '左の壁', acts: ['look', 'scan'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => K.say(['n:コンクリートの壁。叩くと、向こう側が空洞のような音がする。']),
            scan: async K => K.say(['t:壁の向こう：空間あり（約 3m×4m）', 't:境界反応 1.9']) } },
    // 別室（配電室）にいるとき
    { id: 'c6_mainA', x: 0.21, y: 0.32, w: 0.12, h: 0.24, label: '（別室）古い主幹ブレーカー', acts: ['look'], cond: K => C6(K) && inRoom(K),
      on: { look: async K => {
        if (K.has('c6_lock_cut')) return K.say(['n:No.7 のレバーは下がったままだ。']);
        await K.say(['n:こちらの世界の、閉ざされた配電室。電気が生きている。', 'n:古いブレーカーが十個並んでいる。札はどれも黄ばんで、文字が読めない。']);
        if (!K.got('c6_breaker_diagram')) return K.say(['p:どれが電子錠の系統か、分からない。', 'y:当てずっぽうで落とすと、上の観測装置まで止まるぞ。……どこかに配電図はないのか。']);
        const v = await K.choice('どのブレーカーを落とす？', [{ t: 'No.3', v: 3 }, { t: 'No.4', v: 4 }, { t: 'No.7', v: 7 }, { t: 'No.9', v: 9 }]);
        if (v !== 7) { K.stab(-3); K.flag('c6_wrong_' + v); return K.say(['#fx blackout', 'n:上の階で、何かが止まる音。', 'y:……違う。戻せ。配電図をよく見ろ。', 'n:慌ててレバーを戻した。']); }
        await K.say(['#se wire', 'n:No.7。レバーを下ろす。', 'n:どこか遠くで、小さな電子音が一つ鳴って、消えた。', 'y:錠の電気が落ちた。……戻るぞ。']);
        K.flag('c6_lock_cut');
      } } },
  ]);
  ext('center_basement', 'B', [
    { id: 'c6_doorB', x: 0.39, y: 0.25, w: 0.22, h: 0.46, label: '開いている扉', acts: ['look', 'photo'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => { await K.say(['n:こちらの世界の地下は停電している。非常口の灯りだけ。', 'n:第二観測室の扉が、半開きのまま止まっている。', 'n:中は空っぽだ。この世界では、ここは使われていないらしい。', 'p:電気が来ていないから、錠が開いている。']); K.gain('c6_door_open_b'); },
            photo: async K => { await K.say(['#se shutter', 'n:開いた扉を撮影した。']); K.gain('c6_door_open_b'); } } },
    { id: 'c6_panelB', x: 0.21, y: 0.32, w: 0.12, h: 0.22, label: '分電盤（蓋が開いている）', acts: ['look'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => K.say(['n:蓋の開いた分電盤。レバーが一本下がっている。', 'n:こちらも「照明」「換気」だけ。電子錠の系統はない。']) } },
    { id: 'c6_diagramB', x: 0.21, y: 0.32, w: 0.12, h: 0.24, label: '（別室）配電室の壁', acts: ['look', 'photo'], cond: K => C6(K) && inRoom(K),
      on: { look: async K => {
        if (K.got('c6_breaker_diagram')) return K.say(['n:配電図。「No.7 地下 第二観測室 電子錠」。']);
        await K.say(['n:真っ暗だ。懐中電灯をつける。']);
        if ((K.item('light') | 0) > 0) K.item('light', -1);
        await K.say(['n:こちらの世界の配電室は、改修されたばかりらしい。壁に新しい配電図が貼ってある。', 't:No.3 地下 照明', 't:No.4 地下 換気', 't:No.7 地下 第二観測室 電子錠', 't:No.9 一階 観測装置', 'p:No.7。……建物の作りは、どの世界でも同じはずです。', 'y:配線までは、たぶんな。']);
        K.gain('c6_breaker_diagram');
      }, photo: async K => { await K.say(['#se shutter', 'n:配電図を撮影した。']); K.gain('c6_breaker_diagram'); } } },
  ]);
  ext('center_basement', 'C', [
    { id: 'c6_hole', x: 0.09, y: 0.33, w: 0.18, h: 0.40, label: '崩れた壁の穴', acts: ['look', 'scan'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => {
        await K.say(['n:崩れた世界では、左の壁に大きな穴があいている。', 'n:向こうに、小さな部屋。配電盤の残骸が転がっている。']);
        const v = await K.choice('穴をくぐる？', [{ t: 'くぐって別室へ', v: 'in' }, { t: 'やめておく', v: 'no' }]);
        if (v === 'in') { K.flag('c6_in_room'); await K.say(['n:瓦礫を踏んで、穴をくぐる。', 'n:――壁の向こう。配電室だった場所に立った。', 'y:位置は、どの世界でも同じだ。ここで世界を切り替えれば、閉ざされた部屋の中に立てる。']); }
      },
      scan: async K => K.say(['t:境界反応 3.6', 'n:長居はしないほうがいい。']) } },
    { id: 'c6_doorC', x: 0.39, y: 0.25, w: 0.22, h: 0.46, label: '歪んだ扉', acts: ['look'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => K.say(['n:崩れた世界の第二観測室の扉は、枠ごと歪んで動かない。']) } },
    { id: 'c6_backC', x: 0.09, y: 0.33, w: 0.18, h: 0.40, label: '（別室）穴から通路へ戻る', acts: ['look'], cond: K => C6(K) && inRoom(K),
      on: { look: async K => { K.unflag('c6_in_room'); await K.say(['n:穴をくぐって、通路へ戻った。']); } } },
    { id: 'c6_rubbleC', x: 0.17, y: 0.66, w: 0.20, h: 0.09, label: '瓦礫', acts: ['look'], cond: K => C6(K) && !inRoom(K),
      on: { look: async K => { if (K.has('c6_rubble')) return K.say(['n:瓦礫。']); K.flag('c6_rubble'); K.item('stab', 1); await K.say(['n:瓦礫の下に、割れていないアンプルが一本。', 't:境界安定剤 ×1 を手に入れた']); } } },
    { id: 'c6_roomC', x: 0.21, y: 0.32, w: 0.12, h: 0.24, label: '（別室）配電盤の残骸', acts: ['look'], cond: K => C6(K) && inRoom(K),
      on: { look: async K => K.say(['n:崩れた配電盤。この世界では、もう何も流れていない。', 'n:札も焼けて読めない。']) } },
  ]);
  ext('center_basement', 'A', [
    { id: 'c6_backA', x: 0.09, y: 0.33, w: 0.10, h: 0.38, label: '（別室）壁', acts: ['look'], cond: K => C6(K) && inRoom(K),
      on: { look: async K => K.say(['n:こちらの世界では、ここは閉ざされた部屋だ。出るには、壁が崩れている世界へ切り替えて穴を通るしかない。']) } },
  ]);

  KY_STORY.register('ch06', async K => {
    await K.step('c6_start', async () => {
      K.flag('ch6'); K.stab(20);
      await K.title('第六章', '観測同期');
      await K.say(['#scene center_lab A', '#amb clock', 'n:観測装置室。リング状の装置の中心に、シロが丸くなっている。', 'm:手順を確認しよう。君がシロに触れる。装置が、君とシロの波形の一致を測る。', 'm:一致が一定を超えたら、観測端末に「向こう側」が重なって表示されるはずだ。', 'm:……はずだ、としか言えない。前に試した記録は、一つしかない。', 'p:その一つは、どうなったんですか。', 'm:――。', 'y:御堂さん。', 'm:……成功した。そして、観測者は戻らなかった。']);
      const v = await K.choice('御堂「やめてもいい。誰も責めない」', [
        { t: 'やります。見えるものは、見たい', v: 'accept' },
        { t: '……怖いです。でも、やります', v: 'hesitate' },
      ]);
      K.flag('sync_' + v);
      if (v === 'accept') await K.say(['m:……君は、知りたがりだね。', 'y:命綱は俺が持つ。戻ってこい、とだけ言っておく。']);
      if (v === 'hesitate') await K.say(['m:怖いと言える人のほうが、戻ってこられる。', 'y:命綱は俺が持つ。怖くなったら、俺の声を探せ。']);
      await K.say(['n:シロに触れる。', '#fx flash', '#se whistle', 'n:――耳の奥で、汽笛。', 'n:観測端末の画面に、分室が二重に映った。', 'n:一枚は、いつもの分室。もう一枚は、木の床とタイプライターの、昭和の分室。', 't:同期率 41% …… 境界観測 可能（観測のみ）', 'm:……見えるかい。', 'p:見えます。二つの分室が、重なって。']);
      K.sync(2); K.gain('c6_sync_log');
      K.note('term', 'sync', { title: 'シロ同期', text: 'Lv1：町のほつれが分かる。Lv2：同じ場所の別の世界を「見る」ことができる（調べる・撮影のみ）。', solved: false });
      await K.say(['m:境界観測。端末のボタンで、その場所の別の世界に視点を合わせられる。', 'm:今は「見るだけ」だ。触れることも、持ち帰ることもできない。', 'y:見るだけでも、長くいれば安定度は削れる。崩れた世界は特にだ。', 'm:町を一回り、観測してきてくれ。どの世界の、何が違うのか。']);
    });

    await K.step('c6_observe', async () => {
      await K.explore({ goal: K => K.got('c6_diff_shotengai') && (K.get('traces_found') | 0) >= 2,
        hint: '境界観測で世界を切り替え、町を観測する：商店街の三つの姿（A・B・C）と、別の世界の「落とし物」（2つ以上）', areas: ['center_office', 'center_lab', 'shotengai', 'residential', 'school', 'shrine', 'riverbank', 'mountain_road'] });
      await K.say(['#scene center_office A', 'y:……妙なものばかり拾ってくるな。', 'p:拾っていません。見てきただけです。', 'y:資格の参考書。崩れた町のマイク。工具箱。子供の絵。', 'y:どれも、誰かの暮らしの道具だ。', 'p:世界ごとに、いろんな人が住んでいるんですね。', 'y:……ああ。そうだな。']);
    });

    await K.step('c6_lv3', async () => {
      await K.say(['#scene center_lab A', 'm:一つ、頼みがある。', 'm:分室の地下に「第二観測室」という部屋がある。十年以上、開いていない。', 'm:電子錠の暗証番号は失われた。壊せば、中の記録まで壊れるかもしれない。', 'm:……あの部屋には、前に同期を試した観測者の記録がある。', 'y:御堂さん。それは「頼み」じゃなくて、ずっと開けたかった扉だろう。', 'm:……そうだね。そうだ。', 'm:同期を、もう一段深める。短い時間なら、向こうの世界で「手を動かせる」ようになるはずだ。']);
      await K.say(['n:もう一度、シロに触れる。今度は長く。', '#fx glitch', '#se whistle', 'n:指先が冷たくなる。自分の輪郭が、少しだけ薄くなった気がした。', 't:同期率 63% …… 短時間切替 可能', 'y:新人。……おい、新人。', 'p:……聞こえています。', 'y:ならいい。']);
      K.sync(3); K.stab(-8);
      K.note('term', 'sync', { title: 'シロ同期', text: 'Lv1：町のほつれが分かる。Lv2：別の世界を見る。Lv3：短い時間なら、別の世界で手を動かせる（体の位置はどの世界でも同じ）。', solved: false });
      K.unlock('center_basement');
      K.note('place', 'center_basement', { title: '分室 地下・第二観測室', text: '十年以上開いていない部屋。電子錠の暗証番号は失われた。前に同期を試した観測者の記録があるという。', solved: false });
    });

    await K.step('c6_basement', async () => {
      await K.say(['#scene center_basement A', '#amb wire', 'n:分室の地下通路。蛍光灯が一本、ちらついている。', 'n:突き当たりに「第二観測室」。電子錠の赤いランプ。', 'y:世界を切り替えて、三つとも見てみろ。同じ通路でも、たぶん違う。']);
      await K.explore({ goal: K => K.has('basement_open'),
        hint: '第二観測室を開ける：A＝電気あり・扉は施錠／B＝停電・扉は開いている／C＝壁が崩れている。三つの世界を行き来する', areas: ['center_basement'], start: 'center_basement' });
    });

    await K.step('c6_room', async () => {
      K.setWorld('A');
      await K.say(['#scene center_basement A', '#amb room', 'n:第二観測室。埃の匂い。机の上に、紐で綴じた観測記録の束。', 'n:一番上の表紙。', 't:境界観測記録　月代分室　観測者名簿', 't:001　御堂', 't:002　如月', 't:003　――（空欄）', 't:……', 'p:如月さんの名前が、ここに。', 'y:……俺は、ここに入ったことはない。', 'y:入ったことは、ないはずだ。', 'n:頁をめくる。名簿の下に、一行だけ、墨で塗りつぶされかけた名前。', 't:主任　九條（九条）', 'n:御堂室長が、後ろで小さく息をのんだ。']);
      K.gain('c6_room_record'); K.flag('kujo_name');
      K.note('person', 'kujo', { title: '九条（九條）', text: '第二観測室の観測者名簿に、墨で消されかけた名前。「主任 九條」。分室の職員写真の空き枠の「九」とつながる？　御堂室長は何かを知っている。', solved: false });
      await K.say(['p:室長。九条さん、というのは。', 'm:……前に同期を試した観測者だ。', 'm:それ以上は――すまない。今は、まだ話せない。', 'y:御堂さん。', 'm:話せるようになったら、話す。約束する。', 'n:記録の束の一番下に、もう一枚。端の焦げた写真。', 'n:どこかの分室。木の床。タイプライター。', 'n:その机に、名札が見えた気がした。私の名前の。', 'p:……如月さん。上の分室を、もう一度「向こう側」で見てきます。']);
    });

    await K.step('c6_self', async () => {
      await K.explore({ goal: K => K.got('c6_self_desk'), hint: '境界観測で、もう一つの分室（B）の「私の席」を確かめる', areas: ['center_office', 'center_lab', 'center_basement', 'shotengai', 'residential', 'school', 'mountain_road'], start: 'center_office' });
    });

    await K.step('c6_deduce', async () => {
      K.setWorld('A');
      await K.say(['#scene center_office A', '#amb clock', 'm:……ボードを、もう一度並べよう。', 'm:私たちは「D：もう一つの月代町」という仮説を立てた。ナギちゃんの町だ。', 'y:でも、崩れた町がある。柏木さんの記憶の町だ。マイクの型は、そのどれでもなかった。', 'p:それに、向こうの分室には、私がいました。']);
      await K.deduce({ id: 'c6_many', q: '仮説の更新――月代町で起きていることを、いま最もよく説明するのは？', link: 2,
        options: [
          { id: 'two', text: '月代町は二つ（この町とナギの町）だけ', need: ['c6_diff_shotengai'], refute: ['c5_shiro_scan'] },
          { id: 'time', text: '同じ月代町の、過去と未来が混ざっている', need: ['c6_diff_shotengai'], refute: ['c4_coin'] },
          { id: 'many', text: 'いくつもの月代町が重なっていて、人も場所も、それぞれの世界に「もう一つ」ある', need: ['c6_diff_shotengai', 'c6_self_desk'] },
        ],
        answer: 'many',
        hint: {
          two: '二つなら、シロの波形は二種類のはずだ。三つ――いや、それ以上の型が出てる。',
          time: '過去でも未来でもない。昭和九十五年の十円玉を覚えてるか。あれは、どの時間にも存在しない。',
          many: 'その線だ。三つの姿を持つ商店街と、向こうの世界の「お前の机」を結べ。場所だけじゃない。人も、だ。',
        } });
      await K.say(['p:いくつもの月代町が、重なっている。', 'p:場所だけじゃない。人も――それぞれの世界に、それぞれの私がいる。', 'm:……そして、ときどき、混ざる。', 'm:2時17分に。橋のたもとに。誰かの記憶に。', 'y:写真の中に、な。']);
      K.note('hypo', 'worlds', { title: '仮説：重なり合う月代町', text: '月代町は一つではない。少なくとも三つ以上の月代町が重なっていて、人も場所もそれぞれの世界に「もう一つ」ある。ときどき、それが混ざる。', solved: false });
    });

    await K.step('c6_end', async () => {
      await K.say(['n:その夜。分室の屋上。', 'n:シロが手すりの上で丸くなっている。ナギが、それを指でつついている。', 'g:ねえ。あたしの町にも、あなたがいるの？', 'p:……いるかもしれない。', 'g:じゃあ、その人に会ったら、あたしのこと、よろしくって言っといて。', 'p:向こうの私に？', 'g:うん。だって、同じ人なんでしょ？', 'n:答えに詰まった。同じ人、なのだろうか。', 'y:……新人。お前、観測ってなんだと思う。']);
      const v = await K.choice('如月「観測ってなんだと思う」', [
        { t: '起きていることを、そのまま記録すること', v: 'observe', s: '記録する' },
        { t: '誰かが消えないように、見ていること', v: 'protect', s: '守る' },
        { t: '……まだ分かりません', v: 'unknown', s: '保留' },
      ]);
      K.flag('philosophy_' + v);
      if (v === 'observe') await K.say(['y:教科書どおりだな。', 'y:……でも、そのままを記録するのが一番むずかしい。見てるうちに、見てるほうも変わる。']);
      if (v === 'protect') await K.say(['y:見ていれば、消えない。', 'y:……いい答えだ。見られているほうが、そう思ってくれるかは分からないけどな。']);
      if (v === 'unknown') await K.say(['y:そうか。', 'y:分からないまま観測できるやつは、案外少ない。大事にしろ。']);
      await K.say(['n:風が吹く。', '#se whistle', 'n:汽笛。もう、驚かない。', 'n:シロが顔を上げて、山ではなく、空のどこか一点をじっと見つめた。', 's:……きゅ。', 'n:その方向には、何もない。', 'n:何もないはずの夜空の一点から、かすかに――ラジオの砂嵐のような音が聞こえた気がした。', '#se static']);
      K.flag('ch6_done');
    });
  });
})();
