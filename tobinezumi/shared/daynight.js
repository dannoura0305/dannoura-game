// tobinezumi/shared/daynight.js — 世界の時計（昼夜）。ブラウザとサーバーで同じ計算。DOM なし。
//
// ・実時間 24 分 = 1 日（1 時間 = 1 分）。オンラインはサーバーの時刻から決まり、全員で同じ。
//   clock = {scale, origin, base}：時刻 t(ms) の「世界の経過 ms」 = base + (t - origin) × scale。
//   ふだんは scale 1・origin 0・base 0（Unix 時刻そのまま → 再起動しても時計は続く）。
//   開発用の早回し（サーバーの TOBI_DEV=1 TOBI_TIMESCALE=60、オフラインの ?timescale=60）は scale を変える。
// ・時間帯：夜 19〜5 時（10 時間）、明け方 5〜7 時、昼 7〜17 時（10 時間）、夕方 17〜19 時。
// ・トビネズミは夜行性：夜は採集物が早く戻り（再出現の待ち ×0.45）、夜だけの種子と夜露（飲める）が出る。
//   昼は戻りが遅い（×1.4）。夜露は昼になると乾いて消える。
export const DAY_MS = 24 * 60 * 1000;
export const HOUR_MS = DAY_MS / 24;
export const PERIODS = [
  { id: 'night', from: 19, to: 5, name: '夜' },
  { id: 'dawn', from: 5, to: 7, name: '明け方' },
  { id: 'day', from: 7, to: 17, name: '昼' },
  { id: 'dusk', from: 17, to: 19, name: '夕方' },
];
export const DARK_MAX = 0.66;   // 夜の暗さ（0＝昼、1＝真っ暗）
// 夜だけ出るもの（上限数）と、出る間隔（世界の時間で）
export const NIGHT_EXTRA = { dew: 20, seed: 16 };
export const NIGHT_SPAWN_MS = 6000;

export function makeClock({ scale = 1, origin = 0, base = 0, startHour = null, now = 0 } = {}) {
  const c = { scale: Number(scale) > 0 ? Number(scale) : 1, origin: Number(origin) || 0, base: Number(base) || 0 };
  if (startHour != null && Number.isFinite(Number(startHour))) {
    // 今（now）の時刻が startHour 時になるように base をずらす
    c.origin = now;
    const want = ((Number(startHour) % 24) + 24) % 24 * HOUR_MS;
    c.base = now - (((now % DAY_MS) + DAY_MS) % DAY_MS) + want;
  } else if (c.scale !== 1 && !c.origin) {
    c.origin = now; c.base = now;   // 早回し：今の時刻から続けて速く進む
  }
  return c;
}
/** 世界の経過 ms */
export function worldMs(clock, t) { const c = clock || {}; return (c.base || 0) + (t - (c.origin || 0)) * (c.scale || 1); }
/** 1 日のうちの位置 0..1（0 = 真夜中 0 時） */
export function dayPhase(clock, t) { const w = worldMs(clock, t); return (((w % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS; }
export function hourOf(phase) { return phase * 24; }

export function periodOf(phase) {
  const h = hourOf(phase);
  if (h >= 19 || h < 5) return 'night';
  if (h < 7) return 'dawn';
  if (h < 17) return 'day';
  return 'dusk';
}
export const isNight = phase => periodOf(phase) === 'night';
const smooth = k => k * k * (3 - 2 * k);

/**
 * 見た目：{hour, period, name, dark(0..1), tint:[r,g,b,a], light(0..1 昼の明るさ), moon, sun, label}
 * dark は画面を暗くする強さ。tint は色味（夕焼けの橙・夜の青・明け方の桃色）。
 */
export function timeOfDay(phase) {
  const h = hourOf(phase), period = periodOf(phase);
  let dark = 0, tint = [255, 140, 80, 0.06];
  if (period === 'night') {
    // 真夜中ほど少し暗い
    const mid = Math.abs(((h + 24 - 19) % 24) - 5) / 5;   // 0（0 時）〜1（19 時・5 時）
    dark = DARK_MAX * (0.92 + 0.08 * (1 - mid));
    tint = [40, 60, 140, 0.22];
  } else if (period === 'dusk') {
    const k = smooth((h - 17) / 2);
    dark = DARK_MAX * 0.92 * k;
    tint = [255, 110 - 50 * k, 70 + 60 * k, 0.16 + 0.06 * k];
  } else if (period === 'dawn') {
    const k = smooth((h - 5) / 2);
    dark = DARK_MAX * 0.92 * (1 - k);
    tint = [255, 150, 160, 0.16 - 0.1 * k];
  }
  const p = PERIODS.find(x => x.id === period);
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return { hour: h, period, name: p.name, dark, tint, light: 1 - dark / DARK_MAX, moon: period === 'night' || (period === 'dusk' && h > 18) || (period === 'dawn' && h < 6),
    label: `${String(hh).padStart(2, '0')}:${String(mm - mm % 10).padStart(2, '0')}` };
}

/** 採集物の再出現までの待ち時間の倍率（夜は早い・昼は遅い） */
export function respawnScale(phase) {
  const p = periodOf(phase);
  return p === 'night' ? 0.45 : p === 'day' ? 1.4 : 0.75;
}
