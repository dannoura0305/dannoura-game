"""地上フィールドのタイル・地形装飾・採集物

タイルは 16×16。すべて周期ノイズ（周期 16px）で描くので、同じ地形のタイル同士は
どのバリエーションを並べても継ぎ目が出ない。境界は「角 4 つの地形」から作る
16 パターンの重ね絵（上位の地形だけを描いた透過タイル）。
"""
from __future__ import annotations

import math
import random

from pixart import Img, Rig, PNoise, fbm, bayer, hx, mix, OUTLINE, bezier, grid

T = 16

# ------------------------------------------------------------------ palettes (dark -> light)
SAND = ['#80592f', '#a27546', '#c08f58', '#d4a46a', '#e2b77d', '#f0cf98']
DIRT = ['#5e3d26', '#74503a', '#8a6244', '#9f744f', '#b3865c', '#c69a6c']
GRASS = ['#3f4423', '#545b2c', '#6c7236', '#878b45', '#a3a254', '#c2b968']
DRYGRASS = ['#6b5a2c', '#8c7638', '#ad9446', '#c9ae5a', '#e0c67a']
WATER = ['#1d4363', '#24557c', '#2f6e9a', '#3f8ab5', '#5fa9c9', '#9fd3df']
FOAM = '#d8eef0'
ROCK = ['#4a3c33', '#665345', '#857059', '#a48d71', '#c2ab8c', '#dac7a8']
LEAF = ['#343a20', '#4b5329', '#646f34', '#7f8a42', '#9da656', '#bcc06e']
SAGE = ['#3c4a36', '#536448', '#6c7f5b', '#879a72', '#a6b68c']
BLOOM = ['#5e4672', '#7d5f92', '#a07fb0', '#c4a3c9']
BARK = ['#3b2818', '#523822', '#6e4d30', '#8c6744', '#a8835a']
SHADOW = (0x2a, 0x1a, 0x10)


def pick(pal, v):
    v = max(0.0, min(0.999, v))
    return hx(pal[int(v * len(pal))])


# ------------------------------------------------------------------ ground textures
def _noises(seed, periods=(2, 4, 8)):
    return [PNoise(p, seed * 31 + i) for i, p in enumerate(periods)]


GROUND = {}


def ground_fn(kind):
    """returns f(x, y, variant) -> colour; periodic in x,y with period 16 (tile)."""
    if kind in GROUND:
        return GROUND[kind]
    if kind == 'sand':
        n = _noises(11)
        n2 = _noises(12, (4, 8))

        def f(x, y, var=0):
            v = 0.5 + (fbm(n, x, y, T) - 0.5) * 0.6 + bayer(x, y) * 0.1 + (random.Random('sj%d,%d' % (x % T, y % T)).random() - 0.5) * 0.12
            r = random.Random('sand%d,%d,%d' % (x % T, y % T, var))
            if var == 1:  # wind ripples
                w = math.sin((x * 0.55 + y * 1.6) * 2 * math.pi / 8 + fbm(n2, x, y, T) * 3)
                v += 0.16 if w > 0.75 else (-0.14 if w < -0.85 else 0)
            col = pick(SAND[1:5], v)
            rr = r.random()
            if var == 2 and rr < 0.03:
                col = hx(SAND[1]) if rr < 0.015 else hx(SAND[4])
            elif rr < 0.01:
                col = hx(SAND[1])
            elif var == 3 and rr < 0.02:
                col = hx(SAND[4])
            return col
    elif kind == 'dirt':
        n = _noises(21)

        def f(x, y, var=0):
            v = 0.5 + (fbm(n, x, y, T) - 0.5) * 0.7 + bayer(x, y) * 0.18
            r = random.Random('dirt%d,%d,%d' % (x % T, y % T, var))
            col = pick(DIRT[1:5], v)
            rr = r.random()
            if rr < 0.03 + 0.02 * var:
                col = hx(DIRT[0])
            elif rr < 0.05 + 0.02 * var:
                col = hx(DIRT[5])
            return col
    elif kind == 'grass':
        n = _noises(31)
        n2 = _noises(32, (8,))

        def f(x, y, var=0):
            v = 0.5 + (fbm(n, x, y, T) - 0.5) * 0.6 + bayer(x, y) * 0.2
            r = random.Random('grass%d,%d,%d' % (x % T, y % T, var))
            # blades: vertical streaks
            s = (math.sin(x * 2.1 + fbm(n2, x, y, T) * 9) + 1) / 2
            v += (s - 0.5) * 0.25
            col = pick(GRASS[1:5], v)
            rr = r.random()
            if var == 1 and rr < 0.06:
                col = hx(DRYGRASS[3])
            elif var == 2 and rr < 0.05:
                col = hx(GRASS[5])
            elif var == 3 and rr < 0.05:
                col = hx(DRYGRASS[2]) if rr < 0.03 else hx('#d8c47a')
            elif rr < 0.02:
                col = hx(GRASS[0])
            return col
    elif kind == 'water':
        n = _noises(41, (2, 4))

        def f(x, y, var=0):
            ph = var * math.pi / 2
            v = 0.45 + (fbm(n, x, y, T) - 0.5) * 0.4 + bayer(x, y) * 0.08
            w = math.sin((y * 2 * math.pi / 8) + math.sin(x * 2 * math.pi / 16 + ph) * 1.2 + ph)
            g = math.sin(x * 2 * math.pi / 16 * 2 + y * 2 * math.pi / 16 + ph)
            if w > 0.9 and g > 0.1:
                v += 0.32
            elif w < -0.94 and g < 0:
                v -= 0.1
            return pick(WATER[1:6], v)
    else:
        raise KeyError(kind)
    GROUND[kind] = f
    return f


def ground_tile(kind, var=0, frame=None):
    f = ground_fn(kind)
    im = Img(T, T)
    for y in range(T):
        for x in range(T):
            im.set(x, y, f(x, y, var if frame is None else frame))
    return im


# ------------------------------------------------------------------ corner transitions
# bit layout of the 16 patterns: TL=1, TR=2, BR=4, BL=8 (bit set = corner is the UPPER terrain)
EDGE_NOISE = PNoise(4, 99)


def corner_mask(bits, x, y, wob=0.34):
    tl, tr, br, bl = [(bits >> i) & 1 for i in range(4)]
    u, v = (x + 0.5) / T, (y + 0.5) / T
    m = (tl * (1 - u) * (1 - v) + tr * u * (1 - v) + br * u * v + bl * (1 - u) * v)
    return m + (EDGE_NOISE(x * 4 / T, y * 4 / T) - 0.5) * wob


def transition(upper, lower, style):
    """16 overlay tiles (upper terrain drawn over `lower`), returned as list."""
    fu = ground_fn(upper)
    out = []
    for bits in range(16):
        im = Img(T, T)
        for y in range(T):
            for x in range(T):
                m = corner_mask(bits, x, y)
                if m >= 0.5:
                    c = fu(x, y, 0)
                    if style == 'grass' and m < 0.58:
                        c = hx(GRASS[1]) if (x + y) % 2 else hx(GRASS[2])
                    if style == 'dirt' and m < 0.56:
                        c = hx(DIRT[2])
                    im.set(x, y, c)
                elif style == 'grass' and m >= 0.40:
                    # grass blades poking out over the lower terrain
                    if (x * 7 + y * 3) % 5 == 0 and m >= 0.44:
                        im.set(x, y, GRASS[2])
                    elif m >= 0.46 and (x * 5 + y) % 3 == 0:
                        im.set(x, y, GRASS[3])
                elif style in ('dirt', 'sandgrass') and 0.42 <= m < 0.5:
                    im.px[y * T + x] = SHADOW + (46,)
        out.append(im)
    return out


def water_edges(frames=4):
    rows = []
    for fr in range(frames):
        fw = ground_fn('water')
        row = []
        for bits in range(16):
            im = Img(T, T)
            for y in range(T):
                for x in range(T):
                    m = corner_mask(bits, x, y, wob=0.26)
                    if m >= 0.56:
                        c = fw(x, y, fr)
                        if m < 0.64:
                            c = hx(WATER[2])
                        im.set(x, y, c)
                    elif m >= 0.5:
                        # foam line, animated by frame
                        im.set(x, y, FOAM if (x + y + fr) % 4 != 0 else WATER[4])
                    elif m >= 0.38:
                        im.px[y * T + x] = (0x6a, 0x48, 0x28, 110)  # wet sand
            row.append(im)
        rows.append(row)
    return rows


# ------------------------------------------------------------------ decor helpers
def soft_shadow(img, cx, cy, rx, ry, alpha=90):
    """Paint a translucent oval shadow into empty pixels of img."""
    for y in range(img.h):
        for x in range(img.w):
            d = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            if d <= 1 and img.get(x, y) is None:
                img.px[y * img.w + x] = SHADOW + (alpha if d < 0.6 else alpha * 2 // 3,)


def with_shadow(rig_img, w, h, cx, cy, rx, ry, alpha=90):
    base = Img(w, h)
    soft_shadow(base, cx, cy, rx, ry, alpha)
    base.paste(rig_img, 0, 0, alpha_over=False)
    return base


def rock(size, seed):
    r = random.Random(seed)
    W = size
    rg = Rig(W, W, {'rock': [hx(c) for c in ROCK], 'moss': [hx(c) for c in GRASS[1:5]]}, ambient=0.1)
    if size == 32:
        blobs = [(15, 19, 11, 8, -8), (20, 15, 7, 6, 10), (10, 18, 6, 6, 0)]
        if seed % 2:
            blobs = [(16, 18, 12, 9, 4), (11, 13, 6, 5, -20), (22, 21, 6, 5, 0)]
    else:
        blobs = [(8, 9.5, 6, 4.6, -6)] if seed % 2 == 0 else [(7.5, 9, 5, 4.4, 10), (11, 10.5, 3.2, 3, 0)]
    pids = []
    for (cx, cy, rx, ry, a) in blobs:
        pids.append(rg.ellipse(cx, cy, rx, ry, 'rock', ang=a, group='rock', dither=0.14, bulge=0.9))
    # flat-ish bottom cut
    base_y = max(cy + ry * 0.8 for (cx, cy, rx, ry, a) in blobs)
    for y in range(int(base_y) + 1, W):
        for x in range(W):
            rg.erase(x, y)
    img = rg.resolve(lines=False)
    # cracks & highlights
    if size == 32:
        cr = [(12, 13), (13, 14), (13, 15), (14, 16), (15, 16), (16, 17)] if seed % 2 == 0 else \
            [(18, 12), (18, 13), (17, 14), (17, 15), (16, 16), (21, 18), (22, 19)]
        for (x, y) in cr:
            if img.get(x, y) and img.get(x, y) != hx(OUTLINE):
                img.set(x, y, ROCK[1])
                if img.get(x - 1, y - 1) and img.get(x - 1, y - 1) != hx(OUTLINE):
                    img.set(x - 1, y - 1, ROCK[4])
        # a little moss / lichen at the base
        for x in range(W):
            for y in range(W - 1, 0, -1):
                c = img.get(x, y)
                if c and c != hx(OUTLINE):
                    if r.random() < 0.35:
                        img.set(x, y, GRASS[2] if r.random() < 0.6 else GRASS[3])
                    break
    gy = int(base_y)
    return with_shadow(img, W, W, W / 2 + 1, gy + 0.5, W * 0.42, 2.6 if W == 32 else 1.8)


def pebbles(seed):
    r = random.Random(seed * 5 + 1)
    rg = Rig(T, T, {'rock': [hx(c) for c in ROCK]}, ambient=0.15)
    spots = [[(5, 10, 2.0), (10, 8, 1.4), (11.5, 12, 1.2)],
             [(7, 7, 1.3), (4, 11, 1.2), (11, 11, 2.0), (13, 6, 1.0)],
             [(8, 9, 2.4), (4, 6, 1.1)]][seed % 3]
    for (x, y, s_) in spots:
        rg.ellipse(x, y, s_ * 1.2, s_, 'rock', group='p%d%d' % (x, y), shift=r.uniform(-0.1, 0.1))
    img = rg.resolve(lines=False)
    out = Img(T, T)
    for (x, y, s_) in spots:
        soft_shadow(out, x + 0.5, y + s_ + 0.6, s_ * 1.3, 0.9, 70)
    out.paste(img, 0, 0, alpha_over=False)
    return out


def grass_tuft(seed):
    r = random.Random(seed + 7)
    img = Img(T, T)
    base_x = 8
    pal = [GRASS[1], GRASS[2], GRASS[3], GRASS[4], DRYGRASS[3]]
    for i in range(7 + seed % 3):
        x0 = base_x + r.randint(-4, 4)
        h = r.randint(5, 10)
        lean = r.uniform(-0.5, 0.5)
        col = pal[r.randint(0, 4)]
        for k in range(h):
            x = round(x0 + lean * k)
            img.set(x, 14 - k, col)
    soft_shadow(img, 8, 14.5, 5, 1.5, 70)
    img.outline()
    return img


def leaf_cluster(rig, cx, cy, rx, ry, mat, n, seed, size=(1.6, 2.6), shift=0.0):
    r = random.Random(seed)
    ids = []
    for i in range(n):
        a = r.random() * math.tau
        d = math.sqrt(r.random())
        x = cx + math.cos(a) * rx * d
        y = cy + math.sin(a) * ry * d
        s = r.uniform(*size)
        ids.append(rig.ellipse(x, y, s, s * 0.85, mat, group='leaf', dither=0.15,
                               shift=shift + (cy - y) / (ry * 6)))
    return ids


def shrub(kind):
    W = 32
    ramps = {'leaf': [hx(c) for c in LEAF], 'sage': [hx(c) for c in SAGE], 'bloom': [hx(c) for c in BLOOM],
             'dry': [hx(c) for c in DRYGRASS], 'bark': [hx(c) for c in BARK]}
    rg = Rig(W, W, ramps, ambient=0.15)
    if kind == 0:  # round olive desert bush
        for (x0, y0, x1, y1) in ((16, 28, 11, 22), (16, 28, 21, 22), (16, 28, 16, 21)):
            rg.capsule([(x0, y0), (x1, y1)], [1.0, 0.6], 'bark', group='bark')
        leaf_cluster(rg, 10, 21, 6, 4, 'leaf', 26, 3)
        leaf_cluster(rg, 22, 21, 6, 4, 'leaf', 26, 4)
        leaf_cluster(rg, 16, 17, 9, 5, 'leaf', 40, 5)
    elif kind == 1:  # sage bush with lavender blooms
        leaf_cluster(rg, 16, 20, 11, 6, 'sage', 60, 5, size=(1.4, 2.2))
        r = random.Random(9)
        for i in range(12):
            x = 16 + r.uniform(-9, 9)
            y = 18 + r.uniform(-7, 2)
            rg.capsule([(x, y + 3), (x, y)], [0.5, 0.5], 'sage', group='stem', line=False)
            rg.ellipse(x, y - 0.5, 1.0, 1.5, 'bloom', group='bloom', line=False)
    else:  # spiky dry grass clump
        r = random.Random(13)
        for i in range(26):
            x0 = 16 + r.uniform(-5, 5)
            ang = r.uniform(-60, 60)
            h = r.uniform(9, 17) * (1 - abs(ang) / 160)
            a = math.radians(ang)
            pts = bezier((x0, 28), (x0 + math.sin(a) * h * 0.4, 28 - h * 0.6),
                         (x0 + math.sin(a) * h, 28 - math.cos(a) * h), n=6)
            rg.capsule(pts, [0.9, 0.5], 'dry' if i % 3 else 'leaf', group='blade%d' % (i % 4), line=False,
                       shift=r.uniform(-0.2, 0.2))
    img = rg.resolve(lines=(kind != 2))
    out = with_shadow(img, W, W, 16.5, 28.0, 11, 3, 80)
    return out


def tree():
    W, H = 48, 64
    ramps = {'leaf': [hx(c) for c in LEAF], 'bark': [hx(c) for c in BARK]}
    rg = Rig(W, H, ramps, ambient=0.12)
    trunk = [(24, 62), (23.5, 52), (22, 44), (20, 36)]
    rg.capsule(trunk, [2.8, 2.3, 2.0, 1.6], 'bark', group='bark', dither=0.1)
    for br in ([(22, 44), (14, 34), (8, 28)], [(23, 47), (32, 36), (40, 30)], [(21, 38), (26, 28), (30, 22)],
               [(20, 36), (16, 26), (14, 20)]):
        rg.capsule(br, [1.4, 1.0, 0.7], 'bark', group='bark')
    # flat-topped canopy layers (acacia-like)
    leaf_cluster(rg, 12, 24, 9, 4.5, 'leaf', 40, 21, shift=-0.05)
    leaf_cluster(rg, 37, 25, 9, 4.5, 'leaf', 40, 22, shift=-0.05)
    leaf_cluster(rg, 24, 16, 15, 6, 'leaf', 80, 23)
    leaf_cluster(rg, 22, 9, 9, 3.5, 'leaf', 30, 24, shift=0.08)
    img = rg.resolve(lines=True, line_mat_drop=1)
    out = Img(W, H)
    soft_shadow(out, 25, 61, 14, 3, 80)
    out.paste(img, 0, 0, alpha_over=False)
    return out


def burrow_entrance(own):
    W, H = 24, 16
    rg = Rig(W, H, {'sand': [hx(c) for c in SAND[1:]], 'hole': [hx('#1a100a'), hx('#2a1a10'), hx('#3d2817'),
                                                                    hx('#523621')]}, ambient=0.18)
    rg.ellipse(12, 9.5, 10.5, 5.4, 'sand', group='mound', dither=0.18, bulge=0.8)
    rg.ellipse(12, 9.4, 5.6, 3.6, 'hole', group='hole', flat=0.0, shift=-0.0, line=False)
    rg.ellipse(12.4, 10.2, 4.2, 2.6, 'hole', group='hole', line=False, shift=-0.5)
    img = rg.resolve(lines=False)
    # rim highlight on the lower lip
    for x in range(8, 17):
        y = 13 if 9 <= x <= 15 else 12
        if img.get(x, y) and img.get(x, y) != hx(OUTLINE):
            img.set(x, y, SAND[5])
    # scattered dug sand
    for (x, y) in ((2, 13), (21, 12), (4, 6), (19, 6)):
        if img.get(x, y) is None:
            img.set(x, y, SAND[3])
    if own:
        # ring of pale pebbles + a dried flower stalk = "my home"
        for (x, y) in ((5, 11), (7, 13), (17, 13), (19, 11), (12, 14)):
            img.set(x, y, ROCK[5])
            img.set(x, y + 1, ROCK[2]) if img.get(x, y + 1) else None
        for k in range(6):
            img.set(20, 9 - k, DRYGRASS[1])
        img.set(19, 3, BLOOM[3])
        img.set(21, 3, BLOOM[3])
        img.set(20, 2, BLOOM[2])
        img.set(20, 3, '#f0d070')
    out = Img(W, H)
    soft_shadow(out, 12, 11.5, 11, 4, 60)
    out.paste(img, 0, 0, alpha_over=False)
    return out


# ------------------------------------------------------------------ items
SEED_PAL = ['#2e2018', '#463226', '#5e4434', '#7a5a44', '#c99a52', '#e6c07a']
STONE_PAL = ['#3e352f', '#5b4f45', '#7a6c5e', '#9a8a78', '#bcac96', '#d8ccb6']


SEED_LEG = {'o': OUTLINE, 'a': SEED_PAL[0], 'b': SEED_PAL[1], 'c': SEED_PAL[2], 'd': SEED_PAL[3],
            's': '#e8d6a8', 'S': '#bfa77a'}
SEED_ICON = [
    "................",
    "................",
    ".........oo.....",
    "..oo....ocdo....",
    ".ocdo..ocsdbo...",
    "ocsdbo.ocdsbo...",
    "odsdbo.obsdbo...",
    "obdsbo.obdsao...",
    "obsdao..obao....",
    ".obao.oooao.....",
    "..oo.ocdsdo.....",
    "....ocdsdsbo....",
    "....obsdsdao....",
    ".....obdsao.....",
    "......oooo......",
    "................",
]
SEED_GROUND = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "........oo......",
    "...oo..ocdo.....",
    "..ocdo.odsbo....",
    "..odsboobsao....",
    "..obsdooooo.....",
    "...oooocdsbo....",
    ".....obsdsao....",
    "......ooooo.....",
    "................",
]


def item_icon(name, k=1.0, oy=0.0):
    """k = scale around the centre (ground versions are drawn smaller)."""
    def P(x, y):
        return (8 + (x - 8) * k, 8 + (y - 8) * k + oy)
    rg = Rig(16, 16, {'seed': [hx(c) for c in SEED_PAL], 'stone': [hx(c) for c in STONE_PAL],
                      'grass': [hx(c) for c in GRASS], 'dry': [hx(c) for c in DRYGRASS]}, ambient=0.15)
    hi = []
    if name == 'seed':
        # three striped seeds, hand-placed (scaled by k for the ground version)
        rows = SEED_ICON if k >= 0.95 else SEED_GROUND
        return grid(rows, SEED_LEG, 16, 16)
    elif name == 'pebble':
        x, y = P(8, 9)
        rg.ellipse(x, y, 5.4 * k, 4.2 * k, 'stone', ang=-12, dither=0.15)
        hi += [(round(x - 2 * k), round(y - 2 * k), STONE_PAL[5]), (round(x - 1 * k), round(y - 2 * k), STONE_PAL[5])]
    else:  # grass bundle tied with a dry stalk
        r = random.Random(4)
        for i in range(9):
            x0 = 8 + r.uniform(-1.5, 1.5)
            ang = (i - 4) * 9
            a = math.radians(ang)
            pts = [P(x0, 14), P(x0 + math.sin(a) * 6, 14 - math.cos(a) * 6),
                   P(x0 + math.sin(a) * 11, 14 - math.cos(a) * 12)]
            rg.capsule(pts, [0.9, 0.7 * max(k, 0.8), 0.4], 'grass', group='b%d' % (i % 3), line=False,
                       shift=r.uniform(-0.1, 0.2))
        rg.capsule([P(5.5, 10.5), P(10.5, 10.5)], 0.8, 'dry', group='tie')
    img = rg.resolve()
    for (x, y, c) in hi:
        if img.get(x, y) and img.get(x, y)[:3] != hx(OUTLINE)[:3]:
            img.set(x, y, c)
    if name == 'seed':
        # the cluster sits on dark seed coats: darken non-stripe body a bit
        pass
    return img


def item_ground(name):
    """Smaller version lying on the ground, with a contact shadow (16×16 cell)."""
    icon = item_icon(name, k=0.72, oy=2.2)
    out = Img(16, 16)
    soft_shadow(out, 8, 13.6, 5, 1.6, 80)
    out.paste(icon, 0, 0, alpha_over=False)
    return out
