// 買い出しダッシュ　高難易度版（試作）：試しの 1 面（minigames/runner_hard.js の RunnerHardStage）が、自機の動き（act.js）で最後まで通れるか。
// 簡単な自動操作（右へ進み、決まった所で跳ぶ・壁蹴り・ダッシュジャンプ・スライド）で、始まりからコンビニの戸まで行く。
// また、各区間が「その技でないと越えられない」作りになっていること（ふつうのジャンプでは塀に届かない・歩きジャンプでは広い穴を越えられない・立ったままでは低い天井を通れない）も確かめる。
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const defs = [];
const ctx = { console, Math, Object, Array, Number, JSON, registerMinigame: d => defs.push(d), addMinigameStyle() {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/act.js'), 'utf8'), ctx, { filename: 'act.js' });
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner_hard.js'), 'utf8'), ctx, { filename: 'runner_hard.js' });
const RA = ctx.RunnerAct, ST = ctx.RunnerHardStage;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

const ROWS = ST.rows(), T = RA.TILE, Hh = ROWS.length;
const find = ch => { for (let r = 0; r < Hh; r++) { const c = ROWS[r].indexOf(ch); if (c >= 0) return { c, x: c * T + T / 2, y: (Hh - 1 - r) * T }; } return null; };
const map = RA.makeMap(ROWS.map(r => r.replace(/[SCG]/g, '.')));
const S = find('S'), G = find('G'), AR = ST.arena();

t('登録：runner_hard が 1 本・面は 14 行で幅がそろう・始まりと戸がある', () => {
  assert.equal(defs.length, 1); assert.equal(defs[0].id, 'runner_hard'); assert.equal(typeof defs[0].start, 'function');
  assert.equal(ROWS.length, 14); assert.ok(ROWS.every(r => r.length === ROWS[0].length));
  assert.ok(S && G && G.x > S.x);
});

// 自動操作：x の位置で何をするかを決める（区間は RunnerHardStage.rows() の寸法）
function bot(b, f, mem) {
  const c = b.x / T, inp = { r: true };
  if (b.state === 'jump') inp.j = true;                                                                // 上がっている間は押したまま（いちばん高く）
  if (c > 11.5 && c < 13.5 && b.state !== 'jump' && b.state !== 'fall') inp.j = true;                 // 箱
  if (c > 21.2 && c < 21.75 && b.y >= 79) inp.j = true;                                                 // 穴（3 マス）
  if (c > 44 && c < 48.5 && b.y < 280) {                                                                // 高い塀：壁蹴りで登る（壁ずりになったら押し直す）
    if (b.state === 'stand' || b.state === 'walk' || b.state === 'walk_start' || b.state === 'land') inp.j = true;
    else if (b.state === 'wall_slide') inp.j = (f % 2 === 0);
    else if (b.state === 'wall_kick' || b.state === 'jump') inp.j = true;
  }
  if (c > 64 && c < 69.6 && b.y >= 79) { inp.d = b.state === 'dash' || !mem.prevD; if (c > 68.4) inp.j = true; }   // 広い穴：地上でダッシュを押し直す → 端で跳ぶ
  if ((b.state === 'jump' || b.state === 'fall') && b.dashJump) { inp.d = true; inp.j = true; }
  if (c > 81 && c < 95) inp.dn = (f % 40 < 2);                                                          // 低い天井：スライド
  if (mem.prevJ && inp.j && (b.state === 'stand' || b.state === 'walk' || b.state === 'land' || b.state === 'walk_start')) inp.j = false;   // 地上では押し直す
  mem.prevJ = !!inp.j; mem.prevD = !!inp.d;
  return inp;
}
function runBot(limit = 60 * 90) {
  const A = RA.make({ map }), b = A.body(S.x, S.y, 1), mem = {}; let hurt = 0, maxX = 0, f = 0;
  for (; f < limit; f++) { A.step(b, bot(b, f, mem)); if (b.state === 'hurt') hurt++; maxX = Math.max(maxX, b.x); if (b.x > (AR.c0 + 2) * T && b.y === 80) return { ok: true, f, hurt, b }; }
  return { ok: false, f, hurt, maxX: Math.round(maxX / T), b };
}

t('通れる：自動操作で、始まりからボスの部屋まで行ける（とげに当たらずに）', () => {
  const r = runBot();
  assert.ok(r.ok, `届かなかった：いちばん右 ${r.maxX} マス・最後 ${r.b.state} (${(r.b.x / T).toFixed(1)}, ${(r.b.y / T).toFixed(1)})`);
  assert.equal(r.hurt, 0, 'とげに当たった');
  assert.ok(r.f / 60 < 60, `${(r.f / 60).toFixed(1)} 秒`);
});

t('区間の意味：ふつうのジャンプでは高い塀（200px）に届かない', () => {
  const A = RA.make({ map }), b = A.body(46 * T, 80, 1);
  for (let f = 0; f < 120; f++) A.step(b, { r: true, j: true });
  assert.ok(b.y < 280, '塀の上に乗れてしまう');
});

t('区間の意味：歩きながらのジャンプでは広い穴（240px）を越えられない', () => {
  const A = RA.make({ map }), b = A.body(68.5 * T, 80, 1); let f = 0;
  for (; f < 200; f++) { A.step(b, { r: true, j: f < 40 }); if (b.state === 'land' || b.state === 'hurt') break; }
  assert.ok(b.x < 76 * T, `越えてしまう x=${(b.x / T).toFixed(1)}`);
});

t('区間の意味：立ったまま（歩き）では低い天井の下を通れない', () => {
  const A = RA.make({ map }), b = A.body(80 * T, 80, 1);
  for (let f = 0; f < 200; f++) A.step(b, { r: true });
  assert.ok(b.x < 84 * T, `通れてしまう x=${(b.x / T).toFixed(1)}`);
});

t('ボスの部屋：平らな床（列 c0〜c1）・その先にコンビニの戸・部屋から戸まで歩いて行ける', () => {
  for (let c = AR.c0 - 1; c <= AR.c1 + 1; c++) { assert.ok(map.solid(c, 1), `床 ${c}`); assert.ok(!map.solid(c, 2) && !map.solid(c, 3), `空き ${c}`); }
  assert.ok(G.c > AR.c1 + 1);
  const A = RA.make({ map }), b = A.body((AR.c1 - 1) * T, 80, 1); let f = 0;
  for (; f < 600; f++) { A.step(b, { r: true }); if (Math.abs(b.x - G.x) < 26) break; }
  assert.ok(Math.abs(b.x - G.x) < 26, `戸に届かない x=${(b.x / T).toFixed(1)}`);
  map.extra.add((AR.c1 + 1) + ',2'); map.extra.add((AR.c1 + 1) + ',3');
  const c = A.body((AR.c1 - 1) * T, 80, 1); for (let i = 0; i < 200; i++) A.step(c, { r: true }); assert.ok(c.x < (AR.c1 + 1) * T, '柵が閉まっていれば通れない');
  map.extra.clear();
});

console.log(`runner-hard-stage: ${n} ok`);
