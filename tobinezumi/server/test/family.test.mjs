// トビネズミ サーバー：Ver.0.4「いのちをつなぐ」— 年齢（遊んでいる間だけ）・野生の子となかよくなる（サーバーが正）・巣へ迎える条件・
// お産（サーバーで決まった種から）・子育て・名前・訪問者に見える家族・世代交代（自分の育った子だけ）・家系図・再起動しても残る・マイグレーション 004 → 005。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test, done, makeGame, FakeClient, findDigSpot, tempDir, rmDir } from './harness.mjs';
import { countItem, addItem } from '../../shared/items.js';
import { DAY_MS, HOUR_MS } from '../../shared/daynight.js';
import { stageOf, ageDays, BREED, LITTER, STAGE } from '../../shared/family.js';
import { WILD } from '../../shared/wild.js';
import { makeFieldState } from '../../shared/move.js';
import { Store, openDb } from '../db.js';

console.log('tobinezumi server family (Ver.0.4)');
const NOON = DAY_MS * 1_200_000 + 12 * HOUR_MS;

async function withNest(H, user, name = user.slice(0, 10), skip = 0, extra = {}) {
  const c = new FakeClient(H.game);
  let r = await c.req('register', { username: user, password: 'password123' });
  c.token = r.token; c.account = r.account;
  const cc = await c.req('create_char', { name, fur: extra.fur || 'sand', ...(extra.sex ? { sex: extra.sex } : {}) });
  assert.ok(cc.ok, cc.reason); c.character = cc.character;
  const j = await c.req('join_field'); c.world = j.world;
  const spot = findDigSpot(H.game.map, [...H.game.field.entrances.values()], skip);
  c.place(spot.x, spot.y);
  const d = await c.req('dig_burrow', {});
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}
/** 世界の時間を進める（lifeTick は 10 秒まで × 早回し） */
function play(H, worldMs) {
  const scale = H.game.clock.scale;
  const step = 10000;
  for (let left = worldMs / scale; left > 0; left -= step) { H.clock.t += Math.min(step, left); H.game.lifeTick(true); }
}
async function makeReady(H, c) {
  const p = c.player;
  // 寝床の部屋・倉庫の種子・おとな・体調
  c.place(c.ent.x, c.ent.y + 10);
  const e = await c.req('enter_nest', { owner: c.account.id });
  const k = await c.req('nest_op', { nestId: e.nest.id, rev: e.nest.rev, op: { op: 'set-kind', id: e.nest.data.rooms[0].id, kind: 'bed' } });
  assert.ok(k.ok, k.reason);
  const st = H.store.nestStorage(e.nest.id); addItem(st, 'seed', 40); H.store.setNestStorage(e.nest.id, st);
  await c.req('leave_nest');
  p.house.me.ageMs = 5 * DAY_MS;
  p.inv = p.inv.map(x => x && { ...x }); addItem(p.inv, 'seed', 30); H.store.setCharInventory(p.charId, p.inv);
  return e.nest.id;
}
async function befriend(H, c) {
  const p = c.player;
  c.place(c.ent.x + 24, c.ent.y + 14);
  const n = H.game.field.wild.spawn(p.st.x + 12, p.st.y);
  let r;
  for (let i = 0; i < 4; i++) { r = await c.req('court', { wildId: n.id }); assert.ok(r.ok, r.reason); H.clock.t += 1300; }
  assert.equal(r.befriended, true);
  return n;
}

await test('キャラクター作成：1 代目は若者（3 日）・選んだ性・選んだ毛色を 2 つ・体つきはふつう。年齢は遊んでいる間だけ進む', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { timeScale: 60, season: 'spring' } });
  const c = new FakeClient(H.game);
  c.account = (await c.req('register', { username: 'hajime', password: 'password123' })).account;
  const cc = await c.req('create_char', { name: 'はじめ', fur: 'white', sex: 'm' });
  assert.ok(cc.ok); assert.equal(cc.character.individual.sex, 'm'); assert.deepEqual(cc.character.individual.genes.col, ['white', 'white']);
  const j = await c.req('join_field');
  assert.equal(j.world.family.me.name, 'はじめ'); assert.equal(j.world.family.me.stage, 'young'); assert.ok(j.world.you.look && j.world.you.look.fur === 'white');
  const p = c.player, a0 = p.house.me.ageMs;
  assert.equal(stageOf(a0), 'young'); assert.equal(ageDays(a0), 3);
  play(H, HOUR_MS);
  assert.ok(Math.abs(p.house.me.ageMs - a0 - HOUR_MS) < 11000, 'age ' + (p.house.me.ageMs - a0));
  await c.req('logout');
  const ind = H.store.lineage(c.account.id)[0];
  assert.ok(Math.abs(ind.ageMs - p.house.me.ageMs) < 1, '保存された');
  const t0 = H.clock.t; H.clock.t += 10 * 60 * 1000; H.game.lifeTick(true);
  assert.equal(H.store.lineage(c.account.id)[0].ageMs, ind.ageMs, 'ログアウト中は進まない');
  void t0;
  H.close(); rmDir(H.dir);
});

await test('野生の子：スナップショットに wild と信頼 wt。若者はなかよくなれない。おとなは種子 4 つでなかよし（種子は DB から減る）', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { season: 'spring' } });
  const c = await withNest(H, 'court1', 'こい', 0, { sex: 'f' });
  const p = c.player;
  const n = H.game.field.wild.spawn(p.st.x + 12, p.st.y);
  H.game.tick(); H.game.tick();
  const snap = c.last('snapshot');
  assert.ok(snap.wild.some(w => w.id === n.id && w.look && w.name), 'wild in snapshot');
  const young = await c.req('court', { wildId: n.id });
  assert.equal(young.ok, false); assert.match(young.reason, /若い/);
  p.house.me.ageMs = 5 * DAY_MS;
  const seeds0 = countItem(p.inv, 'seed');
  let r;
  for (let i = 0; i < 4; i++) { r = await c.req('court', { wildId: n.id }); assert.ok(r.ok, r.reason); H.clock.t += 1300; }
  assert.equal(r.befriended, true); assert.equal(r.trust, 100);
  assert.equal(countItem(H.store.charInventory(p.charId), 'seed'), seeds0 - 4);
  assert.ok(c.take('wild').some(m => m.type === 'befriend' && m.id === n.id));
  assert.equal(H.game.field.wild.followerOf(p.accountId), n);
  // 間隔・遠い・知らない子
  const n2 = H.game.field.wild.spawn(p.st.x + 200, p.st.y);
  assert.match((await c.req('court', { wildId: n2.id })).reason, /近く/);
  assert.equal((await c.req('court', { wildId: 'j999' })).code, 'not_found');
  H.game.tick(); H.game.tick();
  assert.ok(c.last('snapshot').wt[n.id] === 100);
  // じっとしていると信頼が増える（サーバーのティック）
  const n3 = H.game.field.wild.spawn(p.st.x - 30, p.st.y);
  for (let i = 0; i < 60; i++) { H.clock.t += 50; H.game.tick(); }
  assert.ok((n3.trust[p.accountId] || 0) > 10, 'still trust ' + n3.trust[p.accountId]);
  H.close(); rmDir(H.dir);
});

await test('巣へ迎える：寝床・倉庫の種子が無いと理由（野生の子は外で待つ）→ 整えると つれあい・お産の予定（litters）', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { season: 'spring' } });
  const c = await withNest(H, 'invite1', 'まねく', 0, { sex: 'f' });
  const p = c.player;
  p.house.me.ageMs = 5 * DAY_MS;
  p.inv = p.inv.map(x => x && { ...x }); addItem(p.inv, 'seed', 20);
  const n = await befriend(H, c);
  c.place(c.ent.x, c.ent.y + 10); n.st = makeFieldState(c.ent.x + 20, c.ent.y + 14);
  const e1 = await c.req('enter_nest', { owner: c.account.id });
  assert.ok(e1.ok); assert.equal(e1.invite.ok, false); assert.match(e1.invite.reason, /寝床/);
  assert.ok(H.game.field.wild.get(n.id), '外で待つ');
  await c.req('leave_nest');
  await makeReady(H, c);
  c.place(c.ent.x, c.ent.y + 10); n.st = makeFieldState(c.ent.x + 20, c.ent.y + 14);
  const e2 = await c.req('enter_nest', { owner: c.account.id });
  assert.ok(e2.invite.ok, JSON.stringify(e2.invite));
  assert.equal(H.game.field.wild.get(n.id), null);
  const mate = H.store.lineage(c.account.id).find(m => m.role === 'mate');
  assert.ok(mate && mate.wild && mate.sex === 'm' && mate.name === n.name);
  assert.equal(H.store.nestFamily(e2.nest.id).length, 1);
  const L = H.store.litterRows(c.account.id);
  assert.equal(L.length, 1); assert.equal(L[0].born_at, null); assert.equal(L[0].mother_id, p.indId); assert.equal(L[0].father_id, mate.id);
  assert.ok(Math.abs(L[0].due_play - (p.house.me.ageMs + BREED.GESTATION_DAYS * DAY_MS)) < 1000);
  assert.equal(e2.nest.family.length, 1);
  H.close(); rmDir(H.dir);
});

let saved = null;
await test('お産 → 名前 → 育つ（倉庫の種子）→ 訪問者に見える → 世代交代（自分の育った子だけ）→ 家系図 → 再起動しても残る', async () => {
  const dir = tempDir();
  const H = await makeGame({ dir, clock: { t: NOON }, gameOpts: { season: 'spring', timeScale: 120 } });
  const a = await withNest(H, 'mama', 'ママ', 0, { sex: 'f', fur: 'cream' });
  const b = await withNest(H, 'visitor', 'おきゃく', 2);
  const nestId = await makeReady(H, a);
  const pa = a.player;
  const n = await befriend(H, a);
  a.place(a.ent.x, a.ent.y + 10); n.st = makeFieldState(a.ent.x + 20, a.ent.y + 14);
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.ok(e.invite.ok);
  a.take('family');
  // 世界の半日あそぶ → 生まれる（春は 3〜6 匹）
  play(H, BREED.GESTATION_DAYS * DAY_MS + 30000);
  const fam = a.take('family');
  const born = fam.flatMap(m => m.events || []).find(x => x.type === 'born');
  assert.ok(born, 'born event');
  assert.ok(born.pups.length >= LITTER.spring.min && born.pups.length <= LITTER.spring.max, 'size ' + born.pups.length);
  const pups = H.store.lineage(a.account.id).filter(m => m.role === 'pup');
  assert.equal(pups.length, born.pups.length);
  for (const x of pups) { assert.equal(x.mother_id, pa.indId); assert.equal(x.generation, 2); assert.equal(stageOf(x.ageMs), 'pup'); }
  const L = H.store.litterRows(a.account.id)[0];
  assert.ok(L.born_at && L.size === pups.length && L.season === 'spring' && L.seed != null);
  // 名前（変な名前は断る）
  assert.equal((await a.req('name_pups', { list: [{ id: pups[0].id, name: '<b>' }] })).ok, false);
  const nm = await a.req('name_pups', { list: pups.map((x, i) => ({ id: x.id, name: 'コ' + i })) });
  assert.ok(nm.ok); assert.ok(H.store.lineage(a.account.id).filter(m => m.role === 'pup').every(m => /^コ/.test(m.name)));
  // 種子をあげる：巣の中だけ・持ち物から 1 つ
  pa.house.members = pa.house.members.map(m => (m.role === 'pup' ? { ...m, fed: 20 } : m));
  const s0 = countItem(pa.inv, 'seed');
  H.clock.t += 1000;
  const fd = await a.req('feed_pup', { id: pups[0].id });
  assert.ok(fd.ok, fd.reason); assert.equal(fd.member.fed, 60); assert.equal(countItem(pa.inv, 'seed'), s0 - 1);
  // 訪問者（公開の巣）には家族が見える。所有者がいなくても（DB から）
  await a.req('visit_policy', { policy: 'public' });
  b.place(a.ent.x, a.ent.y + 10);
  const vb = await b.req('enter_nest', { owner: a.account.id });
  assert.ok(vb.ok); assert.equal(vb.nest.family.filter(m => m.role === 'pup').length, pups.length); assert.ok(vb.nest.family.some(m => m.role === 'mate'));
  await b.req('leave_nest');
  // 小さいうちは世代交代できない・よその子・知らない子も
  assert.match((await a.req('succeed', { id: pups[0].id })).reason, /小さい/);
  assert.equal((await a.req('succeed', { id: 99999 })).ok, false);
  const bKid = H.store.allocIndividual(b.account.id);
  assert.equal((await a.req('succeed', { id: bKid })).ok, false);
  // 育つ：倉庫の種子を食べながら若者へ
  const st0 = countItem(H.store.nestStorage(nestId), 'seed');
  play(H, (STAGE.PUP_END + 0.1) * DAY_MS);
  assert.ok(countItem(H.store.nestStorage(nestId), 'seed') < st0, '倉庫の種子を食べた');
  assert.ok(pa.house.kids().every(k => stageOf(k.ageMs) === 'young'), pa.house.kids().map(k => ageDays(k.ageMs).toFixed(2)).join(','));
  // 家系図（世代交代の前）
  const lin0 = await a.req('lineage');
  assert.ok(lin0.ok && lin0.nodes.length === pups.length + 2);
  // 世代交代：B は地上で名札が変わるのを見る・フレンドの一覧の名前
  await b.req('friend_req', { name: 'ママ' }); await a.req('friend_ok', { id: b.account.id });
  await a.req('leave_nest');
  b.place(a.ent.x + 30, a.ent.y + 20);
  b.take('player_update'); b.take('friends');
  const heir = pa.house.kids()[0];
  const inv0 = JSON.stringify(pa.inv);
  const sc = await a.req('succeed', { id: heir.id });
  assert.ok(sc.ok, sc.reason);
  assert.equal(sc.character.name, heir.name); assert.equal(pa.name, heir.name); assert.equal(pa.indId, heir.id);
  assert.equal(JSON.stringify(pa.inv), inv0); assert.equal(JSON.stringify(H.store.charInventory(pa.charId)), inv0);
  assert.equal(H.store.activeCharacter(a.account.id).individual.id, heir.id);
  assert.equal(H.store.nestByOwner(a.account.id).id, nestId);
  const up = b.take('player_update');
  assert.ok(up.some(m => m.player.id === a.account.id && m.player.name === heir.name), 'B sees new name');
  const fl = b.take('friends').pop();
  assert.ok(fl && fl.list.some(f => f.id === a.account.id && f.name === heir.name), 'friend list');
  const lin = await a.req('lineage');
  assert.equal(lin.current, heir.id);
  assert.ok(lin.nodes.some(x => x.role === 'ancestor' && x.name === 'ママ')); assert.ok(lin.nodes.some(x => x.role === 'ancestor' && x.name === n.name));
  assert.ok(lin.nodes.filter(x => x.role === 'kin').length === pups.length - 1);
  assert.equal((await a.req('family')).family.me.id, heir.id);
  saved = { dir, heir: heir.id, acct: a.account.id, kids: pups.length - 1 };
  H.close();
});

await test('再起動しても残る：いまの子・きょうだい・ご先祖・お産の記録（新しい Game で読み直す）', async () => {
  const { dir, heir, acct, kids } = saved;
  const H = await makeGame({ dir, clock: { t: NOON + 3600_000 }, gameOpts: { season: 'spring' } });
  const c = new FakeClient(H.game);
  const r = await c.req('login', { username: 'mama', password: 'password123' });
  assert.ok(r.ok); assert.equal(r.character.individual.id, heir);
  const j = await c.req('join_field');
  assert.equal(j.world.family.me.id, heir); assert.equal(j.world.family.members.filter(m => m.role === 'kin').length, kids);
  assert.equal(H.store.lineage(acct).filter(m => m.role === 'ancestor').length, 2);
  assert.equal(H.store.litterRows(acct).length, 1);
  H.close(); rmDir(dir);
});

await test('旅立ち：子がいない年寄りだけ（親せきの子が巣と持ち物を受けつぐ）。おとなでは断る', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { season: 'summer' } });
  const c = await withNest(H, 'lonely', 'ひとり');
  const p = c.player;
  p.house.me.ageMs = 10 * DAY_MS;
  assert.match((await c.req('farewell')).reason, /早い/);
  p.house.me.ageMs = 31 * DAY_MS;
  const nestId = H.store.nestByOwner(c.account.id).id;
  const r = await c.req('farewell');
  assert.ok(r.ok, r.reason);
  assert.notEqual(r.character.name, 'ひとり'); assert.equal(H.store.nestByOwner(c.account.id).id, nestId);
  assert.equal(stageOf(p.house.me.ageMs), 'young'); assert.equal(p.house.me.generation, 2);
  assert.ok(H.store.lineage(c.account.id).some(m => m.role === 'ancestor' && m.name === 'ひとり'));
  H.close(); rmDir(H.dir);
});

await test('寿命の目安：30 日をすぎると 1 日に 1 回「lifespan」を知らせる（死なない・遊び続けられる）', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { season: 'summer', timeScale: 600 } });
  const c = await withNest(H, 'oldie', 'ながいき');
  c.player.house.me.ageMs = (STAGE.LIFESPAN - 0.02) * DAY_MS;
  c.take('family');
  play(H, 0.1 * DAY_MS);
  assert.ok(c.take('family').flatMap(m => m.events || []).some(e => e.type === 'lifespan'));
  play(H, 0.2 * DAY_MS);
  assert.equal(c.take('family').flatMap(m => m.events || []).filter(e => e.type === 'lifespan').length, 0);
  assert.ok(H.game.players.has(c.account.id));
  H.close(); rmDir(H.dir);
});

await test('冬：なかよくなれない・お産の予定は春まで待つ', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { season: 'winter', timeScale: 120, devMode: true } });
  const c = await withNest(H, 'winter1', 'ふゆ', 0, { sex: 'm' });
  const p = c.player;
  p.house.me.ageMs = 5 * DAY_MS;
  const n = H.game.field.wild.spawn(p.st.x + 12, p.st.y);
  assert.match((await c.req('court', { wildId: n.id })).reason, /冬/);
  // 春に迎えて、冬に予定日が来ると待つ → 春になると生まれる
  await c.req('dev', { season: 'spring' });
  await makeReady(H, c);
  const n2 = await befriend(H, c);
  c.place(c.ent.x, c.ent.y + 10); n2.st = makeFieldState(c.ent.x + 20, c.ent.y + 14);
  assert.ok((await c.req('enter_nest', { owner: c.account.id })).invite.ok);
  await c.req('dev', { season: 'winter' });
  c.take('family');
  play(H, (BREED.GESTATION_DAYS + 0.05) * DAY_MS);
  const ev = c.take('family').flatMap(m => m.events || []);
  assert.ok(ev.some(e => e.type === 'wait') && !ev.some(e => e.type === 'born'));
  await c.req('dev', { season: 'spring' });
  play(H, 0.02 * DAY_MS);
  assert.ok(c.take('family').flatMap(m => m.events || []).some(e => e.type === 'born'));
  void n;
  H.close(); rmDir(H.dir);
});

await test('マイグレーション 004 → 005：今いる子が 1 代目のおとな（遺伝子・性・家）になる', async () => {
  const dir = tempDir(), file = join(dir, 'game.db');
  const old = new Store(file);
  await old.migrate({ upTo: 4 });
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('oldkid', 'x', 1)");
  old.db.exec(`INSERT INTO individuals (species, name, sex, born_at, generation, genes, traits, status) VALUES ('jerboa', 'むかし', NULL, 5, 1, '{"fur":"rufous"}', '{}', '{"life":{"hunger":50,"thirst":60,"cond":70}}')`);
  old.db.exec("INSERT INTO characters (account_id, individual_id, name, fur, active, created_at) VALUES (1, 1, 'むかし', 'rufous', 1, 5)");
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 7);   // Ver.0.6 の 007 まで
  const h = db.household(1);
  assert.equal(h.me.name, 'むかし'); assert.equal(h.me.role, 'player'); assert.deepEqual(h.me.genes.col, ['rufous', 'rufous']);
  assert.equal(stageOf(h.me.ageMs), 'adult'); assert.ok(h.me.sex === 'f' || h.me.sex === 'm');
  assert.equal(db.individualStatus(1).life.hunger, 50, '暮らしの数値はそのまま');
  assert.ok(db.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'litters'").get());
  db.close(); rmDir(dir);
});

done();
void WILD;
