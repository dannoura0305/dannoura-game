# -*- coding: utf-8 -*-
"""
符号つき距離（SDF）の小さな道具（numpy だけ・Blender に同梱の numpy で動く）。
キャラクターの体・顔・服の形を「なめらかにつないだ基本の形」で書き、表面を取り出す（surface nets）。
座標は glTF／VRM と同じ：Y が上・+Z が前・X がキャラクターの左・単位 m。

形は関数 f(P) → 距離（P は (N,3)）。中が負。
"""
import numpy as np


def _len(v):
    return np.sqrt(np.maximum((v * v).sum(-1), 0.0))


def _a(x):
    return np.asarray(x, dtype=np.float64)


# ───────────────────────── 基本の形
def sphere(c, r):
    c = _a(c)
    return lambda P: _len(P - c) - r


def ellipsoid(c, r):
    """楕円体（iq の近い距離）。r=(rx,ry,rz)"""
    c, r = _a(c), _a(r)

    def f(P):
        q = (P - c) / r
        k0 = _len(q)
        k1 = _len(q / r)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
    return f


def round_cone(a, b, r1, r2):
    """2 点 a・b を半径 r1・r2 でつなぐ丸い円すい（カプセルの太さ違い）。iq の sdRoundCone"""
    a, b = _a(a), _a(b)
    ba = b - a
    l2 = float(ba @ ba)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2

    def f(P):
        pa = P - a
        y = pa @ ba
        z = y - l2
        xv = pa * l2 - np.outer(y, ba)
        x2 = (xv * xv).sum(-1)
        y2 = y * y * l2
        z2 = z * z * l2
        k = np.sign(rr) * rr * rr * x2
        d = np.empty(len(P))
        m1 = np.sign(z) * a2 * z2 > k
        m2 = np.sign(y) * a2 * y2 < k
        d[:] = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
        d[m1] = np.sqrt(np.maximum(x2[m1] + z2[m1], 0)) * il2 - r2
        mm = m2 & ~m1
        d[mm] = np.sqrt(np.maximum(x2[mm] + y2[mm], 0)) * il2 - r1
        return d
    return f


def capsule(a, b, r):
    return round_cone(a, b, r, r)


def ell_capsule(a, b, ra, rb, squash=(1.0, 1.0), up=(0, 1, 0)):
    """断面が楕円の丸い円すい：軸に垂直な 2 方向を squash で伸び縮み（腕・脚・指の平たさ）。
    squash=(s1,s2)：軸と up から作る横方向 e1・縦方向 e2 の倍率（>1 で太く）。距離は近い値"""
    a, b = _a(a), _a(b)
    ax = b - a
    L = np.linalg.norm(ax)
    ax = ax / L
    u = _a(up)
    e1 = np.cross(ax, u)
    if np.linalg.norm(e1) < 1e-6:
        e1 = np.cross(ax, _a((1, 0, 0)))
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(e1, ax)
    s1, s2 = squash
    base = round_cone(np.zeros(3), np.array([0.0, L, 0.0]), ra, rb)
    ms = min(s1, s2)

    def f(P):
        q = P - a
        loc = np.stack([(q @ e1) / s1, q @ ax, (q @ e2) / s2], -1)
        return base(loc) * ms
    return f


def box(c, half, r=0.0, rot=None):
    """丸い角の箱。rot：3x3（局所 → 世界）"""
    c, half = _a(c), _a(half)
    R = None if rot is None else _a(rot)

    def f(P):
        q = P - c
        if R is not None:
            q = q @ R
        d = np.abs(q) - (half - r)
        return _len(np.maximum(d, 0)) + np.minimum(d.max(-1), 0) - r
    return f


def plane(n, d0):
    """n・p = d0 の平面（n の向きが外）"""
    n = _a(n) / np.linalg.norm(n)
    return lambda P: P @ n - d0


def torus(c, R, r, axis=(0, 1, 0)):
    c = _a(c)
    ax = _a(axis) / np.linalg.norm(axis)

    def f(P):
        q = P - c
        h = q @ ax
        rad = _len(q - np.outer(h, ax))
        return np.sqrt((rad - R) ** 2 + h * h) - r
    return f


# ───────────────────────── つなぎ方
def smin(k):
    def op(a, b):
        if k <= 0:
            return np.minimum(a, b)
        h = np.maximum(k - np.abs(a - b), 0.0) / k
        return np.minimum(a, b) - h * h * k * 0.25
    return op


def union(*fs, k=0.0):
    op = smin(k)

    def f(P):
        d = fs[0](P)
        for g in fs[1:]:
            d = op(d, g(P))
        return d
    return f


def sub(a, b, k=0.0):
    """a から b を引く（なめらか）"""
    def f(P):
        da, db = a(P), -b(P)
        if k <= 0:
            return np.maximum(da, db)
        h = np.maximum(k - np.abs(da - db), 0.0) / k
        return np.maximum(da, db) + h * h * k * 0.25
    return f


def inter(a, b, k=0.0):
    def f(P):
        da, db = a(P), b(P)
        if k <= 0:
            return np.maximum(da, db)
        h = np.maximum(k - np.abs(da - db), 0.0) / k
        return np.maximum(da, db) + h * h * k * 0.25
    return f


def offset(f, d):
    """膨らませる（d>0 で外へ）。d は数か関数 d(P)"""
    if callable(d):
        return lambda P: f(P) - d(P)
    return lambda P: f(P) - d


def warp(f, fn):
    """空間をゆがめてから測る：fn(P)→P'（小さなゆがみだけ。距離は近い値）"""
    return lambda P: f(fn(P))


def mirror_x(f):
    """左右対称にする（x の絶対値）"""
    def g(P):
        Q = P.copy()
        Q[:, 0] = np.abs(Q[:, 0])
        return f(Q)
    return g


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ───────────────────────── 表面の取り出し（naive surface nets：四角形の網）
def surface_nets(f, lo, hi, h, chunk=400000):
    """箱 lo..hi を間隔 h の格子で測り、0 の面を四角形の網で返す：(V (n,3), Q (m,4))。向きは外向き（右手系）"""
    lo, hi = _a(lo), _a(hi)
    n = np.ceil((hi - lo) / h).astype(int) + 1
    xs = [lo[i] + np.arange(n[i]) * h for i in range(3)]
    G = np.stack(np.meshgrid(*xs, indexing='ij'), -1).reshape(-1, 3)
    D = np.empty(len(G))
    for s in range(0, len(G), chunk):
        D[s:s + chunk] = f(G[s:s + chunk])
    D = D.reshape(n)
    D[D == 0] = 1e-9
    G = G.reshape(tuple(n) + (3,))
    S = D < 0
    cell_sum = np.zeros(tuple(n - 1) + (3,))
    cell_cnt = np.zeros(tuple(n - 1))

    def edge(axis):
        sl0 = [slice(None)] * 3
        sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1)
        sl1[axis] = slice(1, None)
        d0, d1 = D[tuple(sl0)], D[tuple(sl1)]
        cross = (d0 < 0) != (d1 < 0)
        t = np.where(cross, d0 / np.where(cross, d0 - d1, 1), 0)
        p = G[tuple(sl0)] + (G[tuple(sl1)] - G[tuple(sl0)]) * t[..., None]
        return cross, p, d0 < 0

    E = [edge(ax) for ax in range(3)]
    for ax in range(3):
        cross, p, _ = E[ax]
        others = [a for a in range(3) if a != ax]
        for o1 in (0, 1):
            for o2 in (0, 1):
                sl = [slice(None)] * 3
                for oa, oo in zip(others, (o1, o2)):
                    sl[oa] = slice(oo, n[oa] - 1 + oo)
                c = cross[tuple(sl)]
                cell_sum += np.where(c[..., None], p[tuple(sl)], 0)
                cell_cnt += c
    has = cell_cnt > 0
    idx = -np.ones(tuple(n - 1), dtype=np.int64)
    idx[has] = np.arange(has.sum())
    V = cell_sum[has] / cell_cnt[has][:, None]
    quads = []
    for ax in range(3):
        cross, _, inside0 = E[ax]
        a1, a2 = [(1, 2), (2, 0), (0, 1)][ax]
        # 面になる辺：他の 2 軸の位置が 1..n-2
        sl = [slice(None)] * 3
        sl[a1] = slice(1, n[a1] - 1)
        sl[a2] = slice(1, n[a2] - 1)
        sl[ax] = slice(0, n[ax] - 1)
        c = cross[tuple(sl)]
        ins = inside0[tuple(sl)]
        ii = np.argwhere(c)
        if not len(ii):
            continue
        ii[:, a1] += 1
        ii[:, a2] += 1
        flip = ins[c]

        def cell(d1, d2):
            q = ii.copy()
            q[:, a1] += d1
            q[:, a2] += d2
            return idx[q[:, 0], q[:, 1], q[:, 2]]
        quad = np.stack([cell(-1, -1), cell(0, -1), cell(0, 0), cell(-1, 0)], -1)
        quad[~flip] = quad[~flip][:, ::-1]
        quads.append(quad)
    Q = np.concatenate(quads) if quads else np.zeros((0, 4), int)
    Q = Q[(Q >= 0).all(1)]
    return V, Q


def grad(f, P, eps=1e-4):
    g = np.empty_like(P)
    for i in range(3):
        d = np.zeros(3)
        d[i] = eps
        g[:, i] = (f(P + d) - f(P - d)) / (2 * eps)
    return g


def project(f, P, iters=4, eps=1e-4, maxstep=0.01):
    """点を 0 の面へ寄せる（ニュートン法）"""
    P = P.copy()
    for _ in range(iters):
        d = f(P)
        g = grad(f, P, eps)
        gg = np.maximum((g * g).sum(-1), 1e-12)
        step = (d / gg)[:, None] * g
        L = _len(step)
        k = np.minimum(1.0, maxstep / np.maximum(L, 1e-12))
        P -= step * k[:, None]
    return P


def normals(f, P, eps=2e-4):
    g = grad(f, P, eps)
    return g / np.maximum(_len(g), 1e-12)[:, None]
