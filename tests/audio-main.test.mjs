// 本編の音（BGM の割り当て・大きさの補正・効果音の表・CC0 の曲の出典と後読み）を確かめる：node tests/audio-main.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(ROOT, p), 'utf8');
const game = rd('game.js');
let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('  ✓', name); } catch (e) { fail++; console.log('  ✗', name, '\n   ', e.message); } };

// game.js から定数の部分だけを取り出して動かす
const pick = (start, end) => { const a = game.indexOf(start); assert.ok(a >= 0, start); const b = game.indexOf(end, a); assert.ok(b > a, end); return game.slice(a, b + end.length); };
const BGM_SRC = pick('const BGM_DATA={', '\n};') + '\n' + pick('const BGM_LUFS={', '}') + '\n' + pick('function bgmTrim(', '}');
const AU_SRC = pick('const AU={', '\n};');

function sandbox(se = 1) {
  const made = { osc: 0, buf: 0, gains: [] };
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { made.gains.push(v); }, linearRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  const ctx = {
    currentTime: 1, sampleRate: 8000, state: 'running', destination: node(),
    createGain: node, createBiquadFilter: node, createDynamicsCompressor: node,
    createOscillator() { made.osc++; return node(); },
    createBufferSource() { made.buf++; return node(); },
    createBuffer(c, n, sr) { const d = new Float32Array(n); return { sampleRate: sr, getChannelData: () => d }; },
  };
  const s = { AUDIO_SET: { bgm: 1, voice: 1, se }, VOICE_DATA: {}, BGM_DATA: {}, document: { getElementById: () => ({}) }, Math, Object };
  vm.createContext(s);
  vm.runInContext(BGM_SRC.replace('const BGM_DATA=', 'BGM_DATA=').replace('const BGM_LUFS=', 'BGM_LUFS=') + '\n' + AU_SRC.replace('const AU=', 'var AU=') + '\nAU.ctx=__ctx;', Object.assign(s, { __ctx: ctx }));
  return { s, made };
}

test('BGM_DATA のファイルがすべてある・既存の 8 曲はそのままの場所', () => {
  const { s } = sandbox();
  for (const [k, p] of Object.entries(s.BGM_DATA)) assert.ok(existsSync(join(ROOT, p)), `${k}: ${p}`);
  for (const k of ['night', 'stream', 'kaidan', 'factory', 'mental', 'rebirth', 'king', 'collapse']) assert.match(s.BGM_DATA[k], /^assets\/bgm\/[a-z_]+\.mp3$/);
});

test('曲ごとの大きさの補正：全曲にあり、倍率は 0.5〜1.5', () => {
  const { s } = sandbox();
  for (const k of Object.keys(s.BGM_DATA)) {
    assert.ok(k in s.BGM_LUFS, `BGM_LUFS に ${k} が無い`);
    const t = s.bgmTrim(k); assert.ok(t >= .5 && t <= 1.5, `${k}: ${t}`);
  }
  assert.equal(s.bgmTrim('知らない曲'), 1);
  // -17 LUFS の曲は 1 倍、-14 LUFS の曲は約 0.71 倍
  assert.ok(Math.abs(s.bgmTrim('night') - Math.pow(10, (-17 + 15.4) / 20)) < 1e-9);
});

test('ミニゲームの BGM（目録）はどれも BGM_DATA か代わりの音にある', () => {
  const { s } = sandbox();
  const reg = rd('minigames/registry.js');
  const used = [...reg.matchAll(/bgm:'([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(used.length >= 17);
  const presets = AU_SRC.slice(AU_SRC.indexOf('presets:'), AU_SRC.indexOf('init()'));
  for (const b of used) {
    assert.ok(b in s.BGM_DATA, `${b} が BGM_DATA に無い`);
    assert.ok(presets.includes(b + ':'), `${b} の代わりの音（presets）が無い`);
  }
});

test('足した曲（assets/bgm_cc0）：合計 8MB 以下・出典の文書とスタッフロールに載っている', () => {
  const dir = join(ROOT, 'assets/bgm_cc0');
  const files = readdirSync(dir).filter(f => f.endsWith('.mp3'));
  assert.ok(files.length >= 1);
  const total = files.reduce((t, f) => t + statSync(join(dir, f)).size, 0);
  assert.ok(total <= 8 * 1024 * 1024, `合計 ${total}`);
  const doc = rd('docs/AUDIO_CREDITS_MAIN.md');
  const roll = rd('main/presentation.js');
  for (const f of files) {
    const row = doc.split('\n').find(l => l.startsWith('| ' + f + ' '));
    assert.ok(row, `${f} が docs/AUDIO_CREDITS_MAIN.md の表に無い`);
    assert.match(row, /https:\/\/opengameart\.org\/content\/[a-z0-9-]+/);
    const author = row.split('|')[4].trim().replace(/（.*$/, '');
    assert.ok(roll.includes(author), `${author} がスタッフロールに無い`);
  }
  assert.match(doc, /CC0/);
  assert.doesNotMatch(doc, /\|\s*(CC-BY|OGA-BY|GPL)/);
});

test('起動時に足した曲を読まない（index.html・sw.js の先読みに入っていない）', () => {
  assert.doesNotMatch(rd('index.html'), /bgm_cc0/);
  assert.doesNotMatch(rd('sw.js'), /bgm_cc0/);
  assert.doesNotMatch(game.slice(game.indexOf('function preloadNightBGM'), game.indexOf('function _enableStartBtn')), /bgm_cc0|mg_/);
});

test('効果音の表：コードで使っている名前がすべてある', () => {
  const { s } = sandbox();
  const names = new Set(s.AU._seNames());
  const files = ['game.js', ...readdirSync(join(ROOT, 'main')).filter(f => f.endsWith('.js')).map(f => 'main/' + f),
    ...readdirSync(join(ROOT, 'main/home')).filter(f => f.endsWith('.js')).map(f => 'main/home/' + f),
    ...readdirSync(join(ROOT, 'minigames')).filter(f => f.endsWith('.js')).map(f => 'minigames/' + f)];
  const used = new Set();
  for (const f of files) for (const m of rd(f).matchAll(/\b(?:AU\.se|se)\('([a-zA-Z]+)'\)/g)) used.add(m[1]);
  for (const u of used) assert.ok(names.has(u), `AU.se('${u}') の音が無い（${[...used].join(',')}）`);
});

test('効果音：音量 0 なら何も作らない・音量に比例・cancel は back と同じ・知らない名前は btn', () => {
  const z = sandbox(0); z.s.AU._se('decide'); assert.equal(z.made.osc + z.made.buf, 0);
  const a = sandbox(1); a.s.AU._se('decide'); assert.ok(a.made.osc >= 2);
  const h = sandbox(.5); h.s.AU._se('decide');
  const peakA = Math.max(...a.made.gains), peakH = Math.max(...h.made.gains);
  assert.ok(Math.abs(peakH / peakA - .5) < 1e-6, `${peakH} / ${peakA}`);
  const c = sandbox(1); c.s.AU._se('cancel'); const b = sandbox(1); b.s.AU._se('back');
  assert.deepEqual(c.made, b.made);
  const u = sandbox(1); u.s.AU._se('????'); const n = sandbox(1); n.s.AU._se('btn');
  assert.deepEqual(u.made, n.made);
  // 30ms 以内の同じ音は 1 回
  const r = sandbox(1); r.s.AU._se('btn'); const o1 = r.made.osc; r.s.AU._se('btn'); assert.equal(r.made.osc, o1);
});

test('ミニゲーム：window.AU を条件に使わない（AU は const なので window に無く、音が鳴らなくなる）・音の一覧を出す・効果音の音量を読む', () => {
  const files = readdirSync(join(ROOT, 'minigames')).filter(f => f.endsWith('.js') && !['core.js', 'registry.js'].includes(f));
  assert.ok(files.length >= 17);
  for (const f of files) {
    const src = rd('minigames/' + f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    assert.doesNotMatch(src, /window\.AU\b/, f);
    assert.match(src, /mg\.exposeSfx\(/, `${f} に mg.exposeSfx が無い`);
    assert.match(src, /AUDIO_SET\.se/, `${f} が効果音の音量を読んでいない`);
  }
});

test('RPG の bgm()・#bgm で使う曲はどれも BGM_DATA にある（ふつうの戦闘・ボス戦・最後の戦いは CC0 の曲・登場の場面は元の曲）', () => {
  const { s } = sandbox();
  const rpg = rd('minigames/rpg.js');
  const used = new Set([...rpg.matchAll(/\bbgm\('([a-z_]+)'\)|'#bgm ([a-z_]+)'|bgm:'([a-z_]+)'/g)].map(m => m[1] || m[2] || m[3]));
  for (const k of rpg.matchAll(/bgm\(boss\?\(opt\.final\?'([a-z_]+)':'([a-z_]+)'\):'([a-z_]+)'\)/g)) [k[1], k[2], k[3]].forEach(x => used.add(x));
  assert.ok(used.has('mg_rpg_battle'), 'ふつうの戦闘の曲');
  assert.ok(used.has('mg_rpg_boss'), 'ボス戦の曲');
  assert.ok(used.has('mg_rpg_final'), '最後の戦いの曲');
  assert.ok(/'#bgm mental'/.test(rpg), '最後のボスの登場の場面は mental のまま');
  for (const u of used) assert.ok(u in s.BGM_DATA, `${u} が BGM_DATA に無い`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
