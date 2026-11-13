# -*- coding: utf-8 -*-
"""だんのうら 巨大猫又の build.json を作る（左だけ書いて右を写す）
  座標は「肩の高さ＝1」の単位（x: モデルの左＝+・y: 前＝−・z: 上）。最後に scale 倍して m にする。
  比率は設計図（reference/nekomata_sheet.webp）の横の図から読んだ（肩の高さ 315 画素・床 y=785・横の図の中心 x=520）。
  大きさは設計図の「大きさは提案」の人（164 cm・90 画素）との比から、肩の高さ ≒ 5.7 m（scale 5.7）。
  使い方: python make_build.py  → build.json
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def mx(p):
    return [-p[0], p[1], p[2]]


def mirror_bone(name):
    return name[:-1] + 'R' if name.endswith('L') else name


# ── 骨 ──
sk = {
    'root': {'head': [0, 0, 0], 'tail': [0, 0, 0.2], 'parent': None},
    'pelvis': {'head': [0, 0.45, 0.84], 'tail': [0, 0.22, 0.84], 'parent': 'root'},
    'spine1': {'head': [0, 0.22, 0.84], 'tail': [0, -0.02, 0.85], 'parent': 'pelvis'},
    'spine2': {'head': [0, -0.02, 0.85], 'tail': [0, -0.26, 0.86], 'parent': 'spine1'},
    'chest': {'head': [0, -0.26, 0.86], 'tail': [0, -0.46, 0.9], 'parent': 'spine2'},
    'neck1': {'head': [0, -0.46, 0.92], 'tail': [0, -0.5, 1.06], 'parent': 'chest'},
    'neck2': {'head': [0, -0.5, 1.06], 'tail': [0, -0.56, 1.14], 'parent': 'neck1'},
    'neck3': {'head': [0, -0.56, 1.14], 'tail': [0, -0.6, 1.21], 'parent': 'neck2'},
    'head': {'head': [0, -0.55, 1.3], 'tail': [0, -0.62, 1.55], 'parent': 'neck3'},
    'jaw': {'head': [0, -0.6, 1.33], 'tail': [0, -0.7, 1.29], 'parent': 'head'},
}
legs_L = {
    'foreLegL': ([0.19, -0.42, 0.86], [0.2, -0.43, 0.48], 'chest'),
    'foreArmL': ([0.2, -0.43, 0.48], [0.2, -0.45, 0.1], 'foreLegL'),
    'forePawL': ([0.2, -0.45, 0.1], [0.2, -0.56, 0.03], 'foreArmL'),
    'hindLegL': ([0.19, 0.46, 0.84], [0.2, 0.36, 0.5], 'pelvis'),
    'hindShinL': ([0.2, 0.36, 0.5], [0.2, 0.58, 0.24], 'hindLegL'),
    'hindFootL': ([0.2, 0.58, 0.24], [0.2, 0.5, 0.03], 'hindShinL'),
}
for n, (h, t, p) in legs_L.items():
    sk[n] = {'head': h, 'tail': t, 'parent': p}
    sk[mirror_bone(n)] = {'head': mx(h), 'tail': mx(t), 'parent': mirror_bone(p)}

# 尾 2 本: 腰の上から立ち上がり、高く上がって外へ弧を描き、先が外下へ垂れる（正面で V 字・横で後ろへ巻く）
tail_L = [[0.03, 0.56, 1.0], [0.06, 0.66, 1.28], [0.11, 0.66, 1.6], [0.19, 0.6, 1.88], [0.28, 0.68, 2.05], [0.35, 0.86, 2.02], [0.38, 0.96, 1.84]]
for i in range(6):
    sk['tail%d' % (i + 1)] = {'head': tail_L[i], 'tail': tail_L[i + 1], 'parent': 'pelvis' if i == 0 else 'tail%d' % i}
    sk['tailB%d' % (i + 1)] = {'head': mx(tail_L[i]), 'tail': mx(tail_L[i + 1]), 'parent': 'pelvis' if i == 0 else 'tailB%d' % i}

# ── 毛の房の決まり ──
BODY_FUR = [
    {'from': 0.0, 'to': 0.35, 'every': 1, 'density': 0.75, 'length': [[0, 0.24], [0.35, 0.14]], 'width': 0.65, 'out': 0.38,
     'flow': [0, 0.6, -1], 'flow_k': 1.0, 'jitter': 0.1, 'curl': 0.12, 'len_var': 0.15},             # 胸・肩のたてがみ（長く下へ）
    {'from': 0.3, 'to': 1.0, 'every': 1, 'density': 0.9, 'length': [[0.3, 0.12], [0.8, 0.1], [1.0, 0.13]], 'width': 0.7, 'out': 0.22,
     'flow': [0, 1, -0.25], 'flow_k': 1.0, 'jitter': 0.06, 'len_var': 0.12},                          # 背と脇（後ろへ流れる）
    {'from': 0.25, 'to': 0.9, 'every': 1, 'density': 0.85, 'length': [[0, 0.12], [1, 0.13]], 'width': 0.65, 'out': 0.18,
     'flow': [0, 0.3, -1], 'flow_k': 1.0, 'only': 'bottom', 'jitter': 0.1, 'len_var': 0.15},          # 腹の下の垂れる毛
]
NECK_FUR = [
    {'from': 0.0, 'to': 1.0, 'every': 1, 'density': 0.95, 'length': [[0, 0.24], [0.6, 0.22], [1, 0.17]], 'width': 0.65, 'out': 0.4,
     'flow': [0, 0.2, -1], 'flow_k': 0.9, 'jitter': 0.1, 'curl': 0.14, 'len_var': 0.15},              # 首のまわりの豊かなたてがみ
]
FORE_FUR = [
    {'from': 0.0, 'to': 1.0, 'every': 1, 'density': 0.9, 'length': [[0, 0.13], [0.45, 0.09], [1, 0.07]], 'width': 0.65, 'out': 0.15,
     'flow': [0, 0.2, -1], 'flow_k': 1.0, 'jitter': 0.08, 'len_var': 0.12},
    {'from': 0.15, 'to': 0.85, 'every': 1, 'density': 0.8, 'length': [[0, 0.1], [1, 0.07]], 'width': 0.6, 'out': 0.2,
     'flow': [0, 1, -0.8], 'flow_k': 1.0, 'only': 'back', 'jitter': 0.08, 'len_var': 0.12},         # 前足の後ろの飾り毛
]
HIND_FUR = [
    {'from': 0.0, 'to': 0.5, 'every': 1, 'density': 0.85, 'length': [[0, 0.13], [0.5, 0.09]], 'width': 0.6, 'out': 0.15,
     'flow': [0, 0.8, -1], 'flow_k': 1.0, 'jitter': 0.08, 'len_var': 0.12},                          # ももの毛（ズボンのように）
    {'from': 0.5, 'to': 1.0, 'every': 1, 'density': 0.9, 'length': [[0, 0.08], [1, 0.07]], 'width': 0.65, 'out': 0.15,
     'flow': [0, 0.5, -1], 'flow_k': 1.0, 'jitter': 0.06, 'len_var': 0.12},
]
TAIL_FUR = [
    {'from': 0.03, 'to': 0.99, 'every': 1, 'density': 1.0, 'length': [[0, 0.1], [0.25, 0.17], [0.7, 0.19], [1, 0.14]], 'width': 0.8,
     'out': 0.45, 'flow': [0, 0, 0], 'flow_k': 0.0, 'jitter': 0.06, 'curl': 0.18, 'len_var': 0.12, 'along': 0.9},  # 尾の房（ふさふさ）
]

tubes = [
    {'name': 'body', 'path': [[0, -0.64, 0.9], [0, -0.46, 0.87], [0, -0.12, 0.82], [0, 0.28, 0.82], [0, 0.58, 0.86]],
     'radius': [[0, 0.28, 0.32], [0.25, 0.3, 0.34], [0.55, 0.25, 0.27], [0.82, 0.27, 0.28], [0.95, 0.2, 0.21], [1.0, 0.1, 0.1]],
     'bones': ['chest', 'spine2', 'spine1', 'pelvis'], 'rings': 80, 'sides': 34, 'up': [0, 0, 1], 'flat_belly': 0.1, 'fur': BODY_FUR},
    {'name': 'neck', 'path': [[0, -0.47, 0.92], [0, -0.55, 1.07], [0, -0.62, 1.2]],
     'radius': [[0, 0.2, 0.2], [0.6, 0.16, 0.16], [1, 0.13, 0.13]], 'bones': ['neck1', 'neck2', 'neck3', 'chest'],
     'rings': 20, 'sides': 18, 'up': [0, -1, 0], 'fur': NECK_FUR},
]
for sd in (1, -1):
    s = 'L' if sd > 0 else 'R'
    f = lambda p: [p[0] * sd, p[1], p[2]]
    tubes.append({'name': 'fore' + s, 'path': [f([0.19, -0.42, 0.84]), f([0.2, -0.43, 0.48]), f([0.2, -0.45, 0.1])],
                  'radius': [[0, 0.16, 0.18], [0.45, 0.125, 0.13], [1, 0.11, 0.11]],
                  'bones': ['foreLeg' + s, 'foreArm' + s], 'rings': 40, 'sides': 20, 'up': [0, -1, 0], 'fur': FORE_FUR})
    tubes.append({'name': 'hind' + s, 'path': [f([0.19, 0.46, 0.84]), f([0.2, 0.36, 0.5]), f([0.2, 0.58, 0.24]), f([0.2, 0.52, 0.08])],
                  'radius': [[0, 0.19, 0.21], [0.35, 0.15, 0.16], [0.65, 0.105, 0.105], [1, 0.1, 0.1]],
                  'bones': ['hindLeg' + s, 'hindShin' + s, 'hindFoot' + s], 'rings': 46, 'sides': 20, 'up': [0, -1, 0], 'fur': HIND_FUR})
    tl = [f(p) for p in tail_L]
    tubes.append({'name': 'tail' + s, 'path': tl,
                  'radius': [[0, 0.05, 0.05], [0.2, 0.075, 0.075], [0.55, 0.088, 0.088], [0.85, 0.08, 0.08], [1, 0.03, 0.03]],
                  'bones': [('tail%d' if sd > 0 else 'tailB%d') % (i + 1) for i in range(6)], 'rings': 80, 'sides': 20, 'up': [0, -1, 0],
                  'fur': TAIL_FUR})

# ── 楕円体: 頭・口先・ほお・あご・足先 ──
HEAD_C = [0, -0.585, 1.455]
FACE_FUR = {'length': 0.055, 'density': 0.95, 'out': 0.12, 'flow': [0, 1, 0.35], 'flow_k': 1.0, 'jitter': 0.06, 'len_var': 0.15, 'max_y': 0.4}
ellipsoids = [
    {'c': HEAD_C, 'axes': [[0.15, 0, 0], [0, 0.135, 0], [0, 0, 0.12]], 'bones': ['head'], 'fur': [dict(FACE_FUR, min_z=-0.3)]},   # 頭
    {'c': [0, -0.655, 1.49], 'axes': [[0.085, 0, 0], [0, 0.055, 0], [0, 0, 0.045]], 'bones': ['head'],
     'fur': [dict(FACE_FUR, length=0.04, flow=[0, 1, 0.6], min_y=-0.95)]},                                                     # 額（鼻すじへ下る）
    {'c': [0, -0.705, 1.39], 'axes': [[0.048, 0, 0], [0, 0.042, 0], [0, 0, 0.033]], 'bones': ['head']},                         # 口先（小さく）
    {'c': [0, -0.68, 1.352], 'axes': [[0.03, 0, 0], [0, 0.032, 0], [0, 0, 0.015]], 'bones': ['jaw']},                           # 下あご（口先の下に隠れる）
    {'c': [0, -0.746, 1.402], 'axes': [[0.017, 0, 0], [0, 0.009, 0], [0, 0, 0.011]], 'bones': ['head'], 'mat': 'Nose', 'color': '#E7A9BA', 'segs': 12, 'rings': 6},
]
for sd in (1, -1):
    ellipsoids.append({'c': [0.022 * sd, -0.728, 1.376], 'axes': [[0.026, 0, 0], [0, 0.02, 0], [0, 0, 0.02]], 'bones': ['head']})  # ひげの付け根のふくらみ
for sd in (1, -1):
    s = 'L' if sd > 0 else 'R'
    ellipsoids.append({'c': [0.105 * sd, -0.62, 1.4], 'axes': [[0.055, 0, 0], [0, 0.05, 0], [0, 0, 0.055]], 'bones': ['head'],
                       'fur': [{'length': 0.15, 'density': 1.0, 'out': 0.5, 'flow': [0.6 * sd, 0.6, -0.5], 'flow_k': 0.9, 'jitter': 0.08,
                                'len_var': 0.15, 'min_y': -0.8}]})          # ほおの毛（外・後ろ下へ広がる。玉は毛の下に隠れる）
    for kind, c, bone in (('fore', [0.2 * sd, -0.52, 0.05], 'forePaw' + s), ('hind', [0.2 * sd, 0.47, 0.05], 'hindFoot' + s)):
        ellipsoids.append({'c': c, 'axes': [[0.12, 0, 0], [0, 0.14, 0], [0, 0, 0.06]], 'bones': [bone],
                           'fur': [{'length': 0.05, 'density': 0.7, 'out': 0.25, 'flow': [0, 0.3, -0.3], 'min_z': 0.0, 'jitter': 0.15}]})
        # 指（前の 4 つのふくらみ）と紫の爪
        for k, dx in enumerate((-0.06, -0.022, 0.022, 0.06)):
            tc = [c[0] + dx * sd, c[1] - 0.105 + abs(dx) * 0.25, 0.04]
            ellipsoids.append({'c': tc, 'axes': [[0.03, 0, 0], [0, 0.035, 0], [0, 0, 0.035]], 'bones': [bone]})

# ── 刃: 耳（外は毛・内は桃色） ──
blades = []
cones = []
lines = []
for sd in (1, -1):
    s = 'L' if sd > 0 else 'R'
    base, tip = [0.1 * sd, -0.58, 1.53], [0.155 * sd, -0.6, 1.705]
    blades.append({'base': base, 'tip': tip, 'w': 0.2, 't': 0.04, 'flat': [0.15 * sd, -1, 0], 'bones': ['head']})
    blades.append({'base': [base[0], base[1] - 0.014, base[2] + 0.015], 'tip': [tip[0] * 0.97, tip[1] - 0.014, tip[2] - 0.04], 'w': 0.1, 't': 0.012,
                   'flat': [0.15 * sd, -1, 0], 'bones': ['head'], 'mat': 'EarIn'})
    # 耳の内の白い飾り毛
    for k in range(3):
        blades.append({'base': [(0.1 + 0.012 * k) * sd, -0.59, 1.56 + 0.02 * k], 'tip': [(0.12 + 0.02 * k) * sd, -0.61, 1.66 + 0.02 * k], 'w': 0.02, 't': 0.004,
                       'flat': [0.15 * sd, -1, 0], 'bones': ['head']})
    # 爪（前 4・後ろ 4）
    for c, bone in (([0.2 * sd, -0.52, 0.05], 'forePaw' + s), ([0.2 * sd, 0.47, 0.05], 'hindFoot' + s)):
        for dx in (-0.06, -0.022, 0.022, 0.06):
            b = [c[0] + dx * sd, c[1] - 0.13 + abs(dx) * 0.25, 0.035]
            cones.append({'base': b, 'tip': [b[0], b[1] - 0.045, 0.006], 'r': 0.011, 'bones': [bone], 'bend': [0, -0.006, -0.008]})
    # 目の上の紫の線（目がしらの上から、こめかみへ上がる）と、目の下の短い線
    lines.append({'path': [[0.033 * sd, -0.717, 1.468], [0.065 * sd, -0.716, 1.477], [0.1 * sd, -0.698, 1.49], [0.13 * sd, -0.668, 1.515], [0.155 * sd, -0.632, 1.548]],
                  'r': 0.0045, 'start': 0.5, 'end': 0.15, 'mat': 'Mark', 'bones': ['head']})
    lines.append({'path': [[0.06 * sd, -0.714, 1.447], [0.095 * sd, -0.7, 1.452], [0.125 * sd, -0.675, 1.468], [0.145 * sd, -0.648, 1.49]],
                  'r': 0.0035, 'start': 0.4, 'end': 0.15, 'mat': 'Mark', 'bones': ['head']})
    # ひげ（口先の横から外へ 4 本）
    for k in range(4):
        z = 1.38 - 0.01 * k
        lines.append({'path': [[0.035 * sd, -0.742, z], [0.16 * sd, -0.735 + 0.01 * k, z - 0.008 - 0.008 * k], [0.3 * sd, -0.7 + 0.02 * k, z - 0.035 - 0.02 * k]],
                      'r': 0.0018, 'start': 1.0, 'end': 0.3, 'mat': 'Whisker', 'bones': ['head'], 'sides': 4, 'rings': 10})

eyes = []
for sd in (1, -1):
    eyes.append({'center': [0.066 * sd, -0.703, 1.462], 'axes': [[0.033, 0.007 * sd, 0.009], [0, 0.01, 0], [-0.003 * sd, 0, 0.015]],
                 'out': [0.3 * sd, -1, 0.05], 'pupil_out': 0.005, 'pupil_axes': [[0.0038, 0, 0], [0, 0.003, 0], [0, 0, 0.011]],
                 'glint': [0.005 * sd, 0, 0.004], 'glint_axes': [[0.003, 0, 0], [0, 0.002, 0], [0, 0, 0.003]], 'lid_cap': 0.42})

# ── 頭まわりをまとめて大きくする（設計図は頭・耳・ほおの毛が大きい） ──
HEAD_SCALE = 1.3
PIV = [0, -0.55, 1.3]


HEAD_SHIFT = [0, -0.05, -0.09]


def hs(p):
    return [PIV[k] + (p[k] - PIV[k]) * HEAD_SCALE + HEAD_SHIFT[k] for k in range(3)]


def hv(v):
    return [x * HEAD_SCALE for x in v]


for n in ('head', 'jaw'):
    sk[n]['head'], sk[n]['tail'] = hs(sk[n]['head']), hs(sk[n]['tail'])
for el in ellipsoids:
    if el['bones'][0] in ('head', 'jaw'):
        el['c'] = hs(el['c'])
        el['axes'] = [hv(a) for a in el['axes']]
        for fs in el.get('fur', []):
            fs['length'] = fs['length'] * HEAD_SCALE
for bl in blades:
    if bl['bones'][0] == 'head':
        bl['base'], bl['tip'] = hs(bl['base']), hs(bl['tip'])
        bl['w'], bl['t'] = bl['w'] * HEAD_SCALE, bl['t'] * HEAD_SCALE
for ln in lines:
    if ln['bones'][0] == 'head':
        ln['path'] = [hs(q) for q in ln['path']]
        ln['r'] = ln['r'] * HEAD_SCALE
for e in eyes:
    e['center'] = hs(e['center'])
    e['axes'] = [hv(a) for a in e['axes']]
    e['pupil_axes'] = [hv(a) for a in e['pupil_axes']]
    e['glint_axes'] = [hv(a) for a in e['glint_axes']]
    e['glint'] = hv(e['glint'])
    e['pupil_out'] *= HEAD_SCALE

cfg = {
    'name': 'nekomata',
    'seed': 7,
    'scale': 5.7,
    'skeleton': sk,
    'palette': {
        'fur': '#F6F1F8', 'fur_shadow': '#CDBFDB', 'fur_tip': '#FFFFFF',
        'Eye': '#B7A2E6', 'Pupil': '#2C2140', 'Nose': '#E7A9BA', 'EarIn': '#E8B0C2', 'Pad': '#B27FAE', 'Claw': '#5B3E7C',
        'Mark': '#6E4AA6', 'Whisker': '#F7F4FA', 'Glint': '#FFFFFF',
    },
    'tubes': tubes,
    'ellipsoids': ellipsoids,
    'blades': blades,
    'cones': cones,
    'lines': lines,
    'eyes': eyes,
    'expressions': {  # Cast Profile の表情名（ルーンと同じ 7 種）と VRM の標準名
        'calm': {'lid': 0.15}, 'gentle_smile': {'lid': 0.35, 'squint': 0.25}, 'awkward': {'lid': 0.2, 'squint': 0.1},
        'guarding_eyes': {'lid': 0.3, 'squint': 0.45}, 'quiet_sorrow': {'lid': 0.45}, 'serious': {'lid': 0.22, 'squint': 0.3},
        'thinking': {'lid': 0.3, 'squint': 0.15},
        'happy': {'lid': 0.45, 'squint': 0.3}, 'angry': {'lid': 0.35, 'squint': 0.45}, 'sad': {'lid': 0.4}, 'surprised': {'wide': 0.8},
        'relaxed': {'lid': 0.3},
    },
    'idle': {'frames': 120, 'sway': {
        'chest': {'amp': 0.0, 'axis': 'x', 'scale': 0.012},
        'tail2': {'amp': 4, 'axis': 'y'}, 'tail4': {'amp': 6, 'axis': 'y', 'phase': 0.6},
        'tailB2': {'amp': 4, 'axis': 'y', 'phase': 1.6}, 'tailB4': {'amp': 6, 'axis': 'y', 'phase': 2.2},
        'neck2': {'amp': 1.5, 'axis': 'x', 'phase': 0.3}}},
    'ao': {'samples': 24, 'distance': 0.6, 'strength': 0.6},
    # 守る姿勢（設計図の右下）。.glb に名前付きの動きとして入る（ゲーム・演出が名前で呼ぶ。Cast Engine の待機は idle のまま）
    # 骨の回転は度。胴・首・頭・脚は +X で前（鼻先・足先）が下／後ろへ、pelvis だけ +X で前が上がる。loc は root の移動（m・[横, 上, 前後]）
    'poses': {
        'guard_crouch': {'hold': 30, 'keys': [   # 伏せて低く構える: 胸を地面近くへ・前足を前へ開く・頭を低く前へ・尾を後ろへ上げる
            [0, {}],
            [24, {'loc': [0, 0.2, 0], 'pelvis': [-6, 0, 0], 'spine1': [2, 0, 0], 'chest': [4, 0, 0],
                  'foreLegL': [-45, 0, -8], 'foreArmL': [70, 0, 0], 'forePawL': [-24, 0, 0],
                  'foreLegR': [-45, 0, 8], 'foreArmR': [70, 0, 0], 'forePawR': [-24, 0, 0],
                  'hindLegL': [-24, 0, 0], 'hindShinL': [30, 0, 0], 'hindFootL': [-8, 0, 0],
                  'hindLegR': [-24, 0, 0], 'hindShinR': [30, 0, 0], 'hindFootR': [-8, 0, 0],
                  'neck1': [22, 0, 0], 'neck2': [6, 0, 0], 'head': [-18, 0, 0],
                  'tail1': [-18, 0, 0], 'tail2': [-10, 0, 0], 'tailB1': [-18, 0, 0], 'tailB2': [-10, 0, 0]}]]},
        'guard_rise': {'hold': 30, 'keys': [    # 立ち上がって見下ろす: 首と胸を起こし・頭を上げ・尾を高く
            [0, {}],
            [24, {'loc': [0, 0.15, 0], 'chest': [-4, 0, 0], 'foreLegL': [4, 0, 0], 'foreLegR': [4, 0, 0],
                  'neck1': [-20, 0, 0], 'neck2': [-10, 0, 0], 'head': [-6, 0, 0],
                  'tail1': [-10, 0, 0], 'tail3': [-8, 0, 0], 'tailB1': [-10, 0, 0], 'tailB3': [-8, 0, 0]}]]},
    },
}
json.dump(cfg, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('build.json ok')
