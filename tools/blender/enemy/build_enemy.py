# -*- coding: utf-8 -*-
"""
境界侵食 P17：異形（帰路・閉店・収容者）の体を Blender（bpy・頭なし）で作り直す。前はコードの組み立て（shinshoku/actor/models.js の SkinBody：
管と箱の積み重ね）だった。ここでは：
  形   SDF（なめらかにつないだ基本の形：tools/blender/char/sdf.py）→ 表面の取り出し（surface nets）→ 間引き（Blender の Decimate）→ 面へ寄せる・SDF の勾配の法線
  色   部品ごとの色の関数（縫い目・ボタン・柄・さび・しわ）× SDF の遮り（AO：全部の部品の和の距離で測る）
  骨   コードの異形と同じ骨（tools/shinshoku/dump_enemy_rig.mjs が書いた rigs/<kind>.json：休みの姿勢・世界の位置）
       → ゲームの動き（shinshoku/actor/anim.js の kiroPose など）・弱点・光る目・顔の札（faceMesh）はそのまま使える
  重み 骨の線分への近さ（部品ごとに使ってよい骨を決める）・コートのすそはコードと同じ「腰と太もも」の混ぜ・小物は 1 本の骨
出る物：shinshoku/assets/enemies/<kind>.pack.json（wakaba-enemypack/1：部品ごとの position・normal・color（線形）・joints・weights・index・
材質の種類（cloth／skin／hair／metal／acc／glow）・輪郭線の太さ（oth）・置く時の色の印（tint：帰路のマフラー＝家の戸の灯りの色））
読むのは shinshoku/actor/enemypack.js（コードの異形の網を差し替える。読めない時・?epack=0 はコードの形のまま）。
意匠は独自（グロテスクにしない：人とモノが混ざった姿・顔は形を失っている／札で隠れる）。
  python tools/blender/enemy/build_enemy.py [--only kiro] [--out shinshoku/assets/enemies] [--lod pc|low]
座標は glTF：Y 上・+Z 前・+X がキャラクターの左・m。
"""
import base64
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'char'))
import numpy as np  # noqa: E402

import sdf as S  # noqa: E402
import meshops as MO  # noqa: E402
from rig import seg_dist  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))


def lin(h):
    """#rrggbb（sRGB）→ 線形の色"""
    c = np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rotx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def roty(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rotz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def U(*fs, k=0.0):
    return S.union(*fs, k=k)


def hash3(P, seed=0):
    """なめらかな雑音（いくつかの sin の和：-1..1）"""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    s = seed * 1.7
    return (np.sin(x * 17.1 + y * 5.3 + s) * np.sin(y * 13.7 - z * 7.9 + s * 2) + 0.5 * np.sin(z * 29.3 + x * 11.1 - s) * np.sin(y * 23.9 + s)) / 1.5


class Part:
    def __init__(self, name, f, lo, hi, h, mat='cloth', color=None, weights='body', bones=None, oth=1.0, faces=2000, sym=True, tint=False, ao=True):
        self.name, self.f, self.lo, self.hi, self.h = name, f, np.asarray(lo, float), np.asarray(hi, float), h
        self.mat, self.color, self.weights, self.bones, self.oth, self.faces, self.sym, self.tint, self.ao = mat, color, weights, bones, oth, faces, sym, tint, ao


# ───────────────────────── 重み
def weights_for(P, part, rig):
    names = [b['name'] for b in rig['bones']]
    pos = {b['name']: np.array(b['pos']) for b in rig['bones']}
    kids = {}
    for b in rig['bones']:
        if b['parent'] >= 0:
            kids.setdefault(names[b['parent']], []).append(b['name'])

    def seg(n):
        a = pos[n]
        tail = {'leftHand': np.array([0, -0.12, 0]), 'rightHand': np.array([0, -0.12, 0]), 'leftFoot': np.array([0, -0.03, 0.12]), 'rightFoot': np.array([0, -0.03, 0.12]),
                'head': np.array([0, 0.2, 0])}.get(n)
        if tail is not None:
            return a, a + tail
        main = [k for k in kids.get(n, []) if k not in ('eyeL', 'eyeR', 'mouth')]
        if n == 'chest':
            main = ['neck']
        if n == 'hips':
            main = ['spine']
        return a, pos[main[0]] if main else a + np.array([0, 0.05, 0])
    n = len(P)
    J = np.zeros((n, 4), np.int64)
    W = np.zeros((n, 4))
    w = part.weights
    if isinstance(w, tuple) and w[0] == 'rigid':
        J[:, 0] = names.index(w[1])
        W[:, 0] = 1
        return J, W
    if w == 'skirt':                                               # コートのすそ（コードの skirtW と同じ考え）：上は腰、下へ行くほど左右の太もも
        hy = pos['hips'][1]
        k = S.smoothstep(hy, hy - 0.45, P[:, 1]) * 0.62
        wl = S.smoothstep(-0.03, 0.06, P[:, 0]) * k
        wr = S.smoothstep(0.03, -0.06, P[:, 0]) * k
        J[:, 0], J[:, 1], J[:, 2] = names.index('hips'), names.index('leftUpperLeg'), names.index('rightUpperLeg')
        W[:, 0], W[:, 1], W[:, 2] = 1 - wl - wr, wl, wr
        return J, W
    bl = part.bones
    D = np.stack([seg_dist(P, *seg(b))[0] for b in bl], -1)
    Wf = 1.0 / np.maximum(D + 0.015, 1e-4) ** 5
    order = np.argsort(-Wf, axis=1)[:, :4]
    for k in range(min(4, len(bl))):
        J[:, k] = [names.index(bl[i]) for i in order[:, k]]
        W[:, k] = np.take_along_axis(Wf, order[:, k:k + 1], 1)[:, 0]
    W /= np.maximum(W.sum(1), 1e-9)[:, None]
    W[W < 0.02] = 0
    W /= np.maximum(W.sum(1), 1e-9)[:, None]
    return J, W


# ───────────────────────── 網
def mesh_part(p, lod):
    h = p.h * (1.0 if lod == 'pc' else 1.4)
    V, Q = S.surface_nets(p.f, p.lo, p.hi, h)
    if not len(Q):
        raise RuntimeError('空の部品：' + p.name)
    m = MO.Mesh(V, Q)
    target = p.faces * (1.0 if lod == 'pc' else 0.5)
    if m.ntris() > target:
        m = MO.decimate(m, target / max(1, 2 * len(m.F)), symmetry=p.sym, triangulate=True)
    T = m.tris()
    V = S.project(p.f, m.V, iters=3)
    N = S.normals(p.f, V)
    return V, T, N


def sdf_ao(fall, V, N):
    ao = np.zeros(len(V))
    for i, d in enumerate((0.02, 0.05, 0.1, 0.18)):
        ao += np.clip((d - fall(V + N * d)) / d, 0, 1) * (0.5 ** i)
    return np.clip(1 - ao * 0.55, 0.42, 1.0)


def b64(a, dt):
    return base64.b64encode(np.ascontiguousarray(np.asarray(a).astype(dt)).tobytes()).decode('ascii')


def build(kind, lod, out):
    rig = json.load(open(os.path.join(HERE, 'rigs', kind + '.json')))
    parts = DESIGNS[kind](rig)
    fall = U(*[p.f for p in parts if p.ao])
    prims = []
    tri = 0
    t0 = time.time()
    for p in parts:
        V, T, N = mesh_part(p, lod)
        C = p.color(V, N) if callable(p.color) else np.tile(lin(p.color), (len(V), 1))
        if p.ao:
            C = C * sdf_ao(fall, V, N)[:, None]
        J, W = weights_for(V, p, rig)
        J = np.where(W > 0, J, 0)
        prims.append({'name': p.name, 'mat': p.mat, 'oth': p.oth, 'tint': bool(p.tint), 'count': int(len(V)), 'tris': int(len(T)),
                      'position': b64(V, '<f4'), 'normal': b64(N, '<f4'), 'color': b64(C, '<f4'), 'joints': b64(J, '<u2'), 'weights': b64(W, '<f4'),
                      'index': b64(T.reshape(-1), '<u4' if len(V) > 65535 else '<u2'), 'indexType': 'u32' if len(V) > 65535 else 'u16'})
        tri += len(T)
        print('  %-14s %6d tris  %5.1fs' % (p.name, len(T), time.time() - t0), flush=True)
    pack = {'spec': 'wakaba-enemypack/1', 'kind': kind, 'lod': lod, 'generator': 'tools/blender/enemy/build_enemy.py', 'license': 'own（自作・商用可）',
            'bones': [b['name'] for b in rig['bones']], 'classes': sorted({p['mat'] for p in prims}), 'tris': int(tri), 'parts': prims}
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, kind + ('' if lod == 'pc' else '_low') + '.pack.json')
    json.dump(pack, open(path, 'w'))
    print('%s %s：%d 三角形・%d 部品・%.0f KB' % (kind, lod, tri, len(prims), os.path.getsize(path) / 1024), flush=True)
    return pack


# ───────────────────────── 意匠
def B(rig, n):
    for b in rig['bones']:
        if b['name'] == n:
            return np.array(b['pos'], float)
    raise KeyError(n)


def limb(a, b, r0, r1):
    return S.round_cone(a, b, r0, r1)


def legs(rig, r, color, shoe, sole, knee_k=0.02, cuff=None):
    """左右の脚（ズボン）と靴。r=(太もも, ひざ, すね, 足首)"""
    out = []
    for s in ('left', 'right'):
        hp, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        f = U(limb(hp + [0, 0.02, 0], kn, r[0], r[1]), limb(kn, ft + [0, 0.07, 0], r[2], r[3]), k=knee_k)
        sx = 1 if s == 'left' else -1

        def col(V, N, color=color, kn=kn, sx=sx):
            c = np.tile(lin(color), (len(V), 1))
            crease = np.exp(-((V[:, 0] - kn[0]) * 30) ** 2) * (V[:, 2] > 0) * 0.12           # 前の折り目
            c *= (1 + crease)[:, None]
            if cuff:
                c[V[:, 1] < 0.14] = lin(cuff)
            return c
        out.append(Part(s + '_leg', f, [hp[0] - 0.25, ft[1] - 0.05, -0.25], [hp[0] + 0.25, hp[1] + 0.12, 0.25], 0.008, 'cloth', col, 'body',
                        [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=900, sym=False))
        shoe_f = U(S.box(ft + [0, 0.035, 0.05], [r[3] + 0.005, 0.04, 0.12], r=0.035), S.ellipsoid(ft + [0, 0.05, 0.13], [r[3] * 0.95, 0.045, 0.07]), k=0.03)

        def scol(V, N):
            c = np.tile(lin(shoe), (len(V), 1))
            c[V[:, 1] < 0.022] = lin(sole)
            return c
        out.append(Part(s + '_shoe', shoe_f, ft + [-0.12, -0.06, -0.12], ft + [0.12, 0.12, 0.26], 0.006, 'acc', scol, ('rigid', s + 'Foot'), oth=0.8, faces=500, sym=False))
    return out


def hand(rig, side, scale, color, long_fingers=False, curl=0.35):
    """手（手のひら＋指 4＋親指）：手首の骨の下へ。指は少し曲げる"""
    w = B(rig, side + 'Hand')
    sx = 1 if side == 'left' else -1
    L = 0.045 * scale * (1.35 if long_fingers else 1.0)
    palm = S.box(w + [0, -0.05 * scale, 0.005], [0.022 * scale, 0.045 * scale, 0.04 * scale], r=0.018 * scale)
    fs = [palm]
    for k, dz in enumerate((-0.027, -0.009, 0.009, 0.027)):
        base = w + np.array([0, -0.09 * scale, dz * scale])
        l = L * (0.92, 1.0, 0.97, 0.82)[k]
        mid = base + np.array([sx * 0.006, -l * 0.55, 0.0])
        tip = mid + np.array([sx * l * 0.35 * curl, -l * 0.45, 0.0])
        fs.append(S.round_cone(base, mid, 0.0085 * scale, 0.0075 * scale))
        fs.append(S.round_cone(mid, tip, 0.0075 * scale, 0.006 * scale))
    th0 = w + np.array([sx * 0.01, -0.04 * scale, 0.035 * scale])
    fs.append(S.round_cone(th0, th0 + np.array([sx * 0.012, -0.045 * scale, 0.025 * scale]), 0.01 * scale, 0.0075 * scale))
    f = U(*fs, k=0.008 * scale)
    return Part(side + '_hand', f, w + np.array([-0.08, -0.22, -0.09]) * max(1, scale), w + np.array([0.08, 0.03, 0.09]) * max(1, scale), 0.0035 * scale, 'skin', color,
                ('rigid', side + 'Hand'), oth=0.7, faces=900, sym=False)


def kiro(rig):
    """帰路：家に帰る途中の住人。のっぺりした顔（黒いにじみは顔の札＝コードの faceMesh）・長い首と腕・ひざまでのコート（立てたえり・
    前の合わせ・ボタン・ポケットのふた・ベルト）・マフラー（家の戸の灯りの色＝置く時の色）・買い物袋（ねぎ）・細長い指"""
    COAT, COAT2, SKIN, PANTS = 0x3d4656, 0x2a303c, 0xd6d9e0, 0x262a33
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    hc = np.array([0, 1.632, 0.0])
    P = []
    # 頭：卵形・あごは細く・目のくぼみ（浅い）・鼻のなごり
    head = U(S.ellipsoid(hc, [0.096, 0.118, 0.105]), S.ellipsoid(hc + [0, -0.06, 0.025], [0.07, 0.06, 0.078]), k=0.04)
    head = S.sub(head, U(S.ellipsoid(hc + [0.038, 0.0, 0.1], [0.024, 0.016, 0.02]), S.ellipsoid(hc + [-0.038, 0.0, 0.1], [0.024, 0.016, 0.02])), k=0.012)
    head = U(head, S.ellipsoid(hc + [0, -0.03, 0.1], [0.012, 0.022, 0.012]), k=0.015)

    def skin_col(V, N):
        c = np.tile(lin(SKIN), (len(V), 1))
        c *= (0.94 + 0.06 * hash3(V * 3, 1))[:, None]
        return c
    P.append(Part('head', head, hc - 0.16, hc + 0.16, 0.0035, 'skin', skin_col, ('rigid', 'head'), oth=1.0, faces=1600))
    def hair_col(V, N):
        c = np.tile(lin(0x3a3a42), (len(V), 1))
        c *= (0.8 + 0.25 * np.abs(np.sin(V[:, 0] * 160 + V[:, 2] * 40)))[:, None]   # 毛の流れの筋
        return c
    hair = S.inter(S.offset(S.ellipsoid(hc + [0, 0.008, -0.006], [0.096, 0.118, 0.105]), 0.008),
                   lambda Q: -(Q[:, 1] - (hc[1] + 0.055 + 0.03 * np.clip(Q[:, 2] - hc[2], 0, 1) * 10 - 0.75 * np.maximum(0, -(Q[:, 2] - hc[2])))))   # 後退した生え際（前は高く・後ろは首まで）
    P.append(Part('hair', hair, hc - 0.17, hc + 0.17, 0.0035, 'hair', hair_col, ('rigid', 'head'), oth=1.0, faces=1100))
    # 首（長い）
    P.append(Part('neck', S.round_cone(nk + [0, -0.04, -0.005], hc + [0, -0.08, -0.01], 0.036, 0.033), nk - 0.1, hc + 0.05, 0.004, 'skin', SKIN, 'body', ['neck', 'head', 'chest'], faces=400))
    # コートの胴（肩・胸・腰）
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    torso = U(S.ellipsoid(ch + [0, 0.07, -0.005], [0.155, 0.17, 0.105]), S.ellipsoid(sp + [0, 0.04, 0.0], [0.13, 0.13, 0.095]),
              S.capsule(sh_l + [-0.03, 0.0, -0.005], sh_r + [0.03, 0.0, -0.005], 0.062), S.ellipsoid(hp + [0, 0.0, -0.006], [0.14, 0.09, 0.1]), k=0.06)

    def coat_col(V, N, seam_y=None):
        c = np.tile(lin(COAT), (len(V), 1))
        front = V[:, 2] > 0.04
        c[front & (np.abs(V[:, 0] - 0.018) < 0.006)] = lin(COAT2)                       # 前の合わせ
        belt = np.abs(V[:, 1] - 1.0) < 0.022
        c[belt] = lin(0x2c323e)
        c *= (0.93 + 0.07 * hash3(V * 2.2, 3))[:, None]                                  # 布の濃淡
        c *= (1 - 0.18 * np.clip((np.sin(V[:, 0] * 55 + V[:, 1] * 9) - 0.6) * 2, 0, 1) * (V[:, 1] < 1.05))[:, None]   # 下のしわ
        return c
    lap = U(*[S.box(ch + [sx * 0.06, 0.13, 0.093], [0.045, 0.1, 0.008], r=0.004, rot=rotz(sx * 0.35) @ rotx(-0.25)) for sx in (1, -1)])
    P.append(Part('lapels', lap, ch + [-0.16, -0.05, 0.0], ch + [0.16, 0.32, 0.2], 0.0035, 'cloth', COAT2, 'body', ['chest', 'neck', 'spine'], oth=0.7, faces=500))
    belt = S.inter(S.sub(S.offset(torso, 0.008), S.offset(torso, -0.004)), lambda Q: np.abs(Q[:, 1] - 1.0) - 0.022)
    P.append(Part('belt', belt, [-0.25, 0.94, -0.2], [0.25, 1.06, 0.2], 0.004, 'cloth', 0x232833, 'body', ['spine', 'hips', 'chest'], oth=0.6, faces=700))
    P.append(Part('coat', torso, [-0.3, 0.84, -0.2], [0.3, 1.5, 0.2], 0.006, 'cloth', coat_col, 'body', ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2400))
    # すそ（ひざまで：前が少し開く）
    skirt_shell = S.inter(S.round_cone(hp + [0, 0.02, -0.006], hp + [0, -0.46, -0.004], 0.148, 0.212), lambda Q: Q[:, 1] - (hp[1] + 0.04))
    skirt_f = S.inter(S.sub(skirt_shell, S.round_cone(hp + [0, 0.12, -0.006], hp + [0, -0.56, -0.004], 0.132, 0.198)), lambda Q: (hp[1] - 0.47) - Q[:, 1])
    skirt_f = lambda Q, f0=skirt_f: f0(Q) - 0.004 * np.sin(np.arctan2(Q[:, 0], Q[:, 2]) * 9) * S.smoothstep(hp[1] - 0.05, hp[1] - 0.45, Q[:, 1])   # すその縦のしわ
    skirt_f = S.sub(skirt_f, S.box(hp + [0, -0.32, 0.2], [0.01, 0.17, 0.1], r=0.003))

    def skirt_col(V, N):
        c = coat_col(V, N)
        hem = V[:, 1] < hp[1] - 0.44
        c[hem] = lin(COAT2)
        for sx in (1, -1):                                                                # ポケットのふた
            m = (np.abs(V[:, 0] - sx * 0.12) < 0.05) & (np.abs(V[:, 1] - (hp[1] - 0.12)) < 0.012) & (V[:, 2] > 0)
            c[m] = lin(COAT2)
        return c
    P.append(Part('skirt', skirt_f, [-0.3, hp[1] - 0.5, -0.25], [0.3, hp[1] + 0.06, 0.25], 0.006, 'cloth', skirt_col, 'skirt', oth=0.9, faces=1800))
    # ボタン（4 つ）
    btn = U(*[S.cylinder([0.045, y, z], 0.011, 0.004, rr=0.002, axis_rot=rotx(math.pi / 2)) for y, z in ((1.3, 0.103), (1.18, 0.1), (1.06, 0.092), (0.9, 0.11))])
    P.append(Part('buttons', btn, [-0.02, 0.85, 0.05], [0.08, 1.35, 0.14], 0.0025, 'acc', 0x1a1c22, 'body', ['spine', 'chest', 'hips'], oth=0.0, faces=300, sym=False, ao=False))
    # 立てたえり
    collar = S.inter(S.sub(S.round_cone(nk + [0, -0.07, -0.01], nk + [0, 0.02, -0.015], 0.078, 0.085), S.round_cone(nk + [0, -0.1, -0.01], nk + [0, 0.06, -0.015], 0.062, 0.07)),
                     lambda Q: np.maximum(-(Q[:, 1] - (nk[1] - 0.07)), Q[:, 1] - (nk[1] + 0.02)))
    P.append(Part('collar', collar, nk - 0.14, nk + 0.1, 0.004, 'cloth', COAT2, 'body', ['neck', 'chest'], oth=0.8, faces=700))
    # 袖（長い腕）・手（細長い指）
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        f = U(limb(ua + [0, 0.01, 0], la, 0.05, 0.043), limb(la, ha + [0, 0.03, 0], 0.043, 0.038), k=0.02)

        def scol(V, N, ha=ha):
            c = np.tile(lin(COAT), (len(V), 1))
            c[V[:, 1] < ha[1] + 0.07] = lin(COAT2)
            c *= (0.93 + 0.07 * hash3(V * 2.5, 5))[:, None]
            return c
        P.append(Part(s + '_sleeve', f, ua - [0.12, 0.75, 0.12], ua + [0.12, 0.1, 0.12], 0.005, 'cloth', scol, 'body', [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=900, sym=False))
        P.append(hand(rig, s, 1.18, SKIN, long_fingers=True, curl=0.5))
    P += legs(rig, (0.07, 0.052, 0.054, 0.038), PANTS, 0x1a1a1f, 0x30303a)
    # マフラー（置く時の色：tint）・前へ垂れる端（白い房）
    scarf = U(S.torus(nk + [0, 0.035, 0.0], 0.072, 0.03), S.round_cone(nk + [-0.045, 0.01, 0.075], nk + [-0.06, -0.27, 0.105], 0.034, 0.03), k=0.02)
    scarf = U(scarf, S.box(nk + [-0.06, -0.12, 0.093], [0.034, 0.15, 0.01], r=0.008, rot=rotx(-0.12)), k=0.01)

    def scarf_col(V, N):
        c = np.ones((len(V), 3)) * 0.92
        c *= (0.88 + 0.12 * (np.sin(V[:, 1] * 140) > 0))[:, None]                          # 編み目の筋
        c[V[:, 1] < nk[1] - 0.25] = 1.6                                                    # 房（白：tint の外）
        return c
    P.append(Part('scarf', scarf, nk - [0.16, 0.34, 0.14], nk + [0.14, 0.12, 0.16], 0.004, 'cloth', scarf_col, 'body', ['neck', 'chest'], oth=0.8, faces=1100, sym=False, tint=True))
    # 買い物袋（左手）：袋・持ち手・ねぎ・牛乳のパック
    lh = B(rig, 'leftHand')
    bag = S.box(lh + [0.01, -0.26, 0.0], [0.11, 0.13, 0.05], r=0.02)
    bag = U(bag, S.torus(lh + [0.01, -0.12, 0.0], 0.05, 0.006, axis=(0, 0, 1)), k=0.004)
    onion = U(S.capsule(lh + [0.05, -0.18, 0.015], lh + [0.075, 0.0, 0.03], 0.011), S.capsule(lh + [0.04, -0.18, 0.0], lh + [0.07, -0.02, 0.0], 0.01))
    bag_f = S.sub(bag, S.box(lh + [0.01, -0.12, 0.0], [0.1, 0.012, 0.045], r=0.006))

    def bag_col(V, N):
        c = np.tile(lin(0xe8e2d0), (len(V), 1))
        c[(np.abs(V[:, 1] - (lh[1] - 0.24)) < 0.03) & (np.abs(V[:, 0] - lh[0]) < 0.06)] = lin(0xc84a3a)    # 店の印（赤い丸ではなく帯）
        return c
    P.append(Part('bag', bag_f, lh - [0.15, 0.42, 0.1], lh + [0.17, 0.0, 0.1], 0.004, 'acc', bag_col, ('rigid', 'leftHand'), oth=0.8, faces=800, sym=False))

    def onion_col(V, N):
        c = np.tile(lin(0xe8ecd8), (len(V), 1))
        c[V[:, 1] > lh[1] - 0.09] = lin(0x4a7a2a)
        return c
    P.append(Part('onion', onion, lh - [0.05, 0.22, 0.05], lh + [0.12, 0.03, 0.08], 0.003, 'acc', onion_col, ('rigid', 'leftHand'), oth=0.5, faces=400, sym=False))
    return P


def heiten(rig):
    """閉店：閉店の手順を守り続ける店員（大きい）。顔は「閉店」の札（コードの faceMesh）・作業のシャツと緑の前かけ（ポケット・名札・ひも）・
    背中に波板のシャッター（巻いた箱・横の溝・下の棒・さび）・右の前腕がレジ（数字の鍵・表示・引き出し＝弱点・光る縁）・左手に値札の束"""
    SH, SH2, APRON, SKIN, PANTS = 0x4c6a52, 0x3a523f, 0x2f8f5a, 0xb9b2a6, 0x2a2b30
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    hc = np.array([0, 1.84, 0.0])
    P = []
    head = U(S.ellipsoid(hc, [0.125, 0.145, 0.13]), S.ellipsoid(hc + [0, -0.075, 0.03], [0.1, 0.07, 0.1]), k=0.04)
    P.append(Part('head', head, hc - 0.2, hc + 0.2, 0.004, 'skin', SKIN, ('rigid', 'head'), faces=1000))

    def hair_col(V, N):
        return np.tile(lin(0x3a3438), (len(V), 1)) * (0.8 + 0.25 * np.abs(np.sin(V[:, 0] * 120 + V[:, 1] * 30)))[:, None]
    hair = S.inter(S.offset(S.ellipsoid(hc + [0, 0.01, -0.01], [0.125, 0.145, 0.13]), 0.012), lambda Q: -(Q[:, 1] - (hc[1] + 0.05 - 0.7 * np.maximum(0, -(Q[:, 2] - hc[2] + 0.02)))))
    hair = S.inter(hair, lambda Q: Q[:, 2] - 0.06 + 0 * Q[:, 0])                         # 前（札の後ろ）は無い
    P.append(Part('hair', hair, hc - 0.2, hc + 0.2, 0.004, 'hair', hair_col, ('rigid', 'head'), faces=900))
    P.append(Part('neck', S.round_cone(nk + [0, -0.06, -0.01], hc + [0, -0.09, -0.01], 0.058, 0.052), nk - 0.12, hc, 0.005, 'skin', SKIN, 'body', ['neck', 'head', 'chest'], faces=400))
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    torso = U(S.ellipsoid(ch + [0, 0.1, -0.01], [0.25, 0.25, 0.165]), S.ellipsoid(sp + [0, 0.08, 0.03], [0.225, 0.2, 0.17]),
              S.capsule(sh_l + [-0.05, 0.0, -0.01], sh_r + [0.05, 0.0, -0.01], 0.09), S.ellipsoid(hp + [0, 0.0, 0.0], [0.19, 0.12, 0.14]), k=0.07)

    def shirt_col(V, N):
        c = np.tile(lin(SH), (len(V), 1))
        c[(V[:, 2] > 0.05) & (np.abs(V[:, 0]) < 0.006)] = lin(SH2)
        c *= (0.92 + 0.08 * hash3(V * 2, 7))[:, None]
        c[V[:, 1] < hp[1] - 0.05] = lin(0x2a2b30)                                         # ベルトの下＝ズボン
        return c
    P.append(Part('shirt', torso, [-0.42, hp[1] - 0.16, -0.25], [0.42, ch[1] + 0.4, 0.25], 0.007, 'cloth', shirt_col, 'body', ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2400))
    # 前かけ（胴の前の殻・ひざの上まで）
    apron_base = S.offset(torso, 0.012)
    apron = S.inter(S.sub(apron_base, S.offset(torso, 0.0)), lambda Q: np.maximum.reduce([0.04 - Q[:, 2], np.abs(Q[:, 0]) - 0.19, Q[:, 1] - (ch[1] + 0.14), (hp[1] - 0.02) - Q[:, 1]]))
    skirt = S.inter(S.box(hp + [0, -0.2, 0.15], [0.2, 0.25, 0.009], r=0.006, rot=rotx(-0.1)), lambda Q: (hp[1] - 0.45) - Q[:, 1])
    apron = U(apron, skirt, k=0.02)
    pocket = S.box(hp + [0, -0.12, 0.172], [0.12, 0.06, 0.006], r=0.004, rot=rotx(-0.08))
    apron = U(apron, pocket, k=0.004)

    def apron_col(V, N):
        c = np.tile(lin(APRON), (len(V), 1))
        c[(np.abs(V[:, 1] - (hp[1] - 0.12)) < 0.065) & (np.abs(V[:, 0]) < 0.125) & (V[:, 2] > 0.17)] = lin(0x267a4c)
        c[(np.abs(V[:, 1] - (ch[1] + 0.02)) < 0.022) & (np.abs(V[:, 0] - 0.09) < 0.04)] = lin(0xf2f0e8)   # 名札
        c *= (0.93 + 0.07 * hash3(V * 3, 2))[:, None]
        return c
    string = S.inter(S.sub(S.offset(torso, 0.016), S.offset(torso, 0.002)), lambda Q: np.abs(Q[:, 1] - (sp[1] + 0.02)) - 0.012)
    strap = S.inter(S.sub(S.offset(torso, 0.016), S.offset(torso, 0.002)), lambda Q: np.maximum(np.abs(np.abs(Q[:, 0]) - 0.13 + 0.25 * (Q[:, 1] - ch[1] - 0.15)) - 0.014, -(Q[:, 1] - (ch[1] + 0.1))))
    P.append(Part('strings', U(string, strap), [-0.4, sp[1] - 0.1, -0.3], [0.4, ch[1] + 0.45, 0.3], 0.0045, 'cloth', 0x267a4c, 'body', ['spine', 'chest', 'neck', 'hips'], oth=0.6, faces=900))
    P.append(Part('apron', apron, [-0.28, hp[1] - 0.5, 0.0], [0.28, ch[1] + 0.2, 0.3], 0.005, 'cloth', apron_col, 'skirt', oth=0.8, faces=1600))
    # 背中のシャッター（波板）：巻いた箱・波の板・横の溝・下の棒
    R0 = rotx(0.14)
    cen = ch + np.array([0, 0.12, -0.25])

    def corrug(Q):
        q = (Q - cen) @ R0
        z = q[:, 2] - 0.012 * np.sin(q[:, 1] * 2 * math.pi / 0.075) + 0.07 * (q[:, 0] / 0.45) ** 2   # 波板・背中に沿って少し曲がる
        d = np.stack([np.abs(q[:, 0]) - 0.45, np.abs(q[:, 1] + 0.0) - 0.38, np.abs(z) - 0.011], -1)
        return np.minimum(d.max(-1), 0) + S._len(np.maximum(d, 0)) - 0.002
    roll = S.cylinder(cen + R0 @ np.array([0, 0.46, 0.03]), 0.1, 0.5, rr=0.015, axis_rot=rotz(math.pi / 2) @ np.eye(3))
    rails = U(*[S.box(cen + R0 @ np.array([sx * 0.47, 0.0, 0.07]), [0.03, 0.42, 0.06], r=0.006, rot=R0) for sx in (1, -1)])
    bar = U(S.box(cen + R0 @ np.array([0, -0.39, 0.0]), [0.47, 0.025, 0.035], r=0.008, rot=R0), S.box(cen + R0 @ np.array([0, -0.34, -0.03]), [0.08, 0.012, 0.03], r=0.008, rot=R0))   # 下の棒・取っ手
    shutter = U(corrug, roll, rails, bar)

    def shut_col(V, N):
        c = np.tile(lin(0xa4aab2), (len(V), 1))
        q = (V - cen) @ R0
        c *= (0.85 + 0.15 * (np.sin(q[:, 1] * 2 * math.pi / 0.075) > 0))[:, None]
        rust = np.clip(hash3(V * 4, 9) * 1.2 - 0.3, 0, 1) * np.clip(-q[:, 1] * 2 + 0.2, 0, 1)
        c = c * (1 - rust[:, None]) + lin(0x7a4a2a) * rust[:, None]
        c[q[:, 1] > 0.39] = lin(0x6a6e74)
        return c
    P.append(Part('shutter', shutter, cen - [0.58, 0.55, 0.2], cen + [0.58, 0.6, 0.2], 0.005, 'metal', shut_col, ('rigid', 'chest'), oth=0.6, faces=3200, sym=True))
    # 腕（太い・袖をまくった）・左手（大きい）・右の前腕はレジ
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        up = limb(ua + [0, 0.01, 0], la, 0.075, 0.064)
        if s == 'left':
            f = U(up, limb(la, ha + [0, 0.03, 0], 0.058, 0.048), k=0.02)
        else:
            f = up

        def acol(V, N, la=la):
            c = np.tile(lin(SH), (len(V), 1))
            c[np.abs(V[:, 1] - (la[1] + 0.06)) < 0.03] = lin(SH2)                     # まくった袖
            c[V[:, 1] < la[1] + 0.03] = lin(SKIN)
            return c
        P.append(Part(s + '_arm', f, ua - [0.15, 0.75, 0.15], ua + [0.15, 0.12, 0.15], 0.006, 'cloth', acol, 'body', [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=1100, sym=False))
    P.append(hand(rig, 'left', 1.45, SKIN))
    la = B(rig, 'rightLowerArm')
    reg_c = la + np.array([0, -0.3, 0.04])
    reg = U(S.box(reg_c, [0.15, 0.11, 0.17], r=0.02), S.round_cone(la + [0, 0.0, 0], reg_c + [0, 0.06, -0.02], 0.06, 0.08), k=0.05)   # 前腕がレジへ混ざる
    disp = S.box(la + [0, -0.16, -0.02], [0.12, 0.04, 0.08], r=0.01, rot=rotx(-0.4))
    keys = U(*[S.box(reg_c + [-0.09 + i * 0.045, 0.112, -0.09 + j * 0.045], [0.016, 0.006, 0.016], r=0.004) for i in range(5) for j in range(4)])
    reg = U(reg, disp, k=0.01)

    def reg_col(V, N):
        c = np.tile(lin(0x30343a), (len(V), 1))
        c[V[:, 1] > la[1] - 0.08] = lin(SH)                                               # 前腕（袖）の続き
        c[(V[:, 1] > la[1] - 0.2) & (V[:, 1] < la[1] - 0.12) & (V[:, 2] > la[2] - 0.08)] = lin(0x9aa0a8)
        return c
    P.append(Part('register', reg, reg_c - [0.25, 0.25, 0.25], reg_c + [0.25, 0.4, 0.25], 0.005, 'metal', reg_col, ('rigid', 'rightLowerArm'), oth=0.8, faces=1400, sym=False))
    P.append(Part('keys', keys, reg_c - [0.15, -0.08, 0.15], reg_c + [0.15, 0.14, 0.15], 0.003, 'acc', 0xd8d4c8, ('rigid', 'rightLowerArm'), oth=0.0, faces=600, sym=False, ao=False))
    drawer = S.box(reg_c + [0, -0.12, 0.03], [0.13, 0.03, 0.15], r=0.006)
    P.append(Part('drawer', drawer, reg_c - [0.2, 0.2, 0.2], reg_c + [0.2, 0.0, 0.25], 0.004, 'glow', 0xffb040, ('rigid', 'rightLowerArm'), oth=0.4, faces=300, sym=False, ao=False))
    # 値札の束（左手）
    lh = B(rig, 'leftHand')
    tags = U(*[S.box(lh + [0.012 * i, -0.13 - i * 0.012, 0.07], [0.03, 0.045, 0.003], r=0.002, rot=rotz(0.2 * i)) for i in range(4)])
    P.append(Part('tags', tags, lh - [0.1, 0.25, 0.0], lh + [0.15, 0.0, 0.15], 0.0025, 'acc', 0xf2e6c8, ('rigid', 'leftHand'), oth=0.4, faces=300, sym=False))
    P += legs(rig, (0.105, 0.075, 0.078, 0.052), PANTS, 0x16161a, 0x2a2a2a)
    return P


def shuuyou(rig):
    """収容者：避難所の備品と混ざった大きな異形。銀と金の非常用毛布を重ねた胴（しわ）・頭のかわりに館内放送のスピーカー（中が光る＝弱点）・
    背中に折りたたみ椅子 3 脚・胴を抜ける簡易ベッドの枠・右腕の先は段ボールの仕切り板・左手は簡易ベッドの脚のパイプ・小さな上履き"""
    SIL, GOLD, DARK = 0x9aa2ae, 0xc8a850, 0x3a3c44
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    P = []
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    body0 = U(S.ellipsoid(ch + [0, 0.05, 0.0], [0.4, 0.32, 0.3]), S.ellipsoid(sp + [0, 0.05, 0.02], [0.35, 0.25, 0.29]), S.capsule(sh_l + [-0.06, -0.02, 0], sh_r + [0.06, -0.02, 0], 0.13),
              S.ellipsoid(hp + [0, 0.0, 0.0], [0.27, 0.16, 0.22]), k=0.09)

    def crinkle(Q):
        return body0(Q) - 0.008 * hash3(Q * 3.2, 11) - 0.006 * np.sin(Q[:, 1] * 44 + np.sin(Q[:, 0] * 9) * 2) - 0.004 * np.sin(Q[:, 0] * 31 + Q[:, 2] * 23)
    folds = U(*[S.ellipsoid(ch + [math.sin(a) * 0.31, 0.0 + (i % 2) * 0.12 - 0.12, math.cos(a) * 0.24], [0.17, 0.08, 0.1]) for i, a in enumerate(np.linspace(0, 2 * math.pi, 7)[:-1])])
    body = U(crinkle, folds, k=0.05)

    def blanket_col(V, N):
        band = np.floor(V[:, 1] * 9 + np.sin(V[:, 0] * 13) * 0.6).astype(int) % 3
        c = np.where((band == 0)[:, None], lin(GOLD), np.where((band == 1)[:, None], lin(SIL), lin(0xb8bec8)))
        c = c * (0.82 + 0.3 * np.clip(hash3(V * 6, 4), -0.6, 1))[:, None]                 # しわの光り
        return c
    P.append(Part('blanket', body, [-0.6, hp[1] - 0.25, -0.45], [0.6, ch[1] + 0.45, 0.45], 0.008, 'metal', blanket_col, 'body', ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], oth=1.0, faces=3600))
    # 首（暗い箱）とスピーカー（ラッパ）
    P.append(Part('neck', S.box(hd + [0, 0.02, -0.03], [0.065, 0.13, 0.065], r=0.015), hd - 0.2, hd + 0.25, 0.004, 'cloth', DARK, 'body', ['neck', 'head', 'chest'], faces=300))
    Rh = rotx(math.pi / 2 + 0.25)
    sc = hd + np.array([0, 0.24, 0.07])
    ax = Rh @ np.array([0, 1, 0])                                                        # ラッパの向き（前へ・少し上）

    def horn(Q):
        q = Q - sc
        t = q @ ax
        rad = S._len(q - np.outer(t, ax))
        r = 0.07 + (0.24 - 0.07) * np.clip((t + 0.16) / 0.32, 0, 1) ** 1.6
        shell = np.abs(rad - r) - 0.008
        cap = np.maximum(-(t + 0.16), t - 0.16)
        return np.maximum(shell, cap)
    back = S.cylinder(sc - ax * 0.2, 0.09, 0.07, rr=0.02, axis_rot=Rh)
    P.append(Part('horn', U(horn, back, k=0.02), sc - 0.35, sc + 0.35, 0.004, 'acc', lambda V, N: np.where(((V - sc) @ ax > 0.14)[:, None], lin(0xd8d8d0), lin(0xe8e8e0)) * 1.0,
                  ('rigid', 'head'), oth=0.9, faces=1400))
    glow = S.cylinder(sc + ax * 0.0, 0.12, 0.004, rr=0.002, axis_rot=Rh)
    P.append(Part('horn_in', glow, sc - 0.2, sc + 0.2, 0.003, 'glow', 0xb890ff, ('rigid', 'head'), oth=0.0, faces=300, ao=False))
    # 背中の折りたたみ椅子（3 脚）
    chairs = []
    for i in range(3):
        R = rotz((i - 1) * 0.25) @ roty((i - 1) * 0.35) @ rotx(0.5 + (-0.2 if i == 1 else 0))
        o = ch + np.array([(i - 1) * 0.24, -0.02 + (0.08 if i == 1 else 0), -0.34])
        for x in (-0.18, 0.18):
            chairs.append(S.capsule(o + R @ np.array([x, -0.15, 0]), o + R @ np.array([x, 0.65, 0]), 0.013))
        chairs.append(S.box(o + R @ np.array([0, 0.5, 0]), [0.19, 0.11, 0.012], r=0.006, rot=R))
        R2 = R @ rotx(0.3)
        chairs.append(S.box(o + R @ np.array([0, 0.1, 0.12]), [0.19, 0.012, 0.15], r=0.006, rot=R2))
    P.append(Part('chairs', U(*chairs), ch - [0.75, 0.5, 1.0], ch + [0.75, 1.0, 0.1], 0.006, 'metal', lambda V, N: np.where((S._len(V - ch) > 0.0)[:, None], lin(0x5a6a8a), 0),
                  ('rigid', 'chest'), oth=0.6, faces=2000, sym=False))
    # 簡易ベッドの枠（胴を斜めに抜ける管）と帆布の板
    tubes = U(*[S.capsule(ch + [sx * 0.6, -0.35, 0.36], ch + [-sx * 0.4, 0.28, -0.38], 0.019) for sx in (1, -1)])
    P.append(Part('cot', tubes, ch - [0.8, 0.6, 0.6], ch + [0.8, 0.6, 0.6], 0.004, 'metal', 0x8a929a, ('rigid', 'chest'), oth=0.5, faces=700, sym=False))
    # 腕（毛布を巻いた太い腕）・右の先は段ボールの仕切り板・左の先はパイプの爪
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        f0 = U(limb(ua + [0, 0.02, 0], la, 0.1, 0.085), limb(la, ha + [0, 0.04, 0], 0.08, 0.065), k=0.03)

        def fa(Q, f0=f0):
            return f0(Q) - 0.008 * hash3(Q * 3, 6)
        P.append(Part(s + '_arm', fa, ua - [0.2, 1.1, 0.2], ua + [0.2, 0.15, 0.2], 0.007, 'metal', blanket_col, 'body', [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=1300, sym=False))
    rh = B(rig, 'rightHand')
    board = S.box(rh + [-0.02, -0.32, 0.05], [0.02, 0.36, 0.28], r=0.006)

    def board_col(V, N):
        c = np.tile(lin(0xc8a878), (len(V), 1))
        c *= (0.92 + 0.08 * (np.sin(V[:, 1] * 220) > 0.6))[:, None]
        c[np.abs(V[:, 1] - (rh[1] - 0.2)) < 0.01] = lin(0x8a6a48)                      # 折り目
        return c
    P.append(Part('board', board, rh - [0.1, 0.75, 0.4], rh + [0.1, 0.1, 0.45], 0.005, 'cloth', board_col, ('rigid', 'rightHand'), oth=0.8, faces=600, sym=False))
    lh = B(rig, 'leftHand')
    claws = U(*[U(S.capsule(lh + [0, -0.04, 0], lh + [(i - 1) * 0.06, -0.2, 0.08], 0.016), S.capsule(lh + [(i - 1) * 0.06, -0.2, 0.08], lh + [(i - 1) * 0.09, -0.34, 0.18], 0.013), k=0.01) for i in range(3)])
    P.append(Part('claws', claws, lh - [0.2, 0.45, 0.1], lh + [0.2, 0.05, 0.3], 0.004, 'metal', 0x9098a0, ('rigid', 'leftHand'), oth=0.5, faces=900, sym=False))
    # 脚（太い・毛布）と小さな上履き
    for s in ('left', 'right'):
        up, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        f0 = U(limb(up + [0, 0.03, 0], kn, 0.17, 0.13), limb(kn, ft + [0, 0.1, 0], 0.125, 0.085), k=0.03)

        def fl(Q, f0=f0):
            return f0(Q) - 0.01 * hash3(Q * 2.6, 8)
        P.append(Part(s + '_leg', fl, up - [0.3, 1.05, 0.3], up + [0.3, 0.2, 0.3], 0.008, 'metal', blanket_col, 'body', [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=1200, sym=False))
        shoe = U(S.box(ft + [0, 0.035, 0.06], [0.07, 0.035, 0.11], r=0.03), k=0.0)

        def scol(V, N):
            c = np.tile(lin(0xf2f2ee), (len(V), 1))
            c[V[:, 1] < 0.022] = lin(0x3a6ad0)
            c[(V[:, 2] > ft[2] + 0.1) & (V[:, 1] > 0.05)] = lin(0x3a6ad0)                 # つま先の色（学校の上履き）
            return c
        P.append(Part(s + '_shoe', shoe, ft - [0.12, 0.05, 0.1], ft + [0.12, 0.12, 0.22], 0.005, 'acc', scol, ('rigid', s + 'Foot'), oth=0.8, faces=400, sym=False))
    return P


DESIGNS = {'kiro': kiro, 'heiten': heiten, 'shuuyou': shuuyou}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    only, out, lods = [], os.path.join(ROOT, 'shinshoku', 'assets', 'enemies'), ['pc', 'low']
    i = 0
    while i < len(argv):
        if argv[i] == '--only':
            only.append(argv[i + 1]); i += 1
        elif argv[i] == '--out':
            out = os.path.abspath(argv[i + 1]); i += 1
        elif argv[i] == '--lod':
            lods = [argv[i + 1]]; i += 1
        i += 1
    MO.clear_scene()
    for k in only or list(DESIGNS):
        for lod in lods:
            build(k, lod, out)


if __name__ == '__main__':
    main()
