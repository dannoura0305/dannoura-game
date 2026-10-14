// 応答体（研究施設の異形・境界応答の産物）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の outou。
// 輪（habit）：槽 ⇄ 試験端末。端末の前で「……応答、します」と止まり、槽へ戻って待つ（試験の手順のくり返し）。輪の無い個体は槽のそばで待つ（idle）。
// 見定め：走る音・銃声・明かり・すぐそば → 止まって見る → 敵対。共鳴（resonate）：近くの個体が傷つくと一緒に目を覚ます（予兆をそろえる）。
// 鎮静（sedate）：蒸気・鎮静の電源で、戦っていない個体は座り込む＝無力化。試験終了の合図（endSignal）：敵対していなければ横たわる＝救う。
// 守りの場面（target）：狙いを（相棒）へ向ける（ゲームが sense.player の代わりに相棒の位置を渡す）。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Outou extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.outou, Object.assign({ kind: 'outou' }, opt));
    this.tank = opt.tank || { x: this.pos.x, z: this.pos.z };
    this.terminal = opt.terminal || null; this.habit = !!opt.habit && !!this.terminal;
    this.path = opt.path || null; this.pi = 0;
    this.sub = this.habit ? 'wait' : 'idle'; this.subT = this.habit ? (opt.phase || 0) : 0;
    this.state = opt.state || 'loop';
    if (this.state === 'hostile') this.hostileBy = opt.hostileBy || 'spawn';
    this.leash = opt.leash || 18; this.home = { x: this.pos.x, z: this.pos.z };
  }
  immune() { return this.state === 'rest' || this.state === 'sedated'; }
  /** 鎮静：戦っていなければ座り込む（無力化） */
  sedate(evs = [], force = false) {
    if (!this.alive || this.resolution || ['rest', 'sedated'].includes(this.state)) return false;
    if (!force && ['hostile', 'stagger', 'down'].includes(this.state)) return false;
    this.resolution = 'neutralize'; this.atk = null; this.go('sedated', evs, 'sedate'); evs.push({ t: 'neutralized' }); return true;
  }
  /** 試験終了の合図：敵対していなければ横たわる（救う） */
  endSignal(evs = []) {
    if (!this.alive || this.resolution || ['hostile', 'stagger', 'down', 'rest', 'sedated'].includes(this.state)) return false;
    this.resolution = 'rescue'; this.atk = null; this.go('rest', evs, 'endSignal'); evs.push({ t: 'rescued' }); return true;
  }
  /** 共鳴：近くの個体が傷ついた／攻め始めた。眠っていなければ敵対へ（予兆をそろえるため、待ち時間を合わせる） */
  resonate(evs = [], cool = 0.25, at = null) {
    if (!this.alive || this.resolution || ['rest', 'sedated', 'stagger', 'down'].includes(this.state)) return false;
    if (this.state !== 'hostile') { this.go('hostile', evs, 'resonance'); evs.push({ t: 'hostile' }); }
    this.hostileBy = this.hostileBy || 'resonance'; if (at) { this.lastSeen = { x: at.x, z: at.z }; this.lastSeenT = this.total; }
    if (!this.atk) this.cool = cool; return true;
  }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (['loop', 'assess'].includes(this.state)) { this.hostileBy = 'attacked'; this.lastSeenT = this.total; }
    const r = super.hurt(dmg, kind, evs, opt);
    if (r && this.alive) evs.push({ t: 'resonate' });
    return r;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'rest': case 'sedated': case 'dead': break;
      case 'loop': {
        this.loopTick(dt, sense, out);
        if (p && !p.dead && !sense.steam) {
          const seen = this.sees(sense), heard = this.hears(sense), d = dist2(this.pos, p);
          if (this.hostileBy || heard === 'gun' || heard === 'run' || (seen && (d < 2.6 || sense.lit))) {
            this.cause = this.hostileBy ? 'hit' : heard || (sense.lit ? 'light' : 'near');
            this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]);
            this.go('assess', evs, this.cause); evs.push({ t: 'notice' });
          }
        }
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          const still = p && !p.dead && !sense.steam && (this.hostileBy || this.cause === 'gun' || dist2(this.pos, p) < 4.5 || (sense.lit && dist2(this.pos, p) < 8));
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }); }
          else this.go('loop', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': this.fight(dt, sense, out); break;
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    if (!p || p.dead) return;
    const d = dist2(this.pos, p);
    if (sense.steam && d > 2.2) { if (this.total - this.lastSeenT > 2.5) { this.go('loop', evs, 'steam'); this.hostileBy = null; } return; }
    this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total;
    if (!sense.protect && dist2(this.pos, this.home) > this.leash && d > 6) { out.move = { x: this.home.x, z: this.home.z, speed: this.def.speed.walk }; out.face = { x: this.home.x, z: this.home.z }; return; }
    const next = this.def.pattern[this.patIdx % this.def.pattern.length], A = this.def.attacks[next];
    out.face = { x: p.x, z: p.z }; out.faceRate = 3;
    if (this.cool <= 0 && d <= A.range * 0.85) { this.startAttack(next, sense, evs); return; }
    if (d > 1.5) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry };
  }
  startAttack(name, sense, evs) {
    const A = this.def.attacks[name]; this.patIdx++;
    this.atk = { name, phase: 'windup', t: 0 };
    if (A.aoe) this.atk.at = { x: this.pos.x, z: this.pos.z };
    evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: this.atk.at || null });
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') { if (p) { out.face = { x: p.x, z: p.z }; out.faceRate = 3.2; } if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; if (A.aoe) a.at = { x: this.pos.x, z: this.pos.z }; evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null }); } }
    else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.cooldown * (0.8 + this.rand() * 0.5); }
  }
  /** 輪：habit＝槽で待つ→端末へ→応答→槽へ。path＝巡回。idle＝槽のそばでゆれる */
  loopTick(dt, sense, out) {
    this.subT += dt;
    const go = (tgt, sp) => { if (dist2(this.pos, tgt) > 0.3) { out.move = { x: tgt.x, z: tgt.z, speed: sp || this.def.speed.walk }; out.face = { x: tgt.x, z: tgt.z }; return false; } return true; };
    if (this.path) { const tgt = { x: this.path[this.pi][0], z: this.path[this.pi][1] }; if (go(tgt)) this.pi = (this.pi + 1) % this.path.length; return; }
    if (!this.habit) { if (dist2(this.pos, this.home) > 0.6) go(this.home); else if (Math.floor(this.subT / 7) !== Math.floor((this.subT - dt) / 7)) out.events.push({ t: 'say', key: 'outou_idle' }); return; }
    switch (this.sub) {
      case 'wait': if (this.subT > 7 || sense.chime) { this.sub = 'toTerm'; this.subT = 0; } break;
      case 'toTerm': if (go(this.terminal)) { this.sub = 'answer'; this.subT = 0; out.events.push({ t: 'say', key: 'outou_answer' }); } break;
      case 'answer': out.face = { x: this.terminal.x, z: this.terminal.z - 1 }; if (this.subT > 2.4) { this.sub = 'toTank'; this.subT = 0; } break;
      case 'toTank': if (go(this.tank)) { this.sub = 'wait'; this.subT = 0; } break;
    }
  }
}
