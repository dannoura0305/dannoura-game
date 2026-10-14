// 収容者（避難所の個体）【仮】：中ボス。DOM・three.js なし（node でテスト）。
// 状態：dormant（眠り）→ hostile（戦い）⇄ rollcall（点呼：止まって番号を呼ぶ）／stagger・down（体幹が崩れた：青い縁）
//       stuck（器具庫に突っ込んだ：シャッターを下ろせる）→ neutral（無力化）／ rest（名前を呼ばれて救われた）／ dead
// 予兆：白（弾ける）＝ sweep。赤（弾けない）＝ slam（円）・charge（線）・blanket（円・遅れて落ちる）・grab。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Shuuyou extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.shuuyou, Object.assign({ kind: 'shuuyou' }, opt));
    this.state = 'dormant';
    this.trueName = opt.trueName || null;        // 救うための名前（名簿の照合）
    this.storage = opt.storage || null;          // 器具庫の範囲 {minX,maxX,minZ,maxZ}
    this.arena = opt.arena || null;               // 体育館の範囲（突進の終わり）
    this.home = opt.home || { x: this.pos.x, z: this.pos.z };
    this.phase = 0; this.fightT = 0; this.rcT = 0; this.rcN = 0; this.enraged = 0; this.wrongCalls = 0;
  }
  immune() { return ['dormant', 'rest', 'neutral'].includes(this.state); }
  get hpRatio() { return this.hp / this.hpMax; }
  get rollcallOpen() { return this.state === 'rollcall'; }
  wake(evs = []) { if (this.state === 'dormant') { this.go('hostile', evs, 'wake'); this.cool = 1.2; this.rcT = 0; } }
  /** 点呼に名前で答える（館内放送のマイク）。'rescued'|'wrong'|'closed' */
  callName(name, evs = []) {
    if (this.state !== 'rollcall') return 'closed';
    if (this.trueName && name === this.trueName) {
      this.resolution = 'rescue'; this.atk = null; this.go('rest', evs, 'name'); evs.push({ t: 'rescued' }); return 'rescued';
    }
    this.wrongCalls++; this.enraged = 8; this.go('hostile', evs, 'wrong'); evs.push({ t: 'wrong' });
    this.startAttack('grab', evs, null); return 'wrong';
  }
  /** シャッターを下ろす（器具庫に挟まっている間だけ） */
  shut(evs = []) {
    if (this.state !== 'stuck') return false;
    this.resolution = 'neutralize'; this.atk = null; this.go('neutral', evs, 'shut'); evs.push({ t: 'neutralized' }); return true;
  }
  inStorage() { const S = this.storage; return !!S && this.pos.x > S.minX && this.pos.x < S.maxX && this.pos.z > S.minZ && this.pos.z < S.maxZ; }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (this.state === 'rollcall') { this.go('hostile', evs, 'interrupted'); evs.push({ t: 'rollcallBroken' }); }
    if (this.state === 'stuck') { this.go('hostile', evs, 'freed'); }
    const r = super.hurt(dmg, kind, evs, opt);
    this.checkPhase(evs);
    return r;
  }
  checkPhase(evs) {
    const P = this.def.phases; let ph = 0;
    for (let i = 0; i < P.length; i++) if (this.hpRatio <= P[i].at) ph = i;
    if (ph > this.phase && this.alive) { this.phase = ph; this.patIdx = 0; evs.push({ t: 'phase', n: ph }); this.rcT = this.def.rollcall.every - 2.5; }
  }
  get curPattern() { return this.def.phases[this.phase].pattern; }
  startAttack(name, evs, target) {
    const A = this.def.attacks[name];
    this.atk = { name, phase: 'windup', t: 0, hitDone: false };
    if (A.aoe && target) {
      if (A.ranged) this.atk.at = { x: target.x, z: target.z };
      else this.atk.at = { x: this.pos.x + Math.sin(this.yaw) * A.aoe.ahead, z: this.pos.z + Math.cos(this.yaw) * A.aoe.ahead };
    }
    evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: this.atk.at || null, yaw: this.yaw });
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    if (this.enraged > 0) this.enraged -= dt;
    switch (this.state) {
      case 'dormant': case 'rest': case 'neutral': case 'dead': break;
      case 'rollcall': {
        if (p) out.face = { x: p.x, z: p.z }; out.faceRate = 1.2;
        if (this.t >= this.def.rollcall.dur) { this.go('hostile', evs, 'rollcallEnd'); evs.push({ t: 'rollcallEnd' }); if (p && !p.dead) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.startAttack('charge', evs, p); } }
        else if (Math.floor(this.t / 1.6) !== Math.floor((this.t - dt) / 1.6)) evs.push({ t: 'say', key: 'shuuyou_rollcall', n: this.rcN });
        break;
      }
      case 'stuck': {
        if (this.t >= this.def.stuck) { this.go('hostile', evs, 'unstuck'); evs.push({ t: 'unstuck' }); }
        break;
      }
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
      case 'hostile': {
        this.fightT += dt; this.rcT += dt;
        if (!this.atk && this.rcT >= (this.rcN === 0 ? this.def.rollcall.first : this.def.rollcall.every) && this.enraged <= 0) {
          this.rcT = 0; this.rcN++; this.go('rollcall', evs, 'time'); evs.push({ t: 'rollcall', n: this.rcN }); break;
        }
        this.fight(dt, sense, out);
        break;
      }
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (this.cool > 0) this.cool -= dt * (this.enraged > 0 ? 1.6 : 1);
    if (this.atk) {
      const a = this.atk, A = this.def.attacks[a.name];
      a.t += dt;
      if (a.phase === 'windup') {
        if (!A.dash || a.t < A.windup * 0.75) { out.face = { x: p.x, z: p.z }; out.faceRate = A.dash ? 2.2 : 2.6; }
        if (A.ranged && a.at && a.t < A.windup * 0.5) { a.at.x = p.x; a.at.z = p.z; }
        if (a.t >= A.windup) {
          a.phase = 'active'; a.t = 0;
          if (A.dash) a.dir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }, a.from = { x: this.pos.x, z: this.pos.z };
          evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null });
        }
      } else if (a.phase === 'active') {
        if (A.dash) {
          out.move = { x: this.pos.x + a.dir.x * 3, z: this.pos.z + a.dir.z * 3, speed: this.def.speed.charge }; out.face = { x: this.pos.x + a.dir.x, z: this.pos.z + a.dir.z }; out.faceRate = 20;
          out.dash = true;
        }
        if (a.t >= A.active || (A.dash && a.blocked)) {
          a.phase = 'recover'; a.t = 0;
          if (A.dash && this.inStorage()) { this.atk = null; this.go('stuck', evs, 'storage'); evs.push({ t: 'stuck' }); return; }
          if (A.dash) evs.push({ t: 'crash' });
        }
      } else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.phases[this.phase].cooldown * (0.85 + this.rand() * 0.4); }
      return;
    }
    if (!p || p.dead) return;
    const d = dist2(this.pos, p);
    const pat = this.curPattern, next = pat[this.patIdx % pat.length], A = this.def.attacks[next];
    const reach = A.dash ? A.range : A.ranged ? A.range : A.range * 0.85;
    if (this.cool <= 0 && d <= reach && (A.dash ? d > 3 : true)) {
      this.patIdx++; this.startAttack(next, evs, p); out.face = { x: p.x, z: p.z }; return;
    }
    if (this.cool <= 0 && (A.dash || A.ranged) && d <= 3) { this.patIdx++; return; }   // 近すぎる：次の技へ
    out.face = { x: p.x, z: p.z }; out.faceRate = 1.8;
    if (d > 2.6) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry * (this.phase >= 1 ? 1.15 : 1) };
  }
}
