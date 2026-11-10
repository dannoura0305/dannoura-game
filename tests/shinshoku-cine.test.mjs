// 『境界侵食』演出の継ぎ目（遷移）と、動く被写体に合わせるカメラ（shot）。2026-11-10
// 遷移：前の画を写して重ね、溶かす・境界のにじみ・黒／白へ落として明ける（ui/transition.js・game/trans.js）。区画の移動は 黒→読み込み→名前と間→明ける。
// カメラ：戦いの後など立ち位置が毎回ちがう場面でも、話す人・出来事を映す（story/cutscene.js shotCam）。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CutscenePlayer, duration, introOf, outroOf, cutTransitions, shotCam, SHOT_KINDS, camAt } from '../shinshoku/story/cutscene.js';
import { TRANS, TRANS_KINDS, transPlan, transAt, makeNoise } from '../shinshoku/ui/transition.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
// 直す前（main）の各場面の長さ（秒）：延びすぎない（+30% まで）の基準
const BEFORE = {"cs00_lightsout":15.8,"cs00_tv":12.6,"cs01_reunion":14.2,"cs01_broadcast":15,"cs02_boss":15,"cs02_end_rescue":9.2,"cs02_end_neutral":9.2,"cs02_end_kill":8.2,"cs03_hospital":14.6,"cs03_guard":13.2,"cs03_mimics":9,"cs03_truth_rescue":10,"cs03_truth_kill":12,"cs03_line":12.4,"cs03_tunnel":7.4,"cs03_boss":16.4,"cs03_tenki":11.6,"cs03_transform":12,"cs03_suppress":6.8,"cs03_end":13,"cs04_office":11.6,"cs04_broadcast":14.2,"cs04_lab":13,"cs04_trap":14.2,"cs04_reveal":8.6,"cs04_line":15,"cs04_rise":8.4,"cs04_giant":14.8,"cs04_giant_end":16.8,"cs04_suppress":8.2,"cs04_s_win":12.6,"cs04_s_hold":8.8,"cs04_s_end":12.4,"cs05_r_arrive":12.8,"cs05_s_arrive":15.6,"cs05_delay_r":13.2,"cs05_delay_s":13.2,"cs05_r_boss":15.4,"cs05_s_boss":15.4,"cs05_r_after":13.4,"cs05_s_after":19.6,"cs05_r_roof":12.2,"cs06_rampage":16.6,"cs06_injury":5.4,"cs06_calm":13.8,"cs06_end":12.8,"cs06r_ruins":24.2,"cs06r_source":9.8,"cs06a_boss":19.2,"cs06a_boss_end":21.3,"cs06s_arrive":13.8,"cs06s_door":14.2,"cs06s_isolate":16.6,"cs06s_after":8.4,"cs06s_control":23.4,"cs07a_arrive":18.5,"cs07a_boss":18.2,"cs07a_support":17.6,"cs07a_spouse":19.8,"cs07a_end":27.7,"cs07b_arrive":23.6,"cs07b_end":26.7,"cs_end_a":38.2,"cs_end_b":22.2,"cs_end_home_a":27,"cs_end_home_b":27};

t('遷移の計画：種類ごとの長さ・dur で比のまま伸び縮み・hold は延ばすだけ', () => {
  for (const k of ['dissolve', 'seep', 'black', 'white', 'area']) { const p = transPlan(k); assert.ok(p.total > 0.5 && p.total < 3, k); }
  assert.equal(transPlan('cut').total, 0);
  const b = transPlan('black', { dur: 3.7 }); assert.ok(Math.abs(b.total - 3.7) < 1e-9 && Math.abs(b.out / b.in - TRANS.black.out / TRANS.black.in) < 1e-9);
  assert.equal(transPlan('black', { hold: 2.7 }).hold, 2.7); assert.equal(transPlan('black', { hold: 0.01 }).hold, TRANS.black.hold);
  assert.deepEqual(transPlan('white').color, [246, 242, 255]); assert.equal(transPlan('nope').kind, 'dissolve');
});
t('遷移の重ね：黒は 前の画→黒（覆う）→明ける。溶け・にじみは覆わない（演出の時計を止めない）', () => {
  const p = transPlan('black');
  assert.deepEqual([transAt(p, 0).snap, transAt(p, 0).veil], [1, 0]);
  assert.equal(transAt(p, p.out * 0.5).covering, true); assert.equal(transAt(p, p.out + p.hold * 0.5).veil, 1);
  const mid = transAt(p, p.out + p.hold + p.in * 0.5); assert.equal(mid.covering, false); assert.ok(mid.veil > 0.2 && mid.veil < 0.8 && mid.snap === 0);
  assert.equal(transAt(p, p.total + 0.01).phase, 'done');
  const d = transPlan('dissolve'); assert.ok(transAt(d, 0).snap === 1 && transAt(d, d.in / 2).snap < 1 && transAt(d, d.in / 2).snap > 0 && !transAt(d, 0.1).covering);
  const s = transPlan('seep'); assert.ok(transAt(s, s.in / 2).seep > 0.4 && !transAt(s, 0.1).covering);
  const N = makeNoise(64, 36, 3); assert.equal(N.length, 64 * 36); assert.ok(Math.min(...N) === 0 && Math.max(...N) === 1);
  assert.ok(N[18 * 64 + 32] < N[0] + 0.25, 'にじみは真ん中から先に抜ける（次の画の被写体が先に見える）');
});
t('再生器：始まり（intro）・場面の中の切り替え（tr）・終わり（outro）を host.transition に渡す。飛ばした時は短い溶けだけ', () => {
  const log = []; const host = { setCam() {}, subtitle() {}, letterbox() {}, event() {}, actor() {}, sound() {}, done() {}, transition: (k, o, why) => log.push([why, k]) };
  const cs = { id: 'x', cam: [{ t: 0, pos: [0, 1, 0], look: [0, 1, -1] }, { t: 1, pos: [5, 1, 0], look: [5, 1, -1], cut: true, tr: 'seep' }, { t: 2, pos: [0, 1, 5], look: [0, 1, 4], cut: true }], lines: [], dur: 3, intro: { kind: 'black' } };
  const P = new CutscenePlayer(host); P.play(cs); for (let i = 0; i < 200 && P.active; i++) P.update(1 / 60);
  assert.deepEqual(log, [['intro', 'black'], ['cut', 'seep'], ['outro', 'dissolve']]);
  log.length = 0; P.play(cs); P.skip(); assert.deepEqual(log, [['intro', 'black'], ['outro', 'dissolve']], '飛ばすと場面の中の遷移は出さない');
  assert.deepEqual(outroOf(cs, true), { kind: 'dissolve', dur: 0.5 }); assert.equal(introOf({ intro: false }), null);
  assert.deepEqual(cutTransitions(cs), [{ t: 1, kind: 'seep', dur: undefined }]);
  // 覆っている間（freeze）は演出の時計を止める
  P.play(cs); P.update(0.5, { freeze: true }); assert.equal(P.t, 0); P.update(0.5); assert.equal(P.t, 0.5);
});
// 箱 1 つの壁：x=1〜1.2 の縦の壁（z −5〜5）
const WALL = { minX: 1, maxX: 1.2, minZ: -5, maxZ: 5, minY: 0, maxY: 3 };
const clear = (p, q) => { const dx = q[0] - p[0], dz = q[2] - p[2]; for (let i = 1; i < 40; i++) { const x = p[0] + dx * i / 40, z = p[2] + dz * i / 40; if (x > WALL.minX && x < WALL.maxX && z > WALL.minZ && z < WALL.maxZ) return false; } return true; };
const at = id => ({ dan: { x: 0, z: 0, h: 1.5, yaw: Math.PI }, companion: { x: 0, z: -2, h: 1.38, yaw: 0 }, far: { x: 0, z: -12, h: 1.5, yaw: 0 } })[id] || null;
const inFrame = (c, q) => { const a = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], b = [q[0] - c.pos[0], q[1] - c.pos[1], q[2] - c.pos[2]]; const cs = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b)); return Math.acos(Math.max(-1, Math.min(1, cs))) < c.fov * Math.PI / 180 * 0.62; };
t('動く被写体に合わせるカメラ：寄り・肩越し・二人・引き。壁の向こうに置かない・被写体は画面の中', () => {
  for (const shot of SHOT_KINDS) {
    const c = shotCam({ shot, on: 'dan', from: 'companion' }, { at, clear }); assert.ok(c, shot);
    assert.ok(clear(c.pos, [0, 1.44, 0]), shot + '：壁越し'); assert.ok(inFrame(c, [0, 1.44, 0]) || shot === 'back' || shot === 'ots', shot + '：画面の外');
  }
  const close = shotCam({ shot: 'close', on: 'dan', from: 'companion' }, { at, clear });
  assert.ok(close.pos[2] < 0, '寄りは話し相手の方（顔の前）から'); assert.ok(Math.abs(close.look[1] - 1.44) < 1e-9);
  const two = shotCam({ shot: 'two', on: 'dan', from: 'companion' }, { at, clear });
  assert.ok(inFrame(two, [0, 1.44, 0]) && inFrame(two, [0, 1.32, -2]), '二人とも画面の中'); assert.ok(two.pos[0] < 0, '右は壁：反対の側から');
  const ots = shotCam({ shot: 'ots', on: 'companion', from: 'dan' }, { at, clear }); assert.ok(ots.pos[2] > 0 && inFrame(ots, [0, 1.32, -2]), '肩越し：だんのうらの後ろから（相棒）');
  assert.equal(shotCam({ shot: 'two', on: 'dan', from: 'far' }, { at, clear }).look[2] < -5, true, '離れすぎた二人は肩越しに相手');
  assert.equal(shotCam({ shot: 'close', on: 'nobody' }, { at, clear }), null);
  const a = shotCam({ shot: 'close', on: 'dan', from: 'companion' }, { at, clear }, 3); assert.equal(a.ci, 3, '前に選んだ候補を先に試す（揺れない）');
});
t('再生器：shot の鍵は host.shot で人物に合わせて置き直す（host が無い時は前の鍵のまま）', () => {
  let calls = 0; const host = { setCam(p) { this.last = p; }, subtitle() {}, letterbox() {}, event() {}, actor() {}, sound() {}, done() {}, shot: () => { calls++; return { pos: [9, 9, 9], look: [0, 0, 0], fov: 40, ci: 0 }; } };
  const P = new CutscenePlayer(host); P.play({ id: 'y', cam: [{ t: 0, pos: [0, 1, 0], look: [0, 1, -1] }, { t: 1, shot: { shot: 'close', on: 'dan' }, cut: true }], lines: [], dur: 2 });
  for (let i = 0; i < 90; i++) P.update(1 / 60); assert.deepEqual(host.last, [9, 9, 9]); assert.ok(calls > 30, '留まる間も追う');
  const h2 = { setCam(p) { this.last = p; }, subtitle() {}, letterbox() {}, event() {}, actor() {}, sound() {}, done() {} };
  const P2 = new CutscenePlayer(h2); P2.play({ id: 'z', cam: [{ t: 0, pos: [0, 1, 0], look: [0, 1, -1] }, { t: 1, shot: { shot: 'close', on: 'dan' }, cut: true }], lines: [], dur: 2 });
  for (let i = 0; i < 90; i++) P2.update(1 / 60); assert.deepEqual(h2.last, [0, 1, 0]);
});
t('演出のデータ：遷移の種類・shot の種類が正しい・長さは直す前の +30% まで・飛ばせる・帯と字幕', () => {
  const ids = new Set(['dan', 'player', 'companion', 'child', 'boss', 'mamori', 'kiro_t', 'utsushimi', 'touchoku', 'kenkyusha', 'daughter7']);
  let shots = 0, trs = 0;
  for (const cs of Object.values(CUTSCENES)) {
    for (const o of [cs.intro, cs.outro]) if (o) assert.ok(TRANS_KINDS.includes(o.kind), cs.id);
    for (const k of cs.cam) {
      if (k.tr) { trs++; assert.ok(TRANS_KINDS.includes(k.tr) && k.tr !== 'area' && k.cut, cs.id + ' ' + k.t); }
      if (k.shot) { shots++; assert.ok(SHOT_KINDS.includes(k.shot.shot), cs.id); for (const w of [k.shot.on, k.shot.from]) if (w != null) assert.ok(Array.isArray(w) || ids.has(w), cs.id + ' ' + w); }
      else assert.ok(Array.isArray(k.pos) && Array.isArray(k.look), cs.id);
    }
    for (let i = 1; i < cs.cam.length; i++) assert.ok(cs.cam[i].t > cs.cam[i - 1].t, cs.id + ' 鍵の順');
    assert.ok(BEFORE[cs.id], cs.id); assert.ok(duration(cs) <= BEFORE[cs.id] * 1.3 + 0.05, cs.id + ' ' + duration(cs) + ' / ' + BEFORE[cs.id]);
    assert.ok(cs.skippable !== false && cs.letterbox !== false, cs.id);
  }
  assert.ok(shots >= 60 && trs >= 40, shots + ' ' + trs);
  // 結末A：原文の一言の間は白い髪（shot ではなく決まった鍵のまま・切り替えは溶かさない）
  const ea = CUTSCENES.cs_end_a, L = ea.lines.find(l => l.fixed); for (const k of ea.cam) if (k.t > L.t - 0.8 && k.t < L.t + L.dur) assert.ok(!k.shot && !k.tr, '髪の鍵');
  assert.ok(camAt(ea.cam, L.t + 1).look[1] >= 1.5);
});
t('ゲームにつなぐ：区画の移動は黒→読み込み→名前と間→明ける・覆っている間は演出の時計と遊びを止める・章の札は黒の上', () => {
  const m = src('main.js'), s = src('game/story.js'), tr = src('game/trans.js'), ui = src('ui/ui.js');
  assert.match(m, /const smooth = this\.startTrans\('area', \{\}, 'area', info\);/);
  assert.match(m, /this\.cut\.update\(DT, \{ skipHeld: inp\.skipHeld, advance: \(inp\.interact \|\| inp\.attack\) && !cover, freeze: cover \}\)/);
  assert.match(m, /if \(cover\) \{ this\.pendingIn = null; return; \}/);
  assert.match(m, /drawScene\(\) \{ if \(this\.split7\)/); assert.match(m, /this\.trans\.tick\(/);
  assert.match(s, /transition\(kind, opt, why\) \{ g\.startTrans\(kind, opt, why\); \}/); assert.match(s, /shot\(spec, prev\) \{/);
  assert.match(s, /this\.earlyChapterCard\(cs\);/); assert.match(s, /case 'chapterCard': this\.chapterCard\(CHAPTERS\[arg\]\.title\); break;/);
  assert.match(tr, /QS\.get\('trans'\) === '1' \|\| \(!this\.isTest\(\)/, '試験の起動では遷移しない（?trans=1 で使う）');
  assert.match(tr, /if \(T\.active && T\.covering\(\)\) \{/, '覆っている最中は始め直さない');
  assert.match(ui, /cardTick\(dt\) \{/);
  assert.match(src('core/audio.js'), /dip\(out = 0\.6, hold = 0\.3, inn = 1\.0, floor = 0\.3\)/);
  assert.ok(!/ui\.chapterCard\('第[34]章/.test(src('game/ch3.js') + src('game/ch4.js')), '章の札は this.chapterCard（黒の上）');
});
console.log(`shinshoku-cine: ${n} ok`);
