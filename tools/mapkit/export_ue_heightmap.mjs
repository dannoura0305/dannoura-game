#!/usr/bin/env node
// 地図の最終の地形（maps/<id>/build/terrain.png）を UE5 の Landscape 用の 16bit PNG と設定の JSON に書き出す（方式 C・高性能 PC 版）。
//   node tools/mapkit/export_ue_heightmap.mjs maps/haison
//     書く物：maps/haison/build/ue/heightmap_<n>.png（16bit グレー・n×n＝UE の推奨の大きさ）
//             maps/haison/build/ue/landscape.json（UE の取り込みの値：区画の割り方・Scale X/Y/Z・Location・座標の写し方）
//   --size auto|127|253|505|1009|2017|4033|8129（既定 auto＝元の頂点数以上で一番小さい推奨）・--out <フォルダ>
//   --points（UE の PCG・データテーブル用に、物と下草の点を pcg_points.csv に。大きいので既定では書かない）
// 先に build_map.mjs で layout.json と terrain.png を作っておく（validate_spec.mjs と同じ検査を最初に行う）。
// 高さの範囲は「実際の地形の最小〜最大」を 0〜65535 に広げて精度を上げる（landscape.json の minM・maxM）。UE の値の式は mapkit/core/ue.js。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { heightfieldFromPNG } from '../../mapkit/terrain/heightmap.js';
import { encodePNG16 } from '../../mapkit/terrain/png.js';
import { validateLayoutFile } from '../../mapkit/core/layoutfile.js';
import { formatErrors } from '../../mapkit/core/schema.js';
import { UE_RECOMMENDED, pickLandscapeSize, landscapeSettings, resample, toUE, toUERot, objectToUE } from '../../mapkit/core/ue.js';
import { unb64 } from '../../mapkit/pcg/scatter.js';
import { registry, rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

/** 純粋な部分（試験から呼ぶ）：Heightfield → { png, settings, values } */
export async function makeUEHeightmap(hf, { size = 'auto', sizeM } = {}) {
  const n = size === 'auto' || !size ? pickLandscapeSize(hf.nx) : +size;
  if (!UE_RECOMMENDED.includes(n)) throw new Error(`大きさ ${n} は UE の推奨（${UE_RECOMMENDED.join('・')}）ではありません`);
  if (hf.nx !== hf.nz) throw new Error('正方形の地形だけ（UE の推奨の大きさは正方形）');
  const data = resample(hf.data, hf.nx, hf.nz, n);
  let lo = Infinity, hi = -Infinity; for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (hi - lo < 0.01) hi = lo + 0.01;
  const values = new Uint16Array(n * n); for (let k = 0; k < values.length; k++) values[k] = Math.round((data[k] - lo) / (hi - lo) * 65535);
  const settings = landscapeSettings({ n, sizeM: sizeM ?? hf.sizeX, minM: lo, maxM: hi });
  return { n, png: await encodePNG16(n, n, values), values, settings, minM: lo, maxM: hi };
}

/** pcg_points.csv（UE のデータテーブル：先頭の列は行の名前）。位置は UE の cm */
export function pointsCSV(L, hf) {
  const rows = ['Name,Kind,Layer,X,Y,Z,Yaw,Scale'];
  for (const o of L.objects) { const u = objectToUE(o, { pivot: 'bottom_center' }); rows.push([o.id.replace(/[#,]/g, '_'), o.kind, o.layer, ...u.location, u.rotation.yaw, o.scale].join(',')); }
  for (const s of L.instances) {
    const v = unb64(s.data);
    for (let i = 0; i < v.length; i += 2) { const x = v[i] / 100, z = v[i + 1] / 100, p = toUE([x, hf.at(x, z), z]); rows.push([`${s.layer}_${i / 2}`, s.kind, s.layer, ...p, toUERot((i * 68.75) % 360).yaw, 1].join(',')); }
  }
  return rows.join('\n') + '\n';
}

async function main() {
  const { opt, pos } = parseArgs(process.argv.slice(2), ['points']);
  if (!pos.length) { console.log('使い方：node tools/mapkit/export_ue_heightmap.mjs <maps/<id>> [--size auto|505|1009…] [--out フォルダ] [--points]'); process.exit(2); }
  const dir = rootPath(pos[0]), lf = join(dir, 'build', 'layout.json');
  if (!existsSync(lf)) { console.log(`✗ ${rel(lf)} が無い：先に node tools/mapkit/build_map.mjs ${rel(dir)}`); process.exit(2); }
  const L = JSON.parse(readFileSync(lf, 'utf8')), reg = await registry();
  const v = validateLayoutFile(L, reg, { terrainExists: f => existsSync(join(dir, 'build', f)) });
  if (!v.valid) { console.log('✗ layout.json に誤り'); for (const e of formatErrors(v.errors).slice(0, 10)) console.log('    - ' + e); process.exit(1); }
  const T = L.terrain, tf = join(dir, 'build', T.file);
  const hf = await heightfieldFromPNG(readFileSync(tf), { size: L.size, minY: T.minY, maxY: T.maxY });
  const t0 = Date.now(), r = await makeUEHeightmap(hf, { size: opt.size || 'auto', sizeM: L.size[0] });
  const odir = opt.out ? rootPath(opt.out) : join(dir, 'build', 'ue'); mkdirSync(odir, { recursive: true });
  const pngName = `heightmap_${r.n}.png`; writeFileSync(join(odir, pngName), r.png);
  const S = r.settings;
  const json = {
    ue: 'wakaba-ue-landscape/1', map: L.map, layoutHash: L.hash,
    source: { file: rel(tf), nx: T.nx, cellM: T.cell, minY: T.minY, maxY: T.maxY, fingerprint: T.fingerprint },
    heightmap: { file: pngName, size: r.n, bits: 16, minM: +r.minM.toFixed(4), maxM: +r.maxM.toFixed(4), cellM: S.cellM, sha256: createHash('sha256').update(r.png).digest('hex') },
    landscape: {
      _note: 'UE の Landscape モード → Manage → New → Import from File で heightmap を選び、下の値を入れる（画面の項目名は版で違うことがある・未検証）',
      quadsPerSection: S.layout.quadsPerSection, sectionsPerComponent: `${S.layout.sectionsPerComponent}x${S.layout.sectionsPerComponent}`,
      components: `${S.layout.components}x${S.layout.components}`, totalComponents: S.layout.total, overallResolution: `${r.n}x${r.n}`,
      location: S.location, rotation: { roll: 0, pitch: 0, yaw: 0 }, scale: S.scale,
      worldSizeM: L.size, rangeM: S.rangeM,
    },
    conversion: {
      position: 'UE (X, Y, Z) cm ＝ layout (x, z, y) × 100（x＝東→X・z＝北→Y・y＝上→Z）',
      rotation: 'UE Yaw ＝ −rotY・Roll ＝ tilt・Pitch ＝ 0（度）',
      size: 'layout の size [幅, 高さ, 奥行] → UE の scale (幅, 奥行, 高さ)（/Engine/BasicShapes の 100cm の形の時）',
      heightmap: '画像の列＝X・行＝Y（行 0 が Y＝0）。反転しない',
      start: toUE(L.start),
    },
  };
  writeFileSync(join(odir, 'landscape.json'), JSON.stringify(json, null, 1) + '\n');
  console.log(`✓ ${rel(join(odir, pngName))}：${r.n}×${r.n}（元 ${T.nx}×${T.nz}・1 升 ${S.cellM}m）・高さ ${r.minM.toFixed(2)}〜${r.maxM.toFixed(2)}m・${(r.png.length / 1024).toFixed(0)}KB・${Date.now() - t0}ms`);
  console.log(`  UE：区画 ${json.landscape.components}（${S.layout.quadsPerSection} quads・${json.landscape.sectionsPerComponent} sections）・Scale X/Y ${S.scale.x}・Z ${S.scale.z}・Location Z ${S.location.z}cm`);
  console.log(`  書いた：${rel(join(odir, 'landscape.json'))}`);
  if (opt.points) { const csv = pointsCSV(L, hf); writeFileSync(join(odir, 'pcg_points.csv'), csv); console.log(`  書いた：${rel(join(odir, 'pcg_points.csv'))}（${csv.split('\n').length - 2} 点）`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
