// 入力管理（input/input-manager.js）と操作の型（input/profiles.js）の確かめ：偽の navigator.getGamepads で読む
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); }
}

// 偽のブラウザ：getGamepads が pads を返す。localStorage は Map
function boot(extra) {
  const store = new Map();
  const win = {
    console, Math, JSON, Date, Object, Array, Number, String, Map, Set, Promise, isFinite,
    INPUT_NO_AUTOSTART: true,
    navigator: { pads: [], getGamepads() { return this.pads; } },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    performance: { now: () => 0 },
    addEventListener() {},
    ...extra,
  };
  win.window = win; win.globalThis = win;
  vm.createContext(win);
  vm.runInContext(read('input/input-manager.js'), win);
  vm.runInContext(read('input/profiles.js'), win);
  return win;
}
function pad(o = {}) {
  const buttons = Array.from({ length: o.nb || 17 }, () => ({ pressed: false, value: 0 }));
  return { id: o.id || 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: o.index || 0, mapping: o.mapping == null ? 'standard' : o.mapping, connected: true, timestamp: 0, buttons, axes: o.axes || [0, 0, 0, 0] };
}
const press = (p, i, on = true) => { p.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };

test('標準配置：A（0番）を押すと press、離すと release。論理名で読める', () => {
  const w = boot(), I = w.INPUT, p = pad(); w.navigator.pads = [p];
  const log = []; I.on('press', b => log.push('+' + b)); I.on('release', b => log.push('-' + b));
  I.poll(16); press(p, 0); I.poll(32);
  assert.equal(I.held('A'), true); assert.equal(I.state.pressed.A, true);
  I.poll(48); assert.equal(I.state.pressed.A, undefined, '押した瞬間は 1 フレームだけ');
  press(p, 0, false); I.poll(64);
  assert.deepEqual(log, ['+A', '-A']);
  assert.equal(I.device, 'pad');
});

test('接続・切断のお知らせ（一覧の出入りで判定）と、残りの台数', () => {
  const w = boot(), I = w.INPUT; const ev = [];
  I.on('connect', p => ev.push('c:' + p.family)); I.on('disconnect', (p, left) => ev.push('d:' + left));
  w.navigator.pads = [pad()]; I.poll(1);
  w.navigator.pads = [pad(), pad({ index: 1, id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c)' })]; I.poll(2);
  w.navigator.pads = [pad()]; I.poll(3);
  w.navigator.pads = []; I.poll(4);
  assert.deepEqual(ev, ['c:xbox', 'c:ps', 'd:1', 'd:0']);
  assert.equal(I.state.connected, false);
});

test('流儀の推定：Xbox・PlayStation・Nintendo・GameSir', () => {
  const I = boot().INPUT;
  assert.equal(I.familyOf('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'xbox');
  assert.equal(I.familyOf('054c-0ce6-Wireless Controller'), 'ps');
  assert.equal(I.familyOf('DualSense Wireless Controller'), 'ps');
  assert.equal(I.familyOf('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)'), 'nintendo');
  assert.equal(I.familyOf('GameSir-Nova Lite 2'), 'xbox');
  assert.equal(I.label('A', 'ps'), '×'); assert.equal(I.label('B', 'nintendo'), 'A'); assert.equal(I.label('START', 'xbox'), 'Menu');
});

test('スティック：遊び（デッドゾーン）の内側は 0、外側は 0〜1 に付け直す', () => {
  const w = boot(), I = w.INPUT, p = pad({ axes: [0.1, -0.1, 0, 0] }); w.navigator.pads = [p];
  I.poll(1); assert.equal(I.state.axes.LX, 0); assert.equal(I.state.axes.LY, 0);
  p.axes = [1, 0, 0, -1]; I.poll(2);
  assert.ok(Math.abs(I.state.axes.LX - 1) < 1e-9); assert.ok(Math.abs(I.state.axes.RY + 1) < 1e-9);
  p.axes = [0.6, 0, 0, 0]; I.poll(3); assert.ok(I.state.axes.LX > 0.4 && I.state.axes.LX < 0.6);
});

test('トリガーは浅く押しても（0.35 超）押した扱い・値も読める', () => {
  const w = boot(), I = w.INPUT, p = pad(); w.navigator.pads = [p];
  p.buttons[7] = { pressed: false, value: 0.5 }; I.poll(1);
  assert.equal(I.held('RT'), true); assert.equal(I.state.values.RT, 0.5);
});

test('非標準配置：十字キーのハット軸（9 番）を 4 方向に', () => {
  const w = boot(), I = w.INPUT, p = pad({ mapping: '', axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3.28] }); w.navigator.pads = [p];
  I.poll(1); assert.equal(I.held('UP') || I.held('DOWN') || I.held('LEFT') || I.held('RIGHT'), false, '中立');
  p.axes[9] = -1; I.poll(2); assert.equal(I.held('UP'), true);
  p.axes[9] = -0.428571; I.poll(3); assert.equal(I.held('RIGHT'), true); assert.equal(I.held('UP'), false);
  p.axes[9] = 0.714286; I.poll(4); assert.equal(I.held('LEFT'), true);
  assert.equal(I.hatDir(1.2857), 0);
});

test('学習した割り当て（診断画面）が標準より優先され、保存される', () => {
  const w = boot(), I = w.INPUT, p = pad({ mapping: '', id: 'Generic USB Joystick' }); w.navigator.pads = [p];
  I.setMap(p.id, { buttons: { A: 2, B: 1, X: 3, Y: 0 }, axes: { LX: 0, LY: 1, RX: 2, RY: 3 } });
  press(p, 2); I.poll(1); assert.equal(I.held('A'), true);
  press(p, 2, false); press(p, 0); I.poll(2); assert.equal(I.held('Y'), true); assert.equal(I.held('A'), false);
  assert.match(w.localStorage.getItem('dannoura_pad_maps'), /Generic USB Joystick/);
});

test('決定ボタンの位置：右にすると confirm＝B・cancel＝A（設定は保存）', () => {
  const w = boot(), I = w.INPUT;
  assert.equal(I.actionButton('confirm'), 'A'); assert.equal(I.actionButton('cancel'), 'B');
  I.setOpt('confirm', 'east');
  assert.equal(I.actionButton('confirm'), 'B'); assert.equal(I.actionOf('A'), 'cancel');
  assert.match(w.localStorage.getItem('dannoura_pad_opts'), /east/);
});

test('複数台：どちらのボタンも効き、最後に押した台が「今の台」', () => {
  const w = boot(), I = w.INPUT, a = pad(), b = pad({ index: 1, id: 'DualSense Wireless Controller' }); w.navigator.pads = [a, b];
  I.poll(1); press(b, 1); I.poll(2);
  assert.equal(I.held('B'), true); assert.equal(I.state.index, 1); assert.equal(I.state.family, 'ps');
});

test('操作の型の積み替え：ミニゲームで積み、終われば元の型に戻る', () => {
  const w = boot(), I = w.INPUT;
  const t1 = I.pushProfile(w.PAD_PROFILES.ui); const t2 = I.pushProfile(w.PAD_PROFILES.shooter);
  assert.equal(I.profile().name, '炎上コメント撃退');
  I.popProfile(t2); assert.equal(I.profile(), w.PAD_PROFILES.ui); I.popProfile(t1); assert.equal(I.profile(), null);
});

test('入力遅延の目安：コントローラーの更新時刻から読み取りまでを数える', () => {
  const w = boot(), I = w.INPUT, p = pad(); w.navigator.pads = [p];
  p.timestamp = 100; I.poll(108); p.timestamp = 120; I.poll(124);
  assert.equal(I.stats.lagN, 2); assert.equal(I.stats.lagSum, 12); assert.equal(I.stats.lagMax, 8);
});

test('全ミニゲーム（目録＋高難易度版）に操作の型があり、キー名・ボタン名が正しい', () => {
  const w = boot();
  vm.runInContext(read('minigames/registry.js') + '\n;globalThis.__ids = MG_META.map(m => m.id);', w);
  const ids = w.__ids.concat(['runner_hard']);
  assert.ok(ids.length >= 17);
  const BTN = new Set(w.INPUT.BTN);
  const KEY = /^(Enter|Escape| |Shift|Arrow(Up|Down|Left|Right)|[a-z0-9]|@click)$/;
  for (const id of ids) {
    const p = w.padProfileFor(id, null);
    assert.ok(p, id + ' の型がある');
    assert.ok(['arrows', 'tap', 'none'].includes(p.move), id + ' の move');
    for (const [b, k] of Object.entries(p.keys || {})) {
      assert.ok(BTN.has(b), `${id}: ボタン名 ${b}`);
      for (const kk of [].concat(k)) assert.match(kk, KEY, `${id}: キー ${kk}`);
    }
    assert.ok(Array.isArray(p.help) && p.help.length >= 1, id + ' の操作説明');
  }
  // 本編・家・歌・ページの型
  for (const k of ['ui', 'home', 'song', 'vkbd', 'page']) assert.ok(w.PAD_PROFILES[k], k);
});

test('ミニゲームの定義に pad があれば、それを優先する', () => {
  const w = boot();
  const p = w.padProfileFor('newgame', { name: '新作', pad: { keys: { A: 'z' }, help: [['A', 'ジャンプ']] } });
  assert.equal(p.name, '新作'); assert.equal(p.keys.A, 'z'); assert.equal(p.move, 'arrows');
});

test('index.html と sw.js：入力のファイルを読み、オフライン用にも保存する', () => {
  const html = read('index.html'), sw = read('sw.js');
  for (const f of ['input/input-manager.js', 'input/profiles.js', 'input/vkeyboard.js', 'input/diag.js', 'input/pad-ui.js']) {
    assert.ok(html.includes(`<script src="${f}"></script>`), f);
    assert.ok(sw.includes(`'${f}'`), 'sw.js ' + f);
  }
  assert.ok(html.indexOf('input/input-manager.js') < html.indexOf('input/pad-ui.js'), '入力管理が先');
  assert.match(html, /viewport-fit=cover/);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
