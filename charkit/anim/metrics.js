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
