#!/usr/bin/env python3
# わかば matgen（境界侵食の町と屋内の材質）：defs_town.py の材質を、matgen.py と同じ道具・同じ決まりで作り、素材ライブラリに置く。
#   python tools/mapkit/matgen/matgen_town.py                 … 全部（1024px の原本 → web/ に 1024・512・256 の WebP。近くで大きく見える物は 1024 まで）
#   python tools/mapkit/matgen/matgen_town.py --only mat.town.asphalt --preview <フォルダ>
# matgen.py の材質の表（defs.MATERIALS）を差し替えて main() を呼ぶだけ（matgen.py・defs.py は変えない）。
# 出す物は matgen.py と同じ（meta.json・sources.json・web/）。meta の use と history を「境界侵食の町」に書き直す。
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import matgen  # noqa: E402
from defs_town import TOWN_MATERIALS, TOWN_BIG  # noqa: E402

GEN_TOWN = 'tools/mapkit/matgen/matgen_town.py'


def fix_meta(lib, ids):
    for mid in ids:
        p = os.path.join(lib, 'material', mid, 'meta.json')
        if not os.path.isfile(p):
            continue
        m = json.load(open(p, encoding='utf-8'))
        m['source']['generator'] = GEN_TOWN
        m['license']['textUrl'] = 'docs/shinshoku/IMPLEMENTATION_STATUS.md'
        m['use'] = ['境界侵食（shinshoku）の町と屋内'] + [u for u in m.get('use', []) if u != '境界侵食（shinshoku）の町と屋内']
        m['history'] = [{'at': '2026-10-17', 'by': 'claude-code', 'change': f'{GEN_TOWN}（defs_town.py）で生成（境界侵食 P12：環境の写実化）'}]
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(m, f, ensure_ascii=False, indent=1)
            f.write('\n')
        sp = os.path.join(lib, 'material', mid, 'sources.json')
        if os.path.isfile(sp):
            s = json.load(open(sp, encoding='utf-8'))
            for f_ in s.get('files', []):
                f_['note'] = f_.get('note', '').replace('tools/mapkit/matgen/matgen.py', GEN_TOWN)
                f_['tool'] = f_.get('tool', '').replace('tools/mapkit/matgen/matgen.py', GEN_TOWN)
            with open(sp, 'w', encoding='utf-8') as f:
                json.dump(s, f, ensure_ascii=False, indent=1)
                f.write('\n')


if __name__ == '__main__':
    matgen.MATERIALS = TOWN_MATERIALS
    matgen.BIG = set(TOWN_BIG)
    matgen.GEN = GEN_TOWN
    args = sys.argv[1:]
    only = [args[i + 1] for i, a in enumerate(args) if a == '--only']
    lib = args[args.index('--library') + 1] if '--library' in args else os.path.join(matgen.ROOT, 'wakaba-assets', 'entries')
    try:
        matgen.main()
    finally:
        if '--no-web' not in args and ('--size' not in args or args[args.index('--size') + 1] == '1024'):
            fix_meta(lib, only or list(TOWN_MATERIALS))
