// トビネズミMMO Ver.0.2「暮らし」：共有ルール（空腹・水分・体調の計算、昼夜の時計）と、オフライン版（OfflineBackend）の
// 食べる・飲む・眠る・夜の採集物・フレンド（NPC）・訪問の記録・セーブの移行（v1 → v2）。DOM なし。
import assert from 'node:assert/strict';
import { makeLife, normalizeLife, stepLife, isTired, moveMods, eatSeed, drink, lifeAlerts, lifeOut, LIFE, STAT_MAX } from '../tobinezumi/shared/life.js';
import { makeClock, dayPhase, periodOf, timeOfDay, respawnScale, worldMs, DAY_MS, HOUR_MS, NIGHT_EXTRA, NIGHT_SPAWN_MS } from '../tobinezumi/shared/daynight.js';
import { stepField, makeFieldState, STEP_DT, TIRED_SPEED } from '../tobinezumi/shared/move.js';
import { buildFieldMap, nearWater, nightSpawnPoints, resourceSpawnPoints, T, TILE, tileAt, canDigBurrow } from '../tobinezumi/shared/regions.js';
import { objectsWithFixtures, CELL } from '../tobinezumi/shared/nest-rules.js';
import { OfflineBackend, SAVE_KEY, SAVE_VERSION, NPCS } from '../tobinezumi/client/net.js';
import { countItem } from '../tobinezumi/shared/items.js';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
function makeLS(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const map = buildFieldMap();
const MIDNIGHT = DAY_MS * 1_200_000, NOON = MIDNIGHT + 12 * HOUR_MS;
console.log('tobinezumi-life (Ver.0.2)');

// ───────── 共有ルール：暮らし ─────────
await test('暮らし：満タンから 0 まで 空腹 25 分・水分 20 分・体調 40 分（起きている間）。0 で止まる', () => {
  const L = { hunger: 100, thirst: 100, cond: 100, sleep: false };
  const a = stepLife(L, 60);
  assert.ok(near(a.hunger, 100 - 100 * 60 / (25 * 60)) && near(a.thirst, 100 - 100 * 60 / (20 * 60)) && near(a.cond, 100 - 100 * 60 / (40 * 60)));
  assert.ok(near(stepLife(L, 25 * 60).hunger, 0));
  assert.ok(near(stepLife(L, 20 * 60).thirst, 0));
  const z = stepLife(L, 3 * 3600);
  assert.deepEqual([z.hunger, z.thirst, z.cond], [0, 0, 0], '0 で止まる（死なない）');
  assert.deepEqual(stepLife(L, 0), L); assert.deepEqual(stepLife(L, -5), L);
  assert.equal(L.hunger, 100, '元の値は書き換えない');
});
await test('暮らし：空腹・水分が 0 だと体調が早く減る（1 つにつき 10 分で 0 の速さ）', () => {
  const one = stepLife({ hunger: 0, thirst: 80, cond: 100 }, 60), two = stepLife({ hunger: 0, thirst: 0, cond: 100 }, 60);
  assert.ok(near(one.cond, 100 - 100 * 60 / LIFE.COND_SEC - 100 * 60 / LIFE.STARVE_SEC));
  assert.ok(near(two.cond, 100 - 100 * 60 / LIFE.COND_SEC - 2 * 100 * 60 / LIFE.STARVE_SEC));
});
await test('眠る：体調 0 → 100 が 45 秒・満タンで自然に起きる・その間は空腹と水分が 2 倍で減る（早回し）', () => {
  let L = { hunger: 80, thirst: 80, cond: 0, sleep: true };
  L = stepLife(L, 20, { sleeping: true });
  assert.ok(near(L.cond, 100 * 20 / 45)); assert.equal(L.sleep, true);
  assert.ok(near(L.hunger, 80 - 100 * 20 / LIFE.HUNGER_SEC * 2));
  L = stepLife(L, 30, { sleeping: true });
  assert.equal(L.cond, STAT_MAX); assert.equal(L.sleep, false, '満タンで起きる');
  // おなかが空っぽだと眠りが浅い（半分の速さ）
  const e = stepLife({ hunger: 0, thirst: 50, cond: 0 }, 10, { sleeping: true });
  assert.ok(e.cond > 0 && e.cond < 100 * 10 / 45);
});
await test('食べる・飲む・へとへと・知らせ・壊れた値', () => {
  assert.equal(eatSeed({ hunger: 90, thirst: 0, cond: 0 }).hunger, 100, '100 で止まる');
  assert.equal(eatSeed(makeLife()).hunger, 80 + LIFE.SEED_FOOD);
  assert.equal(drink(makeLife()).thirst, Math.min(100, 80 + LIFE.WATER_DRINK));
  assert.equal(drink(makeLife(), LIFE.DEW_DRINK).thirst, 80 + LIFE.DEW_DRINK);
  assert.equal(isTired({ cond: 24.9 }), true); assert.equal(isTired({ cond: 25 }), false);
  assert.deepEqual(moveMods({ cond: 10 }), { tired: true }); assert.equal(moveMods({ cond: 90 }), null);
  assert.equal(LIFE.TIRED_SPEED, TIRED_SPEED, 'move.js と同じ値');
  const al = lifeAlerts({ hunger: 31, thirst: 31, cond: 26 }, { hunger: 29, thirst: 29, cond: 24 });
  assert.equal(al.length, 3);
  assert.deepEqual(normalizeLife(null), makeLife());
  assert.deepEqual(normalizeLife({ hunger: 'x', thirst: 500, cond: -3 }), { hunger: 80, thirst: 100, cond: 0, sleep: false });
  assert.deepEqual(lifeOut({ hunger: 1.23456, thirst: 2, cond: 3, sleep: 1 }), { hunger: 1.23, thirst: 2, cond: 3, sleep: true });
});
await test('へとへとの移動：跳ねる速さ ×0.7・大ジャンプしない（stepField の mods）', () => {
  const s0 = makeFieldState(map.spawn.x, map.spawn.y);
  let a = s0, b = s0;
  for (let i = 0; i < 30; i++) { a = stepField(a, { mx: 1, my: 0 }, STEP_DT, map); b = stepField(b, { mx: 1, my: 0 }, STEP_DT, map, { tired: true }); }
  assert.ok(near((b.x - s0.x) / (a.x - s0.x), TIRED_SPEED, 0.01));
  assert.equal(stepField(s0, { mx: 1, jump: true }, STEP_DT, map, { tired: true }).jump, null);
  assert.ok(stepField(s0, { mx: 1, jump: true }, STEP_DT, map).jump, '元気なら跳べる');
});

// ───────── 共有ルール：昼夜 ─────────
await test('昼夜：24 分で 1 日・夜 19〜5 時・明け方・昼 7〜17 時・夕方。暗さと色味', () => {
  const c = makeClock();
  assert.equal(DAY_MS, 24 * 60 * 1000);
  assert.equal(dayPhase(c, MIDNIGHT), 0);
  assert.equal(periodOf(dayPhase(c, MIDNIGHT)), 'night');
  assert.equal(periodOf(dayPhase(c, MIDNIGHT + 6 * HOUR_MS)), 'dawn');
  assert.equal(periodOf(dayPhase(c, NOON)), 'day');
  assert.equal(periodOf(dayPhase(c, MIDNIGHT + 18 * HOUR_MS)), 'dusk');
  assert.equal(periodOf(dayPhase(c, MIDNIGHT + 22 * HOUR_MS)), 'night');
  assert.equal(HOUR_MS, 60000, '1 時間 = 実時間 1 分');
  const day = timeOfDay(dayPhase(c, NOON)), night = timeOfDay(0), dusk = timeOfDay(18 / 24);
  assert.equal(day.dark, 0); assert.ok(night.dark > 0.6); assert.ok(dusk.dark > 0 && dusk.dark < night.dark);
  assert.equal(night.moon, true); assert.equal(day.moon, false);
  assert.equal(day.label, '12:00'); assert.equal(night.name, '夜');
  // 境目でとびはねない
  for (const h of [5, 7, 17, 19]) { const a = timeOfDay((h - 0.01) / 24).dark, b = timeOfDay((h + 0.01) / 24).dark; assert.ok(Math.abs(a - b) < 0.02, h + '時'); }
});
await test('昼夜：早回しと開始時刻（開発用）・再出現の倍率（夜は早い）', () => {
  const now = NOON;
  const c = makeClock({ scale: 60, startHour: 22, now });
  assert.ok(near(dayPhase(c, now) * 24, 22));
  assert.ok(near(dayPhase(c, now + 1000) * 24, 23), '60 倍：実 1 秒で 1 時間');
  const c2 = makeClock({ scale: 10, now });
  assert.ok(near(dayPhase(c2, now), dayPhase(makeClock(), now)), '開始時刻を決めなければ、今の時刻から速く進む');
  assert.equal(worldMs(makeClock(), 1234), 1234);
  assert.equal(respawnScale(0), 0.45); assert.equal(respawnScale(0.5), 1.4); assert.equal(respawnScale(6 / 24), 0.75);
});
await test('地図：水を飲める場所（水のタイルの 20px 以内）・夜の物の出現点', () => {
  assert.equal(nearWater(map, map.spawn.x, map.spawn.y), false);
  let found = false;
  for (let ty = 0; ty < map.h && !found; ty++) for (let tx = 0; tx < map.w && !found; tx++) if (tileAt(map, tx, ty) === T.WATER) found = nearWater(map, tx * TILE + 8, (ty + 1) * TILE + 8);
  assert.ok(found);
  const pts = nightSpawnPoints(resourceSpawnPoints(map));
  assert.ok(pts.filter(p => p.kind === 'dew').length > 100 && pts.filter(p => p.kind === 'seed').length > 20);
  assert.equal(pts.filter(p => p.kind === 'pebble').length, 0);
});

// ───────── オフライン版 ─────────
async function newGame(opts = {}) {
  const ls = opts.ls || makeLS();
  const clock = opts.clock || { t: NOON };
  const net = new OfflineBackend({ storage: ls, now: () => clock.t, npc: opts.npc ?? false, map, random: () => 0.3, ...opts.net });
  if (!net.save || !net.save.character) { await net.login('local'); await net.createCharacter({ name: 'ぴょん', fur: 'sand' }); }
  const j = await net.joinField();
  return { ls, clock, net, j };
}
const run = (G, secs) => { for (let i = 0; i < secs * 60; i++) { G.clock.t += 1000 / 60; G.net.tick(STEP_DT); } };

await test('オフライン：遊んでいる間だけ減る・タイトル（place none）では減らない・life イベント', async () => {
  const G = await newGame();
  assert.deepEqual(G.j.world.life, { hunger: 80, thirst: 80, cond: 100, sleep: false });
  const ev = []; G.net.on('life', m => ev.push(m.life));
  run(G, 30);
  assert.ok(near(G.net.life.hunger, 80 - 100 * 30 / LIFE.HUNGER_SEC, 0.05), String(G.net.life.hunger));
  assert.ok(ev.length >= 50, 'life は 0.5 秒ごと');
  await G.net.logout();
  const h = G.net.life.hunger;
  run(G, 30);
  assert.equal(G.net.life.hunger, h, 'ログアウト中は減らない');
});
await test('オフライン：?timescale=60 で 60 倍に減る・時計も 60 倍', async () => {
  const G = await newGame({ net: { timeScale: 60, startHour: 20 } });
  assert.ok(near(dayPhase(G.net.clock, G.clock.t) * 24, 20));
  run(G, 10);
  assert.ok(near(G.net.life.hunger, 80 - 100 * 600 / LIFE.HUNGER_SEC, 0.1));
  assert.ok(near(dayPhase(G.net.clock, G.clock.t) * 24, 6, 0.01), '10 秒で 10 時間');
});
await test('オフライン：食べる（持ち物の種子）・水場で飲む・夜露を飲む・昼に乾く', async () => {
  const G = await newGame({ clock: { t: MIDNIGHT } });
  const n = G.net;
  n.save.player.life.hunger = 40;
  const seeds = countItem(n.save.player.inv, 'seed');
  const e = await n.eat();
  assert.equal(e.ok, true); assert.equal(e.life.hunger, 40 + LIFE.SEED_FOOD); assert.equal(e.left, seeds - 1);
  n.save.player.life.thirst = 10;
  n.auth = makeFieldState(map.spawn.x, map.spawn.y);
  assert.equal((await n.drink()).ok, false);
  // 夜：夜露が出る
  const spawned = []; n.on('res_spawn', m => spawned.push(m.res));
  for (let i = 0; i < 25; i++) { G.clock.t += NIGHT_SPAWN_MS; n.nightTick(G.clock.t); }
  assert.equal(spawned.filter(r => r.kind === 'dew').length, NIGHT_EXTRA.dew);
  const dew = spawned.find(r => r.kind === 'dew');
  n.auth = makeFieldState(dew.x + 4, dew.y);
  assert.equal((await n.pickup(dew.id)).ok, false, '夜露は拾えない');
  const d = await n.drink(dew.id);
  assert.equal(d.ok, true, d.reason); assert.equal(d.life.thirst, 10 + LIFE.DEW_DRINK);
  // 昼：残りは乾く
  const gone = []; n.on('res_gone', m => gone.push(m));
  G.clock.t = NOON + DAY_MS; n.nightTick(G.clock.t);
  assert.equal(gone.filter(m => m.by === 0).length, NIGHT_EXTRA.dew - 1);
  assert.equal(n.save.world.resources.filter(r => r.kind === 'dew').length, 0);
});
await test('オフライン：眠る（自分の巣の寝床の上だけ）→ 体調が戻り自然に起きる → 保存', async () => {
  const G = await newGame();
  const n = G.net;
  let spot = null;
  for (let ty = 6; ty < map.h - 6 && !spot; ty++) for (let tx = 6; tx < map.w - 6 && !spot; tx++) { const x = tx * TILE + 8, y = ty * TILE + 8; if (Math.hypot(x - map.spawn.x, y - map.spawn.y) > 160 && canDigBurrow(map, x, y, n._entrances()).ok) spot = { x, y }; }
  n.auth = makeFieldState(spot.x, spot.y);
  const dg = await n.digBurrow(); assert.ok(dg.ok);
  const en = await n.enterNest(dg.entrance.owner); assert.ok(en.ok);
  const room = en.nest.data.rooms[0];
  const sk = await n.nestOp(en.nest.id, en.nest.rev, { op: 'set-kind', id: room.id, kind: 'bed' });
  assert.ok(sk.ok, sk.reason);
  const b = objectsWithFixtures(sk.data).find(o => o.type === 'nestbed');
  n.nestMove({ x: (b.x + 6) * CELL, y: (b.y + 1) * CELL, anim: 'idle' });
  assert.equal((await n.sleep()).ok, false, '寝床から遠い');
  n.nestMove({ x: (b.x + 1) * CELL, y: (b.y + 1) * CELL, anim: 'idle' });
  n.save.player.life.cond = 0;
  const s = await n.sleep();
  assert.equal(s.ok, true, s.reason);
  const ev = []; n.on('life', m => ev.push(m.life));
  run(G, 46);
  assert.equal(n.sleeping, false); assert.ok(n.life.cond > 99);
  assert.ok(ev.some(l => !l.sleep && l.cond >= 99.9), '起きた知らせ');
  n._savePos(); n.flush();
  const saved = JSON.parse(G.ls.getItem(SAVE_KEY));
  assert.equal(saved.v, SAVE_VERSION); assert.ok(saved.player.life.cond > 99);
});
await test('オフライン：セーブの移行 v1 → v2 → v3（持ち物・巣はそのまま、暮らしの数値・フレンド・訪問の記録を足す）', async () => {
  const v1 = { v: 1, account: { id: 'local', username: 'local', createdAt: 1 }, character: { id: 'c1', name: 'むかし', fur: 'white', createdAt: 1, individual: { genes: { fur: 'white' } } },
    player: { x: map.spawn.x, y: map.spawn.y, dir: 'down', inv: [{ id: 'seed', n: 9 }, null], nestId: null, place: 'field', savedAt: 1 }, nests: {}, entrances: [], world: null };
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(v1), dannoura_save: 'keep' });
  const n = new OfflineBackend({ storage: ls, now: () => NOON, npc: false, map });
  assert.equal(n.save.v, SAVE_VERSION);
  assert.deepEqual(n.save.player.life, makeLife());
  assert.deepEqual(n.save.friends, []); assert.deepEqual(n.save.visits, []);
  assert.equal(countItem(n.save.player.inv, 'seed'), 9, '持ち物は残る');
  const j = await n.joinField();
  assert.equal(j.world.you.name, 'むかし'); assert.equal(j.world.life.cond, 100);
  const saved = JSON.parse(ls.getItem(SAVE_KEY));
  assert.equal(saved.v, SAVE_VERSION); assert.equal(ls.getItem('dannoura_save'), 'keep');
  // 壊れた life でも読める
  saved.player.life = { hunger: 'abc', cond: 999 };
  const n2 = new OfflineBackend({ storage: makeLS({ [SAVE_KEY]: JSON.stringify(saved) }), now: () => NOON, npc: false, map });
  assert.deepEqual(n2.save.player.life, { hunger: 80, thirst: 80, cond: 100, sleep: false });
});
await test('オフライン：フレンドは NPC（申請 → 少しして受けてくれる）・「フレンドだけ」の巣（リコ）に入れる・訪問の記録', async () => {
  const G = await newGame({ npc: true });
  const n = G.net;
  assert.equal((await n.friendRequest('だれか')).ok, false);
  assert.equal((await n.setBuilders(['モカ'])).ok, false, '共同作業者はオンラインだけ');
  const r = await n.friendRequest('リコ');
  assert.equal(r.ok, true); assert.equal(r.state, 'outgoing');
  const riko = NPCS.find(x => x.name === 'リコ');
  const ent = n._entrances().find(e => e.owner === riko.id);
  n.auth = makeFieldState(ent.x, ent.y + 4);
  assert.equal((await n.enterNest(riko.id)).ok, false, 'まだフレンドではない');
  await new Promise(res => n.on('friends', res));
  const f = (await n.friends()).list.find(x => x.id === riko.id);
  assert.equal(f.state, 'friend'); assert.equal(f.online, true); assert.ok(f.nest);
  n.auth = makeFieldState(ent.x, ent.y + 4);
  const en = await n.enterNest(riko.id);
  assert.equal(en.ok, true, en.reason); assert.equal(en.nest.canEdit, false);
  await n.leaveNest();
  // 自分の巣を「フレンドだけ」にすると、NPC のフレンドが訪ねてくる
  let spot = null;
  for (let ty = 6; ty < map.h - 6 && !spot; ty++) for (let tx = 6; tx < map.w - 6 && !spot; tx++) { const x = tx * TILE + 8, y = ty * TILE + 8; if (Math.hypot(x - map.spawn.x, y - map.spawn.y) > 160 && canDigBurrow(map, x, y, n._entrances()).ok) spot = { x, y }; }
  n.auth = makeFieldState(spot.x, spot.y);
  assert.ok((await n.digBurrow()).ok);
  await n.setVisitPolicy('friends');
  const visits = []; n.on('visit', m => visits.push(m));
  run(G, 430);
  assert.ok(visits.length >= 1 && visits[0].name === 'リコ', JSON.stringify(visits));
  assert.ok((await n.visitors()).list.length >= 1);
  // 留守のあいだの訪問：次に遊ぶとき一覧で 1 回
  n._savePos(); n.flush();
  const later = { t: G.clock.t + 3600 * 1000 };
  const n2 = new OfflineBackend({ storage: G.ls, now: () => later.t, npc: true, map, random: () => 0.3 });
  const j2 = await n2.joinField();
  assert.ok(j2.world.visitors.some(v => v.name === 'リコ'), JSON.stringify(j2.world.visitors));
  const j3 = await n2.joinField();
  assert.equal(j3.world.visitors.length, 0, '見せたら既読');
  assert.ok(j2.world.friends.some(x => x.name === 'リコ' && x.state === 'friend'), 'フレンドは保存される');
  n2.npcs = [];
});

console.log(`\ntobinezumi-life: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
