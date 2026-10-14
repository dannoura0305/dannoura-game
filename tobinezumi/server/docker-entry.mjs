// tobinezumi/server/docker-entry.mjs — コンテナの入口（Dockerfile の CMD）。
// Fly.io・Render のボリュームは root の持ち物でつながるので、root で起動したときだけ データの置き場（TOBI_DATA_DIR）を
// node ユーザー（uid 1000）の持ち物にしてから、権限を落として（setgid / setuid）サーバーを動かす。root のまま遊ばせない。
import { chownSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const UID = 1000, GID = 1000;
function chownTree(dir, depth = 0) {
  try { chownSync(dir, UID, GID); } catch (e) { return; }
  if (depth > 3) return;
  let list = [];
  try { list = readdirSync(dir); } catch (e) { return; }
  for (const f of list) {
    const p = join(dir, f);
    try { if (statSync(p).isDirectory()) chownTree(p, depth + 1); else chownSync(p, UID, GID); } catch (e) { /* 続ける */ }
  }
}
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  const data = process.env.TOBI_DATA_DIR || '/data';
  const backups = process.env.TOBI_BACKUPS || join(data, 'backups');
  for (const d of [data, backups]) { try { mkdirSync(d, { recursive: true }); } catch (e) {} chownTree(d); }
  process.setgid(GID);
  process.setuid(UID);
}
const { main } = await import('./index.js');
await main();
