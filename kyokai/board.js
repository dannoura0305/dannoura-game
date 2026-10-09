/* ══════════════════════════════════════════════════════════════════════
   境界事象  観測ボード（推理）・違和感探し・調査手帳・証拠一覧・B-30記録（kyokai/board.js・担当A）
   契約：docs/kyokai/README.md「証拠・手帳・推理」。追加は engine.js 冒頭を参照。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY;
  if (!KY || !KY._G) { console.error('[KY] engine.js が先に必要です'); return; }
  const G = KY._G, HAS_DOM = KY.HAS_DOM, clamp = KY._clamp;
  const S = () => KY.state;
  const title = id => KY.ev(id).title;

  /* ───────── 推理の判定（純粋な関数） ───────── */
  KY.linkedSet = function (links) {
    const adj = {};
    (links || []).forEach(l => { if (!Array.isArray(l) || l.length < 2) return; (adj[l[0]] = adj[l[0]] || []).push(l[1]); (adj[l[1]] = adj[l[1]] || []).push(l[0]); });
    const seen = { H: 1 }, q = ['H'], out = [];
    while (q.length) { const n = q.shift(); (adj[n] || []).forEach(m => { if (!seen[m]) { seen[m] = 1; q.push(m); out.push(m); } }); }
    return out;
  };
  KY.deduceMax = def => { const ans = (def.options || []).find(o => o.id === def.answer); return Math.max(def.link || 2, ans && ans.need ? ans.need.length : 0); };
  KY.evalDeduce = function (def, pick, linked) {
    const L = (linked || []).filter((v, i, a) => a.indexOf(v) === i);
    const opt = (def.options || []).find(o => o.id === pick);
    const need = def.link || 2;
    if (!opt) return { ok: false, kind: 'nopick', msg: 'まず、どの仮説で考えるか決めてくれ。' };
    if (L.length < Math.min(need, KY.deduceMax(def))) return { ok: false, kind: 'count', msg: `根拠が足りない。証拠を${need}枚、仮説と線で結んでくれ。` };
    const hint = def.hint || {};
    if (pick !== def.answer) {
      const ref = (opt.refute || []).find(id => L.indexOf(id) >= 0) || (opt.refute || []).find(id => KY.got(id));
      return { ok: false, kind: 'wrong', ev: ref || null, msg: hint[pick] || (ref ? `その仮説だと「${title(ref)}」が説明できない。` : 'その仮説だと、説明のつかない証拠が残る。もう一度並べてみよう。') };
    }
    const refL = (opt.refute || []).find(id => L.indexOf(id) >= 0);
    if (refL) return { ok: false, kind: 'refuted', ev: refL, msg: `「${title(refL)}」は、むしろこの仮説と矛盾しないか？` };
    const nd = opt.need || [];
    const missing = nd.filter(id => L.indexOf(id) < 0);
    if (missing.length) {
      const extra = L.find(id => nd.indexOf(id) < 0);
      return { ok: false, kind: 'missing', ev: extra || null, missing, msg: extra ? `結論はいい線だ。でも「${title(extra)}」は、この仮説とはつながらない気がする。` : (hint[pick] || '結論はいい線だ。でも、根拠がまだ足りない。') };
    }
    return { ok: true, kind: 'ok', msg: '' };
  };
  KY.deduce = async function (def) {
    def = def || {};
    await KY._flush();
    if (!def.id || !Array.isArray(def.options) || !def.options.length) { console.warn('[KY] deduce: 定義が不正', def); return true; }
    const s = S();
    const st = s.board[def.id] = Object.assign({ pick: null, links: [], tries: 0, solved: false }, s.board[def.id] || {});
    st.q = def.q || ''; st.opts = def.options.map(o => ({ id: o.id, text: o.text })); st.answer = def.answer;
    if (st.solved) return true;
    const who = def.who || 'y';
    const ans = def.options.find(o => o.id === def.answer) || { need: [] };
    for (;;) {
      const sub = await KY.UI.deduce(def, st);
      st.pick = sub.pick; st.links = (sub.links || []).map(l => [l[0], l[1]]);
      st.tries++;
      const linked = KY.linkedSet(st.links);
      const r = KY.evalDeduce(def, st.pick, linked);
      if (r.ok) {
        st.solved = true; st.hl = null;
        KY.se('gain');
        await KY.UI.deduceDone(def, st);
        KY.note('hypo', 'deduce_' + def.id, { title: def.q || '仮説', text: (def.options.find(o => o.id === def.answer) || {}).text || '', solved: true });
        KY.autosave();
        return true;
      }
      const lines = [r.msg];
      const notOwned = (ans.need || []).filter(id => !KY.got(id));
      if (notOwned.length && st.tries >= 2) { lines.push('……そういえば、これも関係あるんじゃないか。'); notOwned.forEach(id => KY.gain(id)); }
      else if (st.tries >= 3 && r.kind !== 'count' && r.kind !== 'nopick') {
        const n = (ans.need || []).find(id => linked.indexOf(id) < 0) || (ans.need || [])[0];
        if (n) lines.push(`手がかりをやろう。「${title(n)}」を、もう一度見てみろ。`);
      }
      if (st.tries >= 5) st.hl = (ans.need || []).slice();
      KY.se('error');
      await KY.UI.deduceFeedback(def, who, lines, r);
    }
  };

  /* ───────── 違和感探し（判定） ───────── */
  KY.spotHit = function (def, x, y, found) {
    const sp = def.spots || [];
    for (let i = 0; i < sp.length; i++) {
      if (found && found.indexOf(i) >= 0) continue;
      const p = sp[i], r = Math.max(p.r || 0.06, 0.05);
      const dx = x - p.x, dy = (y - p.y) * 9 / 16;
      if (dx * dx + dy * dy <= r * r) return i;
    }
    return -1;
  };
  KY.spot = async function (def) {
    def = def || {};
    await KY._flush();
    const s = S();
    const key = 'spot_' + (def.id || 'x');
    const st = s.board[key] = Object.assign({ found: [] }, s.board[key] || {});
    const need = clamp(def.need || (def.spots || []).length, 0, (def.spots || []).length);
    if (st.found.length >= need && need > 0) return st.found.length;
    await KY.UI.spot(def, st, need);
    // 世界差分を手帳へ
    if (def.aw && def.bw && def.aw !== def.bw) st.found.forEach(i => { const p = def.spots[i]; if (p) KY.note('diff', `${def.id}_${i}`, { title: p.label || '差分', text: `観測層${def.aw}と観測層${def.bw}の違い：${p.label || ''}`, solved: true }); });
    if (def.ev) KY.gain(def.ev);
    KY.autosave();
    return st.found.length;
  };

  /* ───────── 手帳の文字のずれ（安定度10未満） ───────── */
  const NOTE_DRIFT = [['観測センター', '対策局'], ['新人', '主任'], ['先輩', '同期'], ['昨日', '明日'], ['月代', '月白'], ['分室', '支局'], ['いない', 'いる']];
  KY.noteText = function (t, seed) {
    t = String(t || '');
    if (S().stability >= 10) return t;
    let k = 0;
    NOTE_DRIFT.forEach(([a, b], i) => { if ((seed + i) % 2 === 0 && t.indexOf(a) >= 0 && k < 2) { t = t.split(a).join(b); k++; } });
    return t;
  };

  /* ───────── ヘッドレス（テスト用） ───────── */
  const AUTO = KY._auto;
  AUTO.deduce = AUTO.deduce || [];
  AUTO.spot = AUTO.spot || [];
  AUTO.feedback = AUTO.feedback || [];
  const HEADLESS = {
    deduce(def) {
      if (AUTO.deduce.length) return Promise.resolve(AUTO.deduce.shift());
      const ans = def.options.find(o => o.id === def.answer) || { need: [] };
      const links = (ans.need || []).map(id => ['H', id]);
      const extra = S().evidence.filter(id => (ans.need || []).indexOf(id) < 0 && (ans.refute || []).indexOf(id) < 0);
      while (links.length < (def.link || 2) && extra.length) links.push(['H', extra.shift()]);
      return Promise.resolve({ pick: def.answer, links });
    },
    deduceFeedback(def, who, lines, r) { AUTO.feedback.push({ lines, kind: r.kind }); return Promise.resolve(); },
    deduceDone() { return Promise.resolve(); },
    spot(def, st, need) {
      const taps = AUTO.spot.length ? AUTO.spot.shift() : (def.spots || []).map(p => [p.x, p.y]);
      taps.forEach(([x, y]) => { const i = KY.spotHit(def, x, y, st.found); if (i >= 0) st.found.push(i); });
      return Promise.resolve();
    },
  };
  if (!HAS_DOM) { Object.assign(KY.UI, HEADLESS); return; }

  const $ = KY._el, button = KY._button;

  /* ───────── 証拠の絵（写真は撮った場面、ほかは場面か種類のしるし） ───────── */
  const TH_CACHE = new Map();
  const TYPE_GLYPH = { photo: '▣', testimony: '❝', audio: '♪', map: '⌖', video: '▶', log: '≡', item: '◆', person: '◉', article: '¶' };
  KY.thumb = function (cv, id) {
    const ev = KY.ev(id), ph = S().photos[id];
    const W = cv.width, H = cv.height, c = cv.getContext('2d');
    const key = id + '|' + W + 'x' + H + '|' + (ph ? 'p' : '') + (root.KY_ART ? 'a' + (root.KY_ART.gb ? root.KY_ART.gb.cur : '') : '');
    const hit = TH_CACHE.get(key);
    if (hit) { c.clearRect(0, 0, W, H); c.drawImage(hit, 0, 0); return; }
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = KY._gbw(off.getContext('2d'));
    const scene = ph ? ph.scene : ev.art, world = ph ? ph.world : (ev.world || 'A');
    if (scene) {
      if (ph && ph.rect) {
        const r = ph.rect, sc = Math.min(4, 1 / Math.max(0.2, Math.min(1, r.w + 0.12)));
        const big = document.createElement('canvas'); big.width = Math.round(W * sc); big.height = Math.round(W * sc * 9 / 16);
        KY.drawScene(big.getContext('2d'), scene, world, 0, { w: big.width, h: big.height, thumb: true });
        const cx = clamp(r.x + r.w / 2, 0, 1), cy = clamp(r.y + r.h / 2, 0, 1);
        const sw = big.width / sc, sh = sw * H / W;
        o.drawImage(big, clamp(cx * big.width - sw / 2, 0, big.width - sw), clamp(cy * big.height - sh / 2, 0, big.height - sh), sw, sh, 0, 0, W, H);
      } else {
        const big = document.createElement('canvas'); big.width = W; big.height = Math.round(W * 9 / 16);
        KY.drawScene(big.getContext('2d'), scene, world, 0, { w: big.width, h: big.height, thumb: true });
        o.drawImage(big, 0, (big.height - H) / 2, W, H, 0, 0, W, H);
      }
      if (ev.type !== 'photo' && !ph) { o.fillStyle = 'rgba(6,12,28,.45)'; o.fillRect(0, 0, W, H); }
    } else {
      const g = o.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0e1d3a'); g.addColorStop(1, '#0a1428'); o.fillStyle = g; o.fillRect(0, 0, W, H);
      o.strokeStyle = 'rgba(95,214,230,.25)'; for (let y = 6; y < H; y += 7) { o.beginPath(); o.moveTo(6, y); o.lineTo(W - 6 - (y * 13 % 30), y); o.stroke(); }
    }
    let drew = false;
    if (!scene || ev.type !== 'photo') {
      const A = root.KY_ART;
      let has = !!(A && typeof A.icon === 'function');
      if (has && typeof A.ids === 'function') { try { has = (A.ids('icon') || []).indexOf(ev.type) >= 0; } catch (e) {} }
      if (has) {
        try { const r = A.icon(ev.type); if (r && r.tagName === 'CANVAS') { const s = Math.min(W, H) * 0.55; o.drawImage(r, (W - s) / 2, (H - s) / 2, s, s); drew = true; } } catch (e) {}
      }
      if (!drew) { o.fillStyle = 'rgba(217,180,90,.9)'; o.font = `${Math.round(H * 0.42)}px sans-serif`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillText(TYPE_GLYPH[ev.type] || '・', W / 2, H / 2); }
    }
    TH_CACHE.set(key, off);
    if (TH_CACHE.size > 160) TH_CACHE.delete(TH_CACHE.keys().next().value);
    c.clearRect(0, 0, W, H); c.drawImage(off, 0, 0);
  };
  function evCard(id, cls) {
    const ev = KY.ev(id);
    const card = $('div', 'evc ' + (cls || ''));
    card.dataset.node = id;
    const th = $('canvas', 'evc-th'); th.width = 192; th.height = 108;
    try { KY.thumb(th, id); } catch (e) {}
    const tp = $('span', 'evc-type', KY.EV_TYPE[ev.type] || '記録'); tp.dataset.t = ev.type;
    if (ev.world && ev.world !== 'A') tp.textContent += '・' + ev.world;
    card.append(th, tp, $('span', 'evc-t', ev.title));
    return card;
  }

  /* ───────── 観測ボード ───────── */
  let BD = null;
  function boardOpen(def, st, ro) {
    const h = KY._openOv('ov-board', { label: '観測ボード' });
    const B = BD = { h, def, st, ro, sel: null, pick: st.pick, links: (st.links || []).map(l => l.slice()), showAll: !!ro, res: null };
    const box = $('div', 'bd');
    const head = $('div', 'bd-head');
    head.append($('span', 'bd-tag', 'OBSERVATION BOARD ▍観測ボード'));
    const hr = $('span', 'bd-hr');
    hr.append(button('手帳', () => KY.openMenu('notebook'), 'mini'));
    if (ro) hr.append(button('閉じる', () => close(), 'mini'));
    head.appendChild(hr);
    const q = $('div', 'bd-q', def.q || '');
    const hy = $('div', 'bd-hypos'); hy.setAttribute('role', 'radiogroup'); hy.setAttribute('aria-label', '仮説');
    const area = $('div', 'bd-area');
    const content = $('div', 'bd-content');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'bd-svg');
    const node = $('div', 'bd-node'); node.dataset.node = 'H';
    const grid = $('div', 'bd-grid');
    content.append(svg, node, grid); area.appendChild(content);
    const info = $('div', 'bd-info');
    const foot = $('div', 'bd-foot');
    const fb = $('div', 'bd-fb'); fb.hidden = true;
    box.append(head, q, hy, area, info, foot, fb);
    h.el.appendChild(box);
    Object.assign(B, { box, hy, area, content, svg, node, grid, info, foot, fb });
    h.esc = () => { if (ro) close(); else KY.openMenu(); };
    const close = () => { h.close(); if (BD === B) BD = null; };
    B.close = close;
    renderHypos(); renderCards(); renderNode(); renderFoot(); setInfo(null);
    requestAnimationFrame(() => drawLines());
    B.onResize = () => drawLines();
    KY._resize.push(B.onResize);
    if (!ro) bindDrag(B);
    KY._focusFirst(hy);
    return B;
  }
  function relevant(def) {
    const s = S(); const ids = s.evidence.slice();
    const ch = def.ch != null ? def.ch : (() => { const m = /^ch(\d+)/.exec(s.chapter || ''); return m ? +m[1] : null; })();
    const keep = {};
    (def.options || []).forEach(o => (o.need || []).concat(o.refute || []).forEach(id => { keep[id] = 1; }));
    return ids.filter(id => { const e = KY.ev(id); return keep[id] || ch == null || e.ch == null || e.ch >= ch - 1; });
  }
  function renderHypos() {
    const B = BD; B.hy.innerHTML = '';
    B.def.options.forEach((o, i) => {
      const b = button('', () => { if (B.ro) return; B.pick = o.id; renderHypos(); renderNode(); renderFoot(); }, 'hypo');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', B.pick === o.id ? 'true' : 'false');
      b.append($('span', 'hy-k', '仮説' + String.fromCharCode(65 + i)), $('span', 'hy-t', o.text));
      if (B.ro) b.disabled = B.pick !== o.id;
      B.hy.appendChild(b);
    });
  }
  function renderNode() {
    const B = BD, o = B.def.options.find(x => x.id === B.pick);
    B.node.innerHTML = '';
    B.node.append($('span', 'nd-k', '仮説'), $('span', 'nd-t', o ? o.text : '（上から仮説を一つ選ぶ）'));
    B.node.classList.toggle('empty', !o);
    B.node.classList.toggle('sel', B.sel === 'H');
    B.node.tabIndex = 0; B.node.setAttribute('role', 'button'); B.node.setAttribute('aria-label', '仮説のカード');
    if (B.solved || (B.ro && B.st.solved)) B.node.appendChild($('span', 'nd-stamp', '記録済'));
  }
  function renderCards() {
    const B = BD; B.grid.innerHTML = '';
    let ids = B.showAll ? S().evidence.slice() : relevant(B.def);
    if (B.ro) { const L = KY.linkedSet(B.links); ids = S().evidence.filter(id => L.indexOf(id) >= 0 || B.showAll); }
    const L = KY.linkedSet(B.links);
    ids.forEach(id => {
      const c = evCard(id, (B.sel === id ? 'sel ' : '') + (L.indexOf(id) >= 0 ? 'linked ' : '') + (B.st.hl && B.st.hl.indexOf(id) >= 0 ? 'hl' : ''));
      c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', KY.ev(id).title);
      if (!B.ro) { const hd = $('span', 'evc-hd'); hd.setAttribute('aria-hidden', 'true'); c.appendChild(hd); }
      B.grid.appendChild(c);
    });
    if (!ids.length) B.grid.appendChild($('div', 'empty', 'まだ証拠がない。'));
  }
  function renderFoot() {
    const B = BD; B.foot.innerHTML = '';
    const L = KY.linkedSet(B.links), max = KY.deduceMax(B.def), need = B.def.link || 2;
    const stt = $('span', 'bd-count', B.ro ? (B.st.solved ? '解決済みの仮説' : '検討中の仮説') : `仮説と結んだ証拠 ${L.length}／${need}`);
    stt.dataset.ok = L.length >= need ? '1' : '';
    B.foot.appendChild(stt);
    const row = $('span', 'bd-btns');
    row.append(button(B.showAll ? '関係しそうな証拠だけ' : 'すべての証拠', () => { B.showAll = !B.showAll; renderCards(); renderFoot(); drawLines(); }, 'mini'));
    if (!B.ro) {
      const clr = button('線を消す', () => { B.links = []; B.sel = null; renderCards(); renderNode(); renderFoot(); drawLines(); setInfo(null); }, 'mini');
      clr.disabled = !B.links.length;
      const sub = button('仮説を提出', () => submit(), 'primary bd-submit');
      sub.disabled = !B.pick || !L.length;
      row.append(clr, sub);
    }
    B.foot.appendChild(row);
    if (max > need) B.foot.appendChild($('span', 'bd-note', `（最大 ${max} 枚まで）`));
  }
  function setInfo(id) {
    const B = BD; B.info.innerHTML = '';
    if (!id) { B.info.appendChild($('div', 'bd-help', B.ro ? '観測ボードの記録（読み取りのみ）' : '仮説を選び、カードをタップ→別のカード（または仮説）をタップで線を結ぶ。もう一度結ぶと外れる。PC はドラッグでも結べる。')); return; }
    if (id === 'H') { B.info.appendChild($('div', 'bd-help', '仮説のカード。証拠を選んでからここをタップすると、仮説と結ぶ。')); return; }
    const ev = KY.ev(id);
    const t = $('div', 'bd-it'); t.append($('b', '', ev.title), $('span', 'bd-itt', `${KY.EV_TYPE[ev.type] || ''}${ev.world ? '・観測層' + ev.world : ''}`));
    B.info.append(t, $('div', 'bd-id', ev.desc || ''));
  }
  function toggleLink(a, b) {
    const B = BD;
    if (a === b) return;
    const i = B.links.findIndex(l => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a));
    if (i >= 0) { B.links.splice(i, 1); KY.se('tap'); }
    else {
      B.links.push([a, b]);
      const max = KY.deduceMax(B.def);
      if (KY.linkedSet(B.links).length > max) { B.links.pop(); KY.toast(`仮説と結べる証拠は ${max} 枚まで`, 'warn'); KY.se('error'); return; }
      KY.se('beep');
    }
    renderCards(); renderNode(); renderFoot(); drawLines();
  }
  function tapNode(id) {
    const B = BD; if (!B || B.ro) { if (B && B.ro) setInfo(id); return; }
    if (B.sel && B.sel !== id) { toggleLink(B.sel, id); B.sel = null; setInfo(id); }
    else if (B.sel === id) { B.sel = null; setInfo(null); }
    else { B.sel = id; setInfo(id); }
    renderCards(); renderNode(); drawLines();
    const el = B.content.querySelector(`[data-node="${CSS.escape(id)}"]`); if (el) try { el.focus({ preventScroll: true }); } catch (e) {}
  }
  // 線の端：仮説カードは下辺の中央、証拠カードは上辺の中央（ピンの位置）
  function center(el) {
    const B = BD, r = el.getBoundingClientRect(), cr = B.content.getBoundingClientRect();
    const isH = el.dataset && el.dataset.node === 'H';
    return [r.left - cr.left + r.width / 2, r.top - cr.top + (isH ? r.height - 2 : 3)];
  }
  function drawLines(tmp) {
    const B = BD; if (!B) return;
    const svg = B.svg, W = B.content.scrollWidth, H = B.content.scrollHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const get = id => B.content.querySelector(`[data-node="${CSS.escape(id)}"]`);
    const ln = (a, b, cls) => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]); l.setAttribute('class', cls); svg.appendChild(l); };
    B.links.forEach(([a, b]) => { const ea = get(a), eb = get(b); if (ea && eb) { const pa = center(ea), pb = center(eb); ln(pa, pb, 'ln-glow'); ln(pa, pb, 'ln'); } });
    if (tmp) ln(tmp[0], tmp[1], 'ln tmp');
  }
  function bindDrag(B) {
    let st = null;
    B.content.addEventListener('pointerdown', e => {
      const n = e.target.closest('[data-node]'); if (!n) return;
      const handle = e.target.closest('.evc-hd');
      if (e.pointerType !== 'mouse' && !handle && n.dataset.node !== 'H') { st = { id: n.dataset.node, x: e.clientX, y: e.clientY, drag: false, touch: true }; return; }
      st = { id: n.dataset.node, x: e.clientX, y: e.clientY, drag: false, el: n };
      if (handle) { e.preventDefault(); try { B.content.setPointerCapture(e.pointerId); } catch (er) {} }
    });
    B.content.addEventListener('pointermove', e => {
      if (!st || st.touch) return;
      if (!st.drag && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 9) { st.drag = true; }
      if (st.drag) { const cr = B.content.getBoundingClientRect(); const a = center(st.el); drawLines([a, [e.clientX - cr.left, e.clientY - cr.top]]); }
    });
    const up = e => {
      if (!st) return;
      const s0 = st; st = null;
      if (s0.touch) { if (Math.hypot(e.clientX - s0.x, e.clientY - s0.y) < 12) tapNode(s0.id); return; }
      if (!s0.drag) { tapNode(s0.id); return; }
      const tgt = document.elementFromPoint(e.clientX, e.clientY); const n = tgt && tgt.closest && tgt.closest('[data-node]');
      if (n && n.dataset.node !== s0.id) { BD.sel = null; toggleLink(s0.id, n.dataset.node); setInfo(n.dataset.node); }
      else drawLines();
    };
    B.content.addEventListener('pointerup', up);
    B.content.addEventListener('pointercancel', () => { st = null; drawLines(); });
    B.content.addEventListener('keydown', e => { const n = e.target.closest && e.target.closest('[data-node]'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapNode(n.dataset.node); } });
  }
  function submit() {
    const B = BD; if (!B || !B.res) return;
    const r = B.res; B.res = null;
    B.foot.querySelectorAll('button').forEach(b => { b.disabled = true; });
    r({ pick: B.pick, links: B.links.map(l => l.slice()) });
  }
  function uiDeduce(def, st) {
    return KY._pend(done => {
      if (!BD || BD.def !== def) boardOpen(def, st, false);
      BD.res = done;
      renderCards(); renderFoot(); drawLines();
    });
  }
  function uiFeedback(def, who, lines, r) {
    return KY._pend(done => {
      const B = BD; if (!B) return done();
      const fb = B.fb; fb.innerHTML = ''; fb.hidden = false;
      const W = KY.WHO[who] || KY.WHO.y;
      const face = $('canvas', 'fb-face'); face.width = 120; face.height = 120;
      KY.drawPortrait(face.getContext('2d'), W.face, 'normal', 120, 120, typeof W.name === 'function' ? W.name() : W.name);
      const body = $('div', 'fb-body');
      body.appendChild($('div', 'dlg-name nm-' + who, typeof W.name === 'function' ? W.name() : W.name));
      const tx = $('div', 'fb-text'); body.appendChild(tx);
      let i = 0;
      const ok = button('考え直す', () => next(), 'primary');
      const next = () => { if (i < lines.length) { tx.textContent = lines[i++]; ok.textContent = i < lines.length ? '次へ' : '考え直す'; return; } fb.hidden = true; KY._G.log.push({ who, name: body.firstChild.textContent, text: lines.join(' ') }); done(); };
      body.appendChild(ok);
      fb.append(face, body);
      next();
      if (r && r.ev) { const el = B.content.querySelector(`[data-node="${CSS.escape(r.ev)}"]`); if (el) { el.classList.add('flag'); try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {} setTimeout(() => el.classList.remove('flag'), 2600); } }
      setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (e) {} }, 30);
    });
  }
  function uiDone(def, st) {
    return KY._pend(done => {
      const B = BD; if (!B) return done();
      B.solved = true; renderNode(); renderFoot();
      const stamp = $('div', 'bd-done');
      stamp.append($('div', 'bdd-k', 'HYPOTHESIS RECORDED'), $('div', 'bdd-t', '……つながった。'));
      B.box.appendChild(stamp);
      let fin = false;
      const end = () => { if (fin) return; fin = true; const i = KY._resize.indexOf(B.onResize); if (i >= 0) KY._resize.splice(i, 1); B.close(); done(); };
      stamp.addEventListener('click', end);
      B.h.key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); end(); } return true; };
      setTimeout(end, KY.reduced() ? 900 : 1800);
    });
  }
  KY.openBoard = function (id) { const st = S().board[id]; if (!st || !st.opts) return; boardOpen({ id, q: st.q, options: st.opts, answer: st.answer, link: 2 }, st, true); };

  /* ───────── 違和感探し ───────── */
  function uiSpot(def, st, need) {
    return KY._pend(done => {
      const h = KY._openOv('ov-spot', { label: '違和感探し' });
      const box = $('div', 'sp');
      const head = $('div', 'bd-head'); head.append($('span', 'bd-tag', 'DIFFERENCE ▍違和感探し'));
      const cnt = $('span', 'sp-count'); head.appendChild(cnt);
      const q = $('div', 'bd-q', def.q || '二つの記録を見比べて、違うところをタップする。');
      const panes = $('div', 'sp-panes');
      const mk = (side, scene, w, label) => {
        const p = $('div', 'sp-pane'); p.dataset.side = side;
        const cv = $('canvas', 'sp-cv'); const lab = $('div', 'sp-lab', label);
        const marks = $('div', 'sp-marks');
        p.append(cv, marks, lab);
        return { p, cv, marks, scene, w, side };
      };
      const A = mk('a', def.a, def.aw || 'A', def.la || ('記録 ' + (def.aw || 'A'))), Bp = mk('b', def.b, def.bw || 'B', def.lb || ('観測 ' + (def.bw || 'B')));
      panes.append(A.p, Bp.p);
      const list = $('div', 'sp-list');
      const foot = $('div', 'bd-foot');
      const hintB = button('ヒント', () => hint(), 'mini'); hintB.disabled = true;
      foot.append(list, hintB);
      box.append(head, q, panes, foot);
      h.el.appendChild(box);
      h.esc = () => KY.openMenu();
      let miss = 0, raf = 0, fin = false;
      const draw = ts => {
        [A, Bp].forEach(P => {
          const r = P.cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
          const W = Math.max(64, Math.round(r.width * dpr)), H = Math.max(48, Math.round(r.height * dpr));
          if (P.cv.width !== W || P.cv.height !== H) { P.cv.width = W; P.cv.height = H; }
          KY.drawScene(P.cv.getContext('2d'), P.scene, P.w, ts / 1000, { w: W, h: H, side: P.side, spot: def.id, stab: S().stability, gbScale: 1 });
        });
        raf = setTimeout(() => requestAnimationFrame(draw), KY.reduced() ? 200 : 80);
      };
      requestAnimationFrame(draw);
      const mark = (i, cls) => {
        const p = def.spots[i];
        [A, Bp].forEach(P => { const m = $('span', 'sp-mark ' + (cls || '')); m.style.left = p.x * 100 + '%'; m.style.top = p.y * 100 + '%'; const d = Math.max(p.r || 0.06, 0.05) * 200; m.style.width = d + '%'; m.style.paddingTop = d + '%'; P.marks.appendChild(m); if (cls === 'hint') setTimeout(() => m.remove(), 1800); });
      };
      const upd = () => {
        cnt.textContent = `${st.found.length}／${need}`;
        list.innerHTML = '';
        st.found.forEach(i => list.appendChild($('span', 'sp-found', '✓ ' + (def.spots[i].label || '差分'))));
        if (!st.found.length) list.appendChild($('span', 'sp-help', '違うところをタップ（どちらの記録でもよい）'));
      };
      st.found.forEach(i => mark(i, 'ok'));
      upd();
      const tap = (P, e) => {
        if (fin) return;
        const r = P.cv.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const i = KY.spotHit(def, x, y, st.found);
        if (i >= 0) {
          st.found.push(i); mark(i, 'ok'); KY.se('beep'); upd();
          if (st.found.length >= need) finish();
        } else {
          miss++; KY.se('error');
          const n = $('span', 'sp-miss', '違う'); n.style.left = x * 100 + '%'; n.style.top = y * 100 + '%'; P.marks.appendChild(n); setTimeout(() => n.remove(), 900);
          if (miss >= 3) hintB.disabled = false;
        }
      };
      [A, Bp].forEach(P => P.p.addEventListener('click', e => tap(P, e)));
      const hint = () => { const i = def.spots.findIndex((p, k) => st.found.indexOf(k) < 0); if (i >= 0) mark(i, 'hint'); };
      const finish = () => {
        fin = true;
        const d = $('div', 'bd-done'); d.append($('div', 'bdd-k', 'DIFFERENCE RECORDED'), $('div', 'bdd-t', 'すべての違和感を記録した'));
        const b = button('閉じる', () => end(), 'primary'); d.appendChild(b);
        box.appendChild(d); KY.se('gain');
        h.key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); end(); } return true; };
        setTimeout(() => { try { b.focus(); } catch (e) {} }, 30);
      };
      const end = () => { clearTimeout(raf); h.close(); done(); };
    });
  }

  Object.assign(KY.UI, { deduce: uiDeduce, deduceFeedback: uiFeedback, deduceDone: uiDone, spot: uiSpot });
  KY._reset.push(() => { BD = null; });

  /* ───────── メニューのタブ ───────── */
  // 観測ボード（これまでの推理）
  KY.addMenu('board', '観測ボード', 20, el => {
    const s = S();
    const ids = Object.keys(s.board).filter(k => s.board[k] && s.board[k].opts);
    el.appendChild($('div', 'set-note', '推理の記録。開くと、そのとき結んだ線が残っている。'));
    if (!ids.length) el.appendChild($('div', 'empty', 'まだ観測ボードを使っていない。'));
    ids.forEach(id => {
      const b = s.board[id], o = (b.opts || []).find(x => x.id === b.pick);
      const r = button('', () => { KY._closeAllOv(); KY.openBoard(id); }, 'nb-row board-row');
      r.append($('span', 'nb-q' + (b.solved ? '' : ' unsolved'), b.solved ? '' : '？'), $('span', 'nb-t', b.q || id), $('span', 'nb-x', o ? '仮説：' + o.text : '仮説：未選択'));
      el.appendChild(r);
    });
    el.appendChild(button('すべての証拠カードを見る', (e, h) => { KY._closeAllOv(); KY.openMenu('evidence'); }, 'mini'));
  });
  // 調査手帳
  function notebookList(el, cats, opts) {
    opts = opts || {};
    const s = S();
    let any = false;
    cats.forEach(cat => {
      const c = s.notebook[cat]; if (!c) return;
      const ids = Object.keys(c).sort((a, b) => (c[a].n || 0) - (c[b].n || 0));
      if (!ids.length) return;
      any = true;
      if (!opts.flat) el.appendChild($('div', 'set-h', KY.NOTE_CATS[cat] || cat));
      ids.forEach(id => {
        const e = c[id], solved = KY.solved(cat, e);
        const r = $('div', 'nb-row' + (solved ? '' : ' open'));
        if (opts.faces) { const f = { yuu: 'yuu', mido: 'mido', nagi: 'nagi', kujo: 'kujo', shiro: 'shiro' }[id]; if (f) { const cv = $('canvas', 'nb-face'); cv.width = 96; cv.height = 96; KY.drawPortrait(cv.getContext('2d'), f, 'normal', 96, 96, e.title); r.appendChild(cv); } }
        const tx = $('div', 'nb-body');
        tx.append($('div', 'nb-t', (solved ? '' : '？ ') + KY.noteText(e.title || id, e.n || 0)), $('div', 'nb-x', KY.noteText(e.text || '', (e.n || 0) + 1)));
        r.appendChild(tx);
        el.appendChild(r);
      });
    });
    if (!any) el.appendChild($('div', 'empty', opts.empty || 'まだ何も書かれていない。'));
  }
  KY.addMenu('notebook', '調査手帳', 30, el => {
    const s = S();
    const cats = Object.keys(KY.NOTE_CATS);
    const chips = $('div', 'chips');
    let cur = KY._nbCat || 'all';
    const body = $('div', 'nb-list');
    const show = c => { cur = KY._nbCat = c; chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === c ? 'true' : 'false')); body.innerHTML = ''; notebookList(body, c === 'all' ? cats : [c]); };
    [['all', 'すべて']].concat(cats.map(c => [c, KY.NOTE_CATS[c]])).forEach(([c, lb]) => {
      const n = c === 'all' ? null : s.notebook[c] ? Object.keys(s.notebook[c]).length : 0;
      if (c !== 'all' && !n) return;
      const b = button(lb + (n ? ' ' + n : ''), () => show(c), 'chip'); b.dataset.c = c; chips.appendChild(b);
    });
    el.append(chips, body);
    show(chips.querySelector(`[data-c="${cur}"]`) ? cur : 'all');
  });
  // 証拠一覧
  function evDetail(id) {
    const ev = KY.ev(id);
    const h = KY._openOv('ov-choice ov-evd', { label: ev.title });
    const box = $('div', 'ky-win evd');
    const th = $('canvas', 'evd-th'); th.width = 480; th.height = 270; KY.thumb(th, id);
    const meta = $('div', 'evd-meta', [KY.EV_TYPE[ev.type] || '記録', ev.world ? '観測層' + ev.world : '', ev.ch != null ? (ev.ch === 0 ? 'プロローグ' : '第' + ev.ch + '章') : ''].filter(Boolean).join('｜'));
    box.append(th, $('div', 'evd-t', ev.title), meta, $('div', 'evd-d', ev.desc || ''));
    const row = $('div', 'btn-row');
    if (ev.type === 'audio' || ev.type === 'video') row.appendChild(button('▶ 再生', () => KY.playClip(id), 'primary'));
    row.appendChild(button('閉じる', () => h.close()));
    box.appendChild(row);
    h.el.appendChild(box); h.esc = () => h.close(); KY._focusFirst(row);
  }
  KY.evDetail = evDetail;
  KY.addMenu('evidence', '証拠一覧', 40, el => {
    const s = S();
    const types = Object.keys(KY.EV_TYPE).filter(t => s.evidence.some(id => KY.ev(id).type === t));
    const chips = $('div', 'chips'); const grid = $('div', 'ev-grid');
    let cur = KY._evType || 'all';
    const show = t => {
      cur = KY._evType = t; chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === t ? 'true' : 'false'));
      grid.innerHTML = '';
      const ids = s.evidence.filter(id => t === 'all' || KY.ev(id).type === t).slice().reverse();
      ids.forEach(id => { const c = evCard(id); const b = button('', () => evDetail(id), 'evc-btn'); b.appendChild(c); grid.appendChild(b); });
      if (!ids.length) grid.appendChild($('div', 'empty', 'まだ証拠がない。'));
    };
    [['all', `すべて ${s.evidence.length}`]].concat(types.map(t => [t, KY.EV_TYPE[t]])).forEach(([c, lb]) => { const b = button(lb, () => show(c), 'chip'); b.dataset.c = c; chips.appendChild(b); });
    el.append(chips, grid);
    show(types.indexOf(cur) >= 0 ? cur : 'all');
  });
  KY.addMenu('diff', '世界差分', 50, el => {
    el.appendChild($('div', 'set-note', '同じ場所でも、層によって歴史そのものが違う。見つけた違いの記録。'));
    notebookList(el, ['diff'], { flat: true, empty: 'まだ世界の違いを記録していない。' });
  });
  KY.addMenu('person', '人物', 60, el => { notebookList(el, ['person', 'creature'], { faces: true, empty: 'まだ人物の記録はない。' }); });
  // B-30観測記録
  KY.addMenu('b30', 'B-30記録', 78, el => {
    const s = S();
    const notes = s.notebook.b30 || {};
    const nIds = Object.keys(notes).sort((a, b) => (notes[a].n || 0) - (notes[b].n || 0));
    const open = nIds.length > 0 || KY.has('b30_read') || KY.has('b30');
    const wrap = $('div', 'b30' + (open ? '' : ' locked'));
    wrap.appendChild($('div', 'b30-h', '境界観測記録 B-30'));
    if (!open) {
      wrap.appendChild($('div', 'b30-q', '？'));
      wrap.appendChild($('div', 'set-note', 'この記録は、まだ閲覧できない。'));
      el.appendChild(wrap); return;
    }
    const rec = $('div', 'b30-rec');
    [['対象', '男性'], ['職業', '設備関連業務'], ['特記', '深夜に定期的な映像配信'], ['観測', '対象周辺において低確率で境界ノイズを検出'], ['備考', '精神状態・睡眠状態により観測強度が変動している可能性'], ['氏名', '■■■■（破損）']].forEach(([k, v]) => { const r = $('div', 'b30-r'); r.append($('span', 'b30-k', k), $('span', 'b30-v', v)); rec.appendChild(r); });
    wrap.appendChild(rec);
    // DAY 01〜30
    const days = $('div', 'b30-days');
    const lit = {};
    nIds.forEach(id => { const e = notes[id]; const m = /day\s*0?(\d{1,2})/i.exec(id + ' ' + (e.title || '')); if (m) lit[+m[1]] = e; });
    for (let d = 1; d <= 30; d++) {
      const on = lit[d] || KY.has('b30_day' + String(d).padStart(2, '0'));
      const c = $('div', 'b30-day' + (on ? ' on' : '') + (d === 30 ? ' last' : ''));
      c.append($('span', 'bd-d', 'DAY ' + String(d).padStart(2, '0')), $('span', 'bd-x', on ? (d === 30 ? '――――' : (lit[d] && lit[d].text ? lit[d].text : '記録あり')) : '？'));
      days.appendChild(c);
    }
    wrap.appendChild(days);
    if (nIds.length) { const l = $('div', 'nb-list'); notebookList(l, ['b30'], { flat: true }); wrap.appendChild(l); }
    // 本編の記録との連動（あれば）
    try {
      const L = root.KY_LINK;
      if (L && L.hasMain && L.hasMain() && L.b30 && (KY.has('b30_read') || nIds.length >= 2)) {
        const b = L.b30() || {};
        const sec = $('div', 'b30-link');
        sec.appendChild($('div', 'set-h', '連動観測（対象世界の記録より）'));
        const rows = [];
        if (b.study) rows.push('観測される部屋：資格参考書の冊数が増加している。');
        if (b.stream) rows.push('配信機材を確認。コメント数が増加傾向。');
        if (b.factory) rows.push('設備関連の作業音を継続して検出。');
        if (b.unwell) rows.push('対象の生命反応：低下。');
        if (b.good) rows.push('未来観測：対象は安定している。');
        if (b.bad) rows.push('未来観測：観測映像が途中で途絶える。');
        if (!rows.length) rows.push('対象の生活記録は断片的。特記事項なし。');
        rows.forEach(t => sec.appendChild($('div', 'b30-li', t)));
        wrap.appendChild(sec);
      }
    } catch (e) {}
    el.appendChild(wrap);
  });
})(typeof window !== 'undefined' ? window : globalThis);
