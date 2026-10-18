# -*- coding: utf-8 -*-
"""
テクスチャを作る道具（numpy だけ）：PNG の書き出し・2D の形（なめらかな縁）・UV の上に 3D の色の関数を焼く・すき間の塗り広げ。
画像は (H, W, 4) の float（0..1・sRGB）。UV の (0,0) は画像の左上（glTF の約束：v は下向き）。
"""
import struct
import zlib

import numpy as np


def save_png(path, img):
    a = np.clip(np.asarray(img) * 255 + 0.5, 0, 255).astype(np.uint8)
    h, w, c = a.shape
    color = {1: 0, 3: 2, 4: 6}[c]
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, color, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


def hexc(h, a=1.0):
    h = h.lstrip('#')
    return np.array([int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a])


def mix(a, b, t):
    t = np.asarray(t)[..., None] if np.ndim(t) else t
    return a * (1 - t) + b * t


def canvas(w, h, color=(0, 0, 0, 0)):
    img = np.zeros((h, w, 4))
    img[:] = color
    return img


def over(dst, color, alpha):
    """dst に color を alpha（(H,W) 0..1）で重ねる。color：(4,) か (H,W,4)"""
    color = np.asarray(color, float)
    a = np.clip(alpha, 0, 1)[..., None] * (color[..., 3:4] if color.ndim == 3 else color[3])
    rgb = color[..., :3] if color.ndim == 3 else color[:3]
    out = dst.copy()
    out[..., :3] = dst[..., :3] * (1 - a) + rgb * a
    out[..., 3:4] = dst[..., 3:4] * (1 - a) + a
    return out


def grid01(w, h):
    """画素の中心の座標 (u, v)：0..1"""
    u = (np.arange(w) + 0.5) / w
    v = (np.arange(h) + 0.5) / h
    return np.meshgrid(u, v)


def aa(d, px):
    """距離 d（負が中）→ なめらかな覆い（px：1 画素の大きさ）"""
    return np.clip(0.5 - d / px, 0, 1)


def sd_ellipse(x, y, cx, cy, rx, ry):
    q = np.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    return (q - 1) * min(rx, ry)


def sd_segment(x, y, ax, ay, bx, by):
    px, py = x - ax, y - ay
    dx, dy = bx - ax, by - ay
    t = np.clip((px * dx + py * dy) / max(dx * dx + dy * dy, 1e-12), 0, 1)
    return np.hypot(px - t * dx, py - t * dy)


def sd_polyline(x, y, pts):
    d = np.full(np.shape(x), 1e9)
    for i in range(len(pts) - 1):
        d = np.minimum(d, sd_segment(x, y, *pts[i], *pts[i + 1]))
    return d


def sd_polygon(x, y, pts):
    """多角形（閉じた）の符号つき距離"""
    pts = np.asarray(pts, float)
    d = np.full(np.shape(x), 1e9)
    s = np.ones(np.shape(x))
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        d = np.minimum(d, sd_segment(x, y, a[0], a[1], b[0], b[1]))
        c1 = (y >= a[1]) & (y < b[1])
        c2 = (y < a[1]) & (y >= b[1])
        c3 = (b[0] - a[0]) * (y - a[1]) > (b[1] - a[1]) * (x - a[0])
        flipm = (c1 & c3) | (c2 & ~c3)
        s = np.where(flipm, -s, s)
    return s * d


def catmull(pts, n=12, closed=False):
    """点の列をなめらかな曲線に（Catmull-Rom）"""
    P = np.asarray(pts, float)
    if closed:
        P = np.concatenate([P[-1:], P, P[:2]])
    else:
        P = np.concatenate([P[:1] * 2 - P[1:2], P, P[-1:] * 2 - P[-2:-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2])
    return np.array(out)


def dilate(img, mask, px=8):
    """覆いの外へ色を塗り広げる（UV の島のすき間）"""
    img = img.copy()
    m = mask.copy()
    for _ in range(px):
        if m.all():
            break
        acc = np.zeros_like(img)
        cnt = np.zeros(m.shape)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            sm = np.roll(np.roll(m, dy, 0), dx, 1)
            si = np.roll(np.roll(img, dy, 0), dx, 1)
            acc += si * sm[..., None]
            cnt += sm
        new = (~m) & (cnt > 0)
        img[new] = acc[new] / cnt[new][:, None]
        m = m | new
    return img


def downsample(img, k=2):
    h, w = img.shape[:2]
    return img[:h // k * k, :w // k * k].reshape(h // k, k, w // k, k, -1).mean((1, 3))


# ───────────────────────── UV の上に焼く
def raster(UVc, size, attrs, buckets=(2, 4, 8, 16, 32, 64, 128, 256)):
    """三角形（UV の角 UVc (m,3,2)）を画素へ。attrs：{名前: 角ごとの値 (m,3,k)}（重心で補間）か 面ごとの値 (m,k)。
    戻り値：(mask (H,W) bool, {名前: (H,W,k)})"""
    W, H = size
    m = len(UVc)
    px = UVc[..., 0] * W - 0.5
    py = UVc[..., 1] * H - 0.5
    x0 = np.floor(px.min(1)).astype(int)
    y0 = np.floor(py.min(1)).astype(int)
    x1 = np.ceil(px.max(1)).astype(int)
    y1 = np.ceil(py.max(1)).astype(int)
    ext = np.maximum(x1 - x0, y1 - y0) + 1
    mask = np.zeros((H, W), bool)
    out = {}
    for k, v in attrs.items():
        dim = v.shape[-1]
        out[k] = np.zeros((H, W, dim))
    lo = 0
    for B in buckets:
        sel = np.where((ext > lo) & (ext <= B))[0]
        lo = B
        if not len(sel):
            continue
        for s0 in range(0, len(sel), max(1, 2000000 // (B * B))):
            ss = sel[s0:s0 + max(1, 2000000 // (B * B))]
            gx = x0[ss][:, None, None] + np.arange(B)[None, None, :]
            gy = y0[ss][:, None, None] + np.arange(B)[None, :, None]
            gx = np.broadcast_to(gx, (len(ss), B, B))
            gy = np.broadcast_to(gy, (len(ss), B, B))
            ax, ay = px[ss, 0][:, None, None], py[ss, 0][:, None, None]
            bx, by = px[ss, 1][:, None, None], py[ss, 1][:, None, None]
            cx, cy = px[ss, 2][:, None, None], py[ss, 2][:, None, None]
            den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            den = np.where(np.abs(den) < 1e-12, 1e-12, den)
            l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
            l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
            l3 = 1 - l1 - l2
            e = -0.02
            ins = (l1 >= e) & (l2 >= e) & (l3 >= e) & (gx >= 0) & (gx < W) & (gy >= 0) & (gy < H)
            ti, yy, xx = np.nonzero(ins)
            if not len(ti):
                continue
            GX, GY = gx[ti, yy, xx], gy[ti, yy, xx]
            L = np.stack([l1[ti, yy, xx], l2[ti, yy, xx], l3[ti, yy, xx]], -1).clip(0, 1)
            L /= L.sum(1, keepdims=True)
            tri = ss[ti]
            mask[GY, GX] = True
            for k, v in attrs.items():
                if v.ndim == 3:
                    val = (v[tri] * L[:, :, None]).sum(1)
                else:
                    val = v[tri]
                out[k][GY, GX] = val
    return mask, out


def bake(UVc, size, attrs, color_fn, pad=8, bg=(0, 0, 0, 1)):
    """3D の色の関数を UV の上に焼く。color_fn(dict of (N,k)) → (N,4)"""
    mask, A = raster(UVc, size, attrs)
    img = np.zeros((size[1], size[0], 4))
    img[:] = bg
    if mask.any():
        sel = {k: v[mask] for k, v in A.items()}
        img[mask] = color_fn(sel)
    img = dilate(img, mask, pad)
    return img, mask
