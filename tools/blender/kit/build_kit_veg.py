# -*- coding: utf-8 -*-
"""
境界侵食 P16：町の植物と瓦礫の部品（pieces_veg.py）を、試験マップ（山の廃村）と同じ道具（build_kit.py：AO の焼き込み・LOD・遠景の板（Cycles）・glb／FBX・meta）で作り、素材ライブラリに置く。
  python tools/blender/kit/build_kit_veg.py [--only <id>]... [--preview <フォルダ>] [--no-fbx]
  （Blender の中なら：blender --background --python tools/blender/kit/build_kit_veg.py -- --only veg.tree.ichou）
build_kit.py・pieces.py は変えない（部品の表を差し替えて main() を呼ぶだけ）。meta の use・history を境界侵食に書き直す。
葉のカードの材質（mat.foliage.keyaki など）は先に tools/mapkit/matgen/matgen_veg.py で作っておく（遠景の板の撮影に使う）。
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_kit  # noqa: E402
from pieces_veg import VEG_PIECES  # noqa: E402

GEN = 'tools/blender/kit/build_kit_veg.py'
# 描画の側の約束（meta.kit に足す・目録へ写す：mapkit/assets/library.js）：cardDup＝0 は葉のカードの写し（mapkit/render/assets.js の moreCards）をしない
# （松の仕立ては枝先の「雲」の形が大事＝回した写しを足すと形が崩れる）
KIT_EXTRA = {'veg.tree.matsu': {'cardDup': 0}}

if __name__ == '__main__':
    build_kit.PIECES = VEG_PIECES
    build_kit.GEN = GEN
    build_kit.ALPHA_MATS |= {'mat.foliage.keyaki', 'mat.foliage.ichou', 'mat.foliage.sakura', 'mat.foliage.matsu', 'mat.foliage.tsutsuji',
                             'mat.foliage.hedge', 'mat.foliage.houseplant', 'mat.foliage.weed'}
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    only = [argv[i + 1] for i, a in enumerate(argv) if a == '--only']
    lib = os.path.join(build_kit.ROOT, 'wakaba-assets', 'entries')
    build_kit.main()
    for aid in only or list(VEG_PIECES):
        cat = VEG_PIECES[aid][1]
        p = os.path.join(lib, cat, aid, 'meta.json')
        if not os.path.isfile(p):
            continue
        m = json.load(open(p, encoding='utf-8'))
        m['use'] = ['境界侵食（shinshoku）の町の植物（P16）']
        m['license']['textUrl'] = 'docs/wakaba-mapkit/11_写実化パイプライン.md'
        m['history'] = [{'at': '2026-10-18', 'by': 'claude-code', 'change': f'{GEN}（pieces_veg.py）で生成（境界侵食 P16：植物を試験マップと同じ作り方に）'}]
        m['kit'].update(KIT_EXTRA.get(aid, {}))
        json.dump(m, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
