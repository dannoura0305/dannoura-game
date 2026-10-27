// 3Dレース「原付で夜勤へ」の純粋なロジック（minigames/race.js の RaceLogic）を node:vm で確かめる。
// 評価・報酬・SP・時間が、改良前の式（下の ref*）と完全に同じであること（報酬の約束を変えない）。
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

const defs = [];
const ctx = { registerMinigame: d => defs.push(d), addMinigameStyle() {}, console, Math, JSON, Object, Array, Number, String, Map, Set, Error };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'minigames/race.js'), 'utf8'), ctx, { filename: 'race.js' });
const L = vm.runInContext('RaceLogic', ctx);
const plain = v => JSON.parse(JSON.stringify(v));

// ── 改良前の式（minigames/race.js の calcGrade() / result() からそのまま写したもの） ──
function refGrade(endReason, rem, dmg, reds, crashes, contacts) {
  if (endReason === 'late') return 'C';
  const sc = rem + (100 - dmg) / 10 - reds * 5 - crashes * 6 - contacts * 1.5;
  return sc >= 16 ? 'S' : sc >= 9 ? 'A' : sc >= 3 ? 'B' : 'C';
}
const REF = {
  ontime: { fx: { jobRep: 6, mental: 3, fatigue: 6 }, time: 30, sp: 1 },
  late: { fx: { jobRep: -3, mental: -2, fatigue: 6 }, time: 30, sp: 0 },
  crash: { fx: { jobRep: -2, mental: -5, fatigue: 8, money: -3000 }, time: 40, sp: 0 },
  quit: { fx: { fatigue: 2 }, time: 15, sp: 0 },
};

test('登録：race が1本・start が関数', () => {
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'race');
  assert.equal(typeof defs[0].start, 'function');
});

test('評価：改良前の式と一致', () => {
  for (const reason of ['ontime', 'late'])
    for (let rem = 0; rem <= 30; rem += 0.7)
      for (let dmg = 0; dmg <= 100; dmg += 7)
        for (let reds = 0; reds <= 3; reds++)
          for (let crashes = 0; crashes <= 4; crashes++)
            for (let contacts = 0; contacts <= 5; contacts++)
              assert.equal(L.grade({ reason, rem, dmg, reds, crashes, contacts }), refGrade(reason, rem, dmg, reds, crashes, contacts));
});

test('報酬：打刻成功・遅刻・転倒・引き返しで改良前と同じ', () => {
  for (const r of ['ontime', 'late', 'crash', 'quit']) assert.deepEqual(plain(L.rewardFx(r)), REF[r]);
  assert.deepEqual(plain(L.rewardFx('timeout')), REF.quit, '知らない理由は引き返し扱い');
});

test('ニアミス判定：前後が重なり、横のすき間が 0〜0.9m、時速14以上のときだけ', () => {
  assert.equal(L.nearMiss(0.5, 2, 0.4, 20), true);
  assert.equal(L.nearMiss(0.5, 2, 0, 20), false, '重なっていたら接触（ニアミスではない）');
  assert.equal(L.nearMiss(0.5, 2, 1.2, 20), false, '離れすぎ');
  assert.equal(L.nearMiss(3, 2, 0.4, 20), false, '前後が離れている');
  assert.equal(L.nearMiss(0.5, 2, 0.4, 8), false, '遅い');
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
}
console.log(`minigame-race: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
