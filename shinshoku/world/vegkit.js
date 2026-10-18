// 境界侵食 P16「木などのモデリングは試験マップと同じ作り方に」：町と区画の植物（街路樹・庭木・公園と社の木・生垣・植え込み・鉢植え・観葉植物・雑草・草）と
// 岩・瓦礫を、試験マップ（山の廃村：mapkit.html?map=haison）と同じ道具で描く。
// ・部品：tools/blender/kit/pieces_veg.py（build_kit_veg.py）＋試験マップの veg.tree.sugi・veg.tree.broadleaf・veg.grass・rock.boulder（wakaba-assets の glb・Meshopt の .mo.glb）。
// ・材質：tools/mapkit/matgen/defs_veg.py（matgen_veg.py）の葉のカード・樹皮・鉢＋既存の mat.*（PBR：色・法線・ORH）。
// ・描画は mapkit の共有の部品をそのまま読み込んで使う（写しはしない）：AssetBank（mapkit/render/assets.js：目録の web の門が pass の物だけ・葉のカードの写し・遠景の板）・
//   KitSet（mapkit/render/kit.js：部品×種類×LOD×材質ごとに InstancedMesh 1 つ・カメラが動いた時だけ LOD）・lod.js・GroundCover（mapkit/render/foliage.js：雑草と草の株）・
//   wind.js（揺れ・葉の透け）。作品の側の手直しは AssetBank の adapt（render/envmat.js の envVegMat：町の色の調整／スマホの段は軽い Lambert）だけ。
// ・置く所は区画の組み立て（world/town.js・town2.js・level.js・areas*.js）が vegPut／vegTree／vegCover で記録し、区画の vegItems／vegCover になる（kitItems と同じ流れ）。
//   当たり判定・物語の調べる所・歩く道は変えない（部品は見た目だけ）。手続きの形は「代わりの網」（Builder の fb(…, 'veg')・userData.vegFallback）として作り、
//   部品が読めたら隠す（読めない時・?veg=0 の時は今まで通り）。
// ・段（quality.js の段の名前）：ultra／high＝LOD0 から・揺れ・透け・葉のカードの写し・雑草と草の株／mid＝写しなし・株は近くだけ／
//   low（スマホ）＝木は遠景の板（IMP）だけ・低木と鉢は LOD1・種類は 1 つ・色の地図だけ（Lambert）・株なし（描画の呼び出し ≤120 を守る）。
import * as THREE from 'three';
import { AssetBank } from '../../mapkit/render/assets.js';
import { KitSet } from '../../mapkit/render/kit.js';
import { GroundCover } from '../../mapkit/render/foliage.js';
import { windUniforms } from '../../mapkit/render/wind.js';
import { envVegMat } from '../render/envmat.js';

const LIB = new URL('../../wakaba-assets/', import.meta.url).href;

/** 木の種（町の言葉）→ 部品の id と、部品の高さ（m：目録の tech.sizeM の高さ。置く時の高さ h からの倍率） */
export const SPECIES = {
  keyaki: { id: 'veg.tree.keyaki', h: 10.7 }, ichou: { id: 'veg.tree.ichou', h: 11.2 }, sakura: { id: 'veg.tree.sakura', h: 7.35 },
  matsu: { id: 'veg.tree.matsu', h: 4.83 }, sugi: { id: 'veg.tree.sugi', h: 14.9 }, broadleaf: { id: 'veg.tree.broadleaf', h: 9.63 },
};
/** 使う部品（全部：試験マップと同じ素材ライブラリの id） */
export const VEG_IDS = ['veg.tree.keyaki', 'veg.tree.ichou', 'veg.tree.sakura', 'veg.tree.matsu', 'veg.tree.sugi', 'veg.tree.broadleaf', 'veg.shrub.tsutsuji', 'veg.hedge',
  'veg.pot', 'veg.planter', 'veg.houseplant', 'veg.weed', 'veg.grass', 'rock.boulder', 'rock.rubble'];
/** 株（GroundCover）の 2 つの部品：1 つ目＝雑草・2 つ目＝草 */
export const COVER_IDS = ['veg.weed', 'veg.grass'];

/** 段ごとの値（mapkit/render/quality.js の MAP_PRESETS と同じ名前の値。AssetBank・KitSet・GroundCover が読む） */
export const VEG_PRESETS = {
  ultra: { texMax: 512, lodScale: 1.2, wind: true, foliageTrans: true, cardDup: 1, grassFar: 30, cover: 1, far: 140, shadowSmall: true },
  high: { texMax: 512, lodScale: 1.0, wind: true, foliageTrans: true, cardDup: 1, grassFar: 24, cover: 1, far: 120, shadowSmall: false },
  mid: { texMax: 256, lodScale: 0.8, wind: true, foliageTrans: true, cardDup: 0, grassFar: 16, cover: 0.5, far: 105, shadowSmall: false },
  low: { texMax: 256, lodScale: 0.6, wind: false, foliageTrans: false, cardDup: 0, grassFar: 0, cover: 0, far: 90, shadowSmall: false, lodMin: 1, treeImpostorOnly: true, albedoOnly: true, oneVariant: true },
};
/** 部品ごとの見える距離（m）・影・LOD の倍率（低い段は短く） */
const CULL = { tree: 1, 'veg.shrub.tsutsuji': 60, 'veg.hedge': 70, 'veg.planter': 55, 'veg.pot': 32, 'veg.houseplant': 28, 'rock.boulder': 50, 'rock.rubble': 50 };

/** 段の値（quality.js の段の名前・段の値・影の設定） */
export function vegPreset(key, P0 = {}, shadows = !!P0.shadows) {
  const V = VEG_PRESETS[key] || VEG_PRESETS.high;
  return Object.assign({ key, shadows, antialias: !!P0.antialias, post: P0.post || null, meshopt: true, envMap: true }, V);
}
export const VEG = { on: true, P: vegPreset('high'), bank: null, ready: false, loading: null, stats: { ms: 0, sets: 0, items: 0, cover: 0, failed: [], kits: 0 } };
/** 起動の時（区画を組み立てる前でも後でもよい）。key＝段の名前 */
export function vegInit(key, P0, opt = {}) { VEG.P = vegPreset(key, P0, opt.shadows ?? !!P0.shadows); VEG.on = opt.on !== false; }

// ───────────── 置く所の記録（区画の組み立ての間） ─────────────
let _q = [], _c = [];
/** 記録した物を取り出す（区画の組み立ての終わり：areas.js の finish・level.js の buildLevel） */
export function vegTake() { const r = { items: _q, cover: _c }; _q = []; _c = []; return r; }
/**
 * 部品を置く：id・位置（底の中心）・Y の回転・大きさ（数か [x, y, z]）・種類 v。opt.g＝区画の中の Group の名前（その下に置く＝見える／見えないが一緒に変わる）
 * 戻り値は記録した物（試験で使う）
 */
export function vegPut(id, x, y, z, ry = 0, s = 1, v = 0, opt = {}) {
  const it = { id, v, x, y, z, ry, s: Array.isArray(s) ? s : [s, s, s] };
  if (opt.g) it.g = opt.g;
  _q.push(it); return it;
}
/** 木：種（SPECIES）・幹の根元（x, z）・高さ h（m）。向きは位置から決める（同じ所なら同じ） */
export function vegTree(sp, x, z, h, y = 0, ry = null) {
  const S = SPECIES[sp] || SPECIES.broadleaf, k = h / S.h;
  return vegPut(S.id, x, y, z, ry ?? hash(x, z, 1) * Math.PI * 2, [k, k, k], 0);
}
/** 株（雑草 'weed'・草 'grass'）：1 点。s＝大きさ */
export function vegCover(kind, x, z, y = 0, s = 1) { _c.push({ kind, x, y, z, s }); }
/** 線に沿って株を並べる（壁ぎわ・あぜ・用水路の縁）：step m ごと・横に jitter m ずらす・prob の割合だけ。同じ線なら同じ並び */
export function vegCoverLine(kind, x0, z0, x1, z1, step = 0.8, jitter = 0.25, prob = 0.7, y = 0) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / step)), nx = -(z1 - z0) / (L || 1), nz = (x1 - x0) / (L || 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, h0 = hash(x0 + t * (x1 - x0), z0 + t * (z1 - z0), 3);
    if (h0 > prob) continue;
    const o = (hash(x0, z0 + i, 5) - 0.5) * 2 * jitter, a = (hash(i, x0, 7) - 0.5) * step * 0.6;
    vegCover(kind, x0 + t * (x1 - x0) + nx * o + (x1 - x0) / (L || 1) * a, z0 + t * (z1 - z0) + nz * o + (z1 - z0) / (L || 1) * a, y, 0.7 + hash(i, z0, 9) * 0.6);
  }
}
/** 四角の中に株をまく（芝・空き地・田の切り株の間）：1m² あたり density 点 */
export function vegCoverRect(kind, [x0, z0, x1, z1], density = 0.6, y = 0) {
  const n = Math.round((x1 - x0) * (z1 - z0) * density);
  for (let i = 0; i < n; i++) vegCover(kind, x0 + hash(i, x0, 11) * (x1 - x0), z0 + hash(i, z0, 13) * (z1 - z0), y, 0.7 + hash(i, x1, 17) * 0.6);
}
/** 生垣：線（x0,z0）→（x1,z1）・奥行 d・高さ h・底の高さ y。1m 前後の区画に分けて並べる（伸ばしすぎない） */
export function vegHedge(x0, z0, x1, z1, d = 0.7, h = 1.2, y = 0) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.0)), ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; vegPut('veg.hedge', x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, ry + (i % 2 ? Math.PI : 0), [L / n * 1.01, h, d / 0.5], 0); }
}
function hash(a, b, k) { const v = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); }

// ───────────── 読む・置く（起動の後） ─────────────
/** 素材ライブラリの目録を読む（1 回）。読めたら今の区画に置く */
export function vegLoad(game) {
  if (VEG.loading) return VEG.loading;
  if (!VEG.on) return (VEG.loading = Promise.resolve(0));
  const t0 = performance.now();
  VEG.bank = new AssetBank(game.renderer, VEG.P, { adapt: envVegMat, lib: LIB });
  VEG.loading = VEG.bank.loadCatalog().then(() => {
    VEG.ready = true; VEG.stats.catalogMs = Math.round(performance.now() - t0);
    if (game.area) return vegApply(game.area, game).then(() => { VEG.stats.ms = Math.round(performance.now() - t0); return VEG.stats.sets; });
    return 0;
  }).catch(e => { console.warn('vegkit', e); VEG.stats.failed.push(String(e && e.message)); return 0; });
  return VEG.loading;
}

/** 記録した 1 つ → KitSet の物（行列・LOD の中心・半径） */
function toItem(it, size) {
  const [w, h, d] = size || [1, 1, 1], s = it.s;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.ry || 0), new THREE.Vector3(s[0], s[1], s[2]));
  const hh = h * Math.abs(s[1]);
  return { matrix: m, variant: it.v || 0, x: it.x, y: it.y + hh / 2, z: it.z, r: Math.max(hh / 2, Math.max(w * Math.abs(s[0]), d * Math.abs(s[2])) / 2, 0.3) };
}

/** 区画に部品の網を作る（まだの物だけ・非同期）。全部読めたら手続きの代わりの網を隠す */
export async function vegApply(A, game) {
  if (!VEG.ready || !A) return;
  if (A.vegBusy) { A.vegAgain = true; return; }
  const items = (A.vegItems || []).slice(A.vegDoneN || 0), cover = (A.vegCover || []).slice(A.vegDoneC || 0);
  const debris = A.dyn && A.dyn.debris && !A.dyn.debris.vegDone ? A.dyn.debris : null;
  if (!items.length && !cover.length && !debris) return;
  A.vegBusy = true; A.vegDoneN = (A.vegDoneN || 0) + items.length; A.vegDoneC = (A.vegDoneC || 0) + cover.length;
  const P = VEG.P, bank = VEG.bank, sets = A.vegSets || (A.vegSets = []), covers = A.vegCovers || (A.vegCovers = []);
  let dead = 0;
  try {
    // 区画の中の Group ごと（既定は区画の根）・部品の id ごとにまとめる
    const byG = new Map();
    for (const it of items) { const g = it.g || ''; if (!byG.has(g)) byG.set(g, new Map()); const m = byG.get(g); if (!m.has(it.id)) m.set(it.id, []); m.get(it.id).push(it); }
    for (const [g, byId] of byG) {
      const parent = (g && A.root.getObjectByName(g)) || A.root, ks = new KitSet(parent, bank, P);
      for (const [id, list] of byId) {
        const e = bank.byId.get(id), size = e && e.tech && e.tech.sizeM, tree = id.startsWith('veg.tree');
        const its = list.map(it => { const o = toItem(it, size); if (P.oneVariant && !tree) o.variant = 0; return o; });
        const cull = tree ? P.far : (CULL[id] || 40) * (P.key === 'low' ? 0.65 : 1);
        ks.add(id, its, { cull, lodMin: tree && P.treeImpostorOnly ? 99 : undefined, shadow: tree });   // 影は木だけ（低木・鉢・生垣は影の描画を増やさない）
      }
      await ks.build(s => { dead++; VEG.stats.failed.push(s.id); });
      ks.update(game.camera, true);
      sets.push(ks); VEG.stats.sets += ks.stats.sets; VEG.stats.items += ks.stats.items;
    }
    // 株（雑草・草）：段に株がある時だけ。カメラの近く（grassFar）だけ描く
    if (cover.length && P.cover > 0) {
      const every = Math.max(1, Math.round(1 / P.cover)), pts = [];
      cover.forEach((c, i) => { if (i % every) return; pts.push({ x: c.x, y: c.y, z: c.z, fern: c.kind === 'grass', rot: hash(c.x, c.z, 21) * Math.PI * 2, s: c.s }); });
      const gc = await GroundCover.fromPoints(A.root, pts, P).build(bank, COVER_IDS);
      gc.update(game.camera); covers.push(gc); VEG.stats.cover += pts.length;
    }
    // 壊れた跡の瓦礫（ゲームが setMatrixAt で置くインスタンス）：同じ数・同じ行列の瓦礫の部品へ差し替える
    if (debris) { debris.vegDone = true; if (!(await swapDebris(debris))) dead++; }
  } catch (e) { console.warn('vegApply', e); dead++; VEG.stats.failed.push(String(e && e.message)); }
  if (!dead) A.root.traverse(o => { if (o.userData.vegFallback) o.visible = false; });
  A.vegDead = (A.vegDead || 0) + dead;
  // シェーダーを先に作る（並べて作れる時だけ・待たない）＝最初に見えた時に止まりにくく
  try { const r = game.renderer; if (r.compileAsync && r.extensions.has('KHR_parallel_shader_compile')) r.compileAsync(A.root, game.camera).catch(() => {}); else if (game.area === A) r.compile(A.root, game.camera); } catch (e) { void e; }   // 並べて作れない時は今まとめて作る（見えた時に止まらない）
  A.vegBusy = false;
  if (A.vegAgain) { A.vegAgain = false; return vegApply(A, game); }
}

/** 瓦礫のインスタンス網（world/areas4・6・7・8 の debris）を rock.rubble の部品（種類 1・LOD0）の網へ。ゲームは今まで通り D.mesh.setMatrixAt を呼ぶ */
async function swapDebris(D) {
  const kit = await VEG.bank.kit('rock.rubble'); if (!kit) return false;
  const orig = D.mesh, n = orig.count, lod = VEG.P.key === 'low' ? 'v1_LOD1' : 'v1_LOD0', prims = kit.nodes[lod] || Object.values(kit.nodes)[0];
  // 部品（底の中心が原点・0.85×0.62×0.75m）→ 前の 12 面体（中心が原点・半径 0.7〜0.9）と同じくらいの大きさ・中心に
  const pre = new THREE.Matrix4().makeScale(1.7, 1.7, 1.7).multiply(new THREE.Matrix4().makeTranslation(0, -0.31, 0));
  const meshes = prims.map(({ geometry, material }) => {
    const g = geometry.clone().applyMatrix4(pre), m = new THREE.InstancedMesh(g, material, n);
    m.instanceMatrix.array.set(orig.instanceMatrix.array); m.count = n; m.castShadow = false;   // 影の描画の網（新しい影のシェーダー）を戦いの最中に作らない m.receiveShadow = true; m.frustumCulled = false; m.name = 'debris_kit';
    orig.parent.add(m); return m;
  });
  orig.visible = false;
  D.mesh = {
    isVegProxy: true, count: n, orig, meshes,
    setMatrixAt(i, M) { orig.setMatrixAt(i, M); for (const m of meshes) m.setMatrixAt(i, M); },
    getMatrixAt(i, M) { return orig.getMatrixAt(i, M); },
    instanceMatrix: { set needsUpdate(v) { orig.instanceMatrix.needsUpdate = v; for (const m of meshes) m.instanceMatrix.needsUpdate = v; }, get array() { return orig.instanceMatrix.array; } },
  };
  return true;
}

/** 毎フレーム：揺れの時間・月の向き（葉の透け）・LOD（カメラが動いた時だけ）・株 */
const _v = new THREE.Vector3();
export function vegUpdate(A, camera, dt, light = null) {
  windUniforms.uWindTime.value += dt;
  if (!A || !A.vegSets) return;
  if (light) {
    camera.updateMatrixWorld(); _v.copy(light.position).sub(light.target.position).normalize().transformDirection(camera.matrixWorldInverse);
    windUniforms.uSunView.value[0] = _v.x; windUniforms.uSunView.value[1] = _v.y; windUniforms.uSunView.value[2] = _v.z;
  }
  for (const ks of A.vegSets) ks.update(camera);
  for (const gc of A.vegCovers || []) gc.update(camera);
}
/** 夜の町の葉の透け：日の色の代わりに月の色（弱い）・揺れの強さ（雨の夜は少し強く） */
export function vegNight(rain = true) {
  windUniforms.uSunCol.value[0] = 0.42; windUniforms.uSunCol.value[1] = 0.48; windUniforms.uSunCol.value[2] = 0.7;
  windUniforms.uTrans.value = 0.35; windUniforms.uWindStrength.value = rain ? 1.25 : 0.9;
}
/** 調べ・試験用：区画の植物の数 */
export function vegStats(A) {
  const sets = (A && A.vegSets) || [];
  let meshes = 0, visible = 0, inst = 0;
  for (const ks of sets) for (const s of ks.sets) for (const m of s.meshes) { meshes++; if (m.visible && m.count) { visible++; inst += m.count; } }
  return { ready: VEG.ready, on: VEG.on, preset: VEG.P.key, items: (A && A.vegItems || []).length, cover: (A && A.vegCover || []).length, sets: sets.length, meshes, visibleMeshes: visible, instances: inst,
    ids: [...new Set((A && A.vegItems || []).map(i => i.id))], dead: (A && A.vegDead) || 0, failed: VEG.stats.failed.slice(0, 8), ms: VEG.stats.ms, texMB: VEG.bank ? VEG.bank.texMB : 0, glbKB: VEG.bank ? Math.round(VEG.bank.stats.glbBytes / 1024) : 0 };
}
