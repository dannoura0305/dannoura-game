// 境界侵食 P12：町の地図帳の「絵の枠」（窓・看板の字・止まれ・マンホールなど手続きのキャンバスで描く枠）を、ブラウザで 1 枚の PNG に書き出す。
// PBR の地図帳を焼く tools/shinshoku/bake_town_pbr.py が、材質（matgen の WebP）の無い枠にこの絵を使う。
//   python3 -m http.server 8796 --directory <repo> を起動してから
//   node tools/shinshoku/dump_town_canvas.mjs <出力.png> [--base http://localhost:8796] [--tile 512]
// 環境変数：PW_MODULE（playwright の index.mjs）・PW_CHROMIUM（chromium の実行ファイル）
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--')) || 'town_canvas.png';
const BASE = (args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:8796').replace(/\/$/, '');
const TILE = args.includes('--tile') ? +args[args.indexOf('--tile') + 1] : 512;
const { chromium } = await import(process.env.PW_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
// 遊ぶページの importmap（three）を使うため、ゲームのページを開いてから地図帳のモジュールだけを読む
await page.goto(`${BASE}/shinshoku.html?test=1`);
const r = await page.evaluate(async ts => {
  const m = await import('./shinshoku/render/townmat.js');
  const c = m.townAtlasCanvas(ts);
  return { url: c.toDataURL('image/png'), tiles: m.TILES, n: m.ATLAS_N, rows: m.ATLAS_ROWS, w: c.width, h: c.height };
}, TILE);
writeFileSync(OUT, Buffer.from(r.url.split(',')[1], 'base64'));
writeFileSync(OUT.replace(/\.png$/, '') + '.json', JSON.stringify({ tiles: r.tiles, n: r.n, rows: r.rows, tile: TILE, w: r.w, h: r.h }, null, 1));
console.log(`書いた：${OUT}（${r.w}×${r.h}・枠 ${r.tiles.length}）`);
await browser.close();
