// トビネズミMMO：巣データ v1 と建築ルール（shared/nest-rules.js）・巣の中の移動（stepSide）・全体／閲覧モードの配置一致
import assert from 'node:assert/strict';
import { createNest, validateOp, tryOp, applyOp, migrateNest, MIGRATIONS, validateNest, encodeCells, decodeCells, cellsOf, cellAt, C, isConnected,
  inverseOps, structureAt, roomEdgeAt, resizeByEdge, tunnelFromDrag, objectsWithFixtures, fixtureOf, nestQuery, NEST_SCHEMA, ROOM_COST, KIND_COST, CELL } from '../tobinezumi/shared/nest-rules.js';
import { makeInventory, countItem, payCost, refund, FURNITURE } from '../tobinezumi/shared/items.js';
import { stepSide, makeSideState, STEP_DT } from '../tobinezumi/shared/move.js';
import { buildLayout, walkLayout } from '../tobinezumi/client/nest-layout.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const rich = () => makeInventory(undefined, [{ id: 'seed', n: 99 }, { id: 'grass', n: 99 }, { id: 'pebble', n: 99 }]);
/** 操作を順に当てる（持ち物も減らす）。失敗したら理由つきで投げる */
function build(d, ops, inv = rich()) {
  for (const op of ops) {
    const r = tryOp(d, op, inv);
    if (!r.ok) throw new Error(JSON.stringify(op) + ' → ' + r.reason);
    payCost(inv, r.cost); refund(inv, r.refund);
    d = r.data;
  }
  return d;
}
// 岩の無い巣（試験用）：createNest の岩を土に戻す
function plainNest() {
  const d = createNest({ seed: 3 });
  const cells = new Uint8Array(cellsOf(d));
  for (let i = 0; i < cells.length; i++) if (cells[i] === C.ROCK && i < (d.h - 1) * d.w) cells[i] = C.SOIL;
  return { ...d, cells: encodeCells(cells) };
}

test('新しい巣：v1・48×24・入口から縦穴＋小部屋＋ランタン・つながっている', () => {
  const d = createNest({ seed: 1 });
  assert.equal(d.v, NEST_SCHEMA); assert.equal(d.w, 48); assert.equal(d.h, 24);
  assert.ok(validateNest(d).ok);
  assert.equal(d.rooms.length, 1); assert.equal(d.tunnels.length, 1); assert.ok(d.tunnels[0].fixed);
  assert.equal(d.objects[0].type, 'lamp');
  assert.equal(cellAt(d, d.entrance.x, d.entrance.y), C.OPEN);
  assert.equal(cellAt(d, 0, 0), C.AIR);
  assert.equal(cellAt(d, 5, d.h - 1), C.ROCK, '底は岩盤');
  assert.deepEqual(createNest({ seed: 1 }), d, '同じ種なら同じ巣');
});

test('セルの RLE：往復で同じ', () => {
  const arr = new Uint8Array([0, 0, 0, 1, 1, 2, 3, 3, 0]);
  assert.equal(encodeCells(arr), '3s2d1r2a1s');
  assert.deepEqual([...decodeCells(encodeCells(arr), 9, 1)], [...arr]);
  assert.throws(() => decodeCells('3s', 9, 1));
});

test('掘る：土だけ・岩は掘れない・つながっていない所はだめ・地表と底は掘れない', () => {
  const d = createNest({ seed: 1 });
  // 部屋 (6,7)-(11,9) の左隣
  assert.equal(validateOp(d, { op: 'dig', x: 5, y: 8 }).ok, true);
  assert.equal(validateOp(d, { op: 'dig', x: 30, y: 15 }).reason, '巣とつながっていない');
  assert.equal(validateOp(d, { op: 'dig', x: 7, y: 8 }).reason, 'もう掘ってある');
  assert.equal(validateOp(d, { op: 'dig', x: 3, y: 2 }).reason, '地表は掘れない');
  assert.equal(validateOp(d, { op: 'dig', x: 3, y: 23 }).reason, '底は固くて掘れない');
  const cells = new Uint8Array(cellsOf(d)); cells[8 * d.w + 5] = C.ROCK;
  const d2 = { ...d, cells: encodeCells(cells) };
  assert.equal(validateOp(d2, { op: 'dig', x: 5, y: 8 }).reason, '岩は掘れない');
  const r = tryOp(d, { op: 'dig', x: 5, y: 8 });
  assert.equal(cellAt(r.data, 5, 8), C.OPEN);
  assert.equal(cellAt(d, 5, 8), C.SOIL, '元のデータは書き換えない');
});

test('通路：横・縦・坂（頭の上も掘る）・岩があればだめ', () => {
  let d = plainNest();
  d = build(d, [{ op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }]);
  for (let x = 12; x < 18; x++) assert.equal(cellAt(d, x, 9), C.OPEN);
  d = build(d, [{ op: 'tunnel', x: 17, y: 10, len: 4, dir: 'v' }]);
  assert.equal(cellAt(d, 17, 13), C.OPEN);
  d = build(d, [{ op: 'tunnel', x: 18, y: 13, len: 3, dir: 'slope', s: 1 }]);
  for (let i = 0; i < 3; i++) { assert.equal(cellAt(d, 18 + i, 14 + i), C.OPEN, '坂'); assert.equal(cellAt(d, 18 + i, 13 + i), C.OPEN, '頭の空間'); }
  assert.ok(isConnected(d));
  assert.equal(validateOp(d, { op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }).reason, 'もう通れる');
  assert.equal(validateOp(d, { op: 'tunnel', x: 12, y: 9, len: 1, dir: 'h' }).reason, '通路が短すぎる');
  assert.equal(validateOp(d, { op: 'tunnel', x: 30, y: 20, len: 4, dir: 'h' }).reason, '巣とつながっていない');
  // ドラッグ → 操作
  assert.deepEqual(tunnelFromDrag(3, 5, 8, 5), { op: 'tunnel', x: 3, y: 5, len: 6, dir: 'h' });
  assert.deepEqual(tunnelFromDrag(4, 9, 4, 6), { op: 'tunnel', x: 4, y: 6, len: 4, dir: 'v' });
  assert.deepEqual(tunnelFromDrag(5, 9, 2, 12), { op: 'tunnel', x: 5, y: 9, len: 4, dir: 'slope', s: -1 });
  assert.deepEqual(tunnelFromDrag(2, 12, 5, 9), { op: 'tunnel', x: 5, y: 9, len: 4, dir: 'slope', s: -1 }, '下から引いても同じ坂');
});

test('部屋：最小 4×3・重なりはだめ・つながりが要る・素材が要る', () => {
  let d = plainNest();
  d = build(d, [{ op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }]);
  assert.equal(validateOp(d, { op: 'room', x: 18, y: 7, w: 3, h: 3 }).reason, '部屋は 4×3 以上');
  assert.equal(validateOp(d, { op: 'room', x: 18, y: 7, w: 15, h: 3 }).reason, '部屋は 14×8 まで');
  assert.equal(validateOp(d, { op: 'room', x: 9, y: 8, w: 5, h: 3 }).reason, '部屋が重なる');
  assert.equal(validateOp(d, { op: 'room', x: 30, y: 15, w: 5, h: 3 }).reason, '巣とつながっていない');
  assert.equal(validateOp(d, { op: 'room', x: 18, y: 3, w: 5, h: 3 }).reason, '地表に近すぎる');
  const ok = validateOp(d, { op: 'room', x: 18, y: 7, w: 6, h: 3, kind: 'bed' });
  assert.ok(ok.ok); assert.deepEqual(ok.cost, { pebble: ROOM_COST.pebble, grass: KIND_COST.bed.grass });
  assert.equal(validateOp(d, { op: 'room', x: 18, y: 7, w: 6, h: 3 }, makeInventory()).reason, '素材が足りない');
  const r = tryOp(d, { op: 'room', x: 18, y: 7, w: 6, h: 3 }, rich());
  assert.equal(r.created, 'r' + d.seq); assert.equal(r.data.seq, d.seq + 1);
  // 岩
  const cells = new Uint8Array(cellsOf(d)); cells[8 * d.w + 20] = C.ROCK;
  assert.equal(validateOp({ ...d, cells: encodeCells(cells) }, { op: 'room', x: 18, y: 7, w: 6, h: 3 }).reason, '岩がある');
});

test('部屋の拡張（辺のドラッグ）：広げる・せばめる・重なりと家具のはみ出しはだめ・広げた分の素材', () => {
  let d = plainNest();
  d = build(d, [{ op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }, { op: 'room', x: 18, y: 7, w: 6, h: 3 }, { op: 'tunnel', x: 24, y: 9, len: 2, dir: 'h' }, { op: 'room', x: 26, y: 7, w: 4, h: 3 }]);
  const room = d.rooms.find(r => r.x === 18);
  // 辺の検出
  const e = roomEdgeAt(d, 24.1, 8.2);
  assert.equal(e.room.id, room.id); assert.equal(e.edge, 'r');
  assert.deepEqual(resizeByEdge(room, 'b', 20, 11), { x: 18, y: 7, w: 6, h: 5 });
  assert.deepEqual(resizeByEdge(room, 'l', 16, 8), { x: 16, y: 7, w: 8, h: 3 });
  // 下へ広げる（12 マス増 → 小石 1）
  const v = validateOp(d, { op: 'room-resize', id: room.id, x: 18, y: 7, w: 6, h: 5 });
  assert.ok(v.ok, v.reason); assert.deepEqual(v.cost, { pebble: 1 });
  // 右へ広げると隣の部屋に重なる
  assert.equal(validateOp(d, { op: 'room-resize', id: room.id, x: 18, y: 7, w: 9, h: 3 }).reason, '部屋が重なる');
  // 家具があるとき：床が下がると浮く
  d = build(d, [{ op: 'place', type: 'rug', x: 19, y: 9 }]);
  assert.match(validateOp(d, { op: 'room-resize', id: room.id, x: 18, y: 7, w: 6, h: 5 }).reason, /家具がはみ出る/);
  // 横に広げるのは OK、せばめると土に戻る（家具の外側だけ）
  d = build(d, [{ op: 'room-resize', id: room.id, x: 17, y: 7, w: 7, h: 3 }]);
  assert.equal(cellAt(d, 17, 8), C.OPEN);
  assert.equal(validateOp(d, { op: 'room-resize', id: room.id, x: 17, y: 7, w: 5, h: 3 }).reason, '通路が途切れてしまう', '右をせばめると奥の部屋が孤立');
  d = build(d, [{ op: 'room-resize', id: room.id, x: 18, y: 7, w: 6, h: 3 }]);
  assert.equal(cellAt(d, 17, 7), C.SOIL, 'せばめた所は土');
  assert.equal(cellAt(d, 17, 9), C.OPEN, '通路が持っていたセルは残る');
  assert.equal(validateOp(d, { op: 'room-resize', id: room.id, x: 19, y: 7, w: 3, h: 3 }).reason, '部屋は 4×3 以上');
});

test('寝床・倉庫・家具：備え付けの位置は部屋から決まる・床／天井・重なり', () => {
  let d = plainNest();
  const rid = d.rooms[0].id;
  d = build(d, [{ op: 'set-kind', id: rid, kind: 'bed' }]);
  const fx = fixtureOf(d.rooms[0]);
  assert.equal(fx.type, 'nestbed'); assert.equal(fx.y + fx.h, d.rooms[0].y + d.rooms[0].h, '床の上');
  assert.equal(validateOp(d, { op: 'set-kind', id: rid, kind: 'bed' }).reason, 'もう寝床だ');
  assert.equal(validateOp(d, { op: 'place', type: 'seed_pile', x: fx.x, y: fx.y }).reason, '物が重なる');
  assert.equal(validateOp(d, { op: 'place', type: 'seed_pile', x: 6, y: 8 }).reason, '床に置こう');
  assert.equal(validateOp(d, { op: 'place', type: 'lamp', x: 7, y: 8 }).reason, '天井に吊るそう');
  assert.equal(validateOp(d, { op: 'place', type: 'lamp', x: 30, y: 8 }).reason, '部屋の中に置こう');
  assert.equal(validateOp(d, { op: 'place', type: 'shelf', x: 11, y: 8 }).reason, '部屋の中に置こう', 'はみ出す');
  d = build(d, [{ op: 'place', type: 'seed_pile', x: 6, y: 9 }]);
  assert.equal(validateOp(d, { op: 'place', type: 'seed_pile', x: 6, y: 9 }).reason, '物が重なる');
  // 家具が備え付けの場所にあると種類を変えられない
  d = build(d, [{ op: 'set-kind', id: rid, kind: 'plain' }, { op: 'place', type: 'rug', x: 10, y: 9 }]);
  assert.equal(validateOp(d, { op: 'set-kind', id: rid, kind: 'store' }).reason, '家具がじゃま');
  assert.equal(objectsWithFixtures(d).filter(o => o.fixture).length, 0);
});

test('撤去：家具は半分返る・部屋は部屋＋種類＋中の家具の半分・入口の縦穴は撤去できない・つながりが切れるならだめ', () => {
  let d = plainNest();
  d = build(d, [{ op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }, { op: 'room', x: 18, y: 7, w: 6, h: 3, kind: 'store' }, { op: 'place', type: 'shelf', x: 18, y: 8 }]);
  const store = d.rooms.find(r => r.kind === 'store');
  const shelf = d.objects.find(o => o.type === 'shelf');
  const vo = validateOp(d, { op: 'remove', id: shelf.id });
  assert.deepEqual(vo.refund, { pebble: 1, grass: 1 });
  const vr = validateOp(d, { op: 'remove', id: store.id });
  // 部屋 小石2 ＋ 倉庫 小石2・草1 → 小石2（草は 1→0 なので戻らない）、棚 小石2・草2 → 小石1・草1
  assert.deepEqual(vr.refund, { pebble: 3, grass: 1 });
  const inv = makeInventory();
  const r = tryOp(d, { op: 'remove', id: store.id }, inv);
  assert.ok(r.ok);
  refund(inv, r.refund);
  assert.equal(countItem(inv, 'pebble'), 3);
  assert.equal(r.data.objects.find(o => o.id === shelf.id), undefined, '中の家具も片づく');
  assert.equal(cellAt(r.data, 20, 8), C.SOIL);
  assert.equal(validateOp(d, { op: 'remove', id: d.tunnels[0].id }).reason, '入口の縦穴は撤去できない');
  // 通路を消すと奥の部屋が孤立する
  const tun = d.tunnels.find(t => t.dir === 'h');
  assert.equal(validateOp(d, { op: 'remove', id: tun.id }).reason, '通路が途切れてしまう');
  assert.equal(validateOp(d, { op: 'remove', id: 'fx:' + store.id }).reason, '部屋の種類を「ふつう」に戻すと片づく');
  // 撤去ツールが見つけるもの
  assert.equal(structureAt(d, 18, 8).kind, 'object');
  assert.equal(structureAt(d, 22, 7).kind, 'room');
  assert.equal(structureAt(d, 14, 9).kind, 'tunnel');
  assert.equal(structureAt(d, 30, 15), null);
  // 掘ったセルを埋める
  const d2 = build(d, [{ op: 'dig', x: 5, y: 8 }]);
  assert.ok(validateOp(d2, { op: 'fill', x: 5, y: 8 }).ok);
  assert.match(validateOp(d2, { op: 'fill', x: 7, y: 8 }).reason, /撤去/);
});

test('取り消し（Ctrl+Z）：逆操作で元に戻る', () => {
  const d0 = plainNest();
  const steps = [{ op: 'dig', x: 5, y: 8 }, { op: 'tunnel', x: 12, y: 9, len: 4, dir: 'h' }, { op: 'place', type: 'seed_pile', x: 7, y: 9 }, { op: 'set-kind', id: d0.rooms[0].id, kind: 'bed' }];
  let d = d0;
  for (const op of steps) {
    const r = tryOp(d, op, rich());
    assert.ok(r.ok, op.op + ' ' + r.reason);
    const inv = inverseOps(d, op, r);
    let back = r.data;
    for (const o of inv) { const rr = tryOp(back, o, rich()); assert.ok(rr.ok, 'undo ' + o.op + ' ' + rr.reason); back = rr.data; }
    assert.equal(back.cells, d.cells, op.op + ' の取り消しでセルが戻る');
    assert.deepEqual(back.rooms, d.rooms); assert.deepEqual(back.objects.map(o => o.type + o.x + o.y), d.objects.map(o => o.type + o.x + o.y));
    d = r.data;
  }
});

test('版の移行：v0（試作の形）→ v1、壊れたデータ・新しすぎる版は読まない', () => {
  const w = 48, h = 24, sy = 2;
  const grid = new Array(w * h).fill(0);
  for (let y = 3; y < 7; y++) grid[y * w + 8] = 1;       // 古い縦穴
  for (let y = 7; y < 10; y++) for (let x = 6; x < 12; x++) grid[y * w + x] = 1;
  grid[20 * w + 30] = 2;
  const v0 = { w, h, surface: sy, grid, rooms: [{ x: 6, y: 7, w: 6, h: 3, type: 'sleep' }], items: [{ kind: 'lamp', x: 8, y: 7 }, { kind: 'unknown', x: 1, y: 1 }], door: { x: 8 } };
  const d = migrateNest(v0);
  assert.equal(d.v, 1);
  assert.ok(validateNest(d).ok);
  assert.equal(d.rooms[0].kind, 'bed');
  assert.equal(d.objects.length, 1);
  assert.equal(cellAt(d, 30, 20), C.ROCK);
  assert.equal(cellAt(d, 8, 2), C.OPEN, '入口');
  assert.ok(typeof MIGRATIONS[0] === 'function');
  assert.deepEqual(migrateNest(d), d, 'v1 はそのまま');
  assert.throws(() => migrateNest({ ...d, v: 99 }), /新しすぎる/);
  assert.throws(() => migrateNest(null));
  const broken = { ...d, cells: encodeCells(new Uint8Array(w * h).fill(C.SOIL)) };
  assert.throws(() => migrateNest(broken), /壊れている/);
});

test('全体モードと閲覧モード：家具・備え付け・部屋の位置がまったく同じ（同じセル座標×16px）', () => {
  let d = plainNest();
  d = build(d, [
    { op: 'set-kind', id: d.rooms[0].id, kind: 'bed' },
    { op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }, { op: 'room', x: 18, y: 7, w: 7, h: 3, kind: 'store' },
    { op: 'place', type: 'lamp', x: 20, y: 7 }, { op: 'place', type: 'seed_pile', x: 18, y: 9 }, { op: 'place', type: 'dried_flower', x: 6, y: 9 },
  ]);
  const B = buildLayout(d), Wk = walkLayout(d);
  assert.deepEqual(B.objects, Wk.objects);
  assert.deepEqual(B.rooms, Wk.rooms);
  assert.equal(B.width, Wk.width);
  for (const o of Wk.objects) {
    assert.equal(o.px, o.x * CELL); assert.equal(o.py, o.y * CELL);
    const it = Wk.interact.find(i => i.id === o.id);
    assert.ok(it.x0 < o.px + o.pw && it.x1 > o.px, '調べる範囲は家具の位置');
    assert.equal(it.floorY, o.py + o.ph);
  }
  assert.equal(Wk.interact.find(i => i.type === 'nestbed').action, 'sleep');
  assert.equal(Wk.interact.find(i => i.type === 'storage').action, 'store');
  assert.equal(Wk.lights.length, 2);
  assert.deepEqual(Wk.lights.map(l => Math.floor(l.x / CELL)), d.objects.filter(o => o.type === 'lamp').map(o => o.x).sort((a, b) => a - b).length ? Wk.lights.map(l => Math.floor(l.x / CELL)) : []);
  assert.ok(FURNITURE.lamp.mount === 'ceil');
});

test('巣の中を歩く：縦穴を降りて部屋へ・壁で止まる・通路を通って隣の部屋・坂を下る・入口まで登ると地上へ', () => {
  let d = plainNest();
  d = build(d, [{ op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' }, { op: 'room', x: 18, y: 7, w: 6, h: 3 },
    { op: 'tunnel', x: 24, y: 9, len: 3, dir: 'slope', s: 1 }, { op: 'room', x: 27, y: 10, w: 5, h: 3 }]);
  const q = nestQuery(d);
  const run = (s, inp, n) => { for (let i = 0; i < n; i++) s = stepSide(s, inp, STEP_DT, q); return s; };
  let s = makeSideState(d.entrance.x * CELL + 8, (d.surfaceY + 1) * CELL + 6, true);
  s = run(s, { mx: 0, my: 1 }, 200);
  assert.equal(s.climbing, false); assert.equal(s.y, 10 * CELL, '部屋の床に立つ'); assert.ok(s.onGround);
  s = run(s, { mx: -1, my: 0 }, 120);
  assert.ok(s.x >= 6 * CELL && s.x < 6 * CELL + 8, '左の壁で止まる: ' + s.x);
  s = run(s, { mx: 1, my: 0 }, 600);
  assert.ok(s.x > 27 * CELL, '通路・坂を通って奥の部屋へ: ' + s.x);
  assert.equal(s.y, 13 * CELL, '坂を下りた先の床');
  // 坂を登って戻る
  s = run(s, { mx: -1, my: 0 }, 260);
  assert.equal(s.y, 10 * CELL, '坂を登って上の床へ');
  // 入口の下で ↑：跳びついて縦穴を登り、地上へ
  s = run(s, { mx: -1, my: 0 }, 600);
  s.x = d.entrance.x * CELL + 8;
  let exit = false;
  for (let i = 0; i < 600 && !exit; i++) { s = stepSide(s, { mx: 0, my: -1 }, STEP_DT, q); exit = s.exit; }
  assert.ok(exit, '入口から出られる');
});

test('巣の中のジャンプ：天井で頭を打つ・同じ入力なら同じ結果', () => {
  const d = plainNest();
  const q = nestQuery(d);
  let s = makeSideState(7 * CELL + 8, 10 * CELL);
  let minY = s.y;
  for (let i = 0; i < 40; i++) { s = stepSide(s, { mx: 0, my: 0, jump: i === 0 }, STEP_DT, q); minY = Math.min(minY, s.y); }
  assert.ok(minY >= 7 * CELL + 12, '天井（行 7 の上）より上に頭が出ない: ' + minY);
  const a = [], b = [];
  let s1 = makeSideState(7 * CELL + 8, 10 * CELL), s2 = makeSideState(7 * CELL + 8, 10 * CELL);
  for (let i = 0; i < 90; i++) { const inp = { mx: i % 40 < 20 ? 1 : -1, my: 0, jump: i % 30 === 0 }; s1 = stepSide(s1, inp, STEP_DT, q); s2 = stepSide(s2, inp, STEP_DT, q); a.push(s1.x, s1.y); b.push(s2.x, s2.y); }
  assert.deepEqual(a, b);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
void applyOp;
