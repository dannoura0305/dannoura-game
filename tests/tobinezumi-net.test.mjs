// トビネズミMMO：通信の窓口（client/net.js）のオフライン実装・クライアント予測・補間のテスト（DOM なし）
import assert from 'node:assert/strict';
import { OfflineBackend, OnlineBackend, Predictor, Interp, SAVE_KEY } from '../tobinezumi/client/net.js';
import { stepField, makeFieldState, STEP_DT } from '../tobinezumi/shared/move.js';
import { buildFieldMap, canDigBurrow, TILE } from '../tobinezumi/shared/regions.js';
import { MIGRATIONS } from '../tobinezumi/shared/nest-rules.js';
import { countItem } from '../tobinezumi/shared/items.js';

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
let clock = 1_000_000;
const now = () => clock;

/** 自分の確定位置を (x,y) に置く（テスト用：入力で歩かせる代わり） */
function place(net, x, y) { net.auth = makeFieldState(x, y); }
function findDigSpot(net) {
  for (let ty = 5; ty < map.h - 5; ty++) for (let tx = 5; tx < map.w - 5; tx++) {
    const x = tx * TILE + 8, y = ty * TILE + 8;
    if (Math.hypot(x - map.spawn.x, y - map.spawn.y) < 160) continue;
    if (canDigBurrow(map, x, y, net._entrances()).ok) return { x, y };
  }
  throw new Error('掘れる場所が無い');
}

await test('はじめて：ローカルのアカウント → キャラ作成 → 地上へ（tobi_ の鍵だけに保存）', async () => {
  const ls = makeLS({ dannoura_save: 'x', kyokai_save_v1: 'y' });
  const net = new OfflineBackend({ storage: ls, now, npc: false, map });
  let h = await net.hello();
  assert.equal(h.account, null); assert.equal(h.mode, 'offline');
  await net.login('local');
  assert.equal((await net.createCharacter({ name: '', fur: 'sand' })).ok, false);
  assert.equal((await net.createCharacter({ name: 'そらとび', fur: 'blue' })).ok, false);
  const c = await net.createCharacter({ name: 'そらとび', fur: 'rufous' });
  assert.ok(c.ok); assert.equal(c.character.individual.genes.fur, 'rufous');
  assert.equal(c.character.individual.father_id, null, '家系の器');
  const j = await net.joinField();
  assert.ok(j.ok);
  assert.equal(j.world.you.name, 'そらとび');
  assert.ok(j.world.resources.length > 50);
  assert.equal(countItem(j.world.you.inv, 'seed'), 6);
  for (const k of ls._m.keys()) assert.ok(k.startsWith('tobi_') || k === 'dannoura_save' || k === 'kyokai_save_v1', '鍵 ' + k);
  assert.equal(ls.getItem('dannoura_save'), 'x'); assert.equal(ls.getItem('kyokai_save_v1'), 'y');
  net.resetAll();
  assert.equal(ls.getItem(SAVE_KEY), null, 'はじめからで消える');
  assert.equal(ls.getItem('dannoura_save'), 'x', '本編のセーブは残る');
});

await test('採集：近くの物だけ・拾うと消えて持ち物に入る・2〜5 分後に別の場所へ再出現', async () => {
  const ls = makeLS();
  const net = new OfflineBackend({ storage: ls, now, npc: false, map });
  await net.login('local'); await net.createCharacter({ name: 'ミミ', fur: 'sand' });
  const j = await net.joinField();
  const r = j.world.resources[0];
  place(net, r.x + 200, r.y);
  assert.equal((await net.pickup(r.id)).reason, '遠すぎる');
  place(net, r.x + 5, r.y);
  const gone = [];
  net.on('res_gone', m => gone.push(m.id));
  const res = await net.pickup(r.id);
  assert.ok(res.ok); assert.equal(res.item, r.kind);
  assert.deepEqual(gone, [r.id]);
  assert.equal((await net.pickup(r.id)).reason, 'もう無い', '同じ物は 2 回拾えない');
  const spawned = [];
  net.on('res_spawn', m => spawned.push(m.res));
  clock += 119_000; net.tick(STEP_DT);
  assert.equal(spawned.length, 0, '2 分たつまでは出ない');
  clock += 182_000; net.tick(STEP_DT);
  assert.equal(spawned.length, 1); assert.equal(spawned[0].kind, r.kind);
});

await test('巣：掘る → 入る → 操作（素材が減る・rev が進む・古い rev は拒否）→ 倉庫 → 保存して読み直す', async () => {
  const ls = makeLS();
  let net = new OfflineBackend({ storage: ls, now, npc: false, map });
  await net.login('local'); await net.createCharacter({ name: 'ナッツ', fur: 'cream' });
  await net.joinField();
  const spot = findDigSpot(net);
  place(net, spot.x, spot.y);
  const dg = await net.digBurrow();
  assert.ok(dg.ok, dg.reason);
  assert.equal((await net.digBurrow()).reason, 'もう巣がある');
  const en = await net.enterNest(dg.entrance.owner);
  assert.ok(en.ok); assert.ok(en.nest.canEdit);
  const id = en.nest.id; let rev = en.nest.rev;
  const r1 = await net.nestOp(id, rev, { op: 'tunnel', x: 12, y: 9, len: 6, dir: 'h' });
  assert.ok(r1.ok, r1.reason); assert.equal(r1.rev, rev + 1); rev = r1.rev;
  const stale = await net.nestOp(id, rev - 1, { op: 'dig', x: 5, y: 8 });
  assert.equal(stale.code, 'stale_rev');
  const r2 = await net.nestOp(id, rev, { op: 'room', x: 18, y: 7, w: 6, h: 3, kind: 'store' });
  assert.ok(r2.ok, r2.reason); rev = r2.rev;
  assert.equal(countItem(r2.inv, 'pebble'), 0, '小石 4 → 部屋 2・倉庫 2');
  const r3 = await net.nestOp(id, rev, { op: 'room', x: 18, y: 12, w: 4, h: 3 });
  assert.equal(r3.reason, '巣とつながっていない');
  const st = await net.store(id, 'deposit', 'seed', 4);
  assert.ok(st.ok); assert.equal(countItem(st.storage, 'seed'), 4); assert.equal(countItem(st.inv, 'seed'), 2);
  assert.equal((await net.store(id, 'withdraw', 'grass', 1)).reason, '倉庫に無い');
  const lv = await net.leaveNest();
  assert.ok(lv.ok); assert.ok(Math.abs(lv.x - dg.entrance.x) < 1);
  net.savePosition();
  // 読み直し
  net = new OfflineBackend({ storage: ls, now, npc: false, map });
  const h = await net.hello();
  assert.equal(h.character.name, 'ナッツ');
  const j = await net.joinField();
  assert.ok(j.world.you.nest, '巣がある');
  assert.ok(j.world.entrances.some(e => e.own));
  place(net, dg.entrance.x, dg.entrance.y + 4);
  const en2 = await net.enterNest(dg.entrance.owner);
  assert.equal(en2.nest.rev, rev);
  assert.equal(en2.nest.data.rooms.length, 2);
  assert.equal(countItem(en2.nest.storage, 'seed'), 4);
});

await test('セーブの中の巣データは読み込み時に移行される（v0 → v1）', async () => {
  const ls = makeLS();
  const net = new OfflineBackend({ storage: ls, now, npc: false, map });
  await net.login('local'); await net.createCharacter({ name: 'リコ', fur: 'white' });
  await net.joinField();
  const spot = findDigSpot(net); place(net, spot.x, spot.y);
  await net.digBurrow();
  const save = JSON.parse(ls.getItem(SAVE_KEY));
  const nid = Object.keys(save.nests)[0];
  const w = 48, h = 24, grid = new Array(w * h).fill(0);
  for (let y = 7; y < 10; y++) for (let x = 6; x < 12; x++) grid[y * w + x] = 1;
  save.nests[nid].data = { w, h, surface: 2, grid, rooms: [{ x: 6, y: 7, w: 6, h: 3, type: 'storage' }], items: [], door: { x: 8 } };
  ls.setItem(SAVE_KEY, JSON.stringify(save));
  const net2 = new OfflineBackend({ storage: ls, now, npc: false, map });
  assert.equal(net2.save.nests[nid].data.v, 1);
  assert.equal(net2.save.nests[nid].data.rooms[0].kind, 'store');
  assert.ok(typeof MIGRATIONS[0] === 'function');
});

await test('見学：公開の巣には入れる（編集不可）・非公開には入れない', async () => {
  const ls = makeLS();
  const net = new OfflineBackend({ storage: ls, now, npc: true, map });
  await net.login('local'); await net.createCharacter({ name: 'ピョン', fur: 'graybrown' });
  const j = await net.joinField();
  const moka = j.world.entrances.find(e => e.name === 'モカ'), nuts = j.world.entrances.find(e => e.name === 'ナッツ');
  place(net, moka.x, moka.y);
  const r = await net.enterNest(moka.owner);
  assert.ok(r.ok); assert.equal(r.nest.canEdit, false); assert.ok(r.nest.data.rooms.length >= 3, 'モカの巣はルールどおりの操作で作られている');
  assert.equal((await net.nestOp(r.nest.id, r.nest.rev, { op: 'dig', x: 5, y: 8 })).code, 'forbidden');
  await net.leaveNest();
  place(net, nuts.x, nuts.y);
  assert.match((await net.enterNest(nuts.owner)).reason, /入れない/);
});

await test('チャット：ローカルエコー・整形', async () => {
  const net = new OfflineBackend({ storage: makeLS(), now, npc: false, map });
  await net.login('local'); await net.createCharacter({ name: 'モモ', fur: 'sand' });
  await net.joinField();
  const got = [];
  net.on('chat', m => got.push(m));
  await net.chat('  やあ\u0001 ');
  assert.equal(got.length, 1); assert.equal(got[0].text, 'やあ'); assert.equal(got[0].name, 'モモ');
  assert.equal((await net.chat('   ')).ok, false);
});

await test('クライアント予測：入力を即時に当て、確定（ack）で未確認分を当て直す。同じルールならずれない', async () => {
  const step = (s, i) => stepField(s, i, STEP_DT, map);
  const start = makeFieldState(map.spawn.x, map.spawn.y);
  const pred = new Predictor(start, step);
  let server = { ...start };
  const sent = [];
  for (let i = 0; i < 30; i++) sent.push(pred.input({ mx: 1, my: i % 10 < 5 ? 0 : 1, jump: false }));
  assert.equal(pred.pending.length, 30);
  // サーバーは最初の 20 個だけ処理済み
  for (const inp of sent.slice(0, 20)) server = step(server, inp);
  const before = { x: pred.state.x, y: pred.state.y };
  let corrected = 0; pred.onReconcile = () => corrected++;
  pred.reconcile(20, server);
  assert.equal(pred.pending.length, 10);
  assert.ok(Math.abs(pred.state.x - before.x) < 1e-9 && Math.abs(pred.state.y - before.y) < 1e-9, '同じルールならずれない');
  assert.equal(corrected, 0);
  // サーバーが違う位置を返したら（押し戻し）、そこから当て直す
  pred.reconcile(20, { ...server, x: server.x - 10 });
  assert.equal(corrected, 1);
  assert.ok(Math.abs(pred.state.x - (before.x - 10)) < 2);
  const v = pred.view(0); assert.ok(Math.abs(v.x - before.x) < 0.01, '見た目は少しずつ寄せる');
  // オフライン：sendInput で確定が進む
  const net = new OfflineBackend({ storage: makeLS(), now, npc: false, map });
  await net.login('local'); await net.createCharacter({ name: 'テス', fur: 'sand' }); await net.joinField();
  const p2 = new Predictor({ ...net.auth }, step);
  let snap = null; net.on('snapshot', m => { snap = m; });
  for (let i = 0; i < 12; i++) { const inp = p2.input({ mx: 0, my: 1 }); net.sendInput(inp); net.tick(STEP_DT); }
  assert.ok(snap && snap.ack > 0);
  p2.reconcile(snap.ack, snap.you);
  assert.ok(Math.abs(p2.state.y - net.auth.y) < 1e-9);
});

await test('補間：100ms 遅れで 2 つのスナップショットの間を線形補間・ジャンプは軌道どおり', () => {
  const ip = new Interp(100);
  ip.push(1000, { x: 0, y: 0, z: 0, anim: 'hop' });
  ip.push(1100, { x: 10, y: 20, z: 0, anim: 'hop' });
  ip.push(1050, { x: 99, y: 99 }); // 古いものは無視
  const s = ip.sample(1150);
  assert.equal(s.x, 5); assert.equal(s.y, 10);
  assert.equal(ip.sample(900).x, 0);
  assert.equal(ip.sample(5000).x, 10);
  const j = new Interp(100);
  j.push(2000, { x: 0, y: 0, z: 0, anim: 'jump', jump: { t: 0, dur: 0.5, x0: 0, y0: 0, x1: 64, y1: 0 } });
  const m = j.sample(2350);   // 0.25 秒経過＝半分
  assert.equal(m.x, 32); assert.ok(m.z > 15);
});

await test('オンライン：入力はまとめて送る（地上にいる間だけ）・要求には rid を付け、その前に入力を送り切る', async () => {
  const sent = [];
  const on = new OnlineBackend('ws://example.invalid', { storage: makeLS() });
  on.ws = { readyState: 1, send: t => sent.push(JSON.parse(t)) };
  on.sendInput({ seq: 1, mx: 1, my: 0, jump: false });
  assert.equal(on.queue.length, 0, '地上にいないときはためない');
  on.place = 'field';
  on.sendInput({ seq: 1, mx: 1, my: 0, jump: false }); on.sendInput({ seq: 2, mx: 1, my: 0, jump: true });
  on.tick(0.06);
  assert.equal(sent.length, 1); assert.equal(sent[0].t, 'input'); assert.deepEqual(sent[0].inputs.map(i => i.seq), [1, 2]);
  const p = on.pickup('r9');
  assert.equal(sent[1].t, 'pickup'); assert.equal(sent[1].resId, 'r9'); assert.ok(sent[1].rid > 0);
  on._msg({ t: 'res', rid: sent[1].rid, ok: true, item: 'seed' });
  assert.deepEqual(await p, { t: 'res', rid: sent[1].rid, ok: true, item: 'seed' });
  const got = []; on.on('res_gone', m => got.push(m));
  on._msg({ t: 'res_gone', id: 'r9', by: 'a1' });
  assert.equal(got[0].id, 'r9');
  assert.equal((await on.register('ab', 'x')).ok, false, '送る前に形を確かめる');
  // 拾う直前の入力は、要求より先に送る（サーバーの確定位置が追いつく）
  sent.length = 0;
  on.sendInput({ seq: 3, mx: 0, my: 1, jump: false });
  on.pickup('r10');
  assert.deepEqual(sent.map(m => m.t), ['input', 'pickup']);
});

await test('オンライン：切れたら「つながりなおしています」→ バックオフで再接続 → hello(token) → join_field で続きから', async () => {
  const ls = makeLS({ tobi_token: 'tok-123' });
  const socks = [];
  class FakeWS {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; socks.push(this); }
    send(t) { const m = JSON.parse(t); this.sent.push(m); if (this.auto) this.auto(m); }
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen && this.onopen(); }
    recv(m) { this.onmessage && this.onmessage({ data: JSON.stringify(m) }); }
  }
  const on = new OnlineBackend('ws://x/ws', { storage: ls, WS: FakeWS });
  const p = on.connect(); socks[0].open(); await p;
  on.place = 'field';
  const st = []; on.on('status', m => st.push(m.state));
  const rejoined = new Promise(res => on.on('rejoin', res));
  const pending = on.pickup('r1');
  socks[0].readyState = 3; socks[0].onclose();          // 切断
  assert.equal((await pending).ok, false, '待っていた要求は失敗で返る');
  assert.deepEqual(st, ['reconnecting']);
  assert.equal(on.backoff, 1000, '次の待ちは倍');
  await new Promise(r => setTimeout(r, 560));           // 0.5 秒後に 1 回目
  assert.equal(socks.length, 2);
  const s2 = socks[1];
  s2.auto = m => setTimeout(() => {
    if (m.t === 'hello') { assert.equal(m.token, 'tok-123'); s2.recv({ t: 'res', rid: m.rid, ok: true, account: { id: 1, username: 'u' }, character: { name: 'c' } }); }
    if (m.t === 'join_field') s2.recv({ t: 'res', rid: m.rid, ok: true, world: { you: { x: 5, y: 6 } } });
  }, 0);
  s2.open();
  const w = await rejoined;
  assert.equal(w.you.x, 5);
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(st, ['reconnecting', 'online']);
  assert.equal(on.backoff, 500, '成功したら最初の間隔へ');
  // 何も届かない（ネットが黙って切れた）→ 6 秒で切断とみなす
  on.lastRecv = Date.now() - 7000; on.tick(0.016);
  assert.equal(on.state, 'reconnecting');
  on.close();
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
