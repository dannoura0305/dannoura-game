#!/usr/bin/env node
// 骨の名前の対応表（charkit/rig/bonemap.js の PROFILES）を、Blender のスクリプト・UE の手作業で使う JSON に書き出す。
//   node tools/charkit/export_bonemap.mjs                  … tools/blender/bonemap_vrm_to_ue5.json（VRM → UE5 マネキン）
//   --from vrm --to ue5 --out <file>・--check（書かずに、今のファイルが最新かだけ：古ければ 1）
// 表の正本は bonemap.js（試験つき）。JSON は生成物なので手で直さない。tools/blender/vrm_to_fbx.md の手順で使う。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { profileTable } from '../../charkit/rig/rename.js';
import { rootPath, rel, parseArgs } from '../../mapkit/core/node.mjs';

const { opt } = parseArgs(process.argv.slice(2), ['check']);
const from = opt.from || 'vrm', to = opt.to || 'ue5';
const out = rootPath(opt.out || `tools/blender/bonemap_${from}_to_${to}.json`);
const t = profileTable(from, to);
const text = JSON.stringify({ bonemap: 'wakaba-bonemap/1', _note: `生成物（node tools/charkit/export_bonemap.mjs --from ${from} --to ${to}）。正本は charkit/rig/bonemap.js。名前を揃えても骨の数は同じにならない：足りない骨は UE の IK Retargeter のチェーンで合わせる（docs/wakaba-charkit/04 §6）`, ...t }, null, 1) + '\n';
if (opt.check) { const ok = existsSync(out) && readFileSync(out, 'utf8') === text; console.log(ok ? `✓ ${rel(out)} は最新` : `✗ ${rel(out)} が古い`); process.exit(ok ? 0 : 1); }
writeFileSync(out, text);
console.log(`✓ ${rel(out)}：${Object.keys(t.bones).length} 本・${to} に無い ${t.noTarget.length} 本（${t.noTarget.join('・')}）`);
