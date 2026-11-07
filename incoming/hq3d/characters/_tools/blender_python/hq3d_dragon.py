# -*- coding: utf-8 -*-
"""高精度 3D 制作: 人型でないキャラ（ドラゴン）を Blender で一から組み、.glb に書き出す（ルーン）

  blender -b --factory-startup -P hq3d_dragon.py -- <設定.json> <出力.glb> [--blend <保存する.blend>]
  標準出力に 1 行 "WCMF_RESULT {json}"

  VRoid は人型しか作れないので、竜は骨・体・色・動きをすべてここで作る。
  設定（build.json）だけで形が決まる（同じ設定なら同じ形）。

  作るもの
    ・骨（Cast Engine の Creature Rig の名前に合わせる。設計書 §7.4）
        root・pelvis・spine1・spine2・chest・neck1〜3・head・jaw・
        wing{L,R}_root/_mid/_tip・foreLeg/foreArm/forePaw{L,R}・hindLeg/hindShin/hindFoot{L,R}・tail1〜6
      Cast Engine は名前に jaw / head / neck を含む骨を探して口・首を動かすので、ほかの骨や物体にこの文字を使わない
    ・体: 骨の鎖に沿った筒（断面は楕円・腹は平ら）。首から尾の先まで 1 本、脚は 4 本、頭は口先へ細る筒＋下あご
    ・角・たてがみ（頭の後ろの尖った鱗）・背のとげ・爪・目・まぶた・翼（腕と指の骨の間に張った膜）・ペンダント
    ・色: 鱗の模様の画像（くり返し）× 頂点の色（背は青・腹は白）。翼の膜の内側は濃い青
    ・まばたき（モーフ "blink"）・口（jaw の骨。Cast Engine が回す）・待機の動き（アクション "idle"）
"""
import json
import math
import os
import random
import sys
import traceback

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hq3d_dragon_face  # noqa: E402  顔（表情の作れる頭）


def emit(obj):
    print('WCMF_RESULT ' + json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def V(a):
    return Vector((float(a[0]), float(a[1]), float(a[2])))


def lerp_profile(t, pts):
    """[[t, 値…], …] を t で直線補間（値が複数でもよい）"""
    pts = sorted(pts, key=lambda x: x[0])
    if t <= pts[0][0]:
        return pts[0][1:]
    for a, b in zip(pts, pts[1:]):
        if t <= b[0]:
            f = (t - a[0]) / max(b[0] - a[0], 1e-9)
            return [x + (y - x) * f for x, y in zip(a[1:], b[1:])]
    return pts[-1][1:]


def catmull(pts, n):
    """点の列を通る滑らかな曲線を、弧長でほぼ等間隔に n 点取る。戻り値: (点, 各点の t 0〜1)"""
    P = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    dense = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(24):
            t = k / 24
            t2, t3 = t * t, t * t * t
            dense.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    dense.append(pts[-1].copy())
    acc = [0.0]
    for a, b in zip(dense, dense[1:]):
        acc.append(acc[-1] + (b - a).length)
    total = acc[-1]
    out, ts = [], []
    j = 0
    for i in range(n):
        s = total * i / (n - 1)
        while j < len(acc) - 2 and acc[j + 1] < s:
            j += 1
        f = (s - acc[j]) / max(acc[j + 1] - acc[j], 1e-9)
        out.append(dense[j].lerp(dense[j + 1], f))
        ts.append(i / (n - 1))
    return out, ts, total


def frames_along(pts, up_hint):
    """曲線に沿った向き（接線・横・上）。up_hint に近い向きを「上」にしてねじれを抑える"""
    out = []
    up = Vector(up_hint).normalized()
    for i in range(len(pts)):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        side = t.cross(up)
        if side.length < 1e-4:
            side = t.cross(Vector((1, 0, 0)))
        side.normalize()
        u = side.cross(t).normalized()
        out.append((t, side, u))
        up = u
    return out


class Builder:
    def __init__(self, cfg):
        self.cfg = cfg
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap')
        self.col = self.bm.loops.layers.float_color.new('Col')  # 浮動小数の色（線形）。8 bit の色だと sRGB で持つので、線形の値を入れると 2 回暗くなった
        self.vw = {}          # 頂点 → [(骨, 重み)]
        self.mat_names = []   # 材質の枠の名前
        self.blink = {}       # 頂点 → まばたきで動く先
        self.rng = random.Random(int(cfg.get('seed', 1)))

    def mat(self, name):
        if name not in self.mat_names:
            self.mat_names.append(name)
        return self.mat_names.index(name)

    # ── 骨の重み: 候補の骨（頭と先）までの距離で、近い 2 本に分ける ──
    def weigh(self, verts, bones, sharp=4.0):
        segs = [(b, self.bone_head[b], self.bone_tail[b]) for b in bones]
        for v in verts:
            p = v.co
            ds = []
            for b, a, c in segs:
                ab = c - a
                t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
                ds.append((max((p - (a + ab * t)).length, 1e-4), b))
            ds.sort()
            top = ds[:2]
            w = [1.0 / d ** sharp for d, _ in top]
            s = sum(w)
            self.vw[v] = [(b, x / s) for (d, b), x in zip(top, w) if x / s > 0.02]

    # ── 筒: 点の列に沿って、高さごとの半径（横・縦）で楕円の断面をつなぐ ──
    def uv_auto(self, radius, u_max):
        """鱗の 1 枚が胴と同じ大きさ・同じ縦横になる UV の倍率を、筒の太さから決める。
        胴（まわり約 1.2 m・倍率 (1.0, 2.5)）では 鱗の幅：高さ ≒ 1.9：1。
        細い筒に同じ倍率を使うと横に引きのばされて縞に見えた（腕・脚・頭）。
        u_max: まわり方向に使う模様の幅の上限（0.5 より先は腹の白い板なので、背の鱗だけ使う筒は 0.34 まで）"""
        nrow = int(self.cfg.get('scale_rows', 10))
        cols = nrow * 1.6                       # 模様 1 枚ぶんの横の鱗の数
        ts_ = [i / 10 for i in range(11)]
        circ = sum(math.pi * (lambda r: r[0] + r[1])(lerp_profile(t, radius)) for t in ts_) / len(ts_)
        body_w = 1.2 / cols                      # 胴の鱗 1 枚の幅（m）
        body_h = 1.0 / (2.5 * nrow)              # 胴の鱗 1 枚の高さ（m）
        su = circ / body_w / cols                # 胴と同じ幅になる横の倍率
        su = max(1, round(min(su, u_max) * cols)) / cols   # 継ぎ目で模様がずれないよう鱗の数を整数に
        w = circ / (su * cols)
        sv = 1.0 / (nrow * body_h * w / body_w)  # 高さも幅と同じ割合で決め、縦横を胴と同じにする
        return (su, sv)

    def tube(self, ctrl, n, sides, radius, up, mat, color_fn, bones, cap_start=True, cap_end=True,
             uv_scale=(1.0, 1.0), flat_belly=0.0, ridge=None):
        pts, ts, total = catmull([V(c) for c in ctrl], n)
        fr = frames_along(pts, up)
        if isinstance(uv_scale, (int, float)):
            uv_scale = self.uv_auto(radius, float(uv_scale))
        rows = []
        mi = self.mat(mat)
        for i, (c, t) in enumerate(zip(pts, ts)):
            rx, ry = lerp_profile(t, radius)
            tg, side, u = fr[i]
            row = []
            for k in range(sides):
                a = 2 * math.pi * k / sides
                ca, sa = math.cos(a), math.sin(a)
                # a=0 が上（背）・a=π が下（腹）。腹は flat_belly だけ平らにする
                yy = ca * ry
                if ca < 0:
                    yy *= (1 - flat_belly)
                rr = 1.0
                if ridge and ca > 0.6:  # 背のすじ
                    rr += ridge * (ca - 0.6) / 0.4
                row.append(self.bm.verts.new(c + u * yy * rr + side * sa * rx))
            rows.append(row)
        faces = []
        for i in range(n - 1):
            for k in range(sides):
                k2 = (k + 1) % sides
                f = self.bm.faces.new((rows[i][k], rows[i][k2], rows[i + 1][k2], rows[i + 1][k]))
                f.material_index = mi
                for lp in f.loops:
                    vi = rows[i].index(lp.vert) if lp.vert in rows[i] else rows[i + 1].index(lp.vert)
                    ii = i if lp.vert in rows[i] else i + 1
                    kk = vi if not (k2 == 0 and vi == 0 and lp.vert in (rows[i][k2], rows[i + 1][k2])) else sides
                    if lp.vert in (rows[i][k2], rows[i + 1][k2]) and k2 == 0:
                        kk = sides
                    lp[self.uv].uv = (kk / sides * uv_scale[0], ts[ii] * total * uv_scale[1])
                    ang = 2 * math.pi * (kk % sides) / sides
                    lp[self.col] = color_fn(ts[ii], math.cos(ang), math.sin(ang))
                faces.append(f)
        caps = []
        for end, row in ((cap_start, rows[0]), (cap_end, rows[-1])):
            if not end:
                continue
            ctr = self.bm.verts.new(sum((v.co for v in row), Vector()) / len(row))
            caps.append(ctr)
            for k in range(sides):
                k2 = (k + 1) % sides
                tri = (row[k], row[k2], ctr) if row is rows[-1] else (row[k2], row[k], ctr)
                f = self.bm.faces.new(tri)
                f.material_index = mi
                for lp in f.loops:
                    lp[self.uv].uv = (0.5, 0.5)
                    lp[self.col] = color_fn(0.0 if row is rows[0] else 1.0, 1.0, 0.0)
        allv = [v for r in rows for v in r] + caps
        self.weigh(allv, bones)
        return rows, pts, fr

    def cone(self, base, tip, r, sides, mat, color, bones, bend=None, up=(0, 0, 1)):
        """円すい（角・とげ・爪）。bend があれば先へ行くほどその向きへ曲げる"""
        base, tip = V(base), V(tip)
        mi = self.mat(mat)
        n = 6
        rings = []
        axis = (tip - base)
        for i in range(n):
            t = i / n
            c = base + axis * t
            if bend:
                c = c + V(bend) * (t * t)
            d = axis.normalized()
            side = d.cross(V(up))
            if side.length < 1e-4:
                side = d.cross(Vector((1, 0, 0)))
            side.normalize()
            u = side.cross(d).normalized()
            rr = r * (1 - t) ** 0.9
            rings.append([self.bm.verts.new(c + (side * math.cos(2 * math.pi * k / sides) + u * math.sin(2 * math.pi * k / sides)) * rr) for k in range(sides)])
        tipv = self.bm.verts.new(tip + (V(bend) if bend else Vector()))
        for a, b in zip(rings, rings[1:]):
            for k in range(sides):
                f = self.bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
                f.material_index = mi
        for k in range(sides):
            f = self.bm.faces.new((rings[-1][k], rings[-1][(k + 1) % sides], tipv))
            f.material_index = mi
        bot = self.bm.faces.new(list(reversed(rings[0])))
        bot.material_index = mi
        vs = [v for r_ in rings for v in r_] + [tipv]
        where = {v: (k / sides, i / n) for i, r_ in enumerate(rings) for k, v in enumerate(r_)}
        where[tipv] = (0.5, 1.0)
        for f in {f for v in vs for f in v.link_faces}:
            for lp in f.loops:
                lp[self.uv].uv = where.get(lp.vert, (0.5, 0.0))
                lp[self.col] = color
        self.weigh(vs, bones)
        return vs

    def blade(self, base, tip, width, thick, flat, mat, color, bones, bend=None, curl=0.0):
        """平たい刃（たてがみの鱗・ひれ）。flat は刃の面の向き（この向きに薄い）。curl で先を面の向きへ反らせる"""
        base, tip, flat = V(base), V(tip), V(flat).normalized()
        mi = self.mat(mat)
        axis = tip - base
        d = axis.normalized()
        side = flat.cross(d)
        side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
        nrm = d.cross(side).normalized()
        n = 6
        rows = []
        for i in range(n + 1):
            t = i / n
            c = base + axis * t + nrm * curl * axis.length * t * t
            if bend:
                c = c + V(bend) * t * t
            w = width * math.sin(math.pi * min(1.0, 0.15 + t * 0.95)) * (1 - t) ** 0.35 if t < 1 else 0.0
            th = thick * (1 - t)
            rows.append([self.bm.verts.new(c + side * w * 0.5 * math.cos(2 * math.pi * k / 6) + nrm * th * 0.5 * math.sin(2 * math.pi * k / 6)) for k in range(6)])
        faces = []
        for a, b in zip(rows, rows[1:]):
            for k in range(6):
                faces.append(self.bm.faces.new((a[k], a[(k + 1) % 6], b[(k + 1) % 6], b[k])))
        faces.append(self.bm.faces.new(list(reversed(rows[0]))))
        where = {v: (k / 6, i / n) for i, r_ in enumerate(rows) for k, v in enumerate(r_)}
        for f in faces:
            f.material_index = mi
            for lp in f.loops:
                lp[self.uv].uv = where.get(lp.vert, (0.5, 0.0))
                lp[self.col] = color
        vs = [v for r in rows for v in r]
        self.weigh(vs, bones)
        return vs

    def ellipsoid(self, c, axes, mat, color, bones, segs=12, rings=8):
        c = V(c)
        ax, ay, az = (V(a) for a in axes)
        mi = self.mat(mat)
        grid = []
        for r in range(rings + 1):
            th = math.pi * r / rings
            row = []
            for s in range(segs):
                ph = 2 * math.pi * s / segs
                row.append(self.bm.verts.new(c + ax * (math.sin(th) * math.cos(ph)) + ay * (math.sin(th) * math.sin(ph)) + az * math.cos(th)))
            grid.append(row)
        for r in range(rings):
            for s in range(segs):
                q = (grid[r][s], grid[r][(s + 1) % segs], grid[r + 1][(s + 1) % segs], grid[r + 1][s])
                if len(set(q)) == 4:
                    f = self.bm.faces.new(q)
                    f.material_index = mi
                    for lp in f.loops:
                        lp[self.uv].uv = (0.5, 0.5)
                        lp[self.col] = color
        vs = [v for row in grid for v in row]
        self.weigh(vs, bones)
        return grid


def hexc(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (lin[0], lin[1], lin[2], a)


def mix(a, b, f):
    return tuple(x + (y - x) * f for x, y in zip(a, b))


def build(cfg):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    sk = cfg['skeleton']
    B = Builder(cfg)
    # 骨の頭と先（世界座標）
    B.bone_head, B.bone_tail, parent = {}, {}, {}
    for name, d in sk.items():
        B.bone_head[name] = V(d['head'])
        B.bone_tail[name] = V(d['tail'])
        parent[name] = d.get('parent')
    pal = cfg['palette']
    blue, blue_d, belly, horn, claw = hexc(pal['scale']), hexc(pal['scale_dark']), hexc(pal['belly']), hexc(pal['horn']), hexc(pal['claw'])
    spike, gold, gem, eye, eye_d = hexc(pal['spike']), hexc(pal['gold']), hexc(pal['gem']), hexc(pal['eye']), hexc(pal['eye_dark'])
    membrane = hexc(pal['membrane'])

    def body_color(t, ca, sa):
        # ca: 上が 1・腹が -1。腹は白、背は青。脇は混ぜる
        f = max(0.0, min(1.0, (-ca + 0.15) / 0.55))
        return mix(blue, belly, f)

    # ── 首から尾の先まで 1 本の筒 ──
    bd = cfg['body']
    B.tube(bd['path'], bd.get('rings', 90), bd.get('sides', 20), bd['radius'], bd.get('up', (0, -1, 0)), 'Scale', body_color,
           bd['bones'], flat_belly=bd.get('flat_belly', 0.25), uv_scale=(1.0, 2.5), ridge=bd.get('ridge', 0.0))
    # ── 頭（口先へ細る筒）と下あご ──
    B.face = None
    if cfg.get('face'):  # 表情の作れる顔（hq3d_dragon_face.py）
        fcol = {k: hexc(cfg['face'][k + '_color']) for k in ('blue', 'white', 'inner', 'tooth', 'tongue', 'mouth', 'eye', 'pupil', 'lid', 'blush')}
        B.extra_flat = {'Tooth': fcol['tooth'], 'Tongue': fcol['tongue'], 'Lash': hexc(cfg['face'].get('lash_color', '#151B3A')),
                        'Blush': fcol['blush'], 'Mouth': fcol['mouth'], 'Eye': fcol['eye'], 'Pupil': fcol['pupil'], 'Sclera': hexc(cfg['face'].get('sclera_color', '#F4F6FB')), 'HornDark': hexc(cfg['face'].get('horn_color', '#E8E6DC')), 'Brow': hexc(cfg['face'].get('brow_color', '#2E4699')),
                        'Lid': fcol['lid'], 'LidLo': hexc(cfg['face'].get('lid_lo_color', cfg['face']['lid_color']))}
        for i, c_ in enumerate(cfg['face']['crown']['colors']):
            B.extra_flat['Crown%d' % i] = hexc(c_)
        B.face = hq3d_dragon_face.Face(B, cfg, fcol)
        B.face.build(cfg)
    if not B.face:
        hd = cfg['head']
        B.tube(hd['path'], 26, 18, hd['radius'], hd.get('up', (0, 0, 1)), 'Scale', body_color, ['head'], uv_scale=0.34, flat_belly=0.3)
        jw = cfg['jaw']
        B.tube(jw['path'], 16, 14, jw['radius'], jw.get('up', (0, 0, 1)), 'Scale', lambda t, ca, sa: mix(blue, belly, max(0.0, min(1.0, (-ca + 0.3) / 0.6))),
               ['jaw'], uv_scale=(1.0, 4.0), flat_belly=0.2)
    # 口の中（濃い色の板）
    mo = cfg.get('mouth') if not B.face else None
    if mo:
        B.ellipsoid(mo['center'], mo['axes'], 'Mouth', hexc(pal['mouth']), ['jaw'], segs=12, rings=6)
    # ── 脚 ──
    for lg in cfg['legs']:
        B.tube(lg['path'], 30, 16, lg['radius'], lg.get('up', (0, -1, 0)), 'Scale', lambda t, ca, sa: mix(blue, belly, max(0.0, -ca) * 0.35), lg['bones'], uv_scale=0.34)
        for c in lg.get('claws', []):
            B.cone(c['base'], c['tip'], c['r'], 8, 'Claw', claw, [lg['bones'][-1]], bend=c.get('bend'))
    # ── 角・たてがみ・背のとげ ──
    B.brow_v = {1: [], -1: []}
    for b_ in cfg.get('brows', []):  # まゆの隆起・鼻（体と同じ鱗の色）
        vs = B.cone(b_['base'], b_['tip'], b_['r'], 8, 'Lid', blue_d, ['head'])
        if b_.get('kind', 'brow') == 'brow':
            B.brow_v[1 if b_['base'][0] > 0 else -1] += vs
    for h in cfg.get('horns', []):
        B.cone(h['base'], h['tip'], h['r'], 10, 'Horn', horn, ['head'], bend=h.get('bend'))
    for s in cfg.get('frills', []):
        B.cone(s['base'], s['tip'], s['r'], 6, 'Spike', mix(spike, blue, s.get('blue', 0.0)), [s.get('bone', 'head')], bend=s.get('bend'))
    def plates(path, radius, up, bones, spec, mat_prefix='Mane'):
        """筒のまわりに、流れる刃の鱗を段々に並べる（たてがみ・肩や腕の重なった鱗）"""
        pts, ts, _ = catmull([V(c) for c in path], 200)
        fr = frames_along(pts, up)
        cols = spec['colors']
        k = 0
        for row in range(spec['rows']):
            t = spec['from'] + (spec['to'] - spec['from']) * row / max(spec['rows'] - 1, 1)
            j = int(t * (len(pts) - 1))
            rx, ry = lerp_profile(ts[j], radius)
            tg, side, u = fr[j]
            for a_deg in spec['angles']:
                a = math.radians(a_deg + B.rng.uniform(-6, 6) + (spec.get('stagger', 0) if row % 2 else 0))
                out = (u * math.cos(a) + side * math.sin(a)).normalized()
                sink = spec.get('sink', 0.85)
                base = pts[j] + u * ry * math.cos(a) * sink + side * rx * math.sin(a) * sink
                L = lerp_profile(t, spec['length'])[0] * B.rng.uniform(0.85, 1.15)
                if spec.get('side_bias', True):
                    L *= 0.75 + 0.25 * abs(math.sin(a))
                tip = base + out * L * spec.get('out', 0.55) + tg * L * spec.get('down', 0.8)
                ci = k % len(cols)
                B.blade(base, tip, L * spec.get('width', 0.42), spec.get('thick', 0.012), out.cross(tg), '%s%d' % (mat_prefix, ci),
                        hexc(cols[ci]), bones, curl=spec.get('curl', 0.08))
                k += 1

    mn = cfg.get('mane')
    if mn:  # たてがみ: 首の筒のまわりに、後ろ下へ流れる刃の鱗を段々に並べる（青と白を交ぜる）
        plates(bd['path'], bd['radius'], bd.get('up', (0, -1, 0)), bd['bones'][:4], mn)
    np_ = cfg.get('neck_plates')
    if np_:  # 首の前の白い板（V 字に重なる・表情リストの首）
        plates(bd['path'], bd['radius'], bd.get('up', (0, -1, 0)), bd['bones'][:4], np_, mat_prefix='Neck')
    bp = cfg.get('back_plates')
    if bp:  # 背中から尾の先まで、重なった鱗（三面図の背面）
        plates(bd['path'], bd['radius'], bd.get('up', (0, -1, 0)), bd['bones'], bp, mat_prefix='Back')
    for lp_ in cfg.get('leg_plates', []):  # 肩・腕の重なった鱗
        lg = cfg['legs'][lp_['leg']]
        plates(lg['path'], lg['radius'], lg.get('up', (0, -1, 0)), lg['bones'][:2], lp_, mat_prefix=lp_.get('prefix', 'Plate'))
    for bl in cfg.get('blades', []):  # 頭の刃（冠・頬・あご）
        B.blade(bl['base'], bl['tip'], bl['w'], bl.get('t', 0.012), bl['flat'], 'Mane%d' % bl.get('tone', 0), hexc(bl['color']), [bl.get('bone', 'head')],
                bend=bl.get('bend'), curl=bl.get('curl', 0.0))
    sp = cfg.get('spines')
    if sp:  # 背骨に沿ってとげを並べる（体の筒の背の線から外へ）
        pts, ts, _ = catmull([V(c) for c in bd['path']], 160)
        fr = frames_along(pts, bd.get('up', (0, -1, 0)))
        for i in range(sp['count']):
            t = sp['from'] + (sp['to'] - sp['from']) * i / max(sp['count'] - 1, 1)
            j = int(t * (len(pts) - 1))
            rx, ry = lerp_profile(ts[j], bd['radius'])
            tg, side, u = fr[j]
            h = lerp_profile(t, sp['height'])[0]
            base = pts[j] + u * ry * 0.92
            tip = base + u * h - tg * h * 0.5
            B.cone(base, tip, h * 0.35, 6, 'Spike', mix(spike, blue, 0.35), bd['bones'], up=tuple(side))
    # ── 目とまぶた ──
    B.eye_info = []
    for e in cfg['eyes']:
        c = V(e['center'])
        g = B.ellipsoid(c, e['axes'], 'Eye', eye, ['head'], segs=14, rings=8)
        ev = [v for row in g for v in row]
        # 瞳（縦長の黒目）と光
        out = V(e['out'])
        ev += [v for row in B.ellipsoid(c + out * e['pupil_out'], e['pupil_axes'], 'Pupil', eye_d, ['head'], segs=10, rings=6) for v in row]
        ev += [v for row in B.ellipsoid(c + out * (e['pupil_out'] + 0.002) + V(e['glint']), e['glint_axes'], 'Glint', hexc('#FFFFFF'), ['head'], segs=8, rings=4) for v in row]
        # まぶた: 目を覆う殻のてっぺん（目の上の細い帯）だけを残す。まばたきでは帯の下のふちを目の下まで下ろす
        #   開いているときは目が全部見え、閉じると殻が目の前を覆う（てっぺんは動かない）
        lid = B.ellipsoid(c, [V(a) * 1.18 for a in e['axes']], 'Lid', blue_d, ['head'], segs=16, rings=10)
        center_axis = V(e['axes'][2]).normalized()  # 上下の軸
        R = V(e['axes'][2]).length * 1.18
        cap = float(e.get('lid_cap', 0.55))  # 帯の下のふちの高さ（半径に対する割合）
        kill = []
        for row in lid:
            for v in row:
                d = v.co - c
                if d.dot(center_axis) < R * cap - 1e-6 or d.dot(out) < -0.004:
                    kill.append(v)
        bmesh.ops.delete(B.bm, geom=kill, context='VERTS')
        for row in lid:
            for v in row:
                if not v.is_valid:
                    continue
                d = v.co - c
                h = d.dot(center_axis)
                f = (R - h) / max(R * (1 - cap), 1e-6)          # てっぺん 0 → 帯の下のふち 1
                h2 = R - f * 2 * R                               # 閉じた形: 帯の下のふちが目の下（-R）へ
                lat = d - center_axis * h
                w1 = math.sqrt(max(1 - (h / R) ** 2, 0.0))
                w2 = math.sqrt(max(1 - (h2 / R) ** 2, 0.0))
                k = w2 / max(w1, 0.05)
                B.blink[v] = c + center_axis * h2 + lat * k + out * 0.003
        B.eye_info.append({'c': c, 'up': center_axis, 'eye': ev, 'side': 1 if c.x > 0 else -1})
    # ── 翼 ──
    for w in cfg['wings']:
        arm = [V(p) for p in w['arm']]           # 付け根 → ひじ → 手首
        B.tube(w['arm'], 24, 10, w['arm_radius'], w.get('up', (0, 0, 1)), 'Scale', lambda t, ca, sa: blue, w['bones'][:3], uv_scale=0.34)
        wrist = arm[-1]
        fingers = [V(f) for f in w['fingers']]
        mids = w.get('finger_mids') or [None] * len(fingers)
        for f, fm in zip(fingers, mids):
            mp = V(fm) if fm else wrist.lerp(f, 0.5) + V(w.get('finger_bow', (0, 0, 0)))
            B.tube([wrist, mp, f], 12, 6, [[0, 0.018, 0.018], [1, 0.006, 0.006]], (0, 0, 1),
                   'Scale', lambda t, ca, sa: blue, [w['bones'][2]], uv_scale=(1.0, 4.0))
            B.cone(f, f + (f - wrist).normalized() * 0.05, 0.008, 6, 'Claw', claw, [w['bones'][2]])
        # 膜: 体の付け根 → ひじ → 手首 → 指の先 … を縁にして、縁から手首へ向けた格子で埋める
        outline = [V(p) for p in w['outline']]      # 手首のまわりを一周する膜の縁（ひじ → 指先 … → 体側 → 付け根）
        mi = B.mat('Membrane')
        rows_n = 10
        prev = None
        all_v = []
        z_lo = min(o.z for o in outline)
        hfrac = [max(0.0, min(1.0, (wrist.z - o.z) / max(1e-6, wrist.z - z_lo))) for o in outline]
        for i, o in enumerate(outline):
            col = []
            for r in range(rows_n + 1):
                t = r / rows_n
                p = wrist.lerp(o, t)
                # 膜は指と指の間で少したるむ
                p = p + V(w.get('sag', (0, 0.04, 0))) * math.sin(math.pi * t) * 0.6
                col.append(B.bm.verts.new(p))
            all_v += col
            if prev is not None:
                for r in range(rows_n):
                    f = B.bm.faces.new((prev[r], col[r], col[r + 1], prev[r + 1]))
                    f.material_index = mi
                    for lp in f.loops:
                        rr_ = (prev + col).index(lp.vert) % (rows_n + 1) / rows_n  # 手首 0 → ふち 1
                        hf = hfrac[i] if lp.vert in col else hfrac[i - 1]
                        if w.get('white_by_height'):
                            rr_ = rr_ * (0.25 + 0.75 * hf)  # 三面図: 上は青、下の縁だけ白
                        lp[B.uv].uv = (0.5, rr_)  # 膜の色は縦のグラデーションの画像で（v＝手首からの距離）
                        lp[B.col] = membrane
            prev = col
        B.weigh(all_v, w['bones'][:3] + [w.get('body_bone', 'chest')])
    for bn in cfg.get('banners', []):  # 胸から垂れる幕（平たい筒）
        B.tube(bn['path'], 24, 8, [[0, bn['w'], 0.006], [1, bn['w'] * 0.9, 0.006]], (0, -1, 0), 'Banner', lambda t, ca, sa: hexc(pal.get('banner', '#2C3F8C')),
               bn.get('bones', ['chest', 'spine2']), uv_scale=(1.0, 1.0))
        dc = V(bn['diamond'])
        B.ellipsoid(dc, [(bn['w'] * 0.55, 0, 0), (0, 0.006, 0), (0, 0, bn['w'] * 0.8)], 'Gold', gold, bn.get('bones', ['chest'])[:1], segs=4, rings=2)
        end = V(bn['path'][-1])
        B.blade(end, end + Vector((0, -0.005, -bn.get('tassel', 0.07))), bn['w'] * 0.6, 0.01, (0, -1, 0), 'Gold', gold, bn.get('bones', ['spine2'])[-1:])
    # ── ペンダント（首の根元の金の鎖と青い宝石） ──
    pd = cfg.get('pendant')
    if pd:
        ring = [V(p) for p in pd['chain']]
        B.tube(ring + [ring[0]], 40, 6, [[0, pd['chain_r'], pd['chain_r']], [1, pd['chain_r'], pd['chain_r']]], (0, -1, 0),
               'Gold', lambda t, ca, sa: gold, ['chest', 'neck1'], cap_start=False, cap_end=False)
        gc = V(pd['gem'])
        gw, gh, gd = pd['gem_size']
        top, bot = gc + Vector((0, 0, gh)), gc - Vector((0, 0, gh * 1.3))
        mid = [gc + Vector((gw * math.cos(a), gd * math.sin(a), 0)) for a in [2 * math.pi * k / 6 for k in range(6)]]
        mv = [B.bm.verts.new(p) for p in mid]
        tv, bv = B.bm.verts.new(top), B.bm.verts.new(bot)
        mi = B.mat('Gem')
        for k in range(6):
            for f in (B.bm.faces.new((mv[k], mv[(k + 1) % 6], tv)), B.bm.faces.new((mv[(k + 1) % 6], mv[k], bv))):
                f.material_index = mi
                for lp in f.loops:
                    lp[B.uv].uv = (0.5, 0.5)
                    lp[B.col] = gem
        if pd.get('gem_back'):  # 三面図: ひし形の宝石を金の細い台が後ろから支える
            B.ellipsoid(gc + Vector((0, gd * 0.9, 0)), [(gw * 1.15, 0, 0), (0, gd * 0.35, 0), (0, 0, gh * 1.25)], 'Gold', gold, ['chest'], segs=4, rings=2)
        else:
            B.ellipsoid(gc, [(gw * 1.25, 0, 0), (0, gd * 0.6, 0), (0, 0, gh * 1.2)], 'Gold', gold, ['chest'], segs=12, rings=6)
        for dr in pd.get('drapes', []):  # 肩から胸へ垂れる鎖
            B.tube(dr, 30, 6, [[0, pd['chain_r'], pd['chain_r']], [1, pd['chain_r'], pd['chain_r']]], (0, -1, 0), 'Gold', lambda t, ca, sa: gold, ['chest'], uv_scale=(1.0, 1.0))
        ts_ = pd.get('tassel')
        if ts_:  # 宝石の下の房
            B.blade(ts_['top'], ts_['bottom'], ts_['w'], 0.01, (0, -1, 0), 'Lid', blue_d, ['chest'])
        B.weigh(mv + [tv, bv], ['chest'])
    return B, parent


def _image(name, px, srgb=True):
    import numpy as np
    h, w = px.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    if not srgb:
        img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(np.ascontiguousarray(px, dtype=np.float32).ravel())
    img.pack()
    return img


def _normal_from_height(h, strength):
    """高さの画像 → 接線空間の法線の画像（glTF と同じ OpenGL 向き。画素の行 0 が下＝v=0）"""
    import numpy as np
    gy, gx = np.gradient(h)
    n = np.stack([-gx * strength, -gy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    px = np.ones(h.shape + (4,), dtype=np.float32)
    px[..., :3] = n * 0.5 + 0.5
    return px


def make_scale_texture(cfg, size=1024):
    """鱗の模様。横（u）は体のまわり（0＝背・0.5＝腹）、縦（v）は体に沿ってくり返す。
    背と脇は重なった菱形の鱗（ふくらんだ中・濃い溝・下の縁に光・1 枚ごとの明るさのむら）、腹は横に並ぶ白い板（V 字）。
    頂点の色（背は青・腹は白）を掛けて色にする。戻り値: (色の画像, 法線の画像)"""
    import numpy as np
    n = int(cfg.get('scale_rows', 10))
    y, x = np.mgrid[0:size, 0:size] / size
    gy = y * n
    row = np.floor(gy)
    gx = x * n * 1.6 + (row % 2) * 0.5
    col = np.floor(gx)
    fx = gx - col - 0.5
    fy = gy - row
    d = np.abs(fx) * 1.1 + np.abs(fy - 0.35) * 0.9          # 菱形の距離
    inside = d < 0.5
    rnd = np.sin(row * 12.9898 + col * 78.233) * 43758.5453
    rnd = rnd - np.floor(rnd)                                # 1 枚ごとの乱数 0〜1
    dome = np.clip(1 - (d / 0.5) ** 2, 0, 1)                 # 鱗のふくらみ
    edge = np.clip(1 - np.abs(d - 0.5) / 0.07, 0, 1)
    shade = np.where(inside, 0.74 + 0.24 * dome + (rnd - 0.5) * 0.16, 0.45)
    hi = np.clip(1 - np.abs(fy - 0.8) / 0.05, 0, 1) * inside * 0.1
    scales = shade * (1 - 0.5 * edge) + hi
    rnd2 = np.sin(row * 39.3 + col * 11.1) * 2617.3
    rnd2 = rnd2 - np.floor(rnd2)                             # 色むら（青紫 ↔ 水色）
    h_sc = np.where(inside, 0.4 + 0.6 * dome, 0.0)
    # ざらざらの鱗（2026-11-07「鯉みたい」→ 丸いふくらみと光る縁をやめ、平たい板に細かい粒と中央の稜線）
    rough = float(cfg.get('scale_rough', 0.0))
    if rough:
        rng = np.random.default_rng(7)
        grain = rng.random((size, size)).astype(np.float32)
        grain = (grain + np.roll(grain, 1, 0) + np.roll(grain, 1, 1) + np.roll(grain, -1, 0)) / 4   # 細かい粒
        keel = np.clip(1 - np.abs(fx) / 0.08, 0, 1) * inside * np.clip(fy * 1.5, 0, 1)             # 鱗の中央の稜線
        flat = np.where(inside, 0.82 + 0.06 * dome + (rnd - 0.5) * 0.2, 0.5)
        scales = flat * (1 - 0.45 * edge) + (grain - 0.5) * 0.22 * rough + keel * 0.06
        h_sc = np.where(inside, 0.5 + 0.15 * dome + 0.35 * keel, 0.0) + (grain - 0.5) * 0.9 * rough
    by = y * 3 + np.abs(x - 0.5) * float(cfg.get('belly_chevron', 0.0))
    bf = by - np.floor(by)
    prow = np.floor(by)
    prnd = np.sin(prow * 91.7) * 4375.85
    prnd = prnd - np.floor(prnd)
    plate = 0.95 - 0.14 * bf + (prnd - 0.5) * 0.05 - 0.45 * np.clip(1 - bf / 0.05, 0, 1) - 0.18 * np.clip((bf - 0.94) / 0.06, 0, 1)
    h_pl = np.clip(1 - bf, 0, 1) ** 0.5 * np.clip(bf / 0.05, 0, 1)
    belly = np.clip(1 - (np.abs(x - 0.5) - 0.13) / 0.05, 0, 1)
    stri = float(cfg.get('belly_stripes', 0.03)) * np.sin(y * size * 0.9)   # 腹の板の細い横筋
    v = scales * (1 - belly) + (plate + stri) * belly
    h = h_sc * (1 - belly) + (h_pl + stri * 2) * belly
    tint = (rnd2 - 0.5) * 0.12 * (1 - belly) * inside       # 鱗 1 枚ごとの色むら
    px = np.ones((size, size, 4), dtype=np.float32)
    px[..., 0] = np.clip(v * (1 + tint), 0, 1)
    px[..., 1] = np.clip(v * (1 - tint * 0.3), 0, 1)
    px[..., 2] = np.clip(v * (1 - tint * 0.6), 0, 1)
    return _image('RuneScales', px), _image('RuneScalesNormal', _normal_from_height(h, float(cfg.get('scale_relief', 18.0))), srgb=False)


def make_part_texture(name, color, kind, size=(64, 256), edge=None):
    """刃・とげ・爪・角の画像（u＝まわり・v＝根元 0 → 先 1）。根元は暗く先は明るい、長さに沿った筋。
    色は線形で受け取り、色の画像は sRGB で書く。戻り値: (色の画像, 法線の画像)"""
    import numpy as np
    w, hgt = size
    y, x = np.mgrid[0:hgt, 0:w]
    v = y / (hgt - 1)
    u = x / (w - 1)
    if kind == 'claw':      # 根元はやや灰色・先は黒く光る
        k = 1.25 - 0.45 * v
        groove = 0.04 * np.cos(u * 2 * np.pi * 4)
    elif kind == 'horn':    # 象牙: 根元に輪の筋・先は明るい
        k = 0.8 + 0.25 * v - 0.08 * (np.sin(v * 40) > 0.6)
        groove = 0.05 * np.sin(v * 40)
    else:                   # 刃の鱗: 根元は暗く、先は明るい。長さに沿った細い筋
        k = 0.62 + 0.5 * v ** 0.8
        groove = 0.06 * np.cos(u * 2 * np.pi * 6) * (0.4 + 0.6 * v)
    k = k * (1 + groove)
    lin = np.clip(np.array(color[:3])[None, None, :] * k[..., None], 0, 1)
    if edge is not None:  # 刃の縁の金の線（u＝0 と 0.5 が刃の両縁）。根元は細く、先ほど太い
        e = np.clip((np.abs(np.cos(2 * np.pi * u)) - (0.9 - 0.12 * v)) / 0.06, 0, 1) * np.clip(v * 2.0, 0, 1)
        lin = lin * (1 - e[..., None]) + np.array(edge[:3])[None, None, :] * e[..., None]
    srgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)
    px = np.ones((hgt, w, 4), dtype=np.float32)
    px[..., :3] = srgb
    hmap = groove * 3
    return _image('Rune%sTex' % name, px), _image('Rune%sNormal' % name, _normal_from_height(hmap, 6.0), srgb=False)


def make_membrane_texture(c0, c1, size=(256, 256)):
    """翼の膜: 手首（v=0）の青 → ふち（v=1）の白、指のあいだを走る血管（u に沿って数本）と細かいしわ"""
    import numpy as np
    w, hgt = size
    y, x = np.mgrid[0:hgt, 0:w]
    v = y / (hgt - 1)
    u = x / (w - 1)
    f = 0.85 * np.clip((v - 0.35) / 0.65, 0, 1) ** 1.6
    col = np.array(c0[:3])[None, None, :] * (1 - f[..., None]) + np.array(c1[:3])[None, None, :] * f[..., None]
    vein_u = (u * 9 + 0.15 * np.sin(v * 9)) % 1.0
    vein = np.clip(1 - np.abs(vein_u - 0.5) / 0.03, 0, 1) * (1 - v) ** 0.7
    wr = 0.5 + 0.5 * np.sin(v * 70 + np.sin(u * 30) * 2)
    col = col * (1 - 0.35 * vein[..., None]) * (0.95 + 0.05 * wr[..., None])
    srgb = np.where(col <= 0.0031308, col * 12.92, 1.055 * np.power(np.clip(col, 0, 1), 1 / 2.4) - 0.055)
    px = np.ones((hgt, w, 4), dtype=np.float32)
    px[..., :3] = srgb
    hmap = vein * 0.6 + wr * 0.08
    return _image('RuneMembraneTex', px), _image('RuneMembraneNormal', _normal_from_height(hmap, 4.0), srgb=False)


def gradient_tex(c0, c1, n=64):
    """縦のグラデーション（v=0 が c0・v=1 が c1。後ろ 6 割で c1 へ寄る）。色は線形で受け取り、画像は sRGB で書く"""
    img = bpy.data.images.new('RuneMembraneGrad', 2, n, alpha=True)
    px = []
    for j in range(n):
        t = j / (n - 1)
        f = 0.85 * max(0.0, (t - 0.35) / 0.65) ** 1.6
        c = [a + (b - a) * f for a, b in zip(c0[:3], c1[:3])]
        c = [x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055 for x in c]
        px += (c + [1.0]) * 2
    img.pixels.foreach_set(px)
    img.pack()
    return img


def white_tex():
    img = bpy.data.images.get('RuneWhite')
    if img is None:
        img = bpy.data.images.new('RuneWhite', 4, 4, alpha=True)
        img.pixels.foreach_set([1.0] * 64)
        img.pack()
    return img


def _use_normal(nt, bsdf, img, strength=1.0):
    ti = nt.nodes.new('ShaderNodeTexImage')
    ti.image = img
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = strength
    nt.links.new(ti.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])


def make_materials(B, cfg):
    tex, tex_n = make_scale_texture(cfg, size=int(cfg.get('scale_tex', 1024)))
    out = []
    pal = cfg['palette']
    flat = {'Claw': hexc(pal['claw']), 'Horn': hexc(pal['horn']), 'Spike': mix(hexc(pal['spike']), hexc(pal['scale']), 0.3),
            'Eye': hexc(pal['eye']), 'Pupil': hexc(pal['eye_dark']), 'Glint': hexc('#FFFFFF'), 'Gold': hexc(pal['gold']),
            'Gem': hexc(pal['gem']), 'Mouth': hexc(pal['mouth']), 'Membrane': hexc(pal['membrane']), 'Lid': hexc(pal['scale_dark'])}
    for i, c in enumerate((cfg.get('mane') or {}).get('colors', [])):
        flat['Mane%d' % i] = hexc(c)
    for lp_ in cfg.get('leg_plates', []):
        if lp_.get('prefix', 'Plate') != 'Plate':
            continue
        for i, c in enumerate(lp_['colors']):
            flat['Plate%d' % i] = hexc(c)
    for i, c in enumerate((cfg.get('back_plates') or {}).get('colors', [])):
        flat['Back%d' % i] = hexc(c)
    for lp_ in cfg.get('leg_plates', []):  # 別の名前の材質（太ももなど）
        if lp_.get('prefix', 'Plate') not in ('Plate', 'Back'):
            for i, c in enumerate(lp_['colors']):
                flat['%s%d' % (lp_['prefix'], i)] = hexc(c)
    flat['Banner'] = hexc(pal.get('banner', '#2C3F8C'))
    for i, c in enumerate((cfg.get('neck_plates') or {}).get('colors', [])):
        flat['Neck%d' % i] = hexc(c)
    flat.update(getattr(B, 'extra_flat', None) or {})
    for name in B.mat_names:
        m = bpy.data.materials.new('Rune' + name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Col'
        kind = 'claw' if name == 'Claw' else 'horn' if name in ('Horn', 'HornDark') else 'blade' if (
            name.startswith(('Mane', 'Back', 'Plate', 'Thigh', 'Crown', 'Neck')) or name == 'Spike') else None
        if name == 'Membrane':  # 膜: グラデーション＋血管＋しわの画像と法線
            # 頂点の色は、glTF の書き出しで最初の材質（体）にしか書かれず、ほかは白になった
            nt.nodes.remove(vc)
            ti = nt.nodes.new('ShaderNodeTexImage')
            mt_, mn_ = make_membrane_texture(hexc(pal['membrane']), hexc(pal.get('membrane_edge', pal['membrane'])))
            ti.image = mt_
            ti.extension = 'EXTEND'
            nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
            _use_normal(nt, bsdf, mn_, 0.6)
        elif kind:  # 刃・とげ・爪・角: 根元から先への色の変化と筋（画像と法線）
            nt.nodes.remove(vc)
            ti = nt.nodes.new('ShaderNodeTexImage')
            ge = hexc(pal['gold']) if (name.startswith('Crown') or name == 'HornDark') and cfg.get('face', {}).get('crown_gold', False) else None
            ct_, cn_ = make_part_texture(name, flat.get(name, (1, 1, 1, 1)), kind, edge=ge)
            ti.image = ct_
            nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
            _use_normal(nt, bsdf, cn_, 0.8)
        elif name == 'Face':  # 顔の専用の肌（hq3d_dragon_face.make_face_texture）。色は画像だけで決める
            nt.nodes.remove(vc)
            fpx, fh = hq3d_dragon_face.make_face_texture(cfg)
            ti = nt.nodes.new('ShaderNodeTexImage')
            ti.image = _image('RuneFaceTex', fpx)
            nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
            _use_normal(nt, bsdf, _image('RuneFaceNormal', _normal_from_height(fh, float(cfg['face']['face_tex'].get('relief', 6.0))), srgb=False), 0.6)
        elif name == 'Scale':  # 鱗の模様 × 頂点の色（glTF では「テクスチャ × 頂点の色」の形しか書き出せない。割合を混ぜると色が落ちる）
            ti = nt.nodes.new('ShaderNodeTexImage')
            ti.image = tex
            mul = nt.nodes.new('ShaderNodeMix')
            mul.data_type = 'RGBA'
            mul.blend_type = 'MULTIPLY'
            mul.inputs['Factor'].default_value = 1.0
            nt.links.new(vc.outputs['Color'], mul.inputs['A'])
            nt.links.new(ti.outputs['Color'], mul.inputs['B'])
            nt.links.new(mul.outputs['Result'], bsdf.inputs['Base Color'])
            _use_normal(nt, bsdf, tex_n, 1.0)
        else:  # 単色の部品は材質の色で塗る（頂点の色は、テクスチャの無い材質だと書き出されないことがあった）
            nt.nodes.remove(vc)
            bsdf.inputs['Base Color'].default_value = flat.get(name, (1, 1, 1, 1))
        rough = {'Face': 0.5, 'Gem': 0.15, 'Gold': 0.3, 'Eye': 0.1, 'Glint': 0.1, 'Pupil': 0.1, 'Claw': 0.22, 'Horn': 0.45, 'Scale': 0.42,
                 'Membrane': 0.6, 'Lid': 0.45, 'Banner': 0.8, 'Tooth': 0.3, 'Tongue': 0.35, 'Lash': 0.5, 'Blush': 0.8}
        rough.update(cfg.get('roughness', {}))
        bsdf.inputs['Roughness'].default_value = rough.get(name, cfg.get('roughness', {}).get('blade', 0.4) if kind == 'blade' else 0.7)
        coat_t = {'Face': 0.15, 'Scale': 0.35, 'Claw': 0.7, 'Horn': 0.25, 'Lid': 0.3, 'Eye': 1.0, 'Sclera': 0.8, 'blade': 0.25}
        coat_t.update(cfg.get('coat', {}))
        coat = coat_t.get(name, coat_t['blade'] if kind == 'blade' else 0.0)
        if coat and 'Coat Weight' in bsdf.inputs:
            bsdf.inputs['Coat Weight'].default_value = coat
            bsdf.inputs['Coat Roughness'].default_value = 0.18
        bsdf.inputs['Metallic'].default_value = {'Gold': 0.9}.get(name, 0.0)
        if name in ('Gem', 'Glint'):
            bsdf.inputs['Emission Color'].default_value = hexc(pal['gem']) if name == 'Gem' else (1, 1, 1, 1)
            bsdf.inputs['Emission Strength'].default_value = float(cfg.get('gem_glow', 0.6)) if name == 'Gem' else 0.8
        if name == 'Membrane':
            m.use_backface_culling = False
        if name == 'Blush':  # ほおの赤み: 半透明
            bsdf.inputs['Alpha'].default_value = 0.55
            try:
                m.surface_render_method = 'BLENDED'
            except Exception:  # noqa: BLE001
                m.blend_method = 'BLEND'
        if name in ('Lid', 'LidLo', 'Lash'):
            m.use_backface_culling = False
        out.append(m)
    return out


def finish(B, parent, cfg, out_glb, blend=None):
    me = bpy.data.meshes.new('RuneBody')
    bmesh.ops.remove_doubles(B.bm, verts=[v for v in B.bm.verts if v.is_valid], dist=0.0)
    # 重みとまばたきの行き先は bmesh の頂点に結びついているので、メッシュへ書く前に番号へ直す
    B.bm.verts.index_update()
    weights = {v.index: w for v, w in B.vw.items() if v.is_valid}
    blink = {v.index: co.copy() for v, co in B.blink.items() if v.is_valid}
    eyes = [dict(e, eye=[v.index for v in e['eye'] if v.is_valid]) for e in B.eye_info]
    brows = {sd: [v.index for v in vs if v.is_valid] for sd, vs in B.brow_v.items()}
    face = B.face.to_index() if getattr(B, 'face', None) else None
    B.bm.normal_update()
    bmesh.ops.recalc_face_normals(B.bm, faces=B.bm.faces)
    B.bm.to_mesh(me)
    B.bm.free()
    for p in me.polygons:
        p.use_smooth = True
    for m in make_materials(B, cfg):
        me.materials.append(m)
    ob = bpy.data.objects.new('RuneBody', me)
    bpy.context.scene.collection.objects.link(ob)
    # 骨
    ad = bpy.data.armatures.new('RuneSkeleton')
    arm = bpy.data.objects.new('Rune', ad)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name in B.bone_head:
        eb = ad.edit_bones.new(name)
        eb.head, eb.tail = B.bone_head[name], B.bone_tail[name]
    for name, pa in parent.items():
        if pa:
            ad.edit_bones[name].parent = ad.edit_bones[pa]
    bpy.ops.object.mode_set(mode='OBJECT')
    # 重み
    groups = {}
    for vi, ws in weights.items():
        for b, w in ws:
            g = groups.get(b) or ob.vertex_groups.new(name=b)
            groups[b] = g
            g.add([vi], w, 'REPLACE')
    ob.parent = arm
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    bake_ao(ob, cfg)
    # まばたきのモーフ
    ob.shape_key_add(name='Basis')
    if face:  # 表情の作れる顔: まばたきも表情もまぶた・あご・やわらかい範囲で作る
        hq3d_dragon_face.make_face_morphs(ob, cfg, face)
    else:
        kb = ob.shape_key_add(name='blink')
        for vi, co in blink.items():
            kb.data[vi].co = co
        make_expressions(ob, cfg, blink, eyes, brows)
    # 表情の初期値は 0（Blender 5.2 は shape_key_add で値を 1 にするので、全部の表情が重なって書き出されていた・2026-11-07）
    for kb_ in ob.data.shape_keys.key_blocks:
        kb_.value = 0.0
    # 待機の動き（息・尾・翼・首）
    make_idle(arm, cfg)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
    os.makedirs(os.path.dirname(out_glb), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_animations=True, export_morph=True,
                              export_skins=True, export_apply=False, export_morph_normal=False, export_yup=True, export_force_sampling=True,
                              export_vertex_color='ACTIVE')
    return {'verts': len(me.vertices), 'faces': len(me.polygons), 'bones': len(ad.bones), 'materials': len(me.materials),
            'blink_verts': len(blink) if not face else len(face['lids']), 'bytes': os.path.getsize(out_glb)}


def make_expressions(ob, cfg, blink, eyes, brows):
    """表情のモーフ。名前は Cast Profile の表情名（gentle_smile など）と、VRM の標準名（happy など）の両方で作る。
    まぶた（まばたきの行き先へ割合だけ）・目（縦につぶす・大きくする）・まゆ（上下・前後・内側だけ上げる）を組み合わせる。
      expressions: {名前: {"lid": 0〜1, "squint": 0〜1, "wide": 0〜1, "brow": [上下 m, 前後 m], "brow_inner": 内側だけ上げる m,
                           "brow_side": {"L"|"R": 上下 m}}}"""
    me = ob.data
    base = [v.co.copy() for v in me.vertices]
    for name, ex in cfg.get('expressions', {}).items():
        kb = ob.shape_key_add(name=name)
        co = [b.copy() for b in base]
        lid = float(ex.get('lid', 0.0))
        for vi, tgt in blink.items():
            co[vi] = base[vi].lerp(tgt, lid)
        sq, wd = float(ex.get('squint', 0.0)), float(ex.get('wide', 0.0))
        for e in eyes:
            c, up = e['c'], e['up']
            for vi in e['eye']:
                d = base[vi] - c
                h = d.dot(up)
                k = 1 - sq * 0.55 + wd * 0.25
                co[vi] = base[vi] - up * h * (1 - k) + up * sq * 0.004 + (d - up * h) * wd * 0.15
        dz0, dy = ex.get('brow', [0.0, 0.0])
        inner = float(ex.get('brow_inner', 0.0))
        for sd, vs in brows.items():
            if not vs:
                continue
            dz = dz0 + (ex.get('brow_side') or {}).get('L' if sd > 0 else 'R', 0.0)
            xs = [base[vi].x * sd for vi in vs]
            x0, x1 = min(xs), max(xs)
            for vi in vs:
                f_in = 1 - (base[vi].x * sd - x0) / max(x1 - x0, 1e-6)  # 内側ほど 1
                co[vi] = base[vi] + Vector((0, dy, dz + inner * f_in))
        for i, c in enumerate(co):
            kb.data[i].co = c


def bake_ao(ob, cfg):
    """くぼみの暗さ（周囲のさえぎり＝AO）を Cycles で焼き、体の頂点の色（Col）に掛ける。
    glTF では頂点の色が体の材質にしか書かれないので、効くのは体（首・胴・脚・尾・頭）だけ。
      ao: {"samples", "distance": m, "strength": 0〜1}"""
    spec = cfg.get('ao')
    if not spec:
        return None
    me = ob.data
    sc = bpy.context.scene
    old_engine = sc.render.engine
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = int(spec.get('samples', 48))
    sc.cycles.device = 'CPU'
    w = bpy.data.worlds.get('AOWorld') or bpy.data.worlds.new('AOWorld')
    w.light_settings.distance = float(spec.get('distance', 0.25))
    sc.world = w
    ao = me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = ao
    for o in bpy.context.scene.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = me.color_attributes['Col']
    k = float(spec.get('strength', 0.75))
    for i in range(len(col.data)):
        a_ = ao.data[i].color[0]
        f = 1 - k * (1 - a_)
        c = col.data[i].color
        col.data[i].color = (c[0] * f, c[1] * f, c[2] * f, c[3])
    me.color_attributes.remove(me.color_attributes['AO'])
    me.color_attributes.active_color = me.color_attributes['Col']
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    sc.render.engine = old_engine
    return True


def make_idle(arm, cfg):
    """待機の動き: 4 秒でひとまわり。胸の息・尾のゆらぎ・翼のわずかな開閉・首のゆれ。口と首の向きは Cast Engine が上から足す"""
    idl = cfg.get('idle', {})
    period = int(idl.get('frames', 120))
    act = bpy.data.actions.new('idle')
    arm.animation_data_create()
    arm.animation_data.action = act
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    sway = idl.get('sway', {})
    for f in range(0, period + 1, 4):
        ph = 2 * math.pi * f / period
        for name, spec in sway.items():
            pb = arm.pose.bones.get(name)
            if pb is None:
                continue
            pb.rotation_mode = 'XYZ'
            amp, axis, shift = spec['amp'], spec['axis'], spec.get('phase', 0.0)
            e = [0.0, 0.0, 0.0]
            e['xyz'.index(axis)] = math.radians(amp) * math.sin(ph + shift)
            pb.rotation_euler = e
            pb.keyframe_insert('rotation_euler', frame=f)
            if spec.get('scale'):
                s = 1 + spec['scale'] * math.sin(ph + shift)
                pb.scale = (s, s, s)
                pb.keyframe_insert('scale', frame=f)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = 0, period
    bpy.context.scene.render.fps = 30


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    cfg = json.load(open(argv[0], encoding='utf-8'))
    out = os.path.abspath(argv[1])
    blend = os.path.abspath(argv[argv.index('--blend') + 1]) if '--blend' in argv else None
    B, parent = build(cfg)
    res = finish(B, parent, cfg, out, blend)
    emit(dict({'ok': True, 'output': out}, **res))


try:
    main()
except BaseException as e:  # noqa: BLE001
    emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-2500:]})
