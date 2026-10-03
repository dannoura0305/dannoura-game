// 家・庭の物語（窓辺の小さな約束）・思い出帳・本編連動のテスト
// node:vm に catalog/state/placement/crafting と events/memories/integrations を読み込み、
// 会話UI（HOME.ui）と本編の関数（nextDay など）はスタブにする。
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = ['main/home/catalog.js', 'main/home/state.js', 'main/home/placement.js', 'main/home/crafting.js'].filter(f => existsSync(join(ROOT, f)));
// フェーズ2の bonds / life_events も一緒に読み込み、フェーズ1の流れを壊していないことを確かめる
const MINE = ['main/home/events.js', 'main/memories.js', 'main/home/bonds.js', 'main/home/life_events.js', 'main/integrations.js'].filter(f => existsSync(join(ROOT, f)));

// 本編（game.js / minigames/core.js）の必要な部分だけを真似たスタブ
const GAME_STUB = `
var gs={day:1,hour:22,min:0,mental:50,fatigue:10};
var __notifs=[];var __saves=0;
var SAVE_KEY='dannoura_save_v1';
var localStorage={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}};
function showNotif(m){__notifs.push(m);}
function saveGame(){__saves++;localStorage.setItem(SAVE_KEY,JSON.stringify({gs:gs}));return true;}
function saveDataToGs(saved){
  Object.keys(gs).forEach(k=>{if(!(k in saved)&&(k==='rpg'||k==='story'||k==='mgDay'||/Data$/.test(k)))delete gs[k];});
  Object.assign(gs,saved);
}
function nextDay(){gs.day++;saveGame(true);}
var ff=0;
function endFactory(){}
function handleChoice(ac){}
const MG={def:null,_ended:true,finish(r){if(this._ended)return;this._ended=true;if(r&&r.after)r.after();}};
`;

function makeSandbox() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(GAME_STUB, ctx, { filename: 'game-stub.js' });
  for (const f of BASE) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  // 会話UIのスタブ：choice/prompt は台本（answers）の先頭から答える
  const ui = { said: [], asked: [], answers: [], toasts: [] };
  vm.runInContext(`HOME.ui={
    say(lines){__ui.said.push(...lines);return Promise.resolve();},
    choice(q,opts){__ui.asked.push(q);const a=__ui.answers.length?__ui.answers.shift():0;return Promise.resolve(a);},
    prompt(label,def,max){__ui.asked.push(label);const a=__ui.answers.length?__ui.answers.shift():def;return Promise.resolve(a);},
    toast(t){__ui.toasts.push(t);}
  };`, Object.assign(ctx, { __ui: ui }));
  for (const f of MINE) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  return { ctx, H: ctx.HOME, ui, run, gs: () => run('gs') };
}

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const memIds = H => Array.from(H.memories.list(), m => m.id);
function setDay(S, d) { S.run(`gs.day=${d}`); }
// 植物を手早く育てる（毎日水をあげて日送り）
function growDays(S, n) {
  const s = S.H.events.state();
  for (let i = 0; i < n; i++) { S.H.water(s.potId); S.run('nextDay()'); }
}
// 5日目に家を開いて受諾 → 色(index) → 場所(0=庭,1=部屋) → 名前
async function plantFlow(S, { color = 0, area = 0, name = 'ひなた' } = {}) {
  setDay(S, 5);
  S.ui.answers.push(0, color, area, name);
  const r = await S.H.hooks.onOpen('room');
  assert.equal(r, true);
  return S.H.events.state();
}

console.log('home-story');

await test('花の名前：空欄は「ひなた」、前後の空白・制御文字・山かっこを除き最大8文字', () => {
  const { H } = makeSandbox();
  const z = H.events.sanitizeName;
  assert.equal(z(''), 'ひなた');
  assert.equal(z('   '), 'ひなた');
  assert.equal(z(null), 'ひなた');
  assert.equal(z(undefined), 'ひなた');
  assert.equal(z('  さくら  '), 'さくら');
  assert.equal(z('あいうえおかきくけこ'), 'あいうえおかきく');
  assert.equal(z('a\u0000b\nc'), 'abc');
  assert.equal(z('a  b'), 'a b');
  assert.equal(z('<img src=x onerror=alert(1)>'), 'img src=');
  assert.ok(z('😀😀😀😀😀😀😀😀😀').length <= 8);
  assert.ok(!/[\uD800-\uDBFF]$/.test(z('あ😀😀😀😀')), '絵文字が途中で割れない');
});

await test('1 開始：5日目より前は何も起きない。断っても同じ日にくり返し迫らない／後日また話せる', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  setDay(S, 4);
  assert.equal(await H.hooks.onOpen('room'), false);
  assert.equal(H.events.state().step, 0);
  setDay(S, 5);
  ui.answers.push(1);                                   // 「また今度ね」
  assert.equal(await H.hooks.onOpen('room'), true);
  const s = H.events.state();
  assert.equal(s.step, 0); assert.equal(s.declinedDay, 5);
  assert.deepEqual(memIds(H), []);
  assert.ok(!ui.said.some(l => /だめ|しなさい|どうして/.test(l.text)), '責めない');
  assert.equal(await H.hooks.onOpen('room'), false, '同じ日に家を開き直しても再度は聞かない');
  // 話しかければ、いつでも続きから
  ui.answers.push(0, 2, 1, 'ひまわり');
  assert.equal(await H.hooks.talkKid(), true);
  assert.equal(H.events.state().step, 2);
  assert.equal(H.events.state().name, 'ひまわり');
});

await test('2 植える：鉢を選んだ場所に置き、植物と思い出（配置の写し）を記録', async () => {
  const S = makeSandbox(); const { H } = S;
  const s = await plantFlow(S, { color: 1, area: 1, name: '  あおぞら  ' });
  assert.equal(s.step, 2); assert.equal(s.color, 'blue'); assert.equal(s.area, 'room'); assert.equal(s.name, 'あおぞら');
  const f = H.findPlacement(s.potId);
  assert.ok(f, '鉢が配置されている'); assert.equal(f.area, 'room'); assert.equal(f.P.variant, 'blue');
  assert.ok(H.reachable('room', H.data().room.placements).ok, '出入口・通路をふさがない');
  assert.equal(H.data().plants[s.potId].name, 'あおぞら');
  assert.equal(H.owned('garden.pot', 'blue'), 1);
  const ids = memIds(H);
  assert.deepEqual(ids, ['wp.1.start', 'wp.2.plant']);
  const m = H.memories.get('wp.2.plant');
  assert.equal(m.snapshot.area, 'room');
  assert.ok(m.snapshot.placements.some(p => p.instanceId === s.potId));
  assert.ok(JSON.stringify(m).length < 4000, 'スナップショットは配置データだけ（小さい）');
});

await test('2 植える：置ける場所が無ければ収納へ（やさしく伝える）→ 後で置いたら植物をつなぎ直す', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  const origCan = H.canPlace;
  H.canPlace = () => ({ ok: false, reason: 'full', cells: [] });
  const s = await plantFlow(S, { color: 2, area: 0 });
  H.canPlace = origCan;
  assert.equal(s.step, 2); assert.equal(s.stored, true);
  assert.equal(H.findPlacement(s.potId), null);
  assert.equal(H.stored('garden.pot', 'yellow'), 1);
  assert.ok(H.data().plants[s.potId], '植物は記録されている');
  assert.ok(ui.toasts.some(t => /収納/.test(t)));
  assert.ok(ui.said.some(l => /しまっておく/.test(l.text)));
  // 模様替えで鉢を置いた（別の instanceId）
  const hd = H.data();
  hd.garden.placements.push({ instanceId: 'p900', itemId: 'garden.pot', x: 3, y: 9, rotation: 0, variant: 'yellow', layer: 'furniture' });
  H.events.tick();
  assert.equal(H.events.state().potId, 'p900');
  assert.ok(hd.plants.p900);
});

await test('3〜5 の段階は日数と行動の両方で一度ずつ。再読込しても思い出・報酬が増えない', async () => {
  const S = makeSandbox(); const { H, run } = S;
  const s0 = await plantFlow(S, { color: 0, area: 0, name: 'ひなた' });
  const planted = s0.plantedDay;
  // 植えて2日後：まだ名札は来ない
  growDays(S, 2);
  assert.equal(await H.hooks.onOpen('room'), false);   // 庭だと千代さん（フェーズ2）が来るので部屋で確かめる
  growDays(S, 1);                                       // 3日後
  assert.equal(H.events.state().step, 2);
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.equal(H.events.state().step, 3);
  assert.equal(H.owned('memento.flower_tag'), 1);
  assert.ok(gsDay(S) >= planted + 3);
  // 再読込（JSON往復）
  const reload = () => { const data = JSON.parse(JSON.stringify(run('gs'))); run('saveDataToGs')(data); };
  reload();
  assert.equal(H.events.state().step, 3, '再読込しても段階は保たれる');
  assert.equal(H.memories.list().filter(m => m.id === 'wp.3.tag').length, 1);
  // 名札をもう一度渡す状況を作っても（step を戻しても）報酬は一度きり
  const s = H.events.state(); const back = s.step; s.step = 2;
  await H.hooks.onOpen('garden');
  assert.equal(H.owned('memento.flower_tag'), 1, '名札は一つだけ');
  s.step = Math.max(back, H.events.state().step);
  // 4 育つ（葉が増えたら）
  while (H.data().plants[H.events.state().potId].stage < 2) growDays(S, 1);
  if (H.events.state().step < 4) assert.equal(await H.hooks.onOpen('garden'), true);
  assert.equal(H.events.state().step, 4);
  // 5 振り返り：つぼみでも23日目より前は話さない
  while (H.data().plants[H.events.state().potId].stage < 3) growDays(S, 1);
  if (gsDay(S) < 23) {
    assert.equal(await H.hooks.onOpen('room'), false);
    setDay(S, 23);
  }
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.equal(H.events.state().step, 5);
  assert.ok(S.ui.said.some(l => l.who === 'kid' && /パパが帰ってきたとき、見えるところにしたかったの/.test(l.text)));
  const before = memIds(H).slice();
  assert.deepEqual(before, ['wp.1.start', 'wp.2.plant', 'wp.3.tag', 'wp.4.grow', 'wp.5.reason']);
  reload();
  for (let i = 0; i < 3; i++) { await H.hooks.onOpen('garden'); await H.hooks.talkKid(); }
  assert.deepEqual(memIds(H).filter(id => /^wp\./.test(id)), before, '再読込・何度開いても思い出は増えない（生活イベントの思い出は別）');
  assert.equal(new Set(memIds(H)).size, memIds(H).length);
});
function gsDay(S) { return S.run('gs.day'); }

await test('鉢を使う：水やりは1日1回、責めない文言', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  const s = await plantFlow(S);
  S.run('nextDay()');
  const P = H.findPlacement(s.potId).P;
  ui.answers.push(0);
  assert.equal(await H.hooks.useItem(P), true);
  assert.equal(H.data().plants[s.potId].lastWateredDay, gsDay(S));
  ui.answers.push(0);
  await H.hooks.useItem(P);
  assert.ok(ui.said.some(l => /今日は、これで十分/.test(l.text)));
  // 名札：名前を読む（textContent で出す前提の素の文字列）
  assert.equal(await H.hooks.useItem({ instanceId: 'x', itemId: 'memento.flower_tag' }), true);
  assert.equal(await H.hooks.useItem({ instanceId: 'y', itemId: 'furniture.bookshelf' }), false, '他の家具は扱わない');
});

await test('娘のいつもの会話は家具（クマ・絵・ランタン）で変わる', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  setDay(S, 2);
  const texts = new Set();
  for (let i = 0; i < 6; i++) { ui.said.length = 0; await H.hooks.talkKid(); ui.said.filter(l => l.who === 'kid').forEach(l => texts.add(l.text)); }
  assert.ok([...texts].some(t => /くまさん、あそこで/.test(t)), 'クマが置いてあるとき');
  // クマを収納、絵とランタン（点灯）を置く
  const hd = H.data();
  hd.room.placements = hd.room.placements.filter(p => p.itemId !== 'memento.bear');
  H.addItem('memento.child_drawing', 1); H.addItem('light.shell_lantern', 1);
  hd.room.placements.push({ instanceId: 'p700', itemId: 'memento.child_drawing', x: 6, y: 0, rotation: 0, variant: 'default', layer: 'wall' });
  hd.room.placements.push({ instanceId: 'p701', itemId: 'light.shell_lantern', x: 8, y: 6, rotation: 0, variant: 'default', layer: 'furniture' });
  hd.flags.lit = { p701: true };
  texts.clear();
  for (let i = 0; i < 8; i++) { ui.said.length = 0; await H.hooks.talkKid(); ui.said.filter(l => l.who === 'kid').forEach(l => texts.add(l.text)); }
  const all = [...texts].join('\n');
  assert.ok(/くまさんも、パパとおはなし/.test(all));
  assert.ok(/わたしのえ、かざって/.test(all));
  assert.ok(/ランタン、ついてると/.test(all));
});

await test('貝殻ランタンのレシピ：RPG第2章クリアで一度だけ（再挑戦・見返し・再読込でも増えない）', () => {
  const S = makeSandbox(); const { H, run } = S;
  H.ensure();
  assert.equal(H.hasRecipe('shell_lantern'), false);
  const play = (id, cleared) => { run(`MG.def={id:'${id}'};MG._ended=false;`); run('MG').finish({ after() { run(`gs.rpg=gs.rpg||{cleared:0};gs.rpg.cleared=Math.max(gs.rpg.cleared,${cleared});`); } }); };
  play('rpg', 1);
  assert.equal(H.hasRecipe('shell_lantern'), false);
  const sea1 = H.data().materials.sea;
  assert.ok(sea1 >= 1, '第1章クリアで海のかけら');
  play('rpg', 2);
  assert.equal(H.hasRecipe('shell_lantern'), true);
  const n1 = run('__notifs').filter(t => /貝殻ランタン/.test(t)).length;
  assert.equal(n1, 1);
  const sea2 = H.data().materials.sea;
  play('rpg', 2);                                       // 見返し（cleared 変わらず）
  H.integrations.syncRpg(false);
  const data = JSON.parse(JSON.stringify(run('gs'))); run('saveDataToGs')(data);
  H.integrations.syncRpg(false);
  assert.equal(run('__notifs').filter(t => /貝殻ランタン/.test(t)).length, 1, '通知は一度だけ');
  assert.equal(H.memories.list().filter(m => m.id === 'rpg.ch2.lantern').length, 1);
  assert.equal(H.data().materials.sea, sea2, '見返しで素材は増えない');
  assert.equal(H.data().unlockedRecipes.filter(r => r === 'shell_lantern').length, 1);
});

await test('古いセーブ（第2章クリア済み・家なし）を読み込むとレシピが解放される（通知なし）', () => {
  const S = makeSandbox(); const { H, run } = S;
  run('saveDataToGs')({ day: 12, rpg: { cleared: 3 } });
  assert.equal(H.hasRecipe('shell_lantern'), true);
  assert.equal(run('__notifs').filter(t => /貝殻ランタン/.test(t)).length, 0);
});

await test('素材は1日1回ずつ（工場・子育て・釣り）', () => {
  const S = makeSandbox(); const { H, run } = S;
  H.ensure();
  const m = () => Object.assign({}, H.data().materials);
  const m0 = m();
  run('ff=3'); run('endFactory()'); run('endFactory()');
  const m1 = m();
  assert.equal((m1.wood + m1.metal) - (m0.wood + m0.metal), 1);
  run('ff=0'); run('nextDay()'); run('endFactory()');
  assert.equal((m().wood + m().metal), (m1.wood + m1.metal), '何も直さなかった日はなし');
  run('ff=2'); run('endFactory()');
  assert.equal((m().wood + m().metal), (m1.wood + m1.metal) + 1);
  const c0 = m().cloth;
  run("handleChoice('childcare');handleChoice('childcare');handleChoice('study')");
  assert.equal(m().cloth, c0 + 1);
  const s0 = m().sea;
  const fish = (hope) => { run("MG.def={id:'fishing'};MG._ended=false;"); run('MG').finish({ fx: hope ? { mental: 6, hope: 2 } : { mental: 2 } }); };
  fish(false); assert.equal(m().sea, s0, '早めにやめたときはなし');
  fish(true); fish(true); assert.equal(m().sea, s0 + 1);
  assert.ok(run('__notifs').some(t => /持ち帰りを許可された端材/.test(t)));
});

await test('新規ゲーム／別のセーブを読み込むと、前の家・思い出は残らない', async () => {
  const S = makeSandbox(); const { H, run } = S;
  await plantFlow(S);
  assert.ok(H.memories.list().length > 0);
  run('saveDataToGs')({ day: 3, mental: 60 });
  assert.equal(H.memories.list().length, 0);
  assert.equal(H.events.state().step, 0);
  assert.deepEqual(Object.keys(H.data().plants), []);
});

await test('エンディングの振り返り：花が配置中→現在地／収納中→思い出の絵／未参加→なし／悪い結末→なし', async () => {
  // 未参加
  let S = makeSandbox(); S.H.ensure();
  assert.equal(S.H.events.reflection('rebirth'), null);
  // 棚を直した（模様替え）だけ → 部屋
  S.H.data().flags.repairedShelf = true;
  let r = S.H.events.reflection('normal');
  assert.equal(r.kind, 'home'); assert.equal(r.area, 'room');
  assert.ok(r.lines.some(t => /^娘「/.test(t)));
  assert.equal(S.H.events.reflection('collapse'), null);
  // 花：配置中
  S = makeSandbox();
  const s = await plantFlow(S, { area: 1, name: 'ひなた' });
  r = S.H.events.reflection('father');
  assert.equal(r.kind, 'flower'); assert.equal(r.source, 'current'); assert.equal(r.area, 'room');
  assert.ok(r.lines.some(t => /ひなた/.test(t)));
  for (const bad of ['collapse', 'bankrupt', 'flame']) assert.equal(S.H.events.reflection(bad), null);
  // 鉢を別の場所（庭）へ移した → 庭
  const hd = S.H.data();
  const P = hd.room.placements.find(p => p.instanceId === s.potId);
  hd.room.placements.splice(hd.room.placements.indexOf(P), 1);
  hd.garden.placements.push(Object.assign({}, P, { x: 3, y: 9 }));
  r = S.H.events.reflection('rebirth');
  assert.equal(r.source, 'current'); assert.equal(r.area, 'garden');
  // 収納した → 思い出の絵（植えた日の部屋）
  hd.garden.placements = hd.garden.placements.filter(p => p.instanceId !== s.potId);
  r = S.H.events.reflection('rebirth');
  assert.equal(r.source, 'memory'); assert.equal(r.memoryId, 'wp.2.plant'); assert.equal(r.snapshot.area, 'room');
});

await test('思い出帳：同じ id は追加しない／配置データ以外（画像など）は保存しない', () => {
  const S = makeSandbox(); const { H } = S; H.ensure();
  const snap = { area: 'garden', placements: [{ instanceId: 'p1', itemId: 'garden.pot', x: 1, y: 2, rotation: 0, variant: 'red', layer: 'furniture', image: 'data:image/png;base64,AAAA', el: {} }], plants: { p1: { name: 'ひなた', color: 'red', stage: 2, big: 'x'.repeat(5000) }, p2: { name: 'ほか' } }, dataURL: 'data:...' };
  assert.equal(H.memories.add({ id: 't.1', what: 'a', text: 'b', who: ['dan'], snapshot: snap }), true);
  assert.equal(H.memories.add({ id: 't.1', what: 'a2', text: 'b2' }), false);
  const m = H.memories.get('t.1');
  assert.equal(H.memories.list().length, 1);
  assert.deepEqual(Object.keys(m.snapshot).sort(), ['area', 'placements', 'plants']);
  assert.equal(m.snapshot.placements[0].image, undefined);
  assert.deepEqual(Object.keys(m.snapshot.plants), ['p1']);
  assert.ok(!JSON.stringify(m).includes('data:'));
  assert.equal(H.memories.add({ what: 'no id' }), false);
});

await test('日送り：植物が育ち、自動保存し直す', async () => {
  const S = makeSandbox(); const { H, run } = S;
  const s = await plantFlow(S);
  const saves = run('__saves');
  H.water(s.potId); run('nextDay()'); H.water(s.potId); run('nextDay()');
  assert.ok(H.data().plants[s.potId].stage >= 1);
  assert.ok(run('__saves') >= saves + 4);
  const saved = JSON.parse(run('localStorage').getItem('dannoura_save_v1'));
  assert.equal(saved.gs.homeData.plants[s.potId].stage, H.data().plants[s.potId].stage, '保存データにも成長が入っている');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
