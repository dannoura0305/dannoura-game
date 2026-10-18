// 境界侵食 P12：Blender の部品（wakaba-assets の glb：tools/blender/kit/pieces_town.py）を町と屋内に置く。
// ・置く所は今までの手続きの形と同じデータ（data/town.js・各区画の組み立て）から：world/town.js などが kit.put(...) で記録する。
// ・PC の段（quality.js の kit）だけ。手続きの形は「代わりの網」（Builder の fb）として作っておき、部品が読めたら隠す（読めない時はそのまま＝落ちない）。
// ・部品は起動の後で読む（目録の web の門が pass の物だけ）。材質は町の地図帳の枠（envmat.js の PBR）＝部品ごとに描画呼び出しは LOD の段の数だけ。
// ・塗装の色：材質 mat.town.paint#<名> は glTF の色を頂点の色に・#tint は置く時の色（インスタンスの色：頂点の色の A＝1 の所だけ）。glass.* は艶のある暗いガラス（A＝0.5）。emit.* は光る（別の網）。
// ・LOD と視野の外：mapkit/render/lod.js の assignLods（カメラが動いた時だけ）。当たり判定は今までのまま（部品は見た目だけ）。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assignLods } from '../../mapkit/render/lod.js';
import { tileRect } from '../render/townmat.js';
import { envKitMats, ENV } from '../render/envmat.js';

const LIB = new URL('../../wakaba-assets/', import.meta.url).href;
/** 使う部品（id → 分類のフォルダ） */
export const KIT_PIECES = {
  'prop.town.utility_pole': 'prop', 'prop.town.pole_steel': 'prop', 'prop.town.lamp_head': 'prop', 'prop.town.lamp_modern': 'prop', 'prop.town.vending': 'prop',
  'prop.town.car': 'prop', 'prop.town.car_lite': 'prop', 'prop.town.bicycle': 'prop', 'prop.town.ac_unit': 'prop', 'prop.town.guardrail': 'prop', 'bld.town.arcade_arch': 'building_module',
  'prop.int.bench_row': 'prop', 'prop.int.hospital_bed': 'prop', 'prop.int.locker': 'prop', 'prop.int.server_rack': 'prop', 'prop.int.desk_pc': 'prop',
};
/** 作ったが今は置いていない部品（読まない：UE5 の版・後の屋内の作り直しで使う） */
export const KIT_SPARE = new Set(['prop.int.desk_pc', 'prop.int.server_rack']);
/** P14：車の種類（prop.town.car の v<k>）。town.js の car(p) は p.type（無ければ kei → 'kei'・他 → 'sedan'） */
export const CAR_KINDS = ['sedan', 'kei', 'minivan', 'truck', 'taxi', 'hatch'];
/** P14：段に関係なく読む部品（スマホの低い段でも車は箱の積み木にしない）。低い段は軽い版（LOD2 だけの glb）を同じ id で使う */
const ALWAYS = { 'prop.town.car': 'prop.town.car_lite' };
/** 材質の id → 町の地図帳の枠と 1 回の繰り返し（m） */
const MAT2TILE = {
  'mat.town.paint': ['white', 1.0], 'mat.town.concrete': ['concrete', 3], 'mat.town.grating': ['drain', 0.9], 'mat.int.wood_floor': ['woodfloor', 1.8],
  'mat.town.galv_roof': ['galv', 1.6], 'mat.town.siding_metal': ['siding2', 2], 'mat.int.vinyl': ['vinyl', 2], 'mat.int.metal_panel': ['metalpanel', 2.4],
  'mat.town.wood_board': ['wood', 2], 'mat.town.panel': ['panel', 2], 'mat.town.shutter': ['shutter', 2.4],
};
/** 部品ごとの LOD の距離（m）と影 */
const OPT = { 'prop.town.utility_pole': { d: [40], shadow: true }, 'prop.town.pole_steel': { d: [60] }, 'prop.town.lamp_head': { d: [28] }, 'prop.town.lamp_modern': { d: [35] },
  'prop.town.vending': { d: [22], shadow: true }, 'prop.town.car': { d: [], shadow: true }, 'prop.town.bicycle': { d: [16] }, 'prop.town.ac_unit': { d: [18] },
  'prop.town.guardrail': { d: [26] }, 'bld.town.arcade_arch': { d: [40] } };

export const KIT = { on: false, ready: false, loading: null, pieces: new Map(), stats: { glbBytes: 0, ms: 0, pieces: 0, failed: [] } };
export function envKitInit(P) { KIT.P = P; KIT.on = true; KIT.lite = !P.kit; KIT.only = P.kit ? null : new Set(Object.keys(ALWAYS)); }
/** この部品を置くか（低い段は ALWAYS の部品だけ） */
export const kitWants = id => KIT.on && (!KIT.only || KIT.only.has(id));

/** 区画の組み立ての間に置く所を記録する道具 */
export function kitCollector() {
  const items = [];
  return {
    on: KIT.on, items,
    /** id・種類 v・位置・Y の回転・大きさ（数か [x,y,z]）・色（#tint の所） */
    put(id, v, x, y, z, ry = 0, s = 1, color = null) { if (!kitWants(id)) return false; items.push({ id, v: v || 0, x, y, z, ry, s: Array.isArray(s) ? s : [s, s, s], color }); return true; },
  };
}

// ───────────── 読む ─────────────
function convert(gltf) {
  const byVar = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    let n = o, name = null;
    while (n) { if (/^(?:v\d+_)?LOD\d+$/.test(n.name)) { name = n.name; break; } n = n.parent; }
    if (!name) return;
    const m = /^(?:v(\d+)_)?LOD(\d+)$/.exec(name), v = m[1] ? +m[1] : 0, lod = +m[2];
    o.updateWorldMatrix(true, false);
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    const mat = o.material, mname = (mat.name || '').replace(/\.\d+$/, '');
    const n0 = g.attributes.position.count;
    const ao = g.attributes.color;
    let kind = 'lit', alpha = 0, tile = 'white', ts = 1, col = new THREE.Color(1, 1, 1);
    if (mname.startsWith('emit.')) { kind = 'glow'; col.copy(mat.color); }
    else if (mname.startsWith('glass.')) { alpha = 0.5; col.copy(mat.color); }
    else {
      const [base, tag] = mname.split('#'); const t = MAT2TILE[base] || MAT2TILE['mat.town.paint']; tile = t[0]; ts = t[1];
      if (tag) col.copy(mat.color); if (tag === 'tint') alpha = 1;
      if (tag === 'carpaint') { col.setRGB(1, 1, 1); alpha = 0.9; }                 // P14：車の塗装（置く時の色・艶）
      if (tag === 'chrome' || tag === 'rim') alpha = 0.2;                          // P14：金属
    }
    const c = new Float32Array(n0 * 4);
    for (let i = 0; i < n0; i++) { const a = ao ? (ao.getX(i) + ao.getY(i) + ao.getZ(i)) / 3 : 1; c[i * 4] = col.r * a; c[i * 4 + 1] = col.g * a; c[i * 4 + 2] = col.b * a; c[i * 4 + 3] = alpha; }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', g.attributes.position); out.setAttribute('normal', g.attributes.normal);
    const uv = new Float32Array(n0 * 2); if (g.attributes.uv) for (let i = 0; i < n0; i++) { uv[i * 2] = g.attributes.uv.getX(i) / ts; uv[i * 2 + 1] = g.attributes.uv.getY(i) / ts; }
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setAttribute('color', new THREE.BufferAttribute(c, 4));
    const r = tileRect(tile), tr = new Float32Array(n0 * 4); for (let i = 0; i < n0; i++) tr.set(r, i * 4); out.setAttribute('tileR', new THREE.BufferAttribute(tr, 4));
    if (g.index) out.setIndex(g.index);
    const V = byVar[v] || (byVar[v] = []); const L = V[lod] || (V[lod] = { lit: [], glow: [] }); L[kind].push(out);
  });
  const vars = {};
  for (const [v, lods] of Object.entries(byVar)) vars[v] = lods.filter(Boolean).map(L => ({ lit: L.lit.length ? mergeGeometries(L.lit, false) : null, glow: L.glow.length ? mergeGeometries(L.glow, false) : null }));
  return vars;
}
/** 部品を読む（起動の後・1 回）。読めた部品の数を返す */
export function envKitLoad(game) {
  if (KIT.loading) return KIT.loading;
  if (!KIT.on) return (KIT.loading = Promise.resolve(0));
  const t0 = performance.now(), loader = new GLTFLoader();
  KIT.loading = fetch(LIB + 'catalog.json').then(r => r.json()).then(cat => {
    const want = KIT.only ? new Map([...KIT.only].map(id => [KIT.lite ? ALWAYS[id] : id, id])) : null;   // 読む glb の id → 置く時の id
    const ok = new Map(); for (const e of cat.entries || []) if (KIT_PIECES[e.id] && !KIT_SPARE.has(e.id) && e.targets && e.targets.web && e.targets.web.result === 'pass' && e.kit && (want ? want.has(e.id) : !Object.values(ALWAYS).includes(e.id))) ok.set(want ? want.get(e.id) : e.id, e);
    return Promise.all([...ok.entries()].map(([pid, e]) => new Promise(res => {
      const url = `${LIB}entries/${e.dir}/web/${e.id}.glb`;
      loader.load(url, gl => { try { KIT.pieces.set(pid, convert(gl)); KIT.stats.glbBytes += (e.tech && e.tech.fileBytes) || 0; } catch (err) { KIT.stats.failed.push(e.id + ': ' + err.message); } res(); }, undefined, () => { KIT.stats.failed.push(url); res(); });
    })));
  }).then(() => {
    KIT.ready = true; KIT.stats.ms = Math.round(performance.now() - t0); KIT.stats.pieces = KIT.pieces.size;
    if (game && game.area) envKitApply(game.area);
    return KIT.pieces.size;
  }).catch(e => { console.warn('envkit', e); return 0; });
  return KIT.loading;
}

// ───────────── 置く（区画ごと） ─────────────
/** 区画に部品の網を作り、手続きの代わりの網を隠す。部品がまだ無ければ何もしない（読めたら envKitLoad が呼ぶ） */
export function envKitApply(A) {
  if (!KIT.on || !KIT.ready || !A || !A.kitItems || !A.kitItems.length) return;
  if (A.kitGroup && A.kitBuiltN === A.kitItems.length) return;
  if (A.kitGroup) { A.root.remove(A.kitGroup); A.kitGroup.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); }
  const mats = KIT.lite ? kitLiteMats() : envKitMats(), G = new THREE.Group(); G.name = 'envkit';
  const sets = [];
  const byKey = new Map();
  for (const it of A.kitItems) { const k = it.id + '|' + it.v; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(it); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(), Pp = new THREE.Vector3(), C = new THREE.Color();
  for (const [k, items] of byKey) {
    const [id, vs] = k.split('|'), P = KIT.pieces.get(id); if (!P) continue;
    const lods = P[vs] || P[0]; if (!lods) continue;
    const o = OPT[id] || { d: [24] };
    for (const it of items) { Q.setFromAxisAngle(Y, it.ry || 0); S.set(...it.s); Pp.set(it.x, it.y, it.z); it.matrix = new THREE.Matrix4().compose(Pp, Q, S); it.r = 1.5 * Math.max(...it.s.map(Math.abs)); it.lod = -1; }
    const levels = lods.map((L, li) => {
      const ms = [];
      for (const [kind, geo] of [['lit', L.lit], ['glow', L.glow]]) {
        if (!geo) continue;
        const m = new THREE.InstancedMesh(geo, kind === 'lit' ? mats.lit : mats.glow, items.length);
        m.count = 0; m.visible = false; m.frustumCulled = false; m.name = `kit:${id}:v${vs}:L${li}:${kind}`;
        m.castShadow = !!o.shadow && kind === 'lit' && li === 0 && !!(KIT.P && KIT.P.shadows); m.receiveShadow = kind === 'lit';
        m.userData.kind = kind; G.add(m); ms.push(m);
      }
      return ms;
    });
    // 色（#tint の所だけ効く：頂点の色の A）
    for (const ms of levels) for (const m of ms) if (m.userData.kind === 'lit') { for (let i = 0; i < items.length; i++) m.setColorAt(i, C.set(items[i].color ?? 0xffffff)); if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    sets.push({ id, items, levels, dists: o.d.slice(0, Math.max(0, levels.length - 1)) });
  }
  A.root.add(G); A.kitGroup = G; A.kitSets = sets; A.kitBuiltN = A.kitItems.length; A.kitLast = null;
  A.root.traverse(o => { if (o.userData.kitFallback) o.visible = false; });
  ENV.kitCalls = sets.reduce((s, x) => s + x.levels.flat().length, 0);
}
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _sph = new THREE.Sphere();
/** 毎フレーム（カメラが動いた時だけ LOD と数を決め直す） */
export function envKitUpdate(A, camera, force = false) {
  if (!A || !A.kitSets) return;
  const p = camera.position, q = camera.quaternion, key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)},${q.x.toFixed(2)},${q.y.toFixed(2)},${q.w.toFixed(2)},${camera.far | 0}`;
  if (!force && key === A.kitLast) return; A.kitLast = key;
  _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  const vis = it => { _sph.center.set(it.x, it.y + 1, it.z); _sph.radius = it.r + 1; return _fr.intersectsSphere(_sph); };
  const cam = { x: p.x, y: p.y, z: p.z }, lodMin = 0;
  for (const s of A.kitSets) {
    const maxLod = s.levels.length - 1;
    const { buckets } = assignLods(s.items, cam, s.dists, { cull: camera.far, visible: vis, lodMin, maxLod });
    s.levels.forEach((ms, li) => {
      const list = buckets[li] || [];
      for (const m of ms) {
        for (let k = 0; k < list.length; k++) { m.setMatrixAt(k, s.items[list[k]].matrix); if (m.instanceColor && m.userData.kind === 'lit') m.setColorAt(k, _c.set(s.items[list[k]].color ?? 0xffffff)); }
        m.count = list.length; m.visible = list.length > 0;
        if (list.length) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      }
    });
  }
}
const _c = new THREE.Color();
/** P14：低い段（PBR なし）の部品の材質：頂点の色の Lambert（置く時の色は頂点の色の A が 0.75 以上の所だけ）＋光る所 */
let _liteMats = null;
function kitLiteMats() {
  if (_liteMats) return _liteMats;
  const lit = new THREE.MeshLambertMaterial({ vertexColors: true });
  lit.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', `
  #if defined( USE_COLOR_ALPHA )
    vColor = vec4(1.0); vColor *= color;
    #ifdef USE_INSTANCING_COLOR
      vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, step(0.75, color.a));
    #endif
  #else
    #include <color_vertex>
  #endif`); sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.a = 1.0;'); };
  lit.customProgramCacheKey = () => 'kit_lite';
  _liteMats = { lit, glow: new THREE.MeshBasicMaterial({ vertexColors: true }) };
  return _liteMats;
}
