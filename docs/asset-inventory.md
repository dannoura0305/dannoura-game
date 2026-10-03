# 素材インベントリ

機械可読版：`assets/original/manifest.json`（id, category, status, sourceType, icon, atlas, frames, palette, notes）。
状態：`verified` = 原寸（32px/タイル、1x・1.5x・2x）で描画を目視確認済み。`draft` = 未確認・未使用。

## 1. 家・庭（フェーズ1 新規、`main/home/sprites.js`・すべてコード描画）

### アイテム（20）
| id | 大きさ | 回転 / variant | 状態 | 備考 |
|---|---|---|---|---|
| furniture.desk_small | 2×1 | 0,90 | verified | ノート・鉛筆・マグ。90は左に取っ手 |
| furniture.wood_chair | 1×1 | 0,90,180,270 / natural, white | verified | 背もたれ上12ドット |
| furniture.repaired_shelf | 2×1 | 0,90,180,270 | verified | 新しい板＋L字金具、背面に筋交い |
| furniture.bookshelf | 2×1 | 0,90,180,270 | verified | 背が高い（上28ドット） |
| furniture.futon | 2×3 | 0,90 | verified | 青紫の掛け布団・星柄 |
| furniture.cushion | 1×1 | 0 | verified | ピンク、黄色の房 |
| furniture.low_table | 2×2 | 0,90 | verified | 湯のみ2つ・みかん |
| light.desk_lamp | 1×1 | 0 / lit | verified | アンバーのグロー |
| light.shell_lantern | 1×1 | 0 / lit | verified | 帆立貝＋真珠、ティールのグロー |
| memento.child_drawing | 1×1（壁） | 0 | verified | 額のクレヨン画（パパと娘） |
| memento.bear | 1×1 | 0 | verified | 画面右の耳がほつれ |
| memento.flower_tag | 1×1 | 0 | verified | 杭の札、クレヨン字 |
| garden.pot | 1×1 | 0 / default, red, blue, yellow ＋ plant 0–4 | verified | 花色は名前か #rrggbb |
| garden.flowerbed | 2×1 | 0,90 | verified | 揺れ2コマ |
| garden.bench | 2×1 | 0,90,180,270 | verified | |
| garden.fence | 1×1 | 0,90 | verified | 並べると連続 |
| garden.stepping_stone | 1×1（path） | 0 | verified | |
| garden.small_tree | 1×1 | 0 | verified | 揺れ2コマ |
| deco.rug | 3×2（rug） | 0,90 | verified | |
| deco.sea_glass | 1×1 | 0 | verified | 揺れ・きらめき2コマ |

### タイル・壁・キャラ・UI
| id | 種類 | 状態 | 備考 |
|---|---|---|---|
| floor.wood | タイル | verified | gx,gy で板目が連続・変化 |
| ground.grass | タイル | verified | 小花・草の房・まだら |
| ground.path | タイル | draft | 予備、未使用 |
| wall.room | 壁帯 | verified | 窓（夜空）・カーテン・壁灯・幅木。推奨高さ 1.5T |
| char.dan | キャラ | verified | 4方向 × stand / walk(4) / sit |
| char.kid | キャラ | verified | 4方向 × stand / walk(4) / sit。クマは持たない |
| ui.place / rotate / store / undo / redo / craft / memories / close / edit / room / garden / water / talk | UIアイコン 32×32 | verified | |
| ui.unknown | 「？」の箱 | verified | 未定義IDの代替 |
| icon(itemId, variant) | 48×48 | verified | アイテム原寸画像を中央に拡大（2倍以上は整数倍） |

### 描画上の注意（renderer 向け）
- `drawItem` の画像は足元範囲の左上 (px,py) から左右下に4ドット、上に30ドットの余白を持つ。手前（y が大きい）ほど後に描く。
- `wood_chair`/`bench` の 180（背面）は背もたれが手前なので、座っているキャラより後に描くと自然。
- 壁掛け（`memento.child_drawing`）は y=0 の行の上、`py-29`〜`py-8`ドットの範囲（壁帯）に描かれる。壁帯は行0の真上に `1.5T` 以上で描く想定。
- `opts.t` は秒（1e5 を超える値はミリ秒とみなして1000で割る）。

## 1b. 家・庭（フェーズ2 追加、`main/home/sprites.js`・すべてコード描画）

### アイテム（12）＋種（3）
| id | 大きさ | 回転 / variant | 状態 | 備考 |
|---|---|---|---|---|
| furniture.toy_box | 1×1 | 0 | verified | ボール・積み木・アヒル、星のシール |
| furniture.kid_desk | 1×1 | 0,90,180,270 | verified | 画用紙とクレヨン。90 は 270 の反転 |
| furniture.old_radio | 1×1 | 0 | verified | 台にのった木箱のラジオ |
| memento.toolbox | 1×1 | 0 | verified | 赤い工具箱、緑の名札 |
| memento.recital_photo | 1×1（壁） | 0 | verified | 舞台の娘の写真 |
| deco.wind_chime | 1×1（壁） | 0 | verified | ガラスの風鈴、短冊が揺れる2コマ |
| deco.sea_mobile | 1×1（壁） | 0 | verified | 魚・貝・星が揺れる2コマ |
| garden.nameplate | 1×1 | 0 | verified | 屋根つきの表札 |
| garden.clothesline | 3×1 | 0,90 | verified | 洗濯物3枚 |
| light.string_lights | 2×1（非solid） | 0,90 / lit | verified | 電球ごとの小さなグロー |
| garden.planter | 2×1 | 0,90 ＋ plant | verified | species ごとに2〜3株 |
| garden.watering_can | 1×1（非solid） | 0 | verified | ブリキ |
| seed.morning_glory / sunflower / herb | アイコンのみ | — | verified | 種の袋（置けない） |

### 植物・人物・ポーズ
| id | 種類 | 状態 | 備考 |
|---|---|---|---|
| plant species | 植物 0–4 | verified | seed（娘の花）／morning_glory（支柱とつる・青紫のラッパ形）／sunflower（背が高い）／herb（茂み） |
| char.chiyo | キャラ | verified | 4方向 × stand / walk(4) / sit。銀髪のお団子・かんざし・金縁メガネ・えんじのカーディガン |
| char.hancho | キャラ | verified | 4方向 × stand / walk(4) / sit。黄色いヘルメット・紺の作業着 |
| char.cat | キャラ | verified | 三毛猫。4方向 × stand / walk(2) / sit / sleep（丸くなる）。アイコン `icon('char.cat')` |
| kid: sleep / read | ポーズ | verified | sleep は布団の左上に重ねる（縦・横）、Zz 2コマ |
| dan: work / hold | ポーズ | verified | 机で作業（2コマ）、眠る娘を抱いて座る |
| wall.room（昼） | 壁帯 | verified | `drawWall(...,{night:false})` で青空の窓 |

## 2. 既存素材（フェーズ3 統一のための棚卸し）

### 画像ファイル `assets/img/`
| ファイル | 種類 | 用途・メモ |
|---|---|---|
| bg_main / bg_childcare / bg_factory / bg_rest_light .webp | 背景（一枚絵） | シーン背景。ドット絵ではない |
| char_normal / happy / tired / fear / collapse / win .webp | 立ち絵 | だんのうらの表情差分 |
| sd_normal / tired / collapse / engineer / streamer .webp | SDイラスト | |
| ending_*.webp（8） | エンディング絵 | collapse, debtfree, engineer, father, flame, king, normal, rebirth |
| child_normal / happy / sad / sleep / fever .svg | 娘の立ち絵（ベクター） | 髪 #33204f 系、ミントのパジャマ #9fe2c8 — 家のドット絵はこの配色に合わせた |
| mob_*.svg（25） | モブ立ち絵（ベクター） | chiyo, gen, hancho, joren, midori, minamo, sakura, senpai, sensei, yodaka と表情差分 |

### 音 `assets/bgm/`（8, mp3）・`assets/voice/`（12, m4a）
画像統一の対象外。

### コードで描く絵
| 場所 | 内容 |
|---|---|
| main/homescene.js | 夜の部屋のドット絵（壁・窓・街・机・モニタ・布団・娘・クマ・だんのうら各ポーズ・光）。家・庭素材の配色と外周線の基準 |
| main/presentation.js | 演出用のキャンバス描画（光・粒子） |
| minigames/*.js | 各ミニゲームが独自にキャンバス描画（runner, escape, fishing, stealth, roguelike, rpg, cooking, blocks, race, shooter, defense, puzzle, horror, cardbattle, manager, quiz, factory3d〔three.js〕） |

### 絵文字・記号を UI に使っている箇所（件数の目安）
| ファイル | 件数 | 例 |
|---|---|---|
| game.js | 約250 | ★ ☕ ♪ ⚙ ⚠ ⚡ ✨ 🌙 🌊 🌧 … 行動メニュー・ログ |
| index.html | 約40 | 🏠 🎮 💾 🎵 🌙 💜 … ボタン・見出し |
| main/integrations.js | 6 | 🪵 🧵 🔩 🐚 💡（素材名） |
| main/memories.js / story.js / ui.js / presentation.js | 1〜3 | 📖 💬 ⚠ 🎤 🚨 📤 |
| minigames/*.js | 各5〜40 | ★ ♥ ⚡ 👻 🔦 🚪 🎣 🍳 など |

フェーズ3候補：素材（wood/cloth/metal/sea）のドットアイコン、メニューの主要絵文字（🏠 🎮 💾 📖）をこのガイドの UI アイコンに置き換え。
