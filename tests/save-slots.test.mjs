// セーブスロット（game.js の「==SAVE-SLOTS:BEGIN==」〜「==SAVE-SLOTS:END==」）のテスト（node:vm・DOMなし）
// 旧セーブの移行（非破壊）、スロットの分離（家・暮らしが別スロットへ漏れない）、削除、壊れたスロット
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = readFileSync(join(ROOT, 'game.js'), 'utf8');
const a = GAME.indexOf('// ==SAVE-SLOTS:BEGIN==');
const b = GAME.indexOf('// ==SAVE-SLOTS:END==');
assert.ok(a > 0 && b > a, 'game.js にセーブスロットの範囲の印がある');
const SRC = GAME.slice(a, b);

function makeStore(init, opts = {}) {
  const d = Object.assign({}, init || {});
  return {
    _d: d,
    getItem: k => (Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null),
    setItem: (k, v) => {
      if (opts.failKeys && opts.failKeys.includes(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      d[k] = String(v);
    },
    removeItem: k => { delete d[k]; },
  };
}
const freshGs = () => ({
  day: 1, money: 12400, debt: 840000, rank: 0, hour: 22, min: 17, _endless: false,
  completedAchs: new Set(), personality: { a: 1 }, skills: {}, growHistory: [], growMilestones: [],
  listeners: [{ name: 'さくら', trust: 0, regular: 0, danger: 0, evo: 0, type: 'normal' }],
});
function boot(store) {
  const notes = [];
  const ctx = {
    console, Date, JSON, Math, Object, Array, Set, String, Number, Error,
    localStorage: store,
    showNotif: m => notes.push(m),
    initPersonality: () => ({ a: 1 }),
  };
  ctx.gs = freshGs();
  vm.createContext(ctx);
  vm.runInContext(SRC + '\n;globalThis.__api={SAVESLOTS,setActiveSlot,saveGame,saveDataToGs,makeSaveSlots,get SAVE_KEY(){return SAVE_KEY;},get SAVE_SLOT(){return SAVE_SLOT;}};', ctx, { filename: 'game.js#save-slots' });
  return { ctx, api: ctx.__api, notes, store };
}
const saveOf = gs => JSON.stringify({ version: 1, savedAt: '2026-10-01T10:00:00.000Z', gs });
// 読み込み：game.js の loadGame と同じ順（read → saveDataToGs）
function load(api, n) { api.setActiveSlot(n); const r = api.SAVESLOTS.read(n); if (r.data) api.saveDataToGs(r.data.gs); return r; }

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log('save-slots');

test('旧セーブ（dannoura_save_v1）はスロット1へ移り、書けたのを確かめてから旧キーを消す', () => {
  const old = saveOf({ day: 12, money: 30000, debt: 500000, rank: 2 });
  const { api, store } = boot(makeStore({ dannoura_save_v1: old }));
  assert.equal(api.SAVESLOTS.migrateResult, 'migrated');
  assert.equal(store.getItem('dannoura_save_slot1'), old);
  assert.equal(store.getItem('dannoura_save_v1'), null);
  const s = api.SAVESLOTS.summary(1);
  assert.equal(s.day, 12); assert.equal(s.money, 30000); assert.equal(s.debt, 500000); assert.equal(s.rank, 2);
  assert.equal(api.SAVE_SLOT, 1); assert.equal(api.SAVE_KEY, 'dannoura_save_slot1');
});

test('移行で書けないとき（容量不足）は旧キーを残し、スロット1として読める。保存に成功したら旧キーを消す', () => {
  const old = saveOf({ day: 7, money: 1000, debt: 900000 });
  const store = makeStore({ dannoura_save_v1: old }, { failKeys: ['dannoura_save_slot1'] });
  const { api } = boot(store);
  assert.equal(api.SAVESLOTS.migrateResult, 'failed');
  assert.equal(store.getItem('dannoura_save_v1'), old, '旧キーは消えていない');
  assert.equal(api.SAVESLOTS.summary(1).day, 7, 'スロット1として見える');
  assert.equal(api.SAVESLOTS.used().length, 1);
  // 書けるようになってから保存 → 旧キーは不要になる
  const store2 = makeStore(store._d);
  const r2 = boot(store2);
  r2.ctx.gs.day = 8;
  assert.equal(r2.api.saveGame(true), true);
  assert.equal(store2.getItem('dannoura_save_v1'), null);
  assert.equal(r2.api.SAVESLOTS.summary(1).day, 8);
});

test('移行は何度起動しても一度だけ：スロット1が既にあれば旧キーには触らない', () => {
  const s1 = saveOf({ day: 20 });
  const old = saveOf({ day: 3 });
  const { api, store } = boot(makeStore({ dannoura_save_slot1: s1, dannoura_save_v1: old }));
  assert.equal(api.SAVESLOTS.migrateResult, 'kept');
  assert.equal(store.getItem('dannoura_save_slot1'), s1);
  assert.equal(store.getItem('dannoura_save_v1'), old);
  assert.equal(api.SAVESLOTS.summary(1).day, 20);
  const again = boot(store);
  assert.equal(again.api.SAVESLOTS.migrateResult, 'kept');
  const none = boot(makeStore({}));
  assert.equal(none.api.SAVESLOTS.migrateResult, 'none');
  assert.equal(none.api.SAVESLOTS.used().length, 0);
});

test('自動セーブは使っているスロットだけに書く（他のスロットは1文字も変わらない）', () => {
  const s1 = saveOf({ day: 9, money: 5 });
  const { api, ctx, store } = boot(makeStore({ dannoura_save_slot1: s1 }));
  api.setActiveSlot(2);
  assert.equal(api.SAVE_KEY, 'dannoura_save_slot2');
  ctx.gs.day = 4;
  assert.equal(api.saveGame(true), true);
  assert.equal(store.getItem('dannoura_save_slot1'), s1);
  assert.equal(JSON.parse(store.getItem('dannoura_save_slot2')).gs.day, 4);
  assert.equal(JSON.parse(store.getItem('dannoura_save_slot2')).slot, 2);
  assert.equal(store.getItem('dannoura_save_slot3'), null);
  // 使っているスロットは次の起動でも同じ
  const again = boot(store);
  assert.equal(again.api.SAVE_SLOT, 2);
});

test('スロットの分離：スロット1の家・暮らし（homeData.life）がスロット2の読み込みへ漏れない', () => {
  const { api, ctx, store } = boot(makeStore({}));
  // スロット1：暮らしモード中
  api.setActiveSlot(1);
  ctx.gs.day = 35;
  ctx.gs.homeData = { version: 3, life: { active: true, day: 4, startedFrom: 'rebirth', baseDay: 31 }, materials: { wood: 9 } };
  ctx.gs.endingReached = 'rebirth';
  ctx.gs.rpg = { cleared: 5 };
  api.saveGame(true);
  // スロット2：家を一度も開いていない本編
  api.setActiveSlot(2);
  api.saveDataToGs(JSON.parse(JSON.stringify(Object.assign(freshGs(), { day: 6, completedAchs: [] }))));
  delete ctx.gs.homeData; delete ctx.gs.endingReached; delete ctx.gs.rpg;
  api.saveGame(true);
  // 1 → 2 → 1 と読み替える
  load(api, 1);
  assert.equal(ctx.gs.homeData.life.active, true);
  load(api, 2);
  assert.equal(ctx.gs.day, 6);
  assert.equal('homeData' in ctx.gs, false, '前のスロットの家が残っていない');
  assert.equal('endingReached' in ctx.gs, false, '前のスロットの結末が残っていない');
  assert.equal('rpg' in ctx.gs, false);
  // スロット2で保存しても、スロット1の暮らしはそのまま
  ctx.gs.day = 7; api.saveGame(true);
  const s1 = api.SAVESLOTS.summary(1), s2 = api.SAVESLOTS.summary(2);
  assert.equal(s1.lifeDay, 5); assert.equal(s1.ending, 'rebirth');
  assert.equal(s2.lifeDay, null); assert.equal(s2.ending, null); assert.equal(s2.day, 7);
  assert.equal(JSON.parse(store.getItem('dannoura_save_slot2')).gs.homeData, undefined);
  load(api, 1);
  assert.equal(ctx.gs.homeData.life.day, 4);
  assert.equal(ctx.gs.homeData.materials.wood, 9);
});

test('要約：日数・所持金・借金・暮らしの日数・結末・保存時刻', () => {
  const { api } = boot(makeStore({
    dannoura_save_slot1: saveOf({ day: 31, money: 120000, debt: 0, homeData: { life: { active: true, day: 2, startedFrom: 'king' } } }),
    dannoura_save_slot2: saveOf({ day: 18, money: -300, debt: 1500000, endingReached: 'collapse' }),
    dannoura_save_slot3: saveOf({ day: 31, homeData: { life: { active: false, day: 9 } } }),
  }));
  const [s1, s2, s3] = api.SAVESLOTS.list();
  assert.equal(s1.lifeDay, 3); assert.equal(s1.lifeFrom, 'king');
  assert.equal(s2.ending, 'collapse'); assert.equal(s2.money, -300); assert.equal(s2.debt, 1500000);
  assert.equal(s3.lifeDay, null, '暮らしが終わっていれば暮らし扱いにしない');
  assert.equal(s1.savedAt, '2026-10-01T10:00:00.000Z');
});

test('削除：そのスロットだけ消える。スロット1を消すと残っていた旧キーも消える（消したのに戻らない）', () => {
  const s2 = saveOf({ day: 2 }), s3 = saveOf({ day: 3 });
  const { api, store } = boot(makeStore({ dannoura_save_slot1: saveOf({ day: 1 }), dannoura_save_v1: saveOf({ day: 99 }), dannoura_save_slot2: s2, dannoura_save_slot3: s3 }));
  api.SAVESLOTS.remove(1);
  assert.equal(store.getItem('dannoura_save_slot1'), null);
  assert.equal(store.getItem('dannoura_save_v1'), null);
  assert.equal(api.SAVESLOTS.summary(1).empty, true);
  assert.equal(store.getItem('dannoura_save_slot2'), s2);
  assert.equal(store.getItem('dannoura_save_slot3'), s3);
  api.SAVESLOTS.remove(3);
  assert.equal(JSON.stringify(api.SAVESLOTS.used().map(s => s.slot)), '[2]');
  assert.equal(api.SAVESLOTS.remove(0), false);
  assert.equal(api.SAVESLOTS.remove(4), false);
});

test('エンディング一覧・設定はスロットと無関係（保存・削除で触らない）', () => {
  const endings = JSON.stringify({ rebirth: { firstDay: 30, count: 1 } });
  const { api, store } = boot(makeStore({ dannoura_endings: endings, dannoura_audio: '{"bgm":0.5}', dannoura_tutorial_seen: '1' }));
  api.setActiveSlot(3); api.saveGame(true); api.SAVESLOTS.remove(3); api.SAVESLOTS.remove(1);
  assert.equal(store.getItem('dannoura_endings'), endings);
  assert.equal(store.getItem('dannoura_audio'), '{"bgm":0.5}');
  assert.equal(store.getItem('dannoura_tutorial_seen'), '1');
});

test('壊れたスロット：一覧では「壊れている」と分かり、他のスロットは読める。勝手に消さない', () => {
  const bad = '{"version":1,"gs":';
  const { api, store } = boot(makeStore({
    dannoura_save_slot1: bad,
    dannoura_save_slot2: saveOf({ day: 5 }),
    dannoura_save_slot3: JSON.stringify({ version: 99, gs: { day: 1 } }),
    dannoura_save_meta: '{not json',
  }));
  const [s1, s2, s3] = api.SAVESLOTS.list();
  assert.equal(s1.corrupt, true); assert.equal(s1.reason, 'broken');
  assert.equal(s2.day, 5);
  assert.equal(s3.corrupt, true); assert.equal(s3.reason, 'version');
  assert.equal(store.getItem('dannoura_save_slot1'), bad, '壊れたデータも勝手には消さない');
  assert.equal(api.SAVE_SLOT, 1, '壊れたメタは既定のスロット1');
  for (const v of ['null', '"x"', '[]', '{"version":1}', '{"version":1,"gs":[]}', '{"gs":{"day":3}}']) {
    const r = boot(makeStore({ dannoura_save_slot2: v }));
    assert.equal(r.api.SAVESLOTS.summary(2).corrupt, true, v);
  }
  // 最新は壊れたスロットを飛ばす
  assert.equal(api.SAVESLOTS.latest().slot, 2);
  // 上書きで直る
  api.setActiveSlot(1); api.saveGame(true);
  assert.equal(api.SAVESLOTS.summary(1).corrupt, undefined);
});

test('保存に失敗したら false（成功通知を出さない）', () => {
  const { api, notes } = boot(makeStore({}, { failKeys: ['dannoura_save_slot2'] }));
  api.setActiveSlot(2);
  assert.equal(api.saveGame(false), false);
  assert.ok(notes.some(n => /容量不足/.test(n)));
  assert.ok(!notes.some(n => /セーブしました/.test(n)));
  api.setActiveSlot(3);
  assert.equal(api.saveGame(false), true);
  assert.ok(notes.some(n => /セーブしました（スロット3）/.test(n)));
});

test('スロット番号の検証：範囲外は無視', () => {
  const { api } = boot(makeStore({}));
  assert.equal(api.setActiveSlot(0), false);
  assert.equal(api.setActiveSlot(4), false);
  assert.equal(api.setActiveSlot('x'), false);
  assert.equal(api.SAVE_SLOT, 1);
  assert.equal(api.SAVESLOTS.read(9).empty, true);
});

console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
