// 静養（せいよう）：病院のベッドから離れられない患者。DOM・three.js なし（node でテスト）。ENEMY_AI_SPEC §2.3。
// ベッドごと動かない（move を出さない）。向きだけ変える。
// 状態：
//   sleep  … 輪（眠る）。廊下の音（走る音・歩く音のすぐそば）で rise へ。銃声は assess を飛ばして皆で起きる（守る）
//   rise   … 半身を起こして様子を見る。看護の人（白衣の名札）なら nurse、近い・明かりを当てられたら assess、何もなければ眠り直す
//   assess … 見定め（0.6〜1.2 秒）。まだ近くにいれば hostile（同じ部屋の静養も起こす：wakeGroup）
//   nurse  … 取り違え：看護の人とみなす（攻めない・「お薬の時間ですか」）。離れると眠る
//   hostile… ベッドから腕を伸ばす・点滴の管で縛る（届く範囲だけ）。離れて少し経つと眠り直す
//   rest   … 救われた（ナースコールの巡回が戻った）／無力化（照明が落ちた）：深く眠る（攻撃を受けない）
import { Brain, dist2 } from './brain.js';
import { ENEMIES } from '../data/enemies.js';

export class Seiyou extends Brain {
  constructor(opt = {}) {
    super(opt.def || ENEMIES.seiyou, Object.assign({ kind: 'seiyou' }, opt));
    this.bed = { x: this.pos.x, z: this.pos.z };
    this.room = opt.room || null;                 // 同じ部屋の静養は一緒に起きる
    this.restYaw = this.yaw;
    this.state = opt.rest ? 'rest' : 'sleep';
    this.wasAsleep = this.state === 'sleep';
    this.calmT = 0;
  }
  immune() { return this.state === 'rest'; }
  /** 同じ部屋の仲間が起こされた（守る：眠りを妨げる者を皆で） */
  wakeGroup(evs = [], p = null) {
    if (!this.alive || this.state === 'rest' || this.state === 'hostile' || this.state === 'stagger') return false;
    this.hostileBy = 'group'; if (p) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; }
    this.go('hostile', evs, 'group'); evs.push({ t: 'hostile' }); return true;
  }
  /** ナースコールの配線が直った（巡回の時刻が戻る）＝救う。戦っている時は直らない（呼ぶ側が判断する） */
  rescueSleep(evs = []) {
    if (!this.alive || this.state === 'rest') return false;
    this.resolution = 'rescue'; this.atk = null; this.go('rest', evs, 'nursecall'); evs.push({ t: 'rescued' }); return true;
  }
  /** 病棟の照明が落ちた：戦っていなければ深く眠る＝無力化 */
  lightsOff(evs = []) {
    if (!this.alive || this.state === 'rest' || this.state === 'hostile' || this.state === 'stagger') return false;
    this.resolution = 'neutralize'; this.atk = null; this.go('rest', evs, 'lights'); evs.push({ t: 'neutralized' }); return true;
  }
  update(dt, sense) {
    const out = { move: null, face: null, events: [] }, evs = out.events;
    this.t += dt; this.total += dt;
    const p = sense.player;
    if (this.state !== 'sleep' && this.state !== 'rest') this.wasAsleep = false;
    switch (this.state) {
      case 'rest': case 'dead': break;
      case 'sleep': {
        out.face = this.faceRest();
        if (!p || p.dead) break;
        const heard = this.hears(sense);
        if (heard === 'gun') { this.lastSeen = { x: sense.gunshot.x, z: sense.gunshot.z }; this.lastSeenT = this.total; this.hostileBy = 'gun'; this.go('hostile', evs, 'gun'); evs.push({ t: 'hostile' }, { t: 'wakeGroup' }); break; }
        if (heard === 'run' || heard === 'walk' || dist2(this.bed, p) < 1.6) { this.cause = heard || 'near'; this.go('rise', evs, this.cause); evs.push({ t: 'say', key: 'seiyou_rise' }); }
        break;
      }
      case 'rise': {
        if (!p || p.dead) { this.go('sleep', evs, 'none'); break; }
        const seen = this.sees(sense), d = dist2(this.bed, p);
        if (seen) out.face = { x: p.x, z: p.z };
        if (sense.nurse && seen && d < 5) { this.go('nurse', evs, 'badge'); evs.push({ t: 'misread', as: 'nurse' }, { t: 'say', key: 'seiyou_nurse' }); break; }
        if (seen && (d < 2.6 || sense.lit)) { this.assessFor = this.def.assess[0] + this.rand() * (this.def.assess[1] - this.def.assess[0]); this.go('assess', evs, sense.lit ? 'light' : 'near'); evs.push({ t: 'notice' }); break; }
        if (this.t > 2.8) this.go('sleep', evs, 'quiet');
        break;
      }
      case 'nurse': {
        if (!p || p.dead) { this.go('sleep', evs, 'none'); break; }
        const d = dist2(this.bed, p); out.face = { x: p.x, z: p.z };
        if (d > 6 || !sense.nurse) this.go('sleep', evs, 'left');
        break;
      }
      case 'assess': {
        if (p) out.face = { x: p.x, z: p.z };
        if (this.t >= this.assessFor) {
          const still = p && !p.dead && (this.hostileBy || dist2(this.bed, p) < 3.0 || (sense.lit && dist2(this.bed, p) < 5));
          if (still) { this.lastSeen = { x: p.x, z: p.z }; this.lastSeenT = this.total; this.go('hostile', evs, 'enemy'); evs.push({ t: 'hostile' }, { t: 'wakeGroup' }); }
          else this.go('sleep', evs, 'unrelated');
        }
        break;
      }
      case 'hostile': {
        if (!p || p.dead) { this.go('sleep', evs, 'none'); break; }
        this.hostileTick(dt, sense, out);
        out.move = null;                                            // ベッドから離れない
        if (!this.atk) out.face = { x: p.x, z: p.z };
        const d = dist2(this.bed, p);
        this.calmT = d > 5.5 ? this.calmT + dt : 0;
        if (this.calmT > 3.5 && !this.atk) { this.calmT = 0; this.hostileBy = null; this.lastSeen = null; this.go('sleep', evs, 'quiet'); evs.push({ t: 'calm' }); }
        break;
      }
      case 'stagger': if (this.t >= (this.staggerFor || 0.5)) this.go('hostile', evs, 'recover'); break;
    }
    return out;
  }
  faceRest() { return { x: this.bed.x + Math.sin(this.restYaw), z: this.bed.z + Math.cos(this.restYaw) }; }
  hurt(dmg, kind, evs = [], opt = {}) {
    const asleep = this.state === 'sleep';
    if (this.state === 'sleep' || this.state === 'rise' || this.state === 'nurse' || this.state === 'assess') { this.hostileBy = 'attacked'; this.lastSeenT = this.total; }
    const r = super.hurt(dmg, kind, evs, opt);
    if (this.state === 'dead') { if (asleep || this.wasAsleep) evs.push({ t: 'killedAsleep' }); }
    else if (r > 0) evs.push({ t: 'wakeGroup' });
    return r;
  }
}

/** 姿勢の状態（anim.js の seiyouPose の 'sleep'・'reach'・起きた姿）へ */
export function seiyouPoseState(ctx) {
  const s = ctx.state;
  if (s === 'sleep' || s === 'rest' || s === 'dead') return 'sleep';
  if (s === 'hostile' && ctx.atk && ctx.atk.phase !== 'recover') return 'reach';
  return 'awake';
}
