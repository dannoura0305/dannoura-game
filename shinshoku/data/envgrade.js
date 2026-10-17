// 境界侵食 P12：区画・場所ごとの色の調整（グレーディング）と雨の濡れ・環境の光（IBL）の強さ。DOM・three.js なし（node で試験）。
// テイルズ風の夜：住宅地は青い月夜・アーケードは暖かい店の灯り・駅前はやや白い街灯・病院は冷たい白・研究施設は青緑・体育館は電球色。
// 値：expo（露出）・lift（影の色を持ち上げる）・gain（光の色）・sat（彩度）・contrast・wet（雨の濡れ 0〜1：上を向いた面）・envI（環境の光）・env（'town'|'indoor'）・glow（光る窓・看板の明るさ）。
// 人物は toon のまま（この調整は背景の材質だけに効く＝人物の色は変わらない・読みやすい）。
export const GRADES = {
  residential: { expo: 0.86, lift: [0.006, 0.006, 0.018], gain: [0.96, 0.98, 1.06], sat: 1.06, contrast: 1.14, wet: 0.95, envI: 1.0, iblD: 0.35, env: 'town', glow: 1.0 },
  arcade: { expo: 1.08, lift: [0.024, 0.012, 0.008], gain: [1.10, 0.99, 0.86], sat: 1.12, contrast: 1.05, wet: 0.05, envI: 0.55, env: 'town', glow: 1.05 },
  glassplaza: { expo: 1.02, lift: [0.018, 0.012, 0.016], gain: [1.05, 0.99, 0.95], sat: 1.08, contrast: 1.05, wet: 0.25, envI: 0.6, env: 'town', glow: 1.05 },
  avenue: { expo: 0.9, lift: [0.012, 0.010, 0.022], gain: [1.00, 0.99, 1.04], sat: 1.06, contrast: 1.07, wet: 0.95, envI: 1.0, iblD: 0.35, env: 'town', glow: 1.0 },
  station: { expo: 0.92, lift: [0.010, 0.012, 0.024], gain: [0.98, 1.00, 1.06], sat: 1.04, contrast: 1.06, wet: 0.9, envI: 1.0, iblD: 0.35, env: 'town', glow: 1.05 },
  home: { expo: 1.00, lift: [0.020, 0.014, 0.010], gain: [1.08, 1.00, 0.90], sat: 1.06, contrast: 1.03, wet: 0.0, envI: 0.45, env: 'indoor', glow: 1.0 },
  alley: { expo: 0.88, lift: [0.010, 0.008, 0.026], gain: [0.95, 0.96, 1.08], sat: 1.02, contrast: 1.08, wet: 0.95, envI: 0.5, env: 'town', glow: 1.0 },
  plaza: { expo: 0.9, lift: [0.012, 0.010, 0.026], gain: [0.98, 0.98, 1.06], sat: 1.04, contrast: 1.06, wet: 0.9, envI: 0.6, env: 'town', glow: 1.0 },
  shelter: { expo: 0.98, lift: [0.020, 0.014, 0.010], gain: [1.08, 1.00, 0.88], sat: 1.02, contrast: 1.04, wet: 0.0, envI: 0.55, env: 'indoor', glow: 1.0 },
  hospital: { expo: 0.92, lift: [0.006, 0.016, 0.020], gain: [0.90, 1.00, 1.06], sat: 0.88, contrast: 1.08, wet: 0.0, envI: 0.5, env: 'indoor', glow: 0.95 },
  tunnel: { expo: 0.95, lift: [0.006, 0.016, 0.012], gain: [0.92, 1.02, 0.96], sat: 0.9, contrast: 1.1, wet: 0.35, envI: 0.35, env: 'indoor', glow: 1.0 },
  office: { expo: 0.96, lift: [0.012, 0.012, 0.016], gain: [1.00, 1.00, 1.00], sat: 0.96, contrast: 1.05, wet: 0.0, envI: 0.5, env: 'indoor', glow: 1.0 },
  lab: { expo: 0.95, lift: [0.004, 0.016, 0.022], gain: [0.88, 1.00, 1.08], sat: 0.92, contrast: 1.1, wet: 0.0, envI: 0.55, env: 'indoor', glow: 1.0 },
  oldwing: { expo: 0.94, lift: [0.010, 0.014, 0.012], gain: [0.95, 1.00, 0.95], sat: 0.85, contrast: 1.1, wet: 0.2, envI: 0.4, env: 'indoor', glow: 1.0 },
  atrium: { expo: 0.98, lift: [0.010, 0.012, 0.022], gain: [0.95, 1.00, 1.06], sat: 0.98, contrast: 1.06, wet: 0.0, envI: 0.55, env: 'indoor', glow: 1.0 },
  admin: { expo: 0.95, lift: [0.004, 0.014, 0.024], gain: [0.88, 0.98, 1.10], sat: 0.92, contrast: 1.1, wet: 0.0, envI: 0.55, env: 'indoor', glow: 1.0 },
  kiroku: { expo: 0.95, lift: [0.008, 0.010, 0.026], gain: [0.92, 0.96, 1.10], sat: 0.92, contrast: 1.1, wet: 0.0, envI: 0.5, env: 'indoor', glow: 1.0 },
  epilogue: { expo: 1.00, lift: [0.018, 0.014, 0.012], gain: [1.05, 1.00, 0.94], sat: 1.04, contrast: 1.03, wet: 0.0, envI: 0.5, env: 'indoor', glow: 1.0 },
  giant: { expo: 1.00, lift: [0.016, 0.008, 0.026], gain: [1.02, 0.95, 1.06], sat: 1.06, contrast: 1.08, wet: 0.7, envI: 0.6, env: 'town', glow: 1.0 },
};
const AREA_KEY = { shotengai: null, alley: 'alley', plaza: 'plaza', shelter: 'shelter', hospital: 'hospital', tunnel: 'tunnel', office: 'office', lab: 'lab', yard: 'giant',
  oldwing: 'oldwing', atrium: 'atrium', town: 'giant', ruins: 'arcade', avenue: 'giant', admin: 'admin', abyss: 'giant', kiroku: 'kiroku', epilogue: 'epilogue' };
/** 商店街の区画（町全体）の中の場所：アーケード・ガラスの屋根の広場・中央通り・駅前・自宅の中・住宅地 */
export function townZone(x, z, inHome = null) {
  if (inHome && inHome(x, z)) return 'home';
  if (z < -4 && z > -72.5 && Math.abs(x) < 4.8) return 'arcade';
  if (z < -78) return 'station';
  if (x > 62) return 'avenue';
  if (x > 10.5 && x < 37 && z < -4 && z > -36) return 'glassplaza';
  return 'residential';
}
/** 区画と位置 → 色の調整の値 */
export function gradeAt(areaId, x = 0, z = 0, inHome = null) {
  const k = areaId === 'shotengai' ? townZone(x, z, inHome) : (AREA_KEY[areaId] || 'residential');
  return Object.assign({ key: k }, GRADES[k] || GRADES.residential);
}
