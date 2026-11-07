# -*- coding: utf-8 -*-
"""
境界侵食：静養（せいよう）の体の意匠「デザイン案」（2026-11-07・利用者のデザイン案。病院のベッドから離れられない患者）。
道具・包み・重み・読み手は P17 と同じ（build_enemy.py）。骨はコードの静養（shinshoku/actor/models.js の buildSeiyou）＝rigs/seiyou.json。
姿勢（起きて前かがみ・眠る・覚醒して腕を伸ばす）はゲームの動き（anim.js の seiyouPose）が付ける。ベッドと点滴の柱は腰の骨に付ける（動かない）。

デザイン案から読んだ形：
  頭   つるりとした細長い頭。目の高さに皮の厚いひだが横にかぶさり（大きな閉じたまぶたのよう）、その下に小さな口の線
  体   やせた長い胴・前へ長く曲がる太い首・床に届くほど長く細い腕・とても長い指（指先が床に触れる）
  服   灰青色の病衣（短い袖・V えり・背中の縫い目・しわ）。下半身は布団の中
  ベッド  病院のベッド（マットレス・汚れた布団・左右の柵・頭と足の板・下の枠と昇降の X 字の脚・4 つの車輪）・点滴の柱と袋・腕へ伸びる管
意匠は独自（グロテスクにしすぎない・流血や欠損の表現はしない）。座標は glTF：Y 上・+Z 前・+X がキャラクターの左・m。
"""
import math

import numpy as np

import build_enemy as BE
import design_kiro as DK
import sdf as S

Part, B, lin, hash3, U, limb = BE.Part, BE.B, BE.lin, BE.hash3, BE.U, BE.limb
rotx, roty, rotz = BE.rotx, BE.roty, BE.rotz
tile, worn, claw_hand = DK.tile, DK.worn, DK.claw_hand

SKIN = 0xbab0b0
GOWN = 0x7c8898
GOWN_D = 0x5e6878
METAL = 0xb2aea4
PANEL = 0xc6bfae
MATT = 0xd2cbbb
SHEET = 0xcdc3ab
WHEEL = 0x3a3a3e


def seiyou(rig):
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    hc = np.array([0, 1.665, 0.012])
    P = []
    BED = ('rigid', 'hips')
    BX, BZ0, BZ1, TOP = 0.46, -1.0, 1.0, 0.64                                               # ベッドの半幅・頭側と足側の z・マットレスの上面

    # ── 頭：細長い卵形。目の高さに厚い皮のひだ（閉じた大きなまぶた）・その下の小さな口
    skull = U(S.ellipsoid(hc + [0, 0.02, -0.01], [0.085, 0.115, 0.1]), S.ellipsoid(hc + [0, -0.06, 0.03], [0.06, 0.055, 0.065]), k=0.04)
    under = S.ellipsoid(hc + [0, -0.035, 0.11], [0.07, 0.05, 0.05])                         # ひだの下のへこみ
    head = S.sub(skull, under, k=0.015)

    def fold(Q):                                                                           # 顔の前を横切る厚いひだ（前へ張り出して下へ垂れる）
        q = Q - (hc + [0, 0.0, 0.0])
        ang = np.arctan2(q[:, 0], q[:, 2])                                                   # 顔の前＝0
        rr = np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2)
        u = np.clip(np.abs(ang) / 1.05, 0, 1)
        yc = -0.004 - 0.022 * u ** 2                                                       # まん中が垂れ、端はさらに下がって頬へ溶ける
        th = 0.03 * (1 - 0.65 * u ** 2)                                                    # まん中が厚く、端は細い
        d_r = rr - (0.092 + 0.012 * (1 - u ** 2))
        d = np.sqrt(d_r ** 2 + ((q[:, 1] - yc) / 1.5) ** 2) - th
        return np.maximum(d, np.abs(ang) - 1.1)
    head = U(head, fold, k=0.03)                                                           # 額となめらかにつながる
    mouth = S.box(hc + [0, -0.088, 0.07], [0.016, 0.0016, 0.03], r=0.0012, rot=rotx(-0.3))
    head = S.sub(head, mouth, k=0.002)

    def head_col(V, N):
        c = tile(SKIN, V) * (0.94 + 0.06 * hash3(V * 10, 3))[:, None]
        q = V - hc
        ang = np.arctan2(q[:, 0], q[:, 2])
        u = np.clip(np.abs(ang) / 1.05, 0, 1)
        yc = -0.004 - 0.022 * u ** 2
        lower = (q[:, 1] < yc - 0.018) & (q[:, 1] > yc - 0.04) & (np.abs(ang) < 1.2) & (q[:, 2] > 0)
        c[lower] *= 0.7                                                                       # ひだの下の影
        c[(np.abs(q[:, 1] - yc + 0.004) < 0.0025) & (np.abs(ang) < 1.15) & (q[:, 2] > 0)] *= 0.6   # ひだの合わせ目の線
        c[(np.abs(q[:, 1] + 0.088) < 0.0022) & (np.abs(q[:, 0]) < 0.016) & (q[:, 2] > 0.05)] = lin(0x4a3c3e)   # 口の線
        return c
    P.append(Part('head', head, hc - 0.18, hc + 0.18, 0.0025, 'skin', head_col, ('rigid', 'head'), oth=1.0, faces=2600, sym=False))

    # ── 首：太く長い（背中の上から前へ出る）
    neck = U(S.round_cone(ch + [0, 0.12, -0.04], nk + [0, 0.02, 0.0], 0.07, 0.058), S.round_cone(nk + [0, 0.02, 0.0], hc + [0, -0.08, -0.01], 0.058, 0.05), k=0.03)
    for x in (0.03, -0.03):
        neck = U(neck, S.capsule(ch + [x, 0.16, 0.0], hc + [x * 0.8, -0.1, 0.02], 0.012), k=0.015)
    P.append(Part('neck', neck, ch + np.array([-0.2, 0.0, -0.2]), hc + np.array([0.2, 0.0, 0.2]), 0.0035, 'skin',
                  lambda V, N: tile(SKIN, V) * (0.92 + 0.08 * hash3(V * 9, 5))[:, None], 'body', ['chest', 'neck', 'head'], faces=1000))

    # ── 胴と病衣（やせた長い胴・短い袖・V えり・背中の縫い目）
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    torso = U(S.ellipsoid(ch + [0, 0.06, -0.01], [0.15, 0.2, 0.1]), S.ellipsoid(sp + [0, 0.05, 0.0], [0.13, 0.15, 0.09]),
              S.capsule(sh_l + [-0.03, -0.02, -0.01], sh_r + [0.03, -0.02, -0.01], 0.055), S.ellipsoid(hp + [0, 0.02, 0.0], [0.15, 0.09, 0.11]),
              S.ellipsoid(ch + [0, 0.14, -0.06], [0.13, 0.12, 0.08]), k=0.07)
    P.append(Part('chest_skin', S.inter(torso, lambda Q: (1.2) - Q[:, 1]), ch + np.array([-0.25, -0.2, -0.2]), ch + np.array([0.25, 0.3, 0.2]), 0.005, 'skin',
                  lambda V, N: tile(SKIN, V) * (0.92 + 0.08 * hash3(V * 8, 7))[:, None], 'body', ['spine', 'chest', 'neck'], faces=700))

    def vneck(Q):
        w = 0.02 + 0.09 * np.clip((Q[:, 1] - 1.2) / 0.22, 0, 1)
        return np.where((Q[:, 2] > 0.02) & (Q[:, 1] > 1.2), np.abs(Q[:, 0]) - w, 1.0)
    gown = S.sub(S.sub(S.offset(torso, 0.012), S.offset(torso, 0.001)), vneck)
    gown = S.inter(gown, lambda Q: (TOP + 0.04) - Q[:, 1])
    gown = lambda Q, f0=gown: f0(Q) - 0.004 * np.maximum(0, np.sin(Q[:, 0] * 70 + 2 * hash3(Q * 4, 9))) ** 3   # たるんだ縦じわ

    def gown_col(V, N):
        c = worn(tile(GOWN, V), V, 11, amt=0.14)
        c[(V[:, 2] < -0.04) & (np.abs(V[:, 0]) < 0.004)] = lin(GOWN_D)                          # 背中の縫い目
        c[(np.abs(V[:, 1] - (1.36 - 0.3 * np.abs(V[:, 0]))) < 0.003) & (np.abs(V[:, 0]) < 0.17)] *= 0.8   # 肩の縫い目
        return c
    P.append(Part('gown', gown, [-0.36, TOP - 0.05, -0.25], [0.36, 1.6, 0.25], 0.0055, 'cloth', gown_col, 'body', ['hips', 'spine', 'chest', 'neck'], faces=2400))

    # ── 腕：短い袖・床に届くほど長く細い腕・とても長い指
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        sx = 1 if s == 'left' else -1
        sleeve = S.inter(limb(ua + [0, 0.01, 0], ua + (la - ua) * 0.35, 0.06, 0.055), lambda Q, ua=ua: Q[:, 1] - (ua[1] - 0.2))
        P.append(Part(s + '_sleeve', sleeve, ua - [0.15, 0.3, 0.15], ua + [0.15, 0.1, 0.15], 0.004, 'cloth',
                      lambda V, N, seed=(13 if s == 'left' else 17): worn(tile(GOWN, V), V, seed, amt=0.14), 'body', [s + 'UpperArm', 'chest'], faces=500, sym=False))
        arm = U(limb(ua + [0, -0.02, 0], la, 0.036, 0.03), limb(la, ha + [0, 0.02, 0], 0.03, 0.022),
                S.sphere(la, 0.034), S.capsule(la + (ha - la) * 0.1 + [sx * 0.01, 0, 0.01], ha + [sx * 0.006, 0.05, 0.006], 0.008), k=0.015)   # ひじの骨・前腕の筋
        P.append(Part(s + '_arm', arm, ha - [0.12, 0.08, 0.12], ua + [0.12, 0.05, 0.12], 0.0035, 'skin',
                      lambda V, N: tile(SKIN, V) * (0.92 + 0.08 * hash3(V * 12, 19))[:, None], 'body', [s + 'UpperArm', s + 'LowerArm', s + 'Hand'], faces=900, sym=False))
        hp_ = claw_hand(ha, s, k=1.55)
        hp_.color = lambda V, N: tile(SKIN, V) * (0.93 + 0.07 * hash3(V * 20, 23))[:, None]
        hp_.faces = 700
        P.append(hp_)
        tape = S.box(la + [0, -0.03, 0.022], [0.025, 0.02, 0.004], r=0.002)                   # 点滴の針のテープ
        P.append(Part(s + '_tape', tape, la - 0.08, la + 0.08, 0.002, 'acc', 0xe4e0d4, ('rigid', s + 'LowerArm'), oth=0.3, faces=80, sym=False, ao=False))

    # ── ベッド（腰の骨に付く・動かない）
    mattress = S.box([0, TOP - 0.07, 0], [BX - 0.03, 0.07, (BZ1 - BZ0) / 2 - 0.03], r=0.04)
    P.append(Part('mattress', mattress, [-0.6, 0.4, -1.2], [0.6, 0.8, 1.2], 0.012, 'cloth', lambda V, N: worn(tile(MATT, V), V, 29, amt=0.18, scale=3), BED, oth=0.6, faces=500))

    def blanket(Q):                                                                        # 汚れた布団：足側から腰まで・脚のふくらみ・両脇へ垂れる・しわ
        slab = S.box([0, TOP + 0.02, 0.42], [BX + 0.02, 0.05, 0.6], r=0.04)(Q)
        legs = U(S.capsule([0.1, TOP + 0.06, 0.05], [0.12, TOP + 0.05, 0.9], 0.085), S.capsule([-0.1, TOP + 0.06, 0.05], [-0.12, TOP + 0.05, 0.9], 0.085), k=0.05)(Q)
        drape = S.box([0, TOP - 0.1, 0.42], [BX + 0.035, 0.14, 0.58], r=0.03)(Q)
        drape = np.maximum(drape, -(S.box([0, TOP - 0.1, 0.42], [BX + 0.0, 0.2, 0.62])(Q)))     # 両脇へ垂れる布（薄すぎると穴があく）
        d = np.minimum(S.union(lambda Q: slab, lambda Q: legs, k=0.05)(Q), drape)
        return d - 0.008 * hash3(Q * 5, 31) - 0.005 * np.maximum(0, np.sin(Q[:, 2] * 40 + Q[:, 0] * 12 + 3 * hash3(Q * 3, 33))) ** 2
    P.append(Part('blanket', blanket, [-0.6, 0.3, -0.3], [0.6, 0.9, 1.15], 0.0065, 'cloth',
                  lambda V, N: worn(tile(SHEET, V), V, 37, amt=0.25, scale=2.5) * (1 - 0.15 * np.clip(hash3(V * 1.6, 39), 0, 1))[:, None], BED, oth=0.7, faces=1800, sym=False))
    tubes = []
    for sx in (1, -1):
        x = sx * BX
        tubes += [S.capsule([x, TOP + 0.2, BZ0 + 0.25], [x, TOP + 0.2, BZ1 - 0.25], 0.014), S.capsule([x, TOP + 0.06, BZ0 + 0.25], [x, TOP + 0.06, BZ1 - 0.25], 0.012)]   # 柵
        for z in np.linspace(BZ0 + 0.3, BZ1 - 0.3, 9):
            tubes.append(S.capsule([x, TOP + 0.06, z], [x, TOP + 0.2, z], 0.009))
        tubes += [S.capsule([x - sx * 0.04, 0.42, BZ0 + 0.05], [x - sx * 0.04, 0.42, BZ1 - 0.05], 0.018)]   # 下の枠
        for z in (BZ0 + 0.06, BZ1 - 0.06):
            tubes.append(S.capsule([x - sx * 0.04, 0.12, z], [x - sx * 0.04, TOP + 0.26, z], 0.02))   # 四隅の脚（頭と足の板の柱）
        tubes += [S.capsule([sx * 0.25, 0.14, -0.55], [sx * 0.25, 0.42, 0.55], 0.014), S.capsule([sx * 0.25, 0.14, 0.55], [sx * 0.25, 0.42, -0.55], 0.014)]   # 昇降の X 字
    for z in (BZ0 + 0.06, BZ1 - 0.06):
        tubes += [S.capsule([-BX + 0.04, TOP + 0.26, z], [BX - 0.04, TOP + 0.26, z], 0.018), S.capsule([-BX + 0.04, 0.42, z], [BX - 0.04, 0.42, z], 0.016)]
    P.append(Part('bed_frame', U(*tubes, k=0.006), [-0.7, 0.0, -1.2], [0.7, 1.05, 1.2], 0.0055, 'metal',
                  lambda V, N: worn(tile(METAL, V), V, 41, amt=0.2, scale=6) * (1 - 0.25 * np.clip(hash3(V * 9, 43) - 0.4, 0, 1))[:, None], BED, oth=0.5, faces=2600, sym=False))
    panels = U(*[S.box([0, TOP + 0.08, z], [BX - 0.06, 0.15, 0.022], r=0.012) for z in (BZ0 + 0.06, BZ1 - 0.06)])   # 薄すぎると網を減らした時に割れる
    P.append(Part('bed_panels', panels, [-0.6, 0.4, -1.2], [0.6, 1.0, 1.2], 0.007, 'acc',
                  lambda V, N: worn(tile(PANEL, V), V, 47, amt=0.22, scale=4) * (1 - 0.2 * np.clip(hash3(V * 7, 49) - 0.3, 0, 1))[:, None], BED, oth=0.6, faces=500))
    wheels = []
    for sx in (1, -1):
        for z in (BZ0 + 0.06, BZ1 - 0.06):
            c = np.array([sx * (BX - 0.04), 0.065, z])
            wheels += [S.cylinder(c, 0.06, 0.022, rr=0.01, axis_rot=rotz(math.pi / 2)), S.box(c + [0, 0.06, 0], [0.025, 0.03, 0.03], r=0.006)]
    P.append(Part('wheels', U(*wheels), [-0.7, -0.01, -1.2], [0.7, 0.2, 1.2], 0.004, 'acc', lambda V, N: np.where((V[:, 1] > 0.1)[:, None], lin(METAL)[None], lin(WHEEL)[None]) * np.ones((len(V), 1)),
                  BED, oth=0.6, faces=800, sym=False))

    # ── 点滴の柱・袋・腕へ伸びる管
    px, pz = -BX - 0.08, BZ0 + 0.12
    pole = U(S.capsule([px, 0.06, pz], [px, 1.95, pz], 0.011), *[S.capsule([px, 0.06, pz], [px + 0.16 * math.cos(a), 0.03, pz + 0.16 * math.sin(a)], 0.009) for a in np.linspace(0, 2 * math.pi, 6)[:-1]],
             S.capsule([px - 0.07, 1.93, pz], [px + 0.07, 1.93, pz], 0.006), k=0.01)
    P.append(Part('iv_pole', pole, [px - 0.25, 0.0, pz - 0.25], [px + 0.25, 2.0, pz + 0.25], 0.004, 'metal', METAL, BED, oth=0.5, faces=700, sym=False))
    bag = S.box([px + 0.06, 1.74, pz], [0.05, 0.1, 0.018], r=0.015)
    P.append(Part('iv_bag', bag, [px - 0.1, 1.5, pz - 0.1], [px + 0.2, 1.95, pz + 0.1], 0.004, 'glow', 0xd8e4e4, BED, oth=0.4, faces=300, sym=False, ao=False))
    # 管：袋から柵の脇へ垂れる部分（ベッドに付く）と、腕のテープから出る短い部分（前腕に付く）に分ける（腕が動いても伸びない）
    pts = [np.array([px + 0.06, 1.62, pz]), np.array([px + 0.05, 1.25, pz + 0.12]), np.array([-BX - 0.03, 0.98, -0.45]), np.array([-BX - 0.04, 0.8, -0.2])]
    tube = U(*[S.capsule(pts[i], pts[i + 1], 0.0045) for i in range(len(pts) - 1)])
    P.append(Part('iv_tube', tube, [px - 0.15, 0.7, pz - 0.15], [-0.3, 1.7, 0.0], 0.003, 'glow', 0xc8d8d8, BED, oth=0.2, faces=300, sym=False, ao=False))
    rl, rh = B(rig, 'rightLowerArm'), B(rig, 'rightHand')
    tube2 = S.capsule(rl + [-0.005, -0.03, 0.026], rl + (rh - rl) * 0.35 + [-0.02, 0, 0.04], 0.0045)
    P.append(Part('iv_tube_arm', tube2, rl - 0.25, rl + 0.25, 0.003, 'glow', 0xc8d8d8, ('rigid', 'rightLowerArm'), oth=0.2, faces=150, sym=False, ao=False))
    return P


seiyou.hide_face = True
DESIGNS = {'seiyou': seiyou}
