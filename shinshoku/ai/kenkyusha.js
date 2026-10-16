// 研究者（終章B のボス・人間大の特別な最終戦・名前未定）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の kenkyusha。
// 記録の間で、自分の過去の判断（事故の瞬間）を何度も再生している。境界応答の紫の光をまとう（顔は光でよく見えない）。
// 攻め：打つ（白）／巻き戻し（赤・円：sense.past＝数秒前にプレイヤーがいた所）／残像（赤・線：過去の自分が同じ道を走る）／
//       事故の瞬間（白・（相棒）への線：間に立って受ける＝弾ける）。
// 記録装置（sense.decks＝動いている台数）が動いている間は傷が浅く（shieldMul）、体力が floor より減らない（巻き戻し）。
// 記録装置を止めると崩れる（deckStopped）。体力 0 で膝をつく（無力化。倒さない）。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';
import { KIROKU } from '../data/ch7.js';

export class Kenkyusha extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.kenkyusha, Object.assign({ kind: 'kenkyusha' }, opt));
    if (opt.assist) { this.hp = this.hpMax = Math.round(this.def.hp * 0.75); }
    this.state = opt.state || 'dormant'; this.phase = 0; this.decks = opt.decks ?? 3; this.rewoundT = -99; this.rewinds = 0;
    this.floor = opt.floor ?? KIROKU.floor; this.shieldMul = opt.shieldMul ?? KIROKU.shieldMul;
  }
  immune() { return ['dormant', 'kneel'].includes(this.state); }
  get coreOpen() { return this.state === 'down'; }
  get shielded() { return this.decks > 0; }
  wake(evs = []) { if (this.state === 'dormant') { this.go('hostile', evs, 'wake'); this.hostileBy = 'boss'; this.cool = 1.6; } }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    if (this.state === 'down') dmg = Math.round(dmg * this.def.coreMul);
    if (this.shielded) dmg = Math.max(1, Math.round(dmg * this.shieldMul));
    const floorHp = Math.round(this.hpMax * this.floor);
    if (this.shielded && this.hp - dmg < floorHp) {
      // 記録装置が動いている：傷を巻き戻す（体力が floor で止まる）
      dmg = Math.max(0, this.hp - floorHp); this.hp = floorHp;
      if (this.total - this.rewoundT > 3) { this.rewoundT = this.total; this.rewinds++; evs.push({ t: 'rewound' }); }
      evs.push({ t: 'hurt', dmg, kind }); return dmg;
    }
    this.hp = Math.max(0, this.hp - dmg); evs.push({ t: 'hurt', dmg, kind });
    if (this.hp <= 0) { this.atk = null; this.chainable = false; this.resolution = 'neutralize'; this.go('kneel', evs, 'hp0'); evs.push({ t: 'neutralized' }); return dmg; }
    const ratio = this.hp / this.hpMax, PH = this.def.phases; let ph = 0; for (let i = 0; i < PH.length; i++) if (ratio <= PH[i].at) ph = i;
    if (ph > this.phase) { this.phase = ph; evs.push({ t: 'phase', n: ph }); }
    if (this.state === 'down') return dmg;
    if (opt.poise) { this.poise -= opt.poise * (this.def.poiseMul ?? 1); this.poiseT = 0; }
    if (this.poise <= 0) { this.poise = this.poiseMax; this.atk = null; this.chainable = true; this.staggerFor = this.def.stagger.broken; this.go('down', evs, 'broken'); evs.push({ t: 'broken' }); return dmg; }
    if (kind === 'issen') { this.atk = null; this.staggerFor = 1.2; this.go('stagger', evs, 'issen'); }
    return dmg;
  }
  parried(evs = []) { if (!this.alive || this.immune()) return; this.atk = null; this.staggerFor = this.def.stagger.parried; this.chainable = true; this.go('stagger', evs, 'parried'); }
  /** 記録装置を 1 台止めた：崩れる（核が開く） */
  deckStopped(left, evs = []) {
    this.decks = left;
    if (!this.alive || this.immune()) return false;
    this.atk = null; this.chainable = true; this.staggerFor = this.def.stagger.deck; this.go('down', evs, 'deck'); evs.push({ t: 'deckStop', left }); return true;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    if (sense.decks != null) this.decks = sense.decks;
    switch (this.state) {
      case 'dead': case 'dormant': case 'kneel': break;
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 1)) { this.chainable = false; this.go('hostile', evs, 'recover'); } break;
      case 'hostile': this.fight(dt, sense, out); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (!p || p.dead) return;
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    const d = dist2(this.pos, p);
    out.face = { x: p.x, z: p.z }; out.faceRate = 2.0;
    const L = this.def.phases[this.phase].pattern, name0 = L[this.patIdx % L.length];
    let name = name0;
    if (name === 'accident' && !sense.companion) name = 'echo';
    const A = this.def.attacks[name];
    const reach = A.ranged ? A.range : A.range * 0.9;
    if (this.cool <= 0 && d <= reach) {
      this.patIdx++;
      const a = this.atk = { name, phase: 'windup', t: 0 };
      if (name === 'rewind') { const q = sense.past || p; a.at = { x: q.x, z: q.z }; }
      if (name === 'echo') { const L2 = Math.max(1e-3, d), ux = (p.x - this.pos.x) / L2, uz = (p.z - this.pos.z) / L2; a.line = { from: { x: this.pos.x, z: this.pos.z }, to: { x: this.pos.x + ux * A.range, z: this.pos.z + uz * A.range }, w: A.line.w }; }
      if (name === 'accident') { const c = sense.companion; a.line = { from: { x: this.pos.x, z: this.pos.z }, to: { x: c.x, z: c.z }, w: A.line.w }; }
      evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: a.at || null, line: a.line || null });
      return;
    }
    if (d > 2.2) out.move = { x: p.x, z: p.z, speed: this.def.speed.angry };
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') {
      if (p && !A.aoe && !a.line) { out.face = { x: p.x, z: p.z }; out.faceRate = 2.4; }
      if (a.line) out.face = { x: a.line.to.x, z: a.line.to.z };
      if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null, line: a.line || null }); if (a.name === 'echo') { this.pos.x = a.line.to.x - (a.line.to.x - a.line.from.x) * 0.15; this.pos.z = a.line.to.z - (a.line.to.z - a.line.from.z) * 0.15; } }
    } else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.phases[this.phase].cooldown * (0.85 + this.rand() * 0.3); }
  }
}
