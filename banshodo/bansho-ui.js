'use strict';
// 万象堂：占いの重ね画面（どの作品からも BanshoUI.open(店の設定, { onClose }) で開く）。
// ・作品の画面の上に重ねるだけで、作品の DOM・保存・操作には触れない。閉じると onClose(結果) でゲームへ戻る。
// ・メニューには「使える占術だけ」を出す（作りかけの占術は出さない）。
// ・生年月日などは、本人が「この端末に保存する」を選んだときだけ保存する。選ばなければ、ページを閉じると消える。
(function (global) {
  const B = global.Bansho, T = global.BanshoTexts;
  if (!B || !T) { console.warn('万象堂：bansho-texts.js と bansho-core.js を先に読み込んでください'); return; }
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const randSeed = function () { try { const a = new Uint32Array(2); global.crypto.getRandomValues(a); return a[0].toString(36) + a[1].toString(36); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); } };
  let storage = null; try { storage = global.localStorage; } catch (e) { storage = null; }
  const store = B.createStore(storage);

  // メニュー：id → 表示名・説明・使う占術。手相・相性・仕事運と金運・年齢別運勢は未完成なので、ここに無い（出さない）
  const MENU = {
    today: { n: '今日の運勢', d: '今日の星と、おみくじ' },
    birth: { n: '生年月日占い', d: '数秘術・星座・干支・九星・血液型' },
    tarot: { n: 'タロット占い', d: 'カードを混ぜて、引く' },
    east: { n: '東洋占術', d: '四柱推命・九星気学・易' },
    west: { n: '西洋占術', d: 'ホロスコープ・星座・数秘術・ルーン' },
    synth: { n: '総合鑑定', d: '占術どうしの共通点と違い' },
    book: { n: '運命の書を見る', d: 'あなたの記録' },
    history: { n: '鑑定履歴を見る', d: 'これまでの鑑定' },
    profile: { n: 'あなたのこと', d: '生年月日などの入力・削除' }
  };
  // 表示の順（指示書の鑑定メニューの順）。手相などは、部品（bansho-palm-ui.js）を読み込んだときだけ MENU に入る
  const ORDER = ['today', 'palm', 'birth', 'tarot', 'east', 'west', 'love', 'work', 'age', 'synth', 'book', 'history', 'profile'];
  const EXT = { go: {}, act: {}, synth: [], wipe: [], view: {}, del: [] };
  const SET = {
    birth: ['numerology', 'zodiac', 'eto', 'kyusei', 'blood'],
    east: ['shichu', 'kyusei', 'eto'],
    west: ['horoscope', 'zodiac', 'numerology'],
    synth: ['shichu', 'kyusei', 'horoscope', 'zodiac', 'numerology', 'blood']
  };

  let ui = null; // 開いている間の状態

  function profile() { return store.profile(); }
  function self() { const p = profile(); return p.people.filter(function (x) { return x.self; })[0] || null; }
  function persistOn() { const p = profile(); return !!(p.consent && p.consent.store); }

  function open(shop, opts) {
    if (ui) close();
    shop = shop || {}; opts = opts || {};
    const root = document.createElement('div');
    root.className = 'bs-overlay'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', (shop.brand || '万象堂') + ' ' + (shop.name || ''));
    const th = shop.theme || {};
    ['bg', 'panel', 'ink', 'muted', 'accent', 'line', 'font', 'ui'].forEach(function (k) { if (th[k]) root.style.setProperty('--bs-' + k, th[k]); });
    root.innerHTML = '<div class="bs-shell"><div class="bs-head"><div class="bs-logo" aria-hidden="true">万</div><div class="bs-brand"><b>' + esc(shop.brand || '万象堂') + '</b><small>' + esc(shop.name || 'ばんしょうどう') + '</small></div>' +
      '<button class="bs-btn small ghost bs-x" type="button" data-act="close">' + esc((shop.npc && shop.npc.leaveLabel) || '店を出る') + '</button></div><div class="bs-body" tabindex="-1"></div></div>';
    document.body.appendChild(root);
    ui = { root: root, body: root.querySelector('.bs-body'), shop: shop, opts: opts, readings: [], prevFocus: document.activeElement, onKey: null };
    root.addEventListener('click', onClick);
    ui.onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); if (ui.view !== 'menu') showMenu(); else close(); } };
    document.addEventListener('keydown', ui.onKey);
    showMenu(line('greet'));
    return { close: close };
  }
  function close() {
    if (!ui) return;
    const u = ui; ui = null;
    document.removeEventListener('keydown', u.onKey);
    u.root.remove();
    try { if (u.prevFocus && u.prevFocus.focus) u.prevFocus.focus(); } catch (e) { /* 無視 */ }
    const me = self();
    const result = { readings: u.readings, todayThemes: me ? B.todayThemes(me, new Date()) : [] };
    if (typeof u.opts.onClose === 'function') u.opts.onClose(result);
  }

  // 店員の台詞（夜は night 版があれば使う）
  function line(key) {
    const L = (ui.shop.npc && ui.shop.npc.lines) || {};
    const h = new Date().getHours(); const night = h >= 22 || h < 5;
    const v = (night && L[key + 'Night']) || L[key];
    if (Array.isArray(v)) return v[Math.floor(Math.random() * v.length)];
    return v || '';
  }
  function npcBlock(text) {
    if (!text) return '';
    const npc = ui.shop.npc || {};
    const face = npc.portrait ? '<img class="bs-face" src="' + esc(npc.portrait) + '" alt="">' : '<div class="bs-face" aria-hidden="true">' + esc(npc.icon || '🔮') + '</div>';
    return '<div class="bs-npc">' + face + '<div class="bs-say"><b>' + esc(npc.name || '占い師') + '</b>' + esc(text) + '</div></div>';
  }
  function render(view, html) {
    ui.view = view;
    ui.body.innerHTML = html + '<p class="bs-disclaimer">' + esc(T.DISCLAIMER) + '</p>';
    ui.body.scrollTop = 0;
    const f = ui.body.querySelector('[autofocus], .bs-btn'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* 無視 */ }
  }
  function back() { return '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="menu">← メニューへ</button></div>'; }

  // ───────── メニュー ─────────
  function showMenu(say) {
    const keys = (ui.shop.menu || ORDER).filter(function (k) { return MENU[k]; });
    let h = npcBlock(say || line('menu'));
    h += '<div class="bs-menu">' + keys.map(function (k) { return '<button class="bs-btn" type="button" data-act="go" data-go="' + k + '">' + esc(MENU[k].n) + '<small>' + esc(MENU[k].d) + '</small></button>'; }).join('') + '</div>';
    render('menu', h);
  }
  function go(k) {
    const needsBirth = { today: 1, birth: 1, east: 1, west: 1, synth: 1 };
    if (needsBirth[k] && (!self() || !B.available('numerology', self()).ok)) return showProfile(k, '生年月日を教えていただければ、占えます。');
    if (EXT.go[k]) return EXT.go[k]();
    ({ today: showToday, birth: function () { showSet('birth', '生年月日占い'); }, tarot: showTarot, east: showEast, west: showWest, synth: showSynth, book: showBook, history: showHistory, profile: function () { showProfile(null); } })[k]();
  }

  // ───────── あなたのこと（入力・同意・削除） ─────────
  function showProfile(then, say) {
    const me = self() || { birth: {} }, b = me.birth || {}, p = profile();
    const placeOpt = '<option value="">選ばない</option>' + T.PLACES.map(function (pl, i) { return '<option value="' + i + '"' + (b.place && b.place.name === pl.name ? ' selected' : '') + '>' + esc(pl.name) + '</option>'; }).join('');
    const bloodOpt = ['', 'A', 'B', 'O', 'AB'].map(function (x) { return '<option value="' + x + '"' + ((me.blood || '') === x ? ' selected' : '') + '>' + (x ? x + ' 型' : '選ばない') + '</option>'; }).join('');
    let h = npcBlock(say || line('profile') || 'あなたの「しるし」を教えてください。分からないところは空けたままで構いません。');
    h += '<form class="bs-form" data-then="' + esc(then || '') + '">' +
      '<label>呼び名 <small>（任意。本名でなくて構いません）</small></label><input type="text" name="label" maxlength="20" value="' + esc(me.label || '') + '" autocomplete="off">' +
      '<label>生年月日</label><input type="date" name="date" min="1900-01-01" max="2100-12-31" value="' + esc(b.date || '') + '" autofocus>' +
      '<label>生まれた時刻 <small>（任意。分かると四柱推命の時柱・ホロスコープが出せます）</small></label><input type="time" name="time" value="' + esc(b.time || '') + '">' +
      '<label>生まれた場所 <small>（任意。ホロスコープに使います）</small></label><select name="place">' + placeOpt + '</select>' +
      '<label>血液型 <small>（任意）</small></label><select name="blood">' + bloodOpt + '</select>' +
      '<p class="bs-purpose">入力した内容は、この画面の占いの計算だけに使います。この端末の外へは送りません。ほかの人に見せることもありません。</p>' +
      '<label class="bs-check"><input type="checkbox" name="store"' + (p.consent && p.consent.store ? ' checked' : '') + '><span>この端末に保存する<br><small>保存しない場合は、ページを閉じると入力と鑑定の記録が消えます。保存した物は、下の「すべて消す」でいつでも消せます。</small></span></label>' +
      '<div class="bs-row"><button class="bs-btn primary" type="submit">これで占う</button><button class="bs-btn ghost" type="button" data-act="menu">やめる</button></div>' +
      '</form><div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="wipe">この端末の万象堂の記録をすべて消す</button></div>';
    render('profile', h);
    ui.body.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      const f = e.target, date = f.date.value;
      if (!date) { f.date.focus(); return; }
      const pl = f.place.value === '' ? null : T.PLACES[+f.place.value];
      const person = { id: me.id || ('me' + randSeed()), self: true, label: f.label.value.trim(), birth: { date: date, time: f.time.value || null, place: pl }, blood: f.blood.value || null };
      if (!B.available('numerology', person).ok) { f.date.focus(); return; }
      const prof = profile();
      prof.people = prof.people.filter(function (x) { return !x.self; }).concat([person]);
      prof.consent = Object.assign({}, prof.consent, { store: f.store.checked, photo: f.store.checked && !!(prof.consent && prof.consent.photo) });
      store.saveProfile(prof);
      // 保存をやめたときは、運命の書も端末から外す（その場の記録はメモリに残る）
      if (!f.store.checked) { try { storage && storage.removeItem(store.keys.book); } catch (er) { /* 無視 */ } EXT.wipe.forEach(function (fn) { try { fn({ keepMemory: true }); } catch (er) { /* 無視 */ } }); }
      const then = f.getAttribute('data-then');
      if (then) go(then); else showMenu('承りました。');
    });
  }

  // ───────── 結果の表示 ─────────
  function resultCard(r) {
    if (!r.ok) return '';
    let h = '<div class="bs-card"><h3>' + esc(r.title ? r.name + '・' + r.title : r.name) + '</h3>';
    r.items.forEach(function (it) {
      h += '<div class="bs-item"><b>' + esc(it.h) + (it.stars ? ' <span class="bs-stars" aria-label="' + it.stars + ' / 5">' + '★★★★★'.slice(0, it.stars) + '☆☆☆☆☆'.slice(0, 5 - it.stars) + '</span>' : '') + '</b><p>' + esc(it.t) + '</p>' + (it.sub ? '<span class="bs-sub">' + esc(it.sub) + '</span>' : '') + '</div>';
    });
    (r.notes || []).forEach(function (n) { h += '<p class="bs-note">※ ' + esc(n) + '</p>'; });
    return h + '</div>';
  }
  function record(kind, results, extra) {
    const rd = Object.assign({ at: new Date().toISOString(), kind: kind, shop: { id: ui.shop.id || null, game: ui.shop.game || null, name: ui.shop.name || null }, personId: (self() || {}).id || null, results: results }, extra || {});
    store.addReading(rd, persistOn());
    ui.readings.push(rd);
    return rd;
  }
  function savedNote() { return persistOn() ? '<p class="bs-note">運命の書に記しました。</p>' : '<p class="bs-note">運命の書に記しました（保存しない設定なので、ページを閉じると消えます）。</p>'; }
  function runSet(ids) { const me = self(); const school = store.settings(); return ids.map(function (id) { return B.run(id, me, { school: school }); }).filter(function (r) { return r.ok; }); }

  function showSet(kind, title) {
    const rs = runSet(SET[kind]);
    record(kind, rs);
    render(kind, back() + npcBlock(line('result')) + '<h2 class="bs-h">' + esc(title) + '</h2>' + rs.map(resultCard).join('') + savedNote());
  }
  function showEast() {
    const rs = runSet(SET.east);
    record('east', rs);
    render('east', back() + npcBlock(line('result')) + '<h2 class="bs-h">東洋占術</h2>' + rs.map(resultCard).join('') + savedNote() +
      '<div class="bs-card"><h3>易占い</h3><p>心に問いをひとつ浮かべて、硬貨を振ってください。</p><div class="bs-row"><button class="bs-btn primary" type="button" data-act="iching">易を立てる</button></div></div>');
  }
  function showWest() {
    let ids = SET.west.slice();
    if (B.available('horoscope', self()).ok) ids = ids.filter(function (x) { return x !== 'zodiac'; });
    const rs = runSet(ids);
    record('west', rs);
    const hint = B.available('horoscope', self()).ok ? '' : '<p class="bs-note">※ 生まれた時刻と場所を入れると、ホロスコープ（月・惑星・アセンダント）を出せます。</p>';
    render('west', back() + npcBlock(line('result')) + '<h2 class="bs-h">西洋占術</h2>' + rs.map(resultCard).join('') + hint + savedNote() +
      '<div class="bs-card"><h3>ルーン</h3><p>袋の中の石を引きます。</p><div class="bs-row"><button class="bs-btn" type="button" data-act="rune" data-n="one">一つ引く</button><button class="bs-btn" type="button" data-act="rune" data-n="three">三つ引く</button></div></div>');
  }
  function showToday() {
    const me = self(), now = new Date();
    const rs = [B.run('today', me, { now: now })];
    const key = B.cal.todayKey(now);
    const drawn = store.book().readings.some(function (r) { return r.kind === 'omikuji' && r.date === key; }) || ui.readings.some(function (r) { return r.kind === 'omikuji' && r.date === key; });
    record('today', rs, { date: key });
    let h = back() + npcBlock(line('today') || line('result')) + '<h2 class="bs-h">今日の運勢</h2>' + rs.map(resultCard).join('');
    if (drawn) h += resultCard(B.run('omikuji', me, { now: now })) + '<p class="bs-note">おみくじは一日一回です。</p>';
    else h += '<div class="bs-card"><h3>おみくじ</h3><p>一日に一度だけ引けます。</p><div class="bs-row"><button class="bs-btn primary" type="button" data-act="omikuji">引く</button></div></div>';
    render('today', h + savedNote());
  }
  function drawOmikuji() {
    const now = new Date(), r = B.run('omikuji', self() || {}, { now: now });
    record('omikuji', [r], { date: B.cal.todayKey(now) });
    render('omikuji', back() + npcBlock(line('omikuji') || line('result')) + '<div class="bs-table"><div class="bs-face-card"><span class="glyph">' + esc(r.facts.rank) + '</span><small>' + esc(r.facts.date) + '</small></div></div>' + resultCard(r) + savedNote());
  }

  // ───────── タロット（混ぜる・並べる・選ぶ・めくる） ─────────
  function showTarot() {
    render('tarot', back() + npcBlock(line('tarot') || '問いを心に浮かべてください。') + '<h2 class="bs-h">タロット占い</h2><div class="bs-row">' +
      '<button class="bs-btn" type="button" data-act="tarot-start" data-n="one">一枚引き<small>いまの導き</small></button>' +
      '<button class="bs-btn" type="button" data-act="tarot-start" data-n="three">三枚引き<small>過去・現在・これから</small></button></div>');
  }
  function tarotStart(spread) {
    ui.tarot = { seed: randSeed(), spread: spread, need: spread === 'three' ? 3 : 1, picks: [] };
    let cards = ''; for (let i = 0; i < T.TAROT.length; i++) cards += '<button class="bs-cardback" type="button" data-act="tarot-pick" data-i="' + i + '" aria-label="' + (i + 1) + ' 枚目のカード"></button>';
    render('tarot', back() + npcBlock('カードを混ぜています……') + '<div class="bs-table bs-shuffling" id="bsTable">' + cards + '</div><p class="bs-note" id="bsPickNote"></p>');
    setTimeout(function () {
      if (!ui || !ui.tarot) return;
      const tb = ui.body.querySelector('#bsTable'); if (tb) tb.classList.remove('bs-shuffling');
      const say = ui.body.querySelector('.bs-say'); if (say) say.lastChild.textContent = '気になるカードを ' + ui.tarot.need + ' 枚、選んでください。';
    }, 1100);
  }
  function tarotPick(i, el) {
    const tr = ui.tarot; if (!tr || tr.picks.indexOf(i) >= 0 || tr.picks.length >= tr.need) return;
    tr.picks.push(i); el.classList.add('picked');
    const note = ui.body.querySelector('#bsPickNote'); if (note) note.textContent = 'あと ' + (tr.need - tr.picks.length) + ' 枚';
    if (tr.picks.length < tr.need) return;
    setTimeout(function () {
      const r = B.run('tarot', self() || {}, { seed: tr.seed, spread: tr.spread, picks: tr.picks });
      record('tarot', [r]);
      ui.tarot = null;
      const faces = r.items.map(function (it) { return '<div class="bs-face-card' + (it.rev ? ' rev' : '') + '"><span class="glyph' + (it.card > 12 || it.card === 4 ? ' long' : '') + '" aria-hidden="true">' + ['〇', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ', 'Ⅺ', 'Ⅻ', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'][it.card] + '</span><b>' + esc(T.TAROT[it.card].n) + '</b><small>' + (it.rev ? '逆位置' : '正位置') + '</small></div>'; }).join('');
      render('tarot', back() + npcBlock(line('result')) + '<div class="bs-table">' + faces + '</div>' + resultCard(r) + savedNote() +
        '<div class="bs-row"><button class="bs-btn" type="button" data-act="go" data-go="tarot">もう一度引く</button></div>');
    }, 450);
  }

  // ───────── 易（硬貨を六回振る） ─────────
  function ichingStart() {
    const seed = randSeed(); const r = B.run('iching', self() || {}, { seed: seed });
    ui.iching = { r: r, k: 0 };
    render('iching', back() + npcBlock('硬貨を六回振ります。下の爻から積み上げていきます。') + '<h2 class="bs-h">易占い</h2><div class="bs-hex" id="bsHex">' + '<div class="bs-yao empty"><i></i><i></i></div>'.repeat(6) + '</div>' +
      '<div class="bs-row" style="justify-content:center"><button class="bs-btn primary" type="button" data-act="iching-throw">硬貨を振る（1 / 6）</button></div>');
  }
  function ichingThrow(btn) {
    const ic = ui.iching; if (!ic) return;
    const v = ic.r.facts.values[ic.k];
    const yao = ui.body.querySelectorAll('#bsHex .bs-yao')[ic.k];
    yao.className = 'bs-yao' + ((v === 7 || v === 9) ? ' yang' : '') + ((v === 6 || v === 9) ? ' moving' : '');
    ic.k++;
    if (ic.k < 6) { btn.textContent = '硬貨を振る（' + (ic.k + 1) + ' / 6）'; return; }
    btn.remove();
    record('iching', [ic.r], { seed: ic.r.seed });
    const hex = ui.body.querySelector('#bsHex').outerHTML;
    ui.iching = null;
    render('iching', back() + npcBlock(line('result')) + '<h2 class="bs-h">易占い</h2>' + hex + resultCard(ic.r) + '<p class="bs-note">光っている爻は「動く爻」です。</p>' + savedNote());
  }
  function drawRune(n) {
    const r = B.run('rune', self() || {}, { seed: randSeed(), spread: n });
    record('rune', [r]);
    const faces = r.facts.runes.map(function (g) { const R = T.RUNES.filter(function (x) { return x.n === g.n; })[0]; return '<div class="bs-face-card' + (g.rev ? ' rev' : '') + '"><span class="glyph" aria-hidden="true">' + R.c + '</span><b>' + esc(R.n) + '</b>' + (g.rev ? '<small>逆さ</small>' : '') + '</div>'; }).join('');
    render('rune', back() + npcBlock(line('result')) + '<h2 class="bs-h">ルーン</h2><div class="bs-table">' + faces + '</div>' + resultCard(r) + savedNote());
  }

  // ───────── 総合鑑定 ─────────
  function synthHtml(s) {
    let h = '<div class="bs-card"><h3>総合鑑定</h3><p class="bs-sub">使った占術：' + esc(s.methods.join('・') || 'なし') + '（文章は決まった型から作っています）</p>';
    s.text.forEach(function (x) { h += '<p>' + esc(x.s) + '</p>'; });
    if (s.common.length) h += '<div class="bs-item"><b>共通するテーマ</b>' + s.common.map(function (e) { return '<div>' + esc(e.label) + ' — ' + e.from.map(function (f) { return '<span class="bs-src">' + esc(f.method) + '</span>'; }).join('') + '</div>'; }).join('') + '</div>';
    if (s.conflicts.length) h += '<div class="bs-item"><b>見方が分かれるところ</b>' + s.conflicts.map(function (c) { return '<div>' + esc(c.a.label) + ' ⇔ ' + esc(c.b.label) + '</div>'; }).join('') + '</div>';
    return h + '</div>';
  }
  function showSynth() {
    let rs = runSet(SET.synth);
    EXT.synth.forEach(function (fn) { rs = rs.concat(fn() || []); });
    const s = B.integrate(rs);
    record('synth', rs, { synthesis: s });
    render('synth', back() + npcBlock(line('synth') || line('result')) + '<h2 class="bs-h">総合鑑定</h2>' + synthHtml(s) +
      '<details class="bs-card"><summary>占術ごとの結果を見る</summary>' + rs.map(resultCard).join('') + '</details>' + savedNote());
  }

  // ───────── 運命の書・履歴 ─────────
  const KIND = { birth: '生年月日占い', east: '東洋占術', west: '西洋占術', synth: '総合鑑定', today: '今日の運勢', omikuji: 'おみくじ', tarot: 'タロット', iching: '易', rune: 'ルーン' };
  function fmt(iso) { const d = new Date(iso); return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }
  function allReadings() { return store.book().readings; }
  function showBook() {
    const me = self(), rds = allReadings();
    const last = rds.filter(function (r) { return r.kind === 'synth'; })[0];
    let h = back() + npcBlock(line('book') || 'あなたの運命の書です。') + '<h2 class="bs-h">運命の書</h2>';
    if (!me) h += '<div class="bs-card"><p>まだ何も記されていません。</p><div class="bs-row"><button class="bs-btn" type="button" data-act="go" data-go="profile">あなたのことを記す</button></div></div>';
    else {
      h += '<div class="bs-card"><h3>' + esc(me.label || 'あなた') + '</h3><p>生年月日 ' + esc(me.birth.date) + (me.birth.time ? '　' + esc(me.birth.time) + ' 生まれ' : '') + (me.birth.place ? '　' + esc(me.birth.place.name) : '') + (me.blood ? '　' + esc(me.blood) + ' 型' : '') + '</p>' +
        '<p class="bs-sub">' + (persistOn() ? 'この端末に保存しています。' : '保存していません（ページを閉じると消えます）。') + '鑑定の記録 ' + rds.length + ' 件</p></div>';
      h += last ? '<p class="bs-sub">最後の総合鑑定：' + esc(fmt(last.at)) + '</p>' + synthHtml(last.synthesis) : '<div class="bs-row"><button class="bs-btn" type="button" data-act="go" data-go="synth">総合鑑定を受ける</button></div>';
    }
    render('book', h + '<div class="bs-row"><button class="bs-btn small" type="button" data-act="go" data-go="history">鑑定履歴へ</button></div>');
  }
  function showHistory() {
    const rds = allReadings();
    let h = back() + '<h2 class="bs-h">鑑定履歴</h2>';
    if (!rds.length) h += '<p>まだ鑑定の記録はありません。</p>';
    else h += '<ul class="bs-list">' + rds.map(function (r) { return '<li><span class="grow">' + esc(fmt(r.at)) + '　' + esc(KIND[r.kind] || r.kind) + '<br><span class="bs-sub">' + esc((r.shop && r.shop.name) || '') + '　' + esc(r.results.map(function (x) { return x.name; }).join('・')) + '</span></span>' +
      '<button class="bs-btn small" type="button" data-act="view" data-id="' + esc(r.id) + '">見る</button><button class="bs-btn small ghost" type="button" data-act="del" data-id="' + esc(r.id) + '" aria-label="この記録を消す">消す</button></li>'; }).join('') + '</ul>';
    render('history', h);
  }
  function showReading(id) {
    const r = allReadings().filter(function (x) { return x.id === id; })[0]; if (!r) return showHistory();
    if (EXT.view[r.kind]) return EXT.view[r.kind](r);
    render('reading', '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="go" data-go="history">← 履歴へ</button></div><h2 class="bs-h">' + esc(KIND[r.kind] || r.kind) + '</h2><p class="bs-sub">' + esc(fmt(r.at)) + '　' + esc((r.shop && r.shop.name) || '') + '</p>' +
      (r.synthesis ? synthHtml(r.synthesis) : '') + r.results.map(resultCard).join(''));
  }

  function onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el || !ui) return;
    const act = el.getAttribute('data-act');
    if (act === 'close') return close();
    if (act === 'menu') return showMenu();
    if (act === 'go') return go(el.getAttribute('data-go'));
    if (act === 'tarot-start') return tarotStart(el.getAttribute('data-n'));
    if (act === 'tarot-pick') return tarotPick(+el.getAttribute('data-i'), el);
    if (act === 'iching') return ichingStart();
    if (act === 'iching-throw') return ichingThrow(el);
    if (act === 'rune') return drawRune(el.getAttribute('data-n'));
    if (act === 'omikuji') return drawOmikuji();
    if (act === 'view') return showReading(el.getAttribute('data-id'));
    if (act === 'del') { const rd = allReadings().filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (rd) EXT.del.forEach(function (fn) { try { fn(rd); } catch (er) { /* 無視 */ } }); store.removeReading(el.getAttribute('data-id'), persistOn()); return showHistory(); }
    if (EXT.act[act]) return EXT.act[act](el, e);
    if (act === 'wipe') {
      if (!global.confirm('この端末にある万象堂の記録（あなたの情報・鑑定の履歴）をすべて消します。よろしいですか？')) return;
      store.clearAll(); EXT.wipe.forEach(function (fn) { try { fn(); } catch (er) { /* 無視 */ } }); ui.readings = []; return showMenu('すべて消しました。');
    }
  }

  // 部品（手相など）が画面を足すための口。部品は自分の画面と保存だけを持ち、ここの中身は書き換えない
  const ext = {
    esc: esc, randSeed: randSeed, store: store, self: self, profile: profile, persistOn: persistOn,
    ui: function () { return ui; }, render: render, npcBlock: npcBlock, back: back, line: line, resultCard: resultCard,
    record: record, savedNote: savedNote, showMenu: showMenu, go: go, fmt: function (iso) { return fmt(iso); },
    addMenu: function (id, def, handler) { MENU[id] = def; EXT.go[id] = handler; },
    onAct: function (name, fn) { EXT.act[name] = fn; },
    onSynth: function (fn) { EXT.synth.push(fn); },
    onWipe: function (fn) { EXT.wipe.push(fn); },
    onDelete: function (fn) { EXT.del.push(fn); },
    readings: function () { return allReadings(); },
    onView: function (kind, fn) { EXT.view[kind] = fn; },
    kindName: function (k, n) { KIND[k] = n; }
  };
  global.BanshoUI = { open: open, close: close, store: store, menu: MENU, ext: ext };
})(typeof window !== 'undefined' ? window : this);
