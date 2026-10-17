#!/usr/bin/env node
// 検証マップを実際に歩く（Playwright・ソフト描画）。07 §10 の通しプレイ・06 フェーズ 2 の「Playwright で実際に歩いて目的地に着く」。
// 使い方：python3 -m http.server 8797 --directory <repo> を起動してから
//   node tools/mapkit/play_map.mjs [出力フォルダ] [--map haison] [--base http://localhost:8797] [--only pc|phone] [--no-report]
// PC（1280×800・段 high）とスマホ（844×390・タッチ・段 low）で：道案内（距離の場）に沿って、操作（当たり・坂・段差）で全ての目的地へ歩き、
// 着いたかを確かめる。ページの誤り 0・描画呼び出し（スマホ ≤ 120）・画面撮影（上空・村・家の中・祠・山道と崖・森・スマホ）と一覧（overview.png）。
// 結果は maps/<id>/report/play.json に書き、report.json の budget・perf を測った値で更新する（--no-report で書かない）。
// 環境変数：PW_MODULE（playwright の index.mjs）、PW_CHROMIUM（chromium の実行ファイル）
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rootPath, registry, compactJSON, parseArgs } from '../../mapkit/core/node.mjs';
import { validateReport, reportToMarkdown } from '../../mapkit/report/report.js';
import { MAP_PRESETS } from '../../mapkit/render/quality.js';

const { opt, pos } = parseArgs(process.argv.slice(2), ['no-report']);
const OUT = resolve(pos[0] || 'mapkit_shots'), MAP = opt.map || 'haison', BASE = (opt.base || 'http://localhost:8797').replace(/\/$/, ''), ONLY = opt.only || null;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
mkdirSync(OUT, { recursive: true });
const results = [], shots = [], ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`); };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(ctxOpt, query) {
  const ctx = await browser.newContext(ctxOpt), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const t0 = Date.now(); await page.goto(`${BASE}/mapkit.html?map=${MAP}&perf=1&${query}`);
  await page.waitForFunction(() => window.__mk && __mk.ready, null, { timeout: 120000, polling: 100 });
  return { ctx, page, errs, loadMs: Date.now() - t0 };
}
async function shot(page, name, label) { await page.evaluate(() => __mk.render()); await page.waitForTimeout(700); await page.screenshot({ path: join(OUT, name) }); shots.push({ name, label }); }
const pose = (page, p) => page.evaluate(p => __mk.pose(p), p);
const ground = (page, x, z) => page.evaluate(([x, z]) => __mk.ground(x, z), [x, z]);

async function walkAll(page, tag, onArrive) {
  const goals = await page.evaluate(() => __mk.layout.goals.map(g => g.id)), enter = await page.evaluate(() => __mk.layout.buildings.filter(b => b.enterable).map(b => b.id));
  let total = 0;
  for (const g of goals) {
    const r = await page.evaluate(id => __mk.walkTo(id), g);
    const st = await page.evaluate(() => __mk.state());
    total = st.moved;
    ok(`${tag}：歩いて「${g}」に着く`, r.ok && st.reached.includes(g), `${(r.steps / 60).toFixed(1)}s（ゲームの時間）・歩いた ${st.moved.toFixed(0)}m${r.stuck ? '・引っかかり ' + r.stuck.toFixed(1) + 's' : ''}${enter.includes(st.building) ? '・' + st.building + ' の中' : ''}`);
    if (onArrive) await onArrive(g, st);
  }
  return total;
}

const report = { map: MAP, at: new Date().toISOString(), device: 'swiftshader（ソフト描画・fps は参考にならない）' };
// ── PC
if (!ONLY || ONLY === 'pc') {
  const { ctx, page, errs, loadMs } = await open({ viewport: { width: 1280, height: 800 } }, 'preset=high');
  ok('PC：読み込み → 操作できる', true, `${loadMs}ms`);
  await page.evaluate(() => __mk.render()); await page.waitForTimeout(500);
  let st = await page.evaluate(() => __mk.state()); const start = st.drawCalls;
  await shot(page, 'pc_start.png', 'スタート（三人称・夕暮れと霧・道案内の線と柱）');
  const calls = [start];
  await walkAll(page, 'PC', async (g, s) => {
    calls.push((await page.evaluate(() => __mk.render())).drawCalls);
    if (g === 'h1.center') { await page.evaluate(() => { __mk.first(true); __mk.look(__mk.state().yaw + Math.PI, 0.05); }); await shot(page, 'pc_interior.png', '家の中（h1 の和室から土間・入口を見る・一人称）'); await page.evaluate(() => __mk.first(false)); }
    if (g === 'shrine.front') { const s2 = await page.evaluate(() => __mk.state()); await page.evaluate(y => __mk.look(y, 0.2), s2.yaw + Math.PI); await shot(page, 'pc_shrine_back.png', '祠の前から参道を見下ろす'); }
  });
  st = await page.evaluate(() => __mk.state());
  ok('PC：全ての目的地に着いた', st.done, st.reached.join('・'));
  // 決まった視点
  const sh = await page.evaluate(() => { const b = __mk.layout.buildings.find(b => b.kind === 'hokora_small'); return b; });
  const gy = await ground(page, 160, 156);
  await pose(page, { pos: [sh.at[0] + 3, gy + 2.2, sh.at[2] - 17], look: [sh.at[0], sh.at[1] + 1.5, sh.at[2]] }); await shot(page, 'pc_shrine.png', '祠（鳥居・石段・基壇）');
  await page.evaluate(() => __mk.hud(false));
  const vy = await ground(page, 122, 100);
  await pose(page, { pos: [132, vy + 7, 98], look: [114, vy + 1, 120] }); await shot(page, 'pc_village.png', '村（廃屋・小物・山道）');
  const c0 = await ground(page, 88, 180), c1 = await ground(page, 84, 200);
  await pose(page, { pos: [92, c0 + 2.2, 176], look: [82, c1 - 2, 200] }); await shot(page, 'pc_cliff.png', `崖（下 ${c0.toFixed(0)}m → 上 ${c1.toFixed(0)}m・坂 40° 超は見えない壁）`);
  const pp = await page.evaluate(() => __mk.layout.paths[0].points), a0 = pp[30], a1 = pp[55];
  await pose(page, { pos: [a0[0], a0[1] + 2.2, a0[2]], look: [a1[0], a1[1] + 1, a1[2]] }); await shot(page, 'pc_path.png', '山道（スタートから村へ）');
  const fs = await page.evaluate(() => __mk.forestSpot()), fy = await ground(page, fs.at[0], fs.at[2] - 9);
  await pose(page, { pos: [fs.at[0], fy + 1.7, fs.at[2] - 9], look: [fs.at[0], fy + 3, fs.at[2] + 6] }); await shot(page, 'pc_forest.png', `森（木の多い所・14m 以内に ${fs.n} 本）`);
  await page.evaluate(() => __mk.fog(false)); await pose(page, { pos: [40, 150, 20], look: [128, 10, 128] }); await shot(page, 'pc_aerial.png', '上空（霧なし：全体の配置）'); await page.evaluate(() => __mk.fog(true));
  await page.evaluate(() => { __mk.pose(null); __mk.hud(true); });
  const info = await page.evaluate(() => __mk.info());
  report.pc = { preset: 'high', loadMs, drawCalls: { max: Math.max(...calls), start }, tris: st.tris, info, errors: errs };
  ok('PC：描画呼び出し ≤ 250（high）', Math.max(...calls) <= MAP_PRESETS.high.drawCalls, `最大 ${Math.max(...calls)}・三角形 ${(st.tris / 1000).toFixed(0)}k`);
  ok('PC：ページの誤り 0', errs.length === 0, errs.slice(0, 3).join(' / '));
  await ctx.close();
}
// ── スマホ（横向き・タッチ）
if (!ONLY || ONLY === 'phone') {
  const { ctx, page, errs, loadMs } = await open({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, '');
  const preset = await page.evaluate(() => __mk.preset);
  ok('スマホ：自動の段が「低」', preset === 'low', `${preset}・読み込み ${loadMs}ms`);
  const hasTouch = await page.evaluate(() => !!document.querySelector('#mk-touch .mk-stick'));
  ok('スマホ：タッチの操作（円・ボタン）が出る', hasTouch);
  // タッチの円で少し歩く（本物のタッチの出来事）
  const s0 = await page.evaluate(() => __mk.state());
  const cdp = await ctx.newCDPSession(page);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await tp('touchStart', 110, 300); for (let i = 1; i <= 6; i++) { await tp('touchMove', 110, 300 - i * 10); await page.waitForTimeout(16); }
  await page.waitForTimeout(1500); await tp('touchEnd');
  const s1 = await page.evaluate(() => __mk.state());
  ok('スマホ：タッチの円で前へ歩ける', s1.moved - s0.moved > 1, `${(s1.moved - s0.moved).toFixed(1)}m`);
  const calls = [];
  await walkAll(page, 'スマホ', async g => { calls.push((await page.evaluate(() => __mk.render())).drawCalls); if (g === 'h2.door') await shot(page, 'phone_village.png', 'スマホ（低）：村'); });
  const st = await page.evaluate(() => __mk.state());
  ok('スマホ：全ての目的地に着いた', st.done);
  await page.evaluate(() => __mk.look(__mk.state().yaw + Math.PI, 0.25)); await shot(page, 'phone_shrine.png', 'スマホ（低）：祠の前');
  const mx = Math.max(...calls);
  ok('スマホ：描画呼び出し ≤ 120（low）', mx <= MAP_PRESETS.low.drawCalls, `最大 ${mx}・三角形 ${(st.tris / 1000).toFixed(0)}k`);
  ok('スマホ：ページの誤り 0', errs.length === 0, errs.slice(0, 3).join(' / '));
  report.phone = { preset, loadMs, drawCalls: { max: mx }, tris: st.tris, errors: errs };
  await ctx.close();
}
// ── 一覧の画像
if (shots.length) {
  const html = `<html><body style="margin:0;background:#111;color:#eee;font:14px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px;width:1908px">${shots.map(s => `<figure style="margin:0"><img src="${pathToFileURL(join(OUT, s.name)).href}" style="width:100%;display:block"><figcaption style="padding:2px 4px">${s.name}：${s.label}</figcaption></figure>`).join('')}</body></html>`;
  const f = join(OUT, 'overview.html'); writeFileSync(f, html);
  const p = await (await browser.newContext({ viewport: { width: 1920, height: 1000 } })).newPage(); await p.goto(pathToFileURL(f).href); await p.waitForTimeout(600);
  await p.screenshot({ path: join(OUT, 'overview.png'), fullPage: true });
}
await browser.close();
const fail = results.filter(r => !r.pass).length;
report.results = results; report.shots = shots.map(s => s.name);
if (!opt['no-report'] && !ONLY) {
  const rd = rootPath(`maps/${MAP}/report`); mkdirSync(rd, { recursive: true });
  writeFileSync(join(rd, 'play.json'), compactJSON(report));
  const rf = join(rd, 'report.json');
  if (existsSync(rf)) {
    const rep = JSON.parse(readFileSync(rf, 'utf8'));
    if (report.phone) rep.auto.budget = { pass: report.phone.drawCalls.max <= MAP_PRESETS.low.drawCalls && report.phone.tris <= MAP_PRESETS.low.tris, preset: 'low', drawCalls: report.phone.drawCalls.max, tris: report.phone.tris, texMB: 1, source: 'measured（play_map.mjs・スマホ 844×390）' };
    rep.auto.perf = { device: 'swiftshader', fps: null, note: `fps は実機で測る（mapkit.html?perf=1）。PC high：描画 ${report.pc ? report.pc.drawCalls.max : '-'}・三角形 ${report.pc ? report.pc.tris : '-'}` };
    rep.conditions = rep.conditions.filter(c => !/Playwright/.test(c.text));
    rep.conditions.push({ text: 'Playwright で実際に歩いて全ての目的地に着く（PC・スマホ）', check: 'auto', pass: fail === 0, evidence: `report/play.json：${results.length - fail}/${results.length}` });
    const v = validateReport(rep, await registry());
    if (v.valid) { writeFileSync(rf, compactJSON(rep)); writeFileSync(join(rd, 'report.md'), reportToMarkdown(rep)); } else console.log('✗ report.json が形に合わない：', v.errors);
  }
}
console.log(`\n${results.length - fail}/${results.length} 合格${fail ? '（失敗あり）' : ''}`);
process.exit(fail ? 1 : 0);
