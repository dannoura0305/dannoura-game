// キャラクターの陰影の値（charkit のキャラクターの設定 wakaba-char/1 の shader の欄と同じ形）。
// だんのうら（紫の姿）は shinshoku/assets/characters/dannoura.character.json の shader と同じ値（試験で一致を確かめる：tests/shinshoku-p12-char.test.mjs）。
// コードで組むキャラクターは同期で作る（起動の流れを変えない）ので、ここに写しを置く。値を変える時は JSON と一緒に変える。
export const SHADER_CFG = {
  dannoura: {
    model: 'wakaba-toon/1',
    materials: {
      skin: { base: '#ffe1d2', shade: '#eab4a6', shade2: '#c98e8e', threshold: 0.5, softness: 0.05, shade2Threshold: 0.2, rimK: 0.35, specular: 0 },
      hair: { base: '#6a3fa0', shade: '#43266e', shade2: '#2c1748', threshold: 0.48, softness: 0.03, rimK: 0.5, highlight: { tex: 'dannoura_hair_hl.png', strength: 0.55, viewShift: 0.06 } },
      cloth_jacket: { base: '#e6def6', shade: '#b9a6e6', threshold: 0.5, softness: 0.06, rimK: 0.3 },
      cloth_shirt: { base: '#f2a0c6', shade: '#c9779e', threshold: 0.5, softness: 0.06, pattern: { type: 'stripes', scale: 23, color: '#f08ab8' } },
      cloth_pants: { base: '#2a2236', shade: '#1a1424', threshold: 0.45, softness: 0.08, pattern: { type: 'plaid', scale: 13, color: '#6e5c96' } },
      metal_glasses_frame: { base: '#1e1a24', shade: '#0e0c12', threshold: 0.5, softness: 0.02, specular: 0.6 },
      eye_iris: { base: '#8a4fd0', shade: '#5a2a96', threshold: 0.5, softness: 0.1, irisDepthM: 0.002, outline: false },
      acc_hat: { base: '#f08cb8', shade: '#c0628e', threshold: 0.5, softness: 0.04 },
    },
    face: { shadowMode: 'sdf', sdfMap: 'dannoura_face_sdf.png', normalSource: 'ellipsoid', shadowColor: '#e3aaa0' },
    outline: { widthPx: 1.6, color: '#2a1830', distanceFade: [6, 18], vertexWidthChannel: 'r', innerLines: false },
    rim: { color: '#b8a8ff', width: 0.22, lightDependent: true },
    env: { ambientInfluence: 0.35, minLuma: 0.18, backlightRimBoost: 0.6, gradeInfluence: 0.5, fogInfluence: 0.6 },
  },
  // 白髪形態（forms.white.shaderOverride と同じリム）
  dannoura_white: {
    model: 'wakaba-toon/1',
    materials: {
      skin: { base: '#fbe7de', shade: '#ecc0b4', shade2: '#d0a0a0', threshold: 0.5, softness: 0.05, shade2Threshold: 0.2, rimK: 0.35, specular: 0 },
      hair: { base: '#f2eefa', shade: '#c4b6e4', shade2: '#9a88c8', threshold: 0.46, softness: 0.04, rimK: 0.6, highlight: { strength: 0.42, viewShift: 0.04 } },
      fur: { base: '#f7f3fc', shade: '#cfc4ea', threshold: 0.42, softness: 0.12, rimK: 0.65 },
      cloth_hoodie: { base: '#1a1620', shade: '#0e0b14', shade2: '#08060c', threshold: 0.5, softness: 0.06, rimK: 0.5, minLuma: 0.1 },
      cloth_strap: { base: '#f3eefb', shade: '#b8acd8', threshold: 0.5, softness: 0.05, rimK: 0.3 },
      cloth_pants: { base: '#18141e', shade: '#0c0a10', threshold: 0.45, softness: 0.08, minLuma: 0.1 },
      metal_glasses_frame: { base: '#1e1a24', shade: '#0e0c12', threshold: 0.5, softness: 0.02, specular: 0.6 },
      acc_claw: { base: '#3a1a52', shade: '#1e0a2c', threshold: 0.5, softness: 0.03, specular: 0.7 },
    },
    face: { shadowMode: 'sdf', normalSource: 'ellipsoid', shadowColor: '#e8b4aa' },
    outline: { widthPx: 1.6, color: '#1a1024', distanceFade: [6, 18], vertexWidthChannel: 'r', innerLines: false },
    rim: { color: '#c9a6ff', width: 0.3, lightDependent: false },
    env: { ambientInfluence: 0.3, minLuma: 0.2, backlightRimBoost: 0.8, gradeInfluence: 0.5, fogInfluence: 0.55 },
  },
  companion: {
    model: 'wakaba-toon/1',
    materials: {
      skin: { base: '#ffe6da', shade: '#efbfae', shade2: '#d39a94', threshold: 0.5, softness: 0.05, shade2Threshold: 0.2, rimK: 0.3, specular: 0 },
      hair: { base: '#4a3028', shade: '#2e1c18', shade2: '#1e120e', threshold: 0.48, softness: 0.03, rimK: 0.45, highlight: { strength: 0.5, viewShift: 0.05 } },
      cloth_parka: { base: '#6f7a4f', shade: '#4e5838', threshold: 0.5, softness: 0.07, rimK: 0.3 },
      cloth_shirt: { base: '#f2f0ea', shade: '#c4c4cc', threshold: 0.5, softness: 0.06, pattern: { type: 'stripes', scale: 30, color: '#2a3456' } },
      cloth_jeans: { base: '#3c5a8a', shade: '#28406a', threshold: 0.47, softness: 0.07, rimK: 0.25 },
      cloth_bag: { base: '#8a5a3a', shade: '#5e3a24', threshold: 0.5, softness: 0.05, specular: 0.2 },
    },
    face: { shadowMode: 'sdf', normalSource: 'ellipsoid', shadowColor: '#efb8a8' },
    outline: { widthPx: 1.5, color: '#2a1c18', distanceFade: [6, 18], vertexWidthChannel: 'r', innerLines: false },
    rim: { color: '#ffd8b0', width: 0.2, lightDependent: true },
    env: { ambientInfluence: 0.35, minLuma: 0.17, backlightRimBoost: 0.55, gradeInfluence: 0.5, fogInfluence: 0.6 },
  },
  daughter: {
    model: 'wakaba-toon/1',
    materials: {
      skin: { base: '#ffe8dc', shade: '#f2c2b4', threshold: 0.5, softness: 0.06, rimK: 0.3 },
      hair: { base: '#3a2a22', shade: '#241812', threshold: 0.48, softness: 0.04, rimK: 0.4, highlight: { strength: 0.45, viewShift: 0.05 } },
      cloth_dress: { base: '#f4a6c4', shade: '#d47ea2', threshold: 0.5, softness: 0.07, rimK: 0.3 },
    },
    face: { shadowMode: 'sdf', normalSource: 'ellipsoid' },
    outline: { widthPx: 1.4, color: '#3a2028', distanceFade: [6, 18], vertexWidthChannel: 'r', innerLines: false },
    rim: { color: '#ffe0c0', width: 0.2, lightDependent: true },
    env: { ambientInfluence: 0.35, minLuma: 0.2, backlightRimBoost: 0.5, gradeInfluence: 0.5, fogInfluence: 0.6 },
  },
};
