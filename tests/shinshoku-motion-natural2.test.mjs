// 境界侵食：前回（shinshoku-motion-natural）の残り（2026-11-09・利用者の依頼「進めてください」）。
// 確かめること：
//  ・攻撃の踏み込みの足（charkit/anim/limbik.js StepPlanter）：体が前へ出ても、床に着いた足は滑らない（一歩ずつ踏み出す）。
//  ・クリップ → 手続きへ移るこまで骨が T ポーズへ跳ばない（three.js の mixer は止めた動きの骨を元の値へ戻す：強攻撃の溜めで腕が V 字に開いていた）
//  ・両手持ち（GripIK）：左手首が武器の握る所へ届く
//  ・鉄パイプの振りは腰と胸をひねって踏み込む・拳銃は撃つと反動で跳ねる
//  ・相棒（瀬名 灯里）がついて歩く：速さを少しずつ変える（前は 1 こまで 0 ⇄ 2.4m/s：止まる・歩き出すを 10 秒で 20 回くり返し、そのたびに足が滑った）
//  ・戦闘の数値（こま数・踏み込みの距離・無敵とジャストの受付）は変えない
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined) }) }) };
const origWarn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('VRMLookAtQuaternionProxy')) origWarn(...a); };

const THREE = await import('three');
const ROOT = new URL('../', import.meta.url);
const P = p => new URL(p, ROOT);
const buf = p => { const b = readFileSync(P(p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const readJson = p => JSON.parse(readFileSync(P(p), 'utf8'));
const { loadVRMModel } = await import('../charkit/runtime/vrmrt.js');
const { loadClipSet } = await import('../charkit/runtime/vrma.js');
const { ClipAnimator } = await import('../charkit/anim/clipanim.js');
const { StepPlanter, GripIK, twoBoneIK } = await import('../charkit/anim/limbik.js');
const { COMBAT } = await import('../shinshoku/data/combat.js');
const A = await import('../shinshoku/actor/anim.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const stubTex = l => { l.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) })); l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) })); };

await t('戦闘の数値は前のまま（刀・鉄パイプのこま数と踏み込み・回避の無敵とジャスト・拳銃）', () => {
  assert.deepEqual(COMBAT.katana.light.map(a => [a.startup, a.active, a.recovery, a.lunge]), [[6, 4, 14, 0.6], [8, 4, 16, 0.6], [10, 4, 22, 1.6]]);
  assert.deepEqual([COMBAT.katana.heavy.startup, COMBAT.katana.heavy.active, COMBAT.katana.heavy.recovery, COMBAT.katana.heavy.lunge], [18, 6, 26, 1.0]);
  assert.deepEqual(COMBAT.pipe.light.map(a => [a.startup, a.active, a.recovery, a.lunge]), [[12, 6, 24, 0.4], [14, 6, 28, 0.6]]);
  assert.deepEqual([COMBAT.pipe.heavy.startup, COMBAT.pipe.heavy.active, COMBAT.pipe.heavy.recovery], [22, 6, 30]);
  const D = COMBAT.dodge; assert.deepEqual([D.total, D.iStart, D.iEnd, D.just, D.dist], [24, 3, 14, 8, 4.1]);
  assert.deepEqual([COMBAT.handgun.aimIn, COMBAT.handgun.interval, COMBAT.handgun.hip], [6, 15, 4]);
});
await t('鉄パイプ：振りかぶりで腰と胸を後ろへひねり、振り抜きで逆へ・前の脚を踏み込む（刀と同じ考え方）', () => {
  for (const P of [...A.PIPE_ATK, A.PIPE_HEAVY]) { assert.ok(P.a.hips && P.b.hips, '腰'); assert.ok(P.b.hipsY <= -0.1, '腰を落とす'); }
  for (const P of A.PIPE_ATK) assert.ok(Math.sign(P.a.spine[1]) === -Math.sign(P.b.spine[1]) && Math.abs(P.a.spine[1] - P.b.spine[1]) > 0.6, 'ひねり');
});
await t('拳銃：構えたまま撃つと 1〜2 こまで腕と手首が跳ね上がり、10 こまで戻る（前は撃っても動かなかった）', () => {
  const st = { name: 'free', f: 0 }, base = { st, f: 0, w: 'handgun', speed: 0, phase: 0, time: 0, aiming: true };
  const still = A.dannouraPose(Object.assign({}, base, { fireAgo: 99 })).pose, kick = A.dannouraPose(Object.assign({}, base, { fireAgo: 1 })).pose, back = A.dannouraPose(Object.assign({}, base, { fireAgo: 10 })).pose;
  assert.ok(kick.rightUpperArm[0] < still.rightUpperArm[0] - 0.1, '跳ねる'); assert.ok(kick.rightHand[0] < -0.2, '手首');
  assert.ok(Math.abs(back.rightUpperArm[0] - still.rightUpperArm[0]) < 1e-9, '戻る');
});

await t('相棒がついて歩く（歩き 2.2 → 走り 5.0 → 止まる）：歩き出しは 1〜2 回・1 こまの速さの変わりは 0.35m/s 以下（前は 20 回・2.4m/s）', async () => {
  const { CompanionBrain } = await import('../shinshoku/ai/companion.js');
  const { followSpeed } = await import('../shinshoku/actor/actors.js');
  const c = new CompanionBrain({ x: 0, z: -2.2, mode: 'follow' });
  let pz = 0, starts = 0, moving = false, jump = 0, prev = 0, v = 0, last = null; const dt = 1 / 60;
  for (let i = 0; i < 600; i++) {
    const pv = i < 240 ? 2.2 : i < 420 ? 5.0 : 0; pz += pv * dt;
    if (i % 3 === 0) c.crumb({ x: 0, z: pz });
    const o = c.update(dt, { player: { x: 0, z: pz, yaw: 0, speed: pv }, enemies: [], hideSpots: [] });
    v = followSpeed(v, o.move ? o.move.speed : 0, dt); let sp = v;
    if (o.move) { const dx = o.move.x - c.pos.x, dz = o.move.z - c.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { last = [dx / L, dz / L]; sp = Math.max(0.3, v); const m = Math.min(L, sp * dt); c.pos.x += last[0] * m; c.pos.z += last[1] * m; } }
    else if (v > 0.05 && last) { c.pos.x += last[0] * v * dt; c.pos.z += last[1] * v * dt; } else sp = 0;
    if (sp > 0.08 && !moving) starts++; moving = sp > 0.08; jump = Math.max(jump, Math.abs(sp - prev)); prev = sp;
  }
  assert.ok(starts <= 2, '歩き出し ' + starts); assert.ok(jump <= 0.35, '速さの跳び ' + jump);
  assert.ok(Math.hypot(c.pos.x, c.pos.z - pz) < 3.5, 'ついてくる');
});

// VRoid のだんのうら（本物の骨）
const m = await loadVRMModel(buf('shinshoku/assets/characters/dannoura.vrm'), { height: 1.64, fit: 'none', loader: stubTex });
const cs = await loadClipSet(readJson('shinshoku/assets/anim/dannoura/clips.json'), m.vrm, { fetchBinary: async (u, f) => buf('shinshoku/assets/anim/dannoura/' + f) });
const holder = new THREE.Group(); holder.add(m.vrm.scene);
const J = m.J, L = m.legDims;
const keepAll = () => { const B = Object.values(J); return { q: B.map(b => b.quaternion.clone()), h: J.hips.position.clone(), back() { B.forEach((b, i) => b.quaternion.copy(this.q[i])); J.hips.position.copy(this.h); } }; };
const rest = keepAll();

await t('クリップ → 手続きへ移るこま：骨が T ポーズ（元の値）へ跳ばない（手続きの姿勢のまま・慣性の混ぜの差も小さい）', () => {
  rest.back();
  const CA = new ClipAnimator(m.vrm.scene, J, cs, { legDims: L, footIK: true, sceneScale: 1, ground: () => 0 });
  for (let i = 0; i < 30; i++) CA.update(1 / 60, { st: 'free', speed: 0 });
  const idleQ = J.leftUpperArm.quaternion.clone();
  // 手続きの姿勢（溜めの入り）：今の腕から少しだけ動かした所
  const proc = idleQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.2));
  J.leftUpperArm.quaternion.copy(proc);
  CA.opt.blendS = 1e-4;
  CA.update(1 / 60, { st: 'charge', f: 0 });
  const ang = J.leftUpperArm.quaternion.angleTo(proc);
  assert.ok(ang < 0.02, `手続きの姿勢とのずれ ${ang.toFixed(3)}rad（T ポーズへ跳ぶと 1 rad ほど）`);
  rest.back();
});

await t('2 本の骨の IK：届く所はほぼ正確に（1mm 以内）・届かない所は伸ばした向きへ', () => {
  rest.back(); holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
  const ft = J.leftFoot.getWorldPosition(new THREE.Vector3()), tgt = ft.clone().add(new THREE.Vector3(0.05, 0.12, 0.2));
  const knee = J.leftLowerLeg.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, 0.3));
  assert.ok(twoBoneIK(J.leftUpperLeg, J.leftLowerLeg, J.leftFoot, tgt, knee));
  assert.ok(J.leftFoot.getWorldPosition(new THREE.Vector3()).distanceTo(tgt) < 1e-3);
  assert.ok(J.leftLowerLeg.getWorldPosition(new THREE.Vector3()).z > J.leftUpperLeg.getWorldPosition(new THREE.Vector3()).z, 'ひざは前');
  rest.back();
});

/** 踏み込み：体（holder）が lunge m を n こまで前へ（前に速く・後で遅く）。姿勢は休みの姿勢のまま（体に付いた足は体と一緒に動く）。床の上の足の滑りを測る */
function lunge(lunge, frames, plant) {
  rest.back(); holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
  const S = new StepPlanter(J); const prev = {}; let sk = 0, skN = 0, mx = 0;
  const total = frames + 30;
  for (let i = 0; i < total; i++) {
    rest.back();
    const u = Math.min(1, i / frames); holder.position.z = lunge * (1 - (1 - u) * (1 - u)); holder.updateMatrixWorld(true);
    if (plant) S.update(1 / 60, { active: i < total - 8, settle: i > frames, ground: 0, body: holder.position });
    m.vrm.scene.updateMatrixWorld(true);
    for (const s of ['left', 'right']) for (const [nm, z] of [['h', -L.heel], ['b', L.ball]]) {
      const p = new THREE.Vector3(0, -L.ankleY, z).applyMatrix4(J[s + 'Foot'].matrixWorld), q = prev[s + nm];
      if (q && Math.max(p.y, q.y) < 0.02) { const v = Math.hypot(p.x - q.x, p.z - q.z) * 60; sk += v; skN++; mx = Math.max(mx, v); }
      prev[s + nm] = p;
    }
  }
  const fz = ['left', 'right'].map(s => J[s + 'Foot'].getWorldPosition(new THREE.Vector3()).z);
  rest.back();
  return { mean: skN ? sk / skN * 100 : 0, n: skN, steps: S.stats.steps, feet: fz };
}
await t('攻撃の踏み込みの足：体が 0.6m・1.6m 前へ出ても床の上の足の滑りが小さい（≤15cm/s・置かない時の 1/4 以下）・一歩ずつ踏み出して体に追いつく', () => {
  for (const [d, fr] of [[0.6, 12], [1.6, 16]]) {
    const off = lunge(d, fr, false), on = lunge(d, fr, true);
    console.log(`    ${d}m／${fr}こま：足を置かない ${off.mean.toFixed(0)}cm/s → 置く ${on.mean.toFixed(1)}cm/s（${on.steps} 歩・足の z ${on.feet.map(x => x.toFixed(2)).join(', ')}）`);
    assert.ok(on.mean <= 15 && on.mean <= off.mean / 4, `${d}m 滑り ${on.mean}`);
    assert.ok(on.steps >= 2, '歩数 ' + on.steps);
    for (const z of on.feet) assert.ok(Math.abs(z - d) < 0.25, `足が体に追いつく ${z} / ${d}`);
  }
});

await t('両手持ち（GripIK）：左手首が武器の握る所（＋右手と同じずれ）へ 2cm 以内で届く', () => {
  rest.back(); holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
  // 右腕を前へ（両手で構える形）・武器は右手の子
  const c = J.chest.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.1, -0.12, 0.25));
  twoBoneIK(J.rightUpperArm, J.rightLowerArm, J.rightHand, c, J.rightLowerArm.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.3, 0)));
  const W = new THREE.Group(); W.position.set(0.02, 0, 0); W.rotation.set(0, 0, -Math.PI / 2); J.rightHand.add(W);
  m.vrm.scene.updateMatrixWorld(true);
  // 握る所：左肩から届く所（左手首の目標＝握る所＋（右の手首 − 武器の根元））
  const want = J.leftUpperArm.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-0.1, -0.2, 0.25));
  const O0 = W.getWorldPosition(new THREE.Vector3()), R0 = J.rightHand.getWorldPosition(new THREE.Vector3());
  const gl = W.worldToLocal(want.clone().sub(R0.sub(O0))).toArray();
  const G = new GripIK(J);
  for (let i = 0; i < 30; i++) G.update(1 / 60, { want: 1, weapon: W, grip: gl });
  m.vrm.scene.updateMatrixWorld(true);
  const d = J.leftHand.getWorldPosition(new THREE.Vector3()).distanceTo(want);
  assert.ok(d < 0.02, `左手首のずれ ${(d * 100).toFixed(1)}cm`);
  J.rightHand.remove(W); rest.back();
});

console.log(`shinshoku-motion-natural2: ${n} ok`);
