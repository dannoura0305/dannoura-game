"""Ver.0.8「季節のたのしみ」の素材：季節の行事の印と、行事の品のアイコン。

すべてコードで描く（乱数は使わない → 何度実行しても同じ PNG）。輪郭は #2a1a10（ほかの素材と同じ）。
  tile.fest_flower    16×16 × 4  花の種まきの花（3 輪の小さな株。0 桃・1 黄・2 青・3 白）
  tile.fest_lantern   12×20 × 3  灯りの夜の小さな灯り（0 消えている・1/2 ともっている）
  tile.fest_offering  28×16 × 4  月見の種の山（平らな石の上・大きさ 1〜4）
  tile.fest_rice      16×10      富山：平らな石の上の米つぶ（行事の夜だけ）
  item.curio.pressed_flower / star_sand / moon_seed / little_lantern   行事の品のアイコン 16×16
"""
from __future__ import annotations

from pixart import Img
from art_regions import GOLD, WOOD, SNOW, P, _rg, LUSH, PINK

PETALS = [
    ['#c86a8c', '#e890aa', '#f6b8c8', '#ffe0ea'],
    ['#b88a20', '#e0b838', '#f6d46a', '#fff0a8'],
    ['#4a6aa8', '#6e90d0', '#a8c4f4', '#d8e6ff'],
    ['#9aa8bc', '#d4dce8', '#f2f2f6', '#ffffff'],
]
STONE = ['#5e5a52', '#7a766c', '#9a9488', '#b8b2a4']


def fest_flower(v):
    """花の種まきの花：3 本の茎と 3 輪の花（足元は 下の真ん中）"""
    img = Img(16, 16)
    pet = PETALS[v % 4]
    stems = [(4, 10, 15), (8, 6, 15), (12, 11, 15)]
    for (x, y0, y1) in stems:
        for y in range(y0, y1):
            img.set(x, y, LUSH[3] if y % 3 else LUSH[2])
    for (x, y) in [(5, 13), (9, 12), (11, 14), (6, 11)]:
        img.set(x, y, LUSH[4])
    for (cx, cy) in [(4, 9), (8, 5), (12, 10)]:
        for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            img.set(cx + dx, cy + dy, pet[2])
        for (dx, dy) in [(-1, -1), (1, 1)]:
            img.set(cx + dx, cy + dy, pet[1])
        img.set(cx, cy, GOLD[3])
        img.set(cx - 1, cy - 1, pet[3]) if v != 3 else None
    img.outline()
    return img


def fest_lantern(frame):
    """灯りの夜の小さな灯り：細い棒と、草で編んだ笠の小さな灯り。frame 0 消えている・1/2 ゆれる"""
    img = Img(12, 20)
    for y in range(8, 20):
        img.set(6, y, WOOD[2] if y % 2 else WOOD[1])
    for x in range(2, 11):
        img.set(x, 3, GOLD[2]); img.set(x, 4, GOLD[1] if x % 2 else GOLD[2])
    for x in range(3, 10):
        img.set(x, 2, GOLD[3])
    for y in range(5, 11):
        for x in range(3, 10):
            if frame == 0:
                img.set(x, y, '#d8c8a0' if (x + y) % 3 else '#c4b48a')
            else:
                img.set(x, y, '#ffcf70' if (x + y + frame) % 3 else '#ffe9a8')
    for x in range(3, 10):
        img.set(x, 11, WOOD[3])
    if frame:
        img.set(6, 7 + (frame - 1), '#fff6d0'); img.set(6, 8, '#fffbe8')
    img.outline()
    return img


def fest_offering(size):
    """月見の種の山（平らな石の上）。size 1..4"""
    img = Img(28, 16)
    for y in range(10, 16):
        for x in range(1, 27):
            d = ((x - 13.5) / 12.5) ** 2 + ((y - 13) / 2.8) ** 2
            if d < 1:
                img.set(x, y, STONE[3] if y < 12 else STONE[2] if d < 0.7 else STONE[1])
    r = [0, 3.5, 5, 6.5, 8][size]
    seed_c = ['#c8b07a', '#e0cc96', '#f2e4bc', '#fffaf0']
    for y in range(0, 13):
        for x in range(0, 28):
            d = ((x - 13.5) / (r + 1.5)) ** 2 + ((y - 11.5) / (r * 0.85)) ** 2
            if d < 1 and y <= 11:
                k = (x * 7 + y * 13) % 5
                img.set(x, y, seed_c[3] if k == 0 else seed_c[2] if k < 3 else seed_c[1])
    img.outline()
    return img


def fest_rice():
    """富山：平らな石の上の 米つぶ"""
    img = Img(16, 10)
    for y in range(4, 10):
        for x in range(1, 15):
            d = ((x - 7.5) / 7) ** 2 + ((y - 7) / 2.6) ** 2
            if d < 1:
                img.set(x, y, STONE[3] if y < 6 else STONE[2])
    for (x, y) in [(5, 4), (7, 3), (8, 4), (9, 3), (10, 4), (6, 5), (8, 5), (7, 4)]:
        img.set(x, y, SNOW[4] if (x + y) % 2 else SNOW[3])
    img.outline()
    return img


def curio_icon(cid):
    rg = _rg()
    extra = []
    if cid == 'pressed_flower':
        rg.poly([(2, 2), (14, 2), (14, 14), (2, 14)], 'paper', value=0.8)
        rg.capsule([(8, 13), (8, 7)], [0.4, 0.4], 'leaf', group='stem')
        for (dx, dy) in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            rg.ellipse(8 + dx, 6 + dy, 1.6, 1.6, 'pink', group='p%d%d' % (dx, dy))
        extra = [(8, 6, '#f0cc5c'), (6, 11, '#699c42'), (10, 10, '#699c42')]
    elif cid == 'star_sand':
        rg.ellipse(8, 11, 5.5, 3, 'blue', group='bottle')
        rg.ellipse(8, 9.5, 4.5, 2, 'white', group='sand')
        extra = [(6, 9, '#fff0a0'), (9, 10, '#ffffff'), (10, 8, '#fff0a0'), (5, 4, '#fff6c8'), (11, 3, '#ffffff'), (8, 2, '#fff0a0')]
    elif cid == 'moon_seed':
        rg.ellipse(8, 9, 4.5, 4, 'white', group='seed')
        extra = [(7, 7, '#ffffff'), (6, 8, '#ffffff'), (12, 3, '#fff0a0'), (13, 4, '#f0cc5c')]
    elif cid == 'little_lantern':
        rg.capsule([(8, 15), (8, 10)], [0.5, 0.5], 'wood', group='pole')
        rg.poly([(4, 4), (12, 4), (11, 10), (5, 10)], 'paper', value=0.9)
        rg.poly([(3, 3), (13, 3), (13, 4), (3, 4)], 'gold', value=0.6)
        extra = [(8, 6, '#ffcf70'), (8, 7, '#fff0a0'), (7, 7, '#ffcf70'), (9, 8, '#ffcf70')]
    img = rg.resolve()
    for (x, y, c) in extra:
        img.set(x, y, c)
    return img


FEST_CURIOS = ['pressed_flower', 'star_sand', 'moon_seed', 'little_lantern']


def build(B, strip):
    strip('tile.fest_flower', 'fest/flower.png', [fest_flower(v) for v in range(4)], {'anchor': [8, 15], 'names': ['pink', 'yellow', 'blue', 'white']})
    strip('tile.fest_lantern', 'fest/lantern.png', [fest_lantern(f) for f in range(3)], {'anchor': [6, 19], 'names': ['off', 'lit1', 'lit2']})
    strip('tile.fest_offering', 'fest/offering.png', [fest_offering(s) for s in range(1, 5)], {'anchor': [14, 15], 'note': 'moon-viewing seed pile, size 1..4'})
    strip('tile.fest_rice', 'fest/rice.png', [fest_rice()], {'anchor': [8, 9], 'note': 'toyama: rice grains on a flat stone (festival night only)'})
    for cid in FEST_CURIOS:
        B.put('item.curio.%s.icon' % cid, 'items/curio_%s.png' % cid, curio_icon(cid), {'cell': [16, 16]})
    return (P, SNOW, PINK)
