#!/usr/bin/env node
// モーションのメタデータ（meta.json）を検査する：スキーマ（素材メタデータ v1.1＋anim）・こまの印・点数の式・戦闘の数字との照合・ライセンス門。
//   node tools/charkit/validate_anim.mjs tests/fixtures/wakaba/anim/anim.cmb_katana_light_1.meta.json
//   node tools/charkit/validate_anim.mjs wakaba-assets/entries/animation           … フォルダの中を全部
//   --project shinshoku／--target web／--stage production|dev／--strict-gate（門で block なら終了コード 1）
// combatRef.file（例 shinshoku/data/combat.js）はリポジトリの根から読み込み、path（例 COMBAT.katana.light[0]）の数字と比べる。
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { formatErrors } from '../../mapkit/core/schema.js';
import { registry, rootPath, rel, parseArgs, loadConfig, listJson } from '../../mapkit/core/node.mjs';
import { makeContext, evaluate } from '../../mapkit/assets/gate.js';
import { validateAnim } from '../../charkit/core/validate.js';
import { validate } from '../../mapkit/core/schema.js';
import { IDS } from '../../mapkit/core/schemas.js';

const { opt, pos } = parseArgs(process.argv.slice(2), ['strict-gate']);
if (!pos.length) { console.log('使い方：node tools/charkit/validate_anim.mjs <meta.json|フォルダ>... [--strict-gate]'); process.exit(2); }
const reg = await registry();
const ctx = makeContext(loadConfig(), opt.project || 'shinshoku', { target: opt.target, stage: opt.stage || 'production' });
const combatMods = {};
let bad = 0;
for (const f of pos.flatMap(p => listJson(p))) {
  const meta = JSON.parse(readFileSync(f, 'utf8'));
  let r;
  if (meta.category === 'animation') {
    const file = meta.anim && meta.anim.combatRef && meta.anim.combatRef.file;
    if (file && !(file in combatMods) && existsSync(rootPath(file))) combatMods[file] = await import(pathToFileURL(rootPath(file)).href);
    r = validateAnim(meta, reg, { combat: combatMods });
  } else { const v = validate(IDS.asset, meta, { registry: reg }); r = { valid: v.valid, errors: v.errors, warnings: [] }; }
  console.log(`${r.valid ? '✓' : '✗'} ${meta.id || '(id なし)'}  ${rel(f)}`);
  for (const e of formatErrors(r.errors)) console.log('    - 誤り ' + e);
  for (const w of formatErrors(r.warnings)) console.log('    · 注意 ' + w);
  if (r.combat) console.log(`    · 戦闘のこま：${r.combat.ok ? '一致' : 'ずれ'}（hitStart ${r.combat.actual.hitStart}/${r.combat.expected.hitStart}・hitEnd ${r.combat.actual.hitEnd}/${r.combat.expected.hitEnd}・全長 ${r.combat.actual.total}/${r.combat.expected.total}、伸縮 ${r.combat.fit.scales.map(s => s.toFixed(2)).join('・')}）`);
  if (!r.valid) bad++;
  const g = evaluate(meta, ctx);
  console.log(`    ${g.result === 'pass' ? '✓' : '△'} ライセンス門（${ctx.target.id}・${ctx.stage}）：${g.result}`);
  for (const x of g.reasons) console.log(`        - [${x.code}] ${x.msg}`);
  if (g.result === 'block' && opt['strict-gate']) bad++;
}
process.exit(bad ? 1 : 0);
