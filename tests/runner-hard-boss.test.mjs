// 買い出しダッシュ　高難易度版：ボス（minigames/runner/bosses.js）と、ボスで覚える技（combat.js）
// ・ボスの表：選択画面に出るのは隠しでない物だけ・覚える技が技の表にある・隠しボス（風邪菌・仮）は全員倒した後
// ・雷殻の怪異（通常ボス C）：起きるまで動かない・近づく・設定画の動き（ストンプ・放電・突進・ガード・雷雲招来）が予兆の後に出る・部屋の外に出ない
// ・ガード（雷殻）：正面の攻撃は防ぐ → 2 回で反撃。後ろから当てると崩れる。雷雲招来：体力半分で。落雷は予兆の間は当たらない・部屋の看板が帯電
// ・倒れる：弾が消える・撃破のコマ。ドット絵のコマ（raikaku.json）が全部ある
// ・習得技：雷突き（ダッシュ中に攻撃）・切り上げ（↑＋攻撃）は覚えるまで出ない
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, Set };
vm.createContext(ctx);
for (const f of ['act.js', 'combat.js', 'bosses.js']) vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/' + f), 'utf8'), ctx, { filename: f });
const RA = ctx.RunnerAct, RC = ctx.RunnerCombat, RB = ctx.RunnerBosses, RK = RB.RAIKAKU;
const SPR = JSON.parse(readFileSync(join(ROOT, 'assets/runner/raikaku.json'), 'utf8'));
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const T = RA.TILE;
const room = () => RA.makeMap(['#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#'.repeat(30), '#'.repeat(30)]);
const AR = { x0: T, x1: 29 * T, floor: 2 * T };
const boss = () => { const map = room(), Z = RB.make(map), e = Z.spawn('raikaku', 20 * T, 2 * T, AR); return { Z, e }; };

t('ボスの表：選択画面に出るのは隠しでない物だけ（雷殻の怪異）・覚える技は技の表にある・隠しボスは全員倒した後', () => {
  const vis = RB.visible(); assert.ok(vis.length >= 1 && vis.every(b => !b.hidden)); assert.ok(vis.some(b => b.id === 'raikaku' && b.name === '雷殻の怪異' && b.stage === 'koka'));
  assert.ok(!RB.BOSSES.some(b => b.id === 'boss_a'), '仮のボスは差し替え済み');
  for (const b of RB.BOSSES) if (b.teaches) { assert.ok(RC.MOVES[b.teaches], b.teaches); assert.equal(RC.MOVES[b.teaches].base, false); assert.equal(RC.MOVES[b.teaches].learnedFrom, b.id); }
  const cold = RB.BOSSES.find(b => b.id === 'cold'); assert.ok(cold && cold.hidden && cold.stage === 'home' && cold.unlock === 'after_all', '隠しボス：家・全員倒した後');
  assert.ok(!RB.coldUnlocked([])); assert.ok(!RB.coldUnlocked(['boss_a'])); assert.ok(RB.coldUnlocked(RB.visible().map(b => b.id)), '全員倒すと会える');
});

t('雷殻の怪異：起きるまで動かない・傷つかない・起きると近づく', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T };
  for (let i = 0; i < 60; i++) Z.step(e, p); assert.equal(e.x, 20 * T); assert.ok(!Z.hurt(e, 1, p.x));
  Z.wake(e); for (let i = 0; i < 30; i++) Z.step(e, p); assert.ok(e.x < 20 * T, '近づく');
});

t('雷殻の怪異：ストンプ（衝撃波）・放電（放射状）・突進・ガードが予兆の後に出る・部屋の外に出ない・突進は低い姿勢', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e); const seen = new Set(), kinds = new Set(), evs = new Set(); let teleFirst = true, lowRush = false;
  for (let i = 0; i < 3000; i++) {
    const before = Z.shots.length; Z.step(e, p); Z.stepShots(); seen.add(e.state); for (const v of e.ev) evs.add(v);
    if (Z.shots.length > before) { for (const s of Z.shots.slice(before)) kinds.add(s.kind); if (!seen.has('stomp_tele') && !seen.has('discharge_tele')) teleFirst = false; }
    if (e.state === 'rush') { const b = Z.box(e); lowRush = lowRush || (b.y1 - b.y0 < RK.h); }
    assert.ok(e.x >= AR.x0 && e.x <= AR.x1, '部屋の外に出ない');
  }
  for (const s of ['stomp_tele', 'stomp', 'discharge_tele', 'discharge', 'rush_tele', 'rush', 'guard']) assert.ok(seen.has(s), s + '：' + [...seen].join(','));
  assert.ok(kinds.has('wave') && kinds.has('spark') && teleFirst, [...kinds].join(','));
  assert.ok(evs.has('stomp') && evs.has('rushwall') && lowRush);
  assert.ok(!seen.has('storm_tele'), '体力が多い間は必殺技を出さない');
});

t('ガード（雷殻）：正面の攻撃は防ぐ（減らない）→ 2 回防ぐと反撃の輪。後ろから当てると減って崩れる', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e);
  for (let i = 0; i < 3000 && e.state !== 'guard'; i++) { Z.step(e, p); Z.stepShots(); }
  assert.equal(e.state, 'guard'); const hp = e.hp, front = e.x + e.face * 40, back = e.x - e.face * 40;
  assert.equal(Z.hurt(e, 2, front), 'block'); assert.equal(e.hp, hp);
  assert.equal(Z.hurt(e, 2, front), 'block'); Z.step(e, p); assert.equal(e.state, 'counter_tele');
  for (let i = 0; i < 20; i++) { Z.step(e, p); Z.stepShots(); } assert.ok(Z.shots.some(s => s.kind === 'burst') || e.state === 'recover');
  const { Z: Z2, e: e2 } = boss(); Z2.wake(e2); for (let i = 0; i < 3000 && e2.state !== 'guard'; i++) { Z2.step(e2, p); Z2.stepShots(); }
  const hp2 = e2.hp; assert.equal(Z2.hurt(e2, 2, e2.x - e2.face * 40), true); assert.equal(e2.hp, hp2 - 2); assert.equal(e2.state, 'recover', '後ろからでガードが崩れる');
});

t('雷雲招来：体力が半分を切ると出る・落雷は予兆の間は当たらない・終わるまで帯電・終わると止む', () => {
  const { Z, e } = boss(), p = { x: 10 * T, y: 2 * T }; Z.wake(e); e.hp = Math.floor(e.hpMax / 2);
  let tele = false, active = false, charged = false;
  for (let i = 0; i < 2000; i++) {
    Z.step(e, p); Z.stepShots(); charged = charged || e.charged;
    for (const s of Z.shots) if (s.kind === 'bolt') { const b = Z.shotBox(s); if (s.f <= s.tele) { assert.equal(b, null); tele = true; } else { assert.ok(b && b.x0 < p.x + 30 && b.x1 > p.x - 30, '自機の所へ落ちる'); active = true; } }
    if (charged && e.state === 'recover') break;
  }
  assert.ok(tele && active && charged); assert.ok(!e.charged, '終わると止む');
});

t('倒れる：0 で倒れる・弾が消える・帯電が止む・撃破のコマ。ドット絵のコマが全部ある（64）', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e);
  for (let i = 0; i < 400; i++) { Z.step(e, p); Z.stepShots(); }
  e.state = 'walk'; while (!e.dead) Z.hurt(e, 1, e.x + e.face * 40);
  assert.equal(e.hp, 0); assert.equal(Z.shots.length, 0); assert.ok(!e.charged);
  for (let i = 0; i < RK.deadF; i++) Z.step(e, p); assert.ok(/^7_[3-7]$/.test(Z.frame(e)), Z.frame(e));
  assert.equal(Object.keys(SPR.frames).length, 64);
  const { Z: Z3, e: e3 } = boss(); Z3.wake(e3); e3.hp = 10; const keys = new Set();
  for (let i = 0; i < 4000; i++) { Z3.step(e3, p); Z3.stepShots(); if (i % 97 === 0) Z3.hurt(e3, 0, e3.x - e3.face * 40); keys.add(Z3.frame(e3)); }
  for (const k of keys) assert.ok(SPR.frames[k], 'コマが無い ' + k);
  assert.ok(keys.size >= 25, `使うコマ ${keys.size}`);
});

t('雷突き（仮）：覚えるまでダッシュ中の攻撃は 1 段目。覚えると前へ踏み込んで遠くまで届く', () => {
  const map = RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]), A = RA.make({ map });
  const tryDash = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); A.step(b, C.pre(b, { r: true, d: true, dP: true })); C.post(b); assert.equal(b.state, 'dash'); A.step(b, C.pre(b, { r: true, d: true, atk: true, atkP: true })); C.post(b); return { b, C }; };
  assert.equal(tryDash([]).b.atk.id, 'slash1');
  const r = tryDash(['raitotsu']); assert.equal(r.b.atk.id, 'raitotsu'); const x0 = r.b.x;
  let hb = null; for (let i = 0; i < 8 && !hb; i++) { A.step(r.b, r.C.pre(r.b, {})); r.C.post(r.b); hb = r.C.hitbox(r.b); }
  assert.ok(hb && hb.dmg >= 3 && hb.x1 - r.b.x > 60, '前へ遠く'); assert.ok(r.b.x - x0 > 40, '踏み込む');
});

t('切り上げ（仮）：覚えるまで ↑＋攻撃でも 1 段目。覚えた記録があれば使える（今は教えるボスが無い）', () => {
  const map = RA.makeMap(['.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '#'.repeat(40)]), A = RA.make({ map });
  const tryUp = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); const i = { up: true, atk: true, atkP: true }; A.step(b, C.pre(b, i)); return { b, C }; };
  assert.equal(tryUp([]).b.atk.id, 'slash1');
  const r = tryUp(['rising']); assert.equal(r.b.atk.id, 'rising');
  for (let i = 0; i < 5; i++) { A.step(r.b, r.C.pre(r.b, {})); }
  const hb = r.C.hitbox(r.b); assert.ok(hb && hb.y1 - r.b.y > 100, '上に高く届く');
});

console.log(`runner-hard-boss: ${n} ok`);
