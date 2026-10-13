// 本物の HTTP＋WebSocket（ws）で通しのテスト。ws が入っていなければ飛ばす（npm install していないとき）
import assert from 'node:assert/strict';
import { test, done, tempDir, rmDir, makeFieldState } from './harness.mjs';
import { ProtoClient } from '../tools/proto-client.mjs';

let startServer;
try { ({ startServer } = await import('../index.js')); }
catch (e) { console.log('tobinezumi server e2e：ws が無いので飛ばす（cd tobinezumi/server && npm install）'); process.exit(0); }

console.log('tobinezumi server e2e (HTTP + WebSocket)');
const dir = tempDir();
let srv = await startServer({ port: 0, host: '127.0.0.1', dataDir: dir, backupHours: 0, log: () => {}, gameOpts: { predators: 'off', weather: 'clear' } });
const base = () => `http://127.0.0.1:${srv.port}`;
const wsUrl = () => `ws://127.0.0.1:${srv.port}/ws`;
const opened = [];
const client = async () => { const c = await new ProtoClient(wsUrl()).connect(); opened.push(c); return c; };

await test('静的配信：tobinezumi.html・shared・fonts・tobi-server.json。server/・.git・../ は配らない', async () => {
  const get = async p => (await fetch(base() + p)).status;
  assert.equal(await get('/tobinezumi.html'), 200);
  assert.equal(await get('/'), 200);
  assert.equal(await get('/tobinezumi/client/main.js'), 200);
  assert.equal(await get('/tobinezumi/shared/move.js'), 200);
  assert.equal(await get('/tobinezumi/assets/manifest.json'), 200);
  assert.equal(await get('/godot/assets/fonts/DotGothic16-Regular.ttf'), 200);
  const j = await (await fetch(base() + '/tobi-server.json')).json();
  assert.equal(j.ws, '/ws');
  for (const p of ['/tobinezumi/server/index.js', '/tobinezumi/server/data/game.db', '/.git/config', '/tobinezumi/%2e%2e/tobinezumi/server/db.js', '/tobinezumi/client/../server/db.js', '/tests/run.mjs', '/tobinezumi/docs/PROTOCOL.md'])
    assert.equal(await get(p), 404, p);
  const h = await (await fetch(base() + '/healthz')).json();
  assert.equal(h.ok, true);
});

await test('2 人が別アカウントで：互いが見える（参加通知・スナップショット・跳躍）・チャットが届く', async () => {
  const a = await client(), b = await client();
  await a.enter('e2e_alice', 'password123', { name: 'アリス', fur: 'cream' });
  const joinP = a.wait('player_join');
  const wb = await b.enter('e2e_bob', 'password123', { name: 'ボブ', fur: 'rufous' });
  assert.ok(wb.players.some(p => p.name === 'アリス'));
  const pj = await joinP;
  assert.equal(pj.player.name, 'ボブ'); assert.equal(pj.player.fur, 'rufous');
  // アリスが右へ跳ねて大ジャンプ → ボブのスナップショットに jump が出る
  const list = []; for (let i = 0; i < 20; i++) list.push({ mx: 1, my: 0, jump: i === 10 });
  a.inputs(list);
  const s = await b.wait('snapshot', m => m.players.some(p => p.id === a.account.id && p.jump), 3000);
  const pa = s.players.find(p => p.id === a.account.id);
  assert.equal(pa.anim, 'jump'); assert.ok(pa.jump.x1 > pa.jump.x0);
  const mine = await a.synced();
  assert.equal(mine.you.x, a.st.x, '予測と確定が一致');
  const cp = b.wait('chat');
  a.send({ t: 'chat', text: 'こんにちは！' });
  const ch = await cp;
  assert.equal(ch.name, 'アリス'); assert.equal(ch.text, 'こんにちは！'); assert.equal(ch.where, 'field');
  const lp = b.wait('player_leave', m => m.id === a.account.id);
  a.close();
  await lp;
});

await test('同じ種を 2 人が同時に拾う → 片方だけ（ネット越し）', async () => {
  const a = await client(), b = await client();
  const wa = await a.enter('e2e_p1', 'password123'); await b.enter('e2e_p2', 'password123');
  for (let k = 0; k < 5; k++) {
    const r = wa.resources[k];
    for (const c of [a, b]) { const p = srv.game.players.get(c.account.id); p.st = makeFieldState(r.x, r.y + 2); p.inbox = []; }
    const [ra, rb] = await Promise.all([a.req('pickup', { resId: r.id }), b.req('pickup', { resId: r.id })]);
    assert.equal([ra, rb].filter(x => x.ok).length, 1, `資源 ${r.id}: ${JSON.stringify([ra.reason, rb.reason])}`);
  }
  a.close(); b.close();
});

await test('サーバーを止めて起動し直しても：token でそのまま入れて、持ち物・位置が戻る', async () => {
  const a = await client();
  const w = await a.enter('e2e_keep', 'password123');
  for (let i = 0; i < 30; i++) a.inputs([{ mx: 0, my: 1 }]);
  const s = await a.synced();
  const pos = { x: s.you.x, y: s.you.y };
  await srv.close();
  srv = await startServer({ port: 0, host: '127.0.0.1', dataDir: dir, backupHours: 0, log: () => {}, gameOpts: { predators: 'off', weather: 'clear' } });
  const b = await client();
  const h = await b.req('hello', { v: 1, token: a.token });
  assert.equal(h.account.username, 'e2e_keep');
  const j = await b.req('join_field');
  assert.ok(Math.abs(j.world.you.x - pos.x) <= 0.05 && Math.abs(j.world.you.y - pos.y) <= 0.05, '位置（0.1px 単位で保存）');
  assert.deepEqual(j.world.you.inv, w.you.inv);
  b.close();
});

await test('同じアカウントで 2 か所 → 古い方に kick が届いて切れる', async () => {
  const a = await client();
  await a.enter('e2e_twice', 'password123');
  const kp = a.wait('kick');
  const b = await client();
  const r = await b.req('login', { username: 'e2e_twice', password: 'password123' });
  assert.equal(r.ok, true);
  const k = await kp;
  assert.match(k.reason, /別の場所/);
  b.close();
});

await test('壊れた送信（JSON でない・巨大）でもサーバーは落ちない', async () => {
  const a = await client();
  a.ws.send('not json'); a.ws.send('{"t":123}'); a.send({ t: 'nest_op', rid: 999, nestId: 'x' });
  const r = await a.req('hello', { v: 1 });
  assert.equal(r.ok, true);
  const big = await client();
  const closed = big.wait('close', () => true, 3000);
  big.ws.send('x'.repeat(64 * 1024));
  await closed;
  assert.equal((await (await fetch(base() + '/healthz')).json()).ok, true);
  a.close();
});

await test('Ver.0.3（本物の WebSocket）：捕食者が 2 人のスナップショットに同じように届く・dev で天気を変えると全員に clock・土地を調べる', async () => {
  const dir2 = tempDir();
  const s2 = await startServer({ port: 0, host: '127.0.0.1', dataDir: dir2, backupHours: 0, log: () => {}, gameOpts: { predators: 'normal', weather: 'clear', devMode: true, startHour: 22 } });
  const url = `ws://127.0.0.1:${s2.port}/ws`;
  const a = await new ProtoClient(url).connect(), b = await new ProtoClient(url).connect();
  await a.enter('e2e_pred_a', 'password123'); await b.enter('e2e_pred_b', 'password123');
  const sp = await a.req('dev', { spawn: 'owl', dx: 200, dy: 0 });
  assert.equal(sp.ok, true); assert.ok(sp.spawned);
  const sa = await a.wait('snapshot', m => (m.preds || []).some(p => p.id === sp.spawned));
  const sb = await b.wait('snapshot', m => (m.preds || []).some(p => p.id === sp.spawned));
  const pa = sa.preds.find(p => p.id === sp.spawned), pb = sb.preds.find(p => p.id === sp.spawned);
  assert.equal(pa.kind, 'owl'); assert.equal(pb.kind, 'owl');
  const cp = b.wait('clock', m => m.clock && m.clock.weather === 'rain');
  await a.req('dev', { weather: 'rain' });
  assert.equal((await cp).clock.weather, 'rain', '天気は全員に');
  const sv = await b.req('survey', {});
  assert.equal(sv.ok, true); assert.equal(sv.land.here.weather, 'rain'); assert.ok(sv.land.id.startsWith('L'));
  a.close(); b.close();
  await s2.close(); rmDir(dir2);
});

for (const c of opened) c.close();
await srv.close();
rmDir(dir);
done();
