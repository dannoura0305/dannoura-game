// トビネズミ サーバー：Ver.0.5「広がり」— 土地ごとの部屋（同じ土地の子だけ見える）・出口からの旅（サーバーが確かめる）・
// 収集品（サーバーが出す・先着 1 人・二重に入らない・もう持っている子は拾えない）・実績（やさしい目標・ごほうびの飾り）・
// 共同巣（誘う → 住人：入れる・編集・倉庫を分け合う・眠れる。権限）・富山への不思議な穴（条件はサーバー）・再起動・マイグレーション 005 → 006。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test, done, makeGame, FakeClient, tempDir, rmDir, makeFieldState, STEP_DT, stepField } from './harness.mjs';
import { TILE, canDigBurrow, gateAt } from '../../shared/regions.js';
import { regionMap, arrivalPoint, REGION } from '../../shared/world.js';
import { boxFree } from '../../shared/move.js';
import { DAY_MS, HOUR_MS } from '../../shared/daynight.js';
import { landAt } from '../../shared/lands.js';
import { CURIOS, SIGNS, CROSSOVER } from '../../shared/collect.js';
import { countItem } from '../../shared/items.js';
import { Store, openDb } from '../db.js';

console.log('tobinezumi server regions / collect (Ver.0.5)');
const MIDNIGHT = DAY_MS * 1_200_000, NOON = MIDNIGHT + 12 * HOUR_MS;
const ticks = (H, n) => { for (let i = 0; i < n; i++) { H.clock.t += 50; H.game.tick(); } };
function digSpot(map, entrances, skip = 0) {
  for (let ty = 6; ty < map.h - 6; ty++) for (let tx = 6; tx < map.w - 6; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160 || landAt(map, x, y).hardness >= 4) continue;
    if (canDigBurrow(map, x, y, entrances).ok) { if (skip-- > 0) continue; return { x, y }; }
  }
  throw new Error('no dig spot');
}
async function withNest(H, user) {
  const c = new FakeClient(H.game);
  await c.enter(user, 'password123', user.slice(0, 10));
  const s = digSpot(H.game.map, [...H.game.field.entrances.values()]);
  c.place(s.x, s.y);
  const d = await c.req('dig_burrow', {});
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}
const gateOf = (region, to) => regionMap(region).gates.find(g => g.to === to);
async function travel(c, from, to, H = null) {
  if (H) H.clock.t += 2000;     // 旅は 1.5 秒あける
  const g = gateOf(from, to);
  c.place((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2);
  return c.req('travel', { to });
}
async function friends(a, b) {
  assert.equal((await a.req('friend_req', { name: b.player.name })).ok, true);
  assert.equal((await b.req('friend_ok', { id: a.account.id })).ok, true);
}

await test('旅：出口の上でだけ・となりの土地へ（同じ土地の子だけ見える・チャットも土地ごと）・着く所は来た方の出口のそば', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = new FakeClient(H.game), b = new FakeClient(H.game);
  await a.enter('walker'); await b.enter('stayer');
  // 出口ではない所からは行けない・知らない土地・富山は出口では行けない
  a.place(H.game.map.spawn.x, H.game.map.spawn.y);
  assert.equal((await a.req('travel', { to: 'rocks' })).code, 'too_far');
  assert.equal((await a.req('travel', { to: 'nowhere' })).code, 'bad_request');
  assert.equal((await a.req('travel', { to: 'toyama' })).code, 'bad_request');
  const g = gateOf('plains', 'rocks');
  a.place(g.ax, 8);
  assert.equal((await a.req('travel', { to: 'dunes' })).code, 'too_far', 'ちがう出口');
  b.inbox = [];
  const r = await a.req('travel', { to: 'rocks' });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.world.region, 'rocks');
  const arr = arrivalPoint(regionMap('rocks'), 'plains');
  assert.deepEqual([r.world.you.x, r.world.you.y], [arr.x, arr.y]);
  assert.ok(boxFree(regionMap('rocks'), arr.x, arr.y));
  assert.ok(H.game.fields.get('rocks').players.has(a.account.id) && !H.game.field.players.has(a.account.id));
  assert.ok(b.take('player_leave').some(m => m.id === a.account.id && m.why === 'travel'));
  ticks(H, 4);
  assert.ok(!b.last('snapshot').players.some(p => p.id === a.account.id), 'ほかの土地の子は見えない');
  assert.equal(a.last('snapshot').players.length, 0);
  // 入力はいる土地の地図で当たる
  const p0 = { ...a.player.st };
  a.inputs(Array.from({ length: 30 }, () => ({ mx: 1, my: 0 })));
  ticks(H, 2);
  assert.ok(a.player.st.x > p0.x + 10, '岩場でも跳ねて進む');
  // チャットは同じ土地だけ
  b.inbox = []; a.inbox = [];
  a.send({ t: 'chat', text: 'やあ' });
  assert.ok(a.take('chat').length === 1 && b.take('chat').length === 0);
  // 戻る：はじまりの原の北の出口のそば
  const back = await travel(a, 'rocks', 'plains', H);
  assert.equal(back.ok, true);
  assert.equal(back.world.region, 'plains');
  assert.ok(Math.hypot(back.world.you.x - g.ax, back.world.you.y - g.ay) < 2);
  assert.ok(b.take('player_join').some(m => m.player.id === a.account.id));
  // 4 つの土地をめぐると実績
  assert.equal((await travel(a, 'plains', 'dunes')).code, 'rate', '旅は少しあける');
  for (const to of ['dunes', 'canyon']) { assert.equal((await travel(a, 'plains', to, H)).ok, true); assert.equal((await travel(a, to, 'plains', H)).ok, true); }
  assert.ok(a.take('achievement').some(m => m.id === 'regions4' && m.reward === 'star_lamp'));
  H.close(); rmDir(H.dir);
});

await test('土地の地図：決まった種で同じ・出口と着く所が通れる・段差は下へだけ・砂丘は遅い・富山は巣を掘れない', async () => {
  for (const id of Object.keys(REGION)) {
    const m = regionMap(id);
    assert.ok(boxFree(m, m.spawn.x, m.spawn.y), id + ' 出発点');
    for (const gg of m.gates) { assert.ok(boxFree(m, gg.ax, gg.ay), id + ' 出口'); assert.equal(gateAt(m, (gg.x0 + gg.x1) / 2, (gg.y0 + gg.y1) / 2), gg); }
  }
  // 段差：上の段から下へは下りられるが、下からは上がれない（坂の所だけ通れる）
  const cm = regionMap('canyon');
  const ly = 38;   // CANYON.LEDGE2
  let lx = -1;
  for (let x = 40; x < 80 && lx < 0; x++) if (cm.tiles[ly * cm.w + x] === 12 && cm.tiles[(ly - 2) * cm.w + x] !== 11 && boxFree(cm, x * 16 + 8, (ly - 1) * 16 + 4) && boxFree(cm, x * 16 + 8, (ly + 2) * 16 + 8)) lx = x;
  assert.ok(lx > 0);
  let st = makeFieldState(lx * 16 + 8, (ly - 1) * 16 + 4);
  for (let i = 0; i < 60; i++) st = stepField(st, { mx: 0, my: 1 }, STEP_DT, cm);
  assert.ok(st.y > (ly + 1) * 16, '下りられる ' + st.y);
  for (let i = 0; i < 120; i++) st = stepField(st, { mx: 0, my: -1 }, STEP_DT, cm);
  assert.ok(st.y > ly * 16, '上がれない ' + st.y);
  // 砂丘のさらさら砂は跳ねる速さ ×0.85
  const dm = regionMap('dunes');
  let ds = null, sand = null;
  for (let i = 0; i < dm.w * dm.h && !(ds && sand); i++) {
    const x = (i % dm.w) * 16 + 8, y = Math.floor(i / dm.w) * 16 + 12;
    if (!boxFree(dm, x, y) || !boxFree(dm, x + 20, y)) continue;
    let all = true, none = true;
    for (let k = 0; k <= 2; k++) { const t = dm.tiles[Math.floor((y - 1) / 16) * dm.w + Math.floor((x + k * 8) / 16)]; if (t !== 10) all = false; else none = false; }
    if (all && !ds) ds = { x, y }; if (none && !sand) sand = { x, y };
  }
  const run = p0 => { let q = makeFieldState(p0.x, p0.y); for (let i = 0; i < 12; i++) q = stepField(q, { mx: 1, my: 0 }, STEP_DT, dm); return q.x - p0.x; };
  assert.ok(Math.abs(run(ds) / run(sand) - 0.85) < 0.03, 'さらさら砂 ' + run(ds) + ' / ' + run(sand));
  assert.ok(!canDigBurrow(regionMap('toyama'), regionMap('toyama').spawn.x, regionMap('toyama').spawn.y + 40).ok);
  assert.match(canDigBurrow(regionMap('toyama'), 800, 500).reason, /巣を掘る気になれない/);
});

await test('収集品：サーバーが出す・先着 1 人・二重に入らない・もう持っている子は拾えない・合わなくなると消える・図鑑の実績', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { curios: true, devMode: true } });
  const a = new FakeClient(H.game), b = new FakeClient(H.game);
  await a.enter('finder'); await b.enter('rival');
  const room = H.game.field;
  const x = H.game.map.spawn.x + 40, y = H.game.map.spawn.y;
  a.place(x, y); b.place(x + 2, y);
  const c1 = room.placeCurio('shell', x + 4, y).spawned;
  assert.ok(a.inbox.some(m => m.t === 'res_spawn' && m.res.cid === 'shell'), '全員に見える');
  const [ra, rb] = await Promise.all([a.req('pickup', { resId: c1.id }), b.req('pickup', { resId: c1.id })]);
  assert.equal([ra, rb].filter(r => r.ok).length, 1, '先着 1 人');
  const winner = ra.ok ? a : b, loser = ra.ok ? b : a;
  assert.equal((ra.ok ? ra : rb).cid, 'shell');
  assert.ok(winner.take('collect').some(m => m.cid === 'shell' && m.total === 1));
  assert.equal(countItem(winner.player.inv, 'curio'), 0, '持ち物の枠は使わない');
  // もう持っている子は拾えない（残る）。持っていない子は拾える
  const c2 = room.placeCurio('shell', x + 6, y).spawned;
  const again = await winner.req('pickup', { resId: c2.id });
  assert.equal(again.code, 'rule'); assert.ok(room.resources.has(c2.id));
  assert.equal((await loser.req('pickup', { resId: c2.id })).ok, true);
  assert.equal(H.store.db.prepare("SELECT COUNT(*) n FROM account_collectibles WHERE collectible_id = 'shell'").get().n, 2);
  // DB の主キー：同じ物は二度と入らない
  assert.equal(H.store.addCollectible(winner.account.id, 'shell', 1), 0);
  // 夜だけの品（流れ星のかけら）は昼になると消える
  const c3 = room.placeCurio('starbit', x + 30, y).spawned;
  room.curioTick(H.clock.t);
  assert.ok(!room.resources.has(c3.id), '昼には無い');
  // 自然に出る：その土地にいる子がまだ持っていない品だけ（はじまりの原の昼：よつばの草は春夏・貝がら）
  H.game.clock.season = 'spring';
  let spawned = null;
  for (let i = 0; i < 400 && !spawned; i++) spawned = room.curioTick(H.clock.t + i).spawned;
  assert.ok(spawned && spawned.cid === 'clover', JSON.stringify(spawned));
  // dev で図鑑へ（開発用）→ 5 つで「小さなコレクター」・ごほうびの飾り
  await a.req('dev', { collect: ['ammonite', 'crystal', 'desert_rose', 'moon_sand', 'kingfisher'] });
  assert.ok(a.take('achievement').some(m => m.id === 'collector5' && m.reward === 'curio_shelf'));
  const col = await a.req('collection');
  assert.ok(col.owned.ammonite && col.achievements.collector5);
  H.close(); rmDir(H.dir);
});

await test('飾る：図鑑にある品だけ・同じ巣に 1 つ・ごほうびの飾りは実績のあとで・きれいな石の飾り・3 つ飾ると実績', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'decorator');
  a.place(a.ent.x, a.ent.y + 4);
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.equal(e.ok, true);
  const room = e.nest.data.rooms[0];
  const place = (type, extra = {}, dx = 0) => a.req('nest_op', { nestId: e.nest.id, rev: H.store.nest(e.nest.id).rev, op: { op: 'place', type, x: room.x + dx, y: room.y + 1, ...extra } });
  assert.equal((await place('curio', { item: 'shell' })).reason, '図鑑に無い品は飾れない');
  assert.equal((await place('curio_shelf', {}, 0)).reason, '実績のごほうび（まだ使えない）');
  await a.req('dev', { collect: ['shell', 'clover', 'starbit', 'ammonite', 'crystal'] });
  const p1 = await place('curio', { item: 'shell' }, 0);
  assert.equal(p1.ok, true, p1.reason);
  assert.equal(p1.data.objects.find(o => o.id === p1.created).item, 'shell');
  assert.equal((await place('curio', { item: 'shell' }, 1)).reason, 'もう この巣に飾ってある');
  assert.equal((await place('curio', { item: 'clover' }, 1)).ok, true);
  assert.equal((await place('curio', { item: 'starbit' }, 2)).ok, true);
  assert.ok(a.take('achievement').some(m => m.id === 'display3'));
  // きれいな石の飾り（持ち物のきれいな石を使う）
  assert.equal((await a.req('nest_op', { nestId: e.nest.id, rev: H.store.nest(e.nest.id).rev, op: { op: 'place', type: 'stone_display', x: room.x + 3, y: room.y + room.h - 1 } })).reason, '素材が足りない');
  await a.req('dev', { give: { pretty_stone: 1 } });
  const sd = await a.req('nest_op', { nestId: e.nest.id, rev: H.store.nest(e.nest.id).rev, op: { op: 'place', type: 'stone_display', x: room.x + 3, y: room.y + room.h - 1 } });
  assert.equal(sd.ok, true, sd.reason); assert.equal(countItem(sd.inv, 'pretty_stone'), 0);
  // 撤去：収集品は図鑑に残り、また飾れる
  const rm = await a.req('nest_op', { nestId: e.nest.id, rev: sd.rev, op: { op: 'remove', id: p1.created } });
  assert.equal(rm.ok, true);
  assert.ok(H.store.hasCollectible(a.account.id, 'shell'));
  // 豊かな巣
  const rk = await a.req('ranking');
  assert.equal(rk.ok, true); assert.equal(rk.list[0].me, true); assert.ok(rk.list[0].curios >= 2);
  H.close(); rmDir(H.dir);
});

await test('共同巣：フレンドを誘う → 住人（非公開でも入れる・編集・倉庫を分け合う・眠れる）・権限（訪問設定は所有者だけ）・出る', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'owner1');
  const b = new FakeClient(H.game), c = new FakeClient(H.game);
  await b.enter('mate01'); await c.enter('stranger');
  // フレンドでないと誘えない
  assert.equal((await a.req('resident_invite', { name: b.player.name })).reason, 'フレンドだけ誘える');
  await friends(a, b);
  const inv = await a.req('resident_invite', { name: b.player.name });
  assert.equal(inv.ok, true, inv.reason);
  assert.equal(inv.mine.invites[0].id, b.account.id);
  const push = b.last('residents');
  assert.ok(push && push.invites.some(x => x.nestId === a.ent.nestId) && /いっしょに住もう/.test(push.text));
  assert.equal((await a.req('resident_invite', { name: b.player.name })).reason, 'もう誘ってある（返事待ち）');
  // 誘われていない子は答えられない
  assert.equal((await c.req('resident_answer', { nestId: a.ent.nestId, ok: true })).code, 'not_found');
  const ok = await b.req('resident_answer', { nestId: a.ent.nestId, ok: true });
  assert.equal(ok.ok, true); assert.equal(ok.home.nestId, a.ent.nestId);
  assert.ok(b.take('achievement').some(m => m.id === 'together'));
  assert.ok(a.take('achievement').some(m => m.id === 'together'));
  // 非公開のまま：住人は入れる・訪問者は入れない
  b.place(a.ent.x, a.ent.y + 4); c.place(a.ent.x, a.ent.y + 4);
  assert.equal((await c.req('enter_nest', { owner: a.account.id })).code, 'forbidden');
  const be = await b.req('enter_nest', { owner: a.account.id });
  assert.equal(be.ok, true, be.reason);
  assert.equal(be.nest.role, 'resident'); assert.equal(be.nest.canEdit, true); assert.equal(be.nest.home, true);
  // 編集（住人の素材で）
  const r0 = be.nest.data.rooms[0];
  const op = await b.req('nest_op', { nestId: be.nest.id, rev: be.nest.rev, op: { op: 'set-kind', id: r0.id, kind: 'store' } });
  assert.equal(op.ok, true, op.reason);
  // 倉庫を分け合う：住人が預けた種子を所有者が引き出せる
  const dep = await b.req('store', { nestId: be.nest.id, dir: 'deposit', item: 'seed', n: 3 });
  assert.equal(dep.ok, true, dep.reason); assert.equal(countItem(dep.storage, 'seed'), 3);
  a.place(a.ent.x, a.ent.y + 4);
  const ae = await a.req('enter_nest', { owner: a.account.id });
  assert.equal(countItem(ae.nest.storage, 'seed'), 3);
  assert.equal(ae.nest.residents[0].name, b.player.name);
  const wd = await a.req('store', { nestId: ae.nest.id, dir: 'withdraw', item: 'seed', n: 1 });
  assert.equal(wd.ok, true);
  // 権限：訪問設定・共同作業者・住人を決めるのは所有者だけ（b の操作は自分の巣が無いので not_found）
  assert.equal((await b.req('visit_policy', { policy: 'public' })).code, 'not_found');
  assert.equal(H.store.nest(a.ent.nestId).policy, 'private');
  assert.equal((await b.req('resident_remove', { id: a.account.id })).code, 'not_found');
  // 眠れる（寝床の部屋を作って、寝床の上で）
  assert.equal((await b.req('nest_op', { nestId: be.nest.id, rev: H.store.nest(be.nest.id).rev, op: { op: 'set-kind', id: r0.id, kind: 'bed' } })).ok, true);
  const bed = H.store.nest(be.nest.id).data.rooms[0];
  b.send({ t: 'nest_move', x: (bed.x + Math.floor((bed.w - 2) / 2)) * 16 + 16, y: (bed.y + bed.h) * 16, facing: 1, anim: 'idle' });
  const sl = await b.req('sleep');
  assert.equal(sl.ok, true, sl.reason);
  // 住人は地上の入口が「自分の家」に見える
  await b.req('wake'); await b.req('leave_nest');
  assert.ok(b.player.homeNest === a.ent.nestId);
  const w = await b.req('join_field');
  assert.ok(w.world.entrances.some(e => e.owner === a.account.id && e.home), JSON.stringify(w.world.entrances));
  assert.equal(w.world.you.home.nestId, a.ent.nestId);
  // 所有者が外す → 入れない
  const rm = await a.req('resident_remove', { id: b.account.id });
  assert.equal(rm.ok, true); assert.equal(rm.mine.residents.length, 0);
  b.place(a.ent.x, a.ent.y + 4);
  assert.equal((await b.req('enter_nest', { owner: a.account.id })).code, 'forbidden');
  // もう一度誘って、こんどは自分から出る
  await a.req('resident_invite', { name: b.player.name });
  await b.req('resident_answer', { nestId: a.ent.nestId, ok: true });
  const lv = await b.req('resident_leave');
  assert.equal(lv.ok, true); assert.equal(lv.home, null);
  H.close(); rmDir(H.dir);
});

await test('富山：不思議な穴は条件がそろったときだけ（サーバーが確かめる）→ 富山（捕食者なし・巣は掘れない）→ 来た穴で谷へ。一度見つけたら夜ならいつでも', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT + 22 * HOUR_MS }, gameOpts: { devMode: true, season: 'winter', weather: 'clear' } });
  const a = new FakeClient(H.game);
  await a.enter('seeker');
  const r = await a.req('dev', { region: 'canyon' });
  assert.equal(r.world.region, 'canyon');
  const sec = regionMap('canyon').secret;
  a.place(sec.x + 4, sec.y);
  ticks(H, 22);
  assert.equal(a.last('snapshot').gate, null, '冬の夜でも雪としるしが無いと開かない');
  const no = await a.req('enter_gate');
  assert.equal(no.code, 'rule'); assert.match(no.reason, /しるし 0\/3/);
  await a.req('dev', { collect: SIGNS });
  assert.match((await a.req('enter_gate')).reason, /雪が降るのを待とう/);
  H.game.clock.weather = 'snow';
  ticks(H, 22);
  assert.ok(a.last('snapshot').gate && a.last('snapshot').gate.x === sec.x, '雪の冬の夜・しるし 3 つで開く');
  // 遠いと入れない
  a.place(sec.x + 60, sec.y);
  assert.equal((await a.req('enter_gate')).code, 'too_far');
  a.place(sec.x + 4, sec.y);
  const in1 = await a.req('enter_gate');
  assert.equal(in1.ok, true, in1.reason); assert.equal(in1.world.region, 'toyama'); assert.equal(in1.first, true);
  assert.ok(a.take('achievement').some(m => m.id === 'toyama' && m.reward === 'snowman'));
  assert.equal(H.store.flag(a.account.id, 'toyama'), '1');
  // 富山：捕食者は出ない・巣は掘れない・来た穴がいつも見える
  const tm = regionMap('toyama');
  assert.equal((await a.req('dig_burrow')).code, 'rule');
  ticks(H, 30);
  assert.equal(a.last('snapshot').preds.length, 0);
  assert.equal(a.last('snapshot').gate.back, true);
  a.place(tm.back.x + 6, tm.back.y);
  const out = await a.req('enter_gate');
  assert.equal(out.ok, true, out.reason); assert.equal(out.world.region, 'canyon');
  // 見つけたあとは、雪でなくても夏でも夜なら開く。昼は開かない
  H.game.clock.weather = 'clear'; H.game.clock.season = 'summer';
  a.place(sec.x + 4, sec.y);
  ticks(H, 22);
  assert.ok(a.last('snapshot').gate, '夏の夜でも');
  H.clock.t += 12 * HOUR_MS; ticks(H, 22);
  assert.equal(a.last('snapshot').gate, null, '昼は閉じる');
  // 富山の品：dev で出して拾う（6 つで「つながる世界」）
  await a.req('dev', { region: 'toyama' });
  a.place(tm.spawn.x, tm.spawn.y);
  const cu = await a.req('dev', { curio: 'unknown_card', dx: 6 });
  assert.equal((await a.req('pickup', { resId: cu.curio.id })).cid, 'unknown_card');
  await a.req('dev', { collect: CROSSOVER });
  assert.ok(a.take('achievement').some(m => m.id === 'crossover6'));
  H.close(); rmDir(H.dir);
});

await test('実績：はじめての巣穴・めぐる季節・砂嵐をこえて・おとなりさん（フレンドの巣 5 つ）', async () => {
  const H = await makeGame({ clock: { t: NOON } });
  const a = await withNest(H, 'achiever');
  assert.ok(a.take('achievement').some(m => m.id === 'first_burrow'));
  const p = a.player;
  for (const s of ['spring', 'summer', 'autumn', 'winter']) H.game.progressTick(p, { season: s, weather: 'clear' }, 1000, false);
  assert.ok(a.take('achievement').some(m => m.id === 'seasons4' && m.reward === 'wreath'));
  H.game.progressTick(p, { season: 'winter', weather: 'sandstorm' }, 10 * 60 * 1000, false);
  H.game.progressTick(p, { season: 'winter', weather: 'clear' }, 1000, false);
  assert.equal(a.take('achievement').length, 0, '10 分ではまだ');
  H.game.progressTick(p, { season: 'winter', weather: 'sandstorm' }, 21 * 60 * 1000, false);
  H.game.progressTick(p, { season: 'winter', weather: 'clear' }, 1000, false);
  assert.ok(a.take('achievement').some(m => m.id === 'sandstorm'));
  const f = new FakeClient(H.game); await f.enter('neighbor');
  await friends(a, f);
  for (let i = 0; i < 5; i++) H.game._visitedFriend(a.player, { id: 900 + i, owner: f.account.id });
  assert.ok(a.take('achievement').some(m => m.id === 'visit5'));
  H.close(); rmDir(H.dir);
});

await test('再起動しても：いる土地・図鑑・実績・住人・ほかの土地の巣と採集物が戻る', async () => {
  const dir = tempDir(), clock = { t: NOON };
  let H = await makeGame({ dir, clock, gameOpts: { devMode: true } });
  const a = await withNest(H, 'keeper');
  const b = new FakeClient(H.game); await b.enter('roomie');
  await friends(a, b);
  await a.req('resident_invite', { name: b.player.name });
  await b.req('resident_answer', { nestId: a.ent.nestId, ok: true });
  await a.req('dev', { collect: ['shell'], region: 'dunes' });
  // 砂丘へ引っ越す（土地をまたいで）
  const dm = regionMap('dunes');
  const s = digSpot(dm, []);
  a.place(s.x, s.y);
  await a.req('dev', { give: { pebble: 9, grass: 9 } });
  const rl = await a.req('relocate');
  assert.equal(rl.ok, true, rl.reason); assert.equal(rl.fromRegion, 'plains'); assert.equal(rl.entrance.region, 'dunes');
  assert.ok(!H.game.field.entrances.has(a.account.id) && H.game.fields.get('dunes').entrances.has(a.account.id));
  const dunesRes = H.game.fields.get('dunes').resources.size;
  assert.ok(dunesRes > 20 && dunesRes < H.game.field.resources.size, '砂丘は採集物が少ない ' + dunesRes);
  a.close(); b.close();
  H.game.saveAll('shutdown'); H.close();
  H = await makeGame({ dir, clock });
  const a2 = new FakeClient(H.game);
  const w = await a2.enter('keeper');
  assert.equal(w.region, 'dunes', 'いた土地へ');
  assert.equal(w.you.nest.region, 'dunes');
  assert.ok(w.entrances.some(e => e.own));
  assert.ok(w.collection.owned.shell && w.collection.achievements.first_burrow);
  assert.equal(H.game.fields.get('dunes').resources.size, dunesRes);
  assert.equal(H.store.residentNestOf(b.account.id), a.ent.nestId);
  H.close(); rmDir(dir);
});

await test('マイグレーション 005 → 006：巣と採集物は はじまりの原・目録が入る・1 種類 1 回の主キー', async () => {
  const dir = tempDir(), file = join(dir, 'game.db');
  const old = new Store(file);
  await old.migrate({ upTo: 5 });
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('m6', 'x', 1)");
  old.db.exec("INSERT INTO lands (region_id, x, y, info, plot) VALUES ('steppe', 100, 100, '{}', 'L0-1')");
  old.db.exec("INSERT INTO world_resources (id, region_id, kind, x, y) VALUES ('r1', 'steppe', 'seed', 10, 10)");
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 7);
  assert.equal(db.db.prepare('SELECT field_id FROM lands').get().field_id, 'plains');
  assert.equal(db.resources('plains').length, 1); assert.equal(db.resources('dunes').length, 0);
  assert.equal(db.db.prepare('SELECT COUNT(*) n FROM collectibles').get().n, Object.keys(CURIOS).length);
  assert.equal(db.db.prepare("SELECT hidden FROM regions WHERE id = 'toyama'").get().hidden, 1);
  assert.equal(db.addCollectible(1, 'shell', 5), 1); assert.equal(db.addCollectible(1, 'shell', 6), 0);
  assert.throws(() => db.db.prepare("INSERT INTO account_collectibles (account_id, collectible_id, got_at) VALUES (1, 'nope', 1)").run(), /FOREIGN KEY/);
  db.close(); rmDir(dir);
});

done();
