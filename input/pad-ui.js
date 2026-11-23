// ══════════════════════════════════════════════════════════
// コントローラーで画面を操作する層（input/input-manager.js の INPUT を使う）
//
//  1. 文脈を見分ける：本編（ui）／家・庭（home）／歌（song）／ミニゲーム（mg:<id>）／文字入力（vkbd）／この層の窓（padmenu）
//     文脈が変わると操作の型（input/profiles.js）を積み替え、押したままのキーを全部離す。
//  2. 橋渡し：論理ボタン → 既存のキー操作（合成した KeyboardEvent）。ゲームの処理はキー操作のまま動く。
//  3. 予備のフォーカス移動：キーを受ける処理が無かった画面（キーが preventDefault されなかった）では、
//     画面のいちばん手前のボタン類を十字キーで選び、A で押す（.pad-focus の枠）。
//  4. 仮想カーソル：右スティック（R3 で左スティックにも）で動かし、RT・A で押す・引きずる（合成の Pointer／Mouse／click）。
//  5. 一時停止メニュー（START）・操作方法（SELECT）・接続／切断のお知らせ・切断時の一時停止・コントローラー設定。
//
//  合成のキーには ev.padSynthetic = true が付く。マウス・タッチ・本物のキーを使うと枠とカーソルを消す。
// ══════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.INPUT || window.PADUI) return;
  const I = window.INPUT, doc = document, $ = s => doc.querySelector(s);
  const PROF = () => window.PAD_PROFILES || {};
  // minigames/core.js の MG・MINIGAMES は const なので window のプロパティにならない。名前で直接見る
  const mgApi = () => (typeof MG !== 'undefined' ? MG : null);
  const mgList = () => (typeof MINIGAMES !== 'undefined' ? MINIGAMES : null);

  // ── 見た目 ──
  const CSS = `
.pad-focus{outline:3px solid #ffd75a!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(255,215,90,.25)!important;}
body:not(.input-pad) .pad-focus{outline:none!important;box-shadow:none!important;}
#pad-cursor{position:fixed;left:0;top:0;z-index:100000;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;display:none;border:2px solid #ffd75a;border-radius:50%;background:rgba(255,215,90,.18);box-shadow:0 0 0 2px rgba(10,8,30,.8),0 0 12px rgba(255,215,90,.6);}
#pad-cursor::after{content:'';position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:#ffd75a;}
#pad-cursor.on{display:block;}#pad-cursor.down{background:rgba(255,215,90,.55);transform:scale(.85);}
#pad-note{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translate(-50%,-140%);z-index:100001;max-width:min(92vw,520px);padding:8px 14px;border:1px solid rgba(0,232,200,.7);border-radius:6px;background:rgba(8,6,24,.96);color:#e8f8ff;font:600 13px/1.5 sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.55);transition:transform .25s;pointer-events:none;text-align:center;}
#pad-note.on{transform:translate(-50%,0);}
.pad-ol{position:fixed;inset:0;z-index:99990;display:none;align-items:center;justify-content:center;background:rgba(3,2,10,.78);padding:calc(12px + env(safe-area-inset-top,0px)) calc(12px + env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) calc(12px + env(safe-area-inset-left,0px));}
.pad-ol.on{display:flex;}
.pad-box{width:min(560px,100%);max-height:100%;overflow:auto;border:2px solid #e6e0ff;border-radius:8px;background:linear-gradient(180deg,#1c1854,#0a0826);color:#e8e4ff;font:14px/1.6 sans-serif;padding:14px 16px;box-shadow:0 0 0 2px #120c34,0 10px 40px rgba(0,0,0,.6);}
.pad-box h2{margin:0 0 8px;font-size:15px;letter-spacing:.08em;color:#ffd75a;display:flex;justify-content:space-between;gap:8px;}
.pad-box h2 small{color:#a99cc8;font-weight:normal;font-size:11px;}
.pad-box .pad-btns{display:flex;flex-direction:column;gap:6px;}
.pad-box button{font:inherit;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(230,224,255,.45);border-radius:5px;padding:8px 12px;text-align:left;cursor:pointer;}
.pad-box button:hover{background:rgba(255,255,255,.12);}
.pad-box .pad-row2{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.pad-box table{width:100%;border-collapse:collapse;font-size:13px;}
.pad-box td{padding:3px 4px;border-bottom:1px solid rgba(230,224,255,.12);vertical-align:top;}
.pad-box td:first-child{white-space:nowrap;width:1%;padding-right:10px;}
.pad-kbd{display:inline-block;min-width:1.6em;padding:0 5px;margin:1px 2px 1px 0;border:1px solid #cfc8f0;border-radius:4px;background:#2a2466;color:#fff;font:600 12px/1.6 sans-serif;text-align:center;}
.pad-kbd.f-A{background:#2f8f3a;}.pad-kbd.f-B{background:#b03a3a;}.pad-kbd.f-X{background:#2f5fb0;}.pad-kbd.f-Y{background:#b0902f;}
.pad-sub{color:#a99cc8;font-size:12px;margin:8px 0 4px;}
.pad-tabs{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 8px;}
.pad-tabs button{padding:4px 8px;font-size:12px;}
.pad-tabs button.on{background:#ffd75a;color:#120c34;}
@media (max-height:480px){.pad-box{font-size:13px;padding:10px 12px;width:min(720px,100%);}.pad-box button{padding:6px 10px;}.pad-box .pad-btns{display:grid;grid-template-columns:1fr 1fr;}}
`;
  const st = doc.createElement('style'); st.id = 'pad-ui-style'; st.textContent = CSS; doc.head.appendChild(st);

  // ── 合成キー ──
  const CODE = { Enter: 'Enter', Escape: 'Escape', ' ': 'Space', Shift: 'ShiftLeft', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', Tab: 'Tab', Backspace: 'Backspace', Control: 'ControlLeft' };
  const KC = { Enter: 13, Escape: 27, ' ': 32, Shift: 16, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Tab: 9, Backspace: 8, Control: 17 };
  function codeOf(k) { if (CODE[k]) return CODE[k]; if (/^[a-z]$/i.test(k)) return 'Key' + k.toUpperCase(); if (/^[0-9]$/.test(k)) return 'Digit' + k; return k; }
  function kcOf(k) { if (KC[k]) return KC[k]; if (/^[a-z]$/i.test(k)) return k.toUpperCase().charCodeAt(0); if (/^[0-9]$/.test(k)) return k.charCodeAt(0); return 0; }
  /** キーを 1 回送る。preventDefault されたら true（＝どこかの処理が受け取った） */
  function sendKey(type, key, repeat) {
    const ae = doc.activeElement;
    const target = ae && ae !== doc.body && ae.isConnected ? ae : doc.body;
    let ev;
    try { ev = new KeyboardEvent(type, { key, code: codeOf(key), keyCode: kcOf(key), which: kcOf(key), bubbles: true, cancelable: true, repeat: !!repeat, shiftKey: key === 'Shift' && type === 'keydown' }); }
    catch (e) { return false; }
    try { Object.defineProperty(ev, 'padSynthetic', { value: true }); } catch (e) { /* 付けられなくても動く */ }
    target.dispatchEvent(ev);
    if (type === 'keydown') PADUI.lastKey = { key, prevented: ev.defaultPrevented };
    return ev.defaultPrevented;
  }
  /** 押したまま（同じキーを複数のボタンで押しても、最後に離すまで押したまま） */
  const held = new Map();
  function hold(key) { const n = held.get(key) || 0; held.set(key, n + 1); if (!n) return sendKey('keydown', key); return true; }
  function unhold(key) { const n = held.get(key) || 0; if (!n) return; if (n <= 1) { held.delete(key); sendKey('keyup', key); } else held.set(key, n - 1); }
  function releaseAll() { for (const k of [...held.keys()]) { held.delete(k); sendKey('keyup', k); } btnKeys.clear(); if (CUR.down) cursorUp(); }
  function tapKey(key, repeat) { const p = sendKey('keydown', key, repeat); sendKey('keyup', key); return p; }

  // ── 予備のフォーカス移動（いちばん手前の操作できる物だけ） ──
  const FOCUS_SEL = 'button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=option],[role=tab],[onclick],[tabindex]:not([tabindex="-1"]),.sk-card';
  const GF = { el: null };
  function topmostOk(el, r) {
    const cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, 24);
    const inView = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight;
    const hitOk = (x, y, owner) => { const h = doc.elementFromPoint(x, y); return !!h && (h === owner || owner.contains(h)); };
    if (inView) { const h = doc.elementFromPoint(cx, cy); return !!h && (h === el || el.contains(h) || (el.tagName === 'INPUT' && h.tagName === 'LABEL' && h.contains(el))); }
    // 画面の外（スクロールの中）：スクロールする親が手前にあれば候補にする
    let p = el.parentElement;
    while (p && p !== doc.body) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) {
        const q = p.getBoundingClientRect(); const x = Math.min(innerWidth - 1, Math.max(0, q.left + q.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, q.top + q.height / 2));
        return hitOk(x, y, p);
      }
      p = p.parentElement;
    }
    return false;
  }
  function candidates(rootEl) {
    const out = [];
    for (const el of (rootEl || doc).querySelectorAll(FOCUS_SEL)) {
      if (el.disabled || el.closest('[hidden],[inert],[aria-hidden="true"]')) continue;
      if (el.id === 'pad-cursor') continue;
      const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || +cs.opacity < 0.05) continue;
      // 入れ子（ボタンの中のボタン）は外側を優先
      if (el.parentElement && el.parentElement.closest(FOCUS_SEL) && out.includes(el.parentElement.closest(FOCUS_SEL))) continue;
      if (topmostOk(el, r)) out.push(el);
    }
    return out;
  }
  function gfSet(el) {
    if (GF.el === el) return;
    if (GF.el) GF.el.classList.remove('pad-focus');
    GF.el = el;
    if (el) {
      el.classList.add('pad-focus');
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* 古い端末 */ }
      try { if (el.tagName !== 'INPUT' || el.type !== 'text') el.focus({ preventScroll: true }); } catch (e) { /* フォーカスできない物 */ }
    }
  }
  function gfMove(dir, rootEl) {
    const list = candidates(rootEl); if (!list.length) { gfSet(null); return false; }
    let cur = GF.el && list.includes(GF.el) ? GF.el : null;
    if (!cur && doc.activeElement && list.includes(doc.activeElement)) cur = doc.activeElement;
    if (!cur) { gfSet(list.slice().sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return (A.top - B.top) || (A.left - B.left); })[0]); return true; }
    // 設定のスライダー・選ぶ欄は左右で値を変える
    if ((dir === 'left' || dir === 'right') && adjust(cur, dir === 'right' ? 1 : -1)) return true;
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let p, s;
      if (dir === 'down') { if (by <= ay + 4) continue; p = by - ay; s = Math.abs(bx - ax); }
      else if (dir === 'up') { if (by >= ay - 4) continue; p = ay - by; s = Math.abs(bx - ax); }
      else if (dir === 'right') { if (bx <= ax + 4) continue; p = bx - ax; s = Math.abs(by - ay); }
      else { if (bx >= ax - 4) continue; p = ax - bx; s = Math.abs(by - ay); }
      const score = p + s * ((dir === 'up' || dir === 'down') ? 1.2 : 2.5);
      if (score < bs) { bs = score; best = el; }
    }
    if (best) gfSet(best);
    return !!best;
  }
  function adjust(el, d) {
    const inp = el.tagName === 'INPUT' && el.type === 'range' ? el : (el.matches && el.matches('label,.set-row') ? el.querySelector('input[type=range]') : null);
    if (inp) {
      const stp = parseFloat(inp.step) || 1, v = Math.min(+inp.max, Math.max(+inp.min, +inp.value + d * stp));
      inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); return true;
    }
    if (el.tagName === 'SELECT') { const n = el.options.length; if (n) { el.selectedIndex = (el.selectedIndex + d + n) % n; el.dispatchEvent(new Event('change', { bubbles: true })); } return true; }
    return false;
  }
  function gfActivate() {
    const el = GF.el && GF.el.isConnected ? GF.el : null; if (!el) return false;
    if (el.tagName === 'SELECT') { adjust(el, 1); return true; }
    if (el.tagName === 'INPUT' && el.type === 'range') return true;
    if ((el.tagName === 'INPUT' && /^(text|search|email|url|tel|number|)$/.test(el.type)) || el.tagName === 'TEXTAREA') { if (window.VKBD) window.VKBD.open(el); return true; }
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
    return true;
  }
  /** B で閉じる：手前の窓の「閉じる・戻る・やめる」ボタンを押す */
  const CLOSE_RE = /^(閉じる|戻る|やめる|キャンセル|×|✕|close|back)$|閉じる|もどる|やめる/i;
  function clickClose() {
    const list = candidates();
    const b = list.find(el => { const t = (el.getAttribute('aria-label') || el.textContent || '').trim(); return CLOSE_RE.test(t) || el.matches('[data-close],.slot-close,.hm-close,[data-a="close"]'); });
    if (b) { b.click(); return true; }
    return false;
  }

  // ── 仮想カーソル ──
  const curEl = doc.createElement('div'); curEl.id = 'pad-cursor'; curEl.setAttribute('aria-hidden', 'true');
  const CUR = { on: false, x: innerWidth / 2, y: innerHeight / 2, down: false, target: null, mode: false };
  function cursorShow(on) { CUR.on = on; curEl.classList.toggle('on', on); if (on) cursorPaint(); }
  function cursorPaint() { curEl.style.transform = `translate(${Math.round(CUR.x)}px,${Math.round(CUR.y)}px)`; }
  function ptr(type, x, y, target) {
    const t = target || doc.elementFromPoint(x, y); if (!t) return null;
    const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, buttons: type === 'up' ? 0 : 1 };
    const P = { down: 'pointerdown', move: 'pointermove', up: 'pointerup' }[type], M = { down: 'mousedown', move: 'mousemove', up: 'mouseup' }[type];
    try { const pe = new PointerEvent(P, Object.assign({ pointerId: 77, pointerType: 'mouse', isPrimary: true, pressure: type === 'up' ? 0 : 0.5 }, base)); Object.defineProperty(pe, 'padSynthetic', { value: true }); t.dispatchEvent(pe); } catch (e) { /* PointerEvent の無い古い端末 */ }
    try { t.dispatchEvent(new MouseEvent(M, base)); } catch (e) { /* なし */ }
    return t;
  }
  function cursorDown() { if (CUR.down) return; CUR.down = true; curEl.classList.add('down'); curEl.style.display = 'none'; CUR.target = ptr('down', CUR.x, CUR.y); curEl.style.display = ''; CUR.sx = CUR.x; CUR.sy = CUR.y; }
  function cursorUp() {
    if (!CUR.down) return; CUR.down = false; curEl.classList.remove('down');
    curEl.style.display = 'none'; const t = doc.elementFromPoint(CUR.x, CUR.y); curEl.style.display = '';
    ptr('up', CUR.x, CUR.y, t || CUR.target);
    if (t && CUR.target && Math.hypot(CUR.x - CUR.sx, CUR.y - CUR.sy) < 14) {
      // 押した物と離した物が同じ（か中）なら click
      const c = (CUR.target === t || CUR.target.contains(t)) ? t : (t.contains(CUR.target) ? CUR.target : null);
      if (c) try { c.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: CUR.x, clientY: CUR.y })); } catch (e) { /* なし */ }
    }
    CUR.target = null;
  }
  function cursorMove(dx, dy, dt) {
    if (!dx && !dy) return;
    const sp = 900 * (+I.opts.cursorSpeed || 1) * dt;
    const m = Math.hypot(dx, dy), k = m * m;   // 小さく倒すとゆっくり
    CUR.x = Math.min(innerWidth - 2, Math.max(1, CUR.x + dx / m * k * sp));
    CUR.y = Math.min(innerHeight - 2, Math.max(1, CUR.y + dy / m * k * sp));
    if (!CUR.on) cursorShow(true);
    cursorPaint();
    if (CUR.down) { curEl.style.display = 'none'; ptr('move', CUR.x, CUR.y, CUR.target && CUR.target.isConnected ? CUR.target : null); curEl.style.display = ''; }
  }

  // ── お知らせ ──
  const note = doc.createElement('div'); note.id = 'pad-note'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite');
  let noteT = 0;
  function notice(t, ms) { note.textContent = t; note.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(() => note.classList.remove('on'), ms || 2800); }

  // ── ボタンの表示 ──
  function kbd(b) {
    const T = { LS: '左スティック', RS: '右スティック', DPAD: I.label('DPAD') };
    const m = /^(DPAD)(.*)$/.exec(b);
    if (m && m[2]) return `<span class="pad-kbd">${I.label('DPAD')}${m[2]}</span>`;
    if (T[b]) return `<span class="pad-kbd">${T[b]}</span>`;
    // 決定ボタンを右にしていれば A と B を入れ替えて見せる
    const swap = I.opts.confirm === 'east' && (b === 'A' || b === 'B') ? (b === 'A' ? 'B' : 'A') : b;
    return `<span class="pad-kbd f-${swap}">${esc(I.label(swap))}</span>`;
  }
  function kbdList(s) { return String(s).split('/').map(kbd).join(''); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  // ── 窓（一時停止メニュー・操作方法・コントローラー設定・切断・診断） ──
  const ol = doc.createElement('div'); ol.className = 'pad-ol'; ol.id = 'pad-ol'; ol.setAttribute('role', 'dialog'); ol.setAttribute('aria-modal', 'true');
  const box = doc.createElement('div'); box.className = 'pad-box'; ol.appendChild(box);
  const W = { open: false, kind: '', back: null, under: 'ui' };
  function openWin(kind, html, back) {
    if (!W.open) { W.under = PADUI.ctx; releaseAll(); setMgPaused(true); }
    W.open = true; W.kind = kind; W.back = back || closeWin;
    box.innerHTML = html; ol.classList.add('on'); box.scrollTop = 0;
    gfSet(null);
    // 最初の焦点：操作方法は読む画面なので「閉じる」、ほかは先頭のボタン
    const c = candidates(box); const first = kind === 'help' ? box.querySelector('[data-pad="close"]') : c[0];
    if (first && I.device === 'pad') { gfSet(first); if (kind === 'help') box.scrollTop = 0; }
    PADUI.ctx = 'padmenu';
  }
  function closeWin() {
    if (!W.open) return;
    W.open = false; W.kind = ''; ol.classList.remove('on'); box.innerHTML = ''; gfSet(null);
    if (window.PADDIAG && PADDIAG.unmount) try { PADDIAG.unmount(); } catch (e) { /* なし */ }
    setMgPaused(false);
  }
  ol.addEventListener('click', e => { const a = e.target.closest && e.target.closest('[data-pad]'); if (a) { e.stopPropagation(); act(a.dataset.pad, a); } });
  function mgOn() { const M = mgApi(); return !!(M && !M._ended && doc.body.classList.contains('mg-active')); }
  function setMgPaused(on) { try { const M = mgApi(); if (M && M.setPaused) M.setPaused(!!on && mgOn()); } catch (e) { /* なし */ } }
  function gameScreenOn() { const g = $('#game-screen'); return !!(g && !g.classList.contains('hidden')); }

  function pauseMenu() {
    if (!W.open) W.under = PADUI.ctx;
    const inMg = W.under.startsWith('mg:') || mgOn(), inGame = gameScreenOn() && typeof window.manualSave === 'function';
    const items = [['resume', '▶ 再開する'], ['help', '🎮 操作方法']];
    if (inGame && !inMg) items.push(['save', '💾 セーブする'], ['load', '📂 ロード（スロットを選ぶ）']);
    if (!inMg && typeof window.openStatus === 'function' && inGame) items.push(['status', '📊 ステータス']);
    if (!inMg && typeof window.openSettings === 'function') items.push(['settings', '⚙ 設定（音量・難しさ）']);
    items.push(['padopts', '🕹 コントローラー設定'], ['diag', '🔧 ゲームパッド診断']);
    if (inMg) items.push(['mgquit', '✖ ミニゲームを終了する']);
    if (inGame && !inMg && typeof window.returnToTitle === 'function') items.push(['title', '🏠 セーブしてタイトルへ']);
    openWin('pause', `<h2>一時停止<small>${esc(padName())}</small></h2><div class="pad-btns">${items.map(([k, t]) => `<button type="button" data-pad="${k}">${t}</button>`).join('')}</div>`);
  }
  function padName() { const p = I.pads[I.state.index]; return p ? p.name : (I.state.connected ? 'コントローラー' : 'コントローラー未接続'); }
  function helpWin(ctx) {
    if (!W.open) W.under = PADUI.ctx;
    ctx = ctx || W.under;
    const p = profileOf(ctx) || PROF().ui;
    const tabs = ['ui', 'home', 'song'].concat(Object.keys(PROF()).filter(k => !['ui', 'home', 'song', 'vkbd', 'page'].includes(k)));
    const conf = I.opts.confirm === 'east' ? '右（' + I.label('B') + '）' : '下（' + I.label('A') + '）';
    const rows = (p.help || []).map(([b, t]) => `<tr><td>${kbdList(b)}</td><td>${esc(t)}</td></tr>`).join('');
    const common = `<tr><td>${kbd('START')}</td><td>一時停止メニュー</td></tr><tr><td>${kbd('SELECT')}</td><td>この操作方法</td></tr>`;
    openWin('help', `<h2>操作方法：${esc(p.name || '')}<small>決定ボタン：${esc(conf)}　<button type="button" data-pad="close" style="padding:2px 10px;font-size:12px">閉じる</button></small></h2>
      <table>${rows}${(p.help || []).some(h => /START/.test(h[0])) ? '' : common}</table>
      <div class="pad-sub">ほかの画面の操作</div><div class="pad-tabs">${tabs.map(k => `<button type="button" data-pad="help:${k}" class="${k === keyOfCtx(ctx) ? 'on' : ''}">${esc((PROF()[k] || {}).name || k)}</button>`).join('')}</div>
      <div class="pad-sub">タッチ：画面のボタンを直接タップ。キーボード：矢印・Enter（決定）・Esc（戻る）。コントローラーを外すと自動で一時停止します。</div>`, () => { if (W.kind === 'help' && W.from === 'pause') pauseMenu(); else closeWin(); });
  }
  function optsWin() {
    const o = I.opts, sp = +o.cursorSpeed || 1;
    openWin('opts', `<h2>コントローラー設定<small>この端末に保存</small></h2><div class="pad-btns">
      <button type="button" data-pad="opt:confirm">決定ボタンの位置：${o.confirm === 'east' ? '右（○・Nintendo の A）' : '下（A・×）'}</button>
      <button type="button" data-pad="opt:rumble">振動：${o.rumble ? 'オン' : 'オフ'}${I.canRumble() ? '' : '（この端末・ブラウザでは振動できません）'}</button>
      <button type="button" data-pad="opt:cursor">仮想カーソルの速さ：${sp < 0.8 ? 'ゆっくり' : sp > 1.2 ? '速い' : 'ふつう'}</button>
      <button type="button" data-pad="opt:dz">スティックの遊び：${Math.round((+o.deadzone || 0.22) * 100)}%</button>
      <button type="button" data-pad="diag">🔧 ゲームパッド診断・ボタン割り当て</button>
      <button type="button" data-pad="close">閉じる</button></div>`, () => (W.from === 'pause' ? pauseMenu() : closeWin()));
  }
  function diagWin() {
    openWin('diag', `<h2>ゲームパッド診断<small>割り当ての学習中は B 長押し（1 秒）で閉じる</small></h2><div id="pad-diag-host"></div><div class="pad-btns" style="margin-top:8px"><button type="button" data-pad="close">閉じる</button></div>`, () => act('close'));
    if (window.PADDIAG) PADDIAG.mount($('#pad-diag-host'), { embedded: true });
    else $('#pad-diag-host').innerHTML = '<p>診断画面は <a href="gamepad.html" style="color:#ffd75a">gamepad.html</a> で開けます。</p>';
  }
  function disconnectWin() {
    openWin('disc', `<h2>コントローラーが外れました</h2><p>ゲームを一時停止しています。もう一度つなぐ（Bluetooth なら電源・ペアリングを確かめる）か、タッチ・キーボードで続けてください。</p><div class="pad-btns"><button type="button" data-pad="close">▶ このまま続ける</button><button type="button" data-pad="help">🎮 操作方法</button></div>`);
  }
  function act(a) {
    const from = W.kind;
    if (a === 'resume' || a === 'close') { if (from === 'help' || from === 'opts' || from === 'diag') { if (W.from === 'pause') { W.from = ''; pauseMenu(); return; } } closeWin(); return; }
    if (a === 'help') { W.from = from === 'pause' ? 'pause' : ''; helpWin(); return; }
    if (a.startsWith('help:')) { const k = a.slice(5); const keep = W.from; helpWin(k === 'ui' || k === 'home' || k === 'song' ? k : 'mg:' + k); W.from = keep; return; }
    if (a === 'padopts') { W.from = 'pause'; optsWin(); return; }
    if (a === 'diag') { W.from = from === 'pause' || from === 'opts' ? 'pause' : ''; diagWin(); return; }
    if (a.startsWith('opt:')) {
      const k = a.slice(4), o = I.opts;
      if (k === 'confirm') I.setOpt('confirm', o.confirm === 'east' ? 'south' : 'east');
      if (k === 'rumble') { I.setOpt('rumble', !o.rumble); if (I.opts.rumble) I.rumble(180); }
      if (k === 'cursor') { const s = +o.cursorSpeed || 1; I.setOpt('cursorSpeed', s < 0.8 ? 1 : s > 1.2 ? 0.6 : 1.5); }
      if (k === 'dz') { const d = +o.deadzone || 0.22; I.setOpt('deadzone', d >= 0.3 ? 0.12 : Math.round((d + 0.06) * 100) / 100); }
      const keep = W.from; const sig = a; optsWin(); W.from = keep;
      const b = box.querySelector(`[data-pad="${sig}"]`); if (b && I.device === 'pad') gfSet(b);
      return;
    }
    closeWin();
    if (a === 'save') window.manualSave();
    else if (a === 'load') window.openSlotPicker('load');
    else if (a === 'status') window.openStatus();
    else if (a === 'settings') window.openSettings();
    else if (a === 'mgquit') { try { mgApi().end('quit'); } catch (e) { /* 終わっている */ } }
    else if (a === 'title') { window.returnToTitle(); window.returnToTitle(); }
  }

  // ── 文脈 ──
  function detectCtx() {
    if (window.VKBD && VKBD.isOpen()) return 'vkbd';
    if (W.open) return 'padmenu';
    if (mgOn() && mgApi().def) return 'mg:' + mgApi().def.id;
    const sm = $('#song-mini'); if (sm && sm.classList.contains('active')) return 'song';
    if (doc.body.classList.contains('home-open')) return 'home';
    if (window.PAD_PAGE_PROFILE) return 'page';
    return 'ui';
  }
  function keyOfCtx(c) { return c.startsWith('mg:') ? c.slice(3) : c; }
  function profileOf(c) {
    if (c.startsWith('mg:')) { const id = c.slice(3); const L = mgList(), M = mgApi(); const def = L ? L.find(m => m.id === id) : (M && M.def); return (window.padProfileFor && padProfileFor(id, def)) || PROF().ui; }
    if (c === 'page' && window.PAD_PAGE_PROFILE) return Object.assign({}, PROF().page, window.PAD_PAGE_PROFILE);
    return PROF()[c] || PROF().ui;
  }
  // ミニゲームの見出しの操作ヒント（#mg-help）：コントローラーで遊んでいる間はパッドのボタンで書く
  function mgHelpSync() {
    const h = $('#mg-help'); if (!h) return;
    const want = I.device === 'pad' && PADUI.ctx.startsWith('mg:');
    if (want) {
      const p = profileOf(PADUI.ctx) || {};
      const txt = (p.help || []).slice(0, 5).map(([bt, t]) => bt.split('/').map(x => { const m = /^(DPAD)(.*)$/.exec(x); if (m) return I.label('DPAD') + m[2]; if (x === 'LS') return '左スティック'; if (x === 'RS') return '右スティック'; return I.label(I.opts.confirm === 'east' && (x === 'A' || x === 'B') ? (x === 'A' ? 'B' : 'A') : x); }).join('/') + ':' + t.replace(/（.*?）/g, '')).join('　') + `　${I.label('SELECT')}:操作方法`;
      if (h.dataset.padHelp !== txt) { if (!('padOrig' in h.dataset)) h.dataset.padOrig = h.textContent; h.textContent = txt; h.dataset.padHelp = txt; h.title = txt; }
    } else if ('padOrig' in h.dataset) { if (h.textContent === h.dataset.padHelp) h.textContent = h.dataset.padOrig; delete h.dataset.padOrig; delete h.dataset.padHelp; h.title = ''; }
  }
  let profTok = null;
  function switchCtx(c) {
    if (c === PADUI.ctx && profTok) return;
    releaseAll(); dirState.clear();
    if (c !== 'padmenu' && c !== 'vkbd') { if (profTok) I.popProfile(profTok); profTok = I.pushProfile(Object.assign({ ctx: c }, profileOf(c))); }
    PADUI.ctx = c;
    if (CUR.mode && c !== 'ui' && c !== 'page') { CUR.mode = false; }
    if (!(profileOf(c) || {}).pointer && !CUR.mode) cursorShow(false);
    gfSet(null);
    if (c !== 'padmenu') mgHelpSync();
  }

  // ── 方向（十字キー＋左スティック） ──
  const dirState = new Map();   // dir → {t: 次の繰り返しまで}
  const DIRS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  function dirsNow(useStick) {
    const S = I.state, b = S.buttons, ax = useStick ? S.axes.LX : 0, ay = useStick ? S.axes.LY : 0;
    return { up: !!b.UP || ay < -0.5, down: !!b.DOWN || ay > 0.5, left: !!b.LEFT || ax < -0.5, right: !!b.RIGHT || ax > 0.5 };
  }
  // 物理ボタン → 論理（決定ボタンを右にしていれば A と B を入れ替える）
  function logical(b) { if (I.opts.confirm === 'east') { if (b === 'A') return 'B'; if (b === 'B') return 'A'; } return b; }
  const btnKeys = new Map();    // 論理ボタン → 押したキー（離す時に同じ物を離す）

  function uiDir(dir, repeat) {
    // 既存のキー操作に渡す。受け取られなかったら予備のフォーカス移動
    const c = PADUI.ctx;
    if (c === 'padmenu') { gfMove(dir, box); return; }
    if (CUR.mode) return;
    const used = tapKey(DIRS[dir], repeat);
    if (!used && (c === 'ui' || c === 'home' || c === 'page')) gfMove(dir);
    else if (used && GF.el) gfSet(null);
  }
  function uiConfirm() {
    const c = PADUI.ctx;
    if (c === 'padmenu') { if (!(GF.el && GF.el.isConnected)) { const l = candidates(box); if (l.length) gfSet(l[0]); } gfActivate(); return; }
    if (GF.el && GF.el.isConnected && candidates().includes(GF.el)) { gfActivate(); return; }
    const used = tapKey('Enter');
    if (!used) {
      const list = candidates(), ae = doc.activeElement;
      // 画面が自分でフォーカスを置いたボタン（スロット選択など）なら、それを押す
      if (ae && ae !== doc.body && list.includes(ae)) { gfSet(ae); gfActivate(); }
      else if (list.length === 1) { gfSet(list[0]); gfActivate(); } else if (list.length) gfMove('down');
    }
  }
  function uiCancel() {
    const c = PADUI.ctx;
    if (c === 'padmenu') { (W.back || closeWin)(); return; }
    if (CUR.mode) { CUR.mode = false; cursorShow(false); notice('仮想カーソルを閉じました'); return; }
    const used = tapKey('Escape');
    if (!used) clickClose();
  }
  // メニュー切替（LB／RB）：手前の窓にタブがあればタブ、なければ本編の下のメニュー
  function uiTab(d) {
    const tabs = candidates().filter(el => el.matches('.mg-tab,[role=tab],.pad-tabs button,.hm-tab,nav [data-tab]'));
    if (tabs.length > 1) { let i = tabs.findIndex(t => t.classList.contains('on') || t.classList.contains('active') || t.getAttribute('aria-selected') === 'true'); i = (Math.max(0, i) + d + tabs.length) % tabs.length; tabs[i].click(); return; }
    const nav = [...doc.querySelectorAll('.bottom-nav .nav-btn')].filter(b => candidates().includes(b));
    if (nav.length > 1) { let i = nav.findIndex(b => b.classList.contains('active')); i = (Math.max(0, i) + d + nav.length) % nav.length; nav[i].click(); return; }
    tapKey(d > 0 ? 'PageDown' : 'PageUp');
  }
  function uiStatus() {
    const nav = $('#nav-status');
    if (nav && candidates().includes(nav)) { nav.click(); return; }
    tapKey('y');
  }
  // 早送り（RT を押している間）：会話・オープニングだけ。選択肢が出たら止まる
  let fastT = 0;
  function textScene() {
    const stRoot = $('#st-root.st-on'); if (stRoot) return !stRoot.querySelector('.st-choices button');
    const op = $('.pr-op'); if (op && op.offsetParent !== null && !op.querySelector('.pr-op-final.on')) return true;
    const ss = $('#story-screen'); if (ss && !ss.classList.contains('hidden')) { const go = $('#story-go'); return !(go && go.offsetParent && getComputedStyle(go).opacity > 0.5); }
    return false;
  }
  // 右スティック：手前のスクロールできる所を動かす
  function scrollBy(dx, dy, dt) {
    if (!dx && !dy) return;
    let el = GF.el && GF.el.isConnected ? GF.el : doc.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el && el !== doc.body && el !== doc.documentElement) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) break;
      el = el.parentElement;
    }
    (el && el !== doc.body ? el : (doc.scrollingElement || doc.documentElement)).scrollBy(dx * 900 * dt, dy * 900 * dt);
  }

  // ── 毎フレーム ──
  let lastT = 0, selHeldT = 0, startHeldT = 0;
  function frame(S, now) {
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016; lastT = now;
    doc.body.classList.toggle('input-pad', I.device === 'pad');
    const c = detectCtx(); if (c !== PADUI.ctx || (!profTok && c !== 'padmenu' && c !== 'vkbd')) switchCtx(c);
    if (c === 'vkbd') return;   // 文字入力は input/vkeyboard.js が受け持つ
    if (!S.connected) { if (held.size) releaseAll(); return; }
    const P = S.pressed, R = S.released;
    const prof = c === 'padmenu' ? null : (I.profile() || PROF().ui);
    if (prof && prof.native) {   // ゲームが自分で読む。START と SELECT だけ受ける
      if (P.START) pauseMenu(); else if (P.SELECT) helpWin();
      return;
    }
    // START・SELECT（どこでも）
    if (P.START) { if (W.open && (W.kind === 'pause' || W.kind === 'disc')) closeWin(); else if (!W.open) pauseMenu(); return; }
    if (P.SELECT) { if (W.open && W.kind === 'help') act('close'); else if (!W.open) helpWin(); return; }
    // 診断の窓：B の長押しで閉じる（ボタンを試せるように、短い押しは診断が受ける）
    if (W.open && W.kind === 'diag' && window.PADDIAG && (PADDIAG.wiz || PADDIAG.react)) { if (S.buttons.B || S.buttons.A && I.opts.confirm === 'east') { selHeldT += dt; if (selHeldT > 1) { selHeldT = 0; act('close'); } } else selHeldT = 0; return; }

    const isUi = c === 'ui' || c === 'home' || c === 'padmenu';
    const move = c === 'padmenu' ? 'tap' : prof.move || 'tap';
    // 仮想カーソル
    const pointer = c !== 'padmenu' && (prof.pointer || CUR.mode);
    if (pointer) {
      const rs = S.axes; let mx = rs.RX, my = rs.RY;
      if (CUR.mode) { mx = mx || S.axes.LX; my = my || S.axes.LY; }
      cursorMove(mx, my, dt);
    } else if (isUi) scrollBy(S.axes.RX, S.axes.RY, dt);
    if (c === 'ui' || c === 'page' || c === 'home') {
      if (P.R3 && !prof.pointer) { CUR.mode = !CUR.mode; cursorShow(CUR.mode); notice(CUR.mode ? '仮想カーソル：スティックで動かし ' + I.label(I.actionButton('confirm')) + ' で押す。もう一度 R3 で閉じる' : '仮想カーソルを閉じました'); return; }
      if (CUR.mode) {
        const cb = I.actionButton('confirm'), kb = I.actionButton('cancel');
        if (P[cb] || P.RT) cursorDown(); if (R[cb] || R.RT) cursorUp();
        if (P[kb]) uiCancel();
        return;
      }
    }

    // 方向
    const useStick = move !== 'none' || isUi;
    const D = dirsNow(useStick);
    for (const d of ['up', 'down', 'left', 'right']) {
      const on = D[d], ds = dirState.get(d);
      // プロファイルが十字キーの向きにキーを決めている（例：歌のレーン）なら、そちらが優先
      const bn = d.toUpperCase();
      if (prof && prof.keys && prof.keys[bn] && !isUi) continue;
      if (on && !ds) {
        dirState.set(d, { t: 0.36 });
        if (move === 'arrows' && !isUi) { const used = hold(DIRS[d]); if (!used && c === 'page') gfMove(d); }
        else if (move === 'tap' || isUi) (isUi ? uiDir(d, false) : tapKey(DIRS[d]));
      } else if (on && ds) {
        if (move === 'tap' || isUi) { ds.t -= dt; if (ds.t <= 0) { ds.t = 0.1; isUi ? uiDir(d, true) : tapKey(DIRS[d], true); } }
      } else if (!on && ds) {
        dirState.delete(d);
        if (move === 'arrows' && !isUi) unhold(DIRS[d]);
      }
    }
    // ボタン
    if (c === 'padmenu') {
      if (P[I.actionButton('confirm')]) uiConfirm();
      else if (P[I.actionButton('cancel')]) uiCancel();
      else if (P.LB || P.RB) uiTab(P.RB ? 1 : -1);
      return;
    }
    if (isUi) {
      if (P[I.actionButton('confirm')]) uiConfirm();
      if (P[I.actionButton('cancel')]) uiCancel();
      if (c === 'ui') {
        if (P.Y) uiStatus();
        if (P.LB) uiTab(-1); if (P.RB) uiTab(1);
        if (S.buttons.RT) { fastT -= dt; if (fastT <= 0) { fastT = 0.09; if (textScene()) tapKey('Enter'); } } else fastT = 0;
        return;
      }
    }
    // 外部ページ：決定・戻るは本編と同じ（Enter／Esc を送り、受け取られなければ手前のボタンを押す・閉じる）
    const pageAB = c === 'page';
    if (pageAB) { if (P[I.actionButton('confirm')]) uiConfirm(); if (P[I.actionButton('cancel')]) uiCancel(); }
    // プロファイルのキー（押している間押したまま）
    const keys = prof.keys || {};
    for (const b in P) {
      const lb = logical(b);
      if ((isUi || pageAB) && (lb === 'A' || lb === 'B')) continue;
      if (lb === 'START' || lb === 'SELECT') continue;
      let k = keys[lb]; if (k == null) continue;
      k = Array.isArray(k) ? k : [k];
      btnKeys.set(b, k);
      for (const key of k) { if (key === '@click') { if (!CUR.on) cursorShow(true); cursorDown(); } else hold(key); }
      if (lb === I.actionButton('confirm') && c.startsWith('mg:')) I.rumble(30, 0.2, 0.2);
    }
    for (const b in R) {
      const k = btnKeys.get(b); if (!k) continue; btnKeys.delete(b);
      for (const key of k) { if (key === '@click') cursorUp(); else unhold(key); }
    }
  }

  // ── 接続・切断 ──
  I.on('connect', p => {
    const fam = { xbox: 'Xbox 配置', ps: 'PlayStation 配置', nintendo: 'Nintendo 配置' }[p.family];
    notice(`🎮 ${p.name} をつなぎました（${fam}${p.mapping === 'standard' ? '' : '・非標準：うまく動かなければ診断で割り当て'}）`, 3600);
  });
  I.on('disconnect', (p, left) => {
    notice('🎮 コントローラーが外れました', 3000);
    if (left === 0 && I.device === 'pad') { releaseAll(); W.from = ''; disconnectWin(); I.setDevice('kbm'); }
  });
  I.on('device', d => {
    doc.body.classList.toggle('input-pad', d === 'pad'); doc.body.classList.toggle('input-touch', d === 'touch'); doc.body.classList.toggle('input-kbm', d === 'kbm');
    mgHelpSync();
    if (d !== 'pad') { gfSet(null); if (!CUR.down) { CUR.mode = false; cursorShow(false); } }
    else try { if (window.AU && AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {}); } catch (e) { /* 音の準備ができない */ }
  });
  // 本物の操作をしたら、押したままの合成キーを離す
  doc.addEventListener('pointerdown', e => { if (e.isTrusted && held.size) releaseAll(); }, true);
  // 文字欄をコントローラーで選んだらゲーム内キーボードを出す
  doc.addEventListener('focusin', e => {
    const t = e.target;
    if (I.device === 'pad' && window.VKBD && t && ((t.tagName === 'INPUT' && /^(text|search|)$/.test(t.type)) || t.tagName === 'TEXTAREA') && !VKBD.isOpen() && !(Date.now() - (VKBD.closedAt || 0) < 600)) setTimeout(() => { if (doc.activeElement === t && !VKBD.isOpen()) VKBD.open(t); }, 0);
  });

  function boot() {
    doc.body.appendChild(curEl); doc.body.appendChild(note); doc.body.appendChild(ol);
    // 設定画面に「コントローラー・操作方法」を足す（本編の index.html だけ）
    const set = $('#settings-sc .endlist-box');
    if (set && !$('#set-pad')) {
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'ev-btn'; b.id = 'set-pad'; b.textContent = '🎮 コントローラー・操作方法';
      b.addEventListener('click', () => { if (typeof closeSettings === 'function') closeSettings(); W.from = ''; helpWinWithOpts(); });
      const tut = [...set.querySelectorAll('.ev-btn')].find(x => /遊び方/.test(x.textContent));
      if (tut) tut.after(b); else set.appendChild(b);
    }
    I.on('frame', frame);
  }
  function helpWinWithOpts() { W.under = PADUI.ctx === 'padmenu' ? W.under : PADUI.ctx; W.from = ''; pauseMenuLite(); }
  // 設定画面から開いた時：一時停止ではなく、操作方法と設定の入口だけ
  function pauseMenuLite() {
    openWin('lite', `<h2>コントローラー<small>${esc(padName())}</small></h2><div class="pad-btns">
      <button type="button" data-pad="help">🎮 操作方法</button><button type="button" data-pad="padopts">🕹 コントローラー設定</button><button type="button" data-pad="diag">🔧 ゲームパッド診断</button><button type="button" data-pad="close">閉じる</button></div>
      <div class="pad-sub">対応：Xbox・PlayStation・Nintendo 配置のゲームパッド（GameSir Nova Lite 2 で確認する設計）。Windows は USB・2.4GHz・Bluetooth、Android・iPhone・iPad は Bluetooth。</div>`);
  }

  const PADUI = window.PADUI = {
    ctx: 'ui', lastKey: null,
    sendKey, tapKey, hold, unhold, releaseAll, candidates, gfMove, gfSet, gfActivate, clickClose,
    cursor: CUR, cursorMove, cursorDown, cursorUp, cursorShow,
    notice, pauseMenu, helpWin, optsWin, diagWin, closeWin, win: W, profileOf, detectCtx,
    openController: helpWinWithOpts,
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
