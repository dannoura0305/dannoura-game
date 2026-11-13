# -*- coding: utf-8 -*-
"""
境界侵食 P20：帰路（kiro・序章の最初の異形）を、利用者の Codex のモデル（incoming/codex/characters/*/source/build_*.py・geometry.py）と同じ作り方
（Blender の網を輪切りの断面でつなぐ・細分化でなめらかに・しわ／縫い目／ボタン／編み目を形で・材質ごとに色）で作り直す。
デザインは今の帰路（P17：tools/blender/enemy/build_enemy.py の kiro・shinshoku/actor/models.js の buildKiro）のまま変えない：
  家に帰る道の途中で置き換えられた住人（docs/shinshoku/ENEMY_AI_SPEC.md §2.1）。卵形ののっぺりした頭（浅い目のくぼみ・鼻のなごり・顔の黒いにじみは
  コードの顔の札 faceMesh）・後退した短い灰色の髪・長い首・ひざまでの紺灰色のコート（立てたえり・えりの返し・前の合わせ・ボタン 4 つ・ベルト・
  ポケットのふた・濃い色のすそと袖口）・長い腕と細長い指・濃い色のズボン（折り目）・黒い靴・マフラー（家の戸の灯りの色＝置く時の色 tint・白い房）・
  左手の買い物袋（生成り・赤い帯・持ち手）とねぎ。
骨はコードの帰路の骨（tools/blender/enemy/rigs/kiro.json：休みの姿勢）と同じ位置・Codex の人型の名前（pelvis・spine・chest・neck・head・upperArmL…）。
動きはゲームのコード（shinshoku/actor/anim.js の kiroPose：歩く・戸を叩く・待つ・押しのけ・つかみ・座り込む・崩れ…）をそのまま使う（glb に動きは入れない）。

  python tools/blender/enemy/build_kiro_codex.py -- <出力フォルダ>        （<出力フォルダ>/kiro/kiro.glb を書く。bpy＝pip install bpy）
  python tools/blender/enemy/convert_codex.py --src <出力フォルダ> --only kiro  （ゲームの包み shinshoku/assets/enemies/codex/kiro(_low).pack.json へ）
出どころ：このスクリプトが一から作る（外の画像・モデル・素材集は使わない）。自作・商用可。
座標：Blender（Z 上・-Y 前・+X がキャラクターの左・m）。rigs/kiro.json は glTF（Y 上・+Z 前）なので (x, -z, y) へ。
"""
import json
import math
import os
import sys

import bpy  # noqa: I001（bpy を先に：bmesh は bpy の後でないと読めない）
import bmesh
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TAU = math.tau


def lin(h):
    c = np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], float) / 255
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


RIG = json.load(open(os.path.join(HERE, 'rigs', 'kiro.json'), encoding='utf-8'))
G = {b['name']: Vector((b['pos'][0], -b['pos'][2], b['pos'][1])) for b in RIG['bones']}
NAME = {'hips': 'pelvis', 'spine': 'spine', 'chest': 'chest', 'neck': 'neck', 'head': 'head',
        'leftUpperArm': 'upperArmL', 'leftLowerArm': 'foreArmL', 'leftHand': 'handL', 'rightUpperArm': 'upperArmR', 'rightLowerArm': 'foreArmR', 'rightHand': 'handR',
        'leftUpperLeg': 'thighL', 'leftLowerLeg': 'shinL', 'leftFoot': 'footL', 'rightUpperLeg': 'thighR', 'rightLowerLeg': 'shinR', 'rightFoot': 'footR'}
P = {NAME[k]: v for k, v in G.items() if k in NAME}                      # Codex の名前 → 休みの位置（Blender の座標）
HC = Vector((0, 0, 1.632))                                               # 頭の真ん中（今の帰路と同じ：顔の札がこの面に乗る）

MATS = {}


def mat(name, hexcol, rough=0.8, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    MATS[name] = m
    return m


# ───────────────────────── 網の道具（Codex の geometry.py と同じ考え：輪切りの断面をつなぐ）
def obj_from(name, vs, fs, material, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in vs], [], fs)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = smooth
    return o


def loft(name, rings, material, n=24, cap0=False, cap1=False, arc=None, subdiv=1, solid=0.0):
    """rings：[(中心 Vector, rx, ry, 角度 → 半径の倍率の関数 or None)]。arc＝(a0, a1) の時は開いた面（すそ・えり）"""
    vs, fs = [], []
    m = n if arc is None else n + 1
    for c, rx, ry, fn in rings:
        for i in range(m):
            a = (i / n) * TAU if arc is None else arc[0] + (arc[1] - arc[0]) * i / n
            k = fn(a) if fn else 1.0
            vs.append(c + Vector((math.sin(a) * rx * k, -math.cos(a) * ry * k, 0)))   # a=0 が前（-Y）
    for r in range(len(rings) - 1):
        for i in range(n if arc is None else n):
            j = (i + 1) % m if arc is None else i + 1
            fs.append((r * m + i, r * m + j, (r + 1) * m + j, (r + 1) * m + i))
    if cap0 and arc is None:
        vs.append(rings[0][0])
        fs += [(len(vs) - 1, (i + 1) % n, i) for i in range(n)]
    if cap1 and arc is None:
        vs.append(rings[-1][0])
        b = (len(rings) - 1) * m
        fs += [(len(vs) - 1, b + i, b + (i + 1) % n) for i in range(n)]
    o = obj_from(name, vs, fs, material)
    if solid:
        md = o.modifiers.new('solid', 'SOLIDIFY')
        md.thickness = solid
        md.offset = -1
    if subdiv:
        md = o.modifiers.new('sub', 'SUBSURF')
        md.levels = subdiv
    return o


def ellipsoid(name, c, r, material, seg=32, ring=20, deform=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1.0)
    for v in bm.verts:
        p = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2]))
        v.co = c + (deform(p) if deform else p)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    return o


def box(name, c, size, material, bevel=0.004, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    me.materials.append(material)
    o.rotation_euler = rot
    o.location = c
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL')
        md.width = bevel
        md.segments = 2
    return o


def cyl(name, a, b, r0, r1, material, n=16, cap=True, subdiv=0):
    """a → b の筒（ボタン）：Z 軸の筒を作って向きを回す"""
    d = b - a
    L = d.length
    rings = [(Vector((0, 0, L * t)), r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, None) for t in (0, 0.5, 1)]
    o = loft(name, rings, material, n=n, cap0=cap, cap1=cap, subdiv=subdiv)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    for v in o.data.vertices:
        v.co = a + q @ v.co
    return o


def capsule_chain(name, pts, radii, material, n=12, subdiv=1):
    """点の列に沿った太さの変わる管（指・ねぎ・持ち手）"""
    vs, fs = [], []
    pts = [Vector(p) for p in pts]
    prev = None
    for i, (p, r) in enumerate(zip(pts, radii)):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(ref).normalized()
        if prev is not None and u.dot(prev) < 0:
            u = -u
        prev = u
        w = t.cross(u).normalized()
        for k in range(n):
            a = k / n * TAU
            vs.append(p + (u * math.cos(a) + w * math.sin(a)) * r)
    for i in range(len(pts) - 1):
        for k in range(n):
            fs.append((i * n + k, i * n + (k + 1) % n, (i + 1) * n + (k + 1) % n, (i + 1) * n + k))
    vs.append(pts[0] - (pts[1] - pts[0]).normalized() * radii[0] * 0.6)
    fs += [(len(vs) - 1, (k + 1) % n, k) for k in range(n)]
    vs.append(pts[-1] + (pts[-1] - pts[-2]).normalized() * radii[-1] * 0.6)
    b = (len(pts) - 1) * n
    fs += [(len(vs) - 1, b + k, b + (k + 1) % n) for k in range(n)]
    o = obj_from(name, vs, fs, material)
    if subdiv:
        md = o.modifiers.new('sub', 'SUBSURF')
        md.levels = subdiv
    return o


def apply_all(o):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    for md in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def displace(o, fn):
    """頂点を法線の向きへ fn(p) だけ動かす（しわ・縫い目・編み目）。細分化の後に"""
    apply_all(o)
    me = o.data
    me.update()
    for v in me.vertices:
        v.co = v.co + v.normal * fn(v.co)
    me.update()


# ───────────────────────── 重み（骨の線分への近さ：部品ごとに使ってよい骨）
SEG = {}


def seg_of(b):
    kids = {'pelvis': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 'upperArmL': 'foreArmL', 'foreArmL': 'handL', 'upperArmR': 'foreArmR', 'foreArmR': 'handR',
            'thighL': 'shinL', 'shinL': 'footL', 'thighR': 'shinR', 'shinR': 'footR'}
    a = P[b]
    if b in kids:
        return a, P[kids[b]]
    tail = {'head': Vector((0, 0, 0.2)), 'handL': Vector((0, 0, -0.14)), 'handR': Vector((0, 0, -0.14)), 'footL': Vector((0, -0.12, -0.03)), 'footR': Vector((0, -0.12, -0.03))}[b]
    return a, a + tail


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-9, ab.dot(ab))))
    return (p - (a + ab * t)).length


def skin(o, bones=None, rigid=None, skirt=False):
    """o へ頂点の組（骨の名前）を書く"""
    apply_all(o)
    groups = {}

    def g(n):
        if n not in groups:
            groups[n] = o.vertex_groups.new(name=n)
        return groups[n]
    hz = P['pelvis'].z
    for v in o.data.vertices:
        p = v.co
        if rigid:
            g(rigid).add([v.index], 1.0, 'REPLACE')
            continue
        if skirt:                                                         # すそ：上は腰、下へ行くほど左右の太もも（今の帰路と同じ混ぜ方）
            k = min(1, max(0, (hz - p.z) / 0.45))
            k = k * k * (3 - 2 * k) * 0.62
            wl = min(1, max(0, (p.x + 0.03) / 0.09)) * k
            wr = min(1, max(0, (0.03 - p.x) / 0.09)) * k
            for n, w in (('pelvis', 1 - wl - wr), ('thighL', wl), ('thighR', wr)):
                if w > 0.01:
                    g(n).add([v.index], w, 'REPLACE')
            continue
        ws = []
        for b in bones:
            d = seg_dist(p, *seg_of(b))
            ws.append((1.0 / max(d + 0.015, 1e-4) ** 5, b))
        ws.sort(reverse=True)
        ws = ws[:3]
        s = sum(w for w, _ in ws)
        for w, b in ws:
            if w / s > 0.03:
                g(b).add([v.index], w / s, 'REPLACE')


# ───────────────────────── 意匠
def build(out):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    COAT, COAT2, SKIN, PANTS = 0x3d4656, 0x2a303c, 0xd6d9e0, 0x262a33
    M = dict(coat=mat('Slate navy wool coat', COAT, 0.9), coat2=mat('Dark coat facing and hem', COAT2, 0.9), seam=mat('Coat seam shadow', 0x1e232c, 0.95),
             skin=mat('Pale smooth skin', SKIN, 0.6), hair=mat('Receding grey hair', 0x3a3a42, 0.7), pants=mat('Charcoal trousers', PANTS, 0.85),
             shoe=mat('Black leather shoes', 0x1a1a1f, 0.4), sole=mat('Worn shoe sole', 0x30303a, 0.9), btn=mat('Dark horn buttons', 0x1a1c22, 0.3),
             belt=mat('Coat belt', 0x232833, 0.85), scarf=mat('Scarf knit lamp colour', 0xebebeb, 0.95), fringe=mat('Scarf white fringe', 0xf4f2ee, 0.95),
             bag=mat('Ivory shopping bag', 0xe8e2d0, 0.8), band=mat('Shop band red', 0xc84a3a, 0.8), handle=mat('Bag handle', 0xd8d0b8, 0.8),
             onion=mat('Leek white stalk', 0xe8ecd8, 0.7), leaf=mat('Leek green leaves', 0x4a7a2a, 0.7))
    parts = []
    hz, sz_, cz, nz = P['pelvis'].z, P['spine'].z, P['chest'].z, P['neck'].z

    # 頭：卵形・細いあご・浅い目のくぼみ・鼻のなごり（顔の黒いにじみはゲームの顔の札）
    def head_def(p):
        q = Vector(p)
        if q.z < 0:                                                       # あごを細く
            k = 1 - 0.28 * min(1, -q.z / 0.118)
            q.x *= k
            q.y = q.y * (1 - 0.18 * min(1, -q.z / 0.118)) - 0.012 * min(1, -q.z / 0.118)
        for sx in (1, -1):                                                # 目のくぼみ（浅い）
            e = Vector((sx * 0.038, -0.1, 0.0))
            d = (q - e).length
            q += Vector((0, 0.006, 0)) * math.exp(-(d / 0.022) ** 2)
        d = (q - Vector((0, -0.105, -0.03))).length                       # 鼻のなごり
        q += Vector((0, -0.01, 0)) * math.exp(-(d / 0.02) ** 2)
        return q
    head = ellipsoid('kiro head', HC, (0.096, 0.105, 0.118), M['skin'], 48, 32, head_def)
    skin(head, rigid='head')
    parts.append(head)

    # 髪：後退した短い髪（前は高い生え際・後ろは首まで）。毛の流れの筋を形で
    def hair_def(p):
        return p * 1.075
    hair = ellipsoid('kiro hair', HC + Vector((0, 0.006, 0.008)), (0.096, 0.105, 0.118), M['hair'], 48, 32, hair_def)
    bm = bmesh.new()
    bm.from_mesh(hair.data)
    kill = []
    for v in bm.verts:
        q = v.co - HC
        front = max(0.0, -q.y)                                            # 前ほど高い生え際
        line = 0.055 + 0.3 * front - 0.75 * max(0.0, q.y) * 1.0
        if q.z < line - 0.02 or (q.z < -0.06):
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(hair.data)
    bm.free()
    md = hair.modifiers.new('solid', 'SOLIDIFY')
    md.thickness = 0.006
    md.offset = 1
    md = hair.modifiers.new('sub', 'SUBSURF')
    md.levels = 1
    displace(hair, lambda p: 0.0018 * math.sin(p.x * 160 + p.y * 40))  # 毛の流れの筋
    skin(hair, rigid='head')
    parts.append(hair)

    # 首（長い）
    neck = loft('kiro neck', [(Vector((0, 0.005, nz - 0.04)), 0.036, 0.034, None), (Vector((0, 0.008, nz + 0.05)), 0.034, 0.033, None),
                              (Vector((0, 0.01, HC.z - 0.08)), 0.033, 0.032, None)], M['skin'], n=16)
    skin(neck, ['neck', 'head', 'chest'])
    parts.append(neck)

    # コートの胴：腰 → 胸 → 肩（輪切り）。前の合わせは別の帯
    def torso_r(z):
        # (高さ, 横, 奥行き)
        T = [(hz - 0.04, 0.142, 0.106), (hz + 0.05, 0.136, 0.1), (sz_ + 0.08, 0.13, 0.096), (cz, 0.15, 0.104), (cz + 0.1, 0.163, 0.108), (cz + 0.17, 0.168, 0.1),
             (P['upperArmL'].z + 0.02, 0.16, 0.085), (nz - 0.03, 0.085, 0.068)]
        return T
    rings = []
    for z, rx, ry in torso_r(0):
        fn = (lambda a: 1.0 + 0.04 * max(0, math.cos(a)) * (1 if True else 0))
        rings.append((Vector((0, 0.006, z)), rx, ry, fn))
    torso = loft('kiro coat', rings, M['coat'], n=32, subdiv=2)
    displace(torso, lambda p: -0.0025 * math.exp(-((p.x - 0.018) / 0.004) ** 2) * (p.y < -0.05)    # 前の合わせの溝
             - 0.002 * math.exp(-((abs(p.x) - 0.1) / 0.004) ** 2) * (p.y > 0.04) * (p.z < cz + 0.15)  # 背の縫い目
             + 0.0015 * math.sin(p.z * 70 + p.x * 20) * (p.z < sz_))                                  # 腰のしわ
    skin(torso, ['pelvis', 'spine', 'chest', 'neck', 'upperArmL', 'upperArmR'])
    parts.append(torso)

    # 前の合わせ（濃い色の帯）・えりの返し（左右）・立てたえり・ベルト
    placket = box('kiro placket', Vector((0.018, -0.1, (hz + cz) / 2 + 0.03)), (0.016, 0.006, cz - hz + 0.22), M['coat2'], 0.003)
    skin(placket, ['spine', 'chest', 'pelvis'])
    parts.append(placket)
    for sx in (1, -1):
        lap = box('kiro lapel %s' % ('L' if sx > 0 else 'R'), P['chest'] + Vector((sx * 0.062, -0.098, 0.13)), (0.085, 0.012, 0.19), M['coat2'], 0.004,
                  rot=(math.radians(-14), 0, math.radians(sx * 20)))
        skin(lap, ['chest', 'neck', 'spine'])
        parts.append(lap)
    collar = loft('kiro collar', [(Vector((0, 0.01, nz - 0.07)), 0.078, 0.074, None), (Vector((0, 0.012, nz - 0.02)), 0.082, 0.078, None),
                                  (Vector((0, 0.015, nz + 0.03)), 0.088, 0.083, None)], M['coat2'], n=28, arc=(0.35, TAU - 0.35), solid=0.006)
    skin(collar, ['neck', 'chest'])
    parts.append(collar)
    belt = loft('kiro belt', [(Vector((0, 0.006, 0.978)), 0.146, 0.11, None), (Vector((0, 0.006, 1.022)), 0.144, 0.108, None)], M['belt'], n=32, solid=0.006)
    skin(belt, ['spine', 'pelvis', 'chest'])
    parts.append(belt)
    buckle = box('kiro belt knot', Vector((0.03, -0.112, 1.0)), (0.034, 0.012, 0.05), M['belt'], 0.004)
    skin(buckle, rigid='spine')
    parts.append(buckle)
    for i, (z, y) in enumerate(((1.3, -0.106), (1.18, -0.103), (1.06, -0.096), (0.9, -0.118))):
        b = cyl('kiro button %d' % i, Vector((0.045, y + 0.002, z)), Vector((0.045, y - 0.004, z)), 0.011, 0.01, M['btn'], n=14)
        skin(b, ['spine', 'chest', 'pelvis'])
        parts.append(b)

    # すそ（ひざまで：前が少し開く・縦のしわ・濃い色のすそ）
    def fold(a, z):
        return 1.0 + 0.035 * math.sin(a * 9) * min(1, (hz - z) / 0.45)
    rings = []
    for t in np.linspace(0, 1, 9):
        z = hz + 0.04 - t * 0.5
        rx, ry = 0.148 + 0.066 * t, 0.106 + 0.05 * t
        rings.append((Vector((0, 0.006, z)), rx, ry, (lambda a, z=z: fold(a, z))))
    skirt = loft('kiro coat skirt', rings, M['coat'], n=40, arc=(0.06, TAU - 0.02), solid=0.007, subdiv=1)
    skin(skirt, skirt=True)
    parts.append(skirt)
    hem = loft('kiro coat hem', [(Vector((0, 0.006, hz - 0.44)), 0.212, 0.154, (lambda a: fold(a, hz - 0.44))),
                                 (Vector((0, 0.006, hz - 0.465)), 0.215, 0.157, (lambda a: fold(a, hz - 0.465)))], M['coat2'], n=40, arc=(0.06, TAU - 0.02), solid=0.008)
    skin(hem, skirt=True)
    parts.append(hem)
    for sx in (1, -1):                                                    # ポケットのふた
        pk = box('kiro pocket %s' % ('L' if sx > 0 else 'R'), Vector((sx * 0.12, -0.172, hz - 0.12)), (0.1, 0.012, 0.03), M['coat2'], 0.004,
                 rot=(math.radians(-8), 0, math.radians(sx * -18)))
        skin(pk, skirt=True)
        parts.append(pk)

    # 袖（長い腕）・袖口・手（細長い指）
    for s in 'LR':
        ua, la, ha = P['upperArm' + s], P['foreArm' + s], P['hand' + s]
        rings = [(ua + Vector((0, 0.004, 0.012)), 0.052, 0.05, None), ((ua + la) / 2, 0.047, 0.046, None), (la + Vector((0, 0, 0.01)), 0.044, 0.043, None),
                 ((la + ha) / 2, 0.042, 0.041, None), (ha + Vector((0, 0, 0.07)), 0.04, 0.04, None), (ha + Vector((0, 0, 0.035)), 0.041, 0.041, None)]
        sl = loft('kiro sleeve %s' % s, rings, M['coat'], n=20)
        displace(sl, lambda p, la=la: 0.0025 * math.sin((p.z - la.z) * 90) * math.exp(-((p.z - la.z) / 0.06) ** 2))   # ひじのしわ
        skin(sl, ['upperArm' + s, 'foreArm' + s, 'chest'])
        parts.append(sl)
        cuff = loft('kiro cuff %s' % s, [(ha + Vector((0, 0, 0.075)), 0.043, 0.043, None), (ha + Vector((0, 0, 0.03)), 0.044, 0.044, None)], M['coat2'], n=20, solid=0.004)
        skin(cuff, rigid='foreArm' + s)
        parts.append(cuff)
        sx = 1 if s == 'L' else -1
        sc = 1.18
        palm = box('kiro palm %s' % s, ha + Vector((0, -0.003, -0.055 * sc)), (0.024 * sc * 2 * 0.5 * 2, 0.042 * sc * 2 * 0.5 * 2, 0.05 * sc * 2 * 0.5 * 2), M['skin'], 0.012)
        palm.scale = (0.55, 0.9, 1.0)
        skin(palm, rigid='hand' + s)
        parts.append(palm)
        L = 0.045 * sc * 1.35
        for k, dy in enumerate((-0.027, -0.009, 0.009, 0.027)):
            l = L * (0.92, 1.0, 0.97, 0.82)[k]
            base = ha + Vector((0, dy * sc, -0.1 * sc))
            mid = base + Vector((sx * 0.006, 0, -l * 0.55))
            tip = mid + Vector((sx * l * 0.35 * 0.5, -0.004, -l * 0.45))
            f = capsule_chain('kiro finger %s%d' % (s, k), [base, (base + mid) / 2 + Vector((sx * 0.002, 0, 0)), mid, tip], [0.0085 * sc, 0.008 * sc, 0.0078 * sc, 0.006 * sc], M['skin'], n=8)
            skin(f, rigid='hand' + s)
            parts.append(f)
        th0 = ha + Vector((sx * 0.01, -0.035 * sc, -0.045 * sc))
        th = capsule_chain('kiro thumb %s' % s, [th0, th0 + Vector((sx * 0.008, -0.015, -0.03)), th0 + Vector((sx * 0.012, -0.025, -0.05))], [0.01 * sc, 0.009, 0.0075], M['skin'], n=8)
        skin(th, rigid='hand' + s)
        parts.append(th)

    # 脚（ズボン・前の折り目）・靴（甲・底・つま先）
    for s in 'LR':
        hp, kn, ft = P['thigh' + s], P['shin' + s], P['foot' + s]
        rings = [(hp + Vector((0, 0, 0.02)), 0.07, 0.07, None), ((hp + kn) / 2, 0.062, 0.06, None), (kn + Vector((0, 0, 0.02)), 0.052, 0.054, None),
                 ((kn + ft) / 2 + Vector((0, 0, 0.04)), 0.05, 0.05, None), (ft + Vector((0, 0, 0.09)), 0.042, 0.042, None), (ft + Vector((0, 0, 0.06)), 0.043, 0.044, None)]
        leg = loft('kiro trouser %s' % s, rings, M['pants'], n=20)
        displace(leg, lambda p, kn=kn: 0.003 * math.exp(-((p.x - kn.x) / 0.006) ** 2) * (p.y < kn.y - 0.03) + 0.0015 * math.sin(p.z * 80) * (p.z < kn.z - 0.2))
        skin(leg, ['thigh' + s, 'shin' + s, 'pelvis'])
        parts.append(leg)
        up = ellipsoid('kiro shoe %s' % s, ft + Vector((0, -0.045, 0.03)), (0.046, 0.115, 0.042), M['shoe'], 28, 16,
                       lambda p: Vector((p.x, p.y, p.z if p.z > 0 else p.z * 0.4)))
        skin(up, rigid='foot' + s)
        parts.append(up)
        sole = box('kiro sole %s' % s, ft + Vector((0, -0.045, -0.025)), (0.088, 0.23, 0.018), M['sole'], 0.008)
        skin(sole, rigid='foot' + s)
        parts.append(sole)

    # マフラー（置く時の色：材質の名前に lamp colour）：首の輪（編み目のうね）・前へ垂れる端・白い房
    ring = loft('kiro scarf wrap', [(Vector((0, 0.004, nz + 0.005 + 0.03 * t)), 0.074 + 0.012 * math.sin(t * math.pi), 0.072 + 0.012 * math.sin(t * math.pi), None)
                                    for t in np.linspace(0, 1, 6)], M['scarf'], n=32, solid=0.022, subdiv=1)
    displace(ring, lambda p: 0.0018 * math.sin(math.atan2(p.x, p.y) * 30))
    skin(ring, ['neck', 'chest'])
    parts.append(ring)
    nk = P['neck']
    end_pts = [nk + Vector((-0.045, -0.075, 0.01)), nk + Vector((-0.055, -0.095, -0.08)), nk + Vector((-0.06, -0.105, -0.17)), nk + Vector((-0.058, -0.108, -0.26))]
    tail = loft('kiro scarf end', [(p, 0.035, 0.011, None) for p in end_pts], M['scarf'], n=16, subdiv=1)
    displace(tail, lambda p: 0.0012 * math.sin(p.z * 140))
    skin(tail, ['neck', 'chest'])
    parts.append(tail)
    for i in range(7):
        x = -0.088 + i * 0.0105
        fr = capsule_chain('kiro scarf fringe %d' % i, [nk + Vector((x + 0.0, -0.108, -0.275)), nk + Vector((x - 0.002, -0.11, -0.31))], [0.0035, 0.0028], M['fringe'], n=6, subdiv=0)
        skin(fr, rigid='chest')
        parts.append(fr)

    # 買い物袋（左手）：袋・赤い帯・持ち手（手の中へ）・ねぎ
    lh = P['handL']
    bc = lh + Vector((0.01, 0.0, -0.26))
    bag = box('kiro bag', bc, (0.22, 0.1, 0.26), M['bag'], 0.02)
    md = bag.modifiers.new('sub', 'SUBSURF')
    md.levels = 1
    displace(bag, lambda p: 0.004 * math.sin(p.z * 60 + p.x * 30) * (p.z > bc.z + 0.05))   # 袋のしわ
    skin(bag, rigid='handL')
    parts.append(bag)
    band = box('kiro bag band', bc + Vector((0, 0, -0.02)), (0.12, 0.104, 0.05), M['band'], 0.006)
    skin(band, rigid='handL')
    parts.append(band)
    for dy in (-0.03, 0.03):
        h = capsule_chain('kiro bag handle %d' % (dy > 0), [bc + Vector((-0.07, dy, 0.13)), lh + Vector((-0.02, dy * 0.3, -0.04)), lh + Vector((0.0, 0, -0.02)),
                                                            lh + Vector((0.03, dy * 0.3, -0.04)), bc + Vector((0.09, dy, 0.13))], [0.006] * 5, M['handle'], n=6)
        skin(h, rigid='handL')
        parts.append(h)
    for k, (dx, dy) in enumerate(((0.05, -0.015), (0.035, 0.0), (0.06, 0.012))):
        a = bc + Vector((dx - 0.01, dy, 0.04))
        b = lh + Vector((dx + 0.025, dy, 0.0 + k * 0.02))
        st = capsule_chain('kiro leek %d' % k, [a, a + (b - a) * 0.5, b], [0.011, 0.0105, 0.01], M['onion'], n=10)
        skin(st, rigid='handL')
        parts.append(st)
        for j in range(2):
            lf = capsule_chain('kiro leek leaf %d%d' % (k, j), [b, b + Vector((0.02 * (j * 2 - 1), 0.004, 0.06)), b + Vector((0.035 * (j * 2 - 1), 0.006, 0.1))], [0.008, 0.006, 0.002], M['leaf'], n=6)
            skin(lf, rigid='handL')
            parts.append(lf)

    # 骨組み（Codex の人型の名前・休みの位置はコードの帰路の骨）
    arm_d = bpy.data.armatures.new('Kiro rig')
    arm = bpy.data.objects.new('Kiro rig', arm_d)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    E = arm_d.edit_bones
    root = E.new('root')
    root.head, root.tail = Vector((0, 0, 0)), Vector((0, 0, 0.1))
    parent = {'pelvis': 'root', 'spine': 'pelvis', 'chest': 'spine', 'neck': 'chest', 'head': 'neck', 'upperArmL': 'chest', 'foreArmL': 'upperArmL', 'handL': 'foreArmL',
              'upperArmR': 'chest', 'foreArmR': 'upperArmR', 'handR': 'foreArmR', 'thighL': 'pelvis', 'shinL': 'thighL', 'footL': 'shinL', 'thighR': 'pelvis', 'shinR': 'thighR', 'footR': 'shinR'}
    for n in parent:
        b = E.new(n)
        a, t = seg_of(n)
        b.head, b.tail = a, (t if (t - a).length > 1e-4 else a + Vector((0, 0, 0.05)))
    for n, p in parent.items():
        E[n].parent = E[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in parts:
        o.parent = arm
        md = o.modifiers.new('arm', 'ARMATURE')
        md.object = arm
    tris = 0
    for o in parts:
        o.data.calc_loop_triangles()
        tris += len(o.data.loop_triangles)
    os.makedirs(os.path.join(out, 'kiro'), exist_ok=True)
    path = os.path.join(out, 'kiro', 'kiro.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_apply=False)
    print('kiro.glb：%d 三角形・%d 部品・%.1f MB' % (tris, len(parts), os.path.getsize(path) / 1048576), flush=True)
    return path


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    build(args[0] if args else os.path.join(HERE, '_build'))
