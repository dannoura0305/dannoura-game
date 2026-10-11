// トビネズミMMO：タッチ操作の考える部分（client/touch-logic.js）。DOM なしで確かめる
import assert from 'node:assert/strict';
import { stickVector, steerToward, pickTapTarget, Gestures, snapZoom, touchLayout } from '../tobinezumi/client/touch-logic.js';
import { stepField, makeFieldState, STEP_DT } from '../tobinezumi/shared/move.js';
import { buildFieldMap, isBlocking } from '../tobinezumi/shared/regions.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const deg = (a, r = 50) => [Math.cos(a * Math.PI / 180) * r, Math.sin(a * Math.PI / 180) * r];

test('スティック：遊び（デッドゾーン）の中は 0', () => {
  assert.deepEqual([stickVector(5, 3, 50).mx, stickVector(5, 3, 50).my], [0, 0]);
  assert.equal(stickVector(0, 0, 50).mag, 0);
});
test('スティック：8 方向に分かれる（画面の下＝my +1）', () => {
  const want = { 0: [1, 0], 45: [1, 1], 90: [0, 1], 135: [-1, 1], 180: [-1, 0], 225: [-1, -1], 270: [0, -1], 315: [1, -1] };
  for (const a in want) { const v = stickVector(...deg(+a), 50); assert.deepEqual([v.mx, v.my], want[a], 'angle ' + a); }
  // 境目（22.5°）の手前と向こう
  let v = stickVector(...deg(20), 50); assert.deepEqual([v.mx, v.my], [1, 0]);
  v = stickVector(...deg(25), 50); assert.deepEqual([v.mx, v.my], [1, 1]);
});
test('スティック：つまみは半径の中に収まる。mx/my は -1/0/1 だけ（サーバーの入力と同じ形）', () => {
  for (let a = 0; a < 360; a += 7) {
    const v = stickVector(...deg(a, 200), 50);
    assert.ok(Math.hypot(v.nx, v.ny) <= 50.0001);
    assert.ok([-1, 0, 1].includes(v.mx) && [-1, 0, 1].includes(v.my));
    assert.equal(v.mag, 1);
  }
});
test('タップ移動：向きは 8 方向・着いたら done', () => {
  assert.deepEqual(steerToward(0, 0, 100, 0, 4), { mx: 1, my: 0, done: false, dist: 100 });
  const d = steerToward(0, 0, 50, 50, 4); assert.deepEqual([d.mx, d.my], [1, 1]);
  assert.equal(steerToward(10, 10, 12, 11, 4).done, true);
  const up = steerToward(0, 0, 3, -60, 4); assert.deepEqual([up.mx, up.my], [0, -1]);
});
test('タップ移動：実際の stepField で目的地に着く（ジグザグで止まらない）', () => {
  const map = buildFieldMap();
  // まわりが開けた場所を探す
  let s = null;
  for (let ty = 10; ty < map.h - 10 && !s; ty++) for (let tx = 10; tx < map.w - 10 && !s; tx++) {
    let ok = true;
    for (let y = -4; y <= 4 && ok; y++) for (let x = -4; x <= 4; x++) { if (isBlocking(map, tx + x, ty + y)) { ok = false; break; } }
    if (ok) s = makeFieldState(tx * 16 + 8, ty * 16 + 8);
  }
  assert.ok(s, '開けた場所');
  const goal = { x: s.x + 47, y: s.y - 29 };
  let st = s, done = false;
  for (let i = 0; i < 60 * 6 && !done; i++) {
    const v = steerToward(st.x, st.y, goal.x, goal.y, 3);
    if (v.done) { done = true; break; }
    st = stepField(st, { mx: v.mx, my: v.my, jump: false }, STEP_DT, map);
  }
  assert.ok(done, `着いた (${st.x.toFixed(1)},${st.y.toFixed(1)}) → (${goal.x},${goal.y})`);
});
test('タップした物：採集物 > 巣穴 > トビネズミ・範囲外は null', () => {
  const c = { resources: [{ id: 'a', x: 100, y: 100 }, { id: 'p', x: 140, y: 100, pending: true }], entrances: [{ owner: 'o', x: 104, y: 104 }], players: [{ id: 'u', x: 200, y: 210 }] };
  assert.equal(pickTapTarget(100, 97, c).kind, 'res');
  assert.equal(pickTapTarget(106, 106, c).kind, 'ent');
  assert.equal(pickTapTarget(140, 97, c), null, '拾われかけ（pending）は対象にしない');
  assert.equal(pickTapTarget(200, 200, c).kind, 'player', '体は足元より上');
  assert.equal(pickTapTarget(300, 300, c), null);
});

test('指：動かさずに離す → tap', () => {
  const g = new Gestures({ slop: 8, holdMs: 200 });
  assert.deepEqual(g.down(1, 10, 10, 0), []);
  assert.deepEqual(g.move(1, 12, 11, 30), []);
  const a = g.up(1, 12, 11, 60);
  assert.equal(a.length, 1); assert.equal(a[0].type, 'tap'); assert.equal(a[0].x, 10);
  assert.equal(g.mode, 'idle');
});
test('指：slop をこえて動かす → start（始点）・drag … end', () => {
  const g = new Gestures({ slop: 8, holdMs: 200 });
  g.down(1, 10, 10, 0);
  const a = g.move(1, 25, 10, 20);
  assert.deepEqual(a.map(x => x.type), ['start', 'drag']);
  assert.deepEqual([a[0].x, a[0].y], [10, 10], 'ツールは押した所から');
  assert.deepEqual(g.move(1, 30, 12, 40).map(x => x.type), ['drag']);
  assert.deepEqual(g.up(1, 30, 12, 60).map(x => x.type), ['end']);
});
test('指：押したまま holdMs → その場で start（長押しで掘りはじめる）', () => {
  const g = new Gestures({ slop: 8, holdMs: 200 });
  g.down(1, 10, 10, 0);
  assert.deepEqual(g.tick(150), []);
  assert.deepEqual(g.tick(210).map(x => x.type), ['start']);
  assert.deepEqual(g.up(1, 10, 10, 300).map(x => x.type), ['end']);
});
test('2 本指：pinch-start → pinch（倍率・中心の移動）→ pinch-end。1 本目の tap は出ない', () => {
  const g = new Gestures();
  g.down(1, 100, 100, 0);
  assert.deepEqual(g.down(2, 140, 100, 10).map(x => x.type), ['pinch-start']);
  const p = g.move(2, 180, 100, 30)[0];
  assert.equal(p.type, 'pinch'); assert.equal(p.scale, 2); assert.equal(p.dx, 20);
  const pan = g.move(1, 120, 120, 40)[0];
  assert.ok(Math.abs(pan.scale - Math.hypot(60, 20) / 40) < 1e-9);
  assert.deepEqual(g.up(2, 180, 100, 50).map(x => x.type), ['pinch-end']);
  assert.deepEqual(g.up(1, 120, 120, 60), [], '残った指を離しても tap にならない');
  assert.equal(g.mode, 'idle');
});
test('2 本指：ツールのドラッグ中に 2 本目 → abort してピンチへ', () => {
  const g = new Gestures({ slop: 8 });
  g.down(1, 0, 0, 0); g.move(1, 20, 0, 10);
  assert.deepEqual(g.down(2, 60, 0, 20).map(x => x.type), ['abort', 'pinch-start']);
});
test('指の取り消し（pointercancel）', () => {
  const g = new Gestures({ slop: 8 });
  g.down(1, 0, 0, 0); g.move(1, 20, 0, 10);
  assert.deepEqual(g.cancel(1).map(x => x.type), ['abort']);
  assert.equal(g.mode, 'idle');
});
test('ピンチの倍率を段階に寄せる', () => {
  assert.equal(snapZoom(0.55), 0.5);
  assert.equal(snapZoom(1.1), 1);
  assert.equal(snapZoom(1.8), 2);
  assert.equal(snapZoom(9), 3);
});

test('配置：縦向きの電話は上にゲーム・下に操作の帯。画面からはみ出さない', () => {
  for (const [w, h] of [[390, 844], [360, 740]]) {
    const L = touchLayout(w, h, { t: 47, r: 0, b: 34, l: 0 });
    assert.ok(L.portrait && L.controlsH >= 190, JSON.stringify(L));
    assert.equal(L.top, 47, 'ノッチの下から');
    assert.ok(L.top + L.height <= h - 34 - L.controlsH + 1, '操作の帯と重ならない');
    assert.ok(L.width <= w && L.width >= w - 2, '横いっぱい');
    assert.ok(L.scale >= 1.4, '絵が小さすぎない: ' + L.scale);
  }
});
test('配置：操作の帯は中身の高さ（strip）だけ取り、残りはゲーム画面', () => {
  const big = touchLayout(390, 844), field = touchLayout(390, 844, undefined, { strip: 196 }), build = touchLayout(390, 844, undefined, { strip: 118 });
  assert.equal(field.controlsH, 196); assert.equal(build.controlsH, 118);
  assert.ok(build.height > field.height && field.height >= big.height);
  assert.ok(field.top + field.height <= 844 - 196 + 1);
  assert.ok(touchLayout(390, 500, undefined, { strip: 400 }).controlsH <= 200, '帯は画面の 4 割まで');
});
test('配置：横向きの電話は画面いっぱい（ノッチを避ける）', () => {
  const L = touchLayout(844, 390, { t: 0, r: 47, b: 21, l: 47 });
  assert.ok(!L.portrait && L.controlsH === 0);
  assert.ok(L.left >= 47 && L.left + L.width <= 844 - 47 + 1);
  assert.ok(L.top + L.height <= 390 - 21 + 1);
  assert.ok(L.W > L.H && L.W >= 400);
});
test('配置：タブレット・タイトル（操作なし）・small/large', () => {
  const t = touchLayout(1180, 820);
  assert.ok(t.tablet && t.W >= 480 && t.scale > 2);
  const p = touchLayout(820, 1180);
  assert.ok(p.portrait && p.controlsH > 0 && p.W >= 300);
  const title = touchLayout(390, 844, undefined, { controls: false });
  assert.equal(title.controlsH, 0); assert.ok(title.height > 800);
  const sm = touchLayout(390, 844, undefined, { pref: 'small' }), lg = touchLayout(390, 844, undefined, { pref: 'large' });
  assert.ok(sm.W > lg.W, 'small のほうが広く見える');
});

console.log(`\ntobinezumi-touch: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
