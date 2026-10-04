# 生成画像で脇役・リスナー・敵を差し替える（だんのうら以外）

ChatGPT・Gemini・Midjourney・ComfyUI などで**自分で作った画像**を、ゲームにそのまま差し込むための手順書です。
このリポジトリには画像生成の仕組みは入っていません。**ここにある画像はまだ1枚も生成していません**（目録の `file` はすべて `null`）。
`file` が `null` のあいだ、または画像が読めないときは、ゲームは今までどおり SVG・コード描画で動きます。

- 対象：脇役の顔グラ（班長・先生・千代さん・源さん・ミナモ・さくら・常連・ミドリ・先輩・夜鷹）、娘の顔、配信コメントのアイコン、ミニゲームの敵。
- **対象外：だんのうら（主人公）。** 画像の中にも描かないこと（紫の髪・めがね・ピンクの花の髪飾りの人物を入れない）。
- 家・庭のドット絵は `assets/original/manifest.json`（docs/comfyui/README.md §11）、RPG は `assets/gen/rpg/`（別担当）で、ここでは扱いません。
- 背景・立ち絵・エンディングなどもっと大きな一覧（180件）は [docs/comfyui/asset-requests.md](comfyui/asset-requests.md)。顔グラ・娘はそちらと**同じ id**（`portrait.hancho.normal` など）なので、詳しいプロンプト・シード・ControlNet の指定はそちらを見てください。ここでは重ねて書きません。

---

## 1. 置き方（いちばん簡単な手順）

1. 画像を作る（§3 の一覧から id を選ぶ。プロンプトは `assets/gen/manifest.json` の `positive` / `negative`）。
2. **PNG**（透過が要るものは背景を消した PNG）で保存し、ファイル名を目録の `target` に合わせる。
   例：`portrait.hancho.normal` → `assets/gen/portrait/hancho_normal.png`
3. GitHub の Web 画面でアップロードする：リポジトリの `assets/gen/portrait/`（無ければ「Add file → Upload files」でパスごと指定）に PNG をドラッグ → Commit。
4. `assets/gen/manifest.json` を Web 画面で開き（鉛筆ボタン）、その id の `"file": null` を `"file": "assets/gen/portrait/hancho_normal.png"` に書き換えて Commit。
   - 同じ名前で画像を上書きしたときは、`"rev": null` を `"rev": 2`（次は 3…）にする。オフライン保存の古い画像が使われなくなる。
5. 数分後（GitHub Pages の反映後）にゲームを開き直すと、その画像に変わる。

**手で書き換えるのが面倒なら**：PNG をアップロードしたあと、Claude に「`portrait.hancho.normal` に `assets/gen/portrait/hancho_normal.png` を入れて」と頼めば、目録の書き換えと検品までやります。

### 検品（任意）
```
node tools/check_gen_assets.mjs              # 大きさ・透過・目録との食い違いを調べる（エラーがあれば終了コード 1）
node tools/check_gen_assets.mjs --refs refs  # 生成に添付する参照画像（今の SVG・アイコン）を refs/ に PNG で書き出す
```
Playwright（このリポジトリの開発環境に入っているもの）で画像を読むので、Pillow などは要りません。

---

## 2. 画像の決まり

| 種類 | id の形 | 大きさ | 透過 | 向き・構図 | 置き場所 |
|---|---|---|---|---|---|
| 脇役の顔グラ | `portrait.<人>.<表情>` | 256×256 | する | 胸から上・正面やや斜め・頭の上に少し余白（今の SVG と同じ位置） | `assets/gen/portrait/` |
| 娘の顔 | `portrait.kid.<表情>` | 256×256 | する | 同上 | `assets/gen/portrait/` |
| 配信アイコン | `avatar.<名前>` | 128×128 | **しない**（背景ごと） | 正方形、モチーフ1つを大きく。22px に縮んでも形が分かること | `assets/gen/avatar/` |
| ミニゲームの敵 | `mg.<ゲーム>.<敵>` | 64〜256（目録の `size`） | する | 全身・中央・まわりに 8% の余白・地面や影は描かない | `assets/gen/mg/` |

- 全体の雰囲気：夜の青紫、アンバー（ランタン色）の差し色、外周線は濃い紫 `#1b1226`、光は左上から。参考画像（6枚組）の「光と色」だけを真似て、人物の顔や髪型は真似しない。
- 文字・ロゴ・署名を入れない（名前などはゲームが文字で出します）。
- コマ（`frames`）：既定は 1 枚絵。横に同じ大きさの絵を並べた PNG にして `frames` を 4 にすると、ミニゲームの敵は歩き・ゆらぎのコマとして使います（シューティングの顔は `frames: 2` で2コマ目が被弾顔）。
- `pixel: true` にすると、拡大・縮小のときにぼかさず、ドットをくっきり描きます（ドット絵で作ったとき用）。

---

## 3. 一覧（全 65 件・`assets/gen/manifest.json`）

すべての項目に `target`・`size`・`transparent`・`view`・`frames`・`positive`・`negative`・`note_ja`・`reference`（そろえる元の SVG）・`used_by`（ゲームのどこで使うか）・`fallback`（無いときの絵）が入っています。

### 3-1. 最初に作るとよい15件（`first15`）
画面に出る回数が多く、差が分かりやすい順です。

| 順 | id | 何 | 使う場所 |
|---|---|---|---|
| 1 | `portrait.hancho.normal` | 班長 ふつう | 物語・出来事の窓・ブロック・配線パズル・第三工場 |
| 2 | `portrait.kid.normal` | 娘 ふつう | 物語・出来事・夜食づくり・買い出し |
| 3 | `portrait.kid.happy` | 娘 笑顔 | 同上 |
| 4 | `avatar.tabibito` | 夜空の旅人のアイコン | 配信コメント・物語・怪談配信 |
| 5 | `avatar.hitori` | ひとりぼっちのアイコン | 同上 |
| 6 | `avatar.joren` | 深夜の常連のアイコン | 同上 |
| 7 | `avatar.sakura` | さくらのアイコン | 同上 |
| 8 | `portrait.chiyo.normal` | 千代さん ふつう | 物語 |
| 9 | `portrait.sensei.normal` | 保育園の先生 ふつう | 物語 |
| 10 | `portrait.gen.normal` | 源さん ふつう | 夜釣り |
| 11 | `portrait.midori.normal` | ミドリ ふつう | 運営会議・出来事 |
| 12 | `mg.defense.troll` | 荒らし（ディフェンス） | 荒らしディフェンス（いちばん数が多い敵） |
| 13 | `avatar.anti` | アンチのアイコン | 配信コメント |
| 14 | `portrait.hancho.happy` | 班長 笑顔 | 物語・ブロック |
| 15 | `mg.rogue.boss` | 怨霊（B3F） | 深夜の工場巡回 |

### 3-2. 全件の id
- 顔グラ（32）：`portrait.hancho.{normal,happy,worry,shout}`、`portrait.sensei.{normal,happy,worry}`、`portrait.chiyo.{normal,happy,worry}`、`portrait.gen.{normal,happy}`、`portrait.minamo.{normal,smile,closed,sad,surprise}`、`portrait.sakura.{normal,happy,sad}`、`portrait.joren.{normal,happy}`、`portrait.midori.{normal,happy}`、`portrait.senpai.{normal,happy}`、`portrait.yodaka.normal`、`portrait.kid.{normal,happy,sleep,sad,fever}`
  - プロンプト・シード・ControlNet は docs/comfyui の同じ id。
  - 目録に無い表情も足せます：例 `{"id":"portrait.hancho.tired","file":"assets/gen/portrait/hancho_tired.png"}` を `assets` に足すと、ブロックの「疲れた班長」でそれが出ます（無い表情は 近い表情 → ふつう の順で探す）。
  - ミナモは RPG でも使います。RPG 側に専用の受け口があれば、そちらが優先です。
- 配信アイコン（18）：`avatar.{tabibito,hitori,joren,sakura,fake,yodaka,gift,gem,anti,ghost,anon,exreg,kaidan,radio,music,gamer,study,factory}`
  - 名前の決まっていないリスナー（通りすがり・初見など）は、名前から決まる顔をコードで描くので、画像は要りません。
  - `fake` はさくらのなりすまし（物語の後半）。`ghost` は「（削除済み）」「???」など正体のないコメント。
- ミニゲームの敵（15）：`mg.defense.{troll,bot,anti,boss}`、`mg.rogue.{ghost,shadow,boss}`、`mg.shooter.{basic,zig,armor,split,shooter}`、`mg.cards.{troll,bot,night}`

---

## 4. 生成のコツ（道具ごと）

### ChatGPT（画像生成）・Gemini
- 1回に1枚。最初に**大きさと透過をはっきり頼む**：「256×256 の PNG、背景は透明（透過）。無理なら真っ白の無地で」。
- `reference` の SVG を PNG にして添付（`node tools/check_gen_assets.mjs --refs refs` で書き出せる）し、「この絵と同じ髪型・服・配色で、もっと描き込んだアニメ調ドット絵に」と頼む。
- プロンプトは目録の `positive` をそのまま貼ってよい（英語のタグ）。日本語の補足は `note_ja`。`negative` は「入れないでほしいもの」として文章で添える。
- 背景が透過にならなかったときは、無地の背景を指定して作り、あとで背景を消す（ブラウザの背景削除ツール・画像編集ソフトの「背景を削除」）。
- 同じ人物の表情違いは、**ふつうの画像を添付して「表情だけ変えて」**と頼むと顔がそろう。

### Midjourney
- 正方形は `--ar 1:1`、ドット感は `--style raw` ＋ `pixel art` を先頭に。参照は `--cref <ふつうの画像のURL>`（人物の統一）、`--sref`（画風の統一）。
- 背景は透過で出せないので、`plain flat background` で作ってから背景を消す。最後に目録の大きさへ縮小する。

### ComfyUI
- docs/comfyui/README.md のワークフロー（`workflow_ipadapter_controlnet.json`）を使う。`reference` の SVG を PNG にして IPAdapter（重み 0.6〜0.8）、ドット絵 LoRA（0.6〜0.9）。
- 透過は背景除去ノード（rembg / BRIA RMBG など）を最後に通す。ドット化（格子合わせ・減色）は docs/comfyui/README.md §5。
- 一括で回すときは `assets/gen/manifest.json` の `positive` / `negative` / `size` を読み込めばよい（id は prompt-pack.json と共通）。

---

## 5. 仕組み（開発者向け）

- `main/artpack.js`（index.html で `main/mobs.js` の直後に読む）が `assets/gen/manifest.json` を読み、`file` の画像を先に読み込む。読めたものだけが有効。目録が無い・壊れている・オフラインでも、何も起きずに今までの絵で動く。
- API（`window.ARTPACK`）
  - `ARTPACK.ready` … Promise（使える差し替えの数で解決。失敗しても reject しない）
  - `ARTPACK.src(id)` … 読めた画像の URL か `null`／`ARTPACK.img(id)` … 読み込み済み Image か `null`
  - `ARTPACK.has(id)`・`ARTPACK.entry(id)`・`ARTPACK.ids()`・`ARTPACK.onReady(fn)`
  - `ARTPACK.draw(ctx, id, x, y, w, h, {frame, smooth})` … canvas に描けたら `true`
- つないでいる場所
  - `main/mobs.js` の `mobPortrait(id, face)`：`portrait.<id>.<頼んだ表情>` → `portrait.<id>.<近い表情>` → SVG の順。`mobImage`・`mobImgTag`・出来事の窓（`mobEvPortrait`）も同じ関数を通るので、物語・ミニゲームの会話窓すべてに効く。
  - 娘：読み込み後に `CHILD_IMG`（game.js）の中身を `portrait.kid.<表情>` に差し替える。
  - 配信コメント（game.js `addComment`）・ステータスのリスナー詳細・怪談配信のコメント（minigames/horror.js）：`listenerAvatarHTML(name, tp)` → `avatar.<key>` → コードのアイコン。
  - 物語の会話窓のリスナー（main/story.js `portraitHTML`）：`avatar.<話し手>`（なりすましは `avatar.fake`）。
  - ミニゲーム：defense `drawEnemy`、roguelike `drawGhost`、shooter `drawFace`、cardbattle `drawEnemy`。
- `rev` を付けると URL に `?v=<rev>` が付く（service worker は画像を保存して使い回すので、上書きのときは `rev` を上げる）。目録（`assets/**/manifest.json`）自体は sw.js でネット優先にしてある。
- テスト：`node tests/artpack.test.mjs`（目録の形・null なら今までどおり・差し替えの優先順位）。
