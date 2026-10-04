// 生成画像の受け口（main/artpack.js）と、脇役の顔グラ・配信アイコン（main/mobs.js）の差し替えの優先順位を node:vm で確かめる。
//   ・assets/gen/manifest.json の形（id の重複なし・file は null か安全な相対パス・必要な欄がそろっている）
//   ・file が全部 null → 今までと同じ（SVG／コード描画）
//   ・file があって読めた画像 → それが優先。読めなかった画像 → 今までどおり
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

// 画像の読み込みのまね：ok に入っている URL（?v= を除く）だけ onload、ほかは onerror
function makeImage(ok) {
  return class FakeImage {
    constructor() { this.naturalWidth = 0; this.naturalHeight = 0; this.complete = false; }
    set src(u) {
      this._src = u;
      const path = String(u).split('?')[0];
      setTimeout(() => {
        this.complete = true;
        if (ok.has(path)) { this.naturalWidth = 64; this.naturalHeight = 64; this.onload && this.onload(); }
        else this.onerror && this.onerror();
      }, 1);
    }
    get src() { return this._src; }
  };
}
function load({ ok = new Set(), withArtpack = true } = {}) {
  const ctx = {
    console, Math, JSON, Object, Array, Number, String, Map, Set, Promise, RegExp, Error, encodeURIComponent, setTimeout,
    Image: makeImage(ok), location: { protocol: 'file:' },
    document: { head: { appendChild() {} }, createElement: () => ({ style: {} }), querySelector: () => null },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
  };
  ctx.window = ctx;
  ctx.dispatchEvent = () => true;
  vm.createContext(ctx);
  // game.js の CHILD_IMG と同じ形
  vm.runInContext(`var CHILD_IMG={normal:'assets/img/child_normal.svg',happy:'assets/img/child_happy.svg',sleep:'assets/img/child_sleep.svg',sad:'assets/img/child_sad.svg',fever:'assets/img/child_fever.svg'};`, ctx);
  vm.runInContext(read('main/mobs.js'), ctx, { filename: 'mobs.js' });
  if (withArtpack) vm.runInContext(read('main/artpack.js'), ctx, { filename: 'artpack.js' });
  return ctx;
}
const manifest = JSON.parse(read('assets/gen/manifest.json'));
const SAFE = /^[A-Za-z0-9_\-./]+\.(png|webp|jpe?g|svg)$/i;

test('manifest：形がそろっている（id の重複なし・必要な欄・file は null か安全なパス）', () => {
  assert.equal(manifest.version, 1);
  assert.ok(Array.isArray(manifest.assets) && manifest.assets.length >= 50);
  const seen = new Set();
  for (const a of manifest.assets) {
    assert.ok(typeof a.id === 'string' && /^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(a.id), 'id ' + a.id);
    assert.ok(!seen.has(a.id), '重複 ' + a.id); seen.add(a.id);
    for (const k of ['category', 'name_ja', 'target', 'size', 'view', 'positive', 'negative', 'used_by', 'fallback', 'reference'])
      assert.ok(typeof a[k] === 'string' && a[k].length > 0, `${a.id}.${k}`);
    assert.match(a.size, /^\d+x\d+$/, a.id + ' size');
    assert.equal(typeof a.transparent, 'boolean', a.id + ' transparent');
    assert.ok(Number.isInteger(a.frames) && a.frames >= 1, a.id + ' frames');
    assert.ok(a.target.startsWith('assets/gen/') && SAFE.test(a.target), a.id + ' target');
    assert.ok(!a.target.startsWith('assets/gen/rpg/'), 'RPG の置き場所は別担当: ' + a.id);
    if (a.file !== null) {
      assert.ok(SAFE.test(a.file) && !a.file.includes('..') && !a.file.startsWith('/'), a.id + ' file ' + a.file);
      assert.ok(existsSync(join(ROOT, a.file)), a.id + ' の file が無い: ' + a.file);
    }
    // 主人公は対象外
    assert.ok(!/\bdan\b|dannoura|portrait\.dan/.test(a.id), '主人公は含めない: ' + a.id);
    if (a.fallback.startsWith('assets/')) assert.ok(existsSync(join(ROOT, a.fallback)), a.id + ' の fallback が無い: ' + a.fallback);
  }
  // first15 は 1..15 が1回ずつ
  const order = manifest.assets.map(a => a.first15).filter(v => v != null).sort((x, y) => x - y);
  assert.deepEqual(order, Array.from({ length: 15 }, (_, i) => i + 1));
});

test('manifest：mobs.js の顔（MOB_FACES）・娘・配信アイコンを全部カバーしている', () => {
  const ctx = load({ withArtpack: false });
  const ids = new Set(manifest.assets.map(a => a.id));
  const faces = vm.runInContext('MOB_FACES', ctx);
  for (const id of Object.keys(faces)) for (const f of faces[id]) assert.ok(ids.has(`portrait.${id}.${f}`), `portrait.${id}.${f}`);
  for (const f of ['normal', 'happy', 'sleep', 'sad', 'fever']) assert.ok(ids.has('portrait.kid.' + f));
  for (const k of vm.runInContext('LISTENER_AV_KEYS', ctx)) assert.ok(ids.has('avatar.' + k), 'avatar.' + k);
});

test('既定（file が全部 null）：顔グラは SVG、アイコンはベクター、娘は元の SVG のまま', async () => {
  const ctx = load();
  const n = await ctx.ARTPACK._ingest(manifest);
  assert.equal(n, 0);
  assert.equal(ctx.mobPortrait('hancho'), 'assets/img/mob_hancho.svg');
  assert.equal(ctx.mobPortrait('hancho', 'angry'), 'assets/img/mob_hancho_shout.svg');
  assert.equal(ctx.mobPortrait('gen', 'sad'), 'assets/img/mob_gen.svg');
  assert.equal(ctx.mobPortrait('nobody'), null);
  assert.equal(ctx.ARTPACK.src('portrait.hancho.normal'), null);
  assert.equal(ctx.ARTPACK.img('avatar.tabibito'), null);
  assert.ok(ctx.ARTPACK.entry('avatar.tabibito'), 'entry は file が null でも返す');
  assert.match(ctx.listenerAvatarSrc('夜空の旅人', 'normal'), /^data:image\/svg\+xml/);
  assert.equal(ctx.listenerAvatarSrc('夜鷹', 'anomaly'), 'assets/img/mob_yodaka.svg');
  assert.equal(ctx.CHILD_IMG.happy, 'assets/img/child_happy.svg');
  assert.equal(ctx.ARTPACK.draw({ drawImage() { throw new Error('描かない'); } }, 'mg.defense.troll', 0, 0, 10, 10), false);
});

test('ARTPACK が無くても（読み込み順の事故）mobs.js は今までどおり動く', () => {
  const ctx = load({ withArtpack: false });
  assert.equal(ctx.mobPortrait('sensei', 'happy'), 'assets/img/mob_sensei_happy.svg');
  assert.match(ctx.listenerAvatarHTML('さくら', 'normal'), /class="ci-av"/);
});

test('差し替え：読めた画像が優先（頼んだ表情 → 近い表情 → normal）、読めない画像は無視', async () => {
  const ok = new Set(['assets/gen/portrait/hancho_normal.png', 'assets/gen/portrait/hancho_tired.png', 'assets/gen/avatar/tabibito.png', 'assets/gen/portrait/kid_happy.png', 'assets/gen/mg/defense_troll.png']);
  const ctx = load({ ok });
  const m = JSON.parse(JSON.stringify(manifest));
  const set = (id, file, rev) => { const a = m.assets.find(x => x.id === id); a.file = file; if (rev != null) a.rev = rev; };
  set('portrait.hancho.normal', 'assets/gen/portrait/hancho_normal.png', 3);
  set('portrait.sensei.normal', 'assets/gen/portrait/missing.png');        // 読めない
  set('avatar.tabibito', 'assets/gen/avatar/tabibito.png');
  set('portrait.kid.happy', 'assets/gen/portrait/kid_happy.png');
  set('mg.defense.troll', 'assets/gen/mg/defense_troll.png');
  set('avatar.hitori', 'https://evil.example/x.png');                      // 外のURLは読まない
  set('avatar.joren', '../secret.png');                                     // 上の階層も読まない
  m.assets.push({ id: 'portrait.hancho.tired', file: 'assets/gen/portrait/hancho_tired.png' }); // 一覧に無い表情も足せる
  const n = await ctx.ARTPACK._ingest(m);
  assert.equal(n, 5);
  assert.equal(ctx.ARTPACK.src('portrait.hancho.normal'), 'assets/gen/portrait/hancho_normal.png?v=3');
  assert.equal(ctx.mobPortrait('hancho'), 'assets/gen/portrait/hancho_normal.png?v=3');
  assert.equal(ctx.mobPortrait('hancho', 'happy'), 'assets/img/mob_hancho_happy.svg', '生成が無い表情は SVG');
  assert.equal(ctx.mobPortrait('hancho', 'tired'), 'assets/gen/portrait/hancho_tired.png', '頼んだ表情の生成画像が最優先');
  assert.equal(ctx.mobPortrait('hancho', 'collapse'), 'assets/img/mob_hancho_shout.svg');
  assert.equal(ctx.mobPortrait('sensei'), 'assets/img/mob_sensei.svg', '読めない画像は無視');
  assert.equal(ctx.listenerAvatarSrc('夜空の旅人', 'normal'), 'assets/gen/avatar/tabibito.png');
  assert.match(ctx.listenerAvatarSrc('ひとりぼっち', 'normal'), /^data:/);
  assert.match(ctx.listenerAvatarSrc('深夜の常連', 'normal'), /^data:/);
  assert.equal(ctx.CHILD_IMG.happy, 'assets/gen/portrait/kid_happy.png');
  assert.equal(ctx.CHILD_IMG.normal, 'assets/img/child_normal.svg');
  let drawn = null;
  const g = { imageSmoothingEnabled: true, drawImage(...a) { drawn = a; } };
  assert.equal(ctx.ARTPACK.draw(g, 'mg.defense.troll', 1, 2, 30, 40), true);
  assert.deepEqual(drawn.slice(1), [0, 0, 64, 64, 1, 2, 30, 40]);
  assert.equal(g.imageSmoothingEnabled, true, '描いたあと元に戻す');
});

test('配信アイコン：名前ごとの図柄・なりすまし・正体のない者・名前から決まる顔', () => {
  const ctx = load();
  const key = (n, t) => ctx.listenerKey(n, t || 'normal');
  assert.equal(key('夜空の旅人'), 'tabibito');
  assert.equal(key('ひとりぼっち'), 'hitori');
  assert.equal(key('深夜の常連'), 'joren');
  assert.equal(key('さくら'), 'sakura');
  assert.equal(key('さくら​', 'ghost'), 'fake');
  assert.equal(key('夜鷹', 'rare'), 'yodaka');
  assert.equal(key('ギフト🎁', 'super'), 'gift');
  assert.equal(key('ギフト💎×10', 'super'), 'gem');
  assert.equal(key('アンチ', 'bad'), 'anti');
  assert.equal(key('???', 'ghost'), 'ghost');
  assert.equal(key('444'), 'ghost');
  assert.equal(key('（削除済み）', 'ghost'), 'ghost');
  assert.equal(key('存在しないID', 'anomaly'), 'ghost');
  assert.equal(key('だんのうら', 'anomaly'), 'ghost', '主人公の名前の怪異コメントは砂嵐');
  assert.equal(key('匿名'), 'anon');
  assert.match(key('通りすがり'), /^p\d+$/);
  assert.equal(key('通りすがり'), key('通りすがり'), '同じ名前は同じ顔');
  assert.equal(ctx.listenerAvatarSrc('通りすがり'), ctx.listenerAvatarSrc('通りすがり'));
  assert.notEqual(ctx.listenerAvatarSrc('通りすがり'), ctx.listenerAvatarSrc('初見'));
  for (const k of vm.runInContext('LISTENER_AV_KEYS', ctx)) {
    if (k === 'yodaka') continue;
    const svg = vm.runInContext(`_AV_ART[${JSON.stringify(k)}]()`, ctx);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 32 32"/, k);
    assert.ok(!/NaN|undefined/.test(svg), k + ' に NaN/undefined');
  }
  const html = ctx.listenerAvatarHTML('深夜の常連', 'normal', { mod: true });
  assert.match(html, /<img src="data:image\/svg\+xml/);
  assert.match(html, /ci-mod/);
});

for (const [name, fn] of queue) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
