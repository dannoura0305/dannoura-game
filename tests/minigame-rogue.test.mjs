// ローグライク「深夜の工場巡回」の純粋なロジック（minigames/roguelike.js の RogueLogic）を node:vm で確かめる。
// 評価・報酬・SP・怪談ネタが、改良前の式（下の ref*）と完全に同じであること（報酬の約束を変えない）。
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
vm.runInContext(readFileSync(join(ROOT, 'minigames/roguelike.js'), 'utf8'), ctx, { filename: 'roguelike.js' });
const L = vm.runInContext('RogueLogic', ctx);
const plain = v => JSON.parse(JSON.stringify(v));

// ── 改良前の式（minigames/roguelike.js の computeGrade / result() からそのまま写したもの） ──
function refGrade(reason, inspected, bossDown, hp, banished, floor, totalFaults) {
  const clear = reason === 'clear';
  const score = inspected * 100 + (clear ? 500 : 0) + (bossDown ? 300 : 0) + Math.max(0, hp) * 40 + banished * 20 + floor * 50;
  let g = 'C';
  if (clear && inspected >= totalFaults && bossDown && hp >= 3) g = 'S';
  else if (clear && inspected >= totalFaults - 1) g = 'A';
  else if (clear || (floor >= 3 && inspected >= 5)) g = 'B';
  return { g, score };
}
function refResult(R, inspected, memos, bossDown, met, banished) {
  const clear = R === 'clear', down = R === 'down';
  const fx = {
    jobRep: inspected * 3 + (clear ? 5 : 0),
    certKnow: memos * 4 + (clear ? 2 : 0),
    money: inspected * 1500 + (clear ? 3000 : 0),
    mental: clear ? 4 : down ? -8 : 0,
    hope: bossDown ? 2 : 0,
    fatigue: 10,
  };
  return { fx, sp: clear ? 2 : inspected > 0 ? 1 : 0, gotNeta: met + banished >= 2 };
}

test('登録：rogue が1本・start が関数', () => {
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'rogue');
  assert.equal(typeof defs[0].start, 'function');
});

test('評価：改良前の式と全組み合わせで一致', () => {
  let n = 0;
  for (const reason of ['clear', 'down', 'quit'])
    for (let inspected = 0; inspected <= 9; inspected++)
      for (const bossDown of [false, true])
        for (let hp = -1; hp <= 7; hp++)
          for (const banished of [0, 1, 3, 6])
            for (let floor = 1; floor <= 3; floor++)
              for (const totalFaults of [6, 7, 8]) {
                assert.deepEqual(plain(L.grade({ reason, inspected, bossDown, hp, banished, floor, totalFaults })),
                  refGrade(reason, inspected, bossDown, hp, banished, floor, totalFaults));
                n++;
              }
  assert.ok(n > 10000);
});

test('報酬・SP・怪談ネタ：改良前の式と全組み合わせで一致', () => {
  for (const R of ['clear', 'down', 'quit'])
    for (let inspected = 0; inspected <= 9; inspected++)
      for (let memos = 0; memos <= 3; memos++)
        for (const bossDown of [false, true])
          for (let met = 0; met <= 4; met++)
            for (let banished = 0; banished <= 4; banished++) {
              const st = { reason: R, inspected, memos, bossDown, met, banished };
              const ref = refResult(R, inspected, memos, bossDown, met, banished);
              assert.deepEqual(plain(L.rewardFx(st)), ref.fx);
              assert.equal(L.sp(st), ref.sp);
              assert.equal(L.gotNeta(st), ref.gotNeta);
            }
});

test('予告（intent）：隣にいて、次の手で襲う条件のときだけ', () => {
  assert.equal(L.intent({ kind: 'g', cd: 0 }, 1, false), true);
  assert.equal(L.intent({ kind: 'g', cd: 1 }, 1, false), true, '手番のはじめに cd が0になる');
  assert.equal(L.intent({ kind: 'g', cd: 2 }, 1, false), false);
  assert.equal(L.intent({ kind: 'g', cd: 0 }, 2, false), false);
  assert.equal(L.intent({ kind: 'k' }, 1, false), true);
  assert.equal(L.intent({ kind: 'k' }, 1, true), false, '照らされている影は動けない');
  assert.equal(L.intent({ kind: 'b', stun: 0, tick: 1 }, 1, false), true);
  assert.equal(L.intent({ kind: 'b', stun: 0, tick: 0 }, 1, false), false, '怨霊は2手に1回');
  assert.equal(L.intent({ kind: 'b', stun: 1, tick: 1 }, 1, false), false);
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message)); }
}
console.log(`minigame-rogue: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
