// トビネズミMMO：サーバー（tobinezumi/server）のテストをリポジトリ共通の node tests/run.mjs から回す。
// core（認証・採集の排他・移動の検証・巣の権限と rev・訪問設定・再接続・再起動後の復元・マイグレーション・バックアップ／復元）は
// node:sqlite と共有ルールだけで動く。life（Ver.0.2：暮らし・昼夜・共同作業者・フレンド・訪問の通知）・danger（Ver.0.3：捕食者・土地・引っ越し・
// 入口のふさぎ・襲撃・天気・再起動後も残る）も同じ。e2e（本物の WebSocket）は ws が入っていなければ自分で飛ばす。
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tobinezumi', 'server', 'test');
let failed = 0;
for (const f of ['core.test.mjs', 'life.test.mjs', 'danger.test.mjs', 'e2e.test.mjs']) {
  const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', join(dir, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
