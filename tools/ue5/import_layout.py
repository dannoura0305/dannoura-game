# -*- coding: utf-8 -*-
"""
わかば mapkit → Unreal Engine 5：配置（maps/<id>/build/layout.json）から UE のレベルに物を置く（Unreal Editor の Python）。
方式 C の「高性能 PC 版（UE5）」の入口。※このスクリプトは UE の中で一度も動かしていない（未検証）。クラウドには UE が無いため。
座標の式（下の純粋な部分）だけは、素の python3 の --selftest で mapkit/core/ue.js と突き合わせて試験している（tests/wakaba-mapkit-bridge.test.mjs）。

前提（tools/ue5/README.md の手順）：
  1. node tools/mapkit/build_map.mjs maps/haison          … layout.json・terrain.png（クラウドで作り済みなら git pull だけ）
  2. node tools/mapkit/export_ue_heightmap.mjs maps/haison … build/ue/heightmap_505.png・landscape.json（同上）
  3. UE の Landscape モードで heightmap を取り込む（値は landscape.json。この手順は手作業：UE5 の Python に Landscape を
     取り込む公開の関数が無い・または版で違うため、このスクリプトは値を表示するだけ）
  4. UE のエディタ：Edit → Plugins で「Python Editor Script Plugin」を有効 → 再起動
     Output Log の下の欄を「Python」にして：
       py "C:/path/to/dannoura-game/tools/ue5/import_layout.py" --layout "C:/path/to/dannoura-game/maps/haison/build/layout.json"
     （--asset-map <ue5_asset_map.json>：node tools/mapkit/catalog.mjs --ue5-map で作る「素材の id → /Game の場所」の表。無ければ全部が仮の形）
     （--folder Wakaba/haison：アウトライナーのフォルダ・--no-objects：建物だけ・--dry-run：置かずに数だけ）
  何度流しても同じ：前に置いた物（タグ wakaba:<地図の id>）を消してから置く。Ctrl+Z で 1 回分を戻せる（1 つのトランザクション）。

座標：layout は x＝東・y＝上・z＝北・m（右手系）。UE は X・Y・Z（Z が上）・cm（左手系）。
  UE (X, Y, Z) ＝ (x, z, y) × 100。Yaw ＝ −rotY・Roll ＝ tilt・Pitch ＝ 0。大きさ [幅, 高さ, 奥行] → scale (幅, 奥行, 高さ)
  （/Engine/BasicShapes/Cube・Cylinder は 100cm・中心が原点なので、m の値がそのまま倍率になる）
  Landscape は landscape.json の Location・Scale で置くと、この座標とそのまま重なる（画像の列＝X・行＝Y）。
下草（1.8 万点）は 1 つずつ置かない：node tools/mapkit/export_ue_heightmap.mjs maps/haison --points の pcg_points.csv を
  データテーブル（または PCG のグラフ）に読み込んで散らす（README の「下草」）。
"""
import json
import math
import os
import sys

ARGS = []   # UE の画面から ▶ で動かす時はここに書く（例 ["--layout", "C:/.../layout.json"]）


# ───────────────────────── 純粋な部分（unreal なし・mapkit/core/ue.js と同じ式）
def r3(v):
    return math.floor(v * 1000 + 0.5) / 1000 + 0.0


def to_ue(p):
    x, y, z = p
    return [r3(x * 100), r3(z * 100), r3(y * 100)]


def to_ue_rot(rot_y=0, tilt=0):
    return {"roll": r3(tilt or 0), "pitch": 0, "yaw": r3(-(rot_y or 0))}


def to_ue_size(s):
    sx, sy, sz = s
    return [r3(sx), r3(sz), r3(sy)]


def part_to_ue(p):
    return {"id": p["id"], "location": to_ue(p["c"]), "rotation": to_ue_rot(p["rotY"], p.get("tilt", 0)), "scale": to_ue_size(p["size"]), "shape": p["shape"]}


def object_to_ue(o, pivot="center_basic"):
    at = list(o["at"])
    if pivot == "center_basic":
        at[1] += o["size"][1] / 2 - (o.get("embed") or 0) / 2
        return {"id": o["id"], "kind": o["kind"], "location": to_ue(at), "rotation": to_ue_rot(o["rotY"]), "scale": to_ue_size(o["size"])}
    s = r3(o.get("scale", 1))
    return {"id": o["id"], "kind": o["kind"], "location": to_ue(at), "rotation": to_ue_rot(o["rotY"]), "scale": [s, s, s]}


BASIC = {"box": "/Engine/BasicShapes/Cube", "cyl": "/Engine/BasicShapes/Cylinder", "gable": "/Engine/BasicShapes/Cube", "cone": "/Engine/BasicShapes/Cone"}


def plan(layout, asset_map=None, with_objects=True):
    """置く物の一覧（unreal なしで作れる）：[{ label, mesh, location, rotation, scale, folder, tags }]"""
    amap = (asset_map or {}).get("assets", asset_map or {})
    m = layout["map"]
    out = []
    for b in layout["buildings"]:
        for p in b["parts"]:
            if p.get("visible") is False:
                continue
            t = part_to_ue(p)
            out.append({"label": p["id"], "mesh": BASIC.get(p["shape"], BASIC["box"]), "location": t["location"], "rotation": t["rotation"], "scale": t["scale"],
                        "folder": "buildings/" + b["id"], "tags": ["wakaba:" + m, "wakaba_part:" + p["type"], "wakaba_mat:" + p["mat"]] + (["wakaba_walk"] if p["walk"] else [])})
    if with_objects:
        for o in layout["objects"]:
            real = amap.get(o["kind"])
            if real:
                t = object_to_ue(o, pivot=real.get("pivot", "bottom_center"))
                mesh = real["path"]
            else:
                t = object_to_ue(o)
                mesh = BASIC["cyl" if o["col"]["shape"] == "cyl" else "box"]
            out.append({"label": o["id"].replace("#", "_"), "mesh": mesh, "location": t["location"], "rotation": t["rotation"], "scale": t["scale"],
                        "folder": "objects/" + o["layer"], "tags": ["wakaba:" + m, "wakaba_kind:" + o["kind"]]})
    return out


def marks(layout):
    m = layout["map"]
    out = [{"label": "goal_" + g["id"], "location": to_ue(g["at"]), "yaw": 0, "tags": ["wakaba:" + m, "wakaba_goal:" + g["id"]]} for g in layout["goals"]]
    for a in layout["anchors"]:
        out.append({"label": "anchor_" + a["id"], "location": to_ue(a.get("at") or a["from"]), "yaw": to_ue_rot(a.get("rotY", 0))["yaw"], "tags": ["wakaba:" + m, "wakaba_anchor:" + a["type"]]})
    return out


def selftest(layout_path):
    L = json.load(open(layout_path, encoding="utf-8"))
    part = L["buildings"][0]["parts"][0]
    tilted = next((p for b in L["buildings"] for p in b["parts"] if p.get("tilt")), part)
    o = L["objects"][0]
    pl = plan(L)
    return {
        "to_ue": [to_ue(p) for p in ([0, 0, 0], [1.5, 2.25, -3.125], L["start"])],
        "to_ue_rot": [to_ue_rot(15, 0), to_ue_rot(-40, 30)],
        "to_ue_size": to_ue_size([0.6, 2.8, 0.15]),
        "part": part_to_ue(part), "tilted": part_to_ue(tilted),
        "object_basic": object_to_ue(o), "object_real": object_to_ue(o, "bottom_center"),
        "plan": {"count": len(pl), "first": pl[0], "marks": len(marks(L))},
    }


def parse_args(argv):
    opt = {"layout": None, "asset_map": None, "folder": None, "objects": True, "dry": False, "selftest": False, "landscape": None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--layout", "--asset-map", "--folder", "--landscape"):
            opt[a[2:].replace("-", "_")] = argv[i + 1]; i += 1
        elif a == "--no-objects":
            opt["objects"] = False
        elif a == "--dry-run":
            opt["dry"] = True
        elif a == "--selftest":
            opt["selftest"] = True
        elif not a.startswith("--"):
            opt["layout"] = a
        i += 1
    return opt


# ───────────────────────── UE の部分（unreal モジュール。Unreal Editor の中だけ）
def run_in_unreal(opt, L, items, mk):
    import unreal
    folder_root = opt["folder"] or ("Wakaba/" + L["map"])
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    tag = "wakaba:" + L["map"]
    # 前に置いた物を消す
    old = [a for a in actors.get_all_level_actors() if tag in [str(t) for t in a.tags]]
    with unreal.ScopedEditorTransaction("Wakaba import " + L["map"]):
        for a in old:
            actors.destroy_actor(a)
        cache = {}

        def mesh(path):
            if path not in cache:
                cache[path] = unreal.EditorAssetLibrary.load_asset(path)
                if cache[path] is None:
                    unreal.log_warning("見つからない：%s（仮の箱にする）" % path)
                    cache[path] = unreal.EditorAssetLibrary.load_asset(BASIC["box"])
            return cache[path]

        with unreal.ScopedSlowTask(len(items) + len(mk), "わかば：%s を置いています" % L["map"]) as task:
            task.make_dialog(True)
            for it in items:
                if task.should_cancel():
                    break
                task.enter_progress_frame(1)
                r = it["rotation"]
                a = actors.spawn_actor_from_object(mesh(it["mesh"]), unreal.Vector(*it["location"]), unreal.Rotator(roll=r["roll"], pitch=r["pitch"], yaw=r["yaw"]))
                if a is None:
                    continue
                a.set_actor_scale3d(unreal.Vector(*it["scale"]))
                a.set_actor_label(it["label"])
                a.set_folder_path(folder_root + "/" + it["folder"])
                a.set_editor_property("tags", [unreal.Name(t) for t in it["tags"]])
            for it in mk:
                task.enter_progress_frame(1)
                a = actors.spawn_actor_from_class(unreal.TargetPoint, unreal.Vector(*it["location"]), unreal.Rotator(roll=0, pitch=0, yaw=it["yaw"]))
                if a is None:
                    continue
                a.set_actor_label(it["label"])
                a.set_folder_path(folder_root + "/marks")
                a.set_editor_property("tags", [unreal.Name(t) for t in it["tags"]])
            s = to_ue(L["start"])
            ps = actors.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(s[0], s[1], s[2] + 100), unreal.Rotator(0, 0, 0))
            if ps:
                ps.set_actor_label("wakaba_start")
                ps.set_folder_path(folder_root + "/marks")
                ps.set_editor_property("tags", [unreal.Name(tag)])
    unreal.log("わかば：%s を置いた（物 %d・印 %d・前の %d 個を消した）" % (L["map"], len(items), len(mk), len(old)))


def main():
    argv = sys.argv[1:] or ARGS
    opt = parse_args(argv)
    here = os.path.dirname(os.path.abspath(__file__))
    if opt["selftest"]:
        lp = opt["layout"] or os.path.join(here, "..", "..", "maps", "haison", "build", "layout.json")
        print(json.dumps(selftest(lp), ensure_ascii=False))
        return
    if not opt["layout"]:
        print('使い方（UE の Output Log・Python）：py "<repo>/tools/ue5/import_layout.py" --layout "<repo>/maps/haison/build/layout.json" [--asset-map map.json] [--folder Wakaba/haison] [--no-objects] [--dry-run]')
        return
    L = json.load(open(opt["layout"], encoding="utf-8"))
    amap = json.load(open(opt["asset_map"], encoding="utf-8")) if opt["asset_map"] else None
    items, mk = plan(L, amap, opt["objects"]), marks(L)
    lj = opt["landscape"] or os.path.join(os.path.dirname(opt["layout"]), "ue", "landscape.json")
    if os.path.isfile(lj):
        S = json.load(open(lj, encoding="utf-8"))["landscape"]
        print("Landscape（手作業で取り込む値）：解像度 %s・区画 %s・%s quads・%s sections・Location %s・Scale %s" % (S["overallResolution"], S["components"], S["quadsPerSection"], S["sectionsPerComponent"], S["location"], S["scale"]))
    else:
        print("landscape.json が無い：node tools/mapkit/export_ue_heightmap.mjs maps/%s を先に" % L["map"])
    real = sorted({i["mesh"] for i in items if not i["mesh"].startswith("/Engine/")})
    print("置く物：%d（建物の部品 %d・物 %d）・印 %d・本物の素材 %d 種類 %s" % (len(items), sum(1 for i in items if i["folder"].startswith("buildings")), sum(1 for i in items if i["folder"].startswith("objects")), len(mk), len(real), real[:5]))
    if opt["dry"]:
        return
    try:
        import unreal  # noqa: F401
    except ImportError:
        print("unreal モジュールがありません：Unreal Editor の中（Output Log の Python）で動かしてください。座標の式だけなら --selftest")
        sys.exit(2)
    run_in_unreal(opt, L, items, mk)


if __name__ == "__main__":
    main()
