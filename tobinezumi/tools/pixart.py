"""pixart — 小さなピクセルアート描画ライブラリ（Pillow のみ依存）

トビネズミMMO の素材をコードで描くための共通部品。

- Img        : RGBA の画素配列（None = 透明）。貼り付け・反転・PNG 書き出し。
- Rig        : 楕円／カプセル（太さの変わる折れ線）／多角形を「部位」として重ね、
               3D 法線で陰影を付けてから固定パレットへ量子化する簡易レンダラ。
               部位の境目には奥側に暗線（セルアウト）、外周には 1px の輪郭 #2a1a10。
- grid()     : 文字列グリッド＋凡例から画像を作る（手打ちのドット用）。
- 周期ノイズ : タイルを継ぎ目なくするための周期付き値ノイズ。
- Bayer 4×4 : 規則ディザ。
"""
from __future__ import annotations

import math
import random
from PIL import Image

OUTLINE = (0x2A, 0x1A, 0x10, 255)


# ---------------------------------------------------------------- colours
def hx(c):
    """'#rrggbb' / '#rrggbbaa' / tuple -> RGBA tuple."""
    if c is None:
        return None
    if isinstance(c, tuple):
        return c if len(c) == 4 else (c[0], c[1], c[2], 255)
    c = c.lstrip('#')
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    a = int(c[6:8], 16) if len(c) >= 8 else 255
    return (r, g, b, a)


def tohex(c):
    return '#%02x%02x%02x' % c[:3]


def ramp(*cols):
    return [hx(c) for c in cols]


def mix(a, b, t):
    a, b = hx(a), hx(b)
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3)) + (255,)


BAYER4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def bayer(x, y):
    return (BAYER4[y & 3][x & 3] + 0.5) / 16.0 - 0.5


# ---------------------------------------------------------------- image
class Img:
    def __init__(self, w, h, fill=None):
        self.w, self.h = w, h
        self.px = [hx(fill) if fill else None] * (w * h)

    def inside(self, x, y):
        return 0 <= x < self.w and 0 <= y < self.h

    def get(self, x, y):
        if not self.inside(x, y):
            return None
        return self.px[y * self.w + x]

    def set(self, x, y, c):
        if self.inside(x, y):
            self.px[y * self.w + x] = hx(c)

    def blend(self, x, y, c, a):
        """Blend colour c over the pixel with alpha a (0..1); no-op on transparency."""
        if not self.inside(x, y):
            return
        o = self.px[y * self.w + x]
        if o is None:
            return
        self.px[y * self.w + x] = mix(o, c, a)

    def copy(self):
        n = Img(self.w, self.h)
        n.px = list(self.px)
        return n

    def paste(self, o, ox, oy, alpha_over=True):
        for y in range(o.h):
            for x in range(o.w):
                c = o.px[y * o.w + x]
                if c is None:
                    continue
                X, Y = ox + x, oy + y
                if not self.inside(X, Y):
                    continue
                if c[3] == 255 or not alpha_over:
                    self.px[Y * self.w + X] = c
                else:
                    b = self.px[Y * self.w + X]
                    if b is None:
                        self.px[Y * self.w + X] = c
                    else:
                        a = c[3] / 255.0
                        self.px[Y * self.w + X] = tuple(int(round(b[i] * (1 - a) + c[i] * a)) for i in range(3)) + (255,)

    def flip_h(self):
        n = Img(self.w, self.h)
        for y in range(self.h):
            for x in range(self.w):
                n.px[y * self.w + (self.w - 1 - x)] = self.px[y * self.w + x]
        return n

    def flip_v(self):
        n = Img(self.w, self.h)
        for y in range(self.h):
            n.px[(self.h - 1 - y) * self.w:(self.h - y) * self.w] = self.px[y * self.w:(y + 1) * self.w]
        return n

    def crop(self, x0, y0, w, h):
        n = Img(w, h)
        for y in range(h):
            for x in range(w):
                n.px[y * w + x] = self.get(x0 + x, y0 + y)
        return n

    def outline(self, col=OUTLINE, diag=False):
        """Add a 1px outline around opaque pixels (into transparent ones)."""
        src = self.px
        out = list(src)
        nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        if diag:
            nb += [(1, 1), (-1, 1), (1, -1), (-1, -1)]
        c = hx(col)
        for y in range(self.h):
            for x in range(self.w):
                if src[y * self.w + x] is not None:
                    continue
                for dx, dy in nb:
                    X, Y = x + dx, y + dy
                    if 0 <= X < self.w and 0 <= Y < self.h and src[Y * self.w + X] is not None \
                            and src[Y * self.w + X][3] == 255:
                        out[y * self.w + x] = c
                        break
        self.px = out
        return self

    def recolor(self, mapping):
        m = {hx(k)[:3]: hx(v) for k, v in mapping.items()}
        self.px = [(m.get(p[:3], p) if p else None) for p in self.px]
        return self

    def to_pil(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        im.putdata([p if p else (0, 0, 0, 0) for p in self.px])
        return im

    @staticmethod
    def from_pil(im):
        im = im.convert('RGBA')
        n = Img(im.width, im.height)
        n.px = [p if p[3] > 0 else None for p in im.getdata()]
        return n

    def colors(self):
        return {p[:3] for p in self.px if p}

    # -- drawing helpers -------------------------------------------------
    def rect(self, x0, y0, w, h, c):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.set(x, y, c)

    def hline(self, x0, x1, y, c):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            self.set(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(min(y0, y1), max(y0, y1) + 1):
            self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            self.set(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def fill_ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1:
                    self.set(x, y, c)


def grid(rows, legend, w=None, h=None):
    """Build an Img from strings. '.' or ' ' = transparent."""
    h = h or len(rows)
    w = w or max(len(r) for r in rows)
    im = Img(w, h)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in '. ':
                continue
            im.set(x, y, legend[ch])
    return im


def hstack(imgs, gap=0):
    w = sum(i.w for i in imgs) + gap * (len(imgs) - 1)
    h = max(i.h for i in imgs)
    out = Img(w, h)
    x = 0
    for i in imgs:
        out.paste(i, x, 0, alpha_over=False)
        x += i.w + gap
    return out


def vstack(imgs):
    w = max(i.w for i in imgs)
    out = Img(w, sum(i.h for i in imgs))
    y = 0
    for i in imgs:
        out.paste(i, 0, y, alpha_over=False)
        y += i.h
    return out


# ---------------------------------------------------------------- noise
class PNoise:
    """Periodic value noise (period p cells of size s pixels)."""

    def __init__(self, period, seed=0):
        r = random.Random(seed)
        self.p = period
        self.v = [[r.random() for _ in range(period)] for _ in range(period)]

    def __call__(self, x, y):
        p = self.p
        x0, y0 = math.floor(x), math.floor(y)
        fx, fy = x - x0, y - y0
        fx = fx * fx * (3 - 2 * fx)
        fy = fy * fy * (3 - 2 * fy)
        a = self.v[y0 % p][x0 % p]
        b = self.v[y0 % p][(x0 + 1) % p]
        c = self.v[(y0 + 1) % p][x0 % p]
        d = self.v[(y0 + 1) % p][(x0 + 1) % p]
        return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(noises, x, y, size):
    """Sum of periodic noises; each noise has period n.p over `size` pixels."""
    t, amp, tot = 0.0, 1.0, 0.0
    for n in noises:
        t += n(x * n.p / size, y * n.p / size) * amp
        tot += amp
        amp *= 0.5
    return t / tot


# ---------------------------------------------------------------- rig renderer
LIGHT = (-0.5, -0.72, 0.48)
_l = math.sqrt(sum(v * v for v in LIGHT))
LIGHT = tuple(v / _l for v in LIGHT)


class Rig:
    """Layered part renderer with per-part sphere/cylinder shading.

    Each shape call becomes a *part*. Pixels keep (material, value, part, group).
    resolve() quantises value -> material ramp, draws occlusion lines and outline.
    """

    def __init__(self, w, h, ramps, light=LIGHT, ambient=0.12):
        self.w, self.h = w, h
        self.ramps = ramps  # material -> [dark..light] RGBA
        self.mat = [None] * (w * h)
        self.val = [0.0] * (w * h)
        self.pid = [-1] * (w * h)
        self.grp = [None] * (w * h)
        self.parts = []
        self.overlay = {}
        self.light = light
        self.ambient = ambient

    # internal ---------------------------------------------------------
    def _new(self, mat, group, line, shift, dither):
        self.parts.append(dict(mat=mat, group=group, line=line, shift=shift, dither=dither))
        return len(self.parts) - 1

    def _shade(self, nx, ny, flat=0.0):
        nz2 = 1.0 - nx * nx - ny * ny
        nz = math.sqrt(nz2) if nz2 > 0 else 0.0
        lx, ly, lz = self.light
        lam = nx * lx + ny * ly + nz * lz
        v = self.ambient + (1 - self.ambient) * max(0.0, lam)
        return v * (1 - flat) + 0.6 * flat

    def _put(self, x, y, pid, v, clip):
        if not (0 <= x < self.w and 0 <= y < self.h):
            return
        i = y * self.w + x
        if clip is not None:
            if self.pid[i] == -1:
                return
            if isinstance(clip, (set, frozenset, list, tuple)):
                if self.pid[i] not in clip:
                    return
            elif self.pid[i] != clip:
                return
        p = self.parts[pid]
        self.mat[i] = p['mat']
        self.val[i] = v + p['shift']
        self.pid[i] = pid
        self.grp[i] = p['group']

    # shapes -------------------------------------------------------------
    def ellipse(self, cx, cy, rx, ry, mat, ang=0.0, group=None, line=True, shift=0.0,
                clip=None, flat=0.0, dither=0.0, bulge=1.0):
        pid = self._new(mat, group if group is not None else len(self.parts), line, shift, dither)
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        R = max(rx, ry) + 1
        for y in range(int(cy - R - 1), int(cy + R + 2)):
            for x in range(int(cx - R - 1), int(cx + R + 2)):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                u = (dx * ca + dy * sa) / rx
                v = (-dx * sa + dy * ca) / ry
                if u * u + v * v <= 1.0:
                    # normal back into screen space
                    nx = (u * ca - v * sa) * bulge
                    ny = (u * sa + v * ca) * bulge
                    m = math.hypot(nx, ny)
                    if m > 0.999:
                        nx, ny = nx / m * 0.999, ny / m * 0.999
                    self._put(x, y, pid, self._shade(nx, ny, flat), clip)
        return pid

    def capsule(self, pts, radii, mat, group=None, line=True, shift=0.0, clip=None,
                flat=0.0, dither=0.0, caps=True):
        """Polyline with radius per point; cylinder shading across the stroke."""
        pid = self._new(mat, group if group is not None else len(self.parts), line, shift, dither)
        if isinstance(radii, (int, float)):
            radii = [radii] * len(pts)
        if len(radii) != len(pts):
            src = list(radii)
            n = len(pts)
            radii = []
            for k in range(n):
                f = k / max(1, n - 1) * (len(src) - 1)
                a = int(f)
                b = min(a + 1, len(src) - 1)
                radii.append(src[a] + (src[b] - src[a]) * (f - a))
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        R = max(radii) + 1
        for y in range(int(min(ys) - R - 1), int(max(ys) + R + 2)):
            for x in range(int(min(xs) - R - 1), int(max(xs) + R + 2)):
                px, py = x + 0.5, y + 0.5
                best = None
                for i in range(len(pts) - 1):
                    ax, ay = pts[i]
                    bx, by = pts[i + 1]
                    vx, vy = bx - ax, by - ay
                    L2 = vx * vx + vy * vy or 1e-9
                    t = ((px - ax) * vx + (py - ay) * vy) / L2
                    if not caps and ((i == 0 and t < 0) or (i == len(pts) - 2 and t > 1)):
                        continue
                    t = max(0.0, min(1.0, t))
                    qx, qy = ax + vx * t, ay + vy * t
                    r = radii[i] + (radii[i + 1] - radii[i]) * t
                    d = math.hypot(px - qx, py - qy)
                    if d <= r and (best is None or d / r < best[0]):
                        best = (d / max(r, 1e-6), (px - qx) / max(r, 1e-6), (py - qy) / max(r, 1e-6))
                if best:
                    _, nx, ny = best
                    self._put(x, y, pid, self._shade(nx * 0.95, ny * 0.95, flat), clip)
        return pid

    def poly(self, pts, mat, value=0.6, grad=None, group=None, line=True, shift=0.0, clip=None, dither=0.0):
        """Filled polygon. grad=(dx,dy) adds a linear value gradient per pixel."""
        pid = self._new(mat, group if group is not None else len(self.parts), line, shift, dither)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
            for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
                if point_in_poly(x + 0.5, y + 0.5, pts):
                    v = value
                    if grad:
                        v += grad[0] * (x - xs[0]) + grad[1] * (y - ys[0])
                    self._put(x, y, pid, v, clip)
        return pid

    def pixel(self, x, y, mat, value=0.6, group=None, clip=None):
        pid = self._new(mat, group if group is not None else len(self.parts), False, 0.0, 0.0)
        self._put(int(x), int(y), pid, value, clip)
        return pid

    def dot(self, x, y, col):
        """Overlay colour after shading (eyes, nose, highlights)."""
        self.overlay[(int(x), int(y))] = hx(col)

    def erase(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = y * self.w + x
            self.mat[i] = None
            self.pid[i] = -1

    # resolve ------------------------------------------------------------
    def resolve(self, outline=OUTLINE, lines=True, line_mat_drop=2, cleanup=True):
        w, h = self.w, self.h
        img = Img(w, h)
        idx = [0] * (w * h)
        for i in range(w * h):
            m = self.mat[i]
            if m is None:
                continue
            r = self.ramps[m]
            p = self.parts[self.pid[i]]
            v = self.val[i]
            if p['dither']:
                v += bayer(i % w, i // w) * p['dither']
            k = int(max(0, min(len(r) - 1, math.floor(v * len(r)))))
            idx[i] = k
            img.px[i] = r[k]
        # occlusion lines: darken pixels of a back part bordering a front part
        if lines:
            new = list(img.px)
            for y in range(h):
                for x in range(w):
                    i = y * w + x
                    if self.mat[i] is None:
                        continue
                    me = self.pid[i]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        X, Y = x + dx, y + dy
                        if not (0 <= X < w and 0 <= Y < h):
                            continue
                        j = Y * w + X
                        o = self.pid[j]
                        if o > me and self.mat[j] is not None and self.grp[j] != self.grp[i] \
                                and self.parts[o]['line']:
                            r = self.ramps[self.mat[i]]
                            new[i] = r[max(0, min(idx[i], len(r) - 1) - line_mat_drop)] \
                                if idx[i] - line_mat_drop >= 0 else (r[0] if len(r) > 1 else hx(outline))
                            if idx[i] <= 1:
                                new[i] = hx(outline) if self.parts[o]['line'] == 'hard' else r[0]
                            break
            img.px = new
        for (x, y), c in self.overlay.items():
            if 0 <= x < w and 0 <= y < h:
                img.px[y * w + x] = c
        if cleanup:
            # remove isolated single pixels (no 4-neighbours) that make noisy silhouettes
            for y in range(h):
                for x in range(w):
                    i = y * w + x
                    if img.px[i] is None:
                        continue
                    if (x, y) in self.overlay:
                        continue
                    n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                            if img.get(x + dx, y + dy) is not None)
                    if n == 0:
                        img.px[i] = None
        if outline:
            img.outline(outline)
        return img


def point_in_poly(x, y, pts):
    inside = False
    n = len(pts)
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def bezier(p0, p1, p2, p3=None, n=8):
    pts = []
    for i in range(n + 1):
        t = i / n
        if p3 is None:
            x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
            y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        else:
            x = ((1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0]
                 + t ** 3 * p3[0])
            y = ((1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1]
                 + t ** 3 * p3[1])
        pts.append((x, y))
    return pts


# ---------------------------------------------------------------- sheets / io
def save(img, path):
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.to_pil().save(path, optimize=True)


def sheet(frames_rows):
    """frames_rows: list of rows, each a list of equal-size Img -> packed Img."""
    rows = [hstack(r) for r in frames_rows]
    return vstack(rows)
