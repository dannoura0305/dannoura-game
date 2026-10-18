// 素材ライブラリ（wakaba-assets/catalog.json）からブラウザ版の材質（PBR）と部品（glb）を読む。three.js・DOM を使う。
// ・目録の web の門が pass の素材だけを使う（block の物は読まない＝灰色の箱のまま）
// ・材質：albedo（sRGB）・normal（OpenGL）・orh（R＝AO・G＝粗さ・B＝高さ）。段の texMax 以下の一番大きい WebP。UV はメートル（repeat＝1/tileM）
// ・部品：glb の節 LOD<n>／v<k>_LOD<n>／IMP。材質の名前（mat.*）を共有の材質に差し替える（頂点の色＝AO を使う）
// ・テクスチャの量（GPU）は texBytes で数えて stats.texMB に出す
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pickTexSize, texBytes } from './quality.js';
import { patchWind } from './wind.js';

const LIB = 'wakaba-assets/';

export class AssetBank {
  /**
   * opt：onProgress(done, pending)・adapt(material, info)＝作った材質を作品の側で手直しする所（境界侵食 P16：色の調整・軽い材質。無ければそのまま＝山の廃村は今まで通り）・
   * lib＝素材ライブラリの URL（無ければページからの相対 'wakaba-assets/'）
   */
  constructor(renderer, P, { onProgress, adapt, lib } = {}) {
    this.renderer = renderer; this.P = P; this.catalog = null; this.byId = new Map(); this.adapt = adapt || (m => m); this.lib = lib || LIB;
    this.tex = new Map(); this.mats = new Map(); this.kits = new Map(); this.stats = { texBytes: 0, textures: 0, glbBytes: 0, kits: 0, failed: [] };
    this.loader = new THREE.TextureLoader(); this.gltf = new GLTFLoader(); this.onProgress = onProgress || (() => {});
    this.pending = 0; this.done = 0; this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  async loadCatalog() {
    try {
      const r = await fetch(this.lib + 'catalog.json'); if (!r.ok) throw new Error(r.status);
      this.catalog = await r.json();
      for (const e of this.catalog.entries || []) if (e.targets && e.targets.web && e.targets.web.result === 'pass') this.byId.set(e.id, e);
    } catch (e) { this.catalog = { entries: [] }; this.stats.failed.push('catalog: ' + e.message); }
    return this;
  }
  has(id) { return this.byId.has(id); }
  _track(p) { this.pending++; this.onProgress(this.done, this.pending); return p.finally(() => { this.done++; this.onProgress(this.done, this.pending); }); }
  /** 材質の 1 枚（kind＝albedo|normal|orh）のテクスチャ。size を省くと段の texMax */
  texture(id, kind, size = null) {
    const e = this.byId.get(id); if (!e || !e.material) return null;
    const bySize = e.material.maps[kind]; if (!bySize) return null;
    const s = size || pickTexSize(Object.keys(bySize).map(Number), this.P.texMax);
    const key = `${id}/${kind}/${s}`; if (this.tex.has(key)) return this.tex.get(key);
    const url = `${this.lib}entries/${e.dir}/web/${bySize[s]}`;
    const t = new THREE.Texture(); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = kind === 'albedo' || kind === 'normal' ? this.maxAniso : 1;
    t.colorSpace = kind === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.name = key;
    // KTX2（フェーズ 4・?tex=ktx2）：同じ名前の .ktx2 が目録の web にあれば、GPU の中で圧縮のまま使う。読めなければ WebP
    const kf = this.P.ktx2 ? bySize[s].replace(/\.webp$/, '.ktx2') : null, hasK = kf && e.web.some(w => w.file === `web/${kf}`);
    const loadWebp = res => this.loader.load(url, img => { t.image = img.image || img; t.needsUpdate = true; this.stats.texBytes += texBytes(s); this.stats.textures++; res(t); }, undefined, () => { this.stats.failed.push(url); res(t); });
    t.userData.ready = this._track(new Promise(res => {
      if (!hasK) return loadWebp(res);
      this._ktx2().then(L => {
        if (!L) return loadWebp(res);
        L.load(`${this.lib}entries/${e.dir}/web/${kf}`, ct => {
          ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.anisotropy = t.anisotropy; ct.colorSpace = t.colorSpace; ct.flipY = false; ct.name = key + '.ktx2'; ct.repeat.copy(t.repeat);
          t.userData.replacement = ct; this.stats.ktx2 = (this.stats.ktx2 || 0) + 1; this.stats.textures++;
          this.stats.texBytes += (ct.mipmaps || []).reduce((a, m) => a + (m.data ? m.data.byteLength : 0), 0) || texBytes(s) / 4;
          res(t);
        }, undefined, () => { this.stats.failed.push('ktx2:' + kf); loadWebp(res); });
      });
    }));
    // TextureLoader は Texture を返すので、画像だけを移す
    this.tex.set(key, t); return t;
  }
  /** 材質の画像（canvas 用の ImageBitmap 等）を取る：地面の配列テクスチャ用 */
  async image(id, kind, size) {
    const e = this.byId.get(id); if (!e || !e.material) return null;
    const bySize = e.material.maps[kind]; if (!bySize) return null;
    const s = pickTexSize(Object.keys(bySize).map(Number), size);
    const url = `${this.lib}entries/${e.dir}/web/${bySize[s]}`;
    return this._track(fetch(url).then(r => r.blob()).then(b => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then(img => ({ img, size: s })).catch(() => { this.stats.failed.push(url); return null; }));
  }
  tile(id) { const e = this.byId.get(id); return e && e.material ? e.material.tileM : 1; }
  /**
   * 共有の PBR 材質。opt：{ tangents（glb の接線あり＝normalScale.y +1、無い＝−1）, vc（頂点の色＝AO）, alpha（透過の切り抜き）, double, wind, color }
   * 同じ組み合わせなら同じ物（描画の切り替えを減らす）
   */
  material(id, opt = {}) {
    const key = `${id}|${opt.tangents ? 't' : 'd'}|${opt.vc ? 'v' : ''}|${opt.wind || ''}|${opt.double ? 2 : 1}|${opt.translucent ? 'T' : ''}`;
    if (this.mats.has(key)) return this.mats.get(key);
    const e = this.byId.get(id), M = e && e.material;
    const alpha = !!(M && M.alpha), tile = M ? M.tileM : 1;
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, vertexColors: !!opt.vc, side: opt.double || alpha ? THREE.DoubleSide : THREE.FrontSide, alphaTest: alpha ? 0.5 : 0, envMapIntensity: 0.6 });
    m.name = id;
    if (M) {
      const rep = new THREE.Vector2(1 / tile, 1 / tile);
      const a = this.texture(id, 'albedo'), n = this.P.albedoOnly ? null : this.texture(id, 'normal'), o = this.P.albedoOnly ? null : this.texture(id, 'orh');   // albedoOnly：色だけ（境界侵食のスマホの段）
      for (const t of [a, n, o]) if (t) t.repeat.copy(rep);
      m.map = a; if (n) { m.normalMap = n; m.normalScale = new THREE.Vector2(1, opt.tangents ? 1 : -1).multiplyScalar(M.card ? 0.6 : 1); }
      if (o) { m.roughnessMap = o; m.aoMap = o; m.aoMapIntensity = 0.85; }
      if (M.card) { m.alphaToCoverage = !!(this.P.post && this.P.post.msaa) || (!this.P.post && !!this.P.antialias); m.shadowSide = THREE.DoubleSide; m.envMapIntensity = 0.25; m.color.setScalar(0.66); m.roughnessMap = null; m.roughness = 1; }   // 葉：つやを出さない（逆光で白くならない）。MSAA がある段は縁を alpha-to-coverage でなめらかに
    } else { m.color.setRGB(0.5, 0.5, 0.5); m.roughness = 0.9; }
    if (opt.color) m.color.set(opt.color);
    if ((opt.wind && this.P.wind) || opt.translucent) patchWind(m, this.P.wind ? opt.wind : null, { translucent: !!opt.translucent });
    const out = this.adapt(m, { id, card: !!(M && M.card) });
    this.mats.set(key, out); return out;
  }
  /** 部品（glb）を読む → { id, nodes: { LOD0: [{geometry, material}], ... }, variants, lodDist, impostor } */
  kit(id) {
    if (this.kits.has(id)) return this.kits.get(id);
    const e = this.byId.get(id);
    const mo = this.P.meshopt !== false ? e && e.kit && e.web.find(w => w.file.endsWith('.mo.glb')) : null;
    const p = !e || !e.kit ? Promise.resolve(null) : this._track((mo ? this._meshopt() : Promise.resolve(false)).then(okMo => new Promise(res => {
      const f = okMo && mo ? mo : e.web.find(w => w.file.endsWith('.glb') && !w.file.endsWith('.mo.glb'));
      this.gltf.load(`${this.lib}entries/${e.dir}/${f.file}`, g => {
        this.stats.glbBytes += f.bytes; this.stats.kits++; if (f === mo) this.stats.meshopt = (this.stats.meshopt || 0) + 1;
        const nodes = {};
        g.scene.updateMatrixWorld(true);
        g.scene.traverse(o => {
          if (!o.isMesh) return;
          let n = o; while (n.parent && n.parent !== g.scene) n = n.parent;    // 節（LOD0 など）の名前は一番上の物
          const name = n.name.replace(/\.\d+$/, '');
          const geo = toFloat(o.geometry.clone()); geo.applyMatrix4(o.matrixWorld);
          if (name === 'IMP') {     // 遠景の板：法線を幹から外向き＋上向きに（柔らかい陰影）・接線は使わない
            const p = geo.attributes.position, nrm = geo.attributes.normal, v = new THREE.Vector3();
            for (let i = 0; i < p.count; i++) { v.set(p.getX(i), 0, p.getZ(i)); const l = v.length() || 1; v.multiplyScalar(0.5 / l).setY(0.85).normalize(); nrm.setXYZ(i, v.x, v.y, v.z); }
            nrm.needsUpdate = true; geo.deleteAttribute('tangent');
          }
          const src = o.material, mid = src.name;
          const wind = /^mat\.foliage\./.test(mid) ? (id.startsWith('veg.tree') ? 'tree' : 'grass') : (name === 'IMP' ? 'tree' : null);
          let mat;
          if (name === 'IMP' || !/^mat\./.test(mid) || !this.byId.has(mid)) {
            mat = src; mat.alphaTest = name === 'IMP' ? 0.5 : mat.alphaTest; mat.side = name === 'IMP' ? THREE.DoubleSide : mat.side; mat.transparent = false;
            if (mat.map) { mat.map.anisotropy = this.maxAniso; this.stats.texBytes += texBytes(mat.map.image ? mat.map.image.width : 256, mat.map.image ? mat.map.image.height : 256); this.stats.textures++; }
            mat.vertexColors = !!geo.attributes.color; mat.roughness = 0.95; mat.metalness = 0; mat.envMapIntensity = 0.3; if (name === 'IMP') mat.color.setScalar(0.72);
            if (wind && this.P.wind) patchWind(mat, wind);
            mat = this.adapt(mat, { id: name === 'IMP' ? 'imp.' + id : mid, card: name === 'IMP', impostor: name === 'IMP' });
          } else mat = this.material(mid, { tangents: !!geo.attributes.tangent, vc: !!geo.attributes.color, wind, translucent: this.P.foliageTrans !== false && /^mat\.foliage\.(?!grass$|fern$|weed$)/.test(mid) });   // 透け：木と低木の葉（下草は透けなし）
          if (!geo.attributes.color) { const c = new Float32Array(geo.attributes.position.count * 3).fill(1); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); mat.vertexColors = true; }
          // 木の葉のカードを増やす（フェーズ 4：近くで板に見えにくく）：同じカードを幹のまわりに回して少し縮めた写しを同じ網に足す（描画の呼び出しは増えない）
          const dup = id.startsWith('veg.tree') && /^mat\.foliage\./.test(mid) && /LOD[01]$/.test(name) ? (e.kit.cardDup ?? this.P.cardDup ?? 1) : 0;   // 目録の kit.cardDup（松＝0）が先
          (nodes[name] = nodes[name] || []).push({ geometry: dup ? moreCards(geo, dup, id) : geo, material: mat });
        });
        res({ id, nodes, variants: e.kit.variants || 1, lodDist: e.kit.lodDist || [30], impostor: !!e.kit.impostor, size: e.tech && e.tech.sizeM });
      }, undefined, err => { this.stats.failed.push(id + ': ' + (err && err.message)); res(null); });
    })));
    this.kits.set(id, p); return p;
  }
  /** KTX2 の読み手（vendor/three-esm の KTX2Loader＋basis の transcoder：wasm は使う時だけ読む）。読めなければ null */
  _ktx2() {
    if (!this._k2) this._k2 = import('three/addons/loaders/KTX2Loader.js').then(m => { const L = new m.KTX2Loader().setTranscoderPath('vendor/three-esm/three-0.185.1/addons/libs/basis/').detectSupport(this.renderer); this.ktx2Loader = L; return L; }).catch(e => { this.stats.failed.push('ktx2: ' + e.message); return null; });
    return this._k2;
  }
  /** Meshopt の復号器（vendor/three-esm の meshopt_decoder・wasm 入りの JS 1 つ）を 1 回だけ読む。読めなければ false（元の glb を使う） */
  _meshopt() {
    if (!this._mo) this._mo = import('three/addons/libs/meshopt_decoder.module.js').then(async m => { await m.MeshoptDecoder.ready; this.gltf.setMeshoptDecoder(m.MeshoptDecoder); return true; }).catch(e => { this.stats.failed.push('meshopt: ' + e.message); return false; });
    return this._mo;
  }
  /** 全部のテクスチャが読めるまで待つ */
  async ready() {
    await Promise.all([...this.tex.values()].map(t => t.userData.ready));
    // KTX2 に替わった物：材質の参照を差し替える（作る前なのでシェーダーは 1 回だけ）
    for (const m of this.mats.values()) for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) { const r = m[k] && m[k].userData && m[k].userData.replacement; if (r) { r.repeat.copy(m[k].repeat); m[k] = r; m.needsUpdate = true; } }
  }
  get texMB() { return Math.round(this.stats.texBytes / 1048576 * 10) / 10; }
}

/** glb の量子化された属性（KHR_mesh_quantization：gltfpack）を float に戻す（行列をかける前に） */
export function toFloat(g) {
  for (const [k, a] of Object.entries(g.attributes)) {
    if (a.array instanceof Float32Array && !a.isInterleavedBufferAttribute) continue;
    const n = a.count, s = a.itemSize, f = new Float32Array(n * s);
    for (let i = 0; i < n; i++) for (let c = 0; c < s; c++) f[i * s + c] = a.getComponent ? a.getComponent(i, c) : [a.getX, a.getY, a.getZ, a.getW][c].call(a, i);
    g.setAttribute(k, new THREE.BufferAttribute(f, s));
  }
  return g;
}
/** 葉のカードの写し：幹（x,z の中心＝0）のまわりに 47°・103° 回し、横に 0.9 倍・高さを少しずらした写しを n 個足す */
export function moreCards(g, n = 1, seedId = '') {
  const parts = [g];
  for (let k = 1; k <= n; k++) {
    const c = g.clone(), a = (47 + 56 * (k - 1)) * Math.PI / 180, sy = seedId.endsWith('sugi') ? 0.97 : 0.94;
    c.applyMatrix4(new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeScale(0.9, sy, 0.9))).translate(0, (k % 2 ? 0.25 : -0.2), 0);
    parts.push(c);
  }
  const out = mergeGeometries(parts.map(x => x.index ? x.toNonIndexed() : x));
  return out || g;
}

/** 部品の節の名前 → { variant, lod }（IMP は lod＝'imp'） */
export function parseNode(name) {
  if (name === 'IMP') return { variant: 0, lod: 'imp' };
  const m = /^(?:v(\d+)_)?LOD(\d+)$/.exec(name); return m ? { variant: m[1] ? +m[1] : 0, lod: +m[2] } : null;
}
