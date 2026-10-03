extends RefCounted
## Web 版から書き出したデータ（data/*.json）を読む。
## class_name を使わず preload で参照する（`godot --headless -s` でもクラスキャッシュ無しで動くように）。
##
## JSON の数値は Godot では float になるため、整数値はすべて int に直してから使う
## （Array.has(90) と 90.0 は一致しないため）。

const CATALOG_PATH := "res://data/catalog.json"
const SPRITES_PATH := "res://data/sprites.json"
const DEFAULT_HOME_PATH := "res://data/default_home.json"

static var _catalog: Dictionary = {}
static var _sprites: Dictionary = {}


## JSON ファイルを読む。失敗したら null。
static func read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("JSON が見つかりません: %s" % path)
		return null
	var text: String = FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if parsed == null:
		push_error("JSON を読めません: %s" % path)
	return parsed


## 整数値の float を int に直す（配列・辞書は中まで）。
static func ints(v: Variant) -> Variant:
	if v is float:
		var f: float = v
		if is_finite(f) and f == floorf(f) and absf(f) < 9.0e15:
			return int(f)
		return f
	if v is Array:
		var out: Array = []
		for e: Variant in v:
			out.append(ints(e))
		return out
	if v is Dictionary:
		var d: Dictionary = {}
		for k: Variant in v:
			d[k] = ints(v[k])
		return d
	return v


static func catalog() -> Dictionary:
	if _catalog.is_empty():
		var parsed: Variant = read_json(CATALOG_PATH)
		if parsed is Dictionary:
			_catalog = ints(parsed)
	return _catalog


static func sprites() -> Dictionary:
	if _sprites.is_empty():
		var parsed: Variant = read_json(SPRITES_PATH)
		if parsed is Dictionary:
			_sprites = ints(parsed)
	return _sprites


static func default_home() -> Dictionary:
	var parsed: Variant = read_json(DEFAULT_HOME_PATH)
	if parsed is Dictionary:
		return ints(parsed)
	return {}


static func items() -> Dictionary:
	var d: Variant = catalog().get("items", {})
	return d if d is Dictionary else {}


## アイテム定義（無ければ空の辞書）
static func item(item_id: String) -> Dictionary:
	var d: Variant = items().get(item_id, {})
	return d if d is Dictionary else {}


## 部屋・庭の定義 {name, w, h, door, gate?, exits}
static func area(area_id: String) -> Dictionary:
	var areas: Variant = catalog().get("areas", {})
	if areas is Dictionary:
		var d: Variant = areas.get(area_id, {})
		if d is Dictionary:
			return d
	return {}


static func item_name(item_id: String) -> String:
	var c: Dictionary = item(item_id)
	return str(c.get("name", "？？？")) if not c.is_empty() else "？？？"


## 鉢の色などの表示名つき（例：鉢植え（赤い鉢））
static func display_name(item_id: String, variant: String) -> String:
	var c: Dictionary = item(item_id)
	if c.is_empty():
		return "？？？"
	var colors: Variant = catalog().get("pot_colors", {})
	if item_id == "garden.pot" and colors is Dictionary and colors.has(variant):
		return "%s（%sい鉢）" % [c["name"], colors[variant]]
	return str(c["name"])
