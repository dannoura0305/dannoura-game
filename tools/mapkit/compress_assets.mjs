#!/usr/bin/env node
// 素材ライブラリの Web の書き出しを圧縮した「写し」を作る（開発の道具・ゲームは読まない＝実行時の依存を増やさない）。フェーズ 4。
//   node tools/mapkit/compress_assets.mjs --tools <npm の道具のフォルダ> [--mesh] [--tex] [--only <id>] [--sizes 1024,512] [--dry]
//     --mesh：部品の glb → web/<id>.mo.glb（gltfpack -cc：Meshopt の圧縮＋量子化。節の名前・材質の名前・頂点の属性はそのまま）
//     --tex ：材質の WebP → web/<種類>_<辺>.ktx2（Basis Universal：albedo・orh＝ETC1S。--normals で normal も UASTC＋zstd）。GPU の中で圧縮のまま使える（VRAM が減る）
//   道具（リポジトリにも OS にも入れない。作業フォルダで）：npm i gltfpack@1.3.0 ktx2-encoder@0.6.0 sharp
//     → --tools <そのフォルダ>（node_modules がある所）。環境変数 WAKABA_NPM_TOOLS でもよい
// ブラウザ版（mapkit/render/assets.js）は、目録の web に .mo.glb／.ktx2 があり、復号器（vendor/three-esm の MeshoptDecoder・KTX2Loader＋basis の
// transcoder）が読めれば使う。無ければ今まで通り（glb・WebP）＝元のファイルは消さない（UE5・Blender・古い端末の予備）。
// 結果（大きさ・時間）は標準出力と --report <json> に書く（docs/wakaba-mapkit/11 §6 の表の元）。
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

const { opt } = parseArgs(process.argv.slice(2), ['mesh', 'tex', 'dry', 'normals']);
const TOOLS = opt.tools || process.env.WAKABA_NPM_TOOLS;
if (!TOOLS || !existsSync(join(TOOLS, 'node_modules'))) { console.log('使い方：node tools/mapkit/compress_assets.mjs --tools <npm i gltfpack@1.3.0 ktx2-encoder@0.6.0 sharp をしたフォルダ> [--mesh] [--tex] [--only <id>]'); process.exit(2); }
const req = createRequire(join(TOOLS, 'package.json'));
const root = rootPath('wakaba-assets/entries'), out = { mesh: [], tex: [] };
const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory()).sort();
const doMesh = opt.mesh || !opt.tex, doTex = opt.tex || !opt.mesh, sizes = String(opt.sizes || '1024,512,256').split(',').map(Number);

for (const cat of dirs(root)) for (const id of dirs(join(root, cat))) {
  if (opt.only && !String(opt.only).split(',').includes(id)) continue;
  const web = join(root, cat, id, 'web'); if (!existsSync(web)) continue;
  const meta = JSON.parse(readFileSync(join(root, cat, id, 'meta.json'), 'utf8'));
  // ── 部品（glb → Meshopt）
  if (doMesh && meta.kit && existsSync(join(web, `${id}.glb`))) {
    const src = join(web, `${id}.glb`), dst = join(web, `${id}.mo.glb`), t0 = Date.now();
    // -kn：節の名前（LOD0・IMP）を残す／-km：材質の名前（mat.*）を残す／-kv：頂点の属性（COLOR_0＝焼いた AO・TANGENT）を残す／-vn 10：法線を細かめに
    // -vtf：UV は量子化しない（量子化すると UV の戻し方が glb の材質（KHR_texture_transform）に入るが、ブラウザ版は材質を共有の mat.* に差し替えるので UV がずれる＝葉が消えた）
    const gp = join(TOOLS, 'node_modules', 'gltfpack', 'cli.js');
    if (!opt.dry) execFileSync(process.execPath, [gp, '-i', src, '-o', dst, '-cc', '-kn', '-km', '-kv', '-vn', '10', '-vtf'], { stdio: 'pipe' });
    const a = statSync(src).size; let b = opt.dry ? 0 : statSync(dst).size;
    if (!opt.dry && b >= a) { unlinkSync(dst); console.log(`mesh ${id}: 圧縮しても小さくならない（${a} → ${b}）＝写しを作らない`); b = a; continue; }
    out.mesh.push({ id, from: a, to: b, ms: Date.now() - t0 }); console.log(`mesh ${id}: ${a} → ${b}（${Math.round(b / a * 100)}%）`);
  }
  // ── 材質（WebP → KTX2）
  if (doTex && meta.material) {
    const { encodeToKTX2 } = await import(pathToFileURL(join(TOOLS, 'node_modules', 'ktx2-encoder', 'dist', 'node', 'index.js')).href);
    const sharp = (await import(pathToFileURL(req.resolve('sharp')).href)).default;
    const dec = async b => { const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), width: info.width, height: info.height }; };
    for (const [kind, bySize] of Object.entries(meta.material.maps)) for (const [s, f] of Object.entries(bySize)) {
      if (!sizes.includes(+s) || (kind === 'normal' && !opt.normals)) continue;   // 法線は既定で WebP のまま（UASTC は大きい・ETC1S は法線が荒れる。--normals で UASTC）
      const src = join(web, f), dst = join(web, f.replace(/\.webp$/, '.ktx2')), t0 = Date.now();
      const normal = kind === 'normal';
      const o = normal ? { isUASTC: true, needSupercompression: true, generateMipmap: true, isNormalMap: true, uastcLDRQualityLevel: 1 } : { isUASTC: false, generateMipmap: true, qualityLevel: kind === 'orh' ? 110 : 150, compressionLevel: 2, isSetKTX2SRGBTransferFunc: kind === 'albedo' };
      if (!opt.dry) { const orig = console.log; console.log = () => {}; let k; try { k = await encodeToKTX2(new Uint8Array(readFileSync(src)), { ...o, imageDecoder: dec, enableDebug: false }); } finally { console.log = orig; } writeFileSync(dst, k); }
      const a = statSync(src).size, b = opt.dry ? 0 : statSync(dst).size;
      out.tex.push({ id, kind, size: +s, from: a, to: b, ms: Date.now() - t0, mode: normal ? 'UASTC+zstd' : 'ETC1S' }); console.log(`tex  ${id} ${kind}_${s}: ${a} → ${b}（${normal ? 'UASTC' : 'ETC1S'}・${Date.now() - t0}ms）`);
    }
  }
}
const sum = (l, k) => l.reduce((s, x) => s + x[k], 0);
console.log(`部品 ${out.mesh.length}：${sum(out.mesh, 'from')} → ${sum(out.mesh, 'to')} バイト／テクスチャ ${out.tex.length}：${sum(out.tex, 'from')} → ${sum(out.tex, 'to')} バイト`);
if (opt.report) writeFileSync(rootPath(opt.report), JSON.stringify({ at: new Date().toISOString(), tools: Object.fromEntries(['gltfpack', 'ktx2-encoder', 'sharp'].map(n => [n, JSON.parse(readFileSync(join(TOOLS, 'node_modules', n, 'package.json'), 'utf8')).version])), ...out }, null, 1) + '\n');
void rel;
