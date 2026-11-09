from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/inmate_standard';work=root/'work/inmate'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
small=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',18)
def tile(path,n):return ImageOps.contain(Image.open(path).convert('RGB'),(n,n),Image.Resampling.LANCZOS)
def board(name,items,n=600):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+20,12),label,font=font,fill='white');b.paste(tile(out/file,n),(i*n,60))
    b.save(out/name)
board('preview.png',[('収容者（旧研究棟）・通常個体','three_quarter.png'),('頭部と肩','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')])
board('walk_cycle.png',[(f'歩行・{f}フレーム',f'walk_{f:02d}.png') for f in [0,12,24,36]],450)
for n in ['build_inmate.py','studio.py','validate.py','package.py','garment_weights.py']:shutil.copy2(work/n,out/'source'/n)
stats=json.loads((out/'build_stats.json').read_text());report=json.loads((out/'validation.json').read_text())
readme=f'''# 収容者（旧研究棟）・通常個体

提供された「ChatGPT 画像 2026年11月7日 22_00_08.png」を参照して制作した3Dモデルです。
通常個体の、小さな頭・盛り上がった肩・前傾した上半身・長い手・灰色の衣服を再現しました。

## ファイル
- `inmate_standard.blend`：編集用。骨組み、素材、待機・歩行アクション、撮影用の床・照明を収録。
- `inmate_standard.glb`：モデル、埋め込みテクスチャ、スキン、アニメーション。撮影用の床・照明は含みません。
- `preview.png` / `three_views.png`：全体・頭部、正面・側面・背面。
- `hand.png`：長い指、爪、白い識別バンド。
- `glb_preview.png` / `walk_cycle.png`：GLBを読み込み直した確認画像。
- `validation.json`：書き出し後の検査結果。
- `source/`：Blenderで再生成するPythonスクリプト。

## モデル仕様
- 単位メートル、上方向Z、正面-Y。身長約2mは制作時の仮設定で、原画の確定設定ではありません。
- 骨 {stats['bones']} 本、約 {stats['triangles']:,} 三角形。GLB約 {stats['bytes']/1024/1024:.1f} MiB。
- `idle`：待機。`walk`：その場で足を運ぶ基本歩行、30fps・48フレーム周期。
- 両目に `blink` シェイプキー。指は各1本の骨で動かせます。
- 胸の布札・手首のバンドは原画に合わせて無記名。
- .blendでは初期表示を静止させるためNLAトラックをミュートしています。動きを見る際は目的のトラックのみミュート解除してください。

## 確認と制作範囲
Blender 5.2でGLBを再読み込みし、29本の骨、待機・歩行、まばたきの変形、ウェイトの欠落がないこと、歩行時にメッシュが変形することを確認しました。
Cast Engineとゲームへの組み込みは未検証です。VRMの設定は含みません。
歩行は基本サイクルです。床への足の固定、経路往復、布の物理演算は未実装です。
画像の布の細かな繊維、手の皮膚、頭部の凹凸を完全に再現したものではありません。衣服には手続き的に作成した色ムラと形状のしわを使用しています。
点呼用の建物・扉、細身・幅広の別個体は今回のモデルには含みません。
既存の巨大猫又・ルーン、およびC:\\wakabaのプロジェクトファイルは変更していません。

## 再生成
`blender -b --factory-startup -P source/build_inmate.py -- 出力先フォルダー`
'''
(out/'README.md').write_text(readme,encoding='utf-8')
# Remove only the redundant Blender backup generated during this build.
backup=out/'inmate_standard.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
