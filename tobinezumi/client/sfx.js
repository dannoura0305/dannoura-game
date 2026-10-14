// tobinezumi/client/sfx.js — 小さな効果音（WebAudio で合成。音のファイルは使わない）。危険の予告（！）・急降下・飛びかかり・つかまった・入口をふさぐ。
// ブラウザは「最初に触るまで音を出せない」ので、最初の操作で AudioContext を作る。設定 tobi_settings.sound === false なら鳴らさない。
let ctx = null, enabled = true, lastAt = new Map();

export function initSfx(on = true) {
  enabled = on !== false;
  const unlock = () => {
    if (!ctx) { try { ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  };
  addEventListener('pointerdown', unlock, { capture: true, passive: true });
  addEventListener('keydown', unlock, { capture: true });
}
export function setSfx(on) { enabled = !!on; }

function tone(t0, { f0 = 440, f1 = f0, dur = 0.12, type = 'square', vol = 0.06, noise = false } = {}) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(ctx.destination);
  if (noise) {
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f0, t0); bp.frequency.linearRampToValueAtTime(f1, t0 + dur); bp.Q.value = 2;
    src.connect(bp); bp.connect(g); src.start(t0); src.stop(t0 + dur);
    return;
  }
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  o.connect(g); o.start(t0); o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  alert: t => { tone(t, { f0: 880, f1: 1180, dur: 0.09 }); tone(t + 0.11, { f0: 1180, f1: 1400, dur: 0.1 }); },          // ！
  owl: t => { tone(t, { f0: 380, f1: 300, dur: 0.28, type: 'sine', vol: 0.08 }); tone(t + 0.34, { f0: 360, f1: 280, dur: 0.36, type: 'sine', vol: 0.07 }); },   // ほう…ほう
  dive: t => tone(t, { f0: 2400, f1: 500, dur: 0.35, noise: true, vol: 0.12 }),                                                // ひゅうっ
  fox: t => { tone(t, { f0: 620, f1: 420, dur: 0.1, type: 'sawtooth', vol: 0.05 }); tone(t + 0.14, { f0: 600, f1: 380, dur: 0.1, type: 'sawtooth', vol: 0.05 }); },
  hiss: t => tone(t, { f0: 5000, f1: 4000, dur: 0.45, noise: true, vol: 0.08 }),                                               // シャーッ
  caught: t => { tone(t, { f0: 300, f1: 90, dur: 0.3, type: 'square', vol: 0.08 }); tone(t + 0.05, { f0: 900, f1: 200, dur: 0.25, noise: true, vol: 0.1 }); },
  safe: t => { tone(t, { f0: 660, dur: 0.08, type: 'triangle' }); tone(t + 0.09, { f0: 880, dur: 0.12, type: 'triangle' }); },
  // Ver.0.7：富山の 4:44 ごろ、遠くを通りすぎる長い音（低いうなり・レールの継ぎ目の音・かすかな汽笛のような音）
  train: t => {
    tone(t, { f0: 160, f1: 120, dur: 3.6, noise: true, vol: 0.03 });
    for (let i = 0; i < 6; i++) { tone(t + 0.4 + i * 0.5, { f0: 900, f1: 700, dur: 0.05, noise: true, vol: 0.02 }); tone(t + 0.52 + i * 0.5, { f0: 900, f1: 700, dur: 0.05, noise: true, vol: 0.018 }); }
    tone(t + 0.2, { f0: 520, f1: 500, dur: 0.9, type: 'sine', vol: 0.014 }); tone(t + 1.2, { f0: 440, f1: 420, dur: 1.2, type: 'sine', vol: 0.012 });
  },
  plug: t => { tone(t, { f0: 220, f1: 180, dur: 0.06, type: 'triangle', vol: 0.1 }); tone(t + 0.08, { f0: 260, f1: 200, dur: 0.06, type: 'triangle', vol: 0.1 }); },
};
/** 鳴らす（同じ音は 0.25 秒あける） */
export function sfx(name) {
  if (!enabled || !ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (lastAt.get(name) || 0) < 250) return;
  lastAt.set(name, now);
  try { SOUNDS[name](ctx.currentTime + 0.01); } catch (e) {}
}
