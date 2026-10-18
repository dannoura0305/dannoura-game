# -*- coding: utf-8 -*-
"""
骨（VRM 1.0 の人型・T ポーズ）と皮の重み。
骨の位置は体の寸法（body）から作る。重みは「骨の線分への近さ＋関節のまわりのなめらかな混ぜ＋体の区画」の関数で、
全部の網（肌・服・靴）に同じ関数を使う（重ね着の服が同じように動く＝突き抜けにくい）。網の上でならして仕上げる。
"""
import numpy as np

from sdf import smoothstep

HUMAN_PARENT = {
    'hips': None, 'spine': 'hips', 'chest': 'spine', 'upperChest': 'chest', 'neck': 'upperChest', 'head': 'neck',
    'leftEye': 'head', 'rightEye': 'head',
    'leftShoulder': 'upperChest', 'leftUpperArm': 'leftShoulder', 'leftLowerArm': 'leftUpperArm', 'leftHand': 'leftLowerArm',
    'rightShoulder': 'upperChest', 'rightUpperArm': 'rightShoulder', 'rightLowerArm': 'rightUpperArm', 'rightHand': 'rightLowerArm',
    'leftUpperLeg': 'hips', 'leftLowerLeg': 'leftUpperLeg', 'leftFoot': 'leftLowerLeg', 'leftToes': 'leftFoot',
    'rightUpperLeg': 'hips', 'rightLowerLeg': 'rightUpperLeg', 'rightFoot': 'rightLowerLeg', 'rightToes': 'rightFoot',
}
FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little']
for s in ('left', 'right'):
    for fg in FINGERS:
        segs = ['Metacarpal', 'Proximal', 'Distal'] if fg == 'Thumb' else ['Proximal', 'Intermediate', 'Distal']
        par = s + 'Hand'
        for sg in segs:
            HUMAN_PARENT[s + fg + sg] = par
            par = s + fg + sg


class Skeleton:
    def __init__(self):
        self.names, self.parent, self.pos, self.tail = [], [], [], {}
        self.human = {}

    def add(self, name, parent, pos, human=None, tail=None):
        self.names.append(name)
        self.parent.append(self.names.index(parent) if parent else -1)
        self.pos.append(np.asarray(pos, float))
        if human:
            self.human[human] = len(self.names) - 1
        if tail is not None:
            self.tail[name] = np.asarray(tail, float)
        return len(self.names) - 1

    def idx(self, name):
        return self.names.index(name)

    def P(self, name):
        return self.pos[self.idx(name)]

    def seg(self, name):
        """骨の線分（頭 → 尾）。尾が無ければ最初の子の位置"""
        i = self.idx(name)
        if name in self.tail:
            return self.pos[i], self.tail[name]
        kids = [j for j, p in enumerate(self.parent) if p == i]
        if kids:
            return self.pos[i], self.pos[kids[0]]
        return self.pos[i], self.pos[i] + np.array([0, 0.05, 0])

    def to_json(self):
        return [{'name': n, 'parent': int(p), 'pos': [round(float(x), 6) for x in q]} for n, p, q in zip(self.names, self.parent, self.pos)]


def build_skeleton(B):
    """B：体の寸法の dict（body.py の make_body_spec）。人型の骨（VRM の名前＝骨の名前）"""
    S = Skeleton()
    J = B['joints']
    for name in HUMAN_PARENT:
        if name not in J:
            continue
        S.add(name, HUMAN_PARENT[name], J[name], human=name, tail=B.get('tails', {}).get(name))
    return S


# ───────────────────────── 重み
def seg_dist(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    q = a + np.outer(t, ab)
    return np.linalg.norm(P - q, axis=1), t


def chain_weights(P, S, chain, blend):
    """骨の鎖（根 → 先）に沿った重み：線分の上の位置で決め、関節のまわり ±blend[i] で隣と混ぜる。
    戻り値 (n, len(chain))"""
    n = len(P)
    segs = [S.seg(c) for c in chain]
    # 鎖の上の「長さの位置」に写す：各線分への近さで最も近い線分を選び、その上の位置
    D = np.stack([seg_dist(P, a, b)[0] for a, b in segs], 1)
    T = np.stack([seg_dist(P, a, b)[1] for a, b in segs], 1)
    L = np.array([np.linalg.norm(b - a) for a, b in segs])
    starts = np.concatenate([[0], np.cumsum(L)[:-1]])
    k = D.argmin(1)
    s = starts[k] + T[np.arange(n), k] * L[k]
    W = np.zeros((n, len(chain)))
    # 関節 j（j 番目の骨の始まり、j>=1）で j-1 と j を混ぜる
    w_cur = np.zeros(n)
    W[:, 0] = 1.0
    for j in range(1, len(chain)):
        bl = blend[j] if hasattr(blend, '__len__') else blend
        u = smoothstep(starts[j] - bl, starts[j] + bl, s)
        W[:, :j] *= (1 - u)[:, None]
        W[:, j] = u
    return W


def body_weights(P, S, B, region=None):
    """体（肌・服）の重み。region：頂点ごとの区画の上書き（'head' 'hand' など・None は自動）。戻り値 (J (n,4), W (n,4))"""
    n = len(P)
    nb = len(S.names)
    Wf = np.zeros((n, nb))
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    J = B['joints']
    # 区画の重み（T ポーズ）：腕（|x| が肩の先）・脚（股より下で左右）・胴
    shx = abs(J['leftUpperArm'][0])
    armL = smoothstep(shx - 0.035, shx + 0.03, x) * smoothstep(J['leftUpperArm'][1] - 0.25, J['leftUpperArm'][1] - 0.12, y)
    armR = smoothstep(shx - 0.035, shx + 0.03, -x) * smoothstep(J['rightUpperArm'][1] - 0.25, J['rightUpperArm'][1] - 0.12, y)
    hipY = J['leftUpperLeg'][1]
    crotch = B.get('crotchY', hipY - 0.07)
    legness = smoothstep(hipY + 0.06, crotch - 0.02, y)       # 腰の上 0 → 股の下 1
    side = smoothstep(-0.02, 0.02, x)                           # 左 1・右 0
    legL = legness * side * (1 - armL - armR).clip(0, 1)
    legR = legness * (1 - side) * (1 - armL - armR).clip(0, 1)
    torso = np.clip(1 - armL - armR - legL - legR, 0, 1)
    I = S.idx
    # 胴の鎖：hips → spine → chest → upperChest → neck → head（y で混ぜる）
    tor = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head']
    ys = np.array([J[t][1] for t in tor])
    Wt = np.zeros((n, len(tor)))
    Wt[:, 0] = 1
    for j in range(1, len(tor)):
        bl = 0.05 if tor[j] in ('spine', 'chest', 'upperChest') else (0.025 if tor[j] == 'neck' else 0.02)
        u = smoothstep(ys[j] - bl, ys[j] + bl, y)
        Wt[:, :j] *= (1 - u)[:, None]
        Wt[:, j] = u
    # 肩（鎖骨）：胴の上の左右の外側（首の付け根より外）
    shL = smoothstep(0.05, shx - 0.01, x) * smoothstep(J['upperChest'][1] - 0.02, J['leftShoulder'][1] - 0.01, y)
    shR = smoothstep(0.05, shx - 0.01, -x) * smoothstep(J['upperChest'][1] - 0.02, J['rightShoulder'][1] - 0.01, y)
    shL *= (1 - Wt[:, 4] - Wt[:, 5]).clip(0, 1)
    shR *= (1 - Wt[:, 4] - Wt[:, 5]).clip(0, 1)
    for j, t in enumerate(tor):
        Wf[:, I(t)] += torso * Wt[:, j] * (1 - 0.7 * shL - 0.7 * shR)
    Wf[:, I('leftShoulder')] += torso * 0.7 * shL
    Wf[:, I('rightShoulder')] += torso * 0.7 * shR
    # 腕：shoulder → upperArm → lowerArm → hand（x で混ぜる）
    for s, a in (('left', armL), ('right', armR)):
        ch = [s + 'Shoulder', s + 'UpperArm', s + 'LowerArm', s + 'Hand']
        Wc = chain_weights(P, S, ch, [0, 0.045, 0.05, 0.03])
        for j, c in enumerate(ch):
            Wf[:, I(c)] += a * Wc[:, j]
    # 脚：hips → upperLeg → lowerLeg → foot → toes
    for s, a in (('left', legL), ('right', legR)):
        ch = [s + 'UpperLeg', s + 'LowerLeg', s + 'Foot', s + 'Toes']
        Wc = chain_weights(P, S, ch, [0, 0.06, 0.045, 0.02])
        for j, c in enumerate(ch):
            Wf[:, I(c)] += a * Wc[:, j]
    return top4(Wf)


def top4(Wf):
    n = len(Wf)
    idx = np.argsort(-Wf, axis=1)[:, :4]
    W = np.take_along_axis(Wf, idx, 1)
    W[W < 0.01] = 0
    s = W.sum(1)
    bad = s < 1e-6
    W[bad] = [1, 0, 0, 0]
    s[bad] = 1
    W /= s[:, None]
    return idx.astype(np.int64), W


def rigid(n, bone_index):
    J = np.zeros((n, 4), np.int64)
    J[:, 0] = bone_index
    W = np.zeros((n, 4))
    W[:, 0] = 1
    return J, W


def smooth_weights(J, W, nbrs, nbones, iters=3, lam=0.5, mask=None):
    """網の上で重みをならす（隣の平均へ）。mask：動かす頂点"""
    n = len(J)
    Wf = np.zeros((n, nbones))
    np.put_along_axis(Wf, J, W, 1)
    for _ in range(iters):
        avg = np.array([Wf[nb].mean(0) if len(nb) else Wf[i] for i, nb in enumerate(nbrs)])
        D = (avg - Wf) * lam
        if mask is not None:
            D[~mask] = 0
        Wf += D
    return top4(Wf)


def dense(J, W, nbones):
    Wf = np.zeros((len(J), nbones))
    np.put_along_axis(Wf, J, W, 1)
    return Wf


def chain_weights_param(t, bones, head_bone, root_hold=0.15):
    """髪の房など：長さの位置 t（0＝根 → 1＝先）で鎖の骨へ。根の方 root_hold までは頭の骨。
    bones：鎖の骨の番号（根 → 先）。戻り値 (J, W)"""
    n = len(t)
    nb = len(bones)
    Wf = {}
    J = np.zeros((n, 4), np.int64)
    W = np.zeros((n, 4))
    # 位置 → 骨の区間（等分）。区間の境で隣と混ぜる
    u = np.clip((t - root_hold) / max(1 - root_hold, 1e-6), 0, 1) * nb   # 0..nb
    for i in range(n):
        if t[i] <= root_hold:
            k = t[i] / max(root_hold, 1e-6)
            J[i, :2] = [head_bone, bones[0]]
            W[i, :2] = [1 - 0.5 * k * k, 0.5 * k * k]
            continue
        f = u[i] - 0.5
        a = int(np.clip(np.floor(f), 0, nb - 1))
        b = min(a + 1, nb - 1)
        w = np.clip(f - a, 0, 1) if b != a else 0
        if f < 0:
            # 最初の骨の前半：頭と混ぜる
            k = np.clip(u[i] / 0.5, 0, 1)
            J[i, :2] = [head_bone, bones[0]]
            W[i, :2] = [0.5 * (1 - k), 0.5 + 0.5 * k]
        else:
            J[i, :2] = [bones[a], bones[b]]
            W[i, :2] = [1 - w, w]
    return J, W
