// アニメ調の材質（トゥーン陰影＋輪郭線）。マテリアルはここに集約（GAME_INTEGRATION_SPEC §5）。
// 輪郭線：キャラクターは「裏返しの殻」（法線方向に膨らませた裏面を暗色で描く）。建物は辺の線（EdgesGeometry）。
import * as THREE from 'three';

let _grad = null;
/** 3 段の陰影（明・中・暗）。NearestFilter で境目をくっきり */
export function gradientMap() {
  if (_grad) return _grad;
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  _grad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.generateMipmaps = false; _grad.needsUpdate = true;
  return _grad;
}
const cache = new Map();
export function toon(color, opt = {}) {
  const key = 't' + color + JSON.stringify(opt);
  if (!opt.unique && cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradientMap() }, opt.params || {}));
  if (opt.emissive) { m.emissive = new THREE.Color(opt.emissive); m.emissiveIntensity = opt.emissiveIntensity || 1; }
  if (!opt.unique) cache.set(key, m);
  return m;
}

// 裏返しの殻の材質（共有）。厚さは uniform（m）。霧も効く。
const outlineMats = new Map();
export function outlineMaterial(thick = 0.012, color = 0x1a1022) {
  const key = thick + ':' + color;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uOutline = { value: thick };
    sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * uOutline;');
  };
  m.customProgramCacheKey = () => 'outline' + thick;
  m.userData.isOutline = true;
  outlineMats.set(key, m);
  return m;
}
/** メッシュに殻を足す（子として）。skip 指定のメッシュは除く */
export function addOutlines(root, thick = 0.012, color) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.noOutline && !(o.material && o.material.userData && o.material.userData.isOutline)) list.push(o); });
  for (const o of list) {
    const h = new THREE.Mesh(o.geometry, outlineMaterial(o.userData.outlineThick || thick, color));
    h.userData.isOutlineHull = true; h.castShadow = false; h.receiveShadow = false;
    h.renderOrder = o.renderOrder; o.add(h);
  }
}
export function setOutlinesVisible(root, v) { root.traverse(o => { if (o.userData.isOutlineHull || o.userData.isEdgeLines) o.visible = v; }); }

// ── キャラクター用（スキン網）：トゥーン＋縁の光（リムライト）＋当たった時の白い光＋黒い霧への崩れ（ディゾルブ） ──
let _cgrad = null;
/** キャラクター用の 3 段の陰影（影を明るめ＝アニメ調） */
export function charGradient() {
  if (_cgrad) return _cgrad;
  const data = new Uint8Array([105, 100, 120, 255, 190, 186, 200, 255, 255, 255, 255, 255]);
  _cgrad = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _cgrad.minFilter = _cgrad.magFilter = THREE.NearestFilter; _cgrad.generateMipmaps = false; _cgrad.needsUpdate = true;
  return _cgrad;
}
/**
 * キャラクターの材質。1 体ごとに別の実体（当たった光・崩れの値を個別に持つ）。GL のプログラムは共有される。
 * opt: { map, alphaTest, rim:0..1, rimColor, emissive }
 * 戻り値の material.userData.u = { rim, rimColor, flash, dissolve, edge }（uniform）
 */
export function charMaterial(opt = {}) {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: !opt.map, map: opt.map || null, gradientMap: charGradient(), alphaTest: opt.alphaTest || 0, transparent: false });
  if (opt.emissive) { m.emissive = new THREE.Color(opt.emissive); m.emissiveIntensity = opt.emissiveIntensity || 1; }
  const u = { uRim: { value: opt.rim ?? 0.55 }, uRimColor: { value: new THREE.Color(opt.rimColor ?? 0xb8a8ff) }, uFlash: { value: 0 }, uDissolve: { value: 0 }, uEdge: { value: new THREE.Color(0x6a3aa8) } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uRim; uniform vec3 uRimColor; uniform float uFlash; uniform float uDissolve; uniform vec3 uEdge; varying vec3 vWP;\n'
      + 'float shHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n'
      + 'float shNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(shHash(i), shHash(i+vec3(1,0,0)), f.x), mix(shHash(i+vec3(0,1,0)), shHash(i+vec3(1,1,0)), f.x), f.y), mix(mix(shHash(i+vec3(0,0,1)), shHash(i+vec3(1,0,1)), f.x), mix(shHash(i+vec3(0,1,1)), shHash(i+vec3(1,1,1)), f.x), f.y), f.z); }\n'
      + sh.fragmentShader
        .replace('void main() {', 'void main() {\n float shN = shNoise(vWP * 9.0) * 0.6 + shNoise(vWP * 23.0) * 0.4 + (vWP.y - 0.0) * 0.0;\n if (uDissolve > 0.0 && shN < uDissolve * 1.15 - 0.05 + (1.0 - clamp(vWP.y * 0.5, 0.0, 1.0)) * uDissolve * 0.25) discard;')
        .replace('#include <opaque_fragment>', ' { float rimK = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); outgoingLight += uRimColor * smoothstep(0.6, 0.82, rimK) * uRim * 0.55; }\n'
          + ' if (uDissolve > 0.0 && shN < uDissolve * 1.15 + 0.06) outgoingLight = mix(outgoingLight, uEdge * 1.6, 0.85);\n'
          + ' outgoingLight = mix(outgoingLight, vec3(1.0, 0.97, 1.0), uFlash);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'shchar' + (opt.map ? 'm' : 'v') + (opt.alphaTest ? 'a' : '');
  return m;
}
/**
 * スキン網の輪郭線（裏返しの殻）。頂点ごとの太さ（属性 oth）を掛ける。色・太さは 1 体ごと（ロックオン・見切りの青い縁に使う）。
 * 崩れ（uDissolve）も本体と同じ雑音で消える。
 */
export function skinOutlineMaterial(thick = 0.009, color = 0x1a1022) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: true });
  const u = { uOutline: { value: thick }, uDissolve: { value: 0 } };
  m.userData.u = u; m.userData.isOutline = true;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uOutline; attribute float oth; varying vec3 vWP;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * uOutline * oth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uDissolve; varying vec3 vWP;\nfloat shHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n'
      + 'float shNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(shHash(i), shHash(i+vec3(1,0,0)), f.x), mix(shHash(i+vec3(0,1,0)), shHash(i+vec3(1,1,0)), f.x), f.y), mix(mix(shHash(i+vec3(0,0,1)), shHash(i+vec3(1,0,1)), f.x), mix(shHash(i+vec3(0,1,1)), shHash(i+vec3(1,1,1)), f.x), f.y), f.z); }\n'
      + sh.fragmentShader.replace('void main() {', 'void main() {\n if (uDissolve > 0.0) { float shN = shNoise(vWP * 9.0) * 0.6 + shNoise(vWP * 23.0) * 0.4; if (shN < uDissolve * 1.15 + 0.02 + (1.0 - clamp(vWP.y * 0.5, 0.0, 1.0)) * uDissolve * 0.25) discard; }');
  };
  m.customProgramCacheKey = () => 'shskinoutline';
  return m;
}

/**
 * 炎の毛（妖気の揺らぎ）：スキン網の「glow」の組に使う加算の材質。頂点色＝炎の色（先ほど黒＝見えない）。
 * 属性 oth＝揺れの重み（根もと 0・先 1）。uTime で法線の向きに揺らぐ。uK：明るさ（暴走で上げる）、uTint：色を寄せる。
 */
export function flameMaterial(opt = {}) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const u = { uTime: { value: 0 }, uK: { value: opt.k ?? 1 }, uAmp: { value: opt.amp ?? 0.02 }, uTint: { value: new THREE.Color(opt.tint ?? 0xffffff) }, uTintK: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uTime; uniform float uAmp; attribute float oth; varying float vOth; varying float vFres;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * uAmp * oth * (0.55 + 0.45 * sin(uTime * 7.0 + position.y * 31.0 + position.x * 17.0 + position.z * 13.0));\n transformed.y += uAmp * oth * 1.4 * (0.5 + 0.5 * sin(uTime * 5.3 + position.z * 23.0));\n vOth = oth;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef USE_SKINNING\n vFres = abs(dot(normalize(transformedNormal), normalize(-mvPosition.xyz)));\n#else\n vFres = 1.0;\n#endif');
    sh.fragmentShader = 'uniform float uK; uniform vec3 uTint; uniform float uTintK; uniform float uTime; varying float vOth; varying float vFres;\n' + sh.fragmentShader
      .replace('#include <opaque_fragment>', ' outgoingLight = mix(outgoingLight, uTint * dot(outgoingLight, vec3(0.4)), uTintK) * uK * (0.82 + 0.18 * sin(uTime * 11.0 + vOth * 9.0)) * smoothstep(0.05, 0.75, vFres);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'shflame';
  return m;
}

/** 手続きで描くキャンバスの 2D 文脈：CPU で描く（willReadFrequently）。GPU の 2D 描画に積むと、最初の WebGL の同期（起動時）で
 *  その分を待たされる（ソフト描画の環境では 2 秒近く）。描き終わった絵は 1 回だけ WebGL へ上げる。 */
export function ctx2d(c) { return c.getContext('2d', { willReadFrequently: true }); }

/** 文字の看板などのキャンバス */
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = ctx2d(c); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData.canvas = c; t.userData.draw = draw;
  return t;
}
export const JP_FONT = '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP","Yu Gothic","Meiryo","IPAGothic","WenQuanYi Zen Hei",sans-serif';
export const JP_SERIF = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP","IPAMincho","IPAPMincho",serif';

// ── キャラクターの描画呼び出しを減らす：関節（動く節）ごとに、色だけ違うトゥーンの部品を 1 つの網にまとめる ──
let _vcToon = null;
function vcToon() { if (!_vcToon) _vcToon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }); return _vcToon; }
export function mergeRig(root, dynNames) {
  const isDyn = o => o === root || !o.parent || o.userData.dyn || dynNames.has(o.name);
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh || o.userData.isOutlineHull) return;
    let a = o.parent; while (!isDyn(a)) a = a.parent;
    const m = o.material;
    const plain = m && m.isMeshToonMaterial && !m.map && !(m.emissive && m.emissive.getHex());
    const key = a.uuid + '|' + (plain ? 'toon' : m.uuid) + '|' + (o.userData.noOutline ? 'n' : 'o') + '|' + (o.userData.outlineThick || 0) + '|' + (o.castShadow ? 's' : '');
    if (!buckets.has(key)) buckets.set(key, { a, plain, list: [], noOutline: !!o.userData.noOutline, thick: o.userData.outlineThick, shadow: o.castShadow, mat: m });
    buckets.get(key).list.push(o);
  });
  const inv = new THREE.Matrix4(), mm = new THREE.Matrix4();
  for (const b of buckets.values()) {
    if (b.list.length < 2 && !b.plain) continue;
    inv.copy(b.a.matrixWorld).invert();
    const geos = [];
    for (const o of b.list) {
      let g = o.geometry.clone(); if (!g.index) g = g; else g = g.toNonIndexed();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      mm.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(mm);
      if (b.plain) { const c = o.material.color, n = g.attributes.position.count, arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }
      geos.push(g);
      o.parent.remove(o);
    }
    const merged = mergeGeometriesLite(geos);
    const mesh = new THREE.Mesh(merged, b.plain ? vcToon() : b.mat);
    mesh.castShadow = b.shadow; if (b.noOutline) mesh.userData.noOutline = true; if (b.thick) mesh.userData.outlineThick = b.thick;
    b.a.add(mesh);
  }
}
function mergeGeometriesLite(list) {
  const names = Object.keys(list[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = list[0].attributes[n].itemSize; let total = 0; for (const g of list) total += g.attributes[n].count;
    const arr = new Float32Array(total * size); let off = 0;
    for (const g of list) { arr.set(g.attributes[n].array, off); off += g.attributes[n].count * size; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
