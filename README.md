# dannoura-game
だんのうら育成ゲーム

## 遊び方
ブラウザで遊べます：https://dannoura0305.github.io/dannoura-game/
（GitHub Pages を有効にすると、このURLで公開されます。下の「公開のしかた」を参照）

`index.html` をブラウザで開くと遊べます。`index.html`・`style.css`・`game.js`・`assets/` は同じ場所に置いてください。

## ゲームの流れ
- DAY1〜DAY30を、配信・工場の仕事・資格の勉強・育児・休息をやりくりして生き延びます。
- 次のどれかに当てはまると、その時点でゲームオーバーです。近づくと画面上部の目標欄が赤く光り、通知で知らせます。
  - 精神が0になる
  - 疲労が100で、精神が20未満
  - 借金が200万円を超える
  - 炎上が10に達する
- 30日を終えると、育て方に応じたエンディングになります。到達したエンディングはタイトル画面の「エンディング一覧」で確認できます（ブラウザに保存）。

## 夜のミニゲーム
メイン画面の「🎮 夜のミニゲーム」から、4種類のゲームを遊べます（各1日1回）。結果はパラメータに反映されます。

| ゲーム | ジャンル | 主な効果 |
|---|---|---|
| 🔥 炎上コメント撃退 | シューティング | 炎上↓ 精神↑ フォロワー↑ |
| 🔦 深夜の工場巡回 | ローグライク | 仕事評価↑ 資格知識↑ 収入↑ 怪談ネタ |
| ⚡ 配線復旧パズル | パズル | 資格知識↑ 仕事評価↑ 収入↑ |
| 🃏 配信トークバトル | カードバトル | フォロワー↑ 配信人気↑ 収入↑ |

新しいミニゲームは `minigames/` にファイルを追加し、`registerMinigame()` で登録して `index.html` に `<script>` を足すと増やせます（書き方は `minigames/core.js` の先頭を参照）。

## ファイル構成
```
index.html        画面構成（HTML）
style.css         見た目（CSS）
game.js           ゲームロジック（JS）
minigames/        夜のミニゲーム（共通部分 core.js ＋ 各ゲーム）
assets/bgm/       BGM（mp3）
assets/voice/     ボイス（m4a）
assets/img/       背景・キャラ・エンディング画像（webp）
```

音声・画像を差し替えるときは `assets/` のファイルを置き換えるか、
`game.js` 内の `BGM_DATA` / `VOICE_DATA` / `BG_IMG` / `CHAR_IMG` / `SD_IMG` / `ENDING_IMG` のパスを書き換えてください。

## 公開のしかた（GitHub Pages）
1. GitHub のリポジトリ画面で **Settings → Pages** を開く
2. **Build and deployment** の Source を **Deploy from a branch** にする
3. Branch を **main**、フォルダを **/(root)** にして **Save**
4. 1〜2分後に https://dannoura0305.github.io/dannoura-game/ で遊べるようになる

以降は `main` に変更を取り込むたびに自動で更新されます。
