# わかば matgen：材質（PBR の組）の作り方。1 つの関数＝1 つの材質。全部「種」で決まり、上下左右につながる。
# 返す物：{ albedo:(n,n,3) sRGB 0〜1, height:(n,n) 0〜1, rough:(n,n) 0〜1, alpha?:(n,n), ao?:(n,n), nstr: 法線の強さ }
# 値の目安（写実）：自然の物の色は sRGB で 0.1〜0.6（真っ白・真っ黒にしない）・粗さは 0.75〜0.95（プラスチックに見えない）。
import numpy as np
from tex import (spectral, blur, worley, warp, sample, smooth, lerp, col, ramp, fill, Stamper, rot, leaf_shape,
                 norm01, rng, grade, cavity_ao, cellrand)


# ───────────────────────── 共通の小さな形 ─────────────────────────
def needle_fn(width=0.12, curl=0.15):
    def fn(u, v):
        w = width * (1 - np.abs(u) ** 3)
        cov = ((np.abs(v) < w) & (np.abs(u) < 1)).astype(np.float32)
        return cov, curl * (1 - np.abs(u) ** 2)
    return fn


def blade_fn(width=0.08, curl=0.1, taper=1.0):
    def fn(u, v):
        t = (u + 1) / 2
        w = width * (1 - t ** taper * 0.95)
        cov = ((np.abs(v) < w) & (np.abs(u) < 1)).astype(np.float32)
        return cov, curl * (1 - (v / np.maximum(w, 1e-3)) ** 2) * 0.5 + 0.2 * t
    return fn


def blob_fn(r=0.9, bump=0.5, rough_edge=None):
    def fn(u, v):
        d = np.hypot(u, v)
        if rough_edge is not None:
            a = np.arctan2(v, u)
            d = d * (1 + rough_edge * np.sin(a * 5 + r * 7) * 0.5 + rough_edge * 0.3 * np.sin(a * 11))
        cov = (d < r).astype(np.float32)
        return cov, bump * np.sqrt(np.clip(1 - (d / r) ** 2, 0, 1))
    return fn


def jitter_color(base, r, amt=0.08):
    return np.clip(base * (1 + (r.random(3) - 0.5) * amt) * (1 + (r.random() - 0.5) * amt * 2), 0, 1)


def scatter_leaves(S, r, count, size, colors, kinds=('ovate', 'lance'), zr=(0.3, 0.7), curl=0.3, flat=1.0):
    n = S.n
    zs = np.sort(r.uniform(zr[0], zr[1], count))
    for k in range(count):
        cx, cy = r.uniform(0, n), r.uniform(0, n)
        half = r.uniform(*size)
        a = r.uniform(0, np.pi * 2)
        kind = kinds[r.integers(len(kinds))]
        base = leaf_shape(kind, curl * r.uniform(0.3, 1.0))
        sq = r.uniform(0.6, 1.0) * flat
        c0 = jitter_color(colors[r.integers(len(colors))], r, 0.25)
        vein_dark = r.uniform(0.75, 0.92)

        def fn(u, v, a=a, base=base, sq=sq):
            uu, vv = rot(u, v, a)
            return base(uu, vv / sq)

        def colf(u, v, a=a, c0=c0, vein_dark=vein_dark):
            uu, vv = rot(u, v, a)
            shade = 1 - 0.18 * np.clip(np.abs(vv) * 1.6, 0, 1) + 0.06 * uu
            vein = np.where(np.abs(vv) < 0.035, vein_dark, 1.0)
            return c0[None, None, :] * (shade * vein)[..., None]
        S.stamp(cx, cy, half, fn, zs[k], colf, extra=r.uniform(0.7, 0.9))


def scatter_strokes(S, r, count, size, colors, width=0.1, zr=(0.3, 0.8), curl=0.1, angle=None, extra=0.85, fn_maker=None):
    n = S.n
    zs = np.sort(r.uniform(zr[0], zr[1], count))
    for k in range(count):
        cx, cy = r.uniform(0, n), r.uniform(0, n)
        half = r.uniform(*size)
        a = r.uniform(0, np.pi * 2) if angle is None else angle + r.normal(0, 0.15)
        base = (fn_maker or needle_fn)(width * r.uniform(0.7, 1.3), curl)
        c0 = jitter_color(colors[r.integers(len(colors))], r, 0.3)

        def fn(u, v, a=a, base=base):
            uu, vv = rot(u, v, a)
            return base(uu, vv)

        def colf(u, v, a=a, c0=c0):
            uu, vv = rot(u, v, a)
            return c0[None, None, :] * (0.85 + 0.15 * (uu[..., None] * 0.5 + 0.5))
        S.stamp(cx, cy, half, fn, zs[k], colf, extra=extra)


# ───────────────────────── 地面 ─────────────────────────
def forest_floor(n, seed):
    """森の床：湿った黒い土＋広葉樹の落ち葉（朽ちた茶・黄土）＋杉の落ち葉（赤茶の針）＋小枝＋薄い苔"""
    r = rng(seed)
    big = spectral(n, seed + ':big', beta=2.6, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.2, fmin=8)
    soil_h = 0.18 * big + 0.08 * fine
    soil_c = ramp(0.6 * big + 0.4 * fine, [(0, '#1f1810'), (0.5, '#33271b'), (1, '#4a3a28')])
    S = Stamper(n, soil_h, soil_c)
    S.extra[:] = 0.92
    browns = [col('#5a3f22'), col('#6e4c27'), col('#7d5a2e'), col('#4a3420'), col('#8a6a3a'), col('#3b2a1a'), col('#6b5a3a')]
    scatter_leaves(S, r, 1100, (12, 30), browns, zr=(0.3, 0.62), curl=0.25)
    needles = [col('#6a3a1e'), col('#7a4a26'), col('#5a3220'), col('#8a5a30')]
    scatter_strokes(S, r, 2600, (7, 13), needles, width=0.09, zr=(0.32, 0.75), curl=0.08, extra=0.8)
    twigs = [col('#3a2a1c'), col('#2e241a'), col('#4a3a2a')]
    scatter_strokes(S, r, 70, (30, 70), twigs, width=0.05, zr=(0.55, 0.85), curl=0.15, extra=0.85)
    # 薄い苔のしみ（低い所）
    moss_m = smooth(0.62, 0.8, spectral(n, seed + ':moss', beta=2.4, fmin=2)) * (1 - S.m * 0.7)
    moss_c = ramp(spectral(n, seed + ':mc', beta=1.0, fmin=16), [(0, '#2c3a17'), (1, '#4c5a24')])
    alb = lerp(S.c, moss_c, moss_m * 0.85)
    h = S.h + moss_m * 0.05 * fine
    rough = np.clip(S.extra - 0.05 * moss_m, 0, 1)
    alb = grade(alb, contrast=1.05, sat=0.9)
    return dict(albedo=alb, height=norm01(h), rough=rough, nstr=5.0, ao_radii=(2, 5, 12), ao_power=1.4)


def moss(n, seed):
    """苔：小さなクッションの集まり（濃い緑〜黄緑・先が明るい）"""
    F1, F2, ID = worley(n, 34, seed + ':w', jitter=0.9)
    F1b, _, _ = worley(n, 90, seed + ':w2', jitter=1.0)
    fine = spectral(n, seed + ':fine', beta=0.8, fmin=40)
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=3)
    cush = np.sqrt(np.clip(1 - (F1 / 0.75) ** 2, 0, 1))
    tiny = np.sqrt(np.clip(1 - (F1b / 0.8) ** 2, 0, 1))
    h = 0.5 * cush + 0.25 * tiny + 0.25 * fine
    idr = cellrand(ID, seed)
    t = np.clip(0.35 * idr + 0.45 * h + 0.2 * mid, 0, 1)
    alb = ramp(t, [(0, '#1b2410'), (0.35, '#2f3d16'), (0.7, '#4f6022'), (1, '#7a8236')])
    dry = smooth(0.7, 0.9, spectral(n, seed + ':dry', beta=2.2, fmin=2))
    alb = lerp(alb, alb * np.array([1.25, 1.05, 0.7]), dry * 0.6)
    rough = 0.88 + 0.08 * fine
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=4.0, ao_radii=(1, 3, 8), ao_power=1.6)


def grass_ground(n, seed):
    """草地（上から）：細い葉が寝たり立ったり・緑〜枯れ草の黄土・すき間の土"""
    r = rng(seed)
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    soil_c = ramp(spectral(n, seed + ':s', beta=1.5, fmin=4), [(0, '#231b12'), (1, '#3c3020')])
    S = Stamper(n, 0.1 * big, soil_c)
    S.extra[:] = 0.92
    greens = [col('#3d4a1f'), col('#4b5a25'), col('#56602a'), col('#343f1a'), col('#6b6a32')]
    dry = [col('#7d7040'), col('#8a7b4a'), col('#6e6338')]
    scatter_strokes(S, r, 5200, (10, 26), greens, width=0.07, zr=(0.2, 0.9), curl=0.12, extra=0.82, fn_maker=blade_fn)
    scatter_strokes(S, r, 1500, (10, 28), dry, width=0.07, zr=(0.2, 0.95), curl=0.1, extra=0.88, fn_maker=blade_fn)
    alb = lerp(S.c, S.c * np.array([1.15, 1.05, 0.8]), smooth(0.55, 0.85, big) * 0.6)
    return dict(albedo=grade(alb, sat=0.92), height=norm01(S.h), rough=S.extra, nstr=4.0, ao_radii=(1, 4, 10), ao_power=1.5)


def gravel_path(n, seed):
    """砂利の道：丸みのある小石（灰・茶・白っぽい）と細かい砂利・間の灰茶の土"""
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    soil_c = ramp(spectral(n, seed + ':s', beta=1.4, fmin=6), [(0, '#3e3830'), (1, '#5e564a')])
    h = 0.12 * big
    alb = soil_c.copy()
    rough = np.full((n, n), 0.92, np.float32)
    for cells, scale, zb, sd in ((26, 0.62, 0.35, ':a'), (52, 0.58, 0.25, ':b'), (110, 0.55, 0.12, ':c')):
        F1, F2, ID = worley(n, cells, seed + sd, jitter=0.95)
        idr = cellrand(ID, seed + sd)
        idr2 = cellrand(ID, seed + sd + ':2')
        rad = scale * (0.75 + 0.5 * idr2)
        dome = np.sqrt(np.clip(1 - (F1 / rad) ** 2, 0, 1))
        stone = dome > 0
        sh = zb + 0.35 * dome * (0.6 + 0.4 * idr2)
        top = stone & (sh > h)
        t = idr
        sc = ramp(t, [(0, '#5c5a56'), (0.3, '#77736b'), (0.55, '#8a8378'), (0.75, '#6a5a48'), (0.9, '#a39c90'), (1, '#4a4844')])
        sc = sc * (0.85 + 0.15 * dome)[..., None]
        alb = np.where(top[..., None], sc, alb)
        rough = np.where(top, 0.78 + 0.1 * idr2, rough)
        h = np.where(top, sh, h)
    dirt = smooth(0.55, 0.8, spectral(n, seed + ':dirt', beta=2.0, fmin=3))
    alb = lerp(alb, alb * np.array([0.85, 0.78, 0.68]), dirt * 0.5)
    return dict(albedo=alb, height=norm01(h), rough=rough, nstr=6.0, ao_radii=(1, 3, 8), ao_power=1.8)


def dirt_path(n, seed):
    """踏み固めた土の道：茶色・大きなうねり・まばらな小石・細いひび・湿ったしみ"""
    big = spectral(n, seed + ':big', beta=2.8, fmin=1)
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=4)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=20)
    h = 0.35 * big + 0.2 * mid + 0.08 * fine
    alb = ramp(0.5 * mid + 0.3 * big + 0.2 * fine, [(0, '#3a2c1e'), (0.5, '#54412c'), (1, '#6e5a40')])
    F1, F2, ID = worley(n, 70, seed + ':p', jitter=1.0)
    idr = cellrand(ID, seed)
    peb = (idr < 0.25) & (F1 < 0.3 + 0.1 * idr)
    dome = np.sqrt(np.clip(1 - (F1 / (0.3 + 0.1 * idr)) ** 2, 0, 1)) * peb
    h = h + 0.18 * dome
    alb = np.where(peb[..., None], ramp(idr * 4, [(0, '#5a5650'), (1, '#7e786c')]), alb)
    cF1, cF2, _ = worley(n, 7, seed + ':c', jitter=1.0)
    crack = 1 - smooth(0.0, 0.025, warp(cF2 - cF1, spectral(n, seed + ':wx', 2, 4), spectral(n, seed + ':wy', 2, 4), 30))
    crack *= smooth(0.45, 0.7, spectral(n, seed + ':cm', 2.2, 2))
    h = h - 0.12 * crack
    alb = alb * (1 - 0.35 * crack)[..., None]
    wet = smooth(0.6, 0.85, spectral(n, seed + ':wet', 2.6, 1)) * (1 - smooth(0.4, 0.7, h))
    alb = alb * (1 - 0.3 * wet)[..., None]
    rough = 0.92 - 0.25 * wet - 0.08 * peb
    return dict(albedo=alb, height=norm01(h), rough=rough, nstr=4.0, ao_radii=(2, 6, 14), ao_power=1.2)


# ───────────────────────── 岩 ─────────────────────────
def lichen_layer(n, seed, alb, h, rough, amount=0.5, colors=('#8f9a7a', '#a7ab92', '#c9c6b4', '#7d8a66')):
    F1, F2, ID = worley(n, 60, seed + ':lw', jitter=1.0)
    idr = cellrand(ID, seed)
    mask = smooth(1 - amount, 1 - amount + 0.25, spectral(n, seed + ':lm', beta=2.2, fmin=2))
    spot = (F1 < 0.55 * (0.5 + idr)) * mask
    spot = blur(spot.astype(np.float32), 1.0)
    edge = smooth(0.3, 0.6, spot)
    lc = ramp(idr, [(0, colors[0]), (0.4, colors[1]), (0.8, colors[2]), (1, colors[3])])
    rare = (idr > 0.93)[..., None]
    lc = np.where(rare, col('#b07a3a'), lc)
    return lerp(alb, lc, edge * 0.85), h + 0.03 * edge, np.clip(rough + 0.08 * edge, 0, 1)


def rock_andesite(n, seed):
    """安山岩：暗い青灰・割れ目・節理・地衣類（淡い緑灰・白・まれに橙）"""
    big = spectral(n, seed + ':big', beta=2.8, fmin=1)
    mid = spectral(n, seed + ':mid', beta=2.2, fmin=4)
    fine = spectral(n, seed + ':fine', beta=1.1, fmin=24)
    ridged = 1 - np.abs(spectral(n, seed + ':rd', beta=2.0, fmin=3) * 2 - 1)
    F1, F2, ID = worley(n, 9, seed + ':cr', jitter=1.0)
    wx, wy = spectral(n, seed + ':wx', 2.2, 3), spectral(n, seed + ':wy', 2.2, 3)
    edge = warp(F2 - F1, wx, wy, 60)
    crack = 1 - smooth(0.0, 0.05, edge)
    facet = cellrand(ID, seed)
    h = 0.45 * big + 0.2 * mid + 0.15 * ridged + 0.08 * fine + 0.12 * warp(facet, wx, wy, 60) - 0.35 * crack
    t = 0.45 * mid + 0.3 * fine + 0.25 * warp(facet, wx, wy, 60)
    alb = ramp(t, [(0, '#2a2b2c'), (0.4, '#3d3e3f'), (0.7, '#55554f'), (1, '#6c6a62')])
    alb = alb * (1 - 0.5 * crack)[..., None]
    stain = smooth(0.55, 0.85, spectral(n, seed + ':st', 2.4, 2))
    alb = lerp(alb, alb * np.array([1.12, 1.0, 0.85]), stain * 0.6)
    rough = 0.82 + 0.1 * fine
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.45)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=7.0, ao_radii=(2, 6, 18), ao_power=1.5)


def cliff(n, seed):
    """崖の面：横の地層（うねる）・縦の割れ目・割れ目の苔と土。三面投影で地形の急な所に貼る"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    wx, wy = spectral(n, seed + ':wx', 2.4, 2), spectral(n, seed + ':wy', 2.4, 2)
    band_noise = spectral(n, seed + ':band', beta=2.0, fmin=1, aniso=(1.0, 0.04))
    strata = np.sin((ys / n) * np.pi * 2 * 7 + (wy - 0.5) * 6 + band_noise * 5) * 0.5 + 0.5
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=4)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=30)
    vert = spectral(n, seed + ':vert', beta=1.8, fmin=2, aniso=(0.08, 1.0))
    F1, F2, ID = worley(n, 6, seed + ':cr', jitter=1.0, aspect=(1.0, 0.45))
    crack = 1 - smooth(0.0, 0.04, warp(F2 - F1, wx, wy, 80))
    blocky = cellrand(ID, seed)
    h = 0.3 * strata + 0.25 * mid + 0.15 * vert + 0.1 * fine + 0.15 * warp(blocky, wx, wy, 80) - 0.4 * crack
    t = 0.4 * strata + 0.3 * mid + 0.3 * fine
    alb = ramp(t, [(0, '#2e2924'), (0.35, '#463d34'), (0.7, '#5f554a'), (1, '#7a6f60')])
    alb = alb * (1 - 0.45 * crack)[..., None]
    ledge = smooth(0.55, 0.75, strata) * smooth(0.5, 0.75, spectral(n, seed + ':lm', 2.0, 3))
    mossc = ramp(fine, [(0, '#2b3517'), (1, '#4a5524')])
    alb = lerp(alb, mossc, np.clip(ledge * 0.7 + crack * 0.5 * smooth(0.4, 0.7, mid), 0, 1))
    rough = 0.86 + 0.08 * fine
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.25)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=7.0, ao_radii=(2, 6, 20), ao_power=1.5)


# ───────────────────────── 木 ─────────────────────────
def wood_grain(n, seed, rings=18.0):
    """木目（u の向きに長い・ほぼまっすぐ）：(筋, 年輪の線, 繊維) 0〜1"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    streak = spectral(n, seed + ':st', beta=1.8, fmin=1, aniso=(1.0, 0.015))
    wv = spectral(n, seed + ':wv', beta=3.0, fmin=1, aniso=(1.0, 0.25))
    knot = spectral(n, seed + ':kn', beta=2.6, fmin=2)
    ph = (ys / n) * rings + (wv - 0.5) * 1.4 + (streak - 0.5) * 0.5 + smooth(0.75, 0.95, knot) * 1.2
    ring = np.abs(((ph % 1.0) - 0.5) * 2) ** 3          # 細い年輪の線（晩材）
    fiber = spectral(n, seed + ':fb', beta=0.9, fmin=10, aniso=(1.0, 0.02))
    return streak, 1 - ring, fiber


def wood_cedar(n, seed):
    """風化した杉の柱・梁：灰茶（日の当たる所は銀灰）・溝に赤茶・割れ（木目に沿う）"""
    streak, ring, fiber = wood_grain(n, seed, rings=10)
    crack_n = spectral(n, seed + ':cr', beta=1.4, fmin=2, aniso=(1.0, 0.01))
    crack = smooth(0.86, 0.95, crack_n) * smooth(0.4, 0.7, spectral(n, seed + ':cm', 2.0, 2))
    h = 0.35 * ring + 0.35 * fiber + 0.2 * streak - 0.5 * crack
    t = 0.4 * ring + 0.35 * fiber + 0.25 * streak
    alb = ramp(t, [(0, '#3a2c22'), (0.4, '#5a4a3c'), (0.75, '#7a6b5c'), (1, '#8e8274')])
    groove = smooth(0.5, 0.15, ring)
    alb = lerp(alb, alb * np.array([1.12, 0.9, 0.75]), groove * 0.5)
    alb = alb * (1 - 0.55 * crack)[..., None]
    dark = smooth(0.6, 0.9, spectral(n, seed + ':dk', 2.4, 2))
    alb = alb * (1 - 0.3 * dark)[..., None]
    rough = 0.82 + 0.1 * fiber
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=5.0, ao_radii=(1, 4, 10), ao_power=1.3)


def planks_silver(n, seed, boards=8):
    """銀灰に風化した板（板張りの壁・縁側・天井）：板ごとの色の差・すき間・釘の錆・黒い筋"""
    r = rng(seed)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    bh = n / boards
    bi = np.floor(ys / bh).astype(int) % boards
    by = (ys % bh) / bh
    streak, ring, fiber = wood_grain(n, seed, rings=26)
    # 板ごとに木目をずらす
    shift = (r.random(boards) * n).astype(int)
    tone = r.uniform(-1, 1, boards)
    ring2 = np.zeros_like(ring)
    fib2 = np.zeros_like(fiber)
    for b in range(boards):
        m = bi == b
        ring2[m] = np.roll(ring, shift[b], 1)[m]
        fib2[m] = np.roll(fiber, -shift[b], 1)[m]
    gap = 1 - smooth(0.0, 0.035, np.minimum(by, 1 - by))
    edge_wear = smooth(0.12, 0.0, np.minimum(by, 1 - by))
    t = 0.45 * ring2 + 0.35 * fib2 + 0.2 * streak + 0.12 * tone[bi]
    alb = ramp(t, [(0, '#4a4640'), (0.45, '#6e6a62'), (0.8, '#8c877d'), (1, '#9d988c')])
    warm = smooth(0.2, 0.6, tone[bi] * 0.5 + 0.5 + 0.2 * (streak - 0.5))
    alb = lerp(alb, alb * np.array([1.1, 0.95, 0.82]), warm * 0.4)
    # 黒い筋（雨だれ）：v の向き
    drip = smooth(0.6, 0.85, spectral(n, seed + ':dr', beta=1.6, fmin=2, aniso=(0.05, 1.0)))
    alb = alb * (1 - 0.35 * drip)[..., None]
    # 釘と錆
    for b in range(boards):
        for k in range(3):
            cx = (k + 0.5) / 3 * n + r.uniform(-20, 20)
            cy = (b + 0.5) * bh + r.uniform(-3, 3)
            d = np.hypot(((xs - cx + n / 2) % n) - n / 2, ((ys - cy + n / 2) % n) - n / 2)
            rust = smooth(10, 0, d) * 0.6 + smooth(3.5, 1.5, d) * 0.4
            down = smooth(30, 0, np.abs(((xs - cx + n / 2) % n) - n / 2) * 3 + np.clip(cy - ys, 0, None) * 0.4) * (ys > cy)
            rr = np.clip(rust + down * 0.3 * (k % 2), 0, 1)
            alb = lerp(alb, col('#5a2e14'), rr * 0.7)
    alb = alb * (1 - 0.75 * gap)[..., None]
    h = 0.3 * ring2 + 0.3 * fib2 + 0.25 * (1 - gap) - 0.6 * gap - 0.1 * edge_wear
    rough = 0.84 + 0.08 * fib2
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=5.0, ao_radii=(1, 3, 8), ao_power=1.4)


def bark_sugi(n, seed):
    """杉の樹皮：縦に長い繊維の帯（赤茶）・はがれかけの灰色の帯（v の向き＝幹の上下）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    s1 = spectral(n, seed + ':s1', beta=1.8, fmin=2, aniso=(0.02, 1.0))
    s2 = spectral(n, seed + ':s2', beta=1.0, fmin=12, aniso=(0.04, 1.0))
    wv = spectral(n, seed + ':wv', beta=2.4, fmin=2)
    strips = np.sin((xs / n) * np.pi * 2 * 22 + (s1 - 0.5) * 18 + (wv - 0.5) * 6) * 0.5 + 0.5
    ridge = smooth(0.25, 0.8, strips)
    peel = smooth(0.62, 0.8, spectral(n, seed + ':pl', beta=2.0, fmin=2, aniso=(0.12, 1.0)))
    h = 0.5 * ridge + 0.3 * s2 + 0.15 * peel
    t = 0.5 * s2 + 0.3 * ridge + 0.2 * s1
    alb = ramp(t, [(0, '#2a1a12'), (0.4, '#4a2e1e'), (0.75, '#6a4430'), (1, '#7e5a42')])
    grey = ramp(s2, [(0, '#5a524a'), (1, '#867c70')])
    alb = lerp(alb, grey, peel * 0.75)
    alb = alb * (0.65 + 0.35 * ridge)[..., None]
    moss_m = smooth(0.7, 0.9, spectral(n, seed + ':ms', 2.4, 2)) * (1 - ridge * 0.5)
    alb = lerp(alb, col('#3a4520'), moss_m * 0.6)
    rough = 0.88 + 0.06 * s2
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=8.0, ao_radii=(1, 4, 10), ao_power=1.6)


def bark_broadleaf(n, seed):
    """広葉樹（コナラ・ケヤキ風）の樹皮：灰褐色・縦に浅い割れ目の網（v の向きに長い）・横の皮目・地衣類"""
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=20)
    vert = spectral(n, seed + ':v', beta=1.4, fmin=3, aniso=(0.05, 1.0))
    wx, wy = spectral(n, seed + ':wx', 2.2, 3), spectral(n, seed + ':wy', 2.2, 3)
    F1, F2, ID = worley(n, 16, seed + ':pl', jitter=1.0, aspect=(0.22, 1.0))
    edge = warp(F2 - F1, wx, wy, 24)
    furrow = 1 - smooth(0.0, 0.1, edge)
    h = 0.45 * (1 - furrow) + 0.25 * vert + 0.15 * big + 0.15 * fine
    t = 0.35 * big + 0.35 * fine + 0.3 * vert
    alb = ramp(t, [(0, '#3a362f'), (0.5, '#5a554b'), (1, '#777164')])
    alb = alb * (0.55 + 0.45 * (1 - furrow))[..., None]
    alb = lerp(alb, alb * np.array([1.1, 0.95, 0.8]), furrow * 0.6)
    Fl, _, IDl = worley(n, 40, seed + ':len', jitter=1.0, aspect=(1.0, 0.25))
    idl = cellrand(IDl, seed + ':l')
    lent = ((Fl < 0.3) & (idl < 0.35)).astype(np.float32)
    alb = alb * (1 - 0.35 * lent)[..., None]
    h = h - 0.08 * lent
    rough = 0.86 + 0.08 * fine
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.4, colors=('#8a9a72', '#a2ad86', '#b8bba0', '#6e7d58'))
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=7.0, ao_radii=(1, 4, 10), ao_power=1.5)


# ───────────────────────── 家の材質 ─────────────────────────
def tsuchikabe(n, seed):
    """古い土壁（漆喰が落ちた所あり）：黄土〜灰ベージュ・すさ（藁）の繊維・ひびの網・はがれて下の荒壁が見える所・下の方の汚れ"""
    r = rng(seed)
    big = spectral(n, seed + ':big', beta=2.6, fmin=1)
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=4)
    fine = spectral(n, seed + ':fine', beta=0.9, fmin=30)
    base_c = ramp(0.5 * big + 0.3 * mid + 0.2 * fine, [(0, '#7a6a52'), (0.5, '#958268'), (1, '#ab9a7e')])
    S = Stamper(n, 0.25 + 0.1 * mid + 0.05 * fine, base_c)
    S.extra[:] = 0.93
    straw = [col('#b39a62'), col('#a08550'), col('#c4ad78'), col('#8a7448')]
    scatter_strokes(S, r, 1800, (6, 16), straw, width=0.08, zr=(0.36, 0.42), curl=0.02, extra=0.9)
    # はがれ（荒壁＝暗く粗い）
    peel_n = warp(spectral(n, seed + ':pl', beta=2.2, fmin=2), spectral(n, seed + ':px', 2, 6), spectral(n, seed + ':py', 2, 6), 40)
    peel = smooth(0.68, 0.72, peel_n)
    rough_c = ramp(fine, [(0, '#5a4a36'), (1, '#7a664a')])
    alb = lerp(S.c, rough_c, peel)
    h = S.h - 0.2 * peel + 0.08 * peel * fine
    rim = smooth(0.66, 0.68, peel_n) * (1 - peel)
    alb = alb * (1 - 0.25 * rim)[..., None]
    # ひび
    F1, F2, _ = worley(n, 8, seed + ':cr', jitter=1.0)
    wx, wy = spectral(n, seed + ':wx', 2.0, 5), spectral(n, seed + ':wy', 2.0, 5)
    crack = 1 - smooth(0.0, 0.018, warp(F2 - F1, wx, wy, 50))
    crack *= smooth(0.35, 0.6, spectral(n, seed + ':cm', 2.0, 2))
    F1b, F2b, _ = worley(n, 22, seed + ':cr2', jitter=1.0)
    crack2 = (1 - smooth(0.0, 0.03, warp(F2b - F1b, wx, wy, 20))) * smooth(0.5, 0.7, spectral(n, seed + ':cm2', 2.0, 3))
    cr = np.clip(crack + 0.6 * crack2, 0, 1)
    alb = alb * (1 - 0.6 * cr)[..., None]
    h = h - 0.25 * cr
    # 雨だれ・汚れ（縦）
    drip = smooth(0.55, 0.85, spectral(n, seed + ':dr', beta=1.6, fmin=2, aniso=(0.04, 1.0)))
    alb = alb * (1 - 0.22 * drip)[..., None]
    mold = smooth(0.65, 0.85, spectral(n, seed + ':mo', 2.4, 3))
    alb = lerp(alb, alb * np.array([0.7, 0.75, 0.62]), mold * 0.5)
    rough = np.clip(S.extra + 0.04 * peel, 0, 1)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=5.0, ao_radii=(1, 4, 12), ao_power=1.3)


def kawara(n, seed, mossy=False, waves=4, rows=4):
    """いぶし瓦（桟瓦）：横に波（谷と山）・縦に段（下の端の厚み）・瓦ごとの色の差・山は鈍い艶。mossy＝谷と下の端に苔"""
    r = rng(seed)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    pw = n / waves
    ph = n / rows
    row = np.floor(ys / ph).astype(int)
    off = (row % 2) * 0.0
    col_i = np.floor((xs / pw + off)).astype(int) % waves
    lu = ((xs / pw + off) % 1.0)
    lv = (ys % ph) / ph            # 0＝上の端（上の瓦の下）・1＝下の端（露出の端）
    jit = r.uniform(-0.04, 0.04, (rows, waves))
    tone = r.uniform(-1, 1, (rows, waves))
    jl = jit[row % rows, col_i]
    # 桟瓦の断面：谷（凹）と山（凸）を 1 枚に
    prof = 0.5 - 0.5 * np.cos((lu + jl) * np.pi * 2)
    prof = np.where(lu < 0.62, 0.55 * np.sin(np.clip(lu / 0.62, 0, 1) * np.pi) * 0.35, 0.35 + 0.65 * np.sin(np.clip((lu - 0.62) / 0.38, 0, 1) * np.pi))
    prof = blur(prof, 2.0)
    step = lv ** 1.4 * 0.55
    lip = smooth(0.94, 1.0, lv)
    h = 0.55 * prof + step - 0.5 * lip
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=30)
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=4)
    t = 0.5 + 0.18 * tone[row % rows, col_i] + 0.2 * (mid - 0.5) + 0.1 * (fine - 0.5)
    alb = ramp(t, [(0, '#24262a'), (0.5, '#3c3f44'), (1, '#5a5d61')])
    crest = smooth(0.4, 0.9, prof)
    alb = lerp(alb, alb * 1.35, crest * 0.5)
    shadow_edge = smooth(0.0, 0.12, lv)
    alb = alb * (0.55 + 0.45 * shadow_edge)[..., None]
    dirt = (1 - crest) * smooth(0.45, 0.8, spectral(n, seed + ':dt', 2.2, 3))
    alb = lerp(alb, col('#3a3226'), dirt * 0.6)
    rough = 0.62 + 0.25 * (1 - crest) + 0.08 * fine
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.22, colors=('#7f876a', '#9a9a84', '#b8b5a0', '#6a755a'))
    if mossy:
        valley = (1 - crest) * (0.6 + 0.4 * smooth(0.6, 1.0, lv))
        mm = smooth(0.55, 0.8, valley * 0.6 + 0.55 * spectral(n, seed + ':mm', 2.2, 3))
        m = moss(n, seed + ':moss')
        alb = lerp(alb, m['albedo'], mm)
        h = h + mm * 0.15 * m['height']
        rough = lerp(rough, m['rough'], mm)
    # 割れ・欠けた瓦（数枚）
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=np.clip(rough, 0, 1), nstr=9.0, ao_radii=(2, 8, 24), ao_power=1.3)


def tin_rust(n, seed, waves=20):
    """錆びたトタン（波板）：横に波・縦の錆の流れ・色あせた赤い塗装の残り・亜鉛の灰"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    wave = np.sin((xs / n) * np.pi * 2 * waves) * 0.5 + 0.5
    streak = spectral(n, seed + ':st', beta=1.6, fmin=2, aniso=(0.03, 1.0))
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=0.9, fmin=30)
    rust = smooth(0.35, 0.7, 0.55 * streak + 0.3 * big + 0.15 * fine)
    paint = smooth(0.62, 0.68, warp(spectral(n, seed + ':pt', 2.2, 3), spectral(n, seed + ':px', 2, 6), spectral(n, seed + ':py', 2, 6), 30)) * (1 - rust * 0.8)
    zinc = ramp(fine, [(0, '#6a6c6a'), (1, '#8a8c88')])
    rust_c = ramp(0.6 * streak + 0.4 * fine, [(0, '#3a1e10'), (0.4, '#5e3016'), (0.75, '#7e4220'), (1, '#94562e')])
    paint_c = ramp(fine, [(0, '#7a3a2c'), (1, '#9a5040')])
    alb = lerp(zinc, rust_c, rust)
    alb = lerp(alb, paint_c, paint * 0.85)
    alb = alb * (0.75 + 0.25 * wave)[..., None]
    pit = smooth(0.75, 0.9, fine) * rust
    h = 0.75 * wave + 0.06 * rust * fine - 0.04 * pit
    rough = 0.55 + 0.35 * rust + 0.1 * fine - 0.1 * paint
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=np.clip(rough, 0, 1), nstr=10.0, ao_radii=(2, 6, 16), ao_power=1.0)


def tatami(n, seed):
    """朽ちた畳（2 枚・各 0.9×1.8m：長い辺が v）：い草の細い横縞・黒い縁（へり）・黄ばみ・カビ・水のしみ・破れ（藁が見える）"""
    r = rng(seed)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    half = n / 2
    lx = xs % half
    weave = np.sin(ys * np.pi * 2 / 3.2) * 0.5 + 0.5
    warp_lines = (np.mod(lx, half / 14) < 1.2).astype(np.float32)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=40, aniso=(1.0, 0.1))
    mid = spectral(n, seed + ':mid', beta=2.0, fmin=3)
    t = 0.4 * fine + 0.3 * mid + 0.3 * weave
    alb = ramp(t, [(0, '#6e6240'), (0.5, '#8a7c50'), (1, '#a2925e')])
    heri_w = 16
    heri = (lx < heri_w) | (lx > half - heri_w)
    heri_c = ramp(fine, [(0, '#1e1c1a'), (1, '#33302a')])
    alb = np.where(heri[..., None], heri_c, alb * (0.92 + 0.08 * weave)[..., None] * (1 - 0.15 * warp_lines)[..., None])
    h = np.where(heri, 0.55 + 0.05 * fine, 0.5 + 0.12 * weave + 0.05 * fine - 0.08 * warp_lines)
    seam = (np.abs(lx - 0) < 1.5) | (np.abs(ys % n - 0) < 1.5)
    h = np.where(seam, 0.1, h)
    stain = smooth(0.55, 0.8, spectral(n, seed + ':st', 2.6, 2))
    alb = lerp(alb, alb * np.array([0.72, 0.62, 0.45]), stain * 0.7)
    mold = smooth(0.7, 0.85, spectral(n, seed + ':mo', 1.8, 6)) * smooth(0.4, 0.7, mid)
    alb = lerp(alb, col('#2e3020'), mold * 0.7)
    tear_n = warp(spectral(n, seed + ':tr', 2.2, 3), spectral(n, seed + ':tx', 2, 8), spectral(n, seed + ':ty', 2, 8), 20)
    tear = smooth(0.8, 0.82, tear_n) * (~heri)
    straw = ramp(spectral(n, seed + ':sw', beta=1.0, fmin=30, aniso=(1.0, 0.1)), [(0, '#5a4a2a'), (1, '#8a7646')])
    alb = lerp(alb, straw * 0.8, tear)
    h = h - 0.3 * tear
    rough = 0.86 + 0.06 * fine
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=5.0, ao_radii=(1, 3, 10), ao_power=1.2)


def shoji(n, seed, cols=3, rows=4):
    """破れた障子：細い桟（組子・木）・黄ばんだ紙・破れ（穴＝透明）・しみ"""
    r = rng(seed)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    cw, ch = n / cols, n / rows
    bar = 7
    fx = np.minimum(xs % cw, cw - xs % cw)
    fy = np.minimum(ys % ch, ch - ys % ch)
    frame = (fx < bar) | (fy < bar)
    streak, ring, fiber = wood_grain(n, seed, rings=40)
    wood = ramp(0.6 * fiber + 0.4 * ring, [(0, '#4e3e2e'), (1, '#7a6a56')])
    fibers = spectral(n, seed + ':pf', beta=0.6, fmin=40)
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    paper = ramp(0.5 * big + 0.5 * fibers, [(0, '#b8ad92'), (1, '#d6ccb2')])
    stain = smooth(0.6, 0.85, spectral(n, seed + ':st', 2.0, 3))
    paper = lerp(paper, paper * np.array([0.85, 0.75, 0.55]), stain * 0.7)
    # 破れ：升目ごとに
    alpha = np.ones((n, n), np.float32)
    cell_x = np.floor(xs / cw).astype(int)
    cell_y = np.floor(ys / ch).astype(int)
    tn = warp(spectral(n, seed + ':tn', 1.8, 6), spectral(n, seed + ':tx', 2, 10), spectral(n, seed + ':ty', 2, 10), 25)
    torn_cells = r.random((rows, cols))
    lvl = np.where(torn_cells < 0.3, 0.0, np.where(torn_cells < 0.6, 0.45, 0.62))[cell_y % rows, cell_x % cols]
    hole = (tn > lvl + 0.15) & (~frame) & (lvl < 0.7)
    hole &= torn_cells[cell_y % rows, cell_x % cols] < 0.65
    edge = smooth(lvl + 0.08, lvl + 0.15, tn) * (~hole) * (~frame) * (torn_cells[cell_y % rows, cell_x % cols] < 0.65)
    paper = lerp(paper, paper * np.array([0.8, 0.72, 0.55]), edge * 0.8)
    alpha[hole] = 0
    alb = np.where(frame[..., None], wood, paper)
    h = np.where(frame, 0.8 + 0.1 * fiber, 0.3 + 0.05 * fibers + 0.08 * edge)
    rough = np.where(frame, 0.82, 0.9)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, alpha=alpha, nstr=4.0, ao_radii=(1, 3, 8), ao_power=1.0)


def shu_paint(n, seed):
    """朱塗り（鳥居・祠）のはがれ：朱（色あせて橙〜桃）・はがれて灰色の木・黒ずみ・縦の汚れ"""
    streak, ring, fiber = wood_grain(n, seed, rings=12)
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=30)
    pn = warp(spectral(n, seed + ':pn', 2.0, 3) * 0.7 + 0.3 * fiber, spectral(n, seed + ':px', 2, 8), spectral(n, seed + ':py', 2, 8), 24)
    peel = smooth(0.6, 0.62, pn)
    rim = smooth(0.56, 0.6, pn) * (1 - peel)
    paint = ramp(0.6 * big + 0.4 * fine, [(0, '#7a2c1c'), (0.5, '#983e26'), (1, '#ad573a')])
    faded = smooth(0.4, 0.8, spectral(n, seed + ':fd', 2.2, 2))
    paint = lerp(paint, paint * np.array([1.08, 1.12, 1.15]) + 0.04, faded * 0.5)
    wood = ramp(0.5 * ring + 0.5 * fiber, [(0, '#4a4440'), (1, '#7a726a')])
    alb = lerp(paint, wood, peel)
    alb = alb * (1 - 0.3 * rim)[..., None]
    drip = smooth(0.55, 0.85, spectral(n, seed + ':dr', beta=1.6, fmin=2, aniso=(0.05, 1.0)))
    alb = alb * (1 - 0.35 * drip)[..., None]
    h = 0.5 + 0.1 * fine - 0.25 * peel + 0.1 * peel * ring + 0.05 * rim
    rough = np.where(peel > 0.5, 0.88, 0.62 + 0.15 * fine + 0.1 * faded)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=4.0, ao_radii=(1, 3, 8), ao_power=1.2)


def granite(n, seed):
    """御影石（灯籠・石段・基壇）：細かいごま塩（黒・白・薄桃）・風化の暗いしみ・低い所の苔・のみの跡"""
    F1, F2, ID = worley(n, 150, seed + ':g', jitter=1.0)
    idr = cellrand(ID, seed)
    grain = np.select([idr < 0.18, idr < 0.3, idr < 0.38], [0.08, 0.95, 0.7], 0.5)
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=40)
    gc = np.stack([np.interp(grain, [0, 0.5, 0.7, 1], [0.22, 0.56, 0.62, 0.74]),
                   np.interp(grain, [0, 0.5, 0.7, 1], [0.22, 0.55, 0.55, 0.73]),
                   np.interp(grain, [0, 0.5, 0.7, 1], [0.23, 0.53, 0.53, 0.70])], -1)
    gc = blur(gc, 0.6)
    weather = smooth(0.4, 0.8, big)
    alb = gc * (0.72 - 0.25 * weather + 0.1 * fine)[..., None]
    alb = lerp(alb, alb * np.array([0.9, 0.95, 0.8]), smooth(0.6, 0.9, spectral(n, seed + ':gr', 2.0, 3)) * 0.6)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    chisel = (np.sin((xs + ys * 0.35 + spectral(n, seed + ':ch', 2, 6) * 30) * np.pi * 2 / 9) * 0.5 + 0.5) * smooth(0.5, 0.8, spectral(n, seed + ':cm', 2.2, 2))
    h = 0.4 * big + 0.2 * fine + 0.1 * (1 - grain) + 0.15 * chisel
    rough = 0.8 + 0.1 * fine
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.35)
    mm = smooth(0.62, 0.8, spectral(n, seed + ':mm', 2.4, 2)) * smooth(0.6, 0.3, h)
    alb = lerp(alb, col('#36441c'), mm * 0.8)
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=np.clip(rough, 0, 1), nstr=5.0, ao_radii=(1, 4, 12), ao_power=1.4)


def futon_fabric(n, seed):
    """古い布団の布：色あせた藍の絣（かすり）・縞・しみ・カビ・ほつれ"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    weave = (np.sin(xs * np.pi * 2 / 3) * np.sin(ys * np.pi * 2 / 3)) * 0.5 + 0.5
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=30)
    stripe = (np.mod(xs, n / 8) < n / 32).astype(np.float32)
    F1, F2, ID = worley(n, 12, seed + ':k', jitter=0.3)
    kasuri = ((F1 < 0.18) & (cellrand(ID, seed) < 0.7)).astype(np.float32)
    kasuri = warp(kasuri, spectral(n, seed + ':kx', 1.5, 20), spectral(n, seed + ':ky', 1.5, 20), 6)
    base = ramp(0.5 * big + 0.5 * fine, [(0, '#2a3346'), (1, '#46506a')])
    alb = lerp(base, col('#8a8a86'), np.clip(kasuri * 0.8 + stripe * 0.25, 0, 1))
    stain = smooth(0.5, 0.85, spectral(n, seed + ':st', 2.6, 2))
    alb = lerp(alb, alb * np.array([1.2, 1.05, 0.7]) + 0.05, stain * 0.5)
    mold = smooth(0.7, 0.85, spectral(n, seed + ':mo', 1.8, 6))
    alb = lerp(alb, col('#2e3020'), mold * 0.5)
    alb = alb * (0.9 + 0.1 * weave)[..., None]
    h = 0.5 * big + 0.2 * fine + 0.15 * weave
    rough = 0.92 + 0.05 * fine
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=3.0, ao_radii=(2, 6, 16), ao_power=1.2)


# ───────────────────────── 葉のカード（透過） ─────────────────────────
def _card(n):
    S = Stamper(n)
    S.h[:] = -1
    return S


def _finish_card(S, base_rough=0.75, nstr=3.0):
    alpha = (S.m > 0).astype(np.float32)
    h = np.where(alpha > 0, S.h, 0)
    h = norm01(h) * alpha
    # 透過の縁の色のにじみ（mip で黒い縁が出ないよう、空の所を近くの色で埋める）
    c = S.c.copy()
    filled = alpha.copy()
    acc = c * alpha[..., None]
    w = alpha.copy()
    for s in (2, 6, 16, 40):
        bc = blur(acc, s)
        bw = blur(w, s)
        est = bc / np.maximum(bw, 1e-4)[..., None]
        c = np.where((filled < 0.5)[..., None] & (bw > 1e-3)[..., None], est, c)
        filled = np.maximum(filled, (bw > 1e-3).astype(np.float32))
    return dict(albedo=np.clip(c, 0, 1), height=h, rough=np.full_like(h, base_rough), alpha=alpha, nstr=nstr, ao_radii=(1, 3, 8), ao_power=1.0, card=True)


def _branch_walk(r, x0, y0, ang, L, step, wobble):
    pts = []
    x, y = x0, y0
    for i in range(max(2, int(L / step))):
        ang += r.normal(0, wobble)
        x += np.cos(ang) * step
        y += np.sin(ang) * step
        pts.append((x, y, ang, i / max(1, int(L / step) - 1)))
    return pts


def sugi_spray(n, seed):
    """杉の葉のカード：下（付け根）から扇形に広がる枝。小枝は鱗のような短い針がらせんに密に付いた「縄」（濃い緑・先は黄緑・内側は茶）"""
    r = rng(seed)
    S = _card(n)
    greens = [col('#1f3018'), col('#27391b'), col('#2f441f'), col('#3a5226')]
    tips = [col('#566e2c'), col('#647a34'), col('#4c6428')]
    browns = [col('#4a3a22'), col('#5a4628')]
    cords = []
    # 主軸（下の中心から上へ）→ 左右の枝 → 小枝（縄）
    main = _branch_walk(r, n * 0.5 + r.normal(0, n * 0.03), n * 0.99, -np.pi / 2 + r.normal(0, 0.05), n * 0.9, 8, 0.02)
    cords.append((main, 0))
    for (x, y, ang, t) in main[3::3]:
        for side in (-1, 1):
            if r.random() < 0.15:
                continue
            L1 = n * (0.42 * (1 - t) ** 0.8 + 0.06) * r.uniform(0.8, 1.15)
            br = _branch_walk(r, x, y, ang + side * r.uniform(0.75, 1.05), L1, 7, 0.05)
            cords.append((br, 1))
            for (x2, y2, a2, t2) in br[2::2]:
                if t2 > 0.9:
                    continue
                for side2 in (-1, 1):
                    if r.random() < 0.35:
                        continue
                    L2 = n * 0.09 * (1 - t2 * 0.6) * r.uniform(0.7, 1.2)
                    cords.append((_branch_walk(r, x2, y2, a2 + side2 * r.uniform(0.5, 0.9), L2, 5, 0.08), 2))
    for (pts, depth) in cords:
        thick = (13, 10, 8)[depth]
        for (x, y, ang, t) in pts:
            if not (12 < x < n - 12 and 12 < y < n - 12):
                continue
            for k in range(4 if depth else 3):
                a = ang + r.choice([-1, 1]) * r.uniform(0.35, 0.95)
                half = thick * r.uniform(0.75, 1.15) * (1 - 0.35 * t)
                cx = x + r.normal(0, 1.8)
                cy = y + r.normal(0, 1.8)
                pick = r.random()
                c0 = tips[r.integers(3)] if (t > 0.82 or pick < 0.1) else (browns[r.integers(2)] if (depth == 0 and pick < 0.4) or pick > 0.97 else greens[r.integers(4)])
                c0 = jitter_color(c0, r, 0.2)
                z = r.uniform(0, 1) + depth * 0.6
                fn0 = needle_fn(0.24, 0.45)

                def fn(u, v, a=a, fn0=fn0):
                    uu, vv = rot(u, v, a)
                    return fn0(uu, vv)

                def cf(u, v, a=a, c0=c0):
                    uu, vv = rot(u, v, a)
                    return c0[None, None, :] * (0.7 + 0.4 * (uu[..., None] * 0.5 + 0.5))
                S.stamp(cx, cy, half, fn, z, cf)
    return _finish_card(S, 0.72, 3.0)


def broadleaf_cluster(n, seed):
    """広葉樹の葉のカード：下の付け根から広がる小枝と、楕円の葉の房（緑の幅・少し黄ばみ・裏の明るい葉）。カードの面をほぼ埋める"""
    r = rng(seed)
    S = _card(n)
    greens = [col('#2b4419'), col('#35521f'), col('#406024'), col('#283d17'), col('#4c6a2a')]
    yell = [col('#6e7030'), col('#7a6a2c')]
    twigs = []
    main = _branch_walk(r, n * 0.5, n * 0.99, -np.pi / 2, n * 0.7, 10, 0.03)
    twigs.append(main)
    for (x, y, ang, t) in main[1::2]:
        for side in (-1, 1):
            if r.random() < 0.25:
                continue
            twigs.append(_branch_walk(r, x, y, ang + side * r.uniform(0.5, 1.1), n * r.uniform(0.25, 0.45) * (1 - 0.4 * t), 10, 0.08))
    for tw in twigs:
        for (x, y, ang, t) in tw:
            S.stamp(x, y, 5, blob_fn(0.6, 0.1), 0.0, col('#3a2a1c'))
        for (x, y, ang, t) in tw[1:]:
            for k in range(2):
                a = ang + r.choice([-1, 1]) * r.uniform(0.5, 1.2)
                half = r.uniform(30, 48) * (1 - 0.25 * t)
                cx = x + np.cos(a) * half * 0.85
                cy = y + np.sin(a) * half * 0.85
                if not (half < cx < n - half and half < cy < n - half):
                    continue
                c0 = jitter_color(yell[r.integers(2)] if r.random() < 0.05 else greens[r.integers(5)], r, 0.25)
                if r.random() < 0.18:
                    c0 = np.clip(c0 * 1.3 + 0.03, 0, 1)
                base = leaf_shape('ovate', 0.4)

                def fn(u, v, a=a, base=base):
                    uu, vv = rot(u, v, a)
                    return base(uu, vv * 1.1)

                def cf(u, v, a=a, c0=c0):
                    uu, vv = rot(u, v, a)
                    shade = 0.82 + 0.18 * (1 - np.clip(np.abs(vv) * 1.8, 0, 1)) + 0.05 * uu
                    vein = np.where(np.abs(vv) < 0.03, 1.15, 1.0) * np.where(np.abs(np.sin(uu * 9 + np.abs(vv) * 6)) < 0.08, 1.07, 1.0)
                    return c0[None, None, :] * (shade * vein)[..., None]
                S.stamp(cx, cy, half, fn, r.uniform(0.2, 1.0) + t, cf)
    return _finish_card(S, 0.62, 3.5)


def fern_frond(n, seed):
    """シダの葉（2 回羽状）のカード：中心の軸から左右に羽片・先ほど小さい"""
    r = rng(seed)
    S = _card(n)
    greens = [col('#2c4a1e'), col('#355a22'), col('#3f6626'), col('#4a6e2a')]
    for f in range(3):
        x0 = n * (0.35 + 0.3 * r.random())
        y0 = n * 0.99
        ang = -np.pi / 2 + (f - 1) * 0.45 + r.normal(0, 0.08)
        L = n * r.uniform(0.75, 0.92)
        steps = int(L / 4)
        x, y = x0, y0
        for i in range(steps):
            t = i / steps
            ang += 0.004 * (f - 1) + r.normal(0, 0.01)
            x += np.cos(ang) * 4
            y += np.sin(ang) * 4
            S.stamp(x, y, 3.0, blob_fn(0.7, 0.2), 0.3, col('#3a4a22'))
            if i % 4 == 0 and t > 0.12:
                pl = (1 - t) ** 0.8 * n * 0.22 * (0.8 + 0.3 * np.sin(t * np.pi))
                for side in (-1, 1):
                    pa = ang + side * (1.2 - 0.3 * t)
                    for j in range(int(pl / 5)):
                        tt = j / max(1, pl / 5)
                        px = x + np.cos(pa) * j * 5 + np.cos(ang) * tt * 6
                        py = y + np.sin(pa) * j * 5 + np.sin(ang) * tt * 6
                        half = max(2.5, 6.5 * (1 - tt) * (1 - 0.5 * t))
                        if not (half < px < n - half and half < py < n - half):
                            continue
                        c0 = jitter_color(greens[r.integers(4)], r, 0.18)
                        aa = pa + side * 0.9

                        def fn(u, v, aa=aa):
                            uu, vv = rot(u, v, aa)
                            return leaf_shape('lance', 0.3)(uu, vv)
                        S.stamp(px, py, half, fn, 0.5 + 0.3 * tt, c0)
    return _finish_card(S, 0.7, 3.0)


def grass_blades(n, seed):
    """草のカード：根元から伸びる細い葉の束（緑〜先が枯れ色）。下が根元"""
    r = rng(seed)
    S = _card(n)
    for k in range(70):
        x0 = n * (0.08 + 0.84 * r.random())
        y0 = n * 0.995
        ang = -np.pi / 2 + r.normal(0, 0.28)
        L = n * r.uniform(0.35, 0.95)
        bend = r.normal(0, 0.0025)
        w0 = r.uniform(4.5, 8.0)
        dry = r.random() < 0.25
        g = jitter_color(col('#3e5222') if not dry else col('#7a7040'), r, 0.25)
        tipc = col('#8a7c48') if r.random() < 0.6 else g
        steps = int(L / 2.5)
        x, y = x0, y0
        z = r.random()
        for i in range(steps):
            t = i / steps
            ang += bend * (1 + 3 * t)
            x += np.cos(ang) * 2.5
            y += np.sin(ang) * 2.5
            w = w0 * (1 - t ** 1.5 * 0.92)
            if not (w < x < n - w and w < y < n - w):
                break
            cc = g * (0.65 + 0.45 * t) if t < 0.75 else lerp(g, tipc, (t - 0.75) / 0.25)
            S.stamp(x, y, w, blob_fn(0.95, 0.15), z + t * 0.01, np.clip(cc, 0, 1))
    return _finish_card(S, 0.7, 2.0)


# ───────────────────────── 一覧 ─────────────────────────
# id → (作り方, 種, 1 回の繰り返しの大きさ m, 名前, タグ, 用途, 書き出しの大きさ)
MATERIALS = {
    'mat.ground.forest_floor': (forest_floor, 'ff1', 2.0, ('森の床（落ち葉・杉の葉・土）', 'Forest floor'), ['地面', '森', '落ち葉'], ['地形']),
    'mat.ground.moss': (moss, 'ms1', 1.5, ('苔', 'Moss'), ['地面', '苔'], ['地形', '岩', '屋根']),
    'mat.ground.grass': (grass_ground, 'gr1', 2.0, ('草地', 'Grass ground'), ['地面', '草'], ['地形']),
    'mat.ground.gravel_path': (gravel_path, 'gv1', 1.5, ('砂利の道', 'Gravel path'), ['地面', '道', '砂利'], ['参道']),
    'mat.ground.dirt_path': (dirt_path, 'dp1', 2.5, ('踏み固めた土の道', 'Packed dirt path'), ['地面', '道', '土'], ['山道', '土間']),
    'mat.rock.andesite': (rock_andesite, 'ra1', 2.5, ('安山岩（地衣類）', 'Andesite with lichen'), ['岩'], ['岩', '石垣']),
    'mat.rock.cliff': (cliff, 'cl1', 6.0, ('崖の面', 'Cliff face'), ['岩', '崖'], ['地形の急な所（三面投影）']),
    'mat.wood.cedar': (wood_cedar, 'wc1', 1.2, ('風化した杉材', 'Weathered cedar'), ['木', '杉', '風化'], ['柱', '梁', '框']),
    'mat.wood.planks_silver': (planks_silver, 'wp1', 2.0, ('銀灰の板張り', 'Silvered planks'), ['木', '板', '風化'], ['板壁', '縁側', '天井', '妻']),
    'mat.wall.tsuchikabe': (tsuchikabe, 'tk1', 2.0, ('古い土壁（ひび・はがれ）', 'Cracked earthen plaster'), ['壁', '土壁', '漆喰'], ['外壁', '内壁']),
    'mat.roof.kawara': (kawara, 'kw1', 1.2, ('いぶし瓦', 'Kawara roof tiles'), ['屋根', '瓦'], ['屋根']),
    'mat.roof.kawara_moss': (lambda n, s: kawara(n, s, mossy=True), 'kw2', 1.2, ('苔むした瓦', 'Mossy kawara'), ['屋根', '瓦', '苔'], ['屋根']),
    'mat.metal.tin_rust': (tin_rust, 'tn1', 1.5, ('錆びたトタン（波板）', 'Rusted corrugated iron'), ['金属', 'トタン', '錆'], ['屋根', '差し掛け', '外壁']),
    'mat.floor.tatami': (tatami, 'tt1', 1.8, ('朽ちた畳', 'Decayed tatami'), ['床', '畳'], ['和室の床']),
    'mat.paper.shoji': (shoji, 'sj1', 0.9, ('破れた障子', 'Torn shoji'), ['紙', '障子', '建具'], ['建具', '窓']),
    'mat.paint.shu': (shu_paint, 'sh1', 1.0, ('はがれた朱塗り', 'Peeling vermilion'), ['塗装', '朱', '鳥居'], ['鳥居', '祠']),
    'mat.fabric.futon': (futon_fabric, 'fu1', 1.0, ('古い布団の布（藍の絣）', 'Old futon fabric'), ['布', '布団'], ['布団', '自転車の座']),
    'mat.stone.granite': (granite, 'gn1', 1.5, ('御影石', 'Granite'), ['石', '御影石'], ['灯籠', '石段', '基壇', '狛犬']),
    'mat.bark.sugi': (bark_sugi, 'bs1', 1.0, ('杉の樹皮', 'Sugi bark'), ['樹皮', '杉'], ['杉の幹']),
    'mat.bark.broadleaf': (bark_broadleaf, 'bb1', 1.0, ('広葉樹の樹皮', 'Broadleaf bark'), ['樹皮', '広葉樹'], ['広葉樹の幹']),
    'mat.foliage.sugi': (sugi_spray, 'fs1', 1.0, ('杉の葉（カード）', 'Sugi foliage card'), ['葉', '杉', 'カード'], ['杉の葉']),
    'mat.foliage.broadleaf': (broadleaf_cluster, 'fb1', 1.0, ('広葉樹の葉（カード）', 'Broadleaf foliage card'), ['葉', '広葉樹', 'カード'], ['広葉樹の葉', '落ち葉']),
    'mat.foliage.fern': (fern_frond, 'ff2', 1.0, ('シダ（カード）', 'Fern card'), ['葉', 'シダ', '下草', 'カード'], ['下草']),
    'mat.foliage.grass': (grass_blades, 'fg1', 1.0, ('草（カード）', 'Grass card'), ['葉', '草', '下草', 'カード'], ['下草']),
}
