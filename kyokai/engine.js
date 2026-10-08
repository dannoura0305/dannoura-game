/* ══════════════════════════════════════════════════════════════════════
   境界事象 ― 月代町観測記録 ―  エンジン（kyokai/engine.js・担当A）
   契約：docs/kyokai/README.md（これが正。以下は契約の解釈と最小限の追加）

   【契約の解釈・追加（章を書く人向け）】
   1. K.flag(name) を値なしで呼ぶと「未設定なら true にする」。既に値があればその値を返すだけ。
      値を読むだけなら K.get(name)（未設定は undefined）か K.has(name)。K.inc は数値でない値を 0 とみなす。
   2. 文中の {name} は主人公の名前に置き換わる。K.name（読み取り）/ K.setName(n) / K.state（セーブ本体）。
      はじめから で名前を入力した時点でフラグ named を立てる（章側の名前入力は K.has('named') で飛ばせる）。
   3. 話者の追加書式：x:名前@顔id|本文（KY_ART.portrait の顔を出す。例 x:坂口@resident_1|…）、
      d:表示名|本文（省略時は「画面の男性」）。t: の連続行は一つの端末画面にまとめて流れる（最後だけタップ待ち）。
      c: の連続行はコメント欄に積み上がる（1行ずつタップ）。#world A|B|C（K.setWorld と同じ）、#mainui ms も使える。
   4. #scene id [世界] は「表示する場面と世界」だけを変える（K.world は変えない）。
   5. 章の順番：id が ch<数字> のものを数字順に自動で流す。side / endings などは自動では流れない。
      K.run(id) で登録済みスクリプトをその場で実行できる（その中の K.step も再開に対応）。
      K.step の戻り値は保存され、再開時に飛ばした step も同じ値を返す（JSON にできる値のみ）。
   6. 探索の追加：spot.ev = {photo:'証拠id', record:'…', scan:'…', look:'…', talk:'…'} を置くと、その行動の後に自動で K.gain
      （photo は撮った写真をその証拠の絵として保存）。spot.scan = {mag, temp, bnd, text} でスキャン値を上書き。
      場所の世界ごとに on:{look|photo|record|scan:async K=>{}} を置くと「何も選ばずに行動」したときに使われる。
      explore の追加オプション：start:'場所id'（その場所から始める）。
   7. 消耗品は 0 から始まる（章が K.item で配る）。研究所（id が center_ で始まる場所）に入ると
      電力 12・懐中電灯 6 まで補充、医療用品・安定剤は 1 つ未満なら 1 に。K.item(id) は数を返す。
   8. K.carry(item)：同期Lv4 以上なら true（フラグ carry_<item> に持ち込んだ世界を記録）、未満なら false。
   9. K.chase(def)：def = {id, intro:[lines], rounds:[{text, ok:'run'|'hide'|'repel'|[...] }], time:秒}。
      戻り値 true＝無傷で逃げ切った。失敗しても安定度が減るだけで先へ進む。
  10. K.spot(def) の追加：la / lb（左右の見出し）、ev（全部見つけたら得る証拠）。aw≠bw のとき見つけた差分は手帳「世界差分」へ。
      KY_ART.draw の opts に {side:'a'|'b', spot:def.id} を渡す（昨日/今日の描き分け用）。
  11. K.deduce(def) の追加：who（指摘する研究員の話者。既定 'y'）。正解すると手帳「仮説」に deduce_<id> を記録。
      必要な証拠を持っていないまま 2 回外すと、研究員が「これも関係あるんじゃないか」と渡してくれる（詰み防止）。
  12. 場面キャンバスは 16:9（KY_ART の絵と同じ比率。ホットスポット・違和感探しの座標は 16:9 の絵に対する 0..1 がそのまま合う）。
      KY_ART.draw(ctx, sceneId, world, t秒, opts) の ctx は端末ピクセルのまま（変換なし）。
      opts = {w, h, stab, danger, side, spot, thumb}。portrait(ctx, who, face, w, h) も端末ピクセル。
  13. 手動セーブは localStorage['kyokai_save_v1_manual']。セーブには契約の項目に加えて
      baseWorld / steps / seen / photos / chTitle / sceneWorld / noteN / savedAt を持つ。
  14. スタッフロールは KY.CREDITS（行の配列）、ポストクレジットは KY.POSTCREDIT（async K=>{} か行の配列）で差し替え可。
  15. kyokai.html?demo=1 のときだけ kyokai/story/_demo.js（動作確認用の章）を読む。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY = root.KY || {};
  KY.EVIDENCE = KY.EVIDENCE || {};
  KY.AREAS = KY.AREAS || {};
  KY.VERSION = '1.0.0';

  /* ───────── 章の登録先 ───────── */
  const STORY = root.KY_STORY = root.KY_STORY || {};
  STORY.list = STORY.list || {};
  STORY.order = STORY.order || [];
  STORY.register = function (id, fn, opts) {
    if (!id || typeof fn !== 'function') { console.warn('[KY] register: 不正な章', id); return; }
    STORY.list[id] = { fn, opts: opts || {} };
    if (STORY.order.indexOf(id) < 0) STORY.order.push(id);
  };
  STORY.get = id => STORY.list[id] || null;

  const HAS_DOM = typeof document !== 'undefined' && !!document.createElement && !root.__KY_HEADLESS;
  KY.HAS_DOM = HAS_DOM;
  const LS = (() => { try { return root.localStorage || null; } catch (e) { return null; } })();
  const lsGet = k => { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (!LS) return false; LS.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = k => { try { LS && LS.removeItem(k); } catch (e) {} };
  const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const KEY = 'kyokai_save_v1', KEY_M = 'kyokai_save_v1_manual', KEY_SET = 'kyokai_settings', KEY_END = 'kyokai_endings', KEY_TRUE = 'kyokai_true_end';
  KY.KEYS = { auto: KEY, manual: KEY_M, settings: KEY_SET, endings: KEY_END, trueEnd: KEY_TRUE };
  const NAME_DEF = '朝霧';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (root.performance && performance.now) ? performance.now() : Date.now();
  KY._clamp = clamp;

  /* ───────── 状態 ───────── */
  function fresh(name) {
    return {
      version: 1, name: name || NAME_DEF, chapter: null, scene: null, flags: {}, evidence: [], board: {}, notebook: {},
      items: { battery: 0, light: 0, med: 0, stab: 0 }, equip: [], sync: 0, stability: 100, world: 'A',
      areas: { unlocked: [], visited: [] }, endings: [], playtime: 0,
      baseWorld: 'A', steps: {}, seen: {}, photos: {}, chTitle: '', sceneWorld: 'A', noteN: 0, savedAt: 0,
    };
  }
  let S = fresh();
  KY._fresh = fresh;
  KY._setState = s => { S = s; };
  Object.defineProperty(KY, 'state', { get: () => S, configurable: true });
  Object.defineProperty(KY, 'S', { get: () => S, configurable: true });
  Object.defineProperty(KY, 'name', { get: () => S.name, configurable: true });
  Object.defineProperty(KY, 'world', { get: () => S.world, set: w => KY.setWorld(w), configurable: true });

  /* ───────── 設定 ───────── */
  const SET = KY.settings = Object.assign({ vol: 70, speed: 'normal', calm: false }, parse(lsGet(KEY_SET)) || {});
  KY.saveSettings = () => lsSet(KEY_SET, JSON.stringify(SET));
  const SPEED = { slow: 22, normal: 40, fast: 85, instant: 0 };
  KY.reduced = () => !!SET.calm || !!(HAS_DOM && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ───────── 進行の世代（タイトルへ戻ったら古い章の続きは止める） ───────── */
  const G = KY._G = { gen: 0, pending: new Set(), K: null, script: null, q: [], log: [], faces: {}, running: false, t0: 0, menuOK: false, lastSe: {}, only: null };
  const ABORT = KY.ABORT = Object.freeze({ kyAbort: true, toString() { return 'KY_ABORT'; } });
  const RESET = KY._reset = [];
  function pend(fn) {
    const gen = G.gen;
    return new Promise((res, rej) => {
      const rec = { rej };
      G.pending.add(rec);
      const done = v => { if (!G.pending.has(rec)) return; G.pending.delete(rec); if (gen === G.gen) res(v); };
      try { fn(done); } catch (e) { G.pending.delete(rec); rej(e); }
    });
  }
  KY._pend = pend;
  function abortAll() {
    G.gen++;
    const p = Array.from(G.pending); G.pending.clear();
    p.forEach(r => { try { r.rej(ABORT); } catch (e) {} });
    G.q.length = 0; G.running = false; G.menuOK = false;
    RESET.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  }
  KY._abort = abortAll;
  if (root.addEventListener) root.addEventListener('unhandledrejection', e => { if (e && e.reason === ABORT) e.preventDefault(); });
  function bindK(gen) {
    return new Proxy(KY, {
      get(t, p) {
        const v = Reflect.get(t, p);
        if (typeof v !== 'function') return v;
        return function () { if (gen !== G.gen) throw ABORT; return v.apply(KY, arguments); };
      },
    });
  }
  KY._bindK = bindK;
  KY.wait = ms => pend(done => setTimeout(done, Math.max(0, +ms || 0)));
  // 安定度の演出など「次の区切りで見せる」もの
  KY._queue = fn => { G.q.push(fn); };
  async function flushQ() { while (G.q.length) { const f = G.q.shift(); try { await f(G.K || KY); } catch (e) { if (e === ABORT) throw e; console.error(e); } } }
  KY._flush = flushQ;

  /* ───────── フラグ ───────── */
  KY.flag = function (name, val) {
    if (arguments.length >= 2) { S.flags[name] = val; return val; }
    if (S.flags[name] === undefined) S.flags[name] = true;
    return S.flags[name];
  };
  KY.get = name => S.flags[name];
  KY.has = name => !!S.flags[name];
  KY.unflag = name => { delete S.flags[name]; };
  KY.inc = function (name, n) {
    const c = typeof S.flags[name] === 'number' ? S.flags[name] : 0;
    S.flags[name] = c + (n == null ? 1 : (+n || 0));
    return S.flags[name];
  };
  KY.setName = n => { const v = Array.from(String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim()).slice(0, 12).join(''); S.name = v || NAME_DEF; return S.name; };

  /* ───────── 証拠・手帳 ───────── */
  const EV_TYPE = KY.EV_TYPE = { photo: '写真', testimony: '証言', audio: '音声', map: '地図', video: '映像', log: 'ログ', item: '物品', person: '人物', article: '記事' };
  KY.ev = id => KY.EVIDENCE[id] || { title: String(id), type: 'log', desc: '', world: null, art: null, ch: null, _missing: true };
  KY.gain = function (id) {
    if (!id) return false;
    if (S.evidence.indexOf(id) >= 0) return false;
    S.evidence.push(id);
    if (!KY.EVIDENCE[id]) console.warn('[KY] 未定義の証拠 id:', id);
    // 撮影中に得た写真の証拠は、撮った場面をそのまま絵として残す
    if (KY._photoCtx && KY.ev(id).type === 'photo' && !S.photos[id]) S.photos[id] = KY._photoCtx;
    UI.gainFx(id);
    KY.se('gain');
    return true;
  };
  KY.got = id => S.evidence.indexOf(id) >= 0;
  const NOTE_CATS = KY.NOTE_CATS = { case: '未解決事件', hypo: '仮説', person: '人物', place: '場所', term: '用語', diff: '世界差分', creature: '境界生物', b30: 'B-30', '444': 'USER_444' };
  const UNSOLVED_DEF = { case: 1, hypo: 1, b30: 1, '444': 1, creature: 1 };
  KY.solved = (cat, e) => e ? (e.solved != null ? !!e.solved : !UNSOLVED_DEF[cat]) : false;
  KY.note = function (cat, id, o) {
    if (!cat || id == null) return null;
    o = o || {};
    const c = S.notebook[cat] || (S.notebook[cat] = {});
    const prev = c[id];
    const e = Object.assign({}, prev || {}, o);
    if (!prev) e.n = (S.noteN = (S.noteN || 0) + 1);
    c[id] = e;
    if (!prev) UI.toast('手帳に記録：' + (e.title || id), 'note');
    else if (prev.solved !== e.solved && e.solved) UI.toast('手帳：「' + (e.title || id) + '」が解けた', 'note');
    return e;
  };

  /* ───────── 会話 ───────── */
  const WHO = KY.WHO = {
    n: { name: '' }, p: { name: () => S.name }, y: { name: '如月ユウ', face: 'yuu' }, m: { name: '御堂', face: 'mido' },
    g: { name: 'ナギ', face: 'nagi' }, k: { name: '九条シン', face: 'kujo' }, s: { name: 'シロ', face: 'shiro' },
    d: { name: '画面の男性' }, c: { name: '' }, t: { name: '' }, x: { name: '' },
  };
  const tok = s => String(s == null ? '' : s).replace(/\{name\}/g, S.name);
  function driftCall(text) {
    // 安定度50未満：周りの呼び方がずれる
    if (S.stability >= 50) return text;
    let t = text.split(S.name + 'さん').join('主任');
    t = t.replace(/新人/g, '主任');
    return t;
  }
  function parseLine(s) {
    const m = /^([npymgksdctx]):([\s\S]*)$/.exec(s);
    let who = 'n', body = s;
    if (m) { who = m[1]; body = m[2]; }
    let name = WHO[who].name; if (typeof name === 'function') name = name();
    let face = WHO[who].face || null;
    if (who === 'c' || who === 'x' || who === 'd') {
      const i = body.indexOf('|');
      if (i >= 0 && (who !== 'd' || i <= 16)) { name = body.slice(0, i); body = body.slice(i + 1); }
      else if (who === 'x') name = '？？？';
    }
    if (who === 'x' && name.indexOf('@') > 0) { const j = name.indexOf('@'); face = name.slice(j + 1).trim(); name = name.slice(0, j); }
    body = tok(body); name = tok(name);
    if ('ymgkx'.indexOf(who) >= 0) body = driftCall(body);
    return { who, name, text: body, face, expr: G.faces[who] || 'normal' };
  }
  KY._parseLine = parseLine;
  function pushLog(L) { G.log.push({ who: L.who, name: L.name, text: L.text }); if (G.log.length > 240) G.log.splice(0, G.log.length - 240); }
  KY.backlog = () => G.log.slice();
  async function cmd(s) {
    const a = s.slice(1).trim().split(/\s+/); const c = (a[0] || '').toLowerCase();
    switch (c) {
      case 'scene': KY.scene(a[1], a[2]); break;
      case 'fx': await KY.fx(a[1]); break;
      case 'se': KY.se(a[1]); break;
      case 'amb': KY.amb(a.slice(1).join(' ') || 'off'); break;
      case 'wait': await KY.wait(+a[1] || 500); break;
      case 'face': if (a[1]) G.faces[a[1]] = a[2] || 'normal'; break;
      case 'mainui': await KY.mainUI(+a[1] || 1500); break;
      case 'world': if (KY.setWorld) KY.setWorld(a[1]); break;
      default: console.warn('[KY] 不明な演出コマンド', s);
    }
  }
  function nextLine(lines, i) { for (let j = i + 1; j < lines.length; j++) { const s = lines[j]; if (s == null || s === '') continue; if (String(s)[0] === '#') continue; return String(s); } return null; }
  KY.say = async function (lines) {
    if (lines == null) return;
    if (!Array.isArray(lines)) lines = [lines];
    await flushQ();
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw == null || raw === '') continue;
      const s = String(raw);
      if (s[0] === '#') { await cmd(s); continue; }
      const L = parseLine(s);
      const nx = nextLine(lines, i);
      L.more = L.who === 't' && !!nx && /^t:/.test(nx);
      pushLog(L);
      await UI.line(L);
    }
    UI.sayEnd();
  };
  KY.choice = async function (q, opts) {
    await flushQ();
    const list = (Array.isArray(opts) ? opts : []).map(o => typeof o === 'string' ? { t: o } : o).filter(o => o && o.if !== false);
    if (!list.length) return undefined;
    const i = await UI.choice(tok(q || ''), list.map(o => ({ t: tok(o.t), s: o.s ? tok(o.s) : '' })));
    const o = list[clamp(i | 0, 0, list.length - 1)];
    G.log.push({ who: 'sys', name: '', text: '▶ ' + tok(o.t) });
    return o.v !== undefined ? o.v : list.indexOf(o);
  };
  KY.input = async function (q, def, max) {
    await flushQ();
    max = clamp(max | 0 || 8, 1, 40);
    const d = def == null ? '' : String(def);
    const v = await UI.input(tok(q || ''), d, max);
    const t = Array.from(String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, '').trim()).slice(0, max).join('');
    return t || d;
  };
  KY.title = async function (t, sub) {
    S.chTitle = [t, sub].filter(Boolean).join('　');
    UI.hud();
    autosave();
    await UI.title(tok(t || ''), tok(sub || ''));
  };
  KY.scene = function (id, world) {
    S.scene = id || null; S.sceneWorld = world || S.world;
    UI.stage(S.scene, S.sceneWorld);
  };
  KY.face = (who, f) => { G.faces[who] = f || 'normal'; };

  /* ───────── 進行 ───────── */
  function chapterIds() {
    if (G.only) return G.only.filter(id => STORY.list[id]);
    return STORY.order.filter(id => /^ch\d+$/.test(id)).sort((a, b) => (+a.slice(2)) - (+b.slice(2)));
  }
  KY.chapters = chapterIds;
  KY.step = async function (id, fn) {
    const key = (S.chapter || '') + ':' + (G.script || '') + '/' + id;
    if (Object.prototype.hasOwnProperty.call(S.steps, key)) return S.steps[key].v;
    const v = await fn();
    let keep = null;
    try { keep = v === undefined ? null : JSON.parse(JSON.stringify(v)); } catch (e) { keep = null; }
    S.steps[key] = { v: keep };
    autosave();
    return v;
  };
  KY.run = async function (id) {
    const s = STORY.list[id];
    if (!s) { console.warn('[KY] run: 未登録', id); return undefined; }
    const prev = G.script; G.script = id;
    try { return await s.fn(G.K || KY); } finally { G.script = prev; }
  };
  function clearSteps(ch) { const p = ch + ':'; Object.keys(S.steps).forEach(k => { if (k.indexOf(p) === 0) delete S.steps[k]; }); }
  async function runFrom(chId) {
    abortAll();
    const gen = G.gen;
    const K = G.K = bindK(gen);
    G.running = true; G.menuOK = true; G.t0 = Date.now();
    UI.game(true);
    const ids = chapterIds();
    if (!ids.length) {
      G.running = false;
      await UI.notice('観測記録（章データ）が見つかりません。', 'kyokai/story/ にファイルがあるか確認してください。');
      return KY.toTitle();
    }
    let i = Math.max(0, ids.indexOf(chId));
    try {
      for (; i < ids.length; i++) {
        const id = ids[i];
        if (S.chapter !== id) { S.chapter = id; }
        G.script = id;
        autosave();
        await STORY.list[id].fn(K);
        if (gen !== G.gen) return;
        clearSteps(id);
        if (i + 1 < ids.length) { S.chapter = ids[i + 1]; autosave(); }
      }
      if (gen !== G.gen) return;
      S.flags.__complete = true; autosave();
      abortAll();
      KY.toTitle();
    } catch (e) {
      if (e === ABORT || gen !== G.gen) return;
      console.error('[KY] 章の実行中にエラー', e);
      UI.crash(e);
    }
  }
  KY._runFrom = runFrom;
  KY.newGame = async function (name) {
    S = fresh(name);
    S.flags.named = true;
    G.log.length = 0; G.faces = {};
    const ids = chapterIds();
    return runFrom(ids[0]);
  };
  KY.continueGame = function (manual) {
    const s = KY.loadSave(manual);
    if (!s) return false;
    S = s; G.log.length = 0; G.faces = {};
    if (manual) lsSet(KEY, JSON.stringify(S));
    runFrom(S.chapter);
    return true;
  };
  KY.toTitle = function () { abortAll(); KY.amb('off'); UI.showTitle(); };

  /* ───────── セーブ ───────── */
  function addPlay() { if (G.t0) { const t = Date.now(); S.playtime = (S.playtime || 0) + (t - G.t0) / 1000; G.t0 = t; } }
  function snapshot() { addPlay(); S.savedAt = Date.now(); return JSON.stringify(S); }
  function autosave() { if (!G.running) return false; return lsSet(KEY, snapshot()); }
  KY.autosave = autosave;
  KY.save = manual => lsSet(manual ? KEY_M : KEY, snapshot());
  function validate(o) {
    if (!o || typeof o !== 'object' || o.version !== 1) return null;
    const f = fresh(typeof o.name === 'string' && o.name ? o.name : NAME_DEF);
    Object.keys(f).forEach(k => {
      const v = o[k], d = f[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(d)) { if (Array.isArray(v)) f[k] = v.slice(); return; }
      if (d === null) { if (typeof v === 'string') f[k] = v; return; }
      if (typeof d === 'object') { if (typeof v === 'object' && !Array.isArray(v)) f[k] = Object.assign(d, v); return; }
      if (typeof v === typeof d) f[k] = v;
    });
    if (typeof o.chapter === 'string') f.chapter = o.chapter;
    if (typeof o.scene === 'string') f.scene = o.scene;
    if (!Array.isArray(f.areas.unlocked)) f.areas.unlocked = [];
    if (!Array.isArray(f.areas.visited)) f.areas.visited = [];
    f.stability = clamp(+f.stability || 0, 0, 100);
    f.sync = clamp(f.sync | 0, 0, 5);
    if ('ABC'.indexOf(f.world) < 0 || f.world.length !== 1) f.world = 'A';
    if ('ABC'.indexOf(f.baseWorld) < 0 || f.baseWorld.length !== 1) f.baseWorld = 'A';
    f.evidence = f.evidence.filter((v, i, a) => typeof v === 'string' && a.indexOf(v) === i);
    return f;
  }
  KY._validate = validate;
  KY.loadSave = manual => validate(parse(lsGet(manual ? KEY_M : KEY)));
  KY.saveInfo = manual => { const s = KY.loadSave(manual); return s ? { name: s.name, ch: s.chTitle || s.chapter || '', at: s.savedAt, play: s.playtime } : null; };
  KY.deleteSave = () => { lsDel(KEY); lsDel(KEY_M); };
  KY.endingsSeen = () => { const a = parse(lsGet(KEY_END)); return Array.isArray(a) ? a : []; };
  const fmtPlay = sec => { sec = Math.floor(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return h + '時間' + String(m).padStart(2, '0') + '分'; };
  const fmtDate = t => { if (!t) return ''; const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  KY._fmtPlay = fmtPlay;

  /* ───────── エンディング ───────── */
  const END_NAME = KY.END_NAME = { A: '帰還', B: '置換', C: '観測者', TRUE: '境界' };
  KY.ending = async function (id) {
    id = String(id || 'A').toUpperCase();
    const list = KY.endingsSeen(); if (list.indexOf(id) < 0) list.push(id);
    lsSet(KEY_END, JSON.stringify(list));
    if (S.endings.indexOf(id) < 0) S.endings.push(id);
    if (id === 'TRUE') lsSet(KEY_TRUE, '1');
    autosave();
    G.menuOK = false;
    UI.hideGameUI();
    await UI.endCard(id);
    if (id === 'TRUE') {
      await KY.staffRoll();
      const pc = KY.POSTCREDIT;
      if (typeof pc === 'function') await pc(G.K || KY);
      else if (Array.isArray(pc)) await UI.postCredit(pc);
      else await UI.postCredit(null);
    }
    abortAll();
    KY.amb('off');
    UI.showTitle();
    throw ABORT;
  };
  function defaultCredits() {
    return ['境界事象', '― 月代町観測記録 ―', '', '[観測員]', S.name, '', '[先輩観測員]', '如月ユウ', '', '[室長]', '御堂', '',
      '[月代駅の少女]', 'ナギ', '', '[境界生物]', 'シロ', '', '[観測者]', '九条シン', '', '[深夜配信の男性]', '――', '',
      '[444番目の観測者]', '？？？', '', '[月代町のみなさん]', '商店街・住宅街・神社・小学校のみなさん', '',
      '[原作]', '『だんのうら ― 深夜、繋がりの海へ』', '', '[観測協力]', 'あなた', '', '', 'Thank you for observing.'];
  }
  KY.staffRoll = async function (lines) {
    const L = (Array.isArray(lines) && lines) || (Array.isArray(KY.CREDITS) && KY.CREDITS) || defaultCredits();
    KY.amb('off');
    await UI.staffRoll(L.map(tok));
  };

  /* ═════════════════════════ 音（WebAudio 合成のみ） ═════════════════════════ */
  const AU = KY._au = { ctx: null, out: null, rev: null, ok: false, noise: null, ambWant: [], amb: {}, layer: {}, clips: [] };
  function auInit() {
    if (AU.ok) return true;
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return false;
      const c = AU.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      AU.out = c.createGain(); AU.out.gain.value = (SET.vol / 100) * 0.9;
      AU.out.connect(comp); comp.connect(c.destination);
      // 残響（生成したインパルス）
      const len = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      AU.rev = c.createConvolver(); AU.rev.buffer = ir;
      const rg = c.createGain(); rg.gain.value = 0.55; AU.rev.connect(rg); rg.connect(AU.out);
      const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      AU.noise = nb;
      AU.ok = true;
      return true;
    } catch (e) { return false; }
  }
  function auUnlock() {
    if (!AU.ok && !auInit()) return;
    try { if (AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) {}
    if (AU.ambWant) { const w = AU.ambWant; AU.ambWant = null; ambSet(w); }
  }
  if (HAS_DOM) {
    ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, auUnlock, { capture: true, passive: true }));
  }
  KY.setVolume = v => { SET.vol = clamp(v | 0, 0, 100); KY.saveSettings(); if (AU.out) AU.out.gain.setTargetAtTime((SET.vol / 100) * 0.9, AU.ctx.currentTime, 0.05); };
  const T = () => AU.ctx.currentTime;
  function gainNode(v, dest) { const g = AU.ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  function filt(type, f, q, dest) { const b = AU.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (dest) b.connect(dest); return b; }
  function noiseSrc(loop) { const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; s.loop = !!loop; s.loopStart = Math.random(); return s; }
  function envTone(f, t, dur, o) {
    o = o || {};
    const c = AU.ctx, os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.2 : o.vol, a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(o.dest || AU.out); os.start(t); os.stop(t + dur + 0.05);
    return g;
  }
  function envNoise(t, dur, o) {
    o = o || {};
    const c = AU.ctx, s = noiseSrc(false), f = c.createBiquadFilter(), g = c.createGain();
    f.type = o.type || 'bandpass'; f.frequency.value = o.f || 1200; f.Q.value = o.q == null ? 1 : o.q;
    const v = o.vol == null ? 0.2 : o.vol, a = o.a || 0.003;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.dest || AU.out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return g;
  }
  // 月代駅の汽笛：二本の笛のずれた和音＋蒸気の息＋谷のこだま。dist 0（近い）〜1（とても遠い）
  function whistle(dist, t, vol) {
    const c = AU.ctx; t = t || T(); dist = clamp(dist == null ? 0.4 : dist, 0, 1);
    const bus = gainNode((vol == null ? 0.32 : vol) * (1 - dist * 0.45));
    const lp = filt('lowpass', 3400 - dist * 2300, 0.5);
    bus.connect(lp);
    const dry = gainNode(1 - dist * 0.55, AU.out), wet = gainNode(0.35 + dist * 0.5, AU.rev);
    lp.connect(dry); lp.connect(wet);
    const dl = c.createDelay(2); dl.delayTime.value = 0.38 + dist * 0.2; const fb = gainNode(0.26); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(gainNode(0.45, AU.out));
    const notes = [[440, 1], [523.3, 0.55], [622.3, 0.32]];
    const blow = (t0, len) => {
      notes.forEach(([f, gv], i) => {
        const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), pf = filt('lowpass', f * 3.2, 0.7);
        o1.type = 'sawtooth'; o2.type = 'sine';
        [o1, o2].forEach(o => { o.frequency.setValueAtTime(f * 0.93, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.22); o.frequency.setValueAtTime(f, t0 + len - 0.25); o.frequency.exponentialRampToValueAtTime(f * 0.965, t0 + len + 0.5); });
        o2.detune.value = 6 + i * 3;
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2 + i * 0.4; lg.gain.value = f * 0.0045; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.16 * gv, t0 + 0.16); g.gain.setValueAtTime(0.16 * gv, t0 + len - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.85);
        const m2 = gainNode(0.7); o1.connect(pf); pf.connect(g); o2.connect(m2); m2.connect(g); g.connect(bus);
        [o1, o2, lfo].forEach(o => { o.start(t0); o.stop(t0 + len + 1); });
        // 息（蒸気）
        const n = noiseSrc(true), nf = filt('bandpass', f, 7), ng = c.createGain();
        ng.gain.setValueAtTime(0.0001, t0); ng.gain.linearRampToValueAtTime(0.5 * gv, t0 + 0.06); ng.gain.setValueAtTime(0.32 * gv, t0 + len - 0.1); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.6);
        n.connect(nf); nf.connect(ng); ng.connect(bus); n.start(t0); n.stop(t0 + len + 0.7);
      });
      const h = noiseSrc(true), hf = filt('highpass', 2500, 0.5), hg = c.createGain();
      hg.gain.setValueAtTime(0.0001, t0); hg.gain.linearRampToValueAtTime(0.05, t0 + 0.04); hg.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.3);
      h.connect(hf); hf.connect(hg); hg.connect(bus); h.start(t0); h.stop(t0 + len + 0.4);
    };
    blow(t, 0.42);
    blow(t + 0.78, 2.5);
    return 4.6;
  }
  function tick(t, hi, vol, dest) { envNoise(t, 0.035, { f: hi ? 3600 : 2600, q: 9, vol: vol == null ? 0.22 : vol, dest }); envTone(hi ? 2100 : 1700, t, 0.03, { vol: (vol == null ? 0.22 : vol) * 0.25, dest }); }
  function step1(t, vol, dest) { envNoise(t, 0.12, { type: 'lowpass', f: 380, q: 0.7, vol: vol || 0.35, dest }); envNoise(t + 0.01, 0.05, { f: 1800, q: 2, vol: (vol || 0.35) * 0.25, dest }); }
  const VOWELS = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840]];
  function murmur(t, len, vol, dest) {
    const c = AU.ctx; let x = t; const end = t + len;
    const base = 110 + Math.random() * 90;
    while (x < end) {
      const syl = 0.09 + Math.random() * 0.16, v = VOWELS[(Math.random() * VOWELS.length) | 0];
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.25), x);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, x); g.gain.linearRampToValueAtTime(vol || 0.05, x + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, x + syl);
      const f1 = filt('bandpass', v[0], 6), f2 = filt('bandpass', v[1], 8), mix = gainNode(1);
      o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(gainNode(0.6, mix)); mix.connect(g); g.connect(dest || AU.out);
      o.start(x); o.stop(x + syl + 0.05);
      x += syl + (Math.random() < 0.2 ? 0.25 : 0.03);
    }
  }
  function staticBurst(t, dur, vol, dest) {
    const c = AU.ctx, s = noiseSrc(true), f = filt('bandpass', 1500, 0.6), g = c.createGain(), am = c.createOscillator(), ag = c.createGain();
    am.frequency.value = 23; ag.gain.value = 0.5; am.connect(ag); ag.connect(g.gain);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.setValueAtTime(vol || 0.2, t + dur - 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || AU.out); s.start(t); s.stop(t + dur + 0.1); am.start(t); am.stop(t + dur + 0.1);
  }
  const SE = {
    whistle: () => whistle(0.35),
    whistle_far: () => whistle(0.9, null, 0.3),
    static: () => staticBurst(T(), 0.7, 0.18),
    clock: () => { const t = T(); for (let i = 0; i < 4; i++) tick(t + i, i % 2 === 0, 0.25); },
    wire: () => { const t = T(), g = gainNode(0.0001, AU.out); g.gain.linearRampToValueAtTime(0.12, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + 2.6); [50, 100, 150, 250].forEach((f, i) => envTone(f, t, 2.6, { vol: 0.6 / (i + 1), dest: g, a: 0.5 })); envNoise(t, 2.4, { f: 2400, q: 3, vol: 0.04, a: 0.6 }); },
    steps: () => { const t = T(); for (let i = 0; i < 5; i++) step1(t + i * 0.48, 0.3 - i * 0.03); },
    voice: () => murmur(T(), 1.8, 0.05),
    beep: () => envTone(1000, T(), 0.09, { vol: 0.12 }),
    shutter: () => { const t = T(); envNoise(t, 0.04, { f: 4000, q: 1, vol: 0.35 }); envNoise(t + 0.07, 0.05, { f: 2500, q: 1, vol: 0.25 }); envTone(180, t + 0.01, 0.05, { vol: 0.15, type: 'square' }); },
    rec: () => { const t = T(); envTone(880, t, 0.08, { vol: 0.1 }); envTone(1320, t + 0.12, 0.1, { vol: 0.1 }); },
    tap: () => envTone(1400, T(), 0.03, { vol: 0.035 }),
    gain: () => { const t = T(); envTone(988, t, 0.12, { vol: 0.08 }); envTone(1319, t + 0.09, 0.22, { vol: 0.07 }); },
    note: () => { const t = T(); envTone(784, t, 0.1, { vol: 0.05 }); },
    switch: () => { const t = T(); envNoise(t, 0.25, { f: 900, q: 4, vol: 0.12 }); envTone(220, t, 0.4, { vol: 0.05, to: 330 }); },
    error: () => { const t = T(); envTone(220, t, 0.12, { vol: 0.08, type: 'square' }); },
    scan: () => { const t = T(); envTone(600, t, 0.9, { vol: 0.05, to: 1800 }); envNoise(t, 0.9, { f: 3000, q: 8, vol: 0.03 }); },
    heart: () => { const t = T(); envTone(60, t, 0.18, { vol: 0.4 }); envTone(55, t + 0.22, 0.2, { vol: 0.3 }); },
    chime: () => { const t = T(); envTone(659, t, 1.2, { vol: 0.08 }); envTone(523, t + 0.6, 1.4, { vol: 0.08 }); },
    stream: () => { const t = T(); envTone(523, t, 0.15, { vol: 0.07 }); envTone(784, t + 0.12, 0.15, { vol: 0.07 }); envTone(1047, t + 0.24, 0.3, { vol: 0.07 }); },
  };
  KY.se = function (name) {
    if (!name || !AU.ok) return;
    const t = now();
    if ((name === 'shutter' || name === 'rec') && G.lastSe[name] && t - G.lastSe[name] < 1500) return; // 撮影・録音の演出と章の #se が重なったら一回だけ
    G.lastSe[name] = t;
    const f = SE[name];
    if (!f) { console.warn('[KY] 不明な効果音', name); return; }
    try { f(); } catch (e) {}
  };
  KY._seNames = Object.keys(SE);
  /* 環境音：鳴らし続けるもの。{stop()} を返す */
  function loopGain(v) { const g = AU.ctx.createGain(); g.gain.setValueAtTime(0.0001, T()); g.gain.linearRampToValueAtTime(v, T() + 1.6); g.connect(AU.out); return g; }
  function every(fn, min, max) { let id = 0, alive = true; const go = () => { if (!alive) return; try { fn(); } catch (e) {} id = setTimeout(go, (min + Math.random() * (max - min)) * 1000); }; id = setTimeout(go, (min * 0.3 + Math.random() * min * 0.5) * 1000); return () => { alive = false; clearTimeout(id); }; }
  function hold(nodes) { return nodes.filter(Boolean); }
  const AMB = {
    clock: () => { const g = loopGain(1); let i = 0; const stop = every(() => tick(T() + 0.02, (i++) % 2 === 0, 0.13, g), 1, 1); return { g, stops: [stop] }; },
    wire: () => {
      const g = loopGain(0.07), lfo = AU.ctx.createOscillator(), lg = gainNode(0.03); lfo.frequency.value = 0.13; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      const os = [50, 100, 150, 200, 250].map((f, i) => { const o = AU.ctx.createOscillator(); o.frequency.value = f + (i ? Math.random() * 0.6 : 0); const og = gainNode(0.5 / (i + 1), g); o.connect(og); o.start(); return o; });
      const n = noiseSrc(true), nf = filt('bandpass', 2600, 4), ng = gainNode(0.06, g); n.connect(nf); nf.connect(ng); n.start();
      return { g, srcs: os.concat([lfo, n]) };
    },
    whistle_far: () => { const g = loopGain(1); const stop = every(() => whistle(0.92, null, 0.22), 24, 44); return { g, stops: [stop] }; },
    radio: () => {
      const g = loopGain(0.08), n = noiseSrc(true), f = filt('bandpass', 1200, 1.4), lfo = AU.ctx.createOscillator(), lg = gainNode(700);
      lfo.frequency.value = 0.07; lfo.connect(lg); lg.connect(f.frequency); n.connect(f); f.connect(g); n.start(); lfo.start();
      const s1 = every(() => { const t = T(); for (let i = 0; i < 3; i++) envTone(700 + Math.random() * 900, t + i * 0.18, 0.12, { vol: 0.025, type: 'square' }); }, 5, 11);
      const s2 = every(() => envNoise(T(), 0.03, { f: 3000, q: 1, vol: 0.06 }), 0.4, 1.8);
      return { g, srcs: [n, lfo], stops: [s1, s2] };
    },
    steps: () => { const g = loopGain(1); const stop = every(() => { const t = T(), k = 3 + ((Math.random() * 4) | 0); for (let i = 0; i < k; i++) step1(t + i * 0.52, 0.1, g); }, 7, 15); return { g, stops: [stop] }; },
    voices: () => { const g = loopGain(1), lp = filt('lowpass', 1400, 0.5, g); const stop = every(() => murmur(T(), 1 + Math.random() * 2, 0.03, lp), 0.8, 2.4); return { g, stops: [stop] }; },
    rain: () => {
      const g = loopGain(0.16), n = noiseSrc(true), lp = filt('lowpass', 5200, 0.4), hp = filt('highpass', 380, 0.5);
      n.connect(hp); hp.connect(lp); lp.connect(g); n.start();
      const stop = every(() => envNoise(T(), 0.02, { f: 2400 + Math.random() * 3000, q: 6, vol: 0.05 }), 0.05, 0.25);
      return { g, srcs: [n], stops: [stop] };
    },
    station: () => {
      const g = loopGain(1), lp = filt('lowpass', 1600, 0.5, g), rv = gainNode(0.6, AU.rev); lp.connect(rv);
      const s1 = every(() => murmur(T(), 1.5 + Math.random() * 2, 0.025, lp), 0.5, 1.6);
      const s2 = every(() => SE.chime(), 30, 55);
      const s3 = every(() => { const t = T(); for (let i = 0; i < 4; i++) step1(t + i * 0.45, 0.07, g); }, 4, 9);
      const s4 = every(() => whistle(0.75, null, 0.2), 40, 70);
      return { g, stops: [s1, s2, s3, s4] };
    },
    factory: () => {
      const g = loopGain(0.6), o = AU.ctx.createOscillator(), lp = filt('lowpass', 180, 1, g); o.type = 'sawtooth'; o.frequency.value = 55; o.connect(lp); o.start();
      const n = noiseSrc(true), nf = filt('highpass', 3000, 0.5), ng = gainNode(0.03, g); n.connect(nf); nf.connect(ng); n.start();
      const stop = every(() => { const t = T(); [820, 1270, 2110, 3020].forEach((f, i) => envTone(f, t, 0.5 - i * 0.08, { vol: 0.03, dest: g })); }, 1.1, 2.2);
      return { g, srcs: [o, n], stops: [stop] };
    },
    room: () => {
      const g = loopGain(0.05), o = AU.ctx.createOscillator(); o.frequency.value = 60; const og = gainNode(0.5, g); o.connect(og); o.start();
      const n = noiseSrc(true), lp = filt('lowpass', 700, 0.6), ng = gainNode(0.8, g); n.connect(lp); lp.connect(ng); n.start();
      return { g, srcs: [o, n] };
    },
  };
  KY._ambNames = Object.keys(AMB);
  function ambStop(rec) {
    if (!rec) return;
    try { rec.g.gain.cancelScheduledValues(T()); rec.g.gain.setTargetAtTime(0.0001, T(), 0.4); } catch (e) {}
    (rec.stops || []).forEach(f => f());
    setTimeout(() => { (rec.srcs || []).forEach(s => { try { s.stop(); } catch (e) {} }); try { rec.g.disconnect(); } catch (e) {} }, 2200);
  }
  function ambSet(names, bucket) {
    bucket = bucket || 'amb';
    const cur = AU[bucket] || (AU[bucket] = {});
    const want = {}; names.forEach(n => { if (AMB[n]) want[n] = 1; });
    Object.keys(cur).forEach(n => { if (!want[n]) { ambStop(cur[n]); delete cur[n]; } });
    Object.keys(want).forEach(n => { if (!cur[n]) { try { cur[n] = AMB[n](); } catch (e) {} } });
  }
  KY.amb = function (spec) {
    const s = String(spec == null ? 'off' : spec).trim();
    const names = (!s || s === 'off') ? [] : s.split(/[\s,]+/).filter(Boolean);
    names.forEach(n => { if (!AMB[n]) console.warn('[KY] 不明な環境音', n); });
    G.ambNow = names;
    if (!AU.ok) { AU.ambWant = names; return; }
    ambSet(names, 'amb');
  };
  // 危険度に応じて環境音そのものを少しずつ変える（systems.js が呼ぶ）
  KY._ambLayer = function (names) { if (!AU.ok) return; ambSet(names || [], 'layer'); };
  // 証拠の音声を短く鳴らす
  KY.playClip = function (id) {
    if (!AU.ok) auUnlock();
    if (!AU.ok) return 0;
    const ev = KY.ev(id), kind = ev.sound || '';
    const t = T(), bus = gainNode(1, AU.out);
    let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    staticBurst(t, 0.25, 0.08, bus);
    if (kind === 'whistle' || /汽笛|whistle/.test(ev.title + id)) { whistle(0.55, t + 0.3, 0.3); return 4.5; }
    if (kind === 'clock' || /時計|clock/.test(ev.title)) { for (let i = 0; i < 4; i++) tick(t + 0.3 + i, i % 2 === 0, 0.2, bus); return 4.4; }
    if (kind === 'wire' || /電線|wire/.test(ev.title)) { SE.wire(); return 2.8; }
    if (kind === 'steps' || /足音/.test(ev.title)) { for (let i = 0; i < 5; i++) step1(t + 0.3 + i * 0.45, 0.25, bus); return 2.8; }
    // 声・配信・証言：ノイズ越しのささやき
    murmur(t + 0.3, 1.6 + (h % 10) / 10, 0.06, filt('bandpass', 1100, 0.7, bus));
    staticBurst(t + 2.2, 0.35, 0.06, bus);
    return 2.8;
  };

  /* ═════════════════════════ 画面（DOM） ═════════════════════════ */
  const D = KY._D = {};
  const $ = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  KY._el = $;
  function button(label, fn, cls, title) {
    const b = $('button', 'ky-btn' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    if (label instanceof Node) b.appendChild(label); else b.textContent = label;
    if (title) b.setAttribute('aria-label', title);
    b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled) return; KY.se('tap'); fn && fn(e); });
    return b;
  }
  KY._button = button;
  /* オーバーレイの積み重ね（Esc・キー操作は一番上へ） */
  const OV = KY._OV = [];
  function openOv(cls, opt) {
    opt = opt || {};
    const el = $('div', 'ky-ov ' + (cls || ''));
    el.setAttribute('role', 'dialog');
    if (opt.label) el.setAttribute('aria-label', opt.label);
    D.ovs.appendChild(el);
    const h = {
      el, key: opt.key || null, esc: opt.esc || null, prev: document.activeElement,
      close() { const i = OV.indexOf(h); if (i >= 0) OV.splice(i, 1); el.remove(); try { if (h.prev && document.contains(h.prev)) h.prev.focus({ preventScroll: true }); } catch (e) {} },
    };
    OV.push(h);
    return h;
  }
  KY._openOv = openOv;
  function focusFirst(el) { setTimeout(() => { try { const b = el.querySelector('[data-autofocus]') || el.querySelector('button:not([disabled]),input'); b && b.focus({ preventScroll: true }); } catch (e) {} }, 30); }
  KY._focusFirst = focusFirst;

  /* ── 場面キャンバス ── */
  const ST = KY._ST = { scene: null, world: 'A', last: 0, glitch: 0, flick: null, opts: {}, warned: {}, hidden: false };
  function drawPlaceholder(ctx, scene, world, t, o) {
    const w = o.w, h = o.h;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const tint = world === 'B' ? ['#15203a', '#2a2036'] : world === 'C' ? ['#100c10', '#231414'] : ['#0b1630', '#0a2230'];
    g.addColorStop(0, tint[0]); g.addColorStop(1, tint[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(95,214,230,.12)'; ctx.lineWidth = Math.max(1, w / 640);
    for (let x = 0; x <= 16; x++) { ctx.beginPath(); ctx.moveTo(x * w / 16, 0); ctx.lineTo(x * w / 16, h); ctx.stroke(); }
    for (let y = 0; y <= 12; y++) { ctx.beginPath(); ctx.moveTo(0, y * h / 12); ctx.lineTo(w, y * h / 12); ctx.stroke(); }
    ctx.fillStyle = 'rgba(217,180,90,.85)'; ctx.font = `${Math.round(h / 14)}px "Share Tech Mono", monospace`; ctx.textAlign = 'center';
    ctx.fillText(String(scene || '----'), w / 2, h / 2);
    ctx.fillStyle = 'rgba(95,214,230,.7)'; ctx.font = `${Math.round(h / 22)}px "Share Tech Mono", monospace`;
    ctx.fillText('WORLD ' + (world || 'A') + ' / 画像準備中', w / 2, h / 2 + h / 12);
    ctx.textAlign = 'start';
  }
  KY.drawScene = function (ctx, scene, world, t, o) {
    o = o || {}; o.w = o.w || ctx.canvas.width; o.h = o.h || ctx.canvas.height;
    const A = root.KY_ART;
    if (A && typeof A.draw === 'function' && scene) {
      try { ctx.save(); A.draw(ctx, scene, world || 'A', t, o); ctx.restore(); return true; }
      catch (e) { try { ctx.restore(); } catch (e2) {} if (!ST.warned[scene]) { ST.warned[scene] = 1; console.warn('[KY] KY_ART.draw 失敗', scene, e); } }
    }
    drawPlaceholder(ctx, scene, world, t, o);
    return false;
  };
  KY.drawPortrait = function (ctx, who, face, w, h, label) {
    const A = root.KY_ART;
    ctx.clearRect(0, 0, w, h);
    let has = !!(A && typeof A.portrait === 'function' && who);
    if (has && typeof A.ids === 'function') { try { has = (A.ids('portrait') || []).indexOf(who) >= 0; } catch (e) {} }
    if (has) {
      try { ctx.save(); A.portrait(ctx, who, face || 'normal', w, h); ctx.restore(); return true; } catch (e) { try { ctx.restore(); } catch (e2) {} }
    }
    ctx.fillStyle = '#0d1a33'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(95,214,230,.35)';
    ctx.beginPath(); ctx.arc(w / 2, h * 0.4, w * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.98, w * 0.36, h * 0.32, 0, Math.PI, 0); ctx.fill();
    if (label) { ctx.fillStyle = '#d9b45a'; ctx.font = `${Math.round(h / 4)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(Array.from(label)[0] || '', w / 2, h * 0.48); ctx.textAlign = 'start'; }
    return false;
  };
  function stageSize() {
    const cv = D.stage; if (!cv) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
    const W = Math.max(64, Math.round(r.width * dpr)), H = Math.max(48, Math.round(r.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  }
  function drawStage(ts) {
    const cv = D.stage; if (!cv || ST.hidden) return;
    stageSize();
    const ctx = cv.getContext('2d'), t = ts / 1000, W = cv.width, H = cv.height;
    let w = ST.world;
    if (ST.flick && ts < ST.flick.until) { if (((ts - ST.flick.t0) / 60 | 0) % 3 === 1) w = ST.flick.from; }
    else ST.flick = null;
    if (!ST.scene) { ctx.fillStyle = '#060b18'; ctx.fillRect(0, 0, W, H); }
    else KY.drawScene(ctx, ST.scene, w, t, Object.assign({ w: W, h: H, stab: S.stability, danger: ST.danger || 0 }, ST.opts));
    // ずれ（glitch / 世界切替 / 安定度低下）
    const glitchOn = ts < ST.glitch, lowStab = S.stability < 30 && G.running && Math.random() < (30 - S.stability) / 400;
    if ((glitchOn || ST.flick || lowStab) && !KY.reduced()) {
      const n = glitchOn ? 7 : 2;
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H | 0, hh = (Math.random() * H / 12 + 2) | 0, dx = ((Math.random() - 0.5) * W / (glitchOn ? 12 : 40)) | 0;
        try { ctx.drawImage(cv, 0, y, W, hh, dx, y, W, hh); } catch (e) {}
      }
      if (glitchOn) { ctx.fillStyle = 'rgba(95,214,230,.06)'; ctx.fillRect(0, (Math.random() * H) | 0, W, (H / 30) | 0); }
    }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const iv = KY.reduced() ? 120 : 50;
    if (ts - ST.last < iv) return;
    ST.last = ts;
    drawStage(ts);
    if (D.titleCv && D.titleOn) drawTitleBg(ts);
  }
  KY.stageFlicker = function (from, ms) { ST.flick = { from, t0: now(), until: now() + (ms || 260) }; };
  KY.stageOpts = o => { ST.opts = o || {}; };

  /* ── 骨組み ── */
  function mount() {
    if (D.app) return;
    const app = D.app = document.getElementById('ky-app') || document.body.appendChild($('div'));
    app.id = 'ky-app'; app.className = 'ky' + (SET.calm ? ' calm' : '');
    app.innerHTML = '';
    // HUD
    const hud = D.hud = $('header', 'ky-hud');
    const hl = $('div', 'hud-l'); D.hudCh = $('div', 'hud-ch'); D.hudLoc = $('div', 'hud-loc'); hl.append(D.hudCh, D.hudLoc);
    const hr = $('div', 'hud-r');
    D.hudWorld = $('div', 'hud-world');
    D.hudStab = $('div', 'hud-stab'); D.hudStab.innerHTML = '<span class="lb">安定度</span><i><b></b></i><span class="v">100</span>';
    D.hudBat = $('div', 'hud-bat');
    const bl = button('ログ', () => openLog(), 'hud-btn', '会話ログ');
    const bm = button('☰', () => KY.openMenu(), 'hud-btn hud-menu', 'メニュー');
    hr.append(D.hudWorld, D.hudStab, D.hudBat, bl, bm);
    hud.append(hl, hr);
    // 本体
    const main = D.main = $('main', 'ky-main');
    const sw = D.stageWrap = $('div', 'ky-stagewrap');
    D.stage = $('canvas', 'ky-stage'); D.stage.setAttribute('aria-hidden', 'true');
    D.spots = $('div', 'ky-spots');
    D.stageNote = $('div', 'ky-stagenote');
    sw.append(D.stage, D.spots, D.stageNote);
    const panel = D.panel = $('section', 'ky-panel');
    D.hist = $('div', 'ky-hist'); D.hist.setAttribute('aria-hidden', 'true');
    D.dlg = $('div', 'ky-dlg'); D.dlg.hidden = true;
    D.ex = $('div', 'ky-ex'); D.ex.hidden = true;
    panel.append(D.hist, D.dlg, D.ex);
    main.append(sw, panel);
    D.ovs = $('div', 'ky-ovs');
    D.toasts = $('div', 'ky-toasts'); D.toasts.setAttribute('role', 'status'); D.toasts.setAttribute('aria-live', 'polite');
    D.fx = $('div', 'ky-fx'); D.fx.setAttribute('aria-hidden', 'true');
    app.append(hud, main, D.ovs, D.toasts, D.fx);
    // 会話の送り：箱・場面・パネルの空きをタップ
    const adv = e => { if (G.adv && !OV.length) { e.preventDefault && e.preventDefault(); G.adv(); } };
    D.dlg.addEventListener('click', adv);
    sw.addEventListener('click', e => { if (G.adv && e.target.closest('.ky-spots button') == null) adv(e); });
    panel.addEventListener('click', e => { if (e.target === panel) adv(e); });
    document.addEventListener('keydown', onKey);
    root.addEventListener('resize', () => { stageSize(); RESIZE.forEach(f => { try { f(); } catch (e) {} }); });
    requestAnimationFrame(loop);
  }
  const RESIZE = KY._resize = [];
  const KEYHOOK = KY._keyhook = [];
  function onKey(e) {
    if (e.isComposing) return;
    const top = OV[OV.length - 1];
    if (top) {
      if (top.key && top.key(e) === true) return;
      if (e.key === 'Escape' && top.esc) { e.preventDefault(); top.esc(); }
      return;
    }
    if (G.adv) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') { if (e.target && e.target.tagName === 'BUTTON' && e.target !== D.dlgNext) return; e.preventDefault(); G.adv(); return; }
    }
    if (e.key === 'Escape') { if (G.menuOK) { e.preventDefault(); KY.openMenu(); } return; }
    for (const h of KEYHOOK) { try { if (h(e) === true) return; } catch (er) {} }
  }

  /* ── HUD ── */
  const WORLD_LABEL = KY.WORLD_LABEL = { A: '観測層 A', B: '観測層 B', C: '観測層 C' };
  const HUDX = KY._hudExtra = { loc: '' };
  function hud() {
    if (!D.hud) return;
    D.hudCh.textContent = S.chTitle || '';
    D.hudLoc.textContent = HUDX.loc || '';
    const showW = S.sync >= 2 || S.world !== 'A';
    D.hudWorld.hidden = !showW;
    D.hudWorld.innerHTML = '<span class="lb">観測層 </span>' + (S.world || 'A');
    D.hudWorld.dataset.w = S.world;
    const v = Math.round(S.stability);
    D.hudStab.querySelector('b').style.width = v + '%';
    D.hudStab.querySelector('.v').textContent = v;
    D.hudStab.dataset.lv = v < 10 ? 4 : v < 30 ? 3 : v < 50 ? 2 : v < 70 ? 1 : 0;
    const bat = S.items.battery | 0;
    D.hudBat.hidden = S.equip.indexOf('phone') < 0;
    D.hudBat.innerHTML = '<span class="lb">電力 </span>' + bat;
    D.hudBat.dataset.low = bat <= 2 ? '1' : '';
  }

  /* ── 会話の箱 ── */
  const NAME_CLS = { p: 'nm-p', y: 'nm-y', m: 'nm-m', g: 'nm-g', k: 'nm-k', s: 'nm-s', d: 'nm-d', x: 'nm-x', c: 'nm-c' };
  let hideT = 0;
  function dlgBuild(mode) {
    const box = D.dlg;
    box.innerHTML = ''; box.dataset.mode = mode; D.dlgMode = mode;
    box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite');
    if (mode === 'term' || mode === 'feed') {
      D.dlgHead = $('div', 'dlg-head', mode === 'term' ? 'TERMINAL ▍観測端末' : 'LIVE ▍コメント');
      D.dlgList = $('div', 'dlg-list');
      box.append(D.dlgHead, D.dlgList);
    } else {
      D.dlgFace = $('canvas', 'dlg-face'); D.dlgFace.width = 144; D.dlgFace.height = 144; D.dlgFace.hidden = true;
      const body = $('div', 'dlg-body');
      D.dlgName = $('div', 'dlg-name'); D.dlgText = $('div', 'dlg-text');
      body.append(D.dlgName, D.dlgText);
      box.append(D.dlgFace, body);
    }
    D.dlgNext = $('button', 'dlg-next', '▼'); D.dlgNext.type = 'button'; D.dlgNext.setAttribute('aria-label', '次へ');
    box.appendChild(D.dlgNext);
  }
  function typeInto(el, text, onDone) {
    const cps = SPEED[SET.speed] == null ? 40 : SPEED[SET.speed];
    const chars = Array.from(text);
    if (!cps || chars.length < 2) { el.textContent = text; onDone(); return () => {}; }
    let n = 0, done = false;
    const iv = setInterval(() => {
      n += Math.max(1, Math.round(cps / 30));
      if (n >= chars.length) { clearInterval(iv); el.textContent = text; done = true; onDone(); return; }
      el.textContent = chars.slice(0, n).join('');
    }, 1000 / 30);
    return () => { if (done) return; clearInterval(iv); el.textContent = text; done = true; onDone(); };
  }
  function line(L) {
    clearTimeout(hideT);
    return pend(done => {
      const mode = L.who === 't' ? 'term' : L.who === 'c' ? 'feed' : 'talk';
      if (D.dlgMode !== mode || D.dlg.hidden || (mode === 'talk')) dlgBuild(mode);
      D.dlg.hidden = false;
      D.ex.hidden = true;
      renderHist(D.hist, 4, 1);
      D.panel.classList.add('talking');
      let target;
      if (mode === 'talk') {
        D.dlg.dataset.who = L.who;
        D.dlgName.textContent = L.name || '';
        D.dlgName.className = 'dlg-name ' + (NAME_CLS[L.who] || '');
        D.dlgName.hidden = !L.name;
        D.dlgText.className = 'dlg-text' + (L.who === 'n' ? ' narr' : '') + (L.who === 's' ? ' shiro' : '') + (L.who === 'd' ? ' noisy' : '');
        if (L.face) { D.dlgFace.hidden = false; KY.drawPortrait(D.dlgFace.getContext('2d'), L.face, L.expr, 144, 144, L.name); }
        else D.dlgFace.hidden = true;
        target = D.dlgText;
      } else {
        const row = $('div', mode === 'term' ? 'term-row' : 'feed-row');
        if (mode === 'feed') { const nm = $('span', 'feed-name', L.name || '名無し'); row.appendChild(nm); }
        target = $('span', 'row-t'); row.appendChild(target);
        D.dlgList.appendChild(row);
        while (D.dlgList.children.length > (mode === 'term' ? 9 : 7)) D.dlgList.firstChild.remove();
      }
      D.dlgNext.hidden = true;
      let typing = true, waitT = 0;
      const finish = () => { G.adv = null; clearTimeout(waitT); done(); };
      const skip = typeInto(target, L.text, () => {
        typing = false;
        if (L.more) { waitT = setTimeout(finish, 260); G.adv = finish; return; }
        D.dlgNext.hidden = false;
      });
      G.adv = () => { if (typing) skip(); else finish(); };
      if (L.who === 'd' || L.who === 'c') { /* 配信・コメントは少しノイズ */ }
    });
  }
  // 直前の数行を薄く残す（縦長の画面の空きを、読み返しやすさに使う）
  function renderHist(el, n, skip) {
    if (!el) return;
    el.innerHTML = '';
    const L = G.log.slice(Math.max(0, G.log.length - n - (skip || 0)), G.log.length - (skip || 0));
    L.forEach(x => { const r = $('div', 'hist-row'); if (x.name) r.appendChild($('span', 'hist-n ' + (NAME_CLS[x.who] || ''), x.name)); r.appendChild($('span', 'hist-t', x.text)); el.appendChild(r); });
  }
  KY._renderHist = renderHist;
  function sayEnd() { clearTimeout(hideT); hideT = setTimeout(() => { if (!G.adv) hideDlg(); }, 80); }
  function hideDlg() { if (!D.dlg) return; D.dlg.hidden = true; D.dlgMode = null; D.panel.classList.remove('talking'); if (D.hist) D.hist.innerHTML = ''; }
  KY._hideDlg = hideDlg;

  /* ── 選択・入力 ── */
  function choice(q, list) {
    clearTimeout(hideT);
    return pend(done => {
      const h = openOv('ov-choice', { label: q || '選択' });
      const box = $('div', 'ky-win choice-box');
      if (q) box.appendChild($('div', 'choice-q', q));
      const bs = list.map((o, i) => {
        const b = button('', () => { h.close(); done(i); }, 'choice-btn');
        b.appendChild($('span', 'choice-n', String(i + 1)));
        b.appendChild($('span', 'choice-t', o.t));
        if (o.s) b.appendChild($('span', 'choice-s', o.s));
        box.appendChild(b);
        return b;
      });
      h.el.appendChild(box);
      h.key = e => {
        if (/^[1-9]$/.test(e.key) && bs[+e.key - 1]) { e.preventDefault(); bs[+e.key - 1].click(); return true; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const i = bs.indexOf(document.activeElement); const n = (i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length; bs[n].focus(); return true; }
        if (e.key === 'Escape') { e.preventDefault(); if (G.menuOK) KY.openMenu(); return true; }
        return false;
      };
      focusFirst(box);
    });
  }
  function input(q, def, max) {
    return pend(done => {
      const h = openOv('ov-choice ov-input', { label: q || '入力' });
      const box = $('div', 'ky-win choice-box');
      const id = 'ky-in-' + Date.now();
      const lb = $('label', 'choice-q', q); lb.htmlFor = id;
      const inp = $('input', 'ky-input'); inp.id = id; inp.type = 'text'; inp.maxLength = max * 2; inp.value = def; inp.autocomplete = 'off'; inp.setAttribute('enterkeyhint', 'done');
      const hint = $('div', 'choice-s', `${max}文字まで・空欄なら「${def || NAME_DEF}」`);
      const ok = button('決定', () => { h.close(); done(inp.value); }, 'primary');
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ok.click(); } });
      const row = $('div', 'btn-row'); row.appendChild(ok);
      box.append(lb, inp, hint, row);
      h.el.appendChild(box);
      setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 40);
    });
  }

  /* ── 章扉・お知らせ ── */
  function title(t, sub) {
    return pend(done => {
      hideDlg();
      const h = openOv('ov-title', { label: t });
      const wrap = $('div', 'title-card');
      wrap.append($('div', 'tc-rec', 'OBSERVATION RECORD'), $('div', 'tc-t', t), $('div', 'tc-line'), $('div', 'tc-s', sub || ''));
      h.el.appendChild(wrap);
      KY.se('beep');
      let closed = false;
      const end = () => { if (closed) return; closed = true; h.el.classList.add('out'); setTimeout(() => { h.close(); done(); }, KY.reduced() ? 50 : 600); };
      const tm = setTimeout(end, 3000);
      h.el.addEventListener('click', () => { clearTimeout(tm); end(); });
      h.key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); clearTimeout(tm); end(); } return true; };
    });
  }
  function notice(t, sub) {
    return pend(done => {
      const h = openOv('ov-choice', { label: t });
      const box = $('div', 'ky-win choice-box');
      box.append($('div', 'choice-q', t));
      if (sub) box.append($('div', 'choice-s', sub));
      const b = button('閉じる', () => { h.close(); done(); }, 'primary');
      box.append(b); h.el.appendChild(box); h.esc = () => b.click(); focusFirst(box);
    });
  }
  KY.notice = (t, sub) => UI.notice(t, sub);
  function confirmBox(t, yes, no) {
    return new Promise(res => {
      const h = openOv('ov-choice', { label: t });
      const box = $('div', 'ky-win choice-box');
      box.append($('div', 'choice-q', t));
      const row = $('div', 'btn-row');
      row.append(button(yes || 'はい', () => { h.close(); res(true); }, 'primary'), button(no || 'いいえ', () => { h.close(); res(false); }));
      box.append(row); h.el.appendChild(box); h.esc = () => { h.close(); res(false); }; focusFirst(box);
    });
  }
  KY._confirm = confirmBox;

  /* ── トースト（証拠・手帳） ── */
  function toast(text, kind, extra) {
    if (!D.toasts) return;
    const t = $('div', 'ky-toast ' + (kind || ''));
    if (extra) t.appendChild(extra);
    const tx = $('div', 'toast-t');
    String(text).split('\n').forEach((s, i) => tx.appendChild($('div', i ? 'toast-sub' : 'toast-main', s)));
    t.appendChild(tx);
    D.toasts.appendChild(t);
    while (D.toasts.children.length > 3) D.toasts.firstChild.remove();
    t.addEventListener('click', () => t.remove());
    setTimeout(() => t.classList.add('out'), 2500);
    setTimeout(() => t.remove(), 3000);
  }
  KY.toast = (text, kind) => UI.toast(text, kind);
  function gainFx(id) {
    const ev = KY.ev(id);
    const th = $('canvas', 'toast-thumb'); th.width = 96; th.height = 54;
    try { KY.thumb && KY.thumb(th, id); } catch (e) {}
    toast('証拠を記録した\n' + (EV_TYPE[ev.type] || '記録') + '｜' + ev.title, 'ev', th);
  }

  /* ── 演出 ── */
  function fx(name) {
    const R = KY.reduced();
    const L = D.fx; if (!L) return Promise.resolve();
    const play = (cls, ms) => { const el = $('div', 'fx ' + cls); L.appendChild(el); setTimeout(() => el.remove(), ms); };
    switch (name) {
      case 'glitch': ST.glitch = now() + (R ? 150 : 420); if (!R) play('fx-rgb', 420); return KY.wait(R ? 150 : 300);
      case 'noise': play('fx-noise' + (R ? ' calm' : ''), 700); KY.se('static'); return KY.wait(450);
      case 'blackout': play('fx-black', 1300); return KY.wait(1000);
      case 'shake': if (!R) { D.app.classList.remove('shake'); void D.app.offsetWidth; D.app.classList.add('shake'); setTimeout(() => D.app.classList.remove('shake'), 500); } return KY.wait(R ? 0 : 300);
      case 'flash': play('fx-flash' + (R ? ' calm' : ''), 420); return KY.wait(160);
      case 'whiteout': play('fx-white', 2300); return KY.wait(1700);
      case 'mainui': return KY.mainUI(1600);
      case 'scan': play('fx-scan', 900); return KY.wait(200);
      default: console.warn('[KY] 不明な fx', name); return Promise.resolve();
    }
  }
  KY.fx = name => UI.fx(String(name || ''));
  // 本編のステータス表示が右上に一瞬出る（§40）
  function mainUI(ms) {
    return pend(done => {
      const L = D.fx;
      let st = null; try { st = root.KY_LINK && KY_LINK.best && KY_LINK.best(); } catch (e) {}
      const day = st && st.day ? clamp(st.day | 0, 1, 30) : 27;
      const mental = st && st.mental != null ? clamp(+st.mental, 0, 100) : 23;
      const fatigue = st && st.fatigue != null ? clamp(+st.fatigue, 0, 100) : 81;
      const hp = clamp(100 - fatigue * 0.6, 5, 100);
      const el = $('div', 'mainui');
      el.innerHTML = `<div class="mu-day">DAY ${String(day).padStart(2, '0')}<span>残り ${30 - day}日</span></div>`;
      [['体力', hp, 'hp'], ['疲労', fatigue, 'fa'], ['精神', mental, 'me']].forEach(([lb, v, c]) => {
        const r = $('div', 'mu-row'); r.innerHTML = `<span class="mu-l">${lb}</span><i class="mu-bar ${c}"><b style="width:${v}%"></b></i><span class="mu-v">${Math.round(v)}</span>`; el.appendChild(r);
      });
      L.appendChild(el);
      KY.se('static');
      setTimeout(() => el.classList.add('out'), Math.max(300, (ms || 1500) - 250));
      setTimeout(() => { el.remove(); done(); }, ms || 1500);
    });
  }
  KY.mainUI = ms => UI.mainUI(ms);

  /* ── エンディング・スタッフロール ── */
  function endCard(id) {
    return pend(done => {
      const h = openOv('ov-end', { label: 'END' });
      const w = $('div', 'end-card');
      w.append($('div', 'end-k', id === 'TRUE' ? 'TRUE END' : 'END ' + id), $('div', 'end-t', '「' + (END_NAME[id] || id) + '」'), $('div', 'end-s', '観測記録を保存しました'));
      h.el.appendChild(w);
      KY.se(id === 'TRUE' ? 'whistle' : 'chime');
      const b = button('続ける', () => { h.close(); done(); }, 'primary end-btn');
      setTimeout(() => { w.appendChild(b); focusFirst(w); }, KY.reduced() ? 200 : 2200);
      h.esc = () => {};
    });
  }
  function staffRoll(lines) {
    return pend(done => {
      const h = openOv('ov-roll', { label: 'スタッフロール' });
      const inner = $('div', 'roll-inner');
      lines.forEach(s => {
        const m = /^\[(.+)\]$/.exec(s);
        inner.appendChild($('div', m ? 'roll-role' : (s ? 'roll-name' : 'roll-gap'), m ? m[1] : (s || '\u00a0')));
      });
      h.el.appendChild(inner);
      const skip = button('スキップ', () => end(), 'roll-skip');
      h.el.appendChild(skip);
      let y = 0, raf = 0, last = now(), ended = false;
      const H = () => h.el.clientHeight;
      y = H();
      const spd = KY.reduced() ? 60 : 38;
      const step = () => {
        const t = now(), dt = Math.min(0.1, (t - last) / 1000); last = t;
        y -= spd * dt; inner.style.transform = `translateY(${y}px)`;
        if (y < -inner.offsetHeight - 20) return end();
        raf = requestAnimationFrame(step);
      };
      const end = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); h.close(); done(); };
      raf = requestAnimationFrame(step);
      h.esc = end;
      whistle && AU.ok && setTimeout(() => KY.se('whistle_far'), 1200);
    });
  }
  function postCredit(lines) {
    return pend(async done => {
      const h = openOv('ov-post', { label: 'ポストクレジット' });
      const feed = $('div', 'post-feed'); h.el.appendChild(feed);
      h.esc = () => {};
      const L = lines || ['#se stream', '#wait 1600', 'c:USER_444|次はどの世界を見る？', '#wait 2600', 'c:UNKNOWN|まだ30日目が終わってない。', '#wait 2600'];
      for (const s of L) {
        if (s[0] === '#') {
          const a = s.slice(1).split(/\s+/);
          if (a[0] === 'wait') await new Promise(r => setTimeout(r, +a[1] || 800));
          else if (a[0] === 'se') KY.se(a[1]);
          continue;
        }
        const P = parseLine(s);
        const row = $('div', 'feed-row');
        if (P.name) row.appendChild($('span', 'feed-name', P.name));
        row.appendChild($('span', 'row-t', P.text));
        feed.appendChild(row);
        KY.se('beep');
        await new Promise(r => setTimeout(r, 400));
      }
      h.el.classList.add('out');
      await new Promise(r => setTimeout(r, 1200));
      h.close(); done();
    });
  }

  /* ── 会話ログ ── */
  function openLog() {
    const h = openOv('ov-log', { label: '会話ログ' });
    const box = $('div', 'ky-win log-box');
    const head = $('div', 'win-head'); head.append($('span', '', 'BACKLOG ▍会話ログ'), button('閉じる', () => h.close(), 'win-close'));
    const list = $('div', 'log-list');
    G.log.forEach(L => {
      const r = $('div', 'log-row ' + (L.who === 't' ? 'term' : L.who === 'sys' ? 'sys' : ''));
      r.appendChild($('span', 'log-n ' + (NAME_CLS[L.who] || ''), L.name || ''));
      r.appendChild($('span', 'log-t', L.text));
      list.appendChild(r);
    });
    if (!G.log.length) list.appendChild($('div', 'empty', 'まだ記録はない。'));
    box.append(head, list); h.el.appendChild(box);
    h.esc = () => h.close();
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 0);
    focusFirst(head);
  }
  KY.openLog = () => HAS_DOM && openLog();

  /* ── メニュー（タブは systems.js / board.js も足す） ── */
  const MENU = KY.MENU = [];
  KY.addMenu = function (id, label, order, render) {
    const i = MENU.findIndex(m => m.id === id); if (i >= 0) MENU.splice(i, 1);
    MENU.push({ id, label, order, render }); MENU.sort((a, b) => a.order - b.order);
  };
  KY.openMenu = function (tab) {
    if (!HAS_DOM) return;
    if (OV.some(o => o.menu)) return;
    const h = openOv('ov-menu', { label: 'メニュー' });
    h.menu = true;
    const box = $('div', 'ky-win menu-box');
    const head = $('div', 'win-head');
    head.append($('span', 'menu-title', '観測端末 ▍MENU'), button('閉じる', () => h.close(), 'win-close'));
    const nav = $('nav', 'menu-tabs'); nav.setAttribute('role', 'tablist');
    const body = $('div', 'menu-body'); body.setAttribute('role', 'tabpanel');
    const tabs = MENU.filter(m => !m.when || m.when());
    let cur = tab && tabs.find(m => m.id === tab) ? tab : (KY._menuLast && tabs.find(m => m.id === KY._menuLast) ? KY._menuLast : tabs[0] && tabs[0].id);
    const show = id => {
      cur = id; KY._menuLast = id;
      nav.querySelectorAll('button').forEach(b => { b.setAttribute('aria-selected', b.dataset.id === id ? 'true' : 'false'); });
      body.innerHTML = ''; body.scrollTop = 0;
      const m = MENU.find(x => x.id === id);
      try { m && m.render(body, h); } catch (e) { console.error(e); body.appendChild($('div', 'empty', '表示できませんでした。')); }
    };
    tabs.forEach(m => { const b = button(m.label, () => show(m.id), 'menu-tab'); b.dataset.id = m.id; b.setAttribute('role', 'tab'); nav.appendChild(b); });
    box.append(head, nav, body); h.el.appendChild(box);
    h.esc = () => h.close();
    h.show = show;
    show(cur);
    const sel = nav.querySelector('[aria-selected="true"]'); setTimeout(() => { try { sel && sel.focus({ preventScroll: true }); sel && sel.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {} }, 30);
    return h;
  };
  function settingsPanel(el) {
    const sec = (t) => { const s = $('div', 'set-sec'); s.appendChild($('div', 'set-h', t)); el.appendChild(s); return s; };
    const a = sec('音量');
    const row = $('label', 'set-row'); const r = $('input'); r.type = 'range'; r.min = 0; r.max = 100; r.step = 5; r.value = SET.vol; const v = $('span', 'set-v', SET.vol + '');
    r.addEventListener('input', () => { KY.setVolume(+r.value); v.textContent = r.value; });
    r.addEventListener('change', () => KY.se('beep'));
    row.append($('span', '', '全体'), r, v); a.appendChild(row);
    const b = sec('文字の速さ');
    const rb = $('div', 'seg');
    [['slow', '遅い'], ['normal', '普通'], ['fast', '速い'], ['instant', '一瞬']].forEach(([k, lb]) => {
      const bt = button(lb, () => { SET.speed = k; KY.saveSettings(); rb.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false')); }, 'seg-btn');
      bt.setAttribute('aria-pressed', SET.speed === k ? 'true' : 'false'); rb.appendChild(bt);
    });
    b.appendChild(rb);
    const c = sec('演出');
    const cb = button(SET.calm ? '控えめ：オン' : '控えめ：オフ', () => { SET.calm = !SET.calm; KY.saveSettings(); if (D.app) D.app.classList.toggle('calm', SET.calm); cb.textContent = SET.calm ? '控えめ：オン' : '控えめ：オフ'; cb.setAttribute('aria-pressed', SET.calm ? 'true' : 'false'); }, 'seg-btn');
    cb.setAttribute('aria-pressed', SET.calm ? 'true' : 'false');
    c.appendChild(cb); c.appendChild($('div', 'set-note', '画面の揺れ・ちらつきを抑えます（端末の「視差効果を減らす」設定にも従います）。'));
    const d = sec('操作');
    d.appendChild($('div', 'set-note', 'タップ／Enter・Space：会話を進める　Esc：メニュー　数字キー：選択肢・探索の行動'));
  }
  KY._settingsPanel = settingsPanel;
  function savePanel(el) {
    const info = (lb, i) => { const r = $('div', 'save-slot'); r.appendChild($('div', 'save-h', lb)); r.appendChild($('div', 'save-i', i ? `${i.name}｜${i.ch || '―'}\n${fmtDate(i.at)}　プレイ ${fmtPlay(i.play)}` : '― 記録なし ―')); return r; };
    const a = info('オートセーブ（章の区切り・場所の移動で自動）', KY.saveInfo(false));
    const m = info('手動セーブ', KY.saveInfo(true));
    el.append(a, m);
    const row = $('div', 'btn-row');
    const sv = button('ここで手動セーブ', () => { G.running ? (KY.save(true) && lsSet(KEY, JSON.stringify(S))) : null; KY.toast('観測記録を保存した'); el.innerHTML = ''; savePanel(el); }, 'primary');
    sv.disabled = !G.running;
    const ld = button('手動セーブをロード', async () => { if (await confirmBox('手動セーブの地点から再開しますか？', 'ロード', 'やめる')) { closeAllOv(); KY.continueGame(true); } });
    ld.disabled = !KY.saveInfo(true);
    row.append(sv, ld); el.appendChild(row);
    el.appendChild($('div', 'set-note', '再開すると、その章の区切り（場面のまとまり）の最初から始まります。'));
  }
  function closeAllOv() { while (OV.length) OV[OV.length - 1].close(); }
  KY._closeAllOv = closeAllOv;
  if (HAS_DOM) {
    KY.addMenu('save', 'セーブ', 90, savePanel);
    KY.addMenu('log', 'ログ', 91, (el, h) => { h.close(); openLog(); });
    KY.addMenu('settings', '設定', 92, settingsPanel);
    KY.addMenu('title', 'タイトルへ', 99, async (el, h) => {
      el.appendChild($('div', 'set-note', 'タイトルに戻ります。オートセーブ（最後の区切り）から「つづきから」で再開できます。'));
      const b = button('タイトルに戻る', async () => { closeAllOv(); KY.toTitle(); }, 'primary');
      el.appendChild(b);
    });
  }

  /* ── タイトル ── */
  function drawTitleBg(ts) {
    const cv = D.titleCv; const r = cv.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d'), t = ts / 1000;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04081a'); g.addColorStop(0.55, '#0a1834'); g.addColorStop(1, '#0c1f2c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 星
    for (let i = 0; i < 70; i++) { const x = (i * 97.13 % 1) * W, y = ((i * 53.71) % 1) * H * 0.5; c.fillStyle = `rgba(200,230,255,${0.15 + 0.25 * Math.abs(Math.sin(t * 0.5 + i))})`; c.fillRect((x * 7.3) % W, y, dpr, dpr); }
    // 月
    c.fillStyle = 'rgba(232,226,200,.85)'; c.beginPath(); c.arc(W * 0.78, H * 0.17, H * 0.045, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#060c20'; c.beginPath(); c.arc(W * 0.78 + H * 0.018, H * 0.16, H * 0.042, 0, Math.PI * 2); c.fill();
    // 山
    c.fillStyle = '#071027'; c.beginPath(); c.moveTo(0, H * 0.62);
    for (let x = 0; x <= W; x += W / 24) c.lineTo(x, H * (0.52 + 0.06 * Math.sin(x / W * 7 + 1) + 0.03 * Math.sin(x / W * 19)));
    c.lineTo(W, H); c.lineTo(0, H); c.fill();
    // 電線と電柱
    c.strokeStyle = 'rgba(120,170,200,.35)'; c.lineWidth = dpr;
    const poles = [0.08, 0.38, 0.68, 0.98];
    poles.forEach(px => { c.fillStyle = '#050a18'; c.fillRect(W * px - 2 * dpr, H * 0.5, 4 * dpr, H * 0.5); c.fillRect(W * px - 14 * dpr, H * 0.53, 28 * dpr, 2 * dpr); });
    for (let k = 0; k < 3; k++) { for (let i = 0; i < poles.length - 1; i++) { const x0 = W * poles[i], x1 = W * poles[i + 1], y = H * 0.535 + k * 5 * dpr; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + H * 0.04 + Math.sin(t * 0.4 + k) * dpr, x1, y); c.stroke(); } }
    // 廃駅の灯り（ときどき点く）
    const on = (Math.sin(t * 0.7) > 0.6) || (Math.sin(t * 3.1) > 0.97);
    c.fillStyle = on ? 'rgba(255,214,140,.75)' : 'rgba(255,214,140,.12)'; c.fillRect(W * 0.2, H * 0.575, 6 * dpr, 3 * dpr);
    c.fillStyle = 'rgba(95,214,230,.05)'; c.fillRect(0, ((t * 40) % H) | 0, W, 2 * dpr);
  }
  function showTitle() {
    if (!HAS_DOM) return;
    mount();
    closeAllOv(); hideDlg();
    UI.game(false);
    const old = document.querySelector('.ky-titlescr'); if (old) old.remove();
    const scr = D.title = $('div', 'ky-titlescr');
    D.titleCv = $('canvas', 'title-cv'); D.titleCv.setAttribute('aria-hidden', 'true'); D.titleOn = true;
    const col = $('div', 'title-col');
    const logo = $('div', 'title-logo');
    logo.append($('div', 'tl-k', 'TSUKISHIRO OBSERVATION RECORD'), $('h1', 'tl-t', '境界事象'), $('div', 'tl-s', '― 月代町観測記録 ―'), $('div', 'tl-o', '特殊現象観測センター 月代分室'));
    const menu = $('div', 'title-menu');
    const ai = KY.saveInfo(false), mi = KY.saveInfo(true);
    const bNew = button('はじめから', async () => {
      if (ai && !(await confirmBox('オートセーブを上書きして、はじめから始めますか？', 'はじめから', 'やめる'))) return;
      const nm = await UI.input('観測員登録：あなたの姓を入力してください', NAME_DEF, 6);
      const v = Array.from(String(nm || '').replace(/[\u0000-\u001f<>]/g, '').trim()).slice(0, 6).join('') || NAME_DEF;
      scr.remove(); D.titleOn = false;
      KY.newGame(v);
    }, 'primary');
    const bCon = button('', () => { scr.remove(); D.titleOn = false; KY.continueGame(false); });
    bCon.append($('span', '', 'つづきから'), $('span', 'tb-sub', ai ? `${ai.name}｜${ai.ch || ''}` : '記録なし'));
    bCon.disabled = !ai;
    const bLoad = button('', () => { scr.remove(); D.titleOn = false; KY.continueGame(true); });
    bLoad.append($('span', '', 'ロード'), $('span', 'tb-sub', mi ? `手動セーブ｜${mi.ch || ''}` : '記録なし'));
    bLoad.disabled = !mi;
    const bSet = button('設定', () => {
      const h = openOv('ov-menu', { label: '設定' }); const box = $('div', 'ky-win menu-box small');
      const head = $('div', 'win-head'); head.append($('span', 'menu-title', '設定'), button('閉じる', () => h.close(), 'win-close'));
      const body = $('div', 'menu-body'); settingsPanel(body); box.append(head, body); h.el.appendChild(box); h.esc = () => h.close(); focusFirst(head);
    });
    const bBack = button('本編に戻る', () => { location.href = 'index.html'; }, 'ghost');
    menu.append(bNew, bCon, bLoad, bSet, bBack);
    const seen = KY.endingsSeen();
    const ends = $('div', 'title-ends');
    ['A', 'B', 'C', 'TRUE'].forEach(k => { const e = $('span', 'te' + (seen.indexOf(k) >= 0 ? ' on' : ''), seen.indexOf(k) >= 0 ? (k === 'TRUE' ? 'TRUE「境界」' : `END ${k}「${END_NAME[k]}」`) : (k === 'TRUE' ? 'TRUE ？' : `END ${k} ？`)); ends.appendChild(e); });
    const foot = $('div', 'title-foot', '音が出ます（最初のタップで開始）');
    col.append(logo, menu, ends, foot);
    scr.append(D.titleCv, col);
    D.app.appendChild(scr);
    let played = false;
    const firstTap = () => { if (played) return; played = true; setTimeout(() => { KY.amb('wire'); KY.se('whistle_far'); }, 120); };
    scr.addEventListener('pointerdown', firstTap); scr.addEventListener('keydown', firstTap);
    if (AU.ok) firstTap();
    focusFirst(menu);
  }
  KY.showTitle = () => UI.showTitle();
  function crash(e) {
    const h = openOv('ov-choice', { label: 'エラー' });
    const box = $('div', 'ky-win choice-box');
    box.append($('div', 'choice-q', '観測記録の再生中に問題が起きました。'), $('div', 'choice-s mono', String(e && e.message || e).slice(0, 200)));
    const row = $('div', 'btn-row');
    row.append(button('タイトルへ', () => { h.close(); KY.toTitle(); }, 'primary'));
    box.append(row); h.el.appendChild(box); focusFirst(box);
  }

  /* ═════════════════════════ UI 層（DOM／テスト用のヘッドレス） ═════════════════════════ */
  const DOM_UI = {
    line, sayEnd, choice, input, title, notice, toast, gainFx, fx, mainUI, endCard, staffRoll, postCredit, crash, showTitle,
    hud,
    stage(id, world) { ST.scene = id; ST.world = world || S.world; },
    game(on) { mount(); D.app.classList.toggle('in-game', !!on); if (on) { const t = document.querySelector('.ky-titlescr'); if (t) t.remove(); D.titleOn = false; } hud(); },
    hideGameUI() { hideDlg(); if (D.ex) D.ex.hidden = true; if (D.spots) D.spots.innerHTML = ''; },
  };
  const AUTO = KY._auto = { choices: [], inputs: [], log: [] };
  const HEADLESS_UI = {
    line(L) { AUTO.log.push(L.who + ':' + L.text); return Promise.resolve(); },
    sayEnd() {}, hud() {}, stage() {}, game() {}, hideGameUI() {}, showTitle() {}, crash(e) { AUTO.log.push('crash:' + (e && e.message)); },
    choice(q, list) { const v = AUTO.choices.length ? AUTO.choices.shift() : 0; return Promise.resolve(clamp(v | 0, 0, list.length - 1)); },
    input(q, def) { return Promise.resolve(AUTO.inputs.length ? AUTO.inputs.shift() : def); },
    title() { return Promise.resolve(); }, notice() { return Promise.resolve(); },
    toast(t) { AUTO.log.push('toast:' + t); }, gainFx() {}, fx() { return Promise.resolve(); }, mainUI() { return Promise.resolve(); },
    endCard() { return Promise.resolve(); }, staffRoll() { return Promise.resolve(); }, postCredit() { return Promise.resolve(); },
  };
  const UI = KY.UI = HAS_DOM ? DOM_UI : HEADLESS_UI;
  KY._hud = () => UI.hud();
  RESET.push(() => {
    if (!HAS_DOM || !D.app) return;
    G.adv = null; closeAllOv(); hideDlg();
    if (D.ex) { D.ex.hidden = true; D.ex.innerHTML = ''; }
    if (D.spots) D.spots.innerHTML = '';
    HUDX.loc = '';
  });

  /* ── 起動（kyokai.html が全ファイルを読み終えてから呼ぶ） ── */
  KY.boot = function (opt) {
    opt = opt || {};
    if (opt.only) G.only = opt.only;
    if (!HAS_DOM) return;
    mount();
    showTitle();
  };
})(typeof window !== 'undefined' ? window : globalThis);
