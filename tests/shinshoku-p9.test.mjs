// 『境界侵食』フェーズ9：町の配置（data/town.js）。自宅からアーケードまで歩いて行ける（曲がり角 3 つ以上・まっすぐではない）・
// 物語の目標の場所に全部歩いて届く・歩ける所が閉じている（町の外へ出られない）・道案内の点と道のり・古いセーブの位置の移し替え・
// 町の名前は月代町ではない（名前は出さない）・九条の名前を出さない。
// フェーズ10：中央通り（電車通り・バス通り）・駅前・ガラスの屋根の広場・横丁。自宅・アーケードから駅とバス通りへ歩いて行ける（曲がり角あり）・
// 線路は歩くのを塞がない（止まった電車・架線の柱だけ）・古いセーブ（town1・town2）の位置の移し替え・実在の地名を出さない。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOWN, TOWN_LAYOUT, HOME_O, homeW, homeL, inHome, townSolids, houseFoot, guardSpans, townLamps, navPath, navNext, countTurns, migrateTownPos, MACRO, vehicleRect, catenaryPoles } from '../shinshoku/data/town.js';
import { LEVEL } from '../shinshoku/data/level.js';
import { TARGETS, STEPS } from '../shinshoku/story/chapters.js';
import { AREA_GRAPH } from '../shinshoku/data/areas.js';
import { SaveStore, makeSlot } from '../shinshoku/save/save.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');

// ── 歩ける所の升目（0.25m）：町の当たり判定＋アーケード（data/level.js の店・脇道）＋自宅の壁 ──
const R = 0.35, CELL = 0.25, B = TOWN.bounds;
const solids = townSolids().filter(b => b.maxY > 0.25);
const box = (x0, z0, x1, z1) => ({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: 0, maxY: 3 });
// アーケード：通り（x ±4.5・z −72〜−4）の外（店・脇道の壁は data/level.js から world/level.js が作る）は塞ぐ。
// ただし脇道と閉店の店（中に入れる）と、フェーズ10 の通り抜け（店の跡 → ガラスの屋根の広場）は空ける。x 10.6 より東の広場・町は町の当たり判定で調べる
const open = [box(-4.5, -72, 4.5, -4)].concat(LEVEL.alleys.map(a => a.side > 0 ? box(4.5, Math.min(a.z0, a.z1) + 0.4, 4.5 + a.len, Math.max(a.z0, a.z1) - 0.4) : box(-4.5 - a.len, Math.min(a.z0, a.z1) + 0.4, -4.5, Math.max(a.z0, a.z1) - 0.4)), [box(4.5, -45, 11, -35)],
  LEVEL.shops.filter(s => s.passage).map(s => box(4.5, Math.min(s.z0, s.z1), 10.6, Math.max(s.z0, s.z1))));
const inside = (b, x, z, r = 0) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r;
const arcadeBlocked = (x, z) => z < -4 && x < 17 && !(x >= 10.6 && z >= -34) && !open.some(b => inside(b, x, z));
// 自宅の壁（前の壁は戸口を空ける・横・裏）
const H = LEVEL.home, [hx0, hz0] = homeW(H.minX, H.minZ), [hx1, hz1] = homeW(H.maxX, H.maxZ), half = H.door.w / 2;
const homeWalls = [box(hx0, hz0 - 0.15, HOME_O[0] - half, hz0 + 0.15), box(HOME_O[0] + half, hz0 - 0.15, hx1, hz0 + 0.15), box(hx0 - 0.15, hz0, hx0 + 0.15, hz1), box(hx1 - 0.15, hz0, hx1 + 0.15, hz1), box(hx0, hz1 - 0.15, hx1, hz1 + 0.15)];
const blockers = solids.concat(homeWalls, [box(-4.5, -72, 4.5, -69.2)]);   // 通りの終わりのふさがれた所
const NX = Math.ceil((B.maxX - B.minX) / CELL), NZ = Math.ceil((B.maxZ - B.minZ) / CELL);
const grid = new Uint8Array(NX * NZ);                                       // 1＝塞がっている
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = B.minX + (i + 0.5) * CELL, z = B.minZ + (j + 0.5) * CELL; if (arcadeBlocked(x, z)) grid[j * NX + i] = 1; }
for (const b of blockers) {
  const i0 = Math.max(0, Math.floor((b.minX - R - B.minX) / CELL)), i1 = Math.min(NX - 1, Math.floor((b.maxX + R - B.minX) / CELL));
  const j0 = Math.max(0, Math.floor((b.minZ - R - B.minZ) / CELL)), j1 = Math.min(NZ - 1, Math.floor((b.maxZ + R - B.minZ) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = B.minX + (i + 0.5) * CELL, z = B.minZ + (j + 0.5) * CELL; const cx = Math.max(b.minX, Math.min(x, b.maxX)), cz = Math.max(b.minZ, Math.min(z, b.maxZ)); if (Math.hypot(x - cx, z - cz) < R) grid[j * NX + i] = 1; }
}
const cellOf = (x, z) => [Math.floor((x - B.minX) / CELL), Math.floor((z - B.minZ) / CELL)];
function bfs(x, z) {
  const [si, sj] = cellOf(x, z); const dist = new Int32Array(NX * NZ).fill(-1); const q = [sj * NX + si]; dist[q[0]] = 0; let touchedEdge = false;
  for (let h = 0; h < q.length; h++) { const c = q[h], i = c % NX, j = (c - i) / NX; if (i === 0 || j === 0 || i === NX - 1 || j === NZ - 1) touchedEdge = true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const k = b * NX + a; if (grid[k] || dist[k] >= 0) continue; dist[k] = dist[c] + 1; q.push(k); } }
  return { dist, touchedEdge, at: (x2, z2) => { const [i, j] = cellOf(x2, z2); return dist[j * NX + i]; } };
}
const door = homeW(0, 8.6);                                                 // 玄関の内側（家に入った所）
const W = bfs(door[0], door[1]);
const freeAt = (x, z) => { const [i, j] = cellOf(x, z); return !grid[j * NX + i]; };

t('町の配置：版・自宅の位置（住宅地の中）・月代町の名前を出さない・九条の名前を出さない・実在の地名を出さない', () => {
  assert.equal(TOWN.version, TOWN_LAYOUT); assert.equal(TOWN_LAYOUT, 'town3');
  assert.ok(HOME_O[1] > 30, '自宅はアーケードから離れた住宅地');
  // 調べるのは画面に出る文字（文字列）だけ（注釈は「参考にした」ことを書いてよい）
  const strs = f => (f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '').match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || []).join('\n');
  const all = ['data/town.js', 'world/town.js', 'world/town2.js', 'world/level.js', 'ui/townmap.js', 'world/areas3.js'].map(f => strs(src(f))).join('\n') + JSON.stringify(JSON.parse(src('data/events.json')).texts);
  assert.ok(!all.includes('月代'), '町は月代町ではない（名前も出さない）');
  assert.ok(!all.includes('九条'));
  for (const w of ['富山', '総曲輪', '立山', 'グランドプラザ', '呉羽', '神通', '大和', '北陸', 'セントラム', 'ポートラム', '地鉄', 'JR']) assert.ok(!all.includes(w), '実在の地名・名前を出さない：' + w);
  assert.deepEqual(homeL(...homeW(1.5, 9)), [1.5, 9]); assert.ok(inHome(...homeW(0, 12))); assert.ok(!inHome(0, -20));
});
t('自宅 → アーケード：歩いて届く・まっすぐの線は塞がれている（家から出たら直線上に商店街…ではない）', () => {
  const gate = [0, -6];
  assert.ok(W.at(...gate) > 0, '自宅からアーケードへ歩いて届く');
  const steps = W.at(...gate) * CELL;
  assert.ok(steps > 80, `道のりは 80m 以上（${steps.toFixed(0)}m）`);
  // 玄関から門・アーケードの入口へのまっすぐな線の上に塞がった所がある
  let blocked = 0; const [ax, az] = homeW(0, 5.6); for (let k = 0; k <= 200; k++) { const x = ax + (gate[0] - ax) * k / 200, z = az + (gate[1] - az) * k / 200; if (!freeAt(x, z)) blocked++; }
  assert.ok(blocked > 20, 'まっすぐには行けない（家や塀が間にある）');
});
t('道のり（通しプレイで歩く点の列）：曲がり角 3 つ以上・どの区間も塞がれていない・アーケードで終わる', () => {
  const r = TOWN.route;
  assert.ok(countTurns(r) >= 3, `曲がり角 ${countTurns(r)}`);
  for (let i = 0; i < r.length - 1; i++) for (let k = 0; k <= 40; k++) { const x = r[i][0] + (r[i + 1][0] - r[i][0]) * k / 40, z = r[i][1] + (r[i + 1][1] - r[i][1]) * k / 40; assert.ok(freeAt(x, z), `区間 ${i} の ${x.toFixed(1)},${z.toFixed(1)} が塞がれている`); }
  assert.ok(inHome(...r[0]), '自宅の中から'); assert.ok(r[r.length - 1][1] < -4, 'アーケードの中まで');
  let len = 0; for (let i = 0; i < r.length - 1; i++) len += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
  assert.ok(len > 80 && len < 160, `約 ${len.toFixed(0)}m（ゲームの都合で縮めた 2〜3 分の道のり）`);
});
t('道案内の点：塞がれていない・つながっている（自宅の玄関 → アーケードは曲がり角 3 つ以上）・次の点を返す', () => {
  for (const [k, [x, z]] of Object.entries(TOWN.nav.nodes)) assert.ok(freeAt(x, z), '点 ' + k);
  for (const [a, b] of TOWN.nav.edges) { const A = TOWN.nav.nodes[a], Bn = TOWN.nav.nodes[b]; for (let k = 0; k <= 30; k++) assert.ok(freeAt(A[0] + (Bn[0] - A[0]) * k / 30, A[1] + (Bn[1] - A[1]) * k / 30), `${a}→${b}`); }
  const p = navPath('homeDoor', 'arcade'); assert.ok(p && p.length >= 6, JSON.stringify(p));
  assert.ok(countTurns(p.map(k => TOWN.nav.nodes[k])) >= 3);
  for (const k of Object.keys(TOWN.nav.nodes)) assert.ok(navPath('arcade', k), k + ' へ届く');
  // 家の前から商店街の目標（喫茶の前）へ：次の点は門か道（まっすぐ北ではない）
  const nx = navNext(42, 44.6, -2.5, -33.8); assert.ok(nx[1] > 38, '最初は門・家の前の道へ ' + nx);
  const near = navNext(-1, -30, -2.5, -33.8); assert.deepEqual(near, [-2.5, -33.8], '近ければ目標そのもの');
});
t('物語の目標（商店街＋自宅の段）・拾う物・出入り口・生まれる所：全部、自宅から歩いて届く', () => {
  const pts = [];
  for (const s of STEPS) { const tg = TARGETS[s.id]; if (Array.isArray(tg) && tg[0] === 'shotengai') pts.push([s.id, tg[1], tg[2]]); }
  assert.ok(pts.length >= 6, pts.length);
  for (const p of LEVEL.pickups) pts.push([p.id, p.pos[0], p.pos[1]]);
  pts.push(['exit_alley', -3.7, -66.5], ['spawn_arcade', 0, -2], ['spawn_home_in', ...homeW(0, 8.6)], ['spawn_start', ...homeW(0, 11.5)], ['pipe', -2.6, -30.2], ['companion', -2.5, -33.8]);
  for (const [k, d] of Object.entries(LEVEL.doors)) pts.push(['door_' + k, d.front[0], d.front[1]]);
  for (const k of LEVEL.kiro) pts.push([k.id + '_home', ...k.path[k.path.length - 1]]);
  for (const [id, x, z] of pts) assert.ok(W.at(x, z) >= 0 || W.at(x + 0.3, z) >= 0 || W.at(x - 0.3, z) >= 0 || W.at(x, z + 0.3) >= 0 || W.at(x, z - 0.3) >= 0, `${id}（${x.toFixed(1)},${z.toFixed(1)}）に届かない`);
});
// ── フェーズ10：駅・中央通り（バス通り）・広場 ──
const ARC = bfs(0, -20);
const N = TOWN.nav.nodes;
t('駅と中央通り（電車通り・バス通り）・ガラスの屋根の広場に、自宅からも商店街からも歩いて届く', () => {
  for (const k of ['stDoor', 'stTram', 'stBus', 'stTaxi', 'stClock', 'aveTram', 'aveBus', 'tpW', 'tpE', 'aveETram', 'aveSide', 'gpC', 'ysW', 'aveS1', 'aveXS']) {
    assert.ok(W.at(...N[k]) > 0, '自宅から ' + k); assert.ok(ARC.at(...N[k]) > 0, 'アーケードから ' + k);
  }
  const dHome = W.at(...N.stDoor) * CELL, dArc = ARC.at(...N.stDoor) * CELL;
  assert.ok(dHome > 120 && dHome < 260, `自宅 → 駅 ${dHome.toFixed(0)}m`); assert.ok(dArc > 100 && dArc < 260, `アーケード → 駅 ${dArc.toFixed(0)}m`);
  // まっすぐの線は塞がれている（家・ビルが間にある）
  for (const [a, b] of [[homeW(0, 5.6), N.stDoor], [[0, -20], N.stDoor]]) { let blocked = 0; for (let k = 0; k <= 200; k++) { const x = a[0] + (b[0] - a[0]) * k / 200, z = a[1] + (b[1] - a[1]) * k / 200; if (!freeAt(x, z)) blocked++; } assert.ok(blocked > 20, 'まっすぐには行けない'); }
});
t('道のり（自宅 → 駅・駅 → 商店街）：曲がり角 3 つ以上・どの区間も塞がれていない・届く所で終わる', () => {
  for (const [id, r] of Object.entries(TOWN.routes)) {
    assert.ok(countTurns(r) >= 3, `${id}：曲がり角 ${countTurns(r)}`);
    for (let i = 0; i < r.length - 1; i++) for (let k = 0; k <= 60; k++) { const x = r[i][0] + (r[i + 1][0] - r[i][0]) * k / 60, z = r[i][1] + (r[i + 1][1] - r[i][1]) * k / 60; assert.ok(freeAt(x, z) || inHome(x, z), `${id} 区間 ${i} の ${x.toFixed(1)},${z.toFixed(1)} が塞がれている`); }
    let len = 0; for (let i = 0; i < r.length - 1; i++) len += Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
    assert.ok(len > 120 && len < 320, `${id}：約 ${len.toFixed(0)}m`);
  }
  const hs = TOWN.routes.home_station, sa = TOWN.routes.station_arcade;
  assert.ok(inHome(...hs[0]) && hs[hs.length - 1][1] < -100, '自宅の中 → 駅舎の前'); assert.ok(sa[0][1] < -100 && sa[sa.length - 1][1] < -4 && Math.abs(sa[sa.length - 1][0]) < 4.5, '駅舎の前 → アーケードの中');
  assert.ok(sa.some(([x, z]) => x > 10.6 && x < 36 && z < -6.5 && z > -34), '駅 → 商店街は広場を通る（横丁 → 広場 → 通り抜け）');
  const p = navPath('homeDoor', 'stDoor'); assert.ok(p && countTurns(p.map(k => N[k])) >= 3, JSON.stringify(p));
  const q = navPath('stDoor', 'arcade'); assert.ok(q && q.includes('gpC') && countTurns(q.map(k => N[k])) >= 3, JSON.stringify(q));
});
t('路面電車の線路は歩くのを塞がない（塞ぐのは止まった電車・架線の柱・電停の手すりと柱だけ）・電停の島は上がれる高さ', () => {
  const A = TOWN.avenue, blockers = [];
  for (const tr of A.trams) { const [x0, z0, x1, z1] = vehicleRect(tr.x, tr.z, tr.ry, tr.len, 2.4); blockers.push(box(x0, z0, x1, z1)); }
  for (const [x, z] of catenaryPoles()) blockers.push(box(x - 0.2, z - 0.2, x + 0.2, z + 0.2));
  for (const s of A.stops) { const [x0, z0, x1, z1] = s.rect; if (s.rail) blockers.push(box(s.rail === 'W' ? x0 - 0.1 : x1 - 0.2, z0 - 0.1, s.rail === 'W' ? x0 + 0.5 : x1 + 0.1, z1)); }
  let checked = 0;
  for (const tr of A.tracks) for (let i = 0; i < tr.pts.length - 1; i++) {
    const [ax, az] = tr.pts[i], [bx, bz] = tr.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
    for (let d = 3; d < L - 3; d += 0.5) for (const off of [-0.6, 0, 0.6]) {
      const ux = (bx - ax) / L, uz = (bz - az) / L, x = ax + ux * d - uz * off, z = az + uz * d + ux * off;
      if (z > 46 || blockers.some(b => inside(b, x, z, R + 0.3))) continue;
      assert.ok(freeAt(x, z), `線路の上 ${x.toFixed(1)},${z.toFixed(1)} が塞がれている`); checked++;
    }
  }
  assert.ok(checked > 600, '線路の上を調べた点 ' + checked);
  for (const s of A.stops) assert.ok((() => { const m = townSolids().filter(b => Math.abs(b.minX - s.rect[0]) < 1e-6 && Math.abs(b.maxX - s.rect[2]) < 1e-6 && Math.abs(b.minZ - s.rect[1]) < 1e-6 && Math.abs(b.maxZ - s.rect[3]) < 1e-6); return m.length === 1 && m[0].maxY <= 0.25; })(), '電停の島は歩いて上がれる ' + s.id);
  // 線路を横切って渡れる（電停の前の横断歩道・駅前広場の輪）
  assert.ok(W.at(...N.tpE) > 0 && W.at(...N.stTram) > 0);
});
t('中央通り・駅前の部品：路面電車・架線・電停・バス停・バスターミナル・タクシー・駐輪場・時計・屋根つきの歩道・消雪の水の出口・雪囲い・矢羽根・信号', () => {
  const A = TOWN.avenue, S = TOWN.station;
  assert.ok(A.tracks.length && A.trams.length >= 2 && A.buses.length >= 2 && A.stops.length >= 3 && catenaryPoles().length >= 8 && A.nozzles.length >= 3);
  assert.ok(S.taxi.cars.length >= 3 && S.bus.islands.length >= 2 && S.bikes && S.clock && S.walkway && S.canopy);
  assert.ok(TOWN.props.filter(p => p.kind === 'busstop2').length >= 2 && TOWN.props.filter(p => p.kind === 'yukigakoi').length >= 6 && TOWN.props.filter(p => p.kind === 'snowpole').length >= 8);
  assert.ok(TOWN.crossings.filter(c => c.signal).length >= 5, '信号つきの横断歩道');
  assert.ok(TOWN.gplaza && TOWN.gplaza.ridgeY > 15, 'ガラスの屋根の広場（高い屋根）');
  assert.ok(TOWN.lots.some(l => l.kind === 'machiya') && TOWN.lots.some(l => l.kind === 'tower') && TOWN.lots.some(l => l.kind === 'station'), '町家・ビル・駅舎');
  assert.ok(townLamps().filter(l => l.kind === 'modern').length >= 12, '中央通り・駅前の街灯');
  assert.ok(src('world/level.js').includes('RIDGE = 13.4'), 'アーケードの高い屋根');
});
t('歩ける所は閉じている（町の外・区画の境へ出られない）', () => {
  assert.equal(W.touchedEdge, false, '升目の端（区画の外）に届いてはいけない');
});
t('町の部品：家の建物は区画の中・ガードレールは横断歩道を空ける・街灯（切れた灯・ちらつく灯）', () => {
  for (const L of TOWN.lots.filter(l => l.kind === 'house')) { const f = houseFoot(L), [x0, z0, x1, z1] = L.rect; assert.ok(f[0] >= x0 && f[2] <= x1 && f[1] >= z0 && f[3] <= z1 && f[2] - f[0] > 4 && f[3] - f[1] > 4, L.id); }
  const g = guardSpans(); for (const c of TOWN.crossings) for (const [a, b] of g) assert.ok(b <= c.x0 || a >= c.x1, '横断歩道の前にガードレール');
  const L = townLamps(); assert.ok(L.length >= 20); assert.ok(L.some(l => l.dead) && L.some(l => l.flicker));
  assert.ok(TOWN.props.some(p => p.kind === 'mirror') && TOWN.props.some(p => p.kind === 'vending') && TOWN.props.some(p => p.kind === 'garbage'));
  assert.ok(TOWN.crossings.some(c => c.signal), '信号つきの交差点');
  assert.ok(TOWN.channel && TOWN.park && TOWN.shrine, '用水路・公園・祠');
});
t('古いセーブ（town2・フェーズ9）：歩ける所はそのまま・新しい物に重なった時だけ近い道案内の点へ', () => {
  for (const p of [[42, 0, 40.5], [10.5, 0, 26], [0, 0, 2.8], [-20, 0, 8], [0, 0, -30], [22.6, 0, 15.2]]) { const m = migrateTownPos(p, 'town2'); assert.equal(m.moved, null, JSON.stringify(p)); assert.deepEqual(m.pos, p); }
  const pole = TOWN.streetLights[0].pts[1]; const m = migrateTownPos([pole[0], 0, pole[1]], 'town2'); assert.equal(m.moved, 'nudge'); assert.ok(freeAt(m.pos[0], m.pos[2]), JSON.stringify(m));
  const cur = migrateTownPos([68, 0, -40], TOWN_LAYOUT); assert.equal(cur.moved, null);
  assert.ok(src('main.js').includes('migrateTownPos(pos, s.place.layout)'));
});
t('古いセーブ（town1）の位置を移す：家の中は同じ家具の前・家の前の路地は広場・アーケードはそのまま', () => {
  const a = migrateTownPos([-3.4, 0, 13.6]); assert.equal(a.moved, 'home'); assert.deepEqual(a.pos, [...((p) => [p[0], 0, p[1]])(homeW(-3.4, 13.6))]); assert.ok(inHome(a.pos[0], a.pos[2]));
  const b = migrateTownPos([0, 0, 2.5]); assert.equal(b.moved, 'forecourt'); assert.deepEqual(b.pos, [0, 0, -2]);
  const c = migrateTownPos([1.2, 0, -33]); assert.equal(c.moved, null); assert.deepEqual(c.pos, [1.2, 0, -33]);
  for (const p of [[0, 0, 11.5], [5.9, 0, 15.9], [-5.9, 0, 6.1], [3.9, 0, 3.6], [0, 0, -3.9]]) { const m = migrateTownPos(p); assert.ok(freeAt(m.pos[0], m.pos[2]) || inHome(m.pos[0], m.pos[2]), JSON.stringify(m)); }
  // セーブの形：place.layout は増えるだけ（版は 1 のまま・古いセーブも読める）
  const mem = new Map(); const ls = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const S = new SaveStore(ls); const old = makeSlot({ area: 'shotengai', pos: [0, 0, 11.5], story: { step: 'ch1_katana' } });
  assert.equal(old.place.layout, undefined); assert.equal(S.write('auto', old), true);
  const back = S.load('auto'); assert.equal(back.place.area, 'shotengai'); assert.notEqual(back.place.layout, TOWN_LAYOUT, '古いセーブは layout が無い＝読む時に移す');
  assert.ok(src('main.js').includes('migrateTownPos(pos, s.place.layout)') && src('main.js').includes('slot.place.layout = TOWN_LAYOUT'));
});
t('町全体の見取り図：区画グラフの場所がすべて載っている（区画の id と一致）', () => {
  const areas = new Set(MACRO.districts.map(d => d.area).filter(Boolean));
  for (const a of ['shotengai', 'alley', 'plaza', 'shelter', 'hospital', 'tunnel', 'office', 'lab', 'admin']) { assert.ok(areas.has(a), a); assert.ok(AREA_GRAPH[a], a); }
  assert.ok(MACRO.roads.some(r => r.water) && MACRO.roads.some(r => r.rail), '用水路・川・線路');
  assert.ok(readFileSync(new URL('../docs/shinshoku/TOWN_MAP.md', import.meta.url), 'utf8').includes('自宅'), 'docs/shinshoku/TOWN_MAP.md');
});
t('自宅の段の目標・演出の位置は住宅地の自宅（家の中）', () => {
  for (const id of ['pro_home', 'pro_tv', 'ch1_katana']) { const tg = TARGETS[id]; assert.ok(inHome(tg[1], tg[2]), id); }
  const cs = src('story/cutscenes.js'); assert.ok(cs.includes("pos: homeW(-3.4, 14.4)"), 'テレビの場面の役者の位置');
  assert.ok(src('game/story.js').includes("inHome(P.x, P.z) && homeL(P.x, P.z)[1] > 9.2"), '家に入ったら（居間）');
});

console.log(`shinshoku-p9: ${n} passed`);
