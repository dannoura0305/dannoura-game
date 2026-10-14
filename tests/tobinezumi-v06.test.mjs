// トビネズミMMO Ver.0.6「くらしの深まり＋公開準備」：家族のしぐさ・ひとこと（決定的）・なでる、地上の若者の足あと（follow）、
// 家系図の書き出し（配置・文字。画素は見ない）、巣めぐり（順位・点数なし・入れかわる）、オフラインの共同巣（NPC の住人）、
// 近縁種（ミミナガトビネズミ：なかよくなれる・赤ちゃんはできない）、富山の季節、入口の守り（Origin・IP ごとの上限）、セーブ v5 → v6。DOM なし。
import assert from 'node:assert/strict';
import { buildFieldMap, TILE, canDigBurrow } from '../tobinezumi/shared/regions.js';
import { makeFieldState, boxFree } from '../tobinezumi/shared/move.js';
import { DAY_MS, HOUR_MS } from '../tobinezumi/shared/daynight.js';
import { familyScene, familyBubble, familyLine, famRooms, petBlock, PET, FAM, seedTone } from '../tobinezumi/shared/family-life.js';
import { Household } from '../tobinezumi/shared/household.js';
import { makeInd, founderInd, speciesBlock, friendBlock, FRIEND_MAX, SPECIES, stageOf } from '../tobinezumi/shared/family.js';
import { founderGenes, wildGenes, lookOf, lookKey } from '../tobinezumi/shared/genetics.js';
import { mulberry32 } from '../tobinezumi/shared/rng.js';
import { WildWorld, LONGEAR } from '../tobinezumi/shared/wild.js';
import { regionMap, TOYAMA } from '../tobinezumi/shared/world.js';
import { trailPush, kidSpots, kidsHidden, FOLLOW, packSpots, unpackSpots } from '../tobinezumi/shared/follow.js';
import { layoutLineage, lineageExportLayout, lineageText } from '../tobinezumi/shared/lineage.js';
import { pickTour, TOUR } from '../tobinezumi/shared/tour.js';
import { toyamaSeasonProps, paddyHarvested, glimpseSpot, GLIMPSE_SPOTS, shrineText, TOYAMA_BUSSTOP } from '../tobinezumi/shared/toyama.js';
import { CURIOS, curioEligible, CURIO_ORDER } from '../tobinezumi/shared/collect.js';
import { addItem, countItem } from '../tobinezumi/shared/items.js';
import { OfflineBackend, SAVE_KEY, SAVE_VERSION, NPC_SEED } from '../tobinezumi/client/net.js';
import { checkOrigin, parseOrigins, IpLimiter, clientIp, productionCheck, securityFromEnv } from '../tobinezumi/server/security.js';

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
console.log('tobinezumi-v06 (Ver.0.6)');

// ───────── 家族のしぐさ・ひとこと ─────────
const ROOMS = [{ id: 'r1', kind: 'bed', x0: 40, x1: 170, y: 160 }, { id: 'r2', kind: 'store', x0: 220, x1: 320, y: 208 }];
const BED = { x0: 60, x1: 92, roomId: 'r1' };
const FAMILY = [
  { id: 11, role: 'mate', stage: 'adult', name: 'サラ' }, { id: 12, role: 'pup', stage: 'pup', fed: 20, name: 'ポポ' }, { id: 13, role: 'pup', stage: 'pup', fed: 90, name: 'チロ' },
  { id: 14, role: 'pup', stage: 'young', fed: 90, name: 'ソラ' }, { id: 15, role: 'friend', stage: 'adult', species: 'longear', name: 'ルナ' }, { id: 'npc_nuts', role: 'resident', stage: 'adult', npc: true, name: 'ナッツ' },
];
const T0 = 1_760_000_000_000;
await test('家族のしぐさ：同じ巣・同じ時刻なら同じ（別々に計算しても一致＝どの画面でも同じ）・部屋の中・時刻に連続', () => {
  const a = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: T0 + 12345, period: 'night' });
  const b = familyScene({ key: 42, members: [...FAMILY].reverse().map(m => ({ ...m })), rooms: ROOMS.map(r => ({ ...r })), bed: { ...BED }, t: T0 + 12345, period: 'night' });
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort(), '並び順・別の配列でも同じ');
  const other = familyScene({ key: 43, members: FAMILY, rooms: ROOMS, bed: BED, t: T0 + 12345, period: 'night' });
  assert.notDeepEqual([...a.values()].map(v => v.x), [...other.values()].map(v => v.x), '巣がちがえば ちがう');
  const acts = new Set();
  let maxJump = 0;
  for (let t = T0; t < T0 + 300000; t += 100) {
    const sc = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t, period: 'night' });
    const prev = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: t - 100, period: 'night' });
    for (const [id, v] of sc) {
      const R = ROOMS.find(r => r.id === v.roomId);
      assert.ok(R && v.x >= R.x0 - 0.01 && v.x <= R.x1 + 0.01 && v.y === R.y, '部屋の床の上: ' + id);
      acts.add(v.act);
      const p = prev.get(id);
      if (p.roomId === v.roomId && !v.pop && v.act !== 'chase' && p.act !== 'chase') maxJump = Math.max(maxJump, Math.abs(v.x - p.x));
    }
  }
  for (const a2 of ['wander', 'groom', 'sniff', 'sit', 'snuggle', 'chase', 'visit']) assert.ok(acts.has(a2), 'しぐさ: ' + a2 + ' ' + [...acts]);
  assert.ok(maxJump < 8, '同じ部屋の中では 0.1 秒で 8px より跳ばない: ' + maxJump);
});
await test('家族のしぐさ：昼は子ども・若者が寝床にかたまって眠る（NPC の住人・なかまも眠る）・親が眠ると子も眠る・親についていく', () => {
  const day = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: T0, period: 'day' });
  for (const id of [12, 13, 14]) { const v = day.get(id); assert.equal(v.act, 'pile'); assert.equal(v.anim, 'sleep'); assert.ok(Math.abs(v.x - 76) <= 15, 'かたまる'); }
  assert.equal(day.get('npc_nuts').act, 'sleep'); assert.equal(day.get(15).act, 'sleep');
  const asleep = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: T0, period: 'night', parents: { me: { x: 100, roomId: 'r1', facing: 1, sleep: true } } });
  assert.equal(asleep.get(12).act, 'pile');
  let follow = 0;
  for (let t = T0; t < T0 + 200000; t += FAM.SLOT_MS) {
    const sc = familyScene({ key: 42, members: FAMILY, rooms: ROOMS, bed: BED, t: t + 6000, period: 'night', parents: { me: { x: 300, roomId: 'r2', facing: 1 } } });
    for (const id of [12, 13, 14]) { const v = sc.get(id); if (v.act === 'follow') { follow++; assert.equal(v.roomId, 'r2'); assert.ok(v.x < 300, '親のうしろ'); } }
  }
  assert.ok(follow > 3, 'ついていく ' + follow);
});
await test('ひとこと：決定的・中身は おなか／季節／倉庫の種子／役割で変わる・ときどきだけ出る', () => {
  const pup = FAMILY[1];
  assert.match(familyLine(pup, { season: 'spring' }, 0.1), /おなか|たね|ぺこ/);
  assert.match(familyLine({ ...pup, fed: 100 }, { act: 'chase' }, 0.1), /まて|つかまえた|こっち/);
  const mate = FAMILY[0];
  assert.equal(seedTone(3), 'low'); assert.equal(seedTone(50), 'high');
  assert.match(familyLine(mate, { seeds: 3, season: 'winter' }, 0.1), /すくない|さみしい/);
  assert.match(familyLine(mate, { seeds: 80, season: 'winter' }, 0.1), /たくさん|いっぱい/);
  assert.match(familyLine(mate, { seeds: 20, season: 'winter' }, 0.95), /さむい|ふゆ/);
  assert.match(familyLine(FAMILY[4], {}, 0.2), /みみ|すなの海|すずしく/);
  assert.match(familyLine(FAMILY[5], {}, 0.2), /ただいま|住みごこち|寝床/);
  let shown = 0, n = 0;
  for (let t = T0; t < T0 + 600000; t += 1000) {
    n++;
    const b1 = familyBubble({ key: 7, m: FAMILY[0], t, ctx: { seeds: 5 } }), b2 = familyBubble({ key: 7, m: FAMILY[0], t, ctx: { seeds: 5 } });
    assert.deepEqual(b1, b2);
    if (b1) { shown++; assert.ok(t >= b1.t0 && t <= b1.t1); }
  }
  assert.ok(shown > n * 0.05 && shown < n * 0.4, '出ている割合 ' + shown / n);
});
await test('なでる：自分の家族・1 匹ごとに 90 秒あける（Household.pet）・体調 +4 は呼ぶ側', () => {
  const me = founderInd({ id: 1, name: 'はじめ', fur: 'sand', sex: 'f', seed: 3 });
  const h = new Household({ me, members: [makeInd({ id: 2, name: 'サラ', sex: 'm', genes: founderGenes('cream', 2), role: 'mate', ageMs: 5 * DAY_MS })] });
  const r1 = h.pet(2, 1000);
  assert.equal(r1.ok, true); assert.equal(r1.cond, PET.COND); assert.equal(h.find(2).pettedAt, 1000);
  const r2 = h.pet(2, 1000 + 30000);
  assert.equal(r2.ok, false); assert.equal(r2.cooldown, true); assert.match(r2.reason, /さっき/);
  assert.equal(h.pet(2, 1000 + PET.COOLDOWN_MS + 1).ok, true);
  assert.equal(h.pet(99, 0).ok, false);
  assert.equal(petBlock({ name: 'x', pettedAt: 0 }, PET.COOLDOWN_MS + 1), null);
  assert.equal(h.out().members[0].pettedAt, 1000 + PET.COOLDOWN_MS + 1, '送る形にも入る（保存される）');
});

// ───────── 近縁種 ─────────
await test('近縁種：ミミナガトビネズミはすなの海の夜にだけ出る・見た目（耳・鼻先）・なかよくなれる（ゆっくり）', () => {
  const dunes = regionMap('dunes');
  const W = new WildWorld({ map: dunes, seed: 9 });
  W.period = 'night';
  let le = 0;
  for (let i = 0; i < 200; i++) { const n = W.spawn(dunes.spawn.x, dunes.spawn.y); if (n.species === 'longear') le++; }
  assert.ok(le > 30 && le < 100, 'すなの海の夜 ' + le + '/200（約 ' + LONGEAR.RATE + '）');
  W.period = 'day';
  for (let i = 0; i < 50; i++) assert.equal(W.spawn(dunes.spawn.x, dunes.spawn.y).species, 'jerboa', '昼は出ない');
  const P = new WildWorld({ map, seed: 9 }); P.period = 'night';
  for (let i = 0; i < 50; i++) assert.equal(P.spawn(map.spawn.x, map.spawn.y).species, 'jerboa', 'ほかの土地では出ない');
  const n = W.spawn(dunes.spawn.x, dunes.spawn.y, null, 'longear');
  assert.equal(n.look.sp, 'longear'); assert.ok(lookKey(n.look).endsWith('longear'));
  assert.ok(n.traits.ear >= 0, '耳は大きめ');
  assert.equal(W.snapshot().find(q => q.id === n.id).sp, 'longear');
  // 種子：同じ種の条件（eligible）ではなく、なかまの条件（friendOk）で信頼が増える。増え方は 0.75 倍
  const a = W.offer(n.id, { id: 'p', x: n.st.x, y: n.st.y, eligible: false, friendOk: true }, 0);
  assert.equal(a.ok, true); assert.equal(a.trust, Math.round(25 * LONGEAR.GAIN));
  const b = W.offer(n.id, { id: 'q', x: n.st.x, y: n.st.y, eligible: true, friendOk: false }, 0);
  assert.equal(b.trust, 0, 'なかまになれない子（なかまが いっぱい）には増えない');
  assert.equal(lookOf({ fur: 'cream' }, { sp: 'jerboa' }).sp, undefined);
});
await test('近縁種：種の壁 — 巣へ迎えると「なかま」（つれあいにはならない・お産の予定なし・2 匹まで）・つれあいと同じ種でなければ赤ちゃんはできない', () => {
  const me = founderInd({ id: 1, name: 'はじめ', fur: 'sand', sex: 'f', seed: 3 });
  me.ageMs = 6 * DAY_MS;
  const h = new Household({ me });
  let id = 10;
  const nestData = { rooms: [{ id: 'a', kind: 'bed' }] };
  const ctx = { life: { cond: 90, hunger: 90, thirst: 90 }, season: 'spring', nestData, seeds: 30, newId: () => id++, now: 5 };
  const g = wildGenes(mulberry32(1), 'desert');
  const r = h.invite({ name: 'ルナ', genes: g, species: 'longear' }, ctx);
  assert.equal(r.ok, true); assert.equal(r.friend, true); assert.equal(r.mate.role, 'friend'); assert.equal(r.mate.species, 'longear');
  assert.equal(h.pending, null, 'お産の予定は できない'); assert.equal(h.mate, null);
  assert.match(r.note, /赤ちゃんは できない/);
  assert.equal(speciesBlock(me, r.mate), r.note);
  assert.equal(speciesBlock(me, { species: 'jerboa' }), null);
  assert.equal(h.invite({ name: 'ナガ', genes: g, species: 'longear' }, ctx).ok, true);
  assert.equal(h.invite({ name: 'シロ', genes: g, species: 'longear' }, ctx).reason, 'なかまは ' + FRIEND_MAX + ' 匹まで');
  assert.equal(friendBlock({ ageMs: 6 * DAY_MS, friends: 2 }), 'なかまは 2 匹まで'); assert.equal(friendBlock({ ageMs: 0.2 * DAY_MS, friends: 0 }), 'まだ小さい');
  // 同じ種なら つれあい → お産の予定
  const r2 = h.invite({ name: 'カイ', genes: g }, ctx);
  assert.equal(r2.ok, true); assert.equal(r2.mate.role, 'mate'); assert.ok(h.pending);
  // つれあいが ほかの種（古いデータ・改造）なら もう一度 はできない
  const h2 = new Household({ me, members: [makeInd({ id: 3, name: 'X', genes: g, role: 'mate', ageMs: 6 * DAY_MS, species: 'longear' })] });
  assert.match(h2.mateAgain(ctx).reason, /種がちがう/);
  // 時間がたっても なかまは育つだけ（出来事なし）・世代交代でも巣に残る
  const t = h.tick(2 * DAY_MS, { seeds: 0, season: 'spring', newId: () => id++ });
  assert.ok(!t.events.some(e => e.id && h.find(e.id) && h.find(e.id).role === 'friend'));
  assert.ok(SPECIES.longear.name === 'ミミナガトビネズミ');
});

// ───────── 地上の若者の足あと ─────────
await test('若者の足あと：足あとをさかのぼった所（18・34・50px）・親が止まると追いつく・捕食者が近いとかくれる・送る形', () => {
  const tr = [];
  for (let x = 0; x <= 200; x += 1) trailPush(tr, 100 + x, 300);
  assert.ok(tr.length <= FOLLOW.MAX_PTS);
  const owner = { x: 300, y: 300 };
  const s = kidSpots(tr, owner, 3);
  assert.equal(s.length, 3);
  s.forEach((q, i) => { assert.ok(Math.abs(q.y - 300) < 0.01); assert.ok(Math.abs((owner.x - q.x) - (FOLLOW.GAP0 + i * FOLLOW.GAP)) < 2.5, '距離 ' + (owner.x - q.x)); assert.equal(q.dir, 'right'); });
  // 曲がり道：L 字に歩いた跡の上にいる
  const t2 = [];
  for (let y = 0; y <= 60; y++) trailPush(t2, 50, 100 + y);
  for (let x = 0; x <= 30; x++) trailPush(t2, 50 + x, 160);
  const k = kidSpots(t2, { x: 80, y: 160 }, 3);
  assert.ok(Math.abs(k[2].x - 50) < 2 && k[2].y < 160 && k[2].y > 135, '角を曲がった先: ' + JSON.stringify(k[2]));
  assert.deepEqual(unpackSpots(packSpots(k)).map(q => [q.x, q.y]), k.map(q => [q.x, q.y]));
  assert.equal(kidsHidden([{ x: 400, y: 300, state: 'stalk' }], owner), true);
  assert.equal(kidsHidden([{ x: 600, y: 300, state: 'stalk' }], owner), false);
  assert.equal(kidsHidden([{ x: 310, y: 300, state: 'leave' }], owner), false, '帰っていく捕食者は数えない');
  assert.equal(kidSpots([], owner, 1)[0].x, 290, '足あとが無ければ少し後ろ');
});

// ───────── 家系図の書き出し ─────────
const LIN = [
  { id: 1, name: 'はじめ', sex: 'f', generation: 1, role: 'ancestor', stage: 'elder', ageMs: 30 * DAY_MS, traits: { fur: 'cream', ear: 0.5 } },
  { id: 2, name: 'サラ', sex: 'm', generation: 1, role: 'ancestor', stage: 'adult', wild: true, ageMs: 9 * DAY_MS, traits: { fur: 'sand', pied: true } },
  { id: 3, name: 'ポポ', sex: 'f', generation: 2, mother_id: 1, father_id: 2, role: 'player', stage: 'adult', ageMs: 6 * DAY_MS, traits: { fur: 'sand', leg: 0.6 } },
  { id: 4, name: 'チロ', sex: 'm', generation: 2, mother_id: 1, father_id: 2, role: 'left', stage: 'adult', ageMs: 6 * DAY_MS, traits: { fur: 'white' } },
  { id: 5, name: 'ミミ', sex: 'f', generation: 3, mother_id: 3, father_id: 6, role: 'pup', stage: 'pup', ageMs: 0.5 * DAY_MS, traits: { fur: 'sand' } },
  { id: 6, name: 'カイ', sex: 'm', generation: 1, role: 'mate', stage: 'adult', wild: true, ageMs: 7 * DAY_MS, traits: { fur: 'rufous' } },
  { id: 7, name: 'ルナ', sex: 'f', generation: 1, role: 'friend', species: 'longear', stage: 'adult', ageMs: 7 * DAY_MS, traits: { fur: 'cream' } },
];
await test('家系図の書き出し：配置（札が重ならない・画面の家系図と同じ並び・なかまは入れない・大きさの上限）・文字のまとめ', () => {
  const L = lineageExportLayout(LIN, 3, { owner: 'ポポ', date: '2026-10-14' });
  assert.equal(L.cards.length, 6, 'なかま（ほかの種）は家系図に入れない');
  assert.equal(L.title, 'ポポの家系図'); assert.match(L.sub, /6 匹・3 代/); assert.match(L.foot, /2026-10-14/);
  for (const a of L.cards) for (const b of L.cards) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= a.w || Math.abs(a.y - b.y) >= a.h, '重ならない ' + a.name + '/' + b.name);
  for (const c of L.cards) { assert.ok(c.x >= 0 && c.y >= 0 && c.x + c.w <= L.w && c.y + c.h <= L.h, '画像の中: ' + c.name); }
  assert.ok(L.cards.find(c => c.id === 3).cur); assert.ok(L.cards.find(c => c.id === 1).faded);
  assert.equal(L.cards.find(c => c.id === 3).line1, '2 代目・いまの子');
  assert.ok(L.cards.find(c => c.id === 2).chips.some(t => t.text === '斑'));
  assert.ok(L.lines.some(l => l.kind === 'pair') && L.lines.some(l => l.kind === 'parent'));
  const g1 = L.cards.find(c => c.id === 1).y, g2 = L.cards.find(c => c.id === 3).y, g3 = L.cards.find(c => c.id === 5).y;
  assert.ok(g1 < g2 && g2 < g3, '世代ごとに下へ');
  // 画面の家系図と同じ並び（左右の順）
  const S = layoutLineage(LIN.filter(n => n.role !== 'friend'));
  const order = ids => ids.sort((a, b) => S.pos.get(String(a)).x - S.pos.get(String(b)).x);
  const ord2 = ids => ids.sort((a, b) => L.cards.find(c => c.id === a).x - L.cards.find(c => c.id === b).x);
  assert.deepEqual(order([1, 2]), ord2([1, 2])); assert.deepEqual(order([3, 4, 6]), ord2([3, 4, 6]));
  // 大きな家（100 匹）でも 4096px に収める
  const big = [];
  for (let i = 1; i <= 100; i++) big.push({ id: i, name: 'N' + i, sex: i % 2 ? 'f' : 'm', generation: 1 + Math.floor(i / 25), role: 'ancestor', stage: 'adult', traits: { fur: 'sand' } });
  const B = lineageExportLayout(big, 1);
  assert.ok(B.w * B.scale <= 4096.5 && B.h * B.scale <= 4096.5);
  const txt = lineageText(LIN, 3, { owner: 'ポポ', date: '2026-10-14' });
  assert.match(txt, /^【ポポの家系図】6 匹・3 代（2026-10-14）/);
  assert.match(txt, /― 2 代目 ―/); assert.match(txt, /★ ポポ♀（いまの子・おとな） 親：はじめ・サラ/);
  assert.match(txt, /サラ♂.*野生の生まれ.*斑/);
  assert.ok(!/ルナ/.test(txt), 'なかまは入れない');
});

// ───────── 巣めぐり（順位なし）─────────
await test('巣めぐり：順位・点数はつけない・最近手を入れた巣を少し＋混ぜて選ぶ・同じ子と同じ時間の枠なら同じ・枠が変わると入れかわる', () => {
  const room = (n) => ({ rooms: Array.from({ length: n }, (_, i) => ({ id: 'r' + i, kind: i === 0 ? 'bed' : 'store' })), objects: [{ type: 'lamp' }, { type: 'curio', item: 'shell' }] });
  const now = 1_760_000_000_000;
  const cands = Array.from({ length: 20 }, (_, i) => ({ nestId: i + 1, name: 'N' + i, region: 'plains', data: room(1 + (i % 4)), updatedAt: i < 3 ? now - 1000 : 0, policy: 'public', x: i, y: i }));
  const a = pickTour(cands, { viewer: 7, now }), b = pickTour([...cands].reverse(), { viewer: 7, now: now + 1000 });
  assert.equal(a.length, TOUR.MAX); assert.deepEqual(a.map(x => x.nestId), b.map(x => x.nestId), '同じ枠なら同じ');
  assert.ok(a.filter(x => x.recent).length >= 1 && a.filter(x => x.recent).length <= TOUR.RECENT);
  for (const x of a) { assert.ok(!('rank' in x) && !('score' in x) && !('gain' in x)); assert.match(x.desc, /巣（部屋 \d/); }
  assert.ok(a.some(x => /最近 手を入れた/.test(x.desc)));
  const seen = new Set();
  for (let k = 0; k < 8; k++) for (const x of pickTour(cands, { viewer: 7, now: now + k * TOUR.SLOT_MS })) seen.add(x.nestId);
  assert.ok(seen.size >= 12, 'ときどき入れかわる（' + seen.size + '）');
  assert.notDeepEqual(pickTour(cands, { viewer: 8, now }).map(x => x.nestId), a.map(x => x.nestId), '見る子によって ちがう');
  assert.deepEqual(pickTour([], { viewer: 1, now }), []);
});

// ───────── 富山の季節 ─────────
await test('富山の季節：秋は刈り株の田とはさ掛け・冬は雪の灯り・バス停（2 つめの文）・白い影は季節ごとの所に遠くからだけ・季節の品', () => {
  const ty = regionMap('toyama');
  for (const se of ['spring', 'summer', 'autumn', 'winter']) {
    const ps = toyamaSeasonProps(se);
    assert.ok(ps.some(p => p.kind === 'busstop' && /７：４４/.test(p.text)), 'バス停 ' + se);
    for (const p of ps) { const tx = Math.floor(p.x / 16), ty2 = Math.floor((p.y - 6) / 16); assert.ok(tx >= 0 && ty2 >= TOYAMA.MOUNT_ROWS && tx < ty.w && ty2 < ty.h, p.kind + ' は地図の中'); }
    assert.ok(!/だんのうら|境界事象|わかば/.test(ps.map(p => p.text).join('')), '他作品の名前は出さない');
  }
  assert.ok(toyamaSeasonProps('autumn').filter(p => p.kind === 'hasa').length >= 2);
  assert.ok(toyamaSeasonProps('winter').filter(p => p.kind === 'lantern').length >= 2);
  assert.equal(toyamaSeasonProps('spring').length, 1);
  assert.equal(paddyHarvested('autumn', TOYAMA.PADDY.x0), true); assert.equal(paddyHarvested('autumn', TOYAMA.PADDY.x1 - 1), false); assert.equal(paddyHarvested('summer', TOYAMA.PADDY.x0), false);
  const sp = new Set(Object.values(GLIMPSE_SPOTS).map(p => p.x + ',' + p.y));
  assert.equal(sp.size, 4, '季節ごとに ちがう所');
  const w = GLIMPSE_SPOTS.winter;
  assert.equal(glimpseSpot('winter', 'night', w.x + 200, w.y), w, '遠くから見えている');
  assert.equal(glimpseSpot('winter', 'night', w.x + 20, w.y), null, '近いと出ない');
  assert.equal(glimpseSpot('winter', 'day', w.x + 200, w.y), null, '夜だけ');
  assert.match(shrineText('小さな祠。', 'winter'), /しめ縄に 雪/);
  assert.ok(boxFree(ty, TOYAMA_BUSSTOP.x, TOYAMA_BUSSTOP.y + 4));
  assert.equal(CURIO_ORDER.length, 20);
  assert.ok(curioEligible(CURIOS.rice_ear, 'toyama', { season: 'autumn', period: 'night', weather: 'clear' }));
  assert.ok(!curioEligible(CURIOS.rice_ear, 'toyama', { season: 'winter', period: 'night', weather: 'clear' }));
  assert.ok(curioEligible(CURIOS.candle_stub, 'toyama', { season: 'winter', period: 'night', weather: 'snow' }));
  assert.ok(!curioEligible(CURIOS.candle_stub, 'toyama', { season: 'winter', period: 'day', weather: 'snow' }));
});

// ───────── オフライン ─────────
const NIGHT = DAY_MS * 1_200_000 + 23 * HOUR_MS, NOON = DAY_MS * 1_200_000 + 12 * HOUR_MS;
async function offline({ t = NIGHT, ls = makeLS(), npc = true } = {}) {
  const clock = { t };
  const n = new OfflineBackend({ storage: ls, now: () => clock.t, npc, map, random: () => 0.37, env: true, predators: 'off', weather: 'clear', season: 'spring', wild: false });
  await n.login('local'); await n.createCharacter({ name: 'はじめ', fur: 'cream', sex: 'f' }); await n.joinField();
  const events = [];
  for (const ev of ['toast', 'residents', 'npc_gift', 'family', 'life', 'achievement']) n.on(ev, m => events.push({ ev, ...m }));
  return { n, ls, clock, events };
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
async function readyNest(G) {
  const spot = digSpot(G.n);
  G.n.auth = makeFieldState(spot.x, spot.y);
  addItem(G.n.save.player.inv, 'grass', 20); addItem(G.n.save.player.inv, 'pebble', 10);
  const d = await G.n.digBurrow(); assert.ok(d.ok, d.reason);
  const rec = G.n.save.nests[G.n.save.player.nestId];
  const r = await G.n.nestOp(rec.id, rec.rev, { op: 'set-kind', id: rec.data.rooms[0].id, kind: 'bed' }); assert.ok(r.ok, r.reason);
  return rec;
}
function tick(G, secs) { for (let i = 0; i < secs * 20; i++) { G.clock.t += 50; G.n.tick(0.05); } }
await test('オフラインの共同巣：フレンドの NPC を誘う（巣が要る・フレンドだけ・3 匹まで）→ 巣で暮らす・夜に種子を持ってくる・外す・実績', async () => {
  const G = await offline();
  const { n } = G;
  assert.match((await n.residentInvite('ナッツ')).reason, /巣が無い/);
  const rec = await readyNest(G);
  assert.match((await n.residentInvite('ナッツ')).reason, /フレンドだけ/);
  assert.match((await n.residentInvite('だれか')).reason, /見つからない/);
  for (const f of ['npc_nuts', 'npc_moka', 'npc_riko']) n.save.friends.push({ id: f, state: 'friend', at: 0 });
  const info0 = await n.residents();
  assert.equal(info0.npc, true); assert.equal(info0.candidates.length, 3);
  const r = await n.residentInvite('ナッツ');
  assert.equal(r.ok, true, r.reason); assert.deepEqual(r.mine.residents.map(x => x.name), ['ナッツ']);
  assert.ok(G.events.some(e => e.ev === 'achievement' && e.id === 'together'));
  assert.match((await n.residentInvite('ナッツ')).reason, /もう いっしょに/);
  assert.equal((await n.residentInvite('モカ')).ok, true); assert.equal((await n.residentInvite('リコ')).ok, true);
  assert.equal((await n.residents()).mine.residents.length, 3);
  // 巣に入ると住人が見える（家族のしぐさの members の形）
  const ent = n._entrances().find(e => e.own);
  n.auth = makeFieldState(ent.x, ent.y + 4);
  const e = await n.enterNest(n.save.account.id);
  assert.equal(e.ok, true, e.reason);
  assert.deepEqual(e.nest.npcResidents.map(m => m.name), ['ナッツ', 'モカ', 'リコ']); assert.ok(e.nest.npcResidents.every(m => m.npc && m.stage === 'adult'));
  assert.equal(e.nest.residents.length, 3);
  // 夜：世界の 3 時間ごとに 1〜2 つ
  const before = countItem(rec.storage, 'seed');
  tick(G, NPC_SEED.EVERY_MS / 1000 + 2);
  const after = countItem(rec.storage, 'seed');
  assert.ok(after - before >= 1 && after - before <= 2, '種子 ' + before + '→' + after);
  assert.ok(G.events.some(x => x.ev === 'npc_gift' && x.n === after - before));
  // 昼は持ってこない
  G.clock.t = NOON + DAY_MS; n.npcSeedT = 0;
  const b2 = countItem(rec.storage, 'seed');
  tick(G, 2);
  assert.equal(countItem(rec.storage, 'seed'), b2);
  // 外す・保存して読み直しても残る
  const rm = await n.residentRemove('npc_moka');
  assert.equal(rm.ok, true); assert.equal(rm.mine.residents.length, 2);
  n.flush();
  const n2 = new OfflineBackend({ storage: G.ls, now: () => G.clock.t, npc: true, map, wild: false });
  assert.deepEqual(n2.save.npcResidents.map(x => x.id), ['npc_nuts', 'npc_riko']);
  assert.match((await n.residentAnswer()).reason, /オフライン/);
});
await test('オフライン：家族をなでる（自分の巣の中で・体調 +4・90 秒あける）・dev で家族を作る・家系図になかまは入らない', async () => {
  const G = await offline();
  const { n } = G;
  await readyNest(G);
  const dv = await n.dev({ family: { mate: 1, pups: 3, young: 1, friend: 1 } });
  assert.equal(dv.family.members.length, 6);
  assert.equal(dv.family.members.find(m => m.role === 'friend').species, 'longear');
  const pup = dv.family.members.find(m => m.role === 'pup');
  assert.match((await n.petFamily(pup.id)).reason, /自分の巣の中/);
  const ent = n._entrances().find(e => e.own);
  n.auth = makeFieldState(ent.x, ent.y + 4);
  assert.equal((await n.enterNest(n.save.account.id)).ok, true);
  n.save.player.life.cond = 50;
  const r = await n.petFamily(pup.id);
  assert.equal(r.ok, true, r.reason); assert.equal(r.life.cond, 54); assert.ok(r.member.pettedAt);
  assert.match((await n.petFamily(pup.id)).reason, /さっき/);
  G.clock.t += PET.COOLDOWN_MS + 10;
  assert.equal((await n.petFamily(pup.id)).ok, true);
  const lin = await n.lineage();
  assert.ok(!lin.nodes.some(x => x.role === 'friend'));
  assert.ok(lin.nodes.some(x => x.role === 'mate'));
  const txt = lineageText(lin.nodes, lin.current, { owner: 'はじめ' });
  assert.match(txt, /はじめの家系図/);
});
await test('オフライン：巣めぐり — たずねられる NPC の巣だけ（モカ・フレンドならリコ）・自分の巣は出ない・順位なし', async () => {
  const G = await offline();
  const { n } = G;
  await readyNest(G);
  let r = await n.nestTour();
  assert.deepEqual(r.list.map(x => x.name), ['モカ']);
  n.save.friends.push({ id: 'npc_riko', state: 'friend', at: 0 });
  r = await n.nestTour();
  assert.deepEqual(r.list.map(x => x.name).sort(), ['モカ', 'リコ'].sort());
  assert.ok(r.list.find(x => x.name === 'リコ').friend);
  assert.ok(r.list.every(x => x.desc && !('rank' in x) && !('score' in x)));
  assert.deepEqual((await n.ranking()).list.map(x => x.name).sort(), r.list.map(x => x.name).sort(), '前の名前（ranking）は別名');
});
await test('オフライン：セーブの移行 v5 → v6（NPC の住人の入れ物。家族・持ち物はそのまま）', async () => {
  const G = await offline();
  const s = JSON.parse(JSON.stringify(G.n.save));
  s.v = 5; delete s.npcResidents;
  s.house.members = [{ ...makeInd({ id: 9, name: 'ポポ', genes: founderGenes('sand', 1), role: 'pup', ageMs: DAY_MS }), species: 'jerboa' }];
  const ls = makeLS({ [SAVE_KEY]: JSON.stringify(s), dannoura_save: 'keep' });
  const n2 = new OfflineBackend({ storage: ls, now: () => G.clock.t, npc: true, map, wild: false });
  assert.ok(SAVE_VERSION >= 6); assert.equal(n2.save.v, SAVE_VERSION);   // Ver.0.7 からは v7 まで続けて移す
  assert.deepEqual(n2.save.npcResidents, []); assert.equal(n2.save.rank, undefined, '順位の記録は持たない');
  assert.equal(n2.save.house.members[0].species, undefined, 'トビネズミは書かない');
  assert.equal(n2.house.members[0].name, 'ポポ');
  n2.flush();
  assert.equal(JSON.parse(ls.getItem(SAVE_KEY)).v, SAVE_VERSION); assert.equal(ls.getItem('dannoura_save'), 'keep');
});

// ───────── 入口の守り（server/security.js）─────────
await test('入口の守り：Origin の許可リスト（空はだれでも・同じホスト・*.github.io・null・strict）・IP ごとの上限・プロキシの IP・本番の確かめ', () => {
  const allow = parseOrigins('https://me.github.io/, https://*.example.org');
  assert.deepEqual(allow, ['https://me.github.io', 'https://*.example.org']);
  assert.equal(checkOrigin('https://me.github.io', 'x.fly.dev', allow).ok, true);
  assert.equal(checkOrigin('https://ME.github.io/', 'x.fly.dev', allow).ok, true);
  assert.equal(checkOrigin('https://evil.github.io', 'x.fly.dev', allow).ok, false);
  assert.equal(checkOrigin('https://a.example.org', 'x', allow).ok, true);
  assert.equal(checkOrigin('https://a.b.example.org', 'x', allow).ok, false, 'ワイルドカードは 1 段だけ');
  assert.equal(checkOrigin('http://a.example.org', 'x', allow).ok, false, 'http と https はちがう');
  assert.equal(checkOrigin('https://x.fly.dev', 'x.fly.dev', allow).ok, true, 'サーバー自身が配ったページ');
  assert.equal(checkOrigin('null', 'x', allow).ok, false);
  assert.equal(checkOrigin(undefined, 'x', allow).ok, true); assert.equal(checkOrigin(undefined, 'x', allow, { strict: true }).ok, false);
  assert.equal(checkOrigin('https://anything', 'x', []).ok, true, '空はだれでも（ローカル）');
  const L = new IpLimiter({ connPerIp: 2, connPerMin: 3, msgPerSec: 5 });
  assert.equal(L.tryConnect('1.1.1.1', 0).ok, true); assert.equal(L.tryConnect('1.1.1.1', 0).ok, true);
  assert.equal(L.tryConnect('1.1.1.1', 0).reason, 'too-many-connections');
  assert.equal(L.tryConnect('2.2.2.2', 0).ok, true, 'ほかの IP は別');
  L.release('1.1.1.1');
  assert.equal(L.tryConnect('1.1.1.1', 10).ok, true);
  L.release('1.1.1.1');
  assert.equal(L.tryConnect('1.1.1.1', 20).reason, 'too-many-attempts', '1 分に 3 回まで');
  assert.equal(L.tryConnect('1.1.1.1', 61000).ok, true, '1 分たてば');
  let ok = 0;
  for (let i = 0; i < 20; i++) if (L.tryMessage('3.3.3.3', 1000)) ok++;
  assert.equal(ok, 5); assert.equal(L.tryMessage('3.3.3.3', 1100), false); assert.equal(L.tryMessage('3.3.3.3', 1300), true, '少したてば戻る');
  const req = { headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1', 'fly-client-ip': '8.8.8.8' }, socket: { remoteAddress: '::ffff:127.0.0.1' } };
  assert.equal(clientIp(req, false), '127.0.0.1'); assert.equal(clientIp(req, true), '8.8.8.8');
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }, socket: {} }, true), '9.9.9.9');
  assert.deepEqual(productionCheck({ TOBI_DEV: '1' }).errors, [], '本番でなければ何も言わない');
  assert.equal(productionCheck({ NODE_ENV: 'production', TOBI_DEV: '1' }).errors.length, 1);
  assert.equal(productionCheck({ NODE_ENV: 'production', TOBI_ORIGIN: 'https://me.github.io', TOBI_TRUST_PROXY: '1' }).warnings.length, 0);
  const sec = securityFromEnv({ TOBI_ORIGIN: 'https://me.github.io', TOBI_MAX_CONN_PER_IP: '3', TOBI_TRUST_PROXY: '1' });
  assert.equal(sec.msgPerIp, 0, 'ローカルは書かなければ切ってある');
  const prod = securityFromEnv({ NODE_ENV: 'production' });
  assert.equal(prod.connPerIp, 6); assert.equal(prod.msgPerIp, 300); assert.equal(prod.connPerMin, 30);
  assert.deepEqual(sec.origins, ['https://me.github.io']); assert.equal(sec.connPerIp, 3); assert.equal(sec.trustProxy, true); assert.equal(sec.maxPayload, 16384);
});
void stageOf;

console.log(`\ntobinezumi-v06: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
