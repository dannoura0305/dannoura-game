// 買い出しダッシュ　高難易度版：技（minigames/runner/combat.js）と弱い敵（minigames/runner/enemies.js）
// ・技の表の形（こま数が正・連なる先が実在・基本技がある）
// ・3 段の連なり：窓の中で押すと次の技、窓の外では出ない・先行入力（8 こま）・ジャンプ／ダッシュでの取り消しは窓の中だけ
// ・当たりの箱：当たる間だけ・向きで左右反転・1 回の振りで同じ相手に 1 回だけ
// ・空中斬り：横の動きを残す・着地で終わる
// ・敵：歩く敵は壁・崖で向きを変える・宙の敵は近づくと急降下して戻る・攻撃で減って倒れて消える
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, Set };
vm.createContext(ctx);
for (const f of ['act.js', 'combat.js', 'enemies.js']) vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/' + f), 'utf8'), ctx, { filename: f });
const RA = ctx.RunnerAct, RC = ctx.RunnerCombat, RE = ctx.RunnerEnemies;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const T = RA.TILE;
const flat = () => RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]);
// 1 こま：攻撃の入力（atk）の押した瞬間を作り、combat → act → combat.post の順に回す
function rig(learned) {
  const map = flat(), A = RA.make({ map }), C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); let prevAtk = false;
  const step = (inp = {}) => { const i = Object.assign({}, inp); i.atkP = !!i.atk && !prevAtk; prevAtk = !!i.atk; const pv = b.prev || {}; i.jP = !!i.j && !pv.j; i.dP = !!i.d && !pv.d; A.step(b, C.pre(b, i)); C.post(b); };
  return { A, C, b, step, map };
}

t('技の表：こま数が正・連なる先が実在する・基本技（地上 3 段・空中）がある', () => {
  for (const [id, m] of Object.entries(RC.MOVES)) {
    if (m.ability) { assert.equal(m.base, false); continue; }                 // 動きを足す習得技（空中ダッシュ）は こま数を持たない
    for (const k of ['startup', 'active', 'recover']) assert.ok(Number.isInteger(m[k]) && m[k] > 0, `${id}.${k}`);
    for (const to of Object.keys(m.cancel)) assert.ok(to === 'jump' || to === 'dash' || RC.MOVES[to], `${id} → ${to}`);
    for (const w of Object.values(m.cancel)) assert.ok(w[0] >= 1 && w[1] >= w[0] && w[1] <= RC.total(m), `${id} の窓`);
  }
  for (const id of ['slash1', 'slash2', 'slash3', 'air']) assert.ok(RC.MOVES[id].base, id);
});

t('3 段：1 段目の窓の中で押すと 2 段目 → 3 段目。押さなければ 1 段目で終わる', () => {
  const r = rig(); r.step({ atk: true }); assert.equal(r.b.atk.id, 'slash1');
  for (let i = 0; i < 6; i++) r.step({}); r.step({ atk: true }); assert.equal(r.b.atk.id, 'slash2');
  for (let i = 0; i < 6; i++) r.step({}); r.step({ atk: true }); assert.equal(r.b.atk.id, 'slash3');
  const q = rig(); q.step({ atk: true }); for (let i = 0; i < 40; i++) q.step({}); assert.equal(q.b.atk, null);
});

t('先行入力：戻りの前（窓が開く前）に押しても、8 こま以内なら窓が開いた所で次の技が出る。遅すぎると出ない', () => {
  const r = rig(); r.step({ atk: true }); r.step({}); r.step({ atk: true }); r.step({});   // 3 こま目で押す（窓は 5 こま目から）
  for (let i = 0; i < 3; i++) r.step({}); assert.equal(r.b.atk.id, 'slash2');
  const q = rig(); q.step({ atk: true }); for (let i = 0; i < 25; i++) q.step({}); q.step({ atk: true }); assert.equal(q.b.atk.id, 'slash1', '窓が閉じた後に押すと、1 段目から出直す');
});

t('取り消し：ジャンプ・ダッシュは窓の中だけ（出る前・当たる間には取り消せない）', () => {
  const r = rig(); r.step({ atk: true }); r.step({ j: true }); assert.equal(r.b.atk && r.b.atk.id, 'slash1', '早すぎる'); r.step({});
  for (let i = 0; i < 5; i++) r.step({}); r.step({ j: true }); assert.equal(r.b.atk, null); assert.equal(r.b.state, 'jump');
  const q = rig(); q.step({ atk: true }); for (let i = 0; i < 8; i++) q.step({}); q.step({ d: true }); assert.equal(q.b.atk, null); assert.equal(q.b.state, 'dash');
});

t('地上の技はその場（横に歩かない・少し踏み込む）', () => {
  const r = rig(), x0 = r.b.x; r.step({ atk: true, r: true }); for (let i = 0; i < 10; i++) r.step({ r: true });
  assert.ok(r.b.x - x0 > 0 && r.b.x - x0 < 6, `${(r.b.x - x0).toFixed(2)}`);
});

t('当たりの箱：当たる間だけ・向きで左右が入れ替わる・1 回の振りで同じ相手に 1 回だけ', () => {
  const r = rig(); r.step({ atk: true });
  const boxes = []; for (let i = 0; i < 12; i++) { boxes.push(r.C.hitbox(r.b)); r.step({}); }
  const on = boxes.map(Boolean); assert.deepEqual(on.slice(0, 7), [false, false, false, false, true, true, true]);
  const hb = boxes.find(Boolean); assert.ok(hb.x0 > r.b.x - 1, '右向きなら右に出る');
  const L = rig(); L.b.face = -1; L.step({ atk: true }); for (let i = 0; i < 4; i++) L.step({}); const hl = L.C.hitbox(L.b); assert.ok(hl && hl.x1 < L.b.x + 1, '左向きなら左に出る');
  const tgt = {}; assert.ok(L.C.tryHit(L.b, tgt)); assert.ok(!L.C.tryHit(L.b, tgt));
});

t('空中斬り：跳んでから押すと空中斬り・横の動きを残す・着地で終わる', () => {
  const r = rig(); r.step({ j: true }); r.step({ j: true }); r.step({ j: true, atk: true, r: true });
  assert.equal(r.b.atk.id, 'air'); const x = r.b.x; r.step({ j: true, r: true }); assert.ok(r.b.x > x, '横に動く');
  for (let i = 0; i < 80 && r.b.state !== 'land' && r.b.state !== 'stand'; i++) r.step({ r: true });
  assert.equal(r.b.atk, null);
});

t('習得技は覚えるまで使えない（usable）', () => {
  const r = rig(); assert.ok(r.C.usable('slash1')); assert.ok(!r.C.usable('rising'));
  r.C.learn('slash1'); assert.ok(r.C.usable('slash1'));
});

t('歩く敵：前が壁か崖なら向きを変える・攻撃で減って倒れ、少しして消える', () => {
  const map = RA.makeMap(['#.........#', '#.........#', '###########']), E = RE.make(map);
  const e = E.spawn('walker', 5 * T, T, -1); const seen = new Set();
  for (let i = 0; i < 600; i++) { E.step(e, null); seen.add(e.face); assert.ok(e.x > T && e.x < 10 * T, '壁を抜けない'); }
  assert.equal(seen.size, 2, '向きを変える');
  const cliff = RA.makeMap(['..........', '..........', '...####...']), E2 = RE.make(cliff), c = E2.spawn('walker', 5 * T, T, 1);
  for (let i = 0; i < 400; i++) E2.step(c, null); assert.ok(c.x > 3 * T && c.x < 7 * T && c.y === T, '崖から落ちない');
  assert.ok(E.hurt(e, 1, 3)); assert.ok(!e.dead); E.hurt(e, 1, 3); assert.ok(e.dead);
  for (let i = 0; i < RE.DEATH_F; i++) E.step(e, null); assert.ok(e.gone);
});

t('宙の敵：ふわふわ漂い、下に自機が来ると急降下して、もとの高さへ戻る', () => {
  const map = flat(), E = RE.make(map), e = E.spawn('flyer', 20 * T, 4 * T);
  const p = { x: 20 * T + 60, y: T }; let dived = false, back = false;
  for (let i = 0; i < 400; i++) { E.step(e, p); if (e.state === 'dive') dived = true; if (dived && e.state === 'hover') back = true; }
  assert.ok(dived && back);
});


t('溜め斬り：押し続けると段が上がる（1 段・2 段）・離すと大きく払う・2 段は前へ飛ぶ斬撃も出て壁で消える・短く押すと ふつうの斬り', () => {
  const C0 = RC.CHARGE; assert.ok(C0.f1 > 10 && C0.f2 > C0.f1);
  // 短く押す：ふつうの斬り、溜めは出ない
  { const r = rig([]); r.step({ atk: true }); r.step({}); assert.equal(r.b.atk.id, 'slash1'); for (let i = 0; i < 40; i++) r.step({}); assert.equal(r.b.atk, null); }
  // 1 段
  { const r = rig([]); for (let i = 0; i < C0.f1 + 2; i++) r.step({ atk: true }); assert.equal(r.C.chargeLv(r.b), 1); r.step({}); assert.equal(r.b.atk.id, 'charge'); assert.equal(r.b.atk.lv, 1);
    let hb = null; for (let i = 0; i < 10 && !hb; i++) { r.step({}); hb = r.C.hitbox(r.b); } assert.ok(hb && hb.dmg >= 3 && hb.x1 - hb.x0 >= 70, '大きく払う'); assert.equal(r.C.shots.length, 0, '1 段は飛ばない'); }
  // 2 段：飛ぶ斬撃
  { const r = rig([]); for (let i = 0; i < C0.f2 + 2; i++) r.step({ atk: true }); assert.equal(r.C.chargeLv(r.b), 2); r.step({}); for (let i = 0; i < 6; i++) r.step({});
    assert.equal(r.C.shots.length, 1, '飛ぶ斬撃'); const s = r.C.shots[0], x0 = s.x; r.step({}); assert.ok(s.x > x0, '前へ進む');
    const sb = r.C.shotBox(s); assert.ok(sb.dmg >= 3 && sb.id === 'wave');
    const e = { id: 'x' }; assert.equal(r.C.shotHit(s, e), true); assert.equal(r.C.shotHit(s, e), false, '同じ相手に 1 回');
    for (let i = 0; i < 80; i++) r.step({}); assert.equal(r.C.shots.length, 0, '消える'); }
  // 空中で離す：空中の溜め斬り
  { const r = rig([]); for (let i = 0; i < C0.f1 + 2; i++) r.step({ atk: true }); r.step({ atk: true, j: true }); r.step({ atk: true, j: true }); r.step({ j: true }); assert.equal(r.b.atk && r.b.atk.id, 'charge_air'); }
});


t('面ごとの敵（屋上・排水路・送電区）：床（好きな高さの足場にも）に立つ・瓦は放物線で自機の所へ・風凧は斜め下へ・泥がえるは寄って跳ぶ・排水の目は開いた時だけ効く・火花虫は火花をまとう・碍子の盾は正面を防ぐ', () => {
  for (const [st, ts] of Object.entries(RE.STAGE_FOES)) for (const k of ts) assert.ok(RE.TYPES[k], st + ':' + k);
  const mk = () => { const map = RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]); map.ledges.push({ x0: 20 * T, x1: 30 * T, y: 3 * T }); return { map, E: RE.make(map) }; };
  // 足場の上に下ろす
  { const { E } = mk(); const e = E.spawn('thrower', 25 * T, 5 * T); assert.equal(e.y, 3 * T, '足場の上'); const g = E.spawn('hopper', 10 * T, 5 * T); assert.equal(g.y, T, 'マスの床'); }
  // 瓦投げ：放物線で自機の近くへ落ちる
  { const { E } = mk(); const e = E.spawn('thrower', 25 * T, 5 * T), p = { x: 18 * T, y: T, vx: 0 }; let sh = null; for (let i = 0; i < 200 && !sh; i++) { E.step(e, p); if (E.shots.length) sh = E.shots[0]; } assert.ok(sh && sh.kind === 'tile' && sh.vy > 0 && sh.vx < 0, '前へ上向きに投げる');
    let minD = 1e9; for (let i = 0; i < 120 && E.shots.length; i++) { E.stepShots(); if (E.shots.length) minD = Math.min(minD, Math.hypot(sh.x - p.x, sh.y - (p.y + 10))); } assert.ok(minD < 40, '自機の所へ落ちる ' + minD); }
  // 風凧：斜め下へ
  { const { E } = mk(); const e = E.spawn('kite', 20 * T, 6 * T), p = { x: 14 * T, y: T }; let sh = null; for (let i = 0; i < 260 && !sh; i++) { E.step(e, p); if (E.shots.length) sh = E.shots[0]; } assert.ok(sh && sh.kind === 'gust' && sh.vy < 0 && sh.vx < 0, '自機の方へ斜め下'); }
  // 泥がえる：寄って跳ぶ
  { const { E } = mk(); const e = E.spawn('hopper', 10 * T, T), p = { x: 4 * T, y: T }; let top = e.y, landed = false; const x0 = e.x; for (let i = 0; i < 160 && !landed; i++) { E.step(e, p); top = Math.max(top, e.y); landed = top > T + 40 && e.y === T; } assert.ok(top > T + 40, '跳ぶ'); assert.ok(e.x < x0 - 30, '寄る'); assert.ok(landed, '着地'); }
  // 排水の目：閉じている間は防ぐ → 開くと効く・水の玉 3 つ
  { const { E } = mk(); const e = E.spawn('spout', 10 * T, T), p = { x: 6 * T, y: T }; assert.equal(E.hurt(e, 1, 0, 'slash1', 6 * T), 'block', '閉じている');
    for (let i = 0; i < 400 && e.state !== 'open'; i++) E.step(e, p); assert.equal(e.state, 'open'); assert.equal(E.shots.filter(s => s.kind === 'water').length, RE.TYPES.spout.n); assert.equal(E.hurt(e, 1, 0, 'slash1', 6 * T), true, '開くと効く'); }
  // 火花虫：まとう間は周りが危ない
  { const { E } = mk(); const e = E.spawn('crawler', 10 * T, T), p = { x: 8 * T, y: T }; assert.equal(E.auraBox(e), null); let a = null; for (let i = 0; i < 400 && !a; i++) { E.step(e, p); a = E.auraBox(e); } assert.ok(a && a.x1 - a.x0 >= 80, '火花の輪'); }
  // 碍子の盾：正面は防ぐ・後ろ・溜め斬り・飛ぶ斬撃・雷突きは通る
  { const { E } = mk(); const e = E.spawn('shield', 10 * T, T, -1); e.face = -1; assert.equal(E.hurt(e, 1, 0, 'slash1', 8 * T), 'block', '正面'); assert.equal(E.hurt(e, 1, 0, 'slash1', 12 * T), true, '後ろ');
    for (const m of ['charge', 'wave', 'raitotsu']) { const g = E.spawn('shield', 10 * T, T, -1); g.face = -1; assert.equal(E.hurt(g, 1, 0, m, 8 * T), true, m); } }
});


t('雨坊主・からかさの代わりの敵：つむじ坊は吸い寄せる・鳥居烏は真下で急降下して戻る・ごみ袋坊は斬ると 2 つに分かれる・しぶき鯉は水面から跳ぶ（水位で高さが変わる・水の中は当たらない）・電線ねずみは真上で落ちる・ぱちぱち玉は近いと弾けて火花', () => {
  const mk = water => { const map = RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]); return { map, E: RE.make(map, { waterAt: () => water && water.v }) }; };
  // つむじ坊
  { const { E } = mk(); const e = E.spawn('tsumuji', 20 * T, T), p = { x: 18 * T, y: T }; let pull = 0; for (let i = 0; i < 300 && !pull; i++) { E.step(e, p); pull = e.pull || 0; } assert.ok(pull > 0, '自機をつむじ坊の方へ（右へ）吸い寄せる'); }
  // 鳥居烏：真下で降りる・戻る・2 羽目は遅れる
  { const { E } = mk(); const a = E.spawn('karasu', 20 * T, 6 * T), b = E.spawn('karasu', 21 * T, 6 * T), p = { x: 20.5 * T, y: T }; let da = -1, db = -1, minY = 1e9;
    for (let i = 0; i < 120; i++) { E.step(a, p); E.step(b, p); if (da < 0 && a.state === 'dive') da = i; if (db < 0 && b.state === 'dive') db = i; minY = Math.min(minY, a.y); }
    assert.ok(da >= 0 && db >= 0 && Math.abs(da - db) >= 10, '時間をずらして降りる ' + da + ' ' + db); assert.ok(minY < 3 * T, '下まで降りる');
    for (let i = 0; i < 200; i++) E.step(a, { x: 40 * T, y: T }); assert.equal(a.state, 'hover'); assert.ok(Math.abs(a.y - 6 * T) < 3 && a.x === 20 * T, '元の所へ戻る'); }
  // ごみ袋坊
  { const { E } = mk(); const e = E.spawn('gomi', 20 * T, T); E.hurt(e, 2, 0, 'slash1', 18 * T); assert.ok(e.dead); assert.equal(E.born.length, 2, '2 つに分かれる'); assert.ok(E.born.every(c => c.type === 'gomi_s' && c.hp === 1)); }
  // しぶき鯉：水位が上がると高く跳ぶ・水の中は当たらない
  { const W = { v: null }, { E } = mk(W); const run = lv => { W.v = lv; const e = E.spawn('koi', 20 * T, 85, -1), p = { x: 18 * T, y: 3 * T }; let top = -1e9, hid = false; for (let i = 0; i < 400; i++) { E.step(e, p); if (e.state === 'under') hid = hid || E.box(e).x1 < E.box(e).x0; top = Math.max(top, e.y); } return { top, hid }; };
    const lo = run(null), hi = run(185); assert.ok(lo.hid, '水の中は当たらない'); assert.ok(lo.top > 85 + 100, '跳ぶ ' + lo.top); assert.ok(hi.top > lo.top + 80, '水位が上がると高く'); }
  // 電線ねずみ：真上で落ちて床を走る
  { const { E } = mk(); const e = E.spawn('nezumi', 20 * T, 6 * T), p = { x: 20 * T, y: T }; assert.equal(e.y, 6 * T, '高い所'); for (let i = 0; i < 200; i++) E.step(e, p); assert.equal(e.y, T, '落ちて床へ'); assert.equal(e.state, 'walk'); }
  // ぱちぱち玉：近いと弾けて左右へ火花・斬っても弾ける
  { const { E } = mk(); const e = E.spawn('pachi', 20 * T, 2 * T), p = { x: 19 * T, y: 1.5 * T }; for (let i = 0; i < 200 && !e.dead; i++) E.step(e, p); assert.ok(e.dead && e.burst, '弾ける'); assert.equal(E.shots.filter(s => s.kind === 'spark').length, 2); assert.ok(E.shots.some(s => s.vx < 0) && E.shots.some(s => s.vx > 0), '左右へ'); }
  { const { E } = mk(); const e = E.spawn('pachi', 20 * T, 2 * T); E.hurt(e, 1, 0, 'slash1', 19 * T); assert.equal(E.shots.length, 2, '斬っても火花'); }
});

console.log(`runner-hard-combat: ${n} ok`);
