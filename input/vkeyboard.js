// ══════════════════════════════════════════════════════════
// ゲーム内キーボード（window.VKBD）：コントローラーで文字を入れる（家・庭の名前付けなど）
//  ・文字欄をコントローラーで選ぶと出る（input/pad-ui.js）。タッチ・マウスでも押せる。
//  ・十字キー／左スティック＝文字を選ぶ　A＝入れる　B＝1 文字消す　X＝ひらがな→カタカナ→英数
//    Y＝゛゜小（直前の字を濁点・半濁点・小さい字に）　LB／RB＝カーソル左右　START＝決定　SELECT＝やめる
//  ・決定すると文字欄に値を入れ、input・change を起こしてから Enter を送る（決定ボタンのある画面はそれで閉じる）
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const HIRA = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'や　ゆ　よ', 'らりるれろ', 'わをんー〜'];
  const SMALL = 'ぁぃぅぇぉゃゅょっゎ';
  const ALNUM = ['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXY', 'Z.,!?', 'abcde', 'fghij', 'klmno', 'pqrst', 'uvwxy', 'z-_/:', '01234', '56789'];
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  // 濁点・半濁点・小さい字の順送り（か→が→か、は→ば→ぱ→は、あ→ぁ→あ、つ→っ→づ→つ）
  const CYCLE = {};
  const addCycle = list => list.forEach(seq => { for (let i = 0; i < seq.length; i++) CYCLE[seq[i]] = seq[(i + 1) % seq.length]; });
  addCycle(['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'てで', 'とど', 'はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ',
    'あぁ', 'いぃ', 'うぅゔ', 'えぇ', 'おぉ', 'やゃ', 'ゆゅ', 'よょ', 'わゎ', 'つっづ']);
  for (const k of Object.keys(CYCLE)) { const K = toKata(k), V = toKata(CYCLE[k]); if (K !== k) CYCLE[K] = V; }
  for (let c = 65; c <= 90; c++) { const U = String.fromCharCode(c), L = U.toLowerCase(); CYCLE[U] = L; CYCLE[L] = U; }

  const MODES = ['ひらがな', 'カタカナ', '英数'];
  function grid(mode) {
    let cols;
    if (mode === 2) cols = ALNUM;
    else { cols = HIRA.concat([SMALL.slice(0, 5), SMALL.slice(5) + '・', '、。！？…', '「」（）♪']); if (mode === 1) cols = cols.map(toKata); }
    // 列（行）を縦に並べ、横に行（段）… 画面では「列＝あかさたな…」を左右に並べる
    const rows = [];
    for (let r = 0; r < 5; r++) rows.push(cols.map(c => c[r] || '　'));
    rows.push(['゛゜小', '空白', '←', '→', '消す', '切替', 'やめる', '決定']);
    return rows;
  }

  const CSS = `
#vkbd{position:fixed;left:0;right:0;bottom:0;z-index:100002;display:none;padding:8px calc(8px + env(safe-area-inset-right,0px)) calc(8px + env(safe-area-inset-bottom,0px)) calc(8px + env(safe-area-inset-left,0px));background:rgba(6,5,20,.97);border-top:2px solid #e6e0ff;color:#fff;font:15px/1.3 sans-serif;box-shadow:0 -8px 30px rgba(0,0,0,.6);}
#vkbd.on{display:block;}
#vkbd .vk-top{display:flex;gap:8px;align-items:center;margin:0 auto 6px;max-width:900px;}
#vkbd .vk-label{color:#a99cc8;font-size:12px;flex:none;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#vkbd .vk-val{flex:1;min-height:30px;padding:4px 8px;border:1px solid #cfc8f0;border-radius:4px;background:#14113a;font-size:17px;white-space:pre;overflow:hidden;}
#vkbd .vk-val i{display:inline-block;width:2px;height:1.1em;background:#ffd75a;vertical-align:-2px;animation:vkB 1s steps(2) infinite;}
@keyframes vkB{50%{opacity:0;}}
#vkbd .vk-mode{flex:none;color:#ffd75a;font-size:12px;}
#vkbd .vk-grid{display:grid;gap:3px;max-width:900px;margin:0 auto;}
#vkbd button{font:inherit;color:#fff;background:#221d55;border:1px solid rgba(230,224,255,.35);border-radius:4px;padding:5px 0;min-height:32px;cursor:pointer;}
#vkbd button.sel{background:#ffd75a;color:#120c34;border-color:#fff;}
#vkbd button.fn{font-size:12px;background:#2c2770;}
#vkbd .vk-hint{max-width:900px;margin:5px auto 0;color:#a99cc8;font-size:11px;text-align:center;}
@media (max-height:420px){#vkbd{font-size:13px;}#vkbd button{min-height:26px;padding:2px 0;}}
`;
  const V = {
    el: null, target: null, mode: 0, r: 0, c: 0, val: [], caret: 0, max: 64, rep: {}, onClose: null,
    isOpen() { return !!(this.el && this.el.classList.contains('on')); },
    build() {
      if (this.el) return;
      const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
      const el = document.createElement('div'); el.id = 'vkbd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '文字入力');
      el.innerHTML = '<div class="vk-top"><span class="vk-label"></span><div class="vk-val"></div><span class="vk-mode"></span></div><div class="vk-grid"></div><div class="vk-hint"></div>';
      el.addEventListener('click', e => { const b = e.target.closest('button[data-r]'); if (!b) return; e.stopPropagation(); this.r = +b.dataset.r; this.c = +b.dataset.c; this.press(); });
      el.addEventListener('pointerdown', e => e.stopPropagation());
      document.body.appendChild(el); this.el = el;
      if (root.INPUT) INPUT.on('frame', (S, now) => this.frame(S, now));
    },
    open(input, opts) {
      this.build();
      this.target = input || null; opts = opts || {};
      const v = input ? String(input.value || '') : String(opts.value || '');
      this.val = Array.from(v); this.caret = this.val.length;
      this.max = input && input.maxLength > 0 ? input.maxLength : (opts.max || 64);
      this.onClose = opts.onClose || null;
      let label = opts.label || '';
      if (!label && input) { const lb = input.id && document.querySelector(`label[for="${input.id}"]`); label = (lb && lb.textContent) || input.getAttribute('aria-label') || input.placeholder || ''; }
      this.el.querySelector('.vk-label').textContent = label;
      this.r = 0; this.c = 0; this.mode = /^[\x20-\x7e]*$/.test(v) && v ? 2 : 0;
      this.el.classList.add('on'); this.skip = true;   // 開いた押しで文字が入らないように
      try { if (input) input.blur(); } catch (e) { /* なし */ }
      this.render();
    },
    close(ok) {
      if (!this.isOpen()) return;
      this.el.classList.remove('on');
      const t = this.target, s = this.val.join('');
      this.target = null; this.closedAt = Date.now();
      if (t && ok) {
        t.value = s; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
        // Enter を送る。受け取られなかったら（親が止めた等）、同じ窓の「決定」ボタンを押す
        let used = false;
        try { const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }); t.dispatchEvent(ev); used = ev.defaultPrevented; } catch (e) { /* なし */ }
        if (!used && t.isConnected) {
          const box = t.closest('[role=dialog],form,.hm-dlg-box') || t.parentElement;
          const okb = box && [...box.querySelectorAll('button')].find(b => /決定|OK|ＯＫ|はい|保存/.test(b.textContent || ''));
          if (okb) okb.click();
        }
      }
      if (this.onClose) try { this.onClose(ok ? s : null); } catch (e) { /* なし */ }
    },
    rows() { return grid(this.mode); },
    render() {
      const rows = this.rows(), g = this.el.querySelector('.vk-grid');
      const ncol = rows[0].length;
      g.style.gridTemplateColumns = `repeat(${ncol * 2},1fr)`;
      let h = '';
      rows.forEach((row, r) => {
        const span = r === rows.length - 1 ? Math.floor(ncol * 2 / row.length) : 2;
        row.forEach((ch, c) => {
          const fn = r === rows.length - 1;
          const extra = fn && c === row.length - 1 ? ncol * 2 - span * row.length : 0;
          h += `<button type="button" data-r="${r}" data-c="${c}" class="${fn ? 'fn' : ''}${r === this.r && c === this.c ? ' sel' : ''}" style="grid-column:span ${span + extra}">${ch === '　' ? '' : ch}</button>`;
        });
      });
      g.innerHTML = h;
      const v = this.val.slice(); v.splice(this.caret, 0, '\u0000');
      this.el.querySelector('.vk-val').innerHTML = v.map(ch => ch === '\u0000' ? '<i></i>' : ch.replace(/[&<>]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[x])).join('');
      this.el.querySelector('.vk-mode').textContent = `${MODES[this.mode]}　${this.val.length}/${this.max}`;
      const L = root.INPUT ? (b => INPUT.label(b)) : (b => b);
      const sw = root.INPUT && INPUT.opts.confirm === 'east';
      this.el.querySelector('.vk-hint').textContent = `${L(sw ? 'B' : 'A')}：入れる　${L(sw ? 'A' : 'B')}：消す　${L('X')}：文字の種類　${L('Y')}：゛゜小　${L('LB')}/${L('RB')}：カーソル　${L('START')}：決定　${L('SELECT')}：やめる`;
    },
    insert(ch) { if (!ch || ch === '　') return; if (this.val.length >= this.max) return; this.val.splice(this.caret, 0, ch); this.caret++; },
    back() { if (this.caret > 0) { this.val.splice(this.caret - 1, 1); this.caret--; } },
    cycle() { const i = this.caret - 1; if (i < 0) return; const n = CYCLE[this.val[i]]; if (n) this.val[i] = n; },
    press() {
      const rows = this.rows(), ch = (rows[this.r] || [])[this.c];
      if (this.r === rows.length - 1) {
        if (ch === '゛゜小') this.cycle(); else if (ch === '空白') this.insert(' ');
        else if (ch === '←') this.caret = Math.max(0, this.caret - 1); else if (ch === '→') this.caret = Math.min(this.val.length, this.caret + 1);
        else if (ch === '消す') this.back(); else if (ch === '切替') { this.mode = (this.mode + 1) % 3; this.clamp(); }
        else if (ch === 'やめる') { this.close(false); return; } else if (ch === '決定') { this.close(true); return; }
      } else this.insert(ch);
      this.render();
    },
    clamp() { const rows = this.rows(); this.r = Math.min(this.r, rows.length - 1); this.c = Math.min(this.c, rows[this.r].length - 1); },
    move(dir) {
      const rows = this.rows(), last = rows.length - 1;
      if (dir === 'up' || dir === 'down') {
        const fromLast = this.r === last, frac = (this.c + 0.5) / rows[this.r].length;
        this.r = (this.r + (dir === 'down' ? 1 : -1) + rows.length) % rows.length;
        if (fromLast || this.r === last) this.c = Math.min(rows[this.r].length - 1, Math.floor(frac * rows[this.r].length));
      } else { const n = rows[this.r].length; this.c = (this.c + (dir === 'right' ? 1 : -1) + n) % n; }
      this.render();
    },
    frame(S, now) {
      if (!this.isOpen() || !S.connected) return;
      const P = S.pressed, b = S.buttons, ax = S.axes.LX, ay = S.axes.LY;
      const sw = INPUT.opts.confirm === 'east', ok = sw ? 'B' : 'A', ng = sw ? 'A' : 'B';
      const D = { up: b.UP || ay < -0.5, down: b.DOWN || ay > 0.5, left: b.LEFT || ax < -0.5, right: b.RIGHT || ax > 0.5 };
      if (this.skip) { this.skip = false; for (const d in D) if (D[d]) this.rep[d] = now + 360; return; }
      for (const d in D) {
        const r = this.rep[d];
        if (D[d] && r == null) { this.rep[d] = now + 360; this.move(d); }
        else if (D[d] && now >= r) { this.rep[d] = now + 90; this.move(d); }
        else if (!D[d]) delete this.rep[d];
      }
      if (P[ok]) this.press();
      else if (P[ng]) { this.back(); this.render(); }
      else if (P.X) { this.mode = (this.mode + 1) % 3; this.clamp(); this.render(); }
      else if (P.Y) { this.cycle(); this.render(); }
      else if (P.LB) { this.caret = Math.max(0, this.caret - 1); this.render(); }
      else if (P.RB) { this.caret = Math.min(this.val.length, this.caret + 1); this.render(); }
      else if (P.START) this.close(true);
      else if (P.SELECT) this.close(false);
    },
  };
  root.VKBD = V;
})(typeof window !== 'undefined' ? window : globalThis);
