// tobinezumi/client/sfx.js — 効果音。WebAudio の合成音（いつでも鳴る）と、後から読む CC0 の素材（soundbank.js。読めた物だけ）。
// 危険の予告（！）・急降下・飛びかかり・つかまった・入口をふさぐ。Ver.0.9：拾う・食べる・飲む・掘る・跳ぶ・着地・画面を開く・置く・巣にもぐる/出る・なでる・生まれた・旅 も（SFX_NAMES）。
// 2026-11-14 見直し：
// ・音色を小さな生き物らしく柔らかく（四角波・のこぎり波をやめ、オルゴールのような鈴の音と、こもった物音に）。危険の音もはっきり分かるが怖すぎない大きさ。
// ・音ごとの大きさを測って揃えた（sound-data.js の SFX_TARGET を目標に、sfx-levels.js の測った値から自動で合わせる）。
// ・よく鳴る音は毎回少し高さを変える（繰り返しで疲れない）。素材がある音（SE_MAP）は素材を鳴らし、無い・読めない時は合成音。
// ・大きさは設定（効果音：ふつう／小さく／鳴らさない）に従う。AudioContext は audio-core.js の 1 つを使う。
import { audioCtx, audioRunning, bus, installAudioUnlock, setBusVolume } from './audio-core.js';
import { SFX_TARGET, VARY, SE_MAP } from './sound-data.js';
import { SYNTH_LU } from './sfx-levels.js';

let enabled = true, bank = null;
const lastAt = new Map();

export function initSfx(on = true, vol = 1) { enabled = on !== false; installAudioUnlock(); setBusVolume('sfx', vol); }
export function setSfx(on, vol) { enabled = !!on; if (vol != null) setBusVolume('sfx', vol); }
/** 素材を読む係（soundbank.js）。無ければ合成音だけ */
export function setSfxBank(b) { bank = b; }

/** o = { ctx, dest, p（高さの倍率） } */
function tone(o, t0, { f0 = 440, f1 = f0, dur = 0.12, type = 'sine', vol = 0.06, noise = false, atk = 0.01, q = 2, lp = 0 } = {}) {
  const c = o.ctx, p = o.p || 1, g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let out = g;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.5; g.connect(f); out = f; }
  out.connect(o.dest);
  if (noise) {
    const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f0 * p, t0); bp.frequency.linearRampToValueAtTime(f1 * p, t0 + dur); bp.Q.value = q;
    src.connect(bp); bp.connect(g); src.start(t0); src.stop(t0 + dur);
    return;
  }
  const osc = c.createOscillator(); osc.type = type;
  osc.frequency.setValueAtTime(f0 * p, t0); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * p), t0 + dur);
  osc.connect(g); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
/** オルゴール・小さな鈴のような音（基音＋倍音が早く消える） */
function bell(o, t, f, dur = 0.5, vol = 0.05) {
  tone(o, t, { f0: f, dur, vol, atk: 0.004 });
  tone(o, t, { f0: f * 2, dur: dur * 0.45, vol: vol * 0.3, atk: 0.003 });
  tone(o, t, { f0: f * 3.01, dur: dur * 0.22, vol: vol * 0.12, atk: 0.002 });
}

const SOUNDS = {
  // ── 危険（はっきり分かるが、こわすぎない。四角波をやめて丸い音に）──
  alert: (o, t) => { bell(o, t, 1175, 0.16, 0.06); bell(o, t + 0.11, 1568, 0.22, 0.06); },                          // ぴぴっ（！）
  owl: (o, t) => { tone(o, t, { f0: 380, f1: 320, dur: 0.34, vol: 0.08, atk: 0.06 }); tone(o, t + 0.42, { f0: 360, f1: 290, dur: 0.46, vol: 0.07, atk: 0.07 }); tone(o, t, { f0: 700, f1: 600, dur: 0.3, noise: true, vol: 0.012, q: 1 }); },   // ほう…ほう
  dive: (o, t) => tone(o, t, { f0: 2000, f1: 450, dur: 0.38, noise: true, vol: 0.09, q: 1.4, atk: 0.12 }),          // ひゅうっ（ふくらんで近づく）
  fox: (o, t) => { for (let i = 0; i < 2; i++) { tone(o, t + i * 0.15, { f0: 880, f1: 520, dur: 0.11, type: 'triangle', vol: 0.06, lp: 2200, atk: 0.008 }); tone(o, t + i * 0.15, { f0: 1600, f1: 900, dur: 0.06, noise: true, vol: 0.015 }); } },   // きゃっ きゃっ
  hiss: (o, t) => tone(o, t, { f0: 3400, f1: 2700, dur: 0.4, noise: true, vol: 0.06, q: 1.2, atk: 0.04 }),          // しゅーっ
  caught: (o, t) => { tone(o, t, { f0: 190, f1: 75, dur: 0.24, vol: 0.12, atk: 0.005 }); tone(o, t, { f0: 700, f1: 220, dur: 0.22, noise: true, vol: 0.05, q: 0.9 }); tone(o, t + 0.26, { f0: 880, f1: 620, dur: 0.22, type: 'triangle', vol: 0.03, lp: 2500 }); },   // ぽふっ…きゅう
  safe: (o, t) => { bell(o, t, 784, 0.25, 0.05); bell(o, t + 0.12, 1047, 0.4, 0.05); },                                 // ほっ
  // ── 行事・空 ──
  fest: (o, t) => { bell(o, t, 1047, 0.5, 0.05); bell(o, t + 0.13, 1319, 0.5, 0.045); bell(o, t + 0.26, 1568, 0.8, 0.045); },   // ちりん
  star: (o, t) => tone(o, t, { f0: 2200, f1: 1500, dur: 0.2, vol: 0.02, atk: 0.03 }),                                   // 流れ星（ごく小さく）
  // Ver.0.7：富山の 4:44 ごろ、遠くを通りすぎる長い音（低いうなり・継ぎ目の音・かすかな汽笛のような音）
  train: (o, t) => {
    tone(o, t, { f0: 160, f1: 120, dur: 3.6, noise: true, vol: 0.03, atk: 0.8 });
    for (let i = 0; i < 6; i++) { tone(o, t + 0.4 + i * 0.5, { f0: 900, f1: 700, dur: 0.05, noise: true, vol: 0.02 }); tone(o, t + 0.52 + i * 0.5, { f0: 900, f1: 700, dur: 0.05, noise: true, vol: 0.018 }); }
    tone(o, t + 0.2, { f0: 520, f1: 500, dur: 0.9, vol: 0.014, atk: 0.2 }); tone(o, t + 1.2, { f0: 440, f1: 420, dur: 1.2, vol: 0.012, atk: 0.3 });
  },
  // ── ふだんの動作（小さく短く。環境音・危険の音より目立たない）──
  pick: (o, t) => { tone(o, t, { f0: 620, f1: 1250, dur: 0.07, vol: 0.06, atk: 0.004 }); bell(o, t + 0.04, 1760, 0.12, 0.02); },   // ぽっ
  rare: (o, t) => { [1047, 1319, 1568, 2093].forEach((f, i) => bell(o, t + i * 0.08, f, 0.4, 0.04)); },              // きらり
  eat: (o, t) => { for (let i = 0; i < 3; i++) tone(o, t + i * 0.09, { f0: 2600 - i * 300, f1: 1800, dur: 0.05, noise: true, vol: 0.06, atk: 0.003 }); },   // かりかり
  drink: (o, t) => { tone(o, t, { f0: 420, f1: 820, dur: 0.1, vol: 0.05 }); tone(o, t + 0.13, { f0: 480, f1: 900, dur: 0.09, vol: 0.04 }); },   // こくこく
  dig: (o, t) => { for (let i = 0; i < 3; i++) tone(o, t + i * 0.12, { f0: 420, f1: 180, dur: 0.09, noise: true, vol: 0.1, q: 1.2, atk: 0.006 }); },   // ざっざっ
  jump: (o, t) => tone(o, t, { f0: 330, f1: 760, dur: 0.12, vol: 0.035, atk: 0.015 }),                                 // ぴょん（大ジャンプ）
  land: (o, t) => tone(o, t, { f0: 260, f1: 120, dur: 0.08, noise: true, vol: 0.15, q: 0.7, atk: 0.004 }),              // とっ（着地）
  open: (o, t) => tone(o, t, { f0: 1500, f1: 1700, dur: 0.035, type: 'triangle', vol: 0.025, atk: 0.003 }),          // 画面を開く
  place: (o, t) => { tone(o, t, { f0: 520, f1: 380, dur: 0.06, type: 'triangle', vol: 0.06, atk: 0.003 }); tone(o, t + 0.02, { f0: 900, f1: 500, dur: 0.05, noise: true, vol: 0.03 }); },   // ことっ
  remove: (o, t) => tone(o, t, { f0: 700, f1: 260, dur: 0.12, noise: true, vol: 0.12, q: 1 }),
  burrow: (o, t) => { tone(o, t, { f0: 520, f1: 200, dur: 0.22, vol: 0.05 }); tone(o, t + 0.05, { f0: 500, f1: 250, dur: 0.18, noise: true, vol: 0.035 }); },   // 巣にもぐる
  out: (o, t) => tone(o, t, { f0: 240, f1: 620, dur: 0.2, vol: 0.045, atk: 0.02 }),                                   // 地上へ出る
  pet: (o, t) => { bell(o, t, 1175, 0.18, 0.035); bell(o, t + 0.09, 1397, 0.26, 0.03); tone(o, t + 0.02, { f0: 2400, f1: 3000, dur: 0.06, vol: 0.01 }); },   // なでる（ちいさく きゅっ）
  birth: (o, t) => { [784, 988, 1175, 1568].forEach((f, i) => bell(o, t + i * 0.14, f, 0.6, 0.05)); },               // 生まれた（オルゴール）
  travel: (o, t) => tone(o, t, { f0: 600, f1: 2400, dur: 0.45, noise: true, vol: 0.05, atk: 0.15 }),
  plug: (o, t) => { tone(o, t, { f0: 220, f1: 180, dur: 0.07, type: 'triangle', vol: 0.09, atk: 0.004 }); tone(o, t + 0.08, { f0: 260, f1: 200, dur: 0.07, type: 'triangle', vol: 0.09, atk: 0.004 }); },
};
export const SFX_NAMES = Object.keys(SOUNDS);

/** 合成音の大きさを目標に合わせる倍率（測った値 SYNTH_LU → 目標 SFX_TARGET） */
export function synthGain(name) {
  const lu = SYNTH_LU[name], tg = SFX_TARGET[name];
  return lu == null || tg == null ? 1 : Math.min(40, Math.pow(10, (tg - lu) / 20));
}
/** 素材の大きさを目標に合わせる倍率（測った大きさ lu と、頭打ちしない上限） */
export function fileGain(name, info) {
  const tg = SFX_TARGET[name] ?? -24, lu = info ? info.lu : -16, pk = info ? info.pk : -1;
  return Math.min(Math.pow(10, (tg - lu) / 20), Math.pow(10, (-1 - pk) / 20)) * ((SE_MAP[name] && SE_MAP[name].g) || 1);
}
/** 合成音を ctx・dest に鳴らす（測る道具の OfflineAudioContext からも使う） */
export function renderSynth(ctx, dest, name, t, p = 1) {
  const g = ctx.createGain(); g.gain.value = 1; g.connect(dest);
  SOUNDS[name]({ ctx, dest: g, p }, t);
  return g;
}

/** 鳴らす（同じ音は 0.25 秒あける） */
export function sfx(name) {
  if (!enabled || !audioRunning() || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (lastAt.get(name) || 0) < 250) return;
  lastAt.set(name, now);
  const ctx = audioCtx(), dest = bus('sfx'); if (!dest) return;
  const t = ctx.currentTime + 0.01, v = VARY[name] || 0, p = 1 + (Math.random() * 2 - 1) * v;
  try {
    const f = bank && SE_MAP[name] ? bank.se(name) : null;
    if (f) {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = f.buf; src.playbackRate.value = f.rate * p;
      g.gain.value = fileGain(name, f.info);
      src.connect(g); g.connect(dest); src.start(t);
      lastFile = f.id;
      return;
    }
    const g = renderSynth(ctx, dest, name, t, p); g.gain.value = synthGain(name);
    lastFile = null;
  } catch (e) {}
}
let lastFile = null;
/** 動作確認用：最後に鳴らした素材（合成音なら null） */
export function lastSfxFile() { return lastFile; }
