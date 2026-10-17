#!/usr/bin/env node
// 共有素材ライブラリの目録（catalog.json）を作る：entries/<category>/<id>/ を全部読み、形（スキーマ）とライセンス門（配信先 web・ue5 ごと）で確かめて書く。
//   node tools/mapkit/catalog.mjs                 … wakaba.config.json の assetLibrary.entries を読んで assetLibrary.catalog を書く
//   node tools/mapkit/catalog.mjs --check         … 書かずに、今の catalog.json が最新か・誤りが無いかだけ（CI 用。古い・誤りありなら 1）
//   --root <entries のフォルダ>・--out <catalog.json>・--project shinshoku・--verify-sources（source/ に実物があれば sha256 を計算して突き合わせる）
//   --ue5-map <file>（UE5 の取り込み用の「素材の id → /Game の場所」の表も書く。tools/ue5/import_layout.py の --asset-map に渡す）
// 終了コード：0＝誤りなし／1＝誤りあり（目録は誤りの無い素材だけで書く）か --check で古い／2＝使い方の誤り
// 1 素材＝1 フォルダの中身は docs/wakaba-mapkit/10 §2・mapkit/assets/library.js。
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { checkPackage, makeCatalog, ue5AssetMap } from '../../mapkit/assets/library.js';
import { registry, rootPath, rel, loadConfig, parseArgs } from '../../mapkit/core/node.mjs';

const { opt } = parseArgs(process.argv.slice(2), ['check', 'verify-sources', 'quiet']);
const config = loadConfig(), lib = config.assetLibrary || {}, projectId = opt.project || 'shinshoku';
const root = rootPath(opt.root || lib.entries || 'wakaba-assets/entries');
const out = rootPath(opt.out || lib.catalog || 'wakaba-assets/catalog.json');
const reg = await registry();
const sha = b => createHash('sha256').update(b).digest('hex');
const readJ = (f, errs) => { if (!existsSync(f)) return undefined; try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errs.push({ file: rel(f), msg: e.message }); return undefined; } };
const dirs = p => existsSync(p) ? readdirSync(p).filter(f => statSync(join(p, f)).isDirectory()).sort() : [];

const entries = [], problems = [], seen = new Map();
for (const cat of dirs(root)) for (const id of dirs(join(root, cat))) {
  const d = join(root, cat, id), parseErrors = [];
  const pkg = { dir: `${cat}/${id}`, parseErrors, meta: readJ(join(d, 'meta.json'), parseErrors), sources: readJ(join(d, 'sources.json'), parseErrors), ue5: readJ(join(d, 'ue5', 'import.json'), parseErrors), web: [] };
  if (existsSync(join(d, 'web'))) for (const f of readdirSync(join(d, 'web')).sort()) if (statSync(join(d, 'web', f)).isFile()) pkg.web.push({ name: f, bytes: new Uint8Array(readFileSync(join(d, 'web', f))) });
  if (opt['verify-sources'] && pkg.sources && Array.isArray(pkg.sources.files)) {
    pkg.sourceFiles = {};
    for (const f of pkg.sources.files) if (/^source\//.test(f.path || '') && existsSync(join(d, f.path))) pkg.sourceFiles[f.path] = sha(readFileSync(join(d, f.path)));
  }
  if (pkg.meta && pkg.meta.source && pkg.meta.source.generator) pkg.generatorExists = existsSync(rootPath(pkg.meta.source.generator));
  const r = checkPackage(pkg, { config, projectId, registry: reg });
  if (r.entry && seen.has(r.entry.id)) r.errors.push({ code: 'DUP_ID', file: pkg.dir, msg: `同じ id の素材が 2 つある（${seen.get(r.entry.id)}）` });
  if (r.entry) seen.set(r.entry.id, pkg.dir);
  problems.push({ dir: pkg.dir, errors: r.errors, warnings: r.warnings });
  if (r.entry && !r.errors.length) entries.push(r.entry);
}

const catalog = makeCatalog(entries, { config, projectId });
const text = JSON.stringify(catalog, null, 1) + '\n';
const nErr = problems.reduce((s, p) => s + p.errors.length, 0);
const warnCount = {};
for (const p of problems) {
  for (const w of p.warnings) warnCount[w.code] = (warnCount[w.code] || 0) + 1;
  if (opt.quiet && !p.errors.length) continue;
  const e = entries.find(x => x.dir === p.dir);
  console.log(`${p.errors.length ? '✗' : '✓'} ${p.dir}${e ? '  ' + Object.entries(e.targets).map(([t, r]) => `${t}:${r.result}`).join('・') : ''}`);
  for (const x of p.errors) console.log(`    - [${x.code}] ${x.file || ''}：${x.msg}`);
  for (const x of p.warnings) console.log(`    · 注意 [${x.code}] ${x.msg}`);
}
console.log(`目録：${rel(root)} の ${problems.length} 件 → 載せた ${entries.length} 件・誤り ${nErr} 件（配信先 ${catalog.targets.join('・')}）${Object.keys(warnCount).length ? '・注意 ' + Object.entries(warnCount).map(([k, n]) => `${k} ${n}`).join('・') : ''}`);
let stale = false;
if (opt.check) {
  const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
  stale = cur !== text;
  console.log(stale ? `✗ ${rel(out)} が古い（node tools/mapkit/catalog.mjs で作り直す）` : `✓ ${rel(out)} は最新`);
} else {
  writeFileSync(out, text); console.log(`  書いた：${rel(out)}`);
  if (opt['ue5-map']) { writeFileSync(rootPath(opt['ue5-map']), JSON.stringify({ ue5AssetMap: 'wakaba-ue5-asset-map/1', assets: ue5AssetMap(catalog) }, null, 1) + '\n'); console.log(`  書いた：${opt['ue5-map']}`); }
}
process.exit(nErr || stale ? 1 : 0);
