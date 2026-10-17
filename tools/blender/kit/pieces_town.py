# -*- coding: utf-8 -*-
"""
境界侵食 P12（環境の写実化）：町と屋内の部品の作り方。build_kit_town.py が build_kit.py の道具（AO・LOD・書き出し）で作る。
pieces.py（山の廃村）と同じ決まり：1 関数＝1 部品・Blender の向き x＝幅・y＝奥行（前＝−y＝three.js の +z）・z＝上・原点＝底の中心（屋根の骨組みは地面＝0）。
材質の名前（描画の側＝shinshoku/world/envkit.js が町の地図帳の枠に置き換える）：
  mat.town.*／mat.int.*（目録の材質）・mat.town.paint#<名>（塗装の色。glTF の色を頂点の色に掛ける）・mat.town.paint#tint（置く時の色で塗る：自販機・車・自転車）
  glass.dark（暗いガラス：艶）・emit.<名>（光る：前照灯・尾灯など）
大きさは shinshoku/world/town.js の手続きの形に合わせた（置き換えても当たり判定・灯り・看板の位置は同じ）。
"""
import math

from mathutils import Vector, Euler

import kitlib
from kitlib import Builder

TAU = math.tau
PAINT = 'mat.town.paint'
COLORS = {
    PAINT + '#tint': (0.86, 0.86, 0.86), PAINT + '#steel': (0.52, 0.55, 0.58), PAINT + '#steel_dark': (0.22, 0.22, 0.25), PAINT + '#dark': (0.1, 0.1, 0.11),
    PAINT + '#yellow': (0.72, 0.56, 0.1), PAINT + '#black': (0.05, 0.05, 0.055), PAINT + '#white': (0.9, 0.9, 0.88), PAINT + '#ivory': (0.84, 0.82, 0.76),
    PAINT + '#tire': (0.05, 0.05, 0.05), PAINT + '#chrome': (0.72, 0.74, 0.76), PAINT + '#gray': (0.48, 0.5, 0.52), PAINT + '#blue': (0.12, 0.28, 0.6),
    PAINT + '#green': (0.16, 0.42, 0.3), PAINT + '#red': (0.62, 0.1, 0.08), PAINT + '#wood': (0.42, 0.28, 0.18), PAINT + '#beige': (0.74, 0.68, 0.58),
    'glass.dark': (0.03, 0.04, 0.06), 'emit.head': (1.0, 0.95, 0.82), 'emit.tail': (0.85, 0.06, 0.04), 'emit.white': (0.9, 0.95, 1.0), 'emit.green': (0.3, 1.0, 0.6),
    'mat.town.concrete': (0.53, 0.52, 0.5), 'mat.town.galv_roof': (0.3, 0.4, 0.45), 'mat.town.siding_metal': (0.62, 0.64, 0.65), 'mat.town.grating': (0.2, 0.2, 0.2),
    'mat.int.vinyl': (0.6, 0.64, 0.62), 'mat.int.metal_panel': (0.7, 0.72, 0.71), 'mat.town.wood_board': (0.27, 0.19, 0.13), 'mat.int.wood_floor': (0.52, 0.38, 0.24),
    'mat.town.panel': (0.68, 0.69, 0.68), 'mat.town.shutter': (0.51, 0.53, 0.55),
}
kitlib.MAT_COLORS.update(COLORS)


def P(n):
    return PAINT + '#' + n


def ring_tube(B, cx, cz, r, rt, mid, axis='y', segs=20, y=0.0):
    """輪（車輪・かご）：中心 (cx, y, cz)・半径 r・管の太さ rt。axis＝輪の面に垂直な軸"""
    pts = []
    for k in range(segs + 1):
        a = k / segs * TAU
        if axis == 'y':
            pts.append(Vector((cx + r * math.cos(a), y, cz + r * math.sin(a))))
        else:
            pts.append(Vector((y, cx + r * math.cos(a), cz + r * math.sin(a))))
    B.tube(pts, [rt] * len(pts), segs=6, mid=mid, cap_end=False)


def wheel(B, x, y, z, r, w, axis='x', hub=PAINT + '#chrome', segs=16):
    """車輪（タイヤ＋ホイール）。axis＝軸の向き"""
    d = Vector((1, 0, 0)) if axis == 'x' else Vector((0, 1, 0))
    c = Vector((x, y, z))
    B.cyl(c - d * w / 2, c + d * w / 2, r, r, segs=segs, mid=P('tire'))
    B.cyl(c - d * (w / 2 + 0.005), c + d * (w / 2 + 0.005), r * 0.62, r * 0.62, segs=segs, mid=hub)
    B.cyl(c - d * (w / 2 + 0.012), c + d * (w / 2 + 0.012), r * 0.18, r * 0.18, segs=8, mid=P('dark'))


# ───────────────────────── 道の部品 ─────────────────────────
def utility_pole(transformer=False):
    """コンクリートの電柱（9m）：根元の黄と黒の巻き・鉄の腕木 2 段と筋交い・白い碍子・足場の釘。transformer＝柱上の変圧器（腕木は x）"""
    B = Builder('upole', 401 + transformer)
    B.cyl((0, 0, 0), (0, 0, 9.0), 0.19, 0.14, segs=16, mid='mat.town.concrete')
    B.cyl((0, 0, 8.98), (0, 0, 9.05), 0.142, 0.1, segs=16, mid='mat.town.concrete')
    for k in range(11):          # 根元の黄と黒の巻き（反射の巻き：細い縞）
        z0 = 0.3 + k * 0.14
        B.cyl((0, 0, z0), (0, 0, z0 + 0.14), 0.197, 0.196, segs=16, mid=P('yellow') if k % 2 == 0 else P('black'), caps=False)
    for z, L, t in ((8.4, 1.6, 0.1), (7.6, 1.0, 0.08)):
        B.box((0, 0, z), (L, t, t), P('steel'), bevel=0.008)
        for s in (-1, 1):
            a = math.atan2(0.45, L * 0.38)
            B.box((s * L * 0.19, 0, z - 0.22), (math.hypot(L * 0.38, 0.45), 0.035, 0.03), P('steel'), rot=Euler((0, s * a, 0)))
    for x in (-0.7, -0.25, 0.25, 0.7):
        for k in range(3):
            B.cyl((x, 0, 8.45 + k * 0.05), (x, 0, 8.49 + k * 0.05), 0.055 - k * 0.006, 0.05 - k * 0.006, segs=10, mid=P('white'))
        B.cyl((x, 0, 8.6), (x, 0, 8.64), 0.025, 0.02, segs=8, mid=P('steel'))
    for x in (-0.42, 0.42):
        for k in range(3):
            B.cyl((x, 0, 7.64 + k * 0.05), (x, 0, 7.68 + k * 0.05), 0.05 - k * 0.006, 0.045 - k * 0.006, segs=10, mid=P('white'))
    for k in range(10):
        z = 2.6 + k * 0.45
        a = (k % 2) * math.pi + math.pi / 2
        B.cyl((math.cos(a) * 0.16, math.sin(a) * 0.16, z), (math.cos(a) * 0.36, math.sin(a) * 0.36, z), 0.014, 0.014, segs=6, mid=P('steel'), caps=False)
    B.box((0, -0.19, 4.2), (0.22, 0.02, 0.3), P('white'))           # 番号の札（字は描画の側の看板）
    if transformer:
        B.cyl((0, 0.42, 6.35), (0, 0.42, 7.25), 0.3, 0.3, segs=18, mid=P('gray'))
        B.cyl((0, 0.42, 7.25), (0, 0.42, 7.32), 0.31, 0.24, segs=18, mid=P('gray'))
        for k in range(6):
            a = k / 6 * TAU
            B.box((math.cos(a) * 0.3, 0.42 + math.sin(a) * 0.3, 6.8), (0.04, 0.04, 0.7), P('gray'), rot=Euler((0, 0, a)))
        for x in (-0.12, 0.0, 0.12):
            B.cyl((x, 0.42, 7.32), (x, 0.42, 7.5), 0.03, 0.022, segs=8, mid=P('white'))
        for z in (6.5, 7.1):
            B.box((0, 0.22, z), (0.12, 0.3, 0.06), P('steel'))
        B.tube([Vector((0.12, 0.42, 7.5)), Vector((0.3, 0.2, 7.9)), Vector((0.5, 0.0, 8.35))], [0.012] * 3, segs=5, mid=P('black'))
        B.tube([Vector((-0.12, 0.42, 7.5)), Vector((-0.35, 0.2, 7.85)), Vector((-0.42, 0.0, 7.62))], [0.012] * 3, segs=5, mid=P('black'))
    return B.finish(30)


def poles():
    return {'variants': [utility_pole(False), utility_pole(True)], 'lods_ratio': [1.0, 0.35]}


def pole_steel():
    """鉄の柱（1m・縦に伸ばして使う）：街灯・中央通りの灯り・標識"""
    B = Builder('spole', 411)
    B.cyl((0, 0, 0), (0, 0, 1.0), 0.075, 0.06, segs=12, mid=P('steel'), caps=False)
    return {'variants': [B.finish(40)], 'lods_ratio': [1.0]}


def lamp_head(reach, wide, seed):
    """住宅地の街灯の腕と灯具（原点＝柱の上・腕は +x へ）。灯りの面は描画の側（光る箱）。wide＝灯具の幅"""
    B = Builder('lamp', seed)
    pts = [Vector((0, 0, -0.35)), Vector((0, 0, 0.0)), Vector((0.12, 0, 0.1)), Vector((reach - 0.18, 0, 0.12)), Vector((reach, 0, 0.1))]
    B.tube(pts, [0.04, 0.04, 0.035, 0.03, 0.03], segs=8, mid=P('steel'))
    B.box((reach, 0, 0.06), (wide, 0.28, 0.08), P('steel_dark'), bevel=0.012, taper=(0.9, 0.85))
    B.box((reach, 0, 0.115), (wide * 0.8, 0.2, 0.04), P('steel_dark'), bevel=0.01)
    B.box((reach, 0, 0.012), (wide * 0.92, 0.25, 0.014), P('dark'))
    B.cyl((0, 0, -0.42), (0, 0, -0.35), 0.06, 0.045, segs=10, mid=P('steel'))
    return B.finish(35)


def lamp_heads():
    return {'variants': [lamp_head(1.0, 0.5, 421), lamp_head(1.8, 0.7, 422)], 'lods_ratio': [1.0, 0.4]}


def lamp_modern_head(reach, seed):
    """中央通り・駅前の高い街灯の腕と LED の灯具（原点＝柱の上）。reach 0＝柱の上に灯具"""
    B = Builder('mlamp', seed)
    if reach > 0:
        pts = [Vector((0, 0, -0.4)), Vector((0, 0, 0.0))]
        for k in range(1, 9):
            t = k / 8
            pts.append(Vector((reach * t, 0, math.sin(t * 1.6) * 0.5 - 0.1 * t * t)))
        B.tube(pts, [0.07, 0.065] + [0.06 - 0.025 * k / 8 for k in range(1, 9)], segs=10, mid=P('steel_dark'))
        hx, hz = reach, math.sin(1.6) * 0.5 - 0.1 - 0.1
    else:
        B.cyl((0, 0, -0.4), (0, 0, 0.15), 0.07, 0.06, segs=10, mid=P('steel_dark'))
        hx, hz = 0.0, 0.25
    B.box((hx, 0, hz + 0.08), (0.95, 0.46, 0.1), P('steel_dark'), bevel=0.02, taper=(0.86, 0.8))
    B.box((hx, 0, hz + 0.02), (0.86, 0.38, 0.03), P('dark'))
    B.box((hx - 0.1, 0, hz + 0.15), (0.4, 0.2, 0.06), P('steel_dark'), bevel=0.015)
    return B.finish(35)


def lamp_moderns():
    return {'variants': [lamp_modern_head(2.4, 431), lamp_modern_head(0.0, 432)], 'lods_ratio': [1.0, 0.4]}


def vending():
    """自販機（0.9×0.8×1.9）：塗装の箱（置く時の色）・商品の窓の枠・ボタンの列・硬貨の口・取り出し口・側面の通気口・足。光る面は描画の側"""
    B = Builder('vend', 441)
    B.box((0, 0.02, 0.97), (0.9, 0.76, 1.86), P('tint'), bevel=0.02)
    B.box((0, 0.0, 1.93), (0.92, 0.8, 0.06), P('tint'), bevel=0.01)
    B.box((0, -0.385, 1.25), (0.82, 0.02, 0.92), P('dark'))                 # 商品の窓の枠（光る面は描画の側：前 0.41）
    for k in range(3):
        z = 0.88 + k * 0.32
        B.box((0, -0.39, z), (0.78, 0.03, 0.025), P('chrome'))
        for i in range(6):
            B.box((-0.3 + i * 0.12, -0.402, z + 0.03), (0.035, 0.012, 0.018), P('white'))
    B.box((0.3, -0.39, 0.62), (0.16, 0.02, 0.3), P('dark'))
    B.box((0.3, -0.402, 0.68), (0.05, 0.01, 0.08), P('chrome'))
    B.box((0, -0.39, 0.3), (0.62, 0.03, 0.2), P('dark'))
    B.box((0, -0.395, 0.38), (0.6, 0.02, 0.025), P('chrome'))
    for s in (-1, 1):
        for k in range(8):
            B.box((s * 0.452, 0.0, 0.2 + k * 0.05), (0.01, 0.5, 0.018), P('dark'))
    for x in (-0.38, 0.38):
        for y in (-0.3, 0.32):
            B.box((x, y, 0.02), (0.08, 0.08, 0.04), P('dark'))
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.4]}


def car(kei=False, seed=451):
    """乗用車（軽／普通）：塗装の体（置く時の色）・面取りした屋根・窓（暗いガラス）・前照灯と尾灯（光る）・バンパー・ナンバー・鏡・車輪。前＝−y"""
    L, W = (3.4, 1.48) if kei else (4.3, 1.75)
    B = Builder('car', seed)
    hl = L / 2
    # 下の体（前後に少し絞る）
    B.box((0, 0, 0.6), (W, L - 0.12, 0.58), P('tint'), bevel=0.06)
    B.box((0, -hl + 0.2, 0.52), (W - 0.04, 0.3, 0.38), P('tint'), bevel=0.05)
    # 屋根と柱（キャビン：上が狭い）
    cab_l, cab_y = (L * 0.6, -0.15) if kei else (L * 0.48, 0.1)
    ch = 0.62 if kei else 0.5
    B.box((0, cab_y, 0.9 + ch / 2), (W - 0.1, cab_l, ch), P('tint'), bevel=0.05, taper=(0.9, 0.82))
    # 窓（横・前・後）
    for s in (-1, 1):
        B.box((s * (W / 2 - 0.035), cab_y, 0.92 + ch * 0.48), (0.02, cab_l * 0.9, ch * 0.72), 'glass.dark', taper=(1.0, 0.86))
    B.box((0, cab_y - cab_l / 2 + 0.02, 0.92 + ch * 0.45), (W - 0.22, 0.02, ch * 0.75), 'glass.dark', rot=Euler((-0.45, 0, 0)))
    B.box((0, cab_y + cab_l / 2 - 0.02, 0.92 + ch * 0.45), (W - 0.24, 0.02, ch * 0.7), 'glass.dark', rot=Euler((0.4, 0, 0)))
    # バンパー・ナンバー・灯り
    for e in (-1, 1):
        B.box((0, e * (hl - 0.01), 0.42), (W - 0.04, 0.1, 0.18), P('dark'), bevel=0.03)
        B.box((0, e * (hl + 0.03), 0.55 if e < 0 else 0.62), (0.33, 0.01, 0.17), P('white'))
        for s in (-1, 1):
            B.box((s * (W / 2 - 0.22), e * (hl - 0.06), 0.72), (0.3, 0.05, 0.12), 'emit.head' if e < 0 else 'emit.tail', bevel=0.01)
    # 鏡・取っ手・下の黒い縁
    for s in (-1, 1):
        B.box((s * (W / 2 + 0.06), cab_y - cab_l / 2 + 0.15, 0.98), (0.1, 0.08, 0.08), P('dark'))
        for y in (-0.3, 0.45):
            B.box((s * (W / 2 + 0.005), y, 0.78), (0.01, 0.16, 0.03), P('chrome'))
        B.box((s * (W / 2 - 0.02), 0, 0.33), (0.04, L - 0.9, 0.08), P('dark'))
    for x in (-W / 2 + 0.12, W / 2 - 0.12):
        for y in (-L * 0.32, L * 0.32):
            wheel(B, x, y, 0.31, 0.31, 0.2, axis='x')
    return B.finish(30)


def cars():
    return {'variants': [car(False, 451), car(True, 452)], 'lods_ratio': [1.0, 0.35]}


def bicycle_town():
    """ママチャリ（立っている）：前かご・荷台・泥よけ・サドル・ハンドル。原点＝底の中心・長い向き＝x（描画の側の自転車と同じ）"""
    B = Builder('bike', 461)
    for wx in (-0.48, 0.48):
        ring_tube(B, wx, 0.31, 0.3, 0.022, P('tire'), axis='y', segs=22)
        ring_tube(B, wx, 0.31, 0.27, 0.008, P('chrome'), axis='y', segs=18)
        for k in range(8):
            a = k / 8 * TAU
            B.cyl((wx, 0, 0.31), (wx + 0.26 * math.cos(a), 0, 0.31 + 0.26 * math.sin(a)), 0.003, 0.003, segs=3, mid=P('chrome'), caps=False)
        B.tube([Vector((wx - 0.25 * math.cos(a0), 0, 0.31 + 0.25 * math.sin(a0))) for a0 in [k / 10 * 2.6 + 0.3 for k in range(11)]], [0.012] * 11, segs=4, mid=P('tint'), cap_end=False)
    J = {'bb': (0.0, 0.3), 'seat': (-0.16, 0.78), 'head': (0.36, 0.86), 'rear': (-0.48, 0.31), 'front': (0.48, 0.31), 'low': (0.3, 0.4)}
    for a, b in (('bb', 'seat'), ('bb', 'low'), ('low', 'head'), ('bb', 'rear'), ('seat', 'rear'), ('head', 'front')):
        B.cyl((J[a][0], 0, J[a][1]), (J[b][0], 0, J[b][1]), 0.019, 0.019, segs=6, mid=P('tint'), caps=False)
    B.box((-0.18, 0, 0.84), (0.25, 0.13, 0.06), P('black'), bevel=0.02)
    B.cyl((0.4, -0.27, 1.0), (0.4, 0.27, 1.0), 0.013, 0.013, segs=6, mid=P('chrome'))
    B.cyl((0.36, 0, 0.86), (0.4, 0, 1.0), 0.016, 0.016, segs=6, mid=P('chrome'))
    for s in (-1, 1):
        B.cyl((0.4, s * 0.24, 1.0), (0.4, s * 0.31, 1.0), 0.02, 0.02, segs=6, mid=P('black'))
    # 前かご（細い格子）
    cx, cz = 0.62, 0.86
    for k in range(5):
        B.box((cx, 0, cz - 0.12 + k * 0.06), (0.3, 0.34, 0.006), P('steel'))
    for x in (cx - 0.15, cx + 0.15):
        for y in (-0.17, 0.17):
            B.box((x, y, cz), (0.01, 0.01, 0.26), P('steel'))
    B.box((cx, 0, cz - 0.13), (0.3, 0.34, 0.01), P('steel'))
    B.box((-0.45, 0, 0.66), (0.3, 0.14, 0.015), P('steel'))       # 荷台
    B.box((0.0, 0.07, 0.3), (0.12, 0.012, 0.12), P('black'))        # くさりのおおい
    B.cyl((0.0, -0.06, 0.3), (0.0, 0.09, 0.3), 0.06, 0.06, segs=10, mid=P('steel'))
    B.cyl((-0.02, -0.05, 0.12), (-0.25, -0.05, 0.02), 0.01, 0.01, segs=4, mid=P('steel'))   # スタンド
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.3]}


def ac_unit():
    """エアコンの室外機（0.8×0.3×0.6）：ファンの丸い格子・側面の熱交換器のひだ・配管（白い保温）・足（前＝−y）"""
    B = Builder('ac', 471)
    B.box((0, 0, 0.32), (0.8, 0.28, 0.56), P('ivory'), bevel=0.012)
    B.box((0.13, -0.142, 0.32), (0.46, 0.006, 0.46), P('dark'))
    B.cyl((0.13, -0.15, 0.32), (0.13, -0.135, 0.32), 0.215, 0.215, segs=24, mid=P('ivory'), caps=False)
    for k in range(7):
        z = 0.14 + k * 0.06
        B.box((0.13, -0.153, z), (0.42, 0.008, 0.008), P('ivory'))
    for k in range(5):
        x = -0.07 + k * 0.1
        B.box((x, -0.153, 0.32), (0.008, 0.008, 0.42), P('ivory'))
    B.cyl((0.13, -0.16, 0.32), (0.13, -0.155, 0.32), 0.04, 0.04, segs=12, mid=P('dark'))
    for k in range(10):
        B.box((-0.25, -0.143, 0.1 + k * 0.045), (0.2, 0.006, 0.012), P('gray'))
    for k in range(9):
        B.box((-0.401, -0.05 + k * 0.025, 0.32), (0.006, 0.012, 0.5), P('gray'))
    B.tube([Vector((-0.3, 0.12, 0.2)), Vector((-0.45, 0.12, 0.2)), Vector((-0.47, 0.12, 0.6)), Vector((-0.47, 0.12, 1.2))], [0.025] * 4, segs=8, mid=P('ivory'))
    for x in (-0.3, 0.3):
        B.box((x, 0, 0.02), (0.06, 0.32, 0.04), P('gray'))
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.35]}


def guardrail():
    """ガードレール（2m の区間：W の形の白い板・支柱 1 本）。原点＝区間の真ん中・長い向き＝x・道の側＝−y"""
    B = Builder('grail', 481)
    prof = [(-0.16, 0.0), (-0.11, -0.04), (-0.05, -0.04), (0.0, 0.0), (0.05, -0.04), (0.11, -0.04), (0.16, 0.0)]
    verts, faces = [], []
    for x in (-1.0, 1.0):
        for (z, y) in prof:
            verts.append((x, y - 0.06, 0.7 + z))
    n = len(prof)
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    B.mesh_from(verts, faces, P('white'))
    verts2 = [(v[0], v[1] + 0.004, v[2]) for v in verts]
    B.mesh_from(verts2, [tuple(reversed(f)) for f in faces], P('white'))
    B.cyl((-0.8, 0.05, 0.0), (-0.8, 0.05, 0.86), 0.05, 0.05, segs=10, mid=P('white'))
    B.box((-0.8, -0.02, 0.7), (0.08, 0.12, 0.2), P('white'))
    for z in (0.66, 0.74):
        B.cyl((-0.8, -0.1, z), (-0.8, -0.05, z), 0.012, 0.012, segs=6, mid=P('steel'))
    return {'variants': [B.finish(40)], 'lods_ratio': [1.0, 0.5]}


def arcade_arch():
    """アーケードの屋根の骨組み（1 つ・6m ごとに置く）：軒 11m（x ±4.7）から棟 13.4m への上弦・弓なりの下弦・斜めの束（ワーレン）・軒の受け。原点＝地面の真ん中"""
    B = Builder('aarch', 491)
    EAVE, RIDGE, HW = 11.0, 13.4, 4.7
    m = P('steel_dark')
    top = [(x, EAVE + (RIDGE - EAVE) * (1 - abs(x) / HW)) for x in [-HW + k * HW / 6 for k in range(13)]]
    bot = [(x, EAVE + 0.15 + 0.85 * (1 - (x / HW) ** 2)) for x in [-HW + k * HW / 6 for k in range(13)]]
    B.tube([Vector((x, 0, z)) for x, z in top], [0.07] * 13, segs=6, mid=m)
    B.tube([Vector((x, 0, z)) for x, z in bot], [0.055] * 13, segs=6, mid=m)
    for k in range(12):
        a = top[k] if k % 2 == 0 else bot[k]
        b = bot[k + 1] if k % 2 == 0 else top[k + 1]
        B.cyl((a[0], 0, a[1]), (b[0], 0, b[1]), 0.03, 0.03, segs=5, mid=m, caps=False)
    for k in range(1, 12):
        B.cyl((top[k][0], 0, top[k][1]), (bot[k][0], 0, bot[k][1]), 0.025, 0.025, segs=5, mid=m, caps=False)
    for s in (-1, 1):
        B.box((s * (HW - 0.05), 0, EAVE - 0.1), (0.3, 0.26, 0.3), m, bevel=0.02)
        B.cyl((s * (HW - 0.1), 0, EAVE - 1.1), (s * (HW - 1.3), 0, EAVE + 0.2), 0.04, 0.04, segs=6, mid=m)
    B.box((0, 0, EAVE + 0.02), (0.18, 0.18, 0.18), m)
    B.box((0, 0, RIDGE + 0.05), (0.3, 0.3, 0.12), m)
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


# ───────────────────────── 屋内 ─────────────────────────
def bench_row():
    """待合の長椅子（4 席・1 本の梁・置く時の色の座面）。長い向き＝x・前＝−y"""
    B = Builder('bench', 501)
    B.box((0, 0.05, 0.36), (2.2, 0.08, 0.06), P('steel'))
    for x in (-0.9, 0.9):
        B.box((x, 0.05, 0.18), (0.06, 0.4, 0.04), P('steel'))
        B.box((x, 0.05, 0.02), (0.06, 0.45, 0.04), P('steel'))
        B.cyl((x, 0.05, 0.02), (x, 0.05, 0.36), 0.025, 0.025, segs=8, mid=P('steel'))
    for k in range(4):
        x = -0.825 + k * 0.55
        B.box((x, -0.02, 0.43), (0.5, 0.44, 0.07), P('tint'), bevel=0.025)
        B.box((x, 0.2, 0.72), (0.5, 0.06, 0.5), P('tint'), bevel=0.025, rot=Euler((0.12, 0, 0)))
        B.box((x, 0.12, 0.42), (0.04, 0.04, 0.06), P('steel'))
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


def hospital_bed():
    """病院のベッド（0.95×2.0）：鉄の枠・柵・頭と足の板（木目）・マットレス・枕・車輪。長い向き＝y"""
    B = Builder('bed', 511)
    B.box((0, 0, 0.42), (0.9, 1.95, 0.08), P('steel'), bevel=0.01)
    B.box((0, 0, 0.55), (0.86, 1.9, 0.18), P('white'), bevel=0.05)
    B.box((0, -0.75, 0.68), (0.6, 0.35, 0.1), P('white'), bevel=0.04)
    B.box((0, 0.2, 0.66), (0.88, 1.2, 0.04), P('beige'), bevel=0.02)
    for e, h in ((-1, 0.95), (1, 0.75)):
        B.box((0, e * 0.99, h / 2 + 0.25), (0.92, 0.04, h), 'mat.int.wood_floor', bevel=0.012)
    for s in (-1, 1):
        for k in range(4):
            B.box((s * 0.47, 0.1, 0.62 + k * 0.07), (0.02, 1.0, 0.018), P('chrome'))
        for y in (-0.85, 0.85):
            B.cyl((s * 0.4, y, 0.06), (s * 0.4, y, 0.42), 0.02, 0.02, segs=6, mid=P('steel'))
            B.cyl((s * 0.4 - 0.04, y, 0.05), (s * 0.4 + 0.04, y, 0.05), 0.05, 0.05, segs=10, mid=P('dark'))
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


def locker():
    """鉄のロッカー（3 列・0.9×0.5×1.8）：扉の通気の切り込み・取っ手・名札"""
    B = Builder('locker', 521)
    B.box((0, 0, 0.9), (0.9, 0.5, 1.8), P('tint'), bevel=0.01)
    for k in range(3):
        x = -0.3 + k * 0.3
        B.box((x, -0.252, 0.92), (0.28, 0.01, 1.72), P('tint'), bevel=0.004)
        for j in range(5):
            B.box((x, -0.26, 1.55 + j * 0.03), (0.16, 0.006, 0.01), P('dark'))
        B.box((x + 0.1, -0.265, 0.95), (0.025, 0.02, 0.12), P('chrome'))
        B.box((x, -0.26, 1.35), (0.1, 0.004, 0.04), P('white'))
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.4]}


def server_rack():
    """研究施設の機械の棚（0.6×1.0×2.0）：黒い枠・網の前扉・中の機械の段・小さな灯り（緑）"""
    B = Builder('rack', 531)
    B.box((0, 0, 1.0), (0.6, 1.0, 2.0), P('black'), bevel=0.01)
    for k in range(12):
        z = 0.2 + k * 0.14
        B.box((0, -0.47, z), (0.52, 0.06, 0.11), P('steel_dark'), bevel=0.004)
        for i in range(3):
            B.box((-0.18 + i * 0.05, -0.502, z + 0.02), (0.015, 0.006, 0.012), 'emit.green')
    B.box((0, -0.505, 1.0), (0.56, 0.01, 1.9), 'mat.town.grating')
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.4]}


def desk_pc():
    """事務机（1.2×0.7）と画面・キーボード・椅子"""
    B = Builder('desk', 541)
    B.box((0, 0, 0.72), (1.2, 0.7, 0.04), P('beige'), bevel=0.008)
    B.box((0.45, 0.0, 0.36), (0.3, 0.66, 0.68), P('gray'), bevel=0.008)
    for x, y in ((-0.56, -0.3), (-0.56, 0.3)):
        B.box((x, y, 0.36), (0.04, 0.04, 0.7), P('gray'))
    B.box((-0.1, 0.18, 0.98), (0.56, 0.03, 0.34), P('black'), bevel=0.01)
    B.box((-0.1, 0.165, 0.98), (0.52, 0.005, 0.3), 'glass.dark')
    B.box((-0.1, 0.22, 0.8), (0.08, 0.04, 0.16), P('black'))
    B.box((-0.1, 0.22, 0.745), (0.24, 0.16, 0.01), P('black'))
    B.box((-0.1, -0.1, 0.75), (0.42, 0.14, 0.02), P('dark'))
    B.box((-0.1, -0.62, 0.45), (0.46, 0.44, 0.07), P('dark'), bevel=0.03)
    B.box((-0.1, -0.85, 0.75), (0.44, 0.05, 0.5), P('dark'), bevel=0.03, rot=Euler((-0.1, 0, 0)))
    B.cyl((-0.1, -0.62, 0.08), (-0.1, -0.62, 0.42), 0.025, 0.025, segs=8, mid=P('chrome'))
    for k in range(5):
        a = k / 5 * TAU
        B.box((-0.1 + math.cos(a) * 0.15, -0.62 + math.sin(a) * 0.15, 0.06), (0.3, 0.03, 0.03), P('dark'), rot=Euler((0, 0, a)))
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


# id → (関数, 分類, 日本語, 英語, 分類の言葉, 当たり, LOD の距離)
TOWN_PIECES = {
    'prop.town.utility_pole': (poles, 'prop', 'コンクリートの電柱（腕木・碍子・変圧器つきの 2 種）', 'Concrete utility pole (2 variants)', ['電柱', '町'], 'cyl', [45]),
    'prop.town.pole_steel': (pole_steel, 'prop', '鉄の柱（1m・伸ばして使う）', 'Steel pole (1m, scalable)', ['柱', '町'], 'cyl', [60]),
    'prop.town.lamp_head': (lamp_heads, 'prop', '街灯の腕と灯具（2 種）', 'Street lamp arm and head (2 variants)', ['街灯', '町'], 'none', [30]),
    'prop.town.lamp_modern': (lamp_moderns, 'prop', '中央通りの LED の街灯の腕と灯具（2 種）', 'Avenue LED lamp head (2 variants)', ['街灯', '町'], 'none', [35]),
    'prop.town.vending': (vending, 'prop', '自販機（塗装は置く時の色）', 'Vending machine (tintable)', ['自販機', '町'], 'box', [22]),
    'prop.town.car': (cars, 'prop', '乗用車（普通・軽の 2 種・塗装は置く時の色）', 'Car (sedan / kei, tintable)', ['車', '町'], 'box', [30]),
    'prop.town.bicycle': (bicycle_town, 'prop', 'ママチャリ（前かご・荷台）', 'City bicycle', ['自転車', '町'], 'none', [18]),
    'prop.town.ac_unit': (ac_unit, 'prop', 'エアコンの室外機', 'Air conditioner outdoor unit', ['室外機', '町'], 'box', [20]),
    'prop.town.guardrail': (guardrail, 'prop', 'ガードレール（2m）', 'Guardrail (2m)', ['ガードレール', '町'], 'box', [30]),
    'bld.town.arcade_arch': (arcade_arch, 'building_module', 'アーケードの屋根の骨組み（トラス）', 'Arcade roof truss', ['アーケード', '鉄骨'], 'none', [45]),
    'prop.int.bench_row': (bench_row, 'prop', '待合の長椅子（4 席）', 'Waiting bench row (4 seats)', ['長椅子', '屋内', '病院'], 'box', [18]),
    'prop.int.hospital_bed': (hospital_bed, 'prop', '病院のベッド', 'Hospital bed', ['ベッド', '屋内', '病院'], 'box', [18]),
    'prop.int.locker': (locker, 'prop', '鉄のロッカー（3 列）', 'Steel locker', ['ロッカー', '屋内'], 'box', [18]),
    'prop.int.server_rack': (server_rack, 'prop', '機械の棚（研究施設）', 'Equipment rack', ['機械', '屋内', '研究施設'], 'box', [18]),
    'prop.int.desk_pc': (desk_pc, 'prop', '事務机と画面と椅子', 'Office desk with monitor and chair', ['机', '屋内'], 'box', [18]),
}
