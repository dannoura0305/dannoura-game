# -*- coding: utf-8 -*-
"""ルーンの顔（hq3d_dragon.py から呼ぶ）— 2026-11-07

利用者の表情リスト（12 種: 平常・微笑み・喜び・照れ・思案・好奇心・驚き・困惑・決意・怒り・悲しみ・安堵）に合わせて、
表情が作れる顔を組む。前の頭（口先へ細る筒＋目の玉＋まぶたの殻）では、正面から目が見えず、動くのもまぶたとまゆだけだった。

作るもの（すべて「頭の座標」で考え、最後に首の先の点 O から下向きに傾けて置く）
  頭の座標: x＝横（左が +）、s＝前（口先が +）、z＝上。O は首の先。
  ・頭骨と口先（断面を前後に並べた面）。断面は角の丸い四角（superellipse）。
      額の出っ張り・目のくぼみ・ほお骨・鼻の穴のふくらみは「ふくらみ（bump）」で足す
  ・下あご（白）。口の中（上あごの裏・下あごの上）は赤みのある色
  ・目: アーモンド形の目の玉（青い虹彩・黒い瞳・光）。上まぶたと下まぶたを別々に持つ（縁は濃い線）
  ・歯（上下）・舌・口の奥の壁・ほおの赤み（ふだんは皮の下に隠れている）
  ・冠: 額から首の後ろへ流れる大きな刃の重なり（青・水色・白）と、後ろへ反る角
表情のモーフ（make_face_morphs）
  上まぶた・下まぶたの縁の角度、あごの開き、まゆの内側／外側、口の端、上くちびる（牙を見せる）、ほお、鼻の穴、
  目の向き（瞳）、ほおの赤み を組み合わせる。左右別の値は名前の後ろに _L / _R。
"""
import math

import bmesh
from mathutils import Matrix, Vector


def V(a):
    return Vector((float(a[0]), float(a[1]), float(a[2])))


def prof(t, pts):
    pts = sorted(pts, key=lambda x: x[0])
    if t <= pts[0][0]:
        return pts[0][1]
    for a, b in zip(pts, pts[1:]):
        if t <= b[0]:
            f = (t - a[0]) / max(b[0] - a[0], 1e-9)
            f = f * f * (3 - 2 * f)
            return a[1] + (b[1] - a[1]) * f
    return pts[-1][1]


def spow(x, p):
    return math.copysign(abs(x) ** p, x)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


class Face:
    def __init__(self, B, cfg, colors):
        self.B, self.fc, self.C = B, cfg['face'], colors
        fc = self.fc
        self.O = V(fc['origin'])
        self.R = Matrix.Rotation(math.radians(fc.get('pitch', 15)), 3, 'X')
        self.k = float(fc.get('scale', 1.0))   # 頭全体の大きさ（首の先 O を中心に）
        self.X, self.F, self.U = Vector((1, 0, 0)), Vector((0, -1, 0)), Vector((0, 0, 1))
        self.parts = {'brow': [], 'skull': [], 'jaw': [], 'eye': [], 'lid': [], 'tooth_up': [], 'tooth_lo': [], 'tongue': [], 'blush': [], 'pupil': []}
        self.lids = {}       # 頂点 → (目の番号, 'up'|'lo', α, k, 内側か)
        self.eyes = []       # 目ごとの座標系
        self.regions = {}    # 名前 → {頂点: 重み}
        self.vec = {}        # 名前 → 動く向き（世界座標・1 m あたり）

    # 頭の座標 → 世界座標
    def H(self, p):
        x, s, z = p
        return self.O + self.R @ (self.X * x + self.F * s + self.U * z) * self.k

    def Hd(self, d):
        x, s, z = d
        return self.R @ (self.X * x + self.F * s + self.U * z) * self.k

    # ── 頭骨の断面 ──
    def sk(self, s):
        g = self.fc['skull']
        return prof(s, g['w']), prof(s, g['c']), prof(s, g['ht']), prof(s, g['hb']), prof(s, g.get('p', [[0, 2.4]]))

    def bump(self, s, th_deg, bumps):
        th = th_deg % 360
        th = th if th <= 180 else 360 - th          # 左右対称
        b = 0.0
        for bp in bumps:
            ds = (s - bp['s']) / bp['ss']
            dt = (th - bp['th']) / bp['st']
            b += bp['h'] * math.exp(-(ds * ds + dt * dt))
        return b

    def skull_pt(self, s, th_deg, inset=0.0):
        """頭骨の表面の点（頭の座標）。th: 0＝上、90＝横、180＝下"""
        w, c, ht, hb, p = self.sk(s)
        th = math.radians(th_deg)
        cz, sx = math.cos(th), math.sin(th)
        e = 2.0 / p
        k = 1 + self.bump(s, th_deg, self.fc['skull'].get('bumps', [])) - inset
        x = w * spow(sx, e) * k
        z = (ht if cz >= 0 else hb) * spow(cz, e) * k
        return (x, s, c + z)

    def jaw_pt(self, s, th_deg):
        g = self.fc['jaw']
        w, d, top = prof(s, g['w']), prof(s, g['d']), prof(s, g.get('top', [[0, 0.006]]))
        _, c, _, hb, _ = self.sk(s)
        zc = c - hb + prof(s, g.get('lift', [[0, 0.0]]))
        th = math.radians(th_deg)
        cz, sx = math.cos(th), math.sin(th)
        e = 2.0 / 2.3
        k = 1 + self.bump(s, th_deg, g.get('bumps', []))
        return (w * spow(sx, e) * k, s, zc + (top if cz >= 0 else d) * spow(cz, e) * k)

    # ── 断面を並べた面（UV は小さな鱗がくり返す並べ方）──
    def loft(self, fn, s0, s1, ns, sides, mat, color_fn, bones, part, cap0=True, cap1=True, reps=4, face_uv=None):
        """face_uv=(v0, v1): 顔の専用の画像を使う。u＝まわりの角度/360、v＝前後の位置を v0〜v1 へ（頭骨は上半分・下あごは下半分）"""
        B = self.B
        mi = B.mat(mat)
        rows = []
        info = []
        for i in range(ns + 1):
            t = i / ns
            s = s0 + (s1 - s0) * (t ** self.fc.get('loft_bias', 1.0))
            row = []
            for k in range(sides):
                th = 360.0 * k / sides
                p = fn(s, th)
                row.append(B.bm.verts.new(self.H(p)))
            rows.append(row)
            info.append(s)
        nrow = int(self.cfg_root.get('scale_rows', 14))
        cols = nrow * 1.6
        win = 7 / cols                       # まわりに 7 枚ずつの窓（継ぎ目で模様がそろう）
        block = sides // reps
        # まわりの長さ（平均）から縦の倍率を決める（鱗の縦横を胴と同じに）
        circ = sum((rows[len(rows) // 2][k].co - rows[len(rows) // 2][(k + 1) % sides].co).length for k in range(sides))
        colw = circ / (reps * 7)
        rowh = colw / 1.9
        sv = 1.0 / (nrow * rowh)
        acc = [0.0]
        for i in range(1, len(rows)):
            a, b = rows[i - 1], rows[i]
            acc.append(acc[-1] + sum((a[k].co - b[k].co).length for k in range(0, sides, max(1, sides // 8))) / len(range(0, sides, max(1, sides // 8))))
        for i in range(ns):
            for k in range(sides):
                k2 = (k + 1) % sides
                f = B.bm.faces.new((rows[i][k], rows[i][k2], rows[i + 1][k2], rows[i + 1][k]))
                f.material_index = mi
                bi = k // block
                for lp in f.loops:
                    ii = i if lp.vert in (rows[i][k], rows[i][k2]) else i + 1
                    kk = k if lp.vert in (rows[i][k], rows[i + 1][k]) else k + 1
                    if face_uv:
                        lp[B.uv].uv = (kk / sides, face_uv[0] + (face_uv[1] - face_uv[0]) * (info[ii] - s0) / (s1 - s0))
                    else:
                        lp[B.uv].uv = ((kk - bi * block) / block * win, acc[ii] * sv)
                    lp[B.col] = color_fn(info[ii], 360.0 * (kk % sides) / sides)
        for do, row, s in ((cap0, rows[0], info[0]), (cap1, rows[-1], info[-1])):
            if not do:
                continue
            c = sum((v.co for v in row), Vector()) / len(row)
            cv = B.bm.verts.new(c)
            for k in range(sides):
                q = (row[k], row[(k + 1) % sides], cv) if row is rows[-1] else (row[(k + 1) % sides], row[k], cv)
                f = B.bm.faces.new(q)
                f.material_index = mi
                for lp in f.loops:
                    if face_uv:
                        lp[B.uv].uv = (0.25, face_uv[0] + 0.002 if row is rows[0] else face_uv[1] - 0.002)   # 先のふたは横の色（下あごの先が口の中の赤になっていた）
                    else:
                        lp[B.uv].uv = (0.1, acc[0] if row is rows[0] else acc[-1] * sv)
                    lp[B.col] = color_fn(s, 0.0)
            row = row + [cv]
            self.parts[part].append(cv)
        vs = [v for r in rows for v in r]
        self.parts[part] += vs
        B.weigh(vs + [v for v in self.parts[part] if v not in vs], bones)
        return rows

    def build(self, cfg_root):
        self.cfg_root = cfg_root
        B, fc, C = self.B, self.fc, self.C
        blue, white, inner = C['blue'], C['white'], C['inner']

        def skull_color(s, th):
            p = self.skull_pt(s, th)
            w, c, ht, hb, _ = self.sk(s)
            z = p[2] - c
            thf = th % 360
            thf = thf if thf <= 180 else 360 - thf
            if thf > 150:                       # 上あごの裏（口の中）
                return inner
            line = fc.get('white_line', 0.3)   # 横から見て、口の線から ht×この割合より下が白
            f = smooth((line * ht - z) / max(0.25 * ht, 1e-4))
            return mix(blue, white, f)

        def jaw_color(s, th):
            thf = th % 360
            thf = thf if thf <= 180 else 360 - thf
            if thf < 35:                        # 下あごの上（口の中）
                return inner
            return white

        g = fc['skull']
        ft = fc.get('face_tex')
        self.loft(self.skull_pt, g['s0'], g['s1'], g.get('ns', 34), g.get('sides', 36), 'Face' if ft else 'Scale', skull_color, ['head'], 'skull',
                  reps=g.get('reps', 4), face_uv=(0.5, 1.0) if ft else None)
        j = fc['jaw']
        self.loft(self.jaw_pt, j['s0'], j['s1'], j.get('ns', 24), j.get('sides', 28), 'Face' if ft else 'Scale', jaw_color, ['jaw'], 'jaw',
                  face_uv=(0.0, 0.5) if ft else None)
        self.build_mouth()
        self.build_eyes()
        self.build_brows()
        self.build_crown()
        self.build_regions()
        # 頭と下あごの骨を、作った顔に合わせて置き直す
        hg = fc['hinge']
        B.bone_head['head'] = self.H((0, -0.02, 0.0))
        B.bone_tail['head'] = self.H((0, g['s1'], 0.0))
        B.bone_head['jaw'] = self.H(hg)
        B.bone_tail['jaw'] = self.H((0, j['s1'], hg[2] - 0.01))
        # 骨を置き直したので、頭の部品の重みを付け直す（頭／あご 1 本ずつ）
        for part, bone in (('skull', 'head'), ('eye', 'head'), ('brow', 'head'), ('lid', 'head'), ('tooth_up', 'head'), ('pupil', 'head'), ('blush', 'head'),
                           ('jaw', 'jaw'), ('tooth_lo', 'jaw'), ('tongue', 'jaw')):
            for v in self.parts[part]:
                B.vw[v] = [(bone, 1.0)]
        for v in getattr(self, 'crown_v', []):
            B.vw[v] = [('head', 1.0)]
        for v in getattr(self, 'back_v', []):
            B.vw[v] = [('head', 1.0)]

    # ── 口の中: 歯・舌・奥の壁 ──
    def build_mouth(self):
        B, fc = self.B, self.fc
        tooth, tongue, back = self.C['tooth'], self.C['tongue'], self.C['mouth']
        mt = fc.get('teeth', {})
        n = mt.get('count', 9)
        s_a, s_b = mt.get('from', 0.08), mt.get('to', 0.27)
        for side in (1, -1):
            for i in range(n):
                s = s_a + (s_b - s_a) * i / (n - 1)
                w, c, ht, hb, _ = self.sk(s)
                fang = 1.7 if abs(s - mt.get('fang', 0.215)) < 0.012 else 1.0
                L = mt.get('len', 0.011) * fang
                x = side * w * 0.78
                base = (x, s, c - hb * 0.2)
                tip = (x * 0.97, s + 0.002, c - hb - L * mt.get('show', 0.6))
                vs = B.cone(self.H(base), self.H(tip), 0.0035 * fang, 6, 'Tooth', tooth, ['head'])
                self.parts['tooth_up'] += vs
                # 下の歯（上の歯の間）
                if i < n - 1:
                    s2 = s + (s_b - s_a) / (n - 1) * 0.5
                    wj = prof(s2, fc['jaw']['w'])
                    _, c2, _, hb2, _ = self.sk(s2)
                    x2 = side * wj * 0.72
                    base2 = (x2, s2, c2 - hb2 - 0.006)
                    tip2 = (x2 * 0.97, s2, c2 - hb2 + L * 0.55)
                    self.parts['tooth_lo'] += B.cone(self.H(base2), self.H(tip2), 0.003, 6, 'Tooth', tooth, ['jaw'])
        tg = fc['tongue']
        g = B.ellipsoid(self.H(tg['c']), [self.Hd((tg['ax'][0], 0, 0)), self.Hd((0, tg['ax'][1], 0)), self.Hd((0, 0, tg['ax'][2]))],
                        'Tongue', tongue, ['jaw'], segs=12, rings=6)
        self.parts['tongue'] += [v for r in g for v in r]
        bw = fc['mouth_back']
        g = B.ellipsoid(self.H(bw['c']), [self.Hd((bw['ax'][0], 0, 0)), self.Hd((0, bw['ax'][1], 0)), self.Hd((0, 0, bw['ax'][2]))],
                        'Mouth', back, ['jaw'], segs=12, rings=6)
        self.parts['tongue'] += [v for r in g for v in r]

    # ── 目とまぶた ──
    def build_eyes(self):
        B, fc = self.B, self.fc
        e = fc['eye']
        for side in (1, -1):
            s, th = e['s'], e['th']
            P = V(self.skull_pt(s, side * th if side > 0 else 360 - th))
            w, c, ht, hb, _ = self.sk(s)
            n = Vector((P.x, 0, (P.z - c) * (w / max(ht, 1e-4)))).normalized()
            out = (n + Vector((0, 1, 0)) * e.get('forward', 0.55) + Vector((0, 0, 1)) * e.get('up', 0.1)).normalized()
            if e.get('long_axis') == 'horizontal':       # 前を向いた目: 長い向きは顔を横切る水平（目頭＝鼻の側が +A）
                a = Vector((0, 0, 1)).cross(out)
                if a.y < 0:
                    a = -a
                a = a.normalized()
            else:
                a = Vector((0, 1, 0)) - out * out.y          # 目の長い向き（前へ）
                a = a.normalized()
            b = out.cross(a) if side > 0 else a.cross(out)
            if b.z < 0:
                b = -b
            b = (b - out * b.dot(out)).normalized()
            # 目じりを少し上げる（アーモンド形の傾き）
            tilt = math.radians(e.get('tilt', 12)) * 1
            a2 = (a * math.cos(tilt) - b * math.sin(tilt)).normalized()
            b2 = (b * math.cos(tilt) + a * math.sin(tilt)).normalized()
            a, b = a2, b2
            ra, rb, rc = e['r']
            cen = P - out * e.get('sink', 0.006)
            # 世界座標へ
            cw = self.H(cen)
            A, Bv, Ov = self.Hd(a), self.Hd(b), self.Hd(out)
            human = 'iris' in e
            g = B.ellipsoid(cw, [A * ra, Bv * rb, Ov * rc], 'Sclera' if human else 'Eye', self.C['eye'], ['head'], segs=18, rings=10)
            self.parts['eye'] += [v for r in g for v in r]
            pv = []
            if human:  # 虹彩（大きな青い円板）を白目の前に。縁は白目の中に沈む
                ir = e['iris']
                g = B.ellipsoid(cw + Ov * (rc * e.get('iris_out', 0.7)), [A * ir, Bv * ir * 1.05, Ov * 0.005], 'Eye', self.C['eye'], ['head'], segs=20, rings=8)
                pv += [v for r in g for v in r]
            pr = e.get('pupil', [0.0055, 0.008])
            g = B.ellipsoid(cw + Ov * (rc * (0.86 if human else 0.82)), [A * pr[0], Bv * pr[1], Ov * 0.004], 'Pupil', self.C['pupil'], ['head'], segs=12, rings=6)
            pv += [v for r in g for v in r]
            gl = e.get('glint', 0.0028)
            g = B.ellipsoid(cw + Ov * (rc * 0.97) + A * (ra * 0.12) + Bv * (rb * 0.35), [A * gl, Bv * gl, Ov * 0.0015], 'Glint', (1, 1, 1, 1), ['head'], segs=8, rings=4)
            pv += [v for r in g for v in r]
            self.parts['pupil'] += pv
            ei = len(self.eyes)
            self.eyes.append({'c': cw, 'A': A, 'B': Bv, 'O': Ov, 'r': (ra, rb, rc), 'side': side, 'pupil': pv})
            # まぶた: 目のまわりのレンズ形の殻。α（目頭→目じり 0〜π）と β（長い軸のまわり。0＝上・90＝前・180＝下）
            lid = e['lid']
            sc = lid.get('scale', 1.16)
            Ra, Rb, Rc = ra * sc, rb * sc + 0.002, rc * sc + 0.002
            na, nk = 16, 9
            for kind, start, edge in (('up', lid['up_start'], lid['up_open']), ('lo', lid['lo_start'], lid['lo_open'])):
                grid = []
                for ia in range(na + 1):
                    al = math.pi * ia / na
                    row = []
                    for ik in range(nk + 1):
                        k = ik / nk
                        be = math.radians(start + (edge - start) * k)
                        p = cw + A * Ra * math.cos(al) + (Bv * Rb * math.cos(be) + Ov * Rc * math.sin(be)) * math.sin(al)
                        v = B.bm.verts.new(p)
                        self.lids[v] = (ei, kind, al, k, False, start, edge, (Ra, Rb, Rc))
                        row.append(v)
                    # 縁の厚み（内側へ戻る 1 列）
                    be = math.radians(edge)
                    p = cw + A * Ra * 0.97 * math.cos(al) + (Bv * Rb * 0.9 * math.cos(be) + Ov * Rc * 0.9 * math.sin(be)) * math.sin(al)
                    v = B.bm.verts.new(p)
                    self.lids[v] = (ei, kind, al, 1.0, True, start, edge, (Ra, Rb, Rc))
                    row.append(v)
                    grid.append(row)
                ml, mk = B.mat('Lid' if kind == 'up' else 'LidLo'), B.mat('Lash')
                for ia in range(na):
                    for ik in range(nk + 1):
                        q = (grid[ia][ik], grid[ia + 1][ik], grid[ia + 1][ik + 1], grid[ia][ik + 1])
                        if kind == 'lo':
                            q = tuple(reversed(q))
                        if len(set(q)) < 4:
                            continue
                        f = B.bm.faces.new(q)
                        f.material_index = mk if ik >= nk - int(lid.get('lash_rows', 1)) else ml
                        for lp in f.loops:
                            lp[B.uv].uv = (0.5, 0.5)
                            lp[B.col] = self.C['lid']
                self.parts['lid'] += [v for r in grid for v in r]
            # 目じりの濃い線の「はね」（切れ長に見せる）。目じり＝長い軸の後ろ側（-A）
            ln = lid.get('liner')
            if ln:
                base = cw - A * Ra * 0.92 + Bv * Rb * ln.get('at', 0.25) + Ov * Rc * 0.35
                tip = base - A * ln['len'] + Bv * ln.get('up', 0.004) + Ov * 0.001
                self.parts['eye'] += B.blade(base, tip, ln.get('w', 0.0035), 0.0012, Ov, 'Lash', (1, 1, 1, 1), ['head'])
            # ほおの赤み（ふだんは皮の下）
            bl = fc.get('blush')
            if bl:
                Pb = V(self.skull_pt(bl['s'], bl['th'] if side > 0 else 360 - bl['th']))
                wb, cb, htb, _, _ = self.sk(bl['s'])
                nb = Vector((Pb.x, 0, (Pb.z - cb) * (wb / max(htb, 1e-4)))).normalized()
                tb = Vector((0, 1, 0))
                ub = nb.cross(tb).normalized()
                # 赤みの板は、ふだんは頭の中の 1 点に縮めておき、表情 blush で皮の上へ広げる（端がのぞかないように）
                cwb = self.H(Pb + nb * bl.get('lift', 0.0015))
                g = B.ellipsoid(cwb, [self.Hd(tb) * bl['r'][0], self.Hd(ub) * bl['r'][1], self.Hd(nb) * 0.002], 'Blush', self.C['blush'], ['head'], segs=12, rings=6)
                bv = [v for r in g for v in r]
                self.parts['blush'] += bv
                self.vec.setdefault('blush', {})
                hid = self.H(Pb - nb * 0.02)
                for v in bv:
                    tgt = v.co.copy()
                    v.co = hid + (tgt - cwb) * 0.05
                    self.vec['blush'][v] = tgt - v.co

    # ── まゆ（目の上の細長い鱗。表情で動く）──
    def build_brows(self):
        B, fc = self.B, self.fc
        br = fc.get('brow')
        if not br:
            return
        if br.get('mode') == 'eye':
            for e in self.eyes:
                c, A, Bv, Ov = e['c'], e['A'], e['B'], e['O']
                ra, rb, rc = e['r']
                pts = [c + A * ra * ka + Bv * rb * kb + Ov * rc * ko for ka, kb, ko in br['pts']]
                for i, (a, b) in enumerate(zip(pts, pts[1:])):
                    w = br['w'] * (br.get('taper', [1.0] * len(pts))[i])
                    # 前後の板と大きく重ねて、つぶつぶに見えないようにする
                    vs = B.blade(a - (b - a) * 0.35, b + (b - a) * 0.6, w, br.get('thick', 0.004), Ov, 'Brow', (1, 1, 1, 1), ['head'], curl=0.0)
                    self.parts.setdefault('brow', []).extend(vs)
            # 目のまわりの小さな鱗（目じりから後ろへ・目の下に沿って流れる）。目の座標: [A, B, O] の倍率で根元と先
            for e in self.eyes:
                c, A, Bv, Ov = e['c'], e['A'], e['B'], e['O']
                ra, rb, rc = e['r']
                for sp in br.get('rim', []):
                    b0 = c + A * ra * sp['at'][0] + Bv * rb * sp['at'][1] + Ov * rc * sp['at'][2]
                    t0 = c + A * ra * sp['to'][0] + Bv * rb * sp['to'][1] + Ov * rc * sp['to'][2]
                    vs = B.blade(b0, t0, sp.get('w', 0.006), 0.003, Ov, sp.get('mat', 'Brow'), (1, 1, 1, 1), ['head'], curl=sp.get('curl', 0.0))
                    self.parts.setdefault('brow', []).extend(vs)
            return
        for side in (1, -1):
            pts = []
            for (s, th) in br['line']:
                pts.append(V(self.skull_pt(s, th if side > 0 else 360 - th, inset=-br.get('lift', 0.004))))
            for a, b in zip(pts, pts[1:]):
                mid = (a + b) / 2
                w, c, ht, hb, _ = self.sk(mid.y)
                n = Vector((mid.x, 0, (mid.z - c) * (w / max(ht, 1e-4)))).normalized()
                vs = B.blade(self.H(a), self.H(b + (b - a) * 0.15), br.get('w', 0.013), br.get('thick', 0.005), self.Hd(n), 'Brow', (1, 1, 1, 1), ['head'], curl=0.0)
                self.parts.setdefault('brow', []).extend(vs)

    # ── 冠（額から首の後ろへ流れる刃）と角 ──
    def build_crown(self):
        B, fc = self.B, self.fc
        cr = fc['crown']
        self.crown_v = []
        cols = cr['colors']
        k = 0
        rng = B.rng
        for r, row in enumerate(cr['rows']):
            s = row['s']
            for th in row['th']:
                for side in ((1, -1) if th > 0 else (1,)):
                    thd = th if side > 0 else 360 - th
                    P = V(self.skull_pt(s, thd, inset=cr.get('inset', 0.06)))
                    w, c, ht, hb, _ = self.sk(s)
                    n = Vector((P.x, 0, (P.z - c) * (w / max(ht, 1e-4)))).normalized()
                    L = row['L'] * (1 - 0.25 * abs(th) / 90) * rng.uniform(0.9, 1.1)
                    d = (Vector((0, -1, 0)) * row.get('back', 1.0) + Vector((0, 0, 1)) * row.get('rise', 0.4) + n * row.get('out', 0.45)).normalized()
                    tip = P + d * L
                    flat = (n - d * n.dot(d)).normalized()
                    ci = row['tone'] if 'tone' in row else k % len(cols)   # 段ごとに色を決められる（前の段は白）
                    vs = B.blade(self.H(P), self.H(tip), L * row.get('w', 0.32), 0.008, self.Hd(flat), 'Crown%d' % ci, (1, 1, 1, 1), ['head'],
                                 curl=row.get('curl', -0.12))
                    self.crown_v += vs
                    k += 1
        for h in fc.get('horns', []):
            for side in (1, -1):
                base = V(h['base']); tip = V(h['tip']); bend = V(h.get('bend', (0, 0, 0)))
                base.x *= side; tip.x *= side; bend.x *= side
                self.crown_v += B.cone(self.H(base), self.H(tip), h['r'], 10, 'HornDark' if fc.get('horn_color') else 'Horn', (1, 1, 1, 1), ['head'], bend=self.Hd(bend))
        fl = fc.get('forelock')
        if fl:  # 額の真ん中の白いたてがみ（眉の間を頂点に、後ろへ V 字に広がる。人の前髪のように頭に沿って寝る）
            for row in fl['rows']:
                s_, ths, L = row['s'], row['th'], row['L']
                for th in ths:
                    for side in ((1, -1) if th > 0 else (1,)):
                        thd = th if side > 0 else 360 - th
                        P = V(self.skull_pt(s_, thd, inset=-fl.get('lift0', 0.02)))
                        th2 = th * fl.get('spread', 1.25) + (fl.get('fan', 6) if th > 0 else 0)
                        T = V(self.skull_pt(s_ - L, th2 if side > 0 else 360 - th2, inset=-fl.get('lift1', 0.12)))
                        w_, c_, ht_, hb_, _ = self.sk(s_)
                        n = Vector((P.x, 0, (P.z - c_) * (w_ / max(ht_, 1e-4)))).normalized()
                        vs = B.blade(self.H(P), self.H(T), L * row.get('w', fl.get('w', 0.55)), 0.006, self.Hd(n),
                                     'Crown%d' % row.get('tone', 2), (1, 1, 1, 1), ['head'], curl=fl.get('curl', 0.15))
                        self.crown_v += vs
        for sp in fc.get('jaw_spikes', []):  # あごのラインに沿って後ろへ流れるとげ（下あごと一緒に動く）
            for side in (1, -1):
                P = V(self.jaw_pt(sp['s'], sp['th'] if side > 0 else 360 - sp['th']))
                P = P - Vector((side * 0.004, 0, 0))
                tip = P + Vector((side * sp.get('out', 0.02), -sp['L'], -sp.get('down', 0.01)))
                flat = Vector((side, 0, -0.35)).normalized()   # 板を縦に立てる（横から面が見える）
                vs = B.blade(self.H(P), self.H(tip), sp['L'] * sp.get('w', 0.32), 0.005, self.Hd(flat), 'Crown%d' % sp.get('tone', 2), (1, 1, 1, 1), ['jaw'],
                             curl=sp.get('curl', -0.1))
                self.parts['tooth_lo'] += vs     # 下あごの部品として、あごの骨と開く動きに乗せる
        for ch in fc.get('cheek_blades', []):  # ほおから後ろへ流れる白い刃
            for side in (1, -1):
                P = V(self.skull_pt(ch['s'], ch['th'] if side > 0 else 360 - ch['th'], inset=0.05))
                tip = P + Vector((side * ch['out'], -ch['L'], ch.get('rise', 0.0)))
                n = Vector((side, 0, 0))
                self.crown_v += B.blade(self.H(P), self.H(tip), ch['L'] * ch.get('w', 0.3), 0.006, self.Hd(n), 'Crown%d' % ch.get('tone', 2), (1, 1, 1, 1), ['head'],
                                        curl=ch.get('curl', 0.1))

    # ── 表情で動かす場所（やわらかい範囲）──
    def build_regions(self):
        fc = self.fc
        cand = self.parts['skull'] + self.parts['jaw'] + self.parts.get('brow', [])
        cand = [v for v in cand if v.is_valid]
        for name, rg in fc['regions'].items():
            for side, suf in ((1, '_L'), (-1, '_R')):
                if 'eye_rel' in rg and self.eyes:
                    e = self.eyes[0 if side > 0 else 1]
                    ka, kb = rg['eye_rel']
                    cw = e['c'] + e['A'] * e['r'][0] * ka + e['B'] * e['r'][1] * kb + e['O'] * e['r'][2] * 0.8
                elif 'pt' in rg:
                    p = list(rg['pt'])
                    p[0] *= side
                    cw = self.H(p)
                else:
                    cw = self.H(self.skull_pt(rg['s'], rg['th'] if side > 0 else 360 - rg['th']))
                R = rg['r']
                wmap = {}
                for v in cand:
                    d = (v.co - cw).length
                    if d < R:
                        wmap[v] = (1 - (d / R) ** 2) ** 2
                if rg.get('with_lids'):     # まゆを下げると上まぶたも少し下がる
                    for v in self.lids:
                        d = (v.co - cw).length
                        if d < R * 1.1:
                            wmap[v] = 0.5 * (1 - (d / (R * 1.1)) ** 2) ** 2
                self.regions[name + suf] = (wmap, side)

    # ── bmesh の頂点 → 番号（finish で呼ぶ）──
    def to_index(self):
        def ix(v):
            return v.index if v.is_valid else None
        out = {'parts': {k: [ix(v) for v in vs if v.is_valid] for k, vs in self.parts.items()},
               'lids': {ix(v): t for v, t in self.lids.items() if v.is_valid},
               'eyes': [dict(e, pupil=[ix(v) for v in e['pupil'] if v.is_valid]) for e in self.eyes],
               'regions': {k: ({ix(v): w for v, w in m.items() if v.is_valid}, sd) for k, (m, sd) in self.regions.items()},
               'blush': {ix(v): d for v, d in self.vec.get('blush', {}).items() if v.is_valid},
               'hinge': (self.H(self.fc['hinge']), self.Hd((1, 0, 0)).normalized()),
               'R': self.R, 'O': self.O}
        return out


def mix(a, b, f):
    return tuple(x + (y - x) * f for x, y in zip(a, b))


def lid_pos(e, t, edge):
    """まぶたの頂点の位置（縁の角度を edge にしたとき）"""
    ei, kind, al, k, inner, start, edge0, (Ra, Rb, Rc) = t
    c, A, Bv, Ov = e['c'], e['A'], e['B'], e['O']
    if inner:
        be = math.radians(edge)
        return c + A * Ra * 0.97 * math.cos(al) + (Bv * Rb * 0.9 * math.cos(be) + Ov * Rc * 0.9 * math.sin(be)) * math.sin(al)
    be = math.radians(start + (edge - start) * k)
    return c + A * Ra * math.cos(al) + (Bv * Rb * math.cos(be) + Ov * Rc * math.sin(be)) * math.sin(al)


def face_shape(base, F, fc, ex):
    """1 つの表情の頂点の位置（base は全頂点の元の位置のリスト）。ex の値:
      lid_u / lid_l: 0〜1（上まぶたを閉じる・下まぶたを上げる。負の lid_u で見開く）、_L/_R で片目だけ
      jaw: あごを開く角度（度）／brow_in・brow_out・corner・snarl・cheek・nostril: [横(外が +), 前, 上]（m）
      look: [横, 上]（瞳を動かす。1 で約 7 mm）／blush: 0〜1"""
    co = list(base)
    lidc = fc['eye']['lid']
    eyes = F['eyes']

    def val(key, side):
        sfx = '_L' if side > 0 else '_R'
        return ex.get(key + sfx, ex.get(key, 0.0))

    # まぶた
    for vi, t in F['lids'].items():
        if vi is None:
            continue
        e = eyes[t[0]]
        if t[1] == 'up':
            u = float(val('lid_u', e['side']))
            closed = lidc.get('up_closed', 112)
            edge = t[6] + (closed - t[6]) * u if u >= 0 else t[6] + (t[6] - lidc.get('up_wide', 18)) * u
        else:
            l_ = float(val('lid_l', e['side']))
            closed = lidc.get('lo_closed', 116)
            edge = t[6] + (closed - t[6]) * l_ if l_ >= 0 else t[6] + (t[6] - lidc.get('lo_wide', 160)) * l_
        co[vi] = lid_pos(e, t, edge)
    # 瞳の向き
    for e in eyes:
        lk = ex.get('look')
        if not lk:
            continue
        d = Vector((lk[0] * 0.007, 0, lk[1] * 0.006))
        d = F['R'] @ Vector((d.x, 0, d.z))
        d = d - e['O'] * d.dot(e['O'])
        for vi in e['pupil']:
            co[vi] = co[vi] + d
    # やわらかい範囲
    for name in ('brow_in', 'brow_out', 'corner', 'snarl', 'cheek', 'nostril', 'lip_lo'):
        for sfx, side in (('_L', 1), ('_R', -1)):
            dv = ex.get(name + sfx, ex.get(name))
            if not dv or (name + sfx) not in F['regions']:
                continue
            wmap, sd = F['regions'][name + sfx]
            d = F['R'] @ Vector((dv[0] * sd, -dv[1], dv[2]))
            for vi, w in wmap.items():
                if vi is not None:
                    co[vi] = co[vi] + d * w
    # あご
    jd = float(ex.get('jaw', 0.0))
    if jd:
        hp, ax = F['hinge']
        rot = Matrix.Rotation(math.radians(jd), 3, ax)
        for part in ('jaw', 'tooth_lo', 'tongue'):
            for vi in F['parts'][part]:
                co[vi] = hp + rot @ (co[vi] - hp)
    # ほおの赤み
    b = float(ex.get('blush', 0.0))
    if b:
        for vi, d in F['blush'].items():
            if vi is not None:
                co[vi] = co[vi] + d * b
    return co


def make_face_morphs(ob, cfg, F):
    me = ob.data
    base = [v.co.copy() for v in me.vertices]
    fc = cfg['face']
    kb = ob.shape_key_add(name='blink')
    for i, c in enumerate(face_shape(base, F, fc, {'lid_u': 1.0, 'lid_l': 0.25})):
        kb.data[i].co = c
    for name, ex in cfg.get('expressions', {}).items():
        kb = ob.shape_key_add(name=name)
        for i, c in enumerate(face_shape(base, F, fc, ex)):
            kb.data[i].co = c


def make_face_texture(cfg, size=1024):
    """顔の専用の肌（表情リストの絵: 上は明るい青・目の下から下あごまで白・とても細かくなめらかな鱗）。
    上半分（v 0.5〜1）＝頭骨、下半分（v 0〜0.5）＝下あご。u＝まわりの角度（0＝上・0.5＝下）。戻り値 (色, 高さ)"""
    import numpy as np
    fc = cfg['face']
    ft = fc['face_tex']
    g, j = fc['skull'], fc['jaw']

    def lin(h):
        h = h.lstrip('#')
        c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]   # sRGB → 線形（あとで sRGB に戻す）
        return np.array(c)
    blue, blue2, white, inner = lin(ft['blue']), lin(ft.get('blue_top', ft['blue'])), lin(ft['white']), lin(ft['inner'])
    H, W = size, size
    y, x = np.mgrid[0:H, 0:W]
    v = 1 - (y + 0.5) / H          # 画像の上が v=1（Blender の画像は下から）。下で上下を合わせる
    u = (x + 0.5) / W
    th = u * 360.0
    thf = np.where(th <= 180, th, 360 - th)
    skull = v >= 0.5
    # 頭骨: 前後の位置 s
    s_sk = g['s0'] + (g['s1'] - g['s0']) * np.clip((v - 0.5) / 0.5, 0, 1)
    wl = ft['white_th']             # [[s, 角度]] ここより下（角度が大きい）が白
    th_w = np.interp(s_sk, [a for a, _ in wl], [b for _, b in wl])
    fw = np.clip((thf - th_w) / ft.get('soft', 14.0) + 0.5, 0, 1)
    fw = fw * fw * (3 - 2 * fw)
    ftop = np.clip(1 - thf / 70.0, 0, 1)             # てっぺんは少し濃い青
    col_sk = blue[None, None, :] * (1 - ftop[..., None]) + blue2[None, None, :] * ftop[..., None]
    col_sk = col_sk * (1 - fw[..., None]) + white[None, None, :] * fw[..., None]
    col_sk = np.where((thf > ft.get('palate', 158))[..., None], inner[None, None, :], col_sk)
    # 下あご
    col_j = np.where((thf < ft.get('jaw_inner', 32))[..., None], inner[None, None, :], white[None, None, :] * np.ones((H, W, 1)))
    col = np.where(skull[..., None], col_sk, col_j)
    # 口の線（くちびるの縁の濃い線）: 上あごは下の縁、下あごは上の縁
    ll = ft.get('lip_line')
    if ll:
        lc = lin(ll['color'])
        m_sk = np.clip(1 - np.abs(thf - ll['skull']) / ll.get('w', 4.0), 0, 1) * skull
        m_j = np.clip(1 - np.abs(thf - ll['jaw']) / ll.get('w', 4.0), 0, 1) * (~skull)
        m = np.clip(m_sk + m_j, 0, 1)[..., None]
        col = col * (1 - m) + lc[None, None, :] * m
    # 細かい鱗（重なった菱形）。まわり ncol 枚・前後 nrow 枚（頭骨と下あごで同じ数）
    ncol, nrow = ft.get('cols', 72), ft.get('rows', 64)
    vv = np.where(skull, (v - 0.5) / 0.5, v / 0.5)
    gy = vv * nrow
    row = np.floor(gy)
    gx = u * ncol + (row % 2) * 0.5
    fx = gx - np.floor(gx) - 0.5
    fy = gy - row
    d = np.abs(fx) * 1.0 + np.abs(fy - 0.45) * 0.9
    inside = d < 0.5
    dome = np.clip(1 - (d / 0.5) ** 2, 0, 1)
    edge = np.clip(1 - np.abs(d - 0.5) / 0.08, 0, 1)
    k = ft.get('contrast', 0.12)
    shade = 1 - k + k * dome - k * 0.8 * edge
    rnd = np.sin(row * 12.99 + np.floor(gx) * 78.23) * 43758.5
    rnd = rnd - np.floor(rnd)
    shade = shade * (1 + (rnd - 0.5) * 0.05)
    col = np.clip(col * shade[..., None], 0, 1)
    srgb = np.where(col <= 0.0031308, col * 12.92, 1.055 * np.power(col, 1 / 2.4) - 0.055)
    px = np.ones((H, W, 4), dtype=np.float32)
    px[..., :3] = srgb
    px = px[::-1].copy()            # Blender の画像は下の行から
    hmap = (np.where(inside, 0.3 + 0.7 * dome, 0.0))[::-1].copy()
    return px, hmap
