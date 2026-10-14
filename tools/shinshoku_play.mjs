// 『境界侵食』の自動プレイ（Playwright）：フェーズ2の受け入れ基準を画面つきで確かめ、画面を撮る。
// 使い方：python3 -m http.server 8795 --directory <repo> を起動してから
//   node tools/shinshoku_play.mjs [出力フォルダ] [--base http://localhost:8795] [--only pc|phone]
// 環境変数：PW_MODULE（playwright の index.mjs）、PW_CHROMIUM（chromium の実行ファイル）
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--')) || 'shinshoku_shots';
const BASE = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8795').replace(/\/$/, '');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
mkdirSync(OUT, { recursive: true });

const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`); };
const OTHER_KEYS = {
  dannoura_endings: JSON.stringify({ father: { count: 1 } }), dannoura_save_v1: JSON.stringify({ story: { flags: { white_seen: true } } }),
  kyokai_endings: JSON.stringify(['A']), kyokai_true_end: '1', kyokai_save_v1: JSON.stringify({ flags: { b30_read: true } }), tobi_save_v1: JSON.stringify({ toyama: false }),
};

async function launch() {
  return chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
}
async function openGame(ctx, query, errs) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(keys => { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, OTHER_KEYS);
  const t0 = Date.now();
  await page.goto(`${BASE}/shinshoku.html?${query}`);
  await page.waitForFunction(() => window.__sh && ['play', 'dialog'].includes(window.__sh.state().mode), null, { timeout: 60000 });
  return { page, loadMs: Date.now() - t0 };
}
const S = page => page.evaluate(() => __sh.state());
const clearUI = page => page.evaluate(() => { const u = __sh.game.ui; u.toastT = 0; u.barkT = 0; u.el.toast.classList.remove('on'); u.el.bark.classList.remove('on'); u.el.flash.className = 'sh-flash'; u.slow(false); __sh.game.slowT = 0; __sh.game.sfx.setMuffle(0); });
const sim = (page, n) => page.evaluate(n => __sh.debug.fastSim(n), n);
const otherKeys = page => page.evaluate(() => { const o = {}; const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); for (const k of ks.sort()) if (/^(dannoura_|kyokai_|tobi_)/.test(k)) o[k] = localStorage.getItem(k); return o; });

/** 帰路などを目の前に置いて攻撃させ、ジャスト回避 → 見切り一閃。成功なら true */
async function justDodgeIssen(page, id, opt = {}) {
  return page.evaluate(async ({ id, early, touch }) => {
    const D = __sh.debug, g = __sh.game;
    D.resetEnemy(id); D.heal(); g.slowT = 0; g.hitstop = 0;
    const P = g.player; D.teleport(opt0.x, opt0.z, Math.PI);
    D.placeEnemy(id, P.pos.x, P.pos.z - 1.4);
    D.fastSim(2);
    const before = __sh.state().metrics.issen.mikiri;
    const W = D.forceAttack(id, id.startsWith('heiten') ? 'jab' : 'shove');
    // 攻撃判定が出る W ステップ目の early ステップ前に回避、その 6 ステップ後に攻撃
    __sh.input.script([{ f: W - 1 - early, press: ['dodge'] }, { f: W - 1 - early + early + 6, press: ['attack'] }]);
    D.fastSim(W + 60);
    return __sh.state().metrics.issen.mikiri - before === 1;
  }, { id, early: opt.early ?? 4, touch: !!opt.touch }).catch(e => { console.log(e.message); return false; });
}

async function runPC(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const { page, loadMs } = await openGame(ctx, 'autostart=1&perf=1', errs);
  const before = await otherKeys(page);
  // 1. 起動
  const res = await page.evaluate(() => { const r = performance.getEntriesByType('resource'); let t = 0; for (const e of r) t += e.transferSize || e.encodedBodySize || 0; return { n: r.length, bytes: t }; });
  ok('PC 起動→操作可能', loadMs < 5000, `${loadMs}ms・読み込み ${(res.bytes / 1048576).toFixed(2)}MB（${res.n} 件）`);
  ok('読み込み合計 5MB 以下', res.bytes < 5 * 1048576, `${(res.bytes / 1048576).toFixed(2)}MB`);
  let st = await S(page);
  ok('最初の会話（データ駆動）', st.mode === 'dialog');
  await page.screenshot({ path: join(OUT, 'pc_01_intro.png') });
  await page.evaluate(() => __sh.debug.skipDialog());
  // 2. 移動（入力列）
  await page.evaluate(() => { __sh.debug.teleport(0, 11, Math.PI); __sh.input.move(0, 1, 90); });
  await sim(page, 95);
  st = await S(page);
  ok('移動（前へ 1.5 秒）', st.player.z < 9, `z=${st.player.z.toFixed(2)}`);
  // 壁を抜けない：5 分ぶんのランダム歩き（描画なし）
  const walk = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.god(true); D.freezeEnemies(true);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    D.teleport(0, 4, Math.PI);
    for (let i = 0; i < 18000; i += 45) {
      const a = rnd() * Math.PI * 2; __sh.input.script([{ f: 0, move: [Math.cos(a), Math.sin(a), 45] }].concat(rnd() < 0.3 ? [{ f: 5, hold: { run: 40 } }] : []).concat(rnd() < 0.15 ? [{ f: 10, press: ['dodge'] }] : []));
      g.cam.yaw += (rnd() - 0.5) * 1.5;
      D.fastSim(45);
    }
    D.god(false); D.freezeEnemies(false);
    const m = __sh.state().metrics; return { clips: m.wallClips, oob: m.outOfBounds, x: g.player.pos.x, z: g.player.pos.z };
  });
  ok('歩き回り 5 分（18000 ステップ）で壁抜け・場外 0', walk.clips === 0 && walk.oob === 0, JSON.stringify(walk));
  // 端から端まで
  const ends = await page.evaluate(() => { const D = __sh.debug; D.god(true); D.freezeEnemies(true); D.teleport(0, 4, Math.PI); __sh.input.script([{ f: 0, move: [0, 1, 1100] }, { f: 0, hold: { run: 1100 } }]); D.fastSim(1100); const z = __sh.game.player.pos.z; D.god(false); D.freezeEnemies(false); return z; });
  ok('商店街の端（ふさがれた道）まで歩ける', ends < -66, `z=${ends.toFixed(1)}`);
  // 3. 刀で攻撃
  const atk = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_1'); D.teleport(0, -20, Math.PI); D.placeEnemy('kiro_1', 0, -21.4); D.fastSim(2);
    const hp0 = g.enemies.find(e => e.id === 'kiro_1').brain.hp, m0 = __sh.state().metrics.slashHits;
    __sh.input.script([{ f: 0, press: ['attack'] }, { f: 14, press: ['attack'] }, { f: 30, press: ['attack'] }]); D.fastSim(70);
    return { hits: __sh.state().metrics.slashHits - m0, hp0, hp1: g.enemies.find(e => e.id === 'kiro_1').brain.hp };
  });
  ok('刀の 3 段（当たる）', atk.hits >= 2 && atk.hp1 < atk.hp0, JSON.stringify(atk));
  // 4. ジャスト回避 → 見切り一閃 10/10
  await page.evaluate(() => { window.opt0 = { x: 0, z: -24 }; });
  let n = 0; for (let i = 0; i < 10; i++) if (await justDodgeIssen(page, 'kiro_1')) n++;
  ok('ジャスト回避→見切り一閃（入力列 10 回）', n === 10, `${n}/10`);
  // 一閃の瞬間を撮る（シミュレーションを止めて描画）
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_1'); D.heal(); D.teleport(0.6, -24, Math.PI); D.placeEnemy('kiro_1', 0.6, -25.4); D.fastSim(2); g.cam.yaw = Math.PI * 0.25; g.cam.pitch = 0.12; const W = D.forceAttack('kiro_1', 'shove'); __sh.input.script([{ f: W - 5, press: ['dodge'] }, { f: W + 2, press: ['attack'] }]); D.fastSim(W - 2); D.hold(true); });
  await clearUI(page); await page.waitForTimeout(700); await page.screenshot({ path: join(OUT, 'pc_02_telegraph.png') });
  await page.evaluate(() => { const D = __sh.debug; D.fastSim(14); });
  await page.waitForTimeout(500); await page.screenshot({ path: join(OUT, 'pc_03_issen.png') });
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(60); });
  // パリィ → 弾き一閃
  const parry = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; let ok = 0;
    for (let i = 0; i < 5; i++) {
      D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.fastSim(2);
      const b = __sh.state().metrics.issen.hajiki; const W = D.forceAttack('kiro_2', 'shove');
      __sh.input.script([{ f: W - 4, press: ['parry'] }, { f: W + 4, press: ['attack'] }]); D.fastSim(W + 60);
      if (__sh.state().metrics.issen.hajiki - b === 1) ok++;
    }
    return ok;
  });
  ok('パリィ→弾き一閃（入力列 5 回）', parry === 5, `${parry}/5`);
  // 居合（長押し）→ 抜刀一閃
  const iai = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.freezeEnemies(true); D.fastSim(2);
    const b = __sh.state().metrics.issen.iai; __sh.input.script([{ f: 0, hold: { heavy: 120 } }]); D.fastSim(45); D.freezeEnemies(false);
    const W = D.forceAttack('kiro_2', 'grab'); D.fastSim(W + 50);
    return __sh.state().metrics.issen.iai - b;
  });
  ok('居合の構え→抜刀一閃（弾けないつかみにも）', iai === 1);
  // 弾けない攻撃をパリィしても弾けない
  const red = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.fastSim(2);
    const p0 = __sh.state().metrics.parry, h0 = g.player.fighter.hp; const W = D.forceAttack('kiro_2', 'grab');
    __sh.input.script([{ f: W - 3, press: ['parry'] }]); D.fastSim(W + 10);
    return { parried: __sh.state().metrics.parry - p0, dmg: h0 - g.player.fighter.hp };
  });
  ok('赤い予兆（つかみ）は弾けない', red.parried === 0 && red.dmg > 0, JSON.stringify(red));
  // 5. 持ち替え・撃つ・装填
  const gun = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); g.slowT = 0; g.hitstop = 0; D.resetEnemy('kiro_4'); D.freezeEnemies(true);
    D.teleport(0, -40, Math.PI); D.placeEnemy('kiro_4', 0, -45); D.fastSim(40); D.faceTo(0, -45); g.cam.pitch = 0.08;
    const m0 = __sh.state().metrics; const s0 = m0.swaps.length;
    __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(12);
    const sw1 = __sh.state().metrics.swaps.slice(s0);
    __sh.input.script([{ f: 0, hold: { aim: 30 } }, { f: 12, press: ['attack'] }]); D.fastSim(32);
    const m1 = __sh.state().metrics;
    const mag1 = g.player.fighter.mag;
    __sh.input.script([{ f: 0, press: ['reload'] }]); D.fastSim(90);
    const mag2 = g.player.fighter.mag;
    __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(12);
    const sw2 = __sh.state().metrics.swaps.slice(s0);
    // 切替撃ち：刀の 1 段目の戻り 8f 目に構える
    const e0 = __sh.state().metrics.events.length;
    __sh.input.script([{ f: 0, press: ['attack'] }, { f: 18, hold: { aim: 12 } }]); D.fastSim(40);
    const ev = g.metrics.events.slice(-60);
    const q = ev.filter(e => e.t === 'swapStart').pop(), sh = ev.filter(e => e.t === 'shot').pop();
    D.freezeEnemies(false);
    __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(20);
    return { sw1, sw2, shots: m1.shots - m0.shots, hits: m1.shotHits - m0.shotHits, mag1, mag2, quick: q && sh ? sh.frame - q.frame : null, weapon: g.player.fighter.weapon };
  });
  ok('刀→銃の持ち替え 9f（150ms）', gun.sw1.length && gun.sw1[0].frames === 9 && gun.sw1[0].measured === 9, JSON.stringify(gun.sw1));
  ok('構えて撃つ（命中）', gun.shots === 1 && gun.hits === 1, `shots=${gun.shots} hits=${gun.hits}`);
  ok('装填（R）', gun.mag2 === 12 && gun.mag1 === 11, `${gun.mag1}→${gun.mag2}`);
  ok('銃→刀の持ち替え 9f', gun.sw2.length >= 2 && gun.sw2[1].to === 'katana' && gun.sw2[1].measured === 9, JSON.stringify(gun.sw2[1]));
  ok('切替撃ち 4f（67ms）で 1 発目', gun.quick === 4, `${gun.quick}f`);
  // 構えの画面（HUD）
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_4'); D.teleport(0.5, -40, Math.PI); D.placeEnemy('kiro_4', 0.2, -46); D.faceTo(0.2, -46); g.cam.pitch = 0.06; D.freezeEnemies(true); __sh.input.script([{ f: 0, press: ['weapon2'] }, { f: 0, hold: { aim: 200 } }]); D.fastSim(30); D.hold(true); });
  await clearUI(page); await page.waitForTimeout(800); await page.screenshot({ path: join(OUT, 'pc_04_aim_hud.png') });
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(200); __sh.debug.freezeEnemies(false); __sh.input.script([{ f: 0, press: ['weapon1'] }]); __sh.debug.fastSim(30); });
  ok('刀に戻す（1 キー）', (await S(page)).player.weapon === 'katana');
  // 6. 帰路を救う（戸を開ける）・救った個体は攻撃しない
  const rescue = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_3');
    // わざと敵対させてから戸を開ける
    D.teleport(-8, -29.5, -Math.PI / 2); D.placeEnemy('kiro_3', -9.5, -29.5); D.forceAttack('kiro_3', 'shove'); D.fastSim(20);
    const k = () => g.enemies.find(e => e.id === 'kiro_3').brain;
    D.teleport(-14.6, -29.5, -Math.PI / 2); D.fastSim(3);
    const near = __sh.state().nearSpot;
    __sh.input.script([{ f: 0, press: ['interact'] }]); D.fastSim(2);
    const st1 = k().state;
    D.teleport(-6, -29.5, Math.PI / 2);
    for (let i = 0; i < 40 && k().state !== 'home'; i++) D.fastSim(30);
    const a0 = __sh.state().metrics.enemyAttacks.kiro_3 || 0;
    D.teleport(-14.2, -29.5, -Math.PI / 2); D.fastSim(900);
    return { near, st1, st: k().state, res: k().resolution, attacksAfter: (__sh.state().metrics.enemyAttacks.kiro_3 || 0) - a0 };
  });
  ok('帰路を救う（戸の鍵を開ける→家族と取り違え→家に入る）', rescue.near === 'door_k3' && rescue.st1 === 'family' && rescue.st === 'home' && rescue.res === 'rescue', JSON.stringify(rescue));
  ok('救った帰路は二度と攻撃しない（15 秒そばにいる）', rescue.attacksAfter === 0);
  // 7. 帰路を倒す
  const kill = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_5'); D.god(true);
    const k = () => g.enemies.find(e => e.id === 'kiro_5').brain;
    for (let i = 0; i < 12 && k().alive; i++) { D.teleport(0, -60, Math.PI); D.placeEnemy('kiro_5', 0, -61.3); D.fastSim(2); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 14, press: ['attack'] }, { f: 30, press: ['attack'] }]); D.fastSim(80); }
    D.god(false); D.fastSim(120);
    return { st: k().state, res: k().resolution, visible: g.enemies.find(e => e.id === 'kiro_5').root.visible };
  });
  ok('帰路を倒す（黒い霧になって崩れる）', kill.st === 'dead' && kill.res === 'kill' && !kill.visible, JSON.stringify(kill));
  // 8. 閉店を倒す（パリィ→弾き一閃・銃）
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.heal(); D.placeEnemy('heiten_1', 8.3, -36.4); D.teleport(5.9, -36.6, Math.PI / 2); D.fastSim(2); D.faceTo(8.3, -36.4); g.cam.yaw = -Math.PI / 2 - 0.6; g.cam.pitch = 0.12; const W = D.forceAttack('heiten_1', 'shutter'); D.fastSim(W - 12); D.hold(true); });
  await clearUI(page); await page.waitForTimeout(800); await page.screenshot({ path: join(OUT, 'pc_05_heiten.png') });
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(100); });
  const heiten = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; const H = () => g.enemies.find(e => e.id === 'heiten_1').brain; let loops = 0, hajiki = 0;
    while (H().alive && loops < 12) {
      loops++; D.heal(); g.slowT = 0; g.hitstop = 0; D.fastSim(40); D.placeEnemy('heiten_1', 8.0, -36.3); D.teleport(6.1, -36.3, Math.PI / 2); D.faceTo(8.0, -36.3); D.fastSim(2);
      const b = __sh.state().metrics.issen.hajiki; const W = D.forceAttack('heiten_1', 'jab');
      __sh.input.script([{ f: W - 4, press: ['parry'] }, { f: W + 4, press: ['attack'] }]); D.fastSim(W + 80);
      hajiki += __sh.state().metrics.issen.hajiki - b;
    }
    return { st: H().state, res: H().resolution, loops, hajiki };
  });
  ok('閉店を倒す（弾き一閃）', heiten.st === 'dead' && heiten.res === 'kill', JSON.stringify(heiten));
  // 9. セーブ → 再読み込みで戻る
  const snap = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.fastSim(240); D.teleport(-2.2, -14.5, 1.1); g.player.fighter.hp = 73; g.player.fighter.mag = 5; D.fastSim(2); const okSave = __sh.save('slot1'); const s = __sh.state(); return { okSave, x: s.player.x, z: s.player.z, hp: s.player.hp, mag: s.player.mag, ammo: s.player.ammo, enemies: s.enemies.map(e => [e.id, e.resolution]) }; });
  await page.reload();
  await page.waitForFunction(() => window.__sh && ['play', 'dialog'].includes(window.__sh.state().mode), null, { timeout: 60000 });
  const back = await page.evaluate(() => { __sh.debug.skipDialog(); __sh.load('slot1'); const s = __sh.state(); return { x: s.player.x, z: s.player.z, hp: s.player.hp, mag: s.player.mag, ammo: s.player.ammo, enemies: s.enemies.map(e => [e.id, e.resolution]) }; });
  const same = snap.okSave && Math.abs(back.x - snap.x) < 0.01 && Math.abs(back.z - snap.z) < 0.01 && back.hp === snap.hp && back.mag === snap.mag && back.ammo === snap.ammo && JSON.stringify(back.enemies) === JSON.stringify(snap.enemies);
  ok('セーブ→再読み込みで位置・体力・弾・敵の決着が戻る', same, JSON.stringify({ snap, back }));
  // 自動セーブ（?continue=1）
  const auto = await page.evaluate(() => !!__sh.store.load('auto'));
  ok('自動セーブがある', auto);
  // 救った帰路は読み込み後も攻撃しない
  const after = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(-14, -29.5, 0); D.fastSim(600); const k = g.enemies.find(e => e.id === 'kiro_3'); return { st: k.brain.state, vis: k.root.visible, atk: __sh.state().metrics.enemyAttacks.kiro_3 || 0 }; });
  ok('読み込み後も救った帰路は家の中（攻撃なし）', after.st === 'home' && !after.vis && after.atk === 0, JSON.stringify(after));
  // ゲームパッド（Gamepad API を差し替えて確認）
  const pad = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.freezeEnemies(true); D.teleport(0, 2, Math.PI); g.cam.yaw = 0; D.fastSim(2);
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const pad = { connected: true, axes: [0, -1, 0, 0], buttons: btn(), mapping: 'standard' };
    const orig = navigator.getGamepads; navigator.getGamepads = () => [pad];
    const z0 = g.player.pos.z; D.fastSim(60); const z1 = g.player.pos.z;
    pad.axes = [0, 0, 0, 0]; pad.buttons[0] = { pressed: true, value: 1 }; D.fastSim(1); const st = g.player.fighter.st.name; pad.buttons[0] = { pressed: false, value: 0 }; D.fastSim(40);
    pad.buttons[5] = { pressed: true, value: 1 }; D.fastSim(1); pad.buttons[5] = { pressed: false, value: 0 }; D.fastSim(15); const w = g.player.fighter.weapon;
    pad.buttons[5] = { pressed: true, value: 1 }; D.fastSim(1); pad.buttons[5] = { pressed: false, value: 0 }; D.fastSim(15);
    navigator.getGamepads = orig; g.input.device = 'kbm'; D.freezeEnemies(false);
    return { moved: z0 - z1, dodge: st, swapped: w, device: 'pad' };
  });
  ok('ゲームパッド（左スティック移動・A 回避・RB 持ち替え）', pad.moved > 1 && pad.dodge === 'dodge' && pad.swapped === 'handgun', JSON.stringify(pad));
  // 金庫（番号は設定の仮の値）・カレンダーの手掛かり
  await page.evaluate(() => { const D = __sh.debug; D.teleport(4.9, 14.0, 0); D.fastSim(3); D.use('calendar'); });
  const clue = await page.evaluate(() => document.querySelector('.sh-dtext').textContent);
  await page.evaluate(() => { __sh.debug.skipDialog(); __sh.debug.use('safe'); });
  const code = clue.match(/「([\d ]+)」/)[1].replace(/ /g, '');
  for (const c of code) await page.keyboard.press('Digit' + c);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'pc_09_safe_dialog.png') });
  const safe = await page.evaluate(() => { __sh.debug.skipDialog(); return { opened: !!__sh.state().flags.safe_opened, items: __sh.state().player.items }; });
  ok('金庫（手掛かりの番号で開く・番号は仮の設定から）', safe.opened && safe.items.medkit_l === 1, JSON.stringify({ code, ...safe }));
  // 一時停止メニュー（操作の一覧）
  await page.evaluate(() => { __sh.game.pause(); __sh.game.ui.openMenu('controls'); });
  await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, 'pc_10_menu.png') });
  await page.evaluate(() => __sh.game.resume());
  // 10. 他作品のキーが変わらない／自分のキーだけ
  const aft = await otherKeys(page);
  ok('他作品のキー（dannoura_*・kyokai_*・tobi_*）が変わらない', JSON.stringify(aft) === JSON.stringify(before));
  const own = await page.evaluate(() => { const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); return ks.filter(k => !/^(dannoura_|kyokai_|tobi_)/.test(k)).sort(); });
  ok('本作が書いたキーは shinshoku_* と wakaba_progress_v1 だけ', own.every(k => /^shinshoku_/.test(k) || k === 'wakaba_progress_v1'), own.join(','));
  const wp = await page.evaluate(() => JSON.parse(localStorage.getItem('wakaba_progress_v1') || '{}'));
  ok('wakaba_progress_v1 は games.shinshoku だけ保存', JSON.stringify(Object.keys(wp.games || {})) === '["shinshoku"]', JSON.stringify(wp.games && wp.games.shinshoku && wp.games.shinshoku.bestiary));
  // 撮影：通り・キャラクターの寄り・自宅
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(1.2, -9, Math.PI); g.cam.yaw = 0.25; g.cam.pitch = 0.12; D.fastSim(10); });
  await clearUI(page); await page.waitForTimeout(1500); await page.screenshot({ path: join(OUT, 'pc_06_street.png') });
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(0, 3.2, Math.PI); D.fastSim(3); D.view('char'); g.cam.yaw = 0.0 + Math.PI * 0.0; g.player.yaw = 0.35; g.cam.yaw = 0.35; g.cam.pitch = 0.0; g.cam.dist = 1.25; });
  await page.waitForTimeout(1500); await page.screenshot({ path: join(OUT, 'pc_07_character.png') });
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.view('normal'); D.teleport(-0.3, 10.6, Math.PI * 0.85); g.cam.yaw = Math.PI * 0.85 + Math.PI; g.cam.pitch = 0.2; D.fastSim(5); });
  await page.waitForTimeout(1200); await page.screenshot({ path: join(OUT, 'pc_08_home.png') });
  const perf = await page.evaluate(() => ({ perf: __sh.debug.perf(), ri: __sh.debug.renderInfo() }));
  ok('PC ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

async function runPhone(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const { page, loadMs } = await openGame(ctx, 'autostart=1&perf=1', errs);
  ok('スマホ横 起動→操作可能', loadMs < 8000, `${loadMs}ms`);
  await page.evaluate(() => __sh.debug.skipDialog());
  const touchOn = await page.evaluate(() => getComputedStyle(document.getElementById('sh-touch')).display !== 'none');
  ok('タッチ操作の表示（横向き）', touchOn);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] ?? i })) });
  // スティックで前へ
  await page.evaluate(() => { __sh.debug.teleport(0, 4, Math.PI); });
  const z0 = (await S(page)).player.z;
  await touch('touchStart', [[150, 300, 1]]); await touch('touchMove', [[150, 250, 1]]);
  await page.waitForTimeout(2500);
  await touch('touchEnd', []);
  const z1 = (await S(page)).player.z;
  ok('タッチのスティックで移動', z1 < z0 - 0.5, `${z0.toFixed(2)}→${z1.toFixed(2)}`);
  // ボタン：斬
  const box = async sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  const tap = async (sel, ms = 60) => { const [x, y] = await box(sel); await touch('touchStart', [[x, y, 5]]); await page.waitForTimeout(ms); await touch('touchEnd', []); };
  const m0 = (await S(page)).metrics.events.length;
  await page.evaluate(() => { __sh.debug.resetEnemy('kiro_1'); __sh.debug.teleport(0, -20, Math.PI); __sh.debug.placeEnemy('kiro_1', 0, -21.4); __sh.debug.freezeEnemies(true); });
  await tap('.tc-atk'); await page.waitForTimeout(600);
  await tap('.tc-dodge'); await page.waitForTimeout(800);
  await tap('.tc-swap'); await page.waitForTimeout(800);
  await tap('.tc-gun', 400); await page.waitForTimeout(900);
  const ev = (await page.evaluate(() => __sh.game.metrics.events.map(e => e.t)));
  ok('タッチのボタン（斬・避・替・銃）', ['attackStart', 'dodge', 'swapStart', 'shot'].every(t => ev.includes(t)), [...new Set(ev.slice(-30))].join(','));
  await page.evaluate(() => { __sh.debug.freezeEnemies(false); __sh.input.script([{ f: 0, press: ['weapon1'] }]); __sh.debug.fastSim(30); });
  // スマホでもジャスト回避→見切り一閃 10/10（入力列・窓はタッチ +2f）
  await page.evaluate(() => { window.opt0 = { x: 0, z: -24 }; });
  let n = 0; for (let i = 0; i < 10; i++) if (await justDodgeIssen(page, 'kiro_1', { early: 5 })) n++;
  ok('スマホ：ジャスト回避→見切り一閃 10/10', n === 10, `${n}/10`);
  // 救う・倒す（スマホ）
  const r = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_2'); D.teleport(3.0, -19, Math.PI / 2); D.fastSim(3); const near = __sh.state().nearSpot; D.use('door_k2');
    for (let i = 0; i < 40 && g.enemies.find(e => e.id === 'kiro_2').brain.state !== 'home'; i++) D.fastSim(30);
    D.resetEnemy('kiro_4'); D.god(true); const k = () => g.enemies.find(e => e.id === 'kiro_4').brain;
    for (let i = 0; i < 12 && k().alive; i++) { D.teleport(0, -50, Math.PI); D.placeEnemy('kiro_4', 0, -51.3); D.fastSim(2); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 14, press: ['attack'] }, { f: 30, press: ['attack'] }]); D.fastSim(80); }
    D.god(false);
    return { near, rescued: g.enemies.find(e => e.id === 'kiro_2').brain.resolution, killed: k().resolution };
  });
  ok('スマホ：帰路を救う・倒す', r.near === 'door_k2' && r.rescued === 'rescue' && r.killed === 'kill', JSON.stringify(r));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_1'); D.teleport(0.4, -16, Math.PI); D.placeEnemy('kiro_1', 0.0, -19); g.cam.yaw = 0.2; g.cam.pitch = 0.15; D.fastSim(30); });
  await clearUI(page); await page.waitForTimeout(1500); await page.screenshot({ path: join(OUT, 'phone_01_street.png') });
  await page.evaluate(() => { const D = __sh.debug; D.resetEnemy('kiro_1'); D.heal(); D.teleport(0.6, -24, Math.PI); D.placeEnemy('kiro_1', 0.6, -25.4); D.fastSim(2); const W = D.forceAttack('kiro_1', 'shove'); __sh.input.script([{ f: W - 5, press: ['dodge'] }, { f: W + 2, press: ['attack'] }]); D.fastSim(W + 12); D.hold(true); });
  await page.waitForTimeout(600); await page.screenshot({ path: join(OUT, 'phone_02_issen.png') });
  await page.evaluate(() => __sh.debug.hold(false));
  await page.waitForTimeout(2500);
  const perf = await page.evaluate(() => ({ perf: __sh.debug.perf(), ri: __sh.debug.renderInfo(), q: __sh.game.settings }));
  ok('スマホ ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

const browser = await launch();
const report = {};
if (!ONLY || ONLY === 'pc') report.pc = await runPC(browser);
if (!ONLY || ONLY === 'phone') report.phone = await runPhone(browser);
await browser.close();
const fail = results.filter(r => !r.pass);
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, report }, null, 1));
console.log(`\n${results.length - fail.length}/${results.length} 合格`);
if (report.pc) console.log('PC 参考（ソフト描画）：', JSON.stringify(report.pc.perf));
if (report.phone) console.log('スマホ 参考（ソフト描画）：', JSON.stringify(report.phone.perf));
process.exit(fail.length ? 1 : 0);
