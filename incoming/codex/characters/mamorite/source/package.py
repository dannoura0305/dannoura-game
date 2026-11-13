from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/mamorite';work=root/'work/mamorite'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,w,h):
    b=Image.new('RGB',(len(items)*w,h+65),(38,39,42));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*w+18,13),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(w,h),Image.Resampling.LANCZOS);b.paste(im,(i*w+(w-im.width)//2,65+(h-im.height)//2))
    b.save(out/name)
board('preview.png',[('守り手（まもりて）・初版','glb_preview.png'),('大きく開いた掌','hand.png')],700,700)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],650,650)
board('details.png',[('布の下に隠れた顔','face.png'),('頭から背中を覆う布','cloth.png'),('掌と丸い指','hand.png')],650,650)
board('motions.png',[('両手で押し返す','push_back.png'),('地面に手をつく守りの姿勢','protect_ground.png'),('押されて受け止める','recoil.png')],750,700)
(out/'source').mkdir(exist_ok=True)
for name in ['build_mamorite.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/name,out/'source'/name)
s=json.loads((out/'build_stats.json').read_text());v=json.loads((out/'validation.json').read_text())
text=f'''# 守り手（まもりて）／3Dモデル初版

参照画像：ChatGPT 画像 2026年11月8日 13_36_53.png。
生成り色の布、灰青色の衣服、布の影に隠れた小さな顔、大きな掌と開いた丸い指、白い識別バンド、腰を落とした脚と布製の履物を造形しました。

## ファイル
- mamorite.blend：編集用モデル、骨、素材、4動作、撮影設備。
- mamorite.glb：本体、骨、素材、4動作。撮影設備は含みません。
- preview.png / three_views.png：全体、手、三面図。
- details.png：頭部、布、掌。
- motions.png：GLBを再読み込みして撮影した動作。
- validation.json：構造・ウェイト・動作の検査結果。
- source/：再生成用スクリプト。

## 仕様
Blenderではメートル単位、Z上方向、正面-Y。GLBは標準のY上方向へ変換しています。
通常姿勢の全高{s['height_m']:.2f}mは制作上の仮設定です。原画には身長の数値指定がありません。
骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}、GLB {s['bytes']/1024/1024:.1f} MiB。
色と法線の画像{v['embedded_images']}枚をGLBに埋め込み。左右の指は各5本を個別の骨に割り当てています。
布は立体形状と骨で変形します。布物理は使っていません。

## 動作
30fps、0〜120フレームの4秒クリップです。
- idle：小さな待機の揺れ。
- push_back：両手を前に出して押し返す動作。
- protect_ground：腰を落として前にかがみ、掌を下へ向ける守りの姿勢。
- recoil：上体を引き、両手で受け止める動作。

.blendのNLAトラックは初期状態でミュートです。再生時には対象のトラック1つだけミュートを解除してください。
原点の移動はありません。相手を押す物理処理、防御判定、AI、経路探索、地形に合わせた接地調整は含みません。
顔は固定形状です。表情切り替え・口パクは未実装です。配置例のベッドは含みません。

## 確認範囲と残る差
Blender 5.2でGLBを再読み込みし、骨、全頂点のウェイト、素材、4動作、ループの始点・終点を検査しました。
腕と掌の骨の接続も検査しています。Cast Engine内の表示・動作と実機負荷は未検証です。
初版は造形確認用の密度です。ゲーム向けのLOD、当たり判定、負荷調整は未実装です。
原画に比べ、布の複雑な皺と厚み、皮膚の細かな凹凸、顔や履物の形状には差が残ります。
既存キャラクターとC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_mamorite.py -- 出力先フォルダー`
`blender -b --factory-startup -P source/validate.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(text,encoding='utf-8')
backup=out/'mamorite.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
