// 異形の状態機械の共通部分（ENEMY_AI_SPEC §1.2・§1.3）。DOM・three.js なし。
// 位置は {x, z}（m）、時間は秒（世界の時間。ジャスト回避のスロー中は dt が小さくなる）。
// update(dt, sense) → { move:{x,z,speed}|null, face:{x,z}|null, events:[] }
// sense = { player:{x,z,noise:'run'|'walk'|'none',dead}, los:bool, dark:bool, gunshot:{x,z}|null, ... }
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const dist2 = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return Math.sqrt(dx * dx + dz * dz); };
export function angleTo(from, yaw, to) {
  // yaw：+z を 0、+x を π/2 とする向き。from から to への向きとの差（度）
  const a = Math.atan2(to.x - from.x, to.z - from.z);
  let d = a - yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d) * 180 / Math.PI;
}

export class Brain {
  constructor(def, opt = {}) {
    this.def = def; this.id = opt.id || 'e'; this.kind = opt.kind || 'enemy';
    this.hp = opt.hp != null ? opt.hp : def.hp; this.hpMax = def.hp;
    this.pos = { x: opt.pos ? opt.pos.x : 0, z: opt.pos ? opt.pos.z : 0 };
    this.yaw = opt.yaw || 0;
    this.state = 'loop'; this.t = 0; this.total = 0;
    this.rand = rng(opt.seed || 1);
    this.lastSeen = null; this.lastSeenT = -99;
    this.cool = 0; this.patIdx = 0; this.atk = null;
    this.resolution = null;              // 'rescue' | 'neutralize' | 'escape' | 'kill'
    this.hostileBy = null;
    this.poiseMax = def.poise || 40; this.poise = this.poiseMax; this.poiseT = 99;   // 体幹（0 で大きくよろける）
    this.chainable = false;                                                         // 「見切り」状態（青い縁）：連鎖一閃の相手
  }
  /** 体幹の回復（EnemyActor が毎ステップ呼ぶ） */
  tickPoise(dt, C) {
    this.poiseT += dt;
    if (C && this.poiseT > C.regenDelay && this.poise < this.poiseMax) this.poise = Math.min(this.poiseMax, this.poise + C.regen * dt);
  }
  get alive() { return this.state !== 'dead'; }
  get resolved() { return this.resolution === 'rescue' || this.resolution === 'kill' || this.resolution === 'neutralize'; }
  get attacking() { return this.state === 'hostile' && this.atk && this.atk.phase !== 'recover'; }
  go(state, evs, why) { if (this.state !== state) { const from = this.state; this.state = state; this.t = 0; if (from === 'stagger' || from === 'down') this.chainable = false; evs && evs.push({ t: 'state', from, to: state, why: why || '' }); } }

  sees(sense) {
    const p = sense.player; if (!p || p.dead) return false;
    const S = this.def.senses;
    const d = dist2(this.pos, p);
    const range = sense.dark ? S.sightDark : S.sight;
    if (d > range) return false;
    if (d < 1.0) return true;                                     // すぐそばは気配で分かる
    if (angleTo(this.pos, this.yaw, p) > S.fov / 2) return false;
    return sense.los !== false;
  }
  hears(sense) {
    const S = this.def.senses.hear, p = sense.player;
    if (sense.gunshot && dist2(this.pos, sense.gunshot) <= S.gun) return 'gun';
    if (!p || p.dead) return null;
    const d = dist2(this.pos, p);
    if (p.noise === 'run' && d <= S.run) return 'run';
    if (p.noise === 'walk' && d <= S.walk) return 'walk';
    return null;
  }

  /** 攻撃を受けた。kind：'slash'|'shot'|'issen'。戻り値：実際に入ったダメージ */
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    this.hp = Math.max(0, this.hp - dmg);
    evs.push({ t: 'hurt', dmg, kind });
    if (this.hp <= 0) { this.atk = null; this.resolution = 'kill'; this.chainable = false; this.go('dead', evs, 'hp0'); evs.push({ t: 'die' }); return dmg; }
    this.hostileBy = 'attacked';
    // 体幹を削る。0 で大きくよろける（青い縁）
    if (this.state === 'down') return dmg;                                         // 崩れている間は崩れたまま（体幹も減らない）
    if (opt.poise) { this.poise -= opt.poise * (this.def.poiseMul ?? 1); this.poiseT = 0; }
    if (this.poise <= 0) {
      this.poise = this.poiseMax; this.atk = null; this.chainable = true;
      this.staggerFor = (this.def.stagger.broken || 1.6); this.state = 'hostile'; this.go(this.def.downState || 'stagger', evs, 'broken'); this.chainable = true;
      evs.push({ t: 'broken' }); return dmg;
    }
    if (kind === 'issen' || (this.state !== 'hostile' && this.state !== 'stagger')) { this.atk = null; const wasSt = this.state === 'stagger'; this.go('stagger', evs, 'hit'); this.staggerFor = kind === 'issen' ? 1.3 : this.def.stagger.hit + 0.2; if (kind === 'issen') this.chainable = true; else if (!wasSt) this.chainable = false; }
    else if (this.atk && this.atk.phase === 'windup' && kind !== 'shot') { /* 予兆中の軽い攻撃では止まらない（スーパーアーマー無し：少し遅らせる） */ this.atk.t -= 0.06; }
    return dmg;
  }
  parried(evs = []) {
    if (!this.alive) return;
    this.atk = null; this.staggerFor = this.def.stagger.parried; this.go('stagger', evs, 'parried'); this.chainable = true;
  }
  /** 一閃のスロー演出中などに、攻撃を中断させる */
  interrupt(evs = []) { this.atk = null; this.cool = Math.max(this.cool, 0.6); }
  immune() { return false; }

  // ── 敵対中の共通処理（追う・予兆・攻撃・戻り） ──
  hostileTick(dt, sense, out) {
    const p = sense.player, evs = out.events;
    const seen = this.sees(sense) || dist2(this.pos, p) < 2.5;
    if (seen) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; }
    if (this.cool > 0) this.cool -= dt;
    if (this.atk) {
      const a = this.atk, A = this.def.attacks[a.name];
      a.t += dt;
      if (a.phase === 'windup') {
        out.face = { x: p.x, z: p.z }; out.faceRate = 3.2;
        if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A }); }
      } else if (a.phase === 'active') {
        if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; }
      } else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.cooldown * (0.8 + this.rand() * 0.5); }
      return true;
    }
    if (p.dead) return false;
    const d = dist2(this.pos, p);
    const next = this.def.pattern[this.patIdx % this.def.pattern.length];
    const A = this.def.attacks[next];
    if (seen && d <= A.range * 0.85 && this.cool <= 0) {
      this.patIdx++;
      this.atk = { name: next, phase: 'windup', t: 0 };
      evs.push({ t: 'telegraph', name: next, def: A, parryable: A.parryable });
      out.face = { x: p.x, z: p.z };
      return true;
    }
    if (this.lastSeen && this.total - this.lastSeenT <= this.def.senses.memory) {
      const tgt = seen ? p : this.lastSeen;
      if (d > A.range * 0.6) out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.angry };
      out.face = { x: tgt.x, z: tgt.z };
      return true;
    }
    return false;                                                // 見失った
  }
}
