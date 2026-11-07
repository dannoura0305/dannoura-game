# -*- coding: utf-8 -*-
"""VRM / glTF のモデルを決まった角度から撮る（原画との比較用・高精度 3D 制作 Phase 4 の土台）

  blender -b --factory-startup -P vrm_views.py -- <モデル(.vrm/.glb)> <出力先フォルダ> [解像度=1024]
  出力: <出力先>/front.png, left45.png, right45.png, left.png, right.png, back.png, face.png
        標準出力に 1 行 "WCMF_RESULT {json}"

  ・.vrm は glTF 2.0 の glb なので、Blender 標準の glTF 読み込みで開く（VRM アドオンは要らない）。
    ただし VRM 固有の情報（MToon・表情の定義・揺れもの）は読まれないので、色味は原画どおりにはならない。
    形（シルエット）と配置の比較に使う。
  ・カメラは正射影。全身はモデルの外接箱に合わせ、顔は頭の骨（無ければ上端）に寄せる。
  ・元のファイルは読むだけで書き換えない。
"""
import bpy
import json
import math
import os
import shutil
import sys
import tempfile
import traceback

from mathutils import Vector

VIEWS = [  # 名前, モデルを見る向き（度。0＝正面＝-Y 側から見る）
    ('front', 0), ('left45', 45), ('right45', -45), ('left', 90), ('right', -90), ('back', 180),
]


def emit(obj):
    print('WCMF_RESULT ' + json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = path
    tmp = None
    if path.lower().endswith('.vrm'):  # 拡張子だけ glb にした写しを読む（元は触らない）
        tmp = tempfile.mkdtemp(prefix='wcmf_views_')
        src = os.path.join(tmp, 'model.glb')
        shutil.copyfile(path, src)
    bpy.ops.import_scene.gltf(filepath=src)
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    # glTF 読み込みが骨の表示用に作る球（Icosphere）は撮らない・大きさにも数えない
    has_arm = any(o.type == 'ARMATURE' for o in bpy.context.scene.objects)
    for o in bpy.context.scene.objects:
        if has_arm and o.type == 'MESH' and o.parent is None and not any(m.type == 'ARMATURE' for m in o.modifiers):
            o.hide_render = True


def world_bbox():
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.hide_render:
            continue
        ev = o.evaluated_get(dg)
        m = ev.to_mesh()
        for v in m.vertices:
            p = ev.matrix_world @ v.co
            lo = Vector(map(min, lo, p))
            hi = Vector(map(max, hi, p))
        ev.to_mesh_clear()
    return lo, hi


def head_point(hi):
    for o in bpy.context.scene.objects:
        if o.type != 'ARMATURE':
            continue
        for b in o.data.bones:
            if b.name.lower() in ('j_bip_c_head', 'head'):
                return o.matrix_world @ b.head_local
    return Vector((0, 0, hi.z - 0.12))


def setup_scene(res):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
    sc.render.resolution_x = res
    sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('wcmf_world')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    sc.world = w
    cam = bpy.data.objects.new('wcmf_cam', bpy.data.cameras.new('wcmf_cam'))
    cam.data.type = 'ORTHO'
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def aim(cam, target, yaw_deg, dist, ortho):
    yaw = math.radians(yaw_deg)
    # 正面＝-Y 側から +Y を見る。yaw だけモデルの周りを回る
    off = Vector((math.sin(yaw) * dist, -math.cos(yaw) * dist, 0))
    cam.location = target + off
    cam.rotation_euler = (math.radians(90), 0, yaw)
    cam.data.ortho_scale = ortho
    cam.data.clip_end = dist * 4


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    model, out = argv[0], argv[1]
    res = int(argv[2]) if len(argv) > 2 else 1024
    os.makedirs(out, exist_ok=True)
    load(model)
    lo, hi = world_bbox()
    size = hi - lo
    center = (lo + hi) / 2
    cam = setup_scene(res)
    dist = max(size) * 3 + 2
    full = max(size.z, size.x, size.y) * 1.08
    files = {}
    for name, yaw in VIEWS:
        aim(cam, center, yaw, dist, full)
        path = os.path.join(out, name + '.png')
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        files[name] = path
    hp = head_point(hi)
    face_c = Vector((center.x, center.y, (hp.z + hi.z) / 2))
    aim(cam, face_c, 0, dist, max(0.32, (hi.z - hp.z) * 1.6))
    path = os.path.join(out, 'face.png')
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    files['face'] = path
    emit({'ok': True, 'files': files, 'bbox': {'min': list(lo), 'max': list(hi)}, 'height_m': size.z})


if __name__ == '__main__':  # 他のスクリプトから import したときは撮らない
    try:
        main()
    except Exception as e:  # noqa: BLE001
        emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-1500:]})
