# assets/gen — 生成画像の置き場所（だんのうら以外）

ここに置いた PNG を `manifest.json` の `file` に書くと、ゲームがその画像を使います（`main/artpack.js`）。
`file` が `null`・読めないときは、今までどおりの SVG・コード描画です。**今は1枚も入っていません。**

```
assets/gen/
  manifest.json      目録（id・置き場所・大きさ・透過・プロンプト）
  portrait/          脇役と娘の顔グラ 256×256 透過   例 hancho_normal.png
  avatar/            配信コメントのアイコン 128×128 背景あり   例 tabibito.png
  mg/                ミニゲームの敵 透過   例 defense_troll.png
  rpg/               RPG 用（別担当。ここの manifest.json では扱わない）
```

手順・一覧・生成のコツは [docs/gen-art.md](../../docs/gen-art.md)。
置いたら `node tools/check_gen_assets.mjs` で大きさと透過を確かめられます。
同じ名前で上書きしたときは、その項目の `rev` を 1 つ上げてください（古い画像のキャッシュを避ける）。
