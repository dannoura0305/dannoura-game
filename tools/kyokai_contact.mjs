// tools/kyokai_contact.mjs — 『境界事象』のコード描画（kyokai/art.js の KY_ART）を一覧画像（コンタクトシート）に書き出す
//
//   node tools/kyokai_contact.mjs [出力フォルダ] [--only=場面id,…] [--write-docs]
//
// 出力（既定：./kyokai_contact/）
//   scene_<id>.png      世界 A/B/C を横に並べ、2段目に注目物の枠（KY_ART.objects）、3段目以降に状態違い（安定度・暗さ・opts）
//   overview_43.png     全場面×全世界を 4:3（スマホの縦長パネル相当）で cover 表示した一覧（切れても大事な物が見えるか）
//   portraits.png       人物の顔：全員×全表情
//   icons.png           アイコン 32×32 を 2 倍で
//   objects.json        全場面×世界の注目物（0..1 の比率）
//   --write-docs のとき docs/kyokai/scenes.md の「注目物の座標」節を objects.json から作り直す（座標表は自動生成。手で直さない）
//
// サーバーは立てない：Playwright の route でリポジトリのファイルを http://kyokai.local/ として返す（manifest の fetch も通る）。
// コンソールのエラーがあれば表示して終了コード 1。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find(a => !a.startsWith('--')) || path.join(process.cwd(), 'kyokai_contact'));
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const WRITE_DOCS = args.includes('--write-docs');
fs.mkdirSync(OUT, { recursive: true });

let chromium;
for (const p of ['/opt/node22/lib/node_modules/playwright/index.mjs', 'playwright']) {
  try { ({ chromium } = await import(p)); break; } catch (e) { /* 次へ */ }
}
if (!chromium) { console.error('playwright が見つかりません'); process.exit(2); }
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [];
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.html': 'text/html', '.css': 'text/css' };
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.route('http://kyokai.local/**', async route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/__contact.html') {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000"><script src="kyokai/art.js"></script></body></html>' });
    }
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://kyokai.local/__contact.html');
  await page.waitForFunction(() => !!window.KY_ART);
  await page.waitForTimeout(300);

  const res = await page.evaluate(async (ONLY) => {
    const A = window.KY_ART, out = {};
    const font = s => `${s}px 'IPAPGothic','Noto Sans JP',sans-serif`;
    const ids = A.ids().filter(id => !ONLY.length || ONLY.includes(id));
    // 場面ごとの状態違い（3段目以降）
    const EXTRA = {
      center_office: [['A', 3, { stability: 40 }, 'A 安定度40'], ['A', 1, { dark: true, highlight: [{ x: .53, y: .23, r: .05 }] }, 'A dark+highlight'], ['D', 0, {}, '未定義の世界 D（A＋薄い色）']],
      center_lab: [['A', 1.2, { flags: { feed: true } }, 'A flags.feed'], ['B', 1.2, { flags: { feed: true } }, 'B flags.feed']],
      center_basement: [['A', 1, { flags: { unlocked: true } }, 'A flags.unlocked']],
      station_live: [['A', 2, { flags: { train: false } }, 'A 列車なし'], ['A', 1, { adCloseup: true }, 'adCloseup'], ['A', 1.3, { adCloseup: true, glitch: .6 }, 'adCloseup glitch .6']],
      stream_room: [['A', 1, { turn: .5 }, 'turn .5'], ['A', 1, { turn: 1 }, 'turn 1'], ['A', 1, { variant: 'success' }, 'success'], ['A', 1, { variant: 'study' }, 'study'], ['A', 1, { variant: 'stream' }, 'stream'], ['A', 1, { variant: 'collapse' }, 'collapse']],
      collapse: [['A', 3, {}, 't=3'], ['A', 6, {}, 't=6'], ['A', 9, {}, 't=9']],
      core: [['A', 2, { progress: .5 }, 'progress .5'], ['A', 3, { progress: 1 }, 'progress 1']],
      town_map: [['A', 0, { locked: ['tunnel', 'old_lab', 'riverbank', 'station_ruin', 'mountain_road'], current: 'center' }, 'locked 5 / current center'], ['B', 0, {}, 'B（鉄道のある地図）']],
      shotengai: [['A', 2, { stability: 20 }, 'A 安定度20'], ['B', 2, { stability: 60 }, 'B 安定度60']],
      residential: [['A', 2, { dark: true }, 'A dark']],
      old_lab: [['A', 2, { dark: true, light: { x: .5, y: .5, r: .2 } }, 'A dark（懐中電灯）']],
      factory_glimpse: [['A', 2.4, {}, 't=2.4']],
      bureau: [['A', 1, { flags: { b30: true } }, 'flags.b30']],
    };
    const TW = 480, TH = 270;
    function tile(id, w, t, o) { const c = document.createElement('canvas'); c.width = TW; c.height = TH; A.draw(c.getContext('2d'), id, w, t, o); return c; }
    function label(g, x, y, s) { g.font = font(13); g.fillStyle = 'rgba(0,0,0,.65)'; const m = g.measureText(s).width; g.fillRect(x, y, m + 10, 18); g.fillStyle = '#e8f0ff'; g.textBaseline = 'top'; g.fillText(s, x + 5, y + 2); }
    const objects = {};
    for (const id of ids) {
      const ws = A.worlds(id), ex = EXTRA[id] || [];
      const cols = Math.max(ws.length, Math.min(3, ex.length || 1)), rows = 2 + Math.ceil(ex.length / cols);
      const c = document.createElement('canvas'); c.width = cols * TW + (cols + 1) * 6; c.height = rows * TH + (rows + 1) * 6 + 24; const g = c.getContext('2d');
      g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.font = font(15); g.fillStyle = '#fff'; g.fillText(id + ' — ' + A.name(id), 8, 18);
      objects[id] = {};
      ws.forEach((w, i) => {
        const x = 6 + i * (TW + 6), y = 30;
        g.drawImage(tile(id, w, 1.5, {}), x, y); label(g, x + 4, y + 4, 'world ' + w);
        const y2 = y + TH + 6; g.drawImage(tile(id, w, 1.5, {}), x, y2);
        const obs = A.objects(id, w); objects[id][w] = obs;
        g.lineWidth = 1.5; g.font = font(10);
        obs.forEach((o, k) => { const hue = (k * 67) % 360; g.strokeStyle = `hsl(${hue},90%,65%)`; g.strokeRect(x + o.x * TW, y2 + o.y * TH, o.w * TW, o.h * TH); g.fillStyle = `hsl(${hue},90%,70%)`; g.fillText(o.id, x + o.x * TW + 2, y2 + o.y * TH + 2); });
        label(g, x + 4, y2 + TH - 22, 'objects ' + w + '（' + obs.length + '）');
      });
      ex.forEach((e, i) => { const x = 6 + (i % cols) * (TW + 6), y = 30 + (2 + Math.floor(i / cols)) * (TH + 6); g.drawImage(tile(id, e[0], e[1], e[2]), x, y); label(g, x + 4, y + 4, e[3]); });
      out['scene_' + id + '.png'] = c.toDataURL('image/png');
    }
    // 4:3 の一覧
    if (!ONLY.length) {
      const all = []; ids.forEach(id => A.worlds(id).forEach(w => all.push([id, w])));
      const tw = 240, th = 180, cols = 6, rows = Math.ceil(all.length / cols);
      const c = document.createElement('canvas'); c.width = cols * (tw + 4) + 4; c.height = rows * (th + 4) + 4; const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
      all.forEach(([id, w], i) => { const t = document.createElement('canvas'); t.width = tw; t.height = th; A.draw(t.getContext('2d'), id, w, 1, {}); const x = 4 + (i % cols) * (tw + 4), y = 4 + Math.floor(i / cols) * (th + 4); g.drawImage(t, x, y); g.font = font(10); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y + th - 14, tw, 14); g.fillStyle = '#fff'; g.fillText(id + ' ' + w, x + 3, y + th - 3); });
      out['overview_43.png'] = c.toDataURL('image/png');
      // 顔
      const who = A.ids('portrait'); const pw = 128, ph = 160; const maxF = Math.max(...who.map(w => A.faces(w).length));
      const pc = document.createElement('canvas'); pc.width = 90 + maxF * (pw + 6); pc.height = who.length * (ph + 20) + 10; const pg = pc.getContext('2d'); pg.fillStyle = '#1a1830'; pg.fillRect(0, 0, pc.width, pc.height);
      who.forEach((w, r) => { pg.font = font(12); pg.fillStyle = '#fff'; pg.fillText(w, 6, 10 + r * (ph + 20) + ph / 2);
        A.faces(w).forEach((f, k) => { const t = document.createElement('canvas'); t.width = pw; t.height = ph; A.portrait(t.getContext('2d'), w, f, pw, ph); const x = 90 + k * (pw + 6), y = 10 + r * (ph + 20); pg.fillStyle = '#2a2848'; pg.fillRect(x, y, pw, ph); pg.drawImage(t, x, y); pg.fillStyle = '#cde'; pg.font = font(10); pg.fillText(f, x + 2, y + ph + 12); }); });
      out['portraits.png'] = pc.toDataURL('image/png');
      // アイコン
      const names = A.ids('icon'); const ic = 64, cols2 = 10, rows2 = Math.ceil(names.length / cols2);
      const icv = document.createElement('canvas'); icv.width = cols2 * (ic + 50) + 10; icv.height = rows2 * (ic + 22) + 10; const ig = icv.getContext('2d'); ig.fillStyle = '#14132a'; ig.fillRect(0, 0, icv.width, icv.height); ig.imageSmoothingEnabled = false;
      names.forEach((n, i) => { const x = 10 + (i % cols2) * (ic + 50), y = 6 + Math.floor(i / cols2) * (ic + 22); ig.fillStyle = '#22204a'; ig.fillRect(x, y, ic, ic); ig.drawImage(A.icon(n), x, y, ic, ic); ig.fillStyle = '#cde'; ig.font = font(10); ig.fillText(n, x, y + ic + 12); });
      out['icons.png'] = icv.toDataURL('image/png');
      // 未知の id でも落ちない
      const t = document.createElement('canvas'); t.width = 160; t.height = 90; A.draw(t.getContext('2d'), 'no_such_scene', 'A', 0, {}); A.portrait(t.getContext('2d'), 'nobody', 'x', 64, 80); A.icon('no_such_icon');
    }
    return { out, objects };
  }, ONLY);
  for (const [name, url] of Object.entries(res.out)) fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(OUT, 'objects.json'), JSON.stringify(res.objects, null, 1));
  if (WRITE_DOCS && !ONLY.length) writeDocs(res.objects);
  console.log('wrote', Object.keys(res.out).length, 'images to', OUT);
} finally {
  await browser.close();
}
if (errors.length) { console.error('[console]', errors.join('\n')); process.exit(1); }

function writeDocs(objects) {
  const f = path.join(ROOT, 'docs/kyokai/scenes.md');
  const BEGIN = '<!-- objects:begin（tools/kyokai_contact.mjs --write-docs が生成。手で直さない） -->', END = '<!-- objects:end -->';
  let md = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const lines = [BEGIN, ''];
  for (const [id, ws] of Object.entries(objects)) {
    lines.push(`### ${id}`, '', '| 世界 | id | 何か | x | y | w | h |', '|---|---|---|---|---|---|---|');
    for (const [w, list] of Object.entries(ws)) for (const o of list) lines.push(`| ${w} | \`${o.id}\` | ${o.label.replace(/\|/g, '／')} | ${o.x} | ${o.y} | ${o.w} | ${o.h} |`);
    lines.push('');
  }
  lines.push(END);
  const block = lines.join('\n');
  if (md.includes(BEGIN) && md.includes(END)) md = md.slice(0, md.indexOf(BEGIN)) + block + md.slice(md.indexOf(END) + END.length);
  else md += '\n' + block + '\n';
  fs.writeFileSync(f, md);
  console.log('updated', f);
}
