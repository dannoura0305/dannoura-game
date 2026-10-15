// 第5章（旧研究棟・観測棟）と第6章A の冒頭（暴走 → 我に返る → 守る）の実行。Game（main.js）のメソッドとして組み込む。
// ・第4章の終わりの表を閉じる → ルートで別の入口から旧研究棟へ（reveal：搬入ヤードの崩れた壁／secret：地下研究区画の連絡通路）。
// ・必須：点呼（被験者名簿か、鐘の時に戸口に立つ順の観察のどちらでも）・配偶者の延期の記録（reveal：主任研究室＝白い姿で崩れた床を跳ぶ／
//   secret：記録保管庫＝配電盤・封印の札を刀で切る・弁と排水ポンプで水を抜く）。任意：研究ノート・手紙・当番表・保全記録。
// ・観測棟の吹き抜けで継接（部分ごとに壊れる中ボス）：救う＝鞄を持ち主の机へ返す／無力化＝脚を壊す／倒す。
// ・reveal：屋上 → 広域計画 → 町へ → 巨大猫又の力があふれて抑えきれない（暴走）→（相棒）の声で我に返る → 守る → 第6章A の冒頭の終わり。
//   暴走の操作は「抑える」と移動だけ（combat/rampage.js。市民を攻撃する入力は無い・失敗の状態は無い）。
// ・secret：決着 → 研究者の放送（中央管理棟で待つ）→ 第5章B の終わり（町は壊れない）。
// ルートの記録（route / routeLock / branchLog）は第4章で確定したまま。ここでは書き換えない（ROUTE_BRANCH_SPEC）。
import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';
import { SUBJECTS, rollcallAnswer, checkRollcall, rollcallRooms, BREAKERS5, checkBreakers5, DOCS5, OLDWING, ATRIUM, RAMPAGE, PROTECT } from '../data/ch5.js';
import { Shuusha } from '../ai/shuusha.js';
import { Tsugihagi, sideOf } from '../ai/tsugihagi.js';
import { EnemyActor } from '../actor/actors.js';
import { buildShuusha, buildTsugihagi } from '../actor/models5.js';
import { shuushaPose, TsugiAnimator } from '../actor/anim5.js';
import { Rampage, Protect } from '../combat/rampage.js';
import { CHAPTERS, stepDef, stepRoute, R5_STEPS, S5_STEPS } from '../story/chapters.js';
import { TOWN } from '../world/areas6.js';
import { toon } from '../render/toon.js';

const DT = 1 / 60;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const CH5_AREAS = ['oldwing', 'atrium', 'town'];

export const ch5Methods = {
  // ── 第5章の始まり（第4章の終わりの表を閉じた後） ──
  startCh5() {
    if (this.flags.ch5_started) return;
    const rt = this.route.route; if (!rt) return;
    this.playEvent(rt === 'reveal' ? 'ev_ch5r_start' : 'ev_ch5s_start', () => {
      this.flags.ch5_started = true; this.flags.reunited = true;
      if (this.giantMode) this.exitGiant();
      const F = this.F(); F.hp = F.hpMax; if (rt === 'reveal') { F.yokiOn = true; F.yoki = Math.max(F.yoki, 90); } else { F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted'); }
      this.companion.brain.setMode('follow'); this.companion.root.visible = true;
      this.setStep(rt === 'reveal' ? 'ch5_r_enter' : 'ch5_s_enter');
      this.changeArea('oldwing', rt === 'reveal' ? 'gate' : 'tunnel');
    });
  },
  ch5Route() { return stepRoute(this.story.step); },
  onAreaEnter5(id) {
    const s = this.story.step;
    if (id === 'oldwing' && s === 'ch5_r_enter' && !this.flags.cs_cs05_r_arrive) this.later(0.1, () => this.playCutscene('cs05_r_arrive'));
    if (id === 'oldwing' && s === 'ch5_s_enter' && !this.flags.cs_cs05_s_arrive) this.later(0.1, () => this.playCutscene('cs05_s_arrive'));
    if (id === 'atrium' && s === 'ch5_r_gate') this.later(0.1, () => this.playCutscene('cs05_r_boss'));
    if (id === 'atrium' && s === 'ch5_s_gate') this.later(0.1, () => this.playCutscene('cs05_s_boss'));
    if (id === 'town' && s === 'ch5_r_end') this.later(0.1, () => this.playCutscene(this.flags.cs_cs05_r_roof ? 'cs06_rampage' : 'cs05_r_roof'));
    if (id === 'oldwing') this.applyRoute5();
  },
  /** 次の段（必須の出来事の進み具合から） */
  nextCh5Step() {
    const f = this.flags;
    if (this.ch5Route() === 'reveal') return !f.ow_gate ? 'ch5_r_ward' : !f.delay5 ? 'ch5_r_chief' : 'ch5_r_gate';
    if (!f.breaker5) return 'ch5_s_power';
    if (!f.ow_gate) return 'ch5_s_ward';
    return !f.delay5 ? 'ch5_s_archive' : 'ch5_s_gate';
  },
  /** 旧研究棟のルートごとの状態（崩れた床・電気・水・封印・戸・隔離扉） */
  applyRoute5() {
    if (this.area.id !== 'oldwing') return;
    const A = this.area, D = A.dyn, rv = this.ch5Route() === 'reveal', f = this.flags;
    const boxIn = (b, on) => { const i = A.boxes.indexOf(b); if (on && i < 0) A.boxes.push(b); if (!on && i >= 0) A.boxes.splice(i, 1); };
    // 崩れた床（reveal だけ）
    D.gap.on = rv; D.gap.pit.visible = rv; D.gap.edge.visible = rv; boxIn(D.gap.box, rv); this.halos.setK(D.gap.halo, rv ? 0.35 : 0);
    // 東の戸：reveal は崩れて開いている・secret は内側から鍵
    D.eastDoor.open = rv; D.eastDoor.mesh.visible = !rv; boxIn(D.eastDoor.box, !rv);
    // 電気：reveal はある・secret は配電盤まで非常灯だけ
    const power = rv || !!f.breaker5;
    for (const l of A.lights) { if (l.main) l.off = !rv; if (l.emergency) l.off = rv; if (l.id === 'con') l.off = !power; }
    for (const h of A.halos) if (h.emergencyHalo) h.off = rv;
    this.halos.setK(D.consoleHalo, power ? 0.5 : 0);
    this.darkness = rv ? 0 : 0.5;
    this.sfx.setAmbience(rv ? 'oldwing' : 'oldwing_dark');
    // 水（secret：排水するまで）
    const W = D.water; const dry = rv || !!f.drained5; W.drained = dry; W.target = dry ? -0.3 : 0.9; if (dry) { W.level = -0.3; W.mesh.visible = false; boxIn(W.box, false); } else { W.level = 0.9; W.mesh.visible = true; W.mesh.position.y = 0.9; boxIn(W.box, true); }
    // 封印
    const S = D.seal; S.cut = !!f.seal5; S.cards.visible = !S.cut; boxIn(S.box, !S.cut); S.door.rotation.y = S.cut ? 1.3 : 0; S.door.position.x = S.cut ? -13.4 : -11.9; this.halos.setK(S.halo, S.cut ? 0 : 0.35);
    // 隔離扉
    const G = D.gate; G.open = !!f.ow_gate; G.target = G.open ? G.up : G.down; G.mesh.position.y = G.target; boxIn(G.box, !G.open); this.halos.setColor(D.gateHalo, G.open ? 0x40ff80 : 0xff3030); const gh = A.halos[D.gateHalo]; if (gh) gh.hazard = !G.open;
    for (const [room, i] of Object.entries(D.doorLamps)) this.halos.setK(i, f.ow_gate ? 0.6 : 0);
    if (D.breakerHalo != null) this.halos.setK(D.breakerHalo, f.breaker5 ? 0.8 : rv ? 0 : 0.5);
    this.bellT = (this.bellT || 0); this.bellRooms = [];
  },

  // ── 区画の敵（収容者・模倣する影・応答体・継接） ──
  spawnCh5(id, add) {
    if (!CH5_AREAS.includes(id)) return false;
    const s = this.story.step, rv = this.ch5Route() === 'reveal';
    if (id === 'oldwing') {
      OLDWING.shuusha.forEach((o, i) => {
        const r = this.enemyRes[o.id]; if (r === 'kill') return;
        const sub = SUBJECTS.find(q => q.no === o.subject), [cx, cz] = OLDWING.rooms[sub.room], sx = Math.sign(cx);
        const door = { x: sx * 1.7, z: cz }, room = { x: cx + sx * 0.6, z: cz - 0.6 };
        const brain = new Shuusha({ id: o.id, pos: r === 'rescue' ? room : { x: o.path[0][0], z: o.path[0][1] }, path: o.path, subject: sub, door, room, seed: 31 + i * 7, state: r === 'rescue' ? 'rest' : 'loop' });
        if (r === 'rescue') { brain.resolution = 'rescue'; brain.yaw = -sx * Math.PI / 2; }
        const e = add(brain, buildShuusha(i + 1, sub.no)); e.poseFn = shuushaPose;
      });
      for (const o of rv ? OLDWING.reveal : OLDWING.secret) {
        if (this.enemyRes[o.id]) continue;
        if (o.kind === 'outou') this.addOutou(add, { id: o.id, pos: o.pos }, { path: o.path || null });
        else this.addMimic(add, { id: o.id, pos: o.pos, yaw: o.yaw || Math.PI, lure: 'mimic_lure_visitor' }, 'civilian');      // 廊下に立つ見舞い客の姿（近づくと崩れて影になる）
      }
      return true;
    }
    if (id === 'atrium') {
      const r = this.enemyRes.tsugihagi;
      if (!r) {
        const B = ATRIUM.boss, brain = new Tsugihagi({ id: B.id, pos: { x: B.pos[0], z: B.pos[1] }, home: B.home, seed: 61, assist: !!(this.flags.tsugi_assist || this.tsugiAssist5), state: 'dormant' });
        brain.yaw = 0;
        const m = buildTsugihagi(); m.anim = new TsugiAnimator(m);
        const e = add(brain, m); m.actorRef = e; e.poseFn = () => ({ pose: {}, rate: 0 }); e.r = 0.95; e.h = 3.3; this.boss = e;
      }
      this.bag5 = null; this.bagCarry = false;
      return true;
    }
    return true;                                                       // town：敵は置かない（逃げる人は区画の飾り）
  },
  /** （相棒）の置き場所（第5章・第6章A） */
  placeCompanion5(id) {
    if (!CH5_AREAS.includes(id)) return false;
    const C = this.companion, b = C.brain, s = this.story.step;
    C.root.visible = true; C.anim = null;
    if (id === 'atrium' && /_boss$/.test(s)) { b.setMode('scripted'); b.pos = { x: ATRIUM.watch[0], z: ATRIUM.watch[1] }; b.yaw = Math.PI * 1.25; return true; }
    if (id === 'town') { b.setMode('scripted'); b.pos = { x: TOWN.companion[0], z: TOWN.companion[1] }; b.yaw = -Math.PI * 0.9; C.anim = this.flags.companion_injured ? 'injured' : null; return true; }
    b.setMode('follow'); b.teleportBehind(this.player.pos, this.player.yaw);
    return true;
  },

  // ── 毎ステップ ──
  storyTick5() {
    const A = this.area.id, s = this.story.step;
    if (A === 'oldwing') {
      this.stepBell5(DT);
      const W = this.area.dyn.water; if (W.mesh.visible && W.level !== W.target) { W.level += Math.sign(W.target - W.level) * Math.min(Math.abs(W.target - W.level), DT * 0.25); W.mesh.position.y = W.level; if (W.level < 0.15 && !W.drained) { W.drained = true; const i = this.area.boxes.indexOf(W.box); if (i >= 0) this.area.boxes.splice(i, 1); this.flags.drained5 = true; this.ui.log('記録保管庫の水が引いた'); } if (W.level <= -0.25) W.mesh.visible = false; }
    }
    if (this.leap5) this.stepLeap5(DT);
    if (A === 'atrium' && this.bagCarry && this.bag5) { const P = this.player.pos; this.bag5.mesh.position.set(P.x + Math.sin(this.player.yaw + 1.2) * 0.35, 0.75, P.z + Math.cos(this.player.yaw + 1.2) * 0.35); this.bag5.mesh.rotation.y = this.player.yaw; }
    void s;
  },
  /** 点呼の鐘（電気がある間・点呼が終わるまで）：収容者は収容の古い順に戸口へ立つ（観察の手掛かり） */
  stepBell5(dt) {
    if (this.flags.ow_gate || (this.ch5Route() === 'secret' && !this.flags.breaker5)) return;
    this.bellT = (this.bellT || 0) + dt;
    if (this.bellT < OLDWING.bellEvery) return;
    this.bellT = 0; this.bellRooms = [];
    const ans = rollcallAnswer(); let n = 0;
    for (const e of this.enemies) if (e.kind === 'shuusha' && e.brain.alive && !e.brain.resolution) { const k = ans.indexOf(e.brain.subject.name); if (k >= 0 && e.brain.bell(k)) n++; }
    this.sfx.play('pa_chime', { x: 0, z: -20 }); this.metrics.bells5 = (this.metrics.bells5 || 0) + 1;
    if (n && !this.flags.bell_hint5) { this.flags.bell_hint5 = true; this.later(2.2, () => this.bark('ow_bell_hint', 3.2)); }
  },
  stepLeap5(dt) {
    const L = this.leap5, P = this.player; L.t += dt; const k = Math.min(1, L.t / L.dur), e = k * k * (3 - 2 * k);
    P.pos.x = L.from.x + (L.to.x - L.from.x) * e; P.pos.z = L.from.z + (L.to.z - L.from.z) * e; P.pos.y = Math.sin(k * Math.PI) * 1.6;
    P.yaw = Math.atan2(L.to.x - L.from.x, L.to.z - L.from.z);
    if (Math.random() < 0.6) this.fx.puff(P.pos.x, P.pos.y + 0.6, P.pos.z, 0, 0.2, 0, 0x9a5aff, 0.6, 0.4);
    if (k >= 1) { P.pos.y = 0; this.leap5 = null; this.sfx.play('land'); this.fx.dust(P.pos); }
  },

  // ── 調べる（第5章） ──
  useSpot5(s) {
    const T = this.events.texts || {}, rv = this.ch5Route() === 'reveal';
    switch (s.kind) {
      case 'rollcall5': if (!rv && !this.flags.breaker5) { this.sayText(T.ow_console_dark); return true; } if (this.flags.ow_gate) { this.sayText('点呼は終わっている。収容者たちは部屋で休んでいる。'); return true; } this.openRollcall5(); return true;
      case 'breaker5': if (rv) { this.sayText('配電盤。電気は来ている（応答炉が動いたまま）。'); return true; } this.openBreakers5(); return true;
      case 'seal5': if (rv) { this.sayText(T.ow_seal_reveal); return true; } this.cutSeal5(); return true;
      case 'valve5': if (rv) { this.sayText(T.ow_valve_reveal); return true; } this.openValve5(); return true;
      case 'eastdoor5': this.sayText(rv ? T.ow_east_open : T.ow_east_locked); return true;
      case 'leap5': this.tryLeap5(s); return true;
      case 'delay5': this.readDelay5(s); return true;
      case 'clue5': this.clue5(s.clue); return true;
      case 'bag5': this.pickBag5(); return true;
      case 'desk5': this.desk5(s.desk); return true;
      case 'stairs5': {
        const st = this.story.step;
        if (st === 'ch5_r_end') { this.toTown5(); return true; }
        if (st === 'ch5_s_end') { this.sayText('連絡橋の先に中央管理棟。……今夜はここまで（第6章B は次の段階）。'); return true; }
        this.sayText(T.stairs_wait); return true;
      }
    }
    if (s.kind === 'exit' && s.to === 'atrium' && this.area.id === 'oldwing' && this.flags.ow_gate && !this.flags.delay5) { this.sayText(T.ow_gate_delay); return true; }
    if (s.kind === 'exit' && s.to === 'oldwing' && this.area.id === 'atrium' && /_boss$/.test(this.story.step) && this.boss && this.boss.brain.alive && !this.boss.brain.resolution) { this.sayText('今は離れられない。'); return true; }
    return false;
  },
  /** 動く「調べる」の場所（落ちた鞄） */
  extraSpots5() {
    if (this.area.id !== 'atrium' || !this.bag5 || this.bagCarry || this.bag5.returned) return [];
    return [{ id: 'bag5', kind: 'bag5', x: this.bag5.x, z: this.bag5.z, r: 1.4, label: '落ちた鞄を拾う' }];
  },
  clue5(id) {
    const T = this.events.texts || {};
    this.flags['seen_' + id + (id.endsWith('5') ? '' : '5')] = true; this.metrics.puzzles['ch5_' + id] = true;
    if (id === 'roster') { this.addDoc(DOCS5.roster.id); this.sayText(T.roster_text + SUBJECTS.map(q => `${q.room}　${q.no}　${q.name}　収容 ${q.since}　${q.status}`).join('／')); return; }
    const doc = DOCS5[id]; if (doc) this.addDoc(doc.id);
    this.sayText(T[id + '_text'] || '……');
  },
  /** 点呼卓（必須）：在棟の人を収容の古い順に呼ぶ */
  openRollcall5() {
    this.mode = 'puzzle'; this.input.exitLock();
    const names = SUBJECTS.map(q => ({ room: q.room, name: q.name })), seq = this.rcSeq5 || (this.rcSeq5 = []);
    const notes = [];
    if (this.flags.seen_roster5) notes.push('名簿：' + SUBJECTS.map(q => `${q.name}（${q.since}・${q.status}）`).join('　'));
    if (this.flags.bell_rooms5) notes.push('鐘の時、戸口に立った順（部屋）：' + this.flags.bell_rooms5);
    if (!notes.length) notes.push('誰を、どの順に呼ぶ？（資料室の名簿／鐘が鳴った時に戸口に立つ順）');
    const redo = () => this.openRollcall5();
    this.ui.rollcallUI(names, seq, n => { if (!seq.includes(n)) seq.push(n); this.sfx.play('ui'); redo(); }, () => { seq.length = 0; redo(); }, () => {
      const r = checkRollcall(seq); this.metrics.rollcallTries5 = (this.metrics.rollcallTries5 || 0) + 1; this.sfx.play('pa_chime');
      if (r.ok) { this.ui.closePuzzle(); this.mode = 'play'; this.rcSeq5 = []; this.finishRollcall5(); return; }
      this.rcMiss5 = (this.rcMiss5 || 0) + 1; this.rcSeq5 = []; this.ui.closePuzzle(); this.mode = 'play'; this.sfx.play('ui_ng'); this.bark('ow_rollcall_wrong', 2.4);
      const P = this.player.pos, near = this.enemies.filter(e => e.kind === 'shuusha' && e.brain.alive && !e.brain.resolution).sort((a, b) => d2(a.pos, P) - d2(b.pos, P))[0];
      if (near) { const ev = []; near.brain.agitate(ev, P); this.enemyEvents(near, ev); this.sfx.play('shuusha_voice', near.pos); }
      this.ui.log(`……違う点呼（${({ absent: '在棟でない人を呼んだ', count: '人数が違う', order: '順番が違う' })[r.why]}）`);
    }, () => { this.ui.closePuzzle(); this.resume(); }, notes.join('\n'), this.rcMiss5 || 0);
  },
  finishRollcall5() {
    this.flags.ow_gate = true; this.metrics.puzzles.rollcall5 = true; this.metrics.rollcallMiss5 = this.rcMiss5 || 0;
    for (const e of this.enemies) if (e.kind === 'shuusha' && e.brain.alive && !e.brain.resolution) { const ev = []; e.brain.called(ev); this.enemyEvents(e, ev); }
    const G = this.area.dyn.gate; G.open = true; G.target = G.up; const i = this.area.boxes.indexOf(G.box); if (i >= 0) this.area.boxes.splice(i, 1);
    this.halos.setColor(this.area.dyn.gateHalo, 0x40ff80); const gh = this.area.halos[this.area.dyn.gateHalo]; if (gh) gh.hazard = false;
    for (const k of Object.values(this.area.dyn.doorLamps)) this.halos.setK(k, 0.6);
    this.sfx.play('door', { x: 0, z: -22 });
    this.playEvent('ev_rollcall_done', () => this.setStep(this.nextCh5Step()));
  },
  /** secret：配電盤（容量 4：点呼卓・隔離扉の錠・排水ポンプ。焼却炉は入れない） */
  openBreakers5() {
    if (this.flags.breaker5) { this.sayText('配電盤：点呼卓・隔離扉の錠・排水ポンプに電気が回っている。'); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    const on = new Set(this.breakerOn5 || []);
    this.ui.breakerUI(BREAKERS5, on, this.flags.seen_maint5, ids => {
      const r = checkBreakers5(ids); this.metrics.breakerTries5 = (this.metrics.breakerTries5 || 0) + 1; this.breakerOn5 = ids; this.sfx.play('breaker');
      if (r.ok) { setTimeout(() => this.finishBreakers5(), 250); return { ok: true, msg: `負荷 ${r.load}／${BREAKERS5.capacity}：点呼卓・隔離扉の錠・排水ポンプに電気が回った` }; }
      const need = { 'need:C': '点呼卓に電気が来ていない', 'need:G': '隔離扉の錠に電気が来ていない', 'need:P': '排水ポンプが動いていない' };
      const msg = r.why === 'forbid' ? '焼却炉に電気が回りかけた！　すぐ切った（収容者が騒ぐ）' : r.why === 'over' ? `負荷 ${r.load}／${BREAKERS5.capacity}：容量を超えて落ちた` : need[r.why];
      if (r.why === 'forbid') { this.sfx.play('alarm'); const P = this.player.pos; const near = this.enemies.filter(e => e.kind === 'shuusha' && e.brain.alive && !e.brain.resolution).sort((a, b) => d2(a.pos, P) - d2(b.pos, P))[0]; if (near) { const ev = []; near.brain.agitate(ev, P); this.enemyEvents(near, ev); } }
      return { ok: false, msg };
    }, () => { this.ui.closePuzzle(); this.resume(); });
  },
  finishBreakers5() {
    this.ui.closePuzzle(); this.mode = 'play'; this.flags.breaker5 = true; this.metrics.puzzles.breaker5 = true;
    const A = this.area; for (const l of A.lights) if (l.id === 'con' || l.id === 'docs' || l.id === 'elec') l.off = false;
    this.halos.setK(A.dyn.consoleHalo, 0.5); this.halos.setK(A.dyn.breakerHalo, 0.8); this.halos.setColor(A.dyn.breakerHalo, 0x60ff90);
    this.sfx.play('power_down'); this.bellT = OLDWING.bellEvery - 3;
    if (this.flags.valve5 && !this.flags.drained5) this.drain5();
    this.playEvent('ev_breaker5_done', () => this.setStep(this.nextCh5Step()));
  },
  /** secret：封印の札を刀で切る（紫の姿の技） */
  cutSeal5() {
    const T = this.events.texts || {}, D = this.area.dyn.seal;
    if (this.flags.seal5) { this.sayText(this.flags.drained5 ? T.ow_seal_cut : T.ow_seal_water); return; }
    const F = this.F(); if (!F.owned.includes('katana')) { this.sayText('札で封じられた戸。……刃物なら切れそうだ。'); return; }
    if (F.weapon !== 'katana') this.queueSwapTo('katana');
    this.flags.seal5 = true; this.metrics.puzzles.seal5 = true;
    this.player.yaw = 0; this.sfx.play('seal_cut'); this.ui.flash('issen'); this.ui.toast('一閃 ── 封印を切った', 'parry', 1.2);
    for (let i = 0; i < 18; i++) this.fx.puff(-13.6 + i * 0.2, 1.4 + Math.sin(i) * 0.4, 6.2, (Math.random() - 0.5) * 0.6, 0.6, 0.4, i % 2 ? 0xefe4c8 : 0xff6a5a, 0.5, 0.5);
    D.cut = true; D.cards.visible = false; const i = this.area.boxes.indexOf(D.box); if (i >= 0) this.area.boxes.splice(i, 1); D.door.rotation.y = 1.3; D.door.position.x = -13.4; this.halos.setK(D.halo, 0);
    this.later(0.6, () => this.sayText(this.flags.drained5 ? T.ow_seal_cut : T.ow_seal_water));
  },
  openValve5() {
    const T = this.events.texts || {};
    if (this.flags.valve5) { this.sayText(this.flags.drained5 ? T.ow_valve_done : this.flags.breaker5 ? T.ow_valve_drain : T.ow_valve_open); return; }
    this.flags.valve5 = true; this.sfx.play('steam'); this.metrics.puzzles.valve5 = true;
    if (this.flags.breaker5) { this.drain5(); this.sayText(T.ow_valve_drain); } else this.sayText(T.ow_valve_open);
  },
  drain5() { const W = this.area.dyn && this.area.dyn.water; if (!W) return; W.target = -0.3; this.sfx.play('water'); },
  /** reveal：崩れた床を白い姿で跳ぶ（近道。secret には別の道＝記録保管庫） */
  tryLeap5(s) {
    const T = this.events.texts || {};
    if (this.ch5Route() !== 'reveal') { this.sayText('床は無事だ。……でも、この先は鍵がかかっている。'); return; }
    if (!this.F().white) { this.sayText(T.ow_leap_need); this.metrics.leapRefused5 = (this.metrics.leapRefused5 || 0) + 1; return; }
    const P = this.player.pos; this.leap5 = { from: { x: P.x, z: P.z }, to: { x: s.to[0], z: s.to[1] }, t: 0, dur: 0.6 };
    this.F().invulnUntil = this.F().frame + 50; this.sfx.play('dash'); this.metrics.leaps5 = (this.metrics.leaps5 || 0) + 1;
  },
  /** 延期の記録（必須）：reveal＝主任研究室の原本・secret＝記録保管庫の控え */
  readDelay5(s) {
    const T = this.events.texts || {}, rv = this.ch5Route() === 'reveal';
    if (this.flags.delay5) { this.sayText(T.ow_delay_done); return; }
    if ((rv && s.where !== 'chief') || (!rv && s.where !== 'archive')) { this.sayText('記録の棚。……探している綴りは、ここには無い。'); return; }
    this.flags.delay5 = true; this.flags.delay5_where = s.where; this.addDoc(DOCS5.delay.id); this.metrics.puzzles.delay5 = true;
    this.playCutscene(rv ? 'cs05_delay_r' : 'cs05_delay_s');
  },
  afterDelay5() { this.setStep(this.nextCh5Step()); if (this.ch5Route() === 'secret') this.companion.brain.setMode('follow'); },

  // ── 継接（第5章のボス） ──
  /** 敵の出来事のうち、第5章の物（収容者・継接）。扱ったら true */
  enemyEvents5(e, ev) {
    const b = e.brain, P = this.player.pos;
    if (e.kind === 'shuusha') {
      if (ev.t === 'atDoor') { const k = this.area.dyn.doorLamps && this.area.dyn.doorLamps[ev.room]; if (k != null) { this.halos.setK(k, 1.0); this.later(6, () => { if (!this.flags.ow_gate) this.halos.setK(k, 0); }); } (this.bellRooms = this.bellRooms || []).push(ev.room); this.flags.bell_rooms5 = this.bellRooms.join(' → '); this.metrics.bellDoors5 = (this.metrics.bellDoors5 || 0) + 1; return true; }
      if (ev.t === 'bellEnd') return true;
      if (ev.t === 'say') { if (d2(b.pos, P) < 9) { this.bark(ev.key, 2.2); this.sfx.play('shuusha_voice', b.pos); } return true; }
      if (ev.t === 'rescued') { this.sfx.play('rescue', b.pos); this.resolve(e, 'rescue'); return true; }
      return false;
    }
    if (e.kind !== 'tsugihagi') return false;
    switch (ev.t) {
      case 'say': if (d2(b.pos, P) < 16) { this.bark(ev.key, 2.2); this.sfx.play('knock', b.pos); } return true;
      case 'attack': this.tsugiAttack5(e, ev); return true;
      case 'partHit': if (ev.hp <= 0) return true; this.metrics.partHits5 = (this.metrics.partHits5 || 0) + 1; return true;
      case 'partBroken': {
        const bn = { right: e.model.names.R[1], left: e.model.names.L[1], legs: 'tLegs' }[ev.part], v = new THREE.Vector3(); e.model.G[bn].getWorldPosition(v);
        this.fx.mist(v, 60, 1.6); this.sfx.play('broken', b.pos); this.cam.shake(0.18, 0.3);
        this.ui.toast({ right: '右腕が崩れた', left: '左腕がほどけた', legs: '脚が崩れた ── 動けない' }[ev.part], 'parry', 1.4);
        if (ev.part !== 'legs') this.bark('tsugi_part_' + ev.part, 2.4);
        (this.metrics.partsBroken5 = this.metrics.partsBroken5 || []).push(ev.part); return true;
      }
      case 'bagDrop': this.dropBagAt5(ev.at); return true;
      case 'phase': this.ui.toast(ev.n === 1 ? '継接が叫び始めた' : '継接が必死になる', 'weak', 1.4); this.sfx.play('tsugi_voice', b.pos); return true;
      case 'rescued': this.sfx.play('rescue'); this.resolve(e, 'rescue'); this.onBossResolved5('rescue'); return true;
      case 'neutralized': this.resolve(e, 'neutralize'); this.onBossResolved5('neutralize'); return true;
      case 'die': this.sfx.play('die', b.pos); this.fx.mist(new THREE.Vector3(b.pos.x, 0, b.pos.z), 90, e.h); this.resolve(e, 'kill'); e.fadeT = 0; if (this.lock === e) this.lock = null; this.onBossResolved5('kill'); return true;
    }
    return false;
  },
  tsugiAttack5(e, ev) {
    const b = e.brain, r = this.resolveEnemyHit(e, ev.def, false, ev.at);
    if (ev.name === 'knock' || ev.name === 'stomp') { this.sfx.play('slam', ev.at || b.pos); this.cam.shake(0.2, 0.3); const p = ev.at || { x: b.pos.x + Math.sin(b.yaw) * 2.4, z: b.pos.z + Math.cos(b.yaw) * 2.4 }; this.fx.dust(p, 20); }
    if (ev.name === 'thrash' || ev.name === 'cry') { this.sfx.play(ev.name === 'cry' ? 'tsugi_voice' : 'swing_heavy', b.pos); this.cam.shake(0.15, 0.3); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; this.fx.puff(b.pos.x + Math.sin(a) * 1.2, 1.0, b.pos.z + Math.cos(a) * 1.2, Math.sin(a) * 3, 0.3, Math.cos(a) * 3, 0x6a3aa8, 0.7, 0.5); } }
    if (ev.name === 'embrace' && r === 'hit' && this.bagCarry) { this.bagCarry = false; const P = this.player.pos; const at = { x: P.x + (Math.random() - 0.5) * 2, z: P.z + 1.5 }; b.bagLost(at); this.bag5.x = at.x; this.bag5.z = at.z; this.bag5.mesh.position.set(at.x, 0.15, at.z); this.bark('tsugi_bag_lost', 2.2); }
    this.metrics.tsugiAttacks5 = (this.metrics.tsugiAttacks5 || 0) + 1;
  },
  dropBagAt5(at) {
    const p = { x: Math.max(-12, Math.min(12, at.x)), z: Math.max(-15, Math.min(7, at.z)) };
    if (!this.bag5) {
      const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.12), toon(0x4a3226)); m.castShadow = true; g.add(m);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), toon(0x2a1c14)); h.position.y = 0.17; g.add(h);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.005), toon(0xf0e8d8)); tag.position.set(0.12, -0.02, 0.065); g.add(tag);
      this.scene.add(g); this.bag5 = { mesh: g, x: p.x, z: p.z, halo: this.halos.add([p.x, 0.4, p.z], 1.0, 0xffd8a0, 0.6) };
    }
    this.bag5.x = p.x; this.bag5.z = p.z; this.bag5.mesh.position.set(p.x, 0.15, p.z); this.bag5.mesh.visible = true;
    this.halos.setPos(this.bag5.halo, p.x, 0.4, p.z); this.halos.setK(this.bag5.halo, 0.6);
    this.bark('tsugi_bag', 2.4); this.sfx.play('pickup', p); this.metrics.bagDrops5 = (this.metrics.bagDrops5 || 0) + 1;
    if (!this.flags.bag_hint5) { this.flags.bag_hint5 = true; this.hint('落ちた鞄：拾って（調べる）、持ち主の机へ返せる（鞄の札・当番表）'); this.later(5, () => this.hint(null)); }
  },
  pickBag5() {
    if (!this.bag5 || this.bagCarry) return;
    const e = this.boss; if (e && e.kind === 'tsugihagi') e.brain.bagTaken();
    this.bagCarry = true; this.halos.setK(this.bag5.halo, 0); this.sfx.play('pickup'); this.metrics.bagPicked5 = true;
    if (!this.flags.bag_tag5) { this.flags.bag_tag5 = true; this.sayText((this.events.texts || {}).bag_tag); } else this.ui.log('鞄を持った（机 B へ）');
  },
  desk5(k) {
    const T = this.events.texts || {};
    if (!this.bagCarry) { this.sayText(T.desk_idle + (k === ATRIUM.bagOwner ? '（B）。主任研究員の机。' : '')); return; }
    if (k !== ATRIUM.bagOwner) { this.sayText(T.desk_wrong); this.metrics.deskWrong5 = (this.metrics.deskWrong5 || 0) + 1; return; }
    const e = this.boss; this.bagCarry = false; const [x, z] = ATRIUM.desks[k];
    this.bag5.returned = true; this.bag5.mesh.position.set(x + 0.3, 0.92, z); this.bag5.mesh.rotation.y = 0.2;
    if (e && e.kind === 'tsugihagi' && e.brain.alive && !e.brain.resolution) { const ev = []; e.brain.returnBag(ev); this.enemyEvents(e, ev); this.playEvent('ev_bag_returned'); }
  },
  onBossResolved5(how) {
    this.story.boss5 = how; this.ui.boss(null); this.hint(null); this.fx.clearDecals(); this.lock = null; this.metrics.bossTime5 = Math.round(this.playSec - (this.metrics.bossStart5 || this.playSec));
    this.later(how === 'kill' ? 1.6 : 1.2, () => this.playCutscene(this.ch5Route() === 'reveal' ? 'cs05_r_after' : 'cs05_s_after'));
  },
  /** 継接の HUD・崩れ */
  renderBoss5(dt) {
    const e = this.boss && this.boss.kind === 'tsugihagi' ? this.boss : null; if (!e) return;
    const b = e.brain;
    if (e.collapse5 != null) { e.collapse5 += dt; e.setDissolve(Math.min(1, e.collapse5 / 2.4)); if (e.collapse5 > 2.5) e.root.visible = false; }
    if (!b.alive || b.resolution || this.cut.active || !e.root.visible || ['dormant', 'loop'].includes(b.state)) return;
    const P = b.parts, mk = (n, p, x) => `${n}${p.alive ? '●' : '×'}${x || ''}`;
    const st = b.state === 'down' ? '崩れている ── 脚を狙える' : b.bag !== 'held' && !this.bagCarry && this.bag5 && !this.bag5.returned ? '鞄が落ちた ── 拾って持ち主の机へ' : this.bagCarry ? '鞄を持っている ── 机 B へ' : '';
    this.ui.boss('継接（仮）', b.hp / b.hpMax, [mk('右腕', P.right), mk('左腕', P.left, b.bag === 'held' ? '（鞄）' : ''), mk('脚', P.legs)].join('・') + (st ? '　｜　' + st : ''), b.state === 'down' || (!!this.bag5 && !this.bagCarry && !this.bag5.returned));
  },
  onDead5() {
    if (this.area.id !== 'atrium' || !this.boss || this.boss.kind !== 'tsugihagi' || !this.boss.brain.alive || this.boss.brain.resolution) return false;
    this.losses5 = (this.losses5 || 0) + 1; this.metrics.losses5 = this.losses5;
    if (this.losses5 >= 3) this.tsugiAssist5 = true;
    return false;
  },

  // ── 演出の出来事（第5章・第6章A） ──
  cineEvent5(name, arg) {
    const skip = this.cut.skipping;
    switch (name) {
      case 'afterDelay5': this.afterDelay5(); return true;
      case 'companionWatch5': { const C = this.companion; C.root.visible = true; C.brain.setMode('scripted'); C.brain.pos = { x: ATRIUM.watch[0], z: ATRIUM.watch[1] }; C.brain.yaw = Math.PI * 1.25; C.anim = null; return true; }
      case 'bossWake5': {
        const e = this.boss; if (!e || e.kind !== 'tsugihagi') return true;
        e.root.visible = true; if (e.brain.state === 'dormant') e.brain.state = 'loop'; e.brain.wake([]); this.lock = e; this.metrics.bossStart5 = this.playSec;
        this.saveSlot('auto', true);
        this.hint(this.ch5Route() === 'reveal' ? '右・左から叩くと腕、崩れた時は脚に入る。白い予兆は弾く・赤は避ける' : '紫の姿だけ：右・左から叩くと腕、崩れた時は脚。白い予兆は弾く・赤は避ける'); this.later(6, () => this.hint(null));
        if (this.tsugiAssist5) this.ui.toast('手助け：継接の体力 −25%（記録に残るだけ）', 'weak', 2);
        return true;
      }
      case 'tsugiCollapse': { const e = this.boss; if (e && e.kind === 'tsugihagi') { e.collapse5 = skip ? 2.6 : 0; if (skip) e.root.visible = false; } this.companion.brain.setMode('follow'); return true; }
      case 'endCard5': this.later(skip ? 0 : 0.3, () => this.showEndCard5(arg)); return true;
      case 'toTown': this.toTown5(); return true;
      case 'rampageIntro': this.later(0.2, () => this.playCutscene('cs06_rampage')); return true;
      case 'giantGrow6': { if (!this.giantMode) this.enterGiant(!skip); const G = this.giant; G.pos = { x: TOWN.giantStart[0], z: TOWN.giantStart[1] }; G.yaw = TOWN.giantStart[2]; G.rampK = 0; this.lock = null; return true; }
      case 'giantRampK': { const G = this.giant; if (G) { G.rampK = arg; G.model.setRampage(arg); } return true; }
      case 'rampageStart': this.rampageStart5(); return true;
      case 'giantPose6': { const G = this.giant; if (G) { G.pos = { x: arg.x, z: arg.z }; G.yaw = arg.yaw; G.lurch = null; G.pst = null; } return true; }
      case 'debrisNearCompanion': { const [x, z] = TOWN.companion; for (let i = 0; i < 16; i++) this.fx.puff(x - 1 + Math.random() * 2, 2 + Math.random() * 3, z - 2 + Math.random() * 2, (Math.random() - 0.5) * 2, -3, (Math.random() - 0.5) * 2, 0x6a6470, 1.2, 0.5); const p = (this.area.dyn.props || []).filter(q => q.alive && q.kind === 'sign').sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0]; if (p) this.damageProp(p, 999, 'rampage'); this.cam.shake(0.2, 0.3); return true; }
      case 'companionInjured': this.flags.companion_injured = true; this.companion.anim = 'injured'; return true;
      case 'rampageResume': return true;
      case 'poleCatch': {                                              // 倒れかけた電柱を尾で支える（最初の「守る」動き）
        const G = this.giant, [x, z] = TOWN.companion; if (G) { G.pst = { name: 'tailSweep', f: 0 }; G.pos.x = x - 2; G.pos.z = z - 12; G.yaw = 0.15; }
        if (!this.leanPole) { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 9, 8), toon(0x6a6460)); m.position.y = 4.5; g.add(m); const a = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), toon(0x4a4440)); a.position.y = 8.4; g.add(a); this.scene.add(g); this.leanPole = g; }
        this.leanPole.position.set(x + 2.6, 0, z - 4); this.leanPole.rotation.set(0.5, 0, 0.35); this.leanPole.visible = true;
        this.sfx.play('giant_step'); this.cam.shake(0.15, 0.3); this.companion.anim = 'injured'; return true;
      }
      case 'protectStart': this.protectStart5(); return true;
      case 'endCard6': this.later(skip ? 0 : 0.3, () => this.showEndCard6()); return true;
    }
    return false;
  },

  // ── 第6章A の冒頭：町へ・暴走・守る ──
  toTown5() { this.flags.town6 = true; this.changeArea('town', 'giant'); },
  rampageStart5() {
    if (!this.giantMode) { this.enterGiant(false); const G = this.giant; G.pos = { x: TOWN.giantStart[0], z: TOWN.giantStart[1] }; G.yaw = TOWN.giantStart[2]; }
    const G = this.giant; G.growT = null; G.scale = COMBAT.giant.scale; G.fighter.hp = G.fighter.hpMax; G.rampK = 1; G.model.setRampage(1); G.pst = { name: 'rampage', f: 0 }; G.lurch = null;
    this.cam.yaw = G.yaw + Math.PI; this.cam.pitch = 0.22;                       // 背中の後ろから（町と相棒が前に見える）
    this.rampage = new Rampage({ mode: this.settings.rampageInput || 'hold', seed: 77 }); this.protect = null; this.lock = null;
    this.ui.root.classList.add('rampage'); this.rampOverlay(true);
    const C = this.companion; C.root.visible = true; C.brain.setMode('scripted'); C.brain.pos = { x: TOWN.companion[0], z: TOWN.companion[1] }; C.brain.yaw = -Math.PI * 0.9; C.anim = this.flags.companion_injured ? 'injured' : null;
    this.metrics.rampageStart6 = this.playSec; this.metrics.rampageAttackIgnored = 0;
    this.hint('……抑える：化を長押し（V／LB＋RB／化）・弾の連打（F／LB／弾）でも。攻撃はできない'); this.later(7, () => this.hint(null));
    this.later(1.0, () => this.bark('rampage_strain', 2.6));
  },
  rampOverlay(on) {
    if (on && !this.rampEl) { const d = document.createElement('div'); d.className = 'sh-rampage'; this.ui.root.appendChild(d); this.rampEl = d; }
    if (this.rampEl) this.rampEl.style.display = on ? '' : 'none';
  },
  /** 暴走中の 1 ステップ：使える入力は「移動・抑える」だけ（攻撃の入力は読まない＝市民を攻撃する操作は無い） */
  stepRampage5(I) {
    const R = this.rampage, G = this.giant;
    if (I.attack || I.heavy) this.metrics.rampageAttackIgnored = (this.metrics.rampageAttackIgnored || 0) + 1;
    const evs = R.tick(DT, { moveX: I.moveX, moveY: I.moveY, suppressHeld: !!I.transform, suppressPress: !!I.parry });
    if (I.transform && this.frame % 20 === 0) this.sfx.play('suppress');
    // 移動：体が重い（抑えるほど言うことを聞く）・勝手に踏み出す
    const fw = this.cam.forward(), rt = { x: -fw.z, z: fw.x }, mx = fw.x * I.moveY + rt.x * I.moveX, mz = fw.z * I.moveY + rt.z * I.moveX, mag = Math.min(1, Math.hypot(mx, mz));
    const before = { x: G.pos.x, z: G.pos.z };
    if (mag > 0.05) { const sp = COMBAT.giant.speed.walk * (0.25 + 0.6 * R.suppress); G.pos.x += mx / mag * sp * DT; G.pos.z += mz / mag * sp * DT; G.yaw += wrap(Math.atan2(mx, mz) - G.yaw) * 0.05; }
    if (G.lurch) { const L = G.lurch; L.t += DT; const k = Math.min(1, L.t / 0.7), v = L.dist / 0.7 * DT * (1 - k * 0.5); G.pos.x += L.dir.x * v; G.pos.z += L.dir.z * v; G.yaw += wrap(Math.atan2(L.dir.x, L.dir.z) - G.yaw) * 0.08; if (k >= 1) G.lurch = null; }
    for (const ev of evs) {
      this.metrics.events.push({ t: 'r_' + ev.t, frame: this.frame });
      if (ev.t === 'lurch') {
        G.lurch = { dir: ev.dir, dist: ev.dist, t: 0 }; this.sfx.play('rampage_pulse'); this.sfx.play('giant_step'); this.cam.shake(0.18 + ev.k * 0.2, 0.35);
        let n = ev.wreck; for (const p of (this.area.dyn.props || []).filter(q => q.alive).sort((a, b) => d2(a, G.pos) - d2(b, G.pos))) { if (n <= 0 || d2(p, G.pos) > 12) break; this.damageProp(p, 999, 'rampage'); n--; }
        G.pst = { name: 'rampage', f: 0 };
      }
      if (ev.t === 'injury') this.later(0.2, () => this.playCutscene('cs06_injury'));
      if (ev.t === 'call') { this.bark('rampage_call_' + Math.min(4, ev.n), 2.6); this.companion.anim = 'call'; this.later(2.4, () => { if (this.rampage && !this.rampage.calm) this.companion.anim = 'injured'; }); if (ev.n === 3) this.later(2.8, () => this.bark('rampage_anchor', 3.6)); this.metrics.rampageCalls = ev.n; }
      if (ev.t === 'calm') { this.metrics.rampageCalm = { by: ev.by, sec: Math.round(R.t), calls: R.calls, suppress: +R.suppress.toFixed(2), wreck: R.damage, lurches: R.lurches }; this.ui.boss(null); this.hint(null); this.later(0.4, () => this.playCutscene('cs06_calm')); }
    }
    const props = (this.area.dyn.props || []).filter(p => p.alive && (p.kind === 'roof' || p.kind === 'pole'));
    for (const p of props) { const d = d2(G.pos, p), min = COMBAT.giant.r * 0.7 + p.r; if (d < min) this.damageProp(p, 999, 'step'); }
    const Bd = this.area.bounds, Cr = COMBAT.giant.r; G.pos.x = Math.max(Bd.minX + Cr, Math.min(Bd.maxX - Cr, G.pos.x)); G.pos.z = Math.max(Bd.minZ + Cr, Math.min(Bd.maxZ - Cr, G.pos.z));
    const moved = d2(G.pos, before); G.speed = moved / DT; const prevPh = G.phase; G.phase += moved * 0.42;
    if (moved > 0.01 && Math.floor(prevPh / Math.PI) !== Math.floor(G.phase / Math.PI)) { this.sfx.play('giant_step'); this.cam.shake(0.05, 0.12); this.fx.dust({ x: G.pos.x, z: G.pos.z }, 6); }
    G.rampK = R.k; G.model.setRampage(R.k); if (G.pst) G.pst.f++;
    if (this.rampEl) this.rampEl.style.opacity = (R.distortion * 0.75).toFixed(3);
    this.player.pos.set(G.pos.x, 0, G.pos.z); this.player.yaw = G.yaw;
  },
  protectStart5() {
    const G = this.giant; if (!G) { this.enterGiant(false); }
    const g = this.giant; g.rampK = 0; g.model.setRampage(0); g.pst = null; g.lurch = null;
    if (this.rampage) this.rampage.calm = true;
    this.protect = new Protect(); this.protectFx = {}; if (this.leanPole) this.later(4, () => { if (this.leanPole) this.leanPole.visible = false; }); this.ui.root.classList.remove('rampage'); this.rampOverlay(false);
    this.companion.anim = 'injured'; this.flags.companion_injured = true;
    this.hint('守る：電柱・看板＝尾で払う（攻撃）／瓦礫＝体で受ける（弾く）／バス＝前足で運ぶ（調べる）。光る円の中で'); this.later(7, () => this.hint(null));
    this.metrics.protectStart6 = this.playSec;
  },
  /** 守る：巨大猫又の移動と、守る動き（尾で払う・体で受ける・前足で運ぶ）。市民を攻撃する動きは無い（守る側の当たりだけ） */
  stepProtect5(I) {
    const G = this.giant, Pr = this.protect;
    const fw = this.cam.forward(), rt = { x: -fw.z, z: fw.x }, mx = fw.x * I.moveY + rt.x * I.moveX, mz = fw.z * I.moveY + rt.z * I.moveX, mag = Math.min(1, Math.hypot(mx, mz));
    const before = { x: G.pos.x, z: G.pos.z };
    if (!G.pst && !Pr.done) { if (I.attack) G.pst = { name: 'tailSweep', f: 0, at: 14, dur: 34 }; else if (I.parry) G.pst = { name: 'shield', f: 0, at: 6, dur: 30 }; else if (I.interact) G.pst = { name: 'lift', f: 0, at: 24, dur: 56 }; if (G.pst) this.sfx.play(G.pst.name === 'shield' ? 'guard' : 'giant_claw'); }
    if (G.pst && G.pst.dur) {
      G.pst.f++;
      if (G.pst.f === G.pst.at) {
        const h = Pr.act(G.pst.name, G.pos);
        if (h) { this.protectSaved5(h); }
        else { const w = Pr.active().find(x => Math.hypot(G.pos.x - x.at[0], G.pos.z - x.at[1]) <= x.r); if (w) this.ui.toast({ pole: '電柱は尾で払う（攻撃）', sign: '看板は尾で払う（攻撃）', debris: '瓦礫は体で受ける（弾く）', bus: 'バスは前足で運ぶ（調べる）' }[w.kind], 'weak', 1.2); }
        if (G.pst.name === 'tailSweep') for (let i = 0; i < 14; i++) { const a = G.yaw + Math.PI + (i / 13 - 0.5) * 2.4; this.fx.puff(G.pos.x + Math.sin(a) * 9, 3, G.pos.z + Math.cos(a) * 9, Math.sin(a) * 4, 1, Math.cos(a) * 4, 0xb070ff, 0.7, 0.5); }
      }
      if (G.pst.f >= G.pst.dur) G.pst = null;
    } else if (mag > 0.05) { const sp = (I.run ? COMBAT.giant.speed.run : COMBAT.giant.speed.walk) * mag; G.pos.x += mx / mag * sp * DT; G.pos.z += mz / mag * sp * DT; G.yaw += wrap(Math.atan2(mx, mz) - G.yaw) * 0.12; }
    for (const ev of Pr.tick(DT)) this.protectEvent5(ev);
    const Bd = this.area.bounds, Cr = COMBAT.giant.r; G.pos.x = Math.max(Bd.minX + Cr, Math.min(Bd.maxX - Cr, G.pos.x)); G.pos.z = Math.max(Bd.minZ + Cr, Math.min(Bd.maxZ - Cr, G.pos.z));
    const moved = d2(G.pos, before); G.speed = moved / DT; const prevPh = G.phase; G.phase += moved * 0.42;
    if (moved > 0.01 && Math.floor(prevPh / Math.PI) !== Math.floor(G.phase / Math.PI)) { this.sfx.play('giant_step'); this.cam.shake(0.05, 0.12); }
    const act = Pr.active(), near = act.sort((a, b) => Math.hypot(G.pos.x - a.at[0], G.pos.z - a.at[1]) - Math.hypot(G.pos.x - b.at[0], G.pos.z - b.at[1]))[0];
    this.ui.boss('町を守る', (Pr.saved + Pr.missed) / Pr.list.length, `守った ${Pr.saved}・間に合わなかった ${Pr.missed}` + (near ? `　｜　${({ pole: '倒れる電柱', sign: '落ちる看板', debris: '崩れる瓦礫', bus: '足場の崩れるバス' })[near.kind]}：残り ${Math.max(0, near.left).toFixed(1)} 秒` : ''), !!near);
    this.player.pos.set(G.pos.x, 0, G.pos.z); this.player.yaw = G.yaw;
  },
  protectSaved5(h) {
    const G = this.giant; this.metrics.protectSaved = (this.metrics.protectSaved || 0) + 1; (this.metrics.protectActs = this.metrics.protectActs || []).push(h.kind);
    this.sfx.play(h.kind === 'debris' ? 'parry' : 'hit_heavy'); this.cam.shake(0.15, 0.25); this.ui.toast({ pole: '尾で払った ── 守った', sign: '尾で払った ── 守った', debris: '体で受けた ── 守った', bus: 'バスを運んだ ── 守った' }[h.kind], 'parry', 1.4);
    if (!this.flags.protect_saved_bark) { this.flags.protect_saved_bark = true; this.bark('protect_saved', 2); }
    const fx = this.protectFx[h.id]; if (fx) { fx.saved = true; fx.t = 0; }
    if (h.kind === 'bus') { const B = this.area.dyn.bus; B.lifted = true; B.liftT = 0; }
    void G;
  },
  protectEvent5(ev) {
    const h = ev.h;
    if (ev.t === 'warn') {
      this.fx.decal('circle', h.at[0], h.at[1], { r: h.r, dur: h.warn, hold: 0.2, color: 0xffffff });
      this.sfx.play(h.kind === 'debris' ? 'rumble' : 'prop_break', { x: h.at[0], z: h.at[1] });
      this.protectFx[h.id] = this.makeHazard5(h);
      this.ui.toast({ pole: '電柱が倒れる！', sign: '看板が落ちる！', debris: '瓦礫が崩れる！', bus: 'バスの足場が崩れる！' }[h.kind], 'weak', 1.4);
    }
    if (ev.t === 'fall') {
      this.sfx.play('crash', { x: h.at[0], z: h.at[1] }); this.cam.shake(0.2, 0.3); for (let i = 0; i < 16; i++) this.fx.puff(h.at[0] + (Math.random() - 0.5) * 6, 1 + Math.random() * 3, h.at[1] + (Math.random() - 0.5) * 6, 0, 2, 0, 0x6a6470, 1.3, 0.5);
      const fx = this.protectFx[h.id]; if (fx) { fx.fallen = true; }
      this.metrics.protectMissed = (this.metrics.protectMissed || 0) + 1; if (!this.flags.protect_missed_bark) { this.flags.protect_missed_bark = true; this.bark('protect_missed', 3); }
    }
    if (ev.t === 'protectEnd') { this.metrics.protectEnd = { saved: ev.saved, missed: ev.missed }; this.ui.boss(null); this.later(1.2, () => this.playCutscene('cs06_end')); }
  },
  /** 守る物の姿（倒れる電柱・落ちる看板・崩れる瓦礫）。バスは区画の物を使う */
  makeHazard5(h) {
    if (h.kind === 'bus') return { kind: 'bus', t: 0 };
    const g = new THREE.Group();
    if (h.kind === 'pole') { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 9, 8), toon(0x6a6460)); m.position.y = 4.5; g.add(m); const a = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.2), toon(0x4a4440)); a.position.y = 8.4; g.add(a); }
    else if (h.kind === 'sign') { const m = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 0.3), toon(0xd84a3a)); g.add(m); g.position.y = 10; }
    else { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.6, 0), toon(0x5a5660)); m.position.set((Math.random() - 0.5) * 4, 12 + Math.random() * 3, (Math.random() - 0.5) * 4); g.add(m); } }
    g.position.x = h.at[0]; g.position.z = h.at[1]; this.scene.add(g);
    return { kind: h.kind, g, t: 0, h };
  },
  /** 町の描画：逃げる人・守る物・バス・光の柱 */
  renderTown5(dt) {
    if (this.area.id !== 'town') return;
    const A = this.area.dyn, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), Pv = new THREE.Vector3(), t = this.playSec;
    if (A.pillar) A.pillar.rotation.y += dt * 0.2;
    // 逃げる人：避難の先へ（攻撃の対象にならない・当たり判定なし）。暴走・守るの間だけ動く
    const run = !!(this.rampage || this.protect);
    if (A.people && run) { for (const [i, p] of A.people.list.entries()) { const dx = p.to[0] - p.x, dz = p.to[1] - p.z, L = Math.hypot(dx, dz); if (L > 0.5) { const m = Math.min(L, p.sp * dt); p.x += dx / L * m; p.z += dz / L * m; } const y = L > 0.5 ? Math.abs(Math.sin(t * 9 + p.ph)) * 0.12 : 0; Q.setFromEuler(new THREE.Euler(0, Math.atan2(dx, dz), 0)); Pv.set(p.x, y, p.z); M.compose(Pv, Q, S); A.people.mesh.setMatrixAt(i, M); } A.people.mesh.instanceMatrix.needsUpdate = true; }
    // バス：前足で運ぶと、避難の先へ持ち上げて置く
    if (A.bus && A.bus.lifted && A.bus.liftT < 1) { A.bus.liftT = Math.min(1, A.bus.liftT + dt / 2.4); const k = A.bus.liftT, x = A.bus.x + (TOWN.safe[0] - A.bus.x) * k, z = A.bus.z + (TOWN.safe[1] - 8 - A.bus.z) * k, y = Math.sin(k * Math.PI) * 8; Q.setFromEuler(new THREE.Euler(0, A.bus.ry, 0)); Pv.set(x, y, z); M.compose(Pv, Q, S); A.bus.mesh.setMatrixAt(0, M); A.bus.mesh.instanceMatrix.needsUpdate = true; }
    // 守る物：予兆の間ゆっくり傾く／落ちる。守ったら払われて飛ぶ
    for (const fx of Object.values(this.protectFx || {})) {
      if (!fx.g) continue; fx.t += dt;
      if (fx.saved) { fx.g.position.y += dt * 12; fx.g.rotation.z += dt * 4; fx.g.position.x += dt * 10; if (fx.t > 1.2) { this.scene.remove(fx.g); fx.g = null; } continue; }
      const k = fx.fallen ? 1 : Math.min(1, fx.t / (fx.h.warn || 4));
      if (fx.kind === 'pole') fx.g.rotation.z = -k * (fx.fallen ? 1.5 : 0.5);
      else if (fx.kind === 'sign') fx.g.position.y = fx.fallen ? 0.3 : 10 - k * 3;
      else fx.g.children.forEach((m, i) => { m.position.y = fx.fallen ? 0.5 : 12 + (i % 3) - k * 4; });
      if (fx.fallen && fx.t > 6) { this.scene.remove(fx.g); fx.g = null; }
    }
  },
  /** 巨大猫又の HUD（暴走・守る）。扱ったら true */
  hudGiant5() {
    if (!this.giantMode || !(this.rampage || this.protect)) return false;
    const G = this.giant, F = G.fighter, el = this.ui.el, dev = this.input.device;
    el.hpfill.style.width = (F.hp / F.hpMax * 100).toFixed(1) + '%'; el.hplag.style.width = el.hpfill.style.width; el.hpnum.textContent = `HP ${Math.ceil(F.hp)} / ${F.hpMax}`;
    const K = dev === 'pad' ? { hold: 'LB+RB', mash: 'LB', atk: 'X', parry: 'LB', use: 'B' } : dev === 'touch' ? { hold: '化', mash: '弾', atk: '斬', parry: '弾', use: '調' } : { hold: 'V', mash: 'F', atk: '左クリ', parry: 'F', use: 'E' };
    if (this.rampage && !this.rampage.calm) {
      if (!el.yoki.classList.contains('on')) el.yoki.classList.add('on');
      el.ykfill.style.width = (this.rampage.suppress * 100).toFixed(1) + '%'; el.ykn.textContent = Math.round(this.rampage.suppress * 100);
      this.ui.giantSkillsList([['抑える（長押し）', K.hold, false], ['抑える（連打）', K.mash, false]]);
    } else if (this.protect) {
      const st = G.pst && G.pst.dur ? G.pst.name : '';
      this.ui.giantSkillsList([['尾で払う', K.atk, st === 'tailSweep'], ['体で受ける', K.parry, st === 'shield'], ['前足で運ぶ', K.use, st === 'lift']]);
    }
    return true;
  },
  showEndCard5(route) {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice', 'ch4_slice', 'ch5b_slice'] });
    const stats = this.stats5();
    this.metrics.endCard5 = route;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); }, '第5章B（秘匿）　ここまで', '第6章B（中央管理棟：制御装置の停止）は次の段階で作ります。「分岐の前」のセーブ（ロード）から、もう一方のルートも遊べます。');
  },
  showEndCard6() {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice', 'ch4_slice', 'ch5a_slice', 'ch6a_open'] });
    const stats = this.stats5(), rc = this.metrics.rampageCalm || {}, pe = this.metrics.protectEnd || {};
    stats.push(['暴走（抑えた）', `${rc.sec || '—'} 秒・呼ばれた ${rc.calls || 0} 回（${rc.by === 'voice' ? '声で我に返った' : '時間で我に返った'}）`], ['壊れた小物', this.metrics.propsBroken || 0], ['町を守る', `守った ${pe.saved || 0}・間に合わなかった ${pe.missed || 0}`]);
    this.metrics.endCard6 = true;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); }, '第5章A（侵食）・第6章A（巨躯）の冒頭　ここまで', '第6章A の続き（町を守る戦い）・終章A は次の段階で作ります。「分岐の前」のセーブ（ロード）から、もう一方のルートも遊べます。');
  },
  stats5() {
    const R = this.route, rv = R.route === 'reveal';
    const fmt = s => { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; };
    return [['プレイ時間', fmt(this.playSec)], ['ルート', rv ? '妖力解放（化けを、解いた）' : '正体秘匿（人として通した）'], ['点呼', this.flags.ow_gate ? `済（ちがう点呼 ${this.rcMiss5 || 0} 回）` : '—'],
      ['延期の記録', this.flags.delay5 ? (this.flags.delay5_where === 'chief' ? '主任研究室の原本' : '記録保管庫の控え') : '—'], [rv ? '崩れた床を跳んだ' : '配電盤・封印・排水', rv ? `${this.metrics.leaps5 || 0} 回` : [this.flags.breaker5 && '配電盤', this.flags.seal5 && '封印', this.flags.drained5 && '排水'].filter(Boolean).join('・') || '—'],
      ['収容者', `救う ${this.count('shuusha', 'rescue')}・倒す ${this.count('shuusha', 'kill')}`], ['継接', { rescue: '救った（鞄を机へ返した）', neutralize: '動けなくした（脚）', kill: '倒した' }[this.story.boss5] || '—'],
      ['任意の資料', ['notes', 'letter', 'duty', 'roster'].filter(k => this.flags['seen_' + k + '5']).length + ' / 4'], ['（相棒）の信頼', this.companion.brain.trust]];
  },

  // ── 試験・ショートカット（?ch=5&route=reveal|secret・?ch=6）の初期状態 ──
  jump5(step) {
    const rr = stepRoute(step), L = rr === 'reveal' ? R5_STEPS : S5_STEPS, i = L.indexOf(step);
    if (!rr || i < 0) return null;
    this.jump4(rr === 'reveal' ? 'ch4_r_end' : 'ch4_s_end');
    const F = this.F(), f = this.flags;
    f.ch5_started = true; f.reunited = true; F.hp = F.hpMax;
    if (rr === 'reveal') { F.yokiOn = true; F.yoki = 90; } else F.yokiOn = false;
    const rescueAll = () => { for (const o of OLDWING.shuusha) this.enemyRes[o.id] = 'rescue'; };
    if (rr === 'reveal') {
      if (i >= 1) f.cs_cs05_r_arrive = true;
      if (i >= 2) { f.ow_gate = true; rescueAll(); }
      if (i >= 3) { f.delay5 = true; f.delay5_where = 'chief'; }
      if (i >= 5) { this.enemyRes.tsugihagi = 'rescue'; this.story.boss5 = 'rescue'; }
      if (i >= 6) f.town6 = true;
      if (i >= 7) { f.companion_injured = true; }
    } else {
      if (i >= 1) f.cs_cs05_s_arrive = true;
      if (i >= 2) f.breaker5 = true;
      if (i >= 3) { f.ow_gate = true; rescueAll(); }
      if (i >= 4) { f.seal5 = f.valve5 = f.drained5 = true; f.delay5 = true; f.delay5_where = 'archive'; }
      if (i >= 6) { this.enemyRes.tsugihagi = 'rescue'; this.story.boss5 = 'rescue'; }
    }
    const area = stepDef(step).area;
    const spawn = { oldwing: i === 0 ? (rr === 'reveal' ? 'gate' : 'tunnel') : /_gate$/.test(step) ? 'gatein' : 'hall', atrium: /_boss$/.test(step) ? 'from_oldwing' : 'center', town: 'giant' }[area];
    return { area, spawn };
  },
  /** 読み込み・飛び先のあとの整え。fromJump：飛び先（演出を流す・戦いを始める） */
  afterLoad5(fromJump) {
    const s = this.story.step, A = this.area.id;
    if (!CH5_AREAS.includes(A)) { this.rampage = null; this.protect = null; this.rampOverlay(false); this.ui.root.classList.remove('rampage'); return; }
    if (A === 'oldwing') {
      this.applyRoute5();
      if (fromJump && s === 'ch5_r_enter' && !this.flags.cs_cs05_r_arrive) this.later(0.1, () => this.playCutscene('cs05_r_arrive'));
      if (fromJump && s === 'ch5_s_enter' && !this.flags.cs_cs05_s_arrive) this.later(0.1, () => this.playCutscene('cs05_s_arrive'));
      if (this.ch5Route() === 'reveal' && !this.F().white && fromJump) { this.F().yoki = Math.max(this.F().yoki, 80); this.setWhite(true, 'scripted'); }
    }
    if (A === 'atrium') {
      const e = this.boss && this.boss.kind === 'tsugihagi' ? this.boss : null;
      if (/_boss$/.test(s) && e) { e.root.visible = true; e.brain.state = 'loop'; e.brain.wake([]); this.lock = e; this.metrics.bossStart5 = this.playSec; this.companion.root.visible = true; if (this.ch5Route() === 'reveal' && !this.F().white) { this.F().yoki = Math.max(this.F().yoki, 80); this.setWhite(true, 'scripted'); } }
      if (fromJump && /_gate$/.test(s)) this.onAreaEnter5('atrium');
    }
    if (A === 'town') {
      if (!this.giantMode) this.enterGiant(false);
      const G = this.giant; G.growT = null; G.scale = COMBAT.giant.scale; G.pos = { x: TOWN.giantStart[0], z: TOWN.giantStart[1] }; G.yaw = TOWN.giantStart[2];
      this.placeCompanion5('town');
      if (s === 'ch6a_rampage') { this.flags.companion_injured = false; this.rampageStart5(); }
      else if (s === 'ch6a_protect') this.protectStart5();
      else if (s === 'ch5_r_end' && fromJump) this.later(0.1, () => this.playCutscene('cs05_r_roof'));
      else { this.rampage = null; this.protect = null; G.rampK = 0; G.model.setRampage(0); }
    }
  },
  /** 撮影・試験用：第5章の小さな API */
  debug5() {
    const g = this;
    return {
      rollcall: seq => { g.rcSeq5 = seq.slice(); const r = checkRollcall(g.rcSeq5); if (r.ok) { g.ui.closePuzzle(); g.mode = 'play'; g.rcSeq5 = []; g.finishRollcall5(); } return r; },
      answer: () => rollcallAnswer(), rooms: () => rollcallRooms(),
      bell: () => { g.bellT = OLDWING.bellEvery; return true; },
      breakers: ids => { const r = checkBreakers5(ids); if (r.ok) g.finishBreakers5(); return r; },
      boss: () => { const e = g.boss && g.boss.kind === 'tsugihagi' ? g.boss : null; return e ? { state: e.brain.state, hp: e.brain.hp, hpMax: e.brain.hpMax, parts: JSON.parse(JSON.stringify(e.brain.parts)), bag: e.brain.bag, phase: e.brain.phase, resolution: e.brain.resolution, x: e.pos.x, z: e.pos.z, yaw: e.brain.yaw } : null; },
      bag: () => g.bag5 ? { x: g.bag5.x, z: g.bag5.z, carry: !!g.bagCarry, returned: !!g.bag5.returned } : null,
      hitBoss: (dmg, side, poise) => { const e = g.boss; if (!e) return 0; return g.damageEnemy(e, dmg, 'slash', { side, poise: poise || 0 }); },
      rampage: () => g.rampage ? { t: g.rampage.t, suppress: g.rampage.suppress, calls: g.rampage.calls, calm: g.rampage.calm, by: g.rampage.calmBy, k: g.rampage.k, injured: g.rampage.injured, used: [...g.rampage.used], lurches: g.rampage.lurches } : null,
      protect: () => g.protect ? { t: g.protect.t, saved: g.protect.saved, missed: g.protect.missed, done: g.protect.done, list: g.protect.list.map(h => ({ id: h.id, kind: h.kind, state: h.state, at: h.at, left: h.left })) } : null,
      giantTp: (x, z, yaw) => { if (g.giant) { g.giant.pos.x = x; g.giant.pos.z = z; if (yaw != null) g.giant.yaw = yaw; } },
    };
  },
};
export { sideOf };
