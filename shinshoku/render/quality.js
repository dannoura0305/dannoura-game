// 画質の段（DECISIONS：スマホは別の簡略モード）。DOM なし・純粋関数（node でテスト）。
// auto：タッチ（指）・画面の小ささ・CPU の数から選ぶ。設定画面で変えられる。
export const PRESETS = {
  high: { label: '高（PC）', resScale: 1, shadows: true, shadowSize: 1024, outline: true, outlineDist: 18, rain: true, rainN: 900, halos: true, wet: true, edges: true, lights: 8, antialias: true, enemyFar: 36, mist: 260 },
  mid: { label: '中', resScale: 0.85, shadows: true, shadowSize: 512, outline: true, outlineDist: 12, rain: true, rainN: 500, halos: true, wet: true, edges: false, lights: 6, antialias: false, enemyFar: 30, mist: 160 },
  low: { label: '低（スマホ）', resScale: 0.62, shadows: false, shadowSize: 256, outline: true, outlineDist: 7, rain: false, rainN: 0, halos: true, wet: false, edges: false, lights: 4, antialias: false, enemyFar: 24, mist: 100 },
};
export const PRESET_KEYS = ['high', 'mid', 'low'];

/** 端末の様子から段を選ぶ。env = { touch, w, h, dpr, cores, mem } */
export function autoPreset(env = {}) {
  const small = Math.min(env.w || 1280, env.h || 800) < 560;
  if (env.touch && small) return 'low';
  if (env.touch) return 'mid';
  if ((env.cores && env.cores <= 2) || (env.mem && env.mem <= 2)) return 'low';
  if ((env.cores && env.cores <= 4) || (env.dpr && env.dpr >= 2.5 && (env.w || 0) * (env.h || 0) > 2e6)) return 'mid';
  return 'high';
}
/** 設定（settings）に段の値を流し込む。個別に変えた値は preset:'custom' として残す */
export function applyPreset(settings, key) {
  const p = PRESETS[key] || PRESETS.high;
  return Object.assign({}, settings, { preset: key, resScale: p.resScale, shadows: p.shadows, outline: p.outline, rain: p.rain, halos: p.halos, wet: p.wet, edges: p.edges });
}
