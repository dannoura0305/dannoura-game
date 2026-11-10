// 演出の台詞の声を作る（VOICEVOX ENGINE をこの手元で動かして使う。API キーは使わない・エンジン本体はリポジトリに入れない）。
//   1) VOICEVOX ENGINE（Linux CPU 版など）を起動しておく：<展開先>/run --host 127.0.0.1 --port 50021
//   2) node tools/voice/gen.mjs [--engine http://127.0.0.1:50021] [--only cs03_guard] [--force] [--report <tsv>]
// 出力：shinshoku/assets/voice/<場面id>_<行の番号>_<ハッシュ>.mp3 と manifest.json（行 → ファイル・長さ・ハッシュ）。
// 文が変わった行はハッシュが変わるので、作り直すまでゲームでは鳴らない（古い音声を使わない）。使われなくなったファイルは消す。
// 声の割り当て：tools/voice/voices.json。読みの辞書：tools/voice/yomi.json。要るもの：node 18 以上・ffmpeg（libmp3lame）。
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { CUTSCENES } from '../../shinshoku/story/cutscenes.js';
import { duration } from '../../shinshoku/story/cutscene.js';
import { voiceHash, voiceText, voiceKey } from '../../shinshoku/core/voice.js';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..', '..');
const OUT = join(root, 'shinshoku', 'assets', 'voice');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('--engine', 'http://127.0.0.1:50021'), ONLY = arg('--only', null), FORCE = process.argv.includes('--force'), REPORT = arg('--report', null);
const VO = JSON.parse(readFileSync(join(here, 'voices.json'), 'utf8')), YO = JSON.parse(readFileSync(join(here, 'yomi.json'), 'utf8'));

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
const PAD = 0.25, MAX_SPEED = 1.15;   // 速める上限（元の速さの 1.15 倍まで・それでも 1.15 を超えない）

function readingOf(s) {
  for (const [a, b] of YO.replace) s = s.split(a).join(b);
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
const rep = ['key\twho\tspeed\tdur\tslot\ttext\treading\tkana'];
const tmp = join(tmpdir(), 'voicegen-' + process.pid + '.wav');
let made = 0, kept = 0;
for (const cs of Object.values(CUTSCENES)) {
  const D = duration(cs), lines = cs.lines || [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i], say = voiceText(L.who, L.text); if (!say) continue;
    const key = voiceKey(cs.id, i), h = voiceHash(L.who, L.text);
    const base = VO.who[L.who]; if (!base) throw new Error('声の割り当てが無い話し手: ' + L.who + '（' + key + '）');
    const P = Object.assign({}, base, VO.overrides[key] || {});
    const style = (P.styleByExpr && L.expr && P.styleByExpr[L.expr]) || P.style;
    const f = `${cs.id}_${String(i).padStart(2, '0')}_${h}.mp3`;
    const sig = voiceHash('sig', JSON.stringify([style, P.speed, P.pitch, P.intonation, P.fx || 'none', readingOf(say), FX[P.fx || 'none']]));   // 声の設定・読みが変わったら作り直す
    if (ONLY && cs.id !== ONLY || (!FORCE && old.lines[key] && old.lines[key].f === f && old.lines[key].s === sig && existsSync(join(OUT, f)))) {
      if (old.lines[key] && old.lines[key].f === f && existsSync(join(OUT, f))) { man.lines[key] = old.lines[key]; kept++; }
      continue;
    }
    // 次の行までの間（最後の行は場面の終わりまで）。入りきらない時は少しだけ速く読む（それでも長い分は、ゲームが場面の時間を延ばす）
    const nextT = lines.filter(m => m.t > L.t + 1e-6).reduce((a, m) => Math.min(a, m.t), Infinity);
    const slot = (isFinite(nextT) ? nextT : Math.max(D, L.t + (L.dur ?? 2.6))) - L.t - PAD;
    const reading = readingOf(say);
    const q = await api('/audio_query', null, { text: reading, speaker: style });
    let speed = P.speed;
    const synth = async (sp) => {
      Object.assign(q, { speedScale: sp, pitchScale: P.pitch || 0, intonationScale: P.intonation ?? 1, volumeScale: 1, prePhonemeLength: 0.05, postPhonemeLength: 0.12, outputSamplingRate: 24000, outputStereo: false });
      writeFileSync(tmp, await api('/synthesis', q, { speaker: style }));
      return probeDur(tmp);
    };
    let d = await synth(speed);
    const cap = Math.min(MAX_SPEED, P.speed * 1.15);
    if (d > slot && speed < cap) { speed = Math.min(cap, +(speed * d / Math.max(0.3, slot)).toFixed(3)); d = await synth(speed); }
    const af = [FX[P.fx || 'none'], 'loudnorm=I=-17:TP=-1.5:LRA=11', 'aresample=24000', 'aformat=sample_fmts=s16'].filter(Boolean).join(',');
    ff(['-i', tmp, '-af', af, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-q:a', '7', join(OUT, f)]);
    const dur = +probeDur(join(OUT, f)).toFixed(3);
    man.lines[key] = { h, f, d: dur, s: sig };
    rep.push([key, L.who, speed, dur, slot.toFixed(2), L.text, reading, q.kana || ''].join('\t'));
    made++; if (made % 25 === 0) console.log(made + ' 行…');
  }
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
