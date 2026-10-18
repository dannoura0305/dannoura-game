# -*- coding: utf-8 -*-
"""
顔のテクスチャ（1 枚にまとめる・2048×1024）。
  左の正方形：顔の前（平らな写し）＝肌・目の穴（透明）・目尻のはね・二重の線・頬の赤み・鼻の影
  右：目玉（虹彩）・口・上まぶた（まつ毛の帯）・下まぶた・眉・肌の色だけの所
"""
import numpy as np

import paint as PT

W, H = 2048, 1024
CELLS = {
    'face': (0, 0, 1024, 1024), 'eye': (1024, 0, 512, 512), 'mouth': (1536, 0, 512, 512),
    'lidU': (1024, 512, 512, 128), 'lidL': (1024, 640, 512, 128), 'brow': (1024, 768, 512, 128), 'skin': (1024, 896, 512, 128),
    'nail': (1536, 512, 512, 512),
}


def cell_uv(name, uv):
    x, y, w, h = CELLS[name]
    m = 0.02   # 縁から少し内側（にじみ止め）
    u = np.clip(uv[:, 0], 0, 1) * (1 - 2 * m) + m
    v = np.clip(uv[:, 1], 0, 1) * (1 - 2 * m) + m
    return np.stack([(x + u * w) / W, (y + v * h) / H], -1)


def solid_uv(n, name='skin'):
    x, y, w, h = CELLS[name]
    return np.tile([(x + w * 0.5) / W, (y + h * 0.5) / H], (n, 1))


def _cell_grid(name):
    x, y, w, h = CELLS[name]
    u, v = PT.grid01(w, h)
    return u, v, w, h


def paint_face(look, ey, ex, E, box, mouth_ex=None):
    """look：色の dict。ey：目の高さ・ex：目の中心の x・E：eye_shape・box：顔の写しの範囲"""
    img = PT.canvas(W, H, PT.hexc(look['skin']))
    skin = PT.hexc(look['skin'])
    # ── 顔の前
    x0, x1, y0, y1 = box
    u, v, w, h = _cell_grid('face')
    X = x0 + u * (x1 - x0)
    Y = y1 - v * (y1 - y0)
    px = (x1 - x0) / w
    face = np.zeros((h, w, 4))
    face[:] = skin
    # 頬の赤み
    for s in (1, -1):
        d = PT.sd_ellipse(X, Y, s * (ex + 0.011), ey - 0.0215, 0.0145, 0.0065)
        a = np.clip(1 - (d / 0.008 + 1) * 0.5, 0, 1) ** 1.5 * look.get('blush', 0.25)
        face = PT.over(face, PT.hexc(look['blushColor']), a)
    # 鼻の影（小さな線）
    d = PT.sd_segment(X, Y, 0.0035, ey - 0.0225, 0.0062, ey - 0.0195)
    face = PT.over(face, PT.hexc(look['noseColor']), PT.aa(d - 0.0004, px) * 0.55)
    for s in (1, -1):
        xs = np.linspace(E['x0'], E['x1'], 60)
        poly = [(ex * s + s * xx, ey + E['U'](xx)) for xx in xs] + [(ex * s + s * xx, ey + E['L'](xx)) for xx in xs[::-1]]
        dh = PT.sd_polygon(X, Y, poly)
        # 二重の線
        xx = np.linspace(-0.006, E['x1'] - 0.0025, 30)
        crease = [(ex * s + s * q, ey + E['U'](q) + 0.0021 + 0.0004 * np.sin((q + 0.006) / (E['x1'] + 0.006) * np.pi)) for q in xx]
        dc = PT.sd_polyline(X, Y, crease)
        tt = np.clip((s * (X - ex * s) - (-0.006)) / (E['x1'] + 0.003), 0, 1)
        face = PT.over(face, PT.hexc(look['crease']), PT.aa(dc - 0.00028 * (1 - 0.6 * np.abs(tt - 0.5) * 2), px) * 0.75)
        # 目尻のはね（まつ毛の先）
        xo = E['x1']
        uo = E['U'](xo)
        wing = [(ex * s + s * (xo - 0.0045), ey + uo + 0.0021), (ex * s + s * (xo + 0.0042), ey + uo + 0.0030),
                (ex * s + s * (xo + 0.0006), ey + uo - 0.0008), (ex * s + s * (xo - 0.0040), ey + E['U'](xo - 0.004) - 0.0016)]
        dw = PT.sd_polygon(X, Y, wing)
        face = PT.over(face, PT.hexc(look['lash']), PT.aa(dw, px))
        # 下まつ毛の目尻の小さなはね
        lw = [(ex * s + s * (xo - 0.0016), ey + E['L'](xo - 0.0016) - 0.0002), (ex * s + s * (xo + 0.0016), ey + uo - 0.0016),
              (ex * s + s * (xo - 0.0008), ey + E['L'](xo - 0.0008) + 0.0004)]
        face = PT.over(face, PT.hexc(look['lash']), PT.aa(PT.sd_polygon(X, Y, lw), px) * 0.8)
        # 目の穴（透明）：わずかに大きく（まぶたの縁の外側が見えないように）
        hole = PT.aa(dh - 0.00015, px)
        face[..., 3] *= (1 - hole)
    img[0:1024, 0:1024] = face
    # ── 目玉（虹彩）
    u, v, w, h = _cell_grid('eye')
    span = 0.034
    X = (u - 0.5) * span
    Y = (0.5 - v) * span
    px = span / w
    eye = np.zeros((h, w, 4))
    eye[:] = PT.hexc(look['eyeWhite'])
    # 白目の上の影（まつ毛の影）
    sh = np.clip((Y - 0.0015) / 0.007, 0, 1)
    eye = PT.over(eye, PT.hexc(look['eyeShade']), sh * 0.85)
    irx, iry = look.get('iris', (0.0062, 0.0076))
    di = PT.sd_ellipse(X, Y, 0, -0.0004, irx, iry)
    inside = PT.aa(di, px)
    t = np.clip((Y + iry) / (2 * iry), 0, 1)       # 0＝下 → 1＝上
    ic = PT.mix(PT.hexc(look['irisLow']), PT.hexc(look['irisTop']), t ** 0.8)
    eye = PT.over(eye, ic, inside)
    # 虹彩の中の明るい輪・線
    ring = PT.aa(np.abs(PT.sd_ellipse(X, Y, 0, -0.0004, irx * 0.72, iry * 0.72)) - 0.00025, px)
    eye = PT.over(eye, PT.hexc(look['irisRing']), ring * inside * 0.35)
    bot = np.clip(1 - (PT.sd_ellipse(X, Y, 0, -0.0004 - iry * 0.55, irx * 0.75, iry * 0.4) / 0.002 + 1) * 0.5, 0, 1)
    eye = PT.over(eye, PT.hexc(look['irisGlow']), bot * inside * 0.7)
    # 瞳
    dp = PT.sd_ellipse(X, Y, 0, 0.0002, irx * 0.40, iry * 0.43)
    eye = PT.over(eye, PT.hexc(look['pupil']), PT.aa(dp, px) * 0.92)
    # 虹彩のふち
    edge = PT.aa(np.abs(di) - 0.00035, px)
    eye = PT.over(eye, PT.hexc(look['irisEdge']), edge * PT.aa(di - 0.0006, px))
    # 光の点（左上に大・右下に小）
    hl1 = PT.sd_ellipse(X, Y, -irx * 0.38, iry * 0.40, irx * 0.30, iry * 0.25)
    eye = PT.over(eye, np.array([1, 1, 1, 1.0]), PT.aa(hl1, px) * 0.95)
    hl2 = PT.sd_ellipse(X, Y, irx * 0.40, -iry * 0.42, irx * 0.13, iry * 0.11)
    eye = PT.over(eye, np.array([1, 1, 1, 1.0]), PT.aa(hl2, px) * 0.85)
    x, y, ww, hh = CELLS['eye']
    img[y:y + hh, x:x + ww] = eye
    # ── 口（板の上の絵：0..1 の正方形の中に丸い四角）
    u, v, w, h = _cell_grid('mouth')
    px = 1.0 / w
    q = ((np.abs(u - 0.5) / 0.5) ** 3 + (np.abs(v - 0.5) / 0.5) ** 3) ** (1 / 3)
    dshape = (q - 0.94) * 0.5
    mo = np.zeros((h, w, 4))
    mo[:] = PT.hexc(look['mouthIn'])
    tongue = PT.sd_ellipse(u, v, 0.5, 0.95, 0.36, 0.32)
    mo = PT.over(mo, PT.hexc(look['tongue']), PT.aa(tongue, px))
    teeth = np.clip((0.26 - v) / 0.02, 0, 1) * np.clip((0.40 - np.abs(u - 0.5)) / 0.04, 0, 1)
    mo = PT.over(mo, PT.hexc(look['teeth']), teeth)
    line = np.clip((dshape + 0.075) / 0.02, 0, 1)
    mo = PT.over(mo, PT.hexc(look['mouthLine']), line)
    mo[..., 3] = PT.aa(dshape, px)
    x, y, ww, hh = CELLS['mouth']
    img[y:y + hh, x:x + ww] = mo
    # ── 上まぶた（行 0..1 がまつ毛の帯：v < 1/6）
    for name, band, cov in (('lidU', 1 / 6, None), ('lidL', 1 / 4, 'outer')):
        u, v, w, h = _cell_grid(name)
        li = np.zeros((h, w, 4))
        li[:] = skin
        b = PT.aa(v - band, 1.0 / h)
        col = PT.hexc(look['lash'] if name == 'lidU' else look['lashLow'])
        if cov == 'outer':
            b = b * np.clip((u - 0.25) / 0.35, 0, 1)
        li = PT.over(li, col, b)
        x, y, ww, hh = CELLS[name]
        img[y:y + hh, x:x + ww] = li
    # ── 眉（帯：v の真ん中が濃い）
    u, v, w, h = _cell_grid('brow')
    br = np.zeros((h, w, 4))
    br[:] = PT.hexc(look['brow'])
    a = np.clip((0.5 - np.abs(v - 0.5)) / 0.12, 0, 1) * np.clip(u / 0.06, 0, 1) * np.clip((1 - u) / 0.12, 0, 1)
    br[..., 3] = a
    x, y, ww, hh = CELLS['brow']
    img[y:y + hh, x:x + ww] = br
    # ── 爪（手の指先：薄い桃色・今は肌と同じ）
    x, y, ww, hh = CELLS['nail']
    img[y:y + hh, x:x + ww] = PT.hexc(look['skin'])
    return img
