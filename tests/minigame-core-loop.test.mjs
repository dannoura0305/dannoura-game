// ミニゲーム共通ループ（minigames/core.js の MG.loop / mgFrameClock）の経過時間を確かめる。
// 以前は「前回時刻の更新（last=now;）」がコメントの中に入ってしまい、dt が毎フレーム上限 0.05 秒に張り付いて
// 60Hz で3倍速・120Hz で6倍速になっていた。ここでは rAF の時刻を 30/60/120/144Hz で流し込み、
// どの画面でも同じだけゲームの時間が進むこと・dt が時刻の差で変わること・大きな空白で飛ばないことを確かめる。
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

// core.js を最小の DOM の代わりで動かす（rAF は手で時刻を渡して進める）
function makeCore() {
  const listeners = {};
  const mkEl = () => {
    const cls = new Set();
    const e = {
      dataset: {}, style: {}, innerHTML: '', textContent: '', className: '', children: [],
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle() {} },
      setAttribute() {}, addEventListener() {}, insertAdjacentHTML() {}, remove() {},
      appendChild(c) { e.children.push(c); return c; }, insertBefore(c) { return c; },
      querySelector: () => mkEl(), querySelectorAll: () => [], getContext: () => null,
    };
    return e;
  };
  const els = {};
  const doc = {
    head: mkEl(), body: mkEl(), hidden: false,
    getElementById: id => els[id] || (['mg-loading', 'mg-avatar'].includes(id) ? null : (els[id] = mkEl())),
    createElement: () => mkEl(), querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  };
  let rafQ = [], rafId = 0;
  const ctx = {
    document: doc, window: null, localStorage: { getItem: () => null, setItem() {} },
    gs: { day: 1, mgDay: {} }, AU: { fadeBGM() {}, se() {} },
    updateNavActive() {}, showResult() {}, advTime() {}, loadScene() {}, checkGameOver() {}, applyMinigameFx() {}, fxToHtml: () => '',
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: cb => { rafQ.push(cb); return ++rafId; },
    cancelAnimationFrame() { rafQ = []; },
    performance: { now: () => 0 },
    console, Math, JSON, Object, Array, Date, Number, String, Map, Set, Promise, Error, RegExp, isFinite, isNaN, parseInt, parseFloat,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('minigames/core.js'), ctx, { filename: 'core.js' });
  const run = s => vm.runInContext(s, ctx);
  // 次の rAF を時刻 now（ミリ秒）で呼ぶ
  const frame = now => { const q = rafQ; rafQ = []; q.forEach(cb => cb(now)); };
  return { ctx, run, frame, listeners, doc, pending: () => rafQ.length };
}

// MG.loop を始めて、hz の画面で seconds 秒ぶんフレームを流し、渡された dt の列を返す
function simulate(hz, seconds, { t0 = 1000 } = {}) {
  const core = makeCore();
  const dts = [];
  core.run('MG._ended=false');
  core.ctx.__push = dt => dts.push(dt);
  core.run('MG.loop(dt=>__push(dt))');
  const n = Math.round(seconds * hz);
  for (let i = 0; i <= n; i++) core.frame(t0 + i * 1000 / hz);
  return { dts, core };
}
const sum = a => a.reduce((s, v) => s + v, 0);

test('30/60/120/144Hz：同じ実時間なら、ゲームの時間も同じだけ進む（3秒・10秒）', () => {
  for (const sec of [3, 10]) {
    const totals = [30, 60, 120, 144].map(hz => sum(simulate(hz, sec).dts));
    for (const t of totals) assert.ok(Math.abs(t - sec) < 1e-6, `合計 ${t} ≒ ${sec}`);
  }
});

test('dt は rAF の時刻の差（0.05 に張り付かない）・初回フレームは 0', () => {
  for (const hz of [30, 60, 120, 144]) {
    const { dts } = simulate(hz, 1);
    assert.equal(dts[0], 0, '初回は 0');
    for (const dt of dts.slice(1)) assert.ok(Math.abs(dt - 1 / hz) < 1e-9, `${hz}Hz の dt=${dt}`);
  }
  // 以前の不具合の再発防止：60Hz の1秒で dt の合計が3秒になったりしない
  assert.ok(sum(simulate(60, 1).dts) < 1.001);
  assert.ok(sum(simulate(120, 1).dts) < 1.001);
});

test('ばらつくフレーム間隔でも合計は実時間どおり（上限未満の揺れ）', () => {
  const core = makeCore(); const dts = [];
  core.run('MG._ended=false'); core.ctx.__push = dt => dts.push(dt); core.run('MG.loop(dt=>__push(dt))');
  let t = 500; core.frame(t);
  const steps = [16.7, 8.3, 33.3, 6.9, 25, 16.7, 41, 12, 16.7, 20];
  for (let k = 0; k < 30; k++) for (const s of steps) { t += s; core.frame(t); }
  assert.ok(Math.abs(sum(dts) - (t - 500) / 1000) < 1e-9);
  assert.ok(new Set(dts.map(v => v.toFixed(4))).size > 5, 'dt が時刻の差で変わる');
});

test('大きな空白（引っかかり・タブ復帰）は 1フレーム 0.05 秒までで止める', () => {
  const core = makeCore(); const dts = [];
  core.run('MG._ended=false'); core.ctx.__push = dt => dts.push(dt); core.run('MG.loop(dt=>__push(dt))');
  core.frame(0); core.frame(16); core.frame(2016); core.frame(2032);
  assert.equal(dts[2], 0.05, '2秒の空白は 0.05 秒');
  assert.ok(Math.abs(dts[3] - 0.016) < 1e-9);
  assert.equal(core.run('MG_DT_MAX'), 0.05);
});

test('タブが裏に回ったら数え直す（戻った直後のフレームは 0）', () => {
  const core = makeCore(); const dts = [];
  core.run('MG._ended=false'); core.ctx.__push = dt => dts.push(dt); core.run('MG.loop(dt=>__push(dt))');
  core.frame(0); core.frame(16);
  core.doc.hidden = true; core.listeners.visibilitychange.forEach(f => f());
  core.doc.hidden = false; core.listeners.visibilitychange.forEach(f => f());
  core.frame(30016); core.frame(30032);
  assert.equal(dts[2], 0, '復帰直後は 0');
  assert.ok(Math.abs(dts[3] - 0.016) < 1e-9);
});

test('時刻が戻る・数字でない時刻は 0（マイナスにならない）', () => {
  const c = makeCore().run('mgFrameClock()');
  assert.equal(c.tick(100), 0);
  assert.equal(c.tick(50), 0);
  assert.ok(Math.abs(c.tick(66) - 0.016) < 1e-9);
  assert.equal(c.tick(NaN), 0);
  assert.equal(c.tick(undefined), 0);
  c.reset(); assert.equal(c.tick(1000), 0);
});

test('終了したらループは止まり、時計も外れる', () => {
  const core = makeCore(); const dts = [];
  core.run('MG._ended=false'); core.ctx.__push = dt => dts.push(dt); core.run('MG.loop(dt=>__push(dt))');
  core.frame(0); core.frame(16);
  core.run('MG._ended=true');
  core.frame(32);
  assert.equal(dts.length, 2);
  assert.equal(core.pending(), 0);
});

test('1フレームの例外でループは止まらない', () => {
  const core = makeCore(); let n = 0;
  core.ctx.console = Object.assign({}, console, { error() {} });
  core.run('MG._ended=false'); core.ctx.__f = () => { n++; throw new Error('x'); };
  core.run('MG.loop(dt=>__f(dt))');
  for (let i = 0; i < 5; i++) core.frame(i * 16);
  assert.equal(n, 5);
});

// 再発防止：行末コメントの中に代入文が入り込んでいないか（以前の「…あるlast=now;」の形）
test('ソース：行末コメントに代入文が埋もれていない（minigames/*.js）', () => {
  const RX = /\/\/[^'"\n]*[A-Za-z_$][\w$.[\]]*\s*(=|\+=|-=)\s*[^=\s][^;]*;\s*$/;
  // 以前の行で検出できることを確かめる
  assert.ok(RX.test("      const dt=Math.max(0,Math.min(.05,(now-last)/1000)); // 初回フレームでマイナスになることがあるlast=now;"));
  for (const f of readdirSync(join(ROOT, 'minigames')).filter(f => f.endsWith('.js'))) {
    read('minigames/' + f).split('\n').forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      assert.ok(!RX.test(line), `${f}:${i + 1} 行末コメントに代入文: ${line.trim().slice(0, 120)}`);
    });
  }
});

test('シューティングは core の dt をそのまま使う（自前の時計で二重に補正しない）', () => {
  const src = read('minigames/shooter.js');
  assert.ok(/mg\.loop\(dt=>\{/.test(src), 'mg.loop の dt を受け取る');
  assert.ok(!/lastNow/.test(src), '自前の前回時刻を持たない');
  const loopBody = src.slice(src.indexOf('mg.loop(dt=>{'), src.indexOf('mg.loop(dt=>{') + 400);
  assert.ok(!/performance\.now\(\)/.test(loopBody), 'ループの中で performance.now() から dt を作らない');
});

test('MG.loop を使う全ミニゲームが dt を受け取る（16本＋シューティング）', () => {
  const files = readdirSync(join(ROOT, 'minigames')).filter(f => f.endsWith('.js') && !['core.js', 'registry.js'].includes(f));
  const users = files.filter(f => /mg\.loop\(/.test(read('minigames/' + f)));
  assert.equal(users.length, 17, users.join(','));
});

for (const [name, fn] of queue) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n   ', e.message); }
}
console.log(`minigame-core-loop: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
