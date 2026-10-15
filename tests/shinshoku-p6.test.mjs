// 『境界侵食』フェーズ6：第5章（A 侵食／B 秘匿・旧研究棟）と第6章A の冒頭（暴走 → 我に返る → 守る）。
// ルートの続き（第4章 → 第5章：両ルート）／原文の台詞は全編で 2 回のまま／暴走の決まり（市民を攻撃する入力が無い・失敗の状態が無い・必ず我に返る）／
// 守る／継接（部分・鞄・無力化・救う）／収容者（鐘・点呼）／点呼と配電盤の謎／区画のつながり／演出のデータ／巨大猫又の作り（男性）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBJECTS, rollcallAnswer, checkRollcall, rollcallRooms, BREAKERS5, checkBreakers5, DOCS5, OLDWING, ATRIUM, RAMPAGE, PROTECT } from '../shinshoku/data/ch5.js';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { Shuusha } from '../shinshoku/ai/shuusha.js';
import { Tsugihagi, sideOf } from '../shinshoku/ai/tsugihagi.js';
import { Rampage, Protect } from '../shinshoku/combat/rampage.js';
import { STEPS, TARGETS, CHAPTERS, chapterNo, stepRoute, R_STEPS, S_STEPS, R5_STEPS, S5_STEPS, atLeastIn, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CUTSCENES5 } from '../shinshoku/story/cutscenes5.js';
import { fixedLines, duration } from '../shinshoku/story/cutscene.js';
import { newRouteState, choose, whiteAllowed } from '../shinshoku/story/route.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
const LINE = '見た目だけで決めつけちゃ駄目ってことかしらね';
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };
const far = { player: { x: 99, z: 99, noise: 'none', dead: false }, los: false };

// ── ルートの続き（第4章 → 第5章） ──
t('章と段：第5章A（reveal）→ 第6章A の冒頭 ／ 第5章B（secret）。どの段もルートが決まっている・目標の印・区画がある', () => {
  assert.equal(CHAPTERS.ch5a.title, '第5章A　侵食'); assert.equal(CHAPTERS.ch5b.title, '第5章B　秘匿'); assert.equal(CHAPTERS.ch6a.title, '第6章A　巨躯');
  for (const id of R5_STEPS) { assert.equal(stepRoute(id), 'reveal', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); }
  for (const id of S5_STEPS) { assert.equal(stepRoute(id), 'secret', id); assert.ok(id in TARGETS, id); assert.ok(AREA_GRAPH[stepDef(id).area], id); }
  assert.equal(chapterNo('ch5_r_ward'), 5); assert.equal(chapterNo('ch5_s_ward'), 5); assert.equal(chapterNo('ch6a_rampage'), 6);
  assert.deepEqual(STEPS.filter(s => s.ch === 'ch5a').map(s => s.id), ['ch5_r_enter', 'ch5_r_ward', 'ch5_r_chief', 'ch5_r_gate', 'ch5_r_boss', 'ch5_r_end']);
  assert.deepEqual(STEPS.filter(s => s.ch === 'ch5b').map(s => s.id), ['ch5_s_enter', 'ch5_s_power', 'ch5_s_ward', 'ch5_s_archive', 'ch5_s_gate', 'ch5_s_boss', 'ch5_s_end']);
  // ルートどうしは比べない（並びは 1 本でも、違うルートの段は「先」ではない）
  assert.equal(atLeastIn('ch5_r_gate', 'ch5_r_ward'), true); assert.equal(atLeastIn('ch5_s_enter', 'ch5_r_ward'), false); assert.equal(atLeastIn('ch5_r_enter', 'ch4_r_end'), true); assert.equal(atLeastIn('ch5_s_enter', 'ch4_r_end'), false);
});
t('第4章の終わり → 第5章：ルートの記録はそのまま（ここで route_lock を書かない）。reveal は搬入ヤードの崩れた壁、secret は研究区画の連絡通路から', () => {
  const g4 = src('game/ch4.js'), g5 = src('game/ch5.js');
  assert.ok(/\['ch4_r_end', 'ch4_s_end'\]\.includes\(this\.story\.step\)\) this\.later\(0\.4, \(\) => this\.startCh5\(\)\)/.test(g4), '第4章の終わりの表を閉じると第5章へ');
  assert.ok(/startCh5\(\) \{[\s\S]*?const rt = this\.route\.route; if \(!rt\) return;[\s\S]*?this\.setStep\(rt === 'reveal' \? 'ch5_r_enter' : 'ch5_s_enter'\);[\s\S]*?this\.changeArea\('oldwing', rt === 'reveal' \? 'gate' : 'tunnel'\)/.test(g5));
  assert.equal((g5.match(/choose\(/g) || []).length, 0, '第5章ではルートを書き換えない'); assert.ok(!/routeLock\s*=/.test(g5));
  assert.ok(/jump5\(step\) \{[\s\S]*?this\.jump4\(rr === 'reveal' \? 'ch4_r_end' : 'ch4_s_end'\)/.test(g5), '飛び先も第4章の終わりの状態（ルートの確定・相棒が知っているか）を作ってから');
  // reveal：白い姿の自由操作（相棒は知っている）／secret：白は無効のまま
  const r = choose(newRouteState(), 'reveal', { chapter: 'ch04' }); r.forms.whiteFree = true;
  assert.equal(whiteAllowed(r, { chapterNo: 5, companionWatching: true }).ok, true);
  const s = choose(newRouteState(), 'secret', { chapter: 'ch04' }); assert.equal(whiteAllowed(s, { chapterNo: 5 }).why, 'route');
  assert.ok(/ch4Secret\(\) \{ const s = this\.story\.step; return stepRoute\(s\) === 'secret'/.test(g4) && S5_STEPS.every(id => stepRoute(id) === 'secret'), 'secret の第5章でも白い姿の入力は無効（ch4Secret が段のルートで判定）');
});
t('区画のつながり：旧研究棟・観測棟は両ルート、巨大用の町（暴走）は reveal だけ。secret は町を壊さない', () => {
  const r = reachable(AREA_GRAPH, 'shotengai'); for (const a of ['oldwing', 'atrium', 'town']) assert.ok(r.has(a), a);
  for (const a of ['oldwing', 'atrium', 'town']) assert.ok(reachable(AREA_GRAPH, a).has('shotengai'), a);
  assert.equal(AREA_GRAPH.town.routeOnly, 'reveal'); assert.ok(S5_STEPS.every(id => stepDef(id).area !== 'town')); assert.ok(R5_STEPS.filter(id => /^ch6a/.test(id)).every(id => stepDef(id).area === 'town'));
  assert.ok(AREA_GRAPH.oldwing.exits.includes('lab') && AREA_GRAPH.oldwing.exits.includes('yard'), '入口は両方（ルートで使い分け）');
});

// ── 原文の台詞・結末の原文 ──
t('原文の台詞は全編で 2 回のまま（第3章のだんのうら・第4章の相棒）。第5章・第6章A には無い（相棒は名前を呼ぶ）', () => {
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events);
  assert.equal(all.split(LINE).length - 1, 2); assert.equal(all.split('見た目だけで').length - 1, 2);
  assert.deepEqual(fixedLines(CUTSCENES).map(f => f.id), ['cs03_line', 'cs04_line']);
  assert.equal(JSON.stringify(CUTSCENES5).indexOf('見た目'), -1); assert.equal(fixedLines(CUTSCENES5).length, 0);
  for (const k of ['rampage_call_1', 'rampage_call_2', 'rampage_call_3', 'rampage_call_4']) { assert.equal(events.barks[k].who, 'companion'); assert.ok(/だんのうらさん/.test(events.barks[k].text)); }
  assert.ok(CUTSCENES5.cs06_calm.lines.some(l => l.who === 'companion' && /だんのうらさん/.test(l.text)), '我に返る場面：相棒は名前を呼ぶ');
  assert.ok(!src('game/ch5.js').includes(LINE) && !src('game/ch5.js').includes('見た目だけで'));
});
t('結末A の原文（「でも、あの後……みんなを助けてくれたんですよね」）は結末A を作るまで入れない', () => {
  const all = JSON.stringify(CUTSCENES) + JSON.stringify(events) + src('game/ch5.js');
  assert.equal(all.indexOf('みんなを助けてくれたんですよね'), -1);
});

// ── 暴走（第6章A の冒頭） ──
t('暴走の入力の表に「市民を攻撃する」入力は無い（移動・抑える・カメラだけ）。攻撃の入力を入れても何も変わらない', () => {
  assert.deepEqual(RAMPAGE.inputs, ['move', 'suppress', 'camera']);
  for (const k of ['attack', 'claw', 'roar', 'beam', 'heavy']) assert.ok(!RAMPAGE.inputs.includes(k), k);
  const a = new Rampage({ seed: 5 }), b = new Rampage({ seed: 5 }); const ea = [], eb = [];
  for (let i = 0; i < 60 * 12; i++) { ea.push(...a.tick(1 / 60, { suppressHeld: i % 3 === 0 })); eb.push(...b.tick(1 / 60, { suppressHeld: i % 3 === 0, attack: true, claw: true, beam: true })); }
  assert.deepEqual(eb.map(e => e.t), ea.map(e => e.t)); assert.equal(a.suppress, b.suppress); assert.equal(a.damage, b.damage);
  // ゲーム側：暴走の 1 ステップは攻撃を読まない（数えるだけ）・敵への当たりを出さない
  const g = src('game/ch5.js'), body = g.slice(g.indexOf('stepRampage5(I) {'), g.indexOf('protectStart5() {'));
  assert.ok(/R\.tick\(DT, \{ moveX: I\.moveX, moveY: I\.moveY, suppressHeld: sm !== 'mash' && !!I\.transform, suppressPress: sm !== 'hold' && !!I\.parry \}\)/.test(body), '読むのは移動と「抑える」（設定で長押し／連打／両方）だけ');
  assert.ok(!/damageEnemy|giantHitBoss|resolveEnemyHit|people/.test(body), '暴走中に人や敵へ当たる処理は無い（被害は小物の演出だけ）');
  assert.ok(/if \(this\.rampage && !this\.rampage\.calm\) this\.stepRampage5\(I\)/.test(src('main.js')), '暴走の間は巨大猫又の技（stepGiant）を通らない');
});
t('暴走：失敗の状態は無い。何もしなくても時間で必ず我に返る／抑えて名前を呼ばれれば早く我に返る（声）。（相棒）の負傷は 1 回だけ（演出）', () => {
  const idle = new Rampage({ seed: 3 }); const ev = []; for (let i = 0; i < 60 * (RAMPAGE.maxSec + 1); i++) ev.push(...idle.tick(1 / 60, {}));
  assert.ok(idle.calm); assert.equal(idle.calmBy, 'time'); assert.ok(!ev.some(e => /fail|dead|over/.test(e.t)));
  assert.equal(ev.filter(e => e.t === 'injury').length, 1); assert.ok(ev.filter(e => e.t === 'call').length >= RAMPAGE.calls.needed);
  const hold = new Rampage({ seed: 3 }); let tc = 0; for (let i = 0; i < 60 * RAMPAGE.maxSec && !hold.calm; i++) { hold.tick(1 / 60, { suppressHeld: true }); tc = hold.t; }
  assert.ok(hold.calm && hold.calmBy === 'voice' && tc < RAMPAGE.maxSec - 5, '抑えて呼ばれると早く戻る：' + tc);
  // 連打でも抑えられる（長押しと連打の両方を受け付ける）
  const mash = new Rampage({ seed: 3 }); for (let i = 0; i < 60 * RAMPAGE.maxSec && !mash.calm; i++) mash.tick(1 / 60, { suppressPress: i % 8 === 0 });
  assert.ok(mash.calm && mash.calmBy === 'voice');
  // 抑えるほど暴れ（被害の演出）が少ない・画面の歪みは呼ばれるたびに引く
  assert.ok(hold.damage < idle.damage, `${hold.damage} < ${idle.damage}`);
  const r = new Rampage({ seed: 9 }); const d0 = r.distortion; for (let i = 0; i < 60 * 12; i++) r.tick(1 / 60, {}); assert.ok(r.calls >= 1 && r.distortion < d0);
});
t('暴走は人格や姿（性別）の変化ではない：だんのうらの台詞はいつもの口調（アタシ・オネェ言葉）で、抑えようとしている。娘は記憶だけ（危ない所に出てこない）', () => {
  const dl = Object.values(CUTSCENES5).flatMap(c => c.lines).filter(l => l.who === 'dan').map(l => l.text).join('') + events.barks.rampage_strain.text + events.barks.rampage_anchor.text;
  assert.ok(/アタシ/.test(dl) && /わよ|かしら|ましょ|なさい|ね。/.test(dl)); assert.ok(/抑え|言うことを|止まりなさい/.test(dl + JSON.stringify(events.barks)));
  assert.ok(/おかえり/.test(events.barks.rampage_anchor.text), '娘の記憶が錨'); assert.ok(!JSON.stringify(CUTSCENES5).includes("id: 'child'") && !Object.values(CUTSCENES5).some(c => (c.actors || []).some(a => a.id === 'child')));
  const m = src('actor/models5.js'); assert.ok(!/skirt|dress|スカート|ドレス/i.test(m)); assert.ok(/male: true/.test(m)); assert.ok(/setRampage = k =>/.test(m) && /性格や姿（性別）は変えない/.test(m));
  assert.ok(/暴走＝巨大な姿の力があふれて、体が言うことを聞かない状態（性格が変わるのではない/.test(src('combat/rampage.js')));
});
t('守る（我に返った後）：倒れる物ごとに決まった動き（尾で払う・体で受ける・前足で運ぶ）。範囲の中で合う動きなら守れる・間に合わなくても先へ進む', () => {
  const P = new Protect(); const out = [];
  for (let i = 0; i < 60 * 40 && !P.done; i++) {
    out.push(...P.tick(1 / 60));
    for (const h of P.active()) if (h.id !== 'h5') { assert.equal(P.act('lift', { x: h.at[0] + 99, z: h.at[1] }), null, '範囲の外は守れない'); const wrongAct = PROTECT.act[h.kind] === 'shield' ? 'tailSweep' : 'shield'; assert.equal(P.act(wrongAct, { x: h.at[0], z: h.at[1] }), null, '動きが違うと守れない'); assert.ok(P.act(PROTECT.act[h.kind], { x: h.at[0] + 2, z: h.at[1] })); }
  }
  assert.ok(P.done); assert.equal(P.saved, PROTECT.hazards.length - 1); assert.equal(P.missed, 1, 'h5 は何もしない → 落ちる（失敗ではなく先へ）');
  assert.ok(out.some(e => e.t === 'protectEnd')); assert.deepEqual([...new Set(Object.values(PROTECT.act))].sort(), ['lift', 'shield', 'tailSweep']);
});

// ── 継接（第5章のボス） ──
t('継接：部分ごとに壊れ、行動が変わる（右腕 → 叩かず暴れる・左腕 → 鞄を落とす・脚 → 動けない＝無力化）', () => {
  const b = new Tsugihagi({ id: 't', pos: { x: 0, z: 0 } }); const ev = []; b.wake(ev);
  assert.ok(b.pattern().includes('knock') && b.pattern().includes('embrace') && b.pattern().includes('stomp') && !b.pattern().includes('thrash'));
  for (let i = 0; i < 12; i++) b.hurt(10, 'slash', ev, { side: 'right' });
  assert.equal(b.parts.right.alive, false); assert.ok(ev.some(e => e.t === 'partBroken' && e.part === 'right')); assert.ok(!b.pattern().includes('knock') && b.pattern().includes('thrash'));
  for (let i = 0; i < 10; i++) b.hurt(10, 'slash', ev, { side: 'left' });
  assert.equal(b.parts.left.alive, false); assert.equal(b.bag, 'dropped'); assert.ok(ev.some(e => e.t === 'bagDrop')); assert.ok(!b.pattern().includes('embrace'));
  b.hp = Math.round(b.hpMax * 0.45);                                  // 体力が半分を切った後
  for (let i = 0; i < 21; i++) b.hurt(10, 'slash', ev, { side: 'back' });
  assert.equal(b.parts.legs.alive, false); assert.equal(b.state, 'fallen'); assert.equal(b.resolution, 'neutralize'); assert.ok(ev.some(e => e.t === 'neutralized')); assert.ok(b.alive, '無力化は倒すのとは別');
  assert.equal(b.hurt(50, 'slash', ev, {}), 0, '無力化の後は傷が入らない');
  const c = new Tsugihagi({ id: 'c', pos: { x: 0, z: 0 } }); c.wake([]);
  for (let i = 0; i < 40; i++) { c.hurt(5, 'slash', [], { side: 'back' }); c.state = 'hostile'; }
  assert.ok(c.parts.legs.alive && c.parts.legs.hp === 1, '体力が半分を切るまで脚は崩れきらない（鞄を返す時間）');
});
t('継接：体幹が崩れると左腕がゆるんで鞄が落ちる → 拾って持ち主の机へ返す＝救う（部分がほどける）。倒すもできる。逃げるは不可', () => {
  const b = new Tsugihagi({ id: 't', pos: { x: 0, z: 0 } }); const ev = []; b.wake(ev);
  for (let i = 0; i < 40 && b.state !== 'down'; i++) b.hurt(4, 'slash', ev, { side: 'front', poise: 20 });
  assert.equal(b.state, 'down'); assert.equal(b.bag, 'dropped'); assert.equal(b.hurt(5, 'slash', ev, { side: 'front' }) > 0, true); assert.ok(b.parts.legs.hp < b.parts.legs.max, '崩れている間は脚へ入る');
  b.bagTaken(); assert.equal(b.bag, 'carried'); b.bagLost({ x: 1, z: 1 }); assert.equal(b.bag, 'dropped'); b.bagTaken();
  assert.ok(b.returnBag(ev)); assert.equal(b.resolution, 'rescue'); assert.equal(b.state, 'unravel'); assert.ok(ev.some(e => e.t === 'rescued'));
  const k = new Tsugihagi({ id: 'k', pos: { x: 0, z: 0 } }); const e2 = []; k.wake(e2); for (let i = 0; i < 60 && k.alive; i++) k.hurt(20, 'slash', e2, { side: 'front' });
  assert.equal(k.resolution, 'kill'); assert.ok(e2.some(e => e.t === 'die'));
  assert.equal(ENEMIES.tsugihagi.resolve.escape, false); assert.equal(ATRIUM.bagOwner, 'B');
  assert.equal(new Tsugihagi({ id: 'a', assist: true }).hpMax, Math.round(ENEMIES.tsugihagi.hp * 0.75), '手助け（3 回負け）で体力 −25%');
  assert.equal(new Tsugihagi({ id: 'd', state: 'dormant' }).immune(), true);
});
t('継接：叩いた側の判定（右・左・前・後ろ）。ゲーム側は叩いた位置から部分を選ぶ', () => {
  assert.equal(sideOf({ x: 0, z: 0 }, 0, { x: 2, z: 0 }), 'left'); assert.equal(sideOf({ x: 0, z: 0 }, 0, { x: -2, z: 0 }), 'right');
  assert.equal(sideOf({ x: 0, z: 0 }, 0, { x: 0, z: 2 }), 'front'); assert.equal(sideOf({ x: 0, z: 0 }, 0, { x: 0, z: -2 }), 'back');
  assert.ok(/if \(e\.kind === 'tsugihagi' && !opt\.side\) opt = Object\.assign\(\{ side: sideOf\(e\.pos, e\.brain\.yaw, this\.player\.pos\) \}, opt\)/.test(src('game/combat.js')));
});

// ── 収容者・点呼（必須の謎）・配電盤 ──
t('点呼の答え：在棟の 3 人を収容の古い順に。名簿（日付・在棟）と、鐘の時に戸口に立つ順＋部屋の札の、どちらからでも同じ答え', () => {
  assert.deepEqual(rollcallAnswer(), ['桐生 アヤ', '野見 ミツ', '宮下 ハジメ']);
  assert.deepEqual(rollcallRooms(), ['103', '105', '102']);
  assert.deepEqual(rollcallRooms().map(r => SUBJECTS.find(s => s.room === r).name), rollcallAnswer(), '観察（部屋）＋札（名前）＝名簿の答え');
  assert.equal(checkRollcall(rollcallAnswer()).ok, true);
  assert.equal(checkRollcall(['野見 ミツ', '桐生 アヤ', '宮下 ハジメ']).why, 'order'); assert.equal(checkRollcall(['桐生 アヤ', '野見 ミツ']).why, 'count'); assert.equal(checkRollcall(['葛西 トモ', '野見 ミツ', '宮下 ハジメ']).why, 'absent');
  assert.equal(OLDWING.shuusha.length, 3); for (const o of OLDWING.shuusha) assert.equal(SUBJECTS.find(s => s.no === o.subject).status, '在棟');
});
t('収容者：鐘で収容の古い順に戸口へ立つ（atDoor）→ 輪へ戻る。正しい点呼で部屋へ戻って休む（救う）。違う点呼で騒ぐ（敵対）', () => {
  const sub = SUBJECTS.find(s => s.no === 'S-08');
  const a = new Shuusha({ id: 'a', pos: { x: -1.6, z: -9 }, path: [[-1.6, -9], [-1.6, -15]], subject: sub, door: { x: -1.7, z: -12 }, room: { x: -5.6, z: -12.6 } });
  assert.equal(a.bell(0), true); const ev = run(a, far, 12); assert.ok(ev.some(e => e.t === 'atDoor' && e.room === '103')); assert.ok(ev.some(e => e.t === 'bellEnd')); assert.equal(a.state, 'loop');
  const e2 = []; assert.ok(a.called(e2)); assert.equal(a.resolution, 'rescue'); run(a, far, 8); assert.equal(a.state, 'rest'); assert.equal(a.immune(), true);
  const b = new Shuusha({ id: 'b', pos: { x: 0, z: 0 }, subject: sub }); const e3 = []; assert.ok(b.agitate(e3, { x: 1, z: 1 })); assert.equal(b.state, 'hostile');
  assert.ok(ENEMIES.shuusha.attacks.shove.parryable && ENEMIES.shuusha.attacks.grab.grab);
});
t('配電盤（secret の必須）：容量 4 で点呼卓・隔離扉の錠・排水ポンプ。焼却炉は入れない・照明は入らない', () => {
  assert.deepEqual(checkBreakers5(['C', 'G', 'P']), { ok: true, load: 4, why: '' });
  assert.equal(checkBreakers5(['C', 'G', 'P', 'L']).why, 'over'); assert.equal(checkBreakers5(['C', 'G', 'P', 'X']).why, 'forbid'); assert.equal(checkBreakers5(['C', 'G']).why, 'need:P'); assert.equal(checkBreakers5(['G', 'P']).why, 'need:C');
  assert.equal(BREAKERS5.capacity, 4); assert.equal(BREAKERS5.provisional, true);
});
t('延期の記録（必須）は両ルートの通り道の上に 1 つずつ（reveal：主任研究室の原本・崩れた床を白い姿で跳ぶ／secret：記録保管庫の控え・封印と排水）。観測棟へは読んでから', () => {
  assert.equal(DOCS5.delay.required, true); assert.ok(!/九条/.test(DOCS5.delay.text)); assert.ok(/塗りつぶ|黒く塗/.test(DOCS5.delay.text));
  const a5 = src('world/areas5.js'), g5 = src('game/ch5.js');
  assert.ok(/id: 'ow_chief', kind: 'delay5', where: 'chief'/.test(a5) && /id: 'ow_archive', kind: 'delay5', where: 'archive'/.test(a5));
  assert.ok(/if \(\(rv && s\.where !== 'chief'\) \|\| \(!rv && s\.where !== 'archive'\)\)/.test(g5));
  assert.ok(/s\.to === 'atrium' && this\.area\.id === 'oldwing' && this\.flags\.ow_gate && !this\.flags\.delay5\) \{ this\.sayText\(T\.ow_gate_delay\)/.test(g5));
  assert.ok(/tryLeap5\(s\) \{[\s\S]*?if \(this\.ch5Route\(\) !== 'reveal'\)[\s\S]*?if \(!this\.F\(\)\.white\)/.test(g5), '跳ぶのは reveal の白い姿だけ（secret には別の道）');
  // 次の段は進み具合から（どの順で解いても進める＝取り逃しで閉じない）
  assert.ok(/nextCh5Step\(\) \{[\s\S]*?!f\.ow_gate \? 'ch5_r_ward' : !f\.delay5 \? 'ch5_r_chief' : 'ch5_r_gate'/.test(g5));
});

// ── 演出のデータ ──
t('演出：第5章・第6章A の場面は区画・段・話し手が正しく、出来事はゲーム側で扱う名前だけ。研究者・配偶者の名前は出さない', () => {
  const stepIds = new Set(STEPS.map(s => s.id)), g = src('game/ch5.js') + src('game/ch4.js') + src('game/story.js') + src('game/ch6.js');
  for (const cs of Object.values(CUTSCENES5)) {
    assert.ok(AREA_GRAPH[cs.area], cs.id); assert.ok(duration(cs) > 3, cs.id);
    for (const e of cs.events || []) { if (e.do === 'setStep') assert.ok(stepIds.has(e.arg), e.arg); assert.ok(g.includes(`case '${e.do}'`), cs.id + ':' + e.do); }
    for (const l of cs.lines || []) assert.ok(events.speakers[l.who], l.who);
  }
  assert.ok(!/九条/.test(JSON.stringify(CUTSCENES5) + JSON.stringify(events)));
  // 暴走（CS-06A-1）→ 我に返る（CS-06A-2）→ 守る の順
  assert.ok(CUTSCENES5.cs06_rampage.events.some(e => e.do === 'rampageStart')); assert.ok(CUTSCENES5.cs06_calm.events.some(e => e.do === 'poleCatch') && CUTSCENES5.cs06_calm.events.some(e => e.do === 'protectStart'));
  assert.ok(CUTSCENES5.cs06_injury.lines.every(l => !/死|血/.test(l.text)), '負傷は演出のみ（致命傷ではない）');
  // secret の到着：白がにじみかけて戻る（見るのはプレイヤーだけ）
  assert.ok(CUTSCENES5.cs05_s_arrive.events.some(e => e.do === 'whiteFlicker')); assert.ok(!CUTSCENES5.cs05_s_arrive.events.some(e => e.do === 'transform' || e.do === 'ensureWhite'));
});
t('巨大猫又・ボスの見た目：炎の毛（加算・+1 描画）、暴走の見た目は色と揺れだけ。境界の先触れ・継接は作り直し（目の群れ）', () => {
  const m = src('actor/models5.js'), sk = src('actor/skin.js'), tn = src('render/toon.js');
  assert.ok(/export function flameMaterial/.test(tn) && /groups\.glow\.pos\.length/.test(sk));
  assert.ok(/export function buildGiantNekomata/.test(m) && /export function buildSakibure/.test(m) && /export function buildTsugihagi/.test(m) && /export function buildShuusha/.test(m));
  assert.ok(/めがね/.test(m) && /ピンクの花/.test(m) && /二本の尾/.test(m));
  assert.ok(/export \{ buildGiantNekomata \} from '\.\/models5\.js'/.test(src('actor/models4.js')));
});
console.log(`shinshoku-p6: ${n} ok`);
