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

/** 文字の看板などのキャンバス */
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
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
