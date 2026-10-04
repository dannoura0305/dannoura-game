# 家・庭づくりと物語の連動 — フェーズ1 実装設計（モジュール間の取り決め）

元仕様：ユーザー提供「だんのうら育成ゲーム 暮らし・物語・ビジュアル拡張 設計仕様書」。本書はフェーズ1を実装するための**内部契約**。

## 現行コードの接続点（調査結果）
- 状態 `gs`（game.js 283行, トップレベル `const`。window には無いが同じスクリプト空間から参照可）。
- 保存 `gsToSaveData()` は `gs` を浅くコピー → `gs.homeData` はそのまま JSON 化される。
  `saveDataToGs()` は「保存データに無い `/Data$/` キーを gs から削除」→ 旧セーブ読込時に前の家が残らない。
- 日送り `nextDay()`（毎晩22:00開始）、時間 `advTime(min)`、メニュー `loadScene('main')` の行動リスト（game.js 471行付近に `🎮 夜のミニゲーム`）。
- エンディング `triggerEnding(forced)` → 本文 `E[type].body` → `main/presentation.js` の `startEnding(info)` が演出。
- 新規ゲームは `startStory()`（ページ読込直後の gs 初期値から開始）。
- RPG `minigames/rpg.js`：章フラグは `run.f.ch2_share` / `ch2_alone` など、記録は `gs.rpg`。第2章「手の灯／海底の工場」の主題は「直す」「手伝ってもらう」。
- バランス検証 `tools/simulator.html`（iframe で index.html を読み、main/* の演出は `frameElement` で自分を止める）。

## ファイル構成（新規）
読み込み順（index.html、`main/presentation.js` の後）：
```
main/home/catalog.js      アイテム・素材・レシピ定義（HOME.CATALOG, HOME.MATERIALS, HOME.RECIPES, HOME.BAL）
main/home/sprites.js      ドット絵の描画（HOME_ART）※コードで描く独自素材
main/home/state.js        gs.homeData の初期化・検証・移行、所持/素材/植物/報酬API
main/home/placement.js    占有計算・衝突・出口到達・使用位置判定（純ロジック）
main/home/crafting.js     クラフト（素材消費と完成品追加を1操作で）
main/home/renderer.js     見下ろし2Dグリッド描画、スナップショット画像
main/home/editor.js       模様替えモード（選択・プレビュー・回転・収納・取り消し/やり直し・確定/破棄）
main/home/interactions.js 暮らしモード（調べる・使う・娘と話す）、画面の開閉、会話UI
main/home/events.js       暮らしのイベント（窓辺の小さな約束）
main/memories.js          思い出帳（記録・表示）
main/integrations.js      本編・RPG・エンディングとの接続（関数ラップ）
style-home.css            家・庭画面のスタイル
tests/*.test.mjs          node で動くロジックテスト（`node tests/run.mjs`）
```
全ファイルは IIFE で、公開するのは `window.HOME`（名前空間）と `window.HOME_ART` のみ。他のグローバルを増やさない。
シミュレーター内（`window.frameElement && /simulator/.test(parent.location.pathname)`）では UI を出さない（ロジックは動いてよい）。

## アイテムID（フェーズ1・20種）
| id | 名前 | size(w×h) | 回転 | layer | solid | area | 使う |
|---|---|---|---|---|---|---|---|
| furniture.desk_small | 小さな木の机 | 2×1 | 0,90 | furniture | ○ | room | 前のマスで「作業」 |
| furniture.wood_chair | 木の椅子 | 1×1 | 0,90,180,270 | furniture | ○ | room,garden | 座る（向きの正面から） |
| furniture.repaired_shelf | 修理した棚 | 2×1 | 0,90,180,270 | furniture | ○ | room | 調べる |
| furniture.bookshelf | 本棚 | 2×1 | 0,90,180,270 | furniture | ○ | room | 本を読む |
| furniture.futon | 布団 | 2×3 | 0,90 | furniture | ○ | room | 寝かしつけ（横のマス） |
| furniture.cushion | クッション | 1×1 | 0 | furniture | × | room,garden | 座る（上に乗る） |
| furniture.low_table | 低い食卓 | 2×2 | 0,90 | furniture | ○ | room | 一緒に食べる |
| light.desk_lamp | 卓上ランプ | 1×1 | 0 | furniture | ○ | room | 灯りを点ける/消す |
| light.shell_lantern | 貝殻ランタン | 1×1 | 0 | furniture | ○ | room,garden | 灯りを点ける/消す |
| memento.child_drawing | 娘の絵の額 | 1×1 | 0 | wall | × | room（y=0の列のみ・壁に掛ける） | 眺める |
| memento.bear | クマのぬいぐるみ（娘のクマ） | 1×1 | 0 | furniture | × | room | 置くと娘の手からクマが消え、置いた場所に座る |
| memento.flower_tag | 花の名札 | 1×1 | 0 | furniture | × | garden,room | 名前を読む |
| garden.pot | 鉢植え | 1×1 | 0 | furniture | ○ | garden,room | 植物（plants[instanceId]）。variant=鉢の色 red/blue/yellow |
| garden.flowerbed | 花壇 | 2×1 | 0,90 | furniture | ○ | garden | 眺める |
| garden.bench | 木のベンチ | 2×1 | 0,90,180,270 | furniture | ○ | garden | 座る |
| garden.fence | 木の柵 | 1×1 | 0,90 | furniture | ○ | garden | — |
| garden.stepping_stone | 飛び石 | 1×1 | 0 | path | × | garden | — |
| garden.small_tree | 小さな木 | 1×1 | 0 | furniture | ○ | garden | 眺める |
| deco.rug | ラグ | 3×2 | 0,90 | rug | × | room | — |
| deco.sea_glass | 漂着ガラスの飾り | 1×1 | 0 | furniture | ○ | room,garden | 眺める |

床・地面：`floor.wood`（部屋）、`ground.grass`（庭）。素材：`wood` 木材、`cloth` 布、`metal` 金具、`sea` 海のかけら。

### レイヤーと重なり
- `rug` と `path` は同じレイヤー同士は重ならない。上に `furniture` を置ける。
- `furniture` 同士は重ならない（solid/非solidとも）。
- `wall` は部屋の y=0 の列にだけ置け、床の通行を妨げない。壁レイヤー同士は重ならない。

### 回転
`rotation` は 0/90/180/270。90/270 のとき占有は h×w（幅と高さを入れ替える）。占有の原点は左上 (x,y)。
向き：0=下向き（正面がy+）、90=左、180=上、270=右。「使う位置」は正面の隣接マス（椅子・ベンチ・机・本棚）、布団は長辺の横、クッション/飛び石は自身のマス。

### 出入口と到達
- 部屋：12×8、出入口 `door {x:6,y:7}`、出現位置も同じ。出入口のマスは常に空ける。
- 庭：16×12、家の戸口 `door {x:7,y:0}`、門 `gate {x:0,y:6}`。両方を空け、互いに到達可能であること。
- 到達判定：solid でない（＝furniture solid が無い）マスを4近傍BFS。部屋は door から部屋の空きマスへ、庭は door→gate。
- 配置確定時に「出入口がふさがる／到達できない」なら置けない（理由を表示）。

## 状態 `gs.homeData`（version 1）
```js
{ version:1,
  inventory:{ [itemId]: { [variant]: count } },   // 所持総数（配置中を含む）
  materials:{ wood:0, cloth:0, metal:0, sea:0 },
  unlockedRecipes:[recipeId],
  room:{ width:12, height:8, floorId:'floor.wood', placements:[P] },
  garden:{ width:16, height:12, groundId:'ground.grass', placements:[P] },
  plants:{ [potInstanceId]: { name, color, stage:0..4, growth:0, plantedDay, lastWateredDay } },
  events:{ [eventId]: {...} },        // events.js が管理
  memories:[ M ],                      // memories.js が管理
  appliedRewards:{ [rewardId]: day },  // 一度きりの報酬
  flags:{ repairedShelf:false, ... },
  seq: 1 }                             // instanceId 採番
P = { instanceId:'p12', itemId, x, y, rotation, variant, layer }
M = { id, day, who:['dan','kid'], what, items:[itemId], text, snapshot:null | {area, placements:[P], plants:{...}} }
```
初期所持（新規・旧セーブとも、homeData 初回生成時）：
- 部屋に配置済み：布団、低い食卓、小さな木の机、木の椅子、卓上ランプ、本棚、ラグ、クマのぬいぐるみ
- 庭に配置済み：小さな木×1、木の柵×6、飛び石×4
- 収納：木の椅子×1、クッション×2、木のベンチ×1、飛び石×2
- 素材：wood 4, cloth 2, metal 2, sea 0
- レシピ解放：repaired_shelf, cushion, flowerbed, fence, sea_glass（shell_lantern は RPG 第2章クリアで解放）

## 公開API（`window.HOME`）
state.js
- `HOME.ensure()` → homeData（無ければ初期化、壊れていれば修復）。**読込直後にも呼ぶ**（integrations が saveDataToGs をラップ）。
- `HOME.owned(itemId, variant?)` / `HOME.placedCount(itemId, variant?)` / `HOME.stored(itemId, variant?)`
- `HOME.addItem(itemId, n=1, variant='default')`、`HOME.addMaterial(id, n)`、`HOME.unlockRecipe(id)`、`HOME.hasRecipe(id)`
- `HOME.grantOnce(rewardId, fn)` → 未付与なら fn() を実行し記録して true、付与済みなら false。
- `HOME.plant(potInstanceId, {name, color})`、`HOME.water(potInstanceId)`、`HOME.tickDay()`（1日分の成長。水やりから2日以内なら成長、枯れない）
- `HOME.save()` → saveGame(true) の成否を返す（失敗時に成功通知を出さない）
- `HOME.on(evt, fn)`／`HOME.emit(evt, data)`：'change' 'placed' 'stored' 'crafted' 'open' 'close' 'interact'
placement.js（純ロジック・DOM非依存）
- `HOME.footprint(itemId, rotation)` → {w,h}
- `HOME.canPlace(area, placements, cand, opts)` → {ok, reason, cells}（reason は日本語、色以外で伝える文に使う）
- `HOME.reachable(area, placements)` → {ok, reason}
- `HOME.useCell(area, placements, P)` → {x,y}|null と `HOME.canUse(area, placements, P)` → {ok, reason}
crafting.js
- `HOME.craft(recipeId)` → {ok, reason}（素材消費＋完成品追加は1操作、二重実行防止）
renderer.js
- `HOME.renderArea(ctx, area, opts)`、`HOME.snapshot(area, {placements?, plants?, scale?})` → HTMLCanvasElement
interactions.js（画面）
- `HOME.open(area='room')`、`HOME.close()`、`HOME.isOpen()`
- 会話UI：`HOME.ui.say(lines)` → Promise（lines: [{who:'dan'|'kid'|'', face, text}]）
- `HOME.ui.choice(prompt, options[{t,s}])` → Promise<index>
- `HOME.ui.prompt(label, defaultText, maxLen)` → Promise<string|null>（textContent で表示、HTML解釈しない）
- `HOME.ui.toast(text)`
- フック（events.js / integrations.js が登録）：`HOME.hooks.onOpen(area)`、`HOME.hooks.talkKid()`、`HOME.hooks.useItem(P)` → Promise<boolean handled>
events.js：`HOME.events.state(id)`、`HOME.events.tick()`（日送り時）
memories.js：`HOME.memories.add(M)`（id重複は追加しない）、`HOME.memories.list()`、`HOME.memories.openBook()`

## HOME_ART（sprites.js）
- タイル32px。`HOME_ART.drawTile(ctx, tileId, px, py, T, gx, gy)`、`HOME_ART.drawWall(ctx, px, py, w, h, T)`
- `HOME_ART.drawItem(ctx, itemId, {rotation, variant, px, py, T, t, plant, lit, ghost})`：占有範囲（回転後）の左上 px,py に描く。`plant`={stage,color} は鉢に植物を重ねる。`ghost`=プレビュー半透明。
- `HOME_ART.drawChar(ctx, who:'dan'|'kid', dir:'down'|'up'|'left'|'right', frame, px, py, T, pose:'stand'|'walk'|'sit')`
- `HOME_ART.icon(itemId, variant)` → 48×48 canvas、`HOME_ART.uiIcon(name)` → 32×32 canvas（place, rotate, store, undo, redo, craft, memories, close, edit, room, garden, water, talk）
- 未定義IDでも例外を出さず「？」の箱を描く。

## 時間・バランス（`HOME.BAL`、catalog.js）
- 模様替え（移動・回転・収納・配置）：時間・資源の消費なし。
- クラフト：30分（advTime）、疲労+2。家・庭画面で行う。
- 家で過ごす効果（娘と話す・花の水やり等）：精神+は1日あたり上限 `HOME.BAL.dailyMentalCap=4`、家具数に比例しない。
- 素材入手：工場の仕事（許可された端材）wood/metal 少量、子育て行動 cloth 少量、RPG 章クリア・釣り sea 少量（integrations）。

## 物語：窓辺の小さな約束（events.js）
1. 開始：5日目以降に家を開くと娘が「おはなをそだてたい」。受諾は任意、断っても後日また話せる。
2. 一緒に植える：鉢の色（red/blue/yellow）と置き場所（庭か部屋の窓辺）を選び、花に名前（最大8文字、空欄なら「ひなた」）。鉢を配置、plants 登録。
3. 名札：植えて3日後以降に家を開くと娘が名札をくれる（memento.flower_tag 付与、会話変化）。
4. 育つ：ゲーム内日数で成長（水やりで進む、枯れない、責めない）。
5. 振り返り：開始から一定以上（stage≥3 かつ 23日目以降）で娘が理由を話す：「パパが帰ってきたとき、見えるところにしたかったの」。
6. エンディング：良い結末で庭/部屋のスナップショット（花が配置中→現在地、収納中→思い出の snapshot、未参加→何もしない）。
各ステップは思い出 M を記録。進行は日付と行動の両条件。本編終了後も続けられる（フェーズ2の暮らしモード用に状態を保持）。

## RPG連動（integrations.js）
- 現実で棚を修理（repaired_shelf をクラフト）→ `homeData.flags.repairedShelf`。RPG 第2章の工場に短い専用会話＋小さな任意報酬（本筋の条件にしない）。
- RPG 第2章クリア → `shell_lantern` レシピ解放（夢で得た「発想」として、現実の材料で作る）＋思い出。
- 報酬は `grantOnce` で重複防止。

## 第3章の約束の整合
本編（story.js）の約束は「発表会（おゆうぎかい）」。RPG 第3章は「えんそく」と「おゆうぎかい」が混在 → 「おゆうぎかい（発表会）」に統一する（約束の場面・途中の言及・回収を一緒に直す）。

---

# フェーズ2 追記（物語と暮らしの拡張）

対象：既存人物との生活イベント／家具・植物の追加／会話・人物行動の差分／思い出帳の拡張／RPG各章との連動／「選択＋その後の行動」による分岐／クリア後の暮らしモード。
フェーズ1の契約（ID・API・保存形式）は維持し、追加のみ行う。`gs.homeData.version` は 2 に上げ、v1 からは `HOME.ensure()` で自動移行（欠けた項目を足すだけ）。

## 追加ファイル（index.html では main/integrations.js の直前に、この順で読み込む）
```
main/home/bonds.js        「約束・行動・話し合い・頼る・休む」の記録と評価（HOME.bonds）
main/home/life_events.js  千代さん・班長などとの生活イベント（HOME.life_events）
main/home/lifemode.js     クリア後の暮らしモード（HOME.lifeMode）
```

## 追加アイテム（12種・catalog.js / sprites.js）
| id | 名前 | size | 回転 | layer | solid | area | 入手 |
|---|---|---|---|---|---|---|---|
| furniture.toy_box | おもちゃ箱 | 1×1 | 0 | furniture | ○ | room | 初期収納 |
| furniture.kid_desk | 娘の小さな机 | 1×1 | 0,90,180,270 | furniture | ○ | room | クラフト（木3） |
| furniture.old_radio | 千代さんの古いラジオ | 1×1 | 0 | furniture | ○ | room | 千代さんイベント |
| memento.toolbox | 班長の古い工具箱 | 1×1 | 0 | furniture | ○ | room,garden | 班長イベント |
| memento.recital_photo | 発表会の写真 | 1×1 | 0 | wall | × | room | 本編 27日の発表会に行けたら |
| deco.wind_chime | 風鈴 | 1×1 | 0 | wall | × | room | RPG第1章クリアでレシピ（金具1・海1） |
| deco.sea_mobile | 海のモビール | 1×1 | 0 | wall | × | room | RPG第4章クリアでレシピ（海2・布1） |
| garden.nameplate | 家の表札 | 1×1 | 0 | furniture | ○ | garden | RPG第5章クリアでレシピ（木1・金具1） |
| garden.clothesline | 物干し | 3×1 | 0,90 | furniture | ○ | garden | クラフト（木2・布1） |
| light.string_lights | 庭の豆電球 | 2×1 | 0,90 | furniture | × | garden | クラフト（金具2・海1） |
| garden.planter | プランター | 2×1 | 0,90 | furniture | ○ | garden | クラフト（木2）※植物を植えられる |
| garden.watering_can | じょうろ | 1×1 | 0 | furniture | × | garden,room | 初期収納 |

`wall` の扱いはフェーズ1と同じ（部屋の y=0 の列）。

## 植物の種類（plants に `species` を追加、既定 'seed'＝フェーズ1の花）
- `seed`（娘の花）／`morning_glory`（あさがお：千代さんの種）／`sunflower`（ひまわり）／`herb`（ハーブ：料理ミニゲームに少し関係しなくてよい）
- 鉢（garden.pot）とプランター（garden.planter）に植えられる。植える操作は暮らしモードで空の鉢・プランターを使う→所持している種を選ぶ。
- 種は `inventory` に `seed.morning_glory` などの消費アイテムとして持つ（配置不可、カタログでは `kind:'seed'`）。
- 成長段階 0..4 は共通、見た目は species ごとに描く（HOME_ART.drawItem の opts.plant に species を追加）。

## 訪問者（renderer / interactions）
- `HOME.setVisitor({who:'chiyo'|'hancho', area, x, y, dir})`／`HOME.clearVisitor()`：一時的な人物を画面に出す（保存しない）。
- タップで `HOME.hooks.talkVisitor(who)` → Promise<boolean>。
- HOME_ART.drawChar は 'chiyo'（銀髪のお団子・かんざし・金縁メガネ・えんじのカーディガン、腰が少し曲がる）と 'hancho'（黄色ヘルメット・紺の作業着）に対応。ポーズ stand/walk/sit。
- 'kid' に `pose:'sleep'`（布団で寝る）と `pose:'read'`、'dan' に `pose:'work'`（机で作業）を追加。

## 人物行動の差分（interactions）
- 娘は配置に応じて過ごし方が変わる：クッションに座る、本棚の前で絵本を読む、娘の机でお絵かき、おもちゃ箱で遊ぶ、鉢・プランターを眺める、ラジオの前に座る、モビールの下で見上げる。
- 23時以降（gs.hour>=23 または 0〜5時）は布団で寝ている（話すと「寝顔を見る」になり、起こさない）。布団が収納中なら、だんのうらが抱いて座っている扱いで代用。
- どの動きも「その家具が置かれていて使う位置が空いている」ときだけ。

## 生活イベント（life_events.js）
各イベントは任意・一度きり・保存/再読込で重複しない。日付と行動の両条件。思い出を記録。
- 千代さん（お隣・下関寄りの言葉）：①庭に出ると垣根越しにあいさつ、あさがおの種をおすそ分け ②後日、古いラジオをゆずってくれる（「夜が長いけえ」本編の設定と合わせる）③ベンチがあれば、娘と並んで座る場面
- 班長（関西弁のまま）：①工場の仕事を一定回数こなした後、休みの日に古い工具箱を持ってくる（棚を直していれば「ええ仕事や」）②頼る/頼らないの選択（物干しを一緒に立てる等）→ bonds の「頼る」
- 本編の約束（発表会）：行けたら `memento.recital_photo` を付与、行けなかったら後日娘と話し合う場面（bonds の「話し合い」）
- 既存の人物の口調・関係・設定は main/story.js を読んで合わせる。

## bonds（bonds.js）
`gs.homeData.bonds = { promises:[{id,day,kept:null|true|false,talked:false}], acted:{[key]:day}, askedHelp:n, rested:n, log:[...] }`
- 本編・RPG・家のイベントから記録する：約束した（story の promise_recital、RPG ch3_promise、花の受諾）／実際に行動した（花の世話、発表会に行った、修理）／守れなかったときに話し合った／助けを求めた（班長に頼る、RPG ch2_share、ミナモに頼る）／休息を選べた（休む行動・ch4_rest）
- `HOME.bonds.evaluate()` → {score, traits:['kept','talked','relied','rested','acted'], summary}
- 使い道：エンディングの「その後」に一言を足す・思い出帳の最後に「この30日」のまとめ。**結末の種類は変えない**。一つの選択を逃しても、別の行動で補える（例：約束を破っても話し合えば 'talked' が付く）。

## RPG各章との連動（integrations.js / rpg.js）
- 第1章クリア → 風鈴レシピ、第3章 → 約束の思い出（bonds）、第4章 → 海のモビールのレシピ、第5章 → 表札のレシピ。すべて grantOnce。
- 家の状態が RPG に返る小さな会話（任意・本筋に影響しない）：第1章でラジオを置いていれば、第4章でモビールを飾っていれば、第5章で表札があれば。

## 思い出帳（memories.js）
- 人物で絞り込み（娘・千代さん・班長・ミナモ・すべて）、日付順、スナップショットの拡大表示、「この30日」まとめページ（bonds.evaluate の summary）。

## クリア後の暮らしモード（lifemode.js）
- 良い結末・ふつうの結末の最終画面に「🏡 暮らしを続ける」。悪い結末には出さない。
- 状態 `gs.homeData.life = { active:false, day:0, startedFrom:endingType }`。元のクリア記録（エンディング一覧）は保持。
- 暮らしモードでは本編の画面ではなく家・庭の画面を開いたままにし、「一日を過ごす」で `life.day++`、植物の成長・生活イベントの進行・少量の素材。本編のパラメータ（借金・精神・疲労など）は動かさず、`checkGameOver`／`triggerEnding` は発火しない。
- タイトルの「つづきから」は、暮らしモード中のセーブなら家・庭の画面から再開する。「本編のはじめから」は通常どおり新規ゲーム（前の家は残らない）。

---

# フェーズ3 追記（素材刷新と自由度拡張）

対象：操作アイコンの独自素材化／人物・敵・アイテム・背景の画風統一／部屋の拡張・外観変更・庭の拡張／季節と天候／家・庭の画像保存。フェーズ1・2の契約は維持。`gs.homeData.version` を 3 に上げ、v2 からは `HOME.ensure()` で自動移行。

## 1. 操作アイコンの統一（main/icons.js 新設）
- `window.ICONS`：コードで描くドット絵アイコン（16×16 原寸、整数倍で拡大、外周線 #1b1226、左上光源、docs/asset-style-guide.md のパレット）。
- API：`ICONS.canvas(name, px=24)` → canvas、`ICONS.url(name, px)` → dataURL（キャッシュ）、`ICONS.html(name, px, label)` → `<img class="ic" alt="label">`、`ICONS.names()`。未定義名は「？」。
- 置き換える範囲は「操作のための記号」：下部ナビ、メインの行動メニュー、ステータス表示の見出しアイコン、設定、ミニゲーム選択（カテゴリ・カード）、ミニゲームの見出し・終了ボタン・結果画面、通知の先頭アイコン、家・庭画面の UI。物語の本文やコメント欄の絵文字はそのまま。
- 画像化した後も、意味は文字ラベルで必ず伝える（アイコンだけのボタンを作らない）。
- 画像が差し替えられるよう、`assets/original/icons/<name>.png` があればそちらを優先（ComfyUI 生成物の受け口）。

## 2. 画風の統一（各ミニゲーム）
- 方針：全ミニゲームで「だんのうら」「娘」「三毛猫」の見た目をそろえる（紫の髪・めがね・ピンクの髪飾り／おかっぱ・ふたつ結び・ピンクの花／三毛）。外周線・影・光源をスタイルガイドに合わせる。
- 監査表 `docs/art-audit.md`：17本＋本編＋家・庭について、主人公・娘・猫・敵・アイテム・背景の描き方（ドット/ベクター/3D/画像）と、スタイルガイドからのずれ、対応内容を記録。
- 大幅な作り直しはしない。色・輪郭・頭身・顔の特徴の不一致を直す。

## 3. 家・庭の拡張（main/home/expansion.js 新設＋既存モジュールの拡張）
- 部屋の拡張：`room.width/height` を 12×8 → 拡張後 14×9（「部屋を広げる」：素材＋お金の一回きりの改修。借金返済と競合しすぎない価格、`HOME.BAL.expand`）。既存配置は保持。
- 庭の拡張：16×12 → 20×14（同上）。
- 外観変更：庭の上端に家の外壁（屋根・壁・戸口・窓）を描き、`homeData.exterior = {roof:'navy'|'red'|'green'|'brown', wall:'cream'|'white'|'wood', door:'wood'|'blue'}` を選べる（時間・素材なし）。部屋の壁紙 `room.wallpaper`（'lavender'|'mint'|'cream'|'night'）と床 `room.floorId`（'floor.wood'|'floor.tatami'|'floor.dark'）も選べる。
- 拡張・外観の状態は保存され、旧セーブは初期値で移行。配置が拡張後の範囲外になることはない（縮小はしない）。

## 4. 季節と天候（main/home/seasons.js 新設）
- 季節は本編の日付から：1〜7日 夏（7月始まり、イメージ画像の「7月12日(土)夏の夜」に合わせる）… 30日で夏→初秋。暮らしモードでは life.day で 夏→秋→冬→春 と 15日ごとに巡る。`HOME.season()` → 'summer'|'autumn'|'winter'|'spring'。
- 天候：日ごとに決定的な疑似乱数（gs.day とシードから）で 'clear'|'cloudy'|'rain'|'snow'(冬のみ)。`HOME.weather()`。
- 演出：庭の草色・木の葉色・地面の差分、雨・雪・落ち葉・蛍（夏の夜）・桜の花びら（春）のパーティクル。部屋の窓の外にも反映。雨の日は「水やり不要（自動で水やり済み）」。
- 植物：季節で成長速度が少し変わる（冬はゆっくり、枯れない）。ひまわりは夏、あさがおは夏〜初秋に咲く見た目。
- パーティクルは低負荷（最大 60 個、画面を閉じたら停止、reduce-motion では出さない）。

## 5. 画像保存（main/home/photo.js 新設）
- 「📷 写真を撮る」：現在の部屋または庭を（人物・猫・季節・天候込みで）PNG にして端末に保存（`<a download>`、iOS は新しいタブで長押し保存の案内）。ファイル名 `dannoura-home-<area>-day<d>.png`。
- 保存失敗時は成功と表示しない。画像データは localStorage に入れない。

## 6. 生成画像の受け口（Web版の家・庭）
- `assets/original/manifest.json` の各 asset に `file` があり、その PNG が読み込めたら、`HOME_ART.drawItem/drawChar/drawTile` はそれを優先して描く（足元位置・はみ出しは manifest の `anchor` で指定）。読み込み失敗・未指定ならコード描画のまま。
- 既定では file は null（すべてコード描画）。ComfyUI 生成物を入れる手順を docs/comfyui/README.md に追記。


# 追記：セーブスロットと「最初の状態に戻す」

## セーブスロット（game.js）
- キー：`dannoura_save_slot1`〜`3`、使っているスロットは `dannoura_save_meta` の `active`。`SAVE_KEY` は**今のスロットのキー**を指す（`let`。他のスクリプトの `localStorage.getItem(SAVE_KEY)` はそのまま今のスロットを読む）。
- 公開：`SAVESLOTS`（`raw(n)`・`read(n)`・`summary(n)`・`list()`・`used()`・`latest()`・`write(n,str)`・`remove(n)`・`migrate()`）、`SAVE_SLOT`、`setActiveSlot(n)`、`openSlotPicker('load'|'new')`。
- 旧セーブ `dannoura_save_v1`：起動時にスロット1へ写し、読み戻して一致したら旧キーを消す。写せなければ旧キーを残し、スロット1が空の間は旧キーをスロット1として読む（スロット1に保存できた時点で旧キーを消す）。
- 結末：`triggerEnding` が `gs.endingReached`（結末の種類）を保存する。スロット一覧の「結末：○○」に使う。`saveDataToGs` は読み込むセーブに無い `endingReached`・`rpg`・`story`・`mgDay`・`○○Data`（`homeData` を含む）を消すので、別スロットの家・暮らし・結末は残らない。
- 暮らしモード：`lifemode.js` の再開は `SAVESLOTS.raw(SAVE_SLOT)` を読む（スロットごと）。「タイトルへ」→再読込しても `active` が残るので、同じスロットに保存が続く。
- 共通のまま：`dannoura_endings`（エンディング一覧）、音量設定、遊び方の既読。

## 模様替え：最初の状態に戻す（placement.js / editor.js / state.js）
- `HOME.defaultLayout(area)`：新規の初期配置（`INIT_ROOM`／`INIT_GARDEN`）の写し。
- `draft.reset(area, layout)`：1回の取り消しで戻る1操作。layout なし＝その場所のものをすべて収納。layout あり＝すべて収納してから、収納にあるぶんだけ初期配置に置く（足りない・置けないものは収納のまま `skipped`）。所持数（inventory）には触らない。結果が今と同じなら何もしない（履歴も増えない）。
- 出入口をふさぐ置き方は初期配置に無く、すべて収納しても出入口は空くので、どちらも到達性を壊さない。壁紙・床・外観は戻さない（配置だけ）。
- UI：模様替えの収納欄の上に「部屋（庭）を最初の状態に戻す」→ `HOME.ui.choice` で「最初の配置に戻す／すべて収納する／やめる」。確定するまで保存しない。
