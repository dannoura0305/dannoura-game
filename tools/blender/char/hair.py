# -*- coding: utf-8 -*-
"""
髪：頭皮の殻（地の色・すき間を埋める）＋房（先の細い平たい管）。房は根から「育てる」：重力・流れの向き・引き寄せる点へ曲がり、
頭（の殻）の外に押し出されながら伸びる（頭に沿って巻く）。断面はレンズ形で縁を頭へ少し曲げる（アニメの髪の房の殻）。
法線は房の断面と頭の中心からの向きを混ぜる（トゥーンの影をすっきり）。テクスチャは房ごとの区画に 3D の色の関数を焼く（天使の輪）。
揺れ物：ポニーテール・横の房などは骨の鎖（ext_*）へ重み。
"""
import numpy as np

import sdf as S
import meshops as MO
import paint as PT
import head as HD
import rig as R

TEX = 2048


def _norm(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def sph(Hc, th, ph):
    """頭の中心からの向き（th：水平の角・0＝前・+ が左（+X）、ph：上下の角）"""
    th, ph = np.radians(th), np.radians(ph)
    return np.array([np.sin(th) * np.cos(ph), np.sin(ph), np.cos(th) * np.cos(ph)])


def on_scalp(f, Hc, d, off):
    """中心から向き d の線が殻（f = off）に当たる点"""
    lo, hi = 0.0, 0.25
    for _ in range(40):
        mid = (lo + hi) / 2
        if f(np.array([Hc + d * mid]))[0] < off:
            lo = mid
        else:
            hi = mid
    return Hc + d * hi


def grow(f, p0, d0, L, n=14, grav=0.0, bias=None, bias_w=0.0, attract=None, attract_w=0.0, off0=0.004, off1=0.008, curl=None, stiff=0.0):
    """房の芯の線を育てる。戻り値 (n+1, 3)"""
    p = np.array(p0, float)
    d = _norm(np.array(d0, float))
    pts = [p.copy()]
    step = L / n
    g = np.array([0, -1.0, 0])
    for k in range(n):
        s = (k + 1) / n
        w = d * (1 + stiff)
        w = w + g * grav * s ** 0.7
        if bias is not None:
            w = w + np.asarray(bias) * bias_w
        if attract is not None:
            w = w + _norm(np.asarray(attract) - p) * attract_w
        if curl is not None:
            w = w + np.asarray(curl) * s ** 2
        d = _norm(w)
        q = p + d * step
        off = off0 + (off1 - off0) * s
        for _ in range(3):
            fv = f(q[None])[0]
            if fv < off:
                nrm = S.normals(f, q[None])[0]
                q = q + nrm * (off - fv)
        d = _norm(q - p)
        p = q
        pts.append(p.copy())
    return np.array(pts)


def resample(C, n):
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))])
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, C[:, i]) for i in range(3)], -1)


def lock_mesh(C, f, Hc, w0, t0, M=6, cup=0.18, root_w=0.75, tip_pow=0.75, twist=0.0, flat_out=None, wprof=None):
    """芯の線 C (n,3) → 房の網。戻り値 dict(V, T, N, uv（房の中の 0..1）, s（長さの位置）)"""
    n = len(C)
    s = np.linspace(0, 1, n)
    tang = _norm(np.gradient(C, axis=0))
    if flat_out is None:
        out = S.normals(f, C)
    else:
        fo = np.asarray(flat_out, float)
        out = _norm(np.tile(fo, (n, 1)) if fo.ndim == 1 else fo)
    out = _norm(out - tang * (out * tang).sum(1, keepdims=True))
    wd = _norm(np.cross(tang, out))
    td = np.cross(wd, tang)
    if wprof is None:
        wprof = lambda s: (root_w + (1 - root_w) * np.clip(s / 0.2, 0, 1) ** 0.6) * (1 - s) ** tip_pow * (1 + 0.25 * np.sin(np.pi * s))
    W = w0 * wprof(s)
    Tk = t0 * (1 - s) ** 0.7 + 0.0008
    V, N, uv, sv = [], [], [], []
    alphas = np.linspace(0, 2 * np.pi, M, endpoint=False)
    for i in range(n - 1):
        tw = twist * s[i]
        e1 = wd[i] * np.cos(tw) + td[i] * np.sin(tw)
        e2 = -wd[i] * np.sin(tw) + td[i] * np.cos(tw)
        for j in range(M + 1):
            a = alphas[j % M] if j < M else 2 * np.pi
            ca, sa = np.cos(a), np.sin(a)
            x = W[i] / 2 * np.sign(ca) * np.abs(ca) ** 0.8
            y = Tk[i] / 2 * sa - cup * W[i] * ca * ca
            V.append(C[i] + e1 * x + e2 * y)
            nl = _norm(e1 * ca / max(W[i], 1e-4) + e2 * sa / max(Tk[i], 1e-4) * 0.35 + e2 * 0.25)
            N.append(nl)
            uv.append((j / M, s[i]))
            sv.append(s[i])
    tip = len(V)
    V.append(C[-1])
    N.append(_norm(tang[-1] + td[-1] * 0.3))
    uv.append((0.5, 1.0))
    sv.append(1.0)
    V, N = np.array(V), np.array(N)
    # 頭の中心からの向きと混ぜる（すっきりした陰影）
    ns = _norm(V - Hc)
    N = _norm(N * 0.45 + ns * 0.55)
    T = []
    R_ = M + 1
    for i in range(n - 2):
        for j in range(M):
            a, b = i * R_ + j, i * R_ + j + 1
            c, d = (i + 1) * R_ + j, (i + 1) * R_ + j + 1
            T += [(a, c, d), (a, d, b)]
    base = (n - 2) * R_
    for j in range(M):
        T.append((base + j, tip, base + j + 1))
    T = np.array(T)
    # 向きを外向きに（体積が正）
    m = MO.Mesh(V, [tuple(t) for t in T])
    # 根は開いた輪なので体積は近い値：向きは断面の法線と比べる
    fv = V[T]
    fn = np.cross(fv[:, 1] - fv[:, 0], fv[:, 2] - fv[:, 0])
    if (fn * N[T].mean(1)).sum() < 0:
        T = T[:, ::-1]
    return dict(V=V, T=T, N=N, uv=np.array(uv), s=np.array(sv))


def scalp_cap(f, Hc, hairline, off=0.003, h=0.0025, faces=1300):
    """頭皮の殻：髪の生え際より上"""
    g = S.offset(f, off)
    lo = Hc - np.array([0.11, 0.13, 0.14])
    hi = Hc + np.array([0.11, 0.13, 0.13])
    V, Q = S.surface_nets(g, lo, hi, h)
    V = S.project(g, V)
    m = MO.Mesh(V, Q)
    rel = m.V - Hc
    th = np.degrees(np.arctan2(rel[:, 0], rel[:, 2]))
    keepv = m.V[:, 1] > hairline(np.abs(th))
    keep = np.array([keepv[list(q)].all() for q in m.F])
    m, _ = MO.delete_faces(m, keep)
    # 生え際（境界）をならす：境界の輪に沿って平均へ寄せ、面へ戻す
    for loop in MO.boundary_loops(m):
        if len(loop) < 8:
            continue
        L = np.array(loop)
        for _ in range(12):
            P = m.V[L]
            m.V[L] = 0.5 * P + 0.25 * (np.roll(P, 1, 0) + np.roll(P, -1, 0))
        m.V[L] = S.project(g, m.V[L], iters=2)
    m = MO.decimate(m, faces / max(len(m.F) * 2, 1), symmetry=True, triangulate=True)
    m.V = S.project(g, m.V, iters=2)
    return m, g


class HairBuilder:
    def __init__(self, B, H, look, lod=1.0):
        self.B, self.H, self.look, self.lod = B, H, look, lod
        J = B['joints']
        self.ey = J['leftEye'][1]
        self.Hc = np.array([0, self.ey + 0.032, -0.014])
        self.skull = HD.skull_sdf(H, self.ey)
        self.locks = []
        self.M = 6 if lod >= 1 else 5
        self.nseg = 12 if lod >= 1 else 8

    def add(self, C, w, t, chain=None, kind='lock', hold=0.12, bone=None, parent_bone=None, **kw):
        n = self.nseg + 1 if len(C) > 4 else len(C)
        fo = kw.get('flat_out')
        if fo is not None and np.ndim(fo) == 2 and len(fo) == len(C):
            kw['flat_out'] = _norm(resample(np.asarray(fo, float), max(n, 5)))
        C = resample(C, max(n, 5))
        # P17：房ごとのばらつき（幅・厚み・先の細り）。前は全部の房が同じ太さで「均一な束」に見えた。房の番号で決まる乱数（作り直しても同じ）
        rv = np.random.default_rng(1000 + len(self.locks))
        if kind == 'lock':
            w *= rv.uniform(0.84, 1.2)
            t *= rv.uniform(0.85, 1.45)
        elif kind == 'bang':
            w *= rv.uniform(0.9, 1.1)
            t *= rv.uniform(0.9, 1.25)
        if 'tip_pow' in kw:
            kw['tip_pow'] = kw['tip_pow'] * rv.uniform(0.82, 1.22)
        L = lock_mesh(C, self.skull, self.Hc, w, t, M=self.M, **kw)
        L['chain'] = chain
        L['hold'] = hold
        L['kind'] = kind
        L['bone'] = bone
        L['parent_bone'] = parent_bone
        self.locks.append(L)
        return L

    def lock(self, th, ph, L, d0, w=0.024, t=0.006, grav=0.0, bias=None, bias_w=0.0, attract=None, attract_w=0.0, off0=0.004, off1=0.009, chain=None, curl=None, stiff=0.0, **kw):
        d = sph(self.Hc, th, ph)
        p0 = on_scalp(self.skull, self.Hc, d, off0)
        C = grow(self.skull, p0, d0, L, n=self.nseg, grav=grav, bias=bias, bias_w=bias_w, attract=attract, attract_w=attract_w, off0=off0, off1=off1, curl=curl, stiff=stiff)
        return self.add(C, w, t, chain=chain, **kw)

    # ── テクスチャ（房ごとの区画）と部品
    def finish(self, cap, Sk, bones_of_chain, tex_size=TEX, ring=(30.0, 7.0)):
        look = self.look
        parts = []
        nl = len(self.locks)
        # 区画：左上 1024 四方＝頭皮の殻（smart UV）、残りは房
        cols = int(np.ceil(nl / 6.0))
        cw, chh = 1024 // cols, 512
        cells = []
        for r0 in range(4):
            for c0 in range(cols):
                cells.append((1024 + c0 * cw + 4, r0 * chh + 4, cw - 8, chh - 8))
        for r0 in range(2):
            for c0 in range(cols):
                cells.append((c0 * cw + 4, 1024 + r0 * chh + 4, cw - 8, chh - 8))
        if nl > len(cells):
            raise ValueError('髪の房が多すぎる %d' % nl)
        allV, allT, allN, allUV, allS, allP = [], [], [], [], [], []
        UVc_list, attrs = [], []
        bakeUV, bakeP, bakeS, bakeU, bakeK = [], [], [], [], []
        J_all, W_all = [], []
        off = 0
        head_i = Sk.idx('head')
        for li, L in enumerate(self.locks):
            x, y, w, h = cells[li]
            uv = np.stack([(x + L['uv'][:, 0] * w) / tex_size, (y + L['uv'][:, 1] * h) / tex_size], -1)
            allV.append(L['V'])
            allT.append(L['T'] + off)
            allN.append(L['N'])
            allUV.append(uv)
            off += len(L['V'])
            # 重み
            if L.get('bone'):
                Jw, Ww = R.rigid(len(L['V']), Sk.idx(L['bone']))
            elif L['chain']:
                bi = [Sk.idx(b) for b in bones_of_chain[L['chain']]]
                Jw, Ww = R.chain_weights_param(L['s'], bi, head_i if L.get('parent_bone') is None else Sk.idx(L['parent_bone']), root_hold=L['hold'])
            else:
                Jw, Ww = R.rigid(len(L['V']), head_i)
            J_all.append(Jw)
            W_all.append(Ww)
            T = L['T']
            bakeUV.append(uv[T])
            bakeP.append(L['V'][T])
            bakeS.append(L['s'][T][..., None])
            bakeU.append(L['uv'][T][..., :1])
            bakeK.append(np.full((len(T), 1), 1.0 if L['kind'] in ('lock', 'bang') else 0.0))
        V = np.concatenate(allV)
        T = np.concatenate(allT)
        N = np.concatenate(allN)
        UV = np.concatenate(allUV)
        parts.append(dict(name='hair_locks', V=V, T=T, N=N, UV=UV, mat='HAIR', group='body', weights=('given', np.concatenate(J_all), np.concatenate(W_all))))
        # 頭皮の殻：smart UV を左上へ
        if cap is not None:
            cm, cg = cap
            Tc = cm.tris()
            import garment as G
            UVc = G.uv_islands(cm, Tc, np.arange(len(Tc)))
            UVc = UVc * (1024 - 16) / tex_size + 8 / tex_size
            UVc[..., 1] = UVc[..., 1]   # Blender の v は上向き → 画像は下向き（下で反転）
            UVc[..., 1] = (1024 - 8) / tex_size - (UVc[..., 1] - 8 / tex_size)
            Nc = _norm(S.normals(cg, cm.V) * 0.5 + _norm(cm.V - self.Hc) * 0.5)
            parts.append(dict(name='hair_cap', V=cm.V, T=Tc, N=Nc, UVc=UVc, mat='HAIR', group='body', weights=('bone', 'head')))
            bakeUV.append(UVc)
            bakeP.append(cm.V[Tc])
            bakeS.append(np.full((len(Tc), 3, 1), 0.45))
            bakeU.append(np.full((len(Tc), 3, 1), 0.5))
            bakeK.append(np.full((len(Tc), 1), 0.5))
        UVb = np.concatenate(bakeUV)
        attrs = {'p': np.concatenate(bakeP), 's': np.concatenate(bakeS), 'u': np.concatenate(bakeU), 'k': np.concatenate(bakeK)}
        Hc, ey = self.Hc, self.ey
        rng = np.random.default_rng(3)
        ph_strand = rng.uniform(0, 2 * np.pi, 8)

        def color(A, shade=False):
            p, s, u, k = A['p'], A['s'][:, 0], A['u'][:, 0], A['k'][:, 0]
            base = PT.mix(PT.hexc(look['hairDark']), PT.hexc(look['hair']), S.smoothstep(0.0, 0.3, s))
            base = PT.mix(base, PT.hexc(look['hairLight']), S.smoothstep(0.55, 1.0, s) * 0.35)
            # 筋（房の長さに沿う線）
            st = np.zeros_like(s)
            for i, f in enumerate((7, 11, 17)):
                st += np.sin(u * 2 * np.pi * f + ph_strand[i] + s * 3.0 * (i + 1)) * (0.5 / (i + 1))
            dark = S.smoothstep(0.55, 0.95, st) * 0.22 * (k > 0.2)
            base = PT.mix(base, PT.hexc(look['hairDark']), dark)
            # 天使の輪：頭の中心から見た高さの角の帯（ぎざぎざの縁）
            rel = p - Hc
            el = np.degrees(np.arcsin(np.clip(rel[:, 1] / np.maximum(np.linalg.norm(rel, axis=1), 1e-9), -1, 1)))
            az = np.arctan2(rel[:, 0], rel[:, 2])
            c0, hw = ring
            zig = 1.6 * np.sin(az * 9.0) + 0.8 * np.sin(u * 2 * np.pi)
            band = S.smoothstep(hw, hw - 2.5, np.abs(el - c0 - zig)) * (np.linalg.norm(rel, axis=1) < 0.14)
            band *= S.smoothstep(0.0, 0.04, rel[:, 1])
            if not shade:
                base = PT.mix(base, PT.hexc(look['hairRing']), band * 0.75)
                return base
            sh = base.copy()
            sh[:, :3] = sh[:, :3] * np.array(look.get('hairShadeTint', (0.62, 0.55, 0.86)))
            return sh
        img, mask = PT.bake(UVb, (tex_size, tex_size), attrs, lambda A: color(A, False), pad=6, bg=PT.hexc(look['hair']))
        imgs, _ = PT.bake(UVb, (tex_size // 2, tex_size // 2), attrs, lambda A: color(A, True), pad=4, bg=PT.hexc(look['hairDark']))
        return parts, {'hair': img, 'hair_shade': imgs}


def chain_bones(Sk, name, parent, pts):
    """骨の鎖を足す（pts：根 → 先・最後は先の印の骨）。戻り値：骨の名前の list"""
    names = []
    par = parent
    for i, p in enumerate(pts):
        nm = '%s_%02d' % (name, i + 1) if i < len(pts) - 1 else name + '_end'
        Sk.add(nm, par, p)
        names.append(nm)
        par = nm
    return names
