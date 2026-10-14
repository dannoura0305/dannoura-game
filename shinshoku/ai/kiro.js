// 帰路（きろ）：家に帰る道の途中で置き換えられた住人（ENEMY_AI_SPEC §2.1）。
// 輪：道を歩く → 家の戸を叩く → 待つ → 引き返す → …
// 見定め：道をふさぐ者・攻撃した者・銃声 → 敵とみなす（押しのけ・つかみ）。そうでなければ無関係として輪に戻る。
// 取り違え：自分の家の戸を開けた者を「家族」とみなす → 攻撃しない・家に入って眠る（救う）。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Kiro extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.kiro, Object.assign({ kind: 'kiro' }, opt));
    this.path = opt.path || [{ x: 0, z: 0 }, { x: 0, z: -10 }];
    this.home = opt.home || 'door_1';
    this.idx = opt.startIdx || 0; this.dir = 1;
    this.pos = { x: this.path[this.idx].x, z: this.path[this.idx].z };
    this.doorOpen = false;
    this.knocks = 0;
  }
  immune() { return this.state === 'family' || this.state === 'home'; }
  /** 自分の家の戸が開いた（救う） */
  openDoor(evs = []) {
    if (!this.alive || this.doorOpen) return;
    this.doorOpen = true; this.atk = null;
    this.go('family', evs, 'door');
    evs.push({ t: 'misread', as: 'family' });
  }
  /** プレイヤーが自分の帰り道をふさいでいるか（進む先の 2 区間に近い） */
  blocking(p) {
    const P = this.path;
    for (let k = 0; k < 2; k++) {
      const i = this.idx + this.dir * k, j = i + this.dir;
      if (i < 0 || j < 0 || i >= P.length || j >= P.length) break;
      if (segDist(P[i], P[j], p) <= this.def.protect.block && dist2(this.pos, p) < 5) return true;
    }
    return false;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'loop': {
        const s = this.loopTick(dt, out);
        if (p && !p.dead) {
          const seen = this.sees(sense), heard = this.hears(sense);
          if (heard === 'gun' || (seen && (this.blocking(p) || dist2(this.pos, p) < 1.3))) {
            this.cause = heard === 'gun' ? 'gun' : 'block'; this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]);
            this.go('assess', evs, this.cause); evs.push({ t: 'notice' });
          } else if (heard === 'run' && this.sub !== 'knock') { out.face = { x: p.x, z: p.z }; out.move = null; }
        }
        void s; break;
      }
      case 'assess': {                                           // 見定め：止まって見る（ホラーの「間」）
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          const still = p && !p.dead && (this.blocking(p) || dist2(this.pos, p) < 2.2 || this.cause === 'gun' || this.hostileBy);
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }); }
          else { this.go('loop', evs, 'unrelated'); }
        }
        break;
      }
      case 'hostile': {
        if (!this.hostileTick(dt, sense, out)) { this.go('search', evs, 'lost'); }
        else if (p && dist2(this.pos, p) > 22 && !this.atk) { this.resolution = this.resolution || null; this.go('search', evs, 'far'); }
        break;
      }
      case 'search': {                                           // 最後に見た所へ行って見回す → 輪へ
        const pl = p && !p.dead && this.sees(sense);
        if (pl && (this.blocking(p) || this.hostileBy)) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'found'); break; }
        if (this.lastSeen && dist2(this.pos, this.lastSeen) > 0.6 && this.t < 4) out.move = { x: this.lastSeen.x, z: this.lastSeen.z, speed: this.def.speed.search };
        if (this.t > 6) { this.hostileBy = null; this.idx = this.nearestIdx(); this.go('loop', evs, 'giveup'); evs.push({ t: 'calm' }); }
        break;
      }
      case 'stagger': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
      case 'family': {                                           // 家族だと思って、家に入る
        const door = this.path[this.path.length - 1];
        if (dist2(this.pos, door) > 0.35) { out.move = { x: door.x, z: door.z, speed: this.def.speed.walk * 1.2 }; out.face = { x: door.x, z: door.z }; }
        else { this.go('home', evs, 'enter'); this.resolution = 'rescue'; evs.push({ t: 'rescued' }); }
        break;
      }
      case 'home': case 'dead': break;
    }
    return out;
  }
  loopTick(dt, out) {
    const P = this.path, evs = out.events;
    if (!this.sub) this.sub = 'walk';
    if (this.sub === 'walk') {
      const tgt = P[this.idx];
      if (dist2(this.pos, tgt) < 0.25) {
        if (this.dir > 0 && this.idx === P.length - 1) { this.sub = 'knock'; this.subT = 0; this.knocks = 0; }
        else if (this.dir < 0 && this.idx === 0) { this.dir = 1; this.idx = 1; }
        else this.idx += this.dir;
      } else { out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.walk }; out.face = { x: tgt.x, z: tgt.z }; }
    } else if (this.sub === 'knock') {
      this.subT += dt;
      const door = P[P.length - 1], prev = P[P.length - 2] || door;
      out.face = { x: door.x + (door.x - prev.x) * 2 + (this.doorFace ? this.doorFace.x : 0), z: door.z + (door.z - prev.z) * 2 + (this.doorFace ? this.doorFace.z : 0) };
      if (this.subT >= (this.knocks + 1) * 0.8 && this.knocks < 3) { this.knocks++; evs.push({ t: 'knock' }); }
      if (this.subT >= this.def.loop.knock) { this.sub = 'wait'; this.subT = 0; }
    } else if (this.sub === 'wait') {
      this.subT += dt;
      if (this.subT >= this.def.loop.wait) { this.sub = 'walk'; this.dir = -1; this.idx = Math.max(0, P.length - 2); evs.push({ t: 'turnback' }); }
    }
  }
  nearestIdx() { let b = 0, bd = 1e9; this.path.forEach((q, i) => { const d = dist2(this.pos, q); if (d < bd) { bd = d; b = i; } }); this.sub = 'walk'; return b; }
}

function segDist(a, b, p) {
  const vx = b.x - a.x, vz = b.z - a.z, wx = p.x - a.x, wz = p.z - a.z;
  const L = vx * vx + vz * vz; let t = L ? (wx * vx + wz * vz) / L : 0; t = Math.max(0, Math.min(1, t));
  const dx = a.x + vx * t - p.x, dz = a.z + vz * t - p.z; return Math.sqrt(dx * dx + dz * dz);
}
