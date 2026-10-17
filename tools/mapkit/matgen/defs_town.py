# わかば matgen：境界侵食の町（住宅地・駅前・アーケード）と屋内（病院・体育館・研究施設・管理棟・自宅）の材質（PBR の組）。
# defs.py（山の廃村）と同じ決まり：1 つの関数＝1 つの材質・種で決まる・上下左右につながる。
# 返す物：{ albedo:(n,n,3) sRGB 0〜1, height:(n,n) 0〜1, rough:(n,n) 0〜1, alpha?:(n,n), ao?:(n,n), nstr: 法線の強さ }
# 画風（docs/shinshoku/DECISIONS.md 2026-10-17）：アニメ調の人物と合う「描き込みの多い、信じられる町」。色は写実より少しだけ澄ませ、
# 汚れ・雨だれ・ひびは入れるが、廃墟にはしない（人が住んでいる町の夜）。
# 1 回の繰り返し（tileM）は、町の形（shinshoku/world/town.js の applyTile の ts）に合わせた：例 アスファルト 6m・ブロック塀 1.2m・瓦 1.4m。
import numpy as np
from tex import (spectral, blur, worley, warp, smooth, lerp, col, ramp, fill, Stamper, rot, norm01, rng, grade, cellrand)
from defs import scatter_leaves, scatter_strokes, moss as moss_fn


# ───────────────────────── 共通の形 ─────────────────────────
def bond(n, cols, rows, stagger=0.5, seed='b', jitter=0.0):
    """升目の並び（れんが・ブロック・敷石）。戻り値：row, colid（行ごとのずれ込み）, lu, lv（0〜1）, 縁までの距離（画素）, セルの番号"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    ch, cw = n / rows, n / cols
    row = np.floor(ys / ch).astype(int)
    off = (row % 2) * stagger
    if jitter:
        r = rng(seed + ':bj')
        off = off + r.uniform(-jitter, jitter, rows)[row % rows]
    cx = xs / cw + off
    ci = np.floor(cx).astype(int) % cols
    lu = cx - np.floor(cx)
    lv = ys / ch - row
    du = np.minimum(lu, 1 - lu) * cw
    dv = np.minimum(lv, 1 - lv) * ch
    d = np.minimum(du, dv)
    cid = (row % rows) * cols + ci
    return dict(row=row % rows, col=ci, lu=lu, lv=lv, du=du, dv=dv, d=d, id=cid)


def cell_tone(cid, seed, lo=-1.0, hi=1.0):
    r = rng(seed + ':ct')
    tab = r.uniform(lo, hi, int(cid.max()) + 1).astype(np.float32)
    return tab[cid]


def cracks(n, seed, cells=6, width=0.02, amount=0.55, warp_px=50):
    """ひびの網（0〜1）"""
    F1, F2, _ = worley(n, cells, seed + ':cr', jitter=1.0)
    wx, wy = spectral(n, seed + ':wx', 2.0, 5), spectral(n, seed + ':wy', 2.0, 5)
    c = 1 - smooth(0.0, width, warp(F2 - F1, wx, wy, warp_px))
    return c * smooth(1 - amount, 1 - amount + 0.2, spectral(n, seed + ':cm', 2.0, 2))


def streaks(n, seed, amount=0.5, aniso=0.04):
    """雨だれ（縦の筋：上から下へ）0〜1"""
    return smooth(1 - amount, 1.0, spectral(n, seed + ':dr', beta=1.6, fmin=2, aniso=(aniso, 1.0)))


def speckle(n, seed, density, size=1.0):
    """細かい粒（骨材・砂）0〜1"""
    F1, _, ID = worley(n, density, seed + ':sp', jitter=1.0)
    idr = cellrand(ID, seed + ':spr')
    return (F1 < 0.32 * size * (0.5 + idr)).astype(np.float32), idr


def out(alb, h, rough, nstr, ao_radii=(1, 4, 12), ao_power=1.2, **kw):
    h = np.asarray(h, np.float32)
    rough = np.broadcast_to(np.asarray(rough, np.float32), h.shape).copy()
    d = dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=np.clip(rough, 0.02, 1), nstr=nstr, ao_radii=ao_radii, ao_power=ao_power)
    d.update(kw)
    return d


# ───────────────────────── 道 ─────────────────────────
def asphalt(n, seed, tone=0.0, patch=False, old=False):
    """アスファルト（夜の雨で濡れる前提）：細かい骨材の粒・タールのにじみ・ひび・油のしみ・低い所（水たまりになる＝高さが低い）"""
    big = spectral(n, seed + ':big', beta=2.6, fmin=1)
    mid = spectral(n, seed + ':mid', beta=1.8, fmin=6)
    fine = spectral(n, seed + ':fine', beta=0.6, fmin=60)
    agg, aggr = speckle(n, seed, 170, 1.0)
    agg2, _ = speckle(n, seed + ':b', 90, 0.8)
    base = 0.17 + tone + 0.05 * (big - 0.5) + 0.04 * (mid - 0.5) + (0.06 if old else 0)
    alb = np.stack([base, base, base * 1.04], -1) + (fine[..., None] - 0.5) * 0.06
    stone = ramp(aggr, [(0, '#55534f'), (0.5, '#77736c'), (1, '#9a958c')])
    alb = lerp(alb, stone, agg * (0.55 if not old else 0.75))
    alb = lerp(alb, stone * 0.85, agg2 * 0.35)
    h = 0.45 + 0.18 * big + 0.08 * mid + 0.08 * agg + 0.04 * agg2 + 0.03 * fine
    rough = 0.82 + 0.1 * fine - 0.1 * agg * 0
    # タールのにじみ（艶のある暗いしみ）
    tar = smooth(0.72, 0.9, spectral(n, seed + ':tar', 2.2, 3))
    alb = lerp(alb, alb * 0.6, tar * 0.6)
    rough = rough - 0.25 * tar
    # 油のしみ（車の止まる所）
    oil = smooth(0.78, 0.92, spectral(n, seed + ':oil', 2.6, 2)) * (0.5 + 0.5 * mid)
    alb = lerp(alb, col('#151418'), oil * 0.5)
    rough = rough - 0.3 * oil
    # ひび
    cr = cracks(n, seed, cells=5 if not old else 9, width=0.012 if not old else 0.02, amount=0.45 if not old else 0.75)
    if old:   # 亀甲状のひび（古い道）
        F1, F2, _ = worley(n, 26, seed + ':kk', jitter=0.9)
        kk = (1 - smooth(0.0, 0.05, F2 - F1)) * smooth(0.55, 0.75, spectral(n, seed + ':km', 2.2, 2))
        cr = np.clip(cr + kk * 0.8, 0, 1)
    alb = alb * (1 - 0.55 * cr)[..., None]
    h = h - 0.35 * cr
    if patch:   # 補修の跡（四角い濃い舗装・縁のシール材＝艶）
        ys, xs = np.mgrid[0:n, 0:n].astype(np.float32) / n
        pm = ((xs > 0.12) & (xs < 0.62) & (ys > 0.1) & (ys < 0.48)).astype(np.float32)
        pm2 = ((xs > 0.55) & (xs < 0.9) & (ys > 0.62) & (ys < 0.86)).astype(np.float32)
        P = np.clip(pm + pm2, 0, 1)
        Pb = blur(P, 1.0)
        edge = smooth(0.15, 0.5, Pb) * (1 - smooth(0.5, 0.85, Pb))
        alb = lerp(alb, alb * 0.72, P)
        alb = lerp(alb, col('#0e0e10'), edge * 0.7)
        rough = rough - 0.08 * P - 0.45 * edge
        h = h + 0.05 * P - 0.05 * edge
        seal = 1 - smooth(0.0, 0.008, warp(worley(n, 3, seed + ':sl')[1] - worley(n, 3, seed + ':sl')[0], spectral(n, seed + ':sx', 2, 4), spectral(n, seed + ':sy', 2, 4), 80))
        alb = lerp(alb, col('#0c0c0e'), seal * 0.8)
        rough = rough - 0.5 * seal
    # 低い所（わだち・窪み）：高さを下げる＝描画の側で雨の時に水たまり
    dip = smooth(0.62, 0.85, spectral(n, seed + ':dip', 2.8, 1))
    h = h - 0.4 * dip
    return out(alb, h, rough, 4.0, (1, 3, 10), 1.2)


def interlock(n, seed):
    """インターロッキング（歩道）：0.2×0.1m の小さな石を 1.6m に（8×16）・色の混ざり・目地の砂と苔・角の欠け"""
    B = bond(n, 8, 16, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    pal = ramp(cell_tone(B['id'], seed + ':p', 0, 1), [(0, '#5e5250'), (0.4, '#7a6a64'), (0.7, '#8c7f76'), (1, '#6a6460')])
    fine = spectral(n, seed + ':f', 0.8, 40)
    alb = pal * (1 + 0.08 * tone)[..., None] * (0.92 + 0.12 * fine)[..., None]
    gap = 2.0 * n / 1024
    bev = smooth(gap, gap + 5 * n / 1024, B['d'])
    h = 0.35 + 0.55 * bev + 0.05 * fine + 0.03 * tone
    joint = 1 - smooth(gap * 0.6, gap * 1.4, B['d'])
    sand = ramp(spectral(n, seed + ':s', 1.2, 20), [(0, '#3a362e'), (1, '#5a5244')])
    alb = lerp(alb, sand, joint)
    mossm = joint * smooth(0.55, 0.8, spectral(n, seed + ':m', 2.2, 3))
    alb = lerp(alb, col('#2c3a1c'), mossm * 0.7)
    chip = smooth(0.8, 0.95, spectral(n, seed + ':ch', 1.0, 30)) * (1 - bev * 0.6)
    h = h - 0.15 * chip
    dirt = smooth(0.5, 0.9, spectral(n, seed + ':d', 2.4, 2))
    alb = alb * (1 - 0.18 * dirt)[..., None]
    rough = 0.86 - 0.08 * dirt + 0.06 * fine
    return out(alb, h, rough, 4.0, (1, 3, 8), 1.4)


def concrete(n, seed, base='#8a8884', joints=True, tone=1.0):
    """打ち放しのコンクリート（縁・土台・床）：砂の粒・型枠の継ぎ目・しみ・白華・ひび"""
    big = spectral(n, seed + ':big', 2.6, 1)
    mid = spectral(n, seed + ':mid', 2.0, 5)
    fine = spectral(n, seed + ':fine', 0.7, 60)
    pores, _ = speckle(n, seed, 240, 0.5)
    c0 = col(base) * tone
    alb = c0[None, None, :] * (0.86 + 0.16 * big + 0.08 * mid + 0.06 * fine)[..., None]
    alb = alb * (1 - 0.25 * pores)[..., None]
    h = 0.5 + 0.12 * big + 0.06 * mid + 0.05 * fine - 0.2 * pores
    stain = smooth(0.62, 0.88, spectral(n, seed + ':st', 2.2, 2))
    alb = lerp(alb, alb * np.array([0.72, 0.72, 0.7]), stain * 0.6)
    eff = smooth(0.75, 0.92, spectral(n, seed + ':ef', 1.8, 4)) * 0.4
    alb = lerp(alb, col('#d6d4cc'), eff * 0.5)
    cr = cracks(n, seed, cells=4, width=0.01, amount=0.4)
    alb = alb * (1 - 0.45 * cr)[..., None]
    h = h - 0.3 * cr
    if joints:   # 目地（タイルの端＝つなぐと 1 枚ごとに切れ目）
        ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
        e = np.minimum(np.minimum(xs, n - 1 - xs), np.minimum(ys, n - 1 - ys))
        j = 1 - smooth(1.0, 4.0 * n / 1024, e)
        alb = alb * (1 - 0.5 * j)[..., None]
        h = h - 0.3 * j
    rough = 0.88 + 0.06 * fine - 0.1 * stain
    return out(alb, h, rough, 3.0, (1, 4, 14), 1.2)


def curb(n, seed):
    """縁石（1m の石を 2 つ）：御影石に似た灰・面取り・目地・下の泥の跡・欠け"""
    B = bond(n, 2, 1, 0.0, seed)
    fine = spectral(n, seed + ':f', 0.8, 50)
    g, gr = speckle(n, seed, 300, 0.6)
    alb = ramp(0.5 + 0.2 * cell_tone(B['id'], seed) + 0.2 * (fine - 0.5), [(0, '#86847e'), (1, '#b0aea6')])
    alb = lerp(alb, ramp(gr, [(0, '#3a3836'), (1, '#d8d4cc')]), g * 0.45)
    gap = 3 * n / 1024
    bev = smooth(gap, gap + 10 * n / 1024, B['du'])
    h = 0.4 + 0.5 * bev + 0.05 * fine
    alb = alb * (0.6 + 0.4 * bev)[..., None]
    ys = np.mgrid[0:n, 0:n][0].astype(np.float32) / n
    mud = smooth(0.6, 1.0, ys) * (0.6 + 0.4 * spectral(n, seed + ':mud', 1.6, 3, aniso=(0.1, 1)))
    alb = lerp(alb, col('#3a342a'), mud * 0.55)
    chip = smooth(0.82, 0.95, spectral(n, seed + ':ch', 1.4, 12)) * (1 - smooth(10, 40, B['dv']))
    h = h - 0.3 * chip
    rough = 0.8 + 0.08 * fine - 0.1 * mud
    return out(alb, h, rough, 5.0, (1, 4, 10), 1.2)


def block_wall(n, seed):
    """ブロック塀（0.4×0.2m・1.2m に 3×6）：目地のくぼみ・黒いカビの筋・下の苔・白華・錆の流れ"""
    B = bond(n, 3, 6, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    fine = spectral(n, seed + ':f', 0.7, 50)
    pores, _ = speckle(n, seed, 200, 0.6)
    alb = ramp(0.55 + 0.12 * tone + 0.15 * (fine - 0.5), [(0, '#6f6d68'), (1, '#a6a39c')])
    alb = alb * (1 - 0.3 * pores)[..., None]
    gap = 5 * n / 1024
    bev = smooth(gap, gap + 6 * n / 1024, B['d'])
    h = 0.3 + 0.55 * bev + 0.06 * fine - 0.12 * pores
    joint = 1 - smooth(gap * 0.7, gap * 1.3, B['d'])
    alb = lerp(alb, col('#5a5650'), joint * 0.8)
    ys = np.mgrid[0:n, 0:n][0].astype(np.float32) / n
    mold = streaks(n, seed, 0.45) * (0.4 + 0.6 * ys)
    alb = lerp(alb, col('#2a2c26'), mold * 0.55)
    mossm = smooth(0.7, 1.0, ys) * smooth(0.4, 0.75, spectral(n, seed + ':m', 2.2, 3))
    alb = lerp(alb, col('#36441e'), mossm * 0.7)
    eff = smooth(0.8, 0.95, spectral(n, seed + ':ef', 1.8, 5)) * 0.5
    alb = lerp(alb, col('#d8d6cc'), eff * 0.4)
    rough = 0.9 - 0.06 * mold
    return out(alb, h, rough, 4.0, (1, 4, 12), 1.3)


def siding(n, seed):
    """窯業系サイディング（横の板 0.2m・2m に 10 段）：板の下の影の段・浅い木目の型押し・継ぎ目のシール・窓の下の雨だれ"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    rows = 10
    ph = n / rows
    lv = (ys % ph) / ph
    row = np.floor(ys / ph).astype(int)
    grain = spectral(n, seed + ':g', 1.2, 8, aniso=(0.06, 1.0))
    fine = spectral(n, seed + ':f', 0.8, 50)
    step = lv ** 0.8
    lip = smooth(0.92, 1.0, lv)
    h = 0.35 + 0.45 * step - 0.6 * lip + 0.06 * grain + 0.02 * fine
    tone = rng(seed + ':t').uniform(-0.03, 0.03, rows)[row % rows]
    alb = ramp(0.5 + tone + 0.2 * (grain - 0.5) * 0.5, [(0, '#bdb3a2'), (1, '#e0d7c6')])
    alb = alb * (0.7 + 0.3 * smooth(0.0, 0.18, lv))[..., None] * (1 - 0.35 * lip)[..., None]
    seam = (np.abs(((xs + (row % 2) * n / 2) % n) - n / 2) < 1.5 * n / 1024).astype(np.float32)
    alb = lerp(alb, col('#8a8478'), seam * 0.7)
    h = h - 0.2 * seam
    st = streaks(n, seed, 0.35)
    alb = lerp(alb, alb * np.array([0.78, 0.78, 0.74]), st * 0.6)
    rough = 0.72 + 0.08 * fine
    return out(alb, h, rough, 5.0, (1, 3, 10), 1.2)


def siding_metal(n, seed):
    """金属のサイディング（縦のリブ 16 本/2m・ガルバリウム）：リブの陰影・小さなへこみ・下の錆の流れ"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    ribs = 16
    lu = (xs * ribs / n) % 1.0
    prof = smooth(0.0, 0.12, lu) * (1 - smooth(0.42, 0.55, lu))
    fine = spectral(n, seed + ':f', 0.9, 40)
    big = spectral(n, seed + ':b', 2.4, 2)
    h = 0.3 + 0.6 * prof + 0.02 * fine
    alb = ramp(0.5 + 0.2 * (big - 0.5), [(0, '#9da3a8'), (1, '#c4c9cc')])
    alb = alb * (0.82 + 0.18 * prof)[..., None]
    dent = smooth(0.85, 0.95, spectral(n, seed + ':d', 2.0, 8))
    h = h - 0.1 * dent
    st = streaks(n, seed, 0.3, 0.03) * smooth(0.3, 1.0, ys / n)
    alb = lerp(alb, col('#6a4a30'), st * 0.35)
    rough = 0.45 + 0.15 * fine + 0.25 * st
    return out(alb, h, rough, 6.0, (1, 3, 8), 1.0)


def mortar(n, seed):
    """モルタル（リシン吹き付け）の外壁：砂の粒・ゆるいむら・髪の毛のひび・上からの雨だれ・下の緑の汚れ"""
    big = spectral(n, seed + ':big', 2.6, 1)
    mid = spectral(n, seed + ':mid', 2.0, 4)
    fine = spectral(n, seed + ':fine', 0.5, 80)
    grains, gr = speckle(n, seed, 320, 0.7)
    alb = ramp(0.5 + 0.25 * (big - 0.5) + 0.15 * (mid - 0.5), [(0, '#a89e8e'), (1, '#d2c9b8')])
    alb = alb * (0.94 + 0.1 * fine)[..., None]
    alb = lerp(alb, alb * (0.8 + 0.4 * gr)[..., None], grains * 0.5)
    h = 0.45 + 0.1 * big + 0.06 * mid + 0.12 * fine + 0.1 * grains
    cr = cracks(n, seed, cells=5, width=0.008, amount=0.5, warp_px=80)
    alb = alb * (1 - 0.45 * cr)[..., None]
    h = h - 0.2 * cr
    st = streaks(n, seed, 0.5)
    alb = lerp(alb, alb * np.array([0.7, 0.7, 0.66]), st * 0.55)
    ys = np.mgrid[0:n, 0:n][0].astype(np.float32) / n
    green = smooth(0.75, 1.0, ys) * smooth(0.45, 0.8, spectral(n, seed + ':g', 2.2, 3))
    alb = lerp(alb, col('#4a5236'), green * 0.4)
    rough = 0.9 + 0.05 * fine
    return out(alb, h, rough, 4.0, (1, 3, 10), 1.1)


def tile_facade(n, seed):
    """二丁掛けのタイルの外壁（茶・焼きむら・釉の艶）：2m に 8×24・目地のくぼみ"""
    B = bond(n, 8, 24, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    fine = spectral(n, seed + ':f', 1.0, 30)
    alb = ramp(0.5 + 0.3 * tone + 0.1 * (fine - 0.5), [(0, '#5a3a2c'), (0.5, '#7c5440'), (1, '#9a6c52')])
    fire = smooth(0.4, 0.9, spectral(n, seed + ':fr', 1.4, 10))
    alb = lerp(alb, alb * np.array([0.7, 0.62, 0.58]), fire * 0.4)
    gap = 3 * n / 1024
    bev = smooth(gap, gap + 3 * n / 1024, B['d'])
    h = 0.3 + 0.6 * bev + 0.04 * fine
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#8a8278'), joint)
    st = streaks(n, seed, 0.3)
    alb = alb * (1 - 0.2 * st)[..., None]
    rough = 0.38 + 0.2 * (1 - bev) + 0.1 * fine + 0.2 * joint
    return out(alb, h, rough, 4.0, (1, 3, 8), 1.2)


def wood_board(n, seed):
    """縦の板張り（焦げ茶・11 枚/2m）：木目・板の境の影・日焼けのむら"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    boards = 11
    bw = n / boards
    bi = np.floor(xs / bw).astype(int)
    lu = (xs % bw) / bw
    r = rng(seed)
    off = r.uniform(0, n, boards)[bi % boards]
    grain = spectral(n, seed + ':g', 1.0, 6, aniso=(1.0, 0.04))
    rings = np.sin((xs * 0.9 + grain * 60 + off * 0.1) * 0.35) * 0.5 + 0.5
    tone = r.uniform(-0.08, 0.08, boards)[bi % boards]
    alb = ramp(0.45 + tone + 0.2 * (grain - 0.5) + 0.12 * (rings - 0.5), [(0, '#2e2018'), (0.5, '#4a3424'), (1, '#6a4c34')])
    gap = 1 - smooth(0.0, 0.05, np.minimum(lu, 1 - lu))
    alb = alb * (1 - 0.6 * gap)[..., None]
    h = 0.5 + 0.15 * rings + 0.15 * grain - 0.45 * gap
    sun = smooth(0.4, 0.9, spectral(n, seed + ':sun', 2.4, 2))
    alb = lerp(alb, alb * np.array([1.25, 1.2, 1.15]), sun * 0.3)
    rough = 0.75 + 0.1 * grain
    return out(alb, h, rough, 5.0, (1, 3, 8), 1.2)


def kawara_town(n, seed, glazed=False):
    """瓦（いぶし銀／陶器の茶）：1.4m に 4 枚×4 段・桟瓦の波・段の陰・艶"""
    r = rng(seed)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    waves, rows = 4, 4
    pw, ph = n / waves, n / rows
    row = np.floor(ys / ph).astype(int)
    lu = (xs / pw) % 1.0
    ci = np.floor(xs / pw).astype(int) % waves
    lv = (ys % ph) / ph
    prof = np.where(lu < 0.62, 0.55 * np.sin(np.clip(lu / 0.62, 0, 1) * np.pi) * 0.35, 0.35 + 0.65 * np.sin(np.clip((lu - 0.62) / 0.38, 0, 1) * np.pi))
    prof = blur(prof, 2.0 * n / 1024)
    step = lv ** 1.4 * 0.55
    lip = smooth(0.94, 1.0, lv)
    h = 0.55 * prof + step - 0.5 * lip
    tone = r.uniform(-1, 1, (rows, waves))[row % rows, ci]
    fine = spectral(n, seed + ':f', 1.0, 30)
    t = 0.5 + 0.15 * tone + 0.1 * (fine - 0.5)
    if glazed:
        alb = ramp(t, [(0, '#3a2620'), (0.5, '#5a3a2c'), (1, '#7a5040')])
    else:
        alb = ramp(t, [(0, '#2c2f34'), (0.5, '#454950'), (1, '#60656c')])
    crest = smooth(0.4, 0.9, prof)
    alb = lerp(alb, alb * 1.45, crest * 0.5)
    alb = alb * (0.5 + 0.5 * smooth(0.0, 0.12, lv))[..., None]
    dirt = (1 - crest) * smooth(0.5, 0.85, spectral(n, seed + ':dt', 2.2, 3))
    alb = lerp(alb, col('#2a2620'), dirt * 0.5)
    rough = (0.3 if glazed else 0.5) + 0.25 * (1 - crest) + 0.08 * fine + 0.15 * dirt
    return out(alb, h, rough, 9.0, (2, 8, 24), 1.3)


def galv_roof(n, seed):
    """トタン（波板・青灰の塗装）：波・塗装のはげ・錆の筋・釘の列"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    waves = 16
    wave = np.sin((xs / n) * np.pi * 2 * waves) * 0.5 + 0.5
    st = spectral(n, seed + ':st', 1.6, 2, aniso=(0.03, 1.0))
    big = spectral(n, seed + ':b', 2.4, 2)
    fine = spectral(n, seed + ':f', 0.9, 30)
    rust = smooth(0.62, 0.85, 0.6 * st + 0.3 * big + 0.1 * fine)
    paint = ramp(0.5 + 0.2 * (big - 0.5), [(0, '#3e5664'), (1, '#5a7482')])
    rust_c = ramp(fine, [(0, '#4a2412'), (1, '#8a4a24')])
    alb = lerp(paint, rust_c, rust * 0.8)
    alb = alb * (0.7 + 0.3 * wave)[..., None]
    nails = ((np.abs((xs % (n / 4)) - n / 8) < 3) & (np.abs((ys % (n / 2)) - n / 4) < 3)).astype(np.float32)
    alb = lerp(alb, col('#9aa0a4'), nails)
    h = 0.75 * wave + 0.04 * fine + 0.1 * nails
    rough = 0.45 + 0.3 * rust + 0.1 * fine
    return out(alb, h, rough, 10.0, (2, 6, 16), 1.0)


def brick(n, seed):
    """れんが（赤茶・6×16）：焼きむら・目地のくぼみ・白華"""
    B = bond(n, 6, 16, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    fine = spectral(n, seed + ':f', 0.9, 40)
    alb = ramp(0.5 + 0.3 * tone + 0.15 * (fine - 0.5), [(0, '#5a2e22'), (0.5, '#7e4430'), (1, '#9c5a40')])
    burnt = (cell_tone(B['id'], seed + ':bt', 0, 1) > 0.85).astype(np.float32)
    alb = lerp(alb, alb * 0.55, burnt)
    gap = 4 * n / 1024
    bev = smooth(gap, gap + 5 * n / 1024, B['d'])
    h = 0.3 + 0.55 * bev + 0.08 * fine
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#8a8276'), joint * 0.9)
    eff = smooth(0.8, 0.95, spectral(n, seed + ':ef', 1.8, 4))
    alb = lerp(alb, col('#d0ccc0'), eff * 0.3)
    rough = 0.88 + 0.05 * fine
    return out(alb, h, rough, 4.0, (1, 4, 10), 1.3)


def hedge(n, seed):
    """生垣（ネズミモチ・ツゲのような小さな葉が密に）：濃い緑〜明るい新芽・奥は暗い"""
    r = rng(seed)
    base_c = ramp(spectral(n, seed + ':b', 2.0, 4), [(0, '#0e160c'), (1, '#1a2614')])
    S = Stamper(n, 0.1 * spectral(n, seed + ':h', 2.4, 2), base_c)
    S.extra[:] = 0.85
    greens = [col('#24401c'), col('#2e4e22'), col('#3a5c28'), col('#1e3618'), col('#4a6a2e'), col('#5a7a34')]
    scatter_leaves(S, r, 2600, (10, 20), greens, kinds=('ovate',), zr=(0.2, 0.95), curl=0.35)
    depth = smooth(0.2, 0.9, S.h)
    alb = S.c * (0.45 + 0.65 * depth)[..., None]
    return out(alb, S.h, 0.62 + 0.2 * (1 - depth), 6.0, (2, 6, 16), 1.6)


def arcade_tile(n, seed):
    """アーケードの床（0.325m の磁器タイル・2.6m に 8×8・1 枚おきに暖かい色）：磨かれた面・すり傷・目地"""
    B = bond(n, 8, 8, 0.0, seed)
    chk = ((B['row'] + B['col']) % 2).astype(np.float32)
    tone = cell_tone(B['id'], seed, -0.5, 0.5)
    fine = spectral(n, seed + ':f', 0.9, 40)
    marble = warp(spectral(n, seed + ':mb', 1.8, 4), spectral(n, seed + ':mx', 2, 3), spectral(n, seed + ':my', 2, 3), 90)
    a = ramp(0.5 + 0.2 * tone + 0.2 * (marble - 0.5), [(0, '#5c5862'), (1, '#7a7680')])
    b = ramp(0.5 + 0.2 * tone + 0.2 * (marble - 0.5), [(0, '#7a6658'), (1, '#9a8270')])
    alb = lerp(a, b, chk * 0.8)
    gap = 3 * n / 1024
    bev = smooth(gap, gap + 3 * n / 1024, B['d'])
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#2a282c'), joint)
    scuff = smooth(0.6, 0.9, spectral(n, seed + ':sc', 1.0, 20, aniso=(1, 0.15)))
    alb = alb * (1 - 0.12 * scuff)[..., None]
    h = 0.4 + 0.5 * bev + 0.02 * fine
    rough = 0.22 + 0.25 * scuff + 0.4 * joint + 0.05 * fine
    return out(alb, h, rough, 3.0, (1, 3, 8), 1.1)


def shutter(n, seed):
    """巻き上げのシャッター（細い横の板 0.075m・2.4m に 32）：亜鉛の灰・へこみ・下の泥・錆の点"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    slats = 32
    lv = (ys * slats / n) % 1.0
    prof = np.sin(lv * np.pi) ** 0.6
    groove = 1 - smooth(0.0, 0.12, np.minimum(lv, 1 - lv))
    fine = spectral(n, seed + ':f', 0.9, 40)
    big = spectral(n, seed + ':b', 2.4, 2)
    alb = ramp(0.5 + 0.2 * (big - 0.5) + 0.1 * (fine - 0.5), [(0, '#7f858c'), (1, '#b2b8be')])
    alb = alb * (0.72 + 0.28 * prof)[..., None] * (1 - 0.5 * groove)[..., None]
    rustp = smooth(0.85, 0.95, spectral(n, seed + ':r', 1.2, 20))
    alb = lerp(alb, col('#6a3a1e'), rustp * 0.6)
    yy = ys / n
    mud = smooth(0.8, 1.0, yy)
    alb = lerp(alb, col('#4a4236'), mud * 0.5)
    st = streaks(n, seed, 0.35, 0.03)
    alb = alb * (1 - 0.15 * st)[..., None]
    dent = smooth(0.8, 0.95, spectral(n, seed + ':d', 2.2, 6))
    h = 0.3 + 0.5 * prof - 0.4 * groove + 0.02 * fine - 0.08 * dent
    rough = 0.42 + 0.2 * fine + 0.3 * rustp + 0.2 * mud
    return out(alb, h, rough, 6.0, (1, 3, 8), 1.0)


def garage_door(n, seed):
    """車庫のシャッター（横の大きな段 4 つ・白っぽい金属）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    lv = (ys * 8 / n) % 1.0
    prof = smooth(0.0, 0.2, lv) * (1 - smooth(0.85, 1.0, lv))
    fine = spectral(n, seed + ':f', 0.9, 40)
    alb = ramp(0.6 + 0.1 * (fine - 0.5), [(0, '#8e949a'), (1, '#b8bec4')]) * (0.8 + 0.2 * prof)[..., None]
    st = streaks(n, seed, 0.3)
    alb = alb * (1 - 0.15 * st)[..., None]
    h = 0.4 + 0.5 * prof + 0.02 * fine
    return out(alb, h, 0.45 + 0.15 * fine, 5.0, (1, 3, 8), 1.0)


def stone_tile(n, seed):
    """玄関のポーチの石（0.3×0.2 の割肌・ずらし）：灰〜青灰・面の凹凸"""
    B = bond(n, 2, 3, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    face = spectral(n, seed + ':fc', 1.8, 6)
    fine = spectral(n, seed + ':f', 0.8, 40)
    alb = ramp(0.5 + 0.25 * tone + 0.2 * (face - 0.5), [(0, '#55565a'), (0.5, '#727378'), (1, '#8e8c88')])
    gap = 7 * n / 1024
    bev = smooth(gap, gap + 14 * n / 1024, B['d'])
    joint = 1 - smooth(gap * 0.6, gap * 1.2, B['d'])
    alb = lerp(alb, col('#3e3a36'), joint)
    h = 0.3 + 0.4 * bev + 0.2 * face * bev + 0.03 * fine
    rough = 0.7 + 0.15 * face
    return out(alb, h, rough, 6.0, (2, 6, 16), 1.2)


def roof_flat(n, seed):
    """陸屋根（防水シートの継ぎ目・砂利・しみ）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    seam = (np.abs((ys % (n / 3)) - 2) < 3 * n / 1024).astype(np.float32)
    fine = spectral(n, seed + ':f', 0.8, 50)
    big = spectral(n, seed + ':b', 2.4, 2)
    g, gr = speckle(n, seed, 260, 0.9)
    alb = ramp(0.4 + 0.3 * (big - 0.5), [(0, '#3a3a3c'), (1, '#5a5a5c')])
    alb = lerp(alb, ramp(gr, [(0, '#4a4844'), (1, '#8a8680')]), g * 0.6)
    alb = alb * (1 - 0.3 * seam)[..., None]
    pond = smooth(0.7, 0.9, spectral(n, seed + ':p', 2.6, 1))
    alb = lerp(alb, alb * 0.75, pond)
    h = 0.4 + 0.1 * big + 0.1 * g + 0.1 * seam - 0.3 * pond
    return out(alb, h, 0.85 - 0.3 * pond + 0.05 * fine, 4.0)


def paving(n, seed):
    """コンクリートの平板（0.3m・2.2m に 7×7）：面取り・色の差・目地の黒ずみ"""
    B = bond(n, 7, 7, 0.0, seed)
    tone = cell_tone(B['id'], seed)
    fine = spectral(n, seed + ':f', 0.8, 50)
    g, gr = speckle(n, seed, 280, 0.5)
    alb = ramp(0.5 + 0.2 * tone + 0.1 * (fine - 0.5), [(0, '#625c5c'), (1, '#8e8686')])
    alb = lerp(alb, alb * (0.8 + 0.4 * gr)[..., None], g * 0.5)
    gap = 3 * n / 1024
    bev = smooth(gap, gap + 6 * n / 1024, B['d'])
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#2a2828'), joint * 0.85)
    st = smooth(0.6, 0.9, spectral(n, seed + ':st', 2.2, 2))
    alb = alb * (1 - 0.2 * st)[..., None]
    h = 0.35 + 0.55 * bev + 0.04 * fine
    return out(alb, h, 0.84 - 0.1 * st + 0.05 * fine, 4.0, (1, 3, 8), 1.2)


def grating(n, seed):
    """側溝のふた（鉄のグレーチング・0.9m）：縁のコンクリート・鉄の棒・すき間の暗さ・錆"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    v = ys / n
    rim = ((v < 0.08) | (v > 0.92)).astype(np.float32)
    bars = ((xs * 26 / n) % 1.0 < 0.38).astype(np.float32)
    cross = (np.abs(((ys * 3 / n) % 1.0) - 0.5) < 0.03).astype(np.float32)
    steel = np.clip(bars + cross, 0, 1) * (1 - rim)
    gap = (1 - steel) * (1 - rim)
    fine = spectral(n, seed + ':f', 0.9, 40)
    rust = smooth(0.5, 0.85, spectral(n, seed + ':r', 1.6, 6))
    c_steel = lerp(ramp(fine, [(0, '#3c3e40'), (1, '#5c5e60')]), col('#5a3420'), rust * 0.6)
    c_con = ramp(fine, [(0, '#6a6864'), (1, '#8a8682')])
    alb = c_con * rim[..., None] + c_steel * steel[..., None] + col('#08080a')[None, None, :] * gap[..., None]
    h = 0.6 * rim + 0.5 * steel + 0.0 * gap + 0.02 * fine
    rough = 0.85 * rim + (0.5 + 0.3 * rust) * steel + 0.9 * gap
    return out(alb, h, rough, 8.0, (1, 3, 6), 1.0, metal=0.0)


def granite_slab(n, seed):
    """広場の御影石（0.6×0.3 のバーナー仕上げ・4m に 7×14）"""
    B = bond(n, 7, 14, 0.5, seed)
    tone = cell_tone(B['id'], seed)
    F1, F2, ID = worley(n, 260, seed + ':g', jitter=1.0)
    idr = cellrand(ID, seed)
    grain = np.select([idr < 0.2, idr < 0.32], [0.1, 0.92], 0.55)
    fine = spectral(n, seed + ':f', 0.8, 50)
    t = 0.5 + 0.15 * tone + 0.35 * (grain - 0.5) + 0.05 * fine
    alb = ramp(t, [(0, '#3a383c'), (0.5, '#7a767a'), (1, '#b4b0b2')])
    gap = 2.5 * n / 1024
    bev = smooth(gap, gap + 3 * n / 1024, B['d'])
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#1e1c20'), joint * 0.9)
    h = 0.35 + 0.5 * bev + 0.06 * fine + 0.04 * grain
    return out(alb, h, 0.72 + 0.12 * fine, 4.0, (1, 3, 8), 1.1)


def tactile(n, seed):
    """点字ブロック（黄・0.3m の板に点の突起）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    cell = n / 5
    lx = (xs % cell) / cell - 0.5
    ly = (ys % cell) / cell - 0.5
    rr = np.hypot(lx, ly)
    dot = np.sqrt(np.clip(1 - (rr / 0.3) ** 2, 0, 1))
    fine = spectral(n, seed + ':f', 0.9, 40)
    alb = ramp(0.5 + 0.2 * (fine - 0.5), [(0, '#b88a10'), (1, '#e0b028')])
    dirt = smooth(0.5, 0.85, spectral(n, seed + ':d', 2.0, 3))
    alb = lerp(alb, col('#5a4a2a'), dirt * 0.4)
    edge = np.minimum(np.minimum(xs, n - 1 - xs), np.minimum(ys, n - 1 - ys))
    j = 1 - smooth(1.0, 4.0, edge)
    alb = alb * (1 - 0.5 * j)[..., None] * (0.85 + 0.15 * dot)[..., None]
    h = 0.3 + 0.6 * dot - 0.2 * j + 0.02 * fine
    return out(alb, h, 0.62 + 0.15 * dirt, 6.0, (1, 3, 6), 1.0)


def trackbed(n, seed):
    """路面電車の軌道（コンクリートの版・真ん中の油としみ）"""
    c = concrete(n, seed, base='#6e6c68', joints=False)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    u = xs / n
    mid = smooth(0.25, 0.4, u) * (1 - smooth(0.6, 0.75, u))
    alb = lerp(c['albedo'], col('#2a2420'), mid * 0.55)
    joint = (np.abs((ys % (n / 4)) - n / 8) < 1.5 * n / 1024).astype(np.float32)
    alb = alb * (1 - 0.4 * joint)[..., None]
    rough = c['rough'] - 0.25 * mid
    return out(alb, c['height'] - 0.1 * joint, rough, 3.0)


def panel_wall(n, seed):
    """ALC・金属パネルの外壁（0.6m 幅の板・シールの目地・塗装のむら）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    cols_ = 4
    lu = (xs * cols_ / n) % 1.0
    lv = (ys * 2 / n) % 1.0
    du = np.minimum(lu, 1 - lu) * n / cols_
    dv = np.minimum(lv, 1 - lv) * n / 2
    d = np.minimum(du, dv)
    fine = spectral(n, seed + ':f', 0.7, 50)
    big = spectral(n, seed + ':b', 2.4, 2)
    alb = ramp(0.5 + 0.2 * (big - 0.5) + 0.06 * (fine - 0.5), [(0, '#9a9e9e'), (1, '#c4c6c4')])
    joint = 1 - smooth(1.5 * n / 1024, 4 * n / 1024, d)
    alb = lerp(alb, col('#5a5c5c'), joint)
    st = streaks(n, seed, 0.3)
    alb = alb * (1 - 0.18 * st)[..., None]
    h = 0.5 - 0.4 * joint + 0.04 * fine
    return out(alb, h, 0.7 + 0.08 * fine, 4.0)


def paint(n, seed):
    """塗装の面（白に近い：頂点の色で色を付ける）：ごく弱いむら・ほこり・小さなはげ。柱・枠・箱・車など色の付いた小物に共通"""
    big = spectral(n, seed + ':b', 2.6, 1)
    fine = spectral(n, seed + ':f', 0.7, 60)
    dust = smooth(0.55, 0.9, spectral(n, seed + ':d', 2.0, 3))
    v = 0.86 + 0.06 * (big - 0.5) + 0.03 * (fine - 0.5) - 0.08 * dust
    alb = np.stack([v, v, v * 0.99], -1)
    chip = smooth(0.9, 0.97, spectral(n, seed + ':c', 1.2, 20))
    alb = lerp(alb, col('#5a5a5c'), chip * 0.7)
    h = 0.5 + 0.03 * fine - 0.2 * chip
    return out(alb, h, 0.5 + 0.12 * fine + 0.25 * dust + 0.2 * chip, 2.0)


def water(n, seed):
    """用水路の水（暗い青緑・さざ波の法線）"""
    rip = spectral(n, seed + ':r', 2.2, 6, aniso=(1.0, 0.5))
    fine = spectral(n, seed + ':f', 1.4, 20)
    alb = ramp(0.5 + 0.2 * (fine - 0.5), [(0, '#0a141c'), (1, '#16242e')])
    h = 0.6 * rip + 0.4 * fine
    return out(alb, h, np.full((n, n), 0.06, np.float32), 2.0)


# ───────────────────────── 屋内 ─────────────────────────
def vinyl(n, seed):
    """病院の長尺シート（薄い灰緑・細かいチップの柄・継ぎ目・すり傷・ワックスの艶）"""
    big = spectral(n, seed + ':b', 2.6, 1)
    fine = spectral(n, seed + ':f', 0.7, 60)
    chips, cr = speckle(n, seed, 300, 0.8)
    alb = ramp(0.5 + 0.2 * (big - 0.5), [(0, '#8c9690'), (1, '#a8b2aa')])
    alb = lerp(alb, ramp(cr, [(0, '#5a645e'), (0.5, '#c8d0c8'), (1, '#7a8a84')]), chips * 0.6)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    seam = (np.abs(xs - n / 2) < 1.2 * n / 1024).astype(np.float32)
    alb = alb * (1 - 0.25 * seam)[..., None]
    scuff = smooth(0.62, 0.9, spectral(n, seed + ':sc', 1.0, 16, aniso=(1, 0.2)))
    alb = alb * (1 - 0.1 * scuff)[..., None]
    h = 0.5 + 0.03 * fine - 0.2 * seam
    return out(alb, h, 0.28 + 0.2 * scuff + 0.05 * fine, 1.5)


def plaster(n, seed):
    """屋内の塗装の壁（石膏ボード・ゆず肌）：ごく弱いむら・下のこすれ"""
    big = spectral(n, seed + ':b', 2.6, 1)
    peel = spectral(n, seed + ':p', 0.9, 90)
    v = 0.84 + 0.05 * (big - 0.5)
    alb = np.stack([v, v * 0.985, v * 0.96], -1) * (0.97 + 0.04 * peel)[..., None]
    ys = np.mgrid[0:n, 0:n][0].astype(np.float32) / n
    scuff = smooth(0.85, 1.0, ys) * smooth(0.5, 0.8, spectral(n, seed + ':s', 1.2, 10, aniso=(1, 0.2)))
    alb = alb * (1 - 0.2 * scuff)[..., None]
    h = 0.5 + 0.08 * peel
    return out(alb, h, 0.8 - 0.1 * scuff, 1.5)


def gym_floor(n, seed):
    """体育館の床（楓の細い板・ウレタンの艶）：板ごとの色・木目・継ぎ目"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    rows = 14
    bh = n / rows
    row = np.floor(ys / bh).astype(int)
    r = rng(seed)
    off = r.uniform(0, 1, rows)[row % rows]
    L = n / 2.2
    cx = xs / L + off
    seg = np.floor(cx).astype(int)
    lv = (ys % bh) / bh
    lu = cx - seg
    tone = cell_tone((row * 31 + seg) % 997, seed)
    grain = spectral(n, seed + ':g', 1.0, 6, aniso=(0.04, 1.0))
    alb = ramp(0.5 + 0.15 * tone + 0.2 * (grain - 0.5), [(0, '#a8794a'), (0.5, '#c4935c'), (1, '#d8aa70')])
    gap = 1 - smooth(0.0, 0.06, np.minimum(lv, 1 - lv)) * smooth(0.0, 0.01, np.minimum(lu, 1 - lu))
    alb = alb * (1 - 0.35 * gap)[..., None]
    scuff = smooth(0.7, 0.92, spectral(n, seed + ':sc', 1.0, 20))
    alb = lerp(alb, col('#4a3a2a'), scuff * 0.25)
    h = 0.5 + 0.06 * grain - 0.3 * gap
    return out(alb, h, 0.2 + 0.15 * scuff + 0.05 * grain, 2.0)


def ceiling_tile(n, seed):
    """吸音の天井板（0.6m・虫食いの穴・T バー）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    e = np.minimum(np.minimum(xs, n - 1 - xs), np.minimum(ys, n - 1 - ys))
    bar = 1 - smooth(4, 8, e * 1024 / n)
    holes, _ = speckle(n, seed, 220, 0.5)
    worm = smooth(0.8, 0.95, spectral(n, seed + ':w', 0.8, 60))
    v = 0.82 - 0.25 * holes - 0.15 * worm
    alb = np.stack([v, v, v * 0.98], -1)
    alb = lerp(alb, col('#c8c8c4'), bar)
    h = 0.6 - 0.3 * holes - 0.1 * worm - 0.2 * bar
    return out(alb, h, 0.9 - 0.4 * bar, 2.0)


def epoxy(n, seed):
    """研究施設の塗り床（灰緑のエポキシ・艶・すり傷・タイヤの跡）"""
    big = spectral(n, seed + ':b', 2.6, 1)
    fine = spectral(n, seed + ':f', 0.8, 50)
    alb = ramp(0.5 + 0.25 * (big - 0.5), [(0, '#5a6660'), (1, '#74827a')])
    scr = smooth(0.75, 0.95, spectral(n, seed + ':s', 0.9, 30, aniso=(1, 0.06)))
    tire = smooth(0.6, 0.9, spectral(n, seed + ':t', 1.6, 2, aniso=(1, 0.05)))
    alb = alb * (1 - 0.12 * scr - 0.2 * tire)[..., None]
    h = 0.5 + 0.02 * fine - 0.05 * scr
    return out(alb, h, 0.18 + 0.3 * scr + 0.15 * tire + 0.04 * fine, 1.5)


def metal_panel(n, seed):
    """屋内の金属パネルの壁（灰白・1.2m×0.6m・リベット・継ぎ目）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    lu = (xs * 2 / n) % 1.0
    lv = (ys * 2 / n) % 1.0
    d = np.minimum(np.minimum(lu, 1 - lu) * n / 2, np.minimum(lv, 1 - lv) * n / 2)
    joint = 1 - smooth(2 * n / 1024, 5 * n / 1024, d)
    rx = ((xs * 2 / n) % 1.0 * 8) % 1.0
    rv = np.minimum(lv, 1 - lv) * n / 2
    rivet = (np.hypot((rx - 0.5) * n / 16, rv - 12 * n / 1024) < 4 * n / 1024).astype(np.float32)
    fine = spectral(n, seed + ':f', 0.8, 50)
    big = spectral(n, seed + ':b', 2.4, 2)
    alb = ramp(0.5 + 0.2 * (big - 0.5), [(0, '#a4aaa8'), (1, '#c4c8c6')]) * (1 - 0.4 * joint)[..., None]
    alb = alb * (1 - 0.2 * rivet)[..., None]
    st = streaks(n, seed, 0.25)
    alb = alb * (1 - 0.1 * st)[..., None]
    h = 0.5 - 0.4 * joint + 0.2 * rivet + 0.02 * fine
    return out(alb, h, 0.45 + 0.15 * fine + 0.1 * st, 4.0)


def carpet(n, seed):
    """タイルカーペット（0.5m・ループの毛・向きを変えて敷く・青灰）"""
    B = bond(n, 4, 4, 0.0, seed)
    dirx = ((B['row'] + B['col']) % 2).astype(np.float32)
    a = spectral(n, seed + ':a', 0.6, 80, aniso=(1.0, 0.25))
    b = spectral(n, seed + ':b2', 0.6, 80, aniso=(0.25, 1.0))
    pile = lerp(a, b, dirx)
    loops, _ = speckle(n, seed, 420, 1.0)
    alb = ramp(0.5 + 0.3 * (pile - 0.5) + 0.1 * loops, [(0, '#2a3038'), (1, '#46505a')])
    joint = 1 - smooth(1, 3 * n / 1024, B['d'])
    alb = alb * (1 - 0.3 * joint)[..., None]
    wear = smooth(0.6, 0.9, spectral(n, seed + ':w', 2.2, 2))
    alb = lerp(alb, alb * 1.15, wear * 0.4)
    h = 0.5 + 0.2 * pile + 0.15 * loops - 0.3 * joint
    return out(alb, h, 0.95, 3.0, (1, 2, 6), 1.3)


def wood_floor(n, seed):
    """家のフローリング（オーク・幅 0.15m・長さばらばら・つや消しの塗装）"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    rows = 12
    bh = n / rows
    row = np.floor(xs / bh).astype(int)      # 板は縦（v）に長い
    r = rng(seed)
    off = r.uniform(0, 1, rows)[row % rows]
    L = n / 1.4
    cy = ys / L + off
    seg = np.floor(cy).astype(int)
    lu = (xs % bh) / bh
    lv = cy - seg
    tone = cell_tone((row * 17 + seg) % 997, seed)
    grain = spectral(n, seed + ':g', 1.0, 6, aniso=(1.0, 0.04))
    rings = np.sin((ys * 0.05 + grain * 40 + off * 50) * 1.0) * 0.5 + 0.5
    alb = ramp(0.5 + 0.18 * tone + 0.15 * (grain - 0.5) + 0.08 * (rings - 0.5), [(0, '#6a4a30'), (0.5, '#8a6440'), (1, '#a67c52')])
    gap = 1 - smooth(0.0, 0.05, np.minimum(lu, 1 - lu)) * smooth(0.0, 0.006, np.minimum(lv, 1 - lv))
    alb = alb * (1 - 0.45 * gap)[..., None]
    h = 0.5 + 0.08 * grain + 0.04 * rings - 0.35 * gap
    return out(alb, h, 0.45 + 0.1 * grain, 2.5)


def tile_white(n, seed):
    """白い磁器タイル（0.15m・目地・つや）：病院の水まわり・台所"""
    B = bond(n, 8, 8, 0.0, seed)
    tone = cell_tone(B['id'], seed, -0.5, 0.5)
    v = 0.86 + 0.03 * tone
    alb = np.stack([v, v, v * 0.98], -1)
    gap = 4 * n / 1024
    bev = smooth(gap, gap + 6 * n / 1024, B['d'])
    joint = 1 - smooth(gap * 0.6, gap * 1.3, B['d'])
    alb = lerp(alb, col('#9a9890'), joint)
    h = 0.4 + 0.5 * bev
    return out(alb, h, 0.12 + 0.6 * joint, 3.0)


# 材質の表：id → (関数, 種, tileM（m）, (日本語, 英語), 分類の言葉, 使う所)
TOWN_MATERIALS = {
    'mat.town.asphalt': (asphalt, 'ta1', 6.0, ('アスファルト（骨材・ひび・油のしみ）', 'Asphalt'), ['道', 'アスファルト'], ['車道', '駐車場']),
    'mat.town.asphalt_patch': (lambda n, s: asphalt(n, s, tone=-0.01, patch=True), 'ta2', 6.0, ('補修したアスファルト', 'Patched asphalt'), ['道', 'アスファルト', '補修'], ['車道']),
    'mat.town.asphalt_old': (lambda n, s: asphalt(n, s, tone=0.02, old=True), 'ta3', 5.0, ('古い生活道路（亀甲のひび）', 'Old lane asphalt'), ['道', 'アスファルト', 'ひび'], ['生活道路']),
    'mat.town.interlock': (interlock, 'ti1', 1.6, ('インターロッキング', 'Interlocking pavers'), ['歩道', '舗装'], ['歩道']),
    'mat.town.concrete': (concrete, 'tc1', 3.0, ('コンクリート', 'Concrete'), ['コンクリート'], ['土間', '縁', '用水路']),
    'mat.town.curb': (curb, 'tk1', 2.0, ('縁石', 'Curb stone'), ['縁石'], ['歩道の縁']),
    'mat.town.block_wall': (block_wall, 'tb1', 1.2, ('ブロック塀（カビ・苔）', 'Concrete block wall'), ['塀', 'ブロック'], ['塀']),
    'mat.town.siding': (siding, 'ts1', 2.0, ('窯業系サイディング', 'Fiber-cement lap siding'), ['外壁', 'サイディング'], ['家の外壁']),
    'mat.town.siding_metal': (siding_metal, 'ts2', 2.0, ('金属サイディング（縦のリブ）', 'Ribbed metal siding'), ['外壁', '金属'], ['集合住宅', '倉庫']),
    'mat.town.mortar': (mortar, 'tm1', 2.0, ('モルタルの外壁（リシン）', 'Mortar stucco wall'), ['外壁', 'モルタル'], ['店', '古い家']),
    'mat.town.tile_facade': (tile_facade, 'tt1', 2.0, ('二丁掛けタイルの外壁', 'Brown facade tiles'), ['外壁', 'タイル'], ['ビル', '店']),
    'mat.town.wood_board': (wood_board, 'tw1', 2.0, ('縦の板張り（焦げ茶）', 'Dark vertical boards'), ['外壁', '木'], ['町家', '古い家']),
    'mat.town.kawara': (kawara_town, 'tr1', 1.4, ('いぶし瓦（町）', 'Silver kawara (town)'), ['屋根', '瓦'], ['家の屋根', '町家']),
    'mat.town.kawara_glazed': (lambda n, s: kawara_town(n, s, glazed=True), 'tr2', 1.4, ('陶器瓦（茶）', 'Glazed kawara (brown)'), ['屋根', '瓦'], ['家の屋根']),
    'mat.town.galv_roof': (galv_roof, 'tg1', 1.6, ('トタンの屋根（青灰）', 'Painted corrugated roof'), ['屋根', 'トタン'], ['屋根', '物置']),
    'mat.town.brick': (brick, 'tbr', 1.5, ('れんが', 'Brick'), ['外壁', 'れんが'], ['店', '花壇']),
    'mat.town.hedge': (hedge, 'th1', 1.4, ('生垣', 'Hedge'), ['植物', '生垣'], ['生垣', '植え込み']),
    'mat.town.arcade_tile': (arcade_tile, 'tat', 2.6, ('アーケードの床（磁器タイル）', 'Arcade floor tiles'), ['床', 'タイル'], ['アーケード']),
    'mat.town.shutter': (shutter, 'tsh', 2.4, ('シャッター', 'Rolling shutter'), ['シャッター', '金属'], ['店']),
    'mat.town.garage_door': (garage_door, 'tgd', 2.4, ('車庫のシャッター', 'Garage door'), ['シャッター', '金属'], ['車庫']),
    'mat.town.stone_tile': (stone_tile, 'tst', 0.7, ('玄関の石（割肌）', 'Porch stone'), ['石', '床'], ['玄関', '門柱']),
    'mat.town.roof_flat': (roof_flat, 'trf', 3.0, ('陸屋根（防水・砂利）', 'Flat roof'), ['屋根'], ['ビルの屋上']),
    'mat.town.paving': (paving, 'tpv', 2.2, ('コンクリートの平板', 'Concrete pavers'), ['舗装'], ['駅前', '広場']),
    'mat.town.grating': (grating, 'tgr', 0.9, ('側溝のふた（グレーチング）', 'Gutter grating'), ['金属', '側溝'], ['生活道路の側溝']),
    'mat.town.granite_slab': (granite_slab, 'tgs', 4.0, ('御影石の敷石（広場）', 'Granite slabs'), ['石', '舗装'], ['広場', '駅前']),
    'mat.town.tactile': (tactile, 'ttp', 0.3, ('点字ブロック', 'Tactile paving'), ['舗装', '点字ブロック'], ['歩道', '駅', '電停']),
    'mat.town.trackbed': (trackbed, 'ttb', 2.0, ('路面電車の軌道（コンクリート）', 'Tram track slab'), ['軌道', 'コンクリート'], ['中央通り']),
    'mat.town.panel': (panel_wall, 'tpn', 2.0, ('ALC・金属パネルの外壁', 'Panel facade'), ['外壁', 'パネル'], ['ビル', '駅']),
    'mat.town.paint': (paint, 'tpt', 1.0, ('塗装の面（白・頂点の色で色付け）', 'Painted surface (tintable)'), ['塗装'], ['柱', '枠', '小物', '車']),
    'mat.town.water': (water, 'twt', 1.6, ('用水路の水', 'Channel water'), ['水'], ['用水路']),
    'mat.int.vinyl': (vinyl, 'iv1', 2.0, ('長尺シートの床（病院）', 'Sheet vinyl floor'), ['床', '屋内', '病院'], ['病院', '避難所の廊下']),
    'mat.int.plaster': (plaster, 'ip1', 2.0, ('塗装の内壁', 'Painted interior wall'), ['壁', '屋内'], ['病院', '家', '事務所']),
    'mat.int.gym_floor': (gym_floor, 'ig1', 2.0, ('体育館の床（楓）', 'Gym maple floor'), ['床', '屋内', '体育館'], ['避難所']),
    'mat.int.ceiling': (ceiling_tile, 'ic1', 1.2, ('吸音の天井板', 'Acoustic ceiling tile'), ['天井', '屋内'], ['病院', '事務所']),
    'mat.int.epoxy': (epoxy, 'ie1', 3.0, ('塗り床（エポキシ）', 'Epoxy floor'), ['床', '屋内', '研究施設'], ['研究施設', '機械室']),
    'mat.int.metal_panel': (metal_panel, 'im1', 2.4, ('金属パネルの内壁', 'Metal wall panels'), ['壁', '屋内', '研究施設'], ['研究施設', '管理棟']),
    'mat.int.carpet': (carpet, 'ica', 2.0, ('タイルカーペット', 'Carpet tiles'), ['床', '屋内'], ['管理棟の制御室', '事務所']),
    'mat.int.wood_floor': (wood_floor, 'iw1', 1.8, ('フローリング', 'Oak flooring'), ['床', '屋内', '家'], ['自宅']),
    'mat.int.tile_white': (tile_white, 'it1', 1.2, ('白い磁器タイル', 'White ceramic tiles'), ['壁', '床', '屋内'], ['病院の水まわり', '台所']),
}
# 1024 も Web に出す（近くで大きく見える道・壁）
TOWN_BIG = {'mat.town.asphalt', 'mat.town.asphalt_patch', 'mat.town.asphalt_old', 'mat.town.interlock', 'mat.town.block_wall', 'mat.town.siding',
            'mat.town.mortar', 'mat.town.arcade_tile', 'mat.town.kawara', 'mat.int.vinyl', 'mat.int.gym_floor', 'mat.int.wood_floor'}
