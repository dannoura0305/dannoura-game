// 買い出しダッシュ　高難易度版：ボス（minigames/runner/bosses.js）と、ボスで覚える技（combat.js の rising）
// ・ボスの表：選択画面に出るのは隠しでない物だけ・覚える技が技の表にある・隠しボス（風邪菌・仮）は枠だけ
// ・仮のボス：起きるまで動かない・近づく・予兆（踏みつけ・吐く）の後に攻撃の弾が出る・部屋の外に出ない・倒すと弾が消える
// ・切り上げ：覚えるまで出ない。覚えると ↑＋攻撃で出る・上に高く届く
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, Set };
vm.createContext(ctx);
for (const f of ['act.js', 'combat.js', 'bosses.js']) vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/' + f), 'utf8'), ctx, { filename: f });
const RA = ctx.RunnerAct, RC = ctx.RunnerCombat, RB = ctx.RunnerBosses;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const T = RA.TILE;
const room = () => RA.makeMap(['#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#'.repeat(30), '#'.repeat(30)]);
const AR = { x0: T, x1: 29 * T };

t('ボスの表：選択画面に出るのは隠しでない物だけ・覚える技は技の表にある（習得技）・隠しボスは全員倒した後', () => {
  const vis = RB.visible(); assert.ok(vis.length >= 1 && vis.every(b => !b.hidden));
  for (const b of RB.BOSSES) if (b.teaches) { assert.ok(RC.MOVES[b.teaches], b.teaches); assert.equal(RC.MOVES[b.teaches].base, false); assert.equal(RC.MOVES[b.teaches].learnedFrom, b.id); }
  const cold = RB.BOSSES.find(b => b.id === 'cold'); assert.ok(cold && cold.hidden && cold.stage === 'home' && cold.unlock === 'after_all', '隠しボス：家・全員倒した後');
  assert.ok(!RB.coldUnlocked([])); assert.ok(RB.coldUnlocked(RB.visible().map(b => b.id)), '全員倒すと会える');
});

t('仮のボス：起きるまで動かない・起きると近づく', () => {
  const map = room(), Z = RB.make(map), e = Z.spawn('boss_a', 20 * T, 2 * T, AR), p = { x: 5 * T, y: 2 * T };
  for (let i = 0; i < 60; i++) Z.step(e, p); assert.equal(e.x, 20 * T, '起きる前は動かない');
  assert.ok(!Z.hurt(e, 1), '起きる前は傷つかない');
  Z.wake(e); for (let i = 0; i < 30; i++) Z.step(e, p); assert.ok(e.x < 20 * T, '近づく');
});

t('仮のボス：予兆（踏みつけ・吐く）の後に弾が出る・部屋の外に出ない', () => {
  const map = room(), Z = RB.make(map), e = Z.spawn('boss_a', 20 * T, 2 * T, AR), p = { x: 5 * T, y: 2 * T };
  Z.wake(e); const seen = new Set(); let waves = 0, drops = 0, teleBeforeShot = true;
  for (let i = 0; i < 1500; i++) {
    const before = Z.shots.length, tele = Z.telegraph(e); Z.step(e, p); Z.stepShots(); seen.add(e.state);
    if (Z.shots.length > before) { if (!seen.has('slam_tele') && !seen.has('spit_tele')) teleBeforeShot = false; }
    for (const s of Z.shots) { if (s.kind === 'wave') waves++; else drops++; }
    assert.ok(e.x >= AR.x0 && e.x <= AR.x1, '部屋の外に出ない'); void tele;
  }
  assert.ok(seen.has('slam_tele') && seen.has('slam_air') && seen.has('spit_tele'), [...seen].join(','));
  assert.ok(waves > 0 && drops > 0 && teleBeforeShot);
});

t('仮のボス：攻撃で減り、0 で倒れる・弾が消える。体力が半分を切ると予兆が短くなる', () => {
  const map = room(), Z = RB.make(map), e = Z.spawn('boss_a', 20 * T, 2 * T, AR); Z.wake(e);
  const telLen = () => { let f = 0, on = false; const q = Z.spawn('boss_a', 20 * T, 2 * T, AR); q.hp = e.hp; q.hpMax = e.hpMax; Z.wake(q); for (let i = 0; i < 400; i++) { Z.step(q, { x: 5 * T, y: 80 }); if (Z.telegraph(q)) { on = true; f++; } else if (on) break; } return f; };
  const slow = telLen(); e.hp = 10; const quick = telLen(); assert.ok(quick < slow, `${quick} < ${slow}`);
  Z.shots.push({ kind: 'drop', x: 0, y: 0, vx: 0, vy: 0, w: 1, h: 1, life: 99 });
  while (!e.dead) Z.hurt(e, 1); assert.equal(e.hp, 0); assert.equal(Z.shots.length, 0);
});

t('切り上げ：覚えるまで ↑＋攻撃でも 1 段目。覚えると切り上げが出て、上に高く届く', () => {
  const map = RA.makeMap(['.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '#'.repeat(40)]), A = RA.make({ map });
  const tryUp = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); const i = { up: true, atk: true, atkP: true }; A.step(b, C.pre(b, i)); return { b, C }; };
  assert.equal(tryUp([]).b.atk.id, 'slash1');
  const r = tryUp(['rising']); assert.equal(r.b.atk.id, 'rising');
  for (let i = 0; i < 5; i++) { A.step(r.b, r.C.pre(r.b, {})); }
  const hb = r.C.hitbox(r.b); assert.ok(hb && hb.y1 - r.b.y > 100, '上に高く届く');
});

console.log(`runner-hard-boss: ${n} ok`);
