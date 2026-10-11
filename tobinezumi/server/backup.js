// tobinezumi/server/backup.js — SQLite の世代バックアップ（VACUUM INTO）と復元。index.js（1 時間ごと）と tools/*.mjs から使う
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync, mkdirSync, unlinkSync, copyFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const pad = n => String(n).padStart(2, '0');
/** game-YYYYMMDD-HH.db（その時刻の「時」まで。同じ時間のうちに取り直すと上書き） */
export function backupName(d = new Date()) {
  return `game-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}.db`;
}
export function listBackups(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /^game-\d{8}-\d{2}\.db$/.test(f)).sort();
}
/**
 * バックアップを 1 つ取る。dbOrFile は Store（動いているサーバーの中）か DB ファイルのパス。
 * 古いものは keep 個を残して消す。作ったファイルのパスを返す。
 */
export function backupNow(dbOrFile, dir, { keep = 48, date = new Date() } = {}) {
  mkdirSync(dir, { recursive: true });
  const out = join(dir, backupName(date));
  const tmp = out + '.tmp';
  if (existsSync(tmp)) unlinkSync(tmp);
  const sql = `VACUUM INTO '${tmp.replace(/'/g, "''")}'`;
  if (typeof dbOrFile === 'string') {
    if (!existsSync(dbOrFile)) throw new Error('DB ファイルが無い: ' + dbOrFile);
    const db = new DatabaseSync(dbOrFile, { readOnly: true });
    try { db.exec(sql); } finally { db.close(); }
  } else dbOrFile.db.exec(sql);
  if (existsSync(out)) unlinkSync(out);
  copyFileSync(tmp, out); unlinkSync(tmp);
  prune(dir, keep);
  return out;
}
export function prune(dir, keep) {
  const list = listBackups(dir);
  const del = list.slice(0, Math.max(0, list.length - keep));
  for (const f of del) { try { unlinkSync(join(dir, f)); } catch (e) {} }
  return del;
}
/** バックアップの中身を確かめる（壊れていない・このゲームの DB である） */
export function checkBackup(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const ic = db.prepare('PRAGMA integrity_check').get();
    if (!ic || Object.values(ic)[0] !== 'ok') throw new Error('integrity_check に失敗');
    const v = db.prepare('SELECT MAX(version) v FROM schema_migrations').get();
    const n = db.prepare('SELECT COUNT(*) n FROM accounts').get();
    return { version: v.v, accounts: n.n, bytes: statSync(file).size };
  } finally { db.close(); }
}
/**
 * 復元：サーバーを止めてから。今の DB は backups/pre-restore-*.db に退避してから差し替える。
 */
export function restoreFrom(file, dbFile, backupDir) {
  const info = checkBackup(file);
  mkdirSync(backupDir, { recursive: true });
  let saved = null;
  if (existsSync(dbFile)) {
    const d = new Date();
    saved = join(backupDir, `pre-restore-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.db`);
    const db = new DatabaseSync(dbFile);
    try { db.exec(`VACUUM INTO '${saved.replace(/'/g, "''")}'`); } finally { db.close(); }
  }
  for (const ext of ['', '-wal', '-shm']) if (existsSync(dbFile + ext)) unlinkSync(dbFile + ext);
  copyFileSync(file, dbFile);
  return { ...info, saved, from: basename(file) };
}
