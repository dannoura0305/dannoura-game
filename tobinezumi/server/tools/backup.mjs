// tobinezumi/server/tools/backup.mjs — バックアップを今すぐ 1 つ取る（サーバーが動いていても取れる：VACUUM INTO）
//
//   npm run backup                         … data/game.db → backups/game-YYYYMMDD-HH.db（48 世代を残す）
//   npm run backup -- --keep 24 --db data/game.db --out backups
//   npm run backup -- --list               … 一覧
//
// サーバー（npm start）も 1 時間ごとに同じものを自動で取る（TOBI_BACKUP_HOURS・TOBI_BACKUP_KEEP）。
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
import { backupNow, listBackups, checkBackup } from '../backup.js';

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const db = resolve(HERE, opt('db', join(process.env.TOBI_DATA_DIR || process.env.TOBI_DATA || 'data', 'game.db')));
const out = resolve(HERE, opt('out', process.env.TOBI_BACKUPS || 'backups'));
const keep = parseInt(opt('keep', process.env.TOBI_BACKUP_KEEP || '48'), 10);

if (args.includes('--list')) {
  for (const f of listBackups(out)) console.log(f, (statSync(join(out, f)).size / 1024).toFixed(0) + 'KB');
  process.exit(0);
}
try {
  const f = backupNow(db, out, { keep });
  const info = checkBackup(f);
  console.log(`[backup] ${f}（schema v${info.version}・アカウント ${info.accounts}・${(info.bytes / 1024).toFixed(0)}KB・${keep} 世代まで保存）`);
} catch (e) { console.error('[backup] 失敗：' + e.message); process.exit(1); }
