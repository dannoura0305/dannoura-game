// 『境界侵食』2026-11-20：重面と静養を病院（第3章）に置く。ENEMY_AI_SPEC §2.2（重面）・§2.3（静養）の状態機械・置き場所・調べる所・台詞
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { AREA_DATA } from '../shinshoku/data/areas.js';
import { Seiyou, seiyouPoseState } from '../shinshoku/ai/seiyou.js';
import { Omoomote } from '../shinshoku/ai/omoomote.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const src = f => readFileSync(new URL('../shinshoku/' + f, import.meta.url), 'utf8');
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };
const far = { player: { x: 30, z: 30, noise: 'none' }, los: false };

// ── 静養 ──
t('静養：眠ったまま動かない。遠くの歩く音では起きない', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 }, yaw: Math.PI / 2 });
  const ev = run(s, { player: { x: 5, z: 0, noise: 'walk' }, los: true }, 3);
  assert.equal(s.state, 'sleep'); assert.ok(!ev.some(e => e.t === 'telegraph')); assert.deepEqual(s.pos, { x: 0, z: 0 });
});
t('静養：廊下の走る音で半身を起こし、何もなければ眠り直す', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 } });
  let ev = run(s, { player: { x: 5, z: 0, noise: 'run' }, los: false }, 0.2);
  assert.equal(s.state, 'rise'); assert.ok(ev.some(e => e.t === 'say' && e.key === 'seiyou_rise'));
  run(s, far, 3.2); assert.equal(s.state, 'sleep');
});
t('静養：近づいた者には見定めの後に腕を伸ばす（白・弾ける）・点滴の管（赤・つかみ）。ベッドから動かない', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 }, yaw: 0 });
  const ev = run(s, { player: { x: 0, z: 1.4, noise: 'walk' }, los: true }, 8);
  assert.ok(ev.some(e => e.t === 'hostile'));
  const tel = ev.filter(e => e.t === 'telegraph').map(e => e.name);
  assert.ok(tel.includes('arm') && tel.includes('tube'), tel.join(','));
  assert.equal(ENEMIES.seiyou.attacks.arm.parryable, true); assert.equal(ENEMIES.seiyou.attacks.tube.grab, true);
  assert.deepEqual(s.pos, { x: 0, z: 0 }, 'ベッドから離れない');
});
t('静養：届かない所の相手には攻めず、離れて少し経つと眠り直す', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 } }); s.hostileBy = 'gun'; s.go('hostile', []);
  const ev = run(s, { player: { x: 0, z: 7, noise: 'walk' }, los: true }, 5);
  assert.ok(!ev.some(e => e.t === 'telegraph')); assert.equal(s.state, 'sleep');
});
t('静養：銃声で起こされると同じ部屋の仲間を起こす（wakeGroup）。仲間は起きて攻める', () => {
  const a = new Seiyou({ id: 'a', pos: { x: 0, z: 0 }, room: '303' }), b = new Seiyou({ id: 'b', pos: { x: 0, z: 3 }, room: '303' });
  const ev = run(a, { player: { x: 6, z: 0, noise: 'walk' }, los: true, gunshot: { x: 6, z: 0 } }, 0.1);
  assert.equal(a.state, 'hostile'); assert.ok(ev.some(e => e.t === 'wakeGroup'));
  assert.equal(b.wakeGroup([], { x: 6, z: 0 }), true); assert.equal(b.state, 'hostile');
  assert.equal(b.wakeGroup([], { x: 6, z: 0 }), false, '起きている者は二度起こさない');
});
t('静養：白衣の名札の者は「看護の人」（攻めない）', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 }, yaw: 0 });
  const ev = run(s, { player: { x: 0, z: 1.2, noise: 'walk' }, los: true, nurse: true }, 4);
  assert.equal(s.state, 'nurse'); assert.ok(ev.some(e => e.t === 'misread' && e.as === 'nurse')); assert.ok(!ev.some(e => e.t === 'telegraph'));
});
t('静養：救う＝ナースコール（深く眠る・攻撃を受けない）／無力化＝照明（戦っている者は眠らない）', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 } });
  const ev = []; assert.equal(s.rescueSleep(ev), true); assert.equal(s.resolution, 'rescue'); assert.equal(s.state, 'rest'); assert.ok(ev.some(e => e.t === 'rescued'));
  assert.equal(s.hurt(10, 'slash', []), 0, '深く眠っている者には当たらない');
  const s2 = new Seiyou({ id: 's2', pos: { x: 0, z: 0 } }); assert.equal(s2.lightsOff([]), true); assert.equal(s2.resolution, 'neutralize');
  const s3 = new Seiyou({ id: 's3', pos: { x: 0, z: 0 } }); s3.go('hostile', []); assert.equal(s3.lightsOff([]), false);
});
t('静養：寝ている者を倒すと killedAsleep（相棒の台詞が変わる）', () => {
  const s = new Seiyou({ id: 's', pos: { x: 0, z: 0 } });
  const ev = []; s.hurt(999, 'slash', ev); assert.equal(s.state, 'dead'); assert.ok(ev.some(e => e.t === 'killedAsleep'));
});
t('静養の姿勢：眠る（sleep）・攻めの予兆（reach）・起きた姿', () => {
  assert.equal(seiyouPoseState({ state: 'sleep' }), 'sleep'); assert.equal(seiyouPoseState({ state: 'rest' }), 'sleep');
  assert.equal(seiyouPoseState({ state: 'hostile', atk: { phase: 'windup' } }), 'reach'); assert.equal(seiyouPoseState({ state: 'rise' }), 'awake');
});

// ── 重面 ──
const stops = [{ x: 0, z: 0, look: { x: 1, z: 0 } }, { x: 0, z: -4 }, { x: 0, z: -8, look: { x: 1, z: -8 } }];
t('重面：鏡・窓の前で立ち止まり（台詞）、通り道の点は止まらずに次へ', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops });
  let ev = run(o, far, 0.2); assert.equal(o.sub, 'mirror'); assert.ok(ev.some(e => e.t === 'say' && e.key === 'omoomote_mirror'));
  ev = run(o, far, ENEMIES.omoomote.mirrorStay + 6); assert.ok(o.pos.z < -6, '次の鏡へ歩く（通り道の点を抜ける）');
});
t('重面：正面の顔は数秒ごとに入れ替わる。入れ替わる間は見切り（chainable）', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops, face: 1 }); o.faceT = 0;
  const ev = run(o, far, ENEMIES.omoomote.faceEvery + 0.1);
  const sw = ev.find(e => e.t === 'faceswap'); assert.ok(sw); assert.equal(sw.face, 'scream'); assert.equal(o.chainable, true);
  run(o, far, ENEMIES.omoomote.swap + 0.05); assert.equal(o.chainable, false);
});
t('重面：知り合いの顔（kin）の時は見つけても攻めない（取り違え）', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops, face: 0 }); o.faceT = 0;
  const ev = run(o, { player: { x: 0, z: 2, noise: 'walk' }, los: true }, 2.0);
  assert.ok(ev.some(e => e.t === 'misread' && e.as === 'kin')); assert.ok(!ev.some(e => e.t === 'telegraph'));
});
t('重面：顔ごとに違う攻撃（噛みつき＝白・叫び・抱きつき＝赤のつかみ）', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops, face: 1 }); o.faceT = -99;   // 顔を噛みつきのまま
  o.hostileBy = 'attacked'; o.lastSeen = { x: 0, z: 1.2 }; o.lastSeenT = 0; o.go('hostile', []);
  let ev = run(o, { player: { x: 0, z: 1.2, noise: 'walk' }, los: true }, 1.5);
  assert.equal(ev.find(e => e.t === 'telegraph').name, 'bite');
  const o2 = new Omoomote({ id: 'o2', pos: { x: 0, z: 0 }, stops, face: 3 }); o2.faceT = -99; o2.hostileBy = 'attacked'; o2.go('hostile', []);
  ev = run(o2, { player: { x: 0, z: 1.2, noise: 'walk' }, los: true }, 1.5);
  const tel = ev.find(e => e.t === 'telegraph'); assert.equal(tel.name, 'hug'); assert.equal(tel.parryable, false);
  assert.equal(ENEMIES.omoomote.attacks.bite.parryable, true); assert.equal(ENEMIES.omoomote.attacks.hug.grab, true);
});
t('重面：知り合いの顔の間は、戦っていても攻めない', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops, face: 0 }); o.faceT = -99; o.hostileBy = 'attacked'; o.go('hostile', []);
  const ev = run(o, { player: { x: 0, z: 1.2, noise: 'walk' }, los: true }, 2); assert.ok(!ev.some(e => e.t === 'telegraph'));
});
t('重面：救う＝写真を見せる（座り込む・攻撃を受けない）／無力化＝相棒に呼んでもらう → ずれている間に縛る', () => {
  const o = new Omoomote({ id: 'o', pos: { x: 0, z: 0 }, stops });
  const ev = []; assert.equal(o.showPhoto(ev), true); assert.equal(o.resolution, 'rescue'); assert.equal(o.state, 'rest'); assert.equal(o.hurt(10, 'slash', []), 0);
  const o2 = new Omoomote({ id: 'o2', pos: { x: 0, z: 0 }, stops });
  assert.equal(o2.bind([]), false, 'ずれていない時は縛れない');
  assert.equal(o2.called([]), true); assert.equal(o2.state, 'slip'); assert.equal(o2.chainable, true);
  assert.equal(o2.bind([]), true); assert.equal(o2.resolution, 'neutralize'); assert.equal(o2.state, 'rest');
  const o3 = new Omoomote({ id: 'o3', pos: { x: 0, z: 0 }, stops }); o3.called([]); run(o3, far, ENEMIES.omoomote.slip + 0.1); assert.equal(o3.state, 'loop', 'ずれは数秒で戻る');
});

// ── 置き場所・つなぎ ──
t('病院の置き場所：静養 2 床（303 号室の中）・重面 2 体（鏡・窓の前の点を持つ・個体差）', () => {
  const H = AREA_DATA.hospital;
  assert.equal(H.seiyou.length, 2);
  for (const s of H.seiyou) { assert.equal(s.room, '303'); assert.ok(s.pos[0] > -12 && s.pos[0] < -2 && s.pos[1] > -19 && s.pos[1] < -13, s.id); }
  assert.equal(H.omoomote.length, 2); assert.ok(H.omoomote.some(o => o.body === 'skirt'));
  for (const o of H.omoomote) assert.ok(o.stops.filter(s => s.look).length >= 2, o.id + '：立ち止まる鏡・窓が 2 つ以上');
});
t('つなぎ：第3章で出す・照明のスイッチで静養も眠る・名簿とナースコールの調べる所・選択肢・体の包みの先読み', () => {
  const c3 = src('game/ch3.js'), main = src('main.js'), a3 = src('world/areas3.js'), cb = src('game/combat.js');
  assert.match(c3, /this\.spawnSeiyou\(add, H\.seiyou/); assert.match(c3, /this\.spawnOmoomote\(add, H\.omoomote/);
  assert.match(c3, /e\.kind === 'kanja' \|\| e\.kind === 'seiyou'\) \{ const ev = \[\]; if \(e\.brain\.lightsOff/);
  for (const k of ['roster', 'nursecall', 'omophoto', 'omocall', 'omobind']) assert.match(c3, new RegExp(`case '${k}'`), k);
  assert.match(a3, /kind: 'roster'/); assert.match(a3, /kind: 'nursecall'/);
  assert.match(main, /extraSpots3/); assert.match(main, /hospital: \[[^\]]*'seiyou', 'omoomote', 'omoomote_skirt'\]/);
  assert.match(cb, /case 'wakeGroup'/); assert.match(cb, /e\.kind === 'seiyou' \|\| e\.kind === 'omoomote'\) \{\n?/);
});
t('台詞と調べた時の文がそろっている', () => {
  for (const k of ['seiyou_rise', 'seiyou_nurse', 'seiyou_group', 'seiyou_killed_asleep', 'omoomote_mirror', 'omoomote_kin', 'omoomote_swap', 'omoomote_call', 'omoomote_photo']) assert.ok(events.barks[k], k);
  for (const k of ['hosp_roster', 'hosp_roster_done', 'hosp_nursecall', 'hosp_nursecall_done', 'hosp_nursecall_busy']) assert.ok(events.texts[k], k);
  assert.ok(events.speakers.seiyou && events.speakers.omoomote);
  for (const k of ['seiyou', 'omoomote']) assert.equal(ENEMIES[k].provisional, true, k);
});
console.log(`shinshoku-hospital-omoseiyou: ${n} 件 OK`);
