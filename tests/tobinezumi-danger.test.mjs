// トビネズミMMO Ver.0.3「危険と土地」：共有ルール（捕食者の AI・見つかる／逃げる・天気と季節・土地の性能・巣の襲撃・落とし物）と、
// オフライン版（OfflineBackend）のつかまる・落とし物・土地を調べる・引っ越し・入口のふさぎ・襲撃・セーブの移行 v2 → v3。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap, TILE, T, tileAt, canDigBurrow, isBlocking } from '../tobinezumi/shared/regions.js';
import { stepField, makeFieldState, STEP_DT, boxFree } from '../tobinezumi/shared/move.js';
import { PredatorWorld, PRED_DT, PRED, playerView, stillTime, inGrass, losClear, TUNING, raidLoss, RAID_CAP, dropItems, dropSpots, safePoint, spawnSpots, threatTo, HIDE_AFTER, INVULN_MS } from '../tobinezumi/shared/predators.js';
import { seasonOf, weatherAt, pickWeather, envAt, fieldMods, isSheltered, SEASON_MS, WEATHER_SLOT_MS, WEATHER_TABLE, ENV } from '../tobinezumi/shared/season.js';
import { buildLands, landAt, landOut, digCost, digTime, relocateCost, inSafeZone, safeZones, plotAt, PLOT_COLS, PLOT_ROWS, RELOCATE_COOLDOWN_MS } from '../tobinezumi/shared/lands.js';
import { stepLife, makeLife, caughtLife, CAUGHT_COND, LIFE } from '../tobinezumi/shared/life.js';
import { DAY_MS, HOUR_MS, makeClock } from '../tobinezumi/shared/daynight.js';
import { countItem } from '../tobinezumi/shared/items.js';
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
const map = buildFieldMap();
const MIDNIGHT = DAY_MS * 1_200_000, NOON = MIDNIGHT + 12 * HOUR_MS;
console.log('tobinezumi-danger (Ver.0.3)');

/** 東へまっすぐ len px 開けている所（捕食者のテスト用） */
function openLine(len, from = 0) {
  for (let ty = 4; ty < map.h - 4; ty++) for (let tx = 2; tx < map.w - 30; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 10;
    let ok = true;
    for (let d = -110; d <= len; d += 4) if (!boxFree(map, x + d, y) || inSafeZone(map, x + d, y, 12) || inGrass(map, x + d, y)) { ok = false; break; }
    if (ok && from-- <= 0) return { x, y };
  }
  throw new Error('開けた所が無い');
}
const O = openLine(420);
const ctxOf = (players, period = 'night', extra = {}) => ({ map, period, weather: 'clear', vis: 1, pred: { owl: 1, fox: 1, snake: 1 }, players, entrances: [], tuning: TUNING.normal, ...extra });

/**
 * 1 匹と 1 人のシミュレーション。strat(t, threat, st) → 入力。返り値 {caught, alertAt, events}
 */
function duel(kind, strat, { secs = 12, period = 'night', dx = -70, seed = 42, start = O, shelters = [] } = {}) {
  const W = new PredatorWorld({ map, seed });
  W.spawnT = 1e9;    // 自然には出さない
  let st = makeFieldState(start.x, start.y), still = 0, t = 0;
  const p = W.spawn(kind, start.x + dx, start.y);
  const out = { caught: null, alertAt: null, events: [], p };
  for (let i = 0; i < secs / PRED_DT; i++) {
    const threat = p.target === 1 && ['alert', 'chase', 'stalk', 'dive', 'rattle', 'lunge'].includes(p.state);
    for (let k = 0; k < 3; k++) { st = stepField(st, strat(t, threat, st), STEP_DT, map); still = stillTime(still, st, STEP_DT); }
    t += PRED_DT;
    const ev = W.step(ctxOf([playerView(1, st, map, { still, shelters })], period), PRED_DT);
    for (const e of ev) { out.events.push(e.type); if (e.type === 'alert' && out.alertAt == null) out.alertAt = t; if (e.type === 'catch') out.caught = t; }
    if (out.caught) break;
  }
  out.st = st;
  return out;
}
const wiggle = t => ({ mx: 0, my: Math.floor(t * 2) % 2 ? 1 : -1 });      // その場で跳ねる（音がする）

// ───────── 捕食者 ─────────
await test('捕食者：同じ種・同じ入力なら必ず同じ結果（決定的）', () => {
  const run = () => {
    const W = new PredatorWorld({ map, seed: 1234 });
    let st = makeFieldState(O.x + 200, O.y), log = [];
    for (let i = 0; i < 20 * 60; i++) {
      for (let k = 0; k < 3; k++) st = stepField(st, { mx: Math.floor(i / 40) % 3 - 1, my: Math.floor(i / 55) % 3 - 1, jump: i % 37 === 0 }, STEP_DT, map);
      const period = i < 600 ? 'night' : 'day';
      const ev = W.step(ctxOf([playerView(1, st, map, {})], period), PRED_DT);
      for (const e of ev) log.push(i + ':' + e.type + ':' + e.kind);
      if (i % 50 === 0) log.push(JSON.stringify(W.snapshot()));
    }
    return log.join('\n');
  };
  const a = run(), b = run();
  assert.equal(a, b);
  assert.ok(/spawn/.test(a), '自然に出てくる');
});
await test('見つかる：跳ねていると遠くから、じっとしていると近くまで気づかれない、草むらでじっとしていると隠れる', () => {
  // じっとしている（砂地）：70px のキツネは気づかない
  let r = duel('fox', () => ({ mx: 0, my: 0 }), { secs: 4 });
  assert.equal(r.alertAt, null, 'じっとしていれば気づかれない');
  // 跳ねている：気づかれて「！」→ 追いかけてくる
  r = duel('fox', wiggle, { secs: 4 });
  assert.ok(r.alertAt != null && r.alertAt < 1.5, 'すぐ気づかれる ' + r.alertAt);
  // 草むら（草の房・草地）でじっとしている：すぐそばでも隠れている
  let g = null;
  for (let ty = 4; ty < map.h - 4 && !g; ty++) for (let tx = 4; tx < map.w - 4; tx++) { const x = tx * TILE + 8, y = ty * TILE + 10; if (tileAt(map, tx, ty) === T.TUFT && boxFree(map, x, y) && !inSafeZone(map, x, y, 40) && boxFree(map, x - 24, y)) { g = { x, y }; break; } }
  const st = makeFieldState(g.x, g.y);
  const v = playerView(1, st, map, { still: HIDE_AFTER + 0.1 });
  assert.equal(v.hidden, true);
  assert.equal(playerView(1, { ...st, anim: 'hop' }, map, { still: 0 }).hidden, false, '跳ねたら見える');
  const W = new PredatorWorld({ map, seed: 5 }); W.spawnT = 1e9;
  const f = W.spawn('fox', g.x - 24, g.y);
  for (let i = 0; i < 60; i++) W.step(ctxOf([v]), PRED_DT);
  assert.ok(f.state === 'roam', '隠れている子には気づかない（' + f.state + '）');
});
await test('見通し：岩・木のかげは見えない（フクロウは上から見る）', () => {
  let rock = null;
  for (let ty = 4; ty < map.h - 4 && !rock; ty++) for (let tx = 4; tx < map.w - 4; tx++) if (tileAt(map, tx, ty) === T.ROCK && !isBlocking(map, tx - 2, ty) && !isBlocking(map, tx + 2, ty)) { rock = { x: tx * TILE + 8, y: ty * TILE + 10 }; break; }
  assert.equal(losClear(map, rock.x - 30, rock.y, rock.x + 30, rock.y), false);
  assert.equal(losClear(map, O.x, O.y, O.x + 100, O.y), true);
});
await test('キツネ：まっすぐ跳ねて逃げるとつかまる・大ジャンプで逃げきれる・入れる巣穴の入口に飛び込むとあきらめる', () => {
  const run = duel('fox', (t, th) => th ? { mx: 1, my: 0 } : wiggle(t));
  assert.ok(run.caught != null, 'まっすぐ跳ねるだけでは追いつかれる');
  const jump = duel('fox', (t, th, st) => th ? { mx: 1, my: 0, jump: st.cd <= 0 } : wiggle(t));
  assert.equal(jump.caught, null, '大ジャンプなら逃げきれる');
  assert.ok(jump.events.includes('giveup'), 'あきらめる');
  // 入口のそば（12px 以内）は隠れ家：手を出せない
  const shel = duel('fox', (t, th) => th ? { mx: 0, my: 0 } : { mx: 0, my: Math.floor(t * 10) % 2 ? 1 : -1 }, { shelters: [{ x: O.x, y: O.y }] });
  assert.equal(shel.caught, null, '隠れ家');
});
await test('フクロウ：影が大きくなってから急降下。その場にいるとつかまる・影から跳ねて離れると外れる', () => {
  const stay = duel('owl', wiggle, { dx: -40 });
  assert.ok(stay.caught != null, 'その場で跳ねているとつかまる');
  assert.ok(stay.events.indexOf('dive') >= 0 && stay.events.indexOf('dive') < stay.events.indexOf('catch'), '急降下の前に予告（dive）');
  const run = duel('owl', (t, th, st) => th ? { mx: 1, my: 0, jump: st.cd <= 0 } : wiggle(t), { dx: -40, secs: 5 });
  assert.equal(run.caught, null, '影から離れれば外れる');
  assert.ok(run.events.includes('miss') || run.events.includes('giveup'));
});
await test('ヘビ：昼に待ち伏せ・近くで跳ねると「！」→ 飛びかかる。気づいたらすぐ離れれば届かない', () => {
  const stay = duel('snake', wiggle, { period: 'day', dx: -30 });
  assert.ok(stay.caught != null, '近くで跳ね続けるとかまれる');
  const run = duel('snake', (t, th) => th ? { mx: 1, my: 0 } : wiggle(t), { period: 'day', dx: -30, secs: 4 });
  assert.equal(run.caught, null, '離れれば届かない');
  // 夜はヘビが出ない（時間帯が終わると立ち去る）
  const night = duel('snake', wiggle, { period: 'night', dx: -30, secs: 4 });
  assert.equal(night.caught, null); assert.ok(night.events.includes('gone'));
});
await test('安全地帯・無敵・やさしい設定：安全地帯の中・つかまった直後は狙われない。やさしいは気づくのが遅い', () => {
  const z = safeZones(map)[0];
  assert.ok(inSafeZone(map, z.x, z.y));
  const st = makeFieldState(z.x, z.y + 40);
  assert.equal(playerView(1, st, map, {}).safe, true);
  const W = new PredatorWorld({ map, seed: 9 }); W.spawnT = 1e9;
  const f = W.spawn('fox', O.x - 50, O.y);
  const hop = { ...makeFieldState(O.x, O.y), anim: 'hop' };
  for (let i = 0; i < 40; i++) W.step(ctxOf([playerView(1, hop, map, { invuln: true })]), PRED_DT);
  assert.equal(f.state, 'roam', '無敵のあいだは狙われない');
  // やさしい：見つかる距離 ×0.6
  const near = duel('fox', wiggle, { secs: 3, dx: -70 });
  const W2 = new PredatorWorld({ map, seed: 42 }); W2.spawnT = 1e9;
  const f2 = W2.spawn('fox', O.x - 70, O.y);
  let st2 = makeFieldState(O.x, O.y);
  for (let i = 0; i < 60; i++) { for (let k = 0; k < 3; k++) st2 = stepField(st2, wiggle(i / 20), STEP_DT, map); W2.step({ ...ctxOf([playerView(1, st2, map, {})]), tuning: TUNING.easy }, PRED_DT); }
  assert.ok(near.alertAt != null); assert.equal(f2.state, 'roam', 'やさしいでは 70px では気づかない');
  // 出ない設定：みんな消える
  const W3 = new PredatorWorld({ map, seed: 1 }); W3.spawn('owl', O.x, O.y);
  W3.step({ ...ctxOf([]), tuning: TUNING.off }, PRED_DT);
  assert.equal(W3.preds.length, 0);
});
await test('出現：時間帯と天気で数が決まる（夜はフクロウとキツネ・昼はヘビ・砂嵐はフクロウとヘビが出ない）・プレイヤーから 220px 以上はなれた所', () => {
  const count = (period, pred) => {
    const W = new PredatorWorld({ map, seed: 77 });
    const pl = playerView(1, makeFieldState(O.x + 200, O.y), map, {});
    for (let i = 0; i < 20 * 40; i++) W.step({ ...ctxOf([pl], period), pred }, PRED_DT);
    const k = {}; for (const p of W.preds) if (p.state !== 'leave') k[p.kind] = (k[p.kind] || 0) + 1;
    for (const p of W.preds) assert.ok(Math.hypot(p.home.x - pl.x, p.home.y - pl.y) >= 220 * 0.8 - 1);
    return k;
  };
  const n = count('night', { owl: 1, fox: 1, snake: 0 });
  assert.ok(n.owl >= 1 && n.fox >= 1 && !n.snake, JSON.stringify(n));
  const d = count('day', { owl: 1, fox: 1, snake: 1 });
  assert.ok(d.snake >= 1 && !d.owl && !d.fox, JSON.stringify(d));
  const s = count('night', envAt(makeClock({ base: 0, origin: 0 }), 0, { enabled: true }).pred && { owl: 0, fox: 0.5, snake: 0 });
  assert.ok(!s.owl, JSON.stringify(s));
  assert.ok(spawnSpots(map).snake.length > 50);
});
await test('つかまったとき：持ち物の 1/3（12 個まで）を落とす・落とし物の場所・体調 −35・安全な所', () => {
  const inv = [{ id: 'seed', n: 9 }, { id: 'grass', n: 6 }, { id: 'pebble', n: 4 }, null];
  const d = dropItems(inv);
  assert.deepEqual(d, [{ id: 'seed', n: 3 }, { id: 'grass', n: 2 }, { id: 'pebble', n: 2 }]);
  assert.equal(countItem(inv, 'seed'), 6); assert.equal(countItem(inv, 'pebble'), 2);
  const big = [{ id: 'seed', n: 99 }, { id: 'grass', n: 99 }];
  assert.equal(dropItems(big).reduce((a, x) => a + x.n, 0), 12, '12 個まで');
  assert.equal(dropItems([{ id: 'seed', n: 10 }], true)[0].n, 2, 'やさしい：1/5');
  const sp = dropSpots(map, O.x, O.y, 3);
  assert.equal(sp.length, 3); for (const p of sp) assert.ok(boxFree(map, p.x, p.y));
  assert.equal(caughtLife(makeLife()).cond, 100 - CAUGHT_COND);
  assert.equal(caughtLife({ hunger: 50, thirst: 50, cond: 10 }).cond, 0, '0 で止まる（死なない）');
  assert.deepEqual(safePoint(map, { x: 100, y: 100 }), { x: 100, y: 112 });
  assert.deepEqual(safePoint(map, null), { x: map.spawn.x, y: map.spawn.y });
  assert.ok(threatTo([{ target: 1, state: 'chase' }], 1)); assert.equal(threatTo([{ target: 1, state: 'roam' }], 1), null);
});
await test('巣の襲撃：キツネは夜に留守の巣の入口を掘る。ふさいでいれば無事（blocked）。取られるのは種子の 1 割（1〜5）', () => {
  assert.equal(raidLoss(0), 0); assert.equal(raidLoss(3), 1); assert.equal(raidLoss(30), 3); assert.equal(raidLoss(99), RAID_CAP);
  for (const plugged of [false, true]) {
    const W = new PredatorWorld({ map, seed: 3 }); W.spawnT = 1e9;
    const f = W.spawn('fox', O.x, O.y);
    const ent = { owner: 'me', nestId: 'n1', x: O.x + 60, y: O.y, plugged, raidable: true, danger: 5 };
    const far = playerView(1, makeFieldState(O.x + 400, O.y), map, {});
    let raid = null;
    for (let i = 0; i < 20 * 120 && !raid; i++) { for (const e of W.step({ ...ctxOf([far]), entrances: [ent] }, PRED_DT)) if (e.type === 'raid') raid = e; }
    assert.ok(raid, '掘りに来る');
    assert.equal(raid.blocked, plugged); assert.equal(raid.owner, 'me');
    void f;
  }
  // 留守でなければ来ない
  const W = new PredatorWorld({ map, seed: 3 }); W.spawnT = 1e9; W.spawn('fox', O.x, O.y);
  let any = false;
  for (let i = 0; i < 20 * 60; i++) for (const e of W.step({ ...ctxOf([]), entrances: [{ owner: 'me', nestId: 'n1', x: O.x + 60, y: O.y, raidable: false, danger: 5 }] }, PRED_DT)) if (e.type === 'raid') any = true;
  assert.equal(any, false);
});

// ───────── 天気・季節 ─────────
await test('季節：世界の 2 日ごとに 春 → 夏 → 秋 → 冬。時計の season で固定できる', () => {
  const c = makeClock();
  const at = d => seasonOf(c, d * DAY_MS).id;
  assert.deepEqual([at(0), at(1.9), at(2), at(4), at(6), at(8)], ['spring', 'spring', 'summer', 'autumn', 'winter', 'spring']);
  assert.equal(SEASON_MS, 2 * DAY_MS);
  assert.equal(seasonOf({ ...c, season: 'winter' }, 0).id, 'winter');
  assert.equal(seasonOf(c, 2.5 * DAY_MS).day, 1);
});
await test('天気：4 時間ごとの枠で決まる（全員同じ）。季節で出やすさが違う。固定もできる', () => {
  const c = makeClock();
  const a = weatherAt(c, 5 * WEATHER_SLOT_MS + 1000), b = weatherAt(c, 5 * WEATHER_SLOT_MS + 50000);
  assert.equal(a.id, b.id, '同じ枠は同じ天気');
  // 季節ごとの割合（1000 枠）
  for (const [season, p] of Object.entries(WEATHER_TABLE)) {
    const n = { clear: 0, sandstorm: 0, rain: 0 };
    for (let i = 0; i < 2000; i++) n[pickWeather(season, i)]++;
    assert.ok(Math.abs(n.sandstorm / 2000 - p[1]) < 0.05 && Math.abs(n.rain / 2000 - p[2]) < 0.05, season + JSON.stringify(n));
  }
  assert.equal(weatherAt({ ...c, weather: 'rain' }, 0).id, 'rain');
  assert.ok(weatherAt(c, 0).k > 0);
});
await test('天気の影響：砂嵐は遅い・物かげにいないと体調が減る／雨は戻りが早い・水たまり／冬の夜は巣の外で寒い／夏の昼の暑さ／休眠', () => {
  const at = (weather, season, t, place = 'field', x = O.x, y = O.y) => envAt({ ...makeClock(), weather, season }, t, { map, x, y, place, enabled: true });
  const storm = at('sandstorm', 'summer', NOON);
  assert.equal(storm.move.speed, ENV.STORM_SPEED); assert.ok(storm.life.condPerSec < 0); assert.equal(storm.pred.owl, 0); assert.equal(storm.vis, ENV.STORM_VIS);
  assert.deepEqual(fieldMods(null, storm), { speed: ENV.STORM_SPEED });
  // 物かげ（岩・低木のそば）なら減らない
  let sh = null;
  for (let ty = 4; ty < map.h - 4 && !sh; ty++) for (let tx = 4; tx < map.w - 4; tx++) if (tileAt(map, tx, ty) === T.SHRUB && boxFree(map, tx * TILE + 8, ty * TILE + 28)) { sh = { x: tx * TILE + 8, y: ty * TILE + 28 }; break; }
  assert.equal(isSheltered(map, sh.x, sh.y), true);
  assert.equal(at('sandstorm', 'summer', NOON, 'field', sh.x, sh.y).life.condPerSec, 0);
  assert.equal(at('sandstorm', 'summer', NOON, 'nest').life.condPerSec, 0, '巣の中は平気');
  // 跳ねる速さ ×0.8（stepField の speed）
  let a = makeFieldState(O.x, O.y), b = makeFieldState(O.x, O.y);
  for (let i = 0; i < 60; i++) { a = stepField(a, { mx: 1, my: 0 }, STEP_DT, map); b = stepField(b, { mx: 1, my: 0 }, STEP_DT, map, fieldMods(null, storm)); }
  assert.ok(Math.abs((b.x - O.x) / (a.x - O.x) - 0.8) < 0.02);
  const rain = at('rain', 'spring', NOON);
  assert.ok(rain.respawnMul < 1); assert.equal(rain.move.speed, 1);
  const cold = at('clear', 'winter', MIDNIGHT);
  assert.equal(cold.cold, true); assert.ok(cold.life.condPerSec < 0);
  assert.equal(at('clear', 'winter', MIDNIGHT, 'nest').life.condPerSec, 0, '巣の中は寒くない');
  assert.equal(at('clear', 'summer', MIDNIGHT).cold, false);
  // 夏の昼：暑い土地は水分が早く減る
  let hot = null;
  for (const L of buildLands(map).values()) if (L.climate === 'hot' && L.danger > 0) { hot = L; break; }
  const h = at('clear', 'summer', NOON, 'field', hot.x, hot.y);
  assert.equal(h.heat, true); assert.equal(h.life.thirstMul, 1.5);
  const L1 = stepLife(makeLife(), 60, { env: h.life }), L0 = stepLife(makeLife(), 60);
  assert.ok(Math.abs((80 - L1.thirst) / (80 - L0.thirst) - 1.5) < 1e-6);
  // 休眠：冬に巣で眠ると戻りが早い
  const rest = at('clear', 'winter', NOON, 'nest');
  assert.equal(rest.rest, 'hibernation');
  const s1 = stepLife({ ...makeLife(), cond: 0 }, 10, { sleeping: true, env: rest.life }), s0 = stepLife({ ...makeLife(), cond: 0 }, 10, { sleeping: true });
  assert.ok(Math.abs(s1.cond / s0.cond - ENV.REST_MUL) < 1e-6);
  assert.equal(at('clear', 'summer', NOON, 'nest').rest, 'aestivation');
  // 切ってあれば何も変わらない
  const off = envAt({ ...makeClock(), weather: 'sandstorm' }, NOON, { map, x: O.x, y: O.y, enabled: false });
  assert.equal(off.move.speed, 1); assert.equal(off.life.condPerSec, 0);
});

// ───────── 土地 ─────────
await test('土地：64 区画・同じ地図なら同じ性能・安全地帯は危険 0・地域で気候・希少資源がある区画', () => {
  const L = buildLands(map);
  assert.equal(L.size, PLOT_COLS * PLOT_ROWS); assert.equal(L.size, 64);
  const again = buildLands(buildFieldMap());
  assert.deepEqual([...L.values()].map(landOut), [...again.values()].map(landOut), '決定的');
  for (const z of safeZones(map)) assert.equal(landAt(map, z.x, z.y).danger, 0, z.id);
  for (const x of L.values()) {
    for (const k of ['food', 'danger', 'scenery']) assert.ok(x[k] >= 0 && x[k] <= 5);
    assert.ok(x.hardness >= 1 && x.hardness <= 5);
  }
  assert.equal(landAt(map, 50 * TILE, 13 * TILE).climate, 'mild', 'オアシス');
  assert.equal(landAt(map, 79 * TILE, 49 * TILE).climate, 'cool', '岩場');
  assert.ok([...L.values()].some(x => x.rare === 'rare_seed') && [...L.values()].some(x => x.rare === 'pretty_stone'));
  assert.ok([...L.values()].some(x => x.danger >= 4));
  assert.equal(plotAt(0, 0).id, 'L0-0'); assert.equal(plotAt(95 * TILE, 63 * TILE).id, 'L7-7');
});
await test('掘る手間：やわらかい土は素材なし・硬い土は小石と草。時間は 0.9〜2.1 秒。引っ越しは 小石 3・草 4＋掘る手間', () => {
  assert.deepEqual(digCost({ hardness: 2 }), {}); assert.deepEqual(digCost({ hardness: 4 }), { pebble: 1, grass: 1 }); assert.deepEqual(digCost({ hardness: 5 }), { pebble: 2, grass: 2 });
  assert.ok(Math.abs(digTime({ hardness: 1 }) - 0.9) < 1e-9); assert.ok(Math.abs(digTime({ hardness: 5 }) - 2.1) < 1e-9);
  assert.deepEqual(relocateCost({ hardness: 1 }), { pebble: 3, grass: 4 }); assert.deepEqual(relocateCost({ hardness: 5 }), { pebble: 5, grass: 6 });
  assert.ok([...buildLands(map).values()].some(x => x.hardness >= 4), '硬い所がある');
});

// ───────── オフライン ─────────
async function offline({ clockT = MIDNIGHT, net = {} } = {}) {
  const ls = makeLS();
  const clock = { t: clockT };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc: false, map, random: () => 0.3, env: true, predators: 'normal', predSeed: 11, weather: 'clear', ...net });
  await n.login('local'); await n.createCharacter({ name: 'てすと', fur: 'sand' }); await n.joinField();
  return { n, ls, clock };
}
function findSpot(net, skip = 0, minDanger = 1) {
  for (let ty = 5; ty < map.h - 5; ty++) for (let tx = 5; tx < map.w - 5; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160 || landAt(map, x, y).hardness >= 4 || landAt(map, x, y).danger < minDanger) continue;
    if (canDigBurrow(map, x, y, net._entrances()).ok) { if (skip-- > 0) continue; return { x, y }; }
  }
  throw new Error('no spot');
}
/** オフラインの時計とバックエンドを dt 秒進める（1/60 刻み） */
function run(G, secs, input = () => ({ mx: 0, my: 0 })) {
  let seq = G.seq || 0;
  for (let i = 0; i < secs * 60; i++) {
    G.clock.t += 1000 / 60;
    if (G.n.place === 'field') G.n.sendInput({ seq: ++seq, ...input(i / 60) });
    G.n.tick(1 / 60);
  }
  G.seq = seq;
}

await test('オフライン：捕食者に狙われる → つかまる（体調 −35・落とし物・安全な所・しばらく狙われない）→ 落とし物を拾える', async () => {
  const G = await offline();
  const caught = [], spawned = [];
  G.n.on('caught', m => caught.push({ ...m, t: G.clock.t })); G.n.on('res_spawn', m => spawned.push(m.res));
  G.n.auth = makeFieldState(O.x, O.y);
  await G.n.dev({ spawn: 'fox', dx: -60 });
  run(G, 10, t => wiggle(t));
  assert.equal(caught.length, 1, 'つかまった');
  const m = caught[0];
  assert.equal(m.kind, 'fox');
  assert.ok(m.life.cond <= 100 - CAUGHT_COND + 0.01 && m.life.cond > 60, '体調 −35：' + m.life.cond);
  assert.ok(m.drops.length >= 2, '持ち物を落とした');
  assert.deepEqual([m.x, m.y], [map.spawn.x, map.spawn.y], '巣が無ければ出発点へ');
  assert.equal(m.until, m.t + INVULN_MS, 'しばらく（8 秒）狙われない');
  const drops = spawned.filter(r => r.id[0] === 'x');
  assert.equal(drops.length, m.drops.length);
  // 落とし物を拾う（まとめて n 個）
  const d = drops[0];
  G.n.auth = makeFieldState(d.x, d.y);
  const before = countItem(G.n.save.player.inv, d.kind);
  const r = await G.n.pickup(d.id);
  assert.equal(r.ok, true, r.reason); assert.equal(r.n, d.n);
  assert.equal(countItem(r.inv, d.kind), before + d.n);
  // 落とし物は戻らない（再出現待ちに積まない）・10 分で消える
  assert.equal(G.n.save.world.respawns.length, 0);
  const left = G.n.save.world.resources.filter(x => x.id[0] === 'x');
  G.clock.t += 11 * 60 * 1000; G.n.tick(0.01);
  assert.equal(G.n.save.world.resources.filter(x => x.id[0] === 'x').length, 0, '期限で消える ' + left.length);
});
await test('オフライン：巣の入口に飛び込む（巣の中は安全）・つかまったら自分の巣の入口へ戻る・やさしい設定', async () => {
  const G = await offline();
  const spot = findSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  const d = await G.n.digBurrow();
  assert.equal(d.ok, true, d.reason);
  const caught = []; G.n.on('caught', m => caught.push(m));
  // 入口のそばでじっとしていれば手を出せない
  G.n.auth = makeFieldState(d.entrance.x, d.entrance.y + 4);
  await G.n.dev({ spawn: 'fox', dx: -40 });
  run(G, 6, () => ({ mx: 0, my: 0 }));
  assert.equal(caught.length, 0);
  // 巣に入ってしまえば捕食者は進まない（地上にいない）
  const e = await G.n.enterNest(G.n.save.account.id);
  assert.equal(e.ok, true);
  run(G, 3);
  assert.equal(caught.length, 0);
  await G.n.leaveNest();
  // 入口から離れて跳ねていてつかまる → 自分の巣の入口の下へ
  await G.n.dev({ clear: true });
  G.n.auth = makeFieldState(O.x, O.y);
  await G.n.dev({ spawn: 'snake', dx: -26 });
  G.clock.t = NOON;
  run(G, 8, t => wiggle(t));
  assert.equal(caught.length, 1, 'ヘビにかまれた');
  assert.deepEqual([caught[0].x, caught[0].y], [d.entrance.x, d.entrance.y + 12]);
  // やさしい設定：体調の減りが少ない
  G.n.setDanger('easy');
  assert.equal(G.n.tuning.easy, true); assert.equal(G.n.tuning.raids, false);
  G.n.setDanger('off');
  run(G, 1);
  assert.equal(G.n.preds.preds.length, 0, '出ない設定');
});
await test('オフライン：土地を調べる・掘るのに素材（硬い土）・引っ越し（巣の中身はそのまま・費用・10 分に 1 回・入口が動く）', async () => {
  const G = await offline({ clockT: NOON });
  G.n.auth = makeFieldState(O.x, O.y);
  const s0 = await G.n.survey();
  assert.equal(s0.ok, true); assert.equal(s0.land.id, landAt(map, O.x, O.y).id); assert.equal(s0.here.hasNest, false);
  const spot = findSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  const d = await G.n.digBurrow();
  assert.equal(d.ok, true);
  const nid = d.entrance.nestId, rec = G.n.save.nests[nid];
  assert.equal(rec.land.id, landAt(map, d.entrance.x, d.entrance.y).id, '巣は土地を持つ');
  // 巣の中を作って倉庫に物を入れておく
  await G.n.enterNest(G.n.save.account.id);
  const r1 = await G.n.nestOp(nid, rec.rev, { op: 'set-kind', id: rec.data.rooms[0].id, kind: 'store' });
  assert.equal(r1.ok, true, r1.reason);
  await G.n.store(nid, 'deposit', 'seed', 3);
  await G.n.leaveNest();
  const dataBefore = JSON.stringify(G.n.save.nests[nid].data), storageBefore = JSON.stringify(G.n.save.nests[nid].storage);
  // 近すぎる所・素材不足
  G.n.auth = makeFieldState(d.entrance.x + 20, d.entrance.y + 40);
  assert.match((await G.n.relocate()).reason, /近すぎる|混み|通り道|端/);
  const far = findSpot(G.n, 40);
  G.n.auth = makeFieldState(far.x, far.y);
  const sv = await G.n.survey();
  assert.equal(sv.here.canMove, true, sv.here.moveReason);
  G.n.save.player.inv = [{ id: 'pebble', n: 1 }, null, null, null, null, null, null, null];
  assert.match((await G.n.relocate()).reason, /素材が足りない/);
  G.n.save.player.inv = [{ id: 'pebble', n: 20 }, { id: 'grass', n: 20 }, null, null, null, null, null, null];
  const moved = []; G.n.on('entrance', m => moved.push(m));
  const r = await G.n.relocate();
  assert.equal(r.ok, true, r.reason);
  const cost = relocateCost(landAt(map, far.x, far.y));
  assert.equal(countItem(r.inv, 'pebble'), 20 - cost.pebble); assert.equal(countItem(r.inv, 'grass'), 20 - cost.grass);
  assert.deepEqual([r.from.x, r.from.y], [d.entrance.x, d.entrance.y]);
  assert.ok(moved.some(m => m.moved));
  const ent = G.n._entrances().find(e => e.nestId === nid);
  assert.ok(Math.hypot(ent.x - far.x, ent.y - far.y) < 12, '入口が動いた');
  assert.equal(JSON.stringify(G.n.save.nests[nid].data), dataBefore, '巣の中はそのまま');
  assert.equal(JSON.stringify(G.n.save.nests[nid].storage), storageBefore, '倉庫もそのまま');
  assert.equal(G.n.save.nests[nid].land.id, landAt(map, ent.x, ent.y).id);
  // 10 分は引っ越せない
  const far2 = findSpot(G.n, 80);
  G.n.auth = makeFieldState(far2.x, far2.y);
  assert.match((await G.n.relocate()).reason, /引っ越したばかり/);
  G.clock.t += RELOCATE_COOLDOWN_MS + 1000;
  assert.equal((await G.n.relocate()).ok, true);
  // 入ると新しい入口の巣・同じ中身
  G.n.auth = makeFieldState(G.n._entrances().find(e => e.nestId === nid).x, G.n._entrances().find(e => e.nestId === nid).y + 6);
  const e2 = await G.n.enterNest(G.n.save.account.id);
  assert.equal(e2.ok, true); assert.equal(JSON.stringify(e2.nest.data), dataBefore);
});
await test('オフライン：入口をふさぐ（巣の中から・小石 2）→ キツネに掘られても無事。ふさいでいないと倉庫の種子が減り、次に遊ぶとき知らせる', async () => {
  const G = await offline();
  const spot = findSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  const d = await G.n.digBurrow();
  const nid = d.entrance.nestId, rec = G.n.save.nests[nid];
  rec.storage[0] = { id: 'seed', n: 40 };
  assert.match((await G.n.plug(true)).reason, /巣の中から/);
  await G.n.enterNest(G.n.save.account.id);
  const peb = countItem(G.n.save.player.inv, 'pebble');
  const p1 = await G.n.plug(true);
  assert.equal(p1.ok, true); assert.equal(countItem(p1.inv, 'pebble'), peb - 2);
  assert.match((await G.n.plug(true)).reason, /もう ふさいである/);
  await G.n.leaveNest();
  // 襲撃（キツネが掘った出来事を当てる）：ふさいでいれば無事
  let r = G.n._raid({ nestId: nid, blocked: true });
  assert.deepEqual(r, { kind: 'blocked', lost: 0 }); assert.equal(countItem(rec.storage, 'seed'), 40);
  // ひらく → 掘られると 1 割（最大 5）
  await G.n.enterNest(G.n.save.account.id);
  const p2 = await G.n.plug(false);
  assert.equal(p2.ok, true); assert.equal(countItem(p2.inv, 'pebble'), peb - 1, '小石が 1 つ戻る');
  await G.n.leaveNest();
  r = G.n._raid({ nestId: nid, blocked: false });
  assert.deepEqual(r, { kind: 'raid', lost: 4 }); assert.equal(countItem(rec.storage, 'seed'), 36);
  // 留守のあいだの襲撃は、次に遊ぶとき一覧に（1 回）
  G.n.place = 'none';
  G.n._raid({ nestId: nid, blocked: false });
  const j = await G.n.joinField();
  assert.equal(j.world.raids.length, 1); assert.equal(j.world.raids[0].kind, 'raid');
  assert.equal((await G.n.joinField()).world.raids.length, 0, '1 回だけ');
  // 自然の流れ：夜、留守の巣にキツネが来て掘る（予定どおり 1 日に 1 回まで）
  rec.raidedAt = 0;
  const raids = []; G.n.on('raid', m => raids.push(m));
  G.n.auth = makeFieldState(d.entrance.x + 300, d.entrance.y);
  G.n.preds.spawn('fox', d.entrance.x + 30, d.entrance.y);
  run(G, 90, () => ({ mx: 0, my: 0 }));
  assert.ok(raids.length >= 1, 'キツネが来た');
  assert.ok(raids.length <= 1, '1 日に 1 回まで');
});
await test('オフライン：雨で水たまり（飲める +20）・やむと乾く／砂嵐で遅い（予測と同じ）・物かげに入らないと体調が減る', async () => {
  const G = await offline({ clockT: NOON, net: { weather: 'rain' } });
  for (let i = 0; i < 12; i++) { G.clock.t += ENV.PUDDLE_SPAWN_MS; G.n.tick(0.01); }
  const pud = G.n.save.world.resources.filter(r => r.kind === 'puddle');
  assert.ok(pud.length >= 5 && pud.length <= ENV.PUDDLE_MAX);
  G.n.save.player.life.thirst = 40;
  G.n.auth = makeFieldState(pud[0].x, pud[0].y);
  const dr = await G.n.drink(pud[0].id);
  assert.equal(dr.ok, true); assert.equal(dr.src, 'puddle'); assert.equal(Math.round(dr.life.thirst), 60);
  assert.equal((await G.n.pickup(pud[1].id)).ok, false, '拾えない');
  await G.n.dev({ weather: 'clear' });
  for (let i = 0; i < 10; i++) { G.clock.t += ENV.PUDDLE_SPAWN_MS; G.n.tick(0.01); }
  assert.equal(G.n.save.world.resources.filter(r => r.kind === 'puddle').length, 0, '乾いた');
  // 砂嵐：遅い・体調が減る（物かげでなければ）
  await G.n.dev({ weather: 'sandstorm' });
  G.n.auth = makeFieldState(O.x, O.y);
  const c0 = G.n.save.player.life.cond;
  run(G, 1, () => ({ mx: 1, my: 0 }));
  assert.ok(Math.abs((G.n.auth.x - O.x) - 74 * 0.8) < 3, '×0.8 ' + (G.n.auth.x - O.x));
  run(G, 59);
  const drop = c0 - G.n.save.player.life.cond;
  assert.ok(drop > 100 / ENV.STORM_COND_SEC * 60 * 0.9, '砂嵐で体調が減る ' + drop);
});
await test('オフライン：セーブの移行 v2 → v3（巣に土地・ふさぎ・引っ越しの時刻、出来事の記録。持ち物・巣の中身はそのまま）', async () => {
  const G = await offline();
  const spot = findSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  await G.n.digBurrow();
  const s = JSON.parse(JSON.stringify(G.n.save));
  s.v = 2; delete s.events;
  for (const id in s.nests) { delete s.nests[id].plugged; delete s.nests[id].land; delete s.nests[id].relocatedAt; delete s.nests[id].raidedAt; }
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(s), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls, now: () => NOON, npc: false, map });
  assert.equal(n2.save.v, SAVE_VERSION); assert.ok(SAVE_VERSION >= 3);
  const nest = Object.values(n2.save.nests)[0];
  assert.equal(nest.plugged, false); assert.equal(nest.land.id, landAt(map, spot.x, spot.y).id); assert.equal(nest.relocatedAt, 0);
  assert.deepEqual(n2.save.events, []);
  assert.equal(JSON.stringify(nest.data), JSON.stringify(Object.values(s.nests)[0].data));
  assert.deepEqual(n2.save.player.inv, G.n.save.player.inv);
  n2.flush();
  assert.equal(JSON.parse(ls.getItem(SAVE_KEY)).v, SAVE_VERSION); assert.equal(ls.getItem('dannoura_save'), 'keep');
});

console.log(`\ntobinezumi-danger: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
void INVULN_MS; void LIFE; void PRED;
