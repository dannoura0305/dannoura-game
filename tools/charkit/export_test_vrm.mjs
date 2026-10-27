// 試験用の VRM 1.0・VRMA 1.0 を作る（配管の試験用・本番の絵ではない）。docs/shinshoku/ASSET_IMPORT.md「試験用の VRM」。
//   node tools/charkit/export_test_vrm.mjs [--out shinshoku/assets]
//   node tools/charkit/export_test_vrm.mjs --clips dannoura   … 本番の動きの組（test の印なし）だけを shinshoku/assets/anim/dannoura/ へ（試験用の VRM は書かない）
//   node tools/charkit/export_test_vrm.mjs --clips companion --pers companion   … P17：相棒の組（歩き方の性格 companion：charkit/anim/clips の PERSONALITY）
// 中で小さな HTTP の配り手を一時的に立て（終わったら閉じる）、Playwright の Chromium で tools/charkit/export_test_vrm.html を開いて書き出す。
// 出る物：shinshoku/assets/characters/test/dannoura_test.vrm・shinshoku/assets/anim/test/*.vrma・clips.json・README（sha256 の表）。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = join(ROOT, arg('out', 'shinshoku/assets'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
const srv = createServer((q, r) => {
  const p = normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  if (p === 'favicon.ico') { r.writeHead(204); r.end(); return; }
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
});
await new Promise(res => srv.listen(0, '127.0.0.1', res));
const port = srv.address().port;
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/charkit/export_test_vrm.html`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const clipsOnly = arg('clips', null);
  const res = await page.evaluate(o => window.exportAll(o), { test: !clipsOnly, pers: arg('pers', null) });
  if (errs.length) { console.error('ページのエラー：', errs); process.exitCode = 1; }
  const sha = b => createHash('sha256').update(b).digest('hex');
  if (clipsOnly) {
    const adir = join(OUT, 'anim', clipsOnly);
    mkdirSync(adir, { recursive: true });
    const files = [];
    for (const [name, b64] of Object.entries(res.clips)) { const b = Buffer.from(b64, 'base64'); writeFileSync(join(adir, name), b); files.push({ file: name, bytes: b.length, sha256: sha(b) }); }
    res.set.files = files;
    writeFileSync(join(adir, 'clips.json'), JSON.stringify(res.set, null, 1) + '\n');
    for (const f of files) console.log(`${(f.bytes / 1024).toFixed(1).padStart(8)} KB  ${f.sha256.slice(0, 16)}  anim/${clipsOnly}/${f.file}`);
    process.exit(errs.length ? 1 : 0);
  }
  const cdir = join(OUT, 'characters/test'), adir = join(OUT, 'anim/test');
  mkdirSync(cdir, { recursive: true }); mkdirSync(adir, { recursive: true });
  const rows = [];
  const vrm = Buffer.from(res.vrm, 'base64'); writeFileSync(join(cdir, 'dannoura_test.vrm'), vrm); rows.push(['characters/test/dannoura_test.vrm', vrm.length, sha(vrm)]);
  for (const [name, b64] of Object.entries(res.clips)) { const b = Buffer.from(b64, 'base64'); writeFileSync(join(adir, name), b); rows.push(['anim/test/' + name, b.length, sha(b)]); }
  writeFileSync(join(adir, 'clips.json'), JSON.stringify(res.set, null, 1) + '\n');
  const meta = {
    id: 'test.dannoura_test', test: true, provisional: true, notFinalArt: true,
    note: '配管の試験用（tools/charkit/export_test_vrm.mjs でコードで組んだだんのうらを書き出した物）。本番の絵ではない。ゲームでは ?vrm=test の時だけ使う。',
    license: { id: 'project', commercial: 'n/a（試験用・配らない）', redistributeRaw: 'no' }, author: 'project', source: { type: 'procedural_export', tool: 'tools/charkit/export_test_vrm.mjs' },
    info: res.info, files: rows.map(([f, n, h]) => ({ file: f, bytes: n, sha256: h })),
  };
  writeFileSync(join(cdir, 'dannoura_test.meta.json'), JSON.stringify(meta, null, 1) + '\n');
  console.log(JSON.stringify(res.info));
  for (const [f, n, h] of rows) console.log(`${(n / 1024).toFixed(1).padStart(8)} KB  ${h.slice(0, 16)}  ${f}`);
  console.log('ms', res.ms);
} finally { await browser.close(); srv.close(); }
