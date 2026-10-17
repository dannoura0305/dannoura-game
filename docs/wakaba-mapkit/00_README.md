# わかばプロジェクト 高品質3Dゲームマップ制作・AI自動化基盤（wakaba-mapkit）— フェーズ0

作成：2026-10-16／ブランチ `claude/exciting-bardeen-oilbot`／作成：Claude Code（クラウド）
**フェーズ0＝環境調査と設計の資料だけ**です。ソフトウェアのインストール・ゲームのコードの変更は**していません**（リード Claude の方針：このフェーズでは何も入れない）。

## 資料の一覧
| # | ファイル | 中身 |
|---|---|---|
| 00 | この README | 一覧・決定の要約・利用者に確認すること |
| 01 | [01_現状環境調査報告書.md](01_現状環境調査報告書.md) | リポジトリ・クラウドのコンテナで見えた事実／見えなかった事 |
| 02 | [02_既存機能の再利用一覧.md](02_既存機能の再利用一覧.md) | 境界侵食などの既存の部品をどう共通化して使うか |
| 03 | [03_不足機能一覧.md](03_不足機能一覧.md) | 無い機能と、誰（クラウドの AI／利用者の PC のスクリプト／手作業）が作るか |
| 04 | [04_必要ソフトウェア一覧.md](04_必要ソフトウェア一覧.md) | 版・ライセンス・商用・費用・入れ方・自動化・確認度・出典 |
| 05 | [05_システム統合構成図.md](05_システム統合構成図.md) | Mermaid の図（データの流れ・素材ライブラリ・AI と n8n・PC の役割） |
| 06 | [06_開発優先順位.md](06_開発優先順位.md) | フェーズ 0〜6 と受け入れ条件 |
| 07 | [07_詳細設計仕様書.md](07_詳細設計仕様書.md) | Claude Code 向けの設計（構成・メタデータのスキーマ・ライセンス門・PCG の規則・地図仕様・画質の段・レポート・試験・バックアップ） |
| 08 | [08_回答_12項目.md](08_回答_12項目.md) | 依頼書 §12 の質問への回答と、方式 A／B／C の比較・推奨 |
| 09 | [09_ユーザー確認チェックリスト.md](09_ユーザー確認チェックリスト.md) | 利用者に確認してほしいこと（コマンド・画面の場所つき） |
| 11 | [11_写実化パイプライン.md](11_写実化パイプライン.md) | **フェーズ 3（2026-10-17）**：写実の試験マップの作り方（手続きの材質・Blender の部品・描画）・予算と実測・利用者の素材への差し替え・限界 |
| 10 | [10_方式C_共有素材ライブラリとUE5連携.md](10_方式C_共有素材ライブラリとUE5連携.md) | **方式 C の決定（2026-10-17）**：ブラウザ版を続け・UE5 の PC 版を足し・素材置き場は 1 つ。素材ライブラリの形・Blender／UE5／Gaea の橋・確かめた事と未検証・PC で次にすること |
| – | [tools/survey_local.ps1](tools/survey_local.ps1) | 利用者の Windows で動かす、読むだけの環境調査スクリプト（JSON を出す・未実行） |

## 調査でわかったこと（要約）
1. **既存の 3D**（境界侵食）は Three.js 0.185.1・コードで組む・**トゥーン（アニメ調）**・**平らな地面**・箱の当たり・道案内の点の網。写実の地形・PBR 材質・外部の 3D 素材は**まだ無い**（試験用の小さな glTF だけ）。
2. ただし「データから組み立てる・決まった乱数・塞いでいないかの自動試験・描画呼び出しの計測・画質の段・素材の license 欄」という**基盤の骨はある**ので、作品から切り離して共通化するのが最短。
3. **クラウドのコンテナには GPU が無く、素材サイト・Blender・Epic・QuadSpinner には繋がらない**（npm・PyPI は繋がる）。重い制作と見た目・fps の確認は利用者の PC で行う必要がある。
4. 外部ソフトの最新（検索の要約・一次資料は未読）：**UE 5.8（2026-06）**・**Blender 5.2 LTS（2026-07）**・Gaea 2.x（Gaea 3 は 2026-09 予定だったが出たか未確認）・n8n 2.43.7（npm で確認）・three 0.186.1（npm で確認）・bpy 5.2.2（PyPI で確認・Python 3.13 用）。
5. ライセンスの要注意：**Gaea Community は非商用のみ**／**Megascans は 2025 年から大半が有料**／**Fab の素材をブラウザで配ることの扱いは未確認**／Hunyuan3D は地域制限つき。不明な素材は自動で使わない設計にした（`07` §3.1）。
6. リードが落とした `bpy-4.2.0`（cp311）は **Blender 4.2＝サポート終了の版**。使うなら利用者の Blender と同じ系列（4.5 LTS か 5.2 LTS）に合わせる（インストールはしていない）。

## 決定（2026-10-17・利用者の回答）
- **方式（Q-A2）＝A・B・C を全部採用**：今のブラウザ版（スマホでも遊べる・Three.js）を続け、UE5・Blender・Gaea は素材作りの道具に使う（A）＋高性能 PC 向けに UE5 の別の版を作る（B）＋両方で素材置き場を共有する（C）。詳しくは [`10`](10_方式C_共有素材ライブラリとUE5連携.md)。
- **画風（Q-A1）＝「A 案で写実の試験マップ」**：写実はブラウザ版の試験マップ（`mapkit.html` の山の廃村）だけ。**境界侵食はアニメ調のまま**（DECISIONS 2026-10-14 は変えない）。
- **収益化（Q-L1）＝商用あり**（`wakaba.config.json` の `commercial: true` は仮の既定でなく決定）。→ Gaea Community（非商用）で作った地形は本番に使えない（Indie 以上か手続きの地形）・無料枠が非商用の道具や研究用のモーション AI は門で止まる・UE5 版には UE の規約（収入 100 万ドル超で 5%）。
- **素材の置き場所（Q-B2）＝このリポジトリ**（`wakaba-assets/`）。重い原本は Git に入れず、場所と sha256 を `sources.json` に書く（50MB 超を Git で持つなら Git LFS）。
- **PC**＝i7-9700・RTX 3060 Ti 8GB・メモリ 16GB・SSD 512GB（利用者が確認）。**Blender は入っている**（版は未確認）。UE5・Gaea は未確認（`09` §0）。

## 以前の推奨（記録・2026-10-16）
- **まず方式 A**：ブラウザの Three.js を本番のまま、UE5・Blender・Gaea は「素材を作る道具」として使い、glTF＋焼いた光で書き出す。UE5 は利用者の PC で**短期の試し**だけ行い、その結果で方式 C（UE で高品質の PC 版＋Web 版）に進むかを決める。方式 B（UE だけに移る）は今は勧めない。理由は `08` §11。
- 最初の検証マップ「山の廃村」は、境界侵食の本編とは別の入口で、**まず仮の形で「歩ける・塞がない・届く」を固めてから**写実の素材を入れる（`06` フェーズ 2〜4）。

## 利用者に確認してほしいこと（★＝先に必要。詳しくは `09`）
- ~~画風（Q-A1）~~ → **回答済み**（写実は試験マップだけ）／~~方式（Q-A2）~~ → **回答済み**（A・B・C 全部）／~~収益化（Q-L1）~~ → **回答済み**（商用あり）／~~素材の置き場所（Q-B2）~~ → **回答済み**（このリポジトリ）
- ★ **UE5・Gaea が入っているか**と版、**Blender の版**（`09` §0 の 3 手順：スクリプトか、画面で見るだけ）
- ★ リポジトリが public か（Q-L3）／Fab 素材は UE5 版だけで使う形でよいか（Q-L2：ブラウザ版には門が入れない）
- 「わかばシステム」の中身（Q-W1）、NAS・サブ PC・外付け SSD、n8n・ComfyUI・Codex・Grok の状況、予算

## 次の一歩
`09` の★に答えてもらった後、フェーズ 1（スキーマ・ライセンス門・地図仕様の例を、試験つきで置く）に進みます。それまでコード・ソフトには手を付けません。

## フェーズ 1 の使い方（2026-10-17 実装・コマンドはリポジトリの根で）
フェーズ 1（共通の「型」）を置きました。インストール不要（node 22 だけ）。charkit（キャラクター）の道具は [`../wakaba-charkit/00_README.md`](../wakaba-charkit/00_README.md) の同じ節。

| したいこと | コマンド | 結果 |
|---|---|---|
| 素材のメタデータ（`meta.json`）を検査して**ライセンス門**に通す | `node mapkit/assets/license-gate.mjs <ファイル or フォルダ>...` | 素材ごとに pass／block と理由（`[LICENSE_UNKNOWN]` など）。block が 1 件でもあれば終了コード 1 |
| 素材ライブラリ全部＋作品が使う物を門に通す | `node mapkit/assets/license-gate.mjs`（引数なし） | `wakaba.config.json` の `assetLibrary.entries` を全部（今は 0 件） |
| 作品が使うと書いた物だけ（CI と同じ） | `node mapkit/assets/license-gate.mjs --uses` | `projects.shinshoku.uses` が全部 pass でなければ 1 |
| 結果を JSON に・クレジット表を作る | `… --out license-gate.json --credits credits.json` | `07` §3.1 の出力（`wakaba-license-gate/1`） |
| 配信先・段を変える | `--target web`（既定）／`--target ue5`（高性能 PC 版）／`--target all`（両方を順に）／`--stage dev`（人の点数が無いのを注意だけに）／`--project <id>` | – |
| **地図仕様**（`map.spec.json`）を検査 | `node tools/mapkit/validate_spec.mjs maps/haison/map.spec.json` | 形（スキーマ）＋中身（範囲・id の重複・目的地の解決・入れない家の扉・坂の範囲・高さマップの有無） |
| 検証レポート（`report.json`）を検査・md にする | `node tools/mapkit/validate_spec.mjs <report.json> --md report.md` | 形＋「人が見る項目（`check: human`）に AI が pass を書いていない」約束 |
| 試験 | `node tests/run.mjs`（`tests/wakaba-mapkit-schema.test.mjs`・`tests/wakaba-mapkit-gate.test.mjs`） | – |

置いた物（共通＝`mapkit/`、作品専用の物は作品側）：
- `mapkit/core/schema.js`：小さな JSON スキーマの検査（**mapkit・charkit 共通の 1 つだけの実装**。依存なし・node とブラウザ両方）
- `mapkit/core/schemas.js`（スキーマの一覧と登録簿）・`mapkit/core/spec.js`（地図仕様の中身の検査）・`mapkit/core/node.mjs`（node 専用の助け）
- `mapkit/schema/asset-meta.schema.json`（**v1.1**＝charkit の追加入り）・`map-spec.schema.json`（`anchors` 入り）・`map-report.schema.json`
- `mapkit/assets/gate.js`（門の規則・純粋関数。**charkit の権利の規則もここ＝門は 1 つ**）・`mapkit/assets/license-gate.mjs`（CLI）
- `mapkit/report/report.js`（レポートの形・検査・md。ファイルへの書き出しはフェーズ 2 の `build_map.mjs`）
- `maps/haison/map.spec.json`（山の廃村の地図仕様・`07` §5.2 の例＋charkit `05` §2 の `anchors`）
- `wakaba.config.json`（素材ライブラリの場所の指し先と作品の条件）・`wakaba-assets/catalog.json`（空の目録）

**未回答の質問に関わる既定（利用者の答えで変える所）**
- Q-L1（収益化）：フェーズ 1 の時は答えが無く `commercial: true`（厳しい側）にしていた。**2026-10-17 に「商用あり」と回答**＝値はそのまま、`commercialSource: "user-2026-10-17"` に。
- Q-B2（素材の原本の置き場所）：**2026-10-17 に「リポジトリ」と回答**＝`wakaba-assets/`（1 素材＝1 フォルダ・`10` §2）。元の記録：決まるまで**このリポジトリの `wakaba-assets/` に目録（meta.json）だけ**。移す時は `wakaba.config.json` の `assetLibrary` を書き換えるだけ（スキーマはコードと一緒の `mapkit/schema/` に残る）。公開リポジトリなので購入物・Fab の原本・書き出しは置かない。
- Q-A1・Q-A2（画風・方式）：フェーズ 1 の物はデータとスキーマだけで、方式 A／B／C のどれでも使える。（2026-10-17：回答済み＝写実は試験マップだけ・方式は A＋B＋C）

## フェーズ 2 の使い方（2026-10-17 実装・地形と配置の土台・コマンドはリポジトリの根で）
インストール不要（node 22・Playwright は画面の試験だけ）。素材は全部**仮の形**（灰色の箱・コードで作る木）。方式 A／B／C は未回答なので、配置と検査の結果は**エンジンに依らない JSON**（`layout.json`）と 16bit の高さ PNG で出す。

| したいこと | コマンド | 結果 |
|---|---|---|
| 高さマップを手続きで作る（Gaea の代わり） | `node tools/mapkit/gen_heightmap.mjs maps/haison`（`--seed` `--raw`） | `maps/haison/heightmap.png`（257×257・16bit・約 100KB。同じ仕様＋種 → 同じ PNG）。`--raw` で UE 用の `.raw16` も |
| 仕様 → 地形 → 配置 → 検証 → レポート | `node tools/mapkit/build_map.mjs maps/haison`（`--seed 別の種`・`--dry`） | `maps/haison/build/layout.json`・`build/terrain.png`・`report/report.json`・`report.md`・`map.svg`（上から見た図）。全部の自動検査が通れば終了コード 0 |
| 歩いて確かめる（画面） | `python3 -m http.server 8797` を起こして `http://localhost:8797/mapkit.html?map=haison` | 夕暮れと霧の山の廃村を三人称で歩く。光の線と柱・上の矢印が道案内。`?preset=ultra|high|mid|low`・`?perf=1`（fps・描画呼び出し）・`?view=first` |
| Playwright で全部の目的地へ歩く | `node tools/mapkit/play_map.mjs <出力フォルダ>`（`--only pc|phone`） | PC 1280×800 とスマホ 844×390 で道案内に沿って歩き、着いたか・誤り 0・描画呼び出しを確かめ、画面撮影と `overview.png`。`maps/haison/report/play.json` を書き、`report.json` の予算を測った値に |
| 試験 | `node tests/run.mjs`（`tests/wakaba-mapkit-terrain.test.mjs`・`tests/wakaba-mapkit-pcg.test.mjs`） | – |

操作：PC＝WASD／Shift で走る／マウス（クリックで視点を固定）／V＝一人称・三人称／L＝懐中電灯／N＝次の目的地。スマホ＝左の円で移動・右をなぞって視点・ボタン「走・視・灯・次」。`mapkit.html` は**開発・試験用の入口**で、本編のタイトルからはつながない。

置いた物：
- `mapkit/terrain/`：`png.js`（16bit PNG の読み書き・依存なし）・`heightmap.js`（高さ・法線・傾き・双線形・RAW16）・`generate.js`（ノイズ＋侵食＋崖・平らな谷・川・池）
- `mapkit/pcg/`：`rules.js`（立入禁止・しきい値）・`paths.js`（道）・`buildings.js`（廃屋・崩れた家・祠の型）・`scatter.js`（ポアソン円盤・仮の形の一覧）・`layout.js`（層の順）・`validate.js`（検査）
- `mapkit/core/world.js`（地形＋当たり＋床）・`mapkit/nav/grid.js`（歩ける格子・道のり）・`mapkit/render/quality.js`（画質の段）・`mapkit/report/topview.js`（上から見た図）・`mapkit/runtime/`（画面）
- 境界侵食の乱数・当たり・画質の自動の段は `mapkit/core/rng.js`・`geom.js`・`render/quality.js` へ**移して再輸出**（挙動は同じ）
- 仕様との違いの記録は `07` §11

フェーズ 3（写実の見た目）に進む前に決めてほしいこと：方式 A／B／C（Q-A2）と画風（Q-A1）、素材の置き場所（Q-B2）と収益化（Q-L1）。レポートの `gaps` に「仮の形 → 実素材」の計画（杉・広葉樹・岩・下草・小物・和風の家の部品）を承認待ちで出してある。

## 方式 C の準備の使い方（2026-10-17 実装・コマンドはリポジトリの根で）
ブラウザ版はそのまま。UE5 の PC 版と共有の素材置き場のための道具を足した（インストール不要：node 22。Blender・UE のスクリプトは利用者の PC で動かす＝**未検証**）。中身と確かめた範囲は [`10`](10_方式C_共有素材ライブラリとUE5連携.md) §6。

| したいこと | コマンド | 結果 |
|---|---|---|
| 素材ライブラリの目録を作る | `node tools/mapkit/catalog.mjs`（`--check`・`--verify-sources`・`--ue5-map 表.json`） | `wakaba-assets/catalog.json`（素材ごとに web・ue5 の門の結果。今は 0 件）。`web/` に Web に出せない物があると `WEB_BLOCKED` で 1 |
| 門を配信先ごとに | `node mapkit/assets/license-gate.mjs <ファイル or フォルダ> --target all` | web（公開）と ue5（非公開）を順に |
| 配置（layout.json）を検査 | `node tools/mapkit/validate_spec.mjs maps/haison/build/layout.json` | 形（`mapkit/schema/map-layout.schema.json`）＋指紋・id の重複・範囲・下草の数 |
| UE5 の Landscape 用の高さ | `node tools/mapkit/export_ue_heightmap.mjs maps/haison`（`--size 1009`・`--points`） | `maps/haison/build/ue/heightmap_505.png`・`landscape.json`（区画 4×4・Scale・Location）。`--points` で `pcg_points.csv` |
| Blender で場面を組む（利用者の PC） | `blender --background --python tools/blender/import_layout.py -- maps/haison/build/layout.json --save haison.blend` | 地形・家・木・岩・印。クラウドの bpy 4.2 で 0.4 秒 |
| Blender の部品をライブラリへ | `blender kit.blend --background --python tools/blender/export_kit.py -- --library wakaba-assets/entries` | glb（Web に出せる物だけ `web/`）・FBX（`source/`）・`sources.json`・`ue5/import.json` |
| UE5 に置く（利用者の PC） | UE の出力ログ（Python）で `py ".../tools/ue5/import_layout.py" --layout ".../layout.json"` | 手順は [`tools/ue5/README.md`](../../tools/ue5/README.md)（**未検証**） |
| キャラクター（VRM → UE5） | [`tools/blender/vrm_to_fbx.md`](../../tools/blender/vrm_to_fbx.md)・`node tools/charkit/export_bonemap.mjs` | 骨の名前の表 `tools/blender/bonemap_vrm_to_ue5.json` |
| 試験 | `node tests/run.mjs`（`tests/wakaba-mapkit-bridge.test.mjs`・`tests/wakaba-charkit-rename.test.mjs`） | – |

## フェーズ 3 の使い方（2026-10-17 実装・写実の試験マップ・コマンドはリポジトリの根で）
`mapkit.html?map=haison` が写実寄りになった（境界侵食は変えていない）。素材は全部このリポジトリの道具で作った自作（license `own`）。詳しくは [`11`](11_写実化パイプライン.md)。

| したいこと | コマンド | 結果 |
|---|---|---|
| 写実の試験マップを見る | `python3 -m http.server 8797` → `http://localhost:8797/mapkit.html?map=haison`（`&preset=ultra|high|mid|low`・`&perf=1`） | 夕暮れ・高さの霧・PBR の材質・部品・影・下草・揺れ。画面の右上に描画呼び出し・三角形・テクスチャの量 |
| 材質（PBR）を作り直す | `<venv>/bin/python tools/mapkit/matgen/matgen.py`（`--only <id>`・`--preview <フォルダ>`） | `wakaba-assets/entries/material/<id>/web/*.webp`（原寸は `source/`＝Git の外）。numpy・Pillow が要る（作業用の venv に入れる） |
| 部品（Blender）を作り直す | `<venv>/bin/python tools/blender/kit/build_kit.py`（bpy 4.2）／`blender --background --python tools/blender/kit/build_kit.py -- --only veg.tree.sugi` | `wakaba-assets/entries/<分類>/<id>/web/<id>.glb`・`source/<id>.fbx`・`ue5/import.json` |
| 目録・配置・検査 | `node tools/mapkit/catalog.mjs` → `node tools/mapkit/build_map.mjs maps/haison` → `node tools/mapkit/export_ue_heightmap.mjs maps/haison` | 目録 56 件（web・ue5 とも pass・注意 `UNVERIFIED_GENERATED`＝人の確認待ち）・配置に層 7「飾り」 |
| 歩いて測る・撮る | `node tools/mapkit/play_map.mjs <フォルダ>`（`--no-presets` で段ごとの計測を省く） | 目的地 5 つ（PC・スマホ）・段ごとの描画呼び出し・三角形・テクスチャ・起動の時間 → `maps/haison/report/play.json` |
| 試験 | `node tests/run.mjs`（`tests/wakaba-mapkit-phase3.test.mjs`） | 材質の組・目録と門・部品の形・LOD・予算・飾り・地面・建物 |

**人が確かめること**：自作の素材の `meta.json` の `license.verifiedBy`（AI は書かない）／見た目の承認（`report.json` の `check: human`）／実機（RTX 3060 Ti）の fps（`?perf=1`）。

## このフェーズで決めたこと（記録）
| 日付 | 決定 |
|---|---|
| 2026-10-16 | フェーズ0 ではソフトをインストールしない（リード Claude） |
| 2026-10-16 | 資料は `docs/wakaba-mapkit/` に置き、既存のファイルは変えない |
| 2026-10-16 | 名前 `wakaba-mapkit` は仮。既存の `wakaba_progress_v1`（作品間の保存）とは無関係 |
| 2026-10-17 | フェーズ 1 を実装（利用者の承認「両方を最初の一歩まで並行して進める」）。素材ライブラリは決まるまでリポジトリの中（`wakaba.config.json` で指す）。作品の商用は未回答のため厳しい側（true） |
| 2026-10-17 | フェーズ 2 を実装（利用者の指示「両方の最初の一歩の後はマップ基盤に集中」）。方式は未回答のため、配置と検査はエンジンに依らない JSON・画面は Three.js の灰色の箱 |
| 2026-10-17 | **利用者の決定**：方式 A・B・C を全部採用（ブラウザ版を続け・UE5 の PC 版を作り・素材置き場は共有）／画風は「A 案で写実の試験マップ」（境界侵食はアニメ調のまま）／商用あり／素材の置き場所はこのリポジトリ／PC は資料の通り・Blender あり。`wakaba.config.json` に配信先 `web`・`ue5` を足し、門・目録を配信先ごとにした（`10`） |
