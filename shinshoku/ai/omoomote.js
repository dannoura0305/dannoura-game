// 重面（おもおもて）：別の可能性の顔がいくつも重なった人。DOM・three.js なし（node でテスト）。ENEMY_AI_SPEC §2.2。
// 正面の顔（face）は faceEvery 秒ごとに def.faces の順で入れ替わる。入れ替わる swap 秒は攻撃が止まり、見切り（青い縁）になる。
// 状態：
//   loop    … 鏡・窓のガラスの前（stops）を順に回り、着くと mirrorStay 秒立ち止まって顔を合わせ直そうとする
//   assess  … 見定め。正面の顔が「知り合い」（kin）なら攻めない（misread → 輪へ戻る）
//   hostile … 正面の顔ごとの攻撃（bite 噛みつき・scream 叫び・hug 抱きつき）。kin の顔の間は立ち止まって見るだけ
//   slip    … 相棒の声で顔の重なりがずれた（slip 秒）：動かない・攻めない。この間に「縛る」と無力化
//   rest    … 救われた（本人の写真を見て顔がそろい、座り込む）／縛られた（無力化）：攻撃を受けない
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Omoomote extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.omoomote, Object.assign({ kind: 'omoomote' }, opt));
    this.def = Object.assign({}, this.def, { pattern: ['bite'] });   // 攻めの順は顔で差し替える（共有の定義は変えない）
    this.stops = opt.stops || [{ x: this.pos.x, z: this.pos.z, look: { x: this.pos.x, z: this.pos.z + 1 } }];   // { x, z, look?:{x,z} }（look の無い点は通り道）
    this.idx = 0; this.sub = 'walk'; this.subT = 0;
    this.faceIdx = (opt.face || 0) % this.def.faces.length; this.faceT = (this.rand() * this.def.faceEvery * 0.5);
    this.swapping = 0;
    this.state = opt.rest ? 'rest' : 'loop';
  }
  get face() { return this.def.faces[this.faceIdx]; }
  immune() { return this.state === 'rest'; }
  /** 顔の入れ替わり（どの状態でも時計は進む。rest・dead・slip では止まる） */
  tickFace(dt, evs) {
    if (this.swapping > 0) {
      this.swapping -= dt;
      if (this.swapping <= 0) { this.swapping = 0; if (this.state !== 'stagger' && this.state !== 'down') this.chainable = false; evs.push({ t: 'faceSet', face: this.face }); }
      return;
    }
    this.faceT += dt;
    if (this.faceT >= this.def.faceEvery) {
      this.faceT = 0; this.faceIdx = (this.faceIdx + 1) % this.def.faces.length; this.swapping = this.def.swap;
      this.chainable = true; if (this.atk && this.atk.phase === 'windup') { this.atk = null; this.cool = Math.max(this.cool, 0.3); }   // 入れ替わる瞬間は攻めが崩れる
      evs.push({ t: 'faceswap', face: this.face });
    }
  }
  /** 本人の写真を見せた＝救う（顔がそろって座り込む） */
  showPhoto(evs = []) {
    if (!this.alive || this.state === 'rest') return false;
    this.resolution = 'rescue'; this.atk = null; this.swapping = 0; this.chainable = false; this.go('rest', evs, 'photo'); evs.push({ t: 'rescued' }); return true;
  }
  /** 相棒に呼んでもらった：顔の重なりが一瞬ずれる（slip 秒） */
  called(evs = []) {
    if (!this.alive || this.state === 'rest' || this.state === 'slip') return false;
    this.atk = null; this.go('slip', evs, 'companion'); this.chainable = true; evs.push({ t: 'slip' }); return true;
  }
  /** ずれている間に縛る＝無力化 */
  bind(evs = []) {
    if (this.state !== 'slip') return false;
    this.resolution = 'neutralize'; this.atk = null; this.chainable = false; this.go('rest', evs, 'bound'); evs.push({ t: 'neutralized' }); return true;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    if (this.state !== 'rest' && this.state !== 'dead' && this.state !== 'slip') this.tickFace(dt, evs);
    switch (this.state) {
      case 'rest': case 'dead': break;
      case 'loop': {
        this.loopTick(dt, out);
        if (p && !p.dead) {
          const seen = this.sees(sense), heard = this.hears(sense), d = dist2(this.pos, p);
          if (heard === 'gun' || (seen && (d < 3.2 || sense.lit)) || (heard === 'run' && d < 4)) {
            this.cause = heard || (sense.lit ? 'light' : 'near');
            this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]);
            this.go('assess', evs, this.cause); evs.push({ t: 'notice' });
          }
        }
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          if (this.face === 'kin' && !this.hostileBy) { this.go('loop', evs, 'kin'); evs.push({ t: 'misread', as: 'kin' }, { t: 'say', key: 'omoomote_kin' }); break; }
          const still = p && !p.dead && (this.hostileBy || this.cause === 'gun' || dist2(this.pos, p) < 4.5);
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }); }
          else this.go('loop', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': {
        if (!p || p.dead) { this.go('loop', evs, 'none'); break; }
        if (this.face === 'kin' && !this.atk) {                  // 知り合いの顔の間は、立ち止まって見るだけ
          out.face = { x: p.x, z: p.z };
          if (this.sees(sense)) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; }
          break;
        }
        if (this.swapping > 0) { out.face = { x: p.x, z: p.z }; break; }
        const keep = this.hostileTick(dt, sense, out);
        if (!keep) { this.go('loop', evs, 'lost'); this.hostileBy = null; }
        break;
      }
      case 'slip': if (this.t >= this.def.slip) { this.chainable = false; this.go(this.hostileBy ? 'hostile' : 'loop', evs, 'slipEnd'); } break;
      case 'stagger': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
    }
    return out;
  }
  /** 攻めの順は正面の顔で決まる（kin の顔では攻めない） */
  hostileTick(dt, sense, out) {
    const f = this.face;
    if (f !== 'kin' && this.def.attacks[f]) this.def.pattern[0] = f;
    return super.hostileTick(dt, sense, out);
  }
  hurt(dmg, kind, evs = [], opt = {}) {
    if (this.state === 'loop' || this.state === 'assess') { this.hostileBy = 'attacked'; this.lastSeenT = this.total; }
    return super.hurt(dmg, kind, evs, opt);
  }
  /** 輪：鏡・窓の前を順に。着くと立ち止まり、ガラスの方を向いて顔を合わせ直す */
  loopTick(dt, out) {
    const P = this.stops, tgt = P[this.idx];
    this.subT += dt;
    if (this.sub === 'mirror') {
      out.face = tgt.look;
      if (this.subT > this.def.mirrorStay) { this.sub = 'walk'; this.subT = 0; this.idx = (this.idx + 1) % P.length; }
      return;
    }
    if (dist2(this.pos, tgt) < 0.25) {
      if (!tgt.look) { this.idx = (this.idx + 1) % P.length; return; }   // 通り道の点
      this.sub = 'mirror'; this.subT = 0; out.events.push({ t: 'say', key: 'omoomote_mirror' }); return;
    }
    out.move = { x: tgt.x, z: tgt.z, speed: this.def.speed.walk }; out.face = { x: tgt.x, z: tgt.z };
  }
}
