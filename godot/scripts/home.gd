extends Node2D
## 家・庭の模様替え画面（Godot 4 試作）
##
## Web 版（main/home/editor.js・renderer.js・interactions.js）の模様替えの流れを移植：
##   選択 → プレビュー（ゴースト）→ 置く／回転／収納／移動、取り消し／やり直し、確定／破棄
## 下書き（draft.gd）の上で動かし、確定したときだけ homeData に書き戻して user://home.json に保存する。
## 画面（UI）はコードで組み立てる（.tscn を単純に保つため）。

const Catalog := preload("res://scripts/catalog.gd")
const Placement := preload("res://scripts/placement.gd")
const Draft := preload("res://scripts/draft.gd")
const HomeState := preload("res://scripts/home_state.gd")
const SpriteDB := preload("res://scripts/sprite_db.gd")
const UITheme := preload("res://scripts/ui_theme.gd")
const WorldOverlay := preload("res://scripts/world_overlay.gd")

const T := 32                 # 1 マスのピクセル（Web 版の T=32 と同じ）
const BAND := 64              # 床の上の壁帯の高さ（Web 版 HOME.layout の band）
const HEADER_H := 150.0
const PANEL_H_LIVE := 236.0
const PANEL_H_EDIT := 430.0
const WALK_SPEED := 3.4       # マス／秒
const ROT_NAME := {0: "下", 90: "左", 180: "上", 270: "右"}
const NIGHT_TINT := Color(0.56, 0.56, 0.80)
const LIGHT_COLORS := {"light.desk_lamp": Color("#ffb85a"), "light.shell_lantern": Color("#9ff0e0"), "light.string_lights": Color("#ffd98a")}
const KID_LINES := ["パパ、いっしょにあそぼ！", "このおへや、すき。", "ねこちゃん、ねてるね。", "おはな、そだてたいなあ。"]
const CAT_LINES := ["にゃあ。", "（しっぽをゆっくり振っている）", "（ごろごろ……）"]
const DAN_LINES := ["さて、模様替えでもしようか。", "今夜は静かだな。"]

var st: HomeState
var area: String = "room"
var mode: String = "live"             # "live"（暮らし）/ "edit"（模様替え）
var night: bool = true
var draft: Draft = null
var sel: Dictionary = {}              # 模様替えの選択 {kind:"new"|"placed", item_id, variant, id, rotation, x, y, has_pos, moving}
var msg: String = ""
var live_mark: Variant = null         # 暮らしモードで「使う位置」を示すマス（Vector2i）
var chars: Dictionary = {}            # who -> {who, node, sprite, pos: Vector2, dir, pose, path, t, frame, timer}
var _dialog_open: bool = false

# ── ワールド ──
var world: Node2D
var scene_root: Node2D              # 背景・家具・人物（夜はここだけ暗くする。目印や UI は暗くしない）
var bg_sprite: Sprite2D
var flat_layer: Node2D
var ysort_layer: Node2D
var light_layer: Node2D
var ghost_layer: Node2D
var overlay: WorldOverlay
var _item_nodes: Array = []
var _glow_tex: GradientTexture2D

# ── UI ──
var ui_root: Control
var header: PanelContainer
var title_label: Label
var mode_label: Label
var night_btn: Button
var tab_room: Button
var tab_garden: Button
var panel: PanelContainer
var info_label: Label
var live_box: VBoxContainer
var edit_box: VBoxContainer
var inv_box: HBoxContainer
var act: Dictionary = {}              # id -> Button
var toast_panel: PanelContainer
var toast_label: Label
var _toast_tween: Tween


func _ready() -> void:
	st = HomeState.new()
	st.load_or_new()
	_build_world()
	_build_ui()
	for who: String in ["dan", "kid", "cat"]:
		chars[who] = _make_char(who)
	get_viewport().size_changed.connect(_layout)
	msg = st.last_message + "　タップした場所へ だんのうら が歩きます。"
	_place_chars()
	_apply_night()
	_layout()


# ═════════════════════════ ワールド ═════════════════════════

func _build_world() -> void:
	world = Node2D.new()
	world.name = "World"
	add_child(world)
	scene_root = Node2D.new()
	scene_root.name = "Scene"
	world.add_child(scene_root)
	bg_sprite = Sprite2D.new()
	bg_sprite.centered = false
	scene_root.add_child(bg_sprite)
	flat_layer = Node2D.new()
	flat_layer.name = "Flat"          # ラグ・飛び石・壁の飾り
	scene_root.add_child(flat_layer)
	ysort_layer = Node2D.new()
	ysort_layer.name = "YSort"        # 家具と人物（足元の y で前後が決まる）
	ysort_layer.y_sort_enabled = true
	scene_root.add_child(ysort_layer)
	light_layer = Node2D.new()
	light_layer.name = "Lights"
	world.add_child(light_layer)
	ghost_layer = Node2D.new()
	ghost_layer.name = "Ghost"
	world.add_child(ghost_layer)
	overlay = WorldOverlay.new()
	overlay.name = "Overlay"
	overlay.band = BAND
	world.add_child(overlay)
	# 灯りのにじみ（放射グラデーション）
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	_glow_tex = GradientTexture2D.new()
	_glow_tex.gradient = g
	_glow_tex.fill = GradientTexture2D.FILL_RADIAL
	_glow_tex.fill_from = Vector2(0.5, 0.5)
	_glow_tex.fill_to = Vector2(1.0, 0.5)
	_glow_tex.width = 256
	_glow_tex.height = 256


func _editing() -> bool:
	return mode == "edit" and draft != null


func _placements() -> Array:
	if _editing():
		return draft.placements(area)
	return st.placements(area)


func _area_def() -> Dictionary:
	return Catalog.area(area)


func _world_size() -> Vector2:
	var a: Dictionary = _area_def()
	return Vector2(int(a.get("w", 12)) * T, int(a.get("h", 8)) * T + BAND)


func _rebuild_world() -> void:
	var a: Dictionary = _area_def()
	var bge: Dictionary = SpriteDB.bg("%s_%s" % [area, "night" if night else "day"])
	bg_sprite.texture = SpriteDB.tex(str(bge.get("file", "")))
	for n: Variant in _item_nodes:
		var node: Node = n
		node.get_parent().remove_child(node)
		node.queue_free()
	_item_nodes.clear()
	for c: Node in light_layer.get_children():
		light_layer.remove_child(c)
		c.queue_free()
	for c: Node in ghost_layer.get_children():
		ghost_layer.remove_child(c)
		c.queue_free()

	var hide_id: String = ""
	if _editing() and _sel_kind() == "placed" and bool(sel.get("moving", false)) and bool(sel.get("has_pos", false)):
		var f: Dictionary = draft.find(str(sel["id"]))
		if not f.is_empty() and str(f["area"]) == area:
			hide_id = str(sel["id"])
	var lit: Dictionary = st.lit()
	var flats: Array = []
	for pv: Variant in _placements():
		var p: Dictionary = pv
		if str(p.get("instanceId", "")) == hide_id:
			continue
		var c: Dictionary = Catalog.item(str(p["itemId"]))
		if c.is_empty():
			continue
		var is_lit: bool = bool(c.get("light", false)) and bool(lit.get(str(p["instanceId"]), false))
		var node: Node2D = _make_item_node(p, is_lit)
		if str(c["layer"]) == "furniture":
			ysort_layer.add_child(node)
		else:
			flats.append({"node": node, "order": 0 if str(c["layer"]) != "wall" else 1, "y": int(p["y"])})
		_item_nodes.append(node)
		if is_lit and night:
			_add_light(p)
	flats.sort_custom(_flat_less)
	for e: Variant in flats:
		flat_layer.add_child(e["node"])
	_update_overlay(a)


## ラグ・飛び石 → 壁の飾り、同じ種類は奥（y が小さい）から
func _flat_less(x: Dictionary, y: Dictionary) -> bool:
	if int(x["order"]) != int(y["order"]):
		return int(x["order"]) < int(y["order"])
	return int(x["y"]) < int(y["y"])


## 配置 1 つ分のノード：holder の y が前後関係（足元の下端）、子の Sprite2D を ox/oy でずらす
func _make_item_node(p: Dictionary, lit_on: bool) -> Node2D:
	var item_id: String = str(p["itemId"])
	var rot: int = int(p.get("rotation", 0))
	var c: Dictionary = Catalog.item(item_id)
	var f: Vector2i = Placement.footprint(item_id, rot)
	var e: Dictionary = SpriteDB.item(item_id, rot, str(p.get("variant", "default")), lit_on)
	var holder := Node2D.new()
	holder.set_meta("instance_id", str(p.get("instanceId", "")))
	var spr := Sprite2D.new()
	spr.centered = false
	spr.texture = SpriteDB.tex(str(e.get("file", "")))
	var px: int = int(p["x"])
	var py: int = int(p["y"])
	var top_left := Vector2(px * T + int(e.get("ox", 0)), BAND + py * T + int(e.get("oy", 0)))
	if str(c.get("layer", "furniture")) == "furniture":
		var lift: float = 0.0 if bool(c.get("solid", false)) else 0.2 * T
		holder.position = Vector2(px * T, BAND + (py + f.y) * T - lift)
	spr.position = top_left - holder.position
	holder.add_child(spr)
	return holder


func _add_light(p: Dictionary) -> void:
	var item_id: String = str(p["itemId"])
	var f: Vector2i = Placement.footprint(item_id, p.get("rotation", 0))
	var light := PointLight2D.new()
	light.texture = _glow_tex
	light.color = LIGHT_COLORS.get(item_id, Color("#ffb85a"))
	light.energy = 0.9
	light.texture_scale = 1.4
	light.position = Vector2((int(p["x"]) + f.x * 0.5) * T, BAND + (int(p["y"]) + f.y * 0.5) * T - T * 0.6)
	light_layer.add_child(light)


func _update_overlay(a: Dictionary) -> void:
	overlay.cols = int(a.get("w", 12))
	overlay.rows = int(a.get("h", 8))
	overlay.show_grid = _editing()
	overlay.has_sel = false
	overlay.has_ghost = false
	overlay.bad_rects = []
	overlay.marks = []
	if not _editing():
		if live_mark is Vector2i:
			var m: Vector2i = live_mark
			overlay.marks = [Rect2(m.x * T, BAND + m.y * T, T, T)]
		overlay.queue_redraw()
		return
	var kind: String = _sel_kind()
	if kind == "placed":
		var f: Dictionary = draft.find(str(sel["id"]))
		if not f.is_empty() and str(f["area"]) == area:
			var p: Dictionary = f["p"]
			var fp: Vector2i = Placement.footprint(str(p["itemId"]), p["rotation"])
			var y0: float = BAND + int(p["y"]) * T
			if Placement.layer_of(p) == "wall":
				y0 = BAND - T - 6
			overlay.sel_rect = Rect2(int(p["x"]) * T, y0, fp.x * T, fp.y * T)
			overlay.has_sel = true
	if (kind == "new" or bool(sel.get("moving", false))) and bool(sel.get("has_pos", false)):
		var item_id: String = _sel_item_id()
		var variant: String = _sel_variant()
		var rot: int = int(sel["rotation"])
		var gx: int = int(sel["x"])
		var gy: int = int(sel["y"])
		var c: Dictionary = Catalog.item(item_id)
		var fp2: Vector2i = Placement.footprint(item_id, rot)
		var wall: bool = str(c.get("layer", "")) == "wall" and gy == 0
		var e: Dictionary = SpriteDB.item(item_id, rot, variant)
		var gs := Sprite2D.new()
		gs.centered = false
		gs.texture = SpriteDB.tex(str(e.get("file", "")))
		gs.position = Vector2(gx * T + int(e.get("ox", 0)), BAND + gy * T + int(e.get("oy", 0)))
		gs.modulate = Color(1, 1, 1, 0.55)
		ghost_layer.add_child(gs)
		var r: Dictionary = _check()
		var ok: bool = bool(r.get("ok", false))
		var by: float = float(BAND - T - 6) if wall else float(BAND + gy * T)
		overlay.ghost_rect = Rect2(gx * T, by, fp2.x * T, fp2.y * T)
		overlay.ghost_ok = ok
		overlay.has_ghost = true
		if not ok:
			var bad: Array = r.get("bad", [])
			if bad.is_empty():
				bad = r.get("cells", [])
			var rects: Array = []
			for qv: Variant in bad:
				var q: Vector2i = qv
				if q.x >= 0 and q.y >= 0 and q.x < overlay.cols and q.y < overlay.rows:
					var yy: float = float(BAND - T - 6) if (wall and q.y == 0) else float(BAND + q.y * T)
					rects.append(Rect2(q.x * T, yy, T, T))
			overlay.bad_rects = rects
	overlay.queue_redraw()


# ═════════════════════════ 人物 ═════════════════════════

func _make_char(who: String) -> Dictionary:
	var node := Node2D.new()
	node.name = who
	var spr := Sprite2D.new()
	spr.centered = false
	node.add_child(spr)
	ysort_layer.add_child(node)
	return {"who": who, "node": node, "sprite": spr, "pos": Vector2.ZERO, "dir": "down", "pose": "stand",
		"path": [], "t": randf() * 3.0, "frame": 0, "timer": randf_range(2.0, 4.0), "arrive_pose": "stand"}


func _char_cell(ch: Dictionary) -> Vector2i:
	var p: Vector2 = ch["pos"]
	return Vector2i(roundi(p.x), roundi(p.y))


func _place_chars() -> void:
	var pl: Array = _placements()
	var room: bool = area == "room"
	var d: Vector2i = Placement.nearest_free(area, pl, 6 if room else 7, 6 if room else 1)
	var k: Vector2i = Placement.nearest_free(area, pl, 4 if room else 8, 5 if room else 2, [d])
	var cpos: Vector2i = Placement.nearest_free(area, pl, 8 if room else 4, 5 if room else 7, [d, k])
	var cat_pose: String = "sit"
	for sv: Variant in Placement.cat_spots(area, pl, night):
		var spot: Vector2i = sv["cell"]
		if spot != d and spot != k:
			cpos = spot
			cat_pose = "sleep" if night else "sit"
			break
	_set_char(chars["dan"], d, "stand")
	_set_char(chars["kid"], k, "stand")
	_set_char(chars["cat"], cpos, cat_pose)


func _set_char(ch: Dictionary, cell: Vector2i, pose: String) -> void:
	ch["pos"] = Vector2(cell)
	ch["path"] = []
	ch["pose"] = pose
	ch["dir"] = "down"
	ch["frame"] = 0
	_update_char_node(ch)


## 模様替えのあと：家具と重なった人物を近くの空きマスへ
func _fix_chars() -> void:
	var a: Dictionary = _area_def()
	var solid: PackedByteArray = Placement.solid_grid(a, _placements())
	var taken: Array = []
	for who: String in ["dan", "kid", "cat"]:
		var ch: Dictionary = chars[who]
		ch["path"] = []
		var c: Vector2i = _char_cell(ch)
		if solid[c.y * int(a["w"]) + c.x] != 0 or taken.has(c):
			c = Placement.nearest_free(area, _placements(), c.x, c.y, taken)
		taken.append(c)
		_set_char(ch, c, "stand" if who != "cat" else str(ch["pose"]))


func _update_char_node(ch: Dictionary) -> void:
	var pos: Vector2 = ch["pos"]
	var node: Node2D = ch["node"]
	var spr: Sprite2D = ch["sprite"]
	node.position = Vector2(pos.x * T, BAND + (pos.y + 1.1) * T)
	var e: Dictionary = SpriteDB.char_frame(str(ch["who"]), str(ch["dir"]), str(ch["pose"]), int(ch["frame"]))
	spr.texture = SpriteDB.tex(str(e.get("file", "")))
	spr.position = Vector2(pos.x * T + int(e.get("ox", 0)), BAND + pos.y * T + int(e.get("oy", 0))) - node.position


func _process(delta: float) -> void:
	for who: String in chars:
		_step_char(chars[who], delta)


func _step_char(ch: Dictionary, delta: float) -> void:
	var path: Array = ch["path"]
	ch["t"] = float(ch["t"]) + delta
	if not path.is_empty():
		var tv: Vector2i = path[0]
		var target := Vector2(tv)
		var pos: Vector2 = ch["pos"]
		var to: Vector2 = target - pos
		var step: float = WALK_SPEED * delta
		if to.length() <= step:
			pos = target
			path.pop_front()
		else:
			pos += to.normalized() * step
		if absf(to.x) > absf(to.y):
			ch["dir"] = "right" if to.x > 0 else "left"
		elif to.length() > 0.001:
			ch["dir"] = "down" if to.y > 0 else "up"
		ch["pos"] = pos
		ch["pose"] = "walk"
		ch["frame"] = int(float(ch["t"]) * 8.0) % 4
		if path.is_empty():
			ch["pose"] = str(ch.get("arrive_pose", "stand"))
			ch["frame"] = 0
			ch["arrive_pose"] = "stand"
		_update_char_node(ch)
		return
	# 待機：ゆっくり 2 コマ（まばたき・しっぽ・寝息）
	var fr: int = int(float(ch["t"]) * 1.2) % 2
	if fr != int(ch["frame"]):
		ch["frame"] = fr
		_update_char_node(ch)
	if mode != "live" or _dialog_open or ch["who"] == "dan":
		return
	ch["timer"] = float(ch["timer"]) - delta
	if float(ch["timer"]) <= 0.0:
		ch["timer"] = randf_range(3.0, 6.0) if ch["who"] == "kid" else randf_range(5.0, 9.0)
		_wander(ch)


func _walk_to(ch: Dictionary, goal: Vector2i, arrive_pose: String = "stand") -> bool:
	var path: Array = Placement.find_path(area, _placements(), _char_cell(ch), goal)
	if path.is_empty():
		return false
	ch["path"] = path
	ch["arrive_pose"] = arrive_pose
	return true


## 娘とねこが近くを歩く。ねこは時々クッションやラグで丸くなる
func _wander(ch: Dictionary) -> void:
	var a: Dictionary = _area_def()
	var pl: Array = _placements()
	var here: Vector2i = _char_cell(ch)
	var others: Array = []
	for who: String in chars:
		if who != str(ch["who"]):
			others.append(_char_cell(chars[who]))
	if ch["who"] == "cat" and randf() < 0.5:
		var spots: Array = Placement.cat_spots(area, pl, night)
		spots.shuffle()
		for sv: Variant in spots:
			var spot: Vector2i = sv["cell"]
			if not others.has(spot) and _walk_to(ch, spot, "sleep" if randf() < 0.6 else "sit"):
				return
	var solid: PackedByteArray = Placement.solid_grid(a, pl)
	var w: int = int(a["w"])
	var cands: Array = []
	for dy in range(-3, 4):
		for dx in range(-3, 4):
			var q := Vector2i(here.x + dx, here.y + dy)
			if q == here or not Placement.in_b(a, q.x, q.y) or solid[q.y * w + q.x] != 0:
				continue
			if others.has(q) or Placement.is_exit(a, q.x, q.y):
				continue
			cands.append(q)
	if cands.is_empty():
		return
	_walk_to(ch, cands[randi() % cands.size()], "sit" if (ch["who"] == "cat" and randf() < 0.4) else "stand")


# ═════════════════════════ 入力 ═════════════════════════

func _unhandled_input(event: InputEvent) -> void:
	if _dialog_open:
		return
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			var local: Vector2 = world.get_global_transform_with_canvas().affine_inverse() * mb.position
			if _on_world_tap(local):
				get_viewport().set_input_as_handled()
	elif event is InputEventKey:
		var ke: InputEventKey = event
		if ke.pressed and not ke.echo and _editing() and _on_key(ke):
			get_viewport().set_input_as_handled()


## ワールド座標 → マス。壁帯（床より上）は band=true・y=0
func _on_world_tap(local: Vector2) -> bool:
	var a: Dictionary = _area_def()
	var cx: int = floori(local.x / T)
	if cx < 0 or cx >= int(a["w"]) or local.y < 0:
		return false
	var band: bool = false
	var cy: int = 0
	if local.y < BAND:
		band = true
	else:
		cy = floori((local.y - BAND) / T)
		if cy >= int(a["h"]):
			return false
	var cell: Dictionary = {"x": cx, "y": cy, "band": band}
	if _editing():
		_edit_tap(cell)
	else:
		_live_tap(cell)
	return true


func _on_key(ke: InputEventKey) -> bool:
	var mod: bool = ke.ctrl_pressed or ke.meta_pressed
	match ke.keycode:
		KEY_Z:
			if mod:
				if ke.shift_pressed:
					_redo()
				else:
					_undo()
				return true
		KEY_Y:
			if mod:
				_redo()
				return true
		KEY_R:
			_rotate()
			return true
		KEY_ESCAPE:
			_cancel()
			return true
		KEY_ENTER, KEY_KP_ENTER:
			_place()
			return true
		KEY_DELETE, KEY_BACKSPACE:
			_store()
			return true
		KEY_M:
			_start_move()
			return true
		KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT:
			return _arrow(ke.keycode)
	return false


# ═════════════════════════ 暮らしモード ═════════════════════════

func _live_tap(cell: Dictionary) -> void:
	live_mark = null
	var c := Vector2i(int(cell["x"]), int(cell["y"]))
	# 人物（足元のマスと頭のマス）
	if not bool(cell["band"]):
		for who: String in ["kid", "cat", "dan"]:
			var cc: Vector2i = _char_cell(chars[who])
			if c == cc or (who != "cat" and c == cc + Vector2i(0, -1)):
				_talk(who)
				return
	var p: Dictionary = _hit_placed(cell)
	if not p.is_empty():
		_inspect(p)
		return
	if bool(cell["band"]):
		return
	var dan: Dictionary = chars["dan"]
	if _walk_to(dan, c):
		msg = ""
	else:
		msg = "そこへは歩いて行けません。"
	_refresh_ui()
	_update_overlay(_area_def())


func _talk(who: String) -> void:
	match who:
		"kid":
			msg = "娘「%s」" % KID_LINES[randi() % KID_LINES.size()]
		"cat":
			msg = "三毛猫：%s" % CAT_LINES[randi() % CAT_LINES.size()]
			var ch: Dictionary = chars["cat"]
			if ch["pose"] == "sleep":
				ch["pose"] = "sit"
				_update_char_node(ch)
		_:
			msg = "だんのうら「%s」" % DAN_LINES[randi() % DAN_LINES.size()]
	_refresh_ui()


## 家具をタップ：説明・使う位置（使えないなら理由）。灯りは点けたり消したり
func _inspect(p: Dictionary) -> void:
	var item_id: String = str(p["itemId"])
	var c: Dictionary = Catalog.item(item_id)
	var nm: String = Catalog.display_name(item_id, str(p.get("variant", "default")))
	var lines := PackedStringArray(["「%s」%s" % [nm, str(c.get("desc", ""))]])
	if bool(c.get("light", false)):
		var lit: Dictionary = st.lit()
		var on: bool = not bool(lit.get(str(p["instanceId"]), false))
		if on:
			lit[str(p["instanceId"])] = true
		else:
			lit.erase(str(p["instanceId"]))
		var saved: bool = st.save()
		lines.append(("灯りを点けました。" if on else "灯りを消しました。") + ("" if saved else "（保存に失敗しました）"))
		_rebuild_world()
	var u: Dictionary = Placement.can_use(area, _placements(), p)
	if bool(u["ok"]):
		live_mark = u["cell"]
		if str(c.get("verb", "")) != "":
			lines.append("黄色い枠のマスから［%s］ができます。" % str(c["verb"]))
	elif str(c.get("use", "none")) != "none":
		lines.append(str(u["reason"]))
	msg = "\n".join(lines)
	_update_overlay(_area_def())
	_refresh_ui()


# ═════════════════════════ 模様替えモード（editor.js の移植） ═════════════════════════

func _sel_kind() -> String:
	return str(sel.get("kind", ""))


func _sel_item_id() -> String:
	if _sel_kind() == "new":
		return str(sel["item_id"])
	if _sel_kind() == "placed" and _editing():
		var f: Dictionary = draft.find(str(sel["id"]))
		if not f.is_empty():
			return str(f["p"]["itemId"])
	return ""


func _sel_variant() -> String:
	if _sel_kind() == "new":
		return str(sel["variant"])
	if _sel_kind() == "placed" and _editing():
		var f: Dictionary = draft.find(str(sel["id"]))
		if not f.is_empty():
			return str(f["p"].get("variant", "default"))
	return "default"


func _plant_holder(id: String) -> String:
	var plants: Variant = st.data.get("plants", {})
	if plants is Dictionary and (plants as Dictionary).has(id) and plants[id] is Dictionary:
		var h: Variant = plants[id].get("holder")
		if h is String and h != "":
			return h
	return "garden.pot"


func _start_edit() -> void:
	var plants: Variant = st.data.get("plants", {})
	draft = Draft.new({"room": st.placements("room"), "garden": st.placements("garden")}, {
		"owned": st.owned,
		"seq": int(st.data.get("seq", 1)),
		"plant_ids": (plants as Dictionary).keys() if plants is Dictionary else [],
		"plant_holder": _plant_holder,
	})
	mode = "edit"
	sel = {}
	msg = ""
	live_mark = null
	for who: String in chars:
		var ch: Dictionary = chars[who]
		if not (ch["path"] as Array).is_empty():
			ch["path"] = []
			ch["pos"] = Vector2(_char_cell(ch))
			ch["pose"] = "stand"
			_update_char_node(ch)
	_refresh()
	_layout()


func _stop_edit() -> void:
	draft = null
	sel = {}
	mode = "live"
	_fix_chars()
	_refresh()
	_layout()


func _check() -> Dictionary:
	if not _editing() or sel.is_empty() or not bool(sel.get("has_pos", false)):
		return {}
	var cand: Dictionary = {"itemId": _sel_item_id(), "variant": _sel_variant(), "x": int(sel["x"]), "y": int(sel["y"]), "rotation": int(sel["rotation"])}
	if _sel_kind() == "new":
		return draft.check(area, cand)
	var f: Dictionary = draft.find(str(sel["id"]))
	if f.is_empty():
		return {}
	if str(f["area"]) == area:
		return draft.check(area, cand, str(sel["id"]))
	# 部屋 ↔ 庭の移動：実際の move() と同じ判定
	return Placement.can_place(area, draft.placements(area), cand, {})


func _info() -> String:
	if not _editing():
		return msg
	if msg != "":
		return msg
	var area_name: String = str(_area_def().get("name", area))
	var kind: String = _sel_kind()
	if kind == "":
		return "模様替え中（%s）：下の収納から選ぶか、置いてある家具をタップして選んでください。時間は進みません。" % area_name
	var item_id: String = _sel_item_id()
	var nm: String = Catalog.display_name(item_id, _sel_variant())
	if kind == "new":
		var n: int = draft.stored(item_id, _sel_variant())
		if not bool(sel.get("has_pos", false)):
			return "「%s」（収納 %d）：置きたいマスをタップしてください。" % [nm, n]
		var r: Dictionary = _check()
		if bool(r.get("ok", false)):
			return "「%s」をここに置けます。［置く］で決定（向き %s）。" % [nm, ROT_NAME.get(int(sel["rotation"]), "下")]
		return "置けません：%s" % str(r.get("reason", ""))
	if bool(sel.get("moving", false)):
		var r2: Dictionary = _check()
		if bool(r2.get("ok", false)):
			return "「%s」をここへ移動できます。［置く］で決定。" % nm
		return "ここへは動かせません：%s" % str(r2.get("reason", ""))
	return "「%s」を選択中：［移動］［回転］［収納］が使えます。" % nm


func _hit_placed(cell: Dictionary) -> Dictionary:
	var list: Array = _placements()
	var cx: int = int(cell["x"])
	var cy: int = int(cell["y"])
	if bool(cell["band"]):
		for pv: Variant in list:
			if Placement.layer_of(pv) == "wall" and int(pv["x"]) == cx:
				return pv
		return {}
	var at := Vector2i(cx, cy)
	for pv: Variant in list:
		if Placement.layer_of(pv) == "furniture" and Placement.cells_of(pv).has(at):
			return pv
	for pv: Variant in list:
		var layer: String = Placement.layer_of(pv)
		if layer != "furniture" and layer != "wall" and Placement.cells_of(pv).has(at):
			return pv
	if cy == 0:
		for pv: Variant in list:
			if Placement.layer_of(pv) == "wall" and int(pv["x"]) == cx:
				return pv
	return {}


func _edit_tap(cell: Dictionary) -> void:
	msg = ""
	var kind: String = _sel_kind()
	if kind == "new" or (kind == "placed" and bool(sel.get("moving", false))):
		if bool(sel.get("has_pos", false)) and int(sel["x"]) == int(cell["x"]) and int(sel["y"]) == int(cell["y"]):
			_place()       # 同じマスをもう一度タップ＝置く
			return
		sel["x"] = int(cell["x"])
		sel["y"] = int(cell["y"])
		sel["has_pos"] = true
		_refresh()
		return
	var p: Dictionary = _hit_placed(cell)
	if p.is_empty():
		sel = {}
	else:
		sel = {"kind": "placed", "id": str(p["instanceId"]), "moving": false, "x": int(p["x"]), "y": int(p["y"]),
			"rotation": int(p["rotation"]), "has_pos": true}
	_refresh()


func _pick(item_id: String, variant: String) -> void:
	if not _editing():
		return
	var c: Dictionary = Catalog.item(item_id)
	if c.is_empty():
		return
	var keep: bool = _sel_kind() == "new" and str(sel["item_id"]) == item_id and str(sel["variant"]) == variant
	var rots: Array = c.get("rots", [0])
	sel = {"kind": "new", "item_id": item_id, "variant": variant,
		"rotation": int(sel["rotation"]) if keep else int(rots[0]),
		"x": int(sel.get("x", 0)) if keep else 0, "y": int(sel.get("y", 0)) if keep else 0,
		"has_pos": bool(sel.get("has_pos", false)) if keep else false}
	msg = ""
	var nm: String = Catalog.display_name(item_id, variant)
	var areas: Array = c.get("areas", [])
	if draft.stored(item_id, variant) <= 0:
		msg = "収納に「%s」が残っていません。置いてあるものを［収納］すると使えます。" % nm
	elif not areas.has(area):
		var names := PackedStringArray()
		for ar: Variant in areas:
			names.append(str(Catalog.area(str(ar)).get("name", ar)))
		msg = "「%s」は%sには置けません（%sだけ）。" % [str(c["name"]), _area_def().get("name", area), "・".join(names)]
	_refresh()


func _place() -> void:
	if not _editing() or sel.is_empty() or not bool(sel.get("has_pos", false)):
		return
	var kind: String = _sel_kind()
	if kind == "placed" and not bool(sel.get("moving", false)):
		return
	var r: Dictionary
	if kind == "new":
		r = draft.place(area, {"itemId": sel["item_id"], "variant": sel["variant"], "x": sel["x"], "y": sel["y"], "rotation": sel["rotation"]})
		if bool(r["ok"]):
			var p: Dictionary = r["p"]
			_toast("「%s」を置きました" % Catalog.display_name(str(p["itemId"]), str(p["variant"])))
			sel = {"kind": "placed", "id": str(p["instanceId"]), "moving": false, "x": int(p["x"]), "y": int(p["y"]),
				"rotation": int(p["rotation"]), "has_pos": true}
	else:
		r = draft.move(str(sel["id"]), {"x": sel["x"], "y": sel["y"], "rotation": sel["rotation"], "area": area})
		if bool(r["ok"]):
			_toast("移動しました")
			sel["moving"] = false
	msg = "" if bool(r["ok"]) else "置けません：%s" % str(r["reason"])
	_refresh()


func _rotate() -> void:
	if not _editing() or sel.is_empty():
		return
	msg = ""
	var kind: String = _sel_kind()
	if kind == "new" or bool(sel.get("moving", false)):
		var item_id: String = _sel_item_id()
		var rots: Array = Catalog.item(item_id).get("rots", [0])
		if rots.size() < 2:
			msg = "「%s」は回せません" % Catalog.item_name(item_id)
		else:
			sel["rotation"] = int(rots[(rots.find(int(sel["rotation"])) + 1) % rots.size()])
		_refresh()
		return
	var r: Dictionary = draft.rotate(str(sel["id"]))
	if bool(r["ok"]):
		var f: Dictionary = draft.find(str(sel["id"]))
		sel["rotation"] = int(f["p"]["rotation"])
	else:
		msg = str(r["reason"])
	_refresh()


func _store() -> void:
	if not _editing() or _sel_kind() != "placed":
		return
	var f: Dictionary = draft.find(str(sel["id"]))
	if f.is_empty():
		return
	var r: Dictionary = draft.store(str(sel["id"]))
	if bool(r["ok"]):
		_toast("「%s」を収納しました" % Catalog.display_name(str(f["p"]["itemId"]), str(f["p"].get("variant", "default"))))
		sel = {}
		msg = ""
	else:
		msg = str(r["reason"])
	_refresh()


func _start_move() -> void:
	if not _editing() or _sel_kind() != "placed":
		return
	var f: Dictionary = draft.find(str(sel["id"]))
	if f.is_empty():
		return
	var p: Dictionary = f["p"]
	sel["moving"] = true
	sel["x"] = int(p["x"])
	sel["y"] = int(p["y"])
	sel["rotation"] = int(p["rotation"])
	sel["has_pos"] = true
	msg = "「%s」の移動先をタップしてください。" % Catalog.display_name(str(p["itemId"]), str(p.get("variant", "default")))
	_refresh()


func _cancel() -> void:
	if not _editing() or sel.is_empty():
		return
	if bool(sel.get("moving", false)):
		sel["moving"] = false
		var f: Dictionary = draft.find(str(sel["id"]))
		if not f.is_empty():
			sel["x"] = int(f["p"]["x"])
			sel["y"] = int(f["p"]["y"])
			sel["rotation"] = int(f["p"]["rotation"])
	else:
		sel = {}
	msg = ""
	_refresh()


func _arrow(keycode: Key) -> bool:
	var kind: String = _sel_kind()
	if not (kind == "new" or bool(sel.get("moving", false))):
		return false
	var a: Dictionary = _area_def()
	if not bool(sel.get("has_pos", false)):
		sel["x"] = int(a["w"]) / 2
		sel["y"] = int(a["h"]) / 2
		sel["has_pos"] = true
	else:
		var d := Vector2i.ZERO
		match keycode:
			KEY_UP:
				d = Vector2i(0, -1)
			KEY_DOWN:
				d = Vector2i(0, 1)
			KEY_LEFT:
				d = Vector2i(-1, 0)
			KEY_RIGHT:
				d = Vector2i(1, 0)
		sel["x"] = clampi(int(sel["x"]) + d.x, 0, int(a["w"]) - 1)
		sel["y"] = clampi(int(sel["y"]) + d.y, 0, int(a["h"]) - 1)
	msg = ""
	_refresh()
	return true


func _after_history() -> void:
	if _sel_kind() == "placed":
		var f: Dictionary = draft.find(str(sel["id"]))
		if f.is_empty() or str(f["area"]) != area:
			sel = {}
		else:
			sel["moving"] = false
			sel["x"] = int(f["p"]["x"])
			sel["y"] = int(f["p"]["y"])
			sel["rotation"] = int(f["p"]["rotation"])
	msg = ""
	_refresh()


func _undo() -> void:
	if _editing() and draft.undo():
		_toast("ひとつ戻しました")
		_after_history()


func _redo() -> void:
	if _editing() and draft.redo():
		_toast("やり直しました")
		_after_history()


func _commit() -> void:
	if not _editing():
		return
	if not draft.dirty():
		_stop_edit()
		_toast("変更はありませんでした")
		return
	var after: Dictionary = draft.result()
	st.data["room"]["placements"] = after["room"]
	st.data["garden"]["placements"] = after["garden"]
	st.data["seq"] = maxi(int(st.data.get("seq", 1)), draft.seq)
	# 収納した灯りの点灯状態は消す
	var live_ids: Dictionary = {}
	for a: String in ["room", "garden"]:
		for pv: Variant in after[a]:
			live_ids[str(pv["instanceId"])] = true
	var lit: Dictionary = st.lit()
	for id: Variant in lit.keys():
		if not live_ids.has(str(id)):
			lit.erase(id)
	var ok: bool = st.save()
	_stop_edit()
	if ok:
		_toast("模様替えを確定して保存しました")
	else:
		_toast("保存に失敗しました。画面には反映されていますが、セーブはできていません。")


func _discard() -> void:
	_stop_edit()
	_toast("模様替えを破棄しました")


func _ask_discard() -> void:
	if not _editing():
		return
	if not draft.dirty():
		_discard()
		return
	_ask("模様替えの変更をすべて破棄しますか？", ["破棄する", "続ける"], _on_discard_choice)


func _on_discard_choice(i: int) -> void:
	if i == 0:
		_discard()


func _inventory() -> Array:
	var out: Array = []
	var inv: Variant = st.data.get("inventory", {})
	if not (inv is Dictionary):
		return out
	for idv: Variant in Catalog.items():
		var id: String = str(idv)
		var c: Dictionary = Catalog.item(id)
		if str(c.get("kind", "")) == "seed":
			continue                   # 種は置けない（暮らしモードで鉢に植える）
		var areas: Array = c.get("areas", [])
		if not areas.has(area):
			continue
		if not (inv as Dictionary).has(id) or not (inv[id] is Dictionary):
			continue
		for vv: Variant in inv[id]:
			var v: String = str(vv)
			if int(inv[id][vv]) <= 0:
				continue
			out.append({"item_id": id, "variant": v, "name": Catalog.display_name(id, v), "stored": draft.stored(id, v)})
	return out


# ═════════════════════════ 画面の切り替え ═════════════════════════

func _switch_area(a: String) -> void:
	if a == area:
		_refresh_ui()
		return
	area = a
	live_mark = null
	if _editing():
		# 置いてある家具の選択は外す（移動中なら、部屋⇔庭をまたいで動かせる）
		if _sel_kind() == "placed" and not bool(sel.get("moving", false)):
			sel = {}
		elif _sel_kind() == "new":
			sel["has_pos"] = false
		msg = ""
	else:
		msg = ""
	_place_chars()
	_refresh()
	_layout()


func _toggle_night() -> void:
	night = not night
	_apply_night()


func _apply_night() -> void:
	scene_root.modulate = NIGHT_TINT if night else Color.WHITE
	_refresh()


func _refresh() -> void:
	_rebuild_world()
	_refresh_ui()


func _refresh_ui() -> void:
	if ui_root == null:
		return
	title_label.text = "家づくり" if area == "room" else "庭づくり"
	mode_label.text = "模様替え中" if _editing() else "暮らし"
	night_btn.text = "夜" if night else "昼"
	tab_room.set_pressed_no_signal(area == "room")
	tab_garden.set_pressed_no_signal(area == "garden")
	live_box.visible = not _editing()
	edit_box.visible = _editing()
	if not _editing():
		info_label.text = msg if msg != "" else "タップした場所へ だんのうら が歩きます。家具をタップすると説明が出ます（灯りは点けたり消したり）。"
		return
	info_label.text = _info()
	var kind: String = _sel_kind()
	var previewing: bool = (kind == "new" or bool(sel.get("moving", false))) and bool(sel.get("has_pos", false))
	var r: Dictionary = _check() if previewing else {}
	var place_btn: Button = act["place"]
	place_btn.disabled = not previewing
	place_btn.theme_type_variation = &"PrimaryButton" if bool(r.get("ok", false)) else &""
	var rot_disabled: bool = kind == ""
	if kind == "new":
		rot_disabled = (Catalog.item(_sel_item_id()).get("rots", [0]) as Array).size() < 2
	(act["rotate"] as Button).disabled = rot_disabled
	(act["store"] as Button).disabled = kind != "placed"
	(act["move"] as Button).disabled = not (kind == "placed" and not bool(sel.get("moving", false)))
	(act["cancel"] as Button).disabled = kind == ""
	(act["undo"] as Button).disabled = not draft.can_undo()
	(act["redo"] as Button).disabled = not draft.can_redo()
	# 収納のボタン自身の pressed から呼ばれることがあるので、作り直しはフレームの終わりに
	_rebuild_inventory.call_deferred()


func _rebuild_inventory() -> void:
	if not _editing():
		return
	for c: Node in inv_box.get_children():
		inv_box.remove_child(c)
		c.queue_free()
	var list: Array = _inventory()
	if list.is_empty():
		var l := Label.new()
		l.text = "この場所に置ける持ち物がありません。"
		inv_box.add_child(l)
		return
	for ev: Variant in list:
		var e: Dictionary = ev
		var b := Button.new()
		b.toggle_mode = true
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(108, 116)
		b.set_pressed_no_signal(_sel_kind() == "new" and str(sel["item_id"]) == str(e["item_id"]) and str(sel["variant"]) == str(e["variant"]))
		b.tooltip_text = str(e["name"])
		var vb := VBoxContainer.new()
		vb.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 4)
		vb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_theme_constant_override("separation", 0)
		var tr := TextureRect.new()
		tr.texture = SpriteDB.icon(str(e["item_id"]), str(e["variant"]))
		tr.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
		tr.custom_minimum_size = Vector2(0, 52)
		tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_child(tr)
		var nl := Label.new()
		nl.text = str(e["name"])
		nl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		nl.clip_text = true
		nl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		nl.add_theme_font_size_override("font_size", 15)
		nl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_child(nl)
		var cl := Label.new()
		var n: int = int(e["stored"])
		cl.text = "収納 %d" % n
		cl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cl.add_theme_font_size_override("font_size", 15)
		cl.add_theme_color_override("font_color", UITheme.GOLD_HI if n > 0 else UITheme.TEXT_DIM)
		cl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_child(cl)
		b.add_child(vb)
		if n <= 0:
			b.modulate = Color(1, 1, 1, 0.6)
		b.pressed.connect(_pick.bind(str(e["item_id"]), str(e["variant"])))
		inv_box.add_child(b)


# ═════════════════════════ UI の組み立て ═════════════════════════

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.name = "UI"
	layer.layer = 10
	add_child(layer)
	ui_root = Control.new()
	ui_root.name = "Root"
	ui_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_root.theme = UITheme.build()
	layer.add_child(ui_root)

	# ── 見出し：戻る・題・昼夜／部屋・庭のタブ ──
	header = PanelContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_STOP
	header.set_anchors_preset(Control.PRESET_TOP_WIDE)
	header.offset_left = 8
	header.offset_right = -8
	header.offset_top = 8
	header.offset_bottom = HEADER_H - 4
	ui_root.add_child(header)
	var hv := VBoxContainer.new()
	hv.add_theme_constant_override("separation", 8)
	header.add_child(hv)
	var row := HBoxContainer.new()
	hv.add_child(row)
	var back: Button = _button("＜", _on_back)
	back.custom_minimum_size = Vector2(60, 56)
	row.add_child(back)
	title_label = Label.new()
	title_label.theme_type_variation = &"TitleLabel"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(title_label)
	night_btn = _button("夜", _toggle_night)
	night_btn.custom_minimum_size = Vector2(72, 56)
	night_btn.tooltip_text = "昼と夜を切り替える"
	row.add_child(night_btn)
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 8)
	hv.add_child(tabs)
	tab_room = _button("部屋", _switch_area.bind("room"), "room")
	tab_room.toggle_mode = true
	tab_room.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_child(tab_room)
	tab_garden = _button("庭", _switch_area.bind("garden"), "garden")
	tab_garden.toggle_mode = true
	tab_garden.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tabs.add_child(tab_garden)
	mode_label = Label.new()
	mode_label.custom_minimum_size = Vector2(130, 0)
	mode_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mode_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mode_label.add_theme_color_override("font_color", UITheme.GOLD_HI)
	tabs.add_child(mode_label)
	for b: Button in [tab_room, tab_garden]:
		b.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.vertical_icon_alignment = VERTICAL_ALIGNMENT_CENTER

	# ── 下のパネル：案内文・暮らし／模様替えの操作 ──
	panel = PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	ui_root.add_child(panel)
	var pv := VBoxContainer.new()
	pv.add_theme_constant_override("separation", 8)
	panel.add_child(pv)
	info_label = Label.new()
	info_label.theme_type_variation = &"InfoLabel"
	info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	info_label.custom_minimum_size = Vector2(0, 62)
	info_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	pv.add_child(info_label)

	live_box = VBoxContainer.new()
	live_box.add_theme_constant_override("separation", 8)
	pv.add_child(live_box)
	var edit_btn: Button = _button("模様替えする", _start_edit, "edit", "PrimaryButton")
	edit_btn.custom_minimum_size = Vector2(0, 72)
	live_box.add_child(edit_btn)
	var lrow := HBoxContainer.new()
	lrow.add_theme_constant_override("separation", 8)
	live_box.add_child(lrow)
	var data_btn: Button = _button("データ", _on_data_menu)
	data_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lrow.add_child(data_btn)

	edit_box = VBoxContainer.new()
	edit_box.add_theme_constant_override("separation", 8)
	pv.add_child(edit_box)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 124)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	edit_box.add_child(scroll)
	inv_box = HBoxContainer.new()
	inv_box.add_theme_constant_override("separation", 6)
	scroll.add_child(inv_box)
	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 6)
	edit_box.add_child(row1)
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 6)
	edit_box.add_child(row2)
	var defs: Array = [
		["place", "置く", "place", _place, row1, ""],
		["rotate", "回転", "rotate", _rotate, row1, ""],
		["store", "収納", "store", _store, row1, ""],
		["move", "移動", "edit", _start_move, row1, ""],
		["cancel", "解除", "close", _cancel, row1, ""],
		["undo", "取り消し", "undo", _undo, row2, ""],
		["redo", "やり直し", "redo", _redo, row2, ""],
		["discard", "破棄", "close", _ask_discard, row2, "DangerButton"],
		["commit", "確定", "place", _commit, row2, "PrimaryButton"],
	]
	for d: Variant in defs:
		var b: Button = _button(str(d[1]), d[3], str(d[2]), str(d[5]))
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.custom_minimum_size = Vector2(0, 84 if d[4] == row1 else 64)
		if d[4] == row1:
			b.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
			b.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		(d[4] as HBoxContainer).add_child(b)
		act[str(d[0])] = b

	# ── 短いお知らせ ──
	toast_panel = PanelContainer.new()
	toast_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	toast_panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	toast_panel.visible = false
	ui_root.add_child(toast_panel)
	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_color_override("font_color", UITheme.GOLD_HI)
	toast_panel.add_child(toast_label)


func _button(text: String, cb: Callable, icon_name: String = "", variation: String = "") -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 56)
	if icon_name != "":
		var ic: Texture2D = SpriteDB.ui(icon_name)
		if ic != null:
			b.icon = ic
	if variation != "":
		b.theme_type_variation = StringName(variation)
	b.pressed.connect(cb)
	return b


## 画面の大きさに合わせて：下のパネルの高さ、盤面の拡大率と位置
func _layout() -> void:
	if ui_root == null:
		return
	var vs: Vector2 = get_viewport_rect().size
	var ph: float = PANEL_H_EDIT if _editing() else PANEL_H_LIVE
	panel.offset_left = 8
	panel.offset_right = -8
	panel.offset_top = -ph - 8
	panel.offset_bottom = -8
	toast_panel.offset_left = 32
	toast_panel.offset_right = -32
	toast_panel.offset_top = HEADER_H + 8
	toast_panel.offset_bottom = HEADER_H + 60
	var avail := Rect2(Vector2(8, HEADER_H + 4), Vector2(vs.x - 16, vs.y - HEADER_H - ph - 24))
	var size: Vector2 = _world_size()
	var z: float = minf(avail.size.x / size.x, avail.size.y / size.y)
	z = maxf(z, 0.25)
	world.scale = Vector2(z, z)
	world.position = (avail.position + (avail.size - size * z) * 0.5).round()


func _toast(text: String) -> void:
	toast_label.text = text
	toast_panel.visible = true
	toast_panel.modulate = Color(1, 1, 1, 1)
	if _toast_tween != null and _toast_tween.is_valid():
		_toast_tween.kill()
	_toast_tween = create_tween()
	_toast_tween.tween_interval(1.6)
	_toast_tween.tween_property(toast_panel, "modulate:a", 0.0, 0.5)
	_toast_tween.tween_callback(toast_panel.hide)


## 確認の小窓。options[0] が主ボタン。選ばれた番号を cb(i) で返す
func _ask(text: String, options: Array, cb: Callable) -> void:
	_dialog_open = true
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	ui_root.add_child(dim)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dim.add_child(cc)
	var pc := PanelContainer.new()
	cc.add_child(pc)
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 10)
	pc.add_child(vb)
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(420, 0)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vb.add_child(l)
	for i in range(options.size()):
		var b: Button = _button(str(options[i]), _on_dialog_choice.bind(dim, cb, i), "", "PrimaryButton" if i == 0 else "")
		b.custom_minimum_size = Vector2(0, 60)
		vb.add_child(b)


func _on_dialog_choice(dim: Control, cb: Callable, i: int) -> void:
	dim.queue_free()
	_dialog_open = false
	cb.call(i)


func _on_back() -> void:
	if _editing():
		if not draft.dirty():
			_stop_edit()
			return
		_ask("模様替えがまだ確定されていません。", ["確定して閉じる", "破棄して閉じる", "続ける"], _on_back_choice)
		return
	_toast("この試作には本編の画面がありません（本編は Web 版で）。")


func _on_back_choice(i: int) -> void:
	if i == 0:
		_commit()
	elif i == 1:
		_discard()


func _on_data_menu() -> void:
	_ask("保存先：user://home.json\n（Web 版の gs.homeData と同じ形です）", ["初期配置に戻す", "閉じる"], _on_data_choice)


func _on_data_choice(i: int) -> void:
	if i != 0:
		return
	var ok: bool = st.reset_to_default()
	_place_chars()
	msg = "初期配置に戻しました。" if ok else "初期配置に戻しました（保存には失敗しました）。"
	_refresh()
