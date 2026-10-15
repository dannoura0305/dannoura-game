// 当直（とうちょく・第6章B のボス・仮名）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の touchoku。
// 中央管理棟の夜勤の保全員が、巡回の手順ごと置き換わった姿。輪＝機械を順に見て回る（巡回）。
// 戦い：レンチ（白）・蒸気の噴き（赤・扇）・配管の叩きつけ（赤・円）。roundEvery 秒ごとに、止めた P-2 の弁へ歩いて「入れ直そう」とする（round）：
//   弁で roundTime 秒いじり終えると少し回復（restarted）。弁にかがんでいる間は傷が 1.5 倍（背中ががら空き）。
// 蒸気弁の線に入ると崩れる（steamed → down）。崩れている間：点検表を渡す＝救う（handOver）／レンチを配管に施錠＝無力化（lockOut）。倒す。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Touchoku extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.touchoku, Object.assign({ kind: 'touchoku' }, opt));
    if (opt.assist) { this.hp = this.hpMax = Math.round(this.def.hp * 0.75); }
    this.valve = opt.valve || { x: this.pos.x, z: this.pos.z - 2 }; this.desk = opt.desk || { x: this.pos.x, z: this.pos.z };
    this.route = (opt.route || [[this.pos.x, this.pos.z]]).map(([x, z]) => ({ x, z })); this.ri = 0;
    this.state = opt.state || 'dormant'; this.phase = 0; this.roundT = 0; this.workT = 0; this.restarts = 0;
  }
  immune() { return ['dormant', 'rest', 'locked'].includes(this.state); }
  get coreOpen() { return this.state === 'down'; }
  get working() { return this.state === 'round' && this.workT > 0; }
  wake(evs = []) { if (['loop', 'dormant'].includes(this.state)) { this.go('hostile', evs, 'wake'); this.hostileBy = 'boss'; this.cool = 1.4; this.roundT = 0; } }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    const wasDown = this.state === 'down', working = this.working;
    if (wasDown) dmg = Math.round(dmg * this.def.coreMul);
    if (working) { dmg = Math.round(dmg * 1.5); opt = Object.assign({}, opt, { poise: (opt.poise || 0) * 1.5 }); }
    const r = super.hurt(dmg, kind === 'issen' ? 'slash' : kind, evs, opt);
    if (!this.alive) { this.atk = null; return r; }
    const ratio = this.hp / this.hpMax, PH = this.def.phases; let ph = 0; for (let i = 0; i < PH.length; i++) if (ratio <= PH[i].at) ph = i;
    if (ph > this.phase) { this.phase = ph; evs.push({ t: 'phase', n: ph }); }
    if (this.state === 'stagger' && kind !== 'issen' && !working) this.go('hostile', evs, 'armor');      // 大きな体：小さな傷ではよろけない
    if (this.state === 'stagger' && working) { this.workT = 0; }
    return r;
  }
  /** 蒸気弁の線の中にいた：崩れる（核＝背の配管が開く） */
  steamed(evs = []) {
    if (!this.alive || this.immune() || this.state === 'down') return false;
    this.atk = null; this.workT = 0; this.poise = this.poiseMax; this.chainable = true; this.staggerFor = this.def.stagger.steam;
    this.hp = Math.max(1, this.hp - 24); evs.push({ t: 'hurt', dmg: 24, kind: 'steam' });
    this.go('down', evs, 'steam'); evs.push({ t: 'steamed' }); return true;
  }
  /** 崩れている間に点検表（引き継ぎ）を渡す：救う */
  handOver(evs = []) { if (!this.alive || this.resolution || this.state !== 'down') return false; this.atk = null; this.resolution = 'rescue'; this.go('rest', evs, 'handover'); evs.push({ t: 'rescued' }); return true; }
  /** 崩れている間にレンチを配管に施錠：無力化 */
  lockOut(evs = []) { if (!this.alive || this.resolution || this.state !== 'down') return false; this.atk = null; this.resolution = 'neutralize'; this.go('locked', evs, 'lockout'); evs.push({ t: 'neutralized' }); return true; }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'dead': case 'rest': case 'locked': case 'dormant': break;
      case 'loop': {
        const tgt = this.route[this.ri];
        if (dist2(this.pos, tgt) > 0.4) { out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.walk }; out.face = tgt; }
        else if (this.t > 2.4) { this.ri = (this.ri + 1) % this.route.length; this.t = 0; evs.push({ t: 'say', key: 'touchoku_round' }); }
        if (p && !p.dead && dist2(this.pos, p) < 5) this.wake(evs);
        break;
      }
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 1)) { this.chainable = false; this.go('hostile', evs, 'recover'); } break;
      case 'round': {
        // 止めた P-2 の弁へ。着いたら roundTime 秒いじる → 入れ直す（少し回復・蒸気）
        if (dist2(this.pos, this.valve) > 0.6) { out.move = { x: this.valve.x, z: this.valve.z, speed: this.def.speed.angry }; out.face = this.valve; this.workT = 0; }
        else { this.workT += dt; out.face = { x: this.valve.x, z: this.valve.z - 1 }; if (this.workT >= this.def.roundTime) { this.workT = 0; this.restarts++; const h = Math.round(this.hpMax * this.def.roundHeal); this.hp = Math.min(this.hpMax, this.hp + h); evs.push({ t: 'restarted', heal: h }); this.go('hostile', evs, 'restarted'); this.cool = 1.0; } }
        break;
      }
      case 'hostile': this.fight(dt, sense, out); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (!p || p.dead) return;
    if (this.cool > 0) this.cool -= dt;
    this.roundT += dt;
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    if (sense.isolated && this.roundT >= this.def.roundEvery) { this.roundT = 0; this.go('round', evs, 'round'); evs.push({ t: 'say', key: 'touchoku_restart' }); evs.push({ t: 'round' }); return; }
    const d = dist2(this.pos, p);
    out.face = { x: p.x, z: p.z }; out.faceRate = 1.8;
    const L = this.def.pattern, name = L[this.patIdx % L.length], A = this.def.attacks[name];
    const reach = A.ranged ? A.range : A.range * 0.9;
    if (this.cool <= 0 && d <= reach) { this.patIdx++; this.atk = { name, phase: 'windup', t: 0 }; if (A.aoe) this.atk.at = A.ranged ? { x: p.x, z: p.z } : { x: this.pos.x, z: this.pos.z }; evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: this.atk.at || null }); return; }
    if (d > 2.2) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry };
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') { if (p && !A.aoe) { out.face = { x: p.x, z: p.z }; out.faceRate = 2.2; } if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null }); } }
    else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.phases[this.phase].cooldown * (0.85 + this.rand() * 0.3); }
  }
}
