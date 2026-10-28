// トビネズミ Ver.0.9「すみずみまで」（みがき）：PC の画面を窓いっぱいに（整数倍のまま）・名札が重ならない並べ方・
// はじめの めあて（進み具合は設定に・セーブの版は変えない）・その場に浮かぶ文字の動き・効果音の名前・言葉の決まり。DOM なし。
import assert from 'node:assert/strict';
import { pcLayout, PC_MAX, touchLayout, placeToasts, holdToast, boxesOverlap } from '../tobinezumi/client/touch-logic.js';
import { cellPath, planDigs, digStrokeNote } from '../tobinezumi/client/nest-layout.js';
import { createNest, tryOp, cellAt, C } from '../tobinezumi/shared/nest-rules.js';
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

// ── Ver.0.9 の残り：トーストとパネル・全体モードの掘る知らせ ──
await test('トースト：開いているパネルに重ねない（上 → 下 → 入らなければ閉じるまで待つ）', () => {
  const area = { top: 2, bottom: 724 };
  const t = { left: 120, right: 270, top: 70, bottom: 120 };   // 2 つ出ている
  // パネルが無い・重ならない → そのまま
  assert.deepEqual(placeToasts(t, null, area), { top: 70, moved: false, hold: false });
  assert.equal(placeToasts(t, { left: 0, right: 100, top: 0, bottom: 700 }, area).moved, false);
  // パネルの上に入る（スマホ縦：メニューの上の帯）
  const up = placeToasts(t, { left: 8, right: 382, top: 100, bottom: 600 }, area);
  assert.equal(up.moved, true); assert.equal(up.hold, false);
  assert.ok(up.top + 50 <= 100 && up.top >= 2);
  // 上が足りなければ下
  const dn = placeToasts(t, { left: 8, right: 382, top: 30, bottom: 500 }, area);
  assert.equal(dn.moved, true); assert.ok(dn.top >= 500);
  assert.ok(!boxesOverlap({ ...t, top: dn.top, bottom: dn.top + 50 }, { left: 8, right: 382, top: 30, bottom: 500 }));
  // スマホ横：パネルが画面いっぱい → 待つ
  const full = placeToasts({ left: 330, right: 510, top: 90, bottom: 140 }, { left: 160, right: 684, top: 4, bottom: 386 }, { top: 2, bottom: 388 });
  assert.equal(full.hold, true); assert.equal(full.moved, false);
});
await test('待たせたトースト：同じ文は 1 つ・新しい方から 3 つまで', () => {
  let l = [];
  for (const x of ['a', 'b', 'a', 'c', 'd']) l = holdToast(l, x);
  assert.deepEqual(l.map(t => t.text), ['a', 'c', 'd']);
  l = holdToast(l, 'e', 'bad');
  assert.deepEqual(l.at(-1), { text: 'e', kind: 'bad' });
  assert.equal(l.length, 3);
});
await test('全体モードの掘る：なぞった道のりは縦横でつながり、マスを飛ばさない', () => {
  for (const [x0, y0, x1, y1] of [[0, 0, 5, 0], [3, 3, 3, -2], [0, 0, 4, 3], [5, 1, -2, 4], [2, 2, 2, 2]]) {
    const p = cellPath(x0, y0, x1, y1);
    assert.equal(p.length, Math.abs(x1 - x0) + Math.abs(y1 - y0));
    let a = { x: x0, y: y0 };
    for (const c of p) { assert.equal(Math.abs(c.x - a.x) + Math.abs(c.y - a.y), 1); a = c; }
    if (p.length) assert.deepEqual(p.at(-1), { x: x1, y: y1 });
  }
});
await test('全体モードの掘る：返事を待たずに手元の予想で続けて掘れる（速くなぞっても止まらない）', () => {
  const d = createNest({ seed: 5, entranceX: 10 });
  // 掘ってある所の端を探す
  let s = null;
  for (let y = d.surfaceY + 1; y < d.h && !s; y++) for (let x = 1; x < d.w - 8 && !s; x++)
    if (cellAt(d, x, y) === C.OPEN && [1, 2, 3, 4, 5, 6].every(k => cellAt(d, x + k, y) === C.SOIL)) s = { x, y };
  assert.ok(s, '掘り始められる所');
  // 前の掘りの返事がまだでも、6 マス先まで 1 回で計画できる
  const plan = planDigs(d, cellPath(s.x, s.y, s.x + 6, s.y));
  assert.equal(plan.ops.length, 6); assert.equal(plan.reason, null);
  assert.deepEqual(plan.at, { x: s.x + 6, y: s.y });
  // 計画どおりに順に送れば、どれも通る（サーバーと同じ決まり）
  let cur = d;
  for (const op of plan.ops) { const r = tryOp(cur, op, null); assert.ok(r.ok, JSON.stringify(op)); cur = r.data; }
  // 送りすぎない
  assert.equal(planDigs(d, cellPath(s.x, s.y, s.x + 6, s.y), 2).ops.length, 2);
  // つながっていない所は止まって理由
  let lone = null;
  for (let y = d.surfaceY + 2; y < d.h - 1 && !lone; y++) for (let x = 1; x < d.w - 1 && !lone; x++)
    if (cellAt(d, x, y) === C.SOIL && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => cellAt(d, x + a, y + b) !== C.OPEN)) lone = { x, y };
  const far = planDigs(d, [lone]);
  assert.equal(far.ops.length, 0); assert.ok(far.reason);
});
await test('全体モードの掘る：知らせは なぞり 1 回に 1 つ（掘れた＝その場に小さく・掘れない＝理由）', () => {
  assert.deepEqual(digStrokeNote({ n: 1 }), { pop: '掘った', toast: null });
  assert.deepEqual(digStrokeNote({ n: 6 }), { pop: '6 マス掘った', toast: null });
  const part = digStrokeNote({ n: 3, fail: '巣が更新された。もう一度' });
  assert.equal(part.pop, '3 マス掘った'); assert.equal(part.toast.kind, 'bad'); assert.match(part.toast.text, /とちゅうで止まった/);
  assert.deepEqual(digStrokeNote({ n: 0, reason: '巣とつながっていない' }), { pop: null, toast: { text: '巣とつながっていない', kind: 'bad' } });
  assert.equal(digStrokeNote({ n: 0, already: true }).toast.text, 'もう掘ってある');
  assert.deepEqual(digStrokeNote({}), { pop: null, toast: null });
  for (const o of [{ n: 1 }, { n: 9 }, { n: 0, reason: 'x' }]) { const v = digStrokeNote(o); for (const w of BAD_WORDS) assert.ok(!JSON.stringify(v).includes(w)); }
});

await test('セーブの版は 8 のまま（めあては設定 tobi_settings に置く）', () => {
  assert.equal(SAVE_VERSION, 8);
});

console.log(`tobinezumi-v09: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
