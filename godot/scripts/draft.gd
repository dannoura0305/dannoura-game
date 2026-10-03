extends RefCounted
## 模様替えの下書き（placement.js の createDraft の移植）。取り消し／やり直し付き。
## 所持総数は変えず、配置だけを動かす（収納数 = 所持 − 配置 が常に整合する）。
##
##   var d := Draft.new({"room": [...], "garden": [...]}, {"owned": Callable, "seq": 1, "plant_ids": [], "plant_holder": Callable})
##   d.place(area, cand) / d.move(id, to) / d.rotate(id) / d.store(id) / d.undo() / d.redo() / d.result()
## 結果の辞書は {ok, reason, cells, bad, p}（p は置いた／動かした配置）

const Placement := preload("res://scripts/placement.gd")
const Catalog := preload("res://scripts/catalog.gd")

const HISTORY_MAX := 200

var state: Dictionary = {"room": [], "garden": []}
var seq: int = 1
var _orig: String = ""
var _past: Array = []
var _future: Array = []
var _plant_ids: Array = []
var _owned: Callable
var _holder_of: Callable


func _init(src: Dictionary = {}, opts: Dictionary = {}) -> void:
	var room: Variant = src.get("room", [])
	var garden: Variant = src.get("garden", [])
	state = {
		"room": (room as Array).duplicate(true) if room is Array else [],
		"garden": (garden as Array).duplicate(true) if garden is Array else [],
	}
	_orig = JSON.stringify(state)
	seq = maxi(1, int(opts.get("seq", 1)))
	var ids: Variant = opts.get("plant_ids", [])
	_plant_ids = (ids as Array).duplicate() if ids is Array else []
	var ow: Variant = opts.get("owned")
	_owned = ow if ow is Callable else Callable()
	var ho: Variant = opts.get("plant_holder")
	_holder_of = ho if ho is Callable else Callable()


func placements(area: String) -> Array:
	return state.get(area, [])


func _all() -> Array:
	var out: Array = []
	out.append_array(state["room"])
	out.append_array(state["garden"])
	return out


func owned(item_id: String, variant: String = "") -> int:
	if not _owned.is_valid():
		return 0
	return int(_owned.call(item_id, variant))


## variant が "" なら色違いをまとめて数える
func placed(item_id: String, variant: String = "") -> int:
	var n: int = 0
	for pv: Variant in _all():
		var p: Dictionary = pv
		if str(p["itemId"]) == item_id and (variant == "" or str(p.get("variant", "default")) == variant):
			n += 1
	return n


func stored(item_id: String, variant: String = "") -> int:
	return maxi(0, owned(item_id, variant) - placed(item_id, variant))


## {area, i, p}。見つからなければ空
func find(id: String) -> Dictionary:
	for area: String in ["room", "garden"]:
		var list: Array = state[area]
		for i in range(list.size()):
			if str(list[i].get("instanceId", "")) == id:
				return {"area": area, "i": i, "p": list[i]}
	return {}


func can_undo() -> bool:
	return not _past.is_empty()


func can_redo() -> bool:
	return not _future.is_empty()


func dirty() -> bool:
	return JSON.stringify(state) != _orig


func _push_history(snap: Dictionary) -> void:
	_past.append(snap)
	if _past.size() > HISTORY_MAX:
		_past.pop_front()
	_future.clear()


func _new_id(item_id: String) -> String:
	var used: Dictionary = {}
	for pv: Variant in _all():
		used[str(pv.get("instanceId", ""))] = true
	var c: Dictionary = Catalog.item(item_id)
	if bool(c.get("plantable", false)):
		# 収納した鉢を置き直すと、同じ種類の入れ物に植わっていた植物（持ち主のいない記録）を引き継ぐ
		for pid: Variant in _plant_ids:
			var holder: String = "garden.pot"
			if _holder_of.is_valid():
				var h: Variant = _holder_of.call(str(pid))
				if h is String and h != "":
					holder = h
			if not used.has(str(pid)) and holder == item_id:
				return str(pid)
	var id: String = ""
	while true:
		id = "p%d" % seq
		seq += 1
		if not used.has(id) and not _plant_ids.has(id):
			break
	return id


## 置けるか（収納数も数える）。ignore_id が空でなければ「その配置を動かす」判定
func check(area: String, cand: Dictionary, ignore_id: String = "") -> Dictionary:
	var o: Dictionary = {"ignore_id": ignore_id}
	if ignore_id == "":
		o["stored"] = stored(str(cand["itemId"]), str(cand.get("variant", "default")))
	return Placement.can_place(area, state[area], cand, o)


func place(area: String, cand: Dictionary) -> Dictionary:
	var snap: Dictionary = state.duplicate(true)
	var variant: String = str(cand.get("variant", "default"))
	if variant == "":
		variant = "default"
	var c2: Dictionary = cand.duplicate()
	c2["variant"] = variant
	var r: Dictionary = check(area, c2)
	if not bool(r["ok"]):
		return r
	var c: Dictionary = Catalog.item(str(cand["itemId"]))
	var p: Dictionary = {
		"instanceId": _new_id(str(cand["itemId"])),
		"itemId": str(cand["itemId"]),
		"x": int(cand["x"]),
		"y": int(cand["y"]),
		"rotation": Placement.norm_rot(cand.get("rotation", 0)),
		"variant": variant,
		"layer": str(c.get("layer", "furniture")),
	}
	(state[area] as Array).append(p)
	r["p"] = p
	_push_history(snap)
	return r


## to = {x, y, rotation?, area?}
func move(id: String, to: Dictionary) -> Dictionary:
	var f: Dictionary = find(id)
	if f.is_empty():
		return {"ok": false, "reason": "その家具は見つかりません", "cells": [], "bad": []}
	var p: Dictionary = f["p"]
	var rot: int = Placement.norm_rot(to.get("rotation", p.get("rotation", 0)))
	var cand: Dictionary = {"itemId": p["itemId"], "x": int(to["x"]), "y": int(to["y"]), "rotation": rot, "variant": p.get("variant", "default")}
	var area: String = str(to.get("area", f["area"]))
	var snap: Dictionary = state.duplicate(true)
	if area != str(f["area"]):
		var r1: Dictionary = Placement.can_place(area, state[area], cand, {})
		if not bool(r1["ok"]):
			return r1
		(state[f["area"]] as Array).remove_at(int(f["i"]))
		var np: Dictionary = p.duplicate(true)
		np["x"] = cand["x"]
		np["y"] = cand["y"]
		np["rotation"] = rot
		(state[area] as Array).append(np)
		r1["p"] = np
		_push_history(snap)
		return r1
	var r: Dictionary = Placement.can_place(area, state[area], cand, {"ignore_id": id})
	if not bool(r["ok"]):
		return r
	p["x"] = cand["x"]
	p["y"] = cand["y"]
	p["rotation"] = rot
	r["p"] = p
	_push_history(snap)
	return r


## 次に回せる向きへ回す（その場で回せる向きが無ければ理由を返す）
func rotate(id: String) -> Dictionary:
	var f: Dictionary = find(id)
	if f.is_empty():
		return {"ok": false, "reason": "その家具は見つかりません", "cells": [], "bad": []}
	var p: Dictionary = f["p"]
	var c: Dictionary = Catalog.item(str(p["itemId"]))
	var rots: Array = c.get("rots", [0])
	if rots.size() < 2:
		return {"ok": false, "reason": "%sは回せません" % c.get("name", ""), "cells": [], "bad": []}
	var k: int = rots.find(Placement.norm_rot(p.get("rotation", 0)))
	var first: Dictionary = {}
	for s in range(1, rots.size()):
		var rot: int = int(rots[(k + s) % rots.size()])
		var cand: Dictionary = {"itemId": p["itemId"], "x": p["x"], "y": p["y"], "rotation": rot, "variant": p.get("variant", "default")}
		var r: Dictionary = Placement.can_place(str(f["area"]), state[f["area"]], cand, {"ignore_id": id})
		if bool(r["ok"]):
			return move(id, {"x": p["x"], "y": p["y"], "rotation": rot})
		if first.is_empty():
			first = r
	return {"ok": false, "reason": "回せません：" + str(first.get("reason", "")), "cells": first.get("cells", []), "bad": first.get("bad", [])}


func store(id: String) -> Dictionary:
	var f: Dictionary = find(id)
	if f.is_empty():
		return {"ok": false, "reason": "その家具は見つかりません"}
	var snap: Dictionary = state.duplicate(true)
	(state[f["area"]] as Array).remove_at(int(f["i"]))
	_push_history(snap)
	return {"ok": true, "reason": "", "p": f["p"]}


func undo() -> bool:
	if _past.is_empty():
		return false
	_future.append(state.duplicate(true))
	state = _past.pop_back()
	return true


func redo() -> bool:
	if _future.is_empty():
		return false
	_past.append(state.duplicate(true))
	state = _future.pop_back()
	return true


func result() -> Dictionary:
	return state.duplicate(true)
