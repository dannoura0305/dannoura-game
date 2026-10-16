// 『境界侵食』フェーズ7：第6章A の続き（崩れた商店街・置換の糸・中央通りの塗替）と第6章B（中央管理棟・時刻の矛盾・巡回点検・隔離・当直）。
// ルートの続き（第5章 → 第6章：両ルート）／原文の台詞は全編で 2 回のまま・結末の原文は無い・九条の名前は出ない／謎の答えと手掛かり（2 つの道）／
// 新しい敵（待人・当直・塗替）の状態機械／区画のつながり／演出のデータ／娘は電話だけ・研究者は声と影だけ／キーの割り当て・設定
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RELAYS, relayOrder, relayOrderByTime, cutRelay, RUINS, AVENUE, DOCS6, CLOCKS, checkClock, ROUNDS, vibZone, roundsAnswer, checkDiagnosis, LOTO, checkLoto, CONTROL_STOP, ADMIN } from '../shinshoku/data/ch6.js';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { Nurikae } from '../shinshoku/ai/nurikae.js';
import { Sakibure, blocksLine } from '../shinshoku/ai/sakibure.js';
import { Machibito } from '../shinshoku/ai/machibito.js';
import { Touchoku } from '../shinshoku/ai/touchoku.js';
import { STEPS, TARGETS, CHAPTERS, chapterNo, stepRoute, R5_STEPS, S5_STEPS, R6_STEPS, S6_STEPS, atLeastIn, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CUTSCENES6 } from '../shinshoku/story/cutscenes6.js';
import { fixedLines, duration } from '../shinshoku/story/cutscene.js';
import { KEYMAP, REBINDABLE, buildKeymap } from '../shinshoku/core/input.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
const LINE = '見た目だけで決めつけちゃ駄目ってことかしらね', ENDING = 'でも、あの後……みんなを助けてくれたんですよね';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const ROOT = new URL('../shinshoku/', import.meta.url).pathname;
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };

// ── 章と段・ルートの続き ──
t('章と段：第6章A の続き（崩れた商店街 → 中央通り）と第6章B（中央管理棟）。どの段もルートが決まり、目標の印・区画がある', () => {
  assert.equal(CHAPTERS.ch6b.title, '第6章B　制御'); assert.equal(CHAPTERS.ch6a.title, '第6章A　巨躯');
  assert.deepEqual(R6_STEPS, ['ch6a_threads', 'ch6a_avenue', 'ch6a_boss', 'ch6a_fin']);
  assert.deepEqual(S6_STEPS, ['ch6_s_enter', 'ch6_s_monitor', 'ch6_s_rounds', 'ch6_s_isolate', 'ch6_s_boss', 'ch6_s_control', 'ch6_s_end']);
  for (const id of R6_STEPS) { assert.equal(stepRoute(id), 'reveal', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); assert.equal(chapterNo(id), 6); }
  for (const id of S6_STEPS) { assert.equal(stepRoute(id), 'secret', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); assert.equal(chapterNo(id), 6); }
  // 同じルートの中だけ先後を比べる（第5章 → 第6章）
  assert.equal(atLeastIn('ch6a_boss', 'ch6a_end'), true); assert.equal(atLeastIn('ch6a_threads', 'ch5_r_ward'), true); assert.equal(atLeastIn('ch6_s_rounds', 'ch5_s_end'), true);
  assert.equal(atLeastIn('ch6_s_rounds', 'ch6a_threads'), false); assert.equal(atLeastIn('ch6a_threads', 'ch5_s_end'), false);
  // 終章・結末の段はフェーズ8 で足した（第6章の段の後ろ。第6章の段の並びは変えない）
  assert.ok(STEPS.findIndex(s => /^ch7|^end_/.test(s.id)) > STEPS.findIndex(s => s.id === 'ch6_s_end'));
});
t('ルートの続き（reveal）：守りきった後は終わりの表を出さず、人の大きさで崩れた商店街へ。第6章でもルートの記録を書き換えない', () => {
  const c5 = CUTSCENES.cs06_end, g6 = src('game/ch6.js');
  assert.ok(c5.events.some(e => e.do === 'setStep' && e.arg === 'ch6a_end') && c5.events.some(e => e.do === 'toRuins6') && !c5.events.some(e => e.do === 'endCard6'));
  assert.ok(/toRuins6\(\) \{[\s\S]*?this\.exitGiant\(\)[\s\S]*?this\.changeArea\('ruins', 'south'\)/.test(g6));
  assert.equal((g6.match(/choose\(/g) || []).length, 0, '第6章ではルートを選び直さない'); assert.ok(!/routeLock\s*=/.test(g6) && !/branchLog\.push/.test(g6));
  assert.ok(/jump6\(step\) \{[\s\S]*?this\.jump5\(rr === 'reveal' \? 'ch6a_end' : 'ch5_s_end'\)/.test(g6), '飛び先も第5章の終わりの状態（ルートの確定・相棒が知っているか）を作ってから');
  assert.ok(/if \(A === 'ruins' && s === 'ch6a_end'\)/.test(g6), '移り変わりの段（ch6a_end）で読み込んでも先へ進める');
});
t('ルートの続き（secret）：第5章B の終わりの表を閉じると連絡橋で中央管理棟へ。白い姿の入力は第6章B でも無効', () => {
  const g5 = src('game/ch5.js'), g6 = src('game/ch6.js'), g4 = src('game/ch4.js');
  assert.ok(/if \(this\.story\.step === 'ch5_s_end'\) this\.later\(0\.4, \(\) => this\.startCh6s\(\)\)/.test(g5));
  assert.ok(/startCh6s\(\) \{[\s\S]*?this\.route\.route !== 'secret'[\s\S]*?this\.setStep\('ch6_s_enter'\);[\s\S]*?this\.changeArea\('admin', 'bridge'\)/.test(g6));
  assert.ok(/ch4Secret\(\) \{ const s = this\.story\.step; return stepRoute\(s\) === 'secret'/.test(g4) && S6_STEPS.every(id => stepRoute(id) === 'secret'));
  assert.ok(/if \(s\.kind === 'stairs5' && this\.story\.step === 'ch5_s_end'\) \{ this\.startCh6s\(\)/.test(g6), '表を閉じた後でも階段から進める');
});
t('区画のつながり：崩れた商店街・中央通りは reveal だけ、中央管理棟は secret だけ（町は壊れない）。どこからでも商店街へ戻れる', () => {
  assert.equal(AREA_GRAPH.ruins.routeOnly, 'reveal'); assert.equal(AREA_GRAPH.avenue.routeOnly, 'reveal'); assert.equal(AREA_GRAPH.admin.routeOnly, 'secret');
  const r = reachable(AREA_GRAPH, 'shotengai'); for (const a of ['ruins', 'avenue', 'admin']) { assert.ok(r.has(a), a); assert.ok(reachable(AREA_GRAPH, a).has('shotengai'), a); }
  assert.ok(S6_STEPS.every(id => stepDef(id).area === 'admin')); assert.ok(R6_STEPS.every(id => ['ruins', 'avenue'].includes(stepDef(id).area)));
  assert.ok(/ruins: \(\.\.\.a\) => BUILDERS3\.ruins\(\.\.\.a\), avenue: \(\.\.\.a\) => BUILDERS3\.avenue\(\.\.\.a\), admin: \(\.\.\.a\) => BUILDERS3\.admin\(\.\.\.a\)/.test(src('world/areas.js')));
});

// ── 原文の台詞・結末の原文・九条 ──
t('原文の台詞は全編で 2 回のまま（第3章のだんのうら・第4章の相棒）。第6章の台詞・資料・コードには無い。結末A の原文は第6章に無い（フェーズ8 で結末A に 1 回だけ）', () => {
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events);
  assert.equal(all.split(LINE).length - 1, 2); assert.equal(all.split('見た目だけで').length - 1, 2);
  assert.deepEqual(fixedLines(CUTSCENES).map(f => f.id).filter(id => id !== 'cs_end_a'), ['cs03_line', 'cs04_line']);
  const files = walk(ROOT).filter(p => /\.(js|json|html|css)$/.test(p));
  let total = 0, endTotal = 0; for (const p of files) { const s = readFileSync(p, 'utf8'); total += s.split(LINE).length - 1; endTotal += s.split(ENDING).length - 1; if (!/cutscenes7\.js$/.test(p)) assert.equal(s.indexOf(ENDING), -1, p); }
  assert.equal(endTotal, 1, '結末A の原文は cutscenes7.js の 1 回だけ');
  assert.equal(total, 2, 'shinshoku/ 全体で 2 回');
  assert.equal(JSON.stringify(CUTSCENES6).indexOf('見た目'), -1); assert.equal(fixedLines(CUTSCENES6).length, 0);
  for (const f of ['game/ch6.js', 'data/ch6.js', 'world/areas7.js', 'actor/models6.js']) assert.ok(!src(f).includes('見た目だけで'), f);
});
t('研究者は声・記録・逆光の影だけ（名前を出さない・九条の名前は台詞にも資料にも出ない）', () => {
  const said = JSON.stringify(CUTSCENES6) + JSON.stringify(events) + JSON.stringify(DOCS6) + JSON.stringify({ RELAYS, CLOCKS, ROUNDS, LOTO, CONTROL_STOP });
  assert.ok(!/九条/.test(said));
  const rl = Object.values(CUTSCENES6).flatMap(c => c.lines).filter(l => l.who === 'researcher');
  assert.ok(rl.length >= 5); assert.equal(events.speakers.researcher.name, '放送の声');
  assert.ok(CUTSCENES6.cs06s_control.lines.some(l => /顔は見えない/.test(l.text)) && CUTSCENES6.cs06s_control.events.some(e => e.do === 'screenOn6'));
  assert.ok(/顔は映っていない/.test(src('world/areas7.js')), '画面の絵は逆光の影（顔なし）');
  for (const d of [DOCS6.voice6a, DOCS6.rec6]) assert.ok(/名前は記録に無い/.test(d.text));
});
t('娘は電話・留守電の声だけ（危ない所に出てこない・役者として置かない）。だんのうらは「パパ」と呼ばれる父親', () => {
  const dl = Object.values(CUTSCENES6).flatMap(c => c.lines).filter(l => l.who === 'daughter');
  assert.ok(dl.length >= 3 && dl.every(l => /パパ|はやく/.test(l.text) || l.text.length < 12)); assert.equal(events.speakers.daughter.name, '娘（電話の声）');
  assert.ok(Object.values(CUTSCENES6).every(c => !(c.actors || []).some(a => a.id === 'child' || a.id === 'daughter')));
  assert.ok(CUTSCENES6.cs06r_ruins.lines.some(l => /千代さん/.test(l.text)) && CUTSCENES6.cs06s_door.lines.some(l => /留守電/.test(l.text)));
});
t('（相棒）の流れ：reveal は正体を知っていて（病院から送り出す）、secret は知らないまま（機械の腕前に感心するだけ）', () => {
  const r = CUTSCENES6.cs06r_ruins.lines.map(l => l.text).join('');
  assert.ok(/行ってください/.test(r) && /だんのうらさんにしか/.test(r));
  for (const id of ['cs06r_ruins', 'cs06r_source', 'cs06a_boss', 'cs06a_boss_end']) assert.ok(!(CUTSCENES6[id].actors || []).some(a => a.id === 'companion'), id + '：相棒は病院（その場にいない）');
  const s = ['cs06s_arrive', 'cs06s_door', 'cs06s_isolate', 'cs06s_after', 'cs06s_control'].flatMap(id => CUTSCENES6[id].lines).filter(l => l.who === 'companion').map(l => l.text).join('');
  assert.ok(/すごいですね/.test(s) && !/白い|化け|正体|猫/.test(s), '秘匿：相棒は正体に触れない');
  assert.ok(/placeCompanion6\(id\) \{[\s\S]*?if \(id !== 'admin'\) \{ C\.root\.visible = false/.test(src('game/ch6.js')));
});
t('だんのうらは男性の化け猫のまま（口調はいつものオネェ言葉・暴走は終わり、自分の意思で大きくなる）。新しいモデルに女性の衣装は無い', () => {
  const dl = Object.values(CUTSCENES6).flatMap(c => c.lines).filter(l => l.who === 'dan').map(l => l.text).join('');
  assert.ok(/アタシ/.test(dl) && /わよ|かしら|ましょ|なさい|のよ|わね/.test(dl));
  assert.ok(CUTSCENES6.cs06a_boss.lines.some(l => /アタシの意思で/.test(l.text)), '中央通りの巨大猫又は暴走ではない');
  assert.ok(!/rampageStart|giantRampK/.test(JSON.stringify(CUTSCENES6)));
  const m = src('actor/models6.js'); assert.ok(!/skirt|dress|スカート|ドレス/i.test(m));
});

// ── reveal：置換の糸 ──
t('置換の糸（reveal の必須）：元（上流）から順に切る。白い姿の観察（流れの向き）と防災無線の記録（時刻の順）のどちらからでも同じ答え', () => {
  assert.deepEqual(relayOrder(), ['T', 'P', 'Y']); assert.deepEqual(relayOrderByTime(), relayOrder(), '2 つの手掛かりが同じ順');
  assert.equal(DOCS6.damage.required, false); assert.ok(/23:58/.test(DOCS6.damage.text) && /00:07/.test(DOCS6.damage.text));
  assert.deepEqual(cutRelay([], 'T', false), { ok: false, why: 'form' }, '紫の姿では切れない');
  assert.deepEqual(cutRelay([], 'P', true), { ok: false, why: 'upstream' }); assert.deepEqual(cutRelay([], 'T', true), { ok: true, why: '' });
  assert.deepEqual(cutRelay(['T'], 'T', true), { ok: false, why: 'done' }); assert.deepEqual(cutRelay(['T', 'P'], 'Y', true), { ok: true, why: '' });
  const g = src('game/ch6.js');
  assert.ok(/spawnSpare6\(\)/.test(g) && RUINS.spare.length === 2, 'ちがう順は影が出るだけ（何度でもやり直せる・2 体まで）');
  assert.ok(/if \(cut\.length >= 3\) \{ this\.flags\.relays6 = true;[\s\S]*?cs06r_source/.test(g));
});
t('中央通りの出口は糸を切ってから。巨大猫又は区画に入ってから（人の大きさの商店街では大きくならない）', () => {
  const g = src('game/ch6.js');
  assert.ok(/if \(s\.to === 'avenue'\) \{ if \(this\.story\.step !== 'ch6a_avenue'\)/.test(g));
  assert.ok(/if \(id === 'avenue' && s === 'ch6a_avenue'\) this\.later\(0\.1, \(\) => this\.playCutscene\('cs06a_boss'\)\)/.test(g));
  assert.ok(CUTSCENES6.cs06a_boss.events.some(e => e.do === 'giantGrowAv6') && CUTSCENES6.cs06a_boss.events.some(e => e.do === 'bossWake6'));
});

// ── 塗替（第6章A のボス） ──
t('塗替：先触れと同じ骨組み（段階・咆哮で止まる・崩れると核が開く 2 倍）。「塗り替え」の線は人の残る棟へ・間に立てば体で受けられる', () => {
  const b = new Nurikae({ id: 'n', pos: { x: 0, z: -14 } });
  assert.ok(b instanceof Sakibure); assert.equal(b.kind, 'nurikae'); assert.equal(b.hpMax, ENEMIES.nurikae.hp); assert.equal(ENEMIES.nurikae.provisional, true);
  const ev = []; b.wake(ev); assert.equal(b.state, 'hostile');
  const blk = AVENUE.blocks[0]; const sense = { player: { x: 0, z: 30 }, shelter: { x: blk.pos[0], z: blk.pos[1] } };
  b.cool = 0; b.patIdx = 1; const out = b.update(1 / 60, sense); const tel = out.events.find(e => e.t === 'telegraph');
  assert.equal(tel.name, 'feed'); assert.ok(tel.parryable && tel.line); assert.equal(tel.line.to.x, blk.pos[0]);
  const mid = { x: (tel.line.from.x + tel.line.to.x) / 2, z: (tel.line.from.z + tel.line.to.z) / 2 }; assert.ok(blocksLine(mid, 2.2, tel.line)); assert.ok(!blocksLine({ x: 40, z: 40 }, 2.2, tel.line));
  assert.ok(b.roared([])); assert.equal(b.coreOpen, true);
  const h0 = b.hp; b.hurt(100, 'slash', [], {}); assert.equal(h0 - b.hp, 200, '核が開いている間は 2 倍');
  assert.ok(AVENUE.blocks.some(x => /相棒/.test(x.name)), '守る棟の一つは（相棒）のいる病院の別棟');
  const g4 = src('game/ch4.js');
  assert.ok(/giantBoss\(\) \{ return this\.enemies\.find\(e => e\.kind === 'sakibure' \|\| e\.kind === 'nurikae'/.test(g4) && /if \(e\.kind === 'nurikae'\) \{ this\.resolve\(e, 'kill'\); this\.onNurikaeDown6\(\)/.test(g4));
  assert.ok(/feedHit6\(L, block\)/.test(g4));
});

// ── secret：中央管理棟の謎（設備保全） ──
t('時刻の矛盾（secret の必須）：CAM-3 の記録（02:31）はずれた時計。画面の奥の壁時計・当番表の巡回記録（2 分おき）から 01:47', () => {
  assert.equal(CLOCKS.answer, '01:47'); assert.ok(CLOCKS.options.includes('01:47'));
  const c3 = CLOCKS.cams.find(c => c.drift); assert.equal(c3.wall, '1:47'); assert.notEqual(c3.stamp, CLOCKS.answer);
  const prev = CLOCKS.cams.filter(c => !c.drift && c.who === '当直').map(c => c.stamp); assert.deepEqual(prev, ['01:43', '01:45']);
  assert.ok(/2 分おき/.test(DOCS6.duty6.text) && /01:47/.test(DOCS6.duty6.text), 'もう一つの道：当番表');
  assert.deepEqual(checkClock('01:47'), { ok: true, why: '' }); assert.equal(checkClock('02:31').why, 'drift'); assert.equal(checkClock('01:45').why, 'other');
});
t('巡回点検と診断（secret の必須・設備保全）：振動・温度・音・前回値。値の大きさだけでなく変わり方で選ぶ（C-1 は前回と同じ＝許容、P-2 は前回の 4 倍）', () => {
  assert.deepEqual(roundsAnswer(), ['P2']);
  const P2 = ROUNDS.machines.find(m => m.id === 'P2'), C1 = ROUNDS.machines.find(m => m.id === 'C1');
  assert.equal(vibZone(P2.vib), 'danger'); assert.equal(vibZone(C1.vib), 'danger'); assert.ok(C1.vib - C1.prev < 1 && P2.vib / P2.prev > 4);
  assert.deepEqual(checkDiagnosis('P2'), { ok: true, why: '' }); assert.equal(checkDiagnosis('C1').why, 'baseline'); assert.equal(checkDiagnosis('P1').why, 'normal');
  assert.ok(/ゴロゴロ/.test(P2.sound) && /軸受/.test(DOCS6.log6.text), 'もう一つの道：当直の点検日誌');
  assert.ok(ROUNDS.provisional && ROUNDS.measureSec > 0);
});
t('隔離の手順（secret の必須）：止めて・切って（施錠）・締めて（吐出 → 吸込）・抜く。間違えると理由が分かる（水撃・施錠・空回り・残圧）', () => {
  assert.deepEqual(checkLoto(['stop', 'lock', 'dis', 'suc', 'drain']), { ok: true, why: '' });
  assert.equal(checkLoto(['dis', 'stop', 'lock', 'suc', 'drain']).why, 'hammer');
  assert.equal(checkLoto(['stop', 'dis', 'lock', 'suc', 'drain']).why, 'lock');
  assert.equal(checkLoto(['stop', 'lock', 'suc', 'dis', 'drain']).why, 'cav');
  assert.equal(checkLoto(['stop', 'lock', 'drain', 'dis', 'suc']).why, 'drain');
  assert.equal(checkLoto(['stop', 'lock']).why, 'count');
  assert.equal(LOTO.steps.length, 5); assert.ok(/止めて・切って・締めて・抜く/.test(LOTO.hint));
  assert.equal(CONTROL_STOP.options.filter(o => o.ok).length, 1); assert.ok(CONTROL_STOP.options.find(o => o.id === 'estop').bad);
});
t('取り逃しで閉じない：謎はどれも何度でもやり直せる（罰は無い）。任意の資料は答えを変えない', () => {
  const g = src('game/ch6.js');
  for (const k of ['clockMiss6', 'diagMiss6', 'lotoMiss6', 'controlMiss6', 'relayMiss6']) assert.ok(new RegExp(`this\\.${k} = \\(this\\.${k} \\|\\| 0\\) \\+ 1`).test(g), k);
  for (const d of Object.values(DOCS6)) assert.equal(d.required, false, d.id);
});

// ── 待人・当直 ──
t('待人：待ち合わせの場所で時計を見る → 近づくと取り違えてついてくる → 違うと分かって戻る。何度も → 怒る。救う＝物を届ける／無力化＝時計を止める', () => {
  const m = new Machibito({ id: 'm', pos: { x: 0, z: 0 }, yaw: 0 });
  let ev = run(m, { player: { x: 1.5, z: 0, noise: 'walk', dead: false } }, 0.2); assert.equal(m.state, 'misread'); assert.ok(ev.some(e => e.t === 'misread'));
  ev = run(m, { player: { x: 20, z: 0, noise: 'walk', dead: false } }, 10); assert.ok(ev.some(e => e.t === 'state' && e.to === 'sad')); assert.equal(m.state, 'loop');
  const evs = []; for (let i = 0; i < 4 && m.state !== 'hostile'; i++) { evs.push(...run(m, { player: { x: 1.5, z: 0, noise: 'walk', dead: false } }, 0.3)); evs.push(...run(m, { player: { x: 20, z: 0, noise: 'walk', dead: false } }, 3.0)); }
  assert.ok(evs.some(e => e.t === 'state' && e.to === 'hostile' && e.why === 'tooMany'), '取り違えが重なると怒る'); assert.ok(ENEMIES.machibito.attacks.stopclock.aoe.slow > 0);
  const a = new Machibito({ id: 'a', pos: { x: 0, z: 0 } }); const e1 = []; assert.ok(a.deliver(e1)); assert.equal(a.resolution, 'rescue'); assert.equal(a.state, 'rest'); assert.ok(e1.some(e => e.t === 'rescued'));
  const b = new Machibito({ id: 'b', pos: { x: 0, z: 0 } }); const e2 = []; assert.ok(b.stopClock(e2)); assert.equal(b.resolution, 'neutralize'); assert.equal(b.state, 'sleep'); assert.equal(b.immune(), true);
  assert.ok(/slowZoneK\(p\)/.test(src('game/ch6.js')) && /const zk = this\.slowZoneK \? this\.slowZoneK\(P\.pos\) : 1;/.test(src('game/combat.js')), '時計を止める場の中では遅くなる');
});
t('当直：巡回（止めた P-2 の弁へ・間に合うと少し回復）・弁にかがむ間は 1.5 倍・蒸気で崩れる → 崩れた時だけ点検表を渡す（救う）／施錠（無力化）。倒すもできる', () => {
  const T = () => new Touchoku({ id: 'k', pos: { x: 0, z: 0 }, valve: { x: 0, z: -3 }, state: 'loop' });
  const a = T(); a.wake([]); a.hp = 900; a.roundT = 99; let ev = run(a, { player: { x: 0, z: 6, dead: false }, isolated: true }, 7);
  assert.ok(ev.some(e => e.t === 'round') && ev.some(e => e.t === 'restarted')); assert.ok(a.hp > 900 && a.restarts === 1);
  const b = T(); b.wake([]); b.roundT = 99; run(b, { player: { x: 0, z: 6, dead: false }, isolated: true }, 2.2); assert.ok(b.working);
  const h0 = b.hp; b.hurt(20, 'slash', [], {}); assert.equal(h0 - b.hp, 30); assert.equal(b.state, 'stagger', '叩くと手が止まる');
  const c = T(); c.wake([]); assert.equal(c.handOver([]), false, '崩れていないと渡せない'); assert.equal(c.lockOut([]), false);
  const e3 = []; assert.ok(c.steamed(e3)); assert.equal(c.state, 'down'); assert.ok(c.coreOpen); assert.ok(e3.some(e => e.t === 'steamed'));
  assert.ok(c.handOver(e3)); assert.equal(c.resolution, 'rescue'); assert.equal(c.state, 'rest');
  const d = T(); d.wake([]); d.steamed([]); assert.ok(d.lockOut([])); assert.equal(d.resolution, 'neutralize'); assert.equal(d.state, 'locked'); assert.equal(d.hurt(50, 'slash', [], {}), 0);
  const k = T(); k.wake([]); const e4 = []; for (let i = 0; i < 80 && k.alive; i++) k.hurt(30, 'slash', e4, {}); assert.equal(k.resolution, 'kill');
  assert.equal(new Touchoku({ id: 'z', assist: true }).hpMax, Math.round(ENEMIES.touchoku.hp * 0.75)); assert.equal(ENEMIES.touchoku.resolve.escape, false);
  assert.ok(!run(T(), { player: { x: 0, z: 6, dead: false }, isolated: false }, 20).some(e => e.t === 'round'), '止める前（P-2 が動いている間）は巡回で弁へ行かない');
});
t('蒸気弁（機械室）：線の中の当直だけ崩す。弁ごとに圧が戻るまで待つ（6 秒）', () => {
  assert.equal(ADMIN.steam.length, 3); for (const v of ADMIN.steam) assert.ok(v.len > 5 && Math.hypot(v.dir[0], v.dir[1]) === 1);
  const g = src('game/ch6.js'); assert.ok(/this\.steamCd6\[id\] = this\.playSec \+ 6/.test(g) && /if \(e\.kind === 'touchoku'\) \{ const ev = \[\]; if \(e\.brain\.steamed\(ev\)\)/.test(g));
});

// ── 演出のデータ ──
t('演出：第6章の場面は区画・段・話し手が正しく、出来事はゲーム側で扱う名前だけ。どれも飛ばせる', () => {
  const stepIds = new Set(STEPS.map(s => s.id)), g = src('game/ch6.js') + src('game/ch5.js') + src('game/ch4.js') + src('game/story.js');
  for (const cs of Object.values(CUTSCENES6)) {
    assert.ok(AREA_GRAPH[cs.area], cs.id); assert.ok(duration(cs) > 5, cs.id); assert.equal(cs.skippable, true, cs.id);
    for (const e of cs.events || []) { if (e.do === 'setStep') assert.ok(stepIds.has(e.arg), e.arg); assert.ok(g.includes(`case '${e.do}'`), cs.id + ':' + e.do); }
    for (const l of cs.lines || []) assert.ok(events.speakers[l.who], l.who);
    for (const a of cs.actors || []) assert.ok(['player', 'companion', 'touchoku', 'nurikae', 'boss'].includes(a.id), cs.id + ':' + a.id);
  }
  assert.ok(CUTSCENES6.cs06a_boss_end.events.some(e => e.do === 'endCard6a') && CUTSCENES6.cs06s_control.events.some(e => e.do === 'endCard6s'));
  for (const k of ['machibito_thanks', 'touchoku_handover', 'touchoku_rest', 'giant_repaint', 'relay_shadow']) assert.ok(events.barks[k], k);
});
t('飛び先：?ch=6&route=reveal&at=ruins|avenue|boss ／ ?ch=6&route=secret&at=rounds|boss|control', () => {
  const m = src('main.js');
  assert.ok(/rounds: 'ch6_s_rounds', boss: 'ch6_s_boss', control: 'ch6_s_control' \}\[at\] \|\| 'ch6_s_enter'/.test(m));
  assert.ok(/ruins: 'ch6a_threads', avenue: 'ch6a_avenue', boss: 'ch6a_boss' \}\[at\] \|\| 'ch6a_rampage'/.test(m));
  assert.ok(/const j6 = this\.jump6\(step\);/.test(m));
});

// ── キーの割り当て・設定 ──
t('キーの割り当て（キーボード）：既定は変えない・上書きしたキーはほかの操作から外れる・攻撃（マウス）は変えられない', () => {
  assert.deepEqual(buildKeymap({}), KEYMAP);
  const m = buildKeymap({ dodge: ['KeyJ'] }); assert.equal(m.KeyJ, 'dodge'); assert.equal(m.Space, undefined);
  const m2 = buildKeymap({ dodge: ['KeyF'], parry: ['Space'] }); assert.equal(m2.KeyF, 'dodge'); assert.equal(m2.Space, 'parry');
  assert.ok(!REBINDABLE.some(r => r[0] === 'attack' || r[0] === 'aim'));
  assert.deepEqual(buildKeymap({ nonsense: ['KeyQ'] }), KEYMAP, '知らない操作は無視');
  const ui = src('ui/ui.js'), main = src('main.js');
  assert.ok(/\['keys', 'キー'\]/.test(ui) && /keysBody\(g\)/.test(ui) && /rebindKey\(action, code\)/.test(main) && /resetKeys\(\)/.test(main));
  assert.ok(/data-s="rampageInput"/.test(ui) && /data-s="shake"/.test(ui), '暴走の「抑える」（長押し／連打／両方）・画面の揺れ');
  assert.ok(/shake\(a, t = 0\.25\) \{ a \*= this\.shakeMul \?\? 1;/.test(src('render/camera.js')));
});
console.log(`shinshoku-p7: ${n} ok`);
