# ASSET_LIST — 必要なグラフィック素材（Ver.0.1）

> 状態：**設計案（承認待ち）**
> 規格：PNG・透過・**最近傍で整数倍拡大**。輪郭色 `#2a1a10`（濃茶）。1 タイル 16px。キャラクターは地上用（見下ろし）と巣用（横向き）の 2 系統。

## 1. トビネズミ（毛色 5 色はパレット差し替えで作る＝描くのは 1 色分）

| 系統 | セル | 方向 | アニメ | 枚数 |
|---|---|---|---|---|
| 地上（見下ろし 3/4） | 32×32 | 4 方向（左右反転で 3 方向分を描く） | 待機 2、連続跳躍 4、大ジャンプ 6、採集 3、掘削 4、食事 3、睡眠 2 | 方向 3 × 24 = 72 |
| 巣（横向き断面） | 32×32 | 左右（反転） | 待機 2、歩き跳躍 4、ジャンプ 4、登る 4、採集 3、食事 3、睡眠 2 | 22 |
| 影 | 16×8 | — | 跳躍の高さで縮む | 1 |
| 立ち絵（キャラ作成） | 128×128 | 正面やや横 | 1 | 1 |

- 小さく表示しても「長い後脚・大きな耳・房のついた長い尾」が読めること（耳と尾はシルエットを誇張）。
- パレット：毛色ごとに 4 色（明・中・暗・影）＋腹の白＋目＋輪郭。

## 2. 地上フィールド（16×16 タイル）

| 素材 | バリエーション | 備考 |
|---|---|---|
| 砂地 | 4（波紋・足跡なし） | 自動タイル境界：砂⇄土⇄草 の 47 パターンは Ver.0.1 では簡易版（角 16 パターン） |
| 土 | 3 | |
| 草地 | 4 ＋ 草の房（装飾） | |
| 岩 | 大 32×32 ×2、小 16×16 ×2 | 通れない |
| 低木 | 32×32 ×3 | 通れない、大ジャンプで越える |
| 小石 | 16×16 ×3 | 通れる、採集物「小石」とは別の地形装飾 |
| 巣穴入口 | 24×16 ×2（自分の／他人の） | 名札は UI で |
| 水場 | 4 ＋ 縁 | 通れない（景観） |
| 木 | 48×64 ×1 | 景観 |

## 3. 採集物（16×16 アイコン＋地面に落ちている姿）
- 種子、草、小石（各 地面用 1 ＋ アイコン 1）。

## 4. 巣穴（断面・16×16 セル）

| 素材 | 内容 |
|---|---|
| 土壁 | 通常 3、岩 2、地表（草の根） 3 |
| 掘った空間 | 背景の奥壁 3、床の縁・天井の縁（自動タイル） |
| 通路 | 横・縦（はしご状の根）・斜め |
| 部屋 | 床の敷き草、角の補強 |
| 寝床 | 32×16（草の巣） |
| 倉庫 | 棚 32×32、種の山 16×16 ×3 段階 |
| 装飾品 | ランタン 16×16（光の円は描画で）、小石の飾り、乾いた花、敷物 |
| 入口 | 地表からの縦穴の口 |

## 5. UI
- 枠（9 スライス）、ボタン、ツールアイコン 6（掘る／通路／寝床／倉庫／家具／撤去）、持ち物の枠、ミニマップの枠、吹き出し、名札、カーソル（掘る・置く・不可）。

## 6. 将来用（Ver.0.1 では作らない）
- 富山エリア（雪山・水田・桜・瓦屋根）、他作品の収集品アイコン（ドラゴンズカード／機械の部品／不思議なお守り／黒い羽／謎の結晶）、子ども・繁殖・天敵。

## 7. 制作手順（画像生成 → 規格化）
1. 画像生成で下描き（参考：添付イメージの質感。**既存ゲームの画面・キャラクターに似せない**）。
2. `tools/normalize_sprites.py`：指定セルに切り出し → 背景除去 → 縮小（最近傍）→ パレット減色（素材ごとの固定パレット）→ 輪郭付け → シート化。
3. `assets/manifest.json` に登録（無い素材はコード描画のプレースホルダで代用）。
4. コンタクトシート（一覧画像）で色調・大きさの統一を目視確認。

## 8. manifest.json の形式

素材はすべて `tools/make_assets.py` がコードで描いて書き出す（Pillow のみ・固定シードで毎回同じ PNG）。
外部で描いた画像に差し替えるときは `tools/normalize_sprites.py` で規格化し、同じキーで登録する（§7）。
クライアントは `assets/manifest.json` を読み、**キーが無い素材はコード描画のプレースホルダで代用**する。

```
python3 tobinezumi/tools/make_assets.py              # assets/ と manifest.json を生成
python3 tobinezumi/tools/make_assets.py --preview    # + docs/reference/assets_contact.png と試し合成
python3 tobinezumi/tools/normalize_sprites.py --help # 外部画像の規格化
```

### 共通
- トップレベル：`version`(1)・`outline`("#2a1a10")・`tile`(16) と、以下の素材キー。
- 各素材 `{ "file": "assets/ からの相対パス", "cell": [w, h], ... }`。シートは**横＝コマ（またはバリエーション）、縦＝方向（または段）**。
- `frames` = アニメのコマ数、`variants` = 見た目違い（ランダムに選んでよい）の数。`anim: true` の `variants` は時間で順に切り替える。
- `fps`（目安）、`loop`（false は最後のコマで止める）。
- `anchor: [x, y]` = セル内の足元／接地点（y ソートと配置の基準）。
- `names` = バリエーションの名前（順番どおり）。`slice: [左, 上, 右, 下]` = 9 スライスの境界 px。
- 画素は整数倍・最近傍で拡大すること（補間しない）。

### トビネズミ
| キー | 内容 |
|---|---|
| `jerboa.field.<anim>` | 地上（見下ろし 3/4）。anim = idle 2 / hop 4 / bigjump 6 / gather 3 / dig 4 / eat 3 / sleep 2。`dirs: ["down","up","side"]` が行の順。`side_faces: "right"`（左向きは左右反転）。`anchor: [16,29]` |
| `jerboa.side.<anim>` | 巣の横向き。anim = idle 2 / walk 4 / jump 4 / climb 4 / gather 3 / eat 3 / sleep 2。1 行。`faces: "right"` |
| `jerboa.shadow` | 16×8 の半透明の影。跳躍の高さに応じてクライアントが縮める（スプライト側のジャンプの高さはコマに 1〜3px しか入っていないので、大ジャンプの弧は y オフセットで描く） |
| `jerboa.portrait.<fur>` | 立ち絵 128×128（毛色ごとに描き出し済み） |
| `fur.palettes` | `{ "base": [9 色], "sand": [...], "cream": [...], "rufous": [...], "graybrown": [...], "white": [...] }`。スプライトは base の色で描いてあり、**base[i] と完全一致する画素を <fur>[i] に置き換える**と毛色が変わる（base の 9 色は輪郭・目・鼻・地形とは重複しない）。 |
| `fur.keys` | 9 色の意味：毛(影・暗・中・明)、腹(陰・明)、耳の内側(暗・明)、尾の房 |
| `fur.order` / `fur.labels` | 選択画面の並び順と表示名（砂色・淡黄・赤茶・灰褐・白っぽい） |

### 地上（`tile.*`）
| キー | 内容 |
|---|---|
| `tile.sand` 4 / `tile.dirt` 3 / `tile.grass` 4 | 地面。同じ地形のバリエーションはどれを並べても継ぎ目なし |
| `tile.water` 4 | `anim: true`（4 コマの水面） |
| `tile.trans.sand_dirt` / `dirt_grass` / `sand_grass` | 境界の重ね絵 16 種。`autotile: "corner4"`、`bits: {TL:1, TR:2, BR:4, BL:8}`。タイルの 4 隅のうち `upper` の地形である隅のビットを立てた番号のコマを、`lower` の地面の上に重ねる（15 = 全面）。砂→土→草の順に重ねる |
| `tile.edge.water` | 水辺の重ね絵（corner4・16 種）。行 = 4 コマのアニメ（泡と濡れた砂を含む） |
| `tile.grass_tuft` 4 / `tile.pebbles` 3 | 通れる装飾（`decor: true`） |
| `tile.rock_big` 32×32×2 / `tile.rock_small` 16×16×2 / `tile.shrub` 32×32×3 / `tile.tree` 48×64 | `solid: true`、低木は `jumpable: true`。`anchor` は根元、`footprint` は塞ぐタイル数 [横, 縦] |
| `tile.burrow` 24×16×2 | 巣穴の入口。`names: ["own","other"]`（自分の巣は小石の輪と花の目印つき） |

### 採集物
- `item.<seed|grass|pebble>.ground`（地面に落ちている姿・影つき・16×16）、`item.<…>.icon`（持ち物・16×16）。

### 巣穴（`nest.*`、断面・16×16 セル）
| キー | 内容 |
|---|---|
| `nest.soil` 3 / `nest.rock` 2（`diggable: false`）/ `nest.surface` 3 | 土壁。地表タイルは上 5px が透過（空はクライアントが描く） |
| `nest.wall` 3 | 掘った空間の奥壁 |
| `nest.edge` 16 | 掘ったセルに重ねる縁。`autotile: "nsew4"`、`bits: {N:1, E:2, S:4, W:8}`＝その方向の隣が**土（未掘削）**ならビットを立てる。S＝床の縁、N＝天井の縁、E/W＝壁の縁 |
| `nest.tunnel_h` / `nest.tunnel_v`（根のはしご、`ladder: true`）/ `nest.tunnel_d` | 通路。斜めは右上がり（`rises: "right"`、左上がりは反転） |
| `nest.straw` 2 | 床の敷き草（セル下部に重ねる） |
| `nest.post` / `nest.brace` | 柱・角の補強（brace は左上角用、右上は反転） |
| `nest.bed` 32×16 / `nest.shelf` 32×32 / `nest.rug` 32×16 | 寝床・棚・敷物。`anchor` は床に接する点 |
| `nest.seed_pile` 3 | 種の山（`names: ["few","some","full"]`） |
| `nest.lantern` 2 | `anim: true`（揺らぎ 2 コマ）。`light: {x, y, radius, color}` は光の円の目安（光はクライアントが加算描画） |
| `nest.pebble_deco` / `nest.dried_flower` | 装飾品 |
| `nest.entrance` 16×32 | 地表からの縦穴の口。上 16px が地表の行、下 16px がその下のセル |

### UI（`ui.*`）
| キー | 内容 |
|---|---|
| `ui.frame` 24×24 | 枠（`slice: [8,8,8,8]`） |
| `ui.button` 16×16×3 | `names: normal/hover/pressed`、`slice: [5,5,5,5]` |
| `ui.tools` 16×16×6 | `names: dig/tunnel/bed/store/furniture/remove`、`labels: 掘る/通路/寝床/倉庫/家具/撤去` |
| `ui.slot` 20×20×2 | 持ち物の枠（normal/selected） |
| `ui.minimap` 24×24 | ミニマップの枠（`slice: [5,5,5,5]`） |
| `ui.bubble` 16×16 + `ui.bubble_tail` 6×4 | 吹き出し（`slice: [4,4,4,4]`）としっぽ（`anchor` = 先端） |
| `ui.nametag` 12×12×2 | 名札（other/self、`slice: [3,3,3,3]`） |
| `ui.cursor` 16×16×3 | 巣ビルドのセルカーソル（dig/place/invalid） |

### Ver.0.3「危険と土地」（`tools/art_danger.py` が描く。無ければ `client/art.js` のコード描画）
| キー | 内容 |
|---|---|
| `pred.fox` 32×24×8 | キツネ（右向き。`names: run0〜3/idle/alert/dig0/dig1`、`anchor: [16,22]`）。左向きは反転 |
| `pred.owl` 32×32×3 | フクロウ（`fly0/fly1/dive`、`anchor: [16,16]`）。高さ z の分だけ上に描き、地面には影（狙うと大きくなる） |
| `pred.snake` 32×16×5 | ヘビ（`coil0/coil1/rattle0/rattle1/lunge`、`anchor: [15,14]`）。待ち伏せ中は半透明 |
| `tile.puddle` 16×16×2 | 雨の水たまり（飲める） |
| `item.rare_seed.*` / `item.pretty_stone.*` | 希少資源（地面・アイコン。地面版は小さくきらめく） |
| `tile.plug` 24×16 | ふさいだ入口（`tile.burrow` の上に重ねる小石） |
| `ui.land_flag` 16×16 | 土地を調べた所の旗 |
| `ui.alert` 12×14 | 捕食者の「！」 |

### Ver.0.4「いのちをつなぐ」（`tools/art_family.py` が描く。毛色は FUR_BASE で描いてあり fur.palettes で差し替え）
| キー | セル | 中身 |
|---|---|---|
| `pup.field.idle` / `hop` / `sleep` | 32×32・dirs down/up/side・2/4/2 コマ | 子ども（地上）。大人の姿勢を足元 (16,29) を中心に 0.66 倍・頭 1.3 倍・耳と尾を短く |
| `pup.side.idle` / `walk` / `sleep` | 32×32・2/4/2 コマ・右向き | 子ども（巣の横向き） |
| `jerboa.field.sniff` | 32×32・dirs down/up/side・2 コマ | 野生の子が後ろ脚で立ち上がって見る（気になる） |
| `ui.heart` | 7×7・5 種（0/25/50/75/100） | 信頼のハート（下から満ちる） |
| `ui.sparkle` | 5×5 | なかよしのきらきら |
| `ui.traits` | 10×10・10 種（ear, leg, tail, size, fur, pied, female, male, pup, mate） | 形質のアイコン（家系図の札） |
| `ui.lineage_frame` | 24×24・2 種（normal, current）・9 スライス 6px | 家系図の額縁（いまの子は明るい金） |

- 形質の描き分け（耳・脚・尾の長さ、体の大きさ、濃淡・斑・白い房）は素材を増やさず、`client/sprites.js` の `_drawLook` がコマごとに画素を伸び縮み・色を差し替えて作る（キャッシュ）。若者は大人の素材を 0.84 倍、子どもは `pup.*`。

### Ver.0.5「広がり」（`tools/art_regions.py` が描く。無ければ `client/art.js` のコード描画）
| キー | セル | 中身 |
|---|---|---|
| `tile.dune` | 16×16・3 種 | 砂丘の波・さらさら砂 |
| `tile.cliff` / `tile.ledge` | 16×16・2 種 | 渓谷の崖の岩・段差の縁（下へだけ通れる） |
| `tile.river` | 16×16・4 種（揺れ） | 谷の川 |
| `tile.paddy` | 16×16・4 種（spring/summer/autumn/winter） | 富山の田んぼ（季節で水・苗・稲・雪） |
| `tile.channel` / `tile.path` | 16×16・2 種 | 水路・あぜ道 |
| `tile.mountains` | 256×128 | 富山の北の雪の山なみ（横に並べる） |
| `tile.house` | 96×80・2 種 | 家（入れない） |
| `tile.sakura` | 48×64・4 種（季節） | 桜 |
| `tile.shrine` / `tile.post` | 32×32 / 16×32 | 祠・道しるべ |
| `tile.machine` / `tile.phone` | 16×16・1/2 種 | 機械の部品・光る板（点く・消える） |
| `tile.stone_marker` | 16×24 | 谷の奥の古い石の標 |
| `tile.hole` | 32×24・4 種（脈うつ） | 不思議な穴 |
| `fx.white_shape` | 16×16・2 種 | 遠くの白い小さな影 |
| `ui.worldmap` | 192×144 | 世界地図の下地 |
| `item.curio.ground` / `item.curio.<id>.icon` | 16×16・18 種 | 地面のきらめき・収集品のアイコン（図鑑・巣の飾り） |
| `nest.stone_display`・`nest.curio_stand`・`nest.wreath`・`nest.curio_shelf`・`nest.family_tree`・`nest.snowman`・`nest.star_lamp` | 家具 | きれいな石の飾り・図鑑の台・季節のリース・飾り棚・家族の木・小さな雪だるま・星の灯り |

- 雪のまだら・砂嵐・蛍・桜の花びら・夜の灯りは `client/scene-field.js` がコードで描く。環境音は `client/ambient.js` が WebAudio で合成（音のファイルなし）。
- 素材は `python3 tools/make_assets.py` で 139 個（決まった種から作るので、何度作っても同じ）。

### Ver.0.6「くらしの深まり」（`tools/art_life.py` が描く。無ければ `client/art.js` のコード描画）
| キー | セル | 中身 |
|---|---|---|
| `tile.paddy_cut` | 16×16・2 種 | 富山の秋：稲刈りのあとの田（刈り株）。西の 2 列の田だけ |
| `tile.hasa` | 40×32 | はさ掛け（刈った稲を干す木の組み）。秋のあぜ道 |
| `tile.snow_lantern` | 16×24・3 種（off / lit1 / lit2） | 雪の灯り。冬の祠のそば・夜は窓がゆれる |
| `tile.busstop` | 24×32・2 種（normal / winter） | 古いバス停（時刻表の板・ベンチ。冬は雪） |
| `item.curio.rice_ear.icon` / `item.curio.candle_stub.icon` | 16×16 | 季節の品：金色の稲穂・ちびたろうそく（図鑑 20） |

- **ミミナガトビネズミ**（近縁種）は絵を足していない：`client/sprites.js` の形質の描き分けで、耳の帯を大きく伸ばし（おとな +6px・子ども +3px）、横向きの鼻先の帯を 1.3 倍に、毛色を灰色がかった淡い色へ寄せる（`look.sp = 'longear'`）。本番の絵に差し替えるときは `jerboa.side.*` と同じ形の `longear.*` を足せばよい（今は無い）。
- 家族のしぐさ（毛づくろい＝`jerboa.side.eat`・くんくん＝`jerboa.side.gather`・眠る＝`sleep`）・ハート（`ui.heart`）・吹き出しは前からの素材とコード描画。家系図の書き出し（PNG）は `ui.lineage_frame` と立ち絵（`Sprites.lookPortrait`）で canvas に描く。
- 素材は `python3 tools/make_assets.py` で 145 個（Ver.0.5 の 139 個はそのまま・同じ画素）。
