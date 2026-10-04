// 模様替えの「最初の状態に戻す」（placement.js の draft.reset ／ editor.js の ED.reset）のテスト
// 個数の不変条件：所持数は変わらない（増えない・消えない）、置いた数 ≤ 所持数、instanceId の重複なし、取り消しで完全に戻る
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['main/home/catalog.js', 'main/home/state.js', 'main/home/placement.js', 'main/home/crafting.js', 'main/home/editor.js'];

function makeSandbox() {
  const calls = { save: 0, emit: [] };
  const ctx = {
    console, JSON, Math, Object, Array, Set, Map, String, Number,
    gs: { day: 3, hour: 22, min: 0, mental: 50, fatigue: 10, money: 50000 },
    advTime() {}, saveGame() { calls.save++; return true; },
  };
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  const H = ctx.HOME;
  H.ensure();
  return { ctx, H, calls };
}
// 画面（interactions.js が作る S）の代わり
function makeScreen(H, area) {
  const toasts = [];
  const S = { area, mode: 'live', ui: { toast: t => toasts.push(t), choice: async () => 0 }, refresh() {}, sfx() {} };
  H.editor.start(S); S.area = area;
  return { S, toasts };
}
const sig = L => JSON.stringify(L.map(P => [P.itemId, P.x, P.y, P.rotation, P.variant].join(',')).sort());
const ownedAll = H => { const o = {}; Object.keys(H.CATALOG).forEach(id => { o[id] = H.owned(id); }); return o; };
function invariants(H, D) {
  const all = D.placements('room').concat(D.placements('garden'));
  const ids = all.map(P => P.instanceId);
  assert.equal(new Set(ids).size, ids.length, 'instanceId が重複していない');
  for (const id of Object.keys(H.CATALOG)) {
    const placed = all.filter(P => P.itemId === id).length;
    assert.ok(placed <= H.owned(id), `${id}: 置いた ${placed} > 所持 ${H.owned(id)}`);
  }
  for (const area of ['room', 'garden']) {
    const r = H.reachable(area, D.placements(area));
    assert.ok(r.ok, `${area}: ${r.reason}`);
  }
}

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log('home-reset');

await test('すべて収納：今の場所だけ空になり、もう一方の場所と所持数は変わらない', () => {
  const { H } = makeSandbox();
  const own0 = ownedAll(H);
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  const garden0 = JSON.stringify(D.placements('garden'));
  assert.equal(D.placements('room').length, 8);
  assert.equal(H.editor.reset(S, 'store'), true);
  assert.equal(D.placements('room').length, 0);
  assert.equal(JSON.stringify(D.placements('garden')), garden0);
  assert.equal(D.stored('furniture.futon'), 1);
  assert.equal(D.stored('furniture.wood_chair'), 2);
  assert.deepEqual(ownedAll(H), own0);
  invariants(H, D);
});

await test('最初の配置に戻す：動かした・足した・外したものを、持っているもので最初の並びへ', () => {
  const { H } = makeSandbox();
  const own0 = ownedAll(H);
  const init = sig(H.ensure().room.placements);
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  // いじる：クマを収納、椅子を動かす、クッションを2つ置く
  const bear = D.placements('room').find(P => P.itemId === 'memento.bear');
  assert.ok(D.store(bear.instanceId).ok);
  const chair = D.placements('room').find(P => P.itemId === 'furniture.wood_chair');
  assert.ok(D.move(chair.instanceId, { x: 2, y: 6 }).ok);
  assert.ok(D.place('room', { itemId: 'furniture.cushion', x: 8, y: 5, rotation: 0 }).ok);
  assert.ok(D.place('room', { itemId: 'furniture.cushion', x: 9, y: 5, rotation: 0 }).ok);
  assert.notEqual(sig(D.placements('room')), init);
  assert.equal(H.editor.reset(S, 'default'), true);
  assert.equal(sig(D.placements('room')), init, '最初の並びと同じ');
  assert.equal(D.stored('furniture.cushion'), 2, 'クッションは収納へ戻った（消えていない）');
  assert.equal(D.stored('furniture.wood_chair'), 1);
  assert.deepEqual(ownedAll(H), own0);
  invariants(H, D);
});

await test('持っていないもの・別の場所で使っているぶんは置かない（増やさない）', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  // 布団を手放した（所持0）・本棚は所持しているが…という状態を作る
  hd.room.placements = hd.room.placements.filter(P => P.itemId !== 'furniture.futon');
  delete hd.inventory['furniture.futon'];
  // 庭の飛び石：初期は4個配置＋2個収納。庭で6個とも置いている状態にしてから、部屋をリセットしても庭の数は変わらない
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  assert.ok(D.place('garden', { itemId: 'garden.stepping_stone', x: 2, y: 2, rotation: 0 }).ok);
  assert.ok(D.place('garden', { itemId: 'garden.stepping_stone', x: 3, y: 2, rotation: 0 }).ok);
  assert.equal(D.stored('garden.stepping_stone'), 0);
  const chair = D.placements('room').find(P => P.itemId === 'furniture.wood_chair');
  assert.ok(D.move(chair.instanceId, { x: 2, y: 6 }).ok);
  assert.equal(H.editor.reset(S, 'default'), true);
  assert.equal(D.placements('room').filter(P => P.itemId === 'furniture.futon').length, 0, '持っていない布団は置かない');
  assert.equal(D.placements('room').length, 7);
  assert.equal(H.owned('furniture.futon'), 0);
  // 庭も最初の配置へ：飛び石は4個だけ置き、残りは収納
  S.area = 'garden';
  assert.equal(H.editor.reset(S, 'default'), true);
  assert.equal(D.placements('garden').filter(P => P.itemId === 'garden.stepping_stone').length, 4);
  assert.equal(D.stored('garden.stepping_stone'), 2);
  invariants(H, D);
});

await test('足りないとき：所持より多くは置かない（最初の配置が6本でも所持4本なら4本）', () => {
  const { H } = makeSandbox();
  const { S } = makeScreen(H, 'garden');
  const D = S.ed.draft;
  // 柵（初期配置は6本）の所持を4本に減らした状態で、最初の配置に戻す
  const hd = H.ensure();
  hd.inventory['garden.fence'] = { default: 4 };
  const fences = D.placements('garden').filter(P => P.itemId === 'garden.fence');
  fences.forEach(P => D.store(P.instanceId));   // 全部外してから戻すと、所持の4本だけが並ぶ
  assert.equal(H.editor.reset(S, 'default'), true);
  assert.equal(D.placements('garden').filter(P => P.itemId === 'garden.fence').length, 4, '所持の4本だけ');
  assert.equal(D.stored('garden.fence'), 0);
  invariants(H, D);
});

await test('取り消し1回で完全に元へ（instanceId も同じ）、やり直しで再び最初の状態', () => {
  const { H } = makeSandbox();
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  const chair = D.placements('room').find(P => P.itemId === 'furniture.wood_chair');
  D.move(chair.instanceId, { x: 2, y: 6 });
  D.place('room', { itemId: 'furniture.cushion', x: 8, y: 5, rotation: 0 });
  const before = JSON.stringify(D.state);
  H.editor.reset(S, 'store');
  assert.equal(D.placements('room').length, 0);
  H.editor.undo(S);
  assert.equal(JSON.stringify(D.state), before);
  H.editor.redo(S);
  assert.equal(D.placements('room').length, 0);
  H.editor.undo(S);
  H.editor.reset(S, 'default');
  H.editor.undo(S);
  assert.equal(JSON.stringify(D.state), before);
});

await test('既に最初の状態なら何もしない（履歴も増えない）。空の場所の「すべて収納」も同じ', () => {
  const { H } = makeSandbox();
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  assert.equal(H.editor.reset(S, 'default'), false);
  assert.match(S.ed.msg, /もう最初の状態/);
  assert.equal(D.canUndo(), false);
  assert.equal(D.dirty(), false);
  H.editor.reset(S, 'store');
  assert.equal(H.editor.reset(S, 'store'), false);
  assert.match(S.ed.msg, /ありません/);
});

await test('確定すると保存され、所持数（inventory）は1つも変わらない。破棄すれば何も変わらない', () => {
  const { H, calls } = makeSandbox();
  const hd = H.ensure();
  const inv0 = JSON.stringify(hd.inventory);
  const garden0 = JSON.stringify(hd.garden.placements);
  let { S } = makeScreen(H, 'room');
  H.editor.reset(S, 'store');
  H.editor.discard(S);
  assert.equal(hd.room.placements.length, 8, '破棄：保存データは元のまま');
  ({ S } = makeScreen(H, 'room'));
  H.editor.reset(S, 'store');
  assert.equal(H.editor.commit(S), true);
  assert.equal(calls.save, 1);
  assert.equal(hd.room.placements.length, 0);
  assert.equal(JSON.stringify(hd.inventory), inv0);
  assert.equal(JSON.stringify(hd.garden.placements), garden0);
  assert.equal(H.stored('furniture.futon'), 1);
  ({ S } = makeScreen(H, 'room'));
  H.editor.reset(S, 'default');
  H.editor.commit(S);
  assert.equal(hd.room.placements.length, 8);
  assert.equal(JSON.stringify(hd.inventory), inv0);
});

await test('確認ダイアログ：「やめる」なら何もしない', async () => {
  const { H } = makeSandbox();
  const { S } = makeScreen(H, 'room');
  S.ui.choice = async () => 2;
  assert.equal(await H.editor.askReset(S), false);
  assert.equal(S.ed.draft.dirty(), false);
  S.ui.choice = async () => 1;
  assert.equal(await H.editor.askReset(S), true);
  assert.equal(S.ed.draft.placements('room').length, 0);
});

await test('ランダム操作 300 回の途中で何度もリセットしても、個数の不変条件が保たれる', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  hd.inventory['deco.sea_glass'] = { default: 2 };
  hd.inventory['garden.pot'] = { pink: 2 };
  const own0 = ownedAll(H);
  const { S } = makeScreen(H, 'room');
  const D = S.ed.draft;
  let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const ids = Object.keys(H.CATALOG).filter(id => H.CATALOG[id].kind !== 'seed');
  for (let k = 0; k < 300; k++) {
    const area = rnd(2) ? 'room' : 'garden';
    const A = H.AREAS[area];
    const op = rnd(10);
    if (op < 4) {
      const id = ids[rnd(ids.length)];
      const v = (H.CATALOG[id].variants || ['default'])[0];
      D.place(area, { itemId: id, variant: v, x: rnd(A.w), y: rnd(A.h), rotation: H.CATALOG[id].rots[rnd(H.CATALOG[id].rots.length)] });
    } else if (op < 6) {
      const L = D.placements(area); if (L.length) D.store(L[rnd(L.length)].instanceId);
    } else if (op < 8) {
      const L = D.placements(area); if (L.length) D.move(L[rnd(L.length)].instanceId, { x: rnd(A.w), y: rnd(A.h) });
    } else if (op < 9) {
      S.area = area; H.editor.reset(S, rnd(2) ? 'default' : 'store');
    } else if (D.canUndo()) D.undo();
    invariants(H, D);
  }
  assert.deepEqual(ownedAll(H), own0);
});

console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
