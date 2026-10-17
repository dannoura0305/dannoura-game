// 夕暮れの空・環境光（PMREM）・高さの霧・日の光（docs/wakaba-mapkit/07 §6.1・11）。three.js を使う。写実の試験マップ（mapkit.html）だけ。
// ・空：大きな球に式で描く（天頂の青紫 → 地平の霞 → 日の側の橙の輝き・薄い雲）。HDR の値（トーンマップの前）
// ・環境光：空の場面を PMREMGenerator で 1 回だけ焼く（反射と拡散の両方）
// ・霧：three.js の霧の部品（ShaderChunk）を差し替えて「高さの霧」に：低い所ほど濃い（heightFalloff）・日の方向は暖かい色。
//   ShaderChunk は同じページの全部の材質に効く＝境界侵食（別のページ）には効かない
import * as THREE from 'three';

const v3 = a => `vec3(${a.map(x => x.toFixed(5)).join(', ')})`;

/** 日の向き（世界）：spec.atmosphere.sunElevDeg（地平からの角度）・西（−x）寄り。light＝光の向きは最低 minLightDeg（低すぎると全部が影になる） */
export function sunDirs(atm = {}, minLightDeg = 9) {
  const e = (atm.sunElevDeg ?? 4) * Math.PI / 180, el = Math.max(e, minLightDeg * Math.PI / 180), az = -0.28;
  const d = (a) => new THREE.Vector3(-Math.cos(a) * Math.cos(az), Math.sin(a), -Math.cos(a) * Math.sin(-az)).normalize();
  return { sky: d(e), light: d(el) };
}

/** 高さの霧の ShaderChunk を入れる（1 回だけ）。k＝高さの減り方・base＝濃さの基準の高さ（m） */
export function installHeightFog({ k = 0.08, base = 11, sunDir, sunFog = [1.0, 0.55, 0.32] }) {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = `#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vMkWPos;\n#endif`;
  C.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  #ifdef USE_INSTANCING
    vMkWPos = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
  #else
    vMkWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
  #endif
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vMkWPos;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  vec3 mkV = vMkWPos - cameraPosition; float mkD = length(mkV); vec3 mkDir = mkV / max(mkD, 1e-4);
  #ifdef FOG_EXP2
    float mkT = ${k.toFixed(5)} * mkV.y;
    float mkF = abs(mkT) > 1e-3 ? (1.0 - exp(-mkT)) / mkT : 1.0;
    float mkAmt = fogDensity * mkD * exp(-${k.toFixed(5)} * (cameraPosition.y - ${base.toFixed(3)})) * mkF;
    float fogFactor = 1.0 - exp(-mkAmt);
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  float mkSun = pow(max(dot(mkDir, ${v3(sunDir.toArray())}), 0.0), 5.0);
  vec3 mkCol = mix(fogColor, fogColor * ${v3(sunFog)} * 2.2, mkSun * 0.5);
  gl_FragColor.rgb = mix( gl_FragColor.rgb, mkCol, clamp(fogFactor, 0.0, 1.0) );
#endif`;
}

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `
varying vec3 vDir; uniform vec3 uSun; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGlow; uniform vec3 uFog; uniform float uTime;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float up = d.y;
  float h = clamp(up, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.45));
  float cs = max(dot(d, uSun), 0.0);
  float az = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0), 2.0);
  col += uGlow * (pow(cs, 6.0) * 0.9 + pow(cs, 48.0) * 1.6) * (1.0 - h * 0.6);
  col += uGlow * az * 0.35 * exp(-h * 6.0);
  col += vec3(4.0, 2.6, 1.6) * smoothstep(0.9993, 0.9998, cs);
  // 薄い雲（地平の近く・日の側は下が明るい）
  if (up > 0.0) {
    vec2 uv = d.xz / (up + 0.12) * 1.6;
    float c = smoothstep(0.45, 0.85, fbm(uv + vec2(uTime * 0.004, 0.0)));
    vec3 cc = mix(uHorizon * 0.8, uGlow * 1.1, pow(cs, 3.0)) * (0.65 + 0.35 * fbm(uv * 3.0));
    col = mix(col, cc, c * 0.55 * smoothstep(0.0, 0.08, up) * (1.0 - smoothstep(0.4, 0.8, up)));
  }
  // 地平の下は霧の色
  col = mix(col, uFog, smoothstep(0.02, -0.12, up));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** 空の球。colors は線形（HDR） */
export function makeSky(sunSky, fogColor) {
  const u = {
    uSun: { value: sunSky.clone() }, uZenith: { value: new THREE.Color(0.075, 0.095, 0.2) }, uHorizon: { value: new THREE.Color(0.42, 0.36, 0.38) },
    uGlow: { value: new THREE.Color(1.25, 0.55, 0.24) }, uFog: { value: fogColor.clone() }, uTime: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
  m.toneMapped = true;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), m);
  sky.scale.setScalar(150); sky.frustumCulled = false; sky.renderOrder = -10;   // 毎フレーム カメラの位置へ・大きさは far×0.9（scene.js）
  return sky;
}

/** 空から環境光（PMREM）を作る */
export function makeEnvironment(renderer, sky) {
  const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene(), s2 = sky.clone();
  s2.material = sky.material.clone(); s2.material.toneMapped = false; s2.scale.setScalar(100); sc.add(s2);
  // 地面からの照り返し（暗い土）
  const g = new THREE.Mesh(new THREE.CircleGeometry(90, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.045, 0.035) })); g.position.y = -2; sc.add(g);
  const rt = pm.fromScene(sc, 0.02, 0.1, 200);
  pm.dispose(); s2.geometry.dispose();
  return rt.texture;
}

/** 日の光（橙・低い）・空の光（青紫／土）。shadow＝段の影の設定 */
export function makeLights(scene, sunLight, P) {
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.55, 0.6, 0.85), new THREE.Color(0.22, 0.17, 0.12), 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.76, 0.56), 3.0);
  sun.position.copy(sunLight).multiplyScalar(150); scene.add(sun); scene.add(sun.target);
  if (P.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(P.shadowSize, P.shadowSize);
    const s = sun.shadow.camera, R = P.shadowRange || 40; s.left = s.bottom = -R; s.right = s.top = R; s.near = 1; s.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 2;
  }
  return { hemi, sun };
}
