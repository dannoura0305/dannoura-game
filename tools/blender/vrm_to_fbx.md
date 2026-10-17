# キャラクター：VRM → Web（three-vrm）と、VRM／FBX → UE5（方式 C）

**手順だけです（スクリプトは置いていません）。** クラウドに VRM アドオン入りの Blender・UE が無く、試せないためです（**未検証**）。
試験で確かめてあるのは、骨の名前の対応（VRM → UE5 マネキン）の表だけ：`charkit/rig/bonemap.js`・`charkit/rig/rename.js`・`tests/wakaba-charkit-rename.test.mjs`、表の JSON は `tools/blender/bonemap_vrm_to_ue5.json`（生成物：`node tools/charkit/export_bonemap.mjs`）。
考え方は `docs/wakaba-charkit/04_UnrealEngine連携方式.md` §6。

## 正本と 2 つの出口
| | Web（ブラウザ版・境界侵食） | UE5（高性能 PC 版） |
|---|---|---|
| 正本 | `.blend`（VRoid の素体を Blender で仕上げた物・標準骨格＝VRM 1.0 の humanoid の名前＋`ext_`） | 同じ `.blend` |
| 出す形 | **VRM 1.0**（VRM Add-on for Blender で書き出し）→ three-vrm で読む | **(1) FBX**（下の手順）または **(2) VRM のまま VRM4U プラグイン**（UE の版への対応は未確認） |
| 骨の名前 | VRM の名前のまま | (1) は UE5 の名前に付け替えると IK Retargeter が楽（必須ではない） |
| 単位・向き | m・+Y 上・+Z 前（VRM の決まり） | cm（FBX の単位の倍率で変換）・Z 上 |
| 陰影 | 独自のトゥーン（charkit `14` §4.7）・MToon の値を読む | UE の材質で作り直す（値の JSON は共通・見た目は近づけるだけ） |
| 揺れ物 | VRM SpringBone | Chaos Cloth／Kawaii Physics など（別に設定） |

## (1) FBX で UE5 へ（推奨の道）
1. 正本の `.blend` を**別名で保存**（例 `dannoura_ue5.blend`）。以下はその写しで行う（正本の骨の名前は VRM のまま残す）。
2. 骨の名前を UE5 に揃える（任意）：`tools/blender/bonemap_vrm_to_ue5.json` の `bones`（例 `hips → pelvis`・`leftUpperArm → upperarm_l`・`leftIndexProximal → index_01_l`）のとおりに、アーマチュアの編集モードで名前を変える。
   - `noTarget`（`leftEye`・`rightEye`・`jaw`）は UE5 のマネキンに無いので**そのまま**。`ext_`・`socket_` もそのまま。
   - 骨の数は UE5 と同じにならない（UE5 は `spine_01〜05`・`neck_01〜02`・手の平の骨がある）。**足りない骨は作らない**。UE の IK Retargeter の**チェーン**（`charkit/rig/chains.json` と同じ区切り）で合わせる。
   - 名前の変更で頂点グループの名前も一緒に変わる（Blender の標準の動き）。変わったか、ポーズモードで腕を回して確かめる。
3. 形を整える：全部の物に「全トランスフォームを適用」・アーマチュアの原点は足元（0, 0, 0）・T ポーズ（VRM の決まり）。
4. 書き出し：ファイル → エクスポート → FBX
   - 選択した物のみ（アーマチュア＋体の網）・**単位の倍率を適用：FBX_SCALE_UNITS**（「スケールを適用」の項目）・前 −Z・上 Y（Blender の既定）
   - アーマチュア：**リーフボーンを追加しない**（Add Leaf Bones をオフ）・主ボーンの軸の向きは既定
   - アニメーションを入れる時は「アニメーションをベイク」をオン（クリップごとに 1 ファイルでもよい）
   - 置き場所：共有素材ライブラリの `wakaba-assets/entries/character/<id>/source/<id>.fbx`（Git に入れない）。`sources.json` に sha256 を書く（`docs/wakaba-mapkit/10` §2）
5. UE5：コンテンツブラウザへドラッグ → Skeletal Mesh・**Convert Scene オン**・Import Uniform Scale 1.0。**確認**：身長が cm で正しいか（だんのうらの設定の身長）・100 倍になっていないか。
6. マネキンの動きを写す：IK Rig（だんのうら用・チェーンは `chains.json` と同じ名前：spine・neck・head・左右の腕・脚・指）→ IK Retargeter（マネキンの IK Rig → だんのうら）。名前を揃えておくと「自動でチェーンを作る」がよく当たる（未検証）。
   - Game Animation Sample（GASP）のマネキンの動きは **UE の中の比較だけ**に使い、Web 版へ持ち出さない（規約が未確認：charkit `04` §4）。

## (2) VRM のまま UE5 へ（VRM4U）
- VRM4U（ruyo 氏・MIT と表示）をプロジェクトの Plugins に入れ、`.vrm` をドラッグ。MToon 風の材質・SpringBone まで入る。
- 利用者の UE の版に対応した VRM4U の版があるかは**未確認**（入れる前に配布ページで確認）。ライセンス・規約も入れる時に確認して meta.json の `deps` に書く。
- 骨の名前は VRM のまま入るので、IK Retargeter のチェーンは手で合わせる。

## Web（three-vrm）へ
- Blender の VRM アドオンで **VRM 1.0** を書き出し、`shinshoku/assets/characters/` に置いて manifest の `file` に書く（charkit `12` のフェーズ 2・4）。
- 検査：`node tools/charkit/validate_char.mjs <設定> --model <file>.vrm`（骨・指・`ext_` の名前・材質・表情）。

## 結果を貼ってほしい物
- Blender・VRM アドオン・UE・VRM4U の版
- FBX を UE に入れた時の身長（cm）と、腕を上げたポーズの写真（骨の向きが合っているか）
