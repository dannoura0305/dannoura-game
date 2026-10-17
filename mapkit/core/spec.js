// 地図仕様（wakaba-map/1）の検査：スキーマ（形）＋中身のつながり（範囲・id の重複・目的地の解決）。純粋関数・DOM なし。
// docs/wakaba-mapkit/07 §5。配置・地形はフェーズ 2（mapkit/pcg・terrain）。
import { validate } from './schema.js';
import { IDS } from './schemas.js';

/** 目的地として書ける建物の場所 */
export const GOAL_PARTS = ['door', 'front', 'center'];

const inside = (p, size, pad = 0) => Array.isArray(p) && p[0] >= -pad && p[0] <= size.w + pad && p[1] >= -pad && p[1] <= size.d + pad;

/**
 * 目的地の文字列（"h1.door"・"shrine.front"・anchors の id）を解決する。
 * 戻り値：{ kind: 'anchor'|'building', id, part?, at } か { error }
 */
export function resolveGoal(spec, goal) {
  const a = (spec.anchors || []).find(x => x.id === goal);
  if (a) return { kind: 'anchor', id: a.id, at: a.at ? [a.at[0], a.at[2]] : a.from ? [a.from[0], a.from[2]] : null };
  const m = /^([a-z0-9_]+)\.([a-z0-9_]+)$/.exec(goal || '');
  if (!m) return { error: `目的地「${goal}」の形が違います（<建物 id>.door|front|center か anchors の id）` };
  const b = (spec.buildings || []).find(x => x.id === m[1]);
  if (!b) return { error: `目的地「${goal}」の建物 ${m[1]} がありません` };
  if (!GOAL_PARTS.includes(m[2])) return { error: `目的地「${goal}」の場所 ${m[2]} は ${GOAL_PARTS.join('/')} のどれでもありません` };
  if (m[2] === 'door' && b.enterable !== true) return { error: `目的地「${goal}」：建物 ${b.id} は入れない（enterable が true でない）のに door を指しています` };
  return { kind: 'building', id: b.id, part: m[2], at: b.at };
}

/** 中身の検査だけ（スキーマは別）。{ errors:[{path,msg}], warnings:[{path,msg}] } */
export function checkSpec(spec, { fileExists } = {}) {
  const errors = [], warnings = [];
  const E = (path, msg) => errors.push({ path, msg }), W = (path, msg) => warnings.push({ path, msg });
  const size = spec.size || { w: 0, d: 0 };
  // id の重複（道・建物・散布の層・anchors は同じ名前の空間を使う：目的地・avoid の参照がぶつからないように）
  const seen = new Map();
  const reg = (id, path) => { if (seen.has(id)) E(path, `id「${id}」が重複（${seen.get(id)} と）`); else seen.set(id, path); };
  (spec.paths || []).forEach((p, i) => reg(p.id, `/paths/${i}/id`));
  (spec.buildings || []).forEach((b, i) => reg(b.id, `/buildings/${i}/id`));
  (spec.scatter || []).forEach((s, i) => reg(s.layer, `/scatter/${i}/layer`));
  (spec.anchors || []).forEach((a, i) => reg(a.id, `/anchors/${i}/id`));
  // 範囲
  (spec.paths || []).forEach((p, i) => (p.points || []).forEach((q, j) => { if (!inside(q, size)) E(`/paths/${i}/points/${j}`, `点 ${JSON.stringify(q)} がマップの外（${size.w}×${size.d}）`); }));
  (spec.buildings || []).forEach((b, i) => {
    if (!inside(b.at, size)) E(`/buildings/${i}/at`, `位置 ${JSON.stringify(b.at)} がマップの外`);
    else if (b.footprint) { const r = Math.hypot(b.footprint[0], b.footprint[1]) / 2; if (!inside([b.at[0] - r, b.at[1] - r], size) || !inside([b.at[0] + r, b.at[1] + r], size)) W(`/buildings/${i}`, '建物の端がマップの外に出る可能性'); }
  });
  ((spec.terrain || {}).features || []).forEach((f, i) => {
    (f.path || []).forEach((q, j) => { if (!inside(q, size)) E(`/terrain/features/${i}/path/${j}`, `点 ${JSON.stringify(q)} がマップの外`); });
    if (f.center && !inside(f.center, size)) E(`/terrain/features/${i}/center`, '中心がマップの外');
  });
  (spec.anchors || []).forEach((a, i) => {
    for (const k of ['at', 'from', 'to']) if (a[k] && !inside([a[k][0], a[k][2]], size)) E(`/anchors/${i}/${k}`, '位置がマップの外');
    if (a.type === 'stairs' && !(a.from && a.to)) E(`/anchors/${i}`, '階段は from と to が要る');
    if (a.type !== 'stairs' && !a.at) E(`/anchors/${i}`, `${a.type} は at が要る`);
  });
  const g = spec.gameplay || {};
  if (g.start && !inside(g.start, size)) E('/gameplay/start', 'スタートがマップの外');
  (g.goals || []).forEach((goal, i) => { const r = resolveGoal(spec, goal); if (r.error) E(`/gameplay/goals/${i}`, r.error); });
  (g.enemies || []).forEach((e, i) => {
    if (!inside(e.spawn, size)) E(`/gameplay/enemies/${i}/spawn`, '出る位置がマップの外');
    (e.route || []).forEach((q, j) => { if (!inside(q, size)) E(`/gameplay/enemies/${i}/route/${j}`, `巡回の点 ${JSON.stringify(q)} がマップの外`); });
    if (e.id) reg(e.id, `/gameplay/enemies/${i}/id`);
    if (e.speed && e.speed.chase != null && e.speed.chase >= 5.2) W(`/gameplay/enemies/${i}/speed/chase`, `追う速さ ${e.speed.chase}m/s がプレイヤーの走り（5.2m/s）以上：逃げられない`);
  });
  // 戸（フェーズ 4）：建物の扉は入れる家か・仕切りの開口は建物の型にあるか・外の門は at が要る
  const doorIds = new Set();
  (g.doors || []).forEach((d, i) => {
    if (doorIds.has(d.id)) E(`/gameplay/doors/${i}/id`, `戸の id「${d.id}」が重複`); doorIds.add(d.id);
    const m = /^([a-z0-9_]+)\.([a-z0-9_]+)$/.exec(d.id), b = m && (spec.buildings || []).find(x => x.id === m[1]);
    if (b && m[2] === 'door' && b.enterable !== true) E(`/gameplay/doors/${i}`, `建物 ${b.id} は入れない家なので扉がない`);
    else if (b && /^part\d+$/.test(m[2]) && b.kind !== 'jp_house_abandoned') E(`/gameplay/doors/${i}`, `建物 ${b.id}（${b.kind}）には仕切りの開口がない`);
    else if (!b) { if (!d.at) E(`/gameplay/doors/${i}`, `戸「${d.id}」は建物の扉・開口でないので at が要る`); else if (!inside(d.at, size)) E(`/gameplay/doors/${i}/at`, '門がマップの外'); if (d.kind && d.kind !== 'hinged') W(`/gameplay/doors/${i}/kind`, '外の門は開き戸（hinged）の想定'); }
  });
  (g.checkpoints || []).forEach((c, i) => { if (!inside(c.at, size)) E(`/gameplay/checkpoints/${i}/at`, 'チェックポイントがマップの外'); });
  // 範囲の並び（[下, 上]）
  const ranges = [];
  ((spec.terrain || {}).materials || []).forEach((m, i) => { for (const k of ['slope', 'height']) if (m.where && m.where[k]) ranges.push([`/terrain/materials/${i}/where/${k}`, m.where[k]]); });
  (spec.scatter || []).forEach((s, i) => { for (const k of ['slope', 'height']) if (s[k]) ranges.push([`/scatter/${i}/${k}`, s[k]]); });
  for (const [p, r] of ranges) if (r[0] > r[1]) E(p, `範囲 ${JSON.stringify(r)} の下限が上限より大きい`);
  // 地形の元
  const src = (spec.terrain || {}).source || {};
  if (src.type === 'heightmap') {
    if (!src.file) E('/terrain/source/file', '高さマップのファイルが書かれていません');
    else if (fileExists && !fileExists(src.file)) {
      if ((spec.terrain || {}).fallback) W('/terrain/source/file', `高さマップ ${src.file} がまだ無い：fallback（${spec.terrain.fallback.type}）で作る`);
      else E('/terrain/source/file', `高さマップ ${src.file} が無く、fallback もありません`);
    }
    if (src.minY !== undefined && src.maxY !== undefined && src.minY >= src.maxY) E('/terrain/source', 'minY が maxY 以上');
  }
  // 人が決める所の印（AI が勝手に決めない）
  if (!(spec.assumptions || []).length) W('/assumptions', 'AI が仮に決めた所（assumptions）が空：本当に無いか確かめる');
  if ((g.enemies || []).length && !(spec.questions || []).some(q => /敵/.test(q))) W('/gameplay/enemies', '敵を出すかは物語に関わる（人が決める）：questions に残すか、決定の記録を書く');
  return { errors, warnings };
}

/** スキーマ＋中身。{ valid, errors, warnings } */
export function validateSpec(spec, registry, opt = {}) {
  const v = validate(IDS.mapSpec, spec, { registry });
  if (!v.valid) return { valid: false, errors: v.errors, warnings: [] };
  const c = checkSpec(spec, opt);
  return { valid: c.errors.length === 0, errors: c.errors, warnings: c.warnings };
}
