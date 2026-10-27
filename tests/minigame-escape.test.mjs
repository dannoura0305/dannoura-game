// 脱出・謎解き「閉じ込められた夜勤明け」の純粋なロジック（minigames/escape.js の EscapeLogic）を node:vm で確かめる。
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
vm.runInContext(readFileSync(join(ROOT, 'minigames/escape.js'), 'utf8'), ctx, { filename: 'escape.js' });
const L = vm.runInContext('EscapeLogic', ctx);
const plain = v => JSON.parse(JSON.stringify(v));

// ── 改良前の式（minigames/escape.js の grade() / result() からそのまま写したもの） ──
function refGrade(l, h) { if (h === 0 && l >= 100) return 'S'; if (h <= 1 && l >= 60) return 'A'; if (h <= 2 && l >= 20) return 'B'; return 'C'; }
function refResult(out, hints) {
  if (out === 'clear') { const m = Math.max(0, 4 - hints); return { fx: { certKnow: 5, jobRep: 6, mental: m, fatigue: 6 }, time: 60, sp: 2 }; }
  if (out === 'timeup') return { fx: { mental: -4, fatigue: 7 }, time: 60, sp: 0 };
  return { fx: { fatigue: 2 }, time: 20, sp: 0 };
}

test('登録：escape が1本・start が関数', () => {
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'escape');
  assert.equal(typeof defs[0].start, 'function');
});

test('評価：改良前の式と一致（残り時間・ヒント回数の全範囲）', () => {
  for (let l = -5; l <= 540; l += 0.5) for (let h = 0; h <= 9; h++) assert.equal(L.grade(l, h), refGrade(l, h), `${l} ${h}`);
});

test('報酬：脱出・時間切れ・あきらめで改良前と同じ（ヒント回数で精神が減る）', () => {
  for (const out of ['clear', 'timeup', 'quit']) for (let h = 0; h <= 9; h++) assert.deepEqual(plain(L.rewardFx(out, h)), refResult(out, h));
  assert.equal(L.rewardFx('clear', 0).fx.mental, 4);
  assert.equal(L.rewardFx('clear', 6).fx.mental, 0);
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
}
console.log(`minigame-escape: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
