#!/usr/bin/env node
// 地図仕様（map.spec.json）・検証レポート（report.json）を検査する。
//   node tools/mapkit/validate_spec.mjs maps/haison/map.spec.json
//   node tools/mapkit/validate_spec.mjs maps/haison/report/report.json      … レポートも（形と「人が見る項目に pass を書かない」約束）
//   --md out.md（レポートの時：人が読む md を書く）
// 終了コード：0 = 通った（注意は出るだけ）／1 = 誤りあり
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatErrors } from '../../mapkit/core/schema.js';
import { detectKind } from '../../mapkit/core/schemas.js';
import { validateSpec } from '../../mapkit/core/spec.js';
import { validateReport, reportToMarkdown } from '../../mapkit/report/report.js';
import { registry, rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

const { opt, pos } = parseArgs(process.argv.slice(2));
if (!pos.length) { console.log('使い方：node tools/mapkit/validate_spec.mjs <map.spec.json|report.json>... [--md out.md]'); process.exit(2); }
const reg = await registry();
let bad = 0;
for (const p of pos) {
  const f = rootPath(p); const d = JSON.parse(readFileSync(f, 'utf8'));
  const kind = detectKind(d);
  let r;
  if (kind === 'mapSpec') r = validateSpec(d, reg, { fileExists: x => existsSync(join(dirname(f), x)) });
  else if (kind === 'mapReport') { r = validateReport(d, reg); if (opt.md) writeFileSync(rootPath(opt.md), reportToMarkdown(d)); }
  else { console.log(`✗ ${rel(f)}：地図仕様（spec: wakaba-map/1）でもレポート（report: wakaba-map-report/1）でもありません`); bad++; continue; }
  console.log(`${r.valid ? '✓' : '✗'} ${rel(f)}（${kind === 'mapSpec' ? '地図仕様' : 'レポート'}）`);
  for (const e of formatErrors(r.errors)) console.log('    - 誤り ' + e);
  for (const w of formatErrors(r.warnings)) console.log('    · 注意 ' + w);
  if (!r.valid) bad++;
}
process.exit(bad ? 1 : 0);
