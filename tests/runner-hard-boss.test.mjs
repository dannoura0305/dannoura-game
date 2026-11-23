// 買い出しダッシュ　高難易度版：ボス（minigames/runner/bosses.js）と、ボスで覚える技（combat.js）
// ・ボスの表：選択画面に出るのは隠しでない物だけ・覚える技が技の表にある・隠しボス（風邪菌・仮）は全員倒した後
// ・雷殻の怪異（通常ボス C）：起きるまで動かない・近づく・設定画の動き（ストンプ・放電・突進・ガード・雷雲招来）が予兆の後に出る・部屋の外に出ない
// ・ガード（雷殻）：正面の攻撃は防ぐ → 2 回で反撃。後ろから当てると崩れる。雷雲招来：体力半分で。落雷は予兆の間は当たらない・部屋の看板が帯電
// ・倒れる：弾が消える・撃破のコマ。ドット絵のコマ（raikaku.json）が全部ある
// ・習得技：雷突き（ダッシュ中に攻撃）・切り上げ（↑＋攻撃）は覚えるまで出ない
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, Set };
vm.createContext(ctx);
for (const f of ['act.js', 'combat.js', 'bosses.js']) vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/' + f), 'utf8'), ctx, { filename: f });
const RA = ctx.RunnerAct, RC = ctx.RunnerCombat, RB = ctx.RunnerBosses, RK = RB.RAIKAKU;
const SPR = JSON.parse(readFileSync(join(ROOT, 'assets/runner/raikaku.json'), 'utf8'));
const SPRS = id => JSON.parse(readFileSync(join(ROOT, `assets/runner/${id}.json`), 'utf8')).frames;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const T = RA.TILE;
const room = () => RA.makeMap(['#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#' + '.'.repeat(28) + '#', '#'.repeat(30), '#'.repeat(30)]);
const AR = { x0: T, x1: 29 * T, floor: 2 * T };
const boss = () => { const map = room(), Z = RB.make(map), e = Z.spawn('raikaku', 20 * T, 2 * T, AR); return { Z, e }; };

t('ボスの表：選択画面に出るのは隠しでない物だけ（雷殻の怪異）・覚える技は技の表にある・隠しボスは全員倒した後', () => {
  const vis = RB.visible(); assert.ok(vis.length >= 1 && vis.every(b => !b.hidden)); assert.ok(vis.some(b => b.id === 'raikaku' && b.name === '雷殻の怪異' && b.stage === 'koka'));
  assert.equal(vis.map(b => b.id).join(), 'kazegiri,dakuryu,raikaku', '通常ボス A・B・C'); assert.equal(vis.map(b => b.name).join(), '風斬の怪異,濁流の怪異,雷殻の怪異');
  for (const b of vis) assert.ok(b.special && b.stage && b.teaches, b.id);
  assert.ok(!RB.BOSSES.some(b => b.id === 'boss_a'), '仮のボスは差し替え済み');
  for (const b of RB.BOSSES) if (b.teaches) { assert.ok(RC.MOVES[b.teaches], b.teaches); assert.equal(RC.MOVES[b.teaches].base, false); assert.equal(RC.MOVES[b.teaches].learnedFrom, b.id); }
  const cold = RB.BOSSES.find(b => b.id === 'cold'); assert.ok(cold && cold.hidden && cold.stage === 'home' && cold.unlock === 'after_all', '隠しボス：家・全員倒した後');
  assert.ok(!RB.coldUnlocked([])); assert.ok(!RB.coldUnlocked(['boss_a'])); assert.ok(RB.coldUnlocked(RB.visible().map(b => b.id)), '全員倒すと会える');
});

t('雷殻の怪異：起きるまで動かない・傷つかない・起きると近づく', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T };
  for (let i = 0; i < 60; i++) Z.step(e, p); assert.equal(e.x, 20 * T); assert.ok(!Z.hurt(e, 1, p.x));
  Z.wake(e); for (let i = 0; i < 30; i++) Z.step(e, p); assert.ok(e.x < 20 * T, '近づく');
});

t('雷殻の怪異：ストンプ（衝撃波）・放電（放射状）・突進・ガードが予兆の後に出る・部屋の外に出ない・突進は低い姿勢', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e); const seen = new Set(), kinds = new Set(), evs = new Set(); let teleFirst = true, lowRush = false;
  for (let i = 0; i < 3000; i++) {
    const before = Z.shots.length; Z.step(e, p); Z.stepShots(); seen.add(e.state); for (const v of e.ev) evs.add(v);
    if (Z.shots.length > before) { for (const s of Z.shots.slice(before)) kinds.add(s.kind); if (!seen.has('stomp_tele') && !seen.has('discharge_tele')) teleFirst = false; }
    if (e.state === 'rush') { const b = Z.box(e); lowRush = lowRush || (b.y1 - b.y0 < RK.h); }
    assert.ok(e.x >= AR.x0 && e.x <= AR.x1, '部屋の外に出ない');
  }
  for (const s of ['stomp_tele', 'stomp', 'discharge_tele', 'discharge', 'rush_tele', 'rush', 'guard']) assert.ok(seen.has(s), s + '：' + [...seen].join(','));
  assert.ok(kinds.has('wave') && kinds.has('spark') && teleFirst, [...kinds].join(','));
  assert.ok(evs.has('stomp') && evs.has('rushwall') && lowRush);
  assert.ok(!seen.has('storm_tele'), '体力が多い間は必殺技を出さない');
});

t('ガード（雷殻）：正面の攻撃は防ぐ（減らない）→ 2 回防ぐと反撃の輪。後ろから当てると減って崩れる', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e);
  for (let i = 0; i < 3000 && e.state !== 'guard'; i++) { Z.step(e, p); Z.stepShots(); }
  assert.equal(e.state, 'guard'); const hp = e.hp, front = e.x + e.face * 40, back = e.x - e.face * 40;
  assert.equal(Z.hurt(e, 2, front), 'block'); assert.equal(e.hp, hp);
  assert.equal(Z.hurt(e, 2, front), 'block'); Z.step(e, p); assert.equal(e.state, 'counter_tele');
  for (let i = 0; i < 20; i++) { Z.step(e, p); Z.stepShots(); } assert.ok(Z.shots.some(s => s.kind === 'burst') || e.state === 'recover');
  const { Z: Z2, e: e2 } = boss(); Z2.wake(e2); for (let i = 0; i < 3000 && e2.state !== 'guard'; i++) { Z2.step(e2, p); Z2.stepShots(); }
  const hp2 = e2.hp; assert.equal(Z2.hurt(e2, 2, e2.x - e2.face * 40), true); assert.equal(e2.hp, hp2 - 2); assert.equal(e2.state, 'recover', '後ろからでガードが崩れる');
});

t('雷雲招来：体力が半分を切ると出る・落雷は予兆の間は当たらない・終わるまで帯電・終わると止む', () => {
  const { Z, e } = boss(), p = { x: 10 * T, y: 2 * T }; Z.wake(e); e.hp = Math.floor(e.hpMax / 2);
  let tele = false, active = false, charged = false;
  for (let i = 0; i < 2000; i++) {
    Z.step(e, p); Z.stepShots(); charged = charged || e.charged;
    for (const s of Z.shots) if (s.kind === 'bolt') { const b = Z.shotBox(s); if (s.f <= s.tele) { assert.equal(b, null); tele = true; } else { assert.ok(b && b.x0 < p.x + 30 && b.x1 > p.x - 30, '自機の所へ落ちる'); active = true; } }
    if (charged && e.state === 'recover') break;
  }
  assert.ok(tele && active && charged); assert.ok(!e.charged, '終わると止む');
});

t('倒れる：0 で倒れる・弾が消える・帯電が止む・撃破のコマ。ドット絵のコマが全部ある（64）', () => {
  const { Z, e } = boss(), p = { x: 5 * T, y: 2 * T }; Z.wake(e);
  for (let i = 0; i < 400; i++) { Z.step(e, p); Z.stepShots(); }
  e.state = 'walk'; while (!e.dead) { e.state = 'walk'; Z.hurt(e, 1, e.x + e.face * 40); }   // 7 回で反撃（構え）に移るので、毎回 歩きに戻して当てる
  assert.equal(e.hp, 0); assert.equal(Z.shots.length, 0); assert.ok(!e.charged);
  for (let i = 0; i < RK.deadF; i++) Z.step(e, p); assert.ok(/^7_[3-7]$/.test(Z.frame(e)), Z.frame(e));
  assert.equal(Object.keys(SPR.frames).length, 64);
  const { Z: Z3, e: e3 } = boss(); Z3.wake(e3); e3.hp = 10; const keys = new Set();
  for (let i = 0; i < 4000; i++) { Z3.step(e3, p); Z3.stepShots(); if (i % 97 === 0) Z3.hurt(e3, 0, e3.x - e3.face * 40); keys.add(Z3.frame(e3)); }
  for (const k of keys) assert.ok(SPR.frames[k], 'コマが無い ' + k);
  assert.ok(keys.size >= 25, `使うコマ ${keys.size}`);
});

t('雷突き（仮）：覚えるまでダッシュ中の攻撃は 1 段目。覚えると前へ踏み込んで遠くまで届く', () => {
  const map = RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]), A = RA.make({ map });
  const tryDash = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); A.step(b, C.pre(b, { r: true, d: true, dP: true })); C.post(b); assert.equal(b.state, 'dash'); A.step(b, C.pre(b, { r: true, d: true, atk: true, atkP: true })); C.post(b); return { b, C }; };
  assert.equal(tryDash([]).b.atk.id, 'slash1');
  const r = tryDash(['raitotsu']); assert.equal(r.b.atk.id, 'raitotsu'); const x0 = r.b.x;
  let hb = null; for (let i = 0; i < 8 && !hb; i++) { A.step(r.b, r.C.pre(r.b, {})); r.C.post(r.b); hb = r.C.hitbox(r.b); }
  assert.ok(hb && hb.dmg >= 3 && hb.x1 - r.b.x > 60, '前へ遠く'); assert.ok(r.b.x - x0 > 40, '踏み込む');
});

t('切り上げ（仮）：覚えるまで ↑＋攻撃でも 1 段目。覚えた記録があれば使える（今は教えるボスが無い）', () => {
  const map = RA.makeMap(['.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '#'.repeat(40)]), A = RA.make({ map });
  const tryUp = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); const i = { up: true, atk: true, atkP: true }; A.step(b, C.pre(b, i)); return { b, C }; };
  assert.equal(tryUp([]).b.atk.id, 'slash1');
  const r = tryUp(['rising']); assert.equal(r.b.atk.id, 'rising');
  for (let i = 0; i < 5; i++) { A.step(r.b, r.C.pre(r.b, {})); }
  const hb = r.C.hitbox(r.b); assert.ok(hb && hb.y1 - r.b.y > 100, '上に高く届く');
});

// ── 風斬の怪異・濁流の怪異 ──
const run = (id, frames, opt = {}) => {
  const map = room(), Z = RB.make(map), e = Z.spawn(id, 20 * T, 2 * T, AR), p = { x: opt.px || 8 * T, y: 2 * T }; Z.wake(e); if (opt.hp) e.hp = opt.hp;
  const seen = new Set(), kinds = new Set(), evs = new Set(), keys = new Set(); let teleBefore = true, last = null;
  for (let i = 0; i < frames; i++) {
    const before = Z.shots.length, st0 = e.state; if (opt.chase && i % 90 === 0) p.x = e.x + (i % 180 ? -60 : 260);
    Z.step(e, p); Z.stepShots(); seen.add(e.state); for (const v of e.ev) evs.add(v); keys.add(Z.frame(e));
    if (e.state !== st0 && !/_tele$|walk|recover/.test(e.state) && !/_tele$|slash|walk/.test(st0) && e.state !== 'air_up' && e.state !== 'air_dive' && e.state !== 'shot' && e.state !== 'grab') last = [st0, e.state];
    for (const s of Z.shots.slice(before)) kinds.add(s.kind);
    assert.ok(e.x >= AR.x0 && e.x <= AR.x1, '部屋の外に出ない');
  }
  return { Z, e, seen, kinds, evs, keys, last };
};
t('風斬の怪異：高速ダッシュ・地上の 3 連斬り・空中から斜めの斬撃・突きが予兆の後に出る・部屋の外に出ない・体力が多い間は奥義を出さない', () => {
  const r = run('kazegiri', 4000, { chase: true });
  for (const s of ['dash_tele', 'dash', 'slash_tele', 'slash', 'air_tele', 'air_up', 'air_dive', 'thrust_tele', 'thrust', 'recover']) assert.ok(r.seen.has(s), s + '：' + [...r.seen].join(','));
  assert.ok(r.kinds.has('melee')); assert.ok(!r.seen.has('storm'));
  for (const k of r.keys) assert.ok(SPRS('kazegiri')[k], 'コマが無い ' + k);
});
t('風斬の怪異：フェイント（手前で止まってすぐ斬る）・休みに 3 回当てると立て直して反撃・風断連嵐（体力半分から：周りの刃と、高低の風の刃）', () => {
  const r = run('kazegiri', 3000, { hp: 14 }); assert.ok(r.seen.has('storm_tele') && r.seen.has('storm') && r.evs.has('special'));
  assert.ok(r.kinds.has('ring') && r.kinds.has('blade'));
  const map = room(), Z = RB.make(map), e = Z.spawn('kazegiri', 20 * T, 2 * T, AR); Z.wake(e); e.state = 'recover'; e.f = 0;
  Z.hurt(e, 1); Z.hurt(e, 1); assert.equal(e.state, 'recover'); Z.hurt(e, 1); assert.equal(e.state, 'dash_tele', '反撃');
  let feint = false; const Z2 = RB.make(room()), e2 = Z2.spawn('kazegiri', 20 * T, 2 * T, AR); Z2.wake(e2); e2.state = 'dash_tele'; e2.f = 0; e2.k = RB.KAZEGIRI.dash.feint - 1;   // 次のダッシュがフェイント
  for (let i = 0; i < 80 && !feint; i++) { const st = e2.state; Z2.step(e2, { x: 12 * T, y: 2 * T }); if (st === 'dash' && e2.state === 'slash_tele') feint = true; }
  assert.ok(feint && Math.abs(e2.x - 12 * T) < 90, 'フェイント：手前で止まる');
  const Z3 = RB.make(room()), e3 = Z3.spawn('kazegiri', 20 * T, 2 * T, AR); Z3.wake(e3); e3.state = 'dash_tele'; e3.f = 0; e3.k = 0; let passed = false;
  for (let i = 0; i < 80; i++) { Z3.step(e3, { x: 12 * T, y: 2 * T }); if (e3.x < 12 * T - 60) passed = true; } assert.ok(passed, 'ふつうのダッシュは駆け抜ける');
});
t('濁流の怪異：地を這う・スプラッシュラッシュ（水たまり）・飛沫弾（着弾で水しぶき）・大波（水位が上がって下がる）・近いと捕縛', () => {
  const r = run('dakuryu', 4000, { px: 8 * T });
  for (const s of ['walk', 'rush_tele', 'rush', 'shot_tele', 'shot', 'wave_tele', 'wave', 'recover']) assert.ok(r.seen.has(s), s + '：' + [...r.seen].join(','));
  for (const k of ['splash', 'drop', 'flood']) assert.ok(r.kinds.has(k), k);
  const g = run('dakuryu', 2400, { px: 17 * T }); assert.ok(g.seen.has('grab_tele') && g.seen.has('grab') && g.kinds.has('melee'), '捕縛（近いと 97/256 で混ぜる）');
  const map = room(), Z = RB.make(map), e = Z.spawn('dakuryu', 20 * T, 2 * T, AR); Z.wake(e); e.state = 'wave_tele'; e.f = 0; let maxL = 0, boxed = false, gone = false;
  for (let i = 0; i < 400; i++) { Z.step(e, { x: 5 * T, y: 80 }); Z.stepShots(); const fl = Z.shots.find(s => s.kind === 'flood'); if (fl) { maxL = Math.max(maxL, fl.level); const b = Z.shotBox(fl); if (b) { boxed = true; assert.ok(b.y1 <= 80 + RB.DAKURYU.wave.level + 0.01 && b.y1 < 200, '高い足場（200）までは届かない'); } } else if (maxL > 0) gone = true; }
  assert.ok(maxL >= RB.DAKURYU.wave.level - 0.01 && boxed && gone, '上がって下がる');
  for (const k of r.keys) assert.ok(SPRS('dakuryu')[k], 'コマが無い ' + k);
});
t('濁流の怪異：豪雨濁流・都市氾濫（体力半分から）：左右から濁流が断続的に押し寄せる（跳べる高さ）', () => {
  const r = run('dakuryu', 2500, { hp: 16 }); assert.ok(r.seen.has('flood_tele') && r.seen.has('flood') && r.evs.has('special') && r.kinds.has('surge'));
  assert.ok(RB.DAKURYU.flood.h < 100, '跳んで越えられる');
});
t('水切り（仮）：覚えるまでスライディング中の攻撃は出ない。覚えると滑りながら足もとを払う', () => {
  const map = RA.makeMap(['.'.repeat(60), '.'.repeat(60), '.'.repeat(60), '#'.repeat(60)]), A = RA.make({ map });
  const go = learned => { const C = RC.make(A, { learned }), b = A.body(10 * T, T, 1); A.step(b, C.pre(b, { dn: true })); C.post(b); assert.equal(b.state, 'slide'); A.step(b, C.pre(b, { atk: true, atkP: true })); C.post(b); return { b, C }; };
  assert.equal(go([]).b.atk, null);
  const r = go(['mizukiri']); assert.equal(r.b.atk.id, 'mizukiri'); const x0 = r.b.x; let hb = null;
  for (let i = 0; i < 6; i++) { A.step(r.b, r.C.pre(r.b, {})); r.C.post(r.b); hb = hb || r.C.hitbox(r.b); }
  assert.equal(r.b.state, 'slide'); assert.ok(r.b.x > x0 + 15, '滑り続ける'); assert.ok(hb && hb.y1 - r.b.y <= 30 && hb.dmg >= 2, '低く払う');
  for (let i = 0; i < 60; i++) { A.step(r.b, r.C.pre(r.b, {})); r.C.post(r.b); } assert.equal(r.b.atk, null, '滑りが終わると終わる');
});


t('弱点：ボスで覚えた技が別のボスに大きく効く（雷突き→風斬・風刃→濁流・水切り→雷殻）。体力を 2 倍削り、ガードと必殺技を止めて よろける', () => {
  const vis = RB.visible(), by = id => vis.find(b => b.id === id);
  assert.equal(by('kazegiri').weak, 'raitotsu'); assert.equal(by('dakuryu').weak, 'kazeha'); assert.equal(by('raikaku').weak, 'mizukiri');
  // 弱点は別のボスで覚える技（輪になっている）・技の表にある
  const teacher = m => vis.find(b => b.teaches === m || (RC.MOVES[m] && RC.MOVES[m].with === b.teaches));
  for (const b of vis) { assert.ok(RC.MOVES[b.weak], b.weak); const tb = teacher(b.weak); assert.ok(tb && tb.id !== b.id, b.id + ' の弱点は別のボスで覚える'); }
  for (const id of ['kazegiri', 'dakuryu', 'raikaku']) {
    const map = room(), Z = RB.make(map), e = Z.spawn(id, 20 * T, 2 * T, AR); Z.wake(e); for (let i = 0; i < 5; i++) Z.step(e, { x: 10 * T, y: 2 * T });
    const hp0 = e.hp; assert.equal(Z.hurt(e, 1, 10 * T, 'slash1'), true); assert.equal(hp0 - e.hp, 1, id + ' ふつうの技は 1');
    const hp1 = e.hp; assert.equal(Z.hurt(e, 2, 10 * T, by(id).weak), 'weak'); assert.equal(hp1 - e.hp, 2 * RB.WEAK.mul, id + ' 弱点は 2 倍');
    assert.equal(e.state, 'recover'); assert.ok(e.weakT > 0, 'よろける');
    let st = 0; while (e.state === 'recover' && st < 400) { Z.step(e, { x: 10 * T, y: 2 * T }); st++; } assert.ok(st >= RB.WEAK.stun, id + ' しばらく動けない ' + st);
  }
  // 雷殻のガードを正面から通す・必殺技（雷雲招来）を止める
  const { Z, e } = boss(); Z.wake(e); e.state = 'guard'; e.f = 0; e.face = -1;
  assert.equal(Z.hurt(e, 1, 10 * T, 'slash1'), 'block', 'ふつうは防ぐ'); assert.equal(Z.hurt(e, 2, 10 * T, 'mizukiri'), 'weak', '弱点は通す');
  e.state = 'storm'; e.charged = true; Z.shots.push({ kind: 'bolt', x: 0, y: 0, f: 0, tele: 10, w: 10, life: 50 }); Z.hurt(e, 2, 10 * T, 'mizukiri');
  assert.equal(e.charged, false, '帯電が消える'); assert.equal(Z.shots.filter(s => s.kind === 'bolt').length, 0, '落雷が消える');
});

t('風刃（風走りの間に攻撃）：風走りを覚えると使える・前を広く払う・風走りが終わっても振り終わるまで', () => {
  const map = RA.makeMap(['.'.repeat(80), '.'.repeat(80), '.'.repeat(80), '.'.repeat(80), '.'.repeat(80), '#'.repeat(80)]);
  const run = learned => { const A = RA.make({ map, airDash: () => learned.includes('kazebashiri') }), C = RC.make(A, { learned }), b = A.body(5 * T, T, 1);
    const st = i => { A.step(b, C.pre(b, i)); C.post(b); }; st({ j: true }); for (let i = 0; i < 10; i++) st({ j: true, r: true }); st({ r: true, d: true, dP: true }); st({ r: true, d: true, atkP: true }); return { A, C, b, st }; };
  assert.notEqual((run([]).b.atk || {}).id, 'kazeha', '覚えるまで出ない');
  const r = run(['kazebashiri']); assert.equal(r.b.state, 'air_dash'); assert.equal(r.b.atk.id, 'kazeha', '風走りといっしょに覚える');
  r.st({ r: true, d: true }); const hb = r.C.hitbox(r.b); assert.ok(hb && hb.id === 'kazeha' && hb.x1 - hb.x0 >= 60 && hb.dmg >= 2, '前を広く');
  for (let i = 0; i < 40 && r.b.atk; i++) r.st({ r: true }); assert.equal(r.b.atk, null, '振り終わる');
});


t('技の選び方（X4 の決まり）：体力の残りで技の組を替え、組の中は重みつき。弱点以外を 7 回当てられると反撃。同じ乱数なら同じ動き', () => {
  for (const id of ['kazegiri', 'dakuryu', 'raikaku']) { const P = RB.PICK[id]; assert.ok(P && P.hi.length && P.lo.length && P.near, id); assert.notDeepEqual(P.hi.map(w => w[1]), P.lo.map(w => w[1]), id + ' 組が替わる'); }
  // 体力が半分を切ると lo の組から選ぶ（lo にしか重みの大きくない技が増える）
  const count = (id, hpk) => { const map = room(), Z = RB.make(map), e = Z.spawn(id, 20 * T, 2 * T, AR); Z.wake(e); e.hp = Math.floor(e.hpMax * hpk); e.stormCd = 999; const n = {};
    for (let i = 0; i < 12000; i++) { const st0 = e.state; Z.step(e, { x: 6 * T, y: 2 * T }); Z.stepShots(); if (e.state !== st0 && st0 === 'walk') n[e.state] = (n[e.state] || 0) + 1; if (e.hp <= 0) break; } return n; };
  const hi = count('kazegiri', 1), lo = count('kazegiri', .4); const r = n => (n.thrust_tele || 0) / ((n.dash_tele || 0) + 1);
  assert.ok(r(lo) > r(hi), '体力が減ると突きが増える ' + JSON.stringify({ hi, lo }));
  // 反撃：弱点以外を 7 回
  for (const id of ['kazegiri', 'dakuryu', 'raikaku']) { const map = room(), Z = RB.make(map), e = Z.spawn(id, 20 * T, 2 * T, AR); Z.wake(e); let n = 0;
    for (; n < 10; n++) { e.state = 'walk'; e.f = 5; Z.hurt(e, 1, e.x - 60, 'slash1'); if (e.state === RB.COUNTER.move[id]) break; } assert.equal(n + 1, RB.COUNTER.hits, id + ' 7 回目で反撃'); }
  // 同じ乱数の種なら同じ動き
  const trace = seed => { let s0 = seed; const rng = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; }; const Z = RB.make(room(), { rng }), e = Z.spawn('raikaku', 20 * T, 2 * T, AR); Z.wake(e); const o = []; for (let i = 0; i < 2000; i++) { Z.step(e, { x: 8 * T, y: 2 * T }); Z.stepShots(); o.push(e.state); } return o.join(); };
  assert.equal(trace(7), trace(7)); assert.notEqual(trace(7), trace(99));
});

console.log(`runner-hard-boss: ${n} ok`);
