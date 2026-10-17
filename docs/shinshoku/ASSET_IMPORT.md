# ASSET_IMPORT — 外部で作ったキャラクターと動きを入れる手順（コードの変更なし）

**2026-10-17 から、キャラクターの本番は外部で作ったモデル（VRM 1.0 推奨）＋本物の動き（VRMA）**です（`DECISIONS.md`「キャラクターの作り方（P14）」）。
コードで組んだキャラクターと手続きの動きは**予備**（ファイルが無い・読めない時だけ）。**作り方は `VROID_GUIDE.md`**（はじめての人向け）。

**ファイルを置いて表を書くだけ**で差し替わります。読めなかった時はコードで組んだ仮のキャラクターのまま動きます（コンソールに `[shinshoku]` の警告）。

## 1. 置く場所と表
- モデル：`shinshoku/assets/characters/`
- 動き：`shinshoku/assets/anim/<だれ>/`（`.vrma` と表 `clips.json`）
- 表：`shinshoku/assets/characters/manifest.json` の `characters.<名前>`

| 名前（キー） | だれ | 高さ `height`（m） | おすすめの形式 |
|---|---|---|---|
| `dannoura` | だんのうら（紫の姿・男性） | **1.64** | `.vrm`（VRM 1.0。0.x も可） |
| `companion` | 相棒（名前未定） | 1.58 | `.vrm` |
| `kiro` | 帰路 | 1.78 | `.glb`（何体も出すので複製できる glTF） |
| `heiten` | 閉店 | 2.15 | `.glb` |
| `shuuyou` | 収容者（避難所） | 2.6 | `.glb` |

## 2. 表の書き方
```json
"dannoura": { "file": "dannoura.vrm", "fileLow": "dannoura_low.vrm", "portrait": "dannoura_face.png", "provisional": false,
              "height": 1.64, "fit": "bbox", "scale": 1, "rotateY": 0, "shader": "mtoon", "anim": "../anim/dannoura/clips.json",
              "sockets": {}, "source": "VRoid Studio 2.14.0 で自作", "license": "（利用条件）", "author": "（作者）" }
```
| 欄 | 意味 |
|---|---|
| `file` | `.vrm`／`.glb`／`.gltf`（拡張子で読み分け）。`null` で仮のキャラクター（予備） |
| `fileLow` | スマホ（画質「低」）で代わりに読む軽い版（任意） |
| `portrait` | 顔絵（`.png` `.webp` `.jpg`、正方形 256〜512px）。無ければ HUD は 3D の顔を写す |
| `height`・`fit` | `fit: "bbox"`（既定）＝見た目の上下の幅を `height` に。`"none"`＝作ったままの大きさ。`scale` を 1 以外にするとそちらが優先 |
| `rotateY` | 前向きの補正（ラジアン）。本作は **+Z が前**（VRM 0.x は自動で回す） |
| `shader` | VRM の材質：`"mtoon"`（そのまま・既定）／`"toon2"`（本作の段の陰影へ変換・不透明の物だけ）／`"basic"`（一番軽い） |
| `outline` | `false` で MToon の輪郭線を消す（スマホの「低」は自動で消す） |
| `maxTex`・`maxTexLow` | テクスチャの最大 px（`maxTexLow` 既定 1024：スマホの「低」） |
| `anim` | 動きの組 `clips.json`（このフォルダからの相対）。`null` なら手続きの予備の動き |
| `sockets` | 武器・背中の物の差し込み口：`{ "rightHand": { "bone": "rightHand", "pos": [x,y,z], "rot": [x,y,z] } }`（`bone` は人型の名前かモデルの中の節の名前） |
| `springs` | VRM に揺れ物が無い時だけ、本作の揺れ物（`charkit/motion/spring.js`）を当てる鎖の表 `[{ "name", "bones": [節の名前…], "stiffness", "gravity", "radius" }]` |
| `blendS`・`footIK` | 動きの切り替えの混ぜの秒（既定 0.2）・足の固定（既定 true） |
| `restPose`・`bones` | glTF だけ：骨の休みの姿勢（`"T"`／`"A"`・`"down"`／`"auto"`）・骨の名前の対応表 |
| `source`・`license`・`author` | **必ず記入**。仮の素材は `provisional: true` |

`testEntries`：URL に `?vrm=<名前>` を付けた時だけ `characters` に重ねる表（試験用）。`?vrm=test` は下の試験用の VRM＋VRMA。

## 3. VRM（本番の道）でゲームがすること
`shinshoku/actor/vrm.js` → `charkit/runtime/vrmrt.js`（three-vrm 3.5.5）：
- **骨**：VRM の humanoid（normalized）の 17 本（＋目・肩・つま先・あご）。手続きの姿勢（予備）は「腕を下ろした休み」の値を **T ポーズの骨へ付け替えて**当てる（`charkit/runtime/tpose.js`・`Poser` の `tpose`）。脚は歩きの係（足の IK）。
- **動き**：`anim` の VRMA を three-vrm-animation 3.5.5 で読み（`charkit/runtime/vrma.js`）、`charkit/anim/clipanim.js` の状態機械で再生：
  待機・移動（速さで 4 本を重ねる・足の位相をそろえる・**進んだ距離に合わせて再生**＝distance matching）・動き出し／止まり／その場の向き替え（あれば）・攻撃（**`shinshoku/data/combat.js` のこまが正**：クリップの `hitStart`・`hitEnd` を区間ごとに伸び縮み＝`charkit/anim/combatfit.js`）・ひるみ・回避（あれば）・会話の手（上半身だけ）。
  切り替えは**慣性の混ぜ**（前のこまの姿勢との差を 0.2 秒で 0 へ）。移動・待機では**足の固定**（着いた足の滑りの残りを打ち消して脚を IK で解き直す・床に入れない）。無い動きは手続きの予備。
- **表情**：瞬き・感情（smile→happy など）・**字幕の文字から口（aa・ih・ou・ee・oh）**・視線（VRM の lookAt：骨か表情）＝`charkit/face/driver.js`。
- **揺れ物**：VRM の SpringBone。無い時は `springs` の表で本作の揺れ物。場面の切り替えで休みへ戻す。
- **武器**：手の骨に差し込み口を作り、刀・銃・鉄パイプ・火縄銃を持たせる（`sockets` で直せる）。
- **三人称**：初めの人称だけの網（firstPersonOnly）は隠す。影を落とす・受ける。
- 根の動き：`rootMotion: "xz"` のクリップは腰の水平の動きを抜いて、その場の動きにする（抜いた距離から速さ `speedMS` を出す）。ゲームの移動の速さ・当たりはゲーム側が決める（動きは見た目だけ）。

## 4. 動きの組 `clips.json`（wakaba-clipset/1）
```json
{ "spec": "wakaba-clipset/1", "skeleton": "vrm1-humanoid",
  "clips": {
    "idle": { "file": "idle.vrma", "role": "idle", "loop": true },
    "loco.walk": { "file": "loco_walk.vrma", "role": "loco", "loop": true, "speedMS": 1.4, "rootMotion": "none", "events": [{ "t": "footL", "u": 0 }] },
    "cmb_katana_light_1": { "file": "cmb_katana_light_1.vrma", "role": "attack", "fps": 60, "frames": 24,
      "events": [{ "t": "hitStart", "frame": 6 }, { "t": "hitEnd", "frame": 10 }], "match": { "weapon": "katana", "heavy": false, "step": 0 },
      "combatRef": { "file": "shinshoku/data/combat.js", "path": "COMBAT.katana.light[0]" } }
  } }
```
役割（`role`）：`idle`・`loco`・`start`・`stop`・`turnL`・`turnR`・`dodge`・`attack`・`hit`・`gesture`。詳しくは `VROID_GUIDE.md` §4。

## 5. 試験用の VRM（配管の試験・本番の絵ではない）
- `shinshoku/assets/characters/test/dannoura_test.vrm`：コードで組んだだんのうらを **VRM 1.0** に書き出した物（T ポーズに焼き直し・人型 19 本・表情 14（瞬き・母音・感情：顔の部品を写した網＋モーフ）・揺れ物 7 鎖・MToon・頂点色）。
- `shinshoku/assets/anim/test/*.vrma`＋`clips.json`：手続きの動き（待機・歩き・小走り・走り・全力・刀の弱 1 段目・刀の強・ひるみ）を録った VRMA。
- 作り直し：`node tools/charkit/export_test_vrm.mjs`（Playwright の Chromium の中で書き出す。`dannoura_test.meta.json` に sha256）。
- 使う：`shinshoku.html?vrm=test`（`test_noanim`＝クリップなし・`test_toon2`＝材質を toon2 へ）、`tools/charkit/motion_lab.html?vrm=test&scn=walk`。
- 試験：`tests/wakaba-charkit-vrm.test.mjs`（node で three-vrm に読ませる）。権利の門は `test: true` の素材を本番の束で止める（`TEST_ONLY`）。

## 6. 確かめ方
1. `python3 -m http.server 8797 --directory <リポジトリ>` を起動。
2. 動きの実験場：`http://localhost:8797/tools/charkit/motion_lab.html?vrm=1&scn=walk`（`run`・`sprint`・`idle`・`combo`・`startstop`。`&say=だんのうらよ` で口）。
3. 並べて見る：`tools/shinshoku_viewer.html?manifest=1`（`&c=dannoura` で 1 体だけ・`&spin=1` で回す）。
4. ゲーム（`shinshoku.html`）を開き、コンソールに `[shinshoku]` の警告が無いか。`?perf=1` で fps・描画の数。
5. 自動：`node tests/run.mjs`・`SH_QUERY=vrm=test node tools/shinshoku_play.mjs --only pc`（全部の場面に URL の引数を足す）・`node tools/charkit/capture.mjs --extra '&vrm=1'`（GIF と足の滑りなどの数値）。

## 7. 注意
- 1 体あたり 3〜4 万三角形・材質 8・テクスチャ 2048px まで（スマホ用 `fileLow` は 1.5〜2 万・1024px）。
- ライセンス・作者・出典を必ず `license` `author` `source` に書く。キャラクターの設定（`<id>.character.json`）の `license.verifiedBy` は**人が確かめて書く**（AI は書かない）。権利の門（`mapkit/assets/gate.js`）：VRM の利用条件が非商用・Tripo の無料プラン・Mixamo を Web・試験用の素材は止まる。VRoid Studio の規約は要確認（`VROID_GUIDE.md` §3）。
- 参考画像（`docs/shinshoku/reference/`）はゲームの中では使わない。
