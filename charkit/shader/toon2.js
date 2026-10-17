// charkit アニメ調シェーダー v2（wakaba-toon/1）。docs/wakaba-charkit/12 フェーズ 3・14。three.js（版固定）の MeshToonMaterial を土台に、
// 光の計算（RE_Direct）を差し替える。1 体＝1 つの網のまま「材質の種類」を頂点の属性 mcls（0〜11 の番号）で持ち、種類ごとの値を uniform の配列で引く
// （描画呼び出しを増やさない）。中身：
//  ・種類ごとの段の陰影（しきい値・やわらかさ・影の色合い・2 段目の影）／肌・髪・布・金属・小物・毛
//  ・顔は「SDF 風の顔影」：頭の骨の向きに対する光の水平の角度で、影の境目を顔の左右へ動かす（鼻の周りで曲げる）。頭の網の法線は使わない
//    （＝作った網の凸凹で顔に汚い影が出ない）。首の上にはあごの影
//  ・髪の天使の輪（Kajiya-Kay の異方性のハイライトを段にしたもの・毛束ごとにずらす）
//  ・場面の光に合わせたリム（逆光で強く）＋演出用の一定のリム（uRim）
//  ・夜・逆光でも読める明るさの下限・場面の環境光の色に寄せる量・霧の効き
//  ・柄（しま・格子）を休みの姿勢の位置（属性 rp）で描く（頂点色の段々にならない）
//  ・顔の絵（目・口の地図帳）：目は「白目の形」「虹彩」「まぶた・まつ毛」の 3 層を重ね、虹彩は視線（uGaze）と奥行き（視差）でずれる。
//    口は表情の口と、母音の口の欄（a・i・u・e・o・閉じ）を uniform で切り替える（キャンバスを描き直さない）
// 輪郭線：裏返しの殻。太さは「m の値 × カメラまでの距離の倍率」（画面の上でほぼ一定の太さ。近すぎ・遠すぎは制限）。種類ごとの太さ・色（頂点色を暗くした色線）。
import * as THREE from 'three';

/** 種類の型（kind）：陰影の計算の分かれ道 */
export const KIND = { cloth: 0, skin: 1, face: 2, hair: 3, metal: 4, glow: 5, fur: 6, acc: 7, eye: 8 };
export const MAX_CLASSES = 12;
/** 柄 */
export const PATTERN = { none: 0, stripes: 1, plaid: 2, check: 3 };

const C = c => (c instanceof THREE.Color ? c : new THREE.Color(c));
/** 既定の種類（敵・町の人など設定の無いキャラクター）。名前 → 値 */
export const DEFAULT_CLASSES = {
  cloth: { kind: 'cloth', threshold: 0.5, softness: 0.06, shadeTint: [0.74, 0.72, 0.86], shade2Tint: [0.5, 0.48, 0.62], shade2Threshold: 0.2, rimK: 0.3, specular: 0, lineW: 1, lineTint: 1 },
  skin: { kind: 'skin', threshold: 0.48, softness: 0.05, shadeTint: [0.93, 0.74, 0.74], shade2Tint: [0.8, 0.58, 0.6], shade2Threshold: 0.15, rimK: 0.35, specular: 0, lineW: 0.75, lineTint: 1 },
  face: { kind: 'face', threshold: 0.5, softness: 0.06, shadeTint: [0.93, 0.76, 0.75], shade2Tint: [0.86, 0.66, 0.66], shade2Threshold: 0.1, rimK: 0.25, specular: 0, lineW: 0.6, lineTint: 1 },
  hair: { kind: 'hair', threshold: 0.47, softness: 0.035, shadeTint: [0.68, 0.64, 0.84], shade2Tint: [0.46, 0.42, 0.62], shade2Threshold: 0.18, rimK: 0.5, specular: 0.55, lineW: 1.1, lineTint: 1 },
  metal: { kind: 'metal', threshold: 0.5, softness: 0.02, shadeTint: [0.55, 0.55, 0.62], shade2Tint: [0.4, 0.4, 0.46], shade2Threshold: 0.2, rimK: 0.4, specular: 0.8, lineW: 0.7, lineTint: 0.6 },
  acc: { kind: 'acc', threshold: 0.5, softness: 0.04, shadeTint: [0.78, 0.68, 0.8], shade2Tint: [0.56, 0.48, 0.6], shade2Threshold: 0.2, rimK: 0.35, specular: 0.35, lineW: 0.9, lineTint: 1 },
  fur: { kind: 'fur', threshold: 0.42, softness: 0.12, shadeTint: [0.8, 0.78, 0.9], shade2Tint: [0.62, 0.6, 0.74], shade2Threshold: 0.15, rimK: 0.6, specular: 0, lineW: 0.8, lineTint: 1 },
  glow: { kind: 'glow', threshold: 0.5, softness: 0.1, shadeTint: [1, 1, 1], shade2Tint: [1, 1, 1], shade2Threshold: 0, rimK: 0, specular: 0, lineW: 0.4, lineTint: 1 },
  eye: { kind: 'eye', threshold: 0.4, softness: 0.1, shadeTint: [0.86, 0.84, 0.92], shade2Tint: [0.8, 0.78, 0.86], shade2Threshold: 0, rimK: 0, specular: 0, lineW: 0, lineTint: 1 },
};

/** "#rrggbb" の base と shade から影の色合い（掛け算の倍率）を作る */
export function tintFrom(base, shade) {
  const b = C(base), s = C(shade);
  const f = (x, y) => Math.max(0.15, Math.min(1.1, y / Math.max(0.04, x)));
  return [f(b.r, s.r), f(b.g, s.g), f(b.b, s.b)];
}
/** 材質の名前 → 種類の型（docs/wakaba-charkit/06 §4 の名前の規則） */
export function kindOfName(name) {
  if (/^face$/.test(name)) return 'face';
  if (/^skin/.test(name)) return 'skin';
  if (/^hair/.test(name)) return 'hair';
  if (/^metal|^glass/.test(name)) return 'metal';
  if (/^eye/.test(name)) return 'eye';
  if (/^acc/.test(name)) return 'acc';
  if (/^fur/.test(name)) return 'fur';
  if (/^glow/.test(name)) return 'glow';
  return 'cloth';
}

/**
 * 種類の表を作る。materials：{ 名前: { kind?, base?, shade?, shade2?, threshold, softness, shade2Threshold, rimK, specular, lineW, lineTint, pattern?:{type,scale,color} } }
 * （キャラクターの設定の shader.materials と同じ形。kind を省くと名前から決める）。
 * 戻り値：{ names, index(name)→番号, A,B,Cc,D,E: Vector4[]（uniform）, lineW: number[], lineTint: number[] }
 */
export function classTable(materials = {}, used = null) {
  const all = {};
  const resolve = n => {
    const m = (materials || {})[n]; const kind = (m && m.kind) || kindOfName(n); const base = Object.assign({}, DEFAULT_CLASSES[n] || DEFAULT_CLASSES[kind] || DEFAULT_CLASSES.cloth);
    if (m && m.base && m.shade) delete base.shadeTint;       // 設定の base・shade があればそちらの比で
    if (m && m.base && m.shade2) delete base.shade2Tint;
    return Object.assign(base, { kind }, m || {});
  };
  // 使う名前だけ（網が使う材質の名前）。無ければ既定＋設定の全部
  const list = used ? [...new Set(['cloth'].concat(used))] : [...new Set(Object.keys(DEFAULT_CLASSES).concat(Object.keys(materials || {})))];
  if (list.length > MAX_CLASSES) console.warn('[charkit] 材質の種類が ' + MAX_CLASSES + ' を超えています。後ろを切ります', list);
  for (const n of list.slice(0, MAX_CLASSES)) all[n] = resolve(n);
  const names = Object.keys(all);
  const A = [], B = [], Cc = [], D = [], E = [], lineW = [], lineTint = [];
  for (let i = 0; i < MAX_CLASSES; i++) {
    const m = all[names[i]] || DEFAULT_CLASSES.cloth;
    const sh = m.shadeTint || (m.base && m.shade ? tintFrom(m.base, m.shade) : DEFAULT_CLASSES.cloth.shadeTint);
    const sh2 = m.shade2Tint || (m.base && m.shade2 ? tintFrom(m.base, m.shade2) : sh.map(x => x * 0.78));
    const kind = KIND[m.kind || 'cloth'] ?? 0;
    const hl = m.highlight || {};
    A.push(new THREE.Vector4(m.threshold ?? 0.5, Math.max(0.005, m.softness ?? 0.05), m.rimK ?? 0.3, m.specular ?? (hl.strength || 0)));
    B.push(new THREE.Vector4(sh[0], sh[1], sh[2], kind));
    Cc.push(new THREE.Vector4(sh2[0], sh2[1], sh2[2], m.shade2Threshold ?? 0.0));
    const p = m.pattern || {}, pc = p.color ? C(p.color) : new THREE.Color(0xffffff);
    D.push(new THREE.Vector4(pc.r, pc.g, pc.b, PATTERN[p.type] || 0));
    E.push(new THREE.Vector4(p.scale || 10, hl.viewShift ?? 0.06, p.color2 ? C(p.color2).getHex() : -1, m.minLuma ?? -1));
    lineW.push(m.lineW ?? 1); lineTint.push(m.lineTint ?? 1);
  }
  return { names, index: n => { const i = names.indexOf(n); return i < 0 ? 0 : i; }, A, B, Cc, D, E, lineW, lineTint, defs: all };
}

// ───────────── GLSL ─────────────
const PARS = /* glsl */`
varying vec3 vViewPosition;
struct ToonMaterial { vec3 diffuseColor; };
uniform vec4 uCA[${MAX_CLASSES}]; uniform vec4 uCB[${MAX_CLASSES}]; uniform vec4 uCC[${MAX_CLASSES}];
uniform float uShadeFill; uniform float uBackRim; uniform float uRimWidth; uniform float uLightRim; uniform float uFaceSoft; uniform float uFaceMode;
// 1 画素ごとに main で決める値（光の関数から読む）
float gThr, gSoft, gRimK, gSpec, gKind, gThr2; vec3 gTint, gTint2;
vec3 gHL, gHU, gHF;           // 頭の左・上・前（視点の空間）
vec3 gFace;                    // 顔の上の位置（頭の半径で割る。x＋＝キャラクターの左）
vec3 gRimAcc; vec3 gSpecAcc; vec3 gIndirect; float gLitAcc; float gLitN;
vec3 gViewDir;
float toonRamp(float x, float t, float s) { return smoothstep(t - s, t + s, x); }
float faceShadowLit(vec3 L) {
  float lx = dot(L, gHL), lz = dot(L, gHF), ly = dot(L, gHU);
  float horiz = length(vec2(lx, lz));
  float a = horiz < 1e-3 ? 0.0 : atan(abs(lx), lz) / 3.14159265;   // 0：正面 0.5：横 1：真後ろ
  float side = lx >= 0.0 ? 1.0 : -1.0;
  float u = gFace.x * side;                                     // 光の側が ＋
  float b = mix(-1.3, 1.25, smoothstep(0.0, 0.9, a));            // 影の境目の位置（顔の幅の上で）
  float fy = gFace.y;
  float curve = 0.28 * (fy + 0.18) * (fy + 0.18);                // 「)」の形に曲げる（額と頬の下で境目が光の側へ寄る）
  float nose = 0.32 * exp(-((fy + 0.28) * (fy + 0.28)) / 0.035) * smoothstep(0.42, 0.05, abs(gFace.x)); // 鼻の周りは光が回り込む
  float lit = smoothstep(b - uFaceSoft, b + uFaceSoft, u - curve + nose * (1.0 - a));
  // 真上・真下からの光：顔の上下で
  float vert = smoothstep(-0.85, -0.35, ly / max(0.25, horiz + abs(ly)) + 0.0);
  return lit * mix(1.0, vert, smoothstep(0.55, 0.9, abs(ly)));
}
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  vec3 L = directLight.direction; vec3 N = geometryNormal;
  float ndl = dot(N, L);
  float hl = ndl * 0.5 + 0.5;
  // P13：段の境目のやわらかさ ＝ 種類の値（下限 0.04）＋画面の上の変わり方（fwidth）。低い網の三角形のぎざぎざの影・ちらつきを消す
  float dw = min(fwidth(hl) * 1.25, 0.12);
  gSoft = max(gSoft, 0.04) + dw;
  float k1, k2;
  if (gKind > 1.5 && gKind < 2.5 && uFaceMode > 0.5) {           // 顔：SDF 風
    float f = uFaceMode > 1.5 ? faceShadowLit(L) : 1.0;
    k1 = f; k2 = 1.0;
  } else {
    k1 = toonRamp(hl, gThr, gSoft);
    k2 = toonRamp(hl, gThr2, gSoft);
  }
  vec3 tint = mix(mix(gTint2, gTint, k2), vec3(1.0), k1);
  vec3 fill = mix(tint * uShadeFill, vec3(1.0), k1);
  reflectedLight.directDiffuse += directLight.color * fill * BRDF_Lambert( material.diffuseColor );
  float lum = dot(directLight.color, vec3(0.299, 0.587, 0.114));
  gLitAcc += k1 * lum; gLitN += lum;
  // 光に合わせたリム（逆光で強い）
  float back = clamp(-dot(L, geometryViewDir), 0.0, 1.0);
  float facing = clamp(ndl + 0.45, 0.0, 1.0);
  gRimAcc += directLight.color * facing * (0.35 + uBackRim * back);
  // 金属・小物：段の反射
  if (gSpec > 0.0 && (gKind > 3.5 && gKind < 4.5 || gKind > 6.5 && gKind < 7.5)) {
    vec3 H = normalize(L + geometryViewDir);
    float s = smoothstep(0.86, 0.9, dot(N, H)) * gSpec;
    gSpecAcc += directLight.color * s * k1;
  }
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  gIndirect += irradiance;
  // 環境光は向きで変えない（アニメ調：平らに足す）
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Toon
#define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
`;

const NOISE = /* glsl */`
float shHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float shNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(shHash(i), shHash(i+vec3(1,0,0)), f.x), mix(shHash(i+vec3(0,1,0)), shHash(i+vec3(1,1,0)), f.x), f.y), mix(mix(shHash(i+vec3(0,0,1)), shHash(i+vec3(1,0,1)), f.x), mix(shHash(i+vec3(0,1,1)), shHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
`;

/** 頭の向きの uniform を毎フレーム入れる（網の onBeforeRender から） */
function headUniforms() { return { uHeadM: { value: new THREE.Matrix4() }, uHeadC: { value: new THREE.Vector3(0, 0.1, 0) }, uHeadR: { value: 0.12 } }; }

/**
 * キャラクターの本体の材質（頂点色・属性 mcls・rp）／顔の絵の材質（opt.map）。1 体ごとに別の実体（値を個別に持つ）。
 * opt：{ table（classTable の戻り値）, map, alphaTest, rim, rimColor, emissive, face:{mode:'sdf'|'normal'|'flat', soft}, env:{ambientInfluence,minLuma,backlightRimBoost,fogInfluence},
 *        rimCfg:{width, lightDependent}, shadeFill, eyeLayers(bool), faceClass(番号) }
 * userData.u：{ uRim, uRimColor, uFlash, uDissolve, uEdge（今の材質と同じ名前）, uHeadM…, uGaze, uMouth（顔） }
 */
export function charMaterialV2(opt = {}) {
  const T = opt.table || classTable();
  const isFace = !!opt.map;
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: !isFace, map: opt.map || null, alphaTest: opt.alphaTest || 0, transparent: false });
  if (opt.emissive) { m.emissive = new THREE.Color(opt.emissive); m.emissiveIntensity = opt.emissiveIntensity || 1; }
  const env = opt.env || {}, face = opt.face || {}, rimCfg = opt.rimCfg || {};
  const fm = face.mode === 'flat' ? 1 : face.mode === 'none' || face.mode === 'normal' ? 0 : 2;
  const u = Object.assign({
    uRim: { value: opt.rim ?? 0.55 }, uRimColor: { value: new THREE.Color(opt.rimColor ?? 0xb8a8ff) }, uFlash: { value: 0 }, uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(0x6a3aa8) },
    uCA: { value: T.A }, uCB: { value: T.B }, uCC: { value: T.Cc }, uCD: { value: T.D }, uCE: { value: T.E },
    uShadeFill: { value: opt.shadeFill ?? 0.42 }, uBackRim: { value: env.backlightRimBoost ?? 0.6 }, uRimWidth: { value: rimCfg.width ?? 0.22 }, uLightRim: { value: rimCfg.lightDependent === false ? 0 : 1 },
    uFaceSoft: { value: face.soft ?? 0.07 }, uFaceMode: { value: fm },
    uMinLuma: { value: env.minLuma ?? 0.16 }, uEnvK: { value: env.ambientInfluence ?? 0.3 }, uFogK: { value: env.fogInfluence ?? 0.65 },
    uFaceCls: { value: opt.faceClass ?? T.index('face') },
    uGaze: { value: new THREE.Vector2(0, 0) }, uIrisDepth: { value: opt.irisDepth ?? 0.035 }, uEyeLayers: { value: opt.eyeLayers ? 1 : 0 },
    uMouth: { value: new THREE.Vector3(-1, -1, 0) },   // 口の欄 a・b と混ぜ具合（-1＝表情の口）
  }, headUniforms());
  m.userData.u = u; m.userData.isCharV2 = true;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    let vs = sh.vertexShader;
    vs = 'varying vec3 vWP; varying float vCls; varying vec3 vRP;\n' + (isFace ? '' : 'attribute float mcls; attribute vec3 rp;\n') + vs;
    vs = vs.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\n'
      + (isFace ? ' vCls = -1.0; vRP = vec3(0.0);' : ' vCls = mcls; vRP = rp;'));
    sh.vertexShader = vs;
    let fs = sh.fragmentShader;
    fs = 'varying vec3 vWP; varying float vCls; varying vec3 vRP;\n'
      + 'uniform float uRim; uniform vec3 uRimColor; uniform float uFlash; uniform float uDissolve; uniform vec3 uEdge;\n'
      + 'uniform vec4 uCD[' + MAX_CLASSES + ']; uniform vec4 uCE[' + MAX_CLASSES + ']; uniform float uMinLuma; uniform float uEnvK; uniform float uFogK; uniform float uFaceCls;\n'
      + 'uniform mat4 uHeadM; uniform vec3 uHeadC; uniform float uHeadR; uniform vec2 uGaze; uniform float uIrisDepth; uniform float uEyeLayers; uniform vec3 uMouth;\n'
      + NOISE + fs;
    fs = fs.replace('#include <lights_toon_pars_fragment>', PARS);
    // 消える（黒い霧）
    fs = fs.replace('void main() {', 'void main() {\n float shN = shNoise(vWP * 9.0) * 0.6 + shNoise(vWP * 23.0) * 0.4;\n if (uDissolve > 0.0 && shN < uDissolve * 1.15 - 0.05 + (1.0 - clamp(vWP.y * 0.5, 0.0, 1.0)) * uDissolve * 0.25) discard;\n'
      + ' int ci = ' + (isFace ? 'int(uFaceCls + 0.5)' : 'int(clamp(floor(vCls + 0.5), 0.0, ' + (MAX_CLASSES - 1) + '.0))') + ';\n'
      + ' vec4 cA = uCA[ci], cB = uCB[ci], cC = uCC[ci], cD = uCD[ci], cE = uCE[ci];\n'
      + ' gThr = cA.x; gSoft = cA.y; gRimK = cA.z; gSpec = cA.w; gTint = cB.xyz; gKind = cB.w; gTint2 = cC.xyz; gThr2 = cC.w;\n'
      + ' gRimAcc = vec3(0.0); gSpecAcc = vec3(0.0); gIndirect = vec3(0.0); gLitAcc = 0.0; gLitN = 0.0;\n'
      + ' { vec3 hc = (uHeadM * vec4(uHeadC, 1.0)).xyz; vec3 ax = normalize(mat3(uHeadM)[0]), ay = normalize(mat3(uHeadM)[1]), az = normalize(mat3(uHeadM)[2]);\n'
      + '   vec3 p = vWP - hc; gFace = vec3(dot(p, ax), dot(p, ay), dot(p, az)) / max(uHeadR, 1e-3);\n'
      + '   gHL = normalize((viewMatrix * vec4(ax, 0.0)).xyz); gHU = normalize((viewMatrix * vec4(ay, 0.0)).xyz); gHF = normalize((viewMatrix * vec4(az, 0.0)).xyz); }\n');
    if (isFace) {
      // 目の 3 層・口の欄（地図帳 512×256：左半分が今の配置、右半分に虹彩・白目の形・口の欄）
      fs = fs.replace('#include <map_fragment>', /* glsl */`
  vec2 fuv = vMapUv;
  vec4 sampledDiffuseColor;
  // 目の区画（画素 0..128 × 0..128 → uv x 0..0.25, y 0.5..1）
  if (uEyeLayers > 0.5 && fuv.x < 0.25 && fuv.y > 0.5) {
    vec3 vV = normalize(cameraPosition - vWP);
    vec3 hx = normalize(mat3(uHeadM)[0]), hy = normalize(mat3(uHeadM)[1]);
    float sideSign = gFace.x >= 0.0 ? 1.0 : -1.0;              // 右の目は左右を写した絵
    vec2 par = vec2(dot(vV, hx) * sideSign, dot(vV, hy)) * uIrisDepth;
    vec2 g = vec2(uGaze.x * sideSign, uGaze.y);
    vec2 off = -(g * vec2(0.07, 0.05)) + par;                 // 視線のずれ（区画の幅の割合）＋視差
    vec4 ov = texture2D(map, fuv);
    vec4 sc = texture2D(map, fuv + vec2(0.75, 0.0));
    vec4 ir = texture2D(map, clamp(fuv + vec2(0.5, 0.0) - off, vec2(0.5, 0.5), vec2(0.75, 1.0)));
    vec3 col = sc.rgb;
    col = mix(col, ir.rgb, ir.a * sc.a);
    col = mix(col, ov.rgb, ov.a);
    sampledDiffuseColor = vec4(col, max(sc.a, ov.a));
  } else if (uMouth.x >= 0.0 && fuv.x > 0.25 && fuv.x < 0.5 && fuv.y > 0.625 && fuv.y < 0.8125) {
    // 口の区画（画素 128..256 × 48..96）→ 口の欄（画素 256..512 × 128..256、1 欄 64×24）
    vec2 q = vec2((fuv.x - 0.25) / 0.25, (fuv.y - 0.625) / 0.1875);
    float sa = uMouth.x, sb = uMouth.y < 0.0 ? uMouth.x : uMouth.y;
    vec2 ca = vec2(0.5 + mod(sa, 4.0) * 0.125, 0.5 - (floor(sa / 4.0) + 1.0) * 0.09375);
    vec2 cb = vec2(0.5 + mod(sb, 4.0) * 0.125, 0.5 - (floor(sb / 4.0) + 1.0) * 0.09375);
    vec4 a = texture2D(map, ca + q * vec2(0.125, 0.09375));
    vec4 b = texture2D(map, cb + q * vec2(0.125, 0.09375));
    sampledDiffuseColor = mix(a, b, uMouth.z);
  } else sampledDiffuseColor = texture2D(map, fuv);
  diffuseColor *= sampledDiffuseColor;`);
    } else {
      // 柄（休みの姿勢の位置で）
      fs = fs.replace('#include <color_fragment>', /* glsl */`
  #include <color_fragment>
  if (cD.w > 0.5) {
    float s = cE.x; vec3 pc = cD.rgb;
    if (cD.w < 1.5) {                                        // しま（横）
      float v = fract(vRP.y * s); float w = fwidth(vRP.y * s) * 0.75 + 0.01;
      float band = smoothstep(0.5 - w, 0.5 + w, v) * (1.0 - smoothstep(1.0 - w, 1.0, v));
      diffuseColor.rgb = mix(diffuseColor.rgb, pc, band);
    } else {                                                 // 格子（タータン風：太い線と細い線）
      float hx = fract(vRP.y * s), hz = fract((vRP.x + vRP.z * 0.8) * s);
      float wy = fwidth(vRP.y * s) + 0.02, wx = fwidth((vRP.x + vRP.z * 0.8) * s) + 0.02;
      float l1 = smoothstep(0.42 - wy, 0.42, hx) * (1.0 - smoothstep(0.58, 0.58 + wy, hx));
      float l2 = smoothstep(0.42 - wx, 0.42, hz) * (1.0 - smoothstep(0.58, 0.58 + wx, hz));
      float t1 = smoothstep(0.08 - wy, 0.08, hx) * (1.0 - smoothstep(0.12, 0.12 + wy, hx));
      float t2 = smoothstep(0.08 - wx, 0.08, hz) * (1.0 - smoothstep(0.12, 0.12 + wx, hz));
      vec3 c = diffuseColor.rgb;
      c = mix(c, pc * 0.7 + c * 0.3, max(l1, l2) * 0.38);
      c = mix(c, pc * 0.5, l1 * l2 * 0.3);
      c = mix(c, pc * 1.2, max(t1, t2) * 0.4);
      diffuseColor.rgb = c;
    }
  }`);
    }
    // 光の前：視点の向き
    fs = fs.replace('#include <lights_fragment_begin>', ' gViewDir = normalize(vViewPosition);\n#include <lights_fragment_begin>');
    fs = fs.replace('#include <opaque_fragment>', /* glsl */`
  {
    vec3 N = normalize(normal);
    vec3 base = diffuseColor.rgb;
    float ndv = clamp(dot(N, gViewDir), 0.0, 1.0);
    float fres = 1.0 - ndv;
    float rimMask = smoothstep(1.0 - uRimWidth - 0.06, 1.0 - uRimWidth + 0.06, fres);
    // 髪の天使の輪：頭の上下の向きを毛の流れとみなし（Kajiya-Kay）、毛束ごとにずらして段にする
    if (gKind > 2.5 && gKind < 3.5 && gSpec > 0.0) {
      vec3 T = normalize(gHU - N * dot(N, gHU) + 1e-4);
      float ang = atan(gFace.x, gFace.z);
      // P13：ずらしを小さく・境目をやわらかく（ぎざぎざの白い縞にしない）。輪は頭の上の帯だけ
      float jit = sin(ang * 23.0) * 0.5 + sin(ang * 9.0) * 0.5;
      vec3 Ts = normalize(T + N * (cE.y * 6.0 + jit * 0.045 - 0.05));
      vec3 Lr = normalize(gViewDir + gHU * 0.55);
      vec3 H = normalize(Lr + gViewDir);
      float th = dot(Ts, H);
      float kk = pow(max(0.0, 1.0 - th * th), 56.0);
      float band = smoothstep(0.5, 0.78, kk) * smoothstep(0.12, 0.42, gFace.y) * (1.0 - smoothstep(0.82, 1.05, gFace.y)) * smoothstep(0.3, 0.7, ndv) * 0.8;
      float lit = gLitN > 1e-4 ? gLitAcc / gLitN : 0.5;
      vec3 env = gIndirect + vec3(gLitN);
      float lum = clamp(dot(env, vec3(0.333)), 0.25, 1.6);
      outgoingLight += mix(base, vec3(1.0), 0.45) * band * gSpec * (0.4 + 0.6 * lit) * lum * 0.5;
    }
    outgoingLight += gSpecAcc * mix(base, vec3(1.0), 0.6) * 0.5;
    // 場面の光のリム＋演出のリム
    outgoingLight += gRimAcc * rimMask * gRimK * mix(base, vec3(1.0), 0.45) * 0.3 * uLightRim;
    outgoingLight += uRimColor * smoothstep(0.6, 0.82, fres) * uRim * 0.5;
    // 場面の環境光の色に寄せる
    float il = dot(gIndirect, vec3(0.299, 0.587, 0.114));
    vec3 envTint = il > 1e-4 ? clamp(gIndirect / il, vec3(0.4), vec3(1.8)) : vec3(1.0);
    outgoingLight *= mix(vec3(1.0), envTint, uEnvK * 0.35);
    // 夜・逆光でも読める明るさの下限
    float minL = cE.w >= 0.0 ? cE.w : uMinLuma;
    outgoingLight = max(outgoingLight, base * minL);
    if (gKind > 4.5 && gKind < 5.5) outgoingLight = max(outgoingLight, base);
    if (uDissolve > 0.0 && shN < uDissolve * 1.15 + 0.06) outgoingLight = mix(outgoingLight, uEdge * 1.6, 0.85);
    outgoingLight = mix(outgoingLight, vec3(1.0, 0.97, 1.0), uFlash);
  }
#include <opaque_fragment>`);
    // 霧の効き（キャラクターは背景より霧を薄く＝読める）
    fs = fs.replace('#include <fog_fragment>', /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor * uFogK );
#endif`);
    sh.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => 'ckToon2' + (isFace ? 'f' : 'b') + (opt.alphaTest ? 'a' : '');
  return m;
}

/**
 * 輪郭線（裏返しの殻）v2。太さ＝uOutline(m)×頂点の oth×種類の太さ×カメラまでの距離の倍率（画面でほぼ一定）。
 * 色＝color と頂点色を暗くした色を uLineTint で混ぜる（色線）。uniform：uOutline・uDissolve（今と同じ名前）・uRefDist・uMinK・uMaxK・uLineTint・uLineDark
 */
export function outlineMaterialV2(opt = {}) {
  const T = opt.table || classTable();
  const m = new THREE.MeshBasicMaterial({ color: opt.color ?? 0x1a1022, side: THREE.BackSide, fog: true, vertexColors: true });
  const u = {
    uOutline: { value: opt.thick ?? 0.0085 }, uDissolve: { value: 0 }, uRefDist: { value: opt.refDist ?? 3.5 }, uMinK: { value: opt.minK ?? 0.3 }, uMaxK: { value: opt.maxK ?? 2.2 },
    uLineTint: { value: opt.lineTint ?? 0 }, uLineDark: { value: opt.lineDark ?? 0.32 }, uLineW: { value: T.lineW.slice() }, uLineCT: { value: T.lineTint.slice() },
  };
  m.userData.u = u; m.userData.isOutline = true;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uOutline; uniform float uRefDist; uniform float uMinK; uniform float uMaxK; uniform float uLineTint; uniform float uLineW[' + MAX_CLASSES + ']; uniform float uLineCT[' + MAX_CLASSES + '];\nattribute float oth; attribute float mcls; varying vec3 vWP; varying float vLineK;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', ' int ci = int(clamp(floor(mcls + 0.5), 0.0, ' + (MAX_CLASSES - 1) + '.0));\n float dCam = max(0.05, -(modelViewMatrix * vec4(position, 1.0)).z);\n float kd = clamp(dCam / uRefDist, uMinK, uMaxK);\n vec3 transformed = position + normalize(normal) * uOutline * oth * uLineW[ci] * kd;\n vLineK = uLineTint * uLineCT[ci];')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uDissolve; uniform float uLineDark; varying vec3 vWP; varying float vLineK;\n' + NOISE
      + sh.fragmentShader
        .replace('#include <color_fragment>', '#ifdef USE_COLOR\n diffuseColor.rgb = mix(diffuseColor.rgb, vColor.rgb * uLineDark, vLineK);\n#endif')
        .replace('void main() {', 'void main() {\n if (uDissolve > 0.0) { float shN = shNoise(vWP * 9.0) * 0.6 + shNoise(vWP * 23.0) * 0.4; if (shN < uDissolve * 1.15 + 0.02 + (1.0 - clamp(vWP.y * 0.5, 0.0, 1.0)) * uDissolve * 0.25) discard; }');
  };
  m.customProgramCacheKey = () => 'ckOutline2';
  return m;
}

/** 頭の向きの uniform を網の描画の直前に入れる（mesh.onBeforeRender）。head：骨、hcLocal：頭の骨の中の頭の中心、R：頭の半径 */
export function bindHead(mesh, mats, head, hcLocal, R) {
  for (const m of mats) if (m && m.userData.u && m.userData.u.uHeadM) { m.userData.u.uHeadC.value.copy(hcLocal); m.userData.u.uHeadR.value = R; }
  const set = () => { for (const m of mats) if (m && m.userData.u && m.userData.u.uHeadM) m.userData.u.uHeadM.value.copy(head.matrixWorld); };
  const prev = mesh.onBeforeRender;
  mesh.onBeforeRender = function (...a) { set(); if (prev) prev.apply(this, a); };
  return set;
}
