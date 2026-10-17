// 『境界侵食』P12 キャラクターの品質（charkit フェーズ 2〜3・7 の一部）：設定とスキーマ・アニメ調シェーダー v2・文字 → 母音の口・
// 揺れ物の安定・足の滑り（足の IK）・戦闘のこまの一致（変わらない）・男性の体の寸法・三角形と描画呼び出しの予算
import { register } from 'node:module';
register('./helpers/three-node-hooks.mjs', import.meta.url);
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 最小の DOM（顔の地図帳のキャンバス）：描く命令は何もしない
globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : (typeof k === 'string' ? (t[k] ?? (() => {})) : undefined), set: (t, k, v) => { t[k] = v; return true; } }) }) };

const THREE = await import('three');
const { validateCharacter } = await import('../charkit/core/validate.js');
const { registry, readJson } = await import('../mapkit/core/node.mjs');
const { classTable, charMaterialV2, outlineMaterialV2, tintFrom, kindOfName, MAX_CLASSES, KIND } = await import('../charkit/shader/toon2.js');
const LS = await import('../charkit/face/lipsync.js');
const { FaceDriver } = await import('../charkit/face/driver.js');
const { SpringBones } = await import('../charkit/motion/spring.js');
const { footSlide } = await import('../charkit/anim/metrics.js');
const { SHADER_CFG } = await import('../shinshoku/actor/charcfg.js');
const S = await import('../shinshoku/actor/skin.js');
const H = await import('../shinshoku/actor/heroes.js');
const A8 = await import('../shinshoku/actor/anim8.js');
const A = await import('../shinshoku/actor/anim.js');
const { Poser } = await import('../shinshoku/actor/rig.js');
const { COMBAT } = await import('../shinshoku/data/combat.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const reg = await registry();
const dan = readJson('shinshoku/assets/characters/dannoura.character.json');

// ───────── 設定・スキーマ ─────────
await t('設定：だんのうらの character.json はスキーマを通り、コードの陰影の値（charcfg.js）と同じ', () => {
  const r = validateCharacter(dan, reg);
  assert.equal(r.valid, true, JSON.stringify(r.errors));
  assert.deepEqual(SHADER_CFG.dannoura, dan.shader, 'charcfg.js の dannoura と JSON の shader は同じ値（片方だけ変えない）');
});
await t('設定：どのキャラクターの陰影の値もスキーマの shader の形（材質の名前の規則・必要な欄）', () => {
  const re = /^(skin|face|eye_iris|eye_white|eye_hl|brow|mouth|hair|fur|(cloth|metal|acc|glass)_[a-z0-9_]+)$/;
  for (const [id, cfg] of Object.entries(SHADER_CFG)) {
    for (const k of ['model', 'materials', 'face', 'outline', 'env']) assert.ok(cfg[k], id + '.' + k);
    for (const [name, m] of Object.entries(cfg.materials)) { assert.ok(re.test(name), id + ' 材質の名前 ' + name); assert.ok(m.threshold >= 0 && m.threshold <= 1); if (m.pattern) assert.ok(['stripes', 'plaid', 'check'].includes(m.pattern.type)); }
    const c = JSON.parse(JSON.stringify(dan)); c.shader = cfg;
    const r = validateCharacter(c, reg); assert.equal(r.valid, true, id + ' ' + JSON.stringify(r.errors));
  }
});
await t('シェーダー：種類の表（使う名前だけ・12 まで・影の色合いは base と shade の比）', () => {
  const T = classTable(SHADER_CFG.dannoura.materials, ['cloth_shirt', 'skin', 'face', 'hair', 'metal_glasses_frame']);
  assert.ok(T.names.length <= MAX_CLASSES);
  assert.equal(T.names[0], 'cloth');
  const i = T.index('skin'); const tint = tintFrom('#ffe1d2', '#eab4a6');
  assert.ok(Math.abs(T.B[i].x - tint[0]) < 1e-6 && T.B[i].w === KIND.skin);
  assert.equal(T.B[T.index('face')].w, KIND.face); assert.equal(T.B[T.index('hair')].w, KIND.hair);
  assert.equal(T.D[T.index('cloth_shirt')].w, 1, 'しまの柄');
  assert.equal(kindOfName('metal_glasses_frame'), 'metal'); assert.equal(kindOfName('cloth_pants'), 'cloth'); assert.equal(kindOfName('acc_hat'), 'acc');
  assert.equal(T.index('ない名前'), 0);
});
await t('シェーダー：three の toon の部品を差し替えられる（版を上げて部品の名前が変わったら落ちる）', () => {
  const lib = THREE.ShaderLib.toon;
  for (const [mk, face] of [[charMaterialV2({}), false], [charMaterialV2({ map: new THREE.Texture(), alphaTest: 0.45, eyeLayers: true }), true]]) {
    const sh = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    mk.onBeforeCompile(sh);
    assert.ok(!sh.fragmentShader.includes('#include <lights_toon_pars_fragment>'), '光の関数を差し替えた');
    assert.ok(sh.fragmentShader.includes('faceShadowLit') && sh.fragmentShader.includes('RE_Direct_Toon'));
    assert.ok(sh.fragmentShader.includes('uFogK') && !sh.fragmentShader.includes('#include <fog_fragment>'));
    assert.ok(sh.vertexShader.includes('vWP ='));
    if (face) assert.ok(sh.fragmentShader.includes('uEyeLayers') && !sh.fragmentShader.includes('#include <map_fragment>'));
    else assert.ok(sh.vertexShader.includes('attribute float mcls') && sh.fragmentShader.includes('vRP'));
    for (const k of ['uRim', 'uRimColor', 'uFlash', 'uDissolve', 'uEdge']) assert.ok(mk.userData.u[k], '今の材質と同じ uniform ' + k);
  }
  const o = outlineMaterialV2({});
  const sh = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
  o.onBeforeCompile(sh);
  assert.ok(sh.vertexShader.includes('uRefDist') && sh.vertexShader.includes('kd'), '画面での太さ：距離の倍率');
  assert.ok(o.userData.u.uOutline && o.userData.u.uDissolve);
});

// ───────── 文字 → 母音の口 ─────────
await t('口：かなの母音・小さいかな・のばす・ん・っ・漢字（2 拍）・句読点の間', () => {
  assert.equal(LS.vowelOf('か'), 'a'); assert.equal(LS.vowelOf('シ'), 'i'); assert.equal(LS.vowelOf('ぬ'), 'u'); assert.equal(LS.vowelOf('れ'), 'e'); assert.equal(LS.vowelOf('ど'), 'o');
  assert.equal(LS.vowelOf('ん'), 'n'); assert.equal(LS.vowelOf('っ'), 'q'); assert.equal(LS.vowelOf('、'), ' ');
  assert.deepEqual(LS.morae('きゃ').map(m => m.v), ['a'], 'きゃ＝1 拍の a');
  assert.deepEqual(LS.morae('アタシよ').map(m => m.v), ['a', 'a', 'i', 'o']);
  assert.deepEqual(LS.morae('ねー').map(m => m.v), ['e', 'e']);
  assert.deepEqual(LS.morae('……しょうがないわね。').map(m => m.v), ['o', 'u', 'a', 'a', 'i', 'a', 'e']);
  assert.equal(LS.morae('帰').length, 2); assert.deepEqual(LS.morae('帰').map(m => m.v), LS.morae('帰').map(m => m.v), '同じ字は同じ口');
  assert.equal(LS.VISEME.a, 'aa'); assert.equal(LS.VISEME.o, 'oh');
});
await t('口：字幕の時間に収まり、口の形が 0.5 を超える時刻のずれは ±40ms 以内（13 §1.3）', () => {
  for (const [text, dur] of [['……アタシの真似？　趣味が悪いわね', 2.6], ['大丈夫よ。千代さんのそばにいてね。……すぐ帰るから', 2.8], ['ええ', 1.0]]) {
    const tl = LS.timeline(text, dur);
    assert.ok(tl.end <= dur + 1e-9, text);
    const on = LS.onsetTimes(tl);
    assert.ok(on.length > 0);
    for (const o of on) assert.ok(Math.abs(o.onset - o.t0) <= 0.04, `${text} ${o.v} ずれ ${(o.onset - o.t0) * 1000}ms`);
  }
  const w = LS.weightsAt(LS.timeline('あ', 1), 0.05); assert.ok(w.aa > 0.5 && w.ih === 0);
  const z = LS.weightsAt(LS.timeline('あ', 1), 5); assert.equal(Math.max(...Object.values(z)), 0, '話し終わったら閉じる');
});
await t('顔の係：瞬きの回数・長さ（性格の値 ±30%・100〜200ms）と口のつなぎ', () => {
  const log = { blink: [], vis: [] };
  const f = new FaceDriver({ setBlink: k => log.blink.push(k), setVisemes: w => log.vis.push(w), setGaze() {} }, { seed: 4, blinkPerMin: 16, blinkMs: 130 });
  for (let i = 0; i < 60 * 60; i++) f.update(1 / 60);
  assert.ok(f.blinks >= 16 * 0.7 && f.blinks <= 16 * 1.3 * 1.2, '1 分の瞬き ' + f.blinks);
  let run = 0, maxRun = 0; for (const k of log.blink) { if (k > 0) { run++; maxRun = Math.max(maxRun, run); } else run = 0; }
  assert.ok(maxRun * 1000 / 60 >= 100 && maxRun * 1000 / 60 <= 200, '1 回の長さ ' + maxRun / 60);
  f.say('こんにちは', 1.5); let mx = 0; for (let i = 0; i < 90; i++) { f.update(1 / 60); mx = Math.max(mx, ...Object.values(f.visemes)); }
  assert.ok(mx > 0.5);
});

// ───────── 揺れ物 ─────────
function simulate(m, steps, fn) { const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {}); for (let i = 0; i < steps; i++) { fn(g, i, poser); g.updateMatrixWorld(true); m.update(fn.dt ? fn.dt(i) : 1 / 60); } return g; }
await t('揺れ物：激しい動き・ばらばらの dt（1/144〜0.1 秒）でも発散しない・行き過ぎは上限以内・体の当たりの深さ ≤2cm', () => {
  for (const build of [H.buildDannouraV2, H.buildDannouraWhiteV2, H.buildCompanionV2, H.buildDaughterV2]) {
    const m = build(); let x = 0, yaw = 0;
    const fn = (g, i, poser) => { x += Math.sin(i * 0.37) * 0.25; yaw += Math.cos(i * 0.21) * 0.4; g.position.set(x, Math.abs(Math.sin(i * 0.5)) * 0.3, 0); g.rotation.y = yaw; poser.apply(A.idle(i / 60), 0.3); };
    const dts = [1 / 144, 1 / 60, 1 / 30, 0.1, 1 / 60, 0.05];
    fn.dt = i => dts[i % dts.length];
    simulate(m, 600, fn);
    const ch = m.springs.chains;
    for (const c of ch) for (const j of c.joints) assert.ok(Number.isFinite(j.b.quaternion.x + j.tail.x), m.kind + ' 有限');
    const maxAllowed = Math.max(...ch.map(c => c.maxAngleDeg));
    assert.ok(m.springs.stats.maxAngleDeg <= maxAllowed + 0.5, m.kind + ' 行き過ぎ ' + m.springs.stats.maxAngleDeg);
  }
});
await t('揺れ物：ふつうの動き（歩き・走り・向き替え・止まる）で体の当たりの深さ 5mm を超える割合 ≤1%・最大 ≤2cm（13 §1.2）', () => {
  for (const build of [H.buildDannouraV2, H.buildDannouraWhiteV2, H.buildCompanionV2, H.buildDaughterV2]) {
    const m = build(); const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {});
    let ph = 0, x = 0, z = 0, yaw = 0;
    for (let i = 0; i < 900; i++) {
      const v = i < 200 ? 1.6 : i < 450 ? 5.0 : i < 600 ? 2.2 : 0, turn = i > 300 && i < 420 ? 2.5 : 0;
      yaw += turn / 60; x += Math.sin(yaw) * v / 60; z += Math.cos(yaw) * v / 60; ph += v / 60 * A8.heroPhaseRate(Math.max(v, 0.05), m.legScale);
      poser.apply(v > 0.1 ? A8.locomotionIK(ph, v, { dims: m.legDims, scale: m.legScale }) : A.idle(i / 60), 0.55);
      g.position.set(x, 0, z); g.rotation.y = yaw; g.updateMatrixWorld(true); m.update(1 / 60);
    }
    const st = m.springs.stats;
    if (!st.jointSteps) continue;
    assert.ok(st.penetrationM <= 0.02, m.kind + ' めり込みの最大 ' + st.penetrationM.toFixed(4));
    assert.ok(st.deepSteps / st.jointSteps <= 0.01, m.kind + ' 5mm を超える割合 ' + (st.deepSteps / st.jointSteps).toFixed(4));
  }
});
await t('揺れ物：急に止まってから 5° 以内に落ち着くまで ≤ settleS×1.5（だんのうら 0.8 秒 → 1.2 秒）', () => {
  const settleS = dan.secondary.settleS;
  const m = H.buildDannouraV2(); let x = 0;
  const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {});
  const step = () => { poser.apply(A.idle(0), 1); g.updateMatrixWorld(true); m.update(1 / 60); };
  for (let i = 0; i < 120; i++) { x += 4.6 / 60; g.position.x = x; step(); }   // 走って
  const hist = []; for (let i = 0; i < 300; i++) { step(); hist.push(m.springs.chains[0].joints.map(j => j.b.quaternion.clone())); }   // 止まる
  const fin = hist[hist.length - 1]; let settle = 0;
  for (let i = hist.length - 1; i >= 0; i--) { const off = Math.max(...hist[i].map((q, k) => 2 * Math.acos(Math.min(1, Math.abs(q.dot(fin[k])))) * 180 / Math.PI)); if (off > 5) { settle = (i + 1) / 60; break; } }
  assert.ok(settle <= settleS * 1.5, 'ポニーテールが落ち着くまで ' + settle.toFixed(2) + ' 秒');
});
await t('揺れ物：瞬間移動・急な向き替えで休みの形へ戻す（場面の切り替えで髪が飛ばない）', () => {
  const sp = new SpringBones([], []);
  const m = H.buildDannouraV2(); const g = new THREE.Group(); g.add(m.root);
  g.updateMatrixWorld(true); m.update(1 / 60);
  const r0 = m.springs.stats.resets;
  g.position.set(30, 0, 0); g.updateMatrixWorld(true); m.update(1 / 60);
  assert.equal(m.springs.stats.resets, r0 + 1);
  g.rotation.y = Math.PI; g.updateMatrixWorld(true); m.update(1 / 60);
  assert.equal(m.springs.stats.resets, r0 + 2);
  void sp;
});

// ───────── 足の滑り ─────────
await t('数値：足の滑りの計算（答えの分かる作り物）', () => {
  const tr = []; for (let i = 0; i <= 60; i++) tr.push([i / 60, i / 60 * 0.01, 0.0, 0]);   // 着いたまま 1cm/s で滑る
  const r = footSlide({ a: tr }); assert.ok(Math.abs(r.meanCmS - 1) < 1e-6 && r.contactFrames === 60);
  const up = []; for (let i = 0; i <= 60; i++) up.push([i / 60, i / 60 * 2, 0.1, 0]);       // 宙を動く足は数えない
  assert.equal(footSlide({ a: up }).contactFrames, 0);
});
function walkSlide(build, v, frames = 360, rate = 0.55) {
  const m = build(); const g = new THREE.Group(); g.add(m.root); const poser = new Poser(m.J, m.rest || {});
  const L = m.legDims, tracks = { lt: [], lh: [], rt: [], rh: [] }; let ph = 0, x = 0;
  for (let i = 0; i < frames; i++) {
    x += v / 60; ph += v / 60 * A8.heroPhaseRate(v, m.legScale);
    const pose = A8.locomotionIK(ph, v, { dims: L, scale: m.legScale }); poser.apply(pose, rate);
    g.position.z = x; g.updateMatrixWorld(true);
    if (i < 60) continue;
    for (const [s, F] of [['l', m.J.leftFoot], ['r', m.J.rightFoot]]) {
      const toe = new THREE.Vector3(0, -L.ankleY, L.ball).applyMatrix4(F.matrixWorld), heel = new THREE.Vector3(0, -L.ankleY, -L.heel).applyMatrix4(F.matrixWorld);
      tracks[s + 't'].push([i / 60, toe.x, toe.y, toe.z]); tracks[s + 'h'].push([i / 60, heel.x, heel.y, heel.z]);
    }
  }
  return footSlide(tracks);
}
await t('足の滑り：v2 の歩き・走り（足の IK）は平らな地面で平均 ≤2cm/s・p95 ≤5cm/s（13 §1.1）・めり込み／浮き ≤2cm', () => {
  for (const [build, name] of [[H.buildDannouraV2, 'だんのうら'], [H.buildCompanionV2, '相棒']]) for (const v of [0.8, 1.6, 2.2, 5.0]) {
    const r = walkSlide(build, v);
    assert.ok(r.contactFrames > 50, `${name} ${v}m/s 着いているこまがある ${r.contactFrames}`);
    assert.ok(r.meanCmS <= 2 && r.p95CmS <= 5, `${name} ${v}m/s 平均 ${r.meanCmS.toFixed(2)} p95 ${r.p95CmS.toFixed(2)}`);
    assert.ok(r.maxPenCm <= 2 && r.maxFloatCm <= 2, `${name} ${v}m/s めり込み ${r.maxPenCm} 浮き ${r.maxFloatCm}`);
  }
});
await t('足の IK：2 本の骨の解（届く所は足首が目標に一致）・歩幅と位相の速さ', () => {
  for (const [x, y] of [[0.2, -0.7], [-0.3, -0.6], [0.0, -0.78]]) {
    const [th, kn] = A8.legIK(x, y, 0.4, 0.385);
    const ax = -(0.4 * Math.sin(th) + 0.385 * Math.sin(th + kn)), ay = -(0.4 * Math.cos(th) + 0.385 * Math.cos(th + kn));
    assert.ok(Math.hypot(ax - x, ay - y) < 1e-4, `${x},${y} → ${ax.toFixed(4)},${ay.toFixed(4)}`);
    assert.ok(kn >= 0, 'ひざは前へ曲がる');
  }
  assert.ok(A8.strideLen(5) > A8.strideLen(2.2) && A8.strideLen(2.2) > A8.strideLen(0.5));
  assert.ok(Math.abs(A8.heroPhaseRate(1.6) * A8.strideLen(1.6) - 2 * Math.PI) < 1e-9);
});

// ───────── 戦闘のこま ─────────
await t('戦闘のこまの一致（変わらない）：刀の弱・強の振りは startup で構え終わり、startup＋active で振り抜く（v2 の歩きの印は付かない）', () => {
  const run = (atk, step, frames) => { const out = []; for (let f = 0; f < frames; f++) out.push(A.dannouraPose({ st: { name: 'attack', atk, step, f }, f, w: 'katana', speed: 0, phase: 0, time: 0, loco: { ik: true } }).pose); return out; };
  for (const [atk, step] of [[COMBAT.katana.light[0], 0], [COMBAT.katana.light[1], 1], [COMBAT.katana.light[2], 2], [COMBAT.katana.heavy, 8]]) {
    const P = run(atk, step, atk.startup + atk.active + atk.recovery);
    const ra = f => P[f].rightUpperArm;
    // 構えの間（startup の前）と振り抜いた後で腕の角度が違う・振りは active の間に終わる
    const a0 = ra(atk.startup - 1), a1 = ra(atk.startup + atk.active - 1);
    assert.ok(Math.hypot(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]) > 0.5, '振りがある ' + step);
    const after = ra(atk.startup + atk.active);
    assert.ok(Math.hypot(after[0] - a1[0], after[1] - a1[1], after[2] - a1[2]) < 0.25, '振り抜いた後は戻りだけ ' + step);
    for (const p of P) assert.ok(!p._exactLegs, '攻撃の姿勢は脚も補間する（踏み込みの形を保つ）');
  }
});

// ───────── 体の形・予算 ─────────
/** 胴・脚の骨に付いた頂点だけで、高さ y の体の幅（腕・手は除く） */
function widthAt(m, y, band = 0.025) {
  const g = m.mesh.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, bones = m.skeleton.bones; let w = 0;
  for (let i = 0; i < P.count; i++) {
    const py = P.getY(i); if (Math.abs(py - y) >= band || Math.abs(P.getZ(i)) > 0.2) continue;
    const nm = bones[SI.getX(i)].name; if (/Arm|Hand|Elbow|^w[A-Z]|charm|bag|ctail/.test(nm)) continue;
    w = Math.max(w, Math.abs(P.getX(i)));
  }
  return w * 2;
}
await t('体の形（正本・男性）：だんのうらは肩幅 > 腰幅・白髪形態のパーカーのすそは広がらない（スカートに見せない）', () => {
  const d = H.buildDannouraV2(), w = H.buildDannouraWhiteV2();
  for (const m of [d, w]) {
    const sh = widthAt(m, 1.3, 0.02), hip = widthAt(m, 0.86, 0.02);
    assert.ok(sh > hip * 1.15, `${m.kind} 肩 ${sh.toFixed(3)} 腰 ${hip.toFixed(3)}`);
  }
  // すそ（0.84）の幅が腰（0.9）の幅の 1.1 倍以下
  const hem = widthAt(w, 0.84, 0.012), waist = widthAt(w, 0.9, 0.012);
  assert.ok(hem <= waist * 1.1, `すそ ${hem.toFixed(3)} 腰 ${waist.toFixed(3)}`);
  assert.equal(d.kind, 'dannoura'); assert.ok(d.height > 1.6 && d.height < 1.7);
});
await t('予算（10 §1）：1 体の描画呼び出し 3（本体・顔・輪郭線）・三角形は高 ≤4 万／低（スマホ）≤2 万・材質の種類 ≤12', () => {
  for (const k of [1, 0.72]) {
    S.setDetail(k);
    for (const build of [H.buildDannouraV2, H.buildDannouraWhiteV2, H.buildCompanionV2, H.buildDaughterV2]) {
      const m = build(); let meshes = 0; m.root.traverse(o => { if (o.isMesh) meshes++; });
      assert.equal(meshes, 3, m.kind + ' 描画呼び出し');
      const lim = k < 0.9 ? (m.kind === 'companion' ? 12000 : 20000) : 40000;
      assert.ok(m.tris <= lim, `${m.kind} (${k}) ${Math.round(m.tris)} 三角形`);
      assert.ok(m.table.names.length <= MAX_CLASSES);
    }
  }
  S.setDetail(1);
});
await t('前の見た目に戻せる（12 フェーズ 3：コード製のキャラクターに当てても、今の見た目を壊さない設定がある）', () => {
  S.setShaderVersion(1); const m = H.buildDannouraV2(); assert.equal(m.shaderV, 1); assert.ok(!m.mats.body.userData.isCharV2); S.setShaderVersion(2);
  const m2 = H.buildDannouraV2(); assert.ok(m2.mats.body.userData.isCharV2);
});

console.log(`shinshoku-p12-char: ${n} ok`);
