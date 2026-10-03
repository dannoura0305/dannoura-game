extends RefCounted
## data/sprites.json（tools/export_sprites.mjs が書き出す）から PNG とずれ（ox, oy）を引く。
##
## 位置合わせ：PNG の左上 = 足元範囲の左上（ピクセル）+ Vector2(ox, oy)
##   アイテム … 回転後の占有 w×h マスの左上。壁掛けは y=0 行の左上。
##   人物     … 立っているマスの左上。娘の sleep は布団の左上。
## ComfyUI などで描き直した PNG に差し替えるときは、同じファイル名にして sprites.json の ox / oy / w / h を合わせる。

const Catalog := preload("res://scripts/catalog.gd")

const BASE_DIR := "res://assets/sprites/"

static var _tex_cache: Dictionary = {}
static var _placeholder: Texture2D = null


## PNG を読む。インポート済みなら load()、まだなら（エディタで一度も開いていないなど）Image から作る
static func tex(file: String) -> Texture2D:
	if file == "":
		return placeholder()
	if _tex_cache.has(file):
		return _tex_cache[file]
	var path: String = BASE_DIR + file
	var t: Texture2D = null
	if ResourceLoader.exists(path):
		t = load(path) as Texture2D
	if t == null and FileAccess.file_exists(path):
		var img := Image.load_from_file(path)
		if img != null and not img.is_empty():
			t = ImageTexture.create_from_image(img)
	if t == null:
		push_warning("画像がありません: %s" % path)
		t = placeholder()
	_tex_cache[file] = t
	return t


## 見つからないときの「？」代わり（紫の四角）
static func placeholder() -> Texture2D:
	if _placeholder == null:
		var img := Image.create_empty(32, 32, false, Image.FORMAT_RGBA8)
		img.fill(Color(0.55, 0.37, 0.8, 0.85))
		for i in range(32):
			img.set_pixel(i, 0, Color(0.1, 0.07, 0.15))
			img.set_pixel(i, 31, Color(0.1, 0.07, 0.15))
			img.set_pixel(0, i, Color(0.1, 0.07, 0.15))
			img.set_pixel(31, i, Color(0.1, 0.07, 0.15))
		_placeholder = ImageTexture.create_from_image(img)
	return _placeholder


static func _section(name: String) -> Dictionary:
	var d: Variant = Catalog.sprites().get(name, {})
	return d if d is Dictionary else {}


## アイテムの絵 {file, fw, fh, ox, oy, w, h}。lit / frame1 が無ければふつうの絵、色違いが無ければ最初の色
static func item(item_id: String, rotation: int, variant: String, lit: bool = false, frame: int = 0) -> Dictionary:
	var e: Variant = _section("items").get(item_id)
	if not (e is Dictionary):
		return {}
	var sp: Dictionary = e.get("sprites", {})
	var base: String = "r%d_%s" % [rotation, variant]
	var keys: Array = []
	if lit:
		keys.append(base + "_lit")
	if frame % 2 == 1:
		keys.append(base + "_f1")
	keys.append(base)
	keys.append("r%d_default" % rotation)
	for k: Variant in keys:
		if sp.has(k):
			return sp[k]
	for k: Variant in sp:
		if str(k).begins_with("r%d_" % rotation):
			return sp[k]
	return {}


## 人物の絵 {file, ox, oy, w, h}。そのコマが無ければ 0 コマ目、さらに stand
static func char_frame(who: String, dir: String, pose: String, frame: int) -> Dictionary:
	var e: Variant = _section("chars").get(who)
	if not (e is Dictionary):
		return {}
	for k: String in ["%s_%s_%d" % [dir, pose, frame], "%s_%s_0" % [dir, pose], "%s_stand_0" % dir, "down_stand_0"]:
		if (e as Dictionary).has(k):
			return e[k]
	return {}


static func has_char(who: String) -> bool:
	return _section("chars").get(who) is Dictionary


static func icon(item_id: String, variant: String) -> Texture2D:
	var icons: Dictionary = _section("icons")
	var e: Variant = icons.get(item_id + "|" + variant, icons.get(item_id + "|default"))
	if e is Dictionary:
		return tex(str(e["file"]))
	return placeholder()


static func ui(name: String) -> Texture2D:
	var e: Variant = _section("ui").get(name)
	if e is Dictionary:
		return tex(str(e["file"]))
	return null


## 背景 key: "room_day" "room_night" "garden_day" "garden_night" "wall_room_day" …
static func bg(key: String) -> Dictionary:
	var e: Variant = _section("bg").get(key)
	return e if e is Dictionary else {}
