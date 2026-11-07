# -*- coding: utf-8 -*-
"""原画との比較用に、VRM を「見た目」と「部位の色分け（マスク）」の 2 通りで撮る（高精度 3D 制作 Phase 4）

  blender -b -P vrm_compare_render.py -- <モデル.vrm> <出力先フォルダ> [解像度=768] [--sun 1.0] [--pose <pose.json>]
  出力: beauty_<向き>.png（VRM アドオンの MToon で描いた見た目）
        mask_<向き>.png（材質ごとに決まった 1 色で塗った絵。にじみなし）
        parts.json（材質名 → マスクの色、向き、外接箱）
        標準出力に 1 行 "WCMF_RESULT {json}"

  ・VRM アドオンで読む（MToon・人型の情報つき）。--factory-startup は付けない。
  ・カメラは vrm_views.py と同じ（正射影・同じ枠）なので、見た目とマスクの画素が 1 対 1 で重なる。
  ・--pose を付けると、各種類で「posed」（vrm_pose_fit.py で原画の関節へ合わせたポーズを付けて正面から撮る）も撮る。
    枠は T ポーズのときと同じ。parts.json の posed_joints_px に、その絵の上での関節の位置（画素）を書く
  ・元の VRM は読むだけ。
"""
import json
import math
import os
import sys
import traceback

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hq3d_pose  # noqa: E402
import vrm_views  # noqa: E402

VIEWS = [('front', 0), ('back', 180), ('left', 90)]
SUN_DEFAULT = 1.0  # 本番（Cast Engine の three.js）の明るさに合わせた値（2026-11-04 実測: ズボン #626C3C ／本番 #626D3D）。--sun で変えられる


def id_color(i):
    """材質の番号 → 見分けやすい 8bit の色（0 と 255 は使わない＝背景の白と区別する）"""
    r = 30 + (i * 67) % 200
    g = 30 + (i * 131) % 200
    b = 30 + (i * 193) % 200
    return [r, g, b]


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    model, out = os.path.abspath(argv[0]), os.path.abspath(argv[1])
    res = int(argv[2]) if len(argv) > 2 and not argv[2].startswith('--') else 768
    sun = float(argv[argv.index('--sun') + 1]) if '--sun' in argv else SUN_DEFAULT
    pose = json.load(open(argv[argv.index('--pose') + 1], encoding='utf-8')) if '--pose' in argv else None
    os.makedirs(out, exist_ok=True)
    if not hasattr(bpy.ops.import_scene, 'vrm'):
        raise RuntimeError('VRM アドオンが有効ではありません')
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.vrm(filepath=model)
    for o in bpy.context.scene.objects:  # 骨の表示用の形などは撮らない
        if o.type == 'MESH' and not any(m.type == 'ARMATURE' for m in o.modifiers) and o.parent is None:
            o.hide_render = True

    lo, hi = vrm_views.world_bbox()
    size = hi - lo
    center = (lo + hi) / 2
    cam = vrm_views.setup_scene(res)
    sc = bpy.context.scene
    dist = max(size) * 3 + 2
    full = max(size.z, size.x, size.y) * 1.08
    arm = hq3d_pose.armature(sc.objects) if pose else None
    hmap = hq3d_pose.humanoid(arm) if pose else None
    joints_px = {}

    def shoot(kind):
        for name, yaw in VIEWS:
            vrm_views.aim(cam, center, yaw, dist, full)
            sc.render.filepath = os.path.join(out, '%s_%s.png' % (kind, name))
            bpy.ops.render.render(write_still=True)
        if pose:  # 原画のポーズで正面から（枠は同じ）
            hq3d_pose.apply_pose(arm, pose['bones'], hmap)
            vrm_views.aim(cam, center, 0, dist, full)
            sc.render.filepath = os.path.join(out, '%s_posed.png' % kind)
            bpy.ops.render.render(write_still=True)
            for j, p in hq3d_pose.joints_world(arm, hmap).items():
                joints_px[j] = [round(res / 2 + (p.x - center.x) / full * res, 2), round(res / 2 - (p.z - center.z) / full * res, 2)]
            hq3d_pose.clear_pose(arm)

    # 見た目（MToon のまま）。MToon は光の向きと強さで明るさが変わるので、前上からの平行光を 1 つ置く
    if sun > 0:
        lamp = bpy.data.objects.new('wcmf_sun', bpy.data.lights.new('wcmf_sun', 'SUN'))
        lamp.data.energy = sun
        lamp.rotation_euler = (math.radians(60), 0, 0)  # 正面（-Y 側）の上から
        sc.collection.objects.link(lamp)
    shoot('beauty')

    # マスク: 材質ごとに不透明の単色の材質へ差し替え、Workbench で平らに塗る
    # （元の材質の半透明の設定が残ると、重なった部位の色が混ざって見分けられなくなる）
    # 上に重ねて描く半透明の材質（眼鏡のレンズなど）は、マスクでは面ごと外して奥を見せる。
    # VRoid の顔の部品（瞳・まつげ・眉）も BLEND だが描く順番が負（顔に貼り付く）なので残す
    mats, plain = {}, {}
    meshes = [o for o in sc.objects if o.type == 'MESH' and not o.hide_render]

    def overlay(m):
        e = m.vrm_addon_extension.mtoon1
        return e.enabled and e.alpha_mode == 'BLEND' and e.extensions.vrmc_materials_mtoon.render_queue_offset_number >= 0
    see_through = sorted({m.name for o in meshes for m in o.data.materials if m and overlay(m)})
    for o in meshes:
        idx = [i for i, m in enumerate(o.data.materials) if m and m.name in see_through]
        if not idx:
            continue
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in idx], context='FACES')
        bm.to_mesh(o.data)
        bm.free()
    # 重ねものを外した見た目（色を比べるのはこちら。レンズ越しだと瞳の色が白っぽく測れてしまう）
    shoot('bare')
    for i, m in enumerate(sorted({m.name for o in meshes for m in o.data.materials if m and m.name not in see_through})):
        c = id_color(i)
        plain[m] = mask_material('wcmf_mask_%03d' % i, c, bpy.data.materials[m])
        mats[m] = c
    for o in meshes:
        for slot in o.material_slots:
            if slot.material and slot.material.name in plain:
                slot.material = plain[slot.material.name]
    # EEVEE で光の影響なしの単色を、にじみ無し（1 サンプル・フィルタ 0）で撮る
    for lamp in [o for o in sc.objects if o.type == 'LIGHT']:
        lamp.hide_render = True
    sc.render.filter_size = 0.0
    if hasattr(sc, 'eevee'):
        sc.eevee.taa_render_samples = 1
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    shoot('mask')

    info = {'model': model, 'resolution': res, 'views': [v[0] for v in VIEWS] + (['posed'] if pose else []), 'materials': mats, 'see_through_skipped': see_through, 'sun': sun,
            'bbox': {'min': list(lo), 'max': list(hi)}, 'height_m': size.z}
    if pose:
        info['posed_joints_px'] = joints_px
        info['pose'] = {'file': os.path.abspath(argv[argv.index('--pose') + 1]), 'certainty': pose.get('certainty'), 'fit': pose.get('fit')}
    with open(os.path.join(out, 'parts.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=1)
    vrm_views.emit({'ok': True, 'out': out, 'materials': len(mats)})


def mask_material(name, c8, src):
    """マスク用の材質: 光の影響を受けない単色。元が透過（MASK/BLEND）なら、元の画像の透明な所は抜く
    （VRoid の瞳は四角い面に丸い瞳の画像を貼っているので、抜かないと白目まで「瞳」に数えてしまう）"""
    pm = bpy.data.materials.new(name)
    pm.use_nodes = True
    nt = pm.node_tree
    nt.nodes.clear()
    outn = nt.nodes.new('ShaderNodeOutputMaterial')
    emit = nt.nodes.new('ShaderNodeEmission')
    emit.inputs['Color'].default_value = (vrm_views_srgb_to_linear(c8[0]), vrm_views_srgb_to_linear(c8[1]), vrm_views_srgb_to_linear(c8[2]), 1.0)
    emit.inputs['Strength'].default_value = 1.0
    e = src.vrm_addon_extension.mtoon1
    img = e.pbr_metallic_roughness.base_color_texture.index.source if e.enabled else None
    if e.enabled and e.alpha_mode in ('MASK', 'BLEND') and img is not None:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Closest'
        cut = nt.nodes.new('ShaderNodeMath')
        cut.operation = 'GREATER_THAN'
        cut.inputs[1].default_value = e.alpha_cutoff if e.alpha_mode == 'MASK' else 0.5
        mix = nt.nodes.new('ShaderNodeMixShader')
        clear = nt.nodes.new('ShaderNodeBsdfTransparent')
        nt.links.new(tex.outputs['Alpha'], cut.inputs[0])
        nt.links.new(cut.outputs['Value'], mix.inputs['Fac'])
        nt.links.new(clear.outputs['BSDF'], mix.inputs[1])
        nt.links.new(emit.outputs['Emission'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], outn.inputs['Surface'])
        if hasattr(pm, 'surface_render_method'):
            pm.surface_render_method = 'DITHERED'
    else:
        nt.links.new(emit.outputs['Emission'], outn.inputs['Surface'])
    return pm


def vrm_views_srgb_to_linear(c8):
    c = c8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


try:
    main()
except BaseException as e:  # noqa: BLE001
    vrm_views.emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-1500:]})
