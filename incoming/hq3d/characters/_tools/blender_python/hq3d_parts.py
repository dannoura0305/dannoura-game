# -*- coding: utf-8 -*-
"""高精度 3D 制作: 特殊パーツ（Blender 内で使う。vrm_refine.py から呼ぶ）

  ここの関数は「読み込んだ VRM（VRM アドオン）」の上で動き、元のファイルには触れない。
  どれも params（調整値 JSON の 1 項目）だけで結果が決まる（同じ入力なら同じ形）。

  cat_tail_tube … 既存の尻尾の骨の鎖に沿って、太くふわっとした筒の尻尾を作る。
                   VRoid の平たい尻尾（透過テクスチャの帯）は消す。骨と揺れもの（SpringBone）はそのまま使う。
                   fur: {"count", "len", "width", "lean", "seed"} で表面に毛の房（小さな四角すい）を散らす。
                   2 本目は name・material_name・template_material（1 本目の材質名）・remove_original: false で作る。
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector


# ── 共通 ──────────────────────────────────────────────

def armature():
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if not arms:
        raise RuntimeError('アーマチュアがありません')
    return arms[0]


def bone_chain(arm, first):
    """first から子を 1 本ずつたどった骨の並び（長さ 0 の骨は位置が重なるので飛ばす）"""
    b = arm.data.bones.get(first)
    if b is None:
        raise RuntimeError('骨が見つかりません: ' + first)
    chain = []
    while b is not None:
        if b.length > 1e-4:
            chain.append(b)
        kids = list(b.children)
        b = kids[0] if kids else None
    return chain


def catmull_rom(pts, samples):
    """点の列を通る滑らかな曲線を、弧長でほぼ等間隔に samples 点取る"""
    ext = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    dense = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(24):
            t = k / 24.0
            t2, t3 = t * t, t * t * t
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    dense.append(pts[-1].copy())
    acc = [0.0]
    for i in range(1, len(dense)):
        acc.append(acc[-1] + (dense[i] - dense[i - 1]).length)
    total = acc[-1]
    out, j = [], 0
    for s in range(samples):
        target = total * s / (samples - 1)
        while j < len(acc) - 2 and acc[j + 1] < target:
            j += 1
        seg = max(acc[j + 1] - acc[j], 1e-9)
        f = (target - acc[j]) / seg
        out.append(dense[j].lerp(dense[j + 1], min(max(f, 0.0), 1.0)))
    return out, total


def profile(t, pts):
    """[(t, 値), ...] を t で直線補間"""
    if t <= pts[0][0]:
        return pts[0][1]
    for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
        if t <= t1:
            f = (t - t0) / max(t1 - t0, 1e-9)
            return v0 + (v1 - v0) * f
    return pts[-1][1]


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_linear(h):
    h = h.lstrip('#')
    return tuple(srgb_to_linear(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4))


# ── 猫の尻尾（筒） ──────────────────────────────────────

def remove_faces_by_material(name_part):
    """name_part を名前に含む材質の面を消す（シェイプキーは bmesh 経由で保たれる）。消した面の数を返す"""
    removed, mats = 0, []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = [i for i, m in enumerate(o.data.materials) if m and name_part in m.name]
        if not idx:
            continue
        mats.extend(o.data.materials[i] for i in idx)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        faces = [f for f in bm.faces if f.material_index in idx]
        removed += len(faces)
        bmesh.ops.delete(bm, geom=faces, context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    return removed, mats


def tail_material(template, p):
    """元の尻尾の材質（MToon）を写し、テクスチャを外して単色にする。VRoid の陰の付け方は引き継ぐ"""
    m = template.copy()
    m.name = p.get('material_name', 'HQ3D_CatTail')
    ext = m.vrm_addon_extension.mtoon1
    pbr = ext.pbr_metallic_roughness
    base = hex_linear(p.get('color', '#F7F5EE'))
    pbr.base_color_factor = (base[0], base[1], base[2], 1.0)
    pbr.base_color_texture.index.source = None
    mt = ext.extensions.vrmc_materials_mtoon
    shade = hex_linear(p.get('shade_color', '#D9D2C6'))
    mt.shade_color_factor = shade
    mt.shade_multiply_texture.index.source = None
    ext.alpha_mode = 'OPAQUE'
    ext.double_sided = False
    return m


def cat_tail_tube(p):
    arm = armature()
    chain = bone_chain(arm, p.get('first_bone', 'J_Opt_C_CatTail1_01'))
    if len(chain) < 3:
        raise RuntimeError('尻尾の骨が少なすぎます: %d 本' % len(chain))
    # 骨の付け根を並べ、最後の骨の先を足す（アーマチュアの空間）。形は先端の骨（*_end）まで使うが、
    # 重みは揺れもので動く骨だけに付ける（先端の骨は揺れものの計算に入らず、重みを付けると先が折れる）
    pts = [b.head_local.copy() for b in chain] + [chain[-1].tail_local.copy()]
    sb = arm.data.vrm_addon_extension.spring_bone1
    jointed = {j.node.bone_name for s in sb.springs for j in s.joints}
    deform = [b for b in chain if b.name in jointed and '_end' not in b.name] or chain
    rings, sides = int(p.get('rings', 72)), int(p.get('sides', 20))
    curve, length = catmull_rom(pts, rings)

    # 曲線に沿った向き（平行移動で回転を抑える）
    tans = []
    for i in range(rings):
        a, b = curve[max(i - 1, 0)], curve[min(i + 1, rings - 1)]
        tans.append((b - a).normalized())
    up = Vector((1, 0, 0)) if abs(tans[0].x) < 0.9 else Vector((0, 0, 1))
    nrm = (up - tans[0] * up.dot(tans[0])).normalized()
    frames = []
    for i in range(rings):
        t = tans[i]
        nrm = (nrm - t * nrm.dot(t)).normalized()
        frames.append((nrm.copy(), t.cross(nrm).normalized()))

    radius = [tuple(x) for x in p.get('radius', [[0, 0.020], [0.12, 0.034], [0.5, 0.044], [0.82, 0.050], [0.94, 0.040], [1.0, 0.0]])]
    bumps, bump_amp = float(p.get('length_tufts', 7)), float(p.get('length_tuft_depth', 0.10))
    ridges, ridge_amp, twist = int(p.get('ridges', 9)), float(p.get('ridge_depth', 0.07)), float(p.get('ridge_twist', 2.5))

    # 骨ごとの区間（曲線上の位置 → どの骨か）
    seg_len = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    seg_acc = [0.0]
    for s in seg_len:
        seg_acc.append(seg_acc[-1] + s)

    def bone_weights(t):
        d = t * seg_acc[-1]
        for i in range(len(seg_len)):
            if d <= seg_acc[i + 1] or i == len(seg_len) - 1:
                if i >= len(deform):  # 先端の骨の区間は、揺れる最後の骨についていく
                    return [(deform[-1].name, 1.0)]
                f = (d - seg_acc[i]) / max(seg_len[i], 1e-9)
                f = min(max(f, 0.0), 1.0)
                # 区間の後半は次の骨へ少しずつ渡す（曲がり目で筒がつぶれないように）
                if i + 1 < len(deform) and f > 0.5:
                    w = (f - 0.5) * 2 * 0.5
                    return [(deform[i].name, 1 - w), (deform[i + 1].name, w)]
                if i > 0 and f < 0.5:
                    w = (0.5 - f) * 2 * 0.5
                    return [(deform[i].name, 1 - w), (deform[i - 1].name, w)]
                return [(deform[i].name, 1.0)]
        return [(deform[-1].name, 1.0)]

    verts, faces, weights = [], [], []
    for i in range(rings):
        t = i / (rings - 1)
        r = profile(t, radius)
        if i in (0, rings - 1):
            r = max(r, 0.0)
        r *= 1 + bump_amp * (0.5 + 0.5 * math.cos(2 * math.pi * bumps * t)) * min(1.0, t * 6)
        n, bn = frames[i]
        w = bone_weights(t)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            rr = r * (1 + ridge_amp * math.cos(ridges * a + twist * 2 * math.pi * t))
            verts.append(curve[i] + (n * math.cos(a) + bn * math.sin(a)) * rr)
            weights.append(w)
    for i in range(rings - 1):
        for k in range(sides):
            a, b = i * sides + k, i * sides + (k + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    fur = p.get('fur')
    fur_n = 0
    if fur:  # 毛の房: 表面に小さな四角すいを散らし、外へ（少し先の向きへ）立てる。輪郭をふさふさにする
        import random
        rng = random.Random(int(fur.get('seed', 3)))
        for _ in range(int(fur['count'])):
            t = rng.uniform(0.04, 0.97)
            i = min(int(t * (rings - 1)), rings - 2)
            a = rng.uniform(0, 2 * math.pi)
            n, bn = frames[i]
            r = profile(t, radius) * (1 + bump_amp * (0.5 + 0.5 * math.cos(2 * math.pi * bumps * t)) * min(1.0, t * 6))
            out = (n * math.cos(a) + bn * math.sin(a)).normalized()
            base = curve[i] + out * r * 0.92
            ln = float(fur['len']) * rng.uniform(0.6, 1.3) * min(1.0, 0.4 + t * 2)
            tipd = (out + tans[i] * float(fur.get('lean', 0.6))).normalized()
            side = tans[i].cross(out).normalized()
            wd = float(fur['width']) * rng.uniform(0.7, 1.2)
            b0 = len(verts)
            for q in (side * wd, tans[i] * wd, -side * wd, -tans[i] * wd):
                verts.append(base + q * 0.5)
                weights.append(bone_weights(t))
            verts.append(base + tipd * ln)
            weights.append(bone_weights(t))
            for k in range(4):
                faces.append((b0 + k, b0 + (k + 1) % 4, b0 + 4))
            fur_n += 1
    # 付け根と先をふさぐ
    root = len(verts)
    verts.append(curve[0].copy())
    weights.append([(chain[0].name, 1.0)])
    for k in range(sides):
        faces.append((root, (k + 1) % sides, k))
    tip = len(verts)
    verts.append(curve[-1] + tans[-1] * float(p.get('tip_point', 0.012)))
    weights.append([(deform[-1].name, 1.0)])
    last = (rings - 1) * sides
    for k in range(sides):
        faces.append((last + k, last + (k + 1) % sides, tip))

    removed, old_mats = (0, [])
    if p.get('remove_original', True):
        removed, old_mats = remove_faces_by_material(p.get('original_material', 'CatTail'))
    if p.get('template_material'):  # 2 本目: 1 本目の材質を写し元にする
        old_mats = [bpy.data.materials[p['template_material']]]
    if not old_mats:
        raise RuntimeError('元の尻尾の材質が見つかりません（MToon の写し元が要る）')

    me = bpy.data.meshes.new(p.get('name', 'HQ3D_CatTail'))
    me.from_pydata([v for v in verts], [], faces)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)  # 面の表を外側へそろえる
    bm.to_mesh(me)
    bm.free()
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(p.get('name', 'HQ3D_CatTail'), me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    ob.matrix_world = arm.matrix_world.copy()
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    groups = {}
    for vi, w in enumerate(weights):
        for name, val in w:
            g = groups.get(name) or ob.vertex_groups.new(name=name)
            groups[name] = g
            g.add([vi], val, 'REPLACE')
    me.materials.append(tail_material(old_mats[0], p))
    return {'part': 'cat_tail_tube', 'bones': [b.name for b in chain], 'length_m': round(length, 3),
            'verts': len(verts), 'faces': len(faces), 'removed_faces': removed, 'fur': fur_n}


# ── 材質の色 ──────────────────────────────────────────

def find_materials(pattern):
    mats = [m for m in bpy.data.materials if pattern in m.name and m.vrm_addon_extension.mtoon1.enabled]
    if not mats:
        raise RuntimeError('材質が見つかりません: ' + pattern)
    return mats


def set_mtoon_color(m, color_hex, shade_hex=None):
    """MToon の基本色（テクスチャに掛ける色）を変える。陰の色は指定が無ければ基本色と同じ割合で動かす"""
    ext = m.vrm_addon_extension.mtoon1
    pbr = ext.pbr_metallic_roughness
    mt = ext.extensions.vrmc_materials_mtoon
    old = tuple(pbr.base_color_factor)
    new = hex_linear(color_hex)
    pbr.base_color_factor = (new[0], new[1], new[2], old[3])
    if shade_hex:
        mt.shade_color_factor = hex_linear(shade_hex)
    else:
        sh = tuple(mt.shade_color_factor)
        mt.shade_color_factor = tuple(min(1.0, s * (n / o if o > 1e-6 else 1.0)) for s, n, o in zip(sh, new, old[:3]))


def material_color(p):
    """名前に material を含む材質の基本色を color（sRGB の #RRGGBB）にする。
    テクスチャの柄は残る（MToon の基本色はテクスチャに掛け算される）"""
    mats = find_materials(p['material'])
    for m in mats:
        set_mtoon_color(m, p['color'], p.get('shade_color'))
    return {'part': 'material_color', 'materials': [m.name for m in mats], 'color': p['color']}


def lift_texture(m, lift):
    """材質の基本色テクスチャの写しを作り、暗い所を持ち上げる（色 = lift + (1 - lift) × 元。透明度はそのまま）。
    基本色はテクスチャに掛け算なので、テクスチャが暗いと基本色を最大にしても原画の明るさに届かない。毛の筋の濃淡は残る"""
    if lift <= 0:
        return None
    img = m.vrm_addon_extension.mtoon1.pbr_metallic_roughness.base_color_texture.index.source
    if img is None:
        return None
    import numpy as np
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    px[:, :3] = lift + (1.0 - lift) * px[:, :3]
    out = bpy.data.images.new(img.name + '_hq3d_lift', w, h, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    return out


# ── 猫耳の塗り分け ─────────────────────────────────────

def ear_regions(p):
    """猫耳（VRoid では毛の束の集まり）の面を、場所と向きで 内側・付け根の房・縁 に分け、材質を分ける。
    毛の束どうしがテクスチャの同じ所を使い回しているので、テクスチャには描かず面ごとに材質を替える。

      内側 … 前を向いた面（法線が正面へ inner_facing 以上）で、耳の中心線から inner_width 以内、高さ inner_z の範囲
      房   … 前を向いた面で、耳の下側 tuft_z まで、中心線から tuft_width 以内
      縁   … それ以外（後ろ・横・外周）
    耳は左右を x の符号で分け、それぞれの外接箱で相対位置を測る。"""
    pattern = p.get('material', 'HAIR_01')
    front = Vector((0, -1, 0))  # VRM はモデルが -Y を向く
    total = {'inner': 0, 'tuft': 0, 'rim': 0}
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = [i for i, m in enumerate(o.data.materials) if m and pattern in m.name]
        if not idx:
            continue
        src = o.data.materials[idx[0]]
        lifted = lift_texture(src, float(p.get('texture_lift', 0.0)))
        made = {}
        for key, name in (('inner', 'HQ3D_EarInner'), ('tuft', 'HQ3D_EarTuft'), ('rim', 'HQ3D_EarRim')):
            m = src.copy()
            m.name = name
            if lifted is not None:
                ext = m.vrm_addon_extension.mtoon1
                old_img = ext.pbr_metallic_roughness.base_color_texture.index.source
                ext.pbr_metallic_roughness.base_color_texture.index.source = lifted
                mt = ext.extensions.vrmc_materials_mtoon
                if mt.shade_multiply_texture.index.source is old_img:  # 陰の側も持ち上げた絵にする
                    mt.shade_multiply_texture.index.source = lifted
            set_mtoon_color(m, p[key + '_color'], p.get(key + '_shade'))
            o.data.materials.append(m)
            made[key] = len(o.data.materials) - 1
        rot = o.matrix_world.to_3x3()
        polys = [pl for pl in o.data.polygons if pl.material_index in idx]
        cs = {pl.index: o.matrix_world @ pl.center for pl in polys}
        for side in (1, -1):
            group = [pl for pl in polys if cs[pl.index].x * side > 0]
            if not group:
                continue
            xs = [cs[pl.index].x for pl in group]
            zs = [cs[pl.index].z for pl in group]
            cx, half = (min(xs) + max(xs)) / 2, max((max(xs) - min(xs)) / 2, 1e-6)
            z0, zh = min(zs), max(max(zs) - min(zs), 1e-6)
            for pl in group:
                c = cs[pl.index]
                rx, rz = abs(c.x - cx) / half, (c.z - z0) / zh
                facing = (rot @ pl.normal).normalized().dot(front)
                if facing >= p.get('inner_facing', 0.35) and rz <= p.get('tuft_z', 0.28) and rx <= p.get('tuft_width', 0.7):
                    key = 'tuft'
                elif facing >= p.get('inner_facing', 0.35) and rx <= p.get('inner_width', 0.55) and p.get('inner_z', [0.2, 0.9])[0] <= rz <= p.get('inner_z', [0.2, 0.9])[1]:
                    key = 'inner'
                else:
                    key = 'rim'
                pl.material_index = made[key]
                total[key] += 1
    if not sum(total.values()):
        raise RuntimeError('耳の材質の面がありません: ' + pattern)
    return {'part': 'ear_regions', 'faces': total}


# ── 小物（花・リボン結び・鎖） ─────────────────────────────

def plain_mtoon(template_pattern, name, color_hex, shade_hex=None):
    """既存の MToon 材質を写して、テクスチャ無しの単色にする（VRoid の陰の付け方を引き継ぐ）"""
    m = find_materials(template_pattern)[0].copy()
    m.name = name
    ext = m.vrm_addon_extension.mtoon1
    ext.pbr_metallic_roughness.base_color_texture.index.source = None
    ext.extensions.vrmc_materials_mtoon.shade_multiply_texture.index.source = None
    c = hex_linear(color_hex)
    ext.pbr_metallic_roughness.base_color_factor = (c[0], c[1], c[2], 1.0)
    s = hex_linear(shade_hex) if shade_hex else tuple(v * 0.75 for v in c)
    ext.extensions.vrmc_materials_mtoon.shade_color_factor = s
    ext.alpha_mode = 'OPAQUE'
    ext.double_sided = True
    return m




def ray_hit(origin, direction, material=None, offset=0.0):
    """origin から direction へ光線を飛ばし、最初に当たった体の表面の点と法線を返す（offset だけ外へ浮かせる）。
    material を渡すと、その名前を含む材質の面に当たるまで先へ進む（靴ひもを、裾の下の靴に当てるときなど）"""
    d = Vector(direction).normalized()
    best = None
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.name.startswith('HQ3D_'):
            continue
        inv = o.matrix_world.inverted()
        start = inv @ Vector(origin)
        ld = (inv.to_3x3() @ d).normalized()
        for _ in range(16):
            ok, loc, nrm, idx = o.ray_cast(start, ld)
            if not ok:
                break
            mat = o.data.materials[o.data.polygons[idx].material_index]
            if material is None or (mat and material in mat.name):
                w = o.matrix_world @ loc
                dist = (w - Vector(origin)).length
                if best is None or dist < best[2]:
                    best = (w, (o.matrix_world.to_3x3() @ nrm).normalized(), dist)
                break
            start = loc + ld * 1e-4
    if best is None:
        raise RuntimeError('表面が見つかりません: 起点 %s 向き %s 材質 %s' % (tuple(round(v, 3) for v in origin), tuple(d), material))
    return best[0] + best[1] * offset, best[1]


def surface_point(x, z, offset=0.0, material=None):
    """正面（-Y 側）から +Y へ光線を飛ばす（モデルは -Y を向いている）"""
    return ray_hit((x, -2.0, z), (0, 1, 0), material, offset)


def top_point(x, y, offset=0.0, material=None):
    """上から下へ光線を飛ばす（靴の甲など）"""
    return ray_hit((x, y, 3.0), (0, 0, -1), material, offset)


def _frame(normal):
    n = normal.normalized()
    up = Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((0, -1, 0))
    u = up.cross(n).normalized()   # 横
    v = n.cross(u).normalized()    # 上
    return n, u, v


def _ellipsoid(bm, center, axes, segs=10, rings=6):
    """axes = (横ベクトル, 上ベクトル, 前ベクトル) それぞれの長さ込み"""
    ax, ay, az = axes
    verts = []
    for r in range(rings + 1):
        th = math.pi * r / rings
        row = []
        for s in range(segs):
            ph = 2 * math.pi * s / segs
            p = center + ax * (math.sin(th) * math.cos(ph)) + ay * (math.sin(th) * math.sin(ph)) + az * math.cos(th)
            row.append(bm.verts.new(p))
        verts.append(row)
    faces = []
    for r in range(rings):
        for s in range(segs):
            a, b = verts[r][s], verts[r][(s + 1) % segs]
            c, d = verts[r + 1][(s + 1) % segs], verts[r + 1][s]
            if len({a, b, c, d}) == 4:
                faces.append(bm.faces.new((a, b, c, d)))
    return faces


def _tube(bm, pts, radius, segs=6):
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        _, u, v = _frame(t)
        rings.append([bm.verts.new(p + (u * math.cos(2 * math.pi * k / segs) + v * math.sin(2 * math.pi * k / segs)) * radius) for k in range(segs)])
    faces = []
    for i in range(len(rings) - 1):
        for k in range(segs):
            faces.append(bm.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k])))
    return faces


def _flower(bm, center, normal, size, petals=5, roll=0.0):
    """花びら petals 枚（平たい楕円体）＋真ん中。戻り値: (花びらの面, 真ん中の面)"""
    n, u, v = _frame(normal)
    pf = []
    for i in range(petals):
        a = roll + 2 * math.pi * i / petals
        d = u * math.cos(a) + v * math.sin(a)
        side = n.cross(d).normalized()
        pf += _ellipsoid(bm, center + d * size * 0.55 + n * size * 0.05, (d * size * 0.5, side * size * 0.32, n * size * 0.08))
    cf = _ellipsoid(bm, center + n * size * 0.12, (u * size * 0.22, v * size * 0.22, n * size * 0.12), segs=8, rings=4)
    return pf, cf


def _leaf(bm, center, normal, size, angle=0.0):
    """細長い葉 1 枚（angle の向きへ伸びる）"""
    n, u, v = _frame(normal)
    d = u * math.cos(angle) + v * math.sin(angle)
    return _ellipsoid(bm, center + d * size * 0.5, (d * size * 0.55, n.cross(d).normalized() * size * 0.2, n * size * 0.05), segs=8, rings=5)


def _clover(bm, center, normal, size, leaves=4, roll=0.0, puff=1.0):
    """クローバー: ハート形の葉（丸い楕円体 2 つを重ねる）を leaves 枚、真ん中で合わせる"""
    n, u, v = _frame(normal)
    faces = []
    for i in range(leaves):
        a = roll + math.pi / 2 + 2 * math.pi * i / leaves
        d = u * math.cos(a) + v * math.sin(a)
        side = n.cross(d).normalized()
        for s in (1, -1):
            c = center + d * size * 0.42 + side * s * size * 0.17
            faces += _ellipsoid(bm, c + n * size * 0.03 * (puff - 1), (d * size * 0.3, side * size * 0.24, n * size * 0.07 * puff), segs=10, rings=6)
    return faces


def _bow(bm, center, normal, size):
    """リボン結び: 左右の輪（平たい楕円体を斜めに）＋結び目＋下へ垂れる 2 本"""
    n, u, v = _frame(normal)
    faces = []
    for sgn in (1, -1):
        d = (u * sgn + v * 0.25).normalized()
        faces += _ellipsoid(bm, center + d * size * 0.55, (d * size * 0.55, n.cross(d).normalized() * size * 0.32, n * size * 0.12))
    faces += _ellipsoid(bm, center + n * size * 0.06, (u * size * 0.18, v * size * 0.2, n * size * 0.14), segs=8, rings=4)
    for sgn in (1, -1):
        d = (-v + u * 0.35 * sgn).normalized()
        faces += _ellipsoid(bm, center + d * size * 0.75 - n * size * 0.02, (d * size * 0.7, n.cross(d).normalized() * size * 0.16, n * size * 0.06))
    return faces


def _band(bm, pts, width, thick, normal):
    """平たいひも（断面が細長い楕円）。pts に沿い、幅の向きは normal と進む向きの直角（体の表面に沿って平たい）"""
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        wv = t.cross(normal)
        wv = wv.normalized() if wv.length > 1e-6 else _frame(t)[1]
        nv = wv.cross(t).normalized()
        rings.append([bm.verts.new(p + wv * math.cos(2 * math.pi * k / 8) * width * 0.5 + nv * math.sin(2 * math.pi * k / 8) * thick * 0.5) for k in range(8)])
    faces = []
    for i in range(len(rings) - 1):
        for k in range(8):
            faces.append(bm.faces.new((rings[i][k], rings[i][(k + 1) % 8], rings[i + 1][(k + 1) % 8], rings[i + 1][k])))
    return faces


def _ribbon_bow(bm, center, normal, size, width, tail):
    """細いリボンの蝶結び: 平たいひもの輪 2 つ（結び目から外へ出て戻る）＋小さな結び目＋下へ垂れる 2 本（先を斜めに）"""
    n, u, v = _frame(normal)
    faces = []
    for sgn in (1, -1):
        d = (u * sgn + v * 0.2).normalized()
        side = n.cross(d).normalized()
        pts = [center + d * size * 0.5 * (1 - math.cos(t)) + side * size * 0.28 * math.sin(t) + n * size * 0.08 * math.sin(t / 2)
               for t in [2 * math.pi * k / 24 for k in range(25)]]
        faces += _band(bm, pts, width, width * 0.25, n)
    faces += _ellipsoid(bm, center + n * width * 0.4, (u * width * 0.9, v * width * 1.0, n * width * 0.6), segs=8, rings=4)
    for sgn in (1, -1):
        pts = [center + u * sgn * (0.15 * size + 0.25 * tail * t) - v * tail * t + n * (0.004 * math.sin(math.pi * t) + 0.002)
               for t in [k / 12 for k in range(13)]]
        faces += _band(bm, pts, width, width * 0.25, n)
    return faces


def _collar(bm, center, normal, half, length, spread, thick, lift=0.0):
    """シャツの襟: 首の前の真ん中の左右に、先のとがった平たい板 2 枚（上の内側→外側→先）。体の表面から少し浮かせる"""
    n, u, v = _frame(normal)
    faces = []
    for sgn in (1, -1):
        a = center + u * sgn * half * 0.25 + v * 0.004
        b = center + u * sgn * (half + spread) + v * 0.002 + n * lift
        tip = center + u * sgn * (half * 0.6) - v * length + n * lift * 0.6
        tri = [a, b, tip]
        top = [bm.verts.new(q + n * thick) for q in tri]
        bot = [bm.verts.new(q) for q in tri]
        faces.append(bm.faces.new(top))
        faces.append(bm.faces.new(list(reversed(bot))))
        for i in range(3):
            j = (i + 1) % 3
            faces.append(bm.faces.new((bot[i], bot[j], top[j], top[i])))
    return faces


# 材質の枠: 0 本体（color）・1 真ん中（center_color）・2 鎖やひも（cord_color / chain.color）・3 葉（leaf_color）・4 裏地（lining_color）
SLOTS = (('', 'color'), ('_Center', 'center_color'), ('_Chain', 'cord_color'), ('_Leaf', 'leaf_color'), ('_Lining', 'lining_color'))


def _make_object(p, name, bone, groups):
    """bmesh の面（材質の枠 → 面）から、骨 1 本に重み 1 で付いた VRM 用のメッシュを作る"""
    arm = armature()
    if bone not in arm.data.bones:
        raise RuntimeError('骨が見つかりません: ' + bone)
    bm = groups.pop('_bm')
    for idx, faces in groups.items():
        for f in faces:
            f.material_index = idx
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    used = sorted(k for k, v in groups.items() if v)  # 使う材質だけを足す（番号は詰め直す）
    remap = {old: new for new, old in enumerate(used)}
    for poly in me.polygons:
        poly.material_index = remap[poly.material_index]
    tmpl = p.get('material_from', 'Tops_01')
    cord = p.get('cord_color') or (p.get('chain') or {}).get('color', '#C9B37E')
    for old in used:
        suffix, key = SLOTS[old]
        color = cord if key == 'cord_color' else p.get(key, p['color'])
        me.materials.append(plain_mtoon(tmpl, name + suffix, color, p.get('shade_color') if old == 0 else None))
    # 頂点はワールド座標で作ったので、アーマチュアの空間へ移す（尻尾と同じくアーマチュアと同じ位置に置く）
    inv = arm.matrix_world.inverted()
    for vtx in me.vertices:
        vtx.co = inv @ vtx.co
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    ob.matrix_world = arm.matrix_world.copy()
    g = ob.vertex_groups.new(name=bone)
    g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    return len(me.vertices)


def _cluster_items(bm, groups, center, normal, size, items, petals):
    """花・葉・クローバーを寄せ集める。items: [{type, offset[x,y,z], scale, roll(度), angle(度)}]"""
    for it in items:
        c = center + Vector(it.get('offset', [0, 0, 0]))
        s = size * it.get('scale', 1.0)
        t = it.get('type', 'flower')
        if t == 'flower':
            a, b = _flower(bm, c, normal, s, petals, math.radians(it.get('roll', 0)))
            groups[0] += a
            groups[1] += b
        elif t == 'leaf':
            groups[3] += _leaf(bm, c, normal, s, math.radians(it.get('angle', 90)))
        elif t == 'clover':
            groups[3] += _clover(bm, c, normal, s, it.get('leaves', 4), math.radians(it.get('roll', 0)))
        else:
            raise RuntimeError('知らない寄せ集めの種類です: ' + t)


def _sag_path(a, b, sag, steps, offset):
    """体の表面（正面）の 2 点 a=[x, z]・b=[x, z] の間を、真ん中が sag だけ下がる弧で結び、表面に沿わせる"""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = a[0] + (b[0] - a[0]) * t
        z = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t)
        pts.append(surface_point(x, z, offset)[0])
    return pts


def accessory(p):
    """小物を作って 1 本の骨に付ける（重み 1。骨と一緒に動く）。
      kind: flower（花）・flowers（花を寄せたもの。古い書き方）・bow（リボン結び）・clover（クローバー）
            ribbon（細いリボンの蝶結び。width: ひもの幅 m・tail: 垂れる長さ m）
            collar（シャツの襟 2 枚。half: 真ん中からの半幅・length: 先までの長さ・spread: 外への広がり・thick: 厚み・lift: 外の角と先を浮かせる m）
            clover の puff: 葉の厚みの倍率。cord の strands・spread: 房を何本のひもにして、どれだけ広げるか
            cluster（items で 花／葉／クローバー を寄せる）・hanging_chain（2 点の間にたるんで下がる鎖。下に飾りを付けられる。
              links: {"pitch", "size", "radius"} で小さな輪をつないだ鎖にする）
      at:   {"ray": [x, z], "offset": 外へ浮かせる m}（正面から体の表面に当てる）か {"point": [x, y, z], "normal": [nx, ny, nz]}
      chain: {"from": [[x, z], …], "radius", "color"}（体の表面に沿わせて、小物の上へつなぐ鎖）
      cord:  {"length", "radius", "hang"}（小物の下へ垂れる房と、上の吊りひも。クローバーのチャームなど）"""
    bone = p['bone']
    size = float(p.get('size', 0.03))
    name = p.get('name', 'HQ3D_Accessory')
    kind = p['kind']
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], '_bm': bm}
    petals = p.get('petals', 5)
    if kind == 'hanging_chain':
        a, b = p['points']
        pts = _sag_path(a, b, float(p.get('sag', 0.06)), int(p.get('steps', 24)), float(p.get('offset', 0.005)))
        lk = p.get('links')
        if lk:  # 鎖の輪: 道に沿って小さな輪を、向きを交互に変えて並べる
            pitch, ls = float(lk.get('pitch', 0.008)), float(lk.get('size', 0.006))
            acc, k = 0.0, 0
            for a_, b_ in zip(pts, pts[1:]):
                seg = (b_ - a_).length
                while acc <= seg:
                    c_ = a_.lerp(b_, acc / max(seg, 1e-9))
                    tdir = (b_ - a_).normalized()
                    n_, u_, v_ = _frame(tdir)
                    w_ = u_ if k % 2 == 0 else v_
                    ring = [c_ + tdir * math.cos(2 * math.pi * j / 12) * ls * 0.6 + w_ * math.sin(2 * math.pi * j / 12) * ls * 0.4 for j in range(13)]
                    groups[2] += _tube(bm, ring, float(lk.get('radius', 0.0009)), 5)
                    acc += pitch
                    k += 1
                acc -= seg
        else:
            groups[2] += _tube(bm, pts, float(p.get('radius', 0.0013)))
        low = min(pts, key=lambda q: q.z)
        center, normal = surface_point(low.x, low.z - size * 0.7, float(p.get('offset', 0.005)) + 0.003)
        if p.get('charm'):
            ch = dict(p['charm'])
            ch.setdefault('type', 'flower')
            _cluster_items(bm, groups, center, normal, size, [ch], petals)
        groups[2] += _tube(bm, [low, center + _frame(normal)[2] * size * 0.5], float(p.get('radius', 0.0013)))
    else:
        at = p['at']
        if 'ray' in at:
            center, normal = surface_point(at['ray'][0], at['ray'][1], at.get('offset', 0.006))
        else:
            center, normal = Vector(at['point']), Vector(at.get('normal', [0, -1, 0])).normalized()
        if kind == 'flower':
            a, b = _flower(bm, center, normal, size, petals, math.radians(p.get('roll', 0)))
            groups[0] += a
            groups[1] += b
        elif kind == 'flowers':
            _cluster_items(bm, groups, center, normal, size, [dict({'type': 'flower'}, **f) for f in p['flowers']], petals)
        elif kind == 'cluster':
            _cluster_items(bm, groups, center, normal, size, p['items'], petals)
        elif kind == 'bow':
            groups[0] += _bow(bm, center, normal, size)
        elif kind == 'ribbon':
            groups[0] += _ribbon_bow(bm, center, normal, size, float(p.get('width', 0.005)), float(p.get('tail', 0.06)))
        elif kind == 'collar':
            groups[0] += _collar(bm, center, normal, float(p.get('half', 0.02)), float(p.get('length', 0.035)),
                                 float(p.get('spread', 0.02)), float(p.get('thick', 0.002)), float(p.get('lift', 0.0)))
        elif kind == 'clover':
            n, u, v = _frame(normal)
            groups[0] += _clover(bm, center, normal, size, p.get('leaves', 4), math.radians(p.get('roll', 0)), float(p.get('puff', 1.0)))
            groups[1] += _ellipsoid(bm, center + n * size * 0.08, (u * size * 0.12, v * size * 0.12, n * size * 0.1), segs=8, rings=4)
        else:
            raise RuntimeError('知らない小物です: ' + kind)
        if p.get('chain'):
            ch = p['chain']
            top = center + _frame(normal)[2] * size * 0.9
            for fx, fz in ch['from']:
                steps = 14
                pts = [surface_point(fx + (top.x - fx) * i / steps, fz + (top.z - fz) * i / steps, ch.get('offset', 0.004))[0] for i in range(steps)] + [top]
                groups[2] += _tube(bm, pts, ch.get('radius', 0.0012))
        if p.get('cord'):
            cd = p['cord']
            n, u, v = _frame(normal)
            start = center - v * size * 0.45
            length = float(cd.get('length', 0.04))
            ns_ = int(cd.get('strands', 1))
            if ns_ > 1:  # 房: 結び目（小さな玉）から細いひもを何本も、少し広げて垂らす
                groups[1] += _ellipsoid(bm, start - v * size * 0.08 + n * 0.002, (u * size * 0.13, v * size * 0.13, n * size * 0.12), segs=8, rings=4)
                for k in range(ns_):
                    a = (k / (ns_ - 1) - 0.5)
                    pts = [start - v * size * 0.15 - v * length * i / 6 + u * a * float(cd.get('spread', 0.012)) * i / 6 + n * (0.002 + 0.0008 * i) for i in range(7)]
                    groups[2] += _tube(bm, pts, float(cd.get('radius', 0.003)), segs=6)
            else:
                pts = [start - v * length * i / 6 + n * 0.002 * i for i in range(7)]
                groups[2] += _tube(bm, pts, float(cd.get('radius', 0.003)), segs=8)
            top = center + v * size * 0.5
            groups[2] += _tube(bm, [top, top + v * float(cd.get('hang', 0.03))], float(cd.get('hang_radius', 0.0012)))
    verts = _make_object(p, name, bone, groups)
    return {'part': 'accessory', 'name': name, 'kind': kind, 'bone': bone, 'verts': verts, 'at': [round(v, 3) for v in center]}


def shoe_laces(p):
    """靴ひも: 靴の甲に、左右の穴を交互にバツ印で結ぶひもを通す。靴ごとに足の骨へ付ける。
      shoes: [{"bone", "x": [内, 外], "y": [つま先側, かかと側], "rows"}]・radius・cord_color
      光線は上から下へ、材質名に material（既定 'Shoes'）を含む面だけに当てる（裾の下の甲に届く）"""
    made = []
    for i, sh in enumerate(p['shoes']):
        bm = bmesh.new()
        groups = {0: [], 1: [], 2: [], 3: [], '_bm': bm}
        rows = int(sh.get('rows', 4))
        x0, x1 = sh['x']
        y0, y1 = sh['y']
        mat = p.get('material', 'Shoes')
        off = float(p.get('offset', 0.003))
        holes = []
        for r in range(rows):
            y = y0 + (y1 - y0) * r / max(rows - 1, 1)
            holes.append((top_point(x0, y, off, mat)[0], top_point(x1, y, off, mat)[0]))
        rad = float(p.get('radius', 0.0018))
        up = Vector((0, 0, 0.002))
        for r in range(rows - 1):
            for a, b in ((holes[r][0], holes[r + 1][1]), (holes[r][1], holes[r + 1][0])):
                groups[2] += _tube(bm, [a, (a + b) / 2 + up, b], rad)
        a, b = holes[0]
        groups[2] += _tube(bm, [a, (a + b) / 2 + up, b], rad)  # つま先側の横一本
        # 結び目と、垂れる 2 本
        knot = (holes[-1][0] + holes[-1][1]) / 2 + Vector((0, 0, 0.004))
        groups[2] += _ellipsoid(bm, knot, (Vector((rad * 3, 0, 0)), Vector((0, rad * 3, 0)), Vector((0, 0, rad * 2))), segs=8, rings=4)
        for s in (1, -1):
            groups[2] += _tube(bm, [knot, knot + Vector((s * 0.012, -0.006, 0.002)), knot + Vector((s * 0.018, -0.01, -0.012))], rad)
        q = dict(p, color=p.get('cord_color', '#7E8F3A'), cord_color=p.get('cord_color', '#7E8F3A'))
        name = '%s_%d' % (p.get('name', 'HQ3D_Laces'), i)
        made.append({'name': name, 'bone': sh['bone'], 'verts': _make_object(q, name, sh['bone'], groups)})
    return {'part': 'shoe_laces', 'made': made}


# ── 上着の前開き ────────────────────────────────────────

def _hex8(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]


def jacket_open(p):
    """閉じた上着の前の真ん中を、開いた前から見える白いシャツとファスナーのテープに描きかえる（テクスチャを写して描く）。
    VRoid は上着の下の体を消しているので、穴を開けると中が空になる。そこでテクスチャで「開いて見える」ようにする。

      half_width: [[高さ z, 開きの半分の幅 m], …]（高さで補間。首元は狭く、下へ広がる）
      z: [下, 上]（描く高さの範囲）・facing: 前を向いた面だけ（法線と正面の内積）
      tape_width・tape_color・teeth_color・teeth_pitch … ファスナーのテープと歯
      shirt_color・shade_color・shade_width … シャツ。開いた端の際に陰の帯を入れて奥行きを出す
      buttons: {"z": [...], "radius", "color"} … シャツのボタン
      stripes: {"pitch", "width", "color", "z0"} … シャツを横じま（ボーダー）にする
    テクスチャの画素ごとに、その画素が体のどこ（3D の位置）に当たるかを三角形の中の割合から求めて塗る。左右の UV は別の所にあるので左右とも描ける"""
    import numpy as np
    mats = find_materials(p.get('material', 'Tops_01'))
    src = mats[0]
    ext = src.vrm_addon_extension.mtoon1
    img = ext.pbr_metallic_roughness.base_color_texture.index.source
    if img is None:
        raise RuntimeError('上着のテクスチャがありません')
    W, H = img.size
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)

    hw_pts = [tuple(x) for x in sorted(p['half_width'])]
    zlo, zhi = p.get('z', [0.86, 1.38])
    facing_min = float(p.get('facing', 0.2))
    tape = float(p.get('tape_width', 0.007))
    shade_w = float(p.get('shade_width', 0.012))
    pitch = float(p.get('teeth_pitch', 0.006))
    shirt = np.array(_hex8(p.get('shirt_color', '#F8F8F3')))
    shade = np.array(_hex8(p.get('shade_color', '#D8D6CC')))
    tape_c = np.array(_hex8(p.get('tape_color', '#A9BE86')))
    teeth_c = np.array(_hex8(p.get('teeth_color', '#7F9468')))
    btn = p.get('buttons') or {}
    btn_z, btn_r = btn.get('z', []), float(btn.get('radius', 0.004))
    btn_c = np.array(_hex8(btn.get('color', '#D9D9D2')))
    # stripes: {"pitch": 縞の間隔 m, "width": 色の縞の幅 m, "color", "z0": 縞の始まりの高さ}（ボーダーのシャツ。無ければ無地）
    st = p.get('stripes')
    if st:
        st_pitch, st_w, st_z0 = float(st['pitch']), float(st['width']), float(st.get('z0', 0.0))
        st_c = np.array(_hex8(st['color']))
    cx = float(p.get('center_x', 0.0))
    # erase_band: {"max_d": 開きの中心からの距離 m, "min_r", "min_g", "min_gb"（緑−青）, "fill": "#RRGGBB"}
    er = p.get('erase_band')
    if er:
        er_max, er_r, er_g, er_gb = float(er.get('max_d', 0.09)), float(er.get('min_r', 0.72)), float(er.get('min_g', 0.8)), float(er.get('min_gb', 0.04))
        er_fill = np.array(_hex8(er.get('fill', '#FFFFFF')))
    front = Vector((0, -1, 0))
    painted = erased = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m in mats}
        if not idx:
            continue
        me = o.data
        me.calc_loop_triangles()
        uv = me.uv_layers.active.data
        mw, rot = o.matrix_world, o.matrix_world.to_3x3()
        for t in me.loop_triangles:
            if t.material_index not in idx or (rot @ t.normal).normalized().dot(front) < facing_min:
                continue
            P = np.array([list(mw @ me.vertices[v].co) for v in t.vertices])
            if P[:, 2].max() < zlo or P[:, 2].min() > zhi:
                continue
            maxhw = max(v for _, v in hw_pts) + tape + shade_w
            if np.abs(P[:, 0] - cx).min() > maxhw + 0.02:
                continue
            U = np.array([[uv[l].uv.x * W, uv[l].uv.y * H] for l in t.loops])
            x0, y0 = np.floor(U.min(axis=0)).astype(int)
            x1, y1 = np.ceil(U.max(axis=0)).astype(int)
            x0, y0 = max(x0, 0), max(y0, 0)
            x1, y1 = min(x1, W - 1), min(y1, H - 1)
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            (ax, ay), (bx, by), (qx, qy) = U
            den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy)
            if abs(den) < 1e-9:
                continue
            w0 = ((by - qy) * (gx - qx) + (qx - bx) * (gy - qy)) / den
            w1 = ((qy - ay) * (gx - qx) + (ax - qx) * (gy - qy)) / den
            w2 = 1 - w0 - w1
            inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
            if not inside.any():
                continue
            X = w0 * P[0, 0] + w1 * P[1, 0] + w2 * P[2, 0]
            Z = w0 * P[0, 2] + w1 * P[1, 2] + w2 * P[2, 2]
            hw = np.interp(Z, [z for z, _ in hw_pts], [v for _, v in hw_pts])
            d = np.abs(X - cx)
            zin = (Z >= zlo) & (Z <= zhi)
            reg_shirt = inside & zin & (d < hw)
            reg_tape = inside & zin & (d >= hw) & (d < hw + tape)
            sub = px[y0:y1 + 1, x0:x1 + 1]
            col = sub[..., :3]
            # 閉じた上着の合わせ目として描いてあった薄い黄緑の帯を、上着の地の色で消す（開きの外側に片側だけ残ると左右がそろわない）
            if er:
                rgb = col
                band = inside & zin & ~reg_shirt & ~reg_tape & (d < er_max) & (rgb[..., 0] > er_r) & (rgb[..., 1] > er_g) & (rgb[..., 1] - rgb[..., 2] > er_gb)
                col = np.where(band[..., None], er_fill, col)
                erased += int(band.sum())
            col = np.where(reg_shirt[..., None], shirt, col)
            if st:
                col = np.where((reg_shirt & (np.mod(Z - st_z0, st_pitch) < st_w))[..., None], st_c, col)
            # 開いた端の際の陰（シャツ側）
            edge = reg_shirt & (hw - d < shade_w)
            f = np.clip((hw - d) / max(shade_w, 1e-6), 0, 1)[..., None]
            col = np.where(edge[..., None], shade * (1 - f) + col * f, col)  # 縞の上にも陰をかける（無地なら col は shirt と同じ）
            # ボタン
            for bz in btn_z:
                bmask = reg_shirt & ((X - cx) ** 2 + (Z - bz) ** 2 < btn_r ** 2)
                col = np.where(bmask[..., None], btn_c, col)
            # ファスナー: テープと、高さで交互に並ぶ歯（テープの内側半分）
            teeth = reg_tape & (d < hw + tape * 0.55) & (np.floor(Z / pitch) % 2 == 0)
            col = np.where(reg_tape[..., None], tape_c, col)
            col = np.where(teeth[..., None], teeth_c, col)
            sub[..., :3] = col
            painted += int((reg_shirt | reg_tape).sum())
    out = bpy.data.images.new(img.name + '_hq3d_open', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        ext.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = ext.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:  # 陰の側も同じ絵にする（替えないと、陰になった所だけ元の閉じた上着が見える）
            mt.shade_multiply_texture.index.source = out
    return {'part': 'jacket_open', 'painted_px': painted, 'erased_px': erased, 'texture': [W, H]}


# ── 上着のフード ─────────────────────────────────────────

def _outer_hit(origin, d, max_r):
    """origin から水平の向き d へ光線を進め、max_r 以内で当たった面のうち、いちばん外の距離を返す（無ければ 0.05）"""
    far = 0.0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.name.startswith('HQ3D_'):
            continue
        inv = o.matrix_world.inverted()
        start = inv @ origin
        ld = (inv.to_3x3() @ d).normalized()
        for _ in range(16):
            ok, loc, _, _ = o.ray_cast(start, ld)
            if not ok:
                break
            dist = ((o.matrix_world @ loc) - origin).length
            if dist > max_r:
                break
            far = max(far, dist)
            start = loc + ld * 1e-4
    return far or 0.05

def hood(p):
    """背中に垂れた上着のフード: 背中に沿ってふくらむ本体（クリーム色）＋首まわりの太い縁（緑の裏地）。上胸の骨に付ける。
      panel: {"z": [下, 上], "half_width": [[t, 半分の幅], …]（t=0 が上・1 が下）, "bulge"（真ん中のふくらみ m）, "offset", "cols", "rows"}
      rim:   {"z_back", "z_front", "angles": [左前, 右前]（度。0＝真後ろ）, "radius"（縁の太さ m）, "offset", "steps"}
      neck:  首の中心（省くと首の骨の付け根）
      lapel: {"edge": [[z, 前の開きのふちの |x|], …], "z_end", "width", "end_radius", "offset", "blend", "material",
              "fold_end": 折り返しの終わる高さ z, "zipper": {"width", "pitch"}（テープは cord_color・歯は leaf_color）}
             （かえり: 縁の前の端から、上着の前の開きのふちに沿って下へ続く丸いひも。縁の太さから end_radius へ細くなる。無くてよい）
    本体は後ろ（+Y 側）から体へ光線を当てて表面に沿わせる。縁は首の中心から外へ向けた光線を内向きに当てて襟に沿わせる"""
    arm = armature()
    bone = p.get('bone', 'J_Bip_C_UpperChest')
    neck = Vector(p['neck']) if p.get('neck') else arm.matrix_world @ arm.data.bones['J_Bip_C_Neck'].head_local
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}

    # 本体: 背中の格子
    pn = p['panel']
    zlo, zhi = pn['z']
    hw_pts = [tuple(x) for x in pn['half_width']]
    cols, rows = int(pn.get('cols', 24)), int(pn.get('rows', 20))
    bulge, off = float(pn.get('bulge', 0.035)), float(pn.get('offset', 0.008))
    grid = []
    for r in range(rows + 1):
        t = r / rows
        z = zhi - (zhi - zlo) * t
        hw = profile(t, hw_pts)
        row = []
        for c in range(cols + 1):
            s = -1 + 2 * c / cols
            x = neck.x + s * hw
            pt = None
            for k in range(12):  # 首の高さの横は体が無い（肩はもっと下）。当たるまで下へずらし、背中の奥行きだけを使う
                try:
                    hit, nrm = ray_hit((x, 2.0, z - 0.01 * k), (0, -1, 0), None, 0.0)
                    pt = Vector((x, hit.y, z)) if k else hit
                    if k:
                        nrm = Vector((0, 1, 0))
                    break
                except RuntimeError:
                    continue
            if pt is None:
                raise RuntimeError('フードの下に背中が見つかりません: x=%.3f z=%.3f' % (x, z))
            # ふくらみ: 横は真ん中ほど、縦は上から少し下がった所がいちばん（下の先と上の縁は体に寄る）
            puff = bulge * (1 - s * s) * math.sin(math.pi * min(1.0, 0.15 + t * 0.85))
            row.append(bm.verts.new(pt + nrm * (off + puff)))
        grid.append(row)
    for r in range(rows):
        for c in range(cols):
            groups[0].append(bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c])))

    # 縁: 首のまわりを後ろから両脇の前まで回る太いひも（緑の裏地）
    rm = p['rim']
    a0, a1 = rm.get('angles', [-115, 115])
    steps = int(rm.get('steps', 28))
    pts = []
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        d = Vector((math.sin(a), math.cos(a), 0))  # 0 度＝真後ろ（+Y）・±90 度＝横
        k = abs(math.degrees(a)) / max(abs(a0), abs(a1))
        z = rm['z_back'] + (rm['z_front'] - rm['z_back']) * k ** 1.5
        # 首の中心から外へ光線を出し、首から max_r 以内で当たったいちばん外の面（襟）を使う。
        # 外から内へ当てると、T ポーズで横へ伸びた腕に先に当たってしまう
        r_out = _outer_hit(Vector((neck.x, neck.y, z)), d, float(rm.get('max_r', 0.12)))
        pts.append(Vector((neck.x, neck.y, z)) + d * (r_out + float(rm.get('radius', 0.016)) + float(rm.get('offset', 0.004))))
    groups[4] += _tube(bm, pts, float(rm.get('radius', 0.016)), segs=12)

    lp = p.get('lapel')
    if lp:  # かえり: 縁の前の端から、上着の前の開きのふちに沿って下へ続く平たい帯（フードの縁と一続きに見せる）
        edge = sorted((float(z), float(x)) for z, x in lp['edge'])

        def edge_x(z):
            return profile(z, edge)
        w, th = float(lp.get('width', 0.03)), float(lp.get('thick', 0.006))
        mat = lp.get('material', 'Tops_01')
        for end in (pts[0], pts[-1]):
            sd = 1 if end.x >= 0 else -1
            z_top, z_end = end.z, float(lp['z_end'])
            n = max(6, int((z_top - z_end) / 0.01))
            path, nrms = [], []
            for i in range(n + 1):
                t = i / n
                z = z_top - (z_top - z_end) * t
                bx = sd * (edge_x(z) + w * 0.5)
                f = min(1.0, t / float(lp.get('blend', 0.25)))  # 上の数 cm で縁の端から開きのふちへなめらかに移る
                f = f * f * (3 - 2 * f)
                x = end.x + (bx - end.x) * f
                hit, nrm = surface_point(x, z, float(lp.get('offset', 0.004)), mat)
                if i == 0:
                    hit = end.copy()
                path.append(hit)
                nrms.append(nrm)
            # 縁と同じ丸いひもで続け、下へ行くほど細くする（平たい帯だと背広のえりのように見えた）。
            # fold_end があれば、その高さで折り返し（緑の裏地）は細くなって終わり、その下はファスナーだけが続く
            r0, r1 = float(rm.get('radius', 0.016)), float(lp.get('end_radius', 0.01))
            fz = lp.get('fold_end')
            radii = []
            for i, c in enumerate(path):
                if fz is None:
                    radii.append(r1 + (r0 - r1) * (1 - i / max(len(path) - 1, 1)) ** 3)  # 縁から離れるとすぐ細くなる
                else:
                    f = max(0.0, min(1.0, (c.z - float(fz)) / max(z_top - float(fz), 1e-6)))
                    radii.append(r0 * f ** 0.6)
            last = len(path) if fz is None else max(2, sum(1 for c in path if c.z > float(fz)) + 1)
            rings = []
            for i, c in enumerate(path[:last]):
                tng = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
                _, u, v = _frame(tng)
                rr = max(radii[i], 0.0008)
                rings.append([bm.verts.new(c + nrms[i] * rr * 0.6 + (u * math.cos(2 * math.pi * k / 12) + v * math.sin(2 * math.pi * k / 12)) * rr) for k in range(12)])
            for a_, b_ in zip(rings, rings[1:]):
                for k in range(12):
                    groups[4].append(bm.faces.new((a_[k], a_[(k + 1) % 12], b_[(k + 1) % 12], b_[k])))
            groups[4].append(bm.faces.new(rings[-1]))
            zp = lp.get('zipper')
            if zp:  # ファスナー: 折り返しの内側のふち（真ん中側）に沿って、折り返しと一緒に曲がり、その下は前の開きのふちを裾まで
                zw, pitch = float(zp.get('width', 0.006)), float(zp.get('pitch', 0.005))
                inward = Vector((-sd, 0, 0))
                zpath = [c + nrms[i] * (radii[i] * 1.2 + 0.0015) + inward * radii[i] * 0.9 for i, c in enumerate(path)]
                groups[2] += _band(bm, zpath, zw, 0.0015, sum(nrms, Vector()).normalized())
                acc, k = 0.0, 0
                for i in range(len(zpath) - 1):
                    a_, b_ = zpath[i], zpath[i + 1]
                    seg = (b_ - a_).length
                    while acc <= seg:
                        c = a_.lerp(b_, acc / max(seg, 1e-9))
                        tng = (b_ - a_).normalized()
                        side = tng.cross(nrms[i]).normalized()
                        groups[3] += _ellipsoid(bm, c + side * zw * 0.18 * (1 if k % 2 else -1) + nrms[i] * 0.0012,
                                                (side * zw * 0.32, tng * pitch * 0.32, nrms[i] * 0.0012), segs=6, rings=3)
                        acc += pitch
                        k += 1
                    acc -= seg

    # 本体のふち: 少し濃い色の細いパイピングで、平らな布に見えないようにする
    if pn.get('piping', True):
        border = [grid[0][c] for c in range(cols + 1)] + [grid[r][cols] for r in range(1, rows + 1)] + \
                 [grid[rows][c] for c in range(cols - 1, -1, -1)] + [grid[r][0] for r in range(rows - 1, 0, -1)]
        groups[1] += _tube(bm, [v.co.copy() for v in border[cols:]], float(pn.get('piping_radius', 0.004)), segs=6)
    verts = _make_object(p, p.get('name', 'HQ3D_Hood'), bone, groups)
    return {'part': 'hood', 'verts': verts, 'neck': [round(v, 3) for v in neck]}


# ── ズボン: 裾の色・柄・ポケット ──────────────────────────────

def recolor_region(p):
    """材質名に material を含む面のうち、高さ z の範囲にある面だけを、テクスチャ無しの単色の新しい材質に替える
    （VRoid の裾の濃いチェックの折り返しを、ズボンと同じ緑の無地にするなど。同じ材質の他の所＝ウエストなどはそのまま）"""
    zlo, zhi = p['z']
    name = p.get('name', 'HQ3D_Region')
    new = plain_mtoon(p['material'], name, p['color'], p.get('shade_color'))
    count = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        o.data.materials.append(new)
        ni = len(o.data.materials) - 1
        for pl in o.data.polygons:
            if pl.material_index in idx and zlo <= (o.matrix_world @ pl.center).z <= zhi:
                pl.material_index = ni
                count += 1
    if not count:
        raise RuntimeError('その高さに面がありません: %s z=%s' % (p['material'], p['z']))
    return {'part': 'recolor_region', 'faces': count}


def _bake_factor(m, np):
    """基本色をテクスチャに焼き込んで基本色を白にした写しを返す（柄を本当の色で描くため。テクスチャ × 濃い基本色 だと描いた色も沈む）。
    陰の色は 陰 ÷ 基本色 にして、もとの所の陰の見え方を変えない。戻り値: (画素の配列 H×W×4・sRGB, 画像)"""
    ext = m.vrm_addon_extension.mtoon1
    pbr = ext.pbr_metallic_roughness
    mt = ext.extensions.vrmc_materials_mtoon
    img = pbr.base_color_texture.index.source
    W, H = img.size
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    f = np.array(pbr.base_color_factor[:3], dtype=np.float32)
    lin = np.where(px[..., :3] <= 0.04045, px[..., :3] / 12.92, ((px[..., :3] + 0.055) / 1.055) ** 2.4) * f
    px[..., :3] = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.maximum(lin, 0), 1 / 2.4) - 0.055)
    sh = tuple(mt.shade_color_factor)
    mt.shade_color_factor = tuple(min(1.0, s / max(b, 1e-4)) for s, b in zip(sh, f))
    pbr.base_color_factor = (1.0, 1.0, 1.0, pbr.base_color_factor[3])
    return px, img


def _texel_pass(o, mats, px, facing_min, zlo, zhi, fn):
    """o の mats の面（前を向いたもの）のテクスチャの画素ごとに、体の位置 X・Z を求めて fn(X, Z, inside, rgb) → 新しい rgb を呼ぶ"""
    import numpy as np
    H, W = px.shape[:2]
    me = o.data
    me.calc_loop_triangles()
    uv = me.uv_layers.active.data
    mw, rot = o.matrix_world, o.matrix_world.to_3x3()
    idx = {i for i, m in enumerate(me.materials) if m in mats}
    front = Vector((0, -1, 0))
    for t in me.loop_triangles:
        if t.material_index not in idx or (rot @ t.normal).normalized().dot(front) < facing_min:
            continue
        P = np.array([list(mw @ me.vertices[v].co) for v in t.vertices])
        if P[:, 2].max() < zlo or P[:, 2].min() > zhi:
            continue
        U = np.array([[uv[l].uv.x * W, uv[l].uv.y * H] for l in t.loops])
        x0, y0 = np.floor(U.min(axis=0)).astype(int)
        x1, y1 = np.ceil(U.max(axis=0)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W - 1), min(y1, H - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (qx, qy) = U
        den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy)
        if abs(den) < 1e-9:
            continue
        w0 = ((by - qy) * (gx - qx) + (qx - bx) * (gy - qy)) / den
        w1 = ((qy - ay) * (gx - qx) + (ax - qx) * (gy - qy)) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not inside.any():
            continue
        X = w0 * P[0, 0] + w1 * P[1, 0] + w2 * P[2, 0]
        Z = w0 * P[0, 2] + w1 * P[1, 2] + w2 * P[2, 2]
        sub = px[y0:y1 + 1, x0:x1 + 1]
        sub[..., :3] = fn(X, Z, inside & (Z >= zlo) & (Z <= zhi), sub[..., :3])


def texture_vines(p):
    """布に草花のつるの柄を描く（正面から見た X・Z の位置で描く。左右の脚など、UV が別の所にある前の面）。
      vines: [{"x", "z": [下, 上], "amp", "waves", "phase", "width", "leaf_every", "leaf_size", "flower_every", "flower_size", "jitter", "seed"}]
      vine_color・leaf_color・flower_colors（順に使う）・center_color
    基本色をテクスチャに焼き込んでから描く（_bake_factor）"""
    import numpy as np
    mats = find_materials(p['material'])
    px, img = _bake_factor(mats[0], np)
    vine_c = np.array(_hex8(p.get('vine_color', '#A3B05C')))
    leaf_c = np.array(_hex8(p.get('leaf_color', '#B9C46E')))
    fl_cs = [np.array(_hex8(c)) for c in p.get('flower_colors', ['#F2A7B5', '#F2D36B'])]
    ctr_c = np.array(_hex8(p.get('center_color', '#F7E9A8')))
    # つるごとに、葉と花の位置を前もって決める（同じ調整値なら同じ柄）
    shapes = []
    for vi, v in enumerate(p['vines']):
        z0, z1 = v['z']

        def xv(z, v=v, z0=z0, z1=z1):
            return v['x'] + v.get('amp', 0.02) * np.sin(2 * np.pi * v.get('waves', 1.5) * (z - z0) / (z1 - z0) + v.get('phase', 0.0))
        leaves, flowers = [], []
        k = 0
        jit = float(v.get('jitter', 0.0))  # 葉と花の間と大きさを不ぞろいに（0〜0.8。規則正しい並びに見えないように）
        rj = __import__('random').Random(vi * 101 + int(v.get('seed', 0)))
        z = z0 + v.get('leaf_every', 0.035) * 0.5
        while z < z1:
            side = 1 if k % 2 == 0 else -1
            dz = 0.002
            slope = (xv(z + dz) - xv(z - dz)) / (2 * dz)
            ang = np.arctan2(1.0, slope) + side * 0.9  # つるの向きから左右へ開く
            leaves.append((float(xv(z)), z, ang, v.get('leaf_size', 0.012) * (1 + jit * rj.uniform(-0.5, 0.5))))
            z += v.get('leaf_every', 0.035) * (1 + jit * rj.uniform(-0.6, 1.2))
            k += 1
        z = z0 + v.get('flower_every', 0.09) * 0.6
        j = 0
        while z < z1:
            off = v.get('flower_size', 0.009) * 1.2 * (1 if j % 2 == 0 else -1)
            if not (jit and rj.random() < jit * 0.4):  # 不ぞろいのときは、ところどころ花を抜く
                flowers.append((float(xv(z)) + off, z, v.get('flower_size', 0.009) * (1 + jit * rj.uniform(-0.4, 0.5)), fl_cs[(vi + j) % len(fl_cs)]))
            z += v.get('flower_every', 0.09) * (1 + jit * rj.uniform(-0.7, 1.0))
            j += 1
        shapes.append((v, z0, z1, xv, leaves, flowers))

    def paint(X, Z, inside, rgb):
        col = rgb.copy()
        for v, z0, z1, xv, leaves, flowers in shapes:
            inz = inside & (Z >= z0) & (Z <= z1)
            if not inz.any():
                continue
            col = np.where((inz & (np.abs(X - xv(Z)) < v.get('width', 0.0025)))[..., None], vine_c, col)
            for lx, lz, ang, ls in leaves:
                cx, cz = lx + np.cos(ang) * ls * 0.6, lz + np.sin(ang) * ls * 0.6
                u = (X - cx) * np.cos(ang) + (Z - cz) * np.sin(ang)
                w = -(X - cx) * np.sin(ang) + (Z - cz) * np.cos(ang)
                col = np.where((inside & ((u / (ls * 0.6)) ** 2 + (w / (ls * 0.25)) ** 2 < 1))[..., None], leaf_c, col)
            for fx, fz, fs, fc in flowers:
                m = np.zeros(X.shape, bool)
                for i in range(5):
                    a = 2 * np.pi * i / 5 + 0.3
                    m |= (X - (fx + np.cos(a) * fs * 0.55)) ** 2 + (Z - (fz + np.sin(a) * fs * 0.55)) ** 2 < (fs * 0.42) ** 2
                col = np.where((inside & m)[..., None], fc, col)
                col = np.where((inside & ((X - fx) ** 2 + (Z - fz) ** 2 < (fs * 0.25) ** 2))[..., None], ctr_c, col)
        return col

    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and any(m in mats for m in o.data.materials):
            _texel_pass(o, mats, px, float(p.get('facing', 0.3)), min(v['z'][0] for v in p['vines']) - 0.03, max(v['z'][1] for v in p['vines']) + 0.03, paint)
    W, H = img.size
    out = bpy.data.images.new(img.name + '_hq3d_vines', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        ext.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = ext.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:
            mt.shade_multiply_texture.index.source = out
    return {'part': 'texture_vines', 'vines': len(p['vines']), 'leaves': sum(len(s[4]) for s in shapes), 'flowers': sum(len(s[5]) for s in shapes)}


def side_pocket(p):
    """太ももの外側のカーゴポケット（ふた付き）。外から横向きの光線を脚の布（material）にだけ当てて表面に沿わせる。
      pockets: [{"bone", "side": 1 か -1（+x 側か -x 側）, "y": [前, 後ろ], "z": [下, 上]}]・flap（ふたの高さ m）・bulge・color・center_color（ふた）"""
    made = []
    mat = p.get('material', 'Onepiece_00_CLOTH_01')
    for i, pk in enumerate(p['pockets']):
        bm = bmesh.new()
        groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
        sd = float(pk['side'])
        (ya, yb), (zlo, zhi) = pk['y'], pk['z']
        flap = float(p.get('flap', 0.03))
        bulge = float(p.get('bulge', 0.008))

        def patch(y0, y1, z0, z1, extra, slot, rows=10, cols=8):
            grid = []
            for r in range(rows + 1):
                z = z0 + (z1 - z0) * r / rows
                row = []
                for c in range(cols + 1):
                    y = y0 + (y1 - y0) * c / cols
                    pt, nrm = ray_hit((sd * 0.6, y, z), (-sd, 0, 0), mat, 0.0)
                    s, t = -1 + 2 * c / cols, -1 + 2 * r / rows
                    puff = bulge * (1 - s * s) * (1 - t * t)
                    row.append(bm.verts.new(pt + nrm * (float(p.get('offset', 0.004)) + extra + puff)))
                grid.append(row)
            for r in range(rows):
                for c in range(cols):
                    groups[slot].append(bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c])))
        patch(ya, yb, zlo, zhi - flap * 0.4, 0.0, 0)
        mid = (ya + yb) / 2
        half = (yb - ya) / 2 * 1.08
        patch(mid - half, mid + half, zhi - flap, zhi, 0.006, 1, rows=4)
        name = '%s_%d' % (p.get('name', 'HQ3D_Pocket'), i)
        made.append({'name': name, 'bone': pk['bone'], 'verts': _make_object(dict(p, material_from=p.get('material_from', mat)), name, pk['bone'], groups)})
    return {'part': 'side_pocket', 'made': made}


def pants_shape(p):
    """ズボンの形を変える: 脚の芯（股関節→ひざ→足首の骨）から外へ、高さごとの倍率で布の頂点を押し出す。
    ゆったりした太さ・裾のしぼり（ジョガー型）・裾の上のたるみのしわ（横向きの波）を作る。頂点の数・つながり・骨の重みは変えない。
      material: 動かす布の材質名（の一部）・profile: [[高さ z, 倍率], …]（間は直線でつなぐ・範囲の外は端の値）
      inner: 脚の内側（股の側）へは 倍率の増えた分 × inner だけ（両脚が重ならないように）。真ん中（x=0）の近くでは 0 へ落とす
      wrinkles: {"z": [下, 上], "amp": 倍率の振れ幅, "wave": 波の間隔 m}（たるみのしわ。無くてよい）
      round: 0〜1（断面を丸い筒へ寄せる。ふくらはぎの出っ張りが布に写らない。倍率をかけたあとも元の布より 3% 外に残すので、肌は外へ出ない）
      crotch_drop: {"z": [下, 上], "gap": 真ん中からのすき間 m, "strength"}（股を下げる。上の端で内側の布を真ん中へ寄せきり、下の端では 0）
    外へ押し出すだけなので、下の肌が布の外へ出ることはない（倍率は 1 以上にする）"""
    arm = armature()
    mw_arm = arm.matrix_world
    prof = sorted((float(z), float(s)) for z, s in p['profile'])
    if min(s for _, s in prof) < 1.0:
        raise RuntimeError('倍率は 1 以上にする（縮めると下の肌が布の外へ出る）')
    inner = float(p.get('inner', 0.3))
    wr = p.get('wrinkles')
    cd = p.get('crotch_drop')

    def scale_at(z):
        if z <= prof[0][0]:
            return prof[0][1]
        for (z0, s0), (z1, s1) in zip(prof, prof[1:]):
            if z <= z1:
                return s0 + (s1 - s0) * (z - z0) / (z1 - z0)
        return prof[-1][1]

    axes = {}
    for side, c in ((1, 'L'), (-1, 'R')):  # モデルの左＝+x
        pts = []
        for b in ('J_Bip_%s_UpperLeg' % c, 'J_Bip_%s_LowerLeg' % c, 'J_Bip_%s_Foot' % c):
            bone = arm.data.bones.get(b)
            if bone is None:
                raise RuntimeError('骨が見つかりません: ' + b)
            pts.append(mw_arm @ bone.head_local)
        axes[side] = sorted(pts, key=lambda v: v.z)  # 低い順（足首・ひざ・股関節）

    def axis_at(side, z):
        a = axes[side]
        if z <= a[0].z:
            return a[0]
        for p0, p1 in zip(a, a[1:]):
            if z <= p1.z:
                return p0.lerp(p1, (z - p0.z) / max(p1.z - p0.z, 1e-6))
        return a[-1]

    rnd = float(p.get('round', 0.0))  # 0〜1: 断面を丸い筒へ寄せる（脚の形＝ふくらはぎの出っ張りを布に写さない）
    moved, objs = 0, []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        verts = {v for pl in o.data.polygons if pl.material_index in idx for v in pl.vertices}
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        top = prof[-1][0]
        mean_r = {}
        if rnd > 0:  # 高さ 1 cm ごと・左右の脚ごとの、芯からの距離の平均（外側だけ）
            acc = {}
            for vi in verts:
                w = mw @ o.data.vertices[vi].co
                if w.z > top:
                    continue
                sd = 1 if w.x >= 0 else -1
                c = axis_at(sd, w.z)
                key = (sd, int(w.z * 100))
                a = acc.setdefault(key, [0.0, 0])
                a[0] += math.hypot(w.x - c.x, w.y - c.y)
                a[1] += 1
            mean_r = {k: a[0] / a[1] for k, a in acc.items()}
        for vi in verts:
            v = o.data.vertices[vi]
            w = mw @ v.co
            if w.z > top:
                continue
            s = scale_at(w.z)
            if wr and wr['z'][0] <= w.z <= wr['z'][1]:  # 裾の上のたるみ: 高さで波打たせ、上下の端では 0
                u = (w.z - wr['z'][0]) / (wr['z'][1] - wr['z'][0])
                s += float(wr['amp']) * math.sin(math.pi * u) * (0.5 + 0.5 * math.cos(2 * math.pi * (w.z - wr['z'][0]) / float(wr['wave'])))
            if s <= 1.0 and not (cd and cd['z'][0] <= w.z <= cd['z'][1]):
                continue
            s = max(s, 1.0)
            side = 1 if w.x >= 0 else -1
            c = axis_at(side, w.z)
            rx, ry = w.x - c.x, w.y - c.y
            if rnd > 0 and (side, int(w.z * 100)) in mean_r:
                r0 = math.hypot(rx, ry)
                if r0 > 1e-6:
                    # 平均の筒へ寄せる。出っ張りは引っ込めるが、倍率 s をかけたあとでも元の布より 3% 外に残す（下の肌が出ない）
                    k = max((1 - rnd) * r0 + rnd * mean_r[(side, int(w.z * 100))], r0 * 1.03 / max(s, 1.0)) / r0
                    rx, ry = rx * k, ry * k
            if rx * side < 0:  # 内側（股の側）: 控えめに。真ん中の近くでは動かさない（左右の脚の境目で頂点が飛ばないように）
                fade = min(1.0, abs(w.x) / 0.05)
                sx = 1 + (s - 1) * inner * fade * fade * (3 - 2 * fade)
            else:
                sx = s
            new = Vector((c.x + rx * sx, c.y + ry * s, w.z))
            if cd and rx * side < 0 and cd['z'][0] <= w.z <= cd['z'][1]:  # 股を下げる: 内側の布を真ん中へ寄せて、左右の脚を低い所まで合わせる
                f = (w.z - cd['z'][0]) / (cd['z'][1] - cd['z'][0])
                f = f * f * (3 - 2 * f)
                new.x = new.x + (side * float(cd.get('gap', 0.004)) - new.x) * f * float(cd.get('strength', 1.0))
            v.co = mi @ new
            moved += 1
        o.data.update()
        objs.append(o.name)
    if not moved:
        raise RuntimeError('動かす布がありません: ' + p['material'])
    return {'part': 'pants_shape', 'moved_verts': moved, 'objects': objs}


def garment_inflate(p):
    """上着をひと回り大きくする（オーバーサイズ）。胴は体の縦の芯から水平に、袖は腕の骨の芯から外へ、頂点を押し出す。
    向きは法線ではなく芯からの向きなので、裏地の面（法線が内向き）も表と同じだけ外へ出る。頂点の数・つながり・骨の重みは変えない。
    小物（チャーム・フード など）は表面へ光線を当てて置くので、この手順は小物より前に置く。
      material: 布の材質名（の一部）
      torso: [[高さ z, 押し出す m], …]（間は直線・範囲の外は端の値）・arm: [[肩からの長さ m, 押し出す m], …]
      blend: 肩の境目で胴と袖を混ぜる幅 m
      shoulder: {"x": [内, 外], "z": [下, 上], "out": m}  … 肩の所を横（外）へ広げる（肩の落ちた、なだらかな肩）
      sleeve_extend: {"from": 肩からの長さ m, "add": m}（袖を手の甲の方へ伸ばす。from より先を引きのばす）
      lengthen: {"from": これより下を伸ばす高さ z, "hem": 今の裾の高さ z, "add": 伸ばす長さ m, "leg_weight": 裾での太ももの骨の重み（0〜0.6）}
        … 裾を下へ伸ばす（from〜hem の間を引きのばす。柄も一緒に伸びる）。伸ばした所は太ももの骨にも重みを分けて、歩くと脚に付いて動く"""
    arm = armature()
    mwa = arm.matrix_world
    tor = sorted((float(z), float(v)) for z, v in p['torso'])
    armp = sorted((float(s), float(v)) for s, v in p['arm'])
    if min(v for _, v in tor + armp) < 0:
        raise RuntimeError('押し出す量は 0 以上にする（縮めると下の肌やシャツが布の外へ出る）')
    blend = float(p.get('blend', 0.03))

    def prof(pr, x):
        if x <= pr[0][0]:
            return pr[0][1]
        for (a, va), (b, vb) in zip(pr, pr[1:]):
            if x <= b:
                return va + (vb - va) * (x - a) / (b - a)
        return pr[-1][1]
    y_c = (mwa @ arm.data.bones['J_Bip_C_Chest'].head_local).y
    chains = {}
    for side, c in ((1, 'L'), (-1, 'R')):
        chains[side] = [mwa @ arm.data.bones['J_Bip_%s_%s' % (c, b)].head_local for b in ('UpperArm', 'LowerArm', 'Hand')]

    def arm_disp(w, side):
        J = chains[side]
        best, out = None, None
        acc = 0.0
        for a, b in zip(J, J[1:]):
            ab = b - a
            L = ab.length
            t = max(0.0, min(1.0, (w - a).dot(ab) / (L * L)))
            r = w - (a + ab * t)
            if best is None or r.length < best:
                best = r.length
                out = (acc + t * L, r)
            acc += L
        s, r = out
        ax = (J[-1] - J[0]).normalized()
        r = r - ax * r.dot(ax)
        d = r.normalized() * prof(armp, s) if r.length > 1e-6 else Vector()
        if se and s > float(se['from']):  # 袖を手の方へ伸ばす（from より先を引きのばす）
            send = (J[1] - J[0]).length + (J[2] - J[1]).length
            f = min(1.0, (s - float(se['from'])) / max(send - float(se['from']), 1e-6))
            d += ax * float(se['add']) * f
        return d

    sh, ln = p.get('shoulder'), p.get('lengthen')
    se = p.get('sleeve_extend')
    if ln and not 0 <= float(ln.get('leg_weight', 0.4)) <= 0.6:
        raise RuntimeError('leg_weight は 0〜0.6')
    hip_z = (mwa @ arm.data.bones['J_Bip_L_UpperLeg'].head_local).z
    moved, objs = 0, []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        verts = {v for pl in o.data.polygons if pl.material_index in idx for v in pl.vertices}
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        leg_w = {}
        for vi in verts:
            v = o.data.vertices[vi]
            w = mw @ v.co
            side = 1 if w.x >= 0 else -1
            sx = abs(chains[side][0].x)
            h = Vector((w.x, w.y - y_c, 0))
            d_t = h.normalized() * prof(tor, w.z) if h.length > 1e-6 else Vector()
            k = max(0.0, min(1.0, (abs(w.x) - (sx - blend)) / (2 * blend)))  # 肩の外ほど袖の押し出し
            k *= max(0.0, min(1.0, (w.z - (chains[side][0].z - 0.2)) / 0.05))  # 腕の高さの近くだけ（脇の下の身頃・裾は胴として扱う）
            k = k * k * (3 - 2 * k)
            d = d_t * (1 - k) + arm_disp(w, side) * k
            if sh:  # なだらかな肩: 肩の所を外へ。範囲の端では 0
                fx = max(0.0, min(1.0, (abs(w.x) - sh['x'][0]) / (sh['x'][1] - sh['x'][0])))
                fz = max(0.0, min(1.0, (w.z - sh['z'][0]) / (sh['z'][1] - sh['z'][0])))
                d += Vector((side * float(sh['out']) * math.sin(math.pi * fx) * math.sin(math.pi * fz), 0, 0))
            if ln and w.z < ln['from']:  # 裾を伸ばす: from〜hem を from〜(hem - add) へ引きのばす
                z0, z1 = float(ln['from']), float(ln['hem'])
                nz = z0 - (z0 - w.z) * (z0 - (z1 - float(ln['add']))) / (z0 - z1)
                d += Vector((0, 0, nz - w.z))
                tl = max(0.0, min(1.0, (hip_z - nz) / max(hip_z - (z1 - float(ln['add'])), 1e-6)))
                if tl > 0:
                    leg_w[vi] = float(ln.get('leg_weight', 0.4)) * tl * tl * (3 - 2 * tl)
            if d.length < 1e-7:
                continue
            v.co = mi @ (w + d)
            moved += 1
        for vi, lw in leg_w.items():  # 伸ばした裾に太ももの骨の重みを分ける（ほかの骨の重みは 1 - lw 倍）
            v = o.data.vertices[vi]
            for g in v.groups:
                g.weight *= (1 - lw)
            name = 'J_Bip_%s_UpperLeg' % ('L' if (mw @ v.co).x >= 0 else 'R')
            vg = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
            vg.add([vi], lw, 'ADD')
        o.data.update()
        objs.append(o.name)
    if not moved:
        raise RuntimeError('動かす布がありません: ' + p['material'])
    return {'part': 'garment_inflate', 'moved_verts': moved, 'objects': objs}


def cuff_gather(p):
    """ズボンの裾をすぼめる（ジョガー型）。材質の頂点を、脚の芯（ひざ→足首の骨）へ向けて scale 倍に寄せる。
    芯からの距離は min_r（m）より小さくしない（下の足首の肌が布の外へ出ないように）。高さ z の範囲の外は動かさない。
      material: 材質名（の一部）・z: [下, 上]・scale: 0.5〜1・min_r"""
    arm = armature()
    mwa = arm.matrix_world
    sc, min_r = float(p['scale']), float(p.get('min_r', 0.04))
    if not 0.5 <= sc <= 1.0:
        raise RuntimeError('scale は 0.5〜1（すぼめるだけ）')
    z0, z1 = p['z']
    axes = {}
    for side, c in ((1, 'L'), (-1, 'R')):
        a = mwa @ arm.data.bones['J_Bip_%s_LowerLeg' % c].head_local
        b = mwa @ arm.data.bones['J_Bip_%s_Foot' % c].head_local
        axes[side] = (a, b)
    moved = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        verts = {v for pl in o.data.polygons if pl.material_index in idx for v in pl.vertices}
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        for vi in verts:
            v = o.data.vertices[vi]
            w = mw @ v.co
            if not z0 <= w.z <= z1:
                continue
            a, b = axes[1 if w.x >= 0 else -1]
            ab = b - a
            t = (w - a).dot(ab) / ab.length_squared
            c = a + ab * t
            r = Vector((w.x - c.x, w.y - c.y, 0))
            if r.length < 1e-6:
                continue
            nr = max(min_r, r.length * sc)
            if nr >= r.length:
                continue
            v.co = mi @ Vector((c.x + r.x * nr / r.length, c.y + r.y * nr / r.length, w.z))
            moved += 1
        o.data.update()
    if not moved:
        raise RuntimeError('すぼめる頂点がありません: ' + p['material'])
    return {'part': 'cuff_gather', 'moved_verts': moved}


def _weighted_object(name, bm, mats, vgroups):
    """bmesh と材質の一覧から、骨の重みを頂点ごとに付けたメッシュを作る。vgroups: [[(骨, 重み), …] 頂点の順]"""
    arm = armature()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    for m in mats:
        me.materials.append(m)
    inv = arm.matrix_world.inverted()
    for vtx in me.vertices:
        vtx.co = inv @ vtx.co
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    ob.matrix_world = arm.matrix_world.copy()
    gs = {}
    for vi, ws in enumerate(vgroups):
        for bone, w in ws:
            g = gs.get(bone) or ob.vertex_groups.new(name=bone)
            gs[bone] = g
            g.add([vi], w, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    return ob


def shoe_hightop(p):
    """靴をハイカットにする: 足首のまわりに、靴の口から上へ伸びる筒（厚みのある 2 重の壁）を足し、上の縁の詰め物・前の靴ひも・外側の金の飾りを付ける。
    下は足の骨、上はすねの骨へ重みを移す（足首を曲げても筒が付いてくる）。
      z: [下, 上]・radius: [[高さの割合 0〜1, 横の半径 m, 前後の半径 m], …]・center_dy: 足の骨から前後へずらす m・thick: 壁の厚み m
      color・shade_color・tag: {"color", "size", "t": 高さの割合}（外側の横の金の飾り。無くてよい）
      rim: {"radius"}（上の縁の詰め物）・laces: {"color", "rows", "spread": 前からの角度（度）, "t": [下, 上]（高さの割合）, "radius"}（前の靴ひも）"""
    arm = armature()
    mwa = arm.matrix_world
    z0, z1 = p['z']
    prof = sorted((float(a), float(b), float(c)) for a, b, c in p['radius'])
    th = float(p.get('thick', 0.004))
    segs, rows = int(p.get('segs', 28)), int(p.get('rows', 8))

    def rad(t):
        for (a, rx0, ry0), (b, rx1, ry1) in zip(prof, prof[1:]):
            if t <= b:
                f = (t - a) / (b - a)
                return rx0 + (rx1 - rx0) * f, ry0 + (ry1 - ry0) * f
        return prof[-1][1], prof[-1][2]

    def up_w(t):
        return t * t * (3 - 2 * t) * 0.7
    tmpl = p.get('material_from', 'Tops_01')
    base_name = p.get('name', 'HQ3D_HighTop')
    mats = [plain_mtoon(tmpl, base_name, p['color'], p.get('shade_color'))]
    tag = p.get('tag')
    if tag:
        mats.append(plain_mtoon(tmpl, base_name + '_Tag', tag['color'], tag.get('shade_color')))
    if p.get('laces'):
        mats.append(plain_mtoon(tmpl, base_name + '_Laces', p['laces']['color'], p['laces'].get('shade_color')))
    made = []
    for c in ('L', 'R'):
        foot_b, leg_b = 'J_Bip_%s_Foot' % c, 'J_Bip_%s_LowerLeg' % c
        foot = mwa @ arm.data.bones[foot_b].head_local
        cx, cy = foot.x, foot.y + float(p.get('center_dy', 0.0))
        bm = bmesh.new()
        vw = []
        rings = {}
        for wall in ('out', 'in'):
            rr = []
            for i in range(rows + 1):
                t = i / rows
                z = z0 + (z1 - z0) * t
                rx, ry = rad(t)
                if wall == 'in':
                    rx, ry = rx - th, ry - th
                row = []
                for k in range(segs):
                    a = 2 * math.pi * k / segs
                    row.append(bm.verts.new(Vector((cx + rx * math.cos(a), cy + ry * math.sin(a), z))))
                    u = up_w(t)
                    vw.append([(foot_b, 1 - u), (leg_b, u)] if u > 1e-3 else [(foot_b, 1.0)])
                rr.append(row)
            rings[wall] = rr
        for wall in ('out', 'in'):
            rr = rings[wall]
            for i in range(rows):
                for k in range(segs):
                    q = (rr[i][k], rr[i][(k + 1) % segs], rr[i + 1][(k + 1) % segs], rr[i + 1][k])
                    bm.faces.new(q if wall == 'out' else q[::-1])
        for i in (0, rows):  # 上と下の縁を外壁と内壁でつなぐ
            o, n = rings['out'][i], rings['in'][i]
            for k in range(segs):
                q = (o[k], n[k], n[(k + 1) % segs], o[(k + 1) % segs])
                bm.faces.new(q if i == rows else q[::-1])
        out_sign = 1 if c == 'L' else -1  # 外側（モデルの左足は +x）

        def ring_pt(t, a, extra=0.0):
            rx, ry = rad(t)
            return Vector((cx + (rx + extra) * math.cos(a), cy + (ry + extra) * math.sin(a), z0 + (z1 - z0) * t))

        def add_verts_weight(nv, t):
            u = up_w(t)
            vw.extend([[(foot_b, 1 - u), (leg_b, u)] if u > 1e-3 else [(foot_b, 1.0)]] * (len(bm.verts) - nv))
        rim = p.get('rim')
        if rim:  # 上の縁の厚い詰め物（ぐるりと一周する管）
            nv = len(bm.verts)
            pts = [ring_pt(1.0, 2 * math.pi * k / segs, -th / 2) for k in range(segs + 1)]
            _tube(bm, pts, float(rim.get('radius', 0.004)), 8)
            add_verts_weight(nv, 1.0)
        lc = p.get('laces')
        if lc:  # 前の靴ひも: 左右の穴を、段ごとに交互にバツで結ぶ
            n = int(lc.get('rows', 3))
            spread = math.radians(float(lc.get('spread', 28)))
            ta, tb = lc.get('t', [0.1, 0.85])
            for i in range(n):
                t0 = ta + (tb - ta) * i / n
                t1 = ta + (tb - ta) * (i + 1) / n
                for s0, s1 in ((-1, 1), (1, -1)):
                    nv = len(bm.verts)
                    # 筒の表面に沿わせる（まっすぐ結ぶと、曲がった筒の中に沈む）
                    pts = [ring_pt(t0 + (t1 - t0) * j / 10, -math.pi / 2 + (s0 + (s1 - s0) * j / 10) * spread, 0.0028) for j in range(11)]
                    for f in _tube(bm, pts, float(lc.get('radius', 0.0018)), 6):
                        f.material_index = len(mats) - 1
                    add_verts_weight(nv, (t0 + t1) / 2)
        if tag:  # 金の飾り: 外側の横に、平たい楕円体
            t = float(tag.get('t', 0.55))
            a = 0.0 if out_sign > 0 else math.pi
            ctr = ring_pt(t, a, 0.002)
            sz = float(tag.get('size', 0.012))
            nv = len(bm.verts)
            for f in _ellipsoid(bm, ctr, (Vector((0, sz * 0.75, 0)), Vector((0, 0, sz * 0.75)), Vector((out_sign * sz * 0.18, 0, 0))), segs=10, rings=5):
                f.material_index = 1
            add_verts_weight(nv, t)
        name = '%s_%s' % (base_name, c)
        ob = _weighted_object(name, bm, mats, vw)
        made.append({'name': name, 'verts': len(ob.data.vertices)})
    return {'part': 'shoe_hightop', 'made': made}


def ear_fluff(p):
    """猫耳の内側に白い毛の房を足す: 耳の内側の材質の面から、下の方（付け根寄り）をくじで選び、
    面の向き＋上向きへ立てた平たい四角すいを置く。重みはいちばん近い耳の頂点の重みを写す（耳と一緒に揺れる）。
      material: 耳の内側の材質名・count（片耳）・len・width・up: 上向きに混ぜる量・z_frac: 耳の高さの下から何割までに置くか・seed・color・shade_color"""
    import random
    rng = random.Random(int(p.get('seed', 4)))
    src = None
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and any(m and p['material'] in m.name for m in o.data.materials):
            src = o
            break
    if src is None:
        raise RuntimeError('耳の材質が見つかりません: ' + p['material'])
    me = src.data
    mw = src.matrix_world
    idx = {i for i, m in enumerate(me.materials) if m and p['material'] in m.name}
    gname = {g.index: g.name for g in src.vertex_groups}
    polys = [pl for pl in me.polygons if pl.material_index in idx]
    made = 0
    bm = bmesh.new()
    vw = []
    for side in (1, -1):
        ps = [pl for pl in polys if (mw @ pl.center).x * side > 0]
        if not ps:
            continue
        zs = [(mw @ pl.center).z for pl in ps]
        zl, zh = min(zs), max(zs)
        cand = [pl for pl in ps if (mw @ pl.center).z <= zl + (zh - zl) * float(p.get('z_frac', 0.6))]
        for _ in range(int(p['count'])):
            pl = rng.choice(cand)
            c = mw @ pl.center
            nrm = (mw.to_3x3() @ pl.normal).normalized()
            if nrm.y > 0:  # 耳の内側は前向き（-y）。裏の面に当たったら向きをそろえる
                nrm = -nrm
            d = (nrm + Vector((side * 0.3, 0, float(p.get('up', 1.0))))).normalized()
            sv = d.cross(Vector((0, 1, 0)))
            sv = sv.normalized() if sv.length > 1e-6 else Vector((1, 0, 0))
            fv = d.cross(sv).normalized()
            wd = float(p['width']) * rng.uniform(0.7, 1.2)
            ln = float(p['len']) * rng.uniform(0.6, 1.3)
            vi = min(pl.vertices, key=lambda v: (mw @ me.vertices[v].co - c).length)
            ws = [(gname[g.group], g.weight) for g in me.vertices[vi].groups if g.weight > 1e-4]
            base = [bm.verts.new(c + q) for q in (sv * wd * 0.5, fv * wd * 0.15, -sv * wd * 0.5, -fv * wd * 0.15)]
            tip = bm.verts.new(c + d * ln)
            for k in range(4):
                bm.faces.new((base[k], base[(k + 1) % 4], tip))
            vw += [ws] * 5
            made += 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    name = p.get('name', 'HQ3D_EarFluff')
    m = plain_mtoon(p.get('material_from', 'Tops_01'), name, p.get('color', '#FFFFFF'), p.get('shade_color', '#E8E2DA'))
    _weighted_object(name, bm, [m], vw)
    return {'part': 'ear_fluff', 'tufts': made}


def sole_thicken(p):
    """靴底を厚くする: 靴の材質の頂点の高さを、下の z0 までは factor 倍に引きのばし、z0〜z1 の間は詰めて、z1 より上は動かさない。
    床（z=0）より下へは出ない（足が床に沈まない）。靴の上に置く小物（靴ひも）は表面に当てて置くので、この手順は小物より前に置く。
      material: 靴の材質名（の一部）・z0・z1・factor（1〜2）"""
    z0, z1, f = float(p['z0']), float(p['z1']), float(p['factor'])
    if not 1.0 <= f <= 2.0 or not 0 < z0 * f < z1:
        raise RuntimeError('factor は 1〜2、z0 × factor は z1 より下にする')
    moved = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        verts = {v for pl in o.data.polygons if pl.material_index in idx for v in pl.vertices}
        mw, mi = o.matrix_world, o.matrix_world.inverted()
        for vi in verts:
            v = o.data.vertices[vi]
            w = mw @ v.co
            if w.z >= z1:
                continue
            if w.z <= z0:
                nz = max(0.0, w.z) * f
            else:
                nz = z0 * f + (w.z - z0) * (z1 - z0 * f) / (z1 - z0)
            v.co = mi @ Vector((w.x, w.y, nz))
            moved += 1
        o.data.update()
    if not moved:
        raise RuntimeError('靴の頂点がありません: ' + p['material'])
    return {'part': 'sole_thicken', 'moved_verts': moved}


def toon_style(p):
    """塗りの雰囲気をそろえる（水彩風）: MToon の陰の境目をやわらかく（toony を下げる）し、輪郭線を細く・黒でなく色のある線にする。
    名前に exclude の文字を含む材質（目・まつげなど）は変えない。
      toony: 陰の境目の固さ（0〜1）・outline_color: 輪郭線の色・outline_lighting_mix: 輪郭線に光をどれだけ混ぜるか（0〜1）
      outline_width_scale: 輪郭線の太さの倍率"""
    oc = hex_linear(p['outline_color'])
    changed = []
    for m in bpy.data.materials:
        e = m.vrm_addon_extension.mtoon1
        if not e.enabled or any(x in m.name for x in p.get('exclude', [])):
            continue
        mt = e.extensions.vrmc_materials_mtoon
        if 'toony' in p:
            mt.shading_toony_factor = min(mt.shading_toony_factor, float(p['toony']))
        mt.outline_color_factor = tuple(oc[:3])
        mt.outline_lighting_mix_factor = float(p.get('outline_lighting_mix', mt.outline_lighting_mix_factor))
        mt.outline_width_factor = mt.outline_width_factor * float(p.get('outline_width_scale', 1.0))
        changed.append(m.name)
    return {'part': 'toon_style', 'materials': len(changed)}


def hanging_straps(p):
    """腰の脇から垂れる細い帯（先に金具）。脚の外側の布（material）へ横から光線を当て、表面から clearance だけ外を通す。
    下へ行くほど外へ出た所を保つ（脚が細くなっても帯は内へ曲がらず、まっすぐ垂れて見える）。
      straps: [{"side": 1（+x＝モデルの左）か -1, "y", "z_top", "length", "width", "bone", "tip": 金具の長さ m（0 で無し）}]
      color（帯）・center_color（金具）・thickness・clearance"""
    mat = p.get('material', 'Onepiece_00_CLOTH_01')
    th = float(p.get('thickness', 0.003))
    clr = float(p.get('clearance', 0.006))
    made = []
    for i, st in enumerate(p['straps']):
        sd = float(st['side'])
        y, w = float(st['y']), float(st['width'])
        z0 = float(st['z_top'])
        n = max(2, int(round(float(st['length']) / 0.01)))
        out = None
        path = []
        for k in range(n + 1):
            z = z0 - float(st['length']) * k / n
            try:
                hit, _ = ray_hit((sd * 0.6, y, z), (-sd, 0, 0), mat, 0.0)
                o = sd * hit.x + clr
            except RuntimeError:  # ひざの近くで脚が細くなり光線が外れたら、上の位置のまま垂らす
                if out is None:
                    raise
                o = out
            out = o if out is None else max(out, o)
            path.append(Vector((sd * (out + th / 2), y, z)))
        bm = bmesh.new()
        groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}

        def box_strip(pts, half_w, half_t, slot):
            rings = []
            for c in pts:
                rings.append([bm.verts.new(c + Vector((sd * a * half_t, b * half_w, 0))) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
            for r0, r1 in zip(rings, rings[1:]):
                for j in range(4):
                    groups[slot].append(bm.faces.new((r0[j], r0[(j + 1) % 4], r1[(j + 1) % 4], r1[j])))
            groups[slot].append(bm.faces.new(rings[0][::-1]))
            groups[slot].append(bm.faces.new(rings[-1]))
        box_strip(path, w / 2, th / 2, 0)
        tip = float(st.get('tip', 0.0))
        if tip > 0:
            e = path[-1]
            box_strip([e + Vector((0, 0, -0.002)), e + Vector((0, 0, -0.002 - tip))], w * 0.45, th * 1.3, 1)
        name = '%s_%d' % (p.get('name', 'HQ3D_Strap'), i)
        made.append({'name': name, 'bone': st['bone'], 'verts': _make_object(dict(p, material_from=p.get('material_from', mat)), name, st['bone'], groups)})
    return {'part': 'hanging_straps', 'made': made}


def _ensure_uv(o):
    """UV が無ければ、角度で分けた自動の展開（Smart UV Project）で作る"""
    if o.data.uv_layers:
        return False
    for ob in bpy.context.scene.objects:
        ob.select_set(False)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    o.data.uv_layers.new(name='UVMap')
    bpy.ops.object.mode_set(mode='EDIT')
    try:
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01)
    finally:
        bpy.ops.object.mode_set(mode='OBJECT')
    return True


def surface_pattern(p):
    """パーツ（尻尾・フードなど）の表面に、小枝（葉と花）の柄を散らしたテクスチャを作って貼る。
    柄は立体の表面の位置で描く（UV の切れ目をまたいでも形が続く）。UV が無ければ自動で作る。
      object: 物体の名前・materials: 柄を描く材質の名前（ほかの材質＝裏地などは描かない）
      count: 小枝の数・min_dist: 小枝どうしの最小の間（m）・size: 小枝の大きさ（m）・seed
      leaf_colors・flower_colors・center_color・flower_ratio（花の付く小枝の割合）・leaves（小枝 1 本の葉の数）・softness（0〜1・柄の濃さ）
      resolution: テクスチャの一辺（画素）
    基本色はテクスチャに焼き込み、陰の色は 陰 ÷ 基本色 にして、陰の所にも柄が出るよう陰のテクスチャにも同じものを使う"""
    import random

    import numpy as np
    o = bpy.data.objects.get(p['object'])
    if o is None or o.type != 'MESH':
        raise RuntimeError('物体が見つかりません: ' + p['object'])
    me = o.data
    mats = [m for m in me.materials if m and m.name in p['materials']]
    if not mats:
        raise RuntimeError('材質が見つかりません: %s' % p['materials'])
    made_uv = _ensure_uv(o)
    res = int(p.get('resolution', 1024))
    rng = random.Random(int(p.get('seed', 1)))
    mw, rot = o.matrix_world, o.matrix_world.to_3x3()
    me.calc_loop_triangles()
    idx = {i for i, m in enumerate(me.materials) if m in mats}
    tris = [t for t in me.loop_triangles if t.material_index in idx]
    areas = np.array([t.area for t in tris])
    if not len(tris):
        raise RuntimeError('柄を描く面がありません')

    # 小枝の置き場所: 面の広さに比例してくじを引き、近すぎるものは捨てる（同じ seed なら同じ柄）
    cum = np.cumsum(areas) / areas.sum()
    size = float(p.get('size', 0.012))
    min_d = float(p.get('min_dist', size * 2.2))
    sprigs = []
    tries = 0
    while len(sprigs) < int(p['count']) and tries < int(p['count']) * 60:
        tries += 1
        t = tris[int(np.searchsorted(cum, rng.random()))]
        a, b = rng.random(), rng.random()
        if a + b > 1:
            a, b = 1 - a, 1 - b
        P = [mw @ me.vertices[v].co for v in t.vertices]
        c = P[0] + (P[1] - P[0]) * a + (P[2] - P[0]) * b
        if any((c - s['c']).length < min_d for s in sprigs):
            continue
        n, u, v = _frame((rot @ t.normal).normalized())
        ang = rng.uniform(0, 2 * math.pi)
        u, v = u * math.cos(ang) + v * math.sin(ang), -u * math.sin(ang) + v * math.cos(ang)
        sc = size * rng.uniform(0.8, 1.15)
        leaves = []
        for k in range(int(p.get('leaves', 3))):
            la = -0.9 + 1.8 * k / max(int(p.get('leaves', 3)) - 1, 1) + rng.uniform(-0.25, 0.25)
            leaves.append((la, rng.choice(p.get('leaf_colors', ['#B9C97A']))))
        flower = rng.random() < float(p.get('flower_ratio', 0.3))
        sprigs.append({'c': c, 'n': n, 'u': u, 'v': v, 's': sc, 'leaves': leaves, 'flower': flower,
                       'fc': rng.choice(p.get('flower_colors', ['#F2B8C2']))})

    # テクスチャ: 地は基本色。三角形ごとに UV の画素を回り、その画素の表面の位置で柄を描く
    ext0 = mats[0].vrm_addon_extension.mtoon1
    base = list(ext0.pbr_metallic_roughness.base_color_factor[:3])
    base8 = np.array([round(255 * (c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)) for c in base], dtype=np.float32)
    px = np.zeros((res, res, 4), dtype=np.float32)
    px[..., :3] = base8 / 255.0
    px[..., 3] = 1.0
    soft = float(p.get('softness', 0.85))
    ctr = np.array(_hex8(p.get('center_color', '#F7E3A0')), dtype=np.float32)
    uvd = me.uv_layers.active.data
    painted = 0
    for t in tris:
        Pw = np.array([list(mw @ me.vertices[vi].co) for vi in t.vertices])
        lo, hi = Pw.min(axis=0) - size * 1.6, Pw.max(axis=0) + size * 1.6
        near = [s for s in sprigs if all(lo[k] <= s['c'][k] <= hi[k] for k in range(3))]
        if not near:
            continue
        U = np.array([[uvd[l].uv.x * res, uvd[l].uv.y * res] for l in t.loops])
        x0, y0 = np.floor(U.min(axis=0)).astype(int) - 1
        x1, y1 = np.ceil(U.max(axis=0)).astype(int) + 1
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, res - 1), min(y1, res - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (qx, qy) = U
        den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy)
        if abs(den) < 1e-12:
            continue
        w0 = ((by - qy) * (gx - qx) + (qx - bx) * (gy - qy)) / den
        w1 = ((qy - ay) * (gx - qx) + (ax - qx) * (gy - qy)) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.05) & (w1 >= -0.05) & (w2 >= -0.05)  # 少しはみ出して塗る（UV の切れ目の色のにじみ止め）
        if not inside.any():
            continue
        X = w0[..., None] * Pw[0] + w1[..., None] * Pw[1] + w2[..., None] * Pw[2]
        sub = px[y0:y1 + 1, x0:x1 + 1, :3]
        for s in near:
            d = X - np.array(s['c'])
            a = d @ np.array(s['u'])
            b = d @ np.array(s['v'])
            h = np.abs(d @ np.array(s['n']))
            ok = inside & (h < s['s'] * 0.8)  # 薄い所の裏側へ描き抜けない
            if not ok.any():
                continue
            sc = s['s']
            # 茎（小枝の真ん中を通る細い線）
            stem = ok & (np.abs(a) < sc * 0.06) & (b > -sc * 0.9) & (b < sc * 0.5)
            sub[stem] = sub[stem] * (1 - soft) + np.array(_hex8(s['leaves'][0][1]), dtype=np.float32) * 0.85 * soft
            for la, lc in s['leaves']:  # 葉: 茎から斜めに出る細長い楕円
                cx, cy = math.sin(la) * sc * 0.45, -0.25 * sc + math.cos(la) * sc * 0.35
                ca, sa = math.cos(la), math.sin(la)
                lu = (a - cx) * ca - (b - cy) * sa
                lv = (a - cx) * sa + (b - cy) * ca
                m = ok & ((lu / (sc * 0.16)) ** 2 + (lv / (sc * 0.4)) ** 2 < 1)
                sub[m] = sub[m] * (1 - soft) + np.array(_hex8(lc), dtype=np.float32) * soft
            if s['flower']:  # 花: 茎の先に 5 枚の花びら＋真ん中
                fy = sc * 0.5
                fr = sc * 0.34
                m = np.zeros(a.shape, bool)
                for k in range(5):
                    pa = 2 * math.pi * k / 5
                    m |= (a - math.cos(pa) * fr * 0.55) ** 2 + (b - fy - math.sin(pa) * fr * 0.55) ** 2 < (fr * 0.45) ** 2
                m &= ok
                fcol = np.array(_hex8(s['fc']), dtype=np.float32)
                sub[m] = sub[m] * (1 - soft) + fcol * soft
                cm = ok & (a ** 2 + (b - fy) ** 2 < (fr * 0.22) ** 2)
                sub[cm] = ctr
            painted += 1
    img = bpy.data.images.new(p.get('image_name', o.name + '_hq3d_pattern'), res, res, alpha=True)
    img.colorspace_settings.name = 'sRGB'
    img.pixels.foreach_set(px.ravel())
    img.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        pbr = ext.pbr_metallic_roughness
        mt = ext.extensions.vrmc_materials_mtoon
        f = list(pbr.base_color_factor[:3])
        sh = list(mt.shade_color_factor)
        mt.shade_color_factor = tuple(min(1.0, s / max(b, 1e-4)) for s, b in zip(sh, f))
        pbr.base_color_factor = (1.0, 1.0, 1.0, pbr.base_color_factor[3])
        pbr.base_color_texture.index.source = img
        mt.shade_multiply_texture.index.source = img
    return {'part': 'surface_pattern', 'object': o.name, 'sprigs': len(sprigs), 'flowers': sum(1 for s in sprigs if s['flower']), 'made_uv': made_uv}


def glasses_frame(p):
    """眼鏡を作り直す: 元の眼鏡（VRoid の丸い枠とレンズ）の位置と、顔への沿い方（奥行き）を測ってから元を消し、
    細い角ばった枠（角を丸めた長方形＝超楕円）・ブリッジ・つるを細い管で作る。元の眼鏡と同じ骨に重み 1 で付ける。
      lens_material / frame_material: 元のレンズと枠の材質名（の一部）。位置はレンズから測る
      width_scale・height_scale: 元のレンズの幅・高さに対する倍率・z_offset: 上下のずらし（m）
      top_n・bottom_n: 上半分・下半分の角ばり（大きいほど四角い）・radius: 枠の太さ（管の半径 m）・color"""
    lens_name = p.get('lens_material', 'GlassesHiLens')
    frame_name = p.get('frame_material', 'GlassesHiFrame')
    rings, temple_end, bone = {}, {}, None
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        gname = {g.index: g.name for g in o.vertex_groups}
        for mi, m in enumerate(me.materials):
            if not m or not (lens_name in m.name or frame_name in m.name):
                continue
            vs = {v for pl in me.polygons if pl.material_index == mi for v in pl.vertices}
            P = [o.matrix_world @ me.vertices[i].co for i in vs]
            if bone is None:
                for i in vs:
                    if me.vertices[i].groups:
                        bone = gname[max(me.vertices[i].groups, key=lambda x: x.weight).group]
                        break
            for sd in (1, -1):
                Q = [q for q in P if q.x * sd > 0]
                if not Q:
                    continue
                if lens_name in m.name:
                    rings[sd] = Q
                else:
                    ymin = min(q.y for q in P)
                    back = [q for q in Q if q.y > ymin + 0.03]
                    if back:
                        temple_end[sd] = max(back, key=lambda q: q.y)
    if len(rings) != 2 or bone is None:
        raise RuntimeError('元の眼鏡（レンズ）が見つかりません: %s' % lens_name)
    ws, hs = float(p.get('width_scale', 1.0)), float(p.get('height_scale', 0.72))
    rad = float(p.get('radius', 0.0009))
    tn, bn = float(p.get('top_n', 6.0)), float(p.get('bottom_n', 3.2))
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
    geo = {}
    for sd, Q in rings.items():
        xs = [abs(q.x) for q in Q]
        x0, x1 = min(xs), max(xs)
        z0, z1 = min(q.z for q in Q), max(q.z for q in Q)
        # 奥行きは x の 1 次式で近似（顔の丸みに沿って外ほど後ろ）。最小二乗
        n = len(Q)
        mx, my = sum(xs) / n, sum(q.y for q in Q) / n
        sxx = sum((x - mx) ** 2 for x in xs) or 1e-9
        b = sum((x - mx) * (q.y - my) for x, q in zip(xs, Q)) / sxx
        yat = lambda ax, mx=mx, my=my, b=b: my + b * (ax - mx) - float(p.get('front', 0.0015))
        cx, hw = (x0 + x1) / 2, (x1 - x0) / 2 * ws
        cz, hh = (z0 + z1) / 2 + float(p.get('z_offset', 0.0)), (z1 - z0) / 2 * hs
        pts = []
        for k in range(73):
            t = 2 * math.pi * k / 72
            c, s = math.cos(t), math.sin(t)
            e = tn if s >= 0 else bn
            u = math.copysign(abs(c) ** (2 / e), c)
            v = math.copysign(abs(s) ** (2 / e), s)
            ax = cx + u * hw
            pts.append(Vector((sd * ax, yat(ax), cz + v * hh)))
        groups[0] += _tube(bm, pts, rad, 6)
        geo[sd] = (cx, hw, cz, hh, yat)
    # ブリッジ: 左右の枠の内側の上寄りを、少し上へ反らせてつなぐ
    cxl, hwl, czl, hhl, yl = geo[1]
    a = Vector((-(cxl - hwl), yl(cxl - hwl), czl + hhl * 0.45))
    bpt = Vector(((cxl - hwl), yl(cxl - hwl), czl + hhl * 0.45))
    bridge = [a.lerp(bpt, i / 8) + Vector((0, -0.0012 * math.sin(math.pi * i / 8), 0.0025 * math.sin(math.pi * i / 8))) for i in range(9)]
    groups[0] += _tube(bm, bridge, rad * 0.9, 6)
    # つる: 枠の外側の上寄り（ちょうつがい）から、元のつるの端へ
    made_temples = 0
    for sd, (cx, hw, cz, hh, yat) in geo.items():
        if sd not in temple_end:
            continue
        hx = cx + hw
        h = Vector((sd * hx, yat(hx), cz + hh * 0.5))
        e = temple_end[sd]
        mid = Vector((sd * max(abs(e.x), hx + 0.006), h.y + 0.02, h.z - 0.001))
        path = [h, h + Vector((sd * 0.004, 0.006, 0)), mid] + [mid.lerp(e, i / 6) for i in range(1, 7)]
        groups[0] += _tube(bm, path, rad * 0.9, 6)
        made_temples += 1
    removed = 0
    for nm in (lens_name, frame_name):
        r, _ = remove_faces_by_material(nm)
        removed += r
    name = p.get('name', 'HQ3D_Glasses')
    verts = _make_object(dict(p, material_from=p.get('material_from', 'Tops_01')), name, bone, groups)
    return {'part': 'glasses_frame', 'bone': bone, 'verts': verts, 'temples': made_temples, 'removed_faces': removed,
            'rims': {str(sd): [round(v, 4) for v in g[:4]] for sd, g in geo.items()}}


def _edit_bones(arm, fn):
    """骨の休みの姿勢を編集モードで変える（fn(edit_bones)）。終わったら物体モードへ戻す"""
    for o in bpy.context.scene.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    try:
        fn(arm.data.edit_bones)
    finally:
        bpy.ops.object.mode_set(mode='OBJECT')


def _move_vertices(o, delta_of):
    """頂点を delta_of(世界座標, 頂点) の分だけ動かす（世界座標の差）。表情などの形（シェイプキー）にも同じ差を足すので、表情の動きは変わらない"""
    mw = o.matrix_world
    rot = mw.to_3x3().inverted()
    keys = o.data.shape_keys.key_blocks if o.data.shape_keys else []
    n = 0
    for v in o.data.vertices:
        d = delta_of(mw @ v.co, v)
        if d is None or d.length < 1e-9:
            continue
        dl = rot @ d
        v.co += dl
        for kb in keys:
            kb.data[v.index].co += dl
        n += 1
    o.data.update()
    return n


def tail_swing(p):
    """尻尾の休みの姿勢を、付け根を中心に横（と後ろ）へ振る。骨の先ほど少しずつ多く曲げて、ゆるい弧にする。
    尻尾の筒（cat_tail_tube）は骨の位置から作るので、この手順は cat_tail_tube より前に置く。揺れものの設定は骨の名前で付くのでそのまま使える。
      first_bone・side: 横へ振る角度（度。＋でモデルの左＝+x）・back: 後ろへ持ち上げる角度（度）・curl: 先へ行くほど足す横の角度（度・全体で）"""
    from mathutils import Matrix
    arm = armature()
    chain = bone_chain(arm, p.get('first_bone', 'J_Opt_C_CatTail1_01'))
    names = [b.name for b in chain]
    extra = set()
    for b in chain:
        extra |= {c.name for c in b.children_recursive}
    side, back, curl = (math.radians(float(p.get(k, 0.0))) for k in ('side', 'back', 'curl'))
    n = len(names)

    def fn(eb):
        pivot = eb[names[0]].head.copy()
        # 全体: 前後の軸（y）のまわりに横へ、横の軸（x）のまわりに後ろへ
        R = Matrix.Rotation(-side, 3, 'Y') @ Matrix.Rotation(back, 3, 'X')
        moved = {}
        for nm in names + sorted(extra - set(names)):
            b = eb[nm]
            moved[nm] = (pivot + R @ (b.head - pivot), pivot + R @ (b.tail - pivot))
        # 先ほど曲げる: i 本目の骨より先を、その骨の付け根のまわりに curl / n ずつ回す
        for i, nm in enumerate(names[1:], 1):
            piv = moved[nm][0]
            Ri = Matrix.Rotation(-curl / n, 3, 'Y')
            for nm2 in names[i:] + [x for x in extra if x not in names]:
                h, t = moved[nm2]
                moved[nm2] = (piv + Ri @ (h - piv), piv + Ri @ (t - piv))
        for nm, (h, t) in moved.items():
            eb[nm].head = h
            eb[nm].tail = t
    _edit_bones(arm, fn)
    return {'part': 'tail_swing', 'bones': n}


def closed_lash_fix(p):
    """目を閉じる表情（まばたき・笑い目）で、まつげ（VRoid の目尻の毛の束）を、閉じたまぶたの線に付けて小さくする。
    VRoid のまま閉じると、まつげが斜め下へねじれて閉じたまぶたの下へ突き出し、笑い目では目の下に点々と並んだ。
    まつげの頂点ごとに、いちばん近いアイラインの頂点を探し、その頂点が表情で動いた分だけ一緒に動かしてから、
    その頂点を中心に shrink 倍に縮める（向きは開いた目のまま＝目尻から外上へ）。
      object・material: まつげの材質名（の一部）・follow: まぶたの線の材質名（の一部）・keys: 直すシェイプキーの名前・shrink（0〜1）"""
    from mathutils import kdtree
    o = bpy.data.objects.get(p.get('object', 'Face'))
    if o is None or not o.data.shape_keys:
        raise RuntimeError('シェイプキーのある物体が見つかりません')
    me = o.data
    kbs = me.shape_keys.key_blocks
    basis = me.shape_keys.reference_key
    sh = float(p.get('shrink', 0.3))
    if not 0 <= sh <= 1:
        raise RuntimeError('shrink は 0〜1')

    def verts_of(name):
        idx = {i for i, m in enumerate(me.materials) if m and name in m.name}
        return sorted({v for pl in me.polygons if pl.material_index in idx for v in pl.vertices})
    lash, line = verts_of(p.get('material', 'FaceEyelash')), verts_of(p.get('follow', 'FaceEyeline'))
    if not lash or not line:
        raise RuntimeError('まつげかまぶたの線の頂点が見つかりません')
    kd = kdtree.KDTree(len(line))
    for i, v in enumerate(line):
        kd.insert(basis.data[v].co, i)
    kd.balance()
    near = {}
    for v in lash:
        b = basis.data[v].co
        # 同じ側（左右）の、いちばん近いまぶたの線の頂点
        cands = [(line[i], d) for _, i, d in kd.find_n(b, 8) if (basis.data[line[i]].co.x > 0) == (b.x > 0)]
        near[v] = cands[0][0] if cands else line[kd.find(b)[1]]
    done = []
    missing = [k for k in p['keys'] if k not in kbs]
    if missing:
        raise RuntimeError('シェイプキーが見つかりません: %s' % missing)
    for k in p['keys']:
        kb = kbs[k]
        for v in lash:
            e = near[v]
            lid = kb.data[e].co
            kb.data[v].co = lid + (basis.data[v].co - basis.data[e].co) * sh
        done.append(k)
    me.update()
    return {'part': 'closed_lash_fix', 'keys': done, 'lash_verts': len(lash)}


def follow_weights(p):
    """小物の骨の重みを、いちばん近い布の頂点の重みから写す（布と同じように曲がる）。
    ポケットは太ももの骨 1 本に付けると、脚を上げたとき布だけが曲がってふたが浮いた。
    垂れる紐は hang で下ほど腰の骨（hang_bone）へ重みを寄せ、脚に貼り付かず腰から垂れるようにする。
      objects: 物体の名前の頭（例 "HQ3D_Pocket"）の一覧・material: 写し元の布の材質名（の一部）
      hang: {"bone": 寄せる骨, "z": [下, 上], "max": 下の端での割合（0〜1）}（無くてよい）"""
    from mathutils import kdtree
    src = None
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and any(m and p['material'] in m.name for m in o.data.materials):
            src = o
            break
    if src is None:
        raise RuntimeError('布が見つかりません: ' + p['material'])
    me = src.data
    idx = {i for i, m in enumerate(me.materials) if m and p['material'] in m.name}
    verts = sorted({v for pl in me.polygons if pl.material_index in idx for v in pl.vertices})
    mw = src.matrix_world
    kd = kdtree.KDTree(len(verts))
    for i, v in enumerate(verts):
        kd.insert(mw @ me.vertices[v].co, i)
    kd.balance()
    gname = {g.index: g.name for g in src.vertex_groups}
    hang = p.get('hang')
    done = []
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(o.name.startswith(n) for n in p['objects'])]:
        omw = o.matrix_world
        new = []
        for v in o.data.vertices:
            w = omw @ v.co
            _, i, _ = kd.find(w)
            ws = {gname[g.group]: g.weight for g in me.vertices[verts[i]].groups if g.weight > 1e-4}
            tot = sum(ws.values()) or 1.0
            ws = {k: x / tot for k, x in ws.items()}
            if hang:
                z0, z1 = hang['z']
                t = max(0.0, min(1.0, (z1 - w.z) / (z1 - z0))) * float(hang.get('max', 0.6))
                ws = {k: x * (1 - t) for k, x in ws.items()}
                ws[hang['bone']] = ws.get(hang['bone'], 0.0) + t
            new.append(ws)
        for g in list(o.vertex_groups):
            o.vertex_groups.remove(g)
        groups = {}
        for vi, ws in enumerate(new):
            for b, x in ws.items():
                g = groups.get(b) or o.vertex_groups.new(name=b)
                groups[b] = g
                g.add([vi], x, 'REPLACE')
        done.append(o.name)
    if not done:
        raise RuntimeError('小物が見つかりません: %s' % p['objects'])
    return {'part': 'follow_weights', 'objects': done}


def ear_flatten(p):
    """人の耳を頭の横へ押しつぶして目立たなくする（猫耳のキャラで、人の耳を髪の下に隠すため）。
    肌の材質の頂点のうち、高さ z・前後 y の範囲で、横へ x0 より外へ出た分を keep 倍にする。範囲の端はなめらかに戻す。
    表情などの形（シェイプキー）にも同じ差を足す。
      object・material: 肌の材質名（の一部）・x0・z: [下, 上]・y: [前, 後ろ]・keep（0〜1）・blend: 端をなめらかにする幅 m
      uv_to: [u, v]（耳の面の UV をこの肌の無地の所へ寄せて、テクスチャに描かれた耳の輪郭を消す。無くてよい）"""
    o = bpy.data.objects.get(p.get('object', 'Face'))
    if o is None:
        raise RuntimeError('物体が見つかりません')
    me = o.data
    idx = {i for i, m in enumerate(me.materials) if m and p['material'] in m.name}
    vs = {v for pl in me.polygons if pl.material_index in idx for v in pl.vertices}
    x0, keep, bl = float(p['x0']), float(p['keep']), float(p.get('blend', 0.006))
    (z0, z1), (y0, y1) = p['z'], p['y']

    def ramp(a, lo, hi):
        f = min(1.0, max(0.0, min(a - lo, hi - a) / bl + 0.5))
        return f * f * (3 - 2 * f)

    def delta(w, v):
        if v.index not in vs or abs(w.x) <= x0:
            return None
        f = ramp(w.z, z0, z1) * ramp(w.y, y0, y1)
        if f <= 0:
            return None
        nx = math.copysign(x0 + (abs(w.x) - x0) * keep, w.x)
        return Vector(((nx - w.x) * f, 0, 0))
    full = set()
    mw = o.matrix_world
    for v in me.vertices:  # 耳の真ん中（範囲の端から離れた所）の頂点
        w = mw @ v.co
        if v.index in vs and abs(w.x) > x0 and ramp(w.z, z0, z1) * ramp(w.y, y0, y1) >= 0.99:
            full.add(v.index)
    n = _move_vertices(o, delta)
    uv_n = 0
    if p.get('uv_to') and me.uv_layers:  # 耳の絵（テクスチャに描かれた耳の輪郭）を消す: 耳の面の UV を肌の無地の所へ寄せる
        uv = me.uv_layers.active.data
        tu, tv = p['uv_to']
        for pl in me.polygons:
            if pl.material_index in idx and sum(1 for v in pl.vertices if v in full) >= len(pl.vertices) - 1:
                for li in pl.loop_indices:
                    uv[li].uv = (tu, tv)
                uv_n += 1
    return {'part': 'ear_flatten', 'moved_verts': n, 'uv_faces': uv_n}


def welt_pocket(p):
    """上着の腰の斜めのポケット口: 表面に沿う平たい縁取り（玉縁）を、2 点の間に斜めに付ける。左右対称に 2 つ作る。
    重みは follow_weights で上着の布から写す（この手順のあとに置く）。
      material: 上着の材質名（の一部）・from: [|x|, z]・to: [|x|, z]・width・thick・offset・color・shade_color"""
    mat = p.get('material', 'Tops_01')
    (x0, z0), (x1, z1) = p['from'], p['to']
    w, th = float(p.get('width', 0.012)), float(p.get('thick', 0.003))
    made = []
    for sd, c in ((1, 'L'), (-1, 'R')):
        bm = bmesh.new()
        groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
        pts, nrms = [], []
        for i in range(13):
            t = i / 12
            hit, nrm = surface_point(sd * (x0 + (x1 - x0) * t), z0 + (z1 - z0) * t, float(p.get('offset', 0.003)), mat)
            pts.append(hit)
            nrms.append(nrm)
        nrm = sum(nrms, Vector()).normalized()
        groups[0] += _band(bm, pts, w, th, nrm)
        # 口の奥の影（細い濃い線）
        groups[1] += _band(bm, [q + nrm * th * 0.6 for q in pts[1:-1]], w * 0.25, th * 0.5, nrm)
        name = '%s_%s' % (p.get('name', 'HQ3D_Welt'), c)
        made.append({'name': name, 'verts': _make_object(dict(p, material_from=p.get('material_from', mat)), name, 'J_Bip_C_Spine', groups)})
    return {'part': 'welt_pocket', 'made': made}


def tail_duplicate(p):
    """尻尾の骨の鎖をまるごと写して、2 本目の尻尾の骨を作る（猫又）。名前は suffix_from を suffix_to に替える。
    揺れもの（SpringBone）も、元の尻尾の揺れの設定（硬さ・重力・抵抗・当たりの半径・中心の骨）を写して足す。
    写した骨は休みの姿勢が元と同じなので、このあと tail_swing（first_bone に写した骨）で向きを変え、cat_tail_tube で筒を作る。
      first_bone・suffix_from（例 "_01"）・suffix_to（例 "_02"）・spring_name"""
    arm = armature()
    first = p.get('first_bone', 'J_Opt_C_CatTail1_01')
    sf, st = p.get('suffix_from', '_01'), p.get('suffix_to', '_02')
    names = [first] + [b.name for b in arm.data.bones[first].children_recursive]
    rename = {n: n.replace(sf, st) for n in names}
    if any(r in arm.data.bones for r in rename.values()):
        raise RuntimeError('写す先の骨がもうあります: %s' % sorted(r for r in rename.values() if r in arm.data.bones))

    def fn(eb):
        for n in names:  # 親から順に（children_recursive は親が先）
            src = eb[n]
            b = eb.new(rename[n])
            b.head, b.tail, b.roll = src.head.copy(), src.tail.copy(), src.roll
            b.use_connect = False
            b.use_deform = src.use_deform
            b.parent = eb[rename[src.parent.name]] if src.parent and src.parent.name in rename else src.parent
    _edit_bones(arm, fn)
    sb = arm.data.vrm_addon_extension.spring_bone1
    src_spring = next((s for s in sb.springs if any(j.node.bone_name == first for j in s.joints)), None)
    if src_spring is None:
        raise RuntimeError('元の尻尾の揺れものが見つかりません')
    ns = sb.springs.add()
    ns.vrm_name = p.get('spring_name', src_spring.vrm_name + '2')
    ns.center.bone_name = src_spring.center.bone_name
    for j in src_spring.joints:
        nj = ns.joints.add()
        nj.node.bone_name = rename.get(j.node.bone_name, j.node.bone_name)
        nj.hit_radius, nj.stiffness, nj.gravity_power, nj.drag_force = j.hit_radius, j.stiffness, j.gravity_power, j.drag_force
        nj.gravity_dir = tuple(j.gravity_dir)
    return {'part': 'tail_duplicate', 'bones': len(names), 'spring': ns.vrm_name, 'joints': len(ns.joints)}


def merge_plain_parts(p):
    """描画を軽くする: テクスチャを持たない単色の小物（名前が prefix で始まる物体）を 1 つの物体・1 つの材質にまとめる。
    色は小さな色見本の画像（基本色と陰の色の 2 枚）に並べ、面ごとに UV をその色のマスへ寄せる。
    見た目は変わらず、描画の呼び出し（材質 × 物体ごとに 1 回＋輪郭線）が減る。骨の重みは物体をまとめても名前で引き継がれる。
    いちばん最後（toon_style のあと）に置く。
      prefix・exclude: まとめない物体の名前（の一部）・name・cell: 色のマスの大きさ（画素）"""
    import numpy as np
    prefix = p.get('prefix', 'HQ3D_')
    excl = p.get('exclude', [])
    objs = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or not o.name.startswith(prefix) or any(x in o.name for x in excl):
            continue
        mats = [m for m in o.data.materials if m]
        if mats and all(m.vrm_addon_extension.mtoon1.enabled and m.vrm_addon_extension.mtoon1.pbr_metallic_roughness.base_color_texture.index.source is None
                        and m.vrm_addon_extension.mtoon1.alpha_mode == 'OPAQUE' for m in mats):
            objs.append(o)
    if len(objs) < 2:
        return {'part': 'merge_plain_parts', 'merged': 0}
    uniq = []
    for o in objs:
        for m in o.data.materials:
            if m not in uniq:
                uniq.append(m)
    cell = int(p.get('cell', 4))
    side = 1
    while side * side < len(uniq):
        side += 1
    res = side * cell
    base_px = np.ones((res, res, 4), dtype=np.float32)
    shade_px = np.ones((res, res, 4), dtype=np.float32)

    def to_srgb(c):
        return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    where = {}
    for i, m in enumerate(uniq):
        cx, cy = i % side, i // side
        ext = m.vrm_addon_extension.mtoon1
        b = [to_srgb(c) for c in ext.pbr_metallic_roughness.base_color_factor[:3]]
        sh = [to_srgb(c) for c in ext.extensions.vrmc_materials_mtoon.shade_color_factor]
        base_px[cy * cell:(cy + 1) * cell, cx * cell:(cx + 1) * cell, :3] = b
        shade_px[cy * cell:(cy + 1) * cell, cx * cell:(cx + 1) * cell, :3] = sh
        where[m.name] = ((cx + 0.5) / side, (cy + 0.5) / side)
    name = p.get('name', 'HQ3D_Parts')
    imgs = []
    for tag, px in (('', base_px), ('_shade', shade_px)):
        img = bpy.data.images.new(name + '_palette' + tag, res, res, alpha=True)
        img.colorspace_settings.name = 'sRGB'
        img.pixels.foreach_set(px.ravel())
        img.pack()
        img.use_fake_user = True
        imgs.append(img)
    pal = uniq[0].copy()
    pal.name = name
    ext = pal.vrm_addon_extension.mtoon1
    ext.pbr_metallic_roughness.base_color_factor = (1.0, 1.0, 1.0, 1.0)
    ext.pbr_metallic_roughness.base_color_texture.index.source = imgs[0]
    mt = ext.extensions.vrmc_materials_mtoon
    mt.shade_color_factor = (1.0, 1.0, 1.0)
    mt.shade_multiply_texture.index.source = imgs[1]
    faces = 0
    for o in objs:
        me = o.data
        uvl = me.uv_layers.active or me.uv_layers.new(name='UVMap')
        for pl in me.polygons:
            u, v = where[me.materials[pl.material_index].name]
            for li in pl.loop_indices:
                uvl.data[li].uv = (u, v)
            faces += 1
        me.materials.clear()
        me.materials.append(pal)
        for pl in me.polygons:
            pl.material_index = 0
    for ob in bpy.context.scene.objects:
        ob.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = name
    joined.data.name = name
    return {'part': 'merge_plain_parts', 'merged': len(objs), 'materials': len(uniq), 'faces': faces, 'palette': res}


def neck_shorten(p):
    """首を短くする: 頭の骨とその先の骨（目・眼鏡・髪の揺れもの）を休みの姿勢ごと dz（m・負で下へ）動かし、
    頂点はその骨たちへの重みの合計 × dz だけ動かす（頭の頂点は全部、首の肌は重みに応じて途中まで＝首が縮む）。
    首の骨の先も頭の付け根へ合わせる。揺れものの当たり判定（コライダー）は骨に付いているので一緒に動く"""
    dz = float(p['dz'])
    if not -0.06 <= dz <= 0:
        raise RuntimeError('dz は 0〜-0.06 m（短くするだけ・大きく変えない）')
    arm = armature()
    head = arm.data.bones.get(p.get('head_bone', 'J_Bip_C_Head'))
    if head is None:
        raise RuntimeError('頭の骨が見つかりません')
    names = {head.name} | {b.name for b in head.children_recursive}
    neck = head.parent.name
    delta = Vector((0, 0, dz))
    moved = {}
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or not any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers):
            continue
        idx = {g.index for g in o.vertex_groups if g.name in names}
        if not idx:
            continue
        n = _move_vertices(o, lambda w, v: delta * min(1.0, sum(g.weight for g in v.groups if g.group in idx)))
        if n:
            moved[o.name] = n

    def fn(eb):
        for nm in names:
            b = eb[nm]
            b.head = b.head + delta
            b.tail = b.tail + delta
        eb[neck].tail = eb[head.name].head.copy()
    _edit_bones(arm, fn)
    return {'part': 'neck_shorten', 'dz': dz, 'bones': len(names), 'moved_verts': moved}


def ear_scale(p):
    """猫耳を小さくする: 耳の材質（ear_regions で分けたもの）の頂点を、左右それぞれ耳の付け根を中心に scale 倍する。
    耳を揺らす骨（頭の骨以外で耳の頂点に重みのある骨とその先）も、同じ中心・同じ倍率で休みの姿勢を縮める。
    付け根＝その耳の頂点のうち下から base_frac（割合）の高さまでの頂点の平均"""
    s = float(p['scale'])
    if not 0.5 <= s <= 1.0:
        raise RuntimeError('scale は 0.5〜1.0（小さくするだけ）')
    base_frac = float(p.get('base_frac', 0.2))
    arm = armature()
    head = p.get('head_bone', 'J_Bip_C_Head')
    pivots, ear_bones, moved = {}, set(), {}
    targets = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and any(k in m.name for k in p['materials'])}
        if not idx:
            continue
        vs = {v for pl in o.data.polygons if pl.material_index in idx for v in pl.vertices}
        targets.append((o, vs))
        mw = o.matrix_world
        gname = {g.index: g.name for g in o.vertex_groups}
        for side in (1, -1):
            pts = [mw @ o.data.vertices[i].co for i in vs if (mw @ o.data.vertices[i].co).x * side > 0]
            if not pts:
                continue
            zl, zh = min(q.z for q in pts), max(q.z for q in pts)
            base = [q for q in pts if q.z <= zl + (zh - zl) * base_frac]
            pivots.setdefault(side, []).extend(base)
        for i in vs:
            for g in o.data.vertices[i].groups:
                if g.weight > 0.05 and gname[g.group] != head:
                    ear_bones.add(gname[g.group])
    if not targets or len(pivots) != 2:
        raise RuntimeError('左右の耳が見つかりません: %s' % p['materials'])
    piv = {sd: sum(pts, Vector()) / len(pts) for sd, pts in pivots.items()}
    for o, vs in targets:
        moved[o.name] = _move_vertices(o, lambda w, v: ((piv[1 if w.x > 0 else -1] + (w - piv[1 if w.x > 0 else -1]) * s) - w) if v.index in vs else None)
    names = set(ear_bones)
    for nm in list(ear_bones):
        names |= {b.name for b in arm.data.bones[nm].children_recursive}
    mw_arm = arm.matrix_world

    def fn(eb):
        inv = mw_arm.inverted()
        for nm in names:
            b = eb[nm]
            for attr in ('head', 'tail'):
                w = mw_arm @ getattr(b, attr)
                c = piv[1 if w.x > 0 else -1]
                setattr(b, attr, inv @ (c + (w - c) * s))
    _edit_bones(arm, fn)
    return {'part': 'ear_scale', 'scale': s, 'bones': sorted(names), 'moved_verts': moved,
            'pivots': {str(k): [round(x, 4) for x in v] for k, v in piv.items()}}


def _islands(bm, idx):
    """材質 idx の面を、辺でつながった塊（VRoid の髪の毛束 1 枚）ごとに分ける。戻り値: [頂点番号の集合, …]"""
    seen, out = set(), []
    for f in bm.faces:
        if f.index in seen or f.material_index not in idx:
            continue
        stack, vs = [f], set()
        seen.add(f.index)
        while stack:
            g = stack.pop()
            vs.update(v.index for v in g.verts)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen and h.material_index in idx:
                        seen.add(h.index)
                        stack.append(h)
        out.append(vs)
    return out


def hair_tousle(p):
    """髪を原画のように無造作にする: 毛束ごとに、毛先ほど大きく 外へはねる・横へ流れる・長さが不ぞろい になるよう頂点を動かす。
    VRoid の毛束は 表と裏（輪郭線用）の 2 枚が重なっているので、毛先の位置が近い塊を 1 本の毛束にまとめて同じだけ動かす。
    頂点の数・つながり・骨の重みは変えない（揺れものはそのまま動く）。
      material: 髪の材質名（の一部）・seed
      out: [最小, 最大]（毛先の外へのはね。毛束の長さに対する割合）・side: 横への流れの振れ幅（割合）
      length: 長さの不ぞろいの振れ幅（割合）・curve: 毛先へ向かう効き方の指数（大きいほど毛先だけ）
      flip: 毛先の上へのはね（割合）・back_out: 後ろ向きの毛束のはねと横への流れの倍率（首が見えないように。後ろ向きの毛束は短くしない）・min_len: これより短い毛束（m）は動かさない
      bangs: 前髪（顔の前に垂れる毛束）の扱い {"x": 範囲の半幅 m, "lengthen": 伸ばす長さ m, "center": 真ん中の 1 本へ足す長さ m,
              "forward": 伸ばした分に対して前へ出す割合, "out": はねの倍率（前髪は控えめ）}
      skip_top: 毛先がこの高さ（m）より上の毛束は動かさない
      volume: 毛先を外へふくらませる量 m（前髪は除く）・wave: {"amp": 横の波の振れ幅 m, "period": 波の長さ m}（ゆるいくせ毛。前髪は半分）
      sideburns: {"x": [|x| の下, 上], "y_max": これより前, "z_max", "lengthen": 伸ばす m, "inward", "forward", "out": はねの倍率}
        （もみあげ: 顔の横で毛先がこの範囲にある毛束を下へ伸ばす。毛先へ行くほど伸びる）
      crown: {"z0": これより上の髪を, "lift": 頭の真ん中から外へ押す m（上ほど多く）}（頭頂のふくらみ）
      ahoge: {"front_y": これより前（y が小さい）へ張り出す毛束をアホ毛とみなす m, "scale": 根元（いちばん高い点）を中心に縮める倍率}"""
    import random
    o = bpy.data.objects.get(p.get('object', 'Hair'))
    if o is None or o.type != 'MESH':
        raise RuntimeError('髪の物体が見つかりません')
    me = o.data
    idx = {i for i, m in enumerate(me.materials) if m and p.get('material', 'Hair_00_HAIR') in m.name}
    if not idx:
        raise RuntimeError('髪の材質が見つかりません: ' + p.get('material', 'Hair_00_HAIR'))
    arm = armature()
    head = arm.matrix_world @ arm.data.bones[p.get('head_bone', 'J_Bip_C_Head')].head_local
    C = head + Vector(p.get('center_offset', [0.0, 0.0, 0.10]))  # 頭の真ん中（首の付け根の少し上）
    mw, mi = o.matrix_world, o.matrix_world.inverted()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    W = [mw @ v.co for v in me.vertices]
    isl = _islands(bm, idx)
    bm.free()
    # 毛先（いちばん低い点）が近い塊を 1 本にまとめる（表と裏の 2 枚）
    tips = [min(vs, key=lambda i: W[i].z) for vs in isl]
    parent = list(range(len(isl)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    order = sorted(range(len(isl)), key=lambda k: (round(W[tips[k]].z, 3), round(W[tips[k]].x, 3)))
    for ii, a in enumerate(order):
        for b in order[ii + 1:ii + 12]:
            if (W[tips[a]] - W[tips[b]]).length < float(p.get('pair_dist', 0.006)):
                parent[find(b)] = find(a)
    groups = {}
    for k in range(len(isl)):
        groups.setdefault(find(k), set()).update(isl[k])
    rng = random.Random(int(p.get('seed', 7)))
    min_len, skip_top = float(p.get('min_len', 0.03)), float(p.get('skip_top', 9.0))
    out_lo, out_hi = p.get('out', [0.08, 0.25])
    side_a, len_a = float(p.get('side', 0.12)), float(p.get('length', 0.12))
    curve, flip = float(p.get('curve', 2.2)), float(p.get('flip', 0.05))
    bg = p.get('bangs') or {}
    volume = float(p.get('volume', 0.0))
    wave_a, wave_p = float((p.get('wave') or {}).get('amp', 0.0)), float((p.get('wave') or {}).get('period', 0.05))
    moved, strands, bang_n, sideburn_n = 0, 0, 0, 0
    # 前髪の真ん中の 1 本（毛先が x=0 にいちばん近い前の毛束）
    def low(vs):
        return W[min(vs, key=lambda i: W[i].z)]
    front = [g for g, vs in groups.items() if bg and abs(low(vs).x) < float(bg.get('x', 0.06)) and low(vs).y < C.y - 0.04
             and max(W[i].z for i in vs) - low(vs).z >= min_len and low(vs).z <= skip_top]
    center_g = min(front, key=lambda g: abs(low(groups[g]).x)) if front else None
    ah = p.get('ahoge')
    ahoge_n = 0
    if ah:  # 顔の前へ大きく張り出す毛束（アホ毛の輪）: 根元（いちばん高い点）を中心に縮める
        for g in [g for g, vs in groups.items() if min(W[i].y for i in vs) < float(ah['front_y'])]:
            root = max(groups[g], key=lambda i: W[i].z)
            for i in groups[g]:
                me.vertices[i].co = mi @ (W[root] + (W[i] - W[root]) * float(ah['scale']))
            del groups[g]
            ahoge_n += 1
    for g in sorted(groups, key=lambda g: min(groups[g])):  # 番号順に回す（同じ seed なら同じ形）
        vs = groups[g]
        r_out, r_side, r_len = rng.uniform(out_lo, out_hi), rng.uniform(-side_a, side_a), rng.uniform(-len_a, len_a)
        tip = W[min(vs, key=lambda i: W[i].z)]
        root_z = max(W[i].z for i in vs)
        L = root_z - tip.z
        if L < min_len or tip.z > skip_top:
            continue
        d = Vector((tip.x - C.x, tip.y - C.y, 0))
        if d.length < 1e-6:
            continue
        d.normalize()
        tang = Vector((-d.y, d.x, 0))
        is_bang = g in front
        extra = Vector()
        out_k = r_out
        sb = p.get('sideburns')
        if sb and not is_bang and sb['x'][0] <= abs(tip.x) <= sb['x'][1] and tip.y <= float(sb['y_max']) and tip.z <= float(sb.get('z_max', 9.0)):
            add = float(sb['lengthen']) * (0.8 + 0.4 * rng.random())
            extra = Vector((-math.copysign(float(sb.get('inward', 0.2)) * add, tip.x), -float(sb.get('forward', 0.1)) * add, -add))
            out_k *= float(sb.get('out', 0.2))
            sideburn_n += 1
        if d.y > 0.5:  # 後ろ向きの毛束: はねる・短くなる・横へ分かれると首が見えるので、はねと横は控えめに、長さは伸ばすだけ
            out_k *= float(p.get('back_out', 1.0))
            r_side *= float(p.get('back_out', 1.0))
            r_len = abs(r_len)
        if is_bang:
            bang_n += 1
            out_k *= float(bg.get('out', 0.3))
            add = float(bg.get('lengthen', 0.0)) * (0.6 + 0.8 * rng.random()) + (float(bg.get('center', 0.0)) if g == center_g else 0.0)
            extra = Vector((0, -float(bg.get('forward', 0.3)) * add, -add))
            r_len = max(r_len, 0.0) * 0.3
        ph = rng.uniform(0, 2 * math.pi)
        for i in vs:
            t = min(1.0, max(0.0, (root_z - W[i].z) / L))
            w = t ** curve
            dv = (d * out_k + tang * r_side) * L * w + Vector((0, 0, -r_len * L * t + flip * L * t ** 4)) + extra * t ** 1.5
            if volume and not is_bang:  # ふくらみ: 根元から離れるほど外へ
                dv += d * volume * t
            if wave_a:  # ゆるい波: 毛束の向きと直角（横）に揺らす。根元は 0
                dv += tang * wave_a * (0.5 if is_bang else 1.0) * t * math.sin(2 * math.pi * (root_z - W[i].z) / wave_p + ph)
            if dv.length < 1e-7:
                continue
            me.vertices[i].co = mi @ (W[i] + dv)
            moved += 1
        strands += 1
    cl = p.get('crown')
    crown_n = 0
    if cl:  # 頭頂のふくらみ: 高さ z0 より上の髪の頂点を、頭の真ん中から外へ押す（上ほど多く）
        z0, lift = float(cl['z0']), float(cl['lift'])
        ztop = max(W[i].z for vs in isl for i in vs)
        for vs in isl:
            for i in vs:
                cur = mw @ me.vertices[i].co
                if cur.z <= z0:
                    continue
                t = min(1.0, (cur.z - z0) / max(ztop - z0, 1e-6))
                d = cur - C
                if d.length < 1e-6:
                    continue
                me.vertices[i].co = mi @ (cur + d.normalized() * lift * t * t * (3 - 2 * t))
                crown_n += 1
    me.update()
    return {'part': 'hair_tousle', 'crown_verts': crown_n, 'sideburns': sideburn_n, 'islands': len(isl), 'strands': strands, 'bangs': bang_n, 'ahoge': ahoge_n, 'moved_verts': moved}


def hair_tufts(p):
    """頭のてっぺんから はねる毛束を足す（原画の頭頂の無造作な毛）。平たい筒を、根元から毛先へ細くしながら曲げて作り、
    髪と同じ材質（テクスチャ）を貼る。UV は毛束の根元を画像の上、毛先を画像の下にする（VRoid の髪の画像と同じ向き）。頭の骨に重み 1 で付ける。
      material: 貼る髪の材質名（の一部）・hit_material: 根元を置く髪の材質名（の一部。光線をここにだけ当てる）・seed
      tufts: [{"az": 向き（度。0＝前・90＝モデルの左（+x）・180＝後ろ）, "el": 高さ（度。90＝真上）, "len": 長さ m, "width": 根元の幅 m,
               "lean": [x, y, z]（伸びる向きに混ぜる向き）, "curl": 毛先までに外へ曲がる角度（度）, "sink": 根元を髪へ沈める m}]"""
    import random
    rng = random.Random(int(p.get('seed', 5)))
    arm = armature()
    head_bone = p.get('head_bone', 'J_Bip_C_Head')
    C = arm.matrix_world @ arm.data.bones[head_bone].head_local + Vector(p.get('center_offset', [0.0, 0.0, 0.10]))
    mats = find_materials(p.get('material', 'Hair_00_HAIR'))
    hit_mat = p.get('hit_material', p.get('material', 'Hair_00_HAIR'))
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new('UVMap')
    made = 0
    seg, ring = int(p.get('segments', 10)), int(p.get('ring', 8))
    for t in p['tufts']:
        az, el = math.radians(t['az']), math.radians(t['el'])
        d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        base, nrm = ray_hit(C + d * 0.4, -d, material=hit_mat)
        if nrm.dot(d) < 0:  # 髪の裏側の面に当たったときは外向きにそろえる
            nrm = -nrm
        L, w = float(t['len']), float(t['width'])
        lean = Vector(t.get('lean', [0, 0, 0]))
        direc = (nrm + lean).normalized()
        out_ax = Vector((d.x, d.y, 0))
        out_ax = out_ax.normalized() if out_ax.length > 1e-6 else Vector((0, 1, 0))
        bend_axis = direc.cross(out_ax)
        bend_axis = bend_axis.normalized() if bend_axis.length > 1e-6 else Vector((1, 0, 0))
        curl = math.radians(float(t.get('curl', 40))) * rng.uniform(0.8, 1.2)
        pts, dirs = [], []
        pos = base - direc * float(t.get('sink', 0.006))
        from mathutils import Matrix
        for i in range(seg + 1):
            pts.append(pos.copy())
            dirs.append(direc.copy())
            pos = pos + direc * (L / seg)
            direc = (Matrix.Rotation(-curl / seg, 3, bend_axis) @ direc).normalized()
        u0 = rng.uniform(0.0, 0.85)
        rows = []
        for i, (pt, tg) in enumerate(zip(pts, dirs)):
            f = i / seg
            taper = (1 - f) ** 0.8
            side = tg.cross(nrm)
            side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
            flat = side.cross(tg).normalized()
            if i == seg:
                rows.append([bm.verts.new(pt)])
                continue
            rows.append([bm.verts.new(pt + side * math.cos(2 * math.pi * k / ring) * w * 0.5 * taper
                                      + flat * math.sin(2 * math.pi * k / ring) * w * 0.18 * taper) for k in range(ring)])
        for i in range(seg):
            a, b = rows[i], rows[i + 1]
            for k in range(ring):
                k2 = (k + 1) % ring
                vs = [a[k], a[k2], b[k2 % len(b)], b[k % len(b)]] if len(b) > 1 else [a[k], a[k2], b[0]]
                face = bm.faces.new(vs if len(set(vs)) == len(vs) else vs[:3])
                for loop in face.loops:
                    vi = loop.vert
                    row = next(r for r, rw in enumerate(rows) if vi in rw)
                    col = rows[row].index(vi) if len(rows[row]) > 1 else k
                    loop[uv_layer].uv = (u0 + 0.12 * col / ring, 0.92 - 0.85 * row / seg)
        made += 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(p.get('name', 'HQ3D_HairTufts'))
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(mats[0])
    inv = arm.matrix_world.inverted()
    for vtx in me.vertices:
        vtx.co = inv @ vtx.co
    ob = bpy.data.objects.new(me.name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    ob.matrix_world = arm.matrix_world.copy()
    g = ob.vertex_groups.new(name=head_bone)
    g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    return {'part': 'hair_tufts', 'tufts': made, 'verts': len(me.vertices)}


def surface_argyle(p):
    """テクスチャの無いパーツ（フードの縁など）に、菱形の格子（アーガイル）のテクスチャを作って貼る。
    柄は立体の位置で決める: 首の芯（center の x・y を通る縦の線）のまわりの角度 × radius と、高さ z。UV が無ければ自動で作る。
      object・materials: 柄を描く材質の名前・center: [x, y]・radius: 角度を長さに直す半径 m・cell: 菱形の大きさ m
      colors: [色1, 色2]・line・line_w・resolution"""
    import numpy as np
    o = bpy.data.objects.get(p['object'])
    if o is None or o.type != 'MESH':
        raise RuntimeError('物体が見つかりません: ' + p['object'])
    me = o.data
    mats = [m for m in me.materials if m and m.name in p['materials']]
    if not mats:
        raise RuntimeError('材質が見つかりません: %s' % p['materials'])
    made_uv = _ensure_uv(o)
    res = int(p.get('resolution', 1024))
    cx, cy = p.get('center', [0.0, 0.0])
    R, cell = float(p.get('radius', 0.08)), float(p.get('cell', 0.01))
    ca, cb = np.array(_hex8(p['colors'][0]), dtype=np.float32), np.array(_hex8(p['colors'][1]), dtype=np.float32)
    cl = np.array(_hex8(p['line']), dtype=np.float32) if p.get('line') else None
    lw = float(p.get('line_w', 0.08))
    px = np.zeros((res, res, 4), dtype=np.float32)
    px[..., :3] = ca
    px[..., 3] = 1.0
    mw = o.matrix_world
    me.calc_loop_triangles()
    idx = {i for i, m in enumerate(me.materials) if m in mats}
    uvd = me.uv_layers.active.data
    for t in me.loop_triangles:
        if t.material_index not in idx:
            continue
        Pw = np.array([list(mw @ me.vertices[vi].co) for vi in t.vertices])
        U = np.array([[uvd[l].uv.x * res, uvd[l].uv.y * res] for l in t.loops])
        x0, y0 = np.floor(U.min(axis=0)).astype(int) - 1
        x1, y1 = np.ceil(U.max(axis=0)).astype(int) + 1
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, res - 1), min(y1, res - 1)
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (qx, qy) = U
        den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy)
        if abs(den) < 1e-12:
            continue
        w0 = ((by - qy) * (gx - qx) + (qx - bx) * (gy - qy)) / den
        w1 = ((qy - ay) * (gx - qx) + (ax - qx) * (gy - qy)) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -0.05) & (w1 >= -0.05) & (w2 >= -0.05)
        if not inside.any():
            continue
        X = w0[..., None] * Pw[0] + w1[..., None] * Pw[1] + w2[..., None] * Pw[2]
        ang = np.arctan2(X[..., 0] - cx, -(X[..., 1] - cy))  # 0＝前
        a = ang * R / cell + X[..., 2] / cell
        b = ang * R / cell - X[..., 2] / cell
        col = np.where((((np.floor(a) + np.floor(b)) % 2) == 0)[..., None], ca, cb)
        if cl is not None:
            fa, fb = (a + 0.5) % 1.0, (b + 0.5) % 1.0
            on = (np.minimum(fa, 1 - fa) < lw) | (np.minimum(fb, 1 - fb) < lw)
            col = np.where(on[..., None], cl, col)
        sub = px[y0:y1 + 1, x0:x1 + 1, :3]
        sub[inside] = col[inside]
    img = bpy.data.images.new(p.get('image_name', o.name + '_hq3d_argyle'), res, res, alpha=True)
    img.colorspace_settings.name = 'sRGB'
    img.pixels.foreach_set(px.ravel())
    img.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        pbr = ext.pbr_metallic_roughness
        mt = ext.extensions.vrmc_materials_mtoon
        f = list(pbr.base_color_factor[:3])
        sh = list(mt.shade_color_factor)
        mt.shade_color_factor = tuple(min(1.0, s_ / max(b_, 1e-4)) for s_, b_ in zip(sh, f))
        pbr.base_color_factor = (1.0, 1.0, 1.0, pbr.base_color_factor[3])
        pbr.base_color_texture.index.source = img
        mt.shade_multiply_texture.index.source = img
    return {'part': 'surface_argyle', 'object': o.name, 'made_uv': made_uv}


def texture_paint(p):
    """材質のテクスチャに、画像の上の位置で直接描く（顔のように UV が正面からの投影になっているもの向け）。
    位置と大きさは画像の割合（左上が 0,0・右下が 1,1）。基本色は先にテクスチャへ焼き込む（_bake_factor）。
      material: 材質名（の一部）
      items: [{"type": "blush", "center": [u, v], "radius": [ru, rv], "color", "alpha"}   … ぼかした楕円（頬の赤み）
              {"type": "hatch", "center": [u, v], "count", "length", "spacing", "angle": 度, "width", "color", "alpha"}  … 頬の斜線
              {"type": "scale_disc", "center": [u, v], "radius": r, "scale"}  … 円の中身を中心から scale 倍に広げる（瞳を大きく。透明度ごと）
              {"type": "lift", "center": [u, v], "radius": r, "lift"}  … 円の中の暗い所を持ち上げる（色 = lift + (1 - lift) × 元）
              {"type": "gradient", "v": [始, 終], "alpha": [始, 終], "color"}  … 上下で色を混ぜる（髪の毛先を明るく）
              {"type": "streaks", "count", "length": [短, 長], "width", "v": [上, 下], "slant", "color", "alpha", "seed"}  … 縦の細い筋（毛の流れ）
              {"type": "argyle", "box": [u0, v0, u1, v1], "cell": [幅, 高さ], "colors": [色1, 色2], "line", "line_w", "match", "tol"}]
                … 菱形の格子。match があれば元の色がそれに近い画素だけ（袖口・裾の帯の上だけに描く）
              {"type": "recolor", "color", "match"＋"tol" か "max_value"＋"max_sat", "box", "keep_shade"}  … 色の置きかえ（靴底の灰色を白へ など）
              {"type": "fade", "min_sat", "toward", "amount", "box", "exclude": [箱, …], "keep": [色, …], "keep_tol", "green_only"}  … 鮮やかな柄を薄くする（クローバーを控えめに）
    radius・length・spacing・width・r は画像の幅に対する割合"""
    import numpy as np
    mats = find_materials(p['material'])
    texs = {m.vrm_addon_extension.mtoon1.pbr_metallic_roughness.base_color_texture.index.source for m in mats}
    if len(texs) != 1:  # 違う画像の材質に同じ絵を描くと、1 つ目の画像で全部を塗りつぶしてしまう
        raise RuntimeError('material に当たる材質のテクスチャが 1 つにそろっていません（名前をしぼる）: %s' % [m.name for m in mats])
    px, img = _bake_factor(mats[0], np)
    H, W = px.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    U = (xx + 0.5) / W
    V = 1.0 - (yy + 0.5) / H  # Blender の画素は下から上なので、画像の上を 0 にそろえる
    asp = H / W
    done = []
    for it in p['items']:
        kind = it['type']
        cu, cv = it.get('center', [0.5, 0.5])
        if kind == 'blush':
            ru, rv = it['radius']
            d2 = ((U - cu) / ru) ** 2 + ((V - cv) / rv) ** 2
            a = float(it.get('alpha', 0.35)) * np.exp(-2.2 * d2) * (d2 < 2.5)
            c = np.array(_hex8(it['color']), dtype=np.float32)
            px[..., :3] = px[..., :3] * (1 - a[..., None]) + c * a[..., None]
        elif kind == 'hatch':
            c = np.array(_hex8(it['color']), dtype=np.float32)
            n, L, sp, wd = int(it.get('count', 3)), float(it['length']), float(it['spacing']), float(it.get('width', 0.002))
            ang = math.radians(float(it.get('angle', 60)))
            du, dv = math.cos(ang), math.sin(ang)
            for k in range(n):
                ou = cu + (k - (n - 1) / 2) * sp
                x, y = (U - ou), (V - cv) * asp
                along = x * du + y * dv
                across = -x * dv + y * du
                tp = np.clip(1 - np.abs(along) / (L / 2), 0, 1)  # 両端を細く
                a = float(it.get('alpha', 0.5)) * np.clip(1 - np.abs(across) / (wd * (0.3 + 0.7 * tp)), 0, 1) * (tp > 0)
                px[..., :3] = px[..., :3] * (1 - a[..., None]) + c * a[..., None]
        elif kind == 'scale_disc':
            r, s = float(it['radius']), float(it['scale'])
            src = px.copy()
            dx, dy = (U - cu), (V - cv) * asp
            inside = dx * dx + dy * dy < (r * s) ** 2
            su = cu + dx / s
            sv = cv + dy / asp / s
            sx = np.clip((su * W - 0.5).round().astype(int), 0, W - 1)
            sy = np.clip(((1 - sv) * H - 0.5).round().astype(int), 0, H - 1)
            px[inside] = src[sy[inside], sx[inside]]
        elif kind == 'gradient':  # 画像の上下で色を混ぜる（髪の毛先を明るく。v は画像の上 0・下 1）
            g0, g1 = it['v']
            a0, a1 = it.get('alpha', [0.0, 0.5])
            t = np.clip((V - g0) / (g1 - g0), 0, 1)
            a = a0 + (a1 - a0) * t * t * (3 - 2 * t)
            c = np.array(_hex8(it['color']), dtype=np.float32)
            px[..., :3] = px[..., :3] * (1 - a[..., None]) + c * a[..., None]
        elif kind == 'streaks':  # 縦の細い筋（髪の毛の流れ）。seed で決まる
            import random
            rng = random.Random(int(it.get('seed', 1)))
            c = np.array(_hex8(it['color']), dtype=np.float32)
            v0, v1 = it.get('v', [0.0, 1.0])
            for _ in range(int(it['count'])):
                x0 = rng.random()
                ln = rng.uniform(*it['length'])
                y0 = rng.uniform(v0, max(v0, v1 - ln))
                wd = float(it['width']) * rng.uniform(0.6, 1.4)
                t = np.clip((V - y0) / ln, 0, 1)
                taper = np.sin(np.pi * t) * ((V >= y0) & (V <= y0 + ln))
                dx = np.abs(U - (x0 + float(it.get('slant', 0.0)) * (V - y0)))
                a = float(it['alpha']) * rng.uniform(0.6, 1.0) * taper * np.clip(1 - dx / (wd * (0.4 + 0.6 * taper) + 1e-6), 0, 1)
                px[..., :3] = px[..., :3] * (1 - a[..., None]) + c * a[..., None]
        elif kind == 'argyle':  # 菱形の格子（アーガイル）。box の中で、元の色が match に近い画素だけに描く（帯の上だけ）
            u0, v0, u1, v1 = it['box']
            cw, ch = it['cell']
            inb = (U >= u0) & (U <= u1) & (V >= v0) & (V <= v1)
            if 'match' in it:
                mc = np.array(_hex8(it['match']), dtype=np.float32)
                inb &= np.sqrt(((px[..., :3] - mc) ** 2).sum(-1)) < float(it.get('tol', 0.12))
            a = (U - u0) / cw + (V - v0) / ch
            b = (U - u0) / cw - (V - v0) / ch
            par = (np.floor(a) + np.floor(b)) % 2 == 0
            ca, cb = np.array(_hex8(it['colors'][0]), dtype=np.float32), np.array(_hex8(it['colors'][1]), dtype=np.float32)
            col = np.where(par[..., None], ca, cb)
            if it.get('line'):  # 菱形をまたぐ細い斜めの線（アーガイルの線）
                lw = float(it.get('line_w', 0.08))
                fa, fb = (a + 0.5) % 1.0, (b + 0.5) % 1.0
                on = (np.minimum(fa, 1 - fa) < lw) | (np.minimum(fb, 1 - fb) < lw)
                col = np.where(on[..., None], np.array(_hex8(it['line']), dtype=np.float32), col)
            px[inb, :3] = col[inb]
        elif kind == 'recolor':  # 色の置きかえ: match に近い画素か、暗い灰色（max_value・max_sat 以下）を color へ。元の明るさの差は少し残す
            inb = np.ones(U.shape, bool)
            if 'box' in it:
                u0, v0, u1, v1 = it['box']
                inb &= (U >= u0) & (U <= u1) & (V >= v0) & (V <= v1)
            rgb = px[..., :3]
            mx, mn = rgb.max(-1), rgb.min(-1)
            if 'match' in it:
                mc = np.array(_hex8(it['match']), dtype=np.float32)
                inb &= np.sqrt(((rgb - mc) ** 2).sum(-1)) < float(it.get('tol', 0.15))
                ref = float(mc.max())
            else:
                inb &= (mx <= float(it['max_value'])) & ((mx - mn) <= float(it.get('max_sat', 0.08)))
                ref = float(it['max_value'])
            c = np.array(_hex8(it['color']), dtype=np.float32)
            keep = float(it.get('keep_shade', 0.25))
            k = (1 - keep) + keep * np.clip(mx / max(ref, 1e-4), 0, 1)
            px[inb, :3] = np.clip(c * k[inb][:, None], 0, 1)
        elif kind == 'fade':  # 鮮やかな色（彩度 min_sat 以上）を toward へ amount だけ寄せる。exclude の箱の中は残す
            rgb = px[..., :3]
            mx, mn = rgb.max(-1), rgb.min(-1)
            sat = (mx - mn) / np.maximum(mx, 1e-4)
            inb = sat >= float(it['min_sat'])
            if it.get('green_only', True):
                inb &= (rgb[..., 1] >= rgb[..., 0]) & (rgb[..., 1] >= rgb[..., 2])
            if 'box' in it:
                u0, v0, u1, v1 = it['box']
                inb &= (U >= u0) & (U <= u1) & (V >= v0) & (V <= v1)
            for u0, v0, u1, v1 in it.get('exclude', []):
                inb &= ~((U >= u0) & (U <= u1) & (V >= v0) & (V <= v1))
            for kc in it.get('keep', []):  # この色に近い画素は残す（襟の輪・帯・ファスナーのテープ）
                inb &= np.sqrt(((rgb - np.array(_hex8(kc), dtype=np.float32)) ** 2).sum(-1)) >= float(it.get('keep_tol', 0.08))
            c = np.array(_hex8(it['toward']), dtype=np.float32)
            a = float(it['amount'])
            px[inb, :3] = px[inb, :3] * (1 - a) + c * a
        elif kind == 'lift':
            r, lf = float(it['radius']), float(it['lift'])
            dx, dy = (U - cu), (V - cv) * asp
            inside = dx * dx + dy * dy < r * r
            px[inside, :3] = lf + (1 - lf) * px[inside, :3]
        else:
            raise RuntimeError('知らない描き方です: ' + kind)
        done.append(kind)
    out = bpy.data.images.new(img.name + '_hq3d_paint', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        ext.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = ext.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:
            mt.shade_multiply_texture.index.source = out
    return {'part': 'texture_paint', 'material': p['material'], 'items': done}


def shape_key_bake(p):
    """表情の形（シェイプキー）を、ふだんの顔（Basis）へ割合 amount だけ混ぜ込む（例: 目を少し大きく開いた顔をふだんの顔にする）。
    ほかの表情は「ふだんの顔からの差」を保つよう同じだけ動かす。ただし keep（目を閉じる形など）は位置をそのまま残し、
    ふだんの顔が変わっても、まばたきで目がきちんと閉じるようにする。
      object: 物体の名前・key: 混ぜ込むシェイプキーの名前・amount: 0〜0.6・keep: 位置をそのまま残すシェイプキーの名前の一覧"""
    o = bpy.data.objects.get(p.get('object', 'Face'))
    if o is None or not o.data.shape_keys:
        raise RuntimeError('シェイプキーのある物体が見つかりません')
    kbs = o.data.shape_keys.key_blocks
    src = kbs.get(p['key'])
    if src is None:
        raise RuntimeError('シェイプキーが見つかりません: ' + p['key'])
    a = float(p['amount'])
    if not 0 < a <= 0.6:
        raise RuntimeError('amount は 0〜0.6')
    keep = set(p.get('keep', []))
    missing = sorted(k for k in keep if k not in kbs)
    if missing:
        raise RuntimeError('keep のシェイプキーが見つかりません: %s' % missing)
    basis = o.data.shape_keys.reference_key
    delta = [(src.data[i].co - basis.data[i].co) * a for i in range(len(o.data.vertices))]
    moved = [i for i, d in enumerate(delta) if d.length > 1e-7]
    for kb in kbs:
        if kb == basis or kb.name in keep:
            continue
        for i in moved:
            kb.data[i].co += delta[i]
    for i in moved:
        basis.data[i].co += delta[i]
        o.data.vertices[i].co += delta[i]
    o.data.update()
    return {'part': 'shape_key_bake', 'key': p['key'], 'amount': a, 'moved_verts': len(moved), 'kept': sorted(keep)}


def _fold_strokes(groups, rng):
    """しわの線（折れ線）を作る。座標は (u, v) の平面（m）。戻り値: [(点の配列 N×2, 半幅, 濃さ), …]
      rings:  {"u": [始, 終], "count", "v": [始, 終], "span": [短, 長]（v の幅に対する割合）, "bow": 弧のふくらみ m, "tilt", "wave", "period", "width", "dark"}
              … 筒を回る弧（たるみ・裾のしぼり）。1 本は筒の一部だけを回る
      radial: {"from": [u, v], "count", "angle": [始, 終]（度。0＝+u の向き）, "length": [短, 長], "bend", "width", "dark"} … 1 点から広がる線（脇・股・ひじ）
      lines:  {"pts": [[u, v], …], "width", "dark"}  … 決めた線"""
    import numpy as np
    out = []
    for gdef in groups:
        kind = gdef['type']
        wd, dk = float(gdef.get('width', 0.004)), float(gdef.get('dark', 0.35))
        if kind == 'rings':
            u0, u1 = gdef['u']
            n = int(gdef['count'])
            v0, v1 = gdef['v']
            span_lo, span_hi = gdef.get('span', [0.45, 0.8])
            for k in range(n):
                uc = u0 + (u1 - u0) * (k + 0.5) / n + rng.uniform(-0.2, 0.2) * (u1 - u0) / n
                ln = (v1 - v0) * rng.uniform(span_lo, span_hi)  # 1 本は筒の一部だけ（とぎれとぎれの弧）
                a = rng.uniform(v0, v1 - ln)
                b = a + ln
                vs = np.linspace(a, b, int(gdef.get('seg', 24)))
                ph = rng.uniform(0, 2 * math.pi)
                x = (vs - (a + b) / 2) / (ln / 2)
                bow = float(gdef.get('bow', 0.01)) * rng.uniform(0.6, 1.3) * (1 if rng.random() < 0.7 else -1)
                tilt = float(gdef.get('tilt', 0.0)) * rng.uniform(-1, 1)
                us = uc + bow * (1 - x * x) + tilt * (vs - (a + b) / 2)                     + float(gdef.get('wave', 0.0)) * np.sin(vs / max(float(gdef.get('period', 0.1)), 1e-3) * 2 * math.pi + ph)
                out.append((np.stack([us, vs], 1), wd * rng.uniform(0.8, 1.2), dk * rng.uniform(0.75, 1.1)))
        elif kind == 'radial':
            fu, fv = gdef['from']
            n = int(gdef['count'])
            a0, a1 = gdef['angle']
            for k in range(n):
                ang = math.radians(a0 + (a1 - a0) * (k + 0.5) / n + rng.uniform(-0.3, 0.3) * (a1 - a0) / max(n, 1))
                ln = rng.uniform(*gdef['length'])
                bend = float(gdef.get('bend', 0.15)) * rng.uniform(-1, 1)
                t = np.linspace(0, 1, 12)
                d = np.array([math.cos(ang), math.sin(ang)])
                nrm = np.array([-d[1], d[0]])
                st = rng.uniform(0, 0.15) * ln
                pts = np.array([fu, fv]) + np.outer(st + t * (ln - st), d) + np.outer(np.sin(math.pi * t) * bend * ln, nrm)
                out.append((pts, wd * rng.uniform(0.8, 1.2), dk * rng.uniform(0.75, 1.1)))
        elif kind == 'lines':
            out.append((np.array(gdef['pts'], dtype=float), wd, dk))
        else:
            raise RuntimeError('知らないしわの形です: ' + kind)
    return out


def _stroke_shade(Q, strokes, hl):
    """Q（…×2 の (u, v)）に、しわの線の暗さ（0〜1）と、線の片側の明るい縁（0〜1）を返す。線の両端は細く消える"""
    import numpy as np
    dark = np.zeros(Q.shape[:-1], dtype=np.float32)
    light = np.zeros(Q.shape[:-1], dtype=np.float32)
    for pts, w, dk in strokes:
        lo, hi = pts.min(axis=0) - w * 4, pts.max(axis=0) + w * 4
        near = (Q[..., 0] > lo[0]) & (Q[..., 0] < hi[0]) & (Q[..., 1] > lo[1]) & (Q[..., 1] < hi[1])
        if not near.any():
            continue
        q = Q[near]
        best = np.full(len(q), 1e9)
        sgn = np.zeros(len(q))
        par = np.zeros(len(q))
        seg_len = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        cum = np.concatenate([[0], np.cumsum(seg_len)])
        total = max(cum[-1], 1e-6)
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            ab = b - a
            L2 = max(ab @ ab, 1e-12)
            t = np.clip(((q - a) @ ab) / L2, 0, 1)
            proj = a + t[:, None] * ab
            dv = q - proj
            dd = np.sqrt((dv ** 2).sum(1))
            m = dd < best
            best[m] = dd[m]
            sgn[m] = np.sign(ab[0] * dv[m, 1] - ab[1] * dv[m, 0])
            par[m] = (cum[i] + t[m] * math.sqrt(L2)) / total
        taper = np.sin(np.pi * np.clip(par, 0, 1)) ** 0.7
        wl = w * (0.35 + 0.65 * taper)
        d = dk * taper * (0.55 * np.exp(-2.0 * (best / wl) ** 2) + 0.45 * np.exp(-2.0 * (best / (2.6 * wl)) ** 2))  # 濃い芯＋水彩のにじみ
        h = hl * dk * taper * np.exp(-((best - 3.0 * wl) / (1.6 * wl)) ** 2) * (sgn > 0)
        dark[near] = np.maximum(dark[near], d)
        light[near] = np.maximum(light[near], h)
    return dark, light


def _argyle(a_m, b_m, bd):
    """(a, b)（m）の位置の菱形の格子の色（…×3）。bd: {"cell": m, "colors": [色1, 色2], "line", "line_w"}"""
    import numpy as np
    cell = float(bd['cell'])
    a = a_m / cell + b_m / cell
    b = a_m / cell - b_m / cell
    ca, cb = np.array(_hex8(bd['colors'][0]), dtype=np.float32), np.array(_hex8(bd['colors'][1]), dtype=np.float32)
    col = np.where((((np.floor(a) + np.floor(b)) % 2) == 0)[..., None], ca, cb)
    if bd.get('line'):
        lw = float(bd.get('line_w', 0.06))
        fa, fb = (a + 0.5) % 1.0, (b + 0.5) % 1.0
        on = (np.minimum(fa, 1 - fa) < lw) | (np.minimum(fb, 1 - fb) < lw)
        col = np.where(on[..., None], np.array(_hex8(bd['line']), dtype=np.float32), col)
    return col


def cloth_folds(p):
    """服のしわを、陰（濃い線）と光の当たる縁（明るい線）としてテクスチャに描く（原画の水彩の陰の付け方に寄せる）。
    線は体の上の位置で決める: 腕・脚は骨の鎖に沿った筒の座標（u＝付け根からの長さ m、v＝前からの角度 × radius m）、
    胴は正面・背面から見た (|x|, z)。左右は同じ形（UV が左右で別でも重なっていても同じに描ける）。頂点は動かさない。
      material: 材質名（の一部）・seed・shade: 陰の色（掛ける色）・highlight: 明るい縁の強さ（0〜1）
      limbs: [{"bones": [付け根, 中, 先]（左側の骨。右は L→R で同じ形）, "side_ref": "up"（腕）か "out"（脚）, "radius",
               "groups": [_fold_strokes の形], "bands": [{"u": [始, 終], "cell", "colors", "line", "line_w"}]（筒を一周する菱形の格子の帯。袖口など）}]
      torso: {"front": [_fold_strokes の形（u＝|x|, v＝z）], "back": […], "x_max": これより外は胴としない,
              "bands": [{"z": [下, 上], "radius", "cell", "colors", "line", "line_w", "match", "tol", "x": [|x| の下, 上], "front_only"}]
                （胴を一周する菱形の格子の帯。元の色が match に近い所だけ。colors を同じ 2 色にすれば塗りつぶし）}"""
    import random

    import numpy as np
    mats = find_materials(p['material'])
    px, img = _bake_factor(mats[0], np)
    rng = random.Random(int(p.get('seed', 3)))
    shade = np.array(_hex8(p.get('shade', '#C8C0B4')), dtype=np.float32)
    hl = float(p.get('highlight', 0.35))
    arm = armature()
    limbs = []
    for L in p.get('limbs', []):
        strokes = _fold_strokes(L['groups'], rng)
        for side, c in ((1, 'L'), (-1, 'R')):
            J = [np.array(list(arm.matrix_world @ arm.data.bones[b.replace('_L_', '_%s_' % c)].head_local)) for b in L['bones']]
            limbs.append({'J': J, 'side': side, 'ref': L.get('side_ref', 'up'), 'radius': float(L.get('radius', 0.06)), 'strokes': strokes,
                          'bands': L.get('bands', [])})
    tor = p.get('torso') or {}
    tor_front = _fold_strokes(tor.get('front', []), rng)
    tor_back = _fold_strokes(tor.get('back', []), rng)
    x_max = float(tor.get('x_max', 0.2))
    tor_bands = tor.get('bands', [])
    y_mid = (arm.matrix_world @ arm.data.bones['J_Bip_C_Chest'].head_local).y  # 胴の前と後ろの境

    def limb_coords(P, lb):
        """P（N×3）→ (u, v, 筒に入るか)。u は付け根からの長さ、v は前からの角度 × radius"""
        J = lb['J']
        best = np.full(len(P), 1e9)
        U = np.zeros(len(P))
        R = np.zeros((len(P), 3))
        first_t = None
        acc = 0.0
        for i in range(len(J) - 1):
            a, b = J[i], J[i + 1]
            ab = b - a
            L2 = ab @ ab
            traw = ((P - a) @ ab) / L2
            if i == 0:
                first_t = traw
            t = np.clip(traw, 0, 1)
            proj = a + t[:, None] * ab
            r = P - proj
            dd = np.sqrt((r ** 2).sum(1))
            m = dd < best
            best[m] = dd[m]
            U[m] = acc + t[m] * math.sqrt(L2)
            R[m] = r[m]
            acc += math.sqrt(L2)
        axis = (J[-1] - J[0]) / np.linalg.norm(J[-1] - J[0])
        front = np.array([0.0, -1.0, 0.0])
        front = front - axis * (front @ axis)
        front /= np.linalg.norm(front)
        ref = np.array([0.0, 0.0, 1.0]) if lb['ref'] == 'up' else np.array([float(lb['side']), 0.0, 0.0])
        ref = ref - axis * (ref @ axis) - front * (ref @ front)
        ref /= np.linalg.norm(ref)
        th = np.arctan2(R @ ref, R @ front)
        return U, th * lb['radius'], first_t > 0

    def paint_tri(P, Nrm, sub):
        n = len(P)
        dark = np.zeros(n, dtype=np.float32)
        light = np.zeros(n, dtype=np.float32)
        done = np.zeros(n, bool)
        for lb in limbs:
            side_ok = (P[:, 0] * lb['side']) > 0
            if not side_ok.any():
                continue
            u, v, inl = limb_coords(P, lb)
            m = side_ok & inl & ~done
            if lb['ref'] == 'up':  # 腕: 肩より外で、腕の高さの近くだけ（T ポーズで脇の下の身頃・裾を袖と取り違えない）
                m &= (np.abs(P[:, 0]) > abs(lb['J'][0][0]) - 0.01) & (P[:, 2] > lb['J'][0][2] - 0.15)
            else:  # 脚: 股関節より下だけ
                m &= P[:, 2] < lb['J'][0][2]
            if not m.any():
                continue
            for bd in lb['bands']:  # 筒を一周する柄の帯（袖口のアーガイル）。しわの陰はこの上に重ねる
                mb = m & (u >= bd['u'][0]) & (u <= bd['u'][1])
                if mb.any():
                    sub = sub.copy()
                    sub[mb] = _argyle(u[mb] - bd['u'][0], v[mb], bd)
            d, h = _stroke_shade(np.stack([u[m], v[m]], 1), lb['strokes'], hl)
            dark[m], light[m] = d, h
            done |= m
        rest = ~done & (np.abs(P[:, 0]) < x_max)
        for bd in tor_bands:  # 胴を一周する柄の帯（裾の帯のアーガイル）。元の色が match に近い画素だけ
            mb = rest & (P[:, 2] >= bd['z'][0]) & (P[:, 2] <= bd['z'][1])
            if 'x' in bd:  # |x| の範囲（前の開きの真ん中だけ など）
                mb &= (np.abs(P[:, 0]) >= bd['x'][0]) & (np.abs(P[:, 0]) <= bd['x'][1])
            if bd.get('front_only'):
                mb &= P[:, 1] < y_mid
            if 'match' in bd:
                mb &= np.sqrt(((sub - np.array(_hex8(bd['match']), dtype=np.float32)) ** 2).sum(-1)) < float(bd.get('tol', 0.12))
            if mb.any():
                ang = np.arctan2(P[mb, 0], -(P[mb, 1] - y_mid))
                sub = sub.copy()
                sub[mb] = _argyle(ang * float(bd.get('radius', 0.16)), P[mb, 2] - bd['z'][0], bd)
        if rest.any() and (tor_front or tor_back):
            Q = np.stack([np.abs(P[:, 0]), P[:, 2]], 1)
            # 前か後ろかは位置で分ける（裏地の面は法線が内向きなので、法線では逆になる）
            for strokes, fm in ((tor_front, P[:, 1] < y_mid), (tor_back, P[:, 1] >= y_mid)):
                m = rest & fm
                if strokes and m.any():
                    d, h = _stroke_shade(Q[m], strokes, hl)
                    dark[m], light[m] = d, h
        col = sub * (1 - dark[:, None] * (1 - shade))
        return col + (1 - col) * light[:, None]

    H, W = px.shape[:2]
    src = px[..., :3].copy()  # 描く前の色（重なる画素を二度塗りしない）
    owned = np.zeros((H, W), bool)
    tris = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or not any(m in mats for m in o.data.materials):
            continue
        me = o.data
        me.calc_loop_triangles()
        uv = me.uv_layers.active.data
        mw, rot = o.matrix_world, o.matrix_world.to_3x3()
        idx = {i for i, m in enumerate(me.materials) if m in mats}
        for t in me.loop_triangles:
            if t.material_index in idx:
                tris.append((np.array([list(mw @ me.vertices[v].co) for v in t.vertices]),
                             np.array([list((rot @ me.vertices[v].normal).normalized()) for v in t.vertices]),
                             np.array([[uv[l].uv.x * W, uv[l].uv.y * H] for l in t.loops])))
    tris.sort(key=lambda t: t[0][:, 1].mean())  # 前（y が小さい）の三角形から塗る（前と後ろが同じ UV のとき、前の位置で描く）
    painted = 0
    for margin in (0.0, 0.03):  # 1 回目: 三角形の中だけ。2 回目: 少しはみ出して、まだ塗っていない画素だけ（UV の切れ目のにじみ止め）
        for Pv, Nv, Uv in tris:
            x0, y0 = np.floor(Uv.min(axis=0)).astype(int) - 1
            x1, y1 = np.ceil(Uv.max(axis=0)).astype(int) + 1
            x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W - 1), min(y1, H - 1)
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            (ax, ay), (bx, by), (qx, qy) = Uv
            den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy)
            if abs(den) < 1e-9:
                continue
            w0 = ((by - qy) * (gx - qx) + (qx - bx) * (gy - qy)) / den
            w1 = ((qy - ay) * (gx - qx) + (ax - qx) * (gy - qy)) / den
            w2 = 1 - w0 - w1
            own = owned[y0:y1 + 1, x0:x1 + 1]
            inside = (w0 >= -margin) & (w1 >= -margin) & (w2 >= -margin) & ~own
            if not inside.any():
                continue
            wts = np.stack([w0[inside], w1[inside], w2[inside]], 1)
            sub = px[y0:y1 + 1, x0:x1 + 1]
            sub[inside, :3] = paint_tri(wts @ Pv, wts @ Nv, src[y0:y1 + 1, x0:x1 + 1][inside])
            own[inside] = True
            painted += margin == 0.0
    out = bpy.data.images.new(img.name + '_hq3d_folds', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        ext = m.vrm_addon_extension.mtoon1
        ext.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = ext.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:
            mt.shade_multiply_texture.index.source = out
    return {'part': 'cloth_folds', 'material': p['material'], 'triangles': painted,
            'strokes': {'limbs': sum(len(lb['strokes']) for lb in limbs) // 2, 'front': len(tor_front), 'back': len(tor_back)}}



# ── 瀬名 灯里（2026-11-07）: 前の飾り・ヘアピン・ショルダーバッグ ─────────────

def front_marks(p):
    """上着の前に、縫い目の線・ふた付きポケット・スナップを描く（前を向いた面のテクスチャへ、体の上の位置 X・Z で描く）。
      material: 材質名（の一部）・facing: 前を向いた面だけ（法線と正面の内積の下限）
      items: [{"type": "line", "from": [x, z], "to": [x, z], "width", "color"}
              {"type": "rect", "box": [x0, z0, x1, z1], "fill": 色（無くてよい）, "outline": 色, "line_w"}
              {"type": "dot", "at": [x, z], "radius", "color", "rim": 色（ふちの色・無くてよい）}]
      どの item も "mirror": true で左右対称（x を反対にしたものも描く）。座標は m（モデルの左＝+x）"""
    import numpy as np
    mats = find_materials(p.get('material', 'Tops_01'))
    src = mats[0]
    ext = src.vrm_addon_extension.mtoon1
    img = ext.pbr_metallic_roughness.base_color_texture.index.source
    if img is None:
        raise RuntimeError('テクスチャがありません: %s' % p.get('material'))
    W, H = img.size
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    items = []
    for it in p['items']:
        items.append(it)
        if it.get('mirror'):
            m = dict(it)
            m['mirror'] = False
            if 'from' in it:
                m['from'], m['to'] = [-it['from'][0], it['from'][1]], [-it['to'][0], it['to'][1]]
            if 'box' in it:
                x0, z0, x1, z1 = it['box']
                m['box'] = [-x1, z0, -x0, z1]
            if 'at' in it:
                m['at'] = [-it['at'][0], it['at'][1]]
            items.append(m)
    zs = [v for it in items for v in ([it['from'][1], it['to'][1]] if 'from' in it else ([it['box'][1], it['box'][3]] if 'box' in it else [it['at'][1]]))]
    zlo, zhi = min(zs) - 0.02, max(zs) + 0.02

    def paint(X, Z, inside, rgb):
        col = rgb.copy()
        for it in items:
            t = it['type']
            if t == 'line':
                (ax, az), (bx, bz) = it['from'], it['to']
                dx, dz = bx - ax, bz - az
                L2 = max(dx * dx + dz * dz, 1e-12)
                u = np.clip(((X - ax) * dx + (Z - az) * dz) / L2, 0, 1)
                d = np.hypot(X - (ax + u * dx), Z - (az + u * dz))
                m = inside & (d < float(it.get('width', 0.002)) / 2)
                col = np.where(m[..., None], np.array(_hex8(it['color'])), col)
            elif t == 'rect':
                x0, z0, x1, z1 = it['box']
                inb = inside & (X >= x0) & (X <= x1) & (Z >= z0) & (Z <= z1)
                rr = float(it.get('round', 0.0))  # 角の丸み（m）。0 なら今までどおりの四角
                lw = float(it.get('line_w', 0.002))
                if rr > 0:
                    rr = min(rr, (x1 - x0) / 2, (z1 - z0) / 2)
                    qx = np.maximum(np.maximum(x0 + rr - X, X - (x1 - rr)), 0)
                    qz = np.maximum(np.maximum(z0 + rr - Z, Z - (z1 - rr)), 0)
                    corner = np.hypot(qx, qz)
                    inb &= corner <= rr
                    edge = inb & ((X - x0 < lw) | (x1 - X < lw) | (Z - z0 < lw) | (z1 - Z < lw) | (corner > rr - lw))
                else:
                    edge = inb & ((X - x0 < lw) | (x1 - X < lw) | (Z - z0 < lw) | (z1 - Z < lw))
                if it.get('fill'):
                    col = np.where(inb[..., None], np.array(_hex8(it['fill'])), col)
                if it.get('outline'):
                    col = np.where(edge[..., None], np.array(_hex8(it['outline'])), col)
            elif t == 'dot':
                cx, cz = it['at']
                r = float(it.get('radius', 0.004))
                d = np.hypot(X - cx, Z - cz)
                if it.get('rim'):
                    col = np.where((inside & (d < r))[..., None], np.array(_hex8(it['rim'])), col)
                    col = np.where((inside & (d < r * 0.7))[..., None], np.array(_hex8(it['color'])), col)
                else:
                    col = np.where((inside & (d < r))[..., None], np.array(_hex8(it['color'])), col)
        return col

    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and any(m in mats for m in o.data.materials):
            _texel_pass(o, mats, px, float(p.get('facing', 0.25)), zlo, zhi, paint)
    out = bpy.data.images.new(img.name + '_hq3d_marks', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        e = m.vrm_addon_extension.mtoon1
        e.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = e.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:
            mt.shade_multiply_texture.index.source = out
    return {'part': 'front_marks', 'items': len(items)}


def _box_faces(bm, center, ax, ay, az, hx, hy, hz):
    """中心と 3 本の向き（ax・ay・az は長さ 1）と半分の大きさで箱を作り、面の一覧を返す"""
    vs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                vs.append(bm.verts.new(center + ax * (sx * hx) + ay * (sy * hy) + az * (sz * hz)))
    idx = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return [bm.faces.new([vs[i] for i in f]) for f in idx]


def hair_clip(p):
    """ヘアピン（細い棒）: 横から髪へ光線を当て、その点の表面に沿って、angle（度）の向きに伸びる細い箱を置く。頭の骨に付ける。
      side: 1（モデルの左＝+x）か -1・at: [y, z]（光線の高さと前後）・length・width・thick・angle: 横から見た傾き（0＝水平・前が下がると負）
      material: 当てる材質（の一部。髪）・offset・color・shade_color"""
    sd = float(p.get('side', 1))
    y, z = p['at']
    pt, nrm = ray_hit((sd * 0.5, y, z), (-sd, 0, 0), p.get('material', 'Hair'), 0.0)
    a = math.radians(float(p.get('angle', 0.0)))
    d = Vector((0, math.cos(a), math.sin(a)))
    d = (d - nrm * d.dot(nrm)).normalized()      # 表面に沿う向き
    w = nrm.cross(d).normalized()
    L, Wd, T = float(p['length']), float(p.get('width', 0.006)), float(p.get('thick', 0.0025))
    c = pt + nrm * (float(p.get('offset', 0.002)) + T / 2)
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
    groups[0] += _box_faces(bm, c, d, w, nrm, L / 2, Wd / 2, T / 2)
    # 先の丸み代わりに、両端を少し細くした小さな箱を足す
    for s in (-1, 1):
        groups[0] += _box_faces(bm, c + d * (s * (L / 2 + Wd * 0.25)), d, w, nrm, Wd * 0.25, Wd * 0.35, T * 0.45)
    name = p.get('name', 'HQ3D_HairClip')
    verts = _make_object(dict(p, material_from=p.get('material_from', 'Tops_01')), name, p.get('bone', 'J_Bip_C_Head'), groups)
    return {'part': 'hair_clip', 'at': [round(v, 4) for v in pt], 'verts': verts}


def _wrap_point(theta, z, offset, cy=0.0):
    """体の縦の芯（x=0, y=cy）のまわりの向き theta（度。0＝正面・90＝モデルの左・180＝背中）から水平に光線を当てた表面の点と法線"""
    t = math.radians(theta)
    d = Vector((math.sin(t), -math.cos(t), 0))
    return ray_hit(Vector((0, cy, z)) + d * 1.2, -d, None, offset)


def _ribbon(bm, pts, nrms, half_w, half_t):
    """点の列に沿う平たい帯（幅は表面に沿う向き・厚みは法線の向き）。面の一覧を返す"""
    rings = []
    for i, (q, n) in enumerate(zip(pts, nrms)):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        w = t.cross(n).normalized()
        nn = w.cross(t).normalized()
        rings.append([bm.verts.new(q + w * (a * half_w) + nn * (b * half_t)) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    faces = []
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(4):
            faces.append(bm.faces.new((r0[j], r0[(j + 1) % 4], r1[(j + 1) % 4], r1[j])))
    faces.append(bm.faces.new(rings[0][::-1]))
    faces.append(bm.faces.new(rings[-1]))
    return faces


def shoulder_bag(p):
    """斜めがけのショルダーバッグ: 腰の横の箱（ふた・留め具のベルト・金具）と、肩から体に沿って下りる平たい肩ひも。
      bag: {"theta": 体のまわりの向き（度）, "z": 中心の高さ, "size": [幅, 高さ, 厚み], "gap": 体とのすき間, "flap": ふたの割合（0〜1）, "round": 角の丸み m,
            "straps": [横の位置（幅に対する割合 -0.5〜0.5）, …]・"bone"}
      strap: {"front": [[theta, z], …]（肩の前からバッグの内側の上へ）, "back": [[theta, z], …]（肩の後ろからバッグの外側の上へ）,
              "shoulder_x": 肩の上を越える所の x, "width", "thick", "offset"}
      color（バッグ）・center_color（ふた）・cord_color（金具）・strap_color
    肩ひもは HQ3D_BagStrap として作るので、follow_weights で上着の布から重みを写す（この手順のあとに置く）"""
    b = p['bag']
    th = math.radians(float(b['theta']))
    n = Vector((math.sin(th), -math.cos(th), 0))     # バッグの表の向き（体から外）
    u = Vector((math.cos(th), math.sin(th), 0))       # 幅の向き（体のまわりの接線）
    up = Vector((0, 0, 1))
    bw, bh, bd = b['size']
    s_pt, _ = _wrap_point(float(b['theta']), float(b['z']), 0.0)
    c = s_pt + n * (float(b.get('gap', 0.02)) + bd / 2)
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
    body = _box_faces(bm, c, u, up, n, bw / 2, bh / 2, bd / 2)
    # 角を丸める（革のかばんらしく）。丸めると元の面が置きかわるので、丸めたあとの面（この時点では箱だけ）を枠 0 にする
    edges = list({e for f in body for e in f.edges})
    bmesh.ops.bevel(bm, geom=edges, offset=float(b.get('round', 0.012)), segments=3, profile=0.5, affect='EDGES')
    groups[0] += list(bm.faces)
    # ふた: 上から前へかぶさる薄い板（前の面の上 flap の割合と、上の面）
    fl = float(b.get('flap', 0.6))
    ft = 0.004
    fc = c + n * (bd / 2 + ft / 2) + up * (bh / 2 - bh * fl / 2)
    groups[1] += _box_faces(bm, fc, u, up, n, bw / 2 + 0.003, bh * fl / 2, ft / 2)
    groups[1] += _box_faces(bm, c + up * (bh / 2 + ft / 2), u, n, up, bw / 2 + 0.003, bd / 2 + 0.003, ft / 2)
    # 留め具のベルト（ふたの前に縦の細い帯）と金具（小さな四角）
    for sx in b.get('straps', [-0.25, 0.25]):
        bc = c + u * (sx * bw) + n * (bd / 2 + ft + 0.002) + up * (bh / 2 - bh * fl * 0.62)
        groups[1] += _box_faces(bm, bc, u, up, n, 0.008, bh * fl * 0.55, 0.002)
        mc = c + u * (sx * bw) + n * (bd / 2 + ft + 0.004) + up * (bh / 2 - bh * fl * 0.95)
        groups[2] += _box_faces(bm, mc, u, up, n, 0.011, 0.008, 0.002)
    bag_name = p.get('name', 'HQ3D_Bag')
    bag_verts = _make_object(p, bag_name, b.get('bone', 'J_Bip_C_Hips'), groups)

    # 肩ひも: 前（肩→バッグの内側の上）・肩の上・後ろ（肩→バッグの外側の上）を体に沿ってつなぐ
    s = p['strap']
    off = float(s.get('offset', 0.006))
    inner = c + u * (-bw / 2 * float(s.get('inner_side', 1))) + up * (bh / 2)
    outer = c + u * (bw / 2 * float(s.get('inner_side', 1))) + up * (bh / 2)
    # 内側＝体の正面に近い方の角（向き theta が 0 に近い方）
    if (inner - Vector((0, 0, inner.z))).dot(Vector((0, -1, 0))) < (outer - Vector((0, 0, outer.z))).dot(Vector((0, -1, 0))):
        inner, outer = outer, inner

    def follow(wps, steps=6):
        pts, nrms = [], []
        for (t0, z0), (t1, z1) in zip(wps, wps[1:]):
            if t1 - t0 > 180:      # ±180 度をまたぐときは近い回り方で（背中から体の横へ回る所）
                t1 -= 360
            elif t0 - t1 > 180:
                t1 += 360
            for k in range(steps):
                f = k / steps
                q, nn = _wrap_point(t0 + (t1 - t0) * f, z0 + (z1 - z0) * f, off)
                pts.append(q)
                nrms.append(nn)
        q, nn = _wrap_point(wps[-1][0], wps[-1][1], off)
        return pts + [q], nrms + [nn]
    fp, fn = follow(s['front'])
    bp, bn = follow(s['back'])
    # 肩の上: 前の始まりと後ろの始まりの間を、上からの光線でつなぐ
    sx = float(s['shoulder_x'])
    top, topn = [], []
    for k in range(1, 8):
        yy = fp[0].y + (bp[0].y - fp[0].y) * k / 8
        q, nn = top_point(sx, yy, off, s.get("material", "Tops_01"))   # 髪に当てない（肩の布に当てる）
        top.append(q)
        topn.append(nn)
    # 端はバッグの角へ寄せる（最後の 2 点を角とその少し上に）
    fp = fp[:-1] + [inner + up * 0.03, inner]
    fn = fn[:-1] + [fn[-1], n]
    bp = bp[:-1] + [outer + up * 0.03, outer]
    bn = bn[:-1] + [bn[-1], n]
    pts = list(reversed(fp)) + top + bp
    nrms = list(reversed(fn)) + topn + bn
    bm2 = bmesh.new()
    g2 = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm2}
    g2[0] += _ribbon(bm2, pts, nrms, float(s.get('width', 0.024)) / 2, float(s.get('thick', 0.004)) / 2)
    strap_name = p.get('strap_name', 'HQ3D_BagStrap')
    strap_verts = _make_object(dict(p, color=p.get('strap_color', p['color']), shade_color=p.get('strap_shade')), strap_name, b.get('bone', 'J_Bip_C_Hips'), g2)
    return {'part': 'shoulder_bag', 'bag_verts': bag_verts, 'strap_verts': strap_verts, 'strap_points': len(pts),
            'bag_center': [round(v, 3) for v in c]}



# ── だんのうらの娘（2026-11-07）: ジャンパースカートの胸当て・肩ひも・ボタン ─────────

def _panel(bm, side, z_lo, z_hi, hw_at, material, offset, rows=10, cols=10):
    """体の前（side=-1・-Y から）か後ろ（side=1・+Y から）の表面に沿う板。hw_at(z) が半分の幅。面の一覧と各行の端の点を返す"""
    grid, edges = [], []
    for r in range(rows + 1):
        z = z_lo + (z_hi - z_lo) * r / rows
        hw = hw_at(z)
        row = []
        for c in range(cols + 1):
            x = -hw + 2 * hw * c / cols
            q, n = ray_hit((x, side * 2.0, z), (0, -side, 0), material, offset)
            row.append(bm.verts.new(q))
        grid.append(row)
        edges.append((row[0].co.copy(), row[-1].co.copy()))
    faces = []
    for r in range(rows):
        for c in range(cols):
            vs = (grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c])
            faces.append(bm.faces.new(vs if side < 0 else vs[::-1]))
    return faces, edges


def pinafore_bib(p):
    """ジャンパースカートの上半分: 前の胸当て・後ろの身ごろ・肩ひも・ボタン。T シャツ（material）の表面に沿わせて作る。
    スカートは VRoid のスカートをそのまま使い、胸当ての下の端をスカートの腰に重ねる。
      material: 沿わせる布（T シャツ）の材質名（の一部）・offset: 布から浮かせる m
      front: {"z": [下, 上], "half_width": [[z, 半幅], …]}・back: 同じ形（後ろの身ごろ）
      strap: {"x": 肩ひもの中心の |x|, "width", "thick", "y_front": 前の端の y を探す範囲は自動}
      buttons: {"front": [[x, z], …], "back": [[x, z], …], "radius", "color"}（前の 2 つは肩ひもの付け根、後ろは真ん中に縦に並べる）
      color（布）・shade_color・center_color（ボタン）・name
    重みは follow_weights で T シャツから写す（この手順のあとに置く）"""
    mat = p.get('material', 'Tops_01')
    off = float(p.get('offset', 0.005))

    def interp(pts):
        pts = sorted((float(z), float(w)) for z, w in pts)

        def f(z):
            if z <= pts[0][0]:
                return pts[0][1]
            for (z0, w0), (z1, w1) in zip(pts, pts[1:]):
                if z <= z1:
                    return w0 + (w1 - w0) * (z - z0) / (z1 - z0)
            return pts[-1][1]
        return f
    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
    fr, bk = p['front'], p['back']
    ff, fedges = _panel(bm, -1, fr['z'][0], fr['z'][1], interp(fr['half_width']), mat, off)
    bf, bedges = _panel(bm, 1, bk['z'][0], bk['z'][1], interp(bk['half_width']), mat, off)
    groups[0] += ff + bf
    # 胴まわりの帯（band: {"z": [下, 上], "cols", "rows"}）: 脇の下まで身ごろを一周させる（横から見て T シャツが見えないように）。
    # 胴の芯（x=0, y=前後の板の真ん中）から外へ水平に光線を当てて、material の表面に沿わせる。前後の板より少しだけ内側に置く
    bd = p.get('band')
    if bd:
        blo, bhi = bd['z']
        cols, rows = int(bd.get('cols', 48)), int(bd.get('rows', 6))
        cy = float(bd.get('cy', 0.0))
        ring_rows = []
        for r_ in range(rows + 1):
            z = blo + (bhi - blo) * r_ / rows
            row = []
            for c_ in range(cols):
                t = 2 * math.pi * c_ / cols
                d = Vector((math.sin(t), -math.cos(t), 0))
                q, n = ray_hit(Vector((0, cy, z)) + d * 1.2, -d, mat, off * 0.6)
                row.append(bm.verts.new(q))
            ring_rows.append(row)
        for r_ in range(rows):
            for c_ in range(cols):
                a, b = ring_rows[r_][c_], ring_rows[r_][(c_ + 1) % cols]
                cc, dd = ring_rows[r_ + 1][(c_ + 1) % cols], ring_rows[r_ + 1][c_]
                groups[0].append(bm.faces.new((a, b, cc, dd)))
    # 腰の切り替えの縫い目（seam: {"z", "width", "thick", "cols"}）: 胴を一周する細い帯。色はボタンと同じ（center_color）
    sm = p.get('seam')
    if sm:
        cols = int(sm.get('cols', 64))
        cy = float((bd or {}).get('cy', 0.0))
        pts, nrms = [], []
        for c_ in range(cols + 1):
            t = 2 * math.pi * (c_ % cols) / cols
            d = Vector((math.sin(t), -math.cos(t), 0))
            q, n = ray_hit(Vector((0, cy, float(sm['z']))) + d * 1.2, -d, mat, off + 0.0025)
            pts.append(q)
            nrms.append(n)
        groups[1] += _ribbon(bm, pts, nrms, float(sm.get('width', 0.004)) / 2, float(sm.get('thick', 0.0015)) / 2)
    # 肩ひも: 前の上の端（x=±sx）から、肩の上（上からの光線）を通って、後ろの上の端へ
    s = p['strap']
    sx = float(s['x'])
    hw_s, ht_s = float(s.get('width', 0.022)) / 2, float(s.get('thick', 0.003)) / 2
    for sd in (1, -1):
        x = sd * sx
        f0, _ = ray_hit((x, -2.0, fr['z'][1]), (0, 1, 0), mat, off)
        b0, _ = ray_hit((x, 2.0, bk['z'][1]), (0, -1, 0), mat, off)
        pts, nrms = [], []
        zs_front = [fr['z'][1] + (float(s.get('shoulder_z', fr['z'][1] + 0.08)) - fr['z'][1]) * k / 5 for k in range(6)]
        for z in zs_front[:-1]:
            q, n = ray_hit((x, -2.0, z), (0, 1, 0), mat, off)
            pts.append(q)
            nrms.append(n)
        for k in range(1, 8):
            yy = (pts[-1].y + 0.01) + ((b0.y - 0.01) - (pts[-1].y + 0.01)) * k / 8
            q, n = top_point(x, yy, off, mat)
            pts.append(q)
            nrms.append(n)
        zs_back = [float(s.get('shoulder_z', fr['z'][1] + 0.08)) + (bk['z'][1] - float(s.get('shoulder_z', fr['z'][1] + 0.08))) * k / 5 for k in range(1, 6)]
        for z in zs_back:
            q, n = ray_hit((x, 2.0, z), (0, -1, 0), mat, off)
            pts.append(q)
            nrms.append(n)
        groups[0] += _ribbon(bm, pts, nrms, hw_s, ht_s)
    # ボタン: 平たい小さな円柱（表面の法線の向き）
    bt = p.get('buttons') or {}
    r = float(bt.get('radius', 0.008))
    for side, key in ((-1, 'front'), (1, 'back')):
        for x, z in bt.get(key, []):
            q, n = ray_hit((x, side * 2.0, z), (0, -side, 0), mat, off + 0.003)
            _, u, v = _frame(n)
            ring0, ring1 = [], []
            for k in range(12):
                a = 2 * math.pi * k / 12
                d = (u * math.cos(a) + v * math.sin(a)) * r
                ring0.append(bm.verts.new(q + d))
                ring1.append(bm.verts.new(q + d + n * 0.003))
            for k in range(12):
                groups[1].append(bm.faces.new((ring0[k], ring0[(k + 1) % 12], ring1[(k + 1) % 12], ring1[k])))
            groups[1].append(bm.faces.new(ring1))
    name = p.get('name', 'HQ3D_Pinafore')
    verts = _make_object(dict(p, material_from=p.get('material_from', mat)), name, p.get('bone', 'J_Bip_C_Chest'), groups)
    return {'part': 'pinafore_bib', 'verts': verts}


def zone_paint(p):
    """体の上の高さ z の範囲で、テクスチャの色を置きかえる（前後左右どの向きの面も。脚のまわりを一周など）。
    VRoid のレッグウェアは体のテクスチャに描かれているので、靴下を短くするのに使う（靴下の白の上を肌の色で塗る）。
      material: 材質名（の一部）・z: [下, 上]（m）
      match・tol: この色に近い画素だけ（無ければ範囲の全部）
      color: 塗る色。"sample" なら sample_z: [下, 上] の範囲の画素の中央値（靴下のすぐ上の肌の色を拾う）
      keep_shade: 元の明るさの差を残す割合（0 で一色）"""
    import numpy as np
    mats = find_materials(p['material'])
    img = mats[0].vrm_addon_extension.mtoon1.pbr_metallic_roughness.base_color_texture.index.source
    if img is None:
        raise RuntimeError('テクスチャがありません: %s' % p['material'])
    W, H = img.size
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m in mats for m in o.data.materials)]
    col = p['color']
    if col == 'sample':
        got = []
        slo, shi = p['sample_z']

        def grab(X, Z, inside, rgb):
            if inside.any():
                got.append(rgb[inside])
            return rgb
        for o in objs:
            _texel_pass(o, mats, px.copy(), -2.0, slo, shi, grab)
        if not got:
            raise RuntimeError('sample_z の範囲に画素がありません: %s' % p['sample_z'])
        c = np.median(np.concatenate(got), axis=0)
    else:
        c = np.array(_hex8(col), dtype=np.float32)
    zlo, zhi = p['z']
    mc = np.array(_hex8(p['match']), dtype=np.float32) if p.get('match') else None
    tol = float(p.get('tol', 0.2))
    keep = float(p.get('keep_shade', 0.0))
    count = [0]

    def paint(X, Z, inside, rgb):
        m = inside
        if mc is not None:
            m = m & (np.sqrt(((rgb - mc) ** 2).sum(-1)) < tol)
        if not m.any():
            return rgb
        out = rgb.copy()
        ref = float(mc.max()) if mc is not None else 1.0
        k = (1 - keep) + keep * np.clip(rgb.max(-1) / max(ref, 1e-4), 0, 1)
        out[m] = np.clip(c[None, :] * k[m][:, None], 0, 1)
        count[0] += int(m.sum())
        return out
    for o in objs:
        _texel_pass(o, mats, px, -2.0, zlo, zhi, paint)
    out = bpy.data.images.new(img.name + '_hq3d_zone', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    for m in mats:
        e = m.vrm_addon_extension.mtoon1
        e.pbr_metallic_roughness.base_color_texture.index.source = out
        mt = e.extensions.vrmc_materials_mtoon
        if mt.shade_multiply_texture.index.source is img:
            mt.shade_multiply_texture.index.source = out
    return {'part': 'zone_paint', 'texels': count[0], 'color': '#%02X%02X%02X' % tuple(int(round(v * 255)) for v in c[:3])}


def delete_faces(p):
    """材質名に material を含む面のうち、中心が箱 box の中にある面を消す（VRoid のスカートの飾りの結び目など、要らない小物）。
      box: [x0, y0, z0, x1, y1, z1]（m）。消したあとに残った、どの面にも使われない頂点も消す"""
    import bmesh
    x0, y0, z0, x1, y1, z1 = p['box']
    removed = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and p['material'] in m.name}
        if not idx:
            continue
        bm = bmesh.new()
        bm.from_mesh(o.data)
        mw = o.matrix_world
        kill = []
        for f in bm.faces:
            if f.material_index in idx:
                c = mw @ f.calc_center_median()
                if x0 <= c.x <= x1 and y0 <= c.y <= y1 and z0 <= c.z <= z1:
                    kill.append(f)
        if kill:
            bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
            loose = [v for v in bm.verts if not v.link_faces]
            bmesh.ops.delete(bm, geom=loose, context='VERTS')
            bm.to_mesh(o.data)
            removed += len(kill)
        bm.free()
    if not removed:
        raise RuntimeError('箱の中に面がありません: %s %s' % (p['material'], p['box']))
    return {'part': 'delete_faces', 'removed_faces': removed}


def mini_hat(p):
    """小さなシルクハット（頭の上に乗せる飾り）: つば・山（上がわずかに広がる筒）・帯を作り、頭の骨に重み 1 で付ける。
    髪の上から下へ光線を当てた点に、sink だけ沈めて置く。
      at: [x, y]（頭の上の位置 m・モデルの左＝+x）・material: 当てる材質（髪）・sink
      crown: {"r_bottom", "r_top", "height"}・brim: {"r", "thick", "curl"（つばの外の端を上げる m）}・band: {"height", "r_scale"}
      tilt: 横の傾き（度。+ でモデルの左へ倒れる）・pitch: 前後の傾き（度。+ で前へ倒れる）・segments
      color（山とつば）・center_color（帯）・shade_color・name・bone"""
    seg = int(p.get('segments', 40))
    x, y = p.get('at', [0.0, 0.0])
    pt, _ = top_point(float(x), float(y), 0.0, p.get('material', 'Hair'))
    up = Vector((0, 0, 1))
    up.rotate(Matrix.Rotation(math.radians(-float(p.get('tilt', 0.0))), 3, 'Y'))
    up.rotate(Matrix.Rotation(math.radians(-float(p.get('pitch', 0.0))), 3, 'X'))
    up.normalize()
    ax = Vector((1, 0, 0))
    ax = (ax - up * ax.dot(up)).normalized()
    ay = up.cross(ax).normalized()
    base = pt - up * float(p.get('sink', 0.008))
    cr, br, bd = p.get('crown', {}), p.get('brim', {}), p.get('band', {})
    rb, rt, h = float(cr.get('r_bottom', 0.03)), float(cr.get('r_top', 0.033)), float(cr.get('height', 0.055))
    R, bt, curl = float(br.get('r', 0.05)), float(br.get('thick', 0.004)), float(br.get('curl', 0.006))
    bh, bs = float(bd.get('height', 0.012)), float(bd.get('r_scale', 1.03))

    def ring(r, z, lift=0.0):
        return [bm.verts.new(base + ax * (r * math.cos(2 * math.pi * k / seg)) + ay * (r * math.sin(2 * math.pi * k / seg)) + up * (z + lift)) for k in range(seg)]

    def side(r0, r1, faces):
        for k in range(seg):
            faces.append(bm.faces.new((r0[k], r0[(k + 1) % seg], r1[(k + 1) % seg], r1[k])))

    bm = bmesh.new()
    groups = {0: [], 1: [], 2: [], 3: [], 4: [], '_bm': bm}
    # つば: 内側の輪から外の端へ（外の端は curl だけ上がる）。上の面・下の面・ふち
    in_t, in_b = ring(rb * 0.9, bt), ring(rb * 0.9, 0.0)
    out_t, out_b = ring(R, bt, curl), ring(R, 0.0, curl)
    side(in_t, out_t, groups[0])
    side(out_b, in_b, groups[0])
    side(out_t, out_b, groups[0])
    groups[0].append(bm.faces.new(in_b[::-1]))
    # 山: 下の輪から上の輪へ（上がわずかに広い）と、上のふた
    c0, c1 = ring(rb, bt), ring(rt, bt + h)
    side(c0, c1, groups[0])
    groups[0].append(bm.faces.new(c1))
    # 帯: 山の下の部分を少し太らせた筒
    b0, b1 = ring(rb * bs, bt + 0.0005), ring((rb + (rt - rb) * bh / h) * bs, bt + bh)
    side(b0, b1, groups[1])
    name = p.get('name', 'HQ3D_Hat')
    verts = _make_object(dict(p, material_from=p.get('material_from', 'Tops_01')), name, p.get('bone', 'J_Bip_C_Head'), groups)
    return {'part': 'mini_hat', 'top': [round(v, 4) for v in pt], 'verts': verts}


def hair_two_tone(p):
    """髪の一部の毛束だけを別の色にする（メッシュ・ハイライトの束）。
    VRoid の髪は毛束ごとに別の島（つながった面のかたまり）で、どの束も同じテクスチャの場所を使うので、テクスチャに描くと全部の束に出る。
    そこで、島の重心が boxes のどれかに入る束を、新しい材質（元の髪の材質の写し＋色を変えたテクスチャ）へ移す。
      material: 髪の材質名（の一部）・boxes: [[x0, y0, z0, x1, y1, z1], …]（重心の範囲 m・モデルの左＝+x・前＝-y）
      color: 新しい色（テクスチャの明るさの差は floor〜1 の幅で残す）・floor・shade_color・name（新しい材質名）"""
    import numpy as np
    src = find_materials(p['material'])[0]
    new = src.copy()
    new.name = p.get('name', 'HQ3D_HairTone')
    ext = new.vrm_addon_extension.mtoon1
    img = ext.pbr_metallic_roughness.base_color_texture.index.source
    if img is None:
        raise RuntimeError('髪のテクスチャがありません: %s' % p['material'])
    W, H = img.size
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(H, W, 4)
    lum = px[..., :3] @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    vis = px[..., 3] > 0.1
    ref = float(np.percentile(lum[vis], 95)) if vis.any() else 1.0
    fl = float(p.get('floor', 0.7))
    k = fl + (1 - fl) * np.clip(lum / max(ref, 1e-4), 0, 1)
    c = np.array(_hex8(p['color']), dtype=np.float32)
    px[..., :3] = np.clip(c[None, None, :] * k[..., None], 0, 1)
    out = bpy.data.images.new(img.name + '_hq3d_tone', W, H, alpha=True)
    out.colorspace_settings.name = img.colorspace_settings.name
    out.pixels.foreach_set(px.ravel())
    out.pack()
    ext.pbr_metallic_roughness.base_color_texture.index.source = out
    mt = ext.extensions.vrmc_materials_mtoon
    if mt.shade_multiply_texture.index.source is img:
        mt.shade_multiply_texture.index.source = out
    ext.pbr_metallic_roughness.base_color_factor = (1.0, 1.0, 1.0, ext.pbr_metallic_roughness.base_color_factor[3])
    if p.get('shade_color'):
        mt.shade_color_factor = hex_linear(p['shade_color'])
    boxes = p['boxes']
    moved, islands = 0, 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m is src}
        if not idx:
            continue
        o.data.materials.append(new)
        ni = len(o.data.materials) - 1
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bm.faces.ensure_lookup_table()
        mw = o.matrix_world
        seen = set()
        for f in bm.faces:
            if f.index in seen or f.material_index not in idx:
                continue
            comp, stack = [], [f]
            seen.add(f.index)
            while stack:
                g = stack.pop()
                comp.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index not in seen and h.material_index in idx:
                            seen.add(h.index)
                            stack.append(h)
            vs = {v for g in comp for v in g.verts}
            cen = mw @ (sum((v.co for v in vs), Vector()) / len(vs))
            if any(b[0] <= cen.x <= b[3] and b[1] <= cen.y <= b[4] and b[2] <= cen.z <= b[5] for b in boxes):
                for g in comp:
                    g.material_index = ni
                moved += len(comp)
                islands += 1
        bm.to_mesh(o.data)
        bm.free()
    if not moved:
        raise RuntimeError('箱の中に毛束がありません: %s' % boxes)
    return {'part': 'hair_two_tone', 'islands': islands, 'faces': moved}


PARTS = {
    'hair_two_tone': hair_two_tone,
    'mini_hat': mini_hat,
    'zone_paint': zone_paint,
    'delete_faces': delete_faces,
    'pinafore_bib': pinafore_bib,
    'front_marks': front_marks,
    'hair_clip': hair_clip,
    'shoulder_bag': shoulder_bag,
    'merge_plain_parts': merge_plain_parts,
    'tail_duplicate': tail_duplicate,
    'welt_pocket': welt_pocket,
    'ear_flatten': ear_flatten,
    'follow_weights': follow_weights,
    'closed_lash_fix': closed_lash_fix,
    'tail_swing': tail_swing,
    'toon_style': toon_style,
    'sole_thicken': sole_thicken,
    'shoe_hightop': shoe_hightop,
    'ear_fluff': ear_fluff,
    'cuff_gather': cuff_gather,
    'surface_argyle': surface_argyle,
    'garment_inflate': garment_inflate,
    'hair_tufts': hair_tufts,
    'cloth_folds': cloth_folds,
    'shape_key_bake': shape_key_bake,
    'texture_paint': texture_paint,
    'hair_tousle': hair_tousle,
    'glasses_frame': glasses_frame,
    'hanging_straps': hanging_straps,
    'surface_pattern': surface_pattern,
    'neck_shorten': neck_shorten,
    'ear_scale': ear_scale,
    'pants_shape': pants_shape,
    'cat_tail_tube': cat_tail_tube,
    'material_color': material_color,
    'ear_regions': ear_regions,
    'accessory': accessory,
    'shoe_laces': shoe_laces,
    'jacket_open': jacket_open,
    'hood': hood,
    'recolor_region': recolor_region,
    'texture_vines': texture_vines,
    'side_pocket': side_pocket,
}
