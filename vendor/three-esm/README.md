# vendor/three-esm — 『境界侵食』用の three.js（ES Module 版・版固定）

既存の `vendor/three.min.js`（r158 UMD・既存ミニゲーム用）とは別物。本作（`shinshoku.html`）だけが importmap で読む。

| フォルダ | 元 | 版 | ライセンス |
|---|---|---|---|
| `three-0.185.1/three.module.min.js`・`three.core.min.js` | npm `three@0.185.1`（`build/`） | 0.185.1（2026-07-01 公開） | MIT（`three-0.185.1/LICENSE`） |
| `three-0.185.1/addons/loaders/GLTFLoader.js` | 同 `examples/jsm/loaders/` | 同 | MIT |
| `three-0.185.1/addons/utils/BufferGeometryUtils.js`・`SkeletonUtils.js` | 同 `examples/jsm/utils/` | 同 | MIT |
| `three-0.185.1/addons/libs/meshopt_decoder.module.js` | 同 `examples/jsm/libs/`（meshoptimizer の復号器・MIT） | 同 | MIT |
| `three-0.185.1/addons/loaders/KTX2Loader.js`・`utils/WorkerPool.js`・`math/ColorSpaces.js`・`libs/ktx-parse.module.js`・`libs/zstddec.module.js`・`libs/basis/basis_transcoder.{js,wasm}`（＋その README） | 同 `examples/jsm/`（Basis Universal の transcoder は Apache-2.0） | 同 | MIT・Apache-2.0 |
| `three-vrm-3.5.5/three-vrm.module.min.js` | npm `@pixiv/three-vrm@3.5.5`（`lib/`） | 3.5.5（2026-07-09 公開・peer three>=0.137） | MIT（`three-vrm-3.5.5/LICENSE`） |
| `three-vrm-animation-3.5.5/three-vrm-animation.module.min.js` | npm `@pixiv/three-vrm-animation@3.5.5`（`lib/`・three-vrm-core を中に含む 1 ファイル・外から読むのは `three` だけ） | 3.5.5（2026-07-09 公開・three-vrm と同じ版・peer three>=0.137） | MIT（`three-vrm-animation-3.5.5/LICENSE`・(c) 2019-2026 pixiv Inc.） |

取得：`npm pack three@0.185.1 @pixiv/three-vrm@3.5.5` を展開して必要なファイルだけ写した（変更なし）。
2026-10-17：`npm pack @pixiv/three-vrm-animation@3.5.5`（npm の shasum `7e65c3572673ac9c0fd9bc561194f9413494be99`・SLSA の来歴つき）を同じやり方で追加（VRMA＝VRM Animation の再生。`charkit/runtime/vrma.js`）。
SHA-256：
```
86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6  three.module.min.js
05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90  three.core.min.js
97642d720f16cc9a0c9844934198e4d0c023bea8e89576d0f7545d03b2d103d2  addons/loaders/GLTFLoader.js
5c552223a9309883743b80538d6e9cdb45e3227f30d3ec56fb2c39b46e78d595  addons/utils/BufferGeometryUtils.js
b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f  addons/utils/SkeletonUtils.js
99f943e956e52dbf52bbe418899e8a8ae5e35f5c79a94ab8e404926afc620bf2  three-vrm.module.min.js
d428e73a000057c6c94bfcedc3412d0c2dc14ca8800e88553aab05113ad2bf19  addons/libs/meshopt_decoder.module.js
3a3233ce3409443076d3414b78832e1405fcfac5ecb34d367365fd0781127d6c  addons/loaders/KTX2Loader.js
8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1  addons/libs/basis/basis_transcoder.js
6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a  addons/libs/basis/basis_transcoder.wasm
f40c491f6c44dde511268121f778a0050e73b1a15fd844c1ae2c78c73213eafc  addons/libs/ktx-parse.module.js
5cbf818e842628a4464e748594a6deae18ceddda3c2f541e7b3a0ff5fc7611e2  addons/libs/zstddec.module.js
5ac7095fd566bc9ae48376055fd66edf27cb9ebbf9e1269dc206bfd4933ae9eb  addons/utils/WorkerPool.js
cc35c01c793cd17ccded7bc8142abffd3ce0d60dd6de8d5d216983bd05aee262  addons/math/ColorSpaces.js
31de9586a36a8ad806303b84358f11d74ce70ac1d2656b04e8a5da7a913aa907  three-vrm-animation-3.5.5/three-vrm-animation.module.min.js
279ec82987aec7e72ecb9850bb704a87e352d577bc7581454c30f3551a88ea92  three-vrm-animation-3.5.5/LICENSE
```
既知の食い違い（three r185 × three-vrm 3.5.5）：r185 では頂点色の `vColor` が vec4 なのに、MToon のシェーダーは vec3 として掛けるため、**頂点色を使う MToon**（VRM の既定は頂点色を無視するので普通の VRoid のモデルは当たらない）はシェーダーが作れない。`charkit/runtime/vrmrt.js` の `patchVColor` が `.rgb` に直す（頂点色を使う時だけ）。
mapkit（`mapkit.html` の検証マップ・2026-10-17 フェーズ 4）だけが、圧縮した素材（`.mo.glb`・`.ktx2`）がある時に Meshopt・KTX2 の復号器を読む（無ければ読まない）。境界侵食は使わない。
three-vrm・three-vrm-animation と GLTFLoader は VRM が manifest にある時（または `?vrm=test`）だけ動的に読み込む（起動時は読まない）。
版を上げるときは本作だけで確かめる（`node tools/shinshoku_play.mjs`）。
