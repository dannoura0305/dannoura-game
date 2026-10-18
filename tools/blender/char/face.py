# -*- coding: utf-8 -*-
"""
顔を組み立てる：頭の肌（SDF → 細かい網 → 間引き）・目玉・まぶた・眉・口と、そのモーフ（表情）。
戻り値：部品（pack.Part の材料）・顔のテクスチャ・表情の定義。
"""
import numpy as np

import sdf as S
import meshops as MO
import head as HD
import facepaint as FP


MOUTH = {
    'male': dict(neutral=(0.0165, 0.0006, 0.0006, 0.0009, 0.0), aa=(0.0150, 0.0016, 0.0100, 0.0, 0.22), ih=(0.0198, 0.0012, 0.0030, 0.0006, 0.0),
                 ou=(0.0085, 0.0030, 0.0052, 0.0, 0.0), ee=(0.0192, 0.0015, 0.0054, 0.0004, 0.08), oh=(0.0115, 0.0025, 0.0082, 0.0, 0.1),
                 happy=(0.0185, 0.0006, 0.0066, 0.0026, 0.15), angry=(0.0140, 0.0006, 0.0010, -0.0012, 0.0), sad=(0.0128, 0.0005, 0.0009, -0.0018, 0.0),
                 relaxed=(0.0160, 0.0004, 0.0005, 0.0015, 0.0), surprised=(0.0090, 0.0028, 0.0058, 0.0, 0.0)),
}
MOUTH['female'] = {k: (v[0] * 0.95,) + v[1:] for k, v in MOUTH['male'].items()}


def mouth_grid(P, my, nu=11, nv=5):
    w, ht, hb, curve, taper = P
    s = np.linspace(-1, 1, nu)
    t = np.linspace(-1, 1, nv)
    S2, T2 = np.meshgrid(s, t)
    x = S2 * w / 2 * (1 - taper * (T2 + 1) / 2)
    y = my + curve * S2 ** 2 + np.where(T2 < 0, -T2 * ht, -T2 * hb)
    uv = np.stack([(S2 + 1) / 2, (T2 + 1) / 2], -1).reshape(-1, 2)
    return np.stack([x.ravel(), y.ravel()], -1), uv


def grid_tris(nu, nv, flip=False):
    T = []
    for j in range(nv - 1):
        for i in range(nu - 1):
            a, b, c, d = j * nu + i, j * nu + i + 1, (j + 1) * nu + i, (j + 1) * nu + i + 1
            # 行（j）が下へ進む（t：上 → 下）：a→b が +x、a→c が −y → 前向きは (a, c, d)・(a, d, b)
            T += [(a, c, d), (a, d, b)] if not flip else [(a, d, c), (a, b, d)]
    return np.array(T)


def build_face(B, style, look, lod=1.0):
    """B：体の寸法（骨は J）。戻り値 dict（parts：list of dict、tex：画像、expr：表情の定義、eye：目の情報）"""
    J = B['joints']
    H = HD.head_shape(style)
    f = HD.head_sdf(B, H)
    ey = J['leftEye'][1]
    ex = abs(J['leftEye'][0])
    nb = J['neck']
    # 肌の網：細かく取り出して間引く（形の曲がった所に頂点が残る）
    lo = np.array([-0.105, nb[1] - 0.08, -0.13])
    hi = np.array([0.105, ey + 0.15, 0.115])
    V, Q = S.surface_nets(f, lo, hi, 0.0016)
    V = S.project(f, V)
    m = MO.Mesh(V, Q)
    target = 4000 * lod
    m = MO.decimate(m, target / (2 * len(m.F)), symmetry=True, triangulate=True)
    m.V = S.project(f, m.V, iters=3)
    T = m.tris()
    Ns = S.normals(f, m.V)
    N = HD.face_normals(H, ey, m.V, Ns, B)
    # UV：顔の前は平らな写し・他は肌の色だけ
    box = (-0.09, 0.09, ey - 0.11, ey + 0.07)
    fv = m.V[T]
    fn = np.cross(fv[:, 1] - fv[:, 0], fv[:, 2] - fv[:, 0])
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    cen = fv.mean(1)
    front = (fn[:, 2] > 0.2) & (cen[:, 2] > 0.01) & (cen[:, 1] > box[2] + 0.002) & (cen[:, 1] < box[3] - 0.002) & (np.abs(cen[:, 0]) < 0.088)
    UVc = np.zeros((len(T), 3, 2))
    pl = FP.cell_uv('face', HD.face_plane_uv(fv.reshape(-1, 3), ey, box)).reshape(-1, 3, 2)
    sk = FP.solid_uv(1)[0]
    UVc[front] = pl[front]
    UVc[~front] = sk
    parts = [dict(name='head_skin', V=m.V, T=T, N=N, UVc=UVc, mat='FACE_SKIN', group='body', weights='body')]
    # 肌の表面の z（目の中心）→ 目玉の位置を合わせる
    re = 0.0215 if style == 'male' else 0.021
    Pz = HD.project_to(f, np.array([[ex, ey + 0.001, 0.12]]))[0]
    eye_z = Pz[2] - 0.0019 - re
    for s in ('left', 'right'):
        J[s + 'Eye'] = np.array([J[s + 'Eye'][0], ey, eye_z])
        B['tails'][s + 'Eye'] = J[s + 'Eye'] + np.array([0, 0, 0.02])
    E = HD.eye_shape(style)
    morph_parts = []
    eyes = {}
    for s in ('left', 'right'):
        e = HD.build_eye(B, s, E, re, 0.0019, f, lod=lod)
        eyes[s] = e
        eb = e['eyeball']
        parts.append(dict(name=s + '_eyeball', V=eb['V'], T=eb['T'], N=eb['N'], UV=FP.cell_uv('eye', eb['uv']), mat='FACE_PARTS', group='face', weights=('bone', s + 'Eye')))
        sfx = '_L' if s == 'left' else '_R'
        for lid, cell in (('lidU', 'lidU'), ('lidL', 'lidL')):
            L = e[lid]
            Vl = L['V']
            # まぶたの法線＝顔の肌の法線（目の穴の縁が見えないように）
            Pp = HD.project_to(f, Vl * [1, 1, 0] + [0, 0, 0.12])
            Nl = HD.face_normals(H, ey, Pp, S.normals(f, Pp), B)
            mo = {}
            for k, dv in L['morphs'].items():
                if k == 'close':
                    mo['blink' + sfx] = dv
                else:
                    mo[k + '_eyes'] = dv
            morph_parts.append(dict(name=s + '_' + lid, V=Vl, T=L['T'], N=Nl, UV=FP.cell_uv(cell, L['uv']), mat='FACE_PARTS', group='face', weights=('bone', 'head'), morphs=mo))
    # 眉
    brow_pts = {'male': [(-0.0158, 0.0182), (-0.0052, 0.0208), (0.0066, 0.0217), (0.0172, 0.0200), (0.0238, 0.0164)],
                'female': [(-0.0130, 0.0190), (-0.0040, 0.0220), (0.0060, 0.0232), (0.0150, 0.0215), (0.0200, 0.0180)]}[style]
    brow_th = {'male': [0.0031, 0.0028, 0.0021, 0.0010], 'female': [0.0018, 0.0017, 0.0013, 0.0006]}[style]
    BROW = {'happy': (0.0011, 0.0004, 0.0), 'angry': (-0.0030, 0.0010, 0.0), 'sad': (0.0026, -0.0010, 0.0), 'relaxed': (-0.0006, -0.0004, 0.0), 'surprised': (0.0034, 0.0030, 0.0)}
    for s in ('left', 'right'):
        sg = 1 if s == 'left' else -1
        pts = [(sg * (ex + x), y) for x, y in brow_pts]
        Vb, Tb, uvb = HD.strip_on_face(f, ey, pts, brow_th, nu=14, nv=3, lift=0.0005)
        Pp = HD.project_to(f, Vb * [1, 1, 0] + [0, 0, 0.12])
        Nb = HD.face_normals(H, ey, Pp, S.normals(f, Pp), B)
        mo = {}
        xp = (Vb[:, 0] * sg - ex)
        w = np.clip((xp - brow_pts[0][0]) / (brow_pts[-1][0] - brow_pts[0][0]), 0, 1)
        for k, (din, dout, _) in BROW.items():
            dy = din * (1 - w) + dout * w
            Vt = Vb.copy()
            Vt[:, 1] += dy
            Vt = HD.project_to(f, Vt * [1, 1, 0] + [0, 0, 0.12])
            Vt[:, 2] += 0.0005
            mo['brow_' + k] = Vt - Vb
        morph_parts.append(dict(name=s + '_brow', V=Vb, T=Tb, N=Nb, UV=FP.cell_uv('brow', uvb), mat='FACE_PARTS', group='face', weights=('bone', 'head'), morphs=mo))
    # 口
    MP = MOUTH[style]
    my = ey - (0.0560 if style == 'male' else 0.0525)
    nu, nv = 11, 5

    def mouth_pos(p):
        xy, uv = mouth_grid(p, my, nu, nv)
        P = np.stack([xy[:, 0], xy[:, 1], np.full(len(xy), 0.12)], -1)
        P = HD.project_to(f, P)
        P[:, 2] += 0.0004
        return P, uv
    Vm, uvm = mouth_pos(MP['neutral'])
    Tm = grid_tris(nu, nv)
    Pp = HD.project_to(f, Vm * [1, 1, 0] + [0, 0, 0.12])
    Nm = HD.face_normals(H, ey, Pp, S.normals(f, Pp), B)
    mo = {}
    for k, p in MP.items():
        if k == 'neutral':
            continue
        mo['mouth_' + k] = mouth_pos(p)[0] - Vm
    morph_parts.append(dict(name='mouth', V=Vm, T=Tm, N=Nm, UV=FP.cell_uv('mouth', uvm), mat='FACE_PARTS', group='face', weights=('bone', 'head'), morphs=mo))
    parts += morph_parts
    tex = FP.paint_face(look, ey, ex, E, box)
    # 表情（VRM の preset → 部品のモーフ）
    def b(*names, w=1.0):
        return [dict(mesh='face', morph=n, weight=w) for n in names]
    expr = {
        'blink': dict(binds=b('blink_L', 'blink_R')), 'blinkLeft': dict(binds=b('blink_L')), 'blinkRight': dict(binds=b('blink_R')),
        'happy': dict(binds=b('happy_eyes', 'brow_happy', 'mouth_happy'), overrideBlink='block'),
        'angry': dict(binds=b('angry_eyes', 'brow_angry', 'mouth_angry'), overrideBlink='blend'),
        'sad': dict(binds=b('sad_eyes', 'brow_sad', 'mouth_sad'), overrideBlink='blend'),
        'relaxed': dict(binds=b('relaxed_eyes', 'brow_relaxed', 'mouth_relaxed'), overrideBlink='blend'),
        'surprised': dict(binds=b('surprised_eyes', 'brow_surprised', 'mouth_surprised'), overrideBlink='block'),
        'aa': dict(binds=b('mouth_aa')), 'ih': dict(binds=b('mouth_ih')), 'ou': dict(binds=b('mouth_ou')), 'ee': dict(binds=b('mouth_ee')), 'oh': dict(binds=b('mouth_oh')),
        'neutral': dict(binds=[]),
    }
    return dict(parts=parts, tex=tex, expr=expr, sdf=f, H=H, eye_z=eye_z, ey=ey)
