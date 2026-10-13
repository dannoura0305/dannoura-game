// tobinezumi/server/index.js — 起動：静的配信（リポジトリのルートの必要な所だけ）＋ /tobi-server.json ＋ WebSocket(/ws) ＋ SQLite
//
//   cd tobinezumi/server && npm install && npm start      → http://localhost:8080/tobinezumi.html
//
// 環境変数：PORT(8080) HOST(0.0.0.0) TOBI_DATA(./data) TOBI_BACKUPS(./backups) TOBI_BACKUP_KEEP(48) TOBI_BACKUP_HOURS(1, 0 で止める)
//           TOBI_STATS_SEC(60, 0 で止める：CPU・メモリ・通信量のログ) TOBI_REGISTER_MAX(20 / 10 分 / 接続元)
//           開発用（TOBI_DEV=1 のときだけ効く）：TOBI_TIMESCALE（時計・暮らし・採集物の戻りを何倍速にするか）TOBI_START_HOUR（起動時の世界の時刻 0〜23）
import http from 'node:http';
import { createReadStream, statSync, writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db.js';
import { Auth } from './auth.js';
import { Game } from './game.js';
import { backupNow } from './backup.js';

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
  const headers = { 'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache', etag, 'x-content-type-options': 'nosniff' };
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
  backupHours = 1, backupKeep = 48, statsSec = 0, log = console.log, pidFile = null, gameOpts = {}, authOpts = {}, heartbeatMs = 10000 } = {}) {
  const file = dbFile || join(dataDir, 'game.db');
  const store = await openDb(file, { log });
  const auth = new Auth(store, authOpts);
  const game = new Game({ store, auth, log, ...gameOpts }).start();

  const server = http.createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/tobi-server.json') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ws: '/ws', name: 'tobinezumi-local', v: 1 }));
      return;
    }
    if (path === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, ...game.statsSnapshot() }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://x').pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  wss.on('connection', (ws, req) => {
    const ip = (req.socket.remoteAddress || '?').replace(/^::ffff:/, '');
    const conn = {
      ip,
      sendRaw: text => { if (ws.readyState === 1) ws.send(text); },
      close: (code, reason) => { try { ws.close(code, reason); } catch (e) { ws.terminate(); } },
    };
    const s = game.connect(conn);
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data, isBinary) => { if (isBinary) return; ws.isAlive = true; s.onMessage(data.toString()); });
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

  const timers = [hb];
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
    for (const t of timers) clearInterval(t);
    game.shutdown();
    for (const ws of wss.clients) { try { ws.close(1012, 'server restart'); } catch (e) {} }
    await new Promise(r => setTimeout(r, 50));
    for (const ws of wss.clients) ws.terminate();
    await new Promise(r => server.close(() => r()));
    store.close();
    if (pidFile && existsSync(pidFile)) { try { if (readFileSync(pidFile, 'utf8').trim() === String(process.pid)) unlinkSync(pidFile); } catch (e) {} }
  };
  return { port: realPort, http: server, wss, game, store, auth, close };
}

// ───────── npm start ─────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const dataDir = resolve(HERE, env.TOBI_DATA || 'data');
  const srv = await startServer({
    port: +(env.PORT || 8080), host: env.HOST || '0.0.0.0', dataDir,
    backupDir: resolve(HERE, env.TOBI_BACKUPS || 'backups'), backupKeep: +(env.TOBI_BACKUP_KEEP || 48), backupHours: +(env.TOBI_BACKUP_HOURS ?? 1),
    statsSec: +(env.TOBI_STATS_SEC ?? 60), pidFile: join(dataDir, 'server.pid'),
    authOpts: { registerMax: +(env.TOBI_REGISTER_MAX || 20) },
    gameOpts: env.TOBI_DEV === '1' ? { timeScale: +(env.TOBI_TIMESCALE || 1) || 1, startHour: env.TOBI_START_HOUR != null && env.TOBI_START_HOUR !== '' ? +env.TOBI_START_HOUR : null } : {},
  });
  if (env.TOBI_DEV === '1') console.log(`[tobinezumi] 開発モード：時計 ×${srv.game.clock.scale}${env.TOBI_START_HOUR ? '、開始 ' + env.TOBI_START_HOUR + ' 時' : ''}`);
  console.log(`[tobinezumi] http://localhost:${srv.port}/tobinezumi.html  （WebSocket: /ws、DB: ${join(dataDir, 'game.db')}、PID ${process.pid}）`);
  let stopping = false;
  const stop = async sig => {
    if (stopping) return; stopping = true;
    console.log(`[tobinezumi] ${sig}：位置を保存して止めます`);
    await srv.close();
    process.exit(0);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}
