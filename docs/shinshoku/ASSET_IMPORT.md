# ASSET_IMPORT — 外部で作ったキャラクターと動きを入れる手順（コードの変更なし）

**2026-10-17 から、キャラクターの本番は外部で作ったモデル（VRM 1.0 推奨）＋本物の動き（VRMA）**です（`DECISIONS.md`「キャラクターの作り方（P14）」）。
コードで組んだキャラクターと手続きの動きは**予備**（ファイルが無い・読めない時だけ）。**作り方は `VROID_GUIDE.md`**（はじめての人向け）。

**ファイルを置いて表を書くだけ**で差し替わります。読めなかった時はコードで組んだ仮のキャラクターのまま動きます（コンソールに `[shinshoku]` の警告）。

> **2026-10-18（P15）から**：だんのうら（紫）・だんのうら（白い姿）・相棒は、**リポジトリの中で Blender（bpy）で作った VRM 1.0 が既定**です（§5）。
> URL に `?vrm=0` を付けると VRM を読まずにコードで組んだ予備のキャラクターで動きます（比べる用）。VRoid Studio などで作ったモデルに差し替える時は、今まで通り manifest の `file` を書き換えるだけです（`VROID_GUIDE.md`）。

## 1. 置く場所と表
- モデル：`shinshoku/assets/characters/`
- 動き：`shinshoku/assets/anim/<だれ>/`（`.vrma` と表 `clips.json`）
- 表：`shinshoku/assets/characters/manifest.json` の `characters.<名前>`

| 名前（キー） | だれ | 高さ `height`（m） | おすすめの形式 |
|---|---|---|---|
| `dannoura` | だんのうら（紫の姿・男性） | **1.64** | `.vrm`（VRM 1.0。0.x も可） |
| `dannoura_white` | だんのうら（白い姿＝化けを解いた姿・同じ人物・男性）。`"kind": "white"` | 1.64 | `.vrm` |
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

## 5. リポジトリの中で作った VRM（既定・P15）
だんのうら（`dannoura.vrm`・`dannoura_low.vrm`）・白い姿（`dannoura_white.vrm`・`_low`）・相棒（`companion.vrm`・`_low`）は、
**Blender のスクリプトで形・骨・重み・表情・揺れ物・テクスチャまで作り、VRM 1.0 に書き出した自作**です（外の素材・外の道具の規約なし）。

| 物 | 中身 |
|---|---|
| 作り方 | `tools/blender/char/build_char.py`（Blender 5.2・頭なし）→ 包み（`*.pack.json`＋PNG）→ `tools/charkit/vrm_from_pack.mjs`（`charkit/core/vrmwrite.js` の `buildVRM1`）→ VRM 1.0 |
| まとめて作り直す | `node tools/charkit/build_chars.mjs --blender <Blender の実行ファイル>`（bpy の python があれば `--python <python>`）。`--chars dannoura`・`--lods pc,low`・`--skip-blender`（包みから VRM だけ）。途中の物は `build/`（Git に入れない）。meta（`<名前>.meta.json`：sha256・三角形・出典）と素材ライブラリ（`wakaba-assets/entries/character/char.<名前>/meta.json`）も書く。終わったら `node tools/mapkit/catalog.mjs` |
| 形 | 体・顔・服・靴・小物は SDF（なめらかにつないだ基本の形）→ 表面 → QuadriFlow（流れのそろった四角形）／間引き。法線は SDF の勾配（トゥーンの影がきれい）。顔の前は楕円体の法線へ寄せる（鼻・口のまわりのまだらな影を消す） |
| 顔 | 目の形の穴（テクスチャの透明）＋奥の目玉（虹彩の絵・目の骨で視線）＋上下のまぶたの殻（まつ毛の帯：まばたき・喜び・怒り・悲しみ・眠そう・驚きはまぶたを目玉のまわりに回すモーフ）・口と眉は顔の上の板（あ い う え お・笑い・怒り…） |
| 髪 | 房（先の細い平たい管）を頭の殻に沿って「育てる」＋頭皮の殻。だんのうら：前髪・横の房（揺れ物）・ポニーテール（揺れ物 5 本）。白い姿：乱れた白い髪・猫の耳（揺れ物）・しっぽ（揺れ物 6 本）・毛皮のえり。相棒：あご丈のボブ |
| 服 | 体をふくらませた形を切る（袖口・裾・前の開き・首）。上着は厚み（内側の帯・縁）・リブ・ファスナー・縫い目。しま・格子・ジーンズはテクスチャに焼く |
| 骨 | VRM 1.0 の人型（腰〜頭・目・肩・指 30 本・つま先）＋拡張（`ext_ponytail_*`・`ext_side_*`・`ext_cord_*`・`ext_ear_*`・`ext_tail_*`）。脚の比は動きのクリップの骨と同じ（足の固定がきく） |
| 表情・視線 | VRM の preset 14（blink・blinkLeft/Right・happy・angry・sad・relaxed・surprised・aa/ih/ou/ee/oh・neutral）。視線は目の骨（lookAt bone） |
| 揺れ物 | VRMC_springBone（頭・首・胴・腕・脚・リュックの当たり） |
| 材質 | MToon 5 つ（顔の肌・顔の部品・髪・服・小物）。影の色のテクスチャ・輪郭線・夜でも顔が暗くなりすぎない少しの発光 |
| 予算（実際） | PC：だんのうら 約 4.1 万・白い姿 約 4.2 万・相棒 約 3.3 万三角形、2〜3MB。スマホ（`fileLow`）：1.5〜1.9 万三角形、1.2〜1.5MB・テクスチャ半分 |
| 動き | `shinshoku/assets/anim/dannoura/`（本番の組・試験の印なし）：手続きの歩き（charkit の鍵の姿勢＋足の IK）・待機・刀の弱／強・ひるみを録った VRMA（`node tools/charkit/export_test_vrm.mjs --clips dannoura`）。白い姿も同じ組。相棒は手続きの動き（予備の道） |
| 見る | `tools/charkit/vrm_view.html?f=shinshoku/assets/characters/dannoura.vrm&layout=turn`（`heads`＝頭の 5 方向・`faces`＝表情の一覧・`hands`・`single&rot=0.6&dist=1.2&y=1.4`・`proc=dannoura`＝コードの予備を並べる・`pose=T|A|walk|squat`） |
| 試験 | `tests/shinshoku-p15-vrmchar.test.mjs`（人型の全部の骨・表情・揺れ物・予算・男性の体つき：肩幅 > 腰幅・権利の門・sw.js） |
| 権利 | VRM の利用条件は `commercialUsage: corporation`・作者 `dannoura-game project（tools/blender/char で生成）`。目録の `license.verifiedBy` は空（**人が確かめて書く**：門は `UNVERIFIED_GENERATED` の注意だけで通る） |

VRoid Studio で作ったモデルに差し替える：`manifest.json` の `characters.<名前>.file`（と `fileLow`）を書き換える（このリポジトリの VRM は消さずに残してよい）。`fit` は VRoid の時は `"bbox"` か `"none"`（`VROID_GUIDE.md` §3）。

## 6. 試験用の VRM（配管の試験・本番の絵ではない）
- `shinshoku/assets/characters/test/dannoura_test.vrm`：コードで組んだだんのうらを **VRM 1.0** に書き出した物（T ポーズに焼き直し・人型 19 本・表情 14（瞬き・母音・感情：顔の部品を写した網＋モーフ）・揺れ物 7 鎖・MToon・頂点色）。
- `shinshoku/assets/anim/test/*.vrma`＋`clips.json`：手続きの動き（待機・歩き・小走り・走り・全力・刀の弱 1 段目・刀の強・ひるみ）を録った VRMA。
- 作り直し：`node tools/charkit/export_test_vrm.mjs`（Playwright の Chromium の中で書き出す。`dannoura_test.meta.json` に sha256）。
- 使う：`shinshoku.html?vrm=test`（`test_noanim`＝クリップなし・`test_toon2`＝材質を toon2 へ）、`tools/charkit/motion_lab.html?vrm=test&scn=walk`。
- 試験：`tests/wakaba-charkit-vrm.test.mjs`（node で three-vrm に読ませる）。権利の門は `test: true` の素材を本番の束で止める（`TEST_ONLY`）。

## 7. 確かめ方
1. `python3 -m http.server 8797 --directory <リポジトリ>` を起動。
2. 動きの実験場：`http://localhost:8797/tools/charkit/motion_lab.html?vrm=1&scn=walk`（`run`・`sprint`・`idle`・`combo`・`startstop`。`&say=だんのうらよ` で口）。
3. 並べて見る：`tools/shinshoku_viewer.html?manifest=1`（`&c=dannoura` で 1 体だけ・`&spin=1` で回す）。
4. ゲーム（`shinshoku.html`）を開き、コンソールに `[shinshoku]` の警告が無いか。`?perf=1` で fps・描画の数。
5. 自動：`node tests/run.mjs`・`SH_QUERY=vrm=test node tools/shinshoku_play.mjs --only pc`（全部の場面に URL の引数を足す）・`node tools/charkit/capture.mjs --extra '&vrm=1'`（GIF と足の滑りなどの数値）。

## 8. 注意
- 1 体あたり 3〜4 万三角形・材質 8・テクスチャ 2048px まで（スマホ用 `fileLow` は 1.5〜2 万・1024px）。
- ライセンス・作者・出典を必ず `license` `author` `source` に書く。キャラクターの設定（`<id>.character.json`）の `license.verifiedBy` は**人が確かめて書く**（AI は書かない）。権利の門（`mapkit/assets/gate.js`）：VRM の利用条件が非商用・Tripo の無料プラン・Mixamo を Web・試験用の素材は止まる。VRoid Studio の規約は要確認（`VROID_GUIDE.md` §3）。
- 参考画像（`docs/shinshoku/reference/`）はゲームの中では使わない。
