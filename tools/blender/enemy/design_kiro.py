# -*- coding: utf-8 -*-
"""
境界侵食：帰路（きろ）の体の意匠「怪異強化案」（2026-11-07・利用者の設定画 docs/shinshoku/reference/kiro_sheet.webp）。
道具・包み・重み・読み手は P17 と同じ（build_enemy.py）。骨はコードの異形と同じ rigs/kiro.json（休みは直立。
前かがみ・首の垂れはゲームの動き（shinshoku/actor/anim.js の kiroPose の hunch）が付ける）。

設定画から読んだ形：
  頭   面（めん）のようにつるりとした顔・目の高さを横一文字に深く割る裂け目（こめかみまで回り込む）・細い鼻すじ・小さな口の線・
       顔のひび（細い溝の線）・薄くなった乱れた髪（頭頂は薄い・横と後ろに房）
  体   やせて細長い首・なで肩の細い胴・ひざまで届く長い腕・骨ばった長い指（曲げて垂らす）
  服   腰丈のファスナーの作業ジャンパー（青みの灰色・すり切れ・裾と袖口のリブ・折りえり・胸のファスナーのポケット・肩の切り替え）・
       太めの作業ズボン（ひざと足首のしわ）・すり減った作業靴（厚い底・ひも）
意匠は独自（グロテスクにしない・流血や欠損の表現はしない）。座標は glTF：Y 上・+Z 前・+X がキャラクターの左・m。
"""
import math

import numpy as np

import build_enemy as BE
import sdf as S

Part, B, lin, hash3, U, limb, hand = BE.Part, BE.B, BE.lin, BE.hash3, BE.U, BE.limb, BE.hand
rotx, roty, rotz = BE.rotx, BE.roty, BE.rotz

SKIN = 0x85827e      # 灰色の肌（設定画の面の色）
SKIN_D = 0x6e6c69
HAIR = 0x34312f
JACKET = 0x4d5366    # 青みの灰色の作業ジャンパー
JACKET_D = 0x383d4c
JACKET_L = 0x6a7084  # すり切れた所
PANTS = 0x4a4d58
PANTS_D = 0x353844
BOOT = 0x3e3630
BOOT_D = 0x2e2924
SOLE = 0x211f1d
ZIP = 0x6c6e74


def tile(h, V):
    return np.tile(lin(h), (len(V), 1))


def seg2(P, a, b):
    """2 次元の線分 a-b への距離（P：(n,2)）"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    d = b - a
    t = np.clip(((P - a) @ d) / max(d @ d, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * d), axis=1)


def poly2(P, pts):
    return np.min(np.stack([seg2(P, pts[i], pts[i + 1]) for i in range(len(pts) - 1)], -1), -1)


def worn(c, V, seed, amt=0.1, scale=2.4):
    """布の濃淡とすり切れ（明るいまだら）"""
    n = hash3(V * scale, seed)
    c = c * (0.93 + 0.07 * hash3(V * 7.0, seed + 1))[:, None]
    m = np.clip((n - 0.35) * 2.2, 0, 1) * amt
    return c * (1 + m)[:, None]


def claw_hand(w, side, k=1.0):
    """骨ばった長い手：手のひら＋手のひら側へ曲げた 4 本の指（3 節・節は少し太い）＋親指。
    垂らした手の手のひらは体の側（-sx）を向く。指はそちらへ曲がり、少し前へ（設定画の鉤のような手）。k：大きさ（静養は 1.5）"""
    sx = 1 if side == 'left' else -1
    palm = S.box(w + np.array([0, -0.055, 0.004]) * k, np.array([0.012, 0.05, 0.036]) * k, r=0.011 * k)
    fs = [palm]
    k_ = k
    for k, dz in enumerate((-0.026, -0.009, 0.009, 0.026)):
        L = 0.052 * k_ * (0.9, 1.0, 0.97, 0.82)[k]                                              # 付け根の節の長さ（長い指）
        p = w + np.array([0, -0.1, dz * 1.05 + 0.004]) * k_
        ang = 0.15 + 0.05 * k
        for j, (seg, r0, r1, bend) in enumerate(((L, 0.0085 * k_, 0.0075 * k_, 0.5), (L * 0.72, 0.0075 * k_, 0.0065 * k_, 0.55), (L * 0.55, 0.0065 * k_, 0.005 * k_, 0.4))):
            d = np.array([-sx * math.sin(ang), -math.cos(ang), 0.25 * math.sin(ang)])
            d /= np.linalg.norm(d)
            q = p + d * seg
            fs.append(S.round_cone(p, q, r0, r1))
            fs.append(S.sphere(p, r0 * 1.12))                                                   # 節
            p, ang = q, ang + bend
    tb = w + np.array([-sx * 0.012, -0.035, 0.03]) * k_                                         # 親指
    t1 = tb + np.array([-sx * 0.012, -0.04, 0.022]) * k_
    t2 = t1 + np.array([-sx * 0.018, -0.028, 0.004]) * k_
    fs += [S.round_cone(tb, t1, 0.01 * k_, 0.0085 * k_), S.round_cone(t1, t2, 0.0085 * k_, 0.006 * k_)]
    f = U(*fs, k=0.006 * k_)

    def col(V, N):
        c = tile(SKIN, V) * (0.94 + 0.06 * hash3(V * 20, 71))[:, None]
        return c
    return Part(side + '_hand', f, w + np.array([-0.12, -0.3, -0.1]) * k_, w + np.array([0.12, 0.03, 0.12]) * k_, 0.0024, 'skin', col,
                ('rigid', side + 'Hand'), oth=0.7, faces=800, sym=False)


def kiro(rig, var='jacket'):
    """var：'jacket'（作業ジャンパー・設定画の正面）／個体差 'coat'（長いコートの男）・'cardigan'（カーディガンの太った男）・'obaa'（老女）"""
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    hc = np.array([0, 1.638, 0.004])
    P = []

    # ── 頭：小さめの細長い頭蓋＋ほお骨＋細いあご。顔の前はなめらか（面のよう）
    SK_C, SK_R = hc + [0, 0.014, -0.008], np.array([0.074, 0.1, 0.088])
    skull = U(S.ellipsoid(SK_C, SK_R),
              S.ellipsoid(hc + [0, -0.055, 0.022], [0.05, 0.058, 0.064]), k=0.04)
    skull = U(skull, *[S.ellipsoid(hc + [sx * 0.045, -0.022, 0.05], [0.022, 0.02, 0.024]) for sx in (1, -1)], k=0.02)   # ほお骨
    skull = U(skull, S.ellipsoid(hc + [0, -0.012, 0.079], [0.0095, 0.032, 0.012]), k=0.018)        # 細い鼻すじ
    # 目の高さの横一文字の裂け目（顔の前をこめかみからこめかみまで。両端は少し上がる）
    sy = hc[1] + 0.008
    SW = 0.07

    def slit(Q):
        x, y, z = Q[:, 0], Q[:, 1], Q[:, 2]
        yc = sy + 0.002 * (np.abs(x) / SW) ** 2
        th = 0.0055 + 0.0022 * np.clip(1 - np.abs(x) / SW, 0, 1)                              # まんなかが少し太い
        d_y = np.abs(y - yc) - th
        d_front = -(z - (hc[2] + 0.005))                                                      # 顔の前だけ
        d_x = np.abs(x) - SW
        return np.maximum(np.maximum(d_y, d_front), d_x)
    skull0 = skull
    head = S.sub(skull, slit, k=0.002)
    mouth = S.box(hc + [0, -0.083, 0.072], [0.015, 0.0015, 0.02], r=0.0011, rot=rotx(-0.25))
    head = S.sub(head, mouth, k=0.002)

    def head_col(V, N):
        c = tile(SKIN, V)
        c *= (0.95 + 0.05 * hash3(V * 9, 1))[:, None]
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        yc = sy + 0.002 * (np.abs(x) / SW) ** 2
        inside = (np.abs(y - yc) < 0.0085) & (z > hc[2] + 0.005) & (np.abs(x) < SW)        # 裂け目の中は暗く
        c[inside] = lin(0x0c0b0b)
        rim = (np.abs(y - yc) < 0.012) & ~inside & (z > hc[2] + 0.01) & (np.abs(x) < SW)
        c[rim] *= 0.75
        c[(z > hc[2]) & (y < yc) & (y > yc - 0.03) & (np.abs(x) < SW)] *= 0.9                 # 裂け目の下の影
        # 顔のひび（細い溝の線）：額から裂け目へ・頬・あご
        P2 = V[:, :2] - hc[:2]
        front = z > hc[2] + 0.015
        cracks = [[(0.004, 0.095), (0.018, 0.064), (0.01, 0.038), (0.026, 0.014)],
                  [(-0.044, 0.064), (-0.03, 0.042), (-0.04, 0.02)],
                  [(-0.048, -0.008), (-0.04, -0.045), (-0.046, -0.08), (-0.035, -0.11)],
                  [(0.044, -0.016), (0.05, -0.052)]]
        d = np.min(np.stack([poly2(P2, cr) for cr in cracks], -1), -1)
        c[front & (d < 0.0014)] *= 0.55
        c[(np.abs(y - (hc[1] - 0.083)) < 0.0018) & (np.abs(x) < 0.014) & (z > hc[2] + 0.045)] = lin(0x2a2826)   # 口の線
        return c
    HK, HP = 1.1, hc + np.array([0, -0.08, -0.015])                                           # 頭の大きさ（設定画は頭が大きい・2026-11-07）

    def big(f):
        return lambda Q, f=f: f((Q - HP) / HK + HP) * HK

    def big_col(cf):
        return lambda V, N, cf=cf: cf((V - HP) / HK + HP, N)
    skull = big(skull)
    P.append(Part('head', big(head), hc - 0.18, hc + 0.18, 0.0026, 'skin', big_col(head_col), ('rigid', 'head'), oth=1.0, faces=2200))

    # ── 髪：薄くなった乱れた短い髪。地肌に沿った薄い層（すき間から地肌）＋細い毛の房がたくさん（横と後ろは下へ寝る・てっぺんは立つ）
    def thin_layer(Q):
        d = skull0(Q) - 0.0045                                                                   # 頭の本当の形（あごとの滑らかなつなぎでふくらんだ後頭部も）に沿う
        shell = np.maximum(d, -(d + 0.0065))
        # 生え際：前は額の上（顔の上 1/3 から）・横は耳の上・後ろはうなじ
        rel = Q - SK_C
        line = hc[1] + 0.02 - 2.2 * np.maximum(0, -rel[:, 2] - 0.005) + 0.3 * np.maximum(0, rel[:, 2] - 0.02)   # 後ろはうなじまで
        cut = -(Q[:, 1] - line)
        return np.maximum(shell, cut)
    rng = np.random.default_rng(11)
    locks = []
    for i in range(34):
        th = rng.uniform(-math.pi, math.pi)                                                    # 頭のまわりの向き（0＝前）
        ph = rng.uniform(0.05, 1.25)                                                           # 上からの角度
        if math.cos(th) > 0.2 and ph > 0.25:
            continue                                                                            # 額・顔の前には生やさない
        d = np.array([math.sin(th) * math.sin(ph), math.cos(ph), math.cos(th) * math.sin(ph)])
        base = SK_C + d * (SK_R + 0.006)
        down = np.array([0, -1.0, -0.6 if math.cos(th) > 0 else 0.0])                         # 前の方の毛は後ろへ流す
        tang = down - d * (down @ d)                                                           # 頭に沿って下へ
        tang /= max(np.linalg.norm(tang), 1e-6)
        lift = 0.45 if ph < 0.45 else 0.2                                                      # てっぺんは少し浮く・横と後ろは寝る（乱れた薄い髪）
        out = tang * (1 - lift) + d * lift + rng.normal(0, 0.22, 3)
        out /= np.linalg.norm(out)
        L = rng.uniform(0.022, 0.045) * (1.3 if math.cos(th) < -0.3 else 1.0)
        mid = base + out * L * 0.5
        tip = mid + (out + tang * 0.6 + rng.normal(0, 0.35, 3)) / 1.8 * L * 0.6
        locks += [S.round_cone(base, mid, 0.0065, 0.0045), S.round_cone(mid, tip, 0.0045, 0.0018)]
    hair = U(thin_layer, *locks, k=0.006)

    def hair_col(V, N):
        c = tile(HAIR, V)
        c *= (0.8 + 0.3 * np.abs(np.sin(V[:, 0] * 260 + V[:, 2] * 90 + V[:, 1] * 40)))[:, None]
        top = (V[:, 1] > hc[1] + 0.075) & (np.abs(V[:, 0]) < 0.045)
        c[top] = c[top] * 0.4 + lin(SKIN)[None] * 0.6                                        # 頭頂の薄い所（地肌が透ける）
        return c
    if var == 'cardigan':                                                                      # 禿げた頭：横と後ろに低く残るだけ
        hair = S.inter(hair, lambda Q: Q[:, 1] - (hc[1] + 0.03 - 0.5 * np.maximum(0, -(Q[:, 2] - hc[2]) - 0.02)))
    elif var == 'obaa':                                                                        # 灰色のまとめ髪（後ろの上にお団子）
        def cap(Q):
            d = skull0(Q) - 0.008
            shell = np.maximum(d, -(d + 0.01))
            rel = Q - SK_C
            line = hc[1] + 0.045 - 2.2 * np.maximum(0, -rel[:, 2] - 0.005) + 0.2 * np.maximum(0, rel[:, 2] - 0.02)
            return np.maximum(shell, -(Q[:, 1] - line))
        bun = U(S.ellipsoid(SK_C + [0, 0.055, -0.088], [0.036, 0.032, 0.034]), S.torus(SK_C + [0, 0.05, -0.08], 0.026, 0.009, axis=(0, 0.6, -0.8)), k=0.01)
        hair = U(cap, bun, *locks[:8], k=0.008)

        def hair_col(V, N):
            c = tile(0x8e8b86, V)
            c *= (0.8 + 0.25 * np.abs(np.sin(V[:, 0] * 200 + V[:, 1] * 120)))[:, None]
            return c
    P.append(Part('hair', big(hair), hc - 0.22, hc + 0.22, 0.0026, 'hair', big_col(hair_col), ('rigid', 'head'), oth=0.35, faces=2800, sym=False))

    # ── 首：細く長い・のどぼとけ・筋
    neck = U(S.round_cone(nk + [0, -0.08, -0.012], nk + [0, 0.0, -0.014], 0.044, 0.033), S.round_cone(nk + [0, 0.0, -0.014], hc + [0, -0.07, -0.02], 0.033, 0.028),
             S.ellipsoid(nk + [0, 0.03, 0.024], [0.011, 0.016, 0.01]), k=0.012)
    for sx in (1, -1):
        neck = U(neck, S.capsule(hc + [sx * 0.03, -0.08, -0.0], nk + [sx * 0.012, -0.045, 0.026], 0.0065), k=0.01)   # 胸鎖乳突筋
    P.append(Part('neck', neck, nk - 0.13, hc + np.array([0.13, 0.02, 0.13]),   # 範囲は首の全周（前は hc の x・z＝0 で切れていた）
                  0.0032, 'skin', lambda V, N: tile(SKIN, V) * (0.92 + 0.06 * hash3(V * 9, 2))[:, None],
                  'body', ['neck', 'head', 'chest'], faces=700))

    # ── 上着（個体ごと）
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    HEM = 0.8
    if var == 'jacket':
        body = U(S.ellipsoid(ch + [0, 0.05, -0.008], [0.155, 0.18, 0.106]),
                 S.ellipsoid(sp + [0, 0.02, 0.0], [0.15, 0.13, 0.1]),
                 S.capsule(sh_l + [-0.03, -0.025, -0.008], sh_r + [0.03, -0.025, -0.008], 0.05),   # なで肩
                 S.ellipsoid(hp + [0, -0.01, -0.004], [0.155, 0.11, 0.11]),
                 S.ellipsoid(ch + [0, 0.1, -0.05], [0.125, 0.11, 0.07]), k=0.06)   # 丸まった背中
        body = lambda Q, f0=body: f0(Q) - 0.004 * hash3(Q * 5.5, 4) * S.smoothstep(1.2, 0.95, Q[:, 1])   # 胴の下のゆるいしわ
        body_band = body                                                                           # 裾のリブはたるみの前の形（すぼまる）
        blouse = S.ellipsoid(np.array([0, HEM + 0.06, 0.004]), [0.172, 0.075, 0.125])              # 裾の上のたるみ（ブルゾンのふくらみ）

        def body(Q, f0=body, bl=blouse):
            d = S.union(f0, bl, k=0.05)(Q)
            y = Q[:, 1]
            sag = S.smoothstep(HEM + 0.03, HEM + 0.06, y) * S.smoothstep(HEM + 0.2, HEM + 0.1, y)
            return d - 0.005 * sag * np.sin(y * 150 + 2.0 * hash3(Q * 4, 61))                      # たるみの横じわ
        jacket = S.inter(body, lambda Q: (HEM + 0.025) - Q[:, 1])

        def jacket_col(V, N):
            x, y, z = V[:, 0], V[:, 1], V[:, 2]
            c = worn(tile(JACKET, V), V, 3, amt=0.16)
            front = z > 0.02
            c[front & (np.abs(x) < 0.009) & (y < 1.42)] = lin(JACKET_D)                         # 前の合わせ
            c[front & (np.abs(x) < 0.0025) & (y < 1.42)] = lin(ZIP)                              # ファスナー
            # 胸のファスナーのポケット（キャラクターの左＝+X）
            pk = seg2(np.stack([x, y], -1), (0.055, 1.265), (0.115, 1.245))
            c[front & (pk < 0.0028)] = lin(ZIP)
            # 肩の切り替え（前と後ろ）・脇の縫い目
            c[(np.abs(y - (1.335 - 0.25 * np.abs(x))) < 0.0025) & (np.abs(x) < 0.15)] *= 0.72
            c[(np.abs(np.abs(x) - 0.13) < 0.0025) & (y < 1.25) & (np.abs(z) < 0.03)] *= 0.75
            # 背中のヨークと縦のしわ
            c[(z < -0.02) & (np.abs(y - 1.3) < 0.0025)] *= 0.72
            return c
        P.append(Part('jacket', jacket, [-0.32, HEM - 0.02, -0.2], [0.32, 1.52, 0.2], 0.0055, 'cloth', jacket_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2900))
        # 裾のリブの帯（少しすぼまる）
        hem = S.inter(S.offset(body_band, -0.002), lambda Q: np.abs(Q[:, 1] - (HEM + 0.016)) - 0.02)
        hem = S.sub(hem, S.offset(body_band, -0.018))
        P.append(Part('hem', hem, [-0.3, HEM - 0.03, -0.2], [0.3, HEM + 0.06, 0.2], 0.004, 'cloth',
                      lambda V, N: tile(JACKET_D, V) * (0.88 + 0.12 * (np.sin(np.arctan2(V[:, 0], V[:, 2]) * 70) > 0))[:, None],
                      'body', ['hips', 'spine'], oth=0.6, faces=600))
        # 折りえり：首の付け根から下へ広がる薄い殻（えりを折り返した形）。前は V に開く
        def collar(Q):
            top, bot = nk + [0, -0.01, -0.014], nk + [0, -0.095, -0.006]
            outer = S.round_cone(bot, top, 0.085, 0.045)(Q)
            inner = S.round_cone(bot + [0, -0.01, 0], top + [0, 0.02, 0], 0.077, 0.037)(Q)
            shell = np.maximum(outer, -inner)
            band = np.maximum(-(Q[:, 1] - (nk[1] - 0.1)), Q[:, 1] - (nk[1] - 0.005))
            vee = 0.6 * np.abs(Q[:, 0]) - 0.4 * (Q[:, 1] - (nk[1] - 0.1)) + 0.004                 # 前の V の開き
            open_front = np.where(Q[:, 2] > 0.02, -vee, -1.0)
            return np.maximum(np.maximum(shell, band), -(-open_front))
        P.append(Part('collar', collar, nk - 0.15, nk + 0.08, 0.0035, 'cloth', lambda V, N: worn(tile(JACKET, V), V, 9, amt=0.2),
                      'body', ['neck', 'chest'], oth=0.8, faces=800))
        # 胸のポケットのファスナーの引き手・前のファスナーの引き手
        pulls = U(S.box([0.004, 1.12, 0.098], [0.005, 0.012, 0.0025], r=0.002), S.box([0.115, 1.235, 0.082], [0.004, 0.01, 0.0025], r=0.002, rot=rotz(-0.3)))
        P.append(Part('zip_pulls', pulls, [-0.03, 1.08, 0.05], [0.14, 1.28, 0.13], 0.0018, 'metal', ZIP, 'body', ['spine', 'chest'], oth=0.0, faces=200, sym=False, ao=False))
        SLEEVE = (JACKET, JACKET_D, (0.052, 0.05, 0.047))
        PANTS_V, LEG_R = PANTS, (0.093, 0.08, 0.08, 0.077)
    elif var == 'coat':
        # ── 長いコートの男（設定画の個体差・左上）：ひざ丈のくたびれたコート（前は開いている・えり・ポケットのふた）・中に暗いシャツとネクタイ
        slim = U(S.ellipsoid(ch + [0, 0.05, -0.008], [0.145, 0.18, 0.1]), S.ellipsoid(sp + [0, 0.02, 0.0], [0.135, 0.13, 0.092]),
                 S.capsule(sh_l + [-0.03, -0.025, -0.008], sh_r + [0.03, -0.025, -0.008], 0.048),
                 S.ellipsoid(hp + [0, -0.01, -0.004], [0.145, 0.1, 0.104]), S.ellipsoid(ch + [0, 0.1, -0.05], [0.12, 0.11, 0.07]), k=0.06)
        shirt = S.inter(slim, lambda Q: 0.8 - Q[:, 1])

        def shirt_col(V, N):
            x, y, z = V[:, 0], V[:, 1], V[:, 2]
            c = worn(tile(0x50525a, V), V, 41, amt=0.1)
            c[(z > 0.03) & (np.abs(x) < 0.013 - 0.004 * (1.4 - y)) & (y > 1.0) & (y < 1.41)] = lin(0x26282e)      # ネクタイ
            return c
        P.append(Part('shirt', shirt, [-0.3, 0.75, -0.2], [0.3, 1.52, 0.2], 0.0055, 'cloth', shirt_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=1100))

        def coat_gap(Q):                                                                       # 前の開き（首から胸へ広がり、下は同じ幅）
            y = Q[:, 1]
            w = 0.022 + 0.07 * np.clip((1.42 - y) / 0.28, 0, 1)
            return np.where(Q[:, 2] > 0.02, np.abs(Q[:, 0]) - w, 1.0)                        # 開きの中が負（引く形）
        coat_t = S.inter(S.sub(S.offset(slim, 0.019), S.offset(slim, 0.005)), lambda Q: 0.86 - Q[:, 1])
        coat_t = S.sub(coat_t, coat_gap)

        def coat_col(V, N):
            c = worn(tile(0x4f4c4a, V), V, 43, amt=0.18)
            c[(V[:, 2] > 0.02) & (np.abs(V[:, 0]) < 0.105) & (V[:, 1] > 1.2)] *= 0.85              # えりの影
            return c
        P.append(Part('coat', coat_t, [-0.33, 0.8, -0.22], [0.33, 1.55, 0.22], 0.007, 'cloth', coat_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=1800))
        lap = U(*[S.box(ch + [sx * 0.07, 0.14, 0.1], [0.04, 0.11, 0.007], r=0.004, rot=rotz(sx * 0.3) @ rotx(-0.2)) for sx in (1, -1)])
        P.append(Part('lapels', lap, ch + [-0.18, -0.05, -0.05], ch + [0.18, 0.32, 0.22], 0.0035, 'cloth', 0x45423f, 'body', ['chest', 'neck', 'spine'], oth=0.7, faces=500))
        y0, y1 = 0.42, 0.9                                                                     # すそ（ひざ丈）

        def skirt_f(Q):
            o = S.round_cone(hp + [0, 0.0, -0.006], np.array([0, y0 - 0.05, -0.01]), 0.16, 0.215)(Q)
            i = S.round_cone(hp + [0, 0.05, -0.006], np.array([0, y0 - 0.1, -0.01]), 0.142, 0.197)(Q)
            d = np.maximum(np.maximum(o, -i), np.maximum(y0 - Q[:, 1], Q[:, 1] - y1))
            gap = np.where(Q[:, 2] > 0.0, np.abs(Q[:, 0]) - (0.07 + 0.05 * (y1 - Q[:, 1])), 1.0)
            d = np.maximum(d, -gap)
            return d - 0.004 * np.sin(np.arctan2(Q[:, 0], Q[:, 2]) * 9) * S.smoothstep(y1 - 0.1, y0 + 0.1, Q[:, 1])

        def skirt_col(V, N):
            c = coat_col(V, N)
            c[V[:, 1] < y0 + 0.02] *= 0.8
            for sx in (1, -1):                                                                  # ポケットのふた
                c[(np.abs(V[:, 0] - sx * 0.13) < 0.05) & (np.abs(V[:, 1] - 0.78) < 0.012) & (V[:, 2] > 0.05)] *= 0.75
            return c
        P.append(Part('coat_skirt', skirt_f, [-0.3, y0 - 0.05, -0.28], [0.3, y1 + 0.05, 0.28], 0.0105, 'cloth', skirt_col, 'skirt', oth=0.9, faces=1400, sym=False))
        SLEEVE = (0x4f4c4a, 0x403d3b, (0.058, 0.055, 0.052))
        PANTS_V, LEG_R = 0x3b3d45, (0.082, 0.07, 0.068, 0.065)
    elif var == 'cardigan':
        # ── カーディガンの男（設定画の個体差・右上）：太った体・毛糸のカーディガン（V えり・ボタン・ポケット）・中にえりのあるシャツ
        fat = U(S.ellipsoid(ch + [0, 0.04, 0.0], [0.17, 0.18, 0.12]), S.ellipsoid(sp + [0, -0.04, 0.03], [0.178, 0.15, 0.148]),
                S.capsule(sh_l + [-0.03, -0.03, -0.008], sh_r + [0.03, -0.03, -0.008], 0.058),
                S.ellipsoid(hp + [0, -0.0, 0.01], [0.175, 0.11, 0.13]), S.ellipsoid(ch + [0, 0.1, -0.05], [0.14, 0.11, 0.08]), k=0.07)
        P.append(Part('shirt', S.inter(fat, lambda Q: 0.8 - Q[:, 1]), [-0.3, 0.75, -0.25], [0.3, 1.52, 0.25], 0.006, 'cloth',
                      lambda V, N: worn(tile(0x7a7c82, V), V, 45, amt=0.08), 'body', ['hips', 'spine', 'chest', 'neck'], faces=1200))

        def vneck(Q):
            y = Q[:, 1]
            w = 0.012 + 0.085 * np.clip((y - 1.08) / 0.32, 0, 1)
            return np.where((Q[:, 2] > 0.03) & (y > 1.08), np.abs(Q[:, 0]) - w, 1.0)
        card = S.inter(S.sub(S.offset(fat, 0.014), S.offset(fat, 0.004)), lambda Q: 0.76 - Q[:, 1])
        card = S.sub(card, vneck)
        card = lambda Q, f0=card: f0(Q) - 0.0025 * (np.sin(Q[:, 0] * 260) > 0)                 # 毛糸のうね

        def card_col(V, N):
            x, y, z = V[:, 0], V[:, 1], V[:, 2]
            c = worn(tile(0x5e5852, V), V, 47, amt=0.12)
            c *= (0.9 + 0.1 * (np.sin(x * 260 + 0.3 * np.sin(y * 40)) > 0))[:, None]
            front = z > 0.08
            c[front & (np.abs(x) < 0.006) & (y < 1.1)] *= 0.7                                     # 前の合わせ
            for yb in (1.06, 0.98, 0.9, 0.82):                                                    # ボタン
                c[front & (np.abs(x - 0.012) < 0.008) & (np.abs(y - yb) < 0.008)] = lin(0x2a2622)
            for sx in (1, -1):                                                                     # ポケット
                c[front & (np.abs(x - sx * 0.09) < 0.045) & (np.abs(y - 0.86) < 0.004)] *= 0.7
            c[y < 0.79] *= 0.85                                                                    # 裾のゴム編み
            return c
        P.append(Part('cardigan', card, [-0.34, 0.72, -0.25], [0.34, 1.55, 0.25], 0.0055, 'cloth', card_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2800))
        flaps = U(*[S.box(nk + [sx * 0.045, -0.09, 0.07], [0.028, 0.03, 0.005], r=0.004, rot=rotz(sx * 0.6) @ rotx(-0.4)) for sx in (1, -1)])
        P.append(Part('shirt_collar', flaps, nk + np.array([-0.15, -0.16, -0.05]), nk + np.array([0.15, 0.03, 0.2]), 0.003, 'cloth', 0x8a8c90, 'body', ['neck', 'chest'], oth=0.6, faces=400))
        SLEEVE = (0x5e5852, 0x4e4944, (0.064, 0.06, 0.055))
        PANTS_V, LEG_R = 0x47433e, (0.1, 0.088, 0.086, 0.08)
    else:
        # ── 老女（設定画の個体差・右下）：灰色のまとめ髪・短いカーディガン（前は開く）・小さな柄のワンピース・ひだのある長いスカート・薄い靴下・平たい靴
        slim = U(S.ellipsoid(ch + [0, 0.03, -0.008], [0.132, 0.16, 0.096]), S.ellipsoid(sp + [0, 0.02, 0.0], [0.128, 0.12, 0.09]),
                 S.capsule(sh_l + [-0.035, -0.035, -0.008], sh_r + [0.035, -0.035, -0.008], 0.045),
                 S.ellipsoid(hp + [0, -0.01, 0.0], [0.15, 0.1, 0.106]), S.ellipsoid(ch + [0, 0.11, -0.06], [0.12, 0.11, 0.08]), k=0.06)

        def dress_col(V, N):
            c = worn(tile(0x4c4b55, V), V, 49, amt=0.1)
            dots = (np.sin(V[:, 0] * 220) * np.sin(V[:, 1] * 220) * np.sin(V[:, 2] * 220 + 1)) > 0.55   # 小さな柄
            c[dots] *= 1.35
            return c
        P.append(Part('dress', S.inter(slim, lambda Q: 0.84 - Q[:, 1]), [-0.3, 0.8, -0.22], [0.3, 1.5, 0.22], 0.0055, 'cloth', dress_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=1500))
        card = S.inter(S.sub(S.offset(slim, 0.016), S.offset(slim, 0.003)), lambda Q: 0.9 - Q[:, 1])
        card = S.sub(card, lambda Q: np.where(Q[:, 2] > 0.02, np.abs(Q[:, 0]) - (0.03 + 0.03 * np.clip((1.38 - Q[:, 1]) / 0.3, 0, 1)), 1.0))

        def card_col(V, N):
            c = worn(tile(0x625d5c, V), V, 53, amt=0.12)
            c *= (0.9 + 0.1 * (np.sin(V[:, 0] * 240) > 0))[:, None]
            c[V[:, 1] < 0.93] *= 0.85
            return c
        P.append(Part('cardigan', card, [-0.32, 0.85, -0.22], [0.32, 1.55, 0.22], 0.0075, 'cloth', card_col, 'body',
                      ['hips', 'spine', 'chest', 'neck', 'leftUpperArm', 'rightUpperArm'], faces=2000))
        y0, y1 = 0.26, 0.92                                                                    # 長いスカート（ふくらはぎまで）

        def skirt_f(Q):
            o = S.round_cone(hp + [0, 0.0, -0.004], np.array([0, y0 - 0.05, -0.006]), 0.152, 0.205)(Q)
            d = np.maximum(o, np.maximum(y0 - Q[:, 1], Q[:, 1] - y1))                       # 中の詰まった形（脚は中に隠れる・薄い殻より網が軽い）
            return d - 0.005 * np.sin(np.arctan2(Q[:, 0], Q[:, 2]) * 26) * S.smoothstep(0.82, 0.5, Q[:, 1])   # ひだ

        def skirt_col(V, N):
            c = dress_col(V, N) * 0.9
            c[V[:, 1] < y0 + 0.02] *= 0.8
            return c
        P.append(Part('skirt', skirt_f, [-0.3, y0 - 0.05, -0.28], [0.3, y1 + 0.05, 0.28], 0.006, 'cloth', skirt_col, 'skirt', oth=0.9, faces=2000, sym=False))
        SLEEVE = (0x625d5c, 0x524d4c, (0.05, 0.047, 0.044))
        PANTS_V, LEG_R = None, None

    # ── 袖（長い腕・ゆったり）・袖口のリブ・細い手首・骨ばった長い指
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        sr = SLEEVE[2]
        sl = U(limb(ua + [0, -0.01, 0], la, sr[0], sr[1]), limb(la, ha + [0, 0.05, 0], sr[1], sr[2]), k=0.03)
        sl = lambda Q, f0=sl, la=la: f0(Q) - 0.0035 * np.sin(Q[:, 1] * 120 + Q[:, 0] * 30) * np.exp(-((Q[:, 1] - la[1]) * 14) ** 2)   # ひじのしわ

        def scol(V, N, ha=ha, seed=(11 if s == 'left' else 13)):
            c = worn(tile(SLEEVE[0], V), V, seed, amt=0.18)
            c[V[:, 1] < ha[1] + 0.085] = lin(SLEEVE[1])                                          # 袖口
            return c
        P.append(Part(s + '_sleeve', sl, ua - [0.12, 0.75, 0.12], ua + [0.12, 0.1, 0.12], 0.0045, 'cloth', scol, 'body',
                      [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=1000, sym=False))
        WL = 0.085                                                                              # 手を下げる長さ（設定画の腕はひざより下まで）
        sx_ = 1 if s == 'left' else -1
        wrist = U(S.round_cone(ha + [0, 0.06, 0], ha + [0, -WL, 0.004], 0.021, 0.018),
                  S.ellipsoid(ha + [sx_ * 0.012, -0.01, -0.004], [0.008, 0.012, 0.008]), k=0.01)               # 手首の骨のでっぱり
        P.append(Part(s + '_wrist', wrist, ha - 0.16, ha + 0.1, 0.003, 'skin', SKIN, 'body', [s + 'LowerArm', s + 'Hand'], faces=400, sym=False))
        rig_h = {'bones': [dict(b, pos=list(np.array(b['pos']) + [0, -WL, 0])) if b['name'] == s + 'Hand' else b for b in rig['bones']]}
        P.append(claw_hand(B(rig_h, s + 'Hand'), s))

    # ── 作業ズボン（太め・ひざと足首のしわ）
    if PANTS_V is not None:
        pelvis = S.inter(S.ellipsoid(hp + [0, -0.03, -0.004], [0.145, 0.1, 0.104]), lambda Q: Q[:, 1] - (HEM + 0.04))
        P.append(Part('pelvis', pelvis, hp - [0.2, 0.2, 0.2], hp + [0.2, 0.05, 0.2], 0.005, 'cloth', lambda V, N: tile(PANTS_V, V) * (0.93 + 0.07 * hash3(V * 7, 17))[:, None],
                      'body', ['hips', 'leftUpperLeg', 'rightUpperLeg'], faces=900))
    for s in ('left', 'right'):
        up, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        if PANTS_V is None:                                                                    # 老女：スカートの下の細い脚（薄い靴下）・平たい靴
            stock = U(limb(up + [0, 0.0, 0], kn, 0.058, 0.044), limb(kn, ft + [0, 0.06, 0.005], 0.044, 0.032), k=0.02)
            P.append(Part(s + '_leg', stock, [up[0] - 0.2, 0.0, -0.2], [up[0] + 0.2, up[1] + 0.1, 0.2], 0.004, 'skin',
                          lambda V, N: tile(0x5f5853, V) * (0.94 + 0.06 * hash3(V * 9, 57))[:, None], 'body', [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=800, sym=False))
            shoe = U(S.box(ft + [0, 0.028, 0.05], [0.04, 0.028, 0.11], r=0.024), S.box(ft + [0, 0.008, 0.05], [0.043, 0.008, 0.113], r=0.006), k=0.004)
            P.append(Part(s + '_shoe', shoe, ft + [-0.1, -0.05, -0.1], ft + [0.1, 0.1, 0.22], 0.0035, 'acc',
                          lambda V, N: np.where((V[:, 1] < 0.016)[:, None], lin(SOLE)[None], lin(0x2e2a28)[None] * (0.9 + 0.1 * hash3(V * 20, 59))[:, None]),
                          ('rigid', s + 'Foot'), oth=0.8, faces=600, sym=False))
            continue
        f0 = U(limb(up + [0, 0.03, 0], kn, LEG_R[0], LEG_R[1]), limb(kn, ft + [0, 0.1, 0.01], LEG_R[2], LEG_R[3]), k=0.035)

        def fl(Q, f0=f0, kn=kn):
            y = Q[:, 1]
            wr = 0.0075 * np.sin(y * 85 + Q[:, 0] * 25 + 1.5 * hash3(Q * 3, 22)) * (np.exp(-((y - kn[1]) * 10) ** 2) + S.smoothstep(0.32, 0.12, y) + 0.35)   # ひざ・足首のたるみ・全体のしわ
            return f0(Q) - wr - 0.004 * hash3(Q * 6, 21)

        def col(V, N, kn=kn, seed=(23 if s == 'left' else 29)):
            c = worn(tile(PANTS_V, V), V, seed, amt=0.14)
            c[(V[:, 2] > 0) & (np.abs(V[:, 0] - kn[0]) < 0.003)] *= 0.8                             # 前の折り目
            c[V[:, 1] < 0.115] = c[V[:, 1] < 0.115] * 0.8                                             # すその汚れ
            return c
        P.append(Part(s + '_leg', fl, [up[0] - 0.25, 0.04, -0.25], [up[0] + 0.25, up[1] + 0.12, 0.25], 0.0065, 'cloth', col, 'body',
                      [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=1000, sym=False))
        # 作業靴（すり減った革・厚い底・ひも）
        boot = U(S.box(ft + [0, 0.05, 0.045], [0.05, 0.05, 0.125], r=0.04),
                 S.ellipsoid(ft + [0, 0.05, 0.135], [0.05, 0.045, 0.062]),
                 S.round_cone(ft + [0, 0.05, -0.0], ft + [0, 0.13, -0.005], 0.055, 0.05), k=0.025)
        sole = S.box(ft + [0, 0.014, 0.048], [0.057, 0.015, 0.138], r=0.012)
        boot = U(boot, sole, k=0.004)

        def bcol(V, N, ft=ft, seed=(31 if s == 'left' else 37)):
            c = worn(tile(BOOT, V), V, seed, amt=0.25, scale=8)
            c[V[:, 1] < 0.03] = lin(SOLE)
            c[(V[:, 1] < 0.04) & (np.sin(V[:, 2] * 400) > 0.5)] *= 0.7                           # 底の刻み
            lace = (V[:, 2] > ft[2] + 0.05) & (np.abs(V[:, 0] - ft[0]) < 0.022) & (V[:, 1] > 0.06) & (np.sin(V[:, 2] * 260) > 0.4)
            c[lace] = lin(BOOT_D)
            c[(V[:, 2] > ft[2] + 0.12) & (V[:, 1] < 0.08) & (V[:, 1] > 0.03)] *= 1.15                # つま先のすれ
            return c
        P.append(Part(s + '_shoe', boot, ft + [-0.12, -0.06, -0.12], ft + [0.12, 0.2, 0.26], 0.0045, 'acc', bcol, ('rigid', s + 'Foot'),
                      oth=0.8, faces=800, sym=False))
    # ── 手ぬぐい（置く時の色：tint＝その帰路の家の戸の灯りの色）。ズボンの左の腰に差して垂らす（2026-11-07 利用者の決定：マフラーの代わりの小物）
    if var == 'jacket':
        tw0, TR, TW = np.array([0.166, HEM + 0.045, 0.082]), roty(0.75), ('body', ['hips', 'leftUpperLeg'])   # ズボンの左の腰に差す
    else:
        lh2 = B(rig, 'leftHand') + np.array([0, -0.085, 0])                                    # 左手（下げた手の網）の指に掛けて垂らす
        tw0, TR, TW = lh2 + np.array([-0.01, -0.12, 0.035]), roty(0.25), (('rigid', 'leftHand'), None)
    def towel(Q):
        q = Q - tw0
        q = q @ TR                                                                             # 向き
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        sway = 0.006 * np.sin(y * 28)                                                          # 布のゆるい波
        body_ = S.box([0, -0.13, 0], [0.05, 0.13, 0.0045], r=0.003)(np.stack([x, y, z - sway], -1))
        fold = S.box([0, -0.005, 0.004], [0.054, 0.018, 0.009], r=0.006)(q)                   # 帯に差した折り返し
        return np.minimum(body_, fold)

    def towel_col(V, N):
        q = (V - tw0) @ TR
        c = np.ones((len(V), 3)) * 0.9
        c *= (0.92 + 0.08 * hash3(V * 12, 51))[:, None]
        edge = (np.abs(q[:, 1] + 0.055) < 0.006) | (np.abs(q[:, 1] + 0.21) < 0.006)          # 手ぬぐいの柄の 2 本線（tint の濃い色）
        c[edge] *= 0.55
        return c
    P.append(Part('towel', towel, tw0 - [0.12, 0.32, 0.12], tw0 + [0.12, 0.06, 0.12], 0.0025, 'cloth', towel_col, TW[0],
                  TW[1], oth=0.7, faces=500, sym=False, tint=True))
    return P


kiro.hide_face = True   # 顔（裂け目・口・ひび）は網に彫ったので、コードの顔のにじみ（faceMesh）は隠す
DESIGNS = {'kiro': kiro}
# 個体差（設定画の右の 4 体：ジャンパーは kiro そのもの）。骨は同じ rigs/kiro.json・包みは kiro_<var>.pack.json
for _v in ('coat', 'cardigan', 'obaa'):
    def _mk(rig, _v=_v):
        return kiro(rig, _v)
    _mk.hide_face, _mk.rig = True, 'kiro'
    DESIGNS['kiro_' + _v] = _mk
