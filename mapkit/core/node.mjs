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

/** 読みやすくて小さい JSON：数・短い値の並びと短い物は 1 行に（地図仕様・配置・レポートの書き出し用） */
export function compactJSON(v, indent = '  ', width = 120) {
  const one = x => JSON.stringify(x);
  const go = (x, pad) => {
    if (x === null || typeof x !== 'object') return one(x);
    const s = one(x);
    if (s.length + pad.length <= width && (Array.isArray(x) ? x.every(e => e === null || typeof e !== 'object' || one(e).length < 60) : true)) return s.replace(/,"/g, ', "').replace(/":/g, '": ').replace(/,(?=[-\d\[{])/g, ', ');
    const p2 = pad + indent;
    if (Array.isArray(x)) return '[\n' + x.map(e => p2 + go(e, p2)).join(',\n') + '\n' + pad + ']';
    return '{\n' + Object.entries(x).filter(([, e]) => e !== undefined).map(([k, e]) => p2 + one(k) + ': ' + go(e, p2)).join(',\n') + '\n' + pad + '}';
  };
  return go(v, '') + '\n';
}
