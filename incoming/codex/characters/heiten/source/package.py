from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[2];out=root/'outputs/heiten';work=root/'work/heiten'
font=ImageFont.truetype(r'C:\Windows\Fonts\meiryo.ttc',25)
def board(name,items,n=600):
    b=Image.new('RGB',(len(items)*n,n+65),(35,38,44));d=ImageDraw.Draw(b)
    for i,(label,file) in enumerate(items):
        d.text((i*n+20,12),label,font=font,fill='white')
        im=ImageOps.contain(Image.open(out/file).convert('RGB'),(n,n),Image.Resampling.LANCZOS);b.paste(im,(i*n,60))
    b.save(out/name)
board('preview.png',[('閉店（へいてん）・通常個体','three_quarter.png'),('シャッター状の顔とひだ襟','face.png')],750)
board('three_views.png',[('正面','front.png'),('側面','side.png'),('背面','back.png')])
board('details.png',[('背中の金属板','back_detail.png'),('端末・ポケット・鉛筆','apron.png')],700)
board('closing_gesture.png',[('待機','gesture_00.png'),('両腕を上げる','gesture_30.png'),('お辞儀','gesture_90.png')],600)
board('face_shutter.png',[('通常','face.png'),('目のシャッターを閉じる','shutter_closed.png')],600)
for n in ['build_heiten.py','geometry.py','studio.py','validate.py','package.py']:shutil.copy2(work/n,out/'source'/n)
s=json.loads((out/'build_stats.json').read_text())
readme=f'''# 閉店（へいてん）・通常個体

提供画像「ChatGPT 画像 2026年11月8日 06_35_31.png」を参照して制作した3Dモデルの初版です。
シャッター状の顔、ひだ襟、背中と肩の金属板、長い腕・指、作業着、エプロン、端末、ポケットの鉛筆、背面の結びひもを造形しました。

## ファイル
- `heiten.blend`：編集用モデル、骨組み、素材、アニメーション、撮影用の照明と床。
- `heiten.glb`：モデル本体、埋め込みテクスチャ、骨組み、アニメーション。床・照明は含みません。
- `preview.png` / `three_views.png`：全体・顔、正面・側面・背面。
- `details.png`：背面の板とエプロン周辺。
- `closing_gesture.png`：GLBを再読み込みして撮影した動作。
- `face_shutter.png`：通常と目のシャッターを閉じた状態。
- `validation.json`：書き出し後の検査結果。
- `source/`：再生成用のPythonスクリプト。

## 仕様
- メートル単位、Zが上、正面は-Y。全高約2.15mは制作時の仮設定です。
- 骨 {s['bones']} 本、頂点 {s['vertices']:,}、三角形 {s['triangles']:,}。
- GLB約 {s['bytes']/1024/1024:.1f} MiB。ゲーム側の描画負荷に合わせたLOD・リトポロジーは行っていません。
- `idle`：待機。
- `closing_gesture`：両腕を上げる→下ろす→お辞儀→戻る、30fps・120フレーム。
- `shutter_closed`：顔の目にあたる隙間を閉じるシェイプキー。
- .blendのNLAトラックは初期状態ではミュートしています。動かす際は目的のトラックだけミュートを解除してください。
- 腕・脚・首・胴体と、各指1本の骨を操作できます。

## 確認と制作範囲
GLBをBlender 5.2で再読み込みし、骨・2つの動作・シェイプキー・埋め込み画像・ウェイトを確認しました。
待機と閉店の仕草でメッシュが実際に変形することを検査し、腕を上げた状態とお辞儀も画像で確認しています。
動作はキャラクター単体の基本動作です。建物のシャッターや扉、把持のIK、物理的な接触・布シミュレーションは含みません。
Cast Engineおよびゲーム内での動作は未検証です。VRM設定はありません。
原画の細かな折り目、皮膚、金属の傷・錆の配置を完全に一致させたものではありません。
幅広・細身の別個体は含みません。端末の表示は無記名で、操作機能はありません。

## 再生成
`blender -b --factory-startup -P source/build_heiten.py -- 出力先フォルダー`

既存の収容者・巨大猫又・ルーン、およびC:\\wakabaのプロジェクトファイルは変更していません。
'''
(out/'README.md').write_text(readme,encoding='utf-8')
backup=out/'heiten.blend1'
if backup.exists():backup.unlink()
print('Packaged',out)
