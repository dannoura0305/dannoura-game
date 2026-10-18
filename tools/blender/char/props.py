# -*- coding: utf-8 -*-
"""
小物：小さなピンクのシルクハット（リボン）・黒い四角いめがね・ピンクの花の髪飾り・髪のゴム・猫の顔のリュック（肩ひも）・フードのひも。
白い姿：猫の耳・しっぽ・爪・毛皮のえり。相棒：斜めがけの鞄。
アトラス（ACC・1024）：単色の swatch＋絵の区画（猫の顔・リュックの横など）。
"""
import numpy as np

import sdf as S
import meshops as MO
import paint as PT
import garment as G
import hair as HR
import rig as R

SS = S.smoothstep


def _n(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


class Acc:
    def __init__(self, size=1024):
        self.A = G.Atlas(size)
        self.A.rect('cat', 0, 0, 512, 512)
        self.A.rect('bag', 512, 0, 512, 256)
        self.A.rect('hat', 512, 256, 256, 256)
        self.A.rect('flower', 768, 256, 256, 256)
        self.A.swatch_area(0, 512, 1024, 512, cell=32)
        self.cells = {}
        self.parts = []

    def solid_uv(self, name, color, n):
        return np.tile(self.A.swatch(name, PT.hexc(color) if isinstance(color, str) else color), (n, 1))

    def fn_uv(self, cell, a, b, ra, rb):
        """(a, b) の値の範囲 ra・rb を区画へ写す（色は fn_paint で a・b の関数として塗る）"""
        x, y, w, h = self.A.rects[cell]
        u = (np.clip((a - ra[0]) / (ra[1] - ra[0]), 0, 1) * (w - 8) + x + 4) / self.A.size
        v = (np.clip((b - rb[0]) / (rb[1] - rb[0]), 0, 1) * (h - 8) + y + 4) / self.A.size
        return np.stack([u, v], -1)

    def fn_paint(self, cell, ra, rb, fn):
        x, y, w, h = self.A.rects[cell]
        u, v = PT.grid01(w - 8, h - 8)
        a = ra[0] + u * (ra[1] - ra[0])
        b = rb[0] + v * (rb[1] - rb[0])
        img = np.zeros((h, w, 4))
        img[4:h - 4, 4:w - 4] = fn(a, b)
        img[:4] = img[4:5]; img[h - 4:] = img[h - 5:h - 4]; img[:, :4] = img[:, 4:5]; img[:, w - 4:] = img[:, w - 5:w - 4]
        self.cells[cell] = img

    def render(self, cat=None, bag=None):
        size = self.A.size
        img = np.zeros((size, size, 4))
        img[:] = PT.hexc('#1c1822')
        for cell, ci in self.cells.items():
            x, y, w, h = self.A.rects[cell]
            img[y:y + h, x:x + w] = ci
        if cat is not None:
            x, y, w, h = self.A.rects['cat']
            img[y:y + h, x:x + w] = cat
        if bag is not None:
            x, y, w, h = self.A.rects['bag']
            img[y:y + h, x:x + w] = bag
        img = self.A.paint_swatches(img)
        shade = img.copy()
        shade[..., :3] *= np.array([0.70, 0.64, 0.88])
        return img, PT.downsample(shade, 2)


def lathe(profile, seg=32, sx=1.0, sz=1.0, curl=0.0):
    """回転体（y 軸）：profile [(r, y)]（下 → 上）。戻り値 (V, T, ring_y)"""
    pr = np.asarray(profile, float)
    a = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V = []
    for r, y in pr:
        for t in a:
            x, z = r * np.sin(t) * sx, r * np.cos(t) * sz
            V.append((x, y + curl * (x / 0.08) ** 2 * (r > 0.05), z))
    V = np.array(V)
    T = []
    n = len(pr)
    for i in range(n - 1):
        for j in range(seg):
            a0, b0 = i * seg + j, i * seg + (j + 1) % seg
            a1, b1 = (i + 1) * seg + j, (i + 1) * seg + (j + 1) % seg
            T += [(a0, b0, b1), (a0, b1, a1)]
    T = np.array(T)
    return V, T, np.repeat(np.arange(n), seg)


def rot_mat(ax, ay, az):
    cx, sx, cy, sy, cz, sz = np.cos(ax), np.sin(ax), np.cos(ay), np.sin(ay), np.cos(az), np.sin(az)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def tube(path, r, seg=8, up=None, flat=1.0, close_ends=True):
    """道に沿う管（断面は楕円：flat で上下をつぶす）"""
    P = np.asarray(path, float)
    n = len(P)
    t = _n(np.gradient(P, axis=0))
    upv = np.tile([0, 1.0, 0], (n, 1)) if up is None else _n(np.asarray(up, float) if np.ndim(up) == 2 else np.tile(up, (n, 1)))
    e1 = _n(np.cross(t, upv))
    e2 = np.cross(e1, t)
    rr = np.broadcast_to(np.asarray(r, float), (n,)) if np.ndim(r) == 0 else np.asarray(r, float)
    a = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V, N = [], []
    for i in range(n):
        for th in a:
            d = e1[i] * np.cos(th) + e2[i] * np.sin(th) * flat
            V.append(P[i] + d * rr[i])
            N.append(_n(e1[i] * np.cos(th) + e2[i] * np.sin(th) / max(flat, 1e-3)))
    T = []
    for i in range(n - 1):
        for j in range(seg):
            a0, b0 = i * seg + j, i * seg + (j + 1) % seg
            a1, b1 = (i + 1) * seg + j, (i + 1) * seg + (j + 1) % seg
            T += [(a0, a1, b1), (a0, b1, b0)]
    if close_ends:
        for end, sgn in ((0, -1), (n - 1, 1)):
            c = len(V)
            V.append(P[end])
            N.append(t[end] * sgn)
            for j in range(seg):
                a0, b0 = end * seg + j, end * seg + (j + 1) % seg
                T.append((c, b0, a0) if sgn < 0 else (c, a0, b0))
    return np.array(V), np.array(T), np.array(N)


def sdf_part(f, lo, hi, h, tris):
    m = G.extract(f, lo, hi, h, decimate_to=tris)
    return m.V, m.tris(), S.normals(f, m.V)


def rounded_rect(cx, cy, w, h, r, n=10):
    pts = []
    for (qx, qy, a0) in ((cx + w / 2 - r, cy + h / 2 - r, 0), (cx - w / 2 + r, cy + h / 2 - r, 90), (cx - w / 2 + r, cy - h / 2 + r, 180), (cx + w / 2 - r, cy - h / 2 + r, 270)):
        for t in np.linspace(a0, a0 + 90, n, endpoint=False):
            pts.append((qx + r * np.cos(np.radians(t)), qy + r * np.sin(np.radians(t))))
    return np.array(pts)


# ───────────────────────── だんのうらの小物
def props_dannoura(B, Sk, C, F, lod=1.0, hair_tie=None, hat=True, glasses=True, flower=True, flower_at=(80, 26), AC=None):
    AC = AC or Acc()
    parts = []
    J = B['joints']
    H = F['H']
    ey = J['leftEye'][1]
    Hc = np.array([0, ey + 0.032, -0.014])
    skull = F['skull'] if 'skull' in F else None
    import head as HD
    sk = HD.skull_sdf(H, ey)
    fskin = F['sdf']
    q = lod
    if hat:
        # ── シルクハット（小さなピンク・右へ傾ける）：SDF（丸い縁）で作る
        Rm = rot_mat(-0.16, 0.25, 0.28)
        base = HR.on_scalp(sk, Hc, HR.sph(Hc, -30, 64), 0.0)
        org = base + _n(base - Hc) * 0.0025

        def to_local(P):
            return (P - org) @ Rm

        def brim_warp(P):
            Q = P.copy()
            Q[:, 1] -= 0.006 * (Q[:, 0] / 0.056) ** 2
            return Q
        crown = S.union(S.cylinder((0, 0.030, 0), 0.0305, 0.0245, rr=0.0025), S.cylinder((0, 0.051, 0), 0.0322, 0.004, rr=0.0025), k=0.004)
        brim = S.warp(S.cylinder((0, 0.0035, 0), 0.057, 0.0028, rr=0.0026), brim_warp)
        brim = S.warp(brim, lambda P: P * np.array([1.0, 1.0, 1.0 / 0.92]))
        hatf_l = S.union(crown, brim, k=0.004)
        hatf = lambda P: hatf_l(to_local(P))
        lo = org - 0.08
        hi = org + 0.09
        Vh, Th, Nh = sdf_part(hatf, lo, hi, 0.0011, 1100 * q)
        L = to_local(Vh)
        rl = np.hypot(L[:, 0], L[:, 2])
        uv = AC.fn_uv('hat', rl, L[:, 1], (0, 0.062), (-0.004, 0.06))

        def hat_paint(r, y):
            c = np.zeros(r.shape + (4,))
            c[:] = PT.hexc('#f08cb8')
            band = (y > 0.0072) & (y < 0.0178) & (r < 0.0336)
            c[band] = PT.hexc('#b84a86')
            c[(y > 0.0538) & (r < 0.03)] = PT.hexc('#f6a6ca')
            c[(y < 0.0026) & (r > 0.031)] = PT.hexc('#d46c9e')
            c[(y > 0.0178) & (y < 0.0195) & (r < 0.0336)] = PT.hexc('#e07aaa')
            return c
        AC.fn_paint('hat', (0, 0.062), (-0.004, 0.06), hat_paint)
        parts.append(dict(name='hat', V=Vh, T=Th, N=Nh, UV=uv, mat='ACC', weights=('bone', 'head')))
        # リボンの結び（帽子の左の横）
        bc = np.array([0.031, 0.0125, 0.0])
        loops = S.union(S.ellipsoid(bc + [0.003, 0.003, 0.009], (0.0032, 0.0058, 0.0092)), S.ellipsoid(bc + [0.003, 0.003, -0.009], (0.0032, 0.0058, 0.0092)),
                        S.sphere(bc + [0.0035, 0.003, 0.0], 0.0038), k=0.002)
        Vb, Tb, Nb = sdf_part(lambda P: loops(to_local(P)), org - 0.06, org + 0.06, 0.0007, 300 * q)
        parts.append(dict(name='hat_bow', V=Vb, T=Tb, N=Nb, UV=AC.solid_uv('hat_band', '#b84a86', len(Vb)), mat='ACC', weights=('bone', 'head')))
    if glasses:
        # ── めがね（黒・四角）
        zf = HD.project_to(fskin, np.array([[0.034, ey, 0.12]]))[0][2]
        fr = []
        for sg in (1, -1):
            rr = rounded_rect(0, 0, 0.046, 0.029, 0.006, n=6)
            P = np.stack([rr[:, 0], rr[:, 1], np.zeros(len(rr))], -1)
            P = P @ rot_mat(0, sg * 0.16, 0).T + [sg * 0.0355, ey - 0.0045, zf + 0.016]
            P = np.concatenate([P, P[:1]])
            V1, T1, N1 = tube(P, 0.0019, seg=6, up=(0, 0, 1.0), flat=0.7, close_ends=False)
            fr.append((V1, T1, N1))
            # つる（耳へ）
            ox = sg * (0.0355 + 0.023 * np.cos(0.16))
            tp = np.array([[ox, ey + 0.001, zf + 0.016 - sg * 0.023 * np.sin(0.16) * sg], [sg * 0.074, ey + 0.004, zf - 0.03], [sg * 0.080, ey + 0.002, -0.01], [sg * 0.079, ey - 0.012, -0.03]])
            tp = PT.catmull(tp, n=5)
            fr.append(tube(tp, 0.0014, seg=5, up=(1.0 * sg, 0, 0), flat=0.6))
        bp = PT.catmull(np.array([[0.0125, ey + 0.0, zf + 0.0185], [0, ey + 0.0025, zf + 0.0205], [-0.0125, ey + 0.0, zf + 0.0185]]), n=4)
        fr.append(tube(bp, 0.0015, seg=5, up=(0, 0, 1.0), flat=0.7))
        off = 0
        VV, TT, NN = [], [], []
        for V1, T1, N1 in fr:
            VV.append(V1)
            TT.append(T1 + off)
            NN.append(N1)
            off += len(V1)
        Vg = np.concatenate(VV)
        parts.append(dict(name='glasses', V=Vg, T=np.concatenate(TT), N=np.concatenate(NN), UV=AC.solid_uv('glasses', '#1f1a28', len(Vg)), mat='ACC', weights=('bone', 'head')))
    if flower:
        # ── 花の髪飾り（左の耳の上）
        fc = HR.on_scalp(sk, Hc, HR.sph(Hc, *flower_at), 0.0)
        ax = _n(fc - Hc)
        fc = fc + ax * 0.012
        e1 = _n(np.cross(ax, [0, 1, 0]))
        e2 = np.cross(ax, e1)
        petals = []
        for i in range(5):
            a = 2 * np.pi * i / 5 + 0.3
            d = e1 * np.cos(a) + e2 * np.sin(a)
            petals.append(S.ellipsoid(fc + d * 0.0118 + ax * 0.001, (0.0088, 0.0088, 0.0088)))
        # 花びらは平たい：ax の向きにつぶす → 回した楕円の代わりに、平面で挟む
        flower = S.inter(S.union(*petals, k=0.0005), S.inter(S.plane(ax, ax @ fc + 0.0032), S.plane(-ax, -(ax @ fc) + 0.0022)), k=0.0015)
        center = S.sphere(fc + ax * 0.003, 0.0052)
        lo, hi = fc - 0.03, fc + 0.03
        Vf, Tf, Nf = sdf_part(S.union(flower, center), lo, hi, 0.0006, 520 * q)
        dc = np.linalg.norm((Vf - fc) - np.outer((Vf - fc) @ ax, ax), axis=1)
        hf = (Vf - fc) @ ax
        uvf = AC.fn_uv('flower', dc, hf, (0, 0.022), (-0.004, 0.009))

        def fl_paint(r, h):
            c = np.zeros(r.shape + (4,))
            c[:] = PT.mix(PT.hexc('#ee86b6'), PT.hexc('#fbc4dc'), S.smoothstep(0.006, 0.019, r))
            c[r < 0.0058] = PT.hexc('#ffef9e')
            c[(r < 0.0058) & (h > 0.0068)] = PT.hexc('#fff8d0')
            c[(r > 0.0058) & (r < 0.0072)] = PT.hexc('#d8669c')
            return c
        AC.fn_paint('flower', (0, 0.022), (-0.004, 0.009), fl_paint)
        parts.append(dict(name='flower', V=Vf, T=Tf, N=Nf, UV=uvf, mat='ACC', weights=('bone', 'head')))
    # ── 髪のゴム
    if hair_tie is not None:
        T0, d0 = hair_tie['p'], hair_tie['d']
        e1 = _n(np.cross(d0, [1.0, 0, 0]))
        e2 = np.cross(d0, e1)
        ring_p = np.array([T0 + d0 * 0.012 + (e1 * np.cos(a) + e2 * np.sin(a)) * 0.0145 for a in np.linspace(0, 2 * np.pi, 25)])
        Vt, Tt, Nt = tube(ring_p, 0.0058, seg=8, up=np.tile(d0, (25, 1)), close_ends=False)
        parts.append(dict(name='hair_tie', V=Vt, T=Tt, N=Nt, UV=AC.solid_uv('tie', '#3b2152', len(Vt)), mat='ACC', weights=('bone', 'head')))
    return AC, parts


def backpack_cat(AC, B, Sk, F, lod=1.0, z_front=-0.142, color='#1d1a24', line='#c9b6f0'):
    """猫の顔のリュック（黒）＋肩ひも。戻り値：部品・当たり"""
    J = B['joints']
    q = lod
    zc = z_front - 0.052
    yc = 1.145
    box = S.box((0, yc, zc), (0.122, 0.142, 0.05), r=0.042)
    ears = S.union(S.ell_capsule((0.072, yc + 0.11, zc), (0.098, yc + 0.188, zc), 0.032, 0.006, squash=(1.0, 0.55), up=(0, 0, 1)),
                   S.ell_capsule((-0.072, yc + 0.11, zc), (-0.098, yc + 0.188, zc), 0.032, 0.006, squash=(1.0, 0.55), up=(0, 0, 1)))
    f = S.union(box, ears, k=0.018)
    Vb, Tb, Nb = sdf_part(f, (-0.16, yc - 0.17, zc - 0.08), (0.16, yc + 0.22, zc + 0.08), 0.003, 1500 * q)
    # 背中側（-z）の面に猫の顔：平らな写し
    fv = Vb[Tb]
    fn = np.cross(fv[:, 1] - fv[:, 0], fv[:, 2] - fv[:, 0])
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    back = fn[:, 2] < -0.35
    UVc = np.tile(AC.A.swatch('pack', PT.hexc(color)), (len(Tb), 3, 1)).astype(float)
    xw, y0, y1 = 0.15, yc - 0.155, yc + 0.205
    uv01 = np.stack([0.5 - fv[..., 0] / (2 * xw), 1 - (fv[..., 1] - y0) / (y1 - y0)], -1)
    x, y, w, h = AC.A.rects['cat']
    UVc[back] = np.stack([(x + 4 + uv01[back][..., 0] * (w - 8)) / AC.A.size, (y + 4 + uv01[back][..., 1] * (h - 8)) / AC.A.size], -1)
    parts = [dict(name='backpack', V=Vb, T=Tb, N=Nb, UVc=UVc, mat='ACC', weights=('bone', 'upperChest'))]
    # 猫の顔の絵（区画の 0..1：u 右 = キャラクターの右 = -x を見る人の左…背中から見て左右そのまま）
    u, v = PT.grid01(512, 512)
    X = (u - 0.5) * 2 * xw
    Y = y1 - v * (y1 - y0)
    px = 2 * xw / 512
    img = np.zeros((512, 512, 4))
    img[:] = PT.hexc(color)
    L = PT.hexc(line)
    fy = yc + 0.0
    # 顔の輪郭（耳つき）
    head = PT.sd_ellipse(X, Y, 0, fy - 0.005, 0.085, 0.07)
    earL = PT.sd_polygon(X, Y, [(0.045, fy + 0.05), (0.078, fy + 0.105), (0.083, fy + 0.035)])
    earR = PT.sd_polygon(X, Y, [(-0.045, fy + 0.05), (-0.078, fy + 0.105), (-0.083, fy + 0.035)])
    outline = np.minimum(head, np.minimum(earL, earR))
    img = PT.over(img, L, PT.aa(np.abs(outline) - 0.0022, px))
    # 目（にっこり ^ ^）・鼻・口（ω）・ひげ
    for sg in (1, -1):
        arc = [(sg * (0.034 + 0.016 * np.cos(t)), fy + 0.004 + 0.012 * np.sin(t)) for t in np.linspace(0.15, np.pi - 0.15, 12)]
        img = PT.over(img, L, PT.aa(PT.sd_polyline(X, Y, arc) - 0.0024, px))
        for k in (-1, 0, 1):
            wk = [(sg * 0.06, fy - 0.022 + k * 0.009), (sg * 0.105, fy - 0.022 + k * 0.014)]
            img = PT.over(img, L, PT.aa(PT.sd_polyline(X, Y, wk) - 0.0013, px))
    nose = PT.sd_polygon(X, Y, [(-0.007, fy - 0.014), (0.007, fy - 0.014), (0, fy - 0.022)])
    img = PT.over(img, PT.hexc('#f39cc4'), PT.aa(nose, px))
    mouth = [(-0.016, fy - 0.026), (-0.008, fy - 0.034), (0, fy - 0.026), (0.008, fy - 0.034), (0.016, fy - 0.026)]
    img = PT.over(img, L, PT.aa(PT.sd_polyline(X, Y, PT.catmull(mouth, 4)) - 0.0018, px))
    # 肉球（下の方に小さく）
    for (px0, py0) in ((-0.07, yc - 0.11), (0.075, yc - 0.10)):
        img = PT.over(img, L, PT.aa(PT.sd_ellipse(X, Y, px0, py0, 0.009, 0.008), px) * 0.8)
        for k in range(3):
            img = PT.over(img, L, PT.aa(PT.sd_ellipse(X, Y, px0 + (k - 1) * 0.008, py0 + 0.012 - abs(k - 1) * 0.002, 0.0035, 0.0035), px) * 0.8)
    # ファスナーの線（縁）
    edge = PT.sd_ellipse(X, Y, 0, yc, 0.118, 0.14)
    img = PT.over(img, PT.hexc('#4a4458'), PT.aa(np.abs(edge) - 0.0012, px) * (Y < yc + 0.12))
    # 肩ひも：上着の面の上を通す
    return parts, img, zc


def straps(AC, B, f_body, zc, lod=1.0, color='#1d1a24'):
    out = []
    for sg in (1, -1):
        pts = np.array([[0.066, 1.27, zc + 0.035], [0.080, 1.35, -0.10], [0.098, 1.372, -0.015], [0.112, 1.33, 0.06], [0.120, 1.22, 0.10], [0.128, 1.10, 0.095],
                        [0.150, 1.04, 0.05], [0.150, 1.02, -0.04], [0.11, 1.03, zc + 0.025]])
        pts[:, 0] *= sg
        P = PT.catmull(pts, n=6)
        P = HR.resample(P, 48)
        # 面の外へ押し出す
        for _ in range(4):
            d = f_body(P)
            nrm = S.normals(f_body, P)
            P = P + nrm * np.maximum(0.0045 - d, 0)[:, None]
        nrm = S.normals(f_body, P)
        V, T, N = tube(P, 0.0175, seg=6, up=nrm, flat=0.22, close_ends=True)
        out.append(dict(name='strap_' + ('L' if sg > 0 else 'R'), V=V, T=T, N=N, UV=AC.solid_uv('strap', color, len(V)), mat='ACC', weights='body', smooth_w=1))
    return out


def drawstrings(AC, Sk, f_jk, nz, lod=1.0, color='#f5eef8', tip='#c7b8e8'):
    out, springs = [], []
    for sg, nm in ((1, 'L'), (-1, 'R')):
        pts = np.array([[sg * 0.052, 1.352, nz + 0.07], [sg * 0.054, 1.31, nz + 0.098], [sg * 0.056, 1.24, nz + 0.108], [sg * 0.057, 1.19, nz + 0.110]])
        P = HR.resample(PT.catmull(pts, n=6), 16)
        for _ in range(3):
            d = f_jk(P)
            nrm = S.normals(f_jk, P)
            P = P + nrm * np.maximum(0.004 - d, 0)[:, None]
        bones = HR.chain_bones(Sk, 'ext_cord_' + nm, 'upperChest', [P[2], P[8], P[-1]])
        V, T, N = tube(P, 0.0026, seg=6)
        tl = np.linspace(0, 1, len(P))
        tv = np.repeat(tl, 6)
        tv = np.concatenate([tv, [0, 1]])
        uv = AC.solid_uv('cord', color, len(V))
        uv[tv > 0.86] = AC.A.swatch('cord_tip', PT.hexc(tip))
        out.append(dict(name='cord_' + nm, V=V, T=T, N=N, UV=uv, mat='ACC', weights=('chain', bones, tv, 'upperChest', 0.15)))
        springs.append(dict(name='cord_' + nm, bones=bones, stiffness=3.5, gravity=0.6, drag=0.55, radius=0.006, colliders=['body']))
    return out, springs


def acc_dannoura(B, Sk, C, F, lod=1.0, ctx=None):
    ctx = ctx or {}
    AC, parts = props_dannoura(B, Sk, C, F, lod, hair_tie=ctx.get('tie'))
    bp, catimg, zc = backpack_cat(AC, B, Sk, F, lod, z_front=ctx.get('back_z', -0.142))
    parts += bp
    parts += straps(AC, B, ctx['f_jacket'], zc, lod)
    cords, springs = drawstrings(AC, Sk, ctx['f_jacket'], ctx['nz'], lod)
    parts += cords
    img, shade = AC.render(cat=catimg)
    uc = Sk.P('upperChest')
    # リュックの当たり：中心（zc）・半径＝厚みの半分（背中の面まで）。ポニーテールが乗る
    col = [dict(group='back', bone='upperChest', capsule=dict(offset=[-0.075, 1.08 - uc[1], zc + 0.01 - uc[2]], tail=[0.075, 1.08 - uc[1], zc + 0.01 - uc[2]], radius=0.058)),
           dict(group='back', bone='upperChest', capsule=dict(offset=[-0.065, 1.22 - uc[1], zc + 0.01 - uc[2]], tail=[0.065, 1.22 - uc[1], zc + 0.01 - uc[2]], radius=0.055))]
    return dict(parts=parts, textures={'acc': img, 'acc_shade': shade}, springs=springs, colliders=col)


def band_path(f, pts, lift=0.0045, n=48):
    P = HR.resample(PT.catmull(np.asarray(pts, float), n=6), n)
    for _ in range(4):
        d = f(P)
        nrm = S.normals(f, P)
        P = P + nrm * np.maximum(lift - d, 0)[:, None]
    return P, S.normals(f, P)


def flat_band(AC, name, f, pts, width, color, lift=0.0045, closed=False, n=48, weights='body'):
    P, nrm = band_path(f, pts, lift, n)
    if closed:
        P = np.concatenate([P, P[:1]])
        nrm = np.concatenate([nrm, nrm[:1]])
    V, T, N = tube(P, width / 2, seg=6, up=nrm, flat=0.24, close_ends=not closed)
    return dict(name=name, V=V, T=T, N=N, UV=AC.solid_uv(name + '_c', color, len(V)), mat='ACC', weights=weights, smooth_w=1)


def cat_ears(AC, B, Sk, F, lod=1.0, fur='#f6f2fc', inner='#f5b4cf'):
    J = B['joints']
    import head as HD
    ey = J['leftEye'][1]
    Hc = np.array([0, ey + 0.032, -0.014])
    sk = HD.skull_sdf(F['H'], ey)
    parts, springs = [], []
    AC.A.rects.setdefault('ear', (768, 512 - 256 + 256, 256, 256)) if False else None
    for sg, nm in ((1, 'L'), (-1, 'R')):
        base = HR.on_scalp(sk, Hc, HR.sph(Hc, 48 * sg, 56), 0.004)
        out = _n(base - Hc)
        d = _n(out * 0.55 + np.array([0.0, 1.0, 0.0]) + np.array([0.12 * sg, 0, 0]))
        fwd = _n(np.array([0.15 * sg, 0, 1.0]) - d * (d @ np.array([0.15 * sg, 0, 1.0])))
        tip = base + d * 0.062
        ear = S.ell_capsule(base - d * 0.012, tip, 0.028, 0.0028, squash=(1.0, 0.32), up=fwd)
        cupf = S.ell_capsule(base + d * 0.004 + fwd * 0.0075, base + d * 0.048 + fwd * 0.0045, 0.019, 0.003, squash=(1.0, 0.45), up=fwd)
        ef = S.sub(ear, cupf, k=0.002)
        Ve, Te, Ne = sdf_part(ef, base - 0.05, base + 0.08, 0.0007, 650 * lod)
        bones = HR.chain_bones(Sk, 'ext_ear_' + nm, 'head', [base, base + d * 0.03, tip])
        tv = np.clip(((Ve - base) @ d) / 0.062, 0, 1)
        # 前の面のくぼみはピンク・ほかは白い毛
        fv = Ve[Te]
        fn = np.cross(fv[:, 1] - fv[:, 0], fv[:, 2] - fv[:, 0])
        fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
        front = (fn @ fwd) > 0.25
        wdir = _n(np.cross(d, fwd))
        lat = (fv - base) @ wdir
        hgt = (fv - base) @ d
        halfw = 0.028 * (1 - np.clip(hgt / 0.062, 0, 1)) + 0.002
        pink = front[:, None] & (np.abs(lat) < halfw * 0.62) & (hgt > 0.004) & (hgt < 0.05)
        UVc = np.tile(AC.A.swatch('ear_fur', PT.hexc(fur)), (len(Te), 3, 1)).astype(float)
        pk = pink.all(1)
        UVc[pk] = AC.A.swatch('ear_inner', PT.hexc(inner))
        parts.append(dict(name='ear_' + nm, V=Ve, T=Te, N=Ne, UVc=UVc, mat='ACC', weights=('chain', bones, tv, 'head', 0.12)))
        springs.append(dict(name='ear_' + nm, bones=bones, stiffness=6.0, gravity=0.0, drag=0.7, radius=0.01, colliders=[]))
    return parts, springs


def claws(AC, B, color='#efe8fb'):
    J = B['joints']
    out = []
    for s in ('left', 'right'):
        for fg in ('Thumb', 'Index', 'Middle', 'Ring', 'Little'):
            tip = B['tails'][s + fg + 'Distal']
            base = J[s + fg + 'Distal']
            d = _n(tip - base)
            dn = np.array([0, -1.0, 0])
            pts = np.array([tip - d * 0.006 + [0, 0.002, 0], tip + d * 0.006 + [0, 0.0015, 0], tip + d * 0.014 + dn * 0.002, tip + d * 0.019 + dn * 0.006])
            r = np.array([0.0040, 0.0034, 0.0022, 0.0003])
            V, T, N = tube(pts, r, seg=6, close_ends=True)
            out.append(dict(name='claw_' + s + fg, V=V, T=T, N=N, UV=AC.solid_uv('claw', color, len(V)), mat='ACC', weights=('bone', s + fg + 'Distal')))
    return out


def acc_white(B, Sk, C, F, lod=1.0, ctx=None):
    ctx = ctx or {}
    AC = Acc()
    AC, parts = props_dannoura(B, Sk, C, F, lod, hat=False, AC=AC, flower_at=(84, 22))
    ears, springs = cat_ears(AC, B, Sk, F, lod)
    parts += ears
    parts += claws(AC, B)
    # 手袋（黒）
    for p in ctx.get('parts', []):
        if p['name'] in ('left_hand', 'right_hand'):
            p['mat'] = 'ACC'
            p['UV'] = AC.solid_uv('glove', '#26222e', len(p['V']))
    f = ctx['f_jacket']
    W = '#f1edf8'
    # 毛皮のえり：首のまわりのふくらんだ輪（でこぼこ）＋上の白い房（styles.hair_white）
    J = B['joints']
    nz, ny = J['neck'][2], J['neck'][1]
    cc = np.array([0, ny - 0.018, nz - 0.006])

    def fur(P):
        q = P - cc
        ang = np.arctan2(q[:, 0], q[:, 2])
        rad = np.hypot(q[:, 0], q[:, 2] / 0.95)
        bump = 0.008 * np.sin(ang * 13) * np.cos(q[:, 1] * 140) + 0.005 * np.sin(ang * 29 + 1.3) + 0.003 * np.sin(ang * 47 + 0.4)
        d = np.sqrt((rad - 0.097) ** 2 / 1.0 + (q[:, 1] / 0.8) ** 2) - (0.031 + bump)
        return d
    Vf, Tf, Nf = sdf_part(fur, cc - [0.15, 0.06, 0.15], cc + [0.15, 0.06, 0.15], 0.0022, 1800 * lod)
    parts.append(dict(name='fur_collar', V=Vf, T=Tf, N=Nf, UV=AC.solid_uv('fur', '#f6f3fc', len(Vf)), mat='ACC', weights=('bone', 'upperChest')))
    for sg, nm in ((1, 'L'), (-1, 'R')):
        parts.append(flat_band(AC, 'strapF' + nm, f, [[sg * 0.105, 1.37, -0.03], [sg * 0.08, 1.30, 0.08], [0, 1.14, 0.11], [-sg * 0.08, 1.0, 0.105], [-sg * 0.13, 0.90, 0.07]], 0.022, W))
        parts.append(flat_band(AC, 'strapB' + nm, f, [[sg * 0.105, 1.37, -0.03], [sg * 0.08, 1.30, -0.12], [0, 1.14, -0.135], [-sg * 0.08, 1.0, -0.12], [-sg * 0.13, 0.90, -0.08]], 0.022, W))
    ring = [[0.17 * np.sin(a), 0.875, 0.13 * np.cos(a) - 0.012] for a in np.linspace(0, 2 * np.pi, 16, endpoint=False)]
    parts.append(flat_band(AC, 'belt', f, ring, 0.026, W, closed=True, n=40))
    buckle = S.box((0, 0.875, 0.112), (0.016, 0.014, 0.006), r=0.004)
    Vb, Tb, Nb = sdf_part(buckle, (-0.03, 0.85, 0.09), (0.03, 0.90, 0.13), 0.0012, 160)
    parts.append(dict(name='buckle', V=Vb, T=Tb, N=Nb, UV=AC.solid_uv('buckle', '#8a84a0', len(Vb)), mat='ACC', weights='body'))
    img, shade = AC.render()
    return dict(parts=parts, textures={'acc': img, 'acc_shade': shade}, springs=springs)


def acc_companion(B, Sk, C, F, lod=1.0, ctx=None):
    ctx = ctx or {}
    AC = Acc()
    AC, parts = props_dannoura(B, Sk, C, F, lod, hat=False, glasses=False, flower=False, AC=AC)
    J = B['joints']
    f = ctx['f_jacket']
    # 斜めがけの鞄：右の肩 → 左の腰
    parts.append(flat_band(AC, 'bagstrap', f, [[-0.075, 1.315, -0.07], [-0.07, 1.30, 0.04], [0.0, 1.13, 0.10], [0.09, 0.97, 0.10], [0.15, 0.88, 0.06]], 0.024, '#6a4a32'))
    parts.append(flat_band(AC, 'bagstrapB', f, [[-0.075, 1.315, -0.07], [-0.04, 1.2, -0.125], [0.06, 1.0, -0.125], [0.15, 0.89, -0.05], [0.172, 0.86, 0.01]], 0.024, '#6a4a32'))
    Rm = rot_mat(0.0, 0.62, 0.0)
    c = np.array([0.168, 0.835, 0.02])
    bag = lambda P: S.box((0, 0, 0), (0.075, 0.058, 0.028), r=0.016)((P - c) @ Rm)
    Vb, Tb, Nb = sdf_part(bag, c - 0.1, c + 0.1, 0.0016, 700 * lod)
    L = (Vb - c) @ Rm
    uv = AC.solid_uv('bag', '#a87448', len(Vb))
    flap = (L[:, 1] > 0.005) & (L[:, 2] > 0.0)
    uv[flap] = AC.A.swatch('bag_flap', PT.hexc('#8a5a34'))
    uv[(np.abs(L[:, 0]) < 0.008) & (np.abs(L[:, 1] - 0.004) < 0.007) & (L[:, 2] > 0.02)] = AC.A.swatch('bag_buckle', PT.hexc('#d8c070'))
    parts.append(dict(name='bag', V=Vb, T=Tb, N=Nb, UV=uv, mat='ACC', weights=('bone', 'hips')))
    # 髪留め（黄色）
    import head as HD
    ey = J['leftEye'][1]
    Hc = np.array([0, ey + 0.032, -0.014])
    sk = HD.skull_sdf(F['H'], ey)
    pc = HR.on_scalp(sk, Hc, HR.sph(Hc, -58, 40), 0.0)
    out = _n(pc - Hc)
    pc = pc + out * 0.02
    e1 = _n(np.cross(out, [0, 0, 1.0]))
    clip = S.capsule(pc - e1 * 0.014 + [0, 0.006, 0], pc + e1 * 0.014 - [0, 0.006, 0], 0.0032)
    Vc, Tc, Nc = sdf_part(clip, pc - 0.03, pc + 0.03, 0.0006, 160)
    parts.append(dict(name='hairclip', V=Vc, T=Tc, N=Nc, UV=AC.solid_uv('clip', '#f2cc4a', len(Vc)), mat='ACC', weights=('bone', 'head')))
    img, shade = AC.render()
    return dict(parts=parts, textures={'acc': img, 'acc_shade': shade}, springs=[])
