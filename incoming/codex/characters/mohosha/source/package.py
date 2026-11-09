from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/mohosha';work=root/'work/mohosha'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,n=650):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+18,12),label,font=font,fill='white')
        im=ImageOps.contain(Image.open(out/file).convert('RGB'),(n,n),Image.Resampling.LANCZOS);b.paste(im,(i*n,60))
    b.save(out/name)
board('preview.png',[('模倣者（もほうしゃ）・本体','three_quarter.png'),('空洞の目と笑った口元','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],600)
board('details.png',[('長く曲がった指','hand.png'),('身体と服の折り返し','torso.png')],700)
board('motions.png',[('首を傾ける','head_tilt.png'),('手を伸ばす','reach.png'),('その場での歩行','walk_in_place.png')],600)
board('expression.png',[('基本の口元','face.png'),('smileを最大にした口元','smile.png')],650)
for n in ['build_mohosha.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/n,out/'source'/n)
s=json.loads((out/'build_stats.json').read_text())
readme=f'''# 模倣者（もほうしゃ）／本体の3Dモデル初版

参照：ChatGPT 画像 2026年11月8日 13_35_46.png。
画像左側の三面図を基準にした、擬態していない灰色の本体です。細い体、長い腕と曲がった指、空洞の目、笑った口元、身体を横切る折り返し、襟・裾・ポケットを造形しました。

## ファイル
- mohosha.blend：編集用モデル、骨、素材、動作、撮影用照明・床。
- mohosha.glb：モデル本体、骨、動作、埋め込み画像。撮影設備を含みません。
- preview.png / three_views.png：全体・頭部・三面。
- details.png：手指と胴体の折り返し。
- motions.png：GLBを再読み込みして撮影した動作。
- expression.png：smileシェイプキーの比較。
- validation.json：書き出し後の検査結果。
- source/：再生成用スクリプト。

## 仕様
- メートル単位、上方向Z、正面-Y。全高{s['height_m']:.2f}mは制作上の仮設定です。原画には身長の数値指定がありません。
- 骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}。
- GLB {s['bytes']/1024/1024:.1f} MiB。LODや実機描画負荷の調整は未実施。
- idle：小さな待機動作。
- head_tilt：首と頭を傾ける動作。
- reach：両腕を前に伸ばす動作。
- walk_in_place：その場で脚を交互に動かす歩行試作。
- 各動作は30fps・0〜120フレーム。ルート移動を含みません。
- smile：口角と口元の形をわずかに変えるシェイプキー。顔を構成する各メッシュの同名キーを一緒に変更してください。
- 目は空洞で、眼球やまばたきは付けていません。
- .blendのNLAトラックは初期状態でミュート。再生時は目的のトラック1つだけミュートを解除してください。

## 確認と制作範囲
Blender 5.2でGLBを再読み込みし、骨、ウェイト、埋め込み画像、4つの動作、smileの変形を確認しました。
歩行動作の複数フレームで足の最低位置も確認しています。実行時の接地IK、衝突判定、経路移動、物理演算は未実装です。
Cast Engine内での動作は未検証です。VRM設定はありません。
原画右上の人間の擬態姿、半身だけ擬態解除した姿、および右下の別個体は含みません。本体から人間へ変形する機構も未実装です。
原画の連続した複雑なひだ、顔の細かな造形、衣服の質感まで完全に再現したものではありません。
既存キャラクターやC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_mohosha.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(readme,encoding='utf-8')
backup=out/'mohosha.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
