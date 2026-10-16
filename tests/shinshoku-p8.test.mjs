// 『境界侵食』フェーズ8：終章（A 崩れた町・境界を喰らうもの／B 記録の間・研究者）と結末（A 見舞い／B 信頼）・クリア後（章選択・ギャラリー・引き継ぎ）。
// 原文の台詞（決め台詞は全編 2 回のまま・三度目の所では（相棒）が名前を呼ぶ）／結末A の原文は 1 回だけ・その間カメラは白い髪／九条の名前は出ない／
// 結末はルートだけで決まる（同じルートなら同じ結末・再現できる）／新しい敵（境界を喰らうもの・研究者）の状態機械／記録装置（書き込み中は止めない）／
// 区画のつながり・最終戦の前のセーブ地点／記録は本作の欄だけ（他作品のキーに書かない）／だんのうらは男性（女性として描かない）
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ABYSS, refugeTarget, KIROKU, deckLamp, stopDeck, DOCS7, EPILOGUE, ENDINGS, endingOf, GALLERY, galleryUnlocked, CHAPTER_SELECT, selectableChapters, carryFrom, CREDITS } from '../shinshoku/data/ch7.js';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { Kuramono } from '../shinshoku/ai/kuramono.js';
import { Kenkyusha } from '../shinshoku/ai/kenkyusha.js';
import { blocksLine } from '../shinshoku/ai/sakibure.js';
import { STEPS, TARGETS, CHAPTERS, chapterNo, stepRoute, R7_STEPS, S7_STEPS, atLeastIn, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CUTSCENES7, HAIR_A } from '../shinshoku/story/cutscenes7.js';
import { fixedLines, duration, camAt, lineAt } from '../shinshoku/story/cutscene.js';
import { SaveStore, SLOT_NAMES, SAVE_KEY, makeSlot } from '../shinshoku/save/save.js';
import { createWP, WP_KEY } from '../shinshoku/link/progress.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
const LINE = '見た目だけで決めつけちゃ駄目ってことかしらね', ENDING = 'でも、あの後……みんなを助けてくれたんですよね';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const ROOT = new URL('../shinshoku/', import.meta.url).pathname;
const LS = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], keys: () => [...m.keys()] }; };
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };

// ── 章と段・ルート ──
t('章と段：終章A（崩れた町）・結末A／終章B（記録の間）・結末B。どの段もルートが決まり、目標と区画がある', () => {
  assert.equal(CHAPTERS.ch7a.title, '終章A　崩れた町'); assert.equal(CHAPTERS.ch7b.title, '終章B　記録の間');
  assert.equal(CHAPTERS.enda.title, '結末A　見舞い'); assert.equal(CHAPTERS.endb.title, '結末B　信頼');
  assert.deepEqual(R7_STEPS, ['ch7a_edge', 'ch7a_boss', 'ch7a_end', 'end_a']); assert.deepEqual(S7_STEPS, ['ch7b_enter', 'ch7b_boss', 'ch7b_end', 'end_b']);
  for (const id of R7_STEPS) { assert.equal(stepRoute(id), 'reveal', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); }
  for (const id of S7_STEPS) { assert.equal(stepRoute(id), 'secret', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); }
  assert.equal(chapterNo('ch7a_boss'), 7); assert.equal(chapterNo('end_b'), 8);
  assert.equal(atLeastIn('ch7a_boss', 'ch6a_fin'), true); assert.equal(atLeastIn('end_b', 'ch6_s_end'), true); assert.equal(atLeastIn('ch7a_edge', 'ch6_s_end'), false);
});
t('ルートの続き：第6章の終わりの表を閉じると終章へ（A：崩れた町／B：記録の間）。終章でもルートの記録を書き換えない', () => {
  const g6 = src('game/ch6.js'), g7 = src('game/ch7.js');
  assert.ok(/flags\.endcard6a = true;[\s\S]*?this\.later\(0\.4, \(\) => this\.startCh7a\(\)\)/.test(g6));
  assert.ok(/flags\.endcard6s = true;[\s\S]*?this\.later\(0\.4, \(\) => this\.startCh7b\(\)\)/.test(g6));
  assert.ok(/startCh7a\(\) \{[\s\S]*?this\.route\.route !== 'reveal'[\s\S]*?this\.changeArea\('abyss', 'human'\)/.test(g7));
  assert.ok(/startCh7b\(\) \{[\s\S]*?this\.route\.route !== 'secret'[\s\S]*?this\.changeArea\('kiroku', 'corridor'\)/.test(g7));
  assert.equal((g7.match(/choose\(/g) || []).length, 0); assert.ok(!/routeLock\s*=/.test(g7) && !/branchLog\.push/.test(g7));
  assert.ok(/jump7\(step\) \{[\s\S]*?this\.jump6\(rr === 'reveal' \? 'ch6a_fin' : 'ch6_s_end'\)/.test(g7), '飛び先も第6章の終わりの状態から');
  assert.ok(/if \(A === 'avenue' && s === 'ch6a_fin' && this\.flags\.endcard6a/.test(g7) && /if \(A === 'admin' && s === 'ch6_s_end' && this\.flags\.endcard6s/.test(g7), '表を閉じた後のセーブから読んでも終章へ進める');
});
t('結末はルートだけで決まる（再現できる）：reveal → end_reveal（結末A）、secret → end_secret（結末B）。本編の 9 種とは別', () => {
  assert.equal(endingOf('reveal'), 'end_reveal'); assert.equal(endingOf('secret'), 'end_secret'); assert.equal(endingOf(null), null);
  for (let i = 0; i < 5; i++) assert.equal(endingOf('reveal'), 'end_reveal');
  assert.deepEqual(Object.keys(ENDINGS), ['end_reveal', 'end_secret']);
  for (const k of ['rebirth', 'king', 'engineer', 'father', 'debtfree', 'normal', 'collapse', 'bankrupt', 'flame']) assert.ok(!(k in ENDINGS));
  const g7 = src('game/ch7.js');
  assert.ok(/toEnding7\(r\) \{\s*const id = endingOf\(this\.route\.route\)/.test(g7), '結末の場面はルートから選ぶ（終章の入力・成績で変わらない）');
  assert.ok(/this\.setStep\(id === 'end_reveal' \? 'end_a' : 'end_b'\)/.test(g7));
  assert.equal(CUTSCENES7.cs_end_a.ending, 'end_reveal'); assert.equal(CUTSCENES7.cs_end_b.ending, 'end_secret');
});
t('区画のつながり：崩れた町は reveal だけ・記録の間は secret だけ・結末の場面へ。どこからでも商店街へ戻れる', () => {
  assert.equal(AREA_GRAPH.abyss.routeOnly, 'reveal'); assert.equal(AREA_GRAPH.kiroku.routeOnly, 'secret');
  assert.ok(AREA_GRAPH.avenue.exits.includes('abyss') && AREA_GRAPH.admin.exits.includes('kiroku'));
  const r = reachable(AREA_GRAPH, 'shotengai'); for (const a of ['abyss', 'kiroku', 'epilogue']) { assert.ok(r.has(a), a); assert.ok(reachable(AREA_GRAPH, a).has('shotengai'), a); }
  assert.ok(/abyss: \(\.\.\.a\) => BUILDERS3\.abyss\(\.\.\.a\), kiroku: \(\.\.\.a\) => BUILDERS3\.kiroku\(\.\.\.a\), epilogue: \(\.\.\.a\) => BUILDERS3\.epilogue\(\.\.\.a\)/.test(src('world/areas.js')));
});
t('最終戦の前のセーブ地点：A＝公衆電話（崩れた町）／B＝内線電話（記録の間）。戦いの始まりに自動セーブ', () => {
  const a8 = src('world/areas8.js');
  assert.ok(/id: 'ab_phone', kind: 'save'/.test(a8) && /id: 'ki_phone', kind: 'save'/.test(a8));
  const g7 = src('game/ch7.js');
  assert.ok(/case 'bossWake7': \{[\s\S]*?this\.saveSlot\('auto', true\)/.test(g7) && /case 'bossWake7b': \{[\s\S]*?this\.saveSlot\('auto', true\)/.test(g7));
  assert.ok(/ch7a_edge[\s\S]*?公衆電話でセーブできる/.test(src('story/chapters.js')) && /ch7b_enter[\s\S]*?内線電話でセーブできる/.test(src('story/chapters.js')));
});

// ── 原文の台詞 ──
t('決め台詞は全編で 2 回のまま（第3章のだんのうら・第4章の（相棒））。終章・結末には無い。三度目になりそうな所では（相棒）が名前を呼ぶ', () => {
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events);
  assert.equal(all.split(LINE).length - 1, 2); assert.equal(all.split('見た目だけで').length - 1, 2);
  assert.equal(JSON.stringify(CUTSCENES7).indexOf('見た目'), -1);
  const files = walk(ROOT).filter(p => /\.(js|json|html|css)$/.test(p)); let total = 0; for (const p of files) total += readFileSync(p, 'utf8').split(LINE).length - 1;
  assert.equal(total, 2, 'shinshoku/ 全体で 2 回');
  const sup = CUTSCENES7.cs07a_support.lines; assert.ok(sup.some(l => l.who === 'companion' && /だんのうらさん/.test(l.text)), '（相棒）は名前を呼ぶ');
  for (const f of ['game/ch7.js', 'data/ch7.js', 'world/areas8.js', 'actor/models7.js', 'story/cutscenes7.js']) assert.ok(!src(f).includes('見た目だけで'), f);
});
t('結末A の原文は 1 回だけ（結末A・（相棒）・一字一句）。結末B・終章・資料・コードには無い', () => {
  const F = fixedLines(CUTSCENES); assert.deepEqual(F.map(f => f.id), ['cs03_line', 'cs04_line', 'cs_end_a']);
  const fe = F.find(f => f.id === 'cs_end_a'); assert.equal(fe.text, ENDING); assert.equal(fe.who, 'companion');
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events); assert.equal(all.split(ENDING).length - 1, 1);
  const files = walk(ROOT).filter(p => /\.(js|json|html|css)$/.test(p)); let total = 0; const where = [];
  for (const p of files) { const k = readFileSync(p, 'utf8').split(ENDING).length - 1; total += k; if (k) where.push(p.replace(ROOT, '')); }
  assert.equal(total, 1); assert.deepEqual(where, ['story/cutscenes7.js']);
  assert.equal(JSON.stringify(CUTSCENES7.cs_end_b).indexOf('みんなを助けて'), -1);
  assert.ok(!src('game/ch7.js').includes('みんなを助けて') && !src('data/ch7.js').includes('みんなを助けて'));
});
t('結末A：原文の一言の間、カメラはだんのうらの白い髪（顔ではなく髪・頭の後ろの上から）。髪は白と紫が混ざっている', () => {
  const cs = CUTSCENES7.cs_end_a, L = cs.lines.find(l => l.fixed);
  assert.ok(L.hair && L.who === 'companion');
  const P = cs.actors.find(a => a.id === 'player' && a.pos), dan = P.pos, yaw = P.yaw;
  for (let k = 0; k <= 10; k++) {
    const tt = L.t + (L.dur * k) / 10 - (k === 10 ? 0.01 : 0);
    assert.equal(lineAt(cs.lines, tt), L, '台詞が出ている');
    const c = camAt(cs.cam, tt);
    // 見ている先＝白い髪（頭の上：高さ 1.5〜1.7・だんのうらの位置から 0.2m 以内）
    assert.ok(Math.hypot(c.look[0] - dan[0], c.look[2] - dan[1]) < 0.2 && c.look[1] >= 1.5 && c.look[1] <= 1.7, JSON.stringify(c));
    assert.deepEqual(c.look, HAIR_A);
    // カメラは頭の後ろ（だんのうらが向いている方の反対）・頭より上 → 顔は映らない
    const fw = [Math.sin(yaw), Math.cos(yaw)], v = [c.pos[0] - dan[0], c.pos[2] - dan[1]];
    assert.ok(fw[0] * v[0] + fw[1] * v[1] < 0, '後ろから'); assert.ok(c.pos[1] > 1.75, '上から');
    assert.ok(cs.cam.filter(k2 => k2.hair).length >= 2);
  }
  assert.ok(cs.events.some(e => e.do === 'mixedHair7') && cs.events.find(e => e.do === 'mixedHair7').t <= L.t);
  assert.ok(/buildDannouraWhite\(\{ mixed: true \}\)/.test(src('game/ch7.js')) && /opt\.mixed：結末A の見舞いの姿（白と紫が混ざった髪/.test(src('actor/models3.js')));
});
t('結末B：（相棒）は何も知らない（信頼の一言）。白い髪は映さない（紫の髪のまま・紫の姿にそろえる）', () => {
  const cs = CUTSCENES7.cs_end_b;
  assert.ok(cs.lines.some(l => l.who === 'companion' && /あなたがいてくれて、よかった/.test(l.text)));
  assert.ok(cs.events.some(e => e.do === 'ensurePurple7') && !cs.events.some(e => /mixed|White|transform/.test(e.do)));
  assert.ok(cs.cam.some(k => k.purpleHair));
  assert.ok(!cs.lines.some(l => /白い|猫|化け/.test(l.text)), '正体に触れない');
  const b = CUTSCENES7.cs07b_end; assert.ok(b.lines.some(l => l.who === 'researcher2' && /何者だ/.test(l.text)) && b.lines.some(l => l.who === 'dan' && /保全屋/.test(l.text)));
  assert.ok(!b.events.some(e => e.do === 'transform' || e.do === 'ensureWhite'), '終章B では白い姿にならない');
});
t('研究者：名前を出さない（名前未定）・九条の名前は台詞にも資料にもコードにも出ない', () => {
  const said = JSON.stringify(CUTSCENES7) + JSON.stringify(events) + JSON.stringify(DOCS7) + JSON.stringify(CREDITS);
  assert.ok(!/九条/.test(said));
  for (const f of walk(ROOT).filter(p => /\.(js|json|html)$/.test(p))) assert.ok(!/九条/.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), f);
  assert.equal(events.speakers.researcher2.name, '研究者（名前未定）'); assert.ok(events.speakers.researcher2.provisional);
  assert.ok(CREDITS.lines.some(([, s]) => /研究者　名前未定/.test(s)));
});
t('配偶者に似た異形：戦わない・話さない・本人かは決めない（終章A・終章B の両方で研究者の方を見る）。流血の表現なし', () => {
  const lines = Object.values(CUTSCENES7).flatMap(c => c.lines || []);
  assert.ok(!lines.some(l => l.who === 'spouse_like'));
  assert.ok(CUTSCENES7.cs07a_spouse.lines.some(l => /誰なのかは、分からない/.test(l.text)) && CUTSCENES7.cs07a_spouse.lines.some(l => /研究者の方を見ている/.test(l.text)));
  assert.ok(CUTSCENES7.cs07b_end.lines.some(l => /誰だったのかは、記録に残っていない/.test(l.text)));
  const g7 = src('game/ch7.js'); assert.ok(/class StillBrain extends Brain[\s\S]*?immune\(\) \{ return true; \}/.test(g7));
  assert.ok(!/血|流血|死体/.test(src('actor/models7.js').replace(/流血の表現はしない/g, '')));
});
t('だんのうら：男性の化け猫（一人称アタシ・オネェ言葉・ときどき富山弁）。女性として描かない・白い姿は本来の姿（性格は同じ）', () => {
  const dl = Object.values(CUTSCENES7).flatMap(c => c.lines || []).filter(l => l.who === 'dan');
  assert.ok(dl.length >= 15); assert.ok(dl.some(l => /アタシ/.test(l.text))); assert.ok(dl.some(l => /わよ|のよ|わね|かしら/.test(l.text)));
  assert.ok(dl.some(l => /けっ？|け？|ちゃ/.test(l.text)), '富山弁（ときどき）');
  for (const f of ['actor/models7.js', 'story/cutscenes7.js', 'game/ch7.js', 'data/ch7.js']) assert.ok(!/女性|彼女は だんのうら|ヒロイン|she /.test(src(f)), f);
  assert.ok(/お父さん|パパ/.test(JSON.stringify(CUTSCENES7.cs_end_home_a)), '娘はパパと呼ぶ');
});
t('娘：結末の家の場面だけ（安全な所で再会）。終章の危ない場所には出ない', () => {
  const where = Object.values(CUTSCENES7).filter(c => (c.lines || []).some(l => l.who === 'daughter_home') || (c.actors || []).some(a => a.id === 'daughter7')).map(c => c.id);
  assert.deepEqual(where.sort(), ['cs_end_home_a', 'cs_end_home_b']);
  for (const id of ['cs_end_home_a', 'cs_end_home_b']) assert.equal(CUTSCENES7[id].area, 'epilogue');
  assert.ok(/if \(id === 'epilogue'\) \{[\s\S]*?buildDaughter\(\)/.test(src('game/ch7.js')));
});

// ── 終章A：境界を喰らうもの ──
t('境界を喰らうもの：薙ぎ（白）・光線（赤）・雨（赤）・喰らう（白・避難の灯への線）。段階 66%・33%。咆哮で止まり、崩れると核が 2 倍', () => {
  const D = ENEMIES.kuramono; assert.ok(D.provisional && D.giant);
  assert.equal(D.attacks.sweep.parryable, true); assert.equal(D.attacks.feed.parryable, true); assert.equal(D.attacks.beam.parryable, false); assert.equal(D.attacks.rain.parryable, false);
  assert.deepEqual(D.phases.map(p => p.at), [1.0, 0.66, 0.33]);
  const b = new Kuramono({ id: 'kuramono', pos: { x: 0, z: -30 } }); b.wake([]);
  const ev = run(b, { player: { x: 0, z: 20 }, shelter: { x: -36, z: 6 } }, 12);
  assert.ok(ev.some(e => e.t === 'telegraph' && e.name === 'feed' && e.line && Math.abs(e.line.to.x + 36) < 1e-6), '喰らう：灯への線');
  const e2 = []; b.hurt(1500, 'slash', e2); assert.ok(e2.some(e => e.t === 'phase' && e.n === 1));
  const e3 = []; b.hurt(1400, 'slash', e3); assert.ok(e3.some(e => e.t === 'phase' && e.n === 2));
  const e4 = []; assert.ok(b.roared(e4)); assert.equal(b.coreOpen, true);
  const hp = b.hp, e5 = []; b.hurt(100, 'slash', e5); assert.equal(hp - b.hp, 200, '核が開いている間は 2 倍');
});
t('境界を喰らうもの：体力 0 は「倒す」ではなく「引き上げる」（resolution＝rescue・守る）。手助け（3 回負け）は体力 −25%', () => {
  const b = new Kuramono({ id: 'kuramono', pos: { x: 0, z: -30 } }); b.wake([]);
  const ev = []; b.hurt(99999, 'slash', ev); assert.equal(b.state, 'dead'); assert.equal(b.resolution, 'rescue'); assert.ok(ev.some(e => e.t === 'die'));
  assert.equal(new Kuramono({ assist: true }).hpMax, Math.round(ENEMIES.kuramono.hp * 0.75));
  assert.equal(ENEMIES.kuramono.resolve.kill, false);
  const g7 = src('game/ch7.js'); assert.ok(/onKuramonoDown7\(\) \{[\s\S]*?this\.resolve\(e, 'rescue'\)/.test(g7) && /this\.losses7a >= 3\) this\.assist7a = true/.test(g7));
});
t('避難の灯（3 か所）：「喰らう」は残っている灯を決まった順に狙う。線の間に立てば体で受けられる。支えの後は当たりが半分', () => {
  assert.equal(ABYSS.refuges.length, 3); assert.equal(ABYSS.supportFeedMul, 0.5);
  const seq = [1, 2, 3, 4].map(k => refugeTarget({}, k).id); assert.deepEqual(seq, ['H', 'M', 'S', 'H']);
  assert.deepEqual([1, 2, 3, 4].map(k => refugeTarget({}, k).id), seq, '同じ戦いなら同じ順');
  assert.equal(refugeTarget({ S: 10, H: 10 }, 5).id, 'M', '残っている灯だけ');
  const L = { from: { x: 0, z: -30 }, to: { x: -36, z: 6 }, w: 10 };
  assert.equal(blocksLine({ x: -18, z: -12 }, 3, L), true); assert.equal(blocksLine({ x: 20, z: 20 }, 3, L), false);
  assert.ok(/flags\.support7 \? Math\.round\(30 \* ABYSS\.supportFeedMul\) : 30/.test(src('game/ch7.js')));
});
t('終章A の演出：66% で町の人と（相棒）の支え・33% で配偶者に似た異形・0 で中の研究者を引き上げる → 夜明け → 白い姿 → 結末A', () => {
  const g4 = src('game/ch4.js');
  assert.ok(/case 'phase': if \(e\.kind === 'kuramono'\) \{ this\.onKuramonoPhase7\(ev\.n\)/.test(g4) && /case 'die': if \(e\.kind === 'kuramono'\) \{ this\.onKuramonoDown7\(\)/.test(g4));
  assert.ok(/n === 1 && !this\.flags\.cs_cs07a_support\) this\.later\(0\.3, \(\) => this\.playCutscene\('cs07a_support'\)\)/.test(src('game/ch7.js')));
  const E = CUTSCENES7.cs07a_end.events.map(e => e.do);
  assert.deepEqual(E, ['bossBreak7', 'researcherOut7', 'spouseFade7', 'pitClose7', 'exitGiant7', 'setStep', 'toEnding7']);
  assert.ok(CUTSCENES7.cs07a_end.lines.some(l => l.who === 'dan' && /壊すために大きくなったんじゃない/.test(l.text)));
  assert.ok(CUTSCENES7.cs07a_boss.lines.some(l => /アタシの意思で/.test(l.text)), '暴走ではない（自分の意思で巨大猫又）');
});

// ── 終章B：研究者・記録装置 ──
t('研究者（人間大の特別な最終戦）：打つ（白）・巻き戻し（赤・数秒前にいた所）・残像（赤・線）・事故の瞬間（白・（相棒）への線）', () => {
  const D = ENEMIES.kenkyusha; assert.ok(D.provisional && D.boss);
  assert.equal(D.attacks.strike.parryable, true); assert.equal(D.attacks.rewind.parryable, false); assert.equal(D.attacks.echo.parryable, false); assert.equal(D.attacks.accident.parryable, true); assert.equal(D.attacks.accident.target, 'companion');
  const b = new Kenkyusha({ id: 'k', pos: { x: 0, z: -4 }, decks: 3 }); b.wake([]);
  const past = { x: 3, z: 1 }, comp = { x: -2.2, z: 4.4 };
  const ev = run(b, { player: { x: 0, z: -2 }, past, companion: comp, decks: 3 }, 30);
  const tel = ev.filter(e => e.t === 'telegraph');
  assert.ok(tel.some(e => e.name === 'strike' && e.parryable)); const rw = tel.find(e => e.name === 'rewind'); assert.ok(rw && rw.at.x === 3 && rw.at.z === 1, '巻き戻し：数秒前の位置');
  assert.ok(tel.some(e => e.name === 'echo' && e.line));
  const b2 = new Kenkyusha({ id: 'k', pos: { x: 0, z: -4 }, decks: 3 }); b2.wake([]); const e0 = []; b2.hurt(500, 'slash', e0); b2.phase = 1; b2.patIdx = 1; b2.cool = 0;
  const ev2 = run(b2, { player: { x: 0, z: -2 }, past, companion: comp, decks: 3 }, 3);
  const ac = ev2.find(e => e.t === 'telegraph' && e.name === 'accident'); assert.ok(ac && ac.line.to.x === comp.x && ac.line.to.z === comp.z, '事故の瞬間：（相棒）への線');
});
t('研究者：記録装置が動いている間は傷が浅く、体力 25% より減らない（巻き戻し）。止めると崩れる。体力 0 で膝をつく（無力化・倒さない）', () => {
  const b = new Kenkyusha({ id: 'k', pos: { x: 0, z: -4 }, decks: 3 }); b.wake([]);
  const e1 = []; b.hurt(100, 'slash', e1); assert.equal(b.hpMax - b.hp, 60, '動いている間は 0.6 倍');
  const e2 = []; b.hurt(99999, 'slash', e2); assert.equal(b.hp, Math.round(b.hpMax * KIROKU.floor)); assert.ok(e2.some(e => e.t === 'rewound')); assert.equal(b.state !== 'kneel', true);
  const e3 = []; assert.ok(b.deckStopped(2, e3)); assert.equal(b.state, 'down'); assert.ok(e3.some(e => e.t === 'deckStop' && e.left === 2));
  b.deckStopped(1, []); b.deckStopped(0, []); assert.equal(b.decks, 0);
  const e4 = []; b.hurt(99999, 'slash', e4); assert.equal(b.state, 'kneel'); assert.equal(b.resolution, 'neutralize'); assert.ok(e4.some(e => e.t === 'neutralized')); assert.ok(!e4.some(e => e.t === 'die'));
  assert.equal(ENEMIES.kenkyusha.resolve.kill, false);
  assert.equal(new Kenkyusha({ assist: true }).hpMax, Math.round(ENEMIES.kenkyusha.hp * 0.75));
});
t('記録装置（保全の手順）：書き込み中（赤）に止めると記録が壊れる → 止めない（罰なし・何度でも）。待機（緑）の時だけ止まる。灯はくり返す', () => {
  const D = KIROKU.decks[0], C = KIROKU.cycle; assert.equal(KIROKU.decks.length, 3);
  assert.equal(deckLamp(0, D), 'write'); assert.equal(deckLamp(C.write + 0.1, D), 'idle'); assert.equal(deckLamp(C.write + C.idle + 0.1, D), 'write');
  assert.deepEqual(stopDeck([], D, 1), { ok: false, why: 'writing' }); assert.deepEqual(stopDeck([], D, C.write + 1), { ok: true, why: '' }); assert.deepEqual(stopDeck(['D1'], D, C.write + 1), { ok: false, why: 'done' });
  for (const d of KIROKU.decks) { let idle = 0; for (let tt = 0; tt < 7; tt += 0.1) if (deckLamp(tt, d) === 'idle') idle++; assert.ok(idle > 20, '7 秒のうち 3 秒は待機'); }
  assert.ok(/書き込み中[\s\S]*?記録が壊れる/.test(src('game/ch7.js')) && /書き込み中は電源を切らない/.test(src('world/areas8.js')));
  assert.ok(/this\.losses7b >= 3\) this\.assist7b = true/.test(src('game/ch7.js')));
});
t('secret で白い姿の入力は終章B でも無効（ルートの判定）・（相棒）は正体を知らないまま', () => {
  assert.ok(/ch4Secret\(\) \{ const s = this\.story\.step; return stepRoute\(s\) === 'secret'/.test(src('game/ch4.js')));
  for (const id of S7_STEPS) assert.equal(stepRoute(id), 'secret');
  assert.ok(CUTSCENES7.cs07b_arrive.events.some(e => e.do === 'ensurePurple7'));
  const comp = CUTSCENES7.cs07b_end.lines.filter(l => l.who === 'companion'); assert.ok(comp.length && comp.every(l => !/白|猫|正体/.test(l.text)));
});

// ── 結末・記録・クリア後 ──
t('記録：本作のセーブ（clear 枠）と共通の進行の自分の欄（games.shinshoku）だけ。他作品のキーは変えない', () => {
  assert.ok(SLOT_NAMES.includes('clear'));
  const ls = LS({ dannoura_endings: '{"father":{"count":1}}', kyokai_endings: '["A"]', tobi_save_v1: '{}' });
  const before = { d: ls.getItem('dannoura_endings'), k: ls.getItem('kyokai_endings'), t: ls.getItem('tobi_save_v1') };
  const WP = createWP(ls), S = new SaveStore(ls);
  const g7 = src('game/ch7.js'), body = g7.slice(g7.indexOf('recordEnding7(id) {'), g7.indexOf('showEndingCard7(id) {'));
  assert.ok(/this\.WP\.write\('shinshoku'/.test(body) && /this\.store\.write\('clear'/.test(body));
  assert.ok(!/localStorage|dannoura_|kyokai_|tobi_/.test(body), '他作品のキーに触れない');
  // 同じ形で書いてみる
  WP.write('shinshoku', { endings: { end_reveal: { firstAt: 'x', count: 1 } }, routesCleared: ['reveal'], gallery: galleryUnlocked({ end_reveal: { count: 1 } }) });
  assert.ok(S.write('clear', { endings: { end_reveal: { at: 'x' } }, carry: carryFrom(makeSlot({})), ngPlus: 0 }));
  assert.deepEqual({ d: ls.getItem('dannoura_endings'), k: ls.getItem('kyokai_endings'), t: ls.getItem('tobi_save_v1') }, before);
  assert.throws(() => WP.write('main', { endings: {} }));
  assert.deepEqual(WP.read().games.shinshoku.endings, { end_reveal: { firstAt: 'x', count: 1 } }); assert.ok(S.load('clear'));
  assert.ok(JSON.parse(ls.getItem(WP_KEY)).games.shinshoku && JSON.parse(ls.getItem(SAVE_KEY)).slots.clear);
});
t('ギャラリー（本作の中だけ）：結末A・結末B・両方を見たら対比の場面。章選択：結末を見たら全章（分岐の後はそのルート）', () => {
  assert.deepEqual(galleryUnlocked({}), []); assert.deepEqual(galleryUnlocked({ end_secret: { count: 1 } }), ['g_end_secret']);
  assert.deepEqual(galleryUnlocked({ end_reveal: 1, end_secret: 1 }), GALLERY.map(g => g.id));
  assert.deepEqual(selectableChapters({}), ['prologue']);
  assert.deepEqual(selectableChapters({ chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice'] }), ['prologue', 'ch1', 'ch2', 'ch3']);
  assert.equal(selectableChapters({ endings: { end_reveal: { count: 1 } } }).length, CHAPTER_SELECT.length);
  for (const c of CHAPTER_SELECT) { if (c.step) assert.ok(STEPS.some(s => s.id === c.step), c.id); if (c.route) assert.equal(stepRoute(c.step), c.route, c.id); }
  const m = src('main.js'); assert.ok(/chapterSelect\(id\) \{[\s\S]*?this\.jumpVia = 'chapter_select'/.test(m) && /via: this\.jumpVia \|\| 'debug'/.test(src('game/ch4.js')), '章選択の記録は via:chapter_select');
});
t('引き継ぎ（New Game+・仮）：装備・回復の道具・弾だけ（武器と姿は物語で手に入れ直す＝分岐の決まりを壊さない）', () => {
  const slot = makeSlot({ player: { equip: { owned: ['holster', 'battou'] }, items: [{ id: 'medkit_s', n: 3 }, { id: 'key_x', n: 1 }, { id: 'coffee', n: 30 }], ammo: { handgun: 500 }, weapons: { katana: { lv: 1 } } } });
  const c = carryFrom(slot);
  assert.deepEqual(c.equip, ['holster', 'battou']); assert.deepEqual(c.items, [{ id: 'medkit_s', n: 3 }, { id: 'coffee', n: 9 }]); assert.equal(c.ammo, 120);
  assert.ok(!('weapons' in c) && !('forms' in c) && !('route' in c));
  assert.ok(/newGamePlus\(\) \{[\s\S]*?ngPlus: n/.test(src('main.js')));
});
t('タイトル：ロゴ・続きから／はじめから／章選択／記録（ギャラリー）／設定。設定はタイトルからも開ける。難しさの設定がある', () => {
  const h = readFileSync(new URL('../shinshoku.html', import.meta.url), 'utf8');
  for (const a of ['cont', 'new', 'chapters', 'gallery', 'settings', 'back']) assert.ok(h.includes(`data-a="${a}"`), a);
  assert.ok(/class="tt-emblem"/.test(h) && /続きから/.test(h) && /章選択/.test(h) && /設定/.test(h));
  const ui = src('ui/ui.js'); assert.ok(/const inTitle = g\.mode === 'title'/.test(ui) && /\['easy', 'やさしい'\], \['normal', 'ふつう'\], \['hard', 'むずかしい'\]/.test(ui));
  assert.ok(/if \(b\.dataset\.tab === 'title'\) \{ location\.href = 'shinshoku\.html'/.test(ui), '一時停止の「タイトルへ」は本作のタイトル');
});
t('スタッフロール（仮）：出演・制作は仮。名前の決まっていない人物は「名前未定」。飛ばせる', () => {
  assert.ok(CREDITS.provisional && CREDITS.lines.length > 10 && CREDITS.sec > 10);
  assert.ok(CREDITS.lines.some(([, s]) => /（相棒）　名前未定/.test(s)));
  assert.ok(/credits\(lines, sec, onDone\)/.test(src('ui/ui.js')) && /cr-skip/.test(src('ui/ui.js')));
  for (const id of ['cs_end_home_a', 'cs_end_home_b']) assert.ok(CUTSCENES7[id].events.some(e => e.do === 'credits7'));
});
t('演出のデータ：終章・結末の場面は飛ばせる・字幕の話し手がそろう・段の名前が正しい・長さ', () => {
  const stepIds = new Set(STEPS.map(s => s.id));
  for (const cs of Object.values(CUTSCENES7)) {
    assert.ok(cs.skippable !== false && cs.letterbox, cs.id);
    for (const l of cs.lines) assert.ok(events.speakers[l.who], cs.id + ' ' + l.who);
    for (const e of cs.events || []) if (e.do === 'setStep') assert.ok(stepIds.has(e.arg), e.arg);
    const d = duration(cs); assert.ok(d > 10 && d < 60, cs.id + ' ' + d);
  }
  for (const k of ['giant_devour7', 'giant_block7', 'kiroku_enter7', 'deck_first7', 'deck_all7', 'accident7', 'accident_miss7', 'rewound7', 'ken_phase7']) assert.ok(events.barks[k] && events.speakers[events.barks[k].who], k);
});
t('飛び先：?ch=7&route=reveal|secret（&at=boss）・?ending=A|B', () => {
  const m = src('main.js');
  assert.ok(/if \(ch === '7'\) \{ const at = Q\.get\('at'\); return rt === 'secret' \? \(at === 'boss' \? 'ch7b_boss' : 'ch7b_enter'\) : \(at === 'boss' \? 'ch7a_boss' : 'ch7a_edge'\); \}/.test(m));
  assert.ok(/Q\.get\('ending'\) === 'A' \? 'end_a' : 'end_b'/.test(m));
  assert.ok(/const j7 = this\.jump7\(step\);/.test(m));
});
console.log(`shinshoku-p8: ${n} ok`);
