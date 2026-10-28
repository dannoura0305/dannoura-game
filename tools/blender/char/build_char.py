# -*- coding: utf-8 -*-
"""
キャラクターを作る（Blender の bpy・頭なし）：だんのうら（紫・白い姿）・相棒 → 包み（*.pack.json＋PNG）→ VRM 1.0（node）。

使い方（利用者の PC：Blender 5.2 LTS）：
  blender --background --python tools/blender/char/build_char.py -- --char dannoura --out build/chars
  （クラウド：bpy 5.2.2 の Python で  python tools/blender/char/build_char.py --char dannoura --out <dir>）
  続けて：node tools/charkit/vrm_from_pack.mjs <dir>/dannoura.pack.json shinshoku/assets/characters/dannoura.vrm
  まとめて：node tools/charkit/build_chars.mjs（全員・PC 版とスマホ版・meta・sha256）
  --lod low（スマホ版：三角形とテクスチャを減らす）・--blend（.blend も保存：形を手で直したい時の出発点）

作り方（docs/shinshoku/VROID_GUIDE.md §0「リポジトリの中で作った VRM」）：
  形は SDF（なめらかにつないだ基本の形）→ 表面を取り出し → QuadriFlow／間引きで網を整える → SDF の勾配の法線（トゥーンの影がきれい）。
  顔は目の穴＋目玉＋まぶたの殻・口と眉は顔の上の板。髪は房（先の細い平たい管）。服は体をふくらませて切る。
  重みは骨の線分への近さの関数（重ね着が同じに動く）。テクスチャは numpy で描く・UV の上に 3D の色の関数を焼く。
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import meshops as MO  # noqa: E402
import rig as R  # noqa: E402
import pack as PK  # noqa: E402
import paint as PT  # noqa: E402
import body as BD  # noqa: E402
import face as FC  # noqa: E402
import chars as CH  # noqa: E402


def parse_args():
    argv = sys.argv
    argv = argv[argv.index('--') + 1:] if '--' in argv else argv[1:]
    o = {'char': 'dannoura', 'out': 'build/chars', 'lod': 'pc', 'blend': False, 'only': None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ('--char', '--out', '--lod', '--only'):
            o[a[2:]] = argv[i + 1]
            i += 2
        elif a == '--blend':
            o['blend'] = True
            i += 1
        else:
            i += 1
    return o


HALF = []          # P18：add_half_joints の戻り値（main で入れる）


def assign_weights(parts, Sk, B):
    """部品の weights の指定 → J, W"""
    for p in parts:
        w = p.get('weights', 'body')
        n = len(p['V'])
        if isinstance(w, tuple) and w[0] == 'bone':
            p['J'], p['W'] = R.rigid(n, Sk.idx(w[1]))
        elif isinstance(w, tuple) and w[0] == 'given':
            p['J'], p['W'] = w[1], w[2]
        elif isinstance(w, tuple) and w[0] == 'chain':
            _, bones, tv, parent, hold = w
            p['J'], p['W'] = R.chain_weights_param(np.asarray(tv), [Sk.idx(b) for b in bones], Sk.idx(parent), root_hold=hold)
        elif w == 'body':
            J, W = R.body_weights(p['V'], Sk, B)
            if p.get('smooth_w', 2):
                nb = MO.adjacency(MO.Mesh(p['V'], [tuple(t) for t in p['T']]))
                J, W = R.smooth_weights(J, W, nb, len(Sk.names), iters=p.get('smooth_w', 2), lam=0.5)
            if HALF:
                J, W = R.apply_half_joints(J, W, len(Sk.names), HALF)       # P18：ひざ・ひじ・肩の補助の骨（深い曲げのつぶれを減らす）
            p['J'], p['W'] = J, W
        else:
            raise ValueError(w)


def head_scale(parts, Sk, s, ctx):
    """頭（頭の骨とその子の骨に付いた物：顔・髪・帽子・めがね・耳）を頭の骨のまわりに s 倍（アニメの頭身へ：骨の位置・モーフ・当たりも）"""
    if abs(s - 1) < 1e-4:
        return
    hi = Sk.idx('head')
    piv = Sk.pos[hi].copy()
    grp = set([hi])
    changed = True
    while changed:
        changed = False
        for i, p in enumerate(Sk.parent):
            if p in grp and i not in grp:
                grp.add(i)
                changed = True
    gl = np.array(sorted(grp))
    for p in parts:
        k = np.zeros(len(p['V']))
        for j in range(4):
            k += np.isin(p['J'][:, j], gl) * p['W'][:, j]
        k = np.clip(k, 0, 1)[:, None]
        p['V'] = p['V'] + ((piv + (p['V'] - piv) * s) - p['V']) * k
        for mk in list((p.get('morphs') or {}).keys()):
            p['morphs'][mk] = p['morphs'][mk] * (1 + (s - 1) * k)
    for i in grp:
        if i == hi:
            continue
        Sk.pos[i] = piv + (Sk.pos[i] - piv) * s
    for nm, t in list(Sk.tail.items()):
        if Sk.idx(nm) in grp:
            Sk.tail[nm] = piv + (t - piv) * s
    ctx['headScale'] = s


def _group(Sk, root):
    """root とその子孫の骨の番号"""
    grp = {Sk.idx(root)}
    changed = True
    while changed:
        changed = False
        for i, p in enumerate(Sk.parent):
            if p in grp and i not in grp:
                grp.add(i)
                changed = True
    return np.array(sorted(grp))


def limb_scale(parts, Sk, limbs, ctx):
    """P18：手足の長さ（娘＝4 歳らしく手足を短めに）。limbs={'legs': k, 'arms': k}。
    脚：太ももの根（股関節）のまわりに縦は k・横と前後は √k（細くしすぎない）。脚の重みの分だけ動かし（腰でなめらかにつながる）、全体を短くなった分だけ下げる（足は床のまま）。
    腕：肩（上腕の根）のまわりに腕の向き（x）は k・ほかは √k。骨（補助の骨・指を含む）も同じに動かす"""
    if not limbs:
        return
    kl, ka = limbs.get('legs', 1.0), limbs.get('arms', 1.0)
    ctx['limbs'] = dict(limbs)
    drop = 0.0
    if abs(kl - 1) > 1e-6:
        hy = Sk.P('leftUpperLeg')[1]
        drop = hy * (1 - kl)
        sl = np.array([np.sqrt(kl), kl, np.sqrt(kl)])
        for side in ('left', 'right'):
            g = _group(Sk, side + 'UpperLeg')
            piv = Sk.P(side + 'UpperLeg').copy()
            for p in parts:
                w = np.zeros(len(p['V']))
                for j in range(4):
                    w += np.isin(p['J'][:, j], g) * p['W'][:, j]
                w = np.clip(w, 0, 1)[:, None]
                p['V'] = p['V'] + ((piv + (p['V'] - piv) * sl) - p['V']) * w
            for i in g:
                Sk.pos[i] = piv + (Sk.pos[i] - piv) * sl
                nm = Sk.names[i]
                if nm in Sk.tail:
                    Sk.tail[nm] = piv + (Sk.tail[nm] - piv) * sl
        # 全体を drop だけ下げる（縮めた脚の足が床に戻る）
        for p in parts:
            p.pop('_legw', None)
            p['V'] = p['V'] - np.array([0, drop, 0])
        Sk.pos = [q - np.array([0, drop, 0]) for q in Sk.pos]
        Sk.tail = {k: v - np.array([0, drop, 0]) for k, v in Sk.tail.items()}
    if abs(ka - 1) > 1e-6:
        sa = np.array([ka, np.sqrt(ka), np.sqrt(ka)])
        for side in ('left', 'right'):
            g = _group(Sk, side + 'UpperArm')
            g = np.array(sorted(set(g.tolist()) | {Sk.idx('ext_half_' + side + 'UpperArm')} if 'ext_half_' + side + 'UpperArm' in Sk.names else set(g.tolist())))
            piv = Sk.P(side + 'UpperArm').copy()
            for p in parts:
                w = np.zeros(len(p['V']))
                for j in range(4):
                    w += np.isin(p['J'][:, j], g) * p['W'][:, j]
                w = np.clip(w, 0, 1)[:, None]
                p['V'] = p['V'] + ((piv + (p['V'] - piv) * sa) - p['V']) * w
            for i in g:
                Sk.pos[i] = piv + (Sk.pos[i] - piv) * sa
                nm = Sk.names[i]
                if nm in Sk.tail:
                    Sk.tail[nm] = piv + (Sk.tail[nm] - piv) * sa


def global_scale(parts, Sk, gs, ctx):
    """P17：全体の縮尺（娘＝大人の寸法で作って小さくする）。網・骨・尾・モーフ・小物の当たりを足もと（原点）のまわりに gs 倍"""
    ctx['scale'] = gs
    if abs(gs - 1) < 1e-6:
        return
    for p in parts:
        p['V'] = p['V'] * gs
        for mk in list((p.get('morphs') or {}).keys()):
            p['morphs'][mk] = p['morphs'][mk] * gs
    Sk.pos = [q * gs for q in Sk.pos]
    Sk.tail = {k: v * gs for k, v in Sk.tail.items()}
    for e in ctx.get('extra_colliders', []):
        sh = e.get('capsule') or e.get('sphere')
        sh['offset'] = [x * gs for x in sh['offset']]
        sh['radius'] = sh['radius'] * gs
        if 'tail' in sh:
            sh['tail'] = [x * gs for x in sh['tail']]


def main():
    o = parse_args()
    t0 = time.time()
    C = CH.CHARS[o['char']]
    lod = 1.0 if o['lod'] == 'pc' else C.get('lowRatio', 0.36)
    tex_k = 1 if o['lod'] == 'pc' else 2
    MO.clear_scene()
    B = BD.make_spec(C['body'])
    look = C['look']
    parts, textures, mats = [], {}, []
    # 顔
    F = FC.build_face(B, C['face'], look, lod=lod)
    parts += F['parts']
    textures['face'] = F['tex']
    print('face', round(time.time() - t0, 1), 's')
    # 手
    import hands as HN
    parts += HN.build_hands(B, lod=lod)
    print('hands', round(time.time() - t0, 1), 's')
    # 骨（人型＋拡張の骨：髪・服・小物が足す）
    Sk = R.build_skeleton(B)
    ext = []
    ctx = {'extra_colliders': [], 'parts': parts}
    # 体・服・髪・小物（キャラクターごとの組み立て）
    for step in C['steps']:
        if o['only'] and step['kind'] not in o['only'].split(','):
            continue
        mod = __import__(step['module'])
        r = getattr(mod, step['fn'])(B, Sk, C, F, lod=lod, ctx=ctx, **step.get('args', {}))
        parts += r.get('parts', [])
        textures.update(r.get('textures', {}))
        ext += r.get('springs', [])
        ctx['extra_colliders'] += r.get('colliders', [])
        ctx.update(r.get('ctx', {}))
        print(step['fn'], round(time.time() - t0, 1), 's')
    HALF[:] = R.add_half_joints(Sk)
    assign_weights(parts, Sk, B)
    head_scale(parts, Sk, C.get('headScale', 1.0), ctx)
    limb_scale(parts, Sk, C.get('limbs'), ctx)
    global_scale(parts, Sk, C.get('scale', 1.0), ctx)
    # テクスチャを書く
    out = os.path.abspath(o['out'])
    os.makedirs(out, exist_ok=True)
    name = o['char'] + ('' if o['lod'] == 'pc' else '_low')
    tex_files = {}
    for k, img in textures.items():
        im = img
        if tex_k > 1:
            im = PT.downsample(img, tex_k)
        fn = '%s_%s.png' % (name, k)
        PT.save_png(os.path.join(out, fn), im)
        tex_files[k] = fn
    mats = CH.materials(C, tex_files)
    # 部品 → Part
    P = []
    for p in parts:
        P.append(PK.Part(p['name'], p['V'], p['T'], p['N'], p['mat'], UV=p.get('UV'), UVc=p.get('UVc'), J=p['J'], W=p['W'], morphs=p.get('morphs'), group=p.get('group', 'body')))
    tris = sum(x.ntris() for x in P)
    # 揺れ物・当たり
    spring = CH.spring_bones(C, Sk, B, ext, ctx['extra_colliders'], hs=ctx.get('headScale', 1.0), gs=ctx.get('scale', 1.0))
    # 視線（目の骨）
    head = Sk.P('head')
    eL = Sk.P('leftEye')
    look_at = {'type': 'bone', 'offsetFromHeadBone': [0.0, float(eL[1] - head[1]), float(eL[2] - head[2])],
               'rangeMapHorizontalInner': {'inputMaxValue': 90, 'outputScale': 9}, 'rangeMapHorizontalOuter': {'inputMaxValue': 90, 'outputScale': 11},
               'rangeMapVerticalDown': {'inputMaxValue': 90, 'outputScale': 7}, 'rangeMapVerticalUp': {'inputMaxValue': 90, 'outputScale': 9}}
    meta = dict(C['meta'])
    extra = {
        'meta': meta, 'expressions': {'preset': F['expr'], 'custom': {}}, 'lookAt': look_at,
        'firstPerson': [{'mesh': 'face', 'type': 'auto'}, {'mesh': 'body', 'type': 'auto'}],
        'springBone': spring,
        'info': {'char': o['char'], 'lod': o['lod'], 'tris': tris, 'body': {k: B[k] for k in ('height', 'sex', 'shoulderW', 'hipW')}, 'parts': {x.name: x.ntris() for x in P}},
    }
    PK.write_pack(os.path.join(out, name + '.pack.json'), P, Sk.to_json(), Sk.human, mats, extra)
    print(json.dumps({'char': o['char'], 'lod': o['lod'], 'tris': tris, 'sec': round(time.time() - t0, 1)}))


if __name__ == '__main__':
    main()
