// BGM（CC0 の曲：OpenGameArt.org。data/sound.js の BGM_*・bgmPlan）。2026-11-13（2026-11-14 素材を CC0 に切り替え）
// ・常には鳴らさない：探索の曲は区画に入ってしばらく（wait）してから小さく一度だけ流し、長く休む（rest）。家・結末・記録の間・序章のふだんの町は鳴らさない。
// ・敵対の異形が近い時は戦いの曲、ボス戦はボスの曲。戦いが終わって 6 秒たったら引く。演出中は新しく始めず、台詞の声が鳴る間は下げる。
// ・出口は Sfx の master（全体の音量・遷移の沈み dip・無音の間 silence・スローのこもり muffle がそのまま掛かる）。BGM の音量は設定（bgmVol）。
// ・曲が読めていない時は鳴らさない（合成のフォールバックは無い）。読むのは区画に入った時（core/soundbank.js）。
import { BGM_AREAS, BGM_TRACKS, bgmPlan } from '../data/sound.js';

export class Music {
  constructor(sfx, bank) {
    this.sfx = sfx; this.bank = bank; this.vol = 0.5; this.out = null; this.cur = null; this.role = null;
    this.area = null; this.phase = 'wait'; this.phaseT = 0; this.battleHold = 0; this.log = []; this.last = null;
  }
  setVolume(v) { this.vol = +v; if (this.out) this.out.gain.setTargetAtTime(this.vol, this.out.context.currentTime, 0.1); }
  _ensure() {
    const s = this.sfx; if (!s || !s.ctx || !s.master) return null;
    if (!this.out) { this.out = s.ctx.createGain(); this.out.gain.value = this.vol; this.out.connect(s.master); }
    return s.ctx;
  }
  /** 区画に入った：探索の曲の待ちからやり直す */
  enterArea(id) {
    if (id === this.area) return;
    this.area = id; const A = BGM_AREAS[id] || {};
    this.phase = 'wait'; this.phaseT = A.wait ?? 20;
    if (this.cur && this.role === 'explore') this._stop(2.5);
  }
  has(track) { return !!(this.bank && this.bank.has(BGM_TRACKS[track])); }
  /** 描画のこまごとに呼ぶ。g = { area, normal, credits, boss, hostile（敵対が近い 0〜1）, cut, voice } */
  update(dt, g) {
    if (g.area !== this.area) this.enterArea(g.area);
    // 戦い：近い敵対が強い間 → 6 秒は保つ（行き来でぶつ切りにしない）
    if (g.hostile >= 0.5) this.battleHold = 6; else this.battleHold = Math.max(0, this.battleHold - dt);
    // 探索の曲の時間割（演出中・戦い中は進めない）
    const A = BGM_AREAS[g.area] || {};
    if (!g.cut && !this.battleHold && !g.boss) {
      this.phaseT -= dt;
      if (this.phase === 'wait' && this.phaseT <= 0) { this.phase = 'play'; this.phaseT = 9999; }
      else if (this.phase === 'rest' && this.phaseT <= 0) { this.phase = 'play'; this.phaseT = 9999; }
    }
    const plan = bgmPlan({ area: g.area, normal: g.normal, credits: g.credits, boss: g.boss, battle: this.battleHold > 0, cut: g.cut, cur: this.role, explorePhase: this.phase, voice: g.voice });
    this.last = plan;
    const ctx = this._ensure(); if (!ctx) return;
    const want = plan.track ? BGM_TRACKS[plan.track] : null;
    if (want !== (this.cur && this.cur.id)) {
      if (this.role === 'explore' && (plan.role === 'battle' || plan.role === 'boss')) { this.phase = 'rest'; this.phaseT = 45; }   // 戦いで切れた探索の曲は、終わった後すぐには頭から流し直さない
      if (this.cur) this._stop(plan.role === 'none' ? 3.0 : 1.6);
      if (want) {
        if (this.bank.has(want)) this._start(want, plan.role, plan.level);
        else { this.bank.want([want], true); this.role = null; }
      } else this.role = null;
    } else if (this.cur) {
      this.cur.g.gain.setTargetAtTime(plan.level, ctx.currentTime, 0.5);
    }
    // 探索の曲が終わった → 休み
    if (this.cur && this.role === 'explore' && this.cur.ended) { this.cur = null; this.role = null; this.phase = 'rest'; const r = A.rest || [90, 150]; this.phaseT = r[0] + Math.random() * (r[1] - r[0]); }
  }
  _start(id, role, level) {
    const ctx = this.sfx.ctx, b = this.bank.buf(id); if (!b) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; src.loop = role !== 'explore'; if (src.loop) this.bank.setLoop(src, id); src.connect(g); g.connect(this.out);
    const t = ctx.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(Math.max(0.001, level), t + (role === 'explore' ? 6 : role === 'ending' ? 2 : 1.2));
    const c = { id, src, g, ended: false }; src.onended = () => { c.ended = true; };
    src.start(t); this.cur = c; this.role = role;
    this.log.push({ id, role, at: Math.round(performance.now()) }); if (this.log.length > 100) this.log.shift();
  }
  _stop(fade = 2) {
    const c = this.cur; this.cur = null; this.role = null; if (!c) return;
    try { const t = c.g.context.currentTime; c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0, t + fade); c.src.onended = null; c.src.stop(t + fade + 0.05); } catch (e) { /* 止まっている */ }
    this.log.push({ stop: c.id, at: Math.round(performance.now()) });
  }
  /** 状態（確かめる用） */
  state() { return { area: this.area, role: this.role, track: this.cur && this.cur.id, phase: this.phase, phaseT: Math.round(this.phaseT), vol: this.vol, plan: this.last }; }
}
