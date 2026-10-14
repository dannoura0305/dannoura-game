// tobinezumi/server/tools/restore.mjs — バックアップから復元する（サーバーを止めてから）
//
//   npm run restore -- backups/game-20261010-09.db
//   npm run restore -- game-20261010-09.db --force     … PID ファイルが残っていても進める（止まっているのが確かなとき）
//
// 手順：中身を確認（integrity_check・schema）→ 今の DB を backups/pre-restore-*.db に退避 → data/game.db を差し替え。
// 終わったら npm start で起動（起動時にマイグレーションが走るので、古い版のバックアップでも新しい版に上がる）。
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { restoreFrom } from '../backup.js';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const dataDir = resolve(HERE, process.env.TOBI_DATA_DIR || process.env.TOBI_DATA || 'data');
const backups = resolve(HERE, process.env.TOBI_BACKUPS || 'backups');
const db = resolve(HERE, opt('db', join(dataDir, 'game.db')));
let file = args.find(a => !a.startsWith('--') && a !== opt('db', null));
if (!file) { console.error('使い方：npm run restore -- <バックアップのファイル>'); process.exit(2); }
if (!isAbsolute(file) && !existsSync(resolve(process.cwd(), file)) && existsSync(join(backups, file))) file = join(backups, file);
file = resolve(process.cwd(), file);
if (!existsSync(file)) { console.error('ファイルが無い：' + file); process.exit(2); }

const pidFile = join(dataDir, 'server.pid');
if (existsSync(pidFile) && !args.includes('--force')) {
  const pid = parseInt(readFileSync(pidFile, 'utf8'), 10);
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch (e) {}
  if (alive) { console.error(`サーバーが動いている（PID ${pid}）。先に止めてね（Ctrl+C か kill ${pid}）`); process.exit(3); }
}
try {
  const r = restoreFrom(file, db, backups);
  console.log(`[restore] ${r.from} → ${db}（schema v${r.version}・アカウント ${r.accounts}）`);
  if (r.saved) console.log(`[restore] 復元前の DB は ${r.saved} に退避した`);
  console.log('[restore] npm start で起動してね');
} catch (e) { console.error('[restore] 失敗：' + e.message); process.exit(1); }
