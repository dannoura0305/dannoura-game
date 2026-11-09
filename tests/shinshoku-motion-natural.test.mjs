// 境界侵食：だんのうらの歩き・走り・回避・刀の動きを自然に（2026-11-08・利用者の依頼「歩くモーションと走るモーションが不自然」「回避の距離を少し伸ばす」「攻撃がぎこちない」）。
// 確かめること：
//  ・足の着き方（charkit/anim/clipanim.js prepLoco）：VRoid 製の体で、足の点が床（0.4cm 以内）にある間の水平の速さ（＝床の上を滑る速さ）が小さい。
//    前は脚の短い体でクリップの足が止まる前に床へ着き、歩きで 27cm/s・走りで 124cm/s 滑っていた（今までの数え方「着いた間（2cm・30cm/s 以下）の平均」には出ない）
//  ・腰の上下：歩きの上下が 7cm 以下・着地の「がくっ」（腰の上下の 2 階差）が小さい
//  ・回避：進む距離が前（2.1m）の 1.15〜1.25 倍・無敵とジャストの受付のこまは同じ・転がりの回りは進んだ距離に合わせる（0→1・単調）
//  ・刀：強攻撃の動き（VRMA）は強攻撃（溜め 18f で離す）を録った物（前は長押しの別の技の空振りを録っていて、強攻撃に違う動きが出ていた。その技は 2026-11-09 に削除）
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
const { COMBAT, dodgeSpeedK, dodgeTravel } = await import('../shinshoku/data/combat.js');
const { rollAt, rollFrac } = await import('../shinshoku/actor/anim.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const stubTex = l => { l.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) })); l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) })); };
const man = readJson('shinshoku/assets/characters/manifest.json');

await t('回避：進む距離は前（dist 3.4 → 約 2.1m）の 1.15〜1.25 倍・1 こまの動きは体の半径（0.34m）より小さい（壁を抜けない）・無敵とジャストの受付は同じ', () => {
  const D = COMBAT.dodge, run = dist => { let s = 0, mx = 0; for (let f = 0; f < D.total + 12; f++) { const v = dist / 0.28 * dodgeSpeedK(f / D.total) * 0.9 / 60; s += v; mx = Math.max(mx, v); } return { s, mx }; };
  const old = run(3.4), now = run(D.dist);
  assert.ok(Math.abs(old.s - 2.1) < 0.05, '前の距離 ' + old.s);
  assert.ok(now.s / old.s >= 1.15 && now.s / old.s <= 1.25, `今 ${now.s.toFixed(2)}m（前の ${(now.s / old.s).toFixed(2)} 倍）`);
  assert.ok(now.mx < 0.34 * 0.8, '1 こま ' + now.mx);
  assert.deepEqual([D.total, D.iStart, D.iEnd, D.just], [24, 3, 14, 8]);
  // 動き（game/combat.js）と転がり（actor/anim.js）が同じ形を使う
  const src = readFileSync(P('shinshoku/game/combat.js'), 'utf8'); assert.match(src, /k = dodgeSpeedK\(t\)/);
});
await t('回避の転がり：0 こま目は回らない・進んだ距離に合わせて 0→1（単調）・終わりで 1 回り・丸まりも同じ進み', () => {
  assert.equal(rollFrac(0), 0); assert.equal(rollAt(0).angle, 0);
  let prev = -1; for (let f = 0; f <= 30; f++) { const k = rollFrac(f); assert.ok(k >= prev - 1e-9, 'f' + f); prev = k; }
  assert.ok(Math.abs(rollAt(18).angle - Math.PI * 2) < 1e-6);
  // 半分回った頃に半分ほど進んでいる（前は回りが遅れて、始めは滑り・終わりはその場で回っていた）
  const fHalf = [...Array(25).keys()].find(f => rollFrac(f) >= 0.5);
  assert.ok(Math.abs(dodgeTravel(fHalf) - 0.5) < 0.2, `半分回った f${fHalf} で進んだ割合 ${dodgeTravel(fHalf).toFixed(2)}`);
});
await t('刀の強攻撃の動き（VRMA）：強攻撃（step 8・当たり 0〜6f・32f）を録った物', () => {
  const set = readJson('shinshoku/assets/anim/dannoura/clips.json'), h = set.clips.cmb_katana_heavy;
  assert.deepEqual(h.match, { weapon: 'katana', heavy: true, step: 8 });
  assert.equal(h.frames, COMBAT.katana.heavy.active + COMBAT.katana.heavy.recovery);
  assert.deepEqual(h.events.map(e => e.frame), [0, COMBAT.katana.heavy.active]);
  const l = set.clips.cmb_katana_light_1; const a = COMBAT.katana.light[0];
  assert.deepEqual(l.events.map(e => e.frame), [a.startup, a.startup + a.active]); assert.equal(l.frames, a.startup + a.active + a.recovery);
});

const m = await loadVRMModel(buf('shinshoku/assets/characters/dannoura.vrm'), { height: 1.64, fit: 'none', loader: stubTex });
const cs = await loadClipSet(readJson('shinshoku/assets/anim/dannoura/clips.json'), m.vrm, { fetchBinary: async (u, f) => buf('shinshoku/assets/anim/dannoura/' + f) });
const holder = new THREE.Group(); holder.add(m.vrm.scene);
const L = m.legDims, J = m.J;
function sim(v, frames = 300) {
  const A = new ClipAnimator(m.vrm.scene, J, cs, { legDims: L, footIK: true, sceneScale: 1, ground: () => 0, strideK: man.characters.dannoura.strideK });
  holder.position.set(0, 0, 0); let ph = 0; const prev = {}; let sk = 0, skN = 0, pen = 0; const hy = [];
  for (let i = 0; i < frames; i++) {
    const dz = v / 60; holder.position.z += dz; holder.updateMatrixWorld(true); ph += dz * A.phaseRate(v);
    A.update(1 / 60, { st: 'free', speed: v, phase: ph, weapon: 'none' }); m.vrm.scene.updateMatrixWorld(true);
    hy.push(J.hips.getWorldPosition(new THREE.Vector3()).y);
    for (const s of ['left', 'right']) for (const [nm, z] of [['h', -L.heel], ['b', L.ball]]) {
      const p = new THREE.Vector3(0, -L.ankleY, z).applyMatrix4(J[s + 'Foot'].matrixWorld), q = prev[s + nm];
      pen = Math.max(pen, -p.y);
      if (q && i > 30 && Math.max(p.y, q.y) < 0.004) { sk += Math.hypot(p.x - q.x, p.z - q.z) * 60; skN++; }
      prev[s + nm] = p;
    }
  }
  const h = hy.slice(60); let acc = 0; for (let i = 2; i < h.length; i++) acc = Math.max(acc, Math.abs(h[i] - 2 * h[i - 1] + h[i - 2]) * 3600);
  return { skate: skN ? sk / skN * 100 : 0, contact: skN, pen: pen * 100, bob: (Math.max(...h) - Math.min(...h)) * 100, acc };
}
await t('VRoid のだんのうら：床の上の足の滑り（歩き 2.2・小走り 3.4・走り 5.0m/s）≤5cm/s（前 27・58・124）・床に入らない・歩きの腰の上下 ≤7cm（前 9.2）・がくっ（2 階差）≤35m/s²（前 73）', () => {
  for (const v of [2.2, 3.4, 5.0]) {
    const r = sim(v);
    console.log(`    ${v}m/s：床の上の滑り ${r.skate.toFixed(1)}cm/s（${r.contact} 点）・腰の上下 ${r.bob.toFixed(1)}cm・2 階差 ${r.acc.toFixed(0)}m/s²・床へ ${r.pen.toFixed(2)}cm`);
    assert.ok(r.skate <= 5, v + ' 滑り ' + r.skate); assert.ok(r.contact > 60, v + ' 着いている ' + r.contact); assert.ok(r.pen < 1, v + ' 床');
    if (v === 2.2) { assert.ok(r.bob <= 7, '上下 ' + r.bob); assert.ok(r.acc <= 35, 'がくっ ' + r.acc); }
  }
});

console.log(`shinshoku-motion-natural: ${n} ok`);
