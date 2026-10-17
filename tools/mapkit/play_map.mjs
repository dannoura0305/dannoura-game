#!/usr/bin/env node
// 検証マップを実際に歩く（Playwright・ソフト描画）。07 §10 の通しプレイ・06 フェーズ 2 の「Playwright で実際に歩いて目的地に着く」。
// 使い方：python3 -m http.server 8797 --directory <repo> を起動してから
//   node tools/mapkit/play_map.mjs [出力フォルダ] [--map haison] [--base http://localhost:8797] [--only pc|phone] [--no-report]
// PC（1280×800・段 high）とスマホ（844×390・タッチ・段 low）で：道案内（距離の場）に沿って、操作（当たり・坂・段差）で全ての目的地へ歩き、
// 着いたかを確かめる。ページの誤り 0・描画呼び出し（スマホ ≤ 120）・画面撮影（上空・村・家の中・祠・山道と崖・森・スマホ）と一覧（overview.png）。
// 結果は maps/<id>/report/play.json に書き、report.json の budget・perf を測った値で更新する（--no-report で書かない）。
// フェーズ 3：起動の時間（操作できるまで）・GPU のテクスチャの量（見積もり）・段ごと（ultra／high／mid／low）の描画呼び出し・三角形を同じ視点（村）で測る（--no-presets で省く）。
// フェーズ 4：戸（閉じた戸で止まる → E で開ける → 家に入る）・一時停止の画面・音（WebAudio）・敵（?enemy=1：見つかる → 走って逃げる／捕まる → 暗転してチェックポイントへ）・
//   敵ありで全ての目的地（捕まったらチェックポイントから続ける）。PC の通しは敵なし（enemy=0）と敵あり（enemy=1）の両方。スマホは敵あり（既定）で「開」のボタンも押す。
// 環境変数：PW_MODULE（playwright の index.mjs）、PW_CHROMIUM（chromium の実行ファイル）
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rootPath, registry, compactJSON, parseArgs } from '../../mapkit/core/node.mjs';
import { validateReport, reportToMarkdown } from '../../mapkit/report/report.js';
import { MAP_PRESETS } from '../../mapkit/render/quality.js';

const { opt, pos } = parseArgs(process.argv.slice(2), ['no-report', 'no-presets']);
const OUT = resolve(pos[0] || 'mapkit_shots'), MAP = opt.map || 'haison', BASE = (opt.base || 'http://localhost:8797').replace(/\/$/, ''), ONLY = opt.only || null;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
mkdirSync(OUT, { recursive: true });
const results = [], shots = [], ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`); };
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });

async function open(ctxOpt, query) {
  const ctx = await browser.newContext(ctxOpt), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const t0 = Date.now(); await page.goto(`${BASE}/mapkit.html?map=${MAP}&perf=1&${query}`);
  await page.waitForFunction(() => window.__mk && __mk.ready, null, { timeout: 120000, polling: 100 });
  return { ctx, page, errs, loadMs: Date.now() - t0 };
}
// ソフト描画（swiftshader）では写実の段の 1 フレームが数秒かかるので、撮影の待ちを長くする（実機では 16ms 前後の見込み・未計測）
async function shot(page, name, label) { await page.evaluate(() => __mk.render()); await page.waitForTimeout(700); await page.screenshot({ path: join(OUT, name), timeout: 180000 }); shots.push({ name, label }); }
const pose = (page, p) => page.evaluate(p => __mk.pose(p), p);
const ground = (page, x, z) => page.evaluate(([x, z]) => __mk.ground(x, z), [x, z]);

async function walkAll(page, tag, onArrive) {
  const goals = await page.evaluate(() => __mk.layout.goals.map(g => g.id)), enter = await page.evaluate(() => __mk.layout.buildings.filter(b => b.enterable).map(b => b.id));
  let total = 0;
  for (const g of goals) {
    // 敵ありの時は捕まってもチェックポイントから続ける（最大 4 回やり直す）
    let r = null; for (let k = 0; k < 4; k++) { r = await page.evaluate(id => __mk.walkTo(id), g); if (r.ok) break; }
    const st = await page.evaluate(() => __mk.state());
    total = st.moved;
    ok(`${tag}：歩いて「${g}」に着く`, r.ok && st.reached.includes(g), `${(r.steps / 60).toFixed(1)}s（ゲームの時間）・歩いた ${st.moved.toFixed(0)}m${r.stuck ? '・引っかかり ' + r.stuck.toFixed(1) + 's' : ''}${enter.includes(st.building) ? '・' + st.building + ' の中' : ''}${r.opened && r.opened.length ? '・開けた戸 ' + r.opened.join(',') : ''}${st.caught ? '・捕まった累計 ' + st.caught : ''}`);
    if (onArrive) await onArrive(g, st);
  }
  return total;
}

const report = { map: MAP, at: new Date().toISOString(), device: 'swiftshader（ソフト描画・fps は参考にならない）' };
// ── PC
if (!ONLY || ONLY === 'pc') {
  const { ctx, page, errs, loadMs } = await open({ viewport: { width: 1280, height: 800 } }, 'preset=high&enemy=0');
  ok('PC：読み込み → 操作できる（敵なし enemy=0）', await page.evaluate(() => !__mk.enemyOn), `${loadMs}ms`);
  await page.evaluate(() => __mk.render()); await page.waitForTimeout(500);
  let st = await page.evaluate(() => __mk.state()); const start = st.drawCalls;
  await shot(page, 'pc_start.png', 'スタート（三人称・夕暮れと霧・道案内の線と柱）');
  // 戸：h4 の玄関（閉じている）の前 → 押しても入れない → E で開ける → 中へ → 中から閉める
  {
    const d = await page.evaluate(() => __mk.layout.gameplay.doors.find(x => x.id === 'h4.door'));
    const r = d.rotY * Math.PI / 180, fx = Math.sin(r), fz = Math.cos(r);
    await page.evaluate(([x, z]) => __mk.teleport(x, z), [d.at[0] + fx * 1.4, d.at[2] + fz * 1.4]);
    await page.evaluate(([x, z]) => __mk.look(Math.atan2(-x, -z), 0.15), [fx, fz]);
    const pr = await page.evaluate(() => { __mk.render(); return __mk.state().prompt; });
    ok('PC：戸の近くで案内が出る（E：引き戸を開ける）', /E：引き戸を開ける/.test(pr || ''), String(pr));
    await page.evaluate(() => __mk.hud(true)); await shot(page, 'pc_door_closed.png', '閉じた玄関の引き戸（h4）と案内「E：引き戸を開ける」');
    const push = await page.evaluate(([x, z]) => __mk.move(-x, -z, 120), [fx, fz]);
    ok('PC：閉じた戸は通れない（当たり）', push.moved < 1.4 && push.building !== 'h4', `押して ${push.moved.toFixed(2)}m`);
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => __mk.state().doors.find(d => d.id === 'h4.door').target === 1, null, { timeout: 120000 });
    await page.evaluate(() => __mk.fastSim(60));
    const open1 = await page.evaluate(() => __mk.state().doors.find(d => d.id === 'h4.door'));
    ok('PC：E キーで戸が開く', open1.open === 1, JSON.stringify(open1));
    await shot(page, 'pc_door_open.png', '開いた引き戸（戸袋の側へ寄る）');
    const inn = await page.evaluate(([x, z]) => __mk.move(-x, -z, 150), [fx, fz]);
    ok('PC：開けた戸から家に入れる', inn.building === 'h4', `${inn.moved.toFixed(1)}m・${inn.building}`);
    const cl = await page.evaluate(([x, z]) => { __mk.move(-x, -z, 30); const r = __mk.door('h4.door', false); return { r, d: __mk.state().doors.find(d => d.id === 'h4.door') }; }, [fx, fz]);
    ok('PC：中から戸を閉められる（挟まる時は閉まらない）', cl.d.open === 0, JSON.stringify(cl));
    const out = await page.evaluate(([x, z]) => { const a = __mk.move(x, z, 200); const nd = __mk.nearDoor(); __mk.interact(); const b = __mk.move(x, z, 120); return { a: +a.moved.toFixed(2), inA: a.building, nd: nd && nd.id, b: +b.moved.toFixed(2), building: b.building }; }, [fx, fz]);
    ok('PC：閉めた戸は中からも止まり、開ければ出られる', out.inA === 'h4' && out.a < 7.5 && out.nd === 'h4.door' && out.building !== 'h4', `${JSON.stringify(out)}（200 ステップ＝止まらなければ 8m）`);
    // 一時停止（Esc）・再開
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const pz = await page.evaluate(() => [__mk.state().paused, __mk.pausedUI()]);
    await page.evaluate(() => document.querySelector('#mk-resume').click()); const pz2 = await page.evaluate(() => [__mk.state().paused, __mk.pausedUI()]);
    ok('PC：Esc で一時停止の画面 → 再開', pz[0] && pz[1] && !pz2[0] && !pz2[1], JSON.stringify([pz, pz2]));
    const au = await page.evaluate(() => __mk.startAudio());
    ok('PC：音（WebAudio・ファイルなし）が動く', au && au.state === 'running', JSON.stringify(au));
    await page.evaluate(() => __mk.restart());
    // 参道の木戸（閉じている）
    const g = await page.evaluate(() => __mk.layout.gameplay.doors.find(x => x.kind === 'hinged')), gr = g.rotY * Math.PI / 180;
    await page.evaluate(() => __mk.hud(false));
    await pose(page, { pos: [g.at[0] - Math.sin(gr) * 4.5 + Math.cos(gr) * 1.2, g.at[1] + 1.7, g.at[2] - Math.cos(gr) * 4.5 - Math.sin(gr) * 1.2], look: [g.at[0], g.at[1] + 0.8, g.at[2]] });
    await shot(page, 'pc_gate.png', '参道の木戸（開き戸・閉じている）と柵');
    await page.evaluate(() => { __mk.pose(null); __mk.hud(true); });
  }
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
  report.pc = { preset: 'high', loadMs, bootMs: info.bootMs, texMB: info.texMB, drawCalls: { max: Math.max(...calls), start }, tris: st.tris, info, errors: errs };
  ok('PC：読み込みの失敗 0（素材・目録）', !info.assets || info.assets.failed.length === 0, info.assets ? `テクスチャ ${info.assets.textures}・部品 ${info.assets.kits}・GPU のテクスチャ ${info.texMB}MB` : '');
  ok('PC：テクスチャの量 ≤ 800MB（high）', info.texMB <= MAP_PRESETS.high.texMB, `${info.texMB}MB`);
  ok('PC：描画呼び出し ≤ 250（high）', Math.max(...calls) <= MAP_PRESETS.high.drawCalls, `最大 ${Math.max(...calls)}・三角形 ${(st.tris / 1000).toFixed(0)}k`);
  ok('PC：ページの誤り 0', errs.length === 0, errs.slice(0, 3).join(' / '));
  await ctx.close();
}
// ── PC・敵あり（enemy=1）：巡回 → 見つかる → 走って逃げる（灯りを消す）／捕まる → 暗転してチェックポイント → 敵ありで全ての目的地
if (!ONLY || ONLY === 'pc' || ONLY === 'enemy') {
  const { ctx, page, errs, loadMs } = await open({ viewport: { width: 1280, height: 800 } }, 'preset=high&enemy=1');
  ok('PC 敵：読み込み（enemy=1）・敵がいる', await page.evaluate(() => __mk.enemyOn), `${loadMs}ms`);
  const e0 = await page.evaluate(() => __mk.state().enemy);
  await page.evaluate(() => __mk.fastSim(60 * 20));
  const e1 = await page.evaluate(() => __mk.state().enemy);
  ok('PC 敵：巡回で動く（20 秒）', e1.state === 'patrol' && Math.hypot(e1.pos[0] - e0.pos[0], e1.pos[2] - e0.pos[2]) > 8, `${e0.pos.map(Math.round)} → ${e1.pos.map(Math.round)}`);
  // 見つかる → 逃げる（山道を下る・灯りを消す）
  const ch = await page.evaluate(() => {
    __mk.teleport(105, 89); __mk.light(true); __mk.look(Math.atan2(114 - 105, 95 - 89), 0.1); __mk.enemyAt(114, 95);
    __mk.fastSim(45); const seen = __mk.enemyState(); __mk.light(false);
    const f = __mk.fleeTo(52, 46, 60 * 22); __mk.fastSim(60 * 8); return { seen, f, after: __mk.enemyState(), st: __mk.state() };
  });
  ok('PC 敵：見つかると追ってくる（格子の A*）', ch.seen.state === 'chase', `${ch.seen.state}・${ch.seen.dist.toFixed(1)}m`);
  // 追われている所の撮影（三人称・敵の方を見る）
  await page.evaluate(() => { __mk.restart(); __mk.teleport(105, 89); __mk.light(true); __mk.enemyAt(113, 94); __mk.look(Math.atan2(113 - 105, 94 - 89), 0.05); __mk.fastSim(70); });
  await shot(page, 'pc_chase.png', `追われる（赤い縁・心臓の音）：敵 ${(await page.evaluate(() => __mk.enemyState().state))}`);
  await page.evaluate(() => __mk.restart());
  ok('PC 敵：走って逃げ切れる（灯りを消すと見失う）', ch.f.caught === 0 && ch.after.state !== 'chase' && ch.st.caught === 0, `距離の変化 ${ch.f.log.map(l => l[1]).filter((_, i) => i % 4 === 0).join('→')}m・その後 ${ch.after.state}`);
  // 捕まる → 暗転 → チェックポイント（村の入口）へ戻る
  const cg = await page.evaluate(() => {
    __mk.teleport(126, 102); __mk.fastSim(10); const cp = __mk.checkpoints().last;
    __mk.teleport(124, 104); __mk.light(true); __mk.enemyAt(127, 106);
    const c0 = __mk.state().caught; let k = 0, mid = null; while (k < 60 * 8 && __mk.state().caught === c0) { __mk.fastSim(1); k++; }
    for (let i = 0; i < 40; i++) __mk.fastSim(1); mid = getComputedStyle(document.querySelector('#mk-fade')).opacity;
    __mk.fastSim(90); const s = __mk.state(); const at = __mk.layout.gameplay.checkpoints.find(c => c.id === cp).at;
    return { cp, caught: s.caught - c0, t: k / 60, mid, fade: getComputedStyle(document.querySelector('#mk-fade')).opacity, d: Math.hypot(s.pos[0] - at[0], s.pos[2] - at[2]), e: __mk.enemyState() };
  });
  ok('PC 敵：捕まる → 暗転 → チェックポイントから', cg.caught === 1 && +cg.mid > 0.5 && +cg.fade === 0 && cg.d < 1.5 && cg.e.dist > 10, `${cg.t.toFixed(1)}s で捕まる・暗転 ${(+cg.mid).toFixed(2)}・戻り先 ${cg.cp}（${cg.d.toFixed(2)}m）・敵は ${cg.e.dist.toFixed(0)}m 先へ`);
  // 敵の撮影（近く・夕暮れ）
  await page.evaluate(() => { __mk.restart(); __mk.enemyAt(131, 113, false); });
  const ep = await page.evaluate(() => __mk.state().enemy.pos);
  await page.evaluate(() => __mk.hud(false));
  await pose(page, { pos: [ep[0] + 2.2, ep[1] + 1.5, ep[2] + 3.4], look: [ep[0], ep[1] + 1.6, ep[2]] }); await shot(page, 'pc_enemy.png', '敵（自作の「異形」・試作）：村の道で');
  await page.evaluate(() => { __mk.pose(null); __mk.hud(true); __mk.restart(); });
  // 敵ありで全ての目的地へ
  const calls = [];
  await walkAll(page, 'PC 敵あり', async () => { calls.push((await page.evaluate(() => __mk.render())).drawCalls); });
  const st = await page.evaluate(() => __mk.state());
  ok('PC 敵あり：全ての目的地に着いた（捕まったらチェックポイントから）', st.done, `捕まった ${st.caught} 回・見つかった ${st.spotted} 回`);
  ok('PC 敵あり：描画呼び出し ≤ 250（high）', Math.max(...calls) <= MAP_PRESETS.high.drawCalls, `最大 ${Math.max(...calls)}`);
  ok('PC 敵あり：ページの誤り 0', errs.length === 0, errs.slice(0, 3).join(' / '));
  report.pcEnemy = { caught: st.caught, spotted: st.spotted, drawCalls: Math.max(...calls), chase: ch.f.log, errors: errs };
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
  // 戸の近くで「開」のボタン → 押すと開く（h1 の玄関）
  {
    const d = await page.evaluate(() => __mk.layout.gameplay.doors.find(x => x.id === 'h1.door')), r = d.rotY * Math.PI / 180;
    await page.evaluate(([x, z]) => { __mk.teleport(x, z); __mk.fastSim(2); __mk.render(); }, [d.at[0] + Math.sin(r) * 1.2, d.at[2] + Math.cos(r) * 1.2]);
    await page.waitForFunction(() => !document.querySelector('.mk-use').hidden, null, { timeout: 120000 }).catch(() => {});
    const vis = await page.evaluate(() => !document.querySelector('.mk-use').hidden);
    await page.evaluate(([x, z]) => __mk.look(Math.atan2(-x, -z), 0.2), [Math.sin(r), Math.cos(r)]); await shot(page, 'phone_door.png', 'スマホ（低）：戸の前の「開」のボタン');
    const bb = await page.evaluate(() => { const r = document.querySelector('.mk-use').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await tp('touchStart', bb[0], bb[1]); await tp('touchEnd');
    await page.waitForFunction(() => __mk.state().doors.find(x => x.id === 'h1.door').target === 1, null, { timeout: 120000 }).catch(() => {});
    const o = await page.evaluate(() => __mk.state().doors.find(x => x.id === 'h1.door'));
    ok('スマホ：戸の近くで「開」のボタンが出て、押すと開く', vis && o.target === 1, JSON.stringify({ vis, o }));
    await page.evaluate(() => __mk.restart());
  }
  const calls = [];
  await walkAll(page, 'スマホ', async g => { calls.push((await page.evaluate(() => __mk.render())).drawCalls); if (g === 'h2.door') await shot(page, 'phone_village.png', 'スマホ（低）：村'); });
  const st = await page.evaluate(() => __mk.state());
  ok('スマホ：全ての目的地に着いた', st.done);
  await page.evaluate(() => __mk.look(__mk.state().yaw + Math.PI, 0.25)); await shot(page, 'phone_shrine.png', 'スマホ（低）：祠の前');
  const mx = Math.max(...calls);
  ok('スマホ：描画呼び出し ≤ 120（low）', mx <= MAP_PRESETS.low.drawCalls, `最大 ${mx}・三角形 ${(st.tris / 1000).toFixed(0)}k`);
  ok('スマホ：ページの誤り 0', errs.length === 0, errs.slice(0, 3).join(' / '));
  const pinfo = await page.evaluate(() => __mk.info());
  ok('スマホ：テクスチャの量 ≤ 150MB（low）', pinfo.texMB <= MAP_PRESETS.low.texMB, `${pinfo.texMB}MB・起動 ${pinfo.bootMs}ms`);
  report.phone = { preset, loadMs, bootMs: pinfo.bootMs, texMB: pinfo.texMB, drawCalls: { max: mx }, tris: st.tris, errors: errs };
  await ctx.close();
}
// ── 段ごとの量（同じ視点：村を上から）
if (!ONLY && !opt['no-presets']) {
  report.presets = {};
  for (const pk of ['ultra', 'high', 'mid', 'low']) {
    const { ctx, page, loadMs } = await open({ viewport: { width: 1280, height: 800 } }, `preset=${pk}`);
    const vy = await ground(page, 122, 100); await pose(page, { pos: [132, vy + 7, 98], look: [114, vy + 1, 120] });
    const r = await page.evaluate(() => __mk.render()), inf = await page.evaluate(() => __mk.info());
    report.presets[pk] = { drawCalls: r.drawCalls, sceneCalls: r.sceneCalls, tris: r.tris, texMB: inf.texMB, bootMs: inf.bootMs, loadMs, programs: inf.programs };
    console.log(`  · ${pk}：描画 ${r.drawCalls}（場面 ${r.sceneCalls}）・三角形 ${(r.tris / 1000).toFixed(0)}k・テクスチャ ${inf.texMB}MB・起動 ${inf.bootMs}ms`);
    await ctx.close();
  }
  for (const pk of ['ultra', 'high', 'mid', 'low']) { const m = report.presets[pk], P = MAP_PRESETS[pk]; ok(`段 ${pk}：描画・三角形・テクスチャが上限の中（村の視点）`, m.drawCalls <= P.drawCalls && m.tris <= P.tris && m.texMB <= P.texMB, `${m.drawCalls}/${P.drawCalls}・${(m.tris / 1000).toFixed(0)}k/${P.tris / 1000}k・${m.texMB}/${P.texMB}MB`); }
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
    if (report.phone) rep.auto.budget = { pass: report.phone.drawCalls.max <= MAP_PRESETS.low.drawCalls && report.phone.tris <= MAP_PRESETS.low.tris && report.phone.texMB <= MAP_PRESETS.low.texMB, preset: 'low', drawCalls: report.phone.drawCalls.max, tris: report.phone.tris, texMB: report.phone.texMB, source: 'measured（play_map.mjs・スマホ 844×390・テクスチャは辺×4B×4/3 の見積もり）' };
    const ps = report.presets ? Object.entries(report.presets).map(([k, m]) => `${k} 描画 ${m.drawCalls}・三角形 ${Math.round(m.tris / 1000)}k・テクスチャ ${m.texMB}MB`).join('／') : '';
    rep.auto.perf = { device: 'swiftshader', fps: null, note: `fps は実機で測る（mapkit.html?perf=1）。起動（操作できるまで）PC high ${report.pc ? report.pc.bootMs : '-'}ms・スマホ low ${report.phone ? report.phone.bootMs : '-'}ms（ソフト描画）。PC high：描画 ${report.pc ? report.pc.drawCalls.max : '-'}・三角形 ${report.pc ? report.pc.tris : '-'}。段ごと（村の視点）：${ps}` };
    rep.conditions = rep.conditions.filter(c => !/Playwright/.test(c.text));
    rep.conditions.push({ text: 'Playwright で実際に歩いて全ての目的地に着く（PC・スマホ）', check: 'auto', pass: fail === 0, evidence: `report/play.json：${results.length - fail}/${results.length}` });
    const v = validateReport(rep, await registry());
    if (v.valid) { writeFileSync(rf, compactJSON(rep)); writeFileSync(join(rd, 'report.md'), reportToMarkdown(rep)); } else console.log('✗ report.json が形に合わない：', v.errors);
  }
}
console.log(`\n${results.length - fail}/${results.length} 合格${fail ? '（失敗あり）' : ''}`);
process.exit(fail ? 1 : 0);
