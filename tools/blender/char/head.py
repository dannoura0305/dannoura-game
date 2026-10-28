# -*- coding: utf-8 -*-
"""
頭と顔（アニメ調）。
  頭の形：正面と横の輪郭の曲線（高さごとの半分の幅・前・後ろ）→ 高さごとの断面を超楕円にした面（輪郭を直接決められる）。
         鼻・耳・目のくぼみ・首・のど仏（男性）は SDF で足す。
  目：顔の肌に目の形の穴（テクスチャの透明）・奥に目玉（球：虹彩を描く・目の骨で視線）・上下のまぶた（球の殻：穴の中だけ見える）。
      まばたき・喜び・怒り・悲しみはまぶたを目玉のまわりに回す（モーフ）。まつ毛はまぶたの縁の帯。
  口：顔の上の小さな板（口の絵）をモーフで開く（あ い う え お・笑い）。眉：顔の上の帯（モーフで上下・傾き）。
座標：glTF（Y 上・+Z 前）。左右対称（左＝+X）。
"""
import numpy as np

import sdf as S
import paint as PT


# ───────────────────────── 輪郭の曲線
def _curve(pts):
    """[(t, v), ...]（t の小さい順）→ なめらかな関数（Catmull-Rom で細かく → 補間）"""
    P = PT.catmull(pts, n=24)
    order = np.argsort(P[:, 0])
    P = P[order]
    return lambda t: np.interp(t, P[:, 0], P[:, 1])


def head_shape(style):
    """頭の輪郭（目の高さ ey からの高さ t）。style：'male'|'female'"""
    if style == 'male':
        width = [(-0.098, 0.0), (-0.094, 0.012), (-0.088, 0.0215), (-0.076, 0.0355), (-0.060, 0.0495), (-0.042, 0.0610), (-0.020, 0.0715), (0.0, 0.0765),
                 (0.03, 0.0795), (0.07, 0.0765), (0.10, 0.063), (0.12, 0.043), (0.132, 0.022), (0.137, 0.0)]
        front = [(-0.098, 0.044), (-0.094, 0.060), (-0.086, 0.0695), (-0.074, 0.0738), (-0.056, 0.0768), (-0.035, 0.0792), (-0.012, 0.0798), (0.006, 0.0815),
                 (0.03, 0.0835), (0.06, 0.080), (0.09, 0.070), (0.115, 0.050), (0.13, 0.025), (0.137, 0.0)]
        back = [(-0.098, 0.030), (-0.088, 0.014), (-0.075, -0.004), (-0.058, -0.035), (-0.04, -0.075), (-0.015, -0.098), (0.02, -0.110), (0.06, -0.110),
                (0.09, -0.098), (0.115, -0.072), (0.13, -0.040), (0.137, 0.0)]
        power_front, power_back = 2.7, 2.15
        ear = dict(c=(0.0745, -0.014, -0.022), r=(0.0082, 0.0205, 0.0132))
        nose = dict(a=(0, 0.002, 0.075), b=(0, -0.020, 0.0875), r=(0.0052, 0.0041))
    else:
        width = [(-0.090, 0.0), (-0.086, 0.012), (-0.080, 0.021), (-0.068, 0.037), (-0.052, 0.052), (-0.034, 0.063), (-0.015, 0.071), (0.0, 0.074),
                 (0.03, 0.077), (0.07, 0.0745), (0.10, 0.061), (0.12, 0.042), (0.130, 0.021), (0.135, 0.0)]
        front = [(-0.090, 0.040), (-0.086, 0.053), (-0.079, 0.062), (-0.066, 0.068), (-0.05, 0.0725), (-0.03, 0.0765), (-0.01, 0.078), (0.006, 0.080),
                 (0.03, 0.082), (0.06, 0.079), (0.09, 0.069), (0.115, 0.049), (0.128, 0.025), (0.135, 0.0)]
        back = [(-0.090, 0.030), (-0.080, 0.012), (-0.068, -0.006), (-0.052, -0.036), (-0.034, -0.074), (-0.012, -0.096), (0.02, -0.106), (0.06, -0.106),
                (0.09, -0.094), (0.115, -0.07), (0.128, -0.04), (0.135, 0.0)]
        power_front, power_back = 2.6, 2.1
        ear = dict(c=(0.0745, -0.010, -0.017), r=(0.0085, 0.022, 0.0145))
        nose = dict(a=(0, 0.001, 0.073), b=(0, -0.018, 0.0838), r=(0.0045, 0.0036))
    lowk = 0.95       # 顔の下半分（目から下）を少し短く

    def sc(pts):
        return [(t * lowk if t < 0 else t, v) for t, v in pts]
    width, front, back = sc(width), sc(front), sc(back)
    return dict(width=_curve(width), front=_curve(front), back=_curve(back), t0=width[0][0], t1=width[-1][0],
                pf=power_front, pb=power_back, ear=ear, nose=nose, style=style)


def skull_sdf(H, ey):
    """輪郭の曲線からの近い距離（中が負）"""
    def f(P):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        t = y - ey
        tc = np.clip(t, H['t0'], H['t1'])
        a = np.maximum(H['width'](tc), 1e-4)
        zf = H['front'](tc)
        zb = H['back'](tc)
        zc = 0.5 * (zf + zb)
        hz = np.maximum(0.5 * (zf - zb), 1e-4)
        front = z > zc
        n = np.where(front, H['pf'], H['pb'])
        r = (np.abs(x / a) ** n + np.abs((z - zc) / hz) ** n) ** (1.0 / n)
        d = (r - 1.0) * np.minimum(a, hz)
        out = np.maximum(H['t0'] - t, t - H['t1'])
        return np.where(out > 0, np.maximum(d, 0) + out, d)
    return f


def head_sdf(B, H):
    """首から上の肌の形。B：体の寸法（骨の位置）・H：head_shape"""
    J = B['joints']
    ey = J['leftEye'][1]
    O = np.array([0, ey, 0.0])
    skull = skull_sdf(H, ey)
    ear = H['ear']
    ec = np.array(ear['c'])
    ears = S.union(S.ellipsoid(O + ec, ear['r']), S.ellipsoid(O + ec * [-1, 1, 1], ear['r']))
    nz = H['nose']
    nose = S.round_cone(O + nz['a'], O + nz['b'], *nz['r'])
    ex = abs(J['leftEye'][0])
    sock = S.union(S.ellipsoid(O + (ex, 0.001, 0.088), (0.020, 0.0125, 0.0085)), S.ellipsoid(O + (-ex, 0.001, 0.088), (0.020, 0.0125, 0.0085)))
    h = S.sub(skull, sock, k=0.012)
    h = S.union(h, nose, k=0.011)
    h = S.union(h, ears, k=0.006)
    nb, nt = J['neck'], J['head']
    neck = S.round_cone(nb - np.array([0, 0.07, -0.002]), nt + np.array([0, 0.01, 0.0]), B['neckR'], B['neckR'] * 0.95)
    h = S.union(h, neck, k=0.022)
    if B['sex'] == 'male':
        adam = S.ellipsoid((0, nb[1] + 0.035, nb[2] + B['neckR'] * 0.98), (0.0075, 0.012, 0.0075))
        h = S.union(h, adam, k=0.008)
    return S.inter(h, S.plane((0, -1, 0), -(nb[1] - 0.075)))


def face_normals(H, ey, P, Ns, B):
    """顔の前の法線を楕円体の法線へ寄せる（トゥーンの影をすっきり：鼻・口のまわりのまだらな影を消す）"""
    c = np.array([0, ey + 0.012, -0.02])
    r = np.array([0.085, 0.115, 0.105])
    ne = (P - c) / (r * r)
    ne /= np.linalg.norm(ne, axis=1, keepdims=True)
    t = P[:, 1] - ey
    fw = S.smoothstep(-0.02, 0.05, P[:, 2]) * S.smoothstep(-0.11, -0.085, t) * (1 - S.smoothstep(0.06, 0.11, t))
    w = 0.85 * fw
    N = Ns * (1 - w[:, None]) + ne * w[:, None]
    return N / np.linalg.norm(N, axis=1, keepdims=True)


# ───────────────────────── 目の形（顔の平面の上：目の中心からの x'（外向きが正）・y'）
def eye_shape(style):
    if style == 'male':
        up = [(-0.0166, -0.0013), (-0.0124, 0.0054), (-0.0051, 0.0094), (0.0034, 0.0100), (0.0102, 0.0082), (0.0150, 0.0043), (0.0178, 0.0007)]
        lo = [(-0.0166, -0.0013), (-0.0119, -0.0063), (-0.0040, -0.0090), (0.0045, -0.0088), (0.0118, -0.0061), (0.0178, 0.0007)]
        lash = (0.0012, 0.0026)       # まつ毛の帯の太さ（内 → 外）
    else:
        up = [(-0.0145, -0.0015), (-0.0105, 0.0058), (-0.004, 0.0097), (0.003, 0.0102), (0.009, 0.0086), (0.0135, 0.0045), (0.0158, 0.0005)]
        lo = [(-0.0145, -0.0015), (-0.0100, -0.0068), (-0.003, -0.0094), (0.004, -0.0092), (0.0105, -0.0064), (0.0158, 0.0005)]
        lash = (0.0010, 0.0021)
    U = PT.catmull(up, n=10)
    L = PT.catmull(lo, n=10)
    fu = lambda x: np.interp(x, U[:, 0], U[:, 1])
    fl = lambda x: np.interp(x, L[:, 0], L[:, 1])
    x0, x1 = up[0][0], up[-1][0]
    return dict(U=fu, L=fl, x0=x0, x1=x1, lash=lash, upts=U, lpts=L)


def _sphere_z(C, r, x, y):
    q = r * r - (x - C[0]) ** 2 - (y - C[1]) ** 2
    return C[2] + np.sqrt(np.maximum(q, 1e-10))


def _rot_x(P, C, ang):
    """点を C を通る x 軸のまわりに回す（ang：配列・頂点ごと）。+ で下へ（前 → 下）"""
    y = P[:, 1] - C[1]
    z = P[:, 2] - C[2]
    c, s = np.cos(ang), np.sin(ang)
    out = P.copy()
    out[:, 1] = C[1] + y * c - z * s
    out[:, 2] = C[2] + y * s + z * c
    return out


def _ang(C, x, y, r):
    """球の上の (x, y) の点の yz の角（前 = 0・上が正）"""
    z = _sphere_z(C, r, x, y) - C[2]
    return np.arctan2(y - C[1], z)


def build_eye(B, side, E, re, hole_depth, skin_f, lod=1.0, iris=None):
    """片方の目：目玉・上まぶた・下まぶたの網と、まぶたのモーフ。戻り値 dict"""
    J = B['joints']
    sgn = 1 if side == 'left' else -1
    C = np.array(J[side + 'Eye'], float)
    ey = C[1]
    rl = re + 0.0009       # まぶたの殻の半径
    rlo = re + 0.0006
    out = {}
    # 目玉（前の半球）
    nr, ns = (18, 32) if lod >= 1 else (10, 20)                      # P18：前の輪を細かく（黒目のくぼみの形が出る）
    th = np.linspace(0, np.radians(78), nr)
    ph = np.linspace(0, 2 * np.pi, ns, endpoint=False)
    V = [C + [0, 0, re]]
    for i in range(1, nr):
        for j in range(ns):
            V.append(C + re * np.array([np.sin(th[i]) * np.cos(ph[j]), np.sin(th[i]) * np.sin(ph[j]), np.cos(th[i])]))
    V = np.array(V)
    T = []
    for j in range(ns):
        T.append((0, 1 + j, 1 + (j + 1) % ns))
    for i in range(1, nr - 1):
        for j in range(ns):
            a, b = 1 + (i - 1) * ns + j, 1 + (i - 1) * ns + (j + 1) % ns
            c2, d = 1 + i * ns + j, 1 + i * ns + (j + 1) % ns
            T += [(a, c2, d), (a, d, b)]
    T = np.array(T)
    N = (V - C) / re
    # P18：黒目（虹彩の楕円）の中を少しくぼませる（横・斜めから見た時に目が板に見えない：奥行きと視差）。法線は球のまま（陰影は前と同じ）
    if iris is not None:
        rx, ry = iris[0] * 1.08, iris[1] * 1.08
        r2 = ((V[:, 0] - C[0]) / rx) ** 2 + ((V[:, 1] - C[1]) / ry) ** 2
        dep = 0.0011 * np.clip(1 - r2, 0, 1) ** 0.75 * (V[:, 2] > C[2])
        V = V - (V - C) / re * dep[:, None]
    # UV：前から平らに写す（左右で同じ：光の点の位置をそろえる）
    span = 0.034
    uv = np.stack([0.5 + (V[:, 0] - C[0]) / span * 1.0, 0.5 - (V[:, 1] - C[1]) / span], -1)
    out['eyeball'] = dict(V=V, T=T, N=N, uv=uv, C=C)
    # まぶた：縁の曲線（顔の平面）を球の殻へ。行 0＝縁・行 1＝まつ毛の帯の内側の端・その先は肌
    xs = np.linspace(E['x0'] - 0.0012, E['x1'] + 0.0012, 18)
    t_lash = np.interp(xs, [E['x0'], E['x1']], E['lash'])

    def X(xp):
        return C[0] + sgn * xp

    U = E['U'](np.clip(xs, E['x0'], E['x1']))
    L = E['L'](np.clip(xs, E['x0'], E['x1']))
    # 上まぶた：休みの縁は U − まつ毛の太さ。行の上へ伸ばす（閉じても穴の上を覆える高さ）
    rows_u = [0.0, 1.0, 1.8, 3.0, 5.0, 8.0, 12.0]     # まつ毛の帯の太さの倍
    Vu, uvu, rid = [], [], []
    edge_u = U - t_lash
    for k, rr in enumerate(rows_u):
        yy = ey + edge_u + t_lash * rr + (0.0 if k < 6 else 0.006)
        if k >= 3:
            yy = ey + U + (rr - 1.0) * 0.0026
        x = X(xs)
        z = _sphere_z(C, rl, x, yy)
        Vu.append(np.stack([x, yy, z], -1))
        uvu.append(np.stack([(xs - E['x0']) / (E['x1'] - E['x0']), np.full_like(xs, k / (len(rows_u) - 1))], -1))
    Vu = np.concatenate(Vu)
    uvu = np.concatenate(uvu)
    n = len(xs)
    Tu = []
    for k in range(len(rows_u) - 1):
        for i in range(n - 1):
            a, b, c2, d = k * n + i, k * n + i + 1, (k + 1) * n + i, (k + 1) * n + i + 1
            Tu += [(a, b, d), (a, d, c2)] if sgn > 0 else [(a, d, b), (a, c2, d)]
    Tu = np.array(Tu)
    # 下まぶた：縁は L + 細い帯
    t_low = 0.00055
    rows_l = [0.0, 1.0, 3.0, 7.0, 14.0]
    Vl, uvl = [], []
    for k, rr in enumerate(rows_l):
        yy = ey + L + t_low - t_low * rr
        x = X(xs)
        z = _sphere_z(C, rlo, x, yy)
        Vl.append(np.stack([x, yy, z], -1))
        uvl.append(np.stack([(xs - E['x0']) / (E['x1'] - E['x0']), np.full_like(xs, k / (len(rows_l) - 1))], -1))
    Vl = np.concatenate(Vl)
    uvl = np.concatenate(uvl)
    Tl = []
    for k in range(len(rows_l) - 1):
        for i in range(n - 1):
            a, b, c2, d = k * n + i, k * n + i + 1, (k + 1) * n + i, (k + 1) * n + i + 1
            Tl += [(a, d, b), (a, c2, d)] if sgn > 0 else [(a, b, d), (a, d, c2)]
    Tl = np.array(Tl)
    xcol_u = np.tile(xs, len(rows_u))
    xcol_l = np.tile(xs, len(rows_l))

    # まぶたの動き：縁が目標の曲線（顔の平面の y'）に来る角だけ、列ごとに回す
    def lid_morph(Vrest, xcol, edge_rest, target, r):
        a0 = _ang(C, X(xs), ey + edge_rest, r)
        a1 = _ang(C, X(xs), ey + target, r)
        dang = np.interp(xcol, xs, a0 - a1)          # 正で下へ
        return _rot_x(Vrest, C, dang) - Vrest

    lineLU = lambda x: np.interp(x, [E['x0'], E['x1']], [E['U'](E['x0']), E['U'](E['x1'])])
    closed = L + t_lash * 0.9
    happy_line = U * 0.32 + lineLU(xs) * 0.68 - 0.0012
    w = (xs - E['x0']) / (E['x1'] - E['x0'])          # 0＝内 → 1＝外
    morphs_u = {
        'close': lid_morph(Vu, xcol_u, edge_u, closed, rl),
        'happy': lid_morph(Vu, xcol_u, edge_u, happy_line + t_lash * 0.5, rl),
        'angry': lid_morph(Vu, xcol_u, edge_u, edge_u - (U - L) * (0.42 * (1 - w) + 0.12 * w), rl),
        'sad': lid_morph(Vu, xcol_u, edge_u, edge_u - (U - L) * (0.10 * (1 - w) + 0.40 * w), rl),
        'relaxed': lid_morph(Vu, xcol_u, edge_u, edge_u - (U - L) * 0.42, rl),
        'surprised': lid_morph(Vu, xcol_u, edge_u, edge_u + t_lash * 0.9, rl),
    }
    morphs_l = {
        'happy': lid_morph(Vl, xcol_l, L + t_low, happy_line - 0.0002, rlo),
        'angry': lid_morph(Vl, xcol_l, L + t_low, L + t_low + (U - L) * 0.16, rlo),
        'relaxed': lid_morph(Vl, xcol_l, L + t_low, L + t_low + (U - L) * 0.08, rlo),
        'sad': lid_morph(Vl, xcol_l, L + t_low, L + t_low + (U - L) * 0.05, rlo),
        'close': lid_morph(Vl, xcol_l, L + t_low, L + t_low + 0.0004, rlo),
    }
    out['lidU'] = dict(V=Vu, T=Tu, uv=uvu, morphs=morphs_u)
    out['lidL'] = dict(V=Vl, T=Tl, uv=uvl, morphs=morphs_l)
    out['C'] = C
    return out


def face_plane_uv(P, ey, box):
    """顔の前の平らな写し（テクスチャの左の正方形）"""
    x0, x1, y0, y1 = box
    return np.stack([(P[:, 0] - x0) / (x1 - x0), (y1 - P[:, 1]) / (y1 - y0)], -1)


def project_to(f, P, dirn=(0, 0, 1), iters=8):
    """点を向き dirn に沿って面へ（顔の上の板・眉など）"""
    d = np.asarray(dirn, float)
    P = P.copy()
    for _ in range(iters):
        v = f(P)
        P -= v[:, None] * d[None, :]
    return P


def strip_on_face(f, ey, pts2d, thick, nu=14, nv=3, lift=0.0004, sgn=1):
    """顔の平面の点の列（x, y'）に沿う帯を顔の上へ。thick：太さ（配列か数・中心から上下）"""
    C = PT.catmull(pts2d, n=6)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))])
    su = np.linspace(0, s[-1], nu)
    cx = np.interp(su, s, C[:, 0])
    cy = np.interp(su, s, C[:, 1])
    tx = np.gradient(cx)
    ty = np.gradient(cy)
    L = np.hypot(tx, ty)
    nx, ny = -ty / L, tx / L
    th = np.broadcast_to(np.asarray(thick, float), su.shape) if np.ndim(thick) == 0 else np.interp(su / su[-1], np.linspace(0, 1, len(thick)), thick)
    V, uv = [], []
    for j, tv in enumerate(np.linspace(-1, 1, nv)):
        x = cx + nx * th * 0.5 * tv
        y = cy + ny * th * 0.5 * tv
        V.append(np.stack([x, ey + y, np.full_like(x, 0.12)], -1))
        uv.append(np.stack([su / su[-1], np.full_like(su, j / (nv - 1))], -1))
    V = np.concatenate(V)
    uv = np.concatenate(uv)
    V = project_to(f, V)
    V[:, 2] += lift
    T = []
    for j in range(nv - 1):
        for i in range(nu - 1):
            a, b, c2, d = j * nu + i, j * nu + i + 1, (j + 1) * nu + i, (j + 1) * nu + i + 1
            T += [(a, b, d), (a, d, c2)] if sgn > 0 else [(a, d, b), (a, c2, d)]
    return V, np.array(T), uv
