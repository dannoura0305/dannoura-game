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
    'neck2': {'head': [0, -0.5, 1.06], 'tail': [0, -0.53, 1.18], 'parent': 'neck1'},
    'neck3': {'head': [0, -0.53, 1.18], 'tail': [0, -0.55, 1.3], 'parent': 'neck2'},
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
tail_L = [[0.03, 0.58, 1.02], [0.06, 0.6, 1.3], [0.12, 0.56, 1.62], [0.2, 0.52, 1.88], [0.29, 0.56, 2.02], [0.36, 0.66, 1.98], [0.39, 0.74, 1.82]]
for i in range(6):
    sk['tail%d' % (i + 1)] = {'head': tail_L[i], 'tail': tail_L[i + 1], 'parent': 'pelvis' if i == 0 else 'tail%d' % i}
    sk['tailB%d' % (i + 1)] = {'head': mx(tail_L[i]), 'tail': mx(tail_L[i + 1]), 'parent': 'pelvis' if i == 0 else 'tailB%d' % i}

# ── 毛の房の決まり ──
BODY_FUR = [
    {'from': 0.0, 'to': 0.35, 'every': 1, 'density': 0.75, 'length': [[0, 0.24], [0.35, 0.14]], 'width': 0.32, 'out': 0.55,
     'flow': [0, 0.6, -1], 'flow_k': 1.0, 'jitter': 0.2, 'curl': 0.18},             # 胸・肩のたてがみ（長く下へ）
    {'from': 0.3, 'to': 1.0, 'every': 1, 'density': 0.55, 'length': [[0.3, 0.09], [0.8, 0.07], [1.0, 0.1]], 'width': 0.38, 'out': 0.35,
     'flow': [0, 1, -0.25], 'flow_k': 1.0, 'jitter': 0.15},                          # 背と脇（後ろへ流れる）
    {'from': 0.25, 'to': 0.9, 'every': 1, 'density': 0.6, 'length': [[0, 0.11], [1, 0.12]], 'width': 0.35, 'out': 0.3,
     'flow': [0, 0.3, -1], 'flow_k': 1.0, 'only': 'bottom', 'jitter': 0.2},          # 腹の下の垂れる毛
]
NECK_FUR = [
    {'from': 0.0, 'to': 1.0, 'every': 1, 'density': 0.85, 'length': [[0, 0.26], [0.6, 0.24], [1, 0.18]], 'width': 0.3, 'out': 0.6,
     'flow': [0, 0.2, -1], 'flow_k': 0.9, 'jitter': 0.2, 'curl': 0.2},              # 首のまわりの豊かなたてがみ
]
FORE_FUR = [
    {'from': 0.0, 'to': 0.45, 'every': 1, 'density': 0.6, 'length': [[0, 0.12], [0.45, 0.08]], 'width': 0.38, 'out': 0.3,
     'flow': [0, 0.2, -1], 'flow_k': 1.0, 'jitter': 0.15},
    {'from': 0.15, 'to': 0.85, 'every': 1, 'density': 0.7, 'length': [[0, 0.09], [1, 0.06]], 'width': 0.35, 'out': 0.3,
     'flow': [0, 1, -0.8], 'flow_k': 1.0, 'only': 'back', 'jitter': 0.15},         # 前足の後ろの飾り毛
]
HIND_FUR = [
    {'from': 0.0, 'to': 0.5, 'every': 1, 'density': 0.6, 'length': [[0, 0.12], [0.5, 0.08]], 'width': 0.38, 'out': 0.3,
     'flow': [0, 0.8, -1], 'flow_k': 1.0, 'jitter': 0.15},                          # ももの毛（ズボンのように）
    {'from': 0.5, 'to': 0.85, 'every': 1, 'density': 0.4, 'length': [[0, 0.05], [1, 0.04]], 'width': 0.4, 'out': 0.25,
     'flow': [0, 0.5, -1], 'flow_k': 1.0, 'jitter': 0.1},
]
TAIL_FUR = [
    {'from': 0.05, 'to': 0.97, 'every': 1, 'density': 0.9, 'length': [[0, 0.09], [0.3, 0.15], [0.7, 0.16], [1, 0.1]], 'width': 0.32,
     'out': 0.85, 'flow': [0, 0, 0], 'flow_k': 0.0, 'jitter': 0.25, 'curl': 0.15},  # 尾の房（ふさふさ）
]

tubes = [
    {'name': 'body', 'path': [[0, -0.64, 0.9], [0, -0.46, 0.87], [0, -0.12, 0.82], [0, 0.28, 0.82], [0, 0.58, 0.86]],
     'radius': [[0, 0.24, 0.26], [0.25, 0.26, 0.27], [0.55, 0.21, 0.21], [0.82, 0.24, 0.23], [1.0, 0.2, 0.2]],
     'bones': ['chest', 'spine2', 'spine1', 'pelvis'], 'rings': 46, 'sides': 22, 'up': [0, 0, 1], 'flat_belly': 0.1, 'fur': BODY_FUR},
    {'name': 'neck', 'path': [[0, -0.47, 0.92], [0, -0.52, 1.12], [0, -0.56, 1.32]],
     'radius': [[0, 0.2, 0.2], [0.6, 0.16, 0.16], [1, 0.13, 0.13]], 'bones': ['neck1', 'neck2', 'neck3', 'chest'],
     'rings': 20, 'sides': 18, 'up': [0, -1, 0], 'fur': NECK_FUR},
]
for sd in (1, -1):
    s = 'L' if sd > 0 else 'R'
    f = lambda p: [p[0] * sd, p[1], p[2]]
    tubes.append({'name': 'fore' + s, 'path': [f([0.19, -0.42, 0.84]), f([0.2, -0.43, 0.48]), f([0.2, -0.45, 0.1])],
                  'radius': [[0, 0.12, 0.14], [0.45, 0.085, 0.09], [1, 0.075, 0.075]],
                  'bones': ['foreLeg' + s, 'foreArm' + s], 'rings': 26, 'sides': 14, 'up': [0, -1, 0], 'fur': FORE_FUR})
    tubes.append({'name': 'hind' + s, 'path': [f([0.19, 0.46, 0.84]), f([0.2, 0.36, 0.5]), f([0.2, 0.58, 0.24]), f([0.2, 0.52, 0.08])],
                  'radius': [[0, 0.15, 0.17], [0.35, 0.11, 0.12], [0.65, 0.075, 0.075], [1, 0.07, 0.07]],
                  'bones': ['hindLeg' + s, 'hindShin' + s, 'hindFoot' + s], 'rings': 30, 'sides': 14, 'up': [0, -1, 0], 'fur': HIND_FUR})
    tl = [f(p) for p in tail_L]
    tubes.append({'name': 'tail' + s, 'path': tl,
                  'radius': [[0, 0.06, 0.06], [0.15, 0.075, 0.075], [0.5, 0.085, 0.085], [0.85, 0.07, 0.07], [1, 0.02, 0.02]],
                  'bones': [('tail%d' if sd > 0 else 'tailB%d') % (i + 1) for i in range(6)], 'rings': 40, 'sides': 14, 'up': [0, -1, 0],
                  'fur': TAIL_FUR})

# ── 楕円体: 頭・口先・ほお・あご・足先 ──
HEAD_C = [0, -0.6, 1.45]
ellipsoids = [
    {'c': HEAD_C, 'axes': [[0.155, 0, 0], [0, 0.15, 0], [0, 0, 0.13]], 'bones': ['head'],
     'fur': [{'length': 0.05, 'density': 0.45, 'out': 0.4, 'flow': [0, 1, 0.2], 'flow_k': 1.0, 'max_y': 0.3, 'jitter': 0.1, 'min_z': -0.2}]},
    {'c': [0, -0.715, 1.37], 'axes': [[0.07, 0, 0], [0, 0.055, 0], [0, 0, 0.05]], 'bones': ['head']},               # 口先
    {'c': [0, -0.68, 1.31], 'axes': [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.03]], 'bones': ['jaw']},                  # 下あご
    {'c': [0, -0.765, 1.392], 'axes': [[0.024, 0, 0], [0, 0.012, 0], [0, 0, 0.016]], 'bones': ['head'], 'mat': 'Nose', 'color': '#E7A9BA', 'segs': 12, 'rings': 6},
]
for sd in (1, -1):
    s = 'L' if sd > 0 else 'R'
    ellipsoids.append({'c': [0.1 * sd, -0.63, 1.37], 'axes': [[0.075, 0, 0], [0, 0.07, 0], [0, 0, 0.065]], 'bones': ['head'],
                       'fur': [{'length': 0.15, 'density': 0.7, 'out': 0.7, 'flow': [0.5 * sd, 0.7, -0.6], 'flow_k': 0.9, 'jitter': 0.2,
                                'min_y': -0.75}]})          # ほおの毛（外・後ろ下へ広がる）
    for kind, c, bone in (('fore', [0.2 * sd, -0.52, 0.05], 'forePaw' + s), ('hind', [0.2 * sd, 0.47, 0.05], 'hindFoot' + s)):
        ellipsoids.append({'c': c, 'axes': [[0.1, 0, 0], [0, 0.125, 0], [0, 0, 0.055]], 'bones': [bone],
                           'fur': [{'length': 0.04, 'density': 0.35, 'out': 0.5, 'flow': [0, 0.3, -0.3], 'min_z': 0.0, 'jitter': 0.15}]})
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
    base, tip = [0.095 * sd, -0.57, 1.54], [0.15 * sd, -0.58, 1.75]
    blades.append({'base': base, 'tip': tip, 'w': 0.14, 't': 0.035, 'flat': [0.15 * sd, -1, 0], 'bones': ['head']})
    blades.append({'base': [base[0], base[1] - 0.012, base[2] + 0.015], 'tip': [tip[0] * 0.97, tip[1] - 0.012, tip[2] - 0.03], 'w': 0.095, 't': 0.012,
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
    lines.append({'path': [[0.035 * sd, -0.735, 1.488], [0.08 * sd, -0.725, 1.5], [0.125 * sd, -0.69, 1.525], [0.16 * sd, -0.64, 1.56]],
                  'r': 0.0055, 'start': 0.6, 'end': 0.2, 'mat': 'Mark', 'bones': ['head']})
    lines.append({'path': [[0.075 * sd, -0.728, 1.448], [0.11 * sd, -0.705, 1.455], [0.14 * sd, -0.672, 1.47]],
                  'r': 0.004, 'start': 0.5, 'end': 0.2, 'mat': 'Mark', 'bones': ['head']})
    # ひげ（口先の横から外へ 4 本）
    for k in range(4):
        z = 1.375 - 0.012 * k
        lines.append({'path': [[0.04 * sd, -0.745, z], [0.16 * sd, -0.74 + 0.01 * k, z - 0.01 - 0.008 * k], [0.3 * sd, -0.7 + 0.02 * k, z - 0.04 - 0.02 * k]],
                      'r': 0.0018, 'start': 1.0, 'end': 0.3, 'mat': 'Whisker', 'bones': ['head'], 'sides': 4, 'rings': 10})

eyes = []
for sd in (1, -1):
    eyes.append({'center': [0.068 * sd, -0.722, 1.468], 'axes': [[0.034, 0.008 * sd, 0.006], [0, 0.012, 0], [-0.004 * sd, 0, 0.017]],
                 'out': [0.25 * sd, -1, 0.05], 'pupil_out': 0.006, 'pupil_axes': [[0.0045, 0, 0], [0, 0.004, 0], [0, 0, 0.015]],
                 'glint': [0.006 * sd, 0, 0.006], 'glint_axes': [[0.004, 0, 0], [0, 0.002, 0], [0, 0, 0.004]], 'lid_cap': 0.5})

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
    'expressions': {
        'happy': {'lid': 0.45, 'squint': 0.3}, 'gentle_smile': {'lid': 0.3, 'squint': 0.2},
        'angry': {'lid': 0.35, 'squint': 0.4}, 'sad': {'lid': 0.4}, 'surprised': {'wide': 0.8},
    },
    'idle': {'frames': 120, 'sway': {
        'chest': {'amp': 0.0, 'axis': 'x', 'scale': 0.012},
        'tail2': {'amp': 4, 'axis': 'y'}, 'tail4': {'amp': 6, 'axis': 'y', 'phase': 0.6},
        'tailB2': {'amp': 4, 'axis': 'y', 'phase': 1.6}, 'tailB4': {'amp': 6, 'axis': 'y', 'phase': 2.2},
        'neck2': {'amp': 1.5, 'axis': 'x', 'phase': 0.3}}},
    'ao': {'samples': 24, 'distance': 0.6, 'strength': 0.6},
}
json.dump(cfg, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('build.json ok')
