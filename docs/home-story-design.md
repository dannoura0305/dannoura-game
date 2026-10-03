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
