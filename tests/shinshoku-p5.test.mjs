// 『境界侵食』フェーズ5：第4章（観測分室・地下研究区画）・ルートの確定・巨大猫又・火縄銃。
// ルートの確定の記録（再現できる・分岐前から選び直しても古い記録は残る）／原文の台詞の数（第3章だんのうら 1・第4章相棒 1・合計 2）／
// 巨大猫又の状態機械／先触れ（段階・咆哮・核・喰らうの線）／火縄銃の時間（紫は銃床だけ・白は溜め 30f・込め直し 96f）／
// 入退室の記録・配電盤の謎／応答体（輪・共鳴・救う・無力化）／段・区画のつながり・演出のデータ・セーブ
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Fighter } from '../shinshoku/combat/fighter.js';
import { GiantFighter } from '../shinshoku/combat/giant.js';
import { COMBAT } from '../shinshoku/data/combat.js';
import { ENEMIES } from '../shinshoku/data/enemies.js';
import { WEAPONS } from '../shinshoku/data/weapons.js';
import { OFFICE, LAB, YARD, BREAKERS, impossibleLogs, pickLog, checkBreakers, toMin } from '../shinshoku/data/ch4.js';
import { newRouteState, setStance, choose, whiteAllowed, logKey, carryBranchLog, lastLock, RULES_VER } from '../shinshoku/story/route.js';
import { Outou } from '../shinshoku/ai/outou.js';
import { Sakibure, segDist, blocksLine } from '../shinshoku/ai/sakibure.js';
import { STEPS, TARGETS, CHAPTERS, chapterNo, stepRoute, R_STEPS, S_STEPS, reachable, stepDef } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';
import { CUTSCENES } from '../shinshoku/story/cutscenes.js';
import { CUTSCENES4, LINE_CH4 } from '../shinshoku/story/cutscenes4.js';
import { LINE_CH3 } from '../shinshoku/story/cutscenes3.js';
import { fixedLines, duration } from '../shinshoku/story/cutscene.js';
import { SLOT_NAMES, GAME_VER, SAVE_VER } from '../shinshoku/save/save.js';
import { swapFrames } from '../shinshoku/combat/switch.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const events = JSON.parse(readFileSync(new URL('../shinshoku/data/events.json', import.meta.url)));
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
const run = (brain, sense, sec, dt = 1 / 60) => { const evs = []; for (let i = 0; i < Math.round(sec / dt); i++) { const o = brain.update(dt, typeof sense === 'function' ? sense() : sense); evs.push(...o.events); if (o.move) { const dx = o.move.x - brain.pos.x, dz = o.move.z - brain.pos.z, L = Math.hypot(dx, dz); if (L > 1e-4) { const m = Math.min(L, o.move.speed * dt); brain.pos.x += dx / L * m; brain.pos.z += dz / L * m; } } } return evs; };
const ticks = (F, n, inp = {}) => { const evs = []; for (let i = 0; i < n; i++) evs.push(...F.tick(typeof inp === 'function' ? inp(i) : inp)); return evs; };

// ── ルートの確定（第4章の分岐・ROUTE_BRANCH_SPEC §3・§4） ──
const ctxOf = (o = {}) => Object.assign({ chapter: 'ch04', step: 'branch', via: 'choice', saveVer: SAVE_VER, gameVer: GAME_VER, seed: 918273, snapshot: { trust: 55, docs: 6, yokaiUses: 2 } }, o);
t('ルートの確定：route・routeLock・branchLog（再現用の項目つき）を書く。同じ入力は同じ記録（at 以外）', () => {
  const pre = setStance(newRouteState(), 'reveal', { at: 'x' });                 // 第3章の構え（ルートは決めない）
  const a = choose(pre, 'secret', ctxOf({ at: '2026-10-14T01:00:00Z', trial: { attempts: 2, assist: false, result: 'win' } }));
  const b = choose(pre, 'secret', ctxOf({ at: '2026-10-14T09:00:00Z', trial: { attempts: 2, assist: false, result: 'win' } }));
  assert.equal(a.route, 'secret'); assert.deepEqual(Object.keys(a.routeLock).sort(), ['at', 'chapter', 'rulesVer', 'step']); assert.equal(a.routeLock.chapter, 'ch04'); assert.equal(a.routeLock.rulesVer, RULES_VER);
  assert.equal(logKey(a), logKey(b), '同じセーブ・同じ入力 → 同じ記録');
  const L = a.branchLog[a.branchLog.length - 1];
  for (const k of ['seq', 'kind', 'chapter', 'step', 'decision', 'via', 'trial', 'rulesVer', 'saveVer', 'gameVer', 'seed', 'snapshot', 'at']) assert.ok(k in L, k);
  assert.equal(L.kind, 'route_lock'); assert.equal(L.decision, 'secret'); assert.equal(L.trial.result, 'win'); assert.equal(L.gameVer, '0.4.0');
  assert.equal(a.branchLog[0].kind, 'stance', '第3章の構えの記録は残る（ルートを決めない）');
});
test5();
function test5() {
  t('ルートは一度決まったら変わらない（2 度目は ignored で追記）。reveal では相棒が正体を知る', () => {
    const a = choose(newRouteState(), 'reveal', ctxOf());
    assert.equal(a.reveal.companionKnows, true); assert.equal(a.route, 'reveal');
    const c = choose(a, 'secret', ctxOf()); assert.equal(c.route, 'reveal'); assert.ok(c.branchLog[c.branchLog.length - 1].ignored);
    const s = choose(newRouteState(), 'secret', ctxOf()); assert.equal(s.reveal.companionKnows, false);
  });
  t('分岐前のセーブから選び直す：前に決めたルートの記録は superseded で残り、今のルートは最後の確定（lastLock）', () => {
    const before = newRouteState();                                         // 分岐前の枠（ルート未確定）
    const first = choose(before, 'reveal', ctxOf({ at: 'A' }));               // 一度 reveal を選んだ
    const loaded = carryBranchLog(first, before);                             // 分岐前の枠を読み込む
    assert.equal(loaded.route, null); assert.equal(loaded.branchLog.length, 1); assert.equal(loaded.branchLog[0].superseded, true);
    const second = choose(loaded, 'secret', ctxOf({ at: 'B', via: 'load_branch' }));
    assert.equal(second.route, 'secret'); assert.equal(second.branchLog.length, 2); assert.deepEqual(second.branchLog.map(e => e.seq), [1, 2]);
    assert.equal(lastLock(second).decision, 'secret'); assert.equal(lastLock(second).via, 'load_branch');
  });
  t('白い姿の可否：secret のルートでは無効・reveal のルートは第4章でも使える（whiteFree）・相棒が知っていれば見られても良い', () => {
    const r = choose(newRouteState(), 'reveal', ctxOf()); r.forms.whiteFree = true;
    assert.equal(whiteAllowed(r, { chapterNo: 4, companionWatching: true }).ok, true);
    const s = choose(setStance(newRouteState(), 'reveal', {}), 'secret', ctxOf());
    assert.equal(whiteAllowed(s, { chapterNo: 4 }).why, 'route');
    // 秘匿の試練（ルートの確定の前）でも白は出せない（ゲーム側：ch4Secret）
    assert.ok(/whiteCheck\(\) \{ if \(this\.ch4Secret && this\.ch4Secret\(\)\) return \{ ok: false, why: 'route' \}/.test(src('game/ch3.js')));
  });
  t('分岐は第4章の 1 か所だけ：route_lock を書くのは lockRoute だけ・分岐前に専用の枠 branch へ自動セーブ・選択肢は 2 つとも常に出る', () => {
    const g = src('game/ch4.js');
    assert.equal((g.match(/choose\(this\.route/g) || []).length, 1, 'choose は 1 か所');
    assert.ok(/openBranch\(\) \{[\s\S]*?saveSlot\('branch', true\)/.test(g));
    assert.ok(/id: 'reveal', label: '化けを、解く'[\s\S]*id: 'secret', label: 'このまま、人として戦う'/.test(g));
    assert.ok(SLOT_NAMES.includes('branch'));
    // secret は試練に勝った時に確定（負けても勝手に白い姿にしない・選択に戻れる）
    assert.ok(/onTrapCleared\(\)[\s\S]*?this\.lockRoute\('secret', \{ trial: \{ attempts:/.test(g));
    assert.ok(/id: 'back', label: '選択に戻る'/.test(g) && /loadSlot\('branch'\)/.test(g));
    assert.ok(/trialLosses >= 3\) opts\.push\(\{ id: 'assist'/.test(g));
  });

  // ── 原文の台詞（一字一句・回数） ──
  t('原文の台詞：第3章はだんのうら 1 回、第4章は相棒が同じ言葉を 1 回。合計 2 回（3 回目は無い）', () => {
    const LINE = '見た目だけで決めつけちゃ駄目ってことかしらね';
    assert.equal(LINE_CH3, LINE); assert.equal(LINE_CH4, LINE);
    const F = fixedLines(CUTSCENES);
    assert.deepEqual(F, [{ id: 'cs03_line', who: 'dan', text: LINE }, { id: 'cs04_line', who: 'companion', text: LINE }]);
    const all = JSON.stringify(CUTSCENES) + JSON.stringify(events);
    assert.equal(all.split(LINE).length - 1, 2, '演出・台詞のデータ全体で 2 回');
    assert.equal(all.split('見た目だけで').length - 1, 2);
    // 第4章では reveal の場面だけ（相棒が白い姿を見たあと）。secret では言わない
    const g = src('game/ch4.js');
    assert.equal((g.match(/'cs04_line'/g) || []).length, 1); assert.ok(/s === 'ch4_r_fight'\) \{ this\.playCutscene\('cs04_line'/.test(g));
    // 白い姿になってから（cs04_reveal の transform）→ 群れを払った後 → 沈黙 3 秒 → 台詞
    const cs = CUTSCENES4.cs04_line, at = cs.lines.find(l => l.fixed).t; assert.ok(at >= 3, '沈黙 3 秒');
    assert.ok(cs.lines.every(l => l.t >= at || l.fixed), '沈黙の間は台詞なし');
    assert.ok(CUTSCENES4.cs04_reveal.events.some(e => e.do === 'transform'));
    // その後の場面で相棒は名前を呼ぶ（台詞を繰り返さない）
    assert.ok(CUTSCENES4.cs04_giant_end.lines.some(l => l.who === 'companion' && /だんのうらさん/.test(l.text)));
  });
  t('結末の原文（「でも、あの後……」）は第4章に入れない（結末A で白い髪にカメラ）', () => {
    const all = JSON.stringify(CUTSCENES) + JSON.stringify(events);
    assert.equal(all.indexOf('みんなを助けてくれたんですよね'), -1);
  });

  // ── 巨大猫又 ──
  t('巨大猫又：妖爪連撃（3 段・先行入力）・紫の咆哮（妖力 20・開いている間に白い攻めを返す）・跳躍（無敵・見切り）・妖気放出（押している間・妖力を使う）', () => {
    const G = COMBAT.giant, F = new GiantFighter();
    let ev = ticks(F, 70, i => ({ attack: i === 0 || i === 14 || i === 28 }));
    assert.deepEqual(ev.filter(e => e.t === 'clawStart').map(e => e.step), [0, 1, 2]);
    assert.ok(ev.filter(e => e.t === 'clawActive').length >= 3);
    const F2 = new GiantFighter(); const g0 = F2.gauge;
    ev = ticks(F2, G.roar.startup + 2, i => ({ parry: i === 0 }));
    assert.equal(g0 - F2.gauge > G.roar.cost - 1, true); assert.ok(ev.some(e => e.t === 'roarBurst'));
    assert.equal(F2.incoming({ src: 'b', dmg: 14, parryable: true, inRange: true }), 'roar'); assert.equal(F2.hp, G.hp);
    const F3 = new GiantFighter(); ticks(F3, 6, i => ({ dodge: i === 0 }));
    assert.equal(F3.incoming({ src: 'b', dmg: 20, parryable: false, inRange: true }), 'just'); assert.ok(F3.mikiri);
    ticks(F3, 20); assert.equal(F3.incoming({ src: 'b', dmg: 20, parryable: false, inRange: true }), 'evade');
    const F4 = new GiantFighter(); const g4 = F4.gauge;
    ev = ticks(F4, G.beam.startup + 60, { aim: true });
    assert.ok(Math.abs(ev.filter(e => e.t === 'beamTick').length - 60 / G.beam.tick) <= 1); assert.ok(F4.gauge < g4);
  });
  t('巨大猫又：巨大化の妖力が 0 でも元に戻らない・暴走しない（動きと威力が落ちるだけ）・攻撃の入力は 4 つ（市民を攻撃する操作は無い）', () => {
    const F = new GiantFighter({ gauge: 0 });
    assert.equal(F.weak, true); assert.equal(F.moveMul(), COMBAT.giant.gauge.weakMul); assert.equal(F.dmgMul(), COMBAT.giant.gauge.weakMul);
    const ev = ticks(F, 300, i => ({ attack: i % 20 === 0 }));
    assert.ok(!ev.some(e => /revert|rampage|berserk/.test(e.t)));
    const tk = src('combat/giant.js'); assert.ok(/tick\(inp = \{\}\)/.test(tk)); for (const k of ['attack', 'dodge', 'parry', 'aim']) assert.ok(tk.includes('inp.' + k));
    assert.ok(!YARD.props.some(p => /civilian|person|people/.test(p.kind)), '戦場に人を置かない');
    const F5 = new GiantFighter(); F5.incoming({ src: 'b', dmg: 30, inRange: true }); assert.equal(F5.hp, COMBAT.giant.hp - 30);
    assert.equal(F5.incoming({ src: 'b', dmg: 30, inRange: true }), 'invuln', '被弾の後の無敵');
  });
  t('境界の先触れ：体力 60%・30% で段階・咆哮（予兆中）でひるんで核が開く＝2 倍・崩しで倒れる・「喰らう」の線の間に立つと守れる', () => {
    const b = new Sakibure({ id: 's', pos: { x: 0, z: -30 }, state: 'hostile', seed: 3 });
    const sense = { player: { x: 0, z: 10 }, shelter: { x: -36, z: 30 } };
    let ev = run(b, sense, 3); assert.ok(ev.some(e => e.t === 'telegraph'));
    assert.ok(b.atk && b.atk.phase === 'windup' || b.atk);
    const e2 = []; assert.equal(b.roared(e2), true); assert.equal(b.state, 'stagger'); assert.equal(b.coreOpen, true);
    const hp0 = b.hp; const e3 = []; b.hurt(50, 'slash', e3, {}); assert.equal(hp0 - b.hp, 100, '核が開いている間は 2 倍');
    const e4 = []; b.state = 'hostile'; b.hurt(b.hp - Math.floor(b.hpMax * 0.59), 'slash', e4, {}); assert.equal(b.phase, 1); assert.ok(e4.some(e => e.t === 'phase' && e.n === 1));
    const e5 = []; b.hurt(b.hp - Math.floor(b.hpMax * 0.29), 'slash', e5, {}); assert.equal(b.phase, 2);
    const line = { from: { x: 0, z: -30 }, to: { x: -36, z: 30 }, w: 9 };
    assert.equal(blocksLine({ x: -18, z: 0 }, 4.2, line), true); assert.equal(blocksLine({ x: 20, z: 0 }, 4.2, line), false); assert.equal(blocksLine({ x: -37, z: 31 }, 4.2, line), false, '詰所の上に立っても線の手前ではない');
    assert.ok(Math.abs(segDist({ x: 0, z: 0 }, { x: -5, z: 0 }, { x: 5, z: 0 })) < 1e-9);
    const def = ENEMIES.sakibure; assert.equal(def.attacks.sweep.parryable, true); assert.equal(def.attacks.feed.parryable, true); assert.equal(def.attacks.beam.parryable, false); assert.equal(def.provisional, true);
  });

  // ── 火縄銃 ──
  t('火縄銃（紫）：撃てない＝銃床の打撃だけ（発生 20f・判定 6f・戻り 30f・威力 28）・弾けない・持ち替えは重い（18〜27f）', () => {
    const F = new Fighter({ owned: ['katana', 'matchlock'], weapon: 'matchlock' });
    const ev = ticks(F, 70, i => ({ attack: i === 0 }));
    const s = ev.find(e => e.t === 'attackStart'); assert.equal(s.atk.startup, 20); assert.equal(s.atk.dmg, 28); assert.equal(s.atk.recovery, 30);
    const act = ev.filter(e => e.t === 'active'); assert.equal(act.length, 6); assert.equal(act[0].frame - s.frame, 20);
    assert.ok(!ev.some(e => e.t === 'yodan' || e.t === 'shot'), '紫では撃たない');
    assert.equal(F.canParry, false); assert.equal(WEAPONS.matchlock.parry, false);
    const p = ticks(F, 20, i => ({ parry: i === 0 })); assert.ok(!p.some(e => e.t === 'parryStart'));
    const sf = swapFrames('katana', 'matchlock'); assert.ok(sf >= COMBAT.swap.heavyMin && sf <= COMBAT.swap.heavyMax);
  });
  t('火縄銃（白・妖弾）：溜め 30f → 撃つ（妖力 20・威力 60・貫通）→ 反動 → 込め直し 96f（遅い）。込め直しの間は撃てない', () => {
    const Y = COMBAT.matchlock.yodan; assert.equal(Y.charge, 30); assert.equal(Y.cost, 20); assert.equal(Y.dmg, 60); assert.ok(Y.reload > COMBAT.handgun.reload); assert.ok(Y.pierce >= 2);
    const C2 = JSON.parse(JSON.stringify(COMBAT)); C2.white.gauge.drain = 0;          // 妖力の自然な減りを止めて、使った量だけを見る
    const F = new Fighter({ combat: C2, owned: ['katana', 'matchlock'], weapon: 'katana', yoki: 100, yokiOn: true });
    F.setForm('white', true); let ev = ticks(F, 14, i => ({ swap: i === 0 })); assert.equal(F.weapon, 'matchlock');
    const y0 = F.yoki;
    ev = ticks(F, 200, i => ({ attack: i === 0 || i === 60 }));
    const st = ev.find(e => e.t === 'mchargeStart'), sh = ev.filter(e => e.t === 'yodan'), rd = ev.find(e => e.t === 'mreloadDone');
    assert.equal(sh.length, 1, '込め直しの間の攻撃では撃てない'); assert.equal(sh[0].frame - st.frame, Y.charge);
    assert.equal(rd.frame - sh[0].frame, Y.recoil + Y.reload); assert.equal(y0 - F.yoki, Y.cost);
    ev = ticks(F, 40, i => ({ attack: i === 0 })); assert.equal(ev.filter(e => e.t === 'yodan').length, 1, '込め直した後はまた撃てる');
    // 溜めは回避で取り消せる（妖力は使わない）
    const G = new Fighter({ owned: ['matchlock'], weapon: 'katana', yoki: 50, yokiOn: true }); G.setForm('white', true); ticks(G, 14, i => ({ swap: i === 0 }));
    const yk = G.yoki; ev = ticks(G, 20, i => ({ attack: i === 0, dodge: i === 10 })); assert.ok(ev.some(e => e.t === 'mcancel')); assert.ok(!ev.some(e => e.t === 'yodan')); assert.ok(G.yoki > yk - 2);
    const H = new Fighter({ owned: ['matchlock'], weapon: 'katana', yoki: 40, yokiOn: true }); H.setForm('white', true); ticks(H, 14, i => ({ swap: i === 0 })); H.yoki = 10;
    ev = ticks(H, 5, i => ({ attack: i === 0 })); assert.ok(ev.some(e => e.t === 'noYoki'));
  });

  // ── 調べ物（必須の謎）・仕掛け ──
  t('入退室の記録【必須】：停電（23:41）〜非常電源（02:10）の間に記録のある行は 1 つ（00:52・B-07）。手掛かりは 2 か所（事故報告書・保全記録）', () => {
    assert.equal(toMin('00:52') > toMin('23:41'), true);
    const I = impossibleLogs(); assert.equal(I.length, 1); assert.equal(I[0].id, OFFICE.answer); assert.equal(I[0].card, OFFICE.card);
    let s = pickLog({}, 'L4'); assert.equal(s.done, false); assert.equal(s.miss, 1); s = pickLog(s, 'L5'); assert.equal(s.done, true);
    for (const k of ['report_text', 'power_text']) assert.ok(events.texts[k].includes('02:10') || events.texts[k].includes('23:41'), k);
    assert.equal(OFFICE.provisional, true);
  });
  t('配電盤【secret の必須】：容量 3 で隔壁と鎮静を入れ、応答炉は入れない。答えは 1 通り（保全記録で分かる）', () => {
    assert.equal(checkBreakers(['D', 'S']).ok, true); assert.equal(checkBreakers(['D', 'S', 'R']).why, 'reactor'); assert.equal(checkBreakers(['D', 'S', 'L']).why, 'over');
    assert.equal(checkBreakers(['S', 'L', 'V']).why, 'door'); assert.equal(checkBreakers(['D', 'L']).why, 'sedation');
    const ids = BREAKERS.list.map(b => b.id); let ok = 0;
    for (let m = 0; m < 1 << ids.length; m++) if (checkBreakers(ids.filter((_, i) => m & (1 << i))).ok) ok++;
    assert.equal(ok, 1); assert.ok(events.texts.maint_text.includes('容量 3'));
  });
  t('応答体：輪（呼び出しで端末へ・応答・槽へ戻る）・見定め → 敵対・共鳴・試験終了の合図で救う・鎮静で無力化・蒸気の中では見失う', () => {
    const term = { x: -5.6, z: 0.4 };
    const a = new Outou({ id: 'o', pos: { x: -10, z: 2 }, tank: { x: -11.2, z: 2 }, habit: true, terminal: term, seed: 3 });
    const far = { player: { x: 10, z: -20, noise: 'none' }, los: false };
    let ev = run(a, Object.assign({ chime: true }, far), 0.2); ev = ev.concat(run(a, far, 8));
    assert.ok(ev.some(e => e.t === 'say' && e.key === 'outou_answer')); assert.ok(Math.hypot(a.pos.x - term.x, a.pos.z - term.z) < 3 || a.sub === 'toTank' || a.sub === 'wait');
    const b = new Outou({ id: 'b', pos: { x: 0, z: 0 }, seed: 5 });
    ev = run(b, { player: { x: 0, z: 2, noise: 'run' }, los: true }, 2.0); assert.equal(b.state, 'hostile');
    const c = new Outou({ id: 'c', pos: { x: 3, z: 0 }, seed: 6 }); const e1 = []; assert.equal(c.resonate(e1, 0.2, { x: 0, z: 0 }), true); assert.equal(c.state, 'hostile');
    const d = new Outou({ id: 'd', pos: { x: 0, z: 0 }, seed: 7 }); const e2 = []; assert.equal(d.endSignal(e2), true); assert.equal(d.resolution, 'rescue'); assert.ok(d.immune());
    const h = new Outou({ id: 'h', pos: { x: 0, z: 0 }, seed: 8, state: 'hostile' }); assert.equal(h.endSignal([]), false, '戦っている相手には届かない'); assert.equal(h.sedate([]), false); assert.equal(h.sedate([], true), true);
    const s = new Outou({ id: 's', pos: { x: 0, z: 0 }, seed: 9 }); ev = run(s, { player: { x: 0, z: 1.5, noise: 'run' }, los: true, steam: true }, 2); assert.equal(s.state, 'loop', '蒸気の中では見つからない');
    const k = new Outou({ id: 'k', pos: { x: 0, z: 0 }, seed: 9 }); const e3 = []; k.hurt(10, 'slash', e3, { poise: 5 }); assert.ok(e3.some(e => e.t === 'resonate'));
    assert.equal(ENEMIES.outou.provisional, true); assert.deepEqual(Object.keys(ENEMIES.outou.resolve).sort(), ['escape', 'kill', 'neutralize', 'rescue']);
  });

  // ── 段・区画・演出 ──
  t('第4章の段：観測分室 → 地下 → 分岐 → reveal（白い姿・巨大猫又）／secret（試練・配電盤・守り）。どちらも章の終わりまで。区画のつながり', () => {
    assert.equal(CHAPTERS.ch4.title, '第4章　境界の夜'); assert.equal(chapterNo('ch4_branch'), 4);
    const ids = STEPS.filter(s => s.ch === 'ch4').map(s => s.id);
    assert.deepEqual(ids.slice(0, 6), ['ch4_office', 'ch4_logs', 'ch4_vault', 'ch4_down', 'ch4_lab', 'ch4_branch']);
    for (const id of ids) assert.ok(id in TARGETS, id);
    assert.equal(R_STEPS[R_STEPS.length - 1], 'ch4_r_end'); assert.equal(S_STEPS[S_STEPS.length - 1], 'ch4_s_end');
    for (const id of R_STEPS) assert.equal(stepRoute(id), 'reveal'); for (const id of S_STEPS) assert.equal(stepRoute(id), 'secret'); assert.equal(stepRoute('ch4_branch'), null);
    const r = reachable(AREA_GRAPH, 'shotengai'); for (const a of ['office', 'lab', 'yard']) assert.ok(r.has(a), a);
    assert.equal(AREA_GRAPH.yard.routeOnly, 'reveal'); assert.equal(stepDef('ch4_r_giant').area, 'yard'); assert.ok(S_STEPS.every(s => stepDef(s).area === 'lab'), 'secret は町を壊さない（ヤードへ行かない）');
    assert.ok(LAB.hold.sec >= 30 && LAB.hold.waves.length >= 3);
  });
  t('演出：第4章の場面は区画・段・話し手が正しく、出来事はゲーム側で扱う名前だけ。研究者の名前は出さない', () => {
    const stepIds = new Set(STEPS.map(s => s.id));
    const known = new Set(['setStep', 'flag', 'expr', 'formCard', 'transform', 'whiteFlicker', 'companionFollow', 'pa', 'rumble', 'camShake', 'playerAnim', 'ensureWhite', 'trapRing', 'spawnTrap', 'trapFight', 'emergency', 'reactorOff', 'holdStart', 'bossRise4', 'giantGrow', 'bossWake4', 'bossCollapse', 'giantShrink', 'endCard4']);
    const g = src('game/ch4.js');
    for (const cs of Object.values(CUTSCENES4)) {
      assert.ok(AREA_GRAPH[cs.area], cs.id); assert.ok(duration(cs) > 3, cs.id);
      for (const e of cs.events || []) { assert.ok(known.has(e.do), cs.id + ':' + e.do); if (e.do === 'setStep') assert.ok(stepIds.has(e.arg), e.arg); if (!['setStep', 'flag', 'expr', 'formCard', 'transform', 'whiteFlicker', 'companionFollow'].includes(e.do)) assert.ok(g.includes(`case '${e.do}'`), e.do); }
      for (const l of cs.lines || []) assert.ok(events.speakers[l.who], l.who);
    }
    assert.ok(!/九条/.test(JSON.stringify(CUTSCENES4)) && !/九条/.test(JSON.stringify(events.events)));
    assert.equal(events.speakers.researcher.provisional, true);
    // 巨大猫又の場面：大きくなる（giantGrow）→ 戦い（bossWake4）→ 戻る（giantShrink）
    const order = ['giantGrow', 'bossWake4'].map(n => CUTSCENES4.cs04_giant.events.find(e => e.do === n).t); assert.ok(order[0] < order[1]);
    assert.ok(CUTSCENES4.cs04_giant_end.events.some(e => e.do === 'giantShrink'));
  });
  t('だんのうらは男性：台詞の一人称は「アタシ」・オネェ言葉。巨大な姿の作りも男性（スカート・ドレスの部品なし）。娘は危ない所へ連れてこない', () => {
    const dl = Object.values(CUTSCENES4).flatMap(c => c.lines).filter(l => l.who === 'dan').map(l => l.text).join('');
    assert.ok(/アタシ/.test(dl)); assert.ok(/わよ|かしら|ましょ|なさい/.test(dl)); assert.ok(/千代さん/.test(dl), '娘は千代さんに預けている');
    const m = src('actor/models4.js') + src('actor/models5.js'); assert.ok(!/skirt|dress|スカート|ドレス/i.test(m)); assert.ok(/male: true/.test(m));   // 巨大猫又はフェーズ6 で models5.js へ
  });
  t('セーブ：版 0.4.0・分岐前の枠（branch）・火縄銃の所持を保存', () => {
    assert.equal(GAME_VER, '0.4.0'); assert.ok(SLOT_NAMES.includes('branch') && SLOT_NAMES.includes('tenki'));
    assert.ok(/matchlock: F\.owned\.includes\('matchlock'\) \? \{ lv: 1 \} : null/.test(src('main.js')));
  });
}
console.log(`shinshoku-p5: ${n} ok`);
