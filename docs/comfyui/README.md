# ComfyUI 素材づくりガイド（だんのうら育成ゲーム）

自分の PC の ComfyUI で画像を作り、このリポジトリに置くための手順書です。
**このフォルダの中身は「依頼書」と「ひな形」だけで、画像はまだ1枚も生成していません。** 全件の状態は `requested` です。

| ファイル | 内容 |
|---|---|
| `README.md` | この手順書（モデル選び・キャラの統一・ドット化・透過・置き場所・検品） |
| `asset-requests.md` | 依頼一覧（人が読む版）。優先度 P1〜P3、プロンプト付き |
| `asset-requests.csv` | 同じ一覧の表計算版（UTF-8 BOM付き、Excel でそのまま開ける）。`status` 列で進み具合を管理 |
| `prompt-pack.json` | 同じ一覧の機械可読版（一括投入用）。共通ブロック・シード・全アセットの positive/negative |
| `workflow_character_sheet.json` | ComfyUI の API 形式ワークフローのひな形（最小構成） |
| `workflow_ipadapter_controlnet.json` | 参照画像（IPAdapter）＋ ControlNet 付きのひな形（**カスタムノード ComfyUI_IPAdapter_plus が必要**） |

3つの一覧（md / csv / json）は同じ生成元から作っていて、**id で1対1に対応**します。

---

## 0. まず決めておくこと（重要）

1. **主人公はだんのうら。** 参考画像（6枚組×3）の「ハル」は仮置きで、短髪の男性に描かれていますが、だんのうらの本当の見た目は `assets/img/char_*.webp` です。
   - 紫のロングヘア・右側のサイドテール・黒い四角めがね・ピンクの小さなシルクハット・ピンクの花の髪飾り・ラベンダーのシャツ。
   - **疲れが限界に近づくと白髪（ラベンダーがかった白）・猫耳・マゼンタのパーカー姿に変わる**のは設定どおり（`char_tired / fear / collapse`、`sd_tired / collapse`）。直さないこと。
   - 参考画像は「光の色・夜の青紫・アンバーの灯り・ティールの夢の海・紺＋金のUI」の雰囲気にだけ使い、顔や髪型は写さない（IPAdapter で使うなら重み 0.3〜0.5 の“雰囲気だけ”）。
2. **家・庭のドット絵（`main/home/sprites.js`）は今はすべてコード描画**で、`docs/asset-style-guide.md` には「外部画像・生成画像は使わない」と書いてあります。
   - 家・庭の生成画像（id が `home.` で始まるもの）は、**Godot 版でそのまま使う**か、ブラウザ版でも使えます（フェーズ3 で受け口を追加）：`assets/original/manifest.json` の該当 asset の `file` に PNG のパスを書くと、`HOME_ART` がコード描画の代わりにそれを描きます（手順は §11）。`file` が null・読み込み失敗のときはコード描画のまま。
   - 立ち絵・背景・エンディング絵などは既存の画像ファイルを同じ名前で上書きするだけで反映されます（§8）。
3. 既存の作品のキャラ名・画風名・作家名はプロンプトに入れない（一覧のプロンプトもすべて独自の言葉で書いてあります）。

---

## 1. おすすめのモデル構成

どれか1つの方式に決めて、**全素材を同じチェックポイント・同じ LoRA・同じ設定で作る**のが統一感の一番の近道です。

| 方式 | 中身 | 向いているもの |
|---|---|---|
| A. アニメ系 SDXL ＋ ドット絵 LoRA | Illustrious 系 / Pony 系 / アニメ系 SDXL のチェックポイントに、ピクセルアート用 LoRA（重み 0.6〜0.9）を足す | 立ち絵・イベントCG・キーアート（参考画像の「アニメ調ドット」に一番近い） |
| B. 高解像度で普通に描いて、あとでドット化 | LoRA なしでアニメ絵を 1024px 前後で作り、§5 の手順で縮小・減色 | 家具・アイコン（形を崩さずに小さくできる） |
| C. A で作って B の後処理もかける | LoRA の“ドットっぽさ”は格子がずれていることが多いので、最後に必ず格子合わせ | ゲームに入れる全素材（推奨） |

- 品質タグ：一覧の positive は `best quality, high detail` から始まります。Pony 系なら先頭に `score_9, score_8_up, score_7_up,`、Illustrious 系なら `masterpiece,` を足すなど、使うモデルの流儀に合わせて**先頭だけ**変えてください（`prompt-pack.json` の `quality_tags`）。
- 既定値（`prompt-pack.json` の `sampler_defaults`）：steps 28、CFG 6.0、euler_ancestral / normal。モデルの推奨値があればそちらを優先。
- 生成サイズは `gen_size`（SDXL の得意な解像度：1024×1024、768×1344、1536×640 など）。**完成サイズ（`size`）はもっと小さい**ので、§5 で縮めます。
- LoRA を使うときは、ひな形の `CheckpointLoaderSimple` と `KSampler`/`CLIPTextEncode` の間に `LoraLoader` を挟みます（model と clip の両方を通す）。

---

## 2. キャラクターの統一（いちばん大事）

### 2-1. タグブロックを固定する
`asset-requests.md` の「キャラクター・タグブロック」（`prompt-pack.json` の `character_blocks`）を、**一字一句変えずに**毎回使います。表情や場面の言葉はブロックの後ろに足すだけ。

| ブロック | 誰 | 要点 |
|---|---|---|
| `DAN` | だんのうら（ふだん） | 紫ロング・右サイドテール・黒めがね・ピンクのシルクハット・花の髪飾り・ラベンダーのシャツ |
| `DAN_CAT` | だんのうら（疲労時の変身） | ラベンダーがかった白髪・白い猫耳（内側ピンク）・マゼンタのパーカー（白いファー）・黒いインナー |
| `DAN_SD` | だんのうら（SD・家のドット） | 開いたラベンダーのシャツ＋ピンクのボーダー・プラム色のズボン |
| `KID` / `KID_OUT` | 娘（4歳） | 紫がかった黒のおかっぱ・まっすぐな前髪・ピンクの花で結んだ小さなふたつ結び・大きな紫の目／家はミントに黄色い星のパジャマ、外は黄色い帽子・水色スモック・黄色い長靴 |
| `BEAR` | 娘のクマ | 茶色、**左耳がほつれている**（正面から見ると画面の右側の耳） |
| `CAT` | 飼い猫 | **三毛猫**（白地に茶と黒のぶち）。ぶちの位置は最初の採用画像で決めて以後固定 |
| `HANCHO` ほか | 脇役 | 既存 `mob_*.svg` の服・髪色を言葉にしたもの |

### 2-2. 参照画像（IPAdapter）
- 参照に使う画像：だんのうら＝`assets/img/char_normal.webp`（疲労時は `char_tired.webp`）、娘＝`assets/img/child_normal.svg`、脇役＝`assets/img/mob_<id>.svg`。
- **SVG は ComfyUI に読めないので PNG にしてから** `ComfyUI/input/` に置きます。
  - ブラウザで SVG を開いてスクリーンショット、または `rsvg-convert -w 1024 -h 1024 child_normal.svg -o ref_child_normal.png`、または Inkscape で書き出し。背景は白で塗っておくと IPAdapter が安定します。
- 重みの目安：同じキャラにしたい 0.6〜0.8／雰囲気だけ 0.3〜0.5。顔が崩れる・服が混ざるときは下げる。
- **1キャラにつき1枚「基準画像」を決める**（例：`portrait.dan.normal` の採用画像）。2枚目以降の表情差分はその基準画像を参照にすると、一番そろいます。
- 2人以上が出るCG（P3）は、IPAdapter を人物ごとにマスクで分ける（regional / attn_mask）か、1人ずつ描いてから合成するほうが安全です。

### 2-3. シードを固定する
- `prompt-pack.json` の `seeds`：だんのうら 110101、娘 120101、猫 130101、脇役 140101〜、家具 200101、背景 300101、UI 400101。
- 表情差分は**同じシード＋同じ参照画像＋表情の言葉だけ変える**。気に入った1枚が出たら、そのシードを CSV の `seed_value` に書き戻しておくと再現できます。

---

## 3. ControlNet の使いどころ

| 種類 | 使う場面 | 下絵の作り方 |
|---|---|---|
| lineart | 立ち絵の表情差分（構図・輪郭を既存画像に合わせる） | 既存 `char_*.webp` や PNG 化した `child_*.svg` を lineart 前処理にかける |
| openpose | ポーズ（SD・家のキャラ4方向・CGの人物配置） | 棒人形を描く／既存 `sd_*.webp` から抽出。家のキャラは「正面・背面・左・右」を横に並べた棒人形 |
| depth | **見下ろし3/4の家具**、キーアートの構図 | 16px 方眼に足元の大きさ（例 2×1 マス＝32×16）を描き、高さぶんの箱を上に積んだ簡単な立体を描く → depth 化。回転ごとに作る |

- 強さ 0.5〜0.8、終了 0.6〜0.8（最後まで効かせると絵が硬くなる）。
- SDXL 用の ControlNet（lineart / depth / openpose、または union 系）を使うこと。SD1.5 用は SDXL では動きません。

---

## 4. 背景の除去と透過

`transparent=yes` の素材（立ち絵・家具・アイコン）は背景を消します。

1. 生成時はプロンプトで `plain white background`（家具）や `simple plain background`（立ち絵）にしておく。
2. 背景除去ノード（rembg / BiRefNet 系のカスタムノード）か外部ツールで切り抜き。
3. **ドット絵はアルファを 0 か 255 の2値にする**（半透明のフチは残さない）。立ち絵も、縁に白いもやが出たら閾値（例 128）で2値化。
4. 灯りのグロー（ランタン・豆電球の lit）は**画像に焼き込まない**。ゲーム側が加算合成で描きます（スタイルガイドの「灯り」）。画像は本体だけ。
5. 切り抜き後、暗い背景（`#1c1838`）と明るい背景（白）の両方に重ねて、フチの白残り・黒残りを確認。

---

## 5. ドット化（格子合わせ・縮小・減色）

LoRA で描いた“ドット風”の絵は、ドットの大きさがバラバラで格子もずれています。ゲームに入れる前に必ず次をやります。

1. **論理サイズを決める**（`size` 列）：
   - 立ち絵 256×256 → 論理 128×128 を 2 倍にしたもの
   - 家具 → `size` 列の原寸（例：1×1 マスの家具は 24×50、2×1 は 40×50）。**1マス＝16ドット、足元の左右下に4ドット、上に最大30ドットの余白**（`docs/asset-inventory.md` の描画上の注意と同じ）
   - タイル 16×16、家のキャラ 16×24（娘 16×19、猫 16×16）、アイコン 32 ドット（64×64 は ×2）
   - キーアート・CG 540×960 → 論理 270×480 の 2 倍
2. 余白を切り詰めて、論理サイズへ縮小（ボックス/エリア平均で縮める → 色が平均される）。
3. **減色**：`docs/asset-style-guide.md` のパレットに寄せる（下のスクリプト）。家具・タイル・家のキャラは**パレット外の色を使わない**。立ち絵・CG は 32〜48 色程度に減色するだけでよい。
4. 外周線を `#1b1226` の1ドットに整える（黒 `#000` の線・2重線は直す）。
5. 表示サイズへ **最近傍（nearest neighbour）で整数倍** に拡大（2倍・4倍）。1.5倍などの半端な倍率は使わない。
6. 最後に手でドットを直す（Aseprite / LibreSprite / Piskel など）。目・指・家具の角は手直し前提。

Pillow での例（`pip install pillow`）：
```python
from PIL import Image
PALETTE = ["#1b1226","#f2cf98","#d9a066","#b97c45","#8a5530","#5e3820","#fff0c8","#f0d4a0","#d8b47a",
  "#ffffff","#ece6f0","#d2c8dc","#a99cb8","#b88a62","#a87a56","#9c6f4d","#8e6344","#6e4a36",
  "#fffaf0","#f4efe6","#ddd2c0","#b8a890","#a8c0f0","#7f9ad8","#5f78b8","#465a96","#f4dc7a",
  "#ffd0e0","#f59aae","#d9708e","#a54a70","#c6b2ee","#8c5fcc","#5a3590","#3a2066",
  "#a8d88a","#7fbf6e","#5f9e5c","#43784a","#2e5640","#d6d2de","#aeaabe","#87839c","#625e78",
  "#fff4cc","#ffd98a","#ffb85a","#e08a34","#e4fff8","#9ff0e0","#4fc8bc","#2a8f96","#1f5f70",
  "#4a4a8e","#33306a","#262352","#1c1838","#7c6f9a","#75688f","#8578a2","#9a7058","#7a5440",
  "#c8714a","#d24a58","#5a7ad0","#e8c050"]
def pixelize(src, dst, logical, scale=1, use_palette=True):
    im = Image.open(src).convert("RGBA")
    im = im.crop(im.getbbox())                          # 余白を詰める（アルファがある場合）
    im.thumbnail(logical, Image.BOX)                    # 論理サイズへ（比率維持）
    canvas = Image.new("RGBA", logical, (0, 0, 0, 0))
    canvas.paste(im, ((logical[0]-im.width)//2, logical[1]-im.height))  # 下揃え（足元基準）
    a = canvas.getchannel("A").point(lambda v: 255 if v >= 128 else 0) # アルファ2値化
    rgb = canvas.convert("RGB")
    if use_palette:
        pal = Image.new("P", (1, 1)); flat = []
        for h in PALETTE: flat += [int(h[i:i+2], 16) for i in (1, 3, 5)]
        pal.putpalette(flat + [0] * (768 - len(flat)))
        rgb = rgb.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")
    out = rgb.convert("RGBA"); out.putalpha(a)
    out.resize((logical[0]*scale, logical[1]*scale), Image.NEAREST).save(dst)
# 例：1×1 マスの家具（原寸 24×50）
# pixelize("ComfyUI_00012_.png", "assets/img/home/memento.bear_r0.png", (24, 50))
```
※ 家具は足元の位置が大事なので、下揃えのあと、足元が「左4ドット・下4ドット」の位置に来ているか必ず目で確かめてください（§9）。

ComfyUI 内で済ませたい場合は、ピクセルアート系のカスタムノード（パレット減色・格子検出つきのもの）や `ImageScale`（upscale_method: nearest-exact）を使えます。最終の縮小・減色は上のスクリプトか画像編集ソフトのほうが確実です。

---

## 6. 一括生成（任意）

`prompt-pack.json` と `workflow_character_sheet.json` を使って、ComfyUI の API（既定 `http://127.0.0.1:8188`）に順番に投げる例です。ComfyUI を起動してから実行します。

```python
import json, copy, urllib.request
pack = json.load(open("docs/comfyui/prompt-pack.json", encoding="utf-8"))
base = json.load(open("docs/comfyui/workflow_character_sheet.json", encoding="utf-8"))
CKPT = "YOUR_ANIME_SDXL_CHECKPOINT.safetensors"   # ← 自分のモデル名
for a in pack["assets"]:
    if a["priority"] != "P1" or a["status"] != "requested":
        continue
    wf = copy.deepcopy(base)
    wf["4"]["inputs"]["ckpt_name"] = CKPT
    wf["6"]["inputs"]["text"] = a["positive"]
    wf["7"]["inputs"]["text"] = a["negative"]
    wf["5"]["inputs"].update(width=a["gen_width"], height=a["gen_height"], batch_size=4)
    wf["3"]["inputs"]["seed"] = a["seed"]
    wf["9"]["inputs"]["filename_prefix"] = a["filename_prefix"]
    req = urllib.request.Request("http://127.0.0.1:8188/prompt",
        data=json.dumps({"prompt": wf}).encode(), headers={"Content-Type": "application/json"})
    print(a["id"], urllib.request.urlopen(req).read()[:80])
```
- `_meta` は ComfyUI がタイトルとして読むだけなので、残したままで動きます。
- IPAdapter / ControlNet 版（`workflow_ipadapter_controlnet.json`）を使う場合は、ノード `20`（参照画像）と `30`（ControlNet の下絵）の `image` もアセットごとに書き換えます（ファイルは `ComfyUI/input/` に置く）。
- ComfyUI の画面に読み込むときは「Load」で API 形式の JSON を開けます（読み込めない版では、画面で同じノードをつないで「Save (API Format)」し直してください）。

---

## 7. ファイル名とサイズ

- 名前は一覧の `target_path` のとおり。**id の `.` はそのまま**、Godot 版（`godot/data/sprites.json`）と同じ形式 `<id>_r<回転>_<variant>.png` にそろえています（例：`furniture.wood_chair_r90_default.png`、`light.desk_lamp_r0_lit.png`、`garden.pot_r0_red.png`）。色違いのないものは `_default`。アニメのコマは末尾に `_f0` `_f1`。
- 家のキャラは Godot の形式 `<who>_<dir>_<pose>_<n>.png`（dir = down/up/left/right、pose = stand/walk/sit/hold/work/sleep/read）。
- スプライトシートは横並び・コマの大きさ固定・すき間なし（家のキャラは 4方向を行、ポーズを列に）。
- 形式：立ち絵・背景・CG は WebP（品質 90 前後、立ち絵は透過付き lossless 推奨）、ドット絵（家具・タイル・キャラ・アイコン）は **PNG**（減色した色が崩れないように）。
- 生成の元画像（ComfyUI の出力）はリポジトリに入れず、手元に保管（あとで作り直すため、シードとプロンプトもメモ）。

---

## 8. 置き場所と、書き換える登録先

| 種類 | 置き場所 | 登録（コード） |
|---|---|---|
| だんのうら 立ち絵 | `assets/img/char_<face>.webp`（上書き） | `game.js` の `CHAR_IMG` — 同じ名前なら変更不要 |
| だんのうら SD | `assets/img/sd_<pose>.webp`（上書き） | `game.js` の `SD_IMG` — 同上 |
| 娘 立ち絵 | `assets/img/child_<face>.webp`（新規。SVG は残してよい） | `game.js` の `CHILD_IMG`（1317行付近）で該当キーの `.svg` を `.webp` に書き換え。お出かけ服は `outside` キーを追加 |
| 脇役 立ち絵 | `assets/img/mob_<id>[_<face>].webp` | `main/mobs.js` 25行目 `…+'.svg'` を `'.webp'` に（**全表情がそろってから一括**）。途中で1キャラだけ替えるなら、ループの後に `MOB_IMG.hancho.normal='assets/img/mob_hancho.webp';` のように個別に上書き |
| 飼い猫（三毛） | `assets/img/mob_cat.webp`・`mob_cat_happy.webp`・`mob_cat_closed.webp` | `main/mobs.js` の `MOB_FACES` に `cat:['normal','happy','closed'],` を追加（使う台詞・場面は別作業） |
| シーン背景 | `assets/img/bg_<key>.webp`（上書き） | `game.js` の `BG_IMG` — 同じ名前なら変更不要 |
| エンディング絵 | `assets/img/ending_<type>.webp`（上書き） | `game.js` の `ENDING_IMG` — 同上 |
| 家・庭（家具・タイル・人物・家の正面） | `assets/original/home/<id>.png`（新規フォルダ） | `assets/original/manifest.json` の該当 asset の `file`（と必要なら `anchor`）を書くだけ。コードの変更は不要（§11） |
| ミニゲーム キーアート・UI・イベントCG | `assets/img/mg/` `assets/img/ui/` `assets/img/cg/`（新規フォルダ） | まだ登録先がない。表示する場所の実装は別作業 |
| Godot 版 | 既存の `godot/assets/sprites/{items,chars,tiles,icons,ui,bg}/` の同名ファイルを上書き（キーアート・CG は `bg/mg_<id>_key.webp`・`bg/cg_<id>.webp` を新規） | Godot 側の画像は**原寸の2倍・余白トリム済み**で、位置と大きさは `godot/data/sprites.json`（`w` `h` `ox` `oy`）に入っています。原寸で作った画像は最近傍で2倍にし、透明な余白を切ってから置き、大きさが変わったら sprites.json の値も直す（このファイルは `tools/export_sprites.mjs` が書き出したもの。作り直すとコード描画に戻るので注意）。インポート設定：Filter = Nearest、Mipmaps = オフ、Compress = Lossless。UIパネルは `StyleBoxTexture`（9スライス） |

置いたあとに：
- `docs/asset-inventory.md` の該当行に「生成画像（ComfyUI）・採用日」を追記。
- `asset-requests.csv` の `status` を `done` に（検品に通ったものだけ）。不採用は `rejected`、作り直し中は `wip` など。
- ブラウザで `index.html` を開いて実際の画面で表示を確認（キャッシュが残るときは強制再読み込み）。テストは `node tests/run.mjs`。

---

## 9. 検品チェックリスト（1枚ごと）

**検品に通るまで `done` にしないこと。** 1つでも × なら作り直しか手直し。

### 共通
- [ ] **サイズ**が `size` 列とぴったり同じ（`identify ファイル名` や画像ソフトで確認）
- [ ] **透過**：`transparent=yes` なら四隅が完全に透明、背景の色が残っていない。ドット絵はアルファが 0/255 のみ（半透明のフチなし）。`no` なら透明部分がない
- [ ] **文字・ロゴ・署名・透かし**が入っていない（看板の偽文字も消す）
- [ ] **キャラの一致**：基準画像と並べて、髪型・髪色・めがね・髪飾り・目の色・服が同じ。だんのうらのサイドテールは**右側**、娘のふたつ結びは**ピンクの花**、クマのほつれは**左耳（画面右）**、猫は**三毛**
- [ ] **設定どおり**：疲労系（tired / fear / collapse）は白髪・猫耳・マゼンタのパーカー。ふだんの表情は紫髪・シルクハット
- [ ] 娘の絵：幼児らしい体型・服装（大人っぽい体型・化粧・露出なし）
- [ ] 暗い背景（`#1c1838`）と白背景の両方に重ねて、フチの白残り・黒残りがない
- [ ] 実際のゲーム画面で表示して違和感がない（立ち絵の丸切り抜き、会話窓、エンディング一覧のサムネイル）

### ドット絵（家具・タイル・家のキャラ・アイコン）
- [ ] **ドットの格子**がそろっている（拡大して、1ドットが同じ大きさの正方形。にじみ・アンチエイリアスなし）
- [ ] **外周線**が `#1b1226` の1ドット（黒 `#000` や2重線になっていない）。内側の細部は線でなく色の段差
- [ ] **パレット**：スタイルガイドの色だけ（スポイトで数色確認。足した色はガイドに追記）
- [ ] **光源**が左上（上面の上辺・左辺が明るく、右辺・下辺が暗い）、落ち影は右下
- [ ] **余白**：足元の左・右・下に4ドット、上は30ドット以内。足元の範囲（1マス16ドット×マス数）が画像の決まった位置にある
- [ ] **向き**：`_r0` は正面（下向き）、`_r90` は左向き、`_r180` は背面、`_r270` は右向き。左右非対称のものは 90 と 270 が左右反転の関係（影だけ右下）
- [ ] 家のキャラ：4方向の並び順が決まりどおり、歩きコマの足が交互、足元がタイル下端にそろう
- [ ] **つなぎ目（タイル・柵）**：3×3 に並べて継ぎ目が見えない（`montage tile.png tile.png tile.png tile.png tile.png tile.png tile.png tile.png tile.png -tile 3x -geometry +0+0 check.png`）。柵は左右に並べて途切れない
- [ ] 2コマアニメ（揺れ・きらめき）はコマ間で輪郭が1ドット以上ずれない
- [ ] 灯り（lit）の画像にグローを焼き込んでいない（シェードが明るいだけ）
- [ ] 1倍・2倍（T=32）・アイコン縮小時に形が読める

### 背景・キーアート・CG
- [ ] 縦横比が合っている（キーアート・CG 540×960、エンディング 640×960、帯背景 1200×200）
- [ ] UI・ボタン・文字が描き込まれていない（ゲーム側で重ねる）。下1/3はボタンが乗っても読める暗さ
- [ ] 夜の青紫・アンバーの灯り・ティールの海の配色が参考画像と同じ方向
- [ ] 主人公として描かれている人物がだんのうらの見た目（参考画像の仮主人公の顔になっていない）
- [ ] 怖さ・悲しさの表現が強すぎない（流血・過度な恐怖表現なし）

確認用のコマンド例（ImageMagick）：
```sh
identify -format '%f %wx%h %[channels]\n' assets/img/home/*.png           # サイズと透過の有無
convert x.png -alpha extract -format '%[fx:minima] %[fx:maxima]\n' info:   # アルファの範囲
convert x.png -alpha off -unique-colors -format '%w colors\n' info:        # 使っている色数
convert x.png -scale 800% x_zoom.png                                       # 最近傍で拡大して格子を見る
```

---

## 10. はじめに作るとよい10点

基準画像が先にあると、残りがすべてそろえやすくなります。

1. `portrait.dan.normal` — だんのうらの基準画像（以後すべての参照元）
2. `portrait.kid.normal` — 娘の基準画像（クマのほつれ耳も確定）
3. `portrait.cat.normal` — 三毛猫の基準（ぶちの位置を確定）
4. `portrait.dan.tired` — 猫耳化した姿の基準（fear / collapse / SD 疲労系の参照元）
5. `portrait.dan.happy` — 表情差分の練習（同シード＋参照で差分が作れるか確認）
6. `portrait.kid.happy` — 同上（娘）
7. `portrait.hancho.normal` — 脇役で一番登場が多い班長の基準
8. `portrait.minamo.normal` — RPG・夢の海の顔（キーアート・CG にも使う）
9. `home.plant.seed` — 物語「窓辺の小さな約束」の中心（成長5段階）
10. `home.light.shell_lantern` — RPG 第2章「手の灯」とつながる家具（ティールの灯り）

その後は P1 の残り（表情差分 → 脇役 → 家具・タイル → 家のキャラ）→ P2 → P3 の順がおすすめです。

---

## 11. 家・庭（ブラウザ版）に生成画像を入れる（フェーズ3 §6 の受け口）

`main/home/sprites.js` は起動時に `assets/original/manifest.json` を読み、`file` が書いてある asset の PNG を読み込みます。読み込めたものだけ、`HOME_ART.drawItem` / `drawChar` / `drawTile` / `drawHouse` がコード描画の代わりに描きます。**既定ではすべて `"file": null`**（コード描画）。

1. §5 の手順でドット化した PNG を `assets/original/home/` に置く（例：`assets/original/home/garden.small_tree.png`）。
   - 1マス＝32px（原寸 16 ドットの 2 倍、最近傍で拡大）で作ると `anchor` を省略しやすい。
2. manifest の asset に書く：
   ```json
   { "id": "garden.small_tree", "file": "assets/original/home/garden.small_tree.png", "anchor": { "x": 8, "y": 60, "tile": 32 } }
   ```
   - `file` は1枚（すべての向き・色で共通）か、状態ごとの表：`{"r0_default": "…", "r90": "…", "r0_lit": "…", "default": "…"}`。人物（`char.dan` `char.kid` `char.cat` など）は `{"down_stand_0": "…", "down_walk_1": "…", "left_sit_0": "…", "down": "…"}`。キーは細かいものから順に探し、無ければ短いキー → `default`。
   - `anchor` = PNG の中で「足元範囲（回転後の占有マス）の左上」が来る位置（PNG の px）と、PNG 上の1マスの大きさ `tile`（既定 32）。人物は「立っているマスの左上」。
   - 省略時：アイテムは `x=8, y=60, tile=32`（コード描画の画像と同じ余白＝上に 30 ドット・左右下に 4 ドット）、人物は下端中央、床・地面（`floor.wood` など）は画像1枚＝1マス、家の正面（`house.front`、キー `<roof>_<wall>_<door>` か `default`）は壁帯いっぱいに貼る。
   - Godot 用に書き出した `godot/data/sprites.json` の `ox`,`oy` を使うなら `anchor = {x: -ox, y: -oy, tile: 32}`。
3. ブラウザで `index.html` を **http(s) で**開いて確認（`file://` では manifest を読まないのでコード描画のまま）。強制再読み込みでキャッシュを捨てる。
4. 注意：
   - 植物の入った鉢・プランターは、成長段階・季節の差分が要るのでコード描画のまま。
   - 画像を指定したアイテムは季節の描き分け（木の葉の色など）をしない。季節ごとに替えたいときは、今はコード描画のままにしておく。
   - 点灯中の灯りは、画像の上にコードのグロー（光のにじみ）を重ねる。
   - パス に `..` や絶対パスは使えない（無視される）。読めない画像は黙ってコード描画に戻る。
   - `docs/asset-inventory.md` の該当行に「生成画像（ComfyUI）・採用日」を追記し、manifest の `sourceType` を `comfyui` に、`status` を検品後 `verified` に。
