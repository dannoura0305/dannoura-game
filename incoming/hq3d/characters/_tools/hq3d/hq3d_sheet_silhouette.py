# -*- coding: utf-8 -*-
"""設定画の全身の絵から、人物の輪郭（シルエット）と関節の位置を取り出す（高精度 3D 制作 Phase 4・シルエット比較の下ごしらえ）

  python hq3d_sheet_silhouette.py --reference <reference.json> [--detect-pose]

  入力: reference.json の "silhouette"
        box … 設定画の全身の範囲 [左, 上, 右, 下]（以下の座標はすべてこの箱の左上からの画素）
        seeds.fg / seeds.bg … 「ここは人物」「ここは背景」の目印の線（[[x, y], …] と太さ）。GrabCut の手がかり
        seeds.bg_rects … 背景と分かっている四角（文字など）
  出力: キャラのフォルダの sheet/ に
        front_silhouette.png … 人物＝白・背景＝黒（箱の大きさ）
        front_silhouette_check.png … 設定画に輪郭（赤）と目印（緑＝人物・青＝背景）と関節を描いたもの（人が確かめる用）
        front_keypoints.json … --detect-pose のとき。OpenPose（lllyasviel/Annotators の body_pose_model・手元のキャッシュ）で測った関節の位置
  ・輪郭は GrabCut（OpenCV）で切り出し、いちばん大きい塊だけを残す。目印は人が絵を見て置いたもの（reference.json に残る）
  ・OpenPose は写真で学んだ検出器なので、絵では関節がずれることがある。見えない関節は書かない（null）
  ・設定画は読むだけ。標準出力に 1 行 "HQ3D_SILHOUETTE {json}"
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

WAKABA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))  # C:\wakaba
COCO18 = ['nose', 'neck', 'R_shoulder', 'R_elbow', 'R_wrist', 'L_shoulder', 'L_elbow', 'L_wrist', 'R_hip', 'R_knee', 'R_ankle',
          'L_hip', 'L_knee', 'L_ankle', 'R_eye', 'L_eye', 'R_ear', 'L_ear']
BONES = [('neck', 'R_shoulder'), ('R_shoulder', 'R_elbow'), ('R_elbow', 'R_wrist'), ('neck', 'L_shoulder'), ('L_shoulder', 'L_elbow'),
         ('L_elbow', 'L_wrist'), ('neck', 'R_hip'), ('R_hip', 'R_knee'), ('R_knee', 'R_ankle'), ('neck', 'L_hip'), ('L_hip', 'L_knee'),
         ('L_knee', 'L_ankle'), ('R_hip', 'L_hip'), ('neck', 'nose')]


def detect_pose(crop):
    """OpenPose で体の 18 点を測る（ネットにはつながない。手元のキャッシュに無ければ止まる）"""
    os.environ.setdefault('HF_HOME', r'C:\Users\user\wakaba-venvs\hf-cache')
    os.environ['HF_HUB_OFFLINE'] = '1'
    import warnings
    warnings.filterwarnings('ignore')
    from controlnet_aux import OpenposeDetector
    det = OpenposeDetector.from_pretrained('lllyasviel/Annotators')
    poses = det.detect_poses(crop)
    if not poses:
        raise RuntimeError('OpenPose で人物が見つからない')
    h, w = crop.shape[:2]
    best = max(poses, key=lambda p: sum(1 for k in p.body.keypoints if k is not None))
    return {n: ([round(k.x * w, 1), round(k.y * h, 1)] if k is not None else None) for n, k in zip(COCO18, best.body.keypoints)}


def stroke(mask, pts, width, value):
    cv2.polylines(mask, [np.array(pts, np.int32)], False, int(value), int(width))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--reference', required=True)
    ap.add_argument('--detect-pose', action='store_true')
    a = ap.parse_args()
    ref = json.load(open(a.reference, encoding='utf-8'))
    s = ref['silhouette']
    char_dir = os.path.dirname(os.path.abspath(a.reference))
    out_dir = os.path.join(char_dir, 'sheet')
    os.makedirs(out_dir, exist_ok=True)
    x0, y0, x1, y1 = s['box']
    crop = np.asarray(Image.open(os.path.join(WAKABA_ROOT, ref['sheet'])).convert('RGB'))[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]

    kp_file = os.path.join(char_dir, s['keypoints'])
    if a.detect_pose:
        kp = detect_pose(crop)
        with open(kp_file, 'w', encoding='utf-8') as f:
            json.dump({'box': s['box'], 'detector': 'OpenPose body (controlnet_aux 0.0.10, lllyasviel/Annotators body_pose_model.pth)',
                       'certainty': 'measured（検出器の値。絵ではずれることがある）', 'points': kp}, f, ensure_ascii=False, indent=1)
    kp = json.load(open(kp_file, encoding='utf-8'))['points'] if os.path.exists(kp_file) else {}

    # GrabCut: 箱の外周寄り＝たぶん背景、内側＝たぶん人物。目印の線は「確か」として与える
    m = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    ix0, iy0, ix1, iy1 = s.get('inner', [0, 0, w, h])
    cv2.rectangle(m, (ix0, iy0), (ix1, iy1), cv2.GC_PR_FGD, -1)
    if s['seeds'].get('fg_from_keypoints', True):  # 関節を結んだ線は人物の上にある
        for p, q in BONES:
            if kp.get(p) and kp.get(q):
                stroke(m, [kp[p], kp[q]], 8, cv2.GC_FGD)
    for st in s['seeds'].get('fg', []):
        stroke(m, st['pts'], st.get('width', 6), cv2.GC_FGD)
    for st in s['seeds'].get('bg', []):
        stroke(m, st['pts'], st.get('width', 6), cv2.GC_BGD)
    for r in s['seeds'].get('bg_rects', []):
        cv2.rectangle(m, (r[0], r[1]), (r[2], r[3]), cv2.GC_BGD, -1)
    seeds = m.copy()
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(crop, cv2.COLOR_RGB2BGR), m, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
    fg = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    fg = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8) * 255 if n > 1 else fg * 255
    Image.fromarray(fg).save(os.path.join(out_dir, 'front_silhouette.png'))

    chk = (crop * np.where(fg[..., None] > 0, 1.0, 0.35)).astype(np.uint8)
    chk[seeds == cv2.GC_FGD] = (60, 200, 60)
    chk[seeds == cv2.GC_BGD] = (60, 90, 230)
    cnt, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(chk, cnt, -1, (255, 0, 0), 2)
    if s.get('tail_exclude'):
        cv2.polylines(chk, [np.array(s['tail_exclude'], np.int32)], True, (255, 160, 0), 2)
    for name, p in kp.items():
        if p:
            cv2.circle(chk, (int(p[0]), int(p[1])), 4, (255, 255, 0), -1)
    for name, e in s.get('extra_keypoints', {}).items():
        cv2.circle(chk, (int(e['xy'][0]), int(e['xy'][1])), 5, (255, 0, 255), 2)
    Image.fromarray(chk).save(os.path.join(out_dir, 'front_silhouette_check.png'))
    print('HQ3D_SILHOUETTE ' + json.dumps({'ok': True, 'area_px': int((fg > 0).sum()), 'size': [w, h],
                                            'keypoints': sum(1 for v in kp.values() if v), 'out': out_dir}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as ex:  # noqa: BLE001
        print('HQ3D_SILHOUETTE ' + json.dumps({'ok': False, 'error': str(ex)}, ensure_ascii=False))
        sys.exit(1)
