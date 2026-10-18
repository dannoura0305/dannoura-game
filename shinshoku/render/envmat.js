// 境界侵食 P12「環境の写実化」：町と屋内の材質を、手続きの地図帳（toon）から PBR の地図帳（色・法線・ORH）へ。
// 方針（docs/shinshoku/DECISIONS.md 2026-10-17）：人物はアニメ調のまま。背景は「描き込みの多い・信じられる・光の豊かな」テイルズ風の夜の町
// （写実の PBR に、色の調整（グレーディング）で少しだけ絵の色をのせる）。人物の材質（toon.js）には触れない＝人物は読みやすいまま。
// ・描画呼び出しは増やさない：今の「町の材質は 1 つ（tex）＋光る 1 つ（texglow）」のまま、同じ枠（tileRect）で 3 枚の地図帳を読む。
// ・地図帳は起動の後で読む（最初は手続きのキャンバスの絵＝起動を遅くしない）。段（quality.js の envTile）で枠の大きさ 512／256／128。
// ・スマホの「低」は toon のまま（色の地図帳だけ PBR の 128px の枠の絵に差し替える＝軽い）。
// ・屋内（病院・体育館・研究施設・管理棟など）は、区画の id ごとに床・壁・天井の枠を選ぶ「世界の座標で貼る」材質（形は変えない）。
// ・灯りの窓は「部屋の奥行きの見せかけ」（interior mapping）：窓のガラスの所（地図帳の A＝0.6）だけ、カメラの向きで奥の壁・床・天井を描く。
import * as THREE from 'three';
import { townAtlas, tileRect, TILES, ATLAS_N, ATLAS_ROWS, setTownMatsOverride, townMatsToon } from './townmat.js';
import { gradientMap } from './toon.js';

const BASE = new URL('../assets/env/', import.meta.url).href;

/** 共有の uniform（全部の環境の材質が同じ物を指す＝区画・時間で値を変えるだけ・シェーダーは作り直さない） */
export const U = {
  uNrm: { value: null }, uOrh: { value: null }, uPar: { value: null }, uAtlasN: { value: new THREE.Vector2(ATLAS_N, ATLAS_ROWS) },
  uWet: { value: 0.0 }, uTime: { value: 0 }, uNrmScale: { value: 1.0 },
  uExpo: { value: 1.0 }, uLift: { value: new THREE.Vector3(0, 0, 0) }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uSat: { value: 1.0 }, uContrast: { value: 1.0 },
  uGlow: { value: 1.0 }, uAlb: { value: null }, uIblD: { value: 0.4 }, uAmbK: { value: 0.5 },
  uRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 }, uGradeOn: { value: 1 },
};
export const ENV = { pbr: false, tile: 0, ready: false, loading: null, mats: new Set(), toonMats: new Set(), glowMats: new Set(), vegMats: new Set(), envMaps: {}, envMap: null, envI: 0.5, ambK: 0.5, stats: { bytes: 0, ms: 0, tile: 0 }, manifest: null };

function dataTex(w, h, rgba, filter = THREE.LinearFilter) {
  const t = new THREE.DataTexture(new Uint8Array(rgba), w, h, THREE.RGBAFormat); t.needsUpdate = true; t.minFilter = t.magFilter = filter; t.generateMipmaps = false; return t;
}
U.uNrm.value = dataTex(1, 1, [128, 128, 255, 255]);
U.uOrh.value = dataTex(1, 1, [255, 165, 128, 255]);
U.uPar.value = dataTex(1, 1, [0, 0, 128, 0], THREE.NearestFilter);

// ───────────── シェーダーの部品 ─────────────
const GLSL_COMMON = /* glsl */`
uniform sampler2D uNrm; uniform sampler2D uOrh; uniform sampler2D uAlb; uniform sampler2D uPar; uniform vec2 uAtlasN;
uniform float uWet; uniform float uTime; uniform float uNrmScale; uniform float uIblD; uniform float uAmbK;
uniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflOn; uniform float uGradeOn;
uniform float uExpo; uniform vec3 uLift; uniform vec3 uGain; uniform float uSat; uniform float uContrast;
varying vec4 vTileR; varying vec2 vEnvUv; varying vec3 vEnvW;
vec4 envPar(){ ivec2 ps = textureSize(uPar, 0); if (ps.x < 2) return vec4(0.0, 0.0, 0.5, 0.0);
  int c = int(floor(vTileR.x * uAtlasN.x)); int r = int(floor((1.0 - vTileR.y) * uAtlasN.y)); return texelFetch(uPar, ivec2(c, r), 0); }
float envHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// 色の調整：露出 → 肩（明るい所をなだらかに：白く飛ばない）→ 持ち上げ・利得（影と光の色）→ 彩度 → コントラスト
vec3 envGrade(vec3 c){
  if (uGradeOn < 0.5) return c;
  c *= uExpo;
  vec3 k = vec3(0.72); vec3 x = max(c - k, 0.0); c = min(c, k) + x / (1.0 + x / (1.0 - k) * 0.9);
  c = c * uGain + uLift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
  c = 0.18 * pow(max(c, 0.0) / 0.18, vec3(uContrast));
  return c;
}`;
// 枠の中の UV（textureGrad＝境目の線なし）と、その微分
const GLSL_TILEUV = /* glsl */`
  vec2 tUv = vTileR.xy + fract(vEnvUv) * vTileR.zw; vec2 tGx = dFdx(vEnvUv) * vTileR.zw, tGy = dFdy(vEnvUv) * vTileR.zw;`;

/** 町の tex（PBR）。kind：'atlas'（頂点の tileR と uv）｜'world'（世界の座標で貼る：屋内。tiles＝{ wall, floor, ceil }・ts） */
function patchEnv(m, kind, opt = {}) {
  const tiles = opt.tiles || {}, ts = opt.ts || 2;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    if (kind !== 'atlas') { sh.uniforms.uTW = { value: new THREE.Vector4(...tileRect(tiles.wall || 'plaster')) }; sh.uniforms.uTF = { value: new THREE.Vector4(...tileRect(tiles.floor || 'concrete')) }; sh.uniforms.uTC = { value: new THREE.Vector4(...tileRect(tiles.ceil || tiles.wall || 'plaster')) }; sh.uniforms.uTs = { value: ts }; }
    let vs = sh.vertexShader;
    const head = kind !== 'atlas' ? 'uniform vec4 uTW; uniform vec4 uTF; uniform vec4 uTC; uniform float uTs;\n' : 'attribute vec4 tileR;\n';
    vs = head + 'varying vec4 vTileR; varying vec2 vEnvUv; varying vec3 vEnvW;\n' + vs;
    const setUv = kind !== 'atlas' ? `
      { vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp; vEnvW = wp.xyz;
        vec3 wn = normalize(mat3(modelMatrix) * objectNormal); vec3 an = abs(wn);
        if (an.y >= an.x && an.y >= an.z) { vEnvUv = vec2(wp.x, -wp.z) / uTs; vTileR = wn.y > 0.0 ? uTF : uTC; }
        else if (an.x >= an.z) { vEnvUv = vec2(wn.x > 0.0 ? -wp.z : wp.z, wp.y) / uTs; vTileR = uTW; }
        else { vEnvUv = vec2(wn.z > 0.0 ? wp.x : -wp.x, wp.y) / uTs; vTileR = uTW; } }` : `
      vTileR = tileR; vEnvUv = uv;
      { vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        vEnvW = (modelMatrix * wp).xyz; }`;
    vs = vs.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + setUv);
    sh.vertexShader = vs;
    let fs = GLSL_COMMON + '\n' + sh.fragmentShader;
    fs = fs.replace('#include <map_fragment>', `
${GLSL_TILEUV}
  vec4 envP = envPar();
  vec4 envO = textureGrad(uOrh, tUv, tGx, tGy);
  #ifdef USE_MAP
  ${kind === 'overlay' ? `
    // 区画の手描きの床（体育館の線・病院の市松など）はそのまま、材質の明るさのむらだけ重ねる
    diffuseColor *= texture2D(map, vMapUv);
    { vec3 da = textureGrad(uAlb, tUv, tGx, tGy).rgb; vec3 av = textureLod(uAlb, vTileR.xy + vTileR.zw * 0.5, 7.0).rgb;
      diffuseColor.rgb *= mix(vec3(1.0), clamp(da / max(av, vec3(0.04)), 0.0, 2.0), 0.7); }` : `
    vec4 sampledDiffuseColor = textureGrad(map, tUv, tGx, tGy);
    if (sampledDiffuseColor.a < 0.45) discard;
    diffuseColor.rgb *= sampledDiffuseColor.rgb;`}
  #endif
  diffuseColor.rgb *= mix(1.0, envO.r, 0.55);
  // 雨：上を向いた面ほど濡れる（暗く・艶）。低い所（高さ B が低い）は水たまり
  vec3 envWN = normalize(vec3(vNormal * mat3(viewMatrix)));
  float envWet = uWet * envP.g * smoothstep(0.55, 0.92, envWN.y);
  float envPud = envWet * smoothstep(0.40, 0.26, envO.b);
  diffuseColor.rgb *= mix(1.0, 0.55, envWet * 0.75) * mix(1.0, 0.7, envPud);`);
    fs = fs.replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * envO.g;
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.32, envWet); roughnessFactor = mix(roughnessFactor, 0.035, envPud);
  #ifdef USE_COLOR_ALPHA
    if (vColor.a > 0.25 && vColor.a < 0.75) roughnessFactor = 0.06;   // 部品のガラス（envkit.js：頂点の色の A＝0.5）
    if (vColor.a > 0.85 && vColor.a < 0.95) roughnessFactor = mix(0.24, 0.12, envWet);   // P14：車の塗装（A＝0.9：クリアの艶）
    if (vColor.a > 0.1 && vColor.a < 0.3) roughnessFactor = 0.22;                       // P14：金属（めっき・A＝0.2）
  #endif`);
    fs = fs.replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * envP.r;\n  #ifdef USE_COLOR_ALPHA\n    if (vColor.a > 0.1 && vColor.a < 0.3) metalnessFactor = 0.85;\n  #endif');
    fs = fs.replace('#include <normal_fragment_maps>', `
  { vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(vEnvUv), st1 = dFdy(vEnvUv);
    vec3 N = normal; vec3 q1p = cross(q1, N), q0p = cross(N, q0);
    vec3 T = q1p * st0.x + q0p * st1.x, Bt = q1p * st0.y + q0p * st1.y; float det = max(dot(T, T), dot(Bt, Bt)); float sc = det == 0.0 ? 0.0 : inversesqrt(det);
    vec3 mapN = textureGrad(uNrm, tUv, tGx, tGy).xyz * 2.0 - 1.0; mapN.xy *= uNrmScale * envP.b * 2.0 * (1.0 - envPud * 0.85);
    // 水たまりの雨の輪（小さな波紋）
    if (envPud > 0.01) { vec2 g = vEnvW.xz * 3.0; vec2 ci = floor(g); vec2 f = fract(g) - 0.5; float h = envHash(ci); float ph = fract(uTime * 0.9 + h);
      float rr = length(f + (vec2(envHash(ci + 3.1), envHash(ci + 7.7)) - 0.5) * 0.5); float ring = sin((rr - ph * 0.45) * 60.0) * smoothstep(0.08, 0.0, abs(rr - ph * 0.45)) * (1.0 - ph);
      mapN.xy += normalize(f + 1e-4) * ring * 0.35 * envPud; }
    normal = normalize(T * (mapN.x * sc) + Bt * (mapN.y * sc) + N * mapN.z); }`);
    // 空と周りの明かり（hemi・ambient）は人物と共有なので、背景の材質の側だけ弱める（uAmbK）＝人物の明るさは変えない
    fs = fs.replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n  iblIrradiance *= uIblD;\n  #if defined( RE_IndirectDiffuse )\n    irradiance *= uAmbK;\n  #endif');
    fs = fs.replace('#include <aomap_fragment>', `
  { float ambientOcclusion = envO.r; reflectedLight.indirectDiffuse *= ambientOcclusion;
    #if defined( USE_ENVMAP ) && defined( STANDARD )
      float dotNV = saturate(dot(geometryNormal, geometryViewDir)); reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
    #endif
  }`);
    fs = fs.replace('#include <tonemapping_fragment>', `
  // 地面の映り込み（envrefl.js：PC の高い段）。粗いほど弱く・濡れ・水たまりで強く・斜めから見るほど強く（フレネル）
  if (uReflOn > 0.5 && abs(vEnvW.y) < 0.3 && envWN.y > 0.8) {
    vec4 rc = uReflMat * vec4(vEnvW, 1.0); vec2 ruv = rc.xy / rc.w + (normal.xy - geometryNormal.xy) * 0.06;
    float rb = roughnessFactor * 0.012;
    vec3 rcol = (texture2D(uRefl, ruv).rgb * 2.0 + texture2D(uRefl, ruv + vec2(rb, 0.0)).rgb + texture2D(uRefl, ruv - vec2(rb, 0.0)).rgb + texture2D(uRefl, ruv + vec2(0.0, rb * 2.0)).rgb + texture2D(uRefl, ruv - vec2(0.0, rb * 2.0)).rgb) / 6.0;
    float rk = 1.0 - smoothstep(0.03, 0.75, roughnessFactor);
    float fr = 0.06 + 0.94 * pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 5.0);
    gl_FragColor.rgb += rcol * rk * mix(0.35, 1.0, fr) * clamp(0.35 + envWet * 0.65 + envPud, 0.0, 1.0) * (1.0 - metalnessFactor * 0.5);
  }
  gl_FragColor.rgb = envGrade(gl_FragColor.rgb);
#include <tonemapping_fragment>`);
    sh.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => 'envpbr_' + kind;
  return m;
}

/** 灯りの窓・店の中（光る）：枠の絵＋ガラスの所は部屋の奥行きの見せかけ */
function patchGlow(m) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec4 tileR; varying vec4 vTileR; varying vec2 vEnvUv; varying vec3 vEnvW; varying vec3 vEnvN;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
  vTileR = tileR; vEnvUv = uv;
  { vec4 wp = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      wp = instanceMatrix * wp;
    #endif
    vEnvW = (modelMatrix * wp).xyz; vEnvN = normalize(mat3(modelMatrix) * normal); }`);
    sh.fragmentShader = GLSL_COMMON + '\nuniform float uGlow; varying vec3 vEnvN;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
#ifdef USE_MAP
${GLSL_TILEUV}
  vec4 sampledDiffuseColor = textureGrad(map, tUv, tGx, tGy);
  if (sampledDiffuseColor.a > 0.5 && sampledDiffuseColor.a < 0.8) {
    // 部屋の見せかけ：表の面から奥へ 3.2m の部屋・横は 3.2m ごとの壁・上下は 2.9m ごとの床
    vec3 n = normalize(vEnvN); vec3 d = normalize(vEnvW - cameraPosition); vec3 an = abs(n);
    vec3 lat = an.x > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    float dn = dot(d, -n);
    if (dn > 0.02 && an.y < 0.5) {
      float pl = dot(vEnvW, lat), dl = dot(d, lat), cw = 3.2, fh = 2.9, py = vEnvW.y;
      float tB = 3.2 / dn;
      float tS = abs(dl) < 1e-4 ? 1e5 : ((floor(pl / cw) + step(0.0, dl)) * cw - pl) / dl;
      float tY = abs(d.y) < 1e-4 ? 1e5 : ((floor(py / fh) + step(0.0, d.y)) * fh - py) / d.y;
      float t = min(tB, min(tS, tY)); vec3 hp = vEnvW + d * t;
      vec2 rid = vec2(floor(pl / cw), floor(py / fh)) + floor(dot(vEnvW, n) * 0.5);
      float rh = envHash(rid), lamp = 0.55 + 0.6 * rh;
      vec3 tint = sampledDiffuseColor.rgb / max(0.25, max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b)));
      float hu = fract(dot(hp, lat) / cw), hv = fract(hp.y / fh);
      vec3 col;
      if (t == tB) {                                           // 奥の壁：家具の影・絵・棚
        float shelf = step(0.15, hu) * step(hu, 0.42) * step(hv, 0.62 + 0.2 * rh);
        float frame = step(0.55, hu) * step(hu, 0.8) * step(0.5, hv) * step(hv, 0.72) * step(0.5, rh);
        col = tint * (0.62 + 0.25 * hv) * (1.0 - shelf * 0.55) * (1.0 - frame * 0.35);
      } else if (t == tS) { col = tint * (0.42 + 0.3 * hv); }    // 横の壁
      else if (d.y < 0.0) { col = tint * vec3(0.55, 0.42, 0.32) * 0.75; }   // 床（木）
      else { float c = length(vec2(hu - 0.5, fract(dot(hp, -n) / 3.2) - 0.5)); col = tint * (0.8 + 0.9 * smoothstep(0.35, 0.0, c)); }   // 天井（灯り）
      float fog = exp(-t * 0.12);
      col *= lamp * mix(0.6, 1.0, fog);
      if (rh < 0.12) col = sampledDiffuseColor.rgb * 0.9;     // カーテンの閉じた部屋
      sampledDiffuseColor.rgb = col * 1.25;
    }
  }
  diffuseColor *= vec4(sampledDiffuseColor.rgb * uGlow, 1.0);
#endif`);
  };
  m.customProgramCacheKey = () => 'envglow';
  return m;
}

// ───────────── 環境の光（IBL：夜の町・屋内の 2 つを PMREM で 1 回だけ焼く） ─────────────
function envScene(kind) {
  const s = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uKind: { value: kind === 'indoor' ? 1 : 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uKind; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ float y = vD.y; vec3 c;
        if (uKind < 0.5) {
          // 夜の町：上は紫紺・地平は町の灯りで暖かい・下（路面）は暗い。ところどころの窓・看板・街灯（小さな明るい点）
          c = mix(vec3(0.045, 0.04, 0.06), vec3(0.01, 0.01, 0.022), smoothstep(0.0, 0.8, y));
          c += vec3(0.42, 0.24, 0.12) * exp(-abs(y) * 9.0) * 0.7;
          float a = atan(vD.z, vD.x); vec2 g = vec2(a * 18.0, y * 30.0); vec2 ci = floor(g);
          float win = step(0.86, h(ci)) * step(-0.05, y) * step(y, 0.35) * smoothstep(0.5, 0.2, length(fract(g) - 0.5));
          c += mix(vec3(1.0, 0.72, 0.42), vec3(0.6, 0.75, 1.0), step(0.5, h(ci + 4.0))) * win * 3.0;
          c = mix(c, vec3(0.025, 0.022, 0.03), smoothstep(0.0, -0.25, y));
        } else {
          // 屋内：天井の蛍光灯の列（上が明るい白）・壁は灰・床は暗い
          c = mix(vec3(0.16, 0.16, 0.15), vec3(0.06, 0.06, 0.06), smoothstep(0.1, -0.6, y));
          float a = atan(vD.z, vD.x);
          float tube = step(0.55, y) * smoothstep(0.08, 0.0, abs(fract(vD.x / max(0.2, y) * 1.5) - 0.5) - 0.05);
          c += vec3(1.0, 1.0, 0.95) * tube * 2.2 * smoothstep(0.5, 0.9, y) + vec3(0.25) * smoothstep(0.6, 1.0, y);
          c += vec3(0.05) * sin(a * 4.0);
        }
        gl_FragColor = vec4(c, 1.0); }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
  return s;
}
/** 段・端末に合わせて初めに 1 回。renderer と段の値（quality.js の PRESETS[key]）。PBR を使わない段は何もしない */
export function envInit(renderer, P) {
  ENV.pbr = !!P.pbr; ENV.tile = P.envTile || 0; ENV.renderer = renderer; ENV.P = P;
  setTownMatsOverride(ENV.pbr ? envTownMats : toonTownMats);
  if (!ENV.pbr) return ENV;
  U.uAlb.value = townAtlas();
  return ENV;
}
/** 環境の光（PMREM）を焼く：起動の後（envLoad の初め）。材質に入れるとシェーダーを 1 回作り直す（起動を遅くしない） */
function envBakeIBL() {
  if (!ENV.pbr || ENV.P.ibl === false || ENV.envMaps.town) return;
  const t0 = performance.now();
  try {
    const pm = new THREE.PMREMGenerator(ENV.renderer);
    for (const k of ['town', 'indoor']) { const sc = envScene(k); ENV.envMaps[k] = pm.fromScene(sc, 0.02, 0.1, 50).texture; sc.children[0].geometry.dispose(); sc.children[0].material.dispose(); }
    pm.dispose();
  } catch (e) { console.warn('env pmrem', e); return; }
  ENV.envMap = ENV.envMaps[ENV.envKind || 'town'] || ENV.envMaps.town;
  for (const m of ENV.mats) { m.envMap = ENV.envMap; m.envMapIntensity = ENV.envI; m.needsUpdate = true; }
  for (const m of ENV.vegMats) { m.envMap = ENV.envMap; m.envMapIntensity = m.userData.envBase * ENV.envI * 2; m.needsUpdate = true; }
  ENV.stats.pmremMs = Math.round(performance.now() - t0);
}
function stdMat(extra = {}) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 1.0, metalness: 1.0, envMap: ENV.envMap, envMapIntensity: ENV.envI }, extra));
  return m;
}
/** 町の材質の組（Builder.build から：townMats の差し替え） */
export function envTownMats() {
  const tex = patchEnv(stdMat({ map: townAtlas() }), 'atlas');
  const texglow = patchGlow(new THREE.MeshBasicMaterial({ vertexColors: true, map: townAtlas() }));
  ENV.mats.add(tex); ENV.glowMats.add(texglow);
  if (ENV.albedo) { tex.map = ENV.albedo; texglow.map = ENV.albedo; }
  return { tex, texglow };
}
let _kitMats = null;
/** Blender の部品（world/envkit.js）の材質：町の地図帳の PBR＋インスタンスの色は頂点の色の A＝1 の所だけ（塗装の #tint）。光る所は別の材質 */
export function envKitMats() {
  if (_kitMats) return _kitMats;
  const lit = patchEnv(stdMat({ map: ENV.albedo || townAtlas() }), 'atlas');
  const ob = lit.onBeforeCompile;
  lit.onBeforeCompile = sh => { ob(sh); sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', `
  #if defined( USE_COLOR_ALPHA )
    vColor = vec4(1.0); vColor *= color;
    #ifdef USE_INSTANCING_COLOR
      vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, step(0.75, color.a));
    #endif
  #else
    #include <color_vertex>
  #endif`); };
  lit.customProgramCacheKey = () => 'envpbr_kit';
  ENV.mats.add(lit);
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  _kitMats = { lit, glow };
  return _kitMats;
}
/** 屋内の材質（世界の座標で貼る）：tiles＝{ wall, floor, ceil }・ts（m） */
export function envWorldMat(tiles, ts = 2, extra = {}) {
  const m = patchEnv(stdMat(Object.assign({ map: ENV.albedo || townAtlas() }, extra)), 'world', { tiles, ts });
  m.customProgramCacheKey = () => 'envpbr_world';
  // 枠は uniform（区画ごとの値）。onBeforeCompile は同じ形のシェーダーを使い回すので、値は userData から毎回入れる
  const ob = m.onBeforeCompile;
  m.onBeforeCompile = sh => { ob(sh); m.userData.sh = sh; };
  m.userData.tiles = tiles;
  ENV.mats.add(m);
  return m;
}
/** 区画の手描きの床（キャンバスの絵の板）・インスタンスの家具（頂点の色）を PBR へ（finish の後で）。id＝区画の id */
export function envUpgradeRoot(root, id) {
  if (!ENV.pbr) return;
  const I = INTERIOR[id]; if (!I) return;
  root.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (m.isMeshToonMaterial && m.map && o.geometry.type === 'PlaneGeometry' && !m.transparent) {
      const nm = patchEnv(stdMat({ map: m.map, vertexColors: false, color: m.color }), 'overlay', { tiles: I.floor, ts: I.ts });
      nm.customProgramCacheKey = () => 'envpbr_overlay'; ENV.mats.add(nm); o.material = nm;
    } else if (o.isInstancedMesh && m.isMeshToonMaterial && m.vertexColors && !m.map) {
      o.material = envWorldMat({ wall: 'white', floor: 'white', ceil: 'white' }, 1.0);
    }
  });
}
/** 区画の材質（world/areas.js の mats）を PBR の屋内の材質へ（PBR の段だけ）。id＝区画の id */
export const INTERIOR = {
  alley: { wall: { wall: 'mortar', floor: 'concrete', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'asphalt2', ceil: 'concrete' }, ts: 2.5 },
  plaza: { wall: { wall: 'panel', floor: 'paving', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'paving', ceil: 'concrete' }, ts: 2.2 },
  shelter: { wall: { wall: 'plaster', floor: 'gymfloor', ceil: 'ceiling' }, floor: { wall: 'woodfloor', floor: 'gymfloor', ceil: 'ceiling' }, ts: 2.0 },
  hospital: { wall: { wall: 'plaster', floor: 'vinyl', ceil: 'ceiling' }, floor: { wall: 'plaster', floor: 'vinyl', ceil: 'ceiling' }, ts: 2.0 },
  tunnel: { wall: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'epoxy', ceil: 'concrete' }, ts: 3.0 },
  office: { wall: { wall: 'plaster', floor: 'carpet', ceil: 'ceiling' }, floor: { wall: 'plaster', floor: 'carpet', ceil: 'ceiling' }, ts: 2.0 },
  lab: { wall: { wall: 'metalpanel', floor: 'epoxy', ceil: 'ceiling' }, floor: { wall: 'metalpanel', floor: 'epoxy', ceil: 'ceiling' }, ts: 2.4 },
  yard: { wall: { wall: 'concrete', floor: 'concrete', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'asphalt', ceil: 'concrete' }, ts: 4.0 },
  oldwing: { wall: { wall: 'metalpanel', floor: 'epoxy', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'epoxy', ceil: 'concrete' }, ts: 2.4 },
  atrium: { wall: { wall: 'panel', floor: 'granite', ceil: 'ceiling' }, floor: { wall: 'panel', floor: 'granite', ceil: 'ceiling' }, ts: 3.0 },
  town: { wall: { wall: 'mortar', floor: 'asphalt', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'asphalt', ceil: 'concrete' }, ts: 5.0 },
  ruins: { wall: { wall: 'mortar', floor: 'arcade_floor', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'arcade_floor', ceil: 'concrete' }, ts: 2.5 },
  avenue: { wall: { wall: 'panel', floor: 'asphalt', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'asphalt', ceil: 'concrete' }, ts: 5.0 },
  admin: { wall: { wall: 'metalpanel', floor: 'carpet', ceil: 'ceiling' }, floor: { wall: 'metalpanel', floor: 'carpet', ceil: 'ceiling' }, ts: 2.4 },
  abyss: { wall: { wall: 'concrete', floor: 'lane', ceil: 'concrete' }, floor: { wall: 'concrete', floor: 'lane', ceil: 'concrete' }, ts: 5.0 },
  kiroku: { wall: { wall: 'metalpanel', floor: 'epoxy', ceil: 'ceiling' }, floor: { wall: 'metalpanel', floor: 'epoxy', ceil: 'ceiling' }, ts: 2.4 },
  epilogue: { wall: { wall: 'plaster', floor: 'woodfloor', ceil: 'ceiling' }, floor: { wall: 'plaster', floor: 'woodfloor', ceil: 'ceiling' }, ts: 2.0 },
};
export function envAreaMats(id, base) {
  if (!ENV.pbr) return base;
  const I = INTERIOR[id]; if (!I) return base;
  const out = Object.assign({}, base);
  out.wall = envWorldMat(I.wall, I.ts);
  out.floor = envWorldMat(I.floor, I.ts);
  out.prop = envWorldMat({ wall: 'white', floor: 'white', ceil: 'white' }, 1.0);
  out.shutter = envWorldMat({ wall: 'shutter', floor: 'white', ceil: 'white' }, 2.4);
  return out;
}

// ───────────── 地図帳を読む（起動の後） ─────────────
function loadTex(url, srgb) {
  return new Promise((res, rej) => new THREE.TextureLoader().load(url, t => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; res(t);
  }, undefined, rej));
}
function paramTex(man) {
  const N = man.n, R = man.rows, a = new Uint8Array(N * R * 4);
  man.tiles.forEach((t, i) => { const p = man.params[t] || [0, 0, 1, 0]; const c = i % N, r = Math.floor(i / N), o = (r * N + c) * 4; a[o] = p[0] * 255; a[o + 1] = p[1] * 255; a[o + 2] = Math.min(255, p[2] * 128); a[o + 3] = p[3] * 60; });
  const t = new THREE.DataTexture(a, N, R, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
}
/** PBR の地図帳を読み込んで差し替える（1 回だけ）。toon の段（スマホの低）は色の地図帳だけ */
export function envLoad() {
  if (ENV.loading) return ENV.loading;
  const tile = ENV.tile || (ENV.P && ENV.P.envTile) || 0;
  if (!tile) return (ENV.loading = Promise.resolve(false));
  const t0 = performance.now();
  envBakeIBL();
  ENV.loading = fetch(BASE + 'townpbr.json').then(r => r.json()).then(async man => {
    if (!man || JSON.stringify(man.tiles) !== JSON.stringify(TILES) || man.n !== ATLAS_N) { console.warn('townpbr: 枠の並びが違う（焼き直す）'); return false; }
    ENV.manifest = man; const S = man.sizes[String(tile)]; if (!S) return false;
    const want = ENV.pbr ? ['albedo', 'normal', 'orh'] : ['albedo'];
    const tex = await Promise.all(want.map(k => loadTex(BASE + S.files[k].file, k === 'albedo')));
    ENV.albedo = tex[0];
    const old = townAtlas();
    for (const m of [...ENV.mats, ...ENV.glowMats, ...ENV.toonMats]) { m.map = ENV.albedo; m.needsUpdate = false; }
    if (ENV.pbr) { U.uNrm.value = tex[1]; U.uOrh.value = tex[2]; U.uPar.value = paramTex(man); U.uAlb.value = ENV.albedo; }
    ENV.stats.bytes = want.reduce((s, k) => s + S.files[k].bytes, 0); ENV.stats.ms = Math.round(performance.now() - t0); ENV.stats.tile = tile;
    ENV.stats.gpuMB = Math.round(want.length * S.w * S.h * 4 * 4 / 3 / 1048576);
    try { old.dispose(); } catch (e) { void e; }                     // 手続きのキャンバスの地図帳は GPU から外す（使う材質は全部 PBR の色へ差し替えた）
    ENV.ready = true; return true;
  }).catch(e => { console.warn('townpbr', e); return false; });
  return ENV.loading;
}
/** toon の段：町の材質（手続きのキャンバス）を登録だけ（色の地図帳を後で差し替える） */
export function envRegisterToon(m) { ENV.toonMats.add(m); if (ENV.albedo) m.map = ENV.albedo; }

// ───────────── 区画・場所ごとの色の調整（data/envgrade.js の値） ─────────────
const _v = new THREE.Vector3();
export function envApplyGrade(g, dt = 1) {
  const k = Math.min(1, dt * 2.5);
  U.uExpo.value += (g.expo - U.uExpo.value) * k; U.uSat.value += (g.sat - U.uSat.value) * k; U.uContrast.value += (g.contrast - U.uContrast.value) * k;
  U.uLift.value.lerp(_v.set(...g.lift), k); U.uGain.value.lerp(_v.set(...g.gain), k);
  U.uWet.value += (g.wet - U.uWet.value) * k; U.uIblD.value += ((g.iblD ?? 0.45) - U.uIblD.value) * k; U.uGlow.value += ((g.glow ?? 1) - U.uGlow.value) * k;
  const envI = g.envI ?? 0.5;
  if (Math.abs(envI - ENV.envI) > 1e-3) { ENV.envI += (envI - ENV.envI) * k; for (const m of ENV.mats) m.envMapIntensity = ENV.envI; for (const m of ENV.vegMats) m.envMapIntensity = m.userData.envBase * ENV.envI * 2; }
  ENV.envKind = g.env || 'town';
  const want = ENV.P && ENV.P.ibl === false ? null : ENV.envMaps[ENV.envKind];
  if (want && ENV.envMap !== want) { ENV.envMap = want; for (const m of ENV.mats) m.envMap = want; for (const m of ENV.vegMats) if (m.envMap) m.envMap = want; }
}
export function envTick(dt) { U.uTime.value += dt; }

// ───────────── P16：植物（mapkit の AssetBank の PBR の材質）を町の色の調整に乗せる ─────────────
const GLSL_GRADE = /* glsl */`
uniform float uExpo; uniform vec3 uLift; uniform vec3 uGain; uniform float uSat; uniform float uContrast; uniform float uGradeOn; uniform float uIblD; uniform float uAmbK;
vec3 envGrade(vec3 c){
  if (uGradeOn < 0.5) return c;
  c *= uExpo;
  vec3 k = vec3(0.72); vec3 x = max(c - k, 0.0); c = min(c, k) + x / (1.0 + x / (1.0 - k) * 0.9);
  c = c * uGain + uLift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat);
  c = 0.18 * pow(max(c, 0.0) / 0.18, vec3(uContrast));
  return c;
}`;
/**
 * 植物の材質（mapkit/render/assets.js の AssetBank の adapt）：PBR の段＝町の材質と同じ色の調整（露出・肩・影と光の色・彩度）・空と周りの明かりを背景の側だけ弱める（uAmbK）・
 * 環境の光（夜の町／屋内の PMREM）。揺れ・透け（mapkit/render/wind.js の onBeforeCompile）は先に付いているので、その後ろに足す。
 * toon の段（スマホの低）は軽い Lambert（色の地図と頂点の AO・透過の切り抜き）へ置き換える＝人物の toon と同じ明るさの感じ。
 */
export function envVegMat(m, info = {}) {
  // 夜の町の光（月・街灯・灯りの窓）では、試験マップ（夕方の日）の葉の明るさ（カードの色 0.66 倍）だと黒い塊に見える＝葉と下草だけ明るく（読める夜の緑）
  const id = info.id || '', k = /hedge|tsutsuji/.test(id) ? 1.7 : /weed|grass|fern/.test(id) ? 1.75 : info.impostor ? 1.2 : info.card ? 1.4 : 1.0;
  if (k !== 1) m.color.multiplyScalar(k);
  if (!ENV.pbr) {
    const l = new THREE.MeshLambertMaterial({ map: m.map, color: m.color, vertexColors: m.vertexColors, alphaTest: m.alphaTest, side: m.side });
    l.name = m.name; if (m.userData.wind) l.userData.wind = m.userData.wind;
    return l;
  }
  const ob = m.onBeforeCompile, key = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    if (ob) ob.call(m, sh, r);
    for (const k of ['uExpo', 'uLift', 'uGain', 'uSat', 'uContrast', 'uGradeOn', 'uIblD', 'uAmbK']) sh.uniforms[k] = U[k];
    sh.fragmentShader = GLSL_GRADE + '\n' + sh.fragmentShader
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n  iblIrradiance *= uIblD;\n  #if defined( RE_IndirectDiffuse )\n    irradiance *= uAmbK;\n  #endif')
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb = envGrade(gl_FragColor.rgb);\n#include <tonemapping_fragment>');
  };
  m.customProgramCacheKey = () => (key ? key.call(m) : '') + '|envveg';
  m.userData.envBase = m.envMapIntensity ?? 0.5; m.envMap = ENV.envMap; m.envMapIntensity = m.userData.envBase * ENV.envI * 2;
  ENV.vegMats.add(m); m.needsUpdate = true;
  return m;
}
/** 画質の段で toon の町の材質を作る時（townmat.js から）：登録して後で色の地図帳を差し替える */
export function toonTownMats() { const r = townMatsToon(); envRegisterToon(r.tex); envRegisterToon(r.texglow); return r; }
export { gradientMap };
