// Ver.0.6「くらしの深まり＋公開準備」のサーバー：地上の若者の位置（スナップショットの k・kh）・家族をなでる・近縁種（なかま・種の壁）・
// 豊かな巣の週（しめる・先週の呼び名・DB に残る）・dev の家族・マイグレーション 006 → 007・訪問者に家族の形（決定的なしぐさの入力）。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test, done, makeGame, FakeClient, findDigSpot, tempDir, rmDir } from './harness.mjs';
import { DAY_MS, HOUR_MS } from '../../shared/daynight.js';
import { FOLLOW } from '../../shared/follow.js';
import { PET } from '../../shared/family-life.js';
import { addItem } from '../../shared/items.js';
import { regionMap } from '../../shared/world.js';
import { Store, openDb } from '../db.js';

console.log('tobinezumi server v0.6（くらしの深まり）');
const NOON = DAY_MS * 1_200_000 + 12 * HOUR_MS, NIGHT = DAY_MS * 1_200_000 + 23 * HOUR_MS;
const ticks = (H, n) => { for (let i = 0; i < n; i++) { H.clock.t += 50; H.game.tick(); } };
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
async function bedNest(H, c) {
  c.place(c.ent.x, c.ent.y + 10);
  const e = await c.req('enter_nest', { owner: c.account.id });
  assert.ok(e.ok, e.reason);
  const k = await c.req('nest_op', { nestId: e.nest.id, rev: e.nest.rev, op: { op: 'set-kind', id: e.nest.data.rooms[0].id, kind: 'bed' } });
  assert.ok(k.ok, k.reason);
  return e.nest.id;
}

await test('地上の若者：サーバーが足あとから位置を決めて、ほかの子のスナップショットに k（2 匹）を送る・親の通った道の上・捕食者が近いと kh', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'parent01'), b = new FakeClient(H.game);
  await b.enter('watcher1');
  const fam = await a.req('dev', { family: { young: 2 } });
  assert.equal(fam.ok, true);
  assert.equal(a.player.kids.length, 2, '若者 2 匹がついてくる');
  const p = a.player;
  a.place(p.st.x, p.st.y);
  const start = { x: p.st.x, y: p.st.y };
  // 右へ 40 歩 → 下へ 30 歩（L 字）。サーバーのティックで足あとが残る
  const path = [];
  for (let i = 0; i < 60; i++) { a.inputs([{ mx: 1, my: 0 }, { mx: 1, my: 0 }, { mx: 1, my: 0 }]); ticks(H, 1); path.push({ x: p.st.x, y: p.st.y }); }
  for (let i = 0; i < 40; i++) { a.inputs([{ mx: 0, my: 1 }, { mx: 0, my: 1 }, { mx: 0, my: 1 }]); ticks(H, 1); path.push({ x: p.st.x, y: p.st.y }); }
  ticks(H, 2);
  const snap = b.last('snapshot');
  const row = snap.players.find(q => q.id === a.account.id);
  assert.ok(row && Array.isArray(row.k) && row.k.length === 2, 'k: ' + JSON.stringify(row && row.k));
  assert.ok(!row.kh);
  // どの若者も、親の通った道（path の線分）の 2px 以内
  const near = ([x, y]) => { let best = 1e9; for (let i = 1; i < path.length; i++) { const A = path[i - 1], B = path[i]; const dx = B.x - A.x, dy = B.y - A.y, L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / L)); best = Math.min(best, Math.hypot(A.x + dx * t - x, A.y + dy * t - y)); } return best; };
  for (const q of row.k) assert.ok(near(q) < 2.5, '道の上: ' + q + ' ' + near(q));
  const d0 = Math.hypot(row.k[0][0] - p.st.x, row.k[0][1] - p.st.y), d1 = Math.hypot(row.k[1][0] - p.st.x, row.k[1][1] - p.st.y);
  assert.ok(d0 < d1 && d0 <= FOLLOW.GAP0 + 3 && d1 <= FOLLOW.GAP0 + FOLLOW.GAP + 3, '並び ' + d0 + ' ' + d1);
  assert.ok(Math.hypot(start.x - p.st.x, start.y - p.st.y) > 40);
  // 本人の行（you）には入れない・若者がいない子の行には k が無い
  const sa = a.last('snapshot');
  assert.ok(!sa.players.find(q => q.id === b.account.id).k);
  // 捕食者が近い → kh
  const fox = H.game.field.preds.spawn('fox', p.st.x + 60, p.st.y);
  H.game.field.snapshot();
  assert.equal(b.last('snapshot').players.find(q => q.id === a.account.id).kh, 1, 'fox ' + JSON.stringify(fox && { x: fox.x, state: fox.state }));
  // 連れて行かない → k は無くなる
  H.game.field.preds.preds = [];
  await a.req('kids_follow', { on: false });
  ticks(H, 2);
  assert.ok(!b.last('snapshot').players.find(q => q.id === a.account.id).k);
  H.close(); rmDir(H.dir);
});

await test('家族をなでる：自分の巣の中だけ・体調 +4・1 匹 90 秒あける（rate）・なでた時刻は DB に残る／訪問者の巣の家族は acct つき（しぐさの入力）', async () => {
  const H = await makeGame({ clock: { t: NIGHT }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'petter01');
  const nestId = await bedNest(H, a);
  await a.req('leave_nest');
  const f = await a.req('dev', { family: { mate: 1, pups: 2, friend: 1 } });
  const pup = f.family.members.find(m => m.role === 'pup');
  assert.equal((await a.req('family_pet', { id: pup.id })).code, 'forbidden', '外ではできない');
  a.place(a.ent.x, a.ent.y + 10);
  assert.ok((await a.req('enter_nest', { owner: a.account.id })).ok);
  a.player.life.cond = 60;
  const r = await a.req('family_pet', { id: pup.id });
  assert.equal(r.ok, true, r.reason); assert.equal(r.life.cond, 60 + PET.COND); assert.ok(r.member.pettedAt);
  const again = await a.req('family_pet', { id: pup.id });
  assert.equal(again.ok, false); assert.equal(again.code, 'rate');
  assert.equal((await a.req('family_pet', { id: 'x' })).code, 'bad_request');
  assert.equal(H.store.individual(pup.id).pettedAt, r.member.pettedAt, 'DB に残る');
  H.clock.t += PET.COOLDOWN_MS + 1;
  assert.equal((await a.req('family_pet', { id: pup.id })).ok, true);
  // 訪問者：巣の家族（つれあい・子・なかま）が acct つきで届く
  const b = new FakeClient(H.game);
  await b.enter('visitor1');
  await a.req('leave_nest');
  a.player.st.x += 0;
  await a.req('visit_policy', { policy: 'public' });
  b.place(a.ent.x, a.ent.y + 10);
  const e = await b.req('enter_nest', { owner: a.account.id });
  assert.equal(e.ok, true, e.reason);
  assert.equal(e.nest.family.length, 4);
  assert.ok(e.nest.family.every(m => m.acct === a.account.id && m.stage));
  assert.equal(e.nest.family.find(m => m.role === 'friend').species, 'longear');
  assert.equal((await b.req('family_pet', { id: pup.id })).code, 'forbidden', 'よその家族はなでられない（あいさつは画面だけ）');
  void nestId;
  H.close(); rmDir(H.dir);
});

await test('近縁種（サーバー）：すなの海のミミナガトビネズミ → なかよし → 巣へ入ると「なかま」（つれあい・お産の予定は無い）・家系図に入らない', async () => {
  const H = await makeGame({ clock: { t: NIGHT }, gameOpts: { devMode: true, season: 'spring' } });
  const a = await withNest(H, 'dunefan1');
  await bedNest(H, a);
  await a.req('leave_nest');
  const p = a.player;
  p.inv = p.inv.map(x => x && { ...x }); addItem(p.inv, 'seed', 20); H.store.setCharInventory(p.charId, p.inv);
  // 砂丘で出会って なかよくなる（dev で砂丘へ・種を指定して出す）
  const dunes = regionMap('dunes');
  const go = await a.req('dev', { region: 'dunes', x: dunes.spawn.x, y: dunes.spawn.y });
  assert.equal(go.ok, true);
  const w = await a.req('dev', { wild: 1, species: 'longear', dx: 12 });
  const room = H.game.fieldOf(p);
  const n = room.wild.get(w.wild);
  assert.equal(n.species, 'longear');
  let r;
  for (let i = 0; i < 6 && !(r && r.befriended); i++) { n.st.x = p.st.x + 10; n.st.y = p.st.y; r = await a.req('court', { wildId: n.id }); assert.ok(r.ok, r.reason); H.clock.t += 1300; }
  assert.equal(r.befriended, true, '若者（3 日）でも なかまには なれる');
  // 巣の土地へ連れて帰る（巣は はじまりの原）
  await a.req('dev', { region: 'plains', x: a.ent.x, y: a.ent.y + 10 });
  const n2 = H.game.fieldOf(p).wild.spawn(p.st.x + 8, p.st.y, n.genes, 'longear');
  n2.follow = p.accountId; n2.followUntil = H.game.fieldOf(p).wild.wt + 1e9; n2.name = n.name;
  a.place(a.ent.x, a.ent.y + 10); n2.st.x = p.st.x + 6; n2.st.y = p.st.y;
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.equal(e.ok, true, e.reason);
  assert.equal(e.invite.ok, true, e.invite.reason); assert.equal(e.invite.friend, true); assert.equal(e.invite.species, 'longear');
  assert.equal(p.house.mate, null); assert.equal(p.house.pending, null);
  assert.equal(H.store.litterRows(a.account.id).length, 0, 'お産の記録なし');
  const row = H.store.q('SELECT species, role FROM individuals WHERE id = ?').get(e.invite.mate.id);
  assert.deepEqual({ ...row }, { species: 'longear', role: 'friend' });
  assert.ok(!(await a.req('lineage')).nodes.some(m => m.role === 'friend'));
  // 再起動しても なかまのまま
  const fam = H.store.household(a.account.id);
  assert.equal(fam.members.find(m => m.role === 'friend').species, 'longear');
  assert.match((await a.req('mate_again')).reason, /つれあいがいない/);
  H.close(); rmDir(H.dir);
});

await test('豊かな巣の週：最初の週は今の豊かさから・ふえた分の順 → 週が変わるとしめて呼び名（DB）・先週の一覧', async () => {
  const H = await makeGame({ clock: { t: Date.parse('2026-10-14T21:00:00+09:00') }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'rich0001'), b = await withNest(H, 'rich0002', 3);
  const r1 = await a.req('ranking');
  assert.equal(r1.ok, true); assert.equal(r1.week.key, '2026-W42'); assert.equal(r1.week.label, '10月12日〜18日');
  assert.ok(r1.list.every(x => x.gain === 0)); assert.equal(r1.last.winners.length, 0);
  // b が部屋を足す
  b.player.inv = b.player.inv.map(x => x && { ...x }); addItem(b.player.inv, 'grass', 30); addItem(b.player.inv, 'pebble', 30); H.store.setCharInventory(b.player.charId, b.player.inv);
  b.place(b.ent.x, b.ent.y + 10);
  const e = await b.req('enter_nest', { owner: b.account.id });
  const r0 = e.nest.data.rooms[0];
  const lamp = await b.req('nest_op', { nestId: e.nest.id, rev: e.nest.rev, op: { op: 'place', type: 'lamp', x: r0.x + 1, y: r0.y } });
  assert.equal(lamp.ok, true, lamp.reason);
  H.clock.t += 31000;
  const r2 = await b.req('ranking');
  assert.equal(r2.list[0].name, b.player.name); assert.ok(r2.list[0].gain > 0); assert.equal(r2.list[0].me, true);
  assert.equal(r2.mine.rank, 1);
  // 週が変わる（月曜 0 時・日本時間）→ 1 分ごとの rankTick でしめる
  H.clock.t = Date.parse('2026-10-19T00:00:30+09:00');
  H.game.rankTick();
  const rows = H.store.rankWeek('2026-W42');
  assert.ok(rows.length === 2 && rows.every(x => x.final && x.place));
  assert.equal(rows.find(x => x.owner === b.account.id).title, 'grew');
  const r3 = await a.req('ranking');
  assert.equal(r3.week.key, '2026-W43'); assert.equal(r3.last.key, '2026-W42'); assert.equal(r3.last.label, '10月12日〜18日');
  assert.equal(r3.last.winners[0].name, b.player.name); assert.equal(r3.last.winners[0].titleName, '今週いちばん育った巣');
  assert.ok(r3.list.every(x => x.gain === 0), '新しい週は 0 から');
  // 再起動しても先週の記録は残る（同じ DB を開き直す）
  const file = join(H.dir, 'game.db');
  H.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.rankWeek('2026-W42').filter(x => x.title).length >= 1, true);
  assert.equal(db.getMeta('rank_week'), '2026-W43');
  db.close(); rmDir(H.dir);
});

await test('マイグレーション 006 → 007：rank_weeks・species の索引・空の species は jerboa', async () => {
  const dir = tempDir(), file = join(dir, 'game.db');
  const old = new Store(file);
  await old.migrate({ upTo: 6 });
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('m7', 'x', 1)");
  old.db.exec("INSERT INTO individuals (species, name, born_at, account_id, role) VALUES ('???', 'a', 1, 1, 'pup')");
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 7);
  assert.ok(db.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'rank_weeks'").get());
  assert.ok(db.db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name = 'individuals_species'").get());
  assert.equal(db.db.prepare('SELECT species FROM individuals').get().species, 'jerboa');
  db.upsertRankWeek('2026-W42', { nestId: 1, owner: 1, name: 'x', score: 5 }, 3);
  db.upsertRankWeek('2026-W42', { nestId: 1, owner: 1, name: 'x', score: 9 }, 0);
  assert.deepEqual([db.rankWeek('2026-W42')[0].base, db.rankWeek('2026-W42')[0].score], [3, 9], 'base は最初のまま');
  db.close(); rmDir(dir);
});

done();
