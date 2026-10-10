"""確認用画像：コンタクトシート（全素材 3 倍・ラベル付き）と、素材だけで組んだ試し合成 2 枚。

    python3 tobinezumi/tools/make_assets.py --preview [--mock-dir DIR]

コンタクトシート → tobinezumi/docs/reference/assets_contact.png
試し合成       → --mock-dir（既定は tobinezumi/docs/reference/）に mock_field.png / mock_burrow.png
（合成はマニフェストの PNG を読み直して組むので、クライアントが見るのと同じ素材で確認できる）
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
ASSETS = os.path.join(ROOT, 'assets')

FONT_CANDIDATES = [
    os.path.join(ROOT, '..', 'godot', 'assets', 'fonts', 'DotGothic16-Regular.ttf'),
    '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]


def font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


class Assets:
    def __init__(self):
        with open(os.path.join(ASSETS, 'manifest.json'), encoding='utf-8') as f:
            self.m = json.load(f)
        self.cache = {}

    def sheet(self, key):
        if key not in self.cache:
            self.cache[key] = Image.open(os.path.join(ASSETS, self.m[key]['file'])).convert('RGBA')
        return self.cache[key]

    def cell(self, key, col=0, row=0):
        e = self.m[key]
        w, h = e['cell']
        return self.sheet(key).crop((col * w, row * h, col * w + w, row * h + h))

    def fur(self, img, fur):
        pal = self.m['fur.palettes']
        mp = {}
        for a, b in zip(pal['base'], pal[fur]):
            mp[tuple(int(a[i:i + 2], 16) for i in (1, 3, 5))] = tuple(int(b[i:i + 2], 16) for i in (1, 3, 5))
        px = img.load()
        out = img.copy()
        po = out.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a and (r, g, b) in mp:
                    po[x, y] = mp[(r, g, b)] + (a,)
        return out

    def nine(self, key, w, h, variant=0):
        e = self.m[key]
        l, t, r, b = e['slice']
        src = self.cell(key, variant)
        W, H = src.size
        out = Image.new('RGBA', (w, h), (0, 0, 0, 0))

        def part(x0, y0, x1, y1, dx0, dy0, dx1, dy1):
            if x1 <= x0 or y1 <= y0 or dx1 <= dx0 or dy1 <= dy0:
                return
            p = src.crop((x0, y0, x1, y1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST)
            out.paste(p, (dx0, dy0))
        xs = [(0, l, 0, l), (l, W - r, l, w - r), (W - r, W, w - r, w)]
        ys = [(0, t, 0, t), (t, H - b, t, h - b), (H - b, H, h - b, h)]
        for (sx0, sx1, dx0, dx1) in xs:
            for (sy0, sy1, dy0, dy1) in ys:
                part(sx0, sy0, sx1, sy1, dx0, dy0, dx1, dy1)
        return out


# =================================================================== contact sheet
def contact(A, path, scale=3):
    groups = [
        ('トビネズミ（地上：行 = 下・上・横）', [k for k in A.m if k.startswith('jerboa.field')]),
        ('トビネズミ（巣：横向き）・影', [k for k in A.m if k.startswith('jerboa.side')] + ['jerboa.shadow']),
        ('立ち絵（毛色 5 色）', [k for k in A.m if k.startswith('jerboa.portrait')]),
        ('地上タイル', [k for k in A.m if k.startswith('tile.') and A.m[k]['cell'] == [16, 16]
                    and not k.startswith('tile.trans') and k != 'tile.edge.water']),
        ('地上：境界（角 16 パターン）', [k for k in A.m if k.startswith('tile.trans')] + ['tile.edge.water']),
        ('地上：岩・低木・巣穴・木', [k for k in A.m if k.startswith('tile.') and A.m[k]['cell'] != [16, 16]]),
        ('採集物', [k for k in A.m if k.startswith('item.')]),
        ('巣穴（断面）', [k for k in A.m if k.startswith('nest.')]),
        ('UI', [k for k in A.m if k.startswith('ui.')]),
    ]
    W = 1900
    pad = 14
    f_lab = font(14)
    f_head = font(22)
    blocks = []
    y = 60
    placed = []
    for title, keys in groups:
        placed.append(('title', title, 20, y))
        y += 34
        x = 20
        rowh = 0
        for k in keys:
            im = A.sheet(k)
            big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
            if 'slice' in A.m[k] and k in ('ui.frame', 'ui.minimap', 'ui.bubble'):
                # also show the 9-slice stretched
                st = A.nine(k, 72, 40)
                big2 = st.resize((st.width * scale, st.height * scale), Image.NEAREST)
                comb = Image.new('RGBA', (big.width + 12 + big2.width, max(big.height, big2.height)), (0, 0, 0, 0))
                comb.paste(big, (0, 0))
                comb.paste(big2, (big.width + 12, 0))
                big = comb
            w = max(big.width, 120)
            if x + w > W - 20:
                x = 20
                y += rowh + pad + 20
                rowh = 0
            placed.append(('img', k, x, y, big))
            x += w + pad
            rowh = max(rowh, big.height)
        y += rowh + 20 + 30
    # fur swatches
    placed.append(('title', '毛色パレット（base → 各色）', 20, y))
    y += 34
    pal = A.m['fur.palettes']
    for i, fur in enumerate(['base'] + A.m['fur.order']):
        placed.append(('sw', fur, 20, y + i * 44, pal[fur]))
    y += 44 * 6 + 20
    H = y + 20
    sheet = Image.new('RGBA', (W, H), (46, 36, 30, 255))
    d = ImageDraw.Draw(sheet)
    d.text((20, 16), 'トビネズミMMO 素材コンタクトシート（3 倍・最近傍） — tools/make_assets.py で生成',
           font=f_head, fill=(242, 226, 194))
    for it in placed:
        if it[0] == 'title':
            d.text((it[2], it[3]), it[1], font=f_head, fill=(217, 195, 160))
        elif it[0] == 'img':
            _, k, x, y0, big = it
            # checker background to show transparency
            for cy in range(0, big.height, 12):
                for cx in range(0, big.width, 12):
                    c = (70, 58, 50) if (cx // 12 + cy // 12) % 2 else (84, 70, 60)
                    d.rectangle([x + cx, y0 + cy, x + min(cx + 11, big.width - 1), y0 + min(cy + 11, big.height - 1)],
                                fill=c)
            sheet.alpha_composite(big, (x, y0))
            d.text((x, y0 + big.height + 3), k, font=f_lab, fill=(200, 185, 160))
        else:
            _, fur, x, y0, cols = it
            label = fur if fur == 'base' else '%s %s' % (fur, A.m['fur.labels'][fur])
            d.text((x, y0 + 3), label, font=f_lab, fill=(220, 205, 180))
            for j, c in enumerate(cols):
                d.rectangle([x + 170 + j * 30, y0, x + 170 + j * 30 + 26, y0 + 22], fill=c)
            # small idle jerboa recoloured
            fr = A.cell('jerboa.field.idle', 0, 2)
            if fur != 'base':
                fr = A.fur(fr, fur)
            fr = fr.resize((64, 64), Image.NEAREST)
            sheet.alpha_composite(fr.crop((0, 22, 64, 62)), (x + 470, y0 - 8))
    sheet.convert('RGB').save(path, optimize=True)
    return path


# =================================================================== field mockup
def mock_field(A, path, S=3):
    W, H = 480, 270
    cw, ch = W // 16 + 1, H // 16 + 2
    rnd = random.Random(7)
    # terrain on corners: 0 sand, 1 dirt, 2 grass, -1 water
    C = [[0] * (cw + 1) for _ in range(ch + 1)]
    for y in range(ch + 1):
        for x in range(cw + 1):
            v = 0
            d1 = math.hypot(x - 6, (y - 12) * 1.3)
            d2 = math.hypot(x - 18, (y - 4) * 1.4)
            if d1 < 3.2 or d2 < 2.2:
                v = 2
            elif d1 < 4.6 or d2 < 3.4 or math.hypot(x - 22, y - 13) < 2.4:
                v = 1
            if math.hypot((x - 29) * 0.8, y - 2) < 4.2:
                v = -1
            C[y][x] = v
    img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    for ty in range(ch):
        for tx in range(cw):
            cs = [C[ty][tx], C[ty][tx + 1], C[ty + 1][tx + 1], C[ty + 1][tx]]
            img.alpha_composite(A.cell('tile.sand', (tx * 7 + ty * 3 + tx * ty) % 4), (tx * 16, ty * 16))
            bits = sum(1 << i for i, c in enumerate(cs) if c >= 1)
            if bits:
                img.alpha_composite(A.cell('tile.trans.sand_dirt', bits), (tx * 16, ty * 16))
            bits = sum(1 << i for i, c in enumerate(cs) if c >= 2)
            if bits == 15:
                img.alpha_composite(A.cell('tile.grass', (tx + ty) % 4), (tx * 16, ty * 16))
            elif bits:
                img.alpha_composite(A.cell('tile.trans.dirt_grass', bits), (tx * 16, ty * 16))
            bits = sum(1 << i for i, c in enumerate(cs) if c == -1)
            if bits == 15:
                img.alpha_composite(A.cell('tile.water', 0), (tx * 16, ty * 16))
            elif bits:
                img.alpha_composite(A.cell('tile.edge.water', bits, 0), (tx * 16, ty * 16))
    # decor (flat)
    for i in range(26):
        x, y = rnd.randrange(0, W - 16), rnd.randrange(0, H - 16)
        if C[y // 16][x // 16] == -1 or C[y // 16 + 1][x // 16 + 1] == -1:
            continue
        k = 'tile.grass_tuft' if rnd.random() < 0.6 else 'tile.pebbles'
        img.alpha_composite(A.cell(k, rnd.randrange(A.m[k]['variants'])), (x, y))
    # y-sorted sprites
    sprites = []

    def add(key, var, x, y, row=0, fur=None):
        e = A.m[key]
        im = A.cell(key, var, row)
        if fur:
            im = A.fur(im, fur)
        ax, ay = e.get('anchor', [im.width // 2, im.height - 1])
        sprites.append((y, im, x - ax, y - ay))

    add('tile.tree', 0, 120, 74)
    add('tile.rock_big', 0, 402, 196)
    add('tile.rock_big', 1, 40, 60)
    add('tile.rock_small', 0, 230, 240)
    add('tile.rock_small', 1, 300, 120)
    add('tile.shrub', 0, 330, 70)
    add('tile.shrub', 1, 64, 230)
    add('tile.shrub', 2, 200, 40)
    add('tile.shrub', 2, 440, 250)
    add('tile.shrub', 0, 160, 150)
    add('tile.burrow', 0, 270, 170)
    add('tile.burrow', 1, 380, 140)
    add('item.seed.ground', 0, 210, 130)
    add('item.grass.ground', 0, 340, 230)
    add('item.pebble.ground', 0, 120, 200)
    cast = [  # name, fur, anim, dir row, frame, flip, x, y
        ('そらとび', 'sand', 'idle', 2, 0, False, 240, 190),
        ('モカ', 'graybrown', 'hop', 2, 2, True, 180, 110),
        ('ナッツ', 'rufous', 'idle', 0, 1, False, 310, 210),
        ('リコ', 'white', 'eat', 0, 0, False, 420, 110),
        ('ピョン', 'cream', 'gather', 2, 1, True, 95, 160),
        ('', 'sand', 'bigjump', 1, 3, False, 260, 80),
    ]
    tags = []
    for (name, fur, anim, row, fr, flip, x, y) in cast:
        sh = A.cell('jerboa.shadow')
        lift = 6 if anim == 'bigjump' else (2 if anim == 'hop' else 0)
        if lift:
            sh = sh.resize((12, 6), Image.NEAREST)
        sprites.append((y - 0.5, sh, x - sh.width // 2, y - sh.height // 2))
        im = A.fur(A.cell('jerboa.field.' + anim, fr, row), fur)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        sprites.append((y, im, x - 16, y - 29 - lift))
        if name:
            tags.append((name, x, y - 29 - lift - 2, name == 'そらとび'))
    sprites.sort(key=lambda s: s[0])
    for (_, im, x, y) in sprites:
        img.alpha_composite(im, (int(x), int(y)))
    # dusk grade: warm top, slight vignette
    grade = Image.new('RGBA', (W, H))
    gp = grade.load()
    for y in range(H):
        for x in range(W):
            dx, dy = (x - W / 2) / (W / 2), (y - H / 2) / (H / 2)
            v = min(1.0, (dx * dx + dy * dy) ** 1.2 * 0.5)
            gp[x, y] = (60, 24, 40, int(70 * v + 26 * (1 - y / H)))
    img.alpha_composite(grade)
    # UI (pixel layer)
    ui = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mm = A.nine('ui.minimap', 72, 56)
    mini = img.resize((64, 48), Image.BILINEAR)
    ui.alpha_composite(mini, (W - 72 - 6 + 4, 6 + 4))
    ui.alpha_composite(mm, (W - 72 - 6, 6))
    hot_x = (W - 8 * 21) // 2
    icons = ['seed', 'grass', 'pebble']
    for i in range(8):
        ui.alpha_composite(A.cell('ui.slot', 1 if i == 0 else 0), (hot_x + i * 21, H - 26))
        if i < 3:
            ui.alpha_composite(A.cell('item.%s.icon' % icons[i]), (hot_x + i * 21 + 2, H - 24))
    chat = A.nine('ui.frame', 150, 46)
    ui.alpha_composite(chat, (6, H - 52))
    # name tags + bubble (pixel parts), text drawn after upscaling
    f = font(16 * S // 3 * 1)
    text_jobs = []
    for (name, x, y, me) in tags:
        tw = int(f.getlength(name) / S) + 6
        tag = A.nine('ui.nametag', tw, 11, 1 if me else 0)
        ui.alpha_composite(tag, (x - tw // 2, y - 11))
        text_jobs.append((name, (x - tw // 2 + 3) * S, (y - 10) * S, (255, 236, 190) if me else (232, 220, 200)))
    bw = 70
    bub = A.nine('ui.bubble', bw, 18)
    bx, by = 420 - 30, 50
    ui.alpha_composite(bub, (bx, by))
    ui.alpha_composite(A.cell('ui.bubble_tail'), (bx + 26, by + 17))
    text_jobs.append(('種みっけ！', (bx + 5) * S, (by + 2) * S, (60, 40, 30)))
    img.alpha_composite(ui)
    big = img.resize((W * S, H * S), Image.NEAREST)
    d = ImageDraw.Draw(big)
    for (t, x, y, c) in text_jobs:
        d.text((x, y), t, font=f, fill=c)
    fs = font(13 * S // 3 * 1)
    for i, (n, t, c) in enumerate([('モカ', 'ここに木の実ありますよ！', (230, 200, 120)),
                                  ('ナッツ', 'ありがとう！', (140, 200, 220)),
                                  ('リコ', '巣の場所を探してます', (200, 160, 220))]):
        d.text((12 * S, (H - 47 + i * 13) * S), '[%s] %s' % (n, t), font=fs, fill=c)
    d.text((10 * S, 6 * S), '乾いた草原', font=font(20), fill=(250, 236, 200), stroke_width=2,
           stroke_fill=(42, 26, 16))
    for i, n in enumerate(['12', '8', '5']):
        d.text(((hot_x + i * 21 + 13) * S, (H - 13) * S), n, font=font(14), fill=(250, 240, 220), stroke_width=2,
               stroke_fill=(20, 12, 8))
    big.convert('RGB').save(path, optimize=True)
    return path


# =================================================================== burrow mockup
def mock_burrow(A, path, S=3):
    W, H = 480, 270
    cw, ch = 30, 17
    SURF = 4
    img = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    # sky (the client draws this): dusk gradient + far hills
    sp = img.load()
    for y in range(SURF * 16 + 8):
        t = y / (SURF * 16 + 8)
        c0, c1 = (46, 40, 78), (232, 150, 88)
        col = tuple(int(c0[i] + (c1[i] - c0[i]) * t ** 1.4) for i in range(3))
        for x in range(W):
            sp[x, y] = col + (255,)
    for x in range(W):
        hh = int(SURF * 16 - 10 - 8 * (math.sin(x / 37.0) * 0.5 + math.sin(x / 13.0 + 1) * 0.25 + 0.6))
        for y in range(hh, SURF * 16 + 6):
            sp[x, y] = (122, 84, 70, 255)
    dug = set()

    def room(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dug.add((x, y))
    room(2, 9, 9, 11)       # bedroom
    room(17, 9, 26, 11)     # storeroom
    room(10, 11, 16, 11)    # tunnel between
    shaft = {(13, y) for y in range(5, 11)}
    dug |= shaft
    room(20, 14, 25, 15)    # lower room
    diag = [(18, 13), (19, 12)]
    vert2 = {(22, 12), (22, 13)}
    dug |= set(diag) | vert2
    rocks = {(6, 6), (27, 13), (3, 14), (14, 15)}
    for ty in range(SURF, ch):
        for tx in range(cw):
            x, y = tx * 16, ty * 16
            if ty == SURF:
                if (tx, ty + 1) in shaft:
                    pass
                img.alpha_composite(A.cell('nest.surface', (tx * 5) % 3), (x, y))
                continue
            if (tx, ty) in dug:
                if (tx, ty) in shaft or (tx, ty) in vert2:
                    img.alpha_composite(A.cell('nest.tunnel_v'), (x, y))
                elif (tx, ty) in diag:
                    img.alpha_composite(A.cell('nest.soil', 0), (x, y))
                    img.alpha_composite(A.cell('nest.tunnel_d'), (x, y))
                else:
                    img.alpha_composite(A.cell('nest.wall', (tx * 3 + ty) % 3), (x, y))
                    bits = 0
                    for b, (dx, dy) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0))):
                        n = (tx + dx, ty + dy)
                        if n not in dug or n in shaft and dy == 0 or n in diag:
                            bits |= 1 << b
                    if (tx, ty - 1) in shaft or (tx, ty - 1) in vert2:
                        bits &= ~1
                    if (tx, ty + 1) in vert2:
                        bits &= ~4
                    img.alpha_composite(A.cell('nest.edge', bits), (x, y))
            elif (tx, ty) in rocks:
                img.alpha_composite(A.cell('nest.rock', tx % 2), (x, y))
            else:
                img.alpha_composite(A.cell('nest.soil', (tx * 7 + ty * 5 + tx * ty) % 3), (x, y))
    # entrance shaft at col 13
    img.alpha_composite(A.cell('nest.entrance'), (13 * 16, SURF * 16))

    def put(key, x, y, var=0, flip=False):
        im = A.cell(key, var)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        img.alpha_composite(im, (x, y))
    floor = lambda ty: (ty + 1) * 16 - 3  # noqa: E731  y of the floor surface
    for tx in range(2, 10):
        put('nest.straw', tx * 16, 11 * 16 + 1 - 3, tx % 2)
    put('nest.brace', 2 * 16, 9 * 16)
    put('nest.brace', 9 * 16, 9 * 16, flip=True)
    put('nest.bed', 3 * 16, floor(11) - 15)
    put('nest.dried_flower', 8 * 16, floor(11) - 15)
    put('nest.lantern', 6 * 16, 9 * 16 + 2)
    put('nest.shelf', 22 * 16, floor(11) - 31)
    put('nest.seed_pile', 18 * 16, floor(11) - 15, 2)
    put('nest.seed_pile', 19 * 16 + 4, floor(11) - 15, 1)
    put('nest.seed_pile', 25 * 16, floor(11) - 15, 0)
    put('nest.lantern', 20 * 16, 9 * 16 + 2)
    put('nest.post', 17 * 16, 9 * 16)
    put('nest.post', 17 * 16, 10 * 16)
    put('nest.post', 26 * 16, 9 * 16)
    put('nest.post', 26 * 16, 10 * 16)
    put('nest.rug', 20 * 16, floor(15) - 15)
    put('nest.pebble_deco', 24 * 16, floor(15) - 15)
    put('nest.lantern', 23 * 16, 14 * 16 + 2)
    # jerboas
    js = [('jerboa.side.sleep', 0, 'sand', 3 * 16 + 2, floor(11) - 30, False),
          ('jerboa.side.walk', 2, 'rufous', 11 * 16, floor(11) - 29, False),
          ('jerboa.side.climb', 1, 'cream', 13 * 16 - 8, 7 * 16 - 8, False),
          ('jerboa.side.eat', 0, 'graybrown', 23 * 16 - 8, floor(15) - 29, True),
          ('jerboa.side.idle', 0, 'white', 18 * 16, floor(11) - 29, False)]
    for key, fr, fur, x, y, flip in js:
        im = A.fur(A.cell(key, fr), fur)
        if flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        img.alpha_composite(im, (x, y))
    # lighting: darken underground, add warm lantern pools (the client does this at runtime)
    lights = [(6 * 16 + 8, 9 * 16 + 11), (20 * 16 + 8, 9 * 16 + 11), (23 * 16 + 8, 14 * 16 + 11),
              (13 * 16 + 8, SURF * 16 + 4)]
    shade = Image.new('RGBA', (W, H))
    sp2 = shade.load()
    for y in range(SURF * 16 + 6, H):
        for x in range(W):
            lit = 0.0
            for (lx, ly) in lights:
                d = math.hypot(x - lx, (y - ly) * 1.2)
                lit = max(lit, max(0.0, 1 - d / 70.0))
            a = int(150 * (1 - lit) ** 1.5)
            warm = int(60 * lit)
            sp2[x, y] = (20 + warm, 10, 4, a)
    img.alpha_composite(shade)
    glow = Image.new('RGBA', (W, H))
    gp = glow.load()
    for (lx, ly) in lights[:3]:
        for y in range(max(0, ly - 40), min(H, ly + 40)):
            for x in range(max(0, lx - 40), min(W, lx + 40)):
                d = math.hypot(x - lx, y - ly)
                if d < 40:
                    a = int(46 * (1 - d / 40) ** 2)
                    r, g, b, a0 = gp[x, y]
                    gp[x, y] = (255, 190, 90, max(a0, a))
    img.alpha_composite(glow)
    # UI: tool column + guide
    ui = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    names = A.m['ui.tools']['labels']
    for i in range(6):
        b = A.nine('ui.button', 54, 18, 1 if i == 0 else 0)
        ui.alpha_composite(b, (6, 40 + i * 20))
        ui.alpha_composite(A.cell('ui.tools', i), (8, 41 + i * 20))
    ui.alpha_composite(A.cell('ui.cursor', 0), (5 * 16, 13 * 16))
    ui.alpha_composite(A.cell('ui.cursor', 2), (3 * 16, 14 * 16))
    ui.alpha_composite(A.cell('ui.cursor', 1), (11 * 16, 13 * 16))
    for i, w in enumerate([50, 70, 54, 76]):
        x0 = 8 + sum([50, 70, 54, 76][:i]) + i * 4
        ui.alpha_composite(A.nine('ui.button', w, 16, 0), (x0, H - 22))
    bub = A.nine('ui.bubble', 66, 18)
    ui.alpha_composite(bub, (11 * 16 - 22, floor(11) - 52))
    ui.alpha_composite(A.cell('ui.bubble_tail'), (11 * 16 + 8, floor(11) - 35))
    img.alpha_composite(ui)
    big = img.resize((W * S, H * S), Image.NEAREST)
    d = ImageDraw.Draw(big)
    f = font(16)
    for i, n in enumerate(names):
        d.text((28 * S, (43 + i * 20) * S), n, font=f, fill=(240, 226, 196))
    for i, (t, w) in enumerate(zip(['← → 移動', 'Space ジャンプ', 'E 調べる', 'B ビルドモード'], [50, 70, 54, 76])):
        x0 = 8 + sum([50, 70, 54, 76][:i]) + i * 4
        d.text(((x0 + 5) * S, (H - 19) * S), t, font=font(15), fill=(240, 226, 196))
    d.text(((11 * 16 - 18) * S, (floor(11) - 49) * S), 'いい巣ですね！', font=font(15), fill=(60, 40, 30))
    d.text((8 * S, 6 * S), 'そらとび の巣', font=font(20), fill=(250, 236, 200), stroke_width=2,
           stroke_fill=(42, 26, 16))
    big.convert('RGB').save(path, optimize=True)
    return path


def run(B=None, mock_dir=None):
    A = Assets()
    ref = os.path.join(ROOT, 'docs', 'reference')
    os.makedirs(ref, exist_ok=True)
    md = mock_dir
    if md is None:
        for i, a in enumerate(sys.argv):
            if a == '--mock-dir' and i + 1 < len(sys.argv):
                md = sys.argv[i + 1]
    md = md or ref
    os.makedirs(md, exist_ok=True)
    print(contact(A, os.path.join(ref, 'assets_contact.png')))
    print(mock_field(A, os.path.join(md, 'mock_field.png')))
    print(mock_burrow(A, os.path.join(md, 'mock_burrow.png')))


if __name__ == '__main__':
    run()
