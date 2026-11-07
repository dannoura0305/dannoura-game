# -*- coding: utf-8 -*-
"""高精度 3D 制作: 四つ足の生き物（だんのうらの巨大猫又）を Blender で一から組み、.glb に書き出す

  blender -b --factory-startup -P hq3d_nekomata.py -- <設定.json> <出力.glb> [--blend <保存する.blend>]
  標準出力に 1 行 "WCMF_RESULT {json}"

  竜（hq3d_dragon.py）の部品（Builder の筒・刃・楕円体・円すい、骨・重み・まばたき・待機の動き・.glb の書き出し）を借りる。
  hq3d_dragon.py は読み込むだけで変えない（ファイルの最後の main() の呼び出しを除いて実行する）。

  作るもの（設定 build.json の値で形が決まる。座標は「肩の高さ＝1」の単位で書き、最後に scale 倍する）
    ・骨: root・pelvis・spine1・spine2・chest・neck1〜3・head・jaw・foreLeg/foreArm/forePaw{L,R}・hindLeg/hindShin/hindFoot{L,R}・
          尾 2 本（tail1〜6＝モデルの左・tailB1〜6＝右）。Cast Engine は名前に jaw / head / neck を含む骨を探すので、ほかには使わない
    ・体: 胴・首・脚・尾の筒、頭は楕円体の組み合わせ（頭・口先・ほお・あご・鼻）、耳（刃）と耳の内側
    ・毛: 体の表面に毛の房（平たい刃）を散らす。場所ごとに長さ・向き（流れ）・数を変える（胸のたてがみ・ほお・脚の飾り毛・尾の房）
    ・目（虹彩・縦長の瞳・光・まぶた）と目の上の紫の線、ひげ、足先（肉球・紫の爪）
    ・色: 毛は「毛の筋の画像 × 頂点の色」（glTF は頂点の色を最初の材質にしか書けないので、毛は全部 1 つの材質 Fur にまとめる）
    ・まばたき（モーフ "blink"）と表情・口（jaw の骨）・待機の動き（アクション "idle"・尾のゆれと息）
"""
import json
import math
import os
import sys
import traceback
import types

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def _load_dragon():
    """hq3d_dragon.py を、最後の main() の呼び出しを除いて読み込む（ファイルは変えない）"""
    path = os.path.join(HERE, 'hq3d_dragon.py')
    src = open(path, encoding='utf-8').read()
    cut = src.rfind('\ntry:\n    main()')
    mod = types.ModuleType('hq3d_dragon_lib')
    mod.__file__ = path
    exec(compile(src[:cut], path, 'exec'), mod.__dict__)
    return mod


D = _load_dragon()
V, hexc, mix, catmull, frames_along, lerp_profile = D.V, D.hexc, D.mix, D.catmull, D.frames_along, D.lerp_profile


def emit(obj):
    print('WCMF_RESULT ' + json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def scatter_fur(B, rows, pts, spec, bones, color_fn):
    """筒の表面（rows: 輪ごとの頂点）に毛の房を散らす。
      spec: {"from", "to"（筒の長さの割合）, "every"（輪の間引き）, "density"（輪の頂点のうち植える割合）,
             "length": [[t, 長さ], …], "width"（長さに対する幅）, "out"（外へ立つ割合）, "flow": [x, y, z]（流れる向き）,
             "flow_k"（流れの強さ）, "droop"（下へ垂れる強さ）, "only": "top"|"bottom"|"side"|"front"|"back"（植える向き）,
             "sink"（根元を内へ沈める割合）, "curl", "jitter"}"""
    rng = B.rng
    n = len(rows)
    flow = V(spec.get('flow', (0, 1, 0)))
    if flow.length > 1e-6:
        flow.normalize()
    made = 0
    i0, i1 = int(spec.get('from', 0.0) * (n - 1)), int(spec.get('to', 1.0) * (n - 1))
    every = int(spec.get('every', 1))
    for i in range(i0, i1 + 1, every):
        t = i / max(n - 1, 1)
        ring = rows[i]
        c = pts[i]
        for v in ring:
            if rng.random() > spec.get('density', 0.6):
                continue
            nrm = (v.co - c)
            if nrm.length < 1e-6:
                continue
            nrm.normalize()
            only = spec.get('only')
            if only == 'top' and nrm.z < 0.1:
                continue
            if only == 'bottom' and nrm.z > -0.1:
                continue
            if only == 'side' and abs(nrm.x) < 0.45:
                continue
            if only == 'front' and nrm.y > -0.2:
                continue
            if only == 'back' and nrm.y < 0.1:
                continue
            L = lerp_profile(t, spec['length'])[0] * rng.uniform(0.75, 1.25)
            d = (nrm * spec.get('out', 0.45) + flow * spec.get('flow_k', 1.0) + Vector((0, 0, -1)) * spec.get('droop', 0.0))
            d += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * spec.get('jitter', 0.15)
            if d.length < 1e-6:
                continue
            d.normalize()
            base = c + (v.co - c) * spec.get('sink', 0.9)
            tip = base + d * L
            B.blade(base, tip, L * spec.get('width', 0.35), L * 0.06, nrm, 'Fur', color_fn(t, nrm, rng), bones,
                    curl=spec.get('curl', 0.12))
            made += 1
    return made


def tufts_on_ellipsoid(B, grid, c, spec, bones, color_fn):
    """楕円体（頭・ほお・足先）の格子の頂点に毛の房を植える。spec は scatter_fur と同じ（length は 1 つの値）"""
    rng = B.rng
    flow = V(spec.get('flow', (0, 1, 0)))
    if flow.length > 1e-6:
        flow.normalize()
    c = V(c)
    made = 0
    for row in grid:
        for v in row:
            if rng.random() > spec.get('density', 0.5):
                continue
            nrm = (v.co - c)
            if nrm.length < 1e-6:
                continue
            nrm.normalize()
            if spec.get('min_z') is not None and nrm.z < spec['min_z']:
                continue
            if spec.get('max_y') is not None and nrm.y > spec['max_y']:
                continue
            if spec.get('min_y') is not None and nrm.y < spec['min_y']:
                continue
            L = float(spec['length']) * rng.uniform(0.75, 1.25)
            d = nrm * spec.get('out', 0.5) + flow * spec.get('flow_k', 1.0) + Vector((0, 0, -1)) * spec.get('droop', 0.0)
            d += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * spec.get('jitter', 0.15)
            d.normalize()
            base = c + (v.co - c) * spec.get('sink', 0.92)
            B.blade(base, base + d * L, L * spec.get('width', 0.35), L * 0.06, nrm, 'Fur', color_fn(0.5, nrm, rng), bones,
                    curl=spec.get('curl', 0.12))
            made += 1
    return made


def build(cfg):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    B = D.Builder(cfg)
    B.mat('Fur')  # 最初の材質（頂点の色が書き出されるのは最初の材質だけ）
    sk = cfg['skeleton']
    B.bone_head, B.bone_tail, parent = {}, {}, {}
    for name, d in sk.items():
        B.bone_head[name] = V(d['head'])
        B.bone_tail[name] = V(d['tail'])
        parent[name] = d.get('parent')
    pal = cfg['palette']
    fur, fur_sh, fur_tip = hexc(pal['fur']), hexc(pal['fur_shadow']), hexc(pal.get('fur_tip', pal['fur']))
    B.extra_flat = {k: hexc(v) for k, v in pal.items() if k[0].isupper()}  # 単色の部品（Eye・Pupil・Nose …）

    def body_color(t, ca, sa):
        f = max(0.0, min(1.0, (-ca + 0.2) / 0.9))  # 腹ほど薄い紫の陰
        return mix(fur, fur_sh, f * 0.55)

    def tuft_color(t, nrm, rng):
        f = max(0.0, min(1.0, (-nrm.z + 0.3) / 1.3)) * 0.6 + rng.uniform(0.0, 0.35)
        return mix(mix(fur, fur_tip, rng.uniform(0, 0.6)), fur_sh, min(1.0, f) * 0.55)

    fur_count = 0
    tubes = {}
    for tb in cfg['tubes']:  # 胴・首・脚・尾
        rows, pts, fr = B.tube(tb['path'], tb.get('rings', 40), tb.get('sides', 16), tb['radius'], tb.get('up', (0, 0, 1)), 'Fur',
                               body_color, tb['bones'], cap_start=tb.get('cap_start', True), cap_end=tb.get('cap_end', True),
                               uv_scale=tuple(tb.get('uv', (1.0, 3.0))), flat_belly=tb.get('flat_belly', 0.0))
        tubes[tb['name']] = (rows, pts)
        for fs in tb.get('fur', []):
            fur_count += scatter_fur(B, rows, pts, fs, tb['bones'], tuft_color)
    for el in cfg['ellipsoids']:  # 頭・口先・ほお・あご・足先
        col = hexc(el['color']) if el.get('color') else body_color(0.5, el.get('ca', 1.0), 0.0)
        g = B.ellipsoid(el['c'], el['axes'], el.get('mat', 'Fur'), col, el['bones'], segs=el.get('segs', 16), rings=el.get('rings', 10))
        for fs in el.get('fur', []):
            fur_count += tufts_on_ellipsoid(B, g, el['c'], fs, el['bones'], tuft_color)
    for bl in cfg.get('blades', []):  # 耳・耳の内側・ひげの房など
        col = hexc(bl['color']) if bl.get('color') else fur
        B.blade(bl['base'], bl['tip'], bl['w'], bl.get('t', 0.02), bl['flat'], bl.get('mat', 'Fur'), col, bl['bones'],
                bend=bl.get('bend'), curl=bl.get('curl', 0.0))
    for cn in cfg.get('cones', []):  # 爪
        B.cone(cn['base'], cn['tip'], cn['r'], cn.get('sides', 8), cn.get('mat', 'Claw'), hexc(cn.get('color', pal['Claw'])), cn['bones'],
               bend=cn.get('bend'))
    for ln in cfg.get('lines', []):  # 目の上の紫の線・ひげ（細い筒）
        r = ln['r']
        B.tube(ln['path'], ln.get('rings', 16), ln.get('sides', 6), [[0, r * ln.get('start', 1.0), r * ln.get('start', 1.0)], [0.5, r, r], [1, r * ln.get('end', 0.3), r * ln.get('end', 0.3)]],
               ln.get('up', (0, 0, 1)), ln['mat'], lambda t, ca, sa: (1, 1, 1, 1), ln['bones'], uv_scale=(1.0, 1.0))
    # ── 目とまぶた（竜と同じしくみ。まぶたは毛の色の殻のてっぺん） ──
    B.blink, B.eye_info, B.brow_v, B.face = {}, [], {1: [], -1: []}, None
    for e in cfg['eyes']:
        c = V(e['center'])
        out = V(e['out'])
        g = B.ellipsoid(c, e['axes'], 'Eye', hexc(pal['Eye']), ['head'], segs=16, rings=10)
        ev = [v for row in g for v in row]
        ev += [v for row in B.ellipsoid(c + out * e['pupil_out'], e['pupil_axes'], 'Pupil', hexc(pal['Pupil']), ['head'], segs=10, rings=6) for v in row]
        ev += [v for row in B.ellipsoid(c + out * (e['pupil_out'] + 0.002) + V(e['glint']), e['glint_axes'], 'Glint', hexc('#FFFFFF'), ['head'], segs=8, rings=4) for v in row]
        lid = B.ellipsoid(c, [V(a) * 1.25 for a in e['axes']], 'Lid', body_color(0.5, 1.0, 0.0), ['head'], segs=18, rings=12)
        up = V(e['axes'][2]).normalized()
        R = V(e['axes'][2]).length * 1.25
        cap = float(e.get('lid_cap', 0.5))
        kill = []
        for row in lid:
            for v in row:
                dd = v.co - c
                if dd.dot(up) < R * cap - 1e-6 or dd.dot(out) < -0.004:
                    kill.append(v)
        bmesh.ops.delete(B.bm, geom=kill, context='VERTS')
        for row in lid:
            for v in row:
                if not v.is_valid:
                    continue
                dd = v.co - c
                h = dd.dot(up)
                f = (R - h) / max(R * (1 - cap), 1e-6)
                h2 = R - f * 2 * R
                lat = dd - up * h
                w1 = math.sqrt(max(1 - (h / R) ** 2, 0.0))
                w2 = math.sqrt(max(1 - (h2 / R) ** 2, 0.0))
                B.blink[v] = c + up * h2 + lat * (w2 / max(w1, 0.05)) + out * 0.003
        B.eye_info.append({'c': c, 'up': up, 'eye': ev, 'side': 1 if c.x > 0 else -1})
    return B, parent, fur_count


def make_fur_texture(cfg, size=256):
    """毛の筋（縦の細い線と、根元ほど暗いぼかし）。v が毛の長さの向き"""
    import numpy as np
    rng = np.random.default_rng(int(cfg.get('seed', 1)))
    W = H = size
    px = np.ones((H, W, 4), dtype=np.float32)
    lines = np.ones(W, dtype=np.float32)
    for _ in range(int(W * 0.6)):
        x = rng.integers(0, W)
        lines[x] *= rng.uniform(0.82, 0.95)
    lines = np.convolve(lines, np.ones(2) / 2, mode='same')
    yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    root = 0.86 + 0.14 * np.clip(yy * 3.0, 0, 1)   # 根元（v=0）を少し暗く
    val = np.clip(lines[None, :] * root, 0, 1)
    px[..., 0] = val
    px[..., 1] = val
    px[..., 2] = val
    return D._image('NekoFurTex', px)


def make_materials(B, cfg):
    out = []
    flat = dict(getattr(B, 'extra_flat', {}))
    fur_tex = make_fur_texture(cfg)
    for name in B.mat_names:
        m = bpy.data.materials.new('Neko' + name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        if name == 'Fur':  # 毛の筋の画像 × 頂点の色
            vc = nt.nodes.new('ShaderNodeVertexColor')
            vc.layer_name = 'Col'
            ti = nt.nodes.new('ShaderNodeTexImage')
            ti.image = fur_tex
            mul = nt.nodes.new('ShaderNodeMix')
            mul.data_type = 'RGBA'
            mul.blend_type = 'MULTIPLY'
            mul.inputs['Factor'].default_value = 1.0
            nt.links.new(vc.outputs['Color'], mul.inputs['A'])
            nt.links.new(ti.outputs['Color'], mul.inputs['B'])
            nt.links.new(mul.outputs['Result'], bsdf.inputs['Base Color'])
            m.use_backface_culling = False
        else:
            bsdf.inputs['Base Color'].default_value = flat.get(name, (1, 1, 1, 1))
        rough = {'Fur': 0.85, 'Eye': 0.1, 'Pupil': 0.1, 'Glint': 0.1, 'Claw': 0.25, 'Nose': 0.45, 'Pad': 0.7, 'EarIn': 0.8, 'Mark': 0.6, 'Lid': 0.85, 'Whisker': 0.4}
        bsdf.inputs['Roughness'].default_value = rough.get(name, 0.7)
        if name in ('Eye', 'Claw') and 'Coat Weight' in bsdf.inputs:
            bsdf.inputs['Coat Weight'].default_value = 0.8 if name == 'Eye' else 0.5
            bsdf.inputs['Coat Roughness'].default_value = 0.15
        if name == 'Glint':
            bsdf.inputs['Emission Color'].default_value = (1, 1, 1, 1)
            bsdf.inputs['Emission Strength'].default_value = 0.8
        if name in ('Lid', 'EarIn', 'Whisker', 'Mark'):
            m.use_backface_culling = False
        out.append(m)
    return out


def apply_scale(B, s):
    """「肩の高さ＝1」の単位で組んだものを、本当の大きさ（m）へ"""
    if abs(s - 1.0) < 1e-9:
        return
    for v in B.bm.verts:
        v.co *= s
    for k in B.bone_head:
        B.bone_head[k] = B.bone_head[k] * s
        B.bone_tail[k] = B.bone_tail[k] * s
    for v in list(B.blink):
        B.blink[v] = B.blink[v] * s
    for e in B.eye_info:
        e['c'] = e['c'] * s


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    cfg = json.load(open(argv[0], encoding='utf-8'))
    out = os.path.abspath(argv[1])
    blend = os.path.abspath(argv[argv.index('--blend') + 1]) if '--blend' in argv else None
    B, parent, fur_count = build(cfg)
    apply_scale(B, float(cfg.get('scale', 1.0)))
    D.make_materials = make_materials   # 竜の材質の代わりに猫又の材質を使う（finish が呼ぶ）
    res = D.finish(B, parent, cfg, out, blend)
    emit(dict({'ok': True, 'output': out, 'fur_tufts': fur_count}, **res))


try:
    main()
except BaseException as e:  # noqa: BLE001
    emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-2500:]})
