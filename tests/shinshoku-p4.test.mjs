// 『境界侵食』フェーズ4：第3章（病院・地下通路）と白髪形態。ルートの構え・妖力・連撃・模倣する影・写し身・記録のない患者・守り手・段・原文の台詞・セーブ
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Fighter } from '../shinshoku/combat/fighter.js';
import { COMBAT } from '../shinshoku/data/combat.js';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { newRouteState, setStance, choose, whiteAllowed, normalizeRoute, logKey, logYokai, currentStance, STANCES } from '../shinshoku/story/route.js';
import { mimicPlan, Mimic, Utsushimi, ACT_CAT } from '../shinshoku/ai/mimic.js';
import { Kanja } from '../shinshoku/ai/kanja.js';
import { Mamori } from '../shinshoku/ai/mamori.js';
import { STEPS, TARGETS, CHAPTERS, atLeast, chapterNo, afterTenki, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH, AREA_DATA, HOSP } from '../shinshoku/data/areas.js';
import * as PZ from '../shinshoku/story/puzzles.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CUTSCENES3, LINE_CH3 } from '../shinshoku/story/cutscenes3.js';
import { fixedLines, duration, CutscenePlayer } from '../shinshoku/story/cutscene.js';
import { SaveStore, SLOT_NAMES, migrate, makeSlot, SAVE_KEY } from '../shinshoku/save/save.js';
import { whitePose, kanjaPose, mimicPose, mamoriPose, childPose } from '../shinshoku/actor/anim.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };

// ── ルートの構え（第3章の転機） ──
t('構え：記録は kind:"stance"（ルートは決めない）・同じ入力は同じ記録・選び直しは追記', () => {
  const a = setStance(newRouteState(), 'secret', { at: 1, snapshot: { trust: 50 } });
  const b = setStance(newRouteState(), 'secret', { at: 2, snapshot: { trust: 50 } });
  assert.equal(logKey(a), logKey(b));
  assert.equal(a.stance, 'secret'); assert.equal(a.route, null); assert.equal(a.routeLock, null);
  const L = a.branchLog[0]; assert.equal(L.kind, 'stance'); assert.equal(L.locksRoute, false); assert.equal(L.chapter, 'ch03'); assert.equal(L.decision, 'secret');
  const c = setStance(a, 'reveal', { via: 'load_tenki' }); assert.equal(c.stance, 'reveal'); assert.equal(c.branchLog.length, 2); assert.equal(c.branchLog[1].via, 'load_tenki'); assert.equal(c.forms.whiteUnlocked, true);
  // 第4章の分岐は構えに関係なく両方選べる
  assert.equal(choose(c, 'secret', {}).route, 'secret'); assert.equal(choose(a, 'reveal', {}).route, 'reveal');
  assert.equal(currentStance(c), 'reveal'); assert.equal(currentStance(choose(c, 'secret', {})), 'secret');
  assert.deepEqual(Object.keys(STANCES), ['reveal', 'secret']);
  assert.throws(() => setStance(a, 'giant'));
});
t('白い姿の許可：秘匿の構え／ルート＝無効、解禁前＝無効、相棒が見ている＝無効（正体を知らない間）', () => {
  const s0 = newRouteState();
  assert.deepEqual(whiteAllowed(s0, {}), { ok: false, why: 'locked' });
  const sec = setStance(s0, 'secret'); assert.equal(whiteAllowed(sec, {}).why, 'stance');
  const rev = setStance(s0, 'reveal'); assert.equal(whiteAllowed(rev, {}).ok, true); assert.equal(whiteAllowed(rev, { companionWatching: true }).why, 'watched');
  const routeSecret = choose(rev, 'secret', {}); assert.equal(whiteAllowed(routeSecret, { chapterNo: 6 }).why, 'route', '秘匿のルートでは第3章で選んだ構えに関係なく無効');
  const routeReveal = choose(sec, 'reveal', {}); assert.equal(whiteAllowed(routeReveal, { chapterNo: 5, companionWatching: true }).ok, true, '相棒が知っていれば見られても良い');
  const old = normalizeRoute({ route: null, branchLog: [] }); assert.equal(old.stance, null); assert.equal(old.forms.whiteUnlocked, false);
  const y = logYokai(rev, { chapter: 'ch3', step: 'ch3_boss2', form: 'white', src: 'free', sec: 1 }); assert.equal(y.yokaiLog.length, 1); assert.deepEqual(y.reveal.firstWhiteAt, { chapter: 'ch3', step: 'ch3_boss2' });
});

// ── 白髪形態（Fighter） ──
const wf = (yoki = 80) => { const F = new Fighter({ owned: ['katana', 'pipe'], weapon: 'katana', yoki, yokiOn: true }); return F; };
t('化けを解く：妖力 30 以上で白へ（武器は妖爪）・戻ると元の武器。妖力が足りないと失敗', () => {
  const F = wf(20); assert.equal(F.setForm('white'), false); F.yoki = 40; assert.equal(F.setForm('white'), true);
  assert.equal(F.form, 'white'); assert.equal(F.weapon, 'claw'); assert.equal(F.melee, true);
  F.setForm('purple'); assert.equal(F.weapon, 'katana');
});
t('妖力：白い姿で減り、0 で静かに紫へ戻る（revert）。紫では時間で少し溜まる（解禁後だけ）', () => {
  const F = wf(32); F.setForm('white'); let rev = 0;
  for (let i = 0; i < 60 * 30 && F.white; i++) for (const e of F.tick({})) if (e.t === 'revert') rev++;
  assert.equal(F.form, 'purple'); assert.equal(rev, 1); assert.ok(F.yoki <= 0.01);
  for (let i = 0; i < 120; i++) F.tick({}); assert.ok(F.yoki > 1.5, '紫で回復');
  const G = new Fighter({ yoki: 0 }); for (let i = 0; i < 120; i++) G.tick({}); assert.equal(G.yoki, 0, '解禁前は溜まらない');
  assert.equal(G.gainYoki('hit'), 0);
  const H = wf(50); H.setForm('white'); const b = H.yoki; H.gainYoki('issen'); assert.equal(Math.round(H.yoki - b), COMBAT.white.gauge.issen);
});
t('妖爪：5 段（発生 4/4/5/6/8f）・妖刀（長押しで刃の伸びる刀・妖力 5）', () => {
  const F = wf(); F.setForm('white');
  const starts = [];
  F.tick({ attack: true }); starts.push(F.st.atk.startup);
  for (let k = 0; k < 4; k++) { let guard = 0; while (F.st.name === 'attack' && F.st.f < F.st.atk.startup + F.st.atk.active && guard++ < 60) F.tick({}); F.tick({ attack: true }); for (let i = 0; i < 2 && F.st.step === k; i++) F.tick({}); starts.push(F.st.atk.startup); }
  assert.deepEqual(starts, [4, 4, 5, 6, 8]); assert.equal(F.st.atk.dmg, 18);
  for (let i = 0; i < 60; i++) F.tick({});
  const y0 = F.yoki; for (let i = 0; i < 14; i++) F.tick({ heavy: true }); const ev = F.tick({ heavy: false });
  assert.ok(ev.some(e => e.t === 'attackStart' && e.blade)); assert.ok(Math.abs(y0 - F.yoki - 5) < 1.0); assert.ok(F.st.atk.reach > COMBAT.katana.heavy.reach * 1.5);
});
t('猫火（構え＋撃つ・妖力 10）・幻術（弾く・妖力 15）・足りないと noYoki', () => {
  const F = wf(27); assert.equal(F.setForm('white'), false); F.setForm('white', true);
  F.tick({ aim: true }); let ev = F.tick({ aim: true, attack: true }); assert.ok(ev.some(e => e.t === 'foxfire' && e.n === 3)); assert.ok(F.yoki < 17.1);
  for (let i = 0; i < 30; i++) F.tick({});
  ev = F.tick({ parry: true }); assert.ok(ev.some(e => e.t === 'illusion')); assert.ok(F.yoki < 1.2);
  for (let i = 0; i < 13; i++) F.tick({});
  assert.equal(F.form, 'white'); ev = F.tick({ parry: true }); assert.ok(ev.some(e => e.t === 'noYoki'));
  assert.ok(!ev.some(e => e.t === 'parryStart'), '白い姿で「弾く」はパリィではない');
});
t('瞬歩：白い姿の回避は 18f・無敵 2〜12f（紫は 24f・3〜14f）・ジャスト回避はどちらも', () => {
  const F = wf(); F.setForm('white'); F.tick({ dodge: true });
  assert.equal(F.st.name, 'dodge'); assert.equal(F.st.white, true);
  F.tick({}); F.tick({}); assert.equal(F.isInvuln(), true);
  let f = 0; while (F.st.name === 'dodge' && f++ < 40) F.tick({}); assert.ok(f <= 18, `瞬歩の長さ ${f}`);
  const G = wf(); G.tick({ dodge: true }); let g = 0; while (G.st.name === 'dodge' && g++ < 40) G.tick({}); assert.ok(g >= 22);
  const H = wf(); H.setForm('white'); H.tick({ dodge: true }); H.tick({}); H.tick({}); const r = H.incoming({ src: {}, dmg: 10, parryable: true, inRange: true, nearMiss: true }); assert.equal(r, 'just');
});
t('連撃の数：続けて当てると増え、2.5 秒空くと 0・倍率は白い姿だけ（10 連撃ごと +0.1）・被弾で 0', () => {
  const F = wf(); F.setForm('white');
  for (let i = 0; i < 25; i++) { F.registerHit(); F.tick({}); }
  assert.equal(F.comboN, 25); assert.ok(Math.abs(F.comboMul() - 1.2) < 1e-9);
  for (let i = 0; i < COMBAT.white.comboWindow + 2; i++) F.tick({}); assert.equal(F.comboN, 0);
  F.registerHit(); F.registerHit(); F.incoming({ src: {}, dmg: 5, parryable: false, inRange: true, nearMiss: true }); F.drain(); assert.equal(F.comboN, 0);
  const P = wf(); for (let i = 0; i < 30; i++) P.registerHit(); assert.equal(P.comboMul(), 1, '紫の姿は倍率なし');
  assert.equal(P.combo.max, 30);
});

// ── 模倣する影 ──
t('写し方（mimicPlan）：斬り続け→連撃（最大 3）・避け続け→突き・撃つ→影の弾・弾く→つかみ・白い動きは white', () => {
  assert.deepEqual([mimicPlan(['slash', 'slash', 'slash']).name, mimicPlan(['slash', 'slash', 'slash']).hits], ['mslash', 3]);
  assert.equal(mimicPlan(['slash', 'slash', 'slash', 'slash', 'slash']).hits, 3);
  assert.equal(mimicPlan(['dodge', 'dodge', 'slash']).name, 'mlunge');
  assert.equal(mimicPlan(['shot', 'shot']).name, 'mshot'); assert.equal(mimicPlan(['foxfire']).name, 'mshot');
  assert.equal(mimicPlan(['parry', 'slash', 'parry']).name, 'mgrab');
  assert.equal(mimicPlan([]).name, 'mslash'); assert.equal(mimicPlan(['slash', 'dodge']).name, 'mlunge', '同数なら最後の動き');
  const w = mimicPlan(['claw', 'claw', 'claw', 'claw']); assert.equal(w.white, true); assert.equal(w.hits, 4); assert.equal(w.label, '写：爪爪爪爪');
  for (const k of Object.keys(ACT_CAT)) assert.ok(['melee', 'dodge', 'shot', 'guard'].includes(ACT_CAT[k]));
  for (const a of ['mslash', 'mlunge', 'mshot', 'mgrab']) assert.ok(ENEMIES.mimic.attacks[a]);
  assert.equal(ENEMIES.mimic.attacks.mslash.parryable, true); assert.equal(ENEMIES.mimic.attacks.mlunge.parryable, false);
});
t('化けた影：近づく（3m）か叩かれると 0.9 秒の予兆（崩れる・無敵）→ 敵対。叩いても化けている間はダメージ 0', () => {
  const m = new Mimic({ id: 'm', pos: { x: 0, z: 0 }, disguise: 'companion', lure: 'mimic_lure_companion' });
  let ev = run(m, { player: { x: 0, z: 8, noise: 'walk' }, los: true }, 4); assert.equal(m.state, 'disguise'); assert.ok(ev.some(e => e.t === 'say' && e.key === 'mimic_lure_companion'));
  ev = run(m, { player: { x: 0, z: 2.5, noise: 'walk' }, los: true }, 0.1); assert.equal(m.state, 'reveal'); assert.ok(ev.some(e => e.t === 'reveal' && e.why === 'near')); assert.equal(m.immune(), true);
  run(m, { player: { x: 0, z: 2.5 }, los: true }, 1.0); assert.equal(m.state, 'hostile');
  const m2 = new Mimic({ id: 'm2', pos: { x: 0, z: 0 }, disguise: 'civilian' }); const e2 = []; assert.equal(m2.hurt(30, 'slash', e2), 0); assert.equal(m2.state, 'reveal'); assert.equal(m2.hp, m2.hpMax);
});
t('写す攻め：直前に 3 回斬った → 3 連撃（白い予兆が 3 回・弾ける）／避けた → 突き（赤）', () => {
  const m = new Mimic({ id: 'm', pos: { x: 0, z: 0 } });
  let ev = run(m, { player: { x: 0, z: 1.4 }, los: true, hist: ['slash', 'slash', 'slash'] }, 3.0);
  const tel = ev.filter(e => e.t === 'telegraph'); assert.ok(tel.length >= 3); assert.ok(tel.slice(0, 3).every(e => e.parryable && e.name === 'mslash'));
  assert.equal(tel[0].plan.label, '写：斬斬斬'); assert.equal(ev.filter(e => e.t === 'attack').length >= 3, true);
  const m2 = new Mimic({ id: 'm2', pos: { x: 0, z: 0 } });
  ev = run(m2, { player: { x: 0, z: 5 }, los: true, hist: ['dodge', 'dodge'] }, 1.2); const t2 = ev.find(e => e.t === 'telegraph'); assert.equal(t2.name, 'mlunge'); assert.equal(t2.parryable, false);
});

// ── 写し身（ボス） ──
t('写し身：体力 60% で転機（そこで止まる・無敵）→ resume で第 2 段階。呼び声で救える・ダメージ 1.5 倍', () => {
  const b = new Utsushimi({ id: 'u', pos: { x: 0, z: 0 } }); b.wake();
  const ev = []; b.hurt(700, 'slash', ev); assert.equal(b.state, 'tenki'); assert.equal(b.hp, Math.ceil(b.hpMax * 0.6)); assert.ok(ev.some(e => e.t === 'tenki'));
  assert.equal(b.immune(), true); assert.equal(b.hurt(50, 'slash', []), 0);
  assert.equal(b.resume('reveal', []), true); assert.equal(b.phase, 1); assert.equal(b.state, 'hostile');
  const evs = run(b, { player: { x: 0, z: 30 }, los: true, hist: [] }, 9); assert.ok(evs.some(e => e.t === 'voice')); assert.equal(b.state, 'voice');
  const h0 = b.hp; b.hurt(20, 'slash', []); assert.equal(h0 - b.hp, 30); assert.equal(b.state, 'voice', '叩かれても呼び声は続く');
  const r = []; assert.equal(b.playMemo(r), 'rescued'); assert.equal(b.resolution, 'rescue'); assert.ok(r.some(e => e.t === 'rescued'));
  const c = new Utsushimi({ id: 'c', pos: { x: 0, z: 0 } }); assert.equal(c.playMemo([]), 'closed');
});
t('写し身：手助け（秘匿の構えで 3 回負けた後）は体力を 25% 減らし動きを遅く・第 2 段階は 3 回に 1 回「影の波」', () => {
  const b = new Utsushimi({ id: 'u', pos: { x: 0, z: 0 } }); b.wake(); b.hurt(400, 'slash', []);
  const hp = b.hp; b.resume('secret', [], true); assert.equal(b.assisted, true); assert.equal(b.hp, hp - Math.round(b.hpMax * 0.25)); assert.ok(b.cooldown() > ENEMIES.utsushimi.phases[1].cooldown);
  const ev = run(b, { player: { x: 0, z: 1.8 }, los: true, hist: ['slash'] }, 6.5); const names = ev.filter(e => e.t === 'telegraph' && !e.follow).map(e => e.name); assert.ok(names.includes('mwave'), names.join(','));
});

// ── 記録のない患者・守り手 ──
t('記録のない患者：白衣の名札で「看護の人」（攻めない）→ 声をかけると眠る（救う）・照明を落とすと眠る（無力化）', () => {
  const k = new Kanja({ id: 'k', path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] });
  let ev = run(k, { player: { x: 0, z: 3, noise: 'walk' }, los: true, nurse: true }, 1.0);
  assert.equal(k.state, 'nurse'); assert.ok(ev.some(e => e.t === 'misread' && e.as === 'nurse'));
  ev = run(k, { player: { x: 0, z: 2.5, noise: 'walk' }, los: true, nurse: true }, 3); assert.ok(!ev.some(e => e.t === 'telegraph'), '看護の人は攻めない');
  assert.equal(k.callOut([]), true); assert.equal(k.resolution, 'rescue'); assert.equal(k.state, 'sleep');
  const k2 = new Kanja({ id: 'k2', path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); assert.equal(k2.lightsOff([]), true); assert.equal(k2.resolution, 'neutralize');
  const k3 = new Kanja({ id: 'k3', path: [{ x: 0, z: 0 }, { x: 0, z: -5 }] }); run(k3, { player: { x: 0, z: 1.5, noise: 'run' }, los: true }, 2.5); assert.equal(k3.state, 'hostile'); assert.equal(k3.lightsOff([]), false, '戦っている患者は眠らない');
});
t('守り手：追わない・子どもに近づくと押し返す（白・弾ける・弱い）・影が来ると影を払う・影がいなくなると道を空ける（救う）', () => {
  const m = new Mamori({ id: 'mm', pos: { x: 0, z: 0 }, child: { x: 1.5, z: -1 } });
  let ev = run(m, { player: { x: 8, z: 0 } }, 3); assert.ok(!ev.some(e => e.t === 'telegraph')); assert.ok(Math.hypot(m.pos.x, m.pos.z) < 0.4);
  ev = run(m, { player: { x: 1.2, z: 0.4 } }, 2); const tel = ev.find(e => e.t === 'telegraph'); assert.equal(tel.name, 'push'); assert.equal(tel.parryable, true); assert.ok(ENEMIES.mamori.attacks.push.dmg <= 8);
  ev = run(m, { player: { x: 8, z: 0 }, threats: [{ id: 's', x: 2.2, z: -1 }] }, 4); assert.ok(ev.some(e => e.t === 'protect' && e.id === 's')); assert.equal(m.state, 'protect');
  const h = m.hp; m.hurt(40, 'slash', []); assert.equal(m.state, 'protect'); assert.equal(h - m.hp, 40);
  assert.equal(m.standDown([]), true); assert.equal(m.resolution, 'rescue');
});

// ── 段・区画・調べ物・演出 ──
t('第3章の段：病院（受付→カルテ→病室→守り手→地下へ）→ 地下通路（写し身→転機→決着）。目標の印・区画のつながり', () => {
  const ids = STEPS.filter(s => s.ch === 'ch3').map(s => s.id);
  assert.deepEqual(ids, ['ch3_hosp', 'ch3_lobby', 'ch3_records', 'ch3_ward', 'ch3_guard', 'ch3_down', 'ch3_tunnel', 'ch3_boss', 'ch3_boss2', 'ch3_end']);
  assert.equal(CHAPTERS.ch3.title, '第3章　見た目'); assert.equal(chapterNo('ch3_boss'), 3); assert.equal(afterTenki('ch3_boss'), false); assert.equal(afterTenki('ch3_boss2'), true);
  for (const id of ids) assert.ok(id in TARGETS, id);
  const r = reachable(AREA_GRAPH, 'shotengai'); assert.ok(r.has('hospital') && r.has('tunnel'));
  for (const a of ['hospital', 'tunnel']) assert.ok(reachable(AREA_GRAPH, a).has('shelter'));
  assert.ok(AREA_DATA.hospital.kanja.length >= 3 && AREA_DATA.tunnel.mimics.some(m => m.disguise === 'companion') && AREA_DATA.hospital.mimics.some(m => m.disguise === 'civilian'));
});
t('病院の調べ物【必須】：札とカルテを照らし合わせ、記録の無い患者は 1 人（306・小野寺 ケイ）。カルテと記憶の食い違いも 1 つ', () => {
  assert.equal(HOSP.provisional, true); assert.equal(PZ.recordlessPatients().length, 1); assert.equal(PZ.recordAnswer(), '306');
  let s = PZ.pickRecord({}, '305'); assert.equal(s.done, false); assert.equal(s.miss, 1); s = PZ.pickRecord(s, '306'); assert.equal(s.done, true);
  assert.deepEqual(PZ.memoryMismatch(), ['東 ミヨ']); assert.equal(PZ.plainName('日向 ユウ（小児・7）'), '日向 ユウ');
});
t('原文の台詞：第3章はだんのうらが 1 回だけ（子どもを相棒に預けた後の場面）。相棒は同じ台詞を言わない（第4章で）', () => {
  const F = fixedLines(CUTSCENES3); assert.equal(F.length, 1);
  assert.deepEqual(F[0], { id: 'cs03_line', who: 'dan', text: '見た目だけで決めつけちゃ駄目ってことかしらね' }); assert.equal(LINE_CH3, '見た目だけで決めつけちゃ駄目ってことかしらね');
  const cs = CUTSCENES3.cs03_line; const at = cs.lines.find(l => l.fixed).t;
  const handed = cs.actors.filter(a => a.id === 'child' && a.to).map(a => a.t); assert.ok(handed.length && handed.every(x => x < at), '預けた後');
  const reply = cs.lines.find(l => l.who === 'companion'); assert.ok(reply && reply.text !== LINE_CH3);
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events); assert.equal(all.split(LINE_CH3).length - 1, 1, '3 回目は無い・ほかの場所にも無い');
  // 真相の場面（救う・倒す）のどちらからでも cs03_line へ（game/ch3.js）
  const src = readFileSync(new URL('../shinshoku/game/ch3.js', import.meta.url), 'utf8'); assert.ok(/cs03_truth_rescue' : 'cs03_truth_kill', \(\) => this\.later\(0\.2, \(\) => this\.playCutscene\('cs03_line'\)\)/.test(src));
});
t('演出：第3章の場面は区画・段・話し手が正しく、出来事はゲーム側で扱う名前だけ。白い姿は相棒に見せない（決着でシャッターの前に戻る）', () => {
  const stepIds = new Set(STEPS.map(s => s.id));
  const known = new Set(['setStep', 'flag', 'chapterCard', 'expr', 'spawnTwist', 'guardStart', 'childFollow', 'companionFollow', 'refugeShutter', 'bossRise3', 'bossWake3', 'whiteFlicker', 'transform', 'revertWhite', 'formCard', 'endCard3']);
  for (const cs of Object.values(CUTSCENES3)) {
    assert.ok(AREA_GRAPH[cs.area], cs.id); assert.ok(duration(cs) > 3, cs.id);
    for (const e of cs.events || []) { assert.ok(known.has(e.do), cs.id + ':' + e.do); if (e.do === 'setStep') assert.ok(stepIds.has(e.arg)); }
    for (const l of cs.lines || []) assert.ok(events.speakers[l.who], l.who);
  }
  const end = CUTSCENES3.cs03_end; const rv = end.events.find(e => e.do === 'revertWhite').t, up = end.events.find(e => e.do === 'refugeShutter').t, comp = end.actors.find(a => a.id === 'companion' && a.show).t;
  assert.ok(rv < up && rv < comp, '相棒が出てくる前に紫へ戻る');
  const tr = CUTSCENES3.cs03_transform; assert.ok(tr.events.some(e => e.do === 'transform')); assert.ok(!tr.actors.some(a => a.id === 'companion'), '変身の場面に相棒はいない');
  // 飛ばしても出来事は全部起きる
  const log = []; const P = new CutscenePlayer({ setCam() {}, subtitle() {}, letterbox() {}, event: d => log.push(d), actor() {}, sound() {}, done() {} });
  P.play(CUTSCENES3.cs03_end); P.skip(); assert.equal(log.length, end.events.length);
});
t('台詞のデータ：第3章の話し手・吠え声・調べた時の文。だんのうらを女性として書かない', () => {
  for (const k of ['ev_ch3_start', 'ev_records_done', 'ev_treat', 'ev_key306']) assert.ok(events.events[k], k);
  for (const k of ['kanja_ask', 'mimic_lure_companion', 'mimic_lure_visitor', 'utsushimi_voice', 'white_watched', 'white_stance', 'white_revert']) assert.ok(events.barks[k], k);
  for (const k of ['hosp_reception', 'board_text', 'charts_text', 'hosp_key_need']) assert.ok(events.texts[k], k);
  const dan = JSON.stringify(Object.values(CUTSCENES3).flatMap(c => c.lines.filter(l => l.who === 'dan').map(l => l.text))) + JSON.stringify(events);
  for (const ng of ['彼女はだんのうら', 'だんのうらさんは女', '月代町', '九条']) assert.equal(dan.includes(ng), false, ng);
});

// ── セーブ ──
t('セーブ：転機の前の枠 tenki（上書きできる）・古いセーブを読むと枠が増える・構えと妖力が戻る形', () => {
  assert.ok(SLOT_NAMES.includes('tenki'));
  const mem = new Map(); const ls = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const S = new SaveStore(ls);
  const slot = makeSlot({ area: 'tunnel', story: Object.assign(setStance(newRouteState(), 'reveal'), { step: 'ch3_boss', flags: { tenki_pending: true } }), player: { yoki: 64 } });
  assert.equal(S.write('tenki', slot), true); assert.equal(S.write('tenki', slot), true, '上書きできる');
  const back = S.load('tenki'); assert.equal(back.story.stance, 'reveal'); assert.equal(back.player.yoki, 64); assert.equal(back.story.branchLog[0].kind, 'stance');
  const old = JSON.stringify({ ver: 1, gameVer: '0.2.0', slots: { auto: null, slot1: null, slot2: null, slot3: null, branch: null } });
  const m = migrate(old); assert.equal(m.ok, true); assert.ok('tenki' in m.save.slots);
  assert.ok(mem.has(SAVE_KEY)); for (const k of mem.keys()) assert.ok(/^shinshoku_/.test(k));
});
t('姿勢：白い姿の技・新しい異形・子どもの姿勢が数字で出る（NaN が無い）', () => {
  const chk = o => { for (const [k, v] of Object.entries(o.pose)) { if (k === 'hipsY') assert.ok(Number.isFinite(v)); else assert.ok(v.every(Number.isFinite), k); } };
  const F = wf(); F.setForm('white'); F.tick({ attack: true }); for (let i = 0; i < 6; i++) { F.tick({}); chk(whitePose({ st: F.st, f: F.st.f, speed: 0, phase: 0, time: i })); }
  F.tick({ dodge: true }); chk(whitePose({ st: F.st, f: 3, speed: 0, phase: 0, time: 0 }));
  for (const state of ['loop', 'nurse', 'sleep', 'assess', 'hostile']) chk(kanjaPose({ state, t: 1, speed: 1, phase: 1, atk: state === 'hostile' ? { name: 'tube', phase: 'windup', t: 0.3 } : null, atkDef: ENEMIES.kanja.attacks.tube }));
  for (const [state, atk] of [['disguise'], ['reveal'], ['voice'], ['tenki'], ['hostile', { name: 'mslash', phase: 'active', t: 0, hitN: 1 }], ['hostile', { name: 'mwave', phase: 'windup', t: 0.5 }], ['hostile', { name: 'mlunge', phase: 'active', t: 0 }]]) chk(mimicPose({ state, t: 1, speed: 0, phase: 0, atk, atkDef: atk ? ENEMIES.utsushimi.attacks[atk.name] : null }));
  for (const state of ['guard', 'protect', 'rest']) chk(mamoriPose({ state, t: 1, speed: 0, phase: 0, atk: state === 'protect' ? { name: 'guard', phase: 'active', t: 0 } : null, atkDef: ENEMIES.mamori.attacks.guard }));
  for (const mode of ['sit', 'cower', 'follow']) chk(childPose({ mode, time: 1, speed: mode === 'follow' ? 1 : 0, phase: 1 }));
});
t('データは仮（provisional）：新しい異形・病院の名前', () => {
  for (const k of ['kanja', 'mimic', 'utsushimi', 'mamori']) assert.equal(ENEMIES[k].provisional, true, k);
  assert.equal(events.speakers.child.provisional, true);
});
console.log(`shinshoku-p4: ${n} ok`);
