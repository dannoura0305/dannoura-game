# -*- coding: utf-8 -*-
""".glb（人型でない生き物）を正面・横・背面から撮る（設計図と並べて見るため）

  blender -b --factory-startup -P hq3d_glb_views.py -- <モデル.glb> <出力フォルダ> [画素 768]
  出力: front.png・left.png（モデルの左から＝顔が画面の左）・back.png。背景は白。標準出力に "WCMF_RESULT {json}"
"""
import json
import math
import os
import sys
import traceback

import bpy
from mathutils import Vector


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    src, out = os.path.abspath(argv[0]), os.path.abspath(argv[1])
    size = int(argv[2]) if len(argv) > 2 else 768
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    sc = bpy.context.scene
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in sc.objects:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    ctr = (lo + hi) / 2
    ext = hi - lo
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.film_transparent = False
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sc.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = max(ext.x, ext.y, ext.z) * 1.08
    cam.data.clip_end = 1000
    sc.collection.objects.link(cam)
    sc.camera = cam
    dist = max(ext) * 3
    views = {'front': (Vector((0, -1, 0)), (math.radians(90), 0, 0)),
             'left': (Vector((1, 0, 0)), (math.radians(90), 0, math.radians(90))),
             'back': (Vector((0, 1, 0)), (math.radians(90), 0, math.radians(180)))}
    made = []
    for name, (d, rot) in views.items():
        cam.location = ctr + d * dist
        cam.rotation_euler = rot
        sc.render.filepath = os.path.join(out, name + '.png')
        bpy.ops.render.render(write_still=True)
        made.append(sc.render.filepath)
    print('WCMF_RESULT ' + json.dumps({'ok': True, 'files': made, 'size_m': [round(v, 3) for v in ext]}))


try:
    main()
except BaseException as e:  # noqa: BLE001
    print('WCMF_RESULT ' + json.dumps({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-2000:]}))
