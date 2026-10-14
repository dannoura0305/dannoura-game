// 夜のミニゲームの目録（minigames/registry.js）と各ゲーム本体の registerMinigame がずれていないか、
// と、MG.open の遅延読み込み（成功・失敗・同時押し）を node:vm で確かめる。
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

let pass = 0, fail = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

// どんな参照にも答えるダミー（読み込み時に document などを触るゲームがあっても落ちないように）
const any = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === Symbol.iterator ? function* () {} : any),
  apply: () => any, construct: () => any,
});
const BUILTINS = { console, Math, JSON, Object, Array, Date, Number, String, Map, Set, WeakMap, Symbol, Promise, Error, RegExp,
  Uint8Array, Uint16Array, Uint32Array, Int16Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray,
  parseInt, parseFloat, isFinite, isNaN, Infinity, NaN };

function loadRegistry(gs) {
  const ctx = Object.assign({ gs }, BUILTINS);
  vm.createContext(ctx);
  vm.runInContext(read('minigames/registry.js'), ctx, { filename: 'registry.js' });
  return { ctx, META: vm.runInContext('MG_META', ctx) };
}
function loadGame(file, gs) {
  const defs = [];
  const ctx = Object.assign({ gs, registerMinigame: d => defs.push(d), addMinigameStyle() {}, document: any, localStorage: any }, BUILTINS);
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('minigames/' + file + '.js'), ctx, { filename: file + '.js' });
  return defs;
}
const GAME_FILES = readdirSync(join(ROOT, 'minigames')).filter(f => f.endsWith('.js') && !['core.js', 'registry.js'].includes(f)).map(f => f.slice(0, -3)).sort();
const plain = v => JSON.parse(JSON.stringify(v));   // vm の別 realm の配列を比べられる形に
const { META } = loadRegistry({ day: 1 });

test('目録：17本・id の重複なし・各ファイルに1本ずつ', () => {
  assert.equal(META.length, 17);
  assert.equal(new Set(META.map(m => m.id)).size, META.length);
  assert.deepEqual(plain(META.map(m => m.file)).sort(), GAME_FILES);
});

test('目録と registerMinigame の id・名前・ジャンル・アイコン・BGM・説明・効果・操作が一致', () => {
  for (const m of META) {
    const defs = loadGame(m.file, { day: 1 });
    assert.equal(defs.length, 1, m.file + ' は registerMinigame を1回だけ呼ぶ');
    const d = defs[0];
    assert.equal(d.id, m.id, m.file + ': id');
    for (const k of ['name', 'genre', 'icon', 'bgm', 'help', 'desc', 'effect']) assert.equal(m[k], d[k], `${m.id}.${k}`);
  }
});

test('RPG：進み具合で変わる説明・効果も本体と同じ文言', () => {
  const states = [
    undefined, null, 'x', {}, { cleared: 0 }, { cleared: 1, lastDay: 3, lv: 4 }, { cleared: 1, lastDay: 2, lv: 4 },
    { cleared: 2, lastDay: 3 }, { cleared: 3, lastDay: 1, lv: 12 }, { cleared: 4, lastDay: 3, lv: 99 }, { cleared: 4, lastDay: 9 },
    { cleared: 5, ending: 'sink' }, { cleared: 5, ending: 'true', lastDay: 3 }, { cleared: 9, ending: 'bogus' }, { cleared: '2', lastDay: '3', lv: '7.8' },
    { cleared: -3, lv: 0 },
  ];
  const gs = { day: 3 };
  const { META: M2 } = loadRegistry(gs);
  const meta = M2.find(m => m.id === 'rpg');
  const [def] = loadGame('rpg', gs);
  for (const s of states) {
    gs.rpg = s;
    assert.equal(meta.desc, def.desc, 'desc ' + JSON.stringify(s));
    assert.equal(meta.effect, def.effect, 'effect ' + JSON.stringify(s));
  }
  assert.equal(gs.rpg.cleared, -3, '目録は gs.rpg を書き換えない');
});

test('並び順：以前の <script> の順のまま（シミュレーターの乱数結果を変えない）', () => {
  assert.deepEqual(plain(META.map(m => m.id)), ['shooter', 'rogue', 'puzzle', 'cards', 'runner', 'defense', 'rpg', 'stealth', 'quiz', 'horror', 'factory3d', 'cooking', 'escape', 'blocks', 'manager', 'fishing', 'race']);
});

test('選択画面のカテゴリ（夜の🎮＋工場タブ）・シミュレーターの典型結果・アイコンが全ゲームを覆う', () => {
  const core = read('minigames/core.js');
  const cats = [...core.matchAll(/ids:\[([^\]]*)\]/g)].flatMap(m => m[1].match(/'[^']+'/g).map(s => s.slice(1, -1)));
  const { ctx } = loadRegistry({ day: 1 });
  const fac = plain(vm.runInContext('MG_FACTORY_IDS', ctx));
  assert.equal(cats.filter(id => fac.includes(id)).length, 0, '工場タブのゲームは夜の🎮のカテゴリに入れない');
  assert.deepEqual(cats.concat(fac).sort(), plain(META.map(m => m.id)).sort());
  const sim = read('tools/simulator.html');
  for (const m of META) assert.match(sim, new RegExp('\\n\\s*' + m.id + ':\\s*\\{ok:'), 'MG_TYPICAL.' + m.id);
});

test('工場タブ：仕事・資格・通勤の7本（巡回・配線・組み立て・第三工場・危険物・脱出・原付）／夜の🎮は残り10本', () => {
  const { ctx } = loadRegistry({ day: 1 });
  const fac = plain(vm.runInContext('MG_FACTORY_IDS', ctx));
  assert.deepEqual(fac, ['rogue', 'puzzle', 'blocks', 'factory3d', 'quiz', 'escape', 'race']);
  for (const id of fac) assert.equal(vm.runInContext(`mgPlaceOf(${JSON.stringify(id)})`, ctx), 'factory');
  const night = META.filter(m => !fac.includes(m.id)).map(m => m.id);
  assert.deepEqual(plain(night), ['shooter', 'cards', 'runner', 'defense', 'rpg', 'stealth', 'horror', 'cooking', 'manager', 'fishing']);
  for (const id of night) assert.equal(vm.runInContext(`mgPlaceOf(${JSON.stringify(id)})`, ctx), 'night');
});

test('スキル：どのミニゲームにも有利になるスキルがあり、ゲーム本体がそのスキルを読んでいる', () => {
  const { ctx } = loadRegistry({ day: 1 });
  const FX = plain(vm.runInContext('MG_SKILL_FX', ctx));
  const game = read('game.js');
  const skdef = game.slice(game.indexOf('const SKDEF={'), game.indexOf('function defaultSkills'));
  const keys = [...skdef.matchAll(/^\s+(\w+):\s*\{name:/gm)].map(m => m[1]);
  assert.ok(keys.length >= 14 && keys.length <= 16, 'スキルの数 ' + keys.length);
  for (const k of ['examTech', 'riding']) assert.ok(keys.includes(k), '新スキル ' + k);
  for (const m of META) {
    const rows = FX[m.id] || [];
    assert.ok(rows.length >= 1, m.id + ' に効くスキルがある');
    const src = read('minigames/' + m.file + '.js');
    for (const [k, tx] of rows) {
      assert.ok(keys.includes(k), `${m.id}: ${k} は SKDEF にある`);
      assert.ok(tx && tx.length >= 4, `${m.id}.${k} の説明`);
      assert.ok(src.includes(k), `${m.file}.js が ${k} を読む`);
    }
  }
  for (const [k] of FX._factory) assert.ok(read('minigames/core.js').includes(`mgSkill('${k}'`), 'core.js が工場の ' + k + ' を読む');
  // どのスキルも、どれかのミニゲームに効く（歌唱力・睡眠効率も）
  const used = new Set(Object.values(FX).flat().map(r => r[0]));
  for (const k of keys) assert.ok(used.has(k), k + ' がどのミニゲームにも効かない');
});

test('スキル：古いセーブの移行（無いキーは0・壊れた値は0・上限超えはSPで返す・知らないキーは残す）', () => {
  const game = read('game.js');
  const src = game.slice(game.indexOf('const SKDEF={'), game.indexOf('// スキル → そのスキルが効くミニゲーム'));
  const ctx = Object.assign({}, BUILTINS); vm.createContext(ctx);
  vm.runInContext(src + ';globalThis.__m=migrateSkills;', ctx);
  const old = { soundDiag: 2, emergencyFix: 3, wiring: 0, plc: 1, chatSkill: 'x', kaidanSkill: 5, singSkill: 12.5, radioVibe: -1, stressRes: 0, focus: 3, sleepEff: 1, emoCtrl: 0, bedtime: 2, chores: 2, legacy: 4 };
  const r = plain(ctx.__m(old));
  assert.equal(r.skills.examTech, 0); assert.equal(r.skills.riding, 0);
  assert.equal(r.skills.chatSkill, 0); assert.equal(r.skills.radioVibe, 0);
  assert.equal(r.skills.singSkill, 10); assert.equal(r.refund, 2);
  assert.equal(r.skills.soundDiag, 2); assert.equal(r.skills.chores, 2); assert.equal(r.skills.legacy, 4);
  assert.deepEqual(plain(ctx.__m(undefined)).refund, 0);
});

test('index.html はゲーム本体を先に読まない（目録と core だけ）', () => {
  const html = read('index.html');
  const mg = [...html.matchAll(/<script src="minigames\/([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(mg, ['registry.js', 'core.js']);
});

// ── MG.open の遅延読み込み（core.js を最小の DOM の代わりで動かす） ──
function makeCore({ files }) {
  const els = {};
  const log = { notif: [], scripts: [], bgm: [] };
  const mkEl = (tag, id) => {
    const cls = new Set();
    const e = {
      tagName: tag, id, dataset: {}, style: {}, innerHTML: '', textContent: '', className: '', children: [],
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: (c, on) => (on ?? !cls.has(c)) ? cls.add(c) : cls.delete(c) },
      setAttribute() {}, addEventListener() {}, insertAdjacentHTML() {}, remove() { e.removed = true; },
      appendChild(c) { e.children.push(c); if (c.tagName === 'script') loadScript(c); return c; },
      insertBefore(c) { e.children.push(c); return c; },
      querySelector: () => mkEl('div'), querySelectorAll: () => [],
      getContext: () => null,
      get firstChild() { return e.children[0] || null; },
    };
    return e;
  };
  const doc = {
    head: null, body: null,
    getElementById: id => els[id] || (['mg-loading', 'mg-avatar'].includes(id) ? null : (els[id] = mkEl('div', id))),
    createElement: t => mkEl(t),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  };
  doc.head = mkEl('head'); doc.body = mkEl('body');
  const origAppend = doc.body.appendChild;
  doc.body.appendChild = c => { if (c.id) els[c.id] = c; return origAppend(c); };
  const ctx = Object.assign({
    document: doc, window: null, localStorage: { getItem: () => null, setItem() {} },
    gs: { day: 1, mental: 50, fatigue: 10, mgDay: {} },
    showNotif: m => log.notif.push(m), updateNavActive() {}, showResult() {}, advTime() {}, loadScene() {}, checkGameOver() {}, logGrow() {}, cutin() {},
    AU: { fadeBGM: k => log.bgm.push(k), se() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
  }, BUILTINS, { console: Object.assign({}, console, { warn() {} }) });
  ctx.window = ctx;
  function loadScript(s) {
    log.scripts.push(s.src);
    setTimeout(() => {
      const f = s.src.replace(/^minigames\//, '').replace(/\.js$/, '');
      if (files[f] === 'hang') return;
      if (!(f in files)) { s.onerror && s.onerror(); return; }
      vm.runInContext(files[f], ctx);
      s.onload && s.onload();
    }, 5);
  }
  vm.createContext(ctx);
  vm.runInContext('const MG_META=[{id:"fake",file:"fake",icon:"*",name:"ためし",genre:"テスト",desc:"d",effect:"e",help:"h",bgm:"night"},{id:"gone",file:"gone",icon:"*",name:"ない",genre:"テスト",desc:"d",effect:"e",help:"h"},{id:"empty",file:"empty",icon:"*",name:"空",genre:"テスト",desc:"d",effect:"e",help:"h"}];', ctx);
  vm.runInContext(read('minigames/core.js'), ctx, { filename: 'core.js' });
  for (const id of ['mg-picker', 'mg-screen']) doc.getElementById(id);
  return { ctx, els, log, run: s => vm.runInContext(s, ctx) };
}
const FAKE = 'registerMinigame({id:"fake",icon:"*",name:"ためし",genre:"テスト",desc:"d",effect:"e",help:"h",bgm:"night",start(body,mg){globalThis.started=(globalThis.started||0)+1;return {result:()=>({title:"t",fx:{}})};}});';

test('MG.open：未読込なら読み込んでから始め、Promise<true> を返す', async () => {
  const { run, els, log } = makeCore({ files: { fake: FAKE } });
  assert.equal(run('minigameLoaded("fake")'), false);
  const p = run('MG.open("fake")');
  assert.equal(typeof p.then, 'function');
  assert.equal(els['mg-loading'].classList.contains('active'), true, '読み込み中の表示');
  assert.equal(run('MG._ended'), true, '読み込み中はまだ始まらない');
  assert.equal(await p, true);
  assert.equal(els['mg-loading'].classList.contains('active'), false);
  assert.equal(run('MG.def.id'), 'fake');
  assert.equal(typeof run('MG.def.start'), 'function');
  assert.equal(run('MINIGAMES.length'), 3, '差し替え（増えない）');
  assert.equal(run('MINIGAMES[0].file'), 'fake');
  assert.equal(run('globalThis.started'), 1);
  assert.deepEqual(log.scripts, ['minigames/fake.js']);
  assert.deepEqual(log.bgm, ['night']);
  // 2回目以降は同期的に始まる（読み込み直さない）
  run('MG.end("quit")'); run('gs.mgDay={}');
  const p2 = run('MG.open("fake")');
  assert.equal(run('MG._ended'), false, '読み込み済みならその場で始まる');
  assert.equal(await p2, true);
  assert.equal(log.scripts.length, 1);
});

test('MG.open：読み込み失敗は通知だけ・状態は変えない・もう一度選べる', async () => {
  const files = {};
  const { run, els, log } = makeCore({ files });
  run('MG.def={id:"before"}');
  els['mg-picker'].classList.add('active');
  const ok = await run('MG.open("fake")');
  assert.equal(ok, false);
  assert.equal(run('MG.def.id'), 'before');
  assert.equal(run('MG._ended'), true);
  assert.equal(els['mg-screen'].classList.contains('active'), false);
  assert.equal(els['mg-picker'].classList.contains('active'), true, '選択画面はそのまま');
  assert.equal(els['mg-loading'].classList.contains('active'), false);
  assert.equal(log.notif.length, 1);
  assert.match(log.notif[0], /読み込めません/);
  assert.equal(run('JSON.stringify(gs.mgDay)'), '{}', 'プレイ済みにならない');
  // 通信が戻ればもう一度選べる
  files.fake = FAKE;
  assert.equal(await run('MG.open("fake")'), true);
  assert.equal(log.scripts.length, 2);
});

test('MG.open：登録しないファイル・重ね押し・読み込み中に選択画面を閉じた', async () => {
  const { run, els, log } = makeCore({ files: { empty: '/* registerMinigame を呼ばない */', fake: FAKE } });
  assert.equal(await run('MG.open("empty")'), false);
  assert.equal(log.notif.length, 1);
  assert.equal(await run('MG.open("nope")'), false, '知らない id');
  // 重ね押し：2回目は始めない
  const a = run('MG.open("fake")'), b = run('MG.open("fake")');
  assert.deepEqual(await Promise.all([a, b]), [true, false]);
  assert.equal(run('globalThis.started'), 1);
  run('MG.end("quit")'); run('gs.mgDay={}');
  // 読み込み中に選択画面を閉じた → 始めない
  const { run: run2, els: els2 } = makeCore({ files: { fake: FAKE } });
  els2['mg-picker'].classList.add('active');
  const p = run2('MG.open("fake")');
  els2['mg-picker'].classList.remove('active');
  assert.equal(await p, false);
  assert.equal(run2('MG._ended'), true);
  // プレイ済みは読み込まない
  const { run: run3, log: log3 } = makeCore({ files: { fake: FAKE } });
  run3('gs.mgDay={fake:1}');
  assert.equal(await run3('MG.open("fake")'), false);
  assert.equal(log3.scripts.length, 0);
});

test('MG.preload：先読みは失敗しても何も出さない', async () => {
  const { run, log } = makeCore({ files: { fake: FAKE } });
  run('MG.preload("fake");MG.preload("fake");MG.preload("gone")');
  await new Promise(r => setTimeout(r, 30));
  assert.deepEqual(log.scripts.sort(), ['minigames/fake.js', 'minigames/gone.js']);
  assert.equal(log.notif.length, 0);
  assert.equal(run('minigameLoaded("fake")'), true);
  assert.equal(run('MG._ended'), true, '先読みでは始めない');
});

test('見出しの顔：疲労75以上か精神25以下で疲れた姿', () => {
  const { run } = makeCore({ files: {} });
  const f = (fat, men) => run(`gs.fatigue=${fat};gs.mental=${men};mgAvatarForm()`);
  assert.equal(f(74, 26), 'normal');
  assert.equal(f(75, 80), 'tired');
  assert.equal(f(0, 25), 'tired');
  assert.equal(f(10, 26), 'normal');
});

for (const [name, fn] of queue) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
