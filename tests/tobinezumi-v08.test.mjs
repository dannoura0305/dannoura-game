// トビネズミ Ver.0.8「季節のたのしみ」の共有ルールとオフライン：季節の行事（日程の決定性・参加の条件・印・ごほうびは 1 回だけ・NPC も参加）・
// 土地の名前（決定的・同じ土地で重ならない・id はそのまま）・家族のやりとりの言葉（行事・季節×天気）・富山の行事の夜の小さなもの・セーブ v7 → v8。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap, canDigBurrow, TILE } from '../tobinezumi/shared/regions.js';
import { boxFree } from '../tobinezumi/shared/move.js';
import { DAY_MS, HOUR_MS } from '../tobinezumi/shared/daynight.js';
import { SEASON_MS } from '../tobinezumi/shared/season.js';
import { festivalAt, festivalAtWorld, nextFestival, festNote, festActBlock, makeMark, marksVisible, offerPileSize, sparkleSet, shootingStars, npcMarks, npcSeat, onHill, homeSpot,
  FEST, FESTIVALS, FEST_IDS, FEST_REWARDS, OFFER_SPOT, HILL_SEATS, HILL_SPOT, festTalkCtx } from '../tobinezumi/shared/festival.js';
import { CURIOS, FEST_CURIOS, pickCurioSpawn } from '../tobinezumi/shared/collect.js';
import { buildLands, landOut, LAND_WORDS, LAND_FORMS, PLOT_COLS, PLOT_ROWS } from '../tobinezumi/shared/lands.js';
import { regionMap } from '../tobinezumi/shared/world.js';
import { talkInSlot, DIALOGUES, TALK, talkContext } from '../tobinezumi/shared/family-talk.js';
import { familyScene } from '../tobinezumi/shared/family-life.js';
import { toyamaFestProps, TOYAMA_FEST } from '../tobinezumi/shared/toyama.js';
import { OfflineBackend, SAVE_KEY, SAVE_VERSION, NPCS } from '../tobinezumi/client/net.js';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
function makeLS(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}
const map = buildFieldMap();
const BAD_WORDS = ['だんのうら', '壇ノ浦', '壇の浦', 'ダンノウラ', '境界事象', 'わかば'];
const OCC = 1_000_000 * 4;                 // 春の回（4 の倍数）
const W = (occ, h) => occ * SEASON_MS + h * HOUR_MS;
console.log('tobinezumi-v08 (Ver.0.8)');

// ───────── 季節の行事の日程 ─────────
await test('日程：季節ごとに 1 つ（春 花の種まき・夏 星見・秋 月見・冬 灯り）・1 日目 19 時〜2 日目 5 時・世界の時計だけで決まる', () => {
  const ids = [0, 1, 2, 3].map(k => festivalAtWorld(W(OCC + k, 20)).id);
  assert.deepEqual(ids, ['hana', 'hoshi', 'tsuki', 'akari']);
  assert.deepEqual(FEST_IDS, ids);
  assert.equal(festivalAtWorld(W(OCC, 18.99)).phase, 'before');
  assert.equal(festivalAtWorld(W(OCC, 19)).phase, 'during');
  assert.equal(festivalAtWorld(W(OCC, 28.99)).phase, 'during');
  assert.equal(festivalAtWorld(W(OCC, 29)).phase, 'after');
  assert.equal(festivalAtWorld(W(OCC, 47.9)).phase, 'after');
  assert.equal(festivalAtWorld(W(OCC, 20)).occ, OCC);
  // 同じ世界の時刻なら どの時計（origin・scale がちがっても）同じ
  const w = W(OCC + 2, 21.5);
  const c1 = { scale: 1, origin: 0, base: w - 5000 }, c2 = { scale: 60, origin: 1000, base: w - 60 * 4000 };
  assert.deepEqual(festivalAt(c1, 5000), festivalAt(c2, 5000));
  assert.equal(festivalAt(c1, 5000).id, 'tsuki');
  // 開発用：on はいつでも 'during'・off は 'before'・季節の固定
  assert.equal(festivalAt({ base: W(OCC, 3), fest: 'on' }, 0).phase, 'during');
  assert.equal(festivalAt({ base: W(OCC, 22), fest: 'off' }, 0).phase, 'before');
  assert.equal(festivalAt({ base: W(OCC, 22), season: 'winter' }, 0).id, 'akari');
  // 行事の夜は 世界の 10 時間（実時間 10 分）
  assert.equal(FEST.TO_H - FEST.FROM_H, 10);
});

await test('次の行事：もうすぐ／いま／あと（次の季節）・暦の 1 行（実時間の目安）', () => {
  const b = nextFestival({ base: W(OCC, 10) }, 0);
  assert.equal(b.now, false); assert.equal(b.fest.id, 'hana'); assert.equal(b.inW, 9 * HOUR_MS);
  const d = nextFestival({ base: W(OCC, 20) }, 0);
  assert.equal(d.now, true); assert.equal(d.inW, 9 * HOUR_MS);
  const a = nextFestival({ base: W(OCC, 30) }, 0);
  assert.equal(a.now, false); assert.equal(a.fest.id, 'hoshi'); assert.equal(a.inW, (48 - 30 + 19) * HOUR_MS);
  const n1 = festNote({ base: W(OCC + 3, 40), scale: 1 }, 0);
  assert.match(n1.text, /^次の行事：花の種まき/); assert.match(n1.sub, /あと 1 日と 3 時間（約 27 分）/);
  const n2 = festNote({ base: W(OCC + 2, 20), scale: 60 }, 0);
  assert.match(n2.text, /^いまの行事：月見/); assert.match(n2.sub, /約 1 分/);
  for (const f of Object.values(FESTIVALS)) for (const s of [f.name, f.toast, f.where, f.done, f.verb, f.soon]) for (const w of BAD_WORDS) assert.ok(!s.includes(w));
});

// ───────── 参加の条件 ─────────
const ENT = { x: 30 * TILE + 8, y: 40 * TILE + 8 };
const inv = (k = {}) => Object.entries(k).map(([id, n]) => ({ id, n }));
const ctxOf = (occ, act, extra = {}) => ({ fest: festivalAtWorld(W(occ, 21)), act, region: 'plains', x: ENT.x + 24, y: ENT.y + 10, entrance: ENT, spawn: map.spawn, done: false, inv: inv({ seed: 3, grass: 3 }), still: 0, place: 'field', ...extra });
await test('参加の条件：行事の夜だけ・いまの行事だけ・場所（巣のそば／広場・オアシスの南・丘でじっと）・1 回だけ・費用・富山はだめ', () => {
  assert.equal(festActBlock(ctxOf(OCC, 'plant')), null);
  assert.match(festActBlock({ ...ctxOf(OCC, 'plant'), fest: festivalAtWorld(W(OCC, 12)) }), /行事の夜ではない/);
  assert.match(festActBlock(ctxOf(OCC, 'lantern')), /いまの行事は「花の種まき」/);
  assert.match(festActBlock(ctxOf(OCC, 'plant', { done: true })), /もう 参加した/);
  assert.match(festActBlock(ctxOf(OCC, 'plant', { inv: inv({ grass: 3 }) })), /種子 が 要る/);
  assert.match(festActBlock(ctxOf(OCC, 'plant', { region: 'toyama' })), /できない/);
  assert.match(festActBlock(ctxOf(OCC, 'plant', { x: ENT.x + 2, y: ENT.y })), /すぐそば/, '入口の真上は「巣に入る」なので だめ');
  assert.match(festActBlock(ctxOf(OCC, 'plant', { x: ENT.x + 200, y: ENT.y })), /すぐそば/);
  assert.equal(festActBlock(ctxOf(OCC, 'plant', { entrance: null, x: map.spawn.x + 30, y: map.spawn.y })), null, '巣が無ければ広場で');
  assert.match(festActBlock(ctxOf(OCC, 'plant', { entrance: null })), /広場/);
  assert.equal(homeSpot({ entrance: ENT, x: ENT.x + 20, y: ENT.y }), 'home');
  // 冬：灯り（草 1）
  assert.equal(festActBlock(ctxOf(OCC + 3, 'lantern')), null);
  assert.match(festActBlock(ctxOf(OCC + 3, 'lantern', { inv: inv({ seed: 3 }) })), /草 が 要る/);
  // 秋：月見（オアシスの南・種子 1）
  assert.match(festActBlock(ctxOf(OCC + 2, 'offer')), /オアシス/);
  assert.equal(festActBlock(ctxOf(OCC + 2, 'offer', { x: OFFER_SPOT.x + 10, y: OFFER_SPOT.y })), null);
  assert.match(festActBlock(ctxOf(OCC + 2, 'offer', { x: OFFER_SPOT.x, y: OFFER_SPOT.y, region: 'rocks' })), /オアシス/);
  // 夏：星見（丘でじっと・費用なし）
  assert.match(festActBlock(ctxOf(OCC + 1, 'gaze')), /いわかげの丘/);
  assert.match(festActBlock(ctxOf(OCC + 1, 'gaze', { x: HILL_SPOT.x, y: HILL_SPOT.y, still: 0.5 })), /じっと/);
  assert.equal(festActBlock(ctxOf(OCC + 1, 'gaze', { x: HILL_SPOT.x, y: HILL_SPOT.y, still: 2.5, inv: [] })), null);
  assert.equal(festActBlock({ ...ctxOf(OCC, 'plant'), act: 'dance' }), 'そんな行事は ない');
  // 場所は通れる所
  for (const p of [OFFER_SPOT, HILL_SPOT, ...HILL_SEATS]) assert.ok(boxFree(map, p.x, p.y), JSON.stringify(p));
  for (const p of [HILL_SPOT, ...HILL_SEATS]) assert.ok(onHill('plains', p.x, p.y));
});

await test('印：決まった形（色はアカウントと回から）・同じ回だけ見える・月見の山の大きさ（数は出さない）・きらきら・流れ星は時計で決まる', () => {
  const f = festivalAtWorld(W(OCC, 21));
  const m1 = makeMark({ fest: f, region: 'plains', x: 100.4, y: 50.6, owner: 7, name: 'ルル', at: 1 });
  assert.deepEqual(m1, makeMark({ fest: f, region: 'plains', x: 100.4, y: 50.6, owner: 7, name: 'ルル', at: 1 }));
  assert.equal(m1.x, 100); assert.equal(m1.kind, 'plant'); assert.ok(m1.v >= 0 && m1.v < 4);
  const off = makeMark({ fest: festivalAtWorld(W(OCC + 2, 21)), region: 'plains', x: 1, y: 2, owner: 7, name: 'x', at: 1 });
  assert.deepEqual([off.x, off.y], [OFFER_SPOT.x, OFFER_SPOT.y], '供えた種は 1 つの山に');
  const marks = [m1, { ...m1, occ: OCC - 1, owner: 8 }, { ...m1, region: 'rocks', owner: 9 }];
  assert.deepEqual(marksVisible(marks, { base: W(OCC, 40) }, 0, 'plains'), [m1]);
  assert.deepEqual(marksVisible(marks, { base: W(OCC + 1, 1) }, 0, 'plains'), [], '次の季節には消える');
  assert.deepEqual([0, 1, 2, 3, 5, 6, 12, 99].map(offerPileSize), [0, 1, 1, 2, 2, 3, 4, 4]);
  // きらきら：丘で 2 匹が近くで すわったときだけ
  const a = { id: 'a', x: HILL_SPOT.x, y: HILL_SPOT.y, sit: 4 }, b = { id: 'b', x: HILL_SPOT.x + 30, y: HILL_SPOT.y, sit: 4 };
  assert.deepEqual([...sparkleSet([a, b])].sort(), ['a', 'b']);
  assert.equal(sparkleSet([a]).size, 0);
  assert.equal(sparkleSet([a, { ...b, sit: 1 }]).size, 0, 'すわったばかり');
  assert.equal(sparkleSet([a, { ...b, x: HILL_SPOT.x + 200 }]).size, 0, '遠い');
  assert.equal(sparkleSet([{ ...a, x: 100, y: 100 }, { ...b, x: 120, y: 100 }]).size, 0, '丘でない');
  // 流れ星：同じ時刻なら同じ。星見の夜はたくさん
  const T0 = 1_760_000_000_000;
  assert.deepEqual(shootingStars(T0 + 12345, true), shootingStars(T0 + 12345, true));
  let many = 0, few = 0;
  for (let t = T0; t < T0 + 600000; t += 200) { many += shootingStars(t, true).length; few += shootingStars(t, false).length; }
  assert.ok(many > few * 5 && few > 0, many + ' / ' + few);
});

await test('ごほうび：図鑑の行事の品 4 つ（季節の行事の段・地上には出ない・巣に飾れる）', () => {
  assert.deepEqual(FEST_CURIOS, FEST_REWARDS);
  assert.equal(FEST_CURIOS.length, 4);
  for (const id of FEST_CURIOS) { assert.equal(CURIOS[id].kind, 'fest'); assert.equal(CURIOS[id].region, 'fest'); for (const w of BAD_WORDS) assert.ok(!CURIOS[id].desc.includes(w)); }
  for (const region of ['plains', 'rocks', 'dunes', 'canyon', 'toyama']) for (let i = 0; i < 300; i++) {
    const d = pickCurioSpawn({ region, env: { season: 'spring', period: 'night', weather: 'clear' }, present: [new Set()], rnd: () => 0 });
    assert.ok(!d || d.kind !== 'fest');
  }
});

await test('NPC（オフライン）：行事の夜が始まって 世界の 1・2.5・4 時間で 1 匹ずつ・星見は印なしで 丘の席へ', () => {
  const f = t => festivalAtWorld(W(OCC, t));
  assert.equal(npcMarks(f(18), NPCS).length, 0);
  assert.equal(npcMarks(f(19.5), NPCS).length, 0);
  assert.equal(npcMarks(f(20.1), NPCS).length, 1);
  assert.equal(npcMarks(f(23.1), NPCS).length, 3);
  assert.equal(npcMarks(f(40), NPCS).length, 3, '朝になっても 花は残る');
  assert.deepEqual(npcMarks(f(23.1), NPCS), npcMarks(f(23.1), NPCS));
  assert.equal(npcMarks(festivalAtWorld(W(OCC + 1, 25)), NPCS).length, 0, '星見は印を作らない');
  assert.equal(npcMarks(festivalAtWorld(W(OCC, 3), null, 'on'), NPCS).length, 3, '開発用の on');
  for (let i = 0; i < 3; i++) assert.ok(boxFree(map, npcSeat(i).x, npcSeat(i).y));
  for (const m of npcMarks(f(30), NPCS)) assert.ok(boxFree(map, m.x, m.y), '花は通れる所に');
});

// ───────── 土地の名前 ─────────
await test('土地の名前：決まっている（作りなおしても同じ）・同じ土地で 64 区画とも ちがう・id は L列-行 のまま・短い・他作品の名前なし', () => {
  for (const id of ['plains', 'rocks', 'dunes', 'canyon', 'toyama']) {
    const m1 = id === 'plains' ? buildFieldMap() : regionMap(id);
    const L = [...buildLands(m1).values()];
    assert.equal(L.length, PLOT_COLS * PLOT_ROWS);
    const names = L.map(x => x.name);
    assert.equal(new Set(names).size, names.length, id + ' で重なる');
    for (const x of L) {
      assert.match(x.id, /^L\d+-\d+$/);
      assert.ok(x.name.length >= 2 && x.name.length <= 9, x.name);
      assert.ok(!/\d/.test(x.name), x.name);
      for (const w of BAD_WORDS) assert.ok(!x.name.includes(w));
      assert.equal(landOut(x).name, x.name); assert.equal(landOut(x).id, x.id);
    }
    // 作りなおした地図（別の入れ物）でも同じ
    const m2 = id === 'plains' ? buildFieldMap() : regionMap(id);
    if (m2 !== m1) assert.deepEqual([...buildLands(m2).values()].map(x => x.name), names);
  }
  const all = [...buildLands(map).values()].map(x => x.name);
  assert.ok(all.some(n => /の(丘|窪|背|原|辺|ほとり|岸)$/.test(n)), '「〇〇の丘」のような名前');
  assert.ok(Object.values(LAND_WORDS).every(a => a.length >= 4) && Object.values(LAND_FORMS).every(a => a.length >= 6));
  // 水べの区画は 水のことば
  const pond = [...buildLands(map).values()].find(x => x.feat === 'water');
  assert.ok(pond && (LAND_WORDS.water.some(w => pond.name.startsWith(w)) || LAND_FORMS.water.some(w => pond.name.endsWith(w))), pond && pond.name);
});

// ───────── 家族のやりとり ─────────
const ROOMS = [{ id: 'r1', kind: 'bed', x0: 40, x1: 170, y: 160 }, { id: 'r2', kind: 'store', x0: 220, x1: 320, y: 208 }];
const BED = { x0: 60, x1: 92, roomId: 'r1' };
const FAMILY = [
  { id: 11, role: 'mate', stage: 'adult', name: 'サラ', ageMs: 6 * DAY_MS }, { id: 12, role: 'pup', stage: 'pup', fed: 90, name: 'ポポ', ageMs: 1 * DAY_MS }, { id: 13, role: 'pup', stage: 'pup', fed: 90, name: 'チロ', ageMs: 1 * DAY_MS },
  { id: 14, role: 'pup', stage: 'young', fed: 90, name: 'ソラ', ageMs: 2 * DAY_MS }, { id: 15, role: 'friend', stage: 'adult', species: 'longear', name: 'ルナ', ageMs: 7 * DAY_MS },
  { id: 16, role: 'kin', stage: 'adult', name: 'モモ', ageMs: 8 * DAY_MS },
];
const T0 = 1_760_000_000_000;
const tin = (ctx, members = FAMILY) => ({ key: 42, members, ctx, sceneAt: tt => familyScene({ key: 42, members, rooms: ROOMS, bed: BED, t: tt, period: 'night', parents: {} }) });
const topics = (ctx, n = 800) => { const out = new Map(); const s0 = Math.floor(T0 / TALK.SLOT_MS); for (let s = s0; s < s0 + n; s++) { const k = talkInSlot({ ...tin(ctx), slot: s }); if (k) out.set(k.topic, (out.get(k.topic) || 0) + 1); } return out; };
await test('やりとりの言葉：+30〜40（行事の もうすぐ・いま・あと・参加した、季節×天気）・短い・他作品の名前なし・決まっている', () => {
  assert.ok(DIALOGUES.length >= 51 + 30 && DIALOGUES.length <= 51 + 40, DIALOGUES.length);
  assert.equal(new Set(DIALOGUES.map(d => d.id)).size, DIALOGUES.length);
  for (const d of DIALOGUES) for (const [, text] of d.lines) { assert.ok(text.length <= 24, text); for (const w of BAD_WORDS) assert.ok(!text.includes(w)); }
  const base = { season: 'autumn', period: 'night', weather: 'clear', seeds: 20 };
  const none = topics(base);
  assert.ok(![...none.keys()].some(t => /hana|hoshi|tsuki|akari|joined/.test(t)), '行事の文脈が無ければ 行事の話はしない');
  const fa = phase => tt => ({ id: 'tsuki', phase });
  const before = topics({ ...base, festAt: fa('before') }), during = topics({ ...base, festAt: fa('during') }), after = topics({ ...base, festAt: fa('after') });
  assert.ok(before.has('k_tsuki_before') || before.has('p_tsuki_before'), [...before.keys()]);
  assert.ok(during.has('k_tsuki_during') || during.has('a_tsuki_during'), [...during.keys()]);
  assert.ok(after.has('p_tsuki_after'), [...after.keys()]);
  assert.ok(![...before.keys()].some(t => /_after|_during/.test(t)));
  // 参加した（tales.fest）
  const joined = topics({ ...base, festAt: fa('after'), tales: { fest: true } });
  assert.ok(joined.has('p_joined') || joined.has('k_joined'), [...joined.keys()]);
  // 冬の灯り × 富山へ行ったことがある（「ゆきの国」まで）
  const ak = topics({ ...base, season: 'winter', festAt: () => ({ id: 'akari', phase: 'during' }), tales: { toyama: true } }, 1500);
  assert.ok(ak.has('a_akari_toyama') || ak.has('k_akari_during'), [...ak.keys()]);
  // 季節×天気
  assert.ok(topics({ season: 'spring', period: 'night', weather: 'rain', seeds: 20 }).has('k_spring_rain'));
  // 決まっている：festAt と同じ値の fest を毎回渡しても同じ・並び順を変えても同じ
  const s0 = Math.floor(T0 / TALK.SLOT_MS);
  for (let s = s0; s < s0 + 100; s++) {
    const a = talkInSlot({ ...tin({ ...base, festAt: fa('during') }), slot: s }), b = talkInSlot({ ...tin({ ...base, festAt: fa('during') }, [...FAMILY].reverse()), slot: s });
    assert.deepEqual(a, b);
  }
  // festTalkCtx は 時計から
  assert.deepEqual(festTalkCtx({ base: W(OCC + 3, 22) }, 0), { id: 'akari', phase: 'during' });
  assert.deepEqual(talkContext(FAMILY, { fest: { id: 'hana', phase: 'after' }, tales: { fest: 1 } }).fest, { id: 'hana', phase: 'after' });
});

// ───────── 富山 ─────────
await test('富山：行事の夜にだけ ひとつ（花・丸くねた草・米つぶ・灯り）・説明しない・通れる所・名前なし', () => {
  const tm = regionMap('toyama');
  for (const [k, id] of [[0, 'hana'], [1, 'hoshi'], [2, 'tsuki'], [3, 'akari']]) {
    const f = festivalAtWorld(W(OCC + k, 22));
    const pr = toyamaFestProps(f);
    assert.equal(pr.length, 1); assert.equal(pr[0].fest, id);
    assert.equal(toyamaFestProps(festivalAtWorld(W(OCC + k, 12))).length, 0, 'もうすぐ のときは無い');
    assert.equal(toyamaFestProps(festivalAtWorld(W(OCC + k, 35))).length, 0, 'あと も無い');
    assert.ok(boxFree(tm, pr[0].x, pr[0].y - 2), id);
    for (const w of BAD_WORDS) assert.ok(!pr[0].text.includes(w));
    assert.ok(!/トビネズミ|富山/.test(pr[0].text));
  }
  assert.equal(Object.keys(TOYAMA_FEST).length, 4);
});

// ───────── オフライン ─────────
async function offline({ occ = OCC, h = 20, ls = makeLS(), npc = false, season = null } = {}) {
  const clock = { t: 1_000_000 };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc, map, random: () => 0.37, env: true, predators: 'off', weather: 'clear', season, wild: false });
  n.clock.base = W(occ, h); n.clock.origin = clock.t; n.clock.scale = 1;
  await n.login('local'); await n.createCharacter({ name: 'はじめ', fur: 'cream', sex: 'f' }); await n.joinField();
  return { n, ls, clock };
}
const put = (n, x, y) => { n.auth.x = x; n.auth.y = y; n.auth.jump = null; };
function digSpot() {
  for (let ty = 6; ty < map.h - 6; ty++) for (let tx = 6; tx < map.w - 6; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 200) continue;
    if (canDigBurrow(map, x, y, []).ok && boxFree(map, x + 24, y + 12)) return { x, y };
  }
  throw new Error('no spot');
}
await test('オフライン：春の花（巣のそば・種子 1）→ 印・図鑑の押し花（1 回だけ）・二度目はだめ・次の春は品なしで また まける', async () => {
  const G = await offline();
  const n = G.n;
  const sp = digSpot();
  put(n, sp.x, sp.y);
  const d = await n.digBurrow();
  assert.ok(d.ok, d.reason);
  put(n, d.entrance.x + 24, d.entrance.y + 12);
  const seeds0 = n.save.player.inv.reduce((a, s) => a + (s && s.id === 'seed' ? s.n : 0), 0);
  const got = []; n.on('fest', m => got.push(m.mark)); n.on('collect', m => got.push('c:' + m.cid));
  const r = await n.festAct('plant');
  assert.ok(r.ok, r.reason); assert.equal(r.reward, 'pressed_flower'); assert.equal(r.mark.kind, 'plant');
  assert.equal(r.inv.reduce((a, s) => a + (s && s.id === 'seed' ? s.n : 0), 0), seeds0 - 1);
  assert.ok(got.includes('c:pressed_flower') && got.some(x => x && x.kind === 'plant'));
  assert.equal(n.save.collection.pressed_flower > 0, true);
  const r2 = await n.festAct('plant');
  assert.equal(r2.ok, false); assert.match(r2.reason, /もう/);
  assert.equal((await n.festAct('lantern')).ok, false);
  // 入りなおしても印がある（同じ季節）・巣の tales.fest
  const j = await n.joinField();
  assert.equal(j.world.fest.marks.filter(m => m.owner === 'local').length, 1);
  put(n, d.entrance.x, d.entrance.y + 4);
  const e = await n.enterNest('local'); assert.ok(e.ok, e.reason); assert.equal(e.nest.tales.fest, true);
  await n.leaveNest(); await n.joinField();
  // 次の春（4 季節あと）：また まける・品は もう無い
  n.clock.base = W(OCC + 4, 20) - (G.clock.t - n.clock.origin);
  put(n, d.entrance.x + 24, d.entrance.y + 12);
  const r3 = await n.festAct('plant');
  assert.ok(r3.ok, r3.reason); assert.equal(r3.reward, null, '品は 1 回だけ');
  n.festTick();
  assert.equal(n.save.fest.marks.filter(m => m.occ === OCC).length, 0, '古い回の印は片づく（1 つ前まで残す）');
});

await test('オフライン：夏 星見（丘で じっと・NPC も丘へ）・秋 月見（オアシス・NPC の種で山が大きく）・冬 灯り（巣が無ければ広場）', async () => {
  // 夏
  const S = await offline({ occ: OCC + 1, npc: true });
  put(S.n, HILL_SPOT.x, HILL_SPOT.y); S.n.stillT = 0.5;
  assert.match((await S.n.festAct('gaze')).reason, /じっと/);
  S.n.stillT = 3.2;
  const g = await S.n.festAct('gaze');
  assert.ok(g.ok, g.reason); assert.equal(g.reward, 'star_sand');
  for (let i = 0; i < 30; i++) S.n.tick(0.1);
  for (const npc of S.n.npcs) assert.ok(onHill('plains', npc.st.x, npc.st.y), npc.name + ' は丘へ');
  // 秋
  const A = await offline({ occ: OCC + 2, h: 24, npc: true });
  const seen = []; A.n.on('fest', m => seen.push(m.mark));
  A.n.festTick();
  assert.equal(seen.filter(m => m.kind === 'offer').length, 3, 'NPC 3 匹が供えた');
  put(A.n, OFFER_SPOT.x + 6, OFFER_SPOT.y + 4);
  const o = await A.n.festAct('offer');
  assert.ok(o.ok, o.reason); assert.equal(o.reward, 'moon_seed');
  assert.equal(A.n._festMarks().filter(m => m.kind === 'offer').length, 4);
  assert.equal(offerPileSize(4), 2);
  // 冬（巣が無い → 広場）
  const Wn = await offline({ occ: OCC + 3 });
  put(Wn.n, map.spawn.x + 30, map.spawn.y + 10);
  const l = await Wn.n.festAct('lantern');
  assert.ok(l.ok, l.reason); assert.equal(l.reward, 'little_lantern'); assert.equal(l.mark.kind, 'lantern');
  // 富山ではできない・行事の夜でなければできない
  const D = await offline({ occ: OCC + 3, h: 10 });
  put(D.n, map.spawn.x + 30, map.spawn.y + 10);
  assert.match((await D.n.festAct('lantern')).reason, /行事の夜ではない/);
  await D.n.dev({ fest: 'on' });
  assert.ok((await D.n.festAct('lantern')).ok, '開発用の on');
});

await test('オフライン：セーブ v7 → v8（行事の印の入れ物を足す。ほかは そのまま）・保存して読みなおしても印が残る', async () => {
  const G = await offline({ occ: OCC + 3 });
  put(G.n, map.spawn.x + 30, map.spawn.y + 10);
  assert.ok((await G.n.festAct('lantern')).ok);
  G.n.flush();
  const s = JSON.parse(G.ls.getItem(SAVE_KEY));
  assert.equal(s.v, 8); assert.equal(SAVE_VERSION, 8); assert.equal(s.fest.marks.length, 1);
  const old = { ...s, v: 7 }; delete old.fest;
  const ls2 = makeLS({ [SAVE_KEY]: JSON.stringify(old), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls2, now: () => G.clock.t, npc: false, map, wild: false });
  assert.equal(n2.save.v, 8); assert.deepEqual(n2.save.fest, { marks: [] });
  assert.equal(n2.save.character.name, 'はじめ'); assert.ok(n2.save.collection.little_lantern, '図鑑はそのまま');
  n2.flush(); assert.equal(ls2.getItem('dannoura_save'), 'keep');
  const n3 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: false, map, wild: false });
  n3.clock.base = G.n.clock.base; n3.clock.origin = G.n.clock.origin;
  const j = await n3.joinField();
  assert.equal(j.world.fest.marks.length, 1, '読みなおしても印がある');
});

console.log(`\ntobinezumi-v08: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
