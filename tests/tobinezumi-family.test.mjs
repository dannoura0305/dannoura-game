// トビネズミMMO Ver.0.4「いのちをつなぐ」：遺伝（メンデルの分離・多くの遺伝子・突然変異・決まった種で同じ結果）、形質の効き目の上限、
// 年齢と成長段階、繁殖の条件、季節ごとの子の数、子育て（おなか・自動で食べる・育つ）、世代交代、野生の子となかよくなる、
// オフライン版（OfflineBackend）の通し：なかよくなる → 巣へ迎える → 生まれる → 名前 → 育つ → 世代交代 → 家系図、セーブの移行 v3 → v4。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap, TILE, canDigBurrow } from '../tobinezumi/shared/regions.js';
import { stepField, makeFieldState, STEP_DT, FIELD, boxFree } from '../tobinezumi/shared/move.js';
import { mulberry32 } from '../tobinezumi/shared/rng.js';
import { DAY_MS, HOUR_MS } from '../tobinezumi/shared/daynight.js';
import {
  founderGenes, wildGenes, inherit, expressTraits, expressFur, traitMods, traitMoveMods, normalizeGenes, lookOf, lookKey, traitWords, CAP, MUT, POLY, FUR_RANK, seedOf,
} from '../tobinezumi/shared/genetics.js';
import {
  STAGE, stageOf, ageDays, stepAge, courtBlock, breedBlock, litterSize, makeLitter, stepFamily, feedOne, makeInd, heirBlock, successionPlan, farewellBlock,
  PUP, BREED, LITTER, FOUNDER_AGE_DAYS, founderInd, defaultNames, needsFood,
} from '../tobinezumi/shared/family.js';
import { Household } from '../tobinezumi/shared/household.js';
import { WildWorld, WILD, WILD_DT } from '../tobinezumi/shared/wild.js';
import { fieldMods } from '../tobinezumi/shared/season.js';
import { lifeEnvWithTraits, makeLife } from '../tobinezumi/shared/life.js';
import { countItem, addItem } from '../tobinezumi/shared/items.js';
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
const near = (a, b, tol) => Math.abs(a - b) <= tol;
console.log('tobinezumi-family (Ver.0.4)');

// ───────── 遺伝 ─────────
const hetero = (a, b, extra = {}) => normalizeGenes({ ...founderGenes(a, 1), col: [a, b], ...extra });
await test('遺伝：最初の子は選んだ毛色を 2 つ持ち、体つきは「ふつう」（どの形質も 0）', () => {
  for (const f of ['sand', 'cream', 'rufous', 'graybrown', 'white']) {
    const g = founderGenes(f, 7), t = expressTraits(g);
    assert.deepEqual(g.col, [f, f]); assert.equal(t.fur, f); assert.equal(t.pied, false);
    for (const k of POLY) assert.equal(t[k], 0);
    assert.equal(traitMoveMods(t), null);
  }
  assert.equal(expressFur(['white', 'sand']), 'sand'); assert.equal(expressFur(['cream', 'graybrown']), 'graybrown'); assert.equal(expressFur(['white', 'white']), 'white');
});
await test('遺伝：メンデルの分離（ヘテロどうし → 白っぽい 1/4・ホモの白どうし → ほぼ全部白）を決まった種で 4000 匹', () => {
  const rng = mulberry32(2024);
  const a = hetero('sand', 'white'), b = hetero('sand', 'white');
  let white = 0, N = 4000;
  for (let i = 0; i < N; i++) if (expressTraits(inherit(rng, a, b)).fur === 'white') white++;
  assert.ok(near(white / N, 0.25, 0.03), 'white ratio ' + white / N);
  const w1 = hetero('white', 'white'), w2 = hetero('white', 'white');
  let w = 0;
  for (let i = 0; i < N; i++) if (expressTraits(inherit(rng, w1, w2)).fur === 'white') w++;
  assert.ok(w / N > 0.97 && w / N < 1, '突然変異でまれに別の色: ' + w / N);
  // 斑（潜性）：保因者どうし → 1/4
  const c1 = hetero('sand', 'sand', { pied: [1, 0] }), c2 = hetero('sand', 'sand', { pied: [0, 1] });
  let pied = 0;
  for (let i = 0; i < N; i++) if (expressTraits(inherit(rng, c1, c2)).pied) pied++;
  assert.ok(near(pied / N, 0.25, 0.03), 'pied ' + pied / N);
});
await test('遺伝：多くの遺伝子（耳・脚・尾・体格）は子の平均が両親の平均に近く、ばらつく。同じ種なら同じ子', () => {
  const rng = mulberry32(99);
  const big = normalizeGenes({ ...founderGenes('sand', 1), ear: new Array(8).fill(1), leg: new Array(8).fill(1) });
  const small = normalizeGenes({ ...founderGenes('sand', 1), ear: new Array(8).fill(-1), leg: new Array(8).fill(0) });
  let se = 0, sl = 0, N = 3000, vals = new Set();
  for (let i = 0; i < N; i++) { const t = expressTraits(inherit(rng, big, small)); se += t.ear; sl += t.leg; vals.add(t.ear); }
  assert.ok(near(se / N, 0, 0.05), 'ear mean ' + se / N);
  assert.ok(near(sl / N, 0.5, 0.06), 'leg mean ' + sl / N);
  // 野生の子どうし：いろいろな値が出る
  const r2 = mulberry32(5);
  const ws = [];
  for (let i = 0; i < 400; i++) ws.push(expressTraits(wildGenes(r2, 'steppe')).size);
  const mean = ws.reduce((a, b) => a + b, 0) / ws.length, sd = Math.sqrt(ws.reduce((a, b) => a + (b - mean) ** 2, 0) / ws.length);
  assert.ok(near(mean, 0, 0.06) && sd > 0.18 && sd < 0.42, 'wild size mean ' + mean + ' sd ' + sd);
  const a = inherit(mulberry32(42), big, small), b = inherit(mulberry32(42), big, small);
  assert.deepEqual(a, b);
});
await test('遺伝：突然変異の割合（多くの遺伝子の 1 つあたり約 3%）', () => {
  const rng = mulberry32(7);
  const z = founderGenes('sand', 1);
  let changed = 0, total = 0;
  for (let i = 0; i < 2000; i++) { const c = inherit(rng, z, z); for (const k of POLY) for (const v of c[k]) { total++; if (v !== 0) changed++; } }
  assert.ok(near(changed / total, MUT.poly, 0.006), 'mutation ' + changed / total);
});
await test('形質の効き目：どれも ±10% まで（いちばん極端でも）。脚が長いと速く遠く、尾が長いと待ちが短い', () => {
  for (const v of [-1, -0.5, 0, 0.5, 1, 5, -9]) {
    const m = traitMods({ ear: v, leg: v, tail: v, size: v });
    for (const k of Object.keys(m)) assert.ok(m[k] >= 1 - CAP - 1e-9 && m[k] <= 1 + CAP + 1e-9, k + '=' + m[k]);
  }
  const long = traitMoveMods({ leg: 1, tail: 1 });
  assert.ok(long.hop > 1 && long.jumpDist > 1 && long.cd < 1);
  // 移動ルール：100 歩で速さの差は 10% 以内
  const run = mods => { let s = makeFieldState(40 * TILE, 20 * TILE); for (let i = 0; i < 60; i++) s = stepField(s, { mx: 1, my: 0 }, STEP_DT, { ...map, tiles: new Uint8Array(map.tiles.length), ground: map.ground }, mods); return s.x; };
  const base = run(null), fast = run(fieldMods(null, null, long));
  assert.ok(fast > base && (fast - 40 * TILE) / (base - 40 * TILE) <= 1.1 + 1e-9);
  // 大ジャンプの距離・待ち
  let s = stepField(makeFieldState(40 * TILE, 20 * TILE), { mx: 1, my: 0, jump: true }, STEP_DT, { ...map, tiles: new Uint8Array(map.tiles.length) }, long);
  assert.ok(s.jump.x1 - s.jump.x0 > FIELD.JUMP_DIST && s.jump.x1 - s.jump.x0 <= FIELD.JUMP_DIST * 1.1 + 2); assert.ok(s.cd < FIELD.JUMP_CD);
  // 暮らし：耳が大きいと水分の減りが少ない・体が大きいと寒さに強い
  const E = lifeEnvWithTraits({ thirstMul: 1.5, hungerMul: 1, condPerSec: -0.1 }, traitMods({ ear: 1, size: 1 }));
  assert.ok(E.thirstMul < 1.5 && E.hungerMul > 1 && E.condPerSec > -0.1);
  // 見た目のキー
  assert.notEqual(lookKey(lookOf({ fur: 'sand', ear: 1 })), lookKey(lookOf({ fur: 'sand', ear: -1 })));
  assert.ok(traitWords({ fur: 'white', pied: true, ear: 0.6, tint: 0.6 }).some(w => w.text === '斑'));
});

// ───────── 年齢・成長 ─────────
await test('年齢：子ども → 若者（1.5 日）→ おとな（4 日）→ 年寄り（24 日）。寿命の目安 30 日で知らせる。最初の子は若者（3 日）', () => {
  assert.equal(stageOf(0), 'pup'); assert.equal(stageOf(1.49 * DAY_MS), 'pup'); assert.equal(stageOf(1.5 * DAY_MS), 'young');
  assert.equal(stageOf(3.99 * DAY_MS), 'young'); assert.equal(stageOf(4 * DAY_MS), 'adult'); assert.equal(stageOf(24 * DAY_MS), 'elder');
  assert.equal(FOUNDER_AGE_DAYS, 3); assert.equal(stageOf(founderInd({ id: 1, name: 'a', fur: 'sand', seed: 3 }).ageMs), 'young');
  assert.equal(stepAge(3.9 * DAY_MS, 0.2 * DAY_MS).crossed, 'adult');
  assert.equal(stepAge(23.9 * DAY_MS, 0.2 * DAY_MS).crossed, 'elder');
  assert.equal(stepAge(29.9 * DAY_MS, 0.2 * DAY_MS).crossed, 'lifespan');
  assert.equal(stepAge(31.9 * DAY_MS, 0.2 * DAY_MS).crossed, 'lifespan');      // その後も 1 日に 1 回
  assert.equal(stepAge(10 * DAY_MS, 0.2 * DAY_MS).crossed, null);
  // 家は tick を呼んだ分だけ年をとる（遊んでいない間は呼ばれない）
  const h = new Household({ me: founderInd({ id: 1, name: 'a', fur: 'sand', seed: 3 }) });
  const a0 = h.me.ageMs;
  h.tick(HOUR_MS);
  assert.equal(h.me.ageMs - a0, HOUR_MS);
  // 30 日をすぎると 1 日に 1 回だけ「そろそろ次の世代へ」。死なない（年齢はずっと進むだけ）
  h.me.ageMs = 30.2 * DAY_MS;
  assert.equal(h.wantsPrompt(), true); assert.equal(h.wantsPrompt(), false);
  h.tick(DAY_MS); assert.equal(h.wantsPrompt(), true);
  h.tick(100 * DAY_MS); assert.equal(stageOf(h.me.ageMs), 'elder'); assert.ok(h.me);
});
await test('繁殖の条件：若者・年寄り・冬・体調・寝床・倉庫の種子・前のお産からの間・子でいっぱい', () => {
  const life = { hunger: 80, thirst: 80, cond: 100 };
  const adult = 6 * DAY_MS;
  assert.match(courtBlock({ ageMs: 2 * DAY_MS, life, season: 'spring' }), /若い/);
  assert.match(courtBlock({ ageMs: 25 * DAY_MS, life, season: 'spring' }), /年寄り/);
  assert.match(courtBlock({ ageMs: adult, life, season: 'winter' }), /冬/);
  assert.match(courtBlock({ ageMs: adult, life: { ...life, cond: 30 }, season: 'spring' }), /体調/);
  assert.equal(courtBlock({ ageMs: adult, life, season: 'summer' }), null);
  const bed = { rooms: [{ kind: 'bed' }] }, plain = { rooms: [{ kind: 'plain' }] };
  assert.match(breedBlock({ ageMs: adult, life, season: 'spring', nestData: plain, seeds: 30 }), /寝床/);
  assert.match(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 9 }), /種子/);
  assert.match(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 30, lastBirthMs: adult - DAY_MS }), /あけて/);
  assert.match(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 30, kids: BREED.MAX_KIDS }), /いっぱい/);
  assert.match(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 30, pending: true }), /生まれる/);
  assert.equal(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 30 }), null);
  assert.equal(breedBlock({ ageMs: adult, life, season: 'spring', nestData: bed, seeds: 30, lastBirthMs: adult - 2.1 * DAY_MS }), null);
});
await test('子の数：春 3〜6・夏 2〜5・秋 2〜4・冬 0（決まった種で 3000 回の平均は春 > 夏 > 秋）', () => {
  const rng = mulberry32(31);
  const mean = {};
  for (const s of ['spring', 'summer', 'autumn']) {
    let sum = 0;
    for (let i = 0; i < 3000; i++) { const n = litterSize(rng, s); assert.ok(n >= LITTER[s].min && n <= LITTER[s].max, s + ' ' + n); sum += n; }
    mean[s] = sum / 3000;
  }
  assert.ok(mean.spring > mean.summer && mean.summer > mean.autumn, JSON.stringify(mean));
  assert.ok(mean.spring > 4 && mean.spring < 5 && mean.autumn > 2.2 && mean.autumn < 3, JSON.stringify(mean));
  assert.equal(litterSize(rng, 'winter'), 0);
  // 同じ種なら同じ子たち（名前・性・遺伝子）。世代は親の大きいほう +1。両親の id
  const mom = makeInd({ id: 10, name: 'はは', sex: 'f', generation: 2, genes: founderGenes('white', 1), role: 'player' });
  const dad = makeInd({ id: 11, name: 'ちち', sex: 'm', generation: 1, genes: wildGenes(mulberry32(3), 'desert'), role: 'mate' });
  let id = 100;
  const a = makeLitter({ mother: mom, father: dad, seed: 555, season: 'spring', nextId: () => id++ });
  id = 100;
  const b = makeLitter({ mother: mom, father: dad, seed: 555, season: 'spring', nextId: () => id++ });
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3 && a.length <= 6);
  for (const p of a) { assert.equal(p.generation, 3); assert.equal(p.mother_id, 10); assert.equal(p.father_id, 11); assert.equal(p.role, 'pup'); assert.equal(p.ageMs, 0); assert.equal(p.named, false); }
  assert.equal(new Set(a.map(p => p.name)).size, a.length);
  assert.equal(new Set(defaultNames(mulberry32(1), 30)).size, 30);
});
await test('子育て：おなかは 1 日で 100 減る・50 を切ると倉庫の種子を食べる（+40）・空っぽだと育たない・あげる（+40）', () => {
  const pup = makeInd({ id: 1, name: 'p', genes: founderGenes('sand', 1), role: 'pup' });
  // 種子なし：半日で 50・1 日で 0。年齢は進む（おなかが空になるまで）
  let r = stepFamily([pup], DAY_MS / 2, { seeds: 0 });
  assert.ok(near(r.members[0].fed, 50, 1e-6)); assert.equal(r.members[0].ageMs, DAY_MS / 2);
  r = stepFamily(r.members, DAY_MS / 2 + 1000, { seeds: 0 });
  assert.equal(r.members[0].fed, 0); assert.ok(r.events.some(e => e.type === 'hungry'));
  const age0 = r.members[0].ageMs;
  r = stepFamily(r.members, DAY_MS / 4, { seeds: 0 });
  assert.equal(r.members[0].ageMs, age0, '空っぽの間は育たない');
  // 種子があれば自動で食べて育つ
  r = stepFamily(r.members, DAY_MS / 20, { seeds: 5 });
  assert.ok(r.used >= 1 && r.members[0].fed > 0 && r.members[0].ageMs > age0);
  // 親があげる
  assert.equal(feedOne({ fed: 10 }).fed, 50); assert.equal(feedOne({ fed: 90 }).fed, 100);
  // 育つ：1.5 日で若者（stage のお知らせ）。若者もまだ食べる・おとなは食べない（自分で）
  let m = [{ ...pup, fed: 100 }], evs = [];
  for (let i = 0; i < 40; i++) { r = stepFamily(m, DAY_MS / 20, { seeds: 99 }); m = r.members; evs.push(...r.events); }
  assert.equal(stageOf(m[0].ageMs), 'young'); assert.ok(evs.some(e => e.type === 'stage' && e.stage === 'young'));
  assert.equal(needsFood(m[0]), true);
  assert.equal(needsFood({ ...m[0], ageMs: 5 * DAY_MS }), false);
  assert.equal(PUP.FEED, 40); assert.equal(PUP.AUTO_BELOW, 50);
});
await test('世代交代：自分の子で若者以上だけ。前の子とつれあいはご先祖、おとなのきょうだいは巣立ち、小さい子は巣に残る', () => {
  const me = makeInd({ id: 1, name: 'わたし', sex: 'f', genes: founderGenes('sand', 1), role: 'player', ageMs: 26 * DAY_MS });
  const mate = makeInd({ id: 2, name: 'あいて', sex: 'm', genes: founderGenes('white', 2), role: 'mate', ageMs: 9 * DAY_MS });
  const kid = (id, days) => makeInd({ id, name: 'k' + id, mother_id: 1, father_id: 2, genes: founderGenes('sand', id), role: 'pup', ageMs: days * DAY_MS });
  const other = makeInd({ id: 9, name: 'よその子', mother_id: 50, genes: founderGenes('sand', 9), role: 'kin', ageMs: 3 * DAY_MS });
  const fam = [mate, kid(3, 0.5), kid(4, 2), kid(5, 6), other];
  assert.match(heirBlock(me, fam[1]), /小さい/); assert.equal(heirBlock(me, fam[2]), null); assert.match(heirBlock(me, other), /自分の子/);
  const plan = successionPlan(me, fam, 4);
  assert.ok(plan.ok); assert.deepEqual(plan.retire, [1, 2]); assert.deepEqual(plan.leave, [5, 9].filter(x => x === 5)); assert.ok(plan.stay.includes(3));
  const h = new Household({ me, members: fam, pending: { mateId: 2, dueAgeMs: 99 * DAY_MS, nth: 2 }, litters: 1, lastBirthMs: me.ageMs - DAY_MS });
  assert.equal(h.succeed(3).ok, false);
  const r = h.succeed(4, 12345);
  assert.ok(r.ok); assert.equal(h.me.id, 4); assert.equal(h.me.role, 'player');
  assert.deepEqual(r.retired.map(x => [x.id, x.role]), [[1, 'ancestor'], [2, 'ancestor']]);
  assert.deepEqual(r.left.map(x => x.id).sort(), [5]);
  assert.deepEqual(h.members.map(x => [x.id, x.role]).sort(), [[3, 'kin'], [9, 'kin']]);
  assert.equal(h.pending, null); assert.equal(h.litters, 0);
  // 旅立ち：子がいない年寄りだけ（親せきの子があとをつぐ）
  const lone = new Household({ me: { ...me }, members: [] });
  const ok = lone.farewell({ newId: () => 77, now: 1 });
  assert.ok(ok.ok); assert.equal(lone.me.id, 77); assert.equal(lone.me.kinOf, 1); assert.equal(lone.me.generation, 2); assert.equal(stageOf(lone.me.ageMs), 'young');
  assert.match(farewellBlock(makeInd({ id: 1, name: 'x', genes: {}, role: 'player', ageMs: 10 * DAY_MS }), []), /早い/);
});
await test('家：迎える → お産の予定 → 世界の半日（遊んだ時間）で生まれる。冬は春まで待つ。名前・あげる', () => {
  const me = makeInd({ id: 1, name: 'わたし', sex: 'm', genes: founderGenes('rufous', 1), role: 'player', ageMs: 5 * DAY_MS });
  const h = new Household({ me, nestKey: 'n1' });
  let nid = 10;
  const ctx = { life: { hunger: 90, thirst: 90, cond: 100 }, season: 'spring', nestData: { rooms: [{ kind: 'bed' }] }, seeds: 20, newId: () => nid++, now: 5 };
  assert.match(h.invite({ name: 'サラ', genes: wildGenes(mulberry32(1), 'oasis') }, { ...ctx, seeds: 3 }).reason, /種子/);
  const r = h.invite({ name: 'サラ', genes: wildGenes(mulberry32(1), 'oasis') }, ctx);
  assert.ok(r.ok); assert.equal(h.mate.name, 'サラ'); assert.equal(h.mate.sex, 'f'); assert.ok(h.pending);
  assert.equal(h.dueIn(), BREED.GESTATION_DAYS * DAY_MS);
  let t = h.tick(DAY_MS / 4, { seeds: 20, season: 'winter', newId: () => nid++ });
  t = h.tick(DAY_MS / 4 + 1, { seeds: 20, season: 'winter', newId: () => nid++ });
  assert.ok(t.events.some(e => e.type === 'wait')); assert.ok(h.pending, '冬は待つ');
  t = h.tick(1000, { seeds: 20, season: 'spring', newId: () => nid++, now: 9 });
  const born = t.events.find(e => e.type === 'born');
  assert.ok(born && born.pups.length >= 3 && born.pups.length <= 6);
  assert.equal(born.mother, h.mate.id); assert.equal(born.father, 1);
  assert.equal(h.kids().length, born.pups.length); assert.equal(h.litters, 1);
  assert.ok(h.rename(born.pups[0].id, 'ポテト').ok); assert.equal(h.find(born.pups[0].id).name, 'ポテト');
  h.members = h.members.map(m => (m.role === 'pup' ? { ...m, fed: 20 } : m));
  assert.equal(h.feed(born.pups[0].id).member.fed, 60);
  assert.match(h.feed(h.mate.id).reason, /自分で/);
  // 次のお産は 2 日あけて
  assert.match(h.mateAgain(ctx).reason, /あけて/);
  h.me.ageMs += 2.1 * DAY_MS;
  assert.ok(h.mateAgain({ ...ctx, newId: undefined }).ok);
});

// ───────── 野生の子 ─────────
function openSpot() {
  for (let ty = 8; ty < map.h - 8; ty++) for (let tx = 8; tx < map.w - 8; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    let ok = true;
    for (let d = -60; d <= 60 && ok; d += 6) for (let e = -30; e <= 30 && ok; e += 6) if (!boxFree(map, x + d, y + e)) ok = false;
    if (ok) return { x, y };
  }
  throw new Error('no spot');
}
const S = openSpot();
await test('野生の子：じっとしていると信頼が増える・跳ね回る／大ジャンプで減って逃げる・種子 +25・100 でなかよし（ついてくる）', () => {
  const W = new WildWorld({ map, seed: 9 });
  W.spawnT = 1e12;
  const n = W.spawn(S.x + 30, S.y);
  const me = { id: 1, x: S.x, y: S.y, z: 0, jump: false, moving: false, still: 1, eligible: true };
  for (let i = 0; i < 40; i++) W.step({ season: 'spring', period: 'night', scale: 1, players: [{ ...me, x: S.x, y: S.y }] }, WILD_DT);   // 2 秒じっと
  const t1 = n.trust[1];
  assert.ok(near(t1, 16, 2), 'trust ' + t1);
  // 近くで大ジャンプ
  const ev = W.step({ season: 'spring', period: 'night', scale: 1, players: [{ ...me, jump: true, still: 0, x: n.st.x - 20, y: n.st.y }] }, WILD_DT);
  assert.ok(ev.some(e => e.type === 'startle')); assert.ok(n.trust[1] < t1 - 20 || n.trust[1] === 0);
  // 選べない子（若者など）：じっとしていても増えない・種子をあげても増えない
  const n2 = W.spawn(S.x - 30, S.y);
  for (let i = 0; i < 20; i++) W.step({ season: 'spring', period: 'night', scale: 1, players: [{ ...me, id: 2, eligible: false, x: S.x - 10, y: S.y }] }, WILD_DT);
  assert.equal(n2.trust[2] || 0, 0);
  // 種子 4 つで 100 → なかよし（ついてくる）。あげる間隔
  const m = W.spawn(S.x, S.y + 10);
  const p = { id: 3, x: S.x, y: S.y, eligible: true };
  assert.equal(W.offer(m.id, p, 1000).trust, 25);
  assert.match(W.offer(m.id, p, 1500).reason, /待って/);
  W.offer(m.id, p, 3000); W.offer(m.id, p, 5000);
  const last = W.offer(m.id, p, 7000);
  assert.ok(last.befriended); assert.equal(W.followerOf(3), m);
  assert.match(W.offer(m.id, { ...p, x: S.x + 100 }, 9000).reason, /なかよし|近く/);
  // ついてくる：はなれると追いかける
  for (let i = 0; i < 60; i++) W.step({ season: 'spring', period: 'night', scale: 1, players: [{ id: 3, x: S.x + 40, y: S.y, still: 0, moving: true, eligible: true }] }, WILD_DT);
  assert.ok(Math.hypot(m.st.x - (S.x + 40), m.st.y - S.y) < 40, 'follows');
});
await test('野生の子：季節で出る数（春 2・夏 1・秋 1・冬 0／1 人）・同じ種なら同じ動き・遺伝子と見た目を持つ', () => {
  const run = (season, seed = 4) => {
    const W = new WildWorld({ map, seed });
    const me = { id: 1, x: S.x, y: S.y, z: 0, still: 0, moving: false, eligible: false };
    let max = 0, log = [];
    for (let i = 0; i < 20 * 60 * 3; i++) { const ev = W.step({ season, period: 'night', scale: 120, players: [me] }, WILD_DT); max = Math.max(max, W.npcs.filter(n => Math.hypot(n.st.x - S.x, n.st.y - S.y) < 400).length); if (i % 97 === 0) log.push(JSON.stringify(W.snapshot())); for (const e of ev) log.push(e.type); }
    return { max, log: log.join('\n'), W };
  };
  const sp = run('spring'), su = run('summer'), au = run('autumn'), wi = run('winter');
  assert.equal(sp.max, 2); assert.equal(su.max, 1); assert.equal(au.max, 1); assert.equal(wi.max, 0);
  assert.equal(run('spring').log, sp.log, '決定的');
  const n = sp.W.npcs[0] || sp.W.spawn(S.x, S.y);
  assert.ok(n.genes && n.genes.col && n.look && FUR_RANK[n.look.fur] != null && n.name);
});

// ───────── オフライン（通し）─────────
async function offline({ season = 'spring', clockT = DAY_MS * 1_200_000, ls = makeLS() } = {}) {
  const clock = { t: clockT };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc: false, map, random: () => 0.37, env: true, predators: 'off', weather: 'clear', season, wildSeed: 5 });
  await n.login('local'); await n.createCharacter({ name: 'はじめ', fur: 'cream', sex: 'f' }); await n.joinField();
  return { n, ls, clock };
}
function digSpot(net) {
  for (let ty = 6; ty < map.h - 6; ty++) for (let tx = 6; tx < map.w - 6; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160) continue;
    let open = true;
    for (let d = -40; d <= 40 && open; d += 8) if (!boxFree(map, x + d, y + 10)) open = false;
    if (open && canDigBurrow(map, x, y, net._entrances()).ok) return { x, y };
  }
  throw new Error('no spot');
}
function tick(G, secs) { for (let i = 0; i < secs * 60; i++) { G.clock.t += 1000 / 60; G.n.tick(1 / 60); } }
async function readyNest(G) {
  const spot = digSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  addItem(G.n.save.player.inv, 'grass', 20); addItem(G.n.save.player.inv, 'pebble', 10);
  const d = await G.n.digBurrow(); assert.ok(d.ok, d.reason);
  const rec = G.n.save.nests[G.n.save.player.nestId];
  const r = await G.n.nestOp(rec.id, rec.rev, { op: 'set-kind', id: rec.data.rooms[0].id, kind: 'bed' }); assert.ok(r.ok, r.reason);
  addItem(rec.storage, 'seed', 30);
  addItem(G.n.save.player.inv, 'seed', 20);
  return { spot, rec };
}
await test('オフライン：最初の子（若者 3 日・遺伝子・性）・なかよくなれるのはおとなから（遊んだ時間で育つ）', async () => {
  const G = await offline();
  const h = G.n.house;
  assert.equal(h.me.name, 'はじめ'); assert.equal(h.me.sex, 'f'); assert.equal(stageOf(h.me.ageMs), 'young'); assert.deepEqual(h.me.genes.col, ['cream', 'cream']);
  const a0 = h.me.ageMs;
  tick(G, 2);
  assert.ok(near(G.n.house.me.ageMs - a0, 2000, 40), '世界の時間 = 実時間（scale 1）');
  G.n.place = 'none'; const a1 = G.n.house.me.ageMs; tick(G, 2); assert.equal(G.n.house.me.ageMs, a1, 'タイトルでは年をとらない'); G.n.place = 'field';
  const W = G.n.wild.spawn(G.n.auth.x + 10, G.n.auth.y);
  const r = await G.n.court(W.id);
  assert.equal(r.ok, false); assert.match(r.reason, /若い/);
  await G.n.dev({ age: 1.1 });
  assert.equal(stageOf(G.n.house.me.ageMs), 'adult');
});
let saved = null;
await test('オフライン：種子をあげて なかよし → いっしょに巣へ → つれあい・お産 → 2〜6 匹生まれる → 名前 → 育つ → 世代交代 → 家系図 3 代', async () => {
  const G = await offline();
  const { spot } = await readyNest(G);
  await G.n.dev({ age: 1.2 });
  const fam = [];
  G.n.on('family', m => fam.push(m));
  const wild = [];
  G.n.on('wild', m => wild.push(m));
  // 野生の子を出して、4 回種子をあげる
  G.n.auth = makeFieldState(spot.x + 30, spot.y + 12);
  const w = G.n.wild.spawn(G.n.auth.x + 12, G.n.auth.y);
  const seeds0 = countItem(G.n.save.player.inv, 'seed');
  for (let i = 0; i < 4; i++) { const r = await G.n.court(w.id); assert.ok(r.ok, r.reason); G.clock.t += 1500; }
  assert.equal(countItem(G.n.save.player.inv, 'seed'), seeds0 - 4);
  assert.ok(wild.some(e => e.type === 'befriend'));
  assert.equal(G.n.wild.followerOf('local'), w);
  // いっしょに巣へ
  const ent = G.n._entrances().find(e => e.own);
  G.n.auth = makeFieldState(ent.x, ent.y + 6); w.st = makeFieldState(ent.x + 20, ent.y + 10);
  const en = await G.n.enterNest('local');
  assert.ok(en.ok && en.invite && en.invite.ok, JSON.stringify(en.invite));
  assert.equal(G.n.house.mate.name, w.name); assert.ok(G.n.house.pending);
  assert.equal(G.n.wild.get(w.id), null, '野生の子は巣へ');
  assert.equal(en.nest.family.length, 1);
  // 世界の半日（遊んだ時間）で生まれる：timescale の代わりに年齢を進める
  await G.n.dev({ age: 0.55 });
  const h = G.n.house;
  const pups = h.kids();
  assert.ok(pups.length >= 3 && pups.length <= 6, 'spring litter ' + pups.length);
  assert.ok(fam.some(m => (m.events || []).some(e => e.type === 'born')));
  for (const p of pups) { assert.equal(p.mother_id, h.me.id); assert.equal(p.father_id, h.mate.id); assert.equal(p.generation, 2); }
  // 名前
  const nm = await G.n.namePups(pups.map((p, i) => ({ id: p.id, name: 'こ' + i })));
  assert.ok(nm.ok); assert.ok(G.n.house.kids().every(k => k.named && /^こ/.test(k.name)));
  assert.equal((await G.n.namePups([{ id: pups[0].id, name: '' }])).ok, false);
  // 種子をあげる（巣の中で）
  G.n.house.members = G.n.house.members.map(m => (m.role === 'pup' ? { ...m, fed: 10 } : m));
  const fd = await G.n.feedPup(pups[0].id); assert.ok(fd.ok, fd.reason); assert.equal(G.n.house.find(pups[0].id).fed, 50);
  // 育つ（倉庫の種子を食べながら）。小さいうちは世代交代できない
  const store0 = countItem(G.n.save.nests[G.n.save.player.nestId].storage, 'seed');
  assert.equal((await G.n.succeed(pups[0].id)).ok, false);
  await G.n.dev({ age: 1.6 });
  assert.ok(countItem(G.n.save.nests[G.n.save.player.nestId].storage, 'seed') < store0, '倉庫の種子を食べた');
  const kids = G.n.house.kids();
  assert.ok(kids.every(k => stageOf(k.ageMs) === 'young'), kids.map(k => ageDays(k.ageMs)).join(','));
  assert.ok(G.n.house.followers().length >= 1 && G.n.house.followers().length <= 3);
  // 世代交代：巣・倉庫・持ち物はそのまま、名前と毛色が変わる、前の子はご先祖
  const inv0 = JSON.stringify(G.n.save.player.inv), nestId = G.n.save.player.nestId, store1 = JSON.stringify(G.n.save.nests[nestId].storage);
  const heir = kids[1];
  const sc = await G.n.succeed(heir.id);
  assert.ok(sc.ok, sc.reason);
  assert.equal(sc.character.name, heir.name); assert.equal(G.n.save.character.name, heir.name); assert.equal(G.n.save.character.fur, heir.traits.fur);
  assert.equal(JSON.stringify(G.n.save.player.inv), inv0); assert.equal(G.n.save.player.nestId, nestId); assert.equal(JSON.stringify(G.n.save.nests[nestId].storage), store1);
  assert.equal(G.n.save.nests[nestId].ownerName, heir.name); assert.equal(G.n._entrances().find(e => e.own).name, heir.name);
  assert.deepEqual(sc.retired.map(r => r.role), ['ancestor', 'ancestor']);
  assert.ok(G.n.house.members.every(m => m.role === 'kin'));
  // 2 代目もおとなになって、野生の子と 3 代目
  await G.n.dev({ age: 2.6 });
  assert.equal(stageOf(G.n.house.me.ageMs), 'adult');
  await G.n.leaveNest();
  G.n.auth = makeFieldState(ent.x + 20, ent.y + 12);
  const w2 = G.n.wild.spawn(G.n.auth.x + 10, G.n.auth.y);
  G.n.save.player.life = makeLife();
  assert.ok(countItem(G.n.save.nests[nestId].storage, 'seed') < 10, '子どもたちが倉庫の種子を食べた');
  addItem(G.n.save.nests[nestId].storage, 'seed', 30);
  for (let i = 0; i < 4; i++) { const r = await G.n.court(w2.id); assert.ok(r.ok, r.reason); G.clock.t += 1500; }
  G.n.auth = makeFieldState(ent.x, ent.y + 6); w2.st = makeFieldState(ent.x + 10, ent.y + 10);
  const en2 = await G.n.enterNest('local');
  assert.ok(en2.invite && en2.invite.ok, JSON.stringify(en2.invite));
  await G.n.dev({ age: 0.6 });
  const g3 = G.n.house.kids().filter(k => k.generation === 3);
  assert.ok(g3.length >= 3);
  // 家系図：1 代目（ご先祖）・つれあい・2 代目（いま）・きょうだい・3 代目
  const lin = await G.n.lineage();
  assert.ok(lin.ok); assert.equal(lin.current, heir.id);
  const gens = new Set(lin.nodes.map(n => n.generation));
  assert.ok(gens.has(1) && gens.has(2) && gens.has(3));
  assert.ok(lin.nodes.some(n => n.role === 'ancestor' && n.name === 'はじめ'));
  for (const n of lin.nodes.filter(x => x.generation === 3)) { assert.equal(n.mother_id === heir.id || n.father_id === heir.id, true); }
  saved = G.ls;
  // 保存して読み直しても同じ
  G.n.flush();
  const n2 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: false, map });
  assert.equal(n2.house.me.id, heir.id); assert.equal(n2.house.kids().length, G.n.house.kids().length); assert.equal(n2.save.lineage.length, G.n.save.lineage.length);
});
await test('オフライン：迎えられないとき（寝床なし・冬）は理由を知らせ、野生の子は外で待つ', async () => {
  const G = await offline({ season: 'spring' });
  const spot = digSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  await G.n.digBurrow();
  await G.n.dev({ age: 1.2 });
  const ent = G.n._entrances().find(e => e.own);
  G.n.auth = makeFieldState(ent.x + 20, ent.y + 12);
  const w = G.n.wild.spawn(G.n.auth.x + 10, G.n.auth.y);
  for (let i = 0; i < 4; i++) { await G.n.court(w.id); G.clock.t += 1500; }
  G.n.auth = makeFieldState(ent.x, ent.y + 6); w.st = makeFieldState(ent.x + 12, ent.y + 10);
  const en = await G.n.enterNest('local');
  assert.ok(en.ok); assert.equal(en.invite.ok, false); assert.match(en.invite.reason, /寝床/);
  assert.ok(G.n.wild.get(w.id), '外で待っている');
  await G.n.leaveNest();
  await G.n.dev({ season: 'winter' });
  assert.match((await G.n.court(w.id)).reason, /冬/);
});
await test('オフライン：セーブの移行 v3 → v4（いまの子が 1 代目のおとなに。持ち物・巣はそのまま）', async () => {
  const G = await offline();
  const spot = digSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  await G.n.digBurrow();
  const s = JSON.parse(JSON.stringify(G.n.save));
  s.v = 3; delete s.house; delete s.lineage; delete s.nextInd;
  s.character.individual = { species: 'jerboa', sex: null, generation: 1, father_id: null, mother_id: null, genes: { fur: 'cream' }, traits: {}, status: {} };
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(s), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls, now: () => G.clock.t, npc: false, map });
  assert.equal(n2.save.v, SAVE_VERSION); assert.ok(SAVE_VERSION >= 4);   // Ver.0.5 で 5
  assert.equal(n2.house.me.name, 'はじめ'); assert.equal(stageOf(n2.house.me.ageMs), 'adult'); assert.deepEqual(n2.house.me.genes.col, ['cream', 'cream']);
  assert.deepEqual(n2.save.lineage, []); assert.equal(n2.save.nextInd, 2);
  assert.deepEqual(n2.save.player.inv, G.n.save.player.inv);
  assert.equal(JSON.stringify(Object.values(n2.save.nests)[0].data), JSON.stringify(Object.values(s.nests)[0].data));
  n2.flush();
  assert.equal(JSON.parse(ls.getItem(SAVE_KEY)).v, SAVE_VERSION); assert.equal(ls.getItem('dannoura_save'), 'keep');
  const j = await n2.joinField();
  assert.ok(j.ok && j.world.family && j.world.family.me.name === 'はじめ');
});

console.log(`\ntobinezumi-family: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
void seedOf; void saved; void HOUR_MS;
