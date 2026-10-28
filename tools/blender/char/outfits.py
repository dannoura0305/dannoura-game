# -*- coding: utf-8 -*-
"""
服（キャラクターごと）：体の形（body.py）をふくらませて服の形にし、切って・厚みをつけ・アトラスに焼く。
  dannoura：ピンクと白の横じまのシャツ・ラベンダーのフードつきの上着（前は開く・袖口と裾はリブ・ファスナー）・暗い格子のズボン・スニーカー
  white：黒いフードの服（体に沿う・裾はしまる）・白い十字のベルト・黒いズボン・黒い靴
  companion：オリーブのパーカー（前を少し開ける）・紺と白のボーダーのシャツ・ジーンズ・白いスニーカー
"""
import numpy as np

import sdf as S
import meshops as MO
import paint as PT
import body as BD
import garment as G

SS = S.smoothstep


def _hx(h):
    return PT.hexc(h)


def _tri_part(name, m, N, mat, UVc, weights='body', group='body', smooth_w=2):
    T, _, _ = G.tri_data(m)
    return dict(name=name, V=m.V, T=T, N=N, UVc=UVc, mat=mat, group=group, weights=weights, smooth_w=smooth_w)


class Wardrobe:
    """服のアトラス（2048）と、焼く関数の登録"""

    def __init__(self, size=2048):
        self.A = G.Atlas(size)
        A = self.A
        A.rect('top', 0, 0, 1024, 1024)            # 上着
        A.rect('bottom', 1024, 0, 1024, 1024)      # ズボン
        A.rect('inner', 0, 1024, 768, 768)         # シャツ
        A.rect('shoeL', 768, 1024, 448, 448)
        A.rect('shoeR', 1216, 1024, 448, 448)
        A.rect('extra', 1664, 1024, 384, 448)
        A.swatch_area(0, 1792, 2048, 256, cell=32)
        self.jobs = []       # (UVc, attrs, color_fn, shade_fn)

    def add_bake(self, UVc, P, Nf, kinds, color_fn, extra=None):
        attrs = {'p': P, 'n': Nf, 'k': kinds[:, None].astype(float)}
        if extra:
            attrs.update(extra)
        self.jobs.append((UVc, attrs, color_fn))

    def render(self, bg='#808080'):
        size = self.A.size
        img = np.zeros((size, size, 4))
        img[:] = _hx(bg)
        shade = np.zeros((size, size, 4))
        shade[:] = _hx(bg) * [0.7, 0.65, 0.85, 1]
        allmask = np.zeros((size, size), bool)
        for UVc, attrs, fn in self.jobs:
            mask, A = PT.raster(UVc, (size, size), attrs)
            sel = {k: v[mask] for k, v in A.items()}
            col, sh = fn(sel)
            img[mask] = col
            shade[mask] = sh
            allmask |= mask
        img = PT.dilate(img, allmask, 6)
        shade = PT.dilate(shade, allmask, 6)
        img = self.A.paint_swatches(img)
        for name, (cx, cy, c, col) in self.A.sw.items():
            shade[cy:cy + c, cx:cx + c] = col * np.array(list(self.sw_tint(col)) + [1])
        return img, PT.downsample(shade, 2)

    def sw_tint(self, col):
        return (0.72, 0.66, 0.88)

    def bake_mesh(self, rect, m, T, kinds, Ntri, color_fn, outer_only_uv=True, solid=None):
        """三角形ごと：kinds==0（外）は smart UV で rect へ・他は単色 swatch（solid：{種類: (名前, 色)}）"""
        UVc = np.zeros((len(T), 3, 2))
        sel = np.where(kinds == 0)[0] if outer_only_uv else np.arange(len(T))
        uv = G.uv_islands(m, T, sel)
        UVc[sel] = self.A.map_uv(rect, uv)
        for k, (nm, col) in (solid or {}).items():
            idx = np.where(kinds == k)[0]
            UVc[idx] = self.A.swatch(nm, _hx(col) if isinstance(col, str) else col)
        P = m.V[T]
        self.add_bake(UVc[sel], P[sel], Ntri[sel], kinds[sel], color_fn)
        return UVc


def stripes(t, per, duty=0.5, aa=0.0011, off=0.0):
    """縞（なめらかな縁）：t の周期 per・duty の割合で 1"""
    ph = ((t + off) % per) / per
    d = per * (duty / 2 - np.abs(ph - 0.5))      # 正で縞の中
    return np.clip(0.5 + d / aa, 0, 1)


def _tint(col, t):
    out = col.copy()
    out[..., :3] = col[..., :3] * np.asarray(t)
    return out


# ───────────────────────── だんのうら
def make_shirt(B, W, q, colors=('#fff5fa', '#f29cc4'), rib='#ea86b6', period=0.024, hem=0.835, loose=0.012, rect='inner', sleeves=False):
    """横じまの T シャツ（胴だけ：袖は上着の中）"""
    J = B['joints']
    torso = BD.torso_sdf(B)
    nz = J['neck'][2]
    f = S.offset(torso, lambda P: 0.0045 + loose * SS(1.02, 0.86, P[:, 1]))
    m = G.extract(f, (-0.26, hem - 0.06, -0.17), (0.26, 1.45, 0.15), 0.005, faces=int(1150 * q))
    m = G.cut_plane(m, (0, hem, 0), (0, -1, 0))
    sx = abs(J['leftUpperArm'][0]) + 0.01
    m = G.cut_plane(m, (sx, 0, 0), (1, 0, 0))
    m = G.cut_plane(m, (-sx, 0, 0), (-1, 0, 0))
    nr = B['neckR'] + 0.012

    def neckline(Cc):
        r = np.hypot(Cc[:, 0], (Cc[:, 2] - nz) * 1.05)
        return ((Cc[:, 1] > J['neck'][1] - 0.06) & (r < nr)) | (Cc[:, 1] > J['neck'][1] + 0.035)
    m = G.cut_region(m, neckline, f, smooth_iters=12)
    N = S.normals(f, m.V)
    T, _, _ = G.tri_data(m)
    kinds = np.zeros(len(T), int)
    c0, c1 = _hx(colors[0]), _hx(colors[1])

    def color(A_):
        p = A_['p']
        y = p[:, 1]
        col = PT.mix(c0, c1, stripes(y, period, 0.5))
        r = np.hypot(p[:, 0], (p[:, 2] - nz) * 1.05)
        col = PT.mix(col, _hx(rib), SS(nr + 0.01, nr + 0.005, r) * (y > J['neck'][1] - 0.07))
        return col, _tint(col, (0.8, 0.68, 0.86))
    UVc = W.bake_mesh(rect, m, T, kinds, N[T], color)
    return dict(name='shirt', V=m.V, T=T, N=N, UVc=UVc, mat='CLOTH', group='body', weights='body', smooth_w=2)


def make_jacket(B, W, q, base='#e7e0f7', rib='#d9cff0', rib_line='#cbbfe6', tape='#d2c6ec', teeth='#9e94b8', seam='#b6a6dc', lining='#cfc4e8', edge='#d6caef',
                open_w=0.043, off=0.0105, back=0.004, hem=0.80, boxy=(0.150, 0.17, 0.104), hood=1.0, faces=3000, shade=(0.70, 0.64, 0.90), pockets=True, boxy_y=0.15,
                crease_col='#cdbff0', hood_col=None, extra_paint=None, thick=0.0042, cuff_tight=0.007, rect='top'):
    J = B['joints']
    torso = BD.torso_sdf(B)
    arms = S.union(BD.arm_sdf(B, 1), BD.arm_sdf(B, -1))
    ax = abs(J['leftHand'][0])
    nz = J['neck'][2]
    ny = J['neck'][1]

    def j_off(P):
        x, y, z = np.abs(P[:, 0]), P[:, 1], P[:, 2]
        o = off + back * SS(0.02, -0.08, z) * SS(0.2, 0.1, x)
        o = o - 0.001 * SS(0.2, 0.3, x)
        o = o - cuff_tight * SS(ax - 0.07, ax - 0.03, x)
        o = o - 0.004 * SS(hem + 0.06, hem + 0.01, y) * SS(0.2, 0.12, x)
        # P18：布のしわ（形のしわ：SDF の法線にも出る＝トゥーンの影の線になる）。ひじの内側の斜めのしわ・手首の上のたるみ・わきの下から胸へ流れるしわ・すその上の横じわ
        ex = abs(J['leftLowerArm'][0])
        dy = y - J['leftHand'][1]
        elbow = SS(0.065, 0.0, np.abs(x - ex)) * SS(-0.02, 0.012, z)
        o = o + 0.0026 * elbow * (0.5 + 0.5 * np.sin(x * 105 + dy * 55))
        wrist = SS(ax - 0.14, ax - 0.11, x) * SS(ax - 0.06, ax - 0.085, x)
        o = o + 0.0022 * wrist * (0.5 + 0.5 * np.sin(x * 150 + np.arctan2(dy, z - J['leftHand'][2]) * 2.0))
        uc = J['upperChest'][1]
        pit = SS(0.09, 0.12, x) * SS(abs(J['leftUpperArm'][0]) + 0.01, abs(J['leftUpperArm'][0]) - 0.03, x) * SS(uc - 0.2, uc - 0.12, y) * SS(uc + 0.04, uc - 0.02, y)
        o = o + 0.0018 * pit * (0.5 + 0.5 * np.sin((y + x * 0.9) * 115))
        waistf = SS(hem + 0.04, hem + 0.08, y) * SS(hem + 0.2, hem + 0.12, y) * SS(0.06, 0.12, x)
        o = o + 0.0016 * waistf * (0.5 + 0.5 * np.sin(y * 140 + x * 25))
        return o
    parts = [S.offset(S.union(torso, arms, k=0.035), j_off)]
    f = parts[0]
    if boxy:
        f = S.union(f, S.box((0, hem + boxy_y, -0.012), boxy, r=0.05), k=0.05)
    if hood:
        hk = hood
        hoodf = S.union(S.ellipsoid((0, ny - 0.016, nz - 0.108 * hk), (0.112 * hk, 0.07 * hk, 0.04 * hk)),
                        S.inter(S.torus((0, ny - 0.02, nz + 0.002), 0.084 * (0.9 + 0.1 * hk), 0.017 * hk), S.plane((0, 0, 1), nz + 0.06)), k=0.02)
        f = S.union(f, hoodf, k=0.03)
    m = G.extract(f, (-0.70, hem - 0.05, -0.21), (0.70, ny + 0.10, 0.16), 0.006, faces=int(faces * q))
    m = G.cut_plane(m, (ax - 0.02, 0, 0), (1, 0, 0))
    m = G.cut_plane(m, (-(ax - 0.02), 0, 0), (-1, 0, 0))
    m = G.cut_plane(m, (0, hem, 0), (0, -1, 0))
    if open_w > 0:
        m = MO.bisect(m, (open_w, 0, 0), (1, 0, 0), clear_outer=False)
        m = MO.bisect(m, (-open_w, 0, 0), (1, 0, 0), clear_outer=False)

    def jdrop(Cc):
        r = np.hypot(Cc[:, 0], Cc[:, 2] - nz)
        neck = (Cc[:, 1] > ny - 0.088) & (r < B['neckR'] + 0.017)
        if open_w <= 0:
            return neck
        front = (Cc[:, 2] > 0.0) & (np.abs(Cc[:, 0]) < open_w + 0.012 * SS(ny - 0.17, ny - 0.03, Cc[:, 1])) & (Cc[:, 1] < ny + 0.05)
        return front | neck

    def jsnap(P):
        if open_w <= 0:
            return P
        fr = (P[:, 2] > 0.02) & (np.abs(P[:, 0]) < open_w + 0.03) & (P[:, 1] < ny - 0.12)
        P = P.copy()
        P[fr, 0] = np.sign(P[fr, 0]) * open_w
        return P
    m = G.cut_region(m, jdrop, f, smooth_iters=4, snap=jsnap)
    N = S.normals(f, m.V)
    m2, kinds_f, NN = G.thicken(m, N, thick, band=4)
    T, kinds, _ = G.tri_data(m2, kinds_f)
    hy = J['leftHand'][1]

    def color(A_):
        p = A_['p']
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        axx = np.abs(x)
        col = np.tile(_hx(base), (len(p), 1))
        hemr = y < hem + 0.042
        cuff = axx > ax - 0.062
        ang = np.arctan2(z, x)
        th = np.arctan2(y - hy, z - J['leftHand'][2])
        col[hemr | cuff] = _hx(rib)
        rl = ((np.sin(ang * 90) > 0.6) & hemr) | ((np.sin(th * 26) > 0.6) & cuff)
        col[rl] = _hx(rib_line)
        if open_w > 0:
            front = (z > 0.0) & (axx < open_w + 0.014) & (y < ny - 0.01)
            col[front] = _hx(tape)
            tt = front & (np.abs(axx - open_w - 0.0045) < 0.0022) & (np.sin(y * 2 * np.pi / 0.006) > 0)
            col[tt] = _hx(teeth)
        else:
            front = (z > 0.0) & (axx < 0.007) & (y < ny - 0.04)
            col[front] = _hx(tape)
            col[front & (axx < 0.0022) & (np.sin(y * 2 * np.pi / 0.006) > 0)] = _hx(teeth)
        sm = (np.abs(axx - (abs(J['leftUpperArm'][0]) + 0.014)) < 0.0018) & (y > J['upperChest'][1] - 0.02)
        sm |= (np.abs(z - (nz - 0.004)) < 0.0018) & (axx > 0.07) & (axx < abs(J['leftUpperArm'][0]) + 0.012) & (y > ny - 0.04)
        if pockets:
            pk = (z > 0.03) & (axx > 0.06) & (axx < 0.14)
            sm |= pk & (np.abs((y - (hem + 0.065)) - (axx - 0.06) * 1.05) < 0.0022) & (y > hem + 0.06) & (y < hem + 0.16)
        col[sm] = _hx(seam)
        crease = (axx > 0.40) & (axx < 0.46) & (np.abs(np.sin((axx - 0.40) * 110 + z * 30)) > 0.97) & (y < hy - 0.01)
        crease |= (axx > ax - 0.12) & (axx < ax - 0.075) & (np.abs(np.sin(axx * 140 + th * 2)) > 0.975) & (y < hy)
        col[crease] = PT.mix(col[crease], _hx(crease_col), 0.6)
        if hood_col:
            hr = (y > ny - 0.07) & (z < nz - 0.05)
            col[hr] = PT.mix(col[hr], _hx(hood_col), 0.5)
        if extra_paint:
            col = extra_paint(p, col)
        col[:, :3] *= (0.93 + 0.07 * SS(hem, hem + 0.4, y))[:, None]
        sh = col.copy()
        sh[:, :3] *= np.array(shade)
        return col, sh
    UVc = W.bake_mesh(rect, m2, T, kinds, NN[T], color, solid={1: ('lining_' + lining, lining), 2: ('edge_' + edge, edge)})
    return dict(name='jacket', V=m2.V, T=T, N=NN, UVc=UVc, mat='CLOTH', group='body', weights='body', smooth_w=3), f


def make_pants(B, W, q, pattern='plaid', off=0.011, straight_r=0.053, waist=0.975, hem=0.082, faces=2200, colors=None, rect='bottom'):
    J = B['joints']
    pelvis = S.ellipsoid((0, J['hips'][1] + 0.02, -0.012), (B['hipW'] * 0.43, 0.10, 0.092))
    legs = S.union(BD.leg_sdf(B, 1), BD.leg_sdf(B, -1), k=0.03)
    shp = S.union(legs, pelvis, k=0.05)
    if straight_r:
        straight = S.union(S.round_cone(J['leftLowerLeg'] + [0, 0.05, -0.004], J['leftFoot'] + [0, 0.03, 0.01], straight_r - 0.001, straight_r),
                           S.round_cone(J['rightLowerLeg'] + [0, 0.05, -0.004], J['rightFoot'] + [0, 0.03, 0.01], straight_r - 0.001, straight_r))
        shp = S.union(shp, straight, k=0.04)
    ky = J['leftLowerLeg'][1]

    def p_off(P):
        y, z = P[:, 1], P[:, 2]
        o = off - 0.006 * SS(0.80, 0.90, y)
        # P18：ひざの横じわ（前と裏）・すその上のたまり（形のしわ）
        knee = SS(0.09, 0.0, np.abs(y - ky))
        o = o + 0.002 * knee * (0.5 + 0.5 * np.sin(y * 125 + P[:, 0] * 30 + (z < 0) * 1.3))
        stack = SS(hem + 0.1, hem + 0.06, y) * SS(hem - 0.01, hem + 0.015, y)
        o = o + 0.0024 * stack * (0.5 + 0.5 * np.sin(y * 170 + P[:, 0] * 20))
        return o
    f = S.offset(shp, p_off)
    m = G.extract(f, (-0.23, 0.04, -0.17), (0.23, waist + 0.05, 0.16), 0.006, faces=int(faces * q))
    m = G.cut_plane(m, (0, waist, 0), (0, 1, 0))
    m = G.cut_plane(m, (0, hem, 0), (0, -1, 0))
    m = G.relax_boundary(m, f)
    N = S.normals(f, m.V)
    T, _, _ = G.tri_data(m)
    kinds = np.zeros(len(T), int)
    lx = J['leftUpperLeg'][0]
    C = colors or {}

    def color(A_):
        p = A_['p']
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        leg = y < 0.80
        cx = np.where(x > 0, lx, -lx)
        ang = np.arctan2(x - cx, z)
        u = np.where(leg, ang * 0.06, x + np.where(z > 0, 0, 0.5))
        v = y
        if pattern == 'plaid':
            col = np.tile(_hx(C.get('base', '#2b2338')), (len(p), 1))

            def lines(t, per, w, off=0.0):
                return stripes(t, per, 2 * w / per, aa=0.0012, off=off + per / 2)
            wu, wv = lines(u, 0.064, 0.0075), lines(v, 0.064, 0.0075)
            col = PT.mix(col, _hx('#3d3354'), np.maximum(wu, wv))
            col = PT.mix(col, _hx('#4b4066'), wu * wv)
            col = PT.mix(col, _hx('#7a68a6'), np.maximum(lines(u, 0.064, 0.0012, 0.022), lines(v, 0.064, 0.0012, 0.022)))
            col = PT.mix(col, _hx('#b07aa8'), np.maximum(lines(u, 0.128, 0.0009, 0.045), lines(v, 0.128, 0.0009, 0.045)))
            col[y < hem + 0.033, :3] *= 0.85
            tint = (0.7, 0.64, 0.86)
        elif pattern == 'jeans':
            col = np.tile(_hx(C.get('base', '#40609a')), (len(p), 1))
            # 綾の細い斜め線・横の縫い目・ひざの色落ち・裾のロールアップ
            tw = 0.5 + 0.5 * np.sin((u * 0.7 + v) * 2 * np.pi / 0.004)
            col[:, :3] *= (0.94 + 0.06 * tw)[:, None]
            fade = SS(0.09, 0.0, np.abs(y - 0.47)) * SS(-0.2, 0.6, np.cos(ang)) * leg
            col = PT.mix(col, _hx(C.get('fade', '#7090c4')), fade * 0.45)
            side = leg & (np.abs(np.abs(ang) - np.pi / 2) < 0.06)
            col = PT.mix(col, _hx(C.get('seam', '#c89a50')), side * 0.8)
            roll = y < hem + 0.05
            col[roll] = _hx(C.get('roll', '#5878b0'))
            col[roll & (np.abs(y - (hem + 0.05)) < 0.0025)] = _hx(C.get('seam', '#c89a50'))
            wb = y > waist - 0.035
            col[wb] = _hx(C.get('base', '#40609a')) * [0.9, 0.9, 0.95, 1]
            tint = (0.66, 0.66, 0.86)
        else:
            col = np.tile(_hx(C.get('base', '#1a1720')), (len(p), 1))
            band = leg & (np.abs(np.abs(ang) - np.pi / 2) < 0.12)
            if C.get('stripe'):
                col = PT.mix(col, _hx(C['stripe']), band * 1.0)
            for yy in C.get('rings', []):
                col[np.abs(y - yy) < 0.008] = _hx(C.get('stripe', '#f0ecf8'))
            col[y < hem + 0.025, :3] *= 0.8
            tint = (0.72, 0.66, 0.92)
        return col, _tint(col, tint)
    UVc = W.bake_mesh(rect, m, T, kinds, N[T], color)
    return dict(name='trousers', V=m.V, T=T, N=N, UVc=UVc, mat='CLOTH', group='body', weights='body', smooth_w=3)


# ───────────────────────── だんのうら
def outfit_dannoura(B, Sk, C, F, lod=1.0, wardrobe=None, ctx=None):
    W = wardrobe or Wardrobe()
    q = lod
    parts = [make_shirt(B, W, q)]
    jk, f_jk = make_jacket(B, W, q, hood_col='#d8cdf2')
    parts.append(jk)
    parts.append(make_pants(B, W, q, pattern='plaid'))
    parts += shoes(B, W, q, upper='#3a3346', accent='#b9a6e6', sole='#f3f1f7', lace='#f6f4fa')
    img, shade = W.render()
    return dict(parts=parts, textures={'cloth': img, 'cloth_shade': shade}, ctx={'f_jacket': f_jk, 'nz': B['joints']['neck'][2], 'back_z': -0.142})


# ───────────────────────── 白い姿（黒いフードの服・白い十字のベルト）
def outfit_white(B, Sk, C, F, lod=1.0, wardrobe=None, ctx=None):
    W = wardrobe or Wardrobe()
    q = lod
    J = B['joints']

    def white_bands(p, col):
        y = p[:, 1]
        axx = np.abs(p[:, 0])
        # 袖の白い帯
        for yy in (0.0,):
            pass
        band = (axx > 0.47) & (axx < 0.50)
        col[band] = _hx('#ece8f6')
        col[band & (np.abs(axx - 0.485) < 0.002)] = _hx('#cfc8e2')
        return col
    jk, f_jk = make_jacket(B, W, q, base='#1d1924', rib='#25202e', rib_line='#2e2838', tape='#2a2434', teeth='#8e88a4', seam='#3a3348', lining='#2a2434', edge='#2c2636',
                           open_w=0.0, off=0.0062, back=0.002, hem=0.83, boxy=(0.155, 0.065, 0.098), boxy_y=0.06, hood=0.6, shade=(0.62, 0.56, 0.86), pockets=False, crease_col='#2c2638',
                           extra_paint=white_bands, cuff_tight=0.003)
    parts = [jk]
    parts.append(make_pants(B, W, q, pattern='black', off=0.0075, straight_r=0.047, colors={'base': '#18151f', 'stripe': '#ece8f6', 'rings': [0.62, 0.66]}))
    parts += shoes(B, W, q, upper='#1f1b26', accent='#ece8f6', sole='#e9e6f0', lace='#3a3446', toe='#2a2532')
    img, shade = W.render()
    return dict(parts=parts, textures={'cloth': img, 'cloth_shade': shade}, ctx={'f_jacket': f_jk, 'nz': J['neck'][2], 'back_z': -0.13})


# ───────────────────────── 相棒（オリーブのパーカー・ボーダー・ジーンズ）
def outfit_companion(B, Sk, C, F, lod=1.0, wardrobe=None, ctx=None):
    W = wardrobe or Wardrobe()
    q = lod
    J = B['joints']
    parts = [make_shirt(B, W, q, colors=('#f3f5fa', '#26335c'), rib='#26335c', period=0.020, hem=0.80, loose=0.010)]
    jk, f_jk = make_jacket(B, W, q, base='#6e7a48', rib='#646f40', rib_line='#5a6438', tape='#5f6a3d', teeth='#c8c4b0', seam='#59633a', lining='#8a7a5a', edge='#646f42',
                           open_w=0.034, off=0.0092, back=0.003, hem=0.74, boxy=(0.168, 0.20, 0.106), hood=0.9, shade=(0.66, 0.64, 0.84), crease_col='#5f6a3e', hood_col='#66713f')
    parts.append(jk)
    parts.append(make_pants(B, W, q, pattern='jeans', off=0.0085, straight_r=0.05, waist=0.94))
    parts += shoes(B, W, q, upper='#f2f0f4', accent='#c9c4d4', sole='#ffffff', lace='#e8e4ee', toe='#e8e6ee')
    img, shade = W.render()
    return dict(parts=parts, textures={'cloth': img, 'cloth_shade': shade}, ctx={'f_jacket': f_jk, 'nz': J['neck'][2], 'back_z': -0.13})


def shoes(B, W, q, upper, accent, sole, lace, toe=None):
    J = B['joints']
    out = []
    for side, rect in (('left', 'shoeL'), ('right', 'shoeR')):
        sx = 1 if side == 'left' else -1
        f, t = J[side + 'Foot'], J[side + 'Toes']
        foot = BD.foot_sdf(B, sx)
        sl = S.box((f[0] + sx * 0.002, 0.0125, (f[2] - 0.065 + t[2] + 0.075) / 2), (0.047, 0.0125, (t[2] + 0.075 - f[2] + 0.065) / 2), r=0.011)
        shoe = S.union(S.offset(foot, 0.0085), sl, k=0.012)
        shoe = S.inter(shoe, S.plane((0, 1, 0), 0.118))
        lo = np.array([f[0] - 0.08, -0.01, f[2] - 0.11])
        hi = np.array([f[0] + 0.08, 0.13, t[2] + 0.11])
        m = G.extract(shoe, lo, hi, 0.0022, decimate_to=1150 * q)
        N = S.normals(shoe, m.V)
        T, _, _ = G.tri_data(m)
        kinds = np.zeros(len(T), int)
        fz, tz = f[2], t[2]

        def col_fn(A_, fx=f[0]):
            p = A_['p']
            x, y, z = p[:, 0], p[:, 1], p[:, 2]
            col = np.tile(_hx(upper), (len(p), 1))
            solem = y < 0.026
            col[solem] = _hx(sole)
            col[(y > 0.0215) & (y < 0.0265)] = _hx('#c9c4d6')
            toecap = (z > tz + 0.035) & (y < 0.055) & ~solem
            col[toecap] = _hx(toe or sole)
            lacem = (np.abs(x - fx) < 0.022) & (z > fz + 0.03) & (z < tz + 0.03) & (y > 0.055)
            stripes = lacem & (np.sin(z * 2 * np.pi / 0.016) > 0.1)
            col[lacem] = PT.mix(col[lacem], _hx(upper) * [0.8, 0.8, 0.8, 1], 0.5)
            col[stripes] = _hx(lace)
            side_s = (np.abs(x - fx) > 0.03) & (y > 0.03) & (y < 0.07) & (np.abs((z - fz) * 0.5 - (y - 0.03) * 1.2) < 0.008)
            col[side_s] = _hx(accent)
            heel = (z < fz - 0.03) & (y > 0.05)
            col[heel] = _hx(accent)
            return col, _tint(col, (0.72, 0.68, 0.88))
        UVc = W.bake_mesh(rect, m, T, kinds, N[T], col_fn)
        out.append(dict(name=side + '_shoe', V=m.V, T=T, N=N, UVc=UVc, mat='CLOTH', group='body', weights='body', smooth_w=1))
    return out


# ───────────────────────── 娘（P17：4 歳・ピンクのワンピース・白いえり・白いくつした・ピンクのくつ）
def outfit_daughter(B, Sk, C, F, lod=1.0, wardrobe=None, ctx=None):
    """大人の寸法（female）で作り、build_char の全体の縮尺（C['scale']）と頭の大きさ（headScale）で子どもの体つきにする。
    ワンピース：胴をふくらませた形＋ふんわりした A ラインのすそ（ひざの上）＋ちょうちん袖。腕と脚は肌（くつしたは白）"""
    W = wardrobe or Wardrobe()
    q = lod
    J = B['joints']
    torso = BD.torso_sdf(B)
    hy = J['hips'][1]
    hem = 0.555
    nz = J['neck'][2]
    skirt = S.round_cone((0, hy + 0.08, -0.012), (0, hem - 0.03, -0.012), 0.155, 0.285)
    sleeves = S.union(S.offset(BD.arm_sdf(B, 1), lambda P: 0.022 + 0.01 * SS(0.17, 0.22, np.abs(P[:, 0]))), S.offset(BD.arm_sdf(B, -1), lambda P: 0.022 + 0.01 * SS(0.17, 0.22, np.abs(P[:, 0]))))
    f = S.union(S.union(S.offset(torso, 0.009), skirt, k=0.07), sleeves, k=0.025)
    m = G.extract(f, (-0.45, hem - 0.06, -0.32), (0.45, 1.45, 0.32), 0.005, faces=int(2600 * q))
    m = G.cut_plane(m, (0, hem, 0), (0, -1, 0))
    sx = abs(J['leftUpperArm'][0]) + 0.085
    m = G.cut_plane(m, (sx, 0, 0), (1, 0, 0))
    m = G.cut_plane(m, (-sx, 0, 0), (-1, 0, 0))
    nr = B['neckR'] + 0.014

    def neckline(Cc):
        r = np.hypot(Cc[:, 0], (Cc[:, 2] - nz) * 1.05)
        return ((Cc[:, 1] > J['neck'][1] - 0.06) & (r < nr)) | (Cc[:, 1] > J['neck'][1] + 0.035)
    m = G.cut_region(m, neckline, f, smooth_iters=12)
    m = G.relax_boundary(m, f)
    N = S.normals(f, m.V)
    T, _, _ = G.tri_data(m)
    kinds = np.zeros(len(T), int)
    PINK, PINK2, WHITE = _hx('#f4a6c4'), _hx('#e58aae'), _hx('#fff4f8')

    def color(A_):
        p = A_['p']
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        col = np.tile(PINK, (len(p), 1))
        ang = np.arctan2(x, z - nz)
        skirt_m = y < hy + 0.02
        col[:, :3] *= (1 - 0.07 * (0.5 + 0.5 * np.sin(ang * 16)) * skirt_m)[:, None]          # すそのひだの濃淡
        dots = (np.sin(x * 260) * np.sin(y * 260) > 0.93) & ~skirt_m
        col[dots] = PT.mix(col[dots], WHITE, 0.5)
        r = np.hypot(x, (z - nz) * 1.05)
        collar = (y > J['neck'][1] - 0.075) & (r < nr + 0.06)
        col[collar] = WHITE
        col[collar & (np.abs(r - (nr + 0.058)) < 0.004)] = _hx('#f0c8d8')
        ribbon = (np.abs(x) < 0.028) & (np.abs(y - (J['neck'][1] - 0.09)) < 0.014) & (z > nz)
        col[ribbon] = _hx('#e8507e')
        trim = y < hem + 0.028 + 0.006 * np.sin(ang * 26)
        col[trim] = WHITE
        cuff = np.abs(x) > sx - 0.02
        col[cuff] = WHITE
        return col, _tint(col, (0.86, 0.7, 0.82))
    UVc = W.bake_mesh('top', m, T, kinds, N[T], color)
    parts = [dict(name='dress', V=m.V, T=T, N=N, UVc=UVc, mat='CLOTH', group='body', weights='body', smooth_w=3)]
    SKIN, SOCK = _hx('#ffe8dc'), _hx('#fffaf6')
    # 腕（袖の先から手首まで：肌）
    for sd, rect in ((1, 'inner'), (-1, 'extra')):
        fa = S.offset(BD.arm_sdf(B, sd), 0.006)                             # 子どもの腕（少しふっくら）
        ma = G.extract(fa, (0.1 if sd > 0 else -0.75, 1.15, -0.15), (0.75 if sd > 0 else -0.1, 1.45, 0.15), 0.004, faces=int(900 * q))
        ma = G.cut_plane(ma, (sd * (sx - 0.035), 0, 0), (-sd, 0, 0))
        Na = S.normals(fa, ma.V)
        Ta, _, _ = G.tri_data(ma)

        def acol(A_):
            col = np.tile(SKIN, (len(A_['p']), 1))
            return col, _tint(col, (0.95, 0.76, 0.76))
        UVa = W.bake_mesh(rect, ma, Ta, np.zeros(len(Ta), int), Na[Ta], acol)
        parts.append(dict(name='arm_' + ('L' if sd > 0 else 'R'), V=ma.V, T=Ta, N=Na, UVc=UVa, mat='CLOTH', group='body', weights='body', smooth_w=2))
    # 脚（すその中から足首まで：肌・白いくつした）
    fl = S.offset(S.union(BD.leg_sdf(B, 1), BD.leg_sdf(B, -1), k=0.0), lambda P: 0.009 * SS(0.12, 0.3, P[:, 1]))   # 子どもの脚（ふっくら・足首は細いまま）
    ml = G.extract(fl, (-0.2, 0.03, -0.14), (0.2, hem + 0.1, 0.14), 0.004, faces=int(1500 * q))
    ml = G.cut_plane(ml, (0, hem + 0.08, 0), (0, 1, 0))
    Nl = S.normals(fl, ml.V)
    Tl, _, _ = G.tri_data(ml)

    def lcol(A_):
        p = A_['p']
        y = p[:, 1]
        col = np.tile(SKIN, (len(p), 1))
        knee = SS(0.05, 0.0, np.abs(y - J['leftLowerLeg'][1])) * (p[:, 2] > 0)
        col = PT.mix(col, _hx('#ffc8c0'), knee * 0.35)
        sock = y < 0.2
        col[sock] = SOCK
        col[sock & (y > 0.18)] = _hx('#f4e8ee')
        col[sock & (np.sin(y * 900) > 0.6) & (y > 0.16)] = _hx('#efe2ea')
        return col, _tint(col, (0.95, 0.78, 0.8))
    UVl = W.bake_mesh('bottom', ml, Tl, np.zeros(len(Tl), int), Nl[Tl], lcol)
    parts.append(dict(name='legs', V=ml.V, T=Tl, N=Nl, UVc=UVl, mat='CLOTH', group='body', weights='body', smooth_w=2))
    parts += shoes(B, W, q, upper='#e86a8a', accent='#f6b0c4', sole='#f6f2f2', lace='#e86a8a', toe='#f08aa4')
    img, shade = W.render()
    return dict(parts=parts, textures={'cloth': img, 'cloth_shade': shade}, ctx={'f_jacket': f, 'nz': nz, 'back_z': -0.12})
