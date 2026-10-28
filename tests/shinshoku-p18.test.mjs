// 『境界侵食』P18 の点検（P17 の続き）。
// ・残りの異形（応答体・継接・塗替・当直）の体を Blender で作り直した包み（tools/blender/enemy/designs_p18.py → shinshoku/assets/enemies/*.pack.json）：
//   コードの骨と同じ名前・重みの合計 1・予算・材質の種類・差し替えても骨・弱点・光る目・顔の札（faceMesh）・炎（glowMesh）はコードのまま・?epack=0 の予備・
//   継接の部分（右腕・左腕・脚・鞄）は自分の骨だけに付く（骨の大きさ 0 で消せる）・起動の時には読まない（その異形が置かれた時に読む）
// ・足の固定（charkit/anim/clipanim.js）：Blender の VRM の歩きの滑り（前 1.2cm/s）・床に入らない
// ・VRM：ひざ・ひじ・肩の補助の骨（ext_half_*）と読み手の回し方・娘の手足の長さ（4 歳）・黒目のくぼみ・服の形のしわ
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
await import('../tools/shinshoku/audit/node_env.mjs');
globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };
const origWarn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('VRMLookAtQuaternionProxy')) origWarn(...a); };
const THREE = await import('three');
const EP = await import('../shinshoku/actor/enemypack.js');

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const J = p => JSON.parse(read(p));
const buf = p => { const b = readFileSync(new URL(p, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const NEW = ['outou', 'tsugihagi', 'nurikae', 'touchoku'];
const BUDGET = { outou: 22000, touchoku: 32000, nurikae: 32000, tsugihagi: 42000 };   // PC（ボスは 1 体だけ）。スマホは半分

await t('包み（4 種 × PC／スマホ）：骨の名前はコードの骨と同じ・重みの合計 1・骨の番号の範囲・三角形の予算・材質の種類', () => {
  assert.deepEqual(EP.ENEMY_PACK_LAZY, NEW);
  for (const kind of NEW) for (const low of [false, true]) {
    const f = `shinshoku/assets/enemies/${kind}${low ? '_low' : ''}.pack.json`; assert.ok(existsSync(new URL(f, root)), f);
    const pk = J(f), rig = J(`tools/blender/enemy/rigs/${kind}.json`);
    assert.equal(pk.spec, 'wakaba-enemypack/1'); assert.equal(pk.generator, 'tools/blender/enemy/build_enemy.py');
    assert.deepEqual(pk.bones, rig.bones.map(b => b.name), kind + ' の骨');
    assert.ok(pk.tris < BUDGET[kind] * (low ? 0.6 : 1) && pk.tris > 6000, `${f} ${pk.tris}`);
    const cls = EP.enemyPackClasses(kind);
    for (const c of pk.classes) assert.ok(cls.includes(c), `${kind}：材質 ${c} を組む前の表に入れておく（後で網だけ差し替えられる）`);
    for (const p of pk.parts) {
      const ab = b64 => Uint8Array.from(Buffer.from(b64, 'base64')).buffer, w = new Float32Array(ab(p.weights)), j = new Uint16Array(ab(p.joints));
      for (let i = 0; i < p.count; i += 5) { const s = w[i * 4] + w[i * 4 + 1] + w[i * 4 + 2] + w[i * 4 + 3]; assert.ok(Math.abs(s - 1) < 1e-3, `${kind}/${p.name} 重み ${s}`); for (let k = 0; k < 4; k++) assert.ok(j[i * 4 + k] < pk.bones.length); }
    }
  }
  assert.ok(/def outou\(rig\)/.test(read('tools/blender/enemy/designs_p18.py')) && /from designs_p18 import DESIGNS/.test(read('tools/blender/enemy/build_enemy.py')));
});

await t('継接：右腕・左腕・脚・鞄の部品は自分の骨（tR*・tL*・tLeg*・tBag）だけに付く＝骨の大きさ 0 で消せる（部分の壊れ）', () => {
  const pk = J('shinshoku/assets/enemies/tsugihagi.pack.json');
  const rule = { right_arm: /^tR\d$/, knuckles: /^tR\d$/, left_arm: /^tL\d$/, bag: /^tBag$/, legA: /^tLegA\d$/, legB: /^tLegB\d$/, legC: /^tLegC\d$/, legD: /^tLegD\d$/ };
  for (const [name, re] of Object.entries(rule)) {
    const p = pk.parts.find(q => q.name === name); assert.ok(p, name);
    const ab = b64 => Uint8Array.from(Buffer.from(b64, 'base64')).buffer, w = new Float32Array(ab(p.weights)), j = new Uint16Array(ab(p.joints));
    for (let i = 0; i < p.count * 4; i++) if (w[i] > 0) assert.ok(re.test(pk.bones[j[i]]), `${name} が ${pk.bones[j[i]]} に付いている`);
  }
});

await t('コードの異形の網を差し替える：頂点の数＝包み・輪郭線も同じ網・骨・弱点・光る目・顔の札・炎はコードのまま／包みが無い時はコードの形', async () => {
  for (const kind of NEW) EP.setEnemyPack(kind, J(`shinshoku/assets/enemies/${kind}.pack.json`));
  const M4 = await import('../shinshoku/actor/models4.js'), M5 = await import('../shinshoku/actor/models5.js'), M6 = await import('../shinshoku/actor/models6.js');
  const built = { outou: M4.buildOutou(1), tsugihagi: M5.buildTsugihagi(), nurikae: M6.buildNurikae(), touchoku: M6.buildTouchoku() };
  for (const [kind, m] of Object.entries(built)) {
    assert.equal(m.packed, kind);
    const pk = EP.enemyPackOf(kind), nv = pk.parts.reduce((s, p) => s + p.count, 0), g = m.mesh.geometry;
    assert.equal(g.attributes.position.count, nv); assert.equal(m.outline.geometry, g);
    const si = g.attributes.skinIndex.array; let mx = 0; for (const v of si) mx = Math.max(mx, v); assert.ok(mx < m.skeleton.bones.length);
    assert.ok((m.eyeGlow || m.eyes || []).length >= 1, kind + '：光る目');
    if (kind !== 'nurikae') assert.ok(m.weak, kind + '：弱点');
    if (kind === 'touchoku') assert.ok(m.faceMesh && m.faceMesh.visible !== false, '当直：計器の文字盤・点検表（顔の札）は残す');
    if (kind === 'tsugihagi' || kind === 'nurikae' || kind === 'touchoku') assert.ok(m.glowMesh, kind + '：炎・垂れる光はコードのまま');
  }
  assert.ok(built.tsugihagi.names && built.tsugihagi.legs.length === 4 && built.nurikae.arms.length === 2, '動きの係が使う骨の表');
  for (const kind of NEW) EP.setEnemyPack(kind, null);
  const c = M6.buildTouchoku(); assert.ok(!c.packed && c.mesh.geometry.attributes.position.count > 1000, '包みが無い時（?epack=0・読めない）はコードの形');
});

await t('読む時：序盤の 3 種は起動の 2 秒後・第4章からの 4 種はその異形が置かれた時（1 秒ごとに見る・1 種類 1 回）', () => {
  const mn = read('shinshoku/main.js'), ep = read('shinshoku/actor/enemypack.js');
  assert.ok(/setTimeout\(\(\) => preloadEnemyPacks\(/.test(mn), '序盤の 3 種');
  assert.ok(/if \(this\.frame % 60 === 0\) this\.lazyEnemyPacks\(\);/.test(mn) && /lazyEnemyPacks\(\) \{/.test(mn));
  assert.ok(/const LAZY_PACK_AREAS = \{ office: \['outou'\], lab: \['outou'\], oldwing: \['tsugihagi'\], atrium: \['tsugihagi'\], ruins: \['nurikae'\], avenue: \['nurikae'\], admin: \['touchoku'\] \}/.test(mn), 'ボスは区画に入った時に先に頼む');
  assert.ok(/export function requestEnemyPacks/.test(ep) && /!ASKED\[k\]/.test(ep));
  assert.deepEqual(EP.ENEMY_PACK_EARLY, ['kiro', 'heiten', 'shuuyou']);
  assert.equal(EP.requestEnemyPacks(['civilian', 'kanja']), null, '包みの無い種類は頼まない');
  for (const [f, k] of [['models4.js', 'outou'], ['models5.js', 'tsugihagi'], ['models6.js', 'nurikae'], ['models6.js', 'touchoku']]) {
    const src = read('shinshoku/actor/' + f);
    assert.ok(src.includes(`classes: enemyPackClasses('${k}')`) && src.includes(`applyEnemyPack(m, '${k}')`), k);
  }
});

// ───────── VRM（Blender で作り直した版） ─────────
const { loadVRMModel } = await import('../charkit/runtime/vrmrt.js');
const { loadClipSet } = await import('../charkit/runtime/vrma.js');
const { ClipAnimator } = await import('../charkit/anim/clipanim.js');
const MET = await import('../charkit/anim/metrics.js');
const stubTex = l => l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
const DIR = 'shinshoku/assets/characters/';
const models = {};
for (const k of ['dannoura', 'companion', 'daughter']) models[k] = await loadVRMModel(buf(DIR + k + '.vrm'), { height: k === 'daughter' ? 1.0 : 1.64, fit: 'none', loader: stubTex });

await t('足の固定：Blender の VRM の歩き（2.2m/s）の滑り ≤0.8cm/s（前 1.2）・走りも固定なしより小さい・床に入らない', async () => {
  const m = models.dannoura, set = J('shinshoku/assets/anim/dannoura/clips.json');
  const cs = await loadClipSet(set, m.vrm, { fetchBinary: async (u, f) => buf('shinshoku/assets/anim/dannoura/' + f) });
  const holder = new THREE.Group(); holder.add(m.vrm.scene); const L = m.legDims;
  const run = (ik, v) => {
    const A = new ClipAnimator(m.vrm.scene, m.J, cs, { legDims: L, footIK: ik, sceneScale: 1, ground: () => 0 });
    holder.position.set(0, 0, 0); let ph = 0; const tr = { lh: [], lt: [], rh: [], rt: [] };
    for (let i = 0; i < 240; i++) {
      const dz = v / 60; holder.position.z += dz; holder.updateMatrixWorld(true); ph += dz * A.phaseRate(v);
      A.update(1 / 60, { st: 'free', f: 0, speed: v, phase: ph, weapon: 'none' }); m.vrm.scene.updateMatrixWorld(true);
      if (i < 40) continue;
      for (const s of ['left', 'right']) {
        const F = m.J[s + 'Foot'], k = s[0];
        const h = new THREE.Vector3(0, -L.ankleY, -L.heel).applyMatrix4(F.matrixWorld), b = new THREE.Vector3(0, -L.ankleY, L.ball).applyMatrix4(F.matrixWorld);
        tr[k + 'h'].push([i / 60, h.x, h.y, h.z]); tr[k + 't'].push([i / 60, b.x, b.y, b.z]);
      }
    }
    const r = MET.footSlide(tr); return { mean: r.meanCmS, pen: r.maxPenCm, n: r.contactFrames };
  };
  const walk = run(true, 2.2), walkOff = run(false, 2.2), jog = run(true, 3.4), jogOff = run(false, 3.4);
  console.log(`    歩き 2.2m/s：固定なし ${walkOff.mean.toFixed(2)} → 固定 ${walk.mean.toFixed(2)}cm/s（着いたこま ${walk.n}）・走り 3.4m/s：${jogOff.mean.toFixed(2)} → ${jog.mean.toFixed(2)}cm/s`);
  assert.ok(walk.mean <= 0.8, '歩き ' + walk.mean); assert.ok(walk.n > 200, '足が床に着いている ' + walk.n);
  assert.ok(jog.mean < jogOff.mean, '走り'); assert.ok(walk.pen < 1 && jog.pen < 1, '床に入らない');
  holder.remove(m.vrm.scene);
});

await t('補助の骨（ひざ・ひじ・肩）：VRM にあり・読み手が子の骨の半分だけ回す・重みが付いている', () => {
  for (const k of ['dannoura', 'companion', 'daughter']) {
    const m = models[k]; assert.equal(m.stats.halfJoints, 6, k);
    const H = m.vrm.humanoid, knee = H.getNormalizedBoneNode('leftLowerLeg');
    knee.rotation.set(1.6, 0, 0); m.update(1 / 60);
    let h = null; m.vrm.scene.traverse(o => { if (o.name === 'ext_half_leftLowerLeg') h = o; });
    const src = H.getRawBoneNode('leftLowerLeg');
    const a = 2 * Math.acos(Math.min(1, Math.abs(h.quaternion.w))), b = 2 * Math.acos(Math.min(1, Math.abs(src.quaternion.w)));
    assert.ok(Math.abs(a - b / 2) < 0.02, `${k}：補助の骨 ${a.toFixed(3)}・ひざ ${b.toFixed(3)}`);
    assert.ok(h.scale.x > 1.0, '曲げで少し膨らむ');
    knee.rotation.set(0, 0, 0); m.update(1 / 60);
    let used = false; m.vrm.scene.traverse(o => { if (o.isSkinnedMesh && !used) { const i = o.skeleton.bones.indexOf(h); if (i >= 0) { const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight; for (let v = 0; v < si.count && !used; v++) for (let c = 0; c < 4; c++) if (si.getComponent(v, c) === i && sw.getComponent(v, c) > 0.3) used = true; } } });
    assert.ok(used, k + '：ひざの皮が補助の骨に付く');
  }
  assert.ok(/def add_half_joints/.test(read('tools/blender/char/rig.py')) && /HALF\[:\] = R\.add_half_joints\(Sk\)/.test(read('tools/blender/char/build_char.py')));
});

await t('娘：4 歳らしい手足（股関節の高さ ÷ 背の高さ ≤0.46（前 0.50）・腕の長さ ÷ 背 ≤0.26（前 0.27））・背は 1m 前後・意匠（髪・服・色）の作り方は同じ', () => {
  const m = models.daughter, H = m.vrm.humanoid, p = nm => H.getNormalizedBoneNode(nm).getWorldPosition(new THREE.Vector3());
  const h = m.stats.heightM, hip = p('leftUpperLeg').y, arm = p('leftUpperArm').distanceTo(p('leftLowerArm')) + p('leftLowerArm').distanceTo(p('leftHand'));
  console.log(`    娘：背 ${h.toFixed(3)}m・股 ${(hip / h).toFixed(3)}・腕 ${(arm / h).toFixed(3)}`);
  assert.ok(h > 0.93 && h < 1.08, '背 ' + h); assert.ok(hip / h <= 0.46, '脚 ' + hip / h); assert.ok(arm / h <= 0.26, '腕 ' + arm / h);
  const ch = read('tools/blender/char/chars.py');
  assert.ok(/'daughter': dict\(body='female', face='female', look=LOOK_DAUGHTER, height=1\.0, headScale=1\.62, scale=0\.635, limbs=dict\(legs=0\.84, arms=0\.86\)/.test(ch));
  assert.ok(/fn='hair_pigtails'/.test(ch) && /fn='outfit_daughter'/.test(ch) && /fn='acc_daughter'/.test(ch), '髪・服・小物は同じ');
});

await t('目の奥行き（黒目のくぼみ）・服の形のしわ（上着のひじ・手首・わき・すそ／ズボンのひざ・すそ）', () => {
  const hd = read('tools/blender/char/head.py'), fc = read('tools/blender/char/face.py'), of = read('tools/blender/char/outfits.py');
  assert.ok(/def build_eye\(B, side, E, re, hole_depth, skin_f, lod=1\.0, iris=None\)/.test(hd) && /dep = 0\.0011/.test(hd) && /iris=look\.get\('iris'/.test(fc));
  assert.ok(/elbow = SS\(0\.065, 0\.0/.test(of) && /wrist = SS\(ax - 0\.14/.test(of) && /def p_off\(P\)/.test(of));
});

console.log(`shinshoku-p18: ${n} 件 OK`);
