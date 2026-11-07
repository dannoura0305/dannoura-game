# -*- coding: utf-8 -*-
"""VRM に調整値（JSON）の手直しをかけて、新しい VRM に書き出す（高精度 3D 制作 Phase 3）

  blender -b -P vrm_refine.py -- <入力.vrm> <調整値.json> <出力.vrm> [--blend <保存する.blend>]
  標準出力に 1 行 "WCMF_RESULT {json}"

  調整値の形:
    { "character": "wakaba",
      "steps": [ { "op": "cat_tail_tube", "enabled": true, "note": "…", "params": { … } }, … ] }

  ・入力の VRM は読むだけ。出力先が入力と同じなら止める。
  ・手直しは steps の順にかける。enabled が false の手順は飛ばす（キャラごとにパーツを入り切りする）。
  ・VRoid から書き出し直した VRM にも、同じ JSON をかけ直せば同じ手直しになる。
  ・--factory-startup は付けない（VRM アドオンが読まれなくなる）。
"""
import json
import os
import sys
import traceback

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hq3d_parts  # noqa: E402


def emit(obj):
    print('WCMF_RESULT ' + json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    src, adj_path, dst = (os.path.abspath(a) for a in argv[:3])
    blend = os.path.abspath(argv[argv.index('--blend') + 1]) if '--blend' in argv else None
    if src == dst:
        raise SystemExit('出力先が入力と同じです（元の VRM は上書きしない）')
    if not hasattr(bpy.ops.import_scene, 'vrm'):
        raise RuntimeError('VRM アドオンが有効ではありません')
    with open(adj_path, encoding='utf-8') as f:
        adj = json.load(f)

    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.vrm(filepath=src)

    results = []
    for i, step in enumerate(adj.get('steps', [])):
        op = step.get('op')
        if not step.get('enabled', True):
            results.append({'step': i, 'op': op, 'skipped': True})
            continue
        fn = hq3d_parts.PARTS.get(op)
        if fn is None:
            raise RuntimeError('知らない手順です: %s' % op)
        results.append(dict({'step': i, 'op': op}, **fn(step.get('params', {}))))

    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend, copy=True)
    arm = hq3d_parts.armature()
    bpy.context.view_layer.objects.active = arm
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bpy.ops.export_scene.vrm(filepath=dst)
    emit({'ok': True, 'input': src, 'adjust': adj_path, 'output': dst, 'bytes': os.path.getsize(dst), 'steps': results, 'blend': blend})


try:
    main()
except BaseException as e:  # noqa: BLE001
    emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-2000:]})
