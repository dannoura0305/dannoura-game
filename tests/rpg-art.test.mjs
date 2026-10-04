// RPG「壇ノ浦夢譚」の生成画像の差し替え口（assets/gen/rpg/manifest.json）を確かめる。
//   ・manifest が正しい形で、id が rpg.js の RPG_ART.assets()（コードで描ける絵の一覧）と一対一
//   ・大きさ・コマの並び・基準点が rpg.js の決まりと同じ。参照 PNG（ref/）がそろっている
//   ・file が null ならコード描画のまま（画像を読みに行かない）。file があっても大きさが整数倍でなければ使わない
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

const any = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === Symbol.iterator ? function* () {} : any),
  apply: () => any, construct: () => any,
});
const BUILTINS = { console, Math, JSON, Object, Array, Date, Number, String, Map, Set, WeakMap, Symbol, Promise, Error, RegExp,
  Uint8Array, Uint16Array, Uint32Array, Int16Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray,
  parseInt, parseFloat, isFinite, isNaN, Infinity, NaN };

function loadRpg() {
  const images = [];
  class FakeImage { constructor() { images.push(this); this.naturalWidth = 0; this.naturalHeight = 0; } set src(v) { this._src = v; } get src() { return this._src; } }
  const ctx = Object.assign({ gs: {}, registerMinigame() {}, addMinigameStyle() {}, document: any, localStorage: any, Image: FakeImage }, BUILTINS);
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('minigames/rpg.js'), ctx, { filename: 'rpg.js' });
  return { A: ctx.RPG_ART, images };
}
const plain = v => JSON.parse(JSON.stringify(v));
const pngSize = f => { const b = readFileSync(f); assert.equal(b.toString('latin1', 1, 4), 'PNG', f + ' は PNG ではない'); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const M = JSON.parse(read('assets/gen/rpg/manifest.json'));
const { A } = loadRpg();
const defs = plain(A.assets());
const byId = new Map(defs.map(d => [d.id, d]));

test('rpg.js が RPG_ART を出していて、一覧が空でない', () => {
  assert.ok(A && typeof A.assets === 'function' && typeof A.ref === 'function' && typeof A.loadManifest === 'function');
  assert.ok(defs.length > 40);
  for (const cat of ['party', 'npc', 'enemy', 'boss', 'tile', 'prop', 'bg', 'portrait']) assert.ok(defs.some(d => d.category === cat), cat + ' がない');
});

test('主人公・ミナモ・すべての敵とボスが差し替えられる', () => {
  for (const id of ['party.dan', 'party.danT', 'party.mina', 'portrait.mina', 'npc.fish']) assert.ok(byId.has(id), id);
  const src = read('minigames/rpg.js');
  const enKeys = [...src.slice(src.indexOf('const EN={'), src.indexOf('const ST_LABEL')).matchAll(/^  (\w+):\{name:/gm)].map(m => m[1]);
  assert.ok(enKeys.length >= 13);
  for (const k of enKeys) assert.ok(byId.has('enemy.' + k) || byId.has('boss.' + k), k + ' がない');
});

test('manifest の形', () => {
  assert.equal(M.version, 1);
  assert.ok(Array.isArray(M.assets));
  const ids = M.assets.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'id が重複している');
});

test('manifest の id が rpg.js で描ける絵と一対一', () => {
  const ids = new Set(M.assets.map(a => a.id));
  for (const d of defs) assert.ok(ids.has(d.id), `manifest に ${d.id} がない（node tools/export_rpg_sprites.mjs で同期）`);
  for (const id of ids) assert.ok(byId.has(id), `${id} は rpg.js にない`);
});

test('大きさ・コマ・基準点が rpg.js の決まりと同じ', () => {
  for (const a of M.assets) {
    const d = byId.get(a.id);
    assert.deepEqual(a.size, { w: d.w, h: d.h }, a.id);
    assert.equal(a.frames.cols, d.cols, a.id); assert.equal(a.frames.rows, d.rows, a.id);
    assert.deepEqual(a.frames.cell, { w: d.cw, h: d.ch }, a.id);
    assert.equal(a.frames.cols * a.frames.cell.w, a.size.w, a.id);
    assert.equal(a.frames.rows * a.frames.cell.h, a.size.h, a.id);
    assert.deepEqual(a.frames.layout, d.layout, a.id);
    assert.deepEqual(a.anchor, d.anchor, a.id);
    assert.equal(typeof a.transparent, 'boolean', a.id);
    assert.ok(['requested', 'wip', 'done', 'verified', 'rejected'].includes(a.status), a.id + ' status');
  }
});

test('参照 PNG（ref/）がそろっていて、大きさが size と同じ', () => {
  for (const a of M.assets) {
    const f = join(ROOT, a.ref);
    assert.ok(existsSync(f), a.ref + ' がない（node tools/export_rpg_sprites.mjs）');
    assert.deepEqual(pngSize(f), a.size, a.ref);
  }
});

test('file は null か、assets/gen/rpg/ の PNG（あるなら size の整数倍）', () => {
  for (const a of M.assets) {
    if (a.file === null) continue;
    assert.equal(typeof a.file, 'string', a.id);
    assert.match(a.file, /^assets\/gen\/rpg\/[A-Za-z0-9_\-./]+\.png$/, a.id);
    assert.ok(!a.file.includes('..'), a.id);
    const f = join(ROOT, a.file);
    if (!existsSync(f)) { console.log(`  ! ${a.id}: ${a.file} がまだない（読み込めなければコード描画）`); continue; }
    const s = pngSize(f), k = s.w / a.size.w;
    assert.ok(Number.isInteger(k) && k >= 1 && s.h === a.size.h * k, `${a.id}: ${s.w}×${s.h} は ${a.size.w}×${a.size.h} の整数倍ではない`);
  }
});

test('file がすべて null なら画像を読まず、コード描画のまま', () => {
  const { A: B, images } = loadRpg();
  const n = B.loadManifest({ assets: plain(M.assets).map(a => ({ ...a, file: null })) }, '');
  assert.equal(n, 0);
  assert.equal(images.length, 0);
  assert.equal(B.version, 0);
  assert.ok(!B.has('party.dan'));
});

test('file があれば読み、整数倍のときだけ使う。おかしなパスは無視', () => {
  const { A: B, images } = loadRpg();
  const d = byId.get('party.dan'), e = byId.get('enemy.crab');
  const n = B.loadManifest({ assets: [
    { id: 'party.dan', file: 'assets/gen/rpg/party.dan.png' },
    { id: 'enemy.crab', file: 'assets/gen/rpg/enemy.crab.png' },
    { id: 'boss.rust', file: '../secret.png' },
    { id: 'boss.debt', file: 'https://example.com/x.png' },
    { id: 'no.such', file: 'assets/gen/rpg/x.png' },
  ] }, '');
  assert.equal(n, 2);
  const [im1, im2] = images;
  im1.naturalWidth = d.w * 2; im1.naturalHeight = d.h * 2; im1.onload();
  im2.naturalWidth = e.w + 3; im2.naturalHeight = e.h; im2.onload();
  assert.ok(B.has('party.dan'));
  assert.ok(!B.has('enemy.crab'), '整数倍でない画像は使わない');
  assert.equal(B.version, 1);
});

test('rpg.js の描画が差し替え口を通っている', () => {
  const src = read('minigames/rpg.js');
  for (const s of ['drawFoeArt(L,', 'drawPropArt(L,o,', "gen('tile.'+m.theme)", 'drawScene(X,V.bg', "gen('npc.fish')", "gen('portrait.'", 'GEN_CHAR[key]&&gen(', 'genStart();'])
    assert.ok(src.includes(s), s + ' がない');
  assert.ok(src.includes("fetch('assets/gen/rpg/manifest.json'"));
});

for (const [name, fn] of queue) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message || e)); }
}
console.log(`rpg-art: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
