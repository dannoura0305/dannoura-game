// 待人（まちびと）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の machibito（ENEMY_AI_SPEC §2.8）。
// 輪：待ち合わせの場所（バス停・受付）で時計を見る。取り違え：近づいた者を「待っていた人」と思い、少し後ろをついてくる（攻撃しない）。
// 離れる・時間がたつと「違った」と分かって悲しげに戻る。取り違えが misreadMax 回を越える・攻撃されると怒る（hostile）。
// 解決：救う＝待っていた人の物を届ける（deliver）／無力化＝場所の時計を止める（stopClock：眠る）／逃げる（離れる）／倒す。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Machibito extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.machibito, Object.assign({ kind: 'machibito' }, opt));
    this.home = { x: this.pos.x, z: this.pos.z }; this.homeYaw = opt.yaw || 0; this.misreads = 0; this.state = opt.state || 'loop'; this.watchT = 0;
  }
  immune() { return ['rest', 'sleep'].includes(this.state); }
  /** 届けた（救う）：怒っていても、物を見れば分かる */
  deliver(evs = []) { if (!this.alive || this.resolution) return false; this.atk = null; this.resolution = 'rescue'; this.go('rest', evs, 'deliver'); evs.push({ t: 'rescued' }); return true; }
  /** 場所の時計を止めた（無力化）：時間が止まり、眠る */
  stopClock(evs = []) { if (!this.alive || this.resolution) return false; this.atk = null; this.resolution = 'neutralize'; this.go('sleep', evs, 'clock'); evs.push({ t: 'neutralized' }); return true; }
  hurt(dmg, kind, evs = [], opt = {}) { const r = super.hurt(dmg, kind, evs, opt); if (r && this.alive) this.hostileBy = 'attacked'; return r; }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player, d = p && !p.dead ? dist2(this.pos, p) : 99;
    switch (this.state) {
      case 'dead': case 'rest': case 'sleep': break;
      case 'loop': {
        if (dist2(this.pos, this.home) > 0.3) { out.move = { x: this.home.x, z: this.home.z, speed: this.def.speed.walk }; out.face = this.home; break; }
        this.yaw += ((this.homeYaw) - this.yaw) * Math.min(1, dt * 2);
        this.watchT += dt; if (this.watchT > 6) { this.watchT = 0; evs.push({ t: 'say', key: 'machibito_wait' }); }
        if (d < 2.6 && p.noise !== 'run') { this.go('misread', evs, 'near'); this.misreads++; evs.push({ t: 'say', key: 'machibito_misread' }); evs.push({ t: 'misread' }); }
        else if (d < 2.6) { this.hostileBy = 'startled'; this.go('hostile', evs, 'run'); evs.push({ t: 'notice' }); }
        break;
      }
      case 'misread': {
        // 少し後ろをついてくる。離れるか 6 秒で「違った」
        if (d > 1.6 && d < 7) out.move = { x: p.x, z: p.z, speed: this.def.speed.walk * 1.2 };
        out.face = p ? { x: p.x, z: p.z } : null;
        if (d >= 7 || this.t > 6) { this.go('sad', evs, 'notThem'); evs.push({ t: 'say', key: 'machibito_sad' }); }
        break;
      }
      case 'sad': {
        out.move = { x: this.home.x, z: this.home.z, speed: this.def.speed.walk * 0.7 }; out.face = this.home;
        if (dist2(this.pos, this.home) < 0.4) { if (this.misreads > this.def.misreadMax) { this.hostileBy = 'misread'; this.go('hostile', evs, 'tooMany'); evs.push({ t: 'say', key: 'machibito_angry' }); } else this.go('loop', evs, 'back'); }
        break;
      }
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 1)) this.go('hostile', evs, 'recover'); break;
      case 'hostile': this.fight(dt, sense, out); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (!p || p.dead) return;
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) {
      const a = this.atk, A = this.def.attacks[a.name]; a.t += dt;
      if (a.phase === 'windup') { if (!A.aoe) { out.face = { x: p.x, z: p.z }; out.faceRate = 3; } if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null }); } }
      else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
      else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.cooldown * (0.8 + this.rand() * 0.4); }
      return;
    }
    const d = dist2(this.pos, p); out.face = { x: p.x, z: p.z };
    // 場所から離れすぎない（待ち合わせの場所を守る）
    if (dist2(this.pos, this.home) > 9) { out.move = { x: this.home.x, z: this.home.z, speed: this.def.speed.angry }; if (d > 10) { this.go('loop', evs, 'leash'); this.hostileBy = null; } return; }
    const name = this.def.pattern[this.patIdx % this.def.pattern.length], A = this.def.attacks[name];
    const reach = A.ranged ? A.range : A.range * 0.9;
    if (this.cool <= 0 && d <= reach) { this.patIdx++; this.atk = { name, phase: 'windup', t: 0 }; if (A.aoe) this.atk.at = { x: p.x, z: p.z }; evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: this.atk.at || null }); return; }
    if (d > 1.8) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry };
  }
}
