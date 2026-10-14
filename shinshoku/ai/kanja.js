// 記録のない患者（病院の異形）【仮】：DOM・three.js なし（node でテスト）。ENEMY_AI_SPEC §2.3（静養）の考えを第3章の病院に置いた版。
// 輪：病室（ベッド）⇄ 受付を、点滴の柱を引きずって往復する（「わたしの……記録は……」）。
// 見定め：走る音・銃声・明かりを当てられる・すぐそば → 0.7〜1.4 秒止まって見る（ホラーの間）。
// 取り違え：白衣の名札（任意の手掛かり）を着けた者は「看護の人」：攻めない・ついて来る。声をかける（callOut）と病室へ戻って眠る＝救う。
// 無力化：病棟の照明を落とす（lightsOff）と、戦っていない患者は眠る。倒す：体力 0。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Kanja extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.kanja, Object.assign({ kind: 'kanja' }, opt));
    this.path = opt.path || [{ x: 0, z: 0 }, { x: 0, z: -6 }];
    this.idx = 0; this.dir = 1; this.sub = 'walk'; this.subT = 0;
    this.pos = { x: this.path[0].x, z: this.path[0].z };
    this.bed = opt.bed || this.path[0];
    this.state = opt.asleep ? 'sleep' : 'loop';
  }
  immune() { return this.state === 'sleep'; }
  /** 看護の人に声をかけられた（取り違えの間だけ）＝救う */
  callOut(evs = []) {
    if (this.state !== 'nurse') return false;
    this.resolution = 'rescue'; this.atk = null; this.go('sleep', evs, 'callout'); evs.push({ t: 'rescued' }); return true;
  }
  /** 病棟の照明が落ちた：戦っていなければ眠る＝無力化 */
  lightsOff(evs = []) {
    if (!this.alive || this.state === 'sleep' || this.state === 'hostile' || this.state === 'stagger') return false;
    this.resolution = 'neutralize'; this.atk = null; this.go('sleep', evs, 'lights'); evs.push({ t: 'neutralized' }); return true;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'sleep': case 'dead': break;
      case 'loop': {
        this.loopTick(dt, out);
        if (p && !p.dead) {
          const seen = this.sees(sense), heard = this.hears(sense), d = dist2(this.pos, p);
          if (sense.nurse && seen && d < 6 && !this.hostileBy) { this.go('nurse', evs, 'badge'); evs.push({ t: 'misread', as: 'nurse' }); break; }
          if (heard === 'gun' || heard === 'run' || (seen && (d < 2.4 || sense.lit))) {
            this.cause = heard || (sense.lit ? 'light' : 'near');
            this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]);
            this.go('assess', evs, this.cause); evs.push({ t: 'notice' });
          }
        }
        break;
      }
      case 'nurse': {                                              // 看護の人について来る（攻めない）
        if (!p || p.dead) break;
        const d = dist2(this.pos, p); out.face = { x: p.x, z: p.z };
        if (d > 1.8 && d < 9) out.move = { x: p.x, z: p.z, speed: this.def.speed.walk };
        if (d >= 9 || !sense.nurse) this.go('loop', evs, 'lost');
        if (this.t > 0.2 && Math.floor(this.t / 3.2) !== Math.floor((this.t - dt) / 3.2)) evs.push({ t: 'say', key: 'kanja_nurse' });
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          const still = p && !p.dead && (this.hostileBy || this.cause === 'gun' || dist2(this.pos, p) < 3.2 || (sense.lit && dist2(this.pos, p) < 6));
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }); }
          else this.go('loop', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': {
        const keep = this.hostileTick(dt, sense, out);
        if (!keep) this.go('loop', evs, 'lost');
        // 自分の病棟から遠くへは追わない
        if (dist2(this.pos, this.bed) > 14 && !this.atk) { this.go('loop', evs, 'leash'); this.lastSeen = null; }
        break;
      }
      case 'stagger': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
    }
    return out;
  }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (this.state === 'nurse' || this.state === 'loop' || this.state === 'assess') { this.hostileBy = 'attacked'; this.lastSeenT = this.total; }
    return super.hurt(dmg, kind, evs, opt);
  }
  /** 輪：病室と受付の往復。端で止まって「記録」を探す */
  loopTick(dt, out) {
    const P = this.path, tgt = P[this.idx];
    this.subT += dt;
    if (this.sub === 'ask') { if (this.subT > 2.6) { this.sub = 'walk'; this.subT = 0; } return; }
    const d = dist2(this.pos, tgt);
    if (d < 0.25) {
      if (this.idx === 0 || this.idx === P.length - 1) { this.sub = 'ask'; this.subT = 0; out.events.push({ t: 'say', key: 'kanja_ask' }); }
      if (this.idx + this.dir < 0 || this.idx + this.dir >= P.length) this.dir *= -1;
      this.idx += this.dir;
      return;
    }
    out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.walk }; out.face = { x: tgt.x, z: tgt.z };
  }
}
