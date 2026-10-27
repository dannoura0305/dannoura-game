/* ══════════════════════════════════════════════════════════════════════
   境界事象  歩く地図の BGM（kyokai/music.js・global KY_BGM）
   読み込み順：engine.js → systems.js → battle.js → music.js →（data/maps.js …）

   ■ やること
   ・歩いて回る月代町（KY_WORLD）が出ている間だけ、ゲームボーイの 4 音（パルス 2・波形＝三角・ノイズ）で
     短いループ曲を鳴らす。曲はすべてこのファイルで作ったオリジナル。音声ファイルは使わない。
   ・曲は場所と観測層で変わる：町 town／分室 office／地下・トンネル deep／別の歴史 B showa（ワルツ）／
     崩壊 C empty（まばら）／混ざる世界 X rift（不安なアルペジオ）。KY_BGM.pick(map, world, pal)。
   ・戦闘（KY_BATTLE.current）・会話の一枚絵（歩く地図が出ていない）・タイトルでは止める（0.6 秒で絞る）。
   ・音量は設定の「BGM」（KY.settings.bgm 0〜100、既定 60）。全体の音量（vol）の下にぶら下がる。
   ・存在安定度が 30 を下回ると、旋律の音程が少し揺れる（観測が不安定）。
   ■ データ：曲 = { bpm, bar（1 小節の歩数）, lead, harm, bass, noise }。
     旋律は "E5 - D5 . C#5" のような文字列（音名＋オクターブ／- 前の音をのばす／. 休み、| は読みやすさのための区切り）。
     KY_BGM.compile(曲) → { steps, ev:[[歩, 音の種類, MIDI, 長さ(歩)]] }（node のテストで確かめる）。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY;
  const API = root.KY_BGM = {};

  /* ───────── 旋律の文字列 → MIDI ───────── */
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(tok) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(tok);
    if (!m) return null;
    return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  }
  // "E5 - D5 . | C5" → [76, -1, 74, 0, 72]（-1 のばす・0 休み）
  function parse(s) {
    const out = [];
    String(s || '').split(/[\s|]+/).filter(Boolean).forEach(t => {
      if (t === '-') out.push(-1);
      else if (t === '.') out.push(0);
      else { const n = midi(t); if (n == null) throw new Error('KY_BGM: 読めない音 ' + t); out.push(n); }
    });
    return out;
  }
  API.parse = parse;
  API.midi = midi;
  // 和音の根音から、小節ごとの伴奏（ベース・分散和音）を作る
  const CH = { m: [0, 3, 7], M: [0, 4, 7], d: [0, 3, 6] };
  function chordBars(spec, bar, fn) {
    // spec: "A2m A2m F2M G2M" → 各小節に fn(root, tones) の歩の列
    const out = [];
    String(spec).split(/\s+/).filter(Boolean).forEach(c => {
      const m = /^([A-G](?:#|b)?-?\d)([mMd])$/.exec(c); if (!m) throw new Error('KY_BGM: 読めない和音 ' + c);
      const r = midi(m[1]), tones = CH[m[2]].map(k => r + k);
      const row = fn(r, tones); for (let i = 0; i < bar; i++) out.push(row[i] == null ? 0 : row[i]);
    });
    return out;
  }

  /* ───────── 曲（すべてオリジナル） ───────── */
  const SONGS = API.SONGS = {
    // 月代町（夕方の小さな町。少しさびしい短調）
    town: {
      bpm: 100, bar: 8,
      lead: 'E5 - D5 C5 B4 - C5 - | A4 - - - . . E4 G4 | A4 - B4 C5 D5 - C5 B4 | C5 - - B4 A4 - - - | F5 - E5 D5 C5 - D5 - | E5 - - - . . C5 D5 | E5 - D5 C5 B4 - G#4 - | A4 - - - - - . .',
      bass: () => chordBars('A2m A2m F2M G2M F2M C3M E2M A2m', 8, r => [r, 0, r + 12, 0, r, 0, r + 12, 0]),
      harm: () => chordBars('A3m A3m F3M G3M F3M C4M E3M A3m', 8, (r, t) => [0, t[0] + 12, 0, t[1] + 12, 0, t[2] + 12, 0, t[1] + 12]),
      noise: '. h . h s h . h',
    },
    // 観測センター分室（落ち着いた長調。夜勤の机）
    office: {
      bpm: 88, bar: 8,
      lead: 'C5 - - E5 G5 - - - | F5 - E5 - C5 - - - | E5 - - C5 A4 - B4 C5 | D5 - - - . . . . | C5 - - E5 G5 - A5 - | F5 - - E5 D5 - C5 - | B4 - C5 - D5 - E5 - | C5 - - - . . . .',
      bass: () => chordBars('C3M F2M A2m G2M C3M F2M G2M C3M', 8, r => [r, 0, 0, r + 7, r + 12, 0, r + 7, 0]),
      harm: () => chordBars('C4M F3M A3m G3M C4M F3M G3M C4M', 8, (r, t) => [0, t[0], 0, t[1], 0, t[2], 0, t[1]]),
      noise: '. . h . . . h .',
    },
    // 地下・トンネル・旧研究施設（暗い短調。足もとが冷たい）
    deep: {
      bpm: 76, bar: 8,
      lead: 'C5 - - - D#5 - D5 - | C5 - - - G4 - - - | G#4 - - - G4 - F4 - | G4 - - - - - . . | C5 - - - D#5 - F5 - | G5 - - - F5 - D#5 - | D5 - - - B4 - - - | C5 - - - - - . .',
      bass: () => chordBars('C3m C3m G#2M G2M C3m D#3M G2M C3m', 8, r => [r, 0, 0, 0, r, 0, 0, 0]),
      harm: () => chordBars('C4m C4m G#3M G3M C4m D#4M G3M C4m', 8, (r, t) => [0, 0, t[1], 0, 0, 0, t[2], 0]),
      noise: '. . . . . . . .',
    },
    // 別の歴史 B（セピア。昭和の町のワルツ）
    showa: {
      bpm: 132, bar: 6,
      lead: 'D5 - - - C5 Bb4 | A4 - - - G4 - | A4 - Bb4 - C5 - | D5 - - - - - | F5 - - - D5 - | Bb4 - C5 - D5 - | C#5 - - - A4 - | D5 - - - - -',
      bass: () => chordBars('D3m G2m A2M D3m Bb2M G2m A2M D3m', 6, r => [r, 0, 0, 0, 0, 0]),
      harm: () => chordBars('D4m G3m A3M D4m Bb3M G3m A3M D4m', 6, (r, t) => [0, 0, t[1], 0, t[2], 0]),
      noise: '. . h . h .',
    },
    // 崩壊 C（誰もいない。まばらな音と低い持続音）
    empty: {
      bpm: 66, bar: 8, gain: 0.7,
      lead: 'E5 - - - - - - - | . . . . G5 - - - | F#5 - - - - - . . | . . . . . . . . | B4 - - - - - - - | . . C5 - - - - - | A#4 - - - - - - - | . . . . . . . .',
      bass: 'E2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - - | C2 - - - - - - - | C2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -',
      harm: '',
      noise: '. . . . . . . . | . . . . . . h . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . h . | . . . . . . . . | . . . . . . . .',
    },
    // 混ざる世界 X（減七の分散和音が回り続ける）
    rift: {
      bpm: 140, bar: 8,
      lead: 'B5 - - - - - - - | C6 - - - - - - - | B5 - - - A#5 - - - | A5 - - - - - . .',
      harm: 'E4 G4 A#4 C#5 A#4 G4 E4 G4 | F4 G#4 B4 D5 B4 G#4 F4 G#4 | E4 G4 A#4 C#5 A#4 G4 E4 G4 | D#4 F#4 A4 C5 A4 F#4 D#4 F#4',
      bass: 'E2 . E2 . E2 . E2 . | F2 . F2 . F2 . F2 . | E2 . E2 . E2 . E2 . | D#2 . D#2 . D#2 . D#2 .',
      noise: 'h . h h s . h . | h . h h s . h . | h . h h s . h . | h . h h s h s h',
    },
  };
  // 音の種類ごとの音色（GB の 4 音）
  const VOICE = {
    lead: { wave: 0.25, vol: 0.032, gate: 0.9 },
    harm: { wave: 0.125, vol: 0.016, gate: 0.6 },
    bass: { wave: 'tri', vol: 0.075, gate: 0.85 },
  };
  API.VOICE = VOICE;

  // 曲 → 歩ごとの音の一覧（長さは「のばす」の数から）
  function compile(song) {
    const lines = {};
    ['lead', 'harm', 'bass'].forEach(k => { const v = typeof song[k] === 'function' ? song[k]() : parse(song[k]); lines[k] = v; });
    const nz = String(song.noise || '').split(/[\s|]+/).filter(Boolean);
    const steps = Math.max(lines.lead.length, lines.harm.length, lines.bass.length);
    const ev = [];
    ['lead', 'harm', 'bass'].forEach(k => {
      const L = lines[k]; if (!L.length) return;
      for (let i = 0; i < steps; i++) {
        const n = L[i % L.length]; if (!(n > 0)) continue;
        let len = 1; while (len < steps && L[(i + len) % L.length] === -1) len++;
        ev.push([i, k, n, len]);
      }
    });
    if (nz.length) for (let i = 0; i < steps; i++) { const t = nz[i % nz.length]; if (t === 'h' || t === 's') ev.push([i, 'noise', t === 's' ? 2 : 1, 1]); }
    ev.sort((a, b) => a[0] - b[0]);
    return { steps, bar: song.bar, bpm: song.bpm, ev, lines };
  }
  API.compile = compile;

  // 場所・観測層 → 曲
  const DEEP = /^(center_basement|tunnel|old_lab)$/;
  API.pick = function (map, world, pal) {
    if (!map) return null;
    if (pal === 'X' || map === 'collapse') return 'rift';
    if (world === 'C') return 'empty';
    if (world === 'B') return 'showa';
    if (DEEP.test(map)) return 'deep';
    if (/^center_/.test(map)) return 'office';
    return 'town';
  };

  if (!KY || !KY.HAS_DOM) return;
  const SET = KY.settings;
  if (SET.bgm == null) SET.bgm = 60;

  /* ───────── 鳴らす ───────── */
  const AU = () => KY._au;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const PW = {};
  function pwave(c, duty) {
    const k = duty + '';
    if (PW[k] && PW[k].c === c) return PW[k].w;
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    const w = c.createPeriodicWave(re, im); PW[k] = { c, w }; return w;
  }
  const P = { song: null, id: null, bus: null, master: null, iv: 0, next: 0, step: 0, comp: null, byStep: null, want: null, offSince: 0 };
  function masterGain() {
    const a = AU(); if (!a || !a.ok) return null;
    if (!P.master || P.master.context !== a.ctx) { P.master = a.ctx.createGain(); P.master.connect(a.out); }
    P.master.gain.setTargetAtTime(Math.max(0, Math.min(100, SET.bgm | 0)) / 100 * 0.75, a.ctx.currentTime, 0.08);
    return P.master;
  }
  API.setVol = v => { SET.bgm = Math.max(0, Math.min(100, v | 0)); try { KY.saveSettings(); } catch (e) {} masterGain(); };
  function note(c, kind, n, t, dur, bus, wob) {
    const V = VOICE[kind]; if (!V) return;
    const os = c.createOscillator(), g = c.createGain();
    if (V.wave === 'tri') os.type = 'triangle'; else { try { os.setPeriodicWave(pwave(c, V.wave)); } catch (e) { os.type = 'square'; } }
    os.frequency.setValueAtTime(hz(n), t);
    if (wob && kind === 'lead') { os.detune.setValueAtTime(0, t); os.detune.linearRampToValueAtTime((Math.random() - 0.5) * wob, t + dur); }
    const d = dur * V.gate;
    g.gain.value = 0;   // 鳴り始めより前は 0（既定の 1 のままだと、始まりの一瞬が大きなクリックになる）
    g.gain.setValueAtTime(V.vol, t); g.gain.setValueAtTime(V.vol, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(bus); os.start(t); os.stop(t + d + 0.03);
  }
  function hit(c, kind, t, bus) {
    const a = AU(); if (!a.noise) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = a.noise; f.type = 'highpass'; f.frequency.value = kind === 2 ? 1800 : 6000;
    const v = kind === 2 ? 0.035 : 0.018, dur = kind === 2 ? 0.09 : 0.03;
    g.gain.value = 0; g.gain.setValueAtTime(v, t); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function tick() {
    const a = AU(); if (!a || !a.ok || !P.song) return;
    const c = a.ctx, len = 60 / P.comp.bpm / 2;
    const stab = (KY.state && KY.state.stability) | 0;
    const wob = stab < 30 ? (30 - stab) * 3 : 0;
    if (P.next < c.currentTime) P.next = c.currentTime + 0.05;   // 止まっていた（裏に回っていた）ら、今から続ける
    while (P.next < c.currentTime + 0.3) {
      const i = P.step % P.comp.steps;
      (P.byStep[i] || []).forEach(([, kind, n, l]) => { if (kind === 'noise') hit(c, n, P.next, P.bus); else note(c, kind, n, P.next, l * len, P.bus, wob); });
      P.next += len; P.step++;
    }
  }
  function fadeOut(bus, sec) {
    const a = AU(); if (!bus || !a || !a.ok) return;
    try { bus.gain.cancelScheduledValues(a.ctx.currentTime); bus.gain.setTargetAtTime(0.0001, a.ctx.currentTime, sec / 3); } catch (e) {}
    setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, sec * 1000 + 600);
  }
  API.stop = function (sec) {
    if (P.iv) { clearInterval(P.iv); P.iv = 0; }
    if (P.bus) fadeOut(P.bus, sec == null ? 0.6 : sec);
    P.bus = null; P.song = null; P.id = null;
  };
  API.play = function (id) {
    if (P.id === id) return true;
    const a = AU(); const song = SONGS[id];
    if (!song) { API.stop(); return false; }
    if (!a || !a.ok) return false;
    const mg = masterGain(); if (!mg) return false;
    API.stop(0.5);
    const comp = compile(song), by = {};
    comp.ev.forEach(e => { (by[e[0]] = by[e[0]] || []).push(e); });
    const bus = a.ctx.createGain(); bus.gain.setValueAtTime(0.0001, a.ctx.currentTime); bus.gain.linearRampToValueAtTime(song.gain || 1, a.ctx.currentTime + 0.8); bus.connect(mg);
    Object.assign(P, { song, id, bus, comp, byStep: by, step: 0, next: a.ctx.currentTime + 0.12, offSince: 0 });
    tick(); P.iv = setInterval(tick, 90);
    return true;
  };
  API.current = () => P.id;

  /* ───────── いつ鳴らすか：歩く地図が出ていて、戦闘中でないとき ───────── */
  function desired() {
    const W = root.KY_WORLD, B = root.KY_BATTLE;
    if (document.hidden) return null;
    if (!W || !W.active || !W.active()) return null;
    if (B && B.current) return null;
    if ((SET.bgm | 0) <= 0) return null;
    let st; try { st = W.state(); } catch (e) { return null; }
    return API.pick(st.map, st.world, st.pal);
  }
  API.desired = desired;
  function watch() {
    const want = desired(), t = performance.now();
    if (want) { P.offSince = 0; if (P.id !== want) API.play(want); return; }
    if (!P.id) return;
    // 場所の入れ替え（地図 → 場所）の一瞬では止めない
    const B = root.KY_BATTLE;
    if (document.hidden || (B && B.current)) { API.stop(0.15); return; }
    if (!P.offSince) P.offSince = t;
    else if (t - P.offSince > 900) API.stop(0.8);
  }
  setInterval(watch, 250);
  document.addEventListener('visibilitychange', watch);
})(typeof window !== 'undefined' ? window : globalThis);
