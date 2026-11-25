'use strict';
// 万象堂：手相の画面（BanshoUI の部品。このファイルを読み込んだときだけ、メニューに「手相占い」が出る）。
// 流れ：説明と同意 → 写真を選ぶ → 3 点を置く（左右の推定を本人が確かめる） → 線をなぞる → 鑑定（左右・時期の比べ）。
// ・写真は端末の中だけで使い、どこへも送らない。読み込むときに縮めて描き直すので、撮影場所などの Exif 情報は残らない。
// ・写真を保存するかどうかは、本人が選ぶ（既定は保存しない）。保存先は IndexedDB（'bansho' の 'photos'）だけ。
// ・線の位置（なぞった線）は、鑑定の記録として運命の書に入る（記録の保存を選んだ人だけ端末に残る）。
(function (global) {
  const UI = global.BanshoUI, PM = global.BanshoPalm, B = global.Bansho;
  if (!UI || !UI.ext || !PM || !B) { console.warn('万象堂：手相は bansho-ui.js と bansho-palm.js の後に読み込んでください'); return; }
  const X = UI.ext, esc = X.esc, L = PM.LINES;
  const MAX_SIDE = 1200;         // 写真を縮める大きさ（長い辺のピクセル）
  const SIDE_NAME = { L: '左手', R: '右手' };
  const LM_STEPS = [['wrist', '手首のしわの中央'], ['index', '人差し指の付け根（指の股の中央）'], ['pinky', '小指の付け根（指の股の中央）']];

  // ───────── 写真の置き場所：IndexedDB（保存を選んだとき）・メモリ（その場だけ） ─────────
  const MEM = {};
  function db() {
    return new Promise(function (res, rej) {
      let q; try { q = global.indexedDB.open('bansho', 1); } catch (e) { return rej(e); }
      q.onupgradeneeded = function () { if (!q.result.objectStoreNames.contains('photos')) q.result.createObjectStore('photos', { keyPath: 'id' }); };
      q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    });
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { const t = d.transaction('photos', mode); const r = fn(t.objectStore('photos')); t.oncomplete = function () { d.close(); res(r && r.result); }; t.onerror = function () { d.close(); rej(t.error); }; }); }); }
  const photos = {
    put: function (id, blob) { MEM[id] = blob; return tx('readwrite', function (s) { return s.put({ id: id, blob: blob, at: new Date().toISOString() }); }); },
    get: function (id) { if (MEM[id]) return Promise.resolve(MEM[id]); return tx('readonly', function (s) { return s.get(id); }).then(function (r) { return r ? r.blob : null; }).catch(function () { return null; }); },
    del: function (id) { delete MEM[id]; return tx('readwrite', function (s) { return s.delete(id); }).catch(function () {}); },
    clear: function () { return tx('readwrite', function (s) { return s.clear(); }).catch(function () {}); }
  };

  let P = null; // 作業中の手

  function consent() { return X.profile().consent || {}; }
  function setConsent(patch) { const p = X.profile(); p.consent = Object.assign({}, p.consent, patch); if (!p.consent.store) p.consent.photo = false; X.store.saveProfile(p); }
  function hand() { return X.profile().hand || null; }
  function setHand(h) { const p = X.profile(); p.hand = h || null; X.store.saveProfile(p); }
  function palmReadings() { return X.readings().filter(function (r) { return r.kind === 'palm' && r.palm; }); }

  // ───────── 入口：説明と同意 ─────────
  function home(say) {
    P = null;
    const c = consent(), dh = hand();
    const past = palmReadings();
    const lastOf = function (s) { return past.filter(function (r) { return r.palm.side === s; })[0]; };
    let h = X.back() + X.npcBlock(say || X.line('palm') || '手のひらを見せてください。写真の上で、一緒に線を確かめていきましょう。') + '<h2 class="bs-h">手相占い</h2>' +
      '<div class="bs-card"><h3>進め方</h3><ol style="margin:0;padding-left:1.4em"><li>手のひらの写真を選ぶ（指をそろえて開き、明るい所で）</li><li>手首・人差し指・小指の付け根の 3 か所を置く</li><li>見えている線を、種類を選んで指でなぞる</li><li>なぞった線だけで鑑定します。分からない線は、なぞらなくて構いません</li></ol></div>' +
      '<div class="bs-card bs-form"><h3>写真と記録の扱い</h3><p class="bs-purpose" style="margin-top:0">写真はこの端末の中だけで使い、どこへも送りません。読み込むときに描き直すので、撮影場所などの情報は残りません。</p>' +
      '<label class="bs-check"><input type="checkbox" data-act="palm-consent" data-k="store"' + (c.store ? ' checked' : '') + '><span>鑑定の記録（なぞった線の位置を含む）をこの端末に保存する</span></label>' +
      '<label class="bs-check"><input type="checkbox" data-act="palm-consent" data-k="photo"' + (c.photo ? ' checked' : '') + (c.store ? '' : ' disabled') + '><span>手の写真もこの端末に保存する<br><small>保存すると、あとで写真の上の線を見直したり、時期の違う写真と見比べたりできます。保存しない場合、写真はページを閉じると消えます。' + (c.store ? '' : '（先に上の「記録を保存する」を選んでください）') + '</small></span></label>' +
      '<label>利き手 <small>（左右の手の読み分けに使います）</small></label><div class="bs-row" style="margin-top:0">' +
      ['R', 'L', ''].map(function (k) { return '<button class="bs-btn small' + ((dh || '') === k ? ' primary' : '') + '" type="button" data-act="palm-hand" data-h="' + k + '">' + (k ? SIDE_NAME[k] : '分からない') + '</button>'; }).join('') + '</div></div>' +
      '<div class="bs-row"><button class="bs-btn primary" type="button" data-act="palm-new" data-side="L">左手を登録する</button><button class="bs-btn primary" type="button" data-act="palm-new" data-side="R">右手を登録する</button></div>';
    if (past.length) {
      h += '<div class="bs-card"><h3>これまでの手相</h3><ul class="bs-list">' + ['L', 'R'].map(function (s) { const r = lastOf(s); return r ? '<li><span class="grow">' + SIDE_NAME[s] + '　' + esc(X.fmt(r.at)) + (r.palm.photoId ? '　写真あり' : '') + '</span><button class="bs-btn small" type="button" data-act="view" data-id="' + esc(r.id) + '">見る</button></li>' : ''; }).join('') + '</ul></div>';
    }
    X.render('palm', h);
  }

  // ───────── 写真を選ぶ ─────────
  function startNew(side) {
    P = { side: side, chosenSide: side, step: 'photo', lm: {}, lines: {}, cur: 'life', hist: [], showCrease: false };
    X.render('palm', X.back() + X.npcBlock(SIDE_NAME[side] + 'の手のひらの写真を選んでください。指をそろえて開き、手のひら全体が入るように。') +
      '<h2 class="bs-h">' + SIDE_NAME[side] + 'を登録する</h2><div class="bs-card bs-form"><label>写真 <small>（カメラで撮るか、保存してある写真を選ぶ）</small></label><input type="file" accept="image/*" id="bsPalmFile"><p class="bs-note" id="bsPalmMsg"></p></div>');
    X.ui().body.querySelector('#bsPalmFile').addEventListener('change', function (e) { const f = e.target.files && e.target.files[0]; if (f) loadPhoto(f); });
  }
  function loadPhoto(file) {
    const msg = X.ui().body.querySelector('#bsPalmMsg'); if (msg) msg.textContent = '読み込んでいます…';
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = function () {
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(function (blob) { // 描き直した JPEG（Exif は入らない）
        if (!P) return;
        P.photo = cv; P.blob = blob; P.w = cv.width; P.h = cv.height; P.step = 'lm';
        workspace();
      }, 'image/jpeg', 0.88);
    };
    img.onerror = function () { URL.revokeObjectURL(url); if (msg) msg.textContent = 'この写真は読み込めませんでした。別の写真を選んでください。'; };
    img.src = url;
  }

  // ───────── 作業台（3 点・線をなぞる） ─────────
  function workspace() {
    let h = X.back() + '<div id="bsPalmSay"></div><div style="position:relative;margin:10px 0"><canvas id="bsPalmCv" style="width:100%;max-height:68vh;object-fit:contain;touch-action:none;display:block;border-radius:8px;border:1px solid var(--bs-line);background:#000"></canvas></div><div id="bsPalmTools"></div>';
    X.render('palm', h);
    const cv = X.ui().body.querySelector('#bsPalmCv');
    cv.width = P.w; cv.height = P.h;
    // 高さが画面に収まるよう、表示の幅を決める
    const maxH = global.innerHeight * 0.68; if (P.h / P.w * cv.clientWidth > maxH) cv.style.width = Math.floor(maxH * P.w / P.h) + 'px';
    bindCanvas(cv);
    tools(); draw();
  }
  function say(t) { const s = X.ui().body.querySelector('#bsPalmSay'); if (s) s.innerHTML = X.npcBlock(t); }
  function tools() {
    const box = X.ui().body.querySelector('#bsPalmTools'); if (!box) return;
    if (P.step === 'lm') {
      const k = Object.keys(P.lm).length;
      say('写真の上を押して、3 か所を順に置いてください。\nいま置くのは：' + (k < 3 ? (k + 1) + '. ' + LM_STEPS[k][1] : '（3 か所そろいました）'));
      box.innerHTML = '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="palm-lm-reset">置き直す</button><button class="bs-btn small ghost" type="button" data-act="palm-repick">写真を選び直す</button></div>';
      return;
    }
    if (P.step === 'side') {
      say('写真からは「' + SIDE_NAME[P.guess] + '」に見えます。\n自撮りの鏡写しや、手の甲側から撮った写真では逆に見えることがあります。この写真はどちらの手ですか？');
      box.innerHTML = '<div class="bs-row"><button class="bs-btn primary" type="button" data-act="palm-side" data-side="L">左手</button><button class="bs-btn primary" type="button" data-act="palm-side" data-side="R">右手</button><button class="bs-btn small ghost" type="button" data-act="palm-lm-reset">3 か所を置き直す</button></div>';
      return;
    }
    // 線をなぞる
    say('線の種類を選んでから、写真の上を指でなぞってください。\n分からない線は、なぞらなくて構いません（その線は鑑定しません）。');
    const status = function (k) { const x = P.lines[k]; if (x && x.absent) return '見当たらない'; const n2 = x && x.segs ? x.segs.length : 0; return n2 ? 'なぞった ' + n2 : 'まだ'; };
    let t = '<div class="bs-menu" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">' + PM.ORDER.map(function (k) {
      return '<button class="bs-btn small' + (P.cur === k ? ' primary' : '') + '" type="button" data-act="palm-type" data-k="' + k + '" style="border-left:6px solid ' + L[k].color + '">' + esc(L[k].n) + '<small>' + status(k) + '</small></button>';
    }).join('') + '</div>';
    t += '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="palm-undo">一つ戻す</button><button class="bs-btn small ghost" type="button" data-act="palm-clear">この線を消す</button>' +
      (P.cur !== 'other' ? '<button class="bs-btn small ghost" type="button" data-act="palm-absent">' + esc(L[P.cur].n) + 'は見当たらない</button>' : '') +
      '<button class="bs-btn small ghost" type="button" data-act="palm-crease">しわの候補を' + (P.showCrease ? '隠す' : '表示する') + '</button></div>' +
      (P.showCrease ? '<p class="bs-note">水色の点は、写真の明暗から拾った「しわかもしれない所」です。線の種類は決めていません。目安にして、ご自分の目で確かめてなぞってください。</p>' : '') +
      '<div class="bs-row"><button class="bs-btn primary" type="button" data-act="palm-done">この線で鑑定する</button><button class="bs-btn small ghost" type="button" data-act="palm-lm-reset">3 か所を置き直す</button></div>';
    box.innerHTML = t;
  }
  function toNorm(cv, e) { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; }
  function bindCanvas(cv) {
    let stroke = null;
    cv.addEventListener('pointerdown', function (e) {
      if (!P) return; e.preventDefault();
      const p = toNorm(cv, e);
      if (P.step === 'lm') {
        const k = Object.keys(P.lm).length; if (k >= 3) return;
        P.lm[LM_STEPS[k][0]] = p; draw();
        if (k === 2) afterLandmarks(); else tools();
        return;
      }
      if (P.step !== 'trace') return;
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* 無視 */ }
      stroke = [p]; P.live = { k: P.cur, s: stroke }; draw();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!stroke) return; e.preventDefault();
      const p = toNorm(cv, e), q = stroke[stroke.length - 1];
      if (Math.hypot((p[0] - q[0]) * P.w, (p[1] - q[1]) * P.h) >= 6) { stroke.push(p); draw(); }
    });
    const end = function () {
      if (!stroke) return;
      const s = stroke; stroke = null; P.live = null;
      let lenPx = 0; for (let i = 1; i < s.length; i++) lenPx += Math.hypot((s[i][0] - s[i - 1][0]) * P.w, (s[i][1] - s[i - 1][1]) * P.h);
      if (s.length >= 2 && lenPx >= Math.max(P.w, P.h) * 0.015) {
        const x = P.lines[P.cur] || (P.lines[P.cur] = { segs: [] }); x.absent = false; x.segs = x.segs || []; x.segs.push(s.map(function (p) { return [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]; }));
        P.hist.push(P.cur);
      }
      draw(); tools();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function afterLandmarks() {
    const F = PM.frame({ wrist: [P.lm.wrist[0] * P.w, P.lm.wrist[1] * P.h], index: [P.lm.index[0] * P.w, P.lm.index[1] * P.h], pinky: [P.lm.pinky[0] * P.w, P.lm.pinky[1] * P.h] });
    if (!F) { P.lm = {}; draw(); tools(); say('3 か所の位置関係がおかしいようです。手首 → 人差し指 → 小指の順に、置き直してください。'); return; }
    P.guess = F.guess;
    if (F.guess !== P.chosenSide) { P.step = 'side'; tools(); return; }
    P.side = P.chosenSide; P.step = 'trace'; tools();
  }
  function crease() {
    if (P.creaseCv) return P.creaseCv;
    const k = Math.min(1, 320 / Math.max(P.w, P.h)), w = Math.max(1, Math.round(P.w * k)), h = Math.max(1, Math.round(P.h * k));
    const sc = document.createElement('canvas'); sc.width = w; sc.height = h; const g = sc.getContext('2d'); g.drawImage(P.photo, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) | 0;
    const lm = { wrist: [P.lm.wrist[0] * w, P.lm.wrist[1] * h], index: [P.lm.index[0] * w, P.lm.index[1] * h], pinky: [P.lm.pinky[0] * w, P.lm.pinky[1] * h] };
    const mask = PM.palmMask(gray, w, h, lm);
    const m = PM.creaseMap(gray, w, h);
    for (let i = 0; i < m.length; i++) if (!mask[i]) m[i] = 0;
    const out = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (m[i]) { out.data[i * 4] = 80; out.data[i * 4 + 1] = 220; out.data[i * 4 + 2] = 255; out.data[i * 4 + 3] = Math.min(230, 80 + m[i]); }
    g.putImageData(out, 0, 0); P.creaseCv = sc; return sc;
  }
  function drawLines(g, w, h, lines, live, lm) {
    const lw = Math.max(3, Math.round(Math.max(w, h) / 220));
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = function (s, color) { if (s.length < 2) return; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = lw + 3; g.beginPath(); s.forEach(function (p, i) { g[i ? 'lineTo' : 'moveTo'](p[0] * w, p[1] * h); }); g.stroke(); g.strokeStyle = color; g.lineWidth = lw; g.stroke(); };
    PM.ORDER.forEach(function (k) { const x = lines[k]; if (x && x.segs) x.segs.forEach(function (s) { path(s, L[k].color); }); });
    if (live) path(live.s, L[live.k].color);
    if (lm) LM_STEPS.forEach(function (st, i) {
      const p = lm[st[0]]; if (!p) return;
      const r = lw * 2.4; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(p[0] * w, p[1] * h, r, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#000'; g.font = 'bold ' + Math.round(r * 1.3) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), p[0] * w, p[1] * h + 1);
    });
  }
  function draw() {
    const cv = X.ui() && X.ui().body.querySelector('#bsPalmCv'); if (!cv || !P) return;
    const g = cv.getContext('2d'); g.drawImage(P.photo, 0, 0);
    if (P.showCrease && P.step === 'trace') { g.globalAlpha = 0.85; g.drawImage(crease(), 0, 0, P.w, P.h); g.globalAlpha = 1; }
    drawLines(g, P.w, P.h, P.lines, P.live, P.lm);
  }

  // ───────── 鑑定 ─────────
  function finish() {
    const handData = { side: P.side, dominant: hand(), w: P.w, h: P.h, landmarks: P.lm, lines: P.lines };
    const res = B.run('palm', {}, { palm: handData });
    if (!res.ok) { say('3 か所の位置が読み取れませんでした。置き直してください。'); return; }
    const prevSame = palmReadings().filter(function (r) { return r.palm.side === P.side; })[0];
    const other = palmReadings().filter(function (r) { return r.palm.side !== P.side; })[0];
    const L2 = P.side === 'L' ? res : (other && other.results[0]), R2 = P.side === 'R' ? res : (other && other.results[0]);
    const cmpHands = other ? PM.compareHands(L2, R2, hand()) : [];
    const cmpTime = prevSame ? PM.compareTime(prevSame.results[0], res) : [];
    const id = 'p' + X.randSeed();
    const savePhoto = !!(consent().store && consent().photo);
    MEM[id] = P.blob;
    const done = function (saved) {
      X.record('palm', [res], { palm: Object.assign({ at: new Date().toISOString(), photoId: id, photoSaved: saved }, handData), compare: { hands: cmpHands, time: cmpTime, prevAt: prevSame ? prevSame.at : null, otherAt: other ? other.at : null } });
      const rd = X.ui().readings[X.ui().readings.length - 1];
      P = null; showPalm(rd, true);
    };
    if (savePhoto) photos.put(id, P.blob).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }
  function cmpHtml(rd) {
    const c = rd.compare || {}; let h = '';
    if (c.hands && c.hands.length) h += '<div class="bs-card"><h3>左右の比べ</h3><p class="bs-sub">もう片方の手（' + esc(X.fmt(c.otherAt)) + ' の記録）と比べました。' + (hand() ? '' : '利き手を選ぶと、どちらが「生まれ持った」側かを読み分けます。') + '</p>' + c.hands.map(function (it) { return '<div class="bs-item"><b>' + esc(it.h) + '</b><p>' + esc(it.t) + '</p></div>'; }).join('') + '</div>';
    if (c.time && c.time.length) h += '<div class="bs-card"><h3>前の記録との比べ</h3><p class="bs-sub">同じ手の ' + esc(X.fmt(c.prevAt)) + ' の記録と比べました。</p>' + c.time.map(function (it) { return '<div class="bs-item"><b>' + esc(it.h) + '</b><p>' + esc(it.t) + '</p></div>'; }).join('') + '</div>';
    return h;
  }
  // 鑑定の表示（その場・履歴から）。写真が無ければ、線と 3 点だけを描く
  function showPalm(rd, fresh) {
    const pm = rd.palm;
    let h = (fresh ? X.back() + X.npcBlock(X.line('result')) : '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="go" data-go="history">← 履歴へ</button></div>') +
      '<h2 class="bs-h">手相占い</h2><p class="bs-sub">' + esc(X.fmt(rd.at)) + '　' + esc((rd.shop && rd.shop.name) || '') + '</p>' +
      '<canvas id="bsPalmView" style="width:100%;max-width:420px;display:block;margin:10px auto;border-radius:8px;border:1px solid var(--bs-line);background:#111"></canvas><p class="bs-note" id="bsPalmPhotoNote" style="text-align:center"></p>' +
      rd.results.map(X.resultCard).join('') + cmpHtml(rd);
    if (fresh) h += X.savedNote() + '<p class="bs-note">' + (pm.photoSaved ? '写真もこの端末に保存しました。' : '写真は保存していません（ページを閉じると消えます）。') + '</p>' +
      '<div class="bs-row"><button class="bs-btn" type="button" data-act="palm-new" data-side="' + (pm.side === 'L' ? 'R' : 'L') + '">' + SIDE_NAME[pm.side === 'L' ? 'R' : 'L'] + 'も登録する</button><button class="bs-btn" type="button" data-act="go" data-go="synth">総合鑑定へ</button></div>';
    else h += '<div class="bs-row"><button class="bs-btn small ghost" type="button" data-act="palm-del" data-id="' + esc(rd.id) + '">この記録' + (pm.photoSaved ? 'と写真' : '') + 'を消す</button></div>';
    X.render('palm-view', h);
    const cv = X.ui().body.querySelector('#bsPalmView'); cv.width = pm.w; cv.height = pm.h;
    const g = cv.getContext('2d'); const note = X.ui().body.querySelector('#bsPalmPhotoNote');
    const lines = function () { drawLines(g, pm.w, pm.h, pm.lines, null, pm.landmarks); };
    photos.get(pm.photoId).then(function (blob) {
      if (!blob) { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, pm.w, pm.h); lines(); if (note) note.textContent = '写真は保存されていないため、なぞった線だけを表示しています。'; return; }
      const url = URL.createObjectURL(blob); const img = new Image();
      img.onload = function () { g.drawImage(img, 0, 0, pm.w, pm.h); URL.revokeObjectURL(url); lines(); };
      img.src = url;
    });
  }

  // ───────── メニュー・操作の登録 ─────────
  X.addMenu('palm', { n: '手相占い', d: '手のひらの写真から、線を確かめて読む' }, function () { home(); });
  X.kindName('palm', '手相');
  X.onView('palm', function (rd) { showPalm(rd, false); });
  X.onAct('palm-consent', function (el) {
    const k = el.getAttribute('data-k'), patch = {}; patch[k] = el.checked;
    if (k === 'store' && !el.checked) patch.photo = false;
    setConsent(patch);
    if (k === 'photo' && !el.checked) palmReadings().forEach(function (r) { if (r.palm.photoSaved) { photos.del(r.palm.photoId); r.palm.photoSaved = false; } });
    home(k === 'photo' ? (el.checked ? 'これからの手の写真は、この端末に保存します。' : '手の写真は保存しません。保存してあった写真も消しました。') : (el.checked ? '鑑定の記録を、この端末に保存します。' : '記録は保存しません。'));
  });
  X.onAct('palm-hand', function (el) { setHand(el.getAttribute('data-h')); home(); });
  X.onAct('palm-new', function (el) { startNew(el.getAttribute('data-side')); });
  X.onAct('palm-repick', function () { startNew(P ? P.chosenSide : 'R'); });
  X.onAct('palm-lm-reset', function () { if (!P) return; P.lm = {}; P.creaseCv = null; P.step = 'lm'; draw(); tools(); });
  X.onAct('palm-side', function (el) { if (!P) return; P.side = el.getAttribute('data-side'); P.step = 'trace'; tools(); });
  X.onAct('palm-type', function (el) { if (!P) return; P.cur = el.getAttribute('data-k'); tools(); });
  X.onAct('palm-undo', function () { if (!P || !P.hist.length) return; const k = P.hist.pop(); const x = P.lines[k]; if (x && x.segs) x.segs.pop(); draw(); tools(); });
  X.onAct('palm-clear', function () { if (!P) return; delete P.lines[P.cur]; P.hist = P.hist.filter(function (k) { return k !== P.cur; }); draw(); tools(); });
  X.onAct('palm-absent', function () { if (!P) return; P.lines[P.cur] = { segs: [], absent: true }; P.hist = P.hist.filter(function (k) { return k !== P.cur; }); draw(); tools(); });
  X.onAct('palm-crease', function () { if (!P) return; P.showCrease = !P.showCrease; draw(); tools(); });
  X.onAct('palm-done', function () {
    if (!P) return;
    const any = PM.ORDER.some(function (k) { const x = P.lines[k]; return x && ((x.segs && x.segs.length) || x.absent); });
    if (!any) { say('まだ線がありません。線の種類を選んで、写真の上をなぞってください。'); return; }
    finish();
  });
  X.onAct('palm-del', function (el) {
    const id = el.getAttribute('data-id'); const rd = X.readings().filter(function (r) { return r.id === id; })[0];
    if (rd && rd.palm) photos.del(rd.palm.photoId);
    X.store.removeReading(id, X.persistOn()); X.go('history');
  });
  X.onDelete(function (rd) { if (rd.palm) photos.del(rd.palm.photoId); });
  X.onWipe(function (o) { photos.clear(); if (!(o && o.keepMemory)) Object.keys(MEM).forEach(function (k) { delete MEM[k]; }); });
  // 総合鑑定：利き手の記録を優先して、最新の手相を一つ入れる
  X.onSynth(function () {
    const rs = palmReadings(); if (!rs.length) return [];
    const dh = hand(); const pick = (dh && rs.filter(function (r) { return r.palm.side === dh; })[0]) || rs[0];
    return [pick.results[0]];
  });
})(typeof window !== 'undefined' ? window : this);
