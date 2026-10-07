# RPG「壇ノ浦夢譚」の絵：生成画像の依頼書と差し替え手順

対象：`minigames/rpg.js`（見下ろし型RPG）。人物・夢の住人・敵とボス・タイル・小物・一枚絵の背景・顔窓。
**このリポジトリの環境には画像を生成する仕組みがありません。ここにある画像はすべてコードで描いた絵の書き出し（下絵）です。** 生成はあなたが ChatGPT・Gemini・Midjourney・ComfyUI などで行い、できた PNG をここに書いた手順で入れてください。

- 差し替え口：`assets/gen/rpg/manifest.json`（全 76 件。既定はすべて `file: null`＝コード描画）
- 下絵（参照PNG）：`assets/gen/rpg/ref/<id>.png`（原寸）・`<id>@4x.png`（4倍）・`_contact.png`（一覧）
- 書き出し・取り込みの道具：`tools/export_rpg_sprites.mjs`
- 確かめるテスト：`tests/rpg-art.test.mjs`（`node tests/run.mjs` に含まれる）
- 画風の決まり：`docs/asset-style-guide.md`（外周線 `#1b1226`・左上の光・パレット）

---

## 1. しくみ

1. `rpg.js` は RPG を開いたときに一度だけ `assets/gen/rpg/manifest.json` を読みます（ふつうの fetch。失敗しても何も起きない。オフラインでも service worker の保存分で動く。`file://` で開いたときは読まない）。
2. `file` に PNG が書いてある id だけ画像を読み込み、**大きさが `size` の整数倍のとき**だけ、コード描画の代わりにその画像を描きます。倍率は横幅から自動で判定し、最近傍（ぼかさない）で原寸に戻して描きます。
3. 読めない・大きさ違い・パスがおかしい（`assets/gen/rpg/` の外、`..`、http など）ものは黙って無視し、コード描画のままです。
4. 画像が描かれても、次のものはゲーム側が上から重ねます：光のにじみ（灯籠・ミナモ・敵の光）、鉄錆の番人の「装甲」の六角の膜、ダメージの数字、眠りの z、⚠ など。**画像には描き込まない**でください。

| 種類 | id | 1コマ | 並び | 基準点（コマの中） |
|---|---|---|---|---|
| 仲間（歩く人） | `party.dan` `party.danT` `party.mina` | 24×32 | 列＝歩き4コマ・術(cast)・勝ち(win)／行＝下・左・右・上向き | (12, 28)＝足元の中心 |
| 夢の住人・娘 | `npc.kidOut` `npc.kidHome` `npc.miyako` `npc.worker` `npc.teacher` `npc.sleeper` | 24×32 | 同上 | (12, 28) |
| 魚の子 | `npc.fish` | 16×12 | 2コマ（尾びれ）・右向き（左は反転） | 中心 |
| 敵・ボス | `enemy.*` `boss.*` | 正方形（敵ごと） | 4コマの待機アニメ（横） | 中心＝体の中心 |
| タイル | `tile.<テーマ>` | 16×16 | 13列：床4種・道・飾り床・板・壁の面・天井・水・闇・コンベア・柵 | 左上 |
| 小物 | `prop.*` | 横＝マス数×16、縦＝マス数×16＋24 | 状態ごと（宝箱 closed/open など）か、動く小物は2コマ | 上に24ドットのはみ出し。タイルの左上＝(0, 24) |
| 一枚絵の背景 | `bg.menu` `bg.dawn` `bg.abyss` | 270×480（縦長） | 1枚 | 画面いっぱいに整数倍で拡大して中央を切り抜く |
| 顔窓 | `portrait.mina`（5表情）・`portrait.fish` ほか | 76×76 | 表情ごとに横 | 窓いっぱい（表示は2倍） |

- 敵の1コマの大きさ＝（絵の大きさ `s`×1.5＋4 を偶数に切り上げ）。例：錆びた蟹 40×40、鉄錆の番人 104×104、名無しの観測者 124×124。
- 小物の状態：`chest` closed/open、`toro` lit/dim、`panel` broken/fixed、`mailbox` letters/empty、`biglantern` lit/taken、`window` `futon` night/morning、`press` running/stopped、`nursery` dark/lit、`vortex` storm/calm。そのほかの動く小物は f0/f1 を交互に表示。

---

## 2. 共通の決まり（検品のときもこれを見る）

- **主人公はだんのうら**：紫の長い髪、黒い四角の眼鏡、ピンクの小さなシルクハット、ピンクの5枚花びらの髪飾り、ラベンダーの上着＋ピンクのボーダーのシャツ、プラム色のズボン。参考画像の「ハル」（短髪の男性）の顔・髪型は**写さない**（雰囲気＝夜の青紫・アンバーの灯り・ティールの海だけ参考に）。
- 疲れ切った夜の姿（`party.danT`）だけは白い髪・猫耳・マゼンタのパーカー（設定どおり）。
- **ミナモ**：半透明の少女の霊。水色の長い髪が水に流れる、貝の髪飾り（ピンク）、白い寝間着に桜色のリボン、すそが水に溶けて消える。
- ドット絵（仲間・住人・敵・タイル・小物）：外周線 `#1b1226` の1ドット、光は左上、アンチエイリアスなし、アルファは 0/255、背景は透明（タイル・背景・顔窓は不透明）。
- 文字・ロゴ・署名・透かしを入れない（看板の文字もなし）。
- 大きさは `size` の整数倍。縮めるときは「平均で縮めて → 最近傍で整数倍に戻す」。

### 共通のタグ（そのまま貼る）

- **STYLE（ドット絵）**：`16-bit JRPG pixel art, SNES era top-down 3/4 view, crisp pixels, 1px dark purple outline (#1b1226), light from top-left, limited palette, no anti-aliasing, clean grid-aligned sprite sheet, transparent background`
- **WORLD**：`dreamlike sunken city under the night sea, deep indigo and teal water, amber lantern light, marine snow, light shafts from above, soft bubbles`
- **DAN**：`adult man, androgynous young man, father, long purple hair, small pink mini top hat tilted on his head, pink five-petal flower hair ornament, black square glasses, lavender open jacket, pink striped shirt, plum trousers, white shoes`
- **DAN_T**：`same young man in his exhausted form, lavender-white long hair, white cat ears with pink inside, magenta hoodie, black square glasses, pink flower hair ornament`
- **MINA**：`translucent ghost girl, pale aqua long flowing hair drifting in water, pink seashell hair ornament, white nightgown with small pink ribbon, hem dissolving into water, faint cyan glow, gentle eyes`
- **NEG（共通のネガティブ）**：`blurry, anti-aliasing, smooth gradient shading, painterly, 3d render, photo, realistic, text, letters, logo, watermark, signature, frame, border, background scenery (for sprites), cropped, cut off, inconsistent cell size, misaligned grid, extra limbs, deformed hands, jpeg artifacts, glow baked in`
- だんのうら用に足す NEG：`short hair, male, boy, brown hair, no glasses, hoodie (normal form)`

---

## 3. 入れ方（いちばん簡単な順）

### A. GitHub にアップロードして、Claude に伝える
1. 画像のファイル名を `<id>.png` にする（例：`party.dan.png`、`boss.rust.png`）。
2. GitHub のリポジトリで `assets/gen/rpg/` を開き、**Add file → Upload files** で置いて Commit。
3. Claude に「`assets/gen/rpg/party.dan.png` を入れたので RPG に反映して」と伝える。Claude が大きさを確かめ（ずれていれば整えて）、manifest の `file` を書き、画面で確認します。

### B. 自分で manifest を書く
1. PNG を `assets/gen/rpg/<id>.png` に置く（`size` の整数倍に整えておく）。
2. `assets/gen/rpg/manifest.json` の該当 id を書き換える：
   ```json
   { "id": "party.dan", ..., "status": "wip", "file": "assets/gen/rpg/party.dan.png" }
   ```
3. ブラウザで **http(s)** で開いて確認（GitHub Pages か `python3 -m http.server`）。強制再読み込み（スマホはタブを閉じて開き直す）。
4. 問題なければ `status` を `done`（検品済みなら `verified`）に。

### C. 大きさが合わない画像を整える（手元で node が使えるとき）
```sh
node tools/export_rpg_sprites.mjs --fit party.dan ~/Downloads/dan_sheet.png --scale 4
```
- 縦横比が違えば中央で切り抜き、平均で縮めて `size`×4 にぴったり合わせ、`assets/gen/rpg/party.dan.png` に書いて manifest の `file` も設定します（`status` は `wip`）。透過の素材はアルファを 0/255 に。
- 最後の微調整（ずれたドット・外周線）は Aseprite / LibreSprite / Piskel などで手直し推奨。

### 戻すとき
manifest の `file` を `null` に戻すだけ（画像ファイルは消さなくてよい）。

---

## 4. 生成ツール別のコツ

### ChatGPT（画像生成）・Gemini（画像生成）
- **下絵（`ref/<id>@4x.png`）を添付して**「この配置・この大きさの枠のまま、絵だけ描き直して」と頼むのが一番そろいます。
- 頼み方の例：
  > 添付のスプライトシートと同じ **6列×4行・すき間なし・各コマ同じ大きさ** のドット絵シートを、**透過PNG** で作ってください。列は左から歩き4コマ・魔法を使うポーズ・勝利ポーズ、行は上から下向き・左向き・右向き・上向き。足元の高さは全コマでそろえる。外周線は濃い紫 #1b1226 の1ドット、光は左上から。文字は入れない。キャラクター：（DAN のタグ）
- 出てきた画像はたいてい 1024px 前後で、格子が少しずれます。→ §3 の C（`--fit`）で縮め、ずれたドットを手直し。
- 透過にならなかったら「背景を完全に透明に」ともう一度頼むか、背景除去してからアルファを2値化。
- 1枚で全コマがそろわないときは、行ごと（向きごと）に作って横に並べてもよい。

### Midjourney
- 透過とぴったりの格子は苦手。**1体（1ポーズ）ずつ** `--ar 3:4`（人物）や `--ar 1:1`（敵）で作り、背景除去してから切り出して並べる。
- 例：`/imagine （DAN）, (STYLE), single character, front view, full body, plain flat background --ar 3:4 --style raw --stylize 50`
- 参照の一貫性は `--cref`（キャラ参照）に `assets/img/char_normal.webp` などを使う。下絵は `--sref` ではなく、構図合わせに image prompt で。
- 生成後：切り抜き → `--fit` で縮小 → 手直し。

### ComfyUI
- アニメ系 SDXL＋ピクセルアート LoRA（重み 0.6〜0.9）。`docs/comfyui/README.md` の §1〜§5 と同じ手順。
- **下絵 `ref/<id>@4x.png` を ControlNet（lineart / canny / tile）に**入れると、コマの位置と大きさがそろいます（強さ 0.5〜0.8、終了 0.7）。img2img（denoise 0.45〜0.65）でも可。
- 生成は 8倍前後（例：仲間のシート 144×128 → 1152×1024）で行い、最後に **最近傍（nearest-exact）で原寸の整数倍に縮小**、パレット減色（`docs/comfyui/README.md` §5 のスクリプト）。
- シードと参照画像を固定して、表情差分・向き差分を作る。

---

## 5. 優先トップ15（この順に作ると効果が大きい）

| # | id | 保存先 | 大きさ（1倍） | 並び | 透過 | 向き | 下絵 |
|---|---|---|---|---|---|---|---|
| 1 | `party.dan` | `assets/gen/rpg/party.dan.png` | 144×128（1コマ24×32） | 6列×4行 | ○ | 行＝下・左・右・上 | `ref/party.dan@4x.png` |
| 2 | `party.mina` | `assets/gen/rpg/party.mina.png` | 144×128 | 6列×4行 | ○ | 同上 | `ref/party.mina@4x.png` |
| 3 | `portrait.mina` | `assets/gen/rpg/portrait.mina.png` | 380×76（1コマ76×76） | 5表情：normal smile sad surprise closed | × | 正面 | `ref/portrait.mina@4x.png` |
| 4 | `bg.menu` | `assets/gen/rpg/bg.menu.png` | 270×480（540×960 推奨） | 1枚 | × | 縦長 | `ref/bg.menu@4x.png` |
| 5 | `boss.rust` | `assets/gen/rpg/boss.rust.png` | 416×104（104×104） | 4コマ | ○ | 正面 | `ref/boss.rust@4x.png` |
| 6 | `boss.bubble` | `assets/gen/rpg/boss.bubble.png` | 368×92（92×92） | 4コマ | ○ | 正面 | `ref/boss.bubble@4x.png` |
| 7 | `boss.debt` | `assets/gen/rpg/boss.debt.png` | 440×110（110×110） | 4コマ | ○ | 正面 | `ref/boss.debt@4x.png` |
| 8 | `boss.sheep` | `assets/gen/rpg/boss.sheep.png` | 400×100（100×100） | 4コマ | ○ | 右を向いた横向き | `ref/boss.sheep@4x.png` |
| 9 | `boss.watcher` | `assets/gen/rpg/boss.watcher.png` | 496×124（124×124） | 4コマ | ○ | 正面 | `ref/boss.watcher@4x.png` |
| 10 | `tile.ruins` | `assets/gen/rpg/tile.ruins.png` | 208×16（16×16） | 13列 | × | 見下ろし | `ref/tile.ruins@4x.png` |
| 11 | `tile.factory` | `assets/gen/rpg/tile.factory.png` | 208×16 | 13列 | × | 見下ろし | `ref/tile.factory@4x.png` |
| 12 | `tile.coral` | `assets/gen/rpg/tile.coral.png` | 208×16 | 13列 | × | 見下ろし | `ref/tile.coral@4x.png` |
| 13 | `tile.lantern` | `assets/gen/rpg/tile.lantern.png` | 208×16 | 13列 | × | 見下ろし | `ref/tile.lantern@4x.png` |
| 14 | `prop.save` | `assets/gen/rpg/prop.save.png` | 32×56（16×56） | 2コマ（ゆらぎ） | ○ | 正面 | `ref/prop.save@4x.png` |
| 15 | `party.danT` | `assets/gen/rpg/party.danT.png` | 144×128 | 6列×4行 | ○ | 行＝下・左・右・上 | `ref/party.danT@4x.png` |

### 1. `party.dan` だんのうら（フィールド・戦闘の歩き姿）
- ポジティブ：`(STYLE), sprite sheet 6 columns x 4 rows, each cell 24x32 pixels, (DAN), chibi proportions about 2.5 heads tall, rows: facing down, facing left, facing right, facing up; columns: walk cycle 4 frames, casting pose with both hands raised, victory pose with one arm up, feet at the same baseline in every cell`
- ネガティブ：`(NEG), short hair, male, boy, no glasses, hat missing`
- 日本語メモ：紫の長髪・眼鏡・ピンクのシルクハットと花の髪飾りは**全コマで見える**こと。上向きは後ろ姿（髪と帽子、花）。左右は鏡写しでよい。
### 2. `party.mina` ミナモ
- ポジティブ：`(STYLE), sprite sheet 6 columns x 4 rows, each cell 24x32 pixels, (MINA), floating slightly, long hair flowing behind, walk frames as gentle drifting, casting pose with hands raised, nightgown hem fading out at the bottom, semi-translucent look but opaque pixels`
- ネガティブ：`(NEG), dark hair, swimsuit, adult body, legs visible, solid heavy outline in cyan`
- メモ：透けた感じはゲームが不透明度 86% で描くので、画像自体は**不透明**で。すそだけ下へ向けて薄く（アルファ0/255の市松でもよい）。
### 3. `portrait.mina` ミナモの顔窓（5表情）
- ポジティブ：`anime pixel art portrait, bust shot, (MINA), deep teal underwater background with soft bokeh bubbles, 5 expressions side by side in equal square cells: neutral, gentle smile, sad, surprised, eyes closed peacefully`
- ネガティブ：`(NEG), full body, text, frame, different face between cells`
- メモ：1コマ 76×76（152×152 で作って `--scale 2` 推奨）。背景は不透明でよい。ゲームは少しゆらして表示。
### 4. `bg.menu` タイトルの一枚絵
- ポジティブ：`(WORLD), vertical 9:16 key art, sunken Japanese city with tiled roofs and a vermilion torii gate at the sea floor, glowing lanterns, light rays from the surface, jellyfish, no characters, pixel art illustration, high detail`
- ネガティブ：`text, title, logo, UI, characters, watermark, signature`
- メモ：画面の中央に「壇ノ浦夢譚」の文字とボタンが乗るので、中央〜下はやや暗めに。540×960（2倍）か 1080×1920（4倍）。
### 5. `boss.rust` 鉄錆の番人（第二章ボス）
- ポジティブ：`(STYLE), 4-frame idle animation strip, each cell 104x104, hulking rusted iron guardian golem, a caged glowing lantern in its chest, gear-shaped head with a single red eye, heavy chains hanging from its arms, barnacles and pink coral growth, slow breathing motion`
- ネガティブ：`(NEG), robot anime mecha, sword, gun, blood, glow baked in`
- メモ：参考画像の「灯を守る戦闘」の巨人のイメージ。胸の灯籠の光のにじみはゲームが足すので描かない（灯籠の窓は明るい色で塗るだけ）。装甲の六角の膜もゲーム側。
### 6. `boss.bubble` 炎上の泡（第一章ボス）
- ポジティブ：`(STYLE), 4-frame idle strip, each cell 92x92, a huge angry translucent red bubble monster, swirling red hateful scribbles inside (no readable text), small bubbles orbiting, two dark eyes, wobbling surface`
- ネガティブ：`(NEG), readable words, fire, explosion, gore`
### 7. `boss.debt` 借金取りの影（第三章ボス）
- ポジティブ：`(STYLE), 4-frame idle strip, each cell 110x110, tall faceless shadow in a long dark coat and brimmed hat, two pale glowing eyes, red necktie, holding a paper bill, coat hem rippling like smoke, purple rim light from top-left`
- ネガティブ：`(NEG), gun, knife, money symbols, readable text, realistic face`
### 8. `boss.sheep` 眠れぬ羊（第四章ボス）
- ポジティブ：`(STYLE), 4-frame idle strip, each cell 100x100, a large dark lavender sleepless sheep facing right, fluffy wool clumps, curled horns, glowing red tired eyes, slight bobbing`
- ネガティブ：`(NEG), cute cartoon white sheep, realistic wool, text`
### 9. `boss.watcher` 名無しの観測者（最終ボス）
- ポジティブ：`(STYLE), 4-frame idle strip, each cell 124x124, a giant single staring eye inside a livestream frame, many small eyes around it, magenta and crimson palette, veins, eyelashes, a small red LIVE badge shape (no letters)`
- ネガティブ：`(NEG), gore, blood, readable text, realistic eye photo`
- メモ：まわりを回るコメントの文字はゲームが重ねる。
### 10〜13. タイル `tile.ruins` `tile.factory` `tile.coral` `tile.lantern`
- 13列（各16×16）：`floor0..3`（床の模様違い4種）・`path`（道・敷石）・`deco`（草や珊瑚の飾り床）・`plank`（板張り）・`face`（壁の正面＝下が床）・`top`（壁の上・天井）・`water`（水・渦）・`pit`（底なしの闇）・`conveyor`・`fence`（低い柵。床ごと描く）。
- **床4種と道は上下左右につないでも継ぎ目が見えない**こと（3×3 に並べて確認）。壁の面は上を暗く、下端に影。
- ruins：`(STYLE), seamless top-down tileset strip, 13 tiles of 16x16, sunken ruins at the sea floor, indigo sand with ripples, pebbles, cracked stone path, mossy stone wall face, dark abyss tile, deep water tile`
- factory：`... underwater factory, teal steel floor plates with rivets and rust stains, hazard-striped walkway, pipes on the wall face, conveyor belt tile, yellow safety railing`
- coral：`... coral reef kindergarten, lavender sand with shells, pink coral wall with polyps, pastel paving stones, white picket fence`
- lantern：`... endless lantern corridor, dark stone paving with moss, red lacquered wooden wall with pillars, still black water`
- ネガティブ：`(NEG), perspective, isometric, characters, objects larger than one tile`
### 14. `prop.save` 灯籠（休める場所）
- ポジティブ：`(STYLE), 2-frame strip, each cell 16x56 (object occupies bottom 32 pixels, 24 pixels of headroom above), small stone lantern with a pale blue glowing crystal flame, tiny bubbles rising, frame 2 slightly brighter`
- メモ：光のにじみはゲーム側。上の 24 ドットははみ出し用（泡など）。
### 15. `party.danT` だんのうら（疲れ切った夜の姿）
- `party.dan` と同じ並び・大きさで、タグを DAN_T に。猫耳・白い髪・マゼンタのパーカー・眼鏡・ピンクの花。

---

## 6. 全アセット一覧

保存先はすべて `assets/gen/rpg/<id>.png`、下絵は `assets/gen/rpg/ref/<id>.png`（4倍は `@4x`）。大きさは1倍。

### 仲間・夢の住人（24×32 のコマ、6列×4行＝144×128、透過、行＝下・左・右・上、列＝歩き0〜3・cast・win）
| id | 誰 | プロンプトの中身（STYLE のあとに） |
|---|---|---|
| `party.dan` | だんのうら | DAN |
| `party.danT` | だんのうら（疲れ切った夜） | DAN_T |
| `party.mina` | ミナモ | MINA |
| `npc.kidOut` | 娘（お出かけ） | `4-year-old girl, purple-black bob with straight bangs, tiny twin tails tied with pink flowers, big purple eyes, yellow hat, light blue smock, yellow rain boots, holding a brown teddy bear with a frayed left ear` |
| `npc.kidHome` | 娘（パジャマ） | 同じ顔・髪で `mint pajamas with yellow stars, holding a brown teddy bear` |
| `npc.miyako` | 都の人 | `translucent ghost of an ancient court noble, black eboshi hat, pale blue-white robes` |
| `npc.worker` | 夜勤の亡者 | `translucent ghost factory worker, yellow hard hat, blue-gray work uniform` |
| `npc.teacher` | 珊瑚の先生 | `translucent ghost kindergarten teacher, brown hair in a bun, pink apron` |
| `npc.sleeper` | 眠れない人 | `translucent ghost of a sleepless person, messy gray-purple hair, blue pajamas, tired eyes` |
| `npc.fish` | 魚の子 | 16×12・2コマ・右向き：`tiny glowing aqua fish with pink fins` |

### 敵・ボス（正方形のコマ×4、透過、正面）
| id | 名前 | 1コマ | 中身 |
|---|---|---|---|
| `enemy.noise` | ノイズの群れ | 38 | `cluster of glitchy static rectangles, white cyan magenta, two small white eyes` |
| `enemy.spark` | 罵声の泡 | 32 | 炎上の泡の小型版 |
| `boss.bubble` | 炎上の泡 | 92 | §5-6 |
| `enemy.crab` | 錆びた蟹 | 40 | `rusty orange crab with barnacles, teal oxidation spots, eye stalks with yellow eyes, open claws` |
| `boss.rust` | 鉄錆の番人 | 104 | §5-5 |
| `enemy.letters` | 督促状 | 38 | `swarm of flying envelopes with red stamps (no readable text)` |
| `boss.debt` | 借金取りの影 | 110 | §5-7 |
| `enemy.echo` | 残響のノイズ | 44 | ノイズの群れのオレンジ版 |
| `enemy.lamb` | 眠れぬ子羊 | 34 | 眠れぬ羊の小型版 |
| `boss.sheep` | 眠れぬ羊 | 100 | §5-8 |
| `enemy.shade` | 名前を呑む影 | 44 | `hooded shadow with red eyes, purple aura, rippling hem` |
| `enemy.eye` | 見ている目 | 34 | `single staring eye, magenta iris` |
| `boss.watcher` | 名無しの観測者 | 124 | §5-9 |

### タイル（16×16×13列＝208×16、不透明）
`tile.home`（夜の部屋：畳・ふすま）・`tile.ruins`・`tile.room`（沈んだ配信部屋：板の間・紫の敷物・紙の壁）・`tile.factory`・`tile.coral`・`tile.lantern`・`tile.vortex`（沈んだ御所：紫の石板・名前の刻み・渦の水）・`tile.abyss`（沈眠の都：赤黒い石）。列の意味は §5-10。

### 小物（横＝マス×16、縦＝マス×16＋24、透過、正面3/4、足元＝下端）
| id | 何 | 大きさ | コマ |
|---|---|---|---|
| `prop.roof` | 沈んだ瓦屋根 | 48×56 | 1 |
| `prop.torii` | 朱のはげた鳥居 | 48×72 | 1 |
| `prop.kelp` | 昆布 | 16×56 | f0 f1 |
| `prop.rock` | 岩 | 16×40 | 1 |
| `prop.chest` | 宝箱 | 16×40 | closed open |
| `prop.save` | 休める灯籠（青） | 16×56 | f0 f1 |
| `prop.toro` | 石灯籠（橙） | 16×56 | lit dim |
| `prop.desk` | 配信机とモニター | 64×56 | f0 f1 |
| `prop.window` | 窓 | 32×40 | night morning |
| `prop.boxes` | 段ボール | 32×40 | 1 |
| `prop.chair` | 椅子 | 16×40 | 1 |
| `prop.bubbles` | 泡の吹きだまり | 16×40 | f0 f1 |
| `prop.futon` | 布団 | 48×56 | night morning |
| `prop.tank` | タンク | 32×72 | 1 |
| `prop.crate` | 木箱 | 16×40 | 1 |
| `prop.locker` | ロッカー | 48×56 | 1 |
| `prop.panel` | 制御盤 | 32×56 | broken fixed |
| `prop.press` | プレス機 | 64×72 | running stopped |
| `prop.coral` | 珊瑚 | 16×56 | f0 f1 |
| `prop.jelly` | クラゲ（宙に浮く） | 16×40 | f0 f1 |
| `prop.nursery` | 珊瑚の保育園の建物 | 128×88 | dark lit |
| `prop.shoes` | 靴箱 | 32×56 | 1 |
| `prop.swing` | ぶらんこ | 48×56 | f0 f1 |
| `prop.slide` | すべり台 | 48×56 | 1 |
| `prop.mailbox` | ポスト | 16×56 | letters empty |
| `prop.tulips` | チューリップ | 32×40 | 1 |
| `prop.pillar` | 朱の柱 | 16×56 | 1 |
| `prop.biglantern` | 大灯籠 | 32×72 | lit taken |
| `prop.lone` | ひとつだけの灯籠 | 16×56 | f0 f1 |
| `prop.palace` | 沈んだ御所 | 96×72 | f0 f1 |
| `prop.throne` | 玉座 | 32×56 | 1 |
| `prop.vortex` | 名前を呑む渦 | 112×104 | storm calm |
| `prop.sign` | 立て札 | 16×40 | 1 |
| `prop.shelf` | 本棚 | 32×56 | 1 |
| `prop.toybox` | おもちゃ箱と絵本 | 32×40 | 1 |
| `prop.bear` | クマのぬいぐるみ | 16×40 | 1 |

- 小物共通のプロンプト：`(STYLE), (WORLD), single game prop <中身>, front 3/4 view, sits on the bottom edge, transparent background, <コマ> frames side by side`

### 一枚絵（270×480、不透明。2倍・4倍で作る）
| id | 場面 | 中身 |
|---|---|---|
| `bg.menu` | タイトル | §5-4 |
| `bg.dawn` | 目覚め（よいエンド） | `view from underwater looking up at a bright dawn sea surface, golden light rays, bubbles rising, silhouette of a torii and roofs below` |
| `bg.abyss` | 沈眠の都（悪いエンド） | `dark crimson abyss, sunken city roofs with dim red lanterns, heavy and quiet, no characters` |

### 顔窓（76×76 のコマ、不透明。152×152 で作って `--scale 2`）
`portrait.mina`（normal smile sad surprise closed）・`portrait.fish`・`portrait.miyako`・`portrait.worker`・`portrait.teacher`・`portrait.sleeper`（各 normal）。だんのうらの顔窓は本編の立ち絵（`assets/img/char_*.webp`）を使うので対象外。

---

## 7. 検品チェック（1枚ごと）

- [ ] 大きさが `size` の整数倍（`node tests/run.mjs` の rpg-art が確認する）
- [ ] コマの数・並びが `frames.layout` どおり、すき間なし、足元の高さがそろっている
- [ ] 透過の素材は四隅が透明・アルファ 0/255・フチに白や黒の残りがない
- [ ] 文字・ロゴ・署名なし。光のにじみを描き込んでいない
- [ ] だんのうら＝紫の長髪・眼鏡・ピンクのシルクハット・花の髪飾り。ミナモ＝水色の長髪・貝の髪飾り・白い寝間着
- [ ] 外周線 `#1b1226`・左上の光（ドット絵）
- [ ] 実際の画面（スマホ 390×780・PC）で、フィールド・戦闘・顔窓に違和感がない

---

## 8. コード描画の改善（この版で入れたもの）

生成画像がなくても見栄えがよくなるように、コード描画も手を入れました。

- 人物：すべての人物に外周線＋左上の光（ふちの明暗）を自動でつける仕上げ（`pixelPost`）。だんのうらの顔を描き直し（眼鏡の縁・瞳の光・前髪の房・ピンクのシルクハットのリボンとつや・5枚花びらの髪飾り）。ミナモは髪が水に流れ、貝の髪飾り・リボン付きの寝間着、すそが水に溶けるように。
- 敵：下書きに描いてから外周線と光をつけ、光のにじみと文字はあとから重ねる。鉄錆の番人を「胸に灯籠を抱えた鎖まみれの錆びた巨人」に作り直し。錆びた蟹・借金取りの影・眠れぬ羊・観測者に細部を追加。
- タイル：砂のさざ波・小石・貝のかけら、鉄板の面取り・リベット・錆・排水の格子、石畳の面取り・苔、御所の石板と刻み、壁の苔と珊瑚、水のきらめき。
- 小物：外周線と光の仕上げ（動く小物は 1/10 秒ごとに描き直してキャッシュ）。鳥居・昆布・岩・宝箱・石灯籠・珊瑚・大灯籠を描き直し。
- 海の気配：水底をゆらめく光（コースティクス）、上ほど深く暗い水と四隅の陰、立ちのぼる泡、明るいマップでも灯りのまわりをほんのり照らす。
- 戦闘：足元に光の輪（ボスは赤）と、まわりを暗くして戦いの場を浮かび上がらせる。
- 魚の子をドット絵（外周線つき・ほのかに光る）に。
