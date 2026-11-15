/* ══════════════════════════════════════════════════════════════════════
   境界事象  歩く地図の BGM（kyokai/music.js・global KY_BGM）
   読み込み順：engine.js → systems.js → battle.js → music.js →（data/maps.js …）

   ■ やること
   ・歩いて回る月代町（KY_WORLD）が出ている間だけ、ゲームボーイの 4 音（パルス 2・波形＝三角・ノイズ）で
     短いループ曲を鳴らす。曲はすべてこのファイルで作ったオリジナル。音声ファイルは使わない。
   ・曲は場所と観測層で変わる：町 town／分室 office／地下・トンネル deep／別の歴史 B showa（ワルツ）／
     崩壊 C empty（まばら）／混ざる世界 X rift（不安なアルペジオ）。KY_BGM.pick(map, world, pal)。
   ・会話の一枚絵（歩く地図が出ていない）では止める（0.6 秒で絞る）。
   ・タイトル title／スタッフロール roll／戦闘 bt_*（KY_BATTLE が KY_BGM.force で頼む）も、この仕組みで鳴らす（2026-11 音の見直し）。
     戦闘曲も設定の「BGM」の音量に従う（前は battle.js が全体の音量へ直に鳴らしていた）。
   ・音量は設定の「BGM」（KY.settings.bgm 0〜100、既定 60）。全体の音量（vol）の下にぶら下がる。
   ・曲ごとの gain は、ラウドネス（K 特性・LUFS 相当）を揃えるために測って決めた値（docs/kyokai/audio-review.md）。
   ・存在安定度が 30 を下回ると、旋律の音程が少し揺れる（観測が不安定）。
   ■ データ：曲 = { bpm, bar（1 小節の歩数）, lead, harm, bass, noise, gain?, once?（1 回で終わるジングル）, echo?（旋律の山びこ・歩数）, vib?（のばした音のビブラート・セント） }。
     noise は h（ハイハット）／s（スネア）／k（キック）／. 休み。
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
      // 前半（もとの 8 小節）＋後半（2026-11 追加：同じ 8 小節が 19 秒ごとに回り続けて単調だったので、F→G→Em と少し明るむ 8 小節を足した）
      bpm: 100, bar: 8, gain: 1.0, vib: 14,
      lead: 'E5 - D5 C5 B4 - C5 - | A4 - - - . . E4 G4 | A4 - B4 C5 D5 - C5 B4 | C5 - - B4 A4 - - - | F5 - E5 D5 C5 - D5 - | E5 - - - . . C5 D5 | E5 - D5 C5 B4 - G#4 - | A4 - - - - - . .' +
        ' | C5 - - - E5 - D5 C5 | D5 - - - . . A4 B4 | B4 - - - G4 - E4 - | A4 - - - . . C5 D5 | F5 - - - E5 D5 C5 - | D5 - B4 - G4 - . . | E5 - - - D5 - C5 - | B4 - - - G#4 - . .',
      bass: () => chordBars('A2m A2m F2M G2M F2M C3M E2M A2m F2M G2M E2m A2m D3m G2M C3M E2M', 8, r => [r, 0, r + 12, 0, r, 0, r + 12, 0]),
      harm: () => chordBars('A3m A3m F3M G3M F3M C4M E3M A3m F3M G3M E3m A3m D3m G3M C4M E3M', 8, (r, t) => [0, t[0] + 12, 0, t[1] + 12, 0, t[2] + 12, 0, t[1] + 12]),
      noise: '. h . h s h . h | . h . h s h . h | . h . h s h . h | . h . h s h . h | . h . h s h . h | . h . h s h . h | . h . h s h . h | . h . h s h h h' +
        ' | . h . h . h . h | . h . h s h . h | . h . h . h . h | . h . h s h . h | . h . h . h . h | . h . h s h . h | . h . h . h . h | . h . h s . s .',
    },
    // 観測センター分室（落ち着いた長調。夜勤の机）
    office: {
      // 後半 8 小節（Am→Em→F…）を 2026-11 に追加
      bpm: 88, bar: 8, gain: 1.0, vib: 10,
      lead: 'C5 - - E5 G5 - - - | F5 - E5 - C5 - - - | E5 - - C5 A4 - B4 C5 | D5 - - - . . . . | C5 - - E5 G5 - A5 - | F5 - - E5 D5 - C5 - | B4 - C5 - D5 - E5 - | C5 - - - . . . .' +
        ' | A4 - - C5 E5 - - - | D5 - C5 - B4 - - - | A4 - - C5 F5 - E5 - | E5 - - - . . . . | D5 - - F5 A5 - - - | G5 - F5 - D5 - B4 - | C5 - - - A4 - - - | B4 - - - D5 - . .',
      bass: () => chordBars('C3M F2M A2m G2M C3M F2M G2M C3M A2m E2m F2M C3M D3m G2M F2M G2M', 8, r => [r, 0, 0, r + 7, r + 12, 0, r + 7, 0]),
      harm: () => chordBars('C4M F3M A3m G3M C4M F3M G3M C4M A3m E3m F3M C4M D4m G3M F3M G3M', 8, (r, t) => [0, t[0], 0, t[1], 0, t[2], 0, t[1]]),
      noise: '. . h . . . h .',
    },
    // 地下・トンネル・旧研究施設（暗い短調。足もとが冷たい）
    deep: {
      bpm: 76, bar: 8, gain: 1.11, echo: 3, vib: 18,
      lead: 'C5 - - - D#5 - D5 - | C5 - - - G4 - - - | G#4 - - - G4 - F4 - | G4 - - - - - . . | C5 - - - D#5 - F5 - | G5 - - - F5 - D#5 - | D5 - - - B4 - - - | C5 - - - - - . .',
      bass: () => chordBars('C3m C3m G#2M G2M C3m D#3M G2M C3m', 8, r => [r, 0, 0, 0, r, 0, 0, 0]),
      harm: () => chordBars('C4m C4m G#3M G3M C4m D#4M G3M C4m', 8, (r, t) => [0, 0, t[1], 0, 0, 0, t[2], 0]),
      noise: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . h . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . h . .',
    },
    // 別の歴史 B（セピア。昭和の町のワルツ）
    showa: {
      // 後半 8 小節（F→C→Dm→A…）を 2026-11 に追加。古いレコードのように、のばす音が少し揺れる（vib）
      bpm: 132, bar: 6, gain: 1.3, vib: 22,
      lead: 'D5 - - - C5 Bb4 | A4 - - - G4 - | A4 - Bb4 - C5 - | D5 - - - - - | F5 - - - D5 - | Bb4 - C5 - D5 - | C#5 - - - A4 - | D5 - - - - -' +
        ' | A4 - - - C5 F5 | E5 - - - D5 C5 | D5 - - - A4 - | C#5 - - - - - | D5 - - - F5 - | C5 - A4 - F4 - | G#4 - - - B4 - | A4 - - - . .',
      bass: () => chordBars('D3m G2m A2M D3m Bb2M G2m A2M D3m F2M C3M D3m A2M Bb2M F2M E2M A2M', 6, r => [r, 0, 0, 0, 0, 0]),
      harm: () => chordBars('D4m G3m A3M D4m Bb3M G3m A3M D4m F3M C4M D4m A3M Bb3M F3M E3M A3M', 6, (r, t) => [0, 0, t[1], 0, t[2], 0]),
      noise: '. . h . h .',
    },
    // 崩壊 C（誰もいない。まばらな音と低い持続音）
    empty: {
      bpm: 66, bar: 8, gain: 0.7, echo: 5, vib: 30,
      lead: 'E5 - - - - - - - | . . . . G5 - - - | F#5 - - - - - . . | . . . . . . . . | B4 - - - - - - - | . . C5 - - - - - | A#4 - - - - - - - | . . . . . . . .',
      bass: 'E2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - - | C2 - - - - - - - | C2 - - - - - - - | E2 - - - - - - - | E2 - - - - - - -',
      harm: '',
      noise: '. . . . . . . . | . . . . . . h . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . h . | . . . . . . . . | . . . . . . . .',
    },
    // 混ざる世界 X（減七の分散和音が回り続ける）
    rift: {
      bpm: 140, bar: 8, gain: 1.0,
      lead: 'B5 - - - - - - - | C6 - - - - - - - | B5 - - - A#5 - - - | A5 - - - - - . .',
      harm: 'E4 G4 A#4 C#5 A#4 G4 E4 G4 | F4 G#4 B4 D5 B4 G#4 F4 G#4 | E4 G4 A#4 C#5 A#4 G4 E4 G4 | D#4 F#4 A4 C5 A4 F#4 D#4 F#4',
      bass: 'E2 . E2 . E2 . E2 . | F2 . F2 . F2 . F2 . | E2 . E2 . E2 . E2 . | D#2 . D#2 . D#2 . D#2 .',
      noise: 'h . h h s . h . | h . h h s . h . | h . h h s . h . | h . h h s h s h',
    },
    // ── ここから 2026-11 追加 ──
    // タイトル（電線のうなりと遠い汽笛の上に、まばらな旋律と山びこ。D の短調で、終わりは解決しない）
    title: {
      bpm: 72, bar: 8, gain: 0.65, echo: 3, vib: 16,
      lead: 'A4 - - - - - . . | . . D5 - E5 - F5 - | E5 - - - - - . . | . . . . C5 - D5 - | A4 - - - - - . . | . . F5 - E5 - D5 - | C#5 - - - - - - - | . . . . . . . .',
      bass: 'D3 - - - - - - - | D3 - - - - - - - | C3 - - - - - - - | C3 - - - - - - - | Bb2 - - - - - - - | Bb2 - - - - - - - | A2 - - - - - - - | A2 - - - - - - -',
      harm: () => chordBars('D4m D4m C4M C4M Bb3M Bb3M A3M A3M', 8, (r, t) => [0, 0, 0, 0, t[1], 0, t[2], 0]),
      noise: '',
    },
    // スタッフロール（観測を終えたあとの、少しだけ明るい F の長調。16 小節）
    roll: {
      bpm: 84, bar: 8, gain: 1.0, echo: 2, vib: 12,
      lead: 'A4 - - - C5 - F5 - | E5 - - - D5 - C5 - | D5 - - - F5 - A5 - | G5 - - - E5 - - - | F5 - - - D5 - Bb4 - | C5 - - - A4 - F4 - | G4 - Bb4 - D5 - C5 Bb4 | C5 - - - - - . .' +
        ' | A4 - - - C5 - F5 - | G5 - - - E5 - C5 - | D5 - - - F5 - A5 - | C6 - - - A5 - E5 - | F5 - - - D5 - Bb4 - | E5 - - - G5 - - - | F5 - - - - - - - | . . . . . . . .',
      bass: () => chordBars('F2M C3M D3m A2m Bb2M F2M G2m C3M F2M C3M D3m A2m Bb2M C3M F2M F2M', 8, r => [r, 0, r + 7, 0, r + 12, 0, r + 7, 0]),
      harm: () => chordBars('F3M C4M D4m A3m Bb3M F3M G3m C4M F3M C4M D4m A3m Bb3M C4M F3M F3M', 8, (r, t) => [0, t[0], t[1], t[2], 0, t[1], t[2], 0]),
      noise: '. . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . h h',
    },
    // 戦闘（境界生物・ふつう）：E の短調、キックとスネアで前へ押す 8 小節（前は 16 歩＝3 秒で回っていた）
    bt_wild: {
      bpm: 160, bar: 8, gain: 0.79,
      lead: 'E5 - B4 - E5 - F#5 G5 | F#5 - E5 - D5 - B4 - | C5 - E5 - G5 - E5 - | F#5 - - - D5 - A4 - | B4 - E5 - G5 - B5 - | A5 - G5 - F#5 - E5 - | G5 - - - E5 - C5 - | D#5 - F#5 - B5 - A5 F#5',
      bass: () => chordBars('E2m E2m C3M D3M E2m E2m C3M B2M', 8, r => [r, r + 12, r, r + 12, r, r + 12, r, r + 12]),
      harm: () => chordBars('E4m E4m C4M D4M E4m E4m C4M B3M', 8, (r, t) => [0, t[1], 0, t[2], 0, t[1], 0, t[2]]),
      noise: 'k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s s s',
    },
    // 戦闘（崩壊 C・混ざる世界 X）：半音でずれていく、不安定な戦い
    bt_wild_c: {
      bpm: 150, bar: 8, gain: 1.0, vib: 24,
      lead: 'E5 - - - - - D#5 E5 | F5 - - - E5 - C5 - | B4 - - - - - A#4 B4 | C5 - - - A4 - F#4 - | E5 - - - G5 - - - | F5 - - - A5 - G#5 - | G5 - - - B5 - D6 - | C6 - - - A5 - F#5 -',
      bass: () => chordBars('E2m F2M E2m D#2d E2m F2M G2M F#2d', 8, r => [r, 0, r, r + 12, r, 0, r + 1, r]),
      harm: () => chordBars('E4m F4M E4m D#4d E4m F4M G4M F#4d', 8, (r, t) => [0, 0, t[2], 0, 0, t[1], 0, 0]),
      noise: 'k . h . s . h h | k . h . s . h . | k . h . s . h h | k . h k s h s h',
    },
    // ボス：16 小節。前半は E フリギアで重く、後半は Am→G→F→E→…→B で上へ追い上げる
    bt_boss: {
      bpm: 172, bar: 8, gain: 0.85,
      lead: 'E5 - - B4 E5 - F5 - | E5 - D5 - B4 - G4 - | A4 - C5 - F5 - E5 F5 | E5 - - - - - . . | G5 - - E5 C5 - E5 - | F#5 - - D5 A4 - D5 - | B4 - E5 - G5 - B5 - | A5 - - - C6 - B5 A5' +
        ' | A5 - - - E5 - - - | C6 - B5 - A5 - E5 - | D5 - - - G5 - B5 - | A5 - - - F5 - C5 - | E5 - G5 - B5 - G5 - | F5 - A5 - C6 - A5 - | G5 - B5 - D6 - B5 - | B5 - - - A5 - F#5 D#5',
      bass: () => chordBars('E2m E2m F2M E2m C3M D3M E2m F2M A2m A2m G2M F2M E2m F2M G2M B2M', 8, r => [r, r, r + 12, r, r, r + 12, r, r + 12]),
      harm: () => chordBars('E4m E4m F4M E4m C4M D4M E4m F4M A3m A3m G3M F3M E4m F4M G4M B3M', 8, (r, t) => [t[0], 0, t[1], 0, t[2], 0, t[1], 0]),
      noise: 'k h s h k k s h | k h s h k s s s',
    },
    // 勝利（1 回だけ）
    bt_win: {
      bpm: 150, bar: 8, gain: 1.0, once: true,
      lead: 'C5 E5 G5 C6 - - G5 C6 | D6 - B5 - C6 - - -',
      bass: 'C3 . G2 . C3 . G2 . | G2 - G2 - C3 - - -',
      harm: 'E4 G4 C5 E5 - - . . | F5 - D5 - E5 - - -',
      noise: 'k . h . k . h . | s . s . k . . .',
    },
    bt_win_boss: {
      bpm: 140, bar: 8, gain: 1.0, once: true,
      lead: 'C5 E5 G5 C6 - - E6 - | D6 - C6 - B5 - G5 - | C6 - - - - - - -',
      bass: 'C3 . E3 . G3 . C3 . | G2 . G2 . G2 . G2 . | C3 - - - - - - -',
      harm: 'E4 G4 C5 E5 - - G5 - | F5 - E5 - D5 - B4 - | E5 - - - - - - -',
      noise: 'k . h . s . h . | k . h . s . s s | k . . . . . . .',
    },
  };
  // 音の種類ごとの音色（GB の 4 音）
  const VOICE = {
    lead: { wave: 0.25, vol: 0.032, gate: 0.9 },
    harm: { wave: 0.125, vol: 0.016, gate: 0.6 },
    bass: { wave: 'tri', vol: 0.075, gate: 0.85 },
    echo: { wave: 0.125, vol: 0.011, gate: 0.7 },   // 旋律の山びこ（GB でよくある、2 つめのパルスで遅らせて弱く鳴らす手）
  };
  // ノイズ（h ハイハット・s スネア・k キック）
  const DRUM = { h: 1, s: 2, k: 3 };
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
    if (song.echo > 0) ev.filter(e => e[1] === 'lead').forEach(([i, , n, len]) => ev.push([(i + song.echo) % steps, 'echo', n, Math.min(len, 2)]));
    if (nz.length) for (let i = 0; i < steps; i++) { const t = nz[i % nz.length]; if (DRUM[t]) ev.push([i, 'noise', DRUM[t], 1]); }
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

  // 戦闘の曲：ふつう／ボス、観測層（崩壊 C・混ざる世界 X では不安定な曲）
  API.battleSong = function (kind, world, pal) {
    if (kind === 'boss') return 'bt_boss';
    if (kind === 'win') return 'bt_win';
    if (kind === 'win_boss') return 'bt_win_boss';
    if (kind === 'wild') return (pal === 'X' || world === 'C') ? 'bt_wild_c' : 'bt_wild';
    return null;
  };

  /* ───────── 音を組む（本番とオフライン書き出しで同じ関数を使う） ───────── */
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const PW = {};
  function pwave(c, duty) {
    const k = duty + '';
    if (PW[k] && PW[k].c === c) return PW[k].w;
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    const w = c.createPeriodicWave(re, im); PW[k] = { c, w }; return w;
  }
  function note(c, kind, n, t, dur, bus, wob, vib) {
    const V = VOICE[kind]; if (!V) return;
    const os = c.createOscillator(), g = c.createGain();
    if (V.wave === 'tri') os.type = 'triangle'; else { try { os.setPeriodicWave(pwave(c, V.wave)); } catch (e) { os.type = 'square'; } }
    os.frequency.setValueAtTime(hz(n), t);
    const d = dur * V.gate;
    if (wob && (kind === 'lead' || kind === 'echo')) { os.detune.setValueAtTime(0, t); os.detune.linearRampToValueAtTime((Math.random() - 0.5) * wob, t + dur); }
    else if (vib && (kind === 'lead' || kind === 'echo') && d > 0.42) {
      // のばした音だけ、少し遅れて段々のビブラート（GB の音源らしく、なめらかでなく 1/24 秒ごとの段）
      os.detune.setValueAtTime(0, t);
      for (let x = t + 0.28, k = 0; x < t + d; x += 1 / 24, k++) os.detune.setValueAtTime(Math.sin(k * Math.PI / 2) * vib, x);
    }
    g.gain.value = 0;   // 鳴り始めより前は 0（既定の 1 のままだと、始まりの一瞬が大きなクリックになる）
    g.gain.setValueAtTime(V.vol, t); g.gain.setValueAtTime(V.vol, t + d * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(bus); os.start(t); os.stop(t + d + 0.03);
  }
  function hit(c, kind, t, bus, noiseBuf) {
    if (!noiseBuf) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    if (kind === 3) {
      // キック：低いノイズ＋三角波の音程が急に下がる
      f.type = 'lowpass'; f.frequency.value = 260;
      const os = c.createOscillator(), og = c.createGain(); os.type = 'triangle';
      os.frequency.setValueAtTime(150, t); os.frequency.exponentialRampToValueAtTime(45, t + 0.09);
      og.gain.value = 0; og.gain.setValueAtTime(0.11, t); og.gain.linearRampToValueAtTime(0.0001, t + 0.11);
      os.connect(og); og.connect(bus); os.start(t); os.stop(t + 0.14);
      g.gain.value = 0; g.gain.setValueAtTime(0.03, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.08);
      return;
    }
    f.type = 'highpass'; f.frequency.value = kind === 2 ? 1800 : 6000;
    const v = kind === 2 ? 0.035 : 0.018, dur = kind === 2 ? 0.09 : 0.03;
    g.gain.value = 0; g.gain.setValueAtTime(v, t); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  // 歩 i の音を時刻 t に置く
  function place(c, comp, song, byStep, i, t, len, bus, noiseBuf, wob) {
    (byStep[i] || []).forEach(([, kind, n, l]) => { if (kind === 'noise') hit(c, n, t, bus, noiseBuf); else note(c, kind, n, t, l * len, bus, wob, song.vib || 0); });
  }
  function byStepOf(comp) { const by = {}; comp.ev.forEach(e => { (by[e[0]] = by[e[0]] || []).push(e); }); return by; }
  // オフライン書き出し（ラウドネスを測る・聞き比べ用の書き出し）：ctx の dest に、曲 id を t0 から sec 秒ぶん並べる。
  // BGM の音量設定（0.75 × bgm/100）と曲の gain も本番と同じにかける。返り値は並べた秒数。
  API.render = function (c, dest, id, sec, noiseBuf, bgm) {
    const song = SONGS[id]; if (!song) return 0;
    const comp = compile(song), by = byStepOf(comp), len = 60 / comp.bpm / 2;
    const bus = c.createGain(); bus.gain.value = (song.gain || 1) * ((bgm == null ? 60 : bgm) / 100) * 0.75; bus.connect(dest);
    let t = 0.05, step = 0;
    const total = song.once ? comp.steps : Infinity;
    while (t < sec && step < total) { place(c, comp, song, by, step % comp.steps, t, len, bus, noiseBuf, 0); t += len; step++; }
    return song.once ? t + 0.3 : sec;
  };
  API.loopSeconds = id => { const s = SONGS[id]; if (!s) return 0; const c = compile(s); return c.steps * 60 / c.bpm / 2; };

  if (!KY || !KY.HAS_DOM) return;
  const SET = KY.settings;
  if (SET.bgm == null) SET.bgm = 60;

  /* ───────── 鳴らす ───────── */
  const AU = () => KY._au;
  const P = { song: null, id: null, bus: null, master: null, iv: 0, next: 0, step: 0, comp: null, byStep: null, want: null, offSince: 0, force: null };
  function masterGain() {
    const a = AU(); if (!a || !a.ok) return null;
    if (!P.master || P.master.context !== a.ctx) { P.master = a.ctx.createGain(); P.master.connect(a.out); }
    P.master.gain.setTargetAtTime(Math.max(0, Math.min(100, SET.bgm | 0)) / 100 * 0.75, a.ctx.currentTime, 0.08);
    return P.master;
  }
  API.setVol = v => { SET.bgm = Math.max(0, Math.min(100, v | 0)); try { KY.saveSettings(); } catch (e) {} masterGain(); };
  function tick() {
    const a = AU(); if (!a || !a.ok || !P.song) return;
    const c = a.ctx, len = 60 / P.comp.bpm / 2;
    const stab = (KY.state && KY.state.stability) | 0;
    const wob = stab < 30 && !/^bt_/.test(P.id) ? (30 - stab) * 3 : 0;
    if (P.next < c.currentTime) P.next = c.currentTime + 0.05;   // 止まっていた（裏に回っていた）ら、今から続ける
    while (P.next < c.currentTime + 0.3) {
      if (P.song.once && P.step >= P.comp.steps) {   // ジングルは 1 回で終わり（余韻はそのまま）
        const id = P.id; if (P.iv) { clearInterval(P.iv); P.iv = 0; }
        const bus = P.bus; setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, 2500);
        P.bus = null; P.song = null; P.id = null; if (P.force === id) P.force = null;
        return;
      }
      place(c, P.comp, P.song, P.byStep, P.step % P.comp.steps, P.next, len, P.bus, a.noise, wob);
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
    const comp = compile(song), by = byStepOf(comp);
    const fadeIn = song.once || /^bt_/.test(id) ? 0.03 : 0.8;   // 戦闘とジングルはすぐ鳴らす
    const bus = a.ctx.createGain(); bus.gain.setValueAtTime(0.0001, a.ctx.currentTime); bus.gain.linearRampToValueAtTime(song.gain || 1, a.ctx.currentTime + fadeIn); bus.connect(mg);
    Object.assign(P, { song, id, bus, comp, byStep: by, step: 0, next: a.ctx.currentTime + 0.12, offSince: 0 });
    tick(); P.iv = setInterval(tick, 90);
    return true;
  };
  API.current = () => P.id;
  // 戦闘など、場所と関係なく鳴らしたい曲（KY_BATTLE が頼む）。null で取り下げ
  API.force = function (id) {
    P.force = id && SONGS[id] ? id : null;
    if (!P.force) { if (P.id && /^bt_/.test(P.id)) API.stop(0.3); return false; }
    if ((SET.bgm | 0) <= 0) return false;
    return API.play(P.force);
  };
  API.forced = () => P.force;

  /* ───────── いつ鳴らすか：歩く地図が出ていて、戦闘中でないとき ───────── */
  function desired() {
    const W = root.KY_WORLD, B = root.KY_BATTLE, D = KY._D || {};
    if (document.hidden) return null;
    if ((SET.bgm | 0) <= 0) return null;
    // 戦闘の曲は、戦闘が続いているあいだだけ（終わったら取り下げる。勝利のジングルは鳴り終わるまで）
    if (P.force && /^bt_/.test(P.force) && !(B && B.current) && !SONGS[P.force].once) P.force = null;
    if (P.force) return P.force;
    if (D.titleOn && D.title && D.title.isConnected) return 'title';
    if (D.rollOn) return 'roll';
    if (!W || !W.active || !W.active()) return null;
    if (B && B.current) return null;
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
    if (document.hidden || (B && B.current) || (SET.bgm | 0) <= 0) { API.stop(0.15); return; }
    if (!P.offSince) P.offSince = t;
    else if (t - P.offSince > 900) API.stop(0.8);
  }
  setInterval(watch, 250);
  document.addEventListener('visibilitychange', watch);
})(typeof window !== 'undefined' ? window : globalThis);
