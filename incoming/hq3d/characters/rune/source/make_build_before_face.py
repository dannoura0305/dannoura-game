# -*- coding: utf-8 -*-
"""ルーンの形の設定（build.json）を作る — 立ち姿（2026-11-06 に利用者がくれた三面図に合わせる）
  python make_build.py  → 同じフォルダに build.json
三面図: 後ろ足で立つ・前足（腕）は下ろして大きな爪・翼は高く上げて手首の上に爪・肩に白い羽のような鱗・
胸に金の鎖と青い宝石と 2 本の青い垂れ幕・長い尾は床に垂れて後ろへ伸びる・頭に後ろへ反る角と尖った冠・背中は重なった濃い青の鱗。
数値はメートルで、三面図から読んだ推測。モデルは -Y を向く。左右対称の部品は左（+x）だけ書いて右を写す。
前の座った姿の設定は make_build_sitting.py に残してある。"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def mx(p):
    return [-p[0], p[1], p[2]]


sk = {
    'root': {'head': [0, 0, 0], 'tail': [0, 0, 0.2], 'parent': None},
    'pelvis': {'head': [0, 0.06, 1.0], 'tail': [0, 0.04, 1.2], 'parent': 'root'},
    'spine1': {'head': [0, 0.04, 1.2], 'tail': [0, 0.03, 1.36], 'parent': 'pelvis'},
    'spine2': {'head': [0, 0.03, 1.36], 'tail': [0, 0.02, 1.5], 'parent': 'spine1'},
    'chest': {'head': [0, 0.02, 1.5], 'tail': [0, 0.0, 1.64], 'parent': 'spine2'},
    'neck1': {'head': [0, 0.0, 1.64], 'tail': [0, -0.02, 1.78], 'parent': 'chest'},
    'neck2': {'head': [0, -0.02, 1.78], 'tail': [0, -0.04, 1.92], 'parent': 'neck1'},
    'neck3': {'head': [0, -0.04, 1.92], 'tail': [0, -0.06, 2.02], 'parent': 'neck2'},
    'head': {'head': [0, -0.06, 2.02], 'tail': [0, -0.36, 2.0], 'parent': 'neck3'},
    'jaw': {'head': [0, -0.07, 1.98], 'tail': [0, -0.34, 1.95], 'parent': 'head'},
    'tail1': {'head': [0, 0.12, 0.92], 'tail': [0, 0.36, 0.62], 'parent': 'pelvis'},
    'tail2': {'head': [0, 0.36, 0.62], 'tail': [0.02, 0.7, 0.3], 'parent': 'tail1'},
    'tail3': {'head': [0.02, 0.7, 0.3], 'tail': [0.12, 1.08, 0.1], 'parent': 'tail2'},
    'tail4': {'head': [0.12, 1.08, 0.1], 'tail': [0.32, 1.42, 0.05], 'parent': 'tail3'},
    'tail5': {'head': [0.32, 1.42, 0.05], 'tail': [0.55, 1.6, 0.05], 'parent': 'tail4'},
    'tail6': {'head': [0.55, 1.6, 0.05], 'tail': [0.72, 1.62, 0.08], 'parent': 'tail5'},
}
left = {
    'foreLeg': {'head': [0.2, 0.02, 1.56], 'tail': [0.33, 0.06, 1.25], 'parent': 'chest'},
    'foreArm': {'head': [0.33, 0.04, 1.25], 'tail': [0.37, -0.14, 0.97], 'parent': 'foreLeg'},
    'forePaw': {'head': [0.37, -0.14, 0.97], 'tail': [0.39, -0.18, 0.8], 'parent': 'foreArm'},
    'hindLeg': {'head': [0.14, 0.05, 1.0], 'tail': [0.19, -0.12, 0.62], 'parent': 'pelvis'},
    'hindShin': {'head': [0.19, -0.12, 0.62], 'tail': [0.2, 0.1, 0.24], 'parent': 'hindLeg'},
    'hindFoot': {'head': [0.2, 0.1, 0.24], 'tail': [0.2, -0.12, 0.04], 'parent': 'hindShin'},
    'wing_root': {'head': [0.12, 0.14, 1.52], 'tail': [0.36, 0.3, 1.86], 'parent': 'chest'},
    'wing_mid': {'head': [0.36, 0.3, 1.86], 'tail': [0.52, 0.24, 2.18], 'parent': 'wing_root'},
    'wing_tip': {'head': [0.52, 0.24, 2.18], 'tail': [0.62, 0.3, 1.7], 'parent': 'wing_mid'},
}


def side_name(n, s):
    if n.startswith('wing_'):
        return 'wing' + s + n[4:]
    return n + s


for n, d in left.items():
    for s, f in (('L', lambda p: p), ('R', mx)):
        sk[side_name(n, s)] = {'head': f(d['head']), 'tail': f(d['tail']),
                              'parent': side_name(d['parent'], s) if d['parent'] in left else d['parent']}

BLUES = ['#4F6CC4', '#3B55A8', '#6B87D6']
cfg = {
    'name': 'rune',
    'seed': 3,
    'note': '三面図（立ち姿）から読んだ形（推測）。青の守護竜',
    'palette': {'scale': '#5F7ED2', 'scale_dark': '#3B55A8', 'belly': '#EEF1F8', 'horn': '#E8E6DC', 'claw': '#15182A',
                'spike': '#DDE5F7', 'gold': '#D9B55C', 'gem': '#2F6BE0', 'eye': '#56A6F2', 'eye_dark': '#0E1A36',
                'membrane': '#5F7ED2', 'membrane_edge': '#EEF0F8', 'mouth': '#3A2338', 'banner': '#2C3F8C'},
    'scale_rows': 14,
    'gem_glow': 0.25,
    'scale_relief': 26.0,
    'ao': {'samples': 48, 'distance': 0.3, 'strength': 0.8},
    'belly_chevron': 4.0,
    'skeleton': sk,
    'body': {
        'path': [[0, -0.07, 2.02], [0, -0.04, 1.9], [0, -0.01, 1.75], [0, 0.01, 1.6], [0, 0.03, 1.42], [0, 0.05, 1.22], [0, 0.07, 1.02],
                 [0, 0.14, 0.86], [0, 0.36, 0.62], [0.02, 0.7, 0.3], [0.12, 1.08, 0.1], [0.32, 1.42, 0.05], [0.55, 1.6, 0.05], [0.72, 1.62, 0.08]],
        'radius': [[0, 0.075, 0.08], [0.06, 0.08, 0.085], [0.11, 0.13, 0.12], [0.16, 0.19, 0.16], [0.22, 0.15, 0.13], [0.27, 0.13, 0.12],
                   [0.31, 0.17, 0.15], [0.36, 0.16, 0.14], [0.5, 0.11, 0.1], [0.7, 0.07, 0.065], [0.88, 0.04, 0.035], [1.0, 0.01, 0.01]],
        'up': [0, 1, 0], 'flat_belly': 0.18, 'rings': 140, 'sides': 22, 'ridge': 0.04,
        'bones': ['neck3', 'neck2', 'neck1', 'chest', 'spine2', 'spine1', 'pelvis', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6'],
    },
    'head': {'path': [[0, -0.03, 2.05], [0, -0.13, 2.075], [0, -0.26, 2.045], [0, -0.39, 2.0]],
             'radius': [[0, 0.085, 0.075], [0.3, 0.078, 0.064], [0.65, 0.048, 0.04], [0.9, 0.024, 0.022], [1, 0.012, 0.012]], 'up': [0, 0, 1]},
    'jaw': {'path': [[0, -0.05, 1.99], [0, -0.2, 1.98], [0, -0.35, 1.965]],
            'radius': [[0, 0.06, 0.034], [0.6, 0.042, 0.022], [1, 0.014, 0.01]], 'up': [0, 0, 1]},
    'mouth': {'center': [0, -0.2, 1.995], 'axes': [[0.03, 0, 0], [0, 0.11, 0], [0, 0, 0.006]]},
    'legs': [], 'horns': [], 'frills': [], 'eyes': [], 'wings': [], 'blades': [], 'brows': [], 'banners': [],
    'back_plates': {'rows': 34, 'from': 0.03, 'to': 0.9, 'angles': [-75, -40, 0, 40, 75], 'stagger': 18,
                    'length': [[0, 0.09], [0.15, 0.11], [0.35, 0.12], [0.6, 0.08], [1, 0.04]], 'width': 0.75, 'out': 0.35, 'down': 0.9,
                    'sink': 0.9, 'thick': 0.01, 'curl': 0.1, 'side_bias': False, 'colors': BLUES},
    'mane': {'rows': 6, 'from': 0.0, 'to': 0.09, 'angles': [-30, 0, 30], 'length': [[0, 0.18], [1, 0.13]],
             'width': 0.35, 'out': 0.75, 'down': 0.65, 'colors': ['#EEF2FB', '#4F6CC4', '#C9D4F0', '#3B55A8']},
    'pendant': {'chain': [[0.17, 0.0, 1.62], [0.13, -0.13, 1.54], [0.0, -0.18, 1.46], [-0.13, -0.13, 1.54], [-0.17, 0.0, 1.62], [-0.08, 0.1, 1.66], [0.08, 0.1, 1.66]],
                'chain_r': 0.007, 'gem': [0, -0.215, 1.42], 'gem_size': [0.042, 0.07, 0.028], 'gem_back': True, 'drapes': []},
    'idle': {'frames': 120, 'sway': {
        'chest': {'amp': 1.0, 'axis': 'x', 'scale': 0.01},
        'neck1': {'amp': 1.5, 'axis': 'x', 'phase': 0.6},
        'tail3': {'amp': 4, 'axis': 'z', 'phase': 0.0},
        'tail4': {'amp': 6, 'axis': 'z', 'phase': 0.6},
        'tail5': {'amp': 8, 'axis': 'z', 'phase': 1.2},
        'tail6': {'amp': 10, 'axis': 'z', 'phase': 1.8},
        'wingL_root': {'amp': 2.0, 'axis': 'y', 'phase': 0.3},
        'wingR_root': {'amp': -2.0, 'axis': 'y', 'phase': 0.3},
    }},
}

for s, f in (('L', lambda p: p), ('R', mx)):
    sgn = 1 if s == 'L' else -1
    # 腕（前足）: 肩から下ろし、ひじは少し後ろ、手は太ももの横で大きな爪 4 本が下を向く
    cfg['legs'].append({'path': [f(p) for p in [[0.18, 0.02, 1.58], [0.27, 0.04, 1.43], [0.33, 0.04, 1.25], [0.37, -0.14, 0.97], [0.39, -0.18, 0.84]]],
                        'radius': [[0, 0.1, 0.1], [0.25, 0.08, 0.08], [0.48, 0.062, 0.062], [0.7, 0.07, 0.065], [0.86, 0.05, 0.045], [1, 0.075, 0.04]],
                        'bones': ['foreLeg' + s, 'foreArm' + s, 'forePaw' + s],
                        'claws': [{'base': f([0.39 + 0.028 * k, -0.2 + 0.01 * abs(k), 0.82]), 'tip': f([0.4 + 0.04 * k, -0.25, 0.64]), 'r': 0.02,
                                   'bend': [0, 0.04, 0.0]} for k in (-1.3, -0.45, 0.45, 1.3)]})
    # 後ろ足: 太い太もも・前へ出るひざ・後ろへ戻るかかと（つま先立ち）・前へ伸びる足に爪 3 本
    cfg['legs'].append({'path': [f(p) for p in [[0.13, 0.06, 1.02], [0.19, -0.05, 0.82], [0.2, -0.12, 0.62], [0.21, 0.1, 0.24], [0.21, -0.04, 0.07], [0.21, -0.2, 0.04]]],
                        'radius': [[0, 0.17, 0.19], [0.2, 0.17, 0.18], [0.38, 0.1, 0.1], [0.55, 0.065, 0.065], [0.72, 0.05, 0.05], [0.86, 0.08, 0.05], [1, 0.08, 0.035]],
                        'bones': ['hindLeg' + s, 'hindShin' + s, 'hindFoot' + s], 'up': [0, 0, 1],
                        'claws': [{'base': f([0.21 + 0.035 * k, -0.24, 0.04]), 'tip': f([0.21 + 0.05 * k, -0.36, 0.0]), 'r': 0.024, 'bend': [0, -0.01, -0.03]} for k in (-1.5, -0.5, 0.5, 1.5)]
                        + [{'base': f([0.2, 0.08, 0.06]), 'tip': f([0.21, 0.14, 0.0]), 'r': 0.015}]})
    # 頭: 後ろへ反って長く伸びる角（横から見える）・小さな角・まゆの上の角
    cfg['horns'].append({'base': f([0.05, -0.04, 2.12]), 'tip': f([0.09, 0.32, 2.27]), 'r': 0.022, 'bend': f([0.0, 0.0, 0.06])})
    cfg['horns'].append({'base': f([0.07, -0.02, 2.08]), 'tip': f([0.13, 0.14, 2.12]), 'r': 0.016, 'bend': f([0.02, 0.0, 0.02])})
    cfg['horns'].append({'base': f([0.05, -0.16, 2.1]), 'tip': f([0.07, -0.08, 2.15]), 'r': 0.011})
    cfg['brows'].append({'base': f([0.045, -0.22, 2.09]), 'tip': f([0.08, -0.14, 2.105]), 'r': 0.014})
    cfg['brows'].append({'base': f([0.014, -0.35, 2.01]), 'tip': f([0.02, -0.32, 2.025]), 'r': 0.008, 'kind': 'nose'})
    # 頭の冠: 頭のてっぺんから後ろ上へ立つ尖った刃（白と青）
    for i, (x, y, z, L, tone) in enumerate([(0.0, -0.12, 2.1, 0.15, 1), (0.02, -0.08, 2.12, 0.2, 0), (0.04, -0.05, 2.12, 0.23, 1),
                                            (0.06, -0.02, 2.11, 0.21, 0), (0.08, 0.01, 2.08, 0.19, 1), (0.09, 0.03, 2.04, 0.16, 2),
                                            (0.08, 0.05, 2.0, 0.14, 1), (0.06, 0.07, 1.96, 0.12, 0)]):
        L = L * 1.35
        tip = [x + 0.03 + 0.018 * i, y + L * 0.5, z + L * 0.88]
        cfg['blades'].append({'base': f([x, y, z]), 'tip': f(tip), 'w': 0.05, 'flat': f([1, 0, 0.2]), 'tone': tone,
                              'color': ['#EEF2FB', '#4F6CC4', '#C9D4F0'][tone], 'curl': -0.08})
    for i, (y, z, L) in enumerate([(-0.15, 2.0, 0.09), (-0.09, 1.98, 0.11), (-0.03, 1.96, 0.1)]):  # 頬の刃
        cfg['blades'].append({'base': f([0.07, y, z]), 'tip': f([0.13, y + L, z - 0.03]), 'w': 0.035, 'flat': f([1, 0, 0.2]), 'tone': 2, 'color': '#C9D4F0'})
    # 目
    out = [sgn * 0.94, -0.33, 0.08]
    cfg['eyes'].append({'center': f([0.064, -0.17, 2.075]), 'axes': [[0, 0.03, 0], [sgn * 0.011, 0, 0], [0, 0, 0.017]],
                        'out': out, 'pupil_out': 0.01, 'pupil_axes': [[0, 0.007, 0], [sgn * 0.003, 0, 0], [0, 0, 0.015]],
                        'glint': [0, -0.004, 0.004], 'glint_axes': [[0, 0.002, 0], [sgn * 0.0015, 0, 0], [0, 0, 0.002]]})
    # 翼: 肩の後ろから上へ、手首は頭の高さ（上に爪）、膜は長く下へ垂れる
    root, el, wr = [0.12, 0.14, 1.52], [0.3, 0.3, 1.8], [0.4, 0.26, 2.02]
    fl = [[0.86, 0.5, 0.95], [0.8, 0.64, 0.32], [0.62, 0.66, 0.42], [0.42, 0.6, 0.58]]   # 外の指先（前縁の弧の先・低く）→ 内の指先
    elbow, wrist = f(el), f(wr)
    fingers = [f(p) for p in fl]
    edge = [[0.24, 0.48, 0.8], [0.17, 0.3, 1.14], [0.12, 0.14, 1.52]]
    import math as _m
    lead = [[0.4 + 0.46 * t + 0.2 * _m.sin(_m.pi * t), 0.26 + 0.24 * t, 2.02 - 1.07 * t + 0.12 * _m.sin(_m.pi * t)] for t in (0.2, 0.4, 0.6, 0.8)]
    outline = [f(wr)] + [f(p) for p in lead] + [f(fl[0])]   # 前縁: 外へふくらむ弧（三面図の翼の肩）
    prev = fl[0]
    for p in fl[1:] + [edge[0]]:  # 指と指の間は深い弧でえぐる（三面図の波形のふち）
        for t in (0.2, 0.4, 0.6, 0.8):
            m = [a + (b - a) * t for a, b in zip(prev, p)]
            k = 0.3 * _m.sin(_m.pi * t)
            outline.append(f([mm + (w - mm) * k for mm, w in zip(m, wr)]))
        outline.append(f(p))
        prev = p
    outline += [f(p) for p in edge[1:]] + [f(el)]
    cfg['wings'].append({'arm': [f(root), elbow, wrist], 'arm_radius': [[0, 0.06, 0.06], [0.5, 0.04, 0.04], [1, 0.03, 0.03]],
                         'fingers': fingers, 'outline': outline, 'white_by_height': True,
                         'finger_mids': [f(lead[1])] + [None] * (len(fl) - 1),
                         'bones': ['wing' + s + '_root', 'wing' + s + '_mid', 'wing' + s + '_tip'], 'body_bone': 'chest',
                         'sag': [sgn * 0.02, 0.05, 0], 'finger_bow': [sgn * 0.01, 0.02, 0], 'up': [0, 0, 1]})
    cfg['horns'].append({'base': f([0.4, 0.26, 2.01]), 'tip': f([0.37, 0.21, 2.14]), 'r': 0.022, 'bend': f([-0.03, 0.0, 0.0])})  # 翼の手首の爪
    for k, (y0, z0, L) in enumerate([(0.08, 1.27, 0.11), (0.06, 1.2, 0.08)]):  # ひじのとげ（後ろ下へ）
        cfg['blades'].append({'base': f([0.34, y0, z0]), 'tip': f([0.37, y0 + L, z0 - L * 0.5]), 'w': 0.035, 'flat': f([1, 0, 0]),
                              'tone': 0, 'color': '#EEF2FB', 'bone': 'foreLeg' + s, 'curl': 0.05})
    # 胸の垂れ幕（金のひし形と房）
    cfg['banners'].append({'path': [f([0.17, -0.12, 1.6]), f([0.18, -0.15, 1.4]), f([0.18, -0.13, 1.2]), f([0.18, -0.1, 1.02])], 'w': 0.022,
                           'diamond': f([0.18, -0.155, 1.33]), 'tassel': 0.08, 'bones': ['chest', 'spine2', 'spine1']})
    # 肩から胸の宝石へ垂れる鎖
    cfg['pendant']['drapes'].append([f([0.22, 0.04, 1.6]), f([0.24, -0.1, 1.5]), f([0.14, -0.2, 1.44]), f([0.04, -0.2, 1.43])])
    cfg['pendant']['drapes'].append([f([0.2, 0.06, 1.62]), f([0.25, -0.08, 1.42]), f([0.16, -0.19, 1.3]), f([0.0, -0.2, 1.27])])
    cfg['pendant']['drapes'].append([f([0.24, 0.02, 1.56]), f([0.27, 0.16, 1.46]), f([0.12, 0.24, 1.38]), f([0.0, 0.24, 1.36])])  # 背中側

# 肩の白い羽のような鱗（腕の付け根）
for i, lg in enumerate(cfg['legs']):
    if 'foreLeg' in lg['bones'][0]:
        sgn = 1 if lg['path'][0][0] > 0 else -1
        cfg.setdefault('leg_plates', []).append({
            'leg': i, 'rows': 5, 'from': 0.0, 'to': 0.32, 'angles': [sgn * 0, sgn * 30, sgn * 60, sgn * 90, sgn * 120, sgn * 150, 180],
            'length': [[0, 0.24], [0.5, 0.2], [1, 0.15]], 'width': 0.55, 'out': 0.22, 'down': 1.0, 'sink': 1.0,
            'thick': 0.008, 'curl': 0.12, 'side_bias': False, 'stagger': 20,
            'colors': ['#F2F4FA', '#DDE3F2', '#C9D4F0']})

for i, lg in enumerate(cfg['legs']):
    if 'hindLeg' in lg['bones'][0]:
        sgn = 1 if lg['path'][0][0] > 0 else -1
        cfg['leg_plates'].append({
            'leg': i, 'rows': 12, 'from': 0.02, 'to': 0.34, 'angles': [sgn * 15, sgn * 40, sgn * 65, sgn * 90, sgn * 115, sgn * 140], 'stagger': 12,
            'length': [[0, 0.055], [1, 0.045]], 'width': 0.95, 'out': 0.012, 'down': 1.0, 'sink': 1.0,
            'thick': 0.005, 'curl': -0.05, 'side_bias': False, 'colors': ['#5F7ED2', '#5675CB', '#6886D8'], 'prefix': 'Thigh'})

ex = {
    'calm': {'lid': 0.3},
    'gentle_smile': {'lid': 0.45, 'squint': 0.8, 'brow': [0.006, 0.0]},
    'thinking': {'lid': 0.5, 'brow_side': {'L': 0.014, 'R': -0.006}},
    'serious': {'lid': 0.2, 'brow': [-0.016, -0.008]},
    'quiet_sorrow': {'lid': 0.6, 'brow_inner': 0.02},
    'guarding_eyes': {'lid': 0.3, 'brow': [-0.018, -0.01], 'squint': 0.3},
    'awkward': {'lid': 0.25, 'brow_inner': 0.012, 'brow_side': {'L': 0.008}},
}
ex.update({'relaxed': ex['calm'], 'happy': ex['gentle_smile'], 'sad': ex['quiet_sorrow'], 'angry': ex['guarding_eyes'],
           'surprised': {'wide': 0.8, 'brow': [0.02, 0.0]}})
cfg['expressions'] = ex

json.dump(cfg, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('bones', len(sk))
