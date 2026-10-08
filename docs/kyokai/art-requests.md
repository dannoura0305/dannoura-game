# 境界事象：生成画像の依頼文（差し替え用）

いまの絵はすべて `kyokai/art.js` のコード描画。手元の画像生成ツールで描き直したいときの依頼文をまとめる。
できた画像は `assets/kyokai/` に置き、`assets/kyokai/manifest.json` の該当 `id` の `file` に相対パス（例 `"assets/kyokai/scene_shotengai_A.png"`）を書けば差し替わる（読み込めなければコード描画のまま）。

## 共通の約束
- **場面**：1920×1080（16:9）。cover 表示で 4:3 に切られることがあるので、大事な物は横の中央 75%（左右 12.5% より内側）に置く。
- **注目物の位置を変えない**：`docs/kyokai/scenes.md` の座標表（x,y,w,h は 0..1）にホットスポットが置かれる。下書きとしてコンタクトシート（`node tools/kyokai_contact.mjs`）の絵を img2img の元にすると位置がそろう。
- **文字**：差し替え画像の上にはコードの文字は描かれない。看板の文字は画像に正しく入れる（生成で崩れたら、文字なしで生成して後から手で入れる）。A と B で文字が違うことが謎解きになっている。
- **人物の顔**：512×640、透明背景、胸から上、正面やや斜め。下端中央が基準。
- **だんのうら（深夜配信の男性）**：**男性**。紫の長い髪をポニーテール、小さなピンクのシルクハット、ピンクの花の髪飾り、黒い四角いめがね、ラベンダーの上着。**後ろ姿・逆光・ノイズ越しのみ**。顔をはっきり描かない（振り返りでもシルエット＋めがねの反射まで）。女性として描かない。
- **主人公**：顔を描かない。
- 既存のゲーム・作品のキャラクターや画風、実在の企業・ブランドのロゴを模倣しない。

共通スタイル（すべての場面の先頭に付ける）：
> 夜の日本の地方町、静かでシネマティック、違和感のあるサスペンス。藍と群青の夜、ナトリウム灯のアンバー、境界現象はかすかなシアン、赤は危険の印にだけ。低解像度のドット絵を整数倍で拡大した質感、くっきりした外周線。
> `night, rural japanese town, cinematic, quiet suspense, uncanny, indigo and navy palette, sodium lamp amber light, faint cyan glow for anomalies, red only as danger accent, pixel art, low resolution upscaled with nearest neighbour, crisp outlines, 16:9, no characters looking at camera`

世界ごとに付け足す：
- **A（通常）**：`present day 2020s, slightly declining rural town, shutters, LED lights, modern signage`
- **B（別の歴史：鉄道が廃止されなかった昭和の延長）**：`alternate history, showa era aesthetics continuing into the present, overhead train wires, enamel signs, wooden buildings, CRT monitors, rotary phones, warm incandescent light`
- **C（崩壊・無人）**：`abandoned, overgrown with vines, collapsed, no people, pale teal sky, faint cyan glowing cracks, dust motes`

## 場面（id は manifest の `scene.<場面>.<世界>`）

### center_office 観測センター月代分室・事務室
- A：夜の事務室。上中央に札「特殊現象観測センター 月代分室」。左に窓（夜の町と月）、ホワイトボード「2:17 通信障害 約1分／映像・音声のみ ※停電なし」、壁時計（TSUKUYO・2:17）、職員写真5枚、カレンダー「令和八年 10月」、標語ポスター「情報セキュリティ強化月間」、ドア、ウォーターサーバー。奥に机2つ（液晶モニター2台・ビジネスフォン・ノートPC・湯気の出るマグ）、手前に自分の机のふち。`fluorescent office at night, whiteboard, wall clock, staff photo board, calendar`
- B：同じ配置で木の腰板、札「國立 月代觀測所」、黒板「本日ノ観測 異常ナシ 当番 御堂」、振り子時計（明光舎）、職員写真**6枚**（右下に白髪の知らない人物）、カレンダー「昭和百一年 十月」、ポスター「火の用心」、ブラウン管・黒電話・タイプライター・灰皿、石油ストーブ。**窓の外に架線と青い信号**。`showa office, wood paneling, pendulum clock, typewriter, kerosene stove`
- C：天井板が落ち、窓ガラスが割れてツタ、時計は 4:44 で止まる、書類が散乱、床にシアンの光。

### center_server サーバー室
- A：一点透視の通路、両側に黒いラック（緑と青のLED）、奥に端末、札「サーバー室」、左のラックに札「RACK-04」、右に貼り紙「点検中」。
- B：両側にテープ記憶装置（回る円盤）、奥に「電算室」のアンバー文字の端末、札「第四號機」。
- C：電気が落ち、右のラックに赤いランプだけが4回ずつ点滅、床に水たまり。

### center_lab 観測装置室
- A：中央上に大型液晶（波形）、手前にリング状の観測装置、左に補助モニター、右に計測ユニット、手前に操作卓。
- B：大型液晶の代わりにブラウン管12台の壁、オシロスコープ、オープンリールの録音機。
- C：大モニターは割れ、リングの一部が欠けて火花。
- 差分 `flags.feed`：モニターに乱れた配信映像（暗い部屋・紫の光・逆光の男性の後ろ姿）。

### center_basement 地下通路
- A：配管の天井、黄黒の警告帯、中央に重い両開き扉（札「第二観測室」）、右に電子錠（赤ランプ）、左寄りに分電盤、右上に非常口の灯り。
- B：停電で真っ暗、非常灯だけ、扉が少し開いている、分電盤の蓋が開きレバーが下がっている。
- C：左の壁が崩れて穴（奥がシアンに光る）、扉は歪んでいる。

### shotengai 月代商店街
- A：アーケード、入口の看板「月代商店街」。左から「コインランドリー」（白い光と洗濯機）、「やまだ精肉店」（シャッター・閉店のあいさつの貼り紙）、「月代書店」（本棚・年配の女性店主）、「テナント募集」。中央手前に自販機、柱にポスター「月代夏祭り 8.15」、足元にねこ。
- B：「月代銀座」。「月代湯」（のれん「ゆ」）、「三ツ星食堂」（のれん「めし」、赤ちょうちん、品書き「本日 ライスカレー」、客の背中）、「月代貸本」（白髪の老人）、「たばこ」（ピンク電話）。中央手前に丸型ポスト、吊り案内「月代駅 →」、ポスター「月代劇場 月の汽車 上映中」、買い物かごの女性と子供。
- C：アーケードの屋根が崩れ、ツタ、看板は欠けて「月代商店」、明かりはひとつだけ点滅。

### school 月代小学校
- A：鉄筋三階建て、中央の時計（2:17）、垂れ幕「祝 創立五十周年」、宿直室の窓だけ明かり、門柱の表札「月代町立月代小学校」、自転車、看板「不審者に注意」。
- B：木造二階建て・瓦屋根・破風の時計、垂れ幕「祝 創立百周年」、表札「月代町立月代小學校」（旧字）、本を読む子供の銅像。
- C：屋根が崩れ窓が割れ、時計の針がない、校庭は草。

### shrine 月代神社
- A：石段の上に朱の鳥居（額「月代」）、社殿の幕に三日月の紋、消えた石灯籠、狛犬、絵馬掛け、左に御神木としめ縄。
- B：石の鳥居（額「月見」）、紋は八本の輻の車輪、灯籠に火、赤い前掛けの狐像、おみくじ結び。
- C：鳥居が倒れ、社殿の屋根が落ち、シアンの光の粒。

### tunnel 廃トンネル（月代隧道）
- A：山肌のれんがの坑門、扁額「月代隧道」、坑口に柵と「立入禁止」、壁にかすれた落書き「ナギ」、銘板「この先 通行止め 月代町」。
- B：坑口へ線路が入っていく、中に灯り、青信号、銘板「月代線 第三隧道 延長 418m」。
- C：左半分が崩れ、奥がシアンに光る。

### mountain_road 山道（地図にない道）
- A：森の中のカーブ、ガードレール、カーブミラー、標識「月代峠 1.5km」、右へ草に埋もれた脇道（かすかにシアン）。
- B：脇道が舗装され街灯とバス停「月代駅前」、標識に「月代駅 3km」。
- C：倒木が道をふさぎ、ミラーが割れている、霧。

### station_ruin 月代駅（廃墟）
- A：ホームと上屋、ツタ、欠けた駅名標「つき ろ」（← さな／みず →）、止まった時計 2:44、はがれた時刻表、朽ちた広告板、ベンチ、左に待合室、手前に錆びた線路と草。
- B：手入れされた夜の無人駅：駅名標「つきしろ／月代／← ささなみ　みずはら →」、時計 2:17、時刻表「終電 0:44」、広告「月代の名水」。
- C：上屋が崩れ、草に埋もれ、シアンの霧。

### station_live 月代駅（営業中）
- A：同じ構図で明るいホーム、奥にクリームと臙脂の列車（窓に乗客の影）、ホームに乗客8人と駅員（制帽・旗）。右の広告板は配信サービス「よるのまど」（配信者の写真5枚。**5枚目だけノイズで顔が見えない**）。
- B：列車がクリームと緑「急行」。
- 大写し（`adCloseup`、manifest には無い。差し替える場合は別画像を用意して相談）：広告の正面。「よるのまど 深夜ライブ配信サービス」、写真4枚（ほしのこ・くろがね・みなも・ユキチ：架空の配信者）と、ノイズの5枚目（奥に紫の髪と小さなピンクの帽子の気配だけ）、名札「だんのうら」。

### residential 住宅街
- A：三軒の家と電柱・電線・街灯。中央の家は暗く「売家」の札、右の家の庭に茶色の柴犬と犬小屋、左の家の前に自販機の台の跡（ボルト穴）。
- B：中央の家に明かりと表札「水原」、犬は白黒のぶち、左の家の前に知らない銘柄「ツキミ」の自販機、奥に火の見やぐら、買い物帰りの女性。
- C：屋根が崩れ、電線が垂れ、ツタ。

### riverbank 河川敷（崩れた橋）
- A：川と月の映り込み、中央が落ちたコンクリート橋、看板「あぶない 川に入らない 月代町」、古いボート、葦。
- B：鉄橋を列車が渡る、看板「月代川 遊泳禁止 月代村」、夜釣りの男性とランタン、対岸の煙突。
- C：川が干上がり、ひび割れた川底にシアンの水たまり、橋の残骸。

### old_lab 旧研究施設（月代第二研究所）
- A：暗いホール、高窓の月光、中央の円筒の観測槽（割れている）、右に黒板（かすれた数式と T=30）、左の机に古い端末と三人家族の写真立て、書類棚。
- B：稼働中：観測槽がシアンに光る、札「月代第二研究所 九条研究室」、黒板「観測周期 T=30／固定観測者 1」、白衣の研究員2人。
- C：観測槽が砕け、床のひびがシアンに光る、ツタ。

### empty_town 誰もいない月代町
- A：明け方前の青い大通り（一点透視）、信号は黄色の点滅、街の時計 2:17、バス停、看板「月代信用金庫」「月代本通り」、道に赤い傘。人はひとりもいない。
- B：同じ通りに架線、看板「月代銀行」「月代駅前通り」、夕焼けのような色。
- C：白く色の抜けた空、看板は白紙、地平に白い塔。

### bureau 境界現象対策局・記録保管室
- A：白い未来的な保管室、左右に記録シリンダーの棚、札「境界現象対策局 第三記録保管室」、中央に端末（ARCHIVE）、右に表示板。
- C：電源が落ちた同じ部屋。

### stream_room 境界の向こうの配信部屋（A のみ）
`dark bedroom streaming setup at night, seen from behind, a man sitting at the desk facing two monitors, long purple hair in a ponytail, tiny pink top hat, pink flower hair ornament, black square glasses only visible as temple arms, lavender jacket, backlit by monitor glow, face never visible, microphone on a boom arm, child's crayon drawing taped on the wall, slight video noise and scanlines`
- 壁に子供のクレヨン画（紫の髪の大人と小さな子・家・太陽）。左に本棚、右にカーテン。
- 差分（manifest は A のみ。差分は今はコードで描く）：振り返り（顔は逆光で真っ暗・めがねの反射だけ）／success（背すじが伸び暖かい灯り）／study（資格証8枚・参考書の山）／stream（リングライトと巨大な視聴者数）／collapse（誰もいない・椅子が押されている）。

### factory_glimpse 工場（一瞬の幻）
`industrial maintenance room, pipes, red valves, pressure gauges, pegboard with tools, large pump and motor, work lamp, a man in a navy work uniform and cap repairing the machine seen from behind, purple ponytail coming out of the cap, sparks, steam, edges dissolving into cyan noise`

### collapse／core／town_map／board_bg
- collapse：`shattered reality, radial shards each showing a different place: abandoned station, futuristic archive, wooden school, open sea, floating sky city, factory; a dark rift in the center with cyan edges`
- core：`abstract boundary core, glowing cyan-white sphere, broken orbital rings, floating shards, deep void`
- town_map：`illustrated night map of a small japanese town, mountains at the top, a river from top right to bottom, roads, small landmark icons`（地点は `scenes.md` の MAP_AREAS の位置に。文字なしで生成し、地名はコードで重ねる運用を推奨＝town_map は差し替えない方が安全）
- board_bg：`dark navy terminal background with a fine cyan grid, corner brackets`

## 人物（`portrait.<who>.<表情>`、512×640・透明背景）
共通：`bust portrait, front three-quarter view, pixel art, crisp outline, transparent background, soft rim light from the upper left`
表情：normal（ふつう）/ smile（ほほえみ）/ worry（不安）/ surprise（驚き）/ serious（真剣）、九条だけ cold（冷たい）/ sad（哀しい）、シロは idle / alert / glow。

- **yuu 如月ユウ**：先輩観測員、20代後半〜30代。落ち着いた少し眠そうな目、片側に流した前髪の黒髪（耳が隠れる長さ）、キャメルのカジュアルなコートに黒いタートルネック、青いストラップの職員証。性別を強調しない。`calm senior field researcher, dark navy-black hair with side-swept bangs, camel casual coat, black turtleneck, ID badge lanyard`
- **mido 御堂**：室長、50歳前後。白髪まじりの短髪、疲れた目とくま、無精ひげ、茶色のカーディガンに水色のシャツとゆるい緑のネクタイ。`tired middle-aged branch chief, graying short hair, eye bags, stubble, brown cardigan over light blue shirt, loose tie`
- **nagi ナギ**：10歳くらいの少女。黒いおかっぱ、赤い髪留め、丸えりの白いブラウスに紺のジャンパースカート（少しだけ時代が古い）。`girl about 10, black bob with straight bangs, red hair clip, peter pan collar blouse, navy pinafore dress, slightly old-fashioned`
- **kujo 九条シン**：40歳前後。やせて頬がこけ、端正で不気味なほど静か。後ろへ流した長めの黒髪に白い筋、高いえりの黒い外套、えり元に暗い赤、銀のピン。`gaunt elegant man around 40, slicked-back long black hair with a white streak, pale, heavy-lidded eyes, high-collared black coat, unsettling calm`
- **shiro シロ**：白い小さな生き物。ぼやけた輪郭が形の間で揺れる、黒い二つの目、耳のような突起が出たり消えたり。glow はシアンに光る。`small white creature, soft blurry wavering outline, two dark eyes, faint cyan glow`
- **resident_a**：商店の主人（50代女性、パーマ、紺のエプロン）／**resident_b**：年配の男性（はげ頭・白い横髪・太い白い眉・ベスト）／**resident_c**：学生（学ラン・短い黒髪）／**resident_d**：母親（30代・低く結んだ茶髪・明るいセーター）／**resident_e**：駅員（制帽・紺の制服・口ひげ）／**resident_f**：子供（黄色い通学帽・青い服）。
- **player**：差し替え不要（顔のない人影＋シアンに光る職員証）。

## アイコン（`icon.<name>`、64×64）
`flat pixel art UI icon, 16x16 grid upscaled, dark outline, light glyph with cyan accents, transparent background`。名前の一覧は `scenes.md` の「使い方」を参照。
