// 配置のファイル（maps/<id>/build/layout.json・wakaba-map-layout/1）の検査：形（mapkit/schema/map-layout.schema.json）＋中身。
// Three.js・Blender・UE5 が同じ layout.json を読むので、読む前にここで確かめる（tools/mapkit/validate_spec.mjs・export_ue_heightmap.mjs が使う）。
// 中身：指紋（hash）が中身と合う・id の重複なし・地形の格子と大きさが合う・物と目的地が地図の中・目的地の建物がある・下草の数が data と合う。
import { validate } from './schema.js';
import { IDS } from './schemas.js';
import { layoutHash } from '../pcg/layout.js';
import { unb64 } from '../pcg/scatter.js';

/**
 * validateLayoutFile(layout, registry, { terrainExists?: (file) => boolean })
 * 戻り値：{ valid, errors: [{path, msg}], warnings: [{path, msg}], counts }
 */
export function validateLayoutFile(L, registry, opt = {}) {
  const v = validate(IDS.mapLayout, L, { registry });
  const errors = v.errors.slice(), warnings = [];
  if (!v.valid) return { valid: false, errors, warnings, counts: null };
  const err = (path, msg) => errors.push({ path, msg }), warn = (path, msg) => warnings.push({ path, msg });

  // 指紋：build_map.mjs は builtFrom を前に足して書く（指紋は builtFrom を除いた中身）
  const { builtFrom, ...rest } = L;
  const h = layoutHash(rest);
  if (h !== L.hash) err('/hash', `指紋が中身と合いません（書いてある ${L.hash}・計算 ${h}）：手で直した時は build_map.mjs で作り直す`);

  // 地形
  const T = L.terrain, [W, D] = L.size;
  if (Math.abs((T.nx - 1) * T.cell - W) > 1e-6 || Math.abs((T.nz - 1) * T.cell - D) > 1e-6) err('/terrain', `格子 ${T.nx}×${T.nz}・${T.cell}m が地図の大きさ ${W}×${D}m と合いません`);
  if (!(T.maxY > T.minY)) err('/terrain', `高さの範囲 ${T.minY}〜${T.maxY} が逆か 0`);
  if (opt.terrainExists && !opt.terrainExists(T.file)) err('/terrain/file', `高さの PNG ${T.file} がありません`);

  // id の重複（建物・部品・物・印・目的地・部屋・扉は同じ名前空間で引くので重ねない。印と扉・目的地は同じ id を持ってよい）
  const seen = new Map();
  const add = (id, where) => { if (seen.has(id)) err(where, `id「${id}」が重複（${seen.get(id)} と）`); else seen.set(id, where); };
  L.buildings.forEach((b, i) => { add(b.id, `/buildings/${i}`); b.parts.forEach((p, k) => add(p.id, `/buildings/${i}/parts/${k}`)); (b.rooms || []).forEach((r, k) => add(r.id, `/buildings/${i}/rooms/${k}`)); });
  L.objects.forEach((o, i) => add(o.id, `/objects/${i}`));
  const ids = (arr, base) => { const s = new Set(); arr.forEach((x, i) => { if (s.has(x.id)) err(`${base}/${i}`, `id「${x.id}」が重複`); s.add(x.id); }); };
  ids(L.goals, '/goals'); ids(L.anchors, '/anchors'); ids(L.paths, '/paths');

  // 範囲（地図の中・高さの範囲の近く）
  const tol = 0.5, lowY = T.minY - 10, highY = T.maxY + 30;
  const inMap = (p, where) => {
    if (p[0] < -tol || p[0] > W + tol || p[2] < -tol || p[2] > D + tol) err(where, `地図の外 [${p.join(', ')}]（0〜${W}・0〜${D}）`);
    else if (p[1] < lowY || p[1] > highY) err(where, `高さ ${p[1]} が地形の範囲（${T.minY}〜${T.maxY}m）から離れすぎ`);
  };
  inMap(L.start, '/start');
  L.goals.forEach((g, i) => { inMap(g.at, `/goals/${i}`); if (g.building && !L.buildings.some(b => b.id === g.building)) err(`/goals/${i}`, `建物「${g.building}」が無い`); });
  L.objects.forEach((o, i) => inMap(o.at, `/objects/${i}`));
  L.anchors.forEach((a, i) => { for (const k of ['at', 'from', 'to']) if (a[k]) inMap(a[k], `/anchors/${i}/${k}`); });
  L.buildings.forEach((b, i) => b.parts.forEach((p, k) => inMap(p.c, `/buildings/${i}/parts/${k}`)));
  L.paths.forEach((p, i) => p.points.forEach((q, k) => inMap(q, `/paths/${i}/points/${k}`)));

  // 下草（u16 の cm の組）
  let inst = 0;
  L.instances.forEach((s, i) => {
    let n = -1; try { n = unb64(s.data).length / 2; } catch (e) { /* 下で誤り */ }
    if (n !== s.count) err(`/instances/${i}`, `count ${s.count} が data の組の数 ${n} と合いません`);
    else inst += n;
    if (W * 100 > 65535 || D * 100 > 65535) warn(`/instances/${i}`, '地図が 655m を超えると u16 の cm に入りません');
  });

  // 数の表（stats）との突き合わせ
  const byLayer = L.objects.reduce((m, o) => (m[o.layer] = (m[o.layer] || 0) + 1, m), {});
  for (const [k, n] of Object.entries(L.stats.counts || {})) if (byLayer[k] !== n) warn('/stats/counts', `${k}：stats は ${n}・objects は ${byLayer[k] || 0}`);

  const kinds = [...new Set([...L.objects.map(o => o.kind), ...L.instances.map(s => s.kind)])].sort();
  return { valid: errors.length === 0, errors, warnings, counts: { buildings: L.buildings.length, parts: L.buildings.reduce((s, b) => s + b.parts.length, 0), objects: L.objects.length, instances: inst, anchors: L.anchors.length, goals: L.goals.length, kinds } };
}
