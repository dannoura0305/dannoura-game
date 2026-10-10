// トビネズミMMO：共有コード（shared/move.js・regions.js・items.js・protocol.js）のテスト。ブラウザとサーバーで同じ結果になること
import assert from 'node:assert/strict';
import { buildFieldMap, T, TILE, tileAt, isBlocking, initialResources, resourceSpawnPoints, canDigBurrow, regionAt, pickRespawnPoint } from '../tobinezumi/shared/regions.js';
import { stepField, makeFieldState, boxFree, jumpLanding, STEP_DT, FIELD } from '../tobinezumi/shared/move.js';
import { makeInventory, addItem, removeItem, countItem, canAdd, swapSlots, payCost, halfCost, STACK_MAX, INV_SLOTS, normalizeInventory } from '../tobinezumi/shared/items.js';
import { cleanChat, validName, validUsername, validPassword, C2S, S2C, FUR_IDS, encode, decode } from '../tobinezumi/shared/protocol.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const map = buildFieldMap();

/** 地図の上で、まわりに何もない地点と、指定タイルを置いた小さな試験用地図 */
function testMap(put = {}) {
  const w = 20, h = 12;
  const tiles = new Uint8Array(w * h).fill(T.SAND), ground = new Uint8Array(w * h).fill(T.SAND);
  for (const k in put) { const [x, y] = k.split(',').map(Number); tiles[y * w + x] = put[k]; }
  return { w, h, tile: TILE, tiles, ground, seed: 1, spawn: { x: 8, y: 8 }, pxW: w * TILE, pxH: h * TILE };
}
const cx = tx => tx * TILE + 8;

test('地図：96×64、同じ種なら同じ地図（サーバーとクライアントで一致）', () => {
  const m2 = buildFieldMap();
  assert.equal(map.w, 96); assert.equal(map.h, 64);
  assert.deepEqual([...map.tiles], [...m2.tiles]);
  const kinds = new Set(map.tiles);
  for (const k of [T.SAND, T.DIRT, T.GRASS, T.ROCK, T.SHRUB, T.STONES, T.WATER, T.TREE]) assert.ok(kinds.has(k), 'タイル ' + k + ' がある');
  assert.ok(!isBlocking(map, Math.floor(map.spawn.x / TILE), Math.floor(map.spawn.y / TILE)), '出発点は通れる');
  assert.equal(tileAt(map, -1, 0), -1); assert.ok(isBlocking(map, -1, 5), '地図の外は通れない');
  assert.ok(['かれくさの原', 'ゆうやけ砂漠', 'オアシスのほとり', 'いわかげの丘'].includes(regionAt(map, map.spawn.x, map.spawn.y).name));
});

test('採集物：出現点は通れる場所・種類は 3 つ・最初の配置は決まった順', () => {
  const pts = resourceSpawnPoints(map);
  assert.ok(pts.length > 100);
  for (const p of pts) assert.ok(!isBlocking(map, Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
  const a = initialResources(map, 60), b = initialResources(map, 60);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map(r => r.id)).size, 60);
  assert.deepEqual(new Set(a.map(r => r.kind)), new Set(['seed', 'grass', 'pebble']));
  const r = pickRespawnPoint(pts, 'seed', a, () => 0.5);
  assert.equal(r.kind, 'seed');
  assert.ok(!a.some(o => Math.abs(o.x - r.x) < 12 && Math.abs(o.y - r.y) < 12), '再出現はほかと重ならない');
});

test('小跳躍：押している間進み、跳ねの高さ z が出る。岩・低木には入れない', () => {
  const m = testMap({ '10,5': T.ROCK });
  let s = makeFieldState(cx(5), cx(5));
  let maxZ = 0;
  for (let i = 0; i < 120; i++) { s = stepField(s, { mx: 1, my: 0 }, STEP_DT, m); maxZ = Math.max(maxZ, s.z); }
  assert.ok(maxZ > 2 && maxZ <= FIELD.HOP_H + 0.01, 'z ' + maxZ);
  assert.ok(s.x < 10 * TILE - FIELD.BW + 0.01, '岩の手前で止まる: ' + s.x);
  assert.ok(s.x > cx(8), '進んでいる');
  assert.equal(s.dir, 'right');
  // 手を離すと 1 跳ねを終えて止まる
  for (let i = 0; i < 30; i++) s = stepField(s, { mx: 0, my: 0 }, STEP_DT, m);
  assert.equal(s.anim, 'idle'); assert.equal(s.z, 0);
});

test('斜めの速さは同じ（正規化）・決まった入力列なら決まった結果', () => {
  const m = testMap();
  const run = (mx, my) => { let s = makeFieldState(cx(10), cx(6)); for (let i = 0; i < 30; i++) s = stepField(s, { mx, my }, STEP_DT, m); return s; };
  const a = run(1, 0), d = run(1, 1);
  const da = Math.hypot(a.x - cx(10), a.y - cx(6)), dd = Math.hypot(d.x - cx(10), d.y - cx(6));
  assert.ok(Math.abs(da - dd) < 0.01);
  assert.deepEqual(run(1, 1), run(1, 1));
});

test('大ジャンプ：4 タイル先へ・低木と小石の山は越える・岩は越えない・クールダウン 1.2 秒', () => {
  const m = testMap({ '7,5': T.SHRUB, '8,5': T.STONES });
  let s = makeFieldState(cx(5), cx(5) + 4); s.fx = 1; s.fy = 0; s.dir = 'right';
  s = stepField(s, { mx: 0, my: 0, jump: true }, STEP_DT, m);
  assert.ok(s.jump); assert.equal(s.cd, FIELD.JUMP_CD);
  let maxZ = 0;
  while (s.jump) { s = stepField(s, { mx: -1, my: 0, jump: true }, STEP_DT, m); maxZ = Math.max(maxZ, s.z); }
  assert.ok(Math.abs(s.x - (cx(5) + 4 * TILE)) < 0.01, '低木・小石を越えて 4 タイル先: ' + s.x);
  assert.ok(maxZ > FIELD.JUMP_H * 0.9, '高く跳ぶ');
  // クールダウン中はもう一度跳べない
  const again = stepField(s, { mx: 0, my: 0, jump: true }, STEP_DT, m);
  assert.equal(again.jump, null);
  // 岩は越えられない：手前に着地
  const m2 = testMap({ '7,5': T.ROCK });
  const l = jumpLanding(m2, cx(5), cx(5) + 4, 1, 0);
  assert.ok(l.x < 7 * TILE, '岩の手前: ' + l.x);
  assert.ok(boxFree(m2, l.x, l.y));
  // 着地点が塞がっていれば手前に縮める（低木の上には着地しない）
  const m3 = testMap({ '9,5': T.SHRUB });
  const l3 = jumpLanding(m3, cx(5), cx(5) + 4, 1, 0);
  assert.ok(boxFree(m3, l3.x, l3.y) && l3.d < FIELD.JUMP_DIST);
});

test('巣穴を掘れる場所：水場・混みあい・ほかの巣の近く・通り道はだめ', () => {
  const m = testMap({ '3,3': T.WATER, '15,8': T.SHRUB });
  m.spawn = { x: cx(18), y: cx(10) };
  assert.equal(canDigBurrow(m, cx(4), cx(4)).ok, false);
  assert.match(canDigBurrow(m, cx(4), cx(4)).reason, /水場/);
  assert.match(canDigBurrow(m, cx(15), cx(7)).reason, /混み/);
  assert.equal(canDigBurrow(m, cx(9), cx(6)).ok, true);
  assert.match(canDigBurrow(m, cx(9), cx(6), [{ x: cx(10), y: cx(6) }]).reason, /ほかの巣/);
  assert.match(canDigBurrow(m, cx(17), cx(9)).reason, /通り道/);
});

test('持ち物：8 枠×99・あふれ・取り出し・並べ替え・費用', () => {
  const inv = makeInventory();
  assert.equal(inv.length, INV_SLOTS);
  assert.equal(addItem(inv, 'seed', 150), 150);
  assert.equal(inv[0].n, STACK_MAX); assert.equal(inv[1].n, 51);
  assert.equal(addItem(inv, 'grass', 99 * 7), 99 * 6, '空いた 6 枠に入る分だけ');
  assert.equal(canAdd(inv, 'pebble', 1), false);
  assert.equal(removeItem(inv, 'seed', 200), false, '足りなければ何もしない');
  assert.equal(countItem(inv, 'seed'), 150);
  assert.ok(removeItem(inv, 'seed', 60));
  assert.equal(countItem(inv, 'seed'), 90);
  const inv2 = makeInventory(undefined, [{ id: 'seed', n: 3 }, { id: 'grass', n: 2 }]);
  swapSlots(inv2, 0, 1); assert.equal(inv2[0].id, 'grass');
  inv2[2] = { id: 'grass', n: 5 }; swapSlots(inv2, 2, 0); assert.equal(inv2[0].n, 7); assert.equal(inv2[2], null, '同じ物はまとめる');
  assert.equal(payCost(inv2, { grass: 8 }), false);
  assert.ok(payCost(inv2, { grass: 7, seed: 1 }));
  assert.deepEqual(halfCost({ pebble: 3, grass: 1 }), { pebble: 1 });
  assert.deepEqual(halfCost({ pebble: 1, grass: 1 }), { pebble: 1 }, '最低 1 つは戻る');
  assert.deepEqual(normalizeInventory([{ id: 'seed', n: 500 }, { bad: 1 }, null]).slice(0, 2), [{ id: 'seed', n: 99 }, null]);
});

test('通信の形：メッセージ型・名前・チャットの整形', () => {
  assert.equal(new Set(Object.values(C2S)).size, Object.values(C2S).length, 'C2S の型は重複しない');
  assert.equal(new Set(Object.values(S2C)).size, Object.values(S2C).length);
  assert.deepEqual(decode(encode({ t: C2S.CHAT, text: 'やあ' })), { t: 'chat', text: 'やあ' });
  assert.equal(decode('{bad'), null); assert.equal(decode('{"x":1}'), null);
  assert.equal(cleanChat('  こんにちは\u0007 '), 'こんにちは');
  assert.equal(cleanChat('あ'.repeat(200)).length, 80);
  assert.equal(validName(''), 'なまえを入れてね'); assert.equal(validName('そらとび'), null); assert.ok(validName('あ'.repeat(11)));
  assert.equal(validUsername('ab'), 'ユーザー名は 3〜16 文字'); assert.equal(validUsername('jerboa_01'), null); assert.ok(validUsername('トビ'));
  assert.ok(validPassword('1234567')); assert.equal(validPassword('12345678'), null);
  assert.deepEqual(FUR_IDS, ['sand', 'cream', 'rufous', 'graybrown', 'white']);
});

test('毛色の ID は素材の manifest（fur.order）と同じ（素材があれば）', () => {
  let man = null;
  try { man = JSON.parse(readFileSync(new URL('../tobinezumi/assets/manifest.json', import.meta.url), 'utf8')); } catch (e) { man = null; }
  if (!man || !man['fur.order']) return;
  assert.deepEqual(man['fur.order'], FUR_IDS);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
