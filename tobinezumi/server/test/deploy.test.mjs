// Ver.0.6「公開準備」：本物の HTTP＋WebSocket で入口の守りを確かめる（Origin の許可リスト・IP ごとの接続数・送信の速さ・
// /healthz・/statsz・/tobi-server.json の CORS・止めている途中は 503）。ws が入っていなければ飛ばす。
import assert from 'node:assert/strict';
import { test, done, tempDir, rmDir } from './harness.mjs';

let startServer, WebSocket;
try { ({ startServer } = await import('../index.js')); ({ WebSocket } = await import('ws')); }
catch (e) { console.log('tobinezumi server deploy：ws が無いので飛ばす（cd tobinezumi/server && npm install）'); process.exit(0); }

console.log('tobinezumi server deploy（公開準備：入口の守り）');
const dir = tempDir();
const srv = await startServer({ port: 0, host: '127.0.0.1', dataDir: dir, backupHours: 0, log: () => {}, gameOpts: { predators: 'off', weather: 'clear' },
  origins: ['https://me.github.io'], connPerIp: 3, connPerMin: 100, msgPerIp: 40, statsToken: 'secret-token', publicWs: 'wss://example.fly.dev/ws' });
const base = `http://127.0.0.1:${srv.port}`, wsUrl = `ws://127.0.0.1:${srv.port}/ws`;
/** つないでみる → 'open' / 'refused 403' など */
function tryWs(origin, keep = false) {
  return new Promise(res => {
    const ws = new WebSocket(wsUrl, origin ? { origin } : {});
    ws.on('open', () => res(keep ? { ok: 'open', ws } : (ws.close(), 'open')));
    ws.on('unexpected-response', (q, r) => res('refused ' + r.statusCode));
    ws.on('error', e => res('error ' + e.message));
  });
}

await test('Origin：許可リストのページ・サーバー自身のページ・Origin の無い道具はつながる／よそのページ・null は 403', async () => {
  assert.equal(await tryWs('https://me.github.io'), 'open');
  assert.equal(await tryWs(`http://127.0.0.1:${srv.port}`), 'open', '同じホスト（サーバーが配ったページ）');
  assert.equal(await tryWs(null), 'open', 'Origin の無い接続（ボット・道具）');
  assert.equal(await tryWs('https://evil.example'), 'refused 403');
  assert.equal(await tryWs('https://other.github.io'), 'refused 403');
  assert.equal(await tryWs('null'), 'refused 403');
  assert.ok(srv.state.rejected.origin >= 3);
});
await test('IP ごとの同時接続（3）：4 つめは 429・閉じれば また入れる', async () => {
  const held = [];
  for (let i = 0; i < 3; i++) { const r = await tryWs('https://me.github.io', true); assert.equal(r.ok, 'open'); held.push(r.ws); }
  assert.equal(await tryWs('https://me.github.io'), 'refused 429');
  held[0].close();
  await new Promise(r => setTimeout(r, 150));
  const again = await tryWs('https://me.github.io', true);
  assert.equal(again.ok, 'open');
  for (const w of [...held.slice(1), again.ws]) w.close();
  await new Promise(r => setTimeout(r, 150));
  assert.equal(srv.limiter.stats().open, 0, '閉じたら数えない');
});
await test('送信の速さ（IP あたり 40 通/秒）：あふれると kick して切る・サーバーは動き続ける', async () => {
  const r = await tryWs('https://me.github.io', true);
  const ws = r.ws, got = [];
  ws.on('message', d => got.push(JSON.parse(d.toString())));
  const closed = new Promise(res => ws.on('close', (code) => res(code)));
  for (let i = 0; i < 120; i++) ws.send(JSON.stringify({ t: 'ping', ct: i }));
  const code = await closed;
  assert.equal(code, 1008);
  assert.ok(got.some(m => m.t === 'kick'));
  assert.ok(srv.state.rejected.rate >= 1);
  await new Promise(res => setTimeout(res, 1100));
  assert.equal(await tryWs('https://me.github.io'), 'open', 'あとからは またつながる');
});
await test('/healthz（最小限・CORS）・/statsz（合言葉が要る）・/tobi-server.json（公開の接続先）・静的ファイルの見出し', async () => {
  const h = await fetch(base + '/healthz', { headers: { origin: 'https://me.github.io' } });
  assert.equal(h.status, 200); assert.equal(h.headers.get('access-control-allow-origin'), 'https://me.github.io');
  const j = await h.json();
  assert.equal(j.ok, true); assert.equal(j.v, '0.7'); assert.ok('players' in j && 'uptime' in j); assert.ok(!('rss' in j), 'メモリなどは出さない');
  const evil = await fetch(base + '/healthz', { headers: { origin: 'https://evil.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(base + '/statsz')).status, 404);
  assert.equal((await fetch(base + '/statsz', { headers: { authorization: 'Bearer nope' } })).status, 404);
  const st = await fetch(base + '/statsz', { headers: { authorization: 'Bearer secret-token' } });
  assert.equal(st.status, 200); const sj = await st.json(); assert.ok(sj.rss > 0 && sj.rejected && sj.limiter);
  assert.equal((await (await fetch(base + '/tobi-server.json')).json()).ws, 'wss://example.fly.dev/ws');
  const f = await fetch(base + '/tobinezumi.html');
  assert.equal(f.headers.get('x-frame-options'), 'SAMEORIGIN'); assert.equal(f.headers.get('x-content-type-options'), 'nosniff');
});
await test('止める（SIGTERM と同じ close）：遊んでいる子に知らせる → /healthz は 503 → 新しい接続は断る', async () => {
  const r = await tryWs('https://me.github.io', true);
  const msgs = [];
  r.ws.on('message', d => msgs.push(JSON.parse(d.toString())));
  const gone = new Promise(res => r.ws.on('close', code => res(code)));
  const closing = srv.close();
  assert.equal(srv.state.shuttingDown, true);
  const mid = await fetch(base + '/healthz');
  assert.equal(mid.status, 503); assert.equal((await mid.json()).ok, false);
  await closing;
  assert.equal(await gone, 1012, '再起動のしるし（クライアントは つながりなおす）');
  assert.ok(msgs.some(m => m.t === 'toast' && /再起動/.test(m.text)), JSON.stringify(msgs));
  let failed = false;
  try { await fetch(base + '/healthz'); } catch (e) { failed = true; }
  assert.ok(failed, '止まったあとは応えない');
});

rmDir(dir);
done();
