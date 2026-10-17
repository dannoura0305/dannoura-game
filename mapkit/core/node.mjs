// node 専用の小さな助け（ファイルの読み書き・設定・登録簿）。ゲームからは読まない。
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute, relative } from 'node:path';
import { loadRegistry } from './schemas.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rootPath = p => isAbsolute(p) ? p : join(ROOT, p);
export const rel = p => relative(ROOT, p).split('\\').join('/');
export const readJson = p => JSON.parse(readFileSync(rootPath(p), 'utf8'));
export const registry = () => loadRegistry(readJson);

/** wakaba.config.json（無ければ既定） */
export function loadConfig() {
  const p = join(ROOT, 'wakaba.config.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { assetLibrary: { root: 'wakaba-assets', entries: 'wakaba-assets/entries' }, projects: {} };
}

/** フォルダの中の *.json を全部（meta.json・*.meta.json など）。ファイルならそれだけ */
export function listJson(p) {
  const abs = rootPath(p);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [abs];
  const out = [];
  for (const f of readdirSync(abs).sort()) {
    const q = join(abs, f);
    if (statSync(q).isDirectory()) out.push(...listJson(q));
    else if (f.endsWith('.json')) out.push(q);
  }
  return out;
}

/** 簡単な引数の読み取り：--key value／--flag と、残りの位置引数 */
export function parseArgs(argv, flags = []) {
  const opt = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); if (flags.includes(k)) opt[k] = true; else opt[k] = argv[++i]; }
    else pos.push(a);
  }
  return { opt, pos };
}
