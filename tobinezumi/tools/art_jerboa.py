"""トビネズミのドット絵（地上 3 方向・巣の横向き・影・立ち絵）

すべて「基準の毛色（砂色）」1 色分で描き、毛色 5 色は FUR_BASE の色を
FUR_PALETTES の同じ位置の色へ置き換えるだけで作れるようにしてある。
（FUR_BASE の色はトビネズミ以外の要素・目・輪郭などとは重複しない）
"""
from __future__ import annotations

import math
from pixart import Rig, Img, hx, bezier, OUTLINE

# ------------------------------------------------------------------ palette
# 並び： 毛(影, 暗, 中, 明), 腹(陰, 明), 耳の内側(暗, 明), 尾の房(黒)
FUR_KEYS = ['fur_shadow', 'fur_dark', 'fur_mid', 'fur_light', 'belly_shade', 'belly',
            'ear_dark', 'ear_light', 'tuft']
FUR_PALETTES = {
    # 砂色（基準）
    'sand': ['#6b4527', '#9c6b3e', '#c69459', '#e3bb85', '#d8c09c', '#f4e7cf', '#b9705c', '#e2a08c', '#3a271a'],
    # 淡黄
    'cream': ['#80633a', '#b8955a', '#dcbd80', '#f2dcaa', '#e2d3b2', '#fbf3df', '#c98572', '#efb5a0', '#4a3624'],
    # 赤茶
    'rufous': ['#5a2c16', '#8a4a25', '#b8703f', '#d99a65', '#d6b796', '#f1dfc6', '#a85e4c', '#d98c78', '#2e1a10'],
    # 灰褐
    'graybrown': ['#46392f', '#6d5d4e', '#958270', '#b9a791', '#cfc4b5', '#ebe4d9', '#a07468', '#cf9d90', '#2b221c'],
    # 白っぽい
    'white': ['#8a7b68', '#bcae98', '#ddd2c0', '#f3ece0', '#e4dccd', '#fcf9f2', '#d39a8c', '#f0bdb0', '#6a5a4a'],
}
FUR_LABELS = {'sand': '砂色', 'cream': '淡黄', 'rufous': '赤茶', 'graybrown': '灰褐', 'white': '白っぽい'}
FUR_ORDER = ['sand', 'cream', 'rufous', 'graybrown', 'white']
FUR_BASE = FUR_PALETTES['sand']
_F = dict(zip(FUR_KEYS, FUR_BASE))

EYE = '#140c08'
EYE_HI = '#fff8ea'
EYE_RIM = '#4a2e1c'
NOSE = '#c46a62'
CLAW = '#8a6a50'

RAMPS = {
    'fur': [hx(_F['fur_shadow']), hx(_F['fur_dark']), hx(_F['fur_mid']), hx(_F['fur_light'])],
    'belly': [hx(_F['belly_shade']), hx(_F['belly']), hx(_F['belly'])],
    'foot': [hx(_F['fur_dark']), hx(_F['belly_shade']), hx(_F['belly'])],
    'ear': [hx(_F['ear_dark']), hx(_F['ear_light']), hx(_F['ear_light'])],
    'tuft': [hx(_F['tuft']), hx(_F['tuft']), hx(_F['fur_shadow'])],
    'tip': [hx(_F['belly_shade']), hx(_F['belly']), hx(_F['belly'])],
}


def fur_map(name):
    """{base hex: target hex} for palette swap."""
    return dict(zip(FUR_BASE, FUR_PALETTES[name]))


def rot(px, py, cx, cy, deg):
    a = math.radians(deg)
    dx, dy = px - cx, py - cy
    return (cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a))


def _eye(r, x, y, closed=False, mirror=False):
    """3-tall eye with highlight; closed -> curved lash line."""
    x, y = int(x), int(y)
    if closed:
        r.dot(x, y + 1, EYE)
        r.dot(x + 1, y + 1, EYE)
        r.dot(x + (-1 if mirror else 2), y, EYE_RIM)
        return
    for ddx, ddy in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)):
        r.dot(x + ddx, y + ddy, EYE)
    r.dot(x + (1 if mirror else 0), y, EYE_HI)


# ================================================================== side view
SIDE_BASE = dict(
    # body (pear) : centre, radii, angle (deg, + = clockwise)
    bx=15.0, by=20.6, brx=5.6, bry=4.4, bang=-55,
    # head
    hx=19.6, hy=13.4, hrx=4.6, hry=4.0, hang=0,
    # snout direction offset
    sx=4.2, sy=1.0,
    # ear base (relative to head centre) and angle from vertical (neg = leaning back)
    ex=-1.8, ey=-2.4, eang=-28, elen=8.6, ewid=2.7, fear_ang=30, fear_dx=1.4,
    # haunch
    tx=13.6, ty=23.6, trx=3.8, try_=3.6, tang=-20,
    # near hind leg: heel and toe tip
    ax=12.4, ay=27.4, fx=21.0, fy=28.0, fr=1.05,
    # forearm: shoulder -> paw
    s1x=18.5, s1y=18.6, s2x=20.4, s2y=21.2,
    # tail control points (from rump)
    t0=(10.6, 24.2), t1=(5.5, 27.5), t2=(1.5, 26.5), t3=(2.6, 19.2),
    eye='open',
    far_leg_dx=1.2, far_leg_dy=-0.4,
    lean=0.0, ox=0, oy=0, hold=None, dirt=None, show_haunch=True, show_far_leg=True, tail_front=False,
)


def _lean(P):
    """Rotate the upper body (body, head, arms, ears) around the haunch."""
    d = P['lean']
    if not d:
        return P
    cx, cy = P['tx'], P['ty']
    for a, b in (('bx', 'by'), ('hx', 'hy'), ('s1x', 's1y'), ('s2x', 's2y')):
        P[a], P[b] = rot(P[a], P[b], cx, cy, d)
    P['bang'] += d
    P['eang'] += d
    sx, sy = rot(P['sx'], P['sy'], 0, 0, d)
    P['sx'], P['sy'] = sx, sy
    return P


def _tail(r, P):
    tail = bezier(P['t0'], P['t1'], P['t2'], P['t3'], n=16)
    r.capsule(tail, [1.15] + [0.85] * 6 + [0.7] * 10, 'fur', group='tail', shift=0.05)
    ex_, ey_ = tail[-1]
    pex, pey = tail[-4]
    L = math.hypot(ex_ - pex, ey_ - pey) or 1
    dx, dy = (ex_ - pex) / L, (ey_ - pey) / L
    r.capsule([(ex_ - dx * 0.5, ey_ - dy * 0.5), (ex_ + dx * 2.0, ey_ + dy * 2.0)], [1.25, 1.5], 'tuft',
              group='tuft', line=False)
    r.capsule([(ex_ + dx * 2.4, ey_ + dy * 2.4), (ex_ + dx * 3.6, ey_ + dy * 3.6)], [1.4, 1.0], 'tip',
              group='tuft', line=False)


def side_rig(p):
    P = dict(SIDE_BASE)
    P.update(p)
    P = _lean(P)
    r = Rig(32, 32, RAMPS)
    hxc, hyc = P['hx'], P['hy']
    # --- far ear
    ebx, eby = hxc + P['ex'] + P['fear_dx'], hyc + P['ey'] + 0.2
    fa = P['eang'] + P['fear_ang']
    a = math.radians(fa)
    etx, ety = ebx + math.sin(a) * P['elen'] * 0.95, eby - math.cos(a) * P['elen'] * 0.95
    fe = r.ellipse((ebx + etx) / 2, (eby + ety) / 2, P['ewid'] * 0.95, P['elen'] / 2 + 0.5, 'fur',
                   ang=fa, shift=-0.22, group='farear')
    r.ellipse((ebx + etx) / 2 + 0.6, (eby + ety) / 2 + 0.6, P['ewid'] * 0.45, P['elen'] / 2 - 0.8, 'ear',
              ang=fa, shift=-0.4, group='farear', clip=fe)
    if not P['tail_front']:
        _tail(r, P)
    # --- far hind leg (foot only, peeking)
    if P['show_far_leg']:
        fdx, fdy = P['far_leg_dx'], P['far_leg_dy']
        r.capsule([(P['ax'] + fdx, P['ay'] + fdy), (P['fx'] + fdx, P['fy'] + fdy)], [P['fr'], P['fr'] * 0.8],
                  'foot', shift=-0.35, group='farleg')
    # --- far forearm
    r.capsule([(P['s1x'] + 1.0, P['s1y'] - 0.2), (P['s2x'] + 1.2, P['s2y'] - 0.4)], 0.8, 'fur', shift=-0.3,
              group='fararm')
    # --- body
    body = r.ellipse(P['bx'], P['by'], P['brx'], P['bry'], 'fur', ang=P['bang'], group='body', dither=0.08)
    a = math.radians(P['bang'])
    bxo, byo = P['bx'] + math.cos(a + math.pi / 2) * 2.4 + 1.6, P['by'] + math.sin(a + math.pi / 2) * 2.4 + 0.6
    r.ellipse(bxo, byo, P['brx'] * 0.75, P['bry'] * 0.62, 'belly', ang=P['bang'], group='body', clip=body)
    # --- haunch + near hind leg
    if P['show_haunch']:
        r.ellipse(P['tx'], P['ty'], P['trx'], P['try_'], 'fur', ang=P['tang'], group='haunch', shift=0.04,
                  dither=0.08)
        r.capsule([(P['tx'] - 0.6, P['ty'] + 1.4), (P['ax'], P['ay'])], [1.6, 1.1], 'fur', group='haunch',
                  shift=-0.05)
    r.capsule([(P['ax'], P['ay']), (P['fx'], P['fy'])], [P['fr'], P['fr'] * 0.85], 'foot', group='foot')
    # --- head
    head = r.ellipse(hxc, hyc, P['hrx'], P['hry'], 'fur', ang=P['hang'], group='head', dither=0.08)
    sxc, syc = hxc + P['sx'] * 0.62, hyc + P['sy'] * 0.62 + 0.4
    r.ellipse(sxc, syc, 2.6, 2.3, 'fur', group='head', shift=0.06)
    r.ellipse(hxc + 2.2 + P['sx'] * 0.1, hyc + 2.9 + P['sy'] * 0.3, 2.6, 1.2, 'belly', group='head', clip=head)
    # --- near ear (outer fur + pink inner)
    ebx, eby = hxc + P['ex'], hyc + P['ey']
    a = math.radians(P['eang'])
    etx, ety = ebx + math.sin(a) * P['elen'], eby - math.cos(a) * P['elen']
    ecx, ecy = (ebx + etx) / 2, (eby + ety) / 2
    ear = r.ellipse(ecx, ecy, P['ewid'], P['elen'] / 2 + 0.7, 'fur', ang=P['eang'], group='ear')
    r.ellipse(ecx + math.cos(a) * 0.5 + 0.2, ecy + 0.6, P['ewid'] * 0.55, P['elen'] / 2 - 0.4, 'ear',
              ang=P['eang'], group='ear', clip=ear)
    if P['tail_front']:
        _tail(r, P)
    # --- near forearm (small, pale paw)
    r.capsule([(P['s1x'], P['s1y']), (P['s2x'], P['s2y'])], [1.0, 0.75], 'fur', group='arm', shift=0.05)
    r.pixel(P['s2x'] + 0.4, P['s2y'] + 0.3, 'belly', 0.9, group='arm')
    if P['hold']:
        hx_, hy_ = P['hold']
        r.dot(hx_, hy_, ITEM_SEED[0])
        r.dot(hx_ + 1, hy_, ITEM_SEED[1])
        r.dot(hx_, hy_ - 1, ITEM_SEED[1])
    # --- face
    _eye(r, hxc + 0.6 + P['sx'] * 0.04, hyc - 1.2 + P['sy'] * 0.2, closed=(P['eye'] != 'open'))
    r.dot(round(sxc + 2.3), round(syc - 0.3), NOSE)
    return r, P


ITEM_SEED = ['#8a5a2a', '#c99a52']
DIRT = ['#7a5434', '#a57a4e']


def side_frame(p):
    r, P = side_rig(p)
    img = r.resolve()
    if P['dirt']:
        for (x, y, k) in P['dirt']:
            img.set(x, y, DIRT[k])
            img.set(x + 1, y, DIRT[1 - k])
            if img.get(x, y + 1) is None:
                img.set(x, y + 1, OUTLINE)
            if img.get(x + 1, y + 1) is None:
                img.set(x + 1, y + 1, OUTLINE)
    if P['ox'] or P['oy']:
        n = Img(32, 32)
        n.paste(img, P['ox'], P['oy'])
        img = n
    return img


# side poses -----------------------------------------------------------------
CROUCH = dict(by=21.6, bry=4.2, brx=5.9, bang=-40, hx=20.4, hy=15.0, s1x=19.0, s1y=20.0, s2x=21.0,
              s2y=22.6, tx=13.4, ty=24.4, eang=-36, ax=11.6, ay=27.8)
PUSH = dict(lean=22, tx=13.0, ty=22.6, ax=10.2, ay=25.8, fx=12.6, fy=29.6, fr=1.0, eang=-40,
            t0=(10.0, 23.2), t1=(5.0, 24.0), t2=(1.5, 21.0), t3=(1.5, 15.5), far_leg_dx=-0.8, far_leg_dy=0.3)
AIR = dict(lean=30, tx=14.0, ty=21.6, trx=3.6, try_=3.3, ax=12.0, ay=25.4, fx=19.4, fy=25.8, eang=-48,
           t0=(10.5, 22.0), t1=(5.0, 21.5), t2=(1.0, 19.0), t3=(1.0, 13.0), s2x=22.4, s2y=19.6, oy=-1)
LAND = dict(lean=12, by=21.4, hy=14.8, tx=13.6, ty=24.2, ax=12.2, ay=27.6, fx=21.4, fy=28.0, eang=-34,
            s1x=19.4, s1y=19.4, s2x=22.0, s2y=22.6, t0=(10.5, 24.0), t1=(5.0, 26.5), t2=(1.5, 24.5),
            t3=(2.0, 17.6))


CLIMB = dict(bx=16.0, by=18.6, brx=6.0, bry=4.0, bang=-82, hx=18.0, hy=10.8, sx=3.8, sy=-1.4, eang=-52,
             s1x=19.0, s1y=15.0, tx=14.6, ty=23.0, trx=3.4, try_=3.4, tang=-70,
             t0=(13.0, 25.0), t1=(11.0, 30.0), t2=(6.5, 30.5), t3=(5.0, 25.5), far_leg_dx=0.4, far_leg_dy=1.6)


def _m(*ds, **kw):
    o = {}
    for d in ds:
        o.update(d)
    o.update(kw)
    return o


SIDE_POSES = {
    'idle': [_m(), _m(eang=-33, hy=13.6, by=20.8, t3=(3.2, 19.6))],
    'hop': [_m(CROUCH), _m(PUSH), _m(AIR), _m(LAND)],
    'walk': [_m(CROUCH), _m(PUSH), _m(AIR), _m(LAND)],
    'jump': [_m(CROUCH, by=22.2, hy=15.8, ty=25.0, eang=-40),
             _m(PUSH, lean=30, fx=11.6, fy=30.0, oy=-1),
             _m(AIR, lean=38, oy=-3, eang=-55, fx=18.4, fy=24.6),
             _m(LAND, lean=18)],
    'bigjump': [_m(CROUCH, by=22.4, hy=16.0, ty=25.2, eang=-40),
                _m(PUSH, lean=26, fx=12.0, fy=30.0),
                _m(PUSH, lean=36, ax=8.6, ay=24.6, fx=8.8, fy=29.5, eang=-55, oy=-2),
                _m(AIR, lean=40, eang=-60, oy=-3, ax=11.0, ay=24.4, fx=17.4, fy=24.8),
                _m(AIR, lean=20, eang=-40, oy=-2, ax=12.4, ay=26.0, fx=20.6, fy=27.0, s2y=21.6),
                _m(LAND, lean=14, by=22.0, hy=15.6)],
    'gather': [_m(lean=25, eang=-30),
               _m(lean=55, eang=-20, s2x=24.0, s2y=26.0, s1x=21.0, s1y=22.0),
               _m(lean=40, eang=-26, hold=(22, 21))],
    'dig': [_m(lean=50, eang=-55, s1x=20.5, s1y=21.0, s2x=24.0, s2y=27.0, dirt=[(6, 26, 0), (4, 24, 1)]),
            _m(lean=52, eang=-58, s1x=20.5, s1y=21.0, s2x=21.0, s2y=27.5, dirt=[(5, 23, 0), (3, 21, 1), (7, 27, 0)]),
            _m(lean=50, eang=-55, s1x=20.5, s1y=21.0, s2x=24.5, s2y=26.5, dirt=[(4, 20, 0), (6, 25, 1)]),
            _m(lean=52, eang=-58, s1x=20.5, s1y=21.0, s2x=21.5, s2y=27.8, dirt=[(3, 18, 1), (5, 22, 0)])],
    'eat': [_m(s2x=21.0, s2y=18.4, hold=(22, 18)),
            _m(s2x=21.0, s2y=18.0, hy=13.8, sy=1.4, hold=(22, 17), eye='closed'),
            _m(s2x=21.0, s2y=18.4, hold=(22, 18), eang=-32)],
    'climb': [_m(CLIMB, s2x=21.0, s2y=10.6, ax=15.4, ay=27.6, fx=20.2, fy=26.4),
              _m(CLIMB, s2x=21.6, s2y=14.0, ax=15.0, ay=25.6, fx=20.6, fy=23.2, oy=-1),
              _m(CLIMB, s2x=21.0, s2y=10.4, ax=15.4, ay=27.6, fx=20.2, fy=26.4, oy=-2, hy=10.2),
              _m(CLIMB, s2x=21.6, s2y=14.4, ax=15.0, ay=25.6, fx=20.6, fy=23.2, oy=-1)],
    'sleep': [_m(bx=15.5, by=22.8, brx=7.4, bry=4.8, bang=-6, hx=21.6, hy=23.0, hrx=4.0, hry=3.6, sx=2.2, sy=2.6,
                 ex=-2.4, ey=-1.4, eang=-80, elen=7.6, ewid=2.4, fear_ang=10, fear_dx=-0.6,
                 show_haunch=True, tx=12.0, ty=24.6, trx=4.2, try_=3.6, ax=13.0, ay=27.8, fx=18.0, fy=28.6,
                 s1x=20.0, s1y=26.6, s2x=21.0, s2y=27.8, show_far_leg=False,
                 t0=(9.0, 24.6), t1=(3.6, 30.0), t2=(16.0, 30.6), t3=(23.4, 28.2), eye='closed', tail_front=True),
              ],
}
SIDE_POSES['sleep'].append(_m(SIDE_POSES['sleep'][0], by=23.0, bry=4.6, brx=7.6, hy=23.2))

# ================================================================== front / back (field)
FB_BASE = dict(
    hx=16.0, hy=12.8, hrx=5.0, hry=4.3,
    espread=22.0, elen=8.6, ewid=2.8, ebx=2.5, eby=-2.4,
    bx=16.0, by=21.2, brx=5.0, bry=5.0,
    hox=4.7, hoy=24.0, hrx_=3.0, hry_=3.4,
    fox=4.3, fy0=26.4, fy1=29.2, fdx=0.6, fr=1.25,
    pax=1.9, pay=19.6,
    tail=[(19.0, 24.0), (25.5, 27.5), (30.0, 23.0), (28.0, 15.6)],
    eye='open', ox=0, oy=0, hold=None, dirt=None, head_down=0.0, tail_front=False,
)


def _tail_pts(r, pts, n=16):
    tail = bezier(*pts, n=n)
    r.capsule(tail, [1.15] + [0.85] * 6 + [0.7] * (n - 6), 'fur', group='tail', shift=0.05)
    ex_, ey_ = tail[-1]
    pex, pey = tail[-4]
    L = math.hypot(ex_ - pex, ey_ - pey) or 1
    dx, dy = (ex_ - pex) / L, (ey_ - pey) / L
    r.capsule([(ex_ - dx * 0.5, ey_ - dy * 0.5), (ex_ + dx * 2.0, ey_ + dy * 2.0)], [1.25, 1.5], 'tuft',
              group='tuft', line=False)
    r.capsule([(ex_ + dx * 2.4, ey_ + dy * 2.4), (ex_ + dx * 3.6, ey_ + dy * 3.6)], [1.4, 1.0], 'tip',
              group='tuft', line=False)


def _ears(r, P, back):
    for sgn in (-1, 1):
        bx_, by_ = P['hx'] + sgn * P['ebx'], P['hy'] + P['eby']
        ang = sgn * P['espread']
        a = math.radians(ang)
        tx_, ty_ = bx_ + math.sin(a) * P['elen'], by_ - math.cos(a) * P['elen']
        cx, cy = (bx_ + tx_) / 2, (by_ + ty_) / 2
        e = r.ellipse(cx, cy, P['ewid'], P['elen'] / 2 + 0.7, 'fur', ang=ang, group='ear%d' % sgn,
                      shift=(0.08 if back else 0.0))
        if back:
            # thin pink rim (light through the ear)
            r.ellipse(cx + sgn * 0.9, cy - 0.4, P['ewid'] * 0.35, P['elen'] / 2 - 0.6, 'ear', ang=ang,
                      group='ear%d' % sgn, clip=e, shift=-0.3)
        else:
            r.ellipse(cx + 0.0, cy + 0.5, P['ewid'] * 0.55, P['elen'] / 2 - 0.3, 'ear', ang=ang,
                      group='ear%d' % sgn, clip=e, shift=(0.0 if sgn > 0 else -0.25))


def fb_rig(p, back=False):
    P = dict(FB_BASE)
    P.update(p)
    r = Rig(32, 32, RAMPS)
    if not back and not P['tail_front']:
        _tail_pts(r, P['tail'])
    _ears(r, P, back)
    bs = 0.14 if back else 0.0
    # haunches + body
    for sgn in (-1, 1):
        r.ellipse(P['bx'] + sgn * P['hox'], P['hoy'], P['hrx_'], P['hry_'], 'fur', group='h%d' % sgn,
                  shift=0.02 + bs, dither=0.08)
    body = r.ellipse(P['bx'], P['by'], P['brx'], P['bry'], 'fur', group='body', dither=0.08, shift=bs)
    if not back:
        r.ellipse(P['bx'], P['by'] + 1.2, P['brx'] * 0.62, P['bry'] * 0.8, 'belly', group='body', clip=body)
    else:
        # darker spine
        r.ellipse(P['bx'] - 0.3, P['by'] - 0.6, P['brx'] * 0.35, P['bry'] * 0.8, 'fur', group='body',
                  clip=body, shift=0.0)
    # feet: long hind feet pointing at the viewer (front) / heels (back)
    for sgn in (-1, 1):
        x0 = P['bx'] + sgn * P['fox']
        r.capsule([(x0, P['fy0']), (x0 + sgn * P['fdx'], P['fy1'])], [P['fr'], P['fr'] * 1.05],
                  'foot' if not back else 'fur', group='f%d' % sgn, shift=(0 if not back else -0.1))
    if not back:
        for sgn in (-1, 1):
            r.ellipse(P['bx'] + sgn * P['pax'], P['pay'], 1.1, 1.3, 'belly', group='paw%d' % sgn)
    # head
    head = r.ellipse(P['hx'], P['hy'], P['hrx'], P['hry'], 'fur', group='head', dither=0.08, shift=bs)
    if not back:
        r.ellipse(P['hx'], P['hy'] + 2.2, 2.6, 1.9, 'belly', group='head', clip=head)
        r.ellipse(P['hx'], P['hy'] + 1.0, 1.8, 2.0, 'fur', group='head', clip=head, shift=0.12)
    if P['hold'] and not back:
        hx_, hy_ = P['hold']
        r.dot(hx_, hy_, ITEM_SEED[0])
        r.dot(hx_ + 1, hy_, ITEM_SEED[1])
    if not back:
        closed = P['eye'] != 'open'
        _eye(r, P['hx'] - 3.4, P['hy'] - 1.4, closed=closed)
        _eye(r, P['hx'] + 2.0, P['hy'] - 1.4, closed=closed, mirror=True)
        r.dot(int(P['hx']) - 1, int(P['hy'] + 1.6), NOSE)
        r.dot(int(P['hx']), int(P['hy'] + 1.6), NOSE)
    if back or P['tail_front']:
        _tail_pts(r, P['tail'])
    return r, P


def fb_frame(p, back=False):
    r, P = fb_rig(p, back)
    img = r.resolve()
    if P['dirt']:
        for (x, y, k) in P['dirt']:
            img.set(x, y, DIRT[k])
            img.set(x + 1, y, DIRT[1 - k])
            if img.get(x, y + 1) is None:
                img.set(x, y + 1, OUTLINE)
            if img.get(x + 1, y + 1) is None:
                img.set(x + 1, y + 1, OUTLINE)
    if P['ox'] or P['oy']:
        n = Img(32, 32)
        n.paste(img, P['ox'], P['oy'])
        img = n
    return img


FB_CROUCH = dict(by=22.0, hy=14.2, espread=32, hoy=24.6, fox=4.6, pay=20.6, bry=4.7)
FB_PUSH = dict(by=20.4, hy=11.8, espread=18, bry=5.4, hoy=23.6, fy0=26.6, fy1=29.8, fdx=0.2, pay=18.6)
FB_AIR = dict(by=20.6, hy=12.4, espread=38, hoy=23.2, fy0=25.2, fy1=27.0, fox=4.0, oy=-2, pay=19.0)
FB_LAND = dict(by=21.8, hy=13.6, espread=30, hoy=24.4, fox=4.8, fdx=1.0, pay=20.2)
FB_SLEEP = dict(bx=16.0, by=22.6, brx=7.0, bry=5.2, hx=16.0, hy=20.6, hrx=4.4, hry=3.6, espread=48, elen=5.0,
                ebx=2.4, eby=-1.0, hox=5.2, hoy=24.8, fy0=27.4, fy1=28.4, fox=4.0, pay=25.0, eye='closed',
                tail=[(21.0, 25.0), (26.0, 30.5), (14.0, 31.0), (7.0, 28.0)], tail_front=True)


def fb_poses(back):
    up = -1 if back else 1
    gather_d = dict(hy=12.8 + 4.0, espread=36, pay=25.0, by=21.6)
    return {
        'idle': [_m(), _m(espread=26, hy=13.1, tail=[(19.0, 24.0), (25.5, 27.5), (30.0, 22.5), (27.0, 15.6)])],
        'hop': [_m(FB_CROUCH), _m(FB_PUSH), _m(FB_AIR), _m(FB_LAND)],
        'bigjump': [_m(FB_CROUCH, by=22.6, hy=15.0, espread=34),
                    _m(FB_PUSH),
                    _m(FB_PUSH, espread=28, oy=-2, fy1=30.0),
                    _m(FB_AIR, espread=44, oy=-3),
                    _m(FB_AIR, espread=30, oy=-2, fy0=26.0, fy1=28.8),
                    _m(FB_LAND, by=22.4, hy=14.6)],
        'gather': [_m(hy=14.2, espread=28, pay=21.6),
                   _m(gather_d),
                   _m(hy=14.0, espread=28, pay=17.6, hold=(15, 17))],
        'dig': [_m(gather_d, pay=25.6, dirt=[(7, 27, 0), (25, 26, 1)]),
                _m(gather_d, pay=24.0, dirt=[(6, 24, 1), (26, 28, 0), (8, 29, 0)]),
                _m(gather_d, pay=25.6, dirt=[(5, 22, 0), (24, 25, 1)]),
                _m(gather_d, pay=24.0, dirt=[(4, 20, 1), (27, 23, 0), (9, 28, 1)])],
        'eat': [_m(pay=17.2, hold=(15, 16)),
                _m(pay=17.0, hold=(15, 16), hy=13.2, eye='closed'),
                _m(pay=17.2, hold=(15, 16), espread=25)],
        'sleep': [_m(FB_SLEEP), _m(FB_SLEEP, by=22.8, bry=5.0, brx=7.2, hy=20.8)],
    }


BACK_TAIL = [(16.5, 26.0), (19.0, 31.0), (26.5, 30.5), (28.5, 24.0)]


def back_poses():
    P = fb_poses(True)
    for k, frames in P.items():
        for f in frames:
            if k == 'sleep':
                f['tail'] = [(10.0, 25.0), (6.0, 30.5), (18.0, 31.0), (25.0, 28.0)]
            else:
                yo = f.get('oy', 0)
                f['tail'] = BACK_TAIL if 'tail' not in f or k != 'idle' else [(16.5, 26.0), (19.0, 31.0), (26.0, 30.8), (28.8, 24.5)]
                if k in ('hop', 'bigjump') and f.get('oy', 0) < 0:
                    f['tail'] = [(16.5, 26.0), (18.0, 30.0), (24.0, 30.0), (27.5, 25.5)]
            f['eye'] = 'open'
    return P


# ================================================================== portrait 128x128
def _ear_big(r, bx, by, ang, ln, wd, shift, grp, inner=True):
    a = math.radians(ang)
    tx, ty = bx + math.sin(a) * ln, by - math.cos(a) * ln
    cx, cy = (bx + tx) / 2, (by + ty) / 2
    e = r.ellipse(cx, cy, wd, ln / 2 + 2, 'fur', ang=ang, group=grp, shift=shift, dither=0.18)
    if inner:
        # inner pink, offset towards the viewer side, with a darker channel
        ix, iy = cx + math.cos(a) * 1.8, cy + math.sin(a) * 1.8 + 2
        r.ellipse(ix, iy, wd * 0.62, ln / 2 - 1.0, 'ear', ang=ang, group=grp, clip=e, shift=shift, dither=0.2)
        r.ellipse(ix - math.cos(a) * 1.5, iy + 4, wd * 0.22, ln / 2 - 9, 'ear', ang=ang, group=grp, clip=e,
                  shift=shift - 0.45)
    return e


def portrait_img():
    r = Rig(128, 128, RAMPS, ambient=0.16)
    # far ear
    _ear_big(r, 80.0, 31.0, 14, 31, 10.0, -0.2, 'fear')
    # tail
    tail = bezier((42.0, 100.0), (18.0, 124.0), (2.0, 114.0), (9.0, 80.0), n=40)
    r.capsule(tail, [3.6] + [3.0] * 8 + [2.5] * 16 + [2.2] * 16, 'fur', group='tail', dither=0.15)
    ex_, ey_ = tail[-1]
    pex, pey = tail[-6]
    L = math.hypot(ex_ - pex, ey_ - pey)
    dx, dy = (ex_ - pex) / L, (ey_ - pey) / L
    r.capsule([(ex_ - dx * 1.0, ey_ - dy * 1.0), (ex_ + dx * 8.0, ey_ + dy * 8.0)], [3.0, 5.6], 'tuft',
              group='tuft', line=False, dither=0.2)
    r.capsule([(ex_ + dx * 9.5, ey_ + dy * 9.5), (ex_ + dx * 15.0, ey_ + dy * 15.0)], [5.4, 2.0], 'tip',
              group='tuft', line=False, dither=0.2)
    # far hind foot + far forearm
    r.capsule([(52.0, 111.0), (86.0, 113.0)], [3.6, 3.0], 'foot', group='farfoot', shift=-0.3)
    r.capsule([(80.0, 70.0), (89.0, 81.0)], [3.6, 2.6], 'fur', group='fararm', shift=-0.25)
    # body
    body = r.ellipse(61.0, 78.0, 22.0, 17.0, 'fur', ang=-58, group='body', dither=0.22)
    r.ellipse(76.0, 82.0, 9.5, 15.0, 'belly', ang=-18, group='body', clip=body, dither=0.4, shift=-0.05)
    # haunch + leg
    r.ellipse(52.0, 93.0, 15.5, 14.5, 'fur', ang=-25, group='haunch', dither=0.22, shift=0.04)
    r.capsule([(48.0, 100.0), (44.0, 112.0)], [7.0, 4.4], 'fur', group='haunch', shift=-0.03, dither=0.2)
    r.capsule([(42.0, 111.0), (60.0, 114.5), (82.0, 116.5)], [5.0, 3.6, 2.6], 'foot', group='foot', dither=0.3)
    for k in range(3):
        r.ellipse(83.5 + k * 0.4, 114.4 + k * 1.7, 2.6, 1.3, 'foot', group='foot', shift=0.05)
    # head
    head = r.ellipse(76.0, 46.0, 18.5, 16.0, 'fur', ang=-6, group='head', dither=0.22)
    r.ellipse(92.0, 52.5, 10.5, 8.6, 'fur', ang=8, group='head', shift=0.06, dither=0.2)
    r.ellipse(88.0, 60.5, 9.0, 4.2, 'belly', ang=10, group='head', clip=head, dither=0.25)
    r.ellipse(96.5, 57.0, 5.4, 3.2, 'belly', ang=8, group='head', dither=0.25)
    # pale eye ring
    r.ellipse(83.0, 41.0, 7.4, 8.0, 'fur', group='head', clip=head, shift=0.25)
    # near ear
    _ear_big(r, 66.0, 33.0, -20, 33, 11.0, 0.0, 'ear')
    # near forearm
    r.capsule([(74.0, 68.0), (78.0, 77.0), (84.0, 82.0)], [4.2, 3.4, 2.6], 'fur', group='arm', dither=0.2)
    r.ellipse(85.5, 83.0, 2.6, 2.0, 'belly', group='arm')
    img = r.resolve(line_mat_drop=1)
    # eye
    ex, ey = 83, 41
    for y in range(-6, 7):
        for x in range(-5, 6):
            d = (x / 5.2) ** 2 + (y / 5.8) ** 2
            if d <= 1.0:
                img.set(ex + x, ey + y, EYE if d < 0.72 else EYE_RIM)
    for (x, y) in ((-2, -3), (-1, -3), (-2, -2), (-1, -2), (-3, -2), (-2, -1)):
        img.set(ex + x, ey + y, EYE_HI)
    img.set(ex + 2, ey + 2, '#c8b8a8')
    img.set(ex + 2, ey + 3, '#c8b8a8')
    # nose + mouth
    for (x, y) in ((101, 49), (102, 49), (100, 50), (101, 50), (102, 50), (101, 51)):
        img.set(x, y, NOSE)
    img.set(101, 48, '#e59a90')
    for (x, y) in ((100, 53), (99, 54), (98, 55), (97, 55), (96, 55)):
        img.set(x, y, '#8a5a40')
    # whiskers
    for (x0, y0, x1, y1) in ((96, 52, 120, 46), (96, 53, 122, 54), (95, 54, 117, 61)):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for t in range(1, n):
            x = round(x0 + (x1 - x0) * t / n)
            y = round(y0 + (y1 - y0) * t / n)
            if img.get(x, y) is None:
                img.set(x, y, '#d8c8b4' if t % 5 else '#bba78e')
    # claws
    for (x, y) in ((88, 113), (88, 116), (88, 119), (90, 85), (88, 87)):
        if img.get(x, y) is None or img.get(x, y)[:3] == hx(OUTLINE)[:3]:
            img.set(x, y, CLAW)
    # fur tufts on the silhouette (chest, cheek, haunch)
    # toe splits
    for (x, y) in ((84, 115), (85, 117), (79, 114), (80, 116)):
        img.set(x, y, _F['fur_dark'])
    return img


def portraits():
    base = portrait_img()
    out = {}
    for f in FUR_ORDER:
        out[f] = base.copy().recolor(fur_map(f))
    return out


FIELD_ANIMS = ['idle', 'hop', 'bigjump', 'gather', 'dig', 'eat', 'sleep']
SIDE_ANIMS = ['idle', 'walk', 'jump', 'climb', 'gather', 'eat', 'sleep']


def field_frames(anim):
    """-> {'down': [Img..], 'up': [...], 'side': [...]} (side faces right)."""
    return {
        'down': [fb_frame(p) for p in fb_poses(False)[anim]],
        'up': [fb_frame(p, back=True) for p in back_poses()[anim]],
        'side': [side_frame(p) for p in SIDE_POSES[anim]],
    }


def shadow():
    im = Img(16, 8)
    for y in range(8):
        for x in range(16):
            d = ((x + 0.5 - 8) / 7.5) ** 2 + ((y + 0.5 - 4) / 3.4) ** 2
            if d <= 1:
                a = 110 if d < 0.55 else 70
                im.px[y * 16 + x] = (0x2a, 0x1a, 0x10, a)
    return im


# ------------------------------------------------------------------ quick preview
if __name__ == '__main__':
    import sys
    from pixart import hstack, vstack
    rows = []
    for a in FIELD_ANIMS:
        ff = field_frames(a)
        for d in ('down', 'up', 'side'):
            rows.append(hstack(ff[d], gap=2))
    im = vstack(rows)
    bg = Img(im.w, im.h, '#d9ab6f')
    bg.paste(im, 0, 0)
    bg.to_pil().resize((bg.w * 5, bg.h * 5), 0).save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/j.png')
