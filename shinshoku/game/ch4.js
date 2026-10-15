// 第4章「境界の夜」の実行。Game（main.js）のメソッドとして組み込む。
// ・観測分室：入退室の記録とあり得ない時刻（必須の謎）→ 職員証 B-07・火縄銃（保管庫）→ 研究者の放送 → 地下へ。
// ・地下研究区画：応答体（習慣の輪・共鳴・救う／無力化／倒す）→ 試験床の罠 → 分岐（ここだけ）：専用のセーブ枠 'branch' に書いてから選ぶ。
//   reveal：めがねに手をかけ白い姿へ（相棒が見る）→ 群れを払う → 原文の台詞（相棒）→ 搬入ヤード → 巨大猫又 vs 境界の先触れ。
//   secret：人の姿の試練（3 回負けで手助けの案内・選択に戻れる）→ ルートの確定 → 非常停止 → 配電盤（保全の知識）→ 蒸気の弁 → 制御室で（相棒）を守る。
// ・ルートの確定は route.js の choose（route・routeLock・branchLog）。reveal は選んだ時、secret は試練に勝った時（ROUTE_BRANCH_SPEC §3）。
import * as THREE from 'three';
import { COMBAT } from '../data/combat.js';
import { ENEMIES } from '../data/enemies.js';
import { LAB, YARD, OFFICE, pickLog, impossibleLogs, checkBreakers, BREAKERS } from '../data/ch4.js';
import { Outou } from '../ai/outou.js';
import { Mimic } from '../ai/mimic.js';
import { Sakibure, segDist, blocksLine } from '../ai/sakibure.js';
import { EnemyActor } from '../actor/actors.js';
import { buildOutou, buildGiantNekomata, buildSakibure } from '../actor/models4.js';
import { buildMimicShadow } from '../actor/models3.js';
import { mimicPose } from '../actor/anim.js';
import { outouPose, SakibureAnimator } from '../actor/anim4.js';
import { GiantAnimator } from '../actor/anim5.js';
import { GiantFighter } from '../combat/giant.js';
import { choose, lastLock, carryBranchLog, logYokai } from '../story/route.js';
import { atLeast, stepDef, stepRoute, R_STEPS, S_STEPS } from '../story/chapters.js';
import { SAVE_VER, GAME_VER } from '../save/save.js';
import { rayBoxes } from '../world/collide.js';

const DT = 1 / 60;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const TRAP_IDS = LAB.trap.map(t => t.id);

export const ch4Methods = {
  // ── 第4章の始まり（第3章の終わりの表を閉じた後） ──
  startCh4() {
    if (this.flags.ch4_started) return;
    this.playEvent('ev_ch4_start', () => {
      this.flags.ch4_started = true; this.setStep('ch4_office');
      this.changeArea('office', 'entrance');
      this.ui.chapterCard('第4章　境界の夜'); this.sfx.play('notify');
    });
  },
  ch4Secret() { const s = this.story.step; return stepRoute(s) === 'secret' || (s === 'ch4_branch' && this.flags.branch_secret_trial); },
  onAreaEnter4(id) {
    const s = this.story.step;
    if (id === 'office' && s === 'ch4_office' && !this.flags.cs_cs04_office) this.later(0.1, () => this.playCutscene('cs04_office'));
    if (id === 'lab' && s === 'ch4_down') this.later(0.1, () => this.playCutscene('cs04_lab'));
    if (id === 'yard' && s === 'ch4_r_rise') this.later(0.1, () => this.playCutscene('cs04_giant'));
    if (id === 'lab' && s === 'ch4_s_power' && !this.flags.emergency) this.applyEmergency(true);
  },

  // ── 区画の敵（研究区画・ヤード） ──
  spawnCh4(id, add) {
    const s = this.story.step;
    if (id === 'office') return true;
    if (id === 'lab') {
      const preBranch = !atLeast(s, 'ch4_branch');
      if (preBranch || stepRoute(s) === 'reveal') for (const o of LAB.outou) if (!this.enemyRes[o.id]) this.addOutou(add, o, { habit: o.habit, terminal: { x: LAB.terminal[0], z: LAB.terminal[1] } });
      const fight = ['ch4_branch', 'ch4_r_fight', 'ch4_s_trial'].includes(s);
      if (fight) this.spawnTrap(add, s !== 'ch4_branch');
      if (['ch4_s_power', 'ch4_s_sneak'].includes(s)) for (const o of LAB.roam) if (!this.enemyRes[o.id]) this.addOutou(add, o, { path: o.path });
      return true;
    }
    if (id === 'yard') {
      const r = this.enemyRes[YARD.boss.id];
      if (!r) {
        const b = new Sakibure({ id: YARD.boss.id, pos: { x: YARD.boss.pos[0], z: YARD.boss.pos[1] }, yaw: 0, seed: 23 });
        const e = add(b, this.bossModel4()); e.big = true; e.poseFn = () => ({ pose: {}, rate: 0 }); e.r = 9; b.r = 9; e.h = 20; this.boss = e;
        e.root.visible = s !== 'ch4_r_rise' || !!this.flags.boss4_risen;
        if (s === 'ch4_r_giant') b.wake([]);
      }
      return true;
    }
    return false;
  },
  bossModel4() {
    const m = buildSakibure(); m.root.scale.setScalar(13); m.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const base = m.update; m.update = dt => { if (base) base(dt); if (m.anim && m.brainRef) m.anim.update(dt, m.brainRef); };
    m.anim = new SakibureAnimator(m); return m;
  },
  addOutou(add, o, opt = {}) {
    const brain = new Outou({ id: o.id, pos: { x: o.pos[0], z: o.pos[1] }, tank: o.tank ? { x: o.tank[0], z: o.tank[1] } : null, seed: o.id.length * 13 + (o.id.charCodeAt(o.id.length - 1) || 1), habit: opt.habit, terminal: opt.terminal, path: opt.path ? opt.path.map(([x, z]) => [x, z]) : null, phase: opt.habit ? (o.id === 'outou_3' ? 3.5 : 0) : 0, state: opt.state, leash: opt.leash });
    const e = add(brain, buildOutou(o.id.charCodeAt(o.id.length - 1))); e.poseFn = outouPose; return e;
  },
  /** 試験床の罠の群れ（分岐の戦い）。active：すぐに敵対（読み込み直後など） */
  spawnTrap(add, active) {
    if (!add) add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    const assist = !!this.flags.trial_assist && this.ch4Secret();
    for (const t of LAB.trap) {
      if (this.enemyRes[t.id] || this.enemies.some(e => e.id === t.id)) continue;
      if (assist && t.id === 'trap_m2') continue;                                            // 手助け：敵の数 −1
      let e;
      if (t.kind === 'outou') e = this.addOutou(add, { id: t.id, pos: t.pos }, { state: active ? 'hostile' : 'loop', leash: 30 });
      else { const brain = new Mimic({ id: t.id, pos: { x: t.pos[0], z: t.pos[1] }, yaw: 0, dormant: !active, seed: t.id.length * 5 }); e = add(brain, buildMimicShadow({ seed: t.id.charCodeAt(4) })); e.poseFn = mimicPose; }
      if (t.kind !== 'outou') e.brain.home = { x: LAB.trapCenter[0], z: LAB.trapCenter[1] }; e.trap = true;
      e.brain.yaw = Math.atan2(LAB.trapCenter[0] - t.pos[0], LAB.trapCenter[1] - t.pos[1]);
    }
  },
  trapLeft() { return this.enemies.filter(e => e.trap && e.brain.alive && e.root.visible).length; },
  /** 罠の群れが襲ってくる（分岐の戦いの始まり） */
  trapFight() {
    for (const e of this.enemies) if (e.trap && e.brain.alive) {
      const b = e.brain;
      if (b.kind === 'outou') { b.go('hostile', [], 'trap'); b.hostileBy = 'trap'; b.cool = 0.6 + Math.random() * 0.8; }
      else { b.state = 'hostile'; b.hostileBy = 'trap'; b.revealed = true; b.cool = 1.0 + Math.random(); }
      b.lastSeen = { x: this.player.pos.x, z: this.player.pos.z }; b.lastSeenT = b.total;
    }
    this.companionAtTrap();
    this.ui.boss('試験床の群れ（' + this.trapLeft() + '）', 1, this.ch4Secret() ? '人の姿のまま' : '白髪形態');
    this.hint(this.ch4Secret() ? '紫の姿の技だけ：白い「！」は弾く・赤は避ける・倒れた敵へ連鎖一閃' : '白髪形態：妖爪・猫火（構え＋攻撃）・瞬歩・幻術・火縄銃は持ち替え（替）で妖弾'); this.later(5, () => this.hint(null));
    this.trapStartAt = this.playSec;
  },
  companionAtTrap() { const C = this.companion; C.root.visible = true; C.brain.setMode('scripted'); C.brain.pos = { x: LAB.trapCenter[0], z: LAB.trapCenter[1] }; C.brain.yaw = 0; C.anim = 'cower'; },

  // ── 毎ステップ ──
  storyTick4() {
    const s = this.story.step, A = this.area.id, P = this.player.pos;
    if (A === 'lab') {
      if (s === 'ch4_lab' && !this.cut.active && P.z < -3.6 && Math.abs(P.x) < 7 && !this.anyHostileNear(9)) this.playCutscene('cs04_trap', () => this.openBranch());
      if ((s === 'ch4_r_fight' || s === 'ch4_s_trial') && this.trapStartAt != null) {
        const left = this.trapLeft();
        if (left > 0) this.ui.boss('試験床の群れ（' + left + '）', left / (this.flags.trial_assist && s === 'ch4_s_trial' ? 4 : 5), s === 'ch4_s_trial' ? '人の姿のまま' : '白髪形態');
        else if (!this.trapDone) { this.trapDone = true; this.ui.boss(null); this.hint(null); this.later(0.9, () => this.onTrapCleared()); }
      }
      if (s === 'ch4_s_sneak' && P.x > 14.7 && !this.cut.active) this.playCutscene('cs04_s_hold');
      if (s === 'ch4_s_hold') this.stepHold(DT);
      if (s === 'ch4_lab' || s === 'ch4_down') this.stepHabitChime(DT);
      if (this.flags.steam) this.stepSteam(DT);
    }
  },
  onTrapCleared() {
    const s = this.story.step; this.trapStartAt = null;
    if (s === 'ch4_r_fight') { this.playCutscene('cs04_line', () => this.playCutscene('cs04_rise')); return; }
    if (s === 'ch4_s_trial') {
      this.lockRoute('secret', { trial: { attempts: (this.trialLosses || 0) + 1, assist: !!this.flags.trial_assist, result: 'win' }, tries: (this.trialLosses || 0) + 1, assisted: !!this.flags.trial_assist });
      if (this.flags.trial_assist) this.F().setDifficulty(this.settings.difficulty, { touch: this.touch, assist: this.settings.assist });
      this.playCutscene('cs04_s_win');
    }
  },
  /** 習慣の輪：試験端末の呼び出しの音（14 秒ごと）。輪の個体が端末へ歩く */
  stepHabitChime(dt) {
    this.chimeT = (this.chimeT || 0) + dt;
    if (this.chimeT > 14) { this.chimeT = 0; this.chimeNow = 2; const T = LAB.terminal; this.sfx.play('chime', { x: T[0], z: T[1] }); }
    if (this.chimeNow > 0) this.chimeNow--;
  },

  // ── 調べる（第4章） ──
  useSpot4(s) {
    const T = this.events.texts || {};
    switch (s.kind) {
      case 'logs': this.openLogs(); return true;
      case 'returnbox':
        if (this.flags.card_b07) { this.sayText(T.of_return_done); return true; }
        if (!this.flags.logs_done) { this.sayText(T.of_return_need); return true; }
        this.flags.card_b07 = true; this.sfx.play('pickup'); this.ui.log('職員証 B-07 を手に入れた'); this.halos.setColor(this.area.dyn.returnHalo, 0x60ff90);
        if (this.area.dyn.evHalo != null) this.halos.setColor(this.area.dyn.evHalo, 0x40ff80);
        this.playEvent('ev_b07', () => { if (this.story.step === 'ch4_vault' || this.story.step === 'ch4_logs' || this.story.step === 'ch4_office') this.later(0.3, () => this.playCutscene('cs04_broadcast')); });
        return true;
      case 'matchlock':
        if (this.F().owned.includes('matchlock')) { this.sayText(T.of_matchlock_done); return true; }
        this.giveMatchlock(); this.playEvent('ev_matchlock'); return true;
      case 'clue': {
        const id = s.clue;
        if (!['report', 'power', 'coverup', 'manual', 'maint'].includes(id)) return false;
        this.flags['seen_' + id] = true; this.sayText(T[id + '_text']); this.addDoc('ch4_' + id); this.metrics.puzzles['ch4_' + id] = true;
        if ((id === 'report' || id === 'power') && this.flags.seen_logs && !this.flags.logs_done) this.afterDialog = () => this.openLogs();
        return true;
      }
      case 'terminal': this.openTerminal(); return true;
      case 'breaker': this.openBreakers(); return true;
      case 'valve': this.openValve(s); return true;
    }
    if (s.kind === 'exit' && s.to === 'office' && this.area.id === 'lab' && atLeast(this.story.step, 'ch4_branch')) { this.sayText('今は戻れない。'); return true; }
    return false;
  },
  giveMatchlock() {
    const F = this.F(); F.give('matchlock'); F.mLoaded = true; this.sfx.play('equip'); this.flags.matchlock = true; this.metrics.matchlock = true;
    if (this.area.dyn.matchlockCase) this.area.dyn.matchlockCase.visible = false;
    this.ui.log('火縄銃を手に入れた（4 キー／替。紫：銃床で打つ・白：妖弾）');
  },
  /** 入退室の記録の照合（必須）：止まっていた間に記録のある行＝あり得ない時刻 */
  openLogs() {
    this.flags.seen_logs = true; if (this.story.step === 'ch4_office') this.setStep('ch4_logs');
    if (this.flags.logs_done) { this.sayText('入退室の記録。00:52 の B-07 の行に印をつけてある。'); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    const st = this.puz.logs || { miss: 0, done: false };
    const known = this.flags.seen_report || this.flags.seen_power;
    const note = known ? `停電 ${OFFICE.accident.time} から非常電源の切り替え ${OFFICE.offline.to} まで、読み取り機は止まっていた。……この間に「記録がある」行は？` : '何かと照らし合わせたい。停電の記録（監視室の事故報告書・電気室の保全記録）を見てからでも選べる。';
    this.ui.logsUI(OFFICE.logs, st, id => {
      const ns = pickLog(this.puz.logs || {}, id); this.puz.logs = ns; this.sfx.play(ns.done ? 'ui_ok' : 'ui_ng');
      if (ns.done) { setTimeout(() => this.finishLogs(), 300); return null; }
      return ns;
    }, () => { this.ui.closePuzzle(); this.resume(); }, note);
  },
  finishLogs() {
    this.ui.closePuzzle(); this.mode = 'play'; this.flags.logs_done = true; this.metrics.puzzles.logs = true; this.addDoc('ch4_logs');
    if (['ch4_office', 'ch4_logs'].includes(this.story.step)) this.setStep('ch4_vault');
    this.playEvent('ev_logs_done');
  },
  /** 試験端末：呼び出しの音／試験終了の合図（手順書を読むと分かる）＝救う */
  openTerminal() {
    const T = this.events.texts || {};
    const opts = [{ id: 'chime', label: '呼び出しの音', sub: '応答体が端末へ集まる（輪）' }];
    if (this.flags.seen_manual) opts.push({ id: 'end', label: '試験終了の合図（短い音を三つ）', sub: '戦っていない応答体は横たわる' });
    opts.push({ id: 'close', label: 'やめる', sub: '' });
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.choiceUI(this.flags.seen_manual ? '試験端末' : '試験端末（どの音が何の合図か、手順書があれば……）', opts, id => {
      this.ui.closePuzzle(); this.mode = 'play';
      if (id === 'chime') { this.chimeT = 99; this.sfx.play('chime'); }
      if (id === 'end') {
        this.sfx.play('end_signal'); let n = 0;
        for (const e of this.enemies) if (e.kind === 'outou' && d2(e.pos, this.player.pos) < 16) { const ev = []; if (e.brain.endSignal(ev)) n++; this.enemyEvents(e, ev); }
        this.metrics.endSignal = (this.metrics.endSignal || 0) + n; this.ui.log(n ? `試験終了の合図：横たわった応答体 ${n}` : '……応答は無い（戦っている相手には届かない）');
        if (n) this.bark('outou_end_signal', 2.4);
      }
    }, T.terminal_idle);
  },
  /** 配電盤（secret の必須）：非常電源の容量 3 のうちに隔壁と鎮静 */
  openBreakers() {
    if (this.flags.breaker_ok) { this.sayText('配電盤：隔壁・鎮静に電気が回っている。'); return; }
    if (!this.ch4Secret() || !atLeast(this.story.step, 'ch4_s_power')) { this.sayText('配電盤。今は主電源で動いている。'); return; }
    this.mode = 'puzzle'; this.input.exitLock();
    const on = new Set(this.breakerOn || []);
    this.ui.breakerUI(BREAKERS, on, this.flags.seen_maint, ids => {
      const r = checkBreakers(ids); this.metrics.breakerTries = (this.metrics.breakerTries || 0) + 1; this.breakerOn = ids;
      this.sfx.play('breaker');
      if (r.ok) { setTimeout(() => this.finishBreakers(), 250); return { ok: true, msg: `負荷 ${r.load}／${BREAKERS.capacity}：隔壁と鎮静に電気が回った` }; }
      const msg = { over: `負荷 ${r.load}／${BREAKERS.capacity}：容量を超えて落ちた`, reactor: '応答炉に電気が回りかけた！　すぐ切った（応答体が騒ぐ）', door: '隔壁に電気が来ていない', sedation: '鎮静が切れている（槽が騒がしい）' }[r.why];
      if (r.why === 'reactor') { this.sfx.play('alarm'); for (const e of this.enemies) if (e.kind === 'outou' && e.brain.alive && !e.brain.resolution) { const ev = []; e.brain.resonate(ev, 0.8, this.player.pos); this.enemyEvents(e, ev); } }
      return { ok: false, msg };
    }, () => { this.ui.closePuzzle(); this.resume(); });
  },
  finishBreakers() {
    this.ui.closePuzzle(); this.mode = 'play'; this.flags.breaker_ok = true; this.metrics.puzzles.breaker = true;
    const D = this.area.dyn.bulkhead; if (D && !D.open) { D.open = true; D.target = D.up; const i = this.area.boxes.indexOf(D.box); if (i >= 0) this.area.boxes.splice(i, 1); }
    if (this.area.dyn.bulkHalo != null) { this.halos.setColor(this.area.dyn.bulkHalo, 0x40ff80); const h = this.area.halos[this.area.dyn.bulkHalo]; if (h) h.hazard = false; }
    if (this.area.dyn.breakerHalo != null) { this.halos.setK(this.area.dyn.breakerHalo, 0.8); this.halos.setColor(this.area.dyn.breakerHalo, 0x60ff90); }
    if (this.story.step === 'ch4_s_power') this.setStep('ch4_s_sneak');
    this.playEvent('ev_breaker_done', () => this.later(0.4, () => this.playEvent('ev_ch4_secret_hint')));
  },
  /** 蒸気の弁：通路を蒸気で満たす（姿が隠れる）。配電盤で鎮静が入っていれば、戦っていない応答体は座り込む＝無力化 */
  openValve(s) {
    if (this.flags.steam) { this.sayText((this.events.texts || {}).valve_done); return; }
    this.flags.steam = true; this.steamT = 0; this.sfx.play('steam'); this.bark('steam_on', 2.4); this.metrics.steam = true;
    if (this.flags.breaker_ok) { let n = 0; for (const e of this.enemies) if (e.kind === 'outou' && this.inSteam(e.pos)) { const ev = []; if (e.brain.sedate(ev)) n++; this.enemyEvents(e, ev); } if (n) this.ui.log(`鎮静の蒸気：座り込んだ応答体 ${n}`); }
  },
  inSteam(p) { if (!this.flags.steam || this.area.id !== 'lab') return false; const Z = LAB.steam; return p.x > Z.minX && p.x < Z.maxX && p.z > Z.minZ && p.z < Z.maxZ; },
  stepSteam(dt) {
    this.steamT = (this.steamT || 0) + dt; const Z = LAB.steam;
    if (this.steamT > 28) { this.flags.steam = false; return; }
    const cp = this.camera.position;
    if (Math.random() < 0.5) { const x = Z.minX + Math.random() * (Z.maxX - Z.minX), z = Z.minZ + Math.random() * (Z.maxZ - Z.minZ); if (Math.hypot(x - cp.x, z - cp.z) > 2.5) this.fx.puff(x, 0.3 + Math.random() * 1.6, z, (Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.3, 0xd8dce8, 2.2, 0.2); }
  },

  // ── 分岐（第4章の 1 か所だけ） ──
  /** 分岐の前：専用の枠に書いてから選択（時間制限なし・両方いつも選べる） */
  openBranch() {
    if (this.story.step !== 'ch4_branch') this.setStep('ch4_branch');
    this.flags.branch_pending = true; delete this.flags.branch_secret_trial;
    if (!this.loadedBranch) { this.saveSlot('branch', true); this.metrics.branchSaved = (this.metrics.branchSaved || 0) + 1; }
    this.mode = 'puzzle'; this.input.exitLock();
    const opts = [{ id: 'reveal', label: '化けを、解く', sub: '白い姿で群れを払う（（相棒）が見ることになる）' }, { id: 'secret', label: 'このまま、人として戦う', sub: '紫の姿の技だけで切り抜ける（むずかしい）' }];
    this.ui.choiceUI('……どうする？', opts, id => { this.ui.closePuzzle(); this.mode = 'play'; this.chooseBranch(id); }, '');
    this.metrics.branchOpened = (this.metrics.branchOpened || 0) + 1;
  },
  chooseBranch(id) {
    delete this.flags.branch_pending; this.metrics.branchPick = id;
    if (this.cut.active) this.cut.skip();
    const F = this.F();
    if (id === 'reveal') {
      this.lockRoute('reveal', {});
      this.playCutscene('cs04_reveal');
    } else {
      this.flags.branch_secret_trial = true; this.trialLosses = this.trialLosses || 0;
      if (F.white) this.setWhite(false, 'scripted');
      F.yokiOn = false;
      this.playCutscene('cs04_suppress');
    }
  },
  /** ルートを確定して記録する（branchLog：再現用の項目つき）→ 自動セーブ */
  lockRoute(route, ext = {}) {
    const via = this.loadedBranch ? 'load_branch' : 'choice';
    this.route = choose(this.route, route, Object.assign({ chapter: 'ch04', step: 'branch', via: ext.via || via, at: new Date().toISOString(), saveVer: SAVE_VER, gameVer: GAME_VER, seed: this.seed || 918273,
      snapshot: { trust: this.companion.brain.trust, docs: (this.route.docs || []).length, yokaiUses: (this.route.yokaiLog || []).length } }, ext));
    this.flags.branch_chosen_once = true; this.loadedBranch = false;
    const F = this.F();
    if (route === 'reveal') { this.route.forms.whiteFree = true; this.route.forms.whiteUnlocked = true; this.route.reveal.companionKnows = true; F.yokiOn = true; F.yoki = Math.max(F.yoki, 80); }
    else { F.yokiOn = false; if (F.white) this.setWhite(false, 'scripted'); }
    this.metrics.routeLock = route;
    this.saveSlot('auto', true);
  },
  /** 秘匿の試練で倒れた：やり直し・手助け（3 回から）・選択に戻る（勝手に白い姿にはしない） */
  onDead4() {
    const s = this.story.step;
    if (s === 'ch4_s_trial') {
      this.trialLosses = (this.trialLosses || 0) + 1; this.metrics.trialLosses = this.trialLosses;
      setTimeout(() => {
        this.mode = 'puzzle'; this.input.exitLock();
        const opts = [{ id: 'again', label: 'もう一度', sub: '同じ戦いを、直前から' }];
        if (this.trialLosses >= 3) opts.push({ id: 'assist', label: '手助けあり', sub: '敵の数 −1・見切りの窓 +50%（記録に残るだけ）' });
        opts.push({ id: 'back', label: '選択に戻る', sub: '分岐の前へ（勝手に白い姿にはならない）' });
        this.ui.choiceUI('倒れた……', opts, id => { this.ui.closePuzzle(); this.mode = 'play'; if (id === 'back') { this.loadSlot('branch'); return; } this.resetTrial(id === 'assist'); }, `負けた回数 ${this.trialLosses}`);
      }, this.isTest() ? 10 : 1200);
      return true;
    }
    return false;
  },
  resetTrial(assist) {
    const F = this.F(); F.st = { name: 'free', f: 0 }; F.hp = F.hpMax; F.invulnUntil = F.frame + 60; F.mikiri = F.hajiki = F.utsu = F.chain = null;
    if (assist) this.flags.trial_assist = true;
    for (const e of this.enemies.filter(x => x.trap)) { this.scene.remove(e.root); }
    this.enemies = this.enemies.filter(x => !x.trap);
    for (const id of TRAP_IDS) delete this.enemyRes[id];
    this.placePlayer([0, 0, -3.4], Math.PI); this.trapDone = false;
    this.spawnTrap(null, false); this.trapFight();
    if (this.flags.trial_assist) { F.setDifficulty(this.settings.difficulty, { touch: this.touch, assist: this.settings.assist }); F.w.just = Math.round(F.w.just * 1.5); F.w.mikiri = Math.round(F.w.mikiri * 1.5); F.w.hajiki = Math.round(F.w.hajiki * 1.5); }
    this.metrics.trialAssist = !!this.flags.trial_assist;
  },

  // ── secret：非常停止・守り ──
  applyEmergency(on) {
    if (this.area.id !== 'lab') return;
    this.flags.emergency = !!on;
    for (const l of this.area.lights) { if (l.hall) l.off = on; if (l.warn) l.intensity = on ? 9 : l.base; if (l.tank) l.intensity = on ? l.base * 0.5 : l.base; }
    this.darkness = on ? 0.45 : 0;
    if (on && this.ch4Secret() && ['ch4_s_power', 'ch4_s_sneak', 'ch4_s_trial'].includes(this.story.step)) this.spawnRoam();
  },
  /** secret：非常停止のあと、制御室への通路をうろつく応答体（鎮静が切れかけ） */
  spawnRoam() {
    const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    for (const o of LAB.roam) if (!this.enemyRes[o.id] && !this.enemies.some(e => e.id === o.id)) this.addOutou(add, o, { path: o.path });
  },
  holdStart() {
    this.hold = { t: 0, prog: 0, wave: 0, spawned: 0, grabs: 0 };
    const C = this.companion; C.root.visible = true; C.brain.setMode('scripted'); C.brain.pos = { x: LAB.hold.console[0] - 0.4, z: LAB.hold.console[1] }; C.brain.yaw = Math.PI / 2; C.anim = null;
    this.ui.boss('（相棒）の操作', 0, '応答炉の停止まで守る'); this.hint('換気口から来る応答体を、（相棒）に近づけない（つかまれたら叩いて離す）'); this.later(5, () => this.hint(null));
  },
  stepHold(dt) {
    const H = this.hold; if (!H || this.cut.active || H.done) return;
    const C = this.companion, grabbed = C.brain.mode === 'grabbed';
    if (!grabbed && C.brain.mode !== 'scripted') { C.brain.setMode('scripted'); C.brain.pos = { x: LAB.hold.console[0] - 0.4, z: LAB.hold.console[1] }; C.brain.yaw = Math.PI / 2; C.anim = null; }
    H.t += dt; if (!grabbed) H.prog += dt;
    const W = LAB.hold.waves;
    while (H.wave < W.length && H.t >= W[H.wave].at) { this.spawnWave(W[H.wave].n, H.wave); H.wave++; }
    if (grabbed && !H.wasGrabbed) { H.grabs++; this.bark('companion_hold_grab', 2.4); this.sfx.play('scream', C.brain.pos); }
    H.wasGrabbed = grabbed;
    if (!H.half && H.prog > LAB.hold.sec / 2) { H.half = true; this.bark('hold_half', 2); }
    this.ui.boss('（相棒）の操作', Math.min(1, H.prog / LAB.hold.sec), grabbed ? 'つかまれた！　叩いて離す' : '応答炉の停止まで守る', grabbed);
    if (H.prog >= LAB.hold.sec && !H.done) {
      H.done = true; this.ui.boss(null); this.metrics.holdSec = Math.round(H.t); this.metrics.holdGrabs = H.grabs;
      for (const e of this.enemies) if (e.hold && e.brain.alive) { const ev = []; e.brain.sedate(ev, true); this.enemyEvents(e, ev); }
      this.later(0.8, () => this.playCutscene('cs04_s_end'));
    }
  },
  spawnWave(n, wi) {
    const add = (brain, model) => { const e = new EnemyActor(brain, model); this.enemies.push(e); this.scene.add(e.root); return e; };
    for (let i = 0; i < n; i++) {
      const dr = LAB.hold.doors[(i + wi) % LAB.hold.doors.length], id = `hold_${wi}_${i}`;
      const e = this.addOutou(add, { id, pos: [dr[0] + (i % 2 ? 0.6 : -0.6), dr[1] + (dr[1] > -18 ? 0.8 : -0.8)] }, { state: 'hostile', leash: 40 });
      e.hold = true; e.targetCompanion = true; e.brain.hostileBy = 'hold'; e.brain.cool = 1.2 + i * 0.5;
      this.fx.mist(new THREE.Vector3(e.pos.x, 0, e.pos.z), 20, 1.6);
    }
    this.sfx.play('outou_voice', { x: LAB.hold.doors[0][0], z: LAB.hold.doors[0][1] });
  },
  /** 相棒を狙う応答体の攻め：だんのうらが近ければ普通に、離れていれば相棒をつかむ（操作が止まる） */
  hitCompanion4(e, A) {
    const C = this.companion, b = e.brain, P = this.player.pos;
    if (d2(b.pos, P) < (A.range || 2) + 0.8) return null;                                   // だんのうらが間に入っている：普通に当たる
    if (C.root.visible && d2(b.pos, C.brain.pos) < (A.range || 2) + 0.6 && C.brain.mode !== 'grabbed') { if (C.brain.grabbedBy(e.id)) { e.held = true; b.cool = 99; } return 'companion'; }
    return 'miss';
  },

  // ── 巨大猫又 ──
  enterGiant(grow) {
    if (this.giantMode) return;
    const P = this.player;
    if (!this.giantModel) { this.giantModel = buildGiantNekomata(); this.giantModel.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; }); }
    const m = this.giantModel, root = this.giantRoot || (this.giantRoot = new THREE.Group());
    if (!root.children.includes(m.root)) root.add(m.root); this.scene.add(root);
    const G = this.giant = { model: m, root, pos: { x: P.pos.x, z: P.pos.z }, yaw: P.yaw, fighter: new GiantFighter(), anim: new GiantAnimator(m), phase: 0, speed: 0, turn: 0, scale: grow ? 0.25 : COMBAT.giant.scale, growT: grow ? 0 : null, leapDir: null, beamT: 0, hits: 0, dmgDealt: 0 };
    root.position.set(G.pos.x, 0, G.pos.z); root.rotation.y = G.yaw; root.scale.setScalar(G.scale); root.visible = true;
    P.root.visible = false; this.giantMode = true;
    this.route.forms.giantSeen = true;
    this.route = logYokai(this.route, { chapter: 'ch04', step: this.story.step, form: 'giant', src: 'scripted', sec: Math.round(this.playSec) });
    this.ui.root.classList.add('giant'); this.ui.form(true);
    if (!this.giantHalos) { const H = this.halos; this.giantHalos = { eyes: [H.add([0, -50, 0], 0.7, 0xd8a0ff, 0), H.add([0, -50, 0], 0.7, 0xd8a0ff, 0)], paws: [0, 1, 2, 3].map(() => H.add([0, -50, 0], 3.2, 0xa060ff, 0)), tails: [H.add([0, -50, 0], 4.5, 0xb070ff, 0), H.add([0, -50, 0], 4.5, 0xb070ff, 0)], beam: H.add([0, -50, 0], 6, 0xd090ff, 0) }; }
    this.sfx.play('giant_roar'); this.cam.shake(0.3, 0.5);
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 4; this.fx.puff(P.pos.x + Math.sin(a) * r, Math.random() * 6, P.pos.z + Math.cos(a) * r, Math.sin(a) * 2, 2 + Math.random() * 2, Math.cos(a) * 2, i % 3 ? 0x9a5aff : 0xf0e0ff, 1.6 + Math.random(), 0.45); }
  },
  exitGiant() {
    if (!this.giantMode) return;
    const G = this.giant, P = this.player;
    this.giantRoot.visible = false; this.scene.remove(this.giantRoot); this.giantMode = false;
    P.pos.set(G.pos.x, 0, G.pos.z); P.root.visible = true; this.ui.root.classList.remove('giant');
    if (this.giantHalos) { const H = this.halos; for (const i of [...this.giantHalos.eyes, ...this.giantHalos.paws, ...this.giantHalos.tails, this.giantHalos.beam]) { H.setK(i, 0); H.setPos(i, 0, -50, 0); } }
    for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * 6; this.fx.puff(G.pos.x + Math.sin(a) * r, Math.random() * 8, G.pos.z + Math.cos(a) * r, 0, 1, 0, i % 2 ? 0x9a5aff : 0xf0e0ff, 1.8, 0.4); }
    this.metrics.giantDone = true;
  },
  giantBoss() { return this.enemies.find(e => e.kind === 'sakibure') || null; },
  stepGiant(I) {
    const G = this.giant, F = G.fighter, C = COMBAT.giant;
    if (I.lock) this.lock = this.lock ? null : this.giantBoss();
    const boss = this.giantBoss(), bAlive = boss && boss.brain.alive && boss.root.visible;
    const fw = this.cam.forward(), rt = { x: -fw.z, z: fw.x };
    const mx = fw.x * I.moveY + rt.x * I.moveX, mz = fw.z * I.moveY + rt.z * I.moveX, mag = Math.min(1, Math.hypot(mx, mz));
    const evs = F.tick({ attack: I.attack, dodge: I.dodge, parry: I.parry, aim: I.aim || I.heavy });
    const toBoss = bAlive ? Math.atan2(boss.pos.x - G.pos.x, boss.pos.z - G.pos.z) : G.yaw;
    for (const ev of evs) this.giantEvent(ev, boss, toBoss, mx, mz, mag);
    for (const ev of F.drain()) this.giantEvent(ev, boss, toBoss, mx, mz, mag);
    // 動き
    const st = F.st, before = { x: G.pos.x, z: G.pos.z };
    if (st.name === 'leap' && G.leapDir) { if (st.f >= 3 && st.f <= 36) { const v = C.leap.dist / 34; G.pos.x += G.leapDir.x * v; G.pos.z += G.leapDir.z * v; } G.y = Math.sin(Math.min(1, st.f / 40) * Math.PI) * 5.5; }
    else {
      G.y = 0;
      if (st.name === 'claw' && st.f < st.atk.startup + st.atk.active) { const k = st.atk.lunge / (st.atk.startup + st.atk.active); G.pos.x += Math.sin(G.yaw) * k; G.pos.z += Math.cos(G.yaw) * k; G.yaw += wrap(toBoss - G.yaw) * (bAlive && d2(boss.pos, G.pos) < 40 ? 0.15 : 0); }
      else if (st.name === 'beam') { if (bAlive) G.yaw += wrap(toBoss - G.yaw) * 0.03; if (mag > 0.1) { G.yaw += wrap(Math.atan2(mx, mz) - G.yaw) * 0.02; } }
      else if (st.name === 'roar') { if (bAlive) G.yaw += wrap(toBoss - G.yaw) * 0.08; }
      else {
        const sp = (I.run ? C.speed.run : C.speed.walk) * F.moveMul() * mag;
        if (mag > 0.05) { G.pos.x += mx / mag * sp * DT; G.pos.z += mz / mag * sp * DT; G.yaw += wrap(Math.atan2(mx, mz) - G.yaw) * 0.12; }
        else if (this.lock && bAlive) G.yaw += wrap(toBoss - G.yaw) * 0.05;
      }
    }
    // 小物：大きな物（コンテナ・槽・小屋・クレーン）は押し返す。柵・照明の塔は踏むと倒れる
    for (const p of this.area.dyn.props || []) {
      if (!p.alive) continue; const d = Math.hypot(G.pos.x - p.x, G.pos.z - p.z), min = C.r * 0.8 + p.r;
      if (d < min) { if (p.kind === 'fence' || p.kind === 'tower') { if (st.name !== 'leap' || st.f > 34) this.damageProp(p, 999, 'step'); } else if (d > 1e-3 && st.name !== 'leap') { G.pos.x = p.x + (G.pos.x - p.x) / d * min; G.pos.z = p.z + (G.pos.z - p.z) / d * min; } }
    }
    if (bAlive) { const d = d2(G.pos, boss.pos), min = C.r + boss.r * 0.9; if (d < min && d > 1e-3) { G.pos.x = boss.pos.x + (G.pos.x - boss.pos.x) / d * min; G.pos.z = boss.pos.z + (G.pos.z - boss.pos.z) / d * min; } }
    const Bd = this.area.bounds; G.pos.x = Math.max(Bd.minX + C.r, Math.min(Bd.maxX - C.r, G.pos.x)); G.pos.z = Math.max(Bd.minZ + C.r, Math.min(Bd.maxZ - C.r, G.pos.z));
    const moved = Math.hypot(G.pos.x - before.x, G.pos.z - before.z); G.speed = moved / DT / (G.scale / 8);
    const prevPh = G.phase; G.phase += moved * 0.42;
    if (st.name !== 'leap' && moved > 0.01 && Math.floor(prevPh / Math.PI) !== Math.floor(G.phase / Math.PI)) { this.sfx.play('giant_step'); this.cam.shake(0.05, 0.12); this.fx.dust({ x: G.pos.x + Math.sin(G.yaw) * 4, z: G.pos.z + Math.cos(G.yaw) * 4 }, 6); }
    // 巨大化の妖力
    if (F.weak && !this.flags.giant_weak_bark) { this.flags.giant_weak_bark = true; this.bark('giant_weak', 2.4); }
    this.player.pos.set(G.pos.x, 0, G.pos.z); this.player.yaw = G.yaw;          // 音・ミニマップ・ロックの基準
    if (this.god) F.hp = F.hpMax;
  },
  giantEvent(ev, boss, toBoss, mx, mz, mag) {
    const G = this.giant, F = G.fighter, C = COMBAT.giant;
    const bAlive = boss && boss.brain.alive && boss.root.visible;
    this.metrics.events.push({ t: 'g_' + ev.t, frame: this.frame }); if (this.metrics.events.length > 400) this.metrics.events.shift();
    switch (ev.t) {
      case 'clawStart': if (bAlive && d2(boss.pos, G.pos) < 45) G.yaw = G.yaw + wrap(toBoss - G.yaw) * 0.6; this.sfx.play('giant_claw'); G.swingHit = false; this.metrics.giantClaws = (this.metrics.giantClaws || 0) + 1; break;
      case 'clawActive': {
        const a = ev.atk, hx = G.pos.x + Math.sin(G.yaw) * a.reach * 0.6, hz = G.pos.z + Math.cos(G.yaw) * a.reach * 0.6;
        if (ev.first) { const s = G.model.claws[(ev.step % 2) ? 1 : 0]; const v = new THREE.Vector3(); s.getWorldPosition(v); for (let k = -1; k <= 1; k++) this.fx.streak(new THREE.Vector3(hx + Math.cos(G.yaw) * 6 + k * 1.2, 9 + k, hz - Math.sin(G.yaw) * 6), new THREE.Vector3(hx - Math.cos(G.yaw) * 6 + k * 1.2, 2 + k, hz + Math.sin(G.yaw) * 6), k ? 0xb070ff : 0xf4e8ff, 0.35, 0.5); this.cam.shake(0.12, 0.18); }
        if (!G.swingHit && bAlive) { const d = d2(boss.pos, G.pos), ang = Math.abs(wrap(toBoss - G.yaw)) * 180 / Math.PI; if (d <= a.reach + boss.r && (ang <= a.arc / 2 + 15 || d < boss.r + 4)) { G.swingHit = true; this.giantHitBoss(boss, Math.round(a.dmg * ev.mul * (ev.atk.counter ? 1.5 : 1)), a.poise); } }
        for (const p of this.area.dyn.props || []) if (p.alive) { const d = Math.hypot(p.x - G.pos.x, p.z - G.pos.z), ang = Math.abs(wrap(Math.atan2(p.x - G.pos.x, p.z - G.pos.z) - G.yaw)) * 180 / Math.PI; if (d <= a.reach + p.r && ang <= a.arc / 2) this.damageProp(p, a.dmg, 'claw'); }
        break;
      }
      case 'roar': this.sfx.play('giant_roar'); this.metrics.giantRoars = (this.metrics.giantRoars || 0) + 1; break;
      case 'roarBurst': {
        this.cam.shake(0.25, 0.4); this.ui.flash('issen');
        for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; this.fx.puff(G.pos.x + Math.sin(a) * 6, 4, G.pos.z + Math.cos(a) * 6, Math.sin(a) * 18, 1, Math.cos(a) * 18, 0xb070ff, 0.9, 0.5); }
        if (bAlive && boss.brain.atk && boss.brain.atk.phase === 'windup' && boss.brain.def.attacks[boss.brain.atk.name].parryable && d2(boss.pos, G.pos) < C.roar.range + boss.r) { const e2 = []; boss.brain.roared(e2); this.bossEvents4(boss, e2); }
        else if (bAlive && d2(boss.pos, G.pos) < C.roar.range + boss.r) { const e2 = []; boss.brain.hurt(ev.dmg, 'shot', e2, { poise: 20 }); this.bossEvents4(boss, e2); }
        for (const p of this.area.dyn.props || []) if (p.alive && (p.kind === 'fence' || p.kind === 'tower') && Math.hypot(p.x - G.pos.x, p.z - G.pos.z) < 14) this.damageProp(p, 999, 'roar');
        break;
      }
      case 'noGauge': this.ui.toast(`巨大化の妖力が足りない（${ev.need}）`, 'weak', 1); this.sfx.play('no_yoki'); break;
      case 'leap': {
        G.leapDir = mag > 0.1 ? { x: mx / mag, z: mz / mag } : { x: -Math.sin(G.yaw), z: -Math.cos(G.yaw) };
        this.sfx.play('dash'); this.metrics.giantLeaps = (this.metrics.giantLeaps || 0) + 1;
        for (let i = 0; i < 16; i++) this.fx.puff(G.pos.x + (Math.random() - 0.5) * 8, 1, G.pos.z + (Math.random() - 0.5) * 8, 0, 3, 0, 0x6a6470, 1.0, 0.4);
        break;
      }
      case 'land': {
        this.sfx.play('land'); this.cam.shake(0.3, 0.35);
        for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; this.fx.puff(G.pos.x + Math.sin(a) * 5, 0.6, G.pos.z + Math.cos(a) * 5, Math.sin(a) * 9, 1, Math.cos(a) * 9, 0x8a50e0, 0.8, 0.5); }
        if (bAlive && d2(boss.pos, G.pos) < ev.r + boss.r) this.giantHitBoss(boss, Math.round(ev.dmg * F.dmgMul()), 30);
        for (const p of this.area.dyn.props || []) if (p.alive && Math.hypot(p.x - G.pos.x, p.z - G.pos.z) < ev.r + p.r * 0.5) this.damageProp(p, ev.dmg, 'land');
        break;
      }
      case 'just': this.ui.toast('見切り', 'just', 1.0); this.sfx.play('just'); this.slowT = 30; this.slowScale = 0.3; this.ui.slow(true); this.metrics.giantJust = (this.metrics.giantJust || 0) + 1; break;
      case 'roarCounter': this.ui.toast('咆哮返し', 'parry', 1.0); this.sfx.play('parry'); if (bAlive) { const e2 = []; boss.brain.roared(e2); this.bossEvents4(boss, e2); } this.metrics.giantCounter = (this.metrics.giantCounter || 0) + 1; break;
      case 'beamStart': this.sfx.play('beam'); G.beamOn = true; this.metrics.giantBeams = (this.metrics.giantBeams || 0) + 1; break;
      case 'beamTick': {
        const head = G.model.eyes[0], v = new THREE.Vector3(); head.getWorldPosition(v);
        const dir = { x: Math.sin(G.yaw), z: Math.cos(G.yaw) }, end = { x: G.pos.x + dir.x * ev.range, z: G.pos.z + dir.z * ev.range };
        this.fx.streak(new THREE.Vector3(v.x + dir.x * 1.5, v.y - 0.6, v.z + dir.z * 1.5), new THREE.Vector3(end.x, 2, end.z), 0xd090ff, 0.12, 1.2);
        this.fx.streak(new THREE.Vector3(v.x + dir.x * 1.5, v.y - 0.6, v.z + dir.z * 1.5), new THREE.Vector3(end.x, 2, end.z), 0xffffff, 0.08, 0.4);
        if (bAlive && segDist(boss.pos, G.pos, end) < ev.width / 2 + boss.r) this.giantHitBoss(boss, Math.round(ev.dmg * F.dmgMul()), 6, true);
        for (const p of this.area.dyn.props || []) if (p.alive && segDist(p, G.pos, end) < ev.width / 2 + p.r) this.damageProp(p, ev.dmg, 'beam');
        break;
      }
      case 'beamEnd': G.beamOn = false; break;
      case 'hurt': this.sfx.play('hurt'); this.cam.shake(0.3, 0.3); this.ui.flash('hurt'); this.metrics.giantHurt = (this.metrics.giantHurt || 0) + 1; break;
      case 'dead': this.metrics.giantDeaths = (this.metrics.giantDeaths || 0) + 1; this.onPlayerDead(); break;
    }
  },
  giantHitBoss(boss, dmg, poise, beam) {
    const G = this.giant, F = G.fighter, evs = [];
    const core = boss.brain.coreOpen;
    const r = boss.brain.hurt(dmg, beam ? 'shot' : 'slash', evs, { poise });
    if (r) { F.registerHit(); G.dmgDealt += r; G.hits++; this.metrics.giantHits = (this.metrics.giantHits || 0) + 1; if (core) this.metrics.coreHits = (this.metrics.coreHits || 0) + 1; boss.looks.hit(boss.pos.x - G.pos.x, boss.pos.z - G.pos.z, boss.brain.yaw, beam ? 0.2 : 0.9); if (!beam) { this.hitstop = core ? 6 : 4; this.sfx.play('hit_heavy'); const v = new THREE.Vector3(boss.pos.x, 8, boss.pos.z); this.fx.sparks(v, core ? 30 : 16, core ? 0xff8ad8 : 0xe8d0ff); } }
    this.bossEvents4(boss, evs);
  },
  /** 先触れの出来事（予兆の印・当たり・段階・崩れ・倒れ） */
  bossEvents4(e, evs) {
    const b = e.brain, G = this.giant;
    for (const ev of evs) {
      switch (ev.t) {
        case 'telegraph': {
          const A = ev.def, col = A.parryable ? 0xffe8f0 : 0xff3040; e.tele = A.parryable ? 'parry' : 'red';
          this.sfx.play(A.parryable ? 'tel_parry' : 'tel_red'); this.sfx.play('boss_roar');
          if (ev.name === 'sweep') this.fx.decal('arc', b.pos.x, b.pos.z, { r: A.range, arc: A.arc, yaw: b.yaw, dur: A.windup, hold: 0.3, color: col });
          if (ev.line) { const dx = ev.line.to.x - ev.line.from.x, dz = ev.line.to.z - ev.line.from.z, L = Math.max(10, Math.hypot(dx, dz) + (ev.name === 'beam' ? 20 : 4)); this.fx.decal('line', ev.line.from.x, ev.line.from.z, { r: L, w: ev.line.w, yaw: Math.atan2(dx, dz), dur: A.windup, hold: A.active, color: col }); }
          if (ev.circles) for (const c of ev.circles) this.fx.decal('circle', c.x, c.z, { r: c.r, dur: A.windup, hold: 0.3, color: col });
          if (ev.name === 'feed') { this.bark('giant_feed', 2.4); this.ui.toast('「喰らう」── ポンプ室を狙っている', 'weak', 1.6); }
          this.bossTele = { name: ev.name, parryable: A.parryable, t: this.playSec };
          break;
        }
        case 'attack': this.bossAttack4(e, ev); break;
        case 'hurt': if (ev.core && !this.flags.core_bark) { this.flags.core_bark = true; this.bark('giant_core', 2.2); } break;
        case 'roared': this.ui.toast(ev.interrupted ? '止めた ── 胸の輪が開く' : 'ひるんだ', 'parry', 1.2); this.metrics.bossRoared = (this.metrics.bossRoared || 0) + 1; if (!this.flags.core_bark) { this.flags.core_bark = true; this.later(0.3, () => this.bark('giant_core', 2.2)); } break;
        case 'broken': this.ui.toast('崩し ── 胸の輪が開く', 'parry', 1.2); this.sfx.play('broken'); break;
        case 'phase': this.ui.toast(ev.n === 1 ? '先触れが速くなる' : '先触れが暴れる', 'weak', 1.4); this.sfx.play('boss_roar'); this.cam.shake(0.2, 0.4); break;
        case 'die': this.resolve(e, 'kill'); this.ui.boss(null); this.lock = null; this.metrics.bossTime4 = Math.round(this.playSec - (this.metrics.bossStart4 || this.playSec)); this.later(0.8, () => this.playCutscene('cs04_giant_end')); break;
      }
    }
    void G;
  },
  bossAttack4(e, ev) {
    const b = e.brain, G = this.giant, F = G && G.fighter, A = ev.def, C = COMBAT.giant;
    if (!G) return;
    const gp = G.pos; let inRange = false, near = false;
    if (ev.name === 'sweep') { const d = d2(b.pos, gp), ang = Math.abs(wrap(Math.atan2(gp.x - b.pos.x, gp.z - b.pos.z) - b.yaw)) * 180 / Math.PI; inRange = d <= A.range + C.r && ang <= A.arc / 2 + 10; near = d <= A.range + C.r + 8; for (const p of this.area.dyn.props || []) if (p.alive) { const dp = d2(b.pos, p), ap = Math.abs(wrap(Math.atan2(p.x - b.pos.x, p.z - b.pos.z) - b.yaw)) * 180 / Math.PI; if (dp <= A.range && ap <= A.arc / 2) this.damageProp(p, 20, 'boss'); } this.cam.shake(0.25, 0.35); this.sfx.play('slam'); }
    if (ev.name === 'beam') { const L = ev.line, dx = L.to.x - L.from.x, dz = L.to.z - L.from.z, n = Math.hypot(dx, dz) || 1, end = { x: L.from.x + dx / n * A.range, z: L.from.z + dz / n * A.range }; const dd = segDist(gp, L.from, end); inRange = dd <= L.w / 2 + C.r * 0.8; near = dd <= L.w / 2 + C.r + 6; this.fx.streak(new THREE.Vector3(L.from.x, 9, L.from.z), new THREE.Vector3(end.x, 1, end.z), 0xff4ab8, 0.5, 2.2); this.fx.streak(new THREE.Vector3(L.from.x, 9, L.from.z), new THREE.Vector3(end.x, 1, end.z), 0xffffff, 0.3, 0.8); for (const p of this.area.dyn.props || []) if (p.alive && segDist(p, L.from, end) < L.w / 2 + p.r) this.damageProp(p, 30, 'boss'); this.sfx.play('beam'); }
    if (ev.name === 'rain') { for (const c of ev.circles) { const d = d2(gp, c); if (d <= c.r + C.r * 0.5) inRange = true; if (d <= c.r + C.r + 5) near = true; for (let i = 0; i < 6; i++) this.fx.puff(c.x + (Math.random() - 0.5) * c.r, 1, c.z + (Math.random() - 0.5) * c.r, 0, 6, 0, 0x8a2ad0, 0.8, 0.5); for (const p of this.area.dyn.props || []) if (p.alive && d2(p, c) < c.r + p.r * 0.5) this.damageProp(p, 20, 'boss'); } this.cam.shake(0.18, 0.3); this.sfx.play('crash'); }
    if (ev.name === 'feed') {
      const L = ev.line, block = blocksLine(gp, C.r, L);
      inRange = block; near = block;
      const S = YARD.shelter, sh = this.shelter4 || (this.shelter4 = { hp: S.hp, hits: 0, blocks: 0 });
      this.fx.streak(new THREE.Vector3(L.from.x, 9, L.from.z), new THREE.Vector3(block ? gp.x : L.to.x, 2, block ? gp.z : L.to.z), 0xff6ad8, 0.6, 2.6);
      if (block) { sh.blocks++; this.metrics.shelterBlocks = sh.blocks; this.bark('giant_block', 2); this.ui.toast('体で受けた ── ポンプ室は無事', 'parry', 1.4); }
      else { sh.hp = Math.max(10, sh.hp - 30); sh.hits++; this.metrics.shelterHits = sh.hits; this.sfx.play('crash', S); for (let i = 0; i < 20; i++) this.fx.puff(S.x + (Math.random() - 0.5) * 6, 2 + Math.random() * 3, S.z + (Math.random() - 0.5) * 5, 0, 2, 0, 0x6a6470, 1.2, 0.5); this.companion.brain.trust = Math.max(0, this.companion.brain.trust - 2); this.ui.toast('ポンプ室が揺れた！', 'weak', 1.2); }
      if (!block) return;
    }
    const r = F.incoming({ src: e, dmg: A.dmg, parryable: A.parryable, inRange, nearMiss: near });
    for (const x of F.drain()) this.giantEvent(x, e, 0, 0, 0, 0);
    this.metrics.bossAttacks4 = (this.metrics.bossAttacks4 || 0) + 1; e.lastAttackResult = r;
  },
  damageProp(p, dmg, by) {
    if (!p.alive) return;
    p.hp -= dmg; if (p.hp > 0) return;
    p.alive = false; this.metrics.propsBroken = (this.metrics.propsBroken || 0) + 1; this.metrics.propsBy = this.metrics.propsBy || {}; this.metrics.propsBy[by] = (this.metrics.propsBy[by] || 0) + 1;
    const M = new THREE.Matrix4().makeScale(0, 0, 0); p.mesh.setMatrixAt(p.idx, M); p.mesh.instanceMatrix.needsUpdate = true;
    const D = this.area.dyn.debris, Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    for (let i = 0; i < 4; i++) { const k = D.n++ % D.mesh.count; Q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0)); const sz = (p.r * 0.35) * (0.6 + Math.random() * 0.8); S.set(sz, sz * 0.6, sz); P.set(p.x + (Math.random() - 0.5) * p.r * 1.6, sz * 0.3, p.z + (Math.random() - 0.5) * p.r * 1.6); D.mesh.setMatrixAt(k, new THREE.Matrix4().compose(P, Q, S)); }
    D.mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 14; i++) this.fx.puff(p.x + (Math.random() - 0.5) * p.r * 2, 1 + Math.random() * 3, p.z + (Math.random() - 0.5) * p.r * 2, (Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3, i % 3 ? 0x6a6470 : 0xff8a40, 1.4, 0.5);
    if (p.kind === 'tower') { const h = this.area.halos.find(x => x.prop === p.id); if (h) h.off = true; const l = this.area.lights.find(x => x.prop === p.id); if (l) l.off = true; }
    if (p.kind === 'tank') this.sfx.play('crash', p); else this.sfx.play('prop_break', p);
  },
  /** 描画：巨大猫又の網・光・カメラの基準 */
  renderGiant(dt) {
    const G = this.giant; if (!G || !this.giantMode) return;
    if (G.growT != null) { G.growT += dt; const k = Math.min(1, G.growT / 2.6), e = k * k * (3 - 2 * k); G.scale = 0.25 + (COMBAT.giant.scale - 0.25) * e; if (k >= 1) G.growT = null; if (Math.random() < 0.8) this.fx.puff(G.pos.x + (Math.random() - 0.5) * 4 * G.scale / 8, Math.random() * 6 * G.scale / 8, G.pos.z + (Math.random() - 0.5) * 4 * G.scale / 8, 0, 1.5, 0, Math.random() < 0.5 ? 0x9a5aff : 0xf0e0ff, 1.2, 0.45); }
    G.root.position.set(G.pos.x, G.y || 0, G.pos.z); G.root.rotation.y = G.yaw; G.root.scale.setScalar(G.scale);
    G.anim.update(dt, { speed: G.speed, phase: G.phase, st: G.pst || G.fighter.st, turn: 0, rampK: G.rampK || 0 });
    if (G.model.outline) G.model.outline.visible = this.settings.outline;
    G.root.updateMatrixWorld(true);
    const H = this.halos, v = new THREE.Vector3(), t = this.playSec, k = G.scale / 8;
    G.model.eyes.forEach((o, i) => { o.getWorldPosition(v); H.setPos(this.giantHalos.eyes[i], v.x, v.y, v.z); H.setK(this.giantHalos.eyes[i], (0.55 + (G.rampK || 0) * 0.8) * k); });
    G.model.paws.forEach((o, i) => { o.getWorldPosition(v); H.setPos(this.giantHalos.paws[i], v.x, v.y + 0.8 * k, v.z); H.setK(this.giantHalos.paws[i], (0.5 + Math.sin(t * 6 + i) * 0.15) * k); if (Math.random() < 0.25) this.fx.particle(v.x + (Math.random() - 0.5) * 2 * k, v.y + 0.5 * k, v.z + (Math.random() - 0.5) * 2 * k, 0, 2.4 * k, 0, Math.random() < 0.5 ? 0xb070ff : 0xe0c0ff, 0.6); });
    G.model.tailTips.forEach((o, i) => { o.getWorldPosition(v); H.setPos(this.giantHalos.tails[i], v.x, v.y, v.z); H.setK(this.giantHalos.tails[i], (0.7 + Math.sin(t * 5 + i * 2) * 0.2) * k); if (Math.random() < 0.4) this.fx.particle(v.x, v.y, v.z, (Math.random() - 0.5) * 1.5, 2.5 * k, (Math.random() - 0.5) * 1.5, Math.random() < 0.5 ? 0xa050ff : 0xffb0f0, 0.7); });
    const st = G.fighter.st.name;
    if (st === 'beam' || st === 'roar') { G.model.eyes[0].getWorldPosition(v); H.setPos(this.giantHalos.beam, v.x + Math.sin(G.yaw) * 2, v.y - 1, v.z + Math.cos(G.yaw) * 2); H.setK(this.giantHalos.beam, 1.2); } else H.setK(this.giantHalos.beam, 0);
  },
  /** 先触れの描画（核・目の光・立ち上がり・崩れ） */
  renderBoss4(dt) {
    const e = this.boss && this.boss.kind === 'sakibure' ? this.boss : null; if (!e) return;
    const m = e.model, H = this.halos, v = new THREE.Vector3();
    m.brainRef = e.brain;
    if (!e.bossHalos) e.bossHalos = { core: H.add([0, -50, 0], 9, 0xff5ac8, 0), eyes: m.eyes.map(() => H.add([0, -50, 0], 1.6, 0xff4ab8, 0)) };
    if (e.riseT != null) { e.riseT += dt; const k = Math.min(1, e.riseT / 3.6); e.y = -16 * (1 - k * k * (3 - 2 * k)); if (k >= 1) e.riseT = null; }
    const on = e.root.visible && e.brain.alive ? 1 : 0, open = e.brain.coreOpen;
    m.core.getWorldPosition(v); H.setPos(e.bossHalos.core, v.x, v.y, v.z); H.setK(e.bossHalos.core, on * (open ? 1.6 + Math.sin(this.playSec * 10) * 0.3 : 0.7 + Math.sin(this.playSec * 2) * 0.1));
    m.eyes.forEach((o, i) => { o.getWorldPosition(v); H.setPos(e.bossHalos.eyes[i], v.x, v.y, v.z); H.setK(e.bossHalos.eyes[i], on * (0.6 + Math.sin(this.playSec * 3 + i) * 0.25)); });
    if (this.giantMode && e.brain.alive && e.root.visible && !this.cut.active) {
      const b = e.brain, ph = b.atk ? (b.def.attacks[b.atk.name].parryable ? '白：咆哮で止める／跳躍で避ける' : '赤：跳躍で避ける') : b.coreOpen ? '胸の輪が開いている ── 2 倍' : ['', '速くなった', '暴れている'][b.phase];
      const sh = this.shelter4 ? this.shelter4.hp : 100;
      this.ui.boss('境界の先触れ（仮）', b.hp / b.hpMax, (ph ? ph + "　｜　" : "") + `ポンプ室 ${sh}%`, !!(b.atk && b.atk.name === 'feed'));
    }
  },
  /** 巨大猫又の HUD（体力・巨大化の妖力・技の案内） */
  hudGiant() {
    if (this.hudGiant5 && this.hudGiant5()) return;
    const G = this.giant, F = G.fighter, el = this.ui.el;
    el.hpfill.style.width = (F.hp / F.hpMax * 100).toFixed(1) + '%'; el.hplag.style.width = el.hpfill.style.width; el.hpnum.textContent = `HP ${Math.ceil(F.hp)} / ${F.hpMax}`;
    if (!el.yoki.classList.contains('on')) el.yoki.classList.add('on');
    el.ykfill.style.width = (F.gauge / F.G.gauge.max * 100).toFixed(1) + '%'; el.ykmin.style.left = (F.G.roar.cost / F.G.gauge.max * 100) + '%'; el.ykn.textContent = Math.floor(F.gauge);
    const cn = F.comboN; el.combo.classList.toggle('on', cn >= 2); if (cn >= 2) { el.cn.textContent = cn; el.cb.textContent = ''; }
    this.ui.giantSkills(this.input.device, F);
  },
  // ── 演出の出来事（第4章） ──
  cineEvent4(name, arg) {
    const skip = this.cut.skipping;
    switch (name) {
      case 'pa': this.flags.broadcast4 = true; return true;
      case 'rumble': this.sfx.play('rumble'); this.cam.shake(0.18, 0.6); return true;
      case 'camShake': this.cam.shake(arg || 0.1, 0.4); return true;
      case 'playerAnim': this.cinePlayerAnim = arg || null; return true;
      case 'ensureWhite': { const F = this.F(); if (!F.white) { F.yoki = Math.max(F.yoki, 70); this.setWhite(true, 'scripted'); } return true; }
      case 'trapRing': this.flags.trap_ring = true; for (const l of this.area.lights) if (l.id === 'm2') l.color = 0xff7ad8; return true;
      case 'spawnTrap': this.spawnTrap(null, false); if (!skip) for (const e of this.enemies) if (e.trap) this.fx.mist(new THREE.Vector3(e.pos.x, 0, e.pos.z), 18, 1.8); return true;
      case 'trapFight': this.trapDone = false; this.trapFight(); return true;
      case 'emergency': this.applyEmergency(true); return true;
      case 'reactorOff': this.flags.reactor_off = true; for (const l of this.area.lights) if (l.tank || l.id === 'ctl') l.off = true; for (const h of this.area.halos) if (h.tank) h.off = true; if (this.area.dyn.liquid) this.area.root.traverse(o => { if (o.name === 'tank_liquid') o.material.opacity = 0.12; }); return true;
      case 'holdStart': this.holdStart(); return true;
      case 'bossRise4': { this.flags.boss4_risen = true; const e = this.giantBoss(); if (e) { e.root.visible = true; e.riseT = skip ? null : 0; e.y = skip ? 0 : -16; } return true; }
      case 'giantGrow': this.enterGiant(!skip); return true;
      case 'bossWake4': {
        const e = this.giantBoss(); if (!this.giantMode) this.enterGiant(false);
        this.giant.growT = null; this.giant.scale = COMBAT.giant.scale;
        if (e) { e.riseT = null; e.y = 0; e.root.visible = true; }
        this.saveSlot('auto', true);
        if (e) { e.brain.wake([]); this.lock = e; this.metrics.bossStart4 = this.playSec; }
        this.hint('妖爪連撃（攻撃）・紫の咆哮（弾く：白い予兆を止める）・跳躍（回避）・妖気放出（構え・押し続ける）'); this.later(6, () => this.hint(null));
        return true;
      }
      case 'bossCollapse': { const e = this.giantBoss(); if (e) { e.fadeT = 0; e.brain.state = 'dead'; } return true; }
      case 'giantShrink': this.exitGiant(); return true;
      case 'endCard4': this.later(skip ? 0 : 0.3, () => this.showEndCard4(arg)); return true;
    }
    return false;
  },
  showEndCard4(route) {
    if (this.WP.write) this.WP.write('shinshoku', { chaptersCleared: ['prologue', 'ch1', 'ch2_slice', 'ch3_slice', 'ch4_slice'] });
    const R = this.route, L = lastLock(R) || {};
    const stats = [['プレイ時間', fmtSec(this.playSec)], ['ルート', R.route === 'reveal' ? '妖力解放（化けを、解いた）' : R.route === 'secret' ? '正体秘匿（人として通した）' : '—'], ['分岐の記録', `#${L.seq || '—'}・${({ choice: '選択', load_branch: '分岐前から選び直し', debug: '試験の飛び先', chapter_select: '章選択' })[L.via] || L.via || '—'}`],
      ['入退室の記録の照合', this.flags.logs_done ? '済' : '—'], ['応答体', `救う ${this.count('outou', 'rescue')}・眠らせる ${this.count('outou', 'neutralize')}・倒す ${this.count('outou', 'kill')}`], ['妖弾', this.metrics.yodanShots || 0]];
    if (route === 'reveal') stats.push(['（相棒）が知った', R.reveal.companionKnows ? 'はい' : 'いいえ'], ['境界の先触れ', this.enemyRes.sakibure === 'kill' ? '止めた' : '—'], ['壊れた設備', this.metrics.propsBroken || 0], ['ポンプ室', `${this.shelter4 ? this.shelter4.hp : 100}%（体で受けた ${this.metrics.shelterBlocks || 0}）`]);
    else stats.push(['人の姿の試練', `${(this.trialLosses || 0) + 1} 回目で勝利${this.flags.trial_assist ? '（手助けあり）' : ''}`], ['配電盤', this.flags.breaker_ok ? '済' : '—'], ['（相棒）を守った', `${this.metrics.holdSec || 0} 秒・つかまれた ${this.metrics.holdGrabs || 0}`]);
    stats.push(['（相棒）の信頼', this.companion.brain.trust]);
    this.metrics.endCard4 = route;
    this.mode = 'puzzle'; this.input.exitLock();
    this.ui.endCard(stats, () => { this.ui.closePuzzle(); this.mode = 'play'; this.saveSlot('auto', true); if (['ch4_r_end', 'ch4_s_end'].includes(this.story.step)) this.later(0.4, () => this.startCh5()); }, `第4章（境界の夜）　${route === 'reveal' ? '妖力解放' : '正体秘匿'}　ここまで`, `続けて第5章${route === 'reveal' ? 'A（侵食）' : 'B（秘匿）'}（旧研究棟）へ進めます。「分岐の前」のセーブ（ロード）から、もう一方のルートも遊べます。`);
  },

  // ── 試験・ショートカット（?ch=4&route=reveal|secret）の初期状態 ──
  jump4(step) {
    const F = this.F();
    if (!atLeast(step, 'ch4_office')) return null;
    this.flags.ch4_started = true; delete this.flags.tenki_pending;
    if (atLeast(step, 'ch4_vault')) { this.flags.logs_done = this.flags.seen_logs = this.flags.seen_report = true; this.puz.logs = { done: true, miss: 0, picked: 'L5' }; }
    if (atLeast(step, 'ch4_down')) { this.flags.card_b07 = true; this.flags.cs_cs04_broadcast = true; F.give('matchlock'); this.flags.matchlock = true; }
    if (atLeast(step, 'ch4_lab')) this.flags.cs_cs04_lab = true;
    const rr = stepRoute(step);
    if (rr) {
      if (!this.route.routeLock && (rr === 'reveal' || step !== 'ch4_s_trial')) this.lockRoute(rr, { via: 'debug', trial: rr === 'secret' ? { attempts: 1, assist: false, result: 'win' } : null });
      if (rr === 'secret' && step === 'ch4_s_trial') { this.flags.branch_secret_trial = true; F.yokiOn = false; }
      if (rr === 'reveal') { F.yokiOn = true; F.yoki = 90; }
    }
    if (['ch4_r_rise', 'ch4_r_giant', 'ch4_r_end'].includes(step)) { this.flags.line4_done = true; this.flags.ch4_rise = true; TRAP_IDS.forEach(id => { this.enemyRes[id] = 'kill'; }); }
    if (S_STEPS.indexOf(step) >= 1) { TRAP_IDS.forEach(id => { this.enemyRes[id] = 'kill'; }); this.flags.emergency = true; }
    if (S_STEPS.indexOf(step) >= 2) this.flags.breaker_ok = true;
    const area = stepDef(step).area;
    const spawn = { office: atLeast(step, 'ch4_down') ? 'elevator' : 'entrance', lab: ['ch4_branch', 'ch4_r_fight', 'ch4_s_trial'].includes(step) ? 'trap' : step === 'ch4_s_hold' ? 'control' : step === 'ch4_r_rise' ? 'trap' : 'elevator', yard: 'giant' }[area];
    return { area, spawn };
  },
  /** 読み込み・飛び先のあとの区画ごとの整え（巨大戦・罠・守り・非常停止・隔壁） */
  afterLoad4() {
    const s = this.story.step, A = this.area.id;
    if (this.giantMode && A !== 'yard' && A !== 'town') this.exitGiant();
    if (A === 'yard' && ['ch4_r_giant'].includes(s)) { this.enterGiant(false); const e = this.giantBoss(); if (e) { e.root.visible = true; e.brain.wake([]); this.lock = e; } this.giant.pos = { x: YARD.giantStart[0], z: YARD.giantStart[1] }; this.giant.yaw = Math.PI; }
    if (A === 'yard' && s === 'ch4_r_end') { /* 終わり：人の姿のまま歩ける */ }
    if (A === 'lab') {
      if (this.flags.emergency) this.applyEmergency(true);
      if (this.flags.breaker_ok) { const D = this.area.dyn.bulkhead; if (D) { D.open = true; D.mesh.position.y = D.up; const i = this.area.boxes.indexOf(D.box); if (i >= 0) this.area.boxes.splice(i, 1); } }
      if (['ch4_r_fight', 'ch4_s_trial'].includes(s)) { this.trapDone = false; this.trapFight(); }
      if (s === 'ch4_branch') {
        if (this.route.route === 'reveal') { this.setStep('ch4_r_fight'); const F = this.F(); F.yokiOn = true; F.yoki = Math.max(F.yoki, 80); this.setWhite(true, 'scripted'); this.trapDone = false; this.spawnTrap(null, true); this.trapFight(); }
        else this.later(0.3, () => this.openBranch());
      }
      if (s === 'ch4_s_hold') this.holdStart();
    }
    if (A === 'office' && this.flags.matchlock && this.area.dyn.matchlockCase) this.area.dyn.matchlockCase.visible = false;
    if (A === 'office' && this.flags.card_b07 && this.area.dyn.evHalo != null) this.halos.setColor(this.area.dyn.evHalo, 0x40ff80);
  },
  /** 区画の中での（相棒）の置き場所（第4章） */
  placeCompanion4() {
    const C = this.companion, b = C.brain, s = this.story.step, id = this.area.id;
    if (!['office', 'lab', 'yard'].includes(id)) return false;
    if (id === 'yard') { C.root.visible = false; b.setMode('scripted'); return true; }
    if (id === 'lab' && ['ch4_branch', 'ch4_r_fight', 'ch4_s_trial'].includes(s)) { this.companionAtTrap(); return true; }
    if (id === 'lab' && ['ch4_r_rise', 'ch4_r_end'].includes(s)) { C.root.visible = false; b.setMode('scripted'); return true; }
    return false;
  },
  /** 撃つ（白の妖弾）：銃口から前へ。貫通（近い順に 4 体まで）。照準：構え中のマウス／ロック／前の扇 */
  fireYodan(ev) {
    const P = this.player, F = P.fighter; this.metrics.yodanShots = (this.metrics.yodanShots || 0) + 1;
    const muzzle = P.muzzleWorld(true);
    let o, d;
    if (this.input.device === 'kbm' && F.aimHeld) { this.syncCamera(); o = this.camera.position.clone(); d = new THREE.Vector3(); this.camera.getWorldDirection(d); }
    else {
      const t = (this.lock && this.lock.hittable()) ? this.lock : this.nearestEnemy(ev.range, true, 90);
      o = new THREE.Vector3(P.pos.x, 1.35, P.pos.z);
      if (t) { P.yaw = Math.atan2(t.pos.x - P.pos.x, t.pos.z - P.pos.z); d = new THREE.Vector3(t.pos.x - o.x, t.h * 0.55 - o.y, t.pos.z - o.z).normalize(); }
      else d = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
    }
    const wall = rayBoxes(o, d, ev.range, this.boxes);
    const hits = [];
    for (const e of this.enemies) {
      if (!e.hittable()) continue;
      const c = new THREE.Vector3(e.pos.x, Math.min(e.h * 0.55, 1.6), e.pos.z), t = c.clone().sub(o).dot(d);
      if (t < 0 || t > wall) continue;
      const q = o.clone().addScaledVector(d, t), dist = Math.hypot(q.x - c.x, q.z - c.z);
      if (dist < e.r + ev.width) hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);
    const end = o.clone().addScaledVector(d, Math.min(wall, ev.range));
    this.fx.streak(muzzle, end, 0xc070ff, 0.5, 0.22); this.fx.streak(muzzle, end, 0xffffff, 0.3, 0.07); this.fx.flash(muzzle, 0xd8a0ff, 0.9);
    for (let i = 0; i < 10; i++) this.fx.puff(muzzle.x, muzzle.y, muzzle.z, (Math.random() - 0.5) * 1.2, 0.4, (Math.random() - 0.5) * 1.2, 0xb070ff, 0.6, 0.5);
    this.sfx.play('yodan'); this.cam.shake(0.12, 0.2); this.gunshot = { x: P.pos.x, z: P.pos.z }; this.gunshotT = 3; this.pushAct('shot');
    let n = 0;
    for (const h of hits.slice(0, ev.pierce)) { this.damageEnemy(h.e, Math.round(ev.dmg * F.comboMul()), 'shot', { poise: ev.poise }); F.registerHit(); h.e.looks.hit(d.x, d.z, h.e.brain.yaw, 1.4); this.fx.sparks(new THREE.Vector3(h.e.pos.x, 1.2, h.e.pos.z), 18, 0xe0b0ff); n++; }
    this.metrics.yodanHits = (this.metrics.yodanHits || 0) + n; this.metrics.yodanPierceMax = Math.max(this.metrics.yodanPierceMax || 0, n);
    if (n) this.hitstop = COMBAT.hitstop.heavy;
  },
  /** 撮影・試験用：第4章の小さな API */
  debug4() {
    const g = this;
    return {
      branch: id => { g.ui.closePuzzle(); g.mode = 'play'; g.chooseBranch(id); return g.route.route; },
      trapClear: () => { for (const e of g.enemies) if (e.trap && e.brain.alive) { const ev = []; e.brain.hurt(9999, 'issen', ev); g.enemyEvents(e, ev); } return g.trapLeft(); },
      giant: () => g.giant ? { pos: g.giant.pos, yaw: g.giant.yaw, hp: g.giant.fighter.hp, gauge: Math.round(g.giant.fighter.gauge), st: g.giant.fighter.st.name, scale: g.giant.scale, mode: g.giantMode } : null,
      giantTp: (x, z, yaw) => { if (g.giant) { g.giant.pos.x = x; g.giant.pos.z = z; if (yaw != null) { g.giant.yaw = yaw; g.cam.yaw = yaw + Math.PI; } } },
      bossHp: f => { const e = g.giantBoss(); if (e) e.brain.hp = Math.max(1, Math.round(e.brain.hpMax * f)); return e && e.brain.hp; },
      hold: () => g.hold ? { prog: g.hold.prog, t: g.hold.t, wave: g.hold.wave, grabs: g.hold.grabs, done: !!g.hold.done } : null,
      holdSkip: sec => { if (g.hold) g.hold.prog = Math.min(LAB.hold.sec - 0.5, g.hold.prog + sec); },
      shelter: () => g.shelter4 || null,
      props: () => (g.area.dyn.props || []).filter(p => !p.alive).length,
    };
  },
};

function fmtSec(s) { s = Math.round(s || 0); return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`; }
export { TRAP_IDS, impossibleLogs, ENEMIES, carryBranchLog };
