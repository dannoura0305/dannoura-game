# -*- coding: utf-8 -*-
"""手（指 5 本）：SDF → 細かい網 → 間引き。重みは指の骨の線分への近さ（指ごとの鎖・付け根で手の甲と混ぜる・手首で前腕と混ぜる）。"""
import numpy as np

import sdf as S
import meshops as MO
import body as BD
import rig as R
import facepaint as FP

SEGS = {'Thumb': ['Metacarpal', 'Proximal', 'Distal'], 'Index': ['Proximal', 'Intermediate', 'Distal'], 'Middle': ['Proximal', 'Intermediate', 'Distal'],
        'Ring': ['Proximal', 'Intermediate', 'Distal'], 'Little': ['Proximal', 'Intermediate', 'Distal']}


def hand_weights(V, B, side, bone_index):
    J = B['joints']
    s = side
    sx = 1 if side == 'left' else -1
    hand = J[s + 'Hand']
    n = len(V)
    cands = {}
    P = B['palm']
    # 手のひら：手首 → 中指の付け根の線分からの距離 − 手のひらの半分の幅（平たい箱の近い距離）
    c = hand + np.array([sx * P['len'] * 0.5, 0, 0])
    q = np.abs(V - c) - np.array([P['len'] * 0.5, P['thick'] * 0.5, P['width'] * 0.5])
    d_palm = np.linalg.norm(np.maximum(q, 0), axis=1)
    fd = {}
    for fg, segs in SEGS.items():
        pts = [J[s + fg + g] for g in segs] + [B['tails'][s + fg + 'Distal']]
        start = 0 if fg == 'Thumb' else 0
        d = np.full(n, 1e9)
        for j in range(start, 3):
            d = np.minimum(d, R.seg_dist(V, pts[j], pts[j + 1])[0])
        fd[fg] = (d, pts)
    eps = 1e-12
    wp = 1.0 / (d_palm ** 4 + (0.004) ** 4)
    wf = {fg: 1.0 / (np.maximum(d - B['finger_r'][i] * 0.6, 0) ** 4 + (0.0025) ** 4) for i, (fg, (d, _)) in enumerate(fd.items())}
    # 指の付け根より手首側は手のひら（指の骨は付け根から）
    for fg, (d, pts) in fd.items():
        if fg == 'Thumb':
            continue
        ax = pts[1] - pts[0]
        ax /= np.linalg.norm(ax)
        t = (V - pts[0]) @ ax
        wf[fg] *= S.smoothstep(-0.012, 0.004, t)
    tot = wp + sum(wf.values()) + eps
    Wf = np.zeros((n, bone_index['__n']))
    Wf[:, bone_index[s + 'Hand']] += wp / tot
    for fg, (d, pts) in fd.items():
        segs = SEGS[fg]
        names = [s + fg + g for g in segs]
        # 鎖の上の位置で混ぜる
        L = [np.linalg.norm(pts[j + 1] - pts[j]) for j in range(3)]
        Dj = np.stack([R.seg_dist(V, pts[j], pts[j + 1])[0] for j in range(3)], 1)
        Tj = np.stack([R.seg_dist(V, pts[j], pts[j + 1])[1] for j in range(3)], 1)
        k = Dj.argmin(1)
        st = np.concatenate([[0], np.cumsum(L)[:-1]])
        pos = st[k] + Tj[np.arange(n), k] * np.array(L)[k]
        Wc = np.zeros((n, 3))
        Wc[:, 0] = 1
        for j in (1, 2):
            u = S.smoothstep(st[j] - 0.005, st[j] + 0.004, pos)
            Wc[:, :j] *= (1 - u)[:, None]
            Wc[:, j] = u
        if fg != 'Thumb':
            # 付け根のまわりは手のひらと半々
            pass
        for j, nm in enumerate(names):
            Wf[:, bone_index[nm]] += wf[fg] / tot * Wc[:, j]
    # 手首 → 前腕
    ax = BD_axis = (J[s + 'Hand'] - J[s + 'LowerArm'])
    ax = ax / np.linalg.norm(ax)
    t = (V - hand) @ ax
    u = S.smoothstep(-0.03, 0.012, t)
    Wf *= u[:, None]
    Wf[:, bone_index[s + 'LowerArm']] += 1 - u
    return R.top4(Wf)


def build_hands(B, lod=1.0):
    out = []
    from rig import HUMAN_PARENT
    names = [n for n in HUMAN_PARENT if n in B['joints']]
    bone_index = {n: i for i, n in enumerate(names)}
    bone_index['__n'] = len(names)
    for side in ('left', 'right'):
        sx = 1 if side == 'left' else -1
        f = BD.hand_sdf(B, sx)
        hand = B['joints'][side + 'Hand']
        lo = hand + np.array([-0.06 if sx > 0 else -0.20, -0.05, -0.075])
        hi = hand + np.array([0.20 if sx > 0 else 0.06, 0.035, 0.115])
        V, Q = S.surface_nets(f, lo, hi, 0.0011)
        V = S.project(f, V)
        m = MO.Mesh(V, Q)
        m = MO.decimate(m, (1500 * lod) / (2 * len(m.F)), symmetry=False, triangulate=True)
        m.V = S.project(f, m.V, iters=3)
        T = m.tris()
        N = S.normals(f, m.V)
        Jw, Ww = hand_weights(m.V, B, side, bone_index)
        out.append(dict(name=side + '_hand', V=m.V, T=T, N=N, UV=FP.solid_uv(len(m.V)), mat='FACE_SKIN', group='body', weights=('given', Jw, Ww)))
    return out
