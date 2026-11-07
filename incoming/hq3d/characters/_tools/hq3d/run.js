'use strict';
// ══════════════════════════════════════════════════════════════════
//  高精度 3D 制作: 手直し → 撮影 → 原画との比較 → 履歴 を まわす
//
//   使い方:  node server/modules/hq3d/run.js <キャラ> [--source <VRM>] [--no-refine] [--tune <回数>] [--fit-pose]
//   例:      node server/modules/hq3d/run.js wakaba
//            node server/modules/hq3d/run.js wakaba --tune 3   … 色を原画へ自動で寄せる（最大 3 回）
//
//   入力: hq3d/characters/<キャラ>/adjust.json（手直しの調整値）・reference.json（原画の解析）
//         --source を省くと adjust.json の source（VRoid から書き出したままの VRM）を使う
//   出力: hq3d/characters/<キャラ>/runs/<日時>/  model.vrm・render/・report/（report.html を開いて見る）・adjust.json（使った調整値）
//         hq3d/characters/<キャラ>/history.jsonl に 1 回ごとに 1 行足す
//   ・元の VRM と本番のモデルには触れない（本番へ入れるかは人が report を見て決める）
//   ・前回より点が下がった項目があれば知らせる（前の runs/ はそのまま残るので戻せる）
//   ・--tune: adjust.json の手順に "tune": { "<色の欄>": "<reference.json の palette の名前>" } があれば、
//     その色を「原画の色 ÷ 描画の色」（光の強さの比）で掛け直して、もう一度まわす。
//     寄せた項目の点が上がったときだけ採用し、上がらなければ前の値に戻して止める。
//     採用した値だけを adjust.json に書き戻す（書き戻す前の adjust.json は最初の回の runs/ に残る）。
//   ・シルエット: キャラのフォルダに pose.json（原画の関節へ合わせたポーズ）があれば、そのポーズでも撮って原画の輪郭と比べる。
//     --fit-pose: この回のモデルで vrm_pose_fit.py を走らせて pose.json を作り直す（前の pose.json は runs/<日時>/pose_before.json に残る）。
//     原画の輪郭と関節は hq3d_sheet_silhouette.py で先に作っておく（sheet/）
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WCMF = path.resolve(__dirname, '..', '..', '..');
const WAKABA = path.resolve(WCMF, '..');
const PY_BLENDER = path.join(WCMF, 'server', 'modules', 'blender', 'python');
const BLENDER = process.env.WCMF_BLENDER || 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const PYTHON = process.env.WCMF_IMAGE_PYTHON || 'C:\\Users\\user\\wakaba-venvs\\local-image\\Scripts\\python.exe';

function arg(name, def) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : def; }

function runLine(exe, args, marker) {
  const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const line = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).find((l) => l.startsWith(marker + ' '));
  if (!line) throw new Error(`${path.basename(args.find((a) => a.endsWith('.py')) || exe)} の結果が読めません: ${String(r.stderr || r.error || '').slice(-400)}`);
  const res = JSON.parse(line.slice(marker.length + 1));
  if (!res.ok) throw new Error(res.error + (res.trace ? '\n' + res.trace : ''));
  return res;
}

function stampNow() {
  const d = new Date(), p2 = (n) => String(n).padStart(2, '0');  // この PC の時刻（日本時間）
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
}

function readHistory(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}

// 1 回: 手直し → 撮影 → 比較。使った調整値は runs/<日時>/adjust.json に写す
function runOnce(ctx, adj, label) {
  let stamp = stampNow();
  while (fs.existsSync(path.join(ctx.dir, 'runs', stamp))) stamp += 'b';
  const runDir = path.join(ctx.dir, 'runs', stamp);
  fs.mkdirSync(runDir, { recursive: true });
  const adjFile = path.join(runDir, 'adjust.json');
  fs.writeFileSync(adjFile, JSON.stringify(adj, null, 2) + '\n');
  const t0 = Date.now();
  let model = ctx.source;
  if (!ctx.noRefine) {
    model = path.join(runDir, 'model.vrm');
    const r = runLine(BLENDER, ['-b', '-P', path.join(PY_BLENDER, 'vrm_refine.py'), '--', ctx.source, adjFile, model], 'WCMF_RESULT');
    for (const s of r.steps) console.log(`  手直し ${s.op}${s.skipped ? '（飛ばした）' : ''}${s.faces ? ` ${JSON.stringify(s.faces)}` : ''}${s.removed_faces ? `・消した面 ${s.removed_faces}` : ''}`);
  }
  const poseUsed = path.join(runDir, 'pose.json');
  if (ctx.fitPose) {
    if (fs.existsSync(ctx.pose)) fs.copyFileSync(ctx.pose, path.join(runDir, 'pose_before.json'));
    const f = runLine(BLENDER, ['-b', '-P', path.join(PY_BLENDER, 'vrm_pose_fit.py'), '--', model, ctx.reference, poseUsed], 'WCMF_RESULT');
    fs.copyFileSync(poseUsed, ctx.pose);
    ctx.fitPose = false;  // 作り直すのは最初の回だけ（--tune の回は同じポーズで比べる）
    console.log(`  ポーズ合わせ: 関節のずれ ${f.rms_px} 画素${f.depth_hints.some((h) => !h.ok) ? '（奥行きの手がかりを守れていない所がある）' : ''} → pose.json`);
  } else if (fs.existsSync(ctx.pose)) {
    fs.copyFileSync(ctx.pose, poseUsed);
  }
  const renderArgs = ['-b', '-P', path.join(PY_BLENDER, 'vrm_compare_render.py'), '--', model, path.join(runDir, 'render'), '768'];
  if (fs.existsSync(poseUsed)) renderArgs.push('--pose', poseUsed);
  runLine(BLENDER, renderArgs, 'WCMF_RESULT');
  const c = runLine(PYTHON, ['-I', path.join(WCMF, 'server', 'modules', 'hq3d', 'py', 'hq3d_compare.py'), '--reference', ctx.reference,
    '--render', path.join(runDir, 'render'), '--out', path.join(runDir, 'report'), '--adjust', adjFile, '--history', ctx.history], 'HQ3D_COMPARE');
  const report = JSON.parse(fs.readFileSync(path.join(runDir, 'report', 'report.json'), 'utf8'));
  console.log(`\n${label}（${stamp}・${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
  for (const [k, v] of Object.entries(c.summary)) if (typeof v === 'number') console.log(`  ${k.padEnd(6, '　')} ${v}`);
  console.log(`  直す点 ${c.fixes} 件`);
  return { runDir, report, stamp };
}

// 前の回と、両方で測れた項目ごとに比べる
function diffReports(prev, now) {
  const key = (i) => `${i.category}/${i.item}`;
  const before = new Map(prev.items.filter((i) => typeof i.score === 'number').map((i) => [key(i), i.score]));
  const scored = now.items.filter((i) => typeof i.score === 'number' && before.has(key(i)));
  return {
    worse: scored.filter((i) => i.score < before.get(key(i)) - 2).map((i) => `${key(i)} ${before.get(key(i))} → ${i.score}`),
    better: scored.filter((i) => i.score > before.get(key(i)) + 2).map((i) => `${key(i)} ${before.get(key(i))} → ${i.score}`),
  };
}

// ── 色を寄せる（--tune） ─────────────────────────────
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (l) => { const c = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, c)) * 255); };
const parseHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const fmtHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');

function retint(current, sheet, model) {
  // 描画の色は「基本色 × テクスチャ × 光」なので、基本色を 原画÷描画 の比で掛け直す（光の強さの空間で）
  const cur = parseHex(current), s = parseHex(sheet), m = parseHex(model);
  return fmtHex(cur.map((v, i) => toSrgb(Math.min(1, toLin(v) * (toLin(s[i]) / Math.max(toLin(m[i]), 1e-4))))));
}

function tunedItems(adj) {
  const out = [];
  adj.steps.forEach((st, si) => { if (st.enabled !== false && st.tune) for (const [param, palette] of Object.entries(st.tune)) out.push({ si, param, palette }); });
  return out;
}

function colorItem(report, palette) { return report.items.find((i) => i.category === '色彩' && i.item === palette && typeof i.score === 'number'); }

function main() {
  const ch = process.argv[2];
  if (!ch || ch.startsWith('--')) { console.log('使い方: node server/modules/hq3d/run.js <キャラ> [--source <VRM>] [--no-refine] [--tune <回数>] [--fit-pose]'); process.exitCode = 2; return; }
  const dir = path.join(WCMF, 'hq3d', 'characters', ch);
  const adjustFile = path.join(dir, 'adjust.json');
  const adj = JSON.parse(fs.readFileSync(adjustFile, 'utf8'));
  const ctx = {
    dir, reference: path.join(dir, 'reference.json'), history: path.join(dir, 'history.jsonl'),
    source: path.resolve(arg('--source', path.join(WAKABA, String(adj.source || '').split('（')[0]))),
    noRefine: process.argv.includes('--no-refine'),
    pose: path.join(dir, 'pose.json'), fitPose: process.argv.includes('--fit-pose'),
  };
  if (!fs.existsSync(ctx.source)) throw new Error('元の VRM がありません: ' + ctx.source);
  const prev = readHistory(ctx.history).pop();
  const prevReport = prev && prev.report && fs.existsSync(path.join(prev.report, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(prev.report, 'report.json'), 'utf8')) : null;

  let best = runOnce(ctx, adj, `${ch}: 今の調整値`);
  const first = best;
  if (prevReport) {
    const d = diffReports(prevReport, best.report);
    console.log(`  前回（${path.basename(path.dirname(prev.report))}）より: 良くなった ${d.better.length}・悪くなった ${d.worse.length}`);
    for (const s of d.worse) console.log(`    ↓ ${s}（前の結果は runs/ に残っている）`);
    for (const s of d.better) console.log(`    ↑ ${s}`);
  }

  const rounds = Number(arg('--tune', 0)) || 0;
  if (rounds > 0 && !ctx.noRefine) {
    let bestAdj = adj;
    const targets = tunedItems(adj);
    const tunedScore = (rep) => targets.reduce((s, t) => s + ((colorItem(rep, t.palette) || {}).score || 0), 0);
    for (let n = 1; n <= rounds; n++) {
      const cand = JSON.parse(JSON.stringify(bestAdj));
      const changes = [];
      for (const t of targets) {
        const it = colorItem(best.report, t.palette);
        if (!it || it.delta_e00 < 3) continue;  // もう十分近い
        const params = cand.steps[t.si].params;
        const next = retint(params[t.param], it.sheet, it.model);
        if (next !== params[t.param]) { changes.push(`${t.palette}: ${params[t.param]} → ${next}（原画 ${it.sheet}・描画 ${it.model}・ΔE00 ${it.delta_e00}）`); params[t.param] = next; }
      }
      if (!changes.length) { console.log(`\n寄せる ${n} 回目: 直す色が無い（どれも十分近い）`); break; }
      console.log(`\n寄せる ${n} 回目:`);
      for (const c of changes) console.log('  ' + c);
      const tried = runOnce(ctx, cand, `寄せた結果 ${n} 回目`);
      const before = tunedScore(best.report), after = tunedScore(tried.report);
      const d = diffReports(best.report, tried.report);
      if (after > before + 0.5 && !d.worse.length) {
        console.log(`  → 採用（寄せた項目の点 ${before.toFixed(1)} → ${after.toFixed(1)}）`);
        best = tried; bestAdj = cand;
      } else {
        console.log(`  → 採用しない（寄せた項目の点 ${before.toFixed(1)} → ${after.toFixed(1)}${d.worse.length ? `・下がった項目 ${d.worse.join(' / ')}` : ''}）。前の値に戻して止める`);
        break;
      }
    }
    if (bestAdj !== adj) {
      fs.writeFileSync(adjustFile, JSON.stringify(bestAdj, null, 2) + '\n');
      console.log(`\nadjust.json に採用した色を書き戻した（書き戻す前の値は runs/${first.stamp}/adjust.json に残っている）`);
    }
  }
  console.log(`\nいちばん良い回: ${best.runDir}`);
  console.log(`  レポート: ${path.join(best.runDir, 'report', 'report.html')}`);
  console.log(`  モデル:   ${path.join(best.runDir, 'model.vrm')}（本番へ入れるかは人が見て決める）`);
}

try { main(); } catch (e) { console.error('✘ ' + e.message); process.exitCode = 1; }
