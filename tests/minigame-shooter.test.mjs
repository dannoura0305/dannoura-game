// シューティング「炎上コメント撃退」の純粋なロジック（minigames/shooter.js の ShooterLogic）を node:vm で確かめる。
// 台本（シードで決まる）・弾の形・当たり判定・スコア／コンボ・難しさ・評価・報酬（以前の式のまま）。
import vm from 'node:vm';
import { readFileSync, existsSync, statSync } from 'node:fs';
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

// ── 二つの色（怒り／冷笑）・吸収・反論・論破チェイン・残り秒ボーナス ──
test('二つの色：違う色には 2 倍・同じ色と色の無いものは 1 倍', () => {
  assert.equal(L.dmgMul(0, 1), 2); assert.equal(L.dmgMul(1, 0), 2);
  assert.equal(L.dmgMul(0, 0), 1); assert.equal(L.dmgMul(1, 1), 1);
  assert.equal(L.dmgMul(-1, 0), 1); assert.equal(L.dmgMul(0, undefined), 1);
});

test('論破チェイン：同じ色 3 体で 1 チェイン・点は 100×2^(n−1)・9 以上は 25,600 で止まる', () => {
  const st = L.chainNew();
  const run = (tone, k) => { const r = []; for (let i = 0; i < k; i++) r.push(L.chainStep(st, tone)); return r; };
  let r = run(0, 3);
  assert.deepEqual(r.map(x => x.done), [false, false, true]);
  assert.equal(r[2].bonus, 100); assert.equal(st.chain, 1);
  r = run(1, 3); assert.equal(r[2].bonus, 200); assert.equal(st.chain, 2);   // 組が済んだあとなら色を変えても切れない
  for (let c = 3; c <= 12; c++) { r = run(c % 2, 3); assert.equal(r[2].bonus, Math.min(25600, 100 * 2 ** (c - 1))); }
  assert.equal(st.chain, 12); assert.equal(st.max, 12);
  assert.deepEqual([1, 2, 8, 9, 10, 99].map(L.chainBonus), [100, 200, 12800, 25600, 25600, 25600]);
});

test('論破チェイン：組の途中で違う色を倒すと 0 に戻り、その色で新しい組が始まる', () => {
  const st = L.chainNew();
  for (let i = 0; i < 6; i++) L.chainStep(st, 0);
  assert.equal(st.chain, 2);
  L.chainStep(st, 0);                            // 組の 1 体目（怒り）
  const r = L.chainStep(st, 1);                  // 途中で冷笑 → 切れる
  assert.equal(r.broke, true); assert.equal(st.chain, 0); assert.equal(st.n, 1); assert.equal(st.tone, 1);
  assert.equal(st.max, 2);                       // 最大は残る
  L.chainStep(st, 1); const r2 = L.chainStep(st, 1);
  assert.equal(r2.done, true); assert.equal(st.chain, 1);
  assert.equal(L.chainStep(st, -1).done, false); // 色の無いものは数えない
  assert.equal(st.n, 3);
});

test('吸収と反論：ゲージは 0〜120・10 ごとに 1 本・最大 12 本', () => {
  assert.equal(L.absorbGauge(0, 1), 1); assert.equal(L.absorbGauge(119, 2), 120); assert.equal(L.absorbGauge(120, 1), 120);
  assert.equal(L.absorbGauge(5, -9), 0);
  assert.deepEqual([0, 9, 10, 19, 20, 55, 119, 120, 999].map(L.releaseCount), [0, 0, 1, 1, 2, 5, 11, 12, 12]);
  assert.equal(L.GAUGE_MAX, 120); assert.equal(L.GAUGE_PER, 10); assert.equal(L.RELEASE_MAX, 12);
});

test('残り秒ボーナス・切り替えの時間（7 コマで色が変わり 14 コマで終わる）', () => {
  assert.equal(L.timeBonus(39.9), 39000); assert.equal(L.timeBonus(-3), 0); assert.equal(L.timeBonus(10, 500), 5000);
  assert.ok(Math.abs(L.SWITCH_FLIP - 7 / 60) < 1e-12); assert.ok(Math.abs(L.SWITCH_END - 14 / 60) < 1e-12);
});

test('台本の色：出る敵すべてに 0 か 1・シードで決まる・同じ色が 3 体ずつのまとまりで変わる', () => {
  for (const seed of [1, 7, 12345, 99999]) {
    const tl = L.buildTimeline(seed, {});
    const foes = tl.filter(e => e.kind === 'spawn' || e.kind === 'form' || e.kind === 'elite');
    assert.ok(foes.every(e => e.pol === 0 || e.pol === 1));
    assert.ok(tl.filter(e => !(e.kind === 'spawn' || e.kind === 'form' || e.kind === 'elite')).every(e => !('pol' in e)));
    assert.deepEqual(plain(tl), plain(L.buildTimeline(seed, {})));
    const seq = L.toneSeq(seed, 300);
    let run = 1, runs = [];
    for (let i = 1; i < seq.length; i++) { if (seq[i] === seq[i - 1]) run++; else { runs.push(run); run = 1; } }
    assert.ok(runs.every(r => r % 3 === 0), 'まとまりは 3 の倍数');
    assert.ok(seq.includes(0) && seq.includes(1));
  }
});

test('評価：論破チェイン 4 以上でも S（コンボの代わり）', () => {
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 3, friendlyFire: 1, maxCombo: 5, maxChain: 4 }), 'S');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 3, friendlyFire: 1, maxCombo: 5, maxChain: 3 }), 'A');
  assert.equal(L.grade({ reason: 'clear', bossBeaten: true, shield: 2, friendlyFire: 0, maxCombo: 5, maxChain: 9 }), 'A');
});

test('ゲーム本体：二つの色の操作がある（切替 Z/C・反論 V・ボタン）・遊び方と説明に載っている', () => {
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  assert.match(src, /k==='z'\|\|k==='Z'\|\|k==='c'\|\|k==='C'\)\)\{e\.preventDefault\(\);switchVoice\(\)/);
  assert.match(src, /k==='v'\|\|k==='V'\)\)\{e\.preventDefault\(\);release\(\)/);
  assert.match(src, /shooter-sw/); assert.match(src, /shooter-rel/);
  assert.match(defs[0].help, /切替/); assert.match(defs[0].help, /反論/);
  assert.match(defs[0].desc, /怒り/); assert.match(defs[0].desc, /冷笑/);
  // 同じ色の弾は当たらず吸う（当たり判定より先に色を見る）
  const i = src.indexOf('if(b.tone===vpol){'), j = src.indexOf("hurt(b.x,b.y,b.ch?");
  assert.ok(i > 0 && j > i);
});

// ── 任務とメダル・連続撃退・いいねと声の強化・ボスの取り巻き ──
test('連続撃退：10・30・60・100・150… に届いた所で点（1 体ずつ数えても、まとめて越えても同じ）', () => {
  assert.deepEqual(plain(L.streakBonus(9, 10)), { pts: 100, tier: 0 });
  assert.deepEqual(plain(L.streakBonus(10, 11)), { pts: 0, tier: -1 });
  assert.equal(L.streakBonus(29, 30).pts, 500);
  assert.equal(L.streakBonus(149, 150).pts, 5000);
  let sum = 0; for (let n = 1; n <= 1000; n++) sum += L.streakBonus(n - 1, n).pts;
  assert.equal(sum, L.STREAK_PTS.reduce((a, b) => a + b, 0));
  assert.equal(L.streakBonus(0, 1000).pts, sum);
  assert.equal(L.STREAK.length, 10);
});

test('任務：クリアしたときだけ・70%／100% 撃退・応援を全部（誤射なし）・無傷', () => {
  const base = { reason: 'clear', spawned: 100, kills: 70, goodsSpawned: 10, caught: 10, friendlyFire: 0, hits: 0 };
  assert.deepEqual(plain(L.missionCheck(base)), [true, false, true, true]);
  assert.deepEqual(plain(L.missionCheck({ ...base, kills: 69 })), [false, false, true, true]);
  assert.deepEqual(plain(L.missionCheck({ ...base, kills: 100 })), [true, true, true, true]);
  assert.deepEqual(plain(L.missionCheck({ ...base, caught: 9 })), [true, false, false, true]);
  assert.deepEqual(plain(L.missionCheck({ ...base, friendlyFire: 1 })), [true, false, false, true]);
  assert.deepEqual(plain(L.missionCheck({ ...base, hits: 1 })), [true, false, true, false]);
  assert.deepEqual(plain(L.missionCheck({ ...base, reason: 'down', kills: 100 })), [false, false, false, false]);
  assert.deepEqual(plain(L.missionCheck({ ...base, spawned: 0 })), [false, false, true, true]);
  assert.equal(L.killPct(3, 2), 66); assert.equal(L.killPct(0, 5), 0); assert.equal(L.killPct(4, 9), 100);
  assert.equal(L.medalCount({ easy: [true, false, true, true], normal: [true, true, true, true], hard: [false, false, false, false] }), 7);
  assert.equal(L.medalCount(null), 0);
  assert.equal(L.MISSIONS.length, 4);
});

test('いいね：種類ごとの数 × 難しさ（やさしい 1・ふつう 1.5・むずかしい 2）を切り捨て', () => {
  assert.equal(L.likeDrop('basic', 'easy'), 1); assert.equal(L.likeDrop('basic', 'normal'), 1); assert.equal(L.likeDrop('basic', 'hard'), 2);
  assert.equal(L.likeDrop('shooter', 'normal'), 4); assert.equal(L.likeDrop('boss', 'hard'), 60);
  assert.equal(L.likeDrop('small', 'hard'), 0); assert.equal(L.likeDrop('???', 'easy'), 0);
});

test('声の強化：段 0〜5 を直線でつなぐ・値段は表・段 4・5 はメダル 4・8 で開く', () => {
  for (const k in L.UPG) {
    const u = L.UPG[k];
    assert.equal(L.upgValue(k, 0), u.int ? Math.floor(u.v0) : u.v0);
    assert.equal(L.upgValue(k, 5), u.int ? Math.floor(u.v5) : u.v5);
    assert.equal(L.upgValue(k, 99), L.upgValue(k, 5)); assert.equal(L.upgValue(k, -3), L.upgValue(k, 0));
    for (let lv = 0; lv < 5; lv++) { assert.equal(L.upgPrice(k, lv), u.price[lv]); assert.ok(lv === 0 || u.price[lv] > u.price[lv - 1]); }
    assert.equal(L.upgPrice(k, 5), Infinity);
  }
  assert.ok(Math.abs(L.upgValue('rate', 2) - (.12 + (.085 - .12) * .4)) < 1e-12);   // 間隔が短くなる
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(l => L.upgValue('heart', l)), [0, 1, 2, 3, 4, 5]);   // 1 段ごとに +1
  assert.deepEqual([0, 3, 4, 7, 8, 12].map(L.upgMaxLv), [3, 3, 4, 4, 5, 5]);
});

test('ボスの取り巻き：段階ごとに 2・3・4 体、体力 6・8・10。残っている間は芯に 1/4', () => {
  assert.deepEqual(plain(L.guardsFor(1)), { n: 2, hp: 6 });
  assert.deepEqual(plain(L.guardsFor(2)), { n: 3, hp: 8 });
  assert.deepEqual(plain(L.guardsFor(3)), { n: 4, hp: 10 });
  assert.equal(L.GUARD_SHIELD, .25);
  assert.equal(L.SCORE.guard, 300);
});

test('ゲーム本体：強化の画面（左上・U）・任務の表示・逃がすと連続が切れる・記録を無い項目だけ足す', () => {
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  assert.match(src, /shooter-shopbtn/); assert.match(src, /function openShop\(\)/);
  assert.match(src, /SD\.likes=Math\.max\(0,SD\.likes\|0\)/);
  assert.match(src, /SD\.medals\[k\]=\[false,false,false,false\]/);
  assert.equal((src.match(/escaped\(e\)/g) || []).length >= 4, true);   // 下へ落ちた・上へ去った（3 種）
  assert.match(src, /bs\.gAlive>0\?L\.GUARD_SHIELD:1/);
  // 報酬の式は変えていない（rewardFx に新しい項目が入っていない）
  const rf = src.slice(src.indexOf('function rewardFx'), src.indexOf('return {fx,sp'));
  assert.doesNotMatch(rf, /likes|medal|streak|upg/);
});

test('ボスの形：怒り＝丸・冷笑＝ひし形（頂点が上下左右・丸と同じ面積）・あいだはなめらか', () => {
  assert.ok(Math.abs(2 * L.DIAMOND ** 2 - Math.PI) < .02);           // ひし形の面積 2d² ≒ 丸 πr²
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) assert.ok(Math.abs(L.shapeScale(a, 1) - L.DIAMOND) < 1e-9);   // 頂点
  assert.ok(Math.abs(L.shapeScale(Math.PI / 4, 1) - L.DIAMOND / Math.SQRT2) < 1e-9);  // 辺の真ん中
  for (const a of [0, .3, 1, 2.5]) { assert.equal(L.shapeScale(a, 0), 1); const h = L.shapeScale(a, .5); assert.ok(h >= Math.min(1, L.shapeScale(a, 1)) - 1e-9 && h <= Math.max(1, L.shapeScale(a, 1)) + 1e-9); }
  // 当たり：丸は半径、ひし形は |x|+|y|
  assert.equal(L.inShape(0, 9.9, 10, 0), true); assert.equal(L.inShape(7.2, 7.2, 10, 0), false);
  assert.equal(L.inShape(0, 12.4, 10, 1), true); assert.equal(L.inShape(7.2, 7.2, 10, 1), false); assert.equal(L.inShape(6, 6, 10, 1), true);
  // 面積がほぼ同じ（格子で数える）
  let c = 0, d = 0; for (let x = -15; x <= 15; x += .25) for (let y = -15; y <= 15; y += .25) { if (L.inShape(x, y, 10, 0)) c++; if (L.inShape(x, y, 10, 1)) d++; }
  assert.ok(Math.abs(c - d) / c < .03, `${c} ${d}`);   // 格子の点がひし形の辺にちょうど乗る分だけずれる
});

test('見た目：敵の吹き出しは明るい地（色の縁・濃い文字・当たると色で光る）', () => {
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  const i = src.indexOf('const TONE_STY=['), blk = src.slice(i, src.indexOf('];', i));
  assert.match(blk, /fill:'#fff0f2'.*st:'#e8364a'.*tx:'#3a0a1c'.*light:true/);
  assert.match(blk, /fill:'#eef5ff'.*st:'#2a86f0'.*tx:'#0c2244'.*light:true/);
  assert.match(src, /if\(flash\)\{cx\.fillStyle=s\.flash\|\|'#fff';cx\.fill\(\);\}/);
});

test('絵：一覧のファイルがすべてあり小さい・弾の絵は字の並びと同じ・読めないときはコードの絵で描く・起動時には読まない', () => {
  const sp = plain(L.SPRITES);
  assert.equal(sp.length, 41);
  assert.ok(sp.includes('face_guard_0') && sp.includes('face_guard_1') && sp.includes('face_good'));
  let total = 0;
  for (const n of sp) { const f = join(ROOT, 'assets/shooter', n + '.webp'); assert.ok(existsSync(f), n); total += statSync(f).size; }
  assert.ok(total < 600 * 1024, `合計 ${total}`);
  for (const t of plain(L.FACE_TYPES)) assert.ok(sp.includes('face_' + t + '_0') && sp.includes('face_' + t + '_1'), t);
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  assert.match(src, /const EB_CH=\['黙','消','叩','晒','嘘','炎'\]/);
  assert.match(src, /const EB_CH_COLD=\['草','笑','乙','痛','寒','謎'\]/);
  assert.match(src, /naturalWidth>0/);
  for (const k of ["spr('mic_'", "spr('like')", "spr('mid')", "spr('boss_0')", "spr('shot_pierce')"]) assert.ok(src.includes(k), k);
  assert.match(src, /\}else\{\n\s+\/\/ 持ち手/, '自機のコードの絵が残っている');
  assert.doesNotMatch(readFileSync(join(ROOT, 'index.html'), 'utf8'), /assets\/shooter/);
});

test('撃つ：撃つボタン（右下）か J／F を押している間だけ撃つ。自動では撃たない・一時停止や画面を離れると離したことになる', () => {
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  assert.match(src, /if\(fireCd<=0&&firing\(\)\)\{/);
  assert.match(src, /const firing=\(\)=>fireKey\|\|firePtrs\.size>0;/);
  assert.match(src, /fireKey=dn&&!paused&&scene==='play'/);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) assert.ok(src.includes(`'${ev}'`), ev);
  assert.match(src, /paused=on;drag=null;[^\n]*fireRelease\(\);/);
  assert.match(src, /fireBtn\.classList\.add\('hide'\);fireRelease\(\);/);
  assert.doesNotMatch(src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n'), /声は自動|自動射撃/);
  assert.match(readFileSync(join(ROOT, 'minigames/registry.js'), 'utf8'), /撃つボタン／J を押している間だけ声が出る/);
});

test('横に広い画面：遊ぶ場所は縦長のまま真ん中・ボタンは左右の余白へ。縦持ちは今までどおり', () => {
  const src = readFileSync(join(ROOT, 'minigames/shooter.js'), 'utf8');
  assert.match(src, /const wide=pw>=320\+WIDE_GUT\*2&&pw>ph\*1\.25;/);
  assert.match(src, /const fw=Math\.min\(480,pw-WIDE_GUT\*2\)/);
  assert.match(src, /\.mg-body\.mg-shooter\.wide\{max-width:none;\}/);
  for (const k of ['sw', 'bomb', 'rel', 'fire']) assert.ok(src.includes(`.mg-shooter.wide .shooter-${k}`), k);
  assert.match(src, /const w=Math\.max\(240,fw\|\|body\.clientWidth\)/);
  assert.match(src, /tip\('fire',/);
});

for (const [name, fn] of queue) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log(`minigame-shooter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
