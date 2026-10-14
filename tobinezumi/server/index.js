// tobinezumi/server/index.js — 起動：静的配信（リポジトリのルートの必要な所だけ）＋ /tobi-server.json ＋ WebSocket(/ws) ＋ SQLite
//
//   cd tobinezumi/server && npm install && npm start      → http://localhost:8080/tobinezumi.html
//
// 環境変数（くわしくは tobinezumi/docs/DEPLOY.md）：
//           TOBI_PORT または PORT(8080) HOST(0.0.0.0) TOBI_DATA_DIR または TOBI_DATA(./data) TOBI_BACKUPS(<データ>/backups … 前からの ./backups も可) TOBI_BACKUP_KEEP(48) TOBI_BACKUP_HOURS(1, 0 で止める)
//           Ver.0.6「公開準備」：TOBI_ORIGIN（WebSocket をつないでよいページ：カンマ区切り）TOBI_ORIGIN_STRICT（1：Origin の無い接続も断る）
//             TOBI_TRUST_PROXY（1：Fly-Client-IP / X-Forwarded-For を信じる）TOBI_MAX_CONN_PER_IP(6) TOBI_CONN_PER_MIN(30) TOBI_MSG_PER_IP(300/秒) TOBI_MAX_PAYLOAD(16384)
//             TOBI_STATS_TOKEN（/statsz を見る合言葉）TOBI_PUBLIC_WS（/tobi-server.json で教える接続先。既定 /ws）TOBI_BACKUP_ON_EXIT（1：止めるときにもバックアップ）
//             NODE_ENV=production（または TOBI_PUBLIC=1）のときは TOBI_DEV=1 では起動しない
//           TOBI_STATS_SEC(60, 0 で止める：CPU・メモリ・通信量のログ) TOBI_REGISTER_MAX(20 / 10 分 / 接続元)
//           TOBI_PREDATORS（normal / easy / off：捕食者の強さ）TOBI_RAIDS（0 でキツネの巣の襲撃なし）
//           開発用（TOBI_DEV=1 のときだけ効く）：TOBI_TIMESCALE（時計・暮らし・採集物の戻りを何倍速にするか）TOBI_START_HOUR（起動時の世界の時刻 0〜23）
//             TOBI_WEATHER（clear / sandstorm / rain に固定）TOBI_SEASON（spring / summer / autumn / winter に固定）・C2S dev（天気・季節の切り替え、捕食者を出す）
import http from 'node:http';
import { createReadStream, statSync, writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db.js';
import { Auth } from './auth.js';
import { Game } from './game.js';
import { backupNow, restoreFrom } from './backup.js';
import { checkOrigin, clientIp, IpLimiter, LIMITS, securityFromEnv, productionCheck } from './security.js';
import { timingSafeEqual } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..');      // リポジトリのルート

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8',
};
// 配ってよい所（GitHub Pages に出ているものと同じ範囲）。tobinezumi/server（DB・バックアップ）・.git・tools・tests は配らない
const ALLOW_FILES = new Set(['tobinezumi.html', 'tobinezumi.webmanifest', 'index.html', 'kyokai.html', 'style.css', 'style-home.css', 'game.js', 'pwa.js', 'sw.js', 'manifest.webmanifest']);
const ALLOW_DIRS = ['tobinezumi/client/', 'tobinezumi/shared/', 'tobinezumi/assets/', 'assets/', 'main/', 'minigames/', 'kyokai/', 'vendor/', 'godot/assets/fonts/'];

export function staticPath(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch (e) { return null; }
  if (p === '/' || p === '') p = '/tobinezumi.html';
  if (p.includes('\0') || p.includes('\\')) return null;
  const rel = p.replace(/^\/+/, '');
  if (rel.split('/').some(seg => seg === '..' || seg.startsWith('.'))) return null;
  if (!ALLOW_FILES.has(rel) && !ALLOW_DIRS.some(d => rel.startsWith(d))) return null;
  const abs = resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + sep)) return null;
  return abs;
}

function serveStatic(req, res) {
  const abs = staticPath(new URL(req.url, 'http://x').pathname);
  if (!abs) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
  let st;
  try { st = statSync(abs); } catch (e) { st = null; }
  if (!st || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
  const etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = { 'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache', etag, 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
  headers['content-length'] = st.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(abs).pipe(res);
}

/**
 * サーバーを作って listen する。テストからも使う。
 * @returns {Promise<{port, http, wss, game, store, close()}>}
 */
export async function startServer({ port = 8080, host = '0.0.0.0', dataDir = join(HERE, 'data'), dbFile = null, backupDir = join(HERE, 'backups'),
  backupHours = 1, backupKeep = 48, statsSec = 0, log = console.log, pidFile = null, gameOpts = {}, authOpts = {}, heartbeatMs = 10000,
  origins = [], originStrict = false, trustProxy = false, connPerIp = 0, connPerMin = 0, msgPerIp = 0,
  maxPayload = LIMITS.MAX_PAYLOAD, statsToken = '', publicWs = '/ws', backupOnExit = false } = {}) {
  const file = dbFile || join(dataDir, 'game.db');
  const store = await openDb(file, { log });
  const auth = new Auth(store, authOpts);
  const game = new Game({ store, auth, log, ...gameOpts }).start();

  const limiter = new IpLimiter({ connPerIp, connPerMin, msgPerSec: msgPerIp });
  const state = { shuttingDown: false, rejected: { origin: 0, limit: 0, rate: 0 } };
  // よそのページ（GitHub Pages など）から /tobi-server.json・/healthz を読めるように（許可リストの Origin だけ）
  const cors = req => { const o = req.headers.origin; return o && origins.length && checkOrigin(o, req.headers.host, origins).ok ? { 'access-control-allow-origin': o, vary: 'Origin' } : {}; };
  const server = http.createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/tobi-server.json') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(req) });
      res.end(JSON.stringify({ ws: publicWs, name: 'tobinezumi', v: 1 }));
      return;
    }
    if (path === '/healthz') {
      // 死活確認（Fly.io・Render のヘルスチェック）。中身は最小限（人数とどれだけ動いているか）。止めている途中は 503
      res.writeHead(state.shuttingDown ? 503 : 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(req) });
      const st = game.statsSnapshot();
      res.end(JSON.stringify({ ok: !state.shuttingDown, v: '0.6', uptime: st.uptime, players: st.players, sessions: st.sessions }));
      return;
    }
    if (path === '/statsz') {
      // くわしい数字（CPU・メモリ・通信量・断った接続）。TOBI_STATS_TOKEN を Authorization: Bearer で渡したときだけ
      const want = statsToken ? Buffer.from('Bearer ' + statsToken) : null, got = Buffer.from(String(req.headers.authorization || ''));
      if (!want || want.length !== got.length || !timingSafeEqual(want, got)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, ...game.statsSnapshot(), limiter: limiter.stats(), rejected: state.rejected }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload, perMessageDeflate: false });
  const refuse = (socket, code, text) => { try { socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`); } catch (e) {} socket.destroy(); };
  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://x').pathname !== '/ws') { socket.destroy(); return; }
    if (state.shuttingDown) { refuse(socket, 503, 'Service Unavailable'); return; }
    // Ver.0.6：Origin の確認（許可リスト）・接続元ごとの上限
    const oc = checkOrigin(req.headers.origin, req.headers.host, origins, { strict: originStrict });
    if (!oc.ok) { state.rejected.origin++; log(`[ws] 断った（${oc.reason}）origin=${String(req.headers.origin || '').slice(0, 80)}`); refuse(socket, 403, 'Forbidden'); return; }
    const ip = clientIp(req, trustProxy);
    const lc = limiter.tryConnect(ip);
    if (!lc.ok) { state.rejected.limit++; refuse(socket, 429, 'Too Many Requests'); return; }
    let released = false;
    const release = () => { if (!released) { released = true; limiter.release(ip); } };
    socket.once('close', release);
    wss.handleUpgrade(req, socket, head, ws => { ws.once('close', release); wss.emit('connection', ws, req, ip); });
  });
  wss.on('connection', (ws, req, ipIn) => {
    const ip = ipIn || clientIp(req, trustProxy);
    const conn = {
      ip,
      sendRaw: text => { if (ws.readyState === 1) ws.send(text); },
      close: (code, reason) => { try { ws.close(code, reason); } catch (e) { ws.terminate(); } },
    };
    const s = game.connect(conn);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      ws.isAlive = true;
      if (!limiter.tryMessage(ip)) { state.rejected.rate++; try { ws.send(JSON.stringify({ t: 'kick', reason: '送信が多すぎる' })); } catch (e) {} ws.close(1008, 'rate'); return; }
      s.onMessage(data.toString());
    });
    ws.on('close', () => s.onClose());
    ws.on('error', () => {});
  });
  // 応答の無い接続を切る（ネットが切れたまま残った接続）
  const hb = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch (e) {}
    }
  }, heartbeatMs);

  await new Promise((res, rej) => { server.once('error', rej); server.listen(port, host, res); });
  const realPort = server.address().port;

  const timers = [hb, setInterval(() => limiter.sweep(), 60000)];
  if (backupHours > 0) timers.push(setInterval(() => {
    try { const f = backupNow(store, backupDir, { keep: backupKeep }); log('[backup] ' + f); } catch (e) { log('[backup] 失敗: ' + e.message); }
  }, backupHours * 3600 * 1000));
  if (statsSec > 0) {
    let lastCpu = process.cpuUsage(), lastT = process.hrtime.bigint(), lastOut = 0, lastIn = 0;
    timers.push(setInterval(() => {
      const cpu = process.cpuUsage(lastCpu), t = process.hrtime.bigint();
      const sec = Number(t - lastT) / 1e9;
      const s = game.statsSnapshot();
      log(`[stats] players=${s.players} field=${s.field} nests=${s.nests} cpu=${((cpu.user + cpu.system) / 1e4 / sec).toFixed(1)}% rss=${(s.rss / 1048576).toFixed(1)}MB ` +
        `out=${((s.bytesOut - lastOut) / sec / 1024).toFixed(1)}KB/s in=${((s.bytesIn - lastIn) / sec / 1024).toFixed(1)}KB/s errors=${s.errors}`);
      lastCpu = process.cpuUsage(); lastT = t; lastOut = s.bytesOut; lastIn = s.bytesIn;
    }, statsSec * 1000));
  }
  if (pidFile) writeFileSync(pidFile, String(process.pid));

  let closed = false;
  const close = async () => {
    if (closed) return; closed = true;
    state.shuttingDown = true;
    for (const t of timers) clearInterval(t);
    // 遊んでいる子へ「再起動する」と知らせてから（クライアントは自動でつながりなおす）
    for (const sess of game.sessions) { try { sess.conn.send({ t: 'toast', text: 'サーバーを再起動します（すぐに つながりなおします）' }); } catch (e) {} }
    game.shutdown();
    if (backupOnExit) { try { log('[backup] ' + backupNow(store, backupDir, { keep: backupKeep })); } catch (e) { log('[backup] 失敗: ' + e.message); } }
    for (const ws of wss.clients) { try { ws.close(1012, 'server restart'); } catch (e) {} }
    await new Promise(r => setTimeout(r, 50));
    for (const ws of wss.clients) ws.terminate();
    await new Promise(r => server.close(() => r()));
    store.close();
    if (pidFile && existsSync(pidFile)) { try { if (readFileSync(pidFile, 'utf8').trim() === String(process.pid)) unlinkSync(pidFile); } catch (e) {} }
  };
  return { port: realPort, http: server, wss, game, store, auth, close, limiter, state };
}

// ───────── npm start（docker-entry.mjs からも main()）─────────
export async function main(env = process.env) {
  const pc = productionCheck(env);
  for (const w of pc.warnings) console.log('[tobinezumi] 注意：' + w);
  if (pc.errors.length) { for (const e of pc.errors) console.error('[tobinezumi] 起動しません：' + e); process.exit(1); }
  const dataDir = resolve(HERE, env.TOBI_DATA_DIR || env.TOBI_DATA || 'data');
  const sec = securityFromEnv(env);
  const dev = env.TOBI_DEV === '1' && !pc.prod;
  const backupDir = resolve(HERE, env.TOBI_BACKUPS || (env.TOBI_DATA_DIR ? join(dataDir, 'backups') : 'backups'));
  // 復元（公開サーバー向け：止めてから差し替える代わりに、起動の前に 1 回だけ）。TOBI_RESTORE_FROM=<バックアップのパス>。
  // 同じファイルからは 2 回やらない（<データ>/restored-<名前> の印）。終わったら環境変数を消す
  if (env.TOBI_RESTORE_FROM) {
    const from = resolve(HERE, env.TOBI_RESTORE_FROM), mark = join(dataDir, 'restored-' + from.split(sep).pop());
    if (!existsSync(mark)) {
      const r = restoreFrom(from, join(dataDir, 'game.db'), backupDir);
      writeFileSync(mark, new Date().toISOString());
      console.log(`[tobinezumi] 復元した：${r.from}（アカウント ${r.accounts}・今までの DB は ${r.saved || 'なし'}）`);
    } else console.log('[tobinezumi] TOBI_RESTORE_FROM はもう使った（' + mark + '）。消しておいてください');
  }
  const srv = await startServer({
    port: +(env.TOBI_PORT || env.PORT || 8080), host: env.HOST || '0.0.0.0', dataDir,
    backupDir, backupKeep: +(env.TOBI_BACKUP_KEEP || 48), backupHours: +(env.TOBI_BACKUP_HOURS ?? 1),
    statsSec: +(env.TOBI_STATS_SEC ?? 60), pidFile: join(dataDir, 'server.pid'),
    authOpts: { registerMax: +(env.TOBI_REGISTER_MAX || 20) },
    ...sec, statsToken: env.TOBI_STATS_TOKEN || '', publicWs: env.TOBI_PUBLIC_WS || '/ws', backupOnExit: env.TOBI_BACKUP_ON_EXIT === '1' || pc.prod,
    gameOpts: {
      predators: ['normal', 'easy', 'off'].includes(env.TOBI_PREDATORS) ? env.TOBI_PREDATORS : 'normal', raids: env.TOBI_RAIDS !== '0',
      ...(dev ? { devMode: true, timeScale: +(env.TOBI_TIMESCALE || 1) || 1, startHour: env.TOBI_START_HOUR != null && env.TOBI_START_HOUR !== '' ? +env.TOBI_START_HOUR : null,
        weather: env.TOBI_WEATHER || null, season: env.TOBI_SEASON || null } : {}),
    },
  });
  if (dev) console.log(`[tobinezumi] 開発モード：時計 ×${srv.game.clock.scale}${env.TOBI_START_HOUR ? '、開始 ' + env.TOBI_START_HOUR + ' 時' : ''}${srv.game.clock.weather ? '、天気 ' + srv.game.clock.weather : ''}${srv.game.clock.season ? '、季節 ' + srv.game.clock.season : ''}`);
  console.log(`[tobinezumi] http://localhost:${srv.port}/tobinezumi.html  （WebSocket: /ws、DB: ${join(dataDir, 'game.db')}、PID ${process.pid}${sec.origins.length ? '、Origin: ' + sec.origins.join(' ') : ''}）`);
  let stopping = false;
  const stop = async sig => {
    if (stopping) return; stopping = true;
    console.log(`[tobinezumi] ${sig}：位置を保存して止めます`);
    const force = setTimeout(() => { console.log('[tobinezumi] 10 秒たっても止まらないので終わります'); process.exit(1); }, 10000);
    force.unref();
    try { await srv.close(); } catch (e) { console.error(e); }
    process.exit(0);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
