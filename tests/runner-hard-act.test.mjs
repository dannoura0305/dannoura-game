// 買い出しダッシュ　高難易度版：自機の動き（minigames/runner/act.js）を、受け取った数値の試験（docs/minigames/runner-hard/test_vectors.json）と比べる。
// ・1/60 秒ずつ回して、各こまの［横, 高さ, 縦の速さ］（元の px）を ±1 こまで合わせる（最初のこまの扱いが未確認のため）
// ・歩き・ダッシュ・壁ずり・着地・地図の当たり・固定の歩みも確かめる
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/act.js'), 'utf8'), ctx, { filename: 'act.js' });
const RA = ctx.RunnerAct;
const TV = JSON.parse(readFileSync(join(ROOT, 'docs/minigames/runner-hard/test_vectors.json'), 'utf8'));
const S = RA.SCALE;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

// 1 つの場合を回して、各こまの［こま, 横, 高さ, 縦の速さ］（元の px）を返す
function run(act, b, inputs, frames) {
  const x0 = b.x, y0 = b.y, out = [];
  for (let f = 1; f <= frames; f++) { act.step(b, inputs(f)); out.push([f, (b.x - x0) / S, (b.y - y0) / S, b.vy / S]); }
  return out;
}
// 試験の値と ±1 こまで比べる（各こまで、前後 1 こまのどれかと合えばよい）
function match(got, want, eps = 0.01, label = '') {
  for (const w of want) {
    const near = [w[0] - 1, w[0], w[0] + 1].map(f => got.find(g => g[0] === f)).filter(Boolean);
    const ok = near.some(g => Math.abs(g[1] - w[1]) < eps * 10 && Math.abs(g[2] - w[2]) < eps * 10 && Math.abs(g[3] - w[3]) < eps * 10);
    assert.ok(ok, `${label} こま ${w[0]}：期待 ${JSON.stringify(w)}／実際 ${JSON.stringify(near.map(g => g.map(v => +(+v).toFixed(3))))}`);
  }
}
const air = () => RA.make();                                       // 地面なし（試験の値は着地を含まない）

t('押したままのジャンプ：初速 5.324・重さ 0.25・頂点 21 こま 54.06px', () => {
  const A = air(), b = A.body(0, 0); A.go(b, 'stand');
  const g = run(A, b, () => ({ j: true }), 41);
  match(g, TV.cases.full_jump.trace.slice(0, 41), 0.001, 'full_jump');
  const apex = g.reduce((m, r) => (r[2] > m[2] ? r : m)); assert.ok(Math.abs(apex[2] - 54.06) < 0.01 && Math.abs(apex[0] - 21) <= 1, JSON.stringify(apex));
});

t('8 こまで離す：上向きの速さをその場で 0 にする（少しずつ減らさない）', () => {
  const A = air(), b = A.body(0, 0);
  const g = run(A, b, f => ({ j: f <= 8 }), 23);
  match(g, TV.cases.half_jump_release_at_8f.trace.slice(0, 23), 0.001, 'half');
});

t('ダッシュジャンプ：横は着地までダッシュの速さ 3.457', () => {
  const A = air(), b = A.body(0, 0); A.go(b, 'dash'); b.prev = { j: false, d: true, dn: false };
  const g = run(A, b, () => ({ j: true, d: true, r: true }), 41);
  match(g, TV.cases.dash_jump.trace.slice(0, 41), 0.001, 'dash_jump');
});

t('落ちる速さ：毎こま 0.25 ずつ速くなり、23 こま目から 5.75 で一定', () => {
  const A = air(), b = A.body(0, 100); A.go(b, 'fall');
  const vs = []; for (let i = 0; i < 30; i++) { A.step(b, {}); vs.push(+(b.vy / S).toFixed(4)); }
  assert.deepEqual(vs, TV.cases.fall_speed_sequence.vy);
});

t('壁蹴り：溜め 5 こま止まる → 押し出し 8 こま（壁と逆へ・縦はジャンプと同じ）→ 押していれば上がり続ける', () => {
  const map = RA.makeMap(['#' + '.'.repeat(30)].concat(Array(20).fill('#' + '.'.repeat(30))));   // 左に壁（1 マス目）
  const A = RA.make({ map }), b = A.body(RA.TILE + RA.BODY.hw + 0.001, 400, -1);
  A.go(b, 'wall_slide'); b.wallDir = -1;
  const g = run(A, b, () => ({ j: true, r: true }), 27);
  match(g, TV.cases.wall_kick_hold_jump.trace, 0.001, 'wall_kick');
});

t('歩き：歩き出し 1.0 を 5 こま → 1.469（加速なし）・離すと止まる・止まって 10 こま以内なら歩き出しを省く', () => {
  const map = RA.makeMap(['.'.repeat(60), '#'.repeat(60)]);
  const A = RA.make({ map }), b = A.body(200, RA.TILE);
  const xs = []; for (let f = 1; f <= 8; f++) { const x = b.x; A.step(b, { r: true }); xs.push(+((b.x - x) / S).toFixed(4)); }
  assert.deepEqual(xs, [1, 1, 1, 1, 1, 1.4688, 1.4688, 1.4688]);
  A.step(b, {}); assert.equal(b.state, 'stand'); assert.equal(b.vx, 0);
  for (let i = 0; i < 5; i++) A.step(b, {});
  const x = b.x; A.step(b, { r: true }); assert.ok(Math.abs((b.x - x) / S - 1.46875) < 1e-6, '歩き直しは歩き出しを省く');
  for (let i = 0; i < 30; i++) A.step(b, {});
  const x2 = b.x; A.step(b, { r: true }); assert.ok(Math.abs((b.x - x2) / S - 1.0) < 1e-6, '間が空くと歩き出しから');
});

t('ダッシュ：3.457 で最長 33 こま（離す・壁で早く終わる）→ 止まり際 8 こま', () => {
  const map = RA.makeMap(['.'.repeat(80), '#'.repeat(80)]);
  const A = RA.make({ map }), b = A.body(200, RA.TILE);
  let f = 0; A.step(b, { d: true }); f++;
  while (b.state === 'dash' && f < 60) { A.step(b, { d: true }); f++; }
  assert.ok(f >= 33 && f <= 34, `ダッシュの長さ ${f}`);
  assert.equal(b.state, 'dash_end');
  const dx = b.x; for (let i = 0; i < 8; i++) A.step(b, { d: true });
  assert.equal(b.x, dx, '止まり際は動かない');
  assert.equal(b.state, 'stand');
  // 離すと早く終わる
  const c = A.body(200, RA.TILE); A.step(c, { d: true }); A.step(c, { d: true }); A.step(c, {}); assert.equal(c.state, 'dash_end');
  // 地上ダッシュの距離（33 こま）は約 114px（元）
  const e = A.body(200, RA.TILE), ex = e.x; for (let i = 0; i < 40; i++) A.step(e, { d: true });
  assert.ok(Math.abs((e.x - ex) / S - 114.1) < 4, `${((e.x - ex) / S).toFixed(1)}`);
});

t('壁ずり：壁の方向を押して落ちると 8 こま止まり、そのあと 2.0 で一定に落ちる（重さなし）・離すと落ちる', () => {
  const rows = []; for (let i = 0; i < 20; i++) rows.push('.'.repeat(10) + '#'); rows.push('#'.repeat(11));
  const map = RA.makeMap(rows), A = RA.make({ map });
  const b = A.body(10 * RA.TILE - RA.BODY.hw - 0.001, 600, 1); A.go(b, 'fall');
  A.step(b, { r: true }); assert.equal(b.state, 'wall_slide');
  const vy = []; for (let i = 0; i < 12; i++) { A.step(b, { r: true }); vy.push(+(b.vy / S).toFixed(3)); }
  assert.deepEqual(vy, [0, 0, 0, 0, 0, 0, 0, -2, -2, -2, -2, -2]);
  A.step(b, {}); assert.equal(b.state, 'fall');
});

t('着地：床で止まり、着地（4 こま）→ 立つ。上からだけ乗れる床は下からすり抜けて上に乗れる・天井で頭を打つ', () => {
  const map = RA.makeMap(['..........', '....====..', '..........', '..........', '##########']);
  const A = RA.make({ map }), b = A.body(60, RA.TILE);
  A.step(b, { j: true }); for (let i = 0; i < 80 && b.state !== 'land'; i++) A.step(b, { j: true });
  assert.equal(b.state, 'land'); assert.equal(b.y, RA.TILE);
  for (let i = 0; i < 4; i++) A.step(b, {}); assert.equal(b.state, 'stand');
  const c = A.body(5 * RA.TILE, RA.TILE);
  for (let i = 0; i < 80; i++) A.step(c, { j: i < 40 });
  assert.equal(c.y, 4 * RA.TILE, `上からだけ乗れる床に乗る：y ${c.y}`);
  const roof = RA.makeMap(['#####', '.....', '.....', '#####']), R = RA.make({ map: roof }), d = R.body(100, RA.TILE);
  for (let i = 0; i < 20; i++) R.step(d, { j: true });
  assert.ok(d.y + RA.BODY.h <= 3 * RA.TILE + 0.01, '天井を抜けない');
});

t('やられ：後ろへ 0.539・上へ 2.0（重さあり）・無敵 60 こま。とげで やられる', () => {
  const map = RA.makeMap(['.....', '.....', '#####']), A = RA.make({ map }), b = A.body(100, RA.TILE, 1);
  assert.ok(A.hurt(b)); assert.equal(b.state, 'hurt');
  const x = b.x; A.step(b, {}); assert.ok(Math.abs((b.x - x) / S + 0.539062) < 1e-4); assert.ok(Math.abs(b.vy / S - 1.75) < 1e-4);
  assert.equal(b.invul, 59); assert.equal(A.hurt(b), false, '無敵の間はやられない');
  const sp = RA.makeMap(['.....', '..^..', '#####']), B = RA.make({ map: sp }), c = B.body(20, RA.TILE, 1);
  for (let i = 0; i < 60 && c.state !== 'hurt'; i++) B.step(c, { r: true });
  assert.equal(c.state, 'hurt');
});

t('床から落ちる：歩いて端を越えると落ちる。猶予（coyoteF）を入れると落ちた直後も跳べる・先行入力（bufferF）', () => {
  const map = RA.makeMap(['..........', '..........', '#####.....']);
  const A = RA.make({ map }), b = A.body(4 * RA.TILE, RA.TILE, 1);
  for (let i = 0; i < 30 && b.state !== 'fall'; i++) A.step(b, { r: true });
  assert.equal(b.state, 'fall');
  A.step(b, { r: true, j: true }); assert.equal(b.state, 'fall', '猶予なし（元の形）では跳べない');
  const B = RA.make({ map, phys: { coyoteF: 6, bufferF: 6 } }), c = B.body(4 * RA.TILE, RA.TILE, 1);
  for (let i = 0; i < 30 && c.state !== 'fall'; i++) B.step(c, { r: true });
  B.step(c, { r: true, j: true }); assert.equal(c.state, 'jump', '猶予ありでは跳べる');
});

t('固定の歩み：dt を 1/60 ずつ回し、余りは持ち越す（1 回に最大 5 歩）', () => {
  const A = air(), b = A.body(0, 0), go = RA.stepper(A);
  let steps = 0; for (let i = 0; i < 100; i++) steps += go(b, 1 / 144, {});
  assert.ok(Math.abs(steps - Math.floor(100 * 60 / 144)) <= 1, `${steps}`);
  assert.equal(go(b, 1, {}), 5, '止まっていた後も一度に 5 歩まで');
});

t('状態は 12 個（立つ・歩き出し・歩く・ダッシュ・止まり際・スライド・上がる・落ちる・着地・壁ずり・壁蹴り・やられ）', () => {
  const A = air();
  for (const s of ['stand', 'walk_start', 'walk', 'dash', 'dash_end', 'slide', 'jump', 'fall', 'land', 'wall_slide', 'wall_kick', 'hurt']) assert.ok(A.STATES.includes(s), s);
});

console.log(`runner-hard-act: ${n} ok`);
