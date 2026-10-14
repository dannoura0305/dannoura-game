// 物語の進行（序章〜第2章）：段（story/chapters.js）・場所に入った時の出来事・調べる物・調べ物の仕掛け・演出場面の再生先。
// Game（main.js）のメソッドとして組み込む。
import * as THREE from 'three';
import { ITEMS } from '../data/combat.js';
import { SAFE } from '../data/safe.js';
import { EQUIP } from '../data/equip.js';
import { ROSTER } from '../data/areas.js';
import { CHAPTERS, stepDef, atLeast, streetState } from '../story/chapters.js';
import { CUTSCENES } from '../story/cutscenes.js';
import * as PZ from '../story/puzzles.js';

export const storyMethods = {
  chapterTitle() { const d = stepDef(this.story.step); return CHAPTERS[d.ch].title; },
  objectiveText() { return stepDef(this.story.step).obj; },
  companionTrust() { return this.companion.brain.trust; },
  refreshObjective() { const d = stepDef(this.story.step); this.ui.objective(CHAPTERS[d.ch].title, d.obj, d.sub); },
  setStep(id) {
    if (this.story.step === id) return;
    const prevState = streetState(this.story.step);
    this.story.step = id; this.refreshObjective(); this.autosaveReq = true;
    this.metrics.steps.push(id);
    if (this.area.id === 'shotengai' && streetState(id) !== prevState) this.applyStreetState(true);
    if (id === 'pro_fight') { const k = this.enemies.find(e => e.id === 'kiro_t'); if (k) { k.brain.lastSeen = { x: this.player.pos.x, z: this.player.pos.z }; k.brain.lastSeenT = k.brain.total; k.brain.hostileBy = 'tutorial'; k.brain.go('hostile', []); } this.hint('白い「！」は弾ける（F）／赤い「危」は避ける（Space）。弱らせると帰っていく'); }
    if (id === 'pro_home') this.hint(null);
  },
  hint(text) { this.ui.hint(text); },
  /** 毎ステップ：場所の条件で進む出来事 */
  storyTick() {
    if (this.cut.active || this.mode !== 'play') return;
    const s = this.story.step, P = this.player.pos, A = this.area.id;
    const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
    if (A === 'shotengai') {
      if (s === 'pro_meet' && near(this.companion.brain.pos.x, this.companion.brain.pos.z, 2.6)) {
        this.companion.talking = true;
        this.playEvent('ev_pro_meet', () => { this.companion.talking = false; this.playCutscene('cs00_lightsout'); });
      }
      if (s === 'pro_home' && P.z > 9.2) this.setStep('pro_tv');
    }
    if (A === 'alley' && s === 'ch1_alley' && !this.flags.reunited && P.x > 2.4 && P.z < -19.6) {
      const k = this.enemies.find(e => e.id === 'kiro_a1');
      const busy = k && k.brain.alive && ['hostile', 'assess', 'stagger'].includes(k.brain.state) && Math.hypot(k.pos.x - P.x, k.pos.z - P.z) < 8;
      if (!busy) this.playCutscene('cs01_reunion');
    }
    if (A === 'shelter' && s === 'ch2_gym' && this.area.dyn.gymDoor.open && P.z < 1.5) this.playCutscene('cs02_boss');
    this.storyTick3();
  },
  /** 場所に入った時 */
  onAreaEnterStory(id) {
    const s = this.story.step;
    if (id === 'alley' && atLeast(s, 'ch1_street') && !atLeast(s, 'ch1_alley')) this.setStep('ch1_alley');
    if (id === 'alley' && !this.flags.alley_hint) { this.flags.alley_hint = true; this.later(0.6, () => this.bark('alley_hint', 4)); }
    if (id === 'plaza' && atLeast(s, 'ch1_alley') && !this.flags.plaza_broadcast) { this.setStep('ch1_plaza'); this.playCutscene('cs01_broadcast'); }
    if (id === 'shelter' && s === 'ch2_shelter') { this.setStep('ch2_roster'); this.later(0.3, () => this.playEvent('ev_shelter_arrive')); }
    this.onAreaEnter3(id);
  },
  onEnemyResolvedStory(e, how) {
    if (e.id === 'kiro_t' && this.story.step === 'pro_fight') { this.later(0.4, () => this.bark(how === 'kill' ? 'pro_after_kill' : 'pro_after', 4)); this.setStep('pro_home'); }
  },
  onBossPhase(n) {
    if (n === 1) {                                   // 照明が落ちる
      for (const l of this.area.lights) { if (l.gym) l.off = true; if (l.emergency) l.intensity = 6; }
      this.darkness = 1; this.sfx.play('lights_out'); this.bark(this.flashlightOn ? 'boss_dark_light' : 'boss_dark', 3.5);
      if (!this.flashlightOn) this.hint('暗い……懐中電灯（L／十字キー下／灯）');
    }
    if (n === 2) this.bark('boss_desperate', 3);
  },
  onBossResolved(how) {
    this.ui.boss(null); this.hint(null); this.fx.clearDecals();
    this.story.boss = how; this.flags['boss_' + how] = true;
    for (const l of this.area.lights) if (l.gym) l.off = false;
    this.darkness = 0;
    this.later(how === 'kill' ? 1.6 : 0.9, () => this.playCutscene(how === 'rescue' ? 'cs02_end_rescue' : how === 'neutralize' ? 'cs02_end_neutral' : 'cs02_end_kill'));
  },

  // ── 調べる・使う ──
  useSpot(s) {
    const T = this.events.texts || {}, st = this.story.step;
    if (this.useSpot3(s)) return;
    switch (s.kind) {
      case 'door': {
        const d = this.area.dyn['door_' + s.door]; if (!d) break;
        this.opened.add(s.door); d.open = true; this.sfx.play('door', { x: s.x, z: s.z }); this.halos.setColor(d.halo, 0xffe0a0);
        const k = this.enemies.find(e => e.kind === 'kiro' && e.brain.home === s.door);
        if (k && k.brain.alive) { const ev = []; k.brain.openDoor(ev); this.enemyEvents(k, ev); }
        this.bark('door_opened', 2.4);
        break;
      }
      case 'vending': if (!this.picked.has('vending')) { this.picked.add('vending'); this.items.coffee = (this.items.coffee || 0) + 1; this.sayText(T.vending); this.sfx.play('pickup'); } else this.sayText(T.vending_empty); break;
      case 'read': this.sayText((T[s.text] || '').replace('{code}', SAFE.code.split('').join(' ')) || s.sign || '……'); if (s.text) this.flags['read_' + s.text] = true; break;
      case 'help': { const ev = []; const r = this.heiten.brain.help(s.help, ev); this.enemyEvents(this.heiten, ev); if (s.help === 'lights' && r !== 'wrong') this.heitenStep('lights'); if (s.help === 'sign' && r === 'done') this.heitenSign.set('本日は\n閉店しました'); if (r === 'ignored') this.ui.log('……今は手伝えない'); break; }
      case 'safe':
        if (this.flags.safe_opened) this.sayText(T.safe_opened);
        else if (!atLeast(st, 'ch1_katana')) this.sayText(T.safe_prologue);
        else this.openSafe();
        break;
      case 'save': this.autosaveReq = true; this.mode = 'pause'; this.input.exitLock(); this.ui.openSave(); break;
      case 'rack':
        if (this.player.fighter.owned.includes('katana')) { this.sayText(T.rack_empty); break; }
        if (!atLeast(st, 'ch1_katana')) { this.sayText(T.rack_prologue); break; }
        this.player.fighter.give('katana'); this.area.dyn.rackKatana.visible = false; this.sfx.play('equip');
        this.playLines([{ who: 'sys', text: T.rack_take }, { who: 'dan', text: '……久しぶりね。また、頼むわよ' }], () => { this.setStep('ch1_street'); this.ui.log('刀を手に入れた（1 キー／替）'); });
        this.queueSwapTo('katana');
        break;
      case 'sofa':
        if (st === 'pro_tv') this.playCutscene('cs00_tv');
        else this.sayText(T.sofa);
        break;
      case 'exit': this.useExit(s); break;
      case 'pickupSpot': this.pickupSpot(s); break;
      case 'cctv': this.openCctv(); break;
      case 'clue': this.clue(s.clue); break;
      case 'drawer': this.openDrawer(); break;
      case 'gymdoor':
        if (this.area.dyn.gymDoor.open) break;
        if (this.flags.gym_key) { this.openGymDoor(); this.setStep('ch2_gym'); }
        else this.sayText(T.gym_locked);
        break;
      case 'mic': this.openMic(); break;
      case 'shutter': {
        const b = this.boss && this.boss.brain;
        if (b && b.state === 'stuck') { const ev = []; b.shut(ev); this.area.dyn.storageShutter.target = this.area.dyn.storageShutter.down; this.enemyEvents(this.boss, ev); }
        else this.sayText(T.shutter_idle);
        break;
      }
      case 'talk': this.playEvent('ev_companion_idle'); break;
    }
  },
  queueSwapTo(w) { this.pendingWant = w; },
  useExit(s) {
    if (s.needFlag && !this.flags[s.needFlag]) { if (!s.auto || !this.exitWarned) this.sayText((this.events.texts || {})[s.lockedText] || '今は行けない'); this.exitWarned = true; return; }
    if (this.area.id === 'shotengai' && s.to === 'alley' && !atLeast(this.story.step, 'ch1_street')) { this.sayText((this.events.texts || {}).alley_prologue); return; }
    if (this.anyHostileNear(7)) { this.ui.log('今は離れられない'); return; }
    this.changeArea(s.to, s.spawn);
  },
  anyHostileNear(r) { const P = this.player.pos; return this.enemies.some(e => e.brain.alive && ['hostile', 'assess'].includes(e.brain.state) && e.kind !== 'shuuyou' && Math.hypot(e.pos.x - P.x, e.pos.z - P.z) < r); },
  pickupSpot(s) {
    if (this.picked.has(s.id)) { this.sayText('もう何もない。'); return; }
    const [kind, id] = s.give.split(':');
    this.picked.add(s.id);
    if (kind === 'weapon') {
      this.player.fighter.give(id); this.sfx.play('equip'); if (s.mesh) s.mesh.visible = false;
      if (id === 'pipe') { this.ui.log('鉄パイプを拾った（攻撃：左クリック・斬）'); this.player.fighter.weapon = 'pipe'; this.player.fighter.lastMelee = 'pipe'; if (this.story.step === 'pro_pipe') this.setStep('pro_fight'); }
    } else if (kind === 'equip') {
      this.giveEquip(id); this.sayText((this.events.texts || {})['equip_' + id] || EQUIP[id].name);
    }
  },
  giveEquip(id) {
    if (!this.ownedEquip.includes(id)) this.ownedEquip.push(id);
    if (this.equipped.length < 2 && !this.equipped.includes(id)) this.equipped.push(id);
    this.applyEquip(); this.sfx.play('equip'); this.ui.log(`装備：${EQUIP[id].name}（メニューの「装備」）`);
  },
  openSafe() {
    this.mode = 'pause'; this.input.exitLock();
    this.ui.openSafe(SAFE.digits, code => {
      if (code !== SAFE.code) return false;
      this.flags.safe_opened = true; this.ui.closeSafe(); this.sfx.play('ui_ok');
      for (const c of SAFE.contents) { const it = ITEMS[c.id]; if (it.ammo) this.player.fighter.addAmmo(it.ammo * c.n); else this.items[c.id] = (this.items[c.id] || 0) + c.n; }
      for (const w of SAFE.gives.weapons) this.player.fighter.give(w);
      for (const e of SAFE.gives.equip) this.giveEquip(e);
      this.mode = 'play'; this.playEvent('ev_safe_open'); this.autosaveReq = true;
      return true;
    }, () => { this.ui.closeSafe(); this.resume(); });
  },
  // ── 調べ物：名簿・受付票・引き出し・名札の切れ端・防犯映像・マイク ──
  clue(id) {
    const T = this.events.texts || {};
    if (id === 'roster') { this.flags.seen_roster = true; this.sayText(T.roster); }
    if (id === 'cards') { this.flags.seen_cards = true; this.sayText(T.cards); }
    if (id === 'torn_tag') { this.flags.torn_tag = true; this.sayText(T.torn_tag); this.ui.log('手掛かり：名札の切れ端「No.4?」'); }
    if ((id === 'roster' || id === 'cards') && this.flags.seen_roster && this.flags.seen_cards && !this.flags.roster_done) {
      this.afterDialog = () => this.openRoster();
    }
  },
  rosterView() { return { groups: ROSTER.groups, people: PZ.rosterPeople(), cards: g => PZ.cardsOf(g) }; },
  openRoster() {
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.rosterUI(this.rosterView(), this.puz.roster, (g, name) => {
      const ns = PZ.pickRoster(this.puz.roster, g, name); const ok = ns.done[g] === name; this.puz.roster = ns;
      this.sfx.play(ok ? 'ui_ok' : 'ui_ng');
      if (ns.complete) { setTimeout(() => this.finishRoster(), 350); return null; }
      return ns;
    }, () => { this.ui.closePuzzle(); this.resume(); });
  },
  finishRoster() {
    this.ui.closePuzzle(); this.flags.roster_done = true; this.mode = 'play';
    this.metrics.puzzles.roster = true;
    if (this.story.step === 'ch2_roster') this.setStep('ch2_key');
    this.playEvent('ev_roster_done');
  },
  openDrawer() {
    if (this.flags.gym_key) { this.sayText('引き出しは空だ。'); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.drawerUI(n => {
      if (n === PZ.drawerAnswer()) { this.ui.closePuzzle(); this.flags.gym_key = true; this.mode = 'play'; this.sfx.play('ui_ok'); this.metrics.puzzles.drawer = true; this.playEvent('ev_gym_key'); if (this.story.step === 'ch2_key' || this.story.step === 'ch2_roster') this.setStep('ch2_key'); }
      else { this.sfx.play('ui_ng'); this.ui.log(`${n} 番の引き出し：空だ`); }
    }, () => { this.ui.closePuzzle(); this.resume(); }, this.flags.roster_done ? '受付票の箱のメモ「鍵は、未着の人数の番号に」' : '引き出しに 1〜9 の番号。どれだろう');
  },
  openGymDoor() {
    const D = this.area.dyn.gymDoor; if (D.open) return;
    D.open = true; const i = this.area.boxes.indexOf(D.box); if (i >= 0) this.area.boxes.splice(i, 1);
    D.leafs[0].position.x = -1.95; D.leafs[1].position.x = 1.95; this.sfx.play('door', { x: 0, z: 10 });
  },
  openMic() {
    const b = this.boss && this.boss.brain;
    if (!b || !b.alive || b.resolved) { this.sayText((this.events.texts || {}).mic_idle); return; }
    const opts = PZ.micOptions(!!this.flags.roster_done);
    const note = b.rollcallOpen ? '点呼のあいだに名前を呼ぶ' : '（今は点呼の時ではない）';
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.micUI(opts, name => {
      this.ui.closePuzzle(); this.mode = 'play';
      const ev = []; const r = b.callName(name, ev); this.metrics.micCalls = (this.metrics.micCalls || 0) + 1;
      this.sayBark('dan', `（マイクで）……${name}さん。`, 2.4);
      this.sfx.play('pa_chime');
      if (r === 'closed') this.ui.log('……返事がない（点呼の時に呼ぼう）');
      this.enemyEvents(this.boss, ev);
    }, () => { this.ui.closePuzzle(); this.resume(); }, note);
  },
  openCctv() {
    if (this.flags.cctv_done) { this.sayText((this.events.texts || {}).cctv_done.replace('{time}', SAFE.code.slice(0, 2) + ':' + SAFE.code.slice(2, 4))); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    const cams = PZ.cctvCams();
    this.ui.cctvUI(cams, (id, g, w, h) => drawCam(id, g, w, h), id => {
      if (PZ.checkCctv(id)) {
        this.ui.closePuzzle(); this.mode = 'play'; this.flags.cctv_done = true; this.metrics.puzzles.cctv = true; this.sfx.play('ui_ok');
        this.playEvent('ev_cctv_done', () => { this.giveEquip('battou'); });
        this.ui.log(`手掛かり：あり得ない時刻「${SAFE.code.slice(0, 2)}:${SAFE.code.slice(2, 4)}」（金庫の番号？）`);
      } else { this.sfx.play('ui_ng'); this.ui.log('……この記録は、おかしくない'); }
    }, () => { this.ui.closePuzzle(); this.resume(); }, '停電は 10/14 の 23:41（回覧板）。この時刻と合わない記録はどれ？');
  },
  sayBark(who, text, dur) { const sp = (this.events.speakers || {})[who] || {}; this.ui.bark(sp.name, text, sp.color, dur); },

  // ── 演出場面の再生先（story/cutscene.js の host） ──
  playCutscene(id, done) {
    const cs = CUTSCENES[id]; if (!cs) return;
    if (this.cut.active) return;
    this.flags['cs_' + id] = true; this.metrics.cutscenes.push(id);
    this.mode = 'play'; this.input.exitLock();
    this.lock = null; this.fx.clearDecals(); this.trail.cut(); if (this.trail.reset) this.trail.reset();
    this.cutDone = done;
    this.cut.play(cs);
  },
  cutHost() {
    const g = this;
    return {
      setCam(pos, look, fov) { g.cineCam = { pos, look, fov }; },
      subtitle(who, text, L) {
        if (L && L.cond === 'white' && !g.player.fighter.white) { g.ui.subtitle(null, null); return; }
        g.ui.subtitle(who ? (g.events.speakers || {})[who] || { name: who === 'pa' ? '館内放送' : '' } : null, text); if (text && L && L.who === 'pa') g.sfx.play('notify');
        if (text && L && L.expr) { if (L.who === 'dan') g.player.setExpr(L.expr, 4); else if (L.who === 'companion' && g.companion.model.setExpr) g.companion.model.setExpr(L.expr); }
        if (text && L && L.fixed) { g.metrics.fixedLines = (g.metrics.fixedLines || []).concat([{ who: L.who, text: L.text, step: g.story.step }]); }
      },
      letterbox(on) { g.ui.letterbox(on); if (!on) g.cineCam = null; },
      sound(name) { g.sfx.play(name); },
      actor(a, instant) { g.cineActor(a, instant); },
      event(name, arg) { g.cineEvent(name, arg); },
      done(cs) { g.ui.skipProgress(0); g.onCutsceneDone(cs); },
    };
  },
  cineActor(a, instant) {
    const id = a.id;
    if (id === 'child') { const c = this.child; if (!c) return; if (a.show || a.pos) c.root.visible = true; if (a.pos) { c.pos.x = a.pos[0]; c.pos.z = a.pos[1]; c.y = 0; } if (a.to) c.y = 0; if (a.yaw != null) c.yaw = a.yaw; if (a.anim) c.mode = a.anim === 'follow' ? 'follow' : a.anim; c.cmode = null; if (a.to) { if (instant) { c.pos.x = a.to[0]; c.pos.z = a.to[1]; if (a.hideAtEnd) c.root.visible = false; } else c.cineTo = { to: a.to, speed: a.run ? 4.2 : 1.5, hideAtEnd: a.hideAtEnd }; } return; }
    const tgt = id === 'player' ? { kind: 'player' } : id === 'companion' ? { kind: 'companion' } : { kind: 'enemy', e: this.enemies.find(e => e.id === id) || (id === 'boss' ? this.boss : null) };
    if (tgt.kind === 'enemy' && !tgt.e) return;
    const setPos = (x, z) => { if (tgt.kind === 'player') this.player.pos.set(x, 0, z); else if (tgt.kind === 'companion') { this.companion.brain.pos.x = x; this.companion.brain.pos.z = z; } else { tgt.e.brain.pos.x = x; tgt.e.brain.pos.z = z; } };
    const setYaw = y => { if (tgt.kind === 'player') this.player.yaw = y; else if (tgt.kind === 'companion') this.companion.brain.yaw = y; else tgt.e.brain.yaw = y; };
    if (tgt.kind === 'companion') { if (a.mode) this.companion.brain.setMode(a.mode); if (a.show) this.companion.root.visible = true; if (a.anim !== undefined) this.companion.anim = a.anim === 'idle' || a.anim === 'run' ? null : a.anim; }
    if (tgt.kind === 'enemy' && a.show) tgt.e.root.visible = true;
    if (a.pos) setPos(a.pos[0], a.pos[1]);
    if (a.yaw != null) setYaw(a.yaw);
    if (tgt.kind === 'player') this.cinePlayerAnim = a.anim || null;
    if (a.to) {
      if (instant) { setPos(a.to[0], a.to[1]); if (a.hideAtEnd && tgt.kind === 'companion') this.companion.root.visible = false; }
      else this.cineMoves.push({ tgt, to: a.to, speed: a.run ? 4.6 : 1.6, hideAtEnd: a.hideAtEnd });
    }
  },
  stepCineMoves(dt) {
    for (let i = this.cineMoves.length - 1; i >= 0; i--) {
      const m = this.cineMoves[i]; const p = m.tgt.kind === 'player' ? this.player.pos : m.tgt.kind === 'companion' ? this.companion.brain.pos : m.tgt.e.brain.pos;
      const dx = m.to[0] - p.x, dz = m.to[1] - p.z, L = Math.hypot(dx, dz);
      if (L < 0.08) { if (m.hideAtEnd && m.tgt.kind === 'companion') this.companion.root.visible = false; this.cineMoves.splice(i, 1); continue; }
      const s = Math.min(L, m.speed * dt); p.x += dx / L * s; p.z += dz / L * s;
      const yaw = Math.atan2(dx, dz);
      if (m.tgt.kind === 'companion') { this.companion.brain.yaw = yaw; this.companion.speed = m.speed; this.companion.phase += s * 3.6; }
      else if (m.tgt.kind === 'player') { this.player.yaw = yaw; this.player.speed = m.speed; this.player.phase += s * 3.4; }
      else { m.tgt.e.brain.yaw = yaw; m.tgt.e.speed = m.speed; m.tgt.e.phase += s * 3.4; }
    }
  },
  stepChildCine(dt) {
    const c = this.child, m = c.cineTo; const dx = m.to[0] - c.pos.x, dz = m.to[1] - c.pos.z, L = Math.hypot(dx, dz);
    if (L < 0.08) { if (m.hideAtEnd) c.root.visible = false; c.cineTo = null; c.speed = 0; return; }
    const s = Math.min(L, m.speed * dt); c.pos.x += dx / L * s; c.pos.z += dz / L * s; c.yaw = Math.atan2(dx, dz); c.speed = m.speed; c.phase += s * 4.4;
  },
  /** 白い髪がにじみかけて戻る（演出：網を数回だけ差し替える） */
  whiteFlicker(skip) {
    if (skip) return; const P = this.player; let k = 0; this.flickerTimer = true;
    const seq = [0.0, 0.12, 0.3, 0.38, 0.9, 1.0];
    for (const t of seq) this.later(t, () => { if (!this.flickerTimer || this.player.fighter.white) return; k++; P.setModel(k % 2 ? this.whiteModel : this.purpleModel); });
    this.later(1.1, () => { if (!this.player.fighter.white) P.setModel(this.purpleModel); this.flickerTimer = null; });
  },
  cineEvent(name, arg) {
    const skip = this.cut.skipping;
    switch (name) {
      // 第3章
      case 'expr': if (arg.who === 'player') this.player.setExpr(arg.name, 5); else if (arg.who === 'companion' && this.companion.model.setExpr) this.companion.model.setExpr(arg.name); break;
      case 'spawnTwist': this.spawnTwist(); break;
      case 'guardStart': this.guardStart(); break;
      case 'childFollow': if (this.child) { this.child.mode = 'follow'; this.child.root.visible = this.companion.root.visible || true; } break;
      case 'refugeShutter': { const R = this.area.dyn.refugeShutter; if (!R) break; R.target = arg === 'down' ? R.down : R.up; const i = this.area.boxes.indexOf(R.box); if (arg === 'down' && i < 0) this.area.boxes.push(R.box); if (arg !== 'down' && i >= 0) this.area.boxes.splice(i, 1); if (skip) R.mesh.position.y = R.target; if (arg === 'down') { this.companion.brain.setMode('scripted'); this.companion.brain.pos = { x: 11.2, z: -28.8 }; this.companion.root.visible = false; if (this.child) this.child.root.visible = false; } break; }
      case 'bossRise3': this.bossRise3(); break;
      case 'bossWake3': this.bossWake3(); break;
      case 'whiteFlicker': this.whiteFlicker(skip); break;
      case 'transform': this.setWhite(true, 'scripted'); break;
      case 'revertWhite': if (this.player.fighter.white) this.setWhite(false, 'scripted'); break;
      case 'formCard': this.ui.chapterCard(arg, 2.6); break;
      case 'endCard3': this.later(skip ? 0 : 0.3, () => this.showEndCard3()); break;
      case 'setStep': this.setStep(arg); break;
      case 'flag': this.flags[arg] = true; break;
      case 'chapterCard': this.ui.chapterCard(CHAPTERS[arg].title); this.sfx.play('notify'); break;
      case 'lightsOut': {
        const L = this.area.halos.filter(h => (h.strip || h.shopFront || h.light) && h.p[2] <= arg.from * -0 + 100).sort((a, b) => a.p[2] - b.p[2]);
        const seq = L.filter(h => h.p[2] >= arg.from && h.p[2] <= arg.to);
        seq.forEach((h, i) => this.later(skip ? 0 : i * arg.step / 2, () => { h.off = true; if (h.light) h.light.off = true; this.sfx.play('flicker', { x: h.p[0], z: h.p[2] }); }));
        this.later(skip ? 0 : seq.length * arg.step / 2 + 0.2, () => { if (this.area.dyn.lampMat) this.area.dyn.lampMat.color.setScalar(0.12); this.flags.lights_out = true; this.applyStreetState(false); });
        break;
      }
      case 'civiliansVanish': for (const c of this.civilians) c.vanish = true; break;
      case 'vendingOff': { const l = this.areaLight(l => l.vending); if (l) l.off = true; break; }
      case 'silence': this.sfx.silence(arg); break;
      case 'flickerKiroLight': { const l = this.areaLight(l => l.pos[2] === -56); if (l) { l.off = false; l.flicker = true; } break; }
      case 'tv': if (this.area.dyn.tv) { this.area.dyn.tv.kind = arg; this.area.dyn.tv.draw(arg); } break;
      case 'companionFollow': this.companion.brain.setMode('follow'); this.companion.root.visible = true; this.companion.anim = null; this.companion.brain.trail = []; break;
      case 'bossRise': if (this.boss) { this.boss.brain.state = 'rise'; this.boss.root.visible = true; this.sfx.play('boss_rise', this.boss.pos); } break;
      case 'gymFlicker': for (const l of this.area.lights) if (l.gym) { l.flickerT = 1.2; } break;
      case 'bossWake': if (this.boss) { this.boss.brain.state = 'dormant'; this.boss.brain.wake([]); this.ui.boss('収容者（仮）', 1, '点呼の時を待て'); this.metrics.bossStart = this.playSec; } break;
      case 'endCard': this.later(skip ? 0 : 0.2, () => this.showEndCard()); break;
    }
  },
  later(sec, fn) { if (sec <= 0) { fn(); return; } this.timers.push({ t: sec, fn }); },
  onCutsceneDone(cs) {
    this.cinePlayerAnim = null;
    if (this.child && this.child.cineTo) { const m = this.child.cineTo; this.child.pos.x = m.to[0]; this.child.pos.z = m.to[1]; if (m.hideAtEnd) this.child.root.visible = false; this.child.cineTo = null; }
    if (this.flickerTimer) { this.flickerTimer = null; if (!this.player.fighter.white && this.player.model !== this.purpleModel) this.player.setModel(this.purpleModel); }
    for (const m of this.cineMoves) { const p = m.tgt.kind === 'companion' ? this.companion.brain.pos : m.tgt.kind === 'player' ? this.player.pos : m.tgt.e.brain.pos; p.x = m.to[0]; p.z = m.to[1]; if (m.hideAtEnd && m.tgt.kind === 'companion') this.companion.root.visible = false; }
    this.cineMoves.length = 0;
    this.cam.yaw = this.player.yaw + Math.PI; this.cam.pitch = 0.16; this.cam.curDist = 2.2;
    if (!this.isTest() && !this.touch) this.input.requestLock();
    this.autosaveReq = true;
    const d = this.cutDone; this.cutDone = null; if (d) d(cs);
  },
  showEndCard() {
    if (this.story.step !== 'ch2_end') this.setStep('ch2_end');
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice'] });
    const how = { rescue: '救った（名前を呼んだ）', neutralize: '閉じ込めた', kill: '倒した' }[this.story.boss] || '—';
    const stats = [['プレイ時間', fmtSec(this.playSec)], ['収容者', how], ['救った帰路', this.count('kiro', 'rescue')], ['倒した帰路', this.count('kiro', 'kill')],
      ['見切り一閃', this.metrics.issen.mikiri || 0], ['弾き一閃', this.metrics.issen.hajiki || 0], ['連鎖一閃（最大）', this.metrics.chainMax || 0], ['（相棒）の信頼', this.companion.brain.trust],
      ['名簿の照合', this.flags.roster_done ? '済' : '—'], ['防犯映像（任意）', this.flags.cctv_done ? '済' : '—'], ['金庫（任意）', this.flags.safe_opened ? '開けた' : '—']];
    this.metrics.endCard = true;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); if (this.story.step === 'ch2_end') this.later(0.4, () => this.startCh3()); }, '第2章（避難所）　ここまで', '続けて第3章（病院・地下通路）へ進めます。');
  },
};

function fmtSec(s) { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; }

/** 防犯映像の小さな絵（キャンバス・粗いモノクロ） */
function drawCam(id, g, w, h) {
  g.fillStyle = '#0a0c0a'; g.fillRect(0, 0, w, h);
  const seed = id.charCodeAt(3); let a = seed * 997;
  const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = '#4a5a4a'; g.lineWidth = 2;
  if (id === 'cam1') { for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, h * 0.35); g.lineTo(i < 3 ? 0 : w, h * (0.2 + (i % 3) * 0.3)); g.stroke(); } g.fillStyle = '#2a3a2a'; g.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.3); }
  if (id === 'cam2') { g.fillStyle = '#1a2a1a'; g.fillRect(0, 0, w * 0.35, h); g.fillRect(w * 0.65, 0, w * 0.35, h); g.fillStyle = '#3a4a3a'; g.fillRect(w * 0.45, h * 0.5, 10, 22); }
  if (id === 'cam3') { g.fillStyle = '#2a3a2a'; g.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.45); g.fillStyle = '#0a120a'; g.fillRect(w * 0.38, h * 0.32, w * 0.24, h * 0.28); g.fillStyle = '#5a6a5a'; g.fillRect(w * 0.47, h * 0.62, 8, 26); }
  if (id === 'cam4') { g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.4, h * 0.3); g.lineTo(w * 0.6, h * 0.3); g.lineTo(w, h); g.stroke(); }
  const im = g.getImageData(0, 0, w, h); for (let i = 0; i < im.data.length; i += 4) { const n = (rnd() - 0.5) * 40; im.data[i] += n; im.data[i + 1] += n * 1.2; im.data[i + 2] += n; } g.putImageData(im, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.4)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.fillStyle = '#c0ffc0'; g.font = '12px monospace'; g.fillText('REC ●  ' + id.toUpperCase(), 6, 14);
}
