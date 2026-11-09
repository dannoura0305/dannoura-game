from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/outoutai';work=root/'work/outoutai'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,n):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+18,12),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(n,n),Image.Resampling.LANCZOS);b.paste(im,(i*n,60))
    b.save(out/name)
board('preview.png',[('応答体（おうとうたい）・通常個体','three_quarter.png'),('先細りの頭部と応答灯','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],600)
board('details.png',[('透明カバー・ケーブル','detail.png'),('長い指と手','hand.png')],700)
board('motions.png',[('待機姿勢','standby.png'),('端末方向へ手を伸ばす','respond.png'),('うなずき','acknowledge.png')],600)
(out/'source').mkdir(exist_ok=True)
for name in ['build_outoutai.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/name,out/'source'/name)
s=json.loads((out/'build_stats.json').read_text())
text=f'''# 応答体（おうとうたい）／通常個体の3Dモデル初版

参照画像：ChatGPT 画像 2026年11月8日 13_36_18.png。
白い細身の本体、先細りで縦の筋が通った顔、小さな黒いセンサー、肩と腰の半透明カバー、身体に沿ったケーブル、分割された発光リングを造形しました。

## ファイル
- outoutai.blend：編集用モデル、骨、素材、動作と撮影設備。
- outoutai.glb：本体、骨、素材と4動作。撮影設備を含みません。
- preview.png / three_views.png：全体・頭部・三面。
- details.png：透明カバー、ケーブル、手。
- motions.png：書き出したGLBを再読み込みして撮影した動作。
- validation.json：構造と動作の検査結果。
- source/：再生成用スクリプト一式。

## 仕様
メートル単位、Z上方向、正面-Y。リングを含む全高{s['height_m']:.2f}mは制作上の仮設定です。原画に身長の数値指定はありません。
骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}、GLB {s['bytes']/1024/1024:.1f} MiB。
各動作は30fps・0〜120フレームです。
- idle：小さな待機の揺れ。
- standby：頭を下げる待機姿勢。
- respond：右腕を前に伸ばし、頭を下げる応答動作。
- acknowledge：小さなうなずきとリングのわずかな拡大。

.blendのNLAトラックは初期状態でミュートです。再生時は対象のトラック1つだけミュートを解除してください。
応答灯は固定のシアン発光です。点灯状態の切り替え、会話や端末イベントとの連動は含みません。端末本体も含みません。
透明カバーはアルファ透過とKHR_materials_transmissionを使用します。表示先の対応状況や描画順序により見え方が変わる可能性があります。ライトの発光表現に自動的なブルームは付随しません。

## 確認範囲と残る差
Blender 5.2でGLBを再読み込みし、骨、ウェイト、透過・発光の素材設定、4動作を確認しました。
Cast Engine内の動作と表示は未検証です。VRM設定、LOD、実機負荷調整、衝突・ケーブル物理、歩行、端末への接触判定や操作処理は未実装です。
原画の通常個体のみです。右下の別個体は含みません。
原画の滑らかな曲面、顔の細部、透明カバーの形状には差が残る初版です。
既存キャラクターとC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_outoutai.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(text,encoding='utf-8')
backup=out/'outoutai.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
