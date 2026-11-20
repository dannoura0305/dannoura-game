/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 画面と操作  noaris/ui.js
   ・物語の進行は noaris/engine.js（NA.make）。ここは見せ方と入力だけ
   ・保存（localStorage）：noaris_meta_v1（周回をまたぐ記録）・noaris_save_v1（セーブ 6 枠＋自動）・noaris_settings_v1（設定）
     ほかの作品（だんのうら・境界事象・境界侵食・トビネズミ）の保存には触らない
   ・操作：タップ／クリック／Enter・Space・Z で次へ。Ctrl を押している間スキップ。A オート・L ログ・S セーブ・Esc 閉じる
   ・試験用の入口：window.__NA_TEST__ があるときだけ中身を出す（tools/noaris_check.mjs）
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const NA = root.NA, AU = root.NA_AUDIO, doc = root.document;
  const KEY = { meta: 'noaris_meta_v1', save: 'noaris_save_v1', set: 'noaris_settings_v1' };
  const store = {
    get(k, d) { try { const v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const meta = Object.assign(NA.newMeta(), store.get(KEY.meta, {}));
  const S = Object.assign({ speed: 28, auto: 1400, bgm: .5, se: .7, skipUnread: false }, store.get(KEY.set, {}));
  const saveMeta = () => store.set(KEY.meta, meta), saveSet = () => store.set(KEY.set, S);
  const saves = () => Object.assign({ slots: [null, null, null, null, null, null], auto: null }, store.get(KEY.save, {}));
  AU.setVol(S.bgm, S.se);

  // ── 部品 ──
  function h(tag, attrs, ...kids) {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'html') el.innerHTML = v; else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat()) if (c != null && c !== false) el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    return el;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const app = doc.getElementById('na-app'); app.innerHTML = '';
  const stage = h('div', { class: 'na-stage' });
  const bg = h('div', { class: 'na-bg na-bg-title' }), chara = h('div', { class: 'na-chara', style: 'opacity:0' }), cg = h('div', { class: 'na-cg' }), fxl = h('div', { class: 'na-fxl' });
  const nameEl = h('div', { class: 'na-name' }), textEl = h('div', { class: 'na-text' }), nextEl = h('div', { class: 'na-next' }, '▼');
  const quick = h('div', { class: 'na-quick' });
  const msg = h('div', { class: 'na-msg', style: 'display:none' }, nameEl, textEl, nextEl, quick);
  const modeEl = h('div', { class: 'na-mode' }), choicesEl = h('div', { class: 'na-choices', style: 'display:none' }), ov = h('div', { class: 'na-ov' });
  stage.append(bg, chara, cg, fxl);
  app.append(stage, modeEl, msg, choicesEl, ov);

  // ── 状態 ──
  let T = null;
  const ui = { screen: 'title', overlay: null, kind: null, cur: null, typing: false, timer: null, autoT: null, auto: false, skip: false, ctrl: false, busy: false, log: [] };
  const setMode = () => { modeEl.textContent = ui.skip ? '▶▶ SKIP' : ui.auto ? '▶ AUTO' : ''; for (const b of quick.children) b.classList.toggle('on', (b.dataset.k === 'auto' && ui.auto) || (b.dataset.k === 'skip' && ui.skip)); };
  const stopModes = () => { ui.auto = false; ui.skip = false; clearTimeout(ui.autoT); setMode(); };

  // ── 仮の人物（SVG のシルエット）：art ごとの形・tint の色。表情は名札で示す（絵が届いたら差し替え） ──
  const FACE = { normal: '', smile: '微笑', cold: '冷たい目', sad: '寂しげ' };
  function svgFor(art, tint) {
    const t = tint || '#ddd', eye = '#f6d36a';
    const head = `<circle cx="150" cy="92" r="40" fill="${t}"/>`;
    if (art === 'cat') return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><path d="M95 260 C80 200 90 150 120 130 L110 80 L140 112 L165 112 L190 80 L182 132 C215 150 225 205 210 260 Z" fill="${t}"/><path d="M205 250 C250 245 262 200 240 180" stroke="${t}" stroke-width="14" fill="none" stroke-linecap="round"/><ellipse cx="135" cy="150" rx="7" ry="9" fill="${eye}"/><ellipse cx="170" cy="150" rx="7" ry="9" fill="${eye}"/></svg>`;
    const bodies = {
      noble: `<path d="M105 140 L195 140 L230 480 L70 480 Z" fill="${t}"/><path d="M110 132 L150 170 L190 132 L200 150 L150 200 L100 150 Z" fill="#fff" opacity=".55"/><circle cx="178" cy="210" r="11" fill="#fff"/><path d="M110 56 C120 30 185 30 192 64 C175 52 140 52 110 70 Z" fill="${t}" opacity=".9"/>`,
      youth: `<path d="M110 140 L190 140 L215 470 L85 470 Z" fill="${t}"/><path d="M108 140 L192 140 L180 175 L120 175 Z" fill="#fff" opacity=".35"/>`,
      knight: `<path d="M90 145 L210 145 L225 470 L75 470 Z" fill="${t}"/><path d="M75 150 L120 138 L120 190 L70 196 Z M225 150 L180 138 L180 190 L230 196 Z" fill="#fff" opacity=".4"/>`,
      scholar: `<path d="M110 140 L190 140 L240 480 L60 480 Z" fill="${t}"/><path d="M128 92 h18 M154 92 h18" stroke="#222" stroke-width="5"/>`,
      maid: `<path d="M115 140 L185 140 L250 470 L50 470 Z" fill="${t}"/><path d="M118 140 L182 140 L170 300 L130 300 Z" fill="#fff" opacity=".6"/>`,
    };
    return `<svg viewBox="0 0 300 500" xmlns="http://www.w3.org/2000/svg">${bodies[art] || bodies.youth}${head}</svg>`;
  }
  function showChara(id, face) {
    const c = id && NA.CHARS[id];
    if (!c || !c.art) { chara.style.opacity = 0; chara.dataset.id = ''; return; }
    if (chara.dataset.id !== id) { chara.innerHTML = svgFor(c.art, c.tint) + '<div class="na-face"></div>'; chara.dataset.id = id; }
    chara.className = 'na-chara' + (c.art === 'cat' ? ' cat' : '') + (face ? ' face-' + face : '');
    const f = chara.querySelector('.na-face'); if (f) f.textContent = FACE[face] ? '表情：' + FACE[face] + '（仮）' : '';
    if (f && c.art === 'cat') f.textContent = '';
    chara.style.opacity = 1;
  }
  function showCg(id) { cg.classList.toggle('on', !!id); cg.innerHTML = id ? `<div class="frame"><div>${(NA.CGS[id] || {}).title || ''}<small>CG（仮）── 絵が届いたら差し替え</small></div></div>` : ''; }
  function setBg(id) { bg.className = 'na-bg na-bg-' + (id || 'void'); }
  function applyView(v) { setBg(v.bg); showChara(v.chara, v.face); showCg(v.cg); AU.bgm(v.bgm); }
  async function fxOne(name) {
    const fast = ui.skip;
    if (name === 'shake') { stage.classList.remove('na-shake'); void stage.offsetWidth; stage.classList.add('na-shake'); return; }
    if (name === 'crack') { if (fast) return; AU.se('crack'); chara.classList.add('crack'); await sleep(700); chara.classList.remove('crack'); return; }
    const d = h('div', { class: 'na-fx ' + name }); fxl.appendChild(d);
    const dur = { fadein: 1200, blackout: 900, flash: 500, loop: 1600 }[name] || 600;
    setTimeout(() => d.remove(), dur + 50);
    if (name === 'blackout') await sleep(fast ? 50 : 450);
    if (name === 'loop') await sleep(fast ? 100 : 1300);
  }
  async function applyFx(fx) {
    for (const f of fx || []) {
      const [k, a, b] = f;
      if (k === 'bg') setBg(a); else if (k === 'chara') showChara(a, b); else if (k === 'face') showChara(T.run.view.chara, a);
      else if (k === 'cg') showCg(a); else if (k === 'bgm') AU.bgm(a); else if (k === 'se') AU.se(a);
      else if (k === 'fx') await fxOne(a); else if (k === 'wait') await sleep(ui.skip ? 30 : a);
    }
  }

  // ── 進める ──
  async function step() {
    if (ui.busy || !T) return; ui.busy = true;
    try {
      clearTimeout(ui.autoT); choicesEl.style.display = 'none';
      const e = T.advance(); saveMeta();
      await applyFx(e.fx);
      ui.kind = e.type;
      if (e.type === 'say') { showSay(e); return; }
      ui.skip = ui.skip && e.type === 'say'; setMode();
      if (e.type === 'choice') { autoSave(); return showChoices(e.options); }
      if (e.type === 'name') return showName();
      if (e.type === 'areas') { autoSave(); return showAreas(); }
      if (e.type === 'end') return showEnd(e);
      if (e.type === 'gameover') return showGameOver(e);
      if (e.type === 'title') return showTitle();
    } finally { ui.busy = false; }
  }
  function showSay(e) {
    ui.cur = { who: e.who, name: e.name, text: e.text };
    ui.log.push({ name: e.name, text: e.text }); if (ui.log.length > 150) ui.log.shift();
    msg.style.display = ''; msg.classList.remove('done');
    const c = NA.CHARS[e.who]; nameEl.textContent = e.name; nameEl.style.color = c && c.color || '';
    textEl.classList.toggle('narr', e.who === 'n');
    if (ui.skip && !(e.read || S.skipUnread)) { ui.skip = false; setMode(); }
    clearInterval(ui.timer);
    if (ui.skip || !(S.speed > 0)) { textEl.textContent = e.text; doneTyping(); return; }
    ui.typing = true; let i = 0; textEl.textContent = '';
    ui.timer = setInterval(() => { i++; textEl.textContent = e.text.slice(0, i); if (i >= e.text.length) { clearInterval(ui.timer); doneTyping(); } }, S.speed);
  }
  function doneTyping() {
    ui.typing = false; msg.classList.add('done'); textEl.textContent = ui.cur ? ui.cur.text : textEl.textContent;
    clearTimeout(ui.autoT);
    if (ui.skip) ui.autoT = setTimeout(() => { if (!ui.overlay) step(); }, 45);
    else if (ui.auto) ui.autoT = setTimeout(() => { if (!ui.overlay && ui.auto) step(); }, S.auto + (ui.cur ? ui.cur.text.length * 35 : 0));
  }
  function next() {
    if (ui.screen !== 'game' || ui.overlay || ui.busy) return;
    if (ui.kind !== 'say') return;
    if (ui.typing) { clearInterval(ui.timer); doneTyping(); return; }
    AU.se('click'); step();
  }
  function showChoices(options) {
    stopModes(); choicesEl.innerHTML = ''; choicesEl.style.display = '';
    for (const o of options) choicesEl.appendChild(h('button', { class: T.choiceRead(o.i) ? 'read' : '', onclick: ev => { ev.stopPropagation(); AU.se('choice'); if (T.choose(o.i)) { ui.log.push({ name: '', text: '▸ ' + o.text }); choicesEl.style.display = 'none'; step(); } } }, o.text));
    const f = choicesEl.querySelector('button'); if (f) f.focus();
  }

  // ── 全体の画面 ──
  function overlay(name, el) { ov.innerHTML = ''; ui.overlay = name; if (el) ov.appendChild(el); }
  function closeOverlay() { ov.innerHTML = ''; ui.overlay = null; if (ui.screen === 'game' && ui.kind === 'say' && !ui.typing) doneTyping(); }
  function screen(cls, ...kids) { return h('div', { class: 'na-screen ' + (cls || '') }, ...kids); }
  function showTitle() {
    stopModes(); ui.screen = 'title'; ui.kind = null; T = null; msg.style.display = 'none'; choicesEl.style.display = 'none';
    setBg('title'); showChara(null); showCg(null); AU.bgm('title');
    const sv = saves(), hasSave = !!(sv.auto || sv.slots.some(Boolean));
    overlay('title', screen('',
      h('div', { class: 'na-logo' }, NA.TITLE), h('div', { class: 'na-sub' }, 'BOUNDARY  NOARIS'), h('div', { class: 'na-tag' }, '試作版 ── 白薔薇の宮殿のみ'),
      h('div', { class: 'na-menu' },
        h('button', { class: 'na-btn', id: 'na-new', onclick: () => { AU.unlock(); newGame(); } }, 'はじめから'),
        h('button', { class: 'na-btn', id: 'na-cont', disabled: !hasSave, onclick: () => { AU.unlock(); showSaveLoad('load', true); } }, 'つづきから'),
        h('button', { class: 'na-btn', onclick: () => { AU.unlock(); showEndings(true); } }, 'エンディング'),
        h('button', { class: 'na-btn', onclick: () => { AU.unlock(); showGallery(true); } }, 'ギャラリー'),
        h('button', { class: 'na-btn', onclick: () => { AU.unlock(); showSettings(true); } }, '設定')),
      meta.loop ? h('div', { class: 'na-note' }, `これまでに繰り返した夜：${meta.loop}`) : null));
  }
  function enterGame() { ui.screen = 'game'; overlay(null); ui.log = []; ui.kind = null; buildQuick(); }
  function newGame() { T = NA.make({ meta }); T.newGame(); enterGame(); msg.style.display = 'none'; step(); }
  function buildQuick() {
    quick.innerHTML = '';
    const b = (k, label, fn) => quick.appendChild(h('button', { 'data-k': k, onclick: ev => { ev.stopPropagation(); if (ui.overlay || ui.busy) return; fn(); } }, label));
    b('log', 'ログ', showLog); b('auto', 'オート', () => { ui.auto = !ui.auto; ui.skip = false; setMode(); if (ui.auto && !ui.typing && ui.kind === 'say') doneTyping(); });
    b('skip', 'スキップ', () => { ui.skip = !ui.skip; ui.auto = false; setMode(); if (ui.skip && ui.kind === 'say') { if (ui.typing) { clearInterval(ui.timer); } doneTyping(); } });
    b('save', 'セーブ', () => showSaveLoad('save')); b('load', 'ロード', () => showSaveLoad('load')); b('set', '設定', () => showSettings());
    b('title', 'タイトル', () => { if (root.confirm('タイトルに戻りますか？（セーブしていない進み具合は消えます）')) showTitle(); });
    setMode();
  }
  function showName() {
    stopModes(); msg.style.display = 'none';
    const inp = h('input', { class: 'na-input', id: 'na-name-in', maxlength: 10, placeholder: NA.DEFAULT_NAME, value: T.run.name || '' });
    const ok = () => { T.resolveName(inp.value); closeOverlay(); step(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } e.stopPropagation(); });
    overlay('name', screen('dim', h('div', { class: 'na-h' }, 'あなたの名前'), h('div', { class: 'na-note' }, '物語の中で呼ばれる名前です（10 文字まで。空のままなら「' + NA.DEFAULT_NAME + '」）。主人公の名前は、まだ決まっていません（仮）。'), inp, h('button', { class: 'na-btn', id: 'na-name-ok', onclick: ok }, '決定')));
    setTimeout(() => inp.focus(), 50);
  }
  function showAreas() {
    stopModes(); msg.style.display = 'none';
    const doors = h('div', { class: 'na-doors' });
    for (const a of NA.AREAS) {
      const open = T.areaOpen(a);
      doors.appendChild(h('button', { class: 'na-door' + (open ? '' : ' locked'), 'data-area': a.id, style: `--c:${a.color}`, onclick: () => { if (!open) return; AU.se('choice'); if (T.pickArea(a.id)) { closeOverlay(); step(); } } }, h('b', {}, a.name), h('small', {}, a.motif)));
    }
    overlay('areas', screen('', h('div', { class: 'na-h' }, 'どの扉を開ける？'), doors, h('div', { class: 'na-note' }, '五つの扉の先に、それぞれ別の物語があります。試作では「白薔薇の宮殿」だけ開けられます。')));
  }
  const KIND = { good: 'GOOD END', bad: 'BAD END', normal: 'NORMAL END', gameover: 'GAME OVER', official: '正式エンド', true: 'トゥルーエンド' };
  function showEnd(e) {
    stopModes(); msg.style.display = 'none'; AU.se('choice'); store.set(KEY.save, Object.assign(saves(), { auto: null }));
    const d = NA.ENDINGS[e.id] || {};
    overlay('end', h('div', { class: 'na-end', id: 'na-end', onclick: () => showTitle() }, h('div', { class: 'big' }, KIND[e.kind] || 'END'), h('div', { class: 't' }, d.title || ''), h('small', {}, 'タップでタイトルへ')));
  }
  function showGameOver(e) {
    stopModes(); msg.style.display = 'none'; showChara(null); AU.bgm(null); AU.se('gameover');
    const d = NA.ENDINGS[e.id] || {};
    overlay('gameover', h('div', { class: 'na-end gameover', id: 'na-end', onclick: () => { closeOverlay(); step(); } }, h('div', { class: 'big' }, 'GAME OVER'), h('div', { class: 't' }, d.title || ''), h('small', {}, '……時計の針が、逆さまに回り始める（タップ）')));
  }
  function label() {
    const sc = NA.SCENES[T.run.scene] || {};
    let title = sc.title; if (!title) { const k = Object.keys(NA.SCENES); title = (NA.SCENES[T.run.scene.replace(/_\w+$/, '_01')] || {}).title || ''; void k; }
    return { title: title || '', name: T.run.name || NA.DEFAULT_NAME, loop: meta.loop, text: ui.cur && ui.kind === 'say' ? ui.cur.text.slice(0, 40) : (T.run.pending ? '（選択の前）' : '') };
  }
  function entry() { return { snap: T.snapshot(), cur: ui.kind === 'say' ? ui.cur : null, at: Date.now(), label: label() }; }
  function autoSave() { if (!T) return; const sv = saves(); sv.auto = entry(); store.set(KEY.save, sv); }
  function loadEntry(en) {
    const U = NA.make({ meta }); if (!U.restore(en.snap)) return false;
    T = U; enterGame(); applyView(T.view()); choicesEl.style.display = 'none';
    if (en.cur && !T.run.pending) { ui.kind = 'say'; showSay(Object.assign({ read: true }, en.cur)); } else { msg.style.display = 'none'; step(); }
    return true;
  }
  function showSaveLoad(mode, fromTitle) {
    stopModes(); const sv = saves();
    const fmt = en => en ? [h('b', {}, (en.label.title || '—') + (en.label.loop ? `　夜 ${en.label.loop + 1}` : '')), en.label.name + '　' + new Date(en.at).toLocaleString('ja-JP'), h('br'), en.label.text || ''] : ['空き'];
    const grid = h('div', { class: 'na-slots' });
    if (mode === 'load' && sv.auto) grid.appendChild(h('button', { class: 'na-slot', 'data-slot': 'auto', onclick: () => loadEntry(sv.auto) }, h('b', {}, '自動'), ...fmt(sv.auto)));
    sv.slots.forEach((en, i) => grid.appendChild(h('button', { class: 'na-slot' + (en ? '' : ' empty'), 'data-slot': i, onclick: () => {
      if (mode === 'save') { if (en && !root.confirm(`${i + 1} 番に上書きしますか？`)) return; const s2 = saves(); s2.slots[i] = entry(); store.set(KEY.save, s2); showSaveLoad('save'); }
      else if (en) loadEntry(en);
    } }, h('b', {}, String(i + 1)), ...fmt(en))));
    overlay('saveload', screen('dim', h('button', { class: 'na-btn na-close', onclick: () => fromTitle ? showTitle() : closeOverlay() }, '閉じる'), h('div', { class: 'na-h' }, mode === 'save' ? 'セーブ' : 'ロード'), grid));
  }
  function showSettings(fromTitle) {
    stopModes();
    const range = (key, min, max, stepv, lab, fmt) => { const v = h('span', {}, fmt(S[key])); const r = h('input', { type: 'range', min, max, step: stepv, value: S[key], oninput: e => { S[key] = Number(e.target.value); v.textContent = fmt(S[key]); AU.setVol(S.bgm, S.se); saveSet(); } }); return h('label', {}, lab, r, v); };
    const chk = h('input', { type: 'checkbox', onchange: e => { S.skipUnread = e.target.checked; saveSet(); } }); chk.checked = !!S.skipUnread;
    overlay('settings', screen('dim', h('button', { class: 'na-btn na-close', onclick: () => fromTitle ? showTitle() : closeOverlay() }, '閉じる'), h('div', { class: 'na-h' }, '設定'),
      h('div', { class: 'na-set' },
        range('speed', 0, 80, 2, '文字の速さ', v => v ? (v < 20 ? '速い' : v < 45 ? 'ふつう' : 'ゆっくり') : '一瞬'),
        range('auto', 400, 4000, 100, 'オートの待ち', v => (v / 1000).toFixed(1) + ' 秒'),
        range('bgm', 0, 1, .05, 'BGM の音量', v => Math.round(v * 100) + '%'),
        range('se', 0, 1, .05, '効果音の音量', v => Math.round(v * 100) + '%'),
        h('label', {}, '未読の文もスキップする', chk),
        h('button', { class: 'na-btn', onclick: () => { if (root.confirm('記録（既読・見たエンディング・ギャラリー・繰り返した夜）とセーブをすべて消しますか？')) { for (const k of [KEY.meta, KEY.save]) try { root.localStorage.removeItem(k); } catch (e) {} root.location.reload(); } } }, '記録とセーブを消す')),
      h('div', { class: 'na-note' }, 'キーボード：Enter・Space・Z で次へ／Ctrl を押している間スキップ／A オート／L ログ／S セーブ／Esc 閉じる')));
  }
  function showLog() {
    stopModes(); const list = h('div', { class: 'na-log', id: 'na-log' }, ...ui.log.map(l => h('div', {}, l.name ? h('b', {}, l.name) : null, l.text)));
    overlay('log', screen('dim', h('button', { class: 'na-btn na-close', onclick: closeOverlay }, '閉じる'), h('div', { class: 'na-h' }, 'ログ'), list));
    setTimeout(() => { ov.firstChild && (ov.firstChild.scrollTop = 1e9); }, 0);
  }
  function showEndings(fromTitle) {
    const list = h('div', { class: 'na-list' }, ...Object.entries(NA.ENDINGS).map(([id, d]) => { const seen = !!meta.endings[id]; return h('div', { class: 'na-row' + (seen ? '' : ' unseen'), 'data-end': id }, h('span', { class: 'k' }, KIND[d.kind] || d.kind), seen ? d.title : '？？？' + (d.todo ? '（未実装）' : '')); }));
    overlay('endings', screen('dim', h('button', { class: 'na-btn na-close', onclick: () => fromTitle ? showTitle() : closeOverlay() }, '閉じる'), h('div', { class: 'na-h' }, 'エンディング'), list, meta.loop ? h('div', { class: 'na-note' }, `これまでに繰り返した夜：${meta.loop}`) : null));
  }
  function showGallery(fromTitle) {
    const list = h('div', { class: 'na-list' }, ...Object.entries(NA.CGS).map(([id, d]) => { const seen = !!meta.cgs[id]; return h('div', { class: 'na-row' + (seen ? '' : ' unseen') }, h('span', { class: 'k' }, 'CG'), seen ? h('button', { class: 'na-btn', onclick: () => { showCg(id); overlay('cg', h('div', { class: 'na-end', onclick: () => { showCg(null); showGallery(fromTitle); } }, h('small', {}, 'タップで戻る'))); } }, d.title) : '？？？'); }));
    overlay('gallery', screen('dim', h('button', { class: 'na-btn na-close', onclick: () => fromTitle ? showTitle() : closeOverlay() }, '閉じる'), h('div', { class: 'na-h' }, 'ギャラリー'), list, h('div', { class: 'na-note' }, 'CG はまだ仮の枠です。')));
  }

  // ── 入力 ──
  stage.addEventListener('click', () => { AU.unlock(); next(); });
  msg.addEventListener('click', () => { AU.unlock(); next(); });
  doc.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Control') { if (ui.screen === 'game' && !ui.overlay && !ui.skip) { ui.ctrl = true; ui.skip = true; setMode(); if (ui.kind === 'say') { clearInterval(ui.timer); doneTyping(); } } return; }
    if (e.key === 'Escape') { if (ui.overlay && ui.screen === 'game' && !['gameover', 'end', 'name', 'areas'].includes(ui.overlay)) closeOverlay(); return; }
    if (ui.screen !== 'game' || ui.overlay) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { if (ui.kind === 'choice') return; e.preventDefault(); AU.unlock(); next(); }
    else if (e.key === 'a' || e.key === 'A') quick.querySelector('[data-k=auto]').click();
    else if (e.key === 'l' || e.key === 'L') showLog();
    else if (e.key === 's' || e.key === 'S') showSaveLoad('save');
  });
  doc.addEventListener('keyup', e => { if (e.key === 'Control' && ui.ctrl) { ui.ctrl = false; ui.skip = false; setMode(); } });

  // ── 試験用の入口（window.__NA_TEST__ があるときだけ） ──
  if (root.__NA_TEST__) Object.defineProperties(root.__NA_TEST__, Object.getOwnPropertyDescriptors({   // getter を写す（Object.assign だと値が固まる）
    get s() { return { screen: ui.screen, overlay: ui.overlay, kind: ui.kind, typing: ui.typing, auto: ui.auto, skip: ui.skip, text: ui.cur && ui.cur.text, name: ui.cur && ui.cur.name, scene: T && T.run.scene, vars: T && Object.assign({}, T.run.vars), player: T && T.run.name, view: T && T.view(), loop: meta.loop, endings: Object.keys(meta.endings), cgs: Object.keys(meta.cgs), choices: [...choicesEl.querySelectorAll('button')].filter(() => choicesEl.style.display !== 'none').map(b => b.textContent), log: ui.log.length, bgm: AU.cur, saves: saves() }; },
    settings: S,
  }));

  showTitle();
})(typeof window !== 'undefined' ? window : globalThis);
