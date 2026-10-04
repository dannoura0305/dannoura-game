# 操作アイコン一覧（フェーズ3 §1）

本編UIで「操作のための記号」として使っていた絵文字・記号と、その置き換え先。
アイコンは `main/icons.js`（`window.ICONS`）がキャンバスに描く独自のドット絵。
物語の本文・配信コメント・イベント本文・エンディング本文の絵文字はそのまま残す。

## しくみ

| 項目 | 内容 |
|---|---|
| 原寸 | 16×16 ドット（中身 13×13＋外周線 `#1b1226`＋右下 1 ドットの落ち影 `rgba(27,18,38,.45)`）。光源は左上 |
| 色 | `docs/asset-style-guide.md` のパレット（`main/home/sprites.js` の `HOME_ART` と同じ）。足した色：濃いアンバー `#a8601e`、淡い赤 `#ff9a9a`、肌 `#ffe4d0` `#f4bca4`、娘の髪 `#3a2440` `#6a4a7a` |
| 拡大 | 表示サイズ×devicePixelRatio に最も近い**整数倍**で描いてキャッシュ（`image-rendering:pixelated`） |
| API | `ICONS.canvas(name,px)`／`ICONS.url(name,px)`（dataURL・キャッシュ）／`ICONS.html(name,px,label)`（`<img class="ic" alt>`、label なしは `aria-hidden`）／`ICONS.names()`／`ICONS.has(name)`／`ICONS.fromEmoji(e)`／`ICONS.lead(text)`／`ICONS.deco(text,px)`。未定義の名前は「？」（`unknown`） |
| 別名 | ミニゲーム id：`rogue`→roguelike、`cards`→cardbattle。行動 id：`rest_light`→tea、`rest_deep`→sleep、`childcare`→child、`singpractice`→music、`minigames`→minigame、`diag`→thermo、`factoryneta`→radio、`deepnight`→night |
| 文字ラベル | アイコンだけのボタンは作らない。もとの文字はすべて残し、アイコンの横に並べる（例外：もともと記号だけだった上部バーの歯車ボタンは `aria-label="設定"` のまま） |

### 画像の差し替え（ComfyUI 生成物などの受け口）

1. `assets/original/icons/<name>.png` を置く（正方形、16×16 の整数倍を推奨。透明背景）。
2. `assets/original/icons/index.json` の配列に `<name>` を足す（例：`["stream","work"]`）。
3. 起動時に一覧の PNG を先読みし、読み込めたものだけ差し替える（`ICONS.overridden()` で確認）。読み込み失敗・一覧にないものはコード描画のまま。表示済みの `<img class="ic">` も自動で描き直す。
   - 一覧ファイルを使うのは、全アイコン分の 404 を毎回出さないため。`file://` で開いたときは差し替えなし。

## アイコン一覧（`ICONS.names()`、87 種）

| 区分 | 名前 |
|---|---|
| 行動 | stream（配信・マイク）, work（工場・レンチと歯車）, study（資格・本）, child（子育て・娘の顔）, rest（休む・月と枕）, tea（少し休む）, sleep（しっかり休む・布団）, home（家・庭）, minigame（ゲームパッド） |
| 画面・操作 | stats, skills（星）, settings（歯車）, save（フロッピー）, load（フォルダ）, close, back, next, play, help, music, voice, se（ベル）, sound, mute, target, thermo, eye, check, trash, copy, share, calendar, growth, thought, medal, trophy, gift, paw, ghost, radio, factory, lock, unknown |
| 値 | money（硬貨・円）, debt（硬貨＋赤い下向き矢印）, mental（ハート）, fatigue（電池）, flame（炎）, followers（人）, rank（王冠）, night（月）, time（時計）, sp（紫の結晶）, hope |
| 記録 | endings（本）, memories（写真） |
| 通知の種類 | info, warn, good, bad |
| ミニゲーム 17 | shooter, roguelike, puzzle, cardbattle, runner, defense, rpg（灯籠）, stealth（猫）, quiz, horror, factory3d, cooking, escape, blocks, manager, fishing, race |
| ミニゲームのカテゴリ | all, action（稲妻）, brain（電球）, story（巻物）, life（葉） |
| 素材（家・庭） | wood（丸太と板）, cloth（たたんだ布と針）, metal（ナット）, sea（貝殻と海のガラス）, seed（種の袋）。別名 `mat.wood` などと `seeds`。同じ絵を `HOME_ART.icon('mat.wood')` などでも描く（main/home/sprites.js） |

## 置き換えの一覧

| 場所 | もとの記号 | 意味 | アイコン | 置換 | 実装 |
|---|---|---|---|---|---|
| 下部ナビ | 🏠 🔧 📡 📊 ⭐ | メイン／工場／配信／状態／スキル | home, work, stream, stats, skills | ○ | ui.js `iconizeStatic` |
| 上部バー 見出し | （なし）精神・疲労・RANK | 値の見出し | mental, fatigue, rank（12px） | ○（追加） | ui.js |
| 上部バー 2段目 | 💸 🔥 💴 ⚙ | 借金／炎上／所持金／設定 | debt, flame, money, settings | ○ | ui.js |
| 今日の目標 | 🎯＋文頭の絵文字（📡 ☕ 🚨 など） | 目標・警告 | 文頭の絵文字をアイコン化（付いたら🎯は隠す） | ○ | ui.js `updateDailyGuide` を包む |
| 行動メニュー（buildChoices） | 📡 🔧 🌡 ☕ 🛏 📚 👶 🎤 🎮 🏡 🗣 🌑 | 各行動 | stream, work, thermo, tea, sleep, study, child, music, minigame, home, radio, night | ○ | ui.js `richButton`（行動 id を優先、なければ絵文字） |
| 配信タイプ・配信の選択肢 | 🎙️ 👻 🎵 🎮 📚 🏭 📻 | 雑談／怪談／歌／実況／勉強／工場／ラジオ | stream, ghost, music, minigame, study, factory, radio | ○ | ui.js `observeStream` |
| 配信画面のステータス | 👁 👥 💜 🔥 💫 | 視聴者／フォロワー／配信人気／炎上／精神 | eye, followers, sp, flame, mental | ○ | ui.js |
| 設定 | 🎵 🗣 🔔 🎮 🔇/🔊 📘 | BGM／ボイス／効果音／難しさ／ミュート／遊び方 | music, voice, se, minigame, mute/sound, help | ○ | ui.js（ミュート切替後も再適用） |
| 状態画面 見出し | 📊 💾 🌱 💭 💴 😴 🔧 👥 📖 🏅 📅 | 各セクション | stats, save, growth, thought, money, fatigue, work, followers, endings, medal, calendar | ○ | ui.js `openStatus` を包む |
| スキル画面 見出し | ⭐ 🔧 📡 💫 👶 | カテゴリ | skills, work, stream, mental, child | ○ | ui.js `openSkill` を包む |
| 工場ミニ・診断ミニの見出し | ⚙ 🌡 | 設備点検／温度・振動診断 | settings, thermo | ○ | ui.js |
| 通知（showNotif） | 文頭の絵文字 | 種類 | 対応表で変換、絵文字なしは info、⚠/🚨 は warn、✅ は good、❌ は bad | ○ | ui.js `showNotif` を包む |
| 結果画面の見出し | 文頭の絵文字（⚙ 🔧 🌡 📊 🎵 など） | 結果 | 対応表で変換 | ○ | ui.js `showResult` を包む |
| ミニゲーム選択 タブ | （なし） | すべて／アクション／頭脳・戦略／物語／暮らし・癒し | all, action, brain, story, life | ○（追加） | core.js |
| ミニゲーム選択 カード | 各定義の icon（🔥 🔦 ⚡ 🃏 🏃 🛡 🌊 🤫 📝 👻 🏭 🍳 🔐 🧱 📈 🎣 🛵） | ゲーム | 17 ジャンルのアイコン | ○ | core.js `mgIconHTML` |
| ミニゲームの見出し | 同上 | ゲーム名 | 同上 | ○ | core.js `MG.open` |
| ミニゲームの終了ボタン | 「終了」「もう一度で終了」 | 中断 | close／warn（追加） | ○ | core.js |
| タイトルメニュー | 📖 ⚙（ほかは文字のみ） | はじめから／つづきから／エンディング一覧／設定 | play, load, endings, settings | ○ | presentation.js `relabel` |
| エンディング後の共有ボタン | 📤 | 結果カード | share | ○ | presentation.js |
| 共有パネル・エンディングのボタン | 📋 🌙 ← 🏡 | コピー／まだ夜を続ける／戻る／暮らしを続ける | copy, night, back, home | ○ | ui.js |
| 𝕏 で共有 | 𝕏 | X のロゴ文字 | — | ×（他社のマークは描かない） | — |
| 左下の音声表示・BGM表示 | 🔇 🔊 ♪ | 音声の状態（小さな等幅表示） | — | ×（文字列を game.js が毎回書き換えるため） | — |
| 場面の大きな絵（scene-bg）、配信画面の大きなマイク | 🌙 🛋️ 🎙️ など | 場面の挿絵 | — | ×（挿絵。操作記号ではない） | — |
| 育成タイプの印 | 📡 ⚙ 🌊 👶 | 人物の傾向 | — | ×（人物描写） | — |
| リスナー詳細の 🛡 🔴 💜、スキルの ✓ | 文中の記号 | 文章の一部 | — | × | — |
| イベント窓の見出し（👶 子どもが発熱 など） | 物語の見出し | — | — | ×（イベント本文扱い） | — |
| エンディングの大きな絵・本文、共有テキスト | 🌅 🐾 など | 物語 | — | × | — |
| 配信コメント・ギフト表記 | 🎁 💎 💜 | コメント本文 | — | × | — |
| 思い出帳（main/memories.js）・家と庭の画面（main/home/*） | 📖 ほか | — | — | ×（担当外。家・庭の UI は `HOME_ART.uiIcon` を使用済み） | — |
| 素材の表示（クラフトの所持・必要数、家の改修） | 🪵 🧵 🔩 🐚 | 木材・布・金具・海のかけら | HOME_ART.icon('mat.*')（ドット絵＋名前の文字） | ○ | main/home/interactions.js `matTag` |
| 素材の通知（工場・子育て・釣り・RPG・暮らしの一日） | 文頭の 🪵 🧵 🔩 🐚 | 素材を手に入れた | wood, cloth, metal, sea | ○ | 本編の通知は ui.js `iconNotif`（`ICONS.lead` の対応表）、家の画面のトーストは `HOME.ui.toast` が文頭の絵文字をアイコンに置き換える。🔩 は以前 work に対応していたが metal に変えた（設備更新のイベント見出しなどもナットの絵になる） |
| タイトルのセーブスロット | 📂 🗑 ✖ 🏡 | つづきから・削除・閉じる・暮らし | load, trash, close, home, play, endings | ○ | game.js `renderSlotPicker` |

## 確認

- スマホ 390×780・PC 1280×800 で、メイン・メニュー・状態・スキル・設定・ミニゲーム選択・ミニゲームの見出し・結果画面・配信画面・通知を目視（Playwright）。ページエラー 0。
- 差し替えは `index.json` に `stream` を載せ、赤い PNG を返すルートで確認（`ICONS.overridden()` が `["stream"]`、描画結果が PNG の色）。
