// 地形の網と塗り分け（写実）：層＝森の床・草・苔・土の道・砂利（参道）・崖（三面投影）。three.js を使う。
// 重み（頂点ごと）は傾き・高さ・道・建物の土台・木の密度・ノイズから決まる（splatWeights：DOM なしの純粋関数＝node で試験できる）。
// 描く時は層の「高さ」（orh の B）で混ぜる＝境目が石や葉の形に沿う。遠くでも繰り返しが目立たないよう、広い範囲の明るさ・色のゆらぎを足す。
// テクスチャは配列（sampler2DArray）にまとめる＝描画 1 回・テクスチャの枠 3 つ。接地の暗さ（木の根元・壁ぎわ・窪み）は頂点の AO（aoT）。
import * as THREE from 'three';
import { nearestOnPath } from '../pcg/paths.js';

export const TERRAIN_LAYERS = ['mat.ground.forest_floor', 'mat.ground.grass', 'mat.ground.moss', 'mat.ground.dirt_path', 'mat.ground.gravel_path', 'mat.rock.cliff'];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; }
const fbm = (x, z) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.15;

/** 木の密度の升目（4m）：近くの木の数（なめらか） */
export function treeDensity(layout, cell = 4) {
  const W = layout.size[0], D = layout.size[1], nx = Math.ceil(W / cell) + 1, nz = Math.ceil(D / cell) + 1, g = new Float32Array(nx * nz);
  for (const o of layout.objects) if (o.cls === 'tree') {
    const ci = o.at[0] / cell, cj = o.at[2] / cell;
    for (let j = Math.floor(cj) - 2; j <= Math.floor(cj) + 2; j++) for (let i = Math.floor(ci) - 2; i <= Math.floor(ci) + 2; i++) {
      if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
      const d = Math.hypot(i - ci, j - cj); if (d < 2.2) g[j * nx + i] += 1 - d / 2.2;
    }
  }
  return { at(x, z) { const fi = Math.max(0, Math.min(nx - 1.001, x / cell)), fj = Math.max(0, Math.min(nz - 1.001, z / cell)), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j; return (g[j * nx + i] * (1 - u) + g[j * nx + i + 1] * u) * (1 - v) + (g[(j + 1) * nx + i] * (1 - u) + g[(j + 1) * nx + i + 1] * u) * v; } };
}

/** 道の距離の場（0.5m の升目・道の端からの距離 m・遠い所は 99）：kinds ごと。nearestOnPath を頂点ごとに呼ぶより速い */
export function pathField(layout, cell = 0.5, reach = 5) {
  const W = layout.size[0], D = layout.size[1], nx = Math.ceil(W / cell) + 1, nz = Math.ceil(D / cell) + 1, F = {};
  for (const p of layout.paths) {
    const k = p.kind === 'shrine_approach' ? 'gravel' : 'dirt', g = F[k] = F[k] || new Float32Array(nx * nz).fill(99), hw = p.width / 2;
    for (let i = 0; i + 1 < p.points.length; i++) {
      const a = p.points[i], b = p.points[i + 1], ax = a[0], az = a[2], dx = b[0] - ax, dz = b[2] - az, L2 = dx * dx + dz * dz || 1e-9;
      const i0 = Math.max(0, Math.floor((Math.min(ax, b[0]) - reach) / cell)), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, b[0]) + reach) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(az, b[2]) - reach) / cell)), j1 = Math.min(nz - 1, Math.ceil((Math.max(az, b[2]) + reach) / cell));
      for (let j = j0; j <= j1; j++) for (let ii = i0; ii <= i1; ii++) {
        const x = ii * cell, z = j * cell, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t) - hw, q = j * nx + ii;
        if (d < g[q]) g[q] = d;
      }
    }
  }
  const at = (g, x, z) => { if (!g) return 99; const fi = Math.max(0, Math.min(nx - 1.001, x / cell)), fj = Math.max(0, Math.min(nz - 1.001, z / cell)), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j; return (g[j * nx + i] * (1 - u) + g[j * nx + i + 1] * u) * (1 - v) + (g[(j + 1) * nx + i] * (1 - u) + g[(j + 1) * nx + i + 1] * u) * v; };
  return { dirt: (x, z) => at(F.dirt, x, z), gravel: (x, z) => at(F.gravel, x, z) };
}

/**
 * 1 点の重み（6 層・合計 1）と接地の AO。hf＝Heightfield・ctx＝{ layout, trees: treeDensity, pads: [obb], paths }
 * 戻り値：{ w: [森, 草, 苔, 土, 砂利, 崖], ao }
 */
export function splatWeights(x, z, hf, ctx) {
  const s = hf.slopeDeg(x, z), y = hf.at(x, z), [lo, hi] = ctx.extent || hf.extent(), t = (y - lo) / (hi - lo + 1e-6);
  const n1 = fbm(x / 18, z / 18), n2 = fbm(x / 5 + 7, z / 5 + 3), td = ctx.trees.at(x, z);
  const cliff = smooth(31, 44, s + (n2 - 0.5) * 8);
  let forest = smooth(0.35, 1.6, td + (n1 - 0.5) * 0.8), grass = 1 - forest;
  let moss = smooth(17, 30, s + (n1 - 0.5) * 10) * (1 - cliff) + 0.45 * forest * smooth(0.6, 0.78, n2);
  grass *= 0.4 + 0.6 * smooth(0.2, 0.75, 1 - t + (n1 - 0.5) * 0.3);           // 高い所は草が少ない
  forest += (1 - forest) * 0.35 * smooth(0.55, 0.8, t);
  // 道
  let dirt = 0, gravel = 0;
  const edge = (n2 - 0.5) * 0.7, dd = ctx.field ? [['dirt', ctx.field.dirt(x, z)], ['gravel', ctx.field.gravel(x, z)]] : ctx.paths.map(p => [p.kind === 'shrine_approach' ? 'gravel' : 'dirt', nearestOnPath(p.points, x, z).d - p.width / 2]);
  for (const [k, d] of dd) {
    const m = 1 - smooth(-0.35 + edge, 0.9 + edge, d);
    if (k === 'gravel') { gravel = Math.max(gravel, (1 - smooth(-0.6 + edge, 0.2 + edge, d))); dirt = Math.max(dirt, m * 0.6); }
    else dirt = Math.max(dirt, m);
  }
  // 建物のまわり：踏み固めた土
  let ao = 1;
  for (const o of ctx.pads) {
    const dx = x - o.cx, dz = z - o.cz, c = Math.cos(o.rot), sn = Math.sin(o.rot), u = Math.abs(dx * c - dz * sn) - o.hx, v = Math.abs(dx * sn + dz * c) - o.hz;
    const d = Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
    dirt = Math.max(dirt, (1 - smooth(-0.5, 2.6 + n2 * 1.5, d)) * 0.75);
    if (d > -0.3) ao *= 0.62 + 0.38 * smooth(-0.2, 1.2, d);     // 壁ぎわの暗さ
  }
  // 木の根元の暗さ・窪みの暗さ
  ao *= 1 - 0.22 * smooth(0.6, 2.2, td);
  const lap = (hf.at(x + 1.5, z) + hf.at(x - 1.5, z) + hf.at(x, z + 1.5) + hf.at(x, z - 1.5)) / 4 - y;
  ao *= 1 - 0.3 * smooth(0.05, 0.6, lap);
  const pathK = Math.max(dirt, gravel);
  const w = [forest * (1 - pathK), grass * (1 - pathK), moss * (1 - pathK) * 0.8, dirt * (1 - gravel * 0.7), gravel, 0];
  let sum = w.reduce((a, b) => a + b, 0) || 1;
  for (let k = 0; k < 5; k++) w[k] = w[k] / sum * (1 - cliff);
  w[5] = cliff;
  return { w, ao: Math.max(0.35, ao) };
}

/** 地形の網（three.js）。step＝頂点の間隔（升目） */
export function buildTerrainGeometry(hf, layout, step) {
  const nx = Math.floor((hf.nx - 1) / step) + 1, nz = Math.floor((hf.nz - 1) / step) + 1, cell = hf.cell * step;
  const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3), sa = new Float32Array(nx * nz * 4), sb = new Float32Array(nx * nz * 2), aoA = new Float32Array(nx * nz), idx = [];
  const ctx = { layout, trees: treeDensity(layout), pads: layout.buildings.map(b => b.obb), paths: layout.paths, field: pathField(layout), extent: hf.extent() };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = i * cell, z = j * cell, k = j * nx + i, y = hf.at(x, z), n = hf.normal(x, z), r = splatWeights(x, z, hf, ctx);
    pos.set([x, y, z], k * 3); nor.set(n, k * 3); sa.set(r.w.slice(0, 4), k * 4); sb.set(r.w.slice(4, 6), k * 2); aoA[k] = r.ao;
  }
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('splatA', new THREE.BufferAttribute(sa, 4)); g.setAttribute('splatB', new THREE.BufferAttribute(sb, 2)); g.setAttribute('aoT', new THREE.BufferAttribute(aoA, 1));
  g.setIndex(idx); g.computeBoundingSphere();
  return g;
}

/** 画像の列 → 配列テクスチャ（同じ大きさに描き直す） */
function arrayTexture(images, size, srgb) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cx = cv.getContext('2d', { willReadFrequently: true }), data = new Uint8Array(size * size * 4 * images.length);
  images.forEach((im, k) => {
    cx.clearRect(0, 0, size, size);
    if (im) cx.drawImage(im, 0, 0, size, size); else { cx.fillStyle = '#808080'; cx.fillRect(0, 0, size, size); }
    data.set(cx.getImageData(0, 0, size, size).data, k * size * size * 4);
  });
  const t = new THREE.DataArrayTexture(data, size, size, images.length);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 4;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

/** 地形の材質（MeshStandardMaterial に塗り分けの影を足す）。bank＝AssetBank */
/**
 * 広い範囲の色のゆらぎ（フェーズ 4：遠くの地面が一様に見えない）：地図全体を 1m＝1 画素の RGBA（純粋関数＝node で試験）。
 * R＝明るさの大きなむら・G＝湿り（低い所・木の下・道ばた＝暗い）・B＝乾き（日の当たる斜面・高い所＝黄ばむ）。戻り値：{ data: Uint8Array, n }
 */
export function macroVariation(hf, layout, n = 256) {
  const W = layout.size[0], D = layout.size[1], data = new Uint8Array(n * n * 4), trees = treeDensity(layout), [lo, hi] = hf.extent();
  const field = pathField(layout, 1, 6);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * W, z = (j + 0.5) / n * D, y = hf.at(x, z), t = (y - lo) / (hi - lo + 1e-6), s = hf.slopeDeg(x, z);
    const big = fbm(x / 46 + 3.1, z / 46 + 8.7), mid = fbm(x / 14 + 1.3, z / 14 + 4.2);
    // 日の側（西＝−x）の斜面：高さの差で近似
    const sunSide = Math.max(0, (hf.at(x + 1.5, z) - hf.at(x - 1.5, z)) / 3);
    const wet = Math.min(1, 0.55 * smooth(0.45, 0.05, t) + 0.15 * Math.min(1, trees.at(x, z) / 3) + 0.3 * smooth(3, 0.5, Math.min(field.dirt(x, z), field.gravel(x, z))) + (mid - 0.5) * 0.4);
    const dry = Math.min(1, 0.6 * Math.min(1, sunSide * 2.5) * smooth(8, 25, s) + 0.35 * smooth(0.5, 0.95, t) + (big - 0.5) * 0.5);
    const k = (j * n + i) * 4;
    data[k] = Math.round(255 * Math.max(0, Math.min(1, big * 0.7 + mid * 0.3))); data[k + 1] = Math.round(255 * Math.max(0, wet)); data[k + 2] = Math.round(255 * Math.max(0, dry)); data[k + 3] = 255;
  }
  return { data, n };
}

export async function buildTerrainMaterial(bank, P, ctx = null) {
  const size = Math.min(P.texMax, 1024), ids = TERRAIN_LAYERS;
  const load = kind => Promise.all(ids.map(id => bank.image(id, kind, size)));
  const [A, N, O] = await Promise.all([load('albedo'), load('normal'), load('orh')]);
  const ok = A.every(Boolean);
  const S = Math.min(size, ...A.filter(Boolean).map(a => a.size));
  const tA = arrayTexture(A.map(a => a && a.img), S, true), tN = arrayTexture(N.map(a => a && a.img), S, false), tO = arrayTexture(O.map(a => a && a.img), Math.min(S, 512), false);
  for (const a of [...A, ...N, ...O]) if (a && a.img && a.img.close) a.img.close();
  bank.stats.texBytes += (S * S * 4 * 4 / 3) * ids.length * 2 + (Math.min(S, 512) ** 2 * 4 * 4 / 3) * ids.length; bank.stats.textures += 3;
  const tiles = ids.map(id => bank.tile(id));
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 });
  m.name = 'terrain';
  const layers = P.terrainLayers || 6, tri = !!P.triplanar, macro = !!(ctx && P.macro !== false);
  let tM = null;
  if (macro) {
    const mv = macroVariation(ctx.hf, ctx.layout, 256); tM = new THREE.DataTexture(mv.data, mv.n, mv.n, THREE.RGBAFormat);
    tM.wrapS = tM.wrapT = THREE.ClampToEdgeWrapping; tM.magFilter = THREE.LinearFilter; tM.minFilter = THREE.LinearMipmapLinearFilter; tM.generateMipmaps = true; tM.needsUpdate = true;
    bank.stats.texBytes += 256 * 256 * 4 * 4 / 3; bank.stats.textures += 1;
  }
  const mapSize = ctx ? ctx.layout.size : [256, 256];
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { tAlb: { value: tA }, tNrm: { value: tN }, tOrh: { value: tO }, uTile: { value: tiles.map(t => 1 / t) }, tMacro: { value: tM }, uMapSize: { value: new THREE.Vector2(mapSize[0], mapSize[1]) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute vec4 splatA; attribute vec2 splatB; attribute float aoT;
      varying vec4 vSplatA; varying vec2 vSplatB; varying float vAoT; varying vec3 vTWorld; varying vec3 vTNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vSplatA = splatA; vSplatB = splatB; vAoT = aoT; vTWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vTNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2DArray tAlb; uniform sampler2DArray tNrm; uniform sampler2DArray tOrh; uniform float uTile[6]; uniform sampler2D tMacro; uniform vec2 uMapSize; vec3 mkMean;
      varying vec4 vSplatA; varying vec2 vSplatB; varying float vAoT; varying vec3 vTWorld; varying vec3 vTNormal;
      vec3 mkAlb; float mkRough; float mkAO; vec3 mkN;
      float mkH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float mkVN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mkH(i), mkH(i + vec2(1,0)), f.x), mix(mkH(i + vec2(0,1)), mkH(i + vec2(1,1)), f.x), f.y); }
      void mkLayer(int k, float w, vec2 uv, vec3 N, vec3 T, vec3 B, inout vec4 acc, inout vec3 nacc, inout vec2 ro, inout float hmax) {
        vec3 a = texture(tAlb, vec3(uv, float(k))).rgb; vec4 o = texture(tOrh, vec3(uv, float(k)));
        vec3 tn = texture(tNrm, vec3(uv, float(k))).xyz * 2.0 - 1.0;
        float hw = w * (0.2 + o.b); hw = hw * hw * hw;
        acc += vec4(a * hw, hw); nacc += (T * tn.x + B * tn.y + N * tn.z) * hw; ro += vec2(o.g, o.r) * hw;
        ${macro ? 'mkMean += textureLod(tAlb, vec3(uv, float(k)), 9.0).rgb * hw;' : ''}
      }
      void mkSplat() {
        vec3 N = normalize(vTNormal);
        vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x); vec3 B = cross(N, T);
        vec4 acc = vec4(0.0); vec3 nacc = vec3(0.0); vec2 ro = vec2(0.0); float hm = 0.0; mkMean = vec3(0.0);
        float W[6]; W[0] = vSplatA.x; W[1] = vSplatA.y; W[2] = vSplatA.z; W[3] = vSplatA.w; W[4] = vSplatB.x; W[5] = vSplatB.y;
        ${layers === 4 ? 'W[0] += W[2]; W[2] = 0.0; W[3] += W[4]; W[4] = 0.0;' : ''}
        vec2 g = vTWorld.xz;
        for (int k = 0; k < 5; k++) { if (W[k] > 0.004) mkLayer(k, W[k], g * uTile[k], N, T, B, acc, nacc, ro, hm); }
        if (W[5] > 0.004) {
          ${tri ? `
          vec3 bw = pow(abs(N), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec2 uvX = vTWorld.zy * uTile[5], uvY = vTWorld.xz * uTile[5], uvZ = vTWorld.xy * uTile[5];
          vec3 aX = texture(tAlb, vec3(uvX, 5.0)).rgb, aY = texture(tAlb, vec3(uvY, 5.0)).rgb, aZ = texture(tAlb, vec3(uvZ, 5.0)).rgb;
          vec4 oX = texture(tOrh, vec3(uvX, 5.0)), oY = texture(tOrh, vec3(uvY, 5.0)), oZ = texture(tOrh, vec3(uvZ, 5.0));
          vec3 tX = texture(tNrm, vec3(uvX, 5.0)).xyz * 2.0 - 1.0, tY = texture(tNrm, vec3(uvY, 5.0)).xyz * 2.0 - 1.0, tZ = texture(tNrm, vec3(uvZ, 5.0)).xyz * 2.0 - 1.0;
          vec3 nX = vec3(tX.xy + N.zy, abs(tX.z) * N.x), nY = vec3(tY.xy + N.xz, abs(tY.z) * N.y), nZ = vec3(tZ.xy + N.xy, abs(tZ.z) * N.z);
          vec3 cn = normalize(nX.zyx * bw.x + nY.xzy * bw.y + nZ.xyz * bw.z);
          vec3 ca = aX * bw.x + aY * bw.y + aZ * bw.z; vec4 co = oX * bw.x + oY * bw.y + oZ * bw.z;` : `
          vec2 uvY = vTWorld.xz * uTile[5]; vec3 ca = texture(tAlb, vec3(uvY, 5.0)).rgb; vec4 co = texture(tOrh, vec3(uvY, 5.0)); vec3 cn = N;`}
          float hw = W[5] * (0.2 + co.b); hw = hw * hw * hw;
          acc += vec4(ca * hw, hw); nacc += cn * hw; ro += vec2(co.g, co.r) * hw;
          ${macro ? 'mkMean += textureLod(tAlb, vec3(vTWorld.xz * uTile[5], 5.0), 9.0).rgb * hw;' : ''}
        }
        mkAlb = acc.rgb / max(acc.a, 1e-5); mkN = normalize(nacc / max(acc.a, 1e-5) + N * 0.05); ro /= max(acc.a, 1e-5);
        // 広い範囲のゆらぎ（繰り返しを目立たせない）
        float mv = mkVN(g * 0.045) * 0.6 + mkVN(g * 0.13) * 0.4;
        mkAlb *= mix(0.78, 1.18, mv); mkAlb = mix(mkAlb, mkAlb * vec3(1.06, 1.0, 0.86), smoothstep(0.55, 0.8, mkVN(g * 0.03 + 7.0)));
        ${macro ? `
        // 広い範囲のむら（地図の形から作った 1m の絵）と、遠くの繰り返しを消す（遠い所は層の平均の色＋むらへ寄せる）
        vec3 mac = texture2D(tMacro, g / uMapSize).rgb;
        float far = smoothstep(28.0, 120.0, length(vTWorld - cameraPosition));
        vec3 meanA = mkMean / max(acc.a, 1e-5) * mix(0.82, 1.16, mkVN(g * 0.16 + 3.0) * 0.6 + mac.r * 0.4);
        mkAlb = mix(mkAlb, meanA * mix(0.85, 1.12, mv), far * 0.6);
        mkAlb *= mix(0.86, 1.1, mac.r);
        mkAlb = mix(mkAlb, mkAlb * vec3(0.78, 0.84, 0.84), mac.g * 0.45);
        mkAlb = mix(mkAlb, mkAlb * vec3(1.12, 1.04, 0.8), mac.b * 0.5);` : ''}
        mkRough = ro.x; mkAO = ro.y * vAoT;
        mkAlb *= mix(0.55, 1.0, vAoT);
      }`)
      .replace('#include <map_fragment>', 'mkSplat(); diffuseColor.rgb *= mkAlb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * mkRough;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(mkN, 0.0)).xyz);')
      .replace('#include <aomap_fragment>', `{ float ambientOcclusion = mkAO; reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
        #endif
      }`);
  };
  m.customProgramCacheKey = () => `terrain-${layers}-${tri}-${macro}`;
  m.userData.ok = ok;
  return m;
}
