# -*- coding: utf-8 -*-
"""
境界侵食 P16：町の植物（街路樹・庭木・植え込み・生垣・鉢植え・観葉植物・雑草）と瓦礫の部品。
試験マップ（山の廃村：pieces.py の veg.tree.sugi・veg.tree.broadleaf・veg.grass・veg.fern・rock.boulder）と同じ作り方：
  カードの葉（法線は樹冠の外向き）・幹の管（根の張り）・手で作った LOD0／LOD1・遠景の板（IMP：build_kit.py の impostor＝Cycles で 3 方向から撮った絵）・
  頂点の AO（build_kit.py が焼く）・材質の名前＝matgen の材質の id（mat.*：tools/mapkit/matgen/defs_veg.py の新しい葉・樹皮・鉢と、既存の材質）。
1 関数＝1 部品・種で決まる。build_kit_veg.py が build_kit.py の main() で作る（build_kit.py・pieces.py は変えない）。
Blender の向き：x＝幅・y＝奥行（前＝−y）・z＝上。原点＝底の中心。1 単位＝1m。
"""
import math
import random

import bmesh
from mathutils import Vector, Euler, noise

import kitlib
from kitlib import Builder, displace
from pieces import _foliage_normals

TAU = math.tau

# 確かめの絵・テクスチャが無い時の色（kitlib.MAT_COLORS を足すだけ：kitlib は変えない）
kitlib.MAT_COLORS.update({
    'mat.foliage.keyaki': (0.37, 0.31, 0.13), 'mat.foliage.ichou': (0.54, 0.44, 0.15), 'mat.foliage.sakura': (0.41, 0.24, 0.11),
    'mat.foliage.matsu': (0.12, 0.17, 0.09), 'mat.foliage.tsutsuji': (0.19, 0.24, 0.12), 'mat.foliage.hedge': (0.15, 0.23, 0.11),
    'mat.foliage.houseplant': (0.13, 0.22, 0.09), 'mat.foliage.weed': (0.24, 0.28, 0.13), 'mat.bark.sakura': (0.2, 0.14, 0.13),
    'mat.bark.matsu': (0.26, 0.21, 0.18), 'mat.ceramic.terracotta': (0.55, 0.3, 0.17), 'mat.town.concrete': (0.55, 0.54, 0.52),
    'mat.int.tile_white': (0.8, 0.8, 0.78),
})
FOLIAGE = ('mat.foliage.keyaki', 'mat.foliage.ichou', 'mat.foliage.sakura', 'mat.foliage.matsu', 'mat.foliage.tsutsuji', 'mat.foliage.hedge',
           'mat.foliage.houseplant', 'mat.foliage.weed')


def _in_ball(r, inner=0.35):
    while True:
        v = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))
        if inner < v.length <= 1.0:
            return v


def _crown(B, r, lod, center, radii, n, size, mid, limbs=None, zmin=-0.55, up_bias=0.8, radius_fn=None, twig='mat.bark.broadleaf', droop=0.15, hollow=0.0):
    """樹冠のカード（veg.tree.broadleaf と同じ置き方）：楕円体の殻の中に、外向き＋上向きのカード。limbs＝小枝を伸ばす枝の点"""
    c = Vector(center)
    for i in range(n):
        v = _in_ball(r)
        if v.z < zmin:
            continue
        if hollow and Vector((v.x, v.y)).length < hollow and v.z < 0.2:
            continue                                         # 樹冠の下の中は空ける（ケヤキの箒の形）
        rad = 0.55 + 0.45 * v.length
        k = radius_fn(v) if radius_fn else 1.0
        p = Vector((v.x * radii[0] * k, v.y * radii[1] * k, v.z * radii[2])) * rad / max(v.length, 1e-3) * v.length ** 0.4 + c
        out = (p - c).normalized()
        up = (out + Vector((0, 0, up_bias))).normalized()
        side = up.cross(Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))).normalized()
        s = r.uniform(*size) * (1.0 if lod == 0 else 1.5)
        B.card(p - up * s * 0.35, up, side, s, s, mid, bend=droop * s, segs=1)
        if lod == 0 and limbs and i % 3 == 0:
            q = p - up * s * 0.3
            near = min(limbs, key=lambda L: (L - q).length)
            B.cyl(near, q, 0.03, 0.012, segs=3, mid=twig, caps=False)


# ───────────────────────── 木 ─────────────────────────
def tree_keyaki(seed=31, lod=0):
    """ケヤキ（街路樹・社の木）：低い幹から何本もの枝が斜め上へ広がる箒の形。灰色の樹皮・晩秋の葉"""
    r = random.Random(seed)
    B = Builder('keyaki_LOD%d' % lod, seed)
    segs = 10 if lod == 0 else 5
    top = 2.3
    B.tube([Vector((0, 0, -0.6)), Vector((0, 0, 0.4)), Vector((0.04, 0.02, 1.4)), Vector((0.06, 0.03, top))], [0.42, 0.3, 0.27, 0.25], segs=segs, mid='mat.bark.broadleaf', cap_end=False)
    limbs = []
    nl = 6
    for k in range(nl):
        a = k * TAU / nl + r.uniform(-0.3, 0.3)
        out = Vector((math.cos(a), math.sin(a), 0))
        p0 = Vector((0.06, 0.03, top - 0.25))
        p1 = p0 + out * 0.35 + Vector((0, 0, 1.0))
        p2 = out * r.uniform(1.4, 1.9) + Vector((0, 0, r.uniform(4.6, 5.4)))
        p3 = out * r.uniform(2.6, 3.2) + Vector((0, 0, r.uniform(7.6, 8.6)))
        B.tube([p0, p1, p2, p3], [0.17, 0.14, 0.09, 0.035], segs=max(4, segs - 3), mid='mat.bark.broadleaf')
        limbs += [p2, p3]
        if lod == 0:
            for s_ in (-1, 1):
                o2 = Vector((math.cos(a + s_ * 0.55), math.sin(a + s_ * 0.55), 0))
                q = o2 * r.uniform(3.0, 3.6) + Vector((0, 0, r.uniform(6.4, 7.6)))
                B.cyl(p2, q, 0.06, 0.02, segs=4, mid='mat.bark.broadleaf', caps=False)
                limbs.append(q)
    _crown(B, r, lod, (0, 0, 7.0), (3.9, 3.9, 2.6), 380 if lod == 0 else 110, (1.0, 1.45), 'mat.foliage.keyaki', limbs, zmin=-0.5, hollow=0.55)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0, 0, 6.6), up_bias=0.45, mats=FOLIAGE, scale=(3.9, 3.9, 2.6))
    return ob


def tree_ichou(seed=37, lod=0):
    """イチョウ（街路樹）：まっすぐな幹が梢まで通り、枝は斜め上へ。縦長の卵形の樹冠・黄葉"""
    r = random.Random(seed)
    B = Builder('ichou_LOD%d' % lod, seed)
    H = 11.0
    segs = 10 if lod == 0 else 5
    n = 12 if lod == 0 else 5
    pts, rad = [], []
    for i in range(n + 1):
        t = i / n
        z = -0.5 + t * (H - 0.4 + 0.5)
        flare = 1 + 0.5 * max(0.0, 1 - (z + 0.5) / 1.2) ** 2
        pts.append(Vector((0.03 * math.sin(t * 5), 0.02 * math.cos(t * 4), z)))
        rad.append((0.3 * (1 - t) ** 0.9 + 0.03) * flare)
    B.tube(pts, rad, segs=segs, mid='mat.bark.broadleaf')
    limbs = []
    z = 2.6
    ga = r.uniform(0, TAU)
    while z < H - 1.2:
        for b in range(2 if lod == 0 else 1):
            ga += 2.39996
            t = (z - 2.6) / (H - 3.8)
            L = 2.5 * (1 - t) ** 0.8 + 0.7
            d = Vector((math.cos(ga), math.sin(ga), 0.95)).normalized()
            rr = 0.3 * (1 - z / H) ** 0.9 + 0.03
            p0 = Vector((0, 0, z)) + Vector((math.cos(ga), math.sin(ga), 0)) * rr * 0.6
            p1 = p0 + d * L
            B.cyl(p0, p1, 0.035 + 0.03 * L / 3, 0.015, segs=4 if lod == 0 else 3, mid='mat.bark.broadleaf', caps=False)
            limbs += [p0 + d * L * 0.5, p1]
        z += (0.7 if lod == 0 else 1.3) * r.uniform(0.85, 1.15)

    def taper(v):
        zc = 6.4 + v.z * 4.0
        lo = min(1.0, max(0.15, (zc - 2.6) / 2.6))
        hi = min(1.0, max(0.12, (H - zc) / 4.2)) ** 0.8
        return lo * hi
    _crown(B, r, lod, (0, 0, 6.4), (2.8, 2.8, 4.0), 400 if lod == 0 else 115, (0.85, 1.25), 'mat.foliage.ichou', limbs, zmin=-0.92, radius_fn=taper, up_bias=0.9)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0, 0, 6.0), up_bias=0.4, mats=FOLIAGE, scale=(2.8, 2.8, 4.0))
    return ob


def tree_sakura(seed=41, lod=0):
    """桜（公園・庭）：太く少し傾いた幹・横へ大きく広がる枝・低く広い傘の樹冠。横に長い皮目の暗い樹皮・晩秋の紅葉"""
    r = random.Random(seed)
    B = Builder('sakura_LOD%d' % lod, seed)
    segs = 10 if lod == 0 else 5
    base = Vector((0.25, 0.1, 1.9))
    B.tube([Vector((0, 0, -0.5)), Vector((0, 0, 0.5)), Vector((0.15, 0.05, 1.3)), base], [0.44, 0.33, 0.29, 0.26], segs=segs, mid='mat.bark.sakura', cap_end=False)
    limbs = []
    for k in range(5):
        a = k * TAU / 5 + r.uniform(-0.35, 0.35)
        out = Vector((math.cos(a), math.sin(a), 0))
        p1 = base + out * r.uniform(1.3, 1.8) + Vector((0, 0, r.uniform(0.9, 1.4)))
        p2 = base + out * r.uniform(3.0, 3.6) + Vector((0, 0, r.uniform(1.8, 2.3)))
        p3 = base + out * r.uniform(4.0, 4.6) + Vector((0, 0, r.uniform(1.4, 1.9)))      # 先は少し垂れる
        B.tube([base - out * 0.05, p1, p2, p3], [0.2, 0.14, 0.07, 0.03], segs=max(4, segs - 3), mid='mat.bark.sakura')
        limbs += [p1, p2, p3]
        if lod == 0:
            for s_ in (-1, 1):
                o2 = Vector((math.cos(a + s_ * 0.6), math.sin(a + s_ * 0.6), 0))
                q = p1 + o2 * r.uniform(1.5, 2.2) + Vector((0, 0, r.uniform(1.0, 1.6)))
                B.cyl(p1, q, 0.07, 0.02, segs=4, mid='mat.bark.sakura', caps=False)
                limbs.append(q)
    _crown(B, r, lod, (0.25, 0.1, 4.4), (4.4, 4.4, 1.9), 320 if lod == 0 else 100, (1.0, 1.5), 'mat.foliage.sakura', limbs, zmin=-0.6, twig='mat.bark.sakura', up_bias=0.6, droop=0.22, hollow=0.45)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0.25, 0.1, 4.0), up_bias=0.5, mats=FOLIAGE, scale=(4.4, 4.4, 1.9))
    return ob


def tree_matsu(seed=43, lod=0):
    """松（庭木・クロマツの仕立て）：くねった幹・枝の先ごとに平たい「雲」の葉の塊（剪定した段）。亀甲の樹皮"""
    r = random.Random(seed)
    B = Builder('matsu_LOD%d' % lod, seed)
    segs = 8 if lod == 0 else 5
    pts = [Vector(p) for p in ((0, 0, -0.3), (0, 0, 0.3), (0.28, 0.05, 1.1), (0.18, 0.1, 1.9), (-0.22, 0.12, 2.7), (-0.12, 0.0, 3.5), (0.05, -0.05, 4.0))]
    rad = [0.22, 0.19, 0.16, 0.14, 0.12, 0.08, 0.05]
    B.tube(pts, rad, segs=segs, mid='mat.bark.matsu')

    def on_trunk(z):
        for i in range(len(pts) - 1):
            if pts[i].z <= z <= pts[i + 1].z:
                t = (z - pts[i].z) / (pts[i + 1].z - pts[i].z)
                return pts[i].lerp(pts[i + 1], t)
        return pts[-1]
    a0 = r.uniform(0, TAU)
    pads = [(1.5, a0, 1.45), (2.15, a0 + 2.5, 1.25), (2.75, a0 + 4.4, 1.05), (3.3, a0 + 1.3, 0.85), (3.75, a0 + 3.4, 0.6)]
    centers = []
    for (z, a, L) in pads:
        p0 = on_trunk(z)
        out = Vector((math.cos(a), math.sin(a), 0))
        c = p0 + out * L + Vector((0, 0, 0.18))
        mid_ = p0 + out * L * 0.5 + Vector((0, 0, 0.25))
        B.tube([p0, mid_, c], [0.07, 0.05, 0.025], segs=max(4, segs - 3), mid='mat.bark.matsu', cap_end=False)
        centers.append((c, 0.45 + L * 0.32))
    centers.append((pts[-1] + Vector((0, 0, 0.12)), 0.6))
    for (c, pr) in centers:
        m = (26 if lod == 0 else 8) + int(pr * (12 if lod == 0 else 3))
        for k in range(m):
            ang = r.uniform(0, TAU)
            rr = pr * math.sqrt(r.random()) * 0.55
            o = Vector((math.cos(ang), math.sin(ang), 0))
            p = c + o * rr + Vector((0, 0, r.uniform(-0.06, 0.08)))
            up = (o + Vector((0, 0, r.uniform(0.35, 0.9)))).normalized()
            side = Vector((-math.sin(ang), math.cos(ang), 0))
            w = r.uniform(0.5, 0.75) * pr * (1.0 if lod == 0 else 1.35)
            h = (pr - rr) * 0.9 + 0.22
            B.card(p - up * 0.08, up, side, w, h, 'mat.foliage.matsu', bend=0.06, segs=1)
        # 上を向いた面（上から見ても葉の塊）
        for k in range(4 if lod == 0 else 2):
            a = k * TAU / 4 + r.uniform(-0.3, 0.3)
            up = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 1)).normalized()
            B.card(c + Vector((0, 0, -0.05)), up, Vector((-math.sin(a), math.cos(a), 0)), pr * 1.2, pr * 0.45, 'mat.foliage.matsu', segs=1)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0, 0, 2.6), up_bias=0.6, mats=FOLIAGE, scale=(1.6, 1.6, 1.4))
    return ob


def tree_keyaki_piece():
    return {'lods': [tree_keyaki(31, 0), tree_keyaki(31, 1)], 'impostor': True}


def tree_ichou_piece():
    return {'lods': [tree_ichou(37, 0), tree_ichou(37, 1)], 'impostor': True}


def tree_sakura_piece():
    return {'lods': [tree_sakura(41, 0), tree_sakura(41, 1)], 'impostor': True}


def tree_matsu_piece():
    return {'lods': [tree_matsu(43, 0), tree_matsu(43, 1)], 'impostor': True}


# ───────────────────────── 低木・生垣 ─────────────────────────
def _dome(B, center, rx, ry, h, mid, seed, rings=6, segs=16, bulge=0.6, amp=0.04):
    """刈り込んだ植え込みの殻（底のない丸い屋根の形）。UV＝周りの長さ×弧の長さ（m）。縫い目の列は頂点を分ける（UV が 1 周で戻る）"""
    cx, cy, cz = center
    verts, uvs, faces = [], [], []
    off = Vector((seed * 3.1, seed * 1.7, seed * 0.9))
    circ = TAU * (rx + ry) / 2
    for i in range(rings):
        phi = i / rings * (math.pi / 2)
        z = h * math.sin(phi)
        k = math.cos(phi) ** bulge
        for j in range(segs + 1):
            a = (j % segs) / segs * TAU
            p = Vector((math.cos(a) * rx * k, math.sin(a) * ry * k, z))
            d = noise.fractal(p * 2.2 + off, 0.55, 2.1, 3) * amp
            p += Vector((math.cos(a), math.sin(a), 0.5 if i else 0)).normalized() * d
            verts.append((cx + p.x, cy + p.y, cz + max(0.0, p.z) + (0.02 if i == 0 else 0)))
            uvs.append((j / segs * circ, phi * (h + (rx + ry) / 2) / 2))
    top = len(verts)
    verts.append((cx, cy, cz + h + noise.fractal(off, 0.55, 2.1, 3) * amp))
    uvs.append((circ / 2, (math.pi / 2) * (h + (rx + ry) / 2) / 2))
    W = segs + 1
    for i in range(rings - 1):
        for j in range(segs):
            faces.append((i * W + j, i * W + j + 1, (i + 1) * W + j + 1, (i + 1) * W + j))
    for j in range(segs):
        faces.append(((rings - 1) * W + j, (rings - 1) * W + j + 1, top))
    B.mesh_from(verts, faces, mid, uv_given=uvs)
    return (cx, cy, cz)


def _dome_cards(B, r, center, rx, ry, h, n, size, mid):
    """殻の外へ出るカード（輪郭をふわっとさせる）"""
    cx, cy, cz = center
    for k in range(n):
        a = r.uniform(0, TAU)
        phi = r.uniform(0.05, 1.35)
        kk = math.cos(phi) ** 0.6
        p = Vector((cx + math.cos(a) * rx * kk, cy + math.sin(a) * ry * kk, cz + h * math.sin(phi)))
        nrm = Vector((math.cos(a) * math.cos(phi) / max(rx, 0.1), math.sin(a) * math.cos(phi) / max(ry, 0.1), math.sin(phi) / max(h, 0.1))).normalized()
        up = (nrm + Vector((0, 0, 0.5))).normalized()
        side = up.cross(Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))).normalized()
        s = r.uniform(*size)
        B.card(p - up * s * 0.68, up, side, s, s, mid, bend=0.05 * s, segs=1)


def shrub(name, seed, rx, ry, h, lod):
    r = random.Random(seed + lod)
    B = Builder('%s_LOD%d' % (name, lod), seed)
    c = _dome(B, (0, 0, 0), rx, ry, h, 'mat.foliage.hedge', seed, rings=6 if lod == 0 else 3, segs=16 if lod == 0 else 8)
    area = (rx + ry) * h * 3
    _dome_cards(B, r, c, rx, ry, h, int(area * (34 if lod == 0 else 10)) + 4, (0.2, 0.32) if lod == 0 else (0.3, 0.42), 'mat.foliage.tsutsuji')
    ob = B.finish(smooth_angle=80)
    _foliage_normals(ob, (0, 0, h * 0.25), up_bias=0.5, mats=FOLIAGE, scale=(rx, ry, h))
    return ob


def shrubs():
    vs = [(0.55, 0.55, 0.62), (0.95, 0.5, 0.66), (0.36, 0.36, 0.42)]
    return {'variant_lods': [[shrub('tsutsuji%d' % i, 61 + i, *v, 0), shrub('tsutsuji%d' % i, 61 + i, *v, 1)] for i, v in enumerate(vs)]}


def hedge_lod(lod):
    """生垣の 1m の区画（幅 x 1.0・奥行 0.5・高さ 1.0）：伸ばして並べる。刈り込んだ面（殻）＋縁から出る葉のカード"""
    r = random.Random(71 + lod)
    B = Builder('hedge_LOD%d' % lod, 71)
    B.box((0, 0, 0.5), (1.0, 0.5, 1.0), 'mat.foliage.hedge')
    bm = B.bm
    cuts = 4 if lod == 0 else 1
    bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=cuts, use_grid_fill=True)
    off = Vector((5.3, 1.1, 2.7))
    for v in bm.verts:
        if v.co.z < 0.01:
            continue
        p = v.co.copy()
        d = noise.fractal(p * 2.6 + off, 0.55, 2.1, 3) * 0.035
        top = max(0.0, (p.z - 0.8) / 0.2)
        v.co.y *= 1.0 - 0.3 * top * top             # 上の角を丸く（刈り込みの肩）
        v.co.z -= 0.05 * top * (abs(p.y) / 0.25) ** 2
        side = Vector((0, 1 if p.y > 0 else -1, 0)) if abs(p.y) > 0.2 else Vector((0, 0, 1))
        v.co += side * d
        if abs(p.x) > 0.49:
            v.co.x = 0.5 * (1 if p.x > 0 else -1)   # 端は平ら（並べた時にすき間を作らない）
    if lod == 0:
        for k in range(30):                          # 上の縁から出た葉（輪郭をふわっとさせる：刈り込んで少し伸びた所）
            sy = -1 if k % 2 else 1
            top = r.random() < 0.4
            p = Vector((r.uniform(-0.47, 0.47), sy * r.uniform(0.12, 0.2) if top else sy * 0.22, 0.97 if top else r.uniform(0.82, 0.95)))
            nrm = Vector((0, 0, 1)) if top else Vector((0, sy, 0.7)).normalized()
            up = (nrm + Vector((r.uniform(-0.3, 0.3), r.uniform(-0.2, 0.2), 0.4))).normalized()
            side = up.cross(Vector((1, 0.2, 0.1))).normalized()
            s_ = r.uniform(0.2, 0.3)
            B.card(p - up * s_ * 0.75, up, side, s_, s_, 'mat.foliage.tsutsuji', bend=0.03, segs=1)
    ob = B.finish(smooth_angle=80)
    _foliage_normals(ob, (0, 0, 0.35), up_bias=0.4, mats=FOLIAGE, scale=(1.4, 0.4, 0.9))
    return ob


def hedge():
    return {'lods': [hedge_lod(0), hedge_lod(1)]}


def weed():
    """雑草の株（壁ぎわ・あぜ）：十字の 4 枚のカード"""
    B = Builder('weed', 81)
    r = random.Random(81)
    for k in range(4):
        a = k * TAU / 4 + r.uniform(-0.25, 0.25)
        side = Vector((math.cos(a), math.sin(a), 0))
        up = Vector((r.uniform(-0.15, 0.15), r.uniform(-0.15, 0.15), 1))
        B.card((0, 0, -0.03), up, side, r.uniform(0.45, 0.6), r.uniform(0.38, 0.5), 'mat.foliage.weed', bend=0.05, segs=1)
    ob = B.finish(smooth_angle=80)
    me = ob.data
    me.normals_split_custom_set_from_vertices([Vector((0, 0, 1))] * len(me.vertices))
    return {'variants': [ob], 'lods_ratio': [1.0]}


# ───────────────────────── 鉢植え・プランター・観葉植物 ─────────────────────────
def _pot(B, r0, r1, h, mid, segs, rim=0.025):
    B.cyl((0, 0, 0), (0, 0, h), r0, r1, segs=segs, mid=mid, caps=True)
    B.cyl((0, 0, h - 0.045), (0, 0, h + 0.005), r1 + rim, r1 + rim, segs=segs, mid=mid, caps=False)
    B.cyl((0, 0, h - 0.02), (0, 0, h - 0.02), r1 - 0.01, r1 - 0.01, segs=segs, mid=mid, caps=True)  # 土の面（鉢の色を暗くした物＝AO）


def _fan_cards(B, r, base, n, height, spread, mid, w=(0.25, 0.4), lift=0.75):
    """鉢から立ち上がる葉のカード（放射状・外へ垂れる）"""
    for k in range(n):
        a = k * TAU / n + r.uniform(-0.25, 0.25)
        out = Vector((math.cos(a), math.sin(a), 0))
        up = (out * spread + Vector((0, 0, lift + r.uniform(-0.1, 0.15)))).normalized()
        side = Vector((-math.sin(a), math.cos(a), 0))
        hh = height * r.uniform(0.7, 1.05)
        B.card(Vector(base) + out * 0.03, up, side, r.uniform(*w), hh, mid, bend=hh * 0.18, segs=2)


def pot_lod(v, lod):
    r = random.Random(91 + v * 7 + lod)
    B = Builder('pot%d_LOD%d' % (v, lod), 91 + v)
    segs = 14 if lod == 0 else 8
    if v == 0:      # 素焼きの鉢＋丸く刈ったツツジ（玄関・塀の上・店先）
        _pot(B, 0.13, 0.18, 0.3, 'mat.ceramic.terracotta', segs)
        n = 22 if lod == 0 else 8
        _dome_cards(B, r, (0, 0, 0.26), 0.22, 0.22, 0.26, n, (0.2, 0.3) if lod == 0 else (0.28, 0.36), 'mat.foliage.tsutsuji')
    else:           # 背の高い鉢＋大きな葉の植物（店先・階段の横）
        _pot(B, 0.16, 0.21, 0.36, 'mat.ceramic.terracotta', segs)
        _fan_cards(B, r, (0, 0, 0.33), 9 if lod == 0 else 5, 0.75, 0.45, 'mat.foliage.houseplant', w=(0.3, 0.42))
        if lod == 0:
            _fan_cards(B, r, (0, 0, 0.35), 5, 0.95, 0.15, 'mat.foliage.houseplant', w=(0.3, 0.4), lift=1.2)
    ob = B.finish(smooth_angle=50)
    _foliage_normals(ob, (0, 0, 0.35), up_bias=0.5, mats=FOLIAGE, scale=(0.4, 0.4, 0.5))
    return ob


def pots():
    return {'variant_lods': [[pot_lod(v, 0), pot_lod(v, 1)] for v in range(2)]}


def planter_lod(lod):
    """コンクリートの植え込みの箱（1×1×0.7m・伸ばして使う）＋中の刈り込んだ低木"""
    r = random.Random(101 + lod)
    B = Builder('planter_LOD%d' % lod, 101)
    t = 0.07
    for (c, s) in (((0, -0.5 + t / 2, 0.35), (1.0, t, 0.7)), ((0, 0.5 - t / 2, 0.35), (1.0, t, 0.7)), ((-0.5 + t / 2, 0, 0.35), (t, 1.0 - 2 * t, 0.7)), ((0.5 - t / 2, 0, 0.35), (t, 1.0 - 2 * t, 0.7))):
        B.box(c, s, 'mat.town.concrete', bevel=0.006 if lod == 0 else 0)
    B.box((0, 0, 0.3), (1.0 - 2 * t, 1.0 - 2 * t, 0.6), 'mat.town.concrete')       # 中の土の高さまで詰める（下は見えない）
    c = _dome(B, (0, 0, 0.6), 0.4, 0.4, 0.42, 'mat.foliage.hedge', 103, rings=5 if lod == 0 else 3, segs=14 if lod == 0 else 8, amp=0.03)
    _dome_cards(B, r, c, 0.4, 0.4, 0.42, 30 if lod == 0 else 9, (0.24, 0.36) if lod == 0 else (0.34, 0.44), 'mat.foliage.tsutsuji')
    ob = B.finish(smooth_angle=40)
    _foliage_normals(ob, (0, 0, 0.6), up_bias=0.5, mats=FOLIAGE, scale=(0.5, 0.5, 0.45))
    return ob


def planter():
    return {'lods': [planter_lod(0), planter_lod(1)]}


def houseplant_lod(v, lod):
    r = random.Random(111 + v * 5 + lod)
    B = Builder('houseplant%d_LOD%d' % (v, lod), 111 + v)
    segs = 16 if lod == 0 else 8
    if v == 0:      # 床置きの大きな観葉植物（白い陶器の鉢・1.4m）
        _pot(B, 0.18, 0.23, 0.45, 'mat.int.tile_white', segs, rim=0.012)
        _fan_cards(B, r, (0, 0, 0.42), 8 if lod == 0 else 5, 0.7, 0.55, 'mat.foliage.houseplant', w=(0.34, 0.46))
        _fan_cards(B, r, (0, 0, 0.45), 6 if lod == 0 else 3, 1.0, 0.18, 'mat.foliage.houseplant', w=(0.32, 0.44), lift=1.2)
    else:           # 机・棚の上の小さな鉢
        _pot(B, 0.08, 0.1, 0.13, 'mat.int.tile_white', segs, rim=0.008)
        _fan_cards(B, r, (0, 0, 0.12), 7 if lod == 0 else 4, 0.3, 0.6, 'mat.foliage.houseplant', w=(0.14, 0.2))
    ob = B.finish(smooth_angle=50)
    _foliage_normals(ob, (0, 0, 0.5 if v == 0 else 0.15), up_bias=0.5, mats=FOLIAGE, scale=(0.5, 0.5, 0.6))
    return ob


def houseplants():
    return {'variant_lods': [[houseplant_lod(v, 0), houseplant_lod(v, 1)] for v in range(2)]}


# ───────────────────────── 瓦礫（崩れた町のコンクリートの塊） ─────────────────────────
def rubble_chunk(seed, size):
    r = random.Random(seed)
    B = Builder('rubble_v%d' % seed, seed)
    sx, sy, sz = size
    B.box((0, 0, sz / 2), (sx, sy, sz), 'mat.town.concrete')
    bm = B.bm
    bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=3, use_grid_fill=True)
    # 割れた面：ランダムな面で切り落とす（角の欠け）
    for k in range(9):
        nrm = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-0.2, 1))).normalized()
        d = r.uniform(0.24, 0.4) * max(sx, sy, sz)
        c = Vector((0, 0, sz / 2))
        for v in bm.verts:
            s = (v.co - c).dot(nrm)
            if s > d:
                v.co -= nrm * (s - d) * 0.95
    for v in bm.verts:
        if v.co.z < 0:
            v.co.z = 0
    # 鉄筋（割れた面から出た錆びた棒）
    for k in range(3):
        a = r.uniform(0, TAU)
        p0 = Vector((math.cos(a) * sx * 0.25, math.sin(a) * sy * 0.25, sz * r.uniform(0.3, 0.6)))
        d = Vector((math.cos(a), math.sin(a), r.uniform(-0.1, 0.5))).normalized()
        B.cyl(p0, p0 + d * r.uniform(0.45, 0.8) * max(sx, sy), 0.016, 0.014, segs=5, mid='mat.metal.iron_rust', caps=False, jitter=0.3)
    ob = B.finish(smooth_angle=30)
    displace(ob, strength=0.09, scale=0.22, seed=seed, octaves=4, ridged=True)
    return ob


def rubbles():
    return {'variants': [rubble_chunk(1, (1.3, 0.9, 0.32)), rubble_chunk(2, (0.85, 0.75, 0.62)), rubble_chunk(3, (1.1, 0.5, 0.45))], 'lods_ratio': [1.0, 0.3]}


# id → (作り方, 分類, 日本語名, 英語名, タグ, 当たり（none|cyl|box）, LOD の距離 m)
VEG_PIECES = {
    'veg.tree.keyaki': (tree_keyaki_piece, 'vegetation', 'ケヤキ（街路樹・カードの葉・LOD・遠景の板）', 'Zelkova (street tree)', ['ケヤキ', '広葉樹', '街路樹', '木'], 'none', [26, 65]),
    'veg.tree.ichou': (tree_ichou_piece, 'vegetation', 'イチョウ（街路樹・黄葉・LOD・遠景の板）', 'Ginkgo (street tree)', ['イチョウ', '街路樹', '木'], 'none', [26, 65]),
    'veg.tree.sakura': (tree_sakura_piece, 'vegetation', '桜（公園・庭・紅葉・LOD・遠景の板）', 'Cherry tree', ['桜', '広葉樹', '木'], 'none', [24, 60]),
    'veg.tree.matsu': (tree_matsu_piece, 'vegetation', '松（庭木の仕立て・LOD・遠景の板）', 'Garden pine (niwaki)', ['松', '針葉樹', '庭木', '木'], 'none', [20, 50]),
    'veg.shrub.tsutsuji': (shrubs, 'vegetation', 'ツツジの植え込み（刈り込み・3 種）', 'Clipped azalea shrub (3 variants)', ['ツツジ', '植え込み', '低木'], 'none', [18]),
    'veg.hedge': (hedge, 'vegetation', '生垣（1m の区画・伸ばして並べる）', 'Hedge section (1m, scalable)', ['生垣', '低木'], 'box', [20]),
    'veg.weed': (weed, 'vegetation', '雑草の株（4 枚のカード）', 'Weed clump', ['雑草', '下草'], 'none', [14]),
    'veg.pot': (pots, 'vegetation', '鉢植え（素焼きの鉢：丸いツツジ／葉の大きな植物）', 'Potted plants (2 variants)', ['鉢植え', '植木鉢'], 'cyl', [12]),
    'veg.planter': (planter, 'vegetation', 'コンクリートの植え込みの箱（低木つき・伸ばして使う）', 'Concrete planter with shrub', ['植え込み', 'プランター'], 'box', [16]),
    'veg.houseplant': (houseplants, 'vegetation', '観葉植物（床置き／机の上・白い鉢）', 'Houseplant (floor / tabletop)', ['観葉植物', '屋内', '鉢'], 'cyl', [10]),
    'rock.rubble': (rubbles, 'rock', 'コンクリートの瓦礫（鉄筋・3 種）', 'Concrete rubble (rebar, 3 variants)', ['瓦礫', 'コンクリート'], 'box', [16, 40]),
}
