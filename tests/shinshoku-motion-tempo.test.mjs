// 境界侵食：だんのうらの動きの緩急（2026-11-13・利用者「恐怖感がないのはだんのうらの戦闘時のモーションの緩急もだと思います。
//  通常時も動きがよく戦闘が快調。白髪化との差別化ができていない」。方針：じわじわ型のホラー）。
// 確かめること：
//  ・当たり判定のこま・ダメージ・回避／パリィ／一閃の窓・ヒットストップの data は前のまま（見た目の時間配分だけを変える）
//  ・紫（生身）：溜め（構えに早く入ってじわじわ）→ 打ち（速い）→ 余韻（止まる）→ 重い戻り。走り出し・止まりに加減速。息が上がる。被弾でよろける
//  ・白（猫又）：予備動作が短く小さい・戻りが短い・加減速がほとんど無い
//  ・入力の取りこぼしは作らない（押した最初のこまから動く・攻撃の状態のこまは Fighter のまま）
//  ・踏み込みの配分を変えても床の上の足は滑らない（StepPlanter）
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
const src = p => readFileSync(P(p), 'utf8');
const { COMBAT } = await import('../shinshoku/data/combat.js');
const TP = await import('../shinshoku/combat/tempo.js');
const A = await import('../shinshoku/actor/anim.js');
const { Fighter } = await import('../shinshoku/combat/fighter.js');

let n = 0;
const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };
const ATTACKS = { purple: [...COMBAT.katana.light, COMBAT.katana.heavy, ...COMBAT.pipe.light, COMBAT.pipe.heavy, ...COMBAT.matchlock.light], white: [...COMBAT.white.claw, COMBAT.white.blade] };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

await t('当たりのこま・ダメージ・窓・ヒットストップの data は前のまま（見た目の時間配分だけを変える）', () => {
  assert.deepEqual(COMBAT.katana.light.map(a => [a.startup, a.active, a.recovery, a.dmg, a.lunge]), [[6, 4, 14, 10, 0.6], [8, 4, 16, 10, 0.6], [10, 4, 22, 16, 1.6]]);
  assert.deepEqual([COMBAT.katana.heavy.startup, COMBAT.katana.heavy.active, COMBAT.katana.heavy.recovery, COMBAT.katana.heavy.dmg], [18, 6, 26, 30]);
  assert.deepEqual(COMBAT.pipe.light.map(a => [a.startup, a.active, a.recovery, a.dmg]), [[12, 6, 24, 14], [14, 6, 28, 18]]);
  assert.deepEqual(COMBAT.white.claw.map(a => [a.startup, a.active, a.recovery, a.dmg]), [[4, 3, 9, 8], [4, 3, 9, 8], [5, 3, 10, 9], [6, 4, 11, 10], [8, 5, 18, 18]]);
  const D = COMBAT.dodge; assert.deepEqual([D.total, D.iStart, D.iEnd, D.just, D.dist], [24, 3, 14, 8, 4.1]);
  assert.deepEqual(COMBAT.parry, { before: 6, after: 2, stagger: 54, failLag: 18, guardMul: 0.5 });
  assert.deepEqual(COMBAT.hitstop, { light: 3, heavy: 5, issen: 8 });
  assert.deepEqual(COMBAT.hurt, { stun: 16, invuln: 30 });
  assert.equal(COMBAT.buffer, 10);
  assert.deepEqual([COMBAT.move.walk, COMBAT.move.run], [2.2, 5.0]);
});

await t('区間の境は data のこまのまま：構え終わり＝startup の前のこま・振り抜き＝startup＋active の前のこま・戻りの初めは振り抜いた形（紫・白・全部の攻撃）', () => {
  for (const form of ['purple', 'white']) for (const a of ATTACKS[form]) {
    const p = f => TP.atkProgress(form, a, f);
    assert.equal(p(a.startup - 1).seg, 'wind'); assert.ok(p(a.startup - 1).k > 0.999, `${form} 構え終わり ${p(a.startup - 1).k}`);
    assert.equal(p(a.startup).seg, 'strike');
    assert.equal(p(a.startup + a.active - 1).k, 1); assert.equal(p(a.startup + a.active).seg, 'rec'); assert.equal(p(a.startup + a.active).k, 0);
    // クリップの時刻のゆがめ：単調・境はそのまま・全長の中
    let prev = -1;
    for (let f = 0; f < a.startup + a.active + a.recovery; f++) { const c = TP.atkClipF(form, a, f); assert.ok(c >= prev - 1e-9 && c >= 0 && c <= a.startup + a.active + a.recovery, `${form} ${f} ${c}`); prev = c; }
    assert.equal(TP.atkClipF(form, a, a.startup), a.startup); assert.equal(TP.atkClipF(form, a, a.startup + a.active), a.startup + a.active);
  }
});

await t('紫の緩急：溜め（構えの 6 割の時間で約 9 割まで入り、残りはじわじわ）→ 打ち → 余韻（戻りの 38% は止まる）→ 戻りは最後まで使う', () => {
  for (const a of ATTACKS.purple) {
    const p = f => TP.atkProgress('purple', a, f), u60 = Math.max(0, Math.round(a.startup * 0.6) - 1);
    assert.ok(p(u60).k >= 0.8, '溜めに早く入る ' + p(u60).k);
    const holdEnd = a.startup + a.active + Math.floor(a.recovery * 0.38) - 1;
    for (let f = a.startup + a.active; f <= holdEnd; f++) assert.equal(p(f).k, 0, '余韻の間は構えへ戻らない');
    assert.ok(p(a.startup + a.active + a.recovery - 1).k > 0.85 && p(a.startup + a.active + Math.round(a.recovery * 0.6)).k < 0.6, '戻りはゆっくり・最後まで');
  }
});
await t('白の緩急：予備動作は小さく（振りかぶりの 6 割）・戻りは recovery の 6 割で構えへ戻り切る・余韻はほぼ無い', () => {
  for (const a of ATTACKS.white) {
    const p = f => TP.atkProgress('white', a, f);
    assert.ok(p(0).amp <= 0.65);
    assert.ok(p(a.startup + a.active + Math.ceil(a.recovery * 0.6)).k > 0.97, '白は早く戻る');
    assert.ok(p(a.startup + a.active + 1).k >= 0 && TP.TEMPO.white.hold <= 0.1);
  }
  const tp = TP.tempoTable('purple', COMBAT.katana.light[0]), tw = TP.tempoTable('white', COMBAT.white.claw[0]);
  assert.ok(tp.hold > 3 * tw.hold && tw.ready > 0 && tp.ready === 0, '余韻：紫 ' + tp.hold + ' 白 ' + tw.hold);
});

await t('姿勢（手続き）：紫の刀は溜めの終わりで腕が止まり、打ちで速く振り、余韻で止まり、戻りが重い。白の妖爪は構えが小さく戻りが早い', () => {
  const run = (form, atk, step, w) => { const out = []; for (let f = 0; f < atk.startup + atk.active + atk.recovery; f++) out.push(A.dannouraPose({ white: form === 'white', st: { name: 'attack', atk, step, f }, f, w, speed: 0, phase: 0, time: 0, loco: { ik: true } }).pose); return out; };
  const a = COMBAT.katana.light[2], Pp = run('purple', a, 2, 'katana'), v = f => dist(Pp[f].rightUpperArm, Pp[f - 1].rightUpperArm);
  const windTail = v(a.startup - 1), strikePeak = Math.max(...[0, 1, 2, 3].map(i => v(a.startup + i)));
  assert.ok(strikePeak > 4 * windTail, `打ちは溜めの終わりの 4 倍以上速い（${strikePeak.toFixed(3)} / ${windTail.toFixed(3)}）`);
  for (let f = a.startup + a.active + 1; f < a.startup + a.active + Math.floor(a.recovery * 0.38); f++) assert.ok(v(f) < 0.04, '余韻で止まる ' + f + ' ' + v(f).toFixed(3));
  // 白：戻りの 6 割で構え（の手前）まで
  const c = COMBAT.white.claw[0], Pw = run('white', c, 0, 'claw'), e = c.startup + c.active + Math.ceil(c.recovery * 0.6), last = Pw[Pw.length - 1];
  assert.ok(dist(Pw[e].rightUpperArm, last.rightUpperArm) < 0.02, '白は早く構えへ');
  // 紫：同じ割合の所ではまだ戻りの途中
  const ep = a.startup + a.active + Math.ceil(a.recovery * 0.6), lp = Pp[Pp.length - 1];
  assert.ok(dist(Pp[ep].rightUpperArm, lp.rightUpperArm) > 0.3, '紫はまだ戻りの途中');
});

await t('踏み込みの配分：合計の距離は data のまま（割合の和 1）・紫は打ちで踏み込み、白は先に入る', () => {
  for (const form of ['purple', 'white']) for (const a of ATTACKS[form]) {
    const dur = a.startup + a.active + 2; let s = 0; for (let f = 0; f < dur; f++) s += TP.lungeShare(form, a, f);
    assert.ok(Math.abs(s - 1) < 1e-9, form + ' 和 ' + s); assert.equal(TP.lungeShare(form, a, dur), 0);
    const w = TP.lungeShare(form, a, 0), k = TP.lungeShare(form, a, a.startup);
    assert.ok(form === 'purple' ? k > w * 2 : w > k * 2, form);
  }
});

await t('ヒットストップ：紫は重い（弱 4・強 7）・白は鋭い（弱 2・強 4）。前は両方 3・5', () => {
  assert.ok(TP.hitstopFor('purple', false) > COMBAT.hitstop.light && TP.hitstopFor('purple', true) > COMBAT.hitstop.heavy);
  assert.ok(TP.hitstopFor('white', false) < COMBAT.hitstop.light && TP.hitstopFor('white', true) < COMBAT.hitstop.heavy);
  assert.ok(TP.punchFor('purple', true).deg > TP.punchFor('white', true).deg && TP.punchFor('purple', true).t > TP.punchFor('white', true).t);
});

const runMove = (form, frames, stopAt) => { const M = new TP.Motion(), out = []; let d = 0; for (let i = 0; i < frames; i++) { const w = i < stopAt ? 5 : 0; const v = M.step({ form, state: 'free', want: { x: 0, z: w }, smooth: true, run: true }); out.push(Math.hypot(v.x, v.z)); if (i >= stopAt) d += Math.hypot(v.x, v.z) / 60; } return { v: out, stopD: d, M }; };
await t('移動の加減速：押した最初のこまから動く（取りこぼし無し）・紫は走り出し 90% まで 0.25〜0.4 秒・止まりは 0.2〜0.45m 流れて止まり切る／白は走り出しがほぼ即時', () => {
  const p = runMove('purple', 80, 40), w = runMove('white', 80, 40);
  assert.ok(p.v[0] > 0.3 && w.v[0] > 1, '最初のこま ' + p.v[0] + ' ' + w.v[0]);
  const t90 = r => r.v.findIndex(x => x >= 4.5) / 60;
  assert.ok(t90(p) >= 0.25 && t90(p) <= 0.4, '紫 ' + t90(p)); assert.ok(t90(w) <= 0.15, '白 ' + t90(w));
  assert.ok(p.stopD >= 0.2 && p.stopD <= 0.45, '紫の止まり ' + p.stopD); assert.ok(w.stopD < 0.25 && w.stopD < p.stopD, '白の止まり ' + w.stopD);
  assert.equal(p.v[79], 0, '止まり切る');
  { const M = new TP.Motion(); let i = 0; for (; i < 60; i++) { const v = M.step({ form: 'purple', state: 'free', want: { x: 0, z: 2.2 }, smooth: true }); if (Math.hypot(v.x, v.z) >= 1.98) break; } assert.ok(i / 60 < t90(p) && i / 60 >= 0.12, '歩き出しは走り出しより軽い ' + i / 60); }
  // 動けない状態（攻撃・ひるみ）：その場で止まる（前の速さで滑らない）
  const M = p.M; M.vx = 5; const v = M.step({ form: 'purple', state: 'attack', want: { x: 0, z: 0 }, smooth: false }); assert.equal(Math.hypot(v.x, v.z), 0);
  assert.ok(TP.TEMPO.purple.move.turn < 0.25 && TP.TEMPO.white.move.turn > 0.25, '振り向きの速さ（前は 0.25）');
});

await t('息切れ（紫だけ）：連撃と回避で息が上がり（足が最大 −10%・肩で息をする）、休むと戻る。白は息が上がらない', () => {
  const M = new TP.Motion(), W = new TP.Motion();
  for (const ev of [{ t: 'attackStart' }, { t: 'attackStart' }, { t: 'attackStart' }, { t: 'dodge' }, { t: 'attackStart', heavy: true }, { t: 'dodge' }]) { M.onEvent(ev, 'purple', 'katana'); W.onEvent(ev, 'white', 'claw'); }
  assert.ok(M.tired > 0.6, '紫 ' + M.tired); assert.equal(W.tired, 0);
  const mul = M.speedMul('purple'); assert.ok(mul < 1 && mul >= 0.9, '足 ' + mul);
  const ov = TP.bodyOverlay({ form: 'purple', st: 'free', time: 0.3, speed: 0, tired: M.tired }), ov0 = TP.bodyOverlay({ form: 'purple', st: 'free', time: 0.3, speed: 0, tired: 0 });
  assert.ok(ov.spine[0] > 0.05 && ov0.spine[0] === 0, '前屈み（肩で息）');
  const breath = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map(tt => TP.bodyOverlay({ form: 'purple', st: 'free', time: tt, speed: 0, tired: 0.9 }).chest[0]);
  assert.ok(Math.max(...breath) - Math.min(...breath) > 0.03, '胸が上下する');
  for (let i = 0; i < 60 * 6; i++) M.step({ form: 'purple', state: 'free', want: { x: 0, z: 0 }, smooth: true });
  assert.ok(M.tired < 0.05, '休むと戻る ' + M.tired);
  // 走り続けるだけでは足が遅くならない（息切れは戦いで上がる）
  const R = new TP.Motion(); for (let i = 0; i < 60 * 30; i++) R.step({ form: 'purple', state: 'free', want: { x: 0, z: 5 }, smooth: true, run: true });
  assert.ok(R.speedMul('purple') === 1, '走りだけ ' + R.tired);
  // Fighter の出来事でつながる（attackStart・dodge）
  const F = new Fighter(), K = new TP.Motion(); const evs = F.tick({ attack: true }); for (const e of evs) K.onEvent(e, 'purple', F.weapon); assert.ok(K.tired > 0);
});

await t('よろけ：紫は当たった瞬間に大きく受け（ひるみのクリップの半分近くまで 0.22）ゆっくり戻る・その後 0.6 秒は前屈みで足が遅い。白は短く受けて早く戻る', () => {
  assert.ok(Math.abs(TP.hurtClipU('purple', 0.22) - 0.465) < 1e-9 && Math.abs(TP.hurtClipU('purple', 1) - 0.93) < 1e-9, 'クリップの最後のこまへは行かない');
  assert.ok(Math.abs(TP.hurtClipU('white', 0.625) - 0.93) < 1e-9, '白は 10 こまで受け切る');
  let prev = -1; for (let u = 0; u <= 1; u += 0.05) { const x = TP.hurtClipU('purple', u); assert.ok(x >= prev); prev = x; }
  const M = new TP.Motion(); M.step({ form: 'purple', state: 'hurt', want: { x: 0, z: 0 } }); M.step({ form: 'purple', state: 'free', want: { x: 0, z: 0 }, smooth: true });
  assert.ok(M.hurtL > 0.9 && M.speedMul('purple') < 0.6, 'よろけの直後 ' + M.speedMul('purple'));
  assert.ok(TP.bodyOverlay({ form: 'purple', st: 'free', hurtL: M.hurtL }).spine[0] > 0.15, '前屈み');
  for (let i = 0; i < 40; i++) M.step({ form: 'purple', state: 'free', want: { x: 0, z: 0 }, smooth: true });
  assert.equal(M.hurtL, 0);
  const Wm = new TP.Motion(); Wm.step({ form: 'white', state: 'hurt', want: { x: 0, z: 0 } }); Wm.step({ form: 'white', state: 'free', want: { x: 0, z: 0 }, smooth: true });
  assert.ok(Wm.speedMul('white') > 0.9);
  // 手続きの姿勢：紫は f 4 から崩れていく・白は f 10 で構えへ
  const hp = f => A.dannouraPose({ st: { name: 'hurt', f }, f, w: 'katana', speed: 0, phase: 0, time: 0, hurtDir: 'front' }).pose;
  assert.ok(hp(15).spine[0] > hp(2).spine[0] + 0.3, '紫は前へ折れる');
  const hw = f => A.dannouraPose({ white: true, st: { name: 'hurt', f }, f, w: 'claw', speed: 0, phase: 0, time: 0, hurtDir: 'front' }).pose;
  assert.ok(Math.abs(hw(12).spine[0] - 0.12) < 0.02, '白は構えへ ' + hw(12).spine[0]);
});

// VRoid のだんのうら（本物の骨）：新しい踏み込みの配分でも、床の上の足が滑らない
const { loadVRMModel } = await import('../charkit/runtime/vrmrt.js');
const { StepPlanter } = await import('../charkit/anim/limbik.js');
const stubTex = l => { l.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) })); l.register(() => ({ name: 'stubtex', loadTexture: () => Promise.resolve(new THREE.Texture()) })); };
const m = await loadVRMModel(buf('shinshoku/assets/characters/dannoura.vrm'), { height: 1.64, fit: 'none', loader: stubTex });
const holder = new THREE.Group(); holder.add(m.vrm.scene);
const J = m.J, L = m.legDims;
const rest = (() => { const B = Object.values(J); return { q: B.map(b => b.quaternion.clone()), h: J.hips.position.clone(), back() { B.forEach((b, i) => b.quaternion.copy(this.q[i])); J.hips.position.copy(this.h); } }; })();
function lungeSlide(form, a) {
  rest.back(); holder.position.set(0, 0, 0); holder.updateMatrixWorld(true);
  const S = new StepPlanter(J); const prev = {}; let sk = 0, skN = 0;
  const dur = a.startup + a.active + 2, total = a.startup + a.active + a.recovery + 20; let z = 0;
  for (let i = 0; i < total; i++) {
    rest.back();
    z += a.lunge * TP.lungeShare(form, a, i); holder.position.z = z; holder.updateMatrixWorld(true);
    S.update(1 / 60, { active: i < total - 8, settle: i >= a.startup + a.active + 2, ground: 0, body: holder.position });
    m.vrm.scene.updateMatrixWorld(true);
    for (const s of ['left', 'right']) for (const [nm, zz] of [['h', -L.heel], ['b', L.ball]]) {
      const p = new THREE.Vector3(0, -L.ankleY, zz).applyMatrix4(J[s + 'Foot'].matrixWorld), q = prev[s + nm];
      if (q && Math.max(p.y, q.y) < 0.02) { sk += Math.hypot(p.x - q.x, p.z - q.z) * 60; skN++; }
      prev[s + nm] = p;
    }
  }
  void dur; rest.back();
  return { mean: skN ? sk / skN * 100 : 0, z };
}
await t('踏み込みの足：紫（打ちで 1.6m）・白（先に入る）でも床の上の足の滑り ≤15cm/s（StepPlanter：一歩ずつ）', () => {
  for (const [form, a] of [['purple', COMBAT.katana.light[0]], ['purple', COMBAT.katana.light[2]], ['purple', COMBAT.pipe.heavy], ['white', COMBAT.white.claw[4]], ['white', COMBAT.white.blade]]) {
    const r = lungeSlide(form, a);
    console.log(`    ${form} 踏み込み ${a.lunge}m（startup ${a.startup}）：足の滑り ${r.mean.toFixed(1)}cm/s`);
    assert.ok(r.mean <= 15, `${form} ${a.lunge} ${r.mean}`); assert.ok(Math.abs(r.z - a.lunge) < 1e-9);
  }
});

await t('つなぎ：ゲームは tempo の値で踏み込み・ヒットストップ・寄り・加減速・息切れ・よろけを使う。VRM のクリップにも同じ緩急（atkF・hurtU）。残像は白だけ', () => {
  const c = src('shinshoku/game/combat.js');
  assert.match(c, /lungeShare\(form, st\.atk, st\.f\)/); assert.match(c, /this\.hitstop = hitstopFor\(/); assert.match(c, /this\.cam\.punch\(pu\.deg, pu\.t\)/);
  assert.match(c, /M\.step\(\{ form, state: st\.name/); assert.match(c, /M\.onEvent\(ev, form, F\.weapon\)/); assert.match(c, /M\.turnRate\(form\)/);
  const ac = src('shinshoku/actor/actors.js');
  assert.match(ac, /atkF: sn === 'attack'/); assert.match(ac, /hurtU: u => hurtClipU\(/); assert.match(ac, /applyOverlay\(m\.J, this\.overlay/);
  const ca = src('charkit/anim/clipanim.js'); assert.match(ca, /ctx\.atkF \? ctx\.atkF\(ctx\.f \|\| 0\)/); assert.match(ca, /ctx\.hurtU \? ctx\.hurtU\(u\) : u/);
  const w = src('shinshoku/game/ch3.js'); assert.match(w, /if \(on && dt > 0 && fast\)/);
  // 手続きの姿勢も同じ tempo
  assert.match(src('shinshoku/actor/anim.js'), /atkProgress\('purple', a, f\)/); assert.match(src('shinshoku/actor/anim.js'), /atkProgress\('white', a, f\)/);
});

console.log(`shinshoku-motion-tempo: ${n} ok`);
