/* ══════════════════════════════════════════════════════════
   kyokai/story/ch07.js — 第七章「知らない配信」（担当D）
   ＋ 担当D（ch07〜ch14・endings）の共通ヘルパー KY.part2

   担当Dが使うフラグ（後半）
     d7_done … 第七章クリア            d7_future … 未来コメントの推理に成功
     d8_bureau … 対策局に到達           b30_read … B-30 を読んだ
     d9_day30 … DAY30=未確定の推理      d10_futures … 複数の未来を見た
     d11_reverse … 観測の逆転の推理      d12_444 … 444は所属なしの推理
     kujo_view … 'stop'|'understand'|'undecided'（§32）
     myst_b30 / myst_nagi / myst_kujo / myst_shiro … TRUE 用の謎の解明
     n444 … 444 の痕跡を見つけた数（t444_* で重複防止）
     back_seen … 「後ろ」イベントを見た   core_done … 境界核を分離した
     final_choice … 'return'|'stay'     anchor … 'id'|'voice'|'shiro'（帰り道の選び方）
     slipped … エンジンが加算（安定度0で研究所へ戻された回数）
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KY = window.KY = window.KY || {};
  var P2 = KY.part2 = KY.part2 || {};

  /* ── 共通ヘルパー ── */
  // 主人公の名前（エンジンの持ち方に依存しないように）
  P2.nm = function (K) {
    try { return (K && (K.name || (K.state && K.state.name) || (K.S && K.S.name))) || '朝霧'; } catch (e) { return '朝霧'; }
  };
  // 場面の注目物（KY_ART.objects）に当たり判定を合わせる。見つからなければ書いた座標のまま
  P2.at = function (scene, world, obj) {
    try {
      var A = window.KY_ART; if (!A || !A.objects) return null;
      var o = A.objects(scene, world).filter(function (m) { return m.id === obj; })[0];
      if (!o) return null;
      var pad = .015, w = Math.max(o.w, .08), h = Math.max(o.h, .1);
      return { x: Math.max(0, o.x + o.w / 2 - w / 2 - pad), y: Math.max(0, o.y + o.h / 2 - h / 2 - pad), w: w + pad * 2, h: h + pad * 2 };
    } catch (e) { return null; }
  };
  function placeSpots(worldDef, w) {
    (worldDef.spots || []).forEach(function (s) { if (s.obj) { var r = P2.at(worldDef.scene, w, s.obj); if (r) { s.x = r.x; s.y = r.y; s.w = r.w; s.h = r.h; } } });
  }
  // 場所：既にあれば足す（担当Cの基本形を壊さない）／無ければ定義する
  P2.area = function (id, def) {
    KY.AREAS = KY.AREAS || {};
    Object.keys(def.worlds || {}).forEach(function (w) { placeSpots(def.worlds[w], w); });
    var a = KY.AREAS[id];
    if (!a) { KY.AREAS[id] = def; return def; }
    a.danger = a.danger || {};
    Object.keys(def.danger || {}).forEach(function (w) { if (a.danger[w] == null) a.danger[w] = def.danger[w]; });
    a.worlds = a.worlds || {};
    Object.keys(def.worlds || {}).forEach(function (w) {
      var src = def.worlds[w];
      if (!a.worlds[w]) a.worlds[w] = { scene: src.scene, spots: [] };
      var have = {}; (a.worlds[w].spots || []).forEach(function (s) { have[s.id] = 1; });
      var add = (src.spots || []).filter(function (s) { return !have[s.id]; });
      if (!add.length) return;
      a.worlds[w].spots = a.worlds[w].spots || [];
      Array.prototype.push.apply(a.worlds[w].spots, add);
    });
    return a;
  };
  // 444 の痕跡（§21：まれに・さりげなく）。見つけた数は n444
  P2.t444 = async function (K, id, lines, note) {
    if (K.has('t444_' + id)) { if (lines && lines.length) await K.say(lines.slice(0, 1)); return false; }
    K.flag('t444_' + id, true); K.inc('n444', 1);
    if (lines && lines.length) await K.say(lines);
    K.note('444', 't444_' + id, { title: note && note.title || '444', text: note && note.text || '', solved: false });
    return true;
  };
  // TRUE END 用の謎（B-30・USER_444・ナギ・九条・シロ）
  P2.mysteries = function (K) {
    var n = 0;
    if (K.has('myst_b30')) n++;
    if ((+K.get('n444') || 0) >= 5) n++;
    if (K.has('myst_nagi')) n++;
    if (K.has('myst_kujo')) n++;
    if (K.has('myst_shiro')) n++;
    return n;
  };
  P2.link = function () {
    var L = window.KY_LINK;
    var dflt = { study: false, stream: false, factory: false, unwell: false, good: false, bad: false, ending: null, variant: null, child: false, anomaly: false, any: false };
    if (!L) return { has: false, cleared: false, endings: [], b30: dflt };
    var b; try { b = L.b30() || dflt; } catch (e) { b = dflt; }
    var en = []; try { en = L.endings() || []; } catch (e) {}
    var has = false, cl = false; try { has = !!L.hasMain(); cl = !!L.cleared(); } catch (e) {}
    return { has: has, cleared: cl, endings: en, b30: b };
  };

  /* ── 第七章の場所（分室の中に後半の調べ物を足す） ── */
  P2.area('center_lab', {
    name: '観測装置室', map: { x: .5, y: .3 }, danger: { A: 0, B: 1 },
    worlds: {
      A: { scene: 'center_lab', spots: [
        { id: 'd7_monitor', obj: 'console', x: .3, y: .2, w: .4, h: .38, label: '操作卓（一時停止中の映像）', acts: ['look', 'photo', 'record'],
          cond: function (K) { return K.has('d7_received') && !K.has('d7_done'); },
          on: {
            look: async function (K) { await K.say(['n:一時停止した映像。暗い部屋。男性らしき人物が、肩をこちらへ回しかけたところで止まっている。', 'n:右上の配信時刻は 02:43:59。コメント欄の最下段に「後ろ誰？」。', 'p:……振り返る、直前。']); },
            photo: async function (K) { await K.say(['#se shutter', 'n:停止中の画面を、時刻表示ごと撮る。']); K.gain('d7_turn_frame'); },
            record: async function (K) { await K.say(['#se rec', 'n:装置のバッファから、受信した配信をまるごと書き出した。', 'n:2分52秒。音はほとんどノイズ。……それでも、ときどき声の輪郭が残っている。']); K.gain('d7_stream_rec'); }
          } },
        { id: 'd7_antenna', obj: 'apparatus', x: .78, y: .18, w: .16, h: .4, label: '受信ユニット', acts: ['look', 'scan'],
          cond: function (K) { return K.has('d7_received') && !K.has('d7_done'); },
          on: {
            look: async function (K) { await K.say(['n:観測装置の受信ユニット。本来、映像を受けるための機械ではない。', 'n:筐体がまだ少し温かい。']); },
            scan: async function (K) {
              await K.say(['#se beep', 't:境界反応　ピーク 4.4（02:43:58）', 't:接続数　2', 't:　#1 月代分室', 't:　#2 ――――', 'p:接続が二つ……？　うち以外に、誰か見ていた。']);
              K.gain('d7_recv_scan');
              await P2.t444(K, 'antenna', ['n:二つ目の接続元は空欄。ただ、ログの末尾の識別子だけが、三桁残っていた。', 't:…/444', 'p:……また、この数字。'], { title: '受信ユニットの二つ目の接続', text: '発信元不明の配信を受けたとき、分室の他にもう一つ接続があった。識別子の末尾は 444。' });
            }
          } },
      ] }
    }
  });
  P2.area('center_server', {
    name: 'サーバー室', map: { x: .62, y: .26 }, danger: { A: 0, B: 1 },
    worlds: {
      A: { scene: 'center_server', spots: [
        { id: 'd7_term', obj: 'log_terminal', x: .12, y: .4, w: .28, h: .3, label: '管理端末', acts: ['look'],
          cond: function (K) { return K.has('d7_received') && !K.has('d7_done'); },
          on: {
            look: async function (K) {
              await K.say(['n:受信と同時に書き込まれるコメントのログ。追記しかできない形式で、あとから一行も書き換えられない。',
                't:02:41:30　今日仕事だった？', 't:02:42:05　寝たほうがいいぞ', 't:02:42:51　資格どうだった？', 't:02:43:20　また歌って', 't:02:47:58　後ろ誰？', 't:――受信 02:43:58',
                'p:最後の一行だけ、受信したときより4分も先の時刻……。']);
              K.gain('d7_comment_log');
            }
          } },
        { id: 'd7_rack', x: .62, y: .3, w: .16, h: .3, label: '時刻同期ユニット', acts: ['look', 'scan'],
          cond: function (K) { return K.has('d7_received') && !K.has('d7_done'); },
          on: {
            look: async function (K) { await K.say(['n:ファンの音。ランプは全部緑。']); },
            scan: async function (K) { await K.say(['#se beep', 't:時刻同期　基準時計との差 +0.012s', 't:過去30日の最大偏差 0.020s', 'p:時計は狂っていない。障害の夜も、今夜も。']); K.gain('d7_server_clock'); }
          } },
      ] }
    }
  });

  /* ── 第七章 ── */
  window.KY_STORY.register('ch07', async function (K) {
    await K.step('d7_open', async function () {
      K.flag('ch7', true);
      await K.title('第七章', '知らない配信');
      await K.say([
        '#scene center_lab A', '#amb clock',
        'n:午前2時40分。夜勤の分室。',
        'n:シロは観測装置の上で丸くなっている。休憩室では、ナギが毛布にくるまって眠っている。',
        'y:眠いか。',
        'p:少し。……ユウさんは？',
        'y:慣れた。二時台は、この町がいちばんうるさい時間だ。',
        '#wait 600', '#se static',
        'n:そのとき、大型モニターがひとりでに点いた。',
        't:受信中――発信元：不明', 't:形式：ライブ配信',
        '#scene stream_room',
        'y:……は？　観測装置が映像を受けてる？',
        '#fx noise',
        'n:暗い部屋。机。モニターの光。誰かが一人で喋っている。音はほとんどノイズで、言葉にならない。',
        'n:男性らしい。顔は、画面の光の向こうでよく見えない。',
        'd:……ーん、今夜も……来てくれたん……ありがと……',
        'n:コメント欄だけが、妙にはっきり読める。',
        'c:深夜の常連|今日仕事だった？',
        'c:夜空の旅人|寝たほうがいいぞ',
        'c:さくら|資格どうだった？',
        'c:ひとりぼっち|また歌って',
        '#wait 900',
        'c:――|後ろ誰？',
        '#wait 600',
        'n:画面の男性が、話すのをやめた。',
        'n:ゆっくりと、肩越しに、後ろを――',
        '#fx glitch', '#se static',
        'n:映像が止まった。',
        '#scene center_lab A',
        '#wait 600',
        'p:誰、この人……',
        'y:それより。最後のコメント。……投稿時刻を見ろ。',
        'p:時刻？',
        'y:おかしい気がする。気がするだけだ。根拠は、お前が集めろ。',
      ]);
      K.flag('d7_received', true);
      K.note('case', 'd7_case', { title: '知らない配信', text: '午前2時41分、観測装置が発信元不明のライブ配信を受信。最後のコメント「後ろ誰？」の直後、映像の男性が振り返りかけて止まった。' });
      K.note('person', 'd7_man', { title: '画面の男性', text: '深夜に一人で配信している男性。顔は見えない。名前も分からない。' });
    });

    await K.step('d7_gather', async function () {
      await K.explore({
        hint: '受信した配信の記録・コメントのログ・サーバーの時計を調べる',
        areas: ['center_lab', 'center_server', 'center_office'],
        goal: function (K) { return K.got('d7_comment_log') && K.got('d7_server_clock') && (K.got('d7_stream_rec') || K.got('d7_turn_frame')); }
      });
    });

    await K.step('d7_deduce', async function () {
      await K.say(['#scene center_office A', 'y:集まったか。ボードに並べてみろ。', 'y:「後ろ誰？」は、いつ書かれた？']);
      var ok = await K.deduce({
        id: 'd7_future',
        q: '「後ろ誰？」のコメントは、いつ書かれたものか',
        options: [
          { id: 'later', text: '配信のあとで、誰かがログに書き足した', need: ['d7_comment_log'], refute: ['d7_comment_log'] },
          { id: 'clock', text: '分室の時計がずれていて、時刻が狂って見えるだけ', need: ['d7_server_clock'], refute: ['d7_server_clock'] },
          { id: 'future', text: '映像より数分「未来」の時刻から、コメントが届いた', need: ['d7_comment_log', 'd7_server_clock'] },
          { id: 'lag', text: '配信の映像が遅れて届いただけ（映像のほうが過去）', need: ['d7_stream_rec'], refute: ['d7_turn_frame'] },
        ],
        answer: 'future',
        hint: {
          later: 'そのログは追記しかできない形式だ。受信と同時に書かれている。「あとから書き足した」とは言えない。',
          clock: '時刻同期の記録を見ろ。誤差は0.02秒もない。4分のずれは時計のせいじゃない。',
          lag: '止めた画面の配信時刻は 02:43:59。受信は 02:43:58。映像はほぼ「いま」届いている。遅れているのはコメントのほうじゃない――先に進んでいるんだ。',
        },
        link: 2,
      });
      if (ok) {
        K.flag('d7_future', true);
        await K.say([
          'p:ログは書き換えられない。時計も狂っていない。映像はほぼ実時間で届いている。',
          'p:なのに「後ろ誰？」だけが、受信より4分先の時刻を持っている。',
          'p:……このコメントは、4分後の世界から届いた。',
          'y:未来からのコメント、か。言葉にすると馬鹿みたいだな。',
          'p:向こうの部屋の時計とこちらの時計が、少しずれているのかもしれません。同じ「今」じゃない。',
          'y:じゃあ、あの男が振り返ったのは。',
          'p:……4分後に書かれるはずのコメントを、先に読んだ。',
        ]);
        K.note('term', 'd7_future_c', { title: '未来コメント', text: '受信時刻より数分先の投稿時刻を持つコメント。時計の誤り・後からの追記では説明できない。', solved: true });
      }
    });

    await K.step('d7_retry', async function () {
      await K.say([
        '#scene center_lab A',
        'n:朝。御堂室長が出てきて、録画を三回見た。',
        'm:もう一度、同じ周波数で受けられるか。',
        'y:やってみます。……シロ、起きろ。',
        's:……きゅ。',
        'n:シロが受信ユニットに鼻先をつける。モニターが砂嵐になり、文字だけが流れた。',
        't:受信中――映像なし',
        'c:――|汽笛',
        'p:投稿時刻……今から3分後。',
        'm:待とう。',
        '#amb clock', '#wait 1500',
        'n:誰も喋らなかった。時計の音だけ。',
        '#wait 1200', '#se whistle',
        'n:……遠くで、汽笛が鳴った。月代町に、線路はない。',
        'm:……なるほど。',
      ]);
      K.gain('d7_whistle_pred');
      await K.say([
        'm:未来からのコメントは、未来を「言い当てた」。いや――向こうでは、もう起きたことを書いただけかもしれん。',
        'g:……汽笛、鳴った？',
        'n:ナギが休憩室の戸口に立っていた。',
        'g:あの音がすると、駅が近いの。',
        'p:ナギさん、この映像の人……前に、見たことがあるって言ってた人？',
        'g:うん。夜になると出てくる人。……でも今日は、ちゃんとこっち見てた。',
        'n:ナギはそれだけ言って、また毛布に戻った。',
        'm:発信元は。',
        'y:座標は出ません。ただ、受信のたびに、町の境界反応が北の住宅街から一斉に「C」側へ振れています。',
        'm:誰もいない側、か。',
      ]);
      K.note('person', 'd7_man', { title: '画面の男性', text: '深夜に一人で配信している男性。顔は見えない。名前も分からない。コメント欄には常連らしい名前が並ぶ。「後ろ誰？」の直後、振り返った。' });
      K.flag('d7_done', true); K.flag('ch7_done', true);
    });
  });
})();
