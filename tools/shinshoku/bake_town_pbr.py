#!/usr/bin/env python3
# 境界侵食 P12：町の「PBR の地図帳」を焼く（色・法線・ORH の 3 枚 × 枠の大きさ 512／256／128）。
#   python tools/shinshoku/bake_town_pbr.py <町の地図帳の絵 PNG（dump_town_canvas.mjs の出力・512 の枠）> [--out shinshoku/assets/env]
# 枠の並びは shinshoku/render/townmat.js の TILES（dump の JSON に入っている）。描画の側（shinshoku/render/envmat.js）は同じ tileRect で読む。
# 枠ごとに：
#   ・材質の枠：素材ライブラリ（wakaba-assets/entries/material/<id>/web/）の albedo・normal・orh（matgen_town.py の出力）。目録（catalog.json）の
#     配信先 web の門が pass の物だけ使う（通らない物は絵の枠と同じ扱い＝手続きの絵）。
#   ・絵の枠（窓・看板の字・止まれ・マンホール・格子など）：キャンバスの絵。法線は明るさを高さとみなして作る（弱め）。粗さ・金属は表の値。
#   ・灯りの窓の「ガラス」（中を描く窓：室内の奥行きの見せかけ＝interior mapping）は色の A を 0.6 にして印を付ける（切り抜き 0.45 より上）。
# 出す物：town_albedo_<枠>.webp（RGBA・sRGB）・town_normal_<枠>.webp（OpenGL）・town_orh_<枠>.webp（R＝AO・G＝粗さ・B＝高さ）・townpbr.json（並び・枠ごとの値・元の素材）
# 要る物：numpy・Pillow（WebP）。作業用の仮の環境（venv）で動かす（リポジトリにも OS にも入れない）。
import json
import os
import sys
import hashlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
LIB = os.path.join(ROOT, 'wakaba-assets', 'entries', 'material')
CATALOG = os.path.join(ROOT, 'wakaba-assets', 'catalog.json')
SIZES = [512, 256, 128]
Q = {'albedo': 82, 'normal': 84, 'orh': 80}

# 枠 → (材質の id か None, 金属, 濡れ（上を向いた面が雨で暗く・艶が出る割合）, 法線の強さ, 印（1＝灯りの窓の中を描く・2＝透過の切り抜き）, 粗さ（絵の枠だけ）)
M = {
    'asphalt': ('mat.town.asphalt', 0, 1.0, 1.0, 0, None), 'asphalt2': ('mat.town.asphalt_patch', 0, 1.0, 1.0, 0, None),
    'interlock': ('mat.town.interlock', 0, 0.85, 1.0, 0, None), 'concrete': ('mat.town.concrete', 0, 0.75, 1.0, 0, None),
    'curb': ('mat.town.curb', 0, 0.7, 1.0, 0, None), 'block': ('mat.town.block_wall', 0, 0.6, 1.0, 0, None),
    'siding': ('mat.town.siding', 0, 0.3, 1.0, 0, None), 'siding2': ('mat.town.siding_metal', 0.55, 0.3, 1.0, 0, None),
    'mortar': ('mat.town.mortar', 0, 0.4, 1.0, 0, None), 'tilewall': ('mat.town.tile_facade', 0, 0.3, 1.0, 0, None),
    'wood': ('mat.town.wood_board', 0, 0.5, 1.0, 0, None), 'kawara': ('mat.town.kawara', 0.1, 0.7, 1.0, 0, None),
    'kawara2': ('mat.town.kawara_glazed', 0.05, 0.7, 1.0, 0, None), 'galv': ('mat.town.galv_roof', 0.5, 0.6, 1.0, 0, None),
    'win_dark': (None, 0, 0, 0.4, 0, 0.08), 'win_lit': (None, 0, 0, 0.4, 1, 0.1), 'win_curtain': (None, 0, 0, 0.4, 0, 0.3),
    'win_shoji': (None, 0, 0, 0.5, 0, 0.6), 'door_house': (None, 0, 0, 0.8, 0, 0.5), 'garage': ('mat.town.garage_door', 0.5, 0.2, 1.0, 0, None),
    'shopglass': (None, 0.1, 0, 0.3, 0, 0.06), 'konbini': (None, 0, 0, 0.3, 0, 0.3), 'rail': (None, 0.6, 0.2, 0.5, 2, 0.4),
    'brick': ('mat.town.brick', 0, 0.55, 1.0, 0, None), 'grass': ('mat.ground.grass', 0, 0.5, 1.0, 0, None),
    'gravel': ('mat.ground.gravel_path', 0, 0.7, 1.0, 0, None), 'water': ('mat.town.water', 0, 0, 0.6, 0, None),
    'tomare': (None, 0, 0.8, 0.6, 2, 0.55), 'manhole': (None, 0.65, 0.8, 1.6, 2, 0.45), 'fence': (None, 0.6, 0.2, 0.5, 2, 0.45),
    'hedge': ('mat.town.hedge', 0, 0.3, 1.0, 0, None), 'field': (None, 0, 0.7, 0.8, 0, 0.9), 'arcade_floor': ('mat.town.arcade_tile', 0, 0.08, 1.0, 0, None),
    'shutter': ('mat.town.shutter', 0.55, 0.1, 1.0, 0, None), 'balcony': (None, 0.5, 0.1, 0.5, 2, 0.4), 'acunit': (None, 0.2, 0.1, 0.9, 0, 0.5),
    'win_lit2': (None, 0, 0, 0.4, 1, 0.1), 'stone': ('mat.town.stone_tile', 0, 0.7, 1.0, 0, None), 'lane': ('mat.town.asphalt_old', 0, 1.0, 1.0, 0, None),
    'crosswalk': (None, 0, 0.8, 0.5, 2, 0.5), 'pole': (None, 0, 0.3, 0.7, 0, 0.75), 'roof_flat': ('mat.town.roof_flat', 0, 0.7, 1.0, 0, None),
    'win_office': (None, 0.1, 0, 0.3, 0, 0.08), 'win_office_lit': (None, 0, 0, 0.3, 1, 0.1), 'paving': ('mat.town.paving', 0, 0.8, 1.0, 0, None),
    'drain': ('mat.town.grating', 0.6, 0.5, 1.0, 0, None), 'leaves': (None, 0, 0.8, 0.8, 2, 0.75), 'puddle': (None, 0, 1.0, 0.3, 2, 0.03),
    'koshi': (None, 0, 0.2, 1.0, 0, 0.7), 'koshi_lit': (None, 0, 0, 1.0, 0, 0.6), 'curtainwall': (None, 0.3, 0, 0.4, 0, 0.05),
    'curtainwall_lit': (None, 0.2, 0, 0.4, 1, 0.08), 'granite': ('mat.town.granite_slab', 0, 0.75, 1.0, 0, None), 'rust': (None, 0, 0.6, 0.6, 2, 0.8),
    'tactile': ('mat.town.tactile', 0, 0.6, 1.0, 0, None), 'straw': (None, 0, 0.3, 1.2, 0, 0.9), 'trackbed': ('mat.town.trackbed', 0, 0.85, 1.0, 0, None),
    'busmark': (None, 0, 0.8, 0.5, 2, 0.5), 'panel': ('mat.town.panel', 0.1, 0.25, 1.0, 0, None), 'louver': (None, 0.6, 0.1, 0.9, 0, 0.4),
    'white': ('mat.town.paint', 0, 0.25, 0.7, 0, None),
    'vinyl': ('mat.int.vinyl', 0, 0, 1.0, 0, None), 'plaster': ('mat.int.plaster', 0, 0, 1.0, 0, None), 'gymfloor': ('mat.int.gym_floor', 0, 0, 1.0, 0, None),
    'ceiling': ('mat.int.ceiling', 0, 0, 1.0, 0, None), 'epoxy': ('mat.int.epoxy', 0, 0, 1.0, 0, None), 'metalpanel': ('mat.int.metal_panel', 0.35, 0, 1.0, 0, None),
    'carpet': ('mat.int.carpet', 0, 0, 1.0, 0, None), 'woodfloor': ('mat.int.wood_floor', 0, 0, 1.0, 0, None), 'tilewhite': ('mat.int.tile_white', 0, 0, 1.0, 0, None),
}


def web_ok():
    try:
        cat = json.load(open(CATALOG, encoding='utf-8'))
    except Exception:
        return set()
    return {e['id'] for e in cat.get('entries', []) if e.get('targets', {}).get('web', {}).get('result') == 'pass'}


def load_map(mid, kind, ts):
    d = os.path.join(LIB, mid, 'web')
    for s in (ts, 512, 1024, 256):
        p = os.path.join(d, f'{kind}_{s}.webp')
        if os.path.isfile(p):
            im = Image.open(p).convert('RGBA' if kind == 'albedo' else 'RGB')
            return im.resize((ts, ts), Image.LANCZOS) if im.size[0] != ts else im
    return None


def renorm(arr):
    v = arr[..., :3].astype(np.float32) / 255 * 2 - 1
    v /= np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)
    return np.clip((v * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8)


def graphic(img, strength, rough, ts):
    """絵の枠：明るさ → 高さ → 法線（弱め）・AO（窪み）"""
    a = np.asarray(img).astype(np.float32) / 255
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.55 + a[..., 2] * 0.15) * (a[..., 3] if a.shape[2] > 3 else 1)
    h = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(0.6, ts / 512)))).astype(np.float32) / 255
    k = strength * ts / 128
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * k
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * k
    n = np.stack([-dx, dy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    blur = np.asarray(Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(ts / 64))).astype(np.float32) / 255
    ao = 1 - np.clip((blur - h) * 3.0, 0, 0.6)
    nrm = np.clip((n * 0.5 + 0.5) * 255 + 0.5, 0, 255).astype(np.uint8)
    orh = np.stack([ao * 255, np.full_like(h, rough * 255), np.full_like(h, 0.6 * 255)], -1).astype(np.uint8)
    return nrm, orh


def glass_mask(name, ts):
    """灯りの窓の、中を描くガラスの所（townmat.js の DRAW と同じ形）：1＝ガラス"""
    k = ts / 256
    m = np.zeros((ts, ts), np.float32)
    def rect(x, y, w, h):
        m[int(y * k):int((y + h) * k), int(x * k):int((x + w) * k)] = 1
    if name in ('win_lit', 'win_lit2'):
        mx = 128
        rect(12, 12, mx - 16, 256 - 24)
        rect(mx + 4, 12, mx - 16, 256 - 24)
    elif name == 'win_office_lit':
        rect(10, 30, 256 - 20, 256 - 70)
        m[:, int((128 - 3) * k):int((128 + 3) * k)] = 0
    elif name == 'curtainwall_lit':
        for y in range(0, 256, 128):
            for x in range(0, 256, 64):
                rect(x + 6, y + 6, 64 - 12, 128 - 12)
    return m


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__ if __doc__ else '使い方：bake_town_pbr.py <canvas.png> [--out dir]')
        sys.exit(2)
    canvas_p = a[0]
    out = os.path.join(ROOT, 'shinshoku', 'assets', 'env') if '--out' not in a else os.path.abspath(a[a.index('--out') + 1])
    info = json.load(open(canvas_p[:-4] + '.json', encoding='utf-8'))
    tiles, N, ROWS = info['tiles'], info['n'], info['rows']
    canvas = Image.open(canvas_p).convert('RGBA')
    ok = web_ok()
    os.makedirs(out, exist_ok=True)
    used, missing = {}, []
    for t in tiles:
        if t not in M:
            missing.append(t)
    if missing:
        print('✗ 表に無い枠：', missing)
        sys.exit(1)
    manifest = {'townpbr': 1, 'tiles': tiles, 'n': N, 'rows': ROWS, 'sizes': {}, 'params': {}, 'sources': {},
                'license': {'id': 'own', 'commercial': 'yes', 'note': '全部この リポジトリの手続きの生成（matgen_town.py の材質＋townmat.js の絵）。素材は wakaba-assets の目録で web の門を通った物だけ'},
                'generator': 'tools/shinshoku/bake_town_pbr.py'}
    for t in tiles:
        mid, metal, wet, nstr, flag, rough = M[t]
        manifest['params'][t] = [metal, wet, nstr, flag]
        if mid and mid in ok:
            manifest['sources'][t] = mid
    for ts in SIZES:
        W, H = N * ts, ROWS * ts
        alb = Image.new('RGBA', (W, H)); nrm = Image.new('RGB', (W, H)); orh = Image.new('RGB', (W, H))
        cv = canvas.resize((N * ts, ROWS * ts), Image.LANCZOS) if ts != info['tile'] else canvas
        for i, t in enumerate(tiles):
            x, y = (i % N) * ts, (i // N) * ts
            mid, metal, wet, nstr, flag, rough = M[t]
            cell = cv.crop((x, y, x + ts, y + ts))
            maps = None
            if mid and mid in ok:
                A, Nn, O = load_map(mid, 'albedo', ts), load_map(mid, 'normal', ts), load_map(mid, 'orh', min(ts, 512))
                if A is not None and Nn is not None and O is not None:
                    O = O.resize((ts, ts), Image.LANCZOS) if O.size[0] != ts else O
                    maps = (A, Image.fromarray(renorm(np.asarray(Nn))), O)
            if maps is None:
                n_, o_ = graphic(cell, nstr, rough if rough is not None else 0.6, ts)
                ca = np.asarray(cell).copy()
                if flag == 1:
                    g = glass_mask(t, ts)
                    lum = ca[..., :3].astype(np.float32).mean(-1) / 255
                    g = g * (lum > 0.33)
                    ca[..., 3] = np.where(g > 0.5, 153, 255).astype(np.uint8)
                elif flag != 2:
                    ca[..., 3] = 255
                maps = (Image.fromarray(ca, 'RGBA'), Image.fromarray(n_), Image.fromarray(o_))
            alb.paste(maps[0], (x, y)); nrm.paste(maps[1], (x, y)); orh.paste(maps[2], (x, y))
        files = {}
        for k, im in (('albedo', alb), ('normal', nrm), ('orh', orh)):
            p = os.path.join(out, f'town_{k}_{ts}.webp')
            im.save(p, 'WEBP', quality=Q[k], method=6, alpha_quality=90)
            b = open(p, 'rb').read()
            files[k] = {'file': os.path.basename(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()[:16]}
        manifest['sizes'][str(ts)] = {'w': W, 'h': H, 'files': files}
        print(f'✓ 枠 {ts}px：{W}×{H}・' + '・'.join(f"{k} {v['bytes'] / 1048576:.2f}MB" for k, v in files.items()))
    with open(os.path.join(out, 'townpbr.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f"材質の枠 {len(manifest['sources'])}／{len(tiles)}（残りは絵の枠）")


if __name__ == '__main__':
    main()
