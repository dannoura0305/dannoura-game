# -*- coding: utf-8 -*-
"""VRM を Blender（VRM Add-on for Blender）で読み込み、そのまま VRM に書き出す（高精度 3D 制作 Phase 2）

  blender -b -P vrm_roundtrip.py -- <入力.vrm> <出力.vrm> [--blend <保存する.blend>]
  標準出力に 1 行 "WCMF_RESULT {json}"

  ・--factory-startup は付けない（付けると利用者の拡張機能＝VRM アドオンが読まれない）。
  ・元の VRM は読むだけ。出力先が入力と同じなら止める。
  ・読み込んだ直後の人型の骨・表情・揺れものの数を数えて返す（書き出し後の検査と比べるため）。
"""
import bpy
import json
import os
import sys
import traceback


def emit(obj):
    print('WCMF_RESULT ' + json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def vrm1_summary(arm):
    ext = arm.data.vrm_addon_extension
    v1 = ext.vrm1
    human = v1.humanoid.human_bones
    bones = [k for k in dir(human) if not k.startswith('_')]
    mapped = 0
    for k in bones:
        b = getattr(human, k, None)
        if hasattr(b, 'node') and getattr(b.node, 'bone_name', ''):
            mapped += 1
    springs = ext.spring_bone1.springs
    return {
        'spec_version': ext.spec_version,
        'humanoid_mapped': mapped,
        'expressions_preset': sum(1 for e in v1.expressions.all_name_to_expression_dict().values()),
        'springs': len(springs),
        'spring_joints': sum(len(s.joints) for s in springs),
        'meta_name': v1.meta.vrm_name,
        'commercial': v1.meta.commercial_usage,
    }


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    src, dst = os.path.abspath(argv[0]), os.path.abspath(argv[1])
    blend = argv[argv.index('--blend') + 1] if '--blend' in argv else None
    if src == dst:
        raise SystemExit('出力先が入力と同じです（元の VRM は上書きしない）')
    if not hasattr(bpy.ops.import_scene, 'vrm'):
        raise RuntimeError('VRM アドオンが有効ではありません')
    clear_scene()
    bpy.ops.import_scene.vrm(filepath=src)
    arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if not arms:
        raise RuntimeError('アーマチュアがありません')
    before = vrm1_summary(arms[0])
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend), copy=True)
    bpy.context.view_layer.objects.active = arms[0]
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    bpy.ops.export_scene.vrm(filepath=dst)
    emit({'ok': True, 'input': src, 'output': dst, 'bytes': os.path.getsize(dst), 'imported': before, 'blend': blend})


try:
    main()
except BaseException as e:  # noqa: BLE001
    emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-1500:]})
