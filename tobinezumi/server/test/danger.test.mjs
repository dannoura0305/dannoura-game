// トビネズミ サーバー：Ver.0.3「危険と土地」— 捕食者はサーバーが動かし、つかまる判定もサーバー。落とし物は先着 1 人。
// 土地を調べる・引っ越し（費用・冷却・入口が動く・フレンドへ）・入口をふさぐ・キツネの襲撃（留守なら次のログインで）・天気（水たまり・砂嵐・寒い夜）・
// 開発用の dev は devMode のときだけ・再起動しても残る（ふさぎ・土地・落とし物・出来事）。ws は使わない（偽の接続）。
import assert from 'node:assert/strict';
import { test, done, makeGame, FakeClient, tempDir, rmDir, makeFieldState } from './harness.mjs';
import { countItem } from '../../shared/items.js';
import { TILE, canDigBurrow, isBlocking } from '../../shared/regions.js';
import { boxFree } from '../../shared/move.js';
import { DAY_MS, HOUR_MS } from '../../shared/daynight.js';
import { landAt, relocateCost, inSafeZone, RELOCATE_COOLDOWN_MS } from '../../shared/lands.js';
import { inGrass, INVULN_MS, RAID_COOLDOWN_MS, PRED_DT } from '../../shared/predators.js';
import { CAUGHT_COND } from '../../shared/life.js';
import { ENV } from '../../shared/season.js';
import { PLUG_COST } from '../../shared/protocol.js';
import { CELL } from '../../shared/nest-rules.js';

console.log('tobinezumi server danger / land (Ver.0.3)');
const MIDNIGHT = DAY_MS * 1_200_000, NOON = MIDNIGHT + 12 * HOUR_MS;
const ON = { env: true, predators: 'normal', predSeed: 7, weather: 'clear' };

function openSpot(map, skip = 0) {
  for (let ty = 4; ty < map.h - 4; ty++) for (let tx = 2; tx < map.w - 30; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 10;
    let ok = true;
    for (let d = -110; d <= 200; d += 4) if (!boxFree(map, x + d, y) || inSafeZone(map, x + d, y, 12) || inGrass(map, x + d, y)) { ok = false; break; }
    if (ok && skip-- <= 0) return { x, y };
  }
  throw new Error('no open spot');
}
function digSpot(map, entrances, skip = 0) {
  for (let ty = 6; ty < map.h - 6; ty++) for (let tx = 6; tx < map.w - 6; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160 || landAt(map, x, y).hardness >= 4) continue;
    if (canDigBurrow(map, x, y, entrances).ok) { if (skip-- > 0) continue; return { x, y }; }
  }
  throw new Error('no dig spot');
}
/** clock を 50ms ずつ進めてティック。each(i) で入力を送る */
function ticks(H, n, each = null) { for (let i = 0; i < n; i++) { if (each) each(i); H.clock.t += 50; H.game.tick(); } }
const wiggle = c => i => c.inputs([0, 1, 2].map(() => ({ mx: 0, my: Math.floor(i / 10) % 2 ? 1 : -1 })));
async function withNest(H, user, skip = 0) {
  const c = new FakeClient(H.game);
  await c.enter(user, 'password123', user.slice(0, 10));
  const s = digSpot(H.game.map, [...H.game.field.entrances.values()], skip);
  c.place(s.x, s.y);
  const d = await c.req('dig_burrow', {});
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}

await test('捕食者：スナップショットに preds・つかまる判定はサーバー（体調 −35・落とし物・安全な所・しばらく狙われない）・落とし物は先着 1 人', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT }, gameOpts: ON });
  const a = new FakeClient(H.game), b = new FakeClient(H.game);
  await a.enter('prey'); await b.enter('picker');
  const O = openSpot(H.game.map);
  a.place(O.x, O.y); b.place(O.x + 150, O.y);
  H.game.field.preds.spawnT = 1e9;
  const fox = H.game.field.preds.spawn('fox', O.x - 70, O.y);
  ticks(H, 4);
  const snap = b.last('snapshot');
  assert.ok(snap.preds.some(p => p.id === fox.id && p.kind === 'fox'), 'ほかの子にも同じ捕食者が見える');
  const before = a.player.inv.map(s => s && { ...s });
  let caught = null;
  for (let i = 0; i < 20 * 12 && !caught; i++) { ticks(H, 1, wiggle(a)); caught = a.last('caught'); }
  assert.ok(caught, 'つかまった');
  assert.equal(caught.kind, 'fox');
  assert.ok(caught.life.cond <= 100 - CAUGHT_COND + 0.01);
  assert.deepEqual([caught.x, caught.y], [H.game.map.spawn.x, H.game.map.spawn.y], '巣が無ければ出発点へ');
  assert.equal(a.player.st.x, H.game.map.spawn.x);
  assert.equal(caught.until, a.player.invulnUntil); assert.ok(caught.until - H.clock.t <= INVULN_MS);
  const lost = caught.drops.reduce((s, d) => s + d.n, 0);
  assert.ok(lost >= 3);
  assert.equal(before.reduce((s, x) => s + (x ? x.n : 0), 0) - a.player.inv.reduce((s, x) => s + (x ? x.n : 0), 0), lost, '落とした分だけ減る');
  assert.equal(countItem(H.store.charInventory(a.player.charId), 'seed'), countItem(a.player.inv, 'seed'), 'DB にも');
  const spawns = b.take('res_spawn').map(m => m.res).filter(r => r.id[0] === 'x');
  assert.equal(spawns.length, caught.drops.length, '落とし物はみんなに見える');
  assert.ok(b.take('toast').some(m => /つかまった/.test(m.text)));
  // 落とし物を b が拾う → a は拾えない（先着 1 人）
  const d = spawns[0];
  b.place(d.x, d.y); a.place(d.x, d.y + 2);
  const [rb, ra] = await Promise.all([b.req('pickup', { resId: d.id }), a.req('pickup', { resId: d.id })]);
  assert.equal(rb.ok, true, rb.reason); assert.equal(rb.n, d.n); assert.equal(ra.ok, false);
  // しばらく狙われない（無敵）
  const W = H.game.field.preds;
  W.preds = []; const f2 = W.spawn('fox', d.x - 40, d.y + 2);
  ticks(H, 30, wiggle(a));
  assert.ok(f2.target !== a.account.id, '無敵のあいだは狙われない');
  H.close(); rmDir(H.dir);
});

await test('逃げる：大ジャンプで逃げきる・入れる巣穴の入口（自分の巣）に飛び込むと手を出せない。捕食者は巣の中まで来ない', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT }, gameOpts: ON });
  const a = new FakeClient(H.game); await a.enter('runner');
  const O = openSpot(H.game.map);
  a.place(O.x, O.y);
  const W = H.game.field.preds; W.spawnT = 1e9;
  const fox = W.spawn('fox', O.x - 70, O.y);
  let threatened = false;
  for (let i = 0; i < 20 * 9; i++) {
    const th = fox.target === a.account.id && ['alert', 'chase'].includes(fox.state);
    if (th) threatened = true;
    ticks(H, 1, threatened ? () => a.inputs([{ mx: 1, my: 0, jump: a.player.st.cd <= 0 }, { mx: 1, my: 0 }, { mx: 1, my: 0 }]) : wiggle(a));
  }
  assert.ok(threatened, '見つかった'); assert.equal(a.last('caught'), null, '大ジャンプで逃げきった');
  // 自分の巣の入口に飛び込む
  const b = await withNest(H, 'burrower');
  b.place(b.ent.x, b.ent.y + 4);
  H.game.field.raidViewT = 0;
  W.preds = []; W.spawn('fox', b.ent.x - 40, b.ent.y + 4);
  ticks(H, 20 * 6);
  assert.equal(b.last('caught'), null, '入口のそば（隠れ家）');
  const e = await b.req('enter_nest', { owner: b.account.id });
  assert.equal(e.ok, true);
  ticks(H, 20 * 3);
  assert.equal(b.last('caught'), null);
  assert.ok(!H.game.field.players.has(b.account.id), '巣の中は地上にいない（捕食者から見えない）');
  H.close(); rmDir(H.dir);
});

await test('土地を調べる・巣を掘ると土地（区画）を持つ・引っ越し（費用・中身はそのまま・入口が動く・ほかの子とフレンドへ・10 分に 1 回）', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { ...ON, predators: 'off' } });
  const a = await withNest(H, 'mover'), f = new FakeClient(H.game);
  await f.enter('friendy');
  await f.req('friend_req', { name: 'mover' }); await a.req('friend_ok', { id: f.account.id });
  const sv0 = await a.req('survey', {});
  assert.equal(sv0.ok, true); assert.equal(sv0.land.id, landAt(H.game.map, a.player.st.x, a.player.st.y).id);
  assert.equal(sv0.here.hasNest, true); assert.equal(sv0.here.nests, 1);
  assert.equal((await a.req('survey', {})).code, 'rate', '1 秒あける');
  const nest = H.store.nestByOwner(a.account.id);
  assert.equal(nest.plot, landAt(H.game.map, a.ent.x, a.ent.y).id); assert.equal(nest.land.id, nest.plot);
  // 巣を作り込む
  a.place(a.ent.x, a.ent.y + 10);
  const e = await a.req('enter_nest', { owner: a.account.id });
  const r1 = await a.req('nest_op', { nestId: e.nest.id, rev: e.nest.rev, op: { op: 'set-kind', id: e.nest.data.rooms[0].id, kind: 'store' } });
  assert.equal(r1.ok, true, r1.reason);
  await a.req('store', { nestId: e.nest.id, dir: 'deposit', item: 'seed', n: 2 });
  // 訪問者が中にいる
  await a.req('visit_policy', { policy: 'public' });
  await a.req('leave_nest');
  f.place(a.ent.x, a.ent.y + 10);
  assert.equal((await f.req('enter_nest', { owner: a.account.id })).ok, true);
  const dataBefore = JSON.stringify(H.store.nest(nest.id).data), storBefore = JSON.stringify(H.store.nestStorage(nest.id));
  // 引っ越し
  const far = digSpot(H.game.map, [...H.game.field.entrances.values()], 60);
  a.place(far.x, far.y);
  a.player.inv = [{ id: 'pebble', n: 1 }, null, null, null, null, null, null, null];
  assert.match((await a.req('relocate', {})).reason, /素材が足りない/);
  a.player.inv = [{ id: 'pebble', n: 30 }, { id: 'grass', n: 30 }, null, null, null, null, null, null];
  const g = new FakeClient(H.game); await g.enter('watcher'); g.take('entrance');
  const r = await a.req('relocate', {});
  assert.equal(r.ok, true, r.reason);
  const cost = relocateCost(landAt(H.game.map, far.x, far.y));
  assert.equal(countItem(r.inv, 'pebble'), 30 - cost.pebble); assert.equal(countItem(H.store.charInventory(a.player.charId), 'grass'), 30 - cost.grass);
  const n2 = H.store.nest(nest.id);
  assert.ok(Math.hypot(n2.x - far.x, n2.y - far.y) < 12, '入口が動いた（DB）');
  assert.notEqual(n2.landId, nest.landId, '新しい土地を指す');
  assert.equal(n2.plot, landAt(H.game.map, n2.x, n2.y).id);
  assert.equal(JSON.stringify(n2.data), dataBefore, '巣の中はそのまま'); assert.equal(JSON.stringify(H.store.nestStorage(nest.id)), storBefore, '倉庫もそのまま');
  const em = g.take('entrance').find(m => m.entrance.owner === a.account.id);
  assert.ok(em && em.moved && em.from, 'ほかの子に入口の引っ越しが届く');
  const fl = f.take('friends').pop();
  assert.ok(fl && fl.list.find(x => x.id === a.account.id).nest.x === n2.x, 'フレンドの一覧の巣の場所も新しい所');
  // 中にいた訪問者は、出ると新しい入口から
  const lv = await f.req('leave_nest');
  assert.equal(lv.ok, true); assert.deepEqual([lv.x, lv.y], [n2.x, n2.y + 12]);
  // 10 分は引っ越せない
  const far2 = digSpot(H.game.map, [...H.game.field.entrances.values()], 120);
  a.place(far2.x, far2.y);
  const cd = await a.req('relocate', {});
  assert.equal(cd.code, 'rate'); assert.ok(cd.cooldownMs > 0);
  H.clock.t += RELOCATE_COOLDOWN_MS + 1000;
  assert.equal((await a.req('relocate', {})).ok, true);
  // 巣が無い子は引っ越せない
  assert.equal((await g.req('relocate', {})).code, 'not_found');
  H.close(); rmDir(H.dir);
});

await test('入口をふさぐ（巣の中から・小石 2・ひらくと 1 戻る）：訪問者は入れない・逃げ込めない／キツネの襲撃：ふさいでいれば無事、いなければ種子 1 割・留守なら次のログインで', async () => {
  const H = await makeGame({ clock: { t: MIDNIGHT }, gameOpts: ON });
  const a = await withNest(H, 'plugger'), v = new FakeClient(H.game);
  await v.enter('visitor1');
  await a.req('visit_policy', { policy: 'public' });
  assert.equal((await a.req('plug', { on: true })).code, 'forbidden', '巣の中から');
  a.place(a.ent.x, a.ent.y + 10);
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.equal(e.nest.plugged, false);
  const peb = countItem(a.player.inv, 'pebble');
  const p1 = await a.req('plug', { on: true });
  assert.equal(p1.ok, true, p1.reason); assert.equal(countItem(p1.inv, 'pebble'), peb - PLUG_COST.pebble);
  assert.equal(H.store.nest(e.nest.id).plugged, true);
  v.place(a.ent.x, a.ent.y + 10);
  const ve = await v.req('enter_nest', { owner: a.account.id });
  assert.equal(ve.ok, false); assert.match(ve.reason, /ふさがれて/);
  assert.equal(H.game.canShelter(v.player, H.game.field.entrances.get(a.account.id)), false, 'ふさいだ入口には逃げ込めない');
  assert.equal(H.game.canShelter(a.player, H.game.field.entrances.get(a.account.id)), true);
  assert.ok(v.take('entrance').some(m => m.entrance.owner === a.account.id && m.entrance.plugged), '地上の子にふさいだ入口が見える');
  // 倉庫に種子
  const storage = H.store.nestStorage(e.nest.id); storage[0] = { id: 'seed', n: 40 }; H.store.setNestStorage(e.nest.id, storage);
  // 所有者が巣の中 → 襲撃の対象にならない
  assert.equal(H.game.raidInfo(H.game.field.entrances.get(a.account.id), H.clock.t).raidable, false);
  await a.req('leave_nest');
  assert.equal(H.game.raidInfo(H.game.field.entrances.get(a.account.id), H.clock.t).raidable, true);
  // ふさいでいる：無事（blocked）
  let r = H.game.raid({ nestId: e.nest.id, blocked: true });
  assert.deepEqual(r, { kind: 'blocked', lost: 0 });
  assert.equal(countItem(H.store.nestStorage(e.nest.id), 'seed'), 40);
  assert.equal(a.take('raid').pop().kind, 'blocked');
  assert.equal(H.game.raidInfo(H.game.field.entrances.get(a.account.id), H.clock.t).raidable, false, '1 日に 1 回まで');
  // ひらく → 掘られる
  a.place(a.ent.x, a.ent.y + 10); await a.req('enter_nest', { owner: a.account.id });
  H.clock.t += 1500;
  const p2 = await a.req('plug', { on: false });
  assert.equal(p2.ok, true); assert.equal(countItem(p2.inv, 'pebble'), peb - 1);
  await a.req('leave_nest');
  // 実際にキツネが来て掘る（留守・夜・冷却が終わってから）
  H.clock.t += RAID_COOLDOWN_MS + 1000;
  H.game.nests.forget(e.nest.id);
  a.close();       // 所有者は留守（ログアウト）
  const ent0 = H.game.field.entrances.get(a.account.id);
  v.place(ent0.x + 150, ent0.y);     // 地上にだれかいないと捕食者は立ち去る（じっとしていて気づかれない子）
  const W = H.game.field.preds; W.spawnT = 1e9; W.preds = [];
  const ent = H.game.field.entrances.get(a.account.id);
  W.spawn('fox', ent.x + 30, ent.y);
  H.game.field.raidViewT = 0;
  const ra0 = H.store.nest(e.nest.id).raidedAt;
  for (let i = 0; i < 20 * 120 && H.store.nest(e.nest.id).raidedAt === ra0; i++) { H.clock.t += 50; H.game.tick(); }
  assert.ok(H.store.nest(e.nest.id).raidedAt > ra0, 'キツネが掘った');
  const left = countItem(H.store.nestStorage(e.nest.id), 'seed');
  assert.equal(left, 36, '1 割（4）取られた');
  // 次のログインで知らせる（1 回）
  const a2 = new FakeClient(H.game);
  const w = await a2.enter('plugger');
  assert.equal(w.raids.length, 1); assert.equal(w.raids[0].kind, 'raid'); assert.equal(w.raids[0].lost, 4);
  a2.close();
  const a3 = new FakeClient(H.game);
  assert.equal((await a3.enter('plugger')).raids.length, 0, '1 回だけ');
  H.close(); rmDir(H.dir);
});

await test('天気：雨で水たまり（飲める +20・拾えない）→ やむと乾く／砂嵐で遅い・物かげでないと体調が減る／冬の夜は巣の外だけ寒い／dev は devMode のときだけ', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { ...ON, predators: 'off', weather: 'rain', devMode: true } });
  const a = new FakeClient(H.game), b = new FakeClient(H.game);
  await a.enter('rainy'); await b.enter('rainy2');
  for (let i = 0; i < 12; i++) { H.clock.t += ENV.PUDDLE_SPAWN_MS; H.game.tick(); }
  const pud = [...H.game.field.resources.values()].filter(r => r.kind === 'puddle');
  assert.ok(pud.length >= 5 && pud.length <= ENV.PUDDLE_MAX, '水たまり ' + pud.length);
  assert.ok(b.take('res_spawn').some(m => m.res.kind === 'puddle'), 'みんなに見える');
  a.player.life.thirst = 40; a.place(pud[0].x, pud[0].y);
  const dr = await a.req('drink', { resId: pud[0].id });
  assert.equal(dr.ok, true); assert.equal(dr.src, 'puddle'); assert.equal(Math.round(dr.life.thirst), 60);
  H.clock.t += 500; a.place(pud[1].x, pud[1].y);
  assert.equal((await a.req('pickup', { resId: pud[1].id })).code, 'rule');
  // dev：天気を切り替える → 全員に clock
  const dv = await a.req('dev', { weather: 'sandstorm' });
  assert.equal(dv.ok, true); assert.equal(b.last('clock').clock.weather, 'sandstorm');
  for (let i = 0; i < 10; i++) { H.clock.t += ENV.PUDDLE_SPAWN_MS; H.game.tick(); }
  assert.equal([...H.game.field.resources.values()].filter(r => r.kind === 'puddle').length, 0, 'やむと乾く');
  // 砂嵐：遅い（サーバーの確定位置）
  const O = openSpot(H.game.map);
  a.place(O.x, O.y);
  ticks(H, 20, () => a.inputs([0, 1, 2].map(() => ({ mx: 1, my: 0 }))));
  assert.ok(Math.abs((a.player.st.x - O.x) - 74 * 0.8) < 3, '×0.8 ' + (a.player.st.x - O.x));
  const c0 = a.player.life.cond;
  ticks(H, 20 * 30);
  assert.ok(c0 - a.player.life.cond > 100 / ENV.STORM_COND_SEC * 30 * 0.9, '体調が減る');
  assert.ok(a.take('life').some(m => m.env && /砂嵐/.test(m.env[0])), '理由も届く');
  // 冬の夜：巣の外は寒い、巣の中は平気
  await a.req('dev', { weather: 'clear', season: 'winter' });
  H.clock.t = MIDNIGHT + 3 * DAY_MS * 10;
  H.game._lifeAt = H.clock.t;
  const n = await withNest(H, 'coldnest');
  n.place(n.ent.x + 30, n.ent.y + 30);
  let c1 = n.player.life.cond; ticks(H, 20 * 20);
  const fieldDrop = c1 - n.player.life.cond;
  n.place(n.ent.x, n.ent.y + 10); await n.req('enter_nest', { owner: n.account.id });
  c1 = n.player.life.cond; ticks(H, 20 * 20);
  const nestDrop = c1 - n.player.life.cond;
  assert.ok(fieldDrop > nestDrop * 2, `寒い夜：外 ${fieldDrop} > 巣 ${nestDrop}`);
  // devMode でなければ dev は使えない
  const H2 = await makeGame({ clock: { t: NOON }, gameOpts: ON });
  const z = new FakeClient(H2.game); await z.enter('nodev');
  assert.equal((await z.req('dev', { weather: 'rain' })).code, 'forbidden');
  H2.close(); rmDir(H2.dir);
  H.close(); rmDir(H.dir);
});

await test('再起動しても残る：ふさいだ入口・引っ越した土地・落とし物（数・期限）・襲撃の記録', async () => {
  const dir = tempDir();
  let H = await makeGame({ dir, clock: { t: NOON }, gameOpts: { ...ON, predators: 'off' } });
  const a = await withNest(H, 'keeper');
  a.place(a.ent.x, a.ent.y + 10);
  const e = await a.req('enter_nest', { owner: a.account.id });
  await a.req('plug', { on: true });
  await a.req('leave_nest');
  const drops = H.game.field.placeDrops([{ id: 'seed', n: 4 }], [{ x: a.ent.x + 40, y: a.ent.y }]);
  a.close();     // ログアウト（留守）→ 襲撃の記録は既読でない
  H.game.raid({ nestId: e.nest.id, blocked: true });
  const nest0 = H.store.nest(e.nest.id);
  H.game.shutdown(); H.store.close();
  H = await makeGame({ dir, clock: H.clock, gameOpts: { ...ON, predators: 'off' } });
  const n1 = H.store.nest(e.nest.id);
  assert.equal(n1.plugged, true); assert.equal(n1.plot, nest0.plot); assert.equal(n1.land.id, nest0.plot);
  const r = H.game.field.resources.get(drops[0].id);
  assert.ok(r, '落とし物が残る'); assert.equal(r.n, 4); assert.equal(r.exp, drops[0].exp);
  assert.ok(H.game.field.entrances.get(a.account.id), '入口も');
  const b = new FakeClient(H.game);
  const w = await b.enter('keeper');
  assert.equal(w.raids.length, 1); assert.equal(w.raids[0].kind, 'blocked');
  assert.equal(w.you.nest.plugged, true); assert.equal(w.you.nest.land.id, nest0.plot);
  assert.ok(w.entrances.find(x => x.owner === b.account.id).plugged);
  // 落とし物は期限で消える
  H.clock.t = r.exp + 1; H.game.tick();
  assert.equal(H.game.field.resources.get(drops[0].id), undefined);
  H.close(); rmDir(dir);
});

await test('希少資源：区画に 1 つずつ出る・拾うと次は 8〜12 分後・珍しい種を食べると空腹 +40・体調 +10', async () => {
  const H = await makeGame({ clock: { t: NOON }, gameOpts: { ...ON, predators: 'off' } });
  const a = new FakeClient(H.game); await a.enter('rarey');
  for (let i = 0; i < 3; i++) { H.clock.t += 9 * 60 * 1000; H.game.field.puddleT = 0; H.game.tick(); }
  const rares = [...H.game.field.resources.values()].filter(r => r.id[0] === 'g');
  assert.ok(rares.length >= 5, '希少資源 ' + rares.length);
  const plots = new Set(rares.map(r => landAt(H.game.map, r.x, r.y).id));
  assert.equal(plots.size, rares.length, '区画に 1 つ');
  for (const r of rares) assert.equal(landAt(H.game.map, r.x, r.y).rare, r.kind);
  const seed = rares.find(r => r.kind === 'rare_seed');
  a.place(seed.x, seed.y);
  const pk = await a.req('pickup', { resId: seed.id });
  assert.equal(pk.ok, true, pk.reason); assert.equal(countItem(pk.inv, 'rare_seed'), 1);
  assert.equal(H.game.field.respawns.length, 0, '再出現待ちには積まない');
  a.player.life = { hunger: 30, thirst: 50, cond: 50, sleep: false };
  const e = await a.req('eat', { from: 'inv', item: 'rare_seed' });
  assert.equal(e.ok, true, e.reason); assert.equal(e.life.hunger, 70); assert.equal(e.life.cond, 60); assert.equal(e.item, 'rare_seed');
  H.clock.t += 500;
  assert.equal((await a.req('eat', { from: 'inv', item: 'rare_seed' })).reason, '珍しい種を持っていない');
  H.close(); rmDir(H.dir);
});

await test('マイグレーション 003 → 004：今ある巣の土地に区画と性能が入る', async () => {
  const { Store, openDb } = await import('../db.js');
  const { join } = await import('node:path');
  const dir = tempDir(), file = join(dir, 'game.db');
  const old = new Store(file);
  await old.migrate({ upTo: 3 });
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('landy', 'x', 1)");
  old.db.exec("INSERT INTO lands (region_id, x, y, info) VALUES ('steppe', 200, 300, '{}')");
  old.db.prepare("INSERT INTO nests (owner_account_id, land_id, schema_version, rev, data, visit_policy, created_at, updated_at) VALUES (1, 1, 1, 1, '{}', 'private', 1, 1)").run();
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 8);   // Ver.0.6 の 007 まで
  const n = db.nest(1);
  assert.equal(n.plot, 'L1-2'); assert.equal(n.land.id, 'L1-2'); assert.equal(n.plugged, false); assert.ok(n.land.hardness >= 1);
  db.close(); rmDir(dir);
});

done();
void PRED_DT; void CELL; void isBlocking; void makeFieldState;
