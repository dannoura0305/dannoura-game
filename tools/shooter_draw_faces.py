# 設定画の顔に合わせて、取り巻き（拡散アカウント）と応援コメントの顔をドット絵で描く
#  python3 -I tools/shooter_draw_faces.py assets/shooter   （Pillow が要る）
# 36 マスで（なめらかにせず）描き、2 倍にする。縁は外が濃い色・内が明るい色の二重
import sys, os
from PIL import Image, ImageDraw
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
N = 36; S = 2

def ell(d, cx, cy, r, col): d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

def face(d, cx, cy, r, deep, line, light, shade):
    ell(d, cx, cy, r + 2, deep); ell(d, cx, cy, r + 1, line); ell(d, cx, cy, r - .5, shade)
    d.ellipse([cx - r + .5, cy - r + .5, cx + r - 2.5, cy + r - 3], fill=light)
    d.rectangle([cx - r * .55, cy - r * .62, cx - r * .42, cy - r * .5], fill=(255, 255, 255, 255))

def guard(tone):
    im = Image.new('RGBA', (N + 8, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    deep = (110, 10, 30, 255) if tone == 0 else (14, 40, 120, 255)
    line = (232, 48, 70, 255) if tone == 0 else (40, 130, 255, 255)
    light = (252, 236, 240, 255) if tone == 0 else (236, 244, 255, 255)
    shade = (226, 196, 208, 255) if tone == 0 else (196, 214, 240, 255)
    mouth = (232, 60, 80, 255) if tone == 0 else (50, 120, 240, 255)
    ink = (26, 5, 16, 255)
    cx, cy, r = 16, 19, 13
    face(d, cx, cy, r, deep, line, light, shade)
    # にやけた目：上が平らな半目（見下す）
    d.polygon([(7, 15), (14, 16), (13, 19), (8, 18)], fill=ink)
    d.polygon([(18, 16), (25, 15), (24, 18), (19, 19)], fill=ink)
    d.rectangle([9, 17, 10, 17], fill=(255, 255, 255, 255)); d.rectangle([21, 17, 22, 17], fill=(255, 255, 255, 255))
    d.line([(6, 13), (14, 14)], fill=ink, width=1); d.line([(18, 14), (26, 12)], fill=ink, width=1)
    # 片方の口角が上がった笑い（歯が見える）
    d.polygon([(9, 24), (22, 23), (25, 20), (23, 27), (12, 27)], fill=ink)
    d.polygon([(11, 25), (21, 24), (23, 22), (22, 25), (12, 25)], fill=(255, 255, 255, 255))
    d.rectangle([14, 26, 19, 26], fill=mouth)
    # 拡声器（橙）を口元から右へ
    org, org2, org3 = (255, 138, 42, 255), (255, 214, 130, 255), (150, 62, 10, 255)
    d.polygon([(27, 19), (31, 16), (38, 11), (38, 31), (31, 26), (27, 23)], fill=org3)
    d.polygon([(28, 20), (31, 17), (37, 13), (37, 29), (31, 25), (28, 22)], fill=org)
    d.line([(31, 18), (36, 14)], fill=org2, width=1)
    d.rectangle([37, 13, 38, 29], fill=(255, 240, 200, 255))
    d.rectangle([28, 24, 30, 28], fill=org3)
    # 音の線
    for k, a in ((0, 255), (1, 200)):
        d.line([(40 + k * 2, 14 - k * 2), (40 + k * 2, 28 + k * 2)], fill=org2[:3] + (a,), width=1)
    # 頭の上に拡散の印（二つの矢印）
    d.polygon([(8, 4), (14, 4), (14, 2), (17, 5), (14, 8), (14, 6), (8, 6)], fill=org)
    d.polygon([(24, 9), (18, 9), (18, 11), (15, 8), (18, 5), (18, 7), (24, 7)], fill=org)
    d.point([(9, 4), (10, 4)], fill=org2)
    return im

def good():
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    deep, line = (8, 100, 84, 255), (20, 210, 176, 255)
    light, shade = (236, 255, 250, 255), (184, 236, 222, 255)
    ink = (10, 58, 52, 255)
    cx, cy, r = 16, 19, 13
    face(d, cx, cy, r, deep, line, light, shade)
    # にっこり目（太い ^ ^）
    for ox in (10, 22):
        d.line([(ox - 4, 18), (ox, 14), (ox + 4, 18)], fill=ink, width=2)
    # ほっぺ
    pk = (255, 150, 185, 255)
    d.rectangle([4, 20, 7, 21], fill=pk); d.rectangle([25, 20, 28, 21], fill=pk)
    # 開いた口と舌
    d.chord([10, 19, 22, 29], 0, 180, fill=ink)
    d.chord([13, 24, 19, 29], 180, 360, fill=(255, 90, 120, 255))
    d.rectangle([12, 24, 20, 24], fill=ink)
    # 右上のハート（濃い縁つき）
    hp, hl, hd = (255, 90, 146, 255), (255, 210, 228, 255), (150, 20, 70, 255)
    H = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]
    ox, oy = 25, 1
    for y in range(-1, len(H) + 1):
        for x in range(-1, 8):
            near = any(0 <= y + j < len(H) and 0 <= x + i < 7 and H[y + j][x + i] == '1' for j in (-1, 0, 1) for i in (-1, 0, 1) if abs(i) + abs(j) == 1)
            inside = 0 <= y < len(H) and 0 <= x < 7 and H[y][x] == '1'
            if inside: d.point((ox + x, oy + y), fill=hp)
            elif near: d.point((ox + x, oy + y), fill=hd)
    d.point([(ox + 1, oy + 1), (ox + 2, oy + 1), (ox + 1, oy + 2)], fill=hl)
    return im

def save(im, name):
    big = im.resize((im.size[0] * S, im.size[1] * S), Image.NEAREST)
    big = big.crop(big.getbbox())
    p = os.path.join(OUT, name + '.webp'); big.save(p, 'WEBP', lossless=True)
    print(name, big.size, os.path.getsize(p))

save(guard(0), 'face_guard_0'); save(guard(1), 'face_guard_1'); save(good(), 'face_good')
