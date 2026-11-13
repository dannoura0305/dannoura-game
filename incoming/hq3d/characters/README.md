# hq3d キャラクター 3D モデル（PC から持ち込み）

自宅 PC の `C:\wakaba\wakaba-character-model-factory\hq3d\characters\` にある 3D モデルを、2026-11-07 にこのフォルダへ写したものです。
ゲームへの組み込みはまだしていません（置き場所として入れただけ）。

## 入れたもの

各キャラについて、**いちばん新しい完成版 1 つ**と、それを作るための元ファイルを入れています。

| フォルダ | キャラ | 完成モデル | 元にした作業回 | 備考 |
|---|---|---|---|---|
| `dannoura/` | だんのうら（通常の姿） | `model/dannoura.vrm` | `runs/20261107-150949` | 配信で使っている本番の `dannoura_normal.vrm` と同じファイル |
| `dannoura_white/` | だんのうら（白い姿） | `model/dannoura_white.vrm` | `runs/20261107-153716` | 本番の `dannoura_sick.vrm` と同じファイル |
| `dannoura_visit/` | だんのうら（見舞い時の外見・髪の白いメッシュ） | `model/dannoura_visit.vrm` | `runs/20261107-154859` | 本番には未投入 |
| `musume/` | だんのうらの娘（身長 100cm） | `model/musume.vrm` | `runs/20261107-144709` | |
| `akari/` | 瀬名 灯里 | `model/akari.vrm` | `runs/20261107-145156` | |
| `wakaba/` | わかば | `model/wakaba.vrm` | `runs/20261107-155023` | 本番の `wakaba.vrm` と同じファイル |
| `nekomata/` | 猫又 | `model/nekomata.glb` | `runs/v10` | 2026-11-13 に v1 から差し替え（守る姿勢 2 種つき） |
| `_tools/` | 作り方のスクリプト（共通） | — | — | 下の「作り方」を参照 |

各キャラのフォルダの中身：

- `model/` … 完成モデル
- `source/` … 作り方の元ファイル
  - `*.vroid` … VRoid Studio の元データ（人型キャラのみ。見舞い時の姿は通常の姿と同じ体なので無し）
  - `*_vroid.vrm` … VRoid Studio から書き出した素の VRM（Blender で手を入れる前）
  - `adjust.json` … Blender での手直しの指定（いまの設定）／`adjust_used.json` … 完成版を作ったときの指定
  - `reference.json`・`reference/*.webp` … 見比べに使った設定画と、その読み取り結果
  - `build.json`・`make_build*.py` … 猫又を Blender で一から組むための設定とスクリプト
- `preview_*.png` … 完成版の正面の確認画像

## 作り方（`_tools/`）

| ファイル | 役目 |
|---|---|
| `_tools/hq3d/run.js` | 人型キャラの作業の入口。VRoid の素の VRM に `adjust.json` の手直しを当て、設定画と見比べる |
| `_tools/blender_python/vrm_refine.py` | Blender で VRM に手を入れる本体（尻尾・猫耳・小物・服の柄など） |
| `_tools/blender_python/hq3d_parts.py` | 足すパーツの形を作る |
| `_tools/blender_python/vrm_roundtrip.py`・`vrm_pose_fit.py`・`hq3d_pose.py` | VRM の読み書き・ポーズ合わせ |
| `_tools/blender_python/vrm_views.py`・`vrm_compare_render.py`・`hq3d_glb_views.py` | 確認画像を撮る |
| `_tools/hq3d/hq3d_compare.py`・`hq3d_sheet_silhouette.py` | 設定画との色・シルエットの比較 |
| `_tools/blender_python/hq3d_dragon.py`・`hq3d_dragon_face.py` | 竜の骨格・体を組む（猫又のスクリプトが読み込むので残している） |
| `_tools/blender_python/hq3d_nekomata.py` | 猫又を一から組む |
| `_tools/hq3d/creature_check.js`・`sway_check.js` | 竜・猫又の自動確認 |

使った道具：Blender 5.x（Khronos glTF Blender I/O v5.2.39）、VRM Add-on for Blender 4.10.3、VRoid Studio 2.3.0。
スクリプトはもとの置き場所（`wakaba-character-model-factory/server/...`）を前提に書かれているので、このフォルダからそのままでは動きません。中にあるパス（`C:\Users\user\...` など）も PC 側のものです。

## 各モデルのまとめ

ポリゴン数は三角形の数です。骨の数はスキンに使われている骨の数。

| キャラ | 形式 | 骨の種類 | 骨の数（うち揺れもの） | ポリゴン数 | 頂点数 | 表情（モーフ） | 大きさ |
|---|---|---|---|---|---|---|---|
| だんのうら | VRM 1.0（.vrm） | VRoid 人型骨格（VRM Humanoid 54 本）＋揺れもの | 130（72） | 34,522 | 22,716 | 57 | 14.4MB |
| だんのうら 白い姿 | VRM 1.0 | 同上 | 148（88） | 39,976 | 27,560 | 57 | 14.0MB |
| だんのうら 見舞い時 | VRM 1.0 | 同上 | 130（72） | 34,522 | 22,716 | 57 | 14.5MB |
| 娘 | VRM 1.0 | 同上 | 228（155） | 45,437 | 31,601 | 57 | 13.9MB |
| 瀬名 灯里 | VRM 1.0 | 同上 | 124（67） | 48,860 | 34,595 | 57 | 15.1MB |
| わかば | VRM 1.0 | 同上 | 172（112） | 99,254 | 86,936 | 57 | 20.0MB |
| 猫又 | glTF 2.0（.glb） | 自作の四つ足骨格（ルーンと同じ骨の名前） | 34（なし） | 87,005 | 106,427 | 13 ＋ 動き 3 本（idle・guard_crouch・guard_rise） | 7.6MB |

- 人型 6 体は VRoid Studio で作った体に、Blender で尻尾・猫耳・小物などを足して書き出したものです。骨の名前は VRoid の `J_Bip_*`（体）・`J_Sec_*`（揺れもの）に、足したパーツの骨が加わっています。材質は MToon。
- 猫又は v10 で 8.7 万ポリゴンになりました（v1 は 25 万）。

## ライセンス

### モデルに書き込まれている利用条件（VRM の meta）

人型 6 体はすべて **VRM Public License 1.0**（https://vrm.dev/licenses/1.0/）、作者は「WAKABA Project」。

| キャラ | 誰が使えるか | 商用 | 再配布 | 改変 | クレジット |
|---|---|---|---|---|---|
| だんのうら・白い姿・見舞い時・わかば | 作者のみ | 法人でも可 | 不可 | 不可 | 必要 |
| 娘・瀬名 灯里 | 作者のみ | 個人の非営利のみ | 不可 | 不可 | 必要 |

猫又は .glb なので利用条件の書き込みはありません。

> **注意**：このリポジトリは公開されています。モデルの条件は「再配布不可」ですが、作者本人の置き場所として入れています。第三者が持ち出して使ってよいという意味ではありません。娘・灯里は「個人の非営利のみ」になっているので、商用で使う前に書き換えが必要です。

### 使った素材

| 素材 | 出どころ | 条件 |
|---|---|---|
| 人型 6 体の体・髪・服の元 | VRoid Studio 2.3.0 の標準パーツで作成 | VRoid Studio の利用規約に従う（作った人がモデルを利用・商用利用できる） |
| 尻尾・猫耳・眼鏡・小物・服の柄など足したパーツ | Blender のスクリプト（`_tools/`）で形と色を作ったもの。外の画像やモデルは読み込んでいない | 自作 |
| 猫又 | Blender のスクリプトで一から組んだもの。外の画像やモデルは読み込んでいない | 自作 |
| 設定画（`source/reference/*.webp`） | 本人が用意した設定画 | 本人の著作物（出どころの確認はしていません） |

## 入れなかったもの

**100MB を超えるファイル：なし**（元のフォルダ全体 7,017 ファイルを調べて、100MB を超えるものは 1 つもありませんでした）。

大きさのため、次は入れていません（PC 側には残っています）：

| 入れなかったもの | 量 |
|---|---|
| 各キャラの古い作業回（`runs/` の最新以外：わかば 108 回・ルーン 71 回・娘 11 回 など）の .vrm / .glb / .blend と確認画像 | 約 6.3GB（元のフォルダ全体は 6.5GB） |
| `source/history/` の古い VRM（`akari_vroid_v1_bighead.vrm` 16.2MB、`dannoura_prod_20261104.vrm` 16.0MB、`dannoura_sick_prod_20261104.vrm` 16.7MB、`musume_vroid_v1〜v3_*.vrm` 各 14.6〜14.9MB） | 約 93MB |
| `history.jsonl`（作業の記録） | 小 |

足りないもの：

- **わかばの VRoid 元データ**（`wakaba.vroid`・`wakaba_vroid.vrm`）は hq3d のフォルダには無かったので、PC 側の `wakaba-system/cast-engine/storage/models3d/wakaba/src/` から写して `wakaba/source/` に入れました。同じ場所にある服の柄の画像（`pattern_*.png`・`tops_layer.png`・`cuff_plain.png`）は入れていません（出どころ未確認）。
- **猫又の .blend** は作業回に残っていません（スクリプトと `build.json` から作り直せます）。
- だんのうらの見舞い時の姿は .vroid を持たず、だんのうら（通常）の元データに Blender で手を入れて作っています。

## 外したもの

- 2026-11-07：ルーン（竜）は『だんのうら』とは関係ないため、利用者の指示でこのフォルダから外しました（`rune/`）。PC 側の元ファイルはそのまま残っています。竜の骨格のスクリプト（`hq3d_dragon*.py`）は猫又のスクリプトが使うので残しています。
