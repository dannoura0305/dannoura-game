// フェーズ2（物語側）：生活イベント（千代さん・班長・発表会）・bonds・RPG各章のレシピ・エンディングの一言・思い出帳の絞り込み
// node:vm に家のロジックと events/memories/bonds/life_events/integrations を読み込み、会話UIと本編はスタブにする。
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = ['main/home/catalog.js', 'main/home/state.js', 'main/home/placement.js', 'main/home/crafting.js'].filter(f => existsSync(join(ROOT, f)));
const MINE = ['main/home/events.js', 'main/memories.js', 'main/home/bonds.js', 'main/home/life_events.js', 'main/integrations.js'];

const GAME_STUB = `
var gs={day:1,hour:22,min:0,mental:50,fatigue:10,jobRep:40,story:{flags:{}}};
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

// 他の担当がまだ追加していない定義を、テストの中だけで補う（本物があればそちらを使う）
const FILL = `
(function(){
  const C=HOME.CATALOG,R=HOME.RECIPES;
  const it=(name,w,h,layer,solid,areas)=>({name,w,h,rots:[0],layer,solid,areas,use:'near',verb:'眺める',desc:''});
  const add=(id,o)=>{if(!C[id]){C[id]=Object.assign(o,{id});}};
  add('furniture.old_radio',it('千代さんの古いラジオ',1,1,'furniture',true,['room']));
  add('memento.toolbox',it('班長の古い工具箱',1,1,'furniture',true,['room','garden']));
  add('memento.recital_photo',it('発表会の写真',1,1,'wall',false,['room']));
  add('deco.wind_chime',it('風鈴',1,1,'wall',false,['room']));
  add('deco.sea_mobile',it('海のモビール',1,1,'wall',false,['room']));
  add('garden.nameplate',it('家の表札',1,1,'furniture',true,['garden']));
  add('garden.clothesline',Object.assign(it('物干し',3,1,'furniture',true,['garden']),{rots:[0,90]}));
  if(C['memento.child_drawing']&&C['memento.child_drawing'].wallOnly){['memento.recital_photo','deco.wind_chime','deco.sea_mobile'].forEach(k=>{if(C[k].wallOnly===undefined)C[k].wallOnly=true;});}
  const rr=(id,out,mats)=>{if(!Object.keys(R).some(k=>R[k].out===out))R[id]={id,name:id,out,n:1,mats};};
  rr('wind_chime','deco.wind_chime',{metal:1,sea:1});
  rr('sea_mobile','deco.sea_mobile',{sea:2,cloth:1});
  rr('nameplate','garden.nameplate',{wood:1,metal:1});
})();
`;

function makeSandbox() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(GAME_STUB, ctx, { filename: 'game-stub.js' });
  for (const f of BASE) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  vm.runInContext(FILL, ctx, { filename: 'fill.js' });
  const ui = { said: [], asked: [], answers: [], toasts: [], visitors: [], cleared: 0, activity: '' };
  vm.runInContext(`HOME.ui={
    say(lines){__ui.said.push(...lines);return Promise.resolve();},
    choice(q,opts){__ui.asked.push(q);const a=__ui.answers.length?__ui.answers.shift():0;return Promise.resolve(a);},
    prompt(label,def,max){__ui.asked.push(label);const a=__ui.answers.length?__ui.answers.shift():def;return Promise.resolve(a);},
    toast(t){__ui.toasts.push(t);}
  };
  if(typeof HOME.setVisitor!=='function')HOME.setVisitor=v=>{__ui.visitors.push(v);};
  if(typeof HOME.clearVisitor!=='function')HOME.clearVisitor=()=>{__ui.cleared++;};
  if(typeof HOME.kidActivity!=='function')HOME.kidActivity=()=>__ui.activity;
  `, Object.assign(ctx, { __ui: ui }));
  for (const f of MINE) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  const run = code => vm.runInContext(code, ctx);
  run('HOME.ensure()');
  const S = { ctx, H: ctx.HOME, ui, run };
  S.reload = () => { const data = JSON.parse(JSON.stringify(run('gs'))); run('saveDataToGs')(data); };
  S.setDay = d => run(`gs.day=${d}`);
  S.flags = o => run(`Object.assign(gs.story.flags,${JSON.stringify(o)})`);
  return S;
}
// 窓辺の小さな約束を「終わった」ことにして、生活イベントだけを見る
function skipFlower(S) { const s = S.H.events.state(); s.step = 6; }

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
const memIds = H => Array.from(H.memories.list(), m => m.id);
const count = (H, re) => memIds(H).filter(id => re.test(id)).length;
const said = (S, re) => S.ui.said.some(l => re.test(l.text));

console.log('home-phase2');

await test('窓辺の約束が先：同じ開閉では生活イベントは出ない（一回の開閉で一つまで）', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  S.setDay(6);
  ui.answers.push(1);                                   // 花は「また今度」
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.equal(H.life_events.peek('chiyo_seed').done, undefined, '花の会話のあとは千代さんは来ない');
  // 同じ日にもう一度開くと、花は聞かない → 千代さん
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.equal(H.life_events.peek('chiyo_seed').done, 6);
  assert.ok(ui.visitors.some(v => v.who === 'chiyo'), '千代さんを画面に出す');
});

await test('植える途中（step 1）は生活イベントで割り込まない', async () => {
  const S = makeSandbox(); const { H } = S;
  S.setDay(6); H.events.state().step = 1; H.events.state().askedDay = 6;
  assert.equal(H.life_events.pending('garden'), null);
});

await test('千代さん①：6日目以降・庭で一度だけ。再読込しても重ならない', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  skipFlower(S);
  S.setDay(5); assert.equal(await H.hooks.onOpen('garden'), false, '5日目はまだ');
  S.setDay(6); assert.equal(await H.hooks.onOpen('room'), false, '部屋では垣根越しのあいさつは無い');
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.ok(said(S, /あさがおの種/));
  assert.ok(said(S, /朝が来るのが、ちょっとだけ楽しみになるけえ/));
  assert.equal(count(H, /^life\.chiyo\.1$/), 1);
  assert.deepEqual(Array.from(H.memories.get('life.chiyo.1').who), ['dan', 'kid', 'chiyo']);
  const seeds = H.owned('seed.morning_glory');
  S.reload();
  for (let d = 7; d < 9; d++) { S.setDay(d); await H.hooks.onOpen('garden'); }
  assert.equal(count(H, /^life\.chiyo\.1$/), 1);
  assert.equal(H.owned('seed.morning_glory'), seeds, '種は一度だけ');
  assert.equal(H.data().appliedRewards['life.chiyo.seed'], 6);
});

await test('千代さん②：ラジオ（3日後・9日目〜）→ 頼る／お茶なら休む。一日一つまで', async () => {
  for (const pick of [0, 1]) {
    const S = makeSandbox(); const { H, ui } = S;
    skipFlower(S);
    S.setDay(6); await H.hooks.onOpen('garden');
    S.setDay(8); assert.equal(await H.hooks.onOpen('room'), false, '9日目より前は来ない');
    S.setDay(9);
    ui.answers.push(pick);
    assert.equal(await H.hooks.onOpen('room'), true);
    assert.ok(said(S, /夜が長いけえ/));
    assert.equal(H.life_events.peek('chiyo_radio').done, 9);
    assert.equal(H.owned('furniture.old_radio'), 1);
    const b = H.bonds.data();
    if (pick === 0) assert.ok(b.help['home.chiyo_radio']); else assert.ok(b.rest['home.chiyo_tea']);
    // 同じ日には次のイベントは出ない
    S.run('gs.jobRep=80');
    S.setDay(9); assert.equal(H.life_events.pending('room'), null, '一日一つまで');
    S.reload();
    await H.hooks.onOpen('room');
    assert.equal(H.owned('furniture.old_radio'), 1, 'ラジオは一つだけ');
    assert.equal(count(H, /^life\.chiyo\.2$/), 1);
  }
});

await test('千代さん③：庭にベンチがあれば一緒に座る（休む）', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  skipFlower(S);
  S.setDay(6); await H.hooks.onOpen('garden');
  S.setDay(9); ui.answers.push(0); await H.hooks.onOpen('room');
  S.setDay(14);
  assert.equal(H.life_events.pending('garden'), null, 'ベンチが無ければ出ない');
  H.data().garden.placements.push({ instanceId: 'p950', itemId: 'garden.bench', x: 3, y: 5, rotation: 0, variant: 'default', layer: 'furniture' });
  assert.equal(H.life_events.pending('room'), null, '庭でだけ');
  assert.equal(H.life_events.pending('garden'), 'chiyo_bench');
  ui.answers.push(0);
  assert.equal(await H.hooks.onOpen('garden'), true);
  assert.ok(said(S, /灯りがひとつあれば、ちゃんと帰れるんよ/));
  assert.ok(H.bonds.data().rest['home.bench']);
  assert.ok(ui.visitors.some(v => v.who === 'chiyo' && v.pose === 'sit'));
  const m = H.memories.get('life.chiyo.3');
  assert.equal(m.snapshot.area, 'garden');
  S.setDay(15); assert.equal(await H.hooks.onOpen('garden'), false);
});

await test('班長①：工場を何度かこなした後の休みの日に工具箱（棚を直していれば「ええ仕事や」）', async () => {
  const S = makeSandbox(); const { H, run } = S;
  skipFlower(S);
  S.setDay(10);
  run('ff=2'); for (let d = 3; d <= 6; d++) { S.setDay(d); run('endFactory()'); }
  assert.equal(H.bonds.workDays(), 4);
  H.data().flags.repairedShelf = true;
  S.setDay(12); assert.equal(H.life_events.pending('room'), null, '休みの日（土日）まで待つ');
  H.life_events.tick();
  S.setDay(13);
  assert.equal(await H.hooks.onOpen('room'), true);
  assert.ok(said(S, /ええ仕事や/));
  assert.equal(H.owned('memento.toolbox'), 1);
  assert.equal(count(H, /^life\.hancho\.1$/), 1);
  assert.ok(Array.from(H.memories.get('life.hancho.1').who).includes('hancho'));
  // 休みの日を逃しても、条件を満たして3日たてば来る
  const S2 = makeSandbox(); skipFlower(S2);
  S2.run('gs.jobRep=70'); S2.setDay(15); S2.H.life_events.tick();
  assert.equal(S2.H.life_events.pending('room'), null);
  S2.setDay(18); assert.equal(S2.H.life_events.pending('room'), 'hancho_toolbox');
});

await test('班長②：物干し（頼る → bonds の「頼る」／ひとりでも物干しは立つ・責めない）', async () => {
  for (const pick of [0, 1]) {
    const S = makeSandbox(); const { H, ui } = S;
    skipFlower(S);
    S.run('gs.jobRep=70'); S.setDay(13);
    await H.hooks.onOpen('room');
    assert.ok(H.life_events.peek('hancho_toolbox').done);
    S.setDay(16); assert.equal(H.life_events.pending('room'), null);
    S.setDay(17); ui.answers.push(pick);
    assert.equal(await H.hooks.onOpen('room'), true);
    assert.equal(H.owned('garden.clothesline'), 1);
    const ev = H.bonds.evaluate();
    if (pick === 0) { assert.ok(H.bonds.data().help['home.hancho_line']); assert.ok(ev.traits.includes('relied')); assert.ok(said(S, /二人でやるもんや/)); }
    else { assert.ok(!H.bonds.data().help['home.hancho_line']); assert.ok(said(S, /ななめ/)); }
    assert.ok(!ui.said.some(l => /だめ|ダメ|失敗/.test(l.text)), '責めない');
    assert.ok(H.bonds.data().acted['home.clothesline']);
  }
});

await test('発表会：行けたら写真（一度だけ・壁に飾る）', async () => {
  const S = makeSandbox(); const { H } = S;
  skipFlower(S);
  S.flags({ promise_recital: true, chose_recital: true, kept_promise: true });
  S.setDay(27);
  assert.equal(await H.hooks.onOpen('room'), true);
  assert.ok(said(S, /パパを みつけたとこ/));
  assert.equal(H.owned('memento.recital_photo'), 1);
  const P = H.data().room.placements.find(p => p.itemId === 'memento.recital_photo');
  if (P) assert.equal(P.y, 0, '壁（y=0）に掛ける');
  S.reload();
  S.setDay(28); await H.hooks.onOpen('room'); await H.hooks.talkKid();
  assert.equal(H.owned('memento.recital_photo'), 1);
  assert.equal(count(H, /^life\.recital\.photo$/), 1);
  const ev = H.bonds.evaluate();
  assert.ok(ev.traits.includes('kept'));
  assert.equal(H.life_events.pending('room', { ignoreDaily: true }), null);
});

await test('発表会：行けなかったら後日話し合う（今夜は話せなくても、また別の日に）→ talked', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  skipFlower(S);
  S.flags({ promise_recital: true, chose_factory: true, missed_recital: true, broke_promise: true });
  S.setDay(27);
  let ev = H.bonds.evaluate();
  assert.ok(!ev.traits.includes('talked'));
  assert.equal(ev.counts.broken, 1);
  ui.answers.push(1);                                   // まだ言葉が出ない
  assert.equal(await H.hooks.onOpen('room'), true);
  assert.equal(H.life_events.peek('recital').talked, undefined);
  assert.equal(await H.hooks.talkKid(), true);          // 同じ日は話し合いを迫らない（いつもの会話か花へ）
  assert.equal(H.life_events.peek('recital').talked, undefined);
  S.setDay(28); ui.answers.push(0);
  assert.equal(await H.hooks.talkKid(), true, '娘に話しかけても始まる');
  assert.equal(H.life_events.peek('recital').talked, 28);
  assert.ok(said(S, /くらいうみでも、あかりがあれば、かえれるよ/));
  ev = H.bonds.evaluate();
  assert.ok(ev.traits.includes('talked'));
  assert.equal(ev.counts.brokenTalked, 1);
  S.reload();
  assert.equal(H.bonds.evaluate().counts.brokenTalked, 1, '再読込しても保たれる');
  assert.equal(count(H, /^life\.recital\.talk$/), 1);
  assert.equal(H.bonds.endingLine('father'), '守れなかった約束のことは、ちゃんと話した。だから、次の約束ができる。', '花の約束を守っていても、発表会を逃したなら「守れた」とは言わない');
  // 守った約束が他に無ければ、「話し合えた」の一言になる
  const T = makeSandbox();
  T.flags({ promise_recital: true, missed_recital: true, broke_promise: true });
  assert.equal(T.H.bonds.endingLine('father'), null, '話し合う前は何も足さない（責めない）');
  T.H.bonds.note('talk', 'recital');
  assert.ok(!T.H.bonds.evaluate().traits.includes('kept'));
  assert.equal(T.H.bonds.endingLine('father'), '守れなかった約束のことは、ちゃんと話した。だから、次の約束ができる。');
});

await test('bonds：頼る・休む・行動の記録と、何度呼んでも／再読込しても増えない', async () => {
  const S = makeSandbox(); const { H, run } = S;
  S.setDay(3);
  run("handleChoice('rest_light');handleChoice('rest_deep')");
  assert.equal(H.bonds.data().rested, 1, '同じ日の休息は1回');
  S.setDay(4); run("handleChoice('rest_light')");
  for (let d = 5; d <= 7; d++) { S.setDay(d); run("handleChoice('childcare')"); }
  S.flags({ asked_help: true, chiyo_trust: true, line3_owner: true });
  run('gs.rpg={cleared:4,flags:{ch2_share:1,ch4_rest:1,ch3_honest:1}}');
  H.data().flags.repairedShelf = true;
  const a = H.bonds.evaluate();
  assert.deepEqual(Array.from(a.traits).sort(), ['acted', 'relied', 'rested', 'talked']);
  assert.equal(a.counts.relied, 3);
  assert.equal(a.counts.rested, 3);
  assert.ok(a.counts.acted >= 3);
  for (let i = 0; i < 5; i++) H.bonds.evaluate();
  S.reload();
  const b = H.bonds.evaluate();
  assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), '何度評価しても・再読込しても同じ');
  assert.ok(b.score > 0 && b.score <= 100);
  assert.ok(typeof b.summary === 'string' && b.summary.length > 0);
  assert.ok(JSON.stringify(H.data().bonds).length < 4000, '保存は小さい');
  // 何もしていない人
  const E = makeSandbox(); const e = E.H.bonds.evaluate();
  assert.deepEqual(Array.from(e.traits), []);
  assert.ok(e.lines.length === 1);
  assert.equal(E.H.bonds.endingLine('normal'), null);
});

await test('bonds：約束を守った（発表会）＋頼った → 一言の優先順', () => {
  const S = makeSandbox(); const { H } = S;
  S.flags({ promise_recital: true, kept_promise: true });
  assert.equal(H.bonds.endingLine('father'), '守れた約束は、小さな灯りみたいに、まだ部屋に残っている。');
  S.flags({ asked_help: true });
  assert.equal(H.bonds.endingLine('rebirth'), '約束を守れたのは、ひとりで抱えなかったからだ。');
  // 花の約束（植えた）も「守った」に数える
  const T = makeSandbox(); const s = T.H.events.state(); s.step = 2; s.acceptedDay = 5;
  assert.ok(T.H.bonds.evaluate().traits.includes('kept'));
  // RPG の約束（第3章）は記録されるが、本編の結果がまだなら kept は未定
  const R = makeSandbox(); R.run('gs.rpg={cleared:3,flags:{ch3_promise:1}}');
  const ev = R.H.bonds.evaluate();
  assert.equal(ev.counts.promises, 1); assert.ok(!ev.traits.includes('kept'));
});

await test('エンディングの一言：悪い結末には決して足さない。種類も変えない', async () => {
  const S = makeSandbox(); const { H } = S;
  S.flags({ promise_recital: true, kept_promise: true, asked_help: true, slept_d23: true, white_rest: true });
  for (const bad of ['collapse', 'bankrupt', 'flame', '', null, undefined]) {
    assert.equal(H.bonds.endingLine(bad), null);
    assert.equal(H.integrations.bondsLine(bad), null);
  }
  assert.equal(H.integrations.endingReflection('collapse'), null);
  assert.equal(H.integrations.endingReflection('flame'), null);
  for (const good of ['father', 'rebirth', 'normal', 'king', 'engineer', 'debtfree']) assert.ok(H.bonds.endingLine(good));
  // 花も家具も無い → bonds の一言だけ（絵なし）
  const r = H.integrations.endingReflection('father');
  assert.equal(r.kind, 'bonds'); assert.equal(r.node, null);
  assert.deepEqual(Array.from(r.lines), ['約束を守れたのは、ひとりで抱えなかったからだ。']);
});

await test('RPG各章：風鈴・モビール・表札のレシピと第3章の思い出は一度だけ（見返し・再読込でも増えない）', () => {
  const S = makeSandbox(); const { H, run } = S;
  const play = (id, cleared, flags) => { run(`MG.def={id:'${id}'};MG._ended=false;`); run('MG').finish({ after() { run(`gs.rpg=gs.rpg||{cleared:0,flags:{}};gs.rpg.cleared=Math.max(gs.rpg.cleared,${cleared});Object.assign(gs.rpg.flags,${JSON.stringify(flags || {})});`); } }); };
  const rid = out => Object.keys(H.RECIPES).find(k => H.RECIPES[k].out === out);
  const chime = rid('deco.wind_chime'), mobile = rid('deco.sea_mobile'), plate = rid('garden.nameplate');
  play('rpg', 1);
  assert.equal(H.hasRecipe(chime), true);
  assert.equal(H.hasRecipe(mobile), false);
  play('rpg', 2); play('rpg', 3, { ch3_promise: 1 });
  assert.equal(count(H, /^rpg\.ch3\.promise$/), 1);
  assert.ok(/ゆびきり/.test(H.memories.get('rpg.ch3.promise').what));
  assert.ok(H.bonds.data().promises.some(p => p.id === 'rpg.ch3'));
  play('rpg', 4); assert.equal(H.hasRecipe(mobile), true); assert.equal(H.hasRecipe(plate), false);
  play('rpg', 5); assert.equal(H.hasRecipe(plate), true);
  const n = () => run('__notifs').filter(t => /風鈴|海のモビール|家の表札/.test(t)).length;
  assert.equal(n(), 3);
  for (let i = 1; i <= 5; i++) play('rpg', 5);          // 見返し
  S.reload(); H.integrations.syncRpg(false); H.integrations.syncRpg(false);
  assert.equal(n(), 3, '通知は章ごとに一度');
  for (const id of ['rpg.ch1.chime', 'rpg.ch4.mobile', 'rpg.ch5.nameplate', 'rpg.ch3.promise']) assert.equal(count(H, new RegExp('^' + id.replace(/\./g, '\\.') + '$')), 1);
  for (const r of [chime, mobile, plate]) assert.equal(H.data().unlockedRecipes.filter(x => x === r).length, 1);
  assert.ok(Array.from(H.memories.get('rpg.ch1.chime').who).includes('minamo'));
});

await test('古いセーブ（第5章クリア済み）を読み込むと、通知なしでレシピがそろう', () => {
  const S = makeSandbox(); const { H, run } = S;
  run('saveDataToGs')({ day: 20, rpg: { cleared: 5, flags: { ch3_honest: 1 } }, story: { flags: {} } });
  const rid = out => Object.keys(H.RECIPES).find(k => H.RECIPES[k].out === out);
  assert.ok(H.hasRecipe(rid('deco.wind_chime')) && H.hasRecipe(rid('deco.sea_mobile')) && H.hasRecipe(rid('garden.nameplate')));
  assert.equal(run('__notifs').filter(t => /クラフト/.test(t)).length, 0);
  assert.ok(/正直/.test(H.memories.get('rpg.ch3.promise').what));
});

await test('娘の会話：過ごし方（kidActivity）と植えた種類で変わる／寝ているときは起こさない', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  skipFlower(S); S.setDay(10);
  ui.activity = 'read';
  const kidTexts = new Set();
  for (let i = 0; i < 4; i++) { ui.said.length = 0; await H.hooks.talkKid(); ui.said.filter(l => l.who === 'kid').forEach(l => kidTexts.add(l.text)); }
  assert.ok([...kidTexts].some(t => /さいごの ページ/.test(t)), '本棚の前で絵本');
  H.data().plants.p990 = { name: 'あさがお', color: 'blue', stage: 1, growth: 0, plantedDay: 9, lastWateredDay: 9, species: 'morning_glory' };
  ui.activity = '';
  kidTexts.clear();
  for (let i = 0; i < 8; i++) { ui.said.length = 0; await H.hooks.talkKid(); ui.said.filter(l => l.who === 'kid').forEach(l => kidTexts.add(l.text)); }
  assert.ok([...kidTexts].some(t => /あさがお、あさに さくんだって/.test(t)), '植えた種類');
  ui.activity = 'sleep';
  ui.said.length = 0;
  assert.equal(await H.hooks.talkKid(), true);
  assert.ok(ui.said.every(l => l.who !== 'kid'), '寝ている子は話さない');
  assert.ok(said(S, /起こさないように/));
  // 花の続きがあるときは花が先
  const T = makeSandbox(); T.setDay(5); T.ui.activity = 'read'; T.ui.answers.push(1);
  await T.H.hooks.talkKid();
  assert.ok(T.ui.said.some(l => /おはなのたね/.test(l.text)));
});

await test('娘が眠っているあいだは、花の段階も生活イベントも起こさない（起きている時間まで待つ）', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  S.setDay(6); ui.activity = 'sleep';
  assert.equal(await H.hooks.onOpen('garden'), false);
  assert.equal(H.events.state().askedDay, undefined, '花の話も始まらない');
  assert.equal(H.life_events.pending('garden'), null);
  S.flags({ promise_recital: true, kept_promise: true });
  assert.equal(H.life_events.pending('room', { ignoreDaily: true }), null);
  ui.activity = 'read';
  assert.equal(await H.hooks.onOpen('garden'), true, '起きたら花が先');
});

await test('訪問者と話す：一言のあと帰っていく（画面から消す）', async () => {
  const S = makeSandbox(); const { H, ui } = S;
  assert.equal(typeof H.hooks.talkVisitor, 'function');
  assert.equal(await H.hooks.talkVisitor('chiyo'), true);
  assert.ok(said(S, /おやすみなさい、千代さん/));
  assert.equal(await H.hooks.talkVisitor('hancho'), true);
  assert.ok(ui.cleared >= 2);
  assert.equal(await H.hooks.talkVisitor('nobody'), false);
});

await test('思い出帳：人物で絞り込み（娘・千代さん・班長・ミナモ・すべて）', async () => {
  const S = makeSandbox(); const { H, run } = S;
  skipFlower(S);
  S.setDay(6); await H.hooks.onOpen('garden');
  S.setDay(9); await H.hooks.onOpen('room');
  run('gs.jobRep=70'); S.setDay(13); await H.hooks.onOpen('room');
  run('gs.rpg={cleared:2,flags:{}}'); H.integrations.syncRpg(true);
  const ids = p => Array.from(H.memories.filter(p), m => m.id);
  assert.deepEqual(ids('chiyo'), ['life.chiyo.1', 'life.chiyo.2']);
  assert.deepEqual(ids('hancho'), ['life.hancho.1']);
  assert.ok(ids('minamo').includes('rpg.ch2.lantern') && ids('minamo').includes('rpg.ch1.chime'));
  assert.ok(ids('kid').includes('life.chiyo.1'));
  assert.equal(ids('all').length, H.memories.list().length);
  // 日付順
  const days = Array.from(H.memories.filter('all'), m => m.day);
  assert.deepEqual(days, days.slice().sort((a, b) => a - b));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
