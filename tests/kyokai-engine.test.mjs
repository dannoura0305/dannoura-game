// 『境界事象』エンジンのロジックテスト（kyokai/engine.js・systems.js・board.js を node:vm で DOM なしに読み込む）
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['kyokai/engine.js', 'kyokai/systems.js', 'kyokai/board.js'];

function makeLS() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function load() {
  const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval, clearInterval, localStorage: makeLS() };
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  const KY = ctx.KY;
  KY._setState(KY._fresh('テスト'));
  return { ctx, KY, STORY: ctx.KY_STORY, LS: ctx.localStorage };
}
// 調べ物のある場所（A は危険度 0、B は 3、C は 5）
function addArea(KY, extra) {
  const hits = { look: 0 };
  KY.AREAS.center_t = { name: '分室', map: { x: 0.2, y: 0.2 }, danger: { A: 0, B: 3 }, worlds: { A: { scene: 'center_office', spots: [] }, B: { scene: 'center_office', spots: [] } } };
  KY.AREAS.t_area = {
    name: 'テスト駅', map: { x: 0.5, y: 0.5 }, danger: { A: 0, B: 3, C: 5 },
    worlds: {
      A: { scene: 'station_ruin', spots: [
        { id: 's1', x: 0.1, y: 0.1, w: 0.2, h: 0.2, label: '駅名標', acts: ['look', 'photo', 'scan'], ev: { photo: 'e_photo' }, on: { look: async K => { hits.look++; K.gain('e_look'); } } },
        { id: 'p1', x: 0.5, y: 0.5, w: 0.1, h: 0.3, label: '駅員', acts: ['talk'] },
        { id: 'hidden', x: 0.7, y: 0.5, w: 0.1, h: 0.3, label: '隠れ', acts: ['look'], cond: K => K.has('show') },
      ] },
      B: { scene: 'station_live', spots: [{ id: 'sb', x: 0.1, y: 0.1, w: 0.2, h: 0.2, label: '駅名標B', acts: ['look'] }] },
      C: { scene: 'station_ruin', spots: [] },
    },
    ...(extra || {}),
  };
  Object.assign(KY.EVIDENCE, {
    e_photo: { title: '駅の写真', type: 'photo', world: 'A', art: 'station_ruin', ch: 1, desc: '' },
    e_look: { title: '駅名標の記録', type: 'log', world: 'A', art: null, ch: 1, desc: '' },
    e_a: { title: '証拠A', type: 'log', ch: 1 }, e_b: { title: '証拠B', type: 'testimony', ch: 1 }, e_c: { title: '証拠C', type: 'audio', ch: 1 },
  });
  return hits;
}

let pass = 0, fail = 0;
const T = [];
const test = (name, fn) => T.push([name, fn]);

test('セーブ→ロードで状態が戻る・壊れたセーブは拒否・値は丸める', async () => {
  const { KY, LS } = load();
  KY.flag('ch1', true); KY.inc('n444', 2); KY.gain('e_x'); KY.note('person', 'yuu', { title: 'ユウ', text: '先輩' });
  KY.state.sync = 3; KY.state.stability = 42.5; KY.state.world = 'B'; KY.state.areas.unlocked.push('shrine'); KY.state.items.battery = 7;
  KY._G.running = true;
  assert.ok(KY.save(false));
  assert.ok(KY.save(true));
  const raw = JSON.parse(LS.getItem('kyokai_save_v1'));
  for (const k of ['version', 'name', 'chapter', 'scene', 'flags', 'evidence', 'board', 'notebook', 'items', 'equip', 'sync', 'stability', 'world', 'areas', 'endings', 'playtime']) assert.ok(k in raw, '契約の項目 ' + k);
  const s = KY.loadSave(false);
  assert.equal(s.name, 'テスト'); assert.equal(s.flags.ch1, true); assert.equal(s.flags.n444, 2);
  assert.deepEqual(Array.from(s.evidence), ['e_x']); assert.equal(s.notebook.person.yuu.text, '先輩');
  assert.equal(s.sync, 3); assert.equal(s.stability, 42.5); assert.equal(s.world, 'B'); assert.deepEqual(Array.from(s.areas.unlocked), ['shrine']); assert.equal(s.items.battery, 7);
  assert.ok(KY.loadSave(true), '手動セーブ枠');
  LS.setItem('kyokai_save_v1', JSON.stringify({ version: 2, name: 'x' }));
  assert.equal(KY.loadSave(false), null, '版が違う');
  LS.setItem('kyokai_save_v1', '{壊れた');
  assert.equal(KY.loadSave(false), null, '壊れた JSON');
  const v = KY._validate({ version: 1, name: 'a', stability: 250, sync: 9, world: 'Z', evidence: ['a', 'a', 3, 'b'], flags: null });
  assert.equal(v.stability, 100); assert.equal(v.sync, 5); assert.equal(v.world, 'A'); assert.deepEqual(Array.from(v.evidence), ['a', 'b']); assert.deepEqual({ ...v.flags }, {});
});

test('証拠は重複しない・フラグの約束（値なしは「未設定なら true」）', async () => {
  const { KY } = load();
  assert.equal(KY.gain('e1'), true);
  assert.equal(KY.gain('e1'), false);
  assert.equal(KY.state.evidence.length, 1);
  assert.ok(KY.got('e1')); assert.ok(!KY.got('e2'));
  assert.equal(KY.flag('ch0'), true); assert.ok(KY.has('ch0'));
  KY.flag('view', 'stop'); assert.equal(KY.flag('view'), 'stop', '既に値があれば上書きしない');
  assert.equal(KY.get('nothing'), undefined); assert.ok(!KY.has('nothing'));
  KY.flag('t', true); assert.equal(KY.inc('t'), 1, '数値でない値は 0 から');
  assert.equal(KY.inc('c', 3), 3); assert.equal(KY.inc('c'), 4);
  assert.equal(KY.setName('  '), '朝霧'); assert.equal(KY.setName('<b>境</b>'), 'b境/b');
});

test('会話の書式：話者・{name}・その他の人物の顔・配信の男性', async () => {
  const { KY } = load();
  const P = s => KY._parseLine(s);
  assert.deepEqual([P('n:地の文').who, P('素の文').who], ['n', 'n']);
  assert.equal(P('p:{name}です').name, 'テスト'); assert.equal(P('p:{name}です').text, 'テストです');
  assert.equal(P('y:よう').name, '如月ユウ'); assert.equal(P('y:よう').face, 'yuu');
  assert.deepEqual([P('c:深夜の常連|後ろ').name, P('c:深夜の常連|後ろ').text], ['深夜の常連', '後ろ']);
  const x = P('x:坂口@resident_1|道は、あった。');
  assert.deepEqual([x.name, x.face, x.text], ['坂口', 'resident_1', '道は、あった。']);
  assert.equal(P('d:……ーん').name, '画面の男性');
  assert.equal(P('d:画面の向こう|こんばんは').name, '画面の向こう');
  assert.equal(P('t:02:44:44').text, '02:44:44', '端末行のコロンはそのまま');
  await KY.say(['#face y happy', 'y:a', '#wait 1', 'n:b']);
  assert.equal(KY._G.faces.y, 'happy');
  assert.deepEqual(Array.from(KY.backlog().map(l => l.text).slice(-2)), ['a', 'b']);
});

test('選択・入力（ヘッドレス）', async () => {
  const { KY } = load();
  KY._auto.choices.push(1);
  assert.equal(await KY.choice('問い', [{ t: 'A', v: 'a' }, { t: 'B', v: 'b' }]), 'b');
  assert.equal(await KY.choice('問い', ['x', 'y']), 0, 'v が無ければ番号');
  KY._auto.inputs.push('   ');
  assert.equal(await KY.input('名前', '朝霧', 6), '朝霧', '空欄は既定');
  KY._auto.inputs.push('とても長い名前ですよ');
  assert.equal(await KY.input('名前', '朝霧', 6), 'とても長い名');
});

test('K.step：済んだ区切りを飛ばし、戻り値を返す・章の順番・章が終わると区切りを消す', async () => {
  const { KY, STORY, LS } = load();
  const runs = { a: 0, b: 0, c2: 0 };
  let crash = true;
  STORY.register('ch02', async K => { await K.step('x', async () => { runs.c2++; }); });
  STORY.register('ch01', async K => {
    const v = await K.step('a', async () => { runs.a++; return { pick: 'A' }; });
    await K.step('b', async () => { runs.b++; K.flag('seenA', v && v.pick); if (crash) throw new Error('中断'); });
  });
  STORY.register('side', async K => {});
  assert.deepEqual(Array.from(KY.chapters()), ['ch01', 'ch02'], 'ch<数字> だけを数字順');
  KY._setState(KY._fresh('テスト'));
  await KY._runFrom('ch01');
  assert.equal(runs.a, 1); assert.equal(runs.b, 1);
  assert.ok(KY._auto.log.some(l => /^crash:中断/.test(l)), '章のエラーは画面に出して止まる');
  const saved = JSON.parse(LS.getItem('kyokai_save_v1'));
  assert.equal(saved.chapter, 'ch01');
  assert.ok(Object.keys(saved.steps).some(k => /ch01:ch01\/a$/.test(k)));
  // 再開
  crash = false;
  assert.ok(KY.continueGame(false) !== false);
  await new Promise(r => setTimeout(r, 30));
  assert.equal(runs.a, 1, '済んだ step は飛ばす');
  assert.equal(runs.b, 2);
  assert.equal(KY.get('seenA'), 'A', '飛ばした step も保存した値を返す');
  assert.equal(runs.c2, 1, '次の章へ');
  assert.ok(!Object.keys(KY.state.steps).some(k => k.indexOf('ch01:') === 0), '終わった章の区切りは消える');
});

test('推理の判定：仮説なし・枚数不足・誤り（研究員の指摘）・反証・根拠不足・正解', async () => {
  const { KY } = load();
  addArea(KY);
  ['e_a', 'e_b', 'e_c'].forEach(id => KY.gain(id));
  const def = { id: 'q1', q: '何が起きた？', link: 2, answer: 'r',
    options: [{ id: 'w', text: '誤り', need: ['e_a'], refute: ['e_c'] }, { id: 'h', text: 'ヒント付きの誤り', need: ['e_a'] }, { id: 'r', text: '正解', need: ['e_a', 'e_b'], refute: ['e_c'] }],
    hint: { h: 'その仮説だと「証拠B」が説明できない。' } };
  const E = (p, l) => KY.evalDeduce(def, p, l);
  assert.equal(E(null, []).kind, 'nopick');
  assert.equal(E('r', ['e_a']).kind, 'count');
  const w = E('w', ['e_a', 'e_b']); assert.equal(w.kind, 'wrong'); assert.match(w.msg, /証拠C/); assert.equal(w.ev, 'e_c');
  assert.equal(E('h', ['e_a', 'e_b']).msg, def.hint.h);
  assert.equal(E('r', ['e_a', 'e_c']).kind, 'refuted');
  const m = E('r', ['e_a', 'e_look']); assert.equal(m.kind, 'missing'); assert.deepEqual(Array.from(m.missing), ['e_b']);
  assert.ok(E('r', ['e_b', 'e_a']).ok);
  assert.deepEqual(Array.from(KY.linkedSet([['H', 'e_a'], ['e_a', 'e_b'], ['e_c', 'e_x']])).sort(), ['e_a', 'e_b'], '仮説から線でつながった証拠だけ');
  assert.equal(KY.deduceMax({ link: 2, answer: 'r', options: [{ id: 'r', need: ['a', 'b', 'c'] }] }), 3);
});

test('K.deduce：外しても終わらず、指摘→やり直し→正解で true・ボードの線は保存', async () => {
  const { KY } = load();
  addArea(KY);
  ['e_a', 'e_c'].forEach(id => KY.gain(id));
  const def = { id: 'q2', q: '問い', link: 2, answer: 'r', options: [{ id: 'w', text: '誤り', refute: ['e_c'] }, { id: 'r', text: '正解', need: ['e_a', 'e_b'] }] };
  KY._auto.deduce.push({ pick: 'w', links: [['H', 'e_a'], ['H', 'e_c']] }, { pick: 'r', links: [['H', 'e_a'], ['H', 'e_c']] }, { pick: 'r', links: [['H', 'e_a'], ['e_a', 'e_b']] });
  assert.equal(await KY.deduce(def), true);
  const fb = KY._auto.feedback;
  assert.equal(fb.length, 2); assert.equal(fb[0].kind, 'wrong'); assert.equal(fb[1].kind, 'missing');
  assert.ok(KY.got('e_b'), '必要な証拠を持たないまま2回外すと渡してもらえる');
  const st = KY.state.board.q2;
  assert.equal(st.solved, true); assert.equal(st.tries, 3); assert.equal(st.pick, 'r');
  assert.deepEqual(st.links.map(l => l.join('-')), ['H-e_a', 'e_a-e_b']);
  assert.ok(KY.state.notebook.hypo.deduce_q2.solved);
  assert.equal(await KY.deduce(def), true, '解決済みはそのまま true');
});

test('存在安定度：しきい値の演出（職員証・呼び方・持ち物・手帳・地図）', async () => {
  const { KY } = load();
  addArea(KY);
  assert.deepEqual([100, 70, 69.9, 50, 49, 30, 29, 10, 9, 0].map(v => KY.stabLevel(v)), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  KY.stab(-35);
  assert.equal(KY.state.stability, 65); assert.ok(KY.has('__drift1')); assert.equal(KY._G.q.length, 1);
  KY.stab(-40);
  assert.equal(KY.state.stability, 25); assert.ok(KY.has('__drift2') && KY.has('__drift3')); assert.equal(KY._G.q.length, 3);
  await KY.say(['n:次の行']);
  assert.equal(KY._G.q.length, 0, '次の会話の前に流れる');
  assert.ok(KY._auto.log.some(l => /私は、こんな部署にいた/.test(l)));
  assert.equal(KY._parseLine('y:テストさん、新人だな').text, '主任、主任だな', '安定度50未満：呼び方');
  assert.equal(KY._parseLine('p:新人です').text, '新人です', '主人公の台詞は変えない');
  assert.equal(KY.itemName('stab'), '境界安定材', '安定度30未満：持ち物の名前');
  assert.equal(KY.equipName('phone'), '対策局支給端末');
  KY.state.stability = 8;
  assert.notEqual(KY.noteText('月代分室の新人', 0), '月代分室の新人', '安定度10未満：手帳');
  assert.equal(KY.areaName('t_area'), 'テスト駅');
  KY.AREAS.t_area.name = '月代神社'; assert.equal(KY.areaName('t_area'), '月白社', '地図の地名');
  KY.state.stability = 80;
  assert.equal(KY.areaName('t_area'), '月代神社'); assert.equal(KY.itemName('stab'), '境界安定剤');
});

test('安定度0：死なずに研究所へ戻され、30に回復・slipped 加算・世界はA', async () => {
  const { KY } = load();
  addArea(KY);
  KY.state.stability = 4; KY.state.world = 'C'; KY.state.baseWorld = 'C';
  KY.stab(-10);
  assert.equal(KY.state.stability, 30); assert.equal(KY.get('slipped'), 1); assert.equal(KY.state.world, 'A'); assert.equal(KY.state.baseWorld, 'A');
  assert.ok(KY._G.slipNow);
  await KY.say(['n:x']);
  assert.ok(KY._auto.log.some(l => /誰かに、呼ばれた気がした/.test(l)));
  KY.state.stability = 1; KY.stab(-1);
  assert.equal(KY.get('slipped'), 2);
  KY.state.stability = 50; KY.stab(+80); assert.equal(KY.state.stability, 100, '上限');
});

test('危険度ごとの減り方・存在固定装置で半分・境界世界では電力が減る', async () => {
  const { KY } = load();
  addArea(KY);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(KY.drainFor), [0, 0.5, 1, 2, 3, 5]);
  KY.equip('phone'); KY.equip('magnet'); KY.item('battery', 5);
  const sp = KY.spotsOf('t_area', 'A')[0];
  await KY._doAction('t_area', sp, 'look');
  assert.equal(KY.state.stability, 100, 'A（危険度0）は減らない'); assert.equal(KY.item('battery'), 5, 'A では電力は減らない');
  KY.state.world = 'B'; KY.state.baseWorld = 'B';
  await KY._doAction('t_area', KY.spotsOf('t_area', 'B')[0], 'look');
  assert.equal(KY.state.stability, 98, '危険度3 → -2'); assert.equal(KY.item('battery'), 4);
  KY.equip('anchor');
  await KY._doAction('t_area', null, 'look');
  assert.equal(KY.state.stability, 97, '存在固定装置で半分');
  KY.state.world = 'C'; KY.state.baseWorld = 'C';
  await KY._doAction('t_area', null, 'look');
  assert.equal(KY.state.stability, 94.5, '危険度5 → -5 の半分');
});

test('シロ同期Lv：2 見るだけ／3 短時間の行動／4 物を運ぶ／5 自分ごと移動', async () => {
  const { KY } = load();
  addArea(KY);
  KY.equip('phone'); KY.equip('magnet'); KY.item('battery', 9);
  assert.equal(KY.canSwitch('t_area', 'B').ok, false, 'Lv0');
  KY.sync(1); assert.equal(KY.canSwitch('t_area', 'B').ok, false, 'Lv1');
  KY.sync(2);
  assert.equal(KY.canSwitch('t_area', 'A').ok, false, '今いる層');
  assert.equal(KY.canSwitch('center_t', 'C').ok, false, 'その層が無い');
  assert.equal(KY.switchWorld('t_area', 'B').mode, 'look');
  assert.equal(KY.state.world, 'B'); assert.equal(KY.state.baseWorld, 'A');
  assert.equal(KY.state.stability, 98, '切替でも減る');
  assert.equal(KY.actState('t_area', null, 'scan').ok, false, 'Lv2：スキャン不可');
  assert.equal(KY.actState('t_area', null, 'record').ok, false, 'Lv2：録音不可');
  assert.ok(KY.actState('t_area', null, 'look').ok && KY.actState('t_area', null, 'photo').ok, 'Lv2：見る・撮る');
  for (let i = 0; i < 3; i++) await KY._doAction('t_area', null, 'look');
  assert.equal(KY.state.world, 'A', '数回で元の層に戻る');
  KY.sync(3);
  assert.equal(KY.switchWorld('t_area', 'B').mode, 'act');
  assert.ok(KY.actState('t_area', null, 'scan').ok, 'Lv3：行動できる');
  assert.equal(KY.carry('key'), false, 'Lv3：運べない');
  KY.sync(4); assert.equal(KY.carry('key'), true); assert.equal(KY.get('carry_key'), 'B');
  KY.state.world = 'A'; KY.sync(5);
  assert.equal(KY.switchWorld('t_area', 'C').mode, 'travel');
  assert.equal(KY.state.baseWorld, 'C', 'Lv5：自分ごと移動');
  KY.equip('shiro_link'); const s0 = KY.state.stability; KY.switchWorld('t_area', 'B'); assert.equal(KY.state.stability, s0, 'シロ同期装置：切替で減らない');
  KY.setWorld('A'); assert.equal(KY.state.baseWorld, 'A');
});

test('消耗品：電力0で撮影・スキャン不可・安定剤・研究所で補充', async () => {
  const { KY } = load();
  addArea(KY);
  assert.equal(KY.actState('t_area', null, 'photo').ok, false, '端末が無い');
  KY.equip('phone'); KY.equip('magnet'); KY.equip('flashlight');
  KY.state.world = 'B'; KY.state.baseWorld = 'B';
  assert.equal(KY.item('battery'), 0);
  assert.equal(KY.actState('t_area', null, 'photo').ok, false); assert.match(KY.actState('t_area', null, 'scan').reason, /電力/);
  assert.ok(KY.actState('t_area', null, 'look').ok, '調べるはできる');
  KY.state.world = 'A'; KY.state.baseWorld = 'A';
  assert.ok(KY.actState('t_area', null, 'photo').ok, '通常世界は電力がなくても撮れる');
  assert.equal(KY.actState('t_area', KY.spotsOf('t_area', 'A')[1], 'look').ok, false, 'その場所でできない行動');
  KY.item('stab', 1); KY.state.stability = 60;
  assert.ok(KY.useItem('stab')); assert.equal(KY.state.stability, 85); assert.equal(KY.item('stab'), 0);
  assert.equal(KY.useItem('stab'), false);
  KY.item('battery', -99); assert.equal(KY.item('battery'), 0, '0 より下がらない');
  // 研究所に入ると補充
  KY._auto.explore.push({ area: 'center_t' }, { nav: 'map' }, { area: 't_area' }, { act: 'look', spot: 's1' });
  await KY.explore({ goal: K => K.got('e_look'), areas: ['center_t', 't_area'] });
  assert.equal(KY.item('battery'), KY.ITEMS.battery.max); assert.equal(KY.item('light'), KY.ITEMS.light.max);
  assert.ok(KY.state.areas.visited.includes('center_t') && KY.state.areas.visited.includes('t_area'));
});

test('探索：目的を満たすと戻る・撮影で写真の証拠・条件つきの調べ物・既定の一言', async () => {
  const { KY } = load();
  const hits = addArea(KY);
  KY.equip('phone');
  assert.equal(KY.spotsOf('t_area', 'A').length, 2, 'cond が false の調べ物は出ない');
  KY.flag('show', true); assert.equal(KY.spotsOf('t_area', 'A').length, 3);
  KY._auto.explore.push({ area: 't_area' }, { act: 'look', spot: 'p1' }, { act: 'talk', spot: 'p1' }, { act: 'photo', spot: 's1' }, { act: 'look', spot: 's1' });
  await KY.explore({ goal: K => K.got('e_photo') && K.got('e_look'), areas: ['t_area'] });
  assert.equal(hits.look, 1);
  assert.ok(KY.state.photos.e_photo, '撮った場面を写真として残す');
  assert.equal(KY.state.photos.e_photo.scene, 'station_ruin');
  assert.ok(KY._auto.log.some(l => /ここでは、それはできない/.test(l)));
  assert.ok(KY._auto.log.some(l => /話を聞ける相手がいない/.test(l)), '聞き込みの既定の一言');
  assert.equal(await KY.explore({ goal: () => true }), true, '最初から満たしていれば何もしない');
  // 後半の調べ物を足す（場所がまだ無くてもよい）
  KY.extendArea('later', 'B', [{ id: 'z', x: 0, y: 0, w: 0.1, h: 0.1, label: 'z' }]);
  KY.AREAS.later = { name: '後の場所', map: { x: 0, y: 0 }, worlds: { A: { scene: 'shrine', spots: [] } } };
  assert.equal(KY.spotsOf('later', 'B').length, 1);
  KY.extendArea('t_area', 'A', [{ id: 's1', x: 0, y: 0, w: 0.1, h: 0.1, label: '差し替え' }]);
  assert.equal(KY.spotsOf('t_area', 'A').find(s => s.id === 's1').label, '差し替え', '同じ id は差し替え');
  assert.ok(KY.unlock('later')); assert.equal(KY.unlock('later'), false); KY.lockArea('later'); assert.ok(!KY.state.areas.unlocked.includes('later'));
});

test('探索：目的の文は関数でもよい・ready で「調査を終える」（任意の調べ物を残して先へ）', async () => {
  const { KY } = load();
  addArea(KY);
  KY.equip('phone');
  const opts = { hint: K => K.got('e_look') ? '終えてよい' : '石を調べる', ready: K => K.got('e_look'), goal: K => K.got('e_look') && K.got('e_photo'), areas: ['t_area'] };
  assert.equal(KY.hintText(opts), '石を調べる');
  assert.equal(KY.exReady(opts), false);
  KY._auto.explore.push({ area: 't_area' }, { act: 'look', spot: 's1' }, { nav: 'finish' });
  await KY.explore(opts);
  assert.ok(KY.got('e_look') && !KY.got('e_photo'), 'ready を満たしたら finish で終わる（goal は未達のまま）');
  assert.equal(KY.hintText(opts), '終えてよい');
  assert.equal(KY.hintText({ hint: '文字列' }), '文字列');
  assert.equal(KY.exReady({}), false);
});

test('追跡・違和感探し・エンディング', async () => {
  const { KY, LS } = load();
  addArea(KY);
  KY._auto.chase.push('run', 'hide');
  assert.equal(await KY.chase({ id: 'c1', rounds: [{ text: '', ok: 'run' }, { text: '', ok: 'hide' }] }), true);
  assert.equal(KY.state.stability, 100);
  KY._auto.chase.push('repel', null);
  assert.equal(await KY.chase({ id: 'c2', rounds: [{ ok: 'repel' }, { ok: 'run' }] }), false, '電池が無い・時間切れ');
  assert.equal(KY.state.stability, 88); assert.equal(KY.get('chase_c2'), 'hurt');
  KY._auto.spot.push([[0.9, 0.9], [0.31, 0.31]]);
  const def = { id: 'sp', a: 'center_office', b: 'center_office', aw: 'A', bw: 'B', need: 1, ev: 'e_a', spots: [{ x: 0.3, y: 0.3, r: 0.05, label: '写真が一枚多い' }, { x: 0.6, y: 0.2, r: 0.05, label: '時計' }] };
  assert.equal(await KY.spot(def), 1);
  assert.ok(KY.got('e_a')); assert.ok(KY.state.notebook.diff.sp_0);
  assert.equal(KY.spotHit(def, 0.6, 0.2, []), 1); assert.equal(KY.spotHit(def, 0.1, 0.9, []), -1);
  await assert.rejects(KY.ending('TRUE'), e => e === KY.ABORT);
  assert.equal(LS.getItem('kyokai_true_end'), '1');
  await assert.rejects(KY.ending('b'), e => e === KY.ABORT);
  assert.deepEqual(JSON.parse(LS.getItem('kyokai_endings')), ['TRUE', 'B']);
  assert.deepEqual(Array.from(KY.state.endings), ['TRUE', 'B']);
});

test('手帳：未解決の既定・更新で番号を保つ', async () => {
  const { KY } = load();
  const a = KY.note('case', 'c1', { title: '事件', text: 'まだ' });
  assert.equal(KY.solved('case', a), false); assert.equal(KY.solved('person', KY.note('person', 'p', { title: 'p' })), true);
  const b = KY.note('case', 'c1', { solved: true });
  assert.equal(b.text, 'まだ'); assert.equal(b.n, a.n); assert.ok(KY.solved('case', b));
});

for (const [name, fn] of T) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}
console.log(`kyokai-engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
