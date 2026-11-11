// 演出の台詞の声を作る（VOICEVOX ENGINE をこの手元で動かして使う。API キーは使わない・エンジン本体はリポジトリに入れない）。
//   1) VOICEVOX ENGINE（Linux CPU 版など）を起動しておく：<展開先>/run --host 127.0.0.1 --port 50021
//   2) node tools/voice/gen.mjs [--engine http://127.0.0.1:50021] [--only cs03_guard] [--force] [--report <tsv>]
// 出力：shinshoku/assets/voice/<場面id>_<行の番号>_<文のハッシュ>_<演技のハッシュ>.mp3 と manifest.json（行 → ファイル・長さ・ハッシュ）。
// 文が変わった行はハッシュが変わるので、作り直すまでゲームでは鳴らない（古い音声を使わない）。使われなくなったファイルは消す。
// 声の割り当て：tools/voice/voices.json。読みの辞書：tools/voice/yomi.json。行ごとの演技：tools/voice/acting.json（付け方は acting.mjs）。
// 要るもの：node 18 以上・ffmpeg（libmp3lame）。ファイル名の最後の 6 桁は演技・声の設定のハッシュ（変えたら別の名前＝古い保存分を使わない）。
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { CUTSCENES } from '../../shinshoku/story/cutscenes.js';
import { duration, voiceWarp } from '../../shinshoku/story/cutscene.js';
import { voiceHash, voiceText, voiceKey } from '../../shinshoku/core/voice.js';
import { punctGroups, specOf, applyActing } from './acting.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..');
const OUT = join(root, 'shinshoku', 'assets', 'voice');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('--engine', 'http://127.0.0.1:50021'), ONLY = arg('--only', null), FORCE = process.argv.includes('--force'), REPORT = arg('--report', null);
const VO = JSON.parse(readFileSync(join(here, 'voices.json'), 'utf8')), YO = JSON.parse(readFileSync(join(here, 'yomi.json'), 'utf8')), AC = JSON.parse(readFileSync(join(here, 'acting.json'), 'utf8'));

// 声の加工（ffmpeg -af）。異形は加工してよい（利用者の決定）。最後に音量をそろえる
const FX = {
  none: '',
  speaker: 'highpass=f=280,lowpass=f=4200,aecho=0.8:0.5:55:0.18',                         // 放送・スピーカー越し
  pa: 'highpass=f=320,lowpass=f=3400,aecho=0.8:0.6:110|230:0.28|0.14',                     // 館内放送（体育館に響く）
  pa_muffled: 'highpass=f=320,lowpass=f=1600,aecho=0.8:0.6:110|230:0.28|0.14',             // シャッターの向こうの放送
  phone: 'highpass=f=380,lowpass=f=3200',                                                  // 電話の声
  muffled: 'lowpass=f=1800,aecho=0.8:0.4:40:0.2',                                          // 戸の向こう
  ghost: 'aecho=0.8:0.7:90|190:0.35|0.22,vibrato=f=4.5:d=0.12',                             // 帰路・当直（ぼやけて響く）
  ghost_light: 'aecho=0.8:0.6:70:0.22,vibrato=f=4:d=0.06',
  monster: 'asetrate=24000*0.84,aresample=24000,atempo=1.19,flanger=delay=3:depth=2:speed=0.3,aecho=0.8:0.6:80|160:0.3|0.18',
  mimic: 'chorus=0.6:0.9:28|41:0.35|0.3:0.25|0.4:2|2.6,aecho=0.8:0.6:120:0.25,vibrato=f=6:d=0.08',   // 真似る声（少しずれて重なる）
};
const MAX_SPEED_ABS = 1.25, PAUSE_FIT = 1;   // 速さの上限（場面に収める時も、これより速くしない）

function yomiOf(s) { for (const [a, b] of YO.replace) s = s.split(a).join(b); return s; }
function readingOf(s) {
  s = yomiOf(s);
  for (const [a, b] of YO.punct) s = s.split(a).join(b);
  s = s.replace(/(^|、)っ(?=[、！!]|$)/g, '$1')                    // 息だけの「っ」は読まない
    .replace(/、{2,}/g, '、').replace(/^[、。！？!?]+/, '').replace(/、+([。！？!?])/g, '$1').replace(/([。！？!?])、+/g, '$1').replace(/、+$/, '');
  return s;
}
async function api(path, body, q) {
  const u = new URL(path, ENGINE); for (const [k, v] of Object.entries(q || {})) u.searchParams.set(k, v);
  const r = await fetch(u, { method: 'POST', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(path + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return path === '/synthesis' ? Buffer.from(await r.arrayBuffer()) : r.json();
}
function ff(args) { const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); }
function probeDur(f) { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]); return +String(r.stdout).trim(); }

const man = { v: 1, engine: VO.engine, fmt: 'mp3', lines: {} };
const old = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : { lines: {} };
mkdirSync(OUT, { recursive: true });
const rep = ['key\twho\tspeed\tdur\tpause\ttext\treading\tkana\tacting\tnote'];
const tmp = join(tmpdir(), 'voicegen-' + process.pid + '.wav');
let made = 0, kept = 0;
// 1 行を作る（演技 A・速さの倍率 sm・間の倍率 pm）。mp3 を書いて、長さ（秒）を返す
async function render(E, sm = 1, pm = 1) {
  const { L, A, P, style, SP, PI, IN, VOL, reading, f } = E;
  const q = await api('/audio_query', null, { text: reading, speaker: style });
  E.aligned = applyActing(q, punctGroups(voiceText(L.who, yomiOf(L.text)).replace(/(^|[、…！!])っ(?=[、…！!]|$)/g, '$1')), Object.assign({}, A, { pause: (A.pause ?? 1) * pm }));   // 間・語尾・句ごとの抑揚
  const speed = +Math.min(MAX_SPEED_ABS, SP * sm).toFixed(3);
  Object.assign(q, { speedScale: speed, pitchScale: PI, intonationScale: IN, volumeScale: 1, outputSamplingRate: 24000, outputStereo: false });
  writeFileSync(tmp, await api('/synthesis', q, { speaker: style }));
  const af = [FX[P.fx || 'none'], 'loudnorm=I=-17:TP=-1.5:LRA=11', VOL !== 1 ? `volume=${(20 * Math.log10(VOL)).toFixed(2)}dB,alimiter=limit=0.95:level=disabled` : '', 'aresample=24000', 'aformat=sample_fmts=s16'].filter(Boolean).join(',');   // 演技の音量（ささやき・叫び）はそろえた後に
  ff(['-i', tmp, '-af', af, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-q:a', '7', join(OUT, f)]);
  E.kana = q.kana || ''; E.speed = speed; E.sm = sm; E.pm = pm;
  return (E.d = +probeDur(join(OUT, f)).toFixed(3));
}
for (const cs of Object.values(CUTSCENES)) {
  const lines = cs.lines || [], ents = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i], say = voiceText(L.who, L.text); if (!say) continue;
    const key = voiceKey(cs.id, i), h = voiceHash(L.who, L.text);
    const base = VO.who[L.who]; if (!base) throw new Error('声の割り当てが無い話し手: ' + L.who + '（' + key + '）');
    const P = Object.assign({}, base, VO.overrides[key] || {});
    const A = specOf(AC.presets, AC.lines[key], P.voice);          // 演技（型＋行の指定）
    if (!AC.lines[key]) console.warn('演技の指定が無い行: ' + key);
    const style = A.styleId ?? ((P.styleByExpr && L.expr && P.styleByExpr[L.expr]) || P.style);
    const SP = +(P.speed * (A.speed ?? 1)).toFixed(3), PI = +((P.pitch || 0) + (A.pitch ?? 0)).toFixed(3), IN = +((P.intonation ?? 1) * (A.intonation ?? 1)).toFixed(3), VOL = A.volume ?? 1;
    const reading = readingOf(say);
    const sig = voiceHash('sig', JSON.stringify([style, SP, PI, IN, VOL, P.fx || 'none', reading, FX[P.fx || 'none'], A, PAUSE_FIT, 3]));   // 声の設定・読み・演技が変わったら作り直す
    const f = `${cs.id}_${String(i).padStart(2, '0')}_${h}_${sig.slice(0, 6)}.mp3`;
    ents.push({ i, L, key, h, P, A, style, SP, PI, IN, VOL, reading, sig, f });
  }
  if (!ents.length) continue;
  const keep = E => old.lines[E.key] && old.lines[E.key].f === E.f && old.lines[E.key].s === E.sig && existsSync(join(OUT, E.f));
  if ((ONLY && cs.id !== ONLY) || (!FORCE && ents.every(keep))) {
    for (const E of ents) if (old.lines[E.key] && existsSync(join(OUT, old.lines[E.key].f))) { man.lines[E.key] = old.lines[E.key]; kept++; }
    continue;
  }
  for (const E of ents) await render(E);
  // 場面に収める：声に合わせて延ばしても（元の +30% まで）次の行に食い込む行は、間を詰めて少し速く読み直す（演技の形は残す）
  for (let round = 0; round < 5; round++) {
    const lens = lines.map((l, i) => { const E = ents.find(e => e.i === i); return E ? E.d : 0; });
    const W = voiceWarp(cs, lens).cs, D1 = duration(W), over = [];
    for (const E of ents) {
      const t = W.lines[E.i].t, nx = W.lines.filter(m => m.t > t + 1e-6).reduce((a, m) => Math.min(a, m.t), D1);
      const room = nx - t - 0.05; if (E.d > room + 0.02) over.push([E, room]);
    }
    if (!over.length) break;
    if (round === 0) { for (const [E, room] of over) await render(E, Math.min(1.15, E.sm * Math.max(1.04, Math.min(1.12, E.d / Math.max(0.4, room)))), Math.max(0.45, E.pm * 0.7)); continue; }
    // まだ食い込む：場面の時間（+30%）を前の行が使い切っている。場面の全部の行の間を詰め、演技で遅くした分を少し戻す
    for (const E of ents) await render(E, Math.min(1.15, Math.max(E.sm * 1.04, E.P.speed / E.SP)), Math.max(0.45, E.pm * 0.8));
  }
  for (const E of ents) {
    man.lines[E.key] = { h: E.h, f: E.f, d: E.d, s: E.sig };
    rep.push([E.key, E.L.who, E.speed, E.d, E.pm.toFixed(2), E.L.text, E.reading, E.kana, (AC.lines[E.key] || {}).a || '', E.aligned ? '' : '間の対応なし'].join('\t'));
    made++;
  }
  console.log(`${cs.id}：${ents.length} 行`);
}
if (ONLY) for (const [k, v] of Object.entries(old.lines)) if (!man.lines[k] && !k.startsWith(ONLY + '#')) man.lines[k] = v;
// 使われなくなった音声を消す
const used = new Set(Object.values(man.lines).map(e => e.f));
for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) unlinkSync(join(OUT, f));
man.lines = Object.fromEntries(Object.entries(man.lines).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(man, null, 0).replace(/\},"/g, '},\n"') + '\n');
if (REPORT) writeFileSync(REPORT, rep.join('\n') + '\n');
let bytes = 0; for (const e of Object.values(man.lines)) bytes += statSync(join(OUT, e.f)).size;
console.log(`\n作った ${made}・そのまま ${kept}・合計 ${Object.keys(man.lines).length} 行・${(bytes / 1048576).toFixed(2)}MB`);
