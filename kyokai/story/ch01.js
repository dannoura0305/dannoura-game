/* ══════════════════════════════════════════════════════════
   kyokai/story/ch01.js — 第一章「存在しない駅」（担当C）
   調査（地図・町史・証言・磁場）→ 地図にない道 → 廃駅 → 営業中の駅（世界B）
   → 広告（表示名が崩れる）→ 崩れる駅から逃げる（chase）→ 推理「否定できる仮説」
   フラグ：ch1 / ch1_done / saw_ad_name / ad_reach
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const NM = K => (K.name || (K.state && K.state.name) || '朝霧');
  const C1 = K => K.has('ch1') && !K.has('ch1_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };

  // ── 分室：地図 ──
  ext('center_office', 'A', [
    { id: 'c1_map', x: 0.131, y: 0.5, w: 0.206, h: 0.156, label: '町の地図', acts: ['look', 'photo'], cond: C1,
      on: { look: async K => {
        await K.say(['n:壁に貼られた月代町の地図。', 'n:山側には林道が一本。お地蔵さんの印の先は、等高線しかない。', 'n:鉄道の線は、どこにも引かれていない。']);
        K.gain('c1_town_map');
      }, photo: async K => { await K.say(['#se shutter', 'n:地図を撮影した。']); K.gain('c1_town_map'); } } },
    { id: 'c1_mido', x: 0.62, y: 0.62, w: 0.12, h: 0.25, label: '御堂室長', acts: ['talk'], cond: C1,
      on: { talk: async K => K.say(['m:山道へ行く前に、町のことを少し調べておくといい。', 'm:神社の白峰さんは町史に詳しい。商店街の松井さんは、この町に八十年住んでいる。', 'm:それと――山では簡易磁場計を出しておきなさい。針は、人より先に気づくことがある。']) } },
  ]);

  // ── 神社 ──
  ext('shrine', 'A', [
    { id: 'c1_shiramine', x: 0.86, y: 0.28, w: 0.1, h: 0.25, label: '宮司の白峰さん', acts: ['talk', 'record'], cond: C1,
      on: { talk: async K => {
        await K.say(['x:白峰|鉄道？ 月代町に？', 'x:白峰|いいえ。明治の測量から今まで、線路が敷かれたことは一度もありません。', 'x:白峰|計画すらなかった。山が急で、川が暴れる。鉄道屋さんには嫌われる土地でね。', 'n:白峰さんは社務所から古い町史を持ってきて、交通の頁を開いてくれた。', 'x:白峰|ほら。「本町ニ鉄道ナシ」。……わざわざ書いてあるのも、変な話ですが。']);
        K.gain('c1_shrine_record');
        K.note('person', 'shiramine', { title: '白峰 宮司', text: '月代神社の宮司。町史に詳しい。「月代町に鉄道が敷かれたことはない」。' });
      }, record: async K => K.say(['#se rec', 'x:白峰|録音ですか。では、はっきり。この町に、駅はありません。']) } },
    { id: 'c1_ema', x: 0.778, y: 0.5, w: 0.106, h: 0.133, label: '絵馬掛け', acts: ['look'], cond: C1,
      on: { look: async K => K.say(['n:絵馬がたくさん掛かっている。「合格祈願」「家内安全」「店を続けられますように」。', 'n:一枚だけ、子供の字で「汽車にのれますように」。', 'p:……汽車？', 'n:日付は書いていない。']) } },
    { id: 'c1_shrine_scan', x: 0.344, y: 0.278, w: 0.313, h: 0.2, label: '社殿', acts: ['look', 'scan'], cond: C1,
      on: { look: async K => K.say(['n:古い社殿。静かすぎて、耳の奥が鳴る。']),
            scan: async K => K.say(['t:磁場 0.08μT／温度 17.2℃', 'n:何も出ない。……少しだけ、ほっとした。']) } },
  ]);

  // ── 商店街：松井さん ──
  ext('shotengai', 'A', [
    { id: 'c1_matsui', x: 0.42, y: 0.45, w: 0.10, h: 0.30, label: '駄菓子屋の松井さん', acts: ['talk'], cond: C1,
      on: { talk: async K => {
        await K.say(['n:自販機の横の、小さな駄菓子の棚。手書きの札に「月末で店じまいします」。', 'x:松井|あら、分室の新しい人。飴、持っていきな。もうすぐ店じまいだから、在庫整理。', 'x:松井|汽車？ ……変なこと聞くねえ。', 'x:松井|子供のころね、夜中に汽車の音を聞いたことがあるんだよ。遠くで、ぼーって。', 'x:松井|母さんに言ったら「この町に汽車はない、夢だ」って。', 'x:松井|それからは誰にも言わなかった。八十年ぶりに言ったよ、今。', 'p:……どんな音でしたか。', 'x:松井|寂しい音。迎えに来たみたいな。']);
        K.gain('c1_tes_matsui');
        K.note('person', 'matsui', { title: '松井さん', text: '商店街の駄菓子屋。八十年この町に住む。子供のころ夜中に汽車の音を聞いた。' });
      } } },
  ]);

  // ── 山道 ──
  ext('mountain_road', 'A', [
    { id: 'c1_jizo', x: 0.05, y: 0.55, w: 0.1, h: 0.22, label: 'お地蔵さん', acts: ['look'], cond: C1,
      on: { look: async K => K.say(['n:苔むしたお地蔵さん。前に、新しい缶コーヒーが供えてある。', 'y:……俺じゃないぞ。', 'p:何も言ってません。']) } },
    { id: 'c1_branch', x: 0.625, y: 0.533, w: 0.3, h: 0.189, label: '分かれ道', acts: ['look', 'photo', 'scan'], cond: C1,
      on: { look: async K => {
        await K.say(['n:林道の脇から、草に埋もれた細い道が分かれている。', 'n:草の下に、舗装と白線。かすかに光っているようにも見える。地図には、ない。', 'p:坂口さんの言った道……。けさは雑木林だったはずなのに。', 'y:時間帯か、天気か、それとも見る人間か。']);
        if (!K.has('c1_branch_seen')) { K.flag('c1_branch_seen'); await K.say(['#amb whistle_far', 'n:風もないのに、道の奥から冷たい空気が流れてくる。']); }
      },
      photo: async K => { await K.say(['#se shutter', 'n:分かれ道を撮影した。', 'n:画面の中のカーブミラーに、街灯のついた舗装路が映り込んでいる。目の前のミラーには、草むらしか映っていないのに。']); K.gain('c1_road_photo'); },
      scan: async K => { await K.say(['n:簡易磁場計を向ける。', '#se beep', 'n:針がゆっくりと――一周した。', 't:磁場 測定不能（振り切れ）', 'y:道の入口から先だけだ。こっち側は正常。']); K.gain('c1_meter_road'); } } },
    { id: 'c1_post', x: 0.613, y: 0.211, w: 0.069, h: 0.3, label: 'カーブミラー', acts: ['look'], cond: C1,
      on: { look: async K => K.say(['n:カーブミラーをのぞく。', 'n:一瞬、映っている道に街灯がともり、バス停の標識が見えた。「月代駅前」。', '#fx glitch', 'n:瞬きをすると、ただの草むらに戻っていた。', 'p:月代駅……。', 'y:そんな駅は、ない。', 'p:ですよね。']) } },
  ]);

  // ── 廃駅（世界A） ──
  ext('station', 'A', [
    { id: 'c1_platform', x: 0.4, y: 0.64, w: 0.3, h: 0.18, label: '崩れたホーム', acts: ['look', 'photo', 'scan'], cond: C1,
      on: { look: async K => K.say(['n:コンクリートのホームが割れ、草が生えている。', 'n:レールは赤く錆び、枕木は半分土に埋もれている。', 'p:少なくとも、何十年も前に止まった駅に見えます。', 'y:「止まった」なら、動いていた時期がある。']),
            photo: async K => { await K.say(['#se shutter', 'n:廃駅のホームを撮影した。']); K.gain('c1_ruin_photo'); },
            scan: async K => K.say(['t:磁場 1.8μT（高い）／温度 12.0℃（周囲より4℃低い）', 'n:レールの上だけ、空気が冷たい。']) } },
    { id: 'c1_sign', x: 0.391, y: 0.406, w: 0.219, h: 0.156, label: '駅名標', acts: ['look', 'photo'], cond: C1,
      on: { look: async K => K.say(['n:割れた駅名標。「つきしろ／月代」。', 'n:左右の隣駅の名前は削れて読めない。片方は「かい」で始まっているように見える。']),
            photo: async K => { await K.say(['#se shutter', 'n:駅名標を撮影した。']); K.gain('c1_signboard'); } } },
    { id: 'c1_waiting', x: 0, y: 0.333, w: 0.144, h: 0.289, label: '待合室', acts: ['look', 'photo'], cond: K => C1(K) && !K.has('c1_live_on'),
      on: { look: async K => {
        await K.say(['n:待合室。木のベンチ。壁に、はがれかけた時刻表。', 'n:印刷された数字はほとんど読めない。余白に、誰かが鉛筆で書き足した時刻が一つだけ残っている。', 't:2:17（時刻表にない）', 'p:2時17分……あの夜の、一分間の始まりの時刻です。', 'y:……偶然にしては、出来すぎてるな。', 'n:ホームの時計は、2時44分で止まっていた。']);
        K.gain('c1_timetable');
        if (!K.has('c1_med')) { K.flag('c1_med'); K.item('stab', 1); await K.say(['n:ベンチの下に、誰かが置いていった救急箱。中に、見慣れないアンプルが一本。', 't:境界安定剤 ×1 を手に入れた', 'y:分室の支給品だ。……どうしてこんなところに。']); }
      },
      photo: async K => { await K.say(['#se shutter', 'n:時刻表を撮影した。']); K.gain('c1_timetable'); } } },
  ]);

  // ── 営業中の駅（世界B） ──
  const seenAll = K => K.got('c1_live_photo') && K.got('c1_whistle_rec') && K.got('c1_tes_staff') && K.got('c1_ad');
  // 境界から押し戻されたとき（安定度0）に、もう一度 2時17分を待つための入口
  ext('station', 'A', [
    { id: 'c1_rewait', x: 0, y: 0.333, w: 0.144, h: 0.289, label: '待合室で、もう一度 2時17分を待つ', acts: ['look'], cond: K => C1(K) && K.has('c1_live_on') && !seenAll(K),
      on: { look: async K => { await K.say(['n:待合室のベンチで、もう一度その時刻を待つ。', '#wait 600', '#se whistle', '#fx glitch', 'n:――灯りが、ついた。']); K.setWorld('B'); } } },
  ]);
  ext('station', 'B', [
    { id: 'c1_train', x: 0.36, y: 0.315, w: 0.26, h: 0.09, label: '停車中の列車', acts: ['look', 'photo', 'record', 'scan'], cond: C1,
      on: { look: async K => K.say(['n:クリーム色と緑の、二両編成の列車。窓の中で、乗客が新聞を広げている。', 'n:車体に「月代鉄道」の文字。']),
            photo: async K => { await K.say(['#se shutter', 'n:ホームと列車と乗客を、一枚に収める。', 'p:写りました。……写っています。']); K.gain('c1_live_photo'); },
            record: async K => { await K.say(['#se rec', '#se whistle', 'n:発車ベル。そして――汽笛。', 'n:今度は、録音機の針がはっきり振れた。', 'p:あの夜の音と、同じだ。']); K.gain('c1_whistle_rec'); },
            scan: async K => K.say(['t:磁場 2.4μT／境界反応 計測不能（機器非対応）', 'n:今の端末では、これ以上は分からない。']) } },
    { id: 'c1_staff', x: 0.294, y: 0.544, w: 0.069, h: 0.244, label: '駅員', acts: ['talk', 'record'], cond: C1,
      on: { talk: async K => {
        await K.say(['x:駅員|いらっしゃいませ。……お客さん、切符は？', 'p:あの、この駅は、いつから。', 'x:駅員|月代駅ですか？ 開業してもう六十年近くになりますよ。', 'x:駅員|終電は0時44分で出ましたよ。', 'p:では、そこに停まっている列車は。', 'x:駅員|……2時17分の、ですか。あれは時刻表にない列車です。', 'x:駅員|お客さんは、乗れませんよ。', 'n:駅員は、私たちの服装も、端末も、まるで気にしていない。', 'y:……慣れてるのか。それとも、見えていないのか。']);
        K.gain('c1_tes_staff');
      }, record: async K => { await K.say(['#se rec', 'x:駅員|――2時17分の列車には、ご乗車になれません。']); K.gain('c1_tes_staff'); } } },
    { id: 'c1_passengers', x: 0.563, y: 0.578, w: 0.106, h: 0.211, label: '乗客', acts: ['look', 'talk'], cond: C1,
      on: { look: async K => K.say(['n:学生、会社員、買い物袋の老人。ごく普通の、深夜の駅の風景。', 'n:ただ、誰の顔も、少しだけぼやけて見える。']),
            talk: async K => K.say(['x:乗客|……え？ ああ、すみません、ぼうっとして。', 'x:乗客|最近、夜中の駅にいると、知らない人に話しかけられるって噂があるんですよ。', 'x:乗客|あなたみたいな。', 'n:乗客は、私の後ろをちらりと見て、黙った。']) } },
    { id: 'c1_bench', x: 0.2, y: 0.5, w: 0.06, h: 0.1, label: 'ベンチ', acts: ['look'], cond: C1,
      on: { look: async K => { if (K.got('c1_ticket')) return K.say(['n:木のベンチ。新しいニスの匂い。']); await K.say(['n:ベンチの上に、小さな硬券が落ちている。', 't:月代鉄道 月代→海浜公園 小児', 'n:思わず、ポケットに入れた。']); K.gain('c1_ticket'); } } },
    { id: 'c1_adboard', x: 0.713, y: 0.344, w: 0.15, h: 0.244, label: '構内の広告', acts: ['look', 'photo'], cond: C1,
      on: { look: async K => {
        await K.say(['n:構内の壁に、明るい広告。', 't:よるのまど　深夜ライブ配信サービス　毎晩更新中　─　眠れない夜に、だれかの声を', 'p:よるのまど……配信サービス、ですか。聞いたことがない。', 'y:俺もない。', 'n:配信者の写真が五枚並んでいる。「ほしのこ」「くろがね」「みなも」「ユキチ」。', 'n:五枚目だけ。顔の部分が、テレビの砂嵐のようなノイズで埋まっている。', 'n:ノイズの奥に、紫色の髪と、小さな帽子のような影。めがねの縁が、一瞬だけ光った。', 'n:写真の下に、小さな名札。']);
        await K.say(['#fx noise', 't:だんのうら', '#wait 500']);
        K.flag('saw_ad_name');
        const v = await K.choice('表示名が、少しにじんだ気がする。', [
          { t: '近づいて確かめる', v: 'reach', s: '' },
          { t: 'ここから撮影する', v: 'photo', s: '' },
        ]);
        if (v === 'reach') {
          K.flag('ad_reach');
          await K.say(['n:一歩、近づく。', '#fx glitch', 'n:文字が、ほどけた。', 't:だ■の■ら', 't:■■■■■', 'n:写真のノイズが額縁の外へ滲み出し、壁のタイルが波打つ。', 'y:新人、離れろ。', '#fx shake']);
        } else {
          await K.say(['#se shutter', 'n:シャッターを切る。画面の中の表示名は、もう読めない。', '#fx glitch', 'n:写真のノイズが額縁の外へ滲み出した。', 'y:……撮ったか。下がれ。']);
        }
        K.gain('c1_ad');
        K.note('term', 'nightcast', { title: 'よるのまど', text: '営業中の月代駅にあった深夜ライブ配信サービスの広告。現実には存在しない。顔がノイズで隠れた配信者が一人。表示名は近づくと崩れて読めなくなった。', solved: false });
      },
      photo: async K => { await K.say(['#se shutter', 'n:広告を撮影した。顔のノイズはそのまま写った。表示名の部分は、白く飛んでいる。']); K.gain('c1_ad'); K.flag('saw_ad_name'); } } },
  ]);

  KY_STORY.register('ch01', async K => {
    await K.step('c1_start', async () => {
      K.flag('ch1');
      await K.title('第一章', '存在しない駅');
      await K.say(['#scene center_office A', '#amb clock', 'n:翌日。', 'y:新人。今日は山だ。', 'p:お地蔵さんの先、ですね。', 'm:行く前に、町の記録を少し当たっておくといい。何もなければ、それも一つの記録になる。', 'y:「何もなかった」は、立派な結果だ。報告書が一行で済む。', 'p:一行で済んだこと、あります？', 'y:……ない。']);
      K.unlock('mountain_road'); K.unlock('shrine');
      K.item('battery', 4);
      K.note('person', 'saeki', { title: '佐伯さん', text: '分室の事務員。いつも笑っている。電話応対の達人。' });
    });

    await K.step('c1_road', async () => {
      const pre = ['c1_town_map', 'c1_shrine_record', 'c1_tes_matsui'];
      await K.explore({ goal: K => K.got('c1_road_photo') && K.got('c1_meter_road') && pre.filter(e => K.got(e)).length >= 2,
        hint: '町の記録や住民の話を当たり（2つ以上）、山道で「地図にない道」を撮影・計測する', areas: ['center_office', 'shrine', 'shotengai', 'mountain_road'] });
      K.note('place', 'mountain_road', { title: '山道・地図にない道', text: '林道の脇で分かれる、草に埋もれた舗装路。地図にない。入口から先で磁場計が振り切れる。カーブミラーに、街灯のある道とバス停「月代駅前」が一瞬映った。' });
    });

    await K.step('c1_walk', async () => {
      await K.say(['#scene mountain_road A', '#amb whistle_far', 'n:地図にない道を、歩く。', 'n:舗装は新しいのに、ガードレールは錆びている。白線は途中で古くなり、また新しくなる。', 'p:……継ぎ目が、ばらばらですね。', 'y:何回も、違う時期に作り直したみたいだ。', 'n:二十分ほど登ったところで、木々の向こうに、屋根が見えた。']);
      await K.say(['#scene station_ruin A', '#amb wire', 'n:駅だった。', 'n:崩れたホーム。錆びたレール。割れた駅名標。', 'p:月代町に、鉄道の記録はない……はずです。', 'y:目の前にあるものを先に記録しろ。考えるのはあとだ。']);
      K.unlock('station');
      K.note('place', 'station', { title: '月代駅（廃墟）', text: '山の中腹の廃駅。月代町に鉄道が存在した記録はない。', solved: false });
    });

    await K.step('c1_ruin', async () => {
      await K.explore({ goal: K => K.got('c1_ruin_photo') && K.got('c1_signboard') && K.got('c1_timetable'),
        hint: '廃駅を調べる：ホームの写真・駅名標・待合室の時刻表', areas: ['station'] });
    });

    await K.step('c1_wait', async () => {
      await K.say(['#scene station_ruin A', 'y:時刻表にない、2時17分。', 'p:待ちますか。', 'y:待つ。', 'n:待合室のベンチに並んで座る。如月さんが鞄から缶コーヒーを二本出した。', 'y:無糖と加糖。', 'p:……準備がいいですね。']);
      const v = await K.choice('どちらをもらう？', [{ t: '無糖', v: 'black' }, { t: '加糖', v: 'sweet' }, { t: '如月さんが先に選んでください', v: 'yield' }]);
      if (v === 'black') await K.say(['y:……それは俺のだ。', 'p:え。', 'y:冗談だ。両方俺のだ。', 'p:それは冗談になっていません。', 'n:結局、無糖をもらった。']);
      if (v === 'sweet') await K.say(['y:そうか。', 'n:如月さんは無糖を開けた。少しだけ、ほっとした顔に見えた。']);
      if (v === 'yield') await K.say(['y:新人が遠慮するな。……じゃあ加糖をやる。夜は糖分が要る。', 'p:如月さんは。', 'y:俺は苦いほうが目が覚める。']);
      K.stab(10);
      await K.say(['#amb clock', 'n:夜が来る。', 'n:虫の声。風。遠くの町の灯り。', 'y:……新人。2時17分の、あの一分。お前は汽笛を聞いたんだったな。', 'p:はい。', 'y:俺は寝てた。', 'p:目を閉じていただけ、では。', 'y:……寝てた。だから今夜は、起きてる。', '#wait 900', 'n:午前2時16分50秒。', '#wait 600', '#se clock', '#wait 600', '#se whistle', '#fx glitch']);
      K.setWorld('B'); K.flag('c1_live_on');
      await K.say(['#scene station_live B', '#amb station', 'n:灯りが、ついた。', 'n:割れていたホームが、滑らかなコンクリートになっている。', 'n:人がいる。乗客。駅員。二両編成の列車が、ホームに停まっている。', 'n:ホームの時計は、2時44分。秒針が動いている。私の端末の表示は、2時17分。', 'p:――。', 'y:……動くな。いや、動いていい。記録しろ。全部だ。']);
    });

    await K.step('c1_live', async () => {
      await K.explore({ goal: K => seenAll(K),
        hint: '営業中の駅を記録する：列車の撮影・汽笛の録音・駅員の話・構内の広告', areas: ['station'] });
    });

    await K.step('c1_escape', async () => {
      await K.say(['#fx noise', '#amb off', 'n:駅員がこちらを向いた。', 'x:駅員|お客さん。切符を――', 'n:声が途中で、逆回しのテープのようにねじれた。', 'n:ホームの端から、景色が崩れ始めている。灯りが一つずつ、廃墟の暗さに戻っていく。', 'y:出口だ。走れ！']);
      await K.chase({ id: 'c1_collapse', time: 9,
        intro: ['n:灯りが消えていく。足もとのホームが、割れたコンクリートに戻りかけている。'],
        rounds: [
          { text: '改札へ向かう通路。乗客の顔が、一斉にこちらを向いた。', ok: ['run', 'repel'], good: '視線を振り切って、改札を抜けた。', bad: '乗客の口が、私と同じ形に動いた。足が、一瞬止まる。' },
          { text: '階段の下が暗い。「切符を――」駅員の声が、背中のすぐ後ろでねじれる。', ok: 'run', good: '最後の段で、足もとが土に変わった。', bad: '待合室の時計が 2:17 で止まっている。ここは、出口じゃない。' },
        ] });
      K.setWorld('A');
      await K.say(['#scene station_ruin A', '#amb wire', '#fx flash', 'n:――気がつくと、廃墟のホームに立っていた。', 'n:灯りはない。人もいない。列車もない。', 'n:午前2時18分。', 'p:はあ……はあ……。', 'y:……無事か、新人。', 'p:はい。如月さんは。', 'y:無事だ。たぶん。']);
      await K.say(['n:ポケットに、硬い感触。', 'p:切符……。残っています。', 'y:写真は。', 'p:……あります。営業中の駅も、広告も、写っています。', 'y:いま確かめるべきことは一つだ。新人、俺が見たものを言え。俺もお前が見たものを言う。', 'n:乗客の人数。列車の色。駅員の帽子の線の数。広告の文字。', 'n:二人の記憶は、細かいところまで一致した。']);
      K.gain('c1_tes_yuu');
    });

    await K.step('c1_deduce', async () => {
      K.stab(15);
      await K.say(['#scene center_office A', '#amb clock', 'n:明け方。分室。', 'm:……おかえり。顔色が悪いね。まずは座りなさい。', 'n:撮影したものを、観測ボードに並べていく。', 'm:月代駅について、考えられる説明は四つだ。', 't:A：昔、実際に存在した駅（記録が失われた）', 't:B：過去の月代町を見た（時間のずれ）', 't:C：幻覚・錯覚', 't:D：別の月代町（何か違うもう一つの町）', 'm:今の証拠で、どれかを決めるのは早い。', 'm:でも、「否定できるもの」はあるかもしれない。']);
      await K.deduce({ id: 'c1_station_hypo', q: '月代駅――今の証拠で「否定できる」仮説はどれか？', link: 2,
        options: [
          { id: 'A', text: 'A：昔の駅――は否定できる', need: ['c1_shrine_record'], refute: [] },
          { id: 'B', text: 'B：過去の月代町――は否定できる', need: ['c1_ruin_photo'], refute: [] },
          { id: 'C', text: 'C：幻覚――は否定できる', need: ['c1_live_photo', 'c1_tes_yuu'] },
          { id: 'D', text: 'D：別の月代町――は否定できる', need: ['c1_town_map'], refute: [] },
        ],
        answer: 'C',
        hint: {
          A: '町史に鉄道の記録がない――それは「記録が見つからない」というだけだ。失われた記録の可能性は、まだ消せない。',
          B: '営業中の駅は、古い時代の駅にも見えた。過去の姿を見ただけ、という説明はまだ否定できない。',
          C: 'いい筋だ。幻覚はカメラに写らない。そして二人が同じ幻覚を細部まで一致して見ることも、ない。写真と、二人の記憶の一致を結べ。',
          D: '別の月代町……？ 否定する証拠も、肯定する証拠も、まだ何もない。',
        } });
      await K.say(['m:そうだね。幻覚はシャッターを切れない。', 'y:二人で同じ夢を見たにしては、細部が合いすぎる。', 'm:だから残るのは、A、B、D。', 'm:昔あった駅か。過去を覗いたのか。それとも――', 'y:三つ目は、言わないほうがいい。言葉にすると、それらしく見えてくる。', 'm:……そうだね。今は保留だ。']);
      K.note('hypo', 'station', { title: '仮説：月代駅の正体', text: 'A 昔の駅？／B 過去の月代町？／C 幻覚――否定（写真と二人の記憶が一致）／D 別の月代町？　まだ決められない。', solved: false });
      K.note('case', 'station', { title: '存在しない駅', text: '地図にない道の先の廃駅。2時17分、営業中の駅に変わった。乗客、駅員、列車、存在しない配信サービスの広告。切符だけが手元に残った。', solved: false });
    });

    await K.step('c1_end', async () => {
      await K.say(['m:二人とも、今日は帰って寝なさい。報告書は明日でいい。', 'y:……一行じゃ済まないな。', 'p:済みませんね。', 'n:端末の画像フォルダを閉じる前に、もう一度だけ、広告の写真を開いた。', 'n:顔の見えない五枚目の配信者。白く飛んだ名札。', 'n:何という名前だったか――思い出そうとすると、頭の奥で砂嵐の音がした。', '#se static', 'n:端末を閉じた。']);
      K.flag('ch1_done');
    });
  });
})();
