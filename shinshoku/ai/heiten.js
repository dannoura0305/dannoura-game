// 閉店（へいてん）：閉店の手順を守り続ける店員。店の設備と体が混ざっている（ENEMY_AI_SPEC §2.4）。
// 輪：明かりを消す → レジを締める → シャッターを下ろす → 「本日は閉店しました」 → 最初へ
// 取り違え：店の中の者を「お客さま」とみなす。閉店の時刻（シャッター・お辞儀の間）に残っている客を追い出す＝攻撃。
// 守る：店。店から遠く離れると追ってこない（逃げる）。
// 救う：閉店の手順を順番どおりに手伝う（明かり → レジ → 札）。深く頭を下げて動かなくなる。
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Heiten extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.heiten, Object.assign({ kind: 'heiten' }, opt));
    this.stations = opt.stations || { lights: { x: 0, z: 0 }, register: { x: 1, z: 0 }, shutter: { x: 0, z: 2 }, bow: { x: 0, z: 2 } };
    this.center = opt.center || { x: 0, z: 0 };
    this.leash = opt.leash || 9;
    this.stepIdx = 0; this.stepT = 0; this.helpIdx = 0;
  }
  get step() { return this.def.loop.steps[this.stepIdx]; }
  get closing() { return this.state === 'loop' && !!this.step.closing && this.atStation; }
  immune() { return this.state === 'rest'; }
  /** 手順を手伝った（照明・レジ・札）。戻り値：'ok'|'done'|'wrong'|'ignored' */
  help(id, evs = []) {
    if (!this.alive || this.state === 'rest') return 'ignored';
    if (this.state === 'hostile' || this.state === 'stagger') return 'ignored';
    const want = this.def.help[this.helpIdx];
    if (id === want) {
      this.helpIdx++; evs.push({ t: 'helped', id, n: this.helpIdx });
      this.go('watch', evs, 'helped');
      if (this.helpIdx >= this.def.help.length) { this.resolution = 'rescue'; this.go('rest', evs, 'done'); evs.push({ t: 'rescued' }); return 'done'; }
      return 'ok';
    }
    this.helpIdx = 0; evs.push({ t: 'wrong', id, want });
    return 'wrong';
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    switch (this.state) {
      case 'loop': {
        this.loopTick(dt, out);
        const heard = this.hears(sense);
        if (p && !p.dead && ((this.closing && sense.inShop) || heard === 'gun')) {
          this.assessFor = this.def.assess[0] + this.rand() * 0.4; this.why = heard === 'gun' ? 'gun' : 'closing';
          this.go('assess', evs, this.why); evs.push({ t: 'notice' });
          if (this.why === 'closing') evs.push({ t: 'say', key: 'heiten_closing' });
        }
        break;
      }
      case 'watch': {                                            // 手伝いを見ている（止まる）
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t > 12) { this.helpIdx = 0; this.go('loop', evs, 'timeout'); }
        if (p && sense.inShop && this.closing) { /* 手伝い中は追い出さない */ }
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          if (p && !p.dead && (sense.inShop || this.why === 'gun' || this.hostileBy)) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'evict'); evs.push({ t: 'hostile' }); }
          else this.go('loop', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': {
        const away = p && dist2(p, this.center) > this.leash;
        if (away && !this.atk) {
          this.awayT = (this.awayT || 0) + dt;
          out.face = p ? { x: p.x, z: p.z } : null;
          if (this.awayT > this.def.calm) { this.awayT = 0; this.hostileBy = null; this.go('loop', evs, 'escaped'); evs.push({ t: 'calm' }); }
          break;
        }
        this.awayT = 0;
        if (!this.hostileTick(dt, sense, out)) this.go('loop', evs, 'lost');
        // 店の外までは追わない
        if (out.move && dist2(out.move, this.center) > this.leash - 1) out.move = null;
        break;
      }
      case 'stagger': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
      case 'rest': case 'dead': break;
    }
    return out;
  }
  hurt(dmg, kind, evs = []) {
    if (this.state === 'watch' || this.state === 'loop' || this.state === 'assess') this.helpIdx = 0;
    return super.hurt(dmg, kind, evs);
  }
  loopTick(dt, out) {
    const st = this.step, at = this.stations[st.id], evs = out.events;
    if (!this.atStation) {
      if (dist2(this.pos, at) > 0.3) { out.move = { x: at.x, z: at.z, speed: this.def.speed.walk }; out.face = { x: at.x, z: at.z }; return; }
      this.atStation = true; this.stepT = 0; evs.push({ t: 'step', id: st.id, label: st.label });
    }
    this.stepT += dt;
    if (at.face) out.face = at.face;
    if (this.stepT >= st.dur) {
      this.atStation = false; this.stepIdx = (this.stepIdx + 1) % this.def.loop.steps.length;
      if (this.stepIdx === 0) evs.push({ t: 'reset' });
    }
  }
}
