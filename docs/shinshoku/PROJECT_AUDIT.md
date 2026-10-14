# PROJECT_AUDIT — 既存リポジトリ調査（フェーズ0・STEP 1／STEP 2）

調査日：2026-10-14　ブランチ：`claude/exciting-bardeen-oilbot`（HEAD `931ca8e`）
調査方法：ファイルを直接読み、`grep` で照合し、`node tests/run.mjs` を実行した（28/28 ファイル合格。調査中も別担当が `kyokai/overworld.js` などを編集中）。
表記：**【実在】**＝リポジトリにあり、読んで確かめた／**【計画のみ】**＝文書にだけある／**【不在】**＝探したが無い／**【新規提案】**＝本企画で新しく足すもの。

---

## 0. 要点（驚いた点・食い違い）

| # | 内容 | 根拠 | 扱い |
|---|---|---|---|
| A1 | 本編の「白い髪・猫耳」の姿は **疲れ果てたときの変身**として描かれ、だんのうら本人は**初めて見て驚いている**（「……なによ、これ。」「見覚えのない——耳」）。休めば紫の髪に戻る。今回の企画の「白髪＝化け猫の本来の姿、紫髪＝人間に化けた姿」と**正面からは矛盾しない**が、「本人が自分を化け猫だと知っているか」が食い違う可能性がある | `main/story.js:693-723`（`r_white`／`r_white_back`）、`docs/art-audit.md:7`、`main/homescene.js:116`（疲労75以上 or 精神25以下で変身） | OPEN_QUESTIONS Q1。本編は変えない。3D 側の解釈案を STORY_BIBLE に3案 |
| A2 | 本編の白い姿は「白（ラベンダーがかった白）髪＋**猫耳**＋**マゼンタのパーカー**」。紫の姿は「紫の髪・**めがね**・**小さなシルクハット**（ピンク）・ピンクの花の髪飾り・紫のポニーテール」 | `docs/comfyui/README.md:57,223`、`main/day31.js:133`、`docs/asset-style-guide.md:39` | 3D のキャラデザの基準。猫耳の有無は Q2 |
| A3 | 「化け猫」「164cm」「3月5日」は**リポジトリのどこにも無い**（今回の企画書が初出）。GitHub のユーザー名 `dannoura0305` は 3/5 と一致 | `grep` 結果 0 件 | STORY_BIBLE に「企画書で確定」と出典を書く |
| A4 | 『境界事象』の **九条シン** は「十数年前に**奥さんと息子**を事故で失い」「**白いものを見た**と報告して旧研究施設で消えた」「家族を失わなかった世界を4,812世界探した」。今回のラスボス（事故で配偶者を閉じ込めた研究者）と**動機・舞台（旧研究施設）が強く重なる** | `kyokai/story/ch13.js:27,64,78,128` | 同一人物にするか別人にするかは Q5（未決定）。勝手に結び付けない |
| A5 | 『境界事象』の分室は**観測・研究の部署**（職員：御堂 室長／如月ユウ 観測員／佐伯 事務／本部兼任2名）。**武器・武器庫の描写は皆無**。「境界現象対策局」は**世界C（別の歴史）にだけある未来の施設** | `kyokai/story/ch00.js:180,256,276`、`ch08.js:142-276`、`grep 武器/銃` 0件 | 「事務所の武器庫」は既存設定と合わない。代案を Q7 |
| A6 | 『境界事象』の前提は「だんのうらは**別の世界**で観測される名前も知らない男性」「主人公と長く話さない」「登場5〜10%」。3D で だんのうらと分室が**同じ町**にあると、この前提とぶつかる | `docs/kyokai/README.md` 決定事項、`docs/kyokai/game-design.md` §2,23 | 3D の町を月代町にしない案を推奨（Q4） |
| A7 | 本編エンディングは**9種**（企画書と一致）。ただし本文の一人称が「俺」（engineer/father/flame など）で、物語パートの一人称「アタシ」と違う | `game.js:1921-1931,2000-2080`、`main/story.js` の `D()`（46行） | 9種は変えない。一人称の揺れは既存の問題として Q3 に記録のみ |
| A8 | 「白い小さなもの」が3作に既にある：境界事象の**シロ**（白い小さな境界生物）、トビネズミ富山の**白い小さな影**・しるし「**白い毛のひとふさ**」、本編の白い姿 | `kyokai/battle.js`（シロ）、`tobinezumi/docs/GAME_DESIGN.md` §9 | 偶然か伏線かを**決めない**。リンク素材の候補として CROSS_GAME_LINK_SPEC に列挙 |
| A9 | トビネズミに「**砂漠の古代遺跡と巨大猫又の石像**」は**無い**。あるのは谷の奥の「苔むした古い石の標」、富山の祠・道しるべ「４４４」・バス停「７：４４」 | `tobinezumi/docs/GAME_DESIGN.md` §9、`tobinezumi/shared/toyama.js` | 新規提案として扱う（Q14）。トビネズミの方針「他作品の題名・人物名を出さない」を守る |
| A10 | 3D モデル（glTF/FBX/OBJ/VRM/blend）は**1つも無い**。3D ミニゲームは全部 three.js の箱・円柱などをコードで組み、テクスチャは canvas で描いている | `find` 結果 0 件、`minigames/factory3d.js`、`minigames/race.js:881` | 3D アセットは全部新規。最大のリスク |
| A11 | 同梱の three.js は **r158 の UMD 版**（`build/three.min.js`、r150 から非推奨・r160 で削除と警告が出る版）。アドオン（GLTFLoader 等）は**同梱なし** | `vendor/three.min.js` 先頭、`vendor/LICENSE-three.txt`（MIT） | 本作は別バージョンの ES Module 版を別フォルダに置く案（GAME_INTEGRATION_SPEC） |
| A12 | ゲームパッド対応は**どのゲームにも無い**（`getGamepads` 0件） | `grep` | 本作で新規 |
| A13 | Playwright 1.56.1 と Chromium がこの環境にあり、ヘッドレスで **WebGL2（SwiftShader）が動く**ことを確認 | `/opt/pw-browsers/chromium`、調査用スクリプトで `webgl2 ANGLE … SwiftShader` | 3D の自動テストは可能。ただし速度は実機の参考にならない |

---

## 1. ディレクトリ構成【実在】

```
index.html / game.js(約186KB) / style.css / style-home.css   本編『だんのうら30日間サバイバル』
main/            本編の拡張（story.js 30夜4幕33場面, presentation.js タイトル・OP・ED演出, day31.js, homescene.js, ui.js, mobs.js, icons.js, artpack.js, memories.js, integrations.js, home/ 家・庭 15ファイル）
minigames/       17本＋core.js（loadThree など）＋registry.js（MG_META）
kyokai.html, kyokai/   『境界事象 ― 月代町観測記録 ―』（engine/systems/battle/overworld/board/art/link, data/, story/ch00〜ch14・endings・side）
tobinezumi.html, tobinezumi/   『トビネズミMMO（仮称）』Ver.0.8（client/ ES Modules, shared/ DOMなし決定的ロジック, server/ Node22+ws+node:sqlite, docs/）
godot/           家・庭の模様替え画面の Godot 4 試作（この環境で未実行）
docs/            本編の設計・素材台帳・ComfyUI 依頼・境界事象の設計（docs/kyokai/）
assets/          bgm(mp3 8), voice(m4a 12), img(webp/svg), gen(生成PNG 258枚＋manifest), original(家・庭), kyokai(manifest), pwa
tools/           simulator.html, export_sprites.mjs, export_rpg_sprites.mjs, check_gen_assets.mjs, kyokai_contact.mjs, make_pwa_icons.mjs（Playwright 利用）
tests/           *.test.mjs 28本（node tests/run.mjs、依存なし）
vendor/          three.min.js r158 + LICENSE-three.txt
sw.js, pwa.js, manifest.webmanifest, tobinezumi.webmanifest   PWA
```
**【不在】** `shinshoku*`・共通進行ストア・3D モデル・ゲームパッド入力・ビルド設定（package.json はトビネズミのサーバーのみ）。

## 2. 技術【実在】
- **素の HTML/CSS/JS、ビルドなし**。本編・境界事象は `<script>` の順番読み込みとグローバル（`window.KY` など）。トビネズミだけ ES Modules（`<script type="module">`）。
- **公開**：GitHub Pages（`README.md`「公開のしかた」、`.nojekyll`）。https で PWA。
- **PWA**：`sw.js`（`VERSION='2026-10-14.7'`、シェル先読み＋ミニゲーム・three.js・画像は実行時キャッシュ）。`tests/pwa.test.mjs` が `index.html` と SHELL_FILES を突き合わせる。**sw.js は現在別担当が編集中のため本フェーズでは触らない。**
- **three.js**：r158 UMD、MIT。`minigames/core.js:80 loadThree()` が `<script src="vendor/three.min.js">` を遅延挿入し `window.THREE` を返す。
- **サーバー**：トビネズミのみ（`tobinezumi/server`、Node>=22.13、依存 `ws` のみ、DB は node:sqlite、Docker あり）。他はすべて静的。

## 3. 既存の 3D ミニゲーム【実在】
| 項目 | `minigames/factory3d.js`「夜勤の第三工場」 | `minigames/race.js`「原付で夜勤へ」 |
|---|---|---|
| 視点 | 一人称（目の高さ EYE、歩行の揺れ） | 三人称の追従カメラ（camPos→camLook、揺れ） |
| 描画 | WebGLRenderer、DPR 上限1.5、PCF 影、FogExp2、Lambert/Phong/Basic、加算ブレンドの光の筋 | DPR 上限1.5、**フレーム時間で DPR を自動で下げる**（`race.js:1484`）、Standard（roughness）、Fog、チャンクのリングバッファ |
| 形 | BoxGeometry 等をコードで組む。テクスチャは canvas 描画 | 同左。ライダー＝だんのうらを箱で組む（紫髪・ラベンダーの上着、`race.js:881`） |
| 入力 | WASD/矢印・E/Space/Enter、タッチは仮想スティック（左）＋行動ボタン（右、長押し） | 左右・ブレーキ、タッチは画面左右＋ブレーキボタン |
| 後片付け | `cleanup()` で WebGL コンテキスト・音・リスナーを解放 | 同様（`mg.onEnd`） |
| 敵 AI | 「影」：光を当てると焼ける・暗がりや背後から近づく（静寂→出現→追跡の3段階） | なし（障害物） |
| ホラー演出 | ビネット・粒子・走査線・赤い縁・グリッチ（CSS） | 雨・霧 |

**再利用できる知見**：DPR 自動調整、仮想スティック＋行動ボタン、CSS 重ね合わせの HUD、WebGL の後片付け、光と影の静かなホラー演出（factory3d の「影」は本作の敵 AI の原型）。

## 4. 戦闘・操作・カメラ（2D 含む）【実在】
- `minigames/rpg.js`「壇ノ浦夢譚」：ATB 戦闘（wait/active）、全5章、技の威力にスキルが効く。
- `kyokai/battle.js`：**ターン制**（シロが戦う、三すくみ属性 残響/揺らぎ/空白、負けても安定度−20でやり直し）。だんのうらは戦闘に出ない。
- `minigames/shooter.js`（炎上コメント撃退）、`runner.js`、`stealth.js`（起こさないで家事：物音ステルス）、`horror.js`（サウンドノベル、霊障ゲージ）。
- **アクション戦闘（剣・銃・回避・パリィ）の実装は無い**【不在】。

## 5. シナリオ・イベントの仕組み【実在】
- 本編：`main/story.js`。シーン定義 `{id,title,from,to,prio,bg,cond,lines}`、台本部品 `N/D/K/C/FX/when`、状態は `gs.story`（seen/flags/bond/choices/counts/log）、`window.storyFlags()` で要約。game.js の関数は**包むだけで書き換えない**方針（ファイル冒頭）。
- 境界事象：`kyokai/engine.js` の DSL（`K.say/choice/flag/gain/deduce/spot/explore/chase/battle/step`、章は `KY_STORY.register`、`K.step` で再開点）。
- **本作への示唆**：本作もデータ駆動の台本 DSL を持つ（`kyokai` の `step` 方式＝途中再開を踏襲）。

## 6. 地図【実在】
- 境界事象：`kyokai/data/maps.js`（タイル地図、場所×世界A/B/C）。場所：分室（事務室・サーバー室・観測装置室・地下）、月代商店街、住宅街、月代小学校、月代神社、河川敷、山道、廃トンネル、月代駅、**旧研究施設**、誰もいない月代町、境界現象対策局（C）。
- トビネズミ：はじまりの原・いわばの高台・すなの海・みずおとの谷・隠し「富山」（`tobinezumi/shared/world.js`、64区画）。
- 本編：町名の記述なし（`race.js` に「雨の町」「住宅街→商店街→工業道路」）。

## 7. セーブ・実績・解放・エンディング【実在】
| キー | 中身 | 書く場所 |
|---|---|---|
| `dannoura_save_slot1..3` / `dannoura_save_meta` / 旧 `dannoura_save_v1` | 本編セーブ（gs 全体、`gs.story`、`gs.endingReached` など） | `game.js:2258-` |
| `dannoura_endings` | `{type:{firstDay,firstAt,count}}` | `game.js:1932 recordEnding` |
| `dannoura_audio` / `dannoura_mg_diff` / `dannoura_mg_tab` / `dannoura_tutorial_seen` | 設定類 | game.js, minigames/core.js |
| `kyokai_save_v1` / `kyokai_save_v1_manual` / `kyokai_settings` / `kyokai_endings` / `kyokai_true_end`='1' | 境界事象 | `kyokai/engine.js:74` |
| `tobi_save_v1`（版8）/ `tobi_settings` / `tobi_token` | トビネズミ（オフライン時のみ端末保存。オンラインはサーバー SQLite、`account_flags`） | `tobinezumi/client/net.js:60` |

- **本編のエンディング（9種・確定）**：`game.js:1921 ENDING_LIST`
  | ID | 名前 | 種別 |
  |---|---|---|
  | `rebirth` | 再生エンド | 良 |
  | `king` | 深夜の王エンド | 良 |
  | `engineer` | 凄腕保全マンエンド | 良 |
  | `father` | 父親エンド | 良 |
  | `debtfree` | 夜明けエンド | 良 |
  | `normal` | 深夜の月エンド | ふつう |
  | `collapse` | 崩壊エンド | 悪 |
  | `bankrupt` | 生活破綻エンド | 悪 |
  | `flame` | 炎上崩壊エンド | 悪 |
  判定順（`triggerEnding`）：悪（collapse/bankrupt/flame）→ debtfree → engineer → father → king → rebirth → normal → collapse。**企画書の「9種」と一致。食い違いなし。** 以前の試走で見えた7種＋rebirth・king で9種。
- **実績**：本編は「状態画面の成長履歴に記録するのみ」（`game.js:1703`）。トビネズミは `ACHIEVEMENTS` 13種（`tobinezumi/shared/collect.js:131`、`toyama`・`crossover6` は secret）。境界事象は END 一覧のみ。**3作共通の実績は無い**【不在】。
- **解放**：DAY 31（`main/day31.js`：`kyokai_true_end==='1'` かつ `dannoura_endings` に9種のどれか）。境界事象側は本編セーブを**読むだけ**（`kyokai/link.js`：`hasMain/endings/best/b30/cleared`）。B-30 記録が本編結果で変わる。
- **既存の作品間連携の原則（実在）**：他作品のセーブは**読むだけ・書かない**。本作もこれに従う。

## 8. 境界事象の事務所と人物【実在】
- **特殊現象観測センター 月代分室**：町外れの小さな観測拠点。室長 **御堂**（50歳前後・白髪まじり）、観測員 **如月ユウ**（先輩）、事務 **佐伯**、本部兼任2名、主人公（新人観測員・性別不明・既定名「朝霧」）。施設：事務室・サーバー室・観測装置室・地下。
- **境界現象対策局 月代支局**：世界Cにある「分室が分室のまま終わらなかった世界」の未来施設。計画書を書いたのは九条。
- **九条シン**：分室の最初の主任。家族（妻・息子）を事故で失い、白いものを見たと報告して旧研究施設で消えた。
- **ナギ**（存在しない少女）、**シロ**（白い境界生物）、**USER_444**（正体を明かさない）。
- 数字：**2:17**（1分間の通信障害）、**2:44:44**（存在しない配信サーバーへの接続）、**444**、**B-30**、DAY01〜30、**00:00:44**（DAY31 の動画）。トビネズミ側：**4:44**、**7:44**、道しるべ「４４４」、地図の seed `4440444`。

## 9. トビネズミの地図・遺跡・素材【実在／不在】
- 実在：4地域＋富山、苔むした石の標、富山の祠・道しるべ・バス停・光る板・白い影・不思議な品6種（`dragons_card, machine_part, charm, black_feather, odd_crystal, unknown_card`）。方針「**他作品との関係も理由も決めない。題名・人物名をゲーム内に出さない**」。
- **不在**：砂漠の古代遺跡、巨大な猫又の石像。

## 10. タイトル・オープニング【実在】
- `main/presentation.js`：タイトル（`buildTitle`、海峡の夜景 canvas、メニュー：はじめから／つづきから／エンディング一覧／DAY31／境界事象／トビネズミ）、プロローグ4場面（`buildOp/startOpening/playScene`、SKIP・Esc）、日付カード、エンディング演出（変身の一拍：良い結末は白い姿→元の姿へ、`presentation.js:1240`）。
- **「エンディング到達で OP やタイトル背景が変わる」仕組みは無い**【不在】。

## 11. キャラクター画像【実在】
- 本編：`assets/img/char_{normal,happy,win,tired,fear,collapse}.webp`（tired/fear/collapse が白い姿）、`sd_*`、`ending_*`（8枚、bankrupt は collapse を流用）、脇役 SVG（班長・先生・千代さん・源さん・ミナモ・さくら・常連・ミドリ・先輩・夜鷹）、娘（`child_*.svg`）。
- 生成画像：`assets/gen/`（portrait 60・avatar 1・rpg 167・source 30、manifest）、家・庭のドット絵 `assets/original/`。
- **3D モデル・リグ・モーション：無い**【不在】。

## 12. AI・自動化・検証【実在】
- テスト：`node tests/run.mjs`（28本、依存なし、node:vm で DOM なしロジックを検証）。
- Playwright：`tools/*.mjs` が `/opt/pw-browsers/chromium` を使う。`docs/verification.md` に通しテスト（17ミニゲーム・30日・9エンディング、ページエラー0）の記録。
- 生成画像の依頼：`docs/comfyui/`（180件の依頼・プロンプト・ワークフロー雛形・検品表）、`docs/gen-art.md`、`docs/rpg-art.md`。**ComfyUI は利用者の手元で動かす前提で、この環境では実行しない**。
- Godot：`godot/README.md` に「この環境に Godot が無く未実行」と明記。
- 並行作業：複数のエージェントが同じブランチで別ファイルを編集している（今回も overworld.js 等が編集中）。

## 13. 対象プラットフォーム【実在】
PC ブラウザ・スマホ（縦向き PWA、`manifest.webmanifest` は portrait）。トビネズミはタッチ専用 UI あり。**本作（3D アクション）はスマホ縦向きでは厳しい**→ 横向き推奨・PC 優先を提案（Q10）。

---

## STEP 2 適合性の分類（再利用／改修／新規）

| 分野 | 既存 | 分類 | 方針 |
|---|---|---|---|
| 3D 描画基盤 | three.js r158 UMD | **改修（並置）** | 既存ミニゲームは r158 のまま。本作は ES Module 版を別フォルダで固定（既存を壊さない） |
| HUD・ホラー演出（ビネット・粒子・グリッチ） | factory3d の CSS | **再利用**（考え方とパラメータ） | コードはコピーせず本作の HUD モジュールで書き直す |
| DPR 自動調整・WebGL 後片付け | race.js / factory3d.js | **再利用（手法）** | 共通の `renderer.js` に実装 |
| タッチ操作（仮想スティック＋ボタン） | factory3d / tobinezumi/client/touch.js | **改修** | アクション用に多ボタン化 |
| ゲームパッド | 無し | **新規** | Gamepad API |
| 台本 DSL・途中再開 | kyokai/engine.js の `step` | **再利用（設計）** | 本作用に `SH.say/choice/flag/step` を新規実装（kyokai に依存しない） |
| 本編・境界事象・トビネズミのセーブ読み取り | kyokai/link.js | **再利用（設計）** | 読み取り専用アダプタを新規（link.js の仕様に合わせる） |
| 共通進行・実績・解放 | 無し | **新規** | `wakaba_progress_v1` |
| エンディング一覧 | game.js ENDING_LIST | **読むだけ** | 9種の ID で解放表を引く |
| 2D 立ち絵・顔 | assets/img, assets/gen | **再利用** | 会話窓の顔に流用（3D の顔とは別） |
| BGM・ボイス | assets/bgm, voice | **一部再利用** | 本編の曲は「本編の記憶」演出だけに。本作の曲は新規 |
| 3D キャラ・敵・街 | 無し | **新規** | 仮素材（プリミティブ）→ glTF |
| アクション戦闘 | 無し | **新規** | COMBAT_SYSTEM_SPEC |
| PWA | sw.js | **改修（後のフェーズ）** | 本作のファイルは実行時キャッシュ。sw.js 変更は担当と調整後 |
| テスト | node tests + Playwright | **再利用** | 本作のロジックは node:vm、3D は Playwright＋SwiftShader |
| Godot 試作 | godot/ | **使わない** | 実行確認できないため本作の基盤にしない |
