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
UE 5.8.3（利用者の PC・2026-10-17）向けの直し（フェーズ 4。まだ UE の中では動かしていない＝未検証）：
  ・物を置く：unreal.EditorActorSubsystem（5.0 から。古い EditorLevelLibrary の置く・消す関数は 5.x で非推奨）。見つからない時だけ古い方を使う
  ・FBX の取り込み（--import-kit）：UE 5.5 以降は FBX も Interchange で読む設定が既定になった（版・プロジェクトの設定で違う）。
    Interchange が使える時は AssetImportTask.options に InterchangeGenericAssetsPipeline を入れ、Nanite・当たり・LOD をその中で決める。
    使えない時（Interchange.FeatureFlags.Import.FBX が 0 など）は古い FbxImportUI に切り替える。名前の決め方は Interchange では
    destination_name が効かない（Epic の文書）ので、取り込んだ後に SM_<id> へ名前を変える
  ・属性の名前が版で違う時は止まらずに「設定できなかった名前」を Output Log に出す（その行を貼ってもらう）
  ・遊びの印（フェーズ 4）：戸・門（wakaba_door:<型>）・チェックポイント（wakaba_checkpoint）・敵の巡回の点（wakaba_enemy_route:<id>）を TargetPoint で置く
  --selftest は UE なしで動く：座標の式と、UE の関数を呼ぶ順番（偽物の unreal で run_in_unreal・run_import_kit を通す）を確かめる
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
                mesh = BASIC["cyl" if (o.get("col") or {}).get("shape") == "cyl" else "box"]   # col が null（飾り・当たりなし）も箱で置く
            out.append({"label": o["id"].replace("#", "_"), "mesh": mesh, "location": t["location"], "rotation": t["rotation"], "scale": t["scale"],
                        "folder": "objects/" + o["layer"], "tags": ["wakaba:" + m, "wakaba_kind:" + o["kind"]]})
    return out


def marks(layout):
    m = layout["map"]
    out = [{"label": "goal_" + g["id"], "location": to_ue(g["at"]), "yaw": 0, "tags": ["wakaba:" + m, "wakaba_goal:" + g["id"]]} for g in layout["goals"]]
    for a in layout["anchors"]:
        out.append({"label": "anchor_" + a["id"], "location": to_ue(a.get("at") or a["from"]), "yaw": to_ue_rot(a.get("rotY", 0))["yaw"], "tags": ["wakaba:" + m, "wakaba_anchor:" + a["type"]]})
    gp = layout.get("gameplay") or {}
    for d in gp.get("doors", []):
        out.append({"label": "door_" + d["id"], "location": to_ue(d["at"]), "yaw": to_ue_rot(d.get("rotY", 0))["yaw"], "tags": ["wakaba:" + m, "wakaba_door:" + d["kind"], "wakaba_door_initial:" + d.get("initial", "closed"), "wakaba_door_width:%s" % d["width"]]})
    for c in gp.get("checkpoints", []):
        out.append({"label": "checkpoint_" + c["id"], "location": to_ue(c["at"]), "yaw": 0, "tags": ["wakaba:" + m, "wakaba_checkpoint"]})
    for e in gp.get("enemies", []):
        out.append({"label": "enemy_spawn_" + e["id"], "location": to_ue(e["spawn"]), "yaw": 0, "tags": ["wakaba:" + m, "wakaba_enemy_spawn:" + e["id"], "wakaba_enemy_ai:" + e["ai"]]})
        for i, w in enumerate(e.get("route", [])):
            out.append({"label": "enemy_route_%s_%02d" % (e["id"], i), "location": to_ue(w), "yaw": 0, "tags": ["wakaba:" + m, "wakaba_enemy_route:" + e["id"], "wakaba_route_index:%d" % i]})
    return out


# ───────────────────────── 素材（FBX）の取り込みの計画（unreal なし）
def kit_plan(entries_root, only=None):
    """wakaba-assets/entries/*/*/ue5/import.json と source/ の FBX → 取り込みの一覧（FBX が無い物は missing）"""
    out = []
    if not os.path.isdir(entries_root):
        return out
    for cat in sorted(os.listdir(entries_root)):
        cd = os.path.join(entries_root, cat)
        if not os.path.isdir(cd):
            continue
        for aid in sorted(os.listdir(cd)):
            if only and aid not in only:
                continue
            ij = os.path.join(cd, aid, "ue5", "import.json")
            if not os.path.isfile(ij):
                continue
            imp = json.load(open(ij, encoding="utf-8"))
            src = os.path.normpath(os.path.join(cd, aid, imp["source"]["file"]))
            gp = imp["gamePath"]
            folder, name = gp.rsplit("/", 1)
            o = imp.get("import", {})
            out.append({"id": aid, "filename": src.replace("\\", "/"), "exists": os.path.isfile(src), "destination_path": folder, "destination_name": name,
                        "asset_type": imp.get("assetType", "StaticMesh"), "nanite": bool(o.get("nanite", False)), "collision": o.get("collision", "simple_box"),
                        "uniform_scale": float(o.get("importUniformScale", 1.0)), "convert_scene": bool(o.get("convertScene", True)), "lightmap_uvs": bool(o.get("generateLightmapUVs", False))})
    return out


class _Fake:
    """--selftest 用の偽の unreal（呼ぶ順番と名前の打ち間違いを UE なしで見つける。UE の本当の挙動は確かめられない）"""
    def __init__(self, name="obj", log=None):
        self._n, self._log, self._p = name, log if log is not None else [], {}
        self.tags = []

    def set_editor_property(self, k, v):
        self._log.append(("set", self._n, k)); self._p[k] = v
        if k == "tags":
            self.tags = list(v)

    def get_editor_property(self, k):
        if k not in self._p:
            self._p[k] = _Fake(self._n + "." + k, self._log) if k in ("common_meshes_properties", "mesh_pipeline", "static_mesh_import_data") else ([] if k in ("imported_object_paths", "tags") else None)
        return self._p[k]

    def __getattr__(self, k):
        if k.startswith("_"):
            raise AttributeError(k)
        log = self._log

        def f(*a, **kw):
            log.append(("call", self._n, k))
            return _Fake(k, log)
        return f


def fake_unreal():
    log, actors = [], []

    class Ctx:
        def __init__(self, *a, **k): pass
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def make_dialog(self, *a): pass
        def should_cancel(self): return False
        def enter_progress_frame(self, *a): pass

    class Sub(_Fake):
        def get_all_level_actors(self): return list(actors)
        def destroy_actor(self, a): actors.remove(a); log.append(("call", "actors", "destroy_actor"))
        def spawn_actor_from_object(self, o, loc, rot): a = _Fake("actor", log); actors.append(a); log.append(("call", "actors", "spawn_actor_from_object")); return a
        def spawn_actor_from_class(self, c, loc, rot): a = _Fake("actor", log); actors.append(a); log.append(("call", "actors", "spawn_actor_from_class")); return a

    sub = Sub("actors", log)
    U = type("unreal", (), {})()
    U.EditorActorSubsystem = object
    U.get_editor_subsystem = lambda cls: sub
    U.ScopedEditorTransaction = Ctx; U.ScopedSlowTask = Ctx
    U.EditorAssetLibrary = _Fake("EditorAssetLibrary", log)
    U.Vector = lambda *a: tuple(a); U.Rotator = lambda *a, **k: (a, k); U.Name = str
    U.TargetPoint = "TargetPoint"; U.PlayerStart = "PlayerStart"
    U.log = lambda m: log.append(("log", m)); U.log_warning = lambda m: log.append(("warn", m))
    tools = _Fake("AssetTools", log)
    U.AssetToolsHelpers = type("ATH", (), {"get_asset_tools": staticmethod(lambda: tools)})
    U.AssetImportTask = lambda: _Fake("AssetImportTask", log)
    U.InterchangeGenericAssetsPipeline = lambda: _Fake("InterchangeGenericAssetsPipeline", log)
    U.InterchangeForceMeshType = type("IFMT", (), {"IFMT_STATIC_MESH": "IFMT_STATIC_MESH"})
    U.FbxImportUI = lambda: _Fake("FbxImportUI", log)
    U.SystemLibrary = type("SL", (), {"get_console_variable_bool_value": staticmethod(lambda n: True)})
    return U, log


def selftest(layout_path):
    L = json.load(open(layout_path, encoding="utf-8"))
    part = L["buildings"][0]["parts"][0]
    tilted = next((p for b in L["buildings"] for p in b["parts"] if p.get("tilt")), part)
    o = L["objects"][0]
    pl = plan(L)
    mk = marks(L)
    here = os.path.dirname(os.path.abspath(__file__))
    kp = kit_plan(os.path.join(here, "..", "..", "wakaba-assets", "entries"))
    # 偽の unreal で UE の部分を通す（2 回流すと前の物を消す・Interchange と古い FBX の両方）
    U, log = fake_unreal()
    r1 = place_in_unreal(U, {"folder": None}, L, pl[:20], mk)
    r2 = place_in_unreal(U, {"folder": None}, L, pl[:20], mk)
    fake_items = [dict(k, exists=True) for k in kp[:3]]
    ic = run_import_kit(U, fake_items)
    legacy = run_import_kit(U, fake_items, force_legacy=True)
    sets = sorted({"%s.%s" % (e[1].split(".")[-1], e[2]) for e in log if e[0] == "set"})
    return {
        "to_ue": [to_ue(p) for p in ([0, 0, 0], [1.5, 2.25, -3.125], L["start"])],
        "to_ue_rot": [to_ue_rot(15, 0), to_ue_rot(-40, 30)],
        "to_ue_size": to_ue_size([0.6, 2.8, 0.15]),
        "part": part_to_ue(part), "tilted": part_to_ue(tilted),
        "object_basic": object_to_ue(o), "object_real": object_to_ue(o, "bottom_center"),
        "plan": {"count": len(pl), "first": pl[0], "marks": len(mk)},
        "gameplay_marks": {k: sum(1 for m in mk if any(t.startswith(k) for t in m["tags"])) for k in ("wakaba_door:", "wakaba_checkpoint", "wakaba_enemy_route:", "wakaba_enemy_spawn:")},
        "kit_plan": {"count": len(kp), "with_fbx": sum(1 for k in kp if k["exists"]), "first": kp[0] if kp else None},
        "fake_unreal": {"place": [r1, r2], "interchange": ic["mode"], "legacy": legacy["mode"], "props": sets, "warnings": [m for m in log if m[0] == "warn"][:5]},
        "ue_version_target": "5.8.3（未検証）",
    }


def parse_args(argv):
    opt = {"layout": None, "asset_map": None, "folder": None, "objects": True, "dry": False, "selftest": False, "landscape": None, "import_kit": False, "legacy_fbx": False, "entries": None, "only": None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a in ("--layout", "--asset-map", "--folder", "--landscape", "--entries", "--only"):
            opt[a[2:].replace("-", "_")] = argv[i + 1]; i += 1
        elif a == "--no-objects":
            opt["objects"] = False
        elif a == "--dry-run":
            opt["dry"] = True
        elif a == "--selftest":
            opt["selftest"] = True
        elif a == "--import-kit":
            opt["import_kit"] = True
        elif a == "--legacy-fbx":
            opt["legacy_fbx"] = True
        elif not a.startswith("--"):
            opt["layout"] = a
        i += 1
    return opt


# ───────────────────────── UE の部分（unreal モジュール。Unreal Editor の中だけ）
def actor_api(unreal):
    """物を置く・消す窓口：5.x は EditorActorSubsystem（5.8 も同じ）。無い古い版だけ EditorLevelLibrary（非推奨）"""
    if hasattr(unreal, "EditorActorSubsystem") and hasattr(unreal, "get_editor_subsystem"):
        sub = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        if sub is not None:
            return sub
    unreal.log_warning("わかば：EditorActorSubsystem が無い → 古い EditorLevelLibrary を使う（UE 5.x では非推奨）")
    return unreal.EditorLevelLibrary


def try_set(obj, name, value, failed):
    """版で名前が違う属性：設定できなければ failed に名前を足して続ける（止めない）"""
    try:
        obj.set_editor_property(name, value)
        return True
    except Exception as e:  # noqa: BLE001
        failed.append("%s.%s（%s）" % (type(obj).__name__, name, str(e).splitlines()[0][:80]))
        return False


def interchange_fbx_on(unreal):
    """FBX を Interchange で読む設定か（UE 5.5 以降は既定でオンの版が多い。読めなければ「クラスがあるか」で決める）"""
    if not hasattr(unreal, "InterchangeGenericAssetsPipeline"):
        return False
    try:
        return bool(unreal.SystemLibrary.get_console_variable_bool_value("Interchange.FeatureFlags.Import.FBX"))
    except Exception:  # noqa: BLE001
        return True


def run_import_kit(unreal, plan_items, force_legacy=False):
    """FBX をまとめて取り込む（AssetTools の import_asset_tasks）。戻り値：{ imported, skipped, failed_props, mode }"""
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    use_ic = interchange_fbx_on(unreal) and not force_legacy
    failed, tasks, skipped = [], [], []
    for it in plan_items:
        if not it["exists"]:
            skipped.append(it["id"])
            continue
        t = unreal.AssetImportTask()
        for k, v in (("filename", it["filename"]), ("destination_path", it["destination_path"]), ("destination_name", it["destination_name"]), ("automated", True), ("replace_existing", True), ("save", True)):
            try_set(t, k, v, failed)
        if use_ic:
            p = unreal.InterchangeGenericAssetsPipeline()
            cm = p.get_editor_property("common_meshes_properties")
            try_set(cm, "force_all_mesh_as_type", unreal.InterchangeForceMeshType.IFMT_STATIC_MESH, failed)
            try_set(cm, "import_lods", True, failed)
            try_set(cm, "recompute_normals", False, failed)
            mp = p.get_editor_property("mesh_pipeline")
            try_set(mp, "build_nanite", it["nanite"], failed)
            try_set(mp, "combine_static_meshes", True, failed)
            try_set(mp, "collision", it["collision"] != "none", failed)
            try_set(p, "import_offset_uniform_scale", it["uniform_scale"], failed)
            try_set(t, "options", p, failed)
        else:
            ui = unreal.FbxImportUI()
            try_set(ui, "import_mesh", True, failed)
            try_set(ui, "import_as_skeletal", False, failed)
            try_set(ui, "import_materials", True, failed)
            sm = ui.get_editor_property("static_mesh_import_data")
            try_set(sm, "convert_scene", it["convert_scene"], failed)
            try_set(sm, "import_uniform_scale", it["uniform_scale"], failed)
            try_set(sm, "combine_meshes", True, failed)
            try_set(sm, "generate_lightmap_u_vs", it["lightmap_uvs"], failed)
            try_set(sm, "auto_generate_collision", it["collision"] != "none", failed)
            try_set(sm, "build_nanite", it["nanite"], failed)
            try_set(t, "options", ui, failed)
        tasks.append((it, t))
    tools.import_asset_tasks([t for _, t in tasks])
    imported = []
    for it, t in tasks:
        paths = list(t.get_editor_property("imported_object_paths") or [])
        want = it["destination_path"] + "/" + it["destination_name"]
        # Interchange は destination_name を使わない：SM_<id> の名前に直す（1 つだけ取り込まれた時）
        if paths and len(paths) == 1 and not str(paths[0]).startswith(want):
            try:
                unreal.EditorAssetLibrary.rename_asset(str(paths[0]).split(".")[0], want)
                paths = [want]
            except Exception as e:  # noqa: BLE001
                failed.append("rename %s（%s）" % (it["id"], e))
        imported.append({"id": it["id"], "paths": [str(x) for x in paths]})
    for f in failed:
        unreal.log_warning("わかば：設定できなかった名前（版の違い？）：" + f)
    unreal.log("わかば：素材の取り込み %d（%s）・FBX なし %d・設定できなかった %d" % (len(imported), "Interchange" if use_ic else "FbxImportUI", len(skipped), len(failed)))
    return {"imported": imported, "skipped": skipped, "failed_props": failed, "mode": "interchange" if use_ic else "fbx_legacy"}


def run_in_unreal(opt, L, items, mk):
    import unreal
    return place_in_unreal(unreal, opt, L, items, mk)


def place_in_unreal(unreal, opt, L, items, mk):
    folder_root = opt["folder"] or ("Wakaba/" + L["map"])
    actors = actor_api(unreal)
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
    return {"placed": len(items), "marks": len(mk), "removed": len(old)}


def main():
    argv = sys.argv[1:] or ARGS
    opt = parse_args(argv)
    here = os.path.dirname(os.path.abspath(__file__))
    if opt["selftest"]:
        lp = opt["layout"] or os.path.join(here, "..", "..", "maps", "haison", "build", "layout.json")
        print(json.dumps(selftest(lp), ensure_ascii=False))
        return
    if opt["import_kit"]:
        # 素材（FBX）の取り込み：py ".../tools/ue5/import_layout.py" --import-kit [--entries <wakaba-assets/entries>] [--only id1,id2] [--legacy-fbx] [--dry-run]
        er = opt["entries"] or os.path.join(here, "..", "..", "wakaba-assets", "entries")
        kp = kit_plan(er, set(opt["only"].split(",")) if opt["only"] else None)
        print("取り込む素材：%d（FBX あり %d・無い物は Blender の export_kit.py で作る）" % (len(kp), sum(1 for k in kp if k["exists"])))
        if opt["dry"]:
            for k in kp:
                print("  %s → %s/%s（Nanite %s）%s" % (k["id"], k["destination_path"], k["destination_name"], k["nanite"], "" if k["exists"] else "  ※FBX なし"))
            return
        try:
            import unreal
        except ImportError:
            print("unreal モジュールがありません：Unreal Editor の中（Output Log の Python）で動かしてください")
            sys.exit(2)
        print(json.dumps(run_import_kit(unreal, kp, opt["legacy_fbx"]), ensure_ascii=False)[:2000])
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
