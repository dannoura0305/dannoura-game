// 『境界侵食』Q-horror（じわじわ型の演出）：data/horror.js の純粋な関数と、異形の動き（足の滑り・倒れ方・首の傾き・届いた動きの順番）。
// ・ちらつき：明かりごとに非同期（揃って瞬かない）・消灯 0.05〜0.12 秒・ふだん 4〜15 秒・時々 1.5〜3 秒消えたまま
// ・足の滑り：立脚の間の足の動き（帰路・患者・模倣する影・収容者・待人・守り手）が基準（≤15cm/s・速い時は速さの 12%）以内。前は 35〜100%（40〜140cm/s）
// ・倒れ方：ひざが抜ける → 前へ崩れて手をつく → 止まる → 指が 1 回 ／ 首：2〜4 秒止めて急に傾ける ／ 届いた動き：3〜7 秒・同じ物が続かない
import assert from 'node:assert/strict';
await import('../tools/shinshoku/audit/node_env.mjs');
const H = await import('../shinshoku/data/horror.js');
const { EnemyActor } = await import('../shinshoku/actor/actors.js');
const A = await import('../shinshoku/actor/anim.js');
const A6 = await import('../shinshoku/actor/anim6.js');
const M = await import('../shinshoku/actor/models.js');
const M3 = await import('../shinshoku/actor/models3.js');
const M6 = await import('../shinshoku/actor/models6.js');
const { GRADES, gradeAt } = await import('../shinshoku/data/envgrade.js');
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };

await t('ちらつき：明かりごとに非同期・消灯は 0.05〜0.12 秒（1〜3 回）・ふだん 4〜15 秒・時々 1.5〜3 秒消えたまま', () => {
  const dt = 1 / 60, N = 60 * 600, ids = ['c2', 'c4', 'lob2', 'ceil2', 'm3'];
  const F = ids.map(id => new H.Flicker(H.hash32(id)));
  const off = ids.map(() => []), runs = ids.map(() => []), ons = ids.map(() => []);
  const cur = ids.map(() => ({ k: 1, len: 0 }));
  for (let i = 0; i < N; i++) F.forEach((f, j) => {
    const k = f.step(dt); off[j].push(k === 0);
    const c = cur[j]; if (k === c.k) c.len += dt; else { (c.k === 0 ? runs : ons)[j].push(c.len); c.k = k; c.len = dt; }
  });
  for (let j = 0; j < ids.length; j++) {
    const r = runs[j]; assert.ok(r.length > 40, ids[j] + ' 消灯の回数 ' + r.length);
    const short = r.filter(x => x < 0.5), long = r.filter(x => x >= 0.5);
    assert.ok(short.every(x => x >= 0.05 - dt && x <= 0.12 + 2 * dt), ids[j] + ' 短い消灯 ' + Math.min(...short) + '〜' + Math.max(...short));
    assert.ok(long.length >= 1 && long.every(x => x >= 1.5 - dt && x <= 3 + 2 * dt), ids[j] + ' 消えたまま ' + long.map(x => x.toFixed(2)));
    const lon = ons[j].slice(1).filter(x => x > 1);   // 始めの 1 回は種でずらした長さ assert.ok(lon.every(x => x >= 4 - dt && x <= 15 + 2 * dt), ids[j] + ' ふだん ' + Math.min(...lon).toFixed(1) + '〜' + Math.max(...lon).toFixed(1));
  }
  // 非同期：2 つの明かりの「消え始め」が 0.1 秒以内に重なる割合が小さい（前の式は全部が同じ sin(t·7.3) で揃っていた）
  const starts = off.map(a => a.map((v, i) => v && !a[i - 1] ? i : -1).filter(i => i >= 0));
  let near = 0, tot = 0; for (const s of starts[0]) { tot++; if (starts[1].some(q => Math.abs(q - s) <= 6)) near++; }
  assert.ok(near / tot < 0.15, '揃って消える割合 ' + (near / tot).toFixed(2));
  const both = off[0].filter((v, i) => v && off[1][i]).length / N; assert.ok(both < 0.01, '同時に消えている割合 ' + both);
  // 消えた瞬間のきっかけ（音）：1 回ずつ
  const f = new H.Flicker(7); let e = 0; for (let i = 0; i < 3600; i++) { f.step(dt); if (f.takeEdge()) e++; } assert.ok(e > 5 && !f.takeEdge());
});

await t('暗さの組：区画と場所（病院の受付／病棟・発生後のアーケード）・消灯の倍率・色の調整（彩度 0.7〜0.75）', () => {
  assert.equal(H.horrorKey('shotengai', 0, -30, false), null, '序章のふだんのアーケードは暗くしない');
  assert.equal(H.horrorKey('shotengai', 0, -30, true), 'arcade_out');
  assert.equal(H.horrorKey('shotengai', 40, 20, true), null, '住宅地はそのまま');
  assert.equal(H.horrorKey('hospital', 0, 15), 'hospital_lobby'); assert.equal(H.horrorKey('hospital', 0, -10), 'hospital_ward'); assert.equal(H.horrorKey('hospital', 0, 25), null);
  assert.equal(H.horrorKey('abyss', 0, 0), null); assert.equal(H.horrorKey('epilogue', 0, 0), null);
  for (const [k, p] of Object.entries(H.HORROR_LIGHT)) { assert.ok(p.hemi < 1.1 && p.amb < 0.6 && p.key < 1.4 && p.rim <= 0.5 && p.vig >= 0.3 && p.vig <= 0.75, k); }
  assert.ok(H.HORROR_LIGHT.hospital_ward.hemi < H.HORROR_LIGHT.hospital_lobby.hemi);
  assert.equal(H.darkMul(0), 1); assert.equal(H.darkMul(1), 0.5);
  for (const k of ['hospital', 'tunnel', 'oldwing', 'kiroku', 'admin']) assert.ok(GRADES[k].sat >= 0.7 && GRADES[k].sat <= 0.75 && GRADES[k].contrast >= 1.15, k);
  assert.equal(gradeAt('shotengai', 0, -30, null, true).key, 'arcade_out'); assert.equal(gradeAt('shotengai', 0, -30, null, false).key, 'arcade');
  assert.ok(GRADES.arcade_out.sat < GRADES.arcade.sat);
});

await t('首の「止める → 急に傾ける」：2〜4 秒止まる・0.12 秒で動く・異形ごとにずれる', () => {
  const dt = 0.01; let prev = H.twitch(0, 5), moving = 0, holds = [], hold = 0;
  for (let i = 1; i < 6000; i++) { const v = H.twitch(i * dt, 5); if (Math.abs(v - prev) > 1e-6) { moving += dt; if (hold > 0.5) holds.push(hold); hold = 0; } else hold += dt; prev = v; }
  assert.ok(moving / 60 < 0.08, '動いている割合 ' + (moving / 60).toFixed(3));
  assert.ok(holds.length > 10 && holds.every(h => h >= 1.8 && h <= 4.1), '止まる長さ ' + Math.min(...holds).toFixed(2) + '〜' + Math.max(...holds).toFixed(2));
  assert.ok(Math.abs(H.twitch(30, 1)) <= 0.175 + 1e-9);
  let diff = 0; for (let i = 0; i < 100; i++) if (Math.abs(H.twitch(i * 0.6, 1) - H.twitch(i * 0.6, 2)) > 0.01) diff++; assert.ok(diff > 60, '種でずれる ' + diff);
});

await t('届いた動きの順番：長さ 3〜7 秒・前と同じ動きが続かない・始めの 0.4 秒は止まる', () => {
  let last = null, lastIdx = -1, segs = [], start = 0;
  for (let i = 0; i < 20000; i++) { const tt = i * 0.01, s = H.clipSchedule(tt, 99, 3); if (s.idx !== lastIdx || (last && s.lt < last.lt - 1)) { if (lastIdx >= 0) segs.push([lastIdx, tt - start]); start = tt; } lastIdx = s.idx; last = s; }
  assert.ok(segs.length > 20);
  for (let i = 1; i < segs.length; i++) { assert.notEqual(segs[i][0], segs[i - 1][0], '同じ動きが続かない'); }
  assert.ok(segs.slice(1).every(([, d]) => d >= 2.99 && d <= 7.01), segs.map(s => s[1].toFixed(1)).join(','));
  // 区切りの直後 0.3 秒は lt＝0（最初の形で止まる）
  for (let tt = 1; tt < 120; tt += 0.37) { const s0 = H.clipSchedule(tt, 99, 3), start = tt - s0.lt - 0.4; if (s0.lt > 0 && start >= 0) assert.equal(H.clipSchedule(start + 0.3, 99, 3).lt, 0); }
});

await t('倒れ方の姿勢：ひざが抜ける（0.25 秒）→ 前へ崩れて手をつく（0.7 秒）→ 止まる → 指が 1 回（1.3 秒）', () => {
  const p0 = H.collapsePose(0).pose, p1 = H.collapsePose(0.25).pose, p2 = H.collapsePose(0.7).pose, p3 = H.collapsePose(1.1).pose, pf = H.collapsePose(1.42).pose, p4 = H.collapsePose(2.5).pose;
  assert.ok(!(p0.hipsY < -0.01));
  assert.ok(p1.hipsY <= -0.29 && p1.leftLowerLeg[0] > 0.9, 'ひざが抜ける');
  assert.ok(p2.hipsY < -0.7 && p2.spine[0] > 0.9 && p2.rightUpperArm[0] < -1.1, '崩れて手をつく');
  assert.deepEqual(p3, H.collapsePose(1.25).pose, '止まる（間）');
  assert.ok(pf.rightHand[0] < p3.rightHand[0] - 0.2, '指（手首）が動く'); assert.deepEqual(p4.rightHand, p3.rightHand, '戻る');
  const k = H.collapsePose(0.7, 'kiro').pose; assert.ok(k.rightUpperArm[0] < -1.5, '帰路は戸へ手を伸ばす');
  for (const kd of ['kiro', 'kanja', 'mimic', 'machibito']) assert.ok(H.COLLAPSE_KINDS.includes(kd));
});

// 足の滑り：本物の体（コードの形）と姿勢の関数で、EnemyActor.gaitRate の位相の速さのとき、立脚の間の足の動き（cm/s）
const brainOf = (id, kind, state) => ({ id, kind, pos: { x: 0, z: 0 }, yaw: 0, state, t: 1, sub: 'walk', atk: null, def: { attacks: {} }, alive: true });
export const SLIDE_CASES = [
  ['帰路（歩き）', 'kiro', 'loop', 1.4, () => M.buildKiro(0x8a8aa0), null],
  ['帰路（怒り）', 'kiro', 'hostile', 3.5, () => M.buildKiro(0x8a8aa0), null],
  ['記録のない患者', 'kanja', 'loop', 1.0, () => M3.buildKanja(1), A.kanjaPose],
  ['模倣する影', 'mimic', 'hostile', 1.4, () => M3.buildMimicShadow({ seed: 3 }), A.mimicPose],
  ['収容者', 'shuuyou', 'hostile', 1.6, () => M.buildShuuyou(), A.shuuyouPose],
  ['待人', 'machibito', 'loop', 1.0, () => M6.buildMachibito(1), A6.machibitoPose],
  ['守り手', 'mamori', 'guard', 0.8, () => M3.buildMamori(), A.mamoriPose],
];
const LIM = sp => Math.max(15, sp * 100 * 0.12);   // 歩き 15cm/s・速い時は速さの 12%（3.5m/s で 42cm/s）。前は 35〜100%
await t('足の滑り：立脚の間の足の動き ≤15cm/s（速い時は速さの 12%。前は 35〜100%）・模倣する影と守り手は歩くと脚が動く', () => {
  const rows = [];
  for (const [name, kind, state, sp, mk, fn] of SLIDE_CASES) {
    const e = new EnemyActor(brainOf('t_' + kind, kind, state), mk()); if (fn) e.poseFn = fn;
    const rate = e.gaitRate(sp), L = e.legLens, f = e.poseFn || A.kiroPose;
    const poseAt = (ph, tt = 0) => A.withPlanted(() => f({ state, t: 1 + tt, sub: 'walk', speed: sp, phase: ph, atk: null, time: tt, seed: e.seed }).pose);
    const slide = H.stanceSlide(poseAt, sp, rate, L[0], L[1]) * 100;
    const poseOld = ph => f({ state, t: 1, sub: 'walk', speed: sp, phase: ph, atk: null, time: 0, seed: e.seed }).pose;   // 前の歩き（sin の立脚）
    const old = H.stanceSlide(poseOld, sp, A.phaseRate(sp, kind === 'shuuyou' ? 0.95 : 0.85), L[0], L[1]) * 100;
    rows.push(`${name} ${sp}m/s：${old.toFixed(0)} → ${slide.toFixed(1)}cm/s`);
    rows.bad = rows.bad || []; if (!(slide <= LIM(sp))) rows.bad.push(name + ' ' + slide.toFixed(1));
    const a = poseAt(0).leftUpperLeg[0], b = poseAt(Math.PI / 2).leftUpperLeg[0]; assert.ok(Math.abs(a - b) > 0.05, name + '：脚が動く');
  }
  console.log('    ' + rows.join('\n    '));
  assert.ok(!rows.bad || !rows.bad.length, String(rows.bad));
});

await t('止まって動く：go と stop を交互に（長さは ±30%）', () => {
  const st = {}, r = H.rng(3); let go = 0, stop = 0, sw = 0, prev = null;
  for (let i = 0; i < 6000; i++) { const g = H.stopGo(st, 1 / 60, { go: 1.2, stop: 0.4 }, r); if (g) go++; else stop++; if (prev !== null && g !== prev) sw++; prev = g; }
  const ratio = go / (go + stop); assert.ok(ratio > 0.68 && ratio < 0.82, ratio); assert.ok(sw > 80 && sw < 140, sw);
});

console.log(`shinshoku-horror: ${n} passed`);
