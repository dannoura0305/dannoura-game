# 『境界侵食』（仮題）設計資料 — フェーズ0

『だんのうら30日間サバイバル』に組み込む新作 3D ホラーアクションの、調査・設計の資料と開発の記録です。

## いまの状態（2026-10-14）
- **フェーズ1（3D の土台）＋フェーズ2（紫の姿の戦闘・遊べる切片）を実装**。入口は `shinshoku.html`（本編タイトルの「境界侵食」ボタンからも開ける）。
- 中身・操作・受け入れ結果・VRM の差し替え方・制限は **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)**。
- 確認：`node tests/run.mjs`（本作のテスト 3 本を含む）、`node tools/shinshoku_play.mjs <出力先>`（Playwright の通しプレイ・PC 1280×800／スマホ横 844×390）。
- 実機（利用者の PC・スマホ）での fps・手触りは**未検証**。`shinshoku.html?perf=1` で測ってください。

作成：2026-10-14（ブランチ `claude/exciting-bardeen-oilbot`）

## 表記
- **【確定・企画書】** 開発者の企画書で決まっていること
- **【確定・既存】** リポジトリの既存作品で既に決まっていること（変えない）
- **【提案】** この資料の案（承認待ち）
- **【未決定】** 決めていない・保留（OPEN_QUESTIONS の番号）
- **【原文・確定】** 一字一句変えない台詞

## 読む順番
| # | ファイル | 中身 | 企画書の STEP |
|---|---|---|---|
| 1 | [PROJECT_AUDIT.md](PROJECT_AUDIT.md) | 既存リポジトリの調査（ファイルの根拠つき）・食い違い・再利用／改修／新規の分類 | STEP 1・2 |
| 2 | [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) | 開発者への質問（優先度・仮の進め方つき） | STEP 6 |
| 3 | [GAME_INTEGRATION_SPEC.md](GAME_INTEGRATION_SPEC.md) | エンジンの比較と推奨（Three.js ES Module 版）・組み込みの形・仮素材・性能目標 | STEP 3 |
| 4 | [3D_GAME_DESIGN.md](3D_GAME_DESIGN.md) | ゲームデザインの概要・柱・3D 表現の要件・寄り道 | – |
| 5 | [STORY_BIBLE.md](STORY_BIBLE.md) | 設定（確定と未決定を分けて） | – |
| 6 | [SCENARIO_FLOW.md](SCENARIO_FLOW.md) | 章立て・出来事・決め台詞（原文） | – |
| 7 | [ROUTE_BRANCH_SPEC.md](ROUTE_BRANCH_SPEC.md) | 2ルートの状態変数・分岐の再現記録・詰み防止 | – |
| 8 | [COMBAT_SYSTEM_SPEC.md](COMBAT_SYSTEM_SPEC.md) | 3つの形態・一閃5種・見切り・持ち替えの時間・入力（PC／パッド／タッチ） | – |
| 9 | [WEAPON_SYSTEM_SPEC.md](WEAPON_SYSTEM_SPEC.md) | 武器・金庫（番号は仮）・法律上の疑問・装備・独自武器の評価 | – |
| 10 | [ENEMY_AI_SPEC.md](ENEMY_AI_SPEC.md) | 異形8種の意味と状態機械・解決4種 | – |
| 11 | [LEVEL_DESIGN_SPEC.md](LEVEL_DESIGN_SPEC.md) | 12の場所・つながり・鍵・仕掛け・調査（必須／任意）・商店街の3状態 | – |
| 12 | [CUTSCENE_SPEC.md](CUTSCENE_SPEC.md) | 主な演出場面（カメラ・台詞・音・入力） | – |
| 13 | [CROSS_GAME_LINK_SPEC.md](CROSS_GAME_LINK_SPEC.md) | 作品間のつながりの契約・読み取り専用アダプタ・解放表・作中の知識とメタ知識 | – |
| 14 | [SAVE_DATA_SPEC.md](SAVE_DATA_SPEC.md) | セーブの形（JSON 例）・共通の進行 `wakaba_progress_v1`・版と移行 | – |
| 15 | [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | フェーズ0〜10（入る条件・受け入れ基準・確かめ方・見積もり・リスク）・最初の遊べる切片 | STEP 4・5 |
| 16 | [TEST_PLAN.md](TEST_PLAN.md) | 検証の計画（node テスト・Playwright・実機） | – |
| 17 | [DECISIONS.md](DECISIONS.md) | 開発者の決定事項（最優先） | – |
| 18 | [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) | 実装の記録（フェーズ1・2）・操作・VRM の差し替え・制限・次の作業 | – |

## 要約
- **既存の本編エンディングは9種で企画書と一致**（`game.js:1921`）。変えません。
- **大きな食い違い・要確認**：白い姿の本人の自覚（Q1）、舞台の町と『境界事象』の前提（Q4）、ラスボスと九条シンの重なり（Q5）、拳銃と武器庫の理由（Q7）、相棒の名前（Q8）。
- **推奨エンジン**：Three.js（ES Module 版を版固定で同梱。既存 r158 はそのまま）。この環境の Playwright＋Chromium で WebGL2 が動くことを確認済み＝自動テストできる。
- **最初の遊べる切片**：紫の姿で短い商店街（移動・刀・銃・持ち替え・回避・見切り一閃・弾き一閃・帰路の AI・救う/倒す）。
