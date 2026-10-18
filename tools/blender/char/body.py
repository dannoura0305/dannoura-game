# -*- coding: utf-8 -*-
"""
体の寸法（骨の位置）と体の形（SDF）。T ポーズ・glTF の座標（Y 上・+Z 前・X＝キャラクターの左）。
  male_slim：だんのうら（164cm・細身の若い男性：肩幅 > 腰幅・胸は平ら・のど仏・男性の手足）
  female：相棒（158cm・実用的な普段着の女性）
服は体の形をふくらませて作る（clothes.py）。見える肌は顔・首・手だけ（体の肌は服の下で作らない）。
"""
import numpy as np

import sdf as S

FINGER_ORDER = ['Thumb', 'Index', 'Middle', 'Ring', 'Little']


def _rot_y(v, a):
    c, s = np.cos(a), np.sin(a)
    return np.array([c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]])


def make_spec(kind='male_slim'):
    if kind == 'male_slim':
        k = 1.0
        B = dict(kind=kind, height=1.64, sex='male',
                 shoulderW=0.37, hipW=0.30, crotchY=0.785,
                 neckR=0.049, wristR=0.027,
                 palm=dict(len=0.098, width=0.084, thick=0.029), finger_r=[0.0118, 0.0098, 0.0101, 0.0095, 0.0083],
                 finger_len=[[0.045, 0.034, 0.029], [0.043, 0.026, 0.022], [0.047, 0.029, 0.024], [0.044, 0.027, 0.023], [0.035, 0.021, 0.02]],
                 foot_len=0.25)
        J = {
            'hips': (0, 0.885, -0.005), 'spine': (0, 0.99, -0.01), 'chest': (0, 1.10, -0.014), 'upperChest': (0, 1.215, -0.02),
            'neck': (0, 1.368, -0.024), 'head': (0, 1.445, -0.016),
            'leftShoulder': (0.024, 1.338, -0.022), 'leftUpperArm': (0.168, 1.338, -0.03), 'leftLowerArm': (0.432, 1.338, -0.034), 'leftHand': (0.666, 1.338, -0.03),
            # 脚：動きのクリップの骨（腰 0.86・股関節 -0.02・もも 0.40・すね 0.385）と同じ比（腰の高さの比 0.885/0.86 で全部そろえる：足の固定がきく）
            'leftUpperLeg': (0.087, 0.864, 0.0), 'leftLowerLeg': (0.087, 0.4525, 0.01), 'leftFoot': (0.087, 0.0565, -0.014), 'leftToes': (0.087, 0.012, 0.12),
            'leftEye': (0.0335, 1.4885, 0.054),
        }
    elif kind == 'female':
        B = dict(kind=kind, height=1.58, sex='female',
                 shoulderW=0.33, hipW=0.32, crotchY=0.76,
                 neckR=0.041, wristR=0.022,
                 palm=dict(len=0.086, width=0.072, thick=0.024), finger_r=[0.0098, 0.0080, 0.0083, 0.0078, 0.0068],
                 finger_len=[[0.040, 0.030, 0.026], [0.040, 0.024, 0.020], [0.044, 0.027, 0.022], [0.041, 0.025, 0.021], [0.032, 0.019, 0.018]],
                 foot_len=0.23)
        J = {
            'hips': (0, 0.86, -0.005), 'spine': (0, 0.955, -0.01), 'chest': (0, 1.06, -0.012), 'upperChest': (0, 1.165, -0.018),
            'neck': (0, 1.318, -0.022), 'head': (0, 1.392, -0.014),
            'leftShoulder': (0.022, 1.29, -0.02), 'leftUpperArm': (0.150, 1.29, -0.028), 'leftLowerArm': (0.394, 1.29, -0.032), 'leftHand': (0.612, 1.29, -0.028),
            'leftUpperLeg': (0.085, 0.84, 0.0), 'leftLowerLeg': (0.085, 0.44, 0.01), 'leftFoot': (0.085, 0.055, -0.014), 'leftToes': (0.085, 0.011, 0.11),
            'leftEye': (0.0305, 1.436, 0.052),
        }
    else:
        raise ValueError(kind)
    J = {k: np.array(v, float) for k, v in J.items()}
    # 指（左手・手の甲が +Y・手のひらが -Y・親指が +Z）。少しだけ曲げた休み（関節ごとに 7°）・少し開く
    hand = J['leftHand']
    P = B['palm']
    tails = {}
    knuck = {
        'Index': hand + np.array([P['len'] * 0.97, -0.002, P['width'] * 0.36]),
        'Middle': hand + np.array([P['len'] * 1.0, -0.001, P['width'] * 0.11]),
        'Ring': hand + np.array([P['len'] * 0.97, -0.002, -P['width'] * 0.13]),
        'Little': hand + np.array([P['len'] * 0.9, -0.004, -P['width'] * 0.36]),
    }
    spread = {'Index': 0.13, 'Middle': 0.03, 'Ring': -0.08, 'Little': -0.19}
    for i, fg in enumerate(FINGER_ORDER):
        L = B['finger_len'][i]
        if fg == 'Thumb':
            base = hand + np.array([0.020, -0.010, P['width'] * 0.30])
            d = np.array([0.60, -0.30, 0.74])
            d /= np.linalg.norm(d)
            pts = [base]
            for j in range(3):
                dd = d + np.array([0.12 * j, -0.05 * j, -0.10 * j])
                dd /= np.linalg.norm(dd)
                pts.append(pts[-1] + dd * L[j])
            names = ['Metacarpal', 'Proximal', 'Distal']
        else:
            d0 = _rot_y(np.array([1.0, 0, 0]), spread[fg])
            pts = [knuck[fg]]
            ang = 0.0
            for j in range(3):
                ang += (0.30, 0.40, 0.30)[j] if fg != 'Index' else (0.22, 0.32, 0.26)[j]
                dd = np.array([d0[0] * np.cos(ang), -np.sin(ang), d0[2] * np.cos(ang)])
                pts.append(pts[-1] + dd * L[j])
            names = ['Proximal', 'Intermediate', 'Distal']
        for j, nm in enumerate(names):
            J['left' + fg + nm] = pts[j]
        tails['left' + fg + 'Distal'] = pts[3]
    # 右側（x を反転）
    for k in list(J.keys()):
        if k.startswith('left'):
            v = J[k].copy()
            v[0] = -v[0]
            J['right' + k[4:]] = v
    for k in list(tails.keys()):
        v = tails[k].copy()
        v[0] = -v[0]
        tails['right' + k[4:]] = v
    tails['head'] = J['head'] + np.array([0, 0.17, 0])
    tails['leftToes'] = J['leftToes'] + np.array([0, 0, 0.06])
    tails['rightToes'] = J['rightToes'] + np.array([0, 0, 0.06])
    tails['leftHand'] = (knuck['Middle'] if True else None)
    th = tails['leftHand'].copy()
    th[0] = -th[0]
    tails['rightHand'] = th
    tails['leftEye'] = J['leftEye'] + np.array([0, 0, 0.02])
    tails['rightEye'] = J['rightEye'] + np.array([0, 0, 0.02])
    B['joints'] = J
    B['tails'] = tails
    return B


# ───────────────────────── 体の形（服の土台・左右対称で +X 側を書く）
def torso_sdf(B):
    J = B['joints']
    if B['sex'] == 'male':
        parts = [
            S.ellipsoid((0, 1.19, -0.018), (0.128, 0.17, 0.092)),      # 胸かご
            S.ellipsoid((0.098, 1.215, -0.03), (0.062, 0.10, 0.062)), S.ellipsoid((-0.098, 1.215, -0.03), (0.062, 0.10, 0.062)),   # 広背筋（逆三角形）
            S.ellipsoid((0, 1.23, 0.004), (0.112, 0.085, 0.075)),      # 胸（平ら）
            S.ellipsoid((0, 1.03, -0.008), (0.112, 0.13, 0.083)),      # 腹
            S.ellipsoid((0, 0.905, -0.012), (0.125, 0.10, 0.092)),      # 骨盤
            S.ellipsoid((0.048, 0.855, -0.045), (0.066, 0.075, 0.058)),  # お尻
            S.ellipsoid((-0.048, 0.855, -0.045), (0.066, 0.075, 0.058)),
            S.capsule((0.155, 1.322, -0.028), (-0.155, 1.322, -0.028), 0.046),   # 肩の線
            S.capsule((0, 1.30, -0.03), (0, 1.40, -0.028), B['neckR'] * 1.02),   # 首の付け根
            S.sphere((0.172, 1.325, -0.03), 0.051), S.sphere((-0.172, 1.325, -0.03), 0.051),   # 三角筋
        ]
    else:
        parts = [
            S.ellipsoid((0, 1.15, -0.02), (0.108, 0.155, 0.085)),
            S.ellipsoid((0.045, 1.135, 0.03), (0.052, 0.05, 0.048)), S.ellipsoid((-0.045, 1.135, 0.03), (0.052, 0.05, 0.048)),   # 胸（控えめ）
            S.ellipsoid((0, 0.99, -0.008), (0.095, 0.12, 0.075)),
            S.ellipsoid((0, 0.87, -0.012), (0.138, 0.11, 0.092)),
            S.ellipsoid((0.05, 0.83, -0.045), (0.07, 0.08, 0.062)), S.ellipsoid((-0.05, 0.83, -0.045), (0.07, 0.08, 0.062)),
            S.capsule((0.138, 1.275, -0.026), (-0.138, 1.275, -0.026), 0.04),
            S.capsule((0, 1.25, -0.028), (0, 1.35, -0.026), B['neckR'] * 1.02),
            S.sphere((0.152, 1.278, -0.028), 0.044), S.sphere((-0.152, 1.278, -0.028), 0.044),
        ]
    return S.union(*parts, k=0.05)


def arm_sdf(B, side=1):
    J = B['joints']
    s = 'left' if side > 0 else 'right'
    a, e, w = J[s + 'UpperArm'], J[s + 'LowerArm'], J[s + 'Hand']
    m = B['sex'] == 'male'
    up = S.round_cone(a, e, 0.046 if m else 0.039, 0.037 if m else 0.031)
    fo = S.ell_capsule(e, w, 0.038 if m else 0.031, B['wristR'], squash=(1.12, 0.9), up=(0, 1, 0))
    return S.union(up, fo, k=0.03)


def leg_sdf(B, side=1):
    J = B['joints']
    s = 'left' if side > 0 else 'right'
    h, k, f = J[s + 'UpperLeg'], J[s + 'LowerLeg'], J[s + 'Foot']
    m = B['sex'] == 'male'
    th = S.round_cone(h + np.array([0, 0.03, 0]), k, 0.061 if m else 0.08, 0.047 if m else 0.046)
    sh = S.round_cone(k, f + np.array([0, 0.01, 0]), 0.047 if m else 0.044, 0.031 if m else 0.028)
    calf = S.ellipsoid(k + np.array([0, -0.12, -0.016]), (0.045, 0.085, 0.045) if m else (0.043, 0.08, 0.044))
    return S.union(th, sh, calf, k=0.03)


def body_sdf(B, arms=True, legs=True):
    parts = [torso_sdf(B)]
    if arms:
        parts += [arm_sdf(B, 1), arm_sdf(B, -1)]
    if legs:
        parts += [leg_sdf(B, 1), leg_sdf(B, -1)]
    return S.union(*parts, k=0.035)


def hand_sdf(B, side=1):
    """手（指 5 本）。side=1 左手"""
    J = B['joints']
    s = 'left' if side > 0 else 'right'
    P = B['palm']
    hand = J[s + 'Hand']
    sx = side
    m = B['sex'] == 'male'
    # 手のひら：手首から指の付け根へ、幅 width・厚さ thick
    c = hand + np.array([sx * P['len'] * 0.52, -0.002, 0.0])
    palm = S.box(c, (P['len'] * 0.5, P['thick'] * 0.5, P['width'] * 0.5), r=P['thick'] * 0.45)
    palm = S.union(palm, S.ellipsoid(hand + np.array([sx * P['len'] * 0.35, -0.004, 0.0]), (P['len'] * 0.42, P['thick'] * 0.55, P['width'] * 0.52)), k=0.01)
    thenar = S.ellipsoid(hand + np.array([sx * 0.032, -0.008, P['width'] * 0.26]), (0.03, 0.014 if m else 0.012, 0.021))
    wrist = S.ell_capsule(hand - np.array([sx * 0.05, 0, 0]), hand + np.array([sx * 0.01, 0, 0]), B['wristR'], B['wristR'] * 1.02, squash=(1.12, 0.85))
    fingers = []
    for i, fg in enumerate(FINGER_ORDER):
        segs = ['Metacarpal', 'Proximal', 'Distal'] if fg == 'Thumb' else ['Proximal', 'Intermediate', 'Distal']
        pts = [J[s + fg + g] for g in segs] + [B['tails'][s + fg + 'Distal']]
        r0 = B['finger_r'][i]
        rs = [r0, r0 * 0.93, r0 * 0.86, r0 * 0.74] if fg != 'Thumb' else [r0 * 1.15, r0, r0 * 0.92, r0 * 0.8]
        start = 1 if fg == 'Thumb' else 0
        f = None
        for j in range(start, 3):
            seg = S.ell_capsule(pts[j], pts[j + 1], rs[j], rs[j + 1], squash=(1.0, 0.86))
            f = seg if f is None else S.union(f, seg, k=0.002)
            if j > 0 and m:   # 関節の少しのふくらみ（男性の手）
                f = S.union(f, S.ellipsoid(pts[j] + np.array([0, 0.002, 0]), (rs[j] * 1.02, rs[j] * 0.92, rs[j] * 1.02)), k=0.003)
        if fg == 'Thumb':
            f = S.union(f, S.ell_capsule(pts[0], pts[1], rs[0] * 1.05, rs[1], squash=(1.0, 0.85)), k=0.006)
        fingers.append(f)
    fing = S.union(*fingers)
    # 指の付け根の関節（こぶ）
    knucks = [S.sphere(J[s + fg + 'Proximal'] + np.array([0, 0.004, 0]), B['finger_r'][i] * 1.02) for i, fg in enumerate(FINGER_ORDER) if fg != 'Thumb']
    base = S.union(palm, thenar, wrist, *knucks, k=0.012)
    return S.union(base, fing, k=0.0045)


def foot_sdf(B, side=1):
    J = B['joints']
    s = 'left' if side > 0 else 'right'
    f, t = J[s + 'Foot'], J[s + 'Toes']
    L = B['foot_len']
    heel = S.ellipsoid((f[0], 0.04, f[2] - 0.035), (0.034, 0.04, 0.045))
    ball = S.ellipsoid((t[0] + side * 0.004, 0.026, t[2] - 0.005), (0.045, 0.028, 0.05))
    mid = S.round_cone((f[0], 0.05, f[2] - 0.02), (t[0], 0.03, t[2]), 0.036, 0.032)
    ankle = S.round_cone(f + np.array([0, 0.06, 0]), (f[0], 0.04, f[2]), 0.032, 0.036)
    return S.union(heel, ball, mid, ankle, k=0.03)
