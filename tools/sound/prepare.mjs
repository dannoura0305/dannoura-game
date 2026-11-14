// 『境界侵食』の音の素材を変換して置く道具（ffmpeg を使う）。2026-11-14（CC0 の素材に合わせて作り直し）
//   node tools/sound/prepare.mjs <元の素材のフォルダ> [--sample <聞き比べ用の mp3 の出力先>] [--tmp <作業用フォルダ>]
// ・<元の素材のフォルダ>/<パックのキー>/ に、各素材ページ（shinshoku/data/sound.js の PACKS・docs/shinshoku/AUDIO_CREDITS.md）から
//   ダウンロードした物を置く（zip は展開して、展開した中身はそのまま／x/ の下でもよい）。展開した中のスクリプト等は実行しない（この道具は音のファイルを ffmpeg で読むだけ）。
//   どれを使うかは shinshoku/data/sound.js の MATERIALS（pack・files・cut・fx・gap・loop・seamless）。フォルダに無い物は飛ばす（ゲームでは合成音で鳴る）。
// ・変換：モノラル・大きさを揃える。
//   効果音・足音：一瞬の大きさ（400ms の窓の最大＝Mmax）で揃える（効果音 -16／足音 1 歩 -20 LUFS）。前後の無音を削る・切り口に短いフェード・64kbps。
//   足音：1 歩ずつの録音を間（gap）をあけて 1 本に並べ、1 歩ずつの位置（slices）を探す。
//   環境音：平均の大きさ（integrated）-30 LUFS。40 秒までを切り出し、終わりを頭に 2 秒重ねてつなぎ目なしで繰り返せる形に（元からつなぎ目なしの物 seamless はそのまま）・32kHz 48kbps。
//   曲：平均 -22 LUFS。3 分 30 秒まで（長い時は終わりを 4 秒で消す）。繰り返す曲（loop）は終わりを頭に 3 秒重ねる・44.1kHz 48kbps。
// ・出力：shinshoku/assets/sound/<kind>/<キー>.mp3 と、置いた物の表 shinshoku/data/sound_files.js（ゲームはこの表にある物だけ読む）。
//   表には長さ（dur）と、変換後に測った大きさ（lu：効果音・足音は Mmax、環境音・曲は平均）・最大値（pk dBFS）を書く。
// ・元の素材そのもの（加工前）はリポジトリに置かない。--sample の聞き比べもリポジトリの外に出す。
import { existsSync, mkdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { MATERIALS, PACKS, fileOf, SE_MAP, BGM_TRACKS } from '../../shinshoku/data/sound.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'shinshoku/assets/sound');
const args = process.argv.slice(2);
const opt = k => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const src = args[0]; const sampleAt = opt('--sample');
if (!src || !existsSync(src)) { console.error('使い方：node tools/sound/prepare.mjs <元の素材のフォルダ> [--sample <出力.mp3>] [--tmp <作業用フォルダ>]'); process.exit(1); }
const TMP = mkdtempSync(join(opt('--tmp') || tmpdir(), 'shsnd-'));

const ff = (a, o = {}) => { const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 1 << 28, ...o }); if (r.status !== 0) throw new Error('ffmpeg: ' + String(r.stderr)); return r; };
const dur = f => parseFloat(String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout).trim()) || 0;
/** 大きさを測る：{ i（平均 LUFS）, mmax（400ms の窓の最大 LUFS）, pk（最大 dBFS） }。短い音は後ろに無音を足して測る */
function measure(f) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', f, '-af', 'apad=pad_dur=0.5,ebur128=framelog=info:peak=sample', '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const e = String(r.stderr), ms = [...e.matchAll(/\bM:\s*(-?[\d.]+)/g)].map(m => parseFloat(m[1])).filter(x => x > -120);
  const i = [...e.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].map(m => parseFloat(m[1])).pop();
  const pk = [...e.matchAll(/Peak:\s+(-?[\d.]+|-inf) dBFS/g)].map(m => parseFloat(m[1])).pop();
  return { i: i ?? -70, mmax: ms.length ? Math.max(...ms) : -70, pk: Number.isFinite(pk) ? pk : -90 };
}
/** 目標の大きさにする増減（一定の増減＋頭打ち）。by＝'i'|'mmax' */
function gainTo(f, target, by) {
  const m = measure(f), now = m[by] > -69 ? m[by] : target;
  // 短く鋭い音（打撃・素振り）は一瞬の大きさが低く出るので、上げ幅は「最大値の余裕＋3dB」まで（頭打ちで潰しすぎない）
  const g = Math.max(-30, Math.min(30, target - now, by === 'mmax' ? -1 - m.pk + 3 : 30));
  return `volume=${g.toFixed(2)}dB,alimiter=limit=${by === 'i' ? 0.89 : 0.79}:level=false`;
}
/** パックの中のファイルを探す（そのまま・x/ の下・%20 などを戻した名前） */
function findFile(pack, rel) {
  for (const base of [join(src, pack), join(src, pack, 'x')]) for (const r of [rel, decodeURIComponent(rel)]) { const f = join(base, r); if (existsSync(f)) return f; }
  return null;
}
/** 素材の元を 1 本の作業ファイル（wav・モノラル）にする：複数なら間をあけて並べる（gap 0 は 1 秒重ねる）・cut・fx */
function gather(id, m) {
  const fs = m.files.map(r => findFile(m.pack, r)); if (fs.some(f => !f)) return null;
  const out = join(TMP, id + '.wav'), sr = m.kind === 'amb' ? 32000 : 44100, gap = m.gap ?? 0.4;
  const pre = `aresample=${sr},aformat=channel_layouts=mono:sample_fmts=fltp`;
  let fc;
  if (fs.length === 1) fc = `[0:a]${pre}[o0]`;
  else if (gap === 0) fc = fs.map((_, i) => `[${i}:a]${pre}[p${i}]`).join(';') + ';' + fs.slice(1).reduce((acc, _, i) => acc + `${i ? `[x${i - 1}]` : '[p0]'}[p${i + 1}]acrossfade=d=1:c1=tri:c2=tri[x${i}];`, '').replace(/;$/, '').replace(new RegExp(`\\[x${fs.length - 2}\\]$`), '[o0]');
  else fc = fs.map((_, i) => `[${i}:a]${pre},apad=pad_dur=${gap}[p${i}]`).join(';') + ';' + fs.map((_, i) => `[p${i}]`).join('') + `concat=n=${fs.length}:v=0:a=1[o0]`;
  const post = [m.cut ? `atrim=${m.cut[0]}:${m.cut[0] + m.cut[1]},asetpts=PTS-STARTPTS` : '', m.cut && m.kind === 'se' ? `afade=t=in:d=0.005,afade=t=out:st=${Math.max(0, m.cut[1] - 0.25)}:d=0.25` : '', m.fx || ''].filter(Boolean).join(',');
  ff([...fs.flatMap(f => ['-i', f]), '-filter_complex', fc + (post ? `;[o0]${post}[o]` : ';[o0]anull[o]'), '-map', '[o]', '-ac', '1', '-ar', String(sr), '-c:a', 'pcm_f32le', out]);
  return out;
}
/** 足音：1 歩ずつの始まりを探す（短い区間の大きさの立ち上がり）→ [始め, 長さ] */
function stepSlices(f) {
  const r = ff(['-i', f, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-'], { encoding: 'buffer' });
  const a = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength >> 2), sr = 22050, hop = 220;
  const env = []; for (let i = 0; i + hop <= a.length; i += hop) { let s = 0; for (let j = 0; j < hop; j++) s += a[i + j] * a[i + j]; env.push(Math.sqrt(s / hop)); }
  const peak = Math.max(...env), th = peak * 0.25, on = [];
  for (let i = 1; i < env.length; i++) if (env[i] > th && env[i - 1] <= th && (!on.length || (i - on[on.length - 1]) * hop / sr > 0.22)) on.push(i);
  const sl = [];
  for (let k = 0; k < on.length; k++) {
    const s0 = Math.max(0, on[k] * hop / sr - 0.02), next = k + 1 < on.length ? on[k + 1] * hop / sr - 0.03 : a.length / sr;
    const d = Math.min(0.45, next - s0); if (d > 0.12) sl.push([+s0.toFixed(3), +d.toFixed(3)]);
  }
  return sl.slice(0, 12);
}
/** つなぎ目なしで繰り返せる形：本体＝[X, L+X]、その終わりに頭の [0, X] を重ねる → 終わりから頭（X の位置）へ切れ目なくつながる */
const loopFc = (L, X, tail) => `[0:a]atrim=${X}:${L + X},asetpts=PTS-STARTPTS[body];[1:a]atrim=0:${X},asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=${X}:c1=tri:c2=tri,${tail}[o]`;

const table = {}; const done = []; const skipped = [];
for (const [id, m] of Object.entries(MATERIALS)) {
  const inF = gather(id, m);
  if (!inF) { skipped.push(id + '（' + m.pack + '：' + m.files.join('・') + '）'); continue; }
  const rel = fileOf(id), outF = join(OUT, rel); mkdirSync(dirname(outF), { recursive: true });
  if (m.kind === 'se') {
    const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse,afade=t=out:st=0:d=0.001';
    const t1 = join(TMP, id + '.t.wav'); ff(['-i', inF, '-af', trim.replace(',afade=t=out:st=0:d=0.001', ''), '-c:a', 'pcm_f32le', t1]);
    const D = dur(t1), fade = D > 0.2 ? `,afade=t=out:st=${(D - 0.04).toFixed(3)}:d=0.04` : '';
    ff(['-i', t1, '-af', gainTo(t1, -16, 'mmax') + fade, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', outF]);
  } else if (m.kind === 'step') {
    const sl = stepSlices(inF), D = dur(inF); let worst = -70;   // 1 歩ずつの大きさ（Mmax）の中央で揃える
    const each = sl.map(([s, d]) => { const t = join(TMP, id + '.s.wav'); ff(['-i', inF, '-af', `atrim=${s}:${s + d}`, '-c:a', 'pcm_f32le', t]); return measure(t).mmax; }).sort((a, b) => a - b);
    worst = each.length ? each[each.length >> 1] : measure(inF).mmax;
    ff(['-i', inF, '-t', String(Math.min(12, D)), '-af', `volume=${Math.max(-30, Math.min(30, -20 - worst, -1 - measure(inF).pk + 3)).toFixed(2)}dB,alimiter=limit=0.79:level=false`, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', outF]);
  } else if (m.kind === 'amb') {
    const g = gainTo(inF, -30, 'i');
    if (m.seamless) ff(['-i', inF, '-af', g, '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '48k', outF]);
    else { const L = Math.min(40, Math.max(4, dur(inF) - 2.5)), X = 2; ff(['-i', inF, '-i', inF, '-filter_complex', loopFc(L, X, g + ',aresample=32000'), '-map', '[o]', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '48k', outF]); }
  } else if (m.kind === 'bgm') {
    const D = dur(inF), g = gainTo(inF, -22, 'i');
    if (m.loop && !m.seamless) { const X = 3, L = Math.min(210, D) - X; ff(['-i', inF, '-i', inF, '-filter_complex', loopFc(L, X, g), '-map', '[o]', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', outF]); }
    else { const T = Math.min(D, 210), fade = D > 210 ? `,afade=t=out:st=${T - 4}:d=4` : ''; ff(['-i', inF, '-t', String(T), '-af', g + fade, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', outF]); }
  }
  const ms = measure(outF), e = { id, bytes: statSync(outF).size, dur: +dur(outF).toFixed(2), lu: +(m.kind === 'se' || m.kind === 'step' ? ms.mmax : ms.i).toFixed(1), pk: +ms.pk.toFixed(1) };
  if (m.kind === 'step') e.slices = stepSlices(outF);
  table[rel] = e; done.push(id);
}
rmSync(TMP, { recursive: true, force: true });
// 置いた物の表（キーの順を揃える）
const keys = Object.keys(table).sort();
const body = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])},`).join('\n');
writeFileSync(join(ROOT, 'shinshoku/data/sound_files.js'),
  `// 自動生成（tools/sound/prepare.mjs）：shinshoku/assets/sound/ に実際に置いた、変換済みの音の素材の表。手で書き換えない。\n` +
  `// キー＝assets/sound/ からの相対パス。id＝data/sound.js の MATERIALS のキー・bytes＝大きさ・dur＝長さ（秒）・slices＝足音の 1 歩ずつ [始め, 長さ]（秒）\n` +
  `// lu＝変換後に測った大きさ（LUFS：効果音・足音は 400ms の窓の最大、環境音・曲は平均）・pk＝最大値（dBFS）\n` +
  `export const SOUND_FILES = {\n${body}\n};\n`);
const total = keys.reduce((s, k) => s + table[k].bytes, 0);
const byKind = {}; for (const k of keys) { const kd = k.split('/')[0]; byKind[kd] = (byKind[kd] || 0) + table[k].bytes; }
console.log(`置いた：${done.length} 件・合計 ${(total / 1048576).toFixed(2)}MB`, Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, (v / 1048576).toFixed(2) + 'MB'])));
if (skipped.length) console.log(`元が無く飛ばした：${skipped.length} 件\n  ` + skipped.join('\n  '));
void PACKS;

// 聞き比べ用（主な効果音を 1 秒の間をあけて並べ、続けて各曲の冒頭 20 秒）。リポジトリの外に出す
if (sampleAt) {
  if (resolve(sampleAt).startsWith(ROOT + '/')) { console.error('聞き比べの mp3 はリポジトリの外に出してください'); process.exit(1); }
  const main = ['swing', 'hit', 'hit_heavy', 'parry', 'tel_parry', 'tel_red', 'issen', 'hurt', 'door', 'knock', 'slam', 'heartbeat', 'boss_rise', 'mimic_reveal', 'kiro_voice', 'mimic_voice', 'tsugi_voice', 'giant_roar', 'p_creak', 'p_breath', 'p_drag', 'p_iron_knock'];
  const parts = [];
  for (const k of ['step_asphalt', 'step_wet', 'step_tile', 'step_gym']) if (table[fileOf(k)]) parts.push({ f: join(OUT, fileOf(k)), t: 3 });
  for (const n of main) { const id = (SE_MAP[n] || { m: [] }).m.find(i => table[fileOf(i)]); if (id) parts.push({ f: join(OUT, fileOf(id)), t: 4 }); }
  for (const id of ['amb_rain', 'amb_wind', 'amb_sewer', 'amb_room']) if (table[fileOf(id)]) parts.push({ f: join(OUT, fileOf(id)), t: 6 });
  for (const id of Object.values(BGM_TRACKS)) if (table[fileOf(id)]) parts.push({ f: join(OUT, fileOf(id)), t: 20 });
  if (!parts.length) { console.log('聞き比べ：素材が無いので作らない'); process.exit(0); }
  const inputs = parts.flatMap(p => ['-t', String(p.t), '-i', p.f]);
  const fc = parts.map((p, i) => `[${i}:a]aresample=44100,apad=whole_dur=${p.t + 1}[p${i}]`).join(';') + ';' + parts.map((_, i) => `[p${i}]`).join('') + `concat=n=${parts.length}:v=0:a=1[o]`;
  ff([...inputs, '-filter_complex', fc, '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', sampleAt]);
  console.log('聞き比べ：', sampleAt, (statSync(sampleAt).size / 1048576).toFixed(2) + 'MB');
}
