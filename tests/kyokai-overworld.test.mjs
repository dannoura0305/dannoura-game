// 『境界事象』歩いて回る月代町（kyokai/data/maps.js）のデータのテスト：node tests/kyokai-overworld.test.mjs
// ・章ファイルが定義する場所（KY.AREAS）すべての世界に地図がある（汎用の部屋に頼らない）
// ・地図の行の長さがそろい、知らない文字が無い。出入口（ワープ）の行き先がある・戻りの出入口がある
// ・すべての調べ物が表（SPOTS）に載っていて、アンカーがあり、入口から歩いて正面に立てる（ほかの人物・小物をすべて置いた状態で BFS）
// ・町（フィールド）の入口すべてに、A/B/C どの世界でも歩いて行ける
// ・ドット絵（kyokai/tiles.js）：どの地図・世界も 4 色だけで描く・屋内の壁は 2 マスの高さ・人物は 16×16 の 4 方向 2 歩・だんのうらは歩く人物にしない
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
  // 絵を描く関数は、色だけを記録する偽のキャンバスで動かす
  const used = new Set();
  const ctx2d = { set fillStyle(v) { used.add(v); }, get fillStyle() { return ''; }, fillRect() {} };
  ctx.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) };
  vm.runInContext(read('kyokai/tiles.js'), ctx, { filename: 'tiles.js' });
  return { AREAS: ctx.KY.AREAS, M: ctx.KY_MAPS, KT: ctx.KY_TILES, used };
}
const { AREAS, M, KT, used } = load();
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
  const p = M.path(m, 6, 11, goal, null);
  assert.ok(Array.isArray(p) && p.length >= 6, 'path ' + JSON.stringify(p));
});

test('ドット絵：どの地図・世界も 4 色だけで描く（描いている途中で落ちない）', () => {
  const PAL = ['#010101', '#020202', '#030303', '#040404'];
  const bad = [];
  for (const id of Object.keys(M.MAPS).concat(['town'])) for (const w of ['A', 'B', 'C']) {
    used.clear();
    const m = M.compile(id, w);
    for (const flags of [{}, { boardBlank: true, basementOpen: true }]) KT.render(m, w, PAL, flags);
    const extra = [...used].filter(c => PAL.indexOf(c) < 0);
    if (extra.length) bad.push(`${id}/${w}: ${extra.join(',')}`);
  }
  assert.deepEqual(bad, []);
  assert.equal(KT.errors, 0, '描いている途中で落ちたマスがある');
});

test('屋内の部屋：上の壁は 2 マスの高さ（上段＋物を掛ける下段）・壁の扉の下は床・スマホでも入る幅', () => {
  const bad = [];
  const WALLT = '#wjcIaMeJD';
  for (const [id, d] of Object.entries(M.MAPS)) {
    if (!d.indoor) continue;
    const m = M.compile(id, 'A');
    if (m.w > 14) bad.push(id + ' 幅 ' + m.w);
    if (!/^#+$/.test(d.rows[0])) bad.push(id + ' 1 行目が壁でない');
    for (let x = 1; x < m.w - 1; x++) {
      if (WALLT.indexOf(m.g[1][x]) < 0) bad.push(`${id} (${x},1) が壁の下段でない`);
      if (m.g[1][x] === 'D' && !M.walkable(m.g[2][x])) bad.push(`${id} (${x},1) の扉の下が床でない`);
    }
  }
  assert.deepEqual(bad, []);
});

test('人物・生き物の絵：16×16・4 色の文字だけ・人は 4 方向で歩く 2 コマ・だんのうらは出さない', () => {
  const bad = [];
  assert.ok(KT.SPRITES.length > 20);
  for (const id of KT.SPRITES) for (const d of ['u', 'd', 'l', 'r']) for (const f of [0, 1, 2]) {
    const rows = KT.sprite(id, d, f);
    if (rows.length !== 16 || rows.some(r => r.length !== 16 || /[^0-3.]/.test(r))) bad.push(`${id}/${d}/${f}`);
  }
  for (const id of Object.keys(KT.PEOPLE)) for (const d of ['u', 'd', 'l']) {
    if (KT.sprite(id, d, 1).join() === KT.sprite(id, d, 0).join()) bad.push(id + '/' + d + ' 歩くコマが同じ');
  }
  assert.ok(KT.isPerson('player') && KT.isPerson('nagi') && KT.isPerson('kujo') && KT.SPRITES.indexOf('shiro') >= 0);
  assert.ok(!KT.SPRITES.some(id => /dannoura|danno/i.test(id)), 'だんのうらは歩く人物にしない');
  assert.deepEqual(bad, []);
});

test('地面の飾り：まとまりの乱数は 0〜1・校庭のトラックと枕木は地図の中・飾りは歩けるマスを変えない', () => {
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) { const v = KT.field3(x, y, 71); assert.ok(v >= 0 && v < 1, 'field3 ' + v); }
  const sc = M.MAPS.school, tr = sc.track; const h = sc.rows.length, w = sc.rows[0].length;
  assert.ok(tr && tr[0] - tr[2] >= 0 && tr[0] + tr[2] < w && tr[1] - tr[3] >= 0 && tr[1] + tr[3] < h, '校庭のトラックが地図の外');
  const tn = M.MAPS.tunnel; assert.ok(tn.sleepers && tn.sleepers[0] >= 0 && tn.sleepers[1] < tn.rows[0].length);
  assert.equal(typeof KT.decorOut, 'function'); assert.equal(typeof KT.decorIn, 'function');
});

test('正面の物の名札：分室の時計・ホワイトボード・カレンダー・世界 B の振り子時計', () => {
  const m = M.compile('center_office', 'A');
  const a = M.MAPS.center_office.anchors;
  assert.equal(KT.name(m, a.clock[0], a.clock[1], 'A'), '壁の時計');
  assert.equal(KT.name(m, a.board[0], a.board[1], 'A'), 'ホワイトボード');
  assert.equal(KT.name(m, a.calendar[0], a.calendar[1], 'A'), 'カレンダー');
  assert.equal(KT.name(M.compile('center_office', 'B'), a.clock[0], a.clock[1], 'B'), '振り子時計');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
