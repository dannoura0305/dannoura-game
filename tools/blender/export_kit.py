# -*- coding: utf-8 -*-
"""
わかば：Blender の部品（素材）を、共有素材ライブラリへ 2 つの版の形で書き出す（方式 C）。
  ・Web（ブラウザ版・Three.js）：glTF 2.0 バイナリ（.glb）・+Y 上・1 単位＝1m → entries/<category>/<id>/web/<id>.glb
      ただし meta.json の license が公開の Web に出せる時だけ（それ以外は source/<id>.glb に置き、Git に入れない）
  ・UE5（高性能 PC 版）：FBX（Z 上・単位の倍率を適用＝UE で cm）→ entries/<category>/<id>/source/<id>.fbx（Git に入れない）
      ＋ sources.json に sha256 を書き足し、ue5/import.json が無ければ雛形を作る
最後の判断（Web に置いてよいか・形式・大きさ）は tools/mapkit/catalog.mjs（node）が行う。docs/wakaba-mapkit/10 §3。

使い方（利用者の PC・※未検証。クラウドでは bpy 4.2 で試した：結果は docs/wakaba-mapkit/10 §6）：
  1. 書き出す物を「KIT」という名前のコレクションに入れる。物の名前＝素材の id（例 rock.test.boulder_small）
     （名前を変えたくない時は、物のカスタムプロパティ wakaba_id に id を書く）
  2. その id の meta.json を先に作る：wakaba-assets/entries/<category>/<id>/meta.json（docs/wakaba-mapkit/07 §3）
  3. blender my_kit.blend --background --python tools/blender/export_kit.py -- --library wakaba-assets/entries
     画面から：Scripting タブで開いて ARGS を書いて ▶
  --collection KIT（既定）／--selected（選んだ物だけ）／--dry（書かずに確かめるだけ）
決まり（docs/wakaba-mapkit/07 §4.4・charkit 06）：
  ・原点＝底の中心（pivot bottom_center）。外れていたら注意を出す（直さない）
  ・回転・大きさは適用済み（scale 1）。外れていたら注意（書き出しは apply される）
  ・1 単位＝1m（Blender の単位の倍率 1.0）
  ・UE の名前：SM_<id の . を _ に>、場所：/Game/Wakaba/<Category>/
"""
import hashlib
import json
import os
import re
import sys

try:
    import bpy
    HAVE_BPY = True
except ImportError:
    HAVE_BPY = False

ARGS = []
ID_RE = re.compile(r"^[a-z0-9_]+(\.[A-Za-z0-9_]+)+$")


# ───────────────────────── 純粋な部分
def ue_asset_name(asset_id, prefix="SM_"):
    return prefix + asset_id.replace(".", "_")


def ue_game_path(category, asset_id, prefix="SM_"):
    cat = "".join(w.capitalize() for w in category.split("_"))
    return "/Game/Wakaba/%s/%s" % (cat, ue_asset_name(asset_id, prefix))


def web_allowed(meta):
    """ライセンス門（mapkit/assets/gate.js）の「公開の Web」の規則の写し（早めの注意用。正は catalog.mjs）"""
    L, S = meta.get("license", {}), meta.get("source", {})
    if (L.get("id") or "unknown").lower() == "unknown" or L.get("commercial") in (None, "", "unknown", "no"):
        return False, "license が不明か商用不可"
    if not L.get("verifiedBy"):
        return False, "verifiedBy が空（人の確認待ち）"
    if L.get("redistributeRaw") != "yes":
        return False, "redistributeRaw が yes でない"
    txt = " ".join(str(x or "") for x in (L.get("id"), S.get("url"), S.get("author"), S.get("type"))).lower()
    for w in ("mixamo", "fab", "megascans", "quixel"):
        if w in txt:
            return False, w + " の物は Web に出さない"
    eng = L.get("engines") or []
    if "any" not in eng and "threejs" not in eng:
        return False, "engines に threejs も any も無い"
    if meta.get("status") in ("quarantine", "retired"):
        return False, "status が " + meta.get("status")
    return True, ""


def ue5_import_template(meta, fbx_rel):
    cat = meta["category"]
    return {
        "ue5import": "wakaba-ue5-import/1", "id": meta["id"], "assetType": "StaticMesh",
        "gamePath": ue_game_path(cat, meta["id"]), "pivot": (meta.get("tech") or {}).get("pivot", "bottom_center"),
        "source": {"file": fbx_rel, "format": "fbx"},
        "import": {"convertScene": True, "importUniformScale": 1.0, "nanite": cat in ("rock", "building_module", "building", "prop", "terrain"),
                   "collision": {"box": "simple_box", "convex": "convex", "mesh_simplified": "complex_as_simple", "none": "none"}.get((meta.get("tech") or {}).get("collision", "box"), "simple_box"),
                   "generateLightmapUVs": False, "materials": "create"},
        "notes": "export_kit.py が作った雛形。UE の画面で取り込んだら値を確かめて直す（未検証）",
    }


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def upsert_source(sources, asset_id, role, rel_path, digest, size, tool):
    s = sources or {"sources": "wakaba-asset-sources/1", "id": asset_id, "files": []}
    s["files"] = [f for f in s["files"] if f.get("path") != rel_path] + [{"role": role, "path": rel_path, "storage": "local-ignored", "sha256": digest, "bytes": size, "tool": tool}]
    return s


def find_meta(library, asset_id):
    if not os.path.isdir(library):
        return None, None
    for cat in sorted(os.listdir(library)):
        p = os.path.join(library, cat, asset_id, "meta.json")
        if os.path.isfile(p):
            return os.path.dirname(p), json.load(open(p, encoding="utf-8"))
    return None, None


def selftest():
    ok_meta = {"id": "rock.test.boulder_small", "category": "rock", "status": "approved", "source": {"type": "self_made"},
               "license": {"id": "CC0-1.0", "commercial": "yes", "redistributeRaw": "yes", "engines": ["any"], "verifiedBy": "user"}, "tech": {"pivot": "bottom_center", "collision": "box"}}
    fab = json.loads(json.dumps(ok_meta)); fab["source"] = {"type": "fab", "url": "https://www.fab.com/listings/x"}; fab["license"]["id"] = "Fab-Standard"
    return {"name": ue_asset_name("rock.test.boulder_small"), "path": ue_game_path("building_module", "bld.jp_house.wall_plaster_1x1"),
            "web_ok": web_allowed(ok_meta)[0], "web_fab": web_allowed(fab)[0], "template": ue5_import_template(ok_meta, "source/rock.test.boulder_small.fbx")}


# ───────────────────────── Blender の部分
def export_one(ob, library, dry):
    asset_id = ob.get("wakaba_id") or ob.name
    rep = {"object": ob.name, "id": asset_id, "warnings": [], "written": []}
    if not ID_RE.match(asset_id):
        rep["error"] = "名前（または wakaba_id）が素材の id の形ではない（例 rock.test.boulder_small）"
        return rep
    d, meta = find_meta(library, asset_id)
    if not meta:
        rep["error"] = "meta.json が無い：先に %s/<category>/%s/meta.json を作る" % (library, asset_id)
        return rep
    # 決まりの確かめ（原点＝底の中心・scale 1）
    if any(abs(s - 1) > 1e-4 for s in ob.scale):
        rep["warnings"].append("scale が 1 でない（%s）：Ctrl+A → 全トランスフォームを適用 を勧める" % [round(s, 4) for s in ob.scale])
    xs, ys, zs = zip(*[tuple(c) for c in ob.bound_box])
    if abs(min(zs)) > 0.01 or abs((min(xs) + max(xs)) / 2) > 0.01 or abs((min(ys) + max(ys)) / 2) > 0.01:
        rep["warnings"].append("原点が底の中心でない（底 %.3f・中心 x %.3f y %.3f）" % (min(zs), (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2))
    web_ok, why = web_allowed(meta)
    if not web_ok:
        rep["warnings"].append("Web には出さない（%s）：glb は source/ に置く" % why)
    if dry:
        return rep
    tool = "blender " + bpy.app.version_string
    os.makedirs(os.path.join(d, "source"), exist_ok=True)
    # 原点へ一時的に動かして選ぶ
    saved = (ob.location.copy(), ob.rotation_euler.copy())
    ob.location = (0, 0, 0)
    ob.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    for o in list(bpy.context.selected_objects):
        if o is not None:
            o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    try:
        glb = os.path.join(d, "web" if web_ok else "source", asset_id + ".glb")
        os.makedirs(os.path.dirname(glb), exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=glb, use_selection=True, export_format="GLB", export_yup=True, export_apply=True)
        fbx = os.path.join(d, "source", asset_id + ".fbx")
        bpy.ops.export_scene.fbx(filepath=fbx, use_selection=True, object_types={"MESH"}, apply_unit_scale=True, apply_scale_options="FBX_SCALE_UNITS",
                                 axis_forward="-Z", axis_up="Y", mesh_smooth_type="FACE", add_leaf_bones=False, use_mesh_modifiers=True)
    finally:
        ob.location, ob.rotation_euler = saved
    sp = os.path.join(d, "sources.json")
    src = json.load(open(sp, encoding="utf-8")) if os.path.isfile(sp) else None
    for path, role in ((fbx, "fbx"), (glb, "gltf")):
        rel = os.path.relpath(path, d).replace("\\", "/")
        if rel.startswith("source/"):
            src = upsert_source(src, asset_id, role, rel, sha256_file(path), os.path.getsize(path), tool)
        rep["written"].append(rel)
    json.dump(src, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ip = os.path.join(d, "ue5", "import.json")
    if not os.path.isfile(ip):
        os.makedirs(os.path.dirname(ip), exist_ok=True)
        json.dump(ue5_import_template(meta, "source/%s.fbx" % asset_id), open(ip, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        rep["written"].append("ue5/import.json")
    return rep


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else (sys.argv[1:] if not HAVE_BPY else [])
    argv = argv or ARGS
    if "--selftest" in argv:
        print(json.dumps(selftest(), ensure_ascii=False))
        return
    if not HAVE_BPY:
        print("bpy がありません（Blender の中で動かす）。名前の規則だけなら --selftest")
        sys.exit(2)
    opt = {"library": "wakaba-assets/entries", "collection": "KIT", "selected": "--selected" in argv, "dry": "--dry" in argv}
    for k in ("library", "collection"):
        if "--" + k in argv:
            opt[k] = argv[argv.index("--" + k) + 1]
    if opt["selected"]:
        objs = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    else:
        c = bpy.data.collections.get(opt["collection"])
        objs = [o for o in (c.objects if c else []) if o.type == "MESH"]
    if not objs:
        print("書き出す物がありません（コレクション %s か --selected）" % opt["collection"])
        sys.exit(1)
    reps = [export_one(o, os.path.abspath(opt["library"]), opt["dry"]) for o in objs]
    print("WAKABA_EXPORT " + json.dumps(reps, ensure_ascii=False))
    print("次に：node tools/mapkit/catalog.mjs（目録を作り直して、Web に置いてよいかを確かめる）")
    if any("error" in r for r in reps):
        sys.exit(1)


if __name__ == "__main__":
    main()
