# -*- coding: utf-8 -*-
"""
境界侵食 P18：残りの異形の体を Blender（bpy・頭なし）で作り直す意匠。道具・包み・重み・読み手は P17 と同じ（build_enemy.py）。
  応答体（outou）    研究施設の白く細長い人影。磁器の人形のような継ぎ目の体・球の関節・顔の縦の裂け目（光る）・首の拘束の輪とボルト・
                     肩に刺さった槽のガラス片・背中の差し込み口から垂れる配線（先が光る）・頭の上の応答灯の輪（弱点）・手首の札・足首の輪
  継接（tsugihagi）  第5章のボス。色の違う布を継ぎ合わせたぬいぐるみのような大きな体（縫い目の溝・継ぎ当て）・3 つの白い仮面（目の群れ・縫った口）・
                     長い右腕と大きな拳・鞄を抱く左腕・人の脚 2 本と細い節の脚 2 本・背の触腕（目の列）・腹の小さな手・背骨の突起
  塗替（nurikae）    第6章A のボス（12 倍で置く）。町の夜の物の寄り集まり：電柱の脚と変圧器のひざ・巻き上げたシャッターの腰・
                     シャッターを積んだ胴・胸の開いた変圧器（コイルが光る）・街灯を束ねた冠・垂れた看板の顔・電線の腕（がいし）・背の看板・電線の尾
  当直（touchoku）   第6章B のボス。夜勤の保全員：作業着（反射の帯・胸のポケット・ファスナー）・作業帽と作業灯・計器の顔（文字盤はコードの顔の札）・
                     右前腕と一体の大きなレンチ・左手と一体の点検表（紙はコードの顔の札）・背の配管と弁の輪・脚に絡むホース・安全靴
骨・動き（actor/anim*.js）・弱点・光る目・顔の札（faceMesh）・炎や垂れる光（glowMesh）はコードのまま。差し替えるのは本体の網と輪郭線だけ。
意匠は独自（グロテスクにしない・流血や欠損の表現はしない）。
座標は glTF：Y 上・+Z 前・+X がキャラクターの左・m。
"""
import math

import numpy as np

import build_enemy as BE
import sdf as S

Part, B, lin, hash3, U, limb, hand = BE.Part, BE.B, BE.lin, BE.hash3, BE.U, BE.limb, BE.hand
rotx, roty, rotz = BE.rotx, BE.roty, BE.rotz


def tile(h, V):
    return np.tile(lin(h), (len(V), 1))


def chain_pts(rig, prefix, n, tip=None):
    pts = [B(rig, prefix + str(i)) for i in range(n)]
    if tip is not None:
        pts.append(pts[-1] + np.asarray(tip, float))
    return pts


def tube(pts, r0, r1, k=0.0):
    """点の列を太さ r0→r1 でつなぐ（丸い円すいの和）"""
    n = len(pts) - 1
    fs = [S.round_cone(pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n) for i in range(n)]
    return U(*fs, k=k)


def bbox_of(pts, pad):
    P = np.array(pts, float)
    return P.min(0) - pad, P.max(0) + pad


def ring_bands(V, axis_val, period, width):
    return (np.abs(((axis_val / period) % 1.0) - 0.5) * 2 > 1 - width)


# ───────────────────────── 応答体
def outou(rig):
    SK, SK2, SEAM, JOINT = 0xdfe2ea, 0xb9bfcb, 0x6a4a9a, 0xa8aebb
    hp, sp, ch, nk = B(rig, 'hips'), B(rig, 'spine'), B(rig, 'chest'), B(rig, 'neck')
    hc = np.array([0, 1.728, -0.004])
    P = []

    def porcelain(V, N, base=SK):
        c = tile(base, V)
        c *= (0.95 + 0.05 * hash3(V * 2.4, 2))[:, None]
        # 板の継ぎ目（細い暗い線：胸の横・腹の横・背の縦）
        seam = (np.abs(V[:, 1] - 1.22) < 0.0035) | (np.abs(V[:, 1] - 1.05) < 0.0035) | ((np.abs(V[:, 0]) < 0.0035) & (V[:, 2] < -0.03))
        c[seam] = lin(0x8a8a9c)
        front = (np.abs(V[:, 0]) < 0.0045) & (V[:, 2] > 0.02) & (V[:, 1] > 1.0) & (V[:, 1] < 1.5)
        c[front] = lin(SEAM)                                                               # 前の紫の縫い目
        return c
    # 頭：卵形・後ろが長い・あごは細い・顔に縦の溝
    head = U(S.ellipsoid(hc, [0.098, 0.124, 0.104]), S.ellipsoid(hc + [0, 0.02, -0.03], [0.092, 0.11, 0.1]), S.ellipsoid(hc + [0, -0.07, 0.03], [0.062, 0.06, 0.07]), k=0.05)
    head = S.sub(head, S.box(hc + [0, -0.005, 0.105], [0.011, 0.085, 0.03], r=0.009), k=0.008)

    def head_col(V, N):
        c = tile(0xe6e8ef, V) * (0.96 + 0.04 * hash3(V * 3, 5))[:, None]
        groove = (np.abs(V[:, 0]) < 0.02) & (V[:, 2] > hc[2] + 0.06) & (np.abs(V[:, 1] - hc[1] + 0.005) < 0.095)
        c[groove] = lin(0x2a1840)
        return c
    P.append(Part('head', head, hc - 0.16, hc + 0.16, 0.0032, 'skin', head_col, ('rigid', 'head'), faces=1500))
    slit = S.box(hc + [0, -0.005, 0.093], [0.0045, 0.08, 0.012], r=0.004)
    P.append(Part('slit', slit, hc + [-0.03, -0.11, 0.05], hc + [0.03, 0.1, 0.13], 0.002, 'glow', 0xe0b0ff, ('rigid', 'head'), oth=0.0, faces=200, ao=False))
    # 首：長く細い・拘束の輪とボルト
    P.append(Part('neck', S.round_cone(nk + [0, -0.06, -0.005], hc + [0, -0.09, -0.012], 0.03, 0.026), nk - 0.12, hc + 0.02, 0.003, 'skin', SK, 'body', ['neck', 'head', 'chest'], faces=400))
    collar = U(S.torus(nk + [0, 0.02, -0.004], 0.046, 0.013), *[S.cylinder(nk + [sx * 0.058, 0.02, 0.0], 0.011, 0.012, rr=0.003, axis_rot=rotz(math.pi / 2)) for sx in (1, -1)],
               S.box(nk + [0, 0.02, 0.055], [0.014, 0.016, 0.008], r=0.003), k=0.004)
    P.append(Part('collar', collar, nk - 0.1, nk + 0.1, 0.0025, 'metal', lambda V, N: np.where((np.abs(V[:, 0]) > 0.05)[:, None], lin(0x9aa0aa), lin(0x3a3e48)), ('rigid', 'neck'), oth=0.5, faces=700))
    # 胴：磁器の人形（胸郭・細い腰・骨盤）・肋の浅い段
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    torso0 = U(S.ellipsoid(ch + [0, 0.08, 0.0], [0.122, 0.16, 0.074]), S.ell_capsule(hp + [0, 0.02, 0], ch + [0, 0.02, 0], 0.062, 0.07, squash=(1.0, 1.35)),
               S.ellipsoid(hp + [0, -0.01, -0.004], [0.112, 0.085, 0.076]), S.capsule(sh_l + [-0.03, 0.0, 0], sh_r + [0.03, 0.0, 0], 0.04), k=0.06)

    def torso(Q):
        rib = 0.0025 * np.clip(np.sin(Q[:, 1] * 95), 0, 1) * S.smoothstep(1.12, 1.18, Q[:, 1]) * S.smoothstep(1.42, 1.34, Q[:, 1])
        return torso0(Q) - rib
    P.append(Part('torso', torso, [-0.24, hp[1] - 0.14, -0.14], [0.24, nk[1] + 0.02, 0.14], 0.0045, 'skin', porcelain, 'body',
                  ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2400))
    # 背中の差し込み口（配線の根もと）
    port = U(S.box(ch + [0, -0.06, -0.072], [0.07, 0.11, 0.018], r=0.01), *[S.cylinder(B(rig, 'cab%d_0' % i) + [0, 0, -0.012], 0.016, 0.014, rr=0.004, axis_rot=rotx(math.pi / 2)) for i in range(3)], k=0.004)
    P.append(Part('port', port, ch + [-0.12, -0.3, -0.16], ch + [0.12, 0.1, -0.02], 0.003, 'metal', 0x4a4e58, ('rigid', 'chest'), oth=0.5, faces=500))
    # 腕：細長い・球の関節（肩・ひじ・手首）
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        up = limb(ua + [0, -0.03, 0], la + [0, 0.03, 0], 0.032, 0.026)
        lo = limb(la + [0, -0.03, 0], ha + [0, 0.03, 0], 0.026, 0.02)

        def acol(V, N, ha=ha):
            c = porcelain(V, N)
            c[V[:, 1] < ha[1] + 0.12] = lin(SK2) * 1.0
            return c
        P.append(Part(s + '_upperarm', up, ua - [0.08, 0.42, 0.08], ua + [0.08, 0.02, 0.08], 0.0035, 'skin', acol, ('rigid', s + 'UpperArm'), faces=500, sym=False))
        P.append(Part(s + '_lowerarm', lo, la - [0.08, 0.42, 0.08], la + [0.08, 0.0, 0.08], 0.0035, 'skin', acol, ('rigid', s + 'LowerArm'), faces=500, sym=False))
        P.append(Part(s + '_joints', U(S.sphere(ua + [0, 0.0, 0], 0.04), S.sphere(la, 0.03), S.sphere(ha + [0, 0.012, 0], 0.022)), ua - [0.08, 0.8, 0.08], ua + [0.08, 0.08, 0.08], 0.003, 'skin', JOINT,
                      'body', [s + 'UpperArm', s + 'LowerArm', s + 'Hand', 'chest'], oth=0.7, faces=600, sym=False))
        P.append(hand(rig, s, 1.22, SK2, long_fingers=True, curl=0.55))
        # 手首の被験者の札（白い帯と小さな札）
        band = U(S.sub(S.cylinder(ha + [0, 0.045, 0], 0.03, 0.012, rr=0.003), S.cylinder(ha + [0, 0.045, 0], 0.022, 0.03)),
                 S.box(ha + [(1 if s == 'left' else -1) * 0.03, 0.045, 0.0], [0.004, 0.012, 0.018], r=0.002), k=0.002)
        P.append(Part(s + '_band', band, ha - [0.06, 0.0, 0.06], ha + [0.06, 0.08, 0.06], 0.0022, 'acc', 0xf0f0e8, ('rigid', s + 'LowerArm'), oth=0.4, faces=300, sym=False))
    # 脚：細長い・ひざの球・足（くつは無い）・足首の輪
    for s in ('left', 'right'):
        ul, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        th = limb(ul + [0, 0.0, 0], kn + [0, 0.03, 0], 0.05, 0.034)
        sh = limb(kn + [0, -0.03, 0], ft + [0, 0.06, 0], 0.036, 0.024)
        foot = U(S.ellipsoid(ft + [0, 0.025, 0.055], [0.034, 0.026, 0.085]), S.sphere(ft + [0, 0.05, 0], 0.028), k=0.03)

        def lcol(V, N):
            c = porcelain(V, N)
            c[V[:, 1] < 0.08] = lin(SK2)
            return c
        P.append(Part(s + '_thigh', th, ul - [0.1, 0.5, 0.1], ul + [0.1, 0.06, 0.1], 0.004, 'skin', lcol, ('rigid', s + 'UpperLeg'), faces=600, sym=False))
        P.append(Part(s + '_shin', U(sh, foot, k=0.015), ft - [0.1, 0.06, 0.1], kn + [0.1, 0.02, 0.18], 0.0035, 'skin', lcol, 'body', [s + 'LowerLeg', s + 'Foot'], faces=800, sym=False))
        P.append(Part(s + '_knee', S.sphere(kn, 0.04), kn - 0.06, kn + 0.06, 0.003, 'skin', JOINT, 'body', [s + 'UpperLeg', s + 'LowerLeg'], oth=0.7, faces=300, sym=False))
        P.append(Part(s + '_anklet', S.torus(ft + [0, 0.08, 0], 0.032, 0.0075), ft - [0.06, 0.0, 0.06], ft + [0.06, 0.12, 0.06], 0.002, 'metal', 0x3a3e48, ('rigid', s + 'LowerLeg'), oth=0.3, faces=300, sym=False))
    # 骨盤の継ぎ目の板（前の小さな板・人形らしさ）
    # 肩に刺さった槽のガラス片（4 枚・決まった乱数）
    rs = np.random.RandomState(31 * 1 + 7)
    shards = []
    for i in range(4):
        sx = 1 if i % 2 else -1
        c = np.array([sx * (0.1 + rs.rand() * 0.05), 1.28 + rs.rand() * 0.06 + 0.12, -0.02 + rs.rand() * 0.05])
        R = roty(rs.rand() * 2) @ rotx(rs.rand() * 0.8 - 0.4) @ rotz(sx * (0.5 + rs.rand() * 0.4))
        tip = c + R @ np.array([0, 0.07 + rs.rand() * 0.04, 0])
        shards.append(S.inter(S.box(c, [0.006, 0.07, 0.022], r=0.0015, rot=R), S.plane(R @ np.array([0.3, 1, 0]), float((R @ np.array([0.3, 1, 0]) / np.linalg.norm([0.3, 1, 0])) @ tip))))
    P.append(Part('shards', U(*shards), [-0.3, 1.25, -0.15], [0.3, 1.6, 0.15], 0.0022, 'acc', lambda V, N: tile(0xb8d8ff, V) * (0.9 + 0.2 * (V[:, 1] > 1.45))[:, None], ('rigid', 'chest'), oth=0.3, faces=500, sym=False, ao=False))
    # 背中から垂れる配線（揺れの骨に沿う）・先の光
    for i in range(3):
        pts = chain_pts(rig, 'cab%d_' % i, 5)
        d = pts[-1] - pts[-2]
        pts.append(pts[-1] + np.array([0, -0.1, 0.02]))
        f = tube(pts, 0.011, 0.009, k=0.01)
        lo_, hi_ = bbox_of(pts, 0.05)
        names = ['cab%d_%d' % (i, k) for k in range(5)]
        P.append(Part('cable%d' % i, f, lo_, hi_, 0.0028, 'acc', lambda V, N: tile(0x1a1a22, V) * (0.85 + 0.15 * (np.sin(V[:, 1] * 160) > 0))[:, None], 'body', names, oth=0.3, faces=500, sym=False))
        tipc = pts[-1]
        P.append(Part('cable%d_tip' % i, S.capsule(tipc + [0, 0.035, -0.005], tipc + [0, -0.005, 0.0], 0.013), tipc - 0.05, tipc + 0.06, 0.0022, 'glow', 0xd890ff, ('rigid', names[-1]), oth=0.0, faces=150, sym=False, ao=False))
    # 応答灯（頭の上に浮かぶ輪：弱点）
    halo = S.torus(hc + [0, 0.1425, 0], 0.099, 0.0065, axis=(0, math.cos(0.25), math.sin(0.25)))
    P.append(Part('halo', halo, hc + [-0.13, 0.05, -0.13], hc + [0.13, 0.25, 0.13], 0.0025, 'glow', 0xead4ff, ('rigid', 'head'), oth=0.0, faces=500, ao=False))
    return P


# ───────────────────────── 当直
def touchoku(rig):
    JK, JK2, REF, PANTS, SKN = 0x2a3448, 0x1a2234, 0xd8dce0, 0x2a2e36, 0x6a6e7a
    hp, sp, ch, nk = B(rig, 'hips'), B(rig, 'spine'), B(rig, 'chest'), B(rig, 'neck')
    R = 0.169
    hc = np.array([0, 2.018, 0.0])
    P = []

    def jacket_col(V, N):
        c = tile(JK, V)
        c *= (0.93 + 0.07 * hash3(V * 2.2, 4))[:, None]
        zip_ = (np.abs(V[:, 0] - 0.01) < 0.007) & (V[:, 2] > 0.06)
        c[zip_] = lin(0x0e121c)
        c *= (1 - 0.15 * np.clip((np.sin(V[:, 0] * 48 + V[:, 1] * 11) - 0.55) * 2, 0, 1) * ((V[:, 1] < 1.38) | (V[:, 1] > 1.66)))[:, None]   # しわ
        return c
    # 頭：暗い灰のつるりとした頭（顔は計器）
    head = U(S.ellipsoid(hc, [0.15, 0.165, 0.16]), S.ellipsoid(hc + [0, -0.09, 0.035], [0.115, 0.08, 0.11]), k=0.05)
    P.append(Part('head', head, hc - 0.24, hc + 0.24, 0.004, 'skin', lambda V, N: tile(SKN, V) * (0.92 + 0.08 * hash3(V * 3, 1))[:, None], ('rigid', 'head'), faces=1200))
    # 計器（3 つ）：真ちゅうの縁・奥の箱（文字盤＝コードの顔の札：前の面 hc.z+R*1.06）
    gauges = []
    for x, y, s in ((-0.42, -0.08, 0.6), (0.38, -0.02, 0.5), (0, -0.55, 0.42)):
        c = hc + np.array([x * R, y * R, 0])
        rr = R * s * 0.55
        zf = R * 1.045
        body = S.cylinder(c + [0, 0, zf - 0.035], rr, 0.035, rr=0.006, axis_rot=rotx(math.pi / 2))
        rim = S.torus(c + [0, 0, zf + 0.004], rr * 0.93, 0.0075, axis=(0, 0, 1))
        gauges.append(U(body, rim, k=0.004))
    gauges.append(S.capsule(hc + [-0.42 * R, -0.08 * R, R * 0.6], hc + [-0.42 * R, -0.5 * R, R * 0.5], 0.012))        # 計器をつなぐ管
    gauges.append(S.capsule(hc + [0.38 * R, -0.02 * R, R * 0.6], hc + [0.1 * R, -0.5 * R, R * 0.7], 0.011))
    P.append(Part('gauges', U(*gauges, k=0.008), hc + [-0.16, -0.16, -0.02], hc + [0.16, 0.08, 0.24], 0.0025, 'metal',
                  lambda V, N: np.where((V[:, 2] > hc[2] + R * 0.98)[:, None], lin(0xb89a52), lin(0x6a6e76)), ('rigid', 'head'), oth=0.6, faces=1500))
    # 作業帽（黄）：丸い山・前のつば・頭頂の筋・作業灯（一つ目＝光るレンズ）
    cap = S.inter(S.offset(S.ellipsoid(hc + [0, 0.03, -0.004], [0.152, 0.16, 0.162]), 0.014), lambda Q: (hc[1] + R * 0.18) - Q[:, 1])
    cap = U(cap, S.box(hc + [0, R * 0.2, R * 1.0], [R * 0.72, 0.008, R * 0.3], r=0.007, rot=rotx(-0.12)), S.capsule(hc + [0, R * 0.95, -R * 0.9], hc + [0, R * 1.1, R * 0.7], 0.011), k=0.012)
    P.append(Part('cap', cap, hc + [-0.22, 0.0, -0.22], hc + [0.22, 0.22, 0.26], 0.004, 'acc', lambda V, N: tile(0xd8b030, V) * (0.92 + 0.08 * hash3(V * 4, 3))[:, None], ('rigid', 'head'), oth=0.9, faces=1300))
    lamp = U(S.cylinder(hc + [0, R * 0.62, R * 1.1], R * 0.27, R * 0.16, rr=0.008, axis_rot=rotx(math.pi / 2)), S.box(hc + [0, R * 0.62, R * 0.93], [R * 0.18, R * 0.12, R * 0.08], r=0.008), k=0.01)
    lamp = S.sub(lamp, S.cylinder(hc + [0, R * 0.62, R * 1.27], R * 0.2, R * 0.03, axis_rot=rotx(math.pi / 2)))
    P.append(Part('lamp', lamp, hc + [-0.08, 0.04, 0.1], hc + [0.08, 0.17, 0.26], 0.0025, 'metal', 0x2a2a2e, ('rigid', 'head'), oth=0.6, faces=500))
    P.append(Part('lens', S.cylinder(hc + [0, R * 0.62, R * 1.235], R * 0.2, R * 0.012, rr=0.003, axis_rot=rotx(math.pi / 2)), hc + [-0.05, 0.06, 0.18], hc + [0.05, 0.15, 0.24], 0.002, 'glow', 0xfff0c0, ('rigid', 'head'), oth=0.0, faces=200, ao=False))
    # 首（太い）・えり
    P.append(Part('neck', S.round_cone(nk + [0, -0.05, -0.01], hc + [0, -0.12, -0.02], 0.06, 0.055), nk - 0.12, hc, 0.004, 'skin', SKN, 'body', ['neck', 'head', 'chest'], faces=400))
    collar = S.inter(S.sub(S.round_cone(nk + [0, -0.07, -0.01], nk + [0, 0.03, -0.02], 0.1, 0.095), S.round_cone(nk + [0, -0.1, -0.01], nk + [0, 0.07, -0.02], 0.082, 0.078)),
                     lambda Q: np.maximum(-(Q[:, 1] - (nk[1] - 0.06)), Q[:, 1] - (nk[1] + 0.03 - 0.03 * (Q[:, 2] > 0.05))))
    P.append(Part('collar', collar, nk - 0.16, nk + 0.1, 0.004, 'cloth', JK2, 'body', ['neck', 'chest'], oth=0.8, faces=600))
    # 胴（作業着の上着）
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    torso = U(S.ellipsoid(ch + [0, 0.1, -0.005], [0.225, 0.2, 0.14]), S.ell_capsule(hp + [0, -0.06, 0.0], ch + [0, 0.06, 0.0], 0.135, 0.14, squash=(1.0, 1.45)),
              S.capsule(sh_l + [-0.04, -0.01, 0], sh_r + [0.04, -0.01, 0], 0.078), k=0.07)
    torso = U(torso, *[S.box(ch + [sx * 0.1, 0.06, 0.128], [0.055, 0.048, 0.008], r=0.004, rot=rotx(-0.05)) for sx in (1, -1)], k=0.004)   # 胸のポケット
    P.append(Part('jacket', torso, [-0.4, hp[1] - 0.16, -0.25], [0.4, nk[1] + 0.04, 0.25], 0.006, 'cloth', jacket_col, 'body', ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=3400))
    tape = S.inter(S.sub(S.offset(torso, 0.006), S.offset(torso, -0.003)), lambda Q: np.minimum(np.abs(Q[:, 1] - 1.62) - 0.026, np.abs(Q[:, 1] - 1.42) - 0.022))   # 反射の帯（少し浮かせる）
    P.append(Part('tape', tape, [-0.4, 1.35, -0.25], [0.4, 1.7, 0.25], 0.0035, 'acc', REF, 'body', ['spine', 'chest', 'leftUpperArm', 'rightUpperArm'], oth=0.3, faces=1400))
    belt = S.inter(S.sub(S.offset(torso, 0.012), S.offset(torso, -0.004)), lambda Q: np.abs(Q[:, 1] - (hp[1] + 0.03)) - 0.024)
    P.append(Part('belt', belt, [-0.3, hp[1] - 0.05, -0.25], [0.3, hp[1] + 0.1, 0.25], 0.004, 'acc', lambda V, N: np.where((np.abs(V[:, 0]) < 0.035)[:, None] & (V[:, 2] > 0)[:, None], lin(0x9a9aa0), lin(0x1a1a1e)), 'body', ['hips', 'spine'], oth=0.6, faces=800))
    # 腕：太い袖（反射の帯）・左手（大きい）
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        f = U(limb(ua + [0, 0.01, 0], la, 0.068, 0.058), limb(la, ha + [0, 0.05, 0], 0.058, 0.05), k=0.025)

        def scol(V, N, la=la, ha=ha):
            c = tile(JK, V) * (0.93 + 0.07 * hash3(V * 2.5, 6))[:, None]
            c[np.abs(V[:, 1] - (la[1] - 0.4 * (la[1] - ha[1]))) < 0.022] = lin(REF)
            c[V[:, 1] < ha[1] + 0.08] = lin(JK2)
            return c
        P.append(Part(s + '_sleeve', f, ua - [0.14, 0.8, 0.14], ua + [0.14, 0.1, 0.14], 0.005, 'cloth', scol, 'body', [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=1800, sym=False))
    P.append(hand(rig, 'left', 1.4, SKN, curl=0.5))
    P.append(hand(rig, 'right', 1.3, SKN, curl=0.9))
    # 右前腕のレンチ：赤い柄（すべり止めの溝）・頭（口が開く）・調整の輪
    rl, rh = B(rig, 'rightLowerArm'), B(rig, 'rightHand')
    handle = S.box(np.array([rl[0] - 0.02, (rl[1] + rh[1]) / 2, rl[2] + 0.07]), [0.03, (rl[1] - rh[1]) / 2 + 0.05, 0.026], r=0.012)
    shank = S.box(rh + [0, -0.16, 0.06], [0.04, 0.11, 0.032], r=0.012)
    jaw = S.sub(U(S.box(rh + [0, -0.3, 0.12], [0.055, 0.032, 0.1], r=0.01), S.box(rh + [0, -0.3, 0.0], [0.055, 0.032, 0.035], r=0.01), S.box(rh + [0, -0.27, 0.06], [0.055, 0.04, 0.07], r=0.012), k=0.02),
                S.box(rh + [0, -0.32, 0.11], [0.08, 0.016, 0.075], r=0.006))
    worm = S.cylinder(rh + [0, -0.2, 0.06], 0.033, 0.055, rr=0.008, axis_rot=rotz(math.pi / 2))

    def wcol(V, N):
        c = tile(0x9aa0a6, V)
        h = V[:, 1] > rh[1] - 0.06
        c[h] = lin(0x9a3a2a) * (0.85 + 0.15 * (np.sin(V[h, 1] * 180) > 0))[:, None]
        c[(V[:, 1] < rh[1] - 0.17) & (V[:, 1] > rh[1] - 0.23)] = lin(0x5a5e64)
        return c
    P.append(Part('wrench', U(handle, shank, jaw, worm, k=0.01), rh + [-0.15, -0.45, -0.12], rl + [0.15, 0.1, 0.25], 0.004, 'metal', wcol, ('rigid', 'rightLowerArm'), oth=0.8, faces=1600, sym=False))
    # 左手の点検表（板・金具。紙はコードの顔の札：x=lh.x+0.035 の面）
    lh = B(rig, 'leftHand')
    board = U(S.box(lh + [0.02, -0.1, 0.08], [0.01, 0.15, 0.11], r=0.005), S.box(lh + [0.03, 0.04, 0.08], [0.012, 0.018, 0.05], r=0.005), k=0.003)
    P.append(Part('clipboard', board, lh + [-0.05, -0.3, -0.08], lh + [0.1, 0.1, 0.24], 0.0028, 'acc', lambda V, N: np.where((V[:, 1] > lh[1] + 0.02)[:, None], lin(0xa8acb2), lin(0x6a4a2a)), ('rigid', 'leftHand'), oth=0.6, faces=600, sym=False))
    # 背の配管・弁の輪・機械の箱
    pipes, cw = [], 'chest'
    for x, h2 in ((-0.1, 0.5), (0.06, 0.62), (0.18, 0.44)):
        pipes.append(U(S.capsule(np.array([x, ch[1] - 0.16, -0.19]), np.array([x, ch[1] + h2 * 0.6, -0.21]), 0.035), S.capsule(np.array([x, ch[1] + h2 * 0.6, -0.21]), np.array([x + 0.04, ch[1] + h2, -0.14]), 0.03), k=0.03))
        pipes.append(S.cylinder(np.array([x, ch[1] + h2 * 0.3, -0.2]), 0.045, 0.015, rr=0.005))          # 継ぎ手
    box_ = S.box(ch + [0, 0.02, -0.19], [0.18, 0.17, 0.045], r=0.02)
    P.append(Part('pipes', U(box_, *pipes, k=0.01), ch + [-0.3, -0.3, -0.4], ch + [0.35, 0.75, -0.05], 0.005, 'metal',
                  lambda V, N: np.where((V[:, 2] < -0.2)[:, None] & (V[:, 1] < ch[1] + 0.2)[:, None], lin(0x3a3e46), lin(0x7a7e86)) * (0.9 + 0.1 * hash3(V * 5, 8))[:, None], ('rigid', 'chest'), oth=0.6, faces=1800, sym=False))
    wheels = U(*[U(S.torus(np.array([x, ch[1] + y, -0.245]), 0.068, 0.011, axis=(0, 0, 1)), S.box(np.array([x, ch[1] + y, -0.245]), [0.064, 0.007, 0.006]), S.box(np.array([x, ch[1] + y, -0.245]), [0.007, 0.064, 0.006])) for x, y in ((-0.1, 0.2), (0.18, 0.12))])
    P.append(Part('valves', wheels, ch + [-0.25, 0.0, -0.32], ch + [0.3, 0.35, -0.18], 0.003, 'metal', 0xc83a2a, ('rigid', 'chest'), oth=0.4, faces=700, sym=False))
    # 脚：作業ズボン（ひざの反射の帯・ひざ当て）・安全靴
    for s in ('left', 'right'):
        ul, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        f = U(limb(ul + [0, 0.03, 0], kn, 0.095, 0.072), limb(kn, ft + [0, 0.1, 0], 0.074, 0.058), k=0.03)
        f = U(f, S.box(kn + [0, 0.0, 0.07], [0.055, 0.07, 0.02], r=0.015), k=0.01)

        def lcol(V, N, kn=kn):
            c = tile(PANTS, V) * (0.93 + 0.07 * hash3(V * 2.5, 9))[:, None]
            c[np.abs(V[:, 1] - (kn[1] - 0.12)) < 0.022] = lin(REF)
            c[(V[:, 2] > kn[2] + 0.06) & (np.abs(V[:, 1] - kn[1]) < 0.07)] = lin(0x1a1c22)
            return c
        P.append(Part(s + '_leg', f, ul - [0.2, 1.1, 0.2], ul + [0.2, 0.15, 0.2], 0.006, 'cloth', lcol, 'body', [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=1700, sym=False))
        boot = U(S.box(ft + [0, 0.04, 0.06], [0.07, 0.05, 0.14], r=0.04), S.ellipsoid(ft + [0, 0.06, 0.15], [0.068, 0.055, 0.075]), S.round_cone(ft + [0, 0.05, 0], ft + [0, 0.17, 0], 0.07, 0.066), k=0.03)

        def bcol(V, N):
            c = tile(0x1a1a1e, V)
            c[V[:, 1] < 0.03 + 0.0 * V[:, 0]] = lin(0x0a0a0c)
            c[(V[:, 2] > ft[2] + 0.15) & (V[:, 1] > 0.04)] = lin(0x3a3a40)               # つま先の鉄の当て
            return c
        P.append(Part(s + '_boot', boot, ft - [0.14, 0.12, 0.16], ft + [0.14, 0.26, 0.28], 0.005, 'acc', bcol, ('rigid', s + 'Foot'), oth=0.8, faces=700, sym=False))
        # 脚に絡むホース
        sx = 1 if s == 'left' else -1
        hose = tube([ul + [sx * 0.07, -0.05, -0.05], (ul + kn) / 2 + [sx * 0.1, 0.0, 0.0], kn + [sx * 0.085, 0.05, 0.06], kn + [sx * 0.07, -0.15, 0.08], kn + [sx * 0.05, -0.3, 0.07]], 0.017, 0.015, k=0.02)
        P.append(Part(s + '_hose', hose, kn - [0.2, 0.4, 0.2], ul + [0.2, 0.1, 0.2], 0.0035, 'acc', lambda V, N: tile(0x1a1a1a, V) * (0.85 + 0.15 * (np.sin(V[:, 1] * 120) > 0))[:, None], 'body', [s + 'UpperLeg', s + 'LowerLeg'], oth=0.5, faces=700, sym=False))
    return P


def ell_rot(c, r, R):
    """回した楕円体（R：3x3 局所 → 世界）"""
    c = np.asarray(c, float)
    e = S.ellipsoid(np.zeros(3), r)
    return lambda P: e((P - c) @ R)


def cells(V, seeds=None, scale=1.0):
    """継ぎ当ての区切り（なめらかな値の段の番号・段の縁までのおよその距離 m）：sin の和の段（コードの継接の patch と同じ考え・速い）"""
    scale = 0.75 * scale                                                   # 大きめの継ぎ当て
    x, y, z = V[:, 0] * scale, V[:, 1] * scale, V[:, 2] * scale
    v = (np.sin(x * 9 + y * 5) + np.sin(y * 7 - z * 11) + np.sin(z * 6 + x * 4) + 3) * 0.9
    gx = 0.9 * scale * (9 * np.cos(x * 9 + y * 5) + 4 * np.cos(z * 6 + x * 4))
    gy = 0.9 * scale * (5 * np.cos(x * 9 + y * 5) + 7 * np.cos(y * 7 - z * 11))
    gz = 0.9 * scale * (-11 * np.cos(y * 7 - z * 11) + 6 * np.cos(z * 6 + x * 4))
    fr = v % 1.0
    return np.floor(v).astype(int), np.minimum(fr, 1 - fr) / np.maximum(np.sqrt(gx * gx + gy * gy + gz * gz), 1.5)


# ───────────────────────── 継接
def tsugihagi(rig):
    SK = [0x7e7a88, 0x5e6474, 0x8a7468, 0x4e4a5e, 0x6a7464, 0x938a9a]
    MASK, ST, D, EYE, BONE = 0xe6e0d4, 0x6a2ab8, 0x120e18, 0xff6ad0, 0xb8b0a0
    seeds = None
    P = []

    def patch(V, N, shift=0):
        k, gap = cells(V, seeds)
        c = np.array([lin(SK[(i + shift) % len(SK)]) for i in range(len(SK))])[k % len(SK)]
        c = c * (0.9 + 0.1 * hash3(V * 7, 3))[:, None]
        c *= (1 - 0.06 * (np.sin(V[:, 0] * 140 + V[:, 1] * 30) > 0.6))[:, None]                      # 布の目
        seam = gap < 0.006
        c[seam] = lin(0x2a1e36)
        stitch = (gap < 0.011) & (gap >= 0.006) & (np.sin((V[:, 0] + V[:, 1] + V[:, 2]) * 160) > 0.3)
        c[stitch] = lin(ST)                                                                         # 縫い目の糸
        return c

    def quilted(f0, amp=0.012):
        """継ぎ当ての縁を少しへこませる（縫い目の溝）"""
        def f(Q):
            d = f0(Q)
            near = np.abs(d) < 0.05
            if near.any():
                _, gap = cells(Q[near], seeds)
                d = d.copy()
                d[near] += amp * np.exp(-(gap / 0.007) ** 2)
            return d
        return f
    # 胴：前へ丸めた背・寄り合った二つの胴
    rings = [[0.9, 0.34, 0.3, 0], [1.3, 0.44, 0.36, 0], [1.6, 0.4, 0.32, 0.04], [1.9, 0.46, 0.34, 0.1], [2.2, 0.56, 0.4, 0.2], [2.42, 0.52, 0.36, 0.28], [2.6, 0.32, 0.24, 0.34]]
    blobs = [S.ellipsoid([math.sin(i * 1.3) * 0.05, y, z], [rx, 0.2 if i < 6 else 0.14, rz]) for i, (y, rx, rz, z) in enumerate(rings)]
    blobs += [S.ellipsoid([0.26, 2.3, 0.16], [0.36, 0.34, 0.3]), S.ellipsoid([-0.18, 1.6, -0.12], [0.3, 0.3, 0.26])]
    body0 = U(*blobs, k=0.16)
    body = quilted(body0)
    P.append(Part('body', body, [-0.8, 0.6, -0.65], [0.8, 2.82, 0.75], 0.011, 'cloth', patch, 'body', ['tHip', 'tBody', 'tChest'], oth=1.0, faces=8000, sym=False))
    # 背骨の突起（丸い骨の背びれ）
    spikes = []
    for i in range(8):
        y = 1.5 + i * 0.14
        z = -0.34 - math.sin(i / 7 * math.pi) * 0.06
        spikes.append(S.round_cone(np.array([0, y, z + 0.04]), np.array([0, y + 0.08, z - 0.18]), 0.045, 0.012))
    P.append(Part('spines', U(*spikes), [-0.1, 1.4, -0.75], [0.1, 2.6, -0.1], 0.004, 'acc', BONE, 'body', ['tBody', 'tChest'], oth=0.6, faces=900, sym=False))
    # 頭（3 つ）：白い仮面・後ろの黒い頭・目の群れ・縫った口
    for hn, R, ne, roll, shift in (('tHeadA', 0.25, 8, 0.0, 1), ('tHeadB', 0.17, 5, math.pi / 2, 2), ('tHeadC', 0.16, 4, math.pi, 3)):
        h = B(rig, hn)
        Rr = rotz(roll)

        def L(x, y, z, h=h, Rr=Rr):
            return h + Rr @ np.array([x, y, z])
        ch = B(rig, 'tChest')
        neck = S.round_cone(np.array([h[0] * 0.6, h[1] - 0.3, h[2] * 0.5]), h + [0, -0.08, 0], R * 0.45, R * 0.4)
        P.append(Part(hn + '_neck', neck, h - [0.4, 0.5, 0.4], h + [0.4, 0.1, 0.4], 0.006, 'cloth', lambda V, N, sh=shift: patch(V, N, sh), 'body', ['tChest', hn], oth=0.8, faces=500, sym=False))
        mask = ell_rot(L(0, R * 0.15, 0), [R, R * 1.18, R * 0.95], Rr)
        flat = lambda Q, h=h, R=R: (Q - h)[:, 2] - R * 0.62                             # 前を平らに
        mask = S.inter(mask, flat, k=R * 0.25)
        mouth = S.box(L(0, -R * 0.38, R * 0.6), [R * 0.4, R * 0.03, R * 0.08], r=R * 0.02, rot=Rr)
        sockets = []
        eyes = []
        for k in range(ne):
            col = k // 2
            ex = (1 if k % 2 else -1) * R * (0.22 + 0.1 * col)
            ey = R * (0.5 - col * 0.3)
            sockets.append(ell_rot(L(ex, ey, R * 0.62), [R * 0.17, R * 0.11, R * 0.08], Rr))
            eyes.append((L(ex, ey, R * 0.57), L(ex, ey, R * 0.6)))
        mask = S.sub(mask, U(mouth, *sockets), k=R * 0.04)

        def mask_col(V, N, h=h, R=R):
            c = tile(MASK, V) * (0.95 + 0.05 * hash3(V * 5, 6))[:, None]
            back = (V - h) @ np.array([0, 0, 1.0]) < -R * 0.05
            c[back] = lin(D)
            return c
        back = ell_rot(L(0, R * 0.3, -R * 0.15), [R * 1.05, R * 1.0, R * 0.9], Rr)
        head = U(mask, S.inter(back, lambda Q, h=h, R=R: (Q - h)[:, 2] + R * 0.05), k=R * 0.1)
        P.append(Part(hn, head, h - R * 1.6, h + R * 1.6, 0.004 * R / 0.2, 'skin', mask_col, ('rigid', hn), oth=0.9, faces=1500 if hn == 'tHeadA' else 900, sym=False))
        P.append(Part(hn + '_eyes', U(*[ell_rot(a, [R * 0.15, R * 0.09, R * 0.05], Rr) for a, _ in eyes]), h - R * 1.2, h + R * 1.2, 0.0025, 'glow', EYE, ('rigid', hn), oth=0.0, faces=60 * ne, sym=False, ao=False))
        P.append(Part(hn + '_pupils', U(*[ell_rot(b, [R * 0.03, R * 0.085, R * 0.02], Rr) for _, b in eyes]), h - R * 1.2, h + R * 1.2, 0.002, 'acc', 0x14040e, ('rigid', hn), oth=0.0, faces=40 * ne, sym=False, ao=False))
        stitches = U(*[S.box(L(k * R * 0.12, -R * 0.38, R * 0.64), [R * 0.016, R * 0.11, R * 0.02], r=R * 0.008, rot=Rr) for k in range(-3, 4)])
        P.append(Part(hn + '_stitch', stitches, h - R * 1.2, h + R * 1.2, 0.002, 'acc', ST, ('rigid', hn), oth=0.0, faces=300, sym=False, ao=False))
    # 右腕（長い・こぶの多い・大きな拳）
    RP = chain_pts(rig, 'tR', 4, tip=[0, -0.2, 0.06])
    arm = U(tube(RP, 0.15, 0.1, k=0.04), *[S.ellipsoid(RP[i], [0.13, 0.11, 0.13]) for i in (1, 2, 3)], k=0.05)
    fist = RP[-1]
    knuck = U(S.ellipsoid(fist + [0, -0.05, 0], [0.2, 0.17, 0.2]), *[S.ellipsoid(fist + [-0.12 + k * 0.08, 0.0, 0.15], [0.045, 0.05, 0.05]) for k in range(4)], k=0.05)
    P.append(Part('right_arm', quilted(U(arm, knuck, k=0.06)), np.min(RP, 0) - 0.3, np.max(RP, 0) + 0.3, 0.01, 'cloth', lambda V, N: patch(V, N, 2), 'body', ['tR0', 'tR1', 'tR2', 'tR3'], oth=0.9, faces=2200, sym=False))
    studs = U(*[S.round_cone(fist + [-0.12 + k * 0.08, 0.02, 0.17], fist + [-0.13 + k * 0.08, 0.1, 0.23], 0.03, 0.008) for k in range(4)])
    P.append(Part('knuckles', studs, fist - 0.3, fist + 0.35, 0.003, 'acc', BONE, ('rigid', 'tR3'), oth=0.5, faces=400, sym=False))
    # 左腕と鞄（古い通勤鞄・取っ手・ふた・名札）
    LP = chain_pts(rig, 'tL', 3, tip=[-0.14, 0.0, 0.0])
    P.append(Part('left_arm', quilted(tube(LP, 0.12, 0.08, k=0.04)), np.min(LP, 0) - 0.25, np.max(LP, 0) + 0.25, 0.009, 'cloth', lambda V, N: patch(V, N, 4), 'body', ['tL0', 'tL1', 'tL2'], oth=0.9, faces=1400, sym=False))
    bg = B(rig, 'tBag')
    bag = U(S.box(bg, [0.22, 0.16, 0.065], r=0.03), S.box(bg + [0, 0.06, 0.058], [0.215, 0.1, 0.012], r=0.01), S.torus(bg + [0, 0.19, 0], 0.07, 0.012, axis=(0, 0, 1)), k=0.008)

    def bag_col(V, N):
        c = tile(0x5a3a2a, V) * (0.9 + 0.1 * hash3(V * 6, 2))[:, None]
        c[V[:, 1] > bg[1] + 0.165] = lin(0x2a1c14)
        tag = (np.abs(V[:, 0] - (bg[0] + 0.13)) < 0.045) & (np.abs(V[:, 1] - (bg[1] - 0.02)) < 0.028) & (V[:, 2] > bg[2] + 0.05)
        c[tag] = lin(0xf0e8d8)
        c[(np.abs(V[:, 0] - bg[0]) < 0.025) & (np.abs(V[:, 1] - (bg[1] + 0.0)) < 0.02) & (V[:, 2] > bg[2] + 0.06)] = lin(0xb89a52)   # 留め金
        return c
    P.append(Part('bag', bag, bg - [0.3, 0.25, 0.15], bg + [0.3, 0.3, 0.15], 0.004, 'acc', bag_col, ('rigid', 'tBag'), oth=0.6, faces=900, sym=False))
    # 脚：前の 2 本は人の脚（継ぎ当て）、後ろの 2 本は細い節の脚
    for k, insect, s in (('A', 0, 1.0), ('B', 0, 1.0), ('C', 1, 0.86), ('D', 1, 0.8)):
        n = 4 if insect else 3
        pts = chain_pts(rig, 'tLeg' + k, n, tip=[0, -0.02, 0.04 if insect else 0.12])
        names = ['tLeg%s%d' % (k, i) for i in range(n)]
        if insect:
            f = U(tube(pts, 0.06 * s, 0.02 * s, k=0.01), *[S.sphere(pts[i], 0.05 * s) for i in range(1, n)], k=0.02)
            P.append(Part('leg' + k, f, np.min(pts, 0) - 0.15, np.max(pts, 0) + 0.15, 0.006, 'acc', lambda V, N, pts=pts: np.where((V[:, 1] < pts[-2][1] + 0.05)[:, None], lin(BONE), lin(D)),
                          'body', names, oth=0.8, faces=1000, sym=False))
        else:
            ft = pts[-2]
            f = U(tube(pts[:-1], 0.15 * s, 0.09 * s, k=0.04), S.ellipsoid(np.array([ft[0], 0.06, ft[2] + 0.08]), [0.11 * s, 0.06, 0.17 * s]), k=0.05)
            P.append(Part('leg' + k, quilted(f), np.min(pts, 0) - [0.25, 0.1, 0.25], np.max(pts, 0) + 0.3, 0.008, 'cloth', lambda V, N, sh=(5 if k == 'A' else 1), ft=ft: np.where((V[:, 1] < 0.13)[:, None], lin(0xb8b4a8), patch(V, N, sh)),
                          'body', names, oth=0.9, faces=1500, sym=False))
    # 腹の小さな手（4 本）
    for i in range(4):
        sx = -1 if i % 2 else 1
        pts = chain_pts(rig, 'tHand%d_' % i, 3)
        names = ['tHand%d_%d' % (i, k) for k in range(3)]
        tip = pts[-1]
        fingers = [S.round_cone(tip, tip + np.array([sx * 0.02 + (k - 1) * 0.03, -0.08, 0.05]), 0.013, 0.006) for k in range(3)]
        f = U(tube(pts, 0.035, 0.03, k=0.01), *fingers, k=0.01)
        P.append(Part('hand%d' % i, f, np.min(pts, 0) - 0.15, np.max(pts, 0) + 0.15, 0.003, 'cloth', SK[(i + 1) % len(SK)], 'body', names, oth=0.6, faces=500, sym=False))
    # 背の触腕（6 本・目の列）
    for i in range(6):
        sx = -1 if i % 2 else 1
        pts = chain_pts(rig, 'tTen%d_' % i, 5, tip=[sx * 0.06, -0.18, -0.06])
        names = ['tTen%d_%d' % (i, k) for k in range(5)]
        f = tube(pts, 0.085, 0.015, k=0.02)
        P.append(Part('ten%d' % i, f, np.min(pts, 0) - 0.15, np.max(pts, 0) + 0.15, 0.005, 'cloth', lambda V, N, pts=pts: np.where((V[:, 1] < pts[-2][1] - 0.05)[:, None], lin(ST), lin(D)) * (0.9 + 0.1 * hash3(V * 8, 4))[:, None],
                      'body', names, oth=0.6, faces=900, sym=False))
        bumps = U(*[S.ellipsoid(pts[k] + [0, 0.05, 0.02], [0.045, 0.028, 0.025]) for k in range(1, 5)])
        P.append(Part('ten%d_eyes' % i, bumps, np.min(pts[1:5], 0) - 0.08, np.max(pts[1:5], 0) + 0.1, 0.0035, 'glow', EYE, 'body', names, oth=0.0, faces=240, sym=False, ao=False))
    return P


# ───────────────────────── 塗替
def nurikae(rig):
    POLE, POLE2, SHUT, SHUT2, TR, CABLE, INS, D = 0x6e6862, 0x4e4a46, 0x9aa0a8, 0x5e646c, 0x4e5a62, 0x18141e, 0xe8e4dc, 0x0e0a14
    hb, hc0, hd = B(rig, 'nBody'), B(rig, 'nChest'), B(rig, 'nHead')
    ch = hc0
    P = []
    # 脚：電柱（足場のボルト・継ぎ目）・変圧器のひざ・根のように広がる電線の足
    for s, sx in (('L', 1), ('R', -1)):
        pts = chain_pts(rig, 'nLeg' + s, 3, tip=[0, -0.04, 0.02])
        names = ['nLeg%s%d' % (s, i) for i in range(3)]
        pole = tube(pts, 0.058, 0.046, k=0.01)

        def pcol(V, N):
            c = tile(POLE, V) * (0.92 + 0.08 * hash3(V * 9, 1))[:, None]
            c[np.sin(V[:, 1] * 60) > 0.94] = lin(POLE2)
            return c
        P.append(Part('pole' + s, pole, np.min(pts, 0) - 0.1, np.max(pts, 0) + 0.1, 0.004, 'metal', pcol, 'body', names, oth=0.9, faces=900, sym=False))
        k = pts[1]
        drum = U(S.cylinder(k + [sx * 0.02, 0.02, 0.03], 0.1, 0.08, rr=0.012), S.cylinder(k + [sx * 0.02, 0.1, 0.03], 0.11, 0.015, rr=0.005),
                 *[S.box(k + [sx * 0.02, 0.02, 0.03] + np.array([math.cos(a) * 0.1, 0, math.sin(a) * 0.1]), [0.012, 0.065, 0.012], r=0.003) for a in np.linspace(0, 2 * math.pi, 9)[:-1]], k=0.006)
        P.append(Part('drum' + s, drum, k - 0.2, k + 0.2, 0.004, 'metal', lambda V, N, k=k: np.where((V[:, 1] > k[1] + 0.09)[:, None], lin(0x3a3e42), lin(TR)), ('rigid', names[1]), oth=0.7, faces=900, sym=False))
        ins = U(*[U(S.cylinder(k + [sx * 0.02 + (i - 1) * 0.05, 0.15, 0.03], 0.014, 0.03, rr=0.004), S.torus(k + [sx * 0.02 + (i - 1) * 0.05, 0.14, 0.03], 0.016, 0.005), S.torus(k + [sx * 0.02 + (i - 1) * 0.05, 0.165, 0.03], 0.016, 0.005)) for i in range(3)])
        P.append(Part('ins' + s, ins, k - 0.2, k + 0.25, 0.0025, 'acc', INS, ('rigid', names[1]), oth=0.3, faces=500, sym=False))
        top = pts[0]
        bolts = U(*[S.box(top + [sx * 0.06, -0.1 - i * 0.06, -0.02], [0.025, 0.005, 0.005], r=0.002) for i in range(6)])
        P.append(Part('bolts' + s, bolts, top - [0.12, 0.5, 0.1], top + [0.12, 0.0, 0.1], 0.002, 'metal', 0x8a8a90, ('rigid', names[0]), oth=0.2, faces=300, sym=False, ao=False))
        f = pts[-1]
        roots = U(*[tube([f + [0, 0.03, 0], f + [math.sin(a) * 0.1, 0.02 - f[1], math.cos(a) * 0.1], f + [math.sin(a) * 0.2, -f[1], math.cos(a) * 0.2]], 0.016, 0.008, k=0.01)
                    for a in [(i / 4 - 0.5) * 2.4 + (0.2 if sx > 0 else -0.2) for i in range(5)]], k=0.01)
        P.append(Part('roots' + s, roots, f - [0.3, 0.1, 0.3], f + [0.3, 0.1, 0.3], 0.003, 'acc', CABLE, ('rigid', names[2]), oth=0.5, faces=600, sym=False))
    # 腰：巻き上げたシャッター（3 本の横の筒・らせんの溝）
    rolls = []
    for i in range(3):
        y = 1.0 - i * 0.07 + (0.03 if i == 1 else 0)
        rolls.append(S.cylinder(np.array([0, y, 0.05 * (i - 1)]), 0.07, 0.31, rr=0.02, axis_rot=rotz(math.pi / 2)))
    rolls_f = lambda Q, f0=U(*rolls, k=0.01): f0(Q) - 0.004 * np.sin(np.arctan2(Q[:, 1] - 1.0, Q[:, 2]) * 18)
    P.append(Part('rolls', rolls_f, [-0.4, 0.8, -0.2], [0.4, 1.12, 0.2], 0.004, 'metal', lambda V, N: tile(SHUT, V) * (0.8 + 0.2 * (np.sin(np.arctan2(V[:, 1] - 1.0, V[:, 2]) * 18) > 0))[:, None], ('rigid', 'nHip'), oth=0.8, faces=1400))
    # 腰と胴をつなぐ電線の束（ねじれた 5 本）
    hpv = B(rig, 'nHip')
    bundle = U(*[tube([hpv + [math.sin(a) * 0.06, 0.02, math.cos(a) * 0.05], hpv + [math.sin(a + 0.6) * 0.08, 0.16, math.cos(a + 0.6) * 0.06 - 0.02], hb + [math.sin(a + 1.2) * 0.1, -0.12, math.cos(a + 1.2) * 0.08]], 0.03, 0.028, k=0.02)
                 for a in np.linspace(0, 2 * math.pi, 6)[:-1]], k=0.015)
    P.append(Part('bundle', bundle, hpv + [-0.25, -0.05, -0.25], hb + [0.25, 0.0, 0.25], 0.004, 'acc', lambda V, N: tile(CABLE, V) * (0.85 + 0.15 * (np.sin(V[:, 1] * 90 + V[:, 0] * 40) > 0))[:, None], 'body', ['nHip', 'nBody'], oth=0.7, faces=1200))
    # 胴：シャッターを積んだ柱（横の溝・天板）
    cy = (hb[1] + hc0[1]) / 2 - 0.04
    trunk0 = S.box(np.array([0, cy, hb[2]]), [0.25, 0.23, 0.17], r=0.02)
    trunk = lambda Q: trunk0(Q) + 0.004 * (np.sin(Q[:, 1] * 2 * math.pi / 0.045) > 0.7)
    trunk = U(trunk, S.box(hb + [0, 0.22, 0.02], [0.28, 0.03, 0.2], r=0.01))

    def tcol(V, N):
        c = tile(SHUT, V) * (0.88 + 0.12 * (np.sin(V[:, 1] * 2 * math.pi / 0.045) > 0.7))[:, None]
        rust = np.clip(hash3(V * 5, 9) - 0.4, 0, 1) * 1.6
        c = c * (1 - rust[:, None] * 0.6) + lin(0x7a4a2a) * rust[:, None] * 0.6
        c[V[:, 1] > hb[1] + 0.19] = lin(0x3a3e46)
        return c
    P.append(Part('trunk', trunk, [-0.35, hb[1] - 0.25, hb[2] - 0.25], [0.35, hc0[1] + 0.05, hb[2] + 0.25], 0.005, 'metal', tcol, 'body', ['nBody', 'nChest'], oth=1.0, faces=2200))
    # 胸：開いた変圧器（扉・奥の暗い空洞・上のがいし・横の放熱板）
    tbox = S.sub(S.box(ch + [0, 0.04, 0.02], [0.23, 0.15, 0.16], r=0.015), S.box(ch + [0, 0.04, 0.16], [0.15, 0.12, 0.05], r=0.008))
    fins = U(*[S.box(ch + [sx * 0.245, 0.04, 0.02 + (j - 2) * 0.05], [0.02, 0.12, 0.006], r=0.003) for sx in (1, -1) for j in range(5)])
    doors = U(*[S.box(ch + [sx * 0.27, 0.04, 0.2], [0.07, 0.14, 0.01], r=0.005, rot=roty(sx * 0.9)) for sx in (1, -1)])

    def trcol(V, N):
        c = tile(TR, V) * (0.9 + 0.1 * hash3(V * 6, 5))[:, None]
        inside = (np.abs(V[:, 0]) < 0.15) & (np.abs(V[:, 1] - ch[1] - 0.04) < 0.12) & (V[:, 2] < ch[2] + 0.17)
        c[inside] = lin(D)
        return c
    P.append(Part('transformer', U(tbox, fins, k=0.005), ch + [-0.32, -0.15, -0.2], ch + [0.32, 0.22, 0.22], 0.004, 'metal', trcol, ('rigid', 'nChest'), oth=0.9, faces=1600))
    P.append(Part('doors', doors, ch + [-0.4, -0.12, 0.1], ch + [0.4, 0.2, 0.32], 0.004, 'metal', 0x5e6a72, ('rigid', 'nChest'), oth=0.7, faces=500, sym=False))
    insul = U(*[U(S.cylinder(ch + [(i - 1) * 0.12, 0.22, 0.02], 0.02, 0.04, rr=0.006), S.torus(ch + [(i - 1) * 0.12, 0.21, 0.02], 0.024, 0.006), S.torus(ch + [(i - 1) * 0.12, 0.24, 0.02], 0.022, 0.006)) for i in range(3)])
    P.append(Part('insulators', insul, ch + [-0.2, 0.15, -0.05], ch + [0.2, 0.3, 0.1], 0.0025, 'acc', INS, ('rigid', 'nChest'), oth=0.3, faces=500))
    # 背の看板（刺さった板・枠・色とりどり）
    SIG = [0xd84a3a, 0x3a8ad8, 0xd8b03a, 0x5ac87a, 0xe86ab0, 0xf0f0e0]
    rr = np.random.RandomState(7171)
    for i in range(6):
        y = hb[1] - 0.1 + i * 0.09
        sx = -1 if i % 2 else 1
        c = np.array([sx * (0.12 + rr.rand() * 0.1), y + 0.1, hb[2] - 0.24 - rr.rand() * 0.06])
        Rm = roty(sx * (0.3 + rr.rand() * 0.3)) @ rotx(-0.5 - rr.rand() * 0.4) @ rotz(sx * 0.3)
        w = 0.11 + rr.rand() * 0.05
        board = U(S.box(c, [w, 0.07, 0.01], r=0.006, rot=Rm), S.box(c, [w + 0.008, 0.078, 0.006], r=0.004, rot=Rm), k=0.002)
        col = SIG[i % len(SIG)]

        def scol(V, N, c=c, Rm=Rm, col=col, w=w):
            q = (V - c) @ Rm
            cc = tile(col, V)
            cc[(np.abs(q[:, 0]) > w - 0.006) | (np.abs(q[:, 1]) > 0.064)] = lin(0x2a2a30)
            cc[(np.abs(q[:, 1]) < 0.015) & (np.abs(q[:, 0]) < w * 0.7)] = lin(0xf6f2e8 if col != 0xf0f0e0 else 0x3a3a44)   # 文字の帯（読めない）
            return cc
        P.append(Part('sign%d' % i, board, c - 0.25, c + 0.25, 0.003, 'acc', scol, ('rigid', 'nChest' if y > hc0[1] - 0.1 else 'nBody'), oth=0.5, faces=300, sym=False))
    # 頭：台・街灯を束ねた冠（5 本：先の灯が目）・垂れた看板の顔
    base = S.box(hd, [0.14, 0.06, 0.1], r=0.015)
    poles, heads, lamps = [], [], []
    for i in range(5):
        a = (i / 4 - 0.5) * 1.9
        p0 = np.array([math.sin(a) * 0.1, hd[1] + 0.05, hd[2] + math.cos(a) * 0.04 - 0.02])
        p1 = np.array([math.sin(a) * 0.18, hd[1] + 0.26, hd[2] - 0.02])
        p2 = np.array([math.sin(a) * 0.3, hd[1] + 0.32 + math.cos(a) * 0.12, hd[2] + 0.04])
        tip = np.array([math.sin(a) * 0.36, hd[1] + 0.3 + math.cos(a) * 0.1, hd[2] + 0.14])
        poles.append(tube([p0, p1, p2, tip], 0.014, 0.008, k=0.02))
        heads.append(S.box(tip + [0, -0.012, 0], [0.042, 0.014, 0.032], r=0.008))
        lamps.append(S.ellipsoid(tip + [0, -0.038, 0], [0.032, 0.016, 0.026]))
    P.append(Part('crown', U(base, *poles, *heads, k=0.01), hd + [-0.5, -0.1, -0.2], hd + [0.5, 0.5, 0.3], 0.0035, 'metal', lambda V, N: np.where((V[:, 1] < hd[1] + 0.07)[:, None], lin(0x3a3a44), lin(POLE)), ('rigid', 'nHead'), oth=0.6, faces=1500, sym=False))
    P.append(Part('lamps', U(*lamps), hd + [-0.5, 0.1, -0.1], hd + [0.5, 0.5, 0.3], 0.002, 'glow', 0xff8ad8, ('rigid', 'nHead'), oth=0.0, faces=300, sym=False, ao=False))
    Rf = rotx(0.25) @ rotz(0.06)
    fc = hd + [0, -0.12, 0.13]
    face = U(S.box(fc, [0.15, 0.1, 0.01], r=0.006, rot=Rf), *[S.capsule(hd + [sx * 0.1, 0.0, 0.1], fc + Rf @ np.array([sx * 0.1, 0.09, 0]), 0.004) for sx in (1, -1)])

    def fcol(V, N):
        q = (V - fc) @ Rf
        c = tile(0xe8e2d4, V)
        c[(np.abs(q[:, 1]) < 0.018) & (np.abs(q[:, 0]) < 0.12)] = lin(0x6a1a8a)
        c[(np.abs(q[:, 0]) > 0.14) | (np.abs(q[:, 1]) > 0.092)] = lin(0x3a3a44)
        return c
    P.append(Part('face', face, hd + [-0.25, -0.3, -0.05], hd + [0.25, 0.1, 0.25], 0.003, 'acc', fcol, ('rigid', 'nHead'), oth=0.6, faces=500, sym=False))
    # 腕：電線（がいしの玉）・肩の筒・先はほつれた線
    for s, sx in (('L', 1), ('R', -1)):
        pts = chain_pts(rig, 'nArm' + s, 5, tip=[0, -0.12, 0.04])
        names = ['nArm%s%d' % (s, i) for i in range(5)]
        P.append(Part('cable' + s, tube(pts, 0.032, 0.028, k=0.02), np.min(pts, 0) - 0.1, np.max(pts, 0) + 0.1, 0.004, 'acc', lambda V, N: tile(CABLE, V) * (0.85 + 0.15 * (np.sin(V[:, 1] * 90) > 0))[:, None], 'body', names, oth=0.7, faces=900, sym=False))
        discs = []
        for k in range(1, len(pts) - 1):
            for j in range(2):
                q = pts[k] + (pts[k + 1] - pts[k]) * (0.3 + j * 0.35)
                ax = (pts[k + 1] - pts[k]) / np.linalg.norm(pts[k + 1] - pts[k])
                discs.append(S.torus(q, 0.038, 0.014, axis=ax))
        P.append(Part('discs' + s, U(*discs), np.min(pts, 0) - 0.1, np.max(pts, 0) + 0.1, 0.003, 'acc', INS, 'body', names, oth=0.4, faces=900, sym=False))
        P.append(Part('shoulder' + s, S.cylinder(pts[0] + [0, 0.02, 0], 0.075, 0.05, rr=0.012), pts[0] - 0.12, pts[0] + 0.12, 0.003, 'metal', TR, ('rigid', 'nChest'), oth=0.7, faces=400, sym=False))
        e = pts[-1]
        fr = U(*[tube([e + [0, 0.03, 0], e + np.array([math.sin(a) * 0.04, -0.06, math.cos(a) * 0.04]), e + np.array([math.sin(a) * 0.09, -0.15, math.cos(a) * 0.09])], 0.008, 0.004, k=0.005) for a in np.linspace(0, 2 * math.pi, 8)[:-1]], k=0.005)
        P.append(Part('fray' + s, fr, e - 0.2, e + 0.1, 0.0025, 'acc', CABLE, ('rigid', names[-1]), oth=0.3, faces=500, sym=False))
    # 尾：絡まった電線
    for i in range(3):
        pts = chain_pts(rig, 'nTail%d_' % i, 4, tip=[0, -0.08, -0.06])
        names = ['nTail%d_%d' % (i, k) for k in range(4)]
        P.append(Part('tail%d' % i, tube(pts, 0.028, 0.016, k=0.02), np.min(pts, 0) - 0.08, np.max(pts, 0) + 0.08, 0.004, 'acc', CABLE, 'body', names, oth=0.6, faces=500, sym=False))
    return P


DESIGNS = {'outou': outou, 'touchoku': touchoku, 'tsugihagi': tsugihagi, 'nurikae': nurikae}
