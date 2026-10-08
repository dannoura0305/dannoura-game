/* ══════════════════════════════════════════════════════════
   kyokai/story/ch02.js — 第二章「書き換わる記録」（担当C）
   駅の消えた写真 → 改ざん検査 → 分室の撮り直し → 違和感探し（初日の写真と今日の写真）
   → 境界測定端末 → USER_444 のログと「後ろ。」→ 推理「写真に何が起きたか」→ 小学校の噂
   フラグ：ch2 / ch2_done / user444_log / staff_photo_9
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const C2 = K => K.has('ch2') && !K.has('ch2_done');
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };

  ext('center_office', 'A', [
    { id: 'c2_retake', x: 0.88, y: 0.21, w: 0.09, h: 0.47, label: '入口（いつもの撮影位置）', acts: ['look', 'photo'], cond: C2,
      on: { look: async K => K.say(['n:いつもの撮影位置。毎日、同じ角度で。']),
            photo: async K => {
              if (K.got('c2_office_today')) return K.say(['#se shutter', 'n:もう一枚撮る。……やはり、同じように写る。']);
              await K.say(['#se shutter', 'n:今日の分室を一枚。', 'n:画面を確かめて――指が止まった。', 'p:……え？', 'n:写っている分室が、目の前の分室と、違う。', 'n:初日の写真と、並べてみる。']);
              K.gain('c2_office_today'); K.flag('c2_need_spot');
            } } },
    { id: 'c2_staffphotos', x: 0.588, y: 0.156, w: 0.163, h: 0.222, label: '職員写真', acts: ['look', 'photo', 'scan'], cond: K => C2(K) && K.has('c2_spot_done'),
      on: { look: async K => {
        await K.say(['n:壁の職員写真。五枚。そして、右下の空き枠。', 'n:今朝の写真では、この枠に白髪の人物が写っていた。', 'n:実物の枠は空いている。けれど、枠の下に剥がれかけた名札テープが残っていた。', 'n:「九」。その一文字だけ読める。', 'p:佐伯さん。この空き枠、前は誰の写真が入っていたんですか。', 'x:佐伯|え？ そこは新人さんの……いえ、ずっと空いてて……', 'x:佐伯|……あれ。前に、誰かいましたっけ。', 'm:――。', 'n:御堂室長は名札を見て、何も言わずに自分の机に戻った。']);
        K.gain('c2_staff_photo'); K.flag('staff_photo_9');
        K.note('person', 'unknown_9', { title: '空き枠の「九」', text: '職員写真の右下の空き枠。今日撮った写真には白髪の人物が写っていた。実物の枠の下には「九」とだけ読める名札テープ。誰の枠だったか、誰も覚えていない。御堂室長は何か知っている様子。', solved: false });
      },
      photo: async K => { await K.say(['#se shutter', 'n:空き枠と名札テープを撮影した。']); K.gain('c2_staff_photo'); K.flag('staff_photo_9'); },
      scan: async K => {
        if (!K.has('c2_meter')) return K.say(['t:磁場 0.05μT', 'n:簡易磁場計では、何も分からない。']);
        await K.say(['n:境界測定端末を向ける。', '#se beep', 't:境界反応 0.0 … 0.0 … 3.8 … 0.1', 'n:空き枠の前でだけ、数値が跳ねた。', 'y:何もない枠が、どこかとつながってるみたいだな。']);
        K.gain('c2_meter_reading');
      } } },
    { id: 'c2_mido', x: 0.62, y: 0.62, w: 0.12, h: 0.25, label: '御堂室長', acts: ['talk'], cond: C2,
      on: { talk: async K => {
        if (!K.got('c2_hash')) return K.say(['m:まずはサーバー室で、写真データの改ざん検査をしよう。話はそれからだ。']);
        if (!K.got('c2_office_today')) return K.say(['m:……今日の分室の写真は、もう撮ったかい。毎日の決まりだからね。']);
        if (!K.has('c2_meter')) {
          await K.say(['m:それを、渡しておこう。', 'n:御堂室長は引き出しから、手のひらほどの端末を出した。', 'm:境界測定端末。本部の試作品だ。簡易磁場計では拾えない「ずれ」を数字にしてくれる。', 'm:……本当は、もう少し慣れてから渡すつもりだったんだけどね。', 'p:ありがとうございます。', 'm:礼はいらない。それが鳴る場所には、近づきすぎないことだ。']);
          K.equip('boundary_meter'); K.flag('c2_meter');
          K.note('term', 'boundary_meter', { title: '境界測定端末', text: '本部の試作品。磁場ではなく「ずれ」を数値にする。スキャンで境界反応が見える。' });
          return;
        }
        return K.say(['m:サーバーのログも、一度見ておいてくれないか。如月が何か見つけたらしい。']);
      } } },
  ]);

  ext('center_server', 'A', [
    { id: 'c2_hashcheck', x: 0.412, y: 0.422, w: 0.175, h: 0.2, label: 'ログ端末', acts: ['look', 'scan'], cond: C2,
      on: { look: async K => {
        if (!K.got('c2_hash')) {
          await K.say(['n:写真データの改ざん検査をかける。撮影時に端末が自動で記録したハッシュ値と、いまのファイルを照合する。', 't:IMG_0217_ruin.jpg …… 一致', 't:IMG_0217_live.jpg …… 一致', 't:IMG_0217_ad.jpg   …… 一致', 'p:一ビットも変わっていない。', 'y:データは同じなのに、写っているものが違う。', 'p:そんなこと、ありえるんですか。', 'y:ありえないから、ここにいる。']);
          K.gain('c2_hash'); return;
        }
        if (!K.got('c2_user444') && K.has('c2_meter')) {
          await K.say(['y:新人。こっちも見ろ。', 'y:写真のアクセス記録を洗ってたら、変な利用者が出てきた。', 't:[利用者ログ] USER_444', 't:2019-11-03 02:44:44　配信を開始しました。', 't:2026-10-14 02:44:44　配信を開始しました。', 't:2031-04-30 02:44:44　配信を開始しました。', 't:2023-02-17 02:44:44　配信を開始しました。', 't:2026-11-20 02:44:44　配信を開始しました。', 'p:USER_444……。登録は。', 'y:ない。うちのサーバーに、そんな利用者は存在しない。', 'p:日付がばらばらです。数年前。2026年10月14日――昨日。来月。数年後まで。', 'y:未来の日付のログが、もう書かれてる。']);
          K.gain('c2_user444'); K.flag('user444_log');
          await K.say(['y:それと、一件だけ。ログの種類が違う。', '#se static', 't:[コメント] USER_444：後ろ。', '#wait 700', 'p:これ……誰に向けたコメントでしょう。', 'y:配信者じゃないか？', 'p:配信映像がありません。', 'y:……。', 'n:二人とも、なんとなく、後ろを振り返らなかった。']);
          K.gain('c2_comment_back');
          K.note('444', 'user444', { title: 'USER_444', text: '分室のサーバーに現れた存在しない利用者。「配信を開始しました。」というログだけを、過去と未来のばらばらの日付で残している。', solved: false });
          K.note('444', 'back', { title: '「後ろ。」', text: 'USER_444 のコメントログ。紐づく配信映像はどこにもない。誰に向けた言葉なのか分からない。', solved: false });
          return;
        }
        return K.say(['n:ログ端末。冷却ファンの音。', 'n:USER_444 の行は、さっきより一行増えている気がした。']);
      },
      scan: async K => K.say(K.has('c2_meter') ? ['t:境界反応 0.4（微弱）', 'n:サーバー室にも、ほんの少し。'] : ['t:磁場 2.0μT（機器由来）']) } },
  ]);

  ext('mountain_road', 'A', [
    { id: 'c2_branch', x: 0.625, y: 0.533, w: 0.30, h: 0.189, label: '分かれ道（今日）', acts: ['look', 'photo', 'scan'], cond: C2,
      on: { look: async K => K.say(['n:昨夜の分かれ道。', 'n:草むらの向こうは、ただの雑木林だ。舗装も白線も、どこにもない。', 'y:写真と同じだな。今日は、こっちが「正しい」。', 'p:……昨日の私たちが、間違っていたみたいに言わないでください。']),
            photo: async K => K.say(['#se shutter', 'n:撮影した。雑木林が写っている。今日の写真は、今日の景色と一致している。']),
            scan: async K => K.say(K.has('c2_meter') ? ['t:境界反応 1.1（残留）', 'n:道のあった場所に、うっすらと数値が残っている。足跡の温もりのように。'] : ['t:磁場 0.12μT', 'n:針は動かない。昨夜の一周が嘘のようだ。']) } },
  ]);

  ext('center_lab', 'A', [
    { id: 'c2_drawer', x: 0.8, y: 0.42, w: 0.15, h: 0.22, label: '保管棚', acts: ['look'], cond: C2,
      on: { look: async K => {
        if (K.got('c2_ticket_still')) return K.say(['n:切符は、今日もそこにある。']);
        await K.say(['n:証拠品の保管棚。昨夜しまった切符を確かめる。', 't:月代鉄道 月代→海浜公園 小児', 'n:……ある。写真は変わったのに、切符はここにある。']);
        K.gain('c2_ticket_still');
      } } },
  ]);

  ext('school', 'A', [
    { id: 'c2_terada', x: 0.23, y: 0.56, w: 0.07, h: 0.28, label: '用務員の寺田さん', acts: ['talk', 'record'], cond: C2,
      on: { talk: async K => {
        await K.say(['x:寺田|分室の人か。……ちょうどよかった。', 'x:寺田|おととい、夜明けにね。校門の掃除をしてたら、ランドセルの女の子が山のほうへ歩いていくんだ。', 'x:寺田|「どこ行くの」って聞いたら「駅。遅れちゃう」って。', 'x:寺田|うちの学校の子じゃない。全校で二百人ちょっと、顔はみんな知ってる。', 'x:寺田|それに、あのランドセル。今どき見ない、角の丸い古い型だった。']);
        K.gain('c2_rumor_girl');
        K.note('person', 'terada', { title: '寺田さん', text: '月代小学校の用務員。全校児童の顔を知っている。夜明けに「駅に行く」女の子を見た。' });
      }, record: async K => { await K.say(['#se rec', 'x:寺田|……「駅。遅れちゃう」。そう言ったよ。']); K.gain('c2_rumor_girl'); } } },
    { id: 'c2_gate', x: 0.38, y: 0.4, w: 0.2, h: 0.25, label: '校舎', acts: ['look', 'scan'], cond: C2,
      on: { look: async K => K.say(['n:月代小学校。町に一つだけの小学校。', 'n:昇降口に、児童の描いた「わたしたちの町」の絵が貼ってある。山の上に、駅を描いた子は一人もいない。']),
            scan: async K => K.say(K.has('c2_meter') ? ['t:境界反応 0.0', 'n:学校は静かだ。'] : ['t:磁場 0.06μT']) } },
  ]);

  KY_STORY.register('ch02', async K => {
    await K.step('c2_start', async () => {
      K.flag('ch2'); K.stab(15);
      await K.title('第二章', '書き換わる記録');
      await K.say(['#scene center_office A', '#amb clock', 'n:翌朝。報告書を書くために、昨夜の写真を開いた。', '#fx glitch', 'n:――雑木林。', 'n:廃駅のホームの写真も。営業中の駅の写真も。', 'n:どちらにも、木と草しか写っていない。', 'p:……如月さん。', 'y:見た。俺の端末もだ。', 'n:撮影日時は昨夜のまま。位置情報も、あの山の中腹のまま。', 'n:ただ、駅だけが、ない。']);
      K.gain('c2_photo_gone'); K.gain('c2_yuu_photo');
      await K.say(['n:広告の写真も開く。', 'n:暗い林の中に、空中の一点だけ、砂嵐のような小さなノイズが浮かんでいた。', 'm:……おはよう。何かあったようだね。', 'p:昨夜の写真から、駅が消えました。', 'm:そうか。', 'n:御堂室長は驚かなかった。驚かないように、気をつけているように見えた。', 'm:改ざんかどうか、まず確かめよう。それから、今日の分室の写真も忘れずにね。']);
      K.unlock('center_lab');
    });

    await K.step('c2_check', async () => {
      await K.explore({ goal: K => K.got('c2_hash') && K.got('c2_office_today'),
        hint: 'サーバー室で写真の改ざん検査をし、いつもの位置から今日の分室を撮影する（山道を確かめに行ってもいい）', areas: ['center_office', 'center_server', 'center_lab', 'mountain_road'] });
    });

    await K.step('c2_spot', async () => {
      await K.say(['n:初日の写真と、今日の写真。', 'n:同じ位置、同じ角度。なのに、何かが違う。', 'y:……新人。どこが違う。全部言え。']);
      await K.spot({ id: 'c2_office', a: 'center_office', b: 'center_office', aw: 'A', bw: 'B', need: 4,
        spots: [
          { x: 0.714, y: 0.300, r: 0.06, label: '職員写真：右下の空き枠に、白髪の人物が写っている' },
          { x: 0.538, y: 0.260, r: 0.07, label: '時計：「TSUKUYO」の丸時計が「明光舎」の振り子時計に' },
          { x: 0.500, y: 0.078, r: 0.08, label: '室名の札：「月代分室」が「國立 月代觀測所」に' },
          { x: 0.810, y: 0.240, r: 0.06, label: 'カレンダー：「令和八年」が「昭和百一年」に' },
          { x: 0.200, y: 0.570, r: 0.08, label: '端末：液晶モニターがブラウン管に' },
          { x: 0.410, y: 0.270, r: 0.065, label: '板書：ホワイトボードが黒板に（「本日ノ観測 異常ナシ」）' },
        ] });
      K.flag('c2_spot_done');
      await K.say(['p:時計。室名。カレンダーの年号――昭和百一年。端末も古い。それに、職員写真が一枚多い。', 'n:顔を上げて、実際の分室を見る。', 'n:液晶モニター。TSUKUYO の時計。「特殊現象観測センター 月代分室」。令和八年のカレンダー。', 'n:目の前の部屋は、何も変わっていない。', 'n:写真だけが、知らない分室を写している。', 'y:……昭和百一年なんて年は、ない。', 'p:昭和は六十四年で終わっています。', 'y:じゃあ、これはどこの分室だ。', 'n:誰も答えなかった。私は職員写真の右下――写真の中で白髪の誰かが収まっていた、空き枠を見た。']);
      K.note('diff', 'office_photo', { title: '分室の写真の違い', text: '同じ位置・同じ角度で撮った今日の写真に、知らない分室が写った。時計は明光舎、室名は「國立 月代觀測所」、カレンダーは「昭和百一年」、端末はブラウン管、職員写真が一人多い。実際の部屋は何も変わっていない。', solved: false });
    });

    await K.step('c2_log', async () => {
      await K.explore({ goal: K => K.got('c2_staff_photo') && K.has('c2_meter') && K.got('c2_user444') && K.got('c2_meter_reading'),
        hint: K => {
          const left = [];
          if (!K.got('c2_staff_photo')) left.push('職員写真の空き枠を調べる');
          if (!K.has('c2_meter')) left.push('御堂室長と話す');
          else {
            if (!K.got('c2_meter_reading')) left.push('もらった境界測定端末で職員写真をスキャン');
            if (!K.got('c2_user444')) left.push('サーバー室のログ端末をもう一度確かめる');
          }
          return left.join('／');
        }, areas: ['center_office', 'center_server', 'center_lab'] });
    });

    await K.step('c2_deduce', async () => {
      await K.say(['#scene center_office A', 'm:写真のことを、整理しておこう。', 'm:データは改ざんされていない。二台の端末で同じことが起きた。切符は残っている。', 'y:ついでに分室の写真まで変わった。']);
      await K.deduce({ id: 'c2_photo', q: '写真から駅が消えた。何が起きたのか？', link: 2,
        options: [
          { id: 'tamper', text: '誰かが写真データを書き換えた', need: ['c2_photo_gone'], refute: ['c2_hash'] },
          { id: 'broken', text: '端末のカメラか保存領域の故障', need: ['c2_photo_gone'], refute: ['c2_yuu_photo'] },
          { id: 'never', text: '最初から駅は写っていなかった（記憶違い）', need: ['c2_photo_gone'], refute: ['c2_ticket_still'] },
          { id: 'shift', text: 'データはそのまま。写真が「写している先」のほうが変わった', need: ['c2_hash', 'c2_yuu_photo'] },
        ],
        answer: 'shift',
        hint: {
          tamper: '「改ざん検査」を見ろ。ハッシュ値は一致してる。データは一ビットも書き換えられていない。',
          broken: '俺の端末でも同じことが起きてる（ユウの写真）。二台同時に、同じ壊れ方はしない。',
          never: '切符は残ってる。二人の記憶も一致した。「なかった」で片づけるには、物証がありすぎる。',
          shift: 'その線だ。データが変わっていないこと、別の端末でも同じこと――二つを結べ。',
        } });
      await K.say(['p:写真のデータは同じまま。それなのに、写っているものが変わった。', 'p:……写真が、「別のどこか」を指すようになった、としか。', 'm:記録が、書き換わったんじゃない。', 'm:記録の指している先が、変わった。', 'y:分室の写真もか。じゃあ今日の写真に写ってるのは、どこの分室だ。', 'm:……。', 'n:誰も、答えなかった。']);
      K.note('hypo', 'records', { title: '仮説：書き換わる記録', text: '写真データは改ざんされていない。記録が「指している先」が変わった。今日の分室の写真には、どこか別の分室が写っている。', solved: false });
      K.note('term', 'user444_term', { title: '444', text: '2:44:44 の接続、USER_444。数字が繰り返される。偶然、だと思う。', solved: false });
    });

    await K.step('c2_school', async () => {
      await K.say(['x:佐伯|あ、室長。小学校の寺田さんから電話です。「駅に行く女の子」を見たって。', 'm:……駅に、か。', 'y:行くぞ、新人。']);
      K.unlock('school');
      await K.explore({ goal: K => K.got('c2_rumor_girl'), hint: '月代小学校で寺田さんの話を聞く', areas: ['school', 'center_office', 'shotengai', 'residential'] });
    });

    await K.step('c2_end', async () => {
      await K.say(['#scene school A', '#amb wire', 'y:十歳くらい。古いランドセル。夜明けに「駅に行く」。', 'p:三浦さんが2時半に見た、「お母さん」と呼んだ女の子も、十歳くらいでした。', 'y:……同じ子だとしたら。', 'p:その子は、月代駅を知っています。', 'n:山のほうから風が吹いた。', '#se whistle', 'n:昼間なのに、汽笛が聞こえた気がした。', 'n:如月さんにも、聞こえたらしい。彼は黙って、山を見ていた。']);
      K.flag('ch2_done');
    });
  });
})();
