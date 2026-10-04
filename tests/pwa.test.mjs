// PWA の静的チェック：manifest・アイコン・sw.js の先読み一覧が index.html とずれていないか
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const pngSize = f => { const b = readFileSync(join(ROOT, f)); assert.equal(b.toString('ascii', 1, 4), 'PNG', f + ' は PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// sw.js をダミーの self で読み、定数を取り出す
function loadSW() {
  const listeners = {};
  const ctx = { self: { location: new URL('https://example.github.io/dannoura-game/sw.js'), addEventListener: (t, f) => (listeners[t] = f) }, URL, Set, Map, Promise, console, Response: class {}, Headers: class {} };
  vm.createContext(ctx);
  vm.runInContext(read('sw.js') + '\n;globalThis.__sw={VERSION,SHELL_FILES,BASE,kindOf};', ctx);
  return { sw: ctx.__sw, listeners };
}

test('manifest：名前・相対の start_url/scope・縦向き・紺と金の色・アイコン', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.short_name, 'だんのうら');
  assert.match(m.name, /だんのうら/);
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.equal(m.orientation, 'portrait');
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  const html = read('index.html');
  assert.match(html, new RegExp(`<meta name="theme-color" content="${m.theme_color}">`), 'index.html の theme-color と同じ');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  const sizes = {};
  for (const ic of m.icons) {
    assert.ok(!ic.src.startsWith('/'), '相対パス ' + ic.src);
    const [w, h] = pngSize(ic.src);
    assert.equal(`${w}x${h}`, ic.sizes, ic.src);
    sizes[ic.purpose + ' ' + ic.sizes] = true;
  }
  assert.ok(sizes['any 192x192'] && sizes['any 512x512'] && sizes['maskable 512x512']);
  assert.deepEqual(pngSize('assets/pwa/apple-touch-icon.png'), [180, 180]);
});

test('sw.js：先読み一覧＝index.html の CSS/JS（ゲーム本体は含めない）・ファイルが存在する', () => {
  const { sw } = loadSW();
  assert.match(sw.VERSION, /\S/);
  const html = read('index.html');
  const local = [...html.matchAll(/<(?:script src|link rel="stylesheet" href)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  for (const f of local) assert.ok(sw.SHELL_FILES.includes(f), 'sw.js の SHELL_FILES に ' + f + ' が無い');
  for (const f of sw.SHELL_FILES) {
    if (f === './') continue;
    assert.ok(existsSync(join(ROOT, f)), f + ' が無い');
    assert.ok(!/^minigames\/(?!core|registry)/.test(f), 'ゲーム本体は先読みしない: ' + f);
  }
  assert.ok(sw.SHELL_FILES.includes('./') && sw.SHELL_FILES.includes('index.html'));
});

test('sw.js：振り分け（本体＝ネット優先、ゲーム・画像・音＝保存分、ほかは素通し）', () => {
  const { sw, listeners } = loadSW();
  const k = p => sw.kindOf(new URL(p, sw.BASE));
  assert.equal(k('index.html'), 'shell');
  assert.equal(k('./'), 'shell');
  assert.equal(k('minigames/core.js'), 'shell');
  assert.equal(k('minigames/rpg.js'), 'code');
  assert.equal(k('vendor/three.min.js'), 'code');
  assert.equal(k('assets/bgm/night_main.mp3'), 'audio');
  assert.equal(k('assets/voice/tired_1.m4a'), 'audio');
  assert.equal(k('assets/img/bg_room.webp'), 'media');
  assert.equal(k('tools/simulator.html'), null);
  assert.equal(k('https://fonts.googleapis.com/css2'), null);
  assert.equal(sw.kindOf(new URL('https://example.github.io/other-repo/game.js')), null, 'スコープ外');
  assert.ok(listeners.install && listeners.activate && listeners.fetch && listeners.message);
  // GET 以外・よそのサイトには respondWith しない
  let responded = 0;
  const ev = (url, method = 'GET', mode = 'no-cors') => ({ request: { url, method, mode, headers: { get: () => null } }, respondWith() { responded++; }, waitUntil() {} });
  listeners.fetch(ev('https://example.github.io/dannoura-game/game.js', 'POST'));
  listeners.fetch(ev('https://fonts.gstatic.com/x.woff2'));
  listeners.fetch(ev('https://example.github.io/dannoura-game/tools/simulator.html', 'GET', 'navigate'));
  assert.equal(responded, 0);
});

test('pwa.js：https か localhost・枠の外のときだけ登録する', () => {
  const src = read('pwa.js');
  assert.match(src, /location\.protocol==='https:'/);
  assert.match(src, /localhost/);
  assert.match(src, /window\.self!==window\.top/);
  assert.match(src, /新しいバージョンがあります/);
  assert.match(src, /SKIP_WAITING/);
  assert.match(read('sw.js'), /SKIP_WAITING/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
