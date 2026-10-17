# -*- coding: utf-8 -*-
"""
わかば kit の部品の作り方（1 関数＝1 部品・種で決まる）。build_kit.py が順に呼んで、AO・LOD・書き出しをする。
各関数は {'variants': [LOD0 の物, ...]} か {'lods': [LOD0, LOD1, ...]}（自分で LOD を作る木など）を返す。
大きさは mapkit/pcg/scatter.js の STANDINS（仮の形）の size に合わせる＝置いた所・当たりが変わらない。
Blender の向き：x＝幅・y＝奥行（前＝−y）・z＝上。原点＝底の中心。
"""
import math
import random

import bpy
from mathutils import Vector, Matrix, Euler, noise

from kitlib import Builder, displace, decimate, join

TAU = math.tau


def euler(x=0, y=0, z=0):
    return Euler((x, y, z)).to_matrix().to_4x4()


# ───────────────────────── 木 ─────────────────────────
def _foliage_normals(ob, center, up_bias=0.5, mats=('mat.foliage.sugi', 'mat.foliage.broadleaf'), scale=(1, 1, 1)):
    """葉のカードの法線を、樹冠の中心から外へ向ける（柔らかい陰影）。幹はそのまま"""
    me = ob.data
    fol = {i for i, m in enumerate(me.materials) if m and m.name in mats}
    c = Vector(center)
    vn = [v.normal.copy() for v in me.vertices]
    for p in me.polygons:
        if p.material_index in fol:
            for vi in p.vertices:
                d = me.vertices[vi].co - c
                d = Vector((d.x / scale[0], d.y / scale[1], d.z / scale[2]))
                n = (d.normalized() + Vector((0, 0, up_bias))).normalized()
                vn[vi] = n
    me.normals_split_custom_set_from_vertices(vn)


def tree_sugi(seed=11, lod=0):
    r = random.Random(seed)
    B = Builder('sugi_LOD%d' % lod, seed)
    H, R, z0 = 14.0, 2.2, 5.2
    n = 14 if lod == 0 else 6
    pts, radii = [], []
    lean = Vector((r.uniform(-0.08, 0.08), r.uniform(-0.08, 0.08), 0))
    for i in range(n + 1):
        t = i / n
        z = -0.6 + t * (H + 0.6)
        flare = 1 + 0.55 * max(0.0, 1 - (z + 0.6) / 1.4) ** 2
        pts.append(Vector((0, 0, z)) + lean * t * t * H * 0.1)
        radii.append((0.31 * (1 - t) ** 0.85 + 0.03) * flare)
    B.tube(pts, radii, segs=12 if lod == 0 else 6, mid='mat.bark.sugi')
    if lod == 0:
        for k in range(9):           # 下の方の枯れ枝の残り
            z = r.uniform(1.6, z0)
            a = r.uniform(0, TAU)
            d = Vector((math.cos(a), math.sin(a), r.uniform(-0.3, 0.1)))
            rr = 0.31 * (1 - z / H) ** 0.85 + 0.03
            p0 = Vector((0, 0, z)) + d.normalized() * rr * 0.8
            B.cyl(p0, p0 + d * r.uniform(0.25, 0.7), 0.03, 0.012, segs=4, mid='mat.bark.sugi', caps=False)
    step = 0.34 if lod == 0 else 0.75
    z = z0
    ga = r.uniform(0, TAU)
    while z < H - 0.3:
        t = (z - z0) / (H - z0)
        cr = R * (1 - t) ** 0.85 * (0.75 + 0.25 * math.sin(min(1, t * 6) * math.pi / 2)) + 0.25
        for b in range(3):
            ga += 2.39996
            a = ga + r.uniform(-0.3, 0.3)
            droop = r.uniform(-0.35, -0.05) + 0.25 * t
            d = Vector((math.cos(a), math.sin(a), droop)).normalized()
            L = cr * r.uniform(0.75, 1.1)
            side = Vector((-math.sin(a), math.cos(a), 0))
            rr = 0.31 * (1 - z / H) ** 0.85 + 0.03
            base = Vector((0, 0, z)) + Vector((math.cos(a), math.sin(a), 0)) * rr * 0.6
            if lod == 0:
                B.cyl(base, base + d * L * 0.7, 0.025, 0.008, segs=3, mid='mat.bark.sugi', caps=False)
            cards = (2 if L > 0.9 else 1) if lod == 0 else 1
            for c in range(cards):
                f0 = 0.08 + c * 0.45
                p = base + d * L * f0
                w = L * (0.95 if lod == 0 else 1.25) * r.uniform(0.85, 1.1)
                h = L * (1 - f0) * (1.05 if lod == 0 else 1.2) + 0.25
                roll = r.uniform(-0.6, 0.6)
                s2 = (side * math.cos(roll) + Vector((0, 0, 1)) * math.sin(roll)).normalized()
                B.card(p, d, s2, w, h, 'mat.foliage.sugi', bend=h * 0.12, segs=2 if lod == 0 else 1)
                if lod == 0 and r.random() < 0.55:
                    s3 = d.cross(s2).normalized()
                    B.card(p + d * 0.1, d, s3, w * 0.7, h * 0.85, 'mat.foliage.sugi', bend=h * 0.1, segs=1)
        z += step * r.uniform(0.85, 1.15)
    for k in range(3 if lod == 0 else 2):    # 梢
        a = k * TAU / 3
        B.card((0, 0, H - 1.6), (0.05 * math.cos(a), 0.05 * math.sin(a), 1), (math.cos(a + 1.57), math.sin(a + 1.57), 0), 0.9, 1.9, 'mat.foliage.sugi', segs=1)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0, 0, (z0 + H) / 2), up_bias=0.35, scale=(1, 1, 2.2))
    return ob


def tree_broadleaf(seed=23, lod=0):
    r = random.Random(seed)
    B = Builder('broad_LOD%d' % lod, seed)
    H = 9.0
    cz, crx, cry, crz = 6.0, 2.9, 2.7, 2.4
    trunk_top = 2.8
    segs = 10 if lod == 0 else 5
    pts = [Vector((0, 0, -0.6)), Vector((0, 0, 0.5)), Vector((0.05, 0.02, 1.5)), Vector((0.1, 0.05, trunk_top))]
    B.tube(pts, [0.36, 0.27, 0.24, 0.22], segs=segs, mid='mat.bark.broadleaf', cap_end=False)
    limbs = []
    for k in range(4):
        a = k * TAU / 4 + r.uniform(-0.4, 0.4)
        out = Vector((math.cos(a), math.sin(a), 0))
        p1 = Vector((0.1, 0.05, trunk_top)) + out * 0.25 + Vector((0, 0, 0.6))
        p2 = Vector((0, 0, cz - 0.4)) + out * crx * 0.45 + Vector((0, 0, r.uniform(-0.3, 0.6)))
        p3 = Vector((0, 0, cz + 0.6)) + out * crx * 0.7
        B.tube([Vector((0.1, 0.05, trunk_top - 0.3)), p1, p2, p3], [0.17, 0.14, 0.09, 0.04], segs=max(4, segs - 3), mid='mat.bark.broadleaf')
        limbs.append((p2, p3))
    N = 320 if lod == 0 else 95
    for i in range(N):
        while True:
            v = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))
            if 0.35 < v.length <= 1.0:
                break
        if v.z < -0.55:
            continue
        rad = 0.55 + 0.45 * v.length
        p = Vector((v.x * crx, v.y * cry, v.z * crz)) * rad / max(v.length, 1e-3) * v.length ** 0.4 + Vector((0, 0, cz))
        out = (p - Vector((0, 0, cz))).normalized()
        up = (out + Vector((0, 0, 0.8))).normalized()
        side = up.cross(Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))).normalized()
        s = r.uniform(1.1, 1.6) * (1.0 if lod == 0 else 1.5)
        B.card(p - up * s * 0.35, up, side, s, s, 'mat.foliage.broadleaf', bend=0.15 * s, segs=1)
        if lod == 0 and i % 3 == 0:
            q = p - up * s * 0.3
            near = min(limbs, key=lambda L: (L[0] - q).length)[0]
            B.cyl(near, q, 0.03, 0.012, segs=3, mid='mat.bark.broadleaf', caps=False)
    ob = B.finish(smooth_angle=60)
    _foliage_normals(ob, (0, 0, cz - 0.5), up_bias=0.45, scale=(crx, cry, crz))
    return ob


def tree_sugi_piece():
    return {'lods': [tree_sugi(11, 0), tree_sugi(11, 1)], 'impostor': True}


def tree_broadleaf_piece():
    return {'lods': [tree_broadleaf(23, 0), tree_broadleaf(23, 1)], 'impostor': True}


def grass_clump():
    B = Builder('grass', 5)
    r = random.Random(5)
    for k in range(3):
        a = k * TAU / 3 + r.uniform(-0.2, 0.2)
        side = Vector((math.cos(a), math.sin(a), 0))
        up = Vector((r.uniform(-0.1, 0.1), r.uniform(-0.1, 0.1), 1))
        B.card((0, 0, -0.03), up, side, 0.62, 0.5, 'mat.foliage.grass', bend=0.06, segs=1)
    ob = B.finish(smooth_angle=80)
    me = ob.data
    me.normals_split_custom_set_from_vertices([Vector((0, 0, 1))] * len(me.vertices))
    return {'variants': [ob], 'lods_ratio': [1.0]}


def fern():
    B = Builder('fern', 9)
    r = random.Random(9)
    for k in range(8):
        a = k * TAU / 8 + r.uniform(-0.25, 0.25)
        out = Vector((math.cos(a), math.sin(a), 0))
        up = (out * 0.75 + Vector((0, 0, 0.65))).normalized()
        side = Vector((-math.sin(a), math.cos(a), 0))
        B.card((0, 0, -0.02), up, side, 0.42, r.uniform(0.6, 0.85), 'mat.foliage.fern', bend=0.28, segs=3)
    ob = B.finish(smooth_angle=80)
    me = ob.data
    me.normals_split_custom_set_from_vertices([(v.co.normalized() + Vector((0, 0, 1.2))).normalized() for v in me.vertices])
    return {'variants': [ob], 'lods_ratio': [1.0]}


# ───────────────────────── 岩 ─────────────────────────
def rock(seed, shape):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0)
    ob = bpy.context.active_object
    ob.name = 'rock_v%d' % seed
    me = ob.data
    sx, sy, sz = shape
    for v in me.vertices:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    displace(ob, strength=0.16, scale=0.6, seed=seed, octaves=4)
    # 割れた面（平らな面をいくつか＝角ばった安山岩）
    rr = random.Random(seed)
    for k in range(7):
        nrm = Vector((rr.uniform(-1, 1), rr.uniform(-1, 1), rr.uniform(-0.3, 1))).normalized()
        d = rr.uniform(0.5, 0.75) * max(sx, sy, sz)
        for v in me.vertices:
            s = v.co.dot(nrm)
            if s > d:
                v.co -= nrm * (s - d) * 0.96
    displace(ob, strength=0.035, scale=0.1, seed=seed + 50, octaves=3)
    zs = [v.co.z for v in me.vertices]
    lo = min(zs)
    cut = lo + (max(zs) - lo) * 0.18
    for v in me.vertices:
        if v.co.z < cut:
            v.co.z = cut - (cut - v.co.z) * 0.15
    # 底を 0 に・大きさを STANDINS の rock.boulder（1.4, 1.1, 0.9）に合わせる
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    kx, ky, kz = 1.4 / (max(xs) - min(xs)), 1.1 / (max(ys) - min(ys)), 0.9 / (max(zs) - z0)
    for v in me.vertices:
        v.co = Vector(((v.co.x - cx) * kx, (v.co.y - cy) * ky, (v.co.z - z0) * kz))
    me.update()
    ob.data.materials.append(__import__('kitlib').get_material('mat.rock.andesite'))
    uv = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        n = p.normal
        a = max(range(3), key=lambda i: abs(n[i]))
        ax = [i for i in range(3) if i != a]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[ax[0]], co[ax[1]])
    for p in me.polygons:
        p.use_smooth = True
    return ob


def rocks():
    return {'variants': [rock(1, (1.0, 0.8, 0.62)), rock(2, (1.0, 0.75, 0.4)), rock(3, (0.85, 0.85, 0.75))], 'lods_ratio': [1.0, 0.25, 0.06]}


# ───────────────────────── 小物 ─────────────────────────
def barrel():
    B = Builder('barrel', 31)
    r = random.Random(31)
    n, H = 18, 0.85
    for i in range(n):
        a0, a1 = i / n * TAU, (i + 1) / n * TAU - 0.012
        inset = r.uniform(0, 0.008)
        rows = 6
        vs = []
        for k in range(rows + 1):
            z = k / rows * H
            rad = 0.27 + 0.03 * math.sin(k / rows * math.pi) - inset
            vs.append([Vector((math.cos(a) * rad, math.sin(a) * rad, z)) for a in (a0, a1)])
        verts, faces, uvs = [], [], []
        for k in range(rows + 1):
            for j in range(2):
                verts.append(vs[k][j]); uvs.append((j * 0.09, vs[k][j].z))
        for k in range(rows):
            faces.append((k * 2, k * 2 + 1, k * 2 + 3, k * 2 + 2))
        B.mesh_from(verts, faces, 'mat.wood.cedar', uv_given=uvs)
    for zc in (0.15, 0.7):
        rad = 0.27 + 0.03 * math.sin(zc / H * math.pi) + 0.006
        B.cyl((0, 0, zc - 0.025), (0, 0, zc + 0.025), rad, rad, segs=18, mid='mat.metal.iron_rust', caps=False)
    B.cyl((0, 0, 0.02), (0, 0, 0.05), 0.265, 0.265, segs=18, mid='mat.wood.planks_silver')
    B.cyl((0, 0, H - 0.06), (0, 0, H - 0.04), 0.262, 0.262, segs=18, mid='mat.wood.planks_silver')
    return {'variants': [B.finish(25)], 'lods_ratio': [1.0, 0.3]}


def crate():
    B = Builder('crate', 37)
    r = random.Random(37)
    W, H, D, t = 0.7, 0.6, 0.7, 0.02
    for side in range(4):
        R = euler(z=side * TAU / 4)
        for k in range(4):
            if side == 1 and k == 3 and True:
                continue          # 1 枚はずれている
            z = 0.04 + k * 0.145
            c = R @ Vector((0, -D / 2 + t / 2, z + 0.06))
            B.box(c, (W - 0.06, t, 0.12), 'mat.wood.planks_silver', rot=Euler((0, 0, side * TAU / 4)), grain='x')
        for s in (-1, 1):
            c = R @ Vector((s * (W / 2 - 0.035), -D / 2 + 0.035, H / 2))
            B.box(c, (0.05, 0.05, H), 'mat.wood.cedar', grain='z', bevel=0.005)
    for k in range(5):
        B.box((0, -D / 2 + 0.07 + k * 0.14, H - 0.01), (W - 0.04, 0.12, t), 'mat.wood.planks_silver', rot=Euler((0, 0, r.uniform(-0.02, 0.02))), grain='x', bevel=0.003)
    B.box((0, 0, 0.01), (W - 0.04, D - 0.04, 0.02), 'mat.wood.planks_silver', grain='x')
    return {'variants': [B.finish(25)], 'lods_ratio': [1.0, 0.25]}


def planks():
    B = Builder('planks', 41)
    r = random.Random(41)
    z = 0.0
    for k in range(8):
        L = r.uniform(1.4, 1.8)
        a = r.uniform(-0.18, 0.18)
        w = r.uniform(0.14, 0.22)
        x = r.uniform(-0.05, 0.05)
        y = r.uniform(-0.2, 0.2)
        th = 0.028
        tilt = r.uniform(-0.05, 0.05)
        B.box((x, y, z + th / 2 + 0.002), (L, w, th), 'mat.wood.planks_silver', rot=Euler((tilt, 0, a)), grain='x', bevel=0.003)
        z += th * r.uniform(0.7, 1.2)
        if k == 4:
            z += 0.04
    B.box((0.5, 0, 0.03), (0.06, 0.6, 0.06), 'mat.wood.cedar', grain='y')
    B.box((-0.5, 0, 0.03), (0.06, 0.6, 0.06), 'mat.wood.cedar', grain='y')
    return {'variants': [B.finish(25)], 'lods_ratio': [1.0, 0.3]}


def debris():
    B = Builder('debris', 43)
    r = random.Random(43)
    # 土と土壁の塊の山
    bpy_mound = []
    for k in range(10):
        c = Vector((r.uniform(-0.45, 0.45), r.uniform(-0.35, 0.35), 0.0))
        s = r.uniform(0.12, 0.28)
        B.box(c + Vector((0, 0, s * 0.35)), (s * r.uniform(1, 1.8), s, s * 0.7), 'mat.wall.tsuchikabe', rot=Euler((r.uniform(-0.4, 0.4), r.uniform(-0.4, 0.4), r.uniform(0, 3))), bevel=0.01)
    for k in range(12):           # 瓦のかけら（曲がった薄い板）
        c = Vector((r.uniform(-0.5, 0.5), r.uniform(-0.4, 0.4), r.uniform(0.05, 0.3)))
        B.box(c, (r.uniform(0.12, 0.26), r.uniform(0.1, 0.2), 0.018), 'mat.roof.kawara', rot=Euler((r.uniform(-0.6, 0.6), r.uniform(-0.6, 0.6), r.uniform(0, 3))), bevel=0.003)
    for k in range(6):            # 小舞（竹）・木の切れ端
        c = Vector((r.uniform(-0.4, 0.4), r.uniform(-0.3, 0.3), r.uniform(0.1, 0.35)))
        B.box(c, (r.uniform(0.5, 1.0), 0.03, 0.02), 'mat.wood.cedar', rot=Euler((r.uniform(-0.3, 0.3), r.uniform(-0.3, 0.3), r.uniform(0, 3))), grain='x')
    B.box((0.05, 0.0, 0.25), (1.05, 0.16, 0.03), 'mat.wood.planks_silver', rot=Euler((0.1, 0.35, 0.4)), grain='x')
    ob = B.finish(30)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.3]}


def beam_fallen():
    B = Builder('beam', 47)
    B.box((0, 0, 0.125), (2.3, 0.22, 0.24), 'mat.wood.cedar', grain='x', bevel=0.012)
    B.box((1.18, 0, 0.12), (0.12, 0.16, 0.18), 'mat.wood.cedar', rot=Euler((0, 0.3, 0.2)), grain='x')
    ob = B.finish(30)
    displace(ob, strength=0.015, scale=0.08, seed=4, keep_bottom=False)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.4]}


def kamado():
    B = Builder('kamado', 53)
    B.box((0, 0, 0.33), (0.9, 0.6, 0.66), 'mat.wall.tsuchikabe', bevel=0.05)
    B.box((0, 0, 0.69), (0.94, 0.64, 0.06), 'mat.stone.granite', bevel=0.01)
    for x in (-0.22, 0.22):
        B.cyl((x, 0, 0.72), (x, 0, 0.8), 0.17, 0.2, segs=14, mid='mat.metal.iron_rust')
        B.cyl((x, 0, 0.8), (x, 0, 0.86), 0.2, 0.15, segs=14, mid='mat.metal.iron_rust')
    for x in (-0.22, 0.22):
        B.box((x, -0.29, 0.2), (0.2, 0.06, 0.2), 'mat.rock.andesite', bevel=0.02)
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.35]}


def tansu():
    B = Builder('tansu', 59)
    W, H, D = 1.0, 1.1, 0.45
    B.box((0, 0.02, H / 2), (W, D - 0.04, H), 'mat.wood.cedar', grain='z', bevel=0.008)
    rows = [(0.08, 0.22), (0.32, 0.22), (0.56, 0.22), (0.8, 0.24)]
    for i, (z0, h) in enumerate(rows):
        out = 0.18 if i == 1 else (0.04 if i == 3 else 0.0)
        for j, (x, w) in enumerate(((-0.25, 0.46), (0.25, 0.46)) if i == 3 else ((0, 0.94),)):
            B.box((x, -D / 2 - 0.005 - out / 2, z0 + h / 2), (w - 0.02, 0.03 + out, h - 0.02), 'mat.wood.planks_silver', grain='x', bevel=0.004)
            for hx in ((x - w * 0.25, x + w * 0.25) if w > 0.6 else (x,)):
                B.box((hx, -D / 2 - 0.03 - out, z0 + h / 2), (0.09, 0.015, 0.025), 'mat.metal.iron_rust')
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.35]}


def irori():
    B = Builder('irori', 61)
    S, t = 0.9, 0.09
    for k in range(4):
        R = Euler((0, 0, k * TAU / 4))
        c = R.to_matrix() @ Vector((0, -S / 2 + t / 2, 0.05))
        B.box(c, (S, t, 0.1), 'mat.wood.cedar', rot=R, grain='x', bevel=0.006)
    B.box((0, 0, 0.02), (S - 2 * t, S - 2 * t, 0.04), 'mat.ground.dirt_path')
    for k in range(3):
        a = k * TAU / 3
        B.cyl((0.18 * math.cos(a), 0.18 * math.sin(a), 0.04), (0.14 * math.cos(a), 0.14 * math.sin(a), 0.2), 0.012, 0.012, segs=4, mid='mat.metal.iron_rust', caps=False)
    B.cyl((0, 0, 0.2), (0, 0, 0.32), 0.14, 0.16, segs=14, mid='mat.metal.iron_rust')
    B.cyl((0, 0, 0.32), (0, 0, 0.36), 0.16, 0.06, segs=14, mid='mat.metal.iron_rust')
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.4]}


def futon():
    B = Builder('futon', 67)
    B.box((0, 0, 0.09), (0.95, 1.85, 0.16), 'mat.fabric.futon', bevel=0.05)
    B.box((0.1, 0.55, 0.2), (0.85, 0.7, 0.14), 'mat.fabric.futon', rot=Euler((0.25, 0.05, 0.15)), bevel=0.05)
    ob = B.finish(60)
    displace(ob, strength=0.05, scale=0.25, seed=7, keep_bottom=True)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.4]}


def shelf_fallen():
    B = Builder('shelf', 71)
    # 倒れた棚（背を下に・少し傾く）
    L, W, Dp = 1.6, 0.8, 0.35
    rot = Euler((0, 0.0, 0.0))
    for s in (-1, 1):
        B.box((s * (W / 2 - 0.015), 0, Dp / 2 + 0.02), (0.03, L, Dp), 'mat.wood.cedar', grain='y', bevel=0.004)
    for k in range(5):
        y = -L / 2 + 0.02 + k * (L - 0.04) / 4
        B.box((0, y, Dp / 2 + 0.02), (W - 0.06, 0.025, Dp - 0.02), 'mat.wood.planks_silver', grain='x', bevel=0.003)
    B.box((0, 0, 0.012), (W, L, 0.02), 'mat.wood.planks_silver', grain='y')
    ob = B.finish(30)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.35]}


def shoji_panel(name, lying=False):
    B = Builder(name, 73)
    W, H, T = 0.9, 1.8, 0.035
    fr = 0.045
    # 枠（4 本）
    B.box((0, 0, fr / 2), (W, T, fr), 'mat.wood.cedar', grain='x', bevel=0.004)
    B.box((0, 0, H - fr / 2), (W, T, fr), 'mat.wood.cedar', grain='x', bevel=0.004)
    for s in (-1, 1):
        B.box((s * (W / 2 - fr / 2), 0, H / 2), (fr, T, H), 'mat.wood.cedar', grain='z', bevel=0.004)
    B.box((0, 0, 0.3), (W - 2 * fr, T * 0.9, 0.24), 'mat.wood.planks_silver', grain='x')   # 腰板
    # 紙（両面・透過の破れ）
    verts = [(-W / 2 + fr, 0, 0.42), (W / 2 - fr, 0, 0.42), (W / 2 - fr, 0, H - fr), (-W / 2 + fr, 0, H - fr)]
    uvs = [(v[0] + 0.5, v[2]) for v in verts]
    B.mesh_from(verts, [(0, 1, 2, 3)], 'mat.paper.shoji', uv_given=uvs)
    ob = B.finish(30)
    if lying:
        ob.rotation_euler = (-math.pi / 2 + 0.06, 0, 0.0)
        bpy.context.view_layer.update()
        ob.data.transform(ob.matrix_world)
        ob.matrix_world = Matrix()
        zs = [v.co.z for v in ob.data.vertices]
        ys = [v.co.y for v in ob.data.vertices]
        cy = (min(ys) + max(ys)) / 2
        for v in ob.data.vertices:
            v.co.z -= min(zs)
            v.co.y -= cy
    return ob


def door_fallen():
    return {'variants': [shoji_panel('door_fallen', lying=True)], 'lods_ratio': [1.0, 0.5]}


def door_shoji():
    return {'variants': [shoji_panel('door_shoji')], 'lods_ratio': [1.0, 0.5]}


def window_koshi():
    B = Builder('koshi', 79)
    W, H, T = 1.2, 0.8, 0.05
    B.box((0, 0, 0.02), (W, T, 0.04), 'mat.wood.cedar', grain='x')
    B.box((0, 0, H - 0.02), (W, T, 0.04), 'mat.wood.cedar', grain='x')
    n = 17
    r = random.Random(79)
    for i in range(n):
        x = -W / 2 + 0.03 + i * (W - 0.06) / (n - 1)
        if r.random() < 0.12:
            continue                          # 折れて無い桟
        B.box((x, 0, H / 2), (0.028, T * 0.7, H - 0.06), 'mat.wood.cedar', grain='z')
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0, 0.3]}


def post():
    B = Builder('post', 83)
    B.box((0, 0, 0.5), (0.12, 0.12, 1.0), 'mat.wood.cedar', grain='z', bevel=0.008)
    return {'variants': [B.finish(30)], 'lods_ratio': [1.0]}


def wall_panel(v):
    """土壁の 1 区画（1m×1m・厚さ 0.12）。v0＝ひびだけ・v1＝小さな穴・v2＝大きな穴・v3＝ほぼ落ちて小舞（竹の格子）が見える。描画の側で区画の幅・高さに伸ばす"""
    import bmesh
    r = random.Random(100 + v)
    B = Builder('wall_v%d' % v, 100 + v)
    T = 0.12
    holes = {0: [], 1: [(r.uniform(-0.2, 0.2), r.uniform(0.35, 0.7), 0.16)], 2: [(r.uniform(-0.15, 0.15), r.uniform(0.3, 0.6), 0.3), (r.uniform(-0.3, 0.3), 0.85, 0.1)],
             3: [(0.0, 0.45, 0.42), (-0.25, 0.85, 0.2), (0.3, 0.15, 0.18)]}[v]
    # 壁の面：格子に割って、穴の中の面を消す（縁はぎざぎざ）
    N = 12
    for side, y in ((-1, -T / 2), (1, T / 2)):
        verts, faces, uvs = [], [], []
        idx = {}
        for j in range(N + 1):
            for i in range(N + 1):
                x, z = -0.5 + i / N, j / N
                if 0 < i < N and 0 < j < N:          # 中の点をずらす＝穴の縁が升目に沿わない（両面で同じずらし）
                    jr = random.Random(1000 * v + 37 * i + j)
                    x += (jr.random() - 0.5) * 0.75 / N
                    z += (jr.random() - 0.5) * 0.75 / N
                idx[(i, j)] = len(verts)
                verts.append((x, y, z)); uvs.append((x, z))
        for j in range(N):
            for i in range(N):
                cx, cz = -0.5 + (i + 0.5) / N, (j + 0.5) / N
                cut = False
                for (hx, hz, hr) in holes:
                    ang = math.atan2(cz - hz, cx - hx)
                    rr = hr * (1 + 0.35 * math.sin(ang * 3 + hx * 10) + 0.2 * math.sin(ang * 7 + hz * 5)) * (0.85 + 0.3 * r.random())
                    if math.hypot(cx - hx, cz - hz) < rr:
                        cut = True
                if cut:
                    continue
                f = (idx[(i, j)], idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)])
                faces.append(tuple(reversed(f)) if side > 0 else f)
        B.mesh_from(verts, faces, 'mat.wall.tsuchikabe', uv_given=uvs)
    # 穴の縁の厚み（荒壁の断面）：穴の縁の升目に小さな箱
    for (hx, hz, hr) in holes:
        for k in range(int(hr * 34)):
            a = k / max(1, int(hr * 34)) * TAU
            rr = hr * (1 + 0.35 * math.sin(a * 3 + hx * 10) + 0.2 * math.sin(a * 7 + hz * 5))
            x, z = hx + math.cos(a) * rr, hz + math.sin(a) * rr
            if -0.48 < x < 0.48 and 0.02 < z < 0.98:
                B.box((x, 0, z), (0.07, T * 0.98, 0.07), 'mat.wall.tsuchikabe', rot=Euler((0, a, 0)))
    if holes:
        # 小舞（竹の格子）＝穴の所だけ
        for (hx, hz, hr) in holes:
            for k in range(-6, 7):
                x = hx + k * 0.045
                if abs(k * 0.045) < hr * 1.1 and -0.48 < x < 0.48:
                    B.box((x, 0.0, hz), (0.014, 0.012, min(0.96, hr * 2.2)), 'mat.wood.cedar', grain='z')
                z = hz + k * 0.045
                if abs(k * 0.045) < hr * 1.1 and 0.02 < z < 0.98:
                    B.box((hx, 0.012, z), (min(0.96, hr * 2.2), 0.012, 0.014), 'mat.wood.cedar', grain='x')
    ob = B.finish(40)
    return ob


def wall_panels():
    return {'variants': [wall_panel(v) for v in range(4)], 'lods_ratio': [1.0, 0.4]}


def roof_ridge():
    B = Builder('ridge', 89)
    L = 1.0
    for k, (w, z) in enumerate(((0.32, 0.03), (0.28, 0.08), (0.24, 0.13))):
        B.box((0, 0, z), (L, w, 0.05), 'mat.roof.kawara', grain='x', bevel=0.006)
    n = 10
    verts, faces, uvs = [], [], []
    for i in range(2):
        for k in range(n + 1):
            a = k / n * math.pi
            verts.append(((i - 0.5) * L, math.cos(a) * 0.1, 0.16 + math.sin(a) * 0.1))
            uvs.append(((i - 0.5) * L, a * 0.1))
    for k in range(n):
        faces.append((k, k + 1, n + 1 + k + 1, n + 1 + k))
    B.mesh_from(verts, faces, 'mat.roof.kawara', uv_given=uvs)
    return {'variants': [B.finish(50)], 'lods_ratio': [1.0, 0.4]}


# ───────────────────────── 祠 ─────────────────────────
def honden():
    """小さな本殿（流造り風）：高床・板壁・格子戸・前に長い屋根（苔むした瓦）・棟。原点＝床下の底の中心・前＝−y。幅 1.2・奥行 1.1"""
    B = Builder('honden', 97)
    W, D = 1.2, 1.1
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * (W / 2 - 0.06), sy * (D / 2 - 0.06), 0.18), (0.08, 0.08, 0.36), 'mat.wood.cedar', grain='z')
    B.box((0, 0, 0.38), (W + 0.12, D + 0.12, 0.05), 'mat.wood.planks_silver', grain='x', bevel=0.005)
    B.box((0, 0.06, 0.4 + 0.42), (W - 0.1, D - 0.22, 0.84), 'mat.wood.planks_silver', grain='z', bevel=0.004)
    for sx in (-1, 1):
        for sy in (-1, 1):
            B.box((sx * (W / 2 - 0.05), 0.06 + sy * (D / 2 - 0.16), 0.82), (0.07, 0.07, 0.86), 'mat.wood.cedar', grain='z', bevel=0.004)
    for i in range(9):         # 正面の格子戸
        x = -0.4 + i * 0.1
        B.box((x, -D / 2 + 0.1, 0.83), (0.022, 0.03, 0.74), 'mat.wood.cedar', grain='z')
    for z in (0.5, 0.83, 1.16):
        B.box((0, -D / 2 + 0.1, z), (0.86, 0.03, 0.022), 'mat.wood.cedar', grain='x')
    B.box((0, -D / 2 - 0.05, 0.25), (0.8, 0.25, 0.04), 'mat.wood.planks_silver', grain='x')   # 浜床
    # 屋根（前に長い・流造り）：2 枚の曲がった板＋破風板＋棟
    ridge_z = 1.75
    for side, (yf, zf) in ((-1, (-D / 2 - 0.55, 1.08)), (1, (D / 2 + 0.3, 1.22))):
        n = 6
        verts, faces, uvs = [], [], []
        for k in range(n + 1):
            t = k / n
            y = 0.06 + (yf - 0.06) * t
            z = ridge_z + (zf - ridge_z) * t - 0.08 * math.sin(t * math.pi) * (1 if side < 0 else 0.6) + 0.05 * t * t
            for x in (-W / 2 - 0.32, W / 2 + 0.32):
                verts.append((x, y, z)); uvs.append((x, (abs(y - 0.06) ** 2 + (z - ridge_z) ** 2) ** 0.5))
        for k in range(n):
            a, b2 = k * 2, k * 2 + 2
            f = (a, a + 1, b2 + 1, b2) if side > 0 else (a, b2, b2 + 1, a + 1)
            faces.append(f)
        B.mesh_from(verts, faces, 'mat.roof.kawara_moss', uv_given=uvs)
        # 裏の板（下から見える）
        verts2 = [(v[0], v[1], v[2] - 0.06) for v in verts]
        faces2 = [tuple(reversed(f)) for f in faces]
        B.mesh_from(verts2, faces2, 'mat.wood.planks_silver', uv_given=uvs)
        for x in (-W / 2 - 0.32, W / 2 + 0.32):     # 破風（屋根の端の厚み）
            for k in range(n):
                p0 = Vector(verts[k * 2 + (0 if x < 0 else 1)]); p1 = Vector(verts[k * 2 + 2 + (0 if x < 0 else 1)])
                c = (p0 + p1) / 2 - Vector((0, 0, 0.03))
                d = p1 - p0
                B.box(c, (0.04, d.length + 0.01, 0.07), 'mat.wood.cedar', rot=Euler((math.atan2(d.z, d.y), 0, 0)), grain='y')
    B.box((0, 0.06, ridge_z + 0.05), (W + 0.7, 0.16, 0.1), 'mat.roof.kawara', grain='x', bevel=0.01)
    for x in (-0.35, 0, 0.35):        # 鰹木
        B.cyl((x, 0.06 - 0.0, ridge_z + 0.14), (x, 0.06 + 0.0001, ridge_z + 0.14), 0.0, 0.0, segs=3, caps=False) if False else None
        B.box((x, 0.06, ridge_z + 0.14), (0.09, 0.3, 0.08), 'mat.wood.cedar', grain='y', bevel=0.02)
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.35]}


def torii():
    """明神鳥居：柱（朱・根元は黒）・貫・額束・島木・反った笠木（上は黒）。柱の間 3.0m・高さ 3.6m。原点＝柱の間の地面の中心"""
    B = Builder('torii', 101)
    for s in (-1, 1):
        B.cyl((s * 1.5, 0, 0.0), (s * 1.47, 0, 3.25), 0.15, 0.135, segs=16, mid='mat.paint.shu')
        B.cyl((s * 1.5, 0, -0.05), (s * 1.5, 0, 0.32), 0.17, 0.165, segs=16, mid='mat.roof.kawara')   # 根巻き（黒）
        B.cyl((s * 1.5, 0, 0.32), (s * 1.5, 0, 0.36), 0.155, 0.15, segs=16, mid='mat.roof.kawara', caps=False)
    B.box((0, 0, 2.66), (3.6, 0.13, 0.17), 'mat.paint.shu', grain='x', bevel=0.01)
    for s in (-1, 1):
        B.box((s * 1.88, 0, 2.66), (0.08, 0.1, 0.12), 'mat.paint.shu', bevel=0.005)    # くさび
    B.box((0, 0, 2.95), (0.14, 0.12, 0.42), 'mat.paint.shu', grain='z')       # 額束
    B.box((0, -0.08, 2.95), (0.36, 0.04, 0.5), 'mat.wood.planks_silver', grain='z')     # 額
    B.box((0, 0, 3.27), (4.0, 0.22, 0.16), 'mat.paint.shu', grain='x', bevel=0.01)       # 島木
    # 笠木（両端が反る）
    n = 16
    verts, faces = [], []
    for k in range(n + 1):
        x = -2.25 + 4.5 * k / n
        lift = 0.2 * (abs(x) / 2.25) ** 3.2
        for (yy, zz) in ((-0.15, 0.0), (0.15, 0.0), (0.15, 0.2), (-0.15, 0.2)):
            verts.append((x, yy, 3.35 + zz + lift + (0.03 if zz > 0 else 0) * (abs(x) / 2.25)))
    for k in range(n):
        a, b2 = k * 4, (k + 1) * 4
        for e in range(4):
            e2 = (e + 1) % 4
            faces.append((a + e, b2 + e, b2 + e2, a + e2))
    faces.append((0, 3, 2, 1))
    faces.append((n * 4, n * 4 + 1, n * 4 + 2, n * 4 + 3))
    top = [f for i, f in enumerate(faces) if i < n * 4 and i % 4 == 2]
    rest = [f for i, f in enumerate(faces) if not (i < n * 4 and i % 4 == 2)]
    B.mesh_from(verts, rest, 'mat.paint.shu', grain='x')
    B.mesh_from(verts, top, 'mat.roof.kawara', grain='x')
    ob = B.finish(40)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.4]}


def hex_prism(B, z0, z1, r0, r1, mid, segs=6, rot=0.0):
    B.cyl((0, 0, z0), (0, 0, z1), r0, r1, segs=segs, mid=mid, twist=0)


def stone_lantern():
    """石灯籠（春日型・高さ 1.2m）：基礎・竿・中台・火袋（窓）・笠（反り）・宝珠"""
    B = Builder('touro', 103)
    g = 'mat.stone.granite'
    B.cyl((0, 0, 0), (0, 0, 0.12), 0.22, 0.2, segs=6, mid=g)
    B.cyl((0, 0, 0.12), (0, 0, 0.16), 0.16, 0.1, segs=12, mid=g)
    B.cyl((0, 0, 0.16), (0, 0, 0.58), 0.075, 0.07, segs=12, mid=g)
    B.cyl((0, 0, 0.58), (0, 0, 0.62), 0.09, 0.17, segs=12, mid=g)
    B.cyl((0, 0, 0.62), (0, 0, 0.7), 0.19, 0.18, segs=6, mid=g)
    # 火袋（4 本の柱と窓）
    for k in range(6):
        a = k * TAU / 6
        B.box((0.11 * math.cos(a), 0.11 * math.sin(a), 0.82), (0.05, 0.05, 0.24), g, rot=Euler((0, 0, a)))
    B.cyl((0, 0, 0.7), (0, 0, 0.73), 0.15, 0.15, segs=6, mid=g)
    B.cyl((0, 0, 0.92), (0, 0, 0.95), 0.15, 0.16, segs=6, mid=g)
    # 笠（六角・角が反る）
    n = 6
    verts, faces = [], []
    for k in range(n):
        a = k / n * TAU
        verts += [(0.3 * math.cos(a), 0.3 * math.sin(a), 0.98), (0.31 * math.cos(a), 0.31 * math.sin(a), 1.02), (0.06 * math.cos(a), 0.06 * math.sin(a), 1.12)]
    for k in range(n):
        a, b2 = k * 3, ((k + 1) % n) * 3
        faces += [(a, b2, b2 + 1, a + 1), (a + 1, b2 + 1, b2 + 2, a + 2)]
    faces.append(tuple(k * 3 for k in reversed(range(n))))
    faces.append(tuple(k * 3 + 2 for k in range(n)))
    B.mesh_from(verts, faces, g)
    B.cyl((0, 0, 1.12), (0, 0, 1.14), 0.05, 0.04, segs=8, mid=g)
    bpy_s = B
    for k in range(6):
        z = 1.14 + k * 0.012
        rr = 0.045 * math.sin((k + 1) / 7 * math.pi) + 0.005
        B.cyl((0, 0, z), (0, 0, z + 0.012), rr, 0.045 * math.sin((k + 2) / 7 * math.pi) + 0.004, segs=8, mid=g, caps=(k == 5))
    ob = B.finish(40)
    displace(ob, strength=0.006, scale=0.05, seed=9, keep_bottom=True)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.35]}


def komainu():
    """狛犬（オリジナルの簡単な石像）：台座の上に座る。頭・たてがみ・胸・前脚・尾。0.95m"""
    import bmesh
    g = 'mat.stone.granite'
    B = Builder('komainu', 107)
    B.box((0, 0, 0.17), (0.48, 0.62, 0.34), g, bevel=0.02)
    B.box((0, 0, 0.36), (0.42, 0.56, 0.04), g, bevel=0.01)
    ob0 = B.finish(40)
    parts = [ob0]
    def blob(c, s, name, sub=2):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1.0, location=c)
        o = bpy.context.active_object
        o.name = name
        o.scale = s
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
        o.data.materials.append(__import__('kitlib').get_material(g))
        return o
    parts.append(blob((0, 0.08, 0.55), (0.17, 0.2, 0.2), 'body'))
    parts.append(blob((0, -0.06, 0.6), (0.15, 0.13, 0.2), 'chest'))
    parts.append(blob((0, -0.1, 0.82), (0.14, 0.13, 0.13), 'head'))
    parts.append(blob((0, -0.03, 0.8), (0.17, 0.12, 0.16), 'mane'))
    parts.append(blob((0, -0.21, 0.79), (0.07, 0.06, 0.055), 'snout'))
    for s in (-1, 1):
        parts.append(blob((s * 0.08, -0.15, 0.48), (0.05, 0.05, 0.12), 'leg'))
        parts.append(blob((s * 0.09, -0.19, 0.39), (0.06, 0.07, 0.035), 'paw'))
        parts.append(blob((s * 0.14, 0.1, 0.45), (0.06, 0.13, 0.08), 'haunch'))
        parts.append(blob((s * 0.1, -0.2, 0.86), (0.025, 0.02, 0.025), 'eye', sub=2))
    parts.append(blob((0, 0.24, 0.72), (0.05, 0.05, 0.14), 'tail'))
    ob = join(parts, 'komainu')
    displace(ob, strength=0.012, scale=0.04, seed=12, keep_bottom=True)
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        n = p.normal
        a = max(range(3), key=lambda i: abs(n[i]))
        ax = [i for i in range(3) if i != a]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[ax[0]], co[ax[1]])
    return {'variants': [ob], 'lods_ratio': [1.0, 0.25]}


# ───────────────────────── 村の小物 ─────────────────────────
def well():
    """井戸：石の井筒（12 の石）・板の蓋（半分ずれ）・2 本の柱と梁・滑車"""
    B = Builder('well', 109)
    r = random.Random(109)
    for k in range(12):
        a = k / 12 * TAU
        for row in range(2):
            c = Vector((math.cos(a + row * 0.26) * 0.48, math.sin(a + row * 0.26) * 0.48, 0.17 + row * 0.33))
            B.box(c, (0.12, 0.27, 0.3), 'mat.rock.andesite', rot=Euler((0, 0, a + row * 0.26)), bevel=0.025)
    B.box((0, 0, 0.66), (0.5, 0.4, 0.008), 'mat.ground.dirt_path')   # 中の暗い水面の代わり（下げる）
    for k in range(3):
        B.box((-0.15 + k * 0.17, 0.12, 0.68), (0.16, 0.95, 0.03), 'mat.wood.planks_silver', rot=Euler((0, 0, 0.12)), grain='y', bevel=0.003)
    for s in (-1, 1):
        B.box((s * 0.62, 0, 0.9), (0.09, 0.09, 1.8), 'mat.wood.cedar', grain='z', bevel=0.006)
    B.box((0, 0, 1.76), (1.4, 0.1, 0.1), 'mat.wood.cedar', grain='x', bevel=0.006)
    B.cyl((0, -0.06, 1.62), (0, 0.06, 1.62), 0.09, 0.09, segs=12, mid='mat.wood.cedar')
    B.cyl((0, 0, 1.62), (0.02, 0, 0.75), 0.006, 0.006, segs=3, mid='mat.metal.iron_rust', caps=False)
    ob = B.finish(35)
    return {'variants': [ob], 'lods_ratio': [1.0, 0.35]}


def utility_pole():
    """古い木の電柱（8m）：腕木・碍子・足場の釘・小さな札。電線は描画の側で柱どうしを結ぶ"""
    B = Builder('pole', 113)
    B.cyl((0, 0, -0.3), (0, 0, 8.0), 0.13, 0.1, segs=12, mid='mat.wood.cedar')
    B.box((0, 0, 7.5), (1.3, 0.1, 0.1), 'mat.wood.cedar', grain='x', bevel=0.006)
    B.box((0, 0, 7.15), (0.05, 0.05, 0.8), 'mat.wood.cedar', rot=Euler((0, 0.75, 0)), grain='z')
    for x in (-0.55, 0.0, 0.55):
        B.cyl((x, 0, 7.55), (x, 0, 7.72), 0.035, 0.03, segs=8, mid='mat.stone.granite')
    for k in range(10):
        z = 1.8 + k * 0.42
        a = (k % 2) * math.pi
        B.cyl((math.cos(a) * 0.1, math.sin(a) * 0.1, z), (math.cos(a) * 0.32, math.sin(a) * 0.32, z), 0.012, 0.012, segs=4, mid='mat.metal.iron_rust', caps=False)
    B.box((0, -0.125, 2.4), (0.18, 0.012, 0.5), 'mat.metal.tin_rust')
    return {'variants': [B.finish(40)], 'lods_ratio': [1.0, 0.3]}


def sign():
    """色あせた木の立て札（字は読めない）"""
    B = Builder('sign', 127)
    B.box((0, 0, 0.8), (0.08, 0.08, 1.6), 'mat.wood.cedar', grain='z', bevel=0.005)
    B.box((0, -0.05, 1.3), (0.62, 0.025, 0.42), 'mat.wood.planks_silver', rot=Euler((0, 0.06, 0)), grain='x', bevel=0.004)
    B.box((0, -0.03, 1.58), (0.72, 0.18, 0.025), 'mat.wood.planks_silver', rot=Euler((0.3, 0, 0)), grain='x')
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


def bicycle():
    """錆びた自転車（横倒し）"""
    B = Builder('bicycle', 131)
    m = 'mat.metal.iron_rust'
    for wx in (-0.52, 0.52):
        n = 24
        pts = [(wx + 0.33 * math.cos(k / n * TAU), 0.33 * math.sin(k / n * TAU) + 0.36, 0) for k in range(n + 1)]
        B.tube([Vector(p) for p in pts], [0.022] * (n + 1), segs=6, mid=m, cap_end=False)
        for k in range(12):
            a = k / 12 * TAU
            B.cyl((wx, 0.36, 0), (wx + 0.31 * math.cos(a), 0.36 + 0.31 * math.sin(a), 0.0), 0.003, 0.003, segs=3, mid=m, caps=False)
    J = {'bb': (0.0, 0.33), 'seat': (-0.12, 0.85), 'head': (0.42, 0.85), 'rear': (-0.52, 0.36), 'front': (0.52, 0.36)}
    for a, b in (('bb', 'seat'), ('seat', 'head'), ('bb', 'head'), ('bb', 'rear'), ('seat', 'rear'), ('head', 'front')):
        B.cyl((J[a][0], J[a][1], 0.0), (J[b][0], J[b][1], 0.0), 0.018, 0.018, segs=6, mid=m, caps=False)
    B.cyl((0.45, 0.95, -0.25), (0.45, 0.95, 0.25), 0.015, 0.015, segs=6, mid=m)
    B.box((-0.14, 0.9, 0), (0.24, 0.05, 0.1), 'mat.fabric.futon')
    ob = B.finish(40)
    # 横倒し（z＝上にする：y を z に・少し傾く）
    for v in ob.data.vertices:
        x, y, z = v.co
        v.co = Vector((x, -z * 0.9 + y * 0.12, max(0.0, y * 0.12) + z * 0.1 + 0.03 + 0.0))
    zs = [v.co.z for v in ob.data.vertices]
    for v in ob.data.vertices:
        v.co.z -= min(zs)
    ob.data.update()
    return {'variants': [ob], 'lods_ratio': [1.0, 0.3]}


def fence():
    """壊れかけの木の柵（2m）"""
    B = Builder('fence', 137)
    r = random.Random(137)
    for x in (-0.95, 0.0, 0.95):
        B.box((x, 0, 0.55), (0.08, 0.08, 1.1), 'mat.wood.cedar', grain='z', bevel=0.006, rot=Euler((r.uniform(-0.04, 0.04), r.uniform(-0.04, 0.04), 0)))
    B.box((0, -0.05, 0.85), (2.0, 0.025, 0.1), 'mat.wood.planks_silver', grain='x')
    B.box((-0.5, -0.05, 0.4), (1.0, 0.025, 0.1), 'mat.wood.planks_silver', grain='x')
    B.box((0.55, -0.05, 0.28), (1.0, 0.025, 0.1), 'mat.wood.planks_silver', rot=Euler((0, -0.28, 0)), grain='x')
    return {'variants': [B.finish(35)], 'lods_ratio': [1.0, 0.4]}


def ishigaki():
    """石垣（野面積み・2m×1m・奥行 0.5）：不ぞろいの石を 3 段。上に苔"""
    r = random.Random(139)
    objs = []
    k = 0
    for row, (z, h) in enumerate(((0.0, 0.38), (0.36, 0.34), (0.68, 0.3))):
        x = -1.0
        while x < 0.98:
            w = r.uniform(0.28, 0.5)
            w = min(w, 1.0 - x)
            if w < 0.1:
                break
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x + w / 2, r.uniform(-0.02, 0.02), z + h / 2))
            o = bpy.context.active_object
            o.scale = (w * 0.98, 0.5, h * 0.98)
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            sub = o.modifiers.new('s', 'SUBSURF'); sub.levels = 1
            bpy.ops.object.modifier_apply(modifier='s')
            displace(o, strength=0.05, scale=0.12, seed=139 + k, keep_bottom=False)
            o.data.materials.append(__import__('kitlib').get_material('mat.rock.andesite'))
            objs.append(o)
            x += w + 0.01
            k += 1
    ob = join(objs, 'ishigaki')
    me = ob.data
    for v in me.vertices:
        v.co.z = max(0.0, v.co.z)
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        n = p.normal
        a = max(range(3), key=lambda i: abs(n[i]))
        ax = [i for i in range(3) if i != a]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[ax[0]], co[ax[1]])
        p.use_smooth = True
    me.update()
    return {'variants': [ob], 'lods_ratio': [1.0, 0.3]}


# ───────────────────────── 一覧 ─────────────────────────
# id: (作り方, 分類, 名前 ja, en, タグ, 当たり（STANDINS と同じ）, LOD の距離 m（描画の側の既定）)
PIECES = {
    'veg.tree.sugi': (tree_sugi_piece, 'vegetation', '杉（カードの葉・LOD・遠景の板）', 'Japanese cedar (sugi)', ['杉', '針葉樹', '木'], 'none', [28, 70]),
    'veg.tree.broadleaf': (tree_broadleaf_piece, 'vegetation', '広葉樹（カードの葉・LOD・遠景の板）', 'Broadleaf tree', ['広葉樹', '木'], 'none', [26, 65]),
    'veg.grass': (grass_clump, 'vegetation', '草の株（3 枚のカード）', 'Grass clump', ['下草', '草'], 'none', [40]),
    'veg.fern': (fern, 'vegetation', 'シダの株', 'Fern', ['下草', 'シダ'], 'none', [30]),
    'rock.boulder': (rocks, 'rock', '岩（安山岩・3 種）', 'Boulder (andesite, 3 variants)', ['岩'], 'box', [18, 50]),
    'prop.barrel': (barrel, 'prop', '樽', 'Wooden barrel', ['樽', '木'], 'cyl', [14]),
    'prop.crate': (crate, 'prop', '木箱', 'Wooden crate', ['木箱', '木'], 'box', [14]),
    'prop.planks': (planks, 'prop', '板の山', 'Plank pile', ['板', '木'], 'box', [14]),
    'prop.debris': (debris, 'prop', '瓦礫（土壁・瓦・小舞）', 'Rubble pile', ['瓦礫'], 'box', [14]),
    'prop.beam': (beam_fallen, 'prop', '落ちた梁', 'Fallen beam', ['梁', '木'], 'box', [16]),
    'prop.kamado': (kamado, 'prop', 'かまど', 'Kamado stove', ['かまど', '土'], 'box', [12]),
    'prop.tansu': (tansu, 'prop', '箪笥（引き出しが出ている）', 'Tansu chest', ['箪笥', '木'], 'box', [12]),
    'prop.irori': (irori, 'prop', '囲炉裏（鉄瓶と五徳）', 'Irori hearth', ['囲炉裏'], 'none', [12]),
    'prop.futon': (futon, 'prop', '朽ちた布団', 'Rotten futon', ['布団'], 'none', [12]),
    'prop.shelf_fallen': (shelf_fallen, 'prop', '倒れた棚', 'Fallen shelf', ['棚', '木'], 'none', [12]),
    'prop.door_fallen': (door_fallen, 'prop', '倒れた障子', 'Fallen shoji door', ['障子', '建具'], 'none', [14]),
    'bld.jp_house.door_shoji': (door_shoji, 'building_module', '障子（立っている）', 'Shoji door', ['障子', '建具'], 'none', [18]),
    'bld.jp_house.window_koshi': (window_koshi, 'building_module', '格子窓', 'Koshi lattice window', ['格子', '窓'], 'none', [18]),
    'bld.jp_house.post': (post, 'building_module', '柱（1m・伸ばして使う）', 'Timber post (scalable)', ['柱', '木'], 'none', [40]),
    'bld.jp_house.wall_panel': (wall_panels, 'building_module', '土壁の区画（4 種：ひび・穴・大穴・小舞）', 'Earthen wall bay (4 variants)', ['土壁', '壁'], 'none', [20]),
    'bld.jp_house.roof_ridge': (roof_ridge, 'building_module', '瓦の棟（1m）', 'Kawara ridge (1m)', ['瓦', '屋根'], 'none', [30]),
    'bld.shrine.honden': (honden, 'building', '小さな本殿（流造り風）', 'Small shrine (nagare style)', ['祠', '本殿'], 'box', [30]),
    'bld.shrine.torii': (torii, 'building', '鳥居（明神・はがれた朱）', 'Torii gate (myojin)', ['鳥居', '朱'], 'cyl', [40]),
    'prop.stone_lantern': (stone_lantern, 'prop', '石灯籠（春日型）', 'Stone lantern (kasuga)', ['灯籠', '石'], 'box', [20]),
    'prop.komainu': (komainu, 'prop', '狛犬（オリジナルの簡単な石像）', 'Komainu guardian (original, simple)', ['狛犬', '石'], 'box', [20]),
    'prop.well': (well, 'prop', '井戸', 'Well', ['井戸', '石', '木'], 'cyl', [20]),
    'prop.utility_pole': (utility_pole, 'prop', '古い木の電柱', 'Old wooden utility pole', ['電柱', '木'], 'cyl', [60]),
    'prop.sign': (sign, 'prop', '色あせた立て札', 'Weathered sign', ['札', '木'], 'cyl', [16]),
    'prop.bicycle': (bicycle, 'prop', '錆びた自転車（横倒し）', 'Rusted bicycle (fallen)', ['自転車', '錆'], 'none', [14]),
    'prop.fence': (fence, 'prop', '壊れかけの木の柵（2m）', 'Broken wooden fence (2m)', ['柵', '木'], 'box', [20]),
    'prop.ishigaki': (ishigaki, 'prop', '石垣（2m）', 'Stone wall section (2m)', ['石垣', '石'], 'box', [25]),
}
