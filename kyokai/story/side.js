/* ══════════════════════════════════════════════════════════
   kyokai/story/side.js — 任意調査（担当C）
   第四章から解放（フラグ side_open）。探索中の場所に「相談」の調べ物として現れる。
   どれも寄り道ではなく、境界世界のルールを一つずつ教える教材（§30〜31）。
     vending 消える自動販売機 …… 境界は時刻で開く（2時17分前後）
     dog     毎日違う犬 ………… 名前（呼ばれ続けるもの）は世界をまたいでも残る
     house   誰も住んでいない家 … 毎日くり返される暮らしの習慣は、境界ににじむ
     paper   未来から届く新聞 …… 向こうは少し先を行く。未来は一つではない
     twins   同じ子供が二人 ……… 同じ人が一つの世界に二人いると、境界が揺らぐ（どちらも本物）
     ema     叶った絵馬 ………… 別の世界では、同じ人が違う選択をしている（同期Lv2以上）
   解決ごとに side_<id>_done と K.inc('side_solved')。ルールは手帳「用語」の rule_<id>。
   ══════════════════════════════════════════════════════════ */
(() => {
  const KY = window.KY;
  const ext = (id, w, spots) => { const a = KY.AREAS[id]; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...spots); };
  const open = id => K => K.has('side_open') && !K.has('side_' + id + '_done');
  const solve = async (K, id, rule, reward) => {
    K.flag('side_' + id + '_done'); K.inc('side_solved', 1);
    K.note('term', 'rule_' + id, { title: '境界のルール：' + rule.t, text: rule.d, solved: true });
    K.note('case', 'side_' + id, { title: rule.case, text: rule.sum, solved: true });
    if (reward) { Object.keys(reward).forEach(k => K.item(k, reward[k])); await K.say(['t:' + Object.keys(reward).map(k => ({ stab: '境界安定剤', med: '医療用品', battery: '予備バッテリー', light: '懐中電灯の電池' }[k] || k) + ' ×' + reward[k]).join('／') + ' を受け取った']); }
  };

  /* ── 1. 消える自動販売機（住宅街） ── */
  ext('residential', 'A', [
    { id: 'sd_vending', x: 0.27, y: 0.66, w: 0.11, h: 0.14, label: '【相談】夜だけ戻る自動販売機', acts: ['look', 'photo'], cond: open('vending'),
      on: { look: async K => {
        if (!K.got('sd_vending_can')) {
          await K.say(['n:相談メモ。「十年前に撤去された住宅街の自販機が、夜中だけ戻ってくる」――新聞配達の高野さん。', 'n:昼間、そこにはコンクリートの台とボルト穴しかない。', 'y:夜まで待つか。', '#scene residential A', '#amb wire', 'n:深夜2時過ぎ。寝静まった住宅街。', '#wait 600', '#se whistle', 'n:――汽笛と同時に、コンクリートの台の上に、自販機が立っていた。', 'n:見たことのない銘柄。「ツキミ」。いちばん上の段に、瓶の形の缶。', 't:ツキミ・サイダー　百円　販売者：月代鉄道グループ', 'p:月代鉄道……ナギの町の会社です。', 'n:百円玉を入れる。ごとん、と瓶型の缶が落ちてきた。']);
          K.gain('sd_vending_can');
          await K.say(['n:三晩、通って記録をつけた。', 't:一晩目　出現 2:17　消失 2:18', 't:二晩目　出現 2:16　消失 2:18（汽笛のあと）', 't:三晩目　出現 2:17　消失 2:18', 'y:毎晩、一分間だけ。']);
          K.gain('sd_vending_log');
        }
        await K.say(['y:新人。こいつが出てくる条件、まとめておけ。']);
        await K.deduce({ id: 'sd_vending', q: '夜だけの自動販売機。現れる条件は？', link: 2,
          options: [
            { id: 'rain', text: '雨の夜にだけ現れる', need: ['sd_vending_log'], refute: ['sd_vending_log'] },
            { id: 'nobody', text: '誰も見ていないときにだけ現れる', need: ['sd_vending_can'], refute: ['sd_vending_can'] },
            { id: 'time', text: '毎晩 2時17分前後の一分間、境界が開くときに現れる', need: ['sd_vending_log', 'c1_timetable'] },
          ],
          answer: 'time',
          hint: { rain: '記録の三晩は、どれも晴れてた。', nobody: '俺たちが見てる前で出てきたし、缶まで買えた。', time: 'そうだ。三晩の記録と、廃駅の時刻表の「2:17」を結べ。' } });
        await K.say(['p:2時17分。最終列車の時刻。境界は、時刻で開く。', 'y:……缶の中身、朝には消えてたな。', 'p:缶だけ残りました。中身は、向こうに帰ったのかもしれません。']);
        await solve(K, 'vending', { t: '時刻', d: '境界は決まった時刻に開きやすい。月代町では 2時17分前後の一分間。汽笛はその合図。', case: '消える自動販売機', sum: '撤去された自販機の跡に、毎晩2時17分の一分間だけ、ナギの町の自販機が現れる。銘柄は「ツキミ」。' }, { battery: 2 });
      },
      photo: async K => K.say(['#se shutter', 'n:自販機の跡を撮影した。コンクリートの台とボルト穴だけが写った。']) } },
  ]);

  /* ── 2. 毎日違う犬（住宅街） ── */
  const breeds = ['柴犬', 'ミニチュアダックスフント', 'コーギー'];
  ext('residential', 'A', [
    { id: 'sd_dog', x: 0.8, y: 0.6, w: 0.1, h: 0.14, label: '【相談】大野さんとタロウ', acts: ['look', 'talk', 'photo'], cond: open('dog'),
      on: { talk: async K => {
        const n = K.get('sd_dog_n') | 0;
        if (n < 3) {
          K.inc('sd_dog_n', 1);
          const b = breeds[n];
          await K.say(n === 0
            ? ['x:大野|ああ、相談したのは私です。この子、タロウ。', 'n:足もとに、' + b + '。赤い首輪に、「タロウ」の名札。', 'x:大野|それがね。毎朝、散歩に出ると、違う犬なんです。', 'x:大野|でも、名前を呼ぶと来る。首輪も名札も同じ。私の顔を見て、しっぽを振る。', 'x:大野|……私がおかしいんでしょうか。', 'p:明日も、来ます。']
            : ['n:' + (n === 1 ? '翌日' : '翌々日') + '。大野さんの足もとには――' + b + '。', 'x:大野|タロウ。', 'n:' + b + 'が、しっぽを振った。首輪も、名札も、同じ。']);
          if (n + 1 < 3) return;
          await K.say(['n:三日分の写真がそろった。']);
          K.gain('sd_dog_photos');
        }
        await K.deduce({ id: 'sd_dog', q: '犬は毎日変わるのに、首輪と名札と名前だけは同じ。なぜ？', link: 2,
          options: [
            { id: 'swap', text: '大野さんが毎日、別の犬を連れてきている', need: ['sd_dog_photos'], refute: ['sd_dog_photos'] },
            { id: 'name', text: '名前で呼ばれ続けるものは、世界をまたいでも「同じもの」として残る', need: ['sd_dog_photos', 'c3_pass'] },
          ],
          answer: 'name',
          hint: { swap: '三匹とも、大野さんに飛びついて、名前に応えた。毎日別の犬を借りてくる理由もない。', name: 'その線だ。名札だけが同じ三日分の写真と――ナギの名前が刷られた定期券を結べ。' } });
        await K.say(['p:どの世界のタロウも、大野さんに「タロウ」と呼ばれている。', 'p:だから、名前と首輪だけは、毎日同じ。', 'x:大野|……どの子も、うちのタロウなんですね。', 'x:大野|じゃあ、いいです。毎日、ちゃんと呼びます。']);
        await solve(K, 'dog', { t: '名前', d: '名前で呼ばれ続けるもの、名前を刻んだ物は、世界をまたいでも「同じもの」として残りやすい。名前は錨になる。', case: '毎日違う犬', sum: '大野さんのタロウは毎日犬種が変わる。首輪と名札と名前だけが同じ。' }, { stab: 1 });
      },
      look: async K => K.say(['n:赤い首輪の犬と、大野さん。']),
      photo: async K => K.say(['#se shutter', 'n:今日のタロウを撮影した。']) } },
  ]);

  /* ── 3. 誰も住んでいない家（住宅街） ── */
  ext('residential', 'A', [
    { id: 'sd_house', x: 0.669, y: 0.311, w: 0.25, h: 0.356, label: '【相談】五丁目の空き家', acts: ['look', 'photo', 'scan'], cond: open('house'),
      on: { look: async K => {
        if (!K.got('sd_house_light')) {
          await K.say(['n:相談メモ。「五丁目の空き家に、毎晩七時に灯りがつく。持ち主は十年前に引っ越した」――近所の人。', '#scene residential A', '#amb wire', 'n:午後七時。', 'n:――ぱっと、窓に灯りがついた。', 'n:カーテンのすき間から見える台所。テーブルに、四人分の夕食。湯気。', 'n:誰もいない。', 'n:見ているうちに、皿が一枚ずつ、空になっていく。']);
          K.gain('sd_house_light');
        }
        await K.deduce({ id: 'sd_house', q: '誰も住んでいない家に、毎晩灯りがつく。なぜ？', link: 2,
          options: [
            { id: 'squat', text: '誰かが勝手に住み着いている', need: ['sd_house_light'], refute: ['sd_house_light'] },
            { id: 'habit', text: '別の世界で、毎晩同じ時刻にくり返される家族の夕食が、にじんで見えている', need: ['sd_house_light', 'p_tes_house'] },
          ],
          answer: 'habit',
          hint: { squat: '皿が勝手に空になるのを、住み着いた誰かがやってると思うか？', habit: 'そうだ。毎晩同じ時刻の灯りと、高野くんが見た「空き地の家」を結べ。くり返しの強い場所ほど、にじむ。' } });
        await K.say(['p:向こうの世界のこの家では、毎晩七時に家族が夕食をとっている。', 'p:毎日、毎日、同じ時刻に。だから、こちらにまでにじんでくる。', 'y:習慣ってのは、強いな。', 'p:……毎晩同じ時刻に、同じことをする人がいたら。', 'y:そいつの周りは、にじみやすい、ってことだ。']);
        await solve(K, 'house', { t: '習慣', d: '毎日同じ時刻・同じ場所でくり返される暮らしは、境界ににじむ。くり返しが強いほど、別の世界から見えやすい。', case: '誰も住んでいない家', sum: '五丁目の空き家に毎晩七時に灯りがつく。別の世界の家族の夕食が、にじんで見えていた。' }, { med: 1 });
      },
      photo: async K => K.say(['#se shutter', 'n:空き家を撮影した。']),
      scan: async K => K.say(['t:境界反応 1.4（夜七時だけ上昇）']) } },
  ]);

  /* ── 4. 未来から届く新聞（分室） ── */
  ext('center_office', 'A', [
    { id: 'sd_paper', x: 0.3, y: 0.58, w: 0.07, h: 0.09, label: '【相談】朝刊の束', acts: ['look'], cond: K => open('paper')(K) && K.got('c4_newspaper'),
      on: { look: async K => {
        if (!K.got('sd_paper_future')) {
          await K.say(['x:佐伯|これ、配達の高野くんから。朝刊の束に、ときどき一部だけ「明日の日付」の新聞が混じるんですって。', 'n:日付は明日。社会面に小さな記事。', 't:月代商店街で看板落下　通行人けがなし', 'n:翌日。商店街の看板は――落ちなかった。', 'n:次の「明日の新聞」。', 't:河川敷で釣り人が転倒　軽傷', 'n:翌日。源さんが、本当に転んでいた。軽い擦り傷。', 'x:源|なんで知ってんだ。見てたのか？']);
          K.gain('sd_paper_future');
        }
        await K.deduce({ id: 'sd_paper', q: '明日の新聞。書かれた出来事は、起きる日と起きない日がある。なぜ？', link: 2,
          options: [
            { id: 'prophecy', text: '新聞は予言で、必ず当たる', need: ['sd_paper_future'], refute: ['sd_paper_future'] },
            { id: 'prank', text: '誰かのいたずら', need: ['sd_paper_future'], refute: ['c4_newspaper'] },
            { id: 'ahead', text: '少し先を進んでいる別の世界の新聞。こちらの未来が同じになるとは限らない', need: ['sd_paper_future', 'c4_newspaper'] },
          ],
          answer: 'ahead',
          hint: { prophecy: '看板は落ちなかった。必ず当たるなら、予言じゃなくて予定表だ。', prank: '紙も活字も、ナギの町の新聞と同じ作りだった。いたずらで別の世界の新聞は刷れない。', ahead: 'その線だ。明日の新聞と、ナギの町の古新聞を結べ。どっちも「向こう」の新聞だ。' } });
        await K.say(['p:向こうの世界は、こちらより少しだけ先を進んでいる。', 'p:でも、向こうで起きたことが、こちらでも起きるとは限らない。', 'y:未来は一つじゃない、か。', 'p:……少し、ほっとしました。', 'y:なんでだ。', 'p:決まっていないなら、変えられるかもしれないので。']);
        await solve(K, 'paper', { t: '時間のずれ', d: '別の世界は、少しだけ時間がずれていることがある。向こうの「明日」がこちらに届いても、こちらの未来がそれに従うとは限らない。', case: '未来から届く新聞', sum: '朝刊に一部だけ混じる明日の新聞。記事は当たる日と外れる日がある。' }, { stab: 1 });
      } } },
  ]);

  /* ── 5. 同じ子供が二人（小学校） ── */
  ext('school', 'A', [
    { id: 'sd_twins', x: 0.7, y: 0.62, w: 0.14, h: 0.24, label: '【相談】二人のミナト', acts: ['look', 'talk', 'scan'], cond: K => open('twins')(K) && K.got('c4_scan_witness'),
      on: { talk: async K => {
        if (!K.got('sd_twins_tes')) {
          await K.say(['x:寺田|分室さん、こっちだ。……見てくれ。', 'n:校庭の隅に、男の子が二人。同じ顔、同じ服、同じ背丈。', 'x:ミナト|こいつ、偽物！', 'x:ミナト|そっちが偽物だろ！', 'p:……二人とも、名前は？', 'x:ミナト|ミナト。', 'x:ミナト|ミナト！ まねすんな！', 'p:好きな給食は？', 'x:ミナト|ソフト麺。', 'x:ミナト|カレー。……ソフト麺ってなに？', 'n:二人のそばにいると、端末の安定度の表示がじりじりと下がっていく。']);
          K.stab(-4);
          K.gain('sd_twins_tes');
        }
        await K.deduce({ id: 'sd_twins', q: '二人のミナト。本物はどちらか？', link: 2,
          options: [
            { id: 'left', text: 'ソフト麺が好きなミナト', need: ['sd_twins_tes'], refute: ['c4_scan_witness'] },
            { id: 'right', text: 'カレーが好きなミナト', need: ['sd_twins_tes'], refute: ['c4_scan_witness'] },
            { id: 'both', text: '両方とも本物。別の世界のミナトが、こちらに迷い込んでいる', need: ['sd_twins_tes', 'c4_scan_witness'] },
          ],
          answer: 'both',
          hint: { left: '月代橋の三人を思い出せ。誰も嘘をついていなかった。', right: '「どちらかが嘘」という問いの立て方そのものを疑え。月代橋のときと同じだ。', both: 'そうだ。二人の証言と、月代橋の三人のスキャン結果を結べ。違う型の「本物」は、同時にいられる。' } });
        await K.say(['p:二人とも本物です。片方は、ソフト麺が給食に出る月代町のミナト。', 'x:ミナト|……じゃあ、こいつ、帰れるの？', 'n:その夜、2時17分。汽笛のあと、ソフト麺のミナトはいなくなっていた。', 'n:残ったミナトは、少しだけ寂しそうだった。', 'x:ミナト|あいつ、ちょっとだけ、いいやつだった。', 'y:同じ人間が二人並ぶと、世界のほうが落ち着かないらしい。……俺たちも、気をつけたほうがいい。']);
        await solve(K, 'twins', { t: '二人', d: '同じ人が一つの世界に二人いると、境界が揺らぎ、周りの存在安定度が下がる。どちらも本物で、どちらも偽物ではない。', case: '同じ子供が二人', sum: '月代小に同じ顔のミナトが二人。互いを偽物と呼んだ。好きな給食だけが違った。' }, { stab: 1, med: 1 });
      },
      look: async K => K.say(['n:同じ顔の男の子が二人、にらみ合っている。']),
      scan: async K => K.say(['t:左のミナト：A型　右のミナト：B型', 'n:同じ顔で、違う型。']) } },
  ]);

  /* ── 6. 叶った絵馬（神社：境界観測 Lv2 以上） ── */
  const emaOpen = K => open('ema')(K) && K.got('c6_self_desk');
  ext('shrine', 'A', [
    { id: 'sd_emaA', x: 0.778, y: 0.5, w: 0.106, h: 0.133, label: '【相談】絵馬掛け', acts: ['look'], cond: emaOpen,
      on: { look: async K => { K.flag('sd_ema_a'); await K.say(['n:白峰さんの相談。「絵馬の文字が、ときどき変わる気がする」。', 'n:一枚の絵馬。「店を続けられますように　松井」。', 'n:――駄菓子屋の松井さんの字だ。シャッターに閉店のあいさつを貼った、あの店の。', 'y:境界観測で、向こう側の同じ場所を見てみろ。']); } } },
  ]);
  ext('shrine', 'B', [
    { id: 'sd_emaB', x: 0.778, y: 0.5, w: 0.106, h: 0.133, label: '【相談】おみくじ結び（向こう側）', acts: ['look', 'photo'], cond: K => emaOpen(K) && K.has('sd_ema_a'),
      on: { look: async K => {
        if (!K.got('sd_ema')) { await K.say(['n:向こう側では、絵馬掛けの場所がおみくじ結びになっている。白い紙の列の中に、一枚だけ絵馬が結ばれていた。', 'n:「お礼参り　おかげさまで店は三代目へ　松井」。', 'p:向こうの松井さんの店は、続いたんだ。']); K.gain('sd_ema'); }
        await K.deduce({ id: 'sd_ema', q: '同じ絵馬に、違う言葉。何を意味している？', link: 2,
          options: [
            { id: 'rewrite', text: '誰かが絵馬を書き換えた', need: ['sd_ema'], refute: ['c6_diff_shotengai'] },
            { id: 'choice', text: '別の世界では、同じ人が違う道を選び、違う結果を迎えている', need: ['sd_ema', 'c6_self_desk'] },
          ],
          answer: 'choice',
          hint: { rewrite: '書き換えたんじゃない。世界ごとに、商店街そのものが違っていただろう。', choice: 'そうだ。向こうの絵馬と――向こうの分室にあった「お前の机」を結べ。人も、世界ごとに違う道を歩いてる。' } });
        await K.say(['p:向こうの松井さんは、店を続ける道を選べた。こちらの松井さんは、まだ迷っている。', 'p:向こうの私は、主任観測員になっている。', 'y:どっちが幸せかは、絵馬には書いてないな。', 'p:……はい。', 'n:翌日、駄菓子屋で飴を買った。松井さんは「来年もやるよ」と笑った。']);
        await solve(K, 'ema', { t: '選択', d: '別の世界では、同じ人が違う選択をし、違う人生を歩いている。どれが本物ということはない。', case: '叶った絵馬', sum: '神社の絵馬。こちらでは「店を続けられますように」、向こうでは「店は三代目へ」。' }, { stab: 1 });
      },
      photo: async K => { await K.say(['#se shutter', 'n:向こう側の絵馬を撮影した。']); K.gain('sd_ema'); } } },
  ]);
})();
