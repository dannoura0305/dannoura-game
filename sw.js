// ══════════════════════════════════════════════════════════
// だんのうら service worker（ホーム画面に追加・オフラインで遊ぶ）
//
// ・VERSION を変えると新しい版としてインストールされ、画面に
//   「新しいバージョンがあります・更新」が出る（pwa.js）。公開のたびに上げる。
// ・アプリ本体（HTML・CSS・起動時に読む JS・アイコン）は install で先にまとめて保存。
//   取り出しは「ネット優先・つながらなければ保存分」（更新し忘れても古い画面に固まらない）。
// ・ミニゲーム本体・three.js・画像・BGM・ボイスは、初めて使ったときに保存し、
//   次からは保存分をすぐ返しつつ裏で新しいものを取りに行く（stale-while-revalidate）。
// ・GET 以外と、よそのサイト（Google Fonts など）への通信には手を出さない。
// ・音声の Range 要求（<audio> の部分読み込み）は保存分から 206 を作って返す。
// ══════════════════════════════════════════════════════════
const VERSION = '2026-10-07.3';
const SHELL = 'dannoura-shell-' + VERSION;   // 版ごと（古い版は activate で消す）
const CODE = 'dannoura-code-' + VERSION;     // ミニゲーム本体など（版ごと）
const MEDIA = 'dannoura-media-v1';           // 画像・BGM・ボイス（版をまたいで使い回す）

// 起動に必要なもの（index.html の <link>/<script> と同じ。tests/pwa.test.mjs で突き合わせ）
const SHELL_FILES = [
  './',
  'index.html',
  'style.css',
  'style-home.css',
  'manifest.webmanifest',
  'pwa.js',
  'main/icons.js',
  'game.js',
  'main/mobs.js',
  'main/artpack.js',
  'minigames/registry.js',
  'minigames/core.js',
  'main/ui.js',
  'main/homescene.js',
  'main/story.js',
  'main/presentation.js',
  'main/home/catalog.js',
  'main/home/sprites.js',
  'main/home/state.js',
  'main/home/placement.js',
  'main/home/crafting.js',
  'main/home/renderer.js',
  'main/home/editor.js',
  'main/home/interactions.js',
  'main/home/expansion.js',
  'main/home/seasons.js',
  'main/home/photo.js',
  'main/home/events.js',
  'main/memories.js',
  'main/home/bonds.js',
  'main/home/life_events.js',
  'main/home/lifemode.js',
  'main/integrations.js',
  'assets/pwa/icon-192.png',
  'assets/pwa/icon-512.png',
  'assets/pwa/icon-maskable-512.png',
  'assets/pwa/apple-touch-icon.png',
];

const BASE = new URL('./', self.location).href;               // 例：https://…/dannoura-game/
const SHELL_URLS = new Set(SHELL_FILES.map(f => new URL(f, BASE).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // HTTP キャッシュを通さず最新を取る。1つでも失敗したらインストールしない（中途半端な版を作らない）
    await c.addAll(SHELL_FILES.map(f => new Request(new URL(f, BASE).href, { cache: 'reload' })));
    // 初回（まだ何も制御していない）ならすぐ有効にする。更新時は「更新」ボタンを待つ
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, CODE, MEDIA]);
    for (const k of await caches.keys()) if (k.startsWith('dannoura-') && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function kindOf(url) {
  if (!url.href.startsWith(BASE)) return null;                  // スコープ外
  const p = url.href.slice(BASE.length).split('?')[0];
  if (SHELL_URLS.has(url.origin + url.pathname)) return 'shell';
  if (/^assets\/(.+\/)?manifest\.json$/.test(p)) return 'shell';     // 生成画像の目録は差し替えがすぐ効くようにネット優先
  if (/^(minigames|vendor)\/.+\.js$/.test(p)) return 'code';
  if (/^assets\/.+\.(mp3|m4a|ogg|wav)$/i.test(p)) return 'audio';
  if (/^assets\//.test(p)) return 'media';
  return null;                                                  // それ以外（tools/ など）は素通し
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // tools/ などアプリ外のページは素通し（シミュレーターはいつも最新を読む）
    const k = kindOf(url);
    if (k === 'shell' || url.href.split(/[?#]/)[0] === BASE) { event.respondWith(networkFirst(req, true)); }
    return;
  }
  const k = kindOf(url);
  if (k === 'shell') event.respondWith(networkFirst(req, false));
  else if (k === 'code') event.respondWith(staleWhileRevalidate(event, req, CODE));
  else if (k === 'media') event.respondWith(staleWhileRevalidate(event, req, MEDIA));
  else if (k === 'audio') event.respondWith(audio(event, req));
});

// ネット優先：成功したら保存し直す。だめなら保存分（ナビゲーションなら index.html）
async function networkFirst(req, isNav) {
  const c = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok && res.status === 200 && res.type === 'basic') {
      const u = new URL(req.url);
      c.put(isNav ? u.origin + u.pathname : req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: true })
      || (isNav ? (await c.match(new URL('index.html', BASE).href)) || (await c.match(BASE)) : null);
    if (hit) return hit;
    throw e;
  }
}

// 保存分をすぐ返し、裏で取り直す。保存分が無ければネットから取って保存
async function staleWhileRevalidate(event, req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req, { ignoreSearch: false });
  const net = fetch(req).then(res => {
    if (res && res.ok && res.status === 200 && res.type === 'basic') return c.put(req, res.clone()).then(() => res, () => res);
    return res;
  });
  if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
  return net;
}

// 音声：<audio> は Range 付きで来る。全体を保存しておき、要求された範囲を切り出して返す
async function audio(event, req) {
  const c = await caches.open(MEDIA);
  const key = new URL(req.url).href;
  const hit = await c.match(key, { ignoreSearch: true });
  const range = req.headers.get('range');
  if (hit) {
    if (!range) return hit;
    return sliceResponse(hit, range);
  }
  // まだ無い：今回はそのままネットへ。裏で全体を取って保存（次からオフラインでも鳴る）
  event.waitUntil(fetch(key, { cache: 'no-cache' }).then(res => {
    if (res && res.ok && res.status === 200 && res.type === 'basic') return c.put(key, res);
  }).catch(() => {}));
  return fetch(req);
}

async function sliceResponse(res, range) {
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return new Response(buf, { status: 200, headers: res.headers });
  let start, end;
  if (m[1] === '') { const n = +m[2]; start = Math.max(0, size - n); end = size - 1; }
  else { start = +m[1]; end = m[2] === '' ? size - 1 : Math.min(+m[2], size - 1); }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const h = new Headers();
  h.set('Content-Type', res.headers.get('Content-Type') || 'audio/mpeg');
  h.set('Content-Range', `bytes ${start}-${end}/${size}`);
  h.set('Content-Length', String(end - start + 1));
  h.set('Accept-Ranges', 'bytes');
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: h });
}
