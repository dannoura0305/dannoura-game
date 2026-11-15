// 『境界事象』歩く地図の BGM（kyokai/music.js）のテスト：node tests/kyokai-music.test.mjs
// ・旋律の文字列が読める（音名 → MIDI、- のばす、. 休み）
// ・どの曲も 4 音（旋律・和音・ベース・ノイズ）の長さが小節の倍数で、音域がゲームボーイらしい範囲（C2〜C7）
// ・場所と観測層で曲が決まる（混ざる世界 X → rift、崩壊 C → empty、別の歴史 B → showa、地下 → deep、分室 → office、ほか → town）
// ・2026-11 音の見直し：タイトル・スタッフロール・戦闘の曲、ノイズの列、山びこ、ジングル、戦闘の曲の選び方、オフライン書き出し
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


test('2026-11：タイトル・スタッフロール・戦闘の曲がある', () => {
  for (const id of ['title', 'roll', 'bt_wild', 'bt_wild_c', 'bt_boss', 'bt_win', 'bt_win_boss']) assert.ok(B.SONGS[id], id);
  assert.ok(B.SONGS.bt_win.once && B.SONGS.bt_win_boss.once, 'ジングルは 1 回で終わる');
  assert.ok(!B.SONGS.bt_wild.once && !B.SONGS.bt_boss.once && !B.SONGS.town.once);
  // 単調さの見直し：町と分室は 16 小節（前は 8 小節）、ボスは 16 小節、戦闘は 8 小節以上
  assert.ok(B.compile(B.SONGS.town).steps >= 16 * 8, 'town は 16 小節');
  assert.ok(B.compile(B.SONGS.office).steps >= 16 * 8, 'office は 16 小節');
  assert.ok(B.compile(B.SONGS.bt_boss).steps >= 16 * 8, 'ボスは 16 小節');
  assert.ok(B.compile(B.SONGS.bt_wild).steps >= 8 * 8, '戦闘は 8 小節以上');
  assert.ok(B.loopSeconds('town') > 30 && B.loopSeconds('bt_wild') > 10);
});

test('ノイズの列：長さが曲の長さを割り切り、h・s・k・. だけ', () => {
  for (const [id, s] of Object.entries(B.SONGS)) {
    const nz = String(s.noise || '').split(/[\s|]+/).filter(Boolean);
    if (!nz.length) continue;
    const c = B.compile(s);
    assert.equal(c.steps % nz.length, 0, `${id} のノイズの長さ ${nz.length} が ${c.steps} を割り切らない`);
    for (const t of nz) assert.ok(/^[hsk.]$/.test(t), `${id} のノイズ ${t}`);
  }
  const c = B.compile(B.SONGS.bt_wild);
  assert.ok(c.ev.some(e => e[1] === 'noise' && e[2] === 3), 'キック（k）がある');
});

test('山びこ（echo）：旋律と同じ音が、決めた歩数だけ遅れて弱く鳴る', () => {
  const s = B.SONGS.title, c = B.compile(s);
  const lead = c.ev.filter(e => e[1] === 'lead'), echo = c.ev.filter(e => e[1] === 'echo');
  assert.equal(echo.length, lead.length);
  for (const [i, , n] of lead) assert.ok(echo.some(e => e[0] === (i + s.echo) % c.steps && e[2] === n));
  assert.ok(B.VOICE.echo.vol < B.VOICE.lead.vol / 2, '山びこは旋律の半分より小さい');
  assert.ok(!B.compile(B.SONGS.town).ev.some(e => e[1] === 'echo'), 'echo の無い曲には山びこを足さない');
});

test('曲の音量（gain）は測って揃えた範囲（0.5〜1.5）', () => {
  for (const [id, s] of Object.entries(B.SONGS)) assert.ok(s.gain == null || (s.gain >= 0.5 && s.gain <= 1.5), id + ' gain ' + s.gain);
});

test('戦闘の曲：ボス・勝利・観測層（崩壊 C・混ざる世界 X は不安定な曲）', () => {
  assert.equal(B.battleSong('wild', 'A', 'A'), 'bt_wild');
  assert.equal(B.battleSong('wild', 'B', 'B'), 'bt_wild');
  assert.equal(B.battleSong('wild', 'C', 'C'), 'bt_wild_c');
  assert.equal(B.battleSong('wild', 'A', 'X'), 'bt_wild_c');
  assert.equal(B.battleSong('boss', 'C', 'X'), 'bt_boss');
  assert.equal(B.battleSong('win', 'A', 'A'), 'bt_win');
  assert.equal(B.battleSong('win_boss', 'A', 'A'), 'bt_win_boss');
  assert.equal(B.battleSong(null, 'A', 'A'), null);
});

test('オフライン書き出し：偽の AudioContext に並べても落ちず、BGM の音量設定を掛ける', () => {
  const made = { osc: 0, buf: 0 }, gains = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), detune: param(), Q: param(), start() {}, stop() {}, setPeriodicWave() {} });
  const c = {
    createOscillator() { made.osc++; return node(); },
    createGain() { const n = node(); gains.push(n); return n; },
    createBiquadFilter() { return node(); },
    createBufferSource() { made.buf++; return node(); },
    createPeriodicWave() { return {}; },
  };
  const sec = B.render(c, node(), 'bt_wild', 4, {}, 60);
  assert.equal(sec, 4);
  assert.ok(made.osc > 30 && made.buf > 10, '音が並んだ');
  assert.ok(Math.abs(gains[0].gain.value - B.SONGS.bt_wild.gain * 0.6 * 0.75) < 1e-9, '曲の gain × BGM 60%');
  const j = B.render(c, node(), 'bt_win', 30, {}, 60);
  assert.ok(j > 2 && j < 5, 'ジングルは 1 回ぶんで終わる：' + j);
  assert.equal(B.render(c, node(), 'nope', 3, {}, 60), 0);
  B.render(c, node(), 'title', 3, null, 0);   // ノイズの無い環境でも落ちない
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
