# -*- coding: utf-8 -*-
"""
Blender（bpy）で網を整える道具。網は numpy（glTF の座標：Y 上・+Z 前）で持ち、Blender の操作の時だけ物にする。
  Blender の座標：(x, y, z)_bl = (x, -z, y)_gl（キャラクターは -Y を向く＝Blender の「前」）
使う操作：QuadriFlow（流れのそろった四角形の網に作り直す）・ボクセルの作り直し・平面で切る・細分割・間引き（Decimate）。
"""
import numpy as np

try:
    import bpy
    import bmesh
except ImportError:  # 純粋な部分の試験用
    bpy = None
    bmesh = None


def gl2bl(V):
    V = np.asarray(V, dtype=np.float64)
    return np.stack([V[:, 0], -V[:, 2], V[:, 1]], -1)


def bl2gl(V):
    V = np.asarray(V, dtype=np.float64)
    return np.stack([V[:, 0], V[:, 2], -V[:, 1]], -1)


class Mesh:
    """numpy の網：V (n,3)・F（多角形の list：各要素は頂点の番号の tuple）"""

    def __init__(self, V, F):
        self.V = np.asarray(V, dtype=np.float64)
        self.F = [tuple(int(i) for i in f) for f in F]

    def copy(self):
        return Mesh(self.V.copy(), list(self.F))

    def tris(self):
        T = []
        for f in self.F:
            for i in range(1, len(f) - 1):
                T.append((f[0], f[i], f[i + 1]))
        return np.array(T, dtype=np.int64).reshape(-1, 3)

    def ntris(self):
        return sum(len(f) - 2 for f in self.F)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def to_object(m, name="tmp"):
    me = bpy.data.meshes.new(name)
    me.from_pydata(gl2bl(m.V).tolist(), [], [list(f) for f in m.F])
    me.validate(clean_customdata=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def from_object(ob, apply_modifiers=True):
    if apply_modifiers and len(ob.modifiers):
        dg = bpy.context.evaluated_depsgraph_get()
        ev = ob.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev)
    else:
        me = ob.data
    V = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", V)
    V = bl2gl(V.reshape(-1, 3))
    F = [tuple(p.vertices) for p in me.polygons]
    if me is not ob.data:
        bpy.data.meshes.remove(me)
    return Mesh(V, F)


def remove(ob):
    me = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    if me and me.users == 0:
        bpy.data.meshes.remove(me)


def _activate(ob):
    for o in list(bpy.context.scene.objects):
        if o is not None:
            o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def quadriflow(m, faces, name="qf", smooth_normals=False, seed=0, voxel=None):
    """QuadriFlow で四角形の網へ（閉じた・多様体の網が必要：voxel を渡すと先にボクセルで作り直す。失敗したら元のまま）"""
    if voxel:
        m = voxel_remesh(m, voxel, name + "_vx")
    # QuadriFlow は小さい（m 単位の人の大きさ）網で精度の判定に落ちる → 10 倍にして作り、戻す
    c = m.V.mean(0)
    big = Mesh((m.V - c) * 10.0, m.F)
    ob = to_object(big, name)
    _activate(ob)
    try:
        r = bpy.ops.object.quadriflow_remesh(target_faces=int(faces), use_mesh_symmetry=False, use_preserve_sharp=False,
                                             use_preserve_boundary=False, preserve_attributes=False, smooth_normals=smooth_normals, seed=seed)
        ok = 'FINISHED' in r
    except Exception as e:  # noqa
        print('quadriflow failed', e)
        ok = False
    out = from_object(ob, False)
    out.V = out.V / 10.0 + c
    remove(ob)
    if not ok or len(out.F) < faces * 0.3:
        print('quadriflow: 失敗・元の網を使う', name, len(out.F))
        return m
    return out


def voxel_remesh(m, size, name="vx"):
    ob = to_object(m, name)
    ob.data.remesh_voxel_size = size
    _activate(ob)
    bpy.ops.object.voxel_remesh()
    out = from_object(ob, False)
    remove(ob)
    return out


def symmetrize(m, name="sym"):
    """左右対称に（+X 側を -X 側へ写す：キャラクターの左を右へ）。glTF の +X → Blender の +X"""
    ob = to_object(m, name)
    _activate(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.symmetrize(direction='POSITIVE_X', threshold=1e-4)
    bpy.ops.object.mode_set(mode='OBJECT')
    out = from_object(ob, False)
    remove(ob)
    return out


def bisect(m, co, no, clear_outer=True, clear_inner=False, fill=False):
    """平面（co・no：glTF の座標）で切る。clear_outer：no の側を消す"""
    ob = to_object(m, "bis")
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    co_b = gl2bl(np.array([co]))[0]
    no_b = gl2bl(np.array([no]))[0]
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=co_b, plane_no=no_b, clear_outer=clear_outer, clear_inner=clear_inner)
    if fill:
        edges = [e for e in bm.edges if e.is_boundary]
        if edges:
            bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bm.to_mesh(ob.data)
    bm.free()
    out = from_object(ob, False)
    remove(ob)
    return out


def subdivide(m, levels=1, quality=3, keep_corners=True):
    ob = to_object(m, "sub")
    md = ob.modifiers.new("s", 'SUBSURF')
    md.levels = levels
    md.render_levels = levels
    md.quality = quality
    md.boundary_smooth = 'PRESERVE_CORNERS' if keep_corners else 'ALL'
    md.use_limit_surface = True
    out = from_object(ob, True)
    remove(ob)
    return out


def decimate(m, ratio, symmetry=True, triangulate=False):
    ob = to_object(m, "dec")
    md = ob.modifiers.new("d", 'DECIMATE')
    md.decimate_type = 'COLLAPSE'
    md.ratio = ratio
    md.use_symmetry = symmetry
    md.symmetry_axis = 'X'
    md.use_collapse_triangulate = triangulate
    out = from_object(ob, True)
    remove(ob)
    return out


def solidify(m, thickness, offset=-1.0, rim=True, only_rim=False):
    ob = to_object(m, "sol")
    md = ob.modifiers.new("s", 'SOLIDIFY')
    md.thickness = thickness
    md.offset = offset
    md.use_rim = rim
    md.use_rim_only = only_rim
    md.use_even_offset = True
    out = from_object(ob, True)
    remove(ob)
    return out


def smart_uv(m, angle=66.0, margin=0.004):
    """Smart UV Project（角ごとの UV を返す：F と同じ並びの list of (k,2)）"""
    ob = to_object(m, "uv")
    _activate(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=np.radians(angle), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    me = ob.data
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    out = []
    for p in me.polygons:
        out.append(uv[p.loop_start:p.loop_start + p.loop_total].copy())
    remove(ob)
    return out


def weld(m, dist=1e-5):
    ob = to_object(m, "weld")
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bm.to_mesh(ob.data)
    bm.free()
    out = from_object(ob, False)
    remove(ob)
    return out


# ───────────────────────── 純粋（numpy）の網の道具
def adjacency(m):
    """頂点の隣（list of arrays）"""
    nb = [set() for _ in range(len(m.V))]
    for f in m.F:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            nb[a].add(b)
            nb[b].add(a)
    return [np.array(sorted(s), dtype=np.int64) for s in nb]


def boundary_verts(m):
    from collections import Counter
    c = Counter()
    for f in m.F:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            c[(min(a, b), max(a, b))] += 1
    s = set()
    for (a, b), n in c.items():
        if n == 1:
            s.add(a)
            s.add(b)
    return np.array(sorted(s), dtype=np.int64)


def boundary_loops(m):
    """境界の輪（頂点の番号の list の list）"""
    from collections import Counter, defaultdict
    c = Counter()
    for f in m.F:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            c[(min(a, b), max(a, b))] += 1
    nxt = defaultdict(list)
    for f in m.F:
        k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            if c[(min(a, b), max(a, b))] == 1:
                nxt[b].append(a)   # 面の向きの逆に回る
    loops, seen = [], set()
    for s in list(nxt.keys()):
        if s in seen:
            continue
        loop, v = [], s
        while v not in seen:
            seen.add(v)
            loop.append(v)
            if not nxt[v]:
                break
            v = nxt[v][0]
        loops.append(loop)
    return loops


def smooth(m, iters=2, lam=0.5, mask=None, fn_project=None):
    """ラプラスの平らにする（mask：動かす頂点 bool）。fn_project があれば毎回面へ戻す"""
    nb = adjacency(m)
    V = m.V.copy()
    for _ in range(iters):
        avg = np.array([V[n].mean(0) if len(n) else V[i] for i, n in enumerate(nb)])
        D = (avg - V) * lam
        if mask is not None:
            D[~mask] = 0
        V = V + D
        if fn_project is not None:
            V = fn_project(V)
    out = m.copy()
    out.V = V
    return out


def delete_faces(m, keep_face):
    """keep_face：面ごとの bool。使われない頂点も消す。戻り値：(網, 古い → 新しい頂点の番号)"""
    F = [f for f, k in zip(m.F, keep_face) if k]
    used = np.zeros(len(m.V), bool)
    for f in F:
        used[list(f)] = True
    remap = -np.ones(len(m.V), dtype=np.int64)
    remap[used] = np.arange(used.sum())
    out = Mesh(m.V[used], [tuple(remap[list(f)]) for f in F])
    return out, remap


def face_centers(m):
    return np.array([m.V[list(f)].mean(0) for f in m.F])


def merge(meshes):
    V, F, off = [], [], 0
    for mm in meshes:
        V.append(mm.V)
        F.extend(tuple(i + off for i in f) for f in mm.F)
        off += len(mm.V)
    return Mesh(np.concatenate(V) if V else np.zeros((0, 3)), F)


def signed_volume(m):
    T = m.tris()
    a, b, c = m.V[T[:, 0]], m.V[T[:, 1]], m.V[T[:, 2]]
    return float((a * np.cross(b, c)).sum() / 6.0)


def flip(m):
    return Mesh(m.V, [tuple(reversed(f)) for f in m.F])


def vertex_normals(m):
    T = m.tris()
    a, b, c = m.V[T[:, 0]], m.V[T[:, 1]], m.V[T[:, 2]]
    fn = np.cross(b - a, c - a)
    N = np.zeros_like(m.V)
    for i in range(3):
        np.add.at(N, T[:, i], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1), 1e-12)[:, None]
