// 音（Web Audio の合成による仮の音。provisional）。ホラーは環境音と「読み取れる合図」で作り、驚かしの連発はしない。
// ・位置のある音：聞き手（カメラ）からの距離で小さく、左右に振る（StereoPanner。HRTF は重いので使わない）。
// ・足音：地面の種類（アスファルト・濡れ・タイル・板・体育館）で変える。
// ・環境：区画ごとの層（うなり・雨・風・換気・しずく・遠いサイレン・遠い店内放送の名残）。緊張の低い持続音（敵が近いほど）。
// 敵の予兆の音は種類ごとに違う：弾ける攻撃＝高い金属の「チッ」、弾けない攻撃（赤）＝低いうなり。
export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.7; this.muffle = 0; this.out = null; this.L = { x: 0, z: 0, yaw: 0 }; this.amb = null; this.timers = { siren: 20, drip: 2, muzak: 8, creak: 12 }; this.tension = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol;
    this.duck = c.createGain(); this.duck.gain.value = 1;
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000;
    this.master.connect(this.duck); this.duck.connect(this.lp); this.lp.connect(c.destination);
    const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = n;
    this.buildBeds();
    if (this.pendingAmb) this.setAmbience(this.pendingAmb);
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  /** スロー・一閃のとき音を抑える（0〜1） */
  setMuffle(m) { if (!this.ctx) return; this.muffle = m; this.lp.frequency.setTargetAtTime(18000 - m * 17000, this.ctx.currentTime, 0.03); }
  /** 無音の間（秒）：全体を下げて戻す */
  silence(sec = 1.5) { if (!this.ctx) return; const t = this.ctx.currentTime; this.duck.gain.cancelScheduledValues(t); this.duck.gain.setTargetAtTime(0.0, t, 0.08); this.duck.gain.setTargetAtTime(1, t + sec, 0.4); }
  setListener(x, z, yaw) { this.L.x = x; this.L.z = z; this.L.yaw = yaw; }
  /** 位置のある音の出口（距離で小さく・左右へ） */
  _spatial(pos, ref = 3, max = 40) {
    const c = this.ctx, dx = pos.x - this.L.x, dz = pos.z - this.L.z, d = Math.hypot(dx, dz);
    if (d > max) return null;
    const g = c.createGain(); g.gain.value = Math.min(1, ref / Math.max(ref, d)) * (1 - d / max * 0.3);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    // カメラの右向き（カメラの yaw：後ろ向きの向き。forward = -sin,-cos）
    const rx = Math.cos(this.L.yaw), rz = -Math.sin(this.L.yaw);
    if (p) { p.pan.value = Math.max(-0.95, Math.min(0.95, d > 0.01 ? (dx * rx + dz * rz) / d : 0)); g.connect(p); p.connect(this.master); } else g.connect(this.master);
    // 遠いほどこもる
    if (d > 8) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.max(700, 9000 - d * 260); f.connect(g); return f; }
    return g;
  }
  _env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, at = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    this._env(g, t, 0.005, vol, dur); o.connect(g); g.connect(this.out || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, fType = 'bandpass', f = 1200, q = 1, at = 0, slide = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = fType; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (slide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    const g = c.createGain(); this._env(g, t, 0.004, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(this.out || this.master); s.start(t, Math.random() * 1.0); s.stop(t + dur + 0.05);
  }
  /** 声のような音（母音の共鳴を 2 つ）：f0 は声の高さ、vowels は [f1,f2] の並び */
  voice(f0, dur, vol = 0.06, vowels = [[700, 1200], [400, 2000]], at = 0, wob = 5) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 0.82, t + dur);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = wob; lg.gain.value = f0 * 0.04; lfo.connect(lg); lg.connect(o.frequency);
    const g = c.createGain(); this._env(g, t, 0.05, vol, dur);
    const mixG = c.createGain(); mixG.gain.value = 1;
    for (let k = 0; k < 2; k++) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7;
      vowels.forEach((v, i) => bp.frequency.setValueAtTime(v[k], t + dur * i / vowels.length));
      o.connect(bp); bp.connect(mixG);
    }
    mixG.connect(g); g.connect(this.out || this.master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  /** 名前つきの音。pos {x,z} があれば位置のある音 */
  play(name, pos) {
    if (!this.ctx) return;
    this.out = pos ? this._spatial(pos) : null;
    if (pos && !this.out) return;
    switch (name) {
      case 'swing': this.noise(0.12, 0.18, 'bandpass', 2400, 0.8, 0, 0.4); break;
      case 'swing_heavy': this.noise(0.22, 0.25, 'bandpass', 1400, 0.7, 0, 0.35); break;
      case 'swing_pipe': this.noise(0.26, 0.22, 'bandpass', 900, 0.8, 0, 0.5); this.tone(220, 0.1, 'triangle', 0.03, 0.8); break;
      case 'hit': this.noise(0.08, 0.35, 'lowpass', 1800); this.tone(140, 0.12, 'square', 0.12, 0.5); break;
      case 'hit_heavy': this.noise(0.14, 0.45, 'lowpass', 1200); this.tone(90, 0.2, 'square', 0.18, 0.5); break;
      case 'hit_pipe': this.noise(0.1, 0.4, 'lowpass', 900); this.tone(320, 0.35, 'triangle', 0.08, 0.97); this.tone(512, 0.25, 'sine', 0.04); break;
      case 'broken': this.tone(1400, 0.4, 'sine', 0.08, 0.6); this.noise(0.2, 0.25, 'highpass', 3000); break;
      case 'issen': this.tone(2400, 0.9, 'sine', 0.12, 1.02); this.tone(3600, 0.6, 'sine', 0.05, 1.0, 0.02); this.noise(0.35, 0.22, 'highpass', 5000, 0.7, 0.0, 0.6); break;
      case 'chain': this.tone(3000, 0.5, 'sine', 0.1, 1.05); this.tone(4500, 0.3, 'sine', 0.05); this.noise(0.2, 0.18, 'highpass', 6000, 0.7); break;
      case 'issen_ready': this.tone(1800, 0.25, 'sine', 0.08, 1.3); break;
      case 'just': this.tone(880, 0.5, 'sine', 0.12, 0.5); this.tone(1320, 0.4, 'sine', 0.06, 0.5, 0.03); break;
      case 'parry': this.tone(2200, 0.35, 'triangle', 0.22, 0.98); this.tone(3300, 0.25, 'sine', 0.1); this.noise(0.05, 0.3, 'highpass', 4000); break;
      case 'guard': this.tone(600, 0.15, 'square', 0.12, 0.7); break;
      case 'shot': this.noise(0.18, 0.55, 'lowpass', 3000, 0.7, 0, 0.3); this.tone(70, 0.18, 'sine', 0.35, 0.5); this.noise(0.9, 0.06, 'lowpass', 600, 1, 0.12, 0.5); break;
      case 'dry': this.tone(1800, 0.03, 'square', 0.08); break;
      case 'reload': this.tone(500, 0.05, 'square', 0.08); this.tone(800, 0.05, 'square', 0.08, 1, 0.5); this.noise(0.06, 0.15, 'bandpass', 2000, 2, 1.25); break;
      case 'swap': this.noise(0.05, 0.12, 'bandpass', 3000, 2); this.tone(1200, 0.04, 'square', 0.04, 1, 0.04); break;
      case 'dodge': this.noise(0.25, 0.12, 'lowpass', 700, 1, 0, 0.5); this.noise(0.08, 0.1, 'lowpass', 300, 1, 0.28); break;
      case 'hurt': this.tone(180, 0.25, 'sawtooth', 0.15, 0.5); this.noise(0.1, 0.3, 'lowpass', 900); break;
      case 'pickup': this.tone(660, 0.1, 'sine', 0.12); this.tone(990, 0.15, 'sine', 0.1, 1, 0.08); break;
      case 'equip': this.tone(520, 0.1, 'triangle', 0.1); this.tone(780, 0.1, 'triangle', 0.08, 1, 0.08); this.tone(1040, 0.2, 'triangle', 0.06, 1, 0.16); break;
      case 'heal': this.tone(520, 0.3, 'sine', 0.1, 1.5); break;
      case 'door': this.noise(0.5, 0.18, 'lowpass', 400, 1, 0, 0.6); this.tone(220, 0.4, 'triangle', 0.05, 0.8, 0.1); break;
      case 'knock': this.noise(0.05, 0.35, 'lowpass', 300, 2); break;
      case 'ui': this.tone(900, 0.05, 'sine', 0.06); break;
      case 'ui_ok': this.tone(700, 0.06, 'sine', 0.07); this.tone(1050, 0.08, 'sine', 0.06, 1, 0.05); break;
      case 'ui_ng': this.tone(220, 0.15, 'square', 0.06); break;
      case 'save': this.tone(523, 0.12, 'sine', 0.08); this.tone(784, 0.2, 'sine', 0.08, 1, 0.1); break;
      case 'light_on': this.tone(60, 0.3, 'sine', 0.05); this.noise(0.05, 0.08, 'highpass', 5000); break;
      // 敵の合図（読み取れる音）
      case 'notice': this.tone(110, 0.6, 'sine', 0.12, 1.4); break;
      case 'tel_parry': this.tone(2600, 0.06, 'square', 0.1); this.tone(1900, 0.08, 'triangle', 0.08, 1, 0.07); break;
      case 'tel_red': this.tone(70, 0.8, 'sawtooth', 0.14, 1.8); this.noise(0.7, 0.12, 'bandpass', 300, 3, 0, 2.5); break;
      case 'kiro_voice': this.voice(150 + Math.random() * 30, 1.1, 0.05, [[600, 1100], [320, 2200], [500, 900]]); this.voice(118, 1.0, 0.03, [[600, 1100], [320, 2200]], 0.35); break;
      case 'heiten_voice': this.voice(210, 0.5, 0.05, [[500, 900], [700, 1200]]); this.voice(196, 0.5, 0.05, [[400, 2000], [700, 1100]], 0.5); this.voice(176, 0.9, 0.05, [[350, 1900], [600, 1000]], 1.0); break;
      case 'register': this.tone(1760, 0.25, 'triangle', 0.08); this.tone(2637, 0.4, 'sine', 0.05, 1, 0.08); break;
      case 'shutter': this.noise(1.2, 0.25, 'bandpass', 700, 0.6, 0, 0.4); break;
      case 'slam': this.noise(0.4, 0.6, 'lowpass', 600); this.tone(55, 0.4, 'sine', 0.4, 0.5); break;
      case 'die': this.noise(1.6, 0.2, 'lowpass', 600, 1, 0, 0.2); this.tone(110, 1.4, 'sine', 0.06, 0.5); break;
      case 'rescue': this.tone(392, 0.6, 'sine', 0.06); this.tone(523, 0.8, 'sine', 0.05, 1, 0.3); this.tone(659, 1.2, 'sine', 0.04, 1, 0.6); break;
      case 'flicker': this.noise(0.08, 0.06, 'highpass', 6000); this.tone(100, 0.08, 'square', 0.02); break;
      case 'notify': this.tone(1568, 0.08, 'sine', 0.05); this.tone(2093, 0.12, 'sine', 0.05, 1, 0.09); break;
      case 'scream': this.voice(520, 0.5, 0.06, [[900, 1400], [800, 1200]], 0, 9); this.noise(0.4, 0.06, 'bandpass', 2400, 1); break;
      case 'power_down': this.tone(120, 2.5, 'sawtooth', 0.04, 0.25); this.tone(240, 2.0, 'sine', 0.03, 0.3); break;
      case 'tv_blip': this.noise(0.12, 0.12, 'highpass', 3000); this.tone(15000, 0.6, 'sine', 0.01); break;
      // 館内放送・収容者
      case 'pa_chime': this.tone(784, 0.55, 'sine', 0.07); this.tone(659, 0.55, 'sine', 0.07, 1, 0.5); this.tone(523, 0.9, 'sine', 0.06, 1, 1.0); break;
      case 'pa_voice': this.voice(170, 1.3, 0.07, [[700, 1200], [300, 2100], [500, 1000], [350, 1900]], 0, 6); this.noise(1.3, 0.025, 'bandpass', 2600, 2); break;
      case 'pa_cut': this.tone(2400, 0.5, 'sine', 0.04, 1.3); this.noise(0.04, 0.2, 'highpass', 2000); break;
      case 'rollcall': this.voice(150, 1.2, 0.08, [[650, 1100], [330, 2100], [600, 1000]], 0, 4); this.noise(1.2, 0.03, 'bandpass', 2400, 2); this.tone(2800, 0.3, 'sine', 0.012, 1.2, 0.8); break;
      case 'boss_rise': this.noise(2.0, 0.25, 'lowpass', 300, 1, 0, 0.5); for (let i = 0; i < 6; i++) this.tone(300 + Math.random() * 500, 0.12, 'triangle', 0.05, 0.7, 0.3 + i * 0.22); break;
      case 'chairs': for (let i = 0; i < 4; i++) this.tone(400 + Math.random() * 400, 0.1, 'triangle', 0.06, 0.7, i * 0.08); break;
      case 'crash': this.noise(0.6, 0.55, 'lowpass', 500); this.tone(70, 0.5, 'sine', 0.35, 0.5); for (let i = 0; i < 5; i++) this.tone(500 + Math.random() * 600, 0.12, 'triangle', 0.05, 0.6, 0.1 + i * 0.07); break;
      case 'lights_out': this.tone(90, 0.8, 'sawtooth', 0.05, 0.4); this.noise(0.1, 0.15, 'highpass', 4000); break;
      // 第3章：白い姿・模倣する影・写し身・病院
      case 'claw': this.noise(0.1, 0.16, 'bandpass', 3800, 1.2, 0, 0.35); this.tone(1700, 0.06, 'triangle', 0.025, 0.7); break;
      case 'claw_hit': this.noise(0.07, 0.3, 'highpass', 2600); this.tone(260, 0.08, 'square', 0.08, 0.6); break;
      case 'blade': this.tone(1200, 0.5, 'sine', 0.08, 0.6); this.noise(0.3, 0.2, 'bandpass', 2000, 0.8, 0, 0.5); break;
      case 'foxfire': for (let i = 0; i < 3; i++) this.tone(660 + i * 220, 0.35, 'sine', 0.05, 1.6, i * 0.06); this.noise(0.3, 0.06, 'bandpass', 1800, 1.5); break;
      case 'fire_hit': this.noise(0.2, 0.22, 'lowpass', 1600); this.tone(440, 0.2, 'triangle', 0.05, 0.6); break;
      case 'dash': this.noise(0.18, 0.18, 'highpass', 2600, 1, 0, 0.3); this.tone(1600, 0.12, 'sine', 0.03, 1.6); break;
      case 'illusion': this.tone(523, 0.6, 'sine', 0.06, 1.5); this.tone(784, 0.6, 'sine', 0.05, 1.5, 0.08); this.tone(1046, 0.8, 'sine', 0.04, 1.2, 0.16); break;
      case 'transform': this.tone(220, 1.6, 'sine', 0.06, 2.0); this.tone(330, 1.6, 'sine', 0.04, 2.0, 0.2); this.tone(1320, 1.0, 'sine', 0.025, 1.0, 0.8); this.noise(1.4, 0.06, 'bandpass', 900, 0.8, 0, 0.6); break;
      case 'revert': this.tone(660, 0.8, 'sine', 0.05, 0.5); this.noise(0.6, 0.04, 'lowpass', 900); break;
      case 'no_yoki': this.tone(300, 0.12, 'triangle', 0.05, 0.7); break;
      case 'mimic_reveal': this.noise(0.9, 0.18, 'bandpass', 500, 1.2, 0, 0.3); this.voice(240, 0.7, 0.05, [[700, 1100], [400, 1800]], 0, 5); this.tone(90, 0.8, 'sawtooth', 0.05, 0.5); break;
      case 'mimic_voice': this.voice(260 + Math.random() * 40, 0.9, 0.05, [[650, 1150], [380, 2100], [500, 1000]], 0, 3); break;
      case 'copy': this.tone(1000, 0.08, 'square', 0.03); this.tone(1500, 0.08, 'square', 0.03, 1, 0.09); this.tone(2000, 0.1, 'square', 0.03, 1, 0.18); break;
      case 'wave': this.noise(1.0, 0.25, 'lowpass', 400, 1, 0, 0.4); this.tone(45, 1.0, 'sine', 0.2, 0.6); break;
      case 'kanja_voice': this.voice(110 + Math.random() * 20, 1.3, 0.04, [[500, 900], [300, 1800]], 0, 2); break;
      case 'drip_stand': this.tone(2400, 0.05, 'triangle', 0.02); this.tone(2900, 0.05, 'triangle', 0.015, 1, 0.12); break;
      case 'memo': this.tone(880, 0.1, 'square', 0.03); this.voice(300, 1.6, 0.05, [[700, 1200], [450, 2200], [600, 1100]], 0.15, 4); break;
      case 'heartbeat': this.tone(52, 0.18, 'sine', 0.25, 0.7); this.tone(48, 0.16, 'sine', 0.18, 0.7, 0.28); break;
    }
    this.out = null;
  }
  /** 足音：地面の種類 surface と走りかどうか */
  step(surface = 'asphalt', run = false, pos = null) {
    if (!this.ctx) return; this.out = pos ? this._spatial(pos, 2, 18) : null; if (pos && !this.out) return;
    const v = run ? 1.4 : 1;
    switch (surface) {
      case 'wet': this.noise(0.05, 0.05 * v, 'lowpass', 500); this.noise(0.09, 0.035 * v, 'bandpass', 2600, 1.4, 0.01); break;
      case 'tile': this.noise(0.03, 0.06 * v, 'bandpass', 2200, 2); this.tone(1100, 0.02, 'sine', 0.01 * v); break;
      case 'wood': this.noise(0.05, 0.05 * v, 'lowpass', 700); this.tone(190, 0.06, 'triangle', 0.02 * v); break;
      case 'gym': this.noise(0.04, 0.05 * v, 'lowpass', 900); if (Math.random() < 0.18) this.tone(1900 + Math.random() * 600, 0.07, 'sine', 0.012, 1.2); break;
      default: this.noise(0.05, 0.055 * v, 'lowpass', 520);
    }
    this.out = null;
  }
  /** 区画ごとの環境の層。kind：'street'|'street_normal'|'alley'|'plaza'|'gym'|'home' */
  buildBeds() {
    const c = this.ctx, bed = (node, vol) => { const g = c.createGain(); g.gain.value = 0; node.connect(g); g.connect(this.master); return { g, vol }; };
    const loopNoise = (type, f, q = 0.7) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); s.start(); return fl; };
    const osc = (type, f) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
    this.beds = {
      hum: bed(osc('sine', 58), 0.018),
      rain: bed(loopNoise('lowpass', 1400), 0.035),
      wind: bed(loopNoise('bandpass', 380, 0.6), 0.02),
      vent: bed(loopNoise('lowpass', 260, 0.8), 0.03),
      buzz: bed(osc('sawtooth', 120), 0.004),
      shop: bed(osc('triangle', 220), 0.0),
    };
    // 緊張の持続音（低い 2 本・わずかにずらす）
    const t1 = osc('sawtooth', 41.2), t2 = osc('sawtooth', 41.9), tf = c.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 160; t1.connect(tf); t2.connect(tf);
    this.tensionBed = bed(tf, 0.05);
  }
  setAmbience(kind) {
    if (!this.ctx) { this.pendingAmb = kind; return; }
    this.amb = kind;
    const P = {
      street_normal: { hum: 1, rain: 0.3, wind: 0.4, vent: 0, buzz: 0.6, shop: 0 },
      street: { hum: 1, rain: 1, wind: 0.6, vent: 0, buzz: 0.4, shop: 0 },
      home: { hum: 0.6, rain: 0.35, wind: 0.2, vent: 0, buzz: 0, shop: 0 },
      alley: { hum: 0.4, rain: 1.2, wind: 1, vent: 0.4, buzz: 0.8, shop: 0 },
      plaza: { hum: 0.8, rain: 1, wind: 1.2, vent: 0, buzz: 0.3, shop: 0 },
      gym: { hum: 0.5, rain: 0.25, wind: 0.2, vent: 1, buzz: 1, shop: 0 },
      hospital: { hum: 0.9, rain: 0.15, wind: 0.1, vent: 1.2, buzz: 1.4, shop: 0 },
      tunnel: { hum: 0.6, rain: 0, wind: 0.5, vent: 1.6, buzz: 0.3, shop: 0 },
    }[kind] || {};
    const t = this.ctx.currentTime;
    for (const [k, b] of Object.entries(this.beds)) b.g.gain.setTargetAtTime((P[k] || 0) * b.vol * (k === 'rain' && this.rainOff ? 0 : 1), t, 0.8);
  }
  setRain(on) { this.rainOff = !on; if (this.amb) this.setAmbience(this.amb); }
  /** 緊張（0〜1）：敵が近い・敵対中ほど持続音が上がる */
  setTension(k) { if (!this.ctx || !this.tensionBed) return; k = Math.max(0, Math.min(1, k)); if (Math.abs(k - this.tension) < 0.02) return; this.tension = k; this.tensionBed.g.gain.setTargetAtTime(k * this.tensionBed.vol, this.ctx.currentTime, 0.6); }
  /** 時々の遠い音（サイレン・しずく・店内放送の名残・きしみ）。描画フレームごとに呼ぶ */
  update(dt) {
    if (!this.ctx || !this.amb) return;
    const T = this.timers, outdoor = ['street', 'alley', 'plaza', 'street_normal'].includes(this.amb);
    T.siren -= dt; T.drip -= dt; T.muzak -= dt; T.creak -= dt;
    if (T.siren <= 0) { T.siren = 35 + Math.random() * 45; if (outdoor) this.siren(); }
    if (T.drip <= 0) { T.drip = 0.6 + Math.random() * 2.2; if (this.amb === 'alley' || this.amb === 'tunnel') { this.out = this._spatial({ x: this.L.x + (Math.random() - 0.5) * 10, z: this.L.z + (Math.random() - 0.5) * 10 }); if (this.out) this.tone(1800 + Math.random() * 1400, 0.09, 'sine', 0.025, 0.6); this.out = null; } }
    if (T.muzak <= 0) { T.muzak = 14 + Math.random() * 20; if (this.amb === 'plaza') { const notes = [523, 659, 587, 494]; notes.forEach((f, i) => { this.out = this._spatial({ x: 0, z: -14 }, 2, 60); if (this.out) this.tone(f * (1 + (Math.random() - 0.5) * 0.02), 0.5, 'triangle', 0.012, 0.98, i * 0.55); this.out = null; }); } }
    if (T.creak <= 0) { T.creak = 10 + Math.random() * 16; if (this.amb === 'gym' || this.amb === 'hospital') this.noise(0.6, 0.02, 'bandpass', 180, 6, 0, 1.4); if (this.amb === 'hospital' && Math.random() < 0.5) { this.tone(1046, 0.25, 'sine', 0.012); this.tone(1046, 0.25, 'sine', 0.012, 1, 0.5); } }
  }
  /** 遠いサイレン（ゆっくり上下・遠くでこもる） */
  siren() {
    const c = this.ctx, t = c.currentTime, dur = 7;
    const o = c.createOscillator(); o.type = 'sine';
    for (let i = 0; i <= 7; i++) o.frequency.setValueAtTime(i % 2 ? 860 : 620, t + i * 1.0), o.frequency.linearRampToValueAtTime(i % 2 ? 620 : 860, t + i * 1.0 + 0.95);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(f); f.connect(g); if (p) { p.pan.value = Math.random() * 1.6 - 0.8; g.connect(p); p.connect(this.master); } else g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.1);
  }
}
