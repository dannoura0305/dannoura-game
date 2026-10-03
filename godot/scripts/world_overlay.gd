extends Node2D
## 盤面の上に重ねる目印：マス目・選択枠・プレビュー枠・置けないマスの ✕・使う位置
## home.gd が値を入れて queue_redraw() する。座標はワールド（1 マス 32px、床の原点は y=band）。

const T := 32

var band: int = 64
var cols: int = 12
var rows: int = 8
var show_grid: bool = false
var sel_rect: Rect2 = Rect2()
var has_sel: bool = false
var ghost_rect: Rect2 = Rect2()
var has_ghost: bool = false
var ghost_ok: bool = true
var bad_rects: Array = []     # Rect2
var marks: Array = []         # Rect2


func clear() -> void:
	has_sel = false
	has_ghost = false
	bad_rects = []
	marks = []
	queue_redraw()


func _draw() -> void:
	if show_grid:
		var gc := Color(1, 1, 1, 0.13)
		for x in range(1, cols):
			draw_line(Vector2(x * T + 0.5, band), Vector2(x * T + 0.5, band + rows * T), gc, 1.0)
		for y in range(1, rows):
			draw_line(Vector2(0, band + y * T + 0.5), Vector2(cols * T, band + y * T + 0.5), gc, 1.0)
	for mv: Variant in marks:
		var mr: Rect2 = mv
		_dashed_rect(mr.grow(-3), Color("#ffe680"), 2.0, 4.0)
	if has_sel:
		_dashed_rect(sel_rect.grow(-1), Color("#00e8c8"), 2.0, 5.0)
	if has_ghost:
		if ghost_ok:
			draw_rect(ghost_rect, Color(0.49, 1.0, 0.69, 0.18), true)
			draw_rect(ghost_rect.grow(-1), Color("#7dffb0"), false, 2.0)
		else:
			_dashed_rect(ghost_rect.grow(-1), Color("#ff4060"), 2.0, 4.0)
			for bv: Variant in bad_rects:
				var br: Rect2 = bv
				_cross(br)


func _dashed_rect(r: Rect2, c: Color, width: float, dash: float) -> void:
	var a := r.position
	var b := Vector2(r.end.x, r.position.y)
	var cc := r.end
	var d := Vector2(r.position.x, r.end.y)
	draw_dashed_line(a, b, c, width, dash)
	draw_dashed_line(b, cc, c, width, dash)
	draw_dashed_line(cc, d, c, width, dash)
	draw_dashed_line(d, a, c, width, dash)


## 置けないマス：赤い面に白と赤の ✕（色だけに頼らず形でも伝える）
func _cross(r: Rect2) -> void:
	draw_rect(r, Color(0.86, 0.16, 0.24, 0.35), true)
	var p := r.position
	var s := r.size
	var m := 5.0
	draw_line(p + Vector2(m, m), p + s - Vector2(m, m), Color.WHITE, 3.2)
	draw_line(p + Vector2(s.x - m, m), p + Vector2(m, s.y - m), Color.WHITE, 3.2)
	draw_line(p + Vector2(m, m), p + s - Vector2(m, m), Color("#d0203a"), 1.6)
	draw_line(p + Vector2(s.x - m, m), p + Vector2(m, s.y - m), Color("#d0203a"), 1.6)
	draw_rect(r.grow(-1), Color("#d0203a"), false, 2.0)
