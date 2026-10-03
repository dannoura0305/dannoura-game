# だんのうら 家づくり — Godot 4 試作

Web 版（このリポジトリの `index.html` ＋ `main/home/*.js`、GitHub Pages）は**そのまま残し**、
「家・庭の模様替え画面」1 画面だけを Godot 4 に移して試すためのプロジェクトです。

> **注意：この環境には Godot が無く、このプロジェクトは Godot で一度も開いて・動かして確認していません。**
> GDScript は構文チェッカー（gdtoolkit 4 の `gdparse`）を通し、JSON・画像の参照先・`res://` パスは機械的に確かめましたが、
> Godot のエディタ／実行時のエラー（型の推論、ノードの細かい挙動、見た目のずれなど）は未確認です。
> 最初に開いたときに出力パネルのエラーを見て、直す前提で使ってください。

---

## 開き方（Godot 4.7.x）

1. Godot 4.7 系（4.3 以降なら動く想定。`TileMapLayer` は使っていません）を起動。
2. プロジェクトマネージャーで **インポート** → このフォルダの `godot/project.godot` を選ぶ。
3. 初回は PNG とフォントの取り込み（`.godot/` と `*.import` の生成）に少し時間がかかります。
4. F5（プロジェクトを実行）。メインシーンは `res://scenes/home.tscn`。

- 画面：縦長 540×960（`canvas_items` ＋ `expand`）。PC ではウィンドウ 405×720 で開きます。
- レンダラー：`gl_compatibility`（Web 書き出しと古いスマホのため）。
- ドット絵：テクスチャフィルターは最近傍（Nearest）。2D の位置はピクセルにスナップ。
- フォント：DotGothic16（Web 版と同じ。SIL OFL 1.1、`assets/fonts/OFL.txt`）。

### 配置ロジックのテスト（ヘッドレス）

```sh
godot --headless --path godot -s res://scripts/tests/test_placement.gd
```

期待値は Web 版の `main/home/placement.js` を node で動かして得たものです（理由の日本語も同じ文言）。
失敗があると終了コード 1。※ これもこの環境では実行していません。

---

## できること（試作の範囲）

| 項目 | 内容 |
|---|---|
| 部屋 12×8／庭 16×12 | Web 版から書き出した背景（床・壁帯・出入口の印）を 1 枚の Sprite2D で敷き、その上にマス単位で配置 |
| 初期配置 | Web 版の新規ゲームと同じ（`HOME._fresh()` を書き出した `data/default_home.json`） |
| 前後関係 | 家具と人物は `y_sort_enabled` の Node2D に入れ、足元の下端の y で並ぶ（Web 版の z と同じ規則。solid でない家具は少し奥） |
| 人物 | だんのうら・娘（4 歳）・三毛猫。だんのうらはタップした場所へ歩く（4 近傍の最短経路）。娘と猫は近くを歩き回り、猫はクッションやラグで丸くなる |
| 暮らしモード | 家具をタップすると説明と「使う位置」（黄色い枠）。使えないときは理由。灯りは点けたり消したり（保存される） |
| 模様替え | 収納から選ぶ → マスをタップでプレビュー（半透明＋緑の枠／置けないマスは赤い ✕）→ ［置く］（同じマスをもう一度タップでも置く） |
| 操作 | 置く・回転・収納・移動・解除・取り消し・やり直し・破棄（変更があれば確認）・確定。部屋⇔庭をまたいだ移動も可（移動中にタブを切り替える） |
| 理由の表示 | 置けない理由は Web 版と同じ日本語（例：「出入口をふさいでしまいます」「家の戸口から門まで通れなくなります」）を下のパネルに文で表示 |
| ルール | 占有・回転（90/270 で幅と高さを入れ替え）・レイヤー（ラグ／飛び石／家具／壁）・壁掛けは部屋の y=0 だけ・出入口は常に空ける・部屋は戸口から全空きマスへ、庭は戸口から門へ歩けること・収納数＝所持−配置 |
| 保存 | 確定したときに `user://home.json` へ。形は Web 版の `gs.homeData` と同じ |
| 昼／夜 | 見出しの［夜］［昼］で切り替え。夜は部屋全体を少し暗くし、点けた灯りの周りを `PointLight2D` で明るく |
| PC 向けキー | R 回転、Enter 置く、Esc 解除、Delete 収納、M 移動、矢印でプレビュー移動、Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y |

UI は参考画像の雰囲気（濃紺のパネルに金の縁、主ボタンは金色、選択はシアンの光）を `StyleBoxFlat` だけで作っています。
ボタンは高さ 56px 以上（タッチの目安 44px 以上）。既製の素材や他作品の画像は使っていません。

### Web 版とのデータの行き来

- **Web → Godot**：Web 版のブラウザの開発者ツールで `copy(JSON.stringify(gs.homeData))` を実行し、
  中身を Godot の `user://home.json` に保存して起動。セーブ全体（`{..., "homeData": {...}}`）を置いても `homeData` だけを読みます。
- **Godot → Web**：`user://home.json` の中身を Web 版で `gs.homeData = <その JSON>; HOME.ensure(); saveGame(true)`。
- `user://` の場所：Windows `%APPDATA%\Godot\app_userdata\だんのうら 家づくり（Godot試作）\`、
  macOS `~/Library/Application Support/Godot/app_userdata/…`、Linux `~/.local/share/godot/app_userdata/…`。
- 植物・イベント・思い出・bonds・life などは Godot 側では使いませんが、**消さずにそのまま持ち回ります**。
  読込時は `state.js` の修復（不明 ID・重なり・はみ出し・所持数超過・通れない配置は収納へ戻す）を移植したものを通します。
- 下のパネルの［データ］→［初期配置に戻す］で保存を初期状態に上書きできます。

---

## 絵の書き出し（Web 版 → PNG）

絵は Web 版の `main/home/sprites.js`（`HOME_ART`、コードで描くドット絵）を Chromium で描いて PNG にしたものです。

```sh
# リポジトリのいちばん上で
node tools/export_sprites.mjs
```

- Playwright（`/opt/node22/lib/node_modules/playwright`）と Chromium（`/opt/pw-browsers/chromium`）を使います。
  別の環境では `tools/export_sprites.mjs` 先頭の import と `executablePath` を書き換えてください。
- 出力（すべて T=32、1 ドット＝2px）：

| 置き場所 | 中身 |
|---|---|
| `assets/sprites/items/<itemId>_r<回転>_<色>[_lit / _f1].png` | 家具・飾り。回転×色違い、灯りの点灯（にじみ込み）、2 コマ目（動くものだけ） |
| `assets/sprites/chars/<dan/kid/cat>_<向き>_<ポーズ>_<コマ>.png` | 人物。dan: stand/walk/sit/work/hold、kid: stand/walk/sit/read/sleep、cat: stand/walk/sit/sleep（HOME_ART が猫に対応していれば） |
| `assets/sprites/bg/<room/garden>_bg_<day/night>.png` | 床＋壁帯＋出入口の背景（配置なし）。`wall_room_*.png` は壁帯だけ |
| `assets/sprites/tiles/<tileId>_atlas.png` | 床・地面の模様違い 8×8（TileMapLayer に移すとき用。いまは未使用） |
| `assets/sprites/icons/…png`（48×48）、`assets/sprites/ui/…png`（32×32） | 収納リストとボタンのアイコン |
| `data/sprites.json` | 各 PNG の説明（下記） |
| `data/catalog.json` | `HOME.CATALOG`・`MATERIALS`・`RECIPES`・`AREAS`・`BAL` など |
| `data/default_home.json` | 新規ゲームの `gs.homeData` |

同じ絵は 1 枚にまとめるので、`sprites.json` の複数の項目が同じ PNG を指すことがあります。

### 位置合わせ（anchor / offset）

```
PNG の左上 = 足元範囲の左上（ピクセル）+ (ox, oy)
```

- アイテム：足元範囲＝回転後の占有 `fw × fh` マス（`fw, fh` も記録）。壁掛けは y=0 行の左上が基準（絵は壁帯へ上にはみ出す）。
- 人物：立っているマス（1×1）の左上が基準。娘の `sleep` は布団の左上（縦＝`down`、横＝`right`）。
- `ox, oy` はたいてい負（家具の高さ、影、灯りのにじみが外へはみ出すため）。`w, h` は PNG の大きさ。

例（`sprites.json` の一部）：

```json
"light.desk_lamp": { "w": 1, "h": 1, "layer": "furniture", "sprites": {
  "r0_default":     { "file": "items/light.desk_lamp_r0_default.png",     "fw": 1, "fh": 1, "ox": 2,   "oy": -30, "w": 30,  "h": 62 },
  "r0_default_lit": { "file": "items/light.desk_lamp_r0_default_lit.png", "fw": 1, "fh": 1, "ox": -40, "oy": -76, "w": 114, "h": 114 } } }
```

---

## ComfyUI などで描いた絵に差し替える

1. 差し替えたい PNG と**同じファイル名**で上書きする（例：`assets/sprites/items/furniture.futon_r0_default.png`）。
2. 絵の大きさや足元の位置が変わったら、`data/sprites.json` の該当項目の `ox, oy, w, h` を合わせる。
   - 足元範囲の左上から見て、PNG の左上がどこにあるか（px）が `ox, oy`。
   - 例：2×3 マス（64×96px）の布団を、上に 40px はみ出す 72×136px の絵にしたら `ox: -4, oy: -40, w: 72, h: 136` など。
3. 1 マス＝32px の縮尺を守る（人物は足元をマスの下端に合わせる）。ドット絵なら 2 の倍数の拡大で描くと崩れにくい。
4. 透明の背景（アルファ付き PNG）。影を絵に含めるなら右下へ（光源は左上）。
5. `node tools/export_sprites.mjs` を実行すると **`assets/sprites/` を消して書き直す**ので、差し替えた絵は別フォルダに保管するか、
   書き出し後にもう一度上書きしてください。
6. Godot のエディタに戻ると自動で取り込み直します。

主人公（だんのうら：紫の髪・めがね）・娘（4 歳）・三毛猫の見た目は `docs/asset-style-guide.md` と参考画像に合わせてください。
既存のゲーム・作品の絵をそのまま写したものは使わないでください。

---

## 書き出し（Web / Android）

Godot のメニュー **プロジェクト → エクスポート**。テンプレート（Export Templates）を先にダウンロードします。

### 共通（大事）

- **リソース → 「リソース以外のファイル／フォルダをエクスポートするフィルター」に `*.json` を追加**してください。
  `data/*.json` は `FileAccess` で直接読むため、入っていないと書き出し後に何も表示されません。
- PNG とフォントは取り込み済みのリソースとして入ります（エディタで一度開いてから書き出す）。

### Web

1. 「Web」プリセットを追加 → 書き出し。`index.html` ほか一式ができます。
2. GitHub Pages など静的ホスティングにそのまま置けます。Godot 4 の Web はスレッドを使わない設定（既定の
   「Thread Support」オフ）なら特別なヘッダーは不要です。オンにした場合は COOP/COEP ヘッダーが必要です。
3. 既存の Web 版とは別のフォルダ（例：`/godot-proto/`）に置けば、両方を並べて試せます。
4. 保存（`user://`）はブラウザの IndexedDB に入ります。

### Android

1. Android SDK と JDK 17 を入れ、エディタ設定 → エクスポート → Android にパスを設定。
2. 「Android」プリセットを追加。画面の向きは縦（project.godot で設定済み）。
3. デバッグ用キーストアで書き出し（または「リモートデバッグ」で実機へ直接）。
4. レンダラーは Compatibility なので、OpenGL ES 3.0 の端末で動く想定です。

---

## ファイル

```
godot/
  project.godot              設定（縦 540×960、canvas_items＋expand、gl_compatibility、Nearest）
  icon.svg
  scenes/home.tscn           ルート（Node2D + scripts/home.gd）だけ。UI はコードで組み立て
  scripts/
    home.gd                  画面全体：盤面・人物・入力・模様替えの流れ・UI
    placement.gd             placement.js の移植（占有・衝突・出入口・到達・使う位置・経路）
    draft.gd                 createDraft の移植（取り消し／やり直し）
    home_state.gd            homeData の読込・修復・保存（user://home.json）
    catalog.gd               data/*.json の読込（数値を int に直す）
    sprite_db.gd             sprites.json から PNG とずれを引く
    ui_theme.gd              テーマ（StyleBoxFlat）
    world_overlay.gd         マス目・選択枠・プレビュー枠・✕ の描画
    tests/test_placement.gd  ヘッドレスのテスト
  data/                      export_sprites.mjs が書き出す JSON
  assets/sprites/            export_sprites.mjs が書き出す PNG
  assets/fonts/              DotGothic16（OFL）
```

`class_name` は使わず、`const X := preload("res://…")` で参照しています（`-s` でのテストでもクラスキャッシュに頼らないため）。

---

## 分かっている制限

- **Godot で未実行・未検証**（上の注意を参照）。
- 盤面の拡大率は画面に合わせた倍率（整数倍ではない）なので、ドットの太さがわずかにそろわないことがあります。
  厳密にしたい場合は SubViewport に等倍で描いて整数倍で拡大する形に変えるのが次の一手です。
- 床は書き出した 1 枚絵。`TileMapLayer` には移していません（模様違いのアトラスは書き出し済み）。
- 植物（鉢の中の花の成長段階）の絵は書き出しておらず、鉢は空の鉢として表示されます。
- クラフト・水やり・会話イベント・思い出帳・訪問者・娘の就寝などの「暮らし」の機能は未移植（模様替え画面だけ）。
- 夜の庭の背景は Web 版の描画の都合で壁帯がやや暗めです。
- 灯りのにじみは PNG に焼き込んだもの＋ `PointLight2D` の二重なので、明るさは要調整。
- ボタンのアイコンは Web 版の 32×32 のドット絵。文字は DotGothic16 を 15〜32px で使っており、
  16 の倍数でない大きさでは少しにじみます。
- ピンチでの拡大・ドラッグでの移動（Web 版の PC ドラッグ）はありません。タップ操作だけです。
