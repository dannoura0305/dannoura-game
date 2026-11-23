// 偽のゲームパッド（navigator.getGamepads の差し替え）で、ブラウザの中のゲームをコントローラーだけで動かす道具。
//  使い方：const H = require('./pad-harness.cjs'); const {page, pad} = await H.open(browser, {width, height});
//  pad.tap('A') / pad.hold('RT', ms) / pad.stick('L', x, y) / pad.disconnect() / pad.connect(id)
//  Playwright（require('playwright')）が要る。node tests/e2e/pad-playthrough.cjs で使う（tests/run.mjs では動かさない）。
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const STD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };

function initScript() {
  const mk = () => ({ id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, mapping: 'standard', connected: true, timestamp: 0,
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] });
  window.__pad = null;
  window.__padSet = (i, on) => { const p = window.__pad; if (!p) return; p.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; p.timestamp = performance.now(); };
  window.__padAxis = (i, v) => { const p = window.__pad; if (!p) return; p.axes[i] = v; p.timestamp = performance.now(); };
  window.__padConnect = id => { window.__pad = mk(); if (id) window.__pad.id = id; try { const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e); } catch (_) {} };
  window.__padDisconnect = () => { const p = window.__pad; window.__pad = null; try { const e = new Event('gamepaddisconnected'); e.gamepad = p; window.dispatchEvent(e); } catch (_) {} };
  Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: function () { return [window.__pad, null, null, null]; } });
}

async function open(browser, opt) {
  opt = opt || {};
  const ctx = await browser.newContext({ viewport: { width: opt.width || 844, height: opt.height || 390 }, hasTouch: !!opt.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(initScript);
  if (opt.storage) await page.addInitScript(s => { try { for (const k in s) localStorage.setItem(k, s[k]); } catch (_) {} }, opt.storage);
  await page.goto('file://' + path.join(ROOT, opt.page || 'index.html'));
  const frames = n => page.waitForTimeout(n * 34);
  const pad = {
    async connect(id) { await page.evaluate(i => window.__padConnect(i), id || null); await frames(3); },
    async disconnect() { await page.evaluate(() => window.__padDisconnect()); await frames(3); },
    async down(b) { await page.evaluate(([i]) => window.__padSet(i, true), [STD[b]]); await frames(2); },
    async up(b) { await page.evaluate(([i]) => window.__padSet(i, false), [STD[b]]); await frames(2); },
    async tap(b, wait) { await pad.down(b); await pad.up(b); await page.waitForTimeout(wait == null ? 250 : wait); },
    async hold(b, ms) { await pad.down(b); await page.waitForTimeout(ms); await pad.up(b); },
    async stick(s, x, y) { const o = s === 'R' ? 2 : 0; await page.evaluate(([o, x, y]) => { window.__padAxis(o, x); window.__padAxis(o + 1, y); }, [o, x, y]); await frames(2); },
    async taps(seq, wait) { for (const b of seq) await pad.tap(b, wait); },
  };
  return { ctx, page, pad, errors };
}
module.exports = { open, STD };
