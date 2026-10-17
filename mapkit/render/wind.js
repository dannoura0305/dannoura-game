// 葉・草の揺れ（頂点の影の中でずらす）。three.js の材質に onBeforeCompile で足す。uWindTime は scene.js が毎フレーム進める。
// kind：'tree'＝高さの 2 乗で幹から揺れる（木のカード・遠景の板）／'grass'＝株の高さに比例して揺れる（下草・シダ）
export const windUniforms = { uWindTime: { value: 0 }, uWindStrength: { value: 1 } };

export function patchWind(m, kind) {
  m.userData.wind = kind;
  m.onBeforeCompile = sh => {
    sh.uniforms.uWindTime = windUniforms.uWindTime; sh.uniforms.uWindStrength = windUniforms.uWindStrength;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWindTime; uniform float uWindStrength;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 wpos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        #else
          vec3 wpos = (modelMatrix * vec4(position, 1.0)).xyz;
        #endif
        float t = uWindTime;
        ${kind === 'tree' ? `
        float h = max(0.0, position.y);
        float gust = 0.6 + 0.4 * sin(t * 0.31 + wpos.x * 0.013);
        float sway = (sin(t * 0.9 + wpos.x * 0.05 + wpos.z * 0.04) * 0.6 + sin(t * 1.9 + wpos.z * 0.11) * 0.25) * h * h * 0.0016 * gust;
        float flutter = sin(t * 5.3 + position.x * 3.1 + position.z * 2.7 + position.y * 1.3) * 0.025 * clamp(h / 6.0, 0.0, 1.0);
        transformed.x += (sway + flutter) * uWindStrength;
        transformed.z += (sway * 0.6 - flutter * 0.7) * uWindStrength;
        transformed.y += flutter * 0.5 * uWindStrength;` : `
        float h = max(0.0, position.y);
        float sway = (sin(t * 1.7 + wpos.x * 0.6 + wpos.z * 0.4) * 0.7 + sin(t * 3.1 + wpos.z * 1.3) * 0.3) * h * 0.18;
        transformed.x += sway * uWindStrength;
        transformed.z += sway * 0.5 * uWindStrength;`}
      }`);
  };
  m.customProgramCacheKey = () => 'wind-' + kind;
  m.needsUpdate = true;
}
