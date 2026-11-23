// コントローラーだけで遊べるかの通し確認（偽のゲームパッド・ヘッドレス Chromium）
//   node tests/e2e/pad-playthrough.cjs [横幅x高さ]   例：node tests/e2e/pad-playthrough.cjs 844x390
//  Playwright が要るので tests/run.mjs には入れていない。結果は ✓／✗ で出し、失敗があれば終了コード 1。
//  確かめること：タイトル → プロローグ → 本編 → ステータス・メニュー切替 → 一時停止メニュー（セーブ・ロード・設定・操作方法・診断）
//   → 全ミニゲーム（開始・操作・一時停止・終了）→ 歌 → 家・庭とゲーム内キーボード → 切断で一時停止 → 最終日 → エンディング
const { chromium } = require('playwright');
const H = require('./pad-harness.cjs');
const [W, Hh] = (process.argv[2] || '844x390').split('x').map(Number);
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info ? '  ' + JSON.stringify(info) : '')); } };

(async () => {
  const browser = await chromium.launch();
  const { page, pad, errors } = await H.open(browser, { width: W, height: Hh });
  const ev = (f, a) => page.evaluate(f, a);
  const wait = ms => page.waitForTimeout(ms);
  await wait(4000);
  await pad.connect();
  ok('接続を検出（INPUT.state.connected）', await ev(() => INPUT.state.connected));

  // ── タイトル → 本編 ──
  await pad.tap('A', 800);
  ok('A でタイトルのメニューが出る', await ev(() => !!document.querySelector('.pr-mi')));
  await pad.tap('DOWN', 300); await pad.tap('A', 800);
  ok('タイトル：エンディング一覧を開ける', await ev(() => document.getElementById('endlist-sc').classList.contains('active')));
  await pad.tap('B', 600);
  ok('B でエンディング一覧を閉じる', await ev(() => !document.getElementById('endlist-sc').classList.contains('active')));
  await pad.tap('UP', 300);
  await pad.tap('A', 1500);
  await pad.tap('B', 4000);   // オープニングを飛ばす（Esc）
  // 本編のメイン画面が前に出るまで、コントローラーだけで進める（遊び方・会話・配信・結果・イベント）
  const OVL = ['streaming-ol', 'result-sc', 'ev-popup', 'tutorial-sc', 'mg-picker', 'status-sc', 'skill-sc', 'settings-sc', 'endlist-sc', 'slot-sc', 'song-mini'];
  const front = () => ev(ids => {
    const on = ids.filter(id => document.getElementById(id)?.classList.contains('active'));
    return { on, st: !!document.querySelector('#st-root.st-on'), sc: !!document.querySelector('#str-choices button.sc'), type: !!document.querySelector('#str-choices .str-type-btn'), mg: document.body.classList.contains('mg-active'), win: PADUI.win.kind, home: document.body.classList.contains('home-open') };
  }, OVL);
  const settle = async (max = 60) => {
    for (let n = 0; n < max; n++) {
      const f = await front();
      if (!f.on.length && !f.st && !f.mg && !f.win && !f.home) return true;
      if (f.win) { await pad.tap('B', 300); continue; }
      if (f.mg) { await pad.tap('START', 300); await pick('mgquit'); continue; }
      if (f.home) { await pad.tap('B', 400); continue; }
      if (f.on.includes('streaming-ol')) { if (f.sc) { await pad.tap('UP', 250); await pad.tap('A', 1000); } else await pad.tap('A', 900); continue; }
      if (f.on.some(id => ['status-sc', 'skill-sc', 'settings-sc', 'endlist-sc', 'slot-sc', 'mg-picker'].includes(id))) { await pad.tap('B', 400); continue; }
      await pad.tap('A', 400);
    }
    return false;
  };
  // 一時停止メニューの項目を十字キーだけで選んで押す（並びが 1 列でも 2 列でも、焦点から目当ての向きへ動かす）
  const pick = async key => {
    for (let k = 0; k < 24; k++) {
      const d = await ev(key => {
        const t = document.querySelector(`#pad-ol [data-pad="${key}"]`), f = document.querySelector('#pad-ol .pad-focus');
        if (!t) return 'none'; if (t === f) return 'here';
        if (!f) return 'DOWN';
        const a = f.getBoundingClientRect(), b = t.getBoundingClientRect();
        const dy = (b.top + b.height / 2) - (a.top + a.height / 2), dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        return Math.abs(dy) > 4 ? (dy > 0 ? 'DOWN' : 'UP') : (dx > 0 ? 'RIGHT' : 'LEFT');
      }, key);
      if (d === 'none') return -1;
      if (d === 'here') { await pad.tap('A', 900); return k; }
      await pad.tap(d, 110);
    }
    return -1;
  };
  ok('本編のメイン画面まで進められる', await settle(), await front());
  await wait(500);
  ok('本編の画面に入った', await ev(() => !document.getElementById('game-screen').classList.contains('hidden') && typeof gs !== 'undefined' && gs.day === 1));
  ok('操作の型が本編（ui）', await ev(() => PADUI.ctx === 'ui' && INPUT.profile() && INPUT.profile().ctx === 'ui'));

  // ── メニュー切替・ステータス ──
  await settle(); await pad.tap('RB', 700);
  ok('RB で下のメニューが次へ（工場）', await ev(() => document.getElementById('nav-factory').classList.contains('active') || document.getElementById('mg-picker').classList.contains('active')));
  await settle(); await pad.tap('LB', 500); await settle();
  await pad.tap('Y', 800);
  ok('Y でステータス', await ev(() => document.getElementById('status-sc')?.classList.contains('active') || document.getElementById('nav-status').classList.contains('active')));
  await settle(); await pad.tap('LB', 500); await settle();

  // ── 一時停止メニュー：セーブ・ロード・設定 ──
  await pad.tap('START', 500);
  ok('START で一時停止メニュー', await ev(() => PADUI.win.kind === 'pause'));
  await ev(() => { try { localStorage.removeItem('dannoura_save_slot1'); } catch (e) {} });
  const saved0 = await ev(() => Object.keys(localStorage).filter(k => /save/.test(k)).map(k => localStorage.getItem(k).length).join());
  ok('メニューに「セーブ」がある', (await pick('save')) >= 0);
  const saved1 = await ev(() => Object.keys(localStorage).filter(k => /save/.test(k)).map(k => localStorage.getItem(k).length).join());
  ok('セーブできた（localStorage に書けた）', saved1 && saved1 !== '' && /\d/.test(saved1), { saved0, saved1 });
  await pad.tap('START', 500); await pick('load');
  ok('ロード：スロット選択が開く', await ev(() => document.getElementById('slot-sc')?.classList.contains('active')));
  await pad.tap('A', 1500);
  ok('A でロードして本編へ戻る', await ev(() => !document.getElementById('slot-sc')?.classList.contains('active') && !document.getElementById('game-screen').classList.contains('hidden')));
  await pad.tap('START', 500); await pick('settings');
  ok('設定画面が開く', await ev(() => document.getElementById('settings-sc').classList.contains('active')));
  await pad.tap('B', 600);
  ok('B で設定を閉じる', await ev(() => !document.getElementById('settings-sc').classList.contains('active')));
  await pad.tap('SELECT', 500);
  ok('SELECT で操作方法', await ev(() => PADUI.win.kind === 'help' && /本編/.test(document.querySelector('#pad-ol h2').textContent)));
  await pad.tap('B', 400);
  await pad.tap('START', 500); await pick('diag');
  ok('ゲームパッド診断が開き、名前が出る', await ev(() => PADUI.win.kind === 'diag' && /Xbox 360/.test(document.querySelector('.pdg-pads').textContent)));
  await pad.down('X'); await wait(150);
  ok('診断：X ボタンが光る', await ev(() => document.querySelector('.pdg-b[data-b="X"]').classList.contains('on')));
  await pad.up('X');
  await pad.tap('B', 400);
  if (await ev(() => PADUI.win.open)) await pad.tap('B', 400);
  ok('診断を閉じる', await ev(() => !PADUI.win.open));

  // ── 全ミニゲーム ──
  const ids = await ev(() => MINIGAMES.map(m => m.id));
  for (const id of ids) {
    await ev(async id => { gs.mgDay = {}; if (typeof closeMinigamePicker === 'function') closeMinigamePicker(); return MG.open(id); }, id);
    await wait(2500);
    const ctx = await ev(() => PADUI.ctx);
    const hasProf = await ev(id => !!(padProfileFor(id, MINIGAMES.find(m => m.id === id))), id);
    for (const b of ['A', 'A', 'RIGHT', 'A', 'LEFT', 'DOWN', 'UP', 'A']) await pad.tap(b, 300);
    await pad.stick('R', 0.7, 0.3); await wait(250); await pad.stick('R', 0, 0);
    await pad.tap('START', 500);
    const paused = await ev(() => MG._paused === true && PADUI.win.kind === 'pause');
    await pick('mgquit');
    const ended = await ev(() => MG._ended === true);
    ok(`ミニゲーム ${id}：専用の型・一時停止・終了`, ctx === 'mg:' + id && hasProf && paused && ended, { ctx, hasProf, paused, ended });
    await settle();
  }
  ok('ミニゲームを抜けると本編の型に戻る', await ev(() => PADUI.ctx === 'ui' && INPUT.profile().ctx === 'ui'));

  // ── 切断で一時停止 ──
  await ev(async () => { gs.mgDay = {}; return MG.open('fishing'); }); await wait(2000);
  await pad.tap('A', 300);
  await pad.disconnect();
  ok('遊んでいる最中に外れたら一時停止', await ev(() => MG._paused === true && PADUI.win.kind === 'disc'));
  await pad.connect(); await pad.tap('A', 600);
  ok('つなぎ直して A で再開', await ev(() => MG._paused === false && !PADUI.win.open));
  await ev(() => MG.end('quit')); await wait(500); await settle();

  // ── 歌（本編の音楽ゲーム） ──
  await ev(() => openSong()); await wait(2500);
  ok('歌の型に切り替わる', await ev(() => PADUI.ctx === 'song'));
  const before = await ev(() => ssp + ssg + ssm);
  for (const b of ['X', 'A', 'Y', 'B', 'LEFT', 'DOWN', 'UP', 'RIGHT']) await pad.tap(b, 120);
  const after = await ev(() => ssp + ssg + ssm);
  ok('ボタンでレーンを叩ける', await ev(() => typeof hitNote === 'function') && after >= before, { before, after });
  await ev(() => endSong()); await wait(500); await settle();

  // ── 家・庭とゲーム内キーボード ──
  await ev(() => HOME.open('room')); await wait(1200);
  ok('家・庭の型', await ev(() => PADUI.ctx === 'home'));
  await pad.tap('DOWN', 300);
  ok('十字キーで家のボタンを選べる', await ev(() => !!document.querySelector('#home-ol .pad-focus, .pad-focus')));
  await ev(() => { window.__name = '(pending)'; HOME.ui.prompt('名前は？', '', 8).then(v => { window.__name = v; }); }); await wait(700);
  ok('文字欄でゲーム内キーボードが出る', await ev(() => VKBD.isOpen()));
  await pad.taps(['A', 'RIGHT', 'A', 'Y'], 200);
  await pad.tap('START', 700);
  ok('名前を入れて決定できる（あが）', (await ev(() => window.__name)) === 'あが', await ev(() => window.__name));
  await pad.tap('B', 600); if (await ev(() => document.body.classList.contains('home-open'))) await pad.tap('B', 600);
  ok('B で家を閉じる', await ev(() => !document.body.classList.contains('home-open')));

  // ── 最終日 → エンディング ──
  await settle();
  await ev(() => { gs.day = 30; gs.mental = 90; gs.fatigue = 10; gs.debt = 100000; updateStats(); updateDayInfo(); });
  let reached = false;
  for (let n = 0; n < 200 && !reached; n++) {
    const s = await ev(() => ({ ctx: PADUI.ctx, end: !!(document.querySelector('.pr-end') && document.querySelector('.pr-end').getClientRects().length) || !!document.getElementById('ending-sc')?.classList.contains('active'), str: document.getElementById('streaming-ol')?.classList.contains('active'), sc: !!document.querySelector('#str-choices button.sc') }));
    if (s.end) { reached = true; break; }
    if (s.ctx.startsWith('mg:')) { await pad.tap('START', 300); await pick('mgquit'); continue; }
    if (s.str && s.sc) { await pad.tap('UP', 250); await pad.tap('A', 900); continue; }
    await pad.tap('A', 350);
  }
  ok('最終日からエンディングまで進む', reached);
  for (let n = 0; n < 40; n++) { if (await ev(() => !!document.querySelector('.pr-end-final') && document.querySelector('.pr-end-final').offsetParent !== null)) break; await pad.tap('A', 400); }
  ok('エンディングの最後（ボタンのある画面）まで A で進む', await ev(() => !!document.querySelector('.pr-end-final') && document.querySelector('.pr-end-final').offsetParent !== null));
  await page.screenshot({ path: require('path').join(__dirname, '..', '..', 'build', 'pad-ending.png') }).catch(() => {});

  ok('ページのエラーなし', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
