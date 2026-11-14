// 合成の効果音の大きさを測る道具（2026-11-14）。Chromium（Playwright）の OfflineAudioContext で各音を 1 倍で鳴らし、ffmpeg の ebur128 で
// 一瞬の大きさ（400ms の窓の最大 LUFS）を測って tobinezumi/client/sfx-levels.js に書く。sfx.js はこの値と sound-data.js の SFX_TARGET から倍率を決める。
//   node tobinezumi/tools/sfx_measure.mjs [--wav <合成音を並べた wav の出力先（リポジトリの外）>] [--after]
//   --after：倍率を掛けた後の大きさも測って表に出す（揃ったかの確認）。表は書き換えない。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), after = args.includes('--after');
const wavAt = args.indexOf('--wav') >= 0 ? args[args.indexOf('--wav') + 1] : null;
const PW = existsSync('/opt/node22/lib/node_modules/playwright/index.mjs') ? '/opt/node22/lib/node_modules/playwright/index.mjs' : 'playwright';
const { chromium } = await import(PW);

const TYPES = { '.js': 'text/javascript', '.html': 'text/html' };
const srv = createServer((q, r) => {
  const p = join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p));
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/tobinezumi/client/sound-data.js`);
const SR = 44100;
const res = await page.evaluate(async ({ SR, after }) => {
  const m = await import('/tobinezumi/client/sfx.js');
  const out = {};
  for (const name of m.SFX_NAMES) {
    const len = name === 'train' ? 5 : 2, runs = [];
    for (let k = 0; k < 3; k++) {
      const ctx = new OfflineAudioContext(1, SR * len, SR);
      const g = m.renderSynth(ctx, ctx.destination, name, 0.05);
      if (after) g.gain.value = m.synthGain(name);
      const b = await ctx.startRendering();
      runs.push(Array.from(b.getChannelData(0)));
    }
    out[name] = runs;
  }
  return out;
}, { SR, after });
await browser.close(); srv.close();

const TMP = mkdtempSync(join(tmpdir(), 'tbsfx-'));
function wav(file, data) {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  writeFileSync(file, b);
}
function mmax(file) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', file, '-af', 'apad=pad_dur=0.5,ebur128=framelog=info', '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const ms = [...String(r.stderr).matchAll(/\bM:\s*(-?[\d.]+)/g)].map(x => parseFloat(x[1])).filter(x => x > -120);
  return ms.length ? Math.max(...ms) : -70;
}
const lu = {}, pk = {}, all = [];
for (const [name, runs] of Object.entries(res)) {
  const v = runs.map((d, k) => { const f = join(TMP, `${name}_${k}.wav`); wav(f, d); return mmax(f); });
  lu[name] = +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
  let p = 0; for (const d of runs) for (const x of d) p = Math.max(p, Math.abs(x)); pk[name] = +(20 * Math.log10(p + 1e-9)).toFixed(1);
  for (const x of runs[0]) all.push(x); for (let i = 0; i < SR * 0.6; i++) all.push(0);
}
if (wavAt) { wav(wavAt, all); console.log('並べた合成音：', wavAt); }
rmSync(TMP, { recursive: true, force: true });
if (after) {
  const { SFX_TARGET } = await import('../client/sound-data.js');
  for (const [k, v] of Object.entries(lu)) console.log(`  ${k.padEnd(8)} ${String(v).padStart(6)} LUFS（目標 ${SFX_TARGET[k]}・差 ${(v - SFX_TARGET[k]).toFixed(1)}）最大 ${pk[k]} dBFS`);
} else {
  writeFileSync(join(ROOT, 'tobinezumi/client/sfx-levels.js'),
    '// 自動生成（tobinezumi/tools/sfx_measure.mjs）：合成の効果音を 1 倍で鳴らした時の大きさ（LUFS：400ms の窓の最大。3 回の平均）。手で書き換えない。\n' +
    `export const SYNTH_LU = {\n${Object.entries(lu).map(([k, v]) => `  ${k}: ${v},`).join('\n')}\n};\n`);
  console.log(lu);
}
