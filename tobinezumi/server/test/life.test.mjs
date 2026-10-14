// トビネズミ サーバー：Ver.0.2「暮らし」— 空腹・水分・体調（サーバーが正）、昼夜と採集物、共同作業者、フレンド、訪問の通知、
// 再起動しても暮らしの数値が残ること（ログアウト中は減らない）。ws は使わない（偽の接続）。
import assert from 'node:assert/strict';
import { test, done, makeGame, FakeClient, findDigSpot, tempDir, rmDir } from './harness.mjs';
import { countItem } from '../../shared/items.js';
import { TILE, T, tileAt, nearWater } from '../../shared/regions.js';
import { objectsWithFixtures, CELL } from '../../shared/nest-rules.js';
import { LIFE, STAT_MAX } from '../../shared/life.js';
import { DAY_MS, HOUR_MS, dayPhase, periodOf, NIGHT_EXTRA, NIGHT_SPAWN_MS } from '../../shared/daynight.js';
import { FRIEND_OPS_PER_MIN } from '../../shared/protocol.js';

console.log('tobinezumi server life / social (Ver.0.2)');
const MIDNIGHT = DAY_MS * 1_200_000;           // 0 時ちょうど（scale 1・origin 0）
const NOON = MIDNIGHT + 12 * HOUR_MS;

async function withNest(H, user, name = user.slice(0, 10), skip = 0) {
  const c = new FakeClient(H.game);
  await c.enter(user, 'password123', name);
  const spot = findDigSpot(H.game.map, [...H.game.field.entrances.values()], skip);
  c.place(spot.x, spot.y);
  const d = await c.req('dig_burrow', {});
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}
async function enterNest(c, owner) {
  c.place(owner.ent.x, owner.ent.y + 10);
  return c.req('enter_nest', { owner: owner.account.id });
}
/** 水辺の立てる場所（水のタイルの隣） */
function waterSpot(map) {
  for (let ty = 2; ty < map.h - 2; ty++) for (let tx = 2; tx < map.w - 2; tx++) {
    if (tileAt(map, tx, ty) !== T.WATER || tileAt(map, tx, ty + 1) === T.WATER || tileAt(map, tx, ty + 1) !== map.ground[(ty + 1) * map.w + tx]) continue;
    const x = tx * TILE + 8, y = (ty + 1) * TILE + 10;
    if (nearWater(map, x, y)) return { x, y };
  }
  throw new Error('水辺が無い');
}
function bedPos(data) {
  const b = objectsWithFixtures(data).find(o => o.type === 'nestbed');
  return { x: (b.x + b.w / 2) * CELL, y: (b.y + b.h) * CELL };
}

await test('空腹・水分・体調：遊んでいる間だけ減る（25 分・20 分・40 分で 0）。0 でも死なず体調が下がる', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = new FakeClient(H.game); await a.enter('hungry');
  assert.deepEqual(a.world.life, { hunger: 80, thirst: 80, cond: 100, sleep: false });
  const p = a.player;
  for (let i = 0; i < 60; i++) { H.clock.t += 1000; H.game.tick(); }     // 60 秒
  assert.ok(Math.abs(p.life.hunger - (80 - 100 * 60 / LIFE.HUNGER_SEC)) < 0.05, 'hunger ' + p.life.hunger);
  assert.ok(Math.abs(p.life.thirst - (80 - 100 * 60 / LIFE.THIRST_SEC)) < 0.05, 'thirst ' + p.life.thirst);
  assert.ok(Math.abs(p.life.cond - (100 - 100 * 60 / LIFE.COND_SEC)) < 0.05, 'cond ' + p.life.cond);
  assert.ok(a.take('life').length >= 25, '2 秒ごとに life が届く');
  // 0 になっても死なない：体調が減って 0 で止まる
  p.life = { hunger: 0, thirst: 0, cond: 5, sleep: false };
  for (let i = 0; i < 300; i++) { H.clock.t += 1000; H.game.tick(); }
  assert.equal(p.life.cond, 0); assert.equal(p.life.hunger, 0);
  assert.ok(H.game.players.has(a.account.id), 'キャラは消えない');
  H.close(); rmDir(H.dir);
});

await test('食べる：種子を持っているときだけ・1 つ +15・満腹は断る・連打は rate', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = new FakeClient(H.game); await a.enter('eater');
  const seeds = countItem(a.player.inv, 'seed');
  a.player.life.hunger = 50;
  let r = await a.req('eat', { from: 'inv' });
  assert.equal(r.ok, true, r.reason); assert.equal(r.life.hunger, 50 + LIFE.SEED_FOOD);
  assert.equal(countItem(r.inv, 'seed'), seeds - 1);
  assert.equal(countItem(H.store.charInventory(a.player.charId), 'seed'), seeds - 1, 'DB にも保存');
  assert.equal((await a.req('eat', {})).code, 'rate', '0.4 秒あける');
  H.clock.t += 500;
  a.player.inv = a.player.inv.map(s => s && s.id === 'seed' ? null : s);
  assert.equal((await a.req('eat', {})).reason, '種子を持っていない');
  H.clock.t += 500;
  a.player.inv[0] = { id: 'seed', n: 3 }; a.player.life.hunger = STAT_MAX;
  assert.equal((await a.req('eat', {})).reason, 'おなかいっぱい');
  H.close(); rmDir(H.dir);
});

await test('飲む：水場のふちだけ（遠いと too_far）・夜露は夜だけ出て飲める（拾えない）・昼に乾く', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT } });
  const a = new FakeClient(H.game); await a.enter('drinker');
  a.player.life.thirst = 20;
  a.place(H.game.map.spawn.x, H.game.map.spawn.y);
  assert.equal((await a.req('drink', {})).code, 'too_far');
  const w = waterSpot(H.game.map);
  a.place(w.x, w.y);
  H.clock.t += 500;
  let r = await a.req('drink', {});
  assert.equal(r.ok, true, r.reason); assert.equal(r.src, 'water'); assert.equal(r.life.thirst, 20 + LIFE.WATER_DRINK);
  // 夜露
  H.game.field.nightTick(H.clock.t);
  const dew = [...H.game.field.resources.values()].find(x => x.kind === 'dew');
  assert.ok(dew, '夜は夜露が出る');
  a.place(dew.x + 40, dew.y); H.clock.t += 500;
  assert.equal((await a.req('drink', { resId: dew.id })).code, 'too_far');
  a.place(dew.x + 5, dew.y); H.clock.t += 500;
  assert.equal((await a.req('pickup', { resId: dew.id })).code, 'rule', '夜露は拾えない');
  r = await a.req('drink', { resId: dew.id });
  assert.equal(r.ok, true, r.reason); assert.equal(r.src, 'dew');
  assert.equal(H.game.field.resources.has(dew.id), false);
  // 昼になると残りの夜露は乾く
  for (let i = 0; i < 5; i++) { H.clock.t += NIGHT_SPAWN_MS; H.game.field.nightTick(H.clock.t); }
  const nDew = [...H.game.field.resources.values()].filter(x => x.kind === 'dew').length;
  assert.ok(nDew >= 1);
  H.clock.t = NOON + DAY_MS; a.inbox = [];
  H.game.field.nightTick(H.clock.t);
  assert.equal([...H.game.field.resources.values()].filter(x => x.kind === 'dew').length, 0);
  assert.equal(a.take('res_gone').filter(m => m.by === 0).length, nDew, '乾いたことがみんなに届く');
  H.close(); rmDir(H.dir);
});

await test('へとへと（体調 < 25）：跳ねるのが遅い・大ジャンプできない（サーバーの移動ルールに入っている）', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = new FakeClient(H.game); await a.enter('tired');
  const run = async (cond) => {
    const s = H.game.map.spawn; a.place(s.x, s.y); a.player.life.cond = cond; a.player.lastSeq = a.seq;
    a.inputs(new Array(30).fill({ mx: 1 }));
    H.clock.t += 600; H.game.field.drain(a.player);
    return a.player.st.x - s.x;
  };
  const fresh = await run(100), tired = await run(10);
  assert.ok(Math.abs(tired / fresh - LIFE.TIRED_SPEED) < 0.05, `fresh ${fresh} tired ${tired}`);
  a.place(H.game.map.spawn.x, H.game.map.spawn.y); a.player.life.cond = 10;
  a.inputs([{ mx: 1, jump: 1 }]); H.clock.t += 100; H.game.field.drain(a.player);
  assert.equal(a.player.st.jump, null, '大ジャンプしない');
  H.close(); rmDir(H.dir);
});

await test('眠る：自分の巣の寝床の上だけ・体調が 45 秒で戻り自然に起きる・ほかの子には眠る姿・フレンドでない子はよその寝床で眠れない', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = await withNest(H, 'sleeper', 'ねぼすけ');
  let e = await enterNest(a, a);
  assert.equal(e.ok, true);
  // 寝床が無い・地上では眠れない
  assert.equal((await a.req('sleep', {})).code, 'too_far');
  const room = e.nest.data.rooms[0];
  const sk = await a.req('nest_op', { nestId: e.nest.id, rev: e.nest.rev, op: { op: 'set-kind', id: room.id, kind: 'bed' } });
  assert.equal(sk.ok, true, sk.reason);
  const bed = bedPos(sk.data);
  a.send({ t: 'nest_move', x: bed.x + 80, y: bed.y, facing: 1, anim: 'idle' });
  assert.equal((await a.req('sleep', {})).reason, '寝床の上で眠ろう');
  H.clock.t += 200;
  a.send({ t: 'nest_move', x: bed.x, y: bed.y, facing: 1, anim: 'idle' });
  // 公開にして訪問者を呼ぶ
  await a.req('visit_policy', { policy: 'public' });
  const v = new FakeClient(H.game); await v.enter('guest', 'password123', 'おきゃく');
  assert.equal((await enterNest(v, a)).ok, true);
  a.player.life.cond = 0;
  const s = await a.req('sleep', {});
  assert.equal(s.ok, true, s.reason); assert.equal(s.life.sleep, true);
  const peers = v.last('nest_peers').peers.find(p => p.id === a.account.id);
  assert.equal(peers.anim, 'sleep', 'ほかの子には眠っている姿');
  // 訪問者（フレンドではない）はよその寝床では眠れない
  H.clock.t += 200;
  v.send({ t: 'nest_move', x: bed.x, y: bed.y, facing: 1, anim: 'idle' });
  assert.equal((await v.req('sleep', {})).code, 'forbidden');
  // 45 秒で全快 → 自然に起きる
  a.inbox = [];
  for (let i = 0; i < 44; i++) { H.clock.t += 1000; H.game.tick(); }
  assert.ok(a.player.life.cond > 90 && a.player.sleeping, 'cond ' + a.player.life.cond);
  for (let i = 0; i < 6; i++) { H.clock.t += 1000; H.game.tick(); }
  assert.equal(a.player.sleeping, false); assert.ok(a.player.life.cond > 99.5, "cond " + a.player.life.cond);
  assert.ok(a.take('life').some(m => m.life.sleep === false && m.life.cond === STAT_MAX), '起きたことが届く');
  assert.notEqual(v.last('nest_peers').peers.find(p => p.id === a.account.id).anim, 'sleep');
  // 動くと起きる
  a.player.life.cond = 50;
  assert.equal((await a.req('sleep', {})).ok, true);
  H.clock.t += 200;
  a.send({ t: 'nest_move', x: bed.x + 10, y: bed.y, facing: 1, anim: 'walk' });
  assert.equal(a.player.sleeping, false);
  // 眠っている間は空腹・水分が早く減る（早回し）
  a.player.life = { hunger: 80, thirst: 80, cond: 0, sleep: false };
  H.clock.t += 200; a.send({ t: 'nest_move', x: bed.x, y: bed.y, facing: 1, anim: 'idle' });
  assert.equal((await a.req('sleep', {})).ok, true);
  H.game._lifeAt = H.clock.t;
  for (let i = 0; i < 10; i++) { H.clock.t += 1000; H.game.tick(); }
  assert.ok(Math.abs(a.player.life.hunger - (80 - 100 * 10 / LIFE.HUNGER_SEC * LIFE.SLEEP_DRAIN)) < 0.05);
  H.close(); rmDir(H.dir);
});

await test('暮らしの数値は DB（individuals.status.life）に残る：再起動・ログアウト中は減らない', async () => {
  const dir = tempDir();
  let H = await makeGame({ dir, clock: { t: NOON } });
  let a = new FakeClient(H.game); await a.enter('keeper');
  a.player.life = { hunger: 42.5, thirst: 33, cond: 61, sleep: false };
  H.game.shutdown(); H.close();
  H.clock.t += 5 * 3600 * 1000;      // 5 時間後に起動
  H = await makeGame({ dir, clock: H.clock });
  a = new FakeClient(H.game); await a.enter('keeper');
  assert.deepEqual(a.world.life, { hunger: 42.5, thirst: 33, cond: 61, sleep: false });
  // ログアウト → しばらくして入っても同じ
  await a.req('logout'); H.clock.t += 3600 * 1000;
  const b = new FakeClient(H.game); await b.enter('keeper');
  assert.deepEqual(b.world.life, { hunger: 42.5, thirst: 33, cond: 61, sleep: false });
  H.close(); rmDir(dir);
});

await test('昼夜：時計はサーバー時刻から（24 分で 1 日・全員同じ）・夜は夜露と夜の種子が出る・戻りの待ちは夜が短い', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT } });
  const a = new FakeClient(H.game); await a.enter('owl');
  assert.deepEqual(a.world.clock, { scale: 1, origin: 0, base: 0 });
  assert.equal(periodOf(dayPhase(a.world.clock, H.clock.t)), 'night');
  assert.equal(periodOf(dayPhase(a.world.clock, H.clock.t + 12 * 60000)), 'day', '12 分後は昼');
  const base = H.store.resources().length;
  for (let i = 0; i < 25; i++) { H.clock.t += NIGHT_SPAWN_MS; H.game.tick(); }   // 2 分半（まだ夜）
  const night = H.store.resources();
  const dew = night.filter(r => r.id[0] === 'd').length, nseed = night.filter(r => r.id[0] === 'n').length;
  assert.equal(dew, NIGHT_EXTRA.dew); assert.equal(nseed, NIGHT_EXTRA.seed);
  assert.equal(night.length, base + dew + nseed);
  // 夜の種子は拾っても再出現待ちに積まない
  const ns = night.find(r => r.id[0] === 'n');
  a.place(ns.x, ns.y);
  const q0 = H.store.respawnQueue().length;
  assert.equal((await a.req('pickup', { resId: ns.id })).ok, true);
  assert.equal(H.store.respawnQueue().length, q0);
  // 再出現の待ち：夜 ×0.45、昼 ×1.4
  const pick = async () => {
    const r = [...H.game.field.resources.values()].find(x => x.id[0] === 'r');
    a.place(r.x, r.y); H.clock.t += 500;
    const ok = await a.req('pickup', { resId: r.id }); assert.equal(ok.ok, true, ok.reason);
    const q = H.store.respawnQueue(); return q[q.length - 1].at - H.clock.t;
  };
  const tNight = await pick();
  assert.ok(tNight <= 300000 * 0.45 + 1 && tNight >= 120000 * 0.45 - 1, 'night ' + tNight);
  H.clock.t = NOON + DAY_MS;
  H.game.tick();
  assert.equal(H.store.resources().filter(r => r.id[0] === 'd').length, 0, '昼は夜露が乾く');
  const extra = () => H.store.resources().filter(r => r.id[0] === 'd' || r.id[0] === 'n').length;
  const before = extra();
  for (let i = 0; i < 25; i++) { H.clock.t += NIGHT_SPAWN_MS; H.game.tick(); }
  assert.equal(extra(), before, '昼は夜の物が増えない');
  const tDay = await pick();
  assert.ok(tDay >= 120000 * 1.4 - 1 && tDay <= 300000 * 1.4 + 1, 'day ' + tDay);
  H.close(); rmDir(H.dir);
});

await test('開発用の早回し（timeScale 60）：時計・暮らしの減りが 60 倍', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { timeScale: 60, startHour: 22 } });
  const a = new FakeClient(H.game); await a.enter('fast');
  assert.equal(a.world.clock.scale, 60);
  assert.equal(periodOf(dayPhase(a.world.clock, H.clock.t)), 'night', '22 時から');
  assert.ok(Math.abs(dayPhase(a.world.clock, H.clock.t + 1000) * 24 - 23) < 0.01, '実時間 1 秒で 1 時間（ふだんは 1 分で 1 時間）');
  for (let i = 0; i < 10; i++) { H.clock.t += 1000; H.game.tick(); }
  assert.ok(Math.abs(a.player.life.hunger - (80 - 100 * 600 / LIFE.HUNGER_SEC)) < 0.1);
  H.close(); rmDir(H.dir);
});

await test('共同作業者：所有者が名前で任命 → 非公開の巣にも入れて編集できる（素材は本人持ち）・外すと nest_role で編集不可', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const o = await withNest(H, 'nestowner', 'あるじ');
  const b = new FakeClient(H.game); await b.enter('helper', 'password123', 'てつだい');
  const x = new FakeClient(H.game); await x.enter('outsider', 'password123', 'よそもの');
  assert.equal((await enterNest(b, o)).code, 'forbidden', '非公開');
  // 所有者だけが決められる
  assert.equal((await b.req('set_builders', { list: ['あるじ'] })).code, 'not_found', '巣の無い子は決められない');
  const sb = await o.req('set_builders', { list: ['てつだい', 'だれもいない'] });
  assert.equal(sb.ok, true); assert.deepEqual(sb.list, ['てつだい']); assert.deepEqual(sb.unknown, ['だれもいない']);
  assert.ok(b.take('toast').some(m => /共同作業者に なった/.test(m.text)));
  const oe = await enterNest(o, o);
  assert.deepEqual(oe.nest.builders, ['てつだい']); assert.equal(oe.nest.role, 'owner');
  const be = await enterNest(b, o);
  assert.equal(be.ok, true, be.reason); assert.equal(be.nest.canEdit, true); assert.equal(be.nest.role, 'builder'); assert.equal(be.nest.builders, undefined, '一覧は所有者だけ');
  // 共同作業者が編集：素材は共同作業者の持ち物から・所有者に nest_update
  const r0 = be.nest.data.rooms[0];
  const peb = countItem(b.player.inv, 'pebble'), opeb = countItem(o.player.inv, 'pebble');
  o.inbox = [];
  const op = await b.req('nest_op', { nestId: be.nest.id, rev: be.nest.rev, op: { op: 'room', x: r0.x + r0.w, y: r0.y, w: 4, h: 3 } });
  assert.equal(op.ok, true, op.reason);
  assert.equal(countItem(b.player.inv, 'pebble'), peb - 2); assert.equal(countItem(o.player.inv, 'pebble'), opeb);
  assert.equal(o.take('nest_update').length, 1);
  // 倉庫と訪問設定は所有者だけ
  assert.equal((await b.req('store', { nestId: be.nest.id, dir: 'withdraw', item: 'seed', n: 1 })).code, 'forbidden');
  // 共同作業者でない訪問者は編集できない
  await o.req('visit_policy', { policy: 'public' });
  const xe = await enterNest(x, o);
  assert.equal(xe.nest.canEdit, false);
  assert.equal((await x.req('nest_op', { nestId: xe.nest.id, rev: op.rev, op: { op: 'dig', x: 1, y: 5 } })).code, 'forbidden');
  // 外す → 中にいれば nest_role、編集は forbidden
  b.inbox = [];
  assert.equal((await o.req('set_builders', { list: [] })).ok, true);
  const role = b.take('nest_role');
  assert.equal(role.length, 1); assert.equal(role[0].canEdit, false);
  assert.equal((await b.req('nest_op', { nestId: be.nest.id, rev: op.rev, op: { op: 'dig', x: 1, y: 5 } })).code, 'forbidden');
  assert.equal((await o.req('set_builders', { list: new Array(11).fill('a') })).code, 'bad_request', '10 匹まで');
  H.close(); rmDir(H.dir);
});

await test('フレンド：名前で申請 → 相手に届く → 受ける → オンライン状態・巣の場所 → 「フレンドだけ」の巣に入れる → やめる・連打は rate', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = await withNest(H, 'friend_a', 'ミント');
  const b = new FakeClient(H.game); await b.enter('friend_b', 'password123', 'ココア');
  const c = new FakeClient(H.game); await c.enter('friend_c', 'password123', 'ラテ');
  assert.equal((await a.req('friend_req', { name: 'いないこ' })).code, 'not_found');
  assert.equal((await a.req('friend_req', { name: 'ミント' })).ok, false, '自分は不可');
  b.inbox = [];
  const r = await a.req('friend_req', { name: 'ココア' });
  assert.equal(r.ok, true, r.reason); assert.equal(r.state, 'outgoing'); assert.equal(r.list[0].state, 'outgoing');
  assert.equal((await a.req('friend_req', { name: 'ココア' })).reason, 'もう申請してある（返事待ち）');
  assert.ok(b.take('toast').some(m => /フレンド申請が来た/.test(m.text)));
  const pushed = b.last('friends');
  assert.equal(pushed.list[0].state, 'incoming'); assert.equal(pushed.list[0].name, 'ミント');
  a.inbox = [];
  const ok = await b.req('friend_ok', { id: a.account.id });
  assert.equal(ok.ok, true); assert.equal(ok.list[0].state, 'friend'); assert.equal(ok.list[0].online, true);
  assert.deepEqual(ok.list[0].nest, { x: a.ent.x, y: a.ent.y, region: 'plains' }, '巣の場所（Ver.0.5：土地も）');
  assert.equal(a.last('friends').list[0].state, 'friend');
  // 「フレンドだけ」：b は入れる、c は入れない
  assert.equal((await a.req('visit_policy', { policy: 'friends' })).ok, true);
  assert.equal((await enterNest(b, a)).ok, true);
  assert.equal((await enterNest(c, a)).code, 'forbidden');
  // b がログアウト → a に「オフライン」
  a.inbox = [];
  await b.req('logout');
  assert.equal(a.last('friends').list[0].online, false);
  // 逆向きの申請が来ていたら、そのままフレンド
  const ca = await c.req('friend_req', { name: 'ミント' });
  assert.equal(ca.state, 'outgoing');
  const ac = await a.req('friend_req', { name: 'ラテ' });
  assert.equal(ac.state, 'friend');
  // やめる
  const del = await a.req('friend_del', { id: c.account.id });
  assert.equal(del.ok, true); assert.equal(del.list.length, 1);
  // 連打：1 分に FRIEND_OPS_PER_MIN 回まで
  let rate = null;
  for (let i = 0; i < FRIEND_OPS_PER_MIN + 2 && !rate; i++) { const x = await a.req('friend_req', { name: 'ラテ' }); if (x.code === 'rate') rate = x; else await a.req('friend_del', { id: c.account.id }); }
  assert.ok(rate, 'rate');
  H.clock.t += 61000;
  assert.notEqual((await a.req('friends', {})).code, 'rate');
  H.close(); rmDir(H.dir);
});

await test('訪問の通知：所有者がオンラインなら visit、留守なら次のログインで一覧（1 回だけ）・同じ子の 2 分以内の出入りは 1 回', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const o = await withNest(H, 'hostess', 'ホスト');
  await o.req('visit_policy', { policy: 'public' });
  const v = new FakeClient(H.game); await v.enter('visitor1', 'password123', 'たずね');
  o.inbox = [];
  assert.equal((await enterNest(v, o)).ok, true);
  const vm = o.take('visit');
  assert.equal(vm.length, 1); assert.equal(vm[0].name, 'たずね');
  // すぐ出入りしても通知は 1 回
  await v.req('leave_nest'); await v.req('join_field');
  H.clock.t += 30000;
  assert.equal((await enterNest(v, o)).ok, true);
  assert.equal(o.take('visit').length, 0);
  await v.req('leave_nest'); await v.req('join_field');
  // 所有者がログアウト → 留守中に 2 匹来る
  await o.req('logout');
  H.clock.t += 5 * 60000;
  assert.equal((await enterNest(v, o)).ok, true);
  const w = new FakeClient(H.game); await w.enter('visitor2', 'password123', 'ふたりめ');
  assert.equal((await enterNest(w, o)).ok, true);
  const back = new FakeClient(H.game); await back.enter('hostess');
  assert.deepEqual(back.world.visitors.map(x => x.name).sort(), ['たずね', 'ふたりめ'].sort());
  const again = await back.req('join_field');
  assert.equal(again.world.visitors.length, 0, '見せたら既読');
  const list = await back.req('visitors', {});
  assert.equal(list.list.length, 3, '最近の訪問者（既読も）');
  H.close(); rmDir(H.dir);
});

done();
