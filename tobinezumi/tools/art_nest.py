"""巣穴（地下の断面）のタイルと家具

- 土壁 soil×3 / 岩 rock×2 / 地表 surface×3（上 5px は透過＝空はクライアントが描く）
- 掘った空間の奥壁 wall×3
- 縁の自動タイル edge×16：掘ったセルに重ねる。ビット = 隣が「土（掘っていない）」
  N=1, E=2, S=4, W=8。S が土なら床の縁、N が土なら天井の縁、E/W は壁の縁。
- 通路 tunnel_h / tunnel_v（根のはしご）/ tunnel_d（斜め、右上がり。左上がりは反転）
- 床の敷き草 straw×2、角の補強 brace、柱 post
- 寝床 32×16、棚 32×32、種の山 16×16×3 段階、ランタン 16×16×2（揺らぎ）、
  小石の飾り、乾いた花、敷物 32×16、入口の縦穴 16×32
"""
from __future__ import annotations

import math
import random

from pixart import Img, Rig, PNoise, fbm, bayer, hx, mix, OUTLINE, bezier
from art_field import GRASS, DRYGRASS, SAND, ROCK, BLOOM, soft_shadow, leaf_cluster
from art_field import SEED_PAL, STONE_PAL

T = 16
SOIL = ['#1c110a', '#28180e', '#342013', '#412918', '#50331e', '#634026']
WALL = ['#3e2716', '#54351e', '#694427', '#7c5330', '#8f6239', '#a47447']
FLOOR = ['#4a2f1a', '#6a4528', '#8a5e36', '#a87a4a', '#c39660']
ROOT = ['#3a2616', '#5a3e26', '#7a5838', '#9a7650']
WOOD = ['#2e1c10', '#4a2e18', '#6a4424', '#8a5c32', '#a87644', '#c49460']
STRAW = ['#5e4a1e', '#7e662a', '#a08636', '#c2a648', '#dcc26a', '#efdc96']
CLOTH = ['#5a2a24', '#7e3a2e', '#a24e36', '#c87a4a', '#e0a868']
GLOW = ['#7a3a10', '#c0641a', '#f0a030', '#ffd47a', '#fff4c8']
METAL = ['#2a2420', '#4a3e34', '#6e5e4c', '#94806a']


def pick(pal, v):
    v = max(0.0, min(0.999, v))
    return hx(pal[int(v * len(pal))])


_n_soil = [PNoise(p, 300 + p) for p in (2, 4, 8)]
_n_wall = [PNoise(p, 400 + p) for p in (2, 4)]
_n_edge = PNoise(8, 501)


def soil_px(x, y, var=0):
    v = 0.5 + (fbm(_n_soil, x, y, T) - 0.5) * 0.7 + bayer(x, y) * 0.16
    r = random.Random('soil%d,%d,%d' % (x % T, y % T, var))
    c = pick(SOIL[1:5], v)
    rr = r.random()
    if rr < 0.025:
        c = hx(SOIL[0])
    elif rr < 0.045:
        c = hx(SOIL[5])
    return c


def soil(var):
    im = Img(T, T)
    for y in range(T):
        for x in range(T):
            im.set(x, y, soil_px(x, y, var))
    r = random.Random(var * 13 + 2)
    # buried pebbles / bits of root
    if var == 1:
        for (cx, cy) in ((4, 5), (11, 11)):
            im.set(cx, cy, STONE_PAL[3])
            im.set(cx + 1, cy, STONE_PAL[2])
            im.set(cx, cy + 1, STONE_PAL[1])
            im.set(cx + 1, cy + 1, SOIL[0])
    if var == 2:
        x, y = 3, 3
        for k in range(9):
            im.set(x, y, ROOT[1])
            x += 1
            y += r.choice([0, 0, 1])
    return im


def rock_tile(var):
    im = soil(0)
    rg = Rig(T, T, {'rock': [hx(c) for c in ROCK[:5]]}, ambient=0.1)
    if var == 0:
        rg.ellipse(8, 8.5, 6.6, 5.6, 'rock', ang=-10, dither=0.15)
    else:
        rg.ellipse(6, 7, 4.6, 4.0, 'rock', dither=0.15, group='a')
        rg.ellipse(11, 11, 4.2, 3.6, 'rock', dither=0.15, group='b')
    st = rg.resolve(outline=SOIL[0])
    im.paste(st, 0, 0)
    for (x, y) in ((6, 6), (7, 6), (5, 7)) if var == 0 else ((5, 5), (10, 9)):
        im.set(x, y, ROCK[5])
    return im


def surface(var):
    """Top of the cross-section: grass/sand surface, then soil with hanging roots."""
    im = Img(T, T)
    r = random.Random(var * 7 + 3)
    top = [5 + (1 if _n_edge(x / 2, 0) > 0.6 else 0) for x in range(T)]
    for x in range(T):
        for y in range(top[x], T):
            im.set(x, y, soil_px(x, y, var))
        # topsoil band (darker, richer)
        for y in range(top[x], top[x] + 3):
            im.set(x, y, SOIL[2] if (x + y) % 3 else SOIL[3])
        # grass layer on the very top
        im.set(x, top[x], GRASS[2] if x % 3 else GRASS[3])
        im.set(x, top[x] - 1, GRASS[3] if (x + var) % 2 else GRASS[4])
        if r.random() < 0.55:
            h = r.randint(1, 4)
            for k in range(h):
                im.set(x, top[x] - 1 - k, GRASS[3 + (k % 2)] if r.random() < 0.7 else DRYGRASS[3])
    # roots dangling down
    for i in range(2 + var):
        x = r.randint(1, 14)
        y = top[x] + 2
        for k in range(r.randint(4, 9)):
            im.set(x, y, ROOT[2] if k < 3 else ROOT[1])
            if k % 3 == 2:
                x += r.choice([-1, 1])
                x = max(0, min(15, x))
            y += 1
    return im


def wall_px(x, y, var=0):
    v = 0.48 + (fbm(_n_wall, x, y, T) - 0.5) * 0.5 + bayer(x, y) * 0.12
    # vertical claw scratches
    if (x * 5 + var * 3) % 7 == 0 and (y + x) % 6 < 3:
        v -= 0.18
    r = random.Random('wall%d,%d,%d' % (x % T, y % T, var))
    if r.random() < 0.02:
        v += 0.3
    return pick(WALL[1:5], v)


def wall(var):
    im = Img(T, T)
    for y in range(T):
        for x in range(T):
            im.set(x, y, wall_px(x, y, var))
    return im


def edge(bits):
    """Overlay for a dug cell. bits: N=1 E=2 S=4 W=8 (neighbour is solid soil)."""
    im = Img(T, T)
    N, E, S, W = [(bits >> i) & 1 for i in range(4)]

    def rough(t, seed):
        return 1 if _n_edge(t / 2.0, seed) > 0.55 else 0

    def put(x, y, c):
        im.px[y * T + x] = c if len(c) == 4 else c + (255,)

    # order: shadows first, then walls, ceiling, floor (floor wins at the corners)
    for y in range(T):
        for x in range(T):
            if N:
                d = 2 + rough(x, 3)
                if y == d + 1 or y == d + 2:
                    put(x, y, (0x1a, 0x10, 0x08, 100 if y == d + 1 else 50))
            if W:
                d = 2 + rough(y, 5)
                if x == d + 1:
                    put(x, y, (0x1a, 0x10, 0x08, 60))
            if E:
                d = 13 - rough(y, 7)
                if x == d - 1:
                    put(x, y, (0x1a, 0x10, 0x08, 90))
    for y in range(T):
        for x in range(T):
            if W:
                d = 2 + rough(y, 5)
                if x < d:
                    put(x, y, hx(soil_px(x, y)))
                elif x == d:
                    put(x, y, hx(FLOOR[3]))
            if E:
                d = 13 - rough(y, 7)
                if x > d:
                    put(x, y, hx(soil_px(x, y)))
                elif x == d:
                    put(x, y, hx(FLOOR[2]))
            if N:
                d = 2 + rough(x, 3)
                if y < d:
                    put(x, y, hx(soil_px(x, y)))
                elif y == d:
                    put(x, y, hx(FLOOR[3]) if (x + 1) % 5 else hx(FLOOR[2]))
            if S:
                d = 13 - rough(x, 1)
                if y > d + 1:
                    put(x, y, hx(soil_px(x, y)))
                elif y == d + 1:
                    put(x, y, hx(FLOOR[2]))
                elif y == d:
                    put(x, y, hx(FLOOR[4]) if x % 4 else hx(FLOOR[3]))
                elif y == d - 1 and im.px[y * T + x] is None:
                    put(x, y, SHADOW_A)
    return im


SHADOW_A = (0x1a, 0x10, 0x08, 90)


def tunnel_h():
    im = wall(0)
    im.paste(edge(1 | 4), 0, 0)
    return im


def tunnel_v():
    """Vertical shaft with a ladder of roots."""
    im = wall(1)
    im.paste(edge(2 | 8), 0, 0)
    # two side root rails + rungs
    for y in range(T):
        im.set(4, y, ROOT[1])
        im.set(11, y, ROOT[1])
        if y % 2 == 0:
            im.set(4, y, ROOT[2])
        if y % 3 == 1:
            im.set(11, y, ROOT[2])
    for ry in (3, 11):
        for x in range(4, 12):
            im.set(x, ry, ROOT[2] if x % 3 else ROOT[3])
            im.set(x, ry + 1, ROOT[0])
    return im


def tunnel_d():
    """Diagonal passage going up to the right (mirror for up-left), with steps."""
    im = Img(T, T)
    for y in range(T):
        for x in range(T):
            # floor line: y = 15 - x ; ceiling: y = 6 - x (+16 wrap below)
            fl = 18 - x
            ce = fl - 13
            if y > fl + 1:
                im.set(x, y, soil_px(x, y))
            elif y >= fl:
                im.set(x, y, FLOOR[4] if y == fl else FLOOR[2])
            elif y > ce:
                im.set(x, y, wall_px(x, y))
                if y == ce + 1:
                    im.set(x, y, FLOOR[3])
                elif y == ce + 2:
                    im.set(x, y, mix(wall_px(x, y), '#1a1008', 0.4))
            else:
                im.set(x, y, soil_px(x, y))
    # little dug steps
    for k in (4, 9, 14):
        im.set(k, 18 - k - 1, FLOOR[3])
        im.set(k + 1, 18 - k - 1, FLOOR[3])
    return im


def straw(var):
    im = Img(T, T)
    r = random.Random(var * 3 + 11)
    for i in range(26):
        x0 = r.uniform(-1, 16)
        y0 = r.uniform(11.5, 15)
        ang = r.uniform(-0.5, 0.5)
        L = r.randint(3, 6)
        col = STRAW[r.randint(2, 5)]
        for k in range(L):
            x = round(x0 + k * math.cos(ang))
            y = round(y0 + k * math.sin(ang))
            if 0 <= x < T and 10 <= y < T:
                im.set(x, y, col)
    for x in range(T):
        im.set(x, 15, STRAW[1])
    return im


def post():
    im = Img(T, T)
    for y in range(T):
        for x in range(5, 11):
            v = 0.15 + (x - 5) / 6 * 0.7 + bayer(x, y) * 0.1
            im.set(x, y, pick(WOOD[1:6], 1 - abs(v - 0.55) * 1.6))
        im.set(5, y, WOOD[0])
        im.set(10, y, WOOD[0])
        if y % 5 == 2:
            im.set(7, y, WOOD[1])
    return im


def brace():
    """Corner reinforcement: wooden beam + diagonal strut (top-left corner of a room)."""
    im = Img(T, T)
    for x in range(T):
        for y in range(0, 4):
            im.set(x, y, WOOD[4] if y == 0 else (WOOD[3] if y < 3 else WOOD[1]))
    for y in range(T):
        for x in range(0, 4):
            im.set(x, y, WOOD[4] if x == 0 else (WOOD[3] if x < 3 else WOOD[1]))
    for k in range(4, 13):
        y = 16 - k
        im.set(k, y - 1, WOOD[4])
        im.set(k, y, WOOD[3])
        im.set(k, y + 1, WOOD[1])
    for k in range(0, 16):
        im.set(k, 4, OUTLINE)
        im.set(4, k, OUTLINE)
    for k in range(4, 13):
        im.set(k, 16 - k - 2, OUTLINE) if im.get(k, 16 - k - 2) is None else None
        im.set(k, 16 - k + 2, OUTLINE) if im.get(k, 16 - k + 2) is None else None
    # nail
    im.set(1, 1, METAL[3])
    return im


def bed():
    """Bowl-shaped grass nest: back rim, dark hollow, front rim."""
    W, H = 32, 16
    rg = Rig(W, H, {'straw': [hx(c) for c in STRAW]}, ambient=0.2)
    rg.ellipse(16, 8.0, 15.0, 5.6, 'straw', group='nest', dither=0.25)
    rg.ellipse(16, 7.8, 11.0, 3.6, 'straw', group='hollow', shift=-0.75, line=False, flat=0.7)
    front = rg.ellipse(16, 11.8, 15.2, 3.6, 'straw', group='front', dither=0.25, shift=0.05)
    # cut the front rim so it only covers the lower half
    for y in range(0, 10):
        for x in range(W):
            i = y * W + x
            if rg.pid[i] == front:
                rg.pid[i] = -1
                rg.mat[i] = None
    img = rg.resolve(lines=False)
    # restore the back-rim pixels that were erased above the front rim cut
    back = Rig(W, H, {'straw': [hx(c) for c in STRAW]}, ambient=0.2)
    back.ellipse(16, 8.0, 15.0, 5.6, 'straw', group='nest', dither=0.25)
    back.ellipse(16, 7.8, 11.0, 3.6, 'straw', group='hollow', shift=-0.75, line=False, flat=0.7)
    bimg = back.resolve(lines=False)
    for y in range(0, 10):
        for x in range(W):
            if img.get(x, y) is None and bimg.get(x, y) is not None:
                img.set(x, y, bimg.get(x, y))
    r = random.Random(5)
    for i in range(80):
        x = r.randint(2, 29)
        y = r.randint(3, 14)
        c0 = img.get(x, y)
        if c0 and c0[:3] != hx(OUTLINE)[:3] and c0[:3] not in (hx(STRAW[0])[:3], hx(STRAW[1])[:3]):
            c = STRAW[r.choice([2, 3, 4, 5])]
            img.set(x, y, c)
            c1 = img.get(x + 1, y)
            if r.random() < 0.6 and c1 and c1[:3] != hx(OUTLINE)[:3]:
                img.set(x + 1, y, c)
    for (x, y) in ((0, 8), (1, 6), (31, 8), (30, 6), (5, 2), (26, 2), (12, 2), (20, 2)):
        if img.get(x, y) is None:
            img.set(x, y, STRAW[3])
    return img


def shelf():
    W = 32
    im = Img(W, W)
    # two uprights + two planks
    for y in range(4, 32):
        for x in (2, 3, 28, 29):
            im.set(x, y, WOOD[3] if x in (2, 28) else WOOD[2])
        im.set(1, y, OUTLINE)
        im.set(4, y, OUTLINE)
        im.set(27, y, OUTLINE)
        im.set(30, y, OUTLINE)
    for py in (13, 26):
        for x in range(1, 31):
            im.set(x, py - 1, OUTLINE)
            im.set(x, py, WOOD[4])
            im.set(x, py + 1, WOOD[3])
            im.set(x, py + 2, WOOD[1])
            im.set(x, py + 3, OUTLINE)
    for x in range(1, 31):
        im.set(x, 3, OUTLINE)
    # goods: clay pots and a seed sack
    rg = Rig(W, W, {'clay': [hx(c) for c in CLOTH[:5]], 'sack': [hx(c) for c in STRAW[1:6]],
                    'seed': [hx(c) for c in SEED_PAL]}, ambient=0.18)
    rg.ellipse(9, 9.4, 3.2, 3.4, 'clay', group='p1')
    rg.ellipse(15.5, 10, 2.6, 2.8, 'clay', group='p2', shift=0.1)
    rg.ellipse(22, 8.8, 3.6, 4.0, 'sack', group='s1', dither=0.15)
    rg.ellipse(10, 22, 4.4, 3.4, 'seed', group='s2', dither=0.2)
    rg.ellipse(19.5, 22.2, 3.6, 3.2, 'seed', group='s3', dither=0.2, shift=0.08)
    goods = rg.resolve()
    # clip goods to sit on the planks
    for y in range(W):
        for x in range(W):
            c = goods.get(x, y)
            if c and not (y >= 12 and y <= 13 or y >= 25):
                im.set(x, y, c)
    for (x, y) in ((8, 6), (14, 8)):
        im.set(x, y, CLOTH[4])
    return im


def seed_pile(stage):
    rg = Rig(T, T, {'seed': [hx(c) for c in SEED_PAL]}, ambient=0.15)
    r = random.Random(stage + 40)
    h = [3.5, 6.0, 9.0][stage]
    wd = [4.5, 6.2, 7.4][stage]
    n = [12, 30, 60][stage]
    for i in range(n):
        x = 8 + r.uniform(-wd, wd)
        top = 15 - h * (1 - ((x - 8) / (wd + 0.5)) ** 2)
        y = r.uniform(top, 14.4)
        rg.ellipse(x, y, 1.5, 1.0, 'seed', ang=r.uniform(-50, 50), group='s%d' % i, line=False,
                   shift=r.uniform(-0.15, 0.15))
    img = rg.resolve(lines=False)
    for i in range(n // 3):
        x = round(8 + r.uniform(-wd + 1, wd - 1))
        for y in range(16):
            if img.get(x, y) and img.get(x, y)[:3] != hx(OUTLINE)[:3]:
                img.set(x, y + 1, SEED_PAL[5])
                break
    return img


def lantern(frame):
    im = Img(T, T)
    # hook + chain
    im.set(7, 0, METAL[2])
    im.set(8, 0, METAL[2])
    im.set(7, 1, METAL[3])
    im.set(7, 2, METAL[2])
    rows = [
        "....kkkk....",
        "...kmmmmk...",
        "..kmmmmmmk..",
        "..kmyyyymk..",
        "..kmywwymk..",
        "..kmywwymk..",
        "..kmyoyymk..",
        "..kmyyyymk..",
        "..kmmmmmmk..",
        "...kmmmmk...",
        "....kkkk....",
    ]
    glow = {'k': OUTLINE, 'm': METAL[2], 'y': GLOW[2],
            'w': GLOW[4] if frame == 0 else GLOW[3], 'o': GLOW[3] if frame == 0 else GLOW[4]}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                im.set(x + 2, y + 3, glow[ch])
    # glass frame bars
    for y in range(6, 11):
        im.set(5, y, METAL[1])
        im.set(10, y, METAL[1])
    im.set(6, 5, METAL[3])
    im.set(7, 4, METAL[3])
    # warm halo pixels around (semi-transparent)
    for (x, y) in ((3, 8), (12, 8), (3, 9), (12, 9), (7, 14), (8, 14)):
        if im.get(x, y) is None:
            im.px[y * T + x] = hx(GLOW[3])[:3] + (90 if frame == 0 else 60,)
    return im


def pebble_deco():
    rg = Rig(T, T, {'stone': [hx(c) for c in STONE_PAL], 'rock': [hx(c) for c in ROCK]}, ambient=0.15)
    rg.ellipse(8, 13, 5.5, 2.4, 'stone', group='a', dither=0.1)
    rg.ellipse(8, 9.6, 4.0, 1.9, 'rock', group='b', dither=0.1)
    rg.ellipse(8, 6.8, 2.8, 1.5, 'stone', group='c', shift=0.1)
    rg.ellipse(8.3, 4.6, 1.6, 1.2, 'rock', group='d', shift=0.15)
    return rg.resolve()


def dried_flower():
    im = Img(T, T)
    rg = Rig(T, T, {'clay': [hx(c) for c in CLOTH[:5]]}, ambient=0.2)
    rg.ellipse(8, 12.5, 3.6, 3.0, 'clay', group='pot')
    pot = rg.resolve()
    stems = [((8, 10), (5, 3)), ((8, 10), (8, 2)), ((8, 10), (11, 4)), ((8, 10), (3, 6)), ((8, 10), (13, 7))]
    for (a, b) in stems:
        im.line(a[0], a[1], b[0], b[1], DRYGRASS[1])
    for (x, y), c in zip([(5, 3), (8, 2), (11, 4), (3, 6), (13, 7)], [BLOOM[2], '#e0b860', BLOOM[3], '#d89068', BLOOM[2]]):
        for dx, dy in ((0, 0), (1, 0), (0, -1), (-1, 0), (0, 1)):
            if (dx, dy) == (0, 0):
                im.set(x + dx, y + dy, '#f2e0a0')
            else:
                im.set(x + dx, y + dy, c)
    im.outline()
    im.paste(pot, 0, 0)
    for x in range(6, 11):
        im.set(x, 10, CLOTH[4])
    return im


def rug():
    W, H = 32, 16
    im = Img(W, H)
    for y in range(10, 16):
        for x in range(1, 31):
            band = y - 10
            if band in (0, 5):
                c = CLOTH[1]
            elif band in (1, 4):
                c = CLOTH[3] if (x // 2) % 2 else CLOTH[4]
            else:
                c = CLOTH[2] if ((x + band * 2) // 3) % 2 else STRAW[4]
                if x % 8 in (3, 4) and band in (2, 3):
                    c = '#e8dcc0'
            im.set(x, y, c)
    # fringe
    for y in range(10, 16, 2):
        im.set(0, y, STRAW[3])
        im.set(31, y, STRAW[3])
    im.outline()
    return im


def entrance():
    """16x32: surface lip with the hole (top) and the shaft going down (bottom)."""
    im = Img(T, 32)
    top = surface(0)
    im.paste(top, 0, 0)
    # carve the hole through the surface tile and the tile below
    for y in range(4, 32):
        for x in range(4, 12):
            im.set(x, y, wall_px(x, y, 2))
            if y < 9:
                im.set(x, y, None)
        im.set(3, y, SOIL[0] if y > 8 else None)
        im.set(12, y, SOIL[0] if y > 8 else None)
    for y in range(9, 32):
        for x in range(0, 3):
            im.set(x, y, soil_px(x, y))
        for x in range(13, 16):
            im.set(x, y, soil_px(x, y))
    # lip: dug sand mounds on both sides of the opening
    for (x, y) in ((1, 4), (2, 4), (2, 3), (3, 4), (12, 4), (13, 4), (13, 3), (14, 4)):
        im.set(x, y, SAND[4])
    for x in range(0, 4):
        im.set(x, 5, SAND[2])
    for x in range(12, 16):
        im.set(x, 5, SAND[2])
    # shading at the top of the shaft
    for y in range(9, 14):
        for x in range(4, 12):
            c = im.get(x, y)
            if c:
                im.set(x, y, mix(c, '#140a04', 0.55 - (y - 9) * 0.1))
    # a few root rungs
    for ry in (17, 25):
        for x in range(4, 12):
            im.set(x, ry, ROOT[2] if x % 3 else ROOT[3])
            im.set(x, ry + 1, ROOT[0])
    return im
