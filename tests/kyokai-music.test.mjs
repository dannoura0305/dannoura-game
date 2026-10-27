// 『境界事象』歩く地図の BGM（kyokai/music.js）のテスト：node tests/kyokai-music.test.mjs
// ・旋律の文字列が読める（音名 → MIDI、- のばす、. 休み）
// ・どの曲も 4 音（旋律・和音・ベース・ノイズ）の長さが小節の倍数で、音域がゲームボーイらしい範囲（C2〜C7）
// ・場所と観測層で曲が決まる（混ざる世界 X → rift、崩壊 C → empty、別の歴史 B → showa、地下 → deep、分室 → office、ほか → town）
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message || e)); }
}
const ctx = { console, Math, JSON, Object, Array, String, Number };
ctx.window = ctx;
ctx.KY = { HAS_DOM: false, settings: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'kyokai/music.js'), 'utf8'), ctx, { filename: 'music.js' });
const B = ctx.KY_BGM;

console.log('kyokai music');

test('音名を MIDI に（A4=69・C#5=73・Bb3=58）', () => {
  assert.equal(B.midi('A4'), 69); assert.equal(B.midi('C#5'), 73); assert.equal(B.midi('Bb3'), 58); assert.equal(B.midi('C-1'), 0);
  assert.deepEqual(Array.from(B.parse('E5 - . | C5')), [76, -1, 0, 72]);
  assert.throws(() => B.parse('H5'));
});

test('どの曲も読めて、長さが小節の倍数・音が範囲内', () => {
  const ids = Object.keys(B.SONGS);
  assert.ok(ids.length >= 6, '曲が 6 つ以上');
  for (const id of ids) {
    const s = B.SONGS[id], c = B.compile(s);
    assert.ok(s.bpm >= 50 && s.bpm <= 180, id + ' bpm');
    assert.equal(c.steps % s.bar, 0, id + ' の長さが小節の倍数でない');
    for (const k of ['lead', 'harm', 'bass']) { const L = c.lines[k]; if (L.length) assert.equal(L.length, c.steps, `${id}.${k} の長さ ${L.length} ≠ ${c.steps}`); }
    assert.ok(c.ev.some(e => e[1] === 'lead'), id + ' に旋律がない');
    assert.ok(c.ev.some(e => e[1] === 'bass'), id + ' にベースがない');
    for (const [st, kind, n, len] of c.ev) {
      assert.ok(st >= 0 && st < c.steps && len >= 1 && len <= c.steps, `${id} 歩 ${st}`);
      if (kind !== 'noise') assert.ok(n >= 36 && n <= 96, `${id}.${kind} の音 ${n} が範囲外`);
    }
    // 最初の音がいきなり「のばす」で始まらない（前の音が無い）
    assert.notEqual(c.lines.lead[0], -1, id + ' の旋律が - で始まる');
  }
});

test('場所と観測層で曲が決まる', () => {
  assert.equal(B.pick('town', 'A', 'A'), 'town');
  assert.equal(B.pick('shrine', 'A', 'A'), 'town');
  assert.equal(B.pick('center_office', 'A', 'A'), 'office');
  assert.equal(B.pick('center_lab', 'A', 'A'), 'office');
  assert.equal(B.pick('center_basement', 'A', 'A'), 'deep');
  assert.equal(B.pick('tunnel', 'A', 'A'), 'deep');
  assert.equal(B.pick('town', 'B', 'B'), 'showa');
  assert.equal(B.pick('center_office', 'C', 'C'), 'empty');
  assert.equal(B.pick('collapse', 'A', 'X'), 'rift');
  assert.equal(B.pick('empty_town', 'C', 'X'), 'rift');
  assert.equal(B.pick(null, 'A', 'A'), null);
  for (const w of ['A', 'B', 'C']) for (const m of ['town', 'center_office', 'tunnel', 'station']) assert.ok(B.SONGS[B.pick(m, w, w)], m + w);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
