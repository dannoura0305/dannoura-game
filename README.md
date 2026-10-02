# dannoura-game
だんのうら育成ゲーム

## 遊び方
`index.html` をブラウザで開くと遊べます。`index.html`・`style.css`・`game.js`・`assets/` は同じ場所に置いてください。

## ファイル構成
```
index.html        画面構成（HTML）
style.css         見た目（CSS）
game.js           ゲームロジック（JS）
assets/bgm/       BGM（mp3）
assets/voice/     ボイス（m4a）
assets/img/       背景・キャラ・エンディング画像（webp）
```

音声・画像を差し替えるときは `assets/` のファイルを置き換えるか、
`game.js` 内の `BGM_DATA` / `VOICE_DATA` / `BG_IMG` / `CHAR_IMG` / `SD_IMG` / `ENDING_IMG` のパスを書き換えてください。
