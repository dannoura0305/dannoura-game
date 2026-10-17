// charkit の動きの数値（docs/wakaba-charkit/13 §1.1）。純粋関数・DOM なし。formulaVer を上げたら 13 の表と一緒に直す。
export const FORMULA_VER = 1;
const pct = (arr, q) => { if (!arr.length) return 0; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1) + 0.5))]; };

/**
 * 足の滑り。tracks：{ 名前: [[t, x, y, z], ...] }（足の点：つま先・かかとなど。世界の座標 m・y が上）。
 * 「着いている」こま：高さ ≤ ground + contactH かつ 水平の速さ ≤ maxSpeed（13 §1.1：2cm・30cm/s）。
 * 戻り値：{ meanCmS, p95CmS, contactFrames, frames, maxPenCm, maxFloatCm }（着いている間の水平の速さの平均と 95 パーセンタイル（cm/s））
 */
export function footSlide(tracks, opt = {}) {
  const ground = opt.ground ?? 0, contactH = opt.contactH ?? 0.02, maxSpeed = opt.maxSpeed ?? 0.3;
  const speeds = []; let frames = 0, pen = 0, flt = 0;
  for (const tr of Object.values(tracks)) {
    for (let i = 1; i < tr.length; i++) {
      const [t0, x0, y0, z0] = tr[i - 1], [t1, x1, y1, z1] = tr[i];
      const dt = t1 - t0; if (dt <= 0) continue; frames++;
      const v = Math.hypot(x1 - x0, z1 - z0) / dt;
      const h = Math.max(y0, y1) - ground;
      if (h <= contactH && v <= maxSpeed) { speeds.push(v); pen = Math.max(pen, -Math.min(y0, y1) + ground); flt = Math.max(flt, Math.min(y0, y1) - ground); }
    }
  }
  const mean = speeds.length ? speeds.reduce((s, x) => s + x, 0) / speeds.length : 0;
  return { meanCmS: mean * 100, p95CmS: pct(speeds, 0.95) * 100, contactFrames: speeds.length, frames, maxPenCm: pen * 100, maxFloatCm: flt * 100, formulaVer: FORMULA_VER };
}

/** 切り替えのはね（13 §1.1）：joints の角度の並び（ラジアン・60Hz）の各こまの差の最大（度/こま） */
export function maxJointStepDeg(series) {
  let m = 0;
  for (const s of series) for (let i = 1; i < s.length; i++) m = Math.max(m, Math.abs(s[i] - s[i - 1]) * 180 / Math.PI);
  return m;
}

// ── P13：動きの自然さの数値（tools/charkit/capture.mjs・tests/shinshoku-p13-motion.test.mjs）──
/** 2 つの四元数 [x,y,z,w] の間の角度（度） */
export function quatAngleDeg(a, b) {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}
/** 骨ごとの 1 こまの回転の大きさ（度/こま）の最大・p99。frames[i].q[name] = [x,y,z,w] */
export function jointSpeedStats(frames, names) {
  const out = {}; let all = [];
  for (const n of names) {
    const s = [];
    for (let i = 1; i < frames.length; i++) if (frames[i].q && frames[i - 1].q) s.push(quatAngleDeg(frames[i - 1].q[n], frames[i].q[n]));
    out[n] = { max: s.length ? Math.max(...s) : 0, p99: pct(s, 0.99) }; all = all.concat(s);
  }
  return { perJoint: out, max: all.length ? Math.max(...all) : 0, p99: pct(all, 0.99) };
}
/** ひざの曲げ（x 軸の回転・度。前へ曲がる＝正）の並び */
export const kneeSeries = (frames, side) => frames.map(f => { const q = f.q[side + 'LowerLeg']; return 2 * Math.atan2(q[0], q[3]) * 180 / Math.PI; });
/**
 * ひざの「はね」：曲げの角度の 2 階の差（度/こま²）の最大と、伸びすぎ（負の曲げ）の最小。
 * 自然な歩き・走りは 2 階の差が小さい（IK で脚が伸び切る所でひざが急に折れると大きくなる）
 */
export function kneePop(series) {
  let acc = 0, minA = Infinity, vel = 0;
  for (let i = 0; i < series.length; i++) {
    minA = Math.min(minA, series[i]);
    if (i >= 1) vel = Math.max(vel, Math.abs(series[i] - series[i - 1]));
    if (i >= 2) acc = Math.max(acc, Math.abs(series[i] - 2 * series[i - 1] + series[i - 2]));
  }
  return { maxAccDeg: acc, maxVelDeg: vel, minDeg: minA === Infinity ? 0 : minA };
}
/** 2 つの並びの相関（-1..1）。腕の振りと反対の脚（同じ向きに動けば 1） */
export function corr(a, b) {
  const n = Math.min(a.length, b.length); if (n < 3) return 0;
  let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
}
/** 1 つの並びの幅（最大−最小） */
export const range = s => s.length ? Math.max(...s) - Math.min(...s) : 0;
/** ある周期 T（こま）の並びで、最大の相関になるずれ（こま）：腕の遅れ（ひじの遅れなど）を測る */
export function lagOf(a, b, maxLag) {
  let best = 0, bc = -2;
  for (let k = -maxLag; k <= maxLag; k++) { const aa = [], bb = []; for (let i = Math.max(0, -k); i < a.length && i + k < b.length; i++) { aa.push(a[i]); bb.push(b[i + k]); } const c = corr(aa, bb); if (c > bc) { bc = c; best = k; } }
  return { lag: best, c: bc };
}
/** 1 周期の切れ目（ループの継ぎ目）：最後のこまと最初のこまの差を、こまの間の差の中央値と比べる（≤ 2.5 倍なら継ぎ目が見えない） */
export function loopSeamRatio(series) {
  const d = []; for (let i = 1; i < series.length; i++) d.push(Math.abs(series[i] - series[i - 1]));
  const seam = Math.abs(series[0] - series[series.length - 1]), med = pct(d, 0.5) || 1e-9;
  return seam / Math.max(med, pct(d, 0.9) * 0.25, 1e-6);
}
