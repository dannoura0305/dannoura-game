# 『境界事象 ― 月代町観測記録 ―』 実装の取り決め（モジュール間契約）

ユーザー提供の企画書（ストーリー原案 `docs/kyokai/story-outline.md`）と開発指示書（`docs/kyokai/game-design.md`）が正。本書はそれを実装するための**内部契約**。全担当はこれに従う。

## 決定事項（ユーザー回答）
- ジャンル：探索サスペンスADV＋推理＋並行世界切替パズル＋軽いサバイバル探索＋本編連動メタミステリー（指示書どおり）
- 範囲：全章（プロローグ〜最終章、END A/B/C/TRUE、スタッフロール後、本編側 DAY 31）を一度に作る
- 解放：最初から遊べる（本編タイトルの「おまけ」から）
- 主人公：最初に名前を入力（空欄なら既定の「朝霧」。姓のみ・性別が分からない名前）。**性別は伏せる**。一人称は「私」、口調は丁寧〜中立。地の文・他人の呼び方も性別が出ない書き方（「新人」「〇〇さん」）。指示書の「俺はこんな部署にいたか？」は「私は、こんな部署にいた……？」に置き換える。
- だんのうらは**男性**（オネェ言葉・富山弁が少し・シングルファーザー・設備保全・深夜配信）。境界事象側からは「名前も知らない深夜配信の男性」。登場は全体の5〜10%、忘れた頃に。主人公と長く会話しない。

## ファイル構成（独立ページ）
```
kyokai.html                 おまけゲームの入口（本編と同じオリジン。localStorage を読める）
kyokai/style.css            観測端末風UI
kyokai/engine.js            状態・セーブ・シーン進行DSL・UI（会話・選択・入力）・効果・音（担当A）
kyokai/systems.js           探索（地図・場所・調べる/撮影/録音/スキャン/聞き込み）・世界切替・危険度・存在安定度・装備/消耗品・シロ同期（担当A）
kyokai/board.js             観測ボード（証拠配置・線で結ぶ・仮説）・調査手帳・違和感探し（担当A）
kyokai/art.js               場面イラスト・人物の顔・シロ・UIアイコン（コード描画＋生成画像の受け口）（担当B）
kyokai/link.js              本編データの読み取り（読むだけ）（担当D）
kyokai/data/evidence.js     証拠の定義（担当C/D が追記：章ごとのブロックに分けて衝突を避ける）
kyokai/story/ch00.js … ch06.js, side.js   プロローグ〜第六章・任意事件（担当C）
kyokai/story/ch07.js … ch14.js, endings.js  第七章〜最終章・ラストバトル・各END・スタッフロール後（担当D）
```
読み込み順（kyokai.html）：style.css → engine.js → systems.js → board.js → art.js → link.js → data/evidence.js → story/*.js（章番号順）→ 起動。
グローバルは `window.KY`（エンジン）、`window.KY_ART`、`window.KY_LINK`、`window.KY_STORY`（章の登録先）のみ。

## 本編側の変更（担当D）
- タイトルメニューに「おまけ：境界事象」→ `kyokai.html` へ（最初から表示）。
- `localStorage['kyokai_true_end']==='1'` かつ本編エンディングを1つ以上見ている（`dannoura_endings`）とき、タイトルに **DAY 31** が出る。選ぶと本編の部屋の短いイベント（指示書 §34）。本編のセーブは一切書き換えない。
- `sw.js`：kyokai は実行時キャッシュ（必要なら precache しない）。本編の起動を重くしない。

## 本編データの読み取り（KY_LINK、読むだけ・壊さない）
- `KY_LINK.hasMain()`：本編のセーブかエンディング記録があるか。
- `KY_LINK.endings()`：`dannoura_endings` から見たエンディングの種類（collapse/bankrupt/flame/debtfree/engineer/father/king/rebirth/normal）。
- `KY_LINK.best()`：いちばん新しいセーブ（`dannoura_save_slot1..3` と旧 `dannoura_save_v1`）から {day, streamCount, certKnow, jobRep, mental, fatigue, followers, anomalyCount, childStress, endingReached, skills} を返す（無ければ null）。
- `KY_LINK.b30()`：上から B-30 観測記録の差分を決める：{study:bool, stream:bool, factory:bool, unwell:bool, good:bool, bad:bool, ending:type|null}。指示書 §18。
- `KY_LINK.cleared()`：本編エンディングを1つ以上見たか（TRUE END 条件・DAY 31 用）。

## セーブ
- `localStorage['kyokai_save_v1']`：{version:1, name, chapter, scene, flags:{}, evidence:[ids], board:{}, notebook:{}, items:{}, equip:[], sync:0-5, stability:0-100, world, areas:{unlocked:[], visited:[]}, endings:[], playtime}。オートセーブ（章の区切り・場所移動時）と手動セーブ1枠。
- `localStorage['kyokai_true_end']='1'`（TRUE END 到達）、`kyokai_endings`（見たEND一覧）。

## エンジンDSL（`KY`）——章スクリプトはこれだけで書く
章は `KY_STORY.register('ch01', async K => {...})`。`K` は KY。進行はエンジンが `KY_STORY` を章順に呼ぶ（章の途中から再開できるよう、章内は `K.step('id', async()=>{...})` で区切ると、セーブ再開時に済んだ step を飛ばす）。

会話・演出
- `await K.say(lines)`：lines は文字列の配列。接頭辞で話者：`n:` 地の文 / `p:` 主人公 / `y:` 如月ユウ / `m:` 御堂 / `g:` ナギ / `k:` 九条シン / `s:` シロ（鳴き声や気配） / `d:` 深夜配信の男性（表示名は文脈で「画面の男性」など。本名は出さない） / `c:名前|本文` 配信・ログのコメント / `t:` 端末表示（等幅） / `x:名前|本文` その他の人物（住民など）。`#` で始まる行は演出コマンド：`#scene 場所id [世界]`, `#fx glitch|noise|blackout|shake|flash|mainui|whiteout`, `#se whistle|static|clock|wire|steps|voice|beep|shutter|rec`, `#amb 名前|off`, `#wait ms`, `#face y happy`（顔の表情）。
- `await K.choice(問い, [{t:'文',v:'値',s:'補足'}])` → 値。
- `await K.input(問い, 既定, 最大長)` → 文字列（名前入力など。textContent で表示）。
- `K.flag(name, val?)` / `K.has(name)` / `K.inc(name, n)`。
- `await K.title(章タイトル, 副題)`：章扉。

証拠・手帳・推理
- 証拠は `KY.EVIDENCE[id] = {title, type:'photo'|'testimony'|'audio'|'map'|'video'|'log'|'item'|'person'|'article', desc, world:'A'|'B'|'C'|null, art:'場面id'|null, ch:章番号}`（`kyokai/data/evidence.js` に章ごとのブロックで定義）。
- `K.gain(id)`：証拠を得る（「証拠を記録した」演出、重複しない）。`K.got(id)`。
- `K.note(cat, id, {title, text, solved?})`：手帳。cat は 'person'|'place'|'term'|'case'|'hypo'|'diff'|'creature'|'b30'|'444'。未解決は「？」表示。
- `await K.deduce(def)`：観測ボードを開いて推理させる。def = {id, q:'問い', options:[{id, text, need:[証拠id…], refute:[証拠id…]}], answer:'選択肢id', hint:{選択肢id:'その仮説だと「〇〇」が説明できない'}, link:2}。プレイヤーは仮説を1つ選び、根拠になる証拠を `link` 枚（既定2）ボードで結ぶ。正解は answer かつ need をすべて含む。誤りはゲームオーバーにせず、研究員の指摘（hint や「この証拠とつながらない」）を出して何度でもやり直し。正解時 true を返す。ボードには手持ちの証拠カードが並び、線で結んだ跡は保存される。
- `await K.spot(def)`：違和感探し。def = {id, a:'場面id', b:'場面id', aw:'A', bw:'B', spots:[{x,y,r,label}], need:n}（座標は 0..1 の比率）。全部（または need 個）見つけたら終わり。外れはペナルティなしで「違う」とだけ。

探索
- 場所は `KY.AREAS[id] = {name, map:{x,y}, danger:{A:0..5,B:..,C:..}, worlds:{A:{scene:'場面id', spots:[{id,x,y,w,h,label,acts:['look','photo','record','scan','talk'], cond?:K=>bool, on:{look:async K=>{}, photo:..., …}}]}, B:{…}, C:{…}}, cond?:K=>bool}`（座標は場面に対する 0..1）。章ファイル内で定義してよい（同じ id を二重定義しない。場所は担当Cが基本形を定義し、担当Dは `KY.extendArea(id, world, spots)` で後半の調べ物を足す）。
- `K.unlock(areaId)`／`K.lockArea(areaId)`。
- `await K.explore({goal:K=>bool, hint:'目的の短い文', areas?:[id…]})`：月代町の地図から自由に場所を選んで調べる。goal が true になったら戻る。地図・観測ボード・手帳・持ち物・セーブはいつでも開ける。
- アクション：調べる／撮影（写真を証拠に。演出：シャッター）／録音／スキャン（数値と波形を表示）／聞き込み（人物スポット）。その場所に `on[act]` が無ければ汎用の一言（「特に何も写らない」等）。
- 世界：`K.world`（'A' 通常 / 'B' 別の歴史 / 'C' 崩壊・無人）。`K.setWorld(w)`。シロ同期Lv2以上で、場所に複数の世界があるときだけ画面の「境界観測」ボタンで切替可能（Lv2：見るだけ＝調べる・撮影のみ、Lv3：短時間切替で行動も可、Lv4：物品を持ち込める `K.carry(item)`、Lv5：主人公ごと移動）。切替演出は派手にせず、一瞬のズレ・看板の文字が変わる・人が消える程度。
- `K.sync(n)`：シロ同期Lv を上げる。
- 危険度：場所×世界ごと。危険度に応じて、行動ごとに存在安定度が下がる（0:0, 1:-0.5, 2:-1, 3:-2, 4:-3, 5:-5）。`K.stab(n)` で直接増減。安定度 70/50/30/10 を下回ると演出（職員証の所属表記が変わる、NPC の呼び方が変わる、持ち物の名前がずれる、手帳の過去の記述が一部変わる、地図の地名が変わる）。0 でも死なない：強制的に研究所へ戻され「誰かに呼ばれた気がした」→ 安定度30に回復、フラグ `slipped` 加算（END B の条件に使う）。
- 消耗品：`K.item(id, n)`（battery 携帯端末電力, light 懐中電灯, med 医療用品, stab 境界安定剤）。境界世界の探索で電力が減る（行動1回=1）。0 だとスキャン・撮影不可。安定剤で安定度+25。研究所で補充できる。軽め。
- 装備：`K.equip(id)`：phone, flashlight, magnet（初期）→ boundary_meter, hq_recorder, wave_scanner（中盤）→ portable_observer, anchor（存在固定装置）, shiro_link（後半）。装備で使えるアクションや表示が増える（例：wave_scanner でスキャン結果に境界反応が出る）。
- 逃げる・隠れる：`await K.chase(def)`：境界生物から逃げる短い場面（選択と時間で、隠れる/走る/道具で追い払う）。失敗しても安定度が減るだけで続く。

効果・音
- `K.fx(name)`、`K.se(name)`、`K.amb(name)`（環境音：clock, wire, whistle_far, radio, steps, voices, rain, station, factory, room）——すべて WebAudio で合成（音声ファイル不要）。月代駅の汽笛は最重要の音。
- `K.mainUI(ms)`：本編のステータス表示（体力・疲労・精神・残り日数）が右上に一瞬出て消える演出（§40）。
- `K.ending(id)`：'A'|'B'|'C'|'TRUE'。到達記録・タイトルへ。TRUE はスタッフロール→ポストクレジット。

## 場面ID（担当Bが描く・各世界の差分つき）
`center_office`（観測センター月代分室：机・端末・窓・職員写真・時計）、`center_server`（サーバー室）、`center_lab`（観測装置室：大きなモニター）、`center_basement`（地下）、`shotengai`（月代商店街）、`school`（月代小学校）、`shrine`（神社）、`tunnel`（廃トンネル）、`mountain_road`（山道・地図にない道）、`station_ruin`（廃墟の月代駅）、`station_live`（営業中の月代駅：乗客・駅員・列車・広告）、`residential`（住宅街）、`riverbank`（河川敷・崩れた橋）、`old_lab`（旧研究施設）、`empty_town`（誰もいない月代町）、`bureau`（境界現象対策局・未来の施設）、`stream_room`（暗い部屋・机・モニター・マイク：境界の向こうの配信部屋。人物は顔が見えない・後ろ姿）、`factory_glimpse`（工場・配管・工具：一瞬の幻）、`collapse`（最終章：混ざり合う世界）、`core`（境界核）、`town_map`（町の地図）、`board_bg`（観測ボード背景）。
世界 'A' 通常／'B' 別の歴史（看板・年代・技術・店が違う）／'C' 崩壊・無人。必要な場面だけでよいが、探索用の場所（上記の町の場所とセンター内）は A と B は必須、C は中盤以降に入る場所に。
人物の顔：`yuu`（如月ユウ：先輩観測員）、`mido`（御堂：室長・中年）、`nagi`（ナギ：存在しない少女）、`kujo`（九条シン）、`shiro`（境界生物：白い小さな生き物・輪郭が揺らぐ）、`resident_*`（住民数名）、主人公は顔を出さない（シルエットのみ）。だんのうらは**後ろ姿・逆光・ノイズ越し**のみ（紫の髪・小さなシルクハット・めがねが分かる程度）。

## 文体・トーン
- 怖さは違和感中心。ジャンプスケア連発しない。汽笛・時計・電線・ラジオノイズ。
- 本編ネタ（444、後ろ、未来コメント、30、固定視聴者1、資格・工場・歌・子供の声）は**早く出しすぎない**。最初は気づかれない程度に、後半ほど強く。
- 本編未プレイでも一本の作品として成立させる。
- 推理には必ず手がかりを先に置く（後出しで解かない）。怪異の一部（USER_444の正体）は最後まで説明しない。
