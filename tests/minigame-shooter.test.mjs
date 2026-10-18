// シューティング「炎上コメント撃退」の純粋なロジック（minigames/shooter.js の ShooterLogic）を node:vm で確かめる。
// 台本（シードで決まる）・弾の形・当たり判定・スコア／コンボ・難しさ・評価・報酬（以前の式のまま）。
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
vm.runInContext(readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8'), ctx, { filename: 'shooter.js' });
const L = vm.runInContext('ShooterLogic', ctx);
const plain = v => JSON.parse(JSON.stringify(v));

test('登録：shooter が1本・start が関数', () => {
  assert.equal(defs.length, 1);
  assert.equal(defs[0].id, 'shooter');
  assert.equal(typeof defs[0].start, 'function');
});

test('乱数：同じシードは同じ列・違うシードは違う列・0〜1', () => {
  const a = L.rng(42), b = L.rng(42), c = L.rng(43);
  const A = [], B = [], C = [];
  for (let i = 0; i < 200; i++) { A.push(a()); B.push(b()); C.push(c()); }
  assert.deepEqual(A, B);
  assert.notDeepEqual(A, C);
  assert.ok(A.every(v => v >= 0 && v < 1));
});

test('台本：シードで決まる（同じなら完全一致・違えば別）', () => {
  for (const opt of [{}, { iv: 1.45 }, { iv: 1, remix: true }]) {
    assert.deepEqual(plain(L.buildTimeline(7, opt)), plain(L.buildTimeline(7, opt)));
  }
  assert.notDeepEqual(plain(L.buildTimeline(7, {})), plain(L.buildTimeline(8, {})));
});

test('台本：時刻順・4ウェーブ・中ボス1・ボス1・範囲内・種類はそのウェーブの表から', () => {
  for (let seed = 1; seed < 40; seed++) {
    for (const opt of [{ iv: 1.45 }, { iv: 1.18 }, { iv: 1, remix: true }]) {
      const tl = L.buildTimeline(seed, opt);
      for (let i = 1; i < tl.length; i++) assert.ok(tl[i].t >= tl[i - 1].t, 'sorted');
      assert.equal(tl.filter(e => e.kind === 'wave').length, 4);
      assert.equal(tl.filter(e => e.kind === 'mid').length, 1);
      assert.equal(tl.filter(e => e.kind === 'boss').length, 1);
      assert.equal(tl[tl.length - 1].kind, 'boss');
      for (const e of tl) {
        assert.ok(e.t >= 0 && e.t <= L.BOSS_T);
        if (e.kind === 'spawn') {
          const wi = L.WAVES.findLastIndex(w => w.t <= e.t);
          assert.ok(e.type in L.WAVES[wi].w, `${e.type} は WAVE ${wi + 1} の表にある`);
          assert.ok(e.x >= 0.08 && e.x <= 0.92);
          // 中ボスの直前は空ける
          assert.ok(!(e.t > L.MID_T - 1 && e.t < L.WAVES[3].t), '中ボス前後に雑魚を出さない');
        }
        if (e.kind === 'elite') assert.ok(e.t >= L.WAVES[3].t, 'エリートは WAVE 4 から');
      }
      // 出現数：ウェーブが進むほど密に（1秒あたり）
      const rate = i => { const a = L.WAVES[i].t, b = i < 3 ? L.WAVES[i + 1].t : L.BOSS_T; return tl.filter(e => e.kind === 'spawn' && e.t >= a && e.t < b).length / (b - a); };
      assert.ok(rate(3) > rate(0), 'WAVE 4 は WAVE 1 より密');
    }
  }
});

test('台本：やさしいほど雑魚が少ない（間隔の倍率）', () => {
  let easy = 0, hard = 0;
  for (let s = 1; s < 30; s++) {
    easy += L.buildTimeline(s, { iv: L.DIFF.easy.iv }).filter(e => e.kind === 'spawn').length;
    hard += L.buildTimeline(s, { iv: L.DIFF.hard.iv }).filter(e => e.kind === 'spawn').length;
  }
  assert.ok(easy < hard * 0.8, `easy ${easy} < hard ${hard}`);
});

test('編隊：画面の内側・種類が正しい', () => {
  for (const W of [240, 390, 480]) for (const f of ['vee', 'wall', 'zigpair']) for (let g = 0; g < 4; g++) {
    const out = L.formation(f, 0.5, W, g);
    assert.ok(out.length >= 3);
    for (const o of out) { assert.ok(o.x >= 30 && o.x <= W - 30); assert.ok(['basic', 'armor', 'zig'].includes(o.type)); }
  }
  assert.equal(L.formation('wall', .5, 400, 2).length, 4, '壁は1か所すき間');
});

test('弾の形：狙い弾は中心が自機を向き、速さがそろう', () => {
  const out = L.aimed(100, 100, 100, 300, 150, 5, 0.2);
  assert.equal(out.length, 5);
  const mid = out[2];
  assert.ok(Math.abs(mid.vx) < 1e-9 && mid.vy > 0);
  for (const b of out) assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 150) < 1e-9);
  // 左右対称
  assert.ok(Math.abs(out[0].vx + out[4].vx) < 1e-9);
});

test('弾の形：包囲網はすき間の分だけ少なく、等間隔', () => {
  assert.equal(L.ring(0, 0, 16, 100, 0, 0, 0).length, 16);
  assert.equal(L.ring(0, 0, 16, 100, 0, 5, 3).length, 13);
  assert.equal(L.ring(0, 0, 16, 100, 0, 15, 2).length, 14, 'すき間が端をまたぐ');
  const r = L.ring(0, 0, 8, 100, 0, 0, 0);
  for (const b of r) assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 100) < 1e-9);
});

test('弾の形：渦巻きは腕の数だけ・時間で回る', () => {
  const a = L.spiral(0, 0, 0, 3, 100, 2, 10), b = L.spiral(0, 0, 0.5, 3, 100, 2, 10);
  assert.equal(a.length, 3);
  assert.notDeepEqual(plain(a), plain(b));
  const ang = a.map(o => Math.atan2(o.vy, o.vx));
  const d = ((ang[1] - ang[0]) + Math.PI * 4) % (Math.PI * 2);
  assert.ok(Math.abs(d - Math.PI * 2 / 3) < 1e-9);
});

test('弾の形：レーザーの列は画面内・最低間隔を守る・シードで決まる', () => {
  for (let s = 1; s < 50; s++) {
    const xs = L.laserCols(390, 3, L.rng(s), 86);
    assert.deepEqual(plain(xs), plain(L.laserCols(390, 3, L.rng(s), 86)));
    for (const x of xs) assert.ok(x >= 30 && x <= 360);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 86 - 1);
  }
});

test('当たり判定：円・矩形・かすり・レーザー', () => {
  assert.ok(L.circleHit(0, 0, 5, 9, 0, 5));
  assert.ok(!L.circleHit(0, 0, 5, 10, 0, 5));
  assert.ok(L.rectCircle(0, 0, 10, 5, 13, 0, 4));
  assert.ok(!L.rectCircle(0, 0, 10, 5, 15, 0, 4));
  assert.ok(L.rectCircle(0, 0, 10, 5, 0, 0, 1), '中にいれば当たる');
  // かすり：当たっていない・かすり半径の内側だけ
  assert.ok(!L.graze(0, 0, 6, 8, 0, 3.5, 22), '当たっている距離はかすりではない');
  assert.ok(L.graze(0, 0, 6, 15, 0, 3.5, 22));
  assert.ok(!L.graze(0, 0, 6, 40, 0, 3.5, 22));
  assert.ok(L.laserHit(100, 14, 110, 3.5));
  assert.ok(!L.laserHit(100, 14, 118, 3.5));
});

test('スコア：コンボ5ごとに ×0.5、上限 ×4・速攻 ×1.5・かすり', () => {
  assert.equal(L.mult(0), 1); assert.equal(L.mult(4), 1); assert.equal(L.mult(5), 1.5);
  assert.equal(L.mult(12), 2); assert.equal(L.mult(30), 4); assert.equal(L.mult(500), 4); assert.equal(L.mult(-3), 1);
  assert.equal(L.killScore('basic', 0, false), 100);
  assert.equal(L.killScore('basic', 10, true), 300);
  assert.equal(L.killScore('armor', 30, false), 1000);
  assert.equal(L.killScore('elite', 0, false), 800);
  assert.equal(L.killScore('unknown', 0, false), 100);
  assert.equal(L.grazeScore(0), 20); assert.equal(L.grazeScore(30), 80);
  // 以前からある敵の点数は変えない
  assert.deepEqual(plain({ basic: L.SCORE.basic, zig: L.SCORE.zig, armor: L.SCORE.armor, split: L.SCORE.split, small: L.SCORE.small, shooter: L.SCORE.shooter }),
    { basic: 100, zig: 150, armor: 250, split: 150, small: 50, shooter: 220 });
});

test('難しさ：やさしい→むずかしいで厳しくなる・むずかしいは以前の調整・感情制御', () => {
  const E = L.diffTable('easy', 0), N = L.diffTable('normal', 0), Hd = L.diffTable('hard', 0);
  for (const k of ['shield', 'inv', 'iv', 'fire', 'bombs', 'grazeR', 'laserWarn']) assert.ok(E[k] >= N[k] && N[k] >= Hd[k], k);
  for (const k of ['spd', 'eb', 'bossHp', 'density', 'hb']) assert.ok(E[k] <= N[k] && N[k] <= Hd[k], k);
  assert.deepEqual([Hd.shield, Hd.spd, Hd.iv, Hd.eb, Hd.inv, Hd.hb, Hd.ffShield], [5, 1, 1, 1, 1.3, 0.8, true]);
  assert.equal(E.ffPass, true, 'やさしいは声が応援をすり抜ける');
  const E3 = L.diffTable('easy', 3), E9 = L.diffTable('easy', 9);
  assert.equal(E3.shield, E.shield + 3);
  assert.ok(Math.abs(E3.inv - (E.inv + 0.45)) < 1e-9);
  assert.deepEqual(plain(E9), plain(E3), 'Lv は3で頭打ち');
  assert.deepEqual(plain(L.diffTable('bogus', 0)), plain(E), '知らない値はやさしい');
  assert.equal(L.DIFF.easy.shield, 8, '表そのものは書き換えない');
});

test('評価：以前と同じ決まり', () => {
  assert.equal(L.grade({ reason: 'down', bossBeaten: true, shield: 9, friendlyFire: 0, maxCombo: 99 }), 'C');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 3, friendlyFire: 1, maxCombo: 20 }), 'S');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 3, friendlyFire: 2, maxCombo: 20 }), 'A');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 2, friendlyFire: 0, maxCombo: 50 }), 'A');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: false, shield: 4 }), 'A');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: false, shield: 3 }), 'B');
});

// 以前の shooter.js の result() にあった計算そのまま（契約）
function oldReward(reason, kills, caught, shield, friendlyFire, bossBeaten, flame) {
  const clear = reason === 'clear', down = reason === 'down';
  const flameDown = clear ? Math.min(5, 2 + Math.floor(kills / 20)) + (bossBeaten ? 1 : 0) : Math.floor(kills / 25);
  const fx = {
    flame: -Math.min(flame, flameDown),
    mental: clear ? 2 + Math.max(0, Math.min(5, shield)) + (bossBeaten ? 1 : 0) : down ? -6 : 0,
    followers: clear ? Math.min(10, Math.floor(kills / 10)) + Math.min(6, caught) + (bossBeaten ? 3 : 0) : 0,
    fatigue: down ? 8 : 6,
  };
  if (friendlyFire >= 3) fx.followers = (fx.followers || 0) - friendlyFire;
  if (clear && bossBeaten) fx.hope = 1;
  return { fx, sp: clear ? 1 : 0, time: 40 };
}

test('報酬：以前の式と完全に同じ（炎上・精神・フォロワー・疲労・希望・SP・時間）', () => {
  const R = L.rng(2024);
  for (let i = 0; i < 3000; i++) {
    const reason = ['clear', 'down', 'quit'][(R() * 3) | 0];
    const s = { reason, kills: (R() * 200) | 0, caught: (R() * 30) | 0, shield: ((R() * 14) | 0) - 2, friendlyFire: (R() * 8) | 0, bossBeaten: R() < .5 };
    const flame = (R() * 100) | 0;
    assert.deepEqual(plain(L.rewardFx(s, flame)), plain(oldReward(s.reason, s.kills, s.caught, s.shield, s.friendlyFire, s.bossBeaten, flame)));
  }
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log(`minigame-shooter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
