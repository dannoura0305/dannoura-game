// 『境界侵食』フル画面（利用者の依頼「スマホのときにブラウザをフル画面にする方法」）：
//  1. タイトルと一時停止／設定メニューに「フル画面にする」。押すと document.documentElement がフル画面（webkit 接頭辞も）、
//     横向きの固定も試す（失敗は無視）。フル画面中は「フル画面を終える」。fullscreenchange で文字を合わせ、押しっぱなしの入力を離す。
//  2. iPhone の Safari は要素のフル画面に対応していない → ボタンの代わりに「共有 → ホーム画面に追加」の案内。
//     境界侵食専用のマニフェスト（shinshoku.webmanifest：display fullscreen・横向き・本編と別の id）。本編の manifest.webmanifest は変えない。
//  3. ホーム画面から開いた時（display-mode: fullscreen／standalone、navigator.standalone）はボタンも案内も出さない。
//  4. セーフエリア：タッチの枠・HUD の端の表示・タイトル・メニューを env(safe-area-inset-*) の内側へ。
// ブラウザの試験は Playwright（/opt/node22/lib/node_modules/playwright）と chromium（/opt/pw-browsers/chromium）がある時だけ。
// 環境変数 FS_SHOTS=<フォルダ> で画面撮り（スマホ横画面の大きさ：タイトル・メニュー）を保存する。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = p => readFileSync(join(ROOT, p), 'utf8');
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };

// ── 静的な確認 ──
await t('shinshoku.webmanifest：全画面・横向き・境界侵食の入口・本編と別の id・アイコンは既存のもの', () => {
  const m = JSON.parse(src('shinshoku.webmanifest')), main = JSON.parse(src('manifest.webmanifest'));
  assert.equal(m.start_url, './shinshoku.html');
  assert.equal(m.id, './shinshoku.html');
  assert.notEqual(m.id, main.id);
  assert.equal(m.display, 'fullscreen');
  assert.deepEqual(m.display_override, ['fullscreen', 'standalone']);
  assert.equal(m.orientation, 'landscape');
  assert.match(m.short_name, /境界侵食/);
  for (const ic of m.icons) { assert.ok(!ic.src.startsWith('/'), ic.src); assert.ok(existsSync(join(ROOT, ic.src)), ic.src); }
  assert.ok(m.icons.some(i => i.purpose === 'maskable'));
  // 本編のマニフェストはそのまま（縦向き・standalone）
  assert.equal(main.display, 'standalone'); assert.equal(main.orientation, 'portrait'); assert.equal(main.start_url, './');
});

await t('shinshoku.html：専用のマニフェスト・ホーム画面のアイコン・フル画面のボタンと iPhone の案内の置き場所', () => {
  const h = src('shinshoku.html');
  assert.match(h, /<link rel="manifest" href="shinshoku\.webmanifest">/);
  assert.doesNotMatch(h, /href="manifest\.webmanifest"/);
  assert.match(h, /<link rel="apple-touch-icon" href="assets\/pwa\/apple-touch-icon\.png">/);
  assert.match(h, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(h, /viewport-fit=cover/);
  assert.match(h, /<button data-a="fs" class="tt-fs sh-fsbtn" hidden>/);
  assert.match(h, /<p class="tt-fshint" hidden><\/p>/);
});

await t('fullscreen.js：webkit 接頭辞・横向きの固定（失敗は無視）・fullscreenchange・ホーム画面から開いた時は出さない', () => {
  const f = src('shinshoku/ui/fullscreen.js');
  for (const k of ['requestFullscreen', 'webkitRequestFullscreen', 'exitFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement', 'webkitfullscreenchange', "lock('landscape').catch", 'navigator.standalone', '(display-mode: standalone)', '(display-mode: fullscreen)']) assert.ok(f.includes(k), k);
  const css = src('shinshoku/style.css');
  assert.match(css, /#sh-touch \{ inset: var\(--sa-t\) var\(--sa-r\) var\(--sa-b\) var\(--sa-l\); \}/);
  assert.match(css, /env\(safe-area-inset-left, 0px\)/);
  // タッチの円は枠の内側から置く（枠がセーフエリアで寄っても指の下に出る）
  assert.match(src('shinshoku/ui/touch.js'), /stick\.style\.left = \(sx - o\.left - 70\)/);
});

// ── ブラウザでの確認 ──
const PW = '/opt/node22/lib/node_modules/playwright/index.mjs', CHROME = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
if (!existsSync(PW) || !existsSync(CHROME)) {
  console.log('  - Playwright／chromium が無いのでブラウザの試験はとばす');
} else {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.vrm': 'application/octet-stream', '.vrma': 'application/octet-stream', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm' };
  const server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const f = join(ROOT, p || 'index.html');
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
    try { const b = readFileSync(f); res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(b); } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const SHOTS = process.env.FS_SHOTS || null; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const { chromium } = await import(PW);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const PHONE = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
  const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
  const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const open = async (ctxOpts, query = '', init = null) => {
    const ctx = await browser.newContext(ctxOpts); ctx.setDefaultTimeout(60000);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    if (init) await page.addInitScript(init);
    await page.goto(`${BASE}/shinshoku.html${query}`);
    await page.waitForFunction(() => window.__sh && window.__sh.state().mode === 'title' && !document.getElementById('sh-title').hidden, null, { timeout: 120000, polling: 100 });
    return { ctx, page, errs };
  };
  const shot = async (page, name) => { if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: join(SHOTS, name) }); } };
  const fsState = page => page.evaluate(() => ({ fs: !!document.fullscreenElement, el: document.fullscreenElement === document.documentElement, label: document.querySelector('#sh-title [data-a="fs"]').textContent, hidden: document.querySelector('#sh-title [data-a="fs"]').hidden, hint: !document.querySelector('.tt-fshint').hidden }));

  try {
    await t('Android（スマホ横画面）：タイトルにボタン → 押すとフル画面（documentElement）・文字が「終える」→ もう一度でもどる', async () => {
      const { ctx, page, errs } = await open({ ...PHONE, userAgent: ANDROID_UA });
      let s = await fsState(page);
      assert.equal(s.hidden, false, 'ボタンが出る'); assert.equal(s.hint, false, '案内は出ない'); assert.equal(s.label, 'フル画面にする');
      // ボタンは画面の中に収まる（横画面の 390px の高さ）
      const box = await page.locator('#sh-title [data-a="fs"]').boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 390 && box.x >= 0 && box.x + box.width <= 844, 'ボタンが画面の外 ' + JSON.stringify(box));
      await shot(page, 'title_android_844x390.png');
      await page.locator('#sh-title [data-a="fs"]').click({ force: true });
      await page.waitForFunction(() => !!document.fullscreenElement && document.querySelector('#sh-title [data-a="fs"]').textContent === 'フル画面を終える', null, { timeout: 60000 });
      s = await fsState(page);
      assert.equal(s.el, true, 'document.documentElement がフル画面'); assert.equal(s.label, 'フル画面を終える');
      assert.equal(await page.evaluate(() => __sh.game.metrics.fullscreen), true);
      await shot(page, 'title_android_fullscreen.png');
      await page.locator('#sh-title [data-a="fs"]').click({ force: true });
      await page.waitForFunction(() => !document.fullscreenElement && document.querySelector('#sh-title [data-a="fs"]').textContent === 'フル画面にする', null, { timeout: 60000 });
      s = await fsState(page); assert.equal(s.label, 'フル画面にする');
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('一時停止メニュー（再開の欄）と設定：フル画面のボタン → 押すとフル画面・Esc などで抜けても文字が合う・タッチの押しっぱなしを離す', async () => {
      const { ctx, page, errs } = await open({ ...PHONE, userAgent: ANDROID_UA }, '?test=1');
      // タイトルの「設定」（メニューの設定の欄）
      await page.locator('#sh-title [data-a="settings"]').click({ force: true });
      assert.equal(await page.locator('#sh-menu .sh-fsbtn').count(), 1, '設定の欄にボタン');
      await shot(page, 'title_settings_android.png');
      // タイトルから開いた設定（#sh-ui がタイトルの上）でも押せる：ボタンの真ん中に重なる一番上の要素がボタン → 押すとフル画面
      assert.equal(await page.evaluate(() => { const b = document.querySelector('#sh-menu .sh-fsbtn'), r = b.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === b; }), true, 'タイトルの設定のボタンが他の物の下');
      await page.locator('#sh-menu .sh-fsbtn').click({ force: true });
      await page.waitForFunction(() => !!document.fullscreenElement && document.querySelector('#sh-menu .sh-fsbtn').textContent === 'フル画面を終える', null, { timeout: 60000 });
      await page.locator('#sh-menu .sh-fsbtn').click({ force: true });
      await page.waitForFunction(() => !document.fullscreenElement && document.querySelector('#sh-menu .sh-fsbtn').textContent === 'フル画面にする', null, { timeout: 60000 });
      await page.locator('#sh-menu [data-tab="close"]').click({ force: true });
      // 遊びの中の一時停止メニュー（場面の読み込みは重いので、タイトルを閉じて遊びの状態から一時停止だけ開く）
      await page.evaluate(() => { const g = __sh.game; document.getElementById('sh-title').hidden = true; g.mode = 'play'; g.pause(); });
      assert.equal(await page.evaluate(() => __sh.state().mode), 'pause');
      assert.equal(await page.locator('#sh-menu .sh-fsbtn').count(), 1, '一時停止メニュー（再開の欄）にボタン');
      assert.equal(await page.evaluate(() => { const b = document.querySelector('#sh-menu .sh-fsbtn'), r = b.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === b; }), true, '一時停止メニューのボタンが他の物の下');
      await shot(page, 'pause_menu_android.png');
      // 押しっぱなしの入力があっても、フル画面の出入りで離す
      await page.evaluate(() => { const T = __sh.game.input.touch; T.held.add('aim'); T.move.x = 1; });
      await page.locator('#sh-menu .sh-fsbtn').click({ force: true });
      await page.waitForFunction(() => document.fullscreenElement === document.documentElement && document.querySelector('#sh-menu .sh-fsbtn').textContent === 'フル画面を終える', null, { timeout: 60000 });
      assert.equal(await page.locator('#sh-menu .sh-fsbtn').textContent(), 'フル画面を終える');
      assert.deepEqual(await page.evaluate(() => { const T = __sh.game.input.touch; return [T.held.size, T.move.x]; }), [0, 0]);
      // 設定の欄を開き直しても今の状態の文字
      await page.locator('#sh-menu [data-tab="settings"]').click({ force: true });
      assert.equal(await page.locator('#sh-menu .sh-fsbtn').textContent(), 'フル画面を終える');
      await shot(page, 'pause_settings_fullscreen.png');
      // ボタン以外（Esc・戻る操作）で抜けた時も文字が合う
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.fullscreenElement && document.querySelector('#sh-menu .sh-fsbtn').textContent === 'フル画面にする', null, { timeout: 60000 });
      // 画面の大きさ（描画の大きさ）が窓に合っている
      assert.deepEqual(await page.evaluate(() => [__sh.game.camera.aspect.toFixed(3), (innerWidth / innerHeight).toFixed(3)]).then(([a, b]) => a === b), true);
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('iPhone（Safari の UA）：ボタンの代わりに「共有 → ホーム画面に追加」の案内（タイトル・メニュー）', async () => {
      const { ctx, page, errs } = await open({ ...PHONE, userAgent: IPHONE_UA });
      const s = await fsState(page);
      assert.equal(s.hidden, true, 'ボタンは出さない'); assert.equal(s.hint, true, '案内を出す');
      assert.match(await page.locator('.tt-fshint').textContent(), /共有.*ホーム画面に追加/);
      const box = await page.locator('.tt-fshint').boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 390, '案内が画面の外 ' + JSON.stringify(box));
      await shot(page, 'title_iphone_844x390.png');
      await page.locator('#sh-title [data-a="settings"]').click({ force: true });
      assert.equal(await page.locator('#sh-menu .sh-fsbtn').count(), 0);
      assert.match(await page.locator('#sh-menu .sh-fshint').textContent(), /ホーム画面に追加/);
      await shot(page, 'title_settings_iphone.png');
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('ホーム画面から開いた時（navigator.standalone・display-mode）：ボタンも案内も出さない', async () => {
      const { ctx, page, errs } = await open({ ...PHONE, userAgent: IPHONE_UA }, '', () => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
      const s = await fsState(page);
      assert.equal(s.hidden, true); assert.equal(s.hint, false);
      await page.locator('#sh-title [data-a="settings"]').click({ force: true });
      assert.equal(await page.locator('#sh-menu .sh-fsbtn, #sh-menu .sh-fshint').count(), 0);
      await ctx.close();
      const b = await open({ ...PHONE, userAgent: ANDROID_UA }, '', () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode: (fullscreen|standalone)/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q); });
      const s2 = await fsState(b.page);
      assert.equal(s2.hidden, true); assert.equal(s2.hint, false);
      assert.deepEqual(errs.concat(b.errs), []);
      await b.ctx.close();
    });

    await t('PC（マウス）：タイトルにボタン（Fullscreen API がある所）・押すとフル画面', async () => {
      const { ctx, page, errs } = await open({ viewport: { width: 960, height: 540 } });
      const s = await fsState(page); assert.equal(s.hidden, false);
      await page.locator('#sh-title [data-a="fs"]').click({ force: true });
      await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 60000 });
      assert.deepEqual(errs, []);
      await ctx.close();
    });
  } finally {
    await browser.close(); server.close();
  }
}
console.log(`shinshoku-fullscreen: ${n} passed`);
