"""Ver.0.4「いのちをつなぐ」の素材：子ども（地上 3 方向・巣の横向き：idle / hop / sleep）、野生のトビネズミの「立ち上がって見る」姿、
信頼のハート、形質のアイコン、家系図の額縁。

トビネズミと同じ部位の組み立て（art_jerboa の Rig と姿勢）を、足元 (16, 29) を中心に縮めて、頭を大きく・耳と脚と尾を短くして子どもにする。
色はすべて基準の毛色（砂色）の FUR_BASE で描くので、ゲームは毛色 5 色・濃淡・斑へ差し替えられる（fur.palettes と同じ）。
"""
from __future__ import annotations

import math

from pixart import Img, grid, hx, OUTLINE
import art_jerboa as J

AX, AY = 16.0, 29.0     # 足元（anchor）


def _sc(v, k, c):
    return c + (v - c) * k


def _pt(p, k):
    return (_sc(p[0], k, AX), _sc(p[1], k, AY))


# ------------------------------------------------------------------ side（横向き・右向き）
SIDE_PTS = [('bx', 'by'), ('hx', 'hy'), ('tx', 'ty'), ('ax', 'ay'), ('fx', 'fy'), ('s1x', 's1y'), ('s2x', 's2y')]
SIDE_LEN = ['brx', 'bry', 'trx', 'try_', 'ewid', 'fr', 'ex', 'ey', 'sx', 'sy', 'far_leg_dx', 'far_leg_dy']


def pup_side_pose(p, k=0.66, head=1.32, ear=0.62, tail=0.8):
    """大人の横向きの姿勢 → 子ども（全体を k 倍・頭は head 倍・耳は ear 倍・尾は短め）"""
    P = dict(J.SIDE_BASE)
    P.update(p)
    lean = P.get('lean', 0)
    for a, b in SIDE_PTS:
        P[a], P[b] = _pt((P[a], P[b]), k)
    for key in SIDE_LEN:
        P[key] = P[key] * k
    # 頭：大きく、体に寄せる
    P['hrx'] *= k * head
    P['hry'] *= k * head
    P['hy'] += 1.2
    P['hx'] -= 0.4
    P['elen'] *= k * ear * 1.25
    P['ewid'] *= 1.15
    P['eang'] = P['eang'] - 12      # 耳を寝かせぎみ（子どもらしく）
    # 尾：付け根から短く
    t0 = _pt(P['t0'], k)
    for i, key in enumerate(('t0', 't1', 't2', 't3')):
        q = _pt(P[key], k)
        P[key] = (t0[0] + (q[0] - t0[0]) * tail, t0[1] + (q[1] - t0[1]) * tail)
    P['lean'] = lean
    if 'hold' in P:
        P['hold'] = None
    if P.get('dirt'):
        P['dirt'] = None
    if P.get('oy'):
        P['oy'] = int(round(P['oy'] * k))
    return P


def pup_side_frame(p):
    P = pup_side_pose(p)
    r, P2 = J.side_rig(P)
    img = r.resolve()
    if P2['oy']:
        n = Img(32, 32)
        n.paste(img, 0, P2['oy'])
        img = n
    return img


# ------------------------------------------------------------------ front / back（地上：下向き・上向き）
FB_PTS = [('hx', 'hy'), ('bx', 'by')]
FB_LEN = ['brx', 'bry', 'ewid', 'ebx', 'eby', 'hrx_', 'hry_', 'fr', 'pax']


def pup_fb_pose(p, k=0.66, head=1.3, ear=0.66):
    P = dict(J.FB_BASE)
    P.update(p)
    P['hx'], P['hy'] = _pt((P['hx'], P['hy']), k)
    P['bx'], P['by'] = _pt((P['bx'], P['by']), k)
    for key in FB_LEN:
        P[key] = P[key] * k
    P['hox'] *= k
    P['hoy'] = _sc(P['hoy'], k, AY)
    P['fox'] *= k
    P['fy0'] = _sc(P['fy0'], k, AY)
    P['fy1'] = _sc(P['fy1'], k, AY)
    P['pay'] = _sc(P['pay'], k, AY)
    P['hrx'] *= k * head
    P['hry'] *= k * head
    P['hy'] += 1.0
    P['elen'] *= k * ear * 1.2
    P['ewid'] *= 1.2
    P['espread'] = P['espread'] + 10
    P['tail'] = [_pt(q, k) for q in P['tail']]
    P['hold'] = None
    P['dirt'] = None
    if P.get('oy'):
        P['oy'] = int(round(P['oy'] * k))
    return P


def pup_fb_frame(p, back=False):
    P = pup_fb_pose(p)
    r, P2 = J.fb_rig(P, back)
    img = r.resolve()
    if P2['oy']:
        n = Img(32, 32)
        n.paste(img, 0, P2['oy'])
        img = n
    return img


PUP_FIELD_ANIMS = ['idle', 'hop', 'sleep']
PUP_SIDE_ANIMS = ['idle', 'walk', 'sleep']


def pup_field_frames(anim):
    return {
        'down': [pup_fb_frame(p) for p in J.fb_poses(False)[anim]],
        'up': [pup_fb_frame(p, back=True) for p in J.back_poses()[anim]],
        'side': [pup_side_frame(p) for p in J.SIDE_POSES[anim]],
    }


def pup_side_frames(anim):
    return [pup_side_frame(p) for p in J.SIDE_POSES[anim]]


# ------------------------------------------------------------------ 野生のトビネズミ：後ろ脚で立ち上がって見る（気になる・警戒）
SNIFF_SIDE = [
    dict(lean=-34, eang=-8, hy=11.6, by=19.6, t3=(1.0, 21.0), s2x=21.2, s2y=17.8),
    dict(lean=-38, eang=-2, hy=11.0, by=19.4, t3=(0.8, 20.4), s2x=21.0, s2y=17.0, sy=0.2),
]
SNIFF_FRONT = [
    dict(hy=10.2, by=19.6, bry=5.6, espread=12, pay=16.6, elen=9.4),
    dict(hy=9.8, by=19.4, bry=5.7, espread=8, pay=16.0, elen=9.6),
]


def wild_sniff_frames():
    return {
        'down': [J.fb_frame(p) for p in SNIFF_FRONT],
        'up': [J.fb_frame(dict(p, tail=J.BACK_TAIL), back=True) for p in SNIFF_FRONT],
        'side': [J.side_frame(p) for p in SNIFF_SIDE],
    }


# ------------------------------------------------------------------ 信頼のハート（0 / 25 / 50 / 75 / 100）
HEART = [
    ".kk.kk.",
    "kRRkRRk",
    "kRrRRRk",
    "kRRRRRk",
    ".kRRRk.",
    "..kRk..",
    "...k...",
]


def heart(level):
    """level 0..4（下から満ちる）"""
    img = Img(7, 7)
    fill_rows = {0: 0, 1: 2, 2: 3, 3: 5, 4: 7}[level]
    for y, row in enumerate(HEART):
        for x, ch in enumerate(row):
            if ch == 'k':
                img.set(x, y, OUTLINE)
            elif ch in 'Rr':
                filled = (6 - y) < fill_rows or level == 4
                if filled:
                    img.set(x, y, '#ffd8e0' if ch == 'r' else '#e8485a')
                else:
                    img.set(x, y, '#6a4a4a' if ch == 'r' else '#4a3436')
    return img


def sparkle():
    return grid([
        "..y..",
        ".yWy.",
        "yWWWy",
        ".yWy.",
        "..y..",
    ], {'y': '#ffd860', 'W': '#fffbe8'})


# ------------------------------------------------------------------ 形質のアイコン（10×10）：耳・脚・尾・体・毛色・斑・♀・♂・子ども・つれあい
def _icon(rows, extra=None):
    pal = {'k': OUTLINE, 'f': J.FUR_BASE[2], 'F': J.FUR_BASE[1], 'l': J.FUR_BASE[3], 'p': J.FUR_BASE[7], 'P': J.FUR_BASE[6],
           'b': J.FUR_BASE[5], 't': J.FUR_BASE[8], 'w': '#fbf6ec', 'r': '#e8485a', 'B': '#5aa0e0', 'y': '#ffd860'}
    if extra:
        pal.update(extra)
    return grid(rows, pal, 10, 10)


TRAIT_ICONS = {
    'ear': [
        "..kk..kk..",
        ".kfpk.kpfk",
        ".kfpk.kpfk",
        ".kfpkkkpfk",
        ".kfpfffpfk",
        "..kfffffk.",
        "..kfkfkfk.",
        "..kfffffk.",
        "...kkkkk..",
        "..........",
    ],
    'leg': [
        "....kk....",
        "...kffk...",
        "...kffk...",
        "....kfk...",
        "....kfk...",
        "....kfk...",
        "....kFk...",
        "....kFkk..",
        "....kFFFk.",
        ".....kkk..",
    ],
    'tail': [
        "......kkk.",
        ".....ktttk",
        "......ktwk",
        ".....kFkk.",
        "....kFk...",
        "...kFk....",
        "..kFk.....",
        ".kFk......",
        "kFk.......",
        ".k........",
    ],
    'size': [
        "..........",
        "...kkkk...",
        "..kffffk..",
        ".kfllllfk.",
        "kffllllffk",
        "kfffffffkk",
        "kfffffffk.",
        ".kffffffk.",
        "..kkkkkk..",
        "..........",
    ],
    'fur': [
        "..........",
        "..kkkkkk..",
        ".kllllllk.",
        "kllfflllFk",
        "klfffllFFk",
        "kfffflFFFk",
        "kFfffFFFFk",
        ".kFFFFFFk.",
        "..kkkkkk..",
        "..........",
    ],
    'pied': [
        "..........",
        "..kkkkkk..",
        ".kwwfffwk.",
        "kwwwfffwwk",
        "kffwwwwffk",
        "kfffwwfffk",
        "kwwffwwwwk",
        ".kwwffwwk.",
        "..kkkkkk..",
        "..........",
    ],
    'female': [
        "..kkkkk...",
        ".krrrrrk..",
        "krk...krk.",
        "krk...krk.",
        ".krrrrrk..",
        "..kkrkk...",
        "...krk....",
        ".kkkrkkk..",
        ".krrrrrk..",
        "..kkrkk...",
    ],
    'male': [
        ".....kkkkk",
        "......kBBk",
        ".....kBkBk",
        "..kkkBk.kk",
        ".kBBBBk...",
        "kBk..kBk..",
        "kBk..kBk..",
        "kBk..kBk..",
        ".kBBBBk...",
        "..kkkk....",
    ],
    'pup': [
        "..........",
        "..k....k..",
        ".kpk..kpk.",
        ".kfkkkkfk.",
        "kffffffffk",
        "kfkffffkfk",
        "kffffffffk",
        ".kffppffk.",
        "..kkkkkk..",
        "..........",
    ],
    'mate': [
        "..........",
        ".kk.kk....",
        "krrkrrk...",
        "krrrrrk...",
        ".krrrk.kk.",
        "..krk.kyyk",
        "...k.kyyyk",
        "......kyk.",
        ".......k..",
        "..........",
    ],
}
TRAIT_ORDER = ['ear', 'leg', 'tail', 'size', 'fur', 'pied', 'female', 'male', 'pup', 'mate']


def trait_icons():
    return [_icon(TRAIT_ICONS[k]) for k in TRAIT_ORDER]


# ------------------------------------------------------------------ 家系図の額縁（9 スライス・24×24・角 6px）
def lineage_frame(current=False):
    gold = '#e8c060' if current else '#c9a24a'
    pal = {'k': '#140c08', 'g': gold, 'G': '#8a6a2a', 'l': '#d9c3a0', 'm': '#a88c68', 'd': '#3a2a1e', 'D': '#2a1d15', 'v': '#5a7a3a'}
    rows = [
        "..kkkkkkkkkkkkkkkkkkkk..",
        ".kGggggggggggggggggggGk.",
        "kGgllllllllllllllllllgGk",
        "kglmmmmmmmmmmmmmmmmmmlgk",
        "kglmkkkkkkkkkkkkkkkkmlgk",
        "kglmkddddddddddddddkmlgk",
    ]
    mid = "kglmkDDDDDDDDDDDDDDkmlgk"
    bottom = list(reversed([r.replace('G', 'g') if i < 2 else r for i, r in enumerate(rows)]))
    rows = rows + [mid] * 12 + bottom
    img = grid(rows, pal, 24, 24)
    # 小さな葉の飾り（上の真ん中）
    for (x, y) in ((11, 0), (12, 0), (10, 1), (13, 1)):
        img.set(x, y, '#7aa04a')
    return img


def build(B, strip):
    """make_assets.py から呼ぶ：manifest のキーと PNG"""
    from pixart import hstack, vstack
    for anim in PUP_FIELD_ANIMS:
        ff = pup_field_frames(anim)
        img = vstack([hstack(ff[d]) for d in ('down', 'up', 'side')])
        B.put('pup.field.%s' % anim, 'family/pup_field_%s.png' % anim, img,
              {'cell': [32, 32], 'frames': len(ff['down']), 'dirs': ['down', 'up', 'side'],
               'fps': {'idle': 3, 'hop': 10, 'sleep': 1.5}[anim], 'loop': True, 'anchor': [16, 29], 'side_faces': 'right'})
    for anim in PUP_SIDE_ANIMS:
        frames = pup_side_frames(anim)
        B.put('pup.side.%s' % anim, 'family/pup_side_%s.png' % anim, hstack(frames),
              {'cell': [32, 32], 'frames': len(frames), 'fps': {'idle': 3, 'walk': 10, 'sleep': 1.5}[anim], 'loop': True,
               'anchor': [16, 29], 'faces': 'right'})
    ws = wild_sniff_frames()
    B.put('jerboa.field.sniff', 'family/wild_sniff.png', vstack([hstack(ws[d]) for d in ('down', 'up', 'side')]),
          {'cell': [32, 32], 'frames': 2, 'dirs': ['down', 'up', 'side'], 'fps': 2, 'loop': True, 'anchor': [16, 29], 'side_faces': 'right',
           'note': '野生のトビネズミが立ち上がってこちらを見る（気になる）'})
    strip('ui.heart', 'family/heart.png', [heart(i) for i in range(5)], {'anchor': [3, 6], 'names': ['0', '25', '50', '75', '100']})
    strip('ui.sparkle', 'family/sparkle.png', [sparkle()], {'anchor': [2, 2]})
    strip('ui.traits', 'family/traits.png', trait_icons(), {'names': TRAIT_ORDER})
    img = lineage_frame(False)
    B.put('ui.lineage_frame', 'family/lineage_frame.png', hstack([img, lineage_frame(True)]),
          {'cell': [24, 24], 'variants': 2, 'names': ['normal', 'current'], 'slice': [6, 6, 6, 6]})
