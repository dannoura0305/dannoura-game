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

console.log(`runner-hard-combat: ${n} ok`);
