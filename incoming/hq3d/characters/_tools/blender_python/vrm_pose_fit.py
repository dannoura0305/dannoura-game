# -*- coding: utf-8 -*-
"""原画の関節の位置へ、VRM の骨のポーズを合わせる（高精度 3D 制作 Phase 4・シルエット比較の下ごしらえ）

  blender -b -P vrm_pose_fit.py -- <モデル.vrm> <reference.json> <出力の pose.json>
  入力: reference.json の "silhouette"（keypoints＝OpenPose で測った原画の関節、extra_keypoints、depth_hints、keypoint_weights）
  出力: pose.json（骨ごとの回転・合わせた残りのずれ）。標準出力に 1 行 "WCMF_RESULT {json}"

  ・正面から平行に見た（正射影の）関節の位置が、原画の関節の位置に重なるよう、骨の回転を少しずつ動かして探す
    （大きさと位置は毎回いちばん合うものを計算で決める。回転はさせない）
  ・絵は平らなので、前後（奥行き）は分からない。depth_hints（「右手は肩より前」など、人が絵から読んだこと）で決める
  ・回しすぎないよう、休みの姿勢から離れるほど少しだけ損になるようにしてある
  ・骨の計算は Blender と同じ順番の掛け算を自前で行い（速い）、最後に Blender に付けて同じになるか確かめる
  ・できたポーズは推測（guess）。元の VRM は読むだけ。VRM アドオンが要るので --factory-startup は付けない
"""
import datetime
import json
import math
import os
import sys
import traceback

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hq3d_pose  # noqa: E402
import vrm_views  # noqa: E402

# (人型の骨, 軸 0=x 1=y 2=z, 下限, 上限, 始めの値[, 戻す強さ])  度。軸の向きは hq3d_pose.basis の説明のとおり
# 胴と頭は戻す強さを大きくする: 体の幅や首の長さの違い（＝比べたい形の差）を、ねじりや傾きで埋めてしまわないように
PARAMS = [
    # 胴のねじれ（z）は ±5 度まで: 原画の肩は首を中心に左右同じ幅で描かれていて、ねじれは見えない（2026-11-05 読み取り）。
    # 広げると、肩や腰の幅の違いをねじりで埋めてしまう（試したら上限の 15 度に張りついた）
    ('hips', 1, -15, 15, 0, 40), ('hips', 2, -5, 5, 0, 40),
    ('spine', 1, -15, 15, 0, 40), ('spine', 2, -5, 5, 0, 40),
    ('head', 1, -20, 20, 0, 20), ('head', 2, -20, 20, 0, 40),
    ('right_upper_arm', 0, -90, 90, 0), ('right_upper_arm', 1, -100, 40, -60), ('right_upper_arm', 2, -40, 120, 0),
    ('right_lower_arm', 1, -30, 30, 0), ('right_lower_arm', 2, 0, 150, 0),        # z＋＝ひじを前へ曲げる
    ('left_upper_arm', 0, -90, 90, 0), ('left_upper_arm', 1, -40, 100, 60), ('left_upper_arm', 2, -120, 40, 0),
    ('left_lower_arm', 1, -30, 30, 0), ('left_lower_arm', 2, -150, 0, 0),         # z－＝ひじを前へ曲げる
    ('right_upper_leg', 0, -70, 50, 0), ('right_upper_leg', 1, -30, 30, 0), ('right_upper_leg', 2, -40, 40, 0),
    ('right_lower_leg', 0, 0, 120, 0),                                              # x＋＝ひざを曲げる（すねが後ろへ）
    ('left_upper_leg', 0, -70, 50, 0), ('left_upper_leg', 1, -30, 30, 0), ('left_upper_leg', 2, -40, 40, 0),
    ('left_lower_leg', 0, 0, 120, 0),
]
STARTS = [  # 前に出した腕などは前後の取り違えで止まりやすいので、いくつかの始め方から探して一番よいものを取る
    {},
    {('right_upper_arm', 2): 70, ('right_upper_arm', 1): -30},
    {('left_upper_arm', 2): -70, ('left_upper_arm', 1): 30},
    {('right_upper_arm', 2): 70, ('right_upper_arm', 1): -30, ('left_upper_arm', 2): -40},
]
DEFAULT_WEIGHTS = {'R_hip': 0.5, 'L_hip': 0.5}
# 目は位置ではなく「両目を結ぶ線の傾き」だけを合わせる（目の高さは首の長さ・頭の大きさで決まり、ポーズでは直せない）
EYES = ('R_eye', 'L_eye')
EYE_PX_PER_UNIT = 60.0    # 両目の線の向き（長さ 1）の差 1 で 60 画素ぶんの損（約 1 画素／度）
REG_PX_PER_RAD = 6.0      # 休みの姿勢から 1 ラジアン（57 度）離れると 6 画素ぶんの損（PARAMS で骨ごとに変えられる）
HINT_PX_PER_M = 1.0       # depth_hints の破りは「何 m 足りないか × 縮尺（画素/m）」の損


class Kinematics:
    """必要な骨だけの順運動学（Blender の pose と同じ: 親の姿勢 @ 休みの相対 @ 骨の回転）"""

    def __init__(self, arm, hmap, wanted):
        self.arm, self.hmap = arm, hmap
        need = set()
        for k in wanted:
            b = arm.data.bones[hmap[k]]
            while b is not None:
                need.add(b.name)
                b = b.parent
        self.order = [b for b in arm.data.bones if b.name in need]  # data.bones は親が先に並ぶ
        self.order.sort(key=lambda b: len(b.parent_recursive))
        self.rel = {b.name: (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy() for b in self.order}
        self.mw = arm.matrix_world.copy()

    def heads(self, pose_deg):
        basis = {self.hmap[k]: hq3d_pose.basis(self.arm.data.bones[self.hmap[k]], v) for k, v in pose_deg.items() if k in self.hmap}
        posed = {}
        for b in self.order:
            m = self.rel[b.name] if b.parent is None else posed[b.parent.name] @ self.rel[b.name]
            if b.name in basis:
                m = m @ basis[b.name]
            posed[b.name] = m
        out = {j: self.mw @ posed[self.hmap[k]].translation for j, k in hq3d_pose.JOINTS.items() if k in self.hmap and self.hmap[k] in posed}
        if 'R_shoulder' in out and 'L_shoulder' in out:
            out['neck'] = (out['R_shoulder'] + out['L_shoulder']) / 2
        return out


def to_pose(theta):
    pose = {}
    for (k, ax, *_), v in zip(PARAMS, theta):
        pose.setdefault(k, [0.0, 0.0, 0.0])[ax] = float(v)
    return pose


def similarity(P, Q, w):
    """sP + t ≒ Q（回転なし）の最小二乗。P は (X, -Z) の m、Q は画素"""
    sw = w.sum()
    pm, qm = (P * w[:, None]).sum(0) / sw, (Q * w[:, None]).sum(0) / sw
    dp, dq = P - pm, Q - qm
    s = float((w[:, None] * dp * dq).sum() / max((w[:, None] * dp * dp).sum(), 1e-9))
    return s, qm - s * pm


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    model, ref_path, out = (os.path.abspath(x) for x in argv[:3])
    ref = json.load(open(ref_path, encoding='utf-8'))
    sil = ref['silhouette']
    char_dir = os.path.dirname(ref_path)
    kp = dict(json.load(open(os.path.join(char_dir, sil['keypoints']), encoding='utf-8'))['points'])
    for j, e in sil.get('extra_keypoints', {}).items():
        kp[j] = e['xy']
    weights = dict(DEFAULT_WEIGHTS, **sil.get('keypoint_weights', {}))
    hints = sil.get('depth_hints', [])

    if not hasattr(bpy.ops.import_scene, 'vrm'):
        raise RuntimeError('VRM アドオンが有効ではありません')
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.vrm(filepath=model)
    arm = hq3d_pose.armature(bpy.context.scene.objects)
    hmap = hq3d_pose.humanoid(arm)
    kin = Kinematics(arm, hmap, [k for k in set(hq3d_pose.JOINTS.values()) | {p[0] for p in PARAMS} if k in hmap])
    names = [j for j in kin.heads({}) if kp.get(j) and j not in EYES]
    eyes = all(kp.get(j) for j in EYES)
    if eyes:
        ev = np.array(kp['L_eye'], float) - np.array(kp['R_eye'], float)
        ev /= np.linalg.norm(ev)
    Q = np.array([kp[j] for j in names], float)
    W = np.array([weights.get(j, 1.0) for j in names], float)
    lo = np.array([p[2] for p in PARAMS], float)
    hi = np.array([p[3] for p in PARAMS], float)
    prior = np.array([p[4] for p in PARAMS], float)
    reg = np.array([p[5] if len(p) > 5 else REG_PX_PER_RAD for p in PARAMS], float)

    def evaluate(theta):
        H = kin.heads(to_pose(theta))
        P = np.array([[H[j].x, -H[j].z] for j in names])
        s, t = similarity(P, Q, W)
        r = [(np.sqrt(W)[:, None] * (s * P + t - Q)).ravel()]
        hr = []
        for h in hints:
            a, b = H.get(h['joint']), H.get(h['in_front_of'])
            if a is None or b is None:
                continue
            short = (a.y - (b.y - h['by_m']))  # 前＝-Y。正なら足りない
            hr.append(HINT_PX_PER_M * s * max(0.0, short))
        r.append(np.array(hr))
        if eyes:
            mv = np.array([H['L_eye'].x - H['R_eye'].x, H['R_eye'].z - H['L_eye'].z])
            r.append(EYE_PX_PER_UNIT * (mv / max(np.linalg.norm(mv), 1e-9) - ev))
        r.append(reg * np.radians(theta - prior))
        return np.concatenate(r), s, t, H, P

    def fit(theta):
        mu = 1e-2
        res = evaluate(theta)[0]
        cost = float(res @ res)
        for _ in range(120):
            J = np.empty((len(res), len(theta)))
            for i in range(len(theta)):
                d = np.zeros_like(theta)
                d[i] = 0.5
                J[:, i] = (evaluate(np.clip(theta + d, lo, hi))[0] - res) / 0.5
            g = J.T @ res
            A = J.T @ J
            while True:
                step = np.linalg.solve(A + mu * np.diag(np.diag(A) + 1e-6), -g)
                cand = np.clip(theta + step, lo, hi)
                r2 = evaluate(cand)[0]
                c2 = float(r2 @ r2)
                if c2 < cost:
                    theta, res, mu = cand, r2, max(mu / 3, 1e-6)
                    gain = cost - c2
                    cost = c2
                    break
                mu *= 4
                if mu > 1e6:
                    return theta, cost
            if gain < 1e-4 * cost:
                break
        return theta, cost

    tried = []
    for st in STARTS:
        th = prior.copy()
        for (k, ax), v in st.items():
            th[[i for i, p in enumerate(PARAMS) if p[0] == k and p[1] == ax][0]] = v
        tried.append(fit(np.clip(th, lo, hi)))
    theta, cost = min(tried, key=lambda x: x[1])
    _, s, t, H, P = evaluate(theta)
    err = {j: round(float(np.hypot(*(s * P[i] + t - Q[i]))), 1) for i, j in enumerate(names)}
    rms = math.sqrt(sum(e * e for e in err.values()) / len(err))
    def span(a, b, pts, scale=1.0):
        return round(abs(pts[a][0] - pts[b][0]) * scale, 1) if a in pts and b in pts else None
    mpx = {j: s * P[i] + t for i, j in enumerate(names)}
    widths = {k: {'sheet_px': span(a, b, kp), 'model_px': span(a, b, mpx)} for k, (a, b) in
              {'shoulders': ('R_shoulder', 'L_shoulder'), 'hips': ('R_hip', 'L_hip')}.items()}
    eye_deg = None
    if eyes:
        mv = np.array([H['L_eye'].x - H['R_eye'].x, H['R_eye'].z - H['L_eye'].z])
        eye_deg = round(math.degrees(math.atan2(mv[1], mv[0]) - math.atan2(ev[1], ev[0])), 1)
    hint_out = []
    for h in hints:
        a, b = H.get(h['joint']), H.get(h['in_front_of'])
        if a is not None and b is not None:
            ahead = b.y - a.y
            hint_out.append({'joint': h['joint'], 'in_front_of': h['in_front_of'], 'want_m': h['by_m'], 'got_m': round(ahead, 3), 'ok': ahead >= h['by_m'] - 0.01})

    # Blender に付けて、自前の計算と同じになるか確かめる
    pose = {k: [round(v, 1) for v in vals] for k, vals in to_pose(theta).items()}
    hq3d_pose.apply_pose(arm, pose, hmap)
    real = hq3d_pose.joints_world(arm, hmap)
    mine = kin.heads(pose)
    fk_mm = max((real[j] - mine[j]).length for j in mine) * 1000

    doc = {
        '_note': '原画の関節（OpenPose）へ骨を合わせたポーズ。推測（guess）: 絵は平らで奥行きが分からないので、前後は depth_hints で決めた。'
                 '骨の回転はモデル全体の軸（X＝モデルの左・Y＝後ろ・Z＝上）で、度。hq3d_pose.py で付ける',
        'certainty': 'guess', 'made_by': 'vrm_pose_fit.py', 'time': datetime.datetime.now().isoformat(timespec='seconds'),
        'model': model, 'keypoints': os.path.join(char_dir, sil['keypoints']),
        'bones': pose,
        'fit': {'rms_px': round(rms, 1), 'per_joint_px': err, 'eye_line_deg_off': eye_deg, 'widths': widths, 'scale_px_per_m': round(s, 2), 'offset_px': [round(float(v), 1) for v in t],
                'depth_hints': hint_out, 'starts_cost': [round(c, 1) for _, c in tried], 'fk_check_mm': round(fk_mm, 3)},
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    vrm_views.emit({'ok': True, 'out': out, 'rms_px': doc['fit']['rms_px'], 'fk_check_mm': doc['fit']['fk_check_mm'], 'depth_hints': hint_out})


try:
    main()
except BaseException as e:  # noqa: BLE001
    vrm_views.emit({'ok': False, 'error': str(e), 'trace': traceback.format_exc()[-1500:]})
