// PWA アイコン（assets/pwa/*.png）をゲーム内のドット絵から描き出す。
//   python3 -m http.server 8791 &  →  node tools/make_pwa_icons.mjs [port]
// 顔は minigames/core.js の mgAvatarPaint（main/homescene.js の正面の頭と同じドット）。
// 背景の夜空・三日月・波はここで描く。Playwright（Chromium）が必要。
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const port = process.argv[2] || '8791';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = await import('playwright')); }
catch (e) { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}).catch(() => chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }));
const p = await b.newPage();
await p.goto(`http://localhost:${port}/index.html?icons`);
await p.waitForFunction(() => typeof mgAvatarPaint === 'function');
const out = await p.evaluate(async () => {
  const head = document.createElement('canvas');
  mgAvatarPaint(head, 'normal');
  function draw(size, maskable, pad) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    // 夜の海の背景（紺）
    const g = x.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#141038'); g.addColorStop(.62, '#0a0820'); g.addColorStop(1, '#05040e');
    if (maskable) { x.fillStyle = g; x.fillRect(0, 0, size, size); }
    else {
      const r = size * .19;
      x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, size, size, r); x.fill();
      x.strokeStyle = '#e8b830'; x.lineWidth = Math.max(2, size * .022);
      x.beginPath(); x.roundRect(x.lineWidth / 2 + size * .02, x.lineWidth / 2 + size * .02, size - x.lineWidth - size * .04, size - x.lineWidth - size * .04, r * .85); x.stroke();
    }
    const u = size / 64;   // 64 ドット格子
    // 星
    x.fillStyle = '#fff0a0';
    [[24, 8], [52, 9], [46, 20], [10, 26], [56, 32], [34, 5]].forEach(([a, b2], i) => { const s = i % 2 ? 1 : 1.5; x.fillRect(Math.round(a * u), Math.round(b2 * u), Math.ceil(s * u), Math.ceil(s * u)); });
    // 三日月（金のドット・左上）
    for (let yy = 0; yy < 12; yy++) for (let xx = 0; xx < 12; xx++) {
      const d1 = Math.hypot(xx - 5.5, yy - 5.5), d2 = Math.hypot(xx - 8.5, yy - 3.5);
      if (d1 <= 5.6 && d2 > 4.6) { x.fillStyle = d1 > 4.4 ? '#c8901c' : '#e8b830'; x.fillRect(Math.round((7 + xx) * u), Math.round((6 + yy) * u), Math.ceil(u), Math.ceil(u)); }
    }
    // 波（金のドット線）
    x.fillStyle = 'rgba(232,184,48,.55)';
    for (let i = 0; i < 64; i++) { const yy = 54 + Math.round(Math.sin(i / 3) * 1.2); x.fillRect(Math.floor(i * u), Math.round(yy * u), Math.ceil(u), Math.ceil(u)); }
    x.fillStyle = 'rgba(0,232,200,.25)';
    for (let i = 0; i < 64; i += 2) { const yy = 58 + Math.round(Math.cos(i / 4) * 1); x.fillRect(Math.floor(i * u), Math.round(yy * u), Math.ceil(u), Math.ceil(u)); }
    // 顔（16×17 を整数倍で中央に）
    const area = size * (1 - pad * 2);
    const k = Math.max(1, Math.floor(area / 17));
    const w = 16 * k, h = 17 * k;
    const ox = Math.round((size - w) / 2), oy = Math.round((size - h) / 2 + size * .02);
    // うっすら光る後光
    const rg = x.createRadialGradient(size / 2, oy + h * .55, 0, size / 2, oy + h * .55, w * .75);
    rg.addColorStop(0, 'rgba(140,95,204,.55)'); rg.addColorStop(1, 'rgba(140,95,204,0)');
    x.fillStyle = rg; x.fillRect(0, 0, size, size);
    x.drawImage(head, ox, oy, w, h);
    return c.toDataURL('image/png');
  }
  return {
    'icon-192.png': draw(192, false, .2),
    'icon-512.png': draw(512, false, .2),
    'icon-maskable-512.png': draw(512, true, .27),   // 中央 80% の円に顔が収まるように
    'apple-touch-icon.png': draw(180, true, .2),
  };
});
mkdirSync(join(root, 'assets/pwa'), { recursive: true });
for (const [name, url] of Object.entries(out)) {
  writeFileSync(join(root, 'assets/pwa', name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote assets/pwa/' + name);
}
await b.close();
