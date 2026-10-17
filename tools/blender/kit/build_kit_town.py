# -*- coding: utf-8 -*-
"""
境界侵食 P12：町と屋内の部品（pieces_town.py）を、build_kit.py と同じ道具（AO の焼き込み・LOD・glb／FBX・meta）で作り、素材ライブラリに置く。
  python tools/blender/kit/build_kit_town.py [--only <id>]... [--preview <フォルダ>] [--no-fbx]
  （Blender の中なら：blender --background --python tools/blender/kit/build_kit_town.py -- --only prop.town.vending）
build_kit.py・pieces.py は変えない（部品の表を差し替えて main() を呼ぶだけ）。meta の use・history を境界侵食に書き直す。
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_kit  # noqa: E402
from pieces_town import TOWN_PIECES  # noqa: E402

GEN = 'tools/blender/kit/build_kit_town.py'

if __name__ == '__main__':
    build_kit.PIECES = TOWN_PIECES
    build_kit.GEN = GEN
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    only = [argv[i + 1] for i, a in enumerate(argv) if a == '--only']
    lib = os.path.join(build_kit.ROOT, 'wakaba-assets', 'entries')
    build_kit.main()
    for aid in only or list(TOWN_PIECES):
        cat = TOWN_PIECES[aid][1]
        p = os.path.join(lib, cat, aid, 'meta.json')
        if not os.path.isfile(p):
            continue
        m = json.load(open(p, encoding='utf-8'))
        m['use'] = ['境界侵食（shinshoku）の町と屋内']
        m['license']['textUrl'] = 'docs/shinshoku/IMPLEMENTATION_STATUS.md'
        m['history'] = [{'at': '2026-10-17', 'by': 'claude-code', 'change': f'{GEN}（pieces_town.py）で生成（境界侵食 P12：環境の写実化）'}]
        json.dump(m, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
