# 研究者　人間大・最終ボス

添付の正面・側面・背面と頭部の資料から作成した3Dモデル初版です。身長は仮に 1.78 m としました。Blender 5.2 で制作し、長さの単位はメートルです。

## モデル
- researcher.blend　編集用。リグ、マテリアル、スタジオ照明、カメラ、梱包済みの画像入り。
- researcher.glb　本体と4つのアニメーション。32 ボーン、制作メッシュ換算 183,576 三角形、画像 13 枚を内蔵。
- replay_afterimages.glb　事故の再生の途中の姿勢を2体分収録した静止残像。同じ原点に本体を置くと、見本に近い配置になります。
- preview.png・three_views.png・motions.png　書き出した本体GLBを読み直してレンダリングした全身、三面図、動作例。

## 動作の再生
各クリップは30 fps、0〜120フレーム（4秒）。Blenderのアクションエディターでリグを選び、アクション名を指定して再生できます。GLBビューアーではアニメーション名を選択してください。

| 名前 | 動作 |
| --- | --- |
| idle | 胸と頭が静かに動く待機 |
| record_check | 腰の記録装置へ目を落とし、右手を寄せる |
| accident_replay | 上体をひねり、右腕を前方へ伸ばして指を開く |
| neutralized | 両膝をつき、両手を膝へ寄せて頭を垂れ、起き上がる |

顔の陰影・目・口は原画から投影したテクスチャで表現しています。まばたき、口パク、表情専用のモーフは未実装です。残像の出現時間や消失、ゲーム側の攻撃判定は別途ゲーム側で制御してください。

## 検証
GLBをBlenderへ再読込し、画像の内蔵、ウェイト、4動作の開始・終了姿勢と手首の接続を確認しました。詳細は validation.json にあります。ゲームおよびCast Engineでの実機検証は未実施です。

## 再生成
source に制作スクリプト、形状データ、テクスチャ、入力資料の縮小版を同梱しました。出力先を作成し、次のコマンドを順に実行してください。BlenderとPythonは各環境の実行ファイルに読み替えてください。

```
blender -b --factory-startup --python-exit-code 1 -P source/build_researcher.py -- .
blender -b --factory-startup --python-exit-code 1 -P source/review.py -- .
python source/package.py .
```

最後のコマンドはPillowとWindowsのメイリオを使います。形状や投影そのものを変更する際は最初に python source/surfaces.py を実行してください（NumPyとPillowが必要です）。
