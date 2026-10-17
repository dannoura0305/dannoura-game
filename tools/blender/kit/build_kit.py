# -*- coding: utf-8 -*-
"""
わかば kit：山の廃村（写実の試験マップ）の部品を、手続きで作って素材ライブラリに置く（フェーズ 3・docs/wakaba-mapkit/11）。
  python tools/blender/kit/build_kit.py [--only <id>]... [--library wakaba-assets/entries] [--preview <フォルダ>] [--no-fbx]
  （Blender の中なら：blender --background --python tools/blender/kit/build_kit.py -- --only veg.tree.sugi）
  --selftest  Blender の版と、使う機能（glTF・FBX の書き出しの設定・Cycles など）があるかだけ確かめる（JSON・何も書かない）
要る物：bpy（Blender 4.2〜5.2.x で試した：bpy 4.2.0／5.2.2 で同じ glb になる。利用者の PC は 5.2 LTS）。
  Blender 5.2 の中で動かす時は numpy・Pillow が要る（numpy は同梱。Pillow は木の遠景の板だけで使う：docs/wakaba-mapkit/11 §2）。材質のテクスチャ（tools/mapkit/matgen/matgen.py の出力）があれば、
  木の遠景の板（impostor）と確かめの絵に使う（無ければ色だけ）。
1 部品＝1 フォルダ（wakaba-assets/entries/<category>/<id>/）：
  web/<id>.glb     ブラウザ版。節（node）の名前：LOD0・LOD1…（種類が複数なら v0_LOD0・v1_LOD0…）・IMP（木の遠景の 2 枚の板・画像を中に持つ）
                   材質の名前＝材質の id（mat.wood.cedar など）→ 描画の側で共有の PBR 材質に差し替え。頂点の色（COLOR_0）＝焼き込んだ AO
  source/<id>.fbx  UE5 へ（Git に入れない・sources.json に sha256）／ue5/import.json（雛形）／meta.json（素材メタデータ v1.1）
"""
import json
import math
import os
import sys
import time
import hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import kitlib  # noqa: E402
from kitlib import bake_ao, decimate, tris, bounds, get_material, use_nodes, fit_kwargs  # noqa: E402
from pieces import PIECES  # noqa: E402
from export_kit import ue5_import_template  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GEN = 'tools/blender/kit/build_kit.py'
VERSION = 1
AO = {  # 部品の大きさに合わせたレイの長さ（m）・本数・強さ
    'vegetation': (2.2, 18, 0.75), 'rock': (0.9, 24, 0.9), 'prop': (0.5, 20, 0.9), 'building_module': (0.35, 16, 0.85), 'building': (0.7, 20, 0.9),
}
ALPHA_MATS = {'mat.foliage.sugi', 'mat.foliage.broadleaf', 'mat.foliage.fern', 'mat.foliage.grass', 'mat.paper.shoji'}


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


MAT_LIB = os.path.join(ROOT, 'wakaba-assets', 'entries')   # 材質のテクスチャ（matgen の出力）を読む場所


def lib_tex(library, mid, kind, prefer=(512, 256, 1024)):
    d = os.path.join(MAT_LIB, 'material', mid, 'web')
    for s in prefer:
        p = os.path.join(d, '%s_%d.webp' % (kind, s))
        if os.path.isfile(p):
            return p
    return None


def textured(library, on=True):
    """Blender の中の材質に matgen のテクスチャを付ける（確かめの絵・遠景の板の撮影用）。on=False で外す（書き出しは名前と色だけ）"""
    for m in bpy.data.materials:
        if not m.name.startswith('mat.'):
            continue
        nt = m.node_tree
        bsdf = nt.nodes.get('Principled BSDF')
        for n in [n for n in nt.nodes if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'SEPARATE_COLOR', 'TEX_COORD', 'MAPPING')]:
            nt.nodes.remove(n)
        m.blend_method = 'OPAQUE'
        if not on:
            continue
        alb = lib_tex(library, m.name, 'albedo')
        if not alb:
            continue
        tile = 1.0
        mp = os.path.join(MAT_LIB, 'material', m.name, 'meta.json')
        if os.path.isfile(mp):
            tile = json.load(open(mp, encoding='utf-8')).get('material', {}).get('tileM', 1.0)
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mpn = nt.nodes.new('ShaderNodeMapping')
        mpn.inputs['Scale'].default_value = (1 / tile, 1 / tile, 1)
        nt.links.new(tc.outputs['UV'], mpn.inputs['Vector'])
        ti = nt.nodes.new('ShaderNodeTexImage')
        ti.image = bpy.data.images.load(alb, check_existing=True)
        nt.links.new(mpn.outputs['Vector'], ti.inputs['Vector'])
        nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
        if m.name in ALPHA_MATS:
            nt.links.new(ti.outputs['Alpha'], bsdf.inputs['Alpha'])
            m.blend_method = 'CLIP'
        nrm = lib_tex(library, m.name, 'normal')
        if nrm:
            tn = nt.nodes.new('ShaderNodeTexImage')
            tn.image = bpy.data.images.load(nrm, check_existing=True)
            tn.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(mpn.outputs['Vector'], tn.inputs['Vector'])
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])


def cycles(res, samples=16, transparent=True):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = transparent
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'


def world(color=(1, 1, 1), strength=1.0):
    w = bpy.data.worlds.get('W') or bpy.data.worlds.new('W')
    use_nodes(w)
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = (*color, 1)
    bg.inputs['Strength'].default_value = strength
    bpy.context.scene.world = w


def camera(loc, look, ortho=None, lens=50):
    cam = bpy.data.cameras.get('CAM') or bpy.data.cameras.new('CAM')
    co = bpy.data.objects.get('CAM') or bpy.data.objects.new('CAM', cam)
    if co.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(co)
    cam.type = 'ORTHO' if ortho else 'PERSP'
    if ortho:
        cam.ortho_scale = ortho
    cam.lens = lens
    cam.clip_end = 500
    co.location = Vector(loc)
    d = Vector(look) - Vector(loc)
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = co
    return co


def render_to(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ───────── 絵の読み書きとぼかし：Pillow があれば Pillow（今の glb はこれで作った）。Blender 本体の Python には Pillow が無いので、
#           無ければ numpy（Blender に同梱）と Blender の画像で同じことをする（ぼかしの式が少し違うだけ・見た目は同じ）
try:
    if os.environ.get('WAKABA_NO_PIL'):
        raise ImportError
    from PIL import Image, ImageFilter
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


def img_read(p):
    """PNG → (h, w, 4) の uint8（上の行から）"""
    import numpy as np
    if HAVE_PIL:
        return np.asarray(Image.open(p).convert('RGBA'))
    img = bpy.data.images.load(p)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return np.round(px.reshape(h, w, 4)[::-1] * 255).astype(np.uint8)


def img_write(arr, p):
    """(h, w, 4) の uint8 → PNG"""
    import numpy as np
    if HAVE_PIL:
        Image.fromarray(arr).save(p)
        return
    h, w = arr.shape[:2]
    img = bpy.data.images.new('_tmp_write', w, h, alpha=True)
    img.pixels.foreach_set((arr[::-1].astype(np.float32) / 255).ravel())
    img.filepath_raw = p
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


def blur(arr, r):
    """ガウスぼかし（半径 r＝標準偏差）。arr は (h, w) か (h, w, c) の uint8 → float32"""
    import numpy as np
    if HAVE_PIL:
        return np.asarray(Image.fromarray(arr).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
    x = arr.astype(np.float32)
    n = int(math.ceil(r * 3))
    k = np.exp(-0.5 * (np.arange(-n, n + 1) / r) ** 2)
    k /= k.sum()
    for ax in (0, 1):
        pad = [(0, 0)] * x.ndim
        pad[ax] = (n, n)
        xp = np.pad(x, pad, mode='edge')
        acc = np.zeros_like(x)
        for i, kv in enumerate(k):
            acc += kv * np.take(xp, range(i, i + x.shape[ax]), axis=ax)
        x = acc
    return np.round(x)


def impostor(lod0, library, out_dir, aid):
    """木の遠景の板：Cycles で正面（−y）・横（+x）・真上から撮った絵（白い空の光＝色×隠れ具合）を 1 枚に並べ、
    十字の 2 枚の縦の板＋樹冠の高さの横の板 1 枚に貼る（上から見ても木に見える）"""
    import numpy as np
    (x0, y0, z0), (x1, y1, z1) = bounds([lod0])
    W = max(x1 - x0, y1 - y0) * 1.04
    H = (z1 - z0) * 1.02
    zc = (z0 + z1) / 2
    vh = 512
    vw = int(round(vh * W / H / 16)) * 16
    vw = max(128, min(512, vw))
    W = H * vw / vh
    textured(library, True)
    world((1, 1, 1), 1.0)
    imgs = []
    for k, (loc, look, res, ortho) in enumerate((((0, -60, zc), (0, 0, zc), (vw, vh), H), ((60, 0, zc), (0, 0, zc), (vw, vh), H), ((0, 0, z1 + 60), (0, 0.001, zc), (vw, vw), W))):
        cycles(res, samples=24)
        co = camera(loc, look, ortho=ortho)
        if k == 2:
            co.rotation_euler = (0, 0, 0)        # 真上から・絵の上＝+y
        p = os.path.join(out_dir, '_imp%d.png' % k)
        render_to(p)
        im = img_read(p)
        if k == 2:   # 真上の絵は縦の絵と同じ高さの枠に入れる（下を空ける）
            pad = np.zeros((vh, vw, 4), np.uint8)
            pad[:vw] = im
            im = pad
        imgs.append(im)
        os.remove(p)
    textured(library, False)
    atlas = np.concatenate(imgs, 1)
    a = atlas[..., 3:4].astype(np.float32) / 255
    rgb = atlas[..., :3].astype(np.float32)
    filled = rgb.copy()
    m = (a[..., 0] > 0.05)
    for r in (2, 6, 16):
        bl = blur((rgb * a).astype(np.uint8), r)
        bw = blur((a[..., 0] * 255).astype(np.uint8), r) / 255
        est = bl / np.maximum(bw[..., None], 1e-3)
        fill = (~m) & (bw > 0.01)
        filled[fill] = est[fill]
        m = m | fill
    atlas = np.concatenate([np.clip(filled, 0, 255).astype(np.uint8), atlas[..., 3:4]], -1)
    ip = os.path.join(out_dir, 'imp_%s.png' % aid)
    img_write(atlas, ip)
    img = bpy.data.images.load(ip)
    img.pack()
    mat = bpy.data.materials.new('imp.' + aid)
    use_nodes(mat)
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.9
    ti = nt.nodes.new('ShaderNodeTexImage')
    ti.image = img
    nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(ti.outputs['Alpha'], bsdf.inputs['Alpha'])
    mat.blend_method = 'CLIP'
    me = bpy.data.meshes.new('IMP')
    hw = W / 2
    zb = z0 - H * 0.01
    zt = zb + H * 0.62          # 横の板の高さ（樹冠の中ほど）
    verts = [(-hw, 0, zb), (hw, 0, zb), (hw, 0, zb + H), (-hw, 0, zb + H), (0, -hw, zb), (0, hw, zb), (0, hw, zb + H), (0, -hw, zb + H),
             (-hw, -hw, zt), (hw, -hw, zt), (hw, hw, zt), (-hw, hw, zt)]
    me.from_pydata(verts, [], [(0, 1, 2, 3), (4, 5, 6, 7), (8, 9, 10, 11)])
    me.materials.append(mat)
    uv = me.uv_layers.new(name='UVMap')
    t = vw / vh   # 真上の絵の縦の割合（枠の上から）
    uvs = [(0, 0), (1 / 3, 0), (1 / 3, 1), (0, 1), (1 / 3, 0), (2 / 3, 0), (2 / 3, 1), (1 / 3, 1),
           (2 / 3, 1 - t), (1, 1 - t), (1, 1), (2 / 3, 1)]
    for p in me.polygons:
        for li in p.loop_indices:
            uv.data[li].uv = uvs[me.loops[li].vertex_index]
    ob = bpy.data.objects.new('IMP', me)
    bpy.context.scene.collection.objects.link(ob)
    # 法線は描画の側で外向き＋上向きにする（mapkit/render/assets.js）。ここで独自の法線を付けると glTF の接線が単位にならない（gltf-validator）
    os.remove(ip)
    return ob, (vw * 3, vh)


def preview(objs, library, path):
    """確かめの絵：テクスチャ付き・夕方の日と空・斜め上から"""
    textured(library, True)
    world((0.55, 0.62, 0.8), 0.9)
    sun = bpy.data.lights.get('SUN') or bpy.data.lights.new('SUN', 'SUN')
    sun.energy = 3.0
    sun.color = (1.0, 0.85, 0.7)
    so = bpy.data.objects.get('SUN') or bpy.data.objects.new('SUN', sun)
    if so.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(so)
    so.rotation_euler = (math.radians(55), 0, math.radians(-40))
    (x0, y0, z0), (x1, y1, z1) = bounds(objs)
    c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    R = max(x1 - x0, y1 - y0, z1 - z0)
    camera(c + Vector((R * 1.3, -R * 2.1, R * 1.0)), c, lens=50)
    cycles((320, 320), samples=12, transparent=False)
    render_to(path)
    textured(library, False)


def export_glb(objs, path):
    for o in objs:
        kitlib.triangulate_ngons(o)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=True, export_tangents=True, export_normals=True,
              export_materials='EXPORT', export_animations=False, export_skins=False, export_morph=False, export_cameras=False, export_lights=False,
              export_extras=False, export_image_format='WEBP')
    # 頂点の色（AO）：4.2 以上は export_vertex_color（5.2 も同じ）。古い名前 export_colors は 4.2 で廃止
    if 'export_vertex_color' in kitlib.op_props(bpy.ops.export_scene.gltf):
        kw['export_vertex_color'] = 'ACTIVE'
    else:
        kw['export_colors'] = True
    bpy.ops.export_scene.gltf(**fit_kwargs(bpy.ops.export_scene.gltf, kw, 'glTF の書き出し'))


def export_fbx(objs, path):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    kw = dict(filepath=path, use_selection=True, object_types={'MESH'}, apply_unit_scale=True, apply_scale_options='FBX_SCALE_UNITS',
              axis_forward='-Z', axis_up='Y', mesh_smooth_type='FACE', add_leaf_bones=False, use_mesh_modifiers=True, path_mode='STRIP')
    bpy.ops.export_scene.fbx(**fit_kwargs(bpy.ops.export_scene.fbx, kw, 'FBX の書き出し'))


def build_one(aid, library, prev_dir, fbx=True):
    fn, cat, ja, en, tags, collision, lod_dist = PIECES[aid]
    kitlib.reset()
    t0 = time.time()
    res = fn()
    d = os.path.join(library, cat, aid)
    os.makedirs(os.path.join(d, 'web'), exist_ok=True)
    os.makedirs(os.path.join(d, 'source'), exist_ok=True)
    dist, rays, strength = AO[cat]
    objs, nodes = [], {}
    if 'lods' in res:
        lods = res['lods']
        for k, ob in enumerate(lods):
            bake_ao(ob, rays=rays, dist=dist, strength=strength * (1 if k == 0 else 0.85))
            ob.name = 'LOD%d' % k
            objs.append(ob)
            nodes[ob.name] = tris(ob)
        variants = 1
        base = lods[0]
    else:
        vs = res['variants']
        variants = len(vs)
        ratios = res.get('lods_ratio', [1.0])
        for vi, ob in enumerate(vs):
            bake_ao(ob, rays=rays, dist=dist, strength=strength)
            pre = ('v%d_' % vi) if variants > 1 else ''
            for li, ratio in enumerate(ratios):
                o2 = ob if li == 0 else decimate(ob, ratio, pre + 'LOD%d' % li)
                o2.name = pre + 'LOD%d' % li
                objs.append(o2)
                nodes[o2.name] = tris(o2)
        base = vs[0]
    imp = None
    if res.get('impostor'):
        imp, isz = impostor(base, library, d, aid)
        objs.append(imp)
        nodes['IMP'] = tris(imp)
    (x0, y0, z0), (x1, y1, z1) = bounds([base])
    if prev_dir:
        os.makedirs(prev_dir, exist_ok=True)
        hide = [o for o in objs if o not in (res.get('lods', [None])[0:1] + res.get('variants', []))]
        for o in hide:
            o.hide_render = True
        shown = [o for o in objs if not o.hide_render]
        if len(shown) > 1 and 'variants' in res:
            for k, o in enumerate(shown):
                o.location.x = (k - (len(shown) - 1) / 2) * (x1 - x0) * 1.25     # 種類を横に並べて撮る（重なると Cycles で黒くなる）
        preview([o for o in objs if not o.hide_render], library, os.path.join(prev_dir, aid + '.png'))
        for o in hide:
            o.hide_render = False
    for o in objs:
        o.location = (0, 0, 0)
    glb = os.path.join(d, 'web', aid + '.glb')
    for old in os.listdir(os.path.join(d, 'web')):
        os.remove(os.path.join(d, 'web', old))
    export_glb(objs, glb)
    files = []
    if fbx:
        fp = os.path.join(d, 'source', aid + '.fbx')
        export_fbx([o for o in objs if o.name.endswith('LOD0')], fp)
        files.append({'role': 'fbx', 'path': 'source/%s.fbx' % aid, 'storage': 'local-ignored', 'sha256': sha(fp), 'bytes': os.path.getsize(fp),
                      'tool': 'bpy ' + bpy.app.version_string, 'note': 'UE5 へ（LOD0）。作り直し：python %s --only %s' % (GEN, aid)})
    mats = sorted({m.name for o in objs for m in o.data.materials if m})
    lod_names = sorted(n for n in nodes)
    meta = {
        'id': aid, 'version': VERSION, 'name': {'ja': ja, 'en': en}, 'category': cat, 'tags': tags + ['手続き', '自作'],
        'source': {'type': 'self_made', 'author': 'わかば（リポジトリの手続きの生成：Claude Code が書いたスクリプト）', 'generator': GEN, 'url': ''},
        'license': {'id': 'own', 'commercial': 'yes', 'redistributeRaw': 'yes', 'engines': ['any'], 'attribution': '', 'verifiedBy': '',
                    'textUrl': 'docs/wakaba-mapkit/11_写実化パイプライン.md'},
        'tech': {'formats': ['glb', 'fbx'], 'tris': nodes.get('LOD0', nodes.get('v0_LOD0', 0)),
                 'lods': [nodes[n] for n in lod_names if n.endswith('LOD0') or n.endswith('LOD1') or n.endswith('LOD2')][:3] if variants == 1 else [nodes['v0_LOD%d' % k] for k in range(len(res.get('lods_ratio', [1])))],
                 'sizeM': [round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)], 'pivot': 'bottom_center', 'collision': {'cyl': 'convex', 'box': 'box', 'none': 'none'}[collision],
                 'texMaps': ['baseColor', 'normal', 'ao', 'roughness'], 'fileBytes': os.path.getsize(glb)},
        'use': ['山の廃村（写実の試験マップ）'],
        'status': 'draft',
        'kit': {
            'kit': 'wakaba-kit/1', 'nodes': nodes, 'variants': variants, 'lodDist': lod_dist, 'impostor': bool(imp), 'materials': mats,
            'vertexColor': 'COLOR_0＝AO（焼き込み）', 'note': '節の名前 LOD<n>（種類が複数なら v<k>_LOD<n>）・IMP＝遠景の十字の板（画像は glb の中）。材質は id の名前で共有の PBR 材質に差し替える',
        },
        'history': [{'at': '2026-10-17', 'by': 'claude-code', 'change': '%s で生成（フェーズ 3）' % GEN}],
    }
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'sources': 'wakaba-asset-sources/1', 'id': aid, 'files': files}, open(os.path.join(d, 'sources.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(d, 'ue5'), exist_ok=True)
    tpl = ue5_import_template(meta, 'source/%s.fbx' % aid)
    if cat == 'vegetation':
        tpl['import']['nanite'] = False
    json.dump(tpl, open(os.path.join(d, 'ue5', 'import.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return {'id': aid, 'secs': round(time.time() - t0, 1), 'glbKB': round(os.path.getsize(glb) / 1024, 1), 'nodes': nodes, 'size': meta['tech']['sizeM']}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    only, library, prev, fbx = [], os.path.join(ROOT, 'wakaba-assets', 'entries'), None, True
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--only':
            only.append(argv[i + 1]); i += 1
        elif a == '--library':
            library = os.path.abspath(argv[i + 1]); i += 1
        elif a == '--preview':
            prev = os.path.abspath(argv[i + 1]); i += 1
        elif a == '--no-fbx':
            fbx = False
        elif a == '--selftest':
            r = {'blender': kitlib.blender_version_check(), 'api': kitlib.api_probe(), 'pieces': len(PIECES)}
            print(json.dumps(r, ensure_ascii=False))
            sys.exit(0 if r['api']['ok'] and r['blender']['status'] != 'too_old' else 1)
        i += 1
    if kitlib.blender_version_check()['status'] == 'too_old':
        sys.exit(2)
    ids = only or list(PIECES)
    total = 0
    for aid in ids:
        if aid not in PIECES:
            print('✗ 知らない部品：' + aid)
            sys.exit(2)
        r = build_one(aid, library, prev, fbx)
        total += r['glbKB']
        print('WAKABA_KIT ' + json.dumps(r, ensure_ascii=False), flush=True)
    print('合計 glb %.2fMB（%d 部品）' % (total / 1024, len(ids)))


if __name__ == '__main__':
    main()
