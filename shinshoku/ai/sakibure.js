// 境界の先触れ（第4章 reveal のボス・仮名）【仮】。DOM・three.js なし（node でテスト）。巨大猫又と戦う。data/enemies.js の sakibure。
// 根を張ったまま少しずつ寄ってくる巨体。攻め：薙ぎ（白・咆哮で返せる）／瞳の光線（赤・線）／侵食の雨（赤・円×5）／喰らう（白・詰所への線：間に立つか咆哮で守る）。
// 段階：体力 60%・30% で攻めが速く・種類が増える。咆哮で止まる・体幹が崩れると「縁の輪」（核）が開き、与える傷が 2 倍。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Sakibure extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.sakibure, Object.assign({ kind: 'sakibure' }, opt));
    this.state = opt.state || 'dormant'; this.phase = 0; this.r = opt.r || 8;
    this.home = { x: this.pos.x, z: this.pos.z }; this.keep = opt.keep || 30; this.leash = opt.leash || 14;
  }
  immune() { return this.state === 'dormant' || this.state === 'rest'; }
  get coreOpen() { return this.state === 'stagger' || this.state === 'down'; }
  wake(evs = []) { if (this.state === 'dormant') { this.go('hostile', evs, 'wake'); this.cool = 2.0; this.hostileBy = 'boss'; } }
  phaseDef() { return this.def.phases[this.phase]; }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    if (opt.core || this.coreOpen) dmg = Math.round(dmg * (this.coreOpen ? this.def.coreMul : 1));
    this.hp = Math.max(0, this.hp - dmg); evs.push({ t: 'hurt', dmg, kind, core: this.coreOpen });
    if (this.hp <= 0) { this.atk = null; this.resolution = 'kill'; this.go('dead', evs, 'hp0'); evs.push({ t: 'die' }); return dmg; }
    // 段階
    const r = this.hp / this.hpMax, P = this.def.phases;
    while (this.phase < P.length - 1 && r <= P[this.phase + 1].at) { this.phase++; this.patIdx = 0; evs.push({ t: 'phase', n: this.phase }); }
    if (this.state === 'down' || this.state === 'stagger') return dmg;
    if (opt.poise) { this.poise -= opt.poise * (this.def.poiseMul ?? 1); this.poiseT = 0; }
    if (this.poise <= 0) { this.poise = this.poiseMax; this.atk = null; this.staggerFor = this.def.stagger.broken; this.go('down', evs, 'broken'); evs.push({ t: 'broken' }); }
    return dmg;
  }
  /** 咆哮で止められた（予兆中・白の攻め）＝ひるんで核が開く */
  roared(evs = []) {
    if (!this.alive || this.immune()) return false;
    const inWindup = this.atk && this.atk.phase === 'windup';
    this.atk = null; this.staggerFor = this.def.stagger.roar; this.go('stagger', evs, 'roar'); evs.push({ t: 'roared', interrupted: !!inWindup }); return true;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'dormant': case 'dead': case 'rest': break;
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 1)) this.go('hostile', evs, 'recover'); break;
      case 'hostile': this.fight(dt, sense, out); break;
    }
    return out;
  }
  fight(dt, sense, out) {
    const p = sense.player, evs = out.events;
    if (!p || p.dead) return;
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    out.face = { x: p.x, z: p.z }; out.faceRate = 0.8;
    const d = dist2(this.pos, p);
    if (d > this.keep && dist2(this.pos, this.home) < this.leash) out.move = { x: p.x, z: p.z, speed: this.def.speed.walk };
    if (this.cool <= 0) {
      const pat = this.phaseDef().pattern; let name = pat[this.patIdx % pat.length];
      if (name === 'sweep' && d > this.def.attacks.sweep.range * 0.9) name = 'beam';             // 遠い時の薙ぎは光線に
      if (name === 'feed' && !sense.shelter) name = 'beam';
      this.patIdx++; this.startAttack(name, sense, evs);
    }
  }
  startAttack(name, sense, evs) {
    const A = this.def.attacks[name], p = sense.player;
    const a = this.atk = { name, phase: 'windup', t: 0 };
    if (name === 'beam' || name === 'feed') { const tgt = name === 'feed' ? sense.shelter : p; a.line = { from: { x: this.pos.x, z: this.pos.z }, to: { x: tgt.x, z: tgt.z }, w: A.line.w }; }
    if (name === 'rain') { a.circles = []; const n = A.aoe.n; for (let i = 0; i < n; i++) { const ang = this.rand() * Math.PI * 2, r = i === 0 ? 0 : 6 + this.rand() * 12; a.circles.push({ x: p.x + Math.sin(ang) * r, z: p.z + Math.cos(ang) * r, r: A.aoe.r }); } }
    evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, line: a.line || null, circles: a.circles || null, target: A.target || null });
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') {
      if (a.name === 'beam' && a.t < A.windup * 0.6 && p) { a.line.to = { x: p.x, z: p.z }; }     // 光線は 6 割まで追い、そこで止まる（避けられる）
      if (a.name === 'sweep' && p) { out.face = { x: p.x, z: p.z }; out.faceRate = 1.2; }
      if (a.line) out.face = { x: a.line.to.x, z: a.line.to.z };
      if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A, line: a.line || null, circles: a.circles || null, target: A.target || null }); }
    } else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= A.recover) { this.atk = null; this.cool = this.phaseDef().cooldown * (0.85 + this.rand() * 0.3); }
  }
}

/** 点 p から線分 a→b への距離（巨体の当たり判定・体で受ける判定） */
export function segDist(p, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / L2));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}
/** 「喰らう」の線の間に立っているか（守る）：詰所の手前・線の幅の内 */
export function blocksLine(p, r, line) {
  const vx = line.to.x - line.from.x, vz = line.to.z - line.from.z, L2 = vx * vx + vz * vz || 1;
  const t = ((p.x - line.from.x) * vx + (p.z - line.from.z) * vz) / L2;
  return t > 0.05 && t < 0.97 && segDist(p, line.from, line.to) <= line.w / 2 + r;
}
