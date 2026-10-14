// サーバーの中身のテスト（ws 不要：偽の接続で Game を直接動かす）
//   認証・採集の排他・移動の検証・巣の権限と rev・訪問設定・チャット・再接続・再起動後の復元・マイグレーション・バックアップ／復元
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test, done, makeGame, FakeClient, findDigSpot, tempDir, rmDir, makeFieldState, stepField, STEP_DT } from './harness.mjs';
import { hashPassword, verifyPassword, RateLimiter } from '../auth.js';
import { openDb, Store } from '../db.js';
import { backupNow, restoreFrom, listBackups, checkBackup } from '../backup.js';
import { countItem } from '../../shared/items.js';
import { TILE, T, tileAt } from '../../shared/regions.js';
import { FIELD, boxFree } from '../../shared/move.js';
import { NEST_SCHEMA } from '../../shared/nest-rules.js';
import { dayPhase, respawnScale } from '../../shared/daynight.js';

console.log('tobinezumi server core');

// ───────── 認証 ─────────
await test('パスワードは scrypt（平文を保存しない・照合できる）', async () => {
  const h = await hashPassword('correct horse');
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.ok(!h.includes('correct horse'));
  assert.equal(await verifyPassword('correct horse', h), true);
  assert.equal(await verifyPassword('wrong horse', h), false);
  assert.equal(await verifyPassword('x', 'garbage'), false);
});

await test('登録・ログイン・token で hello・ログアウトで token 失効・重複は taken', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  assert.equal((await a.req('register', { username: 'ab', password: 'password1' })).ok, false, 'ユーザー名が短い');
  assert.equal((await a.req('register', { username: 'abc', password: 'short' })).ok, false, 'パスワードが短い');
  assert.equal((await a.req('register', { username: 'bad name!', password: 'password1' })).ok, false);
  const r = await a.req('register', { username: 'alice', password: 'password1' });
  assert.equal(r.ok, true); assert.ok(r.token.length >= 40);
  assert.equal((await new FakeClient(H.game).req('register', { username: 'ALICE', password: 'password1' })).code, 'taken', '大文字小文字は同じ扱い');
  const row = H.store.db.prepare('SELECT pass_hash FROM accounts WHERE username = ?').get('alice');
  assert.ok(row.pass_hash.startsWith('scrypt$'));
  assert.ok(!H.store.db.prepare('SELECT * FROM sessions').all().some(s => s.token_hash === r.token), 'token は SHA-256 だけ保存');
  const b = new FakeClient(H.game);
  const h = await b.req('hello', { v: 1, token: r.token });
  assert.equal(h.ok, true); assert.equal(h.account.username, 'alice');
  assert.equal((await b.req('hello', { v: 99 })).ok, false, '版が違う');
  await b.req('logout');
  const h2 = await new FakeClient(H.game).req('hello', { v: 1, token: r.token });
  assert.equal(h2.account, undefined, 'ログアウトした token は使えない');
  assert.equal(h2.expired, true);
  const l = await new FakeClient(H.game).req('login', { username: 'alice', password: 'password1' });
  assert.equal(l.ok, true);
  assert.equal((await new FakeClient(H.game).req('login', { username: 'alice', password: 'nope-nope' })).code, 'auth');
  H.close(); rmDir(H.dir);
});

await test('token の期限（30 日）が切れると hello はログイン前の扱い', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  const r = await a.req('register', { username: 'timey', password: 'password1' });
  H.clock.t += 29 * 86400000;
  assert.ok((await new FakeClient(H.game).req('hello', { v: 1, token: r.token })).account);
  H.clock.t += 2 * 86400000;
  const h = await new FakeClient(H.game).req('hello', { v: 1, token: r.token });
  assert.equal(h.account, undefined);
  H.close(); rmDir(H.dir);
});

await test('ログインの失敗が続くと rate で止める（ユーザー名ごと・時間がたてば解除）', async () => {
  const H = await makeGame();
  await new FakeClient(H.game).req('register', { username: 'target', password: 'password1' });
  const c = new FakeClient(H.game, '10.0.0.9');
  for (let i = 0; i < 5; i++) assert.equal((await c.req('login', { username: 'target', password: 'wrong' + i })).code, 'auth');
  const r = await c.req('login', { username: 'target', password: 'password1' });
  assert.equal(r.code, 'rate', '正しいパスワードでも、しばらくは止める');
  H.clock.t += 5 * 60 * 1000 + 1;
  assert.equal((await c.req('login', { username: 'target', password: 'password1' })).ok, true);
  const rl = new RateLimiter({ max: 2, windowMs: 1000, now: () => H.clock.t });
  rl.hit('k'); assert.equal(rl.blocked('k'), false); rl.hit('k'); assert.equal(rl.blocked('k'), true);
  H.close(); rmDir(H.dir);
});

await test('キャラクター：名前・毛色の検査、1 アカウント 1 匹、個体（家系の器）も作る', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  await a.req('register', { username: 'chara', password: 'password1' });
  assert.equal((await a.req('join_field')).ok, false, 'キャラが無いと地上へ出られない');
  assert.equal((await a.req('create_char', { name: '', fur: 'sand' })).ok, false);
  assert.equal((await a.req('create_char', { name: 'あいうえおかきくけこさ', fur: 'sand' })).ok, false);
  assert.equal((await a.req('create_char', { name: 'ぴょん', fur: 'blue' })).ok, false);
  const c = await a.req('create_char', { name: 'ぴょん', fur: 'cream' });
  assert.equal(c.ok, true); assert.equal(c.character.individual.genes.fur, 'cream'); assert.equal(c.character.individual.father_id, null);
  assert.equal((await a.req('create_char', { name: 'もう一匹', fur: 'sand' })).ok, false);
  const j = await a.req('join_field');
  assert.equal(j.ok, true); assert.equal(countItem(j.world.you.inv, 'seed'), 6);
  assert.equal(j.world.resources.length, 90);
  H.close(); rmDir(H.dir);
});

// ───────── 移動の検証 ─────────
await test('移動：入力は stepField で当てる（クライアントの予測と一致）・ack が進む', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  await a.enter('mover');
  let local = makeFieldState(a.world.you.x, a.world.you.y);
  const list = [];
  for (let i = 0; i < 40; i++) list.push({ mx: i < 20 ? 1 : 0, my: i >= 20 ? 1 : 0, jump: i === 25 });
  const sent = a.inputs(list);
  for (const i of sent) local = stepField(local, i, STEP_DT, H.game.map);
  H.clock.t += 1000; H.game.tick(); H.game.tick();
  const snap = a.last('snapshot');
  assert.equal(snap.ack, 40);
  assert.equal(snap.you.x, local.x); assert.equal(snap.you.y, local.y);
  assert.deepEqual(snap.you.jump, local.jump);
  // 古い seq の入力（リプレイ）は当てない
  a.send({ t: 'input', inputs: [{ seq: 5, mx: 1, my: 0 }] });
  H.game.tick(); H.game.tick();
  assert.equal(a.last('snapshot').you.x, local.x);
  H.close(); rmDir(H.dir);
});

await test('移動：速度上限（入力を連打しても 1 秒 60 入力ぶんまで）・変な値は ±1 に丸める', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  await a.enter('speedy');
  // 右へ 300px まっすぐ通れる所を探す
  let row = null;
  for (let ty = 5; ty < 60 && !row; ty++) for (let tx = 3; tx < 70 && !row; tx++) {
    const x0 = tx * TILE + 8, y0 = ty * TILE + 8;
    let ok = true; for (let x = x0; x <= x0 + 300 && ok; x += 2) if (!boxFree(H.game.map, x, y0)) ok = false;
    if (ok) row = { x: x0, y: y0 };
  }
  assert.ok(row, '開けた行');
  const p = a.place(row.x, row.y);
  const t0 = H.clock.t;
  // 0.1 秒のあいだに 600 入力（本来 10 秒ぶん）を送る
  for (let k = 0; k < 20; k++) a.inputs(new Array(30).fill({ mx: 5, my: 0 }));
  H.clock.t = t0 + 100; H.game.tick(); H.game.tick();
  const moved = p.st.x - row.x;
  const maxSteps = 90 + 0.1 * 60 + 1;   // 貯め（1.5 秒）＋経過時間ぶん
  assert.ok(moved <= maxSteps * FIELD.HOP_SPEED * STEP_DT + 0.01, `速すぎる：${moved}px`);
  assert.ok(moved > 0, '少しは進む');
  assert.equal(a.last('snapshot').ack, a.seq, '捨てた入力も ack は進む（クライアントは巻き戻される）');
  assert.ok(p.dropped > 0);
  H.close(); rmDir(H.dir);
});

await test('移動：大ジャンプのクールダウン 1.2 秒・岩は越えられない・壁を通り抜けない', async () => {
  const H = await makeGame();
  const map = H.game.map;
  const a = new FakeClient(H.game);
  await a.enter('jumper');
  // 右どなりが岩のタイルを探す
  let spot = null;
  for (let ty = 3; ty < map.h - 3 && !spot; ty++) for (let tx = 3; tx < map.w - 8 && !spot; tx++) {
    if (tileAt(map, tx + 1, ty) === T.ROCK && [T.SAND, T.DIRT, T.GRASS].includes(tileAt(map, tx, ty)) && [T.SAND, T.DIRT, T.GRASS].includes(tileAt(map, tx, ty - 1)) && [T.SAND, T.DIRT, T.GRASS].includes(tileAt(map, tx - 1, ty))) spot = { tx, ty };
  }
  assert.ok(spot, '岩の左どなり');
  const p = a.place(spot.tx * TILE + 8, spot.ty * TILE + 15);
  const rockLeft = (spot.tx + 1) * TILE;
  // 右へ押し続ける・右へ大ジャンプを連打
  for (let k = 0; k < 10; k++) a.inputs(new Array(30).fill(0).map((_, i) => ({ mx: 1, my: 0, jump: i % 3 === 0 })));
  let jumps = 0, was = false, maxX = 0;
  for (let k = 0; k < 20; k++) { H.clock.t += 50; H.game.tick(); if (p.st.jump && !was) jumps++; was = !!p.st.jump; maxX = Math.max(maxX, p.st.x); }
  assert.ok(maxX + FIELD.BW <= rockLeft + 0.01, `岩にめり込んだ：${maxX}`);
  // クールダウン：同じ入力列を 1 歩ずつ当てて数える（サーバーは stepField と同じ結果）
  let s = makeFieldState(10 * TILE, 10 * TILE), n = 0, prevJ = false;
  for (let i = 0; i < 120; i++) { s = stepField(s, { mx: 0, my: 1, jump: true }, STEP_DT, map); if (s.jump && !prevJ) n++; prevJ = !!s.jump; }
  assert.ok(n <= 2, `2 秒で ${n} 回跳んだ（クールダウン 1.2 秒）`);
  // サーバー側でも：ジャンプ直後にもう一度押しても新しいジャンプは始まらない
  a.place(map.spawn.x, map.spawn.y);
  a.inputs([{ mx: 0, my: 1, jump: true }]); H.game.tick();
  const firstCd = p.st.cd; assert.ok(firstCd > 1.1);
  a.inputs(new Array(40).fill({ mx: 0, my: 1, jump: true })); H.clock.t += 1000; H.game.tick();
  assert.ok(p.st.cd < firstCd && p.st.cd > 0.3, 'クールダウン中は跳ばない');
  H.close(); rmDir(H.dir);
});

// ───────── 採集 ─────────
await test('採集：同じ種を 2 人が同時に拾っても先着 1 人だけ（10 人でも 1 人）', async () => {
  const H = await makeGame();
  const cs = [];
  for (let i = 0; i < 10; i++) { const c = new FakeClient(H.game); await c.enter('picker' + i); cs.push(c); }
  const res = cs[0].world.resources[0];
  for (const c of cs) c.place(res.x + 3, res.y);
  const before = cs.map(c => countItem(c.player.inv, res.kind));
  const results = await Promise.all(cs.map(c => c.req('pickup', { resId: res.id })));
  const oks = results.filter(r => r.ok);
  assert.equal(oks.length, 1, '1 人だけ');
  assert.ok(results.filter(r => !r.ok).every(r => r.code === 'not_found'));
  const after = cs.map(c => countItem(c.player.inv, res.kind));
  assert.equal(after.reduce((a, b) => a + b, 0) - before.reduce((a, b) => a + b, 0), 1, '合計でも 1 個だけ増えた');
  // DB でも：資源は消え、再出現待ちが 1 つ
  assert.equal(H.store.db.prepare('SELECT COUNT(*) n FROM world_resources WHERE id = ?').get(res.id).n, 0);
  assert.equal(H.store.respawnQueue().length, 1);
  // みんなに res_gone
  for (const c of cs) assert.ok(c.inbox.some(m => m.t === 'res_gone' && m.id === res.id));
  // 持ち物は DB に保存済み
  const winner = cs[results.findIndex(r => r.ok)];
  assert.deepEqual(H.store.charInventory(winner.player.charId), winner.player.inv);
  H.close(); rmDir(H.dir);
});

await test('採集：距離（サーバーの確定位置で 28px）・持ち物の空き・再出現（2〜5 分後に別の場所）', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game);
  await a.enter('gatherer');
  const r = a.world.resources[3];
  a.place(r.x + 40, r.y);
  assert.equal((await a.req('pickup', { resId: r.id })).code, 'too_far');
  a.place(r.x + 20, r.y);
  assert.equal((await a.req('pickup', { resId: r.id })).ok, true);
  assert.equal((await a.req('pickup', { resId: r.id })).code, 'not_found');
  // いっぱい
  const p = a.player; p.inv = p.inv.map((_, i) => ({ id: 'pebble', n: 99 })); if (r.kind === 'pebble') p.inv = p.inv.map(() => ({ id: 'grass', n: 99 }));
  const r2 = a.world.resources.find(x => x.kind === r.kind && x.id !== r.id);
  a.place(r2.x, r2.y);
  assert.equal((await a.req('pickup', { resId: r2.id })).code, 'full');
  // 再出現
  // 待ち時間は 2〜5 分 × 時間帯の倍率（夜 ×0.45・昼 ×1.4・朝夕 ×0.75。shared/daynight.js）
  const q = H.store.respawnQueue()[0];
  const k = respawnScale(dayPhase(H.game.clock, H.clock.t));
  assert.ok(q.at - H.clock.t >= 120000 * k - 1 && q.at - H.clock.t <= 300000 * k + 1, `${q.at - H.clock.t} / ×${k}`);
  H.clock.t = q.at + 1; a.inbox = []; H.game.tick();
  // 夜に当たると夜露・夜の種子（id が d／n で始まる）も同時に出るので、それは数えない
  const isNight = x => x.id[0] === 'd' || x.id[0] === 'n';
  const sp = a.take('res_spawn').filter(m => !isNight(m.res));
  assert.equal(sp.length, 1); assert.equal(sp[0].res.kind, r.kind);
  assert.equal(H.store.respawnQueue().length, 0);
  assert.equal(H.store.resources().filter(x => !isNight(x)).length, 90);
  H.close(); rmDir(H.dir);
});

// ───────── 巣 ─────────
async function withNest(H, user, skip = 0) {
  const c = new FakeClient(H.game);
  await c.enter(user, 'password123', user.slice(0, 10));
  const spot = findDigSpot(H.game.map, [...H.game.field.entrances.values()], skip);
  c.place(spot.x, spot.y);
  const d = await c.req('dig_burrow', { x: 0, y: 0 });
  assert.equal(d.ok, true, d.reason);
  c.ent = d.entrance;
  return c;
}

await test('巣穴：掘る（1 つだけ・他の巣の近くは不可）→ 入口がみんなに出る', async () => {
  const H = await makeGame();
  const watcher = new FakeClient(H.game); await watcher.enter('watcher');
  const a = await withNest(H, 'digger');
  assert.equal(a.ent.own, true); assert.equal(a.ent.policy, 'private'); assert.equal(a.ent.name, 'digger');
  assert.equal((await a.req('dig_burrow', {})).reason, 'もう巣がある');
  const w = watcher.take('entrance');
  assert.equal(w.length, 1); assert.equal(w[0].entrance.own, false);
  const b = new FakeClient(H.game); await b.enter('nearby');
  b.place(a.ent.x + 30, a.ent.y);
  const r = await b.req('dig_burrow', {});
  assert.equal(r.ok, false);
  H.close(); rmDir(H.dir);
});

await test('巣：所有者は編集できる（rev+1・素材を払う・中の人へ nest_update）、古い rev は stale_rev＋最新を返す', async () => {
  const H = await makeGame();
  const a = await withNest(H, 'builder');
  a.place(a.ent.x, a.ent.y + 10);
  const e = await a.req('enter_nest', { owner: a.account.id });
  assert.equal(e.ok, true); assert.equal(e.nest.canEdit, true); assert.equal(e.nest.rev, 1);
  const nest = e.nest;
  const pebbles = countItem(a.player.inv, 'pebble');
  const roomOp = { op: 'room', x: nest.data.entrance.x + 4, y: nest.data.surfaceY + 5, w: 4, h: 3, kind: 'plain' };
  // 部屋を部屋の隣に（入口の部屋とつながる位置）
  const r0 = nest.data.rooms[0];
  roomOp.x = r0.x + r0.w; roomOp.y = r0.y;
  const r = await a.req('nest_op', { nestId: nest.id, rev: 1, op: roomOp });
  assert.equal(r.ok, true, r.reason); assert.equal(r.rev, 2);
  assert.equal(countItem(r.inv, 'pebble'), pebbles - 2);
  assert.equal(H.store.nest(nest.id).rev, 2);
  const stale = await a.req('nest_op', { nestId: nest.id, rev: 1, op: { op: 'dig', x: 1, y: 1 } });
  assert.equal(stale.code, 'stale_rev'); assert.equal(stale.rev, 2); assert.ok(stale.data.rooms.length === 2);
  // 規則違反は rule（岩・つながらない など）
  const bad = await a.req('nest_op', { nestId: nest.id, rev: 2, op: { op: 'dig', x: 40, y: 20 } });
  assert.equal(bad.ok, false); assert.equal(bad.code, 'rule');
  // 変な形の op
  assert.equal((await a.req('nest_op', { nestId: nest.id, rev: 2, op: { op: 'nuke' } })).code, 'bad_request');
  assert.equal((await a.req('nest_op', { nestId: nest.id, rev: 2, op: { op: 'dig', x: 'a' } })).code, 'bad_request');
  // 倉庫：部屋を倉庫にして、預ける・引き出す（持ち物と倉庫を同時に保存）
  const roomId = r.created || 'r' + (r.data.seq - 1);
  const sk = await a.req('nest_op', { nestId: nest.id, rev: 2, op: { op: 'set-kind', id: r.data.rooms[1].id, kind: 'store' } });
  assert.equal(sk.ok, true, sk.reason); void roomId;
  const seeds = countItem(a.player.inv, 'seed');
  const dep = await a.req('store', { nestId: nest.id, dir: 'deposit', item: 'seed', n: 3 });
  assert.equal(dep.ok, true, dep.reason); assert.equal(dep.moved, 3);
  assert.equal(countItem(H.store.charInventory(a.player.charId), 'seed'), seeds - 3);
  assert.equal(countItem(H.store.nestStorage(nest.id), 'seed'), 3);
  const wd = await a.req('store', { nestId: nest.id, dir: 'withdraw', item: 'seed', n: 10 });
  assert.equal(wd.moved, 3);
  assert.equal(countItem(H.store.nestStorage(nest.id), 'seed'), 0);
  H.close(); rmDir(H.dir);
});

await test('訪問設定：非公開は入れない・公開は入れる（編集・倉庫は不可、更新は届く）・許可リストは名前で', async () => {
  const H = await makeGame();
  const owner = await withNest(H, 'owner');
  const vis = new FakeClient(H.game); await vis.enter('visitor', 'password123', 'ビジター');
  const other = new FakeClient(H.game); await other.enter('stranger', 'password123', 'よそもの');
  vis.place(owner.ent.x, owner.ent.y + 10); other.place(owner.ent.x + 5, owner.ent.y + 10);
  // 非公開
  let r = await vis.req('enter_nest', { owner: owner.account.id });
  assert.equal(r.ok, false); assert.equal(r.code, 'forbidden');
  // 遠いと入れない
  vis.place(owner.ent.x + 80, owner.ent.y);
  assert.equal((await vis.req('enter_nest', { owner: owner.account.id })).code, 'too_far');
  vis.place(owner.ent.x, owner.ent.y + 10);
  // 公開
  assert.equal((await owner.req('visit_policy', { policy: 'public' })).ok, true);
  assert.equal((await owner.req('visit_policy', { policy: 'everyone' })).ok, false);
  owner.place(owner.ent.x, owner.ent.y + 10);
  const oe = await owner.req('enter_nest', { owner: owner.account.id });
  r = await vis.req('enter_nest', { owner: owner.account.id });
  assert.equal(r.ok, true); assert.equal(r.nest.canEdit, false); assert.equal(r.nest.own, false);
  // 地上の人からは消える（why:'nest'）
  assert.ok(other.inbox.some(m => m.t === 'player_leave' && m.id === vis.account.id && m.why === 'nest'));
  // 中の人の一覧
  const peers = owner.last('nest_peers');
  assert.deepEqual(peers.peers.map(p => p.name).sort(), ['owner', 'ビジター'].sort());
  // 訪問者は編集できない・倉庫も不可
  const vop = await vis.req('nest_op', { nestId: r.nest.id, rev: r.nest.rev, op: { op: 'dig', x: 5, y: 5 } });
  assert.equal(vop.code, 'forbidden');
  assert.equal((await vis.req('store', { nestId: r.nest.id, dir: 'withdraw', item: 'seed', n: 1 })).code, 'forbidden');
  // 所有者の編集は訪問者へ届く
  const d0 = oe.nest.data, r0 = d0.rooms[0];
  vis.inbox = [];
  const op = await owner.req('nest_op', { nestId: oe.nest.id, rev: oe.nest.rev, op: { op: 'place', type: 'rug', x: r0.x + 1, y: r0.y + r0.h - 1 } });
  assert.equal(op.ok, true, op.reason);
  const up = vis.take('nest_update');
  assert.equal(up.length, 1); assert.equal(up[0].rev, op.rev); assert.equal(up[0].data.objects.length, d0.objects.length + 1);
  // 巣の中のチャットは中の人だけ
  other.inbox = []; vis.inbox = [];
  owner.send({ t: 'chat', text: 'いらっしゃい' });
  assert.equal(vis.take('chat')[0].where, 'nest');
  assert.equal(other.take('chat').length, 0);
  // 動き（nest_move）→ peers
  H.clock.t += 200; vis.send({ t: 'nest_move', x: 200, y: 100, facing: -1, anim: 'walk' }); H.game.tick();
  const pv = owner.last('nest_peers').peers.find(p => p.id === vis.account.id);
  assert.equal(pv.x, 200); assert.equal(pv.anim, 'walk');
  // 出る → 入口の 12px 下・地上に戻る
  const lv = await vis.req('leave_nest');
  assert.equal(lv.ok, true); assert.equal(lv.x, owner.ent.x); assert.equal(lv.y, owner.ent.y + 12);
  // 許可リスト：名前で
  const al = await owner.req('visit_policy', { policy: 'list', list: ['ビジター', 'だれもいない'] });
  assert.equal(al.ok, true); assert.deepEqual(al.unknown, ['だれもいない']);
  vis.place(owner.ent.x, owner.ent.y + 10);
  assert.equal((await vis.req('enter_nest', { owner: owner.account.id })).ok, true, '名前が許可リストにある');
  assert.equal((await other.req('enter_nest', { owner: owner.account.id })).code, 'forbidden', '名前が無い');
  // 非公開に戻す
  await vis.req('leave_nest');
  await owner.req('visit_policy', { policy: 'private' });
  vis.place(owner.ent.x, owner.ent.y + 10);
  assert.equal((await vis.req('enter_nest', { owner: owner.account.id })).code, 'forbidden');
  H.close(); rmDir(H.dir);
});

// ───────── チャット ─────────
await test('チャット：制御文字を消す・80 文字まで・連投制限・全員へ（自分にも）', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game); await a.enter('talker');
  const b = new FakeClient(H.game); await b.enter('listen');
  a.send({ t: 'chat', text: 'こん\u0000に\u001bちは\u007f' });
  assert.equal(b.take('chat')[0].text, 'こんにちは');
  assert.equal(a.take('chat')[0].text, 'こんにちは', '自分にも返る');
  H.clock.t += 1000; a.send({ t: 'chat', text: 'あ'.repeat(200) });
  assert.equal(b.take('chat')[0].text.length, 80);
  H.clock.t += 1000; a.send({ t: 'chat', text: '   ' });
  assert.equal(b.take('chat').length, 0, '空は送らない');
  for (let i = 0; i < 10; i++) { H.clock.t += 500; a.send({ t: 'chat', text: 'spam' + i }); }
  assert.ok(b.take('chat').length <= 5);
  assert.ok(a.take('toast').length >= 1, '連投は注意');
  H.close(); rmDir(H.dir);
});

// ───────── 再接続・保存 ─────────
await test('再接続：60 秒以内なら同じ位置、それより後は自分の巣の入口（無ければ出発点）', async () => {
  const H = await makeGame();
  const a = await withNest(H, 'comeback');
  const spot = { x: a.ent.x + 100, y: a.ent.y };
  a.place(spot.x, spot.y);
  a.close();   // ネットが切れた
  H.clock.t += 30000;
  const a2 = new FakeClient(H.game);
  const h = await a2.req('hello', { v: 1, token: a.token });
  assert.equal(h.ok, true); assert.equal(h.character.name, 'comeback');
  a2.account = h.account;
  let j = await a2.req('join_field');
  assert.equal(j.world.you.x, spot.x); assert.equal(j.world.you.y, spot.y);
  a2.close();
  H.clock.t += 61000;
  const a3 = new FakeClient(H.game);
  await a3.req('hello', { v: 1, token: a.token });
  j = await a3.req('join_field');
  assert.equal(j.world.you.x, a.ent.x); assert.equal(j.world.you.y, a.ent.y + 12, '巣の入口');
  // 巣の中で切れた → 60 秒以内なら巣の中から（resume）
  a3.account = h.account;
  a3.place(a.ent.x, a.ent.y + 10);
  const en = await a3.req('enter_nest', { owner: h.account.id });
  assert.equal(en.ok, true);
  a3.close();
  H.clock.t += 20000;
  const a4 = new FakeClient(H.game);
  await a4.req('hello', { v: 1, token: a.token });
  const rs = await a4.req('enter_nest', { owner: h.account.id, resume: true });
  assert.equal(rs.ok, true, rs.reason);
  H.close(); rmDir(H.dir);
});

await test('同じアカウントで別の場所からログイン → 古い接続は kick', async () => {
  const H = await makeGame();
  const a = new FakeClient(H.game); await a.enter('twice');
  const b = new FakeClient(H.game);
  const r = await b.req('login', { username: 'twice', password: 'password123' });
  assert.equal(r.ok, true);
  assert.ok(a.inbox.some(m => m.t === 'kick'));
  assert.equal(a.closed, true);
  assert.equal((await b.req('join_field')).ok, true);
  H.close(); rmDir(H.dir);
});

await test('再起動後も：持ち物・巣（rev・データ）・位置・採集物が戻る（ログアウト→ログインも）', async () => {
  const dir = tempDir();
  let H = await makeGame({ dir });
  const a = await withNest(H, 'persist');
  a.place(a.ent.x, a.ent.y + 10);
  const e = await a.req('enter_nest', { owner: a.account.id });
  const r0 = e.nest.data.rooms[0];
  const op = await a.req('nest_op', { nestId: e.nest.id, rev: 1, op: { op: 'place', type: 'pebble_deco', x: r0.x + 1, y: r0.y + r0.h - 1 } });
  assert.equal(op.ok, true, op.reason);
  await a.req('leave_nest');
  const res = a.world.resources[10];
  a.place(res.x, res.y);
  const pk = await a.req('pickup', { resId: res.id });
  assert.equal(pk.ok, true);
  let where = null;
  for (let dx = 0; dx < 200 && !where; dx += 3) if (boxFree(H.game.map, res.x + dx + 0.5, res.y)) where = { x: res.x + dx + 0.5, y: res.y };
  a.place(where.x, where.y);
  const inv = a.player.inv.map(s => s && { ...s });
  // ログアウト → ログイン：同じ位置
  await a.req('logout');
  const b = new FakeClient(H.game);
  await b.enter('persist');
  assert.equal(b.world.you.x, where.x); assert.equal(b.world.you.y, where.y);
  assert.deepEqual(b.world.you.inv, inv);
  // 停止（shutdown で保存）→ 起動
  H.game.shutdown(); H.store.close();
  H.clock.t += 10 * 60 * 1000;   // 10 分止まっていても、停止のときの位置へ
  H = await makeGame({ dir, clock: H.clock });
  const c = new FakeClient(H.game);
  const h = await c.req('hello', { v: 1, token: b.token });
  assert.equal(h.account.username, 'persist');
  c.account = h.account;
  const j = await c.req('join_field');
  assert.equal(j.world.you.x, where.x); assert.equal(j.world.you.y, where.y);
  assert.deepEqual(j.world.you.inv, inv);
  assert.ok(!j.world.resources.some(r => r.id === res.id), '拾った採集物は消えたまま');
  assert.equal(j.world.entrances.length, 1); assert.equal(j.world.entrances[0].own, true);
  c.place(j.world.you.nest.x, j.world.you.nest.y + 10);
  const e2 = await c.req('enter_nest', { owner: h.account.id });
  assert.equal(e2.nest.rev, 2); assert.ok(e2.nest.data.objects.some(o => o.type === 'pebble_deco'));
  H.close(); rmDir(dir);
});

// ───────── マイグレーション ─────────
await test('マイグレーション：古い DB（001 だけ・v0 の巣データ）を開くと 006 と巣データ v1 まで上がる', async () => {
  const dir = tempDir();
  const file = join(dir, 'game.db');
  const old = new Store(file);
  assert.deepEqual(await old.migrate({ upTo: 1 }), [1]);
  assert.equal(old.schemaVersion(), 1);
  old.db.exec("INSERT INTO accounts (username, pass_hash, created_at) VALUES ('oldie', 'x', 1)");
  const v0 = { w: 48, h: 24, surface: 2, grid: new Array(48 * 24).fill(0), rooms: [{ x: 6, y: 7, w: 5, h: 3, type: 'sleep' }], items: [{ kind: 'lamp', x: 8, y: 7 }], door: { x: 8 } };
  for (let y = 3; y <= 6; y++) v0.grid[y * 48 + 8] = 1;
  old.db.prepare("INSERT INTO nests (owner_account_id, schema_version, rev, data, visit_policy, created_at, updated_at) VALUES (1, 0, 3, ?, 'private', 1, 1)").run(JSON.stringify(v0));
  old.close();
  const db = await openDb(file, { log: () => {} });
  assert.equal(db.schemaVersion(), 7);   // Ver.0.6 の 007 まで
  assert.equal(db.db.prepare("SELECT hidden FROM regions WHERE id = 'toyama'").get().hidden, 1);
  for (const t of ['collectibles', 'account_collectibles', 'events', 'account_flags', 'lands', 'individuals', 'nest_access', 'friends', 'nest_visits', 'nest_events']) assert.ok(db.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(t), t);
  const n = db.nest(1);
  assert.equal(n.schemaVersion, NEST_SCHEMA); assert.equal(n.data.v, 1); assert.equal(n.rev, 3);
  assert.equal(n.data.rooms[0].kind, 'bed');
  assert.equal(db.accountByName('oldie').id, 1, 'データは残る');
  // もう一度開いても何もしない
  db.close();
  const again = await openDb(file, { log: () => {} });
  assert.equal(again.db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n, 7);
  again.close(); rmDir(dir);
});

// ───────── バックアップ・復元 ─────────
await test('バックアップ（VACUUM INTO・世代数）→ 変更 → 復元で元に戻る', async () => {
  const dir = tempDir();
  const bdir = join(dir, 'backups');
  let H = await makeGame({ dir });
  const a = new FakeClient(H.game); await a.enter('backer');
  const f1 = backupNow(H.store, bdir, { keep: 3, date: new Date(2026, 9, 10, 9) });
  assert.match(f1, /game-20261010-09\.db$/);
  assert.equal(checkBackup(f1).accounts, 1);
  for (let h = 10; h < 15; h++) backupNow(H.store, bdir, { keep: 3, date: new Date(2026, 9, 10, h) });
  assert.deepEqual(listBackups(bdir), ['game-20261010-12.db', 'game-20261010-13.db', 'game-20261010-14.db'], '古いものは消える');
  // 変更（アカウントが増える・持ち物が減る）
  const b = new FakeClient(H.game); await b.enter('after');
  H.close();
  const dbFile = join(dir, 'game.db');
  const info = restoreFrom(join(bdir, 'game-20261010-14.db'), dbFile, bdir);
  assert.equal(info.accounts, 1); assert.ok(existsSync(info.saved), '復元前の DB を退避');
  H = await makeGame({ dir, clock: H.clock });
  assert.equal(H.store.accountByName('after'), null);
  assert.ok(H.store.accountByName('backer'));
  // 壊れたファイルからは復元しない
  const bad = join(dir, 'bad.db');
  const d = new DatabaseSync(bad); d.exec('CREATE TABLE x(y)'); d.close();
  assert.throws(() => restoreFrom(bad, dbFile, bdir));
  H.close(); rmDir(dir);
});

done();
