# 利用者の敵の絵（緑の地）から 14 枚を切り出し、1 枚の絵（assets/runner/foes.webp）と位置の表（foes.json）にする
#  python3 -I tools/runner_cut_foes.py <絵のフォルダ（new0〜2.webp）> assets/runner <見本.png>（Pillow・numpy が要る）
import sys, os, json
import numpy as np
from PIL import Image
from collections import deque
SRC, OUT, SHEET = sys.argv[1:4]
# 名前, 絵, 残す塊の範囲（この中に中心がある塊だけ）, 高さ（ゲームの px。2 倍で保存）
ITEMS = [
    ('hopper', 'new0', (40, 150, 620, 530), 40), ('spout', 'new0', (856, 110, 1250, 510), 46, (872, 0, 9999, 9999)),
    ('gomi', 'new0', (90, 670, 530, 1115), 42), ('gomi_s', 'new0', (15, 1000, 140, 1130), 22), ('koi', 'new0', (690, 610, 1165, 1165), 60, (0, 0, 9999, 1052)),
    ('crawler', 'new1', (50, 180, 570, 545), 32), ('shield', 'new1', (675, 95, 1215, 560), 62),
    ('nezumi', 'new1', (65, 760, 570, 1145), 34), ('pachi', 'new1', (705, 760, 1165, 1105), 44),
    ('thrower', 'new2', (75, 90, 605, 556), 58), ('kite', 'new2', (690, 25, 1265, 565), 58),
    ('tsumuji', 'new2', (60, 645, 590, 1162), 62), ('karasu_fly', 'new2', (675, 705, 1000, 1132), 46), ('karasu', 'new2', (965, 625, 1268, 922), 40),
]
cache = {}
def load(n):
    if n in cache: return cache[n]
    a = np.asarray(Image.open(os.path.join(SRC, n + '.webp')).convert('RGB')).astype(np.float64)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = g - np.maximum(r, b)
    alpha = np.clip((90 - k) / 70, 0, 1)                  # 緑が強いほど透明（縁は半透明）
    fg = alpha > .5
    H, W = fg.shape; lab = np.zeros((H, W), int); cur = 0; info = {}
    m = fg.copy()
    for _ in range(3):
        n2 = m.copy(); n2[1:] |= m[:-1]; n2[:-1] |= m[1:]; n2[:, 1:] |= m[:, :-1]; n2[:, :-1] |= m[:, 1:]; m = n2
    for y in range(H):
        for x in np.nonzero(m[y] & (lab[y] == 0))[0]:
            if lab[y, x]: continue
            cur += 1; q = deque([(y, x)]); lab[y, x] = cur; sx = sy = c = 0
            while q:
                cy, cx = q.popleft(); sx += cx; sy += cy; c += 1
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = cur; q.append((ny, nx))
            info[cur] = (sx / c, sy / c, c)
    # 緑のにじみを消す（緑を 赤と青の大きい方に寄せる）
    rgb = a.copy(); spill = k > 0; rgb[..., 1] = np.where(spill, np.maximum(r, b) + np.clip(k, 0, 12) * .3, g)
    cache[n] = (rgb, alpha, lab, info); return cache[n]
made = {}; imgs = []
for it in ITEMS:
    name, src, (x0, y0, x1, y1), hgt = it[:4]; clip = it[4] if len(it) > 4 else None
    rgb, alpha, lab, info = load(src)
    keep = [l for l, (cx, cy, c) in info.items() if x0 <= cx <= x1 and y0 <= cy <= y1 and c > 200]
    sel = np.isin(lab, keep)
    al = np.where(sel, alpha, 0)
    if clip: yy, xx = np.mgrid[0:al.shape[0], 0:al.shape[1]]; al = np.where((xx >= clip[0]) & (xx < clip[2]) & (yy >= clip[1]) & (yy < clip[3]), al, 0)   # 弾・しぶきを外す
    ys, xs = np.nonzero(al > .05); bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([rgb[by0:by1, bx0:bx1], al[by0:by1, bx0:bx1] * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA'); s = hgt * 2 / im.height
    im = im.resize((max(1, round(im.width * s)), hgt * 2), Image.LANCZOS)
    imgs.append((name, im))
# 横に並べて 1 枚に（行の幅 1024 まで）
pad = 2; x = y = rowh = 0; pos = {}
for name, im in imgs:
    if x + im.width > 1024: x = 0; y += rowh + pad; rowh = 0
    pos[name] = (x, y, im.width, im.height); x += im.width + pad; rowh = max(rowh, im.height)
atlas = Image.new('RGBA', (1024, y + rowh), (0, 0, 0, 0))
for name, im in imgs: atlas.paste(im, pos[name][:2])
atlas.save(os.path.join(OUT, 'foes.webp'), 'WEBP', quality=90, method=6)
json.dump({'image': 'foes.webp', 'scale': 0.5, 'frames': {n: list(p) for n, p in pos.items()}}, open(os.path.join(OUT, 'foes.json'), 'w'), indent=0)
sh = Image.new('RGBA', atlas.size, (40, 30, 70, 255)); sh.alpha_composite(atlas); sh.convert('RGB').save(SHEET)
print(atlas.size, os.path.getsize(os.path.join(OUT, 'foes.webp')))
