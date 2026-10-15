// 第6章A の冒頭：巨大猫又の「暴走」と「守る」の状態機械【仮】。DOM・three.js なし（node でテスト）。data/ch5.js の RAMPAGE・PROTECT。
// 暴走＝巨大な姿の力があふれて、体が言うことを聞かない状態（性格が変わるのではない。だんのうらは自分のまま、抑えようとしている）。
// ・使える入力は表（RAMPAGE.inputs）の「移動・抑える・カメラ」だけ。市民を攻撃する入力は無い（攻撃の入力は読まない）。
// ・抑える：長押し（hold）か連打（mash）。抑えるほど勝手に踏み出す間が空き、被害の演出が減る。
// ・失敗の状態は無い：（相棒）が名前を呼び続け（決め台詞は言わない）、回数がそろうか時間が来れば必ず我に返る（calm）。
// 守る＝我に返った後：倒れてくる物（電柱・看板・瓦礫・バス）を、決まった動き（尾で払う・体で受ける・前足で運ぶ）で守る。守れなくても先へ進む。
import { RAMPAGE, PROTECT } from '../data/ch5.js';

export class Rampage {
  constructor(opt = {}) {
    this.C = opt.cfg || RAMPAGE; this.mode = opt.mode === 'mash' ? 'mash' : 'hold';
    this.t = 0; this.suppress = 0; this.calls = 0; this.injured = false; this.calm = false; this.calmBy = null;
    this.nextLurch = this.C.lurch.every[0]; this.nextCall = null; this.lurches = 0; this.damage = 0; this.used = new Set(); this.seed = opt.seed || 7;
  }
  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  /** 暴走の強さ（0〜1）：見た目・揺れ・画面の歪みに使う */
  get k() { return Math.max(0.12, Math.min(1, 1 - this.suppress * 0.55 - this.calls / this.C.calls.needed * 0.4)); }
  /** 画面の歪み（呼ばれるたびに引く） */
  get distortion() { return Math.max(0, 1 - this.calls / this.C.calls.needed) * (1 - this.suppress * 0.4); }
  /**
   * 1 ステップ。inp：{ moveX, moveY, suppressHeld, suppressPress }（ほかの名前は読まない）。戻り：出来事の列
   * 出来事：lurch（勝手に踏み出す：dir・dist・wreck＝被害の演出の大きさ）・injury（瓦礫で（相棒）が負傷：演出のみ）・call（名前を呼ぶ）・calm（我に返る）
   */
  tick(dt, inp = {}) {
    const evs = [], C = this.C; if (this.calm) return evs;
    for (const k of Object.keys(inp)) if (inp[k]) this.used.add(k);
    this.t += dt;
    if (this.mode === 'hold' && inp.suppressHeld) this.suppress += C.suppress.holdGain * dt;
    if (this.mode === 'mash' && inp.suppressPress) this.suppress += C.suppress.mashGain;
    if (!inp.suppressHeld && !inp.suppressPress) this.suppress -= C.suppress.decay * dt;
    this.suppress = Math.max(0, Math.min(1, this.suppress));
    if (!this.injured && this.t >= C.injuryAt) { this.injured = true; this.nextCall = this.t + (C.calls.first - C.injuryAt); evs.push({ t: 'injury' }); }
    if (this.injured && this.nextCall != null && this.t >= this.nextCall) { this.calls++; this.nextCall = this.t + C.calls.every; evs.push({ t: 'call', n: this.calls }); }
    if (this.t >= this.nextLurch) {
      const a = this.rand() * Math.PI * 2, k = this.k, dist = C.lurch.dist * (0.4 + 0.6 * k);
      this.lurches++; const wreck = Math.round(3 * k); this.damage += wreck;
      evs.push({ t: 'lurch', dir: { x: Math.sin(a), z: Math.cos(a) }, dist, wreck, k });
      const [lo, hi] = C.lurch.every; this.nextLurch = this.t + lo + (hi - lo) * this.rand() + this.suppress * 2.0;
    }
    const enough = this.calls >= C.calls.needed && this.suppress >= C.calmAt;
    if (enough || this.t >= C.maxSec) { this.calm = true; this.calmBy = enough ? 'voice' : 'time'; evs.push({ t: 'calm', by: this.calmBy }); }
    return evs;
  }
}

export class Protect {
  constructor(opt = {}) { this.P = opt.cfg || PROTECT; this.t = 0; this.list = this.P.hazards.map(h => Object.assign({ state: 'wait' }, h)); this.saved = 0; this.missed = 0; this.done = false; }
  active() { return this.list.filter(h => h.state === 'warn'); }
  /** 1 ステップ：時刻で予兆（warn）→ 間に合わなければ落ちる（missed：町が少し壊れる・人は逃げきっている） */
  tick(dt) {
    const evs = []; if (this.done) return evs;
    this.t += dt;
    for (const h of this.list) {
      if (h.state === 'wait' && this.t >= h.t) { h.state = 'warn'; h.left = h.warn; evs.push({ t: 'warn', h }); }
      else if (h.state === 'warn') { h.left -= dt; if (h.left <= 0) { h.state = 'missed'; this.missed++; evs.push({ t: 'fall', h }); } }
    }
    if (this.list.every(h => h.state === 'saved' || h.state === 'missed')) { this.done = true; evs.push({ t: 'protectEnd', saved: this.saved, missed: this.missed }); }
    return evs;
  }
  /** 動きを出した：act＝'tailSweep'|'shield'|'lift'、pos＝巨大猫又の位置。合う物が範囲にあれば守れる */
  act(act, pos) {
    for (const h of this.list) {
      if (h.state !== 'warn' || this.P.act[h.kind] !== act) continue;
      if (Math.hypot(pos.x - h.at[0], pos.z - h.at[1]) <= h.r) { h.state = 'saved'; this.saved++; return h; }
    }
    return null;
  }
}
