# -*- coding: utf-8 -*-
"""
わかば kit：Blender（bpy）で部品を手続きで作るための道具。build_kit.py から使う。
決まり（docs/wakaba-mapkit/07 §4.4・10 §3・11）：
  ・1 単位＝1m・Z 上（glTF には +Y 上で書き出す）・原点＝底の中心（pivot bottom_center）
  ・前＝Blender の −Y（glTF の +Z＝layout のローカル +z＝建物の前・扉の側）
  ・材質の名前＝素材ライブラリの材質の id（mat.wood.cedar など）。ブラウザ版はこの名前で共有の PBR 材質（matgen の WebP）に差し替える
  ・UV＝メートル（1 単位＝1m・材質の tileM で割るのは描画の側）。木は木目（u）を長い向きに
  ・頂点の色（COLOR_0）＝焼き込んだ AO（レイを飛ばして隠れ具合・地面 z=0 も隠すので接地の影になる）
"""
import math
import random

import bmesh
import bpy
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

# matgen の色の平均（sRGB）。Blender の中の見た目と、テクスチャが無い時の色
MAT_COLORS = {
    'mat.ground.forest_floor': (0.33, 0.25, 0.15), 'mat.ground.moss': (0.27, 0.33, 0.12), 'mat.ground.dirt_path': (0.33, 0.26, 0.18),
    'mat.rock.andesite': (0.27, 0.27, 0.26), 'mat.rock.cliff': (0.3, 0.27, 0.22), 'mat.wood.cedar': (0.39, 0.32, 0.26),
    'mat.wood.planks_silver': (0.44, 0.4, 0.36), 'mat.wall.tsuchikabe': (0.57, 0.5, 0.38), 'mat.roof.kawara': (0.24, 0.25, 0.26),
    'mat.roof.kawara_moss': (0.26, 0.31, 0.16), 'mat.metal.tin_rust': (0.41, 0.3, 0.25), 'mat.floor.tatami': (0.45, 0.4, 0.26),
    'mat.paper.shoji': (0.71, 0.66, 0.56), 'mat.paint.shu': (0.6, 0.26, 0.16), 'mat.stone.granite': (0.37, 0.36, 0.35),
    'mat.bark.sugi': (0.27, 0.18, 0.12), 'mat.bark.broadleaf': (0.3, 0.29, 0.26), 'mat.foliage.sugi': (0.23, 0.3, 0.14),
    'mat.foliage.broadleaf': (0.24, 0.31, 0.13), 'mat.foliage.fern': (0.19, 0.29, 0.12), 'mat.foliage.grass': (0.33, 0.35, 0.18),
    'mat.fabric.futon': (0.32, 0.33, 0.38),
}


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def get_material(mid):
    m = bpy.data.materials.get(mid)
    if m:
        return m
    m = bpy.data.materials.new(mid)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    c = MAT_COLORS.get(mid, (0.5, 0.5, 0.5))
    bsdf.inputs['Base Color'].default_value = (srgb_to_lin(c[0]), srgb_to_lin(c[1]), srgb_to_lin(c[2]), 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.scale_length = 1.0


class Builder:
    """1 つの網を bmesh で組む。mat(id) で材質の番号、add_* で形を足す。finish() で物にする"""

    def __init__(self, name, seed=1):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.rnd = random.Random(seed)
        self.uvl = self.bm.loops.layers.uv.new('UVMap')
        self.L_mode = self.bm.faces.layers.int.new('uvmode')    # 0＝箱で貼る・1＝UV を与えた
        self.L_grain = self.bm.faces.layers.int.new('grain')    # 0＝なし・1/2/3＝木目の軸（x/y/z）

    def mat(self, mid):
        if mid not in self.mats:
            self.mats.append(mid)
        return self.mats.index(mid)

    def _tag(self, faces, mi, grain=None, mode='box'):
        gi = -1 if grain is None else max(range(3), key=lambda i: abs(grain[i]))
        for f in faces:
            f.material_index = mi
            f[self.L_grain] = gi + 1
            f[self.L_mode] = 1 if mode == 'given' else 0
        return faces

    def box(self, center, size, mid, rot=None, grain=None, bevel=0.0, taper=None):
        """箱（center＝中心・size＝(x, y, z)）。rot＝Euler（rad）か Matrix。grain＝木目の軸（'x'|'y'|'z' か Vector）。bevel＝角の面取り（m）"""
        mi = self.mat(mid)
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        vs = res['verts']
        M = Matrix.Diagonal((size[0], size[1], size[2], 1.0))
        if taper:
            for v in vs:
                if v.co.z > 0:
                    v.co.x *= taper[0]
                    v.co.y *= taper[1]
        bmesh.ops.transform(self.bm, matrix=M, verts=vs)
        if rot is not None:
            R = rot if isinstance(rot, Matrix) else rot.to_matrix().to_4x4() if hasattr(rot, 'to_matrix') else Matrix()
            bmesh.ops.transform(self.bm, matrix=R, verts=vs)
        bmesh.ops.translate(self.bm, vec=Vector(center), verts=vs)
        faces = list({f for v in vs for f in v.link_faces})
        g = self._grain_vec(grain, rot)
        self._tag(faces, mi, g)
        if bevel > 0:
            edges = list({e for f in faces for e in f.edges})
            bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, affect='EDGES', profile=0.5, material=-1)
        return faces

    def _grain_vec(self, grain, rot=None):
        if grain is None:
            return None
        v = {'x': Vector((1, 0, 0)), 'y': Vector((0, 1, 0)), 'z': Vector((0, 0, 1))}[grain] if isinstance(grain, str) else Vector(grain)
        if rot is not None:
            R = rot if isinstance(rot, Matrix) else rot.to_matrix()
            v = (R.to_3x3() @ v) if isinstance(R, Matrix) else v
        return v.normalized()

    def cyl(self, p0, p1, r0, r1=None, segs=12, mid='mat.wood.cedar', caps=True, uv='cyl', jitter=0.0, twist=0.0):
        """円柱（p0 → p1・半径 r0 → r1）。uv='cyl'＝周りの長さ×高さ（m）"""
        r1 = r0 if r1 is None else r1
        mi = self.mat(mid)
        p0, p1 = Vector(p0), Vector(p1)
        ax = (p1 - p0)
        L = ax.length
        ax.normalize()
        t = ax.orthogonal().normalized()
        b = ax.cross(t)
        rings = []
        for k, (p, r) in enumerate(((p0, r0), (p1, r1))):
            ring = []
            for i in range(segs):
                a = i / segs * math.tau + twist * k
                rr = r * (1 + (self.rnd.random() - 0.5) * jitter)
                ring.append(self.bm.verts.new(p + (t * math.cos(a) + b * math.sin(a)) * rr))
            rings.append(ring)
        faces = []
        for i in range(segs):
            j = (i + 1) % segs
            f = self.bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
            faces.append(f)
        uvl = self.uvl
        for i, f in enumerate(faces):
            for loop in f.loops:
                vi = rings[0].index(loop.vert) if loop.vert in rings[0] else rings[1].index(loop.vert)
                top = loop.vert in rings[1]
                u = vi / segs
                if vi == 0 and i == segs - 1:
                    u = 1.0
                circ = math.tau * (r1 if top else r0)
                loop[uvl].uv = (u * max(circ, 0.05), (L if top else 0.0))
            f.material_index = mi
            f[self.L_mode] = 1
        if caps:
            for ring, rev in ((rings[0], True), (rings[1], False)):
                f = self.bm.faces.new(list(reversed(ring)) if rev else ring)
                self._tag([f], mi)
                faces.append(f)
        return faces

    def tube(self, pts, radii, segs=8, mid='mat.bark.sugi', cap_end=True):
        """曲がった管（枝・幹）：点の列と半径の列。uv＝周り×長さ（m）"""
        mi = self.mat(mid)
        rings = []
        prev_t = None
        acc = [0.0]
        for i in range(1, len(pts)):
            acc.append(acc[-1] + (Vector(pts[i]) - Vector(pts[i - 1])).length)
        for i, (p, r) in enumerate(zip(pts, radii)):
            p = Vector(p)
            d = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
            t = prev_t if prev_t is not None else d.orthogonal().normalized()
            t = (t - d * t.dot(d)).normalized()
            prev_t = t
            b = d.cross(t)
            rings.append([self.bm.verts.new(p + (t * math.cos(a) + b * math.sin(a)) * r) for a in [k / segs * math.tau for k in range(segs)]])
        uvl = self.uvl
        faces = []
        for i in range(len(rings) - 1):
            for k in range(segs):
                k2 = (k + 1) % segs
                f = self.bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
                f.material_index = mi
                f[self.L_mode] = 1
                circ = math.tau * radii[i]
                for loop in f.loops:
                    ri = i if loop.vert in rings[i] else i + 1
                    kk = rings[ri].index(loop.vert)
                    u = kk / segs if not (kk == 0 and k == segs - 1) else 1.0
                    loop[uvl].uv = (u * max(circ, 0.06), acc[ri])
                faces.append(f)
        if cap_end and radii[-1] > 0.01:
            f = self.bm.faces.new(rings[-1])
            self._tag([f], mi)
            faces.append(f)
        return faces

    def card(self, base, up, side, w, h, mid, uv=(0, 0, 1, 1), bend=0.0, segs=1, normal_tilt=None):
        """葉のカード（四角い板・透過のテクスチャ）。base＝付け根の中心・up＝伸びる向き・side＝横の向き。bend＝先の垂れ（m）"""
        mi = self.mat(mid)
        base, up, side = Vector(base), Vector(up).normalized(), Vector(side).normalized()
        nrm = side.cross(up).normalized()
        rows = []
        for s in range(segs + 1):
            t = s / segs
            p = base + up * (h * t) - nrm * (bend * t * t) + Vector((0, 0, -bend * t * t))
            rows.append([self.bm.verts.new(p - side * (w / 2)), self.bm.verts.new(p + side * (w / 2))])
        u0, v0, u1, v1 = uv
        faces = []
        for s in range(segs):
            f = self.bm.faces.new((rows[s][0], rows[s][1], rows[s + 1][1], rows[s + 1][0]))
            f.material_index = mi
            f[self.L_mode] = 1
            ta, tb = s / segs, (s + 1) / segs
            uvs = [(u0, v0 + (v1 - v0) * ta), (u1, v0 + (v1 - v0) * ta), (u1, v0 + (v1 - v0) * tb), (u0, v0 + (v1 - v0) * tb)]
            for loop, uvv in zip(f.loops, uvs):
                loop[self.uvl].uv = uvv
            faces.append(f)
        return faces

    def mesh_from(self, verts, faces, mid, grain=None, uv_given=None):
        mi = self.mat(mid)
        vs = [self.bm.verts.new(Vector(v)) for v in verts]
        out = []
        for fi, f in enumerate(faces):
            ff = self.bm.faces.new([vs[i] for i in f])
            self._tag([ff], mi, self._grain_vec(grain), 'given' if uv_given else 'box')
            if uv_given:
                for loop, i in zip(ff.loops, f):
                    loop[self.uvl].uv = uv_given[i]
            out.append(ff)
        return out

    def finish(self, smooth_angle=35.0, uv=True):
        bm = self.bm
        ng = [f for f in bm.faces if len(f.verts) > 4]
        if ng:
            bmesh.ops.triangulate(bm, faces=ng)       # 接線（tangent）の計算は 3・4 角形だけ
        bm.normal_update()
        if uv:
            box_uv(bm, self.uvl, self.L_mode, self.L_grain)
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        for mid in self.mats:
            me.materials.append(get_material(mid))
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        for p in me.polygons:
            p.use_smooth = True
        try:
            me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        except Exception:
            pass
        return ob


def box_uv(bm, uvl, L_mode, L_grain):
    """面の向きで 3 方向から貼る（m 単位）。木目の向き（grain）が面の中にあれば u をそれに合わせる"""
    for f in bm.faces:
        if f[L_mode] == 1:
            continue
        n = f.normal
        a = max(range(3), key=lambda i: abs(n[i]))
        axes = [i for i in range(3) if i != a]
        gi = f[L_grain] - 1
        if gi >= 0:
            if gi in axes:
                axes = [gi] + [i for i in axes if i != gi]
        else:
            if a != 2:
                axes = [i for i in axes if i != 2] + [2]   # 壁の面：u＝横・v＝上
        for loop in f.loops:
            co = loop.vert.co
            loop[uvl].uv = (co[axes[0]], co[axes[1]])


def displace(ob, strength=0.2, scale=1.0, seed=0, octaves=4, ridged=False, along_normal=True, keep_bottom=True):
    """頂点を法線の向きにノイズでずらす（岩・土の塊）"""
    me = ob.data
    off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
    for v in me.vertices:
        p = v.co * (1.0 / scale) + off
        if ridged:
            d = 1 - abs(noise.noise(p) )
            d = noise.fractal(p, 0.6, 2.2, octaves) * 0.6 + d * 0.4
        else:
            d = noise.fractal(p, 0.55, 2.1, octaves)
        if keep_bottom and v.co.z < 0.02:
            d *= 0.2
        v.co += (v.normal if along_normal else Vector((0, 0, 1))) * d * strength
    me.update()


def bake_ao(ob, rays=20, dist=1.2, ground=True, strength=1.0, seed=3, floor_z=0.0, extra=None):
    """頂点の AO を焼く（COLOR_0）。地面（z=floor_z）も隠す物として数える＝接地の暗さ。extra＝他の物（BVH）も隠す"""
    deps = bpy.context.evaluated_depsgraph_get()
    me = ob.data
    bvh = BVHTree.FromObject(ob, deps)
    rnd = random.Random(seed)
    dirs = []
    for i in range(rays):
        z = rnd.random()
        a = rnd.random() * math.tau
        r = math.sqrt(1 - z * z)
        dirs.append(Vector((math.cos(a) * r, math.sin(a) * r, z)))
    if 'Col' in me.color_attributes:
        me.color_attributes.remove(me.color_attributes['Col'])
    ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for v in me.vertices:
        n = v.normal
        t = n.orthogonal().normalized()
        b = n.cross(t)
        hit = 0.0
        p0 = v.co + n * 0.01
        for d in dirs:
            w = (t * d.x + b * d.y + n * d.z).normalized()
            loc, _, _, dd = bvh.ray_cast(p0, w, dist)
            occ = loc is not None
            if not occ and extra is not None:
                loc2, _, _, _ = extra.ray_cast(p0, w, dist)
                occ = loc2 is not None
            if not occ and ground and w.z < -0.02:
                tg = (floor_z - p0.z) / w.z
                occ = 0 <= tg <= dist
            if occ:
                hit += 1
        ao = 1.0 - strength * hit / rays
        ao = max(0.08, min(1.0, ao)) ** 1.2
        ca.data[v.index].color = (ao, ao, ao, 1.0)
    me.color_attributes.active_color = ca
    return ob


def decimate(ob, ratio, name):
    """LOD：複製して減らす（collapse）"""
    me = ob.data.copy()
    o2 = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o2)
    if ratio < 0.999:
        m = o2.modifiers.new('dec', 'DECIMATE')
        m.ratio = ratio
        m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o2
        for o in bpy.context.selected_objects:
            o.select_set(False)
        o2.select_set(True)
        bpy.ops.object.modifier_apply(modifier='dec')
    return o2


def tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def bounds(objs):
    xs, ys, zs = [], [], []
    for ob in objs:
        for c in ob.bound_box:
            w = ob.matrix_world @ Vector(c)
            xs.append(w.x)
            ys.append(w.y)
            zs.append(w.z)
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def join(objs, name):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def triangulate_ngons(ob):
    """5 角以上の面を三角に（glTF の接線の計算のため）"""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    ng = [f for f in bm.faces if len(f.verts) > 4]
    if ng:
        bmesh.ops.triangulate(bm, faces=ng)
        bm.to_mesh(ob.data)
    bm.free()
