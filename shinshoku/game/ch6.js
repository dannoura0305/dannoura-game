// 第6章（A の続き：崩れた商店街・中央通りの塗替／B：中央管理棟）の実行。Game（main.js）のメソッドとして組み込む。
// ・reveal（第6章A の続き）：守りきった後、人の大きさ（白い姿）に戻って崩れた商店街へ（娘の電話・（相棒）のメッセージ）→
//   置換の糸の中継を元（上流）から順に切る（必須：白い姿の目で流れを見る／防災無線の記録）→ 中央通りで自分の意思で巨大猫又 → 塗替（ボス）
//   → 研究者の声 → 第6章A の終わり（最終章の入口で止める）。
// ・secret（第6章B）：第5章B の終わりの表から連絡橋で中央管理棟へ（（相棒）と一緒）→ 時刻の矛盾（監視室・必須）→ 保守扉 →
//   巡回点検と診断（機械室・必須・設備保全）→ 隔離の手順（必須）→ 当直（ボス：蒸気弁で崩す・点検表を渡す＝救う／施錠＝無力化／倒す）
//   → 制御装置の止め方 → 研究者の声と影 → 第6章B の終わり（最終章の入口で止める）。
// ルートの記録（route / routeLock / branchLog）は第4章で確定したまま。ここでは書き換えない（ROUTE_BRANCH_SPEC）。
import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';
import { RELAYS, relayOrder, cutRelay, RUINS, AVENUE, DOCS6, CLOCKS, checkClock, ROUNDS, vibZone, checkDiagnosis, LOTO, checkLoto, CONTROL_STOP, ADMIN } from '../data/ch6.js';
import { Nurikae } from '../ai/nurikae.js';
import { Machibito } from '../ai/machibito.js';
import { Touchoku } from '../ai/touchoku.js';
import { segDist } from '../ai/sakibure.js';
import { buildNurikae, buildMachibito, buildTouchoku } from '../actor/models6.js';
import { NurikaeAnimator, touchokuPose, machibitoPose } from '../actor/anim6.js';
import { stepDef, stepRoute, R6_STEPS, S6_STEPS } from '../story/chapters.js';
import { EnemyActor } from '../actor/actors.js';

const DT = 1 / 60;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const CH6_AREAS = ['ruins', 'avenue', 'admin'];
const fmt = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; };

export const ch6Methods = {
  // ── 始まり ──
  /** reveal：守りきった後（cs06_end の終わり）→ 人の大きさに戻って崩れた商店街へ */
  toRuins6() {
    if (this.area.id === 'ruins') return;
    if (this.giantMode) this.exitGiant();
    this.rampage = null; this.protect = null; this.rampOverlay(false); this.ui.root.classList.remove('rampage');
    const F = this.F(); F.hp = F.hpMax; F.yokiOn = true; F.yoki = Math.max(F.yoki, 90);
    this.flags.ruins6 = true;
    this.changeArea('ruins', 'south');
  },
  /** secret：第5章B の終わりの表を閉じた後 → 連絡橋で中央管理棟へ */
  startCh6s() {
    if (this.flags.ch6s_started || this.route.route !== 'secret') return;
    this.flags.ch6s_started = true;
    const F = this.F(); F.hp = F.hpMax; F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted');
    this.companion.brain.setMode('follow'); this.companion.root.visible = true;
    this.setStep('ch6_s_enter');
    this.changeArea('admin', 'bridge');
  },
  onAreaEnter6(id) {
    const s = this.story.step;
    if (id === 'ruins' && (s === 'ch6a_end' || s === 'ch6a_threads') && !this.flags.cs_cs06r_ruins) this.later(0.1, () => this.playCutscene('cs06r_ruins'));
    if (id === 'avenue' && s === 'ch6a_avenue') this.later(0.1, () => this.playCutscene('cs06a_boss'));
    if (id === 'admin' && s === 'ch6_s_enter' && !this.flags.cs_cs06s_arrive) this.later(0.1, () => this.playCutscene('cs06s_arrive'));
    if (CH6_AREAS.includes(id)) this.applyArea6();
  },
  /** 区画のルートごと・進み具合ごとの状態（糸・扉・画面） */
  applyArea6() {
    const A = this.area, D = A.dyn, f = this.flags;
    if (A.id === 'ruins') {
      const cut = f.relayCut6 || [];
      for (const id of ['T', 'P', 'Y']) { const on = !cut.includes(id); D.threads[id].visible = on; this.halos.setK(D.relayHalo[id], on ? 0.8 : 0); }
      for (const m of D.threadTail || []) m.visible = cut.length < 3;
      this.sfx.setAmbience('ruins');
    }
    if (A.id === 'admin') {
      const M = D.mdoor; M.open = !!f.mdoor6; M.target = M.open ? M.up : M.down; M.mesh.position.y = M.target; this.boxIn6(M.box, !M.open);
      this.halos.setColor(D.mdoorHalo, M.open ? 0x40ff80 : 0xff3030); const mh = A.halos[D.mdoorHalo]; if (mh) mh.hazard = !M.open;
      const C = D.cdoor; C.open = !!f.cdoor6; C.target = C.open ? C.up : C.down; C.mesh.position.y = C.target; this.boxIn6(C.box, !C.open);
      this.halos.setK(D.p2Halo, f.isolate6 ? 0 : 0.6); const wl = A.lights.find(l => l.id === 'p2'); if (wl) wl.off = !!f.isolate6;
      const warn = A.lights.find(l => l.id === 'warn'); if (warn) warn.off = !!f.expandOff6; this.halos.setK(D.warnHalo, f.expandOff6 ? 0 : 0.6);
      if (D.screen.material.map) { D.screen.material.map = null; D.screen.material.color.setHex(0x1a0a2a); D.screen.material.needsUpdate = true; }
      this.sfx.setAmbience(f.isolate6 ? 'admin' : 'admin_machine');
    }
  },
  boxIn6(b, on) { const A = this.area, i = A.boxes.indexOf(b); if (on && i < 0) A.boxes.push(b); if (!on && i >= 0) A.boxes.splice(i, 1); },

  // ── 敵 ──
  spawnCh6(id, add) {
    if (!CH6_AREAS.includes(id)) return false;
    const s = this.story.step;
    if (id === 'ruins') {
      for (const o of RUINS.mimics) if (!this.enemyRes[o.id]) this.addMimic(add, { id: o.id, pos: o.pos, yaw: o.yaw, lure: 'mimic_lure_visitor' }, 'civilian');
      for (const o of RUINS.spare) if (this.flags['spare6_' + o.id] && !this.enemyRes[o.id]) this.addMimic(add, { id: o.id, pos: o.pos, yaw: 0 }, null);
      this.addMachibito6(add, 'machibito_r', RUINS.busStop[0] + 0.2, RUINS.busStop[1], -Math.PI / 2);
      return true;
    }
    if (id === 'avenue') {
      const r = this.enemyRes.nurikae;
      if (!r) {
        const B = AVENUE.boss, b = new Nurikae({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, yaw: 0, seed: 41 });
        const m = this.bossModel6(); const e = add(b, m); m.actorRef = e; e.big = true; e.poseFn = () => ({ pose: {}, rate: 0 }); e.r = 8; b.r = 8; e.h = 22; this.boss = e;
        e.root.visible = s === 'ch6a_boss' || !!this.flags.boss6_risen;
        if (s === 'ch6a_boss') b.wake([]);
      }
      this.blocks6 = this.blocks6 || Object.fromEntries(AVENUE.blocks.map(b => [b.id, b.hp]));
      return true;
    }
    if (id === 'admin') {
      const M = ADMIN.machibito; this.addMachibito6(add, M.id, M.pos[0], M.pos[1], Math.PI);
      if (!this.flags.isolate6) for (const o of ADMIN.roam) if (!this.enemyRes[o.id]) this.addMimic(add, { id: o.id, pos: o.pos, yaw: o.yaw, lure: 'mimic_lure_visitor' }, 'civilian');
      const r = this.enemyRes.touchoku;
      if (!r) {
        const B = ADMIN.boss, route = ROUNDS.machines.map(m => [m.pos[0], m.pos[1] + 1.8]);
        const brain = new Touchoku({ id: B.id, pos: { x: B.desk[0] - 1.2, z: B.desk[1] }, valve: { x: B.valve[0], z: B.valve[1] + 0.6 }, desk: { x: B.desk[0], z: B.desk[1] }, route, seed: 71, assist: !!this.touchokuAssist6, state: 'dormant' });
        const e = add(brain, buildTouchoku()); e.poseFn = touchokuPose; e.r = 0.55; e.h = 2.3; this.boss = e;
        e.root.visible = s === 'ch6_s_boss' || s === 'ch6_s_isolate' && !!this.flags.isolate6;
        if (s === 'ch6_s_boss') { brain.state = 'loop'; brain.wake([]); }
      } else if (r === 'rescue' || r === 'neutralize') {
        const B = ADMIN.boss, brain = new Touchoku({ id: B.id, pos: { x: B.desk[0] - 1.0, z: B.desk[1] + 0.2 }, state: r === 'rescue' ? 'rest' : 'locked' }); brain.resolution = r; brain.yaw = Math.PI / 2;
        const e = add(brain, buildTouchoku()); e.poseFn = touchokuPose; e.r = 0.55; e.h = 2.3;
      }
      return true;
    }
    return true;
  },
  addMachibito6(add, id, x, z, yaw) {
    const r = this.enemyRes[id]; if (r === 'kill') return null;
    const b = new Machibito({ id, pos: { x, z }, yaw, seed: id.length * 7, state: r === 'rescue' ? 'rest' : r === 'neutralize' ? 'sleep' : 'loop' });
    if (r) b.resolution = r;
    const e = add(b, buildMachibito(id.endsWith('r') ? 1 : 2)); e.poseFn = machibitoPose; return e;
  },
  bossModel6() {
    const m = buildNurikae(); m.root.scale.setScalar(12); m.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const base = m.update; m.anim = new NurikaeAnimator(m);
    m.update = dt => { if (base) base(dt); if (m.anim && m.actorRef) m.anim.update(dt, m.actorRef); };
    return m;
  },
  placeCompanion6(id) {
    if (!CH6_AREAS.includes(id)) return false;
    const C = this.companion, b = C.brain, s = this.story.step;
    if (id !== 'admin') { C.root.visible = false; b.setMode('scripted'); return true; }                // reveal：（相棒）は病院
    C.root.visible = true; C.anim = null;
    if (s === 'ch6_s_boss') { b.setMode('scripted'); b.pos = { x: 0, z: -4.4 }; b.yaw = Math.PI; return true; }
    b.setMode('follow'); b.teleportBehind(this.player.pos, this.player.yaw);
    return true;
  },

  // ── 毎ステップ ──
  storyTick6() {
    const A = this.area.id; if (!CH6_AREAS.includes(A)) return;
    const P = this.player.pos;
    // 振動計（巡回点検）：調べるで当て始め、離れずに measureSec 待つ
    if (this.measure6) {
      const M = this.measure6, m = ROUNDS.machines.find(q => q.id === M.id), sp = this.area.spots.find(q => q.id === 'ad_m_' + M.id);
      if (!sp || Math.hypot(P.x - sp.x, P.z - sp.z) > sp.r + 0.6) { this.measure6 = null; this.hint(null); this.ui.log('振動計を離した（測り直し）'); }
      else { M.t += DT; if (this.frame % 12 === 0) this.sfx.play('gauge'); this.hint(`振動計を当てている… ${Math.min(100, Math.round(M.t / ROUNDS.measureSec * 100))}%`); if (M.t >= ROUNDS.measureSec) this.finishMeasure6(m); }
    }
    // 蒸気弁の噴き（線）：当直が線の中なら崩れる
    for (const j of this.steamJets6 || []) {
      j.t += DT;
      if (Math.random() < 0.7) { const k = Math.random(); this.fx.puff(j.from.x + (j.to.x - j.from.x) * k, 1.0 + Math.random() * 0.8, j.from.z + (j.to.z - j.from.z) * k, (j.to.x - j.from.x) * 0.25, 0.6, (j.to.z - j.from.z) * 0.25, 0xe8eef8, 1.0, 0.6); }
      if (!j.hit) for (const e of this.enemies) {
        if (!e.brain.alive || !e.root.visible || e.brain.resolution) continue;
        if (segDist(e.pos, j.from, j.to) > 1.3 + e.r) continue;
        if (e.kind === 'touchoku') { const ev = []; if (e.brain.steamed(ev)) { j.hit = true; this.metrics.steamHits6 = (this.metrics.steamHits6 || 0) + 1; this.enemyEvents(e, ev); } }
        else if (!e.steamT6 || e.steamT6 < this.playSec) { e.steamT6 = this.playSec + 1.5; this.damageEnemy(e, 18, 'slash', { poise: 30 }); }
      }
    }
    if (this.steamJets6) this.steamJets6 = this.steamJets6.filter(j => j.t < 2.0);
    // 時計を止める場（待人の攻め）：時間がたつと消える
    if (this.slowZones6) this.slowZones6 = this.slowZones6.filter(z => (z.t -= DT) > 0);
    // 糸の光の粒（白い姿の目でよく見える）
    if (A === 'ruins') this.tickThreads6();
  },
  /** 待人の「時計を止める」場の中では遅くなる（combat.js の stepPlayer から呼ぶ） */
  slowZoneK(p) { for (const z of this.slowZones6 || []) if (Math.hypot(p.x - z.x, p.z - z.z) < z.r) return 0.45; return 1; },
  tickThreads6() {
    const D = this.area.dyn, white = this.F().white, cut = this.flags.relayCut6 || [];
    for (const id of ['T', 'P', 'Y']) { const m = D.threads[id]; if (m.visible) m.material.opacity = white ? 0.9 : 0.22; }
    for (const m of D.threadTail || []) m.material.opacity = white ? 0.4 : 0.1;
    if (!this.pulses6) this.pulses6 = ['T', 'P', 'Y'].map((id, i) => ({ id, k: i * 0.33, halo: this.halos.add([0, -50, 0], 0.9, 0xffb0ff, 0) }));
    for (const p of this.pulses6) {
      const pts = D.threadPts[p.id]; p.k = (p.k + DT * 0.35) % 1;
      const on = white && !cut.includes(p.id), q = pts[Math.min(pts.length - 1, Math.floor(p.k * (pts.length - 1)))];
      this.halos.setPos(p.halo, q.x, q.y, q.z); this.halos.setK(p.halo, on ? 0.9 : 0);
    }
  },

  // ── 調べる（第6章） ──
  useSpot6(s) {
    const T = this.events.texts || {};
    switch (s.kind) {
      case 'relay6': this.relay6(s.relay); return true;
      case 'item6': this.pickItem6(s); return true;
      case 'clue6': this.clue6(s.clue); return true;
      case 'exit6':
        if (s.to === 'avenue') { if (this.story.step !== 'ch6a_avenue') { this.sayText(T.ru_north_wait || '糸の元へ行く前に、町に伸びる中継を切らないと。'); return true; } this.changeArea('avenue', 'giant'); return true; }
        return true;
      case 'clock6': this.stopClock6(); return true;
      case 'monitor6': this.openClocks6(); return true;
      case 'mdoor6': if (this.flags.mdoor6) { this.sayText('保守扉は開いている。'); return true; } this.openDoorTime6(); return true;
      case 'measure6': this.startMeasure6(s.machine); return true;
      case 'board6': this.openBoard6(); return true;
      case 'loto6': if (this.flags.isolate6) { this.sayText('P-2 は止まっている。遮断器に錠、弁は閉めて、ドレンも抜いた。'); return true; } if (!this.flags.diag6) { this.sayText(T.ad_loto_wait || 'P-2 の現場盤。……止める前に、どれが本当に悪いのか確かめないと（点検表）。'); return true; } this.openLoto6(); return true;
      case 'steam6': this.steamValve6(s.valve); return true;
      case 'cdoor6': this.sayText(this.flags.cdoor6 ? '制御室の扉は開いている。' : '制御室の扉。……機械室の誰かが、鍵を持っているのかもしれない。'); return true;
      case 'control6': if (this.story.step !== 'ch6_s_control') { this.sayText(this.flags.expandOff6 ? '制御装置は止まっている。' : '制御装置の盤。……まだ近づけない。'); return true; } this.openControl6(); return true;
      case 'deliver6': this.deliver6(s.ref); return true;
      case 'handover6': this.handOver6(); return true;
      case 'lockout6': this.lockOut6(); return true;
    }
    if (s.kind === 'stairs5' && this.story.step === 'ch5_s_end') { this.startCh6s(); return true; }
    return false;
  },
  /** 動く「調べる」の場所：待人に届ける・崩れた当直に点検表を渡す／レンチを施錠 */
  extraSpots6() {
    const out = [];
    for (const e of this.enemies) {
      if (e.kind === 'machibito' && e.brain.alive && !e.brain.resolution && this.flags['item6_' + this.area.id]) out.push({ id: 'deliver_' + e.id, kind: 'deliver6', ref: e, x: e.pos.x, z: e.pos.z, r: 2.2, label: this.area.id === 'ruins' ? '紺の傘を渡す' : '封筒を渡す' });
      if (e.kind === 'touchoku' && e.brain.alive && !e.brain.resolution && e.brain.state === 'down') {
        const sx = Math.cos(e.brain.yaw), sz = -Math.sin(e.brain.yaw);                  // 当直の左右：左手（点検表）側＝渡す・右手（レンチ）側＝施錠
        out.push({ id: 'handover6', kind: 'handover6', x: e.pos.x + sx * 1.1, z: e.pos.z + sz * 1.1, r: 1.5, label: '点検表（引き継ぎ）を渡す' });
        out.push({ id: 'lockout6', kind: 'lockout6', x: e.pos.x - sx * 1.1, z: e.pos.z - sz * 1.1, r: 1.5, label: 'レンチを配管に施錠する（ロックアウト）' });
      }
    }
    return out;
  },
  clue6(id) {
    const T = this.events.texts || {}, doc = DOCS6[id];
    this.flags['seen_' + id] = true; this.metrics.puzzles['ch6_' + id] = true;
    if (doc) this.addDoc(doc.id);
    this.sayText(doc ? `『${doc.title}』${doc.text}` : (T[id + '_text'] || '……'));
  },
  pickItem6(s) {
    const k = 'item6_' + this.area.id;
    if (this.flags[k] || this.flags[k + '_given']) { this.sayText('もう何も無い。'); return; }
    this.flags[k] = true; this.sfx.play('pickup');
    this.sayText(this.area.id === 'ruins' ? '紺の傘。柄に、ひらがなで名前のシールが貼ってある。……バス停で待っている人の、連れの物かもしれない。' : '受付の落とし物の箱に、宛名の書かれた封筒。「待合でお待ちの方へ　遅れてごめんなさい」。');
  },
  deliver6(e) {
    if (!e || !e.brain.alive || e.brain.resolution) return;
    const ev = []; if (e.brain.deliver(ev)) { this.flags['item6_' + this.area.id + '_given'] = true; delete this.flags['item6_' + this.area.id]; this.bark('machibito_thanks', 3); this.enemyEvents(e, ev); this.metrics.machibitoRescued6 = (this.metrics.machibitoRescued6 || 0) + 1; }
  },
  stopClock6() {
    const e = this.enemies.find(x => x.kind === 'machibito' && x.brain.alive && !x.brain.resolution);
    if (!e) { this.sayText('時計は止まっている。'); return; }
    const ev = []; if (e.brain.stopClock(ev)) { this.sfx.play('breaker'); this.sayText('時計の電池を抜いた。針が止まる。……待っていた人は、そのまま眠るように動かなくなった。'); this.enemyEvents(e, ev); }
  },

  // ── reveal：置換の糸 ──
  relay6(id) {
    const T = this.events.texts || {}, F = this.F(), cut = this.flags.relayCut6 || (this.flags.relayCut6 = []), r = RELAYS.list.find(q => q.id === id);
    if (cut.includes(id)) { this.sayText('この中継の糸は、もう切れている。'); return; }
    // 白い姿の目：流れの向きが分かる（観察の手掛かり）
    if (F.white) { this.flags['relay_seen6_' + id] = true; this.metrics.puzzles['relay_seen_' + id] = true; }
    const res = cutRelay(cut, id, F.white);
    this.metrics.relayTries6 = (this.metrics.relayTries6 || 0) + 1;
    if (res.why === 'form') { this.sayText((T.relay_purple || '紫の糸が、かすかに見える。……人の姿の目では流れが分からない。爪でないと切れそうにない（白い姿：化を長押し）') ); this.metrics.relayRefused6 = (this.metrics.relayRefused6 || 0) + 1; return; }
    const from = r.from === 'N' ? '北の光の柱' : RELAYS.list.find(q => q.id === r.from).name, to = r.to ? RELAYS.list.find(q => q.id === r.to).name : '町の灯り';
    if (!res.ok) {
      this.relayMiss6 = (this.relayMiss6 || 0) + 1; this.metrics.relayMiss6 = this.relayMiss6;
      this.sfx.play('claw'); this.sfx.play('relay_regrow'); this.cam.shake(0.08, 0.2);
      this.sayText(`爪で糸を断った——が、すぐに伸び直した。光の粒は「${from}」の方から流れてくる。……先に、上の方を切らないと。`);
      this.spawnSpare6();
      return;
    }
    cut.push(id); this.metrics.puzzles['relay_' + id] = true; this.sfx.play('claw'); this.sfx.play('seal_cut'); this.ui.flash('issen'); this.ui.toast(`糸を切った（${cut.length}／3）`, 'parry', 1.2);
    const D = this.area.dyn, at = D.relayAt[id]; for (let i = 0; i < 24; i++) this.fx.puff(at[0], at[1], at[2], (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, i % 2 ? 0xe070ff : 0xffffff, 0.8, 0.5);
    this.applyArea6();
    if (cut.length === 1) this.sayText(`糸を断った。光の粒は「${from}」から来て、「${to}」へ流れていた。……元から順に切れば、伸び直さない。`);
    if (cut.length >= 3) { this.flags.relays6 = true; this.metrics.puzzles.relays6 = true; this.later(0.8, () => this.playCutscene('cs06r_source')); }
  },
  /** ちがう順に切った：糸の影（模倣する影）が出る（2 体まで） */
  spawnSpare6() {
    const o = RUINS.spare.find(q => !this.flags['spare6_' + q.id]); if (!o) return;
    this.flags['spare6_' + o.id] = true;
    const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    const e = this.addMimic(add, { id: o.id, pos: o.pos, yaw: 0 }, null);
    if (e) { this.fx.mist(new THREE.Vector3(o.pos[0], 0, o.pos[1]), 20, 1.8); e.brain.hostileBy = 'thread'; }
    this.bark('relay_shadow', 2.6);
  },

  // ── secret：中央管理棟の謎 ──
  openClocks6() {
    this.mode = 'puzzle'; this.input.exitLock(); this.flags.seen_clocks6 = true; this.metrics.puzzles.clocks6_seen = true;
    const note = '機械室の保守扉は「最後の正常な巡回の時刻」で開く（当直の決まり）。カメラの記録の時刻と、画面の奥の壁時計を見比べる。';
    this.ui.clockUI(CLOCKS.cams, (id, g, w, h) => drawCam6(CLOCKS.cams.find(c => c.id === id), g, w, h), () => { this.ui.closePuzzle(); this.resume(); }, note);
  },
  openDoorTime6() {
    this.mode = 'puzzle'; this.input.exitLock();
    const hints = []; if (this.flags.seen_clocks6) hints.push('監視カメラ：CAM-3（機械室前）の記録は 02:31。……でも画面の奥の壁時計は？'); if (this.flags.seen_duty6) hints.push('当番表：巡回は 2 分おき（監視室前 01:43 → 受付 01:45 → 機械室前 ……）');
    this.ui.timeUI(CLOCKS.options, t => {
      const r = checkClock(t); this.metrics.clockTries6 = (this.metrics.clockTries6 || 0) + 1;
      if (r.ok) { this.ui.closePuzzle(); this.mode = 'play'; this.flags.mdoor6 = true; this.metrics.puzzles.clock6 = true; this.sfx.play('ui_ok'); this.playCutscene('cs06s_door'); return null; }
      this.clockMiss6 = (this.clockMiss6 || 0) + 1; this.metrics.clockMiss6 = this.clockMiss6; this.sfx.play('ui_ng');
      return r.why === 'drift' ? '扉は開かない。……その時刻の記録は、ずれた時計のものかもしれない。' : '扉は開かない。記録と合わない。';
    }, () => { this.ui.closePuzzle(); this.resume(); }, hints.join('\n') || '時刻を入れる（監視室の記録・当番表を見ると分かる）');
  },
  openMdoor6() { const M = this.area.dyn.mdoor; if (!M) return; M.open = true; M.target = M.up; this.boxIn6(M.box, false); this.halos.setColor(this.area.dyn.mdoorHalo, 0x40ff80); const h = this.area.halos[this.area.dyn.mdoorHalo]; if (h) h.hazard = false; this.sfx.play('door', { x: 0, z: -6.6 }); },
  startMeasure6(id) {
    if (this.flags['meas6_' + id]) { const m = ROUNDS.machines.find(q => q.id === id); this.sayText(readingText(m)); return; }
    if (this.measure6) return;
    this.measure6 = { id, t: 0 }; this.sfx.play('ui');
  },
  finishMeasure6(m) {
    this.measure6 = null; this.hint(null); this.flags['meas6_' + m.id] = true; this.metrics.puzzles['meas6_' + m.id] = true; this.sfx.play('ui_ok');
    this.metrics.measured6 = ROUNDS.machines.filter(q => this.flags['meas6_' + q.id]).length;
    this.sayText(readingText(m));
    if (m.abnormal && !this.flags.p2_bark6) { this.flags.p2_bark6 = true; this.later(0.4, () => this.bark('p2_sound', 3)); }
  },
  openBoard6() {
    if (this.flags.diag6) { this.sayText('点検表：P-2 に「異常（軸受）・停止」と書いた。'); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    const rows = ROUNDS.machines.map(m => ({ id: m.id, name: m.name, prev: m.prev, now: this.flags['meas6_' + m.id] ? m.vib : null, temp: this.flags['meas6_' + m.id] ? m.temp : null, sound: this.flags['meas6_' + m.id] ? m.sound : null, zone: this.flags['meas6_' + m.id] ? vibZone(m.vib) : null, note: m.note }));
    const note = `判定の目安（保全基準・仮）：振動 ${ROUNDS.zones.good} 未満＝良／${ROUNDS.zones.warn} 未満＝注意／それ以上＝危険（mm/s）。大事なのは前回からの変わり方。` + (this.flags.seen_log6 ? '\n当直の日誌：「P-2：ゴロゴロという音。軸受の温度が上がっている」' : '');
    this.ui.roundsUI(rows, id => {
      const r = checkDiagnosis(id); this.metrics.diagTries6 = (this.metrics.diagTries6 || 0) + 1;
      if (r.ok) { this.ui.closePuzzle(); this.mode = 'play'; this.flags.diag6 = true; this.metrics.puzzles.diag6 = true; this.sfx.play('ui_ok'); this.playEvent('ev_diag6_done', () => this.setStep('ch6_s_isolate')); return null; }
      this.diagMiss6 = (this.diagMiss6 || 0) + 1; this.metrics.diagMiss6 = this.diagMiss6; this.sfx.play('ui_ng');
      return r.why === 'baseline' ? 'その機械は値が高いけれど、前回とほとんど同じ（保全記録：基礎の共振・許容）。……急に変わったのは？' : 'その機械の値は落ち着いている。……前回から急に変わった機械は？';
    }, () => { this.ui.closePuzzle(); this.resume(); }, note);
  },
  openLoto6() {
    this.mode = 'puzzle'; this.input.exitLock();
    const seq = this.lotoSeq6 || (this.lotoSeq6 = []);
    const show = ['dis', 'stop', 'drain', 'lock', 'suc'].map(id => LOTO.steps.find(s => s.id === id));          // 表示の並び（答えと違う並び）
    const redo = msg => this.ui.lotoUI(show, seq, id => { if (!seq.includes(id)) seq.push(id); this.sfx.play('ui'); redo(); }, () => { seq.length = 0; redo(); }, () => {
      const r = checkLoto(seq); this.metrics.lotoTries6 = (this.metrics.lotoTries6 || 0) + 1;
      if (r.ok) { this.ui.closePuzzle(); this.mode = 'play'; this.lotoSeq6 = []; this.finishLoto6(); return; }
      this.lotoMiss6 = (this.lotoMiss6 || 0) + 1; this.metrics.lotoMiss6 = this.lotoMiss6; seq.length = 0;
      const M = { hammer: '回したまま弁を閉めた——配管が「ガン！」と鳴る（水撃）。すぐ戻した。……先に止めないと', lock: '弁に触る前に、遮断器を切って錠をかけないと（誰かが入れ直したら危ない）', cav: '吸込から閉めると、残った水で羽根車が空回りする。弁は吐出側から', drain: '圧が残ったまま。最後にドレンで抜く', count: '手順が足りない（5 つ）' };
      if (r.why === 'hammer') { this.sfx.play('water_hammer'); this.cam.shake(0.18, 0.3); }
      else this.sfx.play('ui_ng');
      redo(M[r.why] || 'ちがう');
    }, () => { this.ui.closePuzzle(); this.resume(); }, LOTO.hint, msg, this.lotoMiss6 || 0);
    redo();
  },
  finishLoto6() {
    this.flags.isolate6 = true; this.metrics.puzzles.isolate6 = true; this.sfx.play('breaker'); this.sfx.play('power_down');
    this.halos.setK(this.area.dyn.p2Halo, 0); const wl = this.area.lights.find(l => l.id === 'p2'); if (wl) wl.off = true;
    for (const e of this.enemies) if (e.kind === 'mimic' && e.brain.alive && !e.brain.resolution) { e.root.visible = false; this.enemyRes[e.id] = this.enemyRes[e.id] || 'escape'; }
    this.playCutscene('cs06s_isolate');
  },
  steamValve6(id) {
    const v = ADMIN.steam.find(q => q.id === id); this.steamCd6 = this.steamCd6 || {};
    if ((this.steamCd6[id] || 0) > this.playSec) { this.ui.log('蒸気弁：圧が戻るまで少し待つ'); return; }
    this.steamCd6[id] = this.playSec + 6;
    const from = { x: v.at[0], z: v.at[1] }, to = { x: v.at[0] + v.dir[0] * v.len, z: v.at[1] + v.dir[1] * v.len };
    (this.steamJets6 = this.steamJets6 || []).push({ id, from, to, t: 0, hit: false });
    this.fx.decal('line', from.x, from.z, { r: v.len, w: 2.6, yaw: Math.atan2(v.dir[0], v.dir[1]), dur: 0.1, hold: 1.8, color: 0xffffff });
    this.sfx.play('steam'); this.metrics.steamUses6 = (this.metrics.steamUses6 || 0) + 1;
    if (!this.flags.steam_bark6) { this.flags.steam_bark6 = true; this.later(0.4, () => this.bark('steam_use', 2.4)); }
  },
  handOver6() { const e = this.boss && this.boss.kind === 'touchoku' ? this.boss : null; if (!e) return; const ev = []; if (e.brain.handOver(ev)) { this.bark('touchoku_handover', 3.4); this.enemyEvents(e, ev); } },
  lockOut6() { const e = this.boss && this.boss.kind === 'touchoku' ? this.boss : null; if (!e) return; const ev = []; if (e.brain.lockOut(ev)) { this.sfx.play('breaker'); this.bark('touchoku_locked', 3); this.enemyEvents(e, ev); } },
  openControl6() {
    this.mode = 'puzzle'; this.input.exitLock();
    const opts = CONTROL_STOP.options.map(o => ({ id: o.id, label: o.label, sub: '' }));
    this.ui.choiceUI('制御装置：どう止める？', opts, id => {
      const o = CONTROL_STOP.options.find(q => q.id === id); this.metrics.controlTries6 = (this.metrics.controlTries6 || 0) + 1;
      this.ui.closePuzzle(); this.mode = 'play';
      if (o.ok) { this.flags.control6 = true; this.metrics.puzzles.control6 = true; this.playCutscene('cs06s_control'); return; }
      this.controlMiss6 = (this.controlMiss6 || 0) + 1; this.sayText(o.bad);
    }, '盤の札：「拡大運転の停止：出力を下げてから主幹」「非常停止：使用禁止（置き換えが途中で固まる）」（仮）');
  },

  // ── 敵の出来事（待人・当直） ──
  enemyEvents6(e, ev) {
    const b = e.brain, P = this.player.pos;
    if (e.kind === 'machibito') {
      if (ev.t === 'say') { if (d2(b.pos, P) < 10) { this.bark(ev.key, 2.4); this.sfx.play('kanja_voice', b.pos); } return true; }
      if (ev.t === 'misread') { this.metrics.misread6 = (this.metrics.misread6 || 0) + 1; if (!this.flags.misread_bark6) { this.flags.misread_bark6 = true; this.later(1.2, () => this.bark(this.area.id === 'admin' ? 'machibito_misread_c' : 'machibito_misread_d', 3)); } return true; }
      if (ev.t === 'attack' && ev.name === 'stopclock') { const at = ev.at || b.pos; (this.slowZones6 = this.slowZones6 || []).push({ x: at.x, z: at.z, r: ev.def.aoe.r, t: ev.def.aoe.slow }); this.fx.decal('circle', at.x, at.z, { r: ev.def.aoe.r, dur: 0.1, hold: ev.def.aoe.slow, color: 0x9ad8ff }); this.sfx.play('chime', at); return false; }
      if (ev.t === 'rescued') { this.sfx.play('rescue', b.pos); this.resolve(e, 'rescue'); return true; }
      if (ev.t === 'neutralized') { this.resolve(e, 'neutralize'); return true; }
      return false;
    }
    if (e.kind !== 'touchoku') return false;
    switch (ev.t) {
      case 'say': if (d2(b.pos, P) < 18) { this.bark(ev.key, 2.4); this.sfx.play('outou_voice', b.pos); } return true;
      case 'telegraph': if (ev.name === 'steam') this.fx.decal('arc', b.pos.x, b.pos.z, { r: ev.def.range, arc: ev.def.arc, yaw: b.yaw, dur: ev.def.windup, hold: ev.def.active, color: 0xff3040 }); return false;
      case 'attack': {
        if (ev.name === 'steam') { this.sfx.play('steam', b.pos); for (let i = 0; i < 24; i++) { const a = b.yaw + (Math.random() - 0.5) * 1.2; this.fx.puff(b.pos.x + Math.sin(b.yaw) * 0.6, 1.6, b.pos.z + Math.cos(b.yaw) * 0.6, Math.sin(a) * 7, 0.4, Math.cos(a) * 7, 0xe8eef8, 1.1, 0.5); } }
        if (ev.name === 'wrench') this.sfx.play('swing_heavy', b.pos);
        if (ev.name === 'slam') { this.sfx.play('slam', b.pos); this.cam.shake(0.2, 0.3); this.fx.dust(ev.at || b.pos, 22); }
        this.resolveEnemyHit(e, ev.def, false, ev.at); this.metrics.touchokuAttacks6 = (this.metrics.touchokuAttacks6 || 0) + 1; return true;
      }
      case 'round': this.ui.toast('当直が P-2 の弁へ ── 背中ががら空き', 'weak', 1.6); this.metrics.rounds6 = (this.metrics.rounds6 || 0) + 1; if (!this.flags.round_bark6) { this.flags.round_bark6 = true; this.later(0.6, () => this.bark('touchoku_round_hint', 3)); } return true;
      case 'restarted': this.ui.toast('P-2 の弁を開けられた（当直が少し持ち直す）', 'weak', 1.6); this.sfx.play('steam', b.pos); this.metrics.restarts6 = (this.metrics.restarts6 || 0) + 1; return true;
      case 'steamed': this.ui.toast('蒸気で崩れた ── 点検表を渡す／施錠できる', 'parry', 1.8); this.sfx.play('broken', b.pos); this.cam.shake(0.15, 0.25); if (!this.flags.down_hint6) { this.flags.down_hint6 = true; this.hint('崩れている間：点検表を渡す（救う）・レンチを施錠（無力化）・叩く（2 倍）'); this.later(6, () => this.hint(null)); } return true;
      case 'broken': this.ui.toast('崩し ── 点検表を渡す／施錠できる', 'parry', 1.4); this.sfx.play('broken', b.pos); return true;
      case 'phase': this.ui.toast(ev.n === 1 ? '当直の巡回が速くなる' : '当直が必死になる', 'weak', 1.4); return true;
      case 'rescued': this.sfx.play('rescue'); this.resolve(e, 'rescue'); this.onBossResolved6s('rescue'); return true;
      case 'neutralized': this.resolve(e, 'neutralize'); this.onBossResolved6s('neutralize'); return true;
      case 'die': this.sfx.play('die', b.pos); this.fx.mist(new THREE.Vector3(b.pos.x, 0, b.pos.z), 80, e.h); this.resolve(e, 'kill'); e.fadeT = 0; if (this.lock === e) this.lock = null; this.onBossResolved6s('kill'); return true;
    }
    return false;
  },
  onBossResolved6s(how) {
    this.story.boss6 = how; this.ui.boss(null); this.hint(null); this.fx.clearDecals(); this.lock = null; this.metrics.bossTime6s = Math.round(this.playSec - (this.metrics.bossStart6s || this.playSec));
    if (how === 'rescue') this.later(0.4, () => this.bark('touchoku_rest', 3.2));
    this.later(how === 'kill' ? 1.8 : 1.6, () => this.playCutscene('cs06s_after'));
  },
  onDead6() {
    if (this.area.id === 'admin' && this.boss && this.boss.kind === 'touchoku' && this.boss.brain.alive && !this.boss.brain.resolution) { this.losses6 = (this.losses6 || 0) + 1; this.metrics.losses6 = this.losses6; if (this.losses6 >= 3) this.touchokuAssist6 = true; }
    if (this.area.id === 'avenue') { this.losses6a = (this.losses6a || 0) + 1; this.metrics.losses6a = this.losses6a; }
  },
  /** 当直の HUD */
  renderBoss6(dt) {
    const e = this.boss; if (!e || this.cut.active) return;
    if (e.kind === 'touchoku') {
      const b = e.brain; if (!b.alive || b.resolution || !e.root.visible || ['dormant', 'loop'].includes(b.state)) return;
      const st = b.state === 'down' ? '崩れている ── 点検表を渡す／施錠／2 倍' : b.state === 'round' ? 'P-2 の弁へ ── 背中ががら空き（1.5 倍）' : b.atk ? (b.def.attacks[b.atk.name].parryable ? '白：弾ける' : '赤：避ける') : '蒸気弁の線に誘う';
      this.ui.boss('当直（仮）', b.hp / b.hpMax, st, b.state === 'down' || b.state === 'round');
    }
    if (e.kind === 'nurikae') this.renderNurikae6(dt, e);
  },
  renderNurikae6(dt, e) {
    const m = e.model, H = this.halos, v = new THREE.Vector3();
    if (!e.bossHalos) e.bossHalos = { core: H.add([0, -50, 0], 8, 0xd060ff, 0), eyes: m.eyes.map(() => H.add([0, -50, 0], 2.0, 0xff8ad8, 0)) };
    if (e.riseT != null) { e.riseT += dt; const k = Math.min(1, e.riseT / 3.2); e.y = -14 * (1 - k * k * (3 - 2 * k)); if (k >= 1) e.riseT = null; }
    if (e.fadeT != null) { e.fadeT += dt; e.y = -Math.min(20, e.fadeT * e.fadeT * 3); if (e.fadeT > 3) e.root.visible = false; }
    const on = e.root.visible && e.brain.alive ? 1 : 0, open = e.brain.coreOpen;
    m.root.updateMatrixWorld(true);
    m.core.getWorldPosition(v); H.setPos(e.bossHalos.core, v.x, v.y, v.z); H.setK(e.bossHalos.core, on * (open ? 1.6 + Math.sin(this.playSec * 10) * 0.3 : 0.7));
    m.eyes.forEach((o, i) => { o.getWorldPosition(v); H.setPos(e.bossHalos.eyes[i], v.x, v.y, v.z); H.setK(e.bossHalos.eyes[i], on * (0.7 + Math.sin(this.playSec * 4 + i) * 0.25)); });
    if (this.giantMode && e.brain.alive && e.root.visible) {
      const b = e.brain, ph = b.atk ? (b.atk.name === 'feed' ? '「塗り替え」── 棟を狙っている：線の間に立つ／咆哮' : b.def.attacks[b.atk.name].parryable ? '白：咆哮で止める／跳躍で避ける' : '赤：跳躍で避ける') : b.coreOpen ? '胸の変圧器が開いている ── 2 倍' : ['', '速くなった', '暴れている'][b.phase];
      const bl = this.blocks6 || {};
      this.ui.boss('塗替（仮）', b.hp / b.hpMax, (ph ? ph + '　｜　' : '') + AVENUE.blocks.map(x => `${x.id}棟 ${bl[x.id] ?? 100}%`).join('・'), !!(b.atk && b.atk.name === 'feed'));
    }
  },
  /** 塗替の「塗り替え」の先：人の残る棟（一番近い・まだ塗られきっていない棟） */
  feedTarget6(boss) {
    const bl = this.blocks6 || {}, p = boss ? boss.brain.pos : { x: 0, z: 0 };
    const list = AVENUE.blocks.filter(b => (bl[b.id] ?? 100) > 10).sort((a, b) => Math.hypot(a.pos[0] - p.x, a.pos[1] - p.z) - Math.hypot(b.pos[0] - p.x, b.pos[1] - p.z));
    const t = list[(this.feedTurn6 = (this.feedTurn6 || 0) + 1) % Math.max(1, list.length)] || AVENUE.blocks[0];
    return { x: t.pos[0], z: t.pos[1], id: t.id };
  },
  /** 塗り替えの当たり（block：線の間に立って体で受けた） */
  feedHit6(L, block) {
    const tgt = AVENUE.blocks.slice().sort((a, b) => Math.hypot(a.pos[0] - L.to.x, a.pos[1] - L.to.z) - Math.hypot(b.pos[0] - L.to.x, b.pos[1] - L.to.z))[0];
    const bl = this.blocks6 || (this.blocks6 = {});
    if (block) { this.metrics.blockBlocks6 = (this.metrics.blockBlocks6 || 0) + 1; this.ui.toast(`体で受けた ── ${tgt.id} 棟は無事`, 'parry', 1.4); if (!this.flags.block_bark6) { this.flags.block_bark6 = true; this.bark('giant_block6', 2.4); } return; }
    bl[tgt.id] = Math.max(10, (bl[tgt.id] ?? 100) - 30); this.metrics.blockHits6 = (this.metrics.blockHits6 || 0) + 1;
    const D = this.area.dyn['block' + tgt.id]; if (D) { this.halos.setColor(D.halo, 0xd050ff); this.halos.setK(D.halo, 0.9); this.later(2.5, () => this.halos.setK(D.halo, 0)); }
    this.sfx.play('wave', { x: tgt.pos[0], z: tgt.pos[1] }); this.ui.toast(`${tgt.id} 棟が紫に塗られかけた！`, 'weak', 1.4);
  },
  onNurikaeDown6() {
    const e = this.boss; this.ui.boss(null); this.lock = null; this.metrics.bossTime6a = Math.round(this.playSec - (this.metrics.bossStart6a || this.playSec));
    this.story.boss6a = 'kill'; this.flags.nurikae_down = true;
    this.later(0.8, () => this.playCutscene('cs06a_boss_end'));
    void e;
  },

  // ── 演出の出来事（第6章） ──
  cineEvent6(name, arg) {
    const skip = this.cut.skipping;
    switch (name) {
      case 'toRuins6': this.later(skip ? 0 : 0.3, () => this.toRuins6()); return true;
      case 'giantGrowAv6': { if (!this.giantMode) this.enterGiant(!skip); const G = this.giant; G.pos = { x: AVENUE.giantStart[0], z: AVENUE.giantStart[1] }; G.yaw = AVENUE.giantStart[2]; G.rampK = 0; G.model.setRampage(0); this.lock = null; return true; }
      case 'bossRise6': { this.flags.boss6_risen = true; const e = this.boss && this.boss.kind === 'nurikae' ? this.boss : null; if (e) { e.root.visible = true; e.riseT = skip ? null : 0; e.y = skip ? 0 : -14; } return true; }
      case 'bossWake6': {
        const e = this.boss && this.boss.kind === 'nurikae' ? this.boss : null; if (!this.giantMode) this.enterGiant(false);
        this.giant.growT = null; this.giant.scale = COMBAT.giant.scale; this.giant.rampK = 0;
        if (e) { e.riseT = null; e.y = 0; e.root.visible = true; }
        this.saveSlot('auto', true);
        if (e) { e.brain.wake([]); this.lock = e; this.metrics.bossStart6a = this.playSec; }
        this.hint('妖爪連撃・紫の咆哮（白い予兆を止める）・跳躍・妖気放出。「塗り替え」は棟と塗替の線の間に立つと体で受けられる'); this.later(7, () => this.hint(null));
        return true;
      }
      case 'bossCollapse6': { const e = this.boss && this.boss.kind === 'nurikae' ? this.boss : null; if (e) { e.fadeT = skip ? 3.1 : 0; e.brain.state = 'dead'; if (skip) e.root.visible = false; } return true; }
      case 'pillarDim6': { const D = this.area.dyn; if (D.pillar) D.pillar.material.opacity = 0.12; for (const l of this.area.lights) if (/^blk/.test(l.id)) l.intensity = l.base * 1.3; return true; }
      case 'endCard6a': this.later(skip ? 0 : 0.3, () => this.showEndCard6a()); return true;
      case 'openMdoor6': this.openMdoor6(); return true;
      case 'expandDown6': return true;
      case 'companionHide6': { const C = this.companion; C.brain.setMode('scripted'); C.brain.pos = { x: 0, z: -4.4 }; C.brain.yaw = Math.PI; C.anim = null; return true; }
      case 'bossWake6s': {
        const e = this.boss && this.boss.kind === 'touchoku' ? this.boss : null; if (!e) return true;
        e.root.visible = true; if (e.brain.state === 'dormant') e.brain.state = 'loop'; e.brain.wake([]); this.lock = e; this.metrics.bossStart6s = this.playSec;
        this.companion.brain.setMode('scripted'); this.companion.brain.pos = { x: 0, z: -4.4 };
        this.saveSlot('auto', true);
        this.hint('紫の姿だけ：白い予兆は弾く・赤は避ける。蒸気弁（赤い輪）を開けて、線の中の当直を崩す'); this.later(7, () => this.hint(null));
        if (this.touchokuAssist6) this.ui.toast('手助け：当直の体力 −25%（記録に残るだけ）', 'weak', 2);
        return true;
      }
      case 'openCdoor6': { const C = this.area.dyn.cdoor; if (!C) return true; this.flags.cdoor6 = true; C.open = true; C.target = C.up; this.boxIn6(C.box, false); this.sfx.play('door', { x: 0, z: -26 }); return true; }
      case 'expandOff6': { this.flags.expandOff6 = true; const w = this.area.lights.find(l => l.id === 'warn'); if (w) w.off = true; this.halos.setK(this.area.dyn.warnHalo, 0); this.sfx.setAmbience('admin'); return true; }
      case 'screenOn6': { const D = this.area.dyn; D.screen.material.map = D.screenTex; D.screen.material.color.setHex(0xffffff); D.screen.material.needsUpdate = true; return true; }
      case 'screenOff6': { const D = this.area.dyn; D.screen.material.map = null; D.screen.material.color.setHex(0x1a0a2a); D.screen.material.needsUpdate = true; return true; }
      case 'endCard6s': this.later(skip ? 0 : 0.3, () => this.showEndCard6s()); return true;
    }
    return false;
  },

  // ── 終わりの表 ──
  showEndCard6a() {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice', 'ch4_slice', 'ch5a_slice', 'ch6a_slice'] });
    const bl = this.blocks6 || {}, rc = this.metrics.rampageCalm || {}, pe = this.metrics.protectEnd || {};
    const stats = [['プレイ時間', fmt(this.playSec)], ['ルート', '妖力解放（化けを、解いた）'], ['暴走（抑えた）', rc.sec ? `${rc.sec} 秒・呼ばれた ${rc.calls || 0} 回` : '—'], ['町を守る', `守った ${pe.saved || 0}・間に合わなかった ${pe.missed || 0}`],
      ['置換の糸', this.flags.relays6 ? `3 か所を元から切った（ちがう順 ${this.relayMiss6 || 0} 回）` : '—'], ['待人（バス停）', ({ rescue: '傘を渡した（救う）', neutralize: '時計を止めた', kill: '倒した' })[this.enemyRes.machibito_r] || '—'],
      ['塗替', this.enemyRes.nurikae === 'kill' ? '止めた' : '—'], ['人の残る棟', AVENUE.blocks.map(b => `${b.id} ${bl[b.id] ?? 100}%`).join('・') + `（体で受けた ${this.metrics.blockBlocks6 || 0}）`], ['任意の資料', ['damage', 'voice6a'].filter(k => this.flags['seen_' + k]).length + ' / 2']];
    this.metrics.endCard6a = true;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); }, '第6章A（巨躯）　ここまで', '最終章A（崩れた町・研究者の巨大な姿）は次の段階で作ります。「分岐の前」のセーブ（ロード）から、もう一方のルートも遊べます。');
  },
  showEndCard6s() {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice', 'ch4_slice', 'ch5b_slice', 'ch6b_slice'] });
    const stats = [['プレイ時間', fmt(this.playSec)], ['ルート', '正体秘匿（人として通した）'], ['時刻の矛盾', this.flags.mdoor6 ? `01:47 を割り出した（ちがう時刻 ${this.clockMiss6 || 0} 回）` : '—'],
      ['巡回点検', `${ROUNDS.machines.filter(m => this.flags['meas6_' + m.id]).length} / ${ROUNDS.machines.length} 台を測った・診断 ${this.flags.diag6 ? 'P-2（ちがう診断 ' + (this.diagMiss6 || 0) + ' 回）' : '—'}`], ['隔離の手順', this.flags.isolate6 ? `止めて・切って・締めて・抜く（やり直し ${this.lotoMiss6 || 0} 回）` : '—'],
      ['当直', ({ rescue: '救った（点検表を渡した）', neutralize: '動けなくした（レンチを施錠）', kill: '倒した' })[this.story.boss6] || '—'], ['待人（受付）', ({ rescue: '封筒を渡した（救う）', neutralize: '時計を止めた', kill: '倒した' })[this.enemyRes.machibito_1] || '—'],
      ['任意の資料', ['duty6', 'cover', 'rec6', 'log6'].filter(k => this.flags['seen_' + k]).length + ' / 4'], ['（相棒）の信頼', this.companion.brain.trust]];
    this.metrics.endCard6s = true;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); }, '第6章B（制御）　ここまで', '最終章B（記録の間・人間大の最終戦）は次の段階で作ります。「分岐の前」のセーブ（ロード）から、もう一方のルートも遊べます。');
  },

  // ── 試験・ショートカット（?ch=6&route=reveal|secret&at=…）の初期状態 ──
  jump6(step) {
    const rr = stepRoute(step), L = rr === 'reveal' ? R6_STEPS : S6_STEPS, i = L.indexOf(step);
    if (!rr || i < 0) return null;
    this.jump5(rr === 'reveal' ? 'ch6a_end' : 'ch5_s_end');
    const F = this.F(), f = this.flags;
    F.hp = F.hpMax;
    if (rr === 'reveal') {
      f.town6 = true; f.companion_injured = true; f.ruins6 = true; f.cs_cs06r_ruins = true; f.threads_seen6 = true;
      this.metrics.protectEnd = this.metrics.protectEnd || { saved: 5, missed: 0 };
      if (i >= 1) { f.relayCut6 = ['T', 'P', 'Y']; f.relays6 = true; }
      if (i >= 3) { this.enemyRes.nurikae = 'kill'; this.story.boss6a = 'kill'; }
    } else {
      f.ch6s_started = true;
      if (i >= 1) f.cs_cs06s_arrive = true;
      if (i >= 2) { f.mdoor6 = true; f.seen_clocks6 = true; }
      if (i >= 3) { for (const m of ROUNDS.machines) f['meas6_' + m.id] = true; f.diag6 = true; }
      if (i >= 4) { f.isolate6 = true; for (const o of ADMIN.roam) this.enemyRes[o.id] = 'escape'; }
      if (i >= 5) { this.enemyRes.touchoku = 'rescue'; this.story.boss6 = 'rescue'; f.cdoor6 = true; }
      if (i >= 6) { f.control6 = true; f.expandOff6 = true; }
    }
    const area = stepDef(step).area;
    const spawn = { ruins: 'south', avenue: 'giant', admin: i === 0 ? 'bridge' : i <= 1 ? 'hall' : i >= 5 ? 'control' : 'machine' }[area];
    return { area, spawn };
  },
  /** 読み込み・飛び先のあとの整え */
  afterLoad6(fromJump) {
    const s = this.story.step, A = this.area.id;
    if (A === 'town' && s === 'ch6a_end') { this.later(0.3, () => this.toRuins6()); return; }
    if (!CH6_AREAS.includes(A)) return;
    this.applyArea6();
    if (A === 'ruins' && s === 'ch6a_end') { if (this.flags.cs_cs06r_ruins) this.setStep('ch6a_threads'); else this.later(0.1, () => this.playCutscene('cs06r_ruins')); }
    if (A === 'ruins') { const F = this.F(); F.yokiOn = true; if (!F.white && fromJump) { F.yoki = Math.max(F.yoki, 90); this.setWhite(true, 'scripted'); } if (fromJump && s === 'ch6a_threads' && !this.flags.cs_cs06r_ruins) this.later(0.1, () => this.playCutscene('cs06r_ruins')); }
    if (A === 'avenue' && s === 'ch6a_fin') { if (this.giantMode) this.exitGiant(); return; }      // 終わり：白い姿（人の大きさ）のまま
    if (A === 'avenue') {
      if (!this.giantMode) this.enterGiant(false);
      const G = this.giant; G.growT = null; G.scale = COMBAT.giant.scale; G.rampK = 0; G.model.setRampage(0); G.pos = { x: AVENUE.giantStart[0], z: AVENUE.giantStart[1] }; G.yaw = AVENUE.giantStart[2];
      const e = this.boss && this.boss.kind === 'nurikae' ? this.boss : null;
      if (s === 'ch6a_boss' && e) { e.root.visible = true; e.brain.wake([]); this.lock = e; this.metrics.bossStart6a = this.playSec; }
      if (s === 'ch6a_avenue' && fromJump) this.later(0.1, () => this.playCutscene('cs06a_boss'));
    }
    if (A === 'admin') {
      const F = this.F(); F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted');
      if (fromJump && s === 'ch6_s_enter' && !this.flags.cs_cs06s_arrive) this.later(0.1, () => this.playCutscene('cs06s_arrive'));
      const e = this.boss && this.boss.kind === 'touchoku' ? this.boss : null;
      if (s === 'ch6_s_boss' && e) { e.root.visible = true; if (e.brain.state === 'dormant') e.brain.state = 'loop'; e.brain.wake([]); this.lock = e; this.metrics.bossStart6s = this.playSec; }
    }
  },
  /** 撮影・試験用：第6章の小さな API */
  debug6() {
    const g = this;
    return {
      relayOrder: () => relayOrder(), cut: () => (g.flags.relayCut6 || []).slice(),
      boss: () => { const e = g.boss; return e ? { kind: e.kind, state: e.brain.state, hp: e.brain.hp, hpMax: e.brain.hpMax, phase: e.brain.phase, resolution: e.brain.resolution, x: e.pos.x, z: e.pos.z, visible: e.root.visible, restarts: e.brain.restarts || 0 } : null; },
      blocks: () => Object.assign({}, g.blocks6 || {}),
      hitBoss: (dmg, poise) => { const e = g.boss; if (!e) return 0; if (e.kind === 'nurikae') { g.giantHitBoss(e, dmg, poise || 0); return 1; } return g.damageEnemy(e, dmg, 'slash', { poise: poise || 0 }); },
      steamBoss: () => { const e = g.boss; if (!e || e.kind !== 'touchoku') return false; const ev = []; const r = e.brain.steamed(ev); g.enemyEvents(e, ev); return r; },
      measure: id => { const m = ROUNDS.machines.find(q => q.id === id); g.finishMeasure6(m); return true; },
      slowK: () => g.slowZoneK(g.player.pos),
    };
  },
};

/** 測った値の文 */
function readingText(m) {
  const z = vibZone(m.vib), zn = { good: '良', warn: '注意', danger: '危険' }[z];
  return `${m.name}：振動 ${m.vib.toFixed(1)} mm/s（${zn}）・軸受 ${m.temp}℃・音「${m.sound}」。点検表の前回値 ${m.prev.toFixed(1)} mm/s。${m.note ? '　' + m.note : ''}`;
}
/** 監視カメラの小さな絵：廊下・巡回の人影・画面の奥の壁時計（CAM-3 は記録の時刻と壁時計がずれている） */
function drawCam6(c, g, w, h) {
  g.fillStyle = '#060a08'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3a5a46'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, h * 0.38); g.lineTo(i < 3 ? 0 : w, h * (0.2 + (i % 3) * 0.3)); g.stroke(); }
  g.fillStyle = '#1a2a20'; g.fillRect(w * 0.36, h * 0.22, w * 0.28, h * 0.32);
  if (c.who === '当直') { g.fillStyle = '#5a7a66'; g.fillRect(w * 0.47, h * 0.42, 12, 34); g.beginPath(); g.arc(w * 0.47 + 6, h * 0.38, 7, 0, 7); g.fill(); }
  if (c.wall !== '—') { const cx = w * 0.78, cy = h * 0.3; g.fillStyle = '#c8d8c8'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); const [hh, mm] = c.wall.split(':').map(Number); g.strokeStyle = '#102010'; g.lineWidth = 2; const am = mm / 60 * Math.PI * 2, ah = (hh % 12 + mm / 60) / 12 * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(am) * 12, cy - Math.cos(am) * 12); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ah) * 8, cy - Math.cos(ah) * 8); g.stroke(); }
  let a = c.id.charCodeAt(1) * 977; const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const im = g.getImageData(0, 0, w, h); for (let i = 0; i < im.data.length; i += 4) { const n = (rnd() - 0.5) * 36; im.data[i] += n; im.data[i + 1] += n * 1.2; im.data[i + 2] += n; } g.putImageData(im, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.4)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.fillStyle = '#c0ffc0'; g.font = '12px monospace'; g.fillText(`REC ● CAM-${c.id.slice(1)}  ${c.stamp}`, 6, 14);
}
export { drawCam6 };
