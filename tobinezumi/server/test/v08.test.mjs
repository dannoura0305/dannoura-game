// Ver.0.8「季節のたのしみ」のサーバー：季節の行事（サーバーの時計と確定位置で条件を確かめる・1 回の行事に 1 回・費用・図鑑の品は 1 回だけ・
// その土地のみんなへ印・入りなおしても印が見える・巣の tales.fest）・マイグレーション 007 → 008。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test, done, makeGame, FakeClient, findDigSpot, tempDir, rmDir } from './harness.mjs';
import { HOUR_MS } from '../../shared/daynight.js';
import { SEASON_MS } from '../../shared/season.js';
import { OFFER_SPOT, HILL_SPOT, FEST } from '../../shared/festival.js';
import { Store, openDb } from '../db.js';

console.log('tobinezumi server v0.8（季節のたのしみ）');
const OCC = 40_000;   // 春の回
const W = (occ, h) => occ * SEASON_MS + h * HOUR_MS;
const ticks = (H, n) => { for (let i = 0; i < n; i++) { H.clock.t += 50; H.game.tick(); } };
const seeds = inv => inv.reduce((a, s) => a + (s && s.id === 'seed' ? s.n : 0), 0);
async function withNest(H, user, skip = 0) {
  const c = new FakeClient(H.game);
  await c.enter(user);
  const spot = findDigSpot(H.game.map, [...H.game.field.entrances.values()], skip);
  c.place(spot.x, spot.y);
  const d = await c.req('dig_burrow', {});
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}

await test('春の花：行事の夜だけ・巣のそば（確定位置）・種子 1・図鑑の押し花・ほかの子へ印・二度目はだめ・入りなおしても見える・巣の tales.fest', async () => {
  const H = await makeGame({ clock: { t: W(OCC, 12) }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'festa001'), b = new FakeClient(H.game);
  await b.enter('festb001');
  a.place(a.ent.x + 24, a.ent.y + 12);
  const r0 = await a.req('fest_act', { act: 'plant' });
  assert.equal(r0.ok, false); assert.match(r0.reason, /行事の夜ではない/);
  H.clock.t = W(OCC, 21); ticks(H, 20);
  assert.equal((await a.req('fest_act', { act: 'dance' })).ok, false);
  assert.match((await a.req('fest_act', { act: 'lantern' })).reason, /花の種まき/);
  a.place(a.ent.x + 200, a.ent.y);
  assert.match((await a.req('fest_act', { act: 'plant' })).reason, /すぐそば/);
  a.place(a.ent.x + 24, a.ent.y + 12); ticks(H, 20);
  const s0 = seeds(a.player.inv);
  b.take('fest');
  const r = await a.req('fest_act', { act: 'plant' });
  assert.ok(r.ok, r.reason); assert.equal(r.reward, 'pressed_flower'); assert.equal(seeds(r.inv), s0 - 1);
  assert.ok(a.player.owned.has('pressed_flower'));
  const got = b.last('fest');
  assert.ok(got && got.mark.kind === 'plant' && got.mark.owner === a.account.id, 'ほかの子へ');
  ticks(H, 20);
  const r2 = await a.req('fest_act', { act: 'plant' });
  assert.equal(r2.ok, false); assert.match(r2.reason, /もう/);
  assert.equal(H.store.db.prepare('SELECT COUNT(*) n FROM fest_marks').get().n, 1);
  // 入りなおし（別の子も）→ world.fest.marks
  const c = new FakeClient(H.game); const w = await c.enter('festc001');
  assert.equal(w.fest.marks.length, 1);
  // 巣の tales.fest（訪問者にも同じ）
  a.place(a.ent.x, a.ent.y + 4);
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.ok(e.ok, e.reason); assert.equal(e.nest.tales.fest, true);
  // 次の季節には見えない・次の春は図鑑の品なしで また参加できる
  await a.req('leave_nest');
  H.clock.t = W(OCC + 4, 21); ticks(H, 20);
  const w2 = await c.req('join_field');
  assert.equal(w2.world.fest.marks.length, 0);
  await a.req('join_field');
  a.place(a.ent.x + 24, a.ent.y + 12); ticks(H, 20);
  const r3 = await a.req('fest_act', { act: 'plant' });
  assert.ok(r3.ok, r3.reason); assert.equal(r3.reward, null, '品は 1 回だけ');
  H.close(); rmDir(H.dir);
});

await test('夏の星見（丘で じっと：サーバーの stillT）・秋の月見（オアシス）・冬の灯り（巣が無ければ広場・草 1）・富山はだめ・dev の fest', async () => {
  const H = await makeGame({ clock: { t: W(OCC + 1, 21) }, gameOpts: { devMode: true } });
  const a = new FakeClient(H.game); await a.enter('festd001');
  a.place(HILL_SPOT.x, HILL_SPOT.y);
  a.inputs([{ mx: 1 }]); ticks(H, 2);
  assert.match((await a.req('fest_act', { act: 'gaze' })).reason, /じっと/);
  ticks(H, Math.ceil(FEST.SIT_SERVER * 20) + 4);
  const g = await a.req('fest_act', { act: 'gaze' });
  assert.ok(g.ok, g.reason); assert.equal(g.reward, 'star_sand');
  // 秋
  H.clock.t = W(OCC + 2, 22); ticks(H, 20);
  a.place(OFFER_SPOT.x + 8, OFFER_SPOT.y + 6); ticks(H, 20);
  const o = await a.req('fest_act', { act: 'offer' });
  assert.ok(o.ok, o.reason); assert.equal(o.mark.x, OFFER_SPOT.x); assert.equal(o.reward, 'moon_seed');
  // 冬：広場・草 1
  H.clock.t = W(OCC + 3, 22); ticks(H, 20);
  a.place(H.game.map.spawn.x + 30, H.game.map.spawn.y + 10); ticks(H, 20);
  const grass = a.player.inv.reduce((s, x) => s + (x && x.id === 'grass' ? x.n : 0), 0);
  const l = await a.req('fest_act', { act: 'lantern' });
  if (grass > 0) { assert.ok(l.ok, l.reason); assert.equal(l.reward, 'little_lantern'); }
  else assert.match(l.reason, /草 が 要る/);
  // dev：いつでも行事の夜（全員の時計へ）・富山ではできない
  H.clock.t = W(OCC + 4, 10); ticks(H, 20);
  const dv = await a.req('dev', { fest: 'on' });
  assert.equal(dv.clock.fest, 'on');
  await a.req('dev', { region: 'toyama' });
  assert.match((await a.req('fest_act', { act: 'plant' })).reason, /できない/);
  H.close(); rmDir(H.dir);
});

await test('マイグレーション 007 → 008：fest_marks（1 回の行事に 1 アカウント 1 行・順位や点数の列は無い）', async () => {
  const dir = tempDir(), file = join(dir, 'game.db');
  const old = new Store(file);
  await old.migrate({ upTo: 7 });
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('m8', 'x', 1)");
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 8);
  const cols = db.db.prepare("PRAGMA table_info('fest_marks')").all().map(c => c.name);
  for (const k of ['field_id', 'occ', 'fest', 'kind', 'account_id', 'x', 'y', 'v', 'at']) assert.ok(cols.includes(k), k);
  assert.ok(!cols.some(c => /score|rank|point/.test(c)));
  const m = { region: 'plains', occ: 5, fest: 'hana', kind: 'plant', owner: 1, name: 'a', x: 1, y: 2, v: 0, at: 3 };
  assert.equal(db.addFestMark(m), 1); assert.equal(db.addFestMark({ ...m, x: 9 }), 0, '二重にならない');
  assert.equal(db.festJoined(1, 5), true); assert.equal(db.festMarks('plains', 5).length, 1);
  assert.equal(db.purgeFestMarks(6), 1);
  db.close(); rmDir(dir);
});

done();
