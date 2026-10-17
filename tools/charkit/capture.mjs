// 動きを撮る（charkit P13）：tools/charkit/motion_lab.html を 60Hz の決まった刻みで進め、こまごとの PNG・数値（JSON）・GIF／WebP・
// 1 周期の 12 こまの一覧（contact sheet）を作る。ffmpeg が無い時は PNG と数値だけ（一覧は python3＋PIL があれば作る）。
//   node tools/charkit/capture.mjs --out <dir> [--base http://localhost:8795] [--only walk,run] [--size 480x480] [--noimg]
// 数値（charkit/anim/metrics.js）：足の滑り・めり込み・腰の上下・頭の上下・腰の左右・骨盤の回り・肩の逆回り・骨の回転の速さ（はね）・ひざのはね・
// 腕と脚の位相（相関）・歩幅と歩数。docs/wakaba-charkit/13 §1.1 の数え方に合わせる。
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const M = await import(join(here, '../../charkit/anim/metrics.js'));

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('out', 'capture_out'); mkdirSync(out, { recursive: true });
const base = arg('base', 'http://localhost:8795');
const [VW, VH] = (arg('size', '480x480')).split('x').map(Number);
const noImg = process.argv.includes('--noimg');
const only = arg('only', '');
const extra = arg('extra', '');

// 撮るもの：name・URL の引数・撮る間隔（こま）・一覧（周期の 12 こま）を作るか
const JOBS = [
  ['walk', 'c=dannoura&scn=walk&v=2.2&w=none&cam=side&dist=4.6', 1, true],
  ['slowwalk', 'c=dannoura&scn=walk&v=1.2&w=none&cam=side&dist=4.6', 1, true],
  ['run', 'c=dannoura&scn=run&w=none&cam=side&dist=5', 1, true],
  ['sprint', 'c=dannoura&scn=sprint&w=none&cam=side&dist=5', 1, true],
  ['walk_katana', 'c=dannoura&scn=walk&v=2.2&w=katana&cam=front&dist=4.6', 2, false],
  ['run_front', 'c=dannoura&scn=run&w=katana&cam=front&dist=5.2', 2, false],
  ['startstop', 'c=dannoura&scn=startstop&w=katana&cam=side&dist=5.4', 2, false],
  ['turn180', 'c=dannoura&scn=turn180&w=katana&cam=fixed&cx=7&cz=4&tz=3', 2, false],
  ['turnwalk', 'c=dannoura&scn=turnwalk&w=none&cam=fixed&cx=5&cz=2&tz=2', 2, false],
  ['circle', 'c=dannoura&scn=circle&w=katana&cam=fixed&cx=6&cz=-1&tz=1.5', 2, false],
  ['idle', 'c=dannoura&scn=idle&w=none&cam=front&dist=4', 3, false],
  ['combo', 'c=dannoura&scn=combo&w=katana&cam=front&dist=5', 1, false],
  ['dodge', 'c=dannoura&scn=dodge&w=katana&cam=side&dist=5.4', 1, false],
  ['white_run', 'c=white&scn=run&cam=side&dist=5', 1, true],
  ['comp_walk', 'c=companion&scn=walk&v=2.2&cam=side&dist=4.6', 1, true],
  ['comp_run', 'c=companion&scn=run&cam=side&dist=5', 1, true],
].filter(j => !only || only.split(',').includes(j[0]));

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const hasFF = spawnSync('ffmpeg', ['-version']).status === 0;
const summary = {};

function analyze(frames, name) {
  const steady = frames.filter(f => f.t >= 1.0 && f.st === 'free');
  const tr = { lh: [], lt: [], rh: [], rt: [] };
  for (const f of frames) for (const k of Object.keys(tr)) tr[k].push([f.t, ...f[k]]);
  const slide = M.footSlide(tr);
  const minY = Math.min(...frames.flatMap(f => [f.lh[1], f.lt[1], f.rh[1], f.rt[1]]));
  const J = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'];
  const js = M.jointSpeedStats(frames, J);
  const kL = M.kneePop(M.kneeSeries(frames, 'left')), kR = M.kneePop(M.kneeSeries(frames, 'right'));
  const xang = (f, n) => 2 * Math.atan2(f.q[n][0], f.q[n][3]);
  const S = steady.length > 30 ? steady : frames;
  // 進む向きに対する横（腰の左右）：根の向き yaw の右の向き
  const lat = S.map(f => f.hip[0] * Math.cos(f.yaw) - f.hip[2] * Math.sin(f.yaw));
  const latDetr = (() => { const r = S.map(f => [f.t, (f.lh[0] + f.rh[0]) / 2 * Math.cos(f.yaw) - (f.lh[2] + f.rh[2]) / 2 * Math.sin(f.yaw)]); return lat.map((x, i) => x - r[i][1]); })();
  const rel = (f, n) => { let a = f['e_' + n][1] - f.yaw; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const hipYaw = S.map(f => rel(f, 'hips')), chestYaw = S.map(f => rel(f, 'chest'));
  const lArm = S.map(f => xang(f, 'leftUpperArm')), rThigh = S.map(f => xang(f, 'rightUpperLeg'));
  const lElb = S.map(f => xang(f, 'leftLowerArm'));
  const contacts = []; for (const s of ['l', 'r']) { let on = false; for (const f of S) { const c = f[s + 'h'][1] < 0.02; if (c && !on) contacts.push(f.t); on = c; } }
  const dur = S.length ? S[S.length - 1].t - S[0].t : 1;
  const r2 = x => Math.round(x * 100) / 100;
  return {
    slideMeanCmS: r2(slide.meanCmS), slideP95CmS: r2(slide.p95CmS), contactFrames: slide.contactFrames, penetrationCm: r2(-Math.min(0, minY) * 100),
    hipBobCm: r2(M.range(S.map(f => f.hip[1])) * 100), headBobCm: r2(M.range(S.map(f => f.head[1])) * 100),
    hipSwayCm: r2(M.range(latDetr) * 100), pelvisRollDeg: r2(M.range(S.map(f => f.e_hips[2])) * 57.3), pelvisYawDeg: r2(M.range(hipYaw) * 57.3),
    shoulderCounter: r2(M.corr(hipYaw, chestYaw)), headPitchDeg: r2(M.range(S.map(f => f.e_head[0])) * 57.3),
    jointMaxDegPerFrame: r2(js.max), jointP99DegPerFrame: r2(js.p99), worstJoint: Object.entries(js.perJoint).sort((a, b) => b[1].max - a[1].max)[0][0],
    kneeMaxAccDeg: r2(Math.max(kL.maxAccDeg, kR.maxAccDeg)), kneeMaxVelDeg: r2(Math.max(kL.maxVelDeg, kR.maxVelDeg)), kneeMinDeg: r2(Math.min(kL.minDeg, kR.minDeg)),
    armLegCorr: r2(M.corr(lArm, rThigh)), elbowLagFrames: M.lagOf(lArm, lElb, 12).lag,
    stepsPerS: r2(contacts.length / Math.max(dur, 1e-3)), meanSpeed: r2(S.reduce((s, f) => s + f.v, 0) / Math.max(1, S.length)),
  };
}

for (const [name, q, every, sheet] of JOBS) {
  const dir = join(out, name); if (existsSync(dir)) rmSync(dir, { recursive: true }); mkdirSync(dir, { recursive: true });
  await page.goto(`${base}/tools/charkit/motion_lab.html?${q}&W=${VW}&H=${VH}${extra}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  const dur = await page.evaluate(() => lab.dur);
  const n = Math.round(dur * 60);
  let shot = 0;
  for (let i = 0; i < n; i++) {
    const draw = !noImg && (i % every === 0);
    await page.evaluate(([d]) => lab.step(1, d), [draw]);
    if (draw) { await page.locator('canvas').screenshot({ path: join(dir, `f${String(shot).padStart(4, '0')}.png`) }); shot++; }
  }
  const frames = await page.evaluate(() => lab.frames);
  writeFileSync(join(dir, 'frames.json'), JSON.stringify(frames));
  const a = analyze(frames, name); summary[name] = a;
  // 1 周期の 12 こま：落ち着いた所（t ≥ 2s）の 1 周期（歩幅 ÷ 速さ）。こまの番号は撮る間隔で割る
  if (sheet && !noImg) {
    const T = await page.evaluate(v => lab.strideLen ? lab.strideLen(v) / v : null, a.meanSpeed);
    const per = T || 0.6, t0 = 2.0;
    const pick = []; for (let k = 0; k < 12; k++) pick.push(Math.round((t0 + per * k / 12) * 60 / every));
    writeFileSync(join(dir, 'cycle.json'), JSON.stringify({ periodS: per, frames: pick }));
    const py = `import sys,json\nfrom PIL import Image,ImageDraw\nd=sys.argv[1];j=json.load(open(d+'/cycle.json'))\nims=[Image.open('%s/f%04d.png'%(d,i)) for i in j['frames']]\nw,h=ims[0].size;cw=int(w*0.5);x0=(w-cw)//2\nS=Image.new('RGB',(cw*6,h*2))\nfor k,im in enumerate(ims):\n  S.paste(im.crop((x0,0,x0+cw,h)),((k%6)*cw,(k//6)*h))\nD=ImageDraw.Draw(S)\nfor k in range(12): D.text(((k%6)*cw+4,(k//6)*h+h-14),str(k),fill=(255,255,255))\nS.save(d+'/../'+sys.argv[2]+'_cycle.png')`;
    spawnSync('python3', ['-c', py, dir, name], { stdio: 'inherit' });
  }
  if (hasFF && !noImg) {
    const fps = String(60 / every);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(dir, 'f%04d.png'), '-vf', `fps=30,scale=${Math.round(VW * 0.75)}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer`, '-loop', '0', join(out, name + '.gif')]);
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', fps, '-i', join(dir, 'f%04d.png'), '-vf', 'fps=30', '-c:v', 'libwebp_anim', '-quality', '70', '-loop', '0', join(out, name + '.webp')]);
  }
  if (!process.argv.includes('--keep')) for (const f of readdirSync(dir)) if (/^f\d+\.png$/.test(f) && !(sheet)) rmSync(join(dir, f));
  console.log(name.padEnd(12), JSON.stringify(a));
}
writeFileSync(join(out, 'metrics.json'), JSON.stringify(summary, null, 1));
console.log('page errors', errs.length, errs.slice(0, 5).join('\n'));
await browser.close();
