#!/usr/bin/env node
// 地図仕様 → 地形 → 配置 → 検証 → レポート（ヘッドレス・07 §5.1 の 2・§10 の結合）。
//   node tools/mapkit/build_map.mjs maps/haison
//     書く物：maps/haison/build/layout.json（配置：エンジンに依らない JSON）・build/terrain.png（道・土台を入れた最終の 16bit 高さ）
//             maps/haison/report/report.json・report.md・map.svg（上から見た図）
//   --seed <種>（仕様の種の代わりに：別の配置を試す）・--dry（書かない）・--preset low|mid|high|ultra（予算を見る段・既定 low）
// 高さマップ（terrain.source.file）が無ければ手続きの地形（fallback）で作る（注意を出す）。
// 終了コード：0＝自動の検査が全部通った／1＝落ちた項目あり（レポートは書く）／2＝仕様の誤り
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { formatErrors } from '../../mapkit/core/schema.js';
import { validateSpec } from '../../mapkit/core/spec.js';
import { heightfieldFromPNG } from '../../mapkit/terrain/heightmap.js';
import { buildLayout } from '../../mapkit/pcg/layout.js';
import { validateLayout, goalRoutes } from '../../mapkit/pcg/validate.js';
import { makeReport, validateReport, reportToMarkdown } from '../../mapkit/report/report.js';
import { topViewSVG } from '../../mapkit/report/topview.js';
import { RULES } from '../../mapkit/pcg/rules.js';
import { registry, rootPath, rel, parseArgs, compactJSON } from '../../mapkit/core/node.mjs';

const { opt, pos } = parseArgs(process.argv.slice(2), ['dry']);
if (!pos.length) { console.log('使い方：node tools/mapkit/build_map.mjs <maps/<id>> [--seed 種] [--dry] [--preset low]'); process.exit(2); }
const dir = rootPath(pos[0]), specFile = join(dir, 'map.spec.json'), specText = readFileSync(specFile, 'utf8'), spec = JSON.parse(specText);
const reg = await registry(), t0 = Date.now();
const sv = validateSpec(spec, reg, { fileExists: f => existsSync(join(dir, f)) });
for (const w of formatErrors(sv.warnings)) console.log('  · 注意 ' + w);
if (!sv.valid) { console.log('✗ 地図仕様に誤り'); for (const e of formatErrors(sv.errors)) console.log('    - ' + e); process.exit(2); }
// 1. 地形（高さマップ or fallback）
const src = spec.terrain.source || {}, hmFile = src.file ? join(dir, src.file) : null;
let raw = null;
if (src.type === 'heightmap' && hmFile && existsSync(hmFile)) raw = await heightfieldFromPNG(readFileSync(hmFile), { size: [spec.size.w, spec.size.d], minY: src.minY ?? 0, maxY: src.maxY ?? 60 });
else console.log(`  · 高さマップ ${src.file || '(なし)'} が無い：手続きの地形（fallback）で作る（node tools/mapkit/gen_heightmap.mjs ${rel(dir)} で PNG にできる）`);
// 2〜8. 配置 → 検証（届かない時は種を変えてやり直す：最大 RULES.retries 回）
// 目録（web の門が pass の素材）：使う素材の id → 名前。無ければ全部が仮の形
const catFile = rootPath('wakaba-assets/catalog.json'), catalog = existsSync(catFile) ? JSON.parse(readFileSync(catFile, 'utf8')) : { entries: [] };
const webOk = Object.fromEntries((catalog.entries || []).filter(e => e.targets && e.targets.web && e.targets.web.result === 'pass').map(e => [e.id, e.name && e.name.ja || e.id]));
let seed = opt.seed || spec.seed, built, val, tries = [];
for (let n = 0; n <= RULES.retries; n++) {
  const s = n ? `${opt.seed || spec.seed}#retry${n}` : seed;
  built = buildLayout(spec, raw, { seed: s, catalog: webOk });
  val = validateLayout(built.layout, built.hf, { spec, preset: opt.preset || 'low' });
  tries.push({ seed: s, reach: val.auto.reach.pass, keepOut: val.auto.keepOut.pass });
  seed = s; if (val.auto.reach.pass && val.auto.keepOut.pass) break;
}
// 決まった結果か（同じ種でもう一度作って指紋を比べる）
const again = buildLayout(spec, raw, { seed, catalog: webOk });
const L = built.layout, A = val.auto;
A.deterministic = { pass: again.layout.hash === L.hash, hash: L.hash, terrain: L.terrain.fingerprint };
// 使う素材（物の kind・下草・建物の部品・材質）が目録にあれば web の門の結果を見る。目録に無い物は仮の形（灰色の箱）で描く＝門の対象外
const used = [...new Set([...L.objects.map(o => o.kind), ...L.instances.map(i => i.kind)])];
const inCat = new Map((catalog.entries || []).map(e => [e.id, e]));
const blocked = used.filter(k => inCat.has(k) && !webOk[k]).map(k => ({ id: k, reasons: inCat.get(k).targets.web.reasons }));
const realKinds = used.filter(k => webOk[k]), standins = used.filter(k => !inCat.has(k));
A.license = { pass: blocked.length === 0, blocked, note: `物の種類 ${used.length} のうち ${realKinds.length} が目録の素材（web の門 pass・自作＝license own・verifiedBy は人の確認待ち）・仮の形 ${standins.length}${standins.length ? '（' + standins.join('・') + '）' : ''}。材質と建物の部品も目録（node tools/mapkit/catalog.mjs）` };
A.perf = { device: 'node（ヘッドレス）', fps: null, note: '実機で測る（mapkit.html?perf=1）。play_map.mjs が swiftshader の描画呼び出しを測る' };
// レポート
const specHash = 'sha256:' + createHash('sha256').update(specText).digest('hex');
const rep = makeReport({ map: spec.id, seed, specHash });
Object.assign(rep.auto, A);
const enter = L.buildings.filter(b => b.enterable), doorsReached = L.goals.filter(g => g.kind === 'door' && A.reach.goals[g.id] != null);
const C = (text, pass, evidence) => rep.conditions.push({ text, check: 'auto', pass: !!pass, evidence });
C('霧がある', (spec.atmosphere?.fog?.density || 0) > 0, `atmosphere.fog.density=${spec.atmosphere?.fog?.density}`);
C('夕暮れ（仕様の値）', spec.atmosphere?.time === 'dusk', `atmosphere.time=${spec.atmosphere?.time}・sunElevDeg=${spec.atmosphere?.sunElevDeg}`);
C('入れる家が 2 軒以上（中の全部屋に届く）', enter.length >= 2 && A.interiors.pass, `${enter.map(b => b.id).join(',')}・部屋 ${A.interiors.rooms.length}`);
C('家の入口 3 つ以上へ歩いて届く（坂 35° 以下・段差 0.4m 以下）', doorsReached.length >= 3, doorsReached.map(g => `${g.id} ${A.reach.goals[g.id]}m`).join('・'));
C('祠へ歩いて届く', L.goals.some(g => /^shrine\./.test(g.id) && A.reach.goals[g.id] != null), `shrine.front ${A.reach.goals['shrine.front']}m（石段 5 段）`);
C('崖がある（傾き 45° 超の升目）', L.stats.cliffCells > 50, `${L.stats.cliffCells} 升目`);
C('森（木 300 本以上）', (L.stats.counts.trees || 0) >= 300, `木 ${L.stats.counts.trees}・岩 ${L.stats.counts.rocks}・下草 ${L.stats.instances.grass || 0}`);
C('入口の前・道・目的地に物が 0 個', A.keepOut.pass && A.entrances.pass, `違反 ${A.keepOut.violations.length}＋${A.entrances.violations.length}`);
C('浮き・めり込み・重なりが 0 件', A.float.pass && A.overlap.pass, `浮き ${A.float.counts.float}・めり込み ${A.float.counts.penetrate}・重なり ${A.overlap.count}`);
C('同じ種で同じ配置', A.deterministic.pass, L.hash);
const H = (text, evidence) => rep.conditions.push({ text, check: 'human', pass: null, evidence });
H('夕暮れと霧の雰囲気が出ている', 'play_map の画面撮影（village・shrine）');
H('山の廃村に見える（フェーズ 3：写実寄りの材質・部品・光）', 'play_map の撮影（village・house・interior・forest）と before_after.png');
H('自作の素材（目録の license own）の中身を人が確かめた（meta.json の verifiedBy を書く）', 'wakaba-assets/entries/*/*/meta.json・docs/wakaba-mapkit/11');
H('森の密度・木の並びが自然', 'forest の撮影・report/map.svg');
H('歩いて探索できる（迷わない・引っかからない）', '利用者が mapkit.html?map=haison を歩く');
rep.gaps = built.gaps;
if (realKindsCount(L, webOk)) rep.gaps.push(
  { need: 'web.compression', plan: 'テクスチャは WebP・glb は圧縮なし（KTX2・Meshopt の符号器がクラウドで使えないため）。利用者の PC か CI で KTX2（toktx/basisu）・gltfpack（Meshopt）にすると、読み込み ≈40% 減の見込み（docs/wakaba-mapkit/11 §6）', status: 'proposed' },
  { need: 'license.verifiedBy', plan: '自作の素材（tools/mapkit/matgen・tools/blender/kit で生成）は門で注意（UNVERIFIED_GENERATED）。人が中身を見て meta.json の verifiedBy を書く（AI は書かない）', status: 'proposed' },
  { need: 'ue5.kit', plan: '同じ部品の FBX（source/・Git の外）と ue5/import.json の雛形は作った。UE5 の画面での取り込み・Nanite・材質の組み直しは未検証（利用者の PC）', status: 'proposed' }); rep.fixes = [...built.notes, ...(val.auto ? [] : [])];
for (const f of (val.fixes || [])) rep.fixes.push(f);
if (tries.length > 1) rep.fixes.push({ issue: `配置をやり直した（${tries.length - 1} 回）`, proposal: tries.map(t => `${t.seed}: reach=${t.reach}`).join('・'), auto: true });
const rv = validateReport(rep, reg);
const allPass = Object.entries(rep.auto).every(([k, v]) => k === 'perf' || v.pass !== false);
console.log(`${allPass ? '✓' : '✗'} ${spec.id}：種 ${seed}・${L.hash}・地形 ${L.terrain.source}（${L.terrain.fingerprint}）・${Date.now() - t0}ms`);
for (const [k, v] of Object.entries(rep.auto)) if (k !== 'perf') console.log(`    ${v.pass === true ? '✓' : v.pass === false ? '✗' : '·'} ${k}`);
console.log(`    物：${JSON.stringify(L.stats.counts)}・下草 ${L.stats.instances.grass || 0}・目的地 ${JSON.stringify(A.reach.goals)}`);
if (!rv.valid) { console.log('✗ レポートが形に合わない'); for (const e of formatErrors(rv.errors)) console.log('    - ' + e); }
if (!opt.dry) {
  const bdir = join(dir, 'build'), rdir = join(dir, 'report'); mkdirSync(bdir, { recursive: true }); mkdirSync(rdir, { recursive: true });
  writeFileSync(join(bdir, 'layout.json'), compactJSON(Object.assign({ builtFrom: { spec: rel(specFile), specHash, heightmap: raw ? rel(hmFile) : null } }, L)));
  writeFileSync(join(bdir, 'terrain.png'), await built.hf.toPNG16());
  writeFileSync(join(rdir, 'report.json'), compactJSON(rep));
  writeFileSync(join(rdir, 'report.md'), reportToMarkdown(rep));
  writeFileSync(join(rdir, 'map.svg'), await topViewSVG(L, built.hf, { routes: goalRoutes(val.grid, L), title: spec.title.ja }));
  console.log(`  書いた：${rel(join(bdir, 'layout.json'))}・${rel(join(bdir, 'terrain.png'))}・${rel(join(rdir, 'report.json'))}・report.md・map.svg`);
}
process.exit(allPass && rv.valid ? 0 : 1);
function realKindsCount(L, ok) { return L.objects.filter(o => ok[o.kind]).length; }
