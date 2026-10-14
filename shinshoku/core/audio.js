// 音（Web Audio の合成による仮の音。provisional）。ホラーは環境音と「読み取れる合図」で作る。
// 敵の予兆の音は種類ごとに違う：弾ける攻撃＝高い金属の「チッ」、弾けない攻撃（赤）＝低いうなり。
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.7; this.muffle = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000;
    this.master.connect(this.lp); this.lp.connect(c.destination);
    // ノイズの元
    const n = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = n;
    this.ambience();
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  /** スロー・一閃のとき音を抑える（0〜1） */
  setMuffle(m) { if (!this.ctx) return; this.muffle = m; this.lp.frequency.setTargetAtTime(18000 - m * 17000, this.ctx.currentTime, 0.03); }
  _env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    this._env(g, t, 0.005, vol, dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, fType = 'bandpass', f = 1200, q = 1, at = 0, slide = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = fType; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    const g = c.createGain(); this._env(g, t, 0.004, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'swing': this.noise(0.12, 0.18, 'bandpass', 2400, 0.8, 0, 0.4); break;
      case 'swing_heavy': this.noise(0.22, 0.25, 'bandpass', 1400, 0.7, 0, 0.35); break;
      case 'hit': this.noise(0.08, 0.35, 'lowpass', 1800); this.tone(140, 0.12, 'square', 0.12, 0.5); break;
      case 'hit_heavy': this.noise(0.14, 0.45, 'lowpass', 1200); this.tone(90, 0.2, 'square', 0.18, 0.5); break;
      case 'issen': this.tone(2400, 0.9, 'sine', 0.12, 1.02); this.tone(3600, 0.6, 'sine', 0.05, 1.0, 0.02); this.noise(0.35, 0.22, 'highpass', 5000, 0.7, 0.0, 0.6); break;
      case 'issen_ready': this.tone(1800, 0.25, 'sine', 0.08, 1.3); break;
      case 'just': this.tone(880, 0.5, 'sine', 0.12, 0.5); this.tone(1320, 0.4, 'sine', 0.06, 0.5, 0.03); break;
      case 'parry': this.tone(2200, 0.35, 'triangle', 0.22, 0.98); this.tone(3300, 0.25, 'sine', 0.1); this.noise(0.05, 0.3, 'highpass', 4000); break;
      case 'guard': this.tone(600, 0.15, 'square', 0.12, 0.7); break;
      case 'shot': this.noise(0.18, 0.55, 'lowpass', 3000, 0.7, 0, 0.3); this.tone(70, 0.18, 'sine', 0.35, 0.5); break;
      case 'dry': this.tone(1800, 0.03, 'square', 0.08); break;
      case 'reload': this.tone(500, 0.05, 'square', 0.08); this.tone(800, 0.05, 'square', 0.08, 1, 0.5); this.noise(0.06, 0.15, 'bandpass', 2000, 2, 1.25); break;
      case 'swap': this.noise(0.05, 0.12, 'bandpass', 3000, 2); this.tone(1200, 0.04, 'square', 0.04, 1, 0.04); break;
      case 'dodge': this.noise(0.18, 0.12, 'lowpass', 800, 1, 0, 0.5); break;
      case 'hurt': this.tone(180, 0.25, 'sawtooth', 0.15, 0.5); this.noise(0.1, 0.3, 'lowpass', 900); break;
      case 'step': this.noise(0.04, 0.05, 'lowpass', 500); break;
      case 'pickup': this.tone(660, 0.1, 'sine', 0.12); this.tone(990, 0.15, 'sine', 0.1, 1, 0.08); break;
      case 'heal': this.tone(520, 0.3, 'sine', 0.1, 1.5); break;
      case 'door': this.noise(0.5, 0.18, 'lowpass', 400, 1, 0, 0.6); this.tone(220, 0.4, 'triangle', 0.05, 0.8, 0.1); break;
      case 'knock': this.noise(0.05, 0.35, 'lowpass', 300, 2); break;
      case 'ui': this.tone(900, 0.05, 'sine', 0.06); break;
      case 'ui_ok': this.tone(700, 0.06, 'sine', 0.07); this.tone(1050, 0.08, 'sine', 0.06, 1, 0.05); break;
      case 'ui_ng': this.tone(220, 0.15, 'square', 0.06); break;
      case 'save': this.tone(523, 0.12, 'sine', 0.08); this.tone(784, 0.2, 'sine', 0.08, 1, 0.1); break;
      // 敵の合図（読み取れる音）
      case 'notice': this.tone(110, 0.6, 'sine', 0.12, 1.4); break;
      case 'tel_parry': this.tone(2600, 0.06, 'square', 0.1); this.tone(1900, 0.08, 'triangle', 0.08, 1, 0.07); break;   // 弾ける：チッ・キン
      case 'tel_red': this.tone(70, 0.8, 'sawtooth', 0.14, 1.8); this.noise(0.7, 0.12, 'bandpass', 300, 3, 0, 2.5); break; // 弾けない：低いうなり
      case 'kiro_voice': this.tone(196, 0.9, 'sine', 0.05, 0.95); this.tone(233, 0.9, 'sine', 0.03, 0.9, 0.1); break;
      case 'heiten_voice': this.tone(262, 0.4, 'triangle', 0.05); this.tone(247, 0.4, 'triangle', 0.05, 1, 0.45); this.tone(220, 0.8, 'triangle', 0.05, 1, 0.9); break;
      case 'shutter': this.noise(1.2, 0.25, 'bandpass', 700, 0.6, 0, 0.4); break;
      case 'slam': this.noise(0.4, 0.6, 'lowpass', 600); this.tone(55, 0.4, 'sine', 0.4, 0.5); break;
      case 'die': this.noise(1.2, 0.2, 'lowpass', 600, 1, 0, 0.2); this.tone(110, 1.2, 'sine', 0.06, 0.5); break;
      case 'rescue': this.tone(392, 0.6, 'sine', 0.06); this.tone(523, 0.8, 'sine', 0.05, 1, 0.3); this.tone(659, 1.2, 'sine', 0.04, 1, 0.6); break;
      case 'flicker': this.noise(0.08, 0.06, 'highpass', 6000); break;
      case 'notify': this.tone(1568, 0.08, 'sine', 0.05); this.tone(2093, 0.12, 'sine', 0.05, 1, 0.09); break;
    }
  }
  /** 環境音：遠いうなり（自販機・町の低い音）と雨のノイズ */
  ambience() {
    const c = this.ctx;
    const hum = c.createOscillator(), hg = c.createGain(); hum.type = 'sine'; hum.frequency.value = 58; hg.gain.value = 0.018; hum.connect(hg); hg.connect(this.master); hum.start();
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    this.rainGain = c.createGain(); this.rainGain.gain.value = 0.035; s.connect(f); f.connect(this.rainGain); this.rainGain.connect(this.master); s.start();
  }
  setRain(on) { if (this.rainGain) this.rainGain.gain.value = on ? 0.035 : 0.0; }
}
