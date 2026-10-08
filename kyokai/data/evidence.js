/* ══════════════════════════════════════════════════════════
   kyokai/data/evidence.js — 証拠の定義
   KY.EVIDENCE[id] = {title, type, desc, world:'A'|'B'|'C'|null, art:'場面id'|null, ch:章番号}
   type: photo / testimony / audio / map / video / log / item / person / article
   章ごとのブロックに分ける（担当C：ch00〜ch06＋任意事件、担当D：ch07以降を末尾に追記）。
   同じ id を二重に定義しないこと。
   ══════════════════════════════════════════════════════════ */
window.KY = window.KY || {};
KY.EVIDENCE = KY.EVIDENCE || {};

/* ───────────── プロローグ「一分間の空白」（ch00・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  p_office_photo: { title: '着任初日の分室', type: 'photo', world: 'A', art: 'center_office', ch: 0,
    desc: '着任した日の夕方、練習で撮った分室の写真。液晶モニターの端末、丸い壁時計（TSUKUYO）、令和八年のカレンダー、職員写真が五枚と右下の空き枠。室名の札は「特殊現象観測センター 月代分室」。' },
  p_outage_log: { title: '一分間の障害ログ', type: 'log', world: 'A', art: null, ch: 0,
    desc: '午前2時17分00秒〜2時18分00秒。町内の監視カメラ・防災無線・携帯基地局で、映像と音声の一部だけが欠落。通信そのものは途切れていない。' },
  p_power_log: { title: '電力・時刻同期ログ', type: 'log', world: 'A', art: null, ch: 0,
    desc: '同時刻の電力供給は正常。分室の時計・基地局の時刻同期にもずれはない。停電ではなく、機器の故障記録もない。' },
  p_whistle_memo: { title: '当直メモ：汽笛', type: 'log', world: 'A', art: null, ch: 0,
    desc: '障害の一分間に、自分の耳で聞いた音のメモ。「2:17 遠くで汽笛のような音」。録音機には何も残っていない。月代町に線路はない。' },
  p_tes_road: { title: '証言：昨日までなかった道', type: 'testimony', world: 'A', art: 'shotengai', ch: 0,
    desc: '八百屋の坂口さん。「山のほうへ曲がる道があった。舗装もしてあった。けさ見に行ったら、ない」' },
  p_tes_furniture: { title: '証言：家具の位置が違う', type: 'testimony', world: 'A', art: 'residential', ch: 0,
    desc: '住宅街の早瀬さん。「夜中に起きたら、居間のタンスが反対の壁にあった。朝には元に戻っていた。夫は信じてくれない」' },
  p_tes_child: { title: '証言：知らない子供', type: 'testimony', world: 'A', art: 'residential', ch: 0,
    desc: '同じく住宅街の女性。「ゴミを出しに出たら、知らない女の子に『お母さん』と呼ばれた。振り返ったら、いなかった」' },
  p_tes_house: { title: '証言：知らない家', type: 'testimony', world: 'A', art: 'shotengai', ch: 0,
    desc: '新聞配達の青年。「三丁目の空き地に家が建ってた。灯りもついてた。配達先の名簿には載ってない」' },
  p_conn_444: { title: '存在しない配信サーバーへの接続', type: 'log', world: 'A', art: 'center_server', ch: 0,
    desc: '障害の一分間に、町内の端末十二台が、登録の存在しない配信サーバーへ一瞬だけ接続。接続時刻はすべて 2:44:44。障害の時刻（2:17）と合わない。' },
});

/* ───────────── 第一章「存在しない駅」（ch01・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c1_town_map: { title: '月代町の地図', type: 'map', world: 'A', art: 'town_map', ch: 1,
    desc: '分室の備品の地図。山側には林道が一本あるだけ。鉄道も駅も描かれていない。' },
  c1_shrine_record: { title: '神社の町史', type: 'article', world: 'A', art: 'shrine', ch: 1,
    desc: '宮司の白峰さんが見せてくれた町史。「明治以降、月代町に鉄道が敷かれた記録はない。計画もなかった」' },
  c1_tes_matsui: { title: '証言：汽車の夢', type: 'testimony', world: 'A', art: 'shotengai', ch: 1,
    desc: '駄菓子屋の松井さん。「子供のころ、夜中に汽車の音を聞いた気がする。母さんは夢だと言った」' },
  c1_meter_road: { title: '磁場計の異常', type: 'log', world: 'A', art: 'mountain_road', ch: 1,
    desc: '山道の途中、簡易磁場計の針がゆっくり一周した。道の入口から先でだけ起きる。' },
  c1_road_photo: { title: '地図にない道', type: 'photo', world: 'A', art: 'mountain_road', ch: 1,
    desc: '林道の脇から分かれる、草に埋もれた舗装路。地図にも航空写真にもない。写真の中のカーブミラーにだけ、街灯のついた道が映り込んでいる。' },
  c1_ruin_photo: { title: '廃駅', type: 'photo', world: 'A', art: 'station_ruin', ch: 1,
    desc: '山の中腹の廃墟。崩れたホーム、錆びたレール。少なくとも数十年は放置されているように見える。' },
  c1_signboard: { title: '駅名標「つきしろ」', type: 'photo', world: 'A', art: 'station_ruin', ch: 1,
    desc: '割れた駅名標。「つきしろ／月代」。隣の駅名は削れて読めない。書体は古い国鉄風に似ているが、どこか違う。' },
  c1_timetable: { title: '錆びた時刻表', type: 'item', world: 'A', art: 'station_ruin', ch: 1,
    desc: '待合室の壁の、はがれかけた時刻表。印刷は読めない。余白に鉛筆で書き足された「2:17」だけが残る。ホームの時計は 2:44 で止まっている。' },
  c1_live_photo: { title: '営業中の駅', type: 'photo', world: 'B', art: 'station_live', ch: 1,
    desc: '同じ場所、同じ角度。灯りのついたホーム、乗客、駅員、停車中の列車。撮影データの位置情報は廃駅の写真と一致。' },
  c1_whistle_rec: { title: '汽笛の録音', type: 'audio', world: 'B', art: 'station_live', ch: 1,
    desc: '発車の汽笛。今度は録音機にはっきり残った。プロローグの夜に聞いた音と、波形の形がよく似ている。' },
  c1_tes_staff: { title: '証言：駅員', type: 'testimony', world: 'B', art: 'station_live', ch: 1,
    desc: '駅員。「開業してもう六十年近くになりますよ」「終電は0時44分」「2時17分のは時刻表にない列車です。お客さんは乗れません」。' },
  c1_ad: { title: '配信サービスの広告', type: 'photo', world: 'B', art: 'station_live', ch: 1,
    desc: '構内の広告。「よるのまど 深夜ライブ配信サービス」。存在しない配信サービス。配信者の写真が五枚。五枚目だけ顔がノイズで見えず、紫の髪と小さな帽子の影がのぞく。名札は近づくと崩れた。' },
  c1_ticket: { title: '拾った切符', type: 'item', world: 'B', art: 'station_live', ch: 1,
    desc: 'ホームで拾った硬券。「月代鉄道 月代→海浜公園 小児」。廃駅に戻っても、切符は手元に残っていた。' },
  c1_tes_yuu: { title: '同時観測の記録', type: 'testimony', world: null, art: null, ch: 1,
    desc: 'ユウも同じものを見ていた。人数、列車の色、広告の文字まで、二人の記憶は一致した。' },
});

/* ───────────── 第二章「書き換わる記録」（ch02・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c2_photo_gone: { title: '駅の消えた写真', type: 'photo', world: 'A', art: 'mountain_road', ch: 2,
    desc: '昨日撮った「廃駅」と「営業中の駅」の写真。今朝開くと、どちらにも雑木林しか写っていない。撮影日時と位置は昨日のまま。' },
  c2_hash: { title: '改ざん検査', type: 'log', world: 'A', art: 'center_server', ch: 2,
    desc: '撮影時に端末が自動で記録したハッシュ値と、いまのファイルのハッシュ値が一致。データは一ビットも書き換えられていない。' },
  c2_yuu_photo: { title: 'ユウの写真', type: 'photo', world: 'A', art: null, ch: 2,
    desc: 'ユウが別の端末で撮った写真も同じく、林しか写っていない。二台の端末が同時に壊れる可能性は低い。' },
  c2_ticket_still: { title: '残っている切符', type: 'item', world: 'B', art: null, ch: 2,
    desc: '写真は変わったのに、拾った切符は机の引き出しの中にそのまま残っている。' },
  c2_office_today: { title: '今日の分室', type: 'photo', world: 'B', art: 'center_office', ch: 2,
    desc: '今朝いつもの位置から撮った分室の写真。写っているのは木の床、振り子時計（明光舎）、ブラウン管の端末、「昭和百一年」のカレンダー、「國立 月代觀測所」の札。目の前の部屋は何も変わっていない。' },
  c2_staff_photo: { title: '空き枠の名札「九」', type: 'photo', world: null, art: 'center_office', ch: 2,
    desc: '職員写真の右下の空き枠。今日の写真では、そこに白髪の人物が写っていた。実物の枠の下には剥がれかけた名札テープ。「九」の一文字だけ読める。誰の枠だったか、誰も覚えていない。' },
  c2_user444: { title: 'USER_444 のログ', type: 'log', world: null, art: 'center_server', ch: 2,
    desc: 'サーバーの利用者ログ。存在しない利用者ID「USER_444」。内容はすべて「配信を開始しました。」日付は数年前、昨日、数年後、来月……ばらばら。' },
  c2_comment_back: { title: 'コメントログ「後ろ。」', type: 'log', world: null, art: 'center_server', ch: 2,
    desc: 'USER_444 の記録に一件だけ混じっていたコメント。本文は「後ろ。」の二文字。紐づく配信映像は、どこにもない。' },
  c2_meter_reading: { title: '境界測定端末の数値', type: 'log', world: 'A', art: 'center_lab', ch: 2,
    desc: '新しい境界測定端末で分室を測ると、職員写真の右下の空き枠の前でだけ数値が跳ねる。何もない枠が「どこか」とつながっているように。' },
  c2_rumor_girl: { title: '噂：駅に行く女の子', type: 'testimony', world: 'A', art: 'school', ch: 2,
    desc: '小学校の用務員・寺田さん。「夜明けに、ランドセルの女の子が山のほうへ歩いていくのを見た。『駅に行く』って言ってね。うちの学校の子じゃない」' },
});

/* ───────────── 第三章「存在しない少女」（ch03・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c3_nagi: { title: 'ナギ', type: 'person', world: 'B', art: null, ch: 3,
    desc: '河川敷で保護された少女。十歳くらい。月代駅を知っている。本人は「月代町に住んでいる」と言う。' },
  c3_registry: { title: '住民台帳：該当なし', type: 'log', world: 'A', art: null, ch: 3,
    desc: '町役場の照会結果。「ナギ」という名の児童は月代町にいない。転出入、近隣の捜索願にも該当なし。' },
  c3_address: { title: 'ナギの家（空き地）', type: 'photo', world: 'A', art: 'residential', ch: 3,
    desc: 'ナギの言う住所「月代町三丁目十四番」。そこは雑草の生えた空き地。新聞配達の青年が「家を見た」と言った場所と同じ。' },
  c3_pass: { title: 'ナギの定期券', type: 'item', world: 'B', art: null, ch: 3,
    desc: '「月代鉄道 月代⇔海浜公園 通学 ナギ」。駅で拾った切符と同じ鉄道会社、同じ書体。' },
  c3_school_name: { title: '証言：月代第二小学校', type: 'testimony', world: 'B', art: 'school', ch: 3,
    desc: 'ナギ「第二小。駅の向こうの」。月代町に小学校は一つしかない。第二小学校が建った記録もない。' },
  c3_tes_train: { title: '証言：汽車で通学', type: 'audio', world: 'B', art: null, ch: 3,
    desc: '録音。ナギ「毎朝、二両の汽車。海のほうに行くの。先生は汽車の中でも宿題やれって言う」' },
  c3_classphoto: { title: '月代小の卒業写真', type: 'photo', world: 'A', art: 'school', ch: 3,
    desc: '月代小学校の廊下に並ぶ卒業写真。ナギは「お母さんが写ってる」と言った写真の中に、お母さんを見つけられなかった。' },
  c3_stream_video: { title: '乱れた配信映像', type: 'video', world: null, art: 'stream_room', ch: 3,
    desc: '古い端末に残っていた映像の断片。暗い部屋、机、モニターの光、マイク。人影は後ろ姿だけ。音はほとんどノイズ。' },
  c3_tes_tv: { title: '証言：テレビじゃないテレビ', type: 'audio', world: 'B', art: 'stream_room', ch: 3,
    desc: '録音。ナギ「この人、見たことある」「夜になると出てくる」「テレビ。でもテレビじゃない」「子供の声もする」' },
});

/* ───────────── 第四章「嘘をついているのは世界か」（ch04・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c4_coin: { title: '「昭和九十五年」の硬貨', type: 'item', world: 'B', art: null, ch: 4,
    desc: 'ナギの財布の十円玉。刻印は「昭和九十五年」。昭和は六十四年で終わった。過去のどの年にも、この硬貨は存在しない。' },
  c4_textbook: { title: 'ナギの社会科の教科書', type: 'article', world: 'B', art: null, ch: 4,
    desc: '「わたしたちの月代町」。年表に「昭和四十二年 月代鉄道開通」「昭和四十五年 月代第二小学校 開校」、そして今も続く「昭和」。町長の名前も、町の花も違う。' },
  c4_station_hist: { title: '駅の掲示「開業記念」', type: 'photo', world: 'B', art: 'station_live', ch: 4,
    desc: '営業中の月代駅の掲示板。「月代鉄道 開業 昭和四十二年」「来年 開業六十周年」。教科書の年表と一致する。' },
  c4_bridge_photo: { title: '落ちた月代橋', type: 'photo', world: 'A', art: 'riverbank', ch: 4,
    desc: '真ん中の落ちた月代橋。銘板「月代橋 昭和三十九年竣工」。町の掲示「平成二十三年 豪雨により落橋 人的被害なし」。' },
  c4_tes_gen: { title: '証言：午後三時の事故', type: 'testimony', world: null, art: 'riverbank', ch: 4,
    desc: '釣り人の源さん。「事故は午後三時だ。橋の上でトラックが傾いて、駅から帰る学生さんが大勢見てた」――月代町に駅はない。' },
  c4_tes_kashiwagi: { title: '証言：夜の事故', type: 'testimony', world: null, art: 'shotengai', ch: 4,
    desc: '月代書店の柏木さん。「夜だった。停電してて真っ暗で、橋が崩れる音と悲鳴だけ聞こえた。車ごと落ちたって」' },
  c4_tes_matsui: { title: '証言：事故はない', type: 'testimony', world: 'A', art: 'shotengai', ch: 4,
    desc: '駄菓子屋の松井さん。「事故なんて起きてない。十五年前の大雨の朝、誰も渡ってないときに真ん中がすとんと落ちたの。けが人ゼロ」' },
  c4_scan_witness: { title: '証言者の境界残滓', type: 'log', world: null, art: null, ch: 4,
    desc: '境界測定端末で三人を測った結果。源さんの周囲にはナギと同じ型（B型）の弱い反応。柏木さんには見たことのない第三の型。松井さんには反応なし。' },
  c4_newspaper: { title: '古い新聞の小記事', type: 'article', world: 'B', art: 'station_live', ch: 4,
    desc: '駅の売店の古新聞。隅の小記事「深夜配信中に不可解な障害――存在しない視聴者が接続、配信終了後も接続者数が1名から減らず」。配信者名は汚れて読めない。画像の片隅に「固定視聴者：1」。' },
  c4_tunnel_rec: { title: 'トンネルの反響', type: 'audio', world: 'A', art: 'tunnel', ch: 4,
    desc: '廃トンネルで録った音。自分たちの足音の反響が、一拍遅れてもう一組返ってくる。' },
});

/* ───────────── 第五章「シロ」（ch05・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c5_shiro_photo: { title: '白い生き物', type: 'photo', world: null, art: 'shrine', ch: 5,
    desc: '神社の縁の下にいた白い小さな生き物。写真では輪郭が二重にぶれている。シャッター速度のせいではない。' },
  c5_shiro_scan: { title: '白い生き物の反応', type: 'log', world: null, art: null, ch: 5,
    desc: '異常波スキャナーの結果。この生き物の周りでは、A・B・C 三種類の境界波形が同時に出ている。三つの世界に同時にいるような数値。' },
  c5_trail: { title: '途中で消える足跡', type: 'photo', world: 'A', art: 'riverbank', ch: 5,
    desc: '河川敷のぬかるみの小さな足跡。七歩目で途切れ、十歩先から再び始まる。間の三歩は「どこか別の場所」を歩いた。' },
  c5_factory: { title: '一瞬の工場', type: 'video', world: null, art: 'factory_glimpse', ch: 5,
    desc: '白い生き物を追った先で数秒だけ見えた場所。配管、機械の唸り、油の匂い。作業着の誰かが設備を直していた。月代町ではない。' },
  c5_stream_glimpse: { title: '一瞬の配信画面', type: 'video', world: null, art: 'stream_room', ch: 5,
    desc: '次に見えた暗い部屋。モニターの光、マイク、流れるコメント。一行だけ読めた――「今日も生き延びたな」。' },
  c5_yodomi_rec: { title: '黒い影の音', type: 'audio', world: 'C', art: 'tunnel', ch: 5,
    desc: '白い生き物を追ってきた黒い影の音。人の声を逆再生したような響き。ユウは「ヨドミ」と呼んだ。' },
  c5_tes_mido: { title: '証言：御堂の記憶', type: 'testimony', world: null, art: null, ch: 5,
    desc: '御堂。「十数年前にも、白いものを見たという報告があった。報告した職員は……もういない」' },
});

/* ───────────── 第六章「観測同期」（ch06・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  c6_sync_log: { title: '同期実験ログ', type: 'log', world: null, art: 'center_lab', ch: 6,
    desc: 'シロとの接触時、観測者（私）の脳波と境界波形が一致。同期率は段階的に上がり、別の世界の像が観測端末に重なって表示された。' },
  c6_diff_shotengai: { title: '商店街の三つの姿', type: 'photo', world: null, art: 'shotengai', ch: 6,
    desc: '同じ商店街。A：月代商店街（コインランドリー・精肉店・書店）。B：月代銀座（銭湯・食堂・貸本屋・「月代駅 →」の案内）。C：看板が傾き、誰もいない。' },
  c6_trace_book: { title: '机の上の参考書', type: 'item', world: 'B', art: 'residential', ch: 6,
    desc: '別の世界の、誰も住んでいないはずの家。机の上に付箋だらけの資格の参考書。蛍光ペンの線が何重にも引いてある。' },
  c6_trace_mic: { title: '崩れた店のマイク', type: 'item', world: 'C', art: 'shotengai', ch: 6,
    desc: '崩れた商店街の中で一つだけ埃をかぶっていない物。卓上のマイク。誰かが昨夜まで使っていたように温かい気がした。' },
  c6_trace_tools: { title: '使い込まれた工具箱', type: 'item', world: 'B', art: 'mountain_road', ch: 6,
    desc: '山道の脇に置き忘れられた工具箱。ラチェットと検電器、手書きの点検表。名前の欄はにじんで読めない。' },
  c6_trace_drawing: { title: '子供が描いたような絵', type: 'item', world: 'C', art: 'school', ch: 6,
    desc: '誰もいない教室の黒板の下に落ちていた画用紙。クレヨンで、長い紫の髪に小さな帽子の人と、手をつないだ小さな子。' },
  c6_lock_label: { title: '電子錠の銘板', type: 'photo', world: 'A', art: 'center_basement', ch: 6,
    desc: '地下・第二観測室の電子錠。銘板に「停電時開放型」。電源が切れると錠が開く仕組み。' },
  c6_door_open_b: { title: '開いている扉（B）', type: 'photo', world: 'B', art: 'center_basement', ch: 6,
    desc: '世界Bの地下は停電している。同じ扉が、半開きのまま止まっている。' },
  c6_breaker_diagram: { title: '配電図（B）', type: 'map', world: 'B', art: 'center_basement', ch: 6,
    desc: '世界Bの配電室の壁の配電図。改修されたばかりで文字が鮮明。「No.7 地下 第二観測室 電子錠」。' },
  c6_room_record: { title: '第二観測室の記録', type: 'log', world: 'A', art: 'center_basement', ch: 6,
    desc: '封印されていた観測記録の束。観測者番号 001 御堂、002 如月、003 ……。一枚だけ「主任 九條（九条）」の名が墨で消されかけている。' },
  c6_self_desk: { title: 'もう一つの私の机', type: 'photo', world: 'B', art: 'center_office', ch: 6,
    desc: '別の世界の分室。私の席に、私の名前の札。肩書は「主任観測員」。机の上には、私の知らない家族写真。' },
});

/* ───────────── 任意調査（side・担当C） ───────────── */
Object.assign(KY.EVIDENCE, {
  sd_vending_can: { title: 'ツキミ・サイダー', type: 'item', world: 'B', art: 'residential', ch: 4,
    desc: '撤去された自販機の跡に夜だけ現れる自動販売機で買えた缶。「ツキミ・サイダー 販売者：月代鉄道グループ」。こちらの世界にこの会社も商品もない。朝には缶の中身だけ消えていた。' },
  sd_vending_log: { title: '自販機の出現時刻', type: 'log', world: null, art: null, ch: 4,
    desc: '三晩の記録。出現は毎晩 2時17分ごろ、消えるのは汽笛が聞こえた直後。' },
  sd_dog_photos: { title: '三日分のタロウ', type: 'photo', world: null, art: 'residential', ch: 4,
    desc: '大野さんの犬「タロウ」。一日目は柴、二日目はダックスフント、三日目はコーギー。首輪と名札だけは毎日同じ。' },
  sd_house_light: { title: '空き家の灯り', type: 'photo', world: null, art: 'residential', ch: 4,
    desc: '毎晩七時に灯りがつく空き家。窓の中には四人分の夕食。誰もいないのに、食器が片づいていく。' },
  sd_paper_future: { title: '翌日の新聞', type: 'article', world: null, art: null, ch: 4,
    desc: '朝刊の束に一部だけ混じる「明日の日付」の新聞。載っている事故は、起きる日と起きない日がある。' },
  sd_twins_tes: { title: '証言：二人のミナト', type: 'testimony', world: null, art: 'school', ch: 4,
    desc: '同じ顔、同じ名前、同じ服の少年が二人。互いを指さして「そっちが偽物」。好きな給食だけが違う。' },
  sd_ema: { title: '叶った絵馬', type: 'photo', world: 'B', art: 'shrine', ch: 4,
    desc: '神社の絵馬。こちらの世界では「店を続けられますように 松井」。別の世界では、おみくじ結びに結ばれた絵馬に「お礼参り 店は三代目へ 松井」。' },
});

/* ═════════════ ここから担当D：第七章〜最終章（ch07〜ch14）。上の担当Cのブロックとは独立 ═════════════ */
/* ───────────── 第七章「知らない配信」（ch07） ───────────── */
Object.assign(KY.EVIDENCE, {
  d7_stream_rec: { title: '受信した配信の録画', type: 'video', world: null, art: 'stream_room', ch: 7,
    desc: '観測装置室の大型モニターが受信した、発信元不明のライブ配信。暗い部屋で男性らしき人物が一人で喋っている。音声はほとんどノイズ。映像の時刻表示は 02:41:10 から 02:44:02（停止）。最後に人物がゆっくり振り返る。' },
  d7_comment_log: { title: 'コメントログ（受信時刻つき）', type: 'log', world: null, art: 'center_server', ch: 7,
    desc: 'サーバーが受信と同時に書き込んだコメント。追記不可の形式。「今日仕事だった？」02:41:30／「寝たほうがいいぞ」02:42:05／「資格どうだった？」02:42:51／「また歌って」02:43:20／「後ろ誰？」の投稿時刻だけ 02:47:58。受信は 02:43:58。' },
  d7_server_clock: { title: '時刻同期記録', type: 'log', world: 'A', art: 'center_server', ch: 7,
    desc: '分室サーバーの時刻同期。基準時計との差は ±0.02秒。障害の夜も、今夜も、時計は狂っていない。' },
  d7_turn_frame: { title: '振り返る直前のフレーム', type: 'photo', world: null, art: 'stream_room', ch: 7,
    desc: '一時停止した映像を撮影。画面右上の配信時刻 02:43:59。コメント欄の最下段に「後ろ誰？」。人物の肩がこちらへ回りかけている。' },
  d7_recv_scan: { title: '受信アンテナのスキャン', type: 'log', world: null, art: 'center_lab', ch: 7,
    desc: '受信の瞬間、装置室の境界反応が一瞬だけ跳ね上がった。接続数の表示は「2」。一つは分室。もう一つの接続元は空欄。' },
  d7_whistle_pred: { title: '未来から届いた二件目', type: 'log', world: null, art: 'center_lab', ch: 7,
    desc: '再受信の試験中に届いたコメント「汽笛」。投稿時刻は受信の3分後。3分後、本当に遠くで汽笛が鳴った。' },
});
/* ───────────── 第八章「誰もいない月代町」（ch08） ───────────── */
Object.assign(KY.EVIDENCE, {
  d8_empty_clock: { title: '止まった時計たち', type: 'photo', world: 'C', art: 'empty_town', ch: 8,
    desc: '誰もいない町。見える時計はすべて 2:17 で止まっている。一つだけ、秒針が逆に動いていた。' },
  d8_school_board: { title: '黒板の正の字', type: 'photo', world: 'C', art: 'school', ch: 8,
    desc: '無人の教室の黒板に「正」の字が六つ。数えると30。誰が何を数えたのかは分からない。' },
  d8_bureau_plate: { title: '室名の銘板', type: 'photo', world: 'C', art: 'bureau', ch: 8,
    desc: '札「境界現象対策局 第三記録保管室」の下の銘板。「月代支局（旧 特殊現象観測センター月代分室）」。年号はこちらの暦より先。' },
  d8_bureau_badge: { title: '対策局の職員証', type: 'item', world: 'C', art: 'bureau', ch: 8,
    desc: '保管棚の引き出しに残っていた職員証。所属「境界現象対策局」。肩書「主任観測員」。氏名欄は、私の名前だった。' },
  d8_b30: { title: '境界観測記録 B-30', type: 'log', world: 'C', art: 'bureau', ch: 8,
    desc: '対象：男性／職業：設備関連業務／深夜に定期的な映像配信／対象周辺において低確率で境界ノイズを検出／特記事項：精神状態・睡眠状態により観測強度が変動している可能性。氏名欄は破損。' },
  d8_b30_image: { title: 'B-30 の観測画像', type: 'photo', world: 'C', art: 'stream_room', ch: 8,
    desc: 'B-30 に添付された粗い観測画像。暗い部屋、机、モニター、マイク。人物は後ろ姿か、ノイズの向こう。' },
  d8_cctv: { title: '対策局の監視映像', type: 'video', world: 'C', art: 'bureau', ch: 8,
    desc: '右の表示板に映る、無人のはずの局内の監視カメラ。在室者表示は「0」。ただし入退室記録の最後の行に「444」。' },
});
/* ───────────── 第九章「30」（ch09） ───────────── */
Object.assign(KY.EVIDENCE, {
  d9_period: { title: '観測期間：30日', type: 'log', world: 'C', art: 'bureau', ch: 9,
    desc: 'B-30 の表紙。「観測期間 30日（延長不可）」。' },
  d9_cycle: { title: '実験周期：30', type: 'photo', world: 'B', art: 'old_lab', ch: 9,
    desc: '別の歴史の旧研究施設。黒板に「境界共鳴実験 観測周期 T=30」「固定観測者 1」。' },
  d9_fragments: { title: 'B-30 の断片（DAY記録）', type: 'log', world: null, art: 'bureau', ch: 9,
    desc: '30個の小さな記録。読めたもの：DAY 04 睡眠不足／DAY 07 配信／DAY 11 仕事上のトラブル／DAY 15 怪異反応上昇／DAY 18 歌唱／DAY 23 精神状態低下／DAY 27 異常視聴者を確認／DAY 30 ――――（黒塗り）' },
  d9_status: { title: 'DAY 30 の状態欄', type: 'log', world: null, art: 'bureau', ch: 9,
    desc: 'DAY 01〜29 の状態欄は「CLOSED」。DAY 30 だけ「OPEN」。記録が確定していない。' },
  d9_scan30: { title: '黒塗りのスキャン', type: 'log', world: null, art: 'bureau', ch: 9,
    desc: '黒塗りの下をスキャンすると、文字列が毎回違う。読むたびに書き換わっている。消されたのではなく、まだ書かれている途中に見える。' },
});
/* ───────────── 第十章「入れ替わる人間」（ch10） ───────────── */
Object.assign(KY.EVIDENCE, {
  d10_tes_shop: { title: '証言：時計屋の坂口さん', type: 'testimony', world: 'A', art: 'shotengai', ch: 10,
    desc: '八百屋だったはずの坂口さんが、時計屋の主人として話す。「うちは親父の代から時計屋だよ。八百屋？　隣町の話かい」。嘘をついている様子はない。' },
  d10_shadow_scan: { title: '影のスキャン', type: 'log', world: 'A', art: 'shotengai', ch: 10,
    desc: '坂口さんの足元だけ、境界反応が常に「B」側に振れている。体温・脈拍は正常。' },
  d10_shop_b: { title: '別の世界の坂口時計店', type: 'photo', world: 'B', art: 'shotengai', ch: 10,
    desc: '別の歴史の商店街には、昔から「坂口時計店」がある。看板の色も、店先の振り子時計も、坂口さんの話と一致する。' },
  d10_futures: { title: '一人の男性の、複数の未来', type: 'video', world: null, art: 'center_lab', ch: 10,
    desc: '観測装置が同時に映した五つの未来。成功している／資格を大量に取得した／深夜配信で大きな存在になった／完全に疲弊している／途中で記録が消えている。すべて同じ男性。' },
});
/* ───────────── 第十一章「観測されていたのは誰か」（ch11） ───────────── */
Object.assign(KY.EVIDENCE, {
  d11_obs_log: { title: '分室の受動観測ログ', type: 'log', world: 'A', art: 'center_server', ch: 11,
    desc: '数年分の受動観測ログ。対象世界「B-30系」へ深夜に周期的な接続。備考欄に「対象側の表示への干渉 1件（視聴者数表示が一時的に変動）」「音声漏出の疑い」。' },
  d11_test_strings: { title: '送信試験の文字列', type: 'log', world: 'A', art: 'center_server', ch: 11,
    desc: '観測員が送信試験に使った定型文。「昨日も同じ時間にここにいた」「後ろ、雨の音だけじゃないですよ」「さっきも同じ話、聞きました」。試験の相手先は「なし」のはずだった。' },
  d11_counter: { title: '視聴者数のちらつき', type: 'photo', world: null, art: 'stream_room', ch: 11,
    desc: '第七章の録画を一コマずつ送ると、分室が接続した瞬間だけ、向こうの画面の視聴者数が 444 に跳ねている。' },
  d11_leak: { title: '漏れていた秒針', type: 'audio', world: null, art: 'stream_room', ch: 11,
    desc: '第七章の録画の音声を高感度録音機で解析。雨音のノイズの底に、分室の壁時計と同じ周期の秒針の音。こちらの部屋の音が、向こうの配信に漏れていた。' },
  d11_missing: { title: 'ログにない言葉', type: 'log', world: 'A', art: 'center_server', ch: 11,
    desc: '向こうのコメント欄に出ていた「30日目まで見ています」「寝たら終わりますよ」は、分室の送信記録のどこにもない。' },
});
/* ───────────── 第十二章「444番目の観測者」（ch12） ───────────── */
Object.assign(KY.EVIDENCE, {
  d12_registry: { title: '観測者名簿', type: 'log', world: null, art: 'bureau', ch: 12,
    desc: '観測者番号 001, 002, 003 …… 不自然に飛んで 444。登録名不明・所属なし・観測方法不明・接続元不明。' },
  d12_kujo_list: { title: '九条の観測者一覧', type: 'log', world: 'C', art: 'old_lab', ch: 12,
    desc: '九条の研究ノートの観測者一覧。分室・対策局・九条自身の番号が並ぶ。444 の欄には赤で「誰だ」とだけ。' },
  d12_444_streams: { title: '444の接続履歴', type: 'log', world: null, art: 'center_server', ch: 12,
    desc: '444番の接続先。月代町の端末、分室、対策局、そして B-30 の配信に何度も。接続した夜は、いつも B-30 の配信が深夜を越えていた。' },
  d12_nagi_home: { title: 'ナギの家', type: 'photo', world: 'B', art: 'residential', ch: 12,
    desc: '別の歴史の住宅街。表札にナギの名字。窓辺に「月代鉄道」の時刻表。ナギが言っていた家と、すべて同じ。' },
  d12_shiro_all: { title: 'シロの同時観測', type: 'log', world: null, art: 'center_lab', ch: 12,
    desc: '三つの世界を同時にスキャンすると、シロの反応は三つとも同じ位置・同じ形。シロだけが、どの世界でも「ずれていない」。' },
});
/* ───────────── 第十三章「九条シン」（ch13） ───────────── */
Object.assign(KY.EVIDENCE, {
  d13_kujo_terminal: { title: '九条の端末', type: 'log', world: 'C', art: 'old_lab', ch: 13,
    desc: '無数の人生の記録。その中に B-30 の記録もある。一人の男性の三十日が、何百通りも並んでいる。' },
  d13_family: { title: '九条の家族写真', type: 'photo', world: 'B', art: 'old_lab', ch: 13,
    desc: '別の歴史の研究施設（札「九条研究室」）の机。九条と、妻と、小さな息子。裏に日付。この世界では、三人とも生きている。' },
  d13_search_log: { title: '探索記録', type: 'log', world: 'C', art: 'old_lab', ch: 13,
    desc: '九条が観測した世界の一覧。各行の末尾に「家族：不在」。何千行も。一行だけ「家族：在」。その世界には、九条自身がいない。' },
});
/* ───────────── 最終章「月代町崩壊」（ch14） ───────────── */
Object.assign(KY.EVIDENCE, {
  d14_back: { title: '「後ろ」', type: 'video', world: null, art: 'stream_room', ch: 14,
    desc: '境界の向こうの配信部屋。コメント欄に「後ろ」。男性が振り返り、一瞬だけ、こちらと目が合った。' },
  d14_core_scan: { title: '境界核の波形', type: 'log', world: null, art: 'core', ch: 14,
    desc: '境界核の脈動。汽笛・時計・電線の三つの音が、決まった順番で重なっている。' },
});
