// 継接（つぎはぎ・第5章のボス）【仮】。DOM・three.js なし（node でテスト）。data/enemies.js の tsugihagi。
// いくつもの可能性の体がつながった存在。部分（右腕・左腕・脚）ごとに体力があり、壊すと行動が変わる（ENEMY_AI_SPEC §2.6）。
//   右腕：戸を叩く（knock・白）→ 壊すと戸を叩かず暴れる（thrash・赤）／左腕：鞄を抱いて揺らす・抱き寄せる（embrace・赤・つかむ）→ 壊すと鞄を落とす
//   脚：帰り道を歩く・踏みつけ（stomp・赤・円）→ 壊すと動けない（fallen＝無力化）
// 体幹が崩れる（down）と左腕がゆるみ、鞄が落ちる。救う＝鞄を本来の持ち主の机へ返す（returnBag）→ 部分がほどける（unravel）。逃げるは不可。
// 部分の狙い：hurt の opt.side（'right'|'left'|'front'|'back'）。崩れている間（down）の攻撃は脚へ。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Tsugihagi extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.tsugihagi, Object.assign({ kind: 'tsugihagi' }, opt));
    const P = this.def.parts, k = opt.assist ? 0.75 : 1;
    this.parts = { right: { hp: Math.round(P.right * k), max: Math.round(P.right * k), alive: true }, left: { hp: Math.round(P.left * k), max: Math.round(P.left * k), alive: true }, legs: { hp: Math.round(P.legs * k), max: Math.round(P.legs * k), alive: true } };
    if (opt.assist) { this.hp = this.hpMax = Math.round(this.def.hp * k); }
    this.bag = 'held'; this.bagAt = null; this.phase = 0;
    this.home = opt.home ? opt.home.map(([x, z]) => ({ x, z })) : [{ x: this.pos.x, z: this.pos.z }]; this.hi = 0;
    this.state = opt.state || 'loop'; this.loopSub = 'walk'; this.subT = 0;
  }
  immune() { return ['unravel', 'fallen', 'dormant'].includes(this.state); }
  get coreOpen() { return this.state === 'down'; }
  wake(evs = []) { if (['loop', 'dormant'].includes(this.state)) { this.go('hostile', evs, 'wake'); this.hostileBy = 'boss'; this.cool = 1.4; } }
  /** 今使える攻め（壊れた部分の攻めは出ない。右腕が壊れると暴れる。段階 1 から叫ぶ） */
  pattern() {
    const P = this.parts, L = [];
    if (P.right.alive) L.push('knock'); else L.push('thrash');
    if (P.legs.alive) L.push('stomp');
    if (P.right.alive) L.push('knock'); else if (!P.legs.alive) L.push('thrash');
    if (P.left.alive && this.bag === 'held') L.push('embrace');
    if (this.phase >= 1) L.push('cry');
    return L;
  }
  /** side：攻撃した側（この異形から見て）。戻り：入った傷 */
  hurt(dmg, kind, evs = [], opt = {}) {
    if (!this.alive || this.immune()) return 0;
    const P = this.parts;
    let part = null;
    if (this.state === 'down' && P.legs.alive) part = 'legs';
    else if (opt.side === 'right' && P.right.alive) part = 'right';
    else if (opt.side === 'left' && P.left.alive) part = 'left';
    else if (opt.side === 'back' && P.legs.alive) part = 'legs';
    if (part) { const p = P[part]; p.hp = Math.max(0, p.hp - dmg); evs.push({ t: 'partHit', part, hp: p.hp, max: p.max }); if (p.hp <= 0 && p.alive) this.breakPart(part, evs); }
    if (!this.alive || this.state === 'fallen') return dmg;
    const wasDown = this.state === 'down';
    const r = super.hurt(dmg, kind === 'issen' ? 'slash' : kind, evs, opt);
    if (this.state === 'dead') { this.atk = null; return r; }
    if (!wasDown && this.state === 'down') this.dropBag(evs);
    const ratio = this.hp / this.hpMax, PH = this.def.phases; let ph = 0; for (let i = 0; i < PH.length; i++) if (ratio <= PH[i].at) ph = i;
    if (ph > this.phase) { this.phase = ph; evs.push({ t: 'phase', n: ph }); }
    if (this.state === 'stagger' && kind !== 'issen') this.go('hostile', evs, 'armor');      // 大きな体：小さな傷ではよろけない
    return r;
  }
  breakPart(part, evs) {
    const p = this.parts[part]; p.alive = false; p.hp = 0; evs.push({ t: 'partBroken', part });
    if (part === 'left') this.dropBag(evs);
    if (part === 'legs') { this.atk = null; this.resolution = 'neutralize'; this.go('fallen', evs, 'legs'); evs.push({ t: 'neutralized' }); }
  }
  dropBag(evs) { if (this.bag !== 'held') return; this.bag = 'dropped'; this.bagAt = { x: this.pos.x + Math.sin(this.yaw) * 1.6, z: this.pos.z + Math.cos(this.yaw) * 1.6 }; evs.push({ t: 'bagDrop', at: this.bagAt }); }
  /** 鞄を拾われた／取り返した（抱き寄せで落とさせた） */
  bagTaken() { if (this.bag === 'dropped') this.bag = 'carried'; }
  bagLost(at) { if (this.bag === 'carried') { this.bag = 'dropped'; this.bagAt = at; } }
  /** 鞄を持ち主の机へ返した：部分がほどける（救う） */
  returnBag(evs = []) {
    if (!this.alive || this.resolution || this.bag === 'held') return false;
    this.bag = 'returned'; this.atk = null; this.resolution = 'rescue'; this.go('unravel', evs, 'bag'); evs.push({ t: 'rescued' }); return true;
  }
  parried(evs = []) { super.parried(evs); }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt; this.subT += dt;
    const p = sense.player;
    switch (this.state) {
      case 'dead': case 'unravel': case 'fallen': case 'dormant': break;
      case 'loop': {
        // 輪：脚は帰り道を歩き、右腕は止まるたびに戸を叩く。左腕は鞄を揺らす
        const tgt = this.home[this.hi];
        if (this.loopSub === 'walk') { if (dist2(this.pos, tgt) > 0.4) { out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.walk }; out.face = tgt; } else { this.loopSub = 'knock'; this.subT = 0; evs.push({ t: 'say', key: 'tsugi_knock' }); } }
        else if (this.subT > 3.2) { this.loopSub = 'walk'; this.hi = (this.hi + 1) % this.home.length; }
        if (p && !p.dead && dist2(this.pos, p) < 5.5) this.wake(evs);
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
    if (this.atk) { this.atkTick(dt, sense, out); return; }
    const d = dist2(this.pos, p);
    out.face = { x: p.x, z: p.z }; out.faceRate = 1.6;
    const L = this.pattern(), name = L[this.patIdx % L.length], A = this.def.attacks[name];
    const reach = A.ranged ? A.range : A.aoe ? A.aoe.r + 0.4 : A.range * 0.9;
    if (this.cool <= 0 && d <= reach) { this.patIdx++; this.startAttack(name, sense, evs); return; }
    if (this.cool <= 0 && d > reach && !this.parts.legs.alive) { this.patIdx++; return; }          // 動けない：届く攻めを待つ
    if (this.parts.legs.alive && d > 2.6) out.move = { x: p.x, z: p.z, speed: sense.carrying ? this.def.speed.angry * 1.25 : this.def.speed.angry };
  }
  startAttack(name, sense, evs) {
    const A = this.def.attacks[name], p = sense.player;
    this.atk = { name, phase: 'windup', t: 0 };
    if (A.aoe) this.atk.at = A.ranged && p ? { x: p.x, z: p.z } : { x: this.pos.x, z: this.pos.z };
    evs.push({ t: 'telegraph', name, def: A, parryable: A.parryable, at: this.atk.at || null });
  }
  atkTick(dt, sense, out) {
    const a = this.atk, A = this.def.attacks[a.name], p = sense.player, evs = out.events;
    a.t += dt;
    if (a.phase === 'windup') { if (p && !A.aoe) { out.face = { x: p.x, z: p.z }; out.faceRate = 2.4; } if (a.t >= A.windup) { a.phase = 'active'; a.t = 0; evs.push({ t: 'attack', name: a.name, def: A, at: a.at || null }); } }
    else if (a.phase === 'active') { if (a.t >= A.active) { a.phase = 'recover'; a.t = 0; } }
    else if (a.t >= A.recover) { this.atk = null; this.cool = this.def.phases[this.phase].cooldown * (0.85 + this.rand() * 0.3); }
  }
}

/** 攻撃した側（異形から見て）：異形の向き yaw・位置 from、攻撃者 at */
export function sideOf(from, yaw, at) {
  let a = Math.atan2(at.x - from.x, at.z - from.z) - yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
  const deg = a * 180 / Math.PI;
  if (Math.abs(deg) <= 35) return 'front'; if (Math.abs(deg) >= 140) return 'back';
  return deg > 0 ? 'left' : 'right';                                           // +x がこの異形の左（キャラクターの約束）
}
