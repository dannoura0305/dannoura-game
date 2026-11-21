// 境界ノアリス：物語の進行（noaris/engine.js）と台本（noaris/story/*.js）・表（noaris/config.js）
// ・台本：全場面の命令・話者・背景・行き先・エンディングが表にある
// ・選択肢の全部の道筋を辿ると、どれも GOOD / BAD / GAME OVER のどれかに着く（行き止まり・無限の回り道が無い）。白薔薇の三つの結末に届く
// ・ゲームオーバーでループ回数が増え、1 周の状態（好感度）は消え、名前は残り、ループの場面から始まる。ループ回数で台詞が変わる
// ・条件・既読・セーブとロード
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { console, Math, Object, Array, Number, JSON, String, Error };
vm.createContext(ctx);
const files = ['noaris/engine.js', 'noaris/config.js', ...readdirSync(join(ROOT, 'noaris/story')).filter(f => f.endsWith('.js')).sort().map(f => 'noaris/story/' + f)];
for (const f of files) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
const NA = ctx.NA;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

t('台本：全場面の話者・背景・人物・CG・行き先・エンディングが表にある・エリアの場面がある', () => {
  for (const [id, sc] of Object.entries(NA.SCENES)) for (const op of sc.ops) {
    const at = `${id}:${op.line}`;
    if (op.t === 'say' && !['n', 'me'].includes(op.who)) assert.ok(NA.CHARS[op.who], at + ' 話者 ' + op.who);
    if (op.t === 'choice') for (const o of op.opts) assert.ok(NA.SCENES[o.to], at + ' 行き先 ' + o.to);
    if (op.t !== 'cmd') continue;
    const a = op.args;
    if (op.name === 'bg') assert.ok(NA.BGS[a[0]], at + ' 背景 ' + a[0]);
    if (op.name === 'chara' && a[0] !== 'off') assert.ok(NA.CHARS[a[0]] && NA.CHARS[a[0]].art, at + ' 人物 ' + a[0]);
    if (op.name === 'cg' && a[0] !== 'off') assert.ok(NA.CGS[a[0]], at + ' CG ' + a[0]);
    if (op.name === 'jump') assert.ok(NA.SCENES[a[0]], at + ' 行き先 ' + a[0]);
    if (op.name === 'if') assert.ok(NA.SCENES[a[1]], at + ' 行き先 ' + a[1]);
    if (op.name === 'end' || op.name === 'gameover') assert.ok(NA.ENDINGS[op.name === 'end' ? (a[1] || a[0]) : a[0]], at + ' エンディング');
  }
  for (const a of NA.AREAS) if (a.open) assert.ok(NA.SCENES[a.scene], a.id);
  assert.equal(NA.AREAS.length, 5); assert.equal(NA.AREAS.filter(a => a.open).length, 1, '今は白薔薇の宮殿だけ');
  assert.ok(NA.ENDINGS.official && NA.ENDINGS.true, '正式エンド・トゥルーエンドの枠');
  assert.throws(() => NA.parse('x', ['#nanika']), /知らない命令/);
});

// 選択肢の全部の道筋（深さ優先）。名前は「テスト」、エリアは白薔薇
function walk(loop, endings = {}) {
  const ends = new Map(); let paths = 0; const seen = new Set();
  const go = (snap, depth) => {
    assert.ok(depth < 30, '選択が深すぎる（回り道）');
    const key = JSON.stringify([snap.scene, snap.ip, snap.vars]); if (seen.has(key)) return; seen.add(key);   // 同じ状態は一度だけ
    const T = NA.make({ meta: { loop, endings: Object.assign({}, endings) } }); T.restore(snap);
    for (let i = 0; i < 400; i++) {
      const e = T.advance();
      if (e.type === 'say') continue;
      if (e.type === 'name') { T.resolveName('テスト'); continue; }
      if (e.type === 'areas') { assert.ok(T.pickArea('rose')); continue; }
      if (e.type === 'choice') { const s = T.snapshot(); for (const o of e.options) { const U = NA.make({ meta: { loop, endings: Object.assign({}, endings) } }); U.restore(s); assert.ok(U.choose(o.i)); go(U.snapshot(), depth + 1); } return; }
      if (e.type === 'end' || e.type === 'gameover') { ends.set(e.id, (ends.get(e.id) || 0) + 1); paths++; return; }
      throw new Error('予想外：' + e.type);
    }
    throw new Error('進まない');
  };
  const T = NA.make({ meta: { loop, endings: Object.assign({}, endings) } }); T.newGame(); go(T.snapshot(), 0);
  return { ends, paths };
}
const ROSE_ENDS = ['rose_good', 'rose_normal', 'rose_bad', 'rose_go1', 'rose_go2', 'rose_go3'];
t('道筋：選択肢の全部の組み合わせが どれも結末に着く・白薔薇の GOOD / NORMAL / BAD / GAME OVER 3 つ に届く（ループ 0・1・3 回、塔と鳥籠を見た後）', () => {
  for (const [loop, endings] of [[0, {}], [1, {}], [3, { rose_go2: 1, rose_bad: 1 }]]) {
    const { ends, paths } = walk(loop, endings);
    for (const id of ROSE_ENDS) assert.ok(ends.get(id), `loop ${loop}: ${id} ${JSON.stringify([...ends])}`);
    assert.ok(ends.get('rose_good') < ends.get('rose_bad') + ends.get('rose_normal'), 'GOOD は選び方しだい（簡単すぎない）');
    void paths;
  }
});
t('白薔薇：主の名前（{w:rose_true}）は表の言葉で入る・GOOD には名前を聞く事が要る', () => {
  const g = NA.SCENES.rose_n5_02.ops[0]; assert.match(g.args[0], /rose_name/);
  const T = NA.make(); T.newGame('rose_n3_04', 'ノア'); T.run.vars.rose_love = 5; const e = []; for (let i = 0; i < 12; i++) { const x = T.advance(); e.push(x); if (x.type !== 'say') break; }
  assert.ok(e.some(x => x.text && x.text.includes(NA.WORDS.rose_true)), JSON.stringify(e.map(x => x.text)));
  assert.equal(T.run.vars.rose_name, 1);
});

t('ゲームオーバー → ループ：ループ回数が増え・好感度は消え・名前は残り・ループの場面 → 回廊（台詞がループ回数で変わる）', () => {
  const T = NA.make(); T.newGame();
  const texts = [];
  const until = (pred) => { for (let i = 0; i < 300; i++) { const e = T.advance(); if (e.type === 'say') texts.push(e.text); if (pred(e)) return e; if (e.type === 'name') T.resolveName('アリス'); if (e.type === 'areas') T.pickArea('rose'); } throw new Error('来ない'); };
  until(e => e.type === 'choice'); assert.ok(T.choose(0)); assert.equal(T.run.vars.rose_love, 2);
  for (let k = 0; k < 6; k++) { const c = until(e => e.type === 'choice'); const out = c.options.find(o => /外へ出てみる/.test(o.text)); if (out && T.run.scene !== 'rose_n1_bell') { assert.ok(T.choose(out.i)); break; } T.choose(0); }
  const go = until(e => e.type === 'gameover'); assert.equal(go.id, 'rose_go1'); assert.equal(go.loop, 1); assert.equal(T.meta.loop, 1);
  assert.equal(T.run.scene, 'loop'); assert.equal(T.run.vars.rose_love, undefined, '好感度は消える'); assert.equal(T.run.name, 'アリス', '名前は残る');
  texts.length = 0; const a = until(e => e.type === 'areas'); void a;
  assert.ok(texts.includes('――また、ここから。'), 'ループ 1 回目の幕間'); assert.ok(texts.some(s => /また、この回廊/.test(s)), '回廊の台詞が変わる');
  assert.ok(!texts.some(s => /名前を呼ばれた/.test(s)), '名前の場面には戻らない');
  T.pickArea('rose'); texts.length = 0; until(e => e.type === 'choice'); assert.ok(texts.includes('――おかえり。') && !texts.includes('――ようこそ、白薔薇の宮殿へ。'), '白薔薇の主の第一声もループで変わる');
});

t('条件・既読・セーブとロード（途中の選択肢でも）', () => {
  const T = NA.make({ meta: { loop: 2, endings: { rose_good: 1 } } }); T.newGame();
  assert.ok(T.test('loop>=2&end_rose_good&!rose')); assert.ok(!T.test('loop==1'));
  const e1 = T.advance(); assert.equal(e1.type, 'say'); assert.equal(e1.read, false);
  const U = NA.make({ meta: T.meta }); U.newGame(); assert.equal(U.advance().read, true, '既読は周回をまたいで残る');
  for (let i = 0; i < 200; i++) { const e = T.advance(); if (e.type === 'name') T.resolveName('ノア'); if (e.type === 'areas') T.pickArea('rose'); if (e.type === 'choice') break; }
  const snap = JSON.parse(JSON.stringify(T.snapshot())); assert.equal(snap.pending.type, 'choice');
  const V = NA.make({ meta: T.meta }); assert.ok(V.restore(snap)); const ev = V.advance(); assert.equal(ev.type, 'choice', '選択肢の途中から再開'); assert.equal(V.run.name, 'ノア');
  assert.equal(V.view().bg, 'rose_gate'); assert.equal(V.view().chara, 'rose');
  assert.ok(!V.restore({ scene: 'nai' }), '壊れたセーブは読まない');
});

t('台本の版が変わった古いセーブ：その場面の頭から（選択の待ちは捨てる）・今の版のセーブはそのまま', () => {
  const T = NA.make(); T.newGame('rose_n2_01', 'ノア'); for (let i = 0; i < 5; i++) T.advance();
  const now = T.snapshot(); assert.equal(now.ver, NA.SCRIPT_VER);
  const U = NA.make(); assert.ok(U.restore(now)); assert.equal(U.run.ip, T.run.ip);
  const old = Object.assign({}, now, { ver: NA.SCRIPT_VER - 1, ip: 999, pending: { type: 'choice', ip: 3 } });
  const V = NA.make(); assert.ok(V.restore(old)); assert.equal(V.run.ip, 0); assert.equal(V.run.pending, null); assert.equal(V.advance().type, 'say');
});

console.log(`noaris-engine: ${n} ok`);
