#!/usr/bin/env python3
"""normalize_sprites.py — 外部で描いた／生成した画像を、ゲームの規格に揃えるパイプライン
(ASSET_LIST.md §7 の 2.)

  切り出し → 背景除去 → 縮小（最近傍）→ パレット減色（素材ごとの固定パレット）→ 輪郭付け → シート化
  （→ 任意で manifest.json に登録）

例：
  # 4 列 3 行に並んだ下描き（行 = down/up/side）を 32×32 セルの地上シートに
  python3 tobinezumi/tools/normalize_sprites.py draft.png --grid 4x3 --cell 32x32 \\
      --palette jerboa --out tobinezumi/assets/jerboa/field_hop.png \\
      --key jerboa.field.hop --dirs down,up,side --fps 10

  # 1 枚絵（木）を 48×64 に。背景色は四隅から自動判定
  python3 tobinezumi/tools/normalize_sprites.py tree.png --cell 48x64 --palette field \\
      --out tobinezumi/assets/field/tree.png --key tile.tree

  # パレット一覧
  python3 tobinezumi/tools/normalize_sprites.py --list-palettes

オプションの要点：
  --grid CxR        元画像を C 列 R 行に等分（既定 1x1）。--src-cell WxH で px 指定も可
  --cell WxH        出力セルの大きさ
  --bg auto|none|#rrggbb   背景除去（auto = 四隅の色を縁から塗りつぶしで消す）。--bg-tol 許容差、
                    --bg-global で縁とつながっていない同色（葉の隙間など）も消す
  --fit contain|fill       contain: 内容の外接矩形を縦横比を保って収め、下端中央に置く（既定）
  --margin N        セル内の余白（輪郭 1px 分を含めて既定 1）
  --palette NAME|FILE      jerboa / field / nest / ui / all か、.hex/.txt/.json（色の一覧）
  --no-outline      輪郭を付けない（タイル等）。--outline-color で色変更（既定 #2a1a10）
  --base-fur        jerboa パレット時、毛の色を「基準の毛色（砂色）」に吸着させる（毛色差し替え用）
"""
from __future__ import annotations

import argparse
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUTLINE = (0x2A, 0x1A, 0x10)


# ------------------------------------------------------------------ palettes
def _rgb(h):
    h = h.strip().lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def builtin_palettes():
    import art_jerboa as J
    import art_field as F
    import art_nest as N
    import art_ui as U
    P = {}
    P['jerboa'] = list(J.FUR_BASE) + [J.EYE, J.EYE_HI, J.EYE_RIM, J.NOSE, J.CLAW]
    P['field'] = (F.SAND + F.DIRT + F.GRASS + F.DRYGRASS + F.WATER + [F.FOAM] + F.ROCK + F.LEAF + F.SAGE
                  + F.BLOOM + F.BARK + F.SEED_PAL + F.STONE_PAL)
    P['nest'] = N.SOIL + N.WALL + N.FLOOR + N.ROOT + N.WOOD + N.STRAW + N.CLOTH + N.GLOW + N.METAL
    P['ui'] = list(U.UI.values()) if isinstance(list(U.UI.values())[0], str) else []
    P['ui'] = [v for v in U.UI.values() if isinstance(v, str)]
    P['all'] = sorted(set(P['jerboa'] + P['field'] + P['nest'] + P['ui']))
    out = {}
    for k, v in P.items():
        cols = []
        for c in v:
            c = _rgb(c) if isinstance(c, str) else tuple(c[:3])
            if c not in cols:
                cols.append(c)
        if OUTLINE not in cols:
            cols.append(OUTLINE)
        out[k] = cols
    return out


def load_palette(name):
    if name is None:
        return None
    if os.path.exists(name):
        with open(name, encoding='utf-8') as f:
            txt = f.read()
        if name.endswith('.json'):
            data = json.loads(txt)
            if isinstance(data, dict):
                data = [c for v in data.values() for c in (v if isinstance(v, list) else [v])]
            return [_rgb(c) for c in data]
        return [_rgb(t) for t in txt.replace(',', ' ').split() if t.strip().lstrip('#')[:6].isalnum()]
    pals = builtin_palettes()
    if name not in pals:
        raise SystemExit('unknown palette %r (have: %s)' % (name, ', '.join(pals)))
    return pals[name]


def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_lab(rgb):
    r, g, b = (_lin(v) for v in rgb)
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722)
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


class Quantizer:
    def __init__(self, pal):
        self.pal = pal
        self.lab = [to_lab(c) for c in pal]
        self.cache = {}

    def __call__(self, rgb):
        if rgb in self.cache:
            return self.cache[rgb]
        L = to_lab(rgb)
        best = min(range(len(self.pal)),
                   key=lambda i: (L[0] - self.lab[i][0]) ** 2 + (L[1] - self.lab[i][1]) ** 2
                   + (L[2] - self.lab[i][2]) ** 2)
        self.cache[rgb] = self.pal[best]
        return self.pal[best]


# ------------------------------------------------------------------ steps
def split(im, grid=None, src_cell=None):
    W, H = im.size
    if src_cell:
        cw, ch = src_cell
        cols, rows = W // cw, H // ch
    else:
        cols, rows = grid or (1, 1)
        cw, ch = W // cols, H // rows
    return [[im.crop((c * cw, r * ch, c * cw + cw, r * ch + ch)) for c in range(cols)] for r in range(rows)]


def remove_bg(im, mode='auto', tol=28, global_=False):
    """Flood-fill from the border (or everywhere with global_), removing pixels close to the bg colour."""
    im = im.convert('RGBA')
    if mode == 'none':
        return im
    W, H = im.size
    px = im.load()
    if mode == 'auto':
        corners = [px[0, 0], px[W - 1, 0], px[0, H - 1], px[W - 1, H - 1]]
        if all(c[3] < 16 for c in corners):
            return im
        corners.sort(key=lambda c: sum(c[:3]))
        bg = corners[1][:3]
    else:
        bg = _rgb(mode)

    def close(c):
        return c[3] < 16 or sum(abs(c[i] - bg[i]) for i in range(3)) <= tol * 3

    if global_:
        for y in range(H):
            for x in range(W):
                if close(px[x, y]):
                    px[x, y] = (0, 0, 0, 0)
        return im
    seen = bytearray(W * H)
    stack = [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + \
            [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < W and 0 <= y < H) or seen[y * W + x]:
            continue
        seen[y * W + x] = 1
        if not close(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def fit(im, cell, margin=1, mode='contain', anchor='bottom'):
    """Crop to content, scale with NEAREST to fit the cell, place bottom-centre."""
    cw, ch = cell
    bbox = im.getbbox()
    out = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    if not bbox:
        return out
    content = im.crop(bbox) if mode == 'contain' else im
    iw, ih = content.size
    aw, ah = cw - 2 * margin, ch - 2 * margin
    s = min(aw / iw, ah / ih) if mode == 'contain' else None
    if mode == 'contain':
        nw, nh = max(1, round(iw * s)), max(1, round(ih * s))
    else:
        nw, nh = aw, ah
    # two-stage: box-filter to 2x then nearest, keeps thin features without blur
    if iw > nw * 2 and ih > nh * 2:
        content = content.resize((nw * 2, nh * 2), Image.BOX)
    small = content.resize((nw, nh), Image.NEAREST)
    x = (cw - nw) // 2
    y = (ch - margin - nh) if anchor == 'bottom' else (ch - nh) // 2
    out.alpha_composite(small, (x, y))
    return out


def quantize(im, q, alpha_cut=128):
    px = im.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < alpha_cut:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = q((r, g, b)) + (255,)
    return im


def despeckle(im):
    """Remove opaque pixels with no 4-neighbours (noise left by downscaling)."""
    px = im.load()
    W, H = im.size
    kill = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0:
                continue
            n = 0
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < W and 0 <= Y < H and px[X, Y][3]:
                    n += 1
            if n == 0:
                kill.append((x, y))
    for (x, y) in kill:
        px[x, y] = (0, 0, 0, 0)
    return im


def outline(im, col=OUTLINE):
    px = im.load()
    W, H = im.size
    add = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < W and 0 <= Y < H and px[X, Y][3] == 255 and px[X, Y][:3] != col:
                    add.append((x, y))
                    break
    for (x, y) in add:
        px[x, y] = col + (255,)
    return im


def pack(rows, cell):
    cw, ch = cell
    cols = max(len(r) for r in rows)
    out = Image.new('RGBA', (cw * cols, ch * len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, im in enumerate(row):
            out.alpha_composite(im, (c * cw, r * ch))
    return out


def register(key, out_path, cell, rows, extra):
    man_path = os.path.join(ROOT, 'assets', 'manifest.json')
    with open(man_path, encoding='utf-8') as f:
        man = json.load(f)
    rel = os.path.relpath(os.path.abspath(out_path), os.path.join(ROOT, 'assets')).replace(os.sep, '/')
    e = dict(man.get(key, {}))
    e.update({'file': rel, 'cell': list(cell)})
    if len(rows) > 1 or 'frames' in e or key.startswith('jerboa.'):
        e['frames'] = max(len(r) for r in rows)
    else:
        e['variants'] = len(rows[0])
    e.update(extra)
    man[key] = e
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    print('manifest: %s -> %s' % (key, rel))


def wh(s):
    a, b = s.lower().split('x')
    return int(a), int(b)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', nargs='?')
    ap.add_argument('--grid', type=wh)
    ap.add_argument('--src-cell', type=wh)
    ap.add_argument('--cell', type=wh)
    ap.add_argument('--bg', default='auto')
    ap.add_argument('--bg-tol', type=int, default=28)
    ap.add_argument('--bg-global', action='store_true')
    ap.add_argument('--fit', default='contain', choices=['contain', 'fill'])
    ap.add_argument('--anchor', default='bottom', choices=['bottom', 'center'])
    ap.add_argument('--margin', type=int, default=1)
    ap.add_argument('--palette', default='all')
    ap.add_argument('--base-fur', action='store_true')
    ap.add_argument('--no-outline', action='store_true')
    ap.add_argument('--outline-color', default='#2a1a10')
    ap.add_argument('--alpha-cut', type=int, default=128)
    ap.add_argument('--out')
    ap.add_argument('--key')
    ap.add_argument('--dirs')
    ap.add_argument('--fps', type=float)
    ap.add_argument('--list-palettes', action='store_true')
    a = ap.parse_args(argv)
    if a.list_palettes:
        for k, v in builtin_palettes().items():
            print('%-7s %3d colours' % (k, len(v)))
        return 0
    if not (a.src and a.cell and a.out):
        ap.error('src, --cell and --out are required')
    im = Image.open(a.src).convert('RGBA')
    pal = load_palette(a.palette)
    if a.base_fur:
        import art_jerboa as J
        pal = [_rgb(c) for c in J.FUR_BASE] + [_rgb(c) for c in (J.EYE, J.EYE_HI, J.NOSE)] + [OUTLINE]
    q = Quantizer(pal) if pal else None
    oc = _rgb(a.outline_color)
    rows = []
    for row in split(im, a.grid, a.src_cell):
        out_row = []
        for c in row:
            c = remove_bg(c, a.bg, a.bg_tol, a.bg_global)
            c = fit(c, a.cell, a.margin if not a.no_outline else max(0, a.margin - 1), a.fit, a.anchor)
            if q:
                c = quantize(c, q, a.alpha_cut)
            c = despeckle(c)
            if not a.no_outline:
                c = outline(c, oc)
            out_row.append(c)
        rows.append(out_row)
    sheet = pack(rows, a.cell)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sheet.save(a.out, optimize=True)
    print('wrote %s (%dx%d, %d rows x %d cols)' % (a.out, sheet.width, sheet.height, len(rows), len(rows[0])))
    if a.key:
        extra = {}
        if a.dirs:
            extra['dirs'] = a.dirs.split(',')
        if a.fps:
            extra['fps'] = a.fps
        register(a.key, a.out, a.cell, rows, extra)
    return 0


if __name__ == '__main__':
    sys.exit(main())
