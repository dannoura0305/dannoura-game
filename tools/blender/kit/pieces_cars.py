# -*- coding: utf-8 -*-
"""
境界侵食 P14（環境）：町の車を作り直す（利用者の指摘「車が四角の積み木のような状態」への直し）。
前（P12）は面取りした箱の重ね（車体・屋根・窓の板）で、低い段（スマホ）は手続きの箱のままだった。
ここでは車体を「断面の輪（ring）を前から後ろへ並べてつなぐ」（ロフト）で作る：
  ・丸い肩（ベルトライン）・ふくらんだ横の面（タンブルホーム）・丸い鼻先と尻・ボンネットの丸み・屋根の丸み
  ・車輪の切り欠き（ホイールアーチ：断面の下の縁を車輪の上で持ち上げる）と、その奥の暗いタイヤハウス
  ・窓（ガラスの面）は同じ輪の面に材質を当てる（前の窓・横の窓・後ろの窓）。柱（A・B・C）と窓の枠は黒／塗装
  ・別の部品：タイヤ（ゴム）・ホイール（金属・5 本の穴）・前照灯・尾灯・方向指示器（光る）・鏡・取っ手・ドアの継ぎ目・
    ワイパー・ナンバー（数字は無い：白い板と枠だけ）・バンパー・下の黒い縁・グリル
種類（v<k>）：0 セダン・1 軽のトールワゴン・2 ミニバン・3 軽トラック・4 タクシー（セダン＋屋根の行灯）・5 ハッチバック。
LOD：0（細かい・約 4〜6 千三角形）・1（輪を粗く・小物を省く）・2（スマホの低い段でも車の形：約 4〜7 百）。
材質：mat.town.paint#carpaint（塗装：置く時の色・艶）・#black（窓の枠・柱・下の縁）・#tire・#chrome（金属の艶）・#rim・#plate・#dark・
glass.dark（ガラス）・emit.head／emit.tail／emit.amber／emit.andon（光る）。向き：x＝幅・y＝長さ（前＝−y）・z＝上・原点＝底の中心。
"""
import math

from mathutils import Vector, Euler

import kitlib
from kitlib import Builder

PAINT = 'mat.town.paint'


def P(n):
    return PAINT + '#' + n


kitlib.MAT_COLORS.update({
    P('carpaint'): (0.86, 0.86, 0.86), P('black'): (0.035, 0.035, 0.04), P('tire'): (0.045, 0.045, 0.045), P('chrome'): (0.78, 0.8, 0.82),
    P('rim'): (0.5, 0.52, 0.55), P('plate'): (0.9, 0.9, 0.84), P('dark'): (0.1, 0.1, 0.11), P('bed'): (0.3, 0.3, 0.3),
    'glass.dark': (0.03, 0.04, 0.06), 'emit.head': (1.0, 0.95, 0.82), 'emit.tail': (0.85, 0.06, 0.04), 'emit.amber': (1.0, 0.55, 0.08),
    'emit.andon': (1.0, 0.86, 0.5),
})

# ───────────── 形の表（長さ L・幅 W・車輪 r・車輪の位置 yw・上の線） ─────────────
# top：(y, 屋根／ボンネットの高さ)。belt：(y, ベルトラインの高さ)。zones：窓の区切り（y）。inset：上の幅の絞り（ボンネット・屋根）
SPEC = {
    'sedan': dict(L=4.3, W=1.74, r=0.31, yw=(-1.33, 1.32), zb=0.22,
                  top=[(-2.15, 0.8), (-1.6, 0.9), (-0.78, 0.99), (-0.08, 1.42), (0.35, 1.45), (0.78, 1.41), (1.38, 1.03), (1.85, 1.0), (2.15, 0.94)],
                  belt=[(-2.15, 0.76), (-0.78, 0.93), (1.38, 0.99), (2.15, 0.95)],
                  ws=(-0.78, -0.08), roof=(-0.08, 0.78), rear=(0.78, 1.38), bpil=0.42, hood_in=0.1, roof_in=0.21, rearcap=False),
    'kei': dict(L=3.39, W=1.47, r=0.28, yw=(-1.12, 1.15), zb=0.2,
                top=[(-1.695, 0.84), (-1.42, 0.94), (-1.18, 1.0), (-0.52, 1.66), (0.2, 1.7), (1.5, 1.68), (1.695, 1.64)],
                belt=[(-1.695, 0.8), (-1.18, 0.95), (1.695, 1.0)],
                ws=(-1.18, -0.52), roof=(-0.52, 1.6), rear=None, bpil=0.12, hood_in=0.08, roof_in=0.12, rearcap=True),
    'minivan': dict(L=4.6, W=1.76, r=0.32, yw=(-1.47, 1.45), zb=0.2,
                    top=[(-2.3, 0.86), (-1.9, 0.98), (-1.5, 1.06), (-0.62, 1.8), (0.4, 1.84), (2.1, 1.8), (2.3, 1.74)],
                    belt=[(-2.3, 0.82), (-1.5, 1.0), (2.3, 1.06)],
                    ws=(-1.5, -0.62), roof=(-0.62, 2.2), rear=None, bpil=0.18, hood_in=0.1, roof_in=0.14, rearcap=True, slide=True),
    'hatch': dict(L=3.98, W=1.7, r=0.3, yw=(-1.27, 1.25), zb=0.2,
                  top=[(-1.99, 0.8), (-1.5, 0.9), (-0.86, 0.98), (-0.14, 1.46), (0.6, 1.48), (1.32, 1.44), (1.9, 1.1), (1.99, 1.02)],
                  belt=[(-1.99, 0.76), (-0.86, 0.92), (1.99, 1.0)],
                  ws=(-0.86, -0.14), roof=(-0.14, 1.32), rear=(1.32, 1.9), bpil=0.48, hood_in=0.1, roof_in=0.19, rearcap=False),
    'truck': dict(L=3.39, W=1.47, r=0.27, yw=(-0.98, 1.02), zb=0.24,
                  top=[(-1.695, 0.98), (-1.6, 1.04), (-1.36, 1.76), (-0.42, 1.8)],
                  belt=[(-1.695, 0.95), (-1.36, 1.02), (-0.42, 1.04)],
                  ws=(-1.6, -1.36), roof=(-1.36, -0.5), rear=None, bpil=None, hood_in=0.06, roof_in=0.1, rearcap=True, cab=-0.42),
}
SPEC['taxi'] = dict(SPEC['sedan'])


def lerp_tab(tab, y):
    if y <= tab[0][0]:
        return tab[0][1]
    for (y0, a), (y1, b) in zip(tab, tab[1:]):
        if y <= y1:
            t = (y - y0) / max(1e-6, y1 - y0)
            t = t * t * (3 - 2 * t) if (b - a) > 0.25 else t      # 窓の傾きは直線・小さい変化はなめらかに
            return a + (b - a) * t
    return tab[-1][1]


def body(B, S, lod):
    """車体（ロフト）。lod：0／1／2（輪の点と駅の細かさ）"""
    L, W, r = S['L'], S['W'], S['r']
    y0, y1 = -L / 2, (S.get('cab') if S.get('cab') is not None else L / 2)
    step = (0.07, 0.15, 0.34)[lod]
    ys = set()
    n = max(4, int((y1 - y0) / step))
    for i in range(n + 1):
        ys.add(round(y0 + (y1 - y0) * i / n, 4))
    R = r + 0.055
    for yw in S['yw']:                                               # 車輪の切り欠き：円の上の点を駅に
        k = (9, 5, 3)[lod]
        for i in range(k + 1):
            a = math.pi * i / k
            yy = yw - R * math.cos(a)
            if y0 < yy < y1:
                ys.add(round(yy, 4))
    for key in ('ws', 'roof', 'rear'):
        if S.get(key):
            for yy in S[key]:
                if y0 < yy < y1:
                    ys.add(round(yy, 4))
    if S.get('bpil') is not None and lod < 2:
        for d in (-0.05, 0.05):
            ys.add(round(S['bpil'] + d, 4))
    nose = (0.025, 0.07, 0.14, 0.24, 0.36) if lod == 0 else (0.05, 0.16, 0.32) if lod == 1 else (0.1, 0.3)
    for d in nose:
        ys.add(round(y0 + d, 4))
        if not S.get('cab'):
            ys.add(round(y1 - d, 4))
    ys = sorted(y for y in ys if y0 <= y <= y1)

    def zb_at(y):
        z = S['zb'] + (0.06 if (y - y0 < 0.35 or (not S.get('cab') and y1 - y < 0.3)) else 0.0)
        for yw in S['yw']:
            d = abs(y - yw)
            if d < R:
                z = max(z, r + math.sqrt(R * R - d * d))
        return z

    def ring(y):
        zb, zbelt, ztop = zb_at(y), lerp_tab(S['belt'], y), lerp_tab(S['top'], y)
        wb = W / 2
        # 鼻先と尻の丸み：端の駅は幅と高さを縮める
        e = min(y - y0, (y1 - y) if not S.get('cab') else 9)
        if e < 0.4:                                                    # 上から見て丸い角（円の弧）・端ほど低く
            k = e / 0.4
            s = 0.78 + 0.22 * math.sqrt(max(0.0, 1 - (1 - k) ** 2))
            wb *= s
            zb += (1 - k) ** 3 * 0.07
            zbelt -= (1 - k) ** 3 * 0.05
            ztop -= (1 - k) ** 3 * 0.05
        cabin = ztop - zbelt > 0.2
        wt = wb - (S['roof_in'] if cabin else S['hood_in'])
        hi = max(ztop - zbelt, 0.03)
        if lod < 2:
            half = [(0.0, zb), (wb - 0.1, zb), (wb - 0.012, zb + 0.09), (wb + 0.012, zb + 0.45 * (zbelt - zb)), (wb, zbelt - 0.06), (wb - 0.03, zbelt),
                    (wt + 0.02 if cabin else wb - 0.05, zbelt + 0.84 * hi), (wt - 0.07 if cabin else wt - 0.05, zbelt + 0.97 * hi), (0.0, ztop)]
        else:
            half = [(0.0, zb), (wb - 0.06, zb), (wb + 0.005, zb + 0.4 * (zbelt - zb)), (wb - 0.03, zbelt),
                    (wt + 0.02 if cabin else wb - 0.06, zbelt + 0.86 * hi), (0.0, ztop)]
        return half

    rings = [ring(y) for y in ys]
    m = len(rings[0])
    # 片側の輪の点（0..m-1）→ 両側の閉じた輪：左（−x）を下から上、右（+x）を上から下
    vs = []
    for y, h in zip(ys, rings):
        row = [B.bm.verts.new((-x, y, z)) for (x, z) in h] + [B.bm.verts.new((x, y, z)) for (x, z) in reversed(h[1:-1])]
        vs.append(row)
    N = len(vs[0])
    # 面の材質：j＝輪の辺（0..N-1）。辺の種類：左右の対称から片側の番号 q（0＝下・m-2＝てっぺん）
    def side_q(j):
        return j if j < m - 1 else (N - 1 - j)
    roles = {0: 'under', 5: 'win', 6: 'rail', 7: 'top'} if lod < 2 else {0: 'under', 3: 'win', 4: 'top'}
    win_end = S['roof'][1]
    mats = {}
    for i in range(len(ys) - 1):
        ym = (ys[i] + ys[i + 1]) / 2
        hi = lerp_tab(S['top'], ym) - lerp_tab(S['belt'], ym)
        cabin = hi > 0.2
        in_ws = S['ws'][0] <= ym <= S['ws'][1]
        in_rear = bool(S.get('rear')) and S['rear'][0] <= ym <= S['rear'][1]
        for j in range(N):
            role = roles.get(side_q(j), 'body')
            mid = P('carpaint')
            if role == 'under':
                mid = P('black')
            elif role == 'win' and cabin:
                bp = S.get('bpil') is not None and abs(ym - S['bpil']) < 0.05 and lod < 2
                edge = ym < S['ws'][1] + 0.05 or ym > win_end - (0.12 if S.get('rear') else 0.1)
                mid = P('carpaint') if in_rear else (P('black') if (in_ws or bp or edge) else 'glass.dark')
            elif role == 'rail' and cabin:
                mid = 'glass.dark' if in_ws else P('black')
            elif role == 'top' and (in_ws or in_rear):
                mid = 'glass.dark'
            mats[(i, j)] = mid
    for i in range(len(ys) - 1):
        for j in range(N):
            j2 = (j + 1) % N
            f = B.bm.faces.new((vs[i][j], vs[i][j2], vs[i + 1][j2], vs[i + 1][j]))
            B._tag([f], B.mat(mats[(i, j)]))
    # 端のふた（前・後ろ）
    fa = B.bm.faces.new(list(reversed(vs[0])))
    B._tag([fa], B.mat(P('carpaint')))
    fb = B.bm.faces.new(vs[-1])
    B._tag([fb], B.mat(P('carpaint')))
    return ys, zb_at, ring


def wheel(B, x, y, r, w, lod, outward):
    segs = (22, 14, 8)[lod]
    c = Vector((x, y, r))
    d = Vector((1, 0, 0))
    B.cyl(c - d * w / 2, c + d * w / 2, r, r, segs=segs, mid=P('tire'))
    if lod < 2:
        B.cyl(c - d * (w / 2 + 0.004), c + d * (w / 2 + 0.004), r * 0.86, r * 0.86, segs=segs, mid=P('tire'))     # 側面のふくらみ
    o = Vector((outward * (w / 2 + 0.006), 0, 0))
    B.cyl(c + o - d * 0.004, c + o + d * 0.004, r * 0.62, r * 0.62, segs=segs, mid=P('rim'))
    if lod == 0:
        o2 = Vector((outward * (w / 2 + 0.011), 0, 0))
        for k in range(5):                                               # ホイールの 5 本の穴（暗い）
            a = k / 5 * math.tau
            p = c + o2 + Vector((0, math.cos(a) * r * 0.36, math.sin(a) * r * 0.36))
            B.box(p, (0.006, 0.09, 0.13), P('dark'), rot=Euler((a, 0, 0)))
        B.cyl(c + o2 - d * 0.004, c + o2 + d * 0.006, r * 0.15, r * 0.15, segs=10, mid=P('chrome'))


def car(kind, lod):
    S = SPEC[kind]
    L, W, r = S['L'], S['W'], S['r']
    B = Builder('car_%s_%d' % (kind, lod), 451 + lod)
    ys, zb_at, ring = body(B, S, lod)
    y0 = -L / 2
    yb = S.get('cab') if S.get('cab') is not None else L / 2
    belt = lambda y: lerp_tab(S['belt'], y)
    wb = W / 2
    # タイヤハウスの奥（暗い）・車輪
    for yw in S['yw']:
        B.box((0, yw, (0.1 + r + 0.3) / 2 + 0.05), (W - 0.5, 2 * (r + 0.05), r + 0.3 - 0.1), P('black'))
        for s in (-1, 1):
            wheel(B, s * (wb - 0.13), yw, r, 0.19 if kind in ('kei', 'truck') else 0.21, lod, s)
    # 前：前照灯・指示器・グリル・バンパー・ナンバー
    zl = belt(y0 + 0.05) - 0.07
    hw = 0.3 if kind not in ('kei', 'truck') else 0.24
    for s in (-1, 1):
        B.box((s * (wb - 0.08 - hw / 2), y0 + 0.012, zl), (hw, 0.04, 0.11), 'emit.head', bevel=0.012 if lod < 2 else 0)
        if lod < 2:
            B.box((s * (wb - 0.06), y0 + 0.03, zl - 0.02), (0.05, 0.06, 0.06), 'emit.amber')
    if lod < 2:
        B.box((0, y0 + 0.01, zl - 0.01), (W - 2 * hw - 0.3, 0.035, 0.11), P('black'), bevel=0.01)              # グリル
        for k in range(3):
            B.box((0, y0 + 0.002, zl - 0.04 + k * 0.035), (W - 2 * hw - 0.34, 0.01, 0.008), P('chrome'))
    zbum = S['zb'] + 0.18
    B.box((0, y0 + 0.02, zbum), (W - 0.06, 0.12, 0.2), P('carpaint'), bevel=0.04 if lod < 2 else 0)
    B.box((0, y0 + 0.03, S['zb'] + 0.07), (W - 0.2, 0.1, 0.06), P('black'))
    if lod < 2:
        B.box((0, y0 - 0.045, zbum + 0.01), (0.34, 0.012, 0.17), P('plate'))                                      # ナンバー（数字は無い）
        B.box((0, y0 - 0.052, zbum + 0.01), (0.36, 0.004, 0.19), P('black'))
        if lod == 0:
            for dx in (-0.09, -0.03, 0.03, 0.09):                                                                # 読めない印（実在の番号ではない）
                B.box((dx, y0 - 0.0525, zbum - 0.01), (0.035, 0.002, 0.07), P('dark'))
    # 後ろ：尾灯・ナンバー・バンパー（軽トラは荷台の後ろ）
    yr = L / 2
    zt = (belt(yb - 0.05) - 0.1) if kind != 'truck' else 0.62
    for s in (-1, 1):
        B.box((s * (wb - 0.12), yr - 0.012, zt), (0.2 if kind != 'truck' else 0.14, 0.04, 0.16 if kind != 'truck' else 0.2), 'emit.tail', bevel=0.01 if lod < 2 else 0)
        if lod < 2 and S.get('rearcap') and kind != 'truck':
            B.box((s * (wb - 0.06), yr - 0.012, zt + 0.25), (0.06, 0.04, 0.32), 'emit.tail')                     # 縦長の尾灯（ワゴン・ミニバン）
    B.box((0, yr - 0.02, S['zb'] + 0.17), (W - 0.06, 0.12, 0.2), P('carpaint') if kind != 'truck' else P('black'), bevel=0.04 if lod < 2 else 0)
    if lod < 2:
        B.box((0, yr + 0.045, S['zb'] + 0.38 if kind != 'truck' else 0.5), (0.34, 0.012, 0.17), P('plate'))
    # 後ろの窓（箱型の尻：ワゴン・ミニバン）
    if S.get('rearcap') and kind != 'truck':
        zt0, zt1 = belt(yr - 0.05) + 0.06, lerp_tab(S['top'], yr - 0.05) - 0.08
        B.box((0, yr + 0.004, (zt0 + zt1) / 2), (W * 0.72, 0.012, zt1 - zt0), 'glass.dark')
        if lod < 2:
            B.box((0, yr + 0.0, (zt0 + zt1) / 2), (W * 0.76, 0.006, zt1 - zt0 + 0.05), P('black'))
    # 鏡・取っ手・継ぎ目・ワイパー・下の縁
    if lod < 2:
        ym = S['ws'][0] + 0.18
        for s in (-1, 1):
            zm = belt(ym) + 0.08
            B.box((s * (wb + 0.05), ym, zm - 0.02), (0.08, 0.03, 0.03), P('black'))
            B.box((s * (wb + 0.11), ym, zm), (0.06, 0.1, 0.11), P('carpaint'), bevel=0.015)
            B.box((s * (wb + 0.115), ym - 0.051, zm), (0.05, 0.004, 0.09), P('chrome'))
            B.box((s * (wb - 0.01), (y0 + yb) / 2, S['zb'] + 0.07), (0.05, (yb - y0) * 0.55, 0.07), P('black'))   # 下の縁
    if lod == 0:
        doors = []
        if kind == 'truck':
            doors = [S['ws'][1] + 0.02, S['cab'] - 0.04]
        elif kind == 'minivan':
            doors = [S['ws'][0] + 0.06, S['bpil'], S['bpil'] + 1.0, S['roof'][1] - 0.35]
        else:
            doors = [S['ws'][0] + 0.06, S['bpil'], (S['rear'][0] if S.get('rear') else S['roof'][1]) - (0.02 if S.get('rear') else 0.4)]
        for s in (-1, 1):
            for yd in doors:
                z0d, z1d = zb_at(yd) + 0.1, belt(yd) - 0.02
                if z1d - z0d > 0.15:
                    B.box((s * (wb + 0.0135), yd, (z0d + z1d) / 2), (0.005, 0.01, z1d - z0d), P('black'))
            for yh in ([doors[0] + 0.62, doors[1] + 0.5] if kind not in ('truck',) else [doors[0] + 0.5]):
                B.box((s * (wb + 0.012), yh, belt(yh) - 0.12), (0.012, 0.13, 0.03), P('chrome'))
        # ワイパー（前の窓の下の縁）
        zw = lerp_tab(S['top'], S['ws'][0] + 0.06) + 0.012
        tilt = math.atan2(lerp_tab(S['top'], S['ws'][1]) - lerp_tab(S['top'], S['ws'][0]), S['ws'][1] - S['ws'][0])
        for dx in (-0.35, 0.18):
            B.box((dx, S['ws'][0] + 0.07, zw), (0.55, 0.018, 0.012), P('black'), rot=Euler((tilt, 0, 0.18)))
        # 窓の下の光る縁（ベルトラインの金属）
        for s in (-1, 1):
            yy0, yy1 = S['ws'][1] + 0.04, (S['rear'][0] if S.get('rear') else S['roof'][1] - 0.1)
            B.box((s * (wb - 0.025), (yy0 + yy1) / 2, belt((yy0 + yy1) / 2) + 0.004), (0.012, yy1 - yy0, 0.012), P('chrome'))
    # 種類ごと
    if kind == 'taxi':
        zr = lerp_tab(S['top'], 0.3)
        B.box((0, 0.3, zr + 0.03), (0.42, 0.18, 0.06), P('black'))
        B.box((0, 0.3, zr + 0.13), (0.38, 0.13, 0.16), 'emit.andon', bevel=0.02 if lod < 2 else 0)
    if kind == 'truck':
        bz = 0.66
        B.box((0, (S['cab'] + yr) / 2 + 0.02, bz), (W - 0.02, yr - S['cab'] - 0.04, 0.06), P('bed'))             # 荷台の床
        B.box((0, (S['cab'] + yr) / 2, bz - 0.2), (W - 0.3, yr - S['cab'] - 0.4, 0.34), P('black'))             # 床の下の枠
        for s in (-1, 1):
            B.box((s * (wb - 0.02), (S['cab'] + yr) / 2 + 0.02, bz + 0.17), (0.04, yr - S['cab'] - 0.04, 0.3), P('carpaint'), bevel=0.008 if lod < 2 else 0)
        B.box((0, yr - 0.02, bz + 0.17), (W - 0.02, 0.04, 0.3), P('carpaint'), bevel=0.008 if lod < 2 else 0)
        B.box((0, S['cab'] + 0.05, bz + 0.5), (W - 0.06, 0.05, 0.95), P('black'))                                   # 鳥居（背の枠）
        if lod < 2:
            for k in range(4):
                B.box((-W / 2 + 0.2 + k * (W - 0.4) / 3, S['cab'] + 0.08, bz + 0.6), (0.03, 0.02, 0.8), P('dark'))
            for k in (1, 2, 3):
                for s in (-1, 1):
                    B.box((s * (wb + 0.002), S['cab'] + k * (yr - S['cab']) / 4, bz + 0.17), (0.006, 0.03, 0.28), P('dark'))  # あおりの金具
        # 運転台の後ろの面のガラス
        zc0, zc1 = belt(S['cab']) + 0.08, lerp_tab(S['top'], S['cab']) - 0.12
        B.box((0, S['cab'] + 0.006, (zc0 + zc1) / 2), (W * 0.6, 0.01, zc1 - zc0), 'glass.dark')
    if S.get('slide') and lod == 0:
        for s in (-1, 1):
            B.box((s * (wb + 0.012), (S['bpil'] + S['roof'][1] - 0.35) / 2 + 0.2, belt(1.0) - 0.04), (0.01, 1.1, 0.012), P('dark'))   # スライドドアの溝
    return B.finish(32)


KINDS = ['sedan', 'kei', 'minivan', 'truck', 'taxi', 'hatch']


def cars():
    return {'variant_lods': [[car(k, l) for l in range(3)] for k in KINDS]}
