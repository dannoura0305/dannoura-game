"""Ver.0.5「広がり」の素材：新しい土地（岩場・砂丘・渓谷・富山）のタイルと飾り、収集品のアイコン、巣の飾り、世界地図。

すべてコードで描く（乱数は固定シード → 何度実行しても同じ PNG）。輪郭は #2a1a10（ほかの素材と同じ）。
  タイル 16×16：さらさら砂・崖・段差・川（4 コマ）・水田（季節 4 つ）・水路（2 コマ）・あぜ道
  大きな飾り：雪の山なみ（立山連峰の雰囲気・横につながる 256×128）・瓦屋根の家（96×80）・桜（季節 4 つ）・祠・道しるべ・
             機械の部品・光る板（電話の画面）・古い石の標・不思議な穴（4 コマ）・白い小さな影（ほのめかし）
  収集品のアイコン 16×16 × 18・地上のきらめき（3 コマ）
  巣の飾り：きれいな石の飾り・収集品の台・季節のリース・星の灯り・飾り棚・家族の木・小さな雪だるま
  世界地図（192×144）：4 つの土地＋霧の向こう（富山は見つけるまで霧のまま。霧はゲームが重ねる）
"""
from __future__ import annotations

import math
import random

from pixart import Img, Rig, PNoise, fbm, bayer, hx, mix, OUTLINE, bezier

T = 16
OL = OUTLINE
SAND = ['#80592f', '#a27546', '#c08f58', '#d4a46a', '#e2b77d', '#f0cf98']
DUNE = ['#a8784a', '#c8955c', '#dcab70', '#ecc286', '#f6d8a0']
ROCK = ['#3a332e', '#55493f', '#72634f', '#907e66', '#ad9a7e', '#c9b89a']
GRAYROCK = ['#2e3238', '#454b52', '#5f666c', '#7b8286', '#9aa0a2', '#bfc3c2']
GRASS = ['#3f4423', '#545b2c', '#6c7236', '#878b45', '#a3a254', '#c2b968']
LUSH = ['#24401f', '#2f5426', '#3d6a2e', '#4f8236', '#699c42', '#8ab656']
WATER = ['#1d4363', '#24557c', '#2f6e9a', '#3f8ab5', '#5fa9c9', '#9fd3df']
DIRT = ['#5e3d26', '#74503a', '#8a6244', '#9f744f', '#b3865c', '#c69a6c']
SNOW = ['#9aa8bc', '#b8c4d4', '#d4dce8', '#eaf0f6', '#ffffff']
ROOF = ['#1e2630', '#2c3644', '#3c4858', '#4f5d70', '#66768a']
WALL = ['#b8ac98', '#d4c8b2', '#ebe2cf', '#f6f0e2']
WOOD = ['#3b2818', '#523822', '#6e4d30', '#8c6744', '#a8835a']
PINK = ['#9a4a6a', '#c86a8c', '#e890aa', '#f6b8c8', '#ffe0ea']
GOLD = ['#7a5418', '#a87824', '#d4a238', '#f0cc5c', '#fff0a0']
METAL = ['#2a2c30', '#43464c', '#5f636a', '#80858c', '#a8adb4', '#d4d8dc']
RUST = ['#5a2c18', '#7c4024', '#a05a30']


def P(img, x, y, c):
    img.set(int(x), int(y), c)


def noise_tile(pal, seed, var=0, k=0.6, spark=0.0):
    n = [PNoise(p, seed * 7 + i + var * 31) for i, p in enumerate((2, 4, 8))]
    img = Img(T, T)
    r = random.Random('%d-%d' % (seed, var))
    for y in range(T):
        for x in range(T):
            v = 0.5 + (fbm(n, x, y, T) - 0.5) * k + bayer(x, y) * 0.12
            v = max(0, min(0.999, v))
            c = hx(pal[1 + int(v * (len(pal) - 2))])
            if spark and r.random() < spark:
                c = hx(pal[-1] if r.random() < 0.5 else pal[0])
            img.set(x, y, c)
    return img


# ------------------------------------------------------------------ tiles
def dune(var):
    """さらさら砂：風紋の明るい砂（不透明。地面の上に重ねる）"""
    img = noise_tile(DUNE, 51, var, 0.45)
    for y in range(T):
        for x in range(T):
            w = math.sin((x * 0.45 + y * 1.25 + var * 2.1) * 1.05)
            if w > 0.82:
                img.set(x, y, DUNE[4])
            elif w < -0.9:
                img.set(x, y, DUNE[1])
    return img


def cliff(var):
    """崖：灰色がかった岩肌（縦の割れ目と段）"""
    img = noise_tile(GRAYROCK, 61, var, 0.5)
    r = random.Random(61 + var)
    for k in range(3):
        x = r.randint(1, 14)
        for y in range(r.randint(0, 4), 16):
            if r.random() < 0.85:
                img.set(x, y, GRAYROCK[0])
                img.set(x + 1, y, GRAYROCK[4])
            x += r.choice((0, 0, 1, -1))
    for x in range(T):
        img.set(x, 0, GRAYROCK[5])
        img.set(x, 15, GRAYROCK[0])
    return img


def ledge(var):
    """段差：上は草のふち、その下に土の壁と影（南へ下りる一方通行の段）"""
    img = Img(T, T)
    r = random.Random(71 + var)
    edge = [5 + int(1.2 * math.sin((x + var * 5) * 0.7)) for x in range(T)]
    for x in range(T):
        for y in range(T):
            if y < edge[x]:
                c = LUSH[3 + (bayer(x, y) > 0.2)]
            elif y == edge[x]:
                c = LUSH[5]
            elif y < 13:
                v = (y - edge[x]) / 8
                c = DIRT[max(0, 3 - int(v * 4))] if (x + y) % 5 else DIRT[1]
            else:
                c = mix(DIRT[0], '#000000', 0.25)
            img.set(x, y, c)
        if r.random() < 0.3:
            img.set(x, edge[x] + 2, DIRT[5])
    return img


def river(frame):
    img = Img(T, T)
    n = [PNoise(4, 81), PNoise(8, 82)]
    for y in range(T):
        for x in range(T):
            v = fbm(n, x - frame * 4, y, T)
            c = WATER[2] if v < 0.45 else WATER[3] if v < 0.6 else WATER[4]
            w = math.sin((x - frame * 4) * 0.8 + y * 0.3)
            if w > 0.93:
                c = WATER[5]
            img.set(x, y, c)
    return img


def paddy(season):
    """水田：季節で 0 春（水と苗）1 夏（青い稲）2 秋（金の稲穂）3 冬（雪をかぶった田）"""
    img = Img(T, T)
    n = [PNoise(4, 91 + season), PNoise(8, 95)]
    for y in range(T):
        for x in range(T):
            v = fbm(n, x, y, T)
            if season == 3:
                c = SNOW[3] if v > 0.4 else SNOW[2]
            elif season == 2:
                c = mix(GOLD[1], '#6a8a50', 0.35) if v < 0.5 else mix(GOLD[2], '#7a9a58', 0.3)
            elif season == 1:
                c = LUSH[3] if v > 0.5 else LUSH[2]
            else:
                c = WATER[3] if v > 0.55 else WATER[2]
                if v > 0.72:
                    c = '#a8c8d8'   # 空が映る
            img.set(x, y, c)
    for (xx, yy) in ((3, 4), (11, 4), (7, 12), (15, 12)):
        if season == 0:
            P(img, xx, yy, LUSH[4]); P(img, xx, yy - 1, LUSH[5])
        elif season == 1:
            P(img, xx, yy - 1, LUSH[5]); P(img, xx - 1, yy, LUSH[4])
        elif season == 2:
            P(img, xx, yy - 1, GOLD[4]); P(img, xx + 1, yy, GOLD[3])
        else:
            P(img, xx, yy, WOOD[1])
    return img


def channel(frame):
    img = Img(T, T)
    for y in range(T):
        for x in range(T):
            if x < 2 or x > 13:
                c = GRAYROCK[3] if (y + x) % 4 else GRAYROCK[2]
            else:
                w = math.sin((y + frame * 3) * 0.9 + x * 0.2)
                c = WATER[4] if w > 0.7 else WATER[2] if w < -0.6 else WATER[3]
            img.set(x, y, c)
    return img


def path(var):
    img = noise_tile(['#6a5034', '#8a6a48', '#a08058', '#b49468', '#c6a87c'], 101, var, 0.4, spark=0.02)
    return img


# ------------------------------------------------------------------ 雪の山なみ（横につながる帯）
def mountains():
    W, H = 256, 128
    img = Img(W, H)
    r = random.Random(4440)
    # 空（上は透明：ゲームの空の色が見える）→ 山：横に周期的な尾根線
    def ridge(x, base, amp, seed):
        v = 0
        for k, (f, a) in enumerate(((1, 1.0), (2, 0.5), (5, 0.22), (11, 0.1))):
            v += math.sin((x / W) * math.tau * f + seed * (k + 1)) * a
        return base - amp * v
    layers = [(60, 26, 1.3, SNOW, GRAYROCK), (82, 18, 2.7, SNOW, ['#3a4656', '#4a586a', '#5c6c80', '#72849a', '#90a2b6', '#b4c2d0'])]
    nz = [PNoise(16, 4441), PNoise(32, 4442)]
    for li, (base, amp, seed, snow, rock) in enumerate(layers):
        for x in range(W):
            top = int(ridge(x, base, amp, seed))
            slope = ridge(x + 2, base, amp, seed) - ridge(x - 2, base, amp, seed)   # >0：右下がりの斜面（光の当たる側）
            for y in range(max(0, top), H):
                depth = y - top
                snowline = 10 + 6 * math.sin(x * 0.11 + seed) + (8 if li == 0 else 4) + (fbm(nz, x, y, W) - 0.5) * 10
                lit = slope > 0.4
                if depth < snowline:
                    c = snow[3 + (depth < 2)] if lit else snow[2] if depth > 1 else snow[3]
                    if depth > 4 and fbm(nz, x * 2, y * 2, W) > 0.68:
                        c = snow[1]
                else:
                    v = min(4, 1 + int((depth - snowline) / 12))
                    c = rock[min(5, v + (1 if lit else 0))]
                img.set(x, y, c)
            img.set(x, max(0, top), snow[4] if li == 0 else snow[3])
    # ふもとの森（下の帯）
    for x in range(W):
        h = 10 + int(4 * math.sin(x * 0.3) + 3 * math.sin(x * 1.1))
        for y in range(H - h, H):
            c = LUSH[1] if (x + y) % 3 else LUSH[0]
            if y == H - h:
                c = LUSH[2]
            img.set(x, y, c)
    for _ in range(40):
        x = r.randint(0, W - 1)
        y = H - r.randint(6, 13)
        for k in range(5):
            for dx in range(-k // 2, k // 2 + 1):
                img.set((x + dx) % W, y + k, LUSH[2 if dx else 3])
    return img


# ------------------------------------------------------------------ 瓦屋根の家（6×5 タイル・入れない）
def house(var):
    W, H = 96, 80
    img = Img(W, H)
    roof = ROOF if var == 0 else ['#3a2420', '#523430', '#6a4640', '#82584e', '#9c6c60']
    wall_top = 40
    # 壁
    for y in range(wall_top, H - 2):
        for x in range(6, W - 6):
            c = WALL[2] if (x * 7 + y * 13) % 29 else WALL[1]
            img.set(x, y, c)
    # 柱と梁
    for x in (6, 30, 54, W - 7):
        for y in range(wall_top, H - 2):
            img.set(x, y, WOOD[1]); img.set(x + 1, y, WOOD[2])
    for x in range(6, W - 6):
        img.set(x, wall_top, WOOD[1]); img.set(x, H - 3, WOOD[0]); img.set(x, H - 2, WOOD[0])
    # 窓（格子）・戸
    for (wx, wy) in ((12, 50), (60, 50)):
        for y in range(wy, wy + 14):
            for x in range(wx, wx + 14):
                img.set(x, y, '#4a5868' if (x - wx) % 5 and (y - wy) % 5 else WOOD[2])
    for y in range(52, H - 3):
        for x in range(36, 50):
            img.set(x, y, WOOD[3] if (x - 36) % 4 else WOOD[1])
    # 瓦屋根（台形・横じま）
    for y in range(6, wall_top + 2):
        k = (y - 6) / (wall_top - 4)
        x0 = int(W / 2 - (20 + k * 30)) - 2
        x1 = int(W / 2 + (20 + k * 30)) + 2
        for x in max(0, x0), :
            pass
        for x in range(max(0, x0), min(W, x1)):
            band = (y - 6) % 4
            c = roof[1] if band == 0 else roof[3] if band == 1 else roof[2]
            if (x + (y // 4) * 2) % 6 == 0:
                c = roof[0]
            img.set(x, y, c)
    for x in range(int(W / 2 - 22), int(W / 2 + 22)):
        img.set(x, 5, roof[4]); img.set(x, 4, roof[0])
    # 鬼瓦（両端）
    for (ex) in (int(W / 2 - 23), int(W / 2 + 21)):
        for y in range(1, 6):
            for x in range(ex, ex + 3):
                img.set(x, y, roof[0] if y < 2 else roof[2])
    img.outline()
    return img


# ------------------------------------------------------------------ 桜（季節 4 つ）
def sakura(season):
    W, H = 48, 64
    img = Img(W, H)
    r = random.Random(1904)
    # 幹と枝
    def thick_line(x0, y0, x1, y1, w, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for dx in range(-w, w + 1):
                img.set(int(x + dx), int(y), c)
    thick_line(24, 63, 23, 40, 2, WOOD[1])
    thick_line(23, 44, 12, 28, 1, WOOD[1])
    thick_line(23, 44, 36, 26, 1, WOOD[1])
    thick_line(23, 40, 24, 18, 1, WOOD[2])
    if season == 3:
        for (x0, y0, x1, y1) in ((12, 28, 6, 20), (36, 26, 42, 18), (24, 18, 20, 10), (24, 18, 30, 9)):
            thick_line(x0, y0, x1, y1, 0, WOOD[1])
            img.set(x1, y1 - 1, SNOW[4]); img.set(x0, y0 - 1, SNOW[3])
        for x in range(10, 40):
            if r.random() < 0.3:
                img.set(x, 27 + r.randint(-2, 2), SNOW[4])
    else:
        pal = PINK if season == 0 else LUSH if season == 1 else ['#6a2a14', '#a04820', '#d0702c', '#e8984a', '#f8c070']
        for (cx, cy, rx, ry, n) in ((14, 24, 11, 8, 70), (34, 22, 11, 8, 70), (24, 14, 14, 9, 90), (24, 26, 12, 6, 50)):
            for _ in range(n):
                a = r.random() * math.tau
                d = math.sqrt(r.random())
                x, y = cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d
                v = 1 + int((1 - (y - (cy - ry)) / (2 * ry)) * 3 + r.random())
                for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                    img.set(int(x + dx), int(y + dy), pal[max(0, min(4, v))])
        if season == 0:
            for _ in range(14):
                img.set(r.randint(4, 44), r.randint(40, 62), PINK[3])   # 散った花びら
    img.outline()
    return img


# ------------------------------------------------------------------ 富山の小物・谷の石の標
def shrine():
    """小さな祠と、かすれた立て札"""
    img = Img(32, 32)
    for y in range(18, 30):
        for x in range(9, 23):
            img.set(x, y, WOOD[2] if (x + y) % 5 else WOOD[1])
    for y in range(12, 19):
        k = (y - 12) / 6
        for x in range(int(16 - 7 - k * 3), int(16 + 7 + k * 3)):
            img.set(x, y, ROOF[2] if (y % 2) else ROOF[1])
    for x in range(12, 20):
        img.set(x, 11, ROOF[3])
    for y in range(22, 28):
        for x in range(14, 18):
            img.set(x, y, '#2a1810')
    img.set(15, 21, GOLD[3]); img.set(16, 21, GOLD[3])
    # 立て札
    for y in range(14, 30):
        img.set(27, y, WOOD[1])
    for y in range(12, 22):
        for x in range(24, 31):
            img.set(x, y, WALL[1] if (x + y) % 7 else WALL[0])
    for y in (14, 16, 18):
        for x in range(25, 30):
            if (x * 7 + y) % 3:
                img.set(x, y, '#6a5a48')
    img.outline()
    return img


def post():
    """細い道しるべ（かすれた数字が 3 つ）"""
    img = Img(16, 32)
    for y in range(6, 31):
        img.set(7, y, WOOD[2]); img.set(8, y, WOOD[1])
    for y in range(4, 16):
        for x in range(4, 12):
            img.set(x, y, WALL[1] if (x + y) % 9 else WALL[0])
    # とても小さな 4 4 4（縦に）
    four = ['x.x', 'xxx', '..x']
    for k in range(3):
        for j, row in enumerate(four):
            for i, ch in enumerate(row):
                if ch == 'x':
                    img.set(6 + i, 5 + k * 3 + j, '#5a4a3a' if k != 1 else '#6a5a48')
    img.outline()
    return img


def machine():
    """草の中の金属の部品（歯車と板）"""
    img = Img(16, 16)
    cx, cy = 8, 9
    for y in range(T):
        for x in range(T):
            d = math.hypot(x + .5 - cx, y + .5 - cy)
            a = math.atan2(y + .5 - cy, x + .5 - cx)
            if d < 5.5 + (1.2 if math.cos(a * 8) > 0.3 else 0):
                c = METAL[3] if d > 2 else METAL[1]
                if d < 1.2:
                    c = METAL[0]
                if (x + y) % 5 == 0 and d > 3:
                    c = RUST[1]
                img.set(x, y, c)
    for x in range(2, 13):
        img.set(x, 14, METAL[2]); img.set(x, 15, METAL[1])
    img.set(6, 6, METAL[5]); img.set(7, 5, METAL[4])
    img.outline()
    return img


def phone(frame):
    """草の中の四角い板（画面がぼんやり光る）"""
    img = Img(16, 16)
    for y in range(4, 14):
        for x in range(4, 12):
            img.set(x, y, '#1a1c22')
    glow = ['#4a6a8a', '#7aa8d0'][frame]
    for y in range(5, 12):
        for x in range(5, 11):
            img.set(x, y, glow)
    if frame == 1:
        for x in range(6, 10):
            img.set(x, 7, '#e8f4ff')
        img.set(6, 9, '#e8f4ff'); img.set(8, 9, '#e8f4ff')   # 「…」
    img.outline()
    return img


def stone_marker():
    """谷の奥の、苔むした古い石の標"""
    img = Img(16, 24)
    for y in range(3, 23):
        for x in range(3, 13):
            if (y < 5 and (x < 5 or x > 10)):
                continue
            c = GRAYROCK[3] if (x + y) % 6 else GRAYROCK[2]
            if y > 17 and (x * 3 + y) % 4 == 0:
                c = LUSH[2]
            img.set(x, y, c)
    for y in (8, 11, 14):
        for x in range(5, 11):
            if (x + y) % 3:
                img.set(x, y, GRAYROCK[1])
    img.outline()
    return img


def hole(frame):
    """不思議な穴：地面にぽっかり開いた、ほの白く光る穴（4 コマ）"""
    img = Img(32, 24)
    cx, cy = 16, 14
    for y in range(24):
        for x in range(32):
            d = math.hypot((x + .5 - cx) / 10, (y + .5 - cy) / 6)
            if d < 1:
                k = (1 - d)
                if d < 0.55:
                    c = mix('#0e1230', '#2a3a70', k)
                else:
                    c = mix('#6a80c8', '#e8f0ff', min(1, (1 - d) * 3 + 0.2 * math.sin(frame * 1.6 + x * 0.6)))
                img.set(x, y, c)
    r = random.Random(77 + frame)
    for _ in range(7):
        a = r.random() * math.tau
        rr = 11 + r.random() * 4
        img.set(int(cx + math.cos(a) * rr), int(cy + math.sin(a) * rr * 0.6) - frame % 2, '#f4f8ff')
    return img


def white_shape(frame):
    """白い小さな影（ほのめかし。名前はない）"""
    img = Img(16, 16)
    for y in range(T):
        for x in range(T):
            d = math.hypot((x + .5 - 8) / 4.5, (y + .5 - 10 + frame * 0.5) / 4.2)
            if d < 1:
                img.set(x, y, '#f4f8ff' if d < 0.8 else '#c8d4ec')
    for (x, y) in ((5, 5), (6, 4), (10, 5), (11, 4)):    # 耳のような小さな出っぱり
        img.set(x, y + frame, '#f4f8ff')
    img.set(7, 9, '#5a6a8a'); img.set(9, 9, '#5a6a8a')
    return img


# ------------------------------------------------------------------ 収集品のアイコン
def _rg(w=16, h=16):
    return Rig(w, h, {
        'stone': [hx(c) for c in ROCK], 'gray': [hx(c) for c in GRAYROCK], 'gem': [hx(c) for c in ['#1e4a5a', '#2c7088', '#46a0b4', '#7ccede', '#c8f2f4']],
        'leaf': [hx(c) for c in LUSH], 'shell': [hx(c) for c in ['#8a6a5a', '#b48a76', '#d8b4a0', '#f0d8c8', '#fff4ec']],
        'gold': [hx(c) for c in GOLD], 'pink': [hx(c) for c in PINK], 'blue': [hx(c) for c in ['#103a6a', '#1a5aa0', '#2e86d0', '#5ab4f0', '#a8e0ff']],
        'wood': [hx(c) for c in WOOD], 'white': [hx(c) for c in SNOW], 'black': [hx(c) for c in ['#0c0c12', '#1c1c26', '#2e2e3c', '#444458', '#606078']],
        'metal': [hx(c) for c in METAL[1:]], 'red': [hx(c) for c in ['#5a1410', '#8a2018', '#c03428', '#e85a44', '#ff9a80']],
        'paper': [hx(c) for c in ['#8a7a60', '#b4a284', '#d8c8a8', '#f0e4c8', '#fff8e8']], 'purple': [hx(c) for c in ['#2a1848', '#44287a', '#6a44b0', '#9a78e0', '#d0c0ff']],
    }, ambient=0.18)


def curio_icon(cid):
    rg = _rg()
    extra = []
    if cid == 'clover':
        for a in (0, 90, 180, 270):
            x, y = 8 + math.cos(math.radians(a)) * 2.8, 7 + math.sin(math.radians(a)) * 2.8
            rg.ellipse(x, y, 2.6, 2.6, 'leaf', group='l%d' % a)
        rg.capsule([(8, 8), (9, 12), (11, 15)], [0.8, 0.6, 0.5], 'leaf', group='stem')
    elif cid == 'shell':
        rg.ellipse(8, 9, 6, 5, 'shell', ang=-8)
        extra = [(x, 9 - abs(x - 8) // 2, '#b48a76') for x in range(4, 13, 2)]
    elif cid == 'starbit':
        pts = [(8 + math.cos(math.radians(a)) * (6 if i % 2 == 0 else 2.6), 8 + math.sin(math.radians(a)) * (6 if i % 2 == 0 else 2.6)) for i, a in enumerate(range(-90, 270, 36))]
        rg.poly(pts, 'gold', value=0.75)
    elif cid == 'ammonite':
        rg.ellipse(8, 8.5, 6, 6, 'stone')
        for i in range(26):
            a = i * 0.55
            r_ = 0.6 + i * 0.2
            extra.append((int(8 + math.cos(a) * r_), int(8.5 + math.sin(a) * r_), ROCK[1]))
    elif cid == 'crystal':
        rg.poly([(6, 14), (5, 6), (8, 2), (10, 6), (9, 14)], 'gem', value=0.7)
        rg.poly([(9, 14), (10, 8), (12, 5), (13, 9), (12, 14)], 'gem', value=0.5)
    elif cid == 'sign_tablet':
        rg.poly([(3, 4), (12, 3), (13, 12), (9, 14), (4, 13)], 'gray', value=0.6)
        extra = [(x, y, GRAYROCK[1]) for y in (6, 8, 10) for x in range(5, 11) if (x + y) % 3]
    elif cid == 'desert_rose':
        for (x, y, a) in ((6, 10, -30), (10, 10, 30), (8, 7, 0), (5, 7, -60), (11, 7, 60)):
            rg.ellipse(x, y, 3.4, 1.6, 'shell', ang=a, group='p%d%d' % (x, y))
    elif cid == 'moon_sand':
        rg.ellipse(8, 11, 6, 3, 'blue')
        extra = [(5, 9, '#e0f4ff'), (9, 8, '#ffffff'), (11, 10, '#c8ecff'), (7, 11, '#ffffff')]
    elif cid == 'sign_glass':
        rg.poly([(4, 12), (5, 4), (11, 3), (13, 10), (9, 14)], 'blue', value=0.65)
        extra = [(7, 7, '#ffffff'), (8, 6, '#ffffff'), (9, 9, '#eaf0f6')]
    elif cid == 'kingfisher':
        rg.capsule([(3, 13), (8, 7), (13, 2)], [1.6, 2.6, 0.8], 'blue')
        extra = [(x, 13 - (x - 3), '#103a6a') for x in range(4, 12)]
    elif cid == 'acorn':
        rg.ellipse(8, 10, 4, 4.6, 'wood')
        rg.ellipse(8, 6, 4.6, 2.4, 'stone', group='cap')
        rg.capsule([(8, 4), (9, 2)], [0.7, 0.5], 'wood', group='stem')
    elif cid == 'sign_fur':
        for i in range(7):
            rg.capsule([(5 + i, 14), (6 + i * 0.8, 8), (8 + i * 0.4, 2)], [0.8, 0.7, 0.4], 'white', group='f%d' % (i % 3))
    elif cid == 'dragons_card':
        rg.poly([(3, 2), (13, 2), (13, 14), (3, 14)], 'paper', value=0.7)
        extra = [(x, y, '#2a4aa0') for y in range(4, 12) for x in range(5, 11) if (x + y) % 4 == 0] + [(6, 6, '#c03428'), (9, 9, '#c03428'), (7, 8, '#f0cc5c')]
    elif cid == 'machine_part':
        for a in range(0, 360, 45):
            rg.ellipse(8 + math.cos(math.radians(a)) * 5, 8 + math.sin(math.radians(a)) * 5, 1.6, 1.6, 'metal', group='t%d' % a)
        rg.ellipse(8, 8, 4.6, 4.6, 'metal', group='body')
        extra = [(8, 8, '#1a1c22'), (7, 8, '#1a1c22'), (8, 7, '#1a1c22'), (7, 7, '#1a1c22')]
    elif cid == 'charm':
        rg.poly([(4, 4), (12, 4), (12, 13), (8, 15), (4, 13)], 'red', value=0.65)
        rg.capsule([(8, 4), (8, 1)], [0.6, 0.6], 'gold', group='cord')
        extra = [(7, 8, '#f0cc5c'), (8, 8, '#f0cc5c'), (9, 8, '#f0cc5c'), (8, 7, '#f0cc5c'), (8, 9, '#f0cc5c'), (7, 10, '#f0cc5c'), (9, 10, '#f0cc5c')]
    elif cid == 'black_feather':
        rg.capsule([(3, 14), (7, 9), (12, 2)], [0.9, 2.8, 0.8], 'black')
        extra = [(x, 14 - int((x - 3) * 1.3), '#606078') for x in range(4, 12)]
    elif cid == 'odd_crystal':
        rg.poly([(8, 1), (13, 7), (8, 15), (3, 7)], 'purple', value=0.7)
        extra = [(7, 5, '#ffffff'), (8, 4, '#f0e8ff'), (9, 10, '#d0c0ff')]
    elif cid == 'unknown_card':
        rg.poly([(3, 2), (13, 2), (13, 14), (3, 14)], 'paper', value=0.5)
        extra = [(x, y, '#3a2a5a') for y in range(4, 13) for x in range(5, 12) if ((x * 3 + y * 5) % 7) < 2] + [(8, 8, '#f0cc5c'), (7, 7, '#e8485a'), (9, 9, '#46a0b4')]
    img = rg.resolve()
    for (x, y, c) in extra:
        if img.get(x, y) and img.get(x, y)[:3] != hx(OL)[:3]:
            img.set(x, y, c)
    return img


def curio_glint(frame):
    """地上の収集品：小さなきらめき（中身は拾うまで分からない）"""
    img = Img(16, 16)
    k = [2, 4, 3][frame]
    c = ['#fff8d8', '#ffffff', '#e8f4ff'][frame]
    for i in range(-k, k + 1):
        img.set(8 + i, 9, c)
        img.set(8, 9 + i, c)
    img.set(7, 8, '#fff0b0'); img.set(9, 10, '#fff0b0'); img.set(9, 8, '#fff0b0'); img.set(7, 10, '#fff0b0')
    for y in range(12, 14):
        for x in range(5, 12):
            if img.get(x, y) is None:
                img.set(x, y, (42, 26, 16, 70))
    return img


# ------------------------------------------------------------------ 巣の飾り（断面図の家具：アンカーは床の中央）
def stone_display():
    img = Img(16, 16)
    for x in range(3, 13):
        img.set(x, 14, WOOD[2]); img.set(x, 15, WOOD[1])
    for y in range(10, 14):
        for x in range(5, 11):
            img.set(x, y, '#c8b07a' if (x + y) % 3 else '#a8905a')   # 草の台
    rg = _rg()
    rg.ellipse(8, 7, 3.4, 3, 'gem')
    gem = rg.resolve()
    img.paste(gem, 0, 0)
    img.set(7, 5, '#ffffff')
    img.outline()
    return img


def curio_stand():
    """収集品を置く小さな台（品のアイコンはゲームが上に描く）"""
    img = Img(16, 16)
    for x in range(2, 14):
        img.set(x, 14, WOOD[3]); img.set(x, 15, WOOD[1])
    for y in range(11, 14):
        img.set(4, y, WOOD[2]); img.set(11, y, WOOD[2])
    img.outline()
    return img


def wreath():
    img = Img(16, 16)
    r = random.Random(5)
    cols = [PINK[2], LUSH[3], '#d0702c', WOOD[2], GOLD[3]]
    for i in range(40):
        a = i / 40 * math.tau
        x, y = 8 + math.cos(a) * 5, 8 + math.sin(a) * 5
        img.set(int(x), int(y), cols[i % 5])
        img.set(int(x + r.choice((-1, 0, 1))), int(y + r.choice((-1, 0, 1))), LUSH[2])
    img.set(8, 2, '#c03428'); img.set(7, 2, '#c03428')
    img.outline()
    return img


def star_lamp(frame):
    img = Img(16, 16)
    img.set(8, 0, WOOD[1]); img.set(8, 1, WOOD[1])
    pts = [(8 + math.cos(math.radians(a)) * (6 if i % 2 == 0 else 2.6), 8 + math.sin(math.radians(a)) * (6 if i % 2 == 0 else 2.6)) for i, a in enumerate(range(-90, 270, 36))]
    from pixart import point_in_poly
    for y in range(T):
        for x in range(T):
            if point_in_poly(x + .5, y + .5, pts):
                img.set(x, y, GOLD[3 + frame] if (x + y) % 3 else GOLD[2])
    img.outline()
    return img


def curio_shelf():
    img = Img(32, 32)
    for y in range(2, 32):
        img.set(3, y, WOOD[1]); img.set(4, y, WOOD[2]); img.set(27, y, WOOD[1]); img.set(28, y, WOOD[2])
    for yy in (2, 12, 22, 30):
        for x in range(3, 29):
            img.set(x, yy, WOOD[3]); img.set(x, yy + 1, WOOD[1])
    for y in range(3, 30):
        for x in range(5, 27):
            if img.get(x, y) is None:
                img.set(x, y, (60, 40, 26, 255) if (x + y) % 2 else (68, 46, 30, 255))
    img.outline()
    return img


def family_tree():
    img = Img(16, 32)
    for y in range(14, 31):
        img.set(7, y, WOOD[2]); img.set(8, y, WOOD[1])
    for x in range(4, 12):
        img.set(x, 30, WOOD[1]); img.set(x, 31, WOOD[0])
    r = random.Random(3)
    furs = ['#d8b07a', '#f0d8a8', '#b06a40', '#8a7a6a', '#f4ecdc']
    for i in range(18):
        a = r.random() * math.tau
        d = math.sqrt(r.random()) * 6
        x, y = 8 + math.cos(a) * d, 9 + math.sin(a) * d * 0.9
        img.set(int(x), int(y), furs[i % 5]); img.set(int(x) + 1, int(y), LUSH[3])
    img.outline()
    return img


def snowman():
    img = Img(16, 16)
    for (cx, cy, rr) in ((8, 11, 4.2), (8, 5.5, 3)):
        for y in range(T):
            for x in range(T):
                if math.hypot(x + .5 - cx, y + .5 - cy) < rr:
                    img.set(x, y, SNOW[3] if (x + y) % 4 else SNOW[2])
    img.set(7, 5, '#1a1c22'); img.set(9, 5, '#1a1c22'); img.set(8, 6, '#e8902c')
    for x in range(5, 12):
        img.set(x, 8, '#c03428')
    img.outline()
    return img


# ------------------------------------------------------------------ 世界地図（羊皮紙）
WM = {'w': 192, 'h': 144, 'cells': {'rocks': (96, 30), 'canyon': (40, 76), 'plains': (96, 76), 'dunes': (152, 76), 'toyama': (34, 124)}}


def world_map():
    W, H = WM['w'], WM['h']
    img = Img(W, H)
    n = [PNoise(4, 301), PNoise(8, 302), PNoise(16, 303)]
    for y in range(H):
        for x in range(W):
            v = fbm(n, x, y, 64)
            img.set(x, y, mix('#c8b088', '#ead8b0', v))
    def blob(cx, cy, rx, ry, pal, seed):
        r = random.Random(seed)
        for y in range(int(cy - ry - 2), int(cy + ry + 3)):
            for x in range(int(cx - rx - 2), int(cx + rx + 3)):
                d = math.hypot((x - cx) / rx, (y - cy) / ry) + (r.random() - 0.5) * 0.12
                if d < 1:
                    img.set(x, y, pal[min(len(pal) - 1, int((1 - d) * len(pal)))])
    c = WM['cells']
    blob(c['rocks'][0], c['rocks'][1], 26, 17, ['#7a6a5a', '#8e7e6a', '#a08f78', '#b29f86'], 1)
    blob(c['canyon'][0], c['canyon'][1], 24, 20, ['#4f7a3a', '#5e8a42', '#6e9a4c', '#86ae5c'], 2)
    blob(c['plains'][0], c['plains'][1], 26, 20, ['#a89a56', '#bca866', '#ccb874', '#d8c47e'], 3)
    blob(c['dunes'][0], c['dunes'][1], 26, 20, ['#d0a060', '#dcae6c', '#e8bc78', '#f0cc8c'], 4)
    # 川（谷）・オアシス・岩の印・砂丘の波
    for x in range(18, 62):
        y = c['canyon'][1] + 8 + int(math.sin(x / 5) * 2)
        img.set(x, y, '#3f8ab5'); img.set(x, y + 1, '#2f6e9a')
    for y in range(c['plains'][1] - 12, c['plains'][1] - 8):
        for x in range(c['plains'][0] - 4, c['plains'][0] + 4):
            img.set(x, y, '#3f8ab5')
    for (dx, dy) in ((-10, -4), (0, -8), (10, -2), (-4, 4), (8, 6)):
        x, y = c['rocks'][0] + dx, c['rocks'][1] + dy
        for k in range(4):
            img.hline(x - k, x + k, y + k, '#5a4a3a')
    for k in range(4):
        for x in range(c['dunes'][0] - 18, c['dunes'][0] + 18):
            y = c['dunes'][1] - 8 + k * 6 + int(math.sin(x / 4 + k) * 1.5)
            img.set(x, y, '#b88448')
    # 道（点線）
    def dots(a, b):
        for i in range(0, 30):
            t = i / 29
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            if i % 3 == 0:
                img.set(int(x), int(y), '#6a4a2a')
    dots(c['plains'], c['rocks']); dots(c['plains'], c['dunes']); dots(c['plains'], c['canyon'])
    # 南西の隅：霧の向こうの雪山（富山。ゲームが霧を重ねて隠す）
    tx, ty = c['toyama']
    for x in range(tx - 26, tx + 26):
        top = ty - 8 - int(abs(math.sin(x / 6.0)) * 8)
        for y in range(top, ty + 6):
            img.set(x, y, '#eaf0f6' if y < top + 4 else '#8a9ab0')
    for y in range(ty + 6, ty + 14):
        for x in range(tx - 22, tx + 22):
            img.set(x, y, '#5fa9c9' if (x // 5 + y // 3) % 2 else '#86ae5c')
    # 枠
    for x in range(W):
        img.set(x, 0, '#6a4a2a'); img.set(x, H - 1, '#6a4a2a'); img.set(x, 1, '#8a6a44'); img.set(x, H - 2, '#8a6a44')
    for y in range(H):
        img.set(0, y, '#6a4a2a'); img.set(W - 1, y, '#6a4a2a'); img.set(1, y, '#8a6a44'); img.set(W - 2, y, '#8a6a44')
    return img


CURIO_IDS = ['clover', 'shell', 'starbit', 'ammonite', 'crystal', 'sign_tablet', 'desert_rose', 'moon_sand', 'sign_glass',
             'kingfisher', 'acorn', 'sign_fur', 'dragons_card', 'machine_part', 'charm', 'black_feather', 'odd_crystal', 'unknown_card']


def build(B, strip):
    from pixart import hstack, vstack
    strip('tile.dune', 'regions/dune.png', [dune(v) for v in range(3)])
    strip('tile.cliff', 'regions/cliff.png', [cliff(v) for v in range(2)], {'solid': True})
    strip('tile.ledge', 'regions/ledge.png', [ledge(v) for v in range(2)], {'note': 'one-way drop (south)'})
    strip('tile.river', 'regions/river.png', [river(f) for f in range(4)], {'anim': True, 'fps': 4})
    strip('tile.paddy', 'regions/paddy.png', [paddy(s) for s in range(4)], {'names': ['spring', 'summer', 'autumn', 'winter']})
    strip('tile.channel', 'regions/channel.png', [channel(f) for f in range(2)], {'anim': True, 'fps': 3})
    strip('tile.path', 'regions/path.png', [path(v) for v in range(2)])
    strip('tile.mountains', 'regions/mountains.png', [mountains()], {'note': 'horizontally tileable backdrop band (toyama north)'})
    strip('tile.house', 'regions/house.png', [house(0), house(1)], {'anchor': [48, 79], 'footprint': [6, 5], 'solid': True})
    strip('tile.sakura', 'regions/sakura.png', [sakura(s) for s in range(4)], {'anchor': [24, 61], 'names': ['spring', 'summer', 'autumn', 'winter']})
    strip('tile.shrine', 'regions/shrine.png', [shrine()], {'anchor': [16, 30]})
    strip('tile.post', 'regions/post.png', [post()], {'anchor': [8, 30]})
    strip('tile.machine', 'regions/machine.png', [machine()], {'anchor': [8, 15]})
    strip('tile.phone', 'regions/phone.png', [phone(0), phone(1)], {'anchor': [8, 14], 'anim': True, 'fps': 1})
    strip('tile.stone_marker', 'regions/stone_marker.png', [stone_marker()], {'anchor': [8, 22]})
    strip('tile.hole', 'regions/hole.png', [hole(f) for f in range(4)], {'anchor': [16, 16], 'anim': True, 'fps': 4})
    strip('fx.white_shape', 'regions/white_shape.png', [white_shape(0), white_shape(1)], {'anchor': [8, 15]})
    B.put('item.curio.ground', 'items/curio_ground.png', hstack([curio_glint(f) for f in range(3)]), {'cell': [16, 16], 'frames': 3, 'fps': 4, 'anchor': [8, 13]})
    for cid in CURIO_IDS:
        B.put('item.curio.%s.icon' % cid, 'items/curio_%s.png' % cid, curio_icon(cid), {'cell': [16, 16]})
    strip('nest.stone_display', 'nest/stone_display.png', [stone_display()], {'anchor': [8, 15]})
    strip('nest.curio_stand', 'nest/curio_stand.png', [curio_stand()], {'anchor': [8, 15]})
    strip('nest.wreath', 'nest/wreath.png', [wreath()], {'anchor': [8, 15]})
    strip('nest.star_lamp', 'nest/star_lamp.png', [star_lamp(0), star_lamp(1)], {'anim': True, 'fps': 2})
    strip('nest.curio_shelf', 'nest/curio_shelf.png', [curio_shelf()], {'anchor': [16, 31]})
    strip('nest.family_tree', 'nest/family_tree.png', [family_tree()], {'anchor': [8, 31]})
    strip('nest.snowman', 'nest/snowman.png', [snowman()], {'anchor': [8, 15]})
    B.put('ui.worldmap', 'ui/worldmap.png', world_map(), {'cell': [WM['w'], WM['h']], 'cells': {k: list(v) for k, v in WM['cells'].items()}})
