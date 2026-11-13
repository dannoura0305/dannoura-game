// 『境界侵食』P19：利用者が Codex で作った異形のモデル 9 体を軽くした包み（tools/blender/enemy/convert_codex.py → shinshoku/assets/enemies/codex/）。
// ・包みの形（wakaba-enemypack/2）・三角形の予算（通常 5k〜15k・ボス／巨大 20k〜40k）・大きさ・重みの合計 1・骨はコードの骨の名前・記録（manifest）
// ・差し替え：骨を休みの位置へ動かし（骨の逆行列）、目・弱点・核の位置・顔の札を隠す・腰の高さ（Poser）・巨大猫又の胴・継接の腰
// ・写し身は差し替えない・?epack=p18 で前の包み／?epack=0 でコードの形（予備）・届いた動き（glb の clip）を決まった状態で重ねる
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const THREE = await import('three');
const EP = await import('../shinshoku/actor/enemypack.js');
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
const KINDS = ['heiten', 'shuuyou', 'shuusha', 'mimic', 'outou', 'machibito', 'tsugihagi', 'sakibure', 'nekomata'];
const BIG = { tsugihagi: 1, sakibure: 1, nekomata: 1 };
const CLASSES = ['cloth', 'skin', 'hair', 'metal', 'acc', 'glow', 'fur'];

await t('包み 9 種 × PC／スマホ：v2・三角形の予算・大きさ・骨の範囲・重みの合計 1・量子化の範囲・記録', () => {
  const man = J('shinshoku/assets/enemies/codex/manifest.json');
  assert.equal(man.license.id, 'own'); assert.ok(/ChatGPT/.test(man.license.reference) && /Codex/.test(man.license.model));
  assert.ok(!existsSync(new URL('incoming', root)), 'incoming/ は main に入れない');
  for (const k of KINDS) assert.ok(EP.ENEMY_PACK_CODEX.includes(k), k);   // P20 で 8 種を足した（tests/shinshoku-p20.test.mjs）
  for (const kind of KINDS) for (const low of [false, true]) {
    const f = `shinshoku/assets/enemies/codex/${kind}${low ? '_low' : ''}.pack.json`; assert.ok(existsSync(new URL(f, root)), f);
    const size = readFileSync(new URL(f, root)).length, pk = J(f);
    assert.equal(pk.spec, 'wakaba-enemypack/2'); assert.equal(pk.kind, kind); assert.equal(pk.license, 'own（自作・商用可）');
    assert.ok(pk.source && /incoming\/codex\/characters/.test(pk.source.model) && pk.source.tris > 200000, f + ' 出どころ');
    const [lo, hi] = BIG[kind] ? (low ? [9000, 20001] : [20000, 40001]) : (low ? [2500, 8001] : [5000, 15001]);
    assert.ok(pk.tris >= lo && pk.tris < hi, `${f} ${pk.tris}`);
    assert.ok(size < (BIG[kind] ? 1.0 : 0.45) * 1048576, `${f} ${size}`);
    assert.ok(man.entries.some(e => e.file === f.split('/').pop() && e.tris === pk.tris), f + ' manifest');
    for (const c of pk.classes) assert.ok(CLASSES.includes(c), c);
    assert.ok(pk.rest && Object.keys(pk.rest).length >= 10, kind + ' rest');
    for (const b of Object.keys(pk.rest)) assert.ok(pk.bones.includes(b) || ['tLegs'].includes(b), kind + ' rest ' + b);
    for (const p of pk.parts) {
      const B = s => new Uint8Array(Buffer.from(s, 'base64')), w = B(p.weights), j = B(p.joints);
      assert.equal(w.length, p.count * 4); assert.equal(B(p.position).length, p.count * 6); assert.equal(B(p.normal).length, p.count * 3); assert.equal(B(p.color).length, p.count * 3);
      for (let i = 0; i < p.count; i += 5) { assert.equal(w[i * 4] + w[i * 4 + 1] + w[i * 4 + 2] + w[i * 4 + 3], 255, `${kind}/${p.name} 重み`); for (let k = 0; k < 4; k++) assert.ok(j[i * 4 + k] < pk.bones.length); }
      const I = p.indexType === 'u32' ? new Uint32Array(B(p.index).buffer) : new Uint16Array(B(p.index).slice().buffer);
      assert.equal(I.length, p.tris * 3); let mx = 0; for (const v of I) mx = Math.max(mx, v); assert.ok(mx < p.count);
    }
  }
  assert.ok(existsSync(new URL('tools/blender/enemy/convert_codex.py', root)));
});

const M = await import('../shinshoku/actor/models.js');
const M3 = await import('../shinshoku/actor/models3.js');
const M4 = await import('../shinshoku/actor/models4.js');
const M5 = await import('../shinshoku/actor/models5.js');
const M6 = await import('../shinshoku/actor/models6.js');
const BUILD = { heiten: M.buildHeiten, shuuyou: M.buildShuuyou, mimic: () => M3.buildMimicShadow({ seed: 3 }), outou: () => M4.buildOutou(1), machibito: () => M6.buildMachibito(1),
  shuusha: () => M5.buildShuusha(1, 'S-01'), tsugihagi: M5.buildTsugihagi, sakibure: M5.buildSakibure, nekomata: M5.buildGiantNekomata };
const code = {}; for (const k of KINDS) { EP.setEnemyPack(k, null); code[k] = BUILD[k](); }

await t('差し替え：網の頂点＝包み・骨は休みの位置へ（逆行列も）・高さは今の異形と同じくらい・目と弱点は届いたモデルの位置・顔の札は隠す', () => {
  const v = new THREE.Vector3();
  for (const kind of KINDS) {
    const pk = J(`shinshoku/assets/enemies/codex/${kind}.pack.json`); EP.setEnemyPack(kind, pk);
    const m = BUILD[kind](); m.root.updateMatrixWorld(true);
    assert.equal(m.packed, kind, kind);
    assert.equal(m.mesh.geometry.attributes.position.count, pk.parts.reduce((s, p) => s + p.count, 0));
    assert.equal(m.outline.geometry, m.mesh.geometry);
    if (m.faceMesh) assert.equal(m.faceMesh.visible, false, kind + ' 顔の札');
    for (const [bn, p] of Object.entries(pk.rest)) {
      const b = m.skeleton.bones.find(x => x.name === bn); if (!b) continue;
      b.getWorldPosition(v); assert.ok(v.distanceTo(new THREE.Vector3(...p)) < 1e-3, `${kind} ${bn} ${v.toArray()} ${p}`);
      const i = m.skeleton.bones.indexOf(b), inv = new THREE.Vector3().setFromMatrixPosition(m.skeleton.boneInverses[i]);
      assert.ok(inv.distanceTo(new THREE.Vector3(-p[0], -p[1], -p[2])) < 1e-3, kind + ' 逆行列 ' + bn);
    }
    const hc = new THREE.Box3().setFromBufferAttribute(code[kind].mesh.geometry.attributes.position), hn = new THREE.Box3().setFromBufferAttribute(m.mesh.geometry.attributes.position);
    const r = (hn.max.y - hn.min.y) / (hc.max.y - hc.min.y); assert.ok(r > 0.8 && r < 1.25, `${kind} 高さの比 ${r.toFixed(2)}`);
    assert.ok(hn.min.y > -0.05 && hn.min.y < 0.08, kind + ' 足もと ' + hn.min.y);
    for (const [key, a] of Object.entries(pk.anchors || {})) {
      const objs = Array.isArray(m[key]) ? m[key] : [m[key]]; if (!objs[0]) continue;
      objs[0].getWorldPosition(v); assert.ok(v.distanceTo(new THREE.Vector3(...a.p[0])) < 1e-3, `${kind} ${key}`);
    }
  }
});

await t('人型：腰の高さのずれ（packShift）・巨大猫又の胴（bodyY）・継接の腰（tHipY）・Poser は差し替えた後の腰の高さ', async () => {
  const { Poser } = await import('../shinshoku/actor/rig.js');
  const h = BUILD.heiten(); const P = new Poser(h.J, {}); assert.ok(Math.abs(P.hipsBase - h.J.hips.position.y) < 1e-6);
  assert.ok(h.packShift && Math.abs(h.packShift.y - (J('shinshoku/assets/enemies/codex/heiten.pack.json').rest.hips[1] - 0.98)) < 1e-3);
  const g = BUILD.nekomata(); assert.ok(Math.abs(g.bodyY - J('shinshoku/assets/enemies/codex/nekomata.pack.json').rest.gBody[1]) < 1e-4); assert.ok(g.bodyY > 0.5 && g.bodyY < 1.1);
  const { GiantAnimator, TsugiAnimator } = await import('../shinshoku/actor/anim5.js');
  new GiantAnimator(g).update(1 / 60, { phase: 0, speed: 0, st: { name: 'free', f: 0 } }); assert.ok(Math.abs(g.G.gBody.position.y - g.bodyY) < 0.03, '猫又の胴が包みの高さ');
  const ts = BUILD.tsugihagi(); const def = (await import('../shinshoku/data/enemies.js')).ENEMIES.tsugihagi;
  new TsugiAnimator(ts).update(1 / 60, { brain: { state: 'loop', atk: null, def, parts: {} }, speed: 0, phase: 0 }); assert.ok(Math.abs(ts.G.tHip.position.y - ts.tHipY) < 0.05, '継接の腰');
  const src = read('shinshoku/main.js');
  assert.ok(/e\.poser\.hipsBase \+= d\.y/.test(src), '後で読めた時は Poser の腰の高さも足す');
  assert.ok(/applyEnemyPack\(G, 'nekomata'\)/.test(src) && /ks\.push\('nekomata'\)/.test(src), '巨大猫又は巨大な敵の区画で読む・後で当てる');
});

await t('?epack=p18 は前の包み（無い種類は無し）・?epack=0 はコードの形（P20：写し身・塗替・当直も Codex の包みへ＝tests/shinshoku-p20.test.mjs）', () => {
  assert.equal(EP.enemyPackPath('heiten', false), 'codex/heiten.pack.json'); assert.equal(EP.enemyPackPath('heiten', true), 'codex/heiten_low.pack.json');
  assert.equal(EP.enemyPackPath('heiten', false, true), 'heiten.pack.json'); assert.equal(EP.enemyPackPath('mimic', false, true), null);
  assert.equal(EP.enemyPackPath('kiro', false), 'kiro.pack.json'); assert.equal(EP.enemyPackPath('nurikae', true, true), 'nurikae_low.pack.json');
  for (const k of ['kiro', 'heiten', 'shuuyou', 'outou', 'tsugihagi', 'nurikae', 'touchoku']) assert.ok(existsSync(new URL(`shinshoku/assets/enemies/${k}.pack.json`, root)), '前の包みを残す ' + k);
  const src = read('shinshoku/actor/enemypack.js'); assert.ok(/epack=0/.test(src) && /epack=p18/.test(src));
});

await t('届いた動き（glb の clip）：骨はコードの名前・こまの数・決まった状態でだけ重ねる（攻撃の時間は変えない）', () => {
  const want = { heiten: ['closing_gesture', 'idle'], shuuyou: ['charge_ready', 'idle', 'reach_pull'], shuusha: ['idle', 'walk'], mimic: ['head_tilt', 'idle', 'reach', 'walk_in_place'], outou: ['acknowledge', 'idle', 'respond', 'standby'], machibito: ['check_watch', 'idle', 'look_around', 'wait'] };
  for (const [k, names] of Object.entries(want)) {
    const pk = J(`shinshoku/assets/enemies/codex/${k}.pack.json`);
    assert.deepEqual(Object.keys(pk.clips).sort(), names, k);
    for (const c of Object.values(pk.clips)) { assert.ok(c.r.length >= 10); for (const row of c.r) assert.equal(row.length, c.bones.length * 3); assert.ok(c.bones.every(b => b === 'hips' || EP.CLIP_UPPER.includes(b) || /Leg|Foot/.test(b))); }
  }
  EP.setEnemyPack('machibito', J('shinshoku/assets/enemies/codex/machibito.pack.json'));
  const m = BUILD.machibito(); assert.ok(m.packClips);
  const base = () => ({ pose: { leftUpperArm: [9, 9, 9], leftUpperLeg: [1, 2, 3] }, rate: 0.3 });
  const fn = EP.packPoseFn('machibito', base, m);
  const still = fn({ state: 'loop', t: 1, speed: 0 }); assert.notDeepEqual(still.pose.leftUpperArm, [9, 9, 9], '止まっている輪：時計を見る');
  assert.deepEqual(still.pose.leftUpperLeg, [1, 2, 3], '脚はコードのまま');
  assert.deepEqual(fn({ state: 'hostile', t: 1, speed: 0, atk: { name: 'push', phase: 'windup', t: 0.2 } }).pose.leftUpperArm, [9, 9, 9], '攻撃の構えはコードのまま');
  assert.deepEqual(EP.packPoseFn('machibito', base, code.machibito)({ state: 'loop', t: 1, speed: 0 }).pose.leftUpperArm, [9, 9, 9], 'コードの形は動きを重ねない');
  for (const [f, re] of [['shinshoku/game/ch3.js', /packPoseFn\('mimic'/], ['shinshoku/game/ch4.js', /packPoseFn\('outou'/], ['shinshoku/game/ch5.js', /packPoseFn\('shuusha'/], ['shinshoku/game/ch6.js', /packPoseFn\('machibito'/], ['shinshoku/main.js', /packPoseFn\('heiten'/]]) assert.ok(re.test(read(f)), f);
});

console.log(`shinshoku-p19: ${n} passed`);
