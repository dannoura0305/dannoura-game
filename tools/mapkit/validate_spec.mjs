#!/usr/bin/env node
// 地図仕様（map.spec.json）・検証レポート（report.json）・配置（build/layout.json）を検査する。
//   node tools/mapkit/validate_spec.mjs maps/haison/map.spec.json
//   node tools/mapkit/validate_spec.mjs maps/haison/report/report.json      … レポートも（形と「人が見る項目に pass を書かない」約束）
//   node tools/mapkit/validate_spec.mjs maps/haison/build/layout.json        … 配置も（形＋指紋・id の重複・範囲・高さの PNG の有無。Blender・UE5 へ渡す前に）
//   --md out.md（レポートの時：人が読む md を書く）
// 終了コード：0 = 通った（注意は出るだけ）／1 = 誤りあり
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatErrors } from '../../mapkit/core/schema.js';
import { detectKind } from '../../mapkit/core/schemas.js';
import { validateSpec } from '../../mapkit/core/spec.js';
import { validateReport, reportToMarkdown } from '../../mapkit/report/report.js';
import { validateLayoutFile } from '../../mapkit/core/layoutfile.js';
import { registry, rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

const { opt, pos } = parseArgs(process.argv.slice(2));
if (!pos.length) { console.log('使い方：node tools/mapkit/validate_spec.mjs <map.spec.json|report.json|layout.json>... [--md out.md]'); process.exit(2); }
const reg = await registry();
let bad = 0;
for (const p of pos) {
  const f = rootPath(p); const d = JSON.parse(readFileSync(f, 'utf8'));
  const kind = detectKind(d);
  let r;
  if (kind === 'mapSpec') r = validateSpec(d, reg, { fileExists: x => existsSync(join(dirname(f), x)) });
  else if (kind === 'mapReport') { r = validateReport(d, reg); if (opt.md) writeFileSync(rootPath(opt.md), reportToMarkdown(d)); }
  else if (kind === 'mapLayout') r = validateLayoutFile(d, reg, { terrainExists: x => existsSync(join(dirname(f), x)) });
  else { console.log(`✗ ${rel(f)}：地図仕様（spec: wakaba-map/1）・レポート（report: wakaba-map-report/1）・配置（layout: wakaba-map-layout/1）のどれでもありません`); bad++; continue; }
  console.log(`${r.valid ? '✓' : '✗'} ${rel(f)}（${{ mapSpec: '地図仕様', mapReport: 'レポート', mapLayout: '配置' }[kind]}）${r.counts ? `：建物 ${r.counts.buildings}・部品 ${r.counts.parts}・物 ${r.counts.objects}・下草 ${r.counts.instances}・印 ${r.counts.anchors}` : ''}`);
  for (const e of formatErrors(r.errors)) console.log('    - 誤り ' + e);
  for (const w of formatErrors(r.warnings)) console.log('    · 注意 ' + w);
  if (!r.valid) bad++;
}
process.exit(bad ? 1 : 0);
