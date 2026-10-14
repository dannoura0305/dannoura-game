// 『境界侵食』の自動プレイ（Playwright）：フェーズ3「序章〜第2章（避難所）」を最初から収容者の決着まで通し、画面を撮る。
// フェーズ4：第2章の終わりから第3章（病院・地下通路・写し身・白髪形態）を通す（--only ch3｜ch3pc｜ch3phone）。
// 使い方：python3 -m http.server 8797 --directory <repo> を起動してから
//   node tools/shinshoku_play.mjs [出力フォルダ] [--base http://localhost:8797] [--only pc|phone]
// 環境変数：PW_MODULE（playwright の index.mjs）、PW_CHROMIUM（chromium の実行ファイル）
// 進め方：移動・攻撃・回避・弾く・調べる・持ち替えは入力列（__sh.input.script）で入れる。場所の移動の一部（長い道のり）だけ teleport を使う。
// 演出場面は一部を実際の時間で再生して撮り、残りは長押しと同じ「飛ばす」で進める。
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--')) || 'shinshoku_shots';
const BASE = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8797').replace(/\/$/, '');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
mkdirSync(OUT, { recursive: true });

const results = []; const ok = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`); };
const OTHER_KEYS = {
  dannoura_endings: JSON.stringify({ father: { count: 1 } }), dannoura_save_v1: JSON.stringify({ story: { flags: { white_seen: true } } }),
  kyokai_endings: JSON.stringify(['A']), kyokai_true_end: '1', kyokai_save_v1: JSON.stringify({ flags: { b30_read: true } }), tobi_save_v1: JSON.stringify({ toyama: false }),
};
const shots = [];
async function launch() { return chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); }
async function openGame(ctx, query, errs) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(keys => { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, OTHER_KEYS);
  const t0 = Date.now();
  await page.goto(`${BASE}/shinshoku.html?${query}`);
  await page.waitForFunction(() => window.__sh && ['play', 'dialog'].includes(window.__sh.state().mode), null, { timeout: 90000 });
  return { page, loadMs: Date.now() - t0 };
}
const S = page => page.evaluate(() => __sh.state());
const sim = (page, n) => page.evaluate(n => __sh.debug.fastSim(n), n);
const clearUI = page => page.evaluate(() => { const u = __sh.game.ui; u.toastT = 0; u.barkT = 0; u.el.toast.classList.remove('on'); u.el.bark.classList.remove('on'); u.el.card.classList.remove('on'); u.el.flash.className = 'sh-flash'; u.slow(false); __sh.game.slowT = 0; __sh.game.sfx.setMuffle(0); });
const otherKeys = page => page.evaluate(() => { const o = {}; const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); for (const k of ks.sort()) if (/^(dannoura_|kyokai_|tobi_)/.test(k)) o[k] = localStorage.getItem(k); return o; });
async function shot(page, name, wait = 1600) { await page.waitForTimeout(wait); await page.screenshot({ path: join(OUT, name) }); shots.push(name); }
const skipCut = page => page.evaluate(() => { __sh.debug.skipCutscene(); });
const skipDlg = page => page.evaluate(() => __sh.debug.skipDialog());
/** 歩いて行く（入力列：カメラを目的地の向きへ回して前へ）。届いたら true */
async function walkTo(page, x, z, maxFrames = 900, run = true) {
  return page.evaluate(({ x, z, maxFrames, run }) => {
    const g = __sh.game, P = g.player;
    for (let f = 0; f < maxFrames; f += 10) {
      const dx = x - P.pos.x, dz = z - P.pos.z; if (Math.hypot(dx, dz) < 0.6) return true;
      g.cam.yaw = Math.atan2(-dx, -dz);                       // カメラの前＝目的地
      __sh.input.script([{ f: 0, move: [0, 1, 10] }].concat(run ? [{ f: 0, hold: { run: 10 } }] : []));
      __sh.debug.fastSim(10);
      if (g.mode !== 'play' || g.cut.active) return 'interrupted';
    }
    return Math.hypot(x - P.pos.x, z - P.pos.z) < 1.0;
  }, { x, z, maxFrames, run });
}
/** 決まった入力列：敵に攻撃させて、ジャスト回避 → 見切り一閃 */
const isolate = (page, id) => page.evaluate(id => { for (const e of __sh.game.enemies) if (e.id !== id && e.root.visible && e.brain.alive) { e.root.visible = false; e.__iso = true; } }, id);
const unisolate = page => page.evaluate(() => { for (const e of __sh.game.enemies) if (e.__iso) { e.root.visible = true; e.__iso = false; } });
async function justDodgeIssen(page, id, at, early = 4) {
  return page.evaluate(async ({ id, at, early }) => {
    const D = __sh.debug, g = __sh.game;
    D.fastSim(40); D.resetEnemy(id); D.heal(); g.slowT = 0; g.hitstop = 0;
    g.player.fighter.chain = null;
    D.teleport(at[0], at[1], Math.PI); D.placeEnemy(id, at[0], at[1] - 1.4); D.fastSim(2);
    const before = __sh.state().metrics.issen.mikiri;
    const W = D.forceAttack(id, id.startsWith('heiten') ? 'jab' : 'shove');
    __sh.input.script([{ f: W - 1 - early, press: ['dodge'] }, { f: W + 5, press: ['attack'] }]);
    D.fastSim(W + 60);
    const okk = __sh.state().metrics.issen.mikiri - before === 1;
    return okk ? true : JSON.stringify({ W, st: g.player.fighter.state, ev: g.metrics.events.slice(-14).map(e => e.t) });
  }, { id, at, early }).then(r => { if (r !== true) console.log('  [justDodge fail]', r); return r === true; }).catch(e => { console.log(e.message); return false; });
}

// ───────────────────────── PC：序章から収容者の決着まで ─────────────────────────
async function runPC(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const { page, loadMs } = await openGame(ctx, 'autostart=1&perf=1', errs);
  const before = await otherKeys(page);
  const res = await page.evaluate(() => { const r = performance.getEntriesByType('resource'); let t = 0; for (const e of r) t += e.transferSize || e.encodedBodySize || 0; return { n: r.length, bytes: t }; });
  ok('PC 起動→操作可能（5 秒以内）', loadMs < 5000, `${loadMs}ms`);
  ok('読み込み合計 5MB 以下', res.bytes < 5 * 1048576, `${(res.bytes / 1048576).toFixed(2)}MB（${res.n} 件）`);
  let st = await S(page);
  ok('序章：最初の会話（データ駆動）・素手', st.mode === 'dialog' && st.step === 'pro_meet' && st.player.weapon === 'none');
  await shot(page, 'pc_01_intro.png', 1200);
  await skipDlg(page);
  // 移動（入力列）
  const z0 = (await S(page)).player.z; await page.evaluate(() => { __sh.game.cam.yaw = 0; __sh.input.move(0, 1, 90); }); await sim(page, 95);
  ok('移動（前へ 1.5 秒）', (await S(page)).player.z < z0 - 2, `z ${z0.toFixed(1)}→${(await S(page)).player.z.toFixed(1)}`);
  // 1. 相棒と会う → 「明かりが消える」（CS-00）を実時間で少し再生して撮る
  await page.evaluate(() => __sh.debug.teleport(0, -26, Math.PI));
  const r1 = await walkTo(page, -1.6, -31.6);
  st = await S(page); ok('序章：喫茶「灯」の前で相棒と会う（歩いて近づく → 会話）', st.mode === 'dialog' || r1 === 'interrupted', JSON.stringify({ r1, mode: st.mode }));
  await skipDlg(page); await sim(page, 2);
  st = await S(page); ok('CS-00「明かりが消える」が始まる（上下の黒い帯・字幕）', st.cut === 'cs00_lightsout');
  await sim(page, 60 * 9.6); await page.evaluate(() => __sh.debug.hold(true));
  await shot(page, 'pc_02_cutscene_lightsout.png', 2200);
  await page.evaluate(() => __sh.debug.hold(false));
  // 長押しで飛ばす（E を 1 秒）
  await page.evaluate(() => { __sh.input.script([{ f: 0, hold: { interact: 70 } }]); }); await sim(page, 80);
  st = await S(page); ok('演出場面は長押し 1 秒で飛ばせる（出来事は全部起きる：消灯・相棒が離れる）', !st.cut && st.step === 'pro_pipe' && st.flags.lights_out && !st.companion.visible, JSON.stringify({ cut: st.cut, step: st.step }));
  if (st.cut) await skipCut(page);
  // 2. 鉄パイプ → 帰路（序章）を追い払う
  await walkTo(page, -2.4, -30.0, 600, false);
  await page.evaluate(() => { __sh.input.press('interact'); __sh.debug.fastSim(4); });
  st = await S(page); ok('鉄パイプを拾う（調べる）→ 帰路が向かってくる', st.player.owned.includes('pipe') && st.player.weapon === 'pipe' && st.step === 'pro_fight', JSON.stringify(st.player.owned));
  const tut = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, k = g.enemies.find(e => e.id === 'kiro_t'); let parries = 0, hits0 = g.metrics.pipeHits || 0;
    for (let i = 0; i < 60 && !k.fleeing && k.brain.alive; i++) {
      const d = Math.hypot(k.pos.x - g.player.pos.x, k.pos.z - g.player.pos.z);
      if (d > 2.0) { g.cam.yaw = Math.atan2(-(k.pos.x - g.player.pos.x), -(k.pos.z - g.player.pos.z)); __sh.input.script([{ f: 0, move: [0, 1, 15] }]); D.fastSim(15); continue; }
      const b = k.brain;
      if (b.atk && b.atk.phase === 'windup') { const A = b.def.attacks[b.atk.name]; const left = Math.round((A.windup - b.atk.t) * 60); if (A.parryable) { __sh.input.script([{ f: Math.max(0, left - 3), press: ['parry'] }, { f: left + 4, press: ['attack'] }]); parries++; } else __sh.input.script([{ f: Math.max(0, left - 5), press: ['dodge'] }]); D.fastSim(left + 40); continue; }
      D.faceTo(k.pos.x, k.pos.z); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 22, press: ['attack'] }]); D.fastSim(55); D.heal();
    }
    D.fastSim(300);
    return { fleeing: k.fleeing, res: g.enemyRes.kiro_t, pipeHits: (g.metrics.pipeHits || 0) - hits0, parries, step: g.story.step };
  });
  ok('序章の戦い（鉄パイプ）：弱らせると帰路は暗がりへ帰っていく（逃げる）', tut.res === 'escape' && tut.step === 'pro_home' && (tut.pipeHits > 0 || tut.parries > 0), JSON.stringify(tut));
  // 3. 家へ → テレビ（CS-00 終わり）
  await page.evaluate(() => { __sh.debug.teleport(0, 4, 0); });
  await walkTo(page, 0, 9.6, 400, false); await walkTo(page, -3.4, 13.6, 400, false);
  await page.evaluate(() => { __sh.input.press('interact'); __sh.debug.fastSim(3); });
  st = await S(page); ok('家に戻ってソファ → テレビに研究者の顔が一瞬（音声なし）', st.cut === 'cs00_tv', st.cut);
  await sim(page, 60 * 4.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_03_cutscene_tv.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  st = await S(page); ok('第1章「帰路」へ（商店街は発生後の状態に）', st.step === 'ch1_katana' && st.enemies.filter(e => e.kind === 'kiro').length === 5, `${st.step} kiro=${st.enemies.filter(e => e.kind === 'kiro').length}`);
  // 4. 刀・金庫（任意）
  await walkTo(page, 5.0, 13.9, 400, false); await page.evaluate(() => { __sh.input.press('interact'); __sh.debug.fastSim(3); __sh.debug.skipDialog(); __sh.debug.fastSim(30); });
  st = await S(page); ok('居間の刀掛けで刀を取る（登録証つきの古い持ち物）', st.player.owned.includes('katana') && st.step === 'ch1_street', JSON.stringify(st.player.owned));
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-1.6, 15.0, 0); D.fastSim(3); D.use('calendar'); });
  const clue = await page.evaluate(() => document.querySelector('.sh-dtext').textContent);
  await page.evaluate(() => { __sh.debug.skipDialog(); __sh.debug.use('safe'); });
  const code = clue.match(/「([\d ]+)」/)[1].replace(/ /g, '');
  for (const c of code) await page.keyboard.press('Digit' + c);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const safe = await page.evaluate(() => { __sh.debug.skipDialog(); const s = __sh.state(); return { opened: !!s.flags.safe_opened, owned: s.player.owned, ammo: s.player.ammo, equip: s.equip }; });
  ok('金庫（任意）：カレンダーの番号で開く → 拳銃・弾 100 発・小型銃用ホルスター', safe.opened && safe.owned.includes('handgun') && safe.ammo >= 100 && safe.equip.includes('holster'), JSON.stringify({ code, ...safe }));
  // 5. 発生後の商店街：一閃・弾き・居合・赤い予兆・銃・救う・倒す
  await isolate(page, 'kiro_1');
  let n = 0; for (let i = 0; i < 10; i++) if (await justDodgeIssen(page, 'kiro_1', [0, -24])) n++;
  await unisolate(page);
  ok('ジャスト回避→見切り一閃（入力列 10 回）', n === 10, `${n}/10`);
  await isolate(page, 'kiro_2');
  const parry = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; let ok = 0;
    for (let i = 0; i < 5; i++) { D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.fastSim(2); const b = __sh.state().metrics.issen.hajiki; const W = D.forceAttack('kiro_2', 'shove'); __sh.input.script([{ f: W - 4, press: ['parry'] }, { f: W + 4, press: ['attack'] }]); D.fastSim(W + 60); if (__sh.state().metrics.issen.hajiki - b === 1) ok++; }
    return ok;
  });
  ok('パリィ→弾き一閃（入力列 5 回）', parry === 5, `${parry}/5`);
  const iai = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.freezeEnemies(true); D.fastSim(2); const b = __sh.state().metrics.issen.iai; __sh.input.script([{ f: 0, hold: { heavy: 120 } }]); D.fastSim(45); D.freezeEnemies(false); const W = D.forceAttack('kiro_2', 'grab'); D.fastSim(W + 50); return __sh.state().metrics.issen.iai - b; });
  ok('居合の構え（長押し）→抜刀一閃（弾けないつかみにも）', iai === 1);
  const red = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_2'); D.heal(); g.slowT = 0; D.teleport(0, -30, Math.PI); D.placeEnemy('kiro_2', 0, -31.4); D.fastSim(2); const p0 = __sh.state().metrics.parry, h0 = g.player.fighter.hp; const W = D.forceAttack('kiro_2', 'grab'); __sh.input.script([{ f: W - 3, press: ['parry'] }]); D.fastSim(W + 10); return { parried: __sh.state().metrics.parry - p0, dmg: h0 - g.player.fighter.hp }; });
  ok('赤い予兆（つかみ）は弾けない', red.parried === 0 && red.dmg > 0, JSON.stringify(red));
  await unisolate(page); await isolate(page, 'kiro_4');
  const gun = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); g.slowT = 0; g.hitstop = 0; D.resetEnemy('kiro_4'); D.freezeEnemies(true);
    g.equipped = []; g.applyEquip(); g.lock = null; D.fastSim(30);
    D.teleport(0, -40, Math.PI); D.placeEnemy('kiro_4', 0, -45); D.fastSim(40); D.faceTo(0, -45); g.cam.pitch = 0.08;
    __sh.input.script([{ f: 0, press: ['weapon1'] }]); D.fastSim(20);
    const s0 = g.metrics.swaps.length;
    __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(14);
    const m0 = __sh.state().metrics; __sh.input.script([{ f: 0, hold: { aim: 30 } }, { f: 12, press: ['attack'] }]); D.fastSim(32); const m1 = __sh.state().metrics;
    const mag1 = g.player.fighter.mag; __sh.input.script([{ f: 0, press: ['reload'] }]); D.fastSim(90); const mag2 = g.player.fighter.mag;
    __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(14);
    __sh.input.script([{ f: 0, press: ['attack'] }, { f: 18, hold: { aim: 12 } }]); D.fastSim(40);
    const ev = g.metrics.events.slice(-60); const q = ev.filter(e => e.t === 'swapStart').pop(), sh = ev.filter(e => e.t === 'shot').pop();
    // ホルスターを付けると速くなる
    __sh.input.script([{ f: 0, press: ['weapon1'] }]); D.fastSim(30);
    g.equipped = ['holster']; g.applyEquip(); __sh.input.script([{ f: 0, press: ['swap'] }]); D.fastSim(14); const sw3 = g.metrics.swaps[g.metrics.swaps.length - 1];
    __sh.input.script([{ f: 0, press: ['weapon1'] }]); D.fastSim(30);
    D.freezeEnemies(false);
    return { kpos: [g.enemies.find(e => e.id === 'kiro_4').pos.x.toFixed(1), g.enemies.find(e => e.id === 'kiro_4').pos.z.toFixed(1)], ppos: [g.player.pos.x.toFixed(1), g.player.pos.z.toFixed(1)], w0: g.player.fighter.weapon, st: g.player.fighter.st.name, sw: g.metrics.swaps.slice(s0, s0 + 2), evs: ev.slice(-10).map(e => e.t + '@' + e.frame), shots: m1.shots - m0.shots, hits: m1.shotHits - m0.shotHits, mag1, mag2, quick: q && sh ? sh.frame - q.frame : null, holster: sw3 };
  });
  await unisolate(page);
  ok('刀→銃の持ち替え 9f（150ms）・銃→刀 9f', gun.sw[0] && gun.sw[0].frames === 9 && gun.sw[0].measured === 9 && gun.sw[1] && gun.sw[1].measured === 9, JSON.stringify(gun.sw));
  ok('構えて撃つ（命中）・装填', gun.shots === 1 && gun.hits === 1 && gun.mag2 === 12 && gun.mag1 === 11, JSON.stringify({ shots: gun.shots, hits: gun.hits, mag: [gun.mag1, gun.mag2], evs: gun.evs, k: gun.kpos, p: gun.ppos }));
  ok('切替撃ち 4f（67ms）で 1 発目', gun.quick === 4, `${gun.quick}f`);
  ok('装備「小型銃用ホルスター」で刀→銃 6f', gun.holster && gun.holster.measured === 6, JSON.stringify(gun.holster));
  // 構えの画面
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_4'); D.teleport(0.5, -40, Math.PI); D.placeEnemy('kiro_4', 0.2, -46); D.faceTo(0.2, -46); g.cam.pitch = 0.06; D.freezeEnemies(true); __sh.input.script([{ f: 0, press: ['weapon2'] }, { f: 0, hold: { aim: 200 } }]); D.fastSim(30); D.hold(true); });
  await clearUI(page); await shot(page, 'pc_04_aim_hud.png', 2000);
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(200); __sh.debug.freezeEnemies(false); __sh.input.script([{ f: 0, press: ['weapon1'] }]); __sh.debug.fastSim(30); });
  const rescue = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_3');
    D.teleport(-8, -29.5, -Math.PI / 2); D.placeEnemy('kiro_3', -9.5, -29.5); D.forceAttack('kiro_3', 'shove'); D.fastSim(20);
    const k = () => g.enemies.find(e => e.id === 'kiro_3').brain;
    D.teleport(-14.6, -29.5, -Math.PI / 2); D.fastSim(3); const near = __sh.state().nearSpot;
    __sh.input.script([{ f: 0, press: ['interact'] }]); D.fastSim(2); const st1 = k().state;
    D.teleport(-6, -29.5, Math.PI / 2); for (let i = 0; i < 40 && k().state !== 'home'; i++) D.fastSim(30);
    const a0 = __sh.state().metrics.enemyAttacks.kiro_3 || 0; D.teleport(-14.2, -29.5, -Math.PI / 2); D.fastSim(900);
    return { near, st1, st: k().state, res: k().resolution, attacksAfter: (__sh.state().metrics.enemyAttacks.kiro_3 || 0) - a0 };
  });
  ok('帰路を救う（戸の鍵を開ける→家族と取り違え→家に入る）・救った後は攻撃しない', rescue.near === 'door_k3' && rescue.st1 === 'family' && rescue.st === 'home' && rescue.res === 'rescue' && rescue.attacksAfter === 0, JSON.stringify(rescue));
  const kill = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_5'); D.god(true); const k = () => g.enemies.find(e => e.id === 'kiro_5').brain;
    for (let i = 0; i < 12 && k().alive; i++) { D.teleport(0, -60, Math.PI); D.placeEnemy('kiro_5', 0, -61.3); D.fastSim(2); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 14, press: ['attack'] }, { f: 30, press: ['attack'] }]); D.fastSim(80); }
    D.god(false); D.fastSim(150); return { st: k().state, res: k().resolution, visible: g.enemies.find(e => e.id === 'kiro_5').root.visible };
  });
  ok('帰路を倒す（黒い霧になって崩れる）', kill.st === 'dead' && kill.res === 'kill' && !kill.visible, JSON.stringify(kill));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.heal(); D.placeEnemy('heiten_1', 8.3, -36.4); D.teleport(5.9, -36.6, Math.PI / 2); D.fastSim(2); D.faceTo(8.3, -36.4); g.cam.yaw = -Math.PI / 2 - 0.6; g.cam.pitch = 0.12; const W = D.forceAttack('heiten_1', 'shutter'); D.fastSim(W - 12); D.hold(true); });
  await clearUI(page); await shot(page, 'pc_05_heiten.png', 1800);
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(100); });
  const heiten = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; const H = () => g.enemies.find(e => e.id === 'heiten_1').brain; let loops = 0, broken0 = g.metrics.broken || 0;
    __sh.input.script([{ f: 0, press: ['weapon3'] }]); D.fastSim(40);
    while (H().alive && loops < 14) { loops++; D.heal(); g.slowT = 0; g.hitstop = 0; D.fastSim(30); D.placeEnemy('heiten_1', 8.0, -36.3); D.teleport(6.1, -36.3, Math.PI / 2); D.faceTo(8.0, -36.3); D.fastSim(2); const W = D.forceAttack('heiten_1', 'jab'); __sh.input.script([{ f: W - 4, press: ['parry'] }, { f: W + 4, press: ['attack'] }, { f: W + 40, press: ['attack'] }]); D.fastSim(W + 90); }
    return { st: H().state, res: H().resolution, loops, broken: (g.metrics.broken || 0) - broken0, w: g.player.fighter.weapon };
  });
  ok('閉店を倒す（鉄パイプ：弾き一閃・体幹崩し）', heiten.st === 'dead' && heiten.res === 'kill', JSON.stringify(heiten));
  // 6. 裏路地へ（空き店舗）→ 道を開ける → 再会
  await page.evaluate(() => { __sh.input.script([{ f: 0, press: ['weapon1'] }]); __sh.debug.fastSim(30); __sh.debug.heal(); __sh.debug.teleport(-2.5, -64.5, Math.PI); });
  await walkTo(page, -3.4, -66.4, 300, false);
  await page.evaluate(() => { __sh.input.press('interact'); __sh.debug.fastSim(40); });
  st = await S(page); ok('空き店舗の奥から裏路地へ（区画の読み込み）', st.area === 'alley' && st.step === 'ch1_alley', `${st.area} ${st.step}`);
  const pass = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, k = g.enemies.find(e => e.id === 'kiro_a1'), b = k.brain;
    b.pos.x = 0; b.pos.z = -2; b.idx = 1; b.dir = 1; b.sub = 'walk'; D.teleport(-2.4, -10, 0); g.cam.yaw = -Math.PI / 2;     // 祠のくぼみに寄る
    let hostile = false, looked = false; const a0 = g.metrics.enemyAttacks.kiro_a1 || 0; for (let i = 0; i < 60 * 14; i++) { D.fastSim(1); if (b.state === 'hostile') hostile = true; if (b.state === 'assess') looked = true; }
    return { hostile, looked, attacks: (g.metrics.enemyAttacks.kiro_a1 || 0) - a0, z: b.pos.z, state: b.state, x: b.pos.x };
  });
  ok('帰路の道を開ける（くぼみに寄る）と素通りする＝倒さずに抜けられる（見定めはしても襲わない）', !pass.hostile && pass.attacks === 0 && (pass.z < -14 || pass.x > 2), JSON.stringify(pass));
  await page.evaluate(() => { __sh.debug.use('shrine'); __sh.debug.skipDialog(); });
  st = await S(page); ok('祠で「見切り補助」（装備）を拾う', st.equip.includes('mikiri'), JSON.stringify(st.equip));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; const k = g.enemies.find(e => e.id === 'kiro_a1'); if (k) { k.brain.pos.x = 0; k.brain.pos.z = -3; k.brain.idx = 1; k.brain.dir = 1; } D.teleport(0, -18, Math.PI); });
  await walkTo(page, 2.9, -22.0, 400, false);
  await sim(page, 4); st = await S(page);
  ok('裏路地で相棒と再会（CS：坂口さんに気づく）', st.cut === 'cs01_reunion', st.cut);
  await sim(page, 60 * 5.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_06_cutscene_reunion.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  st = await S(page); ok('相棒がついてくる（同行の AI）', st.companion.mode === 'follow' && st.companion.visible, JSON.stringify(st.companion));
  const follow = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.cam.yaw = -Math.PI / 2; __sh.input.script([{ f: 0, move: [0, 1, 200] }]); D.fastSim(200); const c = g.companion.brain.pos, p = g.player.pos; return { d: Math.hypot(c.x - p.x, c.z - p.z), clips: __sh.state().metrics.wallClips }; });
  ok('相棒は角を曲がっても 2〜5m 後ろをついてくる', follow.d > 1.2 && follow.d < 6, JSON.stringify(follow));
  // 7. 商業施設の前 → 放送（第1章の終わり）→ 第2章
  await walkTo(page, 12, -22.9, 400, false); await sim(page, 30);
  st = await S(page); ok('表通り（商業施設の前）へ → 避難所の放送が同じ文で途切れる', st.area === 'plaza' && st.cut === 'cs01_broadcast', `${st.area} ${st.cut}`);
  await sim(page, 60 * 4.4); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_07_cutscene_broadcast.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  st = await S(page); ok('第2章へ（目標：避難所）', st.step === 'ch2_shelter' && st.flags.plaza_broadcast);
  // 防犯映像（任意）
  await page.evaluate(() => { __sh.debug.teleport(11.2, -9.6, Math.PI); __sh.debug.fastSim(3); __sh.debug.use('cctv'); });
  await page.waitForTimeout(400); await page.screenshot({ path: join(OUT, 'pc_08_cctv.png') }); shots.push('pc_08_cctv.png');
  const cctv = await page.evaluate(() => { const ans = [...__sh.game.ui.el.puz.querySelectorAll('[data-cam]')]; ans.find(b => b.dataset.cam === 'cam1').click(); const wrong = !__sh.state().flags.cctv_done; ans.find(b => b.dataset.cam === 'cam3').click(); __sh.debug.skipDialog(); return { wrong, done: __sh.state().flags.cctv_done, equip: __sh.state().equip }; });
  ok('防犯映像の照合（任意）：あり得ない記録を選ぶ → 抜刀補助', cctv.wrong && cctv.done, JSON.stringify(cctv));
  // 連鎖一閃（2 体同時の攻撃 → ジャスト回避 → 見切り一閃 → 連鎖）
  const chain = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; let c = 0; const c0 = g.metrics.issen.chain || 0;
    for (let t = 0; t < 3; t++) { D.heal(); D.resetEnemy('kiro_p1'); D.resetEnemy('kiro_p2'); g.slowT = 0; g.hitstop = 0; D.teleport(0, 6, Math.PI); D.placeEnemy('kiro_p1', 0, 4.6); D.placeEnemy('kiro_p2', 1.3, 5.0); D.fastSim(2);
      const W = D.forceAttack('kiro_p1', 'shove'); D.forceAttack('kiro_p2', 'shove'); __sh.input.script([{ f: W - 5, press: ['dodge'] }, { f: W + 2, press: ['attack'] }, { f: W + 40, press: ['attack'] }]); D.fastSim(W + 110); }
    return { chains: (g.metrics.issen.chain || 0) - c0, max: g.metrics.chainMax };
  });
  ok('連鎖一閃：見切り一閃の直後、青い縁の敵へ跳んで一閃（3 回中 3 回）', chain.chains === 3, JSON.stringify(chain));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.heal(); D.resetEnemy('kiro_p1'); D.resetEnemy('kiro_p2'); D.teleport(0, 6, Math.PI); D.placeEnemy('kiro_p1', 0, 4.6); D.placeEnemy('kiro_p2', 1.3, 5.0); D.fastSim(2); g.cam.yaw = Math.PI * 0.2; g.cam.pitch = 0.15; const W = D.forceAttack('kiro_p1', 'shove'); D.forceAttack('kiro_p2', 'shove'); __sh.input.script([{ f: W - 5, press: ['dodge'] }, { f: W + 2, press: ['attack'] }, { f: W + 40, press: ['attack'] }]); D.fastSim(W + 49); D.hold(true); });
  await shot(page, 'pc_09_chain_issen.png', 2000);
  await page.evaluate(() => { __sh.debug.hold(false); __sh.debug.fastSim(120); });
  const lockSw = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.resetEnemy('kiro_p1'); D.resetEnemy('kiro_p2'); D.freezeEnemies(true); D.teleport(0, 6, Math.PI); g.cam.yaw = 0; D.placeEnemy('kiro_p1', -1.5, 2); D.placeEnemy('kiro_p2', 1.5, 2); D.fastSim(3); g.lock = null; __sh.input.press('lock'); D.fastSim(2); const a = __sh.state().lock; __sh.input.press(a === 'kiro_p1' ? 'lockNext' : 'lockPrev'); D.fastSim(2); const b = __sh.state().lock; D.freezeEnemies(false); return { a, b }; });
  ok('ロックオンの相手の切替（Z／C）', lockSw.a && lockSw.b && lockSw.a !== lockSw.b, JSON.stringify(lockSw));
  // 8. 避難所：名簿の照合（必須）→ 引き出し → 体育館
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; for (const id of ['kiro_p1', 'kiro_p2']) { const e = g.enemies.find(x => x.id === id); if (e && e.brain.alive) { e.brain.state = 'loop'; e.brain.hostileBy = null; e.brain.pos.x = -12; e.brain.pos.z = 10; } } D.teleport(14, 5, Math.PI / 2); D.fastSim(5); });
  await walkTo(page, 17.6, 5, 300, false); await sim(page, 40); await skipDlg(page);
  st = await S(page); ok('避難所へ（目標：名簿と受付票）', st.area === 'shelter' && st.step === 'ch2_roster', `${st.area} ${st.step}`);
  const g1 = await page.evaluate(() => { const D = __sh.debug; D.teleport(0, 16, Math.PI); D.fastSim(2); D.use('gym_door'); const locked = document.querySelector('.sh-dtext').textContent; D.skipDialog(); return locked; });
  ok('体育館の戸は鍵（照合の前は入れない）', /鍵/.test(g1), g1);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-5.6, 15.4, -Math.PI / 2); D.fastSim(2); D.use('roster'); D.skipDialog(); D.teleport(-0.4, 13.8, Math.PI); D.fastSim(2); D.use('cards'); D.skipDialog(); });
  await page.waitForTimeout(300);
  st = await S(page); ok('名簿と受付票を調べると照合の画面が開く', st.mode === 'puzzle');
  await shot(page, 'pc_10_roster.png', 500);
  const roster = await page.evaluate(async () => {
    const g = __sh.game, R = g.rosterView(); let wrong = 0;
    const clickPick = name => { const b = [...g.ui.el.puz.querySelectorAll('[data-pick]')].find(x => x.dataset.pick === name); if (b) b.click(); return !!b; };
    // 1 回ちがう人を選ぶ
    const firstCard = R.cards('A')[0]; clickPick(firstCard); wrong = g.puz.roster.miss;
    for (const grp of R.groups) { const tab = g.ui.el.puz.querySelector(`[data-g="${grp}"]`); if (tab) tab.click(); const miss = R.people.find(p => p.group === grp && p.missing); clickPick(miss.name); }
    await new Promise(r => setTimeout(r, 600));
    __sh.debug.skipDialog();
    return { wrong, done: !!g.flags.roster_done, step: g.story.step };
  });
  ok('名簿の食い違い（必須）：班ごとに受付票の無い人を選ぶ（6 人）', roster.done && roster.step === 'ch2_key' && roster.wrong === 1, JSON.stringify(roster));
  const drawer = await page.evaluate(() => { const D = __sh.debug; D.teleport(1.4, 13.6, Math.PI); D.fastSim(2); D.use('drawer'); const btn = n => [...__sh.game.ui.el.puz.querySelectorAll('[data-n]')].find(b => b.dataset.n === String(n)); btn(3).click(); const k1 = !!__sh.state().flags.gym_key; btn(6).click(); D.skipDialog(); return { k1, key: !!__sh.state().flags.gym_key }; });
  ok('鍵は「未着の人数」の番号の引き出し（6）', !drawer.k1 && drawer.key, JSON.stringify(drawer));
  await page.evaluate(() => { const D = __sh.debug; D.teleport(0, 11.4, Math.PI); D.fastSim(2); __sh.input.press('interact'); D.fastSim(3); D.use('torn_tag'); D.skipDialog(); });
  st = await S(page); ok('体育館の戸を開ける', st.step === 'ch2_gym', st.step);
  await page.evaluate(() => { __sh.debug.teleport(0, 8.5, Math.PI); __sh.debug.fastSim(2); });
  await walkTo(page, 0.2, 0.6, 400, false); await sim(page, 3);
  st = await S(page); ok('体育館の真ん中で点呼が始まる → 収容者が起き上がる（CS）', st.cut === 'cs02_boss', st.cut);
  await sim(page, 60 * 9.0); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_11_cutscene_boss.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  // 9. 収容者と戦う（自動の戦い方：白い予兆は弾く・赤い予兆は避ける・あいてる時に斬る。god は使わない）
  await page.evaluate(() => { __sh.game.items.medkit_l = (__sh.game.items.medkit_l || 0) + 2; __sh.game.items.medkit_s = (__sh.game.items.medkit_s || 0) + 3; });
  const fight = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, P = g.player, b = g.boss.brain;
    const log = { parries: 0, dodges: 0, combos: 0, heals: 0, deaths: 0, hajiki: g.metrics.issen.hajiki || 0, mikiri: g.metrics.issen.mikiri || 0, phases: [], rollcalls: 0, darkLight: false, shotsWeak: 0 };
    let shotPhase = false;
    for (let it = 0; it < 900 && b.alive; it++) {
      if (g.mode === 'dead' || P.fighter.dead) { log.deaths++; g.retry(); D.fastSim(10); if (g.cut.active) D.skipCutscene(); continue; }
      if (g.mode === 'dialog') D.skipDialog();
      if (b.phase > (log.phases[log.phases.length - 1] ?? 0)) { log.phases.push(b.phase); if (b.phase === 1 && !g.flashlightOn) { __sh.input.press('light'); D.fastSim(1); log.darkLight = true; } }
      if (P.fighter.hp < 45 && (g.items.medkit_l || g.items.medkit_s)) { __sh.input.press('heal'); D.fastSim(2); log.heals++; }
      const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (b.state === 'rollcall') { log.rollcalls++; D.faceTo(b.pos.x, b.pos.z); if (!shotPhase && g.player.fighter.owned.includes('handgun')) { shotPhase = true; } __sh.input.script([{ f: 0, press: ['attack'] }]); D.fastSim(20); continue; }
      if (b.atk && b.atk.phase === 'windup') {
        const A = b.def.attacks[b.atk.name], left = Math.max(0, Math.round((A.windup - b.atk.t) * 60));
        if (A.parryable && d < A.range + 1) { __sh.input.script([{ f: Math.max(0, left - 3), press: ['parry'] }, { f: left + 4, press: ['attack'] }]); D.fastSim(left + 30); log.parries++; continue; }
        if (!A.parryable) { const lead = A.dash ? 5 : 4; g.cam.yaw = Math.atan2(dx, dz) + Math.PI / 2 + Math.PI; __sh.input.script([{ f: Math.max(0, left - lead), move: [1, 0, 14] }, { f: Math.max(0, left - lead), press: ['dodge'] }, { f: left + 6, press: ['attack'] }]); D.fastSim(left + 36); log.dodges++; continue; }
      }
      if (b.atk) { D.fastSim(6); continue; }
      if (d > 2.4) { g.cam.yaw = Math.atan2(-dx, -dz); __sh.input.script([{ f: 0, move: [0, 1, 12] }, { f: 0, hold: { run: 12 } }]); D.fastSim(12); continue; }
      D.faceTo(b.pos.x, b.pos.z); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 16, press: ['attack'] }]); D.fastSim(34); log.combos++;
      if (b.state === 'stuck') { D.fastSim(10); }
    }
    D.fastSim(60 * 3);
    log.res = b.resolution; log.state = b.state; log.hp = b.hp; log.hajiki = (g.metrics.issen.hajiki || 0) - log.hajiki; log.mikiri = (g.metrics.issen.mikiri || 0) - log.mikiri; log.cut = g.cut.active ? g.cut.cs.id : null; log.playerHp = P.fighter.hp; log.broken = g.metrics.broken || 0;
    return log;
  });
  ok('収容者を倒す（自動の戦い方・god なし：弾く／避ける／斬る）', fight.res === 'kill', JSON.stringify(fight));
  ok('収容者：段階（照明が落ちる→懐中電灯）と点呼が起きる', fight.phases.includes(1) && fight.phases.includes(2) && fight.rollcalls > 0 && fight.darkLight, JSON.stringify({ phases: fight.phases, rc: fight.rollcalls }));
  await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_12_boss_end.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 30);
  st = await S(page); ok('決着の演出 → 第2章（試作）ここまでの札', st.step === 'ch2_end' && st.metrics.endCard, `${st.step}`);
  await shot(page, 'pc_13_endcard.png', 800);
  await page.evaluate(() => __sh.debug.closeMenu());
  // 10. セーブ → 再読み込み
  const snap = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(-2.2, 4.5, 1.1); g.player.fighter.hp = 73; D.fastSim(2); const okSave = __sh.save('slot1'); const s = __sh.state(); return { okSave, area: s.area, step: s.step, x: s.player.x, z: s.player.z, hp: s.player.hp, ammo: s.player.ammo, owned: s.player.owned, equip: s.equip, res: s.enemyRes, comp: s.companion.mode }; });
  await page.reload();
  await page.waitForFunction(() => window.__sh && ['play', 'dialog'].includes(window.__sh.state().mode), null, { timeout: 90000 });
  const back = await page.evaluate(() => { __sh.debug.skipDialog(); __sh.load('slot1'); const s = __sh.state(); return { area: s.area, step: s.step, x: s.player.x, z: s.player.z, hp: s.player.hp, ammo: s.player.ammo, owned: s.player.owned, equip: s.equip, res: s.enemyRes, comp: s.companion.mode }; });
  const same = snap.okSave && back.area === snap.area && back.step === snap.step && Math.abs(back.x - snap.x) < 0.01 && back.hp === snap.hp && back.ammo === snap.ammo && JSON.stringify(back.owned) === JSON.stringify(snap.owned) && JSON.stringify(back.equip) === JSON.stringify(snap.equip) && JSON.stringify(back.res) === JSON.stringify(snap.res);
  ok('セーブ→再読み込みで区画・段・位置・体力・弾・武器・装備・敵の決着・相棒が戻る', same, JSON.stringify({ snap, back }));
  // 救う・閉じ込める（別の道）
  const alt = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; const out = {};
    for (const how of ['rescue', 'neutralize']) {
      D.jump('ch2_gym'); delete g.enemyRes.shuuyou_1; g.spawnEnemies('shelter'); D.teleport(0, 1.0, Math.PI); D.fastSim(4); D.skipCutscene(); D.heal(); D.god(true);
      const b = g.boss.brain;
      if (how === 'rescue') {
        for (let i = 0; i < 80 && b.state !== 'rollcall'; i++) D.fastSim(10);
        D.teleport(5.6, -13.6, Math.PI); D.fastSim(2); D.use('pa_mic');
        const btn = [...g.ui.el.puz.querySelectorAll('[data-name]')].find(x => x.dataset.name === '久住 トキ'); if (btn) btn.click();
      } else {
        b.rcT = -999; for (let t = 0; t < 30 && b.state !== 'stuck'; t++) { D.heal(); g.player.pos.set(13.0, 0, -4.1); D.fastSim(1); b.pos.x = 5; b.pos.z = -4.1; b.atk = null; b.state = 'hostile'; b.cool = 0; const W = D.forceAttack('shuuyou_1', 'charge'); __sh.input.script([{ f: W - 6, press: ['dodge'] }]); D.fastSim(W + 6); D.teleport(11.0, 0.5); D.fastSim(90); }
        D.teleport(13.4, -1.1, Math.PI); D.fastSim(2); D.use('storage_shutter');
      }
      D.fastSim(200); out[how] = { res: b.resolution, state: b.state, cut: g.cut.active ? g.cut.cs.id : null }; D.skipCutscene(); D.closeMenu(); D.god(false);
    }
    return out;
  });
  ok('収容者を救う（点呼の時にマイクで「久住 トキ」）', alt.rescue.res === 'rescue', JSON.stringify(alt.rescue));
  ok('収容者を閉じ込める（突進を器具庫へ→シャッター）', alt.neutralize.res === 'neutralize', JSON.stringify(alt.neutralize));
  // 5 分の歩き回り（壁抜け・場外 0）
  const walk = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.god(true); D.freezeEnemies(true);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    D.jump('ch1_street'); D.teleport(0, -8, Math.PI); g.metrics.wallClips = 0; g.metrics.outOfBounds = 0;
    for (let i = 0; i < 18000; i += 45) {
      const a = rnd() * Math.PI * 2; __sh.input.script([{ f: 0, move: [Math.cos(a), Math.sin(a), 45] }].concat(rnd() < 0.3 ? [{ f: 5, hold: { run: 40 } }] : []).concat(rnd() < 0.15 ? [{ f: 10, press: ['dodge'] }] : []));
      g.cam.yaw += (rnd() - 0.5) * 1.5; D.fastSim(45);
      if (g.mode !== 'play') { D.skipDialog(); g.mode = 'play'; }
      if (g.cut.active) D.skipCutscene();
    }
    D.god(false); D.freezeEnemies(false);
    const m = __sh.state().metrics; return { clips: m.wallClips, oob: m.outOfBounds, step: g.story.step };
  });
  ok('歩き回り 5 分（18000 ステップ）で壁抜け・場外 0', walk.clips === 0 && walk.oob === 0, JSON.stringify(walk));
  // ゲームパッド
  const pad = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game; D.jump('ch1_street'); D.freezeEnemies(true); D.teleport(0, 2, Math.PI); g.cam.yaw = 0; D.fastSim(2);
    const btn = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const pad = { connected: true, axes: [0, -1, 0, 0], buttons: btn(), mapping: 'standard' }; const orig = navigator.getGamepads; navigator.getGamepads = () => [pad];
    const z0 = g.player.pos.z; D.fastSim(60); const z1 = g.player.pos.z;
    pad.axes = [0, 0, 0, 0]; pad.buttons[0] = { pressed: true, value: 1 }; D.fastSim(1); const st = g.player.fighter.st.name; pad.buttons[0] = { pressed: false, value: 0 }; D.fastSim(40);
    pad.buttons[13] = { pressed: true, value: 1 }; D.fastSim(1); pad.buttons[13] = { pressed: false, value: 0 }; D.fastSim(2); const light = g.flashlightOn;
    navigator.getGamepads = orig; g.input.device = 'kbm'; D.freezeEnemies(false);
    return { moved: z0 - z1, dodge: st, light };
  });
  ok('ゲームパッド（左スティック移動・A 回避・十字キー下で懐中電灯）', pad.moved > 1 && pad.dodge === 'dodge' && pad.light, JSON.stringify(pad));
  // キャラクターの寄り
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.flashlightOn = false; D.jump('ch1_katana'); D.freezeEnemies(true); D.god(true); D.heal(); g.player.fighter.hp = g.player.fighter.maxHp || g.player.fighter.hp; g.player.fighter._go('free'); g.hitstop = 0; g.slowT = 0; D.teleport(-1.0, 12.5, 0.4); D.fastSim(40); g.player.fighter._go('free'); D.fastSim(20); D.view('closeup', { who: 'player', dist: 1.05, side: 0.3, y: 1.47, fov: 34 }); });
  await clearUI(page); await shot(page, 'pc_14_dannoura_face.png', 2200);
  await page.evaluate(() => { __sh.debug.view('closeup', { who: 'player', dist: 3.1, side: 0.5, y: 0.95, fov: 40 }); }); await shot(page, 'pc_15_dannoura_full.png', 1500);
  await page.evaluate(() => { __sh.debug.view('closeup', { who: 'player', dist: 2.6, side: 2.7, y: 1.0, fov: 40 }); }); await shot(page, 'pc_16_dannoura_back.png', 1500);
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.view('normal'); D.jump('ch2_gym'); g.companion.brain.pos = { x: 0.5, z: 6.5 }; g.companion.brain.yaw = 0.3; g.companion.brain.setMode('wait'); D.freezeEnemies(true); D.teleport(0, 8.5, Math.PI); D.fastSim(10); g.companion.brain.pos = { x: 0.5, z: 6.5 }; g.companion.brain.yaw = 0.3; g.companion.brain.setMode('wait'); D.fastSim(30); D.view('closeup', { who: 'companion', dist: 1.0, side: 0.25, y: 1.42, fov: 34 }); });
  await clearUI(page); await shot(page, 'pc_17_companion_face.png', 2200);
  await page.evaluate(() => { __sh.debug.view('closeup', { who: 'companion', dist: 3.0, side: 0.5, y: 0.9, fov: 40 }); }); await shot(page, 'pc_18_companion_full.png', 1500);
  await page.evaluate(() => { __sh.debug.freezeEnemies(false); __sh.debug.god(false); });
  // 区画ごとの描画の数（参考）
  const perf = {};
  for (const [step, x, z, yaw] of [['pro_meet', 0, -12, Math.PI], ['ch1_street', 0.5, -24, Math.PI], ['ch1_alley', 0, -4, Math.PI], ['ch2_shelter', -6, 8, Math.PI * 0.85], ['ch2_boss', 0, 4, Math.PI]]) {
    await page.evaluate(({ step, x, z, yaw }) => { const D = __sh.debug, g = __sh.game; D.view('normal'); delete g.enemyRes.shuuyou_1; D.jump(step); D.skipCutscene(); D.teleport(x, z, yaw); g.cam.pitch = 0.1; if (step === 'ch2_boss') { g.boss.brain.state = 'dormant'; g.boss.brain.wake([]); } D.fastSim(20); }, { step, x, z, yaw });
    await page.waitForTimeout(1600);
    perf[step] = await page.evaluate(() => Object.assign(__sh.debug.renderInfo(), { fps: __sh.debug.perf() && +__sh.debug.perf().fps.toFixed(1) }));
    if (step === 'ch1_street') { await clearUI(page); await shot(page, 'pc_19_street.png', 600); }
    if (step === 'ch2_shelter') { await clearUI(page); await shot(page, 'pc_20_plaza.png', 600); }
    if (step === 'ch2_boss') { await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.cam.yaw = -0.4; g.cam.pitch = 0.22; D.teleport(0, -1.4, Math.PI); const W = D.forceAttack('shuuyou_1', 'slam'); D.fastSim(W - 15); D.hold(true); }); await clearUI(page); await shot(page, 'pc_21_boss_telegraph.png', 1800); await page.evaluate(() => __sh.debug.hold(false)); }
  }
  // 他作品のキー
  const aft = await otherKeys(page);
  ok('他作品のキー（dannoura_*・kyokai_*・tobi_*）が変わらない', JSON.stringify(aft) === JSON.stringify(before));
  const own = await page.evaluate(() => { const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); return ks.filter(k => !/^(dannoura_|kyokai_|tobi_)/.test(k)).sort(); });
  ok('本作が書いたキーは shinshoku_* と wakaba_progress_v1 だけ', own.every(k => /^shinshoku_/.test(k) || k === 'wakaba_progress_v1'), own.join(','));
  ok('PC ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

// ───────────────────────── スマホ横（タッチ）：同じ流れを最初から ─────────────────────────
async function runPhone(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const { page, loadMs } = await openGame(ctx, 'autostart=1&perf=1', errs);
  ok('スマホ横 起動→操作可能', loadMs < 8000, `${loadMs}ms`);
  const q = await page.evaluate(() => ({ preset: __sh.game.autoPresetKey, shadows: __sh.game.settings.shadows, res: __sh.game.settings.resScale }));
  ok('スマホ：画質は自動で「低」（影なし・解像度を下げる）', q.preset === 'low' && !q.shadows && q.res < 0.7, JSON.stringify(q));
  await skipDlg(page);
  const touchOn = await page.evaluate(() => getComputedStyle(document.getElementById('sh-touch')).display !== 'none');
  ok('タッチ操作の表示（横向き）', touchOn);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] ?? i })) });
  const box = async sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  const tap = async (sel, ms = 60) => { const [x, y] = await box(sel); await touch('touchStart', [[x, y, 5]]); await page.waitForTimeout(ms); await touch('touchEnd', []); };
  // スティックで歩いて相棒のところへ
  await page.evaluate(() => { __sh.debug.teleport(-1.3, -27.5, Math.PI); __sh.game.cam.yaw = 0; });
  const z0 = (await S(page)).player.z;
  await touch('touchStart', [[150, 300, 1]]); await touch('touchMove', [[150, 250, 1]]); await page.waitForTimeout(2500); await touch('touchEnd', []);
  let st = await S(page); ok('タッチのスティックで移動（→ 相棒の近くで会話が始まる）', st.player.z < z0 - 0.5 || st.mode === 'dialog', `${z0.toFixed(1)}→${st.player.z.toFixed(1)} ${st.mode}`);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-1.6, -31.6, Math.PI); D.fastSim(3); D.skipDialog(); D.fastSim(3); });
  await page.waitForTimeout(400);
  { const [x, y] = await box('.tc-use'); await touch('touchStart', [[x, y, 5]]);
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(150); if (!(await page.evaluate(() => __sh.game.cut.active))) break; }
    await touch('touchEnd', []); }
  await page.waitForTimeout(300);
  st = await S(page); ok('スマホ：演出場面を「調」の長押しで飛ばす', !st.cut && st.step === 'pro_pipe', `${st.cut} ${st.step}`);
  await page.evaluate(() => { const D = __sh.debug; D.skipDialog(); D.teleport(-2.4, -30.0, Math.PI); D.fastSim(3); });
  await page.waitForTimeout(300);
  const pre = await page.evaluate(() => ({ mode: __sh.game.mode, spot: __sh.game.nearSpot && __sh.game.nearSpot.id, vis: document.querySelector('.tc-use').className }));
  await tap('.tc-use', 120); await page.waitForTimeout(300);
  await page.evaluate(() => { __sh.debug.skipDialog(); __sh.debug.fastSim(3); });
  st = await S(page); ok('スマホ：「調」で鉄パイプを拾う', st.player.owned.includes('pipe'), JSON.stringify(st.player.owned) + ' ' + JSON.stringify(pre));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; const k = g.enemies.find(e => e.id === 'kiro_t'); k.brain.pos.x = g.player.pos.x; k.brain.pos.z = g.player.pos.z - 1.4; D.freezeEnemies(true); D.fastSim(2); });
  const ev0 = (await page.evaluate(() => __sh.game.metrics.events.length));
  await tap('.tc-atk'); await page.waitForTimeout(700); await tap('.tc-dodge'); await page.waitForTimeout(700); await tap('.tc-parry'); await page.waitForTimeout(700);
  const evs = await page.evaluate(n => __sh.game.metrics.events.map(e => e.t), ev0);
  ok('タッチのボタン（斬・避・弾）', ['attackStart', 'dodge'].every(t => evs.includes(t)), [...new Set(evs.slice(-20))].join(','));
  await page.evaluate(() => { __sh.debug.freezeEnemies(false); });
  // 物語を進める（序章の残り〜第1章〜第2章）
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; const k = g.enemies.find(e => e.id === 'kiro_t'); k.brain.hp = 10; D.fastSim(400); });
  st = await S(page); ok('スマホ：序章の帰路が帰っていく', st.step === 'pro_home', st.step);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-3.4, 13.6, 0); D.fastSim(3); D.use('sofa'); D.skipCutscene(); D.fastSim(3); D.teleport(5.0, 13.9, 0); D.fastSim(2); D.use('katana_rack'); D.skipDialog(); D.fastSim(10); });
  await page.evaluate(() => { __sh.debug.resetEnemy('kiro_1'); __sh.debug.heal(); });
  let n = 0; for (let i = 0; i < 10; i++) if (await justDodgeIssen(page, 'kiro_1', [0, -24], 5)) n++;
  ok('スマホ：ジャスト回避→見切り一閃 10/10（タッチは窓 +2f）', n === 10, `${n}/10`);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-3.4, -66.4, -Math.PI / 2); D.fastSim(3); D.use('exit_alley'); D.fastSim(30); D.teleport(3.0, -22, 1.5); D.fastSim(4); D.skipCutscene(); D.fastSim(3); });
  st = await S(page); ok('スマホ：裏路地で再会 → 相棒が同行', st.area === 'alley' && st.companion.mode === 'follow', `${st.area} ${st.companion.mode}`);
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; const k = g.enemies.find(e => e.id === 'kiro_a1'); if (k) { k.brain.pos.x = -1; k.brain.pos.z = -3; } D.teleport(12, -21.8, Math.PI); D.fastSim(3); D.teleport(12, -22.95, Math.PI); D.fastSim(40); D.skipCutscene(); D.fastSim(3); });
  await page.evaluate(() => { const D = __sh.debug; D.teleport(14, 5, Math.PI / 2); D.fastSim(3); D.teleport(17.6, 5, Math.PI / 2); D.fastSim(40); D.skipDialog(); });
  st = await S(page); ok('スマホ：商業施設の前（放送）→ 避難所', st.area === 'shelter' && st.step === 'ch2_roster', `${st.area} ${st.step}`);
  await page.evaluate(() => { const D = __sh.debug; D.use('roster'); D.skipDialog(); D.use('cards'); D.skipDialog(); });
  await page.waitForTimeout(300);
  await shot(page, 'phone_01_roster.png', 400);
  // タップで照合
  for (const grp of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const name = await page.evaluate(grp => { const g = __sh.game; const tab = g.ui.el.puz.querySelector(`[data-g="${grp}"]`); if (tab) tab.click(); return g.rosterView().people.find(p => p.group === grp && p.missing).name; }, grp);
    const sel = `[data-pick="${name}"]`; if (await page.$(sel)) { const [x, y] = await box(sel); await touch('touchStart', [[x, y, 7]]); await touch('touchEnd', []); await page.evaluate(sel => document.querySelector(sel) && document.querySelector(sel).click(), sel); }
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(700); await skipDlg(page);
  st = await S(page); ok('スマホ：名簿の照合（タップ）', st.flags.roster_done, st.step);
  await page.evaluate(() => { const D = __sh.debug; D.use('drawer'); const b = [...__sh.game.ui.el.puz.querySelectorAll('[data-n]')].find(x => x.dataset.n === '6'); b.click(); D.skipDialog(); D.teleport(0, 11.4, Math.PI); D.fastSim(2); D.use('gym_door'); D.teleport(0, 1.0, Math.PI); D.fastSim(4); });
  st = await S(page); ok('スマホ：体育館 → 収容者が起き上がる', st.cut === 'cs02_boss', st.cut);
  await sim(page, 60 * 9.0); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'phone_02_cutscene.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.cam.yaw = -0.4; g.cam.pitch = 0.2; D.teleport(0, -1.6, Math.PI); D.fastSim(10); });
  await shot(page, 'phone_03_boss.png', 1500);
  const perfBoss = await page.evaluate(() => __sh.debug.renderInfo());
  const fight = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, P = g.player, b = g.boss.brain; let deaths = 0;
    for (let it = 0; it < 1200 && b.alive; it++) {
      if (g.mode === 'dead' || P.fighter.dead) { deaths++; g.retry(); D.fastSim(10); if (g.cut.active) D.skipCutscene(); continue; }
      if (g.mode === 'dialog') D.skipDialog();
      if (P.fighter.hp < 40) D.heal();
      const dx = b.pos.x - P.pos.x, dz = b.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (b.atk && b.atk.phase === 'windup') { const A = b.def.attacks[b.atk.name], left = Math.max(0, Math.round((A.windup - b.atk.t) * 60)); if (A.parryable && d < A.range + 1) { __sh.input.script([{ f: Math.max(0, left - 3), press: ['parry'] }, { f: left + 4, press: ['attack'] }]); D.fastSim(left + 30); continue; } if (!A.parryable) { g.cam.yaw = Math.atan2(dx, dz) + Math.PI * 1.5; __sh.input.script([{ f: Math.max(0, left - 5), move: [1, 0, 14] }, { f: Math.max(0, left - 5), press: ['dodge'] }]); D.fastSim(left + 30); continue; } }
      if (b.atk) { D.fastSim(6); continue; }
      if (d > 2.4) { g.cam.yaw = Math.atan2(-dx, -dz); __sh.input.script([{ f: 0, move: [0, 1, 12] }]); D.fastSim(12); continue; }
      D.faceTo(b.pos.x, b.pos.z); __sh.input.script([{ f: 0, press: ['attack'] }, { f: 16, press: ['attack'] }]); D.fastSim(34);
    }
    D.fastSim(180); return { res: b.resolution, deaths, hpLeft: b.hp };
  });
  ok('スマホ：収容者を倒す（体力は回復で支える）', fight.res === 'kill', JSON.stringify(fight));
  await skipCut(page); await sim(page, 30);
  st = await S(page); ok('スマホ：第2章（試作）ここまで', st.step === 'ch2_end', st.step);
  await page.evaluate(() => __sh.debug.closeMenu());
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.jump('ch1_street'); D.teleport(0.5, -24, Math.PI); g.cam.pitch = 0.08; D.fastSim(20); });
  await clearUI(page); await shot(page, 'phone_04_street_hud.png', 2000);
  const perf = { street: await page.evaluate(() => Object.assign(__sh.debug.renderInfo(), { fps: __sh.debug.perf() && +__sh.debug.perf().fps.toFixed(1) })), boss: perfBoss };
  ok('スマホ：描画呼び出し 120 以下（商店街・体育館の戦い）', perf.street.calls <= 120 && perfBoss.calls <= 120, JSON.stringify(perf));
  ok('スマホ ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

// ───────────────────────── 第3章（フェーズ4）：病院 → 地下通路 → 写し身・白髪形態 ─────────────────────────
// 自動の戦い方（ページの中で動かす）：予兆を見て、白（弾ける）は弾く→弾き一閃、赤は避ける→見切り一閃、それ以外は近づいて斬る。
const AUTOFIGHT = function (opt) {
  const D = __sh.debug, g = __sh.game, P = g.player, F = P.fighter; const R = { deaths: 0, parries: 0, dodges: 0, swings: 0, white: 0, memo: 0, it: 0 };
  let k = 0;
  for (let it = 0; it < (opt.max || 900); it++) {
    R.it = it;
    const T = g.enemies.filter(e => opt.ids.includes(e.id) && e.brain.alive && e.root.visible);
    if (!T.length) break;
    if (g.cut.active) { if (opt.stopOnCut) break; D.skipCutscene(); continue; }
    if (g.mode === 'dialog') { D.skipDialog(); continue; }
    if (g.mode === 'puzzle') break;
    if (g.mode === 'dead' || F.dead) { R.deaths++; if (opt.noRetry) break; g.retry(); D.fastSim(20); continue; }
    if (opt.heal && F.hp < 45) D.heal();
    const near = (e) => Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
    const atk = T.find(e => e.brain.atk && e.brain.atk.phase === 'windup' && near(e) < 8 && !e.targetDecoy);
    if (atk) {
      const b = atk.brain, A = b.def.attacks[b.atk.name], w = (b.atk.hitN > 0 && A.next) ? A.next : A.windup, left = Math.max(0, Math.round((w - b.atk.t) * 60 / (g.worldScale || 1)));
      if (A.parryable && !F.white && near(atk) < (A.range || 2) + 1.5) { __sh.input.script([{ f: Math.max(0, left - 3), press: ['parry'] }, { f: left + 4, press: ['attack'] }]); R.parries++; D.fastSim(left + 26); continue; }
      __sh.input.script([{ f: Math.max(0, left - 4), press: ['dodge'] }, { f: left + 6, press: ['attack'] }]); R.dodges++; D.fastSim(left + 30); continue;
    }
    const e = T.reduce((a, c) => (near(a) < near(c) ? a : c));
    if (e.brain.state === 'voice' && opt.memo && g.flags.memo) { const sp = g.nearSpot; if (sp && sp.kind === 'memo') { g.useSpot(sp); R.memo++; D.fastSim(10); continue; } }
    const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d > (opt.range || 2.0) + e.r * 0.5) { g.cam.yaw = Math.atan2(-dx, -dz); __sh.input.script([{ f: 0, move: [0, 1, 10] }, { f: 0, hold: { run: 10 } }]); D.fastSim(10); continue; }
    D.faceTo(e.pos.x, e.pos.z);
    if (F.white) {
      R.white++; k++;
      if (k % 7 === 3 && F.yoki > 20) { __sh.input.script([{ f: 0, hold: { aim: 14 } }, { f: 8, press: ['attack'] }]); D.fastSim(26); continue; }
      if (k % 9 === 5 && F.yoki > 30) { __sh.input.script([{ f: 0, press: ['parry'] }]); D.fastSim(18); continue; }
      __sh.input.script([{ f: 0, press: ['attack'] }, { f: 9, press: ['attack'] }, { f: 18, press: ['attack'] }, { f: 28, press: ['attack'] }, { f: 40, press: ['attack'] }]); D.fastSim(58); continue;
    }
    __sh.input.script([{ f: 0, press: ['attack'] }, { f: 16, press: ['attack'] }]); R.swings++; D.fastSim(34);
  }
  return R;
};
const injectAF = page => page.evaluate(src => { window.__af = (0, eval)('(' + src + ')'); }, AUTOFIGHT.toString());
const AF = (page, opt) => page.evaluate(opt => window.__af(Object.assign(opt, { until: null })), opt);
const step3 = async (page, n = 1) => { for (let i = 0; i < n; i++) await page.evaluate(() => { const D = __sh.debug, g = __sh.game; if (g.cut.active) D.skipCutscene(); if (g.mode === 'dialog') D.skipDialog(); D.fastSim(20); }); };

async function runCh3PC(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const { page } = await openGame(ctx, 'autostart=1&step=ch2_end&perf=1', errs);
  await injectAF(page);
  // 第2章の終わりの表 →「続ける」→ 第3章へ
  await page.evaluate(() => { __sh.debug.skipDialog(); __sh.game.showEndCard(); });
  await page.click('#sh-puz [data-close]'); await page.waitForTimeout(800);
  await page.evaluate(() => { __sh.debug.fastSim(40); __sh.debug.skipDialog(); __sh.debug.fastSim(5); });
  let st = await S(page); ok('第3章：第2章の終わりの表から続けて始まる（台詞→章の札）', st.step === 'ch3_hosp' && st.flags.ch3_started, st.step);
  const ex = await page.evaluate(() => { const g = __sh.game; const s = g.area.spots.find(x => x.id === 'exit_hospital'); return s && { x: s.x, z: s.z }; });
  await page.evaluate(() => __sh.debug.teleport(-4.6, 18.4, Math.PI / 2));
  const w1 = await walkTo(page, ex.x - 0.1, ex.z, 300, false);
  st = await S(page); ok('避難所のロビー西の連絡通路を歩いて病院へ（区画の読み込み）→ 着いた演出', st.area === 'hospital' && st.cut === 'cs03_hospital', JSON.stringify({ w1, area: st.area, cut: st.cut }));
  await sim(page, 60 * 7.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_30_hospital_arrive.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 4);
  st = await S(page); ok('病院：記録のない患者（4）・化けた影（見舞い客）がいる', st.step === 'ch3_lobby' && st.enemies.filter(e => e.kind === 'kanja').length === 4 && st.enemies.some(e => e.id === 'mimic_h1' && e.state === 'disguise'), st.enemies.map(e => e.id + ':' + e.state).join(','));
  // 化けた見舞い客：懐中電灯で目が光る（見分け方）→ 近づくと崩れる（予兆）→ 影
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(-6.2, 10.2, 0); D.faceTo(-6.2, 13.9); g.cam.pitch = 0.12; if (!g.flashlightOn) g.toggleFlashlight(); D.fastSim(10); });
  await page.waitForTimeout(700); st = await S(page); ok('化けた影の見分け方：懐中電灯を当てると目が紫に光る・足元に影が無い', st.metrics.tellSeen === true && await page.evaluate(() => { const e = __sh.game.enemies.find(x => x.id === 'mimic_h1'); return e.alt && e.alt.mesh.castShadow === false || e.model.mesh.castShadow === false; }), JSON.stringify(st.metrics.tellSeen));
  await clearUI(page); await shot(page, 'pc_31_mimic_disguise.png', 1200);
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(-6.2, 11.3, 0); D.faceTo(-6.2, 13.9); __sh.input.script([{ f: 0, move: [0, 1, 20] }]); D.fastSim(28); g.cam.yaw = g.player.yaw + Math.PI + 0.8; g.cam.pitch = 0.08; D.hold(true); });
  await shot(page, 'pc_32_mimic_reveal.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  st = await S(page); ok('近づくと 0.9 秒かけて崩れる（赤い予兆）→ 影になって襲う', st.metrics.mimicReveals >= 1, JSON.stringify(st.enemies.find(e => e.id === 'mimic_h1')));
  // 写す：3 回斬ってから攻めを待つ → 「写：斬斬斬」の 3 連撃
  const copy = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, e = g.enemies.find(x => x.id === 'mimic_h1'); D.fastSim(70); D.heal();
    g.actHist = []; e.brain.atk = null; e.brain.cool = 99; D.faceTo(e.pos.x, e.pos.z);
    for (let i = 0; i < 3; i++) { __sh.input.script([{ f: 0, press: ['attack'] }]); D.fastSim(32); }
    e.brain.cool = 0; e.brain.pos.x = g.player.pos.x; e.brain.pos.z = g.player.pos.z + 1.5;
    for (let i = 0; i < 40 && !e.brain.atk; i++) D.fastSim(2);
    D.fastSim(6); g.cam.yaw = g.player.yaw + Math.PI + 1.0; g.cam.pitch = 0.05; D.hold(true);
    return { label: e.copyLabel, plan: e.brain.plan && e.brain.plan.name, hits: e.brain.atk && e.brain.atk.hits, hist: g.actHist.slice(-4) };
  });
  ok('模倣する影は直前の動きを写す（斬×3 → 写：斬斬斬・3 連撃）・頭の上に表示', copy.plan === 'mslash' && copy.hits === 3 && /斬斬斬/.test(copy.label || ''), JSON.stringify(copy));
  await shot(page, 'pc_33_mimic_copy.png', 1200); await page.evaluate(() => __sh.debug.hold(false));
  let f1 = await AF(page, { ids: ['mimic_h1'], max: 400, heal: true });
  st = await S(page); ok('模倣する影を倒す（弾く／避ける／斬る）', st.enemyRes.mimic_h1 === 'kill', JSON.stringify(f1));
  // 受付 → カルテの照合（必須・UI をクリック）
  await page.evaluate(() => { const D = __sh.debug; D.teleport(0.6, 11.8, Math.PI); D.fastSim(3); D.use('hosp_reception'); });
  const rcp = await page.evaluate(() => document.querySelector('.sh-dtext').textContent);
  await skipDlg(page);
  st = await S(page); ok('受付の入院記録（「氏名不明・記録なし」）→ 目標がカルテの照合へ', st.step === 'ch3_records' && /記録なし/.test(rcp), st.step);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-6.0, 0.6, Math.PI); D.fastSim(3); D.use('hosp_board'); D.skipDialog(); D.use('hosp_keybox'); });
  const kb0 = await page.evaluate(() => document.querySelector('.sh-dtext').textContent); await skipDlg(page);
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-10.6, 3.4, -Math.PI / 2); D.fastSim(3); D.use('hosp_charts'); D.skipDialog(); });
  await page.waitForTimeout(300); await shot(page, 'pc_34_records.png', 500);
  await page.click('[data-room="305"]'); await page.waitForTimeout(150);
  const miss = await page.evaluate(() => __sh.game.puz.records && __sh.game.puz.records.miss);
  await page.click('[data-room="306"]'); await page.waitForTimeout(700); await skipDlg(page);
  st = await S(page); ok('病院の調べ物【必須】：札とカルテの照合 → 306 小野寺ケイ（記録が無い）。間違えると数える', st.flags.records_done && st.step === 'ch3_ward' && miss === 1 && /まだ分からない/.test(kb0), JSON.stringify({ step: st.step, miss, kb0 }));
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-9.6, 0.4, Math.PI); D.fastSim(3); D.use('hosp_keybox'); D.skipDialog(); D.teleport(1.0, -16.0, Math.PI / 2); D.fastSim(3); D.use('door_306'); });
  st = await S(page); ok('鍵箱で 306 の鍵 → 306 の戸を開ける', st.flags.key306 && st.flags.door306, JSON.stringify({ k: st.flags.key306, d: st.flags.door306 }));
  // 任意：処置室の看護記録（子ども用の携帯の留守電・白衣の名札）→ 記録のない患者を「看護の人」として救う
  await page.evaluate(() => { const D = __sh.debug; D.teleport(8.4, 4.0, 0); D.fastSim(3); D.use('hosp_treat'); D.skipDialog(); });
  const nurse = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, k = g.enemies.find(e => e.id === 'kanja_1'); const b = k.brain; b.state = 'loop'; b.hostileBy = null; b.atk = null;
    D.teleport(b.pos.x + Math.sin(b.yaw) * 2.0, b.pos.z + Math.cos(b.yaw) * 2.0, b.yaw + Math.PI); D.faceTo(b.pos.x, b.pos.z); D.fastSim(60);
    const st1 = b.state; D.fastSim(30); const sp = g.nearSpot && g.nearSpot.kind; if (sp === 'callout') g.useSpot(g.nearSpot); D.fastSim(10);
    return { st1, sp, res: g.enemyRes.kanja_1, state: b.state };
  });
  ok('任意の手掛かり（処置室）：白衣の名札 → 患者は「看護の人」と取り違える → 声をかけると眠る（救う）', nurse.st1 === 'nurse' && nurse.res === 'rescue', JSON.stringify(nurse));
  const sw = await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(-1.2, -6.2, Math.PI); D.fastSim(3); for (const e of g.enemies) if (e.kind === 'kanja' && e.id !== 'kanja_4' && e.brain.state !== 'sleep') { e.brain.state = 'loop'; e.brain.hostileBy = null; } const k4 = g.enemies.find(e => e.id === 'kanja_4'); k4.brain.state = 'hostile'; k4.brain.hostileBy = 'x'; D.use('hosp_switch'); D.fastSim(10); const r = { ...g.enemyRes }; D.use('hosp_switch'); return r; });
  ok('病棟の照明を落とす → 戦っていない患者は眠る（無力化）・戦っている患者は眠らない', sw.kanja_2 === 'neutralize' && sw.kanja_3 === 'neutralize' && !sw.kanja_4, JSON.stringify(sw));
  f1 = await AF(page, { ids: ['kanja_4'], max: 300, heal: true });
  st = await S(page); ok('記録のない患者を倒す（点滴の管＝白・すがりつき＝赤）', st.enemyRes.kanja_4 === 'kill', JSON.stringify(f1));
  // 306：子どもの前の大きな患者（守り手）
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.heal(); D.teleport(1.2, -16, Math.PI / 2); D.fastSim(2); D.teleport(3.0, -16, Math.PI / 2); D.fastSim(4); });
  st = await S(page); ok('306 に入る → 演出「子どもの前に大きな異形」', st.cut === 'cs03_guard', st.cut);
  await sim(page, 60 * 4.9); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_35_guard_child.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await sim(page, 60 * 6.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_36_guard.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 4);
  const push = await page.evaluate(() => { const D = __sh.debug, g = __sh.game, m = g.enemies.find(e => e.id === 'mamori'); D.teleport(7.4, -17.4, Math.PI / 2); D.fastSim(80); return { att: g.metrics.enemyAttacks.mamori || 0, st: m.brain.state, hp: g.player.fighter.hp }; });
  ok('大きな患者は子どもに近づくと押し返す（白い予兆・弱い）・追ってこない', push.att >= 1 && push.hp >= 85, JSON.stringify(push));
  await page.evaluate(() => { const D = __sh.debug; D.heal(); D.teleport(4.2, -16.0, Math.PI / 2); D.fastSim(60 * 8); });
  st = await S(page); ok('しばらくすると影が母の声を真似て来る（演出）', st.cut === 'cs03_mimics', st.cut);
  await sim(page, 60 * 3.8); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_37_mimics_come.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3);
  const tw = await AF(page, { ids: ['mimic_t1', 'mimic_t2', 'mimic_t3'], max: 600, heal: true, stopOnCut: true });
  await sim(page, 90);
  st = await S(page); ok('影を払う：大きな患者も影から子どもを守る（影を払う）→ 道を空ける（救う）', ['mimic_t1', 'mimic_t2', 'mimic_t3'].every(id => st.enemyRes[id] === 'kill') && st.enemyRes.mamori === 'rescue' && (st.metrics.mamoriHits || 0) >= 1, JSON.stringify({ tw, res: st.enemyRes, mh: st.metrics.mamoriHits, cut: st.cut }));
  for (let i = 0; i < 30; i++) { if ((await S(page)).cut === 'cs03_truth_rescue') break; await sim(page, 10); }
  await skipCut(page); await sim(page, 30);
  st = await S(page); ok('真相の演出（救った版）→ 子どもを相棒に預ける → CS-03', st.cut === 'cs03_line', st.cut);
  // 原文の台詞：字幕を見る
  let line = ''; for (let i = 0; i < 60; i++) { await sim(page, 10); line = await page.evaluate(() => document.querySelector('.sh-sub').textContent); if (/見た目/.test(line)) break; }
  await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_38_line.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  ok('原文：だんのうら「見た目だけで決めつけちゃ駄目ってことかしらね」（字幕・一字一句）', line === 'だんのうら見た目だけで決めつけちゃ駄目ってことかしらね', line);
  for (let i = 0; i < 60; i++) { await sim(page, 10); if (!(await S(page)).cut) break; }
  st = await S(page); ok('子どもは（相棒）と手をつないでついて来る・地下へ', st.step === 'ch3_down' && st.child.visible && st.child.mode === 'follow' && st.metrics.fixedLines && st.metrics.fixedLines.length === 1, JSON.stringify({ step: st.step, child: st.child, fl: st.metrics.fixedLines }));
  // 地下通路
  await page.evaluate(() => { const D = __sh.debug; D.teleport(-6.0, -21.4, -Math.PI / 2); D.fastSim(3); });
  await walkTo(page, -9.8, -21.6, 300, false);
  st = await S(page); ok('階段から地下通路へ（相棒・子どもも一緒）', st.area === 'tunnel' && (st.cut === 'cs03_tunnel'), `${st.area} ${st.cut}`);
  await skipCut(page); await sim(page, 4);
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.cam.yaw = 0; D.teleport(0, -9.6, Math.PI); D.fastSim(4); D.teleport(0, -9.0, Math.PI); D.fastSim(8); });
  const fake = await page.evaluate(() => { const g = __sh.game, u1 = g.enemies.find(e => e.id === 'mimic_u1'), u2 = g.enemies.find(e => e.id === 'mimic_u2'); return { u1: u1.brain.state, u2: u2.brain.state, comp: [g.companion.brain.pos.x, g.companion.brain.pos.z], compVis: g.companion.root.visible }; });
  ok('地下通路：くぼみの影が飛び出す・先に（相棒）の姿の影が呼ぶ（本物の相棒は後ろ＝ミニマップの点）', fake.u1 === 'disguise' && fake.u2 === 'hostile' && fake.compVis && fake.comp[1] > -9, JSON.stringify(fake));
  f1 = await AF(page, { ids: ['mimic_u2'], max: 300, heal: true });
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; D.teleport(0, -9.4, Math.PI); g.cam.yaw = 0; g.cam.pitch = 0.1; D.fastSim(30); D.hold(true); });
  await clearUI(page); await shot(page, 'pc_39_fake_companion.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  await page.evaluate(() => { const D = __sh.debug; __sh.input.script([{ f: 0, move: [0, 1, 70] }]); D.fastSim(80); });
  f1 = await AF(page, { ids: ['mimic_u1'], max: 300, heal: true });
  st = await S(page); ok('（相棒）に化けた影は近づくと崩れる → 倒す', st.enemyRes.mimic_u1 === 'kill' && st.enemyRes.mimic_u2 === 'kill', JSON.stringify({ f1, r: st.enemyRes }));
  // 分かれ道の広場：写し身
  await page.evaluate(() => { const D = __sh.debug; D.heal(); D.teleport(0, -21.0, Math.PI); D.fastSim(3); });
  await walkTo(page, 0, -23.8, 200, false);
  st = await S(page); ok('広場：二人を詰所へ → 影が、だんのうらの形を写す（演出）', st.cut === 'cs03_boss', st.cut);
  await sim(page, 60 * 11.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_40_boss_rise.png', 1800); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 4);
  st = await S(page); ok('写し身（ボス）との戦い：相棒と子どもは詰所の中（シャッターが閉まる）', st.step === 'ch3_boss' && st.boss.state === 'hostile' && !st.companion.visible && !st.child.visible, JSON.stringify({ step: st.step, b: st.boss, c: st.companion.visible }));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game; g.cam.yaw = 0.3; g.cam.pitch = 0.14; D.teleport(0.8, -30.5, Math.PI); D.fastSim(40); D.hold(true); });
  await clearUI(page); await shot(page, 'pc_41_boss.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  const p1 = await AF(page, { ids: ['utsushimi'], max: 900, heal: true, stopOnCut: true });
  st = await S(page); ok('写し身：体力 60% で転機（止まる）→ 転機の前の専用セーブ', st.cut === 'cs03_tenki' && st.boss.state === 'tenki' && !!(await page.evaluate(() => __sh.store.load('tenki'))), JSON.stringify({ p1, cut: st.cut, b: st.boss }));
  await sim(page, 60 * 9.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_42_tenki.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 3); await page.waitForTimeout(300);
  const opts = await page.evaluate(() => [...document.querySelectorAll('#sh-puz [data-pick]')].map(b => b.dataset.pick));
  await shot(page, 'pc_43_choice.png', 500);
  ok('構えの選択（時間制限なし）：「化けを、解く」／「このまま、人として」', JSON.stringify(opts) === '["reveal","secret"]', JSON.stringify(opts));
  await page.click('[data-pick="reveal"]'); await page.waitForTimeout(200);
  st = await S(page); ok('「化けを、解く」→ 変身の演出（静かに・暴走ではない）。分岐の記録に kind:stance（ルートは未確定）', st.cut === 'cs03_transform' && st.stance === 'reveal' && st.route === null && st.branchLog.some(e => e.kind === 'stance' && e.decision === 'reveal' && e.locksRoute === false), JSON.stringify({ cut: st.cut, bl: st.branchLog }));
  await sim(page, 60 * 2.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_44_transform_a.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  await sim(page, 60 * 1.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_45_transform_b.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  await sim(page, 60 * 4.6); await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_46_transform_c.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  await skipCut(page); await sim(page, 4);
  st = await S(page); ok('白髪形態：白い乱れ髪・猫耳・白い尾（揺れる）・黒いパーカー・爪。第 2 段階へ', st.form === 'white' && st.step === 'ch3_boss2' && st.boss.phase === 1, JSON.stringify({ form: st.form, step: st.step, b: st.boss }));
  // 白髪形態の寄り（前・後ろ）
  await page.evaluate(() => { const g = __sh.game; g.boss.brain.cool = 99; g.boss.brain.vT = -99; __sh.debug.teleport(0, -27, 0); __sh.debug.fastSim(30); g.player.setExpr('calm'); });
  await page.evaluate(() => __sh.debug.view('closeup', { who: 'player', dist: 0.95, side: 0.25, y: 1.48, fov: 36 })); await clearUI(page); await shot(page, 'pc_47_white_face.png', 1400);
  await page.evaluate(() => __sh.debug.view('closeup', { who: 'player', dist: 3.1, side: 0.45, y: 0.95 })); await shot(page, 'pc_48_white_front.png', 1400);
  await page.evaluate(() => __sh.debug.view('closeup', { who: 'player', dist: 3.1, side: Math.PI - 0.5, y: 1.0 })); await shot(page, 'pc_49_white_back.png', 1400);
  await page.evaluate(() => __sh.debug.view('normal'));
  // 白髪形態の技：妖爪 5 段・猫火・幻術・瞬歩・妖刀 → 連撃の数
  const moves = await page.evaluate(() => {
    const D = __sh.debug, g = __sh.game, F = g.player.fighter, b = g.boss.brain; F.yoki = 100; b.cool = 99; b.vT = -99; b.atk = null; b.state = 'hostile';
    D.teleport(0, -32.6, Math.PI); b.pos.x = 0; b.pos.z = -34.2; D.faceTo(0, -34.2); const c0 = F.combo.max;
    __sh.input.script([0, 9, 18, 28, 40].map(f => ({ f, press: ['attack'] }))); D.fastSim(70);
    const claws = g.actHist.filter(a => a === 'claw').length;
    __sh.input.script([{ f: 0, hold: { aim: 14 } }, { f: 8, press: ['attack'] }]); D.fastSim(30); const fires = g.fires.length + (g.metrics.foxfire || 0);
    D.fastSim(80); const fireHits = g.metrics.foxfireHits || 0;
    __sh.input.script([{ f: 0, press: ['parry'] }]); D.fastSim(4); const decoy = !!g.decoy;
    D.fastSim(30); __sh.input.script([{ f: 0, press: ['dodge'] }]); D.fastSim(4); const dash = F.st.name === 'dodge' && F.st.white;
    D.fastSim(30); __sh.input.script([{ f: 0, hold: { heavy: 16 } }]); D.fastSim(40);
    return { claws, fires, fireHits, decoy, dash, blade: g.actHist.includes('blade'), comboMax: F.combo.max, yoki: Math.round(F.yoki), hist: g.actHist.slice(-8) };
  });
  ok('白髪形態の技：妖爪 5 段・猫火（追尾して当たる）・幻術（分身）・瞬歩・妖刀', moves.claws >= 5 && moves.fires >= 1 && moves.fireHits >= 1 && moves.decoy && moves.dash && moves.blade, JSON.stringify(moves));
  await page.evaluate(() => { const D = __sh.debug, g = __sh.game, F = g.player.fighter, b = g.boss.brain; F.yoki = 100; b.cool = 99; D.teleport(0, -32.6, Math.PI); b.pos.x = 0; b.pos.z = -34.0; D.faceTo(0, -34); g.cam.yaw = 0.5 + Math.PI * 0; g.cam.pitch = 0.1;
    for (let i = 0; i < 3; i++) { __sh.input.script([0, 9, 18, 28, 40].map(f => ({ f, press: ['attack'] }))); D.fastSim(56); }
    __sh.input.script([0, 9, 18].map(f => ({ f, press: ['attack'] }))); D.fastSim(14); D.hold(true); });
  await shot(page, 'pc_50_white_combo.png', 1700); await page.evaluate(() => __sh.debug.hold(false));
  st = await S(page); ok('連撃の数（Combo）と連撃ボーナスの表示', st.comboMax >= 10 && await page.evaluate(() => document.querySelector('.sh-combo').classList.contains('on') || __sh.game.player.fighter.combo.max >= 10), `max ${st.comboMax}`);
  // 妖力が尽きると静かに紫へ戻る（暴走しない）→ もう一度化けを解く（V 長押し）
  const rv = await page.evaluate(() => { const D = __sh.debug, g = __sh.game, F = g.player.fighter; g.input.script.length = 0; g.input.scriptHeld.clear(); D.fastSim(70); g.boss.brain.cool = 99; g.boss.brain.atk = null; F.yoki = 1; D.fastSim(90); const a = F.form; F.yoki = 70; __sh.input.script([{ f: 0, hold: { transform: 34 } }]); D.fastSim(40); return { after: a, again: F.form }; });
  ok('妖力が 0 になると静かに紫へ戻る → V 長押しでもう一度白へ（妖力 30 以上）', rv.after === 'purple' && rv.again === 'white', JSON.stringify(rv));
  // 呼び声の間に「本物の声」（留守電）→ 救う
  const voice = await page.evaluate(() => { const D = __sh.debug, g = __sh.game, b = g.boss.brain; b.cool = 0; b.vT = 99; D.fastSim(20); return b.state; });
  await page.evaluate(() => { __sh.debug.fastSim(30); __sh.debug.hold(true); }); await clearUI(page); await shot(page, 'pc_51_boss_voice.png', 1300); await page.evaluate(() => __sh.debug.hold(false));
  const p2 = await AF(page, { ids: ['utsushimi'], max: 900, heal: true, memo: true, stopOnCut: true });
  await sim(page, 60);
  st = await S(page); ok('写し身：「呼び声」の間に子ども用の携帯の留守電（本物の声）を聞かせる → 救う', (voice === 'voice' || p2.memo >= 1) && st.metrics.voices >= 1 && st.enemyRes.utsushimi === 'rescue' && st.metrics.memo === 'rescued', JSON.stringify({ voice, p2, res: st.enemyRes.utsushimi, v: st.metrics.voices }));
  await sim(page, 60 * 2.2); const formAtShutter = (await S(page)).form; await sim(page, 60 * 3.6);
  await page.evaluate(() => __sh.debug.hold(true)); await shot(page, 'pc_52_end.png', 1500); await page.evaluate(() => __sh.debug.hold(false));
  ok('決着：シャッターが上がる前に紫の姿へ戻る（相棒は白い姿を見ない）', formAtShutter === 'purple' && (await S(page)).companionKnows === false, formAtShutter);
  await skipCut(page); await sim(page, 30);
  st = await S(page); ok('第3章（試作）ここまで：終わりの表', st.step === 'ch3_end' && st.mode === 'puzzle' && st.metrics.endCard3, `${st.step} ${st.mode}`);
  await shot(page, 'pc_53_endcard.png', 600);
  await page.evaluate(() => __sh.debug.closeMenu());
  // 相棒が見ている所では化けを解かない
  const watched = await page.evaluate(() => { const D = __sh.debug, g = __sh.game, F = g.player.fighter; D.fastSim(60); g.companion.brain.pos = { x: g.player.pos.x + 1.5, z: g.player.pos.z }; g.companion.root.visible = true; F.yoki = 80; g.toggleWhite(); return { form: F.form, why: g.metrics.whiteRefusedWhy }; });
  ok('（相棒）が見ている所では化けを解かない（正体を知らない間）', watched.form === 'purple' && watched.why === 'watched', JSON.stringify(watched));
  // セーブ → 再読み込み
  const sv = await page.evaluate(() => { __sh.save('slot1'); const a = __sh.state(); __sh.load('slot1'); __sh.debug.fastSim(5); const b = __sh.state(); return { a: [a.step, a.area, a.stance, a.flags.child_saved, a.flags.tunnel_clear, a.enemyRes.utsushimi, a.yoki], b: [b.step, b.area, b.stance, b.flags.child_saved, b.flags.tunnel_clear, b.enemyRes.utsushimi, b.yoki] }; });
  ok('セーブ→再読み込みで段・区画・構え・妖力・決着が戻る', JSON.stringify(sv.a) === JSON.stringify(sv.b), JSON.stringify(sv));
  // 転機の前から選び直す：「このまま、人として」→ 白い姿の入力は無効 → 3 回負けると「手助けあり」
  await page.evaluate(() => { __sh.load('tenki'); __sh.debug.fastSim(30); });
  await page.waitForTimeout(400);
  let o2 = await page.evaluate(() => [...document.querySelectorAll('#sh-puz [data-pick]')].map(b => b.dataset.pick));
  await page.click('[data-pick="secret"]'); await page.waitForTimeout(200); await skipCut(page); await sim(page, 5);
  const sec = await page.evaluate(() => { const g = __sh.game, F = g.player.fighter; F.yoki = 90; __sh.input.script([{ f: 0, hold: { transform: 40 } }]); __sh.debug.fastSim(45); return { form: F.form, why: g.metrics.whiteRefusedWhy, stance: g.route.stance, log: g.route.branchLog.filter(e => e.kind === 'stance').map(e => e.decision + ':' + e.via), step: g.story.step }; });
  ok('転機の前のセーブから選び直せる（両方いつも選べる）→「このまま、人として」では白い姿の入力が無効', JSON.stringify(o2) === '["reveal","secret"]' && sec.form === 'purple' && sec.why === 'stance' && sec.stance === 'secret' && sec.log.join(',') === 'secret:load_tenki', JSON.stringify(sec));
  const assist = await page.evaluate(async () => {
    const D = __sh.debug, g = __sh.game; const out = [];
    for (let i = 0; i < 3; i++) { g.player.fighter.hp = 1; g.player.fighter._go('dead'); g.onPlayerDead(); D.fastSim(5); await new Promise(r => setTimeout(r, 60)); g.retry(); D.fastSim(30); await new Promise(r => setTimeout(r, 200)); out.push([...document.querySelectorAll('#sh-puz [data-pick]')].map(b => b.dataset.pick).join('/')); if (i < 2) { document.querySelector('[data-pick="secret"]').click(); D.fastSim(3); D.skipCutscene(); D.fastSim(5); } }
    return out;
  });
  ok('秘匿の構えで 3 回負けると「このまま、人として（手助けあり）」が出る（勝手に白い姿にはしない）', /secret_assist/.test(assist[2]) && !/secret_assist/.test(assist[0]), JSON.stringify(assist));
  await page.click('[data-pick="secret_assist"]'); await page.waitForTimeout(200); await skipCut(page); await sim(page, 5);
  const as = await page.evaluate(() => { const b = __sh.game.boss.brain; return { assisted: b.assisted, hp: b.hp, max: b.hpMax, stance: __sh.game.route.stance }; });
  const p3 = await AF(page, { ids: ['utsushimi'], max: 1200, heal: true, stopOnCut: true });
  await sim(page, 60);
  st = await S(page); ok('手助けありでも構えは「人として」のまま・紫の姿だけで写し身を倒せる', as.assisted && as.stance === 'secret' && st.enemyRes.utsushimi === 'kill' && st.form === 'purple', JSON.stringify({ as, p3, res: st.enemyRes.utsushimi }));
  await skipCut(page); await sim(page, 30); await page.evaluate(() => __sh.debug.closeMenu());
  // 性能（ソフト描画）
  const perf = {};
  await page.evaluate(() => { __sh.debug.jump('ch3_lobby'); __sh.debug.skipCutscene(); __sh.debug.teleport(0, 4, Math.PI); __sh.debug.fastSim(30); });
  await page.waitForTimeout(1500); perf.hospital = await page.evaluate(() => Object.assign(__sh.debug.renderInfo(), { fps: __sh.debug.perf() && +__sh.debug.perf().fps.toFixed(1) }));
  await shot(page, 'pc_54_hospital_corridor.png', 300);
  await page.evaluate(() => { __sh.debug.jump('ch3_boss2'); __sh.debug.skipCutscene(); __sh.debug.white(true); __sh.debug.teleport(0, -30, Math.PI); __sh.debug.fastSim(30); });
  await page.waitForTimeout(1500); perf.tunnelBoss = await page.evaluate(() => Object.assign(__sh.debug.renderInfo(), { fps: __sh.debug.perf() && +__sh.debug.perf().fps.toFixed(1) }));
  ok('PC 第3章 ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

async function runCh3Phone(browser) {
  const errs = []; const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const { page } = await openGame(ctx, 'autostart=1&step=ch3_lobby&perf=1', errs);
  await injectAF(page);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] ?? i })) });
  const box = async sel => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  const tap = async (sel, ms = 60) => { const [x, y] = await box(sel); await touch('touchStart', [[x, y, 5]]); await page.waitForTimeout(ms); await touch('touchEnd', []); };
  await skipCut(page); await skipDlg(page);
  const q = await page.evaluate(() => ({ preset: __sh.game.autoPresetKey, area: __sh.game.area.id }));
  ok('スマホ：第3章（章の飛び先）・画質は自動で「低」', q.preset === 'low' && q.area === 'hospital', JSON.stringify(q));
  // スティックで廊下を歩く
  await page.evaluate(() => { __sh.debug.teleport(0, 6, Math.PI); __sh.game.cam.yaw = 0; });
  const z0 = (await S(page)).player.z;
  await touch('touchStart', [[150, 300, 1]]); await touch('touchMove', [[150, 250, 1]]); await page.waitForTimeout(2000); await touch('touchEnd', []);
  let st = await S(page); ok('スマホ：タッチのスティックで病院の廊下を歩く', st.player.z < z0 - 0.5, `${z0.toFixed(1)}→${st.player.z.toFixed(1)}`);
  await clearUI(page); await shot(page, 'phone_10_hospital.png', 1500);
  const perfHosp = await page.evaluate(() => __sh.debug.renderInfo());
  // 照合（タップ）
  await page.evaluate(() => { const D = __sh.debug; D.use('hosp_reception'); D.skipDialog(); D.use('hosp_board'); D.skipDialog(); D.use('hosp_charts'); D.skipDialog(); });
  await page.waitForTimeout(300);
  const [rx, ry] = await box('[data-room="306"]'); await touch('touchStart', [[rx, ry, 7]]); await touch('touchEnd', []); await page.evaluate(() => { const b = document.querySelector('[data-room="306"]'); if (b) b.click(); });
  await page.waitForTimeout(700); await skipDlg(page);
  st = await S(page); ok('スマホ：カルテの照合（タップ）', st.flags.records_done, st.step);
  // 地下通路の写し身まで飛ぶ（守り手の場面は PC で通す）
  await page.evaluate(() => { __sh.debug.jump('ch3_tunnel'); __sh.debug.fastSim(5); });
  await page.evaluate(() => { const D = __sh.debug; D.teleport(0, -21, Math.PI); D.fastSim(3); D.teleport(0, -23.6, Math.PI); D.fastSim(5); D.skipCutscene(); D.fastSim(5); });
  st = await S(page); ok('スマホ：写し身との戦いが始まる', st.step === 'ch3_boss' && st.boss && st.boss.state === 'hostile', JSON.stringify(st.boss));
  // タッチのボタンで攻める（斬・避）
  await page.evaluate(() => { const g = __sh.game; g.boss.brain.cool = 99; __sh.debug.teleport(0, -32.6, Math.PI); g.boss.brain.pos.x = 0; g.boss.brain.pos.z = -34.2; __sh.debug.faceTo(0, -34.2); __sh.debug.fastSim(2); });
  const ev0 = await page.evaluate(() => __sh.game.metrics.events.length);
  await tap('.tc-atk'); await page.waitForTimeout(500); await tap('.tc-atk'); await page.waitForTimeout(500); await tap('.tc-dodge'); await page.waitForTimeout(600);
  const evs = await page.evaluate(n => __sh.game.metrics.events.slice(-30).map(e => e.t), ev0);
  ok('スマホ：タッチの斬・避で写し身を攻める', evs.includes('attackStart') && evs.includes('dodge'), [...new Set(evs)].join(','));
  await page.evaluate(() => { __sh.game.boss.brain.cool = 0; });
  const p1 = await AF(page, { ids: ['utsushimi'], max: 900, heal: true, stopOnCut: true });
  await skipCut(page); await sim(page, 3); await page.waitForTimeout(400);
  const [cx, cy] = await box('[data-pick="reveal"]'); await touch('touchStart', [[cx, cy, 8]]); await touch('touchEnd', []); await page.evaluate(() => { const b = document.querySelector('[data-pick="reveal"]'); if (b) b.click(); });
  await page.waitForTimeout(200); await skipCut(page); await sim(page, 4);
  st = await S(page); ok('スマホ：転機で「化けを、解く」（タップ）→ 白髪形態', st.form === 'white' && st.stance === 'reveal', JSON.stringify({ p1, form: st.form, stance: st.stance }));
  const formBtn = await page.evaluate(() => getComputedStyle(document.querySelector('.tc-form')).display !== 'none');
  ok('スマホ：「化」ボタン（長押しで化けを解く／戻す）が出る', formBtn);
  await page.evaluate(() => { const g = __sh.game, b = g.boss.brain; b.cool = 99; __sh.debug.teleport(0, -32.6, Math.PI); b.pos.x = 0; b.pos.z = -34.2; __sh.debug.faceTo(0, -34.2); g.player.fighter.yoki = 100; for (let i = 0; i < 3; i++) { __sh.input.script([0, 9, 18, 28, 40].map(f => ({ f, press: ['attack'] }))); __sh.debug.fastSim(56); } __sh.input.script([0, 9].map(f => ({ f, press: ['attack'] }))); __sh.debug.fastSim(12); g.cam.yaw = 0.4; __sh.debug.hold(true); });
  await shot(page, 'phone_11_white_combo.png', 1600); await page.evaluate(() => __sh.debug.hold(false));
  const perfBoss = await page.evaluate(() => __sh.debug.renderInfo());
  await page.evaluate(() => { __sh.game.boss.brain.cool = 0; });
  const p2 = await AF(page, { ids: ['utsushimi'], max: 1200, heal: true, stopOnCut: true });
  await sim(page, 60);
  st = await S(page); ok('スマホ：写し身を倒す → 決着', st.enemyRes.utsushimi === 'kill' || st.enemyRes.utsushimi === 'rescue', JSON.stringify({ p2, r: st.enemyRes.utsushimi }));
  await skipCut(page); await sim(page, 30);
  st = await S(page); ok('スマホ：第3章ここまで', st.step === 'ch3_end', st.step);
  const perf = { hospital: perfHosp, boss: perfBoss };
  ok('スマホ：描画呼び出し 120 以下（病院・写し身の戦い）', perfHosp.calls <= 120 && perfBoss.calls <= 120, JSON.stringify(perf));
  ok('スマホ 第3章 ページエラー 0', errs.length === 0, errs.slice(0, 5).join(' | '));
  await ctx.close();
  return { perf, errs };
}

// ───────────────────────── 一覧の絵（overview.png） ─────────────────────────
async function overview(browser, list, title = '境界侵食（仮題）フェーズ3 試作：序章〜第2章（避難所）— 自動プレイの画面（ソフト描画）', name = 'overview.png') {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const page = await ctx.newPage();
  const imgs = list.map(n => ({ n, src: 'data:image/png;base64,' + readFileSync(join(OUT, n)).toString('base64') }));
  await page.setContent(`<html><body style="margin:0;background:#0c0a16;color:#eee;font:13px sans-serif"><div style="padding:10px 14px;font-size:18px">${title}</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">${imgs.map(i => `<figure style="margin:0"><img src="${i.src}" style="width:100%;display:block;border:1px solid #444"><figcaption style="padding:2px 4px;color:#bbb">${i.n}</figcaption></figure>`).join('')}</div></body></html>`);
  await page.waitForTimeout(500);
  const outPath = name === 'overview.png' && process.env.OVERVIEW ? process.env.OVERVIEW : join(OUT, name);
  await page.screenshot({ path: outPath, fullPage: true }); await ctx.close(); return outPath;
}

const browser = await launch();
const report = {};
if (!ONLY || ONLY === 'pc') report.pc = await runPC(browser);
if (!ONLY || ONLY === 'phone') report.phone = await runPhone(browser);
if (!ONLY || ONLY === 'ch3' || ONLY === 'ch3pc') report.ch3pc = await runCh3PC(browser);
if (!ONLY || ONLY === 'ch3' || ONLY === 'ch3phone') report.ch3phone = await runCh3Phone(browser);
const shotsHave = n => shots.includes(n);
const pick = ['pc_02_cutscene_lightsout.png', 'pc_14_dannoura_face.png', 'pc_15_dannoura_full.png', 'pc_16_dannoura_back.png', 'pc_17_companion_face.png', 'pc_18_companion_full.png', 'pc_09_chain_issen.png', 'pc_19_street.png', 'pc_20_plaza.png', 'pc_10_roster.png', 'pc_11_cutscene_boss.png', 'pc_21_boss_telegraph.png'].filter(shotsHave);
const pick4 = ['pc_30_hospital_arrive.png', 'pc_54_hospital_corridor.png', 'pc_31_mimic_disguise.png', 'pc_32_mimic_reveal.png', 'pc_33_mimic_copy.png', 'pc_36_guard.png', 'pc_37_mimics_come.png', 'pc_38_line.png', 'pc_39_fake_companion.png', 'pc_41_boss.png', 'pc_43_choice.png', 'pc_44_transform_a.png', 'pc_45_transform_b.png', 'pc_46_transform_c.png', 'pc_47_white_face.png', 'pc_48_white_front.png', 'pc_49_white_back.png', 'pc_50_white_combo.png', 'pc_51_boss_voice.png', 'pc_52_end.png', 'phone_10_hospital.png', 'phone_11_white_combo.png'].filter(shotsHave);
if (pick4.length) console.log('overview（第3章）:', await overview(browser, pick4, '境界侵食（仮題）フェーズ4：第3章（病院・地下通路）と白髪形態 — 自動プレイの画面（ソフト描画）', 'overview.png'));
else if (pick.length) console.log('overview:', await overview(browser, pick));
await browser.close();
const fail = results.filter(r => !r.pass);
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, report }, null, 1));
console.log(`\n${results.length - fail.length}/${results.length} 合格`);
if (report.pc) console.log('PC 参考（ソフト描画）：', JSON.stringify(report.pc.perf));
if (report.phone) console.log('スマホ 参考（ソフト描画）：', JSON.stringify(report.phone.perf));
if (report.ch3pc) console.log('第3章 PC 参考（ソフト描画）：', JSON.stringify(report.ch3pc.perf));
if (report.ch3phone) console.log('第3章 スマホ 参考（ソフト描画）：', JSON.stringify(report.ch3phone.perf));
process.exit(fail.length ? 1 : 0);
