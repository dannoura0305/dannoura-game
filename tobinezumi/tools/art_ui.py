"""UI 素材（9 スライス枠・ボタン・ツールアイコン・持ち物枠・ミニマップ枠・吹き出し・名札・カーソル）

色は「濃茶の地に明るい縁取り」。9 スライスは slice=[左, 上, 右, 下] の px。
"""
from __future__ import annotations

from pixart import Img, grid, hx, OUTLINE
from art_field import SEED_PAL, STONE_PAL, GRASS, DRYGRASS
from art_nest import STRAW, GLOW, WOOD, METAL, FLOOR

UI = {
    'k': '#140c08',     # outer dark line
    'd': '#2a1d15',     # panel fill (dark brown)
    'f': '#33241a',     # panel fill lighter
    'b': '#6b5440',     # inner bevel shadow
    'm': '#a88c68',     # border mid
    'l': '#d9c3a0',     # border light
    'h': '#f2e2c2',     # highlight
    'g': '#c9a24a',     # gold ornament
    'G': '#8a6a2a',     # gold dark
    't': '#7fc4b4',     # teal (selected)
    'T': '#3f7a70',     # teal dark
    'r': '#d0503c',     # red (invalid / remove)
    'R': '#7a2a20',
    'w': '#fbf3e2',     # bubble white
    'W': '#d8c8aa',     # bubble shade
    'o': OUTLINE,
}


def frame():
    rows = [
        "..kkkkkkkkkkkkkkkkkkkk..",
        ".kgllllllllllllllllllgk.",
        "kglmmmmmmmmmmmmmmmmmmlgk",
        "klmkkkkkkkkkkkkkkkkkkmlk",
        "klmkbbbbbbbbbbbbbbbbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbddddddddddddddbkmlk",
        "klmkbbbbbbbbbbbbbbbbkmlk",
        "klmkkkkkkkkkkkkkkkkkkmlk",
        "kgbmmmmmmmmmmmmmmmmmmbgk",
        ".kgbbbbbbbbbbbbbbbbbbgk.",
        "..kkkkkkkkkkkkkkkkkkkk..",
    ]
    return grid(rows, UI), [8, 8, 8, 8]


def button(state):
    """state 0 normal, 1 hover, 2 pressed. 16x16, slice 5."""
    if state == 0:
        top, fill, bot, edge = 'l', 'f', 'b', 'm'
    elif state == 1:
        top, fill, bot, edge = 'h', 'b', 'm', 'l'
    else:
        top, fill, bot, edge = 'b', 'd', 'l', 'm'
    r = []
    r.append(".kkkkkkkkkkkkkk.")
    r.append("k" + top * 14 + "k")
    for i in range(11):
        r.append("k" + edge + fill * 12 + edge + "k")
    r.append("k" + edge + bot * 12 + edge + "k")
    r.append("k" + bot * 14 + "k")
    r.append(".kkkkkkkkkkkkkk.")
    return grid(r, UI), [5, 5, 5, 5]


def slot(selected):
    a = 't' if selected else 'm'
    A = 'T' if selected else 'b'
    rows = [".kkkkkkkkkkkkkkkkkk."]
    rows.append("k" + a * 18 + "k")
    rows.append("k" + a + A * 16 + a + "k")
    for i in range(14):
        rows.append("k" + a + A + "d" * 14 + A + a + "k")
    rows.append("k" + a + A * 16 + a + "k")
    rows.append("k" + a * 18 + "k")
    rows.append(".kkkkkkkkkkkkkkkkkk.")
    im = grid(rows, UI)
    # inner top shadow (inset)
    for x in range(3, 17):
        im.set(x, 3, '#20160f')
    return im


def minimap_frame():
    rows = [
        ".kkkkkkkkkkkkkkkkkkkkkk.",
        "kGgggggggggggggggggggggk",
        "kgGmmmmmmmmmmmmmmmmmmGgk",
        "kgmkkkkkkkkkkkkkkkkkkmgk",
        "kgmk..................kmgk",
    ]
    W = 24
    im = Img(W, W)
    for y in range(W):
        for x in range(W):
            edge = min(x, y, W - 1 - x, W - 1 - y)
            c = None
            if edge == 0:
                c = 'k'
            elif edge == 1:
                c = 'g' if (x + y) % 2 else 'G'
            elif edge == 2:
                c = 'm'
            elif edge == 3:
                c = 'k'
            if c:
                im.set(x, y, UI[c])
    for (x, y) in ((0, 0), (W - 1, 0), (0, W - 1), (W - 1, W - 1)):
        im.set(x, y, None)
    # corner studs
    for (x, y) in ((1, 1), (W - 2, 1), (1, W - 2), (W - 2, W - 2)):
        im.set(x, y, UI['h'])
    return im, [5, 5, 5, 5]


def bubble():
    rows = [
        "..oooooooooooo..",
        ".owwwwwwwwwwwwo.",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "owwwwwwwwwwwwwwo",
        "oWwwwwwwwwwwwwWo",
        ".oWWWWWWWWWWWWo.",
        "..oooooooooooo..",
    ]
    tail = [
        "wwwwww",
        "owwwwo",
        ".owwo.",
        "..oo..",
    ]
    return grid(rows, UI), [4, 4, 4, 4], grid(tail, UI)


def name_tag(self_):
    fill = 'f' if not self_ else 'b'
    edge = 'm' if not self_ else 'g'
    rows = [
        ".kkkkkkkkkk.",
        "k" + edge * 10 + "k",
        "k" + edge + fill * 8 + edge + "k",
    ]
    for i in range(6):
        rows.append("k" + edge + fill * 8 + edge + "k")
    rows.append("k" + edge + fill * 8 + edge + "k")
    rows.append("k" + edge * 10 + "k")
    rows.append(".kkkkkkkkkk.")
    return grid(rows, UI), [3, 3, 3, 3]


# ------------------------------------------------------------------ tool icons 16x16
ICON_LEG = {
    'o': OUTLINE, 'h': '#f2e2c2', 'l': '#d9c3a0', 'm': '#a88c68', 'b': '#6b5440',
    'w': WOOD[4], 'W': WOOD[2], 'x': WOOD[1],
    's': STRAW[4], 'S': STRAW[2], 'z': STRAW[5],
    'e': SEED_PAL[4], 'E': SEED_PAL[2], 'q': SEED_PAL[5],
    'c': '#e8dcc8', 'C': '#b8a890',  # claw / bone
    'f': '#c69459', 'F': '#9c6b3e',  # paw fur
    'y': GLOW[3], 'Y': GLOW[2], 'k': METAL[1], 'K': METAL[2],
    'r': '#d0503c', 'R': '#7a2a20',
    'd': FLOOR[2], 'D': FLOOR[1], 'n': '#3a2414',
    'g': GRASS[3], 'G': GRASS[1],
}

TOOL_ICONS = {
    # 掘る: paw with big claws digging into soil
    'dig': [
        "................",
        "..........oo....",
        ".........ohho...",
        "..oo....ohhlo...",
        ".ohho..ohhlo....",
        ".ohhlo.ohlo..oo.",
        "..ohlo.ohlo.ohho",
        "..ohlo.ohlooohlo",
        "..ohlo.olo.ohlo.",
        "...olo..o..olo..",
        "....o......oo...",
        "......oooo......",
        "...oooddddooo...",
        ".oodddDdddddDoo.",
        "oDddDdddnddddDdo",
        ".oooooooooooooo.",
    ],
    # 通路: tunnel arch with arrows
    'tunnel': [
        "................",
        "....oooooooo....",
        "..ooddddddddoo..",
        ".oddnnnnnnnnddo.",
        "oddnnnnnnnnnnddo",
        "odnnnnnnnnnnnndo",
        "odnn........nndo",
        "odn...o..o...ndo",
        "odn..oho.oho.ndo",
        "odn.ohhhhhhhondo",
        "odn..oho.oho.ndo",
        "odn...o..o...ndo",
        "odn..........ndo",
        "oDDDDDDDDDDDDDDo",
        ".oooooooooooooo.",
        "................",
    ],
    # 寝床: straw nest
    'bed': [
        "................",
        "................",
        "................",
        "................",
        "......oooo......",
        "...oooSsszooo...",
        "..oSszSSSSzsSo..",
        ".oszSoooooosSzo.",
        ".oSsonnnnnnosSo.",
        "osSzonnnnnnozsSo",
        "oSsSsoooooosSzSo",
        "oSzsSszSsSzSsSSo",
        ".oSSsSSzSSsSSSo.",
        "..ooSSSSSSSSoo..",
        "....oooooooo....",
        "................",
    ],
    # 倉庫: sack of seeds
    'store': [
        "................",
        "......oooo......",
        ".....oSssSo.....",
        "......oSSo......",
        ".....oszzSo.....",
        "....osszzsSo....",
        "...osszzsssSo...",
        "..oszzsssssSSo..",
        "..oszsssssssSo..",
        ".oszssssssssSSo.",
        ".osssssssssSSSo.",
        ".oSsssssssSSSSo.",
        "..oSSSSSSSSSSo..",
        "...ooooooooooeo.",
        "............oEqo",
        ".............oo.",
    ],
    # 家具: lantern
    'furniture': [
        ".......oo.......",
        "......oKo.......",
        ".......o........",
        ".....oooooo.....",
        "....oKKKKKKo....",
        "....okYYYYko....",
        "....okYyyYko....",
        "....okYyhYko....",
        "....okYyyYko....",
        "....okYYYYko....",
        "....oKKKKKKo....",
        ".....oooooo.....",
        "................",
        "................",
        "................",
        "................",
    ],
    # 撤去: red cross over a pile
    'remove': [
        "................",
        ".oo.........oo..",
        "orro.......orro.",
        "orrro.....orrro.",
        ".orrro...orrro..",
        "..orrro.orrro...",
        "...orrrorrro....",
        "....orrrrro.....",
        "....orrrrro.....",
        "...orrrorrro....",
        "..orrro.orrro...",
        ".orrro...orrro..",
        "orrro.....orrro.",
        "orRo.......oRro.",
        ".oo.........oo..",
        "................",
    ],
}


def tool_icon(name):
    rows = [r[:16].ljust(16, '.') for r in TOOL_ICONS[name]]
    return grid(rows, ICON_LEG, 16, 16)


def cursor(kind):
    """16x16 grid cursor: corner brackets + translucent fill."""
    col = {'dig': ('#f2e2c2', (242, 226, 194, 50)), 'place': ('#9be07a', (155, 224, 122, 60)),
           'invalid': ('#e0503c', (224, 80, 60, 70))}[kind]
    im = Img(16, 16)
    for y in range(1, 15):
        for x in range(1, 15):
            im.px[y * 16 + x] = col[1]
    for (x0, y0, dx, dy) in ((0, 0, 1, 1), (15, 0, -1, 1), (0, 15, 1, -1), (15, 15, -1, -1)):
        for k in range(5):
            im.set(x0 + dx * k, y0, col[0])
            im.set(x0, y0 + dy * k, col[0])
    if kind == 'invalid':
        for k in range(4, 12):
            im.set(k, k, col[0])
            im.set(15 - k, k, col[0])
    if kind == 'dig':
        for (x, y) in ((6, 7), (7, 8), (8, 9), (9, 8), (10, 7), (7, 6), (9, 6)):
            im.set(x, y, '#c9a24a')
    return im
