// トビネズミの音の素材を変換して置く道具（ffmpeg を使う）。2026-11-14
//   node tobinezumi/tools/sound_prepare.mjs <元の素材のフォルダ> [--sample <聞き比べ用の mp3 の出力先>]
// ・<元の素材のフォルダ>/<パックのキー>/ に、各素材ページ（client/sound-data.js の PACKS・docs/AUDIO_CREDITS.md）から
//   ダウンロードした物を置く（zip は <パックのキー>/x/ に展開。展開した中のスクリプト等は実行しない。この道具は音のファイルを ffmpeg で読むだけ）。
// ・変換：モノラル・大きさを揃える。
//   効果音：一瞬の大きさ（400ms の窓の最大）-16 LUFS（短く鋭い音は「最大値の余裕＋3dB」まで）。前後の無音を削り、終わりに短いフェード。44.1kHz 64kbps。
//   環境音：平均 -30 LUFS。終わりを頭に 2 秒重ねてつなぎ目なしの形に（seamless の物はそのまま）。32kHz 48kbps。
//   曲：平均 -22 LUFS。150 秒まで（長い曲は終わりを 4 秒で消す）。44.1kHz 48kbps。
// ・出力：tobinezumi/assets/sound/<kind>/<キー>.mp3 と、置いた物の表 tobinezumi/client/sound-files.js（ゲームはこの表にある物だけ読む）。
// ・元の素材と聞き比べの mp3 はリポジトリに置かない。
import { existsSync, mkdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { MATERIALS, fileOf } from '../client/sound-data.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'tobinezumi/assets/sound');
const args = process.argv.slice(2);
const opt = k => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
const src = args[0], sampleAt = opt('--sample');
if (!src || !existsSync(src)) { console.error('使い方：node tobinezumi/tools/sound_prepare.mjs <元の素材のフォルダ> [--sample <出力.mp3>]'); process.exit(1); }
const TMP = mkdtempSync(join(opt('--tmp') || tmpdir(), 'tbsnd-'));

const ff = a => { const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...a], { maxBuffer: 1 << 28 }); if (r.status !== 0) throw new Error('ffmpeg: ' + String(r.stderr)); return r; };
const dur = f => parseFloat(String(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout).trim()) || 0;
/** 大きさ：{ i（平均 LUFS）, mmax（400ms の窓の最大）, pk（最大 dBFS） }。短い音は後ろに無音を足して測る */
function measure(f) {
  const r = spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-i', f, '-af', 'apad=pad_dur=0.5,ebur128=framelog=info:peak=sample', '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const e = String(r.stderr), ms = [...e.matchAll(/\bM:\s*(-?[\d.]+)/g)].map(m => parseFloat(m[1])).filter(x => x > -120);
  const i = [...e.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].map(m => parseFloat(m[1])).pop();
  const pk = [...e.matchAll(/Peak:\s+(-?[\d.]+|-inf) dBFS/g)].map(m => parseFloat(m[1])).pop();
  return { i: i ?? -70, mmax: ms.length ? Math.max(...ms) : -70, pk: Number.isFinite(pk) ? pk : -90 };
}
function gainTo(f, target, by) {
  const m = measure(f), now = m[by] > -69 ? m[by] : target;
  const g = Math.max(-30, Math.min(30, target - now, by === 'mmax' ? -1 - m.pk + 3 : 30));
  return `volume=${g.toFixed(2)}dB,alimiter=limit=${by === 'i' ? 0.89 : 0.79}:level=false`;
}
function findFile(pack, rel) {
  for (const r of [rel, decodeURIComponent(rel)]) { const f = join(src, pack, r); if (existsSync(f)) return f; }
  return null;
}
function gather(id, m) {
  const fs = m.files.map(r => findFile(m.pack, r)); if (fs.some(f => !f)) return null;
  const out = join(TMP, id + '.wav'), sr = m.kind === 'amb' ? 32000 : 44100, gap = m.gap ?? 0.4;
  const pre = `aresample=${sr},aformat=channel_layouts=mono:sample_fmts=fltp`;
  let fc;
  if (fs.length === 1) fc = `[0:a]${pre}[o0]`;
  else if (gap === 0) fc = fs.map((_, i) => `[${i}:a]${pre}[p${i}]`).join(';') + ';' + fs.slice(1).map((_, i) => `${i ? `[x${i - 1}]` : '[p0]'}[p${i + 1}]acrossfade=d=1:c1=tri:c2=tri${i === fs.length - 2 ? '[o0]' : `[x${i}]`}`).join(';');
  else fc = fs.map((_, i) => `[${i}:a]${pre},apad=pad_dur=${gap}[p${i}]`).join(';') + ';' + fs.map((_, i) => `[p${i}]`).join('') + `concat=n=${fs.length}:v=0:a=1[o0]`;
  const post = [m.cut ? `atrim=${m.cut[0]}:${m.cut[0] + m.cut[1]},asetpts=PTS-STARTPTS` : '', m.cut && m.kind === 'se' ? `afade=t=in:d=0.004,afade=t=out:st=${Math.max(0, m.cut[1] - 0.12)}:d=0.12` : '', m.fx || ''].filter(Boolean).join(',');
  ff([...fs.flatMap(f => ['-i', f]), '-filter_complex', fc + (post ? `;[o0]${post}[o]` : ';[o0]anull[o]'), '-map', '[o]', '-ac', '1', '-ar', String(sr), '-c:a', 'pcm_f32le', out]);
  return out;
}
const loopFc = (L, X, tail) => `[0:a]atrim=${X}:${L + X},asetpts=PTS-STARTPTS[body];[1:a]atrim=0:${X},asetpts=PTS-STARTPTS[head];[body][head]acrossfade=d=${X}:c1=tri:c2=tri,${tail}[o]`;

const table = {}, done = [], skipped = [];
for (const [id, m] of Object.entries(MATERIALS)) {
  const inF = gather(id, m);
  if (!inF) { skipped.push(`${id}（${m.pack}：${m.files.join('・')}）`); continue; }
  const rel = fileOf(id), outF = join(OUT, rel); mkdirSync(dirname(outF), { recursive: true });
  if (m.kind === 'se') {
    const t1 = join(TMP, id + '.t.wav');
    ff(['-i', inF, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse', '-c:a', 'pcm_f32le', t1]);
    const D = dur(t1), fade = D > 0.2 ? `,afade=t=out:st=${(D - 0.04).toFixed(3)}:d=0.04` : '';
    ff(['-i', t1, '-af', gainTo(t1, -16, 'mmax') + fade, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', outF]);
  } else if (m.kind === 'amb') {
    const g = gainTo(inF, -30, 'i');
    if (m.seamless) ff(['-i', inF, '-af', g, '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '48k', outF]);
    else { const L = Math.min(40, Math.max(4, dur(inF) - 2.5)), X = 2; ff(['-i', inF, '-i', inF, '-filter_complex', loopFc(L, X, g + ',aresample=32000'), '-map', '[o]', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '48k', outF]); }
  } else if (m.kind === 'bgm') {
    const D = dur(inF), g = gainTo(inF, -22, 'i'), T = Math.min(D, 150), fade = D > 150 ? `,afade=t=out:st=${T - 4}:d=4` : '';
    ff(['-i', inF, '-t', String(T), '-af', g + fade, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', outF]);
  }
  const ms = measure(outF);
  table[rel] = { id, bytes: statSync(outF).size, dur: +dur(outF).toFixed(2), lu: +(m.kind === 'se' ? ms.mmax : ms.i).toFixed(1), pk: +ms.pk.toFixed(1) };
  done.push(id);
}
rmSync(TMP, { recursive: true, force: true });
const keys = Object.keys(table).sort();
writeFileSync(join(ROOT, 'tobinezumi/client/sound-files.js'),
  `// 自動生成（tobinezumi/tools/sound_prepare.mjs）：tobinezumi/assets/sound/ に置いた、変換済みの音の素材の表。手で書き換えない。\n` +
  `// キー＝assets/sound/ からの相対パス。id＝sound-data.js の MATERIALS のキー・bytes＝大きさ・dur＝長さ（秒）\n` +
  `// lu＝変換後に測った大きさ（LUFS：効果音は 400ms の窓の最大、環境音・曲は平均）・pk＝最大値（dBFS）\n` +
  `export const SOUND_FILES = {\n${keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])},`).join('\n')}\n};\n`);
const total = keys.reduce((s, k) => s + table[k].bytes, 0), byKind = {};
for (const k of keys) { const kd = k.split('/')[0]; byKind[kd] = (byKind[kd] || 0) + table[k].bytes; }
console.log(`置いた：${done.length} 件・合計 ${(total / 1048576).toFixed(2)}MB`, Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, (v / 1048576).toFixed(2) + 'MB'])));
for (const k of keys) console.log(`  ${k.padEnd(26)} ${String(table[k].dur).padStart(7)} 秒 ${String(table[k].lu).padStart(6)} LUFS ${String(table[k].pk).padStart(6)} dBFS ${(table[k].bytes / 1024).toFixed(0).padStart(5)}KB`);
if (skipped.length) console.log(`元が無く飛ばした：${skipped.length} 件\n  ` + skipped.join('\n  '));

// 聞き比べ用：効果音を 1 秒あけて並べ、環境音 6 秒ずつ、曲の冒頭 20 秒ずつ（リポジトリの外に出す）
if (sampleAt) {
  if (resolve(sampleAt).startsWith(ROOT + '/')) { console.error('聞き比べの mp3 はリポジトリの外に出してください'); process.exit(1); }
  const parts = keys.map(k => ({ f: join(OUT, k), t: k.startsWith('se/') ? Math.min(2, table[k].dur) : k.startsWith('amb/') ? 6 : 20 }));
  const fc = parts.map((p, i) => `[${i}:a]aresample=44100,apad=whole_dur=${p.t + 1}[p${i}]`).join(';') + ';' + parts.map((_, i) => `[p${i}]`).join('') + `concat=n=${parts.length}:v=0:a=1[o]`;
  ff([...parts.flatMap(p => ['-t', String(p.t), '-i', p.f]), '-filter_complex', fc, '-map', '[o]', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', sampleAt]);
  console.log('聞き比べ：', sampleAt, (statSync(sampleAt).size / 1048576).toFixed(2) + 'MB');
}
