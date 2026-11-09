from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/machibito';work=root/'work/machibito'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,n):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+18,12),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(n,n),Image.Resampling.LANCZOS);b.paste(im,(i*n,60))
    b.save(out/name)
board('preview.png',[('待人（まちびと）・通常個体','three_quarter.png'),('長い首と困ったような顔','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],600)
board('details.png',[('時計と手元','watch.png'),('コートとマフラー','torso.png')],700)
board('motions.png',[('首を伸ばして待つ','wait.png'),('時計へ顔を向ける','check_watch.png'),('周囲を見る','look_around.png')],600)
(out/'source').mkdir(exist_ok=True)
for name in ['build_machibito.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/name,out/'source'/name)
s=json.loads((out/'build_stats.json').read_text())
text=f'''# 待人（まちびと）／通常個体の3Dモデル初版

参照画像：ChatGPT 画像 2026年11月8日 13_36_04.png。
長く曲がった首、小さな空洞の目と下がった口元、細い脚、重なったコート、巻いたマフラー、腕時計とそれを支える手を造形しました。

## ファイル
- machibito.blend：編集用モデル、骨、素材、動作、撮影設備。
- machibito.glb：モデル本体、骨、埋め込み画像と4動作。撮影設備を含みません。
- preview.png、three_views.png：全体、顔、三面。
- details.png：時計・手元と衣服。
- motions.png：書き出したGLBを再読み込みした動作画像。
- validation.json：構造および動作の検査結果。
- source/：再生成用ソース一式。

## 仕様
メートル単位、Z上方向、正面-Y。制作上の仮設定で全高{s['height_m']:.2f}mです。原画に数値の身長指定はありません。
骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}、GLB {s['bytes']/1024/1024:.1f} MiB。
首は4段の骨と頭の骨で曲げます。両腕は時計を支える姿勢を基準にしています。
動作は30fps、0〜120フレームです。

- idle：小さな待機の揺れ。
- wait：首を前に伸ばし、待つ姿勢へ移る。
- check_watch：首を下げ、時計の方向へ顔を向ける。
- look_around：首を横へ動かして周囲を見る。

.blendのNLAトラックは初期状態でミュートです。再生時は対象のトラック1つだけミュートを解除してください。
時計の針は固定で、実時刻には連動しません。表情シェイプキー、歩行、ルート移動、布や衝突の物理演算、ゲーム固有の行動制御は含みません。

## 確認範囲と残る差
Blender 5.2でGLBを読み直し、骨、ウェイト、埋め込み画像、4動作を確認しました。
Cast Engine内の動作は未検証です。VRM設定、LOD、実機負荷調整は未実施です。
通常個体のみを制作しており、原画右下の別個体は含みません。
原画の細かな布のしわ、傷みや汚れ、顔の非対称な形状には差が残る初版です。
既存キャラクターとC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_machibito.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(text,encoding='utf-8')
backup=out/'machibito.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
