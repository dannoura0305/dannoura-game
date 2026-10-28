// 本編の仕上げ（第2弾）のテスト（node:vm・DOMなし）
//  1. はじめての 1〜2 日目の案内（main/ui.js の「==GUIDE-LOGIC:BEGIN==」〜「END」）
//  2. 配信モニターの顔のドット絵（main/ui.js の「==DAN-FACE:BEGIN==」〜「END」）
//  3. 振動：MG.buzz（minigames/core.js）が設定の「振動 オフ」に従う／アクション系ミニゲームが MG.buzz 経由で鳴らす
//  4. 軽量化：ゆびの見張り・タイトルのループが「見えていない間は回さない」作りになっている
//  5. 工場巡回の「！」予告がドット絵で描かれる
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

const UI = read('main/ui.js');
function region(src, name) {
  const a = src.indexOf(`// ==${name}:BEGIN==`), b = src.indexOf(`// ==${name}:END==`);
  assert.ok(a > 0 && b > a, `main/ui.js に ${name} の範囲の印がある`);
  const ctx = { console, Math, JSON, Object, Array, Number, String };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b), ctx, { filename: name });
  return ctx;
}

// ── 1. 案内 ──
const G = region(UI, 'GUIDE-LOGIC');
const base = { day: 1, mental: 70, fatigue: 10, flame: 0, childStress: 20, streamCount: 0, jobRep: 10, certKnow: 10 };
const pick = (o, f) => vm.runInContext(`guidePick(${JSON.stringify({ ...base, ...o })},${JSON.stringify(f || {})})`, G);

test('案内：1日目のはじめは「配信を始める」を勧める（今日の目標の文と同じ）', () => {
  assert.equal(pick({}), 'stream');
});
test('案内：配信したあとは 工場（残りあり）→ 勉強 → 配信 の順', () => {
  assert.equal(pick({ day: 2, streamCount: 1 }, { factoryLeft: 3 }), 'factorywork');
  assert.equal(pick({ day: 2, streamCount: 1 }, { factoryLeft: null }), 'factorywork');
  assert.equal(pick({ day: 2, streamCount: 1 }, { factoryLeft: 0 }), 'study');
  assert.equal(pick({ day: 2, streamCount: 1, jobRep: 40, certKnow: 40 }), 'stream');
});
test('案内：危ないときは休む・子どもを優先', () => {
  assert.equal(pick({ mental: 20 }), 'rest_deep');
  assert.equal(pick({ fatigue: 85 }), 'rest_deep');
  assert.equal(pick({ fatigue: 65 }), 'rest_light');
  assert.equal(pick({ childStress: 75 }), 'childcare');
  assert.equal(pick({ flame: 6 }), 'rest_light');
});
test('案内：3日目以降・壊れた値では何も勧めない', () => {
  assert.equal(pick({ day: 3 }), null);
  assert.equal(pick({ day: 30 }), null);
  assert.equal(pick({ day: 0 }), null);
  assert.equal(vm.runInContext('guidePick(null,{})', G), null);
});
test('案内を出す条件：はじめからの1〜2日目だけ・設定オフ／卒業済み／ロードでは出さない', () => {
  const show = (st, day) => vm.runInContext(`guideShouldShow(${JSON.stringify(st)},{day:${day}})`, G);
  assert.equal(show({ off: false, done: false, fresh: true }, 1), true);
  assert.equal(show({ off: false, done: false, fresh: true }, 2), true);
  assert.equal(show({ off: false, done: false, fresh: true }, 3), false);
  assert.equal(show({ off: true, done: false, fresh: true }, 1), false);   // 設定でオフ
  assert.equal(show({ off: false, done: true, fresh: true }, 1), false);   // 2回目以降の周回
  assert.equal(show({ off: false, done: false, fresh: false }, 1), false); // ロードした続き
});
test('前に遊んだ跡：セーブが1つでもある、またはエンディングを見たことがある', () => {
  const ex = (u, e) => vm.runInContext(`guideExperienced(${u},${e})`, G);
  assert.equal(ex(0, 0), false);
  assert.equal(ex(1, 0), true);
  assert.equal(ex(0, 2), true);
});
test('案内の判定は localStorage の設定側だけ（セーブデータ gs に書かない）', () => {
  const a = UI.indexOf('const GUIDE_KEY='), b = UI.indexOf('function guideSettingRow');
  const glue = UI.slice(a, b);
  assert.ok(a > 0 && b > a);
  assert.match(glue, /dannoura_guide_done/);
  assert.doesNotMatch(glue, /gs\.[a-zA-Z_]+\s*=(?!=)/, 'gs に代入しない');
  assert.doesNotMatch(glue, /saveGame\(/, 'セーブしない');
});

// ── 2. 顔のドット絵 ──
const F = region(UI, 'DAN-FACE');
const rows = (m, o) => JSON.parse(vm.runInContext(`JSON.stringify(danFaceRows(${JSON.stringify(m)},${o ? 1 : 0}))`, F));
const PAL = JSON.parse(vm.runInContext('JSON.stringify(DAN_FACE_PAL)', F));
const MOODS = JSON.parse(vm.runInContext('JSON.stringify(DAN_FACE_MOODS)', F));

test('顔：表情は今の配信モニターと同じ4つ（normal・happy・tired・fear）', () => {
  assert.deepEqual(MOODS, ['normal', 'happy', 'tired', 'fear']);
});
test('顔：どの表情・口の開閉も 32×32、使う色はパレットの中だけ', () => {
  for (const m of MOODS) for (const o of [0, 1]) {
    const r = rows(m, o);
    assert.equal(r.length, 32);
    for (const line of r) {
      assert.equal(line.length, 32);
      for (const ch of line) assert.ok(ch === '.' || PAL[ch], `${m}/${o} の色 ${ch} がパレットにある`);
    }
  }
});
test('顔：表情ごとに絵が違い、口を開けた絵は閉じた絵と違う（差分は顔の中だけ）', () => {
  const key = r => r.join('\n');
  const all = MOODS.map(m => key(rows(m, 0)));
  assert.equal(new Set(all).size, MOODS.length);
  for (const m of MOODS) {
    const a = rows(m, 0), b = rows(m, 1);
    assert.notEqual(key(a), key(b));
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++)
      if (a[y][x] !== b[y][x]) assert.ok(y >= 19 && y <= 24 && x >= 12 && x <= 19, `${m} の口の差分は口のあたりだけ (${x},${y})`);
  }
});
test('顔：いつもの見た目（紫の髪・ピンクのシルクハット・眼鏡・ラベンダーの上着）が全部の表情にある', () => {
  for (const m of MOODS) {
    const s = rows(m, 0).join('');
    for (const c of ['H', 'P', 'g', 'T', 'F']) assert.ok(s.includes(c), `${m} に ${c}`);
  }
  assert.equal(PAL.H, '#5a22a8');   // minigames/rpg.js の dan.hair と同じ色
  assert.equal(PAL.T, '#d6c2f0');   // dan.top
});
test('顔：知らない気分は normal の絵', () => {
  assert.deepEqual(rows('zzz', 0), rows('normal', 0));
});
test('配信モニターは気分の判定（monMood）をそのまま使い、顔だけドット絵に差し替える', () => {
  assert.match(UI, /function monMood\(\)\{[\s\S]*?gs\.mental<30\|\|gs\.fatigue>=75[\s\S]*?'tired'[\s\S]*?gs\.streamType==='kaidan'\|\|gs\.flame>=6[\s\S]*?'fear'[\s\S]*?MON\.hype>=70[\s\S]*?'happy'/);
  assert.match(UI, /function monSetMood[\s\S]*?monFaceSrc\(m,0\)/);
});

// ── 3. 振動 ──
function makeCore(store) {
  const mkEl = () => {
    const e = {
      dataset: {}, style: {}, innerHTML: '', textContent: '', className: '', children: [],
      classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
      setAttribute() {}, addEventListener() {}, insertAdjacentHTML() {}, remove() {},
      appendChild(c) { return c; }, insertBefore(c) { return c; },
      querySelector: () => mkEl(), querySelectorAll: () => [], getContext: () => null,
    };
    return e;
  };
  const doc = {
    head: mkEl(), body: mkEl(), hidden: false,
    getElementById: id => (['mg-loading', 'mg-avatar'].includes(id) ? null : mkEl()),
    createElement: () => mkEl(), querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  };
  const calls = [];
  const ctx = {
    document: doc, window: null, localStorage: store,
    navigator: { vibrate: p => { calls.push(p); return true; } },
    gs: { day: 1, mgDay: {} }, AU: { fadeBGM() {}, se() {} },
    setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => 0 },
    console, Math, JSON, Object, Array, Date, Number, String, Map, Set, Promise, Error, RegExp, isFinite, isNaN, parseInt, parseFloat,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('minigames/core.js'), ctx, { filename: 'core.js' });
  return { ctx, calls };
}
const mkStore = v => ({ getItem: k => (k === 'dannoura_vibrate' ? v : null), setItem() {} });

test('MG.buzz：初期値（未設定）とオンでは振動し、オフでは振動しない', () => {
  for (const [v, want] of [[null, 1], ['on', 1], ['off', 0]]) {
    const { ctx, calls } = makeCore(mkStore(v));
    vm.runInContext('MG.buzz(30);MG.buzz([20,40,20]);', ctx);
    assert.equal(calls.length, want * 2, `振動の設定 ${v}`);
  }
});
test('MG.buzz：振動に非対応・localStorage が使えない端末でも落ちない', () => {
  const { ctx } = makeCore({ getItem() { throw new Error('denied'); }, setItem() {} });
  ctx.navigator = {};
  assert.equal(vm.runInContext('MG.buzz(30)', ctx), false);
});
const ACTION = ['runner', 'defense', 'cooking', 'shooter', 'blocks', 'factory3d'];
test('アクション系ミニゲーム（ダッシュ・ディフェンス・夜食・撃退・組み立て・3D巡回）は MG.buzz 経由で振動する', () => {
  for (const f of ACTION) {
    const src = read(`minigames/${f}.js`);
    assert.match(src, /const buzz=p=>\{try\{if\(mg\.buzz\)mg\.buzz\(p\);\}catch\(_\)\{\}\};/, `${f} に MG.buzz を通す buzz がある`);
    const uses = (src.match(/\bbuzz\(/g) || []).length - 1;   // 定義の中の mg.buzz( を除く
    assert.ok(uses >= 3, `${f} の大事な場面で振動する（${uses} か所）`);
    assert.doesNotMatch(src, /navigator\.vibrate/, `${f} は設定を通らない振動を使わない`);
  }
});

// ── 4. 軽量化 ──
test('ゆびの見張り：止まっている間は rAF を回さず、合図（DOM の変化・入力・タブ復帰）で起きる', () => {
  const nav = UI.slice(UI.indexOf('const NAV_FULL_MS'), UI.indexOf('/* ══════════════════════════════════════════\n   4. HUD'));
  assert.match(nav, /schedule\(\)\{[\s\S]*?document\.hidden[\s\S]*?this\.hot>0[\s\S]*?setTimeout/);
  assert.match(nav, /wake\(\)\{/);
  assert.match(nav, /visibilitychange/);
  assert.match(nav, /MutationObserver/);
  assert.doesNotMatch(nav, /tick\(\)\{\s*try\{this\._tick\(\);\}catch\(e\)\{console\.error\('\[ui\] tick',e\);\}\s*raf\(\(\)=>this\.tick\(\)\);/, '毎フレーム無条件の rAF ではない');
});
test('タイトルのループ：見えていない間・タブが裏の間は次の rAF を頼まない（見えたら kickTitle で再開）', () => {
  const P = read('main/presentation.js');
  const m = P.match(/function loopTitle\(\)\{([\s\S]*?)\n\}/);
  assert.ok(m);
  const body = m[1];
  const stop = body.indexOf('if(!titleVisible() || document.hidden || !T.S) return;');
  const req = body.indexOf('requestAnimationFrame(loopTitle)');
  assert.ok(stop >= 0 && req > stop, '止める判定が rAF の予約より先');
  assert.match(P, /function kickTitle\(\)\{[\s\S]*?requestAnimationFrame\(loopTitle\)/);
  assert.match(P, /new MutationObserver\(kickTitle\)/);
});

// ── 5. 工場巡回の「！」 ──
test('工場巡回：「！」予告はドット絵（drawBang）で描き、文字の「！」は使わない', () => {
  const R = read('minigames/roguelike.js');
  const m = R.match(/function drawIntents\(t\)\{([\s\S]*?)\n    \}/);
  assert.ok(m);
  assert.match(m[1], /drawBang\(/);
  assert.doesNotMatch(m[1], /fillText\('！'/);
  // drawBang：1ドットは最低2px（スマホの小さなマスでも見える）
  assert.match(R, /function drawBang\(cx,cy,s,pulse\)\{\s*const u=Math\.max\(2,/);
});

for (const [name, fn] of queue) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name); console.log(e); }
}
console.log(`main-polish2: ${pass} ok${fail ? `, ${fail} failed` : ''}`);
process.exit(fail ? 1 : 0);
