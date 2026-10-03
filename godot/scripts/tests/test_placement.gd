extends SceneTree
## 配置ロジック（placement.gd / draft.gd / home_state.gd）のテスト。Web 版 main/home/placement.js と同じ結果になるかを見る。
## 期待値は Web 版の JS を node で動かして得たもの。
##
##   godot --headless --path godot -s res://scripts/tests/test_placement.gd
##
## 失敗があれば終了コード 1。

const Catalog := preload("res://scripts/catalog.gd")
const Placement := preload("res://scripts/placement.gd")
const Draft := preload("res://scripts/draft.gd")
const HomeState := preload("res://scripts/home_state.gd")

var _pass: int = 0
var _fail: int = 0


func _initialize() -> void:
	_run()
	print("")
	print("placement tests: %d passed, %d failed" % [_pass, _fail])
	quit(1 if _fail > 0 else 0)


func _eq(name: String, got: Variant, want: Variant) -> void:
	# 型が違う値（int と float など）を == で比べると実行時エラーになるため、文字列で比べる
	if typeof(got) == typeof(want) and str(got) == str(want):
		_pass += 1
		print("  ok   ", name)
	else:
		_fail += 1
		printerr("  FAIL ", name, "  got=", got, "  want=", want)


func _reason(name: String, r: Dictionary, want_ok: bool, want_reason: String) -> void:
	_eq(name + " ok", bool(r.get("ok", false)), want_ok)
	_eq(name + " reason", str(r.get("reason", "")), want_reason)


func _chair(x: int, y: int, rot: int = 0) -> Dictionary:
	return {"itemId": "furniture.wood_chair", "x": x, "y": y, "rotation": rot}


func _run() -> void:
	var cat: Dictionary = Catalog.catalog()
	_eq("catalog loaded", cat.is_empty(), false)
	_eq("rots are int", typeof(Catalog.item("furniture.futon")["rots"][1]), TYPE_INT)

	# ── 回転と占有 ──
	_eq("futon r0", Placement.footprint("furniture.futon", 0), Vector2i(2, 3))
	_eq("futon r90", Placement.footprint("furniture.futon", 90), Vector2i(3, 2))
	_eq("futon r-270", Placement.footprint("furniture.futon", -270), Vector2i(3, 2))
	_eq("unknown footprint", Placement.footprint("nope", 0), Vector2i(1, 1))
	_eq("norm_rot 450", Placement.norm_rot(450), 90)

	var hd: Dictionary = HomeState.repair(Catalog.default_home())
	var room: Array = hd["room"]["placements"]
	var garden: Array = hd["garden"]["placements"]
	_eq("default room count", room.size(), 8)
	_eq("default garden count", garden.size(), 11)
	_eq("default seq", int(hd["seq"]), 20)

	# ── 到達 ──
	_eq("room reachable", bool(Placement.reachable("room", room)["ok"]), true)
	_eq("garden reachable", bool(Placement.reachable("garden", garden)["ok"]), true)
	var fences: Array = []
	for y in range(12):
		fences.append({"instanceId": "f%d" % y, "itemId": "garden.fence", "x": 3, "y": y, "rotation": 0})
	_reason("fence wall cuts gate", Placement.reachable("garden", fences), false, "家の戸口から門まで通れなくなります")
	var r: Dictionary = Placement.can_place("garden", fences.slice(1), {"itemId": "garden.fence", "x": 3, "y": 0, "rotation": 0})
	_reason("last fence", r, false, "家の戸口から門まで通れなくなります")
	_eq("last fence bad", r["bad"], [Vector2i(0, 6)])

	# ── 置けるか（Web 版と同じ理由） ──
	r = Placement.can_place("room", room, _chair(6, 7))
	_reason("door", r, false, "出入口をふさいでしまいます")
	_eq("door bad", r["bad"], [Vector2i(6, 7)])
	_reason("wall y=1", Placement.can_place("room", room, {"itemId": "memento.child_drawing", "x": 2, "y": 1, "rotation": 0}), false, "娘の絵の額は壁（いちばん奥の列）にしか掛けられません")
	_reason("wall y=0", Placement.can_place("room", room, {"itemId": "memento.child_drawing", "x": 2, "y": 0, "rotation": 0}), true, "")
	_reason("overlap futon", Placement.can_place("room", room, _chair(0, 2)), false, "布団と重なっています")
	r = Placement.can_place("room", room, {"itemId": "furniture.futon", "x": 11, "y": 6, "rotation": 0})
	_reason("out of room", r, false, "部屋からはみ出しています")
	_eq("out of room bad", r["bad"], [Vector2i(12, 6), Vector2i(12, 7), Vector2i(11, 8), Vector2i(12, 8)])
	r = Placement.can_place("room", room, _chair(1, 0))
	_reason("dead end", r, false, "通れない場所（行き止まり）ができてしまいます")
	_eq("dead end bad", r["bad"], [Vector2i(0, 0)])
	_reason("area", Placement.can_place("room", room, {"itemId": "garden.flowerbed", "x": 5, "y": 6, "rotation": 0}), false, "花壇は部屋には置けません（庭だけ）")
	_reason("rotation", Placement.can_place("room", room, {"itemId": "furniture.cushion", "x": 5, "y": 6, "rotation": 90}), false, "クッションはその向きにできません")
	_reason("seed", Placement.can_place("garden", garden, {"itemId": "seed.herb", "x": 5, "y": 6, "rotation": 0}), false, "ハーブの種は置けません（空の鉢かプランターに植えます）")
	_reason("rug on rug", Placement.can_place("room", room, {"itemId": "deco.rug", "x": 5, "y": 4, "rotation": 0}), false, "ラグと重なっています")
	_reason("chair on rug", Placement.can_place("room", room, _chair(4, 4)), true, "")
	_reason("bench on gate", Placement.can_place("garden", garden, {"itemId": "garden.bench", "x": 0, "y": 6, "rotation": 0}), false, "戸口・門をふさいでしまいます")
	_reason("no position", Placement.can_place("room", room, {"itemId": "furniture.cushion", "x": null, "y": 1, "rotation": 0}), false, "置く場所を選んでください")
	_reason("stored 0", Placement.can_place("room", room, _chair(8, 5), {"stored": 0}), false, "収納に木の椅子が残っていません")

	# ── 使う位置 ──
	var chair: Dictionary = {}
	var futon: Dictionary = {}
	var lamp: Dictionary = {}
	for pv: Variant in room:
		if pv["itemId"] == "furniture.wood_chair":
			chair = pv
		elif pv["itemId"] == "furniture.futon":
			futon = pv
		elif pv["itemId"] == "light.desk_lamp":
			lamp = pv
	_eq("chair use cell", Placement.use_cell("room", room, chair), Vector2i(11, 3))
	_eq("chair can use", bool(Placement.can_use("room", room, chair)["ok"]), true)
	_eq("futon use cell", Placement.can_use("room", room, futon)["cell"], Vector2i(2, 1))
	var fence: Dictionary = garden[1]
	_reason("fence use", Placement.can_use("garden", garden, fence), false, "木の柵は使うものではありません")

	# ── 下書き（取り消し／やり直し） ──
	var st := HomeState.new()
	st.data = hd
	var d := Draft.new({"room": room, "garden": garden}, {"owned": st.owned, "seq": int(hd["seq"])})
	_eq("draft stored chair", d.stored("furniture.wood_chair", "default"), 1)
	r = d.place("room", _chair(8, 5))
	_eq("draft place ok", bool(r["ok"]), true)
	_eq("draft new id", str(r["p"]["instanceId"]), "p20")
	_eq("draft stored after", d.stored("furniture.wood_chair", "default"), 0)
	_reason("draft place 2nd", d.place("room", _chair(9, 5)), false, "収納に木の椅子が残っていません")
	r = d.rotate(str(chair["instanceId"]))
	_eq("draft rotate ok", bool(r["ok"]), true)
	_eq("draft rotated", int(d.find(str(chair["instanceId"]))["p"]["rotation"]), 90)
	_reason("draft rotate lamp", d.rotate(str(lamp["instanceId"])), false, "卓上ランプは回せません")
	_eq("draft undo", d.undo(), true)
	_eq("draft undo rot", int(d.find(str(chair["instanceId"]))["p"]["rotation"]), 0)
	_eq("draft can redo", d.can_redo(), true)
	_eq("draft redo", d.redo(), true)
	_eq("draft redo rot", int(d.find(str(chair["instanceId"]))["p"]["rotation"]), 90)
	r = d.store("p20")
	_eq("draft store", bool(r["ok"]), true)
	_eq("draft stored back", d.stored("furniture.wood_chair", "default"), 1)
	r = d.move(str(chair["instanceId"]), {"x": 6, "y": 7})
	_reason("draft move to door", r, false, "出入口をふさいでしまいます")
	r = d.move(str(chair["instanceId"]), {"x": 3, "y": 4, "area": "garden"})
	_eq("draft move to garden", bool(r["ok"]), true)
	_eq("draft moved area", str(d.find(str(chair["instanceId"]))["area"]), "garden")
	_eq("draft dirty", d.dirty(), true)
	_eq("original untouched", int(chair["x"]), 11)
	while d.undo():
		pass
	_eq("draft back to start", d.dirty(), false)

	# ── 修復：重なり・はみ出し・所持数超過は収納へ戻る ──
	var broken: Dictionary = Catalog.default_home()
	var bp: Array = broken["room"]["placements"]
	bp.append({"instanceId": "p90", "itemId": "furniture.wood_chair", "x": 0, "y": 2, "rotation": 0, "variant": "default"})   # 布団と重なる
	bp.append({"instanceId": "p91", "itemId": "furniture.cushion", "x": 30, "y": 2, "rotation": 0, "variant": "default"})     # はみ出し
	bp.append({"instanceId": "p92", "itemId": "memento.bear", "x": 8, "y": 6, "rotation": 0, "variant": "default"})          # 所持 1 を超える
	bp.append({"instanceId": "p93", "itemId": "unknown.item", "x": 8, "y": 6, "rotation": 0})
	var fixed: Dictionary = HomeState.repair(broken)
	_eq("repair drops bad", (fixed["room"]["placements"] as Array).size(), 8)
	_eq("repair keeps inventory", HomeState.owned_in(fixed, "furniture.cushion"), 2)
	# JSON で往復しても同じ（Web 版と同じ形で保存できる）
	var again: Dictionary = HomeState.repair(Catalog.ints(JSON.parse_string(JSON.stringify(fixed))))
	_eq("json roundtrip", JSON.stringify(again), JSON.stringify(fixed))
