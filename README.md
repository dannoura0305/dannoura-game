# dannoura-game
だんのうら育成ゲーム

## 遊び方
`index.html` をブラウザで開くと遊べます。`index.html` と `assets/` フォルダは同じ場所に置いてください。

## ファイル構成
```
index.html        ゲーム本体（HTML / CSS / JS）
assets/bgm/       BGM（mp3）
assets/voice/     ボイス（m4a）
assets/img/       背景・キャラ・エンディング画像（webp）
```

音声・画像を差し替えるときは `assets/` のファイルを置き換えるか、
`index.html` 内の `BGM_DATA` / `VOICE_DATA` / `BG_IMG` / `CHAR_IMG` / `SD_IMG` / `ENDING_IMG` のパスを書き換えてください。
