// 『境界侵食』刀の鞘（2026-11-09・利用者の依頼「剣を鞘に入れずに持っているのは不自然」）と居合の削除。
// 確かめること：
//  ・普段は刀を左腰の鞘に納める（手に持たない）。攻撃・溜めの入力で抜く（抜く動きは最初の一振りの出だしの間：手の重み 1 → 0）
//  ・戦闘の動きが 3.5 秒なければ納める（短い納める動き）。ロックオン中・敵が近い間は抜いたまま。会話・演出ではすぐ納める
//  ・攻撃のこま数・当たりの出るこま・無敵とジャストの受付は、鞘があってもなくても同じ（鞘は Fighter に触らない）
//  ・鞘と納めた刀の柄・鍔が、コードの体と VRM（VRoid 製・Blender 製）の両方で実際に描かれる（前は VRM では空の組で何も無かった）・左腰にある
//  ・右手を柄へ寄せる IK（placeHeldAt）：重み 1 で手の刀が鞘の中の在り処に重なる
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };
const origWarn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('VRMLookAtQuaternionProxy')) origWarn(...a); };

const THREE = await import('three');
const ROOT = new URL('../', import.meta.url);
const buf = p => { const b = readFileSync(new URL(p, ROOT)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const { Fighter } = await import('../shinshoku/combat/fighter.js');
const { Sheath, SHEATH } = await import('../shinshoku/combat/sheath.js');
const { COMBAT } = await import('../shinshoku/data/combat.js');
const { windows } = await import('../shinshoku/combat/timing.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const stubTex = l => { l.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) })); l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) })); };
/** Fighter と鞘を 1 こまずつ（game/combat.js stepPlayer と同じ順） */
const sim = (F, S, frames, inp = () => ({}), alert = () => false) => { const evs = []; for (let i = 0; i < frames; i++) { evs.push(...F.tick(inp(i) || {})); S.tick(F, { alert: alert(i) }); } return evs; };

await t('普段は納刀・攻撃の入力で抜く（抜く手の動きは 1 段目の出だし 6f の間に 1 → 0）', () => {
  const F = new Fighter(), S = new Sheath();
  sim(F, S, 30);
  assert.equal(S.drawn, false); assert.equal(S.sheathed(F), true); assert.equal(S.inHand(F), false);
  sim(F, S, 1, () => ({ attack: true }));
  assert.equal(F.st.name, 'attack'); assert.equal(S.drawn, true); assert.equal(S.inHand(F), true);
  const ws = [S.hand(F).w]; for (let i = 0; i < 8; i++) { sim(F, S, 1); ws.push(S.hand(F).w); }
  assert.equal(ws[0], 1); assert.equal(S.hand(F).w, 0);
  for (let i = 1; i < ws.length; i++) assert.ok(ws[i] <= ws[i - 1] + 1e-9, '減っていく');
  assert.equal(ws[COMBAT.katana.light[0].startup], 0, '当たりが出るこまでは振りの姿勢そのまま');
});
await t('溜め（長押し）でも抜く・回避と被弾では抜かない', () => {
  const F = new Fighter(), S = new Sheath();
  sim(F, S, 1, () => ({ dodge: true })); sim(F, S, 30); assert.equal(S.drawn, false, '回避');
  F.incoming({ src: 'e', dmg: 5, parryable: false, inRange: true }); sim(F, S, 20); assert.equal(S.drawn, false, '被弾');
  sim(F, S, 40); sim(F, S, 1, () => ({ heavy: true })); assert.equal(F.st.name, 'charge'); assert.equal(S.drawn, true); assert.equal(S.hand(F).mode, 'draw');
});
await t('攻撃の後 3.5 秒（戦闘の動きなし）で納める（納める動き 24f → 手が戻る 14f）。ロックオン・敵が近い間は抜いたまま', () => {
  const F = new Fighter(), S = new Sheath();
  sim(F, S, 1, () => ({ attack: true })); let k = 0; while (F.st.name !== 'free' && k < 100) { sim(F, S, 1); k++; }
  assert.equal(F.st.name, 'free'); assert.equal(S.drawn, true);
  sim(F, S, Math.round(SHEATH.idleS * 60) - 2); assert.equal(S.drawn, true); assert.equal(S.hand(F).w, 0);
  sim(F, S, 4); assert.equal(S.hand(F).mode, 'sheathe'); assert.equal(S.drawn, true);
  sim(F, S, SHEATH.sheatheF); assert.equal(S.drawn, false); assert.equal(S.hand(F).mode, 'return');
  sim(F, S, SHEATH.returnF + 1); assert.equal(S.hand(F).mode, null); assert.equal(S.hand(F).w, 0);
  // 敵が近い
  const G = new Fighter(), T = new Sheath();
  sim(G, T, 1, () => ({ attack: true })); sim(G, T, 600, () => ({}), () => true); assert.equal(T.drawn, true);
  sim(G, T, Math.round(SHEATH.idleS * 60) + SHEATH.sheatheF + 2); assert.equal(T.drawn, false);
  // 納める途中に攻撃：やめて抜いたまま
  const K = new Fighter(), U = new Sheath();
  sim(K, U, 1, () => ({ attack: true })); sim(K, U, 30 + Math.round(SHEATH.idleS * 60) + 5); assert.equal(U.hand(K).mode, 'sheathe');
  sim(K, U, 1, () => ({ attack: true })); assert.equal(U.drawn, true); assert.equal(U.hand(K).mode, null);
  // 会話・演出：すぐ納める
  U.sheatheNow(); assert.equal(U.drawn, false); assert.equal(U.hand(K).w, 0);
});
await t('刀以外を手にしている間は鞘の中（拳銃 → 刀へ持ち替えると抜いたまま）', () => {
  const F = new Fighter({ owned: ['katana', 'handgun', 'pipe'], weapon: 'handgun' }), S = new Sheath();
  sim(F, S, 5, () => ({ attack: true })); assert.equal(S.drawn, false); assert.equal(S.inHand(F), false);
  sim(F, S, 1, () => ({ swap: true })); sim(F, S, 20); assert.equal(F.weapon, 'katana'); assert.equal(S.drawn, true);
  const P = new Fighter({ owned: ['pipe'], weapon: 'pipe' }), Q = new Sheath();
  sim(P, Q, 1, () => ({ attack: true })); assert.equal(Q.drawn, false); assert.equal(Q.sheathed(P), false, '鉄パイプは今の持ち方のまま');
});
await t('攻撃のこま数・当たりの出るこま・無敵とジャストの受付は鞘があっても同じ（居合も無い）', () => {
  const seq = i => ({ attack: i === 0 || i === 14 || i === 30, dodge: i === 80, heavy: i >= 100 && i < 125 });
  const F1 = new Fighter(), F2 = new Fighter(), S = new Sheath();
  const a = sim(F1, new Sheath(), 0); void a;
  const e1 = []; for (let i = 0; i < 200; i++) e1.push(...F1.tick(seq(i)));
  const e2 = sim(F2, S, 200, seq);
  const key = e => [e.t, e.frame, e.step ?? '', e.heavy ? 'h' : ''].join(':');
  assert.deepEqual(e2.map(key), e1.map(key));
  assert.ok(!e1.some(e => /iai/i.test(e.t) || e.kind === 'iai'));
  const act = e1.filter(e => e.t === 'active' && e.first).map(e => e.step); assert.deepEqual(act, [0, 1, 2, 8]);
  const W = windows(); assert.deepEqual([W.just, W.iStart, W.iEnd], [8, 3, 14]);
  assert.deepEqual(COMBAT.katana.light.map(x => [x.startup, x.active, x.recovery]), [[6, 4, 14], [8, 4, 16], [10, 4, 22]]);
});

// ── 形：鞘と納めた刀が描かれる・左腰・IK で手の刀が鞘に重なる ──
const { attachRigidWeapons, sayaFrame, KATANA_COLORS } = await import('../shinshoku/actor/models.js');
const { placeHeldAt } = await import('../charkit/anim/limbik.js');
const meshes = o => { let k = 0; o.traverse(x => { if (x.isMesh && !x.userData.isOutlineHull) k++; }); return k; };
const colors = o => { const s = new Set(); o.traverse(x => { if (x.isMesh && !x.userData.isOutlineHull && x.material && x.material.color) s.add(x.material.color.getHex()); }); return s; };
async function checkVRM(file, label) {
  const { loadVRMModel } = await import('../charkit/runtime/vrmrt.js');
  const { makeSockets } = await import('../shinshoku/actor/vrm.js');
  const m = await loadVRMModel(buf(file), { height: 1.64, fit: 'none', loader: stubTex });
  const J = m.J, So = makeSockets(J, {}, m.vrm, m.stats.metaVersion === '0');
  const W = attachRigidWeapons(Object.assign({}, J, { rightHand: So.rightHand, hips: So.hips || J.hips }));
  m.vrm.scene.updateMatrixWorld(true);
  assert.ok(meshes(W.saya) >= 3, `${label}：鞘・柄・鍔が描かれる（${meshes(W.saya)}）`); assert.ok(meshes(W.sayaHilt) >= 2);
  assert.ok(colors(W.saya).has(KATANA_COLORS.saya) && colors(W.sayaHilt).has(KATANA_COLORS.tsuba) && colors(W.katana).has(KATANA_COLORS.tsuba), '色はコードの体の刀と同じ・手の刀にも鍔');
  // 左腰：VRM 1.0 は +x が体の左・+z が前（0.x は逆）
  const sgn = m.stats.metaVersion === '0' ? -1 : 1;
  const hips = J.hips.getWorldPosition(new THREE.Vector3()), tsuba = W.sayaHilt.localToWorld(new THREE.Vector3(0, 0.085, 0)), tip = W.saya.localToWorld(new THREE.Vector3(0, 0.86, 0));
  const lUL = J.leftUpperLeg.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.sign(lUL.x - hips.x) === sgn, '左の脚の向き');
  assert.ok((tsuba.x - hips.x) * sgn > 0.08, `${label}：鍔は体の左 ${((tsuba.x - hips.x) * 100 * sgn).toFixed(0)}cm`);
  assert.ok((tsuba.z - hips.z) * sgn > 0.05 && (tip.z - hips.z) * sgn < -0.3, '鍔は前・こじりは後ろ');
  assert.ok(Math.abs(tsuba.y - hips.y) < 0.15 && tip.y < tsuba.y, '帯の高さ・鞘は後ろの下へ');
  // IK：手の刀を鞘の中の在り処へ
  for (let i = 0; i < 4; i++) placeHeldAt(J, W.katana, W.sayaRef, 1, m.vrm.scene);
  m.vrm.scene.updateMatrixWorld(true);
  const kp = W.katana.getWorldPosition(new THREE.Vector3()), rp = W.sayaRef.getWorldPosition(new THREE.Vector3());
  const kd = new THREE.Vector3(0, 1, 0).applyQuaternion(W.katana.getWorldQuaternion(new THREE.Quaternion())), rd = new THREE.Vector3(0, 1, 0).applyQuaternion(W.sayaRef.getWorldQuaternion(new THREE.Quaternion()));
  console.log(`    ${label}：鍔 体の左 ${((tsuba.x - hips.x) * sgn * 100).toFixed(0)}cm・前 ${((tsuba.z - hips.z) * sgn * 100).toFixed(0)}cm・高さ ${((tsuba.y - hips.y) * 100).toFixed(0)}cm／IK の後 刀と鞘の在り処の差 ${(kp.distanceTo(rp) * 100).toFixed(1)}cm・向き ${(kd.angleTo(rd) * 57.3).toFixed(0)}°`);
  assert.ok(kp.distanceTo(rp) < 0.06, '手の刀が鞘の在り処の近く'); assert.ok(kd.angleTo(rd) < 0.3, '向きも');
}
await t('VRoid 製（既定）：鞘と納めた刀が左腰に描かれる・手を柄へ寄せられる', () => checkVRM('shinshoku/assets/characters/dannoura.vrm', 'VRoid'));
await t('Blender 製（?vrmset=bl）：鞘と納めた刀が左腰に描かれる・手を柄へ寄せられる', () => checkVRM('shinshoku/assets/characters/dannoura_bl.vrm', 'Blender'));
await t('コードの体（?vrm=0）：鞘の骨は左腰・納めた刀の在り処は鞘の骨と同じ（刀の形の局所）', async () => {
  const F = sayaFrame();
  assert.ok(F.p.x > 0.08 && F.p.z > 0.05, '左・前');
  const H = await import('../shinshoku/actor/heroes.js');
  const m = H.buildDannouraV2(); const W = m.weapons; m.root.updateMatrixWorld(true);
  assert.ok(W.sayaRef && W.sayaRef.parent === W.saya);
  const hips = m.J.hips.getWorldPosition(new THREE.Vector3()), p = W.sayaRef.getWorldPosition(new THREE.Vector3());
  assert.ok(p.x - hips.x > 0.05, `左 ${((p.x - hips.x) * 100).toFixed(0)}cm`);
  for (let i = 0; i < 4; i++) placeHeldAt(m.J, W.katana, W.sayaRef, 1, m.root);
  m.root.updateMatrixWorld(true);
  const kp = W.katana.getWorldPosition(new THREE.Vector3());
  console.log(`    コードの体：IK の後 刀と鞘の在り処の差 ${(kp.distanceTo(p) * 100).toFixed(1)}cm`);
  assert.ok(kp.distanceTo(p) < 0.06);
});
console.log(`shinshoku-sheath: ${n} ok`);
