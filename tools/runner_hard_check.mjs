// 買い出しダッシュ 高難易度版（試作）を本物のブラウザで動かして確かめる（段 3）。
// 使い方：静的サーバーを立てて  node tools/runner_hard_check.mjs [--base http://localhost:8000] [--shots <フォルダ>]
// 確かめる事：印が無いと選択画面に出ない・印（?runnerhard=1）があると出る・開く → 説明 → 遊ぶ・右へ進む・跳ぶ・ダッシュ・
//            ゲームパッドで動く・途中の印・コンビニの戸で着く → 終わる・記録（gs.runnerHard.proto）・エラーなし。横長と縦長の画面を撮る
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'http://localhost:8000', SHOTS = arg('--shots');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('✓ ' + name + (info ? '  ' + info : '')); } else { fail++; console.log('✗ ' + name + (info ? '  ' + info : '')); } };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

// 印が無い時は出ない
{
  const p = await b.newPage(); await p.goto(BASE + '/index.html'); await p.waitForTimeout(2500);
  ok('印が無い時：選択画面の一覧に出ない', await p.evaluate(() => !MINIGAMES.some(m => m.id === 'runner_hard')));
  await p.close();
}

for (const [label, vw, vh] of [['横長', 960, 540], ['縦長', 420, 800]]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__MG_TEST__ = {};
    // 試験用のゲームパッド（右を押す）
    window.__padR = false;
    navigator.getGamepads = () => [window.__padR ? { buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [1, 0] } : null];
  });
  await p.goto(BASE + '/index.html?runnerhard=1'); await p.waitForTimeout(2500);
  await p.mouse.click(vw / 2, vh / 2);
  if (label === '横長') ok('印がある時：アクションの欄に出る', await p.evaluate(() => MINIGAMES.some(m => m.id === 'runner_hard') && MG_CATS.find(c => c.id === 'action').ids.includes('runner_hard')));
  const S = () => p.evaluate(() => window.__MG_TEST__.runnerHard ? window.__MG_TEST__.runnerHard.s : null);
  const until = async (fn, ms = 15000, step = 80) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await p.waitForTimeout(step); } return null; };
  await p.evaluate(async () => { gs.mgDay = {}; await MG.open('runner_hard'); });
  const intro = await until(async () => { const s = await S(); return s && s.phase === 'intro' ? s : null; });
  ok(`${label}：開く → 自機の動き（act.js）を読み込んで説明の画面`, !!intro);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_intro.png` });
  await p.waitForTimeout(700); await p.keyboard.press('z'); await p.waitForTimeout(300);   // 説明の画面は出てから 0.4 秒は進まない（誤操作よけ）
  let s = await S(); ok(`${label}：Z で遊び始める`, s.phase === 'play');
  const x0 = s.x; await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.keyboard.up('ArrowRight');
  s = await S(); ok(`${label}：→ で右へ歩く`, s.x > x0 + 80, `${Math.round(x0)} → ${Math.round(s.x)}`);
  await p.keyboard.down('z'); const jy = await until(async () => { const v = await S(); return v.state === 'jump' && v.y > 120 ? v : null; }, 1500, 20); await p.keyboard.up('z');
  ok(`${label}：Z で跳ぶ`, !!jy);
  await until(async () => ['stand', 'land', 'walk'].includes((await S()).state), 3000, 30);
  await p.keyboard.down('c'); const ds = await until(async () => { const v = await S(); return v.state === 'dash' ? v : null; }, 1000, 15); await p.keyboard.up('c');
  ok(`${label}：C でダッシュ`, !!ds);
  const x1 = (await S()).x; await p.evaluate(() => { window.__padR = true; }); await p.waitForTimeout(600); await p.evaluate(() => { window.__padR = false; });
  ok(`${label}：ゲームパッド（左スティック右）で動く`, (await S()).x > x1 + 60);
  if (SHOTS) { await p.waitForTimeout(200); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_play.png` }); }
  // 途中の印 → 戸の手前へ
  const g = (await S()).goal;
  await p.evaluate(() => { const r = window.__MG_TEST__.runnerHard; r.warp(42 * 40 + 20, 90); });
  await p.waitForTimeout(500);
  ok(`${label}：途中の印に触れる`, (await S()).checks.some(Boolean));
  await p.evaluate(gx => window.__MG_TEST__.runnerHard.warp(gx - 140, 90), g.x);
  await p.waitForTimeout(400);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_goal.png` });
  await p.keyboard.down('ArrowRight'); const cl = await until(async () => { const v = await S(); return v.phase === 'clear' ? v : null; }, 5000, 30); await p.keyboard.up('ArrowRight');
  ok(`${label}：コンビニの戸で着く`, !!cl && cl.outcome === 'clear');
  await p.waitForTimeout(1800); await p.keyboard.press('Enter');
  const ended = await until(() => p.evaluate(() => MG._ended), 8000);
  const rec = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerHard)));
  ok(`${label}：終わる・記録（gs.runnerHard.proto：遊んだ・着いた・時間）・通常版の記録には触らない`, !!ended && rec.proto.plays >= 1 && rec.proto.clears >= 1 && rec.proto.bestTime > 0, JSON.stringify(rec.proto));
  ok(`${label}：ページのエラーが出ない`, errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await p.close();
}
await b.close();
console.log(`\n${pass}/${pass + fail} 合格`);
process.exit(fail ? 1 : 0);
