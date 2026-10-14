# ASSET_IMPORT — 外部で作ったキャラクターを入れる手順（コードの変更なし）

外部のツール（わかばシステムなど）で作ったモデル・顔絵を、**ファイルを置いて表を書くだけ**で差し替えられます。読めなかったときは、コードで組んだ仮のキャラクターのまま動きます（コンソールに警告）。

## 1. 置く場所と表
- 置く場所：`shinshoku/assets/characters/`
- 表：`shinshoku/assets/characters/manifest.json` の `characters.<名前>`

| 名前（キー） | だれ | 高さ `height`（m） | おすすめの形式 |
|---|---|---|---|
| `dannoura` | だんのうら（紫の姿・男性） | **1.64** | `.vrm`（VRM 0/1）または `.glb` |
| `companion` | 相棒（名前未定） | 1.58 | `.vrm` または `.glb` |
| `kiro` | 帰路 | 1.78 | `.glb`（何体も出すので複製できる glTF） |
| `heiten` | 閉店 | 2.15 | `.glb` |
| `shuuyou` | 収容者（避難所） | 2.6 | `.glb` |

## 2. ファイル名の例
```
shinshoku/assets/characters/dannoura.vrm
shinshoku/assets/characters/dannoura_face.png     ← 顔絵（会話・左上の HUD）
shinshoku/assets/characters/companion.glb
shinshoku/assets/characters/companion_face.png
shinshoku/assets/characters/kiro.glb
```
```json
"dannoura": { "file": "dannoura.vrm", "portrait": "dannoura_face.png", "provisional": false, "height": 1.64, "scale": 1, "rotateY": 0,
              "restPose": "auto", "bones": {}, "source": "わかばシステムで作成", "license": "（利用条件）", "author": "（作者）" }
```
- `file`：`.vrm` / `.glb` / `.gltf`（拡張子で読み分け）。`null` で仮のキャラクター。
- `portrait`：顔絵（`.png` `.webp` `.jpg`、正方形 256〜512px、背景は透明か暗い色）。無ければ HUD は 3D モデルの顔を自動で写す。
- `height`：足元から頭のてっぺんまで（m）。モデルの大きさをこの高さに合わせる。`scale` を 1 以外にすると、そちらが優先。
- `rotateY`：前向きの補正（ラジアン）。本作のキャラクターは **+Z を向く**（VRM 0 は自動で回す）。
- `restPose`：骨の休みの姿勢。`"T"`（T ポーズ）／`"A"`・`"down"`（腕を下ろした姿勢）／`"auto"`（自動判定）。
- `bones`：骨の名前の対応表（glTF だけ）。下の名前で見つからない骨だけ書けばよい。例 `{ "hips": "Pelvis", "leftUpperArm": "L_Arm" }`。

## 3. 骨（人型）の約束
- 動きは本作の手続きアニメ（`shinshoku/actor/anim.js`）を骨に当てる。必要な骨は 17 本：
  `hips spine chest neck head` ／ `left|right` × `UpperArm LowerArm Hand UpperLeg LowerLeg Foot`
- **VRM**：humanoid の骨をそのまま使う（いちばん確実）。
- **glTF / GLB**：骨の名前を自動で探す（VRM 風・Mixamo `mixamorig:Hips` など・Blender の `upper_arm.L` `thigh.R` など）。10 本未満しか見つからないと警告を出す（そのときは `bones` に書く）。
- 骨の向き：**親から子へ伸びる向きが揃っている**（Mixamo・VRM と同じ）と姿勢が自然になる。骨の軸が独自のモデルは、腕や脚がねじれて見えることがある。
- モデルに入っているアニメーションは今は使わない（将来 `"animations": "clips"` で使えるようにする）。
- 刀・銃・鉄パイプは右手の骨（`rightHand`）に自動で持たせる。

## 4. 確かめ方
1. `python3 -m http.server 8797 --directory <リポジトリ>` を起動。
2. `http://localhost:8797/tools/shinshoku_viewer.html?manifest=1` で、表のとおりに読めているかを並べて見る（`&c=dannoura` で 1 体だけ・`&spin=1` で回す）。
3. ゲーム（`shinshoku.html`）を開き、コンソールに `[shinshoku]` の警告が無いか見る。

## 5. 注意
- 1 体あたり 3〜5 万三角形まで、テクスチャは 2048px まで（スマホのため）。
- ライセンス・作者・出典を必ず `license` `author` `source` に書く（仮素材のときは `provisional: true`）。
- 参考画像（`docs/shinshoku/reference/`）はゲームの中では使わない。
