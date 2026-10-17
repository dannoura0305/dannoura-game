// 画質の段（DECISIONS：スマホは別の簡略モード）。DOM なし・純粋関数（node でテスト）。
// auto：タッチ（指）・画面の小ささ・CPU の数から選ぶ。設定画面で変えられる。
export const PRESETS = {
  high: { label: '高（PC）', resScale: 1, shadows: true, shadowSize: 1024, outline: true, outlineDist: 18, rain: true, rainN: 900, halos: true, wet: true, edges: true, lights: 8, antialias: true, enemyFar: 36, mist: 260, farMul: 1 },
  mid: { label: '中', resScale: 0.85, shadows: true, shadowSize: 512, outline: true, outlineDist: 12, rain: true, rainN: 500, halos: true, wet: true, edges: false, lights: 6, antialias: false, enemyFar: 30, mist: 160, farMul: 0.9 },
  low: { label: '低（スマホ）', resScale: 0.62, shadows: false, shadowSize: 256, outline: true, outlineDist: 7, rain: false, rainN: 0, halos: true, wet: false, edges: false, lights: 4, antialias: false, enemyFar: 24, mist: 100, farMul: 0.8 },
};
export const PRESET_KEYS = ['high', 'mid', 'low'];

/** 端末の様子から段を選ぶ（本体は共通の mapkit/render/quality.js へ移した・挙動は同じ。ここは再輸出） */
export { autoPreset } from '../../mapkit/render/quality.js';
/** 設定（settings）に段の値を流し込む。個別に変えた値は preset:'custom' として残す */
export function applyPreset(settings, key) {
  const p = PRESETS[key] || PRESETS.high;
  return Object.assign({}, settings, { preset: key, resScale: p.resScale, shadows: p.shadows, outline: p.outline, rain: p.rain, halos: p.halos, wet: p.wet, edges: p.edges });
}
