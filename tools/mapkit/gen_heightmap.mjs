#!/usr/bin/env node
// 地図仕様から手続きの高さマップ（16bit のグレー PNG）を作る（Gaea などの高さマップが無い間の代わり。同じ仕様＋同じ種 → 同じ PNG）。
//   node tools/mapkit/gen_heightmap.mjs maps/haison            … maps/haison/heightmap.png（terrain.source.file）を書く
//   --seed <種>（仕様の seed の代わり）・--out <file>・--raw（.raw16 も書く：UE の Landscape の取り込み用・リトルエンディアン）・--cell 1
// 中身：mapkit/terrain/generate.js（下地のノイズ＋侵食＋崖・平らな谷）。道・建物の土台は入れない（それは build_map.mjs の層 2・3）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTerrain } from '../../mapkit/terrain/generate.js';
import { rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

const { opt, pos } = parseArgs(process.argv.slice(2), ['raw']);
if (!pos.length) { console.log('使い方：node tools/mapkit/gen_heightmap.mjs <maps/<id>> [--seed 種] [--out file] [--raw] [--cell 1]'); process.exit(2); }
const dir = rootPath(pos[0]), spec = JSON.parse(readFileSync(join(dir, 'map.spec.json'), 'utf8'));
if (opt.seed) spec.seed = opt.seed;
const t0 = Date.now(), hf = generateTerrain(spec, { cell: opt.cell ? +opt.cell : 1 });
const out = opt.out ? rootPath(opt.out) : join(dir, (spec.terrain.source && spec.terrain.source.file) || 'heightmap.png');
const png = await hf.toPNG16(); writeFileSync(out, png);
if (opt.raw) writeFileSync(out.replace(/\.png$/, '') + '.raw16', hf.toRAW16());
const [lo, hi] = hf.extent();
console.log(`✓ ${rel(out)}：${hf.nx}×${hf.nz}（${hf.cell}m）・高さ ${lo.toFixed(1)}〜${hi.toFixed(1)}m（16bit の範囲 ${hf.minY}〜${hf.maxY}m）・${(png.length / 1024).toFixed(0)}KB・${Date.now() - t0}ms`);
console.log('  ' + hf.log.map(l => l.type).join(' → '));
