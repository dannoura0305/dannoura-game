// 巨大猫又の戦闘の状態機械（COMBAT_SYSTEM_SPEC §5・concept_04）【仮】。DOM・three.js なし（node でテスト）。1 tick ＝ 60Hz の 1 フレーム。
// 操作：妖爪連撃（攻撃・3 段）／紫の咆哮（弾く：予兆中の攻めを止める・近くの小物を払う）／跳躍（回避：無敵・着地で衝撃）／妖気放出（構え：押している間の光線）。
// 巨大化の妖力（gauge）：咆哮・妖気放出で使い、当てると戻る。0 でも元に戻らない（暴走もしない）：動きと威力が少し落ちるだけ。
// 市民を攻撃する操作は無い（第6章A の決まりを先に守る）。区画にも人を置かない。
import { COMBAT } from '../data/combat.js';

export class GiantFighter {
  constructor(opt = {}) {
    this.C = opt.combat || COMBAT; const G = this.C.giant;
    this.hpMax = G.hp; this.hp = opt.hp != null ? opt.hp : G.hp;
    this.gauge = opt.gauge != null ? opt.gauge : G.gauge.start;
    this.frame = 0; this.st = { name: 'free', f: 0 };
    this.press = { attack: -999, dodge: -999, parry: -999 };
    this.invulnUntil = -1; this.combo = { n: 0, last: -9999, max: 0 };
    this.mikiri = null; this.log = [];
  }
  get G() { return this.C.giant; }
  get dead() { return this.st.name === 'dead'; }
  get weak() { return this.gauge <= 0; }
  /** 移動の倍率（0 なら動けない） */
  moveMul() { const n = this.st.name; const k = this.weak ? this.G.gauge.weakMul : 1; if (n === 'free') return k; if (n === 'beam') return 0.15 * k; return 0; }
  dmgMul() { return this.weak ? this.G.gauge.weakMul : 1; }
  _go(name, extra) { this.st = Object.assign({ name, f: 0 }, extra || {}); }
  _ev(evs, e) { e.frame = this.frame; evs.push(e); this.log.push(e); if (this.log.length > 64) this.log.shift(); }
  _buf(k) { return this.frame - this.press[k] <= this.G.buffer; }
  _use(k) { this.press[k] = -999; }
  gain(n) { const b = this.gauge; this.gauge = Math.max(0, Math.min(this.G.gauge.max, this.gauge + n)); return this.gauge - b; }
  registerHit() { this.combo.n = this.frame - this.combo.last <= 150 ? this.combo.n + 1 : 1; this.combo.last = this.frame; this.combo.max = Math.max(this.combo.max, this.combo.n); this.gain(this.G.gauge.hit); }
  get comboN() { return this.frame - this.combo.last <= 150 ? this.combo.n : 0; }
  isInvuln() { const L = this.G.leap, s = this.st; return this.frame < this.invulnUntil || (s.name === 'leap' && s.f >= L.iStart && s.f <= L.iEnd); }

  /** inp：{ attack, dodge, parry, aim（押している間） } */
  tick(inp = {}) {
    const evs = [], G = this.G;
    if (inp.attack) this.press.attack = this.frame;
    if (inp.dodge) this.press.dodge = this.frame;
    if (inp.parry) this.press.parry = this.frame;
    if (this.dead) { this.frame++; return evs; }
    if (this.st.name !== 'beam') this.gauge = Math.min(G.gauge.max, this.gauge + G.gauge.regen / 60);
    // 見切り（跳躍のジャスト）の窓：その間に攻撃で「見切り・妖爪」
    if (this.mikiri && this.frame - this.mikiri.at <= 30 && this._buf('attack') && this.st.name !== 'hurt') {
      const src = this.mikiri.src; this.mikiri = null; this._use('attack');
      const a = Object.assign({}, G.claw[2], { dmg: Math.round(G.claw[2].dmg * 1.5) });
      this._go('claw', { step: 2, atk: a, counter: true }); this._ev(evs, { t: 'clawStart', step: 2, atk: a, counter: true, src });
      this.frame++; return evs;
    }
    const s = this.st; s.f++;
    switch (s.name) {
      case 'free': this._free(evs, inp); break;
      case 'claw': this._claw(evs, inp); break;
      case 'roar': {
        const R = G.roar;
        if (s.f === R.startup) this._ev(evs, { t: 'roarBurst', range: R.range, stun: R.stun, dmg: R.dmg });
        if (s.f >= R.startup && s.f < R.startup + R.active) s.open = true; else s.open = false;
        if (s.f >= R.startup + R.active + R.recovery) this._go('free');
        break;
      }
      case 'leap': {
        const L = G.leap;
        if (s.f === L.total - 6) this._ev(evs, { t: 'land', dmg: L.land.dmg, r: L.land.r });
        if (s.f >= L.total) { this._go('free'); this._free(evs, inp); }
        break;
      }
      case 'beam': {
        const B = G.beam;
        if (s.f > B.startup && (s.f - B.startup) % B.tick === 0) { this._ev(evs, { t: 'beamTick', dmg: B.dmg, range: B.range, width: B.width }); }
        if (s.f > B.startup) this.gauge = Math.max(0, this.gauge - B.drain);
        const held = inp.aim && this.gauge > 0;
        if ((!held && s.f > B.startup + B.min) || s.f - B.startup >= B.max || (this.gauge <= 0 && s.f > B.startup)) { this._ev(evs, { t: 'beamEnd' }); this._go('beamEnd'); }
        break;
      }
      case 'beamEnd': if (s.f >= G.beam.recovery) this._go('free'); break;
      case 'hurt': if (s.f >= G.hurt.stun) this._go('free'); break;
    }
    this.frame++;
    return evs;
  }
  _free(evs, inp) {
    const G = this.G;
    if (this._buf('dodge')) { this._use('dodge'); this._go('leap'); this._ev(evs, { t: 'leap', dist: G.leap.dist }); return; }
    if (this._buf('parry')) {
      this._use('parry');
      if (this.gauge < G.roar.cost) { this._ev(evs, { t: 'noGauge', need: G.roar.cost }); return; }
      this.gauge -= G.roar.cost; this._go('roar'); this._ev(evs, { t: 'roar' }); return;
    }
    if (inp.aim) { if (this.gauge >= 5) { this._go('beam'); this._ev(evs, { t: 'beamStart' }); } return; }
    if (this._buf('attack')) { this._use('attack'); this._startClaw(evs, 0); }
  }
  _startClaw(evs, step) { const a = this.G.claw[step]; this._go('claw', { step, atk: a }); this._ev(evs, { t: 'clawStart', step, atk: a }); }
  _claw(evs) {
    const s = this.st, a = s.atk, end = a.startup + a.active;
    if (s.f >= a.startup && s.f < end) this._ev(evs, { t: 'clawActive', step: s.step, atk: a, first: !s.act, mul: this.dmgMul() }), s.act = true;
    if (s.f >= end) {
      if (this._buf('attack') && s.step < this.G.claw.length - 1 && !s.counter) { this._use('attack'); return this._startClaw(evs, s.step + 1); }
      if (this._buf('dodge')) { this._use('dodge'); this._go('leap'); this._ev(evs, { t: 'leap', dist: this.G.leap.dist }); return; }
    }
    if (s.f >= end + a.recovery) this._go('free');
  }
  /** 相手の攻めが届いた瞬間。atk：{ src, dmg, parryable, inRange }。戻り：'just'|'evade'|'roar'|'hit'|'miss'|'invuln' */
  incoming(atk) {
    const evs = this.out || (this.out = []), s = this.st, G = this.G;
    if (this.dead) return 'dead';
    if (s.name === 'leap') {
      if (s.f >= G.leap.iStart && s.f <= G.leap.iStart + G.leap.just && (atk.inRange || atk.nearMiss)) { this.mikiri = { src: atk.src, at: this.frame }; this._ev(evs, { t: 'just', src: atk.src }); return 'just'; }
      if (this.isInvuln()) return 'evade';
    }
    if (!atk.inRange) return 'miss';
    if (s.name === 'roar' && s.open && atk.parryable) { this._ev(evs, { t: 'roarCounter', src: atk.src }); return 'roar'; }
    if (this.frame < this.invulnUntil) return 'invuln';
    const dmg = Math.max(1, Math.round(atk.dmg * (this.weak ? 1.25 : 1)));
    this.hp = Math.max(0, this.hp - dmg); this.invulnUntil = this.frame + G.hurt.invuln; this.combo.n = 0;
    this._ev(evs, { t: 'hurt', dmg, src: atk.src });
    if (this.hp <= 0) { this._go('dead'); this._ev(evs, { t: 'dead' }); } else if (s.name !== 'beam') this._go('hurt');
    return 'hit';
  }
  drain() { const e = this.out || []; this.out = []; return e; }
}
