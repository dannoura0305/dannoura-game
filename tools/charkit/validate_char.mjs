#!/usr/bin/env node
// キャラクターの設定（<id>.character.json）を検査する。モデル（.vrm／.glb／.gltf）を渡すと骨も照らす。
//   node tools/charkit/validate_char.mjs shinshoku/assets/characters/dannoura.character.json
//   node tools/charkit/validate_char.mjs <character.json> --model tests/fixtures/charkit_test.gltf [--form purple] [--require-recommended]
//   --project shinshoku（門の条件）／--strict-gate（ライセンス門で block なら終了コード 1。既定は表示だけ：verifiedBy は人が書くため）
// 終了コード：0 = 通った（注意は出るだけ）／1 = 誤りあり
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatErrors } from '../../mapkit/core/schema.js';
import { registry, rootPath, rel, parseArgs, loadConfig } from '../../mapkit/core/node.mjs';
import { makeContext, evaluateCharacter } from '../../mapkit/assets/gate.js';
import { validateCharacter, checkModelBones } from '../../charkit/core/validate.js';
import { readGltfJson, boneNames, vrmHumanBones } from '../../charkit/core/gltf.js';

const { opt, pos } = parseArgs(process.argv.slice(2), ['strict-gate', 'require-recommended']);
if (!pos.length) { console.log('使い方：node tools/charkit/validate_char.mjs <character.json> [--model <.vrm|.glb|.gltf>] [--form <姿>] [--strict-gate]'); process.exit(2); }
const reg = await registry();
const f = rootPath(pos[0]); const cfg = JSON.parse(readFileSync(f, 'utf8'));
let bad = 0;
const r = validateCharacter(cfg, reg, { fileExists: x => existsSync(join(dirname(f), x)) });
console.log(`${r.valid ? '✓' : '✗'} ${rel(f)}（キャラクターの設定 ${cfg.id || ''}・${(cfg.body || {}).sex || '?'}・${(cfg.body || {}).heightM || '?'}m）`);
for (const e of formatErrors(r.errors)) console.log('    - 誤り ' + e);
for (const w of formatErrors(r.warnings)) console.log('    · 注意 ' + w);
if (!r.valid) bad++;

if (opt.model) {
  const mf = rootPath(opt.model); const json = readGltfJson(readFileSync(mf));
  const names = boneNames(json); const human = vrmHumanBones(json);
  const m = checkModelBones(names, r.valid ? cfg : null, { map: human || {}, form: opt.form, requireRecommended: !!opt['require-recommended'] });
  console.log(`${m.valid ? '✓' : '✗'} モデル ${rel(mf)}：骨 ${names.length} 本・標準骨格の対応 ${Object.keys(m.found).length} 本・指 ${m.fingers}/${m.fingersTotal}・ext_/socket_ ${m.ext.length} 本${human ? '・VRM の humanoid の表あり' : ''}`);
  for (const e of formatErrors(m.errors)) console.log('    - 誤り ' + e);
  for (const w of formatErrors(m.warnings)) console.log('    · 注意 ' + w);
  if (!m.valid) bad++;
}

const ctx = makeContext(loadConfig(), opt.project || cfg.project || 'shinshoku');
const g = evaluateCharacter(cfg, ctx);
console.log(`${g.result === 'pass' ? '✓' : '△'} ライセンス門：${g.result}${g.result === 'block' ? '（作品に入れる前に人が license を確かめる）' : ''}`);
for (const x of g.reasons) console.log(`    - [${x.code}] ${x.msg}`);
if (g.result === 'block' && opt['strict-gate']) bad++;
process.exit(bad ? 1 : 0);
