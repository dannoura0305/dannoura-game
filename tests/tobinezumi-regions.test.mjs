// トビネズミMMO Ver.0.5「広がり」：土地の地図（決まった種で同じ・出口と着く所・つながり）・土地ごとの天気のくせ・
// 収集品（出る条件・全員が持っている物は出ない・???の札の条件・出る場所のくせ）・富山への穴の条件・実績とごほうびの飾り・巣に飾る規則・巣の様子（Ver.0.6 で点数はやめた）、
// オフライン版（OfflineBackend）の通し：出口から旅 → 土地ごとの採集物 → 収集品を拾う（二重に入らない）→ 実績 → 富山の穴（条件・?toyama=1）→ 来た穴で戻る、
// 土地をまたいで引っ越す、セーブの移行 v4 → v5。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap, TILE, T, TILE_INFO, gateAt, canDigBurrow, isWaterTile } from '../tobinezumi/shared/regions.js';
import { REGION, REGION_IDS, regionMap, buildRegion, arrivalPoint, CANYON } from '../tobinezumi/shared/world.js';
import { boxFree, makeFieldState, stepField, STEP_DT } from '../tobinezumi/shared/move.js';
import { weatherAt, localWeather, pickWeather, envAt, WEATHER_SLOT_MS } from '../tobinezumi/shared/season.js';
import { makeClock, DAY_MS, HOUR_MS } from '../tobinezumi/shared/daynight.js';
import { buildLands, landAt, safeZones } from '../tobinezumi/shared/lands.js';
import { CURIOS, CURIO_ORDER, SIGNS, CROSSOVER, curioEligible, pickCurioSpawn, curioSpots, gateOpen, gateHint, collectAchievements, unlockedDecor, nestFeatures, nestTourDesc, ACHIEVEMENTS } from '../tobinezumi/shared/collect.js';
import { resourceSpawnPoints } from '../tobinezumi/shared/regions.js';
import { createNest, tryOp, validateOp } from '../tobinezumi/shared/nest-rules.js';
import { FURNITURE, countItem, addItem } from '../tobinezumi/shared/items.js';
import { mulberry32 } from '../tobinezumi/shared/rng.js';
import { OfflineBackend, SAVE_KEY, SAVE_VERSION } from '../tobinezumi/client/net.js';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
function makeLS(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
console.log('tobinezumi-regions (Ver.0.5)');
const MIDNIGHT = DAY_MS * 1_200_000, NOON = MIDNIGHT + 12 * HOUR_MS;

// ───────── 地図 ─────────
await test('土地の地図：同じ種なら必ず同じ（4 つの新しい土地）・はじまりの原は前と同じ地図・大きさ 96×64', () => {
  const old = buildFieldMap();
  assert.deepEqual([...regionMap('plains').tiles], [...old.tiles], 'はじまりの原はタイルを変えていない');
  for (const id of ['rocks', 'dunes', 'canyon', 'toyama']) {
    const a = buildRegion(id), b = buildRegion(id);
    assert.equal(a.w, 96); assert.equal(a.h, 64);
    assert.deepEqual([...a.tiles], [...b.tiles], id);
    assert.deepEqual([...a.ground], [...b.ground], id);
    assert.equal(a.region, id);
  }
  // 土地ごとの特徴
  const count = (m, t) => m.tiles.reduce((n, x) => n + (x === t), 0);
  assert.ok(count(regionMap('rocks'), T.ROCK) > count(regionMap('plains'), T.ROCK) * 3, '岩場は岩が多い');
  assert.ok(count(regionMap('dunes'), T.DUNE) > 1000, '砂丘はさらさら砂');
  assert.ok(count(regionMap('canyon'), T.RIVER) > 200 && count(regionMap('canyon'), T.LEDGE) > 100, '渓谷は川と段差');
  const tm = regionMap('toyama');
  assert.ok(count(tm, T.PADDY) > 800 && count(tm, T.HOUSE) > 200 && count(tm, T.SAKURA) > 8 && count(tm, T.MOUNT) === 96 * 8, '富山は水田・家・桜・北の山');
  assert.ok(resourceSpawnPoints(regionMap('dunes')).length < resourceSpawnPoints(regionMap('canyon')).length / 2, '砂丘は食べ物が少ない');
});
await test('出口：はじまりの原の北・東・西 ↔ 岩場・砂丘・渓谷（両方向）。出口と着く所は通れて、出発点からたどれる', () => {
  const pairs = [['plains', 'rocks'], ['plains', 'dunes'], ['plains', 'canyon']];
  for (const [a, b] of pairs) {
    const ga = regionMap(a).gates.find(g => g.to === b), gb = regionMap(b).gates.find(g => g.to === a);
    assert.ok(ga && gb, a + ' ↔ ' + b);
    assert.ok(boxFree(regionMap(b), arrivalPoint(regionMap(b), a).x, arrivalPoint(regionMap(b), a).y));
    assert.equal(gateAt(regionMap(a), (ga.x0 + ga.x1) / 2, (ga.y0 + ga.y1) / 2).to, b);
    assert.equal(gateAt(regionMap(a), regionMap(a).spawn.x, regionMap(a).spawn.y), null);
  }
  assert.equal(regionMap('toyama').gates.length, 0, '富山へは出口ではつながっていない');
  // 出発点から出口まで（タイルで）たどれる
  for (const id of REGION_IDS) {
    const m = regionMap(id), seen = new Uint8Array(m.w * m.h), q = [[Math.floor(m.spawn.x / 16), Math.floor(m.spawn.y / 16)]];
    const free = (x, y, down) => x >= 0 && y >= 0 && x < m.w && y < m.h && (!TILE_INFO[m.tiles[y * m.w + x]].block || (down && TILE_INFO[m.tiles[y * m.w + x]].ledge));
    seen[q[0][1] * m.w + q[0][0]] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (free(nx, ny, dy > 0) && !seen[ny * m.w + nx]) { seen[ny * m.w + nx] = 1; q.push([nx, ny]); } } }
    for (const g of m.gates) assert.ok(seen[Math.floor(g.ay / 16) * m.w + Math.floor(g.ax / 16)], id + ' → ' + g.to);
    if (m.secret) assert.ok(seen[Math.floor(m.secret.y / 16) * m.w + Math.floor(m.secret.x / 16)], '谷の奥へ行ける');
    if (m.back) assert.ok(seen[Math.floor(m.back.y / 16) * m.w + Math.floor(m.back.x / 16)], '来た穴へ行ける');
  }
});
await test('渓谷の段差：下りるだけ（上がるのは坂から）・大ジャンプでも上へは越えられない', () => {
  const m = regionMap('canyon');
  const blk = (x, y) => TILE_INFO[m.tiles[y * m.w + x]].block;
  let lx = -1, ly = -1;
  for (let x = 20; x < 66 && lx < 0; x++) {
    const yy = CANYON.LEDGE1 + Math.round(Math.sin(x / 6 + m.seed) * 0.6);
    if (m.tiles[yy * m.w + x] === T.LEDGE && [-3, -2, -1, 1, 2, 3].every(d => !blk(x, yy + d))) { lx = x; ly = yy; }
  }
  let st = makeFieldState(lx * 16 + 8, (ly + 3) * 16 + 8);
  for (let i = 0; i < 90; i++) st = stepField(st, { mx: 0, my: -1 }, STEP_DT, m);
  assert.ok(st.y > (ly + 1) * 16 - 2, '下からは上がれない ' + st.y);
  st = stepField(st, { mx: 0, my: -1, jump: true }, STEP_DT, m);
  for (let i = 0; i < 40; i++) st = stepField(st, { mx: 0, my: 0 }, STEP_DT, m);
  assert.ok(st.y > (ly + 1) * 16 - 2, '大ジャンプでも上がれない ' + st.y);
  st = makeFieldState(lx * 16 + 8, (ly - 1) * 16 + 4);
  for (let i = 0; i < 90; i++) st = stepField(st, { mx: 0, my: 1 }, STEP_DT, m);
  assert.ok(st.y > (ly + 1) * 16, '上からは下りられる ' + st.y);
});
await test('土地の性能：岩場は冷えてきれいな石が多い・砂丘は暑い・富山は危険 0・巣は掘れない', () => {
  const pretty = id => [...buildLands(regionMap(id)).values()].filter(L => L.rare === 'pretty_stone').length;
  assert.ok(pretty('rocks') > pretty('plains'));
  assert.ok([...buildLands(regionMap('rocks')).values()].every(L => L.climate === 'cool'));
  assert.ok([...buildLands(regionMap('dunes')).values()].every(L => L.climate === 'hot'));
  assert.ok([...buildLands(regionMap('toyama')).values()].every(L => L.danger === 0 && L.climate === 'cold'));
  assert.deepEqual(safeZones(regionMap('plains')).map(z => z.id), ['oasis', 'plaza'], 'はじまりの原の安全地帯はそのまま');
  const tm = regionMap('toyama');
  assert.equal(canDigBurrow(tm, tm.spawn.x, tm.spawn.y + 48).ok, false);
  assert.ok(isWaterTile(T.RIVER) && isWaterTile(T.CHANNEL) && !isWaterTile(T.DUNE));
});

// ───────── 天気のくせ ─────────
await test('土地ごとの天気：はじまりの原は前と同じ・砂丘は雨が降らない・谷と富山の冬は雪・谷に砂嵐は来ない・決まった計算', () => {
  const clock = makeClock({});
  let rainP = 0, rainD = 0, snowC = 0, stormC = 0, snowPlains = 0, sameP = 0;
  for (let slot = 0; slot < 3000; slot++) {
    const t = slot * WEATHER_SLOT_MS + 1000;
    const p = weatherAt(clock, t).id;
    if (weatherAt(clock, t, 'plains').id === p) sameP++;
    if (p === 'rain') rainP++;
    if (weatherAt(clock, t, 'dunes').id === 'rain') rainD++;
    if (weatherAt(clock, t, 'canyon').id === 'sandstorm') stormC++;
    if (p === 'snow') snowPlains++;
  }
  assert.equal(sameP, 3000); assert.ok(rainP > 100); assert.equal(rainD, 0); assert.equal(stormC, 0); assert.equal(snowPlains, 0);
  const winter = makeClock({}); winter.season = 'winter';
  for (let slot = 0; slot < 2000; slot++) if (weatherAt(winter, slot * WEATHER_SLOT_MS + 1000, 'canyon').id === 'snow') snowC++;
  assert.ok(snowC / 2000 > 0.2 && snowC / 2000 < 0.45, '谷の冬は 3 割ほど雪 ' + snowC / 2000);
  assert.equal(localWeather('rain', 'canyon', 'winter', 5), 'snow');
  assert.equal(localWeather('sandstorm', 'toyama', 'summer', 5), 'rain');
  // envAt：雪は見通しが悪く、外では少し冷える・砂丘は昼のヘビが少なく夜のフクロウが多い
  const c2 = makeClock({ now: NOON }); c2.weather = 'snow';
  const e = envAt(c2, NOON, { map: regionMap('canyon'), x: 400, y: 400, place: 'field' });
  assert.ok(e.vis < 1 && e.life.condPerSec < 0 && e.pred.snake === 0);
  const d = envAt(makeClock({ now: NOON }), NOON, { map: regionMap('dunes'), x: 400, y: 400, place: 'field' });
  assert.ok(d.pred.snake < 0.5 && d.pred.owl > 1.4, JSON.stringify(d.pred));
  const ty = envAt(makeClock({ now: NOON }), NOON, { map: regionMap('toyama'), x: 400, y: 400, place: 'field' });
  assert.deepEqual([ty.pred.owl, ty.pred.fox, ty.pred.snake], [0, 0, 0], '富山には捕食者がいない');
});

// ───────── 収集品・穴・実績 ─────────
await test('収集品：土地・季節・時間帯・天気の条件・全員が持っている物は出ない・???の札は不思議な品 4 つから・出る場所のくせ', () => {
  assert.equal(CURIO_ORDER.length, 24);   // Ver.0.8：季節の行事の品 4 つ   // Ver.0.6：富山の季節の品 2 つ（稲穂・ろうそく） assert.equal(SIGNS.length, 3); assert.equal(CROSSOVER.length, 6);
  assert.equal(CURIOS.dragons_card.desc, 'どこかで見た絵が描かれた札');
  assert.equal(CURIOS.machine_part.desc, '人間の世界のものらしい');
  assert.equal(CURIOS.charm.desc, '見たことのない紋章が刻まれている');
  assert.equal(CURIOS.black_feather.desc, '大きな鳥のものだろうか…');
  assert.equal(CURIOS.odd_crystal.desc, '別の世界から来たような気がする');
  assert.equal(CURIOS.unknown_card.name, '???の札');
  assert.equal(CURIOS.unknown_card.desc, 'よく分からない絵が描かれている。少し硬い。巣に飾れそうだ。とても貴重なもののようだ…');
  const env = (o = {}) => ({ season: 'spring', period: 'day', weather: 'clear', ...o });
  assert.ok(curioEligible(CURIOS.clover, 'plains', env()));
  assert.ok(!curioEligible(CURIOS.clover, 'plains', env({ season: 'winter' })));
  assert.ok(!curioEligible(CURIOS.starbit, 'plains', env()) && curioEligible(CURIOS.starbit, 'plains', env({ period: 'night' })));
  assert.ok(!curioEligible(CURIOS.starbit, 'plains', env({ period: 'night', weather: 'rain' })));
  assert.ok(!curioEligible(CURIOS.shell, 'dunes', env()), 'ほかの土地では出ない');
  const always = () => 0;   // 判定が必ず当たる乱数
  assert.equal(pickCurioSpawn({ region: 'plains', env: env(), present: [], rnd: always }), null, 'だれもいないと出ない');
  assert.equal(pickCurioSpawn({ region: 'plains', env: env(), present: [new Set(['clover'])], rnd: always }).id, 'shell', '持っていない物から');
  assert.equal(pickCurioSpawn({ region: 'plains', env: env(), present: [new Set(['clover', 'shell'])], rnd: always }), null, '全員が持っている物は出ない');
  assert.equal(pickCurioSpawn({ region: 'plains', env: env(), ground: [{ cid: 'clover' }, { cid: 'x' }, { cid: 'y' }], present: [new Set()], rnd: always }), null, '同時に 3 つまで');
  const night = env({ period: 'night' });
  const toy = s => pickCurioSpawn({ region: 'toyama', env: night, present: [new Set(s)], rnd: always });
  const four = ['dragons_card', 'machine_part', 'charm', 'black_feather', 'odd_crystal'];
  assert.notEqual(toy(four.slice(0, 5)), null);
  assert.equal(toy(four.slice(0, 5)).id, 'unknown_card', 'ほかの品を集めた子がいると ???の札');
  assert.equal(pickCurioSpawn({ region: 'toyama', env: night, present: [new Set(four.slice(0, 2).concat(['odd_crystal', 'black_feather']).slice(0, 3))], rnd: () => 0.999 }), null);
  // ???の札はいちばん出にくい
  assert.ok(Object.values(CURIOS).every(c => c.id === 'unknown_card' || c.kind === 'fest' || c.rate > CURIOS.unknown_card.rate));
  // 出る場所：水べ・家のそば
  const pts = resourceSpawnPoints(regionMap('plains'));
  const water = curioSpots(regionMap('plains'), pts, 'water');
  assert.ok(water.length < pts.length && water.length > 3);
  const tm = regionMap('toyama'), near = curioSpots(tm, resourceSpawnPoints(tm), 'house');
  assert.ok(near.every(p => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const tx = Math.floor(p.x / 16) + dx, ty = Math.floor(p.y / 16) + dy; if (tm.tiles[ty * tm.w + tx] === T.HOUSE) return true; } return false; }));
  // 決まった乱数なら同じ結果
  const run = seed => { const r = mulberry32(seed); const out = []; for (let i = 0; i < 200; i++) { const d = pickCurioSpawn({ region: 'canyon', env: env({ season: 'autumn' }), present: [new Set()], rnd: r }); out.push(d ? d.id : '-'); } return out.join(','); };
  assert.equal(run(9), run(9));
});
await test('富山への穴：谷の夜・初めては冬と雪としるし 3 つ・見つけたあとは夜ならいつでも・開発用の force', () => {
  const owned = new Set(SIGNS);
  const E = o => ({ season: 'winter', period: 'night', weather: 'snow', ...o });
  assert.equal(gateOpen({ region: 'canyon', env: E(), owned }), true);
  assert.equal(gateOpen({ region: 'plains', env: E(), owned }), false, '谷だけ');
  assert.equal(gateOpen({ region: 'canyon', env: E({ weather: 'clear' }), owned }), false, '雪のとき');
  assert.equal(gateOpen({ region: 'canyon', env: E({ season: 'autumn' }), owned }), false, '冬だけ');
  assert.equal(gateOpen({ region: 'canyon', env: E({ period: 'day' }), owned }), false, '夜だけ');
  assert.equal(gateOpen({ region: 'canyon', env: E(), owned: new Set(SIGNS.slice(0, 2)) }), false, 'しるし 3 つ');
  assert.equal(gateOpen({ region: 'canyon', env: E({ season: 'summer', weather: 'clear' }), owned: new Set(), found: true }), true, '見つけたあとは夜なら');
  assert.equal(gateOpen({ region: 'canyon', env: E({ period: 'day' }), owned: new Set(), found: true }), false);
  assert.equal(gateOpen({ region: 'canyon', env: E({ period: 'day' }), owned: new Set(), force: true }), true);
  assert.match(gateHint({ env: E(), owned: new Set(['sign_fur']) }), /しるし 1\/3/);
  assert.match(gateHint({ env: E({ weather: 'clear' }), owned }), /雪/);
});
await test('実績：収集品の数・不思議な品すべて・ごほうびの飾り（実績のあとで使える）・巣の様子の数え方（点数なし）', () => {
  assert.deepEqual(collectAchievements(new Set(['a', 'b', 'c', 'd'])), []);
  assert.deepEqual(collectAchievements(new Set(['a', 'b', 'c', 'd', 'e'])), ['collector5']);
  assert.ok(collectAchievements(new Set(CROSSOVER)).includes('crossover6'));
  assert.deepEqual(unlockedDecor(['seasons4', 'regions4', 'first_burrow']).sort(), ['star_lamp', 'wreath']);
  for (const a of ACHIEVEMENTS) if (a.reward) assert.equal(FURNITURE[a.reward].unlock, a.id, a.id);
  const d0 = createNest({ seed: 1 });
  const r1 = tryOp(d0, { op: 'place', type: 'curio', x: d0.rooms[0].x, y: d0.rooms[0].y + 1, item: 'shell' }, null, { owned: new Set(['shell']), unlocks: new Set() });
  assert.equal(r1.ok, true, r1.reason);
  assert.equal(r1.data.objects.find(o => o.type === 'curio').item, 'shell');
  assert.equal(nestFeatures(r1.data).curios, 1); assert.equal(nestFeatures(d0).curios, 0);
  assert.ok(!('score' in nestFeatures(r1.data)), 'Ver.0.6：点数はつけない');
  assert.match(nestTourDesc(nestFeatures(r1.data)), /飾った品 1/);
});
await test('巣に飾る：図鑑にある品だけ・同じ巣に 1 つ・壁にも床にも（mount any）・きれいな石の飾りは石を使う・ごほうびは鍵つき', () => {
  const d = createNest({ seed: 3 }), room = d.rooms[0];
  const ctx = { owned: new Set(['shell', 'clover']), unlocks: new Set(['wreath']) };
  const inv = [{ id: 'pretty_stone', n: 1 }, { id: 'grass', n: 5 }, null, null, null, null, null, null];
  assert.equal(validateOp(d, { op: 'place', type: 'curio', x: room.x, y: room.y, item: 'starbit' }, inv, ctx).reason, '図鑑に無い品は飾れない');
  assert.equal(validateOp(d, { op: 'place', type: 'curio', x: room.x, y: room.y }, inv, ctx).reason, '飾る物が無い');
  const a = tryOp(d, { op: 'place', type: 'curio', x: room.x, y: room.y, item: 'shell' }, inv, ctx);   // 天井近く（壁）
  assert.equal(a.ok, true, a.reason);
  assert.equal(validateOp(a.data, { op: 'place', type: 'curio', x: room.x + 1, y: room.y + room.h - 1, item: 'shell' }, inv, ctx).reason, 'もう この巣に飾ってある');
  assert.equal(tryOp(a.data, { op: 'place', type: 'curio', x: room.x + 1, y: room.y + room.h - 1, item: 'clover' }, inv, ctx).ok, true, '床にも');
  assert.equal(validateOp(d, { op: 'place', type: 'star_lamp', x: room.x, y: room.y }, inv, ctx).reason, '実績のごほうび（まだ使えない）');
  assert.equal(validateOp(d, { op: 'place', type: 'wreath', x: room.x + 2, y: room.y + 1 }, inv, ctx).ok, true);
  const sd = validateOp(d, { op: 'place', type: 'stone_display', x: room.x + 3, y: room.y + room.h - 1 }, inv, ctx);
  assert.equal(sd.ok, true); assert.deepEqual(sd.cost, { pretty_stone: 1 });
  assert.equal(validateOp(d, { op: 'place', type: 'stone_display', x: room.x + 3, y: room.y + room.h - 1 }, [null, null, null, null, null, null, null, null], ctx).reason, '素材が足りない');
});

// ───────── オフライン版の通し ─────────
async function offline(opts = {}) {
  const ls = makeLS(), clock = { t: opts.t || NOON };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc: false, env: true, predators: 'off', wild: false, curios: true, ...opts.net });
  await n.login('local');
  await n.createCharacter({ name: 'たびびと', fur: 'sand', sex: 'f' });
  const j = await n.joinField();
  const events = [];
  for (const ev of ['collect', 'achievement', 'res_spawn', 'res_gone', 'toast']) n.on(ev, m => events.push({ ev, ...m }));
  return { n, ls, clock, j, events };
}
const onGate = (n, to) => { const g = n.map.gates.find(q => q.to === to); n.auth = makeFieldState((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2); };
await test('オフライン：出口でだけ旅をする → 土地ごとに採集物（はじまりの原は前と同じ save.world）→ 戻る・4 つめぐると実績', async () => {
  const G = await offline();
  const { n } = G;
  assert.equal(G.j.world.region, 'plains');
  assert.equal((await n.travel('rocks')).ok, false, '出口ではない');
  onGate(n, 'rocks');
  const r = await n.travel('rocks');
  assert.equal(r.ok, true, r.reason); assert.equal(r.world.region, 'rocks'); assert.equal(n.map.region, 'rocks');
  assert.ok(r.world.resources.length > 20);
  assert.ok(n.save.worlds.rocks.resources.length === r.world.resources.length);
  assert.ok(boxFree(n.map, r.world.you.x, r.world.you.y));
  const plainsCount = n.save.world.resources.length;
  onGate(n, 'plains');
  const back = await n.travel('plains');
  assert.equal(back.world.region, 'plains'); assert.equal(back.world.resources.length, plainsCount);
  for (const to of ['dunes', 'canyon']) { onGate(n, to); assert.equal((await n.travel(to)).ok, true); onGate(n, 'plains'); assert.equal((await n.travel('plains')).ok, true); }
  assert.ok(G.events.some(e => e.ev === 'achievement' && e.id === 'regions4'));
  // 保存して読みなおすと同じ土地
  onGate(n, 'dunes'); await n.travel('dunes');
  const n2 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: false, wild: false });
  const j2 = await n2.joinField();
  assert.equal(j2.world.region, 'dunes'); assert.equal(n2.map.region, 'dunes');
});
await test('オフライン：収集品が出る → 拾うと図鑑へ（持ち物は使わない）→ もう持っている物は拾えない・夜の品は昼に消える・5 つで実績', async () => {
  const G = await offline();
  const { n } = G;
  n.clock.season = 'spring';
  const res = n.curioTick(G.clock.t, 'shell');
  assert.ok(res && res.kind === 'curio' && res.cid === 'shell');
  n.auth = makeFieldState(res.x, res.y);
  const p = await n.pickup(res.id);
  assert.equal(p.ok, true, p.reason); assert.equal(p.cid, 'shell');
  assert.ok(n.save.collection.shell);
  assert.equal(countItem(n.save.player.inv, 'curio'), 0);
  assert.ok(G.events.some(e => e.ev === 'collect' && e.cid === 'shell' && e.total === 1));
  const again = n.placeCurio('shell', res.x, res.y);
  const p2 = await n.pickup(again.id);
  assert.equal(p2.ok, false); assert.equal(p2.have, true);
  // 夜だけの品は昼の判定で消える
  const sb = n.placeCurio('starbit', res.x + 40, res.y);
  n.curioTick(G.clock.t);
  assert.ok(!n._w().resources.some(r => r.id === sb.id));
  // 自然に出る（その土地・季節に合う物・まだ持っていない物）
  // （上の curioTick で もう出ていることがある：5% ほど。そのときは それを使う＝前の版のテストのまれな失敗を直した）
  let got = n._w().resources.find(r => r.kind === 'curio' && r.cid === 'clover') || null;
  for (let i = 0; i < 300 && !got; i++) got = n.curioTick(G.clock.t);
  assert.ok(got && got.cid === 'clover', JSON.stringify(got));
  await n.dev({ collect: ['ammonite', 'crystal', 'desert_rose', 'clover'] });
  assert.ok(G.events.some(e => e.ev === 'achievement' && e.id === 'collector5' && e.reward === 'curio_shelf'));
  const col = await n.collection();
  assert.equal(Object.keys(col.owned).length, 5);
});
await test('オフライン：富山の穴（谷の奥・冬の雪の夜・しるし 3 つ）→ 富山（巣は掘れない・捕食者なし）→ 来た穴で谷へ。?toyama=1 ならいつでも', async () => {
  const G = await offline({ t: MIDNIGHT + 23 * HOUR_MS });
  const { n } = G;
  await n.dev({ region: 'canyon' });
  const sec = n.map.secret;
  n.auth = makeFieldState(sec.x + 4, sec.y);
  n._gateTick(true);
  assert.equal(n.gate, null);
  const no = await n.enterGate();
  assert.equal(no.ok, false); assert.match(no.reason, /しるし/);
  await n.dev({ collect: SIGNS });
  n.clock.season = 'winter'; n.clock.weather = 'snow'; n.moveEnv = null; n.lifeEnv = null;
  n._gateTick(true);
  assert.ok(n.gate && n.gate.x === sec.x);
  const r = await n.enterGate();
  assert.equal(r.ok, true, r.reason); assert.equal(r.world.region, 'toyama'); assert.equal(r.first, true);
  assert.ok(G.events.some(e => e.ev === 'achievement' && e.id === 'toyama'));
  assert.equal(n.save.toyama, true);
  assert.equal((await n.digBurrow()).ok, false, '巣は掘れない');
  assert.equal(r.world.gate.back, true);
  n.auth = makeFieldState(n.map.back.x + 4, n.map.back.y);
  const b = await n.enterGate();
  assert.equal(b.ok, true); assert.equal(b.world.region, 'canyon');
  // ?toyama=1（開発用）：しるしが無くても・昼でも開く
  const H = await offline({ t: NOON, net: { toyama: true } });
  await H.n.dev({ region: 'canyon' });
  H.n.auth = makeFieldState(H.n.map.secret.x, H.n.map.secret.y);
  assert.equal((await H.n.enterGate()).world.region, 'toyama');
});
await test('オフライン：土地をまたいで引っ越す（巣の中身はそのまま・入口はその土地に）・飾る（図鑑の品）・3 つで実績', async () => {
  const G = await offline();
  const { n } = G;
  addItem(n.save.player.inv, 'pebble', 20); addItem(n.save.player.inv, 'grass', 20);
  let spot = null;
  for (let ty = 8; ty < 56 && !spot; ty++) for (let tx = 8; tx < 88 && !spot; tx++) { const x = tx * 16 + 8, y = ty * 16 + 8; if (Math.hypot(x - n.map.spawn.x, y - n.map.spawn.y) > 160 && landAt(n.map, x, y).hardness < 4 && canDigBurrow(n.map, x, y, n._entrances()).ok) spot = { x, y }; }
  n.auth = makeFieldState(spot.x, spot.y);
  const d = await n.digBurrow();
  assert.equal(d.ok, true, d.reason); assert.equal(d.entrance.region, 'plains');
  assert.ok(G.events.some(e => e.ev === 'achievement' && e.id === 'first_burrow'));
  await n.dev({ region: 'canyon' });
  let s2 = null;
  for (let ty = 22; ty < 36 && !s2; ty++) for (let tx = 8; tx < 80 && !s2; tx++) { const x = tx * 16 + 8, y = ty * 16 + 8; if (canDigBurrow(n.map, x, y, n._entrances()).ok && landAt(n.map, x, y).hardness < 4) s2 = { x, y }; }
  n.auth = makeFieldState(s2.x, s2.y);
  const rl = await n.relocate();
  assert.equal(rl.ok, true, rl.reason); assert.equal(rl.fromRegion, 'plains'); assert.equal(rl.entrance.region, 'canyon');
  assert.ok(n._entrances().some(e => e.own));
  const rec = n.save.nests[n.save.player.nestId];
  assert.equal(rec.region, 'canyon');
  // 入って飾る
  n.auth = makeFieldState(rl.entrance.x, rl.entrance.y + 4);
  const e = await n.enterNest(n.save.account.id);
  assert.equal(e.ok, true, e.reason);
  await n.dev({ collect: ['shell', 'clover', 'kingfisher'] });
  const room = e.nest.data.rooms[0];
  for (const [i, item] of ['shell', 'clover', 'kingfisher'].entries()) {
    const r = await n.nestOp(e.nest.id, n.save.nests[e.nest.id].rev, { op: 'place', type: 'curio', x: room.x + i, y: room.y + 1, item });
    assert.equal(r.ok, true, r.reason);
  }
  assert.equal((await n.nestOp(e.nest.id, n.save.nests[e.nest.id].rev, { op: 'place', type: 'curio', x: room.x + 4, y: room.y + 1, item: 'starbit' })).ok, false);
  assert.ok(G.events.some(x => x.ev === 'achievement' && x.id === 'display3'));
  const rk = await n.nestTour();   // Ver.0.6：巣めぐり（自分の巣は出ない・順位なし）
  assert.equal(rk.ok, true); assert.ok(rk.list.every(x => x.name !== 'たびびと' && !('rank' in x) && !('score' in x)));
});
await test('オフライン：セーブの移行 v4 → v5（いる土地・図鑑・実績の入れ物。持ち物・巣・採集物はそのまま）', async () => {
  const G = await offline();
  const s = JSON.parse(JSON.stringify(G.n.save));
  s.v = 4; delete s.worlds; delete s.collection; delete s.achievements; delete s.progress; delete s.player.region;
  for (const e of s.entrances) delete e.region;
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(s), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls, now: () => G.clock.t, npc: false, wild: false });
  assert.equal(n2.save.v, SAVE_VERSION); assert.ok(SAVE_VERSION >= 5);   // Ver.0.6 で 6
  assert.equal(n2.save.player.region, 'plains');
  assert.deepEqual(n2.save.collection, {}); assert.deepEqual(n2.save.achievements, {});
  assert.deepEqual(n2.save.player.inv, G.n.save.player.inv);
  assert.equal(n2.save.world.resources.length, G.n.save.world.resources.length);
  n2.flush();
  assert.equal(JSON.parse(ls.getItem(SAVE_KEY)).v, SAVE_VERSION); assert.equal(ls.getItem('dannoura_save'), 'keep');
  const j = await n2.joinField();
  assert.equal(j.world.region, 'plains'); assert.ok(j.world.collection);
});

console.log(`\ntobinezumi-regions: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
