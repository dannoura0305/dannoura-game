// トビネズミ Ver.0.7「小さなできごと」の共有ルールとオフライン：家族どうしの短いやりとり（決定的・訪問者と同じ）・
// なかま（近縁種）を地上へ（1 匹まで・足あと・かくれる・保存）・富山の小さな出来事（条件・1 回だけ・保存）・
// トーストと上の案内が重ならない置き方・セーブ v6 → v7。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap } from '../tobinezumi/shared/regions.js';
import { makeFieldState } from '../tobinezumi/shared/move.js';
import { DAY_MS, HOUR_MS } from '../tobinezumi/shared/daynight.js';
import { familyScene } from '../tobinezumi/shared/family-life.js';
import { talkInSlot, familyTalk, talkLineAt, nextTalk, talkContext, pairType, TALK, DIALOGUES, TALK_TYPES } from '../tobinezumi/shared/family-talk.js';
import { Household, walkerOut, walkersOfFamily, COMPANION_MAX } from '../tobinezumi/shared/household.js';
import { makeInd, founderInd } from '../tobinezumi/shared/family.js';
import { founderGenes } from '../tobinezumi/shared/genetics.js';
import { kidSpots, kidsHidden, trailPush, FOLLOW } from '../tobinezumi/shared/follow.js';
import { toyamaEventBlock, TOYAMA_EVENT_IDS, TEV, BOARD_LINES, boardLine, boardText, FOOTPRINTS, FOOT_END, FOOT_TEXT, TRAIN_TEXT, NEAR_TEXT, trainTime, crossoverComplete } from '../tobinezumi/shared/toyama.js';
import { CROSSOVER } from '../tobinezumi/shared/collect.js';
import { regionMap } from '../tobinezumi/shared/world.js';
import { placeHelpLine, boxesOverlap } from '../tobinezumi/client/touch-logic.js';
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
console.log('tobinezumi-v07 (Ver.0.7)');

// ───────── 家族どうしの短いやりとり ─────────
const ROOMS = [{ id: 'r1', kind: 'bed', x0: 40, x1: 170, y: 160 }, { id: 'r2', kind: 'store', x0: 220, x1: 320, y: 208 }];
const BED = { x0: 60, x1: 92, roomId: 'r1' };
const FAMILY = [
  { id: 11, role: 'mate', stage: 'adult', name: 'サラ', ageMs: 6 * DAY_MS }, { id: 12, role: 'pup', stage: 'pup', fed: 90, name: 'ポポ', ageMs: 1 * DAY_MS }, { id: 13, role: 'pup', stage: 'pup', fed: 90, name: 'チロ', ageMs: 1 * DAY_MS },
  { id: 14, role: 'pup', stage: 'young', fed: 90, name: 'ソラ', ageMs: 2 * DAY_MS }, { id: 15, role: 'friend', stage: 'adult', species: 'longear', name: 'ルナ', ageMs: 7 * DAY_MS },
];
const T0 = 1_760_000_000_000;
const CTX = { season: 'spring', period: 'night', weather: 'clear', seeds: 20 };
const tin = (key, members = FAMILY, ctx = CTX, period = ctx.period) => ({ key, members, ctx, sceneAt: tt => familyScene({ key, members, rooms: ROOMS, bed: BED, t: tt, period, parents: {} }) });
const slots = (o, n = 200, s0 = Math.floor(T0 / TALK.SLOT_MS)) => { const out = []; for (let s = s0; s < s0 + n; s++) { const k = talkInSlot({ ...o, slot: s }); if (k) out.push(k); } return out; };
const BAD_WORDS = ['だんのうら', '壇ノ浦', '壇の浦', 'ダンノウラ', '境界事象', 'わかば'];

await test('やりとり：同じ巣・同じ時刻なら同じ（並び順・別の配列でも）・巣がちがえば ちがう・2〜3 行で交互・同じ部屋で起きている 2 匹', () => {
  const a = slots(tin(42)), b = slots(tin(42, [...FAMILY].reverse().map(m => ({ ...m }))));
  assert.deepEqual(a, b, '訪問者の画面でも同じ');
  assert.ok(a.length > 40, 'ときどき話す: ' + a.length);
  const c = slots(tin(43));
  assert.notDeepEqual(a.map(k => k.topic + k.a + k.b), c.map(k => k.topic + k.a + k.b), '巣がちがえば ちがう');
  for (const k of a) {
    assert.ok(k.lines.length >= 2 && k.lines.length <= 3, '2〜3 行');
    for (let i = 1; i < k.lines.length; i++) { assert.notEqual(String(k.lines[i].id), String(k.lines[i - 1].id), '交互'); assert.ok(k.lines[i].t0 >= k.lines[i - 1].t1, '前の行が消えてから'); }
    assert.ok(k.t0 >= k.slot * TALK.SLOT_MS && k.t1 <= (k.slot + 1) * TALK.SLOT_MS, '枠の中');
    const sc = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: k.t0, period: 'night', parents: {} });
    assert.equal(sc.get(k.a).roomId, sc.get(k.b).roomId, '同じ部屋');
    for (const id of [k.a, k.b]) assert.ok(!['sleep', 'pile'].includes(sc.get(id).act), '起きている');
    assert.ok(TALK_TYPES.includes(k.type));
  }
  // familyTalk / talkLineAt：その時刻に 1 行だけ
  const k = a[0];
  const mid = k.lines[1].t0 + 100;
  assert.deepEqual(familyTalk({ ...tin(42), t: mid }), k);
  assert.equal(talkLineAt(k, mid).text, k.lines[1].text);
  assert.equal(talkLineAt(k, k.lines[0].t1 + 50), null, '行と行の間は 一瞬だけ 空く');
  assert.equal(familyTalk({ ...tin(42), t: k.t1 + 10 }), null);
  const nx = nextTalk({ ...tin(42), t: k.t1 + 10 });
  assert.ok(nx && nx.t0 > k.t1);
});

await test('やりとり：組の種類（子どもどうし・つれあいと子・なかまと子・なかまとおとな・住人・おとなどうし）と、季節・昼夜・天気・倉庫・できごとで中身が変わる', () => {
  const pt = (x, y) => pairType(x, y).type;
  assert.equal(pt(FAMILY[1], FAMILY[2]), 'kids'); assert.equal(pt(FAMILY[0], FAMILY[1]), 'parent'); assert.equal(pairType(FAMILY[1], FAMILY[0]).a.id, 11, 'つれあいが a');
  assert.equal(pt(FAMILY[4], FAMILY[1]), 'friendKid'); assert.equal(pt(FAMILY[0], FAMILY[4]), 'friendMate');
  assert.equal(pt({ id: 'npc_nuts', npc: true, role: 'resident' }, FAMILY[0]), 'npc');
  assert.equal(pt({ id: 1, role: 'kin', stage: 'adult' }, { id: 2, role: 'kin', stage: 'elder' }), 'adults');
  const topics = (ctx, members = FAMILY, period = ctx.period) => new Set(slots(tin(42, members, ctx, period), 400).map(k => k.topic));
  const night = topics(CTX), day = topics({ ...CTX, period: 'day' }, FAMILY.filter(m => m.stage === 'adult'));
  assert.ok(night.has('k_play') || night.has('p_day'), [...night]);
  const winter = topics({ ...CTX, season: 'winter', weather: 'snow' });
  assert.ok([...winter].some(t => /winter|snow/.test(t)), '冬・雪: ' + [...winter]);
  const low = topics({ ...CTX, seeds: 2 }), high = topics({ ...CTX, seeds: 60 });
  assert.ok([...low].some(t => /_low/.test(t)), '倉庫が少ない'); assert.ok([...high].some(t => /_high|k_seeds/.test(t)), '倉庫がいっぱい');
  assert.ok(!night.has('p_low') && !night.has('a_low'));
  void day;
  // できごと：赤ちゃんが生まれたばかり・世代交代のあと（きょうだい）・富山へ行ったことがある・なかまと地上へ出た
  const babies = FAMILY.map(m => (m.id === 12 || m.id === 13 ? { ...m, ageMs: 0.1 * DAY_MS } : m));
  assert.equal(talkContext(babies, CTX).newLitter, true); assert.equal(talkContext(FAMILY, CTX).newLitter, false);
  assert.ok([...topics(CTX, babies)].some(t => /litter/.test(t)), '生まれたばかり');
  const kin = FAMILY.map(m => (m.role === 'pup' ? { ...m, role: 'kin' } : m));
  assert.equal(talkContext(kin, CTX).succession, true);
  assert.ok([...topics(CTX, kin)].some(t => /succ/.test(t)), '世代交代のあと');
  assert.ok([...topics({ ...CTX, tales: { toyama: true } })].some(t => /toyama/.test(t)), '富山へ行ったことがある');
  assert.ok(![...night].some(t => /toyama/.test(t)), '行っていなければ富山の話はしない');
  assert.ok([...topics({ ...CTX, companion: 15 })].some(t => /_out/.test(t)), 'なかまと地上へ出た');
  // 昼は ねむい話
  const dayAll = topics({ ...CTX, period: 'dawn' }, FAMILY, 'dawn');
  assert.ok([...dayAll].some(t => /sleepy|rest/.test(t)), '明け方: ' + [...dayAll]);
});

await test('やりとり：ことばは やさしく短い・他作品の題名や名前は出さない・どの種類にも ふだんの話がある', () => {
  for (const d of DIALOGUES) {
    assert.ok(d.lines.length >= 2 && d.lines.length <= 3, d.id);
    for (const [who, text] of d.lines) { assert.ok(who === 'a' || who === 'b'); assert.ok(text.length > 0 && text.length <= 24, d.id + ' ' + text); for (const w of BAD_WORDS) assert.ok(!text.includes(w), text); }
  }
  const c = talkContext(FAMILY, CTX);
  for (const ty of TALK_TYPES) assert.ok(DIALOGUES.some(d => d.type === ty && d.when(c, { stage: 'adult', role: 'mate' }, { stage: 'pup', role: 'pup', fed: 90 })), ty);
  // 眠っている子は話さない・家族が 1 匹なら話さない
  const asleep = slots(tin(42, FAMILY, { ...CTX, period: 'day' }, 'day'), 200);
  for (const k of asleep) { const sc = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: k.t0, period: 'day', parents: {} }); for (const id of [k.a, k.b]) assert.ok(!['sleep', 'pile'].includes(sc.get(id).act)); }
  assert.equal(slots(tin(42, [FAMILY[0]])).length, 0);
});

// ───────── なかまを地上へ ─────────
function house() {
  const me = founderInd({ id: 1, name: 'はじめ', fur: 'cream', sex: 'f', seed: 3 });
  const g = founderGenes('sand', 2);
  const young = [2, 3, 4, 5].map(i => makeInd({ id: i, name: 'Y' + i, genes: g, role: 'pup', ageMs: 2 * DAY_MS, fed: 90, mother_id: 1, generation: 2 }));
  const f1 = makeInd({ id: 8, name: 'ルナ', genes: g, role: 'friend', ageMs: 7 * DAY_MS, species: 'longear' });
  const f2 = makeInd({ id: 9, name: 'ミラ', genes: g, role: 'friend', ageMs: 7 * DAY_MS, species: 'longear' });
  const mate = makeInd({ id: 7, name: 'サラ', genes: g, role: 'mate', ageMs: 6 * DAY_MS });
  return new Household({ me, members: [...young, mate, f1, f2] });
}
await test('なかま：地上へ 1 匹だけ（別の子を選ぶと入れかわる）・なかま以外はだめ・若者 3 匹の後ろ・見た目はミミナガ・保存の形', () => {
  const h = house();
  assert.equal(COMPANION_MAX, 1);
  assert.deepEqual(h.walkers().map(m => m.id), [2, 3, 4], 'はじめは若者 3 匹だけ');
  assert.equal(h.setCompanion(7).ok, false, 'つれあいは連れて行けない'); assert.equal(h.setCompanion(2).ok, false); assert.equal(h.setCompanion(99).ok, false);
  const r = h.setCompanion(8); assert.ok(r.ok); assert.equal(r.swapped, null);
  assert.deepEqual(h.walkers().map(m => m.id), [2, 3, 4, 8], '若者の後ろに なかま');
  const r2 = h.setCompanion(9); assert.ok(r2.ok); assert.equal(r2.swapped, 8, '入れかわる');
  assert.deepEqual(h.walkers().map(m => m.id), [2, 3, 4, 9]);
  assert.equal(h.walkers().filter(m => m.role === 'friend').length, 1, '同時に 1 匹');
  h.follow = false; assert.deepEqual(h.walkers().map(m => m.id), [9], '若者を連れて行かなくても なかまは来る');
  const w = walkerOut(h.find(9)); assert.equal(w.comp, 1); assert.equal(w.sp, 'longear'); assert.equal(w.look.sp, 'longear'); assert.ok(!w.look.young);
  assert.equal(walkerOut(h.find(2)).look.young, 1);
  const out = h.out(); assert.equal(out.companion, 9);
  assert.deepEqual(walkersOfFamily(out).map(k => k.id), [9], 'クライアントも同じ計算');
  const h2 = new Household(JSON.parse(JSON.stringify(h.toJSON()))); assert.equal(h2.companion, 9);
  // 世代交代しても なかまは巣に残る・連れて行く設定も
  h.follow = true;
  const s = h.succeed(2, 1000); assert.ok(s.ok, s.reason); assert.equal(h.companionMember().id, 9);
  assert.equal(h.setCompanion(null).companion, null); assert.deepEqual(h.walkers().filter(m => m.role === 'friend'), []);
});
await test('なかま：足あとの 4 番目（若者の後ろ）を歩き、捕食者が近いと いっしょに巣へかくれる', () => {
  const tr = [];
  for (let x = 100; x <= 300; x += 1) trailPush(tr, x, 200);
  const owner = { x: 300, y: 200 };
  const sp = kidSpots(tr, owner, 4);
  assert.equal(sp.length, 4);
  assert.ok(Math.abs((owner.x - sp[3].x) - (FOLLOW.GAP0 + 3 * FOLLOW.GAP)) <= 2.5, 'なかまの位置 ' + sp[3].x);
  assert.equal(kidsHidden([{ x: 380, y: 200 }], owner), true); assert.equal(kidsHidden([{ x: 520, y: 200 }], owner), false);
});

// ───────── 富山の小さな出来事 ─────────
const PHONE = regionMap('toyama').props.find(p => p.kind === 'phone');
await test('富山の出来事：条件（夏の夜の光る板・4:44 ごろの音・冬の足あと・不思議な品がそろったあとの夜の白い影）・ほかの土地ではない・見たら もう起きない', () => {
  assert.deepEqual(TOYAMA_EVENT_IDS, ['board', 'train', 'footprints', 'white_near']);
  const base = { region: 'toyama', season: 'summer', period: 'night', hour: 22, x: PHONE.x, y: PHONE.y - 6, owned: {}, seen: {} };
  assert.equal(toyamaEventBlock('board', base), null);
  assert.ok(toyamaEventBlock('board', { ...base, season: 'spring' })); assert.ok(toyamaEventBlock('board', { ...base, period: 'day' })); assert.ok(toyamaEventBlock('board', { ...base, x: PHONE.x + 200 }));
  assert.ok(toyamaEventBlock('board', { ...base, region: 'canyon' })); assert.ok(toyamaEventBlock('board', { ...base, seen: { board: 1 } }), '1 回だけ');
  assert.equal(toyamaEventBlock('train', { ...base, hour: 4 + 45 / 60 }), null);
  assert.ok(toyamaEventBlock('train', { ...base, hour: 4.5 })); assert.ok(toyamaEventBlock('train', { ...base, hour: 5 }));
  assert.equal(toyamaEventBlock('train', { ...base, hour: 4 + 55 / 60, slack: TEV.TRAIN_SLACK }), null, 'サーバーは少し遅れても受ける');
  assert.equal(trainTime(4 + 44 / 60), true); assert.equal(trainTime(16 + 44 / 60), false);
  const foot = { ...base, season: 'winter', x: FOOT_END.x, y: FOOT_END.y };
  assert.equal(toyamaEventBlock('footprints', foot), null); assert.ok(toyamaEventBlock('footprints', { ...foot, season: 'autumn' })); assert.ok(toyamaEventBlock('footprints', { ...foot, x: FOOT_END.x + 80 }));
  const all = Object.fromEntries(CROSSOVER.map(id => [id, 1]));
  assert.equal(crossoverComplete(all), true); assert.equal(crossoverComplete(new Set(CROSSOVER)), true); assert.equal(crossoverComplete({ ...all, unknown_card: undefined }), false);
  assert.equal(toyamaEventBlock('white_near', { ...base, owned: all }), null); assert.ok(toyamaEventBlock('white_near', { ...base, owned: {} })); assert.ok(toyamaEventBlock('white_near', { ...base, owned: all, period: 'dusk' }));
  assert.ok(toyamaEventBlock('nope', base));
});
await test('富山の出来事：光る板の一行は時刻で変わる・足あとは地図の中で途切れる・ことばは説明しない（他作品の名前なし）', () => {
  assert.notEqual(boardLine(1), boardLine(2)); assert.equal(boardLine(25), boardLine(1)); assert.equal(new Set(BOARD_LINES).size, BOARD_LINES.length);
  assert.ok(boardText(3).includes(boardLine(3)) && boardText(3).includes(boardLine(4)), '一行が かわる');
  const tm = regionMap('toyama');
  for (const q of FOOTPRINTS) assert.ok(q.x > 0 && q.x < tm.pxW && q.y > 0 && q.y < tm.pxH);
  assert.ok(Math.hypot(FOOTPRINTS[0].x - FOOT_END.x, FOOTPRINTS[0].y - FOOT_END.y) > 60, '点々と続く');
  for (const t of [FOOT_TEXT, TRAIN_TEXT, NEAR_TEXT, ...BOARD_LINES, boardText(0)]) for (const w of BAD_WORDS) assert.ok(!t.includes(w), t);
});

// ───────── 上の案内とトースト ─────────
await test('トーストと上の案内：重なるなら案内をトーストの下へ（4px あける）・下げすぎるなら隠す・重ならなければ そのまま（どの画面の大きさでも重ならない）', () => {
  const help = { left: 40, right: 320, top: 77, height: 18 };
  assert.deepEqual(placeHelpLine(help, null), { top: 77, hidden: false, moved: false });
  const r = placeHelpLine(help, { left: 30, right: 330, top: 60, bottom: 100 }, { limit: 400 });
  assert.deepEqual(r, { top: 104, hidden: false, moved: true });
  assert.equal(placeHelpLine(help, { left: 30, right: 330, top: 60, bottom: 100 }, { limit: 110 }).hidden, true, '下げすぎ → 隠す');
  assert.equal(placeHelpLine(help, { left: 400, right: 500, top: 60, bottom: 100 }).moved, false, '横に離れていれば そのまま');
  assert.equal(placeHelpLine(help, { left: 30, right: 330, top: 10, bottom: 40 }).moved, false, '上に離れていれば そのまま');
  // いろいろな画面（スマホ縦・横・小さい・タブレット・PC）でためす：案内とトーストの箱が 4px 以上離れるか、隠れる
  const views = [[390, 844], [844, 390], [360, 740], [820, 1180], [1280, 800]];
  let n = 0;
  for (const [W, H] of views) for (let k = 0; k < 400; k++) {
    const hw = Math.min(W - 20, 180 + (k * 37) % 200), hl = (W - hw) / 2, ht = 40 + (k * 13) % 80, hh = 14 + (k % 3) * 12;
    const tw = Math.min(W - 12, 120 + (k * 53) % 300), tl = (W - tw) / 2, tt = 30 + (k * 7) % 90, tb = tt + 18 + (k % 4) * 22;
    const res = placeHelpLine({ left: hl, right: hl + hw, top: ht, height: hh }, { left: tl, right: tl + tw, top: tt, bottom: tb }, { limit: H * 0.6, gap: 4 });
    if (res.hidden) continue;
    n++;
    assert.ok(!boxesOverlap({ left: hl, right: hl + hw, top: res.top - 4, bottom: res.top + hh + 4 }, { left: tl, right: tl + tw, top: tt, bottom: tb }), `重なる ${W}x${H} k=${k}`);
    assert.ok(res.top + hh <= H * 0.6 + 0.01);
  }
  assert.ok(n > 1000);
});

// ───────── オフライン ─────────
const NIGHT = DAY_MS * 1_200_000 + 23 * HOUR_MS;
async function offline({ t = NIGHT, ls = makeLS(), season = 'summer' } = {}) {
  const clock = { t };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc: false, map, random: () => 0.37, env: true, predators: 'off', weather: 'clear', season, wild: false });
  await n.login('local'); await n.createCharacter({ name: 'はじめ', fur: 'cream', sex: 'f' }); await n.joinField();
  return { n, ls, clock };
}
await test('オフライン：なかまを地上へ（家族の画面の返事・地上の子の見た目・保存して読みなおしても）', async () => {
  const G = await offline();
  await G.n.dev({ family: { young: 1, friend: 1 } });
  const f = G.n.house.friends()[0];
  assert.ok(f);
  const r = await G.n.setCompanion(f.id);
  assert.ok(r.ok); assert.equal(r.family.companion, f.id);
  assert.deepEqual(r.kids.map(k => !!k.comp), [false, true], '若者 → なかま');
  assert.equal((await G.n.setCompanion(G.n.house.kids()[0].id)).ok, false);
  G.n.flush();
  const n2 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: false, map, env: true, wild: false });
  assert.equal(n2.house.companion, f.id);
  const j = await n2.joinField();
  assert.equal(j.world.you.kids.filter(k => k.comp).length, 1);
  assert.equal(j.world.family.companion, f.id);
  assert.equal((await n2.setCompanion(null)).family.companion, null);
});
await test('オフライン：富山の出来事は 1 回だけ（条件・二度目は first:false・保存して読みなおしても）', async () => {
  const G = await offline({ season: 'summer' });
  assert.equal((await G.n.toyamaEvent('board')).ok, false, 'はじまりの原では起きない');
  await G.n.dev({ region: 'toyama', x: PHONE.x, y: PHONE.y + 4 });
  G.n.auth = makeFieldState(PHONE.x, PHONE.y + 4);
  const a = await G.n.toyamaEvent('board');
  assert.ok(a.ok, a.reason); assert.equal(a.first, true);
  const b = await G.n.toyamaEvent('board');
  assert.ok(b.ok); assert.equal(b.first, false, '二度目は起きない');
  assert.equal((await G.n.toyamaEvent('train')).ok, false, 'いまは 23 時');
  await G.n.dev({ hour: 4 + 45 / 60 });
  assert.ok((await G.n.toyamaEvent('train')).first);
  assert.equal((await G.n.toyamaEvent('white_near')).ok, false, '不思議な品が そろっていない');
  await G.n.dev({ hour: 23, collect: CROSSOVER });
  assert.ok((await G.n.toyamaEvent('white_near')).first);
  await G.n.dev({ season: 'winter' });
  G.n.auth = makeFieldState(FOOT_END.x, FOOT_END.y);
  assert.ok((await G.n.toyamaEvent('footprints')).first);
  G.n.flush();
  const saved = JSON.parse(G.ls.getItem(SAVE_KEY));
  assert.deepEqual(Object.keys(saved.toyamaEvents).sort(), ['board', 'footprints', 'train', 'white_near']);
  const n2 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: false, map, env: true, wild: false });
  const j = await n2.joinField();
  assert.deepEqual(Object.keys(j.world.collection.tev).sort(), ['board', 'footprints', 'train', 'white_near']);
  n2.auth = makeFieldState(FOOT_END.x, FOOT_END.y);
  assert.equal((await n2.toyamaEvent('footprints')).first, false, '読みなおしても 二度目は無い');
});
await test('オフライン：セーブの移行 v6 → v7（富山の出来事の入れ物・なかまは だれも連れて行かない。家族・持ち物はそのまま）', async () => {
  const G = await offline();
  await G.n.dev({ family: { friend: 1 } });
  G.n.flush();
  const s = JSON.parse(G.ls.getItem(SAVE_KEY));
  s.v = 6; delete s.toyamaEvents; delete s.house.companion;
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(s), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls, now: () => G.clock.t, npc: false, map, wild: false });
  assert.equal(SAVE_VERSION, 7); assert.equal(n2.save.v, 7);
  assert.deepEqual(n2.save.toyamaEvents, {}); assert.equal(n2.save.house.companion, null);
  assert.equal(n2.house.friends().length, 1); assert.equal(n2.house.walkers().length, 0);
  n2.flush();
  assert.equal(JSON.parse(ls.getItem(SAVE_KEY)).v, 7); assert.equal(ls.getItem('dannoura_save'), 'keep');
});

console.log(`\ntobinezumi-v07: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
