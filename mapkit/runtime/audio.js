// 音（フェーズ 4）：外の音のファイルは使わず、WebAudio でその場で作る（自作＝license own・読み込み 0 バイト）。
// 風（色づけた雑音＋ゆっくりの揺れ）・虫（ヒグラシ風の高い音の揺れ／夜の鈴虫風の短い音）・家の中のきしみ・足音（面ごとの音色）・戸（引き戸のごろごろ・木戸のきしみ）・
// 敵（低いうなり：近いほど大きい）・追われている時の心臓の音・見つかった時の短い音。
// ブラウザの決まりで、最初のクリック・タッチ・キーの後に start() する（main.js）。?audio=0 で鳴らさない。
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** 足音の音色（面 → 帯域の中心 Hz・幅 Q・長さ s・音量）。純粋（試験） */
export const STEP_TONE = {
  forest: { f: 900, q: 0.8, d: 0.09, g: 0.32, crunch: 0.5 }, dirt: { f: 520, q: 0.9, d: 0.08, g: 0.3, crunch: 0.15 },
  gravel: { f: 2600, q: 0.7, d: 0.11, g: 0.34, crunch: 1.0 }, stone: { f: 1800, q: 2.0, d: 0.05, g: 0.28, crunch: 0 },
  wood: { f: 260, q: 3.0, d: 0.1, g: 0.42, crunch: 0, creak: 0.25 }, tatami: { f: 380, q: 0.7, d: 0.07, g: 0.2, crunch: 0 }, earth: { f: 420, q: 1.0, d: 0.07, g: 0.25, crunch: 0.1 },
};

export class MapAudio {
  constructor(opt = {}) { this.enabled = opt.enabled !== false; this.ctx = null; this.t = 0; this.creakT = 4; this.beatT = 0; this.vol = opt.volume ?? 0.8; this.seed = 1; }
  _r() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }
  start() {
    if (!this.enabled || this.ctx) return this;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return this;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
    // 雑音（2 秒・決まった並び）
    const nb = this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); let s = 7;
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    const loopNoise = () => { const n = c.createBufferSource(); n.buffer = nb; n.loop = true; n.start(); return n; };
    // 風：低い帯域の雑音・強さと高さがゆっくり揺れる（家の中は小さく・こもる）
    const wn = loopNoise(), wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = 0.6;
    this.windLP = c.createBiquadFilter(); this.windLP.type = 'lowpass'; this.windLP.frequency.value = 2400;
    this.windG = c.createGain(); this.windG.gain.value = 0.16;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.09; lfo.connect(lg); lg.connect(this.windG.gain); lfo.start();
    const lfo2 = c.createOscillator(), lg2 = c.createGain(); lfo2.frequency.value = 0.053; lg2.gain.value = 160; lfo2.connect(lg2); lg2.connect(wf.frequency); lfo2.start();
    wn.connect(wf); wf.connect(this.windLP); this.windLP.connect(this.windG); this.windG.connect(this.master);
    // 虫：高い音（4.3kHz 前後）を速く揺らし（羽の音）・ゆっくり強弱（鳴いては止む）
    this.bugG = c.createGain(); this.bugG.gain.value = 0.0; this.bugG.connect(this.master);
    for (const [f, rate, slow, pan] of [[4300, 38, 0.21, -0.6], [4720, 44, 0.17, 0.55], [3900, 31, 0.13, 0.1]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const am = c.createGain(); am.gain.value = 0;
      const m1 = c.createOscillator(); m1.frequency.value = rate; const m1g = c.createGain(); m1g.gain.value = 0.5; m1.connect(m1g); m1g.connect(am.gain);
      const m2 = c.createOscillator(); m2.frequency.value = slow; const m2g = c.createGain(); m2g.gain.value = 0.5; m2.connect(m2g); m2g.connect(am.gain);
      const p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) p.pan.value = pan;
      o.connect(am); if (p) { am.connect(p); p.connect(this.bugG); } else am.connect(this.bugG);
      o.start(); m1.start(); m2.start();
    }
    // 敵のうなり：低い 2 つの鋸波（少しずらす）→ 低域
    this.droneG = c.createGain(); this.droneG.gain.value = 0; const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 220; dl.Q.value = 4;
    for (const f of [43, 45.3, 61]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dl); o.start(); }
    dl.connect(this.droneG); this.droneG.connect(this.master);
    if (c.state !== 'running') c.resume();
    return this;
  }
  setEnabled(on) { this.enabled = on; if (this.ctx) { if (on) this.ctx.resume(); else this.ctx.suspend(); } }
  /** 雑音の短い音（帯域・長さ・音量・時間のずれ） */
  _burst(f, q, dur, g, at = 0, type = 'bandpass') {
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.noise; const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
    const e = c.createGain(), t = c.currentTime + at; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + Math.min(0.01, dur * 0.2)); e.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    n.connect(bf); bf.connect(e); e.connect(this.master); n.start(t, this._r() * 1.5, dur + 0.05);
  }
  /** きしみ（鋸波の高さを揺らしながら帯域で絞る） */
  _creak(f0 = 180, dur = 0.5, g = 0.08, at = 0) {
    const c = this.ctx, o = c.createOscillator(), bf = c.createBiquadFilter(), e = c.createGain(), t = c.currentTime + at;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (0.7 + this._r() * 0.8), t + dur);
    bf.type = 'bandpass'; bf.frequency.value = f0 * 6; bf.Q.value = 6;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.05); e.gain.setValueAtTime(g, t + dur * 0.7); e.gain.linearRampToValueAtTime(0, t + dur);
    // ぎぎぎ：振幅を速く刻む
    const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 22 + this._r() * 20; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    o.connect(bf); bf.connect(am); am.connect(e); e.connect(this.master); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  step(surface, running) {
    if (!this.running) return;
    const T = STEP_TONE[surface] || STEP_TONE.forest, g = T.g * (running ? 1.35 : 1);
    this._burst(T.f * (0.9 + this._r() * 0.2), T.q, T.d * (running ? 0.85 : 1), g);
    if (T.crunch) this._burst(3200 + this._r() * 1500, 1.5, 0.05, g * 0.35 * T.crunch, 0.02);
    if (T.creak && this._r() < T.creak) this._creak(140 + this._r() * 80, 0.25, 0.05, 0.03);
  }
  door(kind, opening) {
    if (!this.running) return;
    if (kind === 'hinged') this._creak(opening ? 210 : 160, 0.75, 0.11);
    else { const f = kind === 'sliding' ? 240 : 520; this._burst(f, 1.2, 0.45, kind === 'sliding' ? 0.35 : 0.18); this._burst(f * 2.2, 3, 0.08, 0.2, 0.42); }
  }
  sting() { if (!this.running) return; const c = this.ctx, t = c.currentTime; for (const f of [233, 247, 466]) { const o = c.createOscillator(), e = c.createGain(); o.type = 'triangle'; o.frequency.value = f; e.gain.setValueAtTime(0.0, t); e.gain.linearRampToValueAtTime(0.09, t + 0.03); e.gain.exponentialRampToValueAtTime(0.001, t + 1.4); o.connect(e); e.connect(this.master); o.start(t); o.stop(t + 1.5); } }
  caught() { if (!this.running) return; this._burst(120, 0.5, 1.4, 0.7, 0, 'lowpass'); this._creak(90, 1.0, 0.15); }
  /** 毎フレーム：st＝{ inside, enemyDist, chase, paused } */
  update(dt, st) {
    if (!this.running) return;
    const c = this.ctx, now = c.currentTime;
    const inside = st.inside ? 1 : 0;
    this.windG.gain.setTargetAtTime(st.paused ? 0.03 : 0.16 * (1 - 0.65 * inside), now, 0.4);
    this.windLP.frequency.setTargetAtTime(inside ? 700 : 2400, now, 0.4);
    this.bugG.gain.setTargetAtTime(st.paused ? 0 : 0.012 * (1 - 0.6 * inside) * (st.chase ? 0.2 : 1), now, 0.8);
    const near = st.enemyDist == null ? 0 : clamp(1 - st.enemyDist / 22, 0, 1);
    this.droneG.gain.setTargetAtTime(st.paused ? 0 : near * near * (st.chase ? 0.22 : 0.12), now, 0.3);
    if (st.paused) return;
    // 家の中のきしみ（ときどき）
    this.creakT -= dt; if (inside && this.creakT <= 0) { this.creakT = 5 + this._r() * 9; this._creak(120 + this._r() * 160, 0.4 + this._r() * 0.5, 0.045); }
    // 心臓（追われている間）
    if (st.chase) { this.beatT -= dt; if (this.beatT <= 0) { this.beatT = 0.62; this._burst(70, 0.8, 0.13, 0.55, 0, 'lowpass'); this._burst(60, 0.8, 0.12, 0.4, 0.17, 'lowpass'); } }
  }
  stats() { return this.ctx ? { state: this.ctx.state, rate: this.ctx.sampleRate } : null; }
}
