// 守り手（病室の大きな「記録のない患者」）【仮】：DOM・three.js なし（node でテスト）。第3章の山場（SCENARIO_FLOW 第3章）。
// 子どものベッドの前から動かない。だんのうらが子どもに近づくと押し返す（白・弾ける・弱い）。叩かれても追わない。
// 本当は外の「模倣する影」から子どもを守っている：影が来ると影の方を向き、薙ぎ払う（protect）。影がいなくなると、ひざをついて道を空ける（救う）。
// 攻め続けると倒れる（倒す：結果と台詞が変わる。進めなくなることはない）。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Mamori extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.mamori, Object.assign({ kind: 'mamori' }, opt));
    this.child = opt.child || { x: this.pos.x, z: this.pos.z - 1 };
    this.post = { x: this.pos.x, z: this.pos.z };
    this.state = 'guard'; this.hits = 0; this.threats = [];
  }
  immune() { return this.state === 'rest'; }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    this.hits++;
    this.hp = Math.max(0, this.hp - dmg); evs.push({ t: 'hurt', dmg, kind });
    if (this.hp <= 0) { this.atk = null; this.resolution = 'kill'; this.go('dead', evs, 'hp0'); evs.push({ t: 'die' }); return dmg; }
    if (this.hits === 1) evs.push({ t: 'say', key: 'mamori_hit' });
    return dmg;                                                    // 怯まない・追わない（ベッドの前に立ち続ける）
  }
  /** 影がいなくなった：ひざをついて道を空ける（救う） */
  standDown(evs = []) {
    if (!this.alive || this.state === 'rest') return false;
    this.resolution = 'rescue'; this.atk = null; this.go('rest', evs, 'safe'); evs.push({ t: 'rescued' }); return true;
  }
  /**
   * sense = { player, threats:[{id,x,z}]（近くの影）, los }
   * events：{t:'protect', id}（影を払う：ゲームが当てる）
   */
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    if (!this.alive || this.state === 'rest') return out;
    const p = sense.player, T = (sense.threats || []).filter(t => dist2(t, this.child) < 9);
    if (this.cool > 0) this.cool -= dt;
    // 影を払う（守る）
    if (T.length) {
      const t = T.reduce((a, b) => (dist2(a, this.pos) < dist2(b, this.pos) ? a : b));
      out.face = { x: t.x, z: t.z }; out.faceRate = 4;
      if (this.state !== 'protect') { this.go('protect', evs, 'threat'); evs.push({ t: 'say', key: 'mamori_protect' }); }
      if (!this.atk && this.cool <= 0 && dist2(t, this.pos) < 3.4) { this.atk = { name: 'guard', phase: 'windup', t: 0, target: t.id }; evs.push({ t: 'telegraph', name: 'guard', def: this.def.attacks.guard, parryable: false, at: null, vs: t.id }); }
      else if (dist2(t, this.pos) > 2.6 && dist2(this.pos, this.post) < 2.4) out.move = { x: t.x, z: t.z, speed: this.def.speed.angry };
    } else {
      if (this.state === 'protect' && !this.atk) this.go('guard', evs, 'calm');
      if (dist2(this.pos, this.post) > 0.3) { out.move = { x: this.post.x, z: this.post.z, speed: this.def.speed.walk }; }
      if (p && !p.dead) {
        out.face = { x: p.x, z: p.z }; out.faceRate = 1.4;
        const near = dist2(p, this.child) < this.def.keep + 0.4 && dist2(p, this.pos) < 2.6;
        if (near && !this.atk && this.cool <= 0) { this.atk = { name: 'push', phase: 'windup', t: 0 }; evs.push({ t: 'telegraph', name: 'push', def: this.def.attacks.push, parryable: true, at: null }); }
      }
    }
    if (this.atk) {
      const a = this.atk, A = this.def.attacks[a.name]; a.t += dt;
      if (a.phase === 'windup' && a.t >= A.windup) { a.phase = 'active'; a.t = 0; if (a.name === 'guard') evs.push({ t: 'protect', id: a.target, dmg: A.dmg, range: A.range }); else evs.push({ t: 'attack', name: a.name, def: A }); }
      else if (a.phase === 'active' && a.t >= A.active) { a.phase = 'recover'; a.t = 0; }
      else if (a.phase === 'recover' && a.t >= A.recover) { this.atk = null; this.cool = this.def.cooldown * (a.name === 'guard' ? 0.5 : 1); }
    }
    return out;
  }
}
