// 『境界侵食』異形の状態機械（ENEMY_AI_SPEC §1.3・§2.1・§2.4）：帰路・閉店
import assert from 'node:assert/strict';
import { Kiro } from '../shinshoku/ai/kiro.js';
import { Heiten } from '../shinshoku/ai/heiten.js';
import { angleTo } from '../shinshoku/ai/brain.js';

let n = 0; const t = (name, fn) => { fn(); n++; };
const DT = 1 / 60;
// 簡易の世界：移動の意図をそのまま反映
function step(e, sense, sec) {
  const all = [];
  for (let i = 0; i < Math.round(sec / DT); i++) {
    const s = typeof sense === 'function' ? sense() : sense;
    const o = e.update(DT, s);
    if (o.move) { const dx = o.move.x - e.pos.x, dz = o.move.z - e.pos.z, L = Math.hypot(dx, dz); if (L > 1e-6) { const m = Math.min(L, o.move.speed * DT); e.pos.x += dx / L * m; e.pos.z += dz / L * m; } }
    if (o.face) e.yaw = Math.atan2(o.face.x - e.pos.x, o.face.z - e.pos.z);
    all.push(...o.events);
  }
  return all;
}
const far = { player: { x: 50, z: 50, noise: 'none' }, los: true };
const path = [{ x: 0, z: 0 }, { x: 0, z: -6 }, { x: 0, z: -12 }];

t('帰路：輪（歩く→戸を叩く→引き返す）', () => {
  const k = new Kiro({ id: 'k1', path, seed: 3 });
  const ev = step(k, far, 14);
  assert.ok(ev.filter(e => e.t === 'knock').length >= 3, '戸を叩く');
  assert.ok(ev.some(e => e.t === 'turnback'), '引き返す');
  assert.equal(k.state, 'loop');
});
t('帰路：道をふさぐ → 見定め → 敵とみなす → 予兆 → 攻撃', () => {
  const k = new Kiro({ id: 'k2', path, seed: 5 });
  const p = { x: 0.2, z: -3, noise: 'walk' };
  const ev = step(k, { player: p, los: true }, 6);
  const order = ev.filter(e => e.t === 'state').map(e => e.to);
  assert.deepEqual(order.slice(0, 2), ['assess', 'hostile']);
  assert.ok(ev.some(e => e.t === 'telegraph' && e.name === 'shove' && e.parryable));
  assert.ok(ev.some(e => e.t === 'attack' && e.name === 'shove'));
  // 予兆から攻撃判定までが windup 秒
  assert.ok(ev.findIndex(e => e.t === 'telegraph') < ev.findIndex(e => e.t === 'attack'));
});
t('帰路：道から離れた人は「無関係」→ 輪に戻る', () => {
  const k = new Kiro({ id: 'k3', path, seed: 7 });
  k.state = 'assess'; k.assessFor = 0.5; k.cause = 'block';
  const ev = step(k, { player: { x: 6, z: -3, noise: 'none' }, los: true }, 1);
  assert.ok(ev.some(e => e.t === 'state' && e.to === 'loop' && e.why === 'unrelated'));
});
t('帰路：3 回目はつかみ（弾けない）', () => {
  const k = new Kiro({ id: 'k4', path, seed: 9 });
  const ev = step(k, { player: { x: 0, z: -1.2, noise: 'walk' }, los: true }, 12);
  const tel = ev.filter(e => e.t === 'telegraph').map(e => e.name);
  assert.deepEqual(tel.slice(0, 3), ['shove', 'shove', 'grab']);
  assert.equal(ev.find(e => e.t === 'telegraph' && e.name === 'grab').parryable, false);
});
t('帰路：銃声で気づく', () => {
  const k = new Kiro({ id: 'k5', path, seed: 2 });
  const ev = step(k, { player: { x: 10, z: 10, noise: 'none' }, los: false, gunshot: { x: 10, z: 10 } }, 0.1);
  assert.ok(ev.some(e => e.t === 'notice'));
});
t('帰路：見失うと探して輪に戻る（逃げる）', () => {
  const k = new Kiro({ id: 'k6', path, seed: 4 });
  step(k, { player: { x: 0, z: -2, noise: 'walk' }, los: true }, 2.5);
  assert.equal(k.state, 'hostile');
  const ev = step(k, { player: { x: 40, z: 40, noise: 'none' }, los: false }, 20);
  assert.ok(ev.some(e => e.t === 'calm')); assert.equal(k.state, 'loop');
});
t('帰路：戸を開ける → 家族と取り違え → 家に入って眠る（救う）・二度と攻撃しない', () => {
  const k = new Kiro({ id: 'k7', path, seed: 6 });
  step(k, { player: { x: 0, z: -2, noise: 'walk' }, los: true }, 2.5);
  assert.equal(k.state, 'hostile');
  const ev = []; k.openDoor(ev);
  assert.ok(ev.some(e => e.t === 'misread' && e.as === 'family'));
  const near = { player: { x: k.pos.x + 0.5, z: k.pos.z, noise: 'run' }, los: true };
  const ev2 = step(k, () => ({ player: { x: k.pos.x + 0.6, z: k.pos.z, noise: 'run' }, los: true }), 20);
  assert.ok(ev2.some(e => e.t === 'rescued')); assert.equal(k.state, 'home'); assert.equal(k.resolution, 'rescue');
  assert.ok(!ev2.some(e => e.t === 'telegraph' || e.t === 'attack'), '救った個体は攻撃しない');
  assert.equal(k.hurt(99, 'slash'), 0, '家の中の者は傷つけられない');
  const ev3 = step(k, near, 10); assert.ok(!ev3.some(e => e.t === 'attack'));
});
t('帰路：体力 0 で倒れる（倒す）', () => {
  const k = new Kiro({ id: 'k8', path, seed: 1 });
  const ev = []; k.hurt(25, 'slash', ev); assert.equal(k.state, 'stagger'); k.hurt(25, 'slash', ev);
  assert.equal(k.state, 'dead'); assert.equal(k.resolution, 'kill'); assert.ok(ev.some(e => e.t === 'die'));
});
t('帰路：パリィされるとよろける 0.9 秒', () => {
  const k = new Kiro({ id: 'k9', path, seed: 1 }); k.state = 'hostile';
  k.parried(); assert.equal(k.state, 'stagger');
  step(k, far, 0.85); assert.equal(k.state, 'stagger'); const ev = step(k, far, 0.1); assert.ok(ev.some(e => e.t === 'state' && e.from === 'stagger' && e.to === 'hostile'));
});

// ── 閉店 ──
const st = { lights: { x: -2, z: 0 }, register: { x: 0, z: -2 }, shutter: { x: 0, z: 3 }, bow: { x: 0, z: 2.5 } };
t('閉店：手順の輪（明かり→レジ→シャッター→お辞儀→最初へ）', () => {
  const h = new Heiten({ id: 'h', stations: st, pos: { x: 0, z: 0 }, center: { x: 0, z: 0 } });
  const ev = step(h, far, 30);
  const steps = ev.filter(e => e.t === 'step').map(e => e.id);
  assert.deepEqual(steps.slice(0, 4), ['lights', 'register', 'shutter', 'bow']);
  assert.ok(ev.some(e => e.t === 'reset'));
});
t('閉店：閉店の時刻に店の中の客 → 追い出す（攻撃）。シャッターは弾けない', () => {
  const h = new Heiten({ id: 'h2', stations: st, pos: { x: 0, z: 0 }, center: { x: 0, z: 0 }, seed: 3 });
  let ev = step(h, { player: { x: 0, z: 1, noise: 'walk' }, los: true, inShop: true }, 9);
  assert.ok(!ev.some(e => e.t === 'hostile'), '開店中は客');
  ev = step(h, { player: { x: 0, z: 1, noise: 'walk' }, los: true, inShop: true }, 20);
  assert.ok(ev.some(e => e.t === 'hostile'));
  const tels = ev.filter(e => e.t === 'telegraph');
  assert.ok(tels.length >= 3);
  const sh = ev.find(e => e.t === 'telegraph' && e.name === 'shutter');
  if (sh) assert.equal(sh.parryable, false);
});
t('閉店：店から離れると追わない（逃げる）', () => {
  const h = new Heiten({ id: 'h3', stations: st, pos: { x: 0, z: 0 }, center: { x: 0, z: 0 } });
  h.state = 'hostile'; h.lastSeen = { x: 0, z: 1 }; h.lastSeenT = 0;
  const ev = step(h, { player: { x: 0, z: 20, noise: 'none' }, los: true }, 6);
  assert.ok(ev.some(e => e.t === 'calm')); assert.equal(h.state, 'loop');
});
t('閉店：手順を順番に手伝うと救える。順番違いはやり直し', () => {
  const h = new Heiten({ id: 'h4', stations: st });
  assert.equal(h.help('register'), 'wrong'); assert.equal(h.helpIdx, 0);
  assert.equal(h.help('lights'), 'ok'); assert.equal(h.help('register'), 'ok'); assert.equal(h.help('sign'), 'done');
  assert.equal(h.state, 'rest'); assert.equal(h.resolution, 'rescue');
  assert.equal(h.hurt(50, 'slash'), 0);
  const ev = step(h, { player: { x: 0, z: 1, noise: 'run' }, los: true, inShop: true }, 20);
  assert.ok(!ev.some(e => e.t === 'attack'));
});
t('閉店：倒す', () => {
  const h = new Heiten({ id: 'h5', stations: st }); const ev = [];
  for (let i = 0; i < 20 && h.alive; i++) h.hurt(10, 'slash', ev);
  assert.equal(h.state, 'dead'); assert.equal(h.resolution, 'kill');
});
t('視野：前方 100°', () => {
  assert.ok(angleTo({ x: 0, z: 0 }, 0, { x: 0, z: 5 }) < 1);
  assert.ok(Math.abs(angleTo({ x: 0, z: 0 }, 0, { x: 5, z: 0 }) - 90) < 1);
  const k = new Kiro({ path }); k.yaw = 0; k.pos = { x: 0, z: 0 };
  assert.ok(k.sees({ player: { x: 0, z: 5 }, los: true }));
  assert.ok(!k.sees({ player: { x: 0, z: -5 }, los: true }), '背後は見えない');
  assert.ok(!k.sees({ player: { x: 0, z: 5 }, los: false }), '壁の向こうは見えない');
});
console.log(`shinshoku-ai: ${n} ok`);
