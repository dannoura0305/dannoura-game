// 『境界侵食』コントローラー対応（利用者の依頼「コントローラー対応にしてください」）：
//  1. DOM の画面（タイトル・章選択・設定・一時停止メニューの各タブ・セーブ・金庫・調べ物と選択肢・倒れた時・スタッフロール）を
//     十字キー／左スティックで選び、A（下）で決定、B（右）で戻る・閉じる、LB／RB でメニューのタブ。焦点は枠（.sh-padfocus）で見せる。
//     スライダー・選ぶ欄は左右で値を変える。決定に使った A は遊びの操作（回避）に化けない（input.swallowPad）。
//  2. 最後に使った入力がコントローラーなら、HUD の右下・調べるの印・会話の ▼・飛ばすの案内・操作／キーの欄をコントローラーの名前に（PlayStation は ×○□△）。
//  3. 振動（vibrationActuator）：当たり・被弾・一閃で軽く。設定「コントローラーの振動」で切れる。
//  4. 接続・切断のお知らせ（#sh-padnote）。遊んでいる最中に外れたら一時停止。
//  5. View を押しながら RB＝近接の武器を順に（タッチの「替 長押し」と同じ）。暴走の「抑える」の案内は View（実際の割り当て）。
// ブラウザの試験は Playwright（/opt/node22/lib/node_modules/playwright）と chromium（/opt/pw-browsers/chromium）がある時だけ。
// navigator.getGamepads を差し替えた偽のコントローラーで操作する。環境変数 PAD_SHOTS=<フォルダ> で画面撮りを保存する。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = p => readFileSync(join(ROOT, p), 'utf8');
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('  ✓ ' + name); } catch (e) { console.log('  ✗ ' + name + '\n    ' + (e && e.stack || e)); process.exitCode = 1; } };

// ── 静的な確認 ──
await t('padnav.js：表示名（Xbox／PlayStation）・文の置き換え・割り当て表', async () => {
  const P = await import(join(ROOT, 'shinshoku/ui/padnav.js'));
  assert.equal(P.padStyleOf('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'), 'xbox');
  assert.equal(P.padStyleOf('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'ps');
  P.setPadStyle('xbox'); assert.equal(P.padLabel('A'), 'A'); assert.equal(P.padText('X／Y 長押し／LT＋RT'), 'X／Y 長押し／LT＋RT');
  P.setPadStyle('ps'); assert.equal(P.padLabel('A'), '×'); assert.equal(P.padLabel('LB'), 'L1');
  assert.equal(P.padText('X／Y 長押し／LT＋RT／A／LB、View（Back）長押し、Start'), '□／△ 長押し／L2＋R2／×／L1、Create長押し、Options');
  assert.match(P.padKbd('B'), /class="sh-pk pk-b ps">○</);
  P.setPadStyle('xbox');
  const keys = P.PAD_BINDS.map(r => r[0]);
  for (const k of ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'R3', 'L3', 'View', 'Start', 'View＋RB']) assert.ok(keys.includes(k), k);
});

await t('input.js：決定の A を飲み込む・振動（設定で切れる）・View＋RB で近接を順に。既存の割り当ては変えない', () => {
  const s = src('shinshoku/core/input.js');
  assert.match(s, /swallowPad\(i\) \{ this\.padPrev\[i\] = true; \}/);
  assert.match(s, /if \(this\.rumbleOff \|\| this\.device !== 'pad'\) return false;/);
  assert.match(s, /playEffect\(a\.type \|\| 'dual-rumble'/);
  assert.match(s, /if \(pr\(5\)\) \{ if \(b\(8\)\) o\.cycleMelee = true; else o\.swap = true; \}/);
  // 既存の割り当て（A 回避・B 調べる・X 攻撃・LB 弾く・Start 一時停止・View 化け）
  for (const k of ['if (pr(0)) o.dodge = true', 'if (pr(1)) o.interact = true', 'if (pr(4)) o.parry = true', 'if (pr(9)) o.pause = true', 'if (b(8)) o.transform = true', "if (pr(2)) { if (b(6)) o.reload = true; else o.attack = true; }"]) assert.ok(s.includes(k), k);
  const m = src('shinshoku/main.js');
  assert.match(m, /if \(this\.padNav\) this\.padNav\.poll\(dt\);/);
  assert.match(m, /rumble: true, keys: \{\} \}\);/);
  const c = src('shinshoku/game/combat.js');
  for (const k of ["this.rumble('hurt')", "this.rumble('issen')", "this.rumble('hit')"]) assert.ok(c.includes(k), k);
  // 暴走の「抑える」：実際の割り当て（View）を案内する
  const c5 = src('shinshoku/game/ch5.js');
  assert.doesNotMatch(c5, /LB\+RB|LB＋RB/);
  assert.match(c5, /hold: padLabel\('View'\)/);
});

// ── ブラウザでの確認 ──
const PW = '/opt/node22/lib/node_modules/playwright/index.mjs', CHROME = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
if (!existsSync(PW) || !existsSync(CHROME)) {
  console.log('  - Playwright／chromium が無いのでブラウザの試験はとばす');
} else {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.vrm': 'application/octet-stream', '.vrma': 'application/octet-stream', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.wasm': 'application/wasm' };
  const server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const f = join(ROOT, p || 'index.html');
    if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
    try { const b = readFileSync(f); res.writeHead(200, { 'content-type': TYPES[extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(b); } catch (e) { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const SHOTS = process.env.PAD_SHOTS || null; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const { chromium } = await import(PW);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  // 偽のコントローラー（標準配置・振動あり）。__padPress(i) は描画のこまで数えて押して離す
  const FAKE_PAD = (padId) => {
    const mk = () => ({ id: padId, index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0],
      vibrationActuator: { type: 'dual-rumble', playEffect(type, o) { (window.__rumbles || (window.__rumbles = [])).push([type, o.strongMagnitude, o.weakMagnitude, o.duration]); return Promise.resolve('complete'); } } });
    window.__pad = null;
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__pad, null, null, null] });
    const fire = (type, gp) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: gp }); dispatchEvent(e); };
    window.__padConnect = () => { window.__pad = mk(); fire('gamepadconnected', window.__pad); };
    window.__padDisconnect = () => { const gp = window.__pad; gp.connected = false; window.__pad = null; fire('gamepaddisconnected', gp); };
    const frames = k => new Promise(r => { let i = 0; const f = () => { if (++i >= k) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
    window.__padSet = (i, on) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; };
    window.__padPress = async (i, hold = 3) => { window.__padSet(i, true); await frames(hold); window.__padSet(i, false); await frames(3); };
    window.__padHold = async (list, hold = 3) => { for (const i of list) window.__padSet(i, true); await frames(hold); for (const i of list) window.__padSet(i, false); await frames(3); };
    window.__padStick = async (x, y, hold = 3) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; await frames(hold); window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; await frames(3); };
  };
  const XBOX_ID = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)';
  const PS_ID = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
  let lastCtx = null;
  const open = async (query = '', padId = XBOX_ID, storage = null) => {
    if (lastCtx) { await lastCtx.close().catch(() => {}); lastCtx = null; }      // 前の試験が途中で落ちても、重い描画を残さない
    const ctx = lastCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); ctx.setDefaultTimeout(60000);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.addInitScript(FAKE_PAD, padId);
    if (storage) await page.addInitScript(storage);
    await page.goto(`${BASE}/shinshoku.html${query}`, { timeout: 120000 });
    await page.waitForFunction(() => window.__sh && window.__sh.state().mode === 'title' && !document.getElementById('sh-title').hidden, null, { timeout: 120000, polling: 100 });
    return { ctx, page, errs };
  };
  const shot = async (page, name) => { if (SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: join(SHOTS, name) }); } };
  const A = 0, B = 1, X = 2, LB = 4, RB = 5, VIEW = 8, START = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
  const press = (page, i, hold) => page.evaluate(([i, h]) => window.__padPress(i, h), [i, hold || 3]);
  const focused = page => page.evaluate(() => { const e = document.querySelector('.sh-padfocus'); return e ? { tag: e.tagName, data: Object.assign({}, e.dataset), text: e.textContent.trim().slice(0, 30) } : null; });
  /** 焦点が cond を満たすまで、方向を押す（最大 n 回） */
  const seek = async (page, dir, cond, n = 40) => { for (let i = 0; i < n; i++) { const f = await focused(page); if (f && cond(f)) return f; await press(page, dir); } const f = await focused(page); assert.ok(f && cond(f), '焦点が見つからない ' + JSON.stringify(f)); return f; };

  try {
    await t('タイトル → 章選択（開く・B で閉じる）→ 設定（チェック・スライダー・選ぶ欄を変える・B で閉じる）→ はじめから → 会話送り → 一時停止 → タブ → 設定 → B で再開', async () => {
      const { ctx, page, errs } = await open('?test=1');
      // 接続のお知らせ
      await page.evaluate(() => window.__padConnect());
      await page.waitForFunction(() => document.getElementById('sh-padnote').classList.contains('on'));
      assert.match(await page.locator('#sh-padnote').textContent(), /コントローラーをつなぎました：Xbox Wireless Controller/);
      // ボタンを押すと焦点の枠（最初は一番上の見えるボタン＝はじめから）
      await press(page, DOWN);
      let f = await focused(page);
      assert.equal(f && f.data.a, 'chapters', '下で「章選択」へ ' + JSON.stringify(f));
      assert.equal(await page.evaluate(() => document.body.classList.contains('dev-pad')), true);
      await shot(page, 'pad_title_focus.png');
      // 章選択：A で開く → 焦点は表の中 → B で閉じる
      await press(page, A);
      await page.waitForFunction(() => !document.querySelector('#sh-title .tt-panel').hidden);
      f = await focused(page); assert.ok(f && document, '表の中に焦点'); assert.ok(await page.evaluate(() => !!document.querySelector('#sh-title .tt-panel .sh-padfocus')), '焦点が表の中');
      await press(page, B);
      await page.waitForFunction(() => document.querySelector('#sh-title .tt-panel').hidden);
      // 設定：下へ → A
      await seek(page, DOWN, x => x.data.a === 'settings');
      await press(page, A);
      await page.waitForFunction(() => !document.getElementById('sh-menu').hidden);
      assert.equal(await page.evaluate(() => __sh.state().mode), 'title');
      // チェック：雨（A で切り替え）
      const rain0 = await page.evaluate(() => __sh.game.settings.rain);
      await seek(page, DOWN, x => x.data.s === 'rain');
      await shot(page, 'pad_title_settings_focus.png');
      await press(page, A);
      assert.equal(await page.evaluate(() => __sh.game.settings.rain), !rain0, 'チェックが切り替わる');
      // スライダー：視点の速さ（右で +0.1）
      const sens0 = await page.evaluate(() => __sh.game.settings.sens);
      await seek(page, DOWN, x => x.data.s === 'sens');
      await press(page, RIGHT);
      const sens1 = await page.evaluate(() => __sh.game.settings.sens);
      assert.ok(Math.abs(sens1 - (sens0 + 0.1)) < 1e-6, `スライダーが右で上がる ${sens0} → ${sens1}`);
      assert.equal(await page.evaluate(() => __sh.game.input.sens), sens1);
      assert.equal((await focused(page)).data.s, 'sens', '左右では焦点が動かない');
      await shot(page, 'pad_settings_slider.png');
      // 選ぶ欄：難しさ（左右で変わる）
      await seek(page, UP, x => x.data.s === 'difficulty');
      const d0 = await page.evaluate(() => __sh.game.settings.difficulty);
      await press(page, RIGHT);
      const d1 = await page.evaluate(() => __sh.game.settings.difficulty);
      assert.notEqual(d1, d0, '選ぶ欄が変わる'); await press(page, LEFT);
      assert.equal(await page.evaluate(() => __sh.game.settings.difficulty), d0);
      // 振動の切り替えがある
      assert.equal(await page.locator('#sh-menu [data-s="rumble"]').count(), 1);
      // B で閉じる（タイトルへ戻る）
      await press(page, B);
      await page.waitForFunction(() => document.getElementById('sh-menu').hidden);
      assert.equal(await page.evaluate(() => __sh.state().mode), 'title');
      // はじめから
      await seek(page, UP, x => x.data.a === 'new');
      await press(page, A);
      await page.waitForFunction(() => __sh.state().mode !== 'title', null, { timeout: 90000 });
      await page.waitForFunction(() => __sh.state().mode === 'dialog', null, { timeout: 30000 });
      // 会話：▼ の横に A・操作の案内はコントローラーの名前
      assert.match(await page.locator('#sh-dialog .sh-dnext').innerHTML(), /sh-pk pk-a/);
      const lines = await page.evaluate(() => __sh.game.dialog.lines.length);
      for (let i = 0; i < lines + 2 && await page.evaluate(() => __sh.state().mode === 'dialog'); i++) {
        const before = await page.evaluate(() => __sh.game.dialog.i);
        const txt = await page.locator('#sh-dialog .sh-dtext').textContent();
        if (/スティック/.test(txt)) { assert.match(txt, /左スティック：移動.*B：話す・調べる/); await shot(page, 'pad_dialog.png'); }
        await press(page, A);
        const after = await page.evaluate(() => __sh.game.dialog ? __sh.game.dialog.i : 99);
        assert.ok(after > before, `A で会話が進む ${before} → ${after}`);
      }
      assert.equal(await page.evaluate(() => __sh.state().mode), 'play');
      // 会話を送った A は回避にならない（最後の A）
      assert.notEqual(await page.evaluate(() => __sh.game.player.fighter.st.name), 'dodge');
      // HUD の右下：コントローラーの名前
      await page.waitForFunction(() => /sh-pk/.test(document.querySelector('.sh-hints').innerHTML));
      assert.match(await page.locator('.sh-hints').innerHTML(), /pk-a">A</);
      await shot(page, 'pad_hud.png');
      // Start で一時停止 → 焦点は「再開」
      await press(page, START);
      await page.waitForFunction(() => __sh.state().mode === 'pause');
      f = await focused(page); assert.equal(f && f.data.tab, 'top');
      await shot(page, 'pad_pause_focus.png');
      // RB でタブ（地図 → 装備 → 操作 → キー → 設定）
      for (const tab of ['map', 'equip', 'controls', 'keys']) { await press(page, RB); assert.equal(await page.evaluate(() => __sh.game.ui.menuTab), tab); }
      // キー：コントローラーの割り当て（見るだけ）がキーボードより先
      assert.match(await page.locator('#sh-menu .sh-mbody').innerHTML(), /^<div class="sh-phead sh-padkeys-h">コントローラー（標準配置）/);
      assert.ok(await page.locator('#sh-menu .sh-padkeys tr').count() >= 15);
      await shot(page, 'pad_keys_tab.png');
      await press(page, LB);
      assert.equal(await page.evaluate(() => __sh.game.ui.menuTab), 'controls');
      assert.equal(await page.locator('#sh-menu .sh-ctl.pad-on').count(), 1, '操作の欄：コントローラーの列を強調');
      await shot(page, 'pad_controls_tab.png');
      await press(page, RB); await press(page, RB);
      assert.equal(await page.evaluate(() => __sh.game.ui.menuTab), 'settings');
      // 設定の項目を変える（音量のスライダーを左へ・字幕の大きさ）
      const v0 = await page.evaluate(() => __sh.game.settings.volume);
      await seek(page, DOWN, x => x.data.s === 'volume');
      await press(page, LEFT);
      assert.ok(Math.abs(await page.evaluate(() => __sh.game.settings.volume) - (v0 - 0.05)) < 1e-6, '音量が下がる');
      const sub0 = await page.evaluate(() => __sh.game.settings.subSize || 'm');
      await seek(page, UP, x => x.data.s === 'subSize');
      await press(page, A);
      assert.notEqual(await page.evaluate(() => __sh.game.settings.subSize), sub0, 'A で選ぶ欄が次へ');
      // B で閉じる → 遊びへ。B は「調べる」にも回避にもならない
      await press(page, B);
      await page.waitForFunction(() => __sh.state().mode === 'play');
      assert.equal(await page.evaluate(() => document.getElementById('sh-menu').hidden), true);
      assert.equal(await page.evaluate(() => document.querySelectorAll('.sh-padfocus').length), 0, '遊びの間は枠を出さない');
      // 設定は保存される
      assert.equal(await page.evaluate(() => JSON.stringify(__sh.game.store.readSettings().sens)), JSON.stringify(sens1));
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('調べ物・選択肢・金庫・倒れた時・セーブ・スタッフロール：十字キーと A／B で操作できる', async () => {
      const { ctx, page, errs } = await open('?test=1');
      await page.evaluate(() => { window.__padConnect(); const g = __sh.game; document.getElementById('sh-title').hidden = true; g.mode = 'play'; });
      // 選択肢（閉じられない）：下で 2 つ目 → A
      await page.evaluate(() => { const g = __sh.game; g.mode = 'puzzle'; window.__picked = null; g.ui.choiceUI('……どうする？', [{ id: 'a', label: '一つ目' }, { id: 'b', label: '二つ目' }, { id: 'c', label: '三つ目' }], id => { window.__picked = id; g.ui.closePuzzle(); g.mode = 'play'; }); });
      await press(page, DOWN);
      assert.equal((await focused(page)).data.pick, 'b');
      await shot(page, 'pad_choice_focus.png');
      await press(page, B);
      assert.equal(await page.evaluate(() => window.__picked), null, 'B では閉じない（選ぶまで）');
      await press(page, A);
      assert.equal(await page.evaluate(() => window.__picked), 'b');
      // 照合の画面（#sh-puz）：B で閉じる
      await page.evaluate(() => __sh.game.openRoster());
      await page.waitForFunction(() => !document.getElementById('sh-puz').hidden);
      await press(page, DOWN);
      assert.ok(await page.evaluate(() => !!document.querySelector('#sh-puz .sh-padfocus')));
      await shot(page, 'pad_puzzle_focus.png');
      await press(page, B);
      await page.waitForFunction(() => document.getElementById('sh-puz').hidden && __sh.state().mode === 'play');
      // 金庫：▲ を A で 1 つ上げる・右の桁へ・B でやめる
      await page.evaluate(() => __sh.game.openSafe());
      await page.waitForFunction(() => !document.getElementById('sh-safe').hidden);
      await press(page, DOWN); await press(page, UP);
      assert.equal((await focused(page)).data.i, '0');
      await press(page, A);
      assert.equal(await page.locator('#sh-safe .sh-dial b').first().textContent(), '1');
      await press(page, RIGHT);
      assert.equal((await focused(page)).data.i, '1', '右の桁へ');
      await press(page, A); await press(page, A);
      assert.equal(await page.locator('#sh-safe .sh-dial b').nth(1).textContent(), '2');
      await shot(page, 'pad_safe_focus.png');
      await press(page, B);
      await page.waitForFunction(() => document.getElementById('sh-safe').hidden && __sh.state().mode === 'play');
      // セーブ（ノートPC）：B で閉じる
      await page.evaluate(() => { const g = __sh.game; g.mode = 'pause'; g.ui.openSave(); });
      assert.equal((await focused(page)).data.close, '1');
      await press(page, DOWN); assert.equal((await focused(page)).data.save, 'slot1');
      await press(page, B);
      await page.waitForFunction(() => __sh.state().mode === 'play' && document.getElementById('sh-menu').hidden);
      // 倒れた時：「直前から」に焦点 → A
      await page.evaluate(() => { const g = __sh.game; window.__retried = 0; g.retry = () => { window.__retried++; g.ui.showDead(false); }; g.ui.showDead(true); });
      assert.equal((await focused(page)).data.a, 'retry');
      await shot(page, 'pad_dead_focus.png');
      await press(page, A);
      assert.equal(await page.evaluate(() => window.__retried), 1);
      // スタッフロール：B（または A）で飛ばす
      await page.evaluate(() => { window.__crDone = 0; __sh.game.ui.credits([['t', 'おしまい']], 60, () => { window.__crDone++; }); });
      await press(page, B);
      assert.equal(await page.evaluate(() => window.__crDone), 1);
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('振動（当たり・被弾・一閃）と設定で切る・切断で一時停止とお知らせ・PlayStation の名前・View＋RB で近接を順に', async () => {
      const { ctx, page, errs } = await open('?test=1', PS_ID);
      await page.evaluate(() => { window.__padConnect(); const g = __sh.game; document.getElementById('sh-title').hidden = true; g.mode = 'play'; });
      await press(page, X);                                                       // 入力の種類＝コントローラー
      assert.equal(await page.evaluate(() => __sh.game.input.device), 'pad');
      // 振動
      await page.evaluate(() => { const g = __sh.game; g.rumble('hit'); });
      await page.waitForTimeout(80);
      await page.evaluate(() => { const g = __sh.game; g.rumble('hurt'); });
      await page.waitForTimeout(80);
      await page.evaluate(() => { const g = __sh.game; g.rumble('issen'); });
      let R = await page.evaluate(() => window.__rumbles || []);
      assert.equal(R.length, 3); assert.equal(R[0][0], 'dual-rumble'); assert.ok(R[1][1] > R[0][1], '被弾は当たりより強い');
      await page.evaluate(() => __sh.game.applySetting('rumble', false));
      await page.waitForTimeout(80);
      await page.evaluate(() => __sh.game.rumble('hurt'));
      R = await page.evaluate(() => window.__rumbles || []);
      assert.equal(R.length, 3, '切ると振動しない');
      await page.evaluate(() => __sh.game.applySetting('rumble', true, true));
      // PlayStation の名前（HUD・調べるの印）
      await page.waitForFunction(() => /□/.test(document.querySelector('.sh-hints').innerHTML) || /×/.test(document.querySelector('.sh-hints').innerHTML));
      assert.match(await page.locator('.sh-hints').innerHTML(), /pk-a ps">×</);
      await shot(page, 'pad_hud_ps.png');
      // View＋RB：近接を順に（刀と鉄パイプを持っている時）
      await page.evaluate(() => { const F = __sh.game.player.fighter; F.give('katana'); F.give('pipe'); F.give('handgun'); __sh.game.pendingWant = 'katana'; });
      await page.waitForFunction(() => __sh.game.player.fighter.weapon === 'katana' && __sh.game.player.fighter.st.name === 'free', null, { timeout: 20000 });
      await page.evaluate(() => window.__padSet(8, true));
      await press(page, RB);
      await page.evaluate(() => window.__padSet(8, false));
      await page.waitForFunction(() => { const F = __sh.game.player.fighter; return F.weapon === 'pipe' || (F.st.name === 'swap' && F.st.to === 'pipe'); }, null, { timeout: 20000 });
      // 切断：お知らせ・遊びの最中なら一時停止
      await page.evaluate(() => window.__padDisconnect());
      await page.waitForFunction(() => __sh.state().mode === 'pause');
      assert.match(await page.locator('#sh-padnote').textContent(), /コントローラーが外れました/);
      assert.equal(await page.evaluate(() => __sh.game.metrics.padDisconnected), 1);
      assert.deepEqual(errs, []);
      await ctx.close();
    });

    await t('キーボード・マウスは今まで通り：キーを押すと枠が消え、Esc でメニューを開ける', async () => {
      const { ctx, page, errs } = await open('?test=1');
      await page.evaluate(() => window.__padConnect());
      await press(page, DOWN);
      assert.ok(await focused(page));
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(150);
      assert.equal(await focused(page), null, 'キーを押すと枠が消える');
      await page.locator('#sh-title [data-a="settings"]').click();
      await page.waitForFunction(() => !document.getElementById('sh-menu').hidden);
      await page.locator('#sh-menu [data-tab="close"]').click();
      await page.waitForFunction(() => document.getElementById('sh-menu').hidden);
      assert.deepEqual(errs, []);
      await ctx.close();
    });
  } finally {
    if (lastCtx) await lastCtx.close().catch(() => {});
    await browser.close(); server.close();
  }
}
console.log(`shinshoku-gamepad: ${n} passed`);
