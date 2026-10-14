# vendor/three-esm — 『境界侵食』用の three.js（ES Module 版・版固定）

既存の `vendor/three.min.js`（r158 UMD・既存ミニゲーム用）とは別物。本作（`shinshoku.html`）だけが importmap で読む。

| フォルダ | 元 | 版 | ライセンス |
|---|---|---|---|
| `three-0.185.1/three.module.min.js`・`three.core.min.js` | npm `three@0.185.1`（`build/`） | 0.185.1（2026-07-01 公開） | MIT（`three-0.185.1/LICENSE`） |
| `three-0.185.1/addons/loaders/GLTFLoader.js` | 同 `examples/jsm/loaders/` | 同 | MIT |
| `three-0.185.1/addons/utils/BufferGeometryUtils.js`・`SkeletonUtils.js` | 同 `examples/jsm/utils/` | 同 | MIT |
| `three-vrm-3.5.5/three-vrm.module.min.js` | npm `@pixiv/three-vrm@3.5.5`（`lib/`） | 3.5.5（2026-07-09 公開・peer three>=0.137） | MIT（`three-vrm-3.5.5/LICENSE`） |

取得：`npm pack three@0.185.1 @pixiv/three-vrm@3.5.5` を展開して必要なファイルだけ写した（変更なし）。
SHA-256：
```
86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6  three.module.min.js
05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90  three.core.min.js
97642d720f16cc9a0c9844934198e4d0c023bea8e89576d0f7545d03b2d103d2  addons/loaders/GLTFLoader.js
5c552223a9309883743b80538d6e9cdb45e3227f30d3ec56fb2c39b46e78d595  addons/utils/BufferGeometryUtils.js
b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f  addons/utils/SkeletonUtils.js
99f943e956e52dbf52bbe418899e8a8ae5e35f5c79a94ab8e404926afc620bf2  three-vrm.module.min.js
```
three-vrm と GLTFLoader は VRM が manifest にある時だけ動的に読み込む（起動時は読まない）。
版を上げるときは本作だけで確かめる（`node tools/shinshoku_play.mjs`）。
