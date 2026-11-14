// tobinezumi/client/audio-core.js — 音の土台（2026-11-14）：AudioContext を 1 つだけ作り、効果音・環境音・曲の 3 つの系統（bus）に分ける。
// ・ブラウザは最初に触るまで音を出せないので、最初の操作（pointerdown・keydown）で作る／再開する。
// ・各系統の大きさは設定（効果音・環境音・音楽）に従う。最後に軽いリミッター（重なっても割れない）。
let ctx = null, master = null, installed = false;
const buses = {}, vols = { sfx: 1, amb: 1, music: 1 }, ready = [];

export function audioCtx() { return ctx; }
export function audioRunning() { return !!ctx && ctx.state === 'running'; }
/** 系統（'sfx'|'amb'|'music'）の入り口。まだ音の準備ができていなければ null */
export function bus(name) { return buses[name] || null; }
/** 系統の大きさ（0〜）。設定が変わった時 */
export function setBusVolume(name, v) {
  vols[name] = Math.max(0, Number(v) || 0);
  if (buses[name]) buses[name].gain.setTargetAtTime(vols[name], ctx.currentTime, 0.15);
}
export function busVolume(name) { return vols[name]; }
/** 音の準備ができたら呼ぶ（もうできていればすぐ） */
export function onAudioReady(fn) { if (ctx) fn(ctx); else ready.push(fn); }

export function unlockAudio() {
  if (!ctx) {
    try { ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    master = ctx.createGain(); master.gain.value = 1;
    master.connect(lim); lim.connect(ctx.destination);
    for (const k of ['sfx', 'amb', 'music']) { const g = ctx.createGain(); g.gain.value = vols[k]; g.connect(master); buses[k] = g; }
    for (const fn of ready.splice(0)) { try { fn(ctx); } catch (e) {} }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}
/** 最初の操作で音を準備する（何度呼んでも 1 回だけ登録） */
export function installAudioUnlock() {
  if (installed || typeof addEventListener !== 'function') return;
  installed = true;
  addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  addEventListener('keydown', unlockAudio, { capture: true });
}
/** 動作確認用：全体の出口の音の大きさ（RMS の dBFS）を測る道具を付ける */
export function attachMeter() {
  if (!ctx || !master) return null;
  const an = ctx.createAnalyser(); an.fftSize = 2048; master.connect(an);
  const buf = new Float32Array(an.fftSize);
  return () => { an.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; return 10 * Math.log10(s / buf.length + 1e-12); };
}
