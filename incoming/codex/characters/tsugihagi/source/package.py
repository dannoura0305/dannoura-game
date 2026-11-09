from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/tsugihagi';work=root/'work/tsugihagi'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,n=650):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+18,12),label,font=font,fill='white')
        im=ImageOps.contain(Image.open(out/file).convert('RGB'),(n,n),Image.Resampling.LANCZOS);b.paste(im,(i*n,60))
    b.save(out/name)
board('preview.png',[('継接（つぎはぎ）・中ボス','three_quarter.png'),('頭部と接合境界','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],600)
board('details.png',[('肥大した右拳','hand.png'),('左腕で抱える鞄','bag.png')],700)
board('motions.png',[('右拳で叩く','knock.png'),('その場での歩行','walk_in_place.png'),('鞄をかばう','protect_bag.png')],600)
for n in ['build_tsugihagi.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/n,out/'source'/n)
s=json.loads((out/'build_stats.json').read_text())
readme=f'''# 継接（つぎはぎ）／中ボス・3Dモデル初版

参照：ChatGPT 画像 2026年11月8日 13_35_27.png。
左右で異なる体格、青い作業着と灰褐色ニットの閉じたジグザグ境界、長い右腕と大きな拳、鞄を抱える左腕、太さが違う脚を造形しました。
左右はキャラクター本人の向きです。正面画像では右腕が画面左にあります。

## ファイル
- tsugihagi.blend：編集用モデル、29本の骨、素材、動作、撮影用の照明と床。
- tsugihagi.glb：モデル本体、骨、動作、埋め込み画像。撮影設備は含みません。
- preview.png / three_views.png：全体、頭部、三面。
- details.png：右拳と鞄。
- motions.png：GLBを再読み込みして撮影した動作。
- validation.json：書き出し後の検査結果。
- source/：再生成用スクリプト。

## 仕様
- メートル単位、Z上、正面-Y。全高{s['height_m']:.2f}m（原画の約2.6mに合わせた仮設定）。
- 骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}。
- GLB {s['bytes']/1024/1024:.1f} MiB。LOD・ゲーム実機向け負荷調整は未実施。
- idle：呼吸を想定した小さな待機動作。
- knock：右腕を上げ、拳を前後させる動作。ドアや接触判定は含みません。
- walk_in_place：左右の脚を交互に動かす、その場での歩行試作。
- protect_bag：上体をかがめ、左腕と鞄を寄せる動作。
- 各動作は30fps、0〜120フレーム。ルート移動はありません。
- 鞄は左前腕配下の専用骨に固定。フラップと金具は造形で、開閉機構はありません。
- まばたき用blinkシェイプキー。
- .blendのNLAトラックは初期状態でミュート。再生時は1つだけミュートを解除してください。

## 確認と範囲
Blender 5.2でGLBを再読み込みし、ウェイト、埋め込み画像、骨、4つの動作、blinkを確認しました。
動作中の画像も収録しています。ゲーム内でのドア叩き・経路歩行・接地制御・衝突・布や鞄の物理演算は未実装です。
Cast Engineでの動作は未検証で、VRM設定はありません。
原画の細かな衣服のしわ、皮膚の質感、姿勢や表情まで完全に一致する仕上がりではありません。
既存キャラクターやC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_tsugihagi.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(readme,encoding='utf-8')
backup=out/'tsugihagi.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
