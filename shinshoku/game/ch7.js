// 終章（A 崩れた町／B 記録の間）と結末（A 見舞い／B 信頼）・クリア後の実行。Game（main.js）のメソッドとして組み込む。
// ・reveal（終章A）：第6章A の終わりの表 → 崩れた町と境界の淵（人の大きさ・白い姿）→ 公衆電話（セーブ）→ 淵の縁で自分の意思で巨大猫又 →
//   境界を喰らうもの（避難の灯を「喰らう」から守る）。66%：町の人と（相棒）の支え／33%：配偶者に似た異形 → 体力 0：中の研究者を引き上げる（倒さない）→ 結末A。
// ・secret（終章B）：第6章B の終わりの表 → 記録の間（（相棒）と一緒・正体は知らない）→ 内線電話（セーブ）→ 研究者（人間大の特別な最終戦・紫の姿だけ）：
//   記録装置は「待機」の時に止める（書き込み中に切ると記録が壊れる＝保全の手順。壊さない）・（相棒）への線の間に立つ → 膝をつく（無力化）→ 結末B。
// ・結末：見舞い（A：原文の一言の間、白い髪）／信頼（B：紫の髪だけ）→ 家で娘と再会（安全な所）→ スタッフロール → 結果 → 記録（本作のセーブと共通の進行の自分の欄だけ）。
// ルートの記録（route / routeLock / branchLog）は第4章で確定したまま。ここでは書き換えない（ROUTE_BRANCH_SPEC）。結末はルートだけで決まる（同じルートなら同じ結末）。
import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';
import { ABYSS, refugeTarget, KIROKU, deckLamp, stopDeck, DOCS7, EPILOGUE, ENDINGS, endingOf, galleryUnlocked, CREDITS, carryFrom } from '../data/ch7.js';
import { Kuramono } from '../ai/kuramono.js';
import { Kenkyusha } from '../ai/kenkyusha.js';
import { Brain } from '../ai/brain.js';
import { segDist, blocksLine } from '../ai/sakibure.js';
import { buildKuramono, buildResearcher, buildSpouseLike, buildDaughter } from '../actor/models7.js';
import { buildDannouraWhite } from '../actor/models3.js';
import { buildCivilian } from '../actor/models.js';
import { KuramonoAnimator, researcherPose, spousePose, daughterPose } from '../actor/anim7.js';
import { civilianPose, locomotion } from '../actor/anim.js';
import { buildDannoura } from '../actor/models.js';
import { stepDef, stepRoute, R7_STEPS, S7_STEPS } from '../story/chapters.js';
import { EnemyActor } from '../actor/actors.js';
import { accidentTex } from '../world/areas8.js';

const DT = 1 / 60;
const CH7_AREAS = ['abyss', 'kiroku', 'epilogue'];
const fmt = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; };
/** 動かない役者（娘・千代さん・配偶者に似た異形・引き上げた研究者）の脳：何もしない・傷を受けない */
class StillBrain extends Brain { constructor(o) { super({ hp: 1, poise: 1, senses: { fov: 0, sight: 0, sightDark: 0, hear: { gun: 0, run: 0, walk: 0 }, memory: 0 }, attacks: {}, pattern: [], stagger: {} }, o); this.state = o.state || 'rest'; } immune() { return true; } update() { this.t += 1 / 60; return { move: null, face: null, events: [] }; } }

export const ch7Methods = {
  // ── 始まり ──
  /** reveal：第6章A の終わりの表を閉じた後 → 崩れた町と境界の淵（人の大きさ・白い姿） */
  startCh7a() {
    if (this.flags.ch7a_started || this.route.route !== 'reveal') return;
    this.flags.ch7a_started = true;
    if (this.giantMode) this.exitGiant();
    const F = this.F(); F.hp = F.hpMax; F.yokiOn = true; F.yoki = Math.max(F.yoki, 90);
    this.setStep('ch7a_edge');
    this.changeArea('abyss', 'human');
  },
  /** secret：第6章B の終わりの表を閉じた後 → 記録の間（（相棒）と一緒） */
  startCh7b() {
    if (this.flags.ch7b_started || this.route.route !== 'secret') return;
    this.flags.ch7b_started = true;
    const F = this.F(); F.hp = F.hpMax; F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted');
    this.companion.brain.setMode('follow'); this.companion.root.visible = true;
    this.setStep('ch7b_enter');
    this.changeArea('kiroku', 'corridor');
  },
  onAreaEnter7(id) {
    const s = this.story.step;
    if (id === 'abyss' && s === 'ch7a_edge' && !this.flags.cs_cs07a_arrive) this.later(0.1, () => this.playCutscene('cs07a_arrive'));
    if (id === 'kiroku' && s === 'ch7b_enter' && !this.flags.kiroku_bark7) { this.flags.kiroku_bark7 = true; this.later(0.6, () => this.bark('kiroku_enter7', 3)); }
    if (id === 'epilogue') this.later(0.1, () => this.playEnding7());
    if (CH7_AREAS.includes(id)) this.applyArea7();
  },
  applyArea7() {
    const A = this.area, D = A.dyn, f = this.flags;
    if (A.id === 'abyss') {
      for (const R of ABYSS.refuges) { const d = D['ref' + R.id]; if (!d) continue; for (const i of d.lamps) this.halos.setK(i, f.support7 ? 0.9 : 0.15); }
      if (f.pitClosed7) { D.rim.material.opacity = 0.1; D.pitGlow.material.opacity = 0.02; }
      this.sfx.setAmbience('abyss');
    }
    if (A.id === 'kiroku') { this.sfx.setAmbience('kiroku'); for (const id of (f.decks7 || [])) this.deckOff7(id); }
    if (A.id === 'epilogue') this.sfx.setAmbience('epi_day');
  },

  // ── 敵・役者 ──
  spawnCh7(id, add) {
    if (!CH7_AREAS.includes(id)) return false;
    const s = this.story.step;
    if (id === 'abyss') {
      const r = this.enemyRes.kuramono;
      if (!r) {
        const B = ABYSS.boss, b = new Kuramono({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, yaw: 0, seed: 77, assist: !!this.assist7a });
        const m = this.bossModel7(); const e = add(b, m); m.actorRef = e; e.big = true; e.poseFn = () => ({ pose: {}, rate: 0 }); e.r = 9; b.r = 9; e.h = 30; this.boss = e;
        e.root.visible = s === 'ch7a_boss' || !!this.flags.boss7_risen;
        if (s === 'ch7a_boss') b.wake([]);
      }
      this.refuges7 = this.refuges7 || Object.fromEntries(ABYSS.refuges.map(q => [q.id, q.hp]));
      return true;
    }
    if (id === 'kiroku') {
      const r = this.enemyRes.kenkyusha, B = KIROKU.boss;
      const brain = new Kenkyusha({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, yaw: 0, seed: 91, assist: !!this.assist7b, decks: 3 - (this.flags.decks7 || []).length, state: r ? 'kneel' : 'dormant' });
      if (r) brain.resolution = r;
      const e = add(brain, buildResearcher()); e.poseFn = researcherPose; e.r = 0.42; e.h = 1.8; this.boss = r ? null : e;
      e.root.visible = true;
      if (s === 'ch7b_boss' && !r) brain.wake([]);
      return true;
    }
    if (id === 'epilogue') {
      const H = EPILOGUE.home;
      const dg = this.addProp7(add, 'daughter7', buildDaughter(), H.child, 0, null); dg.poseFn = ctx => daughterPose(Object.assign({ mode: dg.mode7 }, ctx));
      this.addProp7(add, 'chiyo7', buildCivilian(5), H.chiyo, Math.PI * 0.8, ctx => civilianPose({ time: ctx.t, speed: ctx.speed, phase: ctx.phase }));
      for (const e of this.enemies) if (e.prop7) e.root.visible = false;
      return true;
    }
    return true;
  },
  addProp7(add, id, model, pos, yaw, poseFn, state = 'rest') {
    const e = add(new StillBrain({ id, kind: id, pos: { x: pos[0], z: pos[1] }, yaw, state }), model);
    e.prop7 = true; e.poseFn = poseFn; e.mode7 = null; return e;
  },
  bossModel7() {
    const m = buildKuramono(); m.root.scale.setScalar(13); m.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const base = m.update; m.anim = new KuramonoAnimator(m);
    m.update = dt => { if (base) base(dt); if (m.anim && m.actorRef) m.anim.update(dt, m.actorRef); };
    return m;
  },
  placeCompanion7(id) {
    if (!CH7_AREAS.includes(id)) return false;
    const C = this.companion, b = C.brain, s = this.story.step;
    C.rootY = 0;
    if (id !== 'kiroku') { C.root.visible = false; b.setMode('scripted'); C.anim = null; return true; }   // reveal：（相棒）は病院／結末：演出で出す
    C.root.visible = true; C.anim = null;
    if (s === 'ch7b_boss' || s === 'ch7b_end') { b.setMode('scripted'); b.pos = { x: KIROKU.companionAt[0], z: KIROKU.companionAt[1] }; b.yaw = Math.PI; C.anim = s === 'ch7b_boss' ? 'hide' : null; return true; }
    b.setMode('follow'); b.teleportBehind(this.player.pos, this.player.yaw);
    return true;
  },
  /** 研究者が見る「数秒前にいた所」・（相棒）の位置・動いている記録装置の数（combat.js の stepEnemy から） */
  senseExtra7(e) {
    if (e.kind !== 'kenkyusha') return null;
    const C = this.companion, past = this.pastPos7(e.brain.def.attacks.rewind.past);
    return { past, companion: C.root.visible ? { x: C.brain.pos.x, z: C.brain.pos.z } : null, decks: 3 - (this.flags.decks7 || []).length };
  },
  pastPos7(sec = 2) { const h = this.hist7 || []; const want = this.playSec - sec; for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= want) return { x: h[i].x, z: h[i].z }; return h.length ? { x: h[0].x, z: h[0].z } : { x: this.player.pos.x, z: this.player.pos.z }; },

  // ── 毎ステップ ──
  storyTick7() {
    const A = this.area.id; if (!CH7_AREAS.includes(A)) return;
    const P = this.player.pos, s = this.story.step;
    if (A === 'kiroku') {
      const h = this.hist7 || (this.hist7 = []); if (this.frame % 6 === 0) { h.push({ t: this.playSec, x: P.x, z: P.z }); if (h.length > 40) h.shift(); }
      if (s === 'ch7b_enter' && P.z < KIROKU.enter && !this.cut.active) this.playCutscene('cs07b_arrive');
      this.tickDecks7();
    }
  },
  tickDecks7() {
    const D = this.area.dyn, st = this.flags.decks7 || [];
    for (const dk of KIROKU.decks) { if (st.includes(dk.id)) continue; const L = deckLamp(this.playSec, dk); const d = D.decks[dk.id]; if (d.lampState !== L) { d.lampState = L; this.halos.setColor(d.lamp, L === 'write' ? 0xff3030 : 0x40ff70); } }
  },

  // ── 調べる（終章） ──
  useSpot7(s) {
    switch (s.kind) {
      case 'edge7':
        if (this.story.step !== 'ch7a_edge') { this.sayText('淵の底は見えない。'); return true; }
        this.playCutscene('cs07a_boss'); return true;
      case 'deck7': this.deck7(s.deck); return true;
      case 'clue7': { const doc = DOCS7[s.clue]; this.flags['seen_' + s.clue] = true; this.metrics.puzzles['ch7_' + s.clue] = true; if (doc) this.addDoc(doc.id); if (this.story.step === 'ch7b_boss' || this.story.step === 'ch7a_boss') this.sayBark('sys', `『${doc.title}』${doc.text}`, 4); else this.sayText(`『${doc.title}』${doc.text}`); return true; }
    }
    return false;
  },
  /** 記録装置を止める（待機＝緑の時だけ。書き込み中＝赤に切ると記録が壊れる：あの人の記録まで消すことになる） */
  deck7(id) {
    const st = this.flags.decks7 || (this.flags.decks7 = []), D = KIROKU.decks.find(q => q.id === id);
    const r = stopDeck(st, D, this.playSec); this.metrics.deckTries7 = (this.metrics.deckTries7 || 0) + 1;
    if (r.why === 'done') { this.sayBark('dan', 'これはもう止めたわ', 1.6); return; }
    if (!r.ok) {
      this.metrics.deckRefused7 = (this.metrics.deckRefused7 || 0) + 1; this.sfx.play('ui_ng');
      this.sayBark('dan', '……書き込み中。今切ったら、記録が壊れる。あの人の記録まで、消すことになるわ（緑の灯を待つ）', 3.2);
      return;
    }
    st.push(id); this.metrics.puzzles['deck7_' + id] = true; this.sfx.play('breaker'); this.sfx.play('power_down'); this.ui.toast(`記録装置を止めた（${st.length}／3）`, 'parry', 1.4);
    this.deckOff7(id);
    const e = this.boss && this.boss.kind === 'kenkyusha' ? this.boss : null;
    if (e && e.brain.alive) { const ev = []; e.brain.deckStopped(3 - st.length, ev); this.enemyEvents(e, ev); }
    if (st.length === 1 && !this.flags.deck_bark7) { this.flags.deck_bark7 = true; this.later(0.6, () => this.bark('deck_first7', 3)); }
    if (st.length >= 3) { this.flags.decksAll7 = true; this.later(0.4, () => this.bark('deck_all7', 3)); }
  },
  deckOff7(id) { const d = this.area.dyn.decks && this.area.dyn.decks[id]; if (!d) return; d.off = true; this.halos.setColor(d.lamp, 0x303030); this.halos.setK(d.lamp, 0.15); },

  // ── 研究者（終章B）の出来事 ──
  enemyEvents7(e, ev) {
    if (e.kind !== 'kenkyusha') return false;
    const b = e.brain, P = this.player, F = P.fighter;
    switch (ev.t) {
      case 'telegraph': {
        e.mark = ev.parryable ? 'parry' : 'red'; e.markT = ev.def.windup + 0.2; this.sfx.play(ev.parryable ? 'tel_parry' : 'tel_red', b.pos);
        const T7 = this.metrics.kenTele7 || (this.metrics.kenTele7 = {}); T7[ev.name] = (T7[ev.name] || 0) + 1;
        if (ev.name === 'rewind' && ev.at) { this.fx.decal('circle', ev.at.x, ev.at.z, { r: ev.def.aoe.r, dur: ev.def.windup, hold: 0.25, color: 0xff3040 }); this.sfx.play('rewind7', ev.at); if (!this.flags.rewind_hint7) { this.flags.rewind_hint7 = true; this.hint('巻き戻し：数秒前にいた所が狙われる ── 動き続ける'); this.later(5, () => this.hint(null)); } }
        if (ev.line) { const L = ev.line, dx = L.to.x - L.from.x, dz = L.to.z - L.from.z; this.fx.decal('line', L.from.x, L.from.z, { r: Math.hypot(dx, dz), w: L.w, yaw: Math.atan2(dx, dz), dur: ev.def.windup, hold: 0.3, color: ev.parryable ? 0xfff0f0 : 0xff3040 }); }
        if (ev.name === 'accident') { this.ui.toast('事故の瞬間 ──（相棒）を狙っている：線の間に立って受ける', 'weak', 1.8); this.bark('accident7', 2.2); }
        if (ev.name === 'strike') this.fx.decal('arc', b.pos.x, b.pos.z, { r: ev.def.range, arc: ev.def.arc, yaw: b.yaw, dur: ev.def.windup, hold: 0.15, color: 0xfff0e0 });
        this.companionSeeTelegraph(e, ev.parryable ? 'parry' : 'red');
        return true;
      }
      case 'attack': {
        const A = ev.def; this.metrics.kenAttacks7 = (this.metrics.kenAttacks7 || 0) + 1;
        if (ev.name === 'strike') { this.sfx.play('swing_heavy', b.pos); this.resolveEnemyHit(e, A, false); return true; }
        if (ev.name === 'rewind') { this.sfx.play('wave', ev.at); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; this.fx.puff(ev.at.x + Math.sin(a) * 1.4, 0.4, ev.at.z + Math.cos(a) * 1.4, -Math.sin(a) * 2, 0.6, -Math.cos(a) * 2, 0xb070ff, 0.7, 0.5); } this.resolveEnemyHit(e, A, false, ev.at); return true; }
        if (ev.name === 'echo') {
          const L = ev.line, d = segDist(P.pos, L.from, L.to), inRange = d <= L.w / 2 + P.r, near = d <= L.w / 2 + 1.4;
          this.fx.streak(new THREE.Vector3(L.from.x, 1.2, L.from.z), new THREE.Vector3(L.to.x, 1.2, L.to.z), 0xc080ff, 0.4, 0.5); this.sfx.play('dash', b.pos);
          const r = F.incoming({ src: e, dmg: A.dmg, parryable: false, inRange, nearMiss: near }); this.handleFighter(F.drain()); e.lastAttackResult = r; return true;
        }
        if (ev.name === 'accident') {
          const L = ev.line, block = blocksLine(P.pos, P.r, L);
          this.fx.streak(new THREE.Vector3(L.from.x, 1.4, L.from.z), new THREE.Vector3(block ? P.pos.x : L.to.x, 1.2, block ? P.pos.z : L.to.z), 0xffe0f0, 0.5, 0.6); this.sfx.play('slam', block ? P.pos : L.to);
          if (block) { this.metrics.accidentBlocks7 = (this.metrics.accidentBlocks7 || 0) + 1; const r = F.incoming({ src: e, dmg: A.dmg, parryable: true, inRange: true, nearMiss: true }); this.handleFighter(F.drain()); e.lastAttackResult = r; this.ui.toast('（相棒）の前で受けた', 'parry', 1.2); return true; }
          this.metrics.accidentHits7 = (this.metrics.accidentHits7 || 0) + 1; const C = this.companion; C.brain.trust = Math.max(0, C.brain.trust - 2); C.anim = 'cower'; this.later(1.4, () => { if (this.story.step === 'ch7b_boss') C.anim = 'hide'; });
          this.ui.toast('（相棒）の近くに落ちた！（けがはない）', 'weak', 1.4); this.bark('accident_miss7', 2.4); return true;
        }
        return true;
      }
      case 'rewound': this.ui.toast('記録装置が傷を巻き戻した ── 装置を止めないと', 'weak', 1.6); if (!this.flags.rewound_hint7) { this.flags.rewound_hint7 = true; this.bark('rewound7', 3); this.hint('記録装置（赤い灯の箱）を、待機（緑）の時に止める'); this.later(7, () => this.hint(null)); } this.metrics.rewinds7 = (this.metrics.rewinds7 || 0) + 1; return true;
      case 'deckStop': this.ui.toast(ev.left ? `記録が途切れた ── 崩れている（2 倍）・残り ${ev.left} 台` : '記録が全部止まった ── もう巻き戻せない', 'parry', 1.6); this.sfx.play('broken', b.pos); return true;
      case 'phase': this.ui.toast(ev.n === 1 ? '研究者が「事故の瞬間」を再生しはじめた' : '研究者が必死になる', 'weak', 1.6); if (ev.n === 1) this.later(0.4, () => this.bark('ken_phase7', 3)); return true;
      case 'neutralized': this.resolve(e, 'neutralize'); this.onBossResolved7b(); return true;
      case 'broken': this.ui.toast('崩し ── 2 倍', 'parry', 1.0); this.sfx.play('broken', b.pos); return true;
    }
    return false;
  },
  onBossResolved7b() {
    this.story.boss7 = 'neutralize'; this.ui.boss(null); this.hint(null); this.fx.clearDecals(); this.lock = null; this.metrics.bossTime7b = Math.round(this.playSec - (this.metrics.bossStart7b || this.playSec));
    this.later(1.4, () => this.playCutscene('cs07b_end'));
  },
  onDead7() {
    const e = this.boss;
    if (this.area.id === 'abyss' && e && e.kind === 'kuramono' && e.brain.alive) { this.losses7a = (this.losses7a || 0) + 1; this.metrics.losses7a = this.losses7a; if (this.losses7a >= 3) this.assist7a = true; }
    if (this.area.id === 'kiroku' && e && e.kind === 'kenkyusha' && e.brain.alive && !e.brain.resolution) { this.losses7b = (this.losses7b || 0) + 1; this.metrics.losses7b = this.losses7b; if (this.losses7b >= 3) this.assist7b = true; }
  },

  // ── 境界を喰らうもの（終章A） ──
  feedTarget7(boss) { const t = refugeTarget(this.refuges7 || {}, (this.feedTurn7 = (this.feedTurn7 || 0) + 1)); void boss; return { x: t.pos[0], z: t.pos[1], id: t.id }; },
  feedHit7(L, block) {
    const tgt = ABYSS.refuges.slice().sort((a, b) => Math.hypot(a.pos[0] - L.to.x, a.pos[1] - L.to.z) - Math.hypot(b.pos[0] - L.to.x, b.pos[1] - L.to.z))[0];
    const rf = this.refuges7 || (this.refuges7 = {});
    if (block) { this.metrics.refugeBlocks7 = (this.metrics.refugeBlocks7 || 0) + 1; this.ui.toast(`体で受けた ── ${tgt.name}は無事`, 'parry', 1.4); if (!this.flags.block_bark7) { this.flags.block_bark7 = true; this.bark('giant_block7', 2.4); } return; }
    const dmg = this.flags.support7 ? Math.round(30 * ABYSS.supportFeedMul) : 30;
    rf[tgt.id] = Math.max(10, (rf[tgt.id] ?? 100) - dmg); this.metrics.refugeHits7 = (this.metrics.refugeHits7 || 0) + 1;
    const D = this.area.dyn['ref' + tgt.id]; if (D) { this.halos.setColor(D.halo, 0xd050ff); this.halos.setK(D.halo, 1.0); this.later(2.5, () => { this.halos.setColor(D.halo, 0xffd8a0); this.halos.setK(D.halo, 0.35); }); }
    this.sfx.play('wave', { x: tgt.pos[0], z: tgt.pos[1] }); this.ui.toast(this.flags.support7 ? `${tgt.name}が狙われた ── 灯りが守った（半分）` : `${tgt.name}が喰われかけた！`, 'weak', 1.4);
  },
  onKuramonoPhase7(n) {
    const e = this.boss; if (e) { e.brain.atk = null; e.brain.cool = 2.5; }
    if (n === 1 && !this.flags.cs_cs07a_support) this.later(0.3, () => this.playCutscene('cs07a_support'));
    if (n === 2 && !this.flags.cs_cs07a_spouse) this.later(0.3, () => this.playCutscene('cs07a_spouse'));
  },
  onKuramonoDown7() {
    const e = this.boss; this.ui.boss(null); this.lock = null; this.hint(null); this.fx.clearDecals(); this.metrics.bossTime7a = Math.round(this.playSec - (this.metrics.bossStart7a || this.playSec));
    if (e) this.resolve(e, 'rescue');
    this.story.boss7 = 'rescue'; this.flags.kuramono_down = true;
    this.later(0.8, () => this.playCutscene('cs07a_end'));
  },

  // ── 描画（終章） ──
  renderBoss7(dt) {
    const A = this.area; if (!CH7_AREAS.includes(A.id)) return;
    for (const e of this.enemies) if (e.prop7 && !this.cineMoves.some(m => m.tgt.e === e)) e.speed = 0;
    if (A.id === 'epilogue') { const C = this.companion; C.rootY = C.anim === 'bed' ? 0.18 : 0; if (this.split7) this.tickBoth7(dt); }
    if (A.id === 'abyss') {
      const F = A.dyn.floaters, t = this.playSec;
      if (F && (this.frame % 2 === 0 || this.cut.active)) { F.list.forEach((f, i) => { F.E.set(f.rx + t * f.sp, f.ry + t * f.sp * 0.7, 0); F.Q.setFromEuler(F.E); F.S.set(f.s, f.s, f.s); F.V.set(f.x, f.y + Math.sin(t * 0.4 + f.bob) * 0.8 - (this.flags.pitClosed7 ? Math.min(f.y - 1, this.pitT7 || 0) : 0), f.z); F.M.compose(F.V, F.Q, F.S); F.mesh.setMatrixAt(i, F.M); }); F.mesh.instanceMatrix.needsUpdate = true; }
      if (this.flags.pitClosed7 && this.pitT7 != null && this.pitT7 < 60) this.pitT7 += dt * 12;
      const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null; if (e) this.renderKuramono7(dt, e);
      for (const x of this.enemies) if (x.kind === 'spouse_like') this.renderGhost7(dt, x);
    }
    if (A.id === 'kiroku') {
      const D = A.dyn, st = this.flags.decks7 || [];
      for (const dk of KIROKU.decks) if (!st.includes(dk.id)) for (const r of D.decks[dk.id].reels) r.rotation.y += dt * (deckLamp(this.playSec, dk) === 'write' ? 4 : 0.6);
      const e = this.boss && this.boss.kind === 'kenkyusha' ? this.boss : null;
      if (e && !this.cut.active) { const b = e.brain; if (b.alive && !b.resolution && !['dormant', 'kneel'].includes(b.state)) { const left = 3 - st.length; const ph = b.state === 'down' ? '崩れている ── 2 倍' : b.atk ? (b.atk.name === 'accident' ? '事故の瞬間 ──（相棒）への線の間に立つ' : b.def.attacks[b.atk.name].parryable ? '白：弾ける' : '赤：避ける') : left ? `記録装置 ${left} 台が動いている ── 傷が巻き戻される` : '記録は止まった'; this.ui.boss('研究者（名前未定）', b.hp / b.hpMax, ph, b.state === 'down'); } }
      for (const x of this.enemies) if (x.kind === 'spouse_like') this.renderGhost7(dt, x);
    }
  },
  renderGhost7(dt, e) { const M = e.model.mats.ghost; if (!M) return; if (e.ghostHalo == null) e.ghostHalo = this.halos.add([0, -50, 0], 2.6, 0xcfe0ff, 0); this.halos.setPos(e.ghostHalo, e.pos.x, 1.2, e.pos.z); this.halos.setK(e.ghostHalo, e.root.visible ? M.opacity * 1.2 : 0); const want = e.fade7 ? 0 : 0.42 + Math.sin(this.playSec * 1.3) * 0.06; M.opacity += (want - M.opacity) * Math.min(1, dt * (e.fade7 ? 0.9 : 2)); if (e.fade7 && M.opacity < 0.02) e.root.visible = false; },
  renderKuramono7(dt, e) {
    const m = e.model, H = this.halos, v = new THREE.Vector3();
    if (!e.bossHalos) e.bossHalos = { core: H.add([0, -50, 0], 10, 0xff3aa8, 0), eyes: m.eyes.map(() => H.add([0, -50, 0], 2.2, 0xff6ac8, 0)) };
    if (e.riseT != null) { e.riseT += dt; const k = Math.min(1, e.riseT / 4.0); e.y = -30 * (1 - k * k * (3 - 2 * k)); if (k >= 1) e.riseT = null; }
    if (e.fadeT != null) { e.fadeT += dt; e.y = -Math.min(40, e.fadeT * e.fadeT * 3); if (e.fadeT > 4) e.root.visible = false; }
    const on = e.root.visible && (e.brain.alive || e.fadeT != null && e.fadeT < 0.6) ? 1 : 0, open = e.brain.coreOpen || this.flags.eyeOpen7;
    m.root.updateMatrixWorld(true);
    m.core.getWorldPosition(v); H.setPos(e.bossHalos.core, v.x, v.y, v.z); H.setK(e.bossHalos.core, on * (open ? 1.7 + Math.sin(this.playSec * 10) * 0.3 : 0.8));
    m.eyes.forEach((o, i) => { o.getWorldPosition(v); H.setPos(e.bossHalos.eyes[i], v.x, v.y, v.z); H.setK(e.bossHalos.eyes[i], on * (this.flags.support7 && !e.brain.atk ? 0.35 : 0.8 + Math.sin(this.playSec * 4 + i) * 0.2)); });
    if (this.giantMode && e.brain.alive && e.root.visible && !this.cut.active) {
      const b = e.brain, ph = b.atk ? (b.atk.name === 'feed' ? '「喰らう」── 避難の灯を狙っている：線の間に立つ／咆哮' : b.def.attacks[b.atk.name].parryable ? '白：咆哮で止める／跳躍で避ける' : '赤：跳躍で避ける') : b.coreOpen ? '胸の淵の目が開いている ── 2 倍' : ['', '速くなった', '必死になっている'][b.phase];
      const rf = this.refuges7 || {};
      this.ui.boss('境界を喰らうもの（仮）', b.hp / b.hpMax, (ph ? ph + '　｜　' : '') + ABYSS.refuges.map(x => `${x.name.replace(/（仮）/, '')} ${rf[x.id] ?? 100}%`).join('・'), !!(b.atk && b.atk.name === 'feed'));
    }
  },
  /** 演出中のだんのうらの姿勢（娘を抱きとめる） */
  cinePose7() {
    if (this.cinePlayerAnim !== 'hug') return null;
    return { pose: { spine: [0.22, 0, 0], neck: [0.3, 0, 0], head: [0.15, 0, 0], leftUpperArm: [-0.75, 0, 0.12], rightUpperArm: [-0.75, 0, -0.12], leftLowerArm: [-0.7, 0, 0.25], rightLowerArm: [-0.7, 0, -0.25], hipsY: -0.04 }, rate: 0.1 };   // 少しかがんで、娘を抱きとめる
  },

  // ── 演出の出来事（終章・結末） ──
  cineEvent7(name, arg) {
    const skip = this.cut.skipping;
    switch (name) {
      case 'edgeHint7': this.hint('公衆電話でセーブできる（最終戦の前）。準備ができたら、北の坂の上（淵の縁）へ'); this.later(7, () => this.hint(null)); return true;
      case 'giantGrow7': { if (!this.giantMode) this.enterGiant(!skip); const G = this.giant; G.pos = { x: ABYSS.giantStart[0], z: ABYSS.giantStart[1] }; G.yaw = ABYSS.giantStart[2]; G.rampK = 0; G.model.setRampage(0); this.lock = null; return true; }
      case 'bossRise7': { this.flags.boss7_risen = true; const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null; if (e) { e.root.visible = true; e.riseT = skip ? null : 0; e.y = skip ? 0 : -30; } return true; }
      case 'bossWake7': {
        const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null; if (!this.giantMode) this.enterGiant(false);
        this.giant.growT = null; this.giant.scale = COMBAT.giant.scale; this.giant.rampK = 0;
        if (e) { e.riseT = null; e.y = 0; e.root.visible = true; }
        this.saveSlot('auto', true);
        if (e) { e.brain.wake([]); this.lock = e; this.metrics.bossStart7a = this.playSec; }
        this.hint('妖爪連撃・紫の咆哮（白い予兆を止める）・跳躍・妖気放出。「喰らう」は避難の灯と淵の間に立つと体で受けられる'); this.later(7, () => this.hint(null));
        if (this.assist7a) this.ui.toast('手助け：体力 −25%（記録に残るだけ）', 'weak', 2);
        return true;
      }
      case 'support7': {
        this.flags.support7 = true; const D = this.area.dyn;
        for (const R of ABYSS.refuges) { const d = D['ref' + R.id]; if (!d) continue; d.lamps.forEach((i, k) => this.later(skip ? 0 : 0.2 + k * 0.12, () => this.halos.setK(i, 0.9))); }
        const C = this.companion; C.rootY = EPILOGUE.refugeRoof.y; C.root.visible = true; C.anim = 'warn';
        // 屋上の町の人（灯りを掲げる）：動かない役者
        if (!this.enemies.some(x => x.id === 'roof7_0')) { const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; }; const RF = EPILOGUE.refugeRoof; [[0.3, 1.4], [0.6, -1.2], [1.4, 2.4], [1.1, -2.6]].forEach(([dx, dz], i) => { const e = this.addProp7(add, 'roof7_' + i, buildCivilian(11 + i), [RF.pos[0] + dx, RF.pos[1] + dz], -Math.PI / 2, ctx => ({ pose: { rightUpperArm: [-2.4, 0, -0.3], rightLowerArm: [-0.2, 0, 0], spine: [-0.08, 0, 0], head: [-0.15, 0, 0] }, rate: 0.2 })); e.y = RF.y; e.root.visible = true; e.lampHalo = this.halos.add([e.pos.x, RF.y + 2.3, e.pos.z], 1.1, 0xfff0c0, 0.9); }); }
        return true;
      }
      case 'supportHit7': { const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null; if (e && e.brain.alive) { const ev = []; e.brain.roared(ev); this.bossEvents4(e, ev); } if (this.giant) this.giant.fighter.gauge = this.giant.fighter.G.gauge.max; this.ui.toast('町の灯り ── 巨大化の妖力が満ちる・「喰らう」の当たりが半分', 'parry', 2.0); return true; }
      case 'companionHide7': { const C = this.companion; C.root.visible = false; C.rootY = 0; C.anim = null; for (const e of this.enemies) if (/^roof7_/.test(e.id)) { e.root.visible = false; if (e.lampHalo != null) this.halos.setK(e.lampHalo, 0); } return true; }
      case 'spouseShow7': {
        this.flags.eyeOpen7 = true;
        if (!this.enemies.some(x => x.kind === 'spouse_like')) { const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; }; const e = this.addProp7(add, 'spouse7', buildSpouseLike(), [7.6, -11.2], Math.atan2(0 - 7.6, -30 + 11.2), spousePose); e.kind = 'spouse_like'; e.brain.kind = 'spouse_like'; e.root.visible = true; }
        this.metrics.spouseSeen7 = (this.metrics.spouseSeen7 || 0) + 1; return true;
      }
      case 'finalHint7': this.flags.eyeOpen7 = false; this.hint('壊すためじゃない：中の人を引き上げるために、胸の淵の目を砕く（咆哮・崩しで開くと 2 倍）'); this.later(7, () => this.hint(null)); return true;
      case 'bossBreak7': {
        const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null; if (e) { e.fadeT = skip ? 4.1 : 0; e.brain.state = 'dead'; if (skip) e.root.visible = false; }
        if (this.giantMode) { const G = this.giant; G.pos = { x: 0, z: 15 }; G.yaw = Math.PI; }
        return true;
      }
      case 'researcherOut7': {
        if (!this.enemies.some(x => x.id === 'researcher7')) { const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; }; const e = this.addProp7(add, 'researcher7', buildResearcher(), [0, 4.0], 0, researcherPose, 'kneel'); e.root.visible = true; }
        return true;
      }
      case 'spouseFade7': for (const x of this.enemies) if (x.kind === 'spouse_like') x.fade7 = true; return true;
      case 'pitClose7': { this.flags.pitClosed7 = true; this.pitT7 = 0; const D = this.area.dyn; if (D.rim) { D.rim.material.opacity = 0.12; D.pitGlow.material.opacity = 0.03; } this.scene.fog.color.setHex(0x3a2440); this.scene.background.setHex(0x3a2440); this.hemi.intensity = 1.5; return true; }
      case 'exitGiant7': { if (this.giantMode) this.exitGiant(); const F = this.F(); F.yokiOn = true; F.yoki = Math.max(F.yoki, 60); if (!F.white) this.setWhite(true, 'scripted'); this.player.pos.set(1.6, 0, 6.2); this.player.yaw = Math.atan2(-1.6, -2.2); return true; }
      case 'bossWake7b': {
        const e = this.boss && this.boss.kind === 'kenkyusha' ? this.boss : null; if (!e) return true;
        e.root.visible = true; e.brain.wake([]); this.lock = e; this.metrics.bossStart7b = this.playSec;
        const C = this.companion; C.brain.setMode('scripted'); C.brain.pos = { x: KIROKU.companionAt[0], z: KIROKU.companionAt[1] }; C.brain.yaw = Math.PI; C.anim = 'hide';
        this.saveSlot('auto', true);
        this.hint('紫の姿だけ：白い予兆は弾く・赤は避ける。記録装置（3 台）は灯が緑（待機）の時に止める。（相棒）への白い線は、間に立って受ける'); this.later(8, () => this.hint(null));
        if (this.assist7b) this.ui.toast('手助け：研究者の体力 −25%（記録に残るだけ）', 'weak', 2);
        return true;
      }
      case 'ensurePurple7': { const F = this.F(); F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted'); else if (this.player.model !== this.purpleModel) this.player.setModel(this.purpleModel); return true; }
      case 'screensOff7': { const D = this.area.dyn; (D.screens || []).forEach((sc, i) => this.later(skip ? 0 : i * 0.18, () => { sc.material.color.setHex(0x101018); })); for (const h of this.area.halos) if (h.color === 0xff6a8a && h.idx >= 0) { h.off = true; } return true; }
      case 'spouseShow7b': {
        const D = this.area.dyn, sc = D.screens && D.screens[5]; if (sc) { sc.material.map = D.spouseTex || accidentTex(7, true); sc.material.color.setHex(0xffffff); sc.material.needsUpdate = true; }
        if (!this.enemies.some(x => x.kind === 'spouse_like')) { const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; }; const S = KIROKU.spouseAt, B = KIROKU.boss.pos; const e = this.addProp7(add, 'spouse7', buildSpouseLike(), S, Math.atan2(B[0] - S[0], B[1] - S[1]), spousePose); e.kind = 'spouse_like'; e.brain.kind = 'spouse_like'; e.root.visible = true; }
        this.metrics.spouseSeen7 = (this.metrics.spouseSeen7 || 0) + 1; return true;
      }
      case 'toEnding7': this.later(skip ? 0 : 0.4, () => this.toEnding7(arg)); return true;
      case 'epiMood7': this.epiMood7(arg); return true;
      case 'mixedHair7': {
        const F = this.F(); F.yokiOn = false; if (F.white) F.setForm('purple'); this.ui.form(false);
        this.mixedModel = this.mixedModel || buildDannouraWhite({ mixed: true });
        if (this.player.model !== this.mixedModel) this.player.setModel(this.mixedModel);
        this.unarm7(); this.metrics.mixedHair7 = true; return true;
      }
      case 'toHome7': this.later(skip ? 0.05 : 0.3, () => this.playCutscene('cs_end_home_' + String(arg).toLowerCase())); return true;
      case 'daughterHug7': { const d = this.enemies.find(x => x.id === 'daughter7'); if (d) d.mode7 = 'hug'; return true; }
      case 'credits7': this.later(skip ? 0 : 0.4, () => this.credits7(arg)); return true;
    }
    return false;
  },
  epiMood7(kind) {
    const M = { day: { c: 0xd8dce8, d: 0.01, hemi: 1.9, amb: 1.0 }, dusk: { c: 0x6a4a5a, d: 0.012, hemi: 1.5, amb: 0.8 }, night: { c: 0x2a2030, d: 0.01, hemi: 1.2, amb: 0.7 } }[kind] || {};
    if (M.c == null) return;
    this.scene.fog.color.setHex(M.c); this.scene.fog.density = M.d; this.scene.background.setHex(M.c); this.hemi.intensity = M.hemi; this.amb.intensity = M.amb;
    this.halos.uniforms.uFog.value = M.d; this.sfx.setAmbience(kind === 'day' ? 'epi_day' : kind === 'dusk' ? 'epi_dusk' : 'epi_home');
    this.metrics.epiMood7 = kind;
  },

  // ── 結末 ──
  /** 終章の終わり → 結末の場面へ（結末はルートだけで決まる：reveal＝結末A、secret＝結末B） */
  toEnding7(r) {
    const id = endingOf(this.route.route), want = r === 'A' ? 'end_reveal' : 'end_secret';
    this.metrics.endingRoute7 = this.route.route;
    if (id !== want) { console.warn('ending mismatch', id, want); }
    if (this.giantMode) this.exitGiant();
    this.setStep(id === 'end_reveal' ? 'end_a' : 'end_b');
    this.changeArea('epilogue', id === 'end_reveal' ? 'hospital' : 'street');
  },
  /** 結末の場面では武器を持たない（家・病室）。持ち物の記録は変えない（見た目だけ） */
  unarm7() { this.player.noWeapons = true; this.player.setWeaponVisual(); },
  playEnding7() {
    const s = this.story.step; if (this.cut.active) return;
    this.unarm7();
    if (s === 'end_a') this.playCutscene('cs_end_a'); else if (s === 'end_b') this.playCutscene('cs_end_b');
  },
  credits7(r) {
    const id = r === 'A' ? 'end_reveal' : 'end_secret';
    if (!this.galleryMode) this.recordEnding7(id);
    this.mode = 'puzzle'; this.input.exitLock(); this.sfx.play('ending7');
    this.metrics.credits7 = true;
    this.ui.credits(CREDITS.lines, this.isTest() ? 2 : CREDITS.sec, () => this.showEndingCard7(id));
  },
  /** 結末の記録：本作のセーブ（clear 枠）と共通の進行（wakaba_progress_v1 の games.shinshoku）だけ。他作品のキーには書かない */
  recordEnding7(id) {
    const now = new Date().toISOString();
    const own = (this.WP.read().games || {}).shinshoku || {};
    const prev = (own.endings || {})[id];
    const endings = Object.assign({}, own.endings || {}, { [id]: { firstAt: (prev && prev.firstAt) || now, count: ((prev && prev.count) || 0) + 1 } });
    const routes = Array.from(new Set((own.routesCleared || []).concat([ENDINGS[id].route])));
    const ch = this.route.route === 'reveal' ? ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5a', 'ch6a', 'ch7a'] : ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5b', 'ch6b', 'ch7b'];
    const chapters = Array.from(new Set((own.chaptersCleared || []).concat(ch)));
    const gallery = Array.from(new Set((own.gallery || []).concat(galleryUnlocked(endings))));
    this.WP.write('shinshoku', { endings, routesCleared: routes, chaptersCleared: chapters, gallery });
    const prevClear = this.store.load('clear') || {};
    const clear = { savedAt: now, playSec: Math.round(this.playSec), endings: Object.assign({}, prevClear.endings || {}, { [id]: { at: now, route: this.route.route, playSec: Math.round(this.playSec), difficulty: this.settings.difficulty } }), carry: carryFrom(this.snapshot()), ngPlus: prevClear.ngPlus || 0, lastEnding: id };
    this.store.write('clear', clear);
    this.flags['ending_' + id] = true; this.metrics.ending7 = id;
    this.saveSlot('auto', true);
  },
  showEndingCard7(id) {
    const E = ENDINGS[id], rf = this.refuges7 || {};
    const stats = [['結末', E.title], ['ルート', this.route.route === 'reveal' ? '妖力解放（化けを、解いた）' : '正体秘匿（人として通した）'], ['プレイ時間', fmt(this.playSec)], ['難しさ', ({ easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい' })[this.settings.difficulty] || '—']];
    if (this.route.route === 'reveal') stats.push(['境界を喰らうもの', this.story.boss7 === 'rescue' ? '中の人を引き上げた' : '—'], ['避難の灯', ABYSS.refuges.map(x => `${x.name.replace(/（仮）/, '')} ${rf[x.id] ?? 100}%`).join('・')]);
    else stats.push(['研究者', this.story.boss7 === 'neutralize' ? '膝をついた（記録装置を止めた）' : '—'], ['記録装置', `止めた ${(this.flags.decks7 || []).length}／3（書き込み中は ${this.metrics.deckRefused7 || 0} 回待った）`], ['（相棒）', '正体を知らないまま']);
    stats.push(['（相棒）の信頼', this.companion.brain.trust]);
    this.metrics.endingCard7 = id;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.toTitle7(); }, `${E.title}　おしまい`, this.galleryMode ? 'ギャラリーの再生でした（記録は変わりません）。' : 'タイトルの「章選択」から、どの章でも遊び直せます。もう一方のルートも、「分岐の前」のセーブか章選択から。', 'タイトルへ');
  },
  toTitle7() { this.metrics.toTitle7 = true; if (this.noReloadTitle) return; location.href = 'shinshoku.html'; },

  // ── 試験・ショートカット（?ch=7&route=…&at=boss・?ending=A|B）の初期状態 ──
  jump7(step) {
    const rr = stepRoute(step), L = rr === 'reveal' ? R7_STEPS : S7_STEPS, i = L.indexOf(step);
    if (!rr || i < 0) return null;
    this.jump6(rr === 'reveal' ? 'ch6a_fin' : 'ch6_s_end');
    const F = this.F(), f = this.flags;
    F.hp = F.hpMax;
    if (rr === 'reveal') { f.ch7a_started = true; f.endcard6a = true; if (i >= 1) f.cs_cs07a_arrive = true; if (i >= 2) { this.enemyRes.kuramono = 'rescue'; this.story.boss7 = 'rescue'; f.support7 = true; } }
    else { f.ch7b_started = true; f.endcard6s = true; if (i >= 1) f.cs_cs07b_arrive = true; if (i >= 2) { this.enemyRes.kenkyusha = 'neutralize'; this.story.boss7 = 'neutralize'; f.decks7 = KIROKU.decks.map(d => d.id); } }
    const area = stepDef(step).area;
    const spawn = { abyss: i === 0 ? 'human' : 'giant', kiroku: i === 0 ? 'corridor' : 'room', epilogue: rr === 'reveal' ? 'hospital' : 'street' }[area];
    return { area, spawn };
  },
  afterLoad7(fromJump) {
    const s = this.story.step, A = this.area.id;
    if (A === 'avenue' && s === 'ch6a_fin' && this.flags.endcard6a && !this.flags.ch7a_started) { this.later(0.6, () => this.startCh7a()); return; }
    if (A === 'admin' && s === 'ch6_s_end' && this.flags.endcard6s && !this.flags.ch7b_started) { this.later(0.6, () => this.startCh7b()); return; }
    if (!CH7_AREAS.includes(A)) return;
    this.applyArea7();
    if (A === 'abyss') {
      const F = this.F(); F.yokiOn = true;
      if (s === 'ch7a_edge') { if (this.giantMode) this.exitGiant(); if (fromJump) { F.yoki = Math.max(F.yoki, 90); if (!F.white) this.setWhite(true, 'scripted'); } if (fromJump && !this.flags.cs_cs07a_arrive) this.later(0.1, () => this.playCutscene('cs07a_arrive')); }
      if (s === 'ch7a_boss') {
        if (!this.giantMode) this.enterGiant(false);
        const G = this.giant; G.growT = null; G.scale = COMBAT.giant.scale; G.rampK = 0; G.model.setRampage(0); G.pos = { x: ABYSS.giantStart[0], z: ABYSS.giantStart[1] }; G.yaw = ABYSS.giantStart[2];
        const e = this.boss && this.boss.kind === 'kuramono' ? this.boss : null;
        if (e) { e.root.visible = true; e.riseT = null; e.y = 0; e.brain.wake([]); this.lock = e; this.metrics.bossStart7a = this.playSec; this.flags.boss7_risen = true; }
        if (fromJump) this.saveSlot('auto', true);                                // 飛び先でも、倒れたら最終戦の前から
      }
      if (s === 'ch7a_end') { if (this.giantMode) this.exitGiant(); this.later(0.4, () => this.toEnding7('A')); }
    }
    if (A === 'kiroku') {
      const F = this.F(); F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted');
      const e = this.boss && this.boss.kind === 'kenkyusha' ? this.boss : null;
      if (s === 'ch7b_boss' && e) { e.brain.wake([]); this.lock = e; this.metrics.bossStart7b = this.playSec; this.placeCompanion7('kiroku'); if (fromJump) this.saveSlot('auto', true); }
      if (s === 'ch7b_end') this.later(0.4, () => this.toEnding7('B'));
    }
    if (A === 'epilogue') this.later(0.2, () => this.playEnding7());                // 飛び先・結末で読み込んだ時も結末の場面から（同じルートなら同じ結末）
  },
  /** タイトルの「引き継いで はじめから」（New Game+・仮）：装備・回復の道具・弾を持って序章から */
  applyCarry7(carry, n) {
    if (!carry) return;
    for (const id of carry.equip || []) if (this.EQUIP[id]) { if (!this.ownedEquip.includes(id)) this.ownedEquip.push(id); }
    this.equipped = this.ownedEquip.slice(0, 2); this.applyEquip();
    for (const it of carry.items || []) this.items[it.id] = (this.items[it.id] || 0) + it.n;
    if (carry.ammo) this.player.fighter.addAmmo(carry.ammo);
    this.flags.ngplus = n || 1; this.metrics.ngplus = n || 1;
    this.ui.toast(`引き継ぎ：装備 ${this.ownedEquip.length}・回復 ${(carry.items || []).reduce((a, b) => a + b.n, 0)}・弾 ${carry.ammo || 0}`, 'parry', 2.4);
  },
  /** 対比の場面（ギャラリー・両方の結末を見たあと）：同じ病院の廊下を、左は白い髪・右は紫の髪のだんのうらが歩く（画面を左右に分ける）。台詞なし */
  playBoth7() {
    document.getElementById('sh-title').hidden = true;
    this.mode = 'play'; this.loadArea('epilogue', 'corridor'); this.epiMood7('day');
    this.player.root.visible = false; this.companion.root.visible = false;
    const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    const walk = ctx => ({ pose: locomotion(ctx.phase, ctx.speed, { k: 0.6 }), rate: 0.4 });
    const L = this.addProp7(add, 'both_white', buildDannouraWhite(), [EPILOGUE.corridor.x, 11], Math.PI, walk), R = this.addProp7(add, 'both_purple', buildDannoura(), [EPILOGUE.corridor.x, 11], Math.PI, walk);
    L.root.visible = R.root.visible = true;
    for (const e of [L, R]) { const W = e.model.weapons; if (W) for (const k of Object.keys(W)) { const o = W[k]; if (o && o.isObject3D) { if (W.bones) o.scale.setScalar(1e-4); else o.visible = false; } } }
    this.split7 = { L, R, t: 0, sec: 9 }; this.simHold = true; this.ui.letterbox(true); this.metrics.both7 = true;
    setTimeout(() => addEventListener('pointerdown', () => { if (this.split7 && !this.split7.done) { this.split7.done = true; this.toTitle7(); } }, { once: true }), 600);
  },
  tickBoth7(dt) {
    const S = this.split7; S.t += dt;
    for (const e of [S.L, S.R]) { const step = dt * 1.1; e.brain.pos.z -= step; e.speed = 1.1; e.phase += step * 3.4; }
    const z = S.L.brain.pos.z, x = EPILOGUE.corridor.x;
    this.cineCam = { pos: [x + 1.2, 1.55, z - 3.2], look: [x, 1.45, z], fov: 40 };
    if (S.t >= S.sec && !S.done) { S.done = true; this.ui.letterbox(false); this.toTitle7(); }
  },
  renderSplit7() {
    const r = this.renderer, S = this.split7, w = innerWidth, h = innerHeight, cam = this.camera;
    r.setScissorTest(true);
    [[0, S.L, S.R], [1, S.R, S.L]].forEach(([i, show, hide]) => { show.root.visible = true; hide.root.visible = false; r.setViewport(i * w / 2, 0, w / 2, h); r.setScissor(i * w / 2, 0, w / 2, h); cam.aspect = (w / 2) / h; cam.updateProjectionMatrix(); r.render(this.scene, cam); });
    r.setScissorTest(false); r.setViewport(0, 0, w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
    S.L.root.visible = S.R.root.visible = true;
  },
  /** 撮影・試験用：終章の小さな API */
  debug7() {
    const g = this;
    return {
      boss: () => { const e = g.boss; return e ? { kind: e.kind, state: e.brain.state, hp: e.brain.hp, hpMax: e.brain.hpMax, phase: e.brain.phase, resolution: e.brain.resolution, x: e.pos.x, z: e.pos.z, visible: e.root.visible, decks: e.brain.decks } : null; },
      hitBoss: (dmg, poise) => { const e = g.boss; if (!e) return 0; if (e.kind === 'kuramono') { g.giantHitBoss(e, dmg, poise || 0); return 1; } return g.damageEnemy(e, dmg, 'slash', { poise: poise || 0 }); },
      refuges: () => Object.assign({}, g.refuges7 || {}),
      lamp: id => deckLamp(g.playSec, KIROKU.decks.find(d => d.id === id)),
      waitLamp: (id, want) => { const d = KIROKU.decks.find(q => q.id === id); for (let i = 0; i < 600 && deckLamp(g.playSec, d) !== want; i++) g.step(); return deckLamp(g.playSec, d); },
      deck: id => { g.deck7(id); return (g.flags.decks7 || []).slice(); },
      ending: () => ({ step: g.story.step, ending: g.metrics.ending7 || null, route: g.route.route }),
      wp: () => (g.WP.read().games || {}).shinshoku,
      clear: () => g.store.load('clear'),
      hairCam: () => { const c = g.cineCam; return c ? { pos: c.pos.slice(), look: c.look.slice(), fov: c.fov } : null; },
    };
  },
};
