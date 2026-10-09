// 『境界事象』バトル（kyokai/battle.js）のロジックテスト：engine.js・systems.js・battle.js を node:vm で DOM なしに読み込む
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['kyokai/engine.js', 'kyokai/systems.js', 'kyokai/battle.js'];
const read = f => readFileSync(join(ROOT, f), 'utf8');

function makeLS() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function load() {
  const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval, localStorage: makeLS() };
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(read(f), ctx, { filename: f });
  const KY = ctx.KY;
  KY._setState(KY._fresh('テスト'));
  return { ctx, KY, B: ctx.KY_BATTLE, LS: ctx.localStorage };
}
// 決まった乱数
function seq(vals) { let i = 0; return () => vals[(i++) % vals.length]; }

let pass = 0, fail = 0;
const T = [];
const test = (name, fn) => T.push([name, fn]);

test('属性の三すくみ：揺らぎ→空白→残響→揺らぎ（1.5 倍／0.67 倍）・観測は等倍', () => {
  const { B } = load();
  assert.equal(B.typeMul('flux', 'void'), 1.5);
  assert.equal(B.typeMul('void', 'echo'), 1.5);
  assert.equal(B.typeMul('echo', 'flux'), 1.5);
  assert.equal(B.typeMul('void', 'flux'), 0.67);
  assert.equal(B.typeMul('echo', 'void'), 0.67);
  assert.equal(B.typeMul('flux', 'echo'), 0.67);
  for (const t of ['flux', 'void', 'echo']) { assert.equal(B.typeMul(t, t), 1); assert.equal(B.typeMul('none', t), 1); assert.equal(B.typeMul(t, 'none'), 1); }
});

test('ダメージ計算：式どおり・弱点 1.5 倍・急所・最低 1・能力の段階', () => {
  const { B } = load();
  const mv = B.MOVES.isou;   // 揺らぎ 50
  // floor(floor((2*10/5+2)*50*20/16)/50)+2 = floor(floor(375)/50)+2 = 7+2 = 9
  const base = B.damage({ lv: 10, atk: 20 }, { def: 16, type: 'echo' }, mv);
  assert.equal(base.dmg, Math.floor(9 * 0.67));
  const se = B.damage({ lv: 10, atk: 20 }, { def: 16, type: 'void' }, mv);
  assert.equal(se.dmg, Math.floor(9 * 1.5)); assert.equal(se.mul, 1.5);
  const neu = B.damage({ lv: 10, atk: 20 }, { def: 16, type: 'flux' }, mv);
  assert.equal(neu.dmg, 9);
  assert.equal(B.damage({ lv: 10, atk: 20 }, { def: 16, type: 'flux' }, mv, { crit: true }).dmg, Math.floor(9 * 1.5));
  assert.equal(B.damage({ lv: 10, atk: 20, type: 'flux' }, { def: 16, type: 'flux' }, mv).dmg, Math.floor(9 * 1.2), '同じ属性の技は 1.2 倍');
  assert.equal(B.damage({ lv: 1, atk: 1 }, { def: 999, type: 'echo' }, mv).dmg >= 1, true, '最低 1');
  assert.ok(B.damage({ lv: 10, atk: 20, stage: 2 }, { def: 16, type: 'flux' }, mv).dmg > 9, '攻撃の段階が上がると増える');
  assert.ok(B.damage({ lv: 10, atk: 20, stage: -2 }, { def: 16, type: 'flux' }, mv).dmg < 9);
  assert.equal(B.damage({ lv: 10, atk: 20 }, { def: 16 }, B.MOVES.tomoshi).dmg, 0, '補助技はダメージなし');
  assert.ok(B.damage({ lv: 10, atk: 20, bonus: 1.3 }, { def: 16, type: 'flux' }, mv).dmg > 9, '同期の補正');
});

test('Lv アップ：経験値の曲線・能力の上がり方・技を覚える Lv・上限 30', () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true);
  const d = B.shiro();
  assert.equal(d.lv, 1); assert.deepEqual(Array.from(d.moves, m => m.id), ['kansoku', 'isou']);
  assert.equal(d.hp, B.shiroStats(1).hp);
  const ups = B.gainExp(B.expAt(4));
  assert.equal(d.lv, 4);
  assert.deepEqual(Array.from(ups, u => u.lv), [2, 3, 4]);
  assert.deepEqual(Array.from(ups[2].learn), ['zankyo'], 'Lv4 で残響返し');
  assert.equal(ups[0].gains.hp, B.shiroStats(2).hp - B.shiroStats(1).hp);
  // 能力は Lv とともに増える
  for (let L = 1; L < 30; L++) { const a = B.shiroStats(L), b = B.shiroStats(L + 1); assert.ok(b.hp > a.hp && b.atk >= a.atk && b.def >= a.def && b.spd >= a.spd); }
  B.gainExp(10 ** 7);
  assert.equal(d.lv, B.CAP); assert.equal(d.lv, 30);
  assert.equal(d.exp, B.expAt(30));
  assert.equal(B.gainExp(5000).length, 0, '上限のあとは上がらない');
});

test('戦闘の勝ち：経験値・Lv アップ・新しい技（4 つまで。満杯なら忘れる技を選ぶ）', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch06';
  B.rng = seq([0.3, 0.1, 0.9, 0.5]);
  const d = B.shiro();
  d.lv = 9; d.exp = B.expAt(9); d.hp = B.shiroStats(9).hp;
  d.moves = [{ id: 'kansoku', pp: 35 }, { id: 'isou', pp: 20 }, { id: 'zankyo', pp: 20 }, { id: 'tomoshi', pp: 8 }];
  d.exp = B.expAt(10) - 1;
  KY._auto.learn = 0;   // 観測光を忘れる
  const r = await B.start('noise_mushi', { lv: 3, world: 'B' });
  assert.equal(r.result, 'win');
  assert.equal(d.lv, 10);
  assert.ok(d.moves.some(m => m.id === 'yohaku'), 'Lv10 で余白つつき');
  assert.ok(!d.moves.some(m => m.id === 'kansoku'), '選んだ技を忘れた');
  assert.equal(d.moves.length, 4);
  assert.equal(d.wins, 1);
  assert.ok(d.seen.noise_mushi, '倒した相手は観測済み');
  assert.ok(KY._auto.battleLog.some(t => /Lv10に あがった/.test(t)));
});

test('出現：シロと出会う前は null・研究所は null・観測層 C の危険度で出る・戦闘直後は少し出ない', () => {
  const { KY, B } = load();
  KY.state.chapter = 'ch08';
  B.rng = () => 0;   // 必ず「当たる」乱数
  assert.equal(B.encounter({ area: 'empty_town', world: 'C', danger: 4, chapter: 'ch08' }), null, 'shiro_met 前');
  KY.flag('shiro_met', true);
  const id = B.encounter({ area: 'empty_town', world: 'C', danger: 4, chapter: 'ch08' });
  assert.ok(id && B.ENEMIES[id] && !B.ENEMIES[id].boss, 'C ではボス以外が出る');
  assert.equal(B.encounter({ area: 'center_lab', world: 'C', danger: 3, chapter: 'ch08' }), null, '研究所は出ない');
  assert.equal(B.encounter({ area: 'shotengai', world: 'A', danger: 0, chapter: 'ch08' }), null, 'A の危険度 0 は出ない');
  assert.equal(B.rate({ area: 'shotengai', world: 'A', danger: 0 }), 0);
  assert.ok(B.rate({ area: 'x', world: 'C', danger: 5 }) > B.rate({ area: 'x', world: 'C', danger: 1 }), '危険度が高いほど出やすい');
  B.rng = () => 0.999;
  assert.equal(B.encounter({ area: 'empty_town', world: 'C', danger: 5, chapter: 'ch08' }), null, '乱数が外れなら出ない');
  // 出る相手は章と層で変わる
  const t5 = B.table({ world: 'C', chapter: 'ch05' }).map(x => x.id), t14 = B.table({ world: 'C', chapter: 'ch14', area: 'collapse' }).map(x => x.id);
  assert.ok(t5.includes('shizuku') && !t5.includes('sakasa'));
  assert.ok(t14.includes('sakasa') && t14.includes('musubikuzu') && !t14.includes('noise_mushi'));
  assert.ok(B.table({ world: 'B', chapter: 'ch08', area: 'station' }).some(x => x.id === 'kaisatsu'));
  // シロが倒れていると出ない
  B.rng = () => 0; B.shiro().hp = 0;
  assert.equal(B.encounter({ area: 'empty_town', world: 'C', danger: 4, chapter: 'ch08' }), null);
});

test('野生戦の負け：安定度 −20・研究所へ退く（G.slipNow・観測層 A）・シロは研究所で休む', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch05';
  KY.state.stability = 70; KY.state.world = 'C'; KY.state.baseWorld = 'C';
  B.rng = () => 0.5;
  const d = B.shiro(); d.hp = 1;
  const r = await B.start('sakasa', { lv: 30, world: 'C' });
  assert.equal(r.result, 'lose');
  assert.equal(r.retreat, true);
  assert.equal(KY.state.stability, 50);
  assert.equal(KY._G.slipNow, true, '探索ループが研究所へ戻す');
  assert.equal(KY.state.world, 'A');
  assert.equal(d.hp, B.shiroStats(d.lv).hp, '研究所で休んで全快');
  assert.equal(d.losses, 1);
});

test('負けて安定度が 0 になると、いつもの「押し戻し」（slip）：安定度 30・slipped +1', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch05';
  KY.state.stability = 15;
  B.rng = () => 0.5;
  B.shiro().hp = 1;
  const r = await B.start('sakasa', { lv: 30, world: 'C' });
  assert.equal(r.result, 'lose');
  assert.equal(KY.state.stability, 30);
  assert.equal(KY.get('slipped'), 1);
});

test('逃げる：野生は確率で逃げられる／ボスは逃げられない（K.battle は勝つまで再挑戦）', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch08';
  B.rng = () => 0.01;
  KY._auto.battle.push('run');
  const r = await B.start('noise_mushi', { lv: 8, world: 'C' });
  assert.equal(r.result, 'run');
  // ボス：にげる → 「逃げられない」で戦闘は続く（ターンは進まない）
  KY._auto.battle.push('run', 'run');
  KY._auto.battleLog.length = 0;
  B.rng = () => 0.5;
  const r2 = await B.start('yodomi', { lv: 2, boss: true, world: 'C' });
  assert.notEqual(r2.result, 'run');
  assert.equal(KY._auto.battleLog.filter(t => /逃げられない/.test(t)).length, 2);
  // canRun:false の野生も逃げられない
  KY._auto.battle.push('run'); KY._auto.battleLog.length = 0;
  const r3 = await B.start('noise_mushi', { lv: 2, world: 'C', canRun: false });
  assert.notEqual(r3.result, 'run');
  assert.ok(KY._auto.battleLog.some(t => /逃げられない/.test(t)));
});

test('K.battle（ボス）：負けたら安定度 −20 → シロ回復・ユウの支援で再挑戦 → 勝って戻る', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch13'; KY.state.stability = 90;
  B.rng = () => 0.5;
  let starts = 0; const orig = B.start;
  B.start = function (id, o) { starts++; return orig.call(this, id, Object.assign({}, o, { lv: starts === 1 ? 30 : 3 })); };   // 1 回目は勝てない強さ・2 回目は弱い
  const res = await KY.battle('kikou9', { lv: 18, intro: ['n:前口上'], outro: ['n:後口上'] });
  assert.equal(res.result, 'win');
  assert.ok(starts >= 2, '負けたら再挑戦');
  assert.equal(starts, 2); assert.equal(KY.state.stability, 70, '負け 1 回で −20');
  assert.ok(KY._auto.log.some(t => /前口上/.test(t)) && KY._auto.log.some(t => /後口上/.test(t)));
  assert.ok(KY._auto.log.some(t => /弱点を突け/.test(t)), 'ユウの助言');
  assert.equal(KY._G.slipNow, undefined, 'ボス戦の負けで研究所へは戻されない');
});

test('ボス戦の負けは安定度 1 で止まり、押し戻し（slipped）を増やさない（END B の条件を守る）', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch14'; KY.state.stability = 12;
  B.rng = () => 0.5;
  const r = await B.start('musubi_ban', { lv: 30, boss: true });
  assert.equal(r.result, 'lose');
  assert.equal(KY.state.stability, 1);
  assert.equal(KY.get('slipped'), undefined);
  assert.notEqual(KY._G.slipNow, true);
});

test('章の下限 Lv：遊んでいなくても物語の節目でシロが追いつく（技も入れ替わる）', () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true);
  KY.state.chapter = 'ch05'; assert.equal(B.catchUp(), null);
  KY.state.chapter = 'ch14';
  const c = B.catchUp();
  assert.equal(c.from, 1); assert.equal(c.to, B.FLOOR[14]);
  const d = B.shiro();
  assert.equal(d.lv, 20); assert.equal(d.moves.length, 4);
  assert.ok(d.moves.some(m => m.id === 'tomoshi'), '回復技は残す');
  assert.ok(d.moves.every(m => B.MOVES[m.id].pp > 0));
});

test('もちもの：医療用品・安定剤でシロ回復、懐中電灯で目くらまし、端末スキャンで弱点（数は K の消耗品と同じ）', async () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true); KY.state.chapter = 'ch08';
  KY.equip('phone'); KY.equip('flashlight');
  KY.state.items = { battery: 3, light: 2, med: 1, stab: 1 };
  B.rng = () => 0.5;
  const d = B.shiro(); B.catchUp(); d.hp = 3;
  KY._auto.battle.push({ cmd: 'item', id: 'med' }, { cmd: 'item', id: 'stab' }, { cmd: 'item', id: 'light' }, { cmd: 'item', id: 'battery' });
  KY._auto.battleLog.length = 0;
  const r = await B.start('otokage', { lv: 6, world: 'C' });
  assert.equal(r.result, 'win');
  assert.deepEqual({ ...KY.state.items }, { battery: 2, light: 1, med: 0, stab: 0 });
  const L = KY._auto.battleLog.join('\n');
  assert.match(L, /HPが \d+ 回復した/); assert.match(L, /全快/); assert.match(L, /目が くらんで/); assert.match(L, /弱点を 突く/);
  assert.equal(d.seen.otokage, 2, 'スキャンで観測済み');
});

test('研究所で休む：center_* の場面に入るとシロが全快（技の残りも）', () => {
  const { KY, B } = load();
  KY.flag('shiro_met', true);
  KY._G.running = true;
  const d = B.shiro(); d.hp = 1; d.moves[0].pp = 0;
  KY.scene('shrine', 'A');
  assert.equal(d.hp, 1);
  KY.scene('center_lab', 'A');
  assert.equal(d.hp, B.shiroStats(d.lv).hp);
  assert.equal(d.moves[0].pp, B.MOVES[d.moves[0].id].pp);
  KY._G.running = false;
});

test('セーブ：シロの記録（Lv・経験値・HP・技）は kyokai_save_v1 に入り、ロードで戻る。本編のキーには触れない', () => {
  const { KY, B, LS } = load();
  KY.flag('shiro_met', true);
  B.gainExp(B.expAt(12));
  const d = B.shiro(); d.hp = 7; d.moves[1].pp = 3; d.seen.kodama = 1; d.wins = 4;
  KY._G.running = true;
  assert.ok(KY.save(false));
  KY._G.running = false;
  const raw = JSON.parse(LS.getItem('kyokai_save_v1'));
  assert.equal(raw.flags.bt.lv, 12);
  const s = KY.loadSave(false);
  KY._setState(s);
  const d2 = B.shiro();
  assert.equal(d2.lv, 12); assert.equal(d2.hp, 7); assert.equal(d2.moves[1].pp, 3); assert.equal(d2.seen.kodama, 1); assert.equal(d2.wins, 4);
  assert.equal(d2.exp, B.expAt(12));
  for (const k of LS._m.keys()) assert.ok(!/^dannoura_/.test(k), '本編のキーを書いた ' + k);
  // 壊れた記録は直す
  KY.state.flags.bt = { lv: 99, hp: -5, moves: [{ id: 'nope', pp: 3 }] };
  const d3 = B.shiro();
  assert.equal(d3.lv, 30); assert.equal(d3.hp, 0); assert.ok(d3.moves.length >= 1 && d3.moves.every(m => B.MOVES[m.id]));
});

test('データ：敵 13 種＋ボス 4 体・技の属性・絵がある。章のボス戦は定義済みの敵を呼ぶ。だんのうらは出ない', () => {
  const { B } = load();
  const ids = Object.keys(B.ENEMIES);
  const boss = ids.filter(id => B.ENEMIES[id].boss), wild = ids.filter(id => !B.ENEMIES[id].boss);
  assert.ok(wild.length >= 12 && wild.length <= 15, '野生 ' + wild.length);
  assert.ok(boss.length >= 3 && boss.length <= 4);
  for (const id of ids) {
    const e = B.ENEMIES[id];
    assert.ok(B.TYPES[e.type] && e.type !== 'none', id + ' の属性');
    assert.equal(e.base.length, 4);
    for (const m of e.moves) assert.ok(B.MOVES[m], id + ' の技 ' + m);
    const g = B.sprite(id, 0);
    let n = 0; for (const v of g) if (v >= 0) n++;
    assert.ok(n > 80, id + ' の絵が描けていない');
    assert.doesNotMatch(e.name + e.desc, /だんのうら/);
  }
  for (const [, m] of B.LEARN) assert.ok(B.MOVES[m] && B.MOVES[m].pp > 0);
  // 章ファイルの K.battle('id') はすべて定義済みのボス
  const calls = [];
  for (const c of ['05', '08', '13', '14']) { const src = read(`kyokai/story/ch${c}.js`); for (const m of src.matchAll(/K\.battle\('([a-z0-9_]+)'/g)) calls.push(m[1]); }
  assert.ok(calls.length >= 4);
  for (const id of calls) assert.ok(B.ENEMIES[id] && B.ENEMIES[id].boss, id);
  assert.doesNotMatch(read('kyokai/battle.js'), /['"`]dannoura_|localStorage\.(setItem|removeItem)/);
});

for (const [name, fn] of T) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join('\n    ')); }
}
console.log(`kyokai-battle: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
