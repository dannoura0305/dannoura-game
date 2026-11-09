from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/sakibure';work=root/'work/sakibure'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',27)
def row(name,items,w,h):
    b=Image.new('RGB',(len(items)*w,h+65),(33,31,40));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*w+18,13),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(w,h),Image.Resampling.LANCZOS);b.paste(im,(i*w+(w-im.width)//2,65+(h-im.height)//2))
    b.save(out/name)
row('preview.png',[('境界の先触れ・巨大ボス／初版','glb_preview.png')],1400,850)
b=Image.new('RGB',(1400,3*765),(33,31,40));d=ImageDraw.Draw(b)
for i,(label,file) in enumerate([('正面','front.png'),('側面','side.png'),('背面','back.png')]):
    d.text((24,i*765+14),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(1400,700),Image.Resampling.LANCZOS);b.paste(im,((1400-im.width)//2,i*765+65))
b.save(out/'three_views.png')
row('details.png',[('空洞と分割された発光輪','core.png'),('重なった外殻','shell.png'),('内側の鉤爪','claw.png')],650,650)
row('motions.png',[('薙ぎ払い','sweep.png'),('喰らう・鉤爪を構える','devour.png'),('核の脈動','core_pulse.png')],850,520)
(out/'source').mkdir(exist_ok=True)
for name in ['build_sakibure.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/name,out/'source'/name)
s=json.loads((out/'build_stats.json').read_text());v=json.loads((out/'validation.json').read_text())
text=f'''# 境界の先触れ／巨大ボス・3Dモデル初版

参照画像：ChatGPT 画像 2026年11月8日 13_36_33.png。
広く構えた四脚、紫黒色の重なった外殻、中央の空洞、12分割の桃色発光輪、内側の二本の鉤爪を造形しました。

## ファイル
- sakibure.blend：編集用モデル、骨、素材、4動作、撮影設備。
- sakibure.glb：モデル、骨、素材、4動作。撮影設備は含みません。
- preview.png / three_views.png：全体と三面図。
- details.png：発光輪と空洞、外殻、鉤爪。
- motions.png：GLBを再読み込みして撮影した動作。
- validation.json：書き出し後の構造・動作の検査結果。
- source/：再生成用のスクリプト一式。

## 仕様
Blenderではメートル単位、Z上方向、正面-Y。GLBは標準のY上方向に変換して出力しています。
全高{s['height_m']:.2f}m、全幅{s['width_m']:.2f}m、奥行{s['depth_m']:.2f}m。
原画の「約18m／大きさは提案」を初版の全高として採用しました。ゲーム内の最終寸法は未確定です。
骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}、GLB {s['bytes']/1024/1024:.1f} MiB。
GLB内に画像{v['embedded_images']}枚を埋め込み。外殻にはベースカラーと法線マップを使用しています。

## 動作
各クリップは30fps、0〜120フレームの4秒です。
- idle：身体の小さな上下動。
- sweep：右前脚を持ち上げ、外側・前方へ振り出して戻す動作。
- devour：左右の小腕と鉤爪を上げて広げ、核を拡大する予備動作。
- core_pulse：核のわずかな拡大・縮小。

.blendではNLAトラックを初期状態でミュートにしています。再生時には対象トラック1つだけミュートを解除してください。
発光は固定の桃色です。脈動は形状の拡大縮小で、発光強度のアニメーションではありません。ブルームは表示側の設定が必要です。
モデルの原点は移動しません。攻撃判定、ダメージ、対象の吸い込み・捕食、AI、経路探索、地形への足の追従は含みません。

## 確認範囲と残る差
Blender 5.2でGLBを再読み込みし、骨、全頂点のウェイト、素材、埋め込み画像、4動作とループ端を検査しました。
薙ぎ払い中の残り3脚の骨位置、左右の鉤爪の接続位置も検査しています。
Cast Engine内の表示・動作、実機パフォーマンスは未検証です。LOD、当たり判定、物理、戦闘への接続は未実装です。
初版は造形確認用の密度です。ゲームに大量配置する前にはポリゴン削減とLODの作成が必要です。
原画に比べ、外殻の折れ目・薄い先端、脚のうねり、岩肌の複雑さに差が残ります。表面は手作業のスカルプトを完全再現したものではありません。
既存キャラクターとC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_sakibure.py -- 出力先フォルダー`
`blender -b --factory-startup -P source/validate.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(text,encoding='utf-8')
backup=out/'sakibure.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
