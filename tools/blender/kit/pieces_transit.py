# -*- coding: utf-8 -*-
"""
境界侵食 P17（環境）：中央通りと駅前の乗り物と設備を Blender の部品に（前は手続きの箱の積み木）。
  ・prop.town.tram       路面電車（独自の意匠：2 両つなぎの低床車。白い車体・青緑の裾・こはく色の帯・一本腕のパンタグラフ）。v0 暗い窓／v1 灯りのついた窓
  ・prop.town.tram_lite  同じ形の粗い版（スマホの低い段）
  ・prop.town.bus        路線バス（独自の意匠：白に青い帯・大きな前の窓・前と中の扉は左＝歩道の側）。v0／v1 は電車と同じ
  ・prop.town.bus_lite   同じ形の粗い版
  ・prop.town.signal_car 車の信号（柱の上の延長・腕・横 3 灯の灯器と庇・背面板）。腕は +x、灯器は +z を向く
  ・prop.town.signal_ped 歩行者の信号（柱・押しボタンの箱・2 灯の灯器と庇）。灯器は +z を向く
  ・bld.town.canopy_truss 駅前の大屋根の梁（鉄骨のトラス 13.6m・上下の弦材・斜めの材・継ぎ手の板）
  ・bld.town.canopy_column 大屋根の柱（下が太い丸い柱・台座・4 本の枝の支え・頭の板）
車体は「断面の輪を前から後ろへ並べてつなぐ」（ロフト：pieces_cars.py と同じ考え）。断面は角の丸い四角（裾の丸み・肩の丸み・窓の帯の内への傾き）。
運転台の端は上から見て角を丸め、前の窓の上を後ろへ傾ける。車輪の上は切り欠く（バス）。窓・柱・扉・帯は同じ面に材質を当てる。
行き先の電光の文字は置く側（town2.js の B.box('sign')）が描く（ここは黒いくぼみだけ）。前照灯の光のにじみ・信号の色の光は置く側の halos。
向き：x＝幅・y＝長さ（前＝−y）・z＝上・原点＝底の中心（glTF では前＝+z）。
"""
import math

from mathutils import Vector, Euler

import kitlib
from kitlib import Builder

PAINT = 'mat.town.paint'


def P(n):
    return PAINT + '#' + n


kitlib.MAT_COLORS.update({
    P('twhite'): (0.86, 0.88, 0.89), P('teal'): (0.09, 0.32, 0.36), P('amber'): (0.86, 0.6, 0.16), P('black'): (0.035, 0.035, 0.04),
    P('dark'): (0.1, 0.1, 0.11), P('roofgrey'): (0.55, 0.57, 0.6), P('tire'): (0.045, 0.045, 0.045), P('rim'): (0.5, 0.52, 0.55),
    P('chrome'): (0.78, 0.8, 0.82), P('bwhite'): (0.88, 0.88, 0.86), P('blue'): (0.14, 0.32, 0.64), P('steel'): (0.36, 0.38, 0.42),
    P('steeldk'): (0.2, 0.21, 0.24), P('signal'): (0.16, 0.17, 0.19), P('yellow'): (0.86, 0.74, 0.18), P('pole'): (0.5, 0.52, 0.53),
    P('bellows'): (0.14, 0.14, 0.16),
    'glass.dark': (0.03, 0.04, 0.06), 'emit.head': (1.0, 0.95, 0.82), 'emit.tail': (0.85, 0.06, 0.04), 'emit.cabin': (0.62, 0.7, 0.76),
    'emit.amber': (1.0, 0.55, 0.08), 'emit.siggreen': (0.08, 0.2, 0.15), 'emit.sigyellow': (0.22, 0.17, 0.05), 'emit.sigred': (0.22, 0.05, 0.05),
    'emit.pedred': (0.24, 0.05, 0.05), 'emit.pedgreen': (0.05, 0.18, 0.1), 'emit.dest': (0.02, 0.015, 0.01),
})


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ───────────── 車体のロフト（角の丸い四角の断面） ─────────────
def loft(B, ys, prof, matf, cap0=True, cap1=True, ymap=None):
    """ys：駅（y）の列。prof(y) → 片側の断面の点 [(x, z)...]（下の真ん中から上の真ん中まで）。matf(i, q, ym, zm) → 材質の id
    （i＝−1／−2 は前／後ろのふた：q＝帯の番号）。ymap(y, x, z) → 頂点の y（運転台の前の窓の傾き：駅の順は崩さない）。
    ふたは左右の同じ高さの点を結んだ帯（高さごとに材質＝前の窓・行き先の台・裾）"""
    rows = []
    halfs = [prof(y) for y in ys]
    m = len(halfs[0])
    for y, h in zip(ys, halfs):
        pts = [(-x, z) for (x, z) in h] + [(x, z) for (x, z) in reversed(h[1:-1])]
        rows.append([B.bm.verts.new((px, ymap(y, px, pz) if ymap else y, pz)) for (px, pz) in pts])
    N = len(rows[0])

    def side_q(j):
        return j if j < m - 1 else (N - 1 - j)
    for i in range(len(ys) - 1):
        ym = (ys[i] + ys[i + 1]) / 2
        for j in range(N):
            j2 = (j + 1) % N
            zm = (rows[i][j].co.z + rows[i][j2].co.z) / 2
            f = B.bm.faces.new((rows[i][j], rows[i][j2], rows[i + 1][j2], rows[i + 1][j]))
            B._tag([f], B.mat(matf(i, side_q(j), ym, zm)))
    for flag, row, code, rev in ((cap0, rows[0], -1, True), (cap1, rows[-1], -2, False)):
        if not flag:
            continue
        L = [row[k] for k in range(m)]
        R = [row[0]] + [row[N - k] for k in range(1, m - 1)] + [row[m - 1]]
        for k in range(m - 1):
            vs = [L[k], L[k + 1], R[k + 1], R[k]]
            vs = [v for i2, v in enumerate(vs) if v not in vs[:i2]]
            if len(vs) < 3:
                continue
            if rev:                                                # 前（−y）のふたは −y を向く・後ろ（+y）は +y
                vs = list(reversed(vs))
            zm = sum(v.co.z for v in vs) / len(vs)
            f = B.bm.faces.new(vs)
            B._tag([f], B.mat(matf(code, k, ys[0] if code == -1 else ys[-1], zm)))
    return rows


def end_map(end, side, E, rake):
    """運転台の端の頂点の y：端から e（0〜E）の駅を、高さ z の前の面の位置 rake(z) から E までへ並べ直す（交わらない）"""
    def f(y, x, z):
        e = abs(y - end)
        if e >= E:
            return y
        r = min(rake(z), E * 0.8)
        return end - side * (r + e * (E - r) / E)
    return f


def rr_profile(w, zb, zt, rb, rt, bands, inset=0.0, zin=None, segs=3):
    """片側の断面：下の真ん中 → 下の角（丸み rb）→ 横（bands の高さに点）→ 肩（丸み rt）→ 上の真ん中。
    inset：zin より上の横の面を内へ寄せる（窓の帯の傾き）"""
    pts = [(0.0, zb)]
    for k in range(segs + 1):
        a = -math.pi / 2 + (math.pi / 2) * k / segs
        pts.append((w - rb + rb * math.cos(a), zb + rb + rb * math.sin(a)))
    lo, hi = zb + rb + 0.004, zt - rt - 0.004
    for k, z in enumerate(bands):                                  # 点の数は駅ごとに同じ（輪をつなぐため）：範囲の外の帯は端へ寄せる
        z = max(lo + 0.002 * k, min(hi - 0.002 * (len(bands) - k), z))
        x = w - (inset * smooth((z - zin) / max(1e-3, (zt - rt) - zin)) if (inset and zin is not None and z > zin) else 0.0)
        pts.append((x, z))
    wt = w - inset
    for k in range(segs + 1):
        a = (math.pi / 2) * k / segs
        pts.append((wt - rt + rt * math.cos(a), zt - rt + rt * math.sin(a)))
    pts.append((0.0, zt))
    return pts


def wheel(B, x, y, r, w, lod, outward, tire=None, rim=None):
    segs = (18, 12, 8)[lod]
    c = Vector((x, y, r))
    d = Vector((1, 0, 0))
    B.cyl(c - d * w / 2, c + d * w / 2, r, r, segs=segs, mid=tire or P('tire'))
    o = Vector((outward * (w / 2 + 0.006), 0, 0))
    B.cyl(c + o - d * 0.004, c + o + d * 0.004, r * 0.62, r * 0.62, segs=segs, mid=rim or P('rim'))
    if lod == 0:
        o2 = Vector((outward * (w / 2 + 0.012), 0, 0))
        for k in range(8):
            a = k / 8 * math.tau
            p = c + o2 + Vector((0, math.cos(a) * r * 0.45, math.sin(a) * r * 0.45))
            B.box(p, (0.008, 0.03, 0.03), P('chrome'))
        B.cyl(c + o2 - d * 0.004, c + o2 + d * 0.01, r * 0.2, r * 0.2, segs=10, mid=P('chrome'))


# ───────────── 路面電車 ─────────────
TRAM = dict(L=14.4, W=2.3, zb=0.42, zt=3.42, belt=1.18, wlo=1.25, whi=2.5, gauge=1.067)


def tram(lit, lod):
    S = TRAM
    L, W = S['L'], S['W']
    w = W / 2
    B = Builder('tram_%d_%d' % (lit, lod), 611 + lod)
    win = 'emit.cabin' if lit else 'glass.dark'
    cl = (L - 0.5) / 2                                             # 1 両の長さ（つなぎ 0.5m）
    cars = [(-1, -(cl / 2 + 0.25)), (1, cl / 2 + 0.25)]           # 前（−y）の車・後ろ（+y）の車
    bands = [0.6, 0.95, S['belt'] - 0.05, S['belt'] + 0.05, S['wlo'], S['whi'], 2.75, 3.05]
    for side, yc in cars:
        y0, y1 = yc - cl / 2, yc + cl / 2
        end = y0 if side < 0 else y1                              # 運転台の端
        # 駅：窓の柱（1.35m ごと）の両側・扉・運転台の丸み
        ys = set()
        step = (0.7, 1.3, 1.8)[lod]
        n = max(4, int(cl / step))
        for i in range(n + 1):
            ys.add(round(y0 + cl * i / n, 4))
        pil = []
        k = -cl / 2 + 0.6
        while k <= cl / 2 - 0.5:
            pil.append(yc + k)
            k += 1.35
        if lod < 2:
            for p in pil:
                ys.add(round(p - 0.07, 4))
                ys.add(round(p + 0.07, 4))
        for d in ((0.04, 0.14, 0.3, 0.5, 0.75, 1.0) if lod == 0 else (0.12, 0.4, 0.8) if lod == 1 else (0.3, 0.8)):
            ys.add(round(end - side * d, 4))
        ys = sorted(y for y in ys if y0 - 1e-6 <= y <= y1 + 1e-6)
        R0 = 0.55                                                  # 運転台の角の丸み（上から見て）

        def prof(y, end=end, side=side):
            e = abs(y - end)
            k = smooth(e / R0) if e < R0 else 1.0
            s = 0.8 + 0.2 * math.sqrt(max(0.0, 1 - (1 - min(1.0, e / R0)) ** 2))
            ww = w * s
            zt = S['zt'] - (1 - k) ** 2 * 0.12
            zb = S['zb'] + (1 - k) ** 2 * 0.08
            return rr_profile(ww, zb, zt, 0.1 if lod < 2 else 0.06, 0.28 if lod < 2 else 0.2, bands, inset=0.05, zin=S['whi'], segs=(3, 2, 1)[lod])

        ymap = end_map(end, side, 0.6, lambda z: 0.34 * smooth((z - S['wlo']) / (S['zt'] - S['wlo'])) + 0.07 * smooth((0.9 - z) / 0.5))

        def matf(i, q, ym, zm, end=end, side=side, pil=pil, yc=yc):
            if i < 0:                                              # ふた：運転台の前は前の窓・行き先の台・裾。つなぎの側は白
                if (i == -1) != (side < 0):
                    return P('twhite') if zm > 0.55 else P('black')
                if zm < 0.55:
                    return P('black')
                if zm < S['belt'] - 0.05:
                    return P('teal')
                if zm < S['belt'] + 0.05:
                    return P('amber')
                if S['wlo'] - 0.1 < zm < S['whi'] + 0.15:
                    return 'glass.dark'
                return P('twhite')
            e = abs(ym - end)
            if q == 0:
                return P('black')
            if zm < S['belt'] - 0.05:
                return P('teal') if zm > 0.55 else P('black')
            if zm < S['belt'] + 0.05:
                return P('amber')
            if zm < S['wlo']:
                return P('twhite')
            if zm < S['whi']:
                if e < 0.5:
                    return 'glass.dark'                            # 運転台の前の窓（灯りは入れない）
                if lod < 2 and any(abs(ym - p) < 0.07 for p in pil):
                    return P('twhite')
                return win
            if zm < 2.75:
                return P('twhite')
            return P('roofgrey') if zm > 3.3 else P('twhite')
        loft(B, ys, prof, matf, cap0=True, cap1=True, ymap=ymap)
        # 扉（2 枚のガラス・枠：両側）
        dz = yc - side * 1.6
        for s in (-1, 1):
            x = s * (w + 0.012)
            B.box((x, dz, 1.5), (0.02, 1.3, 2.0), win if lit else 'glass.dark')
            if lod < 2:
                B.box((x + s * 0.004, dz, 1.5), (0.02, 0.05, 2.04), P('dark'))
                B.box((x + s * 0.004, dz, 2.52), (0.02, 1.36, 0.05), P('dark'))
                for e2 in (-0.66, 0.66):
                    B.box((x + s * 0.004, dz + e2, 1.5), (0.02, 0.05, 2.06), P('dark'))
                B.box((x + s * 0.01, dz, 0.55), (0.012, 1.3, 0.04), P('yellow'))   # 扉の下の黄色の線（足もと）
        # 屋根：冷房の箱（角の丸み）・屋根の縁
        B.box((0, yc + side * 0.8, 3.6), (1.4, 2.2, 0.34), P('roofgrey'), bevel=0.06 if lod < 2 else 0)
        if lod < 2:
            for g in (-0.6, -0.2, 0.2, 0.6):
                B.box((0.71, yc + side * 0.8 + g, 3.6), (0.01, 0.2, 0.22), P('dark'))
                B.box((-0.71, yc + side * 0.8 + g, 3.6), (0.01, 0.2, 0.22), P('dark'))
        # 台車：裾の覆い・車輪（レールの上）・ばねの箱
        bz = yc - side * 0.2
        B.box((0, bz, 0.26), (W - 0.24, 2.3, 0.3), P('black'), bevel=0.03 if lod < 2 else 0)
        for s in (-1, 1):
            for wz in (-0.75, 0.75):
                wheel(B, s * S['gauge'] / 2, bz + wz, 0.3, 0.1, max(lod, 1), s, tire=P('steeldk'), rim=P('steel'))   # 裾の覆いの陰（ボルトは作らない）
            if lod < 2:
                B.box((s * (S['gauge'] / 2 + 0.12), bz, 0.36), (0.1, 1.9, 0.16), P('steeldk'))
        # 運転台：前照灯・尾灯・行き先のくぼみ・ワイパー・連結器のふた・鏡（カメラの腕）
        ye = end + side * 0.0
        for s in (-0.8, 0.8):
            B.box((s, ye + side * 0.01, 0.95), (0.3, 0.06, 0.15), 'emit.head' if side < 0 else 'emit.tail', bevel=0.02 if lod < 2 else 0)
            if lod < 2:
                B.box((s, ye + side * 0.0, 0.95), (0.36, 0.04, 0.21), P('black'))
        B.box((0, ye + side * 0.02 + (-side) * 0.28, 2.95), (1.6, 0.06, 0.38), 'emit.dest')   # 行き先の電光の台（文字は置く側）
        B.box((0, ye + side * 0.0 + (-side) * 0.27, 2.95), (1.7, 0.04, 0.46), P('black'))
        B.box((0, ye + side * 0.0, 0.48), (0.34, 0.12, 0.18), P('dark'), bevel=0.02 if lod < 2 else 0)
        if lod < 2:
            for dx in (-0.35, 0.35):
                B.box((dx, ye + side * 0.012, 1.3), (0.55, 0.02, 0.02), P('black'), rot=Euler((0, 0.35 if dx > 0 else -0.35, 0)))
            for s in (-1, 1):
                B.box((s * (w + 0.18), ye - side * 0.5, 2.3), (0.34, 0.04, 0.04), P('black'))
                B.box((s * (w + 0.33), ye - side * 0.5, 2.15), (0.08, 0.1, 0.32), P('black'), bevel=0.02)
    # つなぎ（幌：ひだ）と台車
    folds = 6 if lod < 2 else 2
    for k in range(folds):
        yy = -0.22 + 0.44 * k / max(1, folds - 1)
        B.box((0, yy, 1.75), (2.08 if k % 2 else 2.0, 0.06, 2.7), P('bellows'))
    B.box((0, 0, 1.75), (1.9, 0.5, 2.6), P('bellows'))
    B.box((0, 0, 0.26), (2.0, 0.6, 0.26), P('black'))
    for s in (-1, 1):
        for wz in (-0.2, 0.2):
            wheel(B, s * S['gauge'] / 2, wz, 0.3, 0.1, min(lod + 1, 2), s, tire=P('steeldk'), rim=P('steel'))
    # パンタグラフ（一本腕：台・下の腕・上の腕・すり板・碍子）
    py = cl / 2 + 0.25                                             # 後ろの車（glTF の −z）
    B.box((0, py, 3.5), (1.0, 1.0, 0.1), P('steeldk'))
    if lod < 2:
        for sx in (-0.4, 0.4):
            for sy in (-0.4, 0.4):
                B.cyl((sx, py + sy, 3.42), (sx, py + sy, 3.55), 0.05, 0.05, segs=8, mid=P('chrome'))
    knee = Vector((0, py - 0.75, 4.55))
    B.cyl((0, py + 0.3, 3.56), knee, 0.035, 0.03, segs=(8, 6, 4)[lod], mid=P('steeldk'))
    B.cyl(knee, (0, py - 0.05, 5.82), 0.025, 0.02, segs=(8, 6, 4)[lod], mid=P('steeldk'))
    B.box((0, py - 0.05, 5.86), (1.5, 0.1, 0.05), P('steeldk'))
    if lod < 2:
        for s in (-1, 1):
            B.box((s * 0.78, py - 0.05, 5.8), (0.16, 0.08, 0.04), P('steeldk'), rot=Euler((0, s * 0.6, 0)))
        B.cyl((0, py + 0.3, 3.56), (0, py - 0.35, 4.0), 0.02, 0.02, segs=6, mid=P('steeldk'))      # ばねの腕
    return B.finish(32, uv=False)


# ───────────── バス ─────────────
BUS = dict(L=10.5, W=2.5, r=0.48, yw=(-3.3, 3.0), zb=0.32, zt=3.0, belt=1.32, wlo=1.45, whi=2.62)


def bus(lit, lod):
    S = BUS
    L, W, r = S['L'], S['W'], S['r']
    w = W / 2
    B = Builder('bus_%d_%d' % (lit, lod), 641 + lod)
    win = 'emit.cabin' if lit else 'glass.dark'
    y0, y1 = -L / 2, L / 2
    ys = set()
    step = (0.5, 0.9, 1.3)[lod]
    n = int(L / step)
    for i in range(n + 1):
        ys.add(round(y0 + L * i / n, 4))
    R = r + 0.06
    for yw in S['yw']:
        k = (8, 5, 3)[lod]
        for i in range(k + 1):
            a = math.pi * i / k
            ys.add(round(yw - R * math.cos(a), 4))
    pil = [y0 + 1.2 + 1.6 * k for k in range(6)]
    if lod < 2:
        for p in pil:
            ys.add(round(p - 0.06, 4))
            ys.add(round(p + 0.06, 4))
    for d in ((0.03, 0.12, 0.28, 0.45) if lod == 0 else (0.1, 0.35) if lod == 1 else (0.3,)):
        ys.add(round(y0 + d, 4))
        ys.add(round(y1 - d, 4))
    ys = sorted(ys)
    bands = [0.55, 0.9, S['belt'] - 0.07, S['belt'] + 0.07, S['wlo'], S['whi'], 2.8]

    def zb_at(y):
        z = S['zb']
        for yw in S['yw']:
            d = abs(y - yw)
            if d < R:
                z = max(z, r + math.sqrt(R * R - d * d) * 0.92)
        return z

    def prof(y):
        e = min(y - y0, y1 - y)
        k = min(1.0, e / 0.45)
        s = 0.86 + 0.14 * math.sqrt(max(0.0, 1 - (1 - k) ** 2))
        zt = S['zt'] - (1 - k) ** 2 * 0.1
        return rr_profile(w * s, zb_at(y), zt, 0.12 if lod < 2 else 0.06, 0.22 if lod < 2 else 0.15, bands, inset=0.03, zin=S['whi'], segs=(3, 2, 1)[lod])

    ymap_f = end_map(y0, -1, 0.5, lambda z: 0.2 * smooth((z - 1.0) / 1.9))
    ymap_r = end_map(y1, 1, 0.5, lambda z: 0.05 * smooth((z - 2.4) / 0.6))

    def ymap(y, x, z):
        return ymap_f(y, x, z) if y < 0 else ymap_r(y, x, z)

    def matf(i, q, ym, zm):
        if i == -1:                                                # 前のふた：大きな前の窓（下まで）・行き先の台の上の帯・バンパー
            if zm < 0.62:
                return P('dark')
            if zm < 0.95:
                return P('bwhite')
            if zm < 2.68:
                return 'glass.dark'
            return P('blue') if zm < 2.75 else P('bwhite')
        if i == -2:                                                # 後ろのふた：上の窓・機械の格子の面
            if zm < 0.62:
                return P('dark')
            if 1.95 < zm < 2.6:
                return 'glass.dark'
            return P('blue') if abs(zm - S['belt']) < 0.07 else P('bwhite')
        front = ym - y0 < 0.45
        rear = y1 - ym < 0.45
        if q == 0:
            return P('black')
        if zm < 0.5:
            return P('dark')
        if abs(zm - S['belt']) < 0.07:
            return P('blue')
        if zm < S['wlo']:
            return P('bwhite')
        if zm < S['whi']:
            if front:
                return 'glass.dark'
            if rear:
                return P('bwhite') if zm < 2.0 else 'glass.dark'
            if lod < 2 and any(abs(ym - p) < 0.06 for p in pil):
                return P('black')
            return win
        return P('bwhite')
    loft(B, ys, prof, matf, ymap=ymap)
    # 扉（左＝−x：前の扉・中の扉）
    for dz in (y0 + 1.15, 0.6):
        x = -(w + 0.012)
        B.box((x, dz, 1.45), (0.02, 1.0, 2.1), win if lit else 'glass.dark')
        if lod < 2:
            B.box((x - 0.004, dz, 1.45), (0.02, 0.05, 2.14), P('dark'))
            for e2 in (-0.5, 0.5):
                B.box((x - 0.004, dz + e2, 1.45), (0.02, 0.05, 2.16), P('dark'))
            B.box((x - 0.004, dz, 2.52), (0.02, 1.06, 0.05), P('dark'))
    # 車輪・タイヤハウスの奥
    for yw in S['yw']:
        B.box((0, yw, r + 0.2), (W - 0.6, 2 * (r + 0.04), 0.6), P('black'))
        for s in (-1, 1):
            wheel(B, s * (w - 0.18), yw, r, 0.3, lod, s)
            if yw > 0 and lod < 2:
                wheel(B, s * (w - 0.5), yw, r, 0.26, 2, s)        # 後ろは 2 輪（内側）
    # 前：前照灯・方向指示器・行き先のくぼみ・ワイパー・鏡（腕つき）・バンパー
    for s in (-0.95, 0.95):
        B.box((s, y0 + 0.02, 0.78), (0.32, 0.06, 0.16), 'emit.head', bevel=0.02 if lod < 2 else 0)
        if lod < 2:
            B.box((s * 1.03, y0 + 0.03, 0.6), (0.14, 0.05, 0.08), 'emit.amber')
        B.box((s, y1 - 0.02, 0.92), (0.2, 0.06, 0.32), 'emit.tail')
    B.box((0, y0 + 0.06, 0.45), (W - 0.1, 0.16, 0.24), P('dark'), bevel=0.04 if lod < 2 else 0)
    B.box((0, y1 - 0.06, 0.45), (W - 0.1, 0.16, 0.24), P('dark'), bevel=0.04 if lod < 2 else 0)
    B.box((0, y0 + 0.19, 2.85), (1.9, 0.04, 0.34), 'emit.dest')
    if lod < 2:
        for dx in (-0.55, 0.45):
            B.box((dx, y0 - 0.012, 0.98), (0.8, 0.02, 0.02), P('black'), rot=Euler((0, 0.25 if dx > 0 else -0.25, 0)))
        for s in (-1, 1):
            B.box((s * 1.36, y0 + 0.35, 2.65), (0.24, 0.04, 0.04), P('dark'))
            B.box((s * 1.5, y0 + 0.35, 2.42), (0.07, 0.04, 0.45), P('dark'))
            B.box((s * 1.5, y0 + 0.3, 2.2), (0.08, 0.14, 0.42), P('black'), bevel=0.02)
        # 後ろ：機械の格子・非常口の窓の枠
        for k in range(6):
            B.box((0, y1 + 0.005, 0.7 + k * 0.08), (1.6, 0.01, 0.03), P('black'))
    # 屋根：冷房の箱
    B.box((0, 0.5, 3.12), (2.2, 4.0, 0.26), P('roofgrey'), bevel=0.06 if lod < 2 else 0)
    return B.finish(32, uv=False)


# ───────────── 信号 ─────────────
def visor(B, c, w, h, depth, lod):
    """灯の庇（上と横：前へ出た薄い板）"""
    x, y, z = c
    B.box((x, y - depth / 2, z + h / 2), (w, depth, 0.012), P('signal'))
    if lod == 0:
        for s in (-1, 1):
            B.box((x + s * w / 2, y - depth / 2, z + h / 4), (0.012, depth, h / 2), P('signal'))


def signal_car(lod):
    """車の信号：柱の上の延長（y 2.7〜5.3）・腕（+x へ 3.4m）・灯器（x＝3.2・高さ 5.0・+z＝glTF の前＝Blender の −y を向く）"""
    B = Builder('signal_car_%d' % lod, 671 + lod)
    segs = (12, 8)[lod]
    B.cyl((0, 0, 2.7), (0, 0, 5.3), 0.075, 0.065, segs=segs, mid=P('pole'))
    B.cyl((0, 0, 5.2), (3.35, 0, 5.2), 0.055, 0.045, segs=segs, mid=P('pole'))
    if lod == 0:
        B.cyl((0, 0, 4.5), (1.2, 0, 5.18), 0.03, 0.03, segs=6, mid=P('pole'))   # 腕の下の支え
        B.cyl((0, 0, 5.3), (0, 0, 5.36), 0.09, 0.0, segs=8, mid=P('pole'))
    hx, hz = 3.2, 5.0
    B.box((hx, 0.0, hz), (1.3, 0.3, 0.42), P('signal'), bevel=0.04 if lod == 0 else 0)
    B.box((hx, 0.17, hz), (1.6, 0.02, 0.66), P('black'))          # 背面板（後ろ）
    B.box((hx, 0.0, hz + 0.2), (0.08, 0.08, 0.2), P('signal'))
    for k, (o, m) in enumerate(zip((-0.42, 0.0, 0.42), ('emit.siggreen', 'emit.sigyellow', 'emit.sigred'))):
        B.cyl((hx + o, -0.15, hz), (hx + o, -0.17, hz), 0.12, 0.12, segs=(16, 10)[lod], mid=m)
        visor(B, (hx + o, -0.15, hz), 0.3, 0.3, 0.16, lod)
    return B.finish(32, uv=False)


def signal_ped(lod):
    """歩行者の信号：柱（3.2m）・押しボタンの箱（黄色）・灯器（2 灯：上が赤・下が青。+z＝前）"""
    B = Builder('signal_ped_%d' % lod, 681 + lod)
    segs = (12, 8)[lod]
    B.cyl((0, 0, 0), (0, 0, 3.2), 0.065, 0.06, segs=segs, mid=P('pole'))
    B.cyl((0, 0, 0), (0, 0, 0.08), 0.1, 0.09, segs=segs, mid=P('pole'))
    B.box((0, -0.08, 0.95), (0.18, 0.1, 0.28), P('yellow'), bevel=0.02 if lod == 0 else 0)
    if lod == 0:
        B.cyl((0, -0.13, 0.98), (0, -0.15, 0.98), 0.03, 0.03, segs=8, mid=P('chrome'))
    B.box((0, -0.02, 2.6), (0.38, 0.32, 0.86), P('signal'), bevel=0.03 if lod == 0 else 0)
    for z, m in ((2.8, 'emit.pedred'), (2.4, 'emit.pedgreen')):
        B.box((0, -0.185, z), (0.3, 0.02, 0.3), m)
        visor(B, (0, -0.19, z - 0.02), 0.34, 0.34, 0.12, lod)
    for z in (2.2, 3.0):
        B.box((0, 0.05, z), (0.1, 0.12, 0.05), P('pole'))
    return B.finish(32, uv=False)


# ───────────── 駅前の大屋根 ─────────────
CANOPY = dict(span=13.6, depth=0.7, col_h=8.0)


def canopy_truss(lod):
    """梁（長さ 13.6m を y に・高さ 0.7m：上の弦の上面＝z 0.7）。原点は下の弦の下の真ん中"""
    C = CANOPY
    B = Builder('canopy_truss_%d' % lod, 701 + lod)
    Lh = C['span'] / 2
    d = C['depth']
    B.box((0, 0, d - 0.08), (0.22, C['span'], 0.16), P('steel'), bevel=0.012 if lod == 0 else 0)          # 上の弦（角の鋼管）
    B.box((0, 0, 0.07), (0.18, C['span'] - 0.4, 0.14), P('steel'), bevel=0.012 if lod == 0 else 0)      # 下の弦
    n = 10
    segs = (8, 5)[lod]
    for k in range(n):
        ya = -Lh + 0.2 + (C['span'] - 0.4) * k / n
        yb = -Lh + 0.2 + (C['span'] - 0.4) * (k + 1) / n
        a, b = (ya, 0.12), (yb, d - 0.14)
        if k % 2:
            a, b = (ya, d - 0.14), (yb, 0.12)
        B.cyl((0, a[0], a[1]), (0, b[0], b[1]), 0.045, 0.045, segs=segs, mid=P('steel'))
        if lod == 0:
            B.box((0, ya, 0.07), (0.24, 0.06, 0.2), P('steeldk'))   # 継ぎ手の板
    for e in (-1, 1):
        B.box((0, e * (Lh - 0.1), d / 2), (0.22, 0.2, d), P('steel'))
    return B.finish(32, uv=False)


def canopy_column(lod):
    """柱：台座・下が太い丸い柱（高さ 8.0）・頭の板・4 本の枝の支え（屋根の下の面 9.2−0.75 へ）"""
    C = CANOPY
    B = Builder('canopy_column_%d' % lod, 711 + lod)
    segs = (16, 10)[lod]
    h = C['col_h']
    B.box((0, 0, 0.15), (0.8, 0.8, 0.3), P('steeldk'), bevel=0.03 if lod == 0 else 0)
    B.cyl((0, 0, 0.3), (0, 0, 0.6), 0.34, 0.28, segs=segs, mid=P('steel'))
    B.cyl((0, 0, 0.6), (0, 0, h), 0.26, 0.2, segs=segs, mid=P('steel'))
    B.cyl((0, 0, h), (0, 0, h + 0.12), 0.32, 0.32, segs=segs, mid=P('steeldk'))
    top = 9.2 - 0.78
    B.box((0, 0, top + 0.09), (3.3, 0.18, 0.18), P('steel'))       # 頭の梁（x の枝の先をつなぐ：梁は y＝トラスの向き）
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        tip = Vector((dx * 1.5, dy * 1.5, top))
        B.cyl((dx * 0.12, dy * 0.12, h + 0.06), tip, 0.09, 0.06, segs=(10, 6)[lod], mid=P('steel'))
        B.box(tip + Vector((0, 0, 0.03)), (0.3, 0.3, 0.06), P('steeldk'))
        if lod == 0:
            mid = Vector((dx * 0.75, dy * 0.75, (h + top) / 2 + 0.1))
            B.cyl((0, 0, h - 0.6), mid, 0.035, 0.035, segs=6, mid=P('steel'))
    return B.finish(32, uv=False)


def trams():
    return {'variant_lods': [[tram(v, 0), tram(v, 2)] for v in (0, 1)], 'no_tangents': True}   # LOD1＝軽い版と同じ形（36m より遠く）


def trams_lite():
    return {'variant_lods': [[tram(v, 2)] for v in (0, 1)], 'no_tangents': True}


def buses():
    return {'variant_lods': [[bus(v, 0), bus(v, 1)] for v in (0, 1)], 'no_tangents': True}


def buses_lite():
    return {'variant_lods': [[bus(v, 2)] for v in (0, 1)], 'no_tangents': True}


def signals_car():
    return {'variant_lods': [[signal_car(0), signal_car(1)]], 'no_tangents': True}


def signals_ped():
    return {'variant_lods': [[signal_ped(0), signal_ped(1)]], 'no_tangents': True}


def trusses():
    return {'variant_lods': [[canopy_truss(0), canopy_truss(1)]], 'no_tangents': True}


def columns():
    return {'variant_lods': [[canopy_column(0), canopy_column(1)]], 'no_tangents': True}


TRANSIT_PIECES = {
    'prop.town.tram': (trams, 'prop', '路面電車（2 両つなぎの低床車・独自の意匠。v0 暗い窓・v1 灯り）', 'Tram, 2-section low floor (original design; v0 dark / v1 lit)', ['路面電車', '町'], 'box', [70]),
    'prop.town.tram_lite': (trams_lite, 'prop', '路面電車の軽い版（スマホの低い段）', 'Tram, lite (phone low preset)', ['路面電車', '町'], 'box', [70]),
    'prop.town.bus': (buses, 'prop', '路線バス（独自の意匠。v0 暗い窓・v1 灯り）', 'City bus (original design; v0 dark / v1 lit)', ['バス', '町'], 'box', [60]),
    'prop.town.bus_lite': (buses_lite, 'prop', '路線バスの軽い版（スマホの低い段）', 'City bus, lite (phone low preset)', ['バス', '町'], 'box', [60]),
    'prop.town.signal_car': (signals_car, 'prop', '車の信号（延長の柱・腕・横 3 灯・庇・背面板）', 'Traffic signal, vehicle (arm, 3 lamps, visors)', ['信号', '町'], 'none', [45]),
    'prop.town.signal_ped': (signals_ped, 'prop', '歩行者の信号（柱・押しボタン・2 灯・庇）', 'Traffic signal, pedestrian (pole, button, 2 lamps)', ['信号', '町'], 'cyl', [40]),
    'bld.town.canopy_truss': (trusses, 'building_module', '駅前の大屋根の梁（鉄骨のトラス 13.6m）', 'Station canopy truss beam (13.6m)', ['駅', '鉄骨'], 'none', [60]),
    'bld.town.canopy_column': (columns, 'building_module', '駅前の大屋根の柱（枝分かれの支え）', 'Station canopy tree column', ['駅', '鉄骨'], 'cyl', [60]),
}
