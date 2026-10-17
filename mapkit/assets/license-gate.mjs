#!/usr/bin/env node
// ライセンス門の CLI（node）。素材・モーション・撮影の元・キャラクターの設定の JSON をスキーマで検査し、門（gate.js）に通す。
//   node mapkit/assets/license-gate.mjs                         … 素材ライブラリ（wakaba.config.json の assetLibrary.entries）全部＋作品が使う物
//   node mapkit/assets/license-gate.mjs <file|dir>...           … 指定したファイル・フォルダだけ
//   node mapkit/assets/license-gate.mjs --uses                  … 作品が使うと書いた物（projects.<id>.uses）だけ。1 つでも block なら終了コード 1（CI 用）
// 選択：--project shinshoku（既定）／--target web|ue5|all（既定は作品の最初の配信先。all＝全部の配信先を順に：どれかで block なら 1）／--stage production|dev（既定 production）
//       --out license-gate.json（結果の JSON を書く）／--credits credits.json（表記が要る物の表）／--report-only（block があっても 0 で終わる）
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validate } from '../core/schema.js';
import { IDS, detectKind } from '../core/schemas.js';
import { ROOT, rootPath, rel, registry, loadConfig, listJson, parseArgs } from '../core/node.mjs';
import { makeContext, evaluate, evaluateCharacter, summarize, RULES } from './gate.js';

/** 1 つのファイルを検査して門に通す */
export function gateOne(data, ctx, reg, file = null) {
  const kind = detectKind(data);
  const schemaId = kind === 'character' ? IDS.character : kind === 'anim' ? IDS.anim : IDS.asset;
  const v = validate(schemaId, data, { registry: reg });
  const r = kind === 'character' ? evaluateCharacter(data, ctx, { schemaErrors: v.errors }) : evaluate(data, ctx, { schemaErrors: v.errors });
  return Object.assign({ file }, r, { kind: kind || 'asset' });
}

/** 作品が使う物（projects.<id>.uses）を解決して門に通す */
export function gateUses(config, projectId, ctx, reg) {
  const uses = ((config.projects || {})[projectId] || {}).uses || {};
  const lib = config.assetLibrary || {};
  const index = new Map();
  for (const f of listJson(lib.entries || 'wakaba-assets/entries')) { try { const d = JSON.parse(readFileSync(f, 'utf8')); if (d && d.id && ['asset', 'anim', 'character'].includes(detectKind(d)) && !index.has(d.id)) index.set(d.id, f); } catch (e) { /* 壊れた JSON は全体の走査で出る */ } }
  const out = [];
  for (const key of ['assets', 'animations', 'characters']) {
    for (const ref of uses[key] || []) {
      const f = index.get(ref) || (/\.json$/.test(ref) ? rootPath(ref) : null);
      let data = null; try { data = f && JSON.parse(readFileSync(f, 'utf8')); } catch (e) { data = null; }
      if (!data) { out.push({ id: ref, file: f && rel(f), kind: key, result: 'block', reasons: [{ code: 'MISSING', msg: RULES.MISSING }], warnings: [], credits: null }); continue; }
      out.push(gateOne(data, ctx, reg, rel(f)));
    }
  }
  return out;
}

async function main() {
  const { opt, pos } = parseArgs(process.argv.slice(2), ['uses', 'report-only']);
  const config = loadConfig();
  const projectId = opt.project || 'shinshoku';
  if (opt.target === 'all') {
    const ids = (((config.projects || {})[projectId] || {}).targets || [{ id: 'web' }]).map(t => t.id);
    let bad = 0;
    for (const id of ids) {
      const args = process.argv.slice(2).map(a => a === 'all' ? id : a);   // --out・--credits は配信先ごとに上書きされるので、使う時は --target を 1 つずつ
      const r = spawnSync(process.execPath, [process.argv[1], ...args], { stdio: 'inherit' });
      if (r.status) bad++;
    }
    process.exit(bad && !opt['report-only'] ? 1 : 0);
  }
  const ctx = makeContext(config, projectId, { target: opt.target, stage: opt.stage || 'production' });
  const reg = await registry();
  let results = []; const skipped = [];
  if (opt.uses) results = gateUses(config, projectId, ctx, reg);
  else {
    const inputs = pos.length ? pos : [(config.assetLibrary || {}).entries || 'wakaba-assets/entries'];
    for (const p of inputs) for (const f of listJson(p)) {
      let data; try { data = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { results.push({ id: null, file: rel(f), result: 'block', reasons: [{ code: 'SCHEMA', msg: 'JSON として読めない：' + e.message }], warnings: [], credits: null }); continue; }
      const kind = detectKind(data);
      if (['mapSpec', 'mapReport', 'mapLayout', 'assetSources', 'ue5Import'].includes(kind) || kind === null && !(data && data.license)) { skipped.push(rel(f)); continue; }   // 素材でない JSON（地図仕様・レポートなど）は門の対象外
      results.push(gateOne(data, ctx, reg, rel(f)));
    }
    if (!pos.length) results.push(...gateUses(config, projectId, ctx, reg));
  }
  const rep = summarize(results, ctx);
  console.log(`ライセンス門：作品 ${ctx.project}・配信先 ${ctx.target.id}（${ctx.target.engine}${ctx.target.public ? '・公開' : ''}）・商用 ${ctx.commercial ? 'あり（未定を含む）' : 'なし'}・段 ${ctx.stage}`);
  for (const r of results) {
    console.log(`${r.result === 'pass' ? '✓ pass ' : '✗ block'} ${r.id || '(id なし)'}  ${r.file || ''}`);
    for (const x of r.reasons) console.log(`    - [${x.code}] ${x.msg}`);
    for (const x of r.warnings) console.log(`    · 注意 [${x.code}] ${x.msg}`);
    if (r.credits) console.log(`    · 表記：${r.credits.text}`);
  }
  if (skipped.length) console.log(`（素材のメタデータでない ${skipped.length} 件は対象外：${skipped.join('・')}）`);
  console.log(`計 ${rep.summary.total} 件：pass ${rep.summary.pass}・block ${rep.summary.block}${results.length ? '' : '（対象なし）'}`);
  if (opt.out) writeFileSync(rootPath(opt.out), JSON.stringify(rep, null, 1) + '\n');
  if (opt.credits) writeFileSync(rootPath(opt.credits), JSON.stringify({ credits: rep.credits }, null, 1) + '\n');
  process.exit(rep.summary.block && !opt['report-only'] ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
export { ROOT };
