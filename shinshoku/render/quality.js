// 画質の段（DECISIONS：スマホは別の簡略モード）。DOM なし・純粋関数（node でテスト）。
// auto：タッチ（指）・画面の小ささ・CPU の数から選ぶ。設定画面で変えられる。
// P12（環境の写実化）：pbr＝町と屋内を PBR の材質に（色・法線・ORH の地図帳：envTile＝枠の辺 px。0＝読まない）・post＝ブルームと周辺減光（mapkit の Post）・
// refl＝地面の映り込み（鏡のカメラで描く絵の解像度の割合・envrefl.js）・kit＝Blender の部品（電柱・街灯・自販機・車など：wakaba-assets の glb）・splash＝雨の跳ね・envMB＝地図帳の GPU の量の目安（MB）。
// ultra は自動では選ばない（設定で選ぶ）。スマホの「低」は toon のまま（色の地図帳だけ 128px の枠の PBR の絵に差し替える）。
export const PRESETS = {
  ultra: { label: '最高（PC）', resScale: 1, shadows: true, shadowSize: 2048, outline: true, outlineDist: 22, rain: true, rainN: 1400, halos: true, wet: true, edges: true, lights: 8, antialias: true, enemyFar: 40, mist: 300, farMul: 1.1,
    pbr: true, envTile: 512, post: { bloom: true, vignette: true }, kit: true, splash: true, refl: 0.5, envMB: 293 },
  high: { label: '高（PC）', resScale: 1, shadows: true, shadowSize: 1024, outline: true, outlineDist: 18, rain: true, rainN: 900, halos: true, wet: true, edges: true, lights: 8, antialias: true, enemyFar: 36, mist: 260, farMul: 1,
    pbr: true, envTile: 256, post: { bloom: true, vignette: true }, kit: true, splash: true, refl: 0.4, envMB: 73 },
  mid: { label: '中', resScale: 0.85, shadows: true, shadowSize: 512, outline: true, outlineDist: 12, rain: true, rainN: 500, halos: true, wet: true, edges: false, lights: 6, antialias: false, enemyFar: 30, mist: 160, farMul: 0.9,
    pbr: true, envTile: 256, post: null, kit: true, splash: true, envMB: 73 },
  low: { label: '低（スマホ）', resScale: 0.62, shadows: false, shadowSize: 256, outline: true, outlineDist: 7, rain: false, rainN: 0, halos: true, wet: false, edges: false, lights: 4, antialias: false, enemyFar: 24, mist: 100, farMul: 0.8,
    pbr: false, envTile: 128, post: null, kit: false, splash: false, envMB: 6 },
};
export const PRESET_KEYS = ['ultra', 'high', 'mid', 'low'];

/** 端末の様子から段を選ぶ（本体は共通の mapkit/render/quality.js へ移した・挙動は同じ。ここは再輸出） */
export { autoPreset } from '../../mapkit/render/quality.js';
/** 設定（settings）に段の値を流し込む。個別に変えた値は preset:'custom' として残す */
export function applyPreset(settings, key) {
  const p = PRESETS[key] || PRESETS.high;
  return Object.assign({}, settings, { preset: key, resScale: p.resScale, shadows: p.shadows, outline: p.outline, rain: p.rain, halos: p.halos, wet: p.wet, edges: p.edges });
}
