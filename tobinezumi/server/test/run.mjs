// npm test：test/*.test.mjs をすべて実行（e2e は ws が入っていないと飛ばす）
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.log(`✗ ${f} (exit ${r.status})`); }
}
console.log(`\n${files.length - failed}/${files.length} server test files passed`);
process.exit(failed ? 1 : 0);
