# VRoid の VRM をゲーム用に軽くする時のテクスチャの縮小・再圧縮（tools/charkit/vroid_game.mjs から呼ぶ）。
#   python -I tools/charkit/vroid_tex.py <jobs.json>
# jobs.json：[{ "in": PNG/JPEG の場所, "out": 書き出す場所, "max": 長い辺の上限 px, "fmt": "webp"|"jpeg"|"png", "quality": 0-100, "lossless": bool }]
# 要るもの：Pillow（WebP の書き出しができる版）。同じ入力・同じ Pillow なら同じ出力になる（乱数・日時を使わない）。
import json
import sys

from PIL import Image


def main(path):
    jobs = json.load(open(path, encoding='utf-8'))
    out = []
    for j in jobs:
        im = Image.open(j['in'])
        im.load()
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.getbands() or im.mode == 'P' else 'RGB')
        # 透明が全部 255 なら RGB に（WebP・JPEG の大きさが減る。見た目は同じ）
        if im.mode == 'RGBA' and im.getchannel('A').getextrema() == (255, 255):
            im = im.convert('RGB')
        w, h = im.size
        m = int(j.get('max') or 0)
        if m and max(w, h) > m:
            k = m / max(w, h)
            im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        fmt = j['fmt']
        if fmt == 'webp':
            if j.get('lossless') or max(im.size) <= 16:
                im.save(j['out'], 'WEBP', lossless=True, quality=100, method=6, exact=True)
            else:
                im.save(j['out'], 'WEBP', quality=int(j.get('quality', 85)), method=6, alpha_quality=100, exact=True)
        elif fmt == 'jpeg':
            im.convert('RGB').save(j['out'], 'JPEG', quality=int(j.get('quality', 85)), optimize=True)
        else:
            im.save(j['out'], 'PNG', optimize=True)
        out.append({'out': j['out'], 'w': im.size[0], 'h': im.size[1], 'mode': im.mode})
    print(json.dumps(out))


if __name__ == '__main__':
    main(sys.argv[1])
