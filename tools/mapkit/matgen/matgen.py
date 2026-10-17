#!/usr/bin/env python3
# わかば matgen：手続きで PBR の材質（色・法線・ORH）を作り、素材ライブラリ（wakaba-assets/entries/material/<id>/）に置く。
#   python tools/mapkit/matgen/matgen.py                     … 全部（1024px の原本 → web/ に 1024・512・256 の WebP）
#   python tools/mapkit/matgen/matgen.py --only mat.ground.moss --preview <フォルダ>   … 1 つだけ・確かめの絵（光を当てた見本）も
#   --size 512（原本を小さく＝速い試し。web/ は書かない）・--no-web・--library <entries のフォルダ>
# 要る物：Python 3.9 以上・numpy・Pillow（WebP 対応）。リポジトリにも OS にも入れず、作業用の仮の環境（venv）で動かす（docs/wakaba-mapkit/11）。
# 出す物（1 材質＝1 フォルダ）：
#   meta.json        素材メタデータ v1.1（source.type: self_made・source.generator＝このスクリプト・license.id: own・商用可・再配布可。verifiedBy は空＝人が確かめる）
#   sources.json     原本（source/<id>_{albedo,normal,orh}.png・1024px・Git に入れない）の sha256。同じ種なら同じ画素＝作り直して突き合わせられる
#   web/             albedo_<辺>.webp（sRGB・透過の材質は RGBA）・normal_<辺>.webp（OpenGL：G＝上）・orh_<辺>.webp（R＝AO・G＝粗さ・B＝高さ。金属は 0）
# 同じ種・同じ版の numpy なら同じ結果（numpy の版が違うと FFT の丸めで 1 の差が出ることがある＝sources.json の sha256 は参考）。
import argparse
import hashlib
import io
import json
import os
import sys
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tex import cavity_ao, normal_from_height, encode_normal, to_u8  # noqa: E402
from defs import MATERIALS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
GEN = 'tools/mapkit/matgen/matgen.py'
VERSION = 1
WEB_SIZES = [1024, 512, 256]
CARD_SIZES = [512, 256, 128]          # 葉のカード：原本は 1024・Web は 512 まで（近くでも 1 枚が画面の小さな部分）
QUALITY = {'albedo': 76, 'normal': 80, 'orh': 72}
# 1024 を Web に出す材質（近くで大きく見える地面・岩・壁・屋根）。他は 512 まで（読み込みの量を抑える：docs/wakaba-mapkit/11 §予算）
BIG = {'mat.ground.forest_floor', 'mat.ground.grass', 'mat.ground.moss', 'mat.ground.dirt_path', 'mat.ground.gravel_path', 'mat.rock.cliff',
       'mat.rock.andesite', 'mat.wall.tsuchikabe', 'mat.wood.planks_silver', 'mat.roof.kawara'}
SMALL_SIZES = [512, 256, 128]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def png_bytes(arr):
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def resize(arr, size, kind):
    im = Image.fromarray(arr)
    if im.size[0] == size:
        return arr
    out = np.asarray(im.resize((size, size), Image.LANCZOS))
    if kind == 'normal':
        v = out[..., :3].astype(np.float32) / 255 * 2 - 1
        v /= np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)
        out = to_u8(v * 0.5 + 0.5)
    return out


def webp_bytes(arr, q, alpha=False):
    buf = io.BytesIO()
    mode = 'RGBA' if alpha else 'RGB'
    Image.fromarray(arr, mode).save(buf, 'WEBP', quality=q, method=6, alpha_quality=90 if alpha else 100)
    return buf.getvalue()


def build(mid, n, seed_override=None):
    fn, seed, tile, names, tags, use = MATERIALS[mid]
    t0 = time.time()
    d = fn(n, seed_override or seed)
    h = np.clip(d['height'], 0, 1).astype(np.float32)
    ao = d.get('ao')
    if ao is None:
        ao = cavity_ao(h, d.get('ao_radii', (2, 6, 16)), d.get('ao_power', 1.0))
    nstr = d['nstr'] * n / 1024
    nrm = normal_from_height(h, nstr)
    alpha = d.get('alpha')
    if alpha is not None:
        flat = np.zeros_like(nrm)
        flat[..., 2] = 1
        nrm = np.where((alpha > 0.5)[..., None], nrm, flat)
        ao = np.where(alpha > 0.5, ao, 1.0)
    alb = to_u8(d['albedo'])
    if alpha is not None:
        alb = np.concatenate([alb, to_u8(alpha)[..., None]], -1)
    orh = np.stack([to_u8(ao), to_u8(d['rough']), to_u8(h)], -1)
    return dict(albedo=alb, normal=encode_normal(nrm), orh=orh, alpha=alpha is not None, card=bool(d.get('card')),
                tile=tile, names=names, tags=tags, use=use, secs=time.time() - t0, rough_mean=float(np.mean(d['rough'])),
                albedo_mean=[float(x) for x in d['albedo'].reshape(-1, 3).mean(0)])


def preview(maps, path):
    """確かめの絵：左上から光を当てた見本（色×（拡散＋少しの反射）×AO）を 2×2 に並べて、つながり目も見えるように"""
    alb = maps['albedo'][..., :3].astype(np.float32) / 255
    nrm = maps['normal'].astype(np.float32) / 255 * 2 - 1
    orh = maps['orh'].astype(np.float32) / 255
    L = np.array([-0.5, 0.6, 0.62])
    L /= np.linalg.norm(L)
    ndl = np.clip((nrm * L).sum(-1), 0, 1)
    rough = orh[..., 1]
    H = (L + np.array([0, 0, 1])) / np.linalg.norm(L + np.array([0, 0, 1]))
    spec = np.clip((nrm * H).sum(-1), 0, 1) ** (2 / np.maximum(rough ** 4, 1e-3)) * (1 - rough) * 0.5
    lin = (alb ** 2.2) * (0.25 + 1.1 * ndl[..., None]) * orh[..., 0:1] + spec[..., None]
    img = to_u8(np.clip(lin, 0, 1) ** (1 / 2.2))
    if maps['alpha']:
        a = maps['albedo'][..., 3:4].astype(np.float32) / 255
        chk = ((np.indices(a.shape[:2]).sum(0) // 32) % 2)[..., None] * 0.15 + 0.35
        img = to_u8(img / 255 * a + chk * (1 - a))
    tiled = np.tile(img, (2, 2, 1))
    Image.fromarray(tiled).resize((512, 512), Image.LANCZOS).save(path)


def write_entry(mid, maps, lib, n, web=True):
    d = os.path.join(lib, 'material', mid)
    os.makedirs(os.path.join(d, 'source'), exist_ok=True)
    files = []
    for k in ('albedo', 'normal', 'orh'):
        b = png_bytes(maps[k])
        p = f'source/{mid}_{k}.png'
        with open(os.path.join(d, p), 'wb') as f:
            f.write(b)
        files.append({'role': 'texture', 'path': p, 'storage': 'local-ignored', 'sha256': sha(b), 'bytes': len(b),
                      'tool': f'{GEN} v{VERSION}・numpy {np.__version__}', 'note': f'{n}px の原本（Git に入れない）。作り直し：python {GEN} --only {mid}'})
    sizes = WEB_SIZES if mid in BIG else (CARD_SIZES if maps['card'] else SMALL_SIZES)
    web_files = {}
    total = 0
    if web:
        wd = os.path.join(d, 'web')
        os.makedirs(wd, exist_ok=True)
        for old in os.listdir(wd):
            os.remove(os.path.join(wd, old))
        for k in ('albedo', 'normal', 'orh'):
            for s in sizes:
                if k == 'orh' and s > 512:
                    continue          # AO・粗さ・高さは 512 で足りる（1024 は色と法線だけ）
                arr = resize(maps[k], s, k)
                b = webp_bytes(arr, QUALITY[k], alpha=(k == 'albedo' and maps['alpha']))
                name = f'{k}_{s}.webp'
                with open(os.path.join(wd, name), 'wb') as f:
                    f.write(b)
                web_files.setdefault(k, {})[str(s)] = name
                total += len(b)
    names = maps['names']
    meta = {
        'id': mid, 'version': VERSION,
        'name': {'ja': names[0], 'en': names[1]},
        'category': 'material',
        'tags': maps['tags'] + ['手続き', '自作'],
        'source': {'type': 'self_made', 'author': 'わかば（リポジトリの手続きの生成：Claude Code が書いたスクリプト）', 'generator': GEN, 'url': ''},
        'license': {'id': 'own', 'commercial': 'yes', 'redistributeRaw': 'yes', 'engines': ['any'], 'attribution': '', 'verifiedBy': '',
                    'textUrl': 'docs/wakaba-mapkit/11_写実化パイプライン.md'},
        'tech': {'formats': ['webp', 'png'], 'texRes': max(sizes), 'texMaps': ['baseColor', 'normal', 'ao', 'roughness', 'height'], 'fileBytes': total},
        'use': maps['use'],
        'status': 'draft',
        'material': {
            'material': 'wakaba-material/1',
            'tileM': maps['tile'], 'sizes': sizes, 'maps': web_files,
            'alpha': maps['alpha'], 'card': maps['card'],
            'channels': {'albedo': 'sRGB' + ('・A＝透過（alphaTest 0.5）' if maps['alpha'] else ''), 'normal': '接空間・OpenGL（G＝上・three.js の既定）', 'orh': 'R＝AO・G＝粗さ・B＝高さ（金属は 0）'},
            'albedoMean': [round(x, 3) for x in maps['albedo_mean']], 'roughMean': round(maps['rough_mean'], 3),
        },
        'history': [{'at': '2026-10-17', 'by': 'claude-code', 'change': f'{GEN} で生成（フェーズ 3）'}],
    }
    with open(os.path.join(d, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
        f.write('\n')
    with open(os.path.join(d, 'sources.json'), 'w', encoding='utf-8') as f:
        json.dump({'sources': 'wakaba-asset-sources/1', 'id': mid, 'files': files}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', action='append')
    ap.add_argument('--size', type=int, default=1024)
    ap.add_argument('--library', default=os.path.join(ROOT, 'wakaba-assets', 'entries'))
    ap.add_argument('--preview')
    ap.add_argument('--no-web', action='store_true')
    a = ap.parse_args()
    ids = a.only or list(MATERIALS)
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
    grand = 0
    for mid in ids:
        if mid not in MATERIALS:
            print(f'✗ 知らない材質：{mid}')
            sys.exit(2)
        maps = build(mid, a.size)
        if a.preview:
            preview(maps, os.path.join(a.preview, mid + '.png'))
        web = not a.no_web and a.size == 1024
        total = write_entry(mid, maps, a.library, a.size, web=web) if (web or a.size == 1024) else 0
        grand += total
        print(f'✓ {mid}  {maps["secs"]:.1f}s  web {total / 1024:.0f}KB  色の平均 {[round(x, 2) for x in maps["albedo_mean"]]}  粗さ {maps["rough_mean"]:.2f}')
    print(f'合計 web {grand / 1048576:.2f}MB（{len(ids)} 材質）')


if __name__ == '__main__':
    main()
