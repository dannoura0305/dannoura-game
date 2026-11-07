# -*- coding: utf-8 -*-
"""ルーンの形の設定（build.json）を作る。左右対称の部品は左（+x）だけ書いて右を写す。
  python make_build.py  → 同じフォルダに build.json
数値はメートル。モデルは -Y を向いて座っている（前足を床につけ、後ろ足を折り、尾を体の横へ回す）。
設定画（cast-engine/reference/rune_charactersheet.webp）から読んだ形で、数値は推測。"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def mx(p):
    return [-p[0], p[1], p[2]]


sk = {
    'root': {'head': [0, 0, 0], 'tail': [0, 0, 0.2], 'parent': None},
    'pelvis': {'head': [0, 0.22, 0.55], 'tail': [0, 0.12, 0.85], 'parent': 'root'},
    'spine1': {'head': [0, 0.12, 0.85], 'tail': [0, 0.04, 1.1], 'parent': 'pelvis'},
    'spine2': {'head': [0, 0.04, 1.1], 'tail': [0, -0.02, 1.32], 'parent': 'spine1'},
    'chest': {'head': [0, -0.02, 1.32], 'tail': [0, -0.06, 1.5], 'parent': 'spine2'},
    'neck1': {'head': [0, -0.06, 1.5], 'tail': [0, -0.1, 1.7], 'parent': 'chest'},
    'neck2': {'head': [0, -0.1, 1.7], 'tail': [0, -0.14, 1.9], 'parent': 'neck1'},
    'neck3': {'head': [0, -0.14, 1.9], 'tail': [0, -0.17, 2.05], 'parent': 'neck2'},
    'head': {'head': [0, -0.17, 2.05], 'tail': [0, -0.52, 2.02], 'parent': 'neck3'},
    'jaw': {'head': [0, -0.17, 1.99], 'tail': [0, -0.5, 1.95], 'parent': 'head'},
    'tail1': {'head': [0, 0.3, 0.45], 'tail': [0, 0.48, 0.22], 'parent': 'pelvis'},
    'tail2': {'head': [0, 0.48, 0.22], 'tail': [0.2, 0.75, 0.08], 'parent': 'tail1'},
    'tail3': {'head': [0.2, 0.75, 0.08], 'tail': [0.55, 0.85, 0.06], 'parent': 'tail2'},
    'tail4': {'head': [0.55, 0.85, 0.06], 'tail': [0.85, 0.65, 0.06], 'parent': 'tail3'},
    'tail5': {'head': [0.85, 0.65, 0.06], 'tail': [1.0, 0.3, 0.06], 'parent': 'tail4'},
    'tail6': {'head': [1.0, 0.3, 0.06], 'tail': [0.95, 0.0, 0.07], 'parent': 'tail5'},
}
left = {
    'foreLeg': {'head': [0.2, -0.06, 1.32], 'tail': [0.36, -0.05, 0.86], 'parent': 'chest'},
    'foreArm': {'head': [0.36, -0.05, 0.86], 'tail': [0.31, -0.25, 0.18], 'parent': 'foreLeg'},
    'forePaw': {'head': [0.31, -0.25, 0.18], 'tail': [0.31, -0.42, 0.04], 'parent': 'foreArm'},
    'hindLeg': {'head': [0.2, 0.22, 0.65], 'tail': [0.32, -0.06, 0.42], 'parent': 'pelvis'},
    'hindShin': {'head': [0.32, -0.06, 0.42], 'tail': [0.3, 0.18, 0.13], 'parent': 'hindLeg'},
    'hindFoot': {'head': [0.3, 0.18, 0.13], 'tail': [0.3, -0.14, 0.04], 'parent': 'hindShin'},
    'wing_root': {'head': [0.14, 0.18, 1.4], 'tail': [0.5, 0.42, 2.02], 'parent': 'chest'},
    'wing_mid': {'head': [0.5, 0.42, 2.02], 'tail': [0.82, 0.78, 1.62], 'parent': 'wing_root'},
    'wing_tip': {'head': [0.82, 0.78, 1.62], 'tail': [0.98, 0.92, 1.1], 'parent': 'wing_mid'},
}


def side_name(n, s):
    if n.startswith('wing_'):
        return 'wing' + s + n[4:]
    return n + s


for n, d in left.items():
    for s, f in (('L', lambda p: p), ('R', mx)):
        sk[side_name(n, s)] = {'head': f(d['head']), 'tail': f(d['tail']),
                              'parent': side_name(d['parent'], s) if d['parent'] in left else d['parent']}

cfg = {
    'name': 'rune',
    'seed': 3,
    'note': '設定画から読んだ形（推測）。青の守護竜・座った姿・ペンダント',
    'palette': {'scale': '#6E8CDC', 'scale_dark': '#3F58AE', 'belly': '#EEF1F8', 'horn': '#E4E9F4', 'claw': '#15182A',
                'spike': '#DDE5F7', 'gold': '#D9B55C', 'gem': '#3C86F0', 'eye': '#56A6F2', 'eye_dark': '#0E1A36',
                'membrane': '#8496DA', 'mouth': '#3A2338'},
    'scale_rows': 9,
    'skeleton': sk,
    'body': {
        'path': [[0, -0.18, 2.05], [0, -0.14, 1.9], [0, -0.1, 1.7], [0, -0.05, 1.48], [0, 0.02, 1.2], [0, 0.12, 0.9], [0, 0.24, 0.6],
                 [0, 0.34, 0.38], [0, 0.48, 0.2], [0.2, 0.75, 0.08], [0.55, 0.85, 0.06], [0.85, 0.65, 0.06], [1.0, 0.3, 0.06], [0.95, 0.02, 0.07]],
        'radius': [[0, 0.14, 0.15], [0.06, 0.17, 0.18], [0.15, 0.3, 0.28], [0.23, 0.43, 0.36], [0.32, 0.41, 0.35], [0.4, 0.32, 0.29],
                   [0.48, 0.19, 0.17], [0.65, 0.12, 0.11], [0.85, 0.065, 0.06], [1.0, 0.014, 0.014]],
        'up': [0, 1, 0], 'flat_belly': 0.22, 'rings': 110, 'sides': 22, 'ridge': 0.05,
        'bones': ['neck3', 'neck2', 'neck1', 'chest', 'spine2', 'spine1', 'pelvis', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6'],
    },
    'head': {'path': [[0, -0.1, 2.07], [0, -0.22, 2.09], [0, -0.38, 2.06], [0, -0.53, 2.0]],
             'radius': [[0, 0.13, 0.11], [0.3, 0.12, 0.085], [0.65, 0.08, 0.055], [1, 0.042, 0.03]], 'up': [0, 0, 1]},
    'jaw': {'path': [[0, -0.16, 2.0], [0, -0.32, 1.995], [0, -0.5, 1.985]],
            'radius': [[0, 0.095, 0.05], [0.6, 0.07, 0.035], [1, 0.034, 0.02]], 'up': [0, 0, 1]},
    'mouth': {'center': [0, -0.33, 2.012], 'axes': [[0.045, 0, 0], [0, 0.15, 0], [0, 0, 0.008]]},
    'legs': [], 'horns': [], 'frills': [], 'eyes': [], 'wings': [],
    'spines': {'count': 30, 'from': 0.12, 'to': 0.85, 'height': [[0, 0.06], [0.3, 0.08], [0.6, 0.05], [1, 0.025]]},
    'mane': {'rows': 8, 'from': 0.035, 'to': 0.14, 'angles': [-118, -88, -58, -28, 28, 58, 88, 118], 'length': [[0, 0.17], [0.07, 0.15], [0.13, 0.1]],
             'width': 0.42, 'out': 0.8, 'down': 0.6, 'colors': ['#EEF2FB', '#6F89D6', '#C9D4F0', '#4E69C2']},
    'pendant': {'chain': [[0.22, -0.02, 1.5], [0.16, -0.24, 1.4], [0.0, -0.31, 1.3], [-0.16, -0.24, 1.4], [-0.22, -0.02, 1.5], [-0.1, 0.16, 1.56], [0.1, 0.16, 1.56]],
                'chain_r': 0.008, 'gem': [0, -0.35, 1.25], 'gem_size': [0.05, 0.085, 0.025],
                'tassel': {'top': [0, -0.36, 1.13], 'bottom': [0, -0.36, 0.92], 'w': 0.04}},
    'idle': {'frames': 120, 'sway': {
        'chest': {'amp': 1.2, 'axis': 'x', 'scale': 0.01},
        'neck1': {'amp': 1.5, 'axis': 'x', 'phase': 0.6},
        'tail3': {'amp': 5, 'axis': 'z', 'phase': 0.0},
        'tail4': {'amp': 7, 'axis': 'z', 'phase': 0.6},
        'tail5': {'amp': 9, 'axis': 'z', 'phase': 1.2},
        'tail6': {'amp': 12, 'axis': 'z', 'phase': 1.8},
        'wingL_root': {'amp': 2.5, 'axis': 'x', 'phase': 0.3},
        'wingR_root': {'amp': 2.5, 'axis': 'x', 'phase': 0.3},
    }},
}

for s, f in (('L', lambda p: p), ('R', mx)):
    sgn = 1 if s == 'L' else -1
    cfg['legs'].append({'path': [f(p) for p in [[0.18, -0.06, 1.36], [0.3, -0.07, 1.12], [0.36, -0.05, 0.86], [0.34, -0.15, 0.5], [0.31, -0.25, 0.18], [0.31, -0.4, 0.06]]],
                        'radius': [[0, 0.2, 0.21], [0.12, 0.22, 0.2], [0.3, 0.15, 0.15], [0.45, 0.16, 0.15], [0.62, 0.12, 0.12], [0.82, 0.1, 0.1], [1, 0.12, 0.06]],
                        'bones': ['foreLeg' + s, 'foreArm' + s, 'forePaw' + s],
                        'claws': [{'base': f([0.31 + 0.035 * k, -0.46, 0.05]), 'tip': f([0.31 + 0.05 * k, -0.59, -0.0]), 'r': 0.026, 'bend': [0, -0.01, -0.04]} for k in (-1.3, -0.45, 0.45, 1.3)]})
    cfg['legs'].append({'path': [f(p) for p in [[0.2, 0.22, 0.66], [0.32, -0.06, 0.42], [0.3, 0.18, 0.13], [0.3, -0.12, 0.05]]],
                        'radius': [[0, 0.22, 0.24], [0.35, 0.17, 0.18], [0.7, 0.09, 0.09], [1, 0.075, 0.05]],
                        'bones': ['hindLeg' + s, 'hindShin' + s, 'hindFoot' + s],
                        'claws': [{'base': f([0.3 + 0.03 * k, -0.15, 0.05]), 'tip': f([0.3 + 0.04 * k, -0.24, 0.0]), 'r': 0.016, 'bend': [0, 0, -0.02]} for k in (-1, 0, 1)]})
    # 角: 大きな 2 本は後ろへ反って伸び、小さな 2 本はその下
    cfg['horns'].append({'base': f([0.07, -0.1, 2.18]), 'tip': f([0.15, 0.28, 2.36]), 'r': 0.038, 'bend': f([0.0, 0.0, 0.08])})
    cfg['horns'].append({'base': f([0.1, -0.08, 2.11]), 'tip': f([0.2, 0.16, 2.12]), 'r': 0.024, 'bend': f([0.03, 0.0, 0.03])})
    cfg['horns'].append({'base': f([0.07, -0.25, 2.135]), 'tip': f([0.1, -0.15, 2.2]), 'r': 0.016})  # まゆの上の小さな角
    cfg['brows'] = cfg.get('brows', []) + [{'base': f([0.07, -0.33, 2.15]), 'tip': f([0.12, -0.22, 2.17]), 'r': 0.016}]
    cfg['brows'].append({'base': f([0.02, -0.5, 2.03]), 'tip': f([0.03, -0.46, 2.05]), 'r': 0.012, 'kind': 'nose'})  # 鼻の穴のふくらみ
    # 頭の冠: 頭の後ろから後ろ上へ反る大きな刃（2 段）
    cfg.setdefault('blades', [])
    for i, (x, z, L, tone) in enumerate([(0.03, 2.2, 0.26, 0), (0.07, 2.18, 0.24, 1), (0.11, 2.14, 0.2, 0), (0.12, 2.08, 0.18, 1), (0.1, 2.02, 0.16, 2)]):
        base = [x, -0.06 + 0.01 * i, z]
        tip = [x + 0.06 + 0.02 * i, base[1] + L, z + 0.12 - 0.04 * i]
        cfg['blades'].append({'base': f(base), 'tip': f(tip), 'w': 0.08, 'flat': f([1, 0, 0.3]), 'tone': tone, 'color': ['#EEF2FB', '#6F89D6', '#C9D4F0'][tone], 'curl': -0.1})
    # 頬の扇: 顔の横を縁どる刃（外へ広がり、正面から見える）
    for i, (z, L, tone) in enumerate([(2.15, 0.17, 0), (2.09, 0.19, 1), (2.03, 0.18, 0), (1.97, 0.15, 2)]):
        base = [0.1, -0.02, z]
        tip = [0.1 + L * 0.8, 0.04, z + (i - 1.5) * 0.05]
        cfg['blades'].append({'base': f(base), 'tip': f(tip), 'w': 0.065, 'flat': [0, 1, 0], 'tone': tone, 'color': ['#EEF2FB', '#6F89D6', '#C9D4F0'][tone], 'curl': 0.05})
    # 頬とあごの刃（後ろへ）
    for i, (y, z, L) in enumerate([(-0.2, 2.03, 0.13), (-0.14, 2.0, 0.15), (-0.08, 1.97, 0.14)]):
        cfg['blades'].append({'base': f([0.1, y, z]), 'tip': f([0.17, y + L, z - 0.04]), 'w': 0.05, 'flat': f([1, 0, 0.2]), 'tone': 2, 'color': '#C9D4F0'})
    for i in range(5):  # 頬のとげ
        z = 1.99 + i * 0.02
        cfg['frills'].append({'base': f([0.09, -0.2 + i * 0.02, z]), 'tip': f([0.15, -0.12 + i * 0.03, z - 0.03]), 'r': 0.012, 'blue': 0.2, 'bone': 'head'})
    for i in range(6):  # 首の横のひれ
        z = 1.6 + i * 0.07
        cfg['frills'].append({'base': f([0.12 - i * 0.004, -0.02 - i * 0.015, z]), 'tip': f([0.2, 0.05 - i * 0.012, z + 0.02]), 'r': 0.014, 'blue': 0.4, 'bone': 'neck2'})
    # 目（横を向き、少し前へ）
    out = [sgn * 0.94, -0.33, 0.08]
    cfg['eyes'].append({'center': f([0.098, -0.27, 2.115]), 'axes': [[0, 0.044, 0], [sgn * 0.015, 0, 0], [0, 0, 0.025]],
                        'out': out, 'pupil_out': 0.013, 'pupil_axes': [[0, 0.01, 0], [sgn * 0.003, 0, 0], [0, 0, 0.021]],
                        'glint': [0, -0.006, 0.006], 'glint_axes': [[0, 0.003, 0], [sgn * 0.002, 0, 0], [0, 0, 0.003]]})
    # 翼（半分たたみ、背中で立てる）
    root, el, wr = [0.14, 0.18, 1.4], [0.5, 0.42, 2.02], [0.82, 0.78, 1.62]
    fl = [[1.02, 0.95, 1.02], [0.95, 0.95, 0.62], [0.78, 0.86, 0.42], [0.55, 0.7, 0.48]]   # 外の指先 → 内の指先（下へ垂れる）
    elbow, wrist = f(el), f(wr)
    fingers = [f(p) for p in fl]
    edge = [[0.36, 0.5, 0.62], [0.22, 0.32, 0.95], [0.14, 0.18, 1.4]]
    outline = [elbow]
    prev = el
    for p in fl:  # 指と指の間は手首の方へ 18% へこませる（波形のふち）
        m = [(a + b) / 2 for a, b in zip(prev, p)]
        m = [mm + (w - mm) * 0.18 for mm, w in zip(m, wr)]
        outline += [f(m), f(p)]
        prev = p
    mid = [(a + b) / 2 for a, b in zip(fl[-1], edge[0])]
    outline += [f([mm + (w - mm) * 0.12 for mm, w in zip(mid, wr)])] + [f(p) for p in edge] + [f([0.3, 0.32, 1.72])]
    cfg['wings'].append({'arm': [f(root), elbow, wrist], 'arm_radius': [[0, 0.07, 0.07], [0.5, 0.045, 0.045], [1, 0.03, 0.03]],
                         'fingers': fingers, 'outline': outline,
                         'bones': ['wing' + s + '_root', 'wing' + s + '_mid', 'wing' + s + '_tip'], 'body_bone': 'chest',
                         'sag': [sgn * 0.04, 0.03, 0], 'finger_bow': [sgn * 0.02, 0.0, 0], 'up': [0, 0, 1]})
    # 肩から胸の宝石へ垂れる鎖
    cfg['pendant'].setdefault('drapes', []).append([f([0.26, 0.02, 1.52]), f([0.3, -0.24, 1.38]), f([0.18, -0.36, 1.27]), f([0.04, -0.35, 1.27])])

# 肩と腕の重なった鱗（前足だけ。外側の面）
for i, lg in enumerate(cfg['legs']):
    if 'foreLeg' in lg['bones'][0]:
        sgn = 1 if lg['path'][0][0] > 0 else -1
        cfg.setdefault('leg_plates', []).append({
            'leg': i, 'rows': 5, 'from': 0.04, 'to': 0.42, 'angles': [sgn * 40, sgn * 75, sgn * 110, sgn * 145],
            'length': [[0, 0.16], [0.5, 0.12], [1, 0.1]], 'width': 0.7, 'out': 0.25, 'down': 0.95, 'sink': 0.92,
            'thick': 0.01, 'curl': 0.15, 'side_bias': False, 'stagger': 18,
            'colors': ['#7C97DE', '#5B78CC', '#A9BBEA']})

# 表情（Cast Profile の表情名と VRM の標準名の両方）
ex = {
    'calm': {'lid': 0.3},
    'gentle_smile': {'lid': 0.45, 'squint': 0.8, 'brow': [0.008, 0.0]},
    'thinking': {'lid': 0.5, 'brow_side': {'L': 0.018, 'R': -0.008}},
    'serious': {'lid': 0.2, 'brow': [-0.02, -0.01]},
    'quiet_sorrow': {'lid': 0.6, 'brow_inner': 0.025},
    'guarding_eyes': {'lid': 0.3, 'brow': [-0.022, -0.012], 'squint': 0.3},
    'awkward': {'lid': 0.25, 'brow_inner': 0.015, 'brow_side': {'L': 0.01}},
}
ex.update({'relaxed': ex['calm'], 'happy': ex['gentle_smile'], 'sad': ex['quiet_sorrow'], 'angry': ex['guarding_eyes'],
           'surprised': {'wide': 0.8, 'brow': [0.025, 0.0]}})
cfg['expressions'] = ex

# 頭を大きく: 首の先（頭の付け根）を中心に 1.15 倍
PIV = [0, -0.17, 2.05]
K = 1.15


def sc(p):
    return [PIV[i] + (p[i] - PIV[i]) * K for i in range(3)]


def sv(v):
    return [x * K for x in v]


for key in ('head', 'jaw'):
    cfg[key]['path'] = [sc(p) for p in cfg[key]['path']]
    cfg[key]['radius'] = [[r[0], r[1] * K, r[2] * K] for r in cfg[key]['radius']]
cfg['mouth']['center'] = sc(cfg['mouth']['center'])
cfg['mouth']['axes'] = [sv(a) for a in cfg['mouth']['axes']]
for e in cfg['eyes']:
    e['center'] = sc(e['center'])
    e['axes'] = [sv(a) for a in e['axes']]
    e['pupil_axes'] = [sv(a) for a in e['pupil_axes']]
for lst in ('horns', 'brows'):
    for h in cfg.get(lst, []):
        h['base'], h['tip'] = sc(h['base']), sc(h['tip'])
        h['r'] *= K
        if h.get('bend'):
            h['bend'] = sv(h['bend'])
for fr in cfg['frills']:
    if fr.get('bone', 'head') == 'head':
        fr['base'], fr['tip'] = sc(fr['base']), sc(fr['tip'])
for bl in cfg.get('blades', []):
    if bl.get('bone', 'head') == 'head':
        bl['base'], bl['tip'] = sc(bl['base']), sc(bl['tip'])
        bl['w'] *= K
for b in ('head', 'jaw'):
    sk[b]['tail'] = sc(sk[b]['tail'])
    if b == 'jaw':
        sk[b]['head'] = sc(sk[b]['head'])

json.dump(cfg, open(os.path.join(HERE, 'build.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('bones', len(sk))
