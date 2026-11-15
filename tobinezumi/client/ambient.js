// tobinezumi/client/ambient.js — 環境音（Ver.0.5。2026-11-14 見直し）。
//   風（砂嵐・岩場・砂丘で強く）・雨・川（渓谷の川べり・富山の水路）・小鳥（明け方がいちばん・昼）・虫の声（夏の夜がいちばん・秋も）・
//   フクロウ（夜にときどき・近くにいるとき）・キツネ（夕方〜夜にときどき）・富山の静けさ（風が弱く、遠くで鈴のような音がまれに）。巣の中は小さく、こもった音に。
// ・層の大きさは sound-data.js の ambMix（土地・時間帯・季節・天気・巣の中）で決める。
// ・CC0 の録音（soundbank.js が後から読む）が読めた層はそれを鳴らし、同じ役の合成の層を弱める。読めるまで・読めない時は合成音（WebAudio）。
// ・音量は設定 tobi_settings.ambient（0〜1）。AudioContext は audio-core.js の 1 つを使う。
import { audioCtx, audioRunning, bus, installAudioUnlock, onAudioReady, setBusVolume } from './audio-core.js';
import { ambMix, AMB_LAYERS } from './sound-data.js';

function noiseBuffer(c, seconds = 2, brown = false) {
  const n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return buf;
}
/** 素材の層の大きさ（ambMix の値 1 に対して）。素材は平均 -30 LUFS に揃えてある */
const FILE_K = { birds: 0.9, insects: 0.8, river: 1.2, wind: 1.6, rain: 1.0 };

export class Ambient {
  constructor(volume = 0.5) {
    this.volume = volume; this.on = false; this.t = 0; this.nextOwl = 8; this.nextFox = 14; this.nextBell = 30; this.nextChirp = 4;
    this.bank = null; this.files = {}; this.mix = null;
    installAudioUnlock();
    onAudioReady(() => this._start());
  }
  setBank(b) { this.bank = b; }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); setBusVolume('amb', this.volume * 0.5 * 2); }
  _start() {
    if (this.ctx) return;
    const c = this.ctx = audioCtx(); if (!c) return;
    setBusVolume('amb', this.volume * 0.5 * 2);
    this.master = c.createGain(); this.master.gain.value = 1.5;   // 2026-11-14：0.5 → 1.5（測ると層が -50 dBFS 台で小さすぎた）
    this.muffle = c.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 18000;
    this.master.connect(this.muffle); this.muffle.connect(bus('amb'));
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
    // 虫の声（合成）：高い音を小刻みに揺らす。録音が読めるまでのかわり
    // 2026-11-14：揺らす段（0〜1）と大きさの段（ig）を分けた。前は揺らしを大きさの段に直接足していたので、大きさ 0 でも
    //   4200Hz の音がいつも（昼も・巣の中でも）鳴り続けていた
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 4200;
    const am = c.createOscillator(); am.frequency.value = 23; const amg = c.createGain(); amg.gain.value = 0.5;
    const trem = c.createGain(); trem.gain.value = 0.5;
    const ig = c.createGain(); ig.gain.value = 0;
    am.connect(amg); amg.connect(trem.gain); o.connect(trem); trem.connect(ig); ig.connect(this.master); o.start(); am.start();
    this.insects = { g: ig };
    this.on = true;
  }
  _set(layer, v, k = 0.6) { if (layer) layer.g.gain.setTargetAtTime(Math.max(0, v), this.ctx.currentTime, k); }
  /** 素材の層（読めていれば始める）。返り値：鳴っているか */
  _file(id, v, k = 0.8) {
    let L = this.files[id];
    if (!L) {
      if (!this.bank || !this.bank.has(id)) return false;
      const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
      src.buffer = this.bank.buf(id); src.loop = true; this.bank.setLoop(src, id);
      g.gain.value = 0; src.connect(g); g.connect(this.master);
      const L0 = this.bank.loop(id); src.start(c.currentTime + 0.05, L0 ? L0[0] + Math.random() * Math.max(0, L0[1] - L0[0] - 1) : 0);
      L = this.files[id] = { src, g };
    }
    this._set(L, v, k);
    return true;
  }
  _tone(t0, f0, f1, dur, type = 'sine', vol = 0.1) {
    const c = this.ctx, g = c.createGain(), o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.04, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  owl(near = false) { const t = this.ctx.currentTime + 0.02, v = near ? 0.1 : 0.045; this._tone(t, 390, 330, 0.42, 'sine', v); this._tone(t + 0.55, 370, 300, 0.6, 'sine', v * 0.9); }
  fox() { const t = this.ctx.currentTime + 0.02; for (let i = 0; i < 2; i++) this._tone(t + i * 0.18, 760, 460, 0.12, 'triangle', 0.025); }
  bell() { const t = this.ctx.currentTime + 0.02; this._tone(t, 1320, 1300, 2.4, 'sine', 0.02); this._tone(t, 1980, 1960, 1.6, 'sine', 0.008); }
  /** 小鳥のさえずり（合成。録音が読めるまでのかわり）：短く高い音を 2〜4 回 */
  chirp(v) { const t = this.ctx.currentTime + 0.02, f = 2600 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this._tone(t + i * 0.11, f * (1 + i * 0.04), f * 1.25, 0.07, 'sine', 0.012 * v); }
  /** 毎フレーム：いる所・天気・時間帯で層の大きさを決める */
  update(dt, game) {
    this.t += dt;
    if (!this.on || !this.ctx || !audioRunning()) return;
    const f = game.field, env = game.env, sc = game.scene;
    const inField = !!f && sc === f, inNest = !!f && (sc === game.walk || sc === game.build);
    const layers = [this.wind, this.rain, this.river, this.insects];
    if (!f || (!inField && !inNest) || this.volume <= 0) {
      for (const l of layers) this._set(l, 0, 0.3);
      for (const L of Object.values(this.files)) this._set(L, 0, 0.5);
      this.mix = null; return;
    }
    const region = (f.map && f.map.region) || 'plains';
    const tod = game.tod ? game.tod() : { period: 'day' };
    const night = tod.period === 'night';
    const w = env ? env.weather : 'clear';
    // 川：渓谷の川べり・富山の水路の近く（いちばん近い水のタイルまでの距離）
    let river = 0;
    if ((region === 'canyon' || region === 'toyama') && f.wet && f.wet.length && f.view) {
      let best = 1e9;
      for (let i = 0; i < f.wet.length; i += 3) { const q = f.wet[i]; const d = Math.hypot(q.tx * 16 + 8 - f.view.x, q.ty * 16 + 8 - f.view.y); if (d < best) best = d; }
      river = Math.max(0, 1 - best / 260) * (region === 'canyon' ? 0.5 : 0.22);
    }
    const m = this.mix = ambMix({ region, period: tod.period, season: env ? env.season : 'spring', weather: w, k: env ? env.weatherK ?? 1 : 1, inNest, river });
    // 巣の中はこもった音
    this.muffle.frequency.setTargetAtTime(inNest ? 700 : w === 'snow' ? 6000 : 18000, this.ctx.currentTime, 0.3);
    this.wind.f.frequency.setTargetAtTime(m.windTone, this.ctx.currentTime, 0.5);
    // 素材が鳴る層は合成を弱める（風は合成の低いうなりを少し残す：砂嵐の強さを出すため）
    // 砂嵐の風は層の値（ambMix）のままだと大きすぎる（-27 dBFS）ので、録音も合成も約 4dB 下げる（-31 前後。雨 -33 より少し上）
    const stormK = w === 'sandstorm' ? 0.5 : 1;
    const fileOn = {};
    for (const [id, role] of Object.entries(AMB_LAYERS)) fileOn[role] = this._file(id, m[role] * FILE_K[role] * (role === 'wind' ? stormK : 1));
    this._set(this.wind, m.wind * (fileOn.wind ? 0.35 : 1) * (w === 'sandstorm' ? 0.62 : 1));
    this._set(this.rain, fileOn.rain ? m.rain * 0.15 : m.rain);
    this._set(this.river, fileOn.river ? 0 : m.river);
    this._set(this.insects, inField && !fileOn.insects ? m.insects * 0.03 : 0, 1.2);
    // 鳴き声（ときどき）：フクロウは夜（近くにいれば大きく）、キツネは夕方と夜。小鳥（合成）は録音が無い時だけ
    if (!inField) return;
    const preds = f.predViews || [];
    this.nextOwl -= dt; this.nextFox -= dt; this.nextBell -= dt; this.nextChirp -= dt;
    const owlNear = preds.some(p => p.kind === 'owl' && !p.gone);
    if (this.nextOwl <= 0) { this.nextOwl = owlNear ? 6 + Math.random() * 6 : 18 + Math.random() * 25; if ((night || owlNear) && region !== 'toyama') this.owl(owlNear); }
    if (this.nextFox <= 0) { this.nextFox = 25 + Math.random() * 30; if ((night || tod.period === 'dusk') && region !== 'toyama' && preds.some(p => p.kind === 'fox')) this.fox(); }
    if (this.nextBell <= 0) { this.nextBell = 40 + Math.random() * 40; if (region === 'toyama') this.bell(); }
    if (this.nextChirp <= 0) { this.nextChirp = 5 + Math.random() * 9 / Math.max(0.2, m.birds); if (!fileOn.birds && m.birds > 0.1) this.chirp(m.birds); }
  }
}
