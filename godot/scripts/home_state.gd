extends RefCounted
## gs.homeData と同じ形のデータを持ち、user://home.json に保存・読込する。
## （main/home/state.js の初期化・修復の要点を移植。Web 版が管理する plants / events / memories /
##   bonds / life などの中身は触らずにそのまま持ち回るので、Web 版との間でデータを行き来できる）

const Catalog := preload("res://scripts/catalog.gd")
const Placement := preload("res://scripts/placement.gd")

const SAVE_PATH := "user://home.json"
const VERSION := 2
const V2_RECIPES := ["kid_desk", "planter", "clothesline", "string_lights"]
const V2_STORED := [["furniture.toy_box", 1], ["garden.watering_can", 1]]
const AREA_KEYS := ["room", "garden"]

var data: Dictionary = {}
var last_message: String = ""


## 保存があれば読み、無ければ初期データ（Web 版の新規ゲームと同じ配置）を作る
func load_or_new() -> void:
	var loaded: Dictionary = read_save()
	if loaded.is_empty():
		data = repair(Catalog.default_home())
		last_message = "はじめての家です（Web 版と同じ初期配置）。"
	else:
		data = repair(loaded)
		last_message = "保存データを読み込みました。"


## user://home.json を読む。Web 版のセーブ全体（{..., homeData:{...}}）を置いても homeData だけを使う
func read_save() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if not (parsed is Dictionary):
		push_warning("home.json を読めませんでした。初期データで始めます。")
		return {}
	var d: Dictionary = Catalog.ints(parsed)
	if d.has("homeData") and d["homeData"] is Dictionary:
		return d["homeData"]
	return d


func save() -> bool:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		push_error("保存に失敗しました: %s" % error_string(FileAccess.get_open_error()))
		return false
	f.store_string(JSON.stringify(data, "  "))
	f.close()
	return true


func reset_to_default() -> bool:
	data = repair(Catalog.default_home())
	return save()


# ───────── 所持数 ─────────

static func def_variant(item_id: String, v: Variant = null) -> String:
	var c: Dictionary = Catalog.item(item_id)
	var vs: Variant = c.get("variants")
	if vs is Array and not (vs as Array).is_empty():
		return str(v) if (v is String and (vs as Array).has(v)) else str(vs[0])
	return str(v) if (v is String and v != "") else "default"


static func _inv_add(hd: Dictionary, item_id: String, n: int, variant: Variant = null) -> void:
	var v: String = def_variant(item_id, variant)
	var inv: Dictionary = hd["inventory"]
	var o: Dictionary = inv[item_id] if (inv.has(item_id) and inv[item_id] is Dictionary) else {}
	inv[item_id] = o
	o[v] = maxi(0, int(o.get(v, 0)) + n)
	if int(o[v]) == 0:
		o.erase(v)
	if o.is_empty():
		inv.erase(item_id)


## variant が "" なら色違いをまとめて数える
func owned(item_id: String, variant: String = "") -> int:
	return owned_in(data, item_id, variant)


static func owned_in(hd: Dictionary, item_id: String, variant: String = "") -> int:
	var inv: Variant = hd.get("inventory", {})
	if not (inv is Dictionary) or not (inv as Dictionary).has(item_id):
		return 0
	var o: Variant = inv[item_id]
	if not (o is Dictionary):
		return 0
	if variant == "":
		var s: int = 0
		for k: Variant in o:
			s += int(o[k])
		return s
	return int((o as Dictionary).get(variant, 0))


func placements(area: String) -> Array:
	var box: Variant = data.get(area, {})
	if box is Dictionary and (box as Dictionary).get("placements") is Array:
		return box["placements"]
	return []


func lit() -> Dictionary:
	var flags: Dictionary = data["flags"]
	if not (flags.get("lit") is Dictionary):
		flags["lit"] = {}
	return flags["lit"]


# ───────── 修復（state.js の repair を移植） ─────────

static func _int0(v: Variant) -> int:
	if v is int or v is float:
		var n: int = floori(float(v))
		return n if n > 0 else 0
	if v is String and (v as String).is_valid_float():
		return maxi(0, floori((v as String).to_float()))
	return 0


## 壊れたデータを直す：不明ID・不正座標・重なり・所持数超過の配置は「収納へ戻す」（配置だけ外す）
static func repair(src: Dictionary) -> Dictionary:
	var hd: Dictionary = src.duplicate(true)
	hd["version"] = VERSION
	# 所持
	var inv_raw: Variant = hd.get("inventory", {})
	hd["inventory"] = {}
	if inv_raw is Dictionary:
		for id: Variant in inv_raw:
			var v: Variant = inv_raw[id]
			if Catalog.item(str(id)).is_empty():
				hd["inventory"][id] = v      # 未知のID：将来版のデータかもしれないので保持だけする
				continue
			if v is int or v is float:
				_inv_add(hd, str(id), _int0(v))
			elif v is Dictionary:
				for k: Variant in v:
					_inv_add(hd, str(id), _int0(v[k]), str(k))
	# 素材
	var m: Variant = hd.get("materials", {})
	var mats: Dictionary = {}
	var mdef: Variant = Catalog.catalog().get("materials", {})
	if mdef is Dictionary:
		for k: Variant in mdef:
			mats[k] = _int0(m.get(k, 0)) if m is Dictionary else 0
	hd["materials"] = mats
	# レシピ
	var recipes: Variant = Catalog.catalog().get("recipes", {})
	var ur: Array = []
	if hd.get("unlockedRecipes") is Array:
		for r: Variant in hd["unlockedRecipes"]:
			if r is String and recipes is Dictionary and (recipes as Dictionary).has(r) and not ur.has(r):
				ur.append(r)
	hd["unlockedRecipes"] = ur
	# その他の入れ物
	for k: String in ["plants", "events", "appliedRewards", "flags"]:
		if not (hd.get(k) is Dictionary):
			hd[k] = {}
	if not (hd.get("memories") is Array):
		hd["memories"] = []
	var flags: Dictionary = hd["flags"]
	if not (flags.get("lit") is Dictionary):
		flags["lit"] = {}
	flags["repairedShelf"] = bool(flags.get("repairedShelf", false))
	# v1 → v2：新しい初期収納とレシピを一度だけ渡す
	var v2: Variant = flags.get("v2Items")
	if not (v2 is bool and v2):
		for pair: Variant in V2_STORED:
			_inv_add(hd, str(pair[0]), int(pair[1]))
		for r: Variant in V2_RECIPES:
			if not ur.has(r):
				ur.append(r)
		flags["v2Items"] = true
	if hd.get("bonds") == null:
		hd["bonds"] = {}
	if hd.get("life") == null:
		hd["life"] = {}
	# 配置
	var max_seq: int = maxi(1, _int0(hd.get("seq", 1)))
	var placed_cnt: Dictionary = {}
	for area: String in AREA_KEYS:
		var a: Dictionary = Catalog.area(area)
		var box: Dictionary = hd[area] if hd.get(area) is Dictionary else {}
		hd[area] = box
		var raw: Array = box["placements"] if box.get("placements") is Array else []
		box["width"] = a["w"]
		box["height"] = a["h"]
		if area == "room":
			box["floorId"] = box["floorId"] if box.get("floorId") is String else "floor.wood"
		else:
			box["groundId"] = box["groundId"] if box.get("groundId") is String else "ground.grass"
		var list: Array = []
		for pv: Variant in raw:
			if not (pv is Dictionary):
				continue
			var p: Dictionary = pv
			var item_id: String = str(p.get("itemId", ""))
			var c: Dictionary = Catalog.item(item_id)
			if c.is_empty():
				continue                                    # 不明ID → 無視
			if not (p.get("x") is int) or not (p.get("y") is int):
				continue
			var rot: int = Placement.norm_rot(p.get("rotation", 0))
			var rots: Array = c.get("rots", [0])
			if not rots.has(rot):
				rot = int(rots[0])
			var variant: String = def_variant(item_id, p.get("variant"))
			var key: String = item_id + "|" + variant
			if int(placed_cnt.get(key, 0)) + 1 > owned_in(hd, item_id, variant):
				continue                                    # 所持数より多い → 収納へ
			var q: Dictionary = {"instanceId": str(p.get("instanceId", "")), "itemId": item_id, "x": p["x"], "y": p["y"],
				"rotation": rot, "variant": variant, "layer": str(c.get("layer", "furniture"))}
			var r: Dictionary = Placement.can_place(area, list, q, {"skip_reach": true})
			if not bool(r["ok"]):
				continue                                    # はみ出し・重なり・壁・出入口 → 収納へ
			list.append(q)
			placed_cnt[key] = int(placed_cnt.get(key, 0)) + 1
		# 通れない配置は、後から置いたものから収納へ戻す
		var guard: int = list.size() + 1
		while guard > 0 and not bool(Placement.reachable(area, list)["ok"]):
			guard -= 1
			var k: int = -1
			for i in range(list.size() - 1, -1, -1):
				var ci: Dictionary = Catalog.item(str(list[i]["itemId"]))
				if bool(ci.get("solid", false)) and str(ci.get("layer", "")) == "furniture":
					k = i
					break
			if k < 0:
				break
			var gone: Dictionary = list[k]
			list.remove_at(k)
			var gk: String = str(gone["itemId"]) + "|" + str(gone["variant"])
			placed_cnt[gk] = int(placed_cnt.get(gk, 0)) - 1
		box["placements"] = list
	# instanceId を一意に・seq を最大より大きく
	for area: String in AREA_KEYS:
		for pv: Variant in hd[area]["placements"]:
			max_seq = maxi(max_seq, _seq_of(str(pv["instanceId"])) + 1)
	for pid: Variant in hd["plants"]:
		max_seq = maxi(max_seq, _seq_of(str(pid)) + 1)
	var ids: Dictionary = {}
	for area: String in AREA_KEYS:
		for pv: Variant in hd[area]["placements"]:
			var p: Dictionary = pv
			if str(p["instanceId"]) == "" or ids.has(p["instanceId"]):
				p["instanceId"] = "p%d" % max_seq
				max_seq += 1
			ids[p["instanceId"]] = true
	hd["seq"] = max_seq
	return hd


## "p12" → 12（形が違えば 0）
static func _seq_of(id: String) -> int:
	if id.begins_with("p") and id.substr(1).is_valid_int():
		return id.substr(1).to_int()
	return 0
