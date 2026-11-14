// 『境界侵食』の音の素材を変換して置く道具（ffmpeg を使う）。2026-11-13
//   node tools/sound/prepare.mjs <元の素材を置いたフォルダ> [--sample <聞き比べ用の mp3 の出力先>]
// ・元の素材は、素材サイト（効果音ラボ・魔王魂）の各ページから人の手でダウンロードした物（ファイル名はサイトのまま：walk-asphalt1.mp3・maou_bgm_cyber19.mp3 等）。
//   どれを使うかは shinshoku/data/sound.js の MATERIALS（出典・規約は docs/shinshoku/AUDIO_CREDITS.md）。フォルダに無い物は飛ばす（ゲームでは合成音で鳴る）。
// ・変換：モノラル・ラウドネスを揃える（効果音 -18／足音 -20／環境音 -30／曲 -22 LUFS 目安）。
//   効果音：前後の無音を削る・64kbps。足音：一続きの録音から 1 歩ずつの位置（slices）を探す・64kbps。
//   環境音：40 秒までを切り出し、終わりを頭に 2 秒重ねてつなぎ目なしで繰り返せる形に・32kHz 48kbps。曲：3 分 30 秒まで（長い時は終わりを 4 秒で消す）・44.1kHz 48kbps。
// ・出力：shinshoku/assets/sound/<kind>/<キー>.mp3 と、置いた物の表 shinshoku/data/sound_files.js（ゲームはこの表にある物だけ読む）。
// ・元の素材そのもの（加工前）はリポジトリに置かない。--sample の聞き比べもリポジトリの外に出す。
import { readdirSync, existsSync, mkdirSync, statSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATERIALS, fileOf, SE_MAP, BGM_TRACKS } from '../../shinshoku/data/sound.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'shinshoku/assets/sound');
const args = process.argv.slice(2);
const src = args[0]; const sampleAt = args.indexOf('--sample') >= 0 ? args[args.indexOf('--sample') + 1] : null;
if (!src || !existsSync(src)) { console.error('使い方：node tools/sound/prepare.mjs <元の素材のフォルダ> [--sample <出力.mp3>]'); process.exit(1); }

const ff = (a, opt = {}) => { const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 1 << 28, ...opt }); if (r.status !== 0) throw new Error('ffmpeg: ' + String(r.stderr)); return r; };
/** 大きさを揃える：測った大きさ（LUFS）から一定の増減（揺れない・繰り返しのつなぎ目で段がつかない）＋頭打ち */
function gainTo(f, target, pre = '') {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', f, '-af', (pre ? pre + ',' : '') + 'loudnorm=print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = String(r.stderr).match(/"input_i"\s*:\s*"(-?[\d.]+|-inf)"/); const i = m && m[1] !== '-inf' ? parseFloat(m[1]) : target;
  return `volume=${Math.max(-30, Math.min(30, target - i)).toFixed(2)}dB,alimiter=limit=0.89:level=false`;
}
const dur = f => parseFloat(String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout).trim()) || 0;
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

const table = {}; const done = []; const skipped = [];
for (const [id, m] of Object.entries(MATERIALS)) {
  const name = basename(m.path), inF = join(src, name);
  if (!existsSync(inF)) { skipped.push(id + '（' + name + '）'); continue; }
  const rel = fileOf(id), outF = join(OUT, rel); mkdirSync(dirname(outF), { recursive: true });
  if (m.kind === 'se') { const trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'; ff(['-i', inF, '-af', trim + ',' + gainTo(inF, -18, trim), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', outF]); }
  else if (m.kind === 'step') ff(['-i', inF, '-t', '12', '-af', gainTo(inF, -20), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', outF]);
  else if (m.kind === 'amb') {
    const L = Math.min(40, Math.max(6, dur(inF) - 2.5)), X = 2;   // 本体＝[X, L+X]、その終わりに頭の [0, X] を重ねる → 終わりから頭（X の位置）へ切れ目なくつながる
    ff(['-i', inF, '-i', inF, '-filter_complex', `[0:a]atrim=${X}:${L + X},asetpts=PTS-STARTPTS[body];[1:a]atrim=0:${X},asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=${X}:c1=tri:c2=tri,${gainTo(inF, -30)},aresample=32000[o]`, '-map', '[o]', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '48k', outF]);
  } else if (m.kind === 'bgm') {
    const D = dur(inF), T = Math.min(D, 210), fade = D > 210 ? `,afade=t=out:st=${T - 4}:d=4` : '';
    ff(['-i', inF, '-t', String(T), '-af', gainTo(inF, -22) + fade, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', outF]);
  }
  const e = { id, bytes: statSync(outF).size, dur: +dur(outF).toFixed(2) };
  if (m.kind === 'step') e.slices = stepSlices(outF);
  table[rel] = e; done.push(id);
}
// 置いた物の表（キーの順を揃える）
const keys = Object.keys(table).sort();
const body = keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])},`).join('\n');
writeFileSync(join(ROOT, 'shinshoku/data/sound_files.js'),
  `// 自動生成（tools/sound/prepare.mjs）：shinshoku/assets/sound/ に実際に置いた、変換済みの音の素材の表。手で書き換えない。\n` +
  `// キー＝assets/sound/ からの相対パス。id＝data/sound.js の MATERIALS のキー・bytes＝大きさ・dur＝長さ（秒）・slices＝足音の 1 歩ずつ [始め, 長さ]（秒）\n` +
  `export const SOUND_FILES = {\n${body}\n};\n`);
const total = keys.reduce((s, k) => s + table[k].bytes, 0);
const byKind = {}; for (const k of keys) { const kd = k.split('/')[0]; byKind[kd] = (byKind[kd] || 0) + table[k].bytes; }
console.log(`置いた：${done.length} 件・合計 ${(total / 1048576).toFixed(2)}MB`, Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, (v / 1048576).toFixed(2) + 'MB'])));
if (skipped.length) console.log(`元が無く飛ばした：${skipped.length} 件\n  ` + skipped.join('\n  '));

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
