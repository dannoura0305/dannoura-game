from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/utsushimi';work=root/'work/utsushimi'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,w,h):
    b=Image.new('RGB',(len(items)*w,h+65),(33,31,40));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*w+18,13),label,font=font,fill='white');im=ImageOps.contain(Image.open(out/file).convert('RGB'),(w,h),Image.Resampling.LANCZOS);b.paste(im,(i*w+(w-im.width)//2,65+(h-im.height)//2))
    b.save(out/name)
board('preview.png',[('写し身（うつしみ）・ボス初版','glb_preview.png'),('眼鏡・帽子・花飾り・笑み','glb_face.png')],700,850)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')],600,800)
board('details.png',[('頭部と長い髪','face.png'),('縞模様と紫の衣装','torso.png'),('長い五本指','hand.png')],650,700)
board('motions.png',[('模倣の構え','mimic_pose.png'),('前方へ手を伸ばす踏み込み','reaching_lunge.png'),('首を傾ける','head_tilt.png')],700,650)
(out/'source').mkdir(exist_ok=True)
for name in ['build_utsushimi.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/name,out/'source'/name)
s=json.loads((out/'build_stats.json').read_text());v=json.loads((out/'validation.json').read_text())
text=f'''# 写し身（うつしみ）／ボス・3Dモデル初版

参照画像：ChatGPT 画像 2026年11月8日 13_36_42.png。
角張った紫の衣装と長い髪、黒い面と笑み、長い腕と五本指、眼鏡、小さな帽子、花飾り、縞のインナー、チェック柄パンツ、スニーカーを造形しました。

## ファイル
- utsushimi.blend：編集用モデル、骨、素材、4動作、撮影設備。
- utsushimi.glb：モデル、骨、素材、4動作。撮影設備は含みません。
- preview.png / three_views.png：全体、顔、三面図。
- details.png：顔、衣装、手の確認画像。
- motions.png：GLBを再読み込みして撮影した動作。
- validation.json：書き出し後の構造・動作の検査結果。
- source/：再生成スクリプト一式。

## 仕様
Blenderではメートル単位、Z上方向、正面-Y。GLBは標準のY上方向に変換しています。
帽子を含む全高{s['height_m']:.2f}m。原画に数値指定がないため、約3.3mを制作上の仮設定としています。
骨{s['bones']}本、頂点{s['vertices']:,}、三角形{s['triangles']:,}、GLB {s['bytes']/1024/1024:.1f} MiB。
画像{v['embedded_images']}枚をGLBに埋め込み。縞とチェックはテクスチャ、眼鏡・花・靴紐は立体形状です。
左右の指は各5本を個別の骨に割り当て、後ろ髪3束にも骨を用意しています。

## 動作
各クリップは30fps・0〜120フレームの4秒です。
- idle：上半身と髪の小さな揺れ。
- mimic_pose：脚を開き、片腕を上げ、もう片腕を横へ伸ばす模倣の構え。
- reaching_lunge：足を前後に開き、上体を倒して両腕を前方へ伸ばす動作。
- head_tilt：首を傾ける動作。

.blendのNLAトラックは初期状態でミュートです。再生時には対象のトラック1つだけミュートを解除してください。
移動のないポーズ動作です。原画の跳躍全体や空中移動の再現ではありません。
他キャラクターの動きをリアルタイムで模倣する処理、攻撃判定、ダメージ、AI、髪・衣装の物理は含みません。
顔の笑みは固定形状です。表情切り替え・口パクは未実装です。

## 確認範囲と残る差
Blender 5.2でGLBを再読み込みし、骨、全頂点のウェイト、埋め込み画像、4動作の変形とループ端を検査しました。
腕と手の骨の接続、および構え・踏み込み中の地面への大きなめり込みも検査しています。
Cast Engine内の表示・動作、実機パフォーマンスは未検証です。LOD、当たり判定、戦闘への接続は未実装です。
原画より衣装の折れ目や髪の流れを単純化した初版です。顔の輪郭、靴、細かな布の皺には差が残ります。
比較欄の小さな人間姿は含みません。ボス本体を作成しています。
既存キャラクターとC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_utsushimi.py -- 出力先フォルダー`
`blender -b --factory-startup -P source/validate.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(text,encoding='utf-8')
backup=out/'utsushimi.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
