// フェーズ3：v3 移行・部屋/庭の拡張・季節と天候・雨の自動水やり・パーティクルの上限・外観/内装の保存・写真のファイル名
// node:vm に家のロジック（catalog/state/placement/crafting/editor/expansion/seasons/photo/memories）を読み込む（DOM なし）
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['main/home/catalog.js', 'main/home/state.js', 'main/home/placement.js', 'main/home/crafting.js', 'main/home/renderer.js', 'main/home/editor.js',
  'main/home/expansion.js', 'main/home/seasons.js', 'main/home/photo.js', 'main/memories.js'];

function makeSandbox(gsInit, extra) {
  const calls = { save: 0, toasts: [] };
  const ctx = Object.assign({
    console,
    gs: Object.assign({ day: 1, hour: 22, min: 0, mental: 50, fatigue: 10, money: 12400 }, gsInit || {}),
    advTime() {},
    saveGame() { calls.save++; return true; },
  }, extra || {});
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  ctx.HOME.ui = { say: () => Promise.resolve(), choice: () => Promise.resolve(0), prompt: (l, d) => Promise.resolve(d), toast: t => calls.toasts.push(t) };
  return { ctx, H: ctx.HOME, calls, run: c => vm.runInContext(c, ctx) };
}
const J = o => JSON.parse(JSON.stringify(o));
// 保存→読込（JSON を通して gs.homeData を差し替え、ensure で修復）
function reload(S) { S.ctx.gs.homeData = J(S.ctx.gs.homeData); return S.H.ensure(); }

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log('home-phase3');

// ── 移行 ──
function v2Save(S) {
  const hd = J(S.H._fresh());
  hd.version = 2;
  delete hd.expanded; delete hd.exterior; delete hd.weatherSeed; delete hd.room.wallpaper;
  return hd;
}
test('v2 → v3：拡張なし・外観/内装/天候シードの初期値が入り、配置は変わらない', () => {
  const S = makeSandbox();
  const v2 = v2Save(S);
  S.ctx.gs.homeData = J(v2);
  const hd = S.H.ensure();
  assert.equal(hd.version, 3);
  assert.deepEqual(J(hd.expanded), { room: false, garden: false });
  assert.deepEqual(J(hd.exterior), { roof: 'navy', wall: 'cream', door: 'wood' });
  assert.equal(hd.room.wallpaper, 'lavender');
  assert.equal(hd.room.floorId, 'floor.wood');
  assert.ok(Number.isInteger(hd.weatherSeed));
  assert.equal(hd.room.width, 12); assert.equal(hd.room.height, 8);
  assert.equal(hd.garden.width, 16); assert.equal(hd.garden.height, 12);
  assert.deepEqual(J(hd.room.placements), v2.room.placements);
  assert.deepEqual(J(hd.garden.placements), v2.garden.placements);
});
test('移行は何度呼んでも同じ（冪等）', () => {
  const S = makeSandbox();
  S.ctx.gs.homeData = v2Save(S);
  const a = J(S.H.ensure());
  const b = J(S.H.ensure());
  const c = J(reload(S));
  assert.deepEqual(b, a); assert.deepEqual(c, a);
});
test('v1 のセーブも読める（v1 → v3）', () => {
  const S = makeSandbox();
  const v1 = v2Save(S); v1.version = 1; delete v1.flags.v2Items; delete v1.bonds; delete v1.life;
  S.ctx.gs.homeData = v1;
  const hd = S.H.ensure();
  assert.equal(hd.version, 3);
  assert.equal(hd.flags.v2Items, true);
  assert.equal(hd.expanded.room, false);
  assert.ok(hd.room.placements.length > 0);
});
test('外観・内装のおかしい値は初期値に戻る', () => {
  const S = makeSandbox();
  const hd = S.H.ensure();
  hd.exterior = { roof: 'pink', wall: 'white', door: 3 }; hd.room.wallpaper = '<b>'; hd.room.floorId = 'floor.lava';
  const r = reload(S);
  assert.deepEqual(J(r.exterior), { roof: 'navy', wall: 'white', door: 'wood' });
  assert.equal(r.room.wallpaper, 'lavender');
  assert.equal(r.room.floorId, 'floor.wood');
});

// ── 拡張 ──
test('拡張：お金・素材が足りなければ何も払わずに断る', () => {
  const S = makeSandbox({ money: 100 });
  const hd = S.H.ensure();
  const before = J({ m: hd.materials, money: S.ctx.gs.money });
  const r = S.H.expand('room');
  assert.equal(r.ok, false);
  assert.match(r.reason, /足りません/);
  assert.deepEqual(J({ m: hd.materials, money: S.ctx.gs.money }), before);
  assert.equal(hd.expanded.room, false);
  assert.equal(S.H.AREAS.room.w, 12);
});
test('拡張：部屋 12×8→14×9、一回だけ・一回分だけ払う。配置はそのまま、出入口は新しい下端', () => {
  const S = makeSandbox({ money: 50000 });
  const hd = S.H.ensure();
  S.H.addMaterial('wood', 10); S.H.addMaterial('metal', 4);
  const P0 = J(hd.room.placements);
  const m0 = J(hd.materials), price = S.H.BAL.expand.room;
  const r = S.H.expand('room');
  assert.equal(r.ok, true, r.reason);
  assert.equal(S.ctx.gs.money, 50000 - price.money);
  Object.keys(price.mats).forEach(k => assert.equal(hd.materials[k], m0[k] - price.mats[k]));
  assert.deepEqual([S.H.AREAS.room.w, S.H.AREAS.room.h], [14, 9]);
  assert.deepEqual(J(S.H.AREAS.room.door), { x: 7, y: 8 });
  assert.deepEqual([hd.room.width, hd.room.height], [14, 9]);
  assert.deepEqual(J(hd.room.placements), P0);
  assert.equal(S.H.reachable('room', hd.room.placements).ok, true);
  // 二回目は断る・払わない
  const money1 = S.ctx.gs.money, m1 = J(hd.materials);
  const r2 = S.H.expand('room');
  assert.equal(r2.ok, false);
  assert.equal(S.ctx.gs.money, money1);
  assert.deepEqual(J(hd.materials), m1);
  assert.equal(S.H.expandInfo('room').done, true);
});
test('拡張：庭 16×12→20×14。戸口と門は同じ位置で、戸口から門へ通れる', () => {
  const S = makeSandbox({ money: 50000 });
  const hd = S.H.ensure();
  S.H.addMaterial('wood', 10); S.H.addMaterial('cloth', 4);
  const P0 = J(hd.garden.placements);
  assert.equal(S.H.expand('garden').ok, true);
  assert.deepEqual([S.H.AREAS.garden.w, S.H.AREAS.garden.h], [20, 14]);
  assert.deepEqual(J(S.H.AREAS.garden.door), { x: 7, y: 0 });
  assert.deepEqual(J(S.H.AREAS.garden.gate), { x: 0, y: 6 });
  assert.deepEqual(J(hd.garden.placements), P0);
  assert.equal(S.H.reachable('garden', hd.garden.placements).ok, true);
  assert.equal(S.H.AREAS.room.w, 12, '部屋は広がらない');
});
test('拡張：広げた場所に置いた家具は、保存・読込のあとも残る（縮まない）', () => {
  const S = makeSandbox({ money: 50000 });
  const hd = S.H.ensure();
  S.H.addMaterial('wood', 20); S.H.addMaterial('metal', 4); S.H.addMaterial('cloth', 4);
  assert.equal(S.H.expand('room').ok, true);
  assert.equal(S.H.expand('garden').ok, true);
  // 新しい列・行に置く
  const D = S.H.createDraft({ room: hd.room.placements, garden: hd.garden.placements }, { owned: (i, v) => S.H.owned(i, v), seq: hd.seq });
  assert.equal(D.place('room', { itemId: 'furniture.wood_chair', x: 13, y: 7, rotation: 0 }).ok, true);
  assert.equal(D.place('garden', { itemId: 'garden.bench', x: 18, y: 12, rotation: 0 }).ok, true);
  const res = D.result(); hd.room.placements = res.room; hd.garden.placements = res.garden;
  let r = reload(S);
  assert.ok(r.room.placements.some(P => P.x === 13 && P.y === 7));
  assert.ok(r.garden.placements.some(P => P.x === 18 && P.y === 12));
  // 印が壊れても、保存された広さが拡張後なら縮めない
  r.expanded = { room: 'yes' };
  r = reload(S);
  assert.deepEqual(J(r.expanded), { room: true, garden: true });
  assert.ok(r.room.placements.some(P => P.x === 13 && P.y === 7));
  assert.equal(S.H.AREAS.room.w, 14);
});
test('拡張：別のセーブ（未拡張）に差し替えると広さも戻る', () => {
  const S = makeSandbox({ money: 50000 });
  S.H.ensure(); S.H.addMaterial('wood', 10); S.H.addMaterial('metal', 4);
  assert.equal(S.H.expand('room').ok, true);
  S.ctx.gs.homeData = J(S.H._fresh());
  S.H.ensure();
  assert.equal(S.H.AREAS.room.w, 12);
});

// ── 季節・天候 ──
test('季節：本編は 1〜22日 夏・23日〜 初秋、暮らしモードは 15日ごとに 夏→秋→冬→春', () => {
  const S = makeSandbox();
  S.H.ensure();
  for (let d = 1; d <= 22; d++) { S.ctx.gs.day = d; assert.equal(S.H.season(), 'summer', 'day ' + d); }
  for (let d = 23; d <= 30; d++) { S.ctx.gs.day = d; assert.equal(S.H.season(), 'autumn'); }
  S.ctx.gs.day = 25; assert.match(S.H.seasonLabel(), /^初秋・/);
  const hd = S.H.data();
  hd.life = { active: true, day: 0, startedFrom: 'normal', baseDay: 30 };
  const exp = ['summer', 'autumn', 'winter', 'spring', 'summer'];
  for (let L = 0; L < 75; L++) { hd.life.day = L; S.ctx.gs.day = 30 + L; assert.equal(S.H.season(), exp[Math.floor(L / 15)], 'life ' + L); }
  assert.equal(S.H.seasonOf({ life: true, lifeDay: 44 }), 'winter');
  assert.equal(S.H.seasonOf({ day: 3 }), 'summer');
});
test('天候：日ごとに決まる（同じ日なら同じ・読み直しても同じ）。雪は冬だけ。1日目は晴れ', () => {
  const S = makeSandbox();
  S.H.ensure();
  S.ctx.gs.day = 1; assert.equal(S.H.weather(), 'clear');
  const seen = {};
  for (let d = 1; d <= 400; d++) {
    S.ctx.gs.day = d;
    const w = S.H.weather();
    assert.equal(S.H.weather(), w);
    assert.equal(S.H.weather(d), w);
    assert.notEqual(w, 'snow', '本編（夏・初秋）に雪は降らない');
    seen[w] = 1;
  }
  assert.ok(seen.clear && seen.cloudy && seen.rain, 'いろいろな天気がある');
  const a = []; for (let d = 2; d < 40; d++) a.push(S.H.weatherOf(d, 'summer', 7));
  const S2 = makeSandbox(); S2.H.ensure();
  const b = []; for (let d = 2; d < 40; d++) b.push(S2.H.weatherOf(d, 'summer', 7));
  assert.deepEqual(a, b);
  // 冬だけ雪
  let snow = 0; for (let d = 2; d < 300; d++) { const w = S.H.weatherOf(d, 'winter', 7); if (w === 'snow') snow++; assert.ok(['clear', 'cloudy', 'rain', 'snow'].includes(w)); }
  assert.ok(snow > 20);
  for (const s of ['summer', 'autumn', 'spring']) for (let d = 2; d < 300; d++) assert.notEqual(S.H.weatherOf(d, s, 7), 'snow');
  // 暮らしモードの日でも決まる
  const hd = S.H.data(); hd.life = { active: true, day: 33, startedFrom: 'normal', baseDay: 30 }; S.ctx.gs.day = 63;
  assert.equal(S.H.season(), 'winter');
  const w1 = S.H.weather(); assert.equal(reload(S) && S.H.weather(), w1);
});
const rainyDay = H => { for (let d = 2; d < 200; d++) if (H.weather(d) === 'rain') return d; return -1; };
test('雨の日は植えたものが自動で水やり済み（水やり不要）', () => {
  const S = makeSandbox();
  const hd = S.H.ensure();
  const pot = hd.garden.placements[0].instanceId;
  S.ctx.gs.day = 2;
  S.H.plant(pot, { name: 'ひなた' });
  const d = rainyDay(S.H); assert.ok(d > 2);
  S.ctx.gs.day = d;
  assert.equal(S.H.wateredToday(pot), true);
  assert.equal(S.H.water(pot), false, '雨の日はじょうろの水やりは要らない');
  assert.equal(hd.plants[pot].lastWateredDay, d);
  // 日送りの成長でも水やり済みとして育つ
  const p = hd.plants[pot]; p.lastWateredDay = 0; p.growth = 0;
  S.ctx.gs.day = d; hd.flags.plantTick = 0;
  assert.equal(S.H.tickDay(), true);
  assert.equal(p.lastWateredDay, d);
  assert.ok(p.growth >= 1 || p.stage >= 1);
  // 晴れの日は自動では水やりされない
  let dry = 2; while (S.H.weather(dry) === 'rain') dry++;
  S.ctx.gs.day = dry; p.lastWateredDay = 0;
  assert.equal(S.H.applyRain(), 0);
  assert.equal(S.H.wateredToday(pot), false);
});
test('冬は育ちがゆっくり（枯れない）', () => {
  const grow = (season) => {
    const S = makeSandbox();
    const hd = S.H.ensure();
    if (season === 'winter') hd.life = { active: true, day: 30, startedFrom: 'normal', baseDay: 30 };
    const base = season === 'winter' ? 60 : 2;
    const pot = hd.garden.placements[0].instanceId;
    S.ctx.gs.day = base; S.H.plant(pot, { name: 'x' });
    let total = 0;
    for (let i = 1; i <= 10; i++) {
      S.ctx.gs.day = base + i; if (hd.life.active) hd.life.day = 30 + i;
      hd.plants[pot].lastWateredDay = S.ctx.gs.day;
      S.H.tickDay();
    }
    const p = hd.plants[pot]; total = p.stage * S.H.BAL.growPerStage + p.growth;
    return total;
  };
  const s = grow('summer'), w = grow('winter');
  assert.ok(w > 0 && w < s, `winter ${w} < summer ${s}`);
});

// ── パーティクル ──
const fakeCtx = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (() => {})), set: (t, k, v) => { t[k] = v; return true; } });
test('パーティクルは最大60個（雨・雪・落ち葉・蛍・花びら）', () => {
  const S = makeSandbox();
  S.H.ensure();
  const L = S.H.layout('garden', 32);
  const conds = [['summer', 'rain', false], ['winter', 'snow', false], ['autumn', 'clear', false], ['summer', 'clear', true], ['spring', 'clear', false], ['spring', 'cloudy', false], ['winter', 'cloudy', true]];
  for (const [season, weather, night] of conds) {
    let max = 0;
    for (let i = 0; i < 120; i++) max = Math.max(max, S.H.seasons.drawParticles(fakeCtx(), 'garden', L, { season, weather, night, t: i / 30 }));
    assert.ok(max > 0, `${season}/${weather} で何か降る`);
    assert.ok(max <= 60 && S.H.seasons.count() <= 60, `${season}/${weather}: ${max}`);
  }
  // 夏の昼・晴れは何も出ない
  S.H.seasons.clear();
  assert.equal(S.H.seasons.drawParticles(fakeCtx(), 'garden', L, { season: 'summer', weather: 'clear', night: false, t: 1 }), 0);
  // 上限を下げても守る
  S.H.BAL.particleMax = 10;
  for (let i = 0; i < 30; i++) S.H.seasons.drawParticles(fakeCtx(), 'garden', L, { season: 'summer', weather: 'rain', t: i });
  assert.ok(S.H.seasons.count() <= 10);
  // 閉じたら捨てる
  S.H.emit('close', { area: 'garden' });
  assert.equal(S.H.seasons.count(), 0);
});
test('prefers-reduced-motion ではパーティクルを出さない', () => {
  const S = makeSandbox({}, { matchMedia: q => ({ matches: /reduce/.test(q) }) });
  S.H.ensure();
  const L = S.H.layout('garden', 32);
  for (let i = 0; i < 10; i++) assert.equal(S.H.seasons.drawParticles(fakeCtx(), 'garden', L, { season: 'winter', weather: 'snow', t: i }), 0);
  assert.equal(S.H.seasons.count(), 0);
});

// ── 外観・内装 ──
function fakeScreen(H, area) { return { area, mode: 'live', refresh() {}, sfx() {}, ui: H.ui }; }
test('外観・内装：模様替えで選び、取り消し/やり直しができ、確定で保存される', () => {
  const S = makeSandbox();
  const hd = S.H.ensure();
  const sc = fakeScreen(S.H, 'garden');
  assert.equal(S.H.editor.start(sc), true);
  S.H.editor.setLook(sc, { exterior: { roof: 'red' } }, '屋根：赤');
  S.H.editor.setLook(sc, { exterior: { wall: 'wood' } }, '外壁：板張り');
  assert.equal(sc.ed.draft.look().exterior.wall, 'wood');
  S.H.editor.undo(sc);
  assert.deepEqual(J(sc.ed.draft.look().exterior), { roof: 'red', wall: 'cream', door: 'wood' });
  S.H.editor.redo(sc);
  S.H.editor.setLook(sc, { wallpaper: 'mint', floorId: 'floor.tatami' }, '内装');
  assert.equal(hd.exterior.roof, 'navy', '確定するまでは変わらない');
  const saves = S.calls.save;
  assert.equal(S.H.editor.commit(sc), true);
  assert.ok(S.calls.save > saves, '保存した');
  assert.deepEqual(J(hd.exterior), { roof: 'red', wall: 'wood', door: 'wood' });
  assert.equal(hd.room.wallpaper, 'mint'); assert.equal(hd.room.floorId, 'floor.tatami');
  const r = reload(S);
  assert.deepEqual(J(r.exterior), { roof: 'red', wall: 'wood', door: 'wood' });
  assert.equal(r.room.wallpaper, 'mint'); assert.equal(r.room.floorId, 'floor.tatami');
});
test('外観・内装：破棄すれば元のまま', () => {
  const S = makeSandbox();
  const hd = S.H.ensure();
  const sc = fakeScreen(S.H, 'room');
  S.H.editor.start(sc);
  S.H.editor.setLook(sc, { wallpaper: 'night' }, '壁紙');
  assert.equal(S.H.editor.dirty(sc), true);
  S.H.editor.discard(sc);
  assert.equal(hd.room.wallpaper, 'lavender');
});

// ── 写真 ──
test('写真：ファイル名は dannoura-home-<area>-day<d>.png', () => {
  const S = makeSandbox({ day: 12 });
  S.H.ensure();
  assert.equal(S.H.photo.filename('garden', 12), 'dannoura-home-garden-day12.png');
  assert.equal(S.H.photo.filename('room'), 'dannoura-home-room-day12.png');
  assert.equal(S.H.photo.filename('../x', 3), 'dannoura-home-room-day3.png');
  assert.equal(S.H.photo.filename('garden', 'abc'), 'dannoura-home-garden-day1.png');
});
test('写真：思い出帳に貼るのは配置の写しだけ（画像なし）。同じ日・同じ場所は一枚', () => {
  const S = makeSandbox({ day: 5, hour: 14 });
  const hd = S.H.ensure();
  const r = S.H.photo.toMemory('garden');
  assert.equal(r.ok, true, r.reason);
  const m = S.H.memories.get('photo.garden.d5');
  assert.ok(m && m.snapshot && m.snapshot.area === 'garden');
  assert.equal(m.snapshot.season, S.H.season());
  assert.equal(m.snapshot.weather, S.H.weather());
  assert.equal(m.snapshot.placements.length, hd.garden.placements.length);
  assert.ok(!/data:image|base64/.test(JSON.stringify(hd)), 'セーブに画像を入れない');
  const r2 = S.H.photo.toMemory('garden');
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /もう貼ってあります/);
});
test('写真：描けない環境では成功と言わない', () => {
  const S = makeSandbox();
  S.H.ensure();
  const r = S.H.photo.save('room');
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
