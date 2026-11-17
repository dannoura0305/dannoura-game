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
      await p.evaluate(g => window.__MG_TEST__.runnerHard.warp(g.x - 60, g.y + 10), g); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight');
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
  let s = await S(); ok(`${label}：Z → ボス選択の画面（表から並べる・通常ボス A・B・C）`, s.phase === 'select' && s.sel.join() === 'kazegiri,dakuryu,raikaku', JSON.stringify(s.sel));
  await until(async () => (await S()).sprites.length >= 4, 5000, 100);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_select.png` });
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);   // 雷殻の怪異（C）を選ぶ
  ok(`${label}：←→ でボスを選ぶ（雷殻の怪異）`, (await S()).selIdx === 2);
  { const cw = await p.evaluate(() => document.querySelector('.rh-cv').getBoundingClientRect().width);
    ok(`${label}：本編の 480px の枠を外して、窓の幅いっぱいに表示する`, Math.abs(cw - vw) < 2, `${Math.round(cw)} / ${vw}`);
    const fb = await p.$('#mg-screen .rh-fs'); ok(`${label}：見出しに「全画面」ボタン`, !!fb);
    if (fb && label === '横長') {
      await fb.click(); const on = await until(() => p.evaluate(() => !!document.fullscreenElement && document.fullscreenElement.id === 'mg-screen'), 2000, 50);
      ok(`${label}：「全画面」を押すと全画面になり、ボタンが「全画面を戻す」に変わる`, !!on && /戻す/.test(await fb.getAttribute('title')));
      if (SHOTS) { await p.waitForTimeout(400); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_select_fs.png` }); }
      await fb.click(); const off = await until(() => p.evaluate(() => !document.fullscreenElement), 2000, 50); ok(`${label}：もう一度押すと全画面が戻る`, !!off);
    } }
  { await until(async () => (await S()).selArt && (await S()).selRects.length === 3, 5000, 100); const v = await S(); ok(`${label}：ボス選択画面は利用者の絵（BOSS SELECT）・カード 3 枚`, v.selArt && v.selRects.length === 3);
    const cr = await p.evaluate(() => { const r = document.querySelector('.rh-cv').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width }; }), k = cr.w / v.VW, r = v.selRects[1];
    await p.mouse.click(cr.l + (r.x0 + r.x1) / 2 * k, cr.t + (r.y0 + r.y1) / 2 * k); await p.waitForTimeout(200); const v2 = await S();
    ok(`${label}：カードを押すと そのボスを選ぶ（まだ始まらない）`, v2.selIdx === 1 && v2.phase === 'select', JSON.stringify({ i: v2.selIdx, phase: v2.phase }));
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100); }
  await p.keyboard.press('z'); await p.waitForTimeout(300);
  s = await S(); ok(`${label}：選んで遊び始める（ボスの面＝高架下・都市送電区）・自機とボスはドット絵`, s.phase === 'play' && s.sprite && s.bossSprite && s.stage === 'koka', JSON.stringify({ phase: s.phase, sprite: s.sprite, boss: s.bossSprite, stage: s.stage }));
  await p.evaluate(() => window.__MG_TEST__.runnerHard.warp(1720, 170)); await p.waitForTimeout(300); s = await S();   // 長い床（帯電する床の先）で動きを試す
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
    const st = await S(); const w = st.foes.find(e => e.type === 'walker' && !e.dead);
    await p.evaluate(w => window.__MG_TEST__.runnerHard.warp(w.x + w.face * 36, w.y + 10), w); await p.keyboard.down(w.face > 0 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(40); await p.keyboard.up(w.face > 0 ? 'ArrowLeft' : 'ArrowRight');   // 敵の進む先に、敵の方を向いて立つ
    const k0 = st.kills; let atk = null;
    for (let i = 0; i < 12 && (await S()).kills === k0; i++) { await p.keyboard.down('x'); await p.waitForTimeout(60); const v = await S(); if (v.atk) atk = v.atk; await p.keyboard.up('x'); await p.waitForTimeout(110); }
    const k1 = (await S()).kills;
    ok(`${label}：X で傘を振る（${atk || '—'}）→ 歩く敵を倒す`, k1 > k0 && !!atk, `倒した ${k1}` + (k1 > k0 ? '' : ' ' + JSON.stringify(await S()).slice(0, 300)));
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_attack.png` });
    // 敵に触れると やられ（傘の耐久が減る）
    const st2 = await S(), w2 = st2.foes.find(e => e.type === 'walker' && !e.dead);
    if (w2) { await until(async () => (await S()).invul <= 0, 3000, 30); const v0 = await S(), hp0 = v0.hp, w3 = v0.foes.find(e => e.type === 'walker' && !e.dead) || w2; await p.evaluate(e => window.__MG_TEST__.runnerHard.warp(e.x, e.y + 4), w3); const hurt = await until(async () => { const v = await S(); return v.hp < hp0 ? v : null; }, 2000, 30); ok(`${label}：敵に触れると やられ（傘の耐久が減る）`, !!hurt, hurt ? '' : (v => JSON.stringify({ w2, hp0, hp: v.hp, invul: v.invul, x: v.x, y: v.y, st: v.state, foes: v.foes.filter(e => e.type === 'walker') }))(await S())); }
  }
  // 面の仕掛け：帯電する床（流れている間に乗ると やられ）・壊れる足場（乗ると落ちる）
  {
    await until(async () => { const v = await S(); return v.invul <= 0 && v.gm.strips[0]; }, 8000, 30);
    const hp0 = (await S()).hp; await p.evaluate(() => window.__MG_TEST__.runnerHard.warp(28 * 40 + 100, 164));
    const sh = await until(async () => { const v = await S(); return v.hp < hp0 ? v : null; }, 1500, 20);
    ok(`${label}：帯電する床：電気が流れている間に乗ると やられ`, !!sh);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_strip.png` });
    await p.waitForTimeout(1300); await p.evaluate(() => window.__MG_TEST__.runnerHard.heal()); const f0 = (await S()).falls; await p.evaluate(() => window.__MG_TEST__.runnerHard.warp(505, 300));
    const fell = await until(async () => { const v = await S(); return v.falls > f0 ? v : null; }, 2500, 30);
    ok(`${label}：足場の間の稲妻の穴へ落ちると、途中の印から`, !!fell);
    await until(async () => (await S()).phase !== 'play' || (await S()).y > 60, 3000, 50);   // 落ちたら途中の印から（耐久が残っていれば）
    await p.waitForTimeout(1300); await p.evaluate(() => window.__MG_TEST__.runnerHard.heal());
  }
  // ボスの部屋：入ると柵が閉まる → 倒す → 技を覚える → 柵が開く → ↑＋X で切り上げ
  {
    const ar = (await S()).arena; await p.waitForTimeout(1100);
    await p.evaluate(ar => window.__MG_TEST__.runnerHard.warp(ar.x0 + 80, ar.floor + 10), ar);
    const on = await until(async () => (await S()).arenaOn, 3000, 50);
    ok(`${label}：ボスの部屋に入ると柵が閉まり、ボスが起きる`, !!on && (await S()).boss.state !== 'wait');
    if (SHOTS) { await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_boss.png` }); }
    await p.evaluate(() => window.__MG_TEST__.runnerHard.bossHp(1));
    let learned = null;
    for (let i = 0; i < 80 && !learned; i++) {
      const v = await S(); if (v.phase === 'learn') { learned = v; break; }
      if (!v.boss || v.boss.dead) { await p.waitForTimeout(150); continue; }
      if (!['walk', 'recover', 'stomp_tele', 'discharge_tele', 'rush_tele', 'storm_tele', 'storm'].includes(v.boss.state)) { await p.waitForTimeout(120); continue; }   // ガード（正面は防ぐ）・突進の間は待つ
      await p.evaluate(b => window.__MG_TEST__.runnerHard.warp(b.x - 50, b.y), v.boss); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(30); await p.keyboard.up('ArrowRight');
      await p.keyboard.down('x'); await p.waitForTimeout(60); await p.keyboard.up('x'); await p.waitForTimeout(150);
    }
    if (!learned) learned = await until(async () => { const v = await S(); return v.phase === 'learn' ? v : null; }, 4000, 50);
    ok(`${label}：ボスを倒す → 「新しい技を覚えた」`, !!learned, learned ? '' : JSON.stringify(await S()).slice(0, 200));
    if (SHOTS && learned) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_learn.png` });
    await p.waitForTimeout(900); await p.keyboard.press('z'); await p.waitForTimeout(300);
    const v2 = await S();
    ok(`${label}：覚えた技と倒したボスを記録・柵が開く`, v2.phase === 'play' && v2.moves.includes('raitotsu') && v2.beaten.includes('raikaku') && !v2.arenaOn, JSON.stringify({ phase: v2.phase, moves: v2.moves, beaten: v2.beaten }));
    await p.evaluate(ar => window.__MG_TEST__.runnerHard.warp(ar.x0 + 60, ar.floor + 4), (await S()).arena);   // 部屋の左の端から右へ
    await until(async () => ['stand', 'land', 'walk'].includes((await S()).state), 2000, 30);
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('c'); await p.waitForTimeout(80); await p.keyboard.down('x'); const rs = await until(async () => { const v = await S(); return v.atk === 'raitotsu' ? v : null; }, 1000, 15); await p.keyboard.up('x'); await p.keyboard.up('c'); await p.keyboard.up('ArrowRight');
    ok(`${label}：ダッシュ中に X で雷突き（覚えた技）`, !!rs);
    const rec = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerHard)));
    ok(`${label}：記録 gs.runnerHard に技と倒したボス`, rec.moves.includes('raitotsu') && rec.beaten.includes('raikaku'));
  }
  // 途中の印 → 戸の手前へ（隠しボスに会うため、ほかの通常ボスも倒した事にする）
  await p.evaluate(() => window.__MG_TEST__.runnerHard.beatAll());
  const g = (await S()).goal;
  await p.evaluate(() => { const r = window.__MG_TEST__.runnerHard; r.warp(52 * 40 + 20, 170); });
  await p.waitForTimeout(500);
  ok(`${label}：途中の印に触れる`, (await S()).checks.some(Boolean));
  await p.evaluate(g => window.__MG_TEST__.runnerHard.warp(g.x - 140, g.y + 10), g);
  await p.waitForTimeout(400);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_goal.png` });
  await p.keyboard.down('ArrowRight'); const cl = await until(async () => { const v = await S(); return v.phase === 'clear' ? v : null; }, 5000, 30); await p.keyboard.up('ArrowRight');
  ok(`${label}：コンビニの戸で着く`, !!cl && cl.outcome === 'clear');
  await p.waitForTimeout(1800); await p.keyboard.press('Enter');
  // 隠しボス：ボスを全員倒して着くと、看病の場面 → WARNING → 風邪菌（仮）との戦い
  const CS = () => p.evaluate(() => window.__MG_TEST__.runnerHard.cold);
  const st0 = await until(async () => { const v = await S(); return v.phase === 'story' ? await CS() : null; }, 3000, 50);
  ok(`${label}：隠しボス：全員倒して着くと、看病の場面が始まる`, !!st0 && st0.story.n === 6 && /帰宅/.test(st0.story.txt), JSON.stringify(st0 && st0.story));
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_story.png` });
  for (let i = 0; i < 10 && (await S()).phase === 'story'; i++) { await p.waitForTimeout(380); await p.keyboard.press('z'); }
  const wn = await until(async () => (await S()).phase === 'warning', 2000, 30);
  ok(`${label}：隠しボス：WARNING`, !!wn);
  if (SHOTS) { await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_warning.png` }); }
  const on = await until(async () => { const c = await CS(); return c.on && (await S()).phase === 'play' ? c : null; }, 4000, 50);
  ok(`${label}：隠しボス：戦いが始まる（感染ゲージ 0・記録に「会った」）`, !!on && on.infect === 0 && on.rec && on.rec.seen, JSON.stringify(on));
  ok(`${label}：隠しボス：部屋は利用者の家の絵（寝室・居間・台所）`, !!on && on.home);
  if (SHOTS) { await p.waitForTimeout(1800); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_cold.png` }); }
  // 当たると感染ゲージが上がる（傘の耐久は減らない）
  { const hp0 = (await S()).hp; await p.waitForTimeout(1200); const c = await CS(); await p.evaluate(c => window.__MG_TEST__.runnerHard.warp(c.x, c.y - 20), c);
    const inf = await until(async () => { const v = await CS(); return v.infect > 0 ? v : null; }, 2000, 30);
    ok(`${label}：隠しボス：触れると感染ゲージが上がる・傘の耐久は減らない`, !!inf && (await S()).hp === hp0, JSON.stringify(inf)); }
  // ジャンプ攻撃で倒す
  await p.evaluate(() => window.__MG_TEST__.runnerHard.coldHp(1));
  let won = null;
  for (let i = 0; i < 60 && !won; i++) {
    const c = await CS(); if (c.res || c.dead) { won = c; break; }
    await p.waitForTimeout(1100);   // 無敵が切れるまで
    const c2 = await CS(); await p.evaluate(c => window.__MG_TEST__.runnerHard.warp(c.x - 30, Math.max(80, c.y - 60)), c2); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(20); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('x'); await p.waitForTimeout(60); await p.keyboard.up('x');
  }
  const ws = await until(async () => { const v = await S(); const c = await CS(); return v.phase === 'story' && c.res === 'win' ? c : null; }, 4000, 50);
  ok(`${label}：隠しボス：攻撃で倒す → 勝ちの結末（翌朝）`, !!ws && /翌朝/.test(ws.story.txt), JSON.stringify(ws || await CS()).slice(0, 300));
  for (let i = 0; i < 6 && (await S()).phase === 'story'; i++) { await p.waitForTimeout(380); await p.keyboard.press('z'); }
  ok(`${label}：隠しボス：「父ちゃんは今日も休めない！」`, (await S()).phase === 'coldend');
  if (SHOTS) { await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}/rh_${vw}x${vh}_coldwin.png` }); }
  await p.waitForTimeout(1300); await p.keyboard.press('Enter');
  const ended = await until(() => p.evaluate(() => MG._ended), 8000);
  const rec = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerHard)));
  ok(`${label}：終わると「全画面」ボタンを片付ける`, !(await p.$('#mg-screen .rh-fs')));
  ok(`${label}：終わる・記録（gs.runnerHard.proto：遊んだ・着いた・時間・cold：勝ち 1）・通常版の記録には触らない`, !!ended && rec.proto.plays >= 1 && rec.proto.clears >= 1 && rec.proto.bestTime > 0 && rec.cold && rec.cold.wins === 1, JSON.stringify([rec.proto, rec.cold]));
  ok(`${label}：ページのエラーが出ない`, errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await p.close();
}
// 通常ボス A（風斬の怪異・雨のビルの屋上・突風）と B（濁流の怪異・排水路・増水）：選ぶ → 面の仕掛け → ボスを倒す → 技を覚えて使う
for (const [idx, id, stage, move, label] of [[0, 'kazegiri', 'okujo', 'kazebashiri', 'A 風斬'], [1, 'dakuryu', 'haisui', 'mizukiri', 'B 濁流']]) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__MG_TEST__ = {}; });
  await p.goto(BASE + '/index.html?runnerhard=1'); await p.waitForTimeout(2500); await p.mouse.click(480, 270);
  await p.evaluate(async () => { gs.mgDay = {}; delete gs.runnerHard; await MG.open('runner_hard'); });
  const S = () => p.evaluate(() => window.__MG_TEST__.runnerHard ? window.__MG_TEST__.runnerHard.s : null);
  const H = (f, ...a) => p.evaluate(([f, a]) => window.__MG_TEST__.runnerHard[f](...a), [f, a]);
  const until = async (fn, ms = 15000, step = 80) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await p.waitForTimeout(step); } return null; };
  await until(async () => { const s = await S(); return s && s.phase === 'intro'; }); await p.waitForTimeout(600); await p.keyboard.press('z'); await p.waitForTimeout(500);
  for (let i = 0; i < idx; i++) await p.keyboard.press('ArrowRight');
  await p.keyboard.press('z'); await p.waitForTimeout(400);
  let s = await S(); ok(`${label}：選ぶと そのボスの面（${stage}）`, s.phase === 'play' && s.stage === stage, JSON.stringify({ phase: s.phase, stage: s.stage }));
  { const art = await until(async () => (await S()).art, 6000, 100); ok(`${label}：面の背景は利用者の絵（3 枚）`, !!art); if (SHOTS) { await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/rh_${stage}_start.png` }); } }
  if (stage === 'okujo') {   // 突風：吹いている間は自機が押される
    await until(async () => (await S()).gmW.winds[0], 6000, 30); await H('warp', 420, 164); const x0 = (await S()).x; await p.waitForTimeout(250); const x1 = (await S()).x;
    ok(`${label}：突風が吹くと 自機が押し戻される`, x1 < x0 - 20, `${Math.round(x0)} → ${Math.round(x1)}`);
  } else {                   // 増水：上がると通りの自機が やられ
    await until(async () => { const v = await S(); return v.gmW.floods[0] > 55 && v.invul <= 0; }, 12000, 30); const hp0 = (await S()).hp; await H('warp', 670, 141);   // 水の中の低い柱（137）
    const hurt = await until(async () => (await S()).hp < hp0, 1500, 20); ok(`${label}：増水すると 水の中の低い柱に立つ自機が やられ`, !!hurt);
  }
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${id}_stage.png` });
  await p.waitForTimeout(1300); await H('heal');
  const ar = (await S()).arena; await H('warp', ar.x0 + 80, ar.floor + 10);
  const on = await until(async () => (await S()).arenaOn, 3000, 50); ok(`${label}：ボスの部屋に入ると柵が閉まり、ボスが起きる`, !!on);
  await p.waitForTimeout(1600); if (SHOTS) await p.screenshot({ path: `${SHOTS}/rh_${id}_boss.png` });
  await H('heal'); await H('bossHp', 1);
  let learned = null;
  for (let i = 0; i < 100 && !learned; i++) {
    const v = await S(); if (v.phase === 'learn') { learned = v; break; }
    if (!v.boss || v.boss.dead) { await p.waitForTimeout(150); continue; }
    if (!/walk|recover|_tele$|shot$/.test(v.boss.state) || !v.boss.grounded) { await p.waitForTimeout(60); continue; }
    await p.waitForTimeout(1000); await H('heal');
    const v2 = await S(); await H('warp', v2.boss.x - v2.boss.w - 24, v2.boss.y); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(20); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('x'); await p.waitForTimeout(60); await p.keyboard.up('x'); await p.waitForTimeout(80);
  }
  if (!learned) learned = await until(async () => { const v = await S(); return v.phase === 'learn' ? v : null; }, 4000, 50);
  ok(`${label}：ボスを倒す → 「新しい技を覚えた」`, !!learned, learned ? '' : JSON.stringify((await S()).boss));
  if (SHOTS && learned) await p.screenshot({ path: `${SHOTS}/rh_${id}_learn.png` });
  await p.waitForTimeout(900); await p.keyboard.press('z'); await p.waitForTimeout(300); await H('heal');
  const v3 = await S(); ok(`${label}：覚えた技と倒したボスを記録`, v3.moves.includes(move) && v3.beaten.includes(id), JSON.stringify({ moves: v3.moves, beaten: v3.beaten }));
  await until(async () => ['stand', 'land', 'walk'].includes((await S()).state), 3000, 30);
  if (move === 'kazebashiri') {
    await p.keyboard.down('z'); await p.waitForTimeout(150); await p.keyboard.down('c'); const ad = await until(async () => (await S()).state === 'air_dash', 800, 10); await p.keyboard.up('c'); await p.keyboard.up('z');
    ok(`${label}：空中で C → 風走り（空中ダッシュ）`, !!ad);
  } else {
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(60); await p.keyboard.down('x'); const mk = await until(async () => (await S()).atk === 'mizukiri', 800, 10); await p.keyboard.up('x'); await p.keyboard.up('ArrowDown');
    ok(`${label}：スライディング中に X → 水切り`, !!mk);
  }
  ok(`${label}：ページのエラーが出ない`, errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await p.close();
}

// 隠しボス：一度会うと選択画面から戦える → 感染ゲージが満タンで負けの結末
{
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__MG_TEST__ = {}; });
  await p.goto(BASE + '/index.html?runnerhard=1'); await p.waitForTimeout(2500); await p.mouse.click(480, 270);
  await p.evaluate(() => { gs.runnerHard = { v: 1, beaten: ['raikaku'], moves: ['raitotsu'], proto: { plays: 0, clears: 0, bestTime: 0 }, cold: { seen: true, wins: 0, losses: 0, last: null } }; MG.open('runner_hard'); });
  const R = () => p.evaluate(() => window.__MG_TEST__.runnerHard && Object.assign({}, window.__MG_TEST__.runnerHard.s, { cold: window.__MG_TEST__.runnerHard.cold }));
  const wait = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await R().catch(() => null); if (v && fn(v)) return v; await p.waitForTimeout(50); } return null; };
  await wait(v => v.phase === 'intro', 15000); await p.waitForTimeout(600); await p.keyboard.press('z'); await p.waitForTimeout(500);
  const sel = await wait(v => v.phase === 'select' && v.selArt && v.selRects.length === 4, 5000);
  ok('隠しボス：一度会うと選択画面に風邪菌が出る（カード 4 枚・利用者の絵）', !!sel && sel.cold.sel.includes('cold'), JSON.stringify(sel && sel.cold.sel));
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);   // いちばん右（隠しボス）
  await p.screenshot({ path: (SHOTS || '/tmp') + '/rh_select_cold.png' });
  await p.keyboard.press('z');
  const sto = await wait(v => v.phase === 'story', 2000);
  ok('隠しボス：選ぶと短い看病の場面（4 行）から', !!sto && sto.cold.story.n === 4, JSON.stringify(sto && sto.cold.story));
  for (let i = 0; i < 8 && (await R()).phase === 'story'; i++) { await p.waitForTimeout(380); await p.keyboard.press('z'); }
  const on = await wait(v => v.phase === 'play' && v.cold.on, 5000);
  ok('隠しボス：WARNING の後に戦い', !!on);
  await p.evaluate(() => window.__MG_TEST__.runnerHard.infect(99)); await p.waitForTimeout(1200);
  const c = (await R()).cold; await p.evaluate(c => window.__MG_TEST__.runnerHard.warp(c.x, c.y - 20), c);
  const lo = await wait(v => v.phase === 'story' && v.cold.res === 'lose', 3000);
  ok('隠しボス：感染ゲージが満タン → 負けの結末（翌朝。寝込む）', !!lo && /寝込/.test(lo.cold.story.txt), JSON.stringify(lo && lo.cold.story));
  for (let i = 0; i < 6 && (await R()).phase === 'story'; i++) { await p.waitForTimeout(380); await p.keyboard.press('z'); }
  await p.waitForTimeout(1300); await p.keyboard.press('Enter');
  const ended = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { if (await p.evaluate(() => MG._ended)) return true; await p.waitForTimeout(100); } return false; })();
  const rec = await p.evaluate(() => JSON.parse(JSON.stringify(gs.runnerHard)));
  ok('隠しボス：負けて終わる・記録（負け 1・試しの走りの回数は増えない）', ended && rec.cold.losses === 1 && rec.cold.last === 'lose' && rec.proto.plays === 0, JSON.stringify([rec.cold, rec.proto]));
  ok('隠しボス（選択画面から）：ページのエラーが出ない', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await p.close();
}
await b.close();
console.log(`\n${pass}/${pass + fail} 合格`);
process.exit(fail ? 1 : 0);
