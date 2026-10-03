extends RefCounted
## main/home/placement.js の移植（純ロジック。ノード・描画に依存しない）
##
##   footprint(item_id, rotation)               -> Vector2i(w, h)
##   cells_of(p)                                -> Array[Vector2i]
##   reachable(area, placements)                -> {ok, reason, cells}
##   can_place(area, placements, cand, opts)    -> {ok, reason, cells, bad}
##   use_cell(area, placements, p)              -> Vector2i or null
##   can_use(area, placements, p)               -> {ok, reason, cell}
##   nearest_free(area, placements, x, y, avoid) -> Vector2i
##
## 配置 P は Web 版と同じ辞書：{instanceId, itemId, x, y, rotation, variant, layer}
## 理由（reason）の日本語は Web 版と同じ文言にしてある。

const Catalog := preload("res://scripts/catalog.gd")

const LAYER_NAME := {"furniture": "家具", "rug": "ラグ", "path": "飛び石", "wall": "壁の飾り"}
const DIRS4 := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]


static func norm_rot(r: Variant) -> int:
	var v: int = 0
	if r is int or r is float:
		v = roundi(float(r))
	return ((v % 360) + 360) % 360


static func footprint(item_id: String, rotation: Variant) -> Vector2i:
	var c: Dictionary = Catalog.item(item_id)
	if c.is_empty():
		return Vector2i(1, 1)
	var w: int = int(c.get("w", 1))
	var h: int = int(c.get("h", 1))
	var r: int = norm_rot(rotation)
	if r == 90 or r == 270:
		return Vector2i(h, w)
	return Vector2i(w, h)


static func cells_of(p: Dictionary) -> Array:
	var f: Vector2i = footprint(str(p.get("itemId", "")), p.get("rotation", 0))
	var px: int = int(p.get("x", 0))
	var py: int = int(p.get("y", 0))
	var out: Array = []
	for j in range(f.y):
		for i in range(f.x):
			out.append(Vector2i(px + i, py + j))
	return out


static func layer_of(p: Dictionary) -> String:
	var c: Dictionary = Catalog.item(str(p.get("itemId", "")))
	if not c.is_empty():
		return str(c.get("layer", "furniture"))
	return str(p.get("layer", "furniture"))


static func in_b(a: Dictionary, x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < int(a["w"]) and y < int(a["h"])


static func is_exit(a: Dictionary, x: int, y: int) -> bool:
	for e: Variant in a.get("exits", []):
		if int(e["x"]) == x and int(e["y"]) == y:
			return true
	return false


static func is_exit_in(area: String, x: int, y: int) -> bool:
	var a: Dictionary = Catalog.area(area)
	return not a.is_empty() and is_exit(a, x, y)


## solid な家具が占めるマスを 1 にした格子（w*h）。ignore_id の配置は除く。
static func solid_grid(a: Dictionary, placements: Array, ignore_id: String = "") -> PackedByteArray:
	var w: int = int(a["w"])
	var h: int = int(a["h"])
	var g := PackedByteArray()
	g.resize(w * h)
	g.fill(0)
	for pv: Variant in placements:
		if not (pv is Dictionary):
			continue
		var p: Dictionary = pv
		if ignore_id != "" and str(p.get("instanceId", "")) == ignore_id:
			continue
		var c: Dictionary = Catalog.item(str(p.get("itemId", "")))
		if c.is_empty() or not bool(c.get("solid", false)) or str(c.get("layer", "")) != "furniture":
			continue
		for qv: Variant in cells_of(p):
			var q: Vector2i = qv
			if in_b(a, q.x, q.y):
				g[q.y * w + q.x] = 1
	return g


## start から 4 近傍で歩けるマス（solid でない）を 1 にした格子
static func bfs(a: Dictionary, solid: PackedByteArray, start: Variant) -> PackedByteArray:
	var w: int = int(a["w"])
	var h: int = int(a["h"])
	var seen := PackedByteArray()
	seen.resize(w * h)
	seen.fill(0)
	if not (start is Vector2i):
		return seen
	var s: Vector2i = start
	if not in_b(a, s.x, s.y) or solid[s.y * w + s.x] != 0:
		return seen
	var queue := PackedInt32Array([s.y * w + s.x])
	seen[queue[0]] = 1
	var head: int = 0
	while head < queue.size():
		var k: int = queue[head]
		head += 1
		var x: int = k % w
		var y: int = k / w
		for dv: Variant in DIRS4:
			var d: Vector2i = dv
			var nx: int = x + d.x
			var ny: int = y + d.y
			if not in_b(a, nx, ny):
				continue
			var nk: int = ny * w + nx
			if seen[nk] != 0 or solid[nk] != 0:
				continue
			seen[nk] = 1
			queue.append(nk)
	return seen


static func _vec(d: Variant) -> Variant:
	if d is Dictionary and d.has("x") and d.has("y"):
		return Vector2i(int(d["x"]), int(d["y"]))
	return null


static func _res(ok: bool, reason: String = "", cells: Array = [], bad: Array = []) -> Dictionary:
	return {"ok": ok, "reason": reason, "cells": cells, "bad": bad}


## 出入口が空いていて、部屋は戸口からすべての空きマスへ、庭は戸口から門へ歩けるか
static func reachable(area: String, placements: Array) -> Dictionary:
	var a: Dictionary = Catalog.area(area)
	if a.is_empty():
		return {"ok": false, "reason": "場所が不明です", "cells": []}
	var w: int = int(a["w"])
	var solid: PackedByteArray = solid_grid(a, placements)
	var blocked: Array = []
	for e: Variant in a.get("exits", []):
		var ev: Vector2i = Vector2i(int(e["x"]), int(e["y"]))
		if solid[ev.y * w + ev.x] != 0:
			blocked.append(ev)
	if not blocked.is_empty():
		var why: String = "出入口がふさがってしまいます" if area == "room" else "戸口か門がふさがってしまいます"
		return {"ok": false, "reason": why, "cells": blocked}
	var seen: PackedByteArray = bfs(a, solid, _vec(a.get("door")))
	if area == "garden":
		var g: Variant = _vec(a.get("gate"))
		if g is Vector2i:
			var gv: Vector2i = g
			if seen[gv.y * w + gv.x] == 0:
				return {"ok": false, "reason": "家の戸口から門まで通れなくなります", "cells": [gv]}
		return {"ok": true, "reason": "", "cells": []}
	var lost: Array = []
	for y in range(int(a["h"])):
		for x in range(w):
			var k: int = y * w + x
			if solid[k] == 0 and seen[k] == 0:
				lost.append(Vector2i(x, y))
	if not lost.is_empty():
		return {"ok": false, "reason": "通れない場所（行き止まり）ができてしまいます", "cells": lost}
	return {"ok": true, "reason": "", "cells": []}


## 置けるか？ cand = {itemId, x, y, rotation, variant}
## opts = {ignore_id: String, stored: int（数えるときだけ）, skip_reach: bool}
static func can_place(area: String, placements: Array, cand: Dictionary, opts: Dictionary = {}) -> Dictionary:
	var item_id: String = str(cand.get("itemId", ""))
	var c: Dictionary = Catalog.item(item_id)
	if c.is_empty():
		return _res(false, "知らないアイテムです")
	var cname: String = str(c["name"])
	if str(c.get("kind", "")) == "seed":
		return _res(false, "%sは置けません（空の鉢かプランターに植えます）" % cname)
	var a: Dictionary = Catalog.area(area)
	if a.is_empty():
		return _res(false, "場所が不明です")
	var areas: Array = c.get("areas", [])
	if not areas.has(area):
		var names := PackedStringArray()
		for ar: Variant in areas:
			names.append(str(Catalog.area(str(ar)).get("name", ar)))
		return _res(false, "%sは%sには置けません（%sだけ）" % [cname, a["name"], "・".join(names)])
	var rot: int = norm_rot(cand.get("rotation", 0))
	var rots: Array = c.get("rots", [0])
	if not rots.has(rot):
		return _res(false, "%sはその向きにできません" % cname)
	if opts.has("stored") and int(opts["stored"]) <= 0:
		return _res(false, "収納に%sが残っていません" % cname)
	if not (cand.get("x") is int) or not (cand.get("y") is int):
		return _res(false, "置く場所を選んでください")
	var p: Dictionary = {"itemId": item_id, "x": int(cand["x"]), "y": int(cand["y"]), "rotation": rot}
	var cells: Array = cells_of(p)
	var outside: Array = []
	var inside_count: int = 0
	for qv: Variant in cells:
		var q: Vector2i = qv
		if in_b(a, q.x, q.y):
			inside_count += 1
		else:
			outside.append(q)
	if not outside.is_empty():
		return _res(false, "%sからはみ出しています" % a["name"], cells, outside if inside_count > 0 else [])
	var layer: String = str(c.get("layer", "furniture"))
	if layer == "wall":
		var not_top: Array = []
		for qv: Variant in cells:
			var q: Vector2i = qv
			if q.y != 0:
				not_top.append(q)
		if area != "room" or not not_top.is_empty():
			return _res(false, "%sは壁（いちばん奥の列）にしか掛けられません" % cname, cells, not_top)
	elif bool(c.get("wallOnly", false)):
		return _res(false, "%sは壁にしか掛けられません" % cname, cells, cells)
	# 同じレイヤー同士の重なり
	var ignore_id: String = str(opts.get("ignore_id", ""))
	var occ: Dictionary = {}
	for qv2: Variant in placements:
		if not (qv2 is Dictionary):
			continue
		var other: Dictionary = qv2
		if ignore_id != "" and str(other.get("instanceId", "")) == ignore_id:
			continue
		if layer_of(other) != layer:
			continue
		for cv: Variant in cells_of(other):
			occ[cv] = other
	var hit: Array = []
	for qv: Variant in cells:
		if occ.has(qv):
			hit.append(qv)
	if not hit.is_empty():
		var o: Dictionary = occ[hit[0]]
		var oc: Dictionary = Catalog.item(str(o.get("itemId", "")))
		var oname: String = str(oc["name"]) if not oc.is_empty() else "ほかの" + str(LAYER_NAME.get(layer, ""))
		return _res(false, "%sと重なっています" % oname, cells, hit)
	# 出入口は常に空ける（furniture レイヤー）
	if layer == "furniture":
		var ex: Array = []
		for qv: Variant in cells:
			var q: Vector2i = qv
			if is_exit(a, q.x, q.y):
				ex.append(q)
		if not ex.is_empty():
			var why: String = "出入口をふさいでしまいます" if area == "room" else "戸口・門をふさいでしまいます"
			return _res(false, why, cells, ex)
	if not bool(opts.get("skip_reach", false)) and bool(c.get("solid", false)) and layer == "furniture":
		var next: Array = []
		for qv3: Variant in placements:
			if qv3 is Dictionary and not (ignore_id != "" and str(qv3.get("instanceId", "")) == ignore_id):
				next.append(qv3)
		next.append(p)
		var r: Dictionary = reachable(area, next)
		if not bool(r["ok"]):
			var rc: Array = r["cells"]
			var bad: Array = rc if (not rc.is_empty() and rc.size() <= cells.size() * 3) else cells
			return _res(false, str(r["reason"]), cells, bad)
	return _res(true, "", cells, [])


## 「使う位置」の候補：正面の隣・長辺の横・自分のマス・周りのどこか
static func use_candidates(a: Dictionary, p: Dictionary) -> Array:
	var c: Dictionary = Catalog.item(str(p.get("itemId", "")))
	if c.is_empty():
		return []
	var f: Vector2i = footprint(str(p["itemId"]), p.get("rotation", 0))
	var r: int = norm_rot(p.get("rotation", 0))
	var px: int = int(p["x"])
	var py: int = int(p["y"])
	var out: Array = []
	match str(c.get("use", "none")):
		"self":
			out.append(Vector2i(px, py))
		"wall":
			out.append(Vector2i(px, 0))
			out.append(Vector2i(px, 1))
		"front":
			if r == 0:
				out.append_array(_row(px, f.x, py + f.y))
			elif r == 180:
				out.append_array(_row(px, f.x, py - 1))
			elif r == 90:
				out.append_array(_col(px - 1, py, f.y))
			else:
				out.append_array(_col(px + f.x, py, f.y))
		"side":
			if f.y >= f.x:
				out.append_array(_col(px - 1, py, f.y))
				out.append_array(_col(px + f.x, py, f.y))
			else:
				out.append_array(_row(px, f.x, py - 1))
				out.append_array(_row(px, f.x, py + f.y))
		"near":
			out.append_array(_row(px, f.x, py + f.y))
			out.append_array(_col(px - 1, py, f.y))
			out.append_array(_col(px + f.x, py, f.y))
			out.append_array(_row(px, f.x, py - 1))
		_:
			return []
	var inside: Array = []
	for qv: Variant in out:
		var q: Vector2i = qv
		if in_b(a, q.x, q.y):
			inside.append(q)
	return inside


static func _row(x0: int, w: int, y: int) -> Array:
	var out: Array = []
	for i in range(w):
		out.append(Vector2i(x0 + i, y))
	return out


static func _col(x: int, y0: int, h: int) -> Array:
	var out: Array = []
	for j in range(h):
		out.append(Vector2i(x, y0 + j))
	return out


## 使う位置（Vector2i）。無ければ null
static func use_cell(area: String, placements: Array, p: Dictionary) -> Variant:
	var a: Dictionary = Catalog.area(area)
	if a.is_empty() or p.is_empty():
		return null
	var cands: Array = use_candidates(a, p)
	if cands.is_empty():
		return null
	var c: Dictionary = Catalog.item(str(p["itemId"]))
	if str(c.get("use", "")) == "self":
		return cands[0]
	var w: int = int(a["w"])
	var solid: PackedByteArray = solid_grid(a, placements)
	var seen: PackedByteArray = bfs(a, solid, _vec(a.get("door")))
	for qv: Variant in cands:
		var q: Vector2i = qv
		if solid[q.y * w + q.x] == 0 and seen[q.y * w + q.x] != 0:
			return q
	for qv: Variant in cands:
		var q: Vector2i = qv
		if solid[q.y * w + q.x] == 0:
			return q
	return cands[0]


static func can_use(area: String, placements: Array, p: Dictionary) -> Dictionary:
	var c: Dictionary = Catalog.item(str(p.get("itemId", "")))
	if c.is_empty():
		return {"ok": false, "reason": "知らないアイテムです", "cell": null}
	var cname: String = str(c["name"])
	var use: String = str(c.get("use", "none"))
	if use == "none" or use == "":
		return {"ok": false, "reason": "%sは使うものではありません" % cname, "cell": null}
	var a: Dictionary = Catalog.area(area)
	var cell: Variant = use_cell(area, placements, p)
	if not (cell is Vector2i):
		return {"ok": false, "reason": "%sの使う側が%sの外を向いていて使えません" % [cname, a.get("name", "")], "cell": null}
	if use == "self":
		return {"ok": true, "reason": "", "cell": cell}
	var q: Vector2i = cell
	var w: int = int(a["w"])
	var solid: PackedByteArray = solid_grid(a, placements)
	var where: String = "正面" if use == "front" else ("横" if use == "side" else "まわり")
	if solid[q.y * w + q.x] != 0:
		return {"ok": false, "reason": "%sの%sがふさがっていて使えません" % [cname, where], "cell": cell}
	var seen: PackedByteArray = bfs(a, solid, _vec(a.get("door")))
	if seen[q.y * w + q.x] == 0:
		return {"ok": false, "reason": "%sの%sまで歩いて行けません" % [cname, where], "cell": cell}
	return {"ok": true, "reason": "", "cell": cell}


## (x, y) にいちばん近い solid でないマス（avoid に含むマスは避ける）
static func nearest_free(area: String, placements: Array, x: int, y: int, avoid: Array = []) -> Vector2i:
	var a: Dictionary = Catalog.area(area)
	if a.is_empty():
		return Vector2i.ZERO
	var w: int = int(a["w"])
	var solid: PackedByteArray = solid_grid(a, placements)
	var best: Vector2i = Vector2i.ZERO
	var bd: int = 1 << 30
	for yy in range(int(a["h"])):
		for xx in range(w):
			if solid[yy * w + xx] != 0:
				continue
			if avoid.has(Vector2i(xx, yy)):
				continue
			var d: int = absi(xx - x) + absi(yy - y)
			if d < bd:
				bd = d
				best = Vector2i(xx, yy)
	return best


## 4 近傍の最短経路（start を含まず goal を含む）。行けなければ空
static func find_path(area: String, placements: Array, start: Vector2i, goal: Vector2i) -> Array:
	var a: Dictionary = Catalog.area(area)
	if a.is_empty() or start == goal:
		return []
	var w: int = int(a["w"])
	if not in_b(a, goal.x, goal.y):
		return []
	var solid: PackedByteArray = solid_grid(a, placements)
	if solid[goal.y * w + goal.x] != 0:
		return []
	var prev: Dictionary = {start: start}
	var queue: Array = [start]
	var head: int = 0
	while head < queue.size():
		var cur: Vector2i = queue[head]
		head += 1
		if cur == goal:
			break
		for dv: Variant in DIRS4:
			var d: Vector2i = dv
			var n: Vector2i = cur + d
			if not in_b(a, n.x, n.y) or prev.has(n) or solid[n.y * w + n.x] != 0:
				continue
			prev[n] = cur
			queue.append(n)
	if not prev.has(goal):
		return []
	var path: Array = []
	var c: Vector2i = goal
	while c != start:
		path.push_front(c)
		c = prev[c]
	return path


## ねこの昼寝の場所の候補（placement.js の catSpots を簡略化）：[{cell: Vector2i, kind: String}]
static func cat_spots(area: String, placements: Array, night: bool) -> Array:
	var a: Dictionary = Catalog.area(area)
	if a.is_empty():
		return []
	var w: int = int(a["w"])
	var solid: PackedByteArray = solid_grid(a, placements)
	var out: Array = []
	var seen: Dictionary = {}
	for pv: Variant in placements:
		var p: Dictionary = pv
		var id: String = str(p.get("itemId", ""))
		if id == "furniture.cushion" or id == "deco.rug":
			for qv: Variant in cells_of(p):
				var q: Vector2i = qv
				if in_b(a, q.x, q.y) and not is_exit(a, q.x, q.y) and solid[q.y * w + q.x] == 0 and not seen.has(q):
					seen[q] = true
					out.append({"cell": q, "kind": "cushion" if id == "furniture.cushion" else "rug"})
	if area == "garden" and not night:
		for y in range(3, int(a["h"])):
			for x in range(w):
				var q := Vector2i(x, y)
				if (x * 7 + y * 3) % 5 == 0 and solid[y * w + x] == 0 and not is_exit(a, x, y) and not seen.has(q):
					seen[q] = true
					out.append({"cell": q, "kind": "sun"})
	return out
