// 葉・草の揺れ（頂点の影の中でずらす）。three.js の材質に onBeforeCompile で足す。uWindTime は scene.js が毎フレーム進める。
// kind：'tree'＝高さの 2 乗で幹から揺れる（木のカード・遠景の板）／'grass'＝株の高さに比例して揺れる（下草・シダ）
// フェーズ 4：葉の「透け」（opt.translucent）：日を背にした葉・日の側を見た時に、葉の色で光が抜ける（逆光で白くならないよう黄緑に寄せ、強さは控えめ）。
//   uSunView＝日の向き（カメラの座標）・uSunCol＝日の色（scene.js が毎フレーム入れる）。kind が null なら揺れなしで透けだけ。
export const windUniforms = { uWindTime: { value: 0 }, uWindStrength: { value: 1 }, uSunView: { value: [0, 1, 0] }, uSunCol: { value: [1, 0.76, 0.56] }, uTrans: { value: 0.55 } };

export function patchWind(m, kind, opt = {}) {
  m.userData.wind = kind;
  const trans = !!opt.translucent;
  m.onBeforeCompile = sh => {
    sh.uniforms.uWindTime = windUniforms.uWindTime; sh.uniforms.uWindStrength = windUniforms.uWindStrength;
    if (trans) {
      sh.uniforms.uSunView = windUniforms.uSunView; sh.uniforms.uSunCol = windUniforms.uSunCol; sh.uniforms.uTrans = windUniforms.uTrans;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSunView; uniform vec3 uSunCol; uniform float uTrans;')
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        {
          vec3 L = normalize(uSunView);
          float back = pow(max(dot(-geometryViewDir, L), 0.0), 4.0);           // 日の方を見ている
          float thru = max(dot(-normal, L), 0.0);                                 // 葉の裏から日が当たる
          vec3 tint = diffuseColor.rgb * vec3(1.05, 1.0, 0.55);
          reflectedLight.directDiffuse += tint * uSunCol * uTrans * (0.65 * back + 0.35 * thru) * (0.5 + 0.5 * back);
        }`);
    }
    if (!kind) return;
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
  m.customProgramCacheKey = () => 'wind-' + kind + (trans ? '-t' : '');
  m.needsUpdate = true;
}
