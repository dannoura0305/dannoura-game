# -*- coding: utf-8 -*-
"""髪型（キャラクターごと）。HairBuilder で房を並べ、骨の鎖（揺れ物）を足す。"""
import numpy as np

import hair as HR
import paint as PT


def _guide(pts, n=40):
    return PT.catmull(pts, n=max(2, n // max(1, len(pts) - 1)))


def _frame(G):
    t = HR._norm(np.gradient(G, axis=0))
    up = np.array([1.0, 0, 0])
    e1 = HR._norm(np.cross(t, up))
    e1 = np.where((np.linalg.norm(np.cross(t, up), axis=1) < 1e-4)[:, None], np.array([0, 0, 1.0]), e1)
    e2 = np.cross(t, e1)
    return t, e1, e2


def hair_dannoura(B, Sk, C, F, lod=1.0, ctx=None):
    """紫の長い髪のポニーテール・前髪・横の房（だんのうら）"""
    hb = HR.HairBuilder(B, F['H'], C['look'], lod)
    Hc, ey = hb.Hc, hb.ey
    sk = hb.skull
    # 結び目（後ろの高め）とポニーテールの芯
    T = HR.on_scalp(sk, Hc, HR.sph(Hc, 180, 22), 0.016)
    G = _guide([T, T + [0, -0.03, -0.055], T + [0, -0.11, -0.09], T + [0, -0.22, -0.105], T + [0, -0.33, -0.11], T + [0, -0.41, -0.105]], n=60)
    G = HR.resample(G, 60)
    bp = [G[int(i)] for i in np.linspace(0, len(G) - 1, 6)]
    pony = HR.chain_bones(Sk, 'ext_ponytail', 'head', bp)
    tg, e1, e2 = _frame(G)
    full = len(G)
    rng = np.random.default_rng(7)
    layers = [(14, 1.0, 0.036, 0.0), (8, 0.55, 0.03, 0.4)] if lod >= 1 else [(9, 1.0, 0.04, 0.0)]
    for nl, rk, wl, a0 in layers:
        for i in range(nl):
            a = 2 * np.pi * (i + a0) / nl + rng.uniform(-0.12, 0.12)
            lf = rng.uniform(0.80, 1.0) if i % 3 else 1.0
            k = int(full * lf)
            s = np.linspace(0, 1, full)[:k] / lf
            r = rk * (0.012 + 0.042 * np.clip(s / 0.25, 0, 1) ** 0.6 * (1 - 0.6 * s ** 1.6))
            ca, sa = np.cos(a), np.sin(a)
            Cc = G[:k] + (e1[:k] * ca + e2[:k] * sa) * r[:, None]
            Cc[-k // 3:] += (e1[-k // 3:] * ca + e2[-k // 3:] * sa) * (np.linspace(0, 1, len(Cc[-k // 3:]))[:, None] ** 2) * 0.014
            out = HR._norm(e1[:k] * ca + e2[:k] * sa)
            hb.add(Cc, wl * (1.0 if i % 2 == 0 else 0.86), 0.010, chain='pony', kind='lock', hold=0.04, flat_out=out, cup=0.16, root_w=0.55, tip_pow=0.8)
    # 上・横の髪を結び目へ（なでつけ・重ねて隙間なく）
    for th in (-160, -140, -118, -96, -76, -56, -36, -18, 0, 18, 36, 56, 76, 96, 118, 140, 160):
        ph = 66 if abs(th) < 60 else (44 if abs(th) < 110 else 30)
        hb.lock(th, ph, 0.22, d0=HR._norm(T - HR.on_scalp(sk, Hc, HR.sph(Hc, th, ph), 0.008)), w=0.046, t=0.006, attract=T, attract_w=2.4, off0=0.0095, off1=0.010, kind='lock', tip_pow=1.3, cup=0.08)
    for th in (-160, -130, -100, 100, 130, 160, 180):
        hb.lock(th, -18 if abs(th) > 120 else 2, 0.12, d0=(0, 1, -0.2), w=0.04, t=0.006, attract=T, attract_w=2.5, off0=0.009, off1=0.010, kind='lock', tip_pow=1.2, cup=0.08)
    # 前髪（右へ少し流す）：根は頭の上の前・おでこの前に下りる
    bangs = [(-50, 56, 0.115, 0.030), (-36, 63, 0.135, 0.033), (-21, 67, 0.152, 0.034), (-7, 69, 0.160, 0.032), (7, 69, 0.150, 0.033),
             (21, 67, 0.140, 0.033), (35, 63, 0.128, 0.031), (48, 57, 0.112, 0.029), (-63, 47, 0.100, 0.026), (61, 48, 0.098, 0.026),
             (-14, 74, 0.125, 0.028), (14, 74, 0.12, 0.028)]
    for th, ph, L, w in bangs:
        hb.lock(th, ph, L, d0=HR._norm(HR.sph(Hc, th, ph - 45) * [1, 0.2, 1] + [0, 0.3, 0.55]), w=w, t=0.006, grav=1.5, bias=(-0.35, 0, 0.12), bias_w=0.25,
                off0=0.0105, off1=0.0115, kind='bang', tip_pow=0.6, cup=0.15)
    # 横の房（耳の前・長め・揺れ物）
    side = {}
    for sg, nm in ((1, 'L'), (-1, 'R')):
        th = 66 * sg
        p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th, 30), 0.010)
        C1 = HR.grow(sk, p0, (0.2 * sg, -1, 0.3), 0.19, n=hb.nseg, grav=1.2, off0=0.010, off1=0.012, bias=(0.05 * sg, 0, 0.06), bias_w=0.3)
        bones = HR.chain_bones(Sk, 'ext_side_' + nm, 'head', [C1[int(i)] for i in np.linspace(4, len(C1) - 1, 3)])
        side[nm] = bones
        hb.add(C1, 0.030, 0.007, chain='side_' + nm, kind='lock', hold=0.28, tip_pow=0.7)
        hb.lock(th + 14 * sg, 16, 0.085, d0=(0.1 * sg, -1, 0.1), w=0.024, t=0.006, grav=1.0, off0=0.0095, off1=0.010, kind='lock', tip_pow=0.8)
        hb.lock(th - 18 * sg, 40, 0.11, d0=(0.15 * sg, -1, 0.3), w=0.026, t=0.006, grav=1.3, off0=0.0105, off1=0.0115, kind='bang', tip_pow=0.7)
    cap = HR.scalp_cap(sk, Hc, lambda a: np.interp(a, [0, 40, 70, 100, 130, 180], [ey + 0.062, ey + 0.050, ey + 0.024, ey + 0.016, ey - 0.03, ey - 0.07]), off=0.0075, faces=1500 * lod)
    parts, tex = hb.finish(cap, Sk, {'pony': pony, 'side_L': side['L'], 'side_R': side['R']}, ring=(44.0, 6.0))
    springs = [
        dict(name='ponytail', bones=pony, stiffness=4.0, gravity=0.4, drag=0.5, radius=0.018, colliders=['head', 'neck', 'body', 'back']),
        dict(name='side_L', bones=side['L'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body']),
        dict(name='side_R', bones=side['R'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body']),
    ]
    return dict(parts=parts, textures=tex, springs=springs, ctx={'tie': dict(p=T, d=HR._norm(G[3] - G[0]))})


def hair_white(B, Sk, C, F, lod=1.0, ctx=None):
    """白い乱れた髪（ポニーテールなし）・猫の耳は props の方・毛皮のえり（同じ白の房）"""
    hb = HR.HairBuilder(B, F['H'], C['look'], lod)
    Hc, ey = hb.Hc, hb.ey
    sk = hb.skull
    rng = np.random.default_rng(11)
    whorl = HR.on_scalp(sk, Hc, HR.sph(Hc, 175, 70), 0.01)
    # 上・後ろ：つむじから外へ流れて下りる・先は外へはねる
    roots = [(th, ph) for ph in (66, 46, 26, 4) for th in np.arange(-165, 181, (44 if ph > 50 else 34) * (1 if lod >= 1 else 1.5)) if not (abs(th) < 50 and ph > 20) and not (abs(th) < 70 and ph < 20)]
    for th, ph in roots:
        th = th + rng.uniform(-8, 8)
        p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th, ph), 0.010)
        away = HR._norm(p0 - whorl)
        out = HR._norm(p0 - Hc)
        L = rng.uniform(0.10, 0.15) * (0.85 if ph < 30 else 1.0)
        C1 = HR.grow(sk, p0, away + [0, -0.3, 0], L, n=hb.nseg, grav=1.0, off0=0.010, off1=0.014, curl=out * 0.9 + [0, 0.25, 0])
        hb.add(C1, rng.uniform(0.036, 0.044), 0.007, kind='lock', tip_pow=0.65, cup=0.12)
    # 前髪（長め・乱れ・目の間にも）
    for th, ph, L, w, bx in [(-46, 55, 0.105, 0.030, -0.3), (-30, 62, 0.125, 0.033, -0.25), (-14, 68, 0.135, 0.032, -0.1), (2, 70, 0.14, 0.031, 0.1), (17, 67, 0.13, 0.032, 0.25),
                             (32, 61, 0.12, 0.031, 0.3), (47, 54, 0.105, 0.029, 0.35), (-62, 45, 0.10, 0.026, -0.2), (62, 45, 0.10, 0.026, 0.2), (-8, 76, 0.11, 0.03, 0.0), (10, 76, 0.11, 0.03, 0.05)]:
        hb.lock(th, ph, L, d0=HR._norm(HR.sph(Hc, th, ph - 45) * [1, 0.2, 1] + [0, 0.3, 0.55]), w=w, t=0.0062, grav=1.5, bias=(bx, 0, 0.1), bias_w=0.35,
                off0=0.0115, off1=0.0125, kind='bang', tip_pow=0.6, cup=0.15, curl=(bx * 0.4, 0.2, 0.3))
    side = {}
    for sg, nm in ((1, 'L'), (-1, 'R')):
        th = 66 * sg
        p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th, 30), 0.011)
        C1 = HR.grow(sk, p0, (0.2 * sg, -1, 0.3), 0.15, n=hb.nseg, grav=1.2, off0=0.011, off1=0.013, bias=(0.08 * sg, 0, 0.06), bias_w=0.3, curl=(0.3 * sg, 0.1, 0.2))
        bones = HR.chain_bones(Sk, 'ext_side_' + nm, 'head', [C1[int(i)] for i in np.linspace(4, len(C1) - 1, 3)])
        side[nm] = bones
        hb.add(C1, 0.032, 0.007, chain='side_' + nm, kind='lock', hold=0.28, tip_pow=0.7)
        hb.lock(th + 16 * sg, 14, 0.09, d0=(0.2 * sg, -1, 0.0), w=0.028, t=0.0065, grav=1.0, off0=0.011, off1=0.013, kind='lock', tip_pow=0.7, curl=(0.5 * sg, 0.3, 0))
    # 毛皮のえり（首のまわりの白い短い房）
    J = B['joints']
    nz, ny = J['neck'][2], J['neck'][1]
    nk = 1.0 if lod >= 1 else 0.6
    for layer, (r0, n, L, w, up) in enumerate([(0.092, 16, 0.05, 0.05, 0.75), (0.098, 12, 0.042, 0.048, 0.25)]):
        n = int(n * nk)
        for i in range(n):
            a = 2 * np.pi * (i + 0.37 * layer) / n
            d = np.array([np.sin(a), 0, np.cos(a)])
            p0 = np.array([0, ny - 0.03 + 0.012 * layer, nz]) + d * r0 * np.array([1.0, 1, 0.92])
            dirv = HR._norm(d * 1.0 + [0, up, 0] + rng.normal(0, 0.18, 3))
            pts = np.array([p0 + dirv * L * k + [0, -0.008 * k * k, 0] for k in np.linspace(0, 1, 6)])
            hb.add(pts, w, 0.014, kind='fur', bone='upperChest', flat_out=np.tile(HR._norm(d * 0.3 + [0, 1.0, 0]), (6, 1)), tip_pow=0.45, cup=0.25, root_w=0.95)
    # しっぽ（白・ふさふさ：腰から下へ出て先が上へ）
    hp = J['hips']
    TG = HR.resample(_guide([hp + [0, -0.02, -0.10], hp + [0, -0.07, -0.19], hp + [0.02, -0.17, -0.29], hp + [0.05, -0.24, -0.41], hp + [0.07, -0.22, -0.52], hp + [0.07, -0.14, -0.58]], n=50), 50)
    tb = HR.chain_bones(Sk, 'ext_tail', 'hips', [TG[int(i)] for i in np.linspace(0, len(TG) - 1, 7)])
    tg, e1, e2 = _frame(TG)
    for i in range(10 if lod >= 1 else 7):
        a = 2 * np.pi * i / (10 if lod >= 1 else 7) + rng.uniform(-0.1, 0.1)
        s = np.linspace(0, 1, len(TG))
        r = 0.012 + 0.03 * np.sin(np.pi * np.clip(s * 0.9 + 0.08, 0, 1)) ** 0.8
        Cc = TG + (e1 * np.cos(a) + e2 * np.sin(a)) * r[:, None]
        out = HR._norm(e1 * np.cos(a) + e2 * np.sin(a))
        hb.add(Cc * 1.0, 0.05, 0.016, chain='tail', kind='fur', hold=0.02, parent_bone='hips', flat_out=out, cup=0.1, root_w=0.5, tip_pow=0.6)
    cap = HR.scalp_cap(sk, Hc, lambda a: np.interp(a, [0, 40, 70, 100, 130, 180], [ey + 0.060, ey + 0.048, ey + 0.022, ey + 0.014, ey - 0.03, ey - 0.07]), off=0.009, faces=1400 * lod)
    parts, tex = hb.finish(cap, Sk, {'side_L': side['L'], 'side_R': side['R'], 'tail': tb}, ring=(40.0, 7.0))
    springs = [dict(name='side_L', bones=side['L'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body']),
               dict(name='side_R', bones=side['R'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body']),
               dict(name='tail', bones=tb, stiffness=3.0, gravity=0.12, drag=0.45, radius=0.035, colliders=['body', 'legs'])]
    return dict(parts=parts, textures=tex, springs=springs, ctx={})


def hair_bob(B, Sk, C, F, lod=1.0, ctx=None):
    """相棒：あご丈のボブ（前髪は眉の上・先は内へ丸まる）"""
    hb = HR.HairBuilder(B, F['H'], C['look'], lod)
    Hc, ey = hb.Hc, hb.ey
    sk = hb.skull
    rng = np.random.default_rng(5)
    part = HR.on_scalp(sk, Hc, HR.sph(Hc, 12, 82), 0.01)
    side = {}
    # 横・後ろ：分け目から下へ・あごの高さで内へ
    for th in list(range(-170, 181, 22)):
        if abs(th) < 40:
            continue
        for ph in (62, 34):
            p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th + rng.uniform(-5, 5), ph), 0.012)
            out = HR._norm(p0 - Hc) * [1, 0, 1]
            tgt_y = ey - 0.075 + (0.01 if abs(th) > 120 else 0.0)
            L = max(0.08, p0[1] - tgt_y + 0.03)
            C1 = HR.grow(sk, p0, HR._norm(p0 - part) + [0, -0.6, 0], L, n=hb.nseg, grav=1.3, off0=0.012 + 0.004 * (ph < 40), off1=0.020,
                         curl=-out * 1.4 + [0, 0.2, 0])
            hb.add(C1, 0.046 if ph > 50 else 0.042, 0.008, kind='lock', tip_pow=0.55, cup=0.12)
    # 前髪（まっすぐ・眉の上）
    for th, ph, L, w in [(-44, 55, 0.10, 0.032), (-28, 63, 0.12, 0.034), (-12, 68, 0.13, 0.034), (4, 70, 0.13, 0.033), (20, 66, 0.12, 0.034), (36, 60, 0.11, 0.032), (50, 52, 0.095, 0.03),
                         (-58, 46, 0.09, 0.028), (-4, 76, 0.11, 0.03)]:
        hb.lock(th, ph, L, d0=HR._norm(HR.sph(Hc, th, ph - 45) * [1, 0.2, 1] + [0, 0.3, 0.55]), w=w, t=0.006, grav=1.6, bias=(0.15, 0, 0.1), bias_w=0.2,
                off0=0.0125, off1=0.013, kind='bang', tip_pow=0.5, cup=0.15)
    for sg, nm in ((1, 'L'), (-1, 'R')):
        th = 62 * sg
        p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th, 34), 0.012)
        C1 = HR.grow(sk, p0, (0.15 * sg, -1, 0.35), 0.14, n=hb.nseg, grav=1.3, off0=0.013, off1=0.017, curl=(-0.6 * sg, 0.2, 0.2))
        bones = HR.chain_bones(Sk, 'ext_side_' + nm, 'head', [C1[int(i)] for i in np.linspace(4, len(C1) - 1, 3)])
        side[nm] = bones
        hb.add(C1, 0.04, 0.008, chain='side_' + nm, kind='lock', hold=0.3, tip_pow=0.55)
    cap = HR.scalp_cap(sk, Hc, lambda a: np.interp(a, [0, 40, 70, 100, 130, 180], [ey + 0.060, ey + 0.048, ey + 0.02, ey + 0.0, ey - 0.04, ey - 0.075]), off=0.010, faces=1400 * lod)
    parts, tex = hb.finish(cap, Sk, {'side_L': side['L'], 'side_R': side['R']}, ring=(42.0, 7.0))
    springs = [dict(name='side_L', bones=side['L'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body']),
               dict(name='side_R', bones=side['R'], stiffness=5.0, gravity=0.2, drag=0.55, radius=0.015, colliders=['head', 'neck', 'body'])]
    return dict(parts=parts, textures=tex, springs=springs, ctx={})


def hair_pigtails(B, Sk, C, F, lod=1.0, ctx=None):
    """娘（4 歳・P17）：二つ結び（耳の少し後ろ・揺れ物）・ぱっつんの前髪・上と後ろの髪は結び目へなでつけ"""
    hb = HR.HairBuilder(B, F['H'], C['look'], lod)
    Hc, ey = hb.Hc, hb.ey
    sk = hb.skull
    rng = np.random.default_rng(11)
    ties, chains = {}, {}
    for sg, nm in ((1, 'L'), (-1, 'R')):
        T = HR.on_scalp(sk, Hc, HR.sph(Hc, 108 * sg, 22), 0.016)
        G = _guide([T, T + [0.032 * sg, -0.025, -0.012], T + [0.055 * sg, -0.08, -0.02], T + [0.062 * sg, -0.14, -0.012], T + [0.056 * sg, -0.185, 0.004]], n=44)
        G = HR.resample(G, 44)
        bp = [G[int(i)] for i in np.linspace(0, len(G) - 1, 4)]
        chain = HR.chain_bones(Sk, 'ext_pig_' + nm, 'head', bp)
        chains['pig_' + nm] = chain
        tg, e1, e2 = _frame(G)
        full = len(G)
        nlk = 10 if lod >= 1 else 7
        for i in range(nlk):
            a = 2 * np.pi * i / nlk + rng.uniform(-0.15, 0.15)
            lf = rng.uniform(0.82, 1.0) if i % 3 else 1.0
            k = int(full * lf)
            sv = np.linspace(0, 1, full)[:k] / lf
            r = 0.008 + 0.03 * np.clip(sv / 0.3, 0, 1) ** 0.6 * (1 - 0.55 * sv ** 1.5)
            ca, sa = np.cos(a), np.sin(a)
            Cc = G[:k] + (e1[:k] * ca + e2[:k] * sa) * r[:, None]
            out = HR._norm(e1[:k] * ca + e2[:k] * sa)
            hb.add(Cc, 0.03 * (1.0 if i % 2 == 0 else 0.85), 0.009, chain='pig_' + nm, kind='lock', hold=0.05, flat_out=out, cup=0.16, root_w=0.55, tip_pow=0.8)
        ties[nm] = dict(p=T, d=HR._norm(G[3] - G[0]))
    # 上・後ろの髪を左右の結び目へ（後ろの真ん中で分ける）
    for th in (-172, -150, -128, -106, -84, -62, -44, 44, 62, 84, 106, 128, 150, 172):
        T = ties['L' if th > 0 else 'R']['p']
        for ph in (66, 42, 14):
            if ph == 14 and abs(th) < 100:
                continue
            p0 = HR.on_scalp(sk, Hc, HR.sph(Hc, th, ph), 0.008)
            hb.lock(th, ph, 0.2, d0=HR._norm(T - p0), w=0.046, t=0.006, attract=T, attract_w=2.4, off0=0.0095, off1=0.010, kind='lock', tip_pow=1.3, cup=0.08)
    # 前髪（ぱっつん：眉の上でそろう）
    for th, ph, L, w in [(-50, 54, 0.10, 0.032), (-34, 61, 0.115, 0.034), (-18, 66, 0.125, 0.034), (-2, 68, 0.128, 0.034), (14, 66, 0.125, 0.034), (30, 61, 0.115, 0.034), (46, 55, 0.10, 0.032),
                         (-62, 45, 0.085, 0.028), (60, 46, 0.085, 0.028), (-10, 76, 0.11, 0.03), (8, 76, 0.11, 0.03)]:
        hb.lock(th, ph, L, d0=HR._norm(HR.sph(Hc, th, ph - 45) * [1, 0.2, 1] + [0, 0.3, 0.55]), w=w, t=0.006, grav=1.7, bias=(0.0, 0, 0.1), bias_w=0.2,
                off0=0.0125, off1=0.013, kind='bang', tip_pow=0.45, cup=0.15)
    cap = HR.scalp_cap(sk, Hc, lambda a: np.interp(a, [0, 40, 70, 100, 130, 180], [ey + 0.060, ey + 0.048, ey + 0.022, ey + 0.004, ey - 0.035, ey - 0.07]), off=0.0085, faces=1400 * lod)
    parts, tex = hb.finish(cap, Sk, chains, ring=(42.0, 7.0))
    springs = [dict(name='pig_L', bones=chains['pig_L'], stiffness=3.5, gravity=0.45, drag=0.45, radius=0.016, colliders=['head', 'neck', 'body']),
               dict(name='pig_R', bones=chains['pig_R'], stiffness=3.5, gravity=0.45, drag=0.45, radius=0.016, colliders=['head', 'neck', 'body'])]
    return dict(parts=parts, textures=tex, springs=springs, ctx={'ties': ties})
