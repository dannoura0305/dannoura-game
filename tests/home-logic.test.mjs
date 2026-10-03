// 家・庭づくりのロジックテスト（catalog/state/placement/crafting を node:vm で読み込む）
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['main/home/catalog.js', 'main/home/state.js', 'main/home/placement.js', 'main/home/crafting.js'];

function makeSandbox(gsInit) {
  const calls = { advTime: [], save: 0 };
  const ctx = {
    console,
    gs: Object.assign({ day: 1, hour: 22, min: 0, mental: 50, fatigue: 10 }, gsInit || {}),
    advTime(m) { calls.advTime.push(m); },
    saveGame() { calls.save++; return true; },
  };
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { ctx, H: ctx.HOME, calls };
}

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const cand = (itemId, x, y, rotation = 0, variant = 'default') => ({ itemId, x, y, rotation, variant });
const P = (id, itemId, x, y, rotation = 0, variant = 'default') => ({ instanceId: id, itemId, x, y, rotation, variant });
// 所持＝配置＋収納 が全アイテムで成り立つか
function checkCounts(H, draft) {
  for (const id of Object.keys(H.CATALOG)) {
    const owned = H.owned(id);
    const placed = draft ? draft.placed(id) : H.placedCount(id);
    const stored = draft ? draft.stored(id, (H.CATALOG[id].variants || ['default'])[0]) : H.stored(id);
    assert.ok(placed <= owned, `${id}: placed ${placed} > owned ${owned}`);
    if (!H.CATALOG[id].variants) assert.equal(placed + stored, owned, `${id}: placed+stored != owned`);
  }
}

console.log('home-logic');

test('新規：初期の所持・配置・素材・レシピ', () => {
  const { H, ctx } = makeSandbox();
  const hd = H.ensure();
  assert.equal(hd.version, 2);
  assert.equal(hd.room.placements.length, 8);
  assert.equal(hd.garden.placements.length, 11);
  assert.equal(H.stored('furniture.wood_chair'), 1);
  assert.equal(H.owned('furniture.wood_chair'), 2);
  assert.equal(H.stored('furniture.cushion'), 2);
  assert.equal(H.stored('garden.bench'), 1);
  assert.equal(H.stored('garden.stepping_stone'), 2);
  assert.equal(H.owned('garden.fence'), 6);
  assert.deepEqual({ ...hd.materials }, { wood: 4, cloth: 2, metal: 2, sea: 0 });
  assert.deepEqual([...hd.unlockedRecipes].sort(), ['clothesline', 'cushion', 'fence', 'flowerbed', 'kid_desk', 'planter', 'repaired_shelf', 'sea_glass', 'string_lights']);
  assert.equal(H.stored('furniture.toy_box'), 1);
  assert.equal(H.stored('garden.watering_can'), 1);
  assert.equal(hd.flags.v2Items, true);
  assert.ok(H.reachable('room', hd.room.placements).ok, H.reachable('room', hd.room.placements).reason);
  assert.ok(H.reachable('garden', hd.garden.placements).ok);
  // 2回目の ensure で変わらない
  const before = JSON.stringify(hd);
  H.ensure();
  assert.equal(JSON.stringify(ctx.gs.homeData), before);
  checkCounts(H);
});

test('レイヤーごとの重なり', () => {
  const { H } = makeSandbox();
  const rug = [P('a', 'deco.rug', 2, 2)];
  assert.ok(H.canPlace('room', rug, cand('furniture.low_table', 2, 2)).ok, 'ラグの上に家具は置ける');
  const r1 = H.canPlace('room', rug, cand('deco.rug', 3, 3));
  assert.ok(!r1.ok && /ラグ/.test(r1.reason), 'ラグ同士は重ならない');
  assert.ok(r1.bad.length > 0);
  const fur = [P('b', 'furniture.low_table', 2, 2)];
  const r2 = H.canPlace('room', fur, cand('furniture.cushion', 3, 3));
  assert.ok(!r2.ok && /重なって/.test(r2.reason), '家具同士（非solidでも）は重ならない');
  const stones = [P('c', 'garden.stepping_stone', 3, 3)];
  assert.ok(!H.canPlace('garden', stones, cand('garden.stepping_stone', 3, 3)).ok, '飛び石同士は重ならない');
  assert.ok(H.canPlace('garden', stones, cand('garden.pot', 3, 3, 0, 'red')).ok, '飛び石の上に家具は置ける');
  const wall = [P('d', 'memento.child_drawing', 4, 0), P('e', 'furniture.bookshelf', 1, 0)];
  assert.ok(!H.canPlace('room', wall, cand('memento.child_drawing', 4, 0)).ok, '壁の飾り同士は重ならない');
  assert.ok(H.canPlace('room', wall, cand('memento.child_drawing', 1, 0)).ok, '壁の飾りは床の家具と重なってよい');
});

test('回転：縦横の入れ替え', () => {
  const { H } = makeSandbox();
  assert.deepEqual({ ...H.footprint('furniture.futon', 0) }, { w: 2, h: 3 });
  assert.deepEqual({ ...H.footprint('furniture.futon', 90) }, { w: 3, h: 2 });
  assert.deepEqual({ ...H.footprint('furniture.bookshelf', 270) }, { w: 1, h: 2 });
  assert.deepEqual({ ...H.footprint('deco.rug', 90) }, { w: 2, h: 3 });
  const r = H.canPlace('room', [], cand('furniture.bookshelf', 11, 3, 0));
  assert.ok(!r.ok && /はみ出/.test(r.reason));
  assert.ok(H.canPlace('room', [], cand('furniture.bookshelf', 11, 3, 90)).ok);
  assert.ok(!H.canPlace('room', [], cand('furniture.futon', 0, 0, 180)).ok, '許可されない向き');
  assert.ok(!H.canPlace('room', [], cand('furniture.futon', 10, 5, 90)).ok, '回転後にはみ出す');
  // 下書きの回転：回すとはみ出すなら理由つきで失敗、所持数は変わらない
  const d = H.createDraft({ room: [P('f', 'furniture.futon', 10, 0)], garden: [] }, { owned: () => 1 });
  const rr = d.rotate('f');
  assert.ok(!rr.ok && /回せません/.test(rr.reason));
  assert.equal(d.canUndo(), false);
  const d2 = H.createDraft({ room: [P('f', 'furniture.futon', 0, 0)], garden: [] }, { owned: () => 1 });
  assert.ok(d2.rotate('f').ok);
  assert.equal(d2.find('f').P.rotation, 90);
});

test('出入口と到達', () => {
  const { H } = makeSandbox();
  const r = H.canPlace('room', [], cand('furniture.wood_chair', 6, 7));
  assert.ok(!r.ok && /出入口/.test(r.reason));
  assert.ok(!H.canPlace('room', [], cand('furniture.cushion', 6, 7)).ok, '非solidの家具も出入口には置けない');
  assert.ok(H.canPlace('room', [], cand('deco.rug', 5, 6)).ok, 'ラグは出入口に敷ける');
  // 部屋の隅に行き止まりを作る
  const room = [P('a', 'furniture.wood_chair', 1, 0)];
  const r2 = H.canPlace('room', room, cand('furniture.wood_chair', 0, 1));
  assert.ok(!r2.ok && /行き止まり/.test(r2.reason), r2.reason);
  // 庭：戸口(7,0) を囲む
  const g = [P('a', 'garden.fence', 6, 0), P('b', 'garden.fence', 8, 0)];
  const r3 = H.canPlace('garden', g, cand('garden.fence', 7, 1));
  assert.ok(!r3.ok && /門まで通れ/.test(r3.reason), r3.reason);
  assert.ok(!H.canPlace('garden', [], cand('garden.fence', 0, 6)).ok, '門はふさげない');
  // 庭の中の囲い（行き止まり）は許す
  const pen = [P('a', 'garden.fence', 14, 10), P('b', 'garden.fence', 15, 10)];
  assert.ok(H.canPlace('garden', pen, cand('garden.fence', 14, 11)).ok);
});

test('壁専用・置ける場所', () => {
  const { H } = makeSandbox();
  const r = H.canPlace('room', [], cand('memento.child_drawing', 2, 3));
  assert.ok(!r.ok && /壁/.test(r.reason));
  assert.ok(H.canPlace('room', [], cand('memento.child_drawing', 2, 0)).ok);
  assert.ok(!H.canPlace('garden', [], cand('memento.child_drawing', 2, 0)).ok);
  const b = H.canPlace('room', [], cand('garden.bench', 2, 2));
  assert.ok(!b.ok && /庭だけ/.test(b.reason), b.reason);
  assert.ok(!H.canPlace('room', [], cand('nope.item', 2, 2)).ok);
});

test('使う位置（正面・横・ふさがり）', () => {
  const { H } = makeSandbox();
  const chair = P('c', 'furniture.wood_chair', 3, 3, 0);
  assert.deepEqual({ ...H.useCell('room', [chair], chair) }, { x: 3, y: 4 });
  const ch90 = P('c', 'furniture.wood_chair', 3, 3, 90);
  assert.deepEqual({ ...H.useCell('room', [ch90], ch90) }, { x: 2, y: 3 });
  assert.ok(H.canUse('room', [chair], chair).ok);
  const blocked = [chair, P('t', 'light.desk_lamp', 3, 4)];
  const u = H.canUse('room', blocked, chair);
  assert.ok(!u.ok && /正面/.test(u.reason), u.reason);
  const futon = P('f', 'furniture.futon', 0, 0, 0);
  assert.deepEqual({ ...H.useCell('room', [futon], futon) }, { x: 2, y: 0 });
  assert.ok(!H.canUse('room', [], P('r', 'deco.rug', 0, 0)).ok);
  const wallFacing = P('c', 'furniture.wood_chair', 0, 0, 180);
  assert.ok(!H.canUse('room', [wallFacing], wallFacing).ok, '壁向きの椅子は座れない');
});

test('収納数の上限（下書き）', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  const d = H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, { owned: (i, v) => H.owned(i, v), seq: hd.seq });
  assert.equal(d.stored('garden.bench', 'default'), 1);
  assert.ok(d.place('garden', cand('garden.bench', 2, 9)).ok);
  assert.equal(d.stored('garden.bench', 'default'), 0);
  const r = d.place('garden', cand('garden.bench', 2, 10));
  assert.ok(!r.ok && /残っていません/.test(r.reason), r.reason);
  assert.equal(d.placed('garden.bench'), 1);
});

test('取り消し/やり直しで数が増減しない', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  const owned = (i, v) => H.owned(i, v);
  const d = H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, { owned, seq: hd.seq });
  const orig = JSON.stringify(d.state);
  const inv = () => { for (const id of Object.keys(H.CATALOG)) { const o = H.owned(id); assert.ok(d.placed(id) <= o, id); assert.equal(d.placed(id) + d.stored(id, 'default'), o, id); } };
  assert.ok(d.place('room', cand('furniture.cushion', 8, 5)).ok); inv();
  assert.ok(d.place('room', cand('furniture.cushion', 9, 5)).ok); inv();
  assert.ok(!d.place('room', cand('furniture.cushion', 10, 5)).ok); inv();
  const chair = hd.room.placements.find(p => p.itemId === 'furniture.wood_chair').instanceId;
  assert.ok(d.store(chair).ok); inv();
  assert.ok(d.place('room', cand('furniture.wood_chair', 8, 2)).ok); inv();
  assert.ok(d.place('room', cand('furniture.wood_chair', 9, 3)).ok); inv();
  assert.ok(!d.place('room', cand('furniture.wood_chair', 9, 4)).ok); inv();
  const bear = hd.room.placements.find(p => p.itemId === 'memento.bear').instanceId;
  assert.ok(d.move(bear, { x: 10, y: 6 }).ok); inv();
  assert.ok(d.dirty());
  let n = 0; while (d.undo()) { n++; inv(); }
  assert.equal(n, 6);
  assert.equal(JSON.stringify(d.state), orig);
  assert.ok(!d.dirty());
  while (d.redo()) inv();
  assert.equal(d.placed('furniture.cushion'), 2);
  assert.equal(d.placed('furniture.wood_chair'), 2);
  // 途中で新しい操作をするとやり直しは消える
  d.undo(); d.undo();
  assert.ok(d.canRedo());
  assert.ok(d.store(bear).ok); inv();
  assert.ok(!d.canRedo());
  // ランダム操作でも不変条件を保つ
  let seed = 7; const rnd = k => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % k; };
  const ids = Object.keys(H.CATALOG);
  for (let i = 0; i < 400; i++) {
    const op = rnd(5); const area = rnd(2) ? 'room' : 'garden';
    if (op === 0) { const id = ids[rnd(ids.length)]; d.place(area, cand(id, rnd(16), rnd(12), H.CATALOG[id].rots[rnd(H.CATALOG[id].rots.length)], H.CATALOG[id].variants ? H.CATALOG[id].variants[0] : 'default')); }
    else if (op === 1) { const L = d.placements(area); if (L.length) d.store(L[rnd(L.length)].instanceId); }
    else if (op === 2) { const L = d.placements(area); if (L.length) d.move(L[rnd(L.length)].instanceId, { x: rnd(16), y: rnd(12) }); }
    else if (op === 3) d.undo(); else d.redo();
    for (const a of ['room', 'garden']) {
      const L = d.placements(a);
      assert.equal(new Set(L.map(p => p.instanceId)).size, L.length, 'instanceId 重複');
      assert.ok(H.reachable(a, L).ok, a + ' unreachable');
    }
    inv();
  }
});

test('セーブ移行：homeData 無し → 初期化', () => {
  const { H, ctx } = makeSandbox({ day: 12 });
  assert.equal(ctx.gs.homeData, undefined);
  const hd = H.ensure();
  assert.ok(hd && ctx.gs.homeData === hd);
  assert.equal(hd.room.placements.length, 8);
});

test('セーブ移行：壊れた配置を収納へ戻す（増やさない）', () => {
  const { H, ctx } = makeSandbox();
  const hd = H.ensure();
  const good = JSON.parse(JSON.stringify(hd));
  good.room.placements = [
    P('p1', 'furniture.futon', 0, 1),
    P('p2', 'furniture.futon', 0, 2),             // 重なり＋所持数超過
    P('p3', 'furniture.desk_small', 11, 0),       // はみ出し
    P('p4', 'unknown.item', 3, 3),                // 不明ID
    P('p5', 'furniture.wood_chair', 6, 7),        // 出入口
    P('p6', 'memento.child_drawing', 3, 3),       // 壁専用（未所持でもある）
    { instanceId: 'p7', itemId: 'furniture.cushion', x: '2', y: 'a' }, // 座標不正
    P('p1', 'furniture.wood_chair', 5, 5),        // instanceId 重複
    P('p9', 'furniture.wood_chair', 7, 5),
    P('p10', 'furniture.wood_chair', 8, 5),       // 所持2を超える3脚目
    null, 42,
  ];
  good.inventory['unknown.item'] = { default: 3 };
  good.garden.placements = 'broken';
  good.materials = { wood: -3, cloth: 'x', metal: 2.7 };
  good.unlockedRecipes = ['cushion', 'cushion', 'nope'];
  ctx.gs.homeData = JSON.parse(JSON.stringify(good));
  const r = H.ensure();
  const ids = r.room.placements.map(p => p.itemId);
  assert.equal(JSON.stringify(ids), JSON.stringify(['furniture.futon', 'furniture.wood_chair', 'furniture.wood_chair']));
  assert.equal(new Set(r.room.placements.map(p => p.instanceId)).size, 3);
  assert.equal(r.garden.placements.length, 0);
  assert.equal(H.owned('furniture.futon'), 1);
  assert.equal(H.owned('furniture.wood_chair'), 2);
  assert.equal(H.stored('furniture.wood_chair'), 0);
  assert.equal(H.stored('furniture.desk_small'), 1, '外した机は収納に戻る');
  assert.equal(H.stored('garden.fence'), 6);
  assert.deepEqual({ ...r.materials }, { wood: 0, cloth: 0, metal: 2, sea: 0 });
  assert.deepEqual([...r.unlockedRecipes], ['cushion']);
  assert.ok(r.seq > 10);
  checkCounts(H);
});

test('セーブ移行：ゴミデータでも例外を出さない', () => {
  for (const bad of [null, 5, 'x', [], { room: null, garden: 3, inventory: [], plants: 'p' }, { version: 1, room: { placements: [{}] } }]) {
    const { H, ctx } = makeSandbox();
    ctx.gs.homeData = bad;
    const hd = H.ensure();
    assert.ok(hd && hd.version === 2 && Array.isArray(hd.room.placements) && Array.isArray(hd.garden.placements));
    assert.equal(typeof H.stored('furniture.futon'), 'number');
  }
  const { H, ctx } = makeSandbox();
  delete ctx.gs;
  assert.equal(H.ensure(), null);
});

test('セーブ往復（JSON化 → 読込 → ensure）で変わらない', () => {
  const { H, ctx } = makeSandbox();
  H.ensure(); H.addItem('garden.pot', 1, 'blue'); H.plant('p99', { name: 'ひまわり', color: 'yellow' });
  H.ensure();
  const s = JSON.stringify(ctx.gs.homeData);
  ctx.gs.homeData = JSON.parse(s);
  H.ensure();
  assert.equal(JSON.stringify(ctx.gs.homeData), s);
});

test('クラフト：素材を1回だけ消費して完成品を1つ追加', () => {
  const { H, ctx, calls } = makeSandbox();
  const hd = H.ensure();
  const shelf0 = H.owned('furniture.repaired_shelf');
  const f0 = ctx.gs.fatigue;
  let crafted = 0; H.on('crafted', () => crafted++);
  const r = H.craft('repaired_shelf');
  assert.ok(r.ok, r.reason);
  assert.equal(hd.materials.wood, 2);
  assert.equal(hd.materials.metal, 1);
  assert.equal(H.owned('furniture.repaired_shelf'), shelf0 + 1);
  assert.equal(H.stored('furniture.repaired_shelf'), 1);
  assert.deepEqual(calls.advTime, [30]);
  assert.equal(ctx.gs.fatigue, f0 + 2);
  assert.equal(crafted, 1);
  assert.equal(hd.flags.repairedShelf, true);
  // 足りないと何も変わらない
  assert.ok(H.craft('repaired_shelf').ok);   // wood 0, metal 0
  const snap = JSON.stringify(hd);
  const r2 = H.craft('repaired_shelf');
  assert.ok(!r2.ok && /足りません/.test(r2.reason));
  assert.equal(JSON.stringify(hd), snap);
  assert.equal(calls.advTime.length, 2);
  // 未解放
  hd.materials.sea = 5; hd.materials.metal = 5;
  const r3 = H.craft('shell_lantern');
  assert.ok(!r3.ok);
  assert.equal(H.owned('light.shell_lantern'), 0);
  assert.ok(H.unlockRecipe('shell_lantern'));
  assert.ok(!H.unlockRecipe('shell_lantern'));
  assert.ok(H.craft('shell_lantern').ok);
  assert.equal(H.owned('light.shell_lantern'), 1);
  assert.equal(hd.materials.sea, 3);
});

test('クラフト：作業中の再入（二重実行）を防ぐ', () => {
  const { H, ctx, calls } = makeSandbox();
  const hd = H.ensure();
  let inner = null;
  ctx.advTime = () => { calls.advTime.push(30); inner = H.craft('fence'); };
  assert.ok(H.craft('fence').ok);
  assert.ok(inner && !inner.ok);
  assert.equal(hd.materials.wood, 3);
  assert.equal(H.owned('garden.fence'), 7);
});

test('grantOnce：同じ報酬は一度だけ', () => {
  const { H, ctx } = makeSandbox();
  H.ensure();
  let n = 0;
  assert.equal(H.grantOnce('rpg_ch2', () => { n++; H.addMaterial('sea', 2); }), true);
  assert.equal(H.grantOnce('rpg_ch2', () => { n++; H.addMaterial('sea', 2); }), false);
  assert.equal(n, 1);
  assert.equal(ctx.gs.homeData.materials.sea, 2);
  // 再入しても二重にならない
  let m = 0;
  H.grantOnce('x', () => { m++; H.grantOnce('x', () => m++); });
  assert.equal(m, 1);
  // セーブ往復後も記録が残る
  ctx.gs.homeData = JSON.parse(JSON.stringify(ctx.gs.homeData));
  H.ensure();
  assert.equal(H.grantOnce('rpg_ch2', () => n++), false);
});

test('植物：水やりで育ち、放っておいても枯れない', () => {
  const { H, ctx } = makeSandbox({ day: 5 });
  const hd = H.ensure();
  H.plant('p50', { name: 'とても長い花の名前です', color: 'red' });
  assert.equal(hd.plants.p50.name.length, 8);
  H.plant('p51', { name: '  ' });
  assert.equal(hd.plants.p51.name, 'ひなた');
  // 30日放置
  for (let d = 6; d < 36; d++) { ctx.gs.day = d; H.tickDay(); }
  assert.ok(hd.plants.p50, '枯れて消えない');
  assert.ok(hd.plants.p50.stage >= 0 && hd.plants.p50.stage <= 1);
  // 毎日水やり → 最大まで育つ（上限を超えない）
  for (let d = 36; d < 60; d++) { ctx.gs.day = d; H.water('p50'); H.tickDay(); }
  assert.equal(hd.plants.p50.stage, 4);
  // 同じ日に二度 tick しない
  const s = JSON.stringify(hd.plants.p51); H.tickDay(); assert.equal(JSON.stringify(hd.plants.p51), s);
  assert.equal(H.water('p50'), false, '同じ日は1回');
  assert.equal(H.water('nope'), false);
});

test('家で過ごす精神+ は1日の上限つき', () => {
  const { H, ctx } = makeSandbox({ mental: 50 });
  H.ensure();
  let total = 0; for (let i = 0; i < 10; i++) total += H.addHomeMental(1);
  assert.equal(total, 4); assert.equal(ctx.gs.mental, 54);
  ctx.gs.day = 2; assert.equal(H.addHomeMental(3), 3);
});

test('HOME.save は saveGame の成否を返す', () => {
  const { H, ctx } = makeSandbox();
  assert.equal(H.save(), true);
  ctx.saveGame = () => false; assert.equal(H.save(), false);
  ctx.saveGame = () => { throw new Error('quota'); }; assert.equal(H.save(), false);
});

// ── フェーズ2 ──
function v1Save(H, ctx) {
  // フェーズ1の形（version 1・新アイテム無し・species 無し・bonds/life 無し）
  const hd = H.ensure();
  const v1 = JSON.parse(JSON.stringify(hd));
  v1.version = 1;
  delete v1.inventory['furniture.toy_box']; delete v1.inventory['garden.watering_can'];
  v1.unlockedRecipes = ['repaired_shelf', 'cushion', 'flowerbed', 'fence', 'sea_glass'];
  delete v1.flags.v2Items; delete v1.bonds; delete v1.life;
  v1.plants = { p40: { name: 'ひなた', color: 'red', stage: 2, growth: 1, plantedDay: 3, lastWateredDay: 4 } };
  return v1;
}

test('v1 → v2 移行：一度だけ足す・何度 ensure しても同じ', () => {
  const { H, ctx } = makeSandbox({ day: 9 });
  const v1 = v1Save(H, ctx);
  ctx.gs.homeData = JSON.parse(JSON.stringify(v1));
  const hd = H.ensure();
  assert.equal(hd.version, 2);
  assert.equal(H.owned('furniture.toy_box'), 1);
  assert.equal(H.owned('garden.watering_can'), 1);
  assert.ok(H.hasRecipe('kid_desk') && H.hasRecipe('planter') && H.hasRecipe('clothesline') && H.hasRecipe('string_lights'));
  assert.ok(!H.hasRecipe('wind_chime') && !H.hasRecipe('sea_mobile') && !H.hasRecipe('nameplate'), '章クリアのレシピは未解放のまま');
  assert.equal(hd.plants.p40.species, 'seed');
  assert.equal(hd.plants.p40.stage, 2);
  assert.deepEqual({ ...hd.bonds }, {}); assert.deepEqual({ ...hd.life }, {});
  assert.equal(hd.room.placements.length, v1.room.placements.length, '配置はそのまま');
  const once = JSON.stringify(hd);
  H.ensure(); H.ensure();
  assert.equal(JSON.stringify(ctx.gs.homeData), once, '冪等');
  // セーブ往復でも二重に足されない
  ctx.gs.homeData = JSON.parse(once); H.ensure();
  assert.equal(H.owned('furniture.toy_box'), 1);
  // 収納のおもちゃ箱を使い切っても（所持0）、移行で再付与されない
  ctx.gs.homeData.inventory['furniture.toy_box'] = { default: 0 }; H.ensure();
  assert.equal(H.owned('furniture.toy_box'), 0);
  // 他モジュールが入れた bonds / life は消さない
  ctx.gs.homeData.bonds = { askedHelp: 2 }; ctx.gs.homeData.life = { active: true, day: 3 }; H.ensure();
  assert.equal(ctx.gs.homeData.bonds.askedHelp, 2); assert.equal(ctx.gs.homeData.life.day, 3);
  checkCounts(H);
});

test('種：置けない・植えると1つだけ減る・二度植えられない', () => {
  const { H, ctx } = makeSandbox({ day: 6 });
  const hd = H.ensure();
  assert.ok(H.giveSeed('morning_glory', 2));
  assert.ok(!H.giveSeed('nope'));
  assert.equal(H.seedCount('morning_glory'), 2);
  assert.equal(H.CATALOG['seed.morning_glory'].kind, 'seed');
  for (const area of ['room', 'garden']) {
    const r = H.canPlace(area, [], cand('seed.morning_glory', 3, 3));
    assert.ok(!r.ok && /植え/.test(r.reason), r.reason);
  }
  // 下書きでも置けない
  const d = H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, { owned: (i, v) => H.owned(i, v), seq: hd.seq });
  assert.ok(!d.place('garden', cand('seed.morning_glory', 3, 5)).ok);
  // 鉢を置いて植える
  H.addItem('garden.pot', 1, 'red');
  hd.garden.placements.push({ instanceId: 'p90', itemId: 'garden.pot', x: 3, y: 9, rotation: 0, variant: 'red', layer: 'furniture' });
  assert.ok(!H.plantSeed('p90', 'sunflower').ok, '持っていない種');
  const r1 = H.plantSeed('p90', 'morning_glory', '');
  assert.ok(r1.ok, r1.reason);
  assert.equal(r1.plant.species, 'morning_glory');
  assert.equal(r1.plant.name, 'あさがお');
  assert.equal(H.seedCount('morning_glory'), 1);
  const r2 = H.plantSeed('p90', 'morning_glory');
  assert.ok(!r2.ok && /もう/.test(r2.reason));
  assert.equal(H.seedCount('morning_glory'), 1, '失敗では減らない');
  // 植えられないもの・置いていないもの
  assert.ok(!H.plantSeed(hd.garden.placements.find(p => p.itemId === 'garden.small_tree').instanceId, 'morning_glory').ok);
  assert.ok(!H.plantSeed('p999', 'morning_glory').ok);
  // 最後の1つも使える → 0（所持から消える）
  H.addItem('garden.pot', 1, 'blue');
  hd.garden.placements.push({ instanceId: 'p91', itemId: 'garden.pot', x: 4, y: 9, rotation: 0, variant: 'blue', layer: 'furniture' });
  assert.ok(H.plantSeed('p91', 'morning_glory', 'あお').ok);
  assert.equal(H.seedCount('morning_glory'), 0);
  assert.equal(hd.inventory['seed.morning_glory'], undefined);
  assert.equal(hd.plants.p91.name, 'あお');
  // 育ち方は共通・枯れない
  for (let dd = 7; dd < 30; dd++) { ctx.gs.day = dd; H.water('p90'); H.tickDay(); }
  assert.equal(hd.plants.p90.stage, 4);
  // セーブ往復で species が残る
  H.ensure(); const s = JSON.stringify(ctx.gs.homeData); ctx.gs.homeData = JSON.parse(s); H.ensure();
  assert.equal(ctx.gs.homeData.plants.p90.species, 'morning_glory');
  assert.equal(JSON.stringify(ctx.gs.homeData), s);
});

test('プランター：2×1・回転で1×2・1つだけ植わる・収納→再配置で植物を引き継ぐ', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  assert.deepEqual({ ...H.footprint('garden.planter', 0) }, { w: 2, h: 1 });
  assert.deepEqual({ ...H.footprint('garden.planter', 90) }, { w: 1, h: 2 });
  assert.ok(!H.canPlace('garden', [], cand('garden.planter', 15, 5, 0)).ok, 'はみ出す');
  assert.ok(H.canPlace('garden', [], cand('garden.planter', 15, 5, 90)).ok);
  assert.ok(!H.canPlace('garden', [], cand('garden.planter', 3, 3, 180)).ok, '180は無い');
  assert.ok(!H.canPlace('room', [], cand('garden.planter', 3, 3)).ok, '部屋には置けない');
  assert.ok(H.craft('planter').ok);
  const d = H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, { owned: (i, v) => H.owned(i, v), seq: hd.seq });
  const r = d.place('garden', cand('garden.planter', 2, 9, 90));
  assert.ok(r.ok, r.reason);
  hd.garden.placements = d.result().garden; hd.seq = d.seq;
  H.giveSeed('sunflower', 1); H.giveSeed('herb', 1);
  assert.ok(H.plantSeed(r.P.instanceId, 'sunflower').ok);
  assert.ok(!H.plantSeed(r.P.instanceId, 'herb').ok, '1つだけ');
  assert.equal(hd.plants[r.P.instanceId].holder, 'garden.planter');
  // 収納して置き直すと同じ植物が戻る（鉢には付かない）
  const d2 = H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, {
    owned: (i, v) => H.owned(i, v), seq: hd.seq, plantIds: Object.keys(hd.plants), plantHolder: id => hd.plants[id].holder || 'garden.pot' });
  assert.ok(d2.store(r.P.instanceId).ok);
  H.addItem('garden.pot', 1, 'yellow');
  const pot = d2.place('garden', cand('garden.pot', 6, 9, 0, 'yellow'));
  assert.ok(pot.ok); assert.notEqual(pot.P.instanceId, r.P.instanceId);
  const again = d2.place('garden', cand('garden.planter', 9, 9, 0));
  assert.ok(again.ok); assert.equal(again.P.instanceId, r.P.instanceId);
});

test('新アイテム：定義・壁専用・レシピ', () => {
  const { H } = makeSandbox();
  H.ensure();
  const ids = ['furniture.toy_box', 'furniture.kid_desk', 'furniture.old_radio', 'memento.toolbox', 'memento.recital_photo', 'deco.wind_chime',
    'deco.sea_mobile', 'garden.nameplate', 'garden.clothesline', 'light.string_lights', 'garden.planter', 'garden.watering_can'];
  for (const id of ids) assert.ok(H.CATALOG[id], id);
  for (const id of ['memento.recital_photo', 'deco.wind_chime', 'deco.sea_mobile']) {
    assert.ok(H.canPlace('room', [], cand(id, 4, 0)).ok, id);
    assert.ok(!H.canPlace('room', [], cand(id, 4, 3)).ok, id + ' 床には置けない');
  }
  assert.deepEqual({ ...H.footprint('garden.clothesline', 90) }, { w: 1, h: 3 });
  assert.ok(H.canPlace('garden', [P('a', 'light.string_lights', 3, 3)], cand('garden.stepping_stone', 3, 3)).ok, '豆電球の下に飛び石');
  for (const r of ['wind_chime', 'sea_mobile', 'nameplate', 'kid_desk', 'clothesline', 'string_lights', 'planter']) assert.ok(H.RECIPES[r] && H.CATALOG[H.RECIPES[r].out], r);
});

test('訪問者・ねこ：立つマスは solid でも出入口でもない', () => {
  const { H } = makeSandbox();
  const hd = H.ensure();
  for (const area of ['room', 'garden']) {
    const L = hd[area].placements, A = H.AREAS[area];
    const solid = H.solidGrid(A, L);
    for (let y = -1; y <= A.h; y++) for (let x = -1; x <= A.w; x++) {
      const c = H.standCell(area, L, x, y, [{ x: 4, y: 5 }]);
      assert.ok(c, `${area} ${x},${y}`);
      assert.equal(solid[c.y * A.w + c.x], 0, `${area} ${x},${y} → solid ${c.x},${c.y}`);
      assert.ok(!H._isExit(area, c.x, c.y));
      assert.ok(!(c.x === 4 && c.y === 5), '人のいるマスは避ける');
    }
    // 家具の上を指定しても、いちばん近い空きマスへ
    const solidP = L.find(p => H.CATALOG[p.itemId].solid && H.CATALOG[p.itemId].layer === 'furniture');
    const c = H.standCell(area, L, solidP.x, solidP.y);
    assert.equal(solid[c.y * A.w + c.x], 0);
    assert.ok(Math.abs(c.x - solidP.x) + Math.abs(c.y - solidP.y) <= 2);
    // ねこの昼寝場所：床のものは solid でない／家具の上はベンチ・布団だけ
    const spots = H.catSpots(area, L.concat(area === 'garden' ? [P('b1', 'garden.bench', 2, 9)] : [P('c1', 'furniture.cushion', 8, 6)]), { night: false });
    assert.ok(spots.length > 0);
    for (const s of spots) {
      if (!s.on) assert.equal(solid[s.y * A.w + s.x], 0, `cat ${area} ${s.x},${s.y}`);
      else assert.ok(/bench|futon/.test(s.kind));
      assert.ok(!H._isExit(area, s.x, s.y));
    }
  }
});

test('娘の寝る時間：23時〜5時台', () => {
  const { H } = makeSandbox();
  const asleep = [23, 0, 1, 2, 3, 4, 5, 24, -1];
  const awake = [6, 7, 12, 18, 21, 22, 22.9, NaN, undefined, 'x'];
  for (const h of asleep) assert.equal(H.isKidSleepHour(h), true, String(h));
  for (const h of awake) assert.equal(H.isKidSleepHour(h), false, String(h));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
