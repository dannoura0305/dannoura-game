from pathlib import Path
import json, shutil, sys
from PIL import Image, ImageOps, ImageDraw, ImageFont
W=Path(__file__).resolve().parent
OUT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else W.parents[1]/'outputs'/'researcher'
fontpath=Path('C:/Windows/Fonts/meiryo.ttc')
def font(size):return ImageFont.truetype(str(fontpath),size)
def board(filename,title,tiles,width,height):
    canvas=Image.new('RGB',(width,height),'#eeeae5');d=ImageDraw.Draw(canvas)
    d.text((28,13),title,font=font(28),fill='#272428')
    for file,label,x,y,w,h in tiles:
        img=Image.open(OUT/(file+'.png')).convert('RGB')
        img=ImageOps.contain(img,(w,h),Image.Resampling.LANCZOS)
        canvas.paste(img,(x+(w-img.width)//2,y));d.text((x+(w-img.width)//2,y+img.height+5),label,font=font(18),fill='#382e3b')
    canvas.save(OUT/filename,optimize=True)
board('preview.png','研究者　／　人間大・最終ボス',[
    ('hero','全身',18,65,515,650),('face','頭部・眼鏡',555,65,393,384),('device','記録装置',555,484,393,197)],970,755)
board('three_views.png','研究者　／　三面図',[(n,l,18+350*i,60,337,472) for i,(n,l) in enumerate([('front','正面'),('side','側面'),('back','背面')])],1060,576)
board('motions.png','研究者　／　動作見本',[
    ('record_check','記録装置の確認',14,62,280,383),('replay_study','事故の再生・残像の配置例',308,62,510,383),('kneeling','無力化',830,62,358,383)],1200,490)
source=OUT/'source';source.mkdir(exist_ok=True)
if W!=source:
    for file in ['geometry.py','studio.py','build_researcher.py','review.py','surfaces.py','package.py','parts.json','reference.jpg']:
        shutil.copy2(W/file,source/file)
    shutil.copytree(W/'textures',source/'textures',dirs_exist_ok=True)
stats=json.loads((OUT/'build_stats.json').read_text());validation=json.loads((OUT/'validation.json').read_text());assert validation['unweighted_vertices']==0 and validation['poses']['neutralized']['minimum_z_m']>-.002
(OUT/'README.md').write_text(f"""# 研究者　人間大・最終ボス

添付の正面・側面・背面と頭部の資料から作成した3Dモデル初版です。身長は仮に {stats['height_m']:.2f} m としました。Blender 5.2 で制作し、長さの単位はメートルです。

## モデル
- researcher.blend　編集用。リグ、マテリアル、スタジオ照明、カメラ、梱包済みの画像入り。
- researcher.glb　本体と4つのアニメーション。{stats['bones']} ボーン、制作メッシュ換算 {stats['triangles']:,} 三角形、画像 {validation['embedded_images']} 枚を内蔵。
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
""",encoding='utf-8')
print('PACKAGED',OUT)
