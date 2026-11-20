/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 音（仮）  noaris/audio.js
   ・素材が無い間は WebAudio で合成する。BGM：title（オルゴール）・corridor（回廊）・rose（3 拍子の円舞曲）・dark（低い持続音）
   ・効果音：click・choice・bell（零時の鐘）・rewind（時が巻き戻る）・crack（表情が崩れる）・gameover
   ・音量は設定（0〜1）。初めて触った時に鳴らせるようになる（ブラウザの決まり）
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const A = root.NA_AUDIO = { bgmVol: .5, seVol: .7, cur: null };
  let ctx = null, master = null, bgmGain = null, timer = null, step = 0, nextT = 0;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const C = root.AudioContext || root.webkitAudioContext; if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = A.bgmVol * .35; bgmGain.connect(master);
    return ctx;
  }
  A.unlock = () => { ensure(); if (A.cur && !timer) startLoop(); };
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function tone(f, t, dur, type, vol, out, attack = .01) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t, dur, vol) {
    const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur | 0), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(master); s.start(t);
  }
  A.se = function (name) {
    if (!(A.seVol > 0) || !ensure()) return; const t = ctx.currentTime, v = A.seVol;
    if (name === 'click') tone(1320, t, .06, 'sine', .05 * v);
    else if (name === 'choice') { tone(988, t, .5, 'sine', .08 * v); tone(1480, t + .06, .6, 'sine', .05 * v); }
    else if (name === 'bell') { for (const [m, a] of [[1, .22], [2.0, .1], [2.76, .06], [5.4, .03]]) tone(196 * m, t, 3.2, 'sine', a * v, null, .005); }
    else if (name === 'rewind') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1600, t); o.frequency.exponentialRampToValueAtTime(90, t + 1.4); g.gain.setValueAtTime(.08 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.5); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.6); }
    else if (name === 'crack') { noise(t, .35, .25 * v); tone(70, t, .5, 'sawtooth', .08 * v); }
    else if (name === 'gameover') { tone(65, t, 3, 'sawtooth', .07 * v, null, .3); tone(98, t, 3, 'sine', .06 * v, null, .3); }
  };
  // BGM：16 分の枠で、曲ごとの音を置く（拍は 1 枠 = 曲の速さ）
  const SONGS = {
    title: { spb: .32, len: 16, f: (s, t) => { const arp = [76, 79, 83, 88, 86, 83, 79, 81, 76, 79, 84, 88, 86, 84, 79, 78]; tone(midi(arp[s]), t, .9, 'sine', .07, bgmGain, .005); if (s % 8 === 0) tone(midi(52), t, 2.4, 'triangle', .05, bgmGain, .2); } },
    corridor: { spb: .45, len: 12, f: (s, t) => { const arp = [69, 72, 76, 74, 71, 67, 69, 72, 77, 76, 72, 71]; tone(midi(arp[s]), t, 1.4, 'sine', .055, bgmGain, .01); if (s % 6 === 0) tone(midi(45), t, 2.6, 'sine', .06, bgmGain, .3); } },
    rose: { spb: .24, len: 24, f: (s, t) => {   // 3 拍子：低音（1 拍目）＋和音（2・3 拍目）。8 小節
        const bar = Math.floor(s / 3), beat = s % 3, ch = [[57, 60, 64], [62, 65, 69], [55, 59, 62], [57, 61, 64], [53, 57, 60], [52, 56, 59], [57, 60, 64], [52, 56, 59]][bar];
        if (beat === 0) tone(midi(ch[0] - 12), t, .6, 'triangle', .07, bgmGain); else for (const n of ch) tone(midi(n + 12), t, .3, 'sine', .022, bgmGain);
        const mel = [76, 0, 77, 81, 0, 79, 79, 0, 76, 76, 0, 73, 72, 0, 72, 71, 0, 68, 69, 0, 72, 71, 0, 0]; if (mel[s]) tone(midi(mel[s]), t, .7, 'sine', .05, bgmGain, .02); } },
    dark: { spb: .8, len: 8, f: (s, t) => { if (s % 4 === 0) { tone(midi(38), t, 3.4, 'sawtooth', .025, bgmGain, .8); tone(midi(45), t, 3.4, 'sine', .04, bgmGain, .8); } if (s === 6) tone(midi(75), t, 2, 'sine', .02, bgmGain, .4); } },
  };
  function startLoop() {
    if (!ctx || !A.cur) return; clearInterval(timer); step = 0; nextT = ctx.currentTime + .1;
    timer = setInterval(() => { const S = SONGS[A.cur]; if (!S || !ctx) return; while (nextT < ctx.currentTime + .25) { if (A.bgmVol > 0) S.f(step, nextT); step = (step + 1) % S.len; nextT += S.spb; } }, 60);
  }
  A.bgm = function (name) {
    if (name === A.cur) return; A.cur = name || null; clearInterval(timer); timer = null;
    if (!A.cur || !ensure()) return; startLoop();
  };
  A.setVol = (bgm, se) => { A.bgmVol = bgm; A.seVol = se; if (bgmGain) bgmGain.gain.value = bgm * .35; };
})(typeof window !== 'undefined' ? window : globalThis);
