extends RefCounted
## 画面のテーマ（参考画像の雰囲気：濃紺のパネルに金の縁、主ボタンは金色、選択はシアンの光）
## 既製の素材は使わず StyleBoxFlat だけで作る。

const FONT_PATH := "res://assets/fonts/DotGothic16-Regular.ttf"

const NAVY := Color("#0e1430")
const NAVY_2 := Color("#18214a")
const NAVY_3 := Color("#222d5e")
const GOLD := Color("#d4ac55")
const GOLD_HI := Color("#ffe08a")
const GOLD_BTN := Color("#f2c14e")
const GOLD_BTN_HI := Color("#ffd86e")
const GOLD_BTN_LO := Color("#c9922c")
const INK := Color("#2a1c10")
const TEXT := Color("#f4ecd8")
const TEXT_DIM := Color("#8f8aa8")
const CYAN := Color("#38e8d0")
const DANGER := Color("#ff6a7e")
const OK_GREEN := Color("#7dffb0")


static func load_font() -> Font:
	if ResourceLoader.exists(FONT_PATH):
		var f: Font = load(FONT_PATH) as Font
		if f != null:
			return f
	if FileAccess.file_exists(FONT_PATH):
		var ff := FontFile.new()
		if ff.load_dynamic_font(FONT_PATH) == OK:
			return ff
	return null


static func box(bg: Color, border: Color, border_w: int = 2, radius: int = 10, margin: int = 8) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(border_w)
	sb.set_corner_radius_all(radius)
	sb.set_content_margin_all(margin)
	sb.anti_aliasing = false
	return sb


static func build() -> Theme:
	var th := Theme.new()
	var font: Font = load_font()
	if font != null:
		th.default_font = font
	th.default_font_size = 22

	# パネル（濃紺＋金の縁＋影）
	var panel: StyleBoxFlat = box(Color(NAVY, 0.94), GOLD, 2, 14, 12)
	panel.shadow_color = Color(0, 0, 0, 0.45)
	panel.shadow_size = 6
	th.set_stylebox("panel", "PanelContainer", panel)
	th.set_stylebox("panel", "Panel", panel)

	# ふつうのボタン
	var normal: StyleBoxFlat = box(NAVY_2, GOLD, 2, 10, 6)
	var hover: StyleBoxFlat = box(NAVY_3, GOLD_HI, 2, 10, 6)
	var pressed: StyleBoxFlat = box(Color("#1b3a5a"), CYAN, 3, 10, 6)
	pressed.shadow_color = Color(CYAN, 0.35)
	pressed.shadow_size = 4
	var disabled: StyleBoxFlat = box(Color(NAVY, 0.7), Color(GOLD, 0.3), 2, 10, 6)
	var focus: StyleBoxFlat = box(Color(0, 0, 0, 0), GOLD_HI, 2, 10, 6)
	focus.draw_center = false
	for st: String in ["normal", "hover", "pressed", "disabled", "focus", "hover_pressed"]:
		var s: StyleBox = normal
		match st:
			"hover":
				s = hover
			"pressed", "hover_pressed":
				s = pressed
			"disabled":
				s = disabled
			"focus":
				s = focus
		th.set_stylebox(st, "Button", s)
	th.set_color("font_color", "Button", TEXT)
	th.set_color("font_hover_color", "Button", GOLD_HI)
	th.set_color("font_pressed_color", "Button", Color.WHITE)
	th.set_color("font_hover_pressed_color", "Button", Color.WHITE)
	th.set_color("font_focus_color", "Button", TEXT)
	th.set_color("font_disabled_color", "Button", TEXT_DIM)
	th.set_color("icon_disabled_color", "Button", Color(1, 1, 1, 0.35))
	th.set_constant("h_separation", "Button", 6)

	# 主ボタン（金色）
	th.set_type_variation("PrimaryButton", "Button")
	var p_normal: StyleBoxFlat = box(GOLD_BTN, Color("#fff2c0"), 3, 14, 8)
	p_normal.border_width_bottom = 5
	p_normal.border_color = GOLD_BTN_LO
	p_normal.shadow_color = Color(1.0, 0.8, 0.3, 0.35)
	p_normal.shadow_size = 6
	var p_hover: StyleBoxFlat = p_normal.duplicate() as StyleBoxFlat
	p_hover.bg_color = GOLD_BTN_HI
	var p_pressed: StyleBoxFlat = p_normal.duplicate() as StyleBoxFlat
	p_pressed.bg_color = GOLD_BTN_LO
	p_pressed.border_width_bottom = 3
	var p_disabled: StyleBoxFlat = box(Color("#6b5a34"), Color("#8a7444"), 2, 14, 8)
	th.set_stylebox("normal", "PrimaryButton", p_normal)
	th.set_stylebox("hover", "PrimaryButton", p_hover)
	th.set_stylebox("pressed", "PrimaryButton", p_pressed)
	th.set_stylebox("hover_pressed", "PrimaryButton", p_pressed)
	th.set_stylebox("disabled", "PrimaryButton", p_disabled)
	th.set_stylebox("focus", "PrimaryButton", focus)
	th.set_color("font_color", "PrimaryButton", INK)
	th.set_color("font_hover_color", "PrimaryButton", INK)
	th.set_color("font_pressed_color", "PrimaryButton", INK)
	th.set_color("font_hover_pressed_color", "PrimaryButton", INK)
	th.set_color("font_focus_color", "PrimaryButton", INK)
	th.set_color("font_disabled_color", "PrimaryButton", Color("#c8b88a"))
	th.set_font_size("font_size", "PrimaryButton", 26)

	# 危ない操作（破棄）
	th.set_type_variation("DangerButton", "Button")
	th.set_stylebox("normal", "DangerButton", box(Color("#3a1830"), DANGER, 2, 10, 6))
	th.set_stylebox("hover", "DangerButton", box(Color("#4a2040"), Color("#ff9aaa"), 2, 10, 6))
	th.set_stylebox("pressed", "DangerButton", box(Color("#5a2040"), Color.WHITE, 3, 10, 6))
	th.set_color("font_color", "DangerButton", Color("#ffd0d8"))

	# 見出し
	th.set_type_variation("TitleLabel", "Label")
	th.set_font_size("font_size", "TitleLabel", 32)
	th.set_color("font_color", "TitleLabel", GOLD_HI)
	th.set_color("font_shadow_color", "TitleLabel", Color(0, 0, 0, 0.6))
	th.set_constant("shadow_offset_x", "TitleLabel", 2)
	th.set_constant("shadow_offset_y", "TitleLabel", 2)
	th.set_color("font_color", "Label", TEXT)

	# 案内文（理由の表示）
	th.set_type_variation("InfoLabel", "Label")
	th.set_font_size("font_size", "InfoLabel", 20)
	th.set_color("font_color", "InfoLabel", TEXT)
	return th
