#!/usr/bin/env python3
# わかば matgen（境界侵食 P16：町の植物の材質）：defs_veg.py の材質を、matgen.py と同じ道具・同じ決まりで作り、素材ライブラリに置く。
#   python tools/mapkit/matgen/matgen_veg.py                    … 全部（1024px の原本 → web/ に 512・256・128 の WebP：葉のカードの段）
#   python tools/mapkit/matgen/matgen_veg.py --only mat.foliage.ichou --preview <フォルダ>
# matgen.py の材質の表（defs.MATERIALS）を差し替えて main() を呼ぶだけ（matgen.py・defs.py・defs_town.py は変えない）。
# 出す物は matgen.py と同じ（meta.json・sources.json・web/）。meta の use と history を「境界侵食の町の植物」に書き直す。
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import matgen  # noqa: E402
from defs_veg import VEG_MATERIALS  # noqa: E402

GEN_VEG = 'tools/mapkit/matgen/matgen_veg.py'
USE = '境界侵食（shinshoku）の町の植物（P16）'


def fix_meta(lib, ids):
    for mid in ids:
        p = os.path.join(lib, 'material', mid, 'meta.json')
        if not os.path.isfile(p):
            continue
        m = json.load(open(p, encoding='utf-8'))
        m['source']['generator'] = GEN_VEG
        m['license']['textUrl'] = 'docs/wakaba-mapkit/11_写実化パイプライン.md'
        m['use'] = [USE] + [u for u in m.get('use', []) if u != USE]
        m['history'] = [{'at': '2026-10-18', 'by': 'claude-code', 'change': f'{GEN_VEG}（defs_veg.py）で生成（境界侵食 P16：植物を試験マップと同じ作り方に）'}]
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(m, f, ensure_ascii=False, indent=1)
            f.write('\n')
        sp = os.path.join(lib, 'material', mid, 'sources.json')
        if os.path.isfile(sp):
            s = json.load(open(sp, encoding='utf-8'))
            for f_ in s.get('files', []):
                f_['note'] = f_.get('note', '').replace('tools/mapkit/matgen/matgen.py', GEN_VEG)
                f_['tool'] = f_.get('tool', '').replace('tools/mapkit/matgen/matgen.py', GEN_VEG)
            with open(sp, 'w', encoding='utf-8') as f:
                json.dump(s, f, ensure_ascii=False, indent=1)
                f.write('\n')


if __name__ == '__main__':
    matgen.MATERIALS = VEG_MATERIALS
    matgen.BIG = set()
    matgen.GEN = GEN_VEG
    args = sys.argv[1:]
    only = [args[i + 1] for i, a in enumerate(args) if a == '--only']
    lib = args[args.index('--library') + 1] if '--library' in args else os.path.join(matgen.ROOT, 'wakaba-assets', 'entries')
    try:
        matgen.main()
    finally:
        if '--no-web' not in args and ('--size' not in args or args[args.index('--size') + 1] == '1024'):
            fix_meta(lib, only or list(VEG_MATERIALS))
