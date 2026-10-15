// 第3章（病院・地下通路）と白髪形態の実行。Game（main.js）のメソッドとして組み込む。
// ・区画の敵：記録のない患者・模倣する影（化ける）・守り手・写し身（ボス）。子ども（日向 ユウ・仮）は相棒について歩く。
// ・白髪形態：化けを解く（長押し）・妖爪・妖刀・猫火（追尾する火の玉）・瞬歩・幻術（分身）・妖力・連撃の数。
//   許可は story/route.js の whiteAllowed（構え・ルート・相棒の目）。相棒が見える所に来たら静かに紫へ戻る。
// ・転機（写し身の体力 60%）：専用のセーブ枠 'tenki' に書いてから、構え（化けを、解く／このまま、人として）を選ぶ。
import * as THREE from 'three';
import { AREA_DATA, HOSP } from '../data/areas.js';
import { COMBAT, ITEMS } from '../data/combat.js';
import { Kanja } from '../ai/kanja.js';
import { Mimic, Utsushimi, mimicPlan, ACT_LABEL } from '../ai/mimic.js';
import { Mamori } from '../ai/mamori.js';
import { EnemyActor } from '../actor/actors.js';
import { Poser } from '../actor/rig.js';
import { buildCivilian, buildCompanion } from '../actor/models.js';
import { buildKanja, buildMimicShadow, buildUtsushimi, buildMamori, buildChild } from '../actor/models3.js';
import { kanjaPose, mimicPose, mamoriPose, childPose, civilianPose, companionPose, phaseRate } from '../actor/anim.js';
import { whiteAllowed, setStance, logYokai, STANCES, currentStance } from '../story/route.js';
import { atLeast, chapterNo, stepDef } from '../story/chapters.js';
import * as PZ from '../story/puzzles.js';
import { lineOfSight, resolveCircle } from '../world/collide.js';
import { turnTo } from '../actor/actors.js';

const DT = 1 / 60;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const ch3Methods = {
  // ── 子ども ──
  makeChild() {
    const m = buildChild(); const root = new THREE.Group(); root.add(m.root); root.name = 'child'; root.visible = false;
    this.child = { model: m, root, poser: new Poser(m.J, m.rest || {}), pos: { x: 0, z: 0 }, yaw: 0, mode: 'sit', speed: 0, phase: 0, time: 0, blinkT: 2 };
    this.scene.add(root);
  },
  placeChild(x, z, yaw, mode, y = 0) { const c = this.child; c.pos.x = x; c.pos.z = z; c.y = y; if (yaw != null) c.yaw = yaw; if (mode) c.mode = mode; c.root.visible = true; },
  stepChild(dt) {
    const c = this.child; if (!c || !c.root.visible) return;
    c.time += dt;
    if (c.mode === 'follow' && !this.cut.active) {
      const C = this.companion; if (!C.root.visible) { c.speed = 0; }
      else {
        const b = C.brain, side = { x: b.pos.x + Math.cos(b.yaw) * 0.55 - Math.sin(b.yaw) * 0.25, z: b.pos.z - Math.sin(b.yaw) * 0.55 - Math.cos(b.yaw) * 0.25 };
        const dx = side.x - c.pos.x, dz = side.z - c.pos.z, L = Math.hypot(dx, dz);
        if (L > 6) { c.pos.x = side.x; c.pos.z = side.z; c.speed = 0; }
        else if (L > 0.15) { const sp = Math.min(4.6, 1.2 + L * 2.4), m = Math.min(L, sp * dt); c.pos.x += dx / L * m; c.pos.z += dz / L * m; resolveCircle(c.pos, 0.2, this.boxes); c.yaw = turnTo(c.yaw, Math.atan2(dx, dz), 0.2); c.speed = m / dt; c.phase += m * phaseRate(c.speed, 0.55); }
        else { c.speed = 0; c.yaw = turnTo(c.yaw, b.yaw, 0.08); }
        if (C.brain.mode === 'hide' || C.pose === 'hide') c.cmode = 'cower'; else c.cmode = null;
      }
    }
  },
  animateChild(dt) {
    const c = this.child; if (!c || !c.root.visible) return;
    const { pose, rate } = childPose({ time: c.time, speed: c.speed, phase: c.phase, mode: c.cmode || c.mode });
    c.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    if (c.mode === 'follow') c.y = 0; c.root.position.set(c.pos.x, c.y || 0, c.pos.z); c.root.rotation.y = c.yaw;
    const E = c.model.eyes; c.blinkT -= dt; const k = c.blinkT < 0.13 ? Math.max(0.08, Math.abs(c.blinkT - 0.065) / 0.065) : 1; if (c.blinkT <= 0) c.blinkT = 2.4 + Math.random() * 3; for (const e of E) e.scale.y = k;
    if (c.model.outline) c.model.outline.visible = this.settings.outline;
  },
  childVisibleAt(area) { const s = this.story.step; if (!this.child) return false; if (area === 'hospital') return !atLeast(s, 'ch3_tunnel'); if (area === 'tunnel') return atLeast(s, 'ch3_down'); if (area === 'shelter') return atLeast(s, 'ch3_end'); return false; },
  placeChildForArea(id) {
    const c = this.child; if (!c) return; c.root.visible = false;
    if (!this.childVisibleAt(id)) return;
    if (this.flags.child_saved) { c.mode = 'follow'; const b = this.companion.brain; c.pos.x = b.pos.x + 0.5; c.pos.z = b.pos.z + 0.3; c.root.visible = this.companion.root.visible; if (id === 'tunnel' && (this.story.step === 'ch3_boss' || this.story.step === 'ch3_boss2')) c.root.visible = false; return; }
    if (id === 'hospital') this.placeChild(9.25, -17.2, -Math.PI / 2, 'sit', 0.46);   // ベッドの上（306）
  },

  // ── 区画の敵（病院・地下通路） ──
  spawnCh3(id, add) {
    const s = this.story.step;
    if (id === 'hospital') {
      const H = AREA_DATA.hospital;
      H.kanja.forEach((k, i) => {
        const r = this.enemyRes[k.id]; if (r === 'kill') return;
        const brain = new Kanja({ id: k.id, path: k.path.map(([x, z]) => ({ x, z })), bed: { x: k.bed[0], z: k.bed[1] }, seed: 31 + i * 5, asleep: r === 'rescue' || r === 'neutralize' || this.flags.ward_dark });
        if (r) brain.resolution = r;
        const e = add(brain, buildKanja(i + 1)); e.poseFn = kanjaPose;
        if (brain.state === 'sleep') { const b = brain.bed; brain.pos.x = b.x; brain.pos.z = b.z; }
      });
      for (const m of H.mimics) if (!this.enemyRes[m.id]) this.addMimic(add, m, 'civilian');
      if (!this.flags.child_saved) {
        const T = H.twist, r = this.enemyRes[T.mamori.id];
        if (r !== 'kill') { const b = new Mamori({ id: T.mamori.id, pos: { x: T.mamori.pos[0], z: T.mamori.pos[1] }, yaw: -Math.PI / 2, child: { x: T.mamori.child[0], z: T.mamori.child[1] }, seed: 3 }); if (r === 'rescue') { b.resolution = 'rescue'; b.state = 'rest'; } const e = add(b, buildMamori()); e.poseFn = mamoriPose; this.mamori = e; }
      }
      return true;
    }
    if (id === 'tunnel') {
      const U = AREA_DATA.tunnel;
      for (const m of U.mimics) if (!this.enemyRes[m.id] && !atLeast(s, 'ch3_boss')) this.addMimic(add, m, m.disguise);
      const B = U.boss, r = this.enemyRes[B.id];
      if (!r) {
        const b = new Utsushimi({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, yaw: 0, seed: 17 });
        const e = add(b, buildUtsushimi()); e.poseFn = mimicPose; this.boss = e; e.root.visible = atLeast(s, 'ch3_boss');
        if (s === 'ch3_boss' && this.flags.tenki_pending) { b.hp = Math.ceil(b.hpMax * b.def.tenkiAt); b.state = 'tenki'; b.hostileBy = 'boss'; }
        else if (s === 'ch3_boss') { b.wake([]); }
        else if (s === 'ch3_boss2') { b.hp = Math.ceil(b.hpMax * b.def.tenkiAt); b.state = 'tenki'; b.resume(currentStance(this.route) || 'secret', [], !!this.flags.ch3_assist); }
      }
      return true;
    }
    return false;
  },
  addMimic(add, m, disguise) {
    const brain = new Mimic({ id: m.id, pos: { x: m.pos[0], z: m.pos[1] }, yaw: m.yaw || 0, disguise: disguise || null, lure: m.lure || null, dormant: m.dormant, seed: m.id.length * 7 });
    const e = add(brain, buildMimicShadow({ seed: m.id.charCodeAt(m.id.length - 1) }));
    e.poseFn = mimicPose;
    if (disguise === 'civilian') e.setAlt(buildCivilian(7), civilianPose);
    else if (disguise === 'companion') { const alt = buildCompanion(); alt.mesh.castShadow = false; e.setAlt(alt, ctx => companionPose(Object.assign({}, ctx, { talking: false }))); }
    if (!disguise) e.setReveal && e.model.mesh && (e.altK = 1);
    return e;
  },
  /** 守り手の場面：影を呼ぶ */
  spawnTwist() {
    if (this.twistSpawned) return; this.twistSpawned = true;
    const T = AREA_DATA.hospital.twist;
    const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    for (const m of T.mimics) { if (this.enemyRes[m.id]) continue; const e = this.addMimic(add, { id: m.id, pos: m.pos, yaw: -Math.PI / 2 }, null); e.brain.hostileBy = 'twist'; e.brain.lastSeen = { x: this.player.pos.x, z: this.player.pos.z }; e.brain.lastSeenT = e.brain.total; e.brain.cool = 1.0; e.brain.home = { x: 7, z: -16 }; }
    this.ui.boss('模倣する影（3）', 1, '大きな患者は、影から子どもを守っている');
  },
  twistLeft() { return this.enemies.filter(e => e.kind === 'mimic' && /^mimic_t/.test(e.id) && e.brain.alive).length; },

  // ── 第3章の流れ ──
  startCh3() {
    if (this.flags.ch3_started) return;
    this.playEvent('ev_ch3_start', () => { this.flags.ch3_started = true; this.setStep('ch3_hosp'); this.ui.chapterCard('第3章　見た目'); this.sfx.play('notify'); this.F().yokiOn = false; });
  },
  F() { return this.player.fighter; },
  storyTick3() {
    const s = this.story.step, A = this.area.id, P = this.player.pos;
    if (A === 'hospital') {
      if (s === 'ch3_guard' && !this.cut.active) {
        this.guardT = (this.guardT || 0) + DT;
        const mam = this.mamori && this.mamori.brain;
        if (!this.twistSpawned && (this.guardT > 9 || (mam && (mam.hits >= 3 || !mam.alive)))) this.playCutscene('cs03_mimics');
        if (this.twistSpawned && this.twistLeft() === 0 && !this.flags.truth_started) {
          this.flags.truth_started = true; this.ui.boss(null); this.hint(null);
          const alive = mam && mam.alive;
          if (alive) { const ev = []; mam.standDown(ev); this.enemyEvents(this.mamori, ev); }
          this.later(1.0, () => this.playCutscene(alive ? 'cs03_truth_rescue' : 'cs03_truth_kill', () => this.later(0.2, () => this.playCutscene('cs03_line'))));
        } else if (this.twistSpawned && !this.flags.truth_started) this.ui.boss('模倣する影（' + this.twistLeft() + '）', this.twistLeft() / 3, mam && mam.alive ? '大きな患者は、影から子どもを守っている' : '');
      }
      // 306 号室に入った
      if (s === 'ch3_ward' && this.flags.door306 && P.x > 2.6 && P.z < -13.4 && P.z > -18.8) this.playCutscene('cs03_guard');
    }
    if (A === 'tunnel') {
      const u2 = this.enemies.find(e => e.id === 'mimic_u2');
      if (u2 && u2.brain.state === 'dormant' && P.z < -5.6) { u2.brain.state = 'hostile'; u2.brain.hostileBy = 'ambush'; u2.brain.lastSeen = { x: P.x, z: P.z }; u2.brain.lastSeenT = u2.brain.total; u2.altK = 1; this.sfx.play('mimic_reveal', u2.pos); this.bark('mimic_reveal', 2); }
      const u1 = this.enemies.find(e => e.id === 'mimic_u1');
      if (u1 && u1.brain.state === 'disguise' && d2(u1.pos, P) < 9 && !this.flags.fake_seen) { this.flags.fake_seen = true; this.later(0.6, () => this.bark('companion_fake', 3)); }
      if (s === 'ch3_tunnel' && P.z < -23.2 && !this.cut.active) { if (!this.anyHostileNear(10)) this.playCutscene('cs03_boss'); }
      if (s === 'ch3_boss' && this.boss && this.boss.brain.state === 'tenki' && !this.cut.active && !this.tenkiOpen && this.mode === 'play') this.beginTenki();
    }
  },
  onAreaEnter3(id) {
    const s = this.story.step;
    if (id === 'hospital' && s === 'ch3_hosp') this.later(0.1, () => this.playCutscene('cs03_hospital'));
    if (id === 'tunnel' && s === 'ch3_down') this.later(0.1, () => this.playCutscene('cs03_tunnel'));
    if (id === 'tunnel' && !this.flashlightOn) this.later(1.6, () => { if (!this.flashlightOn) this.bark('tunnel_hint', 2.4); });
  },
  // ── 調べる（第3章） ──
  useSpot3(s) {
    const T = this.events.texts || {}, st = this.story.step;
    switch (s.kind) {
      case 'keybox':
        if (this.flags.key306) { this.sayText(T.hosp_keybox_done); return true; }
        if (!this.flags.records_done) { this.sayText(T.hosp_keybox_unknown); return true; }
        this.flags.key306 = true; this.sfx.play('pickup'); this.playEvent('ev_key306'); this.ui.log('306 号室の鍵を手に入れた'); return true;
      case 'treat':
        if (this.flags.memo) { this.sayText(T.hosp_treat_done); return true; }
        this.flags.memo = true; this.flags.nurse_badge = true; this.metrics.puzzles.treat = true; this.addDoc('nursing_log');
        this.playEvent('ev_treat', () => { this.ui.log('手掛かり：子ども用の携帯（留守電）・白衣の名札'); });
        return true;
      case 'hdoor':
        if (this.flags.door306) return true;
        if (!this.flags.key306) { this.sayText(T.hosp_key_need); return true; }
        this.openDoor306(); return true;
      case 'wardswitch': {
        this.flags.ward_dark = !this.flags.ward_dark; this.sfx.play('light_on');
        this.applyWardLights();
        if (this.flags.ward_dark) { let n = 0; for (const e of this.enemies) if (e.kind === 'kanja') { const ev = []; if (e.brain.lightsOff(ev)) n++; this.enemyEvents(e, ev); } this.bark('ward_dark', 2.6); if (n) this.ui.log(`照明を落とした：眠った患者 ${n}`); }
        else this.bark('ward_lit', 2);
        return true;
      }
      case 'refuge': this.sayText(this.area.dyn.refugeShutter && this.area.dyn.refugeShutter.target === this.area.dyn.refugeShutter.down ? T.refuge_closed : T.refuge_idle); return true;
      case 'callout': { const e = s.ref; const ev = []; if (e.brain.callOut(ev)) { this.sayBark('dan', '巡回の時間ですよ。……おやすみなさい', 2.4); this.enemyEvents(e, ev); } return true; }
      case 'memo': { const b = this.boss && this.boss.brain; if (!b) return true; const ev = []; this.sfx.play('memo'); this.sayBark('mother', '「ユウ、ママよ。お迎え、少し遅くなるね」', 3); const r = b.playMemo(ev); this.metrics.memo = r; this.enemyEvents(this.boss, ev); return true; }
    }
    if (s.kind === 'clue' && (s.clue === 'board' || s.clue === 'charts')) {
      this.flags['seen_' + s.clue] = true; this.sayText(T[s.clue + '_text']);
      if (this.flags.seen_board && this.flags.seen_charts && !this.flags.records_done) this.afterDialog = () => this.openRecords();
      return true;
    }
    if (s.kind === 'read' && s.text === 'hosp_reception' && st === 'ch3_lobby') { this.sayText(T.hosp_reception); this.setStep('ch3_records'); return true; }
    return false;
  },
  addDoc(id) { this.route.docs = this.route.docs || []; if (!this.route.docs.includes(id)) this.route.docs.push(id); },
  openDoor306() {
    const D = this.area.dyn.door306; if (!D || D.open) return;
    D.open = true; this.flags.door306 = true; const i = this.area.boxes.indexOf(D.box); if (i >= 0) this.area.boxes.splice(i, 1);
    D.mesh.position.x = 2.0; D.mesh.position.z = -16.7; D.mesh.rotation.y = 1.4; this.halos.setColor(D.halo, 0x60ff90); this.sfx.play('door', { x: 2, z: -16 });
  },
  applyWardLights() {
    if (this.area.id !== 'hospital') return;
    for (const l of this.area.lights) if (l.ward) { l.off = !!this.flags.ward_dark; }
    this.darkness = this.flags.ward_dark ? 0.6 : 0;
  },
  /** カルテの照合（必須） */
  openRecords() {
    this.mode = 'puzzle'; this.input.exitLock();
    const st = this.puz.records || { miss: 0, done: false };
    this.ui.recordsUI({ plates: PZ.hospPlates(), charts: PZ.hospCharts() }, st, room => {
      const ns = PZ.pickRecord(this.puz.records || {}, room); this.puz.records = ns;
      this.sfx.play(ns.done ? 'ui_ok' : 'ui_ng');
      if (ns.done) { setTimeout(() => this.finishRecords(), 300); return null; }
      return ns;
    }, () => { this.ui.closePuzzle(); this.resume(); });
  },
  finishRecords() {
    this.ui.closePuzzle(); this.flags.records_done = true; this.mode = 'play'; this.metrics.puzzles.records = true; this.addDoc('records_306');
    if (atLeast('ch3_ward', this.story.step)) this.setStep('ch3_ward');
    this.playEvent('ev_records_done');
  },

  // ── 守り手の場面 ──
  guardStart() { this.guardT = 0; this.twistSpawned = false; if (this.mamori) { this.mamori.brain.state = 'guard'; } this.companion.brain.setMode('follow'); this.hint('攻めずに様子を見る／倒す（どちらでも進める）'); },

  // ── 地下通路：ボスと転機 ──
  bossRise3() { if (this.boss) { this.boss.root.visible = true; this.boss.brain.state = 'dormant'; this.boss.altK = 1; this.sfx.play('boss_rise', this.boss.pos); } },
  bossWake3() { if (this.boss) { this.boss.brain.wake([]); this.ui.boss('写し身（仮）', 1, '動きを真似てくる：頭の上の「写」を見る'); this.metrics.bossStart3 = this.playSec; this.hint('写し身は、直前のこちらの動きを写す（斬り続けると連撃・避け続けると突き）'); this.later(4, () => this.hint(null)); } },
  beginTenki() {
    this.tenkiOpen = true; this.flags.tenki_pending = true; this.hint(null);
    this.saveSlot('tenki', true);                                         // 転機の前の専用の枠（何度でも戻れる）
    this.playCutscene('cs03_tenki', () => this.openTenkiChoice());
  },
  openTenkiChoice() {
    this.mode = 'puzzle'; this.input.exitLock();
    const losses = this.ch3Losses || 0;
    const opts = [{ id: 'reveal', label: STANCES.reveal, sub: '白髪形態で戦う（妖爪・猫火・瞬歩・幻術）' }, { id: 'secret', label: STANCES.secret, sub: '紫の姿の技だけで戦う（白い姿は使わない）' }];
    if (losses >= 3 && (currentStance(this.route) || this.lastStance) === 'secret') opts.push({ id: 'secret_assist', label: STANCES.secret + '（手助けあり）', sub: '写し身の体力を減らし、動きを遅くする（記録に残るだけ）' });
    this.ui.choiceUI('……どうする？', opts, id => { this.ui.closePuzzle(); this.mode = 'play'; this.chooseStance(id === 'secret_assist' ? 'secret' : id, id === 'secret_assist'); }, '※ この選択は第4章の分岐を決めない（第4章でもう一度選べる）。「転機の前」のセーブから選び直せる。');
  },
  chooseStance(stance, assist) {
    this.route = setStance(this.route, stance, { chapter: 'ch03', step: 'ch3_tenki', via: this.loadedTenki ? 'load_tenki' : 'choice', at: new Date().toISOString(), snapshot: { trust: this.companion.brain.trust, docs: (this.route.docs || []).length, losses: this.ch3Losses || 0, assist: !!assist } });
    this.metrics.stance = stance; this.lastStance = stance; this.flags.ch3_assist = !!assist; delete this.flags.tenki_pending; this.tenkiOpen = false; this.loadedTenki = false;
    const F = this.F(); F.yokiOn = stance === 'reveal';
    if (stance === 'reveal') F.yoki = Math.max(F.yoki, COMBAT.white.gauge.start);
    const go = () => { const b = this.boss && this.boss.brain; if (b) { const ev = []; b.resume(stance, ev, !!assist); this.enemyEvents(this.boss, ev); } this.setStep('ch3_boss2'); this.ui.boss('写し身（仮）', b ? b.hp / b.hpMax : 1, stance === 'reveal' ? '白髪形態' : '紫の姿のまま'); if (stance === 'reveal') this.hint('化けを解いた：妖爪（攻撃）・妖刀（長押し）・猫火（構え＋撃つ）・瞬歩（回避）・幻術（弾く）'); this.later(5, () => this.hint(null)); };
    if (this.cut.active) this.cut.skip();
    this.playCutscene(stance === 'reveal' ? 'cs03_transform' : 'cs03_suppress', go);
  },
  onBossResolved3(how) {
    this.ui.boss(null); this.hint(null); this.story.boss3 = how; this.flags['boss3_' + how] = true;
    this.later(how === 'kill' ? 1.4 : 0.8, () => this.playCutscene('cs03_end'));
  },
  showEndCard3() {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice'] });
    const R = this.route, F = this.F();
    const stats = [['プレイ時間', fmtSec(this.playSec)], ['構え（第3章の転機）', R.stance === 'reveal' ? '化けを、解く（白髪形態）' : R.stance === 'secret' ? 'このまま、人として' : '—'], ['写し身', { rescue: '救った（本物の声）', kill: '倒した' }[this.story.boss3] || '—'],
      ['大きな患者（守り手）', this.enemyRes.mamori === 'kill' ? '倒した' : '救った'], ['記録のない患者', `救う ${this.count('kanja', 'rescue')}・眠らせる ${this.count('kanja', 'neutralize')}・倒す ${this.count('kanja', 'kill')}`],
      ['模倣する影', `倒した ${this.count('mimic', 'kill')}`], ['最大の連撃', this.metrics.comboMax || 0], ['白髪形態の時間', fmtSec(this.metrics.whiteSec || 0)], ['カルテの照合', this.flags.records_done ? '済' : '—'], ['看護記録（任意）', this.flags.memo ? '読んだ' : '—'], ['（相棒）の信頼', this.companion.brain.trust]];
    this.metrics.endCard3 = true;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); if (this.story.step === 'ch3_end') this.later(0.4, () => this.startCh4()); }, '第3章（病院・地下通路）　ここまで', '続けて第4章（境界の夜：観測分室と地下の研究区画）へ進めます。');
  },

  // ── 白髪形態 ──
  companionWatching() {
    const C = this.companion; if (!C.root.visible) return false;
    const d = d2(C.brain.pos, this.player.pos); if (d > 16) return false;
    return lineOfSight(C.brain.pos, this.player.pos, this.boxes);
  },
  whiteCheck() { if (this.ch4Secret && this.ch4Secret()) return { ok: false, why: 'route' }; return whiteAllowed(this.route, { chapterNo: chapterNo(this.story.step), companionWatching: this.companionWatching() }); },
  /** 化けを解く／戻す（長押しの入力から） */
  toggleWhite() {
    const F = this.F();
    if (F.white) { this.setWhite(false, 'manual'); return; }
    const r = this.whiteCheck();
    if (!r.ok) {
      if (r.why === 'watched') this.bark('white_watched', 2.4); else if (r.why === 'stance' || r.why === 'route') this.bark('white_stance', 2.4);
      this.metrics.whiteRefused = (this.metrics.whiteRefused || 0) + 1; this.metrics.whiteRefusedWhy = r.why;
      return;
    }
    if (F.yoki < COMBAT.white.gauge.min) { this.sfx.play('no_yoki'); this.ui.toast(`妖力が足りない（${COMBAT.white.gauge.min} 必要）`, 'weak', 1.2); return; }
    this.setWhite(true, 'free');
  },
  setWhite(on, src) {
    const F = this.F(), P = this.player;
    if (on) {
      if (!F.setForm('white', src === 'scripted')) return false;
      P.setModel(this.whiteModel); P.baseExpr = 'calm'; P.setExpr('calm');
      this.sfx.play('transform');
      for (let i = 0; i < 34; i++) { const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.6; this.fx.puff(P.pos.x + Math.sin(a) * r, Math.random() * 1.7, P.pos.z + Math.cos(a) * r, Math.sin(a) * 0.4, 0.5 + Math.random() * 0.5, Math.cos(a) * 0.4, i % 3 ? 0x9a5aff : 0xf0e0ff, 1.0 + Math.random() * 0.6, 0.38); }
      this.ui.flash('issen'); this.ui.form(true);
      this.route = logYokai(this.route, { chapter: stepDef(this.story.step).ch, step: this.story.step, form: 'white', src, sec: Math.round(this.playSec) });
      this.whiteSince = this.playSec;
    } else {
      if (F.white) F.setForm('purple');
      P.setModel(this.purpleModel); P.baseExpr = null; P.setExpr('neutral');
      this.sfx.play('revert'); for (let i = 0; i < 14; i++) this.fx.puff(P.pos.x + (Math.random() - 0.5) * 0.8, Math.random() * 1.6, P.pos.z + (Math.random() - 0.5) * 0.8, 0, 0.4, 0, 0xb090f0, 0.8, 0.3); this.ui.form(false);
      if (this.whiteSince != null) { this.metrics.whiteSec = (this.metrics.whiteSec || 0) + (this.playSec - this.whiteSince); this.whiteSince = null; }
      this.decoy = null; if (this.decoyModel) this.decoyModel.root.visible = false;
    }
    this.lastFormChange = this.playSec;
    return true;
  },
  /** 毎ステップ：変身の長押し・相棒が見えたら戻す・妖力の記録 */
  stepWhite(I) {
    const F = this.F();
    if (I.transform) { this.tfHold = (this.tfHold || 0) + 1; if (this.tfHold === COMBAT.white.transformHold) this.toggleWhite(); } else this.tfHold = 0;
    if (F.white && this.companionWatching() && !(this.route.reveal && this.route.reveal.companionKnows) && !this.cut.active) { this.setWhite(false, 'hide'); this.bark('white_hide', 2); }
    if (F.white) { this.metrics.comboMax = Math.max(this.metrics.comboMax || 0, F.combo.max); }
    // 猫火・幻術
    this.stepFires(DT);
    if (this.decoy) { this.decoy.t -= DT; if (this.decoy.t <= 0) { this.decoy = null; if (this.decoyModel) this.decoyModel.root.visible = false; } }
  },
  /** 行動の履歴（模倣する影が写す） */
  pushAct(a) { const h = this.actHist || (this.actHist = []); h.push(a); if (h.length > 12) h.shift(); },
  handleWhiteEvent(ev) {
    const P = this.player, F = P.fighter;
    switch (ev.t) {
      case 'foxfire': {
        this.pushAct('foxfire'); this.sfx.play('foxfire'); this.metrics.foxfire = (this.metrics.foxfire || 0) + 1;
        const tgt = (this.lock && this.lock.hittable()) ? this.lock : this.nearestEnemy(14, false, 120);
        if (tgt) P.yaw = Math.atan2(tgt.pos.x - P.pos.x, tgt.pos.z - P.pos.z);
        const X = COMBAT.white.foxfire;
        for (let i = 0; i < X.n; i++) {
          const a = P.yaw + (i - 1) * 0.55, h = this.halos.add([P.pos.x, 1.3, P.pos.z], 0.55, 0xff7ad8, 1.1);
          this.fires.push({ x: P.pos.x + Math.sin(a) * 0.4, y: 1.3 + i * 0.08, z: P.pos.z + Math.cos(a) * 0.4, vx: Math.sin(a) * X.speed * 0.6, vz: Math.cos(a) * X.speed * 0.6, t: X.life, target: tgt, halo: h, dmg: X.dmg });
        }
        break;
      }
      case 'illusion': {
        this.pushAct('illusion'); this.sfx.play('illusion'); this.metrics.illusion = (this.metrics.illusion || 0) + 1;
        this.decoy = { x: P.pos.x, z: P.pos.z, yaw: P.yaw, t: ev.dur };
        if (!this.decoyModel) { this.decoyModel = this.buildDecoy(); }
        const M = this.decoyModel; M.root.visible = true; M.root.position.set(P.pos.x, 0, P.pos.z); M.root.rotation.y = P.yaw;
        // 狙いをそらす：近くの敵は分身の方を向く
        for (const e of this.enemies) if (e.brain.alive && d2(e.pos, P.pos) < 12) { e.confusedT = ev.dur; if (e.brain.atk && e.brain.atk.phase === 'windup') e.brain.atk = null; }
        P.pos.x -= Math.sin(P.yaw) * 1.6; P.pos.z -= Math.cos(P.yaw) * 1.6; resolveCircle(P.pos, P.r, this.boxes);
        this.ui.toast('幻術', 'iai', 1.0);
        break;
      }
      case 'noYoki': this.sfx.play('no_yoki'); this.ui.toast(`妖力が足りない（${ev.need}）`, 'weak', 0.9); break;
      case 'revert': this.setWhite(false, 'empty'); this.bark('white_revert', 2.2); break;
    }
  },
  buildDecoy() {
    const m = this.makeWhiteModel(); m.root.visible = false;
    for (const mm of [m.mats.body, m.mats.face, m.mats.outline]) if (mm && mm.userData.u) mm.userData.u.uDissolve.value = 0.32;
    if (m.mats.body.userData.u) { m.mats.body.userData.u.uRim.value = 1.4; m.mats.body.userData.u.uRimColor.value.setHex(0xd8a8ff); }
    const g = new THREE.Group(); g.add(m.root); this.scene.add(g); m.root.position.y = 0;
    return { root: g, model: m };
  },
  stepFires(dt) {
    if (!this.fires || !this.fires.length) return;
    const X = COMBAT.white.foxfire;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt;
      let tgt = f.target && f.target.hittable() ? f.target : null;
      if (!tgt) { tgt = this.nearestEnemy(12, false, 360, { x: f.x, z: f.z }); f.target = tgt; }
      if (tgt) { const dx = tgt.pos.x - f.x, dz = tgt.pos.z - f.z, L = Math.hypot(dx, dz) || 1; f.vx += (dx / L * X.speed - f.vx) * Math.min(1, X.turn * dt); f.vz += (dz / L * X.speed - f.vz) * Math.min(1, X.turn * dt); f.y += ((tgt.h * 0.55) - f.y) * Math.min(1, 3 * dt); }
      f.x += f.vx * dt; f.z += f.vz * dt;
      this.halos.setPos(f.halo, f.x, f.y, f.z);
      if (Math.random() < 0.6) this.fx.particle(f.x, f.y, f.z, (Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4, Math.random() < 0.5 ? 0xff8ad8 : 0xb070ff, 0.35);
      let hit = null;
      for (const e of this.enemies) if (e.hittable() && Math.hypot(e.pos.x - f.x, e.pos.z - f.z) < e.r + 0.25) { hit = e; break; }
      const wall = this.boxes.some(b => b.maxY > 0.6 && f.x > b.minX && f.x < b.maxX && f.z > b.minZ && f.z < b.maxZ && f.y < b.maxY && f.y > b.minY);
      if (hit || wall || f.t <= 0) {
        if (hit) {
          this.damageEnemy(hit, Math.round(f.dmg * this.F().comboMul()), 'shot', { poise: 14 }); this.F().registerHit(); this.F().gainYoki('hit');
          hit.looks.hit(f.vx, f.vz, hit.brain.yaw, 0.6); this.sfx.play('fire_hit', hit.pos); this.metrics.foxfireHits = (this.metrics.foxfireHits || 0) + 1;
          if (hit.brain.alive && !['dormant', 'tenki', 'voice', 'rest'].includes(hit.brain.state) && hit.kind !== 'utsushimi' && hit.kind !== 'mamori') { hit.brain.atk = null; hit.brain.staggerFor = X.burn; hit.brain.go('stagger', [], 'burn'); }
        }
        this.fx.sparks(new THREE.Vector3(f.x, f.y, f.z), 14, 0xff8ad8);
        this.halos.setK(f.halo, 0); this.halos.setPos(f.halo, 0, -50, 0); this.fires.splice(i, 1);
      }
    }
  },
  /** 分身に向かう敵：sense の相手を分身にする */
  senseTarget(e) { if (this.decoy && e.confusedT > 0) return { x: this.decoy.x, z: this.decoy.z, decoy: true }; if (e.targetCompanion && this.companion.root.visible && this.companion.brain.mode !== 'grabbed') return { x: this.companion.brain.pos.x, z: this.companion.brain.pos.z, companion: true }; return null; },
  /** 分身が攻撃された：自動で見切りの窓（幻・見切り） */
  decoyStruck(e) {
    if (!this.decoy) return;
    const F = this.F(); F.mikiri = { src: e, at: F.frame };
    this.decoy = null; if (this.decoyModel) this.decoyModel.root.visible = false;
    this.ui.toast('幻・見切り', 'just', 1.0); this.sfx.play('just'); this.slowT = Math.round(COMBAT.justSlow.frames); this.slowScale = COMBAT.justSlow.scale; this.ui.slow(true);
    this.fx.mist(new THREE.Vector3(e.pos.x, 0, e.pos.z), 12, 1.4); this.metrics.decoyStruck = (this.metrics.decoyStruck || 0) + 1;
  },
};

// ── 描画（白髪形態の手の光・猫火・分身・模倣する影の見分け方） ──
Object.assign(ch3Methods, {
  renderWhite(dt) {
    const F = this.F(), P = this.player;
    if (!this.handHalos) this.handHalos = [this.halos.add([0, -50, 0], 0.2, 0xb070ff, 0), this.halos.add([0, -50, 0], 0.2, 0xb070ff, 0)];
    const v = new THREE.Vector3(); const on = F.white && !this.cut.active || (this.cut.active && F.white);
    ['rightHand', 'leftHand'].forEach((n, i) => { const j = P.model.J[n]; if (!j) return; j.getWorldPosition(v); this.halos.setPos(this.handHalos[i], v.x, v.y - 0.06, v.z); this.halos.setK(this.handHalos[i], on ? 0.3 + Math.sin(this.playSec * 7 + i) * 0.1 + (F.st.name === 'attack' ? 0.5 : 0) : 0); });
    if (on && Math.random() < 0.25) { const j = P.model.J[Math.random() < 0.5 ? 'rightHand' : 'leftHand']; j.getWorldPosition(v); this.fx.particle(v.x, v.y, v.z, (Math.random() - 0.5) * 0.2, 0.5, (Math.random() - 0.5) * 0.2, 0xb070ff, 0.5); }
    if (this.decoy && this.decoyModel) { const M = this.decoyModel; M.root.visible = true; M.model.root.updateMatrixWorld(); }
  },
  /** 妖爪の軌跡：攻める手の手首 → 爪の先 */
  clawPoints() {
    const F = this.F(), J = this.player.model.J, hand = F.st.step % 2 ? J.leftHand : J.rightHand; if (!hand) return null;
    const a = new THREE.Vector3(0, -0.04, 0), c = new THREE.Vector3(0, -0.2, 0.02); hand.updateWorldMatrix(true, false); a.applyMatrix4(hand.matrixWorld); c.applyMatrix4(hand.matrixWorld);
    return [a, c];
  },
  /** 化けている模倣する影：懐中電灯を当てると目が紫に光る（見分け方） */
  mimicTell(e) {
    const H = e.alt.J.head, v = new THREE.Vector3(); H.getWorldPosition(v);
    const lit = this.flashlightOn && this.inFlashCone(e.pos) && Math.hypot(e.pos.x - this.player.pos.x, e.pos.z - this.player.pos.z) < 10;
    const side = new THREE.Vector3(Math.cos(e.brain.yaw), 0, -Math.sin(e.brain.yaw)), fw = new THREE.Vector3(Math.sin(e.brain.yaw), 0, Math.cos(e.brain.yaw));
    e.eyeHalos.forEach((h, i) => { const p = v.clone().addScaledVector(side, (i ? -1 : 1) * 0.045).addScaledVector(fw, 0.11); p.y += 0.07; this.halos.setPos(h, p.x, p.y, p.z); this.halos.setK(h, lit ? 1.3 : 0); });
    if (lit && !this.flags.tell_seen) { this.flags.tell_seen = true; this.metrics.tellSeen = true; }
  },
});

function fmtSec(s) { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; }
export { ACT_LABEL, mimicPlan, HOSP, ITEMS };
