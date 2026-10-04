// tools/check_gen_assets.mjs — 生成画像（assets/gen/manifest.json）の検品と、参照画像の書き出し
//
//   node tools/check_gen_assets.mjs              … file が入っている項目を検品（大きさ・透過・目録との食い違い）
//   node tools/check_gen_assets.mjs --refs DIR   … 生成のときに添付する参照画像（今の SVG・アイコン）を DIR に PNG で書き出す
//
// 検品の中身:
//   ・file が存在し、PNG/WebP/JPEG として読めるか
//   ・大きさが size（例 128x128）と同じか（違えば警告。縦横比が違えばエラー）
//   ・transparent:true なのに透明なピクセルが無い（背景が塗りつぶし）→ エラー
//   ・transparent:false なのに四隅が透明 → 警告
//   ・assets/gen/ の下にあるのに目録のどこからも使われていない画像（rpg/ は別担当なので見ない）→ 警告
// Playwright（グローバル導入）と同梱 Chromium の canvas で読むので、Pillow などは要らない。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const refsDir = args.includes('--refs') ? path.resolve(args[args.indexOf('--refs') + 1] || 'gen-refs') : null;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/gen/manifest.json'), 'utf8'));
const MIME = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const dataUrl = f => `data:${MIME[path.extname(f).toLowerCase()] || 'application/octet-stream'};base64,` + fs.readFileSync(path.join(ROOT, f)).toString('base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
let errors = 0, warns = 0;
const err = (id, m) => { errors++; console.log(`  ✗ ${id}: ${m}`); };
const warn = (id, m) => { warns++; console.log(`  ! ${id}: ${m}`); };
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  // 画像を canvas に描いて、大きさと透明度を調べる
  const probe = (url) => page.evaluate(async (url) => {
    const im = new Image();
    await new Promise((res, rej) => { im.onload = res; im.onerror = () => rej(new Error('読めない')); im.src = url; });
    const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas');
    c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) clear++;
    const a = (x, y) => d[(y * w + x) * 4 + 3];
    const corners = [a(0, 0), a(w - 1, 0), a(0, h - 1), a(w - 1, h - 1)];
    return { w, h, clearRatio: clear / (w * h), cornersClear: corners.filter(v => v < 128).length };
  }, url);

  if (!refsDir) {
    console.log('生成画像の検品（assets/gen/manifest.json）');
    const used = new Set();
    const ids = new Set();
    let n = 0;
    for (const a of manifest.assets) {
      if (ids.has(a.id)) err(a.id, 'id が重複'); ids.add(a.id);
      if (a.file == null) continue;
      n++;
      const f = String(a.file);
      used.add(f);
      if (!/^[A-Za-z0-9_\-./]+\.(png|webp|jpe?g|svg)$/i.test(f) || f.includes('..') || f.startsWith('/')) { err(a.id, 'file のパスが使えない形（英数字と - _ . / だけ、assets/ から書く）: ' + f); continue; }
      if (!fs.existsSync(path.join(ROOT, f))) { err(a.id, 'ファイルが無い: ' + f); continue; }
      let r;
      try { r = await probe(dataUrl(f)); } catch (e) { err(a.id, '画像として読めない: ' + f); continue; }
      const [sw, sh] = String(a.size || '').split('x').map(Number);
      if (sw && sh) {
        if (Math.abs(r.w / r.h - sw / sh) > 0.02) err(a.id, `縦横比が違う：${r.w}x${r.h}（目録は ${a.size}）`);
        else if (r.w !== sw || r.h !== sh) warn(a.id, `大きさが ${r.w}x${r.h}（目録は ${a.size}。縮小して描くので動くが、軽くするなら合わせる）`);
      }
      if (a.transparent === true && (r.clearRatio < 0.05 || r.cornersClear < 2)) err(a.id, '背景が透明になっていない（transparent:true）。背景を消した PNG にする');
      if (a.transparent === false && r.cornersClear >= 3) warn(a.id, '四隅が透明（アイコンは背景ごと描く想定）');
      if (!/\.png$/i.test(f)) warn(a.id, 'PNG 以外（' + path.extname(f) + '）。動くが、透過とドットのくっきりさは PNG が確実');
      console.log(`  ✓ ${a.id}: ${f} ${r.w}x${r.h} 透明 ${(r.clearRatio * 100).toFixed(0)}%`);
    }
    // 置いたのに目録で使っていない画像
    const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'rpg' && d.endsWith(path.join('assets', 'gen')) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]) : [];
    for (const p of walk(path.join(ROOT, 'assets/gen'))) {
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (/\.(png|webp|jpe?g)$/i.test(rel) && !used.has(rel)) warn(rel, '目録の file に書かれていない（使われない）');
    }
    console.log(`\n${n} 件を検品：エラー ${errors}・警告 ${warns}`);
  } else {
    // 参照画像の書き出し（今の見た目を PNG に。ChatGPT/Gemini に添付・ComfyUI の IPAdapter に使う）
    fs.mkdirSync(refsDir, { recursive: true });
    await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'main/mobs.js'), 'utf8') });
    const save = async (name, url, size) => {
      const b64 = await page.evaluate(async ({ url, size }) => {
        const im = new Image();
        await new Promise((res, rej) => { im.onload = res; im.onerror = rej; im.src = url; });
        const c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(im, 0, 0, size, size);
        return c.toDataURL('image/png').split(',')[1];
      }, { url, size });
      fs.writeFileSync(path.join(refsDir, name), Buffer.from(b64, 'base64'));
    };
    let n = 0;
    for (const a of manifest.assets) {
      const out = a.id.replace(/\./g, '_') + '_ref.png';
      if (a.id.startsWith('avatar.')) {
        const key = a.id.slice(7);
        const url = await page.evaluate(k => k === 'yodaka' ? mobPortrait('yodaka') : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(_AV_ART[k]()), key);
        await save(out, url.startsWith('data:') ? url : dataUrl(url), 256); n++;
      } else if (/^assets\/img\/.+\.svg$/.test(a.fallback)) {
        await save(out, dataUrl(a.fallback), 512); n++;
      }
    }
    console.log(`${n} 枚の参照画像を ${refsDir} に書き出した（ミニゲームの敵は、ゲームを撮った画像を参照にする）`);
  }
} finally {
  await browser.close();
}
process.exit(errors ? 1 : 0);
