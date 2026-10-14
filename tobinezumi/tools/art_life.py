"""Ver.0.6「くらしの深まり＋公開準備」の素材：富山の季節の物と、季節の収集品のアイコン。

すべてコードで描く（乱数は固定シード → 何度実行しても同じ PNG）。輪郭は #2a1a10（ほかの素材と同じ）。
  tile.paddy_cut     16×16 × 2  秋の稲刈りのあとの田（刈り株）
  tile.hasa          40×32      はさ掛け（刈った稲を干す木の組み）
  tile.snow_lantern  16×24 × 3  雪の灯り（0 消えている・1/2 ろうそくがゆれる）
  tile.busstop       24×32 × 2  古いバス停（0 ふだん・1 冬：屋根に雪）
  item.curio.rice_ear / candle_stub   収集品のアイコン 16×16
ミミナガトビネズミ（近縁種）は絵を足さず、client/sprites.js が形質の描き分け（耳・鼻先・毛色）で作る。
"""
from __future__ import annotations

import math

from pixart import Img, PNoise, fbm, hx, mix
from art_regions import GOLD, WOOD, SNOW, WALL, METAL, _rg, OL, P

T = 16
STUB = ['#5e4426', '#76562e', '#8e6a38', '#a88244']


def paddy_cut(v):
    """秋：稲刈りのあとの田。乾いた土に刈り株の点々"""
    img = Img(T, T)
    n = [PNoise(4, 301 + v), PNoise(8, 303)]
    for y in range(T):
        for x in range(T):
            f = fbm(n, x, y, T)
            img.set(x, y, STUB[1] if f < 0.45 else STUB[2] if f < 0.7 else STUB[3])
    for y in range(1, T, 4):
        for x in range(T):
            if (x + v) % 3 == 0:
                img.set(x, y + 1, STUB[0])
    for r in range(4):
        for c in range(4):
            x, y = 1 + c * 4 + (r + v) % 2, 1 + r * 4
            P(img, x, y, GOLD[3]); P(img, x, y + 1, GOLD[2])
    return img


def hasa():
    """はさ掛け：3 本の杭と横木に、金色の稲束"""
    img = Img(40, 32)
    for px in (5, 20, 35):
        for y in range(6, 32):
            img.set(px, y, WOOD[1]); img.set(px + 1, y, WOOD[2])
    for x in range(2, 39):
        img.set(x, 8, WOOD[3]); img.set(x, 9, WOOD[2])
    for i, x in enumerate(range(3, 38, 3)):
        h = 11 + (i % 3)
        for y in range(10, 10 + h):
            c = GOLD[3] if y < 13 else GOLD[2] if (x + y) % 4 else GOLD[1]
            img.set(x, y, c); img.set(x + 1, y, GOLD[2] if y > 12 else GOLD[4])
        img.set(x, 10 + h, GOLD[1])
    img.outline()
    return img


def snow_lantern(frame):
    """雪の灯り：雪を固めた小さな灯籠。frame 0 消えている・1/2 ろうそくがゆれる"""
    img = Img(16, 24)
    for y in range(17, 24):
        for x in range(2, 14):
            d = ((x - 7.5) / 6) ** 2 + ((y - 21) / 3.2) ** 2
            if d < 1:
                img.set(x, y, SNOW[3] if d < 0.6 else SNOW[2])
    for y in range(9, 18):
        for x in range(3, 13):
            img.set(x, y, SNOW[4] if x < 10 else SNOW[3])
    for y in range(5, 10):
        w = 6 - abs(y - 7)
        for x in range(8 - w - 1, 8 + w + 1):
            img.set(x, y, SNOW[4] if y < 7 else SNOW[3])
    # 窓
    for y in range(11, 15):
        for x in range(6, 10):
            if frame == 0:
                img.set(x, y, '#7a8698')
            else:
                img.set(x, y, '#ffcf70' if (x + y + frame) % 3 else '#ffe9a8')
    if frame:
        P(img, 7 + (frame - 1), 12, '#fff6d0')
    img.outline()
    return img


def busstop(winter):
    """古いバス停：丸い標識・時刻表の板・小さなベンチ（冬は雪）"""
    img = Img(24, 32)
    for y in range(6, 32):
        img.set(11, y, METAL[2]); img.set(12, y, METAL[3])
    for y in range(0, 10):
        for x in range(7, 17):
            if (x - 11.5) ** 2 + (y - 4.5) ** 2 < 22:
                img.set(x, y, '#c84a3a')
    for y in range(3, 7):
        for x in range(9, 15):
            img.set(x, y, WALL[3])
    for y in range(12, 21):
        for x in range(13, 21):
            img.set(x, y, WALL[2] if (x + y) % 6 else WALL[1])
    for k in range(3):
        for x in range(14, 20):
            if (x + k) % 4:
                img.set(x, 14 + k * 2, '#8a8070')
    for x in range(1, 10):
        img.set(x, 26, WOOD[3]); img.set(x, 27, WOOD[2])
    for y in range(28, 32):
        img.set(2, y, WOOD[1]); img.set(8, y, WOOD[1])
    if winter:
        for x in range(6, 18):
            if (x - 11.5) ** 2 < 30:
                img.set(x, 0, SNOW[4]); img.set(x, 1, SNOW[3])
        for x in range(1, 10):
            img.set(x, 25, SNOW[4])
        for x in range(13, 21):
            img.set(x, 11, SNOW[4])
    img.outline()
    return img


def curio_icon(cid):
    rg = _rg()
    extra = []
    if cid == 'rice_ear':
        rg.capsule([(4, 15), (7, 9), (9, 4), (12, 1)], [0.6, 0.6, 0.5, 0.4], 'wood', group='stem')
        for i in range(6):
            t = i / 5
            x, y = 6 + t * 6, 11 - t * 9
            rg.ellipse(x + 1.6, y + 0.8, 1.6, 1.1, 'gold', ang=-30, group='g%d' % i)
        extra = [(10, 4, '#fff0a0'), (8, 7, '#fff0a0')]
    elif cid == 'candle_stub':
        rg.poly([(5, 15), (5, 8), (11, 8), (11, 15)], 'paper', value=0.75)
        rg.ellipse(8, 15, 5, 1.4, 'white', group='drip')
        rg.capsule([(8, 7), (8, 4)], [0.4, 0.4], 'black', group='wick')
        extra = [(8, 3, '#ffcf70'), (8, 2, '#fff0a0'), (7, 9, '#ffffff')]
    img = rg.resolve()
    for (x, y, c) in extra:
        img.set(x, y, c)
    return img


SEASON_CURIOS = ['rice_ear', 'candle_stub']


def build(B, strip):
    strip('tile.paddy_cut', 'regions/paddy_cut.png', [paddy_cut(v) for v in range(2)], {'note': 'autumn harvested paddy (toyama, west fields)'})
    strip('tile.hasa', 'regions/hasa.png', [hasa()], {'anchor': [20, 31]})
    strip('tile.snow_lantern', 'regions/snow_lantern.png', [snow_lantern(f) for f in range(3)], {'anchor': [8, 23], 'names': ['off', 'lit1', 'lit2']})
    strip('tile.busstop', 'regions/busstop.png', [busstop(False), busstop(True)], {'anchor': [12, 31], 'names': ['normal', 'winter']})
    for cid in SEASON_CURIOS:
        B.put('item.curio.%s.icon' % cid, 'items/curio_%s.png' % cid, curio_icon(cid), {'cell': [16, 16]})
    void = (math, hx, mix, OL)
    return void
