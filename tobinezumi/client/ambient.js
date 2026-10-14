// tobinezumi/client/ambient.js — 環境音（Ver.0.5）。音のファイルは使わず WebAudio で合成する。
//   風（砂嵐・岩場・砂丘で強く）・雨・川（渓谷の川べり・富山の水路）・虫の声（夏の夜）・フクロウ（夜にときどき・近くにいるとき）・キツネ（夕方〜夜にときどき）・
//   富山の静けさ（風が弱く、遠くで鈴のような音がまれに）。巣の中は小さく、こもった音に。
// ブラウザは最初に触るまで音を出せないので、最初の操作で AudioContext を作る（sfx.js と同じ考え方）。音量は tobi_settings.ambient（0〜1）。
let ctx = null;

function noiseBuffer(c, seconds = 2, brown = false) {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}

export class Ambient {
  constructor(volume = 0.5) {
    this.volume = volume; this.on = false; this.t = 0; this.nextOwl = 8; this.nextFox = 14; this.nextBell = 30;
    const unlock = () => this._start();
    addEventListener('pointerdown', unlock, { capture: true, passive: true });
    addEventListener('keydown', unlock, { capture: true });
  }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); if (this.master) this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx.currentTime, 0.2); }
  _start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try { ctx = ctx || new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx = ctx;
    this.master = c.createGain(); this.master.gain.value = this.volume * 0.5;
    this.muffle = c.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 18000;
    this.master.connect(this.muffle); this.muffle.connect(c.destination);
    const loop = (buf, filterType, freq, q = 0.7) => {
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      return { g, f };
    };
    const white = noiseBuffer(c, 2), brown = noiseBuffer(c, 3, true);
    this.wind = loop(brown, 'lowpass', 500);
    this.rain = loop(white, 'highpass', 1400);
    this.river = loop(brown, 'bandpass', 700, 0.9);
    // 虫の声：高い音を小刻みに揺らす
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 4200;
    const am = c.createOscillator(); am.frequency.value = 23; const amg = c.createGain(); amg.gain.value = 0.5;
    const ig = c.createGain(); ig.gain.value = 0;
    am.connect(amg); amg.connect(ig.gain); o.connect(ig); ig.connect(this.master); o.start(); am.start();
    this.insects = { g: ig };
    this.on = true;
  }
  _set(layer, v, k = 0.6) { if (layer) layer.g.gain.setTargetAtTime(Math.max(0, v), this.ctx.currentTime, k); }
  _tone(t0, f0, f1, dur, type = 'sine', vol = 0.1) {
    const c = this.ctx, g = c.createGain(), o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  owl(near = false) { const t = this.ctx.currentTime + 0.02, v = near ? 0.12 : 0.05; this._tone(t, 390, 330, 0.42, 'sine', v); this._tone(t + 0.55, 370, 300, 0.6, 'sine', v * 0.9); }
  fox() { const t = this.ctx.currentTime + 0.02; for (let i = 0; i < 2; i++) this._tone(t + i * 0.18, 700, 420, 0.12, 'sawtooth', 0.025); }
  bell() { const t = this.ctx.currentTime + 0.02; this._tone(t, 1320, 1300, 2.4, 'sine', 0.02); this._tone(t, 1980, 1960, 1.6, 'sine', 0.008); }
  /** 毎フレーム：いる所・天気・時間帯で層の大きさを決める */
  update(dt, game) {
    this.t += dt;
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const f = game.field, env = game.env, sc = game.scene;
    const inField = !!f && sc === f, inNest = !!f && (sc === game.walk || sc === game.build);
    if (!f || (!inField && !inNest) || this.volume <= 0) { for (const l of [this.wind, this.rain, this.river, this.insects]) this._set(l, 0, 0.3); return; }
    const region = (f.map && f.map.region) || 'plains';
    const tod = game.tod ? game.tod() : { period: 'day' };
    const night = tod.period === 'night';
    const w = env ? env.weather : 'clear', k = env ? env.weatherK ?? 1 : 1;
    // 巣の中はこもった音
    this.muffle.frequency.setTargetAtTime(inNest ? 700 : 18000, this.ctx.currentTime, 0.3);
    let wind = 0.12 + (region === 'rocks' ? 0.12 : region === 'dunes' ? 0.16 : region === 'toyama' ? 0.04 : 0);
    if (w === 'sandstorm') wind = 0.55 * k + 0.2; else if (w === 'snow') wind += 0.08;
    this.wind.f.frequency.setTargetAtTime(w === 'sandstorm' ? 900 : 450, this.ctx.currentTime, 0.5);
    this._set(this.wind, wind * (inNest ? 0.5 : 1));
    this._set(this.rain, w === 'rain' ? 0.32 * k : 0);
    // 川：渓谷の川べり・富山の水路の近く（いちばん近い水のタイルまでの距離）
    let river = 0;
    if ((region === 'canyon' || region === 'toyama') && f.wet && f.wet.length && f.view) {
      let best = 1e9;
      for (let i = 0; i < f.wet.length; i += 3) { const q = f.wet[i]; const d = Math.hypot(q.tx * 16 + 8 - f.view.x, q.ty * 16 + 8 - f.view.y); if (d < best) best = d; }
      river = Math.max(0, 1 - best / 260) * (region === 'canyon' ? 0.5 : 0.22);
    }
    this._set(this.river, inField ? river : river * 0.3);
    const summerNight = env && env.season === 'summer' && night && w !== 'rain';
    const insects = summerNight ? (region === 'dunes' ? 0.012 : 0.03) : env && night && env.season !== 'winter' && region !== 'toyama' ? 0.01 : 0;
    this._set(this.insects, inField ? insects : 0, 1.2);
    // 鳴き声（ときどき）：フクロウは夜（近くにいれば大きく）、キツネは夕方と夜
    if (!inField) return;
    const preds = f.predViews || [];
    this.nextOwl -= dt; this.nextFox -= dt; this.nextBell -= dt;
    const owlNear = preds.some(p => p.kind === 'owl' && !p.gone);
    if (this.nextOwl <= 0) { this.nextOwl = owlNear ? 6 + Math.random() * 6 : 18 + Math.random() * 25; if ((night || owlNear) && region !== 'toyama') this.owl(owlNear); }
    if (this.nextFox <= 0) { this.nextFox = 25 + Math.random() * 30; if ((night || tod.period === 'dusk') && region !== 'toyama' && preds.some(p => p.kind === 'fox')) this.fox(); }
    if (this.nextBell <= 0) { this.nextBell = 40 + Math.random() * 40; if (region === 'toyama') this.bell(); }
  }
}
