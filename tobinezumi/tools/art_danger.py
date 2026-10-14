"""Ver.0.3「危険と土地」の素材：捕食者（フクロウ・キツネ・ヘビ）・水たまり・希少資源・入口のふさぎ・土地の目印・「！」

すべて Rig（部位を重ねて陰影をつけ、固定パレットへ）で描く。どれも右向き（左向きはゲームが反転）。
"""
from __future__ import annotations

import math
import random

from pixart import Rig, Img, hx, bezier, OUTLINE

FOX = ['#5a2410', '#8a3a18', '#b85a24', '#d87a34', '#ec9c52']
FOX_W = ['#b8a894', '#dcd0bc', '#f4ecdc']
FOX_DARK = ['#1c120c', '#2e2016', '#45301e']
OWL = ['#3e2c1e', '#5c4430', '#7e6248', '#a08262', '#c0a47e']
OWL_L = ['#a89070', '#cbb48e', '#e6d4b0']
OWL_FACE = ['#c8b290', '#e2d0ae', '#f4e8cc']
SNAKE = ['#3a3418', '#585224', '#7a7234', '#9c9448', '#bcb460']
SNAKE_B = ['#9a8a5a', '#c4b27a', '#e0d09a']
SNAKE_PAT = ['#2c2412', '#4a3a1c']
WATER = ['#24557c', '#2f6e9a', '#3f8ab5', '#5fa9c9', '#9fd3df']
SEEDR = ['#5a2c4a', '#8a3e68', '#b8628a', '#e08eb0', '#f6c4d6']
GEM = ['#1e4a5a', '#2c7088', '#46a0b4', '#7ccede', '#c8f2f4']
STONE = ['#5a5048', '#7a6e62', '#a09080', '#c4b4a0', '#e2d6c4']
CLOTH = ['#7a1e18', '#b0322a', '#e05040']
WOOD = ['#4a3020', '#6e4a30', '#94704a']
EYE = '#140c08'
EYE_Y = '#f0c020'


def R(ramp):
    return [hx(c) for c in ramp]


# ------------------------------------------------------------------ fox (32×24, faces right)
def fox_frame(pose):
    """pose: ('run', k 0..3) / ('idle', 0) / ('dig', k 0..1) / ('alert', 0)"""
    kind, k = pose
    rg = Rig(32, 24, {'fur': R(FOX), 'white': R(FOX_W), 'dark': R(FOX_DARK)}, ambient=0.16)
    ph = k / 4 * math.pi * 2
    bob = math.sin(ph * 2) * 0.8 if kind == 'run' else 0
    lean = 0
    if kind == 'dig':
        lean = 2.5
    by = 13 + bob + lean * 0.4
    # tail (big, white tip)
    sw = math.sin(ph) * 2 if kind == 'run' else (1.5 if kind == 'alert' else 0)
    tail = [(9, by - 1), (5, by - 2 - sw * 0.5), (2.5, by - 4 + sw)]
    if kind == 'dig':
        tail = [(9, by - 2), (6, by - 6), (4, by - 9)]
    rg.capsule(tail, [2.6, 3.0, 2.2], 'fur', group='tail', dither=0.1)
    tx, ty = tail[-1]
    rg.ellipse(tx - 0.3, ty, 1.8, 1.8, 'white', group='tail')
    # far legs
    def leg(x0, y0, a, length=6.5, mat='dark', shift=-0.25, g='farleg'):
        x1 = x0 + math.sin(a) * length
        y1 = y0 + math.cos(a) * length
        rg.capsule([(x0, y0), (x1, y1)], [1.2, 0.8], mat, shift=shift, group=g)
        return x1, y1
    if kind == 'run':
        leg(12, by + 2, -math.sin(ph + math.pi) * 0.7)
        leg(21, by + 2, math.sin(ph + math.pi) * 0.7)
    elif kind == 'dig':
        leg(12, by + 2, 0.1)
        leg(22, by + 1, 0.7 + 0.5 * math.sin(k * math.pi), 5.5)
    else:
        leg(12, by + 2, 0.05)
        leg(21, by + 2, -0.05)
    # body
    body = rg.ellipse(16.5, by, 7.5, 3.6, 'fur', ang=-lean * 3, group='body', dither=0.08)
    rg.ellipse(17, by + 2.0, 6, 1.6, 'white', group='body', clip=body)
    # near legs
    if kind == 'run':
        leg(13, by + 2, math.sin(ph) * 0.8, mat='fur', shift=0, g='leg')
        leg(20, by + 2, -math.sin(ph) * 0.8, mat='fur', shift=0, g='leg')
    elif kind == 'dig':
        leg(13, by + 2, 0.15, mat='fur', shift=0, g='leg')
        leg(22, by + 1.5, 1.1 - 0.5 * math.sin(k * math.pi), 5.5, mat='fur', shift=0, g='leg')
    else:
        leg(13, by + 2, 0, mat='fur', shift=0, g='leg')
        leg(20, by + 2, 0, mat='fur', shift=0, g='leg')
    # head
    hxc, hyc = (24.5, by - 3.5) if kind != 'dig' else (25, by + 1.5)
    if kind == 'alert':
        hyc -= 1.5
    head = rg.ellipse(hxc, hyc, 3.6, 3.0, 'fur', group='head', dither=0.06)
    rg.capsule([(hxc + 1.5, hyc + 0.8), (hxc + 5.6, hyc + 1.6)], [1.9, 1.0], 'fur', group='head')
    rg.ellipse(hxc + 2.2, hyc + 2.0, 2.6, 1.0, 'white', group='head', clip=head)
    # ears
    for dx, sh in ((-1.6, -0.25), (0.6, 0.0)):
        ex, ey = hxc + dx, hyc - 2.4
        rg.poly([(ex - 1.4, ey + 0.8), (ex + 0.2, ey - 3.6), (ex + 1.6, ey + 0.6)], 'fur', value=0.7, shift=sh, group='ear%d' % int(dx))
        rg.dot(round(ex + 0.1), round(ey - 2), FOX_DARK[1])
    img = rg.resolve()
    img.set(round(hxc + 6.4), round(hyc + 1.4), hx(EYE))
    ex_, ey_ = round(hxc + 1.6), round(hyc - 0.6)
    img.set(ex_, ey_, hx(EYE))
    if kind == 'alert':
        img.set(ex_, ey_ - 1, hx('#fff2c0'))
    return img


def fox_sheet():
    frames = [fox_frame(('run', k)) for k in range(4)] + [fox_frame(('idle', 0)), fox_frame(('alert', 0))] + [fox_frame(('dig', k)) for k in range(2)]
    return frames


# ------------------------------------------------------------------ owl (32×32, faces right, seen from a little above)
def owl_frame(pose):
    kind, k = pose
    rg = Rig(32, 32, {'f': R(OWL), 'l': R(OWL_L), 'face': R(OWL_FACE)}, ambient=0.18)
    cx, cy = 16, 16
    if kind == 'fly':
        up = k == 0
        for side in (-1, 1):
            pts = [(cx + side * 3, cy - 1), (cx + side * 9, cy - (6 if up else -2)), (cx + side * 14, cy - (8 if up else -5))]
            rg.capsule(pts, [3.2, 2.6, 1.2], 'f', group='wing%d' % side, dither=0.12, shift=-0.05 if side < 0 else 0)
            for j in range(3):
                fx = cx + side * (8 + j * 2.2)
                fy = cy - (5 if up else -1) - j * (1.2 if up else -1.0)
                rg.capsule([(fx, fy), (fx + side * 1.2, fy + 3)], [0.8, 0.4], 'l', group='wing%d' % side, line=False)
    elif kind == 'dive':
        for side in (-1, 1):
            rg.capsule([(cx + side * 2.5, cy - 2), (cx + side * 4.5, cy + 6), (cx + side * 3, cy + 11)], [2.6, 2.2, 1.0], 'f', group='wing%d' % side, dither=0.1)
    body = rg.ellipse(cx, cy + 1.5, 4.6, 5.8, 'f', group='body', dither=0.1)
    rg.ellipse(cx + 0.4, cy + 3, 3.2, 4.0, 'l', group='body', clip=body, dither=0.18)
    head = rg.ellipse(cx + 0.6, cy - 5, 4.4, 3.8, 'f', group='head', dither=0.06)
    rg.ellipse(cx + 1.2, cy - 4.6, 3.4, 2.8, 'face', group='head', clip=head)
    # ear tufts
    for dx in (-2.8, 3.6):
        rg.poly([(cx + dx - 1, cy - 7.5), (cx + dx + 0.2, cy - 11), (cx + dx + 1.2, cy - 7.5)], 'f', value=0.5, group='tuft%d' % int(dx))
    # talons (dive)
    if kind == 'dive':
        for dx in (-1.5, 1.5):
            rg.capsule([(cx + dx, cy + 6), (cx + dx + 0.5, cy + 9.5)], [0.9, 0.6], 'l', group='talon', shift=-0.3)
    img = rg.resolve()
    for ex in (-0.6, 2.6):
        x, y = round(cx + ex), round(cy - 5)
        img.set(x, y, hx(EYE_Y))
        img.set(x, y + 1, hx(EYE))
    img.set(round(cx + 1), round(cy - 3), hx('#8a6a3a'))
    return img


def owl_sheet():
    return [owl_frame(('fly', 0)), owl_frame(('fly', 1)), owl_frame(('dive', 0))]


# ------------------------------------------------------------------ snake (32×16, faces right)
def snake_frame(pose):
    kind, k = pose
    rg = Rig(32, 16, {'s': R(SNAKE), 'b': R(SNAKE_B)}, ambient=0.16)
    if kind in ('coil', 'rattle'):
        # coiled body (two loops) with raised head
        rg.ellipse(14, 11, 8, 3.4, 's', group='coil1', dither=0.1)
        rg.ellipse(14, 9.5, 5.6, 2.6, 's', group='coil2', shift=0.05, dither=0.1)
        tail = [(6, 12), (3, 12.5), (1.5, 11.5)]
        if kind == 'rattle':
            tail = [(6, 12), (3.5, 10.5), (2.5, 8.0 + (k % 2))]
        rg.capsule(tail, [1.6, 1.1, 0.6], 's', group='tail')
        neck = [(17, 9), (19.5, 6.5), (21.5, 5.2 - (1 if kind == 'rattle' else 0))]
        rg.capsule(neck, [1.7, 1.5, 1.4], 's', group='neck')
        hx_, hy_ = 23, 4.8 - (1 if kind == 'rattle' else 0)
    else:  # lunge: stretched out
        pts = [(2, 12), (8, 13), (14, 11), (20, 9), (25, 7.5)]
        rg.capsule(pts, [1.2, 1.7, 1.9, 1.8, 1.6], 's', group='body', dither=0.1)
        hx_, hy_ = 27, 7
    head = rg.ellipse(hx_, hy_, 2.6, 1.8, 's', group='head', ang=-10)
    rg.ellipse(hx_ + 0.4, hy_ + 1.0, 2.0, 0.8, 'b', group='head', clip=head)
    img = rg.resolve()
    # 模様（菱形の点）
    rnd = random.Random(3 + (0 if kind == 'lunge' else 1))
    for i in range(14):
        x, y = rnd.randint(3, 24), rnd.randint(5, 13)
        c = img.get(x, y)
        if c and c[:3] != hx(OUTLINE)[:3] and c[:3] in [hx(s)[:3] for s in SNAKE[1:4]]:
            img.set(x, y, hx(SNAKE_PAT[i % 2]))
    img.set(round(hx_ + 0.8), round(hy_ - 0.6), hx(EYE_Y))
    if kind != 'coil' or k == 1:   # 舌
        tx, ty = round(hx_ + 3), round(hy_ + 0.5)
        img.set(tx, ty, hx('#c02a2a'))
        img.set(tx + 1, ty, hx('#c02a2a'))
        img.set(tx + 2, ty - 1, hx('#e04040'))
        img.set(tx + 2, ty + 1, hx('#e04040'))
    return img


def snake_sheet():
    return [snake_frame(('coil', 0)), snake_frame(('coil', 1)), snake_frame(('rattle', 0)), snake_frame(('rattle', 1)), snake_frame(('lunge', 0))]


# ------------------------------------------------------------------ puddle (16×16 variants, ground decal)
def puddle(v):
    rg = Rig(16, 16, {'w': R(WATER)}, ambient=0.35)
    r = random.Random(30 + v)
    rg.ellipse(8, 10, 6.2 - v * 0.6, 3.2, 'w', group='p', flat=0.6, dither=0.2)
    rg.ellipse(8 + r.uniform(-2, 2), 9.4, 2.6, 1.0, 'w', group='p2', shift=0.25, line=False)
    img = rg.resolve(outline='#1d3a52')
    img.set(6, 9, hx('#e4f6f8'))
    img.set(7, 9, hx('#e4f6f8'))
    return img


# ------------------------------------------------------------------ rare items (16×16)
def rare_icon(name, k=1.0, oy=0.0):
    def P(x, y):
        return (8 + (x - 8) * k, 8 + (y - 8) * k + oy)
    rg = Rig(16, 16, {'seed': R(SEEDR), 'gem': R(GEM), 'stone': R(STONE)}, ambient=0.2)
    hi = []
    if name == 'rare_seed':
        x, y = P(8, 8.5)
        rg.ellipse(x, y, 4.6 * k, 5.8 * k, 'seed', ang=24, dither=0.12)
        sx, sy = P(9.5, 3.0)
        rg.capsule([(sx, sy), P(10.5, 1.5)], [0.8 * k, 0.5], 'stone', group='stem')
        hi = [(round(x - 2 * k), round(y - 2 * k), SEEDR[4])]
    else:
        x, y = P(8, 9)
        rg.poly([P(3.5, 9), P(6.5, 4), P(10, 3.5), P(13, 8), P(10.5, 13), P(5.5, 13)], 'gem', value=0.55, grad=(0.03, -0.04), dither=0.1)
        rg.poly([P(6.5, 4), P(10, 3.5), P(9, 8), P(6.6, 8)], 'gem', value=0.85, group='facet', line=False)
        hi = [(round(P(7, 5)[0]), round(P(7, 5)[1]), GEM[4]), (round(P(8, 5)[0]), round(P(8, 5)[1]), GEM[4])]
    img = rg.resolve()
    for (px, py, c) in hi:
        if img.get(px, py):
            img.set(px, py, c)
    return img


def rare_ground(name):
    icon = rare_icon(name, k=0.72, oy=2.2)
    out = Img(16, 16)
    for y in range(12, 16):
        for x in range(3, 13):
            if ((x - 8) / 5.0) ** 2 + ((y - 13.6) / 1.6) ** 2 <= 1:
                out.set(x, y, (0x2a, 0x1a, 0x10, 80))
    out.paste(icon, 0, 0, alpha_over=False)
    # きらめき
    out.set(12, 3, hx('#fff8d0'))
    out.set(13, 4, hx('#fff8d0'))
    return out


# ------------------------------------------------------------------ plugged entrance (24×16) / land flag (16×16) / alert (12×14)
def plug():
    rg = Rig(24, 16, {'stone': R(STONE)}, ambient=0.15)
    r = random.Random(77)
    for i in range(7):
        x = 12 + r.uniform(-5, 5)
        y = 9.4 + r.uniform(-2, 1.6)
        rg.ellipse(x, y, r.uniform(1.8, 2.6), r.uniform(1.4, 1.9), 'stone', group='s%d' % i, shift=r.uniform(-0.15, 0.15), dither=0.1)
    return rg.resolve()


def land_flag():
    rg = Rig(16, 16, {'wood': R(WOOD), 'cloth': R(CLOTH)}, ambient=0.2)
    rg.capsule([(5, 15), (5, 2)], [0.8, 0.7], 'wood', group='pole')
    rg.poly([(5.5, 2), (13, 4.2), (5.5, 7)], 'cloth', value=0.7, grad=(0.02, 0.0), group='flag')
    return rg.resolve()


def alert_icon():
    img = Img(12, 14)
    rows = [
        "...oooooo...",
        "..oyyyyyyo..",
        ".oyyrrrryyo.",
        ".oyyrrrryyo.",
        ".oyyrrrryyo.",
        ".oyyyrryyyo.",
        ".oyyyrryyyo.",
        ".oyyyyyyyyo.",
        ".oyyyrryyyo.",
        ".oyyyrryyyo.",
        "..oyyyyyyo..",
        "...oooyooo..",
        ".....oyo....",
        "......o.....",
    ]
    leg = {'o': OUTLINE, 'y': hx('#ffd84a'), 'r': hx('#c8201a')}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in leg:
                img.set(x, y, leg[ch])
    return img
