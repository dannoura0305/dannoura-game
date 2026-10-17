# わかばプロジェクト 高品質アニメ3Dキャラクター・自然モーション制作基盤（wakaba-charkit）— フェーズ0

作成：2026-10-16／ブランチ `claude/exciting-bardeen-oilbot`／作成：Claude Code（クラウド）
**フェーズ0＝環境調査と設計の資料だけ**です。ソフトウェアのインストール・ゲームのコードや既存の素材の変更・コミットは**していません**。
前回のマップ基盤（`docs/wakaba-mapkit/`）と**同じ規則・同じ目録・同じ AI の分担**で作り、二重に作らない設計にしました。名前 `wakaba-charkit` は仮です。

## 資料の一覧
| # | ファイル | 中身 |
|---|---|---|
| 00 | この README | 一覧・要約・推奨・利用者に確認すること |
| 01 | [01_既存環境調査報告書.md](01_既存環境調査報告書.md) | リポジトリにあるキャラクターの仕組み（コード製のスキン網・トゥーン・手続きアニメ・VRM/GLB の差し替え）・2D の絵・見えた/見えなかった物 |
| 02 | [02_技術比較表.md](02_技術比較表.md) | 2D→3D・シェーダー・骨・移動・動画からのモーション・口・揺れ物・戦闘の方式の比較（出典つき） |
| 03 | [03_制作フロー.md](03_制作フロー.md) | デザイン → モデル → 掃除 → 骨 → 陰影 → 動き → 試験 → 登録、動画からモーションを作る手順 1〜9 と権利の管理 |
| 04 | [04_UnrealEngine連携方式.md](04_UnrealEngine連携方式.md) | 方式 A/B/C でのキャラクターの扱い・VRM/glTF/FBX/VRMA/BVH の受け渡し・骨の対応表 |
| 05 | [05_3Dマップ基盤との統合設計.md](05_3Dマップ基盤との統合設計.md) | 地形・当たり・扉・座る・階段（`anchors`）・検証マップでのレポート |
| 06 | [06_キャラクター共通アセット構造.md](06_キャラクター共通アセット構造.md) | フォルダ・標準骨格・名前の規則・キャラクター設定の JSON スキーマ（陰影・性格の値）・だんのうらの例 |
| 07 | [07_モーションライブラリ仕様.md](07_モーションライブラリ仕様.md) | モーションの目録（mapkit の素材メタデータを拡張）・権利の門・戦闘のこまの検査・例 |
| 08 | [08_自動化可能工程一覧.md](08_自動化可能工程一覧.md) | 工程ごとの C/S/M・AI チームと n8n の役割・同時に書かない・やり直しの上限 |
| 09 | [09_必要ソフト_ライセンス_費用.md](09_必要ソフト_ライセンス_費用.md) | 版・ライセンス・費用（最小構成は 0 円） |
| 10 | [10_RTX3060Ti向け品質性能設定.md](10_RTX3060Ti向け品質性能設定.md) | キャラクターの予算（ultra/high/mid/low）・UE の出発点 |
| 11 | [11_初期検証キャラクター制作計画.md](11_初期検証キャラクター制作計画.md) | だんのうら（紫）を選んだ理由・デザインの基準表・機能 1〜12 の手順と時間 |
| 12 | [12_段階別実装計画.md](12_段階別実装計画.md) | フェーズ 0〜8 と受け入れ条件 |
| 13 | [13_テスト計画と合格基準.md](13_テスト計画と合格基準.md) | 足の滑り・めり込み・継ぎ目・口のずれ・fps の数値の線、こま送りの動画の撮り方 |
| 14 | [14_詳細実装仕様書.md](14_詳細実装仕様書.md) | Claude Code 向け：モジュール・API・データ・試験 |
| 15 | [15_ユーザー確認チェックリスト.md](15_ユーザー確認チェックリスト.md) | 利用者に確認してほしいこと（mapkit の `09` の続き） |
| – | [tools/survey_local_char.ps1](tools/survey_local_char.ps1) | 利用者の Windows で動かす、読むだけの調査スクリプト（mapkit の `survey_local.ps1` と一緒に使う・未実行） |

## 調査でわかったこと（要約）
1. 境界侵食には**骨入りのアニメ調キャラクター（コード製の 1 枚のスキン網・描画 3 回／体）・手続きの歩き（進んだ距離で位相を進める＝足が滑りにくい）・トゥーン＋リム＋殻の輪郭線・VRM/GLB の差し替えの入口（骨の名前の自動対応・試験あり）**がすでにある。良い土台。
2. 足りないのは**外部の高品質モデル・モーションのクリップと混ぜ方・IK・視線・口・表情のモーフ・顔影/髪/目の陰影・動きの品質の数値・モーションの権利の台帳**。本物の VRM は**まだ一度も読み込んでいない**（試験用の小さな glTF だけ）。
3. **だんのうらは男性**。既存の 2D の絵・イメージ資料は中性〜女性的に見える描き方があり、画像生成 AI も女性に寄せやすい → 三面図で**男性の体の特徴を数値で固定**する（`11` §3）。
4. 外部の版（検索の要約・一部は npm/PyPI で確認）：VRoid Studio v2.14.0（2026-06）・Blender 5.2 LTS・VRM Add-on for Blender v4.5.0（5.3 以上は未対応の表示）・UE 5.8（Chaos Cloth 正式版・GASP 5.8 で Motion Matching の拡張・Mover は実験的）・three 0.186.1・three-vrm／three-vrm-animation 3.5.5・wlipsync 1.3.1・MediaPipe 1.1.1・FreeMoCap 1.8.2（AGPL）。
5. 権利の要注意：**研究用の動画→モーション AI（GVHMR など）は非商用＋SMPL の商用は有料**／DeepMotion・Cascadeur の無料枠は非商用／**Mixamo・Fab は素のファイルの再配布不可＝Web で配るのは要確認**／VRoid Studio の規約の原文は未確認。
6. このクラウドは GPU なし・Blender/VRoid/UE を動かせない → **モデル制作・撮影・見た目と実機の fps は利用者の PC**。クラウドはコード・スクリプト・自動の数値・こま送りの動画（ソフト描画）・文書。

## 決定（2026-10-17・利用者の回答。mapkit と共通）
- **方式＝A・B・C 全部採用**：ブラウザ版（three-vrm・アニメ調）を続け、UE5 の高性能 PC 版も作り、素材置き場は共有。キャラクターは**正本 `.blend` から VRM（Web）と FBX／VRM4U（UE5）の両方へ**（`04` §6・[`tools/blender/vrm_to_fbx.md`](../../tools/blender/vrm_to_fbx.md)）。
- **画風**：写実は mapkit の試験マップだけ。**境界侵食のキャラクターはアニメ調のまま**（DECISIONS 2026-10-14）。UE5 版のキャラクターの見た目（トゥーンを UE で作り直すか）は B 線で決める。
- **商用あり**：非商用の道具（DeepMotion・Cascadeur の無料枠・研究用の動画 → モーション AI・商用の許可の無い SMPL）は門で止まる＝作品に使わない（比較だけ）。
- **素材の置き場所＝このリポジトリ**（`wakaba-assets/`・mapkit `10` §2）。キャラクターも `entries/character/<id>/`（原本の `.blend`・`.vroid` は Git に入れず sha256 だけ）。
- **PC**＝i7-9700・RTX 3060 Ti 8GB・16GB・SSD 512GB（確認済み）。Blender あり（版は未確認）。VRoid Studio・VRM アドオン・UE5 は未確認（`15`）。

## 以前の推奨（記録・2026-10-16）
- **作り方**：**VRoid Studio で素体 → Blender で仕上げ（標準骨格＝VRM 1.0 の humanoid＋`ext_` の骨）→ VRM で Three.js へ**。画像→3D の AI は下書き・比較だけ（主人公の本番の網には使わない）。
- **方式**：mapkit と同じく**まず A（Three.js が本番）**。UE 5.8 は「Motion Matching・Chaos Cloth の品質を見る短い試し」に使い、C へ進むかはその結果と mapkit の Q-A2 の答えで決める。**UE の採用は決めていません**。
- **動き**：ブレンドスペース＋状態機械＋歩幅の伸縮＋足・腰・手の IK＋性格の値。戦闘は**今の `data/combat.js` のこまが正**で、クリップを区間ごとに伸縮して合わせる（手触りを悪くしない）。
- **モーションの入手**：自分（または同意を得た人）が演じた動画 → ローカル（MediaPipe／FreeMoCap）→ Blender で掃除、または手付け。他人の映像は使わない。
- **口**：今の作品は声なし・字幕なので**文字 → 母音（あいうえお＝VRM の aa/ih/ou/ee/oh）**から。声を入れる時は wlipsync。
- **最初の検証キャラクター**：**だんのうら（紫の姿）**。最初の山場は「**VRoid の仮の素体を 1 体読み込んで、今の仕組みでどこまで動くかを数字で見る**」（`12` フェーズ 2）。

## 利用者に確認してほしいこと（★＝先に必要。詳しくは `15`）
- ★ **マップ基盤とキャラクター基盤、どちらを先に**（Q-P1。推奨は並行で両方の「最初の 1 歩」まで）
- ~~方式 A/B/C（Q-A2）~~ → 回答済み（A・B・C 全部）／~~収益化（Q-L1）~~ → 回答済み（商用あり）
- ★ 最初のキャラクターは**だんのうら（紫）**でよいか（Q-C1）
- ★ だんのうらの**三面図・設定画**の有無（Q-C3）／**作りかけの VRM・.vroid・Live2D・Blender のファイル**の有無（Q-C4）
- ★ **VRoid Studio・Blender・VRM アドオン**の有無と版（S11・S2・S12。`tools/survey_local_char.ps1` で一括）
- ★ **カメラの台数**（Q-C6）・**誰が演じるか**（Q-C8）
- 「わかばシステム」の中身（Q-W1）、`assets/voice` の声の権利（Q-C9）、クラウドのモーション AI に動画を上げてよいか（Q-C10）、予算・作業時間

## 次の一歩
`15` の★に答えてもらった後、フェーズ 1（スキーマ・骨の対応・検査・権利の門を試験つきで置く）に進みます。mapkit のフェーズ 1 と**同じ時期に、目録のスキーマを共通にして**進めるのが効率的です。それまでコード・ソフトには手を付けません。

## フェーズ 1 の使い方（2026-10-17 実装・コマンドはリポジトリの根で）
フェーズ 1（データの土台）を置きました。インストール不要（node 22 だけ）。素材・地図仕様・ライセンス門の道具は [`../wakaba-mapkit/00_README.md`](../wakaba-mapkit/00_README.md) の同じ節（門は mapkit と**共通の 1 つ**）。

| したいこと | コマンド | 結果 |
|---|---|---|
| **キャラクターの設定**（`<id>.character.json`）を検査 | `node tools/charkit/validate_char.mjs shinshoku/assets/characters/dannoura.character.json` | 形（陰影・性格の値を含む）＋中身（正本と体の作り：男性なら肩幅 > 腰幅などの寸法の欄・states のキー・補正の形の名前・材質の名前・ext_ の名前）＋ライセンス門の結果（表示だけ） |
| モデルの骨も照らす | `… --model tests/fixtures/charkit_test.gltf [--form purple] [--require-recommended]` | 必須 17 本・推奨（指 30 本・目・あご・肩・つま先・上胸）・ext_／socket_ の名前・姿の `extraBones` |
| 門で止まったら失敗にする | `… --strict-gate` | だんのうらの設定は今 **block**（`commercial: unknown`・`verifiedBy` が空＝人の確認待ち）なので 1 |
| **モーションのメタデータ**を検査 | `node tools/charkit/validate_anim.mjs <meta.json か フォルダ>...` | 形（素材メタデータ v1.1＋`anim`）・こまの印・`durationS`・点数の式・**戦闘のこまの照合**（`combatRef` → `shinshoku/data/combat.js`）・門の結果 |
| 試験用の人型 glTF を作り直す | `node tools/charkit/make_test_char.mjs` | `tests/fixtures/charkit_test.gltf`（61 本の骨・クリップ 4 本・同じ入力から同じバイト列） |
| 試験 | `node tests/run.mjs`（`tests/wakaba-charkit-schema・bonemap・gate・rename.test.mjs`） | – |
| VRM の骨の名前 → UE5 の名前の表（方式 C） | `node tools/charkit/export_bonemap.mjs`（`--check`） | `tools/blender/bonemap_vrm_to_ue5.json`（52 本・UE5 に無い目・あごは残す）。手順は [`tools/blender/vrm_to_fbx.md`](../../tools/blender/vrm_to_fbx.md) |

置いた物（共通＝`charkit/`、作品専用の物は作品側）：
- `charkit/schema/character.schema.json`（`06` §5）・`anim-meta.schema.json`（`07` §3＝mapkit の素材メタデータ v1.1 を `allOf` で拡張）
- `charkit/rig/bonemap.js`（`shinshoku/actor/bones.js` から移して広げた：`VRM_REQUIRED`・`VRM_RECOMMENDED`・`PROFILES`（vrm・ue5・mixamo・rigify・shinshoku17）・`matchBones`・`detectProfile`・`extBones`・`checkSkeleton`）。`bones.js` は**再輸出だけ**。2 引数の `matchBones` は移す前と同じ結果（試験で突き合わせ）
- `charkit/rig/chains.json`（骨の列・IK の 3 本・ext の鎖・socket）
- `charkit/core/validate.js`（キャラクター・モーションの中身の検査。スキーマの検査は mapkit の共通の物を使う）・`charkit/core/gltf.js`（glTF／GLB／VRM の JSON だけを読む）・`charkit/anim/combatfit.js`（戦闘のこまの照合と区間ごとの伸縮の計算）
- `shinshoku/assets/characters/dannoura.character.json`（`06` §7 の例・**値は仮**。manifest には**まだ入れていない**＝境界侵食の動きは今と同じ）
- `tools/charkit/validate_char.mjs`・`validate_anim.mjs`・`make_test_char.mjs`、`tests/fixtures/charkit_test.gltf`（gltf-validator 2.0.0-dev.3.10 でエラー・警告 0 を確認。試験は gltf-validator が入っている時だけ使い、無ければ飛ばす）

## このフェーズで決めたこと（記録）
| 日付 | 決定 |
|---|---|
| 2026-10-16 | フェーズ0 ではソフトをインストールしない・既存のファイルを変えない・コミットしない（リード Claude） |
| 2026-10-16 | 資料は `docs/wakaba-charkit/` に置く。名前は仮 |
| 2026-10-16 | 目録・ライセンス門・仕事のファイルは mapkit の物を**拡張**して使う（別に作らない） |
| 2026-10-16 | `shinshoku/`・`tests/`・`tools/`・`sw.js` は別の作業（扉の修正）が触っているので、本フェーズでは読むだけ |
| 2026-10-17 | **利用者の決定（mapkit と共通）**：方式 A・B・C 全部採用・写実は試験マップだけ（キャラクターはアニメ調のまま）・商用あり・素材の置き場所はリポジトリ。VRM → UE5 の骨の名前の付け替え（`charkit/rig/rename.js`・試験つき）と手順（`tools/blender/vrm_to_fbx.md`）を足した |
| 2026-10-17 | フェーズ 1 を実装（mapkit のフェーズ 1 と一緒）。`bones.js` の本体を `charkit/rig/bonemap.js` へ移した。`sw.js` に `charkit/`・`mapkit/` の ES モジュールの振り分けを足し、版を 2026-10-24.1 へ |
