# -*- coding: utf-8 -*-
"""原画（設定画）と 3D の描画を比べ、項目別の点数・差分・直す点の一覧を出す（高精度 3D 制作 Phase 4）

  python hq3d_compare.py --reference <reference.json> --render <vrm_compare_render.py の出力先>
                         --out <レポートの出力先> [--adjust <adjust.json>] [--history <history.jsonl>]

  比べるもの（v0）:
    色彩     … 部位ごとに、設定画の箱の中央値の色と、描画のその部位（マスク）の中央値の色の差（CIEDE2000）
    体型     … 頭身（設定画は reference.json の値、モデルは正面のマスクから測る）。
               ポーズを付けて撮っていれば（posed）、肩幅・腰幅（関節の間）も
    シルエット … 原画のポーズ（vrm_pose_fit.py）で撮った正面の輪郭と、原画の輪郭（hq3d_sheet_silhouette.py）を、
               関節で重ねた重なり（IoU）。全身と、頭・上半身・太もも・すね・足の帯ごと。尻尾は揺れものなので除く
    装飾品   … reference.json の parts が、モデルにあるか（材質で検出／目視の記録）
  まだ比べないもの（reference.json の not_compared_yet）は「未計測」と書く。

  点数は見た目の近さの目安（代理指標）で、原画と同じだという保証ではない。最後は人の目で決める。
  Pillow と numpy だけを使う（C:\\Users\\user\\wakaba-venvs\\local-image の Python で動く）。
"""
import argparse
import datetime
import hashlib
import html
import json
import math
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw

WAKABA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))  # C:\wakaba
TOL = 2  # マスクの色の許し幅（8bit）


# ── 色 ──────────────────────────────────────────────

def srgb_to_lab(rgb):
    c = np.asarray(rgb, dtype=float) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def ciede2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if C1p else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if C2p else 0.0
    dLp, dCp = L2 - L1, C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    else:
        dhp = h2p - h1p - 360 if h2p > h1p else h2p - h1p + 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    else:
        hbp = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dth = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def _selftest():
    # Sharma ほか（2005）の検算表の 1 行目: ΔE00 = 2.0425
    d = ciede2000((50.0, 2.6772, -79.7751), (50.0, 0.0, -82.7485))
    assert abs(d - 2.0425) < 1e-3, d


def hexcol(rgb):
    return '#%02X%02X%02X' % tuple(int(round(v)) for v in rgb)


def palette_items(ref):
    """reference.json の palette から部位だけを取る（_note など _ で始まる欄は説明なので飛ばす）"""
    return [(k, v) for k, v in ref['palette'].items() if not k.startswith('_')]


def sample_boxes(p):
    return p['boxes'] if 'boxes' in p else [p['box']]


# ── マスク ───────────────────────────────────────────

def part_mask(mask_img, parts, patterns):
    m = np.zeros(mask_img.shape[:2], bool)
    names = []
    for name, col in parts['materials'].items():
        if any(p in name for p in patterns):
            m |= np.abs(mask_img - np.array(col)).max(axis=2) <= TOL
            names.append(name)
    return m, names


def heads_tall(mask_img, parts, ref):
    hair, _ = part_mask(mask_img, parts, ref['palette']['hair']['model_materials'])
    face, _ = part_mask(mask_img, parts, ref['palette']['skin']['model_materials'])
    figure = mask_img.min(axis=2) < 250
    if not hair.any() or not face.any():
        return None, {}
    widths = hair.sum(axis=1)
    top = int(np.argmax(widths >= widths.max() * 0.4))
    chin = int(np.where(face.any(axis=1))[0].max())
    foot = int(np.where(figure.any(axis=1))[0].max())
    return (foot - top) / max(chin - top, 1), {'hair_top': top, 'chin': chin, 'foot': foot}


# ── 本体 ────────────────────────────────────────────

# ── シルエット（原画のポーズ） ───────────────────────────

SIL_WEIGHTS = {'R_hip': 0.5, 'L_hip': 0.5}  # vrm_pose_fit.py と同じ（目は位置を合わせないので使わない）
SIL_BAND_TOL = 0.15  # 帯の面積がこれ以上ちがえば「細い／太い」として直す点に出す
SIL_PAD = 80  # 原画の箱のまわりに足す余白（画素）


def silhouette(ref, ref_path, parts, render_dir, out_dir):
    """原画の全身の輪郭と、同じポーズのモデルの輪郭を、関節で重ねて比べる。
    返り値: (項目のリスト, 直す点のリスト, 全身の点 or None)。必要なものが揃っていなければ (「未計測」の項目, [], None)"""
    s = ref.get('silhouette')
    char_dir = os.path.dirname(os.path.abspath(ref_path))
    if not s or 'posed' not in parts.get('views', []):
        return [{'category': 'シルエット', 'item': '全身', 'status': '未計測', 'score': None,
                 'detail': 'pose.json が無い（vrm_pose_fit.py で原画の関節へ合わせたポーズを作ると測れる）'}], [], None
    sheet_sil = np.asarray(Image.open(os.path.join(char_dir, s['silhouette'])).convert('L')) > 127
    # 原画の箱のまわりに余白を足して比べる（モデルの方が大きい所が箱の外へ出ても数えるため）。以下の座標は余白込み
    pad = SIL_PAD
    sheet_sil = np.pad(sheet_sil, pad)
    h, w = sheet_sil.shape
    kp = json.load(open(os.path.join(char_dir, s['keypoints']), encoding='utf-8'))['points']
    for j, e in s.get('extra_keypoints', {}).items():
        kp[j] = e['xy']
    kp = {j: ([v[0] + pad, v[1] + pad] if v else None) for j, v in kp.items()}
    jp = parts['posed_joints_px']
    names = [j for j in jp if kp.get(j) and not j.endswith('_eye')]
    P, Q = np.array([jp[j] for j in names], float), np.array([kp[j] for j in names], float)
    wt = np.array([SIL_WEIGHTS.get(j, 1.0) for j in names])
    pm, qm = (P * wt[:, None]).sum(0) / wt.sum(), (Q * wt[:, None]).sum(0) / wt.sum()
    sc = float((wt[:, None] * (P - pm) * (Q - qm)).sum() / (wt[:, None] * (P - pm) ** 2).sum())
    t = qm - sc * pm
    inv = (1 / sc, 0, -t[0] / sc, 0, 1 / sc, -t[1] / sc)  # 原画の画素 → 描画の画素

    mask = np.asarray(Image.open(os.path.join(render_dir, 'mask_posed.png')).convert('RGB')).astype(int)
    model = (mask < 250).any(axis=2)
    tail, _ = part_mask(mask, parts, ref['palette']['tail']['model_materials']) if 'tail' in ref['palette'] else (np.zeros_like(model), [])
    model &= ~tail
    model = np.asarray(Image.fromarray(model.astype(np.uint8) * 255).transform((w, h), Image.AFFINE, inv, resample=Image.NEAREST)) > 127
    skip = np.zeros((h, w), bool)
    if s.get('tail_exclude'):
        im = Image.new('L', (w, h), 0)
        ImageDraw.Draw(im).polygon([(p[0] + pad, p[1] + pad) for p in s['tail_exclude']], fill=255)
        skip = np.asarray(im) > 0
    sheet_b, model_b = sheet_sil & ~skip, model & ~skip

    def ys(*js):
        v = [kp[j][1] for j in js if kp.get(j)]
        return int(round(sum(v) / len(v))) if v else None
    # 一番上と一番下の帯は余白の端まで（モデルの耳や靴が原画より外へ出た分も数える）
    cuts = [0, ys('neck'), ys('R_hip', 'L_hip'), ys('R_knee', 'L_knee'), ys('R_ankle', 'L_ankle'), h]
    bands = [('頭', '頭と髪（首より上）'), ('上半身', '上着・腕（首〜腰）'), ('太もも', 'ズボンの上（腰〜ひざ）'), ('すね', 'ズボンの下（ひざ〜足首）'), ('足', '靴（足首より下）')]
    items, fixes = [], []

    def iou(a, b):
        u = (a | b).sum()
        return float((a & b).sum() / u) if u else 0.0
    whole = iou(sheet_b, model_b)
    items.append({'category': 'シルエット', 'item': '全身（尻尾を除く）', 'score': round(100 * whole, 1), 'iou': round(whole, 3),
                  'sheet_px': int(sheet_b.sum()), 'model_px': int(model_b.sum()), 'certainty': 'guess',
                  'detail': 'ポーズは原画の関節（OpenPose）へ合わせた推測。重なり（IoU）×100。原画は遠近のある絵、モデルは正射影なので 100 にはならない（手前の手や足は原画で大きく描かれる）'})
    for (name, what), y0, y1 in zip(bands, cuts[:-1], cuts[1:]):
        if y0 is None or y1 is None or y1 <= y0:
            continue
        a, b = sheet_b[y0:y1], model_b[y0:y1]
        ratio = b.sum() / max(a.sum(), 1)
        v = iou(a, b)
        items.append({'category': 'シルエット', 'item': name, 'score': round(100 * v, 1), 'iou': round(v, 3), 'area_ratio': round(float(ratio), 2),
                      'rows': [y0, y1], 'certainty': 'guess',
                      'detail': '%s。モデルの面積は原画の %d%%（原画だけ %d 画素・モデルだけ %d 画素）' % (what, round(100 * ratio), int((a & ~b).sum()), int((b & ~a).sum()))})
        if abs(ratio - 1) > SIL_BAND_TOL:
            fixes.append({'item': 'シルエット/' + name, 'kind': '形',
                          'text': '%s: モデルが原画より%s（面積 %d%%）。%s' % (what, '細い・小さい' if ratio < 1 else '太い・大きい', round(100 * ratio),
                                                                    'ポーズの推測のずれでも変わるので、重ねた絵で場所を確かめてから直す')})

    # 絵: 両方＝灰、原画だけ＝橙（モデルに足りない）、モデルだけ＝青（モデルが出すぎ）。除いた所は薄く
    ov = np.full((h, w, 3), 255, np.uint8)
    ov[sheet_b & model_b] = (190, 190, 190)
    ov[sheet_b & ~model_b] = (235, 140, 30)
    ov[model_b & ~sheet_b] = (40, 110, 220)
    ov[skip & (sheet_sil | model)] = (235, 225, 200)
    ovi = Image.fromarray(ov)
    d = ImageDraw.Draw(ovi)
    for y in cuts[1:-1]:
        if y is not None:
            d.line([(0, y), (w, y)], fill=(120, 120, 120), width=1)
    for j in names:
        qx, qy = kp[j]
        mx, my = sc * np.array(jp[j]) + t
        d.line([(qx, qy), (mx, my)], fill=(200, 0, 0), width=2)
        d.ellipse([qx - 3, qy - 3, qx + 3, qy + 3], fill=(200, 0, 0))
    beauty = Image.open(os.path.join(render_dir, 'beauty_posed.png')).convert('RGB').transform((w, h), Image.AFFINE, inv, resample=Image.BILINEAR, fillcolor=(255, 255, 255))
    x0, y0, x1, y1 = s['box']
    crop = Image.new('RGB', (w, h), 'white')
    crop.paste(Image.open(os.path.join(WAKABA_ROOT, ref['sheet'])).convert('RGB').crop((x0, y0, x1, y1)), (pad, pad))
    side = Image.new('RGB', (w * 3 + 16, h), 'white')
    for i, im in enumerate((crop, beauty, ovi)):
        side.paste(im, (i * (w + 8), 0))
    side.save(os.path.join(out_dir, 'silhouette.png'))

    # 目の高さ（肩の線＝首から上へ何画素）: モデルの頭の位置が高い／低い。参考の値（点にしない）
    if all(kp.get(j) for j in ('neck', 'R_eye', 'L_eye')) and all(j in jp for j in ('neck', 'R_eye', 'L_eye')):
        mp = {j: sc * np.array(jp[j]) + t for j in ('neck', 'R_eye', 'L_eye')}
        se = kp['neck'][1] - (kp['R_eye'][1] + kp['L_eye'][1]) / 2
        me = mp['neck'][1] - (mp['R_eye'][1] + mp['L_eye'][1]) / 2
        rel = (me - se) / se
        items.append({'category': '体型', 'item': '目の高さ（肩の線から・参考）', 'score': None, 'sheet': round(float(se), 1), 'model': round(float(me), 1),
                      'rel': round(float(rel), 3), 'status': '原画 %.0f／モデル %.0f 画素（%+d%%）' % (se, me, round(100 * rel)), 'certainty': 'measured（OpenPose）',
                      'detail': '首（両肩の真ん中）から両目までの高さ。大きいほど首が長い・頭が高い。点には数えない'})
        if abs(rel) > 0.1:
            fixes.append({'item': '目の高さ', 'kind': '確認', 'text': '目の高さ（肩の線から）: 原画 %.0f／モデル %.0f 画素。モデルの頭が%s。VRoid の 体型 →「首の長さ」で直せるか、重ねた絵の頭の帯で確かめる' % (
                se, me, '高い（首が長い）' if rel > 0 else '低い（首が短い）')})
    return items, fixes, round(100 * whole, 1)


def pose_widths(parts):
    """vrm_pose_fit.py が測った関節の間の幅（肩・腰）。点にはしない参考の値
    （原画の関節は大きな上着の上から OpenPose が推した所で、隠れた骨の位置とは限らない。形そのものはシルエットの帯で比べる）"""
    items = []
    fit = (parts.get('pose') or {}).get('fit') or {}
    for key, name in (('shoulders', '肩幅（関節の間・参考）'), ('hips', '腰幅（関節の間・参考）')):
        v = (fit.get('widths') or {}).get(key) or {}
        if v.get('sheet_px') and v.get('model_px'):
            rel = (v['model_px'] - v['sheet_px']) / v['sheet_px']
            items.append({'category': '体型', 'item': name, 'score': None, 'sheet': v['sheet_px'], 'model': v['model_px'], 'rel': round(rel, 3),
                          'status': '原画 %.0f／モデル %.0f 画素（%+d%%）' % (v['sheet_px'], v['model_px'], round(100 * rel)),
                          'certainty': 'measured（OpenPose）',
                          'detail': '原画のポーズに合わせたあと、同じ縮尺での左右の関節の間。点には数えない（関節は上着の上から推した所）'})
    return items


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    _selftest()
    sys.stdout.reconfigure(encoding='utf-8')  # Windows の既定（cp932）だと結果の行が文字化けする
    ap = argparse.ArgumentParser()
    ap.add_argument('--reference', required=True)
    ap.add_argument('--render', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--adjust')
    ap.add_argument('--history')
    a = ap.parse_args()

    ref = json.load(open(a.reference, encoding='utf-8'))
    parts = json.load(open(os.path.join(a.render, 'parts.json'), encoding='utf-8'))
    sheet_path = os.path.join(WAKABA_ROOT, ref['sheet'])
    sheet = np.asarray(Image.open(sheet_path).convert('RGB'))
    os.makedirs(a.out, exist_ok=True)
    views = {}
    for v in parts['views']:
        # 色は重ねもの（レンズなど）を外した bare_ で測る（古い出力で無ければ beauty_）
        src = os.path.join(a.render, 'bare_%s.png' % v)
        if not os.path.exists(src):
            src = os.path.join(a.render, 'beauty_%s.png' % v)
        views[v] = (np.asarray(Image.open(src).convert('RGB')).astype(int),
                    np.asarray(Image.open(os.path.join(a.render, 'mask_%s.png' % v)).convert('RGB')).astype(int))

    items, fixes = [], []

    # 色彩
    chips = []
    for key, p in palette_items(ref):
        # 箱は 1 つ（box）でも複数（boxes）でもよい。複数なら全部の画素をまとめた中央値
        s_rgb = np.median(np.concatenate([sheet[y0:y1, x0:x1].reshape(-1, 3) for x0, y0, x1, y1 in sample_boxes(p)]), axis=0)
        beauty, mask = views[p.get('view', 'front')]
        pm, names = part_mask(mask, parts, p['model_materials'])
        if pm.sum() < 20:
            items.append({'category': '色彩', 'item': key, 'status': '測れない', 'detail': 'モデルにこの部位の画素がほとんど無い（%d）' % int(pm.sum()), 'score': None})
            continue
        m_rgb = np.median(beauty[pm].reshape(-1, 3), axis=0)
        s_lab, m_lab = srgb_to_lab(s_rgb), srgb_to_lab(m_rgb)
        de = ciede2000(tuple(s_lab), tuple(m_lab))
        score = max(0.0, 100.0 - 4.0 * de)
        dl = m_lab[0] - s_lab[0]
        items.append({'category': '色彩', 'item': key, 'score': round(score, 1), 'delta_e00': round(de, 1),
                      'sheet': hexcol(s_rgb), 'model': hexcol(m_rgb), 'dL': round(float(dl), 1), 'materials': names,
                      'certainty': p.get('certainty'), 'detail': p.get('note', '')})
        chips.append((key, s_rgb, m_rgb, de))
        if de > 10:
            hint = '明るすぎる' if dl > 8 else ('暗すぎる' if dl < -8 else '色みが違う')
            fixes.append({'item': key, 'kind': '色', 'text': '%s: いま %s／原画 %s（ΔE00=%.1f・%s）。VRoid でこの部位の色を原画へ寄せる（原画は光の当たった色なので、基本色は少し濃いめから）' % (key, hexcol(m_rgb), hexcol(s_rgb), de, hint)})

    # 体型
    hp = ref['proportions']['heads_tall']
    mh, marks = heads_tall(views['front'][1], parts, ref)
    if mh:
        rel = (mh - hp['value']) / hp['value']
        score = max(0.0, 100.0 - abs(rel) * 300)
        items.append({'category': '体型', 'item': '頭身', 'score': round(score, 1), 'sheet': hp['value'], 'model': round(mh, 2),
                      'certainty': hp['certainty'], 'detail': '原画: %s ／ モデル: 正面マスクの行 %s' % (hp['how'], marks)})
        if abs(rel) > 0.08:
            fixes.append({'item': '頭身', 'kind': '体型', 'text': '頭身 いま %.2f／原画 %.1f（推測値）。%s。VRoid の 体型 →「頭の大きさ」で調整する（原画の頭身は歩くポーズから推した値なので、直す前に人が確かめる）' % (mh, hp['value'], '頭が大きい' if mh < hp['value'] else '頭が小さい')})

    for it in pose_widths(parts):
        items.append(it)
        if abs(it['rel']) > 0.1:
            fixes.append({'item': it['item'], 'kind': '確認', 'text': '%s: %s。上着で隠れた関節なので、VRoid の体型を変える前に、シルエットの重ねで上半身の帯がずれているか人が確かめる' % (
                it['item'], it['status'])})

    # シルエット（原画のポーズ）
    sil_items, sil_fixes, sil_score = silhouette(ref, a.reference, parts, a.render, a.out)
    items += sil_items
    fixes += sil_fixes

    # 装飾品
    present = 0
    for prt in ref['parts']:
        if 'detect' in prt:
            d = prt['detect']
            pm, names = part_mask(views[d.get('view', 'front')][1], parts, d['materials'])
            ok = bool(pm.sum() > 30)
            status = 'ある（材質 %s で検出・%d 画素）' % (', '.join(n.replace(' (Instance)', '') for n in names), int(pm.sum())) if ok else '無い（材質で見つからない）'
        else:
            ok = prt['manual'].startswith('ある')
            status = prt['manual'] + '（目視の記録）'
        present += 1 if ok else 0
        items.append({'category': '装飾品', 'item': prt['name'], 'status': status, 'ok': ok, 'certainty': prt.get('certainty'),
                      'detail': prt.get('shape_note', '')})
        if not ok:
            fixes.append({'item': prt['id'], 'kind': 'パーツ', 'text': '%s が無い → Blender の特殊パーツ（hq3d_parts.py）か VRoid のアクセサリーで足す' % prt['name']})
        elif prt.get('shape_note'):
            fixes.append({'item': prt['id'], 'kind': '形', 'text': '%s: %s' % (prt['name'], prt['shape_note'])})

    # 項目別のまとめ
    def avg(cat):
        v = [i['score'] for i in items if i['category'] == cat and i.get('score') is not None]
        return round(sum(v) / len(v), 1) if v else None
    summary = {
        '色彩': avg('色彩'),
        '体型': avg('体型'),
        '装飾品': round(100.0 * present / max(len(ref['parts']), 1), 1),
        'シルエット': sil_score if sil_score is not None else '未計測',
        **{k: '未計測' for k in ['顔の輪郭', '目・鼻・口の位置', '髪型のシルエット', '衣装の形', '全体のキャラクターらしさ']},
    }

    # 絵: 設定画に箱を描いたもの・色の見本・描画とマスク
    sh = Image.open(sheet_path).convert('RGB')
    d = ImageDraw.Draw(sh)
    for key, p in palette_items(ref):
        for b in sample_boxes(p):
            d.rectangle(b, outline=(255, 0, 0), width=2)
            d.text((b[0], b[1] - 11), key, fill=(255, 0, 0))
    fb = ref['views_on_sheet']['front_full']['box']
    sh.crop(fb).save(os.path.join(a.out, 'sheet_front.png'))
    sw = Image.new('RGB', (360, 34 * max(len(chips), 1) + 24), 'white')
    d = ImageDraw.Draw(sw)
    d.text((80, 4), 'sheet', fill=(0, 0, 0))
    d.text((150, 4), 'model', fill=(0, 0, 0))
    for i, (k, s, m, de) in enumerate(chips):
        y = 22 + i * 34
        d.text((4, y + 9), k, fill=(0, 0, 0))
        d.rectangle([70, y, 130, y + 28], fill=tuple(int(v) for v in s))
        d.rectangle([140, y, 200, y + 28], fill=tuple(int(v) for v in m))
        d.text((210, y + 9), 'dE00 %.1f' % de, fill=(0, 0, 0))
    sw.save(os.path.join(a.out, 'palette.png'))
    for v in parts['views']:
        for kind in ('beauty', 'mask'):
            shutil.copyfile(os.path.join(a.render, '%s_%s.png' % (kind, v)), os.path.join(a.out, '%s_%s.png' % (kind, v)))

    report = {
        'character': ref['character'], 'time': datetime.datetime.now().isoformat(timespec='seconds'),
        'model': parts['model'], 'model_sha256': sha256(parts['model']),
        'adjust': a.adjust, 'adjust_sha256': sha256(a.adjust) if a.adjust and os.path.exists(a.adjust) else None,
        'summary': summary, 'items': items, 'fixes': fixes, 'not_compared_yet': ref.get('not_compared_yet', []),
        'note': '点数は見た目の近さの目安（代理指標）。原画と同じだという保証ではない。最後は人の目で決める',
    }
    with open(os.path.join(a.out, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    write_html(report, parts['views'], os.path.join(a.out, 'report.html'))
    if a.history:
        with open(a.history, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'time': report['time'], 'model_sha256': report['model_sha256'], 'adjust_sha256': report['adjust_sha256'],
                                'summary': summary, 'report': os.path.abspath(a.out)}, ensure_ascii=False) + '\n')
    print('HQ3D_COMPARE ' + json.dumps({'ok': True, 'summary': summary, 'fixes': len(fixes), 'out': os.path.abspath(a.out)}, ensure_ascii=False))


def data_uri(png):
    """レポートを 1 つのファイルで見られるよう、絵を埋め込む（別の場所へ写しても絵が消えない）"""
    import base64
    import io
    buf = io.BytesIO()
    Image.open(png).convert('RGB').save(buf, 'JPEG', quality=85)  # PNG のままだと 2MB を超えて重い
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def sil_html(path):
    f = os.path.join(os.path.dirname(path), 'silhouette.png')
    if not os.path.exists(f):
        return ''
    return ('<h2>シルエット（原画のポーズ）</h2><div class="imgs"><figure><img src="%s" style="height:520px">'
            '<figcaption>左: 原画 ／ 中: 同じポーズのモデル ／ 右: 重ね（灰＝両方・橙＝原画だけ＝モデルに足りない・青＝モデルだけ・薄い所＝尻尾で比べない・赤い線＝関節のずれ）</figcaption></figure></div>'
            '<p class="note">ポーズは推測。原画は遠近のある絵なので、手前に出した手や前の足は原画のほうが大きく描かれている</p>') % data_uri(f)


def write_html(r, views, path):
    e = html.escape
    rows = []
    for i in r['items']:
        val = i.get('score')
        val = '%.1f' % val if isinstance(val, (int, float)) else e(i.get('status', ''))
        extra = ''
        if i['category'] == '色彩' and 'sheet' in i:
            extra = '原画 <span class="chip" style="background:%s"></span>%s → モデル <span class="chip" style="background:%s"></span>%s（ΔE00 %s）' % (i['sheet'], i['sheet'], i['model'], i['model'], i['delta_e00'])
        elif i['category'] == '体型':
            extra = '原画 %s → モデル %s' % (i['sheet'], i['model'])
        elif i['category'] == 'シルエット' and 'iou' in i:
            extra = '重なり %s' % i['iou'] + ('・面積 %d%%' % round(100 * i['area_ratio']) if 'area_ratio' in i else '')
        rows.append('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            e(i['category']), e(i['item']), val, extra, e(str(i.get('certainty') or '')) + ' ' + e(i.get('detail', ''))))
    summ = ''.join('<div class="s"><b>%s</b><span>%s</span></div>' % (e(k), e(str(v))) for k, v in r['summary'].items())
    fixes = ''.join('<li>[%s] %s</li>' % (e(f['kind']), e(f['text'])) for f in r['fixes'])
    imgs = ''.join('<figure><img src="%s"><figcaption>%s</figcaption></figure>' % (data_uri(os.path.join(os.path.dirname(path), 'beauty_%s.png' % v)), v) for v in views)
    doc = '''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>原画との比較 %s</title>
<style>
:root{--bg:#fafaf7;--fg:#222;--muted:#666;--line:#ddd;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#1b1c1a;--fg:#eee;--muted:#aaa;--line:#444;--card:#262724}}
body{font-family:system-ui,"Yu Gothic UI",sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:16px;max-width:1200px;margin:auto}
h1{font-size:20px} .note{color:var(--muted);font-size:13px}
.sum{display:flex;flex-wrap:wrap;gap:8px}.s{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px;min-width:110px}
.s b{display:block;font-size:12px;color:var(--muted)}.s span{font-size:18px}
.imgs{display:flex;flex-wrap:wrap;gap:8px}.imgs figure{margin:0;background:#fff;border:1px solid var(--line)}
.imgs img{height:360px;display:block}figcaption{font-size:12px;text-align:center;color:#666}
table{border-collapse:collapse;width:100%%;font-size:13px}td{border-bottom:1px solid var(--line);padding:6px;vertical-align:top}
.chip{display:inline-block;width:14px;height:14px;border:1px solid #999;vertical-align:middle;margin:0 3px}
.tw{overflow-x:auto}
</style>
<h1>原画との比較 — %s</h1>
<p class="note">%s（%s）</p>
<div class="sum">%s</div>
<h2>並べて見る</h2>
<div class="imgs"><figure><img src="%s"><figcaption>原画（赤い箱＝色を取った所）</figcaption></figure>%s<figure><img src="%s" style="height:auto"><figcaption>色の見本</figcaption></figure></div>
%s
<h2>直す点</h2><ol>%s</ol>
<h2>項目</h2><div class="tw"><table><tr><td>分類</td><td>項目</td><td>点／状態</td><td>値</td><td>確かさ・メモ</td></tr>%s</table></div>
<h2>まだ比べていないもの</h2><ul>%s</ul>
<p class="note">モデル %s（sha256 %s…）</p>
</html>''' % (e(r['character']), e(r['character']), e(r['note']), e(r['time']), summ,
              data_uri(os.path.join(os.path.dirname(path), 'sheet_front.png')), imgs, data_uri(os.path.join(os.path.dirname(path), 'palette.png')), sil_html(path), fixes, ''.join(rows),
              ''.join('<li>%s</li>' % e(x) for x in r['not_compared_yet']), e(r['model']), r['model_sha256'][:12])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(doc)


if __name__ == '__main__':
    try:
        main()
    except Exception as ex:  # noqa: BLE001
        print('HQ3D_COMPARE ' + json.dumps({'ok': False, 'error': str(ex)}, ensure_ascii=False))
        sys.exit(1)
