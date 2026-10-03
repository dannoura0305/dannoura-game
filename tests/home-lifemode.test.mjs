// クリア後の暮らしモード（main/home/lifemode.js）のロジックテスト（node:vm・DOMなし・HOMEはスタブ）
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'main/home/lifemode.js'), 'utf8');

function makeSandbox(gsInit) {
  const calls = { triggerEnding: 0, checkGameOver: 0, nextDay: 0, share: 0, endless: 0, save: 0, tickDay: 0, evTick: 0, lifeTick: 0, loadGame: 0, startStory: 0 };
  const store = {};
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    SAVE_KEY: 'dannoura_save_v1', SAVE_VERSION: 1,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    triggerEnding() { calls.triggerEnding++; },
    checkGameOver() { calls.checkGameOver++; },
    nextDay() { calls.nextDay++; },
    showSharePanel() { calls.share++; },
    startEndlessMode() { calls.endless++; },
    loadGame() { calls.loadGame++; return true; },
    startStory() { calls.startStory++; },
    saveGame() {
      calls.save++;
      store.dannoura_save_v1 = JSON.stringify({ version: 1, gs: JSON.parse(JSON.stringify(ctx.gs)) });
      return true;
    },
  };
  ctx.gs = Object.assign({ day: 31, hour: 22, min: 5, mental: 55, fatigue: 40, debt: 320000, followers: 120, childStress: 30, flame: 2, money: 5000, _endless: false }, gsInit || {});
  const mats = { wood: 0, cloth: 0, metal: 0, sea: 0 };
  ctx.HOME = {
    ensure() { if (!ctx.gs.homeData) ctx.gs.homeData = { version: 2, materials: mats, flags: {} }; return ctx.gs.homeData; },
    tickDay() { calls.tickDay++; return true; },
    addMaterial(id, n) { ctx.gs.homeData.materials[id] += n; },
    save() { return ctx.saveGame(true); },
    events: { tick() { calls.evTick++; } },
    life_events: { tick() { calls.lifeTick++; } },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'main/home/lifemode.js' });
  const L = ctx.HOME.lifeMode;
  L.install();
  return { ctx, L, calls, store };
}

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const STAT_KEYS = ['mental', 'fatigue', 'debt', 'followers', 'childStress', 'flame', 'money', '_endless'];

console.log('home-lifemode');

test('良い結末・ふつうの結末だけ「暮らしを続ける」を出す', () => {
  const { L } = makeSandbox();
  for (const t of ['rebirth', 'king', 'engineer', 'father', 'debtfree', 'normal']) {
    assert.equal(L.offersLife(t), true, t);
    assert.equal(L.setEnding(t), true, t);
  }
  for (const t of ['collapse', 'bankrupt', 'flame', undefined, null, '', 'unknown']) {
    assert.equal(L.offersLife(t), false, String(t));
    assert.equal(L.setEnding(t), false, String(t));
  }
});

test('悪い結末からは暮らしモードを始められない', () => {
  const { L, ctx } = makeSandbox();
  L.setEnding('collapse');
  assert.equal(L.startFromEnding(), false);
  assert.ok(!ctx.gs.homeData || !ctx.gs.homeData.life);
});

test('開始：life = {active, day:0, startedFrom}、昼の時間、本編の値は変えない', () => {
  const { L, ctx } = makeSandbox();
  const before = Object.fromEntries(STAT_KEYS.map(k => [k, ctx.gs[k]]));
  const l = L.begin('rebirth');
  assert.equal(l.active, true);
  assert.equal(l.day, 0);
  assert.equal(l.startedFrom, 'rebirth');
  assert.equal(L.isActive(), true);
  assert.equal(ctx.gs.hour, 10);
  assert.equal(ctx.gs._dayDone, true);
  for (const k of STAT_KEYS) assert.equal(ctx.gs[k], before[k], k);
});

test('一日を過ごす：triggerEnding / checkGameOver / nextDay を呼ばず、本編の値は不変', () => {
  const { L, ctx, calls } = makeSandbox({ mental: 1, debt: 2500000, flame: 12 }); // 本編なら即バッドエンドの値
  L.begin('normal');
  const before = Object.fromEntries(STAT_KEYS.map(k => [k, ctx.gs[k]]));
  const day0 = ctx.gs.day;
  for (let i = 1; i <= 12; i++) {
    const r = L.advance();
    assert.equal(r.day, i);
    assert.equal(r.saved, true);
  }
  assert.equal(ctx.gs.homeData.life.day, 12);
  assert.equal(ctx.gs.day, day0 + 12);
  assert.equal(ctx.gs.hour, 10);
  assert.equal(calls.triggerEnding, 0);
  assert.equal(calls.checkGameOver, 0);
  assert.equal(calls.nextDay, 0);
  assert.equal(calls.tickDay, 12);
  assert.equal(calls.evTick, 12);
  assert.equal(calls.lifeTick, 12);
  for (const k of STAT_KEYS) assert.equal(ctx.gs[k], before[k], k);
  const m = ctx.gs.homeData.materials;
  assert.equal(m.wood + m.cloth + m.sea, 12);   // 一日1つだけ
  assert.ok(m.sea >= 1 && m.wood >= 1 && m.cloth >= 1);
});

test('暮らしモード中は本編の関数が何もしない（外から呼ばれても）', () => {
  const { L, ctx, calls } = makeSandbox();
  L.begin('king');
  ctx.triggerEnding('collapse'); ctx.checkGameOver(); ctx.nextDay(); ctx.showSharePanel('king', true); ctx.startEndlessMode();
  assert.deepEqual([calls.triggerEnding, calls.checkGameOver, calls.nextDay, calls.share, calls.endless], [0, 0, 0, 0, 0]);
  // 暮らしモードでなければ元の処理へ
  ctx.gs.homeData.life.active = false;
  ctx.triggerEnding(); ctx.checkGameOver(); ctx.nextDay();
  assert.deepEqual([calls.triggerEnding, calls.checkGameOver, calls.nextDay], [1, 1, 1]);
  assert.equal(L.advance(), null);
});

test('保存と再開の判定：セーブに life.active が残る', () => {
  const { L, ctx, store } = makeSandbox();
  L.begin('father');
  L.advance(); L.advance();
  const sd = JSON.parse(store.dannoura_save_v1);
  assert.equal(L.saveIsLife(sd), true);
  assert.equal(sd.gs.homeData.life.day, 2);
  assert.equal(sd.gs.homeData.life.startedFrom, 'father');
  assert.equal(L.saveIsLife({ version: 1, gs: { day: 12 } }), false);
  assert.equal(L.saveIsLife({ version: 1, gs: { homeData: { life: { active: false, day: 3 } } } }), false);
  assert.equal(L.saveIsLife(null), false);
});

test('つづきから：暮らしでないセーブは元の loadGame へ', () => {
  const { ctx, calls, store } = makeSandbox();
  store.dannoura_save_v1 = JSON.stringify({ version: 1, gs: { day: 12 } });
  ctx.loadGame();
  assert.equal(calls.loadGame, 1);
});

test('はじめから：メモリに残った前の家・暮らしを消してから新規開始', () => {
  const { L, ctx, calls } = makeSandbox();
  L.begin('rebirth');
  assert.ok(ctx.gs.homeData);
  ctx.startStory();
  assert.equal(calls.startStory, 1);
  assert.equal('homeData' in ctx.gs, false);
  assert.equal(L.isActive(), false);
});

test('素材：一日1つ、5日ごとに海のかけら', () => {
  const { L } = makeSandbox();
  assert.deepEqual({ ...L.dailyMaterialFor(1) }, { id: 'wood', n: 1 });
  assert.deepEqual({ ...L.dailyMaterialFor(2) }, { id: 'cloth', n: 1 });
  assert.deepEqual({ ...L.dailyMaterialFor(5) }, { id: 'sea', n: 1 });
});

console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
