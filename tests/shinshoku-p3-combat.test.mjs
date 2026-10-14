// 『境界侵食』フェーズ3：戦闘（鉄パイプ・左クリック長押しの強攻撃・連鎖一閃・体幹・装備・素手）・異形（収容者）・相棒の AI
import assert from 'node:assert/strict';
import { Fighter } from '../shinshoku/combat/fighter.js';
import { COMBAT } from '../shinshoku/data/combat.js';
import { combatWithEquip, toggleEquip } from '../shinshoku/combat/equip.js';
import { EQUIP, EQUIP_SLOTS } from '../shinshoku/data/equip.js';
import { pickChainTarget, canChain } from '../shinshoku/combat/chain.js';
import { windows } from '../shinshoku/combat/timing.js';
import { swapFrames } from '../shinshoku/combat/switch.js';
import { Kiro } from '../shinshoku/ai/kiro.js';
import { Shuuyou } from '../shinshoku/ai/shuuyou.js';
import { CompanionBrain } from '../shinshoku/ai/companion.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const run = (F, frames, inp = {}) => { const evs = []; for (let i = 0; i < frames; i++) evs.push(...F.tick(typeof inp === 'function' ? inp(i) : inp)); return evs; };

t('装備：元の数値は変えず、写しに足す（ホルスター・抜刀補助・見切り補助）', () => {
  const C = combatWithEquip(COMBAT, ['holster', 'battou']);
  assert.equal(C.swap.katanaToGun, COMBAT.swap.katanaToGun - 3); assert.equal(C.swap.quickShot, COMBAT.swap.quickShot - 1);
  assert.equal(C.issen.iai.hold, 24); assert.equal(COMBAT.issen.iai.hold, 36);
  const M = combatWithEquip(COMBAT, ['mikiri']); assert.equal(windows('normal', {}, M).just, windows('normal', {}, COMBAT).just + 2);
  assert.equal(swapFrames('katana', 'handgun', {}, C), 6);
  for (const e of Object.values(EQUIP)) assert.equal(e.provisional, true);
});
t('装備の枠は 2 つ（3 つ目を付けると古い方が外れる）', () => {
  let l = []; l = toggleEquip(l, 'holster'); l = toggleEquip(l, 'battou'); l = toggleEquip(l, 'mikiri');
  assert.equal(l.length, EQUIP_SLOTS); assert.deepEqual(l, ['battou', 'mikiri']);
  assert.deepEqual(toggleEquip(l, 'battou'), ['mikiri']); assert.deepEqual(toggleEquip(l, 'nope'), l);
});
t('素手（序章の最初）：攻撃しても何も起きない・持ち替え先が無い', () => {
  const F = new Fighter({ owned: [], weapon: 'none' });
  const evs = run(F, 30, i => ({ attack: i === 0, swap: i === 2 }));
  assert.equal(evs.filter(e => e.t === 'attackStart' || e.t === 'shot' || e.t === 'swapStart').length, 0);
});
t('鉄パイプ：2 段の連撃・遅い発生（12f）・ガード崩し・弾ける', () => {
  const F = new Fighter({ owned: ['pipe'], weapon: 'pipe' });
  const evs = run(F, 80, i => ({ attack: i === 0 || i === 20 || i === 45 }));
  const st = evs.filter(e => e.t === 'attackStart').map(e => e.step); assert.deepEqual(st, [0, 1]);
  const act = evs.find(e => e.t === 'active'); assert.equal(act.atk.guardBreak, true); assert.ok(act.frame >= 12);
  const F2 = new Fighter({ owned: ['pipe'], weapon: 'pipe' }); F2.tick({ parry: true }); assert.equal(F2.st.name, 'parry');
});
t('左クリック長押し：押した瞬間は溜め、すぐ離すと 1 段目、18f で強攻撃、居合は刀だけ', () => {
  const F = new Fighter({});
  const e1 = run(F, 20, i => ({ attack: i === 0, heavy: i < 4 }));
  assert.equal(e1.find(e => e.t === 'attackStart').step, 0);
  const G = new Fighter({});
  const e2 = run(G, 40, i => ({ attack: i === 0, heavy: i < 25 }));
  assert.equal(e2.find(e => e.t === 'attackStart').step, 8);
  const H = new Fighter({ owned: ['pipe'], weapon: 'pipe' });
  const e3 = run(H, 80, i => ({ attack: i === 0, heavy: i < 50 }));
  assert.equal(e3.filter(e => e.t === 'iaiReady').length, 0); assert.equal(e3.find(e => e.t === 'attackStart').step, 8);
});
t('持ち替え：近接→銃、銃→最後の近接。鉄パイプが絡むと重い（18〜27f）', () => {
  const F = new Fighter({ owned: ['pipe', 'katana', 'handgun'], weapon: 'pipe' });
  assert.equal(F.swapTarget(), 'handgun');
  const evs = run(F, 40, i => ({ swap: i === 0 })); const s = evs.find(e => e.t === 'swapStart'); assert.ok(s.frames >= 18 && s.frames <= 27);
  assert.equal(F.weapon, 'handgun'); assert.equal(F.swapTarget(), 'pipe');
  const e2 = run(F, 5, i => ({ wantWeapon: i === 0 ? 'katana' : undefined })); assert.equal(e2.find(e => e.t === 'swapStart').to, 'katana');
});
t('連鎖一閃：一閃の後に窓を開くと、窓の中の攻撃で次の一閃（最大 5）', () => {
  const F = new Fighter({});
  F.openChain('B'); const evs = run(F, 3, i => ({ attack: i === 1 }));
  const is = evs.find(e => e.t === 'issen'); assert.equal(is.kind, 'chain'); assert.equal(is.target, 'B'); assert.equal(F.chainN, 1);
  const G = new Fighter({}); G.openChain('C'); run(G, COMBAT.issen.chain.window + 5); const late = run(G, 2, i => ({ attack: i === 0 })); assert.equal(late.filter(e => e.t === 'issen').length, 0);
  assert.equal(canChain(4, COMBAT), true); assert.equal(canChain(5, COMBAT), false);
});
t('連鎖の相手：「見切り」状態（青い縁）の、近い・生きている・前と違う敵', () => {
  const E = [{ id: 'a', x: 1, z: 0, alive: true, chainable: true }, { id: 'b', x: 3, z: 0, alive: true, chainable: true }, { id: 'c', x: 0.5, z: 0, alive: true, chainable: false }, { id: 'd', x: 9, z: 0, alive: true, chainable: true }];
  assert.equal(pickChainTarget({ x: 0, z: 0 }, E).id, 'a'); assert.equal(pickChainTarget({ x: 0, z: 0 }, E, { exclude: ['a'] }).id, 'b');
  assert.equal(pickChainTarget({ x: 0, z: 0 }, E, { exclude: ['a', 'b'] }), null);
});
t('体幹：削り切ると大きくよろけて「見切り」状態に。一閃・弾かれでも見切り状態', () => {
  const k = new Kiro({ path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); k.go('hostile', []);
  const evs = []; k.hurt(2, 'slash', evs, { poise: 40 }); assert.ok(evs.some(e => e.t === 'broken')); assert.equal(k.state, 'stagger'); assert.equal(k.chainable, true);
  const k2 = new Kiro({ path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); k2.go('hostile', []); k2.hurt(5, 'issen'); assert.equal(k2.chainable, true);
  const k3 = new Kiro({ path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); k3.parried(); assert.equal(k3.chainable, true);
  k3.t = 0; k3.update(2, { player: { x: 9, z: 9 } }); assert.equal(k3.chainable, false);
  const k4 = new Kiro({ path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); k4.poise = 10; k4.poiseT = 0; k4.tickPoise(4, COMBAT.poise); assert.ok(k4.poise > 10);
});
const sense = (x, z) => ({ player: { x, z, noise: 'none', dead: false }, los: true });
t('収容者：眠り（無敵）→ 起きる → 最初の点呼 → 名前を呼ぶと救える', () => {
  const b = new Shuuyou({ pos: { x: 0, z: 0 }, trueName: '久住 トキ' });
  assert.equal(b.immune(), true); b.wake(); assert.equal(b.state, 'hostile'); assert.equal(b.immune(), false);
  let rc = false; for (let i = 0; i < 60 * 12 && !rc; i++) { const o = b.update(1 / 60, sense(0, 6)); if (o.events.some(e => e.t === 'rollcall')) rc = true; }
  assert.ok(rc); assert.equal(b.state, 'rollcall');
  assert.equal(b.callName('ちがう人'), 'wrong'); assert.equal(b.state, 'hostile'); assert.equal(b.atk.name, 'grab');
  b.atk = null; b.rcT = 999; b.enraged = 0; b.update(1 / 60, sense(0, 6)); assert.equal(b.state, 'rollcall');
  const ev = []; assert.equal(b.callName('久住 トキ', ev), 'rescued'); assert.equal(b.resolution, 'rescue'); assert.ok(ev.some(e => e.t === 'rescued'));
  assert.equal(b.callName('久住 トキ'), 'closed');
});
t('収容者：段階（6 割で照明が落ちる・2.5 割で必死）・点呼中に斬ると点呼が崩れる', () => {
  const b = new Shuuyou({ pos: { x: 0, z: 0 } }); b.wake();
  const e1 = []; b.hurt(b.hpMax * 0.45, 'slash', e1); assert.ok(e1.some(e => e.t === 'phase' && e.n === 1));
  const e2 = []; b.hurt(b.hpMax * 0.36, 'slash', e2); assert.ok(e2.some(e => e.t === 'phase' && e.n === 2));
  b.go('rollcall', []); const e3 = []; b.hurt(1, 'slash', e3); assert.ok(e3.some(e => e.t === 'rollcallBroken'));
});
t('収容者：突進が器具庫で終わると挟まる → シャッターで無力化', () => {
  const b = new Shuuyou({ pos: { x: 15, z: -4 }, storage: { minX: 14.3, maxX: 19.5, minZ: -9.2, maxZ: 0.8 } }); b.wake();
  b.startAttack('charge', [], { x: 18, z: -4 }); b.atk.phase = 'active'; b.atk.t = 0; b.atk.dir = { x: 1, z: 0 };
  let stuck = false; for (let i = 0; i < 120 && !stuck; i++) { const o = b.update(1 / 60, sense(0, 0)); if (o.events.some(e => e.t === 'stuck')) stuck = true; }
  assert.ok(stuck); assert.equal(b.state, 'stuck');
  const ev = []; assert.equal(b.shut(ev), true); assert.equal(b.resolution, 'neutralize'); assert.equal(b.immune(), true);
});
t('相棒：足跡をたどってついてくる・敵が近いと隠れる・静かになると戻る', () => {
  const c = new CompanionBrain({ x: 0, z: 0, mode: 'follow' });
  for (let i = 0; i < 20; i++) c.crumb({ x: 0, z: -i * 0.5 });
  const o = c.update(1 / 60, { player: { x: 0, z: -10, yaw: Math.PI, speed: 2 }, enemies: [], hideSpots: [] }); assert.ok(o.move && o.move.z < 0);
  const o2 = c.update(1 / 60, { player: { x: 0, z: -10, yaw: Math.PI }, enemies: [{ id: 'k', x: 1, z: -2, hostile: true }], hideSpots: [{ x: -3, z: 4 }, { x: 0.5, z: -2.5 }] });
  assert.equal(c.mode, 'hide'); assert.deepEqual(c.hide, { x: -3, z: 4 }); assert.ok(o2.events.some(e => e.t === 'hide'));
  for (let i = 0; i < 200; i++) c.update(1 / 60, { player: { x: 0, z: -10, yaw: Math.PI }, enemies: [], hideSpots: [] });
  assert.equal(c.mode, 'follow');
});
t('相棒：背中側の予兆・赤い予兆を声で知らせる（間をあけて）', () => {
  const c = new CompanionBrain({ x: 0, z: 2, mode: 'follow' });
  const o = c.update(1 / 60, { player: { x: 0, z: 0, yaw: 0 }, enemies: [{ id: 'k', x: 0, z: -2, hostile: true, tele: 'parry' }], hideSpots: [] });
  assert.ok(o.events.some(e => e.t === 'warn' && e.key === 'warn_behind'));
  const o2 = c.update(1 / 60, { player: { x: 0, z: 0, yaw: 0 }, enemies: [{ id: 'k', x: 0, z: 2, hostile: true, tele: 'red' }], hideSpots: [] });
  assert.equal(o2.events.filter(e => e.t === 'warn').length, 0);
});
t('相棒：つかまれる → 助けると信頼 +5／放っておくと自分で逃げて信頼 −5', () => {
  const c = new CompanionBrain({ mode: 'follow', trust: 50 });
  assert.equal(c.grabbedBy('k'), true); assert.equal(c.grabbedBy('k2'), false); assert.equal(c.rescued(), true); assert.equal(c.trust, 55); assert.equal(c.mode, 'follow');
  c.grabbedBy('k'); let esc = false; for (let i = 0; i < 60 * 9; i++) { const o = c.update(1 / 60, { player: { x: 9, z: 9 }, enemies: [] }); if (o.events.some(e => e.t === 'escaped')) esc = true; }
  assert.ok(esc); assert.equal(c.trust, 50);
});
console.log(`shinshoku-p3-combat: ${n} ok`);
