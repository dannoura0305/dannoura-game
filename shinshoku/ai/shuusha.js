// 収容者（旧研究棟の被験者・第5章）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の shuusha。
// 輪：自分の部屋の前の廊下を往復する。点呼の鐘（bell）で、収容の古い順に 1 人ずつ戸口へ歩いて立つ（観察の手掛かり）→ しばらくして輪へ戻る。
// 救う：点呼卓で在棟の人を正しい順に呼ぶ（called）→ 部屋へ戻って休む（rest）。違う順で呼ぶと騒ぐ（agitate：敵対）。倒すもできる。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Shuusha extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.shuusha, Object.assign({ kind: 'shuusha' }, opt));
    this.path = opt.path || [[this.pos.x, this.pos.z]]; this.pi = 0;
    this.subject = opt.subject || null; this.door = opt.door || null; this.room = opt.room || null;
    this.state = opt.state || 'loop'; this.bellAt = null; this.atDoor = false;
  }
  immune() { return this.state === 'rest'; }
  /** 点呼の鐘：order 番目（0 から）に戸口へ */
  bell(order) { if (!this.alive || this.resolution || this.state !== 'loop') return false; this.state = 'bell'; this.t = 0; this.bellAt = order * 1.6; this.atDoor = false; return true; }
  /** 正しい点呼で名前を呼ばれた：部屋へ戻って休む（救う） */
  called(evs = []) { if (!this.alive || this.resolution) return false; this.resolution = 'rescue'; this.atk = null; this.hostileBy = null; this.go('home', evs, 'rollcall'); evs.push({ t: 'rescued' }); return true; }
  /** 違う点呼：騒いで敵対 */
  agitate(evs = [], at = null) { if (!this.alive || this.resolution) return false; if (this.state !== 'hostile') { this.hostileBy = 'rollcall'; if (at) { this.lastSeen = { x: at.x, z: at.z }; this.lastSeenT = this.total; } this.go('hostile', evs, 'wrong'); evs.push({ t: 'hostile' }); this.cool = 0.8; } return true; }
  hurt(dmg, kind, evs = [], opt = {}) { if (['loop', 'bell', 'assess'].includes(this.state)) { this.hostileBy = 'attacked'; this.lastSeenT = this.total; } return super.hurt(dmg, kind, evs, opt); }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    const go = (tgt, sp) => { if (dist2(this.pos, tgt) > 0.25) { out.move = { x: tgt.x, z: tgt.z, speed: sp || this.def.speed.walk }; out.face = { x: tgt.x, z: tgt.z }; return false; } return true; };
    switch (this.state) {
      case 'dead': case 'rest': break;
      case 'home': if (!this.room || go(this.room, 1.4)) { this.go('rest', evs, 'home'); } break;
      case 'bell': {
        if (this.t < this.bellAt) break;
        if (this.door && !this.atDoor) { if (go(this.door, 1.3)) { this.atDoor = true; this.doorT = 0; evs.push({ t: 'atDoor', room: this.subject && this.subject.room }); } }
        else { this.doorT = (this.doorT || 0) + dt; if (this.room) out.face = { x: this.room.x, z: this.room.z }; if (this.doorT > 6) { this.atDoor = false; this.go('loop', evs, 'bellEnd'); evs.push({ t: 'bellEnd' }); } }
        this.notice(sense, evs);
        break;
      }
      case 'loop': {
        const tgt = { x: this.path[this.pi][0], z: this.path[this.pi][1] };
        if (go(tgt)) this.pi = (this.pi + 1) % this.path.length;
        if (Math.floor(this.total / 9) !== Math.floor((this.total - dt) / 9)) evs.push({ t: 'say', key: 'shuusha_idle' });
        this.notice(sense, evs);
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          const still = p && !p.dead && (this.hostileBy || this.cause === 'gun' || dist2(this.pos, p) < 3.2);
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }); }
          else this.go('loop', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': if (!this.hostileTick(dt, sense, out)) { this.hostileBy = null; this.go('loop', evs, 'lost'); } break;
      case 'stagger': case 'down': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
    }
    return out;
  }
  /** 見定め：殴られた・銃声・走る音・すぐそば */
  notice(sense, evs) {
    const p = sense.player; if (!p || p.dead) return;
    const heard = this.hears(sense), d = dist2(this.pos, p);
    if (this.hostileBy || heard === 'gun' || (heard === 'run' && d < 4) || d < 1.3) {
      this.cause = this.hostileBy ? 'hit' : heard || 'near';
      this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]);
      this.go('assess', evs, this.cause); evs.push({ t: 'notice' });
    }
  }
}
