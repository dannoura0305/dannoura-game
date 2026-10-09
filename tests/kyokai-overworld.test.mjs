// 『境界事象』歩いて回る月代町（kyokai/data/maps.js）のデータのテスト：node tests/kyokai-overworld.test.mjs
// ・章ファイルが定義する場所（KY.AREAS）すべての世界に地図がある（汎用の部屋に頼らない）
// ・地図の行の長さがそろい、知らない文字が無い。出入口（ワープ）の行き先がある・戻りの出入口がある
// ・すべての調べ物が表（SPOTS）に載っていて、アンカーがあり、入口から歩いて正面に立てる（ほかの人物・小物をすべて置いた状態で BFS）
// ・町（フィールド）の入口すべてに、A/B/C どの世界でも歩いて行ける
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message || e)); }
}

function load() {
  const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, JSON, Math, Object, Array, String, Number, isFinite, Promise, Set, Map, setTimeout };
  ctx.window = ctx;
  const pend = [];
  ctx.KY = { EVIDENCE: {}, AREAS: {}, extendArea(id, w, sp) { pend.push([id, w, sp]); } };
  ctx.KY_STORY = { register() {} };
  vm.createContext(ctx);
  vm.runInContext(read('kyokai/data/evidence.js'), ctx);
  const files = [];
  for (let i = 0; i <= 14; i++) files.push('kyokai/story/ch' + String(i).padStart(2, '0') + '.js');
  files.push('kyokai/story/side.js', 'kyokai/story/endings.js');
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  for (const [id, w, sp] of pend) { const a = ctx.KY.AREAS[id]; if (!a) continue; a.worlds[w] = a.worlds[w] || { scene: a.worlds.A.scene, spots: [] }; a.worlds[w].spots.push(...sp); }
  vm.runInContext(read('kyokai/data/maps.js'), ctx, { filename: 'maps.js' });
  return { AREAS: ctx.KY.AREAS, M: ctx.KY_MAPS };
}
const { AREAS, M } = load();
const AREA_IDS = Object.keys(AREAS);
const K = (x, y) => x + ',' + y;
const N4 = (x, y) => [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];

console.log('kyokai overworld maps');

test('すべての場所に地図がある（場所 × その場所の世界）', () => {
  const miss = [];
  for (const id of AREA_IDS) {
    if (!M.has(id)) { miss.push(id); continue; }
    for (const w of Object.keys(AREAS[id].worlds)) { const m = M.compile(id, w); if (!m || m.generic) miss.push(id + '/' + w); }
  }
  assert.deepEqual(miss, []);
});

test('地図の形：行の長さがそろう・知らない文字が無い・アンカーが地図の中', () => {
  const bad = [];
  for (const [id, d] of Object.entries(M.MAPS)) {
    const L = new Set(d.rows.map(r => r.length)); if (L.size !== 1) bad.push(id + ' 行の長さ');
    for (const w of ['A', 'B', 'C']) {
      const m = M.compile(id, w);
      m.g.forEach((r, y) => r.forEach((c, x) => { if (M.CHARS.indexOf(c) < 0) bad.push(`${id}/${w} (${x},${y}) 文字 ${c}`); }));
    }
    for (const [n, [x, y]] of Object.entries(d.anchors || {})) if (x < 0 || y < 0 || x >= d.rows[0].length || y >= d.rows.length) bad.push(id + ' アンカー ' + n);
    const [sx, sy] = d.spawn; if (M.solidAt(M.compile(id, 'A'), sx, sy)) bad.push(id + ' spawn が壁');
  }
  assert.deepEqual(bad, []);
});

test('出入口：行き先がある・行き先の地図に戻りの出入口がある・出入口の前に立てる', () => {
  const bad = [];
  for (const id of Object.keys(M.MAPS)) for (const w of ['A', 'B', 'C']) {
    const m = M.compile(id, w);
    for (const wp of m.warps) {
      if (wp.to !== 'town' && !M.MAPS[wp.to]) { bad.push(`${id}: ${wp.to} の地図がない`); continue; }
      if (wp.to !== 'town' && !M.MAPS[wp.to].warps.some(v => v[2] === id)) bad.push(`${wp.to} に ${id} へ戻る出入口がない`);
      if (!M.entryFor(m, wp)) bad.push(`${id}/${w} (${wp.x},${wp.y}) の前に立てない`);
    }
  }
  // 出入口をたどると町に出られる（行き止まりの部屋が無い）
  for (const id of Object.keys(M.MAPS)) {
    if (M.MAPS[id].noExit) continue;
    const seen = new Set([id]), q = [id]; let ok = false;
    while (q.length) { const c = q.shift(); for (const v of M.MAPS[c].warps) { if (v[2] === 'town') ok = true; else if (!seen.has(v[2])) { seen.add(v[2]); q.push(v[2]); } } }
    if (!ok) bad.push(id + ' から町へ出られない');
  }
  // 町の入口がすべての場所にある
  for (const id of AREA_IDS) {
    const has = Object.keys(M.ENTRANCES).some(k => (M.ENTRANCE_ALIAS[k] || k) === id) || (/^center_/.test(id) && M.ENTRANCES['@center']);
    if (!has) bad.push('町に ' + id + ' の入口がない');
  }
  assert.deepEqual(bad, []);
});

function placeAll(id, w) {
  // その世界の調べ物をすべて置く（cond は無視＝いちばん混んだ状態）
  const m = M.compile(id, w);
  const W = AREAS[id].worlds[w];
  const objs = [], problems = [];
  for (const sp of (W && W.spots) || []) {
    const e = M.spotEntry(id, sp.id);
    if (e === undefined) { problems.push(`${id}/${w}: 表に無い調べ物 ${sp.id}（${sp.label}）`); continue; }
    const p = M.parseSpot(e);
    const at = p.at || m.anchors[p.anchor];
    if (!at) { problems.push(`${id}/${w}: ${sp.id} のアンカー ${p.anchor} が無い`); continue; }
    if (p.sprite && M.solidAt(m, at[0], at[1])) problems.push(`${id}/${w}: ${sp.id} の人物・小物が壁の上（${at}）`);
    if (M.warpAt(m, at[0], at[1])) problems.push(`${id}/${w}: ${sp.id} が出入口の上`);
    objs.push({ id: sp.id, x: at[0], y: at[1], sprite: p.sprite });
  }
  return { m, objs, problems };
}

test('すべての調べ物が表に載り、入口から歩いて正面に立てる（人物・小物をすべて置いても）', () => {
  const bad = [];
  for (const id of AREA_IDS) for (const w of Object.keys(AREAS[id].worlds)) {
    const { m, objs, problems } = placeAll(id, w);
    bad.push(...problems);
    const blocked = new Set(objs.filter(o => o.sprite || !M.solidAt(m, o.x, o.y)).map(o => K(o.x, o.y)));
    const starts = [m.spawn].concat(m.warps.map(v => M.entryFor(m, v)).filter(Boolean));
    for (const [sx, sy] of starts) {
      const R = M.bfs(m, sx, sy, blocked);
      for (const o of objs) {
        const ok = N4(o.x, o.y).some(([x, y]) => R.has(K(x, y)) && !M.warpAt(m, x, y));
        if (!ok) bad.push(`${id}/${w}: ${o.id} の正面に (${sx},${sy}) から行けない`);
      }
      for (const v of m.warps) if (!R.has(K(v.x, v.y))) bad.push(`${id}/${w}: 出入口 (${v.x},${v.y}) に (${sx},${sy}) から行けない`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('表の調べ物 id はどれも実在する（古い行が残っていない）', () => {
  const bad = [];
  for (const [id, T] of Object.entries(M.SPOTS)) {
    const all = new Set(); const a = AREAS[id]; if (!a) { bad.push('場所がない ' + id); continue; }
    Object.values(a.worlds).forEach(W => (W.spots || []).forEach(sp => all.add(sp.id)));
    for (const sid of Object.keys(T)) if (!all.has(sid)) bad.push(id + '/' + sid);
  }
  assert.deepEqual(bad, []);
});

test('町：A/B/C どの世界でも、すべての入口に歩いて行ける', () => {
  const bad = [];
  for (const w of ['A', 'B', 'C']) {
    const m = M.compile('town', w);
    const R = M.bfs(m, m.spawn[0], m.spawn[1], null);
    for (const v of m.warps) if (!R.has(K(v.x, v.y))) bad.push(`${w}: ${v.to} (${v.x},${v.y})`);
    if (M.solidAt(m, m.spawn[0], m.spawn[1])) bad.push(w + ': spawn が壁');
  }
  assert.deepEqual(bad, []);
});

test('ふつうの人の配置（AMBIENT）は歩けるマスの上', () => {
  const bad = [];
  for (const [id, byW] of Object.entries(M.AMBIENT)) for (const [w, list] of Object.entries(byW)) {
    const m = M.compile(id, w);
    for (const [x, y] of list) if (M.solidAt(m, x, y) || M.warpAt(m, x, y)) bad.push(`${id}/${w} (${x},${y})`);
  }
  assert.deepEqual(bad, []);
});

test('地図の無い場所は汎用の部屋（町への出口つき）になる', () => {
  const m = M.compile('demo_office_xyz', 'A');
  assert.ok(m.generic && m.warps.some(v => v.to === 'town') && !M.solidAt(m, m.spawn[0], m.spawn[1]));
});

test('経路：M.path が入口から調べ物の正面まで道を返す', () => {
  const m = M.compile('center_office', 'A');
  const goal = (x, y) => x === 6 && y === 2;
  const p = M.path(m, 6, 8, goal, null);
  assert.ok(Array.isArray(p) && p.length >= 6, 'path ' + JSON.stringify(p));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
