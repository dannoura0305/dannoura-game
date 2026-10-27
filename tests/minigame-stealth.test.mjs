// ステルス「起こさないで家事」の純粋なロジック（minigames/stealth.js の StealthLogic）を node:vm で確かめる。
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
vm.runInContext(readFileSync(join(ROOT, 'minigames/stealth.js'), 'utf8'), ctx, { filename: 'stealth.js' });
const L = vm.runInContext('StealthLogic', ctx);
const plain = v => JSON.parse(JSON.stringify(v));

// ── 改良前の式（minigames/stealth.js の computeGrade() / result() からそのまま写したもの） ──
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function refGrade(endReason, maxNoise, toyHits, creaks, T_PLAY, cleared, catPets, hard, done) {
  let grade, gradeScore;
  if (endReason === 'clear') {
    gradeScore = Math.round(clamp(100 - maxNoise * .35 - toyHits * 6 - creaks * 1.5 + (T_PLAY - cleared) * .7 + catPets * 3 + hard * 3, 0, 130));
    grade = gradeScore >= 80 ? 'S' : gradeScore >= 62 ? 'A' : gradeScore >= 45 ? 'B' : 'C';
  } else if (endReason === 'late') { grade = done >= 3 ? 'B' : 'C'; gradeScore = done * 12; }
  else { grade = 'C'; gradeScore = done * 8; }
  return { grade, score: gradeScore };
}
function refResult(reason, done) {
  if (reason === 'clear') return { fx: { childStress: -10, mental: 3, hope: 2, fatigue: 4 }, time: 45, sp: 1 };
  if (reason === 'woke') return { fx: { childStress: 4, mental: -3, fatigue: 6 }, time: 60, sp: 0 };
  if (reason === 'late') { const cs = -Math.min(6, done * 2); return { fx: { childStress: cs, fatigue: 5 }, time: 60, sp: 0 }; }
  return { fx: { fatigue: 2 }, time: 20, sp: 0 };
}

test('登録：stealth が1本・start が関数', () => {
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'stealth');
  assert.equal(typeof defs[0].start, 'function');
});

test('評価：改良前の式と一致', () => {
  for (const reason of ['clear', 'late', 'woke'])
    for (let maxNoise = 0; maxNoise <= 100; maxNoise += 9)
      for (let toyHits = 0; toyHits <= 3; toyHits++)
        for (let creaks = 0; creaks <= 6; creaks += 2)
          for (const cleared of [20, 60, 95, 120])
            for (let catPets = 0; catPets <= 2; catPets++)
              for (const hard of [0, 1])
                for (let done = 0; done <= 4; done++)
                  assert.deepEqual(plain(L.grade({ reason, maxNoise, toyHits, creaks, T_PLAY: 120, cleared, catPets, hard, done })),
                    refGrade(reason, maxNoise, toyHits, creaks, 120, cleared, catPets, hard, done));
});

test('報酬：終わった・起こした・0時過ぎ・切り上げで改良前と同じ', () => {
  for (const r of ['clear', 'woke', 'late', 'quit']) for (let d = 0; d <= 4; d++) assert.deepEqual(plain(L.rewardFx(r, d)), plain(refResult(r, d)));
});

test('振動の段階：66%で1、85%で2', () => {
  assert.equal(L.buzzLevel(10), 0); assert.equal(L.buzzLevel(66), 1); assert.equal(L.buzzLevel(84.9), 1); assert.equal(L.buzzLevel(85), 2);
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
}
console.log(`minigame-stealth: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
