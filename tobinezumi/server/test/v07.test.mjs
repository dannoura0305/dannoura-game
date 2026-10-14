// Ver.0.7「小さなできごと」のサーバー：なかま（近縁種）を地上へ（1 匹まで・ほかの子のスナップショットに位置・名札の comp・保存）・
// 富山の小さな出来事（条件をサーバーが確かめる・1 回だけ・account_flags に記録・入りなおしても）・巣の記録の tales（訪問者にも同じ入力）。
import assert from 'node:assert/strict';
import { test, done, makeGame, FakeClient, findDigSpot } from './harness.mjs';
import { DAY_MS, HOUR_MS } from '../../shared/daynight.js';
import { FOLLOW } from '../../shared/follow.js';
import { regionMap } from '../../shared/world.js';
import { CROSSOVER } from '../../shared/collect.js';
import { FOOT_END } from '../../shared/toyama.js';

console.log('tobinezumi server v0.7（小さなできごと）');
const NIGHT = DAY_MS * 1_200_000 + 23 * HOUR_MS;
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

await test('なかまを地上へ：1 匹だけ（入れかわる）・なかま以外はだめ・ほかの子のスナップショットに k（若者＋なかま）・名札に comp・保存して入りなおしても', async () => {
  const H = await makeGame({ clock: { t: NIGHT }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'compa001'), b = new FakeClient(H.game);
  await b.enter('watch002');
  const fam = await a.req('dev', { family: { young: 1, friend: 1, mate: 1 } });
  assert.equal(fam.ok, true);
  await a.req('dev', { family: { friend: 1 } });   // 2 匹目のなかま
  const friends = a.player.house.friends();
  assert.equal(friends.length, 2);
  assert.equal(a.player.kids.length, 1, 'はじめは若者だけ');
  const mate = a.player.house.mate;
  assert.equal((await a.req('companion', { id: mate.id })).ok, false, 'つれあいは だめ');
  assert.equal((await a.req('companion', { id: 'x' })).ok, false);
  b.take('player_update');
  const r = await a.req('companion', { id: friends[0].id });
  assert.ok(r.ok, r.reason); assert.equal(r.family.companion, friends[0].id);
  assert.deepEqual(r.kids.map(k => !!k.comp), [false, true]);
  const up = b.last('player_update');
  assert.ok(up && up.player.kids.some(k => k.comp && k.sp === 'longear'), 'ほかの子へ 名札と見た目');
  const r2 = await a.req('companion', { id: friends[1].id });
  assert.equal(r2.swapped, friends[0].id); assert.equal(a.player.kids.filter(k => k.comp).length, 1, '同時に 1 匹');
  // 歩く → b のスナップショットの行に 2 つの位置（若者・なかま）
  const p = a.player;
  for (let i = 0; i < 50; i++) { a.inputs([{ mx: 1 }, { mx: 1 }, { mx: 1 }]); ticks(H, 1); }
  ticks(H, 2);
  const row = b.last('snapshot').players.find(q => q.id === a.account.id);
  assert.ok(row && row.k && row.k.length === 2, JSON.stringify(row && row.k));
  const d1 = Math.hypot(row.k[1][0] - p.st.x, row.k[1][1] - p.st.y);
  assert.ok(d1 > FOLLOW.GAP0 + 4 && d1 <= FOLLOW.GAP0 + FOLLOW.GAP + 3, 'なかまは若者の後ろ ' + d1);
  // 入りなおしても（DB の家の印）
  a.close(); ticks(H, 2);
  const a2 = new FakeClient(H.game);
  const w = await a2.enter('compa001');
  assert.equal(w.family.companion, friends[1].id);
  assert.equal(w.you.kids.filter(k => k.comp).length, 1);
  assert.equal((await a2.req('companion', { id: null })).family.companion, null);
  assert.equal(a2.player.kids.filter(k => k.comp).length, 0);
  H.close();
});

await test('富山の出来事：サーバーが条件を確かめる（土地・季節・時刻・位置・図鑑）・1 回だけ（account_flags）・入りなおしても world.collection.tev', async () => {
  const H = await makeGame({ clock: { t: NIGHT }, gameOpts: { devMode: true, env: true } });
  const a = new FakeClient(H.game);
  await a.enter('toyam001');
  assert.equal((await a.req('toyama_event', { id: 'board' })).ok, false, 'はじまりの原では起きない');
  assert.equal((await a.req('toyama_event', { id: 'xx' })).ok, false);
  await a.req('dev', { region: 'toyama', season: 'summer' });
  const phone = regionMap('toyama').props.find(q => q.kind === 'phone');
  a.place(phone.x + 60, phone.y);
  assert.equal((await a.req('toyama_event', { id: 'board' })).ok, false, '遠い');
  a.place(phone.x, phone.y + 4);
  const b1 = await a.req('toyama_event', { id: 'board' });
  assert.ok(b1.ok, b1.reason); assert.equal(b1.first, true);
  const b2 = await a.req('toyama_event', { id: 'board' });
  assert.equal(b2.ok, true); assert.equal(b2.first, false, '二度目は起きない');
  assert.equal((await a.req('toyama_event', { id: 'train' })).ok, false, '23 時');
  await a.req('dev', { hour: 4 + 46 / 60 });
  assert.equal((await a.req('toyama_event', { id: 'train' })).first, true);
  assert.equal((await a.req('toyama_event', { id: 'white_near' })).ok, false, '不思議な品が そろっていない');
  await a.req('dev', { hour: 22, collect: CROSSOVER });
  assert.equal((await a.req('toyama_event', { id: 'white_near' })).first, true);
  assert.equal((await a.req('toyama_event', { id: 'footprints' })).ok, false, '夏');
  await a.req('dev', { season: 'winter' });
  a.place(FOOT_END.x, FOOT_END.y);
  assert.equal((await a.req('toyama_event', { id: 'footprints' })).first, true);
  const rows = H.store.q("SELECT key FROM account_flags WHERE account_id = ? AND key LIKE 'tev:%' ORDER BY key").all(a.account.id).map(r => r.key);
  assert.deepEqual(rows, ['tev:board', 'tev:footprints', 'tev:train', 'tev:white_near']);
  a.close(); ticks(H, 2);
  const a2 = new FakeClient(H.game);
  const w = await a2.enter('toyam001');
  assert.deepEqual(Object.keys(w.collection.tev).sort(), ['board', 'footprints', 'train', 'white_near']);
  a2.place(FOOT_END.x, FOOT_END.y);
  assert.equal((await a2.req('toyama_event', { id: 'footprints' })).first, false, '入りなおしても 二度目は無い');
  assert.equal(H.store.setFlagOnce(a2.account.id, 'tev:board', 1), 0, '二重に書かれない');
  H.close();
});

await test('巣の記録の tales：富山へ行ったことがある・地上へ出た なかま（訪問者にも同じ＝家族のやりとりの入力が同じ）', async () => {
  const H = await makeGame({ clock: { t: NIGHT }, gameOpts: { devMode: true } });
  const a = await withNest(H, 'talesa01'), b = new FakeClient(H.game);
  await b.enter('talesb01');
  await a.req('dev', { family: { pups: 2, friend: 1 } });
  const f = a.player.house.friends()[0];
  await a.req('companion', { id: f.id });
  assert.equal((await a.req('visit_policy', { policy: 'public' })).ok, true);
  a.place(a.ent.x, a.ent.y + 10);
  const ea = await a.req('enter_nest', { owner: a.account.id });
  assert.ok(ea.ok, ea.reason);
  assert.deepEqual(ea.nest.tales, { toyama: false, companion: f.id });
  H.store.setFlag(a.account.id, 'toyama', '1'); a.player.toyamaFound = true;
  b.place(a.ent.x, a.ent.y + 10);
  const eb = await b.req('enter_nest', { owner: a.account.id });
  assert.ok(eb.ok, eb.reason);
  assert.deepEqual(eb.nest.tales, { toyama: true, companion: f.id }, '訪問者にも');
  assert.deepEqual(eb.nest.family.map(m => m.id).sort(), ea.nest.family.map(m => m.id).sort());
  H.close();
});

done();
