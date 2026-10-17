// 『境界侵食』P13 キャラクター（動きの自然さ・ポリゴンの気持ち悪さ）：歩き・走りのクリップ（charkit/anim/clips）とその仕組み（loco.js・locodriver.js）、
// 足の滑り・ひざのはね・周期の継ぎ目・歩幅と速さ・骨盤と肩・腕の遅れ・止まりの一歩・戦闘のこま（変わらない）・法線のなめらかさ・揺れ物（髪が流れ切らない）
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };

const THREE = await import('three');
const LO = await import('../charkit/anim/loco.js');
const { LocoDriver } = await import('../charkit/anim/locodriver.js');
const { CLIPS, PERSONALITY } = await import('../charkit/anim/clips/index.js');
const { loadClipJson } = await import('../tools/charkit/build_clips.mjs');
const M = await import('../charkit/anim/metrics.js');
const H = await import('../shinshoku/actor/heroes.js');
const A = await import('../shinshoku/actor/anim.js');
const A8 = await import('../shinshoku/actor/anim8.js');
const { Poser } = await import('../shinshoku/actor/rig.js');
const { COMBAT } = await import('../shinshoku/data/combat.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const L = LO.legDims({ leg: 0.86, thigh: 0.4, shin: 0.385, hipX: 0.085 });
const SPEEDS = [0.8, 1.3, 2.2, 3.2, 5.0, 6.5];
const D2R = Math.PI / 180;

// ───────── データ ─────────
await t('クリップ：JSON（正本）と写し（index.js）が同じ・形（位相・事象・重みの範囲・キーの並び）', () => {
  const { clips, pers } = loadClipJson();
  assert.deepEqual(CLIPS, clips, 'charkit/anim/clips/index.js は JSON から作り直す（node tools/charkit/build_clips.mjs）');
  assert.deepEqual(PERSONALITY, pers);
  assert.deepEqual(CLIPS.order, ['loco.walk', 'loco.jog', 'loco.run', 'loco.sprint']);
  for (const id of CLIPS.order) {
    const c = CLIPS[id];
    assert.equal(c.kind, 'locomotionCycle'); assert.equal(c.humanoid, 'vrm1'); assert.equal(c.formatVer, 1);
    assert.deepEqual(c.events.map(e => [e.t, e.u]), [['LeftFootDown', 0], ['RightFootDown', 0.5]]);
    for (const [name, keys] of Object.entries(c.tracks)) {
      assert.ok(keys.length >= 1, id + ' ' + name);
      for (let i = 0; i < keys.length; i++) { assert.ok(keys[i][0] >= 0 && keys[i][0] < 1, id + ' ' + name + ' u'); if (i) assert.ok(keys[i][0] > keys[i - 1][0], id + ' ' + name + ' 並び'); assert.ok(Math.abs(keys[i][1]) <= 1.0001, id + ' ' + name + ' 値は -1..1'); }
    }
    for (const k of ['knee']) assert.ok(c[k][0][0] === 0 && c[k][c[k].length - 1][0] === 1, id + ' ' + k + ' は立脚の 0..1');
    assert.ok(c.blend[0] <= c.speed.ref && c.speed.ref <= c.blend[1] + 1e-9, id + ' 基準の速さは重みの範囲の中');
  }
  for (const ch of ['dannoura', 'white', 'companion', 'daughter']) assert.ok(PERSONALITY[ch], '性格 ' + ch);
});
await t('周期の補間：継ぎ目なし（u=0 と u=1 で同じ値・同じ傾き）・キーを通る', () => {
  const keys = [[0.06, -1], [0.31, 0], [0.56, 1], [0.81, 0]];
  for (const [u, v] of keys) assert.ok(Math.abs(LO.samplePeriodic(keys, u) - v) < 1e-9);
  const e = 1e-5;
  assert.ok(Math.abs(LO.samplePeriodic(keys, 0) - LO.samplePeriodic(keys, 1 - 1e-12)) < 1e-6);
  const d0 = (LO.samplePeriodic(keys, e) - LO.samplePeriodic(keys, -e)) / (2 * e), d1 = (LO.samplePeriodic(keys, 1 + e) - LO.samplePeriodic(keys, 1 - e)) / (2 * e);
  assert.ok(Math.abs(d0 - d1) < 1e-3, '傾きも続く');
});

// ───────── 周期・歩幅 ─────────
await t('歩幅と速さ：歩数（1 秒）・歩幅は速さとともに増える／歩き 1.3m/s は 1.9〜2.4 歩・走り 5m/s は 2.7〜3.2 歩／位相の速さ×歩幅＝2π', () => {
  let pc = 0, ps = 0;
  for (const v of [0.5, 0.8, 1.3, 1.8, 2.2, 2.6, 3.2, 4, 5, 6.5]) {
    const c = LO.cadence(v), s = LO.strideLen(v);
    // 歩幅は増え続ける。歩数は歩き → 走りの切り替わりで少し下がる（人も同じ：走り出すと歩幅が伸びる）だけ
    assert.ok(c >= pc - 0.35 && s > ps, `${v}m/s 歩数 ${c.toFixed(2)} 歩幅 ${s.toFixed(2)}`); pc = c; ps = s;
    assert.ok(Math.abs(LO.phaseRate(v) * s - 2 * Math.PI) < 1e-9);
    assert.ok(Math.abs(s - 2 * v / c) < 1e-9, '歩幅 ＝ 2v ÷ 歩数');
  }
  assert.ok(LO.cadence(1.3) >= 1.9 && LO.cadence(1.3) <= 2.4, '歩き ' + LO.cadence(1.3));
  assert.ok(LO.cadence(5) >= 2.7 && LO.cadence(5) <= 3.2, '走り ' + LO.cadence(5));
  // 体が大きいと歩幅が伸び、歩数は減る（フルード数）
  assert.ok(LO.strideLen(2, 1.2) > LO.strideLen(2, 1) && LO.cadence(2, 1.2) < LO.cadence(2, 1));
  // 前の名前（anim8.js）でも同じ
  assert.ok(Math.abs(A8.heroPhaseRate(1.6) * A8.strideLen(1.6) - 2 * Math.PI) < 1e-9);
});

function poseSeries(v, pers = 'dannoura', N = 240) {
  const out = [];
  for (let i = 0; i <= N; i++) out.push(LO.locoPose(Math.PI / 2 + i / N * 2 * Math.PI, v, { dims: L, pers }));
  return out;
}
const JN = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
const qOf = e => LO.qEuler(e[0], e[1], e[2]);
await t('周期の継ぎ目：1 周期の最後と最初が同じ・1/240 周期ごとの骨の回りに飛び（はね）が無い', () => {
  for (const v of SPEEDS) {
    const P = poseSeries(v);
    for (const j of JN) {
      assert.ok(M.quatAngleDeg(qOf(P[0][j]), qOf(P[P.length - 1][j])) < 0.05, `${v}m/s ${j} 継ぎ目`);
      const steps = []; for (let i = 1; i < P.length; i++) steps.push(M.quatAngleDeg(qOf(P[i - 1][j]), qOf(P[i][j])));
      let d2 = 0; for (let i = 1; i < steps.length; i++) d2 = Math.max(d2, Math.abs(steps[i] - steps[i - 1]));
      // 足の向きが裏返る・腰が急に落ちるなどの飛び（前の版の実測：28〜82°）を見つける
      assert.ok(Math.max(...steps) <= 10 && d2 <= 8, `${v}m/s ${j} 最大の 1 段 ${Math.max(...steps).toFixed(2)}° 2 階 ${d2.toFixed(2)}°`);
    }
    const hs = P.map(p => p.hipsY);
    assert.ok(Math.abs(hs[0] - hs[hs.length - 1]) < 1e-6);
  }
});

// FK（three の骨）で 60Hz に進めて足の点・ひざを測る
function simulate(build, v, pers, frames = 300) {
  const m = build(); const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {});
  const Ld = m.legDims, tr = { lt: [], lh: [], rt: [], rh: [] }, fr = []; let ph = 0, z = 0;
  for (let i = 0; i < frames; i++) {
    z += v / 60; ph += v / 60 * LO.phaseRate(v, m.legScale, LO.personality(pers));
    poser.apply(LO.locoPose(ph, v, { dims: Ld, scale: m.legScale, pers }), 1);
    g.position.z = z; g.updateMatrixWorld(true);
    if (i < 30) continue;
    for (const [s, F] of [['l', m.J.leftFoot], ['r', m.J.rightFoot]]) {
      const toe = new THREE.Vector3(0, -Ld.ankleY, Ld.ball).applyMatrix4(F.matrixWorld), heel = new THREE.Vector3(0, -Ld.ankleY, -Ld.heel).applyMatrix4(F.matrixWorld);
      tr[s + 't'].push([i / 60, toe.x, toe.y, toe.z]); tr[s + 'h'].push([i / 60, heel.x, heel.y, heel.z]);
    }
    const q = n => { const Q = m.J[n].quaternion; return [Q.x, Q.y, Q.z, Q.w]; };
    const hp = new THREE.Vector3(); m.J.hips.getWorldPosition(hp);
    fr.push({ q: Object.fromEntries(JN.map(n => [n, q(n)])), hipY: hp.y });
  }
  return { slide: M.footSlide(tr), fr };
}
await t('足の滑り（13 §1.1）：だんのうら・白い姿・相棒の 0.8〜6.5m/s で平均 ≤2cm/s・p95 ≤5cm/s・めり込み／浮き ≤2cm', () => {
  for (const [build, pers] of [[H.buildDannouraV2, 'dannoura'], [H.buildDannouraWhiteV2, 'white'], [H.buildCompanionV2, 'companion']]) for (const v of SPEEDS) {
    const { slide: r } = simulate(build, v, pers, 240);
    assert.ok(r.contactFrames > 40, `${pers} ${v} 着いているこま ${r.contactFrames}`);
    assert.ok(r.meanCmS <= 2 && r.p95CmS <= 5, `${pers} ${v}m/s 平均 ${r.meanCmS.toFixed(2)} p95 ${r.p95CmS.toFixed(2)}`);
    assert.ok(r.maxPenCm <= 2 && r.maxFloatCm <= 2, `${pers} ${v}m/s めり込み ${r.maxPenCm.toFixed(2)} 浮き ${r.maxFloatCm.toFixed(2)}`);
  }
});
await t('ひざのはね：60Hz で曲げの速さ ≤40°/こま・2 階の差 ≤40°/こま²・伸びすぎ（負の曲げ）なし（前の手続きの歩きは 2.2m/s で 51°/こま）', () => {
  for (const v of SPEEDS) {
    const { fr } = simulate(H.buildDannouraV2, v, 'dannoura', 200);
    for (const side of ['left', 'right']) {
      const k = M.kneePop(M.kneeSeries(fr, side));
      assert.ok(k.maxVelDeg <= 40 && k.maxAccDeg <= 40, `${v}m/s ${side} 速さ ${k.maxVelDeg.toFixed(1)} 2 階 ${k.maxAccDeg.toFixed(1)}`);
      assert.ok(k.minDeg >= 1.5, `${v}m/s ${side} 最小の曲げ ${k.minDeg.toFixed(1)}°`);
    }
  }
});
await t('腰の上下：歩きは片脚の真ん中で高く着地の後で低い・1.3m/s で 2〜7cm（前は 2.2m/s で 15cm）・走りは ≤10cm', () => {
  for (const v of [1.3, 2.2]) {
    const P = poseSeries(v, 'dannoura', 96), h = P.map(p => p.hipsY);
    const range = (Math.max(...h) - Math.min(...h)) * 100;
    assert.ok(range >= 2 && range <= (v < 2 ? 7 : 9), `${v}m/s ${range.toFixed(1)}cm`);
    const g = P[0]._gait, iMid = Math.round(g.stance * 0.45 * 96), iLow = Math.round(0.04 * 96);
    assert.ok(h[iMid] > h[iLow] + 0.015, `${v}m/s 片脚の真ん中（${h[iMid].toFixed(3)}）＞着地の後（${h[iLow].toFixed(3)}）`);
  }
  for (const v of [3.2, 5, 6.5]) { const h = poseSeries(v, 'dannoura', 96).map(p => p.hipsY); assert.ok((Math.max(...h) - Math.min(...h)) * 100 <= 10, `${v}m/s`); }
});
await t('骨盤と肩：着地の脚の側の腰が前（骨盤の回り）・胸は逆に回る・腰は立脚の側へ寄る・頭は前を向いたまま', () => {
  for (const v of [1.3, 2.2, 5]) {
    const P = poseSeries(v, 'dannoura', 96);
    assert.ok(P[0].hips[1] < -0.02, `${v} 左のかかとが着く時、骨盤の回り（y）は負＝左の腰が前 ${P[0].hips[1].toFixed(3)}`);
    assert.ok(P[48].hips[1] > 0.02, `${v} 右のかかと`);
    const pel = P.map(p => p.hips[1]), ch = P.map(p => p.hips[1] + p.spine[1] + p.chest[1]);
    assert.ok(M.corr(pel, ch) < -0.9, `${v} 胸の世界の回りは骨盤と逆 ${M.corr(pel, ch).toFixed(2)}`);
    const head = P.map(p => p.hips[1] + p.spine[1] + p.chest[1] + p.neck[1] + p.head[1]);
    assert.ok(M.range(head) < M.range(pel) * 0.5, `${v} 頭の回りは骨盤の半分より小さい`);
    const st = P[0]._gait.stance, iL = Math.round(st * 0.45 * 96);
    assert.ok(P[iL].hipsT[0] > 0, `${v} 左の立脚の真ん中で腰は左（+x）へ`);
  }
});
await t('腕：反対の脚と逆に振る（左腕は右のかかとが着く頃に前）・前へ大きく後ろへ小さく・ひじは肩より遅れて曲がる', () => {
  for (const v of [1.3, 2.2, 5]) {
    const P = poseSeries(v, 'dannoura', 120);
    const arm = P.map(p => p.leftUpperArm[0]), elbow = P.map(p => p.leftLowerArm[0]);
    const iMinArm = arm.indexOf(Math.min(...arm));                                 // いちばん前（x が負）
    const u = iMinArm / 120;
    assert.ok(u > 0.45 && u < 0.7, `${v} 左腕がいちばん前の位相 ${u.toFixed(2)}（右のかかと 0.5 の少し後）`);
    assert.ok(-Math.min(...arm) > Math.max(...arm) - 0.02, `${v} 前の振り ${(-Math.min(...arm) * 57.3).toFixed(0)}° ＞ 後ろ`);
    const lag = M.lagOf(arm.map(x => -x), elbow.map(x => -x), 30).lag;
    assert.ok(lag > 0, `${v} ひじの遅れ ${lag}/120 周期`);
  }
});

// ───────── つなぎ（係）─────────
await t('動き出し・止まり：止まると足の目標を運ぶ「止まりの一歩」（立っている足は動かない）・前へ行き過ぎて戻る・1.5 秒で落ち着く', () => {
  const d = new LocoDriver({ dims: L, pers: 'dannoura' });
  let ph = 0; const hist = [];
  for (let i = 0; i < 260; i++) {
    const sp = i < 30 ? 0 : i < 150 ? 2.2 : 0;
    if (i === 30) ph = d.startPhase(sp);
    ph += sp / 60 * d.rate();
    const p = d.update(1 / 60, { speed: sp, phase: ph, time: i / 60 });
    hist.push({ p, lean: d.lean.x, mode: d.mode });
  }
  assert.equal(hist[100].mode, 'loco'); assert.equal(hist[200].mode, 'idle');
  // 止まった瞬間に着いていた足（低い方）は、もう一方の足が運ばれる間は動かない。後で動く時は持ち上げる（滑らせない）
  const at = hist[150].p._feetT, low = at[0].y <= at[1].y ? 0 : 1;
  let movedEarly = 0; for (let i = 151; i < 162; i++) { const f = hist[i].p._feetT[low], g = hist[i - 1].p._feetT[low]; movedEarly += Math.hypot(f.x - g.x, f.z - g.z); }
  const other = Math.hypot(hist[161].p._feetT[1 - low].x - at[1 - low].x, hist[161].p._feetT[1 - low].z - at[1 - low].z);
  assert.ok(movedEarly <= 0.01, `着いていた足の前半の動き ${(movedEarly * 100).toFixed(1)}cm（運ぶ足 ${(other * 100).toFixed(1)}cm）`);
  for (let i = 151; i < 178; i++) { const f = hist[i].p._feetT[low], g = hist[i - 1].p._feetT[low]; if (Math.hypot(f.x - g.x, f.z - g.z) > 0.004) assert.ok(f.y > L.ankleY + 0.004 || g.y > L.ankleY + 0.004, `${i} 動く足は持ち上げる（滑らない）`); }
  const leanAfter = hist.slice(150, 175).map(h => h.lean);
  assert.ok(Math.max(...leanAfter) > 0.01, '止まると前へ行き過ぎる ' + Math.max(...leanAfter).toFixed(3));
  assert.ok(Math.abs(hist[259].lean) < 0.01, '落ち着く');
  for (const h of hist) for (const j of JN) assert.ok(h.p[j].every(Number.isFinite), j);
  // 動き出し・止まりの間もひざが「ぽん」と折れない（1 こま ≤30°）
  for (const v of [1.2, 2.2, 5]) {
    const dd = new LocoDriver({ dims: L, pers: 'dannoura' }); let ph2 = 0, prev = null, mx = 0;
    for (let i = 0; i < 170; i++) { const sp = i < 20 || i > 100 ? 0 : v; if (i === 20) ph2 = dd.startPhase(sp); ph2 += sp / 60 * dd.rate(); const p = dd.update(1 / 60, { speed: sp, phase: ph2, time: i / 60 }); const k = [p.leftLowerLeg[0], p.rightLowerLeg[0]]; if (prev) mx = Math.max(mx, Math.abs(k[0] - prev[0]) * 57.3, Math.abs(k[1] - prev[1]) * 57.3); prev = k; }
    assert.ok(mx <= 30, `${v}m/s 動き出し・止まりのひざ ${mx.toFixed(1)}°/こま`);
  }
  // 動き出しの位相：左が立脚の真ん中
  const u = ((d.startPhase(2.2) - Math.PI / 2) / (2 * Math.PI)) % 1;
  assert.ok(u > 0.1 && u < 0.4, '動き出しの位相 ' + u.toFixed(2));
});
await t('待機：両足を地面に置く（足の目標の高さ＝休みの足首）・重心の左右の移り・ひざは伸び切らない', () => {
  for (const tt of [0, 1.7, 3.3, 5.1]) {
    const p = LO.idlePose(tt, { dims: L, pers: 'dannoura' });
    for (const f of p._feetT) assert.ok(Math.abs(f.y - L.ankleY) < 1e-9);
    for (const s of ['left', 'right']) assert.ok(p[s + 'LowerLeg'][0] > 0.03 && p[s + 'LowerLeg'][0] < 0.45, s + ' ひざ ' + (p[s + 'LowerLeg'][0] * 57.3).toFixed(1));
    assert.ok(p._planted && p._exactLegs);
  }
  const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(tt => LO.idlePose(tt, { dims: L }).hipsT[0]);
  assert.ok(M.range(xs) > 0.01, '重心の左右の移り');
});
await t('姿勢の混ぜ（anim.js の mix・add）は印（_exactLegs・_feet…）を混ぜない（NaN の骨にしない）', () => {
  const p = LO.locoPose(1, 2.2, { dims: L });
  const q = A.mix(p, { rightUpperArm: [-1, 0, 0] }, 0.5);
  for (const k of Object.keys(q)) assert.ok(k[0] !== '_', k);
  for (const [k, v] of Object.entries(q)) if (Array.isArray(v)) assert.ok(v.every(Number.isFinite), k);
  assert.ok(Array.isArray(q.hipsT));
});

// ───────── 戦闘 ─────────
await t('戦闘のこまの一致（変わらない）：歩きの係の姿勢の上でも、刀の弱・強は startup で構え終わり startup＋active で振り抜く', () => {
  const d = new LocoDriver({ dims: L, pers: 'dannoura' });
  for (const sp of [0, 2.2]) for (const [atk, step] of [[COMBAT.katana.light[0], 0], [COMBAT.katana.light[1], 1], [COMBAT.katana.light[2], 2], [COMBAT.katana.heavy, 8]]) {
    const P = [];
    for (let f = 0; f < atk.startup + atk.active + atk.recovery; f++) {
      const basePose = d.update(1 / 60, { speed: sp, phase: f * 0.1, time: f / 60 });
      P.push(A.dannouraPose({ st: { name: 'attack', atk, step, f }, f, w: 'katana', speed: sp, phase: f * 0.1, time: f / 60, loco: { ik: true }, basePose }).pose);
    }
    const ra = f => P[f].rightUpperArm;
    const a0 = ra(atk.startup - 1), a1 = ra(atk.startup + atk.active - 1), after = ra(atk.startup + atk.active);
    assert.ok(Math.hypot(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]) > 0.5, '振りがある ' + step);
    assert.ok(Math.hypot(after[0] - a1[0], after[1] - a1[1], after[2] - a1[2]) < 0.25, '振り抜いた後は戻りだけ ' + step);
    for (const p of P) assert.ok(!p._exactLegs, '攻撃の姿勢は脚も補間する');
  }
  for (const k of ['startup', 'active', 'recovery']) assert.deepEqual(COMBAT.katana.light.map(a => a[k]), [[6, 8, 10], [4, 4, 4], [14, 16, 22]][['startup', 'active', 'recovery'].indexOf(k)], '刀の弱の数字は前と同じ');
  assert.deepEqual([COMBAT.katana.heavy.startup, COMBAT.katana.heavy.active, COMBAT.katana.heavy.recovery], [18, 6, 26]);
});

// ───────── 形・法線 ─────────
await t('法線のなめらかさ：同じ位置・同じ材質の頂点（部品の継ぎ目）の法線が一致する（輪郭線の割れ・段の陰影の筋が出ない）', () => {
  for (const build of [H.buildDannouraV2, H.buildDannouraWhiteV2, H.buildCompanionV2, H.buildDaughterV2]) {
    const m = build(), g = m.mesh.geometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.mcls;
    const map = new Map(); let pairs = 0, bad = 0;
    for (let i = 0; i < P.count; i++) {
      const k = Math.round(P.getX(i) / 6e-4) + ',' + Math.round(P.getY(i) / 6e-4) + ',' + Math.round(P.getZ(i) / 6e-4) + ',' + C.getX(i);
      const j = map.get(k);
      if (j == null) { map.set(k, i); continue; }
      const d = N.getX(i) * N.getX(j) + N.getY(i) * N.getY(j) + N.getZ(i) * N.getZ(j);
      if (d > 0.26) { pairs++; if (d < Math.cos(3 * D2R)) bad++; }
    }
    assert.ok(pairs > 50, m.kind + ' 継ぎ目の頂点 ' + pairs);
    assert.ok(bad / pairs < 0.02, `${m.kind} 継ぎ目で法線がずれる割合 ${(bad / pairs * 100).toFixed(1)}%`);
  }
});
await t('法線のなめらかさ：頭の髪の法線は頭の形の向きに寄る（房ごとの面のぎざぎざを消す）・顔は形の向きから大きく外れない', () => {
  const m = H.buildDannouraV2(), g = m.mesh.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, C = g.attributes.mcls;
  const hair = m.table.index('hair'), face = m.table.index('face'), head = m.skeleton.bones.findIndex(b => b.name === 'head');
  const hc = new THREE.Vector3(); m.root.updateMatrixWorld(true);
  m.J.head.getWorldPosition(hc); hc.y += 0.122 * 0.9;
  const dev = cls => { const a = []; for (let i = 0; i < P.count; i++) { if (C.getX(i) !== cls || SI.getX(i) !== head) continue; const r = new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i)).sub(hc).normalize(); a.push(Math.acos(Math.max(-1, Math.min(1, r.dot(new THREE.Vector3(N.getX(i), N.getY(i), N.getZ(i)))))) * 57.3); } a.sort((x, y) => x - y); return { n: a.length, p90: a[Math.floor(a.length * 0.9)] }; };
  const h = dev(hair), f = dev(face);
  assert.ok(h.n > 500 && h.p90 < 40, `髪 ${h.n} 頂点 p90 ${h.p90.toFixed(1)}°`);
  assert.ok(f.n > 500 && f.p90 < 40, `顔 ${f.n} 頂点 p90 ${f.p90.toFixed(1)}°`);
});
await t('揺れ物：歩く（2.2m/s）だけでポニーテールが横に流れ切らない（下向きから 60° 以内）・走ると後ろへ流れる', () => {
  const ang = v => {
    const m = H.buildDannouraV2(); const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {}); let z = 0, ph = 0;
    for (let i = 0; i < 240; i++) { z += v / 60; ph += v / 60 * LO.phaseRate(v); poser.apply(LO.locoPose(ph, v, { dims: m.legDims, pers: 'dannoura' }), 1); g.position.z = z; g.updateMatrixWorld(true); m.update(1 / 60); }
    const ch = m.springs.chains.find(c => c.name === 'ponytail'), j = ch.joints[ch.joints.length - 1], j0 = ch.joints[0];
    const head = new THREE.Vector3(); j0.b.getWorldPosition(head);
    const d = j.tail.clone().sub(head).normalize();
    return Math.acos(-d.y) * 57.3;
  };
  const w = ang(2.2), r = ang(5);
  assert.ok(w < 60, '歩き ' + w.toFixed(0) + '°');
  assert.ok(r > w, '走り ' + r.toFixed(0) + '° ＞ 歩き');
});

console.log(`shinshoku-p13-motion: ${n} ok`);
