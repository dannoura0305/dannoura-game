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

// 「試作を遊ぶ」ボタン：印がある時だけ画面の隅に出て、押すとすぐ始まる
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__MG_TEST__ = {}; });
  await p.goto(BASE + '/index.html?runnerhard=1'); await p.waitForTimeout(2500);
  const has = await p.$('#mg-proto-btn'); ok('印がある時：画面の隅に「試作を遊ぶ」ボタンが出る', !!has);
  if (has) { await p.click('#mg-proto-btn'); const t0 = Date.now(); let ph = null; while (Date.now() - t0 < 15000) { ph = await p.evaluate(() => window.__MG_TEST__.runnerHard && window.__MG_TEST__.runnerHard.s.phase); if (ph === 'intro') break; await p.waitForTimeout(100); } ok('ボタンを押すと試作がすぐ始まる（タイトル画面からでも）', ph === 'intro', String(ph)); }
  ok('ボタンの場面でエラーが出ない', errs.length === 0, JSON.stringify(errs.slice(0, 2)));
  const p2 = await b.newPage(); await p2.goto(BASE + '/index.html'); await p2.waitForTimeout(2000); ok('印が無い時：ボタンは出ない', !(await p2.$('#mg-proto-btn'))); await p2.close();
  await p.close();
}

// 入口（印なし）：通常版をクリアする前は一覧に出ない → 1 回クリアすると出る・難しさ・本編への結果・1 日 1 回
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__MG_TEST__ = {}; });
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(2500); await p.mouse.click(480, 270);
  const listed = () => p.evaluate(() => { openMinigamePicker('night'); const ids = minigamesIn('night').map(d => d.id); closeMinigamePicker(); return ids.includes('runner_hard'); });
  await p.evaluate(() => { gs.runnerData = { plays: 0, clears: 0 }; });
  ok('入口：通常版をクリアする前は、夜の🎮の一覧に出ない', !(await listed()));
  await p.evaluate(() => { gs.runnerData = { plays: 1, clears: 1 }; });
  ok('入口：通常版を 1 回クリアすると、アクションの欄に出る', await listed() && await p.evaluate(() => MG_CATS.find(c => c.id === 'action').ids.includes('runner_hard')));
  ok('入口：印が無い時は「試作を遊ぶ」ボタンは出ない', !(await p.$('#mg-proto-btn')));
  // 難しさ：むずかしい＝傘の耐久 4・やさしい＝7
  for (const [d, want] of [['hard', 4], ['easy', 7]]) {
    await p.evaluate(d => { localStorage.setItem(MG_DIFF_KEY, d); gs.mgDay = {}; delete gs.runnerHard; }, d);
    await p.evaluate(() => MG.open('runner_hard'));
    const v = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const s = await p.evaluate(() => window.__MG_TEST__.runnerHard && window.__MG_TEST__.runnerHard.s); if (s && s.phase === 'intro') return s; await p.waitForTimeout(100); } return null; })();
    ok(`難しさ（${d}）：傘の耐久 ${want}`, v && v.hp === want, JSON.stringify(v && v.hp));
    if (d === 'hard') {
      // 着いて終わる → 本編へ結果（育児ストレス↓・疲労↑）・1 日 1 回
      const before = await p.evaluate(() => ({ cs: gs.childStress, fa: gs.fatigue }));
      await p.waitForTimeout(600); await p.keyboard.press('z'); await p.waitForTimeout(600); await p.keyboard.press('z'); await p.waitForTimeout(300);
      const g = v.goal; await p.evaluate(() => { const r = window.__MG_TEST__.runnerHard; r.bossHp(0); }); 
      await p.evaluate(gx => window.__MG_TEST__.runnerHard.warp(gx - 60, 90), g.x); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight');
      const st = await p.evaluate(() => window.__MG_TEST__.runnerHard.s.phase);
      await p.waitForTimeout(1800); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
      const after = await p.evaluate(() => ({ cs: gs.childStress, fa: gs.fatigue, day: gs.mgDay.runner_hard === gs.day, ended: MG._ended }));
      ok('着く → 本編へ結果（育児ストレスが下がる・疲労が上がる）・その日はもう遊べない', st === 'clear' && after.ended && after.fa > before.fa && after.cs <= before.cs && after.day, JSON.stringify({ st, before, after }));
    } else { await p.evaluate(() => MG.end('quit')); await p.waitForTimeout(800); }
  }
  await p.evaluate(() => localStorage.removeItem(MG_DIFF_KEY));
  ok('入口の場面でエラーが出ない', errs.length === 0, JSON.stringify(errs.slice(0, 2)));
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
  await p.evaluate(async () => { gs.mgDay = {}; delete gs.runnerHard; await MG.open('runner_hard'); });
  const intro = await until(async () => { const s = await S(); return s && s.phase === 'intro' ? s : null; });
  ok(`${label}：開く → 自機の動き（act.js）を読み込んで説明の画面`, !!intro);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_intro.png` });
  await p.waitForTimeout(700); await p.keyboard.press('z'); await p.waitForTimeout(400);   // 説明の画面は出てから 0.4 秒は進まない（誤操作よけ）
  let s = await S(); ok(`${label}：Z → ボス選択の画面（表から並べる・仮のボス 1 体）`, s.phase === 'select');
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_select.png` });
  await p.waitForTimeout(500); await p.keyboard.press('z'); await p.waitForTimeout(300);
  s = await S(); ok(`${label}：選んで遊び始める・自機はドット絵`, s.phase === 'play' && s.sprite, JSON.stringify({ phase: s.phase, sprite: s.sprite }));
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
  // 攻撃：歩く敵の左に立って X（3 段）→ 倒す
  {
    const st = await S(); const w = st.foes.find(e => e.type === 'walker' && !e.dead && e.y === 80);
    await p.evaluate(w => window.__MG_TEST__.runnerHard.warp(w.x + w.face * 36, 90), w); await p.keyboard.down(w.face > 0 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(40); await p.keyboard.up(w.face > 0 ? 'ArrowLeft' : 'ArrowRight');   // 敵の進む先に、敵の方を向いて立つ
    const k0 = st.kills; let atk = null;
    for (let i = 0; i < 12 && (await S()).kills === k0; i++) { await p.keyboard.down('x'); await p.waitForTimeout(60); const v = await S(); if (v.atk) atk = v.atk; await p.keyboard.up('x'); await p.waitForTimeout(110); }
    const k1 = (await S()).kills;
    ok(`${label}：X で傘を振る（${atk || '—'}）→ 歩く敵を倒す`, k1 > k0 && !!atk, `倒した ${k1}` + (k1 > k0 ? '' : ' ' + JSON.stringify(await S()).slice(0, 300)));
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_attack.png` });
    // 敵に触れると やられ（傘の耐久が減る）
    const st2 = await S(), w2 = st2.foes.find(e => e.type === 'walker' && !e.dead);
    if (w2) { await p.waitForTimeout(1100); const hp0 = (await S()).hp; await p.evaluate(e => window.__MG_TEST__.runnerHard.warp(e.x, e.y + 4), w2); const hurt = await until(async () => { const v = await S(); return v.hp < hp0 ? v : null; }, 2000, 30); ok(`${label}：敵に触れると やられ（傘の耐久が減る）`, !!hurt, hurt ? '' : JSON.stringify(await S()).slice(0, 300)); }
  }
  // ボスの部屋：入ると柵が閉まる → 倒す → 技を覚える → 柵が開く → ↑＋X で切り上げ
  {
    const ar = (await S()).arena; await p.waitForTimeout(1100);
    await p.evaluate(x => window.__MG_TEST__.runnerHard.warp(x, 90), ar.x0 + 80);
    const on = await until(async () => (await S()).arenaOn, 3000, 50);
    ok(`${label}：ボスの部屋に入ると柵が閉まり、ボスが起きる`, !!on && (await S()).boss.state !== 'wait');
    if (SHOTS) { await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_boss.png` }); }
    await p.evaluate(() => window.__MG_TEST__.runnerHard.bossHp(1));
    let learned = null;
    for (let i = 0; i < 80 && !learned; i++) {
      const v = await S(); if (v.phase === 'learn') { learned = v; break; }
      if (!v.boss || v.boss.dead) { await p.waitForTimeout(150); continue; }
      if (!['walk', 'recover', 'slam_tele', 'spit_tele'].includes(v.boss.state)) { await p.waitForTimeout(120); continue; }   // 跳んでいる間は地上の技が届かない
      await p.evaluate(b => window.__MG_TEST__.runnerHard.warp(b.x - 40, 80), v.boss); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(30); await p.keyboard.up('ArrowRight');
      await p.keyboard.down('x'); await p.waitForTimeout(60); await p.keyboard.up('x'); await p.waitForTimeout(150);
    }
    if (!learned) learned = await until(async () => { const v = await S(); return v.phase === 'learn' ? v : null; }, 4000, 50);
    ok(`${label}：ボスを倒す → 「新しい技を覚えた」`, !!learned, learned ? '' : JSON.stringify(await S()).slice(0, 200));
    if (SHOTS && learned) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_learn.png` });
    await p.waitForTimeout(900); await p.keyboard.press('z'); await p.waitForTimeout(300);
    const v2 = await S();
    ok(`${label}：覚えた技と倒したボスを記録・柵が開く`, v2.phase === 'play' && v2.moves.includes('rising') && v2.beaten.includes('boss_a') && !v2.arenaOn, JSON.stringify({ phase: v2.phase, moves: v2.moves, beaten: v2.beaten }));
    await p.keyboard.down('ArrowUp'); await p.keyboard.down('x'); const rs = await until(async () => { const v = await S(); return v.atk === 'rising' ? v : null; }, 1000, 15); await p.keyboard.up('x'); await p.keyboard.up('ArrowUp');
    ok(`${label}：↑＋X で切り上げ（覚えた技）`, !!rs);
    const rec = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerHard)));
    ok(`${label}：記録 gs.runnerHard に技と倒したボス`, rec.moves.includes('rising') && rec.beaten.includes('boss_a'));
  }
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
