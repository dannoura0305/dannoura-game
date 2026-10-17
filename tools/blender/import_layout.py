# -*- coding: utf-8 -*-
"""
わかば mapkit：配置（maps/<id>/build/layout.json）と地形（build/terrain.png）から Blender の場面を組む。
方式 C（ブラウザ版＝Three.js と 高性能 PC 版＝UE5 が同じ地図データ・同じ素材ライブラリを使う）の「Blender の入口」。
docs/wakaba-mapkit/10 §4。座標の式は mapkit/core/ue.js と同じ（tests/wakaba-mapkit-bridge.test.mjs が --selftest で突き合わせる）。

使い方（利用者の PC＝Blender 5.2 LTS。クラウドでは bpy 4.2.0 と 5.2.2 の両方で試した：docs/wakaba-mapkit/10 §6。利用者の PC では未検証）：
  blender --background --python tools/blender/import_layout.py -- maps/haison/build/layout.json --save haison_layout.blend
  画面で：Blender の Scripting タブ → このファイルを開く → 下の ARGS に layout.json の場所を書いて ▶（Run Script）
  --terrain-step 2   地形の網を 2 升ごとに（軽くする）
  --no-grass         下草の点（1.8 万点）を作らない
  --kit <file.blend> 素材の .blend から「名前＝素材の id（例 veg.tree.sugi）」の物を読み込み、仮の形の代わりに使う
  --save <file.blend>
Blender が無くても（素の python3 で）：python3 tools/blender/import_layout.py --selftest  … 座標の式と PNG の読みの自己試験（JSON を出す）
Blender の版の確かめ：blender --background --python tools/blender/import_layout.py -- --selftest  … JSON の "blender" に版と判定
  （試した範囲は 4.2〜5.2.x。4.2 より古いと止める、5.3 以上は「未検証」の注意を出して続ける）

座標：layout は x＝東・y＝上・z＝北・m（Three.js・glTF と同じ右手系）。Blender は Z が上・m・右手系。
  Blender (X, Y, Z) ＝ (x, −z, y)（glTF の取り込みと同じ写し方）。回転：Euler XYZ ＝ (tilt, 0, rotY)（度）。
  → ここで作った物を glTF（+Y 上）で書き出すと layout.json の座標に戻る。FBX（UE）で書き出すと UE の (x, z, y)×100cm になる。
仮の形：部品（壁・床・屋根…）は 1×1×1 の箱・円柱・切妻の三角柱を大きさで伸ばす。物（木・岩・小物）は種類（kind＝素材の id）ごとに
  1 つの網を共有する（リンク複製）。本物の素材に替える時は、その網を差し替えれば全部が替わる（--kit も同じ仕組み）。
"""
import json
import math
import os
import struct
import sys
import time
import zlib

try:
    import bpy  # noqa: F401
    HAVE_BPY = True
except ImportError:  # 素の python3（自己試験）
    HAVE_BPY = False

# Blender の画面から ▶ で動かす時はここに書く（コマンドの -- の後ろと同じ）
ARGS = []

# ───────────────────────── Blender の版（試した範囲：bpy 4.2.0・5.2.2。export_kit.py・kit/kitlib.py にも同じ写し）
TESTED_MIN, TESTED_MAX = (4, 2), (5, 2)


def blender_version_check(out=None):
    """Blender の版を見て判定する（ok／too_old／untested_newer／no_bpy）。注意は標準エラーへ（標準出力の JSON を汚さない）"""
    if not HAVE_BPY:
        return {"version": None, "status": "no_bpy", "tested": "4.2〜5.2.x"}
    v = tuple(bpy.app.version[:2])
    st = "too_old" if v < TESTED_MIN else "untested_newer" if v > TESTED_MAX else "ok"
    msg = {"ok": "試した範囲の版です", "too_old": "4.2 より古い版は動きません（5.2 LTS を勧める）",
           "untested_newer": "5.3 以上は未検証です（動かない所があれば、エラーの文をそのまま貼ってください）"}[st]
    print("Blender %s：%s" % (bpy.app.version_string, msg), file=out or sys.stderr)
    return {"version": bpy.app.version_string, "status": st, "tested": "4.2〜5.2.x"}


def use_nodes(idb):
    """材質・世界のノードを使う。5.0 からは常にノード（use_nodes は 6.0 で消える予定・触ると注意が出る）ので 4.x の時だけ立てる"""
    if bpy.app.version < (5, 0, 0) and not idb.use_nodes:
        idb.use_nodes = True


# ───────────────────────── 純粋な部分（bpy なし）
def r3(v):
    """JavaScript の Math.round(v*1000)/1000 と同じ丸め（.5 は +∞ 側）"""
    return math.floor(v * 1000 + 0.5) / 1000 + 0.0


def to_blender(p):
    x, y, z = p
    return [r3(x), r3(-z), r3(y)]


def to_blender_rot(rot_y=0, tilt=0):
    """度：(X, Y, Z) の Euler XYZ"""
    return [r3(tilt or 0), 0, r3(rot_y or 0)]


def to_blender_size(s):
    sx, sy, sz = s
    return [r3(sx), r3(sz), r3(sy)]


def object_center(o):
    """仮の形の中心（底の中心 at から、高さの半分上・埋め込みの半分下）。mapkit/core/ue.js の objectToUE(center_basic) と同じ"""
    x, y, z = o["at"]
    return [x, y + o["size"][1] / 2 - (o.get("embed") or 0) / 2, z]


def read_png16(path):
    """16bit／8bit のグレー（色付きなら最初の色）PNG → (w, h, bits, 値の list)。インターレース無しだけ（mapkit/terrain/png.js と同じ範囲）"""
    with open(path, "rb") as f:
        b = f.read()
    if b[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("PNG ではありません: " + path)
    p, idat, hdr = 8, [], None
    while p + 8 <= len(b):
        n, t = struct.unpack(">I4s", b[p:p + 8])
        d = b[p + 8:p + 8 + n]
        if t == b"IHDR":
            hdr = struct.unpack(">IIBBBBB", d)
        elif t == b"IDAT":
            idat.append(d)
        elif t == b"IEND":
            break
        p += 12 + n
    w, h, bd, ct, _, _, il = hdr
    if il:
        raise ValueError("インターレースの PNG は読めません")
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    bpp = ch * bd // 8
    stride = w * bpp
    raw = zlib.decompress(b"".join(idat))
    out = bytearray(h * stride)
    prev = bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        src = raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)]
        row = bytearray(src)
        up = prev
        if f == 1:
            for i in range(bpp, stride):
                row[i] = (row[i] + row[i - bpp]) & 255
        elif f == 2:
            for i in range(stride):
                row[i] = (row[i] + up[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + ((a + up[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = row[i - bpp] if i >= bpp else 0
                c = up[i]
                ul = up[i - bpp] if i >= bpp else 0
                pp = a + c - ul
                pa, pb, pc = abs(pp - a), abs(pp - c), abs(pp - ul)
                row[i] = (row[i] + (a if pa <= pb and pa <= pc else c if pb <= pc else ul)) & 255
        elif f != 0:
            raise ValueError("PNG の行の濾過が違います: %d" % f)
        out[y * stride:(y + 1) * stride] = row
        prev = row
    if bd == 16:
        vals = list(struct.unpack(">%dH" % (w * h * ch), bytes(out)))
    else:
        vals = list(out)
    if ch > 1:
        vals = vals[::ch]
    return w, h, bd, vals


def heights_from_png(path, terrain):
    """layout.json の terrain の欄に従って高さ（m）の list（行 j ＝ z）"""
    w, h, bd, vals = read_png16(path)
    if (w, h) != (terrain["nx"], terrain["nz"]):
        raise ValueError("PNG の大きさ %dx%d が layout の %dx%d と違う" % (w, h, terrain["nx"], terrain["nz"]))
    mx = 65535.0 if bd == 16 else 255.0
    lo, hi = terrain["minY"], terrain["maxY"]
    return [lo + v / mx * (hi - lo) for v in vals]


def grass_points(inst):
    """instances[]（u16le:x_cm,z_cm の base64）→ [(x, z)] m"""
    import base64
    b = base64.b64decode(inst["data"])
    v = struct.unpack("<%dH" % (len(b) // 2), b)
    return [(v[i] / 100.0, v[i + 1] / 100.0) for i in range(0, len(v), 2)]


def selftest(layout_path):
    L = json.load(open(layout_path, encoding="utf-8"))
    T = L["terrain"]
    hs = heights_from_png(os.path.join(os.path.dirname(layout_path), T["file"]), T)
    nx = T["nx"]
    part = L["buildings"][0]["parts"][0]
    obj = L["objects"][0]
    samples = [[0, 0], [nx - 1, 0], [0, T["nz"] - 1], [nx // 2, T["nz"] // 3], [17, 201]]
    return {
        "to_blender": [to_blender(p) for p in ([0, 0, 0], [1.5, 2.25, -3.125], L["start"])],
        "to_blender_rot": [to_blender_rot(15, 0), to_blender_rot(-40, 30)],
        "to_blender_size": to_blender_size([0.6, 2.8, 0.15]),
        "part": {"id": part["id"], "loc": to_blender(part["c"]), "rot": to_blender_rot(part["rotY"], part.get("tilt", 0)), "size": to_blender_size(part["size"])},
        "object": {"id": obj["id"], "center": to_blender(object_center(obj))},
        "heights": [[i, j, round(hs[j * nx + i], 4)] for i, j in samples],
        "grass": len(grass_points(L["instances"][0])) if L["instances"] else 0,
        "blender": blender_version_check(),
    }


def parse_args(argv):
    opt = {"layout": None, "terrain_step": 1, "grass": True, "kit": None, "save": None, "selftest": False}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--terrain-step":
            opt["terrain_step"] = max(1, int(argv[i + 1])); i += 1
        elif a == "--no-grass":
            opt["grass"] = False
        elif a == "--kit":
            opt["kit"] = argv[i + 1]; i += 1
        elif a == "--save":
            opt["save"] = argv[i + 1]; i += 1
        elif a == "--selftest":
            opt["selftest"] = True
        elif not a.startswith("--"):
            opt["layout"] = a
        i += 1
    return opt


# ───────────────────────── Blender の部分
MAT_COLORS = {"plaster": (0.62, 0.58, 0.5), "wood": (0.33, 0.24, 0.16), "wood_dark": (0.2, 0.15, 0.1), "tatami": (0.55, 0.52, 0.32),
              "kawara": (0.22, 0.23, 0.26), "stone": (0.45, 0.45, 0.43), "torii": (0.55, 0.12, 0.08), "earth": (0.4, 0.33, 0.24)}
KIND_COLORS = {"veg": (0.16, 0.3, 0.14), "rock": (0.38, 0.37, 0.35), "prop": (0.4, 0.3, 0.2)}


def build_scene(opt):
    import bpy
    t0 = time.time()
    lp = os.path.abspath(opt["layout"])
    L = json.load(open(lp, encoding="utf-8"))
    T = L["terrain"]
    stamp = {}

    def coll(name, parent):
        c = bpy.data.collections.new(name)
        parent.children.link(c)
        return c

    def material(name, rgb):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.diffuse_color = (rgb[0], rgb[1], rgb[2], 1.0)
        use_nodes(m)
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        return m

    def place(ob, loc, rot_deg, scale=None):
        ob.location = loc
        ob.rotation_mode = "XYZ"
        ob.rotation_euler = [math.radians(a) for a in rot_deg]
        if scale:
            ob.scale = scale

    # 前の取り込みを消す（何度でも流せる）
    top_name = "Wakaba_" + L["map"]
    old = bpy.data.collections.get(top_name)
    if old:
        for ob in list(old.all_objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        for c in list(old.children_recursive):
            bpy.data.collections.remove(c)
        bpy.data.collections.remove(old)
    top = coll(top_name, bpy.context.scene.collection)
    top["wakaba_layout"] = os.path.relpath(lp) if not os.path.isabs(opt["layout"]) else lp
    top["wakaba_hash"] = L["hash"]
    c_proxy = coll("_proxies", top)
    c_terrain, c_bld, c_obj = coll("Terrain", top), coll("Buildings", top), coll("Objects", top)
    c_marks, c_paths = coll("Anchors_Goals", top), coll("Paths", top)

    # 1. 地形の網（PNG の 16bit をそのまま：Blender の画像の読み込みは使わない）
    hs = heights_from_png(os.path.join(os.path.dirname(lp), T["file"]), T)
    nx, nz, cell, st = T["nx"], T["nz"], T["cell"], opt["terrain_step"]
    ii = list(range(0, nx, st)) + ([nx - 1] if (nx - 1) % st else [])
    jj = list(range(0, nz, st)) + ([nz - 1] if (nz - 1) % st else [])
    verts = [(i * cell, -(j * cell), hs[j * nx + i]) for j in jj for i in ii]
    W = len(ii)
    faces = [(r * W + c, r * W + c + 1, (r + 1) * W + c + 1, (r + 1) * W + c) for r in range(len(jj) - 1) for c in range(W - 1)]
    me = bpy.data.meshes.new("terrain_" + L["map"])
    me.from_pydata(verts, [], faces)
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new("terrain", me)
    ob["wakaba_terrain_fingerprint"] = T["fingerprint"]
    me.materials.append(material("wk_ground", (0.25, 0.28, 0.18)))
    c_terrain.objects.link(ob)
    stamp["terrain"] = round(time.time() - t0, 2)

    # 2. 仮の形の網（共有）
    def unit_box():
        m = bpy.data.meshes.get("_unit_box")
        if m:
            return m
        v = [(x, y, z) for x in (-.5, .5) for y in (-.5, .5) for z in (-.5, .5)]
        f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        m = bpy.data.meshes.new("_unit_box")
        m.from_pydata(v, [], f)
        m.update()
        return m

    def unit_cyl(seg=10):
        m = bpy.data.meshes.get("_unit_cyl")
        if m:
            return m
        v, f = [], []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            v += [(0.5 * math.cos(a), 0.5 * math.sin(a), -0.5), (0.5 * math.cos(a), 0.5 * math.sin(a), 0.5)]
        for k in range(seg):
            a, b = 2 * k, 2 * ((k + 1) % seg)
            f.append((a, b, b + 1, a + 1))
        f.append(tuple(2 * k for k in reversed(range(seg))))
        f.append(tuple(2 * k + 1 for k in range(seg)))
        m = bpy.data.meshes.new("_unit_cyl")
        m.from_pydata(v, [], f)
        m.update()
        return m

    def unit_gable():
        """切妻の三角柱：layout のローカルで x が厚み・y が高さ・z が奥行（三角は z–y の面）。Blender のローカルへ (x, −z, y)"""
        m = bpy.data.meshes.get("_unit_gable")
        if m:
            return m
        v = []
        for ex in (-.5, .5):
            for (yy, zz) in ((-.5, -.5), (-.5, .5), (.5, 0)):
                v.append((ex, -zz, yy))
        f = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        m = bpy.data.meshes.new("_unit_gable")
        m.from_pydata(v, [], f)
        m.update()
        return m

    shapes = {"box": unit_box, "cyl": unit_cyl, "gable": unit_gable}

    # 3. 建物の部品
    n_parts = 0
    for b in L["buildings"]:
        cb = coll(b["id"], c_bld)
        cb["wakaba_kind"] = b["kind"]
        for p in b["parts"]:
            if p.get("visible") is False:
                continue
            o = bpy.data.objects.new(p["id"], shapes.get(p["shape"], unit_box)())
            place(o, to_blender(p["c"]), to_blender_rot(p["rotY"], p.get("tilt", 0)), to_blender_size(p["size"]))
            o["wakaba_id"], o["wakaba_type"], o["wakaba_mat"] = p["id"], p["type"], p["mat"]
            o["wakaba_collide"], o["wakaba_walk"] = bool(p["collide"]), bool(p["walk"])
            o.color = MAT_COLORS.get(p["mat"], (0.5, 0.5, 0.5)) + (1.0,)
            cb.objects.link(o)
            n_parts += 1
    stamp["buildings"] = round(time.time() - t0, 2)

    # 4. 物（種類ごとに網を共有。--kit や、場面に先にある「名前＝素材の id」の物があればそれを使う）
    if opt["kit"]:
        with bpy.data.libraries.load(os.path.abspath(opt["kit"]), link=False) as (src, dst):
            kinds = {o["kind"] for o in L["objects"]}
            dst.objects = [n for n in src.objects if n in kinds]
    real = {}
    for kind in sorted({o["kind"] for o in L["objects"]}):
        k = bpy.data.objects.get(kind)
        if k is not None and k.type == "MESH" and not k.name.startswith("_"):
            real[kind] = k.data
            if not k.users_collection:
                c_proxy.objects.link(k)
    by_layer = {}
    for o in L["objects"]:
        cl = by_layer.get(o["layer"]) or coll(o["layer"], c_obj)
        by_layer[o["layer"]] = cl
        if o["kind"] in real:
            ob = bpy.data.objects.new(o["id"], real[o["kind"]])
            s = o.get("scale", 1)
            place(ob, to_blender(o["at"]), to_blender_rot(o["rotY"]), (s, s, s))
        else:
            ob = bpy.data.objects.new(o["id"], shapes["cyl" if (o.get("col") or {}).get("shape") == "cyl" else "box"]())
            place(ob, to_blender(object_center(o)), to_blender_rot(o["rotY"]), to_blender_size(o["size"]))
            ob.color = KIND_COLORS.get(o["kind"].split(".")[0], (0.5, 0.5, 0.5)) + (1.0,)
        ob["wakaba_id"], ob["wakaba_kind"] = o["id"], o["kind"]
        cl.objects.link(ob)
    stamp["objects"] = round(time.time() - t0, 2)

    # 5. 下草（点だけの網。Geometry Nodes の Instance on Points で草の素材を載せる）
    n_grass = 0
    if opt["grass"]:
        for inst in L["instances"]:
            pts = grass_points(inst)
            v = []
            for (x, z) in pts:
                i, j = min(nx - 2, int(x / cell)), min(nz - 2, int(z / cell))
                u, w = x / cell - i, z / cell - j
                h = (hs[j * nx + i] * (1 - u) + hs[j * nx + i + 1] * u) * (1 - w) + (hs[(j + 1) * nx + i] * (1 - u) + hs[(j + 1) * nx + i + 1] * u) * w
                v.append((x, -z, h))
            me = bpy.data.meshes.new(inst["kind"] + "_points")
            me.from_pydata(v, [], [])
            me.update()
            ob = bpy.data.objects.new(inst["kind"] + "_points", me)
            ob["wakaba_kind"], ob["wakaba_layer"] = inst["kind"], inst["layer"]
            coll("grass", c_obj).objects.link(ob)
            n_grass += len(v)
    stamp["grass"] = round(time.time() - t0, 2)

    # 6. 印（目的地・扉・座る・階段など）と道
    for g in L["goals"]:
        e = bpy.data.objects.new("goal:" + g["id"], None)
        e.empty_display_type, e.empty_display_size = "CONE", 0.6
        e.location = to_blender(g["at"])
        e["wakaba_goal"], e["wakaba_kind"] = g["id"], g["kind"]
        c_marks.objects.link(e)
    for a in L["anchors"]:
        e = bpy.data.objects.new("anchor:" + a["id"], None)
        e.empty_display_type, e.empty_display_size = "ARROWS", 0.4
        e.location = to_blender(a.get("at") or a["from"])
        e.rotation_euler = [math.radians(v) for v in to_blender_rot(a.get("rotY", 0))]
        e["wakaba_anchor"], e["wakaba_type"] = a["id"], a["type"]
        c_marks.objects.link(e)
    s = bpy.data.objects.new("start", None)
    s.empty_display_type = "SINGLE_ARROW"
    s.location = to_blender(L["start"])
    c_marks.objects.link(s)
    for p in L["paths"]:
        cu = bpy.data.curves.new(p["id"], "CURVE")
        cu.dimensions = "3D"
        sp = cu.splines.new("POLY")
        sp.points.add(len(p["points"]) - 1)
        for k, q in enumerate(p["points"]):
            x, y, z = to_blender(q)
            sp.points[k].co = (x, y, z + 0.05, 1.0)
        ob = bpy.data.objects.new("path:" + p["id"], cu)
        ob["wakaba_width"] = p["width"]
        c_paths.objects.link(ob)

    c_proxy.hide_render = True
    stamp["total"] = round(time.time() - t0, 2)
    summary = {"map": L["map"], "hash": L["hash"], "terrainVerts": len(verts), "terrainFaces": len(faces), "parts": n_parts,
               "objects": len(L["objects"]), "kindsReal": sorted(real), "grass": n_grass, "goals": len(L["goals"]), "anchors": len(L["anchors"]),
               "seconds": stamp, "blender": bpy.app.version_string}
    print("WAKABA_IMPORT " + json.dumps(summary, ensure_ascii=False))
    if opt["save"]:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opt["save"]))
        print("書いた：" + opt["save"])
    return summary


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else (sys.argv[1:] if not HAVE_BPY else [])
    opt = parse_args(argv or ARGS)
    if opt["selftest"]:
        here = os.path.dirname(os.path.abspath(__file__))
        lp = opt["layout"] or os.path.join(here, "..", "..", "maps", "haison", "build", "layout.json")
        print(json.dumps(selftest(lp), ensure_ascii=False))
        return
    if not opt["layout"]:
        print("使い方：blender --background --python tools/blender/import_layout.py -- <layout.json> [--terrain-step 2] [--no-grass] [--kit kit.blend] [--save out.blend]")
        return
    if not HAVE_BPY:
        print("bpy がありません（Blender の中で動かす）。座標の式だけなら --selftest")
        sys.exit(2)
    if blender_version_check()["status"] == "too_old":
        sys.exit(2)
    build_scene(opt)


if __name__ == "__main__":
    main()
