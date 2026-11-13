// 『境界侵食』P20：2026-11-13 に届いた Codex のモデル 7 体と写し身の完成版を、P19 と同じ道具（tools/blender/enemy/convert_codex.py）で軽くした包み。
// 守り手（mamori）・記録のない患者（kanja）・写し身（utsushimi）・当直（touchoku）・塗替（nurikae）・境界を喰らうもの（kuramono）・研究者（kenkyusha）・配偶者に似た異形（spouse_like）
// ・包みの形・三角形の予算・大きさ・記録（manifest）・差し替え（骨の休みの位置・目／弱点／核）・届いた動き・読む時（後から）・読めない時はコードの形
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
const THREE = await import('three');
const EP = await import('../shinshoku/actor/enemypack.js');
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓ ' + name); };
const KINDS = ['mamori', 'kanja', 'utsushimi', 'touchoku', 'nurikae', 'kuramono', 'kenkyusha', 'spouse_like'];
// 通常／スマホの三角形の上限（巨大ボス・ボス・通常）
const BUDGET = { nurikae: [40001, 20001], kuramono: [40001, 20001], touchoku: [20001, 10001], kenkyusha: [20001, 10001], utsushimi: [20001, 10001], mamori: [15001, 8001], kanja: [15001, 8001], spouse_like: [15001, 8001] };
const SRC = { mamori: 'mamorite/mamorite.glb', kanja: 'unrecorded_patient/unrecorded_patient.glb', utsushimi: 'utsushimi/utsushimi.glb', touchoku: 'tochoku/tochoku.glb', nurikae: 'nurikae/nurikae.glb',
  kuramono: 'boundary_eater/boundary_eater.glb', kenkyusha: 'researcher/researcher.glb', spouse_like: 'spouse_apparition/spouse_animated.glb' };
const CLIPS = { mamori: ['idle', 'protect_ground', 'push_back', 'recoil'], kanja: ['hold_record', 'idle', 'search_record', 'walk_in_place'], utsushimi: ['head_tilt', 'idle', 'mimic_pose', 'reaching_lunge'],
  touchoku: ['idle', 'patrol', 'restart', 'steam_brace'], kenkyusha: ['accident_replay', 'idle', 'neutralized', 'record_check'], spouse_like: ['Look_back', 'Wait'], nurikae: [], kuramono: [] };

await t('包み 8 種 × PC／スマホ：v2・届いたモデル・三角形の予算・大きさ・重みの合計 1・記録（manifest）', () => {
  const man = J('shinshoku/assets/enemies/codex/manifest.json');
  assert.ok(!existsSync(new URL('incoming', root)), 'incoming/ は main に入れない');
  assert.ok(!man.notConverted || !man.notConverted.utsushimi, '写し身も差し替えた');
  for (const kind of KINDS) {
    assert.ok(EP.ENEMY_PACK_CODEX.includes(kind) && EP.ENEMY_PACK_LAZY.includes(kind) && !EP.ENEMY_PACK_EARLY.includes(kind), kind + '：Codex の包み・後から読む');
    assert.ok(man.mapping[kind] && man.mapping[kind].startsWith(SRC[kind]), kind + ' mapping');
    for (const low of [false, true]) {
      const f = `shinshoku/assets/enemies/codex/${kind}${low ? '_low' : ''}.pack.json`; assert.ok(existsSync(new URL(f, root)), f);
      const size = readFileSync(new URL(f, root)).length, pk = J(f);
      assert.equal(pk.spec, 'wakaba-enemypack/2'); assert.equal(pk.kind, kind); assert.equal(pk.lod, low ? 'low' : 'pc');
      assert.equal(pk.source.model, 'incoming/codex/characters/' + SRC[kind]);
      const hi = BUDGET[kind][low ? 1 : 0]; assert.ok(pk.tris < hi && pk.tris > hi * 0.3, `${f} ${pk.tris}`);
      assert.ok(pk.tris < pk.source.tris, f + ' 元より軽い');
      assert.ok(size < (low ? 0.6 : 1.0) * 1048576, `${f} ${size}`);
      assert.ok(man.entries.some(e => e.file === f.split('/').pop() && e.tris === pk.tris && e.bytes === size), f + ' manifest');
      assert.deepEqual(Object.keys(pk.clips).sort(), CLIPS[kind], f + ' 動き');
      for (const p of pk.parts) {
        const B = s => new Uint8Array(Buffer.from(s, 'base64')), w = B(p.weights), j = B(p.joints);
        for (let i = 0; i < p.count; i += 7) { assert.equal(w[i * 4] + w[i * 4 + 1] + w[i * 4 + 2] + w[i * 4 + 3], 255); for (let k = 0; k < 4; k++) assert.ok(j[i * 4 + k] < pk.bones.length); }
      }
      for (const b of Object.keys(pk.rest)) assert.ok(pk.bones.includes(b) || /^(kW|kT|nArm)/.test(b), `${kind} rest ${b}`);
    }
  }
  const tot = man.entries.filter(e => KINDS.includes(e.kind)).reduce((s, e) => s + e.bytes, 0);
  assert.ok(tot < 12 * 1048576, '8 種の合計 ' + tot);
});

const M3 = await import('../shinshoku/actor/models3.js');
const M6 = await import('../shinshoku/actor/models6.js');
const M7 = await import('../shinshoku/actor/models7.js');
const BUILD = { mamori: M3.buildMamori, kanja: () => M3.buildKanja(1), utsushimi: M3.buildUtsushimi, touchoku: M6.buildTouchoku, nurikae: M6.buildNurikae,
  kuramono: M7.buildKuramono, kenkyusha: M7.buildResearcher, spouse_like: M7.buildSpouseLike };
const code = {}; for (const k of KINDS) { EP.setEnemyPack(k, null); code[k] = BUILD[k](); }

await t('読めない時はコードの形のまま（落ちない）', () => {
  for (const k of KINDS) { assert.ok(!code[k].packed, k); assert.equal(code[k].kind, k); assert.ok(code[k].mesh.geometry.index.count > 0); }
  assert.equal(code.spouse_like.mesh.material, code.spouse_like.mats.ghost, '配偶者に似た異形は光の人影の材質');
});

await t('差し替え：網の頂点＝包み・骨は休みの位置へ・高さ・足もと・目／弱点／核は届いたモデルの位置（点ごとの骨も）', () => {
  const v = new THREE.Vector3();
  for (const kind of KINDS) {
    const pk = J(`shinshoku/assets/enemies/codex/${kind}.pack.json`); EP.setEnemyPack(kind, pk);
    const m = BUILD[kind](); m.root.updateMatrixWorld(true);
    assert.equal(m.packed, kind, kind);
    assert.equal(m.mesh.geometry.attributes.position.count, pk.parts.reduce((s, p) => s + p.count, 0));
    for (const [bn, p] of Object.entries(pk.rest)) {
      const b = m.skeleton.bones.find(x => x.name === bn); if (!b) continue;
      b.getWorldPosition(v); assert.ok(v.distanceTo(new THREE.Vector3(...p)) < 1e-3, `${kind} ${bn}`);
    }
    const hc = new THREE.Box3().setFromBufferAttribute(code[kind].mesh.geometry.attributes.position), hn = new THREE.Box3().setFromBufferAttribute(m.mesh.geometry.attributes.position);
    const r = hn.max.y / hc.max.y; assert.ok(r > 0.85 && r < 1.12, `${kind} 高さの比 ${r.toFixed(2)}`);
    assert.ok(hn.min.y > -0.03 && hn.min.y < 0.05, kind + ' 足もと ' + hn.min.y);
    for (const [key, a] of Object.entries(pk.anchors || {})) {
      const objs = Array.isArray(m[key]) ? m[key] : [m[key]]; if (!objs[0]) continue;
      objs.forEach((o, i) => { o.getWorldPosition(v); assert.ok(v.distanceTo(new THREE.Vector3(...a.p[i % a.p.length])) < 1e-3, `${kind} ${key} ${i}`); if (a.bones) assert.equal(o.parent.name, a.bones[i % a.bones.length]); });
    }
    if (kind === 'spouse_like') { assert.equal(m.mesh.material, m.mats.ghost, '光の人影の材質のまま（顔は描かない）'); assert.equal(m.glowMesh.visible, false); }
    if (kind === 'kenkyusha') assert.ok(m.glowMesh.visible, '研究者の顔の光（コード）は残す');
    if (kind === 'nurikae' || kind === 'kuramono') assert.equal(m.glowMesh.visible, false, kind + '：原画に無いコードの光は隠す');
  }
});

await t('巨大な 2 体：腰／胴の高さは包みの休みの位置（塗替 nHipY・境界を喰らうもの kBodyY）', async () => {
  const { NurikaeAnimator } = await import('../shinshoku/actor/anim6.js');
  const { KuramonoAnimator } = await import('../shinshoku/actor/anim7.js');
  const E = (await import('../shinshoku/data/enemies.js')).ENEMIES;
  const nu = BUILD.nurikae(), ku = BUILD.kuramono();
  assert.ok(Math.abs(nu.nHipY - J('shinshoku/assets/enemies/codex/nurikae.pack.json').rest.nHip[1]) < 1e-4);
  assert.ok(Math.abs(ku.kBodyY - J('shinshoku/assets/enemies/codex/kuramono.pack.json').rest.kBody[1]) < 1e-4);
  new NurikaeAnimator(nu).update(1 / 60, { brain: { state: 'loop', atk: null, def: E.nurikae, patIdx: 0 }, speed: 0 });
  assert.ok(Math.abs(nu.G.nHip.position.y - nu.nHipY) < 0.05, '塗替の腰');
  new KuramonoAnimator(ku).update(1 / 60, { brain: { state: 'loop', atk: null, def: E.kuramono, patIdx: 0 }, speed: 0 });
  assert.ok(Math.abs(ku.G.kBody.position.y - ku.kBodyY) < 0.08, '境界を喰らうものの胴');
  assert.equal(code.nurikae.nHipY, undefined); assert.equal(code.kuramono.kBodyY, undefined);
});

await t('届いた動き：決まった状態でだけ重ねる（攻めの構えは予兆の時間の中・コードの形は重ねない）・置く所で包む', () => {
  EP.setEnemyPack('touchoku', J('shinshoku/assets/enemies/codex/touchoku.pack.json'));
  const m = BUILD.touchoku(), base = () => ({ pose: { rightUpperArm: [9, 9, 9], leftUpperLeg: [1, 2, 3] }, rate: 0.3 });
  const fn = EP.packPoseFn('touchoku', base, m);
  assert.notDeepEqual(fn({ state: 'hostile', t: 1, speed: 0, atk: { name: 'steam', phase: 'windup', t: 0.5 }, atkDef: { windup: 1 } }).pose.rightUpperArm, [9, 9, 9], '蒸気の構え＝steam_brace');
  assert.deepEqual(fn({ state: 'hostile', t: 1, speed: 0, atk: { name: 'steam', phase: 'active', t: 0.1 }, atkDef: { windup: 1 } }).pose.rightUpperArm, [9, 9, 9], '当たりの時はコードのまま');
  assert.deepEqual(fn({ state: 'loop', t: 1, speed: 0 }).pose.leftUpperLeg, [1, 2, 3], '脚はコードのまま');
  assert.deepEqual(EP.packPoseFn('touchoku', base, code.touchoku)({ state: 'loop', t: 1, speed: 0 }).pose.rightUpperArm, [9, 9, 9]);
  for (const k of ['kanja', 'mamori', 'utsushimi', 'touchoku', 'kenkyusha', 'spouse_like']) assert.ok(EP.PACK_CLIP_RULES[k], k);
  for (const [f, res] of [['shinshoku/game/ch3.js', [/packPoseFn\('kanja'/, /packPoseFn\('mamori'/, /packPoseFn\('utsushimi'/]], ['shinshoku/game/ch6.js', [/packPoseFn\('touchoku'/]],
    ['shinshoku/game/ch7.js', [/packPoseFn\('kenkyusha'/, /packPoseFn\('spouse_like'/]]]) for (const re of res) assert.ok(re.test(read(f)), f + ' ' + re);
});

await t('読む時：起動では読まない・その区画（第3章・終章）で先に頼む・巨大猫又は前のまま', () => {
  const mn = read('shinshoku/main.js');
  assert.deepEqual(EP.ENEMY_PACK_EARLY, ['kiro', 'heiten', 'shuuyou']);
  for (const [area, ks] of [['hospital', ['kanja', 'mamori', 'utsushimi']], ['tunnel', ['utsushimi']], ['abyss', ['kuramono', 'kenkyusha', 'spouse_like']], ['kiroku', ['kenkyusha', 'spouse_like']]])
    assert.ok(new RegExp(`${area}: \\[${ks.map(k => `'${k}'`).join(', ')}\\]`).test(mn), area);
  assert.equal(EP.enemyPackPath('nurikae', false), 'codex/nurikae.pack.json'); assert.equal(EP.enemyPackPath('touchoku', true), 'codex/touchoku_low.pack.json');
  assert.equal(EP.enemyPackPath('nurikae', false, true), 'nurikae.pack.json', '?epack=p18 は P18 の包み');
  assert.equal(EP.enemyPackPath('kuramono', false, true), null);
  assert.equal(J('shinshoku/assets/enemies/codex/nekomata.pack.json').source.model, 'incoming/codex/characters/nekomata/nekomata_light.glb', '巨大猫又は Codex の修正版（軽量）のまま');
});

console.log(`shinshoku-p20: ${n} passed`);
