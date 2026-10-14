// 『境界侵食』の自動プレイ（Playwright）：フェーズ3「序章〜第2章（避難所）」を最初から収容者の決着まで通し、画面を撮る。
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

// ───────────────────────── 一覧の絵（overview.png） ─────────────────────────
async function overview(browser, list) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const page = await ctx.newPage();
  const imgs = list.map(n => ({ n, src: 'data:image/png;base64,' + readFileSync(join(OUT, n)).toString('base64') }));
  await page.setContent(`<html><body style="margin:0;background:#0c0a16;color:#eee;font:13px sans-serif"><div style="padding:10px 14px;font-size:18px">境界侵食（仮題）フェーズ3 試作：序章〜第2章（避難所）— 自動プレイの画面（ソフト描画）</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">${imgs.map(i => `<figure style="margin:0"><img src="${i.src}" style="width:100%;display:block;border:1px solid #444"><figcaption style="padding:2px 4px;color:#bbb">${i.n}</figcaption></figure>`).join('')}</div></body></html>`);
  await page.waitForTimeout(500);
  const outPath = process.env.OVERVIEW || join(OUT, 'overview.png');
  await page.screenshot({ path: outPath, fullPage: true }); await ctx.close(); return outPath;
}

const browser = await launch();
const report = {};
if (!ONLY || ONLY === 'pc') report.pc = await runPC(browser);
if (!ONLY || ONLY === 'phone') report.phone = await runPhone(browser);
const pick = ['pc_02_cutscene_lightsout.png', 'pc_14_dannoura_face.png', 'pc_15_dannoura_full.png', 'pc_16_dannoura_back.png', 'pc_17_companion_face.png', 'pc_18_companion_full.png', 'pc_09_chain_issen.png', 'pc_19_street.png', 'pc_20_plaza.png', 'pc_10_roster.png', 'pc_11_cutscene_boss.png', 'pc_21_boss_telegraph.png', 'pc_06_cutscene_reunion.png', 'pc_13_endcard.png', 'phone_03_boss.png', 'phone_04_street_hud.png'].filter(n => shots.includes(n));
if (pick.length) console.log('overview:', await overview(browser, pick));
await browser.close();
const fail = results.filter(r => !r.pass);
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, report }, null, 1));
console.log(`\n${results.length - fail.length}/${results.length} 合格`);
if (report.pc) console.log('PC 参考（ソフト描画）：', JSON.stringify(report.pc.perf));
if (report.phone) console.log('スマホ 参考（ソフト描画）：', JSON.stringify(report.phone.perf));
process.exit(fail.length ? 1 : 0);
