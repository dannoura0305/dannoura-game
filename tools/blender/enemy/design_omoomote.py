# -*- coding: utf-8 -*-
"""
境界侵食：重面（おもおもて）の体の意匠「異形強化案」（2026-11-07・利用者の設定画 docs/shinshoku/reference/omoomote_sheet.webp）。
道具・包み・重み・読み手は P17 と同じ（build_enemy.py）。骨はコードの重面（shinshoku/actor/models.js の buildOmoomote）＝rigs/omoomote.json。
姿勢（右手で顔を押さえる・頭を傾ける・ひざを曲げてねじれた立ち方）はゲームの動き（anim.js の omoomotePose）が付ける。

設定画から読んだ形：
  頭   大きくゆがんだ頭に、いくつもの顔が重なって溶け合う（中央の大きな顔：長い鼻・半分閉じた目・小さな口／左下の顔：鼻と口と目／
       右上の欠けた顔：目と鼻すじ）。顔のあいだと首へ流れ落ちる肉のひだ・太く筋ばった首・細く乱れた髪
  体   やせた体・長い前腕（袖をまくる）・骨ばった長い指
  服   毛糸のカーディガン（ボタン）・えりのあるシャツ・ゆったりした作業ズボン・すり減った作業靴
  個体差  'skirt'（カーディガン・ブラウス・長いスカート・たるんだ靴下・平たい靴）／'stout'（太った体・ゆったりしたカーディガン・太いズボン）
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

SKIN = 0x8a7f80        # 灰色がかった赤紫の肌
SKIN_D = 0x5e5354
LIP = 0x6c5e60
EYE = 0x4a3c3d
HAIR = 0x3c3638
CARD = 0x4a4446        # カーディガン
CARD_D = 0x3a3537
SHIRT = 0x6c696c
PANTS = 0x3e3a3d
BOOT = 0x3c3532
SOLE = 0x1e1c1b


def frame(f, up, tilt=0.0):
    """顔の向き：f＝前（顔の外向き）・up＝上。tilt：前の軸のまわりの傾き（rad）"""
    f = np.asarray(f, float); f /= np.linalg.norm(f)
    u = np.asarray(up, float); u = u - f * (u @ f); u /= np.linalg.norm(u)
    r = np.cross(u, f)
    c, s = math.cos(tilt), math.sin(tilt)
    r, u = r * c + u * s, u * c - r * s
    return np.stack([r, u, f])                     # 行：右・上・前


def face_parts(c, M, s, eyes=2, nose=True, mouth=True, eye_open=0.35, nose_len=1.0):
    """1 つの顔：足す形（眉の張り・まぶた・目玉・鼻・唇・あご）と引く形（目のくぼみ・口の割れ目・鼻の穴）。
    局所の座標（右・上・前）×s。戻り値：(足す SDF のリスト, 引く SDF のリスト, 目玉の中心と半径のリスト, 唇の中心のリスト)"""
    c = np.asarray(c, float)

    def L(fl):                                    # 局所の SDF → 世界の SDF
        return lambda Q, fl=fl: fl(((Q - c) @ M.T) / s) * s
    add, sub, eyesW, lipsW, pre, eye_add = [], [], [], [], [], []
    xs = [0.3, -0.3][:eyes] if eyes else []
    add.append(L(S.ellipsoid([0, 0.27, -0.08], [0.6, 0.14, 0.2])))              # 眉の張り
    for x in xs:
        pre.append(L(S.ellipsoid([x, 0.08, 0.05], [0.21, 0.12, 0.1])))           # 目のくぼみ（浅め・先に頭から引く）
        ly = 0.1 + 0.08 * eye_open                                                 # 重い上まぶた：下の縁が目玉の真ん中あたり（半開き）
        eye_add.append(L(S.ellipsoid([x, ly, -0.02], [0.2, 0.08, 0.1])))           # 薄く、目玉のすぐ上にかぶさる
        eye_add.append(L(S.ellipsoid([x, -0.045, -0.03], [0.18, 0.035, 0.09])))   # 下まぶた（目玉より奥）
        add.append(L(S.ellipsoid([x * 1.05, -0.1, -0.01], [0.17, 0.05, 0.08])))  # 目の下のたるんだ袋
        eyesW.append((c + (np.array([x, 0.06, -0.05]) * s) @ M, 0.104 * s, c + (np.array([x, 0.03, 0.05]) * s) @ M, 0.05 * s))   # 目玉（まぶたの奥）・黒目（下寄り）
    if nose:
        nl = nose_len
        add.append(L(S.round_cone([0, 0.24, 0.02], [0, -0.3 * nl, 0.21], 0.06, 0.09)))     # 眉間から長い鼻すじ
        add.append(L(S.ellipsoid([0, -0.33 * nl, 0.18], [0.12, 0.085, 0.1])))     # 鼻先
        for x in (0.07, -0.07):
            add.append(L(S.ellipsoid([x * 1.2, -0.37 * nl, 0.11], [0.06, 0.05, 0.06])))   # 小鼻
            sub.append(L(S.sphere([x * 0.7, -0.41 * nl, 0.15], 0.025)))          # 鼻の穴
    if mouth:
        add.append(L(S.ellipsoid([0, -0.5, 0.07], [0.13, 0.045, 0.07])))          # すぼめた上唇
        add.append(L(S.ellipsoid([0, -0.575, 0.06], [0.11, 0.05, 0.07])))         # 下唇
        add.append(L(S.ellipsoid([0, -0.44, 0.06], [0.03, 0.05, 0.03])))          # 人中の筋
        sub.append(L(S.box([0, -0.538, 0.12], [0.1, 0.008, 0.06], r=0.005)))      # 口の割れ目
        for x in (0.15, -0.15):
            sub.append(L(S.ellipsoid([x, -0.54, 0.03], [0.04, 0.06, 0.04])))      # 口の端のくぼみ
        add.append(L(S.ellipsoid([0, -0.76, -0.04], [0.15, 0.11, 0.12])))          # あご
        lipsW.append((c + (np.array([0, -0.54, 0.11]) * s) @ M, 0.14 * s))
    return add, sub, eyesW, lipsW, pre, eye_add


def omoomote(rig, var=None):
    hd, nk, ch, sp, hp = B(rig, 'head'), B(rig, 'neck'), B(rig, 'chest'), B(rig, 'spine'), B(rig, 'hips')
    hc = np.array([0, 1.648, 0.0])
    P = []

    # ── 頭：ゆがんだ大きな頭蓋（こぶ）＋重なった顔 3 つ＋ひだ
    skull = U(S.ellipsoid(hc + [0, 0.03, -0.01], [0.1, 0.12, 0.105]),
              S.ellipsoid(hc + [0.03, -0.05, 0.03], [0.085, 0.1, 0.09]),                    # 左下へ垂れたふくらみ（2 つ目の顔の土台）
              S.ellipsoid(hc + [-0.045, 0.04, 0.02], [0.07, 0.08, 0.08]),                   # 右上のふくらみ（3 つ目の顔の土台）
              S.ellipsoid(hc + [0.0, 0.09, -0.04], [0.08, 0.06, 0.08]), k=0.05)
    rng = np.random.default_rng(23)
    for _ in range(9):                                                                     # 頭のこぶ
        d = rng.normal(0, 1, 3); d[2] = -abs(d[2]) * 0.6 + 0.2; d /= np.linalg.norm(d)
        skull = U(skull, S.sphere(hc + [0, 0.03, -0.01] + d * np.array([0.095, 0.11, 0.1]), rng.uniform(0.02, 0.035)), k=0.03)
    faces = [
        # 中央の大きな顔（少し右へ傾く・長い鼻・半分閉じた目）
        dict(c=hc + [-0.008, 0.035, 0.098], M=frame([0.05, -0.05, 1], [0, 1, 0], tilt=0.18), s=0.165, eyes=2, eye_open=0.5),
        # 左下（キャラクターの左＝+X）の顔：斜め下を向く
        dict(c=hc + [0.06, -0.068, 0.084], M=frame([0.42, -0.22, 0.88], [0.3, 1, 0], tilt=-0.4), s=0.135, eyes=2, eye_open=0.55, nose_len=1.0),
        # 右上（キャラクターの右）の欠けた顔：目と鼻すじだけ
        dict(c=hc + [-0.062, 0.095, 0.07], M=frame([-0.55, 0.2, 0.82], [0, 1, 0], tilt=0.3), s=0.12, eyes=1, eye_open=0.25, mouth=False, nose_len=0.7),
    ]
    adds, subs, EYES, LIPS, PRE, EYEADD = [], [], [], [], [], []
    for f in faces:
        a, b, e, l, pr, ea = face_parts(f['c'], f['M'], f['s'], eyes=f.get('eyes', 2), mouth=f.get('mouth', True), eye_open=f.get('eye_open', 0.35), nose_len=f.get('nose_len', 1.0))
        adds += a; subs += b; EYES += e; LIPS += l; PRE += pr; EYEADD += ea
    skull_c = S.sub(skull, U(*PRE), k=0.01)                                                # 目のくぼみを先に引き、そこへ目玉とまぶたを足す
    head = U(skull_c, *adds, k=0.01)
    head = U(head, *EYEADD, k=0.0015)                                                       # 目玉とまぶたは丸めを小さく（すき間を埋めない）
    head = S.sub(head, U(*subs), k=0.006)
    # 顔のあいだから首へ流れ落ちる肉のひだ
    folds = []
    for (a, b_, r) in (([0.02, -0.06, 0.085], [0.025, -0.16, 0.04], 0.009), ([-0.05, -0.04, 0.075], [-0.035, -0.16, 0.03], 0.009),
                       ([0.085, -0.06, 0.02], [0.055, -0.18, -0.01], 0.01), ([-0.08, 0.0, 0.04], [-0.06, -0.15, -0.02], 0.009),
                       ([0.0, -0.13, 0.06], [0.0, -0.2, 0.03], 0.01), ([0.05, 0.08, 0.075], [0.08, -0.02, 0.05], 0.007)):
        b2 = np.array([a[0] * 0.5, -0.165, a[2] * 0.4 + 0.01])                                # 先は首の表面へ（垂れ下がらない）
        folds.append(S.round_cone(hc + a, hc + b2, r, r * 0.9))                                # 頭から首へ流れるひだ
    head = U(head, *folds, k=0.02)

    def creases(Q):                                                                        # 溶けて縦に流れるしわ（溝）
        g = np.sin(Q[:, 0] * 95 + 3.0 * hash3(Q * 5, 41) + 0.6 * np.sin(Q[:, 1] * 30))
        return 0.0028 * np.maximum(0, g) ** 4 * S.smoothstep(hc[1] + 0.12, hc[1] - 0.02, Q[:, 1])
    head = lambda Q, f0=head: f0(Q) + creases(Q)

    def head_col(V, N):
        c = tile(SKIN, V) * (0.93 + 0.07 * hash3(V * 11, 3))[:, None]
        c *= (1 - 0.12 * np.clip(hash3(V * 4, 5), 0, 1))[:, None]                           # まだら
        g = np.sin(V[:, 0] * 95 + 3.0 * hash3(V * 5, 41) + 0.6 * np.sin(V[:, 1] * 30))
        c *= (1 - 0.18 * np.maximum(0, g) ** 6 * S.smoothstep(hc[1] + 0.12, hc[1] - 0.02, V[:, 1]))[:, None]   # しわの溝の影
        for (e, r, iris, ir) in EYES:
            m = np.linalg.norm(V - e, axis=1) < r
            c[m] = lin(0x8c8282)                                                               # 白目（濁った肌に近い色）
            c[np.linalg.norm(V - iris, axis=1) < ir] = lin(0x2a2224)                           # 黒目（下へ寄る＝半分閉じた目）
        for (l, r) in LIPS:
            dl = np.linalg.norm(V - l, axis=1)
            c[dl < r * 0.9] = c[dl < r * 0.9] * 0.6 + lin(LIP)[None] * 0.4
            c[dl < r * 0.35] *= 0.55                                                           # 口の割れ目の暗さ
        return c
    P.append(Part('head', head, hc - 0.2, hc + 0.2, 0.0024, 'skin', head_col, ('rigid', 'head'), oth=1.0, faces=3900, sym=False))
    # 目玉は別の部品（細かい網で黒目をはっきり。頭の網では目が小さすぎて色が乗らなかった）
    eyeballs = U(*[S.sphere(e, r * 0.96) for (e, r, iris, ir) in EYES])

    def eye_col(V, N):
        c = tile(0x9a8e8c, V) * (0.95 + 0.05 * hash3(V * 40, 13))[:, None]                     # 濁った白目
        for (e, r, iris, ir) in EYES:
            d = np.linalg.norm(V - iris, axis=1)
            c[d < ir * 1.15] = lin(0x3a2e2e)                                                   # 黒目のふち
            c[d < ir * 0.8] = lin(0x1c1416)                                                    # 黒目
        return c
    P.append(Part('eyes', eyeballs, hc - 0.2, hc + 0.2, 0.0012, 'skin', eye_col, ('rigid', 'head'), oth=0.0, faces=700, sym=False, ao=False))

    # ── 髪：細く乱れた髪（頭のてっぺんと後ろから、横へ垂れる細い房）
    locks = []
    for i in range(50):
        th = rng.uniform(-math.pi, math.pi)
        ph = rng.uniform(0.05, 1.0)
        if math.cos(th) > 0.3 and ph > 0.45:
            continue
        d = np.array([math.sin(th) * math.sin(ph), math.cos(ph), math.cos(th) * math.sin(ph)])
        base = hc + [0, 0.03, -0.01] + d * np.array([0.1, 0.12, 0.105])
        down = np.array([0, -1.0, -0.3])
        tang = down - d * (down @ d); tang /= max(np.linalg.norm(tang), 1e-6)                # 頭に沿って下へ垂れる
        out = tang * 0.92 + d * 0.08 + rng.normal(0, 0.12, 3)
        out /= np.linalg.norm(out)
        L = rng.uniform(0.06, 0.12)
        mid = base + out * L * 0.5
        out2 = tang + d * 0.05 + rng.normal(0, 0.15, 3); out2 /= np.linalg.norm(out2)            # 先も頭に沿って垂れる（少しだけ乱れる）
        tip = mid + out2 * L * 0.5
        locks += [S.round_cone(base, mid, 0.0036, 0.0028), S.round_cone(mid, tip, 0.0028, 0.0013)]
    hair = U(*locks, k=0.003)
    P.append(Part('hair', hair, hc - 0.25, hc + 0.22, 0.0022, 'hair', lambda V, N: tile(HAIR, V) * (0.85 + 0.2 * hash3(V * 30, 7))[:, None],
                  ('rigid', 'head'), oth=0.3, faces=1100, sym=False))

    # ── 首：太く筋ばって、頭のひだとつながる
    neck = U(S.round_cone(nk + [0, -0.08, -0.01], hc + [0, -0.09, 0.0], 0.058, 0.075), k=0.01)   # 太い首（頭と溶け合う）
    for (x, z) in ((0.03, 0.035), (-0.03, 0.035), (0.045, -0.01), (-0.045, -0.005), (0.0, 0.045)):
        neck = U(neck, S.capsule(nk + [x * 0.8, -0.06, z * 0.8], hc + [x, -0.13, z], 0.011), k=0.012)
    P.append(Part('neck', neck, nk - 0.15, hc + np.array([0.15, 0.0, 0.15]), 0.003, 'skin', lambda V, N: tile(SKIN, V) * (0.92 + 0.08 * hash3(V * 10, 9))[:, None],
                  'body', ['neck', 'head', 'chest'], faces=1000))

    # ── 体と服（個体ごと）
    sh_l, sh_r = B(rig, 'leftUpperArm'), B(rig, 'rightUpperArm')
    stout = var == 'stout'
    if stout:
        body = U(S.ellipsoid(ch + [0, 0.04, 0.0], [0.165, 0.18, 0.115]), S.ellipsoid(sp + [0, -0.04, 0.03], [0.17, 0.15, 0.14]),
                 S.capsule(sh_l + [-0.03, -0.03, -0.008], sh_r + [0.03, -0.03, -0.008], 0.056),
                 S.ellipsoid(hp + [0, 0.0, 0.01], [0.17, 0.11, 0.125]), S.ellipsoid(ch + [0, 0.1, -0.05], [0.13, 0.11, 0.08]), k=0.07)
    else:
        body = U(S.ellipsoid(ch + [0, 0.04, -0.008], [0.13, 0.17, 0.09]), S.ellipsoid(sp + [0, 0.02, 0.0], [0.12, 0.12, 0.085]),
                 S.capsule(sh_l + [-0.03, -0.03, -0.008], sh_r + [0.03, -0.03, -0.008], 0.044),
                 S.ellipsoid(hp + [0, -0.01, 0.0], [0.14 if var == 'skirt' else 0.13, 0.1, 0.1]), S.ellipsoid(ch + [0, 0.1, -0.05], [0.11, 0.1, 0.07]), k=0.06)
    HEM = 0.78 if var != 'skirt' else 0.86
    P.append(Part('shirt', S.inter(body, lambda Q: 0.8 - Q[:, 1]), [-0.32, 0.75, -0.25], [0.32, 1.5, 0.25], 0.0055, 'cloth',
                  lambda V, N: worn(tile(SHIRT if var != 'skirt' else 0x6e6a72, V), V, 61, amt=0.08), 'body',
                  ['hips', 'spine', 'chest', 'neck'], faces=1200))

    def vneck(Q):                                                                          # V えり（引く形：中が負）
        y = Q[:, 1]
        w = 0.012 + 0.055 * np.clip((y - 1.16) / 0.26, 0, 1)
        return np.where((Q[:, 2] > 0.02) & (y > 1.16), np.abs(Q[:, 0] - 0.01) - w, 1.0)
    card = S.inter(S.sub(S.offset(body, 0.019), S.offset(body, 0.003)), lambda Q: HEM - Q[:, 1])   # 厚めの殻（薄いと間引きが効かない）
    card = S.sub(card, vneck)
    card = lambda Q, f0=card: f0(Q) - 0.002 * (np.sin(Q[:, 0] * 240 + 0.4 * np.sin(Q[:, 1] * 50)) > 0) - 0.003 * hash3(Q * 7, 63)   # 毛糸のうね・たるみ

    def card_col(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        c = worn(tile(CARD, V), V, 65, amt=0.14)
        c *= (0.9 + 0.1 * (np.sin(x * 240 + 0.4 * np.sin(y * 50)) > 0))[:, None]
        front = z > 0.06
        c[front & (np.abs(x - 0.01) < 0.005) & (y < 1.12)] *= 0.7                             # 前の合わせ
        for yb in (1.08, 1.0, 0.92, 0.84):                                                     # ボタン（ひとつずれて掛かっている）
            c[front & (np.abs(x - 0.024) < 0.007) & (np.abs(y - yb - 0.02) < 0.007)] = lin(0x6a5a50)
        c[y < HEM + 0.03] *= 0.85                                                              # 裾のゴム編み
        return c
    P.append(Part('cardigan', card, [-0.34, HEM - 0.04, -0.26], [0.34, 1.55, 0.26], 0.0065, 'cloth', card_col, 'body',
                  ['hips', 'spine', 'chest', 'neck'], faces=2200))
    collar = U(*[S.box(nk + [sx * 0.045, -0.085, 0.06], [0.03, 0.03, 0.005], r=0.004, rot=rotz(sx * 0.6) @ rotx(-0.4)) for sx in (1, -1)])
    P.append(Part('shirt_collar', collar, nk + np.array([-0.15, -0.16, -0.05]), nk + np.array([0.15, 0.03, 0.2]), 0.003, 'cloth', 0x7c787c,
                  'body', ['neck', 'chest'], oth=0.6, faces=400))

    # ── 腕：袖はひじの下までまくる・長い前腕・骨ばった長い指（手は 8.5cm 下げる：帰路と同じ）
    for s in ('left', 'right'):
        ua, la, ha = B(rig, s + 'UpperArm'), B(rig, s + 'LowerArm'), B(rig, s + 'Hand')
        sr = (0.06, 0.056, 0.05) if stout else (0.05, 0.047, 0.042)
        sl = U(limb(ua + [0, -0.01, 0], la, sr[0], sr[1]), limb(la, la + (ha - la) * 0.35, sr[1], sr[2] + 0.004), k=0.03)
        sl = lambda Q, f0=sl: f0(Q) - 0.003 * (np.sin(Q[:, 1] * 140) > 0.2)                     # まくった袖のたるみ

        def scol(V, N, la=la, seed=(67 if s == 'left' else 71)):
            c = worn(tile(CARD, V), V, seed, amt=0.16)
            c[V[:, 1] < la[1] - 0.06] *= 0.8                                                    # まくった折り返し
            return c
        P.append(Part(s + '_sleeve', sl, ua - [0.13, 0.6, 0.13], ua + [0.13, 0.1, 0.13], 0.0045, 'cloth', scol, 'body',
                      [s + 'UpperArm', s + 'LowerArm', 'chest'], faces=900, sym=False))
        WL = 0.085
        sx_ = 1 if s == 'left' else -1
        fore = U(S.round_cone(la + (ha - la) * 0.25, ha + [0, -WL, 0.004], 0.026, 0.017),
                 S.ellipsoid(ha + [sx_ * 0.011, -0.01, -0.004], [0.008, 0.012, 0.008]),
                 S.capsule(la + (ha - la) * 0.3 + [sx_ * 0.01, 0, 0.01], ha + [sx_ * 0.008, 0.02, 0.008], 0.007), k=0.012)   # 長い前腕と筋
        P.append(Part(s + '_forearm', fore, ha - 0.18, la + 0.06, 0.003, 'skin', lambda V, N: tile(SKIN, V) * (0.92 + 0.08 * hash3(V * 12, 73))[:, None],
                      'body', [s + 'LowerArm', s + 'Hand'], faces=700, sym=False))
        rig_h = {'bones': [dict(b, pos=list(np.array(b['pos']) + [0, -WL, 0])) if b['name'] == s + 'Hand' else b for b in rig['bones']]}
        hp_ = claw_hand(B(rig_h, s + 'Hand'), s)
        hp_.color = lambda V, N: tile(SKIN, V) * (0.93 + 0.07 * hash3(V * 20, 75))[:, None]
        P.append(hp_)

    # ── 下：ズボン（正面・太った男）かスカート（女）・靴
    if var == 'skirt':
        y0, y1 = 0.3, 0.9

        def skirt_f(Q):
            o = S.round_cone(hp + [0, 0.0, -0.004], np.array([0, y0 - 0.05, -0.004]), 0.15, 0.2)(Q)
            d = np.maximum(o, np.maximum(y0 - Q[:, 1], Q[:, 1] - y1))
            ang = np.arctan2(Q[:, 0], Q[:, 2])
            return d - 0.005 * np.sin(ang * 14 + 2 * hash3(Q * 3, 77)) * S.smoothstep(0.8, 0.45, Q[:, 1])   # ゆるいひだ

        def skirt_col(V, N):
            c = worn(tile(0x4a4345, V), V, 79, amt=0.12)
            c[V[:, 1] < y0 + 0.02] *= 0.8
            return c
        P.append(Part('skirt', skirt_f, [-0.3, y0 - 0.05, -0.28], [0.3, y1 + 0.05, 0.28], 0.006, 'cloth', skirt_col, 'skirt', oth=0.9, faces=1400, sym=False))
    else:
        pel = S.inter(S.ellipsoid(hp + [0, -0.03, 0.0], [0.16 if stout else 0.14, 0.1, 0.11 if stout else 0.1]), lambda Q: Q[:, 1] - (HEM + 0.04))
        P.append(Part('pelvis', pel, hp - [0.22, 0.2, 0.2], hp + [0.22, 0.05, 0.2], 0.005, 'cloth', lambda V, N: tile(PANTS, V) * (0.93 + 0.07 * hash3(V * 7, 81))[:, None],
                      'body', ['hips', 'leftUpperLeg', 'rightUpperLeg'], faces=800))
    for s in ('left', 'right'):
        up, kn, ft = B(rig, s + 'UpperLeg'), B(rig, s + 'LowerLeg'), B(rig, s + 'Foot')
        if var == 'skirt':
            leg = U(limb(up, kn, 0.055, 0.042), limb(kn, ft + [0, 0.06, 0.005], 0.042, 0.03), k=0.02)
            sock = S.inter(S.offset(limb(kn, ft + [0, 0.06, 0.005], 0.046, 0.036), 0.0), lambda Q: Q[:, 1] - 0.2)
            sock = lambda Q, f0=sock: f0(Q) - 0.004 * np.sin(Q[:, 1] * 150) * S.smoothstep(0.2, 0.08, Q[:, 1])   # たるんだ靴下
            P.append(Part(s + '_leg', leg, [up[0] - 0.2, 0.0, -0.2], [up[0] + 0.2, up[1] + 0.1, 0.2], 0.004, 'skin',
                          lambda V, N: tile(SKIN, V), 'body', [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=450, sym=False))
            P.append(Part(s + '_sock', sock, [up[0] - 0.15, 0.0, -0.15], [up[0] + 0.15, 0.25, 0.15], 0.003, 'cloth',
                          lambda V, N: tile(0x7a7476, V) * (0.9 + 0.1 * hash3(V * 15, 83))[:, None], 'body', [s + 'LowerLeg', s + 'Foot'], faces=400, sym=False))
            shoe = U(S.box(ft + [0, 0.03, 0.05], [0.042, 0.03, 0.11], r=0.025), S.box(ft + [0, 0.009, 0.05], [0.045, 0.009, 0.113], r=0.006), k=0.004)
            P.append(Part(s + '_shoe', shoe, ft + [-0.1, -0.05, -0.1], ft + [0.1, 0.1, 0.22], 0.0035, 'acc',
                          lambda V, N: np.where((V[:, 1] < 0.018)[:, None], lin(SOLE)[None], lin(0x2c2624)[None] * (0.9 + 0.1 * hash3(V * 20, 85))[:, None]),
                          ('rigid', s + 'Foot'), oth=0.8, faces=600, sym=False))
            continue
        R0 = (0.1, 0.088, 0.086, 0.08) if stout else (0.09, 0.078, 0.076, 0.072)
        f0 = U(limb(up + [0, 0.03, 0], kn, R0[0], R0[1]), limb(kn, ft + [0, 0.1, 0.01], R0[2], R0[3]), k=0.035)

        def fl(Q, f0=f0, kn=kn):
            y = Q[:, 1]
            wr = 0.0075 * np.sin(y * 85 + Q[:, 0] * 25 + 1.5 * hash3(Q * 3, 87)) * (np.exp(-((y - kn[1]) * 10) ** 2) + S.smoothstep(0.32, 0.12, y) + 0.35)
            return f0(Q) - wr - 0.004 * hash3(Q * 6, 89)
        P.append(Part(s + '_leg', fl, [up[0] - 0.25, 0.04, -0.25], [up[0] + 0.25, up[1] + 0.12, 0.25], 0.0065, 'cloth',
                      lambda V, N, seed=(91 if s == 'left' else 93): worn(tile(PANTS, V), V, seed, amt=0.14), 'body',
                      [s + 'UpperLeg', s + 'LowerLeg', 'hips'], faces=1000, sym=False))
        boot = U(S.box(ft + [0, 0.05, 0.045], [0.05, 0.05, 0.125], r=0.04), S.ellipsoid(ft + [0, 0.05, 0.135], [0.05, 0.045, 0.062]),
                 S.round_cone(ft + [0, 0.05, 0.0], ft + [0, 0.13, -0.005], 0.055, 0.05), k=0.025)
        boot = U(boot, S.box(ft + [0, 0.014, 0.048], [0.057, 0.015, 0.138], r=0.012), k=0.004)

        def bcol(V, N, seed=(95 if s == 'left' else 97)):
            c = worn(tile(BOOT, V), V, seed, amt=0.25, scale=8)
            c[V[:, 1] < 0.03] = lin(SOLE)
            return c
        P.append(Part(s + '_shoe', boot, ft + [-0.12, -0.06, -0.12], ft + [0.12, 0.2, 0.26], 0.0045, 'acc', bcol, ('rigid', s + 'Foot'), oth=0.8, faces=800, sym=False))
    return P


omoomote.hide_face = True          # 顔は網に彫った（コードの予備の顔の絵は隠す）
DESIGNS = {'omoomote': omoomote}
for _v in ('skirt', 'stout'):
    def _mk(rig, _v=_v):
        return omoomote(rig, _v)
    _mk.hide_face, _mk.rig = True, 'omoomote'
    DESIGNS['omoomote_' + _v] = _mk
