# わかば matgen：つながる（タイル状に繰り返せる）手続きのテクスチャの道具。numpy だけ（＋書き出しに Pillow）。
# どの関数も「種（seed）」で決まる＝同じ種なら同じ画素。端は全部「回り込み（wrap）」なので、出来た絵は上下左右につながる。
# 色は sRGB の 0〜1（見た目の値）で作り、書き出しの時に 8bit にする。高さ（height）は 0〜1。
import numpy as np

TAU = np.pi * 2


def rng(seed):
    """種（文字列か整数）→ numpy の乱数（同じ種なら同じ並び）"""
    if isinstance(seed, str):
        h = 2166136261
        for c in seed.encode('utf-8'):
            h = ((h ^ c) * 16777619) & 0xFFFFFFFF
        seed = h
    return np.random.default_rng(seed)


def norm01(a):
    lo, hi = float(a.min()), float(a.max())
    return (a - lo) / (hi - lo + 1e-9)


def freq_grid(n):
    f = np.fft.fftfreq(n) * n
    fx, fy = np.meshgrid(f, f)
    return fx, fy


def spectral(n, seed, beta=2.0, fmin=1.0, fmax=None, aniso=(1.0, 1.0), angle=0.0):
    """スペクトルの合成で作る fBm（つながる）。beta＝1/f^beta の傾き（大きいほど滑らか）、aniso＝(x, y) の伸び。0〜1"""
    r = rng(seed)
    w = r.standard_normal((n, n))
    F = np.fft.fft2(w)
    fx, fy = freq_grid(n)
    if angle:
        c, s = np.cos(angle), np.sin(angle)
        fx, fy = fx * c - fy * s, fx * s + fy * c
    fr = np.sqrt((fx * aniso[0]) ** 2 + (fy * aniso[1]) ** 2)
    amp = np.where(fr >= fmin, 1.0 / np.maximum(fr, 1e-6) ** (beta / 2), 0.0)
    if fmax:
        amp *= np.exp(-(fr / fmax) ** 4)
    out = np.real(np.fft.ifft2(F * amp))
    return norm01(out)


def blur(a, sigma):
    """回り込みのガウスぼかし（FFT）。a は 2D か 3D（最後が色）"""
    if sigma <= 0:
        return a
    n0, n1 = a.shape[:2]
    f0 = np.fft.fftfreq(n0)[:, None]
    f1 = np.fft.fftfreq(n1)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sigma ** 2) * (f0 ** 2 + f1 ** 2))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., k]) * g)) for k in range(a.shape[2])], -1)


def worley(n, cells, seed, jitter=1.0, aspect=(1.0, 1.0)):
    """セルのノイズ（ボロノイ）：F1・F2（升目の大きさで割った距離）・セルの番号。つながる。cells＝一辺のセルの数（整数）。
    aspect＝(x, y) の伸び（石畳を横に長くするなど。cells は x の向きの数で、y は cells*aspect[0]/aspect[1] を丸める）"""
    r = rng(seed)
    cx = cells
    cy = max(1, int(round(cells * aspect[0] / aspect[1])))
    px = (np.arange(cx)[None, :] + 0.5 + (r.random((cy, cx)) - 0.5) * jitter)
    py = (np.arange(cy)[:, None] + 0.5 + (r.random((cy, cx)) - 0.5) * jitter)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    ux = xs / n * cx
    uy = ys / n * cy
    ix = np.floor(ux).astype(int)
    iy = np.floor(uy).astype(int)
    F1 = np.full((n, n), 1e9, np.float32)
    F2 = np.full((n, n), 1e9, np.float32)
    ID = np.zeros((n, n), np.int32)
    sx, sy = aspect
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            jx = ix + dx
            jy = iy + dy
            wx = np.mod(jx, cx)
            wy = np.mod(jy, cy)
            qx = px[wy, wx] + (jx - wx)
            qy = py[wy, wx] + (jy - wy)
            d = np.sqrt(((ux - qx) * sx) ** 2 + ((uy - qy) * sy) ** 2)
            cid = wy * cx + wx
            m1 = d < F1
            F2 = np.where(m1, F1, np.minimum(F2, d))
            ID = np.where(m1, cid, ID)
            F1 = np.where(m1, d, F1)
    return F1, F2, ID


def sample(img, x, y):
    """回り込みの双線形の読み（x・y は画素の位置の配列）"""
    n0, n1 = img.shape[:2]
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    if img.ndim == 3:
        fx = fx[..., None]
        fy = fy[..., None]
    x0m, x1m = np.mod(x0, n1), np.mod(x0 + 1, n1)
    y0m, y1m = np.mod(y0, n0), np.mod(y0 + 1, n0)
    a = img[y0m, x0m] * (1 - fx) + img[y0m, x1m] * fx
    b = img[y1m, x0m] * (1 - fx) + img[y1m, x1m] * fx
    return a * (1 - fy) + b * fy


def warp(img, dx, dy, amount):
    """ずらし（domain warp）：dx・dy は 0〜1 のノイズ、amount は画素"""
    n = img.shape[0]
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    return sample(img, xs + (dx - 0.5) * amount, ys + (dy - 0.5) * amount)


def normal_from_height(h, strength):
    """高さ（0〜1）→ 接空間の法線（OpenGL の向き：G＝絵の上）。strength＝高さ 1 が何画素ぶんの段差か"""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength   # 行が下へ増える → 上（v＋）向きの傾きは −dy
    nx = -dx
    ny = dy
    nz = np.ones_like(h)
    L = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.stack([nx / L, ny / L, nz / L], -1)


def cavity_ao(h, radii=(2, 6, 16), power=1.0):
    """高さの窪み → AO（1＝明るい）。いくつかの半径のぼかしとの差"""
    ao = np.zeros_like(h)
    for r in radii:
        d = blur(h, r) - h
        ao += np.clip(d, 0, None) / (len(radii))
    ao = 1 - np.clip(ao * 6.0, 0, 1)
    return np.clip(ao, 0, 1) ** power


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    if np.ndim(t) == 2 and np.ndim(a) >= 1 and np.shape(a)[-1:] == (3,):
        t = t[..., None]
    return a + (b - a) * t


def col(hexs):
    hexs = hexs.lstrip('#')
    return np.array([int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def ramp(t, stops):
    """t（0〜1）→ 色。stops＝[(位置, '#rrggbb'), ...]"""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    pos = [s[0] for s in stops]
    cs = [col(s[1]) for s in stops]
    for k in range(3):
        out[..., k] = np.interp(t, pos, [c[k] for c in cs])
    return out


def fill(n, c):
    return np.broadcast_to(col(c), (n, n, 3)).copy()


class Stamper:
    """形を z の大きい物が上になるように押す（つながる）。height・color・mask（何か押した）・id を持つ"""

    def __init__(self, n, base_h=None, base_c=None):
        self.n = n
        self.h = np.zeros((n, n), np.float32) if base_h is None else base_h.astype(np.float32).copy()
        self.c = np.zeros((n, n, 3), np.float32) if base_c is None else base_c.astype(np.float32).copy()
        self.m = np.zeros((n, n), np.float32)
        self.extra = np.zeros((n, n), np.float32)   # 形ごとの別の値（粗さなど）

    def stamp(self, cx, cy, half, fn, z0, color, extra=0.0):
        """中心 (cx, cy)・半分の大きさ half（画素）。fn(u, v)→(cover 0〜1, dh) を局所の座標（−1〜1）で返す。
        高さ z0＋dh が今の高さより高い所だけ上書き（z バッファ）"""
        n = self.n
        x0 = int(np.floor(cx - half))
        y0 = int(np.floor(cy - half))
        size = int(np.ceil(half * 2)) + 2
        ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
        u = (x0 + xs - cx) / half
        v = (y0 + ys - cy) / half
        cover, dh = fn(u, v)
        z = z0 + dh
        X = np.mod(x0 + np.arange(size), n)
        Y = np.mod(y0 + np.arange(size), n)
        hh = self.h[np.ix_(Y, X)]
        win = (cover > 0.5) & (z > hh)
        if not win.any():
            return
        sub_c = self.c[np.ix_(Y, X)]
        colr = color(u, v) if callable(color) else np.broadcast_to(np.asarray(color, np.float32), (size, size, 3))
        sub_c[win] = colr[win]
        hh[win] = z[win]
        mm = self.m[np.ix_(Y, X)]
        mm[win] = 1
        ee = self.extra[np.ix_(Y, X)]
        ee[win] = extra if np.isscalar(extra) else extra[win]
        self.c[np.ix_(Y, X)] = sub_c
        self.h[np.ix_(Y, X)] = hh
        self.m[np.ix_(Y, X)] = mm
        self.extra[np.ix_(Y, X)] = ee


def rot(u, v, a):
    c, s = np.cos(a), np.sin(a)
    return u * c + v * s, -u * s + v * c


def leaf_shape(kind='ovate', curl=0.25):
    """葉の形（局所の −1〜1）。u が長い向き"""
    def fn(u, v):
        t = (u + 1) / 2   # 0（付け根）〜1（先）
        if kind == 'ovate':
            w = 0.62 * np.sin(np.clip(t, 0, 1) * np.pi) ** 0.8 * (1 - 0.25 * t)
        elif kind == 'lance':
            w = 0.32 * np.sin(np.clip(t, 0, 1) * np.pi) ** 0.9
        elif kind == 'maple':
            ang = np.arctan2(v, u + 0.4)
            rr = np.hypot(u + 0.4, v)
            w = None
            lob = 0.55 + 0.35 * np.abs(np.cos(ang * 2.5))
            inside = (rr < lob) & (u > -0.9)
            cov = inside.astype(np.float32)
            dh = (1 - rr / 1.2) * curl + 0.03 * np.cos(ang * 10) * 0
            return cov, dh
        else:
            w = 0.5 * np.sin(np.clip(t, 0, 1) * np.pi)
        cov = ((np.abs(v) < w) & (u > -1) & (u < 1)).astype(np.float32)
        dh = curl * (1 - (v / (np.maximum(w, 1e-3))) ** 2) * np.sin(np.clip(t, 0, 1) * np.pi) * 0.6 - 0.04 * (np.abs(v) < 0.04)
        return cov, dh
    return fn


def to_u8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def encode_normal(nrm):
    return to_u8(nrm * 0.5 + 0.5)


def combine_normals(n1, n2):
    """法線を重ねる（whiteout）"""
    x = n1[..., 0] + n2[..., 0]
    y = n1[..., 1] + n2[..., 1]
    z = n1[..., 2] * n2[..., 2]
    L = np.sqrt(x * x + y * y + z * z)
    return np.stack([x / L, y / L, z / L], -1)


def grade(c, contrast=1.0, sat=1.0, gain=1.0):
    """色の調整（平均のまわりのコントラスト・彩度・明るさ）"""
    m = c.mean(axis=(0, 1), keepdims=True)
    c = m + (c - m) * contrast
    g = c.mean(axis=-1, keepdims=True)
    c = g + (c - g) * sat
    return np.clip(c * gain, 0, 1)


def cellrand(ID, seed):
    """セルの番号 → 0〜1 の乱数（表引き：隣のセルと関係しない）"""
    r = rng(str(seed) + ':cell')
    tab = r.random(int(ID.max()) + 1).astype(np.float32)
    return tab[ID]
