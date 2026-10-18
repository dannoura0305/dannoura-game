# -*- coding: utf-8 -*-
"""
キャラクターの「包み」（*.pack.json）を書く：網・骨・皮の重み・モーフ・材質・表情・揺れ物を 1 つの JSON に。
VRM 1.0 への組み立ては node の tools/charkit/vrm_from_pack.mjs（charkit/core/vrmwrite.js の buildVRM1）が行う。
座標は glTF（Y 上・+Z 前・m）。骨は回転なし（T ポーズ）で、位置は世界の位置。
"""
import base64
import json
import os

import numpy as np


def b64(a, dtype):
    a = np.ascontiguousarray(np.asarray(a).astype(dtype))
    return base64.b64encode(a.tobytes()).decode('ascii')


class Part:
    """1 つの部品の網（同じ材質・同じ網の組）
    V (n,3)・T (m,3) 三角形・UV：角ごと (m,3,2) か頂点ごと (n,2)・N (n,3) 頂点の法線
    J (n,4) 骨の番号・W (n,4) 重み・morphs {名前: (n,3) 差分}・mat：材質の名前・group：網の組（同じ組＝同じ glTF の mesh）"""

    def __init__(self, name, V, T, N, mat, UV=None, UVc=None, J=None, W=None, morphs=None, group='body', region=None):
        self.name, self.V, self.T, self.N, self.mat = name, np.asarray(V, float), np.asarray(T, np.int64), np.asarray(N, float), mat
        self.UV, self.UVc = UV, UVc
        n = len(self.V)
        self.J = np.zeros((n, 4), np.int64) if J is None else np.asarray(J)
        self.W = (np.tile([1.0, 0, 0, 0], (n, 1)) if W is None else np.asarray(W, float))
        self.morphs = morphs or {}
        self.group = group
        self.region = region

    def ntris(self):
        return len(self.T)


def _expand(p):
    """角ごとの UV がある時は (頂点, UV) の組で頂点を分ける"""
    if p.UVc is None:
        uv = p.UV if p.UV is not None else np.zeros((len(p.V), 2))
        return np.arange(len(p.V)), np.asarray(uv, float), p.T
    UVc = np.asarray(p.UVc, float).reshape(-1, 2)
    vid = p.T.reshape(-1)
    q = np.round(UVc * 65536).astype(np.int64)
    key = vid * (1 << 40) + q[:, 0] * (1 << 20) + q[:, 1]
    uk, inv = np.unique(key, return_inverse=True)
    first = np.zeros(len(uk), np.int64)
    first[inv] = np.arange(len(inv))
    src = vid[first]
    uv = UVc[first]
    return src, uv, inv.reshape(-1, 3)


def write_pack(path, parts, bones, human, materials, extra, groups_order=('face', 'body')):
    """bones：[{name, parent(番号|-1), pos(世界)}]・human：{VRM の骨名: 番号}・materials：[{name, ...}]（名前で引く）"""
    mat_index = {m['name']: i for i, m in enumerate(materials)}
    meshes = []
    tri_total = 0
    for g in groups_order:
        ps = [p for p in parts if p.group == g and p.ntris()]
        if not ps:
            continue
        # 同じ材質の部品は 1 つの primitive にまとめる
        by_mat = {}
        for p in ps:
            by_mat.setdefault(p.mat, []).append(p)
        morph_names = []
        for p in ps:
            for k in p.morphs:
                if k not in morph_names:
                    morph_names.append(k)
        prims = []
        for mname, plist in by_mat.items():
            P, N, UV, J, W, I, M = [], [], [], [], [], [], {k: [] for k in morph_names}
            off = 0
            for p in plist:
                src, uv, T = _expand(p)
                P.append(p.V[src])
                N.append(p.N[src])
                UV.append(uv)
                J.append(p.J[src])
                W.append(p.W[src])
                I.append(T + off)
                for k in morph_names:
                    M[k].append(p.morphs[k][src] if k in p.morphs else np.zeros((len(src), 3)))
                off += len(src)
            P, N, UV, J, W, I = [np.concatenate(x) for x in (P, N, UV, J, W, I)]
            N = N / np.maximum(np.linalg.norm(N, axis=1), 1e-9)[:, None]
            W = W / np.maximum(W.sum(1), 1e-9)[:, None]
            tri_total += len(I)
            prim = {
                'material': mat_index[mname],
                'position': b64(P, '<f4'), 'normal': b64(N, '<f4'), 'uv': b64(UV, '<f4'),
                'joints': b64(J, '<u2'), 'weights': b64(W, '<f4'),
                'index': b64(I.reshape(-1), '<u4' if off > 65535 else '<u2'), 'indexType': 'u32' if off > 65535 else 'u16',
                'count': int(off), 'tris': int(len(I)),
            }
            if morph_names:
                prim['targets'] = [{'name': k, 'position': b64(np.concatenate(M[k]), '<f4')} for k in morph_names]
            prims.append(prim)
        meshes.append({'name': g, 'primitives': prims, 'morphs': morph_names})
    pack = {'spec': 'wakaba-charpack/1', 'bones': bones, 'humanBones': human, 'materials': materials, 'meshes': meshes, 'tris': tri_total}
    pack.update(extra)
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'w') as f:
        json.dump(pack, f)
    return pack
