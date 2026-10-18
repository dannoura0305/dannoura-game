# -*- coding: utf-8 -*-
"""
服の網の道具：SDF（体をふくらませた形）→ 表面 → QuadriFlow（流れのそろった四角形）→ 平面で切る・領域で消す → 縁をならす
→ 厚み（内側の面と縁の帯：自前で作るので外・内・縁の区別がわかる）。UV は smart UV を区画（アトラスの四角）へ。
"""
import numpy as np

import sdf as S
import meshops as MO
import paint as PT


class Atlas:
    """テクスチャの区画割り（px）。swatch：単色の小さな四角（UV を中心の 1 点に）"""

    def __init__(self, size):
        self.size = size
        self.rects = {}
        self.sw = {}
        self.sw_area = None
        self.sw_next = 0

    def rect(self, name, x, y, w, h):
        self.rects[name] = (x, y, w, h)

    def swatch_area(self, x, y, w, h, cell=32):
        self.sw_area = (x, y, w, h, cell)

    def swatch(self, name, color):
        if name not in self.sw:
            x, y, w, h, c = self.sw_area
            per = w // c
            i = self.sw_next
            self.sw_next += 1
            cx, cy = x + (i % per) * c, y + (i // per) * c
            if cy + c > y + h:
                raise ValueError('swatch が足りない')
            self.sw[name] = (cx, cy, c, np.asarray(color, float))
        cx, cy, c, _ = self.sw[name]
        return np.array([(cx + c / 2) / self.size, (cy + c / 2) / self.size])

    def paint_swatches(self, img):
        for name, (cx, cy, c, col) in self.sw.items():
            img[cy:cy + c, cx:cx + c] = col
        return img

    def map_uv(self, name, uv01):
        """[0,1]² の UV（Blender の向き：v 上）→ 区画の中の glTF の UV（v 下）"""
        x, y, w, h = self.rects[name]
        m = 4
        u = x + m + uv01[..., 0] * (w - 2 * m)
        v = y + m + (1 - uv01[..., 1]) * (h - 2 * m)
        return np.stack([u / self.size, v / self.size], -1)


def extract(f, lo, hi, h, faces=None, decimate_to=None, voxel=None):
    V, Q = S.surface_nets(f, lo, hi, h)
    V = S.project(f, V)
    m = MO.Mesh(V, Q)
    if faces:
        n0 = len(m.F)
        m2 = MO.quadriflow(m, faces, voxel=voxel)
        if len(m2.F) == n0:          # 失敗：ボクセルで作り直してもう一度 → だめなら間引き
            m2 = MO.quadriflow(m, faces, voxel=h * 0.8, seed=1)
            if len(m2.F) == len(MO.voxel_remesh(m, h * 0.8).F) or len(m2.F) > faces * 3:
                m2 = MO.decimate(m, faces * 2 / (2 * max(n0, 1)), symmetry=True, triangulate=False)
        m = m2
        m.V = S.project(f, m.V)
    elif decimate_to:
        m = MO.decimate(m, decimate_to / (2 * max(len(m.F), 1)), symmetry=True, triangulate=True)
        m.V = S.project(f, m.V, iters=3)
    return m


def cut_plane(m, co, no):
    """no の側を消す（平面できれいに切る）"""
    return MO.bisect(m, co, no, clear_outer=True)


def islands(m):
    """面のつながりの島の番号（面ごと）"""
    parent = list(range(len(m.V)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for f in m.F:
        r0 = find(f[0])
        for v in f[1:]:
            r1 = find(v)
            if r1 != r0:
                parent[r1] = r0
    return np.array([find(f[0]) for f in m.F])


def drop_small_islands(m, frac=0.03):
    if not len(m.F):
        return m
    lab = islands(m)
    u, cnt = np.unique(lab, return_counts=True)
    big = set(u[cnt >= frac * cnt.max()])
    keep = np.array([l in big for l in lab])
    return MO.delete_faces(m, keep)[0]


def cut_region(m, drop_fn, f=None, smooth_iters=10, snap=None):
    """面の中心が drop_fn で True の面を消し、できた縁をならして面へ戻す。snap(P)→P：縁の点を決まった形へ寄せる"""
    C = MO.face_centers(m)
    keep = ~drop_fn(C)
    m, _ = MO.delete_faces(m, keep)
    m = drop_small_islands(m)
    for loop in MO.boundary_loops(m):
        L = np.array(loop)
        if len(L) < 6:
            continue
        for _ in range(smooth_iters):
            P = m.V[L]
            m.V[L] = 0.5 * P + 0.25 * (np.roll(P, 1, 0) + np.roll(P, -1, 0))
        if snap is not None:
            m.V[L] = snap(m.V[L])
        if f is not None:
            m.V[L] = S.project(f, m.V[L], iters=2)
    return m


def relax_boundary(m, f=None, iters=6):
    for loop in MO.boundary_loops(m):
        L = np.array(loop)
        if len(L) < 6:
            continue
        for _ in range(iters):
            P = m.V[L]
            m.V[L] = 0.5 * P + 0.25 * (np.roll(P, 1, 0) + np.roll(P, -1, 0))
        if f is not None:
            m.V[L] = S.project(f, m.V[L], iters=2)
    return m


def thicken(m, N, t, band=None):
    """厚み：外（元の面）・内（法線の逆へ t・向き反転）・縁の帯。band：内の面は縁から band 輪だけ（見えない奥は作らない）。
    戻り値：(網, 面の種類 0 外/1 内/2 縁, 頂点の法線)"""
    n = len(m.V)
    Vi = m.V - N * t
    F = list(m.F)
    kinds = [0] * len(F)
    inner = m.F
    if band:
        nb = MO.adjacency(m)
        dist = np.full(n, 99)
        fr = list(MO.boundary_verts(m))
        dist[fr] = 0
        for k in range(1, band + 1):
            new = []
            for v in fr:
                for u in nb[v]:
                    if dist[u] > k:
                        dist[u] = k
                        new.append(u)
            fr = new
        inner = [f for f in m.F if min(dist[list(f)]) < band]
    F += [tuple(i + n for i in reversed(f)) for f in inner]
    kinds += [1] * len(inner)
    loops = MO.boundary_loops(m)
    for loop in loops:
        k = len(loop)
        for i in range(k):
            a, b = loop[i], loop[(i + 1) % k]
            # boundary_loops は面の向きの逆に回る：外の面の辺は b→a。縁の面は a→b→b'→a'
            F.append((a, b, b + n, a + n))
            kinds.append(2)
    V = np.concatenate([m.V, Vi])
    NN = np.concatenate([N, -N])
    return MO.Mesh(V, F), np.array(kinds), NN


def rim_normals(m, kinds, NN):
    """縁の帯の頂点の法線は外と内の平均（輪郭線が切れないように外の法線のまま）"""
    return NN


def tri_data(m, kinds=None):
    """多角形 → 三角形と、三角形ごとの元の面の番号"""
    T, src = [], []
    for fi, f in enumerate(m.F):
        for i in range(1, len(f) - 1):
            T.append((f[0], f[i], f[i + 1]))
            src.append(fi)
    T = np.array(T, dtype=np.int64)
    src = np.array(src)
    return T, (kinds[src] if kinds is not None else None), src


def uv_islands(m, T, sel_tris):
    """選んだ三角形だけ smart UV（[0,1]²・Blender の向き）。戻り値 (len(sel),3,2)。
    つぶれた三角形（同じ頂点を 2 回）・重なった三角形は Blender が消すので、先に除いて後で近くの UV を入れる"""
    TT = T[sel_tris]
    ok = (TT[:, 0] != TT[:, 1]) & (TT[:, 1] != TT[:, 2]) & (TT[:, 0] != TT[:, 2])
    key = np.sort(TT, axis=1)
    _, first = np.unique(key, axis=0, return_index=True)
    uniq = np.zeros(len(TT), bool)
    uniq[first] = True
    ok &= uniq
    sub = MO.Mesh(m.V, [tuple(t) for t in TT[ok]])
    sub, remap = MO.delete_faces(sub, np.ones(len(sub.F), bool))
    uv = np.array(MO.smart_uv(sub, angle=60, margin=0.008)).reshape(-1, 3, 2)
    if len(uv) != ok.sum():
        raise RuntimeError('smart UV の面の数が合わない %d %d' % (len(uv), ok.sum()))
    out = np.zeros((len(TT), 3, 2))
    out[ok] = uv
    if (~ok).any():
        out[~ok] = uv[0]
    return out
