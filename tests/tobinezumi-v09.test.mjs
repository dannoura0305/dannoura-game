// トビネズミ Ver.0.9「すみずみまで」（みがき）：PC の画面を窓いっぱいに（整数倍のまま）・名札が重ならない並べ方・
// はじめの めあて（進み具合は設定に・セーブの版は変えない）・その場に浮かぶ文字の動き・効果音の名前・言葉の決まり。DOM なし。
import assert from 'node:assert/strict';
import { pcLayout, PC_MAX, touchLayout } from '../tobinezumi/client/touch-logic.js';
import { layoutLabels } from '../tobinezumi/client/label-layout.js';
import { newGoal, goalStep, goalEvent, GOAL_PICKS } from '../tobinezumi/client/goal.js';
import { popCurve } from '../tobinezumi/client/pops.js';
import { SFX_NAMES } from '../tobinezumi/client/sfx.js';
import { SAVE_VERSION } from '../tobinezumi/client/net.js';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const BAD_WORDS = ['だんのうら', '壇ノ浦', '壇の浦', 'ダンノウラ', '境界事象', 'わかば', '順位', 'ランキング'];

await test('PC：整数倍のまま、窓いっぱいに内部解像度を広げる（黒い余白なし）', () => {
  for (const [vw, vh] of [[1280, 800], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [1024, 768], [800, 600]]) {
    const L = pcLayout(vw, vh);
    assert.equal(L.scale, Math.floor(L.scale), `${vw}x${vh} 整数倍`);
    assert.ok(L.W >= 480 && L.H >= 270 && L.W <= PC_MAX.W && L.H <= PC_MAX.H, `${vw}x${vh} 範囲 ${L.W}x${L.H}`);
    assert.ok(L.W * L.scale <= vw && L.H * L.scale <= vh, `${vw}x${vh} はみ出さない`);
    // 余白は 1 内部ピクセル未満（PC_MAX で止めたときを除く）
    if (L.W < PC_MAX.W) assert.ok(vw - L.W * L.scale < L.scale, `${vw}x${vh} 横の余白`);
    if (L.H < PC_MAX.H) assert.ok(vh - L.H * L.scale < L.scale, `${vw}x${vh} 縦の余白`);
  }
  assert.deepEqual(pcLayout(1280, 800), { W: 640, H: 400, scale: 2 });
  assert.deepEqual(pcLayout(1920, 1080), { W: 480, H: 270, scale: 4 });
});
await test('PC：拡大率の指定（×1〜×4）と、とても小さい窓は縮小', () => {
  assert.equal(pcLayout(1280, 800, '1').scale, 1);
  assert.equal(pcLayout(1280, 800, '3').scale, 2, '入らない倍率は入る所まで');
  const L = pcLayout(400, 240);
  assert.ok(L.scale < 1 && L.W >= 480 && L.H >= 270 && L.W * L.scale <= 400.5 && L.H * L.scale <= 240.5);
  // タッチの配置は変わらない（前と同じ関数）
  const T = touchLayout(390, 844, { t: 0, r: 0, b: 0, l: 0 }, { controls: true, strip: 196 });
  assert.ok(T.portrait && T.W >= 160);
});

await test('名札：重なるものは上へずらし、ずらしきれないものは隠す（自分の名札は動かない）', () => {
  const me = { x: 100, y: 50, w: 30, h: 10, prio: 99 };
  const fam = Array.from({ length: 6 }, (_, i) => ({ x: 96 + i * 3, y: 52, w: 20, h: 6, prio: 0 }));
  const out = layoutLabels([me, ...fam], { maxLift: 2 });
  assert.equal(out[0].y, 50); assert.equal(out[0].hidden, false); assert.equal(out[0].lifted, 0);
  const shown = out.filter(o => !o.hidden);
  // 見えている名札どうしは重ならない
  const boxes = shown.map((o, k) => { const l = [me, ...fam][out.indexOf(o)]; return { l: o.x - l.w / 2, r: o.x + l.w / 2, t: o.y - l.h, b: o.y }; });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(!(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b), '重なり ' + i + '-' + j);
  }
  assert.ok(out.some(o => o.hidden), 'かたまっていれば隠れる子がいる');
  // 離れていれば そのまま
  const far = layoutLabels([{ x: 10, y: 10, w: 10, h: 6 }, { x: 60, y: 10, w: 10, h: 6 }]);
  assert.ok(far.every(o => !o.hidden && o.lifted === 0));
  // 同じ入力なら同じ結果（毎フレームちらつかない）
  assert.deepEqual(layoutLabels([me, ...fam]), layoutLabels([me, ...fam]));
});

await test('めあて：拾う 3 つ → 掘る → 入る → 食べる → 広げる → おしまい', () => {
  const st = newGoal('local|ぴょん', false);
  assert.equal(goalStep(st).id, 'gather');
  for (let i = 0; i < GOAL_PICKS - 1; i++) assert.ok(goalEvent(st, 'pick'));
  assert.equal(goalStep(st).id, 'gather'); assert.equal(goalStep(st).n, GOAL_PICKS - 1);
  goalEvent(st, 'pick');
  assert.equal(goalStep(st).id, 'dig');
  assert.equal(goalStep(st, { hasNest: true }).id, 'enter');
  goalEvent(st, 'enter'); assert.equal(goalStep(st, { hasNest: true }).id, 'eat');
  goalEvent(st, 'eat'); assert.equal(goalStep(st, { hasNest: true }).id, 'build');
  goalEvent(st, 'build'); assert.equal(goalStep(st, { hasNest: true }).id, 'done');
  st.done = true; assert.equal(goalStep(st, { hasNest: true }), null);
  assert.equal(goalEvent(st, 'pick'), false, 'おしまいの後は進めない');
});
await test('めあて：巣があって はじめた子（つづき・前の版）は出さない・× で消せる・言葉（PC とタッチ）', () => {
  assert.equal(goalStep(newGoal('a|b', true), { hasNest: true }), null);
  const st = newGoal('a|b', false);
  // 先に巣を掘っても、拾う数は求めない
  assert.equal(goalStep(st, { hasNest: true }).id, 'enter');
  st.off = true; assert.equal(goalStep(st), null);
  const s2 = newGoal('a|b', false);
  const pc = goalStep(s2), tc = goalStep(s2, { touch: true });
  assert.match(pc.text, /<kbd>E<\/kbd>/); assert.match(tc.text, /タップ/); assert.doesNotMatch(tc.text, /kbd/);
  // 設定に置ける（JSON にできる）
  assert.deepEqual(JSON.parse(JSON.stringify(s2)), s2);
});
await test('めあての言葉に 本編の名前・順位の言葉が無い', () => {
  const st = newGoal('x', false);
  const texts = [];
  for (const [ev, nest] of [[null, false], ['pick', false], ['pick', false], ['pick', false], [null, false], ['enter', true], ['eat', true], ['build', true]]) {
    if (ev) goalEvent(st, ev);
    for (const touch of [false, true]) { const g = goalStep(st, { hasNest: nest, touch }); if (g) texts.push(g.text); }
  }
  assert.ok(texts.length >= 10);
  for (const t of texts) for (const w of BAD_WORDS) assert.ok(!t.includes(w), t);
});

await test('浮かぶ文字：上がって、終わりぎわに消える', () => {
  const a = popCurve(0), m = popCurve(0.5), z = popCurve(1);
  assert.equal(a.rise, 0); assert.equal(a.alpha, 1);
  assert.ok(m.rise > 0 && m.rise < 14 && m.alpha === 1);
  assert.equal(z.alpha, 0); assert.ok(Math.abs(z.rise - 14) < 1e-9);
  for (let k = 0; k <= 1; k += 0.05) { const c = popCurve(k); assert.ok(c.alpha >= 0 && c.alpha <= 1 && c.rise >= 0); }
});

await test('効果音：ふだんの動作の音がそろっている（危険の音もそのまま）', () => {
  for (const n of ['pick', 'rare', 'eat', 'drink', 'dig', 'jump', 'land', 'open', 'place', 'remove', 'burrow', 'out', 'pet', 'birth', 'travel', 'alert', 'owl', 'fox', 'hiss', 'caught', 'safe', 'fest', 'plug'])
    assert.ok(SFX_NAMES.includes(n), n);
});

await test('セーブの版は 8 のまま（めあては設定 tobi_settings に置く）', () => {
  assert.equal(SAVE_VERSION, 8);
});

console.log(`tobinezumi-v09: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
