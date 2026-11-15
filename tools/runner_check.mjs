// 買い出しダッシュ（通常版）を本物のブラウザで動かして、今の流れが壊れていないかを確かめる（段 1：通常版を守る試験）。
// 使い方：静的サーバーを立てて  node tools/runner_check.mjs [--base http://localhost:8000]
// 確かめる事：開く・会話とタイトルを送る・走る（進む）・跳ぶ・スライド・ぶつからずに到着 → 家の会話 → 評価 → 終わる・記録（クリア）
//            傘が折れる（転倒）→ 終わる・記録（遊んだ回数だけ増える）・エラーが出ない
// runner.js の window.__MG_TEST__（試験の時だけの入口）を使う。ふだんの遊びには関係しない。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'http://localhost:8000';
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('✓ ' + name + (info ? '  ' + info : '')); } else { fail++; console.log('✗ ' + name + (info ? '  ' + info : '')); } };

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 420, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => { window.__MG_TEST__ = {}; });
await p.goto(BASE + '/index.html'); await p.waitForTimeout(3000);
await p.mouse.click(210, 400);
const S = () => p.evaluate(() => window.__MG_TEST__.runner ? window.__MG_TEST__.runner.s : null);
const until = async (fn, ms = 20000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await p.waitForTimeout(step); } return null; };

async function openRunner() {
  await p.evaluate(async () => { gs.mgDay = {}; delete window.__MG_TEST__.runner; await MG.open('runner'); });
  await until(S, 15000);
  // 会話とタイトルを送る
  await until(async () => { const s = await S(); if (s && s.phase === 'run') return true; await p.keyboard.press('Enter'); return false; }, 30000, 250);
}

// ── 1 回目：走る・跳ぶ・スライド → 到着 → 家 → 評価 → 終わる ──
const before = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerData || { plays: 0, clears: 0 })));
await openRunner();
let s = await S();
ok('開く → 会話・タイトルを送って走り出す', s && s.phase === 'run', JSON.stringify(s && { phase: s.phase }));
await p.evaluate(() => window.__MG_TEST__.runner.god(true));
const c0 = (await S()).cam; await p.waitForTimeout(1500); const c1 = (await S()).cam;
ok('走る：前へ進む', c1 > c0 + 100, `${Math.round(c0)} → ${Math.round(c1)}`);
await p.keyboard.down('Space'); const jy = await until(async () => { const v = await S(); return v.py > 10 ? v : null; }, 1500, 30); await p.keyboard.up('Space');
ok('跳ぶ：Space で地面を離れる', !!jy, jy ? `py ${Math.round(jy.py)}` : '');
await until(async () => (await S()).onG, 2000, 30);
await p.keyboard.down('ArrowDown'); const sl = await until(async () => { const v = await S(); return v.slideT > 0 ? v : null; }, 1000, 30); await p.keyboard.up('ArrowDown');
ok('スライド：↓ で滑る', !!sl);
await p.evaluate(() => window.__MG_TEST__.runner.warp(880));
const arr = await until(async () => { const v = await S(); return v.phase === 'arrive' ? v : null; }, 15000);
ok('ぶつからずに 900m → 到着', !!arr && arr.outcome === 'clear');
const home = await until(async () => { const v = await S(); return v.phase === 'home' ? v : null; }, 12000);
ok('到着 → 家の場面', !!home);
await until(async () => { const v = await S(); if (v.phase === 'grade') return true; await p.keyboard.press('Enter'); return false; }, 30000, 300);
ok('家の会話 → 評価', (await S()).phase === 'grade');
await p.waitForTimeout(1500); await p.keyboard.press('Enter');
const ended = await until(() => p.evaluate(() => MG._ended), 15000);
ok('評価 → 終わる（本編へ結果を返す）', !!ended);
const after1 = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerData)));
ok('記録：遊んだ回数とクリアの回数が 1 つ増える・最高の評価と時間が入る', after1.plays === (before.plays | 0) + 1 && after1.clears === (before.clears | 0) + 1 && !!after1.best && after1.bestTime > 0, JSON.stringify(after1));

// ── 2 回目：傘が折れる（転倒）→ 終わる ──
await p.waitForTimeout(1500);
await openRunner();
await p.evaluate(() => window.__MG_TEST__.runner.setHp(1));
const fell = await until(async () => { const v = await S(); return v.phase === 'fall' ? v : null; }, 60000, 200);
ok('ぶつかって傘が折れる → 転倒', !!fell, fell ? `${fell.m}m` : '');
await until(async () => { const v = await S(); if (v.phase === 'grade') return true; await p.keyboard.press('Enter'); return false; }, 30000, 300);
await p.waitForTimeout(1500); await p.keyboard.press('Enter');
const ended2 = await until(() => p.evaluate(() => MG._ended), 15000);
const after2 = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerData)));
ok('転倒 → 終わる・記録：遊んだ回数だけ増える（クリアは増えない）', !!ended2 && after2.plays === after1.plays + 1 && after2.clears === after1.clears, JSON.stringify(after2));
ok('ページのエラーが出ない', errs.length === 0, JSON.stringify(errs.slice(0, 3)));

await b.close();
console.log(`\n${pass}/${pass + fail} 合格`);
process.exit(fail ? 1 : 0);
