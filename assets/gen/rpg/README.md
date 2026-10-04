# assets/gen/rpg — RPG「壇ノ浦夢譚」の生成画像置き場

ここは、ChatGPT・Gemini・Midjourney・ComfyUI などで**自分で作った画像**を置く場所です。
**いまは生成画像は1枚も入っていません**（manifest の `file` はすべて `null`＝ゲームはコード描画のまま）。

| ファイル | 中身 |
|---|---|
| `manifest.json` | 差し替えられる絵の一覧（id・大きさ・コマの並び・基準点・透過・状態・`file`） |
| `ref/<id>.png` | 今のコード描画を原寸で書き出した**下絵**。img2img / ControlNet / 「この配置で描いて」の参照に使う |
| `ref/<id>@4x.png` | 同じものを4倍に拡大（人や AI に見せる用） |
| `ref/_contact.png` | 全部を並べた一覧 |
| `<id>.png` | 生成画像（あなたが置く）。例：`party.dan.png` |

## 入れ方（いちばん簡単）

1. 作った画像を、GitHub のこのフォルダ（`assets/gen/rpg/`）に **Add file → Upload files** でアップロード。名前は `<id>.png`（例 `boss.rust.png`）。
2. Claude に「`boss.rust.png` を入れたので RPG に反映して」と伝える。
   - 自分でやるなら：`manifest.json` の該当 id の `"file": null` を `"file": "assets/gen/rpg/boss.rust.png"` に書き換える。
   - 大きさがぴったりでない画像は、`node tools/export_rpg_sprites.mjs --fit boss.rust 元の画像.png --scale 2` で決まった大きさ（の2倍）に縮めて置き、manifest も書き換えてくれます。

## 決まり（短く）

- PNG。大きさは manifest の `size` の**整数倍**（1倍・2倍・4倍…）。整数倍でないものは読み込んでも使われません（コード描画のまま）。
- シートは `frames.layout` のとおり、すき間なしで横（列）・縦（行）に並べる。
- `transparent: true` は背景を完全に透明に（アルファは 0 か 255）。
- 光のにじみ（グロー）は描き込まない。ゲームが上から足します。
- 外周線は `#1b1226`、光は左上から（`docs/asset-style-guide.md`）。

詳しい依頼書（プロンプト・優先順位・ツール別のコツ）は **`docs/rpg-art.md`** にあります。
下絵とこの manifest は `node tools/export_rpg_sprites.mjs` で作り直せます（書いた `file` と `status` は消えません）。
