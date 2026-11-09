# 巨大猫又 — 形状・毛並みの修正版

2026年11月7日。参考デザインと既存v10を確認し、Blenderで新しい体・顔・毛並みを作成しました。

## 開くファイル

- `nekomata_sculpt.blend`：編集用。詳細モデル、骨、材質、撮影用の照明とカメラを含みます。
- `nekomata_light.glb`：表示確認用の軽量版。約19.9 MB、約54.3万三角形。
- `nekomata_sculpt.glb`：詳細版。約48.7 MB、約127.5万三角形。
- `face_before_after.png`：今回の顔の修正前後。同じカメラ・照明で比較。
- `face_details.png`：修正後の顔の正面と横顔。
- `preview.png`：詳細版の斜め全身と顔。
- `comparison.png`：参考／既存v10／修正版の正面・側面。撮影条件と材質は各版で異なります。
- `light_reimport.png`：軽量GLBを読み込み直して撮影した画像。

## 変更内容

- 目頭と目尻が尖った切れ長の目に変更し、縦の瞳孔と薄紫の虹彩を調整。
- 額から鼻先までつながる鼻筋を造形し、その上の毛を短くして輪郭を出しました。
- 上の紫ラインを目尻につなげ、外側へ跳ね上がる形に変更。
- 下の紫ラインを別の曲線として描き、上下とも顔に沿う薄い形状と先細りの端に変更。
- 軽量版では顔の形状を保ち、胴体と毛を中心に削減。
- 肩・胴・脚を連続するメッシュにし、筒の接合部を解消。
- 頭・鼻筋・頬・口元を滑らかにつないだ形状へ変更。
- 毛の根元を体に沿わせ、細い立体の毛を流れに合わせて配置。
- 胸と首のボリューム、大きな足先、二股の尾の曲線を作成。
- 薄紫の目、紫の模様と爪、桃色の鼻・耳の内側、肉球とひげを追加。
- 既存の命名に合わせた34本の骨、idle、blinkと7種類の表情名を収録。

## 確認結果

- 詳細GLB：Blenderへの再読み込み成功。34本の骨、idle、必要な表情名を確認。
- 頂点座標にNaN・無限値なし。骨の重みが未設定の頂点なし。
- 軽量GLB：再読み込みとレンダリングを確認。
- 軽量GLBのblinkと、顎を15度回転させたときの変形を確認。
- `blink_check.png`、`jaw_check.png`は、その変形結果を実際に撮影した画像です。
- 詳細は`validation.json`と`deformation_validation.json`に記録しています。

## 現段階の範囲

見た目を比較・修正できるモデルとして用意しています。参考の大きく波打つ毛束、目の周りの造形、耳の厚みと内側、口元にはまだ違いがあります。

表情は目とまぶたの変形が中心です。口の中・歯・舌、歩行、物理的な毛の揺れは作っていません。既存v10の`guard_crouch`・`guard_rise`は、この別形状には移植していません。

Cast Engine内の表示・表情制御・性能は未検証です。「軽量版」は詳細版との比較であり、約54.3万三角形あるため、ゲームや複数キャラクターの同時表示に使う際は、実環境に合わせた追加の軽量化が必要になる場合があります。

元の`C:\wakaba\wakaba-character-model-factory\hq3d\characters\nekomata`内のファイルには変更を加えていません。

## 再生成

`source`に生成・軽量化・確認用のPythonと、使用した骨設定のコピーを保存しています。Blender 5.2で実行しました。外部サービスへのアップロードやモデルのダウンロードは使っていません。

このREADMEがあるフォルダーでPowerShellを開き、別の出力フォルダーを指定して実行します。

```powershell
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
& $blenderExe -b --factory-startup -t 6 -P '.\source\build_nekomata.py' -- '.\rebuild'
& $blenderExe -b --factory-startup -t 6 -P '.\source\finalize.py' -- '.\rebuild'
& $blenderExe -b --factory-startup -t 4 -P '.\source\validate_glb.py' -- '.\rebuild'
& $blenderExe -b --factory-startup -t 6 -P '.\source\review_export.py' -- '.\rebuild' --face-revision
```

`source_build.json`が生成スクリプトと同じフォルダーにあるため、元のプロジェクトへの依存なしで再生成できます。
