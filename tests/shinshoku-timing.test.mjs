// 『境界侵食』判定の窓・持ち替え・戦闘の状態機械（COMBAT_SYSTEM_SPEC §3・§7・§8）
import assert from 'node:assert/strict';
import { windows, judgeDodge, judgeParry, issenOpen } from '../shinshoku/combat/timing.js';
import { swapFrames, isQuickShot } from '../shinshoku/combat/switch.js';
import { Fighter } from '../shinshoku/combat/fighter.js';
import { COMBAT, f2ms } from '../shinshoku/data/combat.js';

let n = 0; const t = (name, fn) => { fn(); n++; };

t('ジャスト回避の窓（ふつう 0〜8f）の境目', () => {
  const w = windows('normal');
  const table = { 0: 'just', 7: 'just', 8: 'just', 9: 'iframe', 14: 'iframe', 15: 'hit', 23: 'hit' };
  for (const [f, r] of Object.entries(table)) assert.equal(judgeDodge(+f, w), r, `f=${f}`);
});
t('難しさ・タッチ・手助けで窓が変わる', () => {
  assert.equal(windows('easy').just, 12); assert.equal(windows('hard').just, 6);
  assert.equal(windows('normal', { touch: true }).just, 10);
  assert.equal(windows('hard', { touch: true }).just, 8);
  assert.equal(windows('normal', { assist: true }).just, 12);
  assert.equal(judgeDodge(9, windows('hard')), 'iframe');
  assert.equal(judgeDodge(11, windows('easy')), 'just');
});
t('パリィ：発生の 6f 前〜2f 後', () => {
  const w = windows('normal');
  // delta = 発生 − 入力
  assert.equal(judgeParry(6, w), 'parry'); assert.equal(judgeParry(0, w), 'parry'); assert.equal(judgeParry(-2, w), 'parry');
  assert.equal(judgeParry(7, w), 'early'); assert.equal(judgeParry(-3, w), 'late');
  assert.equal(judgeParry(10, windows('easy')), 'parry'); assert.equal(judgeParry(5, windows('hard')), 'early');
});
t('一閃の窓', () => {
  const w = windows('normal');
  assert.ok(issenOpen('mikiri', 21, w)); assert.ok(!issenOpen('mikiri', 22, w));
  assert.ok(issenOpen('hajiki', 24, w)); assert.ok(!issenOpen('hajiki', 25, w));
  assert.ok(issenOpen('utsu', 30, w)); assert.ok(!issenOpen('utsu', 31, w));
});
t('持ち替えの時間（150ms・切替撃ち 67ms・撃った直後 200ms・重い武器 300〜450ms）', () => {
  assert.equal(swapFrames('katana', 'handgun'), 9); assert.equal(f2ms(9), 150);
  assert.equal(swapFrames('handgun', 'katana'), 9);
  assert.equal(swapFrames('katana', 'handgun', { recoveryFrame: 8 }), 4); assert.equal(f2ms(4), 67);
  assert.equal(swapFrames('katana', 'handgun', { recoveryFrame: 7 }), 9);
  assert.equal(swapFrames('handgun', 'katana', { sinceFire: 10 }), 12); assert.equal(f2ms(12), 200);
  assert.equal(swapFrames('handgun', 'katana', { sinceFire: 40 }), 9);
  const p = swapFrames('katana', 'pipe'), m = swapFrames('handgun', 'matchlock');
  assert.ok(p >= 18 && p <= 27 && m >= 18 && m <= 27 && m >= p, `${p} ${m}`);
  assert.ok(isQuickShot(8) && !isQuickShot(7) && !isQuickShot(undefined));
});

// ── 状態機械 ──
const run = (F, frames, inp = {}) => { const all = []; for (let i = 0; i < frames; i++) all.push(...F.tick(typeof inp === 'function' ? inp(i) : inp)); return all; };
const kinds = evs => evs.map(e => e.t);

t('刀の3段：発生 6/8/10f と戻り', () => {
  const F = new Fighter();
  let evs = F.tick({ attack: true });
  assert.ok(kinds(evs).includes('attackStart'));
  evs = run(F, 6); assert.ok(kinds(evs).includes('active'));
  const firstActive = evs.find(e => e.t === 'active'); assert.equal(firstActive.frame, 6, '1段目の判定は 6f 後');
  // 戻り中に攻撃 → 2段目
  evs = run(F, 1, { attack: true }); evs.push(...run(F, 6));
  assert.ok(evs.some(e => e.t === 'attackStart' && e.step === 1));
  evs = run(F, 1, { attack: true }); evs.push(...run(F, 60));
  assert.ok(evs.some(e => e.t === 'attackStart' && e.step === 2));
  assert.equal(F.name, 'free');
});
t('回避 24f・連続回避は 2 回まで（3 回目に硬直）', () => {
  const F = new Fighter();
  F.tick({ dodge: true }); assert.equal(F.name, 'dodge');
  run(F, 23); run(F, 1); assert.equal(F.name, 'free');
  F.tick({ dodge: true }); run(F, 24); const e3 = F.tick({ dodge: true });
  assert.ok(e3.some(e => e.t === 'dodge' && e.lag === 12), JSON.stringify(e3));
});
t('ジャスト回避 → 見切り一閃（窓の中の攻撃）', () => {
  const F = new Fighter();
  F.tick({ dodge: true }); run(F, 4);                           // 回避開始から 5f
  const r = F.incoming({ src: 'e1', dmg: 10, parryable: true, inRange: true });
  assert.equal(r, 'just');
  const ev = F.drain(); assert.ok(kinds(ev).includes('just') && kinds(ev).includes('slow'));
  run(F, 10);
  const evs = run(F, 1, { attack: true }).concat(run(F, 40));
  const is = evs.find(e => e.t === 'issen'); assert.ok(is && is.kind === 'mikiri' && is.target === 'e1');
  assert.ok(evs.some(e => e.t === 'issenStrike' && e.dmg === COMBAT.issen.mikiri.dmg));
  assert.equal(F.hp, 100);
});
t('見切りの窓を過ぎると一閃にならない', () => {
  const F = new Fighter();
  F.tick({ dodge: true }); run(F, 2);
  F.incoming({ src: 'e1', dmg: 10, parryable: true, inRange: true }); F.drain();
  run(F, 40);
  const evs = run(F, 1, { attack: true }).concat(run(F, 3));
  assert.ok(!evs.some(e => e.t === 'issen'));
});
t('回避の 9f 目以降は無敵（ジャストではない）・15f 以降は当たる', () => {
  const F = new Fighter(); F.tick({ dodge: true }); run(F, 10);
  assert.equal(F.incoming({ src: 'e', dmg: 10, parryable: false, inRange: true }), 'evade');
  const G = new Fighter(); G.tick({ dodge: true }); run(G, 16);
  assert.equal(G.incoming({ src: 'e', dmg: 10, parryable: false, inRange: true }), 'hit'); assert.equal(G.hp, 90);
});
t('パリィ（前）→ 弾き一閃', () => {
  const F = new Fighter();
  F.tick({ parry: true }); run(F, 3);
  assert.equal(F.incoming({ src: 'e2', dmg: 12, parryable: true, inRange: true }), 'parry');
  assert.ok(kinds(F.drain()).includes('parry'));
  run(F, 5);
  const evs = run(F, 1, { attack: true }).concat(run(F, 30));
  assert.ok(evs.some(e => e.t === 'issen' && e.kind === 'hajiki' && e.target === 'e2'));
  assert.equal(F.hp, 100);
});
t('パリィ（後 2f）：被弾の保留から成功', () => {
  const F = new Fighter();
  assert.equal(F.incoming({ src: 'e3', dmg: 12, parryable: true, inRange: true }), 'pending');
  F.tick({}); const evs = F.tick({ parry: true });
  assert.ok(evs.some(e => e.t === 'parry'), JSON.stringify(evs)); assert.equal(F.hp, 100);
});
t('パリィ（遅すぎ）は当たる・早すぎは半分', () => {
  const F = new Fighter();
  F.incoming({ src: 'e', dmg: 12, parryable: true, inRange: true }); const evs = [...F.tick({}), ...F.tick({}), ...F.tick({}), ...F.tick({ parry: true })];
  assert.ok(!evs.some(e => e.t === 'parry'));
  assert.ok(evs.some(e => e.t === 'hurt')); assert.equal(F.hp, 88);
  const G = new Fighter(); G.tick({ parry: true }); run(G, 10);
  assert.equal(G.incoming({ src: 'e', dmg: 12, parryable: true, inRange: true }), 'guard'); assert.equal(G.hp, 94);
});
t('弾けない攻撃（赤い予兆）はパリィで受けられない', () => {
  const F = new Fighter(); F.tick({ parry: true }); run(F, 2);
  assert.equal(F.incoming({ src: 'e', dmg: 20, parryable: false, inRange: true }), 'hit'); assert.equal(F.hp, 80);
});
t('居合：長押し 36f で構え → 攻撃が届くと抜刀一閃', () => {
  const F = new Fighter();
  const evs = run(F, 40, { heavy: true });
  assert.ok(evs.some(e => e.t === 'iaiReady'));
  assert.equal(F.incoming({ src: 'e4', dmg: 20, parryable: false, inRange: true }), 'iai');
  assert.ok(F.drain().some(e => e.t === 'issen' && e.kind === 'iai'));
  assert.ok(run(F, 10).some(e => e.t === 'issenStrike' && e.kind === 'iai'));
});
t('居合の空振りは 30f の硬直・強攻撃（18f 長押し）', () => {
  const F = new Fighter(); run(F, 40, { heavy: true });
  let k = 0; F.tick({}); while (F.name !== 'free' && k < 100) { F.tick({}); k++; }
  assert.ok(k >= 30 + 5 - 2, `硬直 ${k}f`);
  const G = new Fighter(); run(G, 20, { heavy: true }); const e = G.tick({});
  assert.ok(e.some(x => x.t === 'attackStart' && x.heavy));
});
t('拳銃：構え 6f・連射 15f・弾倉 12・装填 84f', () => {
  const F = new Fighter({ weapon: 'handgun', mag: 2, ammo: 10 });
  run(F, 6, { aim: true });
  let evs = F.tick({ aim: true, attack: true }); assert.ok(evs.some(e => e.t === 'shot' && e.aimed));
  evs = run(F, 5, i => ({ aim: true, attack: i === 2 })); assert.ok(!evs.some(e => e.t === 'shot'), '連射の間隔');
  evs = run(F, 12, { aim: true }).concat(F.tick({ aim: true, attack: true }));
  assert.ok(evs.some(e => e.t === 'shot')); assert.equal(F.mag, 0);
  evs = run(F, 20, { aim: true }).concat(F.tick({ aim: true, attack: true }));
  assert.ok(evs.some(e => e.t === 'dry')); assert.equal(F.name, 'reload');
  evs = run(F, 84); assert.ok(evs.some(e => e.t === 'reloadDone')); assert.equal(F.mag, 10); assert.equal(F.ammo, 0);
});
t('持ち替え：刀→銃 9f（構えると自動）・切替撃ち 4f で1発目', () => {
  const F = new Fighter();
  let evs = F.tick({ swap: true }); const s = evs.find(e => e.t === 'swapStart'); assert.equal(s.frames, 9);
  evs = run(F, 9); const d = evs.find(e => e.t === 'swapDone'); assert.ok(d); assert.equal(F.weapon, 'handgun');
  assert.equal(d.frame - s.frame, 9);
  // 刀の 1 段目の戻り 8f 目で構え → 4f で撃つ
  const G = new Fighter(); G.tick({ attack: true }); run(G, 10 + 8);
  evs = G.tick({ aim: true }); const q = evs.find(e => e.t === 'swapStart'); assert.ok(q, JSON.stringify(evs)); assert.equal(q.frames, 4);
  evs = run(G, 4, { aim: true }); const shot = evs.find(e => e.t === 'shot'); assert.ok(shot && shot.quick);
  assert.equal(shot.frame - q.frame, 4);
});
t('撃ち一閃：弱点に当てた後 30f 以内の攻撃', () => {
  const F = new Fighter({ weapon: 'handgun' }); F.markWeakHit('e5'); run(F, 10);
  const evs = run(F, 1, { attack: true }); assert.ok(evs.some(e => e.t === 'issen' && e.kind === 'utsu')); assert.equal(F.weapon, 'katana');
});
t('被弾の無敵 30f・体力 0 で倒れる', () => {
  const F = new Fighter({ hp: 30 });
  F.incoming({ src: 'e', dmg: 20, parryable: false, inRange: true });
  assert.equal(F.incoming({ src: 'e', dmg: 20, parryable: false, inRange: true }), 'invuln');
  run(F, 31); F.incoming({ src: 'e', dmg: 20, parryable: false, inRange: true }); assert.ok(F.dead);
});
console.log(`shinshoku-timing: ${n} ok`);
