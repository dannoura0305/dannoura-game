# わかば matgen：境界侵食の町の植物（街路樹・庭木・生垣・植え込み・鉢植え・雑草）の材質（PBR の組）。境界侵食 P16。
# defs.py（山の廃村の杉・広葉樹・シダ・草のカード）と同じ決まり・同じ道具：1 つの関数＝1 つの材質・種で決まる・上下左右につながる。
# 葉のカードは「下が付け根」（_branch_walk で下の中心から上へ）・透過（A）・縁の色のにじみ（_finish_card）。
# 季節は町の設定（雪囲い・落ち葉の印）に合わせて晩秋：ケヤキ・桜は紅葉の混じり、イチョウは黄葉。松・ツツジ・生垣は常緑。
# 色は自然の物の目安（sRGB 0.1〜0.6）。描画の側（mapkit/render/assets.js）でカードの色は 0.66 倍・つやなしになる。
import numpy as np
from tex import spectral, worley, warp, smooth, lerp, col, ramp, norm01, rng, rot, leaf_shape, cellrand
from defs import _card, _finish_card, _branch_walk, jitter_color, blob_fn, needle_fn, blade_fn, lichen_layer


def _twigs(r, n, count_side=(0.25, 0.45), main_len=0.75, step=10, wobble=0.03, spread=(0.5, 1.1), skip=0.25):
    """下の中心から伸びる主軸と左右の小枝（点の列のリスト）"""
    tw = []
    main = _branch_walk(r, n * 0.5 + r.normal(0, n * 0.02), n * 0.99, -np.pi / 2 + r.normal(0, 0.04), n * main_len, step, wobble)
    tw.append(main)
    for (x, y, ang, t) in main[1::2]:
        for side in (-1, 1):
            if r.random() < skip:
                continue
            tw.append(_branch_walk(r, x, y, ang + side * r.uniform(*spread), n * r.uniform(*count_side) * (1 - 0.4 * t), step, 0.08))
    return tw


def _leafy(S, r, n, tw, colors, half=(26, 40), per=2, kind='ovate', curl=0.4, serrate=0.0, twig_col='#3a2a1c', z_bias=0.0, squash=1.1, bright=0.15):
    """小枝に沿って葉を付ける（scatter の代わり：付け根から外へ向けて）"""
    for t_ in tw:
        for (x, y, ang, t) in t_:
            S.stamp(x, y, 4.5, blob_fn(0.6, 0.1), 0.0, col(twig_col))
        for (x, y, ang, t) in t_[1:]:
            for k in range(per):
                a = ang + r.choice([-1, 1]) * r.uniform(0.45, 1.25)
                hf = r.uniform(*half) * (1 - 0.25 * t)
                cx = x + np.cos(a) * hf * 0.85
                cy = y + np.sin(a) * hf * 0.85
                if not (hf < cx < n - hf and hf < cy < n - hf):
                    continue
                c0 = jitter_color(colors[r.integers(len(colors))], r, 0.22)
                if r.random() < bright:
                    c0 = np.clip(c0 * 1.25 + 0.02, 0, 1)
                base = leaf_shape(kind, curl)
                ser = serrate

                def fn(u, v, a=a, base=base, ser=ser):
                    uu, vv = rot(u, v, a)
                    edge = np.abs(np.sin((uu + 1) * 14)) if ser else 0.0       # 縁のぎざぎざ（鋸歯）
                    return base(uu, vv * squash * (1 + 0.16 * ser * edge))

                def cf(u, v, a=a, c0=c0):
                    uu, vv = rot(u, v, a)
                    shade = 0.8 + 0.2 * (1 - np.clip(np.abs(vv) * 1.8, 0, 1)) + 0.05 * uu
                    vein = np.where(np.abs(vv) < 0.03, 1.12, 1.0)
                    return c0[None, None, :] * (shade * vein)[..., None]
                S.stamp(cx, cy, hf, fn, r.uniform(0.2, 1.0) + t + z_bias, cf)


# ───────────────────────── 街路樹・庭木の葉のカード ─────────────────────────
def keyaki_spray(n, seed):
    """ケヤキの葉のカード：細い小枝に、縁がぎざぎざの小さな卵形の葉が交互に。晩秋＝緑・黄土・赤茶の混じり"""
    r = rng(seed)
    S = _card(n)
    cols = [col('#3c5422'), col('#4a5c26'), col('#6e6a2a'), col('#8a6a28'), col('#9a5a26'), col('#7a4422'), col('#5a5a24')]
    tw = _twigs(r, n, count_side=(0.3, 0.5), main_len=0.82, step=9, spread=(0.5, 0.95), skip=0.15)
    _leafy(S, r, n, tw, cols, half=(20, 30), per=2, kind='ovate', curl=0.35, serrate=1.0, twig_col='#3a2e24', squash=1.35)
    return _finish_card(S, 0.7, 3.2)


def ginkgo_fn(curl=0.3):
    """イチョウの葉（扇形・真ん中に浅い切れ込み・付け根に葉柄）。u が長い向き（−1＝付け根）"""
    def fn(u, v):
        x = u + 0.95
        r = np.hypot(x, v)
        a = np.arctan2(v, x)
        rim = 1.85 * (1 - 0.12 * np.exp(-(a / 0.09) ** 2)) * (1 + 0.04 * np.cos(a * 9))
        fan = (np.abs(a) < 0.82) & (r < rim) & (r > 0.55)
        stalk = (x > 0) & (x < 0.62) & (np.abs(v) < 0.05)
        cov = (fan | stalk).astype(np.float32)
        dh = curl * np.clip(1 - np.abs(a) / 0.82, 0, 1) * np.clip((r - 0.55) / 1.3, 0, 1) + 0.04 * np.sin(a * 22) * (r > 0.8)
        return cov, dh
    return fn


def ichou_fan(n, seed):
    """イチョウの葉のカード：短い枝（短枝）から扇形の葉の束。黄葉（明るい山吹〜黄緑が少し）"""
    r = rng(seed)
    S = _card(n)
    yel = [col('#b8902a'), col('#c49a2e'), col('#a8842a'), col('#d0a838'), col('#9a8a30'), col('#8a8a34')]
    tw = _twigs(r, n, count_side=(0.25, 0.42), main_len=0.8, step=11, spread=(0.55, 1.05), skip=0.2)
    for t_ in tw:
        for (x, y, ang, t) in t_:
            S.stamp(x, y, 4.0, blob_fn(0.6, 0.1), 0.0, col('#4a3c2c'))
        for (x, y, ang, t) in t_[2::2]:
            for k in range(r.integers(3, 6)):                          # 短枝の束：同じ所から 3〜5 枚
                a = ang + r.uniform(-1.6, 1.6)
                hf = r.uniform(24, 36) * (1 - 0.2 * t)
                cx, cy = x + np.cos(a) * hf * 0.75, y + np.sin(a) * hf * 0.75
                if not (hf < cx < n - hf and hf < cy < n - hf):
                    continue
                c0 = jitter_color(yel[r.integers(len(yel))], r, 0.18)
                base = ginkgo_fn(0.3)

                def fn(u, v, a=a, base=base):
                    uu, vv = rot(u, v, a)
                    return base(uu * 1.0, vv)

                def cf(u, v, a=a, c0=c0):
                    uu, vv = rot(u, v, a)
                    rr = np.hypot(uu + 0.95, vv)
                    fanv = 1 + 0.06 * np.sin(np.arctan2(vv, uu + 0.95) * 40)          # 扇の筋（平行な葉脈）
                    return c0[None, None, :] * (0.78 + 0.22 * np.clip(rr / 1.8, 0, 1) * fanv)[..., None]
                S.stamp(cx, cy, hf, fn, r.uniform(0.2, 1.0) + t, cf)
    return _finish_card(S, 0.66, 3.0)


def sakura_leaf(n, seed):
    """桜の葉のカード（晩秋）：大きめの楕円の葉（先がとがる・細かいぎざぎざ）。橙・赤・えんじ・残りの緑"""
    r = rng(seed)
    S = _card(n)
    cols = [col('#a84a24'), col('#b8622a'), col('#8a3022'), col('#9a7a2c'), col('#4c5a24'), col('#c07a30'), col('#7a2a20')]
    tw = _twigs(r, n, count_side=(0.25, 0.4), main_len=0.75, step=12, spread=(0.6, 1.1), skip=0.3)
    _leafy(S, r, n, tw, cols, half=(30, 44), per=2, kind='ovate', curl=0.45, serrate=0.6, twig_col='#3a2422', squash=1.2, bright=0.1)
    return _finish_card(S, 0.68, 3.4)


def matsu_tuft(n, seed):
    """松の葉のカード：小枝の先ごとに、2 本ずつの長い針の房が放射状に。濃い緑・先は少し黄緑・付け根は茶（クロマツ風）"""
    r = rng(seed)
    S = _card(n)
    greens = [col('#22361c'), col('#2a3e20'), col('#304626'), col('#263a1e')]
    tips = [col('#4a5a2c'), col('#56663a')]
    tw = _twigs(r, n, count_side=(0.22, 0.36), main_len=0.7, step=12, spread=(0.5, 1.0), skip=0.35)
    for t_ in tw:
        for (x, y, ang, t) in t_:
            S.stamp(x, y, 5.0, blob_fn(0.6, 0.15), 0.0, col('#4a3424'))
        for (x, y, ang, t) in t_[1:]:
            m = r.integers(9, 15)
            for k in range(m):
                a = ang + r.normal(0, 0.9)
                L = r.uniform(34, 56) * (1 - 0.2 * t)
                cx, cy = x + np.cos(a) * L * 0.95, y + np.sin(a) * L * 0.95
                if not (L < cx < n - L and L < cy < n - L):
                    continue
                c0 = jitter_color(greens[r.integers(4)], r, 0.2)
                ct = jitter_color(tips[r.integers(2)], r, 0.2)
                fn0 = needle_fn(0.05, 0.4)

                def fn(u, v, a=a, fn0=fn0):
                    uu, vv = rot(u, v, a)
                    return fn0(uu, vv)

                def cf(u, v, a=a, c0=c0, ct=ct):
                    uu, vv = rot(u, v, a)
                    tt = np.clip((uu + 1) / 2, 0, 1)[..., None]
                    return c0[None, None, :] * (0.75 + 0.35 * tt) * (1 - tt * 0.3) + ct[None, None, :] * tt * 0.3
                S.stamp(cx, cy, L, fn, r.uniform(0.3, 1.0) + t, cf)
    return _finish_card(S, 0.7, 3.0)


# ───────────────────────── 低木・生垣・鉢植え ─────────────────────────
def tsutsuji_leaves(n, seed):
    """ツツジ（刈り込んだ植え込み）の葉のカード：小さな細長い葉が密に重なる。濃い緑・少し赤みの古い葉"""
    r = rng(seed)
    S = _card(n)
    cols = [col('#24381c'), col('#2c4220'), col('#344a24'), col('#3e5228'), col('#4a3a22')]
    tw = _twigs(r, n, count_side=(0.3, 0.5), main_len=0.9, step=7, spread=(0.4, 1.2), skip=0.05)
    _leafy(S, r, n, tw, cols, half=(14, 22), per=3, kind='lance', curl=0.3, twig_col='#3a2a1e', squash=0.75, bright=0.12)
    # 隙間を埋める（刈り込んだ面は密）：奥の葉
    for k in range(900):
        x, y = r.uniform(20, n - 20), r.uniform(n * 0.12, n - 16)
        hf = r.uniform(10, 18)
        a = r.uniform(0, np.pi * 2)
        c0 = jitter_color(cols[r.integers(len(cols))], r, 0.2) * 0.75

        def fn(u, v, a=a):
            uu, vv = rot(u, v, a)
            return leaf_shape('lance', 0.2)(uu, vv * 0.8)
        S.stamp(x, y, hf, fn, r.uniform(-0.6, 0.0), c0)
    return _finish_card(S, 0.62, 3.2)


def hedge_leaves(n, seed):
    """生垣（カナメモチ・ツゲ風）の面：小さな卵形の葉がすき間なく重なる（ほぼ全面が葉＝箱の面にも貼る）。赤い新芽が少し"""
    r = rng(seed)
    S = _card(n)
    cols = [col('#26401e'), col('#2e4822'), col('#365226'), col('#3e5a2a'), col('#2a3c1e')]
    reds = [col('#7a3022'), col('#8a3a26')]
    ys, xs = np.mgrid[0:n, 0:n]
    count = int(n * n / 700)
    for k in range(count):
        x, y = r.uniform(0, n), r.uniform(0, n)
        hf = r.uniform(18, 30) * n / 1024
        a = r.uniform(0, np.pi * 2)
        red = r.random() < 0.06 and y < n * 0.45
        c0 = jitter_color(reds[r.integers(2)] if red else cols[r.integers(len(cols))], r, 0.2)
        if r.random() < 0.15:
            c0 = np.clip(c0 * 1.3, 0, 1)

        def fn(u, v, a=a):
            uu, vv = rot(u, v, a)
            return leaf_shape('ovate', 0.35)(uu, vv * 1.1)

        def cf(u, v, a=a, c0=c0):
            uu, vv = rot(u, v, a)
            return c0[None, None, :] * (0.8 + 0.2 * (1 - np.clip(np.abs(vv) * 1.8, 0, 1)))[..., None]
        S.stamp(x, y, hf, fn, r.uniform(0, 1), cf)              # 上下左右につながる（Stamper は端で回り込む）
    d = _finish_card(S, 0.66, 3.0)
    # 奥（葉の無い所）は暗い葉の影にして、ほぼ全面を不透明に（箱の面に貼っても穴が目立たない）
    hole = d['alpha'] < 0.5
    deep = ramp(spectral(n, seed + ':dp', 1.6, 6), [(0, '#0e180c'), (1, '#1c2a14')])
    d['albedo'] = np.where(hole[..., None], deep, d['albedo'])
    d['alpha'] = np.where(hole & (spectral(n, seed + ':ho', 1.2, 8) > 0.82), 0.0, 1.0).astype(np.float32)
    d['height'] = np.where(hole, 0.0, d['height'])
    return d


def houseplant_leaves(n, seed):
    """観葉植物（ポトス・ゴムの木風）の葉のカード：大きなつやのある卵形〜ハート形の葉・明るい葉脈・ところどころ斑入り"""
    r = rng(seed)
    S = _card(n)
    cols = [col('#2c5222'), col('#356028'), col('#3e6a2c'), col('#2a4a20')]
    stems = []
    for k in range(5):
        stems.append(_branch_walk(r, n * (0.3 + 0.4 * r.random()), n * 0.99, -np.pi / 2 + r.normal(0, 0.45), n * r.uniform(0.55, 0.85), 10, 0.06))
    for st in stems:
        for (x, y, ang, t) in st:
            S.stamp(x, y, 4.5, blob_fn(0.6, 0.1), 0.0, col('#3a5426'))
        for (x, y, ang, t) in st[2::3]:
            a = ang + r.choice([-1, 1]) * r.uniform(0.6, 1.3)
            hf = r.uniform(48, 70) * (1 - 0.25 * t)
            cx, cy = x + np.cos(a) * hf * 0.8, y + np.sin(a) * hf * 0.8
            if not (hf < cx < n - hf and hf < cy < n - hf):
                continue
            c0 = jitter_color(cols[r.integers(4)], r, 0.18)
            var = r.random() < 0.35

            def fn(u, v, a=a):
                uu, vv = rot(u, v, a)
                return leaf_shape('ovate', 0.5)(uu, vv * 0.92)

            def cf(u, v, a=a, c0=c0, var=var):
                uu, vv = rot(u, v, a)
                shade = 0.8 + 0.2 * (1 - np.clip(np.abs(vv) * 1.6, 0, 1))
                vein = np.where((np.abs(vv) < 0.035) | (np.abs(np.abs(vv) - (uu + 1) * 0.18) < 0.025) & (uu > -0.6), 1.35, 1.0)
                c = c0[None, None, :] * (shade * vein)[..., None]
                if var:
                    m = (np.sin(uu * 7 + vv * 11) > 0.7)[..., None]
                    c = np.where(m, c * 0.6 + np.array([0.42, 0.44, 0.3]) * 0.4, c)
                return c
            S.stamp(cx, cy, hf, fn, r.uniform(0.2, 1.0) + t, cf)
    return _finish_card(S, 0.45, 3.0)


def weed_mix(n, seed):
    """雑草（壁ぎわ・あぜ・空き地）のカード：細い草の葉・タンポポのような切れ込みのある葉の株・エノコログサの穂。枯れ色が混じる"""
    r = rng(seed)
    S = _card(n)
    # 草の葉
    for k in range(90):
        x0 = n * (0.06 + 0.88 * r.random())
        ang = -np.pi / 2 + r.normal(0, 0.4)
        L = n * r.uniform(0.3, 0.85)
        bend = r.normal(0, 0.003)
        w0 = r.uniform(6.0, 11.0) * n / 1024
        dry = r.random() < 0.25
        g = jitter_color(col('#4a5a26') if not dry else col('#8a7a44'), r, 0.25)
        x, y, z = x0, n * 0.995, r.random()
        for i in range(int(L / 2.5)):
            t = i / max(1, int(L / 2.5))
            ang += bend * (1 + 3 * t)
            x += np.cos(ang) * 2.5
            y += np.sin(ang) * 2.5
            w = w0 * (1 - t ** 1.5 * 0.92)
            if not (w < x < n - w and w < y < n - w):
                break
            S.stamp(x, y, w, blob_fn(0.95, 0.15), z + t * 0.01, np.clip(g * (0.65 + 0.45 * t), 0, 1))
    # エノコログサ（穂は先が垂れる）
    for k in range(5):
        x, y, ang = n * (0.15 + 0.7 * r.random()), n * 0.995, -np.pi / 2 + r.normal(0, 0.2)
        L = n * r.uniform(0.6, 0.85)
        for i in range(int(L / 3)):
            t = i / (L / 3)
            ang += 0.012 * (1 if k % 2 else -1) * t
            x += np.cos(ang) * 3
            y += np.sin(ang) * 3
            if not (8 < x < n - 8 and 8 < y < n - 8):
                break
            if t < 0.75:
                S.stamp(x, y, 4.0 * n / 1024, blob_fn(0.9, 0.1), 1.2, col('#5a6a2c'))
            else:
                S.stamp(x, y, 13.0 * n / 1024, blob_fn(0.85, 0.5, rough_edge=0.5), 1.3 + t, jitter_color(col('#8a8a50'), r, 0.15))
    # 切れ込みのある葉のロゼット（下の方）
    for k in range(4):
        cx, cy = n * (0.15 + 0.7 * r.random()), n * r.uniform(0.75, 0.9)
        for j in range(7):
            a = -np.pi / 2 + (j - 3) * 0.42 + r.normal(0, 0.1)
            hf = r.uniform(60, 90) * n / 1024
            px, py = cx + np.cos(a) * hf * 0.8, cy + np.sin(a) * hf * 0.8
            if not (hf < px < n - hf and hf < py < n - 2):
                continue
            c0 = jitter_color(col('#3e5a24'), r, 0.2)

            def fn(u, v, a=a):
                uu, vv = rot(u, v, a)
                cov, dh = leaf_shape('lance', 0.3)(uu, vv * 0.85)
                teeth = np.abs(np.sin((uu + 1) * 9)) > 0.35
                return cov * (teeth | (np.abs(vv) < 0.12)).astype(np.float32), dh
            S.stamp(px, py, hf, fn, 0.5 + r.random() * 0.3, c0)
    return _finish_card(S, 0.72, 2.2)


# ───────────────────────── 樹皮・鉢 ─────────────────────────
def bark_sakura(n, seed):
    """桜の樹皮：暗い紫がかった茶・横に長い皮目（レンチセル：u＝横）・横の帯のはがれ・地衣類が少し"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    big = spectral(n, seed + ':big', beta=2.4, fmin=2)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=20)
    hz = spectral(n, seed + ':hz', beta=1.5, fmin=3, aniso=(1.0, 0.06))
    F, _, ID = worley(n, 34, seed + ':len', jitter=1.0, aspect=(0.18, 1.0))
    idr = cellrand(ID, seed + ':l')
    lent = ((F < 0.28) & (idr < 0.6)).astype(np.float32)
    band = smooth(0.62, 0.8, spectral(n, seed + ':bd', beta=2.0, fmin=2, aniso=(1.0, 0.1)))
    h = 0.4 + 0.25 * hz + 0.15 * big + 0.15 * fine - 0.18 * lent + 0.1 * band
    t = 0.4 * big + 0.3 * fine + 0.3 * hz
    alb = ramp(t, [(0, '#2a1a1c'), (0.5, '#3e2a28'), (1, '#5a4038')])
    alb = lerp(alb, col('#6e6058'), band * 0.55)
    alb = alb * (1 - 0.4 * lent)[..., None]
    rough = 0.72 + 0.12 * fine + 0.08 * band
    alb, h, rough = lichen_layer(n, seed, alb, h, rough, amount=0.25, colors=('#7a8a6a', '#8e9a7e', '#a4aa92', '#5e6c4e'))
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=6.0, ao_radii=(1, 4, 10), ao_power=1.4)


def bark_matsu(n, seed):
    """松（クロマツ）の樹皮：亀の甲のような厚い板（縦に長い多角形）・深い割れ目・板の面は灰黒・割れ目の奥は赤茶"""
    F1, F2, ID = worley(n, 9, seed + ':pl', jitter=1.0, aspect=(0.55, 1.0))
    wx, wy = spectral(n, seed + ':wx', 2.2, 3), spectral(n, seed + ':wy', 2.2, 3)
    edge = warp(F2 - F1, wx, wy, 18)
    furrow = 1 - smooth(0.0, 0.14, edge)
    fine = spectral(n, seed + ':fine', beta=1.1, fmin=18)
    tone = cellrand(ID, seed + ':t')
    layer = np.sin(F1 * 40 + fine * 6) * 0.5 + 0.5                    # 板の段（薄くはがれた層）
    h = 0.55 * (1 - furrow) + 0.15 * layer + 0.15 * fine + 0.1 * tone
    plate = ramp(0.5 * tone + 0.3 * fine + 0.2 * layer, [(0, '#2c2826'), (0.5, '#423a34'), (1, '#5e5246')])
    deep = col('#5a2e1c')
    alb = lerp(plate, deep, furrow * 0.85)
    alb = alb * (0.6 + 0.4 * (1 - furrow * 0.6))[..., None]
    rough = 0.86 + 0.08 * fine
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=9.0, ao_radii=(1, 4, 12), ao_power=1.7)


def terracotta(n, seed):
    """素焼きの鉢：赤茶の土の面・ろくろの横の筋（u＝周り）・白い吹き出し（エフロレッセンス）・下の方の水あか・苔が少し"""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    fine = spectral(n, seed + ':fine', beta=1.0, fmin=24)
    big = spectral(n, seed + ':big', beta=2.2, fmin=2)
    rings = np.sin(ys / n * np.pi * 2 * 30 + (spectral(n, seed + ':rw', 2.0, 2) - 0.5) * 3) * 0.5 + 0.5
    efflo = smooth(0.6, 0.85, spectral(n, seed + ':ef', beta=2.0, fmin=3))
    stain = smooth(0.45, 0.9, spectral(n, seed + ':st', beta=2.0, fmin=2, aniso=(0.15, 1.0))) * smooth(0.3, 0.8, big)
    h = 0.5 + 0.08 * rings + 0.25 * fine + 0.1 * big
    alb = ramp(0.5 * big + 0.5 * fine, [(0, '#7a3c22'), (0.5, '#8e4a2a'), (1, '#a45c36')])
    alb = lerp(alb, col('#c8b8a4'), efflo * 0.6)
    alb = lerp(alb, alb * 0.6, stain * 0.5)
    moss = smooth(0.75, 0.92, spectral(n, seed + ':ms', 2.4, 3)) * stain
    alb = lerp(alb, col('#3a4422'), moss * 0.7)
    rough = 0.82 + 0.1 * fine
    return dict(albedo=np.clip(alb, 0, 1), height=norm01(h), rough=rough, nstr=4.0, ao_radii=(1, 4, 10), ao_power=1.2)


# ───────────────────────── 一覧（defs.MATERIALS と同じ形） ─────────────────────────
VEG_MATERIALS = {
    'mat.foliage.keyaki': (keyaki_spray, 'vk1', 1.0, ('ケヤキの葉（カード・晩秋）', 'Zelkova foliage card (late autumn)'), ['葉', 'ケヤキ', '街路樹', 'カード'], ['街路樹', '社の木']),
    'mat.foliage.ichou': (ichou_fan, 'vi1', 1.0, ('イチョウの葉（カード・黄葉）', 'Ginkgo foliage card (yellow)'), ['葉', 'イチョウ', '街路樹', 'カード'], ['街路樹']),
    'mat.foliage.sakura': (sakura_leaf, 'vs1', 1.0, ('桜の葉（カード・紅葉）', 'Cherry foliage card (autumn)'), ['葉', '桜', 'カード'], ['公園の木', '庭木']),
    'mat.foliage.matsu': (matsu_tuft, 'vm1', 1.0, ('松の葉（カード）', 'Pine needle card'), ['葉', '松', '針葉樹', 'カード'], ['庭木']),
    'mat.foliage.tsutsuji': (tsutsuji_leaves, 'vt1', 1.0, ('ツツジの葉（カード・刈り込み）', 'Azalea foliage card'), ['葉', 'ツツジ', '植え込み', 'カード'], ['植え込み', '鉢植え']),
    'mat.foliage.hedge': (hedge_leaves, 'vh1', 1.0, ('生垣の葉（面とカード）', 'Hedge foliage'), ['葉', '生垣', 'カード'], ['生垣']),
    'mat.foliage.houseplant': (houseplant_leaves, 'vp1', 1.0, ('観葉植物の葉（カード）', 'Houseplant foliage card'), ['葉', '観葉植物', 'カード'], ['屋内の鉢', '鉢植え']),
    'mat.foliage.weed': (weed_mix, 'vw1', 1.0, ('雑草（カード）', 'Weeds card'), ['葉', '雑草', '下草', 'カード'], ['壁ぎわ', 'あぜ', '空き地']),
    'mat.bark.sakura': (bark_sakura, 'vbs', 1.0, ('桜の樹皮', 'Cherry bark'), ['樹皮', '桜'], ['桜の幹']),
    'mat.bark.matsu': (bark_matsu, 'vbm', 1.0, ('松の樹皮（亀甲）', 'Pine bark'), ['樹皮', '松'], ['松の幹']),
    'mat.ceramic.terracotta': (terracotta, 'vtc', 0.8, ('素焼きの鉢', 'Terracotta'), ['鉢', '素焼き', '陶器'], ['鉢植え']),
}
