// tools/export_rpg_sprites.mjs — RPG「壇ノ浦夢譚」（minigames/rpg.js）のコード描きドット絵を、参照用の PNG シートに書き出す
//
//   node tools/export_rpg_sprites.mjs            … 全部
//   node tools/export_rpg_sprites.mjs party.dan  … id を指定（前方一致・複数可）
//   node tools/export_rpg_sprites.mjs --fit party.dan ~/Downloads/dan.png [--scale 2]
//                                                … 生成画像を決まった大きさに縮めて assets/gen/rpg/party.dan.png に置き、manifest の file を書く
//
// 出力:
//   assets/gen/rpg/ref/<id>.png      … 原寸（1ドット=1px）のシート。生成画像の「下絵」（img2img / ControlNet の入力）に使う
//   assets/gen/rpg/ref/<id>@4x.png   … 4倍に拡大したもの（目で見る・AI に見せる用。最近傍拡大）
//   assets/gen/rpg/ref/_contact.png  … 全部を並べた一覧（3倍）
//   assets/gen/rpg/manifest.json     … 差し替え口の一覧。rpg.js の RPG_ART.assets() と同期する。
//                                       すでに書かれている file / status / note は消さない（新しい id は requested・file:null で足す）
//
// 書き出す絵は、生成画像が入っていても「コード描画」のほう（RPG_ART.ref は差し替えを使わない）。
// Playwright（グローバル導入）と同梱 Chromium を使う。サーバーは立てず、空のページに rpg.js を直接読み込む。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(ROOT, 'assets', 'gen', 'rpg');
const REF = path.join(GEN, 'ref');
const MANIFEST = path.join(GEN, 'manifest.json');
const argv = process.argv.slice(2);

// ── 取り込み：node tools/export_rpg_sprites.mjs --fit <id> <生成した画像> [--scale N] [--keep-alpha] ──
//   生成画像を manifest の size の N 倍（既定 1）にぴったり縮めて（縦横比が違えば中央で切り抜き）、
//   assets/gen/rpg/<id>.png に書き、manifest の file をそのパスに、status を wip にする。
//   transparent の素材はアルファを 0/255 の2値にする（--keep-alpha で無効）。
if (argv[0] === '--fit') {
  const [, id, input] = argv;
  const si = argv.indexOf('--scale'), N = si > 0 ? Math.max(1, parseInt(argv[si + 1], 10) || 1) : 1;
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const a = man.assets.find(x => x.id === id);
  if (!a || !input || !fs.existsSync(input)) { console.error('使い方: --fit <id> <画像ファイル> [--scale N]（id は manifest にあるもの）'); process.exit(2); }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  let png;
  try {
    const page = await b.newPage();
    await page.setContent('<body></body>');
    const ext = path.extname(input).slice(1).toLowerCase().replace('jpg', 'jpeg');
    png = await page.evaluate(async ({ src, W, H, bin }) => {
      const im = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
      // 縦横比を合わせて中央で切り抜き → 段階的に半分ずつ縮めて（平均）→ 最後に目的の大きさ
      const k = Math.max(W / im.width, H / im.height), cw = W / k, ch = H / k;
      let c = document.createElement('canvas'); c.width = Math.round(cw); c.height = Math.round(ch);
      c.getContext('2d').drawImage(im, (im.width - cw) / 2, (im.height - ch) / 2, cw, ch, 0, 0, c.width, c.height);
      while (c.width / 2 >= W && c.height / 2 >= H) { const d = document.createElement('canvas'); d.width = Math.round(c.width / 2); d.height = Math.round(c.height / 2); const g = d.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, d.width, d.height); c = d; }
      const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, W, H);
      if (bin) { const d = g.getImageData(0, 0, W, H); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 128 ? 255 : 0; g.putImageData(d, 0, 0); }
      return o.toDataURL('image/png');
    }, { src: `data:image/${ext};base64,` + fs.readFileSync(input).toString('base64'), W: a.size.w * N, H: a.size.h * N, bin: a.transparent && !argv.includes('--keep-alpha') });
  } finally { await b.close(); }
  const rel = `assets/gen/rpg/${id}.png`;
  fs.writeFileSync(path.join(ROOT, rel), Buffer.from(png.split(',')[1], 'base64'));
  a.file = rel; if (a.status === 'requested') a.status = 'wip';
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 1) + '\n');
  console.log(`${rel} (${a.size.w * N}×${a.size.h * N}) を書き、manifest の file を設定した（status: ${a.status}）`);
  process.exit(0);
}
const only = argv;

fs.mkdirSync(REF, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
let out;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="background:#111"></body>');
  // rpg.js がファイルの読み込み時に使うものだけ用意する（本体の起動はしない）
  await page.evaluate(() => {
    window.addMinigameStyle = () => {};
    window.registerMinigame = () => {};
    window.gs = {};
  });
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'minigames', 'rpg.js'), 'utf8') });
  out = await page.evaluate(async (only) => {
    const A = window.RPG_ART;
    if (!A) throw new Error('RPG_ART が見つからない');
    await A.ready();
    const list = A.assets().filter(a => !only.length || only.some(p => a.id.startsWith(p)));
    const res = [];
    for (const a of list) {
      const c = A.ref(a.id);
      const big = document.createElement('canvas'); big.width = c.width * 4; big.height = c.height * 4;
      const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, big.width, big.height);
      res.push({ id: a.id, w: c.width, h: c.height, png: c.toDataURL('image/png'), png4: big.toDataURL('image/png') });
    }
    return { assets: A.assets(), sheets: res };
  }, only);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
} finally {
  await browser.close();
}

const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
for (const s of out.sheets) {
  save(path.join(REF, `${s.id}.png`), s.png);
  save(path.join(REF, `${s.id}@4x.png`), s.png4);
}
console.log(`ref: ${out.sheets.length} sheets -> ${path.relative(ROOT, REF)}/`);

// ── manifest を同期（既存の file / status / note は残す） ──
let old = null;
try { old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { old = null; }
const prev = new Map(((old && old.assets) || []).map(a => [a.id, a]));
const assets = out.assets.map(a => {
  const p = prev.get(a.id) || {};
  return {
    id: a.id,
    category: a.category,
    name: a.name,
    size: { w: a.w, h: a.h },
    frames: { cols: a.cols, rows: a.rows, cell: { w: a.cw, h: a.ch }, layout: a.layout },
    anchor: a.anchor,
    transparent: a.transparent,
    facing: a.facing,
    ref: `assets/gen/rpg/ref/${a.id}.png`,
    status: p.status || 'requested',
    file: p.file === undefined ? null : p.file,
    ...(p.note ? { note: p.note } : {}),
  };
});
const manifest = {
  version: 1,
  about: 'RPG「壇ノ浦夢譚」の生成画像の差し替え口。file に PNG のパス（assets/gen/rpg/ 以下）を書くと、その絵がコード描画の代わりに使われる。null ならコード描画。詳しくは docs/rpg-art.md。',
  scaleRule: 'PNG は size の整数倍（1倍・2倍・4倍…）。倍率は横幅から自動で判定し、最近傍で原寸に戻して描く。',
  assets,
};
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${assets.length} assets (${assets.filter(a => a.file).length} with file) -> ${path.relative(ROOT, MANIFEST)}`);

// ── 一覧画像（4倍）：Chromium でもう一度並べる ──
if (!only.length) {
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  try {
    const page = await b2.newPage();
    await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
    const data = await page.evaluate(async (sheets) => {
      const ims = await Promise.all(sheets.map(s => new Promise(r => { const im = new Image(); im.onload = () => r({ s, im }); im.src = s.png; })));
      const S = 3, PAD = 6, LBL = 12, maxW = 1400;
      let x = PAD, y = PAD, rowH = 0; const pos = [];
      for (const { s, im } of ims) {
        const w = im.width * S, h = im.height * S + LBL;
        if (x + w > maxW) { x = PAD; y += rowH + PAD; rowH = 0; }
        pos.push({ s, im, x, y }); x += w + PAD; rowH = Math.max(rowH, h);
      }
      const c = document.createElement('canvas'); c.width = maxW; c.height = y + rowH + PAD;
      const g = c.getContext('2d'); g.fillStyle = '#2a2440'; g.fillRect(0, 0, c.width, c.height);
      g.imageSmoothingEnabled = false; g.font = '10px monospace'; g.fillStyle = '#e6e0ff';
      for (const p of pos) { g.fillText(p.s.id, p.x, p.y + 9); g.drawImage(p.im, p.x, p.y + LBL, p.im.width * S, p.im.height * S); }
      return c.toDataURL('image/png');
    }, out.sheets.map(s => ({ id: s.id, png: s.png })));
    save(path.join(REF, '_contact.png'), data);
    console.log('contact sheet: assets/gen/rpg/ref/_contact.png');
  } finally { await b2.close(); }
}
