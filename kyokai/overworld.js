/* ══════════════════════════════════════════════════════════════════════
   境界事象  歩いて回る月代町（kyokai/overworld.js・global KY_WORLD）
   読み込み順：engine.js → systems.js → battle.js → data/maps.js → overworld.js → …（kyokai.html）

   ■ やること
   ・探索（K.explore）の「地図」と「場所」の画面を、上から見た 16×16 マスの歩ける地図に置き換える。
     KY.UI.exMap / exArea / exClose だけを差し替えるので、探索ループ（systems.js）と章スクリプトはそのまま。
     町（フィールド）を歩いて建物・道の入口に入る ＝ 地図でその場所を選んだのと同じ。
     場所の中の調べ物（spot）は、地図の上の家具・人・小物になる。正面に立って A（Z/Enter）で行動メニュー
     （調べる／撮影／録音／スキャン／聞き込み）→ systems.js の _doAction がそのまま動く（証拠・フラグ・推理・追跡も同じ）。
   ・画面は 10×9 マス（ゲームボーイの 160×144）。4 色は観測層・場面ごと（KY_ART.gb.PAL）。
   ・操作：矢印/WASD 移動（Shift で走る）、Z/Enter/Space＝A（調べる・話す）、X＝B（メニュー）、Esc＝本体のメニュー。
     スマホは画面下の十字キーと A/B。地図をタップすると、そのマスまで歩く（物ならその前まで歩いて調べる）。
   ・調べる・撮影のあいだは、その場所の一枚絵を額縁つきで大写しにする（会話中・話しかけは地図のまま）。
     章が #scene で別の場面を出したときも同じ額縁で見せる。
   ・境界ノイズのマス（B/C で危険度>0）を踏むと KY_BATTLE.encounter → 戦闘（シロと出会う前・戦闘直後は出ない）。
   ・位置は場所ごとに S.ow.pos[場所] / S.ow.field に保存（kyokai_save_v1 に入る）。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY, MP = root.KY_MAPS;
  if (!KY || !KY._G || !MP) { if (root.console) console.error('[KY] overworld.js：engine.js / systems.js / data/maps.js が先に必要です'); return; }
  const G = KY._G, S = () => KY.state;
  const API = root.KY_WORLD = { maps: MP, active: () => !!(OW && OW.active) };
  let OW = null;
  if (!KY.HAS_DOM) return;

  const TS = 16;
  let CW = 160, CH = 144, VS = 1;   // 画面に映すドット数（端末の大きさで変わる）と 1 ドットの CSS px
  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DIRV = MP.DIRS;
  const OPP = { u: 'd', d: 'u', l: 'r', r: 'l' };
  const $ = (t, c, x) => KY._el(t, c, x);
  const FIELD_DANGER = { A: 0, B: 1, C: 3 };
  const CENTER = ['center_office', 'center_server', 'center_lab', 'center_basement'];
  const PERSON = new Set(root.KY_TILES ? Object.keys(root.KY_TILES.PEOPLE) : ['player']);

  OW = {
    active: false, mode: null, mapId: null, world: 'A', m: null, p: { x: 0, y: 0, dir: 'd', mv: null, step: 0 }, objs: [], amb: [],
    done: null, busy: false, opts: null, list: null, pendingWarp: null, arriveFrom: null, lastArea: null, keys: [], pad: null, path: null, pathThen: null,
    turnUntil: 0, cool: 0, cut: false, acting: null, flick: null, trans: null, stat: null, statKey: '', raf: 0, last: 0, steps: 0, follower: null, near: '', bumpT: 0,
    logged: {},
  };
  API._ow = OW;

  /* ═════════════════════════ 色 ═════════════════════════ */
  function palKeyFor(mapId, world) {
    if (mapId === 'town') return KY.palOf('town_map', world);
    const a = KY.getArea && KY.getArea(mapId);
    const sc = a && a.worlds && a.worlds[world] && a.worlds[world].scene;
    return KY.palOf(sc || mapId, world);
  }
  function palColors(k) {
    try { const P = root.KY_ART && KY_ART.gb && KY_ART.gb.PAL; if (P && P[k]) return P[k]; } catch (e) {}
    return ({ A: ['#0f380f', '#306230', '#8bac0f', '#cadc9f'], B: ['#2a1a0c', '#6e4a26', '#c09058', '#f2e2bc'], C: ['#0c1219', '#384a5c', '#8a9cac', '#dfe7ec'],
      S: ['#1b0f2e', '#4e3478', '#a688d4', '#ece2fa'], X: ['#04201e', '#17605a', '#5fc4b4', '#e2fbf4'] })[k] || ['#0f380f', '#306230', '#8bac0f', '#cadc9f'];
  }

  /* ═════════════════════════ マス・人物の絵（kyokai/tiles.js） ═════════════════════════ */
  const hash = MP.hash2;
  const KT = root.KY_TILES;
  function stageFlags() { return { boardBlank: KY.has('stage_boardBlank'), clockAlt: KY.has('stage_clockAlt'), basementOpen: KY.has('basement_open') }; }
  function renderStatic(m, world, palK) {
    if (KT && KT.render) { try { return KT.render(m, world, palColors(palK), stageFlags()); } catch (e) { console.error('[KY_WORLD] tiles', e); } }
    const cv = document.createElement('canvas'); cv.width = m.w * TS; cv.height = m.h * TS;
    const ctx = cv.getContext('2d'), col = palColors(palK);
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { ctx.fillStyle = col[MP.walkable(m.g[ty][tx]) ? 3 : 1]; ctx.fillRect(tx * TS, ty * TS, TS, TS); }
    return cv;
  }
  const SPR = new Map();
  function spriteCanvas(id, dir, frame, palK) {
    const key = id + '|' + dir + '|' + frame + '|' + palK;
    if (SPR.has(key)) return SPR.get(key);
    const col = palColors(palK);
    const rows = KT ? KT.sprite(id, dir, frame) : ['................'];
    const flip = dir === 'r' && !(KT && KT.NOFLIP.has(id));
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
    const ctx = cv.getContext('2d');
    rows.forEach((r, y) => { const s = String(r).padEnd(16, '.').slice(0, 16); for (let x = 0; x < 16; x++) { const ch = s[flip ? 15 - x : x]; if (ch >= '0' && ch <= '3') { ctx.fillStyle = col[+ch]; ctx.fillRect(x, y, 1, 1); } } });
    SPR.set(key, cv);
    if (SPR.size > 1200) SPR.clear();
    return cv;
  }
  API.SPRITES = KT ? KT.SPRITES.slice() : [];
  API._sprite = spriteCanvas;
  API._renderMap = (id, world, palK) => renderStatic(MP.compile(id, world), world, palK || palKeyFor(id, world));

  /* ═════════════════════════ DOM ═════════════════════════ */
  const D = KY._D, OWD = {};
  function ensureDom() {
    if (OWD.cv || !D.stageWrap) return !!OWD.cv;
    const cv = OWD.cv = $('canvas', 'ow-cv'); cv.width = CW; cv.height = CH; cv.setAttribute('aria-label', '月代町の地図（タップでそのマスまで歩く）');
    D.stageWrap.insertBefore(cv, D.stageWrap.firstChild);
    OWD.ctx = cv.getContext('2d'); OWD.ctx.imageSmoothingEnabled = false;
    OWD.frame = $('div', 'ow-cutframe'); OWD.hl = $('div', 'ow-hl'); OWD.frame.appendChild(OWD.hl);
    OWD.name = $('div', 'ow-name');
    OWD.tag = $('div', 'ow-tag'); OWD.tag.setAttribute('aria-hidden', 'true');
    D.stageWrap.appendChild(OWD.frame); D.stageWrap.appendChild(OWD.name); D.stageWrap.appendChild(OWD.tag);
    if (KY._resize) KY._resize.push(() => { if (OW.active) fitView(); });
    cv.addEventListener('pointerdown', onTap);
    document.addEventListener('keyup', e => { const k = keyDir(e.key); if (k) OW.keys = OW.keys.filter(x => x !== k); if (e.key === 'Shift') OW.run = false; });
    root.addEventListener('blur', () => { OW.keys = []; OW.pad = null; OW.run = false; });
    return true;
  }
  function setLayout(on) {
    if (!D.app) return;
    D.app.classList.toggle('ow-on', !!on);
    D.stageWrap.classList.toggle('ow', !!on);
    if (!on) { D.stageWrap.classList.remove('cut'); OWD.hl && (OWD.hl.hidden = true); clearCutBox(); }
    try { root.dispatchEvent(new Event('resize')); } catch (e) {}
    if (on) { fitView(); requestAnimationFrame(() => { if (OW.active) fitView(); }); }
  }
  /* 画面の大きさ：地図の 1 ドットを何 px で見せるか（整数倍を優先・だめなら近い倍率でくっきり）
     ・最低でもゲームボーイの 10×9 マスが入る大きさ。部屋（屋内）は部屋全体が入る倍率まで縮める（小さくなりすぎない範囲で）。
     ・映すドット数（CW×CH）は枠いっぱい。部屋が画面より小さいときは真ん中に置き、まわりは地の色。 */
  function fitView() {
    const wrap = D.stageWrap, cv = OWD.cv; if (!wrap || !cv) return;
    const cs = getComputedStyle(wrap);
    const pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0, pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    const bw = wrap.clientWidth - pl - pr, bh = wrap.clientHeight - pt - pb;
    if (bw < 40 || bh < 40) return;
    const dpr = root.devicePixelRatio || 1, m = OW.m;
    const base = Math.min(bw / 160, bh / 144, 4.25);
    let s = base;
    const sMin = Math.min(base, 1.75);
    if (m && m.def && m.def.indoor) { const fit = Math.min(bw / (m.w * TS), bh / (m.h * TS)); s = clamp(fit, sMin, base); }
    const k = Math.floor(s * dpr + 1e-6);
    if (k >= 1 && k / dpr >= Math.max(s * 0.85, sMin)) s = k / dpr;
    const W = Math.max(64, Math.floor(bw / s)), H = Math.max(64, Math.floor(bh / s));
    const cssW = W * s, cssH = H * s;
    const left = Math.round((pl + (bw - cssW) / 2) * dpr) / dpr, top = Math.round((pt + (bh - cssH) / 2) * dpr) / dpr;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; OWD.ctx = cv.getContext('2d'); OWD.ctx.imageSmoothingEnabled = false; }
    CW = W; CH = H; VS = s;
    Object.assign(cv.style, { left: left + 'px', top: top + 'px', width: cssW + 'px', height: cssH + 'px' });
    OW.box = { left, top, w: cssW, h: cssH };
    // 一枚絵の大写し（16:9）の場所。会話の窓が地図の下に重なる画面（--owdlg）では、その上の空きの真ん中
    const dl = Math.min(bh * 0.5, parseFloat(cs.getPropertyValue('--owdlg')) || 0), ah = bh - dl;
    let fw = Math.min(bw * 0.94, ah * 0.88 * 16 / 9), fh = fw * 9 / 16;
    const fl = pl + (bw - fw) / 2, ft = pt + (ah - fh) / 2;
    [D.stage, OWD.frame].forEach(el => { if (el) Object.assign(el.style, { left: fl + 'px', top: ft + 'px', width: fw + 'px', height: fh + 'px' }); });
  }
  function clearCutBox() { [D.stage, OWD.frame, OWD.cv].forEach(el => { if (el) ['left', 'top', 'width', 'height'].forEach(k => { el.style[k] = ''; }); }); }
  // 正面の物の名札（地図の上の小さな窓）
  function placeTag() {
    const el = OWD.tag; if (!el) return;
    const show = !!(OW.tagText && OW.tagAt && OW.done && !OW.busy && !OW.p.mv && !OW.cut && !KY._OV.length && OW.box);
    if (!show) { if (el.classList.contains('on')) el.classList.remove('on'); return; }
    const [x, y, lift] = OW.tagAt;
    const cx = OW.box.left + (x * TS - OW.camX + 8) * VS, cy = OW.box.top + (y * TS - OW.camY - (lift ? 14 : 4)) * VS;
    const k = Math.round(cx) + ',' + Math.round(cy);
    if (OW.tagPos !== k) { OW.tagPos = k; el.style.left = Math.round(cx) + 'px'; el.style.top = Math.round(cy) + 'px'; el.classList.toggle('below', cy < OW.box.top + 30); if (cy < OW.box.top + 30) el.style.top = Math.round(cy + (lift ? 34 : 24) * VS) + 'px'; }
    if (!el.classList.contains('on')) el.classList.add('on');
  }

  /* ═════════════════════════ 地図の用意 ═════════════════════════ */
  function sceneOf(id, w) { if (id === 'town') return 'town_map'; const a = KY.getArea(id); return (a && a.worlds[w] && a.worlds[w].scene) || id; }
  function dangerHere() { return OW.mapId === 'town' ? (FIELD_DANGER[OW.world] || 0) : KY.dangerOf(OW.mapId, OW.world); }
  function noiseOn() { return (OW.world === 'B' || OW.world === 'C') && dangerHere() > 0; }
  function so() { const s = S(); if (!s.ow || typeof s.ow !== 'object') s.ow = {}; if (!s.ow.pos || typeof s.ow.pos !== 'object') s.ow.pos = {}; return s.ow; }
  function freeTile(x, y) {
    const m = OW.m; if (!m || MP.solidAt(m, x, y)) return false;
    if (OW.objs.some(o => o.sprite && o.x === x && o.y === y)) return false;
    if (OW.amb.some(a => a.x === x && a.y === y)) return false;
    return true;
  }
  function nudge(x, y) {
    if (freeTile(x, y) && !MP.warpAt(OW.m, x, y)) return [x, y];
    for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      if (freeTile(x + dx, y + dy) && !MP.warpAt(OW.m, x + dx, y + dy)) return [x + dx, y + dy];
    }
    return [x, y];
  }
  // 保存された位置が使えるか（壁・出入口の上・入口から歩いて行けない所なら使わない＝地図が変わった古いセーブ）
  function validPos(m, pos) {
    if (!Array.isArray(pos) || MP.solidAt(m, pos[0], pos[1]) || MP.warpAt(m, pos[0], pos[1])) return false;
    const key = m.id + '/' + m.world; OW.reach = OW.reach || {};
    if (!OW.reach[key]) OW.reach[key] = MP.bfs(m, m.spawn[0], m.spawn[1], null);
    return OW.reach[key].has(pos[0] + ',' + pos[1]);
  }
  function fadeIn() { OW.fade = KY.reduced() ? null : { dir: 'in', t0: now(), dur: 240 }; }
  function setMap(id, world, pos) {
    const changedWorld = OW.mapId === id && OW.world !== world;
    const prevStat = OW.stat;
    OW.mapId = id; OW.world = world; OW.m = MP.compile(id, world);
    if (id === 'town') OW.m = withExtraEntrances(OW.m);
    OW.palK = palKeyFor(id, world);
    OW.statKey = '';
    buildStatic();
    fitView();
    if (changedWorld && prevStat && !KY.reduced()) OW.flick = { prev: prevStat, t0: now(), until: now() + 360 };
    if (pos) { OW.p.x = pos[0]; OW.p.y = pos[1]; if (pos[2]) OW.p.dir = pos[2]; }
    OW.p.mv = null; OW.path = null; OW.pathThen = null;
    buildAmbient();
    OW.follower = null;
  }
  // 町に入口の無い場所（後から足した場所など）は、広場の「？」の立て札から入れるようにする
  const EXTRA_SLOTS = [[24, 27], [22, 27], [26, 27], [23, 28], [25, 28], [27, 26], [21, 31]];
  function withExtraEntrances(m) {
    const known = new Set(Object.keys(MP.ENTRANCES).map(k => MP.ENTRANCE_ALIAS[k] || k));
    const extra = (OW.list || []).filter(id => !known.has(id) && !/^center_/.test(id));
    if (!extra.length) return m;
    const warps = m.warps.slice();
    extra.forEach((id, i) => { const sl = EXTRA_SLOTS[i % EXTRA_SLOTS.length]; if (!MP.solidAt(m, sl[0], sl[1])) warps.push({ x: sl[0], y: sl[1], to: id, extra: true }); });
    return Object.assign({}, m, { warps });
  }
  function buildStatic() {
    const key = OW.mapId + '/' + OW.world + '/' + OW.palK + '/' + (KY.has('basement_open') ? 1 : 0);
    if (key === OW.statKey && OW.stat) return;
    OW.statKey = key; OW.stat = renderStatic(OW.m, OW.world, OW.palK);
  }
  function buildAmbient() {
    const L = (MP.AMBIENT[OW.mapId] && MP.AMBIENT[OW.mapId][OW.world]) || [];
    OW.amb = L.map(([x, y, sprite, text]) => ({ x, y, hx: x, hy: y, sprite, dir: 'd', text, mv: null, next: now() + 1500 + Math.random() * 3000 }));
  }
  // 調べ物 → 地図の上の物（同じマスの調べ物はまとめる）
  function buildObjects() {
    const id = OW.mapId, w = OW.world, m = OW.m, s = S();
    const spots = KY.spotsOf(id, w);
    const byTile = new Map(), out = [];
    const seenOf = sp => Object.keys(s.seen).some(k => k.indexOf(id + '/' + w + '/' + sp.id + '/') === 0);
    const reach = MP.bfs(m, m.spawn[0], m.spawn[1], null);
    for (const sp of spots) {
      const e = MP.spotEntry(id, sp.id);
      let x, y, sprite = null, dir = 'd', unmapped = false;
      if (e !== undefined) {
        const p = MP.parseSpot(e); const at = p.at || m.anchors[p.anchor];
        if (at) { x = at[0]; y = at[1]; sprite = p.sprite; dir = p.dir; }
      }
      if (x == null) {
        unmapped = true;
        const key = id + '/' + sp.id;
        if (!OW.logged[key]) { OW.logged[key] = 1; console.info('[KY_WORLD] 地図に置き場所のない調べ物（「？」で置く）：', id, sp.id, sp.label || ''); }
        const pr = (m.def && m.def.proj) || [1, 1, m.w - 2, m.h - 2];
        const cx = (sp.x || 0) + (sp.w || 0) / 2, cy = (sp.y || 0) + (sp.h || 0) / 2;
        let tx = Math.round(pr[0] + cx * (pr[2] - pr[0])), ty = Math.round(pr[1] + cy * (pr[3] - pr[1]));
        let best = null, bd = 1e9;
        for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) {
          if (!reach.has(xx + ',' + yy) || MP.warpAt(m, xx, yy) || byTile.has(xx + ',' + yy)) continue;
          if (xx === OW.p.x && yy === OW.p.y) continue;
          const d = Math.abs(xx - tx) + Math.abs(yy - ty); if (d < bd) { bd = d; best = [xx, yy]; }
        }
        if (!best) continue;
        [x, y] = best; sprite = 'q';
      }
      if (!sprite && MP.walkable(MP.at(m, x, y))) sprite = 'mark';
      const k = x + ',' + y;
      let o = byTile.get(k);
      if (!o) { o = { x, y, sprite, dir, spots: [], unmapped, seen: true, live: false }; byTile.set(k, o); out.push(o); }
      else if (sprite && (!o.sprite || o.sprite === 'mark' || o.sprite === 'q') && PERSON.has(sprite)) { o.sprite = sprite; o.dir = dir; }
      o.spots.push(sp);
      if (!seenOf(sp)) o.seen = false;
      if (sp.on) o.live = true;
    }
    // 位置が同じ人物は前の向きを保つ
    out.forEach(o => { const old = OW.objs.find(p => p.x === o.x && p.y === o.y && p.sprite === o.sprite); if (old) o.dir = old.dir; o.person = PERSON.has(o.sprite); });
    OW.objs = out;
    // シロがその場にいるときは、ついて来るシロは出さない
    OW.shiroHere = out.some(o => o.sprite === 'shiro');
  }
  function objAt(x, y) { return OW.objs.find(o => o.x === x && o.y === y) || null; }
  function ambAt(x, y) { return OW.amb.find(a => a.x === x && a.y === y) || null; }

  /* ═════════════════════════ 探索の画面（systems.js の UI を差し替え） ═════════════════════════ */
  const ORIG = { exMap: KY.UI.exMap, exArea: KY.UI.exArea, exClose: KY.UI.exClose };
  function activate() {
    if (!ensureDom()) return false;
    if (!OW.active) { OW.active = true; setLayout(true); OW.last = 0; if (!OW.raf) OW.raf = requestAnimationFrame(frame); try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {} }
    return true;
  }
  function deactivate() {
    OW.active = false; OW.done = null; OW.busy = false; OW.cut = false; OW.acting = null; OW.path = null; OW.pathThen = null; OW.trans = null; OW.keys = []; OW.pad = null;
    setLayout(false);
    if (OWD.name) OWD.name.classList.remove('on');
    if (OWD.tag) OWD.tag.classList.remove('on');
    OW.fade = null;
  }
  function showName(text) {
    if (!OWD.name) return;
    OWD.name.textContent = text; OWD.name.classList.remove('on'); void OWD.name.offsetWidth; OWD.name.classList.add('on');
    clearTimeout(OWD.nameT); OWD.nameT = setTimeout(() => OWD.name.classList.remove('on'), 1800);
  }
  function cutOff() {
    OW.cut = false; if (D.stageWrap) D.stageWrap.classList.remove('cut'); if (OWD.hl) OWD.hl.hidden = true;
  }
  function cutOn(rect) {
    OW.cut = true; D.stageWrap.classList.add('cut');
    if (rect && OWD.hl) { const pad = 0.015; OWD.hl.hidden = false; OWD.hl.style.left = clamp(rect.x - pad, 0, 1) * 100 + '%'; OWD.hl.style.top = clamp(rect.y - pad, 0, 1) * 100 + '%'; OWD.hl.style.width = clamp(rect.w + pad * 2, 0.03, 1) * 100 + '%'; OWD.hl.style.height = clamp(rect.h + pad * 2, 0.03, 1) * 100 + '%'; }
    else if (OWD.hl) OWD.hl.hidden = true;
  }
  function availList() { return OW.mode === 'field' ? (OW.list || []) : KY.exploreAreas(OW.opts || {}); }
  function exMap(opts, list) {
    if (!ensureDom()) return ORIG.exMap(opts, list);
    return KY._pend(done => {
      OW.opts = opts; OW.list = list; OW.mode = 'field';
      cutOff();
      if (OW.pendingWarp && list.indexOf(OW.pendingWarp) >= 0) { const id = OW.pendingWarp; OW.pendingWarp = null; done(id); return; }
      OW.pendingWarp = null;
      const s = S(), w = s.baseWorld || 'A';
      KY._hudExtra.loc = '月代町'; KY._hud();
      KY.stageOpts({}); KY.scene('town_map', w); KY._ambLayer([]);
      let pos = null;
      const m = MP.compile('town', w);
      if (OW.lastArea) {
        const ek = Object.keys(MP.ENTRANCES).find(k => (MP.ENTRANCE_ALIAS[k] || k) === OW.lastArea) || (/^center_/.test(OW.lastArea) ? '@center' : null);
        if (ek) { const [ex, ey] = MP.ENTRANCES[ek]; pos = MP.entryFor(m, { x: ex, y: ey }); }
      }
      const sv = so().field;
      if (!pos && validPos(m, sv)) pos = sv;
      if (!pos) pos = m.spawn;
      const entering = OW.mapId !== 'town' || OW.world !== w;
      OW.objs = []; setMap('town', w, null);
      OW.p.x = pos[0]; OW.p.y = pos[1]; OW.p.dir = pos[2] || 'd';
      OW.lastArea = null;
      OW.done = done; OW.busy = false; OW.acting = null;
      activate();
      if (entering) { showName('月代町' + (w !== 'A' ? '（' + KY.WORLD_LABEL[w] + '）' : '')); fadeIn(); }
      else if (OW.fade && OW.fade.dir === 'out') fadeIn();
      savePos();
      renderPanel();
    });
  }
  function exArea(id, opts) {
    if (!ensureDom()) return ORIG.exArea(id, opts);
    return KY._pend(done => {
      OW.opts = opts; OW.mode = 'area';
      cutOff();
      const w = S().world;
      const entering = OW.mapId !== id;
      let pos = null;
      if (entering) {
        const m = MP.compile(id, w);
        if (OW.arriveFrom) pos = MP.arrival(m, OW.arriveFrom);
        else { const sv = so().pos[id]; if (validPos(m, sv)) pos = sv; }
        if (!pos) pos = m.spawn;
        OW.arriveFrom = null;
        OW.objs = [];
        setMap(id, w, pos);
        showName(KY.areaName(id) + (w !== 'A' ? '（' + KY.WORLD_LABEL[w] + '）' : ''));
        fadeIn();
      } else if (OW.world !== w) {
        setMap(id, w, [OW.p.x, OW.p.y, OW.p.dir]);
      } else buildStatic();
      if (OW.fade && OW.fade.dir === 'out') fadeIn();
      buildObjects();
      if (entering || OW.world !== w) { const [nx, ny] = nudge(OW.p.x, OW.p.y); OW.p.x = nx; OW.p.y = ny; }
      else if (!freeTile(OW.p.x, OW.p.y)) { const [nx, ny] = nudge(OW.p.x, OW.p.y); OW.p.x = nx; OW.p.y = ny; }
      OW.done = done; OW.busy = false; OW.acting = null;
      activate();
      savePos();
      renderPanel();
    });
  }
  function exClose() {
    try { ORIG.exClose(); } catch (e) {}
    if (OW.active) deactivate();
    OW.mapId = null; OW.objs = [];
  }
  Object.assign(KY.UI, { exMap, exArea, exClose });
  KY._reset.push(() => { if (OW.active) deactivate(); OW.mapId = null; OW.objs = []; OW.pendingWarp = null; OW.arriveFrom = null; OW.lastArea = null; });

  // #scene で別の場面が出たら、額縁の大写しで見せる
  const origScene = KY.scene;
  KY.scene = function (id, world) {
    const r = origScene.apply(this, arguments);
    try {
      if (OW.active && OW.acting && OW.mode === 'area') {
        const w = world || S().world;
        if (id && (id !== sceneOf(OW.mapId, OW.world) || w !== OW.world)) cutOn(null);
      }
    } catch (e) {}
    return r;
  };

  function emit(it) {
    const d = OW.done; if (!d) return;
    OW.done = null; OW.busy = true; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    if (D.ex) D.ex.hidden = true;
    d(it);
  }
  // 扉・出入口：網点で暗くしてから次へ
  function fadeEmit(it, direct) {
    const d = OW.done; if (!d) return;
    OW.done = null; OW.busy = true; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    if (D.ex) D.ex.hidden = true;
    KY.se('door');
    const dur = KY.reduced() ? 60 : 200;
    OW.fade = { dir: 'out', t0: now(), dur };
    setTimeout(() => { d(it); }, dur + 20);
  }
  function savePos() {
    const o = so(), v = [OW.p.x, OW.p.y, OW.p.dir];
    if (OW.mapId === 'town') o.field = v; else if (OW.mapId) o.pos[OW.mapId] = v;
  }

  /* ═════════════════════════ 下のパネル ═════════════════════════ */
  function navBtn(label, fn, cls) { const b = KY._button('', fn, 'nav-btn ' + (cls || '')); b.append(KY._icon(cls && cls.indexOf('switch') >= 0 ? 'switch' : cls && cls.indexOf('menu') >= 0 ? 'item' : 'map'), $('span', '', label)); return b; }
  function renderPanel() {
    if (!D.ex || !OW.done) return;
    const s = S(), opts = OW.opts || {}, field = OW.mode === 'field';
    KY._hideDlg && KY._hideDlg();
    D.ex.hidden = false; D.ex.innerHTML = ''; D.ex.dataset.mode = field ? 'owmap' : 'owarea';
    KY._hudExtra.loc = field ? '月代町' : KY.areaName(OW.mapId); KY._hud();
    const top = $('div', 'ex-top');
    if (field) top.append($('span', 'ex-tag', '月代町'));
    else {
      const w = s.world, d = KY.dangerOf(OW.mapId, w);
      top.append($('span', 'ex-tag', KY.areaName(OW.mapId)));
      if (s.sync >= 2 || w !== 'A') { const wc = $('span', 'ex-world', KY.WORLD_LABEL[w]); wc.dataset.w = w; top.appendChild(wc); }
      const dz = $('span', 'ex-danger', '危険度 ' + d + '｜' + KY.DANGER_TXT[d]); dz.dataset.d = d; top.appendChild(dz);
      const ws = KY.worldsOf(OW.mapId);
      if (s.sync >= 1 && ws.length > 1) { const other = ws.filter(x => x !== w).some(x => KY.spotsOf(OW.mapId, x).some(sp => sp.on)); if (other) top.appendChild($('span', 'ex-sense', s.sync >= 2 ? '境界反応あり' : 'シロが耳を立てている')); }
      if (s.world !== s.baseWorld) top.appendChild($('span', 'ex-sense warn', (s.sync >= 3 ? '切替中' : '観測のみ') + '（あと' + (G.switchLeft | 0) + '回）'));
    }
    const hn = KY.hintText(opts);
    top.appendChild($('span', 'ex-goal', hn ? '目的：' + hn : field ? '行きたい場所の入口まで歩く' : ''));
    OWD.near = $('div', 'ow-near', '');
    const pad = $('div', 'ow-pad');
    const dp = $('div', 'ow-dpad'); dp.setAttribute('aria-label', '十字キー');
    [['u', '▲', '上'], ['l', '◀', '左'], ['r', '▶', '右'], ['d', '▼', '下']].forEach(([d, g, l]) => { const b = $('button', 'ow-d ow-d-' + d, g); b.type = 'button'; b.dataset.d = d; b.setAttribute('aria-label', l); dp.appendChild(b); });
    dp.appendChild($('i', 'ow-dc'));
    bindPad(dp);
    const ab = $('div', 'ow-ab');
    const bA = $('button', 'ow-btn ow-a', 'A'); bA.type = 'button'; bA.setAttribute('aria-label', 'A：調べる・話す');
    const bB = $('button', 'ow-btn ow-b', 'B'); bB.type = 'button'; bB.setAttribute('aria-label', 'B：メニュー');
    bA.addEventListener('click', e => { e.preventDefault(); pressA(); });
    bB.addEventListener('click', e => { e.preventDefault(); openMenu(); });
    ab.append(bB, bA);
    pad.append(dp, ab);
    const nav = $('div', 'ex-nav');
    if (KY.exReady(opts)) nav.appendChild(navBtn('調査を終える', () => doFinish(), 'finish primary'));
    if (!field && s.sync >= 2 && KY.worldsOf(OW.mapId).length > 1) nav.appendChild(navBtn('境界観測', () => openSwitch(), 'switch'));
    if (!(OW.m && OW.m.def && OW.m.def.noExit)) nav.appendChild(navBtn('町の地図', () => openTravel(), 'travel'));
    nav.appendChild(navBtn('メニュー', () => openMenu(), 'menu'));
    const keys = $('div', 'ow-keys', '矢印/WASD：歩く（Shift で走る）　Z・Enter：調べる／話す　X：メニュー　画面タップ：そこまで歩く');
    D.ex.append(top, OWD.near, keys, pad, nav);
    OW.near = null; updateNear(true);
  }
  function bindPad(dp) {
    const set = d => { OW.pad = d; dp.querySelectorAll('.ow-d').forEach(b => b.classList.toggle('on', b.dataset.d === d)); };
    const pick = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const b = el && el.closest && el.closest('.ow-d'); return b ? b.dataset.d : null; };
    dp.addEventListener('pointerdown', e => { e.preventDefault(); try { dp.setPointerCapture(e.pointerId); } catch (er) {} OW.path = null; set(pick(e)); });
    dp.addEventListener('pointermove', e => { if (OW.pad != null || e.buttons) { const d = pick(e); if (d) set(d); } });
    const up = () => set(null);
    dp.addEventListener('pointerup', up); dp.addEventListener('pointercancel', up); dp.addEventListener('lostpointercapture', up);
    dp.addEventListener('click', e => e.preventDefault());
  }
  function facing() { const [dx, dy] = DIRV[OW.p.dir]; return [OW.p.x + dx, OW.p.y + dy]; }
  function targetAhead() {
    const [fx, fy] = facing();
    let o = objAt(fx, fy) || ambAt(fx, fy);
    if (!o && 'dSm'.indexOf(MP.at(OW.m, fx, fy)) >= 0) { const [dx, dy] = DIRV[OW.p.dir]; const o2 = objAt(fx + dx, fy + dy) || ambAt(fx + dx, fy + dy); if (o2 && (o2.person || o2.text)) o = o2; }
    return o;
  }
  function updateNear(force) {
    if (!OWD.near || !OW.done) { OW.nearT = null; return; }
    let t = '', tag = '', tgt = null, at = null;
    if (!OW.p.mv) {
      const o = targetAhead();
      const [fx, fy] = facing();
      if (o && o.spots) { const lb = o.spots.map(sp => sp.label || sp.id).join('／'); t = 'Ａ：' + lb; tag = lb; tgt = [o.x, o.y, o.person || o.sprite === 'shiro' ? 1 : 0]; }
      else if (o && o.text) { t = 'Ａ：話しかける'; tag = String(o.text).split('|')[0]; tgt = [o.x, o.y, 1]; }
      else if (OW.mode === 'field') { const wp = MP.warpAt(OW.m, fx, fy); if (wp) { t = '▶ ' + fieldLabel(wp); tag = fieldLabel(wp); at = [fx, fy, 0]; } }
      if (!tag && KT && !MP.walkable(MP.at(OW.m, fx, fy))) { const nm = KT.name(OW.m, fx, fy, OW.world); if (nm) { tag = nm; at = [fx, fy, 0]; } }
      if (tgt) at = tgt;
    }
    OW.nearT = tgt;
    OW.tagAt = at;
    if (tag !== OW.tagText && OWD.tag) { OW.tagText = tag; OWD.tag.textContent = tag; OW.tagPos = ''; }
    if (t !== OW.near || force) { OW.near = t; OWD.near.textContent = t || ' '; OWD.near.classList.toggle('on', !!t); }
  }
  function fieldLabel(wp) {
    const id = resolveEntrance(wp);
    if (wp.to === '@center') return MP.FIELD_LABELS['@center'];
    return KY.AREAS[wp.to] ? KY.areaName(wp.to) : (MP.FIELD_LABELS[wp.to] || wp.to) + (id ? '' : '');
  }

  /* ═════════════════════════ メニュー（B / X） ═════════════════════════ */
  function gbList(title, sub, items, cls) {
    const h = KY._openOv('ov-choice ow-menu ' + (cls || ''), { label: title });
    const box = $('div', 'ky-win choice-box');
    box.appendChild($('div', 'choice-q', title));
    if (sub) box.appendChild($('div', 'choice-s', sub));
    const btns = [];
    items.forEach(it => {
      if (it.head) { box.appendChild($('div', 'ow-mhead', it.head)); return; }
      const b = KY._button('', () => { h.close(); it.fn(); }, 'choice-btn ' + (it.cls || ''));
      b.appendChild($('span', 'choice-t', it.t)); if (it.s) b.appendChild($('span', 'choice-s', it.s));
      if (it.off) { b.classList.add('off'); b.title = it.off; }
      if (it.disabled) b.disabled = true;
      box.appendChild(b); btns.push(b);
    });
    const close = KY._button('とじる', () => h.close(), 'ghost ow-close');
    box.appendChild(close); btns.push(close);
    h.el.appendChild(box);
    h.esc = () => h.close();
    h.key = e => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 's' || k === 'w') {
        e.preventDefault(); const list = btns.filter(b => !b.disabled); let i = list.indexOf(document.activeElement);
        i = (k === 'ArrowDown' || k === 's') ? (i + 1) % list.length : (i - 1 + list.length) % list.length; list[i].focus(); return true;
      }
      if (k === 'x' || k === 'X' || k === 'Backspace') { e.preventDefault(); h.close(); return true; }
      if (k === 'z' || k === 'Z') { e.preventDefault(); const b = document.activeElement; if (b && b.tagName === 'BUTTON' && box.contains(b)) b.click(); return true; }
      return false;
    };
    KY._focusFirst(box);
    return h;
  }
  function openMenu() {
    if (!OW.done) return;
    const s = S(), field = OW.mode === 'field', items = [];
    if (KY.exReady(OW.opts)) items.push({ t: '調査を終える', s: '次へ進む', fn: doFinish, cls: 'finish' });
    if (!field && s.sync >= 2 && KY.worldsOf(OW.mapId).length > 1) items.push({ t: '境界観測', s: 'ほかの層を見る（シロ同期 Lv' + s.sync + '）', fn: openSwitch });
    if (!field) items.push({ t: 'あたりを調べる', s: 'この場所全体を調べる・撮る・録る', fn: () => openActs({ spots: [null], x: OW.p.x, y: OW.p.y }) });
    items.push({ t: '持ち物', s: '医療用品・境界安定剤を使う', fn: openItems });
    items.push({ t: '観測ボード', fn: () => KY.openMenu('board') });
    items.push({ t: '調査手帳', fn: () => KY.openMenu('notebook') });
    if (!(OW.m && OW.m.def && OW.m.def.noExit)) items.push({ t: '町の地図', s: '行ける場所へすぐ移動する', fn: openTravel });
    items.push({ t: 'メニュー', s: 'セーブ・設定・ログ', fn: () => KY.openMenu() });
    gbList('メニュー', field ? '月代町' : KY.areaName(OW.mapId), items);
  }
  function doFinish() {
    if (!OW.done || !KY.exReady(OW.opts)) return;
    if (OW.mode === 'field') { const d = OW.done; OW.done = null; OW.busy = true; D.ex.hidden = true; KY.stageOpts({}); d(KY.EX_FINISH); }
    else emit({ nav: 'finish' });
  }
  function openSwitch() {
    if (!OW.done || OW.mode !== 'area') return;
    const s = S(), ws = KY.worldsOf(OW.mapId).filter(w => w !== s.world);
    const items = ws.map(w => ({ t: KY.WORLD_LABEL[w] + (w === s.baseWorld ? '（元の層へ戻る）' : ''), s: (KY.hasEquip('portable_observer') ? '危険度 ' + KY.dangerOf(OW.mapId, w) + '｜' + KY.DANGER_TXT[KY.dangerOf(OW.mapId, w)] + '・' : '') + (KY.hasEquip('shiro_link') ? '' : '切替で安定度が少し減る'), cls: 'sw-btn', fn: () => emit({ nav: 'switch', to: w }) }));
    gbList('境界観測：どの層を見る？', 'シロ同期 Lv' + s.sync + '｜' + KY.SYNC_TXT[s.sync], items, 'ow-switch');
  }
  function openItems() {
    const s = S(), field = OW.mode === 'field';
    if (field) { KY.openMenu('items'); return; }
    const items = ['med', 'stab'].map(id => ({ t: KY.itemName(id) + ' ×' + (s.items[id] | 0), s: KY.ITEMS[id].desc, disabled: (s.items[id] | 0) <= 0 || s.stability >= 100, fn: () => emit({ nav: 'item', id }) }));
    items.push({ head: KY.itemName('battery') + ' ' + (s.items.battery | 0) + '／' + KY.ITEMS.battery.max + '　' + KY.itemName('light') + ' ' + (s.items.light | 0) + '／' + KY.ITEMS.light.max });
    gbList('持ち物｜存在安定度 ' + Math.round(s.stability), '', items, 'ow-items');
  }
  function openTravel() {
    if (!OW.done) return;
    const s = S(), list = availList(), bm = KY.hasEquip('boundary_meter');
    const items = list.filter(id => id !== OW.mapId).map(id => {
      const sub = []; if (s.areas.visited.indexOf(id) < 0) sub.push('未調査'); if (bm) sub.push('危険度 ' + KY.dangerOf(id, s.baseWorld));
      const okW = KY.worldsOf(id).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
      return { t: KY.areaName(id), s: okW ? sub.join('・') : 'この層では到達できない', disabled: !okW, cls: 'area-btn', fn: () => travelTo(id) };
    });
    if (!items.length) items.push({ head: 'ほかに行ける場所はない。' });
    gbList('町の地図', '行き先を選ぶ（歩かずに移動する）', items, 'ow-travel');
  }
  function travelTo(id) {
    if (!OW.done) return;
    OW.arriveFrom = 'town';
    if (OW.mode === 'field') { const d = OW.done; OW.done = null; OW.busy = true; D.ex.hidden = true; d(id); }
    else { OW.pendingWarp = id; OW.lastArea = OW.mapId; emit({ nav: 'map' }); }
  }

  /* ── 行動メニュー（正面の物に A） ── */
  function openActs(o) {
    if (!OW.done) return;
    const s = S(), area = OW.mapId;
    const spots = o.spots;
    // 「聞き込み」だけの人は、すぐ話す
    if (spots.length === 1 && spots[0] && (spots[0].acts || ['look']).length === 1 && (spots[0].acts || ['look'])[0] === 'talk') return act(o, spots[0], 'talk');
    const h = KY._openOv('ov-choice ow-act', { label: '行動' });
    const box = $('div', 'ky-win choice-box ow-actbox');
    const btns = [];
    spots.forEach(sp => {
      box.appendChild($('div', 'choice-q', sp ? (sp.label || sp.id) : KY.areaName(area) + '（場所全体）'));
      const row = $('div', 'ow-acts');
      KY.ACTS.forEach(A => {
        const st = KY.actState(area, sp, A.id);
        if (!st.ok && st.hide) return;
        const b = KY._button('', () => { h.close(); act(o, sp, A.id); }, 'act-btn');
        b.append(KY._icon(A.icon), $('span', 'act-l', A.label));
        if (!st.ok) { b.classList.add('off'); b.title = st.reason; }
        b.dataset.act = A.id; if (sp) b.dataset.spot = sp.id;
        row.appendChild(b); btns.push(b);
      });
      box.appendChild(row);
    });
    const close = KY._button('やめる', () => h.close(), 'ghost ow-close'); box.appendChild(close); btns.push(close);
    h.el.appendChild(box); h.esc = () => h.close();
    h.key = e => {
      const k = e.key;
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) { e.preventDefault(); let i = btns.indexOf(document.activeElement); i = (k === 'ArrowDown' || k === 'ArrowRight') ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length; btns[i].focus(); return true; }
      if (k === 'x' || k === 'X') { e.preventDefault(); h.close(); return true; }
      if (k === 'z' || k === 'Z') { e.preventDefault(); const b = document.activeElement; if (b && box.contains(b)) b.click(); return true; }
      const n = +k; if (n >= 1 && n <= 5) { const A = KY.ACTS[n - 1]; const b = btns.find(x => x.dataset.act === A.id); if (b) { e.preventDefault(); b.click(); return true; } }
      return false;
    };
    KY._focusFirst(box);
  }
  function act(o, sp, a) {
    if (!OW.done) return;
    // 人物はこちらを向く
    if (o && o.sprite && o.x != null) { const dx = OW.p.x - o.x, dy = OW.p.y - o.y; if (Math.abs(dx) + Math.abs(dy) <= 2 && (o.person || o.sprite === 'dog' || o.sprite === 'dog2' || o.sprite === 'cat')) o.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'); }
    OW.acting = { spot: sp ? sp.id : null, act: a };
    const extra = sp && MP.CUT_OPTS[sp.id];
    const big = sp && (a === 'photo' || ((a === 'look' || a === 'scan') && !(o && o.person)) || extra);
    if (big || !sp && a === 'photo') {
      if (extra) KY.stageOpts(Object.assign({}, KY.figOpts(OW.mapId, S().world), extra));
      cutOn(sp && !extra ? { x: sp.x || 0, y: sp.y || 0, w: sp.w || 0, h: sp.h || 0 } : null);
    }
    KY.se('beep');
    emit({ act: a, spot: sp ? sp.id : null });
  }

  /* ═════════════════════════ 入力 ═════════════════════════ */
  function keyDir(k) { return ({ ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' })[k] || null; }
  KY._keyhook.unshift(e => {
    if (!OW.active || !OW.done) return false;
    const d = keyDir(e.key);
    if (d) { e.preventDefault(); if (OW.keys.indexOf(d) < 0) OW.keys.push(d); OW.path = null; if (e.shiftKey) OW.run = true; return true; }
    if (e.key === 'Shift') { OW.run = true; return true; }
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) pressA(); return true; }
    if (e.key === 'x' || e.key === 'X') { e.preventDefault(); if (!e.repeat) openMenu(); return true; }
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) { e.preventDefault(); openTravel(); return true; }
    if ((e.key === 'b' || e.key === 'B') && !e.repeat && OW.mode === 'area') { e.preventDefault(); openSwitch(); return true; }
    return false;
  });
  function heldDir() { return OW.pad || OW.keys[OW.keys.length - 1] || null; }
  function pressA() {
    if (!OW.done || OW.busy || OW.p.mv || KY._OV.length) return;
    const o = targetAhead();
    if (!o) return;
    if (o.spots) return openActs(o);
    if (o.text) return talkAmb(o);
  }
  async function talkAmb(a) {
    const dx = OW.p.x - a.x, dy = OW.p.y - a.y; a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    OW.busy = true; D.ex.hidden = true;
    try { await KY.say(['x:' + a.text]); } catch (e) { if (e === KY.ABORT) return; }
    OW.busy = false;
    if (OW.done) renderPanel();
  }
  async function message(lines) {
    OW.busy = true; if (D.ex) D.ex.hidden = true;
    try { await KY.say(lines.map(l => 'n:' + l)); } catch (e) { if (e === KY.ABORT) return; }
    OW.busy = false;
    if (OW.done) renderPanel();
  }
  function onTap(e) {
    if (!OW.active || !OW.done || OW.busy || KY._OV.length || OW.cut) return;
    e.preventDefault();
    const r = OWD.cv.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * CW + OW.camX, py = (e.clientY - r.top) / r.height * CH + OW.camY;
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    goTo(tx, ty, true);
  }
  // そのマスへ歩く（物・人なら正面まで歩いて A）
  function goTo(tx, ty, interact) {
    const m = OW.m; if (!m) return false;
    if (tx === OW.p.x && ty === OW.p.y) return false;
    const o = objAt(tx, ty) || ambAt(tx, ty);
    const blocked = blockSet();
    const wp = MP.warpAt(m, tx, ty);
    if (!o && !MP.solidAt(m, tx, ty)) {
      const p = MP.path(m, OW.p.x, OW.p.y, (x, y) => x === tx && y === ty, blocked);
      if (!p) return false;
      OW.path = p; OW.pathThen = wp ? null : null; return true;
    }
    // 正面に立てるマスへ
    const goal = (x, y) => Math.abs(x - tx) + Math.abs(y - ty) === 1 && !MP.warpAt(m, x, y);
    goal.allowStart = true;
    const p = MP.path(m, OW.p.x, OW.p.y, goal, blocked);
    if (!p) return false;
    // 最後のマスから見て、物の方向
    let x = OW.p.x, y = OW.p.y; p.forEach(d => { x += DIRV[d][0]; y += DIRV[d][1]; });
    const face = tx > x ? 'r' : tx < x ? 'l' : ty > y ? 'd' : 'u';
    OW.path = p; OW.pathThen = { face, interact: !!interact && !!(o || 'wjcIaMe'.indexOf(MP.at(m, tx, ty)) >= 0 || true) };
    return true;
  }
  function blockSet() {
    const b = new Set();
    OW.objs.forEach(o => { if (o.sprite) b.add(o.x + ',' + o.y); });
    OW.amb.forEach(a => b.add(a.x + ',' + a.y));
    return b;
  }

  /* ═════════════════════════ 動き ═════════════════════════ */
  const STEP_MS = 150, RUN_MS = 85, PATH_MS = 115;
  function canEnter(x, y) {
    if (MP.solidAt(OW.m, x, y)) return false;
    if (OW.objs.some(o => o.sprite && o.x === x && o.y === y)) return false;
    if (OW.amb.some(a => (a.x === x && a.y === y) || (a.mv && a.mv.tx === x && a.mv.ty === y))) return false;
    return true;
  }
  function update(ts) {
    const p = OW.p;
    if (p.mv) {
      const t = (ts - p.mv.t0) / p.mv.dur;
      if (t >= 1) { p.x = p.mv.tx; p.y = p.mv.ty; p.mv = null; arrive(ts); }
    }
    if (!p.mv && OW.done && !OW.busy && !KY._OV.length && !OW.trans) {
      let d = null, fromPath = false;
      if (OW.path && OW.path.length) { d = OW.path[0]; fromPath = true; }
      else d = heldDir();
      if (d) {
        if (!fromPath && p.dir !== d && !OW.walking) { p.dir = d; OW.turnUntil = ts + 90; OW.walking = true; }
        else if (fromPath || ts >= OW.turnUntil) {
          p.dir = d;
          const [dx, dy] = DIRV[d], nx = p.x + dx, ny = p.y + dy;
          if (canEnter(nx, ny)) {
            if (fromPath) OW.path.shift();
            p.mv = { fx: p.x, fy: p.y, tx: nx, ty: ny, t0: ts, dur: fromPath ? PATH_MS : OW.run ? RUN_MS : STEP_MS };
            p.step = (p.step + 1) % 4;
            if (p.step % 2 === 0) KY.se('step');
            OW.walking = true;
            if (OW.follower) { OW.follower.fx = OW.follower.x; OW.follower.fy = OW.follower.y; OW.follower.tx = p.x; OW.follower.ty = p.y; OW.follower.t0 = ts; OW.follower.dur = p.mv.dur; }
          } else {
            if (fromPath) { OW.path = null; OW.pathThen = null; }
            if (ts - OW.bumpT > 450) { OW.bumpT = ts; if (!fromPath) KY.se('bump'); }
          }
        }
      } else OW.walking = false;
      if (!d && !p.mv && OW.pathThen && (!OW.path || !OW.path.length)) {
        const th = OW.pathThen; OW.pathThen = null; OW.path = null;
        if (th.face) p.dir = th.face;
        if (th.interact) { OW.pendingA = true; setTimeout(() => { OW.pendingA = false; pressA(); }, 60); }
      }
    }
    // ついて来るシロ
    const wantF = KY.has('shiro_met') && !OW.shiroHere && OW.mode;
    if (wantF && !OW.follower) { const [bx, by] = behind(); OW.follower = { x: bx, y: by, fx: bx, fy: by, tx: bx, ty: by, t0: 0, dur: 1 }; }
    if (!wantF) OW.follower = null;
    if (OW.follower) { const f = OW.follower; if (f.t0 && ts - f.t0 >= f.dur) { f.x = f.tx; f.y = f.ty; f.t0 = 0; } }
    // 町の人：ときどき向きを変える・少し歩く
    for (const a of OW.amb) {
      if (a.mv) { if (ts - a.mv.t0 >= a.mv.dur) { a.x = a.mv.tx; a.y = a.mv.ty; a.mv = null; } continue; }
      if (ts < a.next || OW.busy) continue;
      a.next = ts + 1800 + Math.random() * 3200;
      const ds = ['u', 'd', 'l', 'r'], d = ds[(Math.random() * 4) | 0]; a.dir = d;
      const near = Math.abs(a.x - p.x) + Math.abs(a.y - p.y) <= 2;
      const [dx, dy] = DIRV[d], nx = a.x + dx, ny = a.y + dy;
      if (!near && Math.random() < 0.5 && Math.abs(nx - a.hx) + Math.abs(ny - a.hy) <= 1 && !MP.warpAt(OW.m, nx, ny) && !MP.solidAt(OW.m, nx, ny) && !OW.objs.some(o => Math.abs(o.x - nx) + Math.abs(o.y - ny) <= 1) && !(nx === p.x && ny === p.y) && !(p.mv && p.mv.tx === nx && p.mv.ty === ny))
        a.mv = { tx: nx, ty: ny, fx: a.x, fy: a.y, t0: ts, dur: 260 };
    }
    for (const o of OW.objs) {
      if (!o.person || OW.busy) continue;
      if (!o.idleT) o.idleT = ts + 2500 + Math.random() * 4000;
      if (ts > o.idleT) { o.idleT = ts + 2500 + Math.random() * 4000; if (Math.abs(o.x - p.x) + Math.abs(o.y - p.y) > 2) { o.dir = Math.random() < 0.6 ? (o.home || (o.home = o.dir)) : ['u', 'd', 'l', 'r'][(Math.random() * 4) | 0]; } }
    }
    updateNear();
  }
  function behind() { const [dx, dy] = DIRV[OW.p.dir]; const bx = OW.p.x - dx, by = OW.p.y - dy; return MP.solidAt(OW.m, bx, by) ? [OW.p.x, OW.p.y] : [bx, by]; }
  function arrive(ts) {
    const p = OW.p;
    savePos();
    OW.steps++;
    if (OW.steps % 12 === 0) KY.autosaveSoon();
    const wp = MP.warpAt(OW.m, p.x, p.y);
    if (wp) { onWarp(wp, ts); return; }
    if (OW.cool > 0) { OW.cool--; return; }
    if (MP.at(OW.m, p.x, p.y) === 'n' && noiseOn() && !OW.busy && OW.done) maybeBattle();
  }
  function stepBack() {
    const p = OW.p, [dx, dy] = DIRV[p.dir];
    const bx = p.x - dx, by = p.y - dy;
    if (!MP.solidAt(OW.m, bx, by)) { p.x = bx; p.y = by; }
    p.dir = OPP[p.dir]; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    savePos();
  }
  function resolveEntrance(wp) {
    const list = availList();
    if (wp.to === '@center') return CENTER.find(id => list.indexOf(id) >= 0) || null;
    return list.indexOf(wp.to) >= 0 ? wp.to : null;
  }
  function onWarp(wp) {
    const s = S();
    if (OW.mode === 'field') {
      const id = resolveEntrance(wp);
      if (wp.rift && !id) return;   // 裂け目は、行ける時だけ開いている
      if (!id) {
        const target = wp.to === '@center' ? CENTER.find(c => KY.AREAS[c]) : wp.to;
        const open = target && KY.areaOpen(target);
        stepBack();
        message([open ? '……今は、ほかに調べることがある。' : 'ここには、まだ用がない。']);
        return;
      }
      const okW = KY.worldsOf(id).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
      if (!okW) { stepBack(); message(['この層からは、そこへ行けないようだ。']); return; }
      OW.arriveFrom = 'town';
      fadeEmit(id);
      return;
    }
    // 場所の中
    if (wp.to === 'town') {
      if (OW.m.def && OW.m.def.noExit) { stepBack(); message(['戻る道は、もう無い。']); return; }
      OW.lastArea = OW.mapId;
      fadeEmit({ nav: 'map' });
      return;
    }
    const list = availList();
    if (list.indexOf(wp.to) < 0 && /^center_/.test(wp.to) && /^center_/.test(OW.mapId)) {
      // 分室の中で、通り道の部屋が今回の調べ物に入っていないときは、そのまま建物の外（町）へ出る
      OW.lastArea = OW.mapId; fadeEmit({ nav: 'map' }); return;
    }
    if (list.indexOf(wp.to) < 0) {
      stepBack();
      const open = KY.areaOpen(wp.to);
      message([open ? '……今は、そちらに用はない。' : (KY.AREAS[wp.to] ? '扉は閉ざされている。' : 'その先へは行けない。')]);
      return;
    }
    const okW = KY.worldsOf(wp.to).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
    if (!okW) { stepBack(); message(['この層からは、その先へ行けないようだ。']); return; }
    OW.pendingWarp = wp.to; OW.arriveFrom = OW.mapId; OW.lastArea = OW.mapId;
    fadeEmit({ nav: 'map' });
  }

  /* ═════════════════════════ 境界ノイズ → 戦闘 ═════════════════════════ */
  async function maybeBattle() {
    const B = root.KY_BATTLE;
    if (!B || typeof B.encounter !== 'function' || typeof B.start !== 'function') return;
    if (!KY.has('shiro_met') || OW.cut || KY._OV.length || G.adv) return;
    const ctx = { area: OW.mapId === 'town' ? 'town' : OW.mapId, world: OW.world, danger: dangerHere(), chapter: S().chapter };
    let id = null;
    try { id = B.encounter(ctx); } catch (e) { console.error('[KY_WORLD] encounter', e); return; }
    if (!id) return;
    API.encounters = (API.encounters | 0) + 1;
    await startBattle(id, ctx);
  }
  async function startBattle(id, ctx) {
    OW.busy = true; OW.path = null; OW.pathThen = null; OW.keys = []; OW.pad = null;
    if (D.ex) D.ex.hidden = true;
    KY.se('static');
    const gen = G.gen;
    await transition('out');
    if (gen !== G.gen) return;
    let r = null;
    try { r = await root.KY_BATTLE.start(id, { area: ctx.area, world: ctx.world, danger: ctx.danger, from: 'overworld' }); }
    catch (e) { if (e === KY.ABORT) return; console.error('[KY_WORLD] battle', e); }
    if (gen !== G.gen) return;
    OW.cool = 3;                      // 戦闘直後の数歩は出ない（直後のマスでは決して出ない）
    OW.lastBattle = { id, result: r && r.result };
    API.lastBattle = OW.lastBattle;
    await transition('in');
    OW.busy = false;
    if (G.slipNow && OW.done) { emit(null); return; }   // 研究所へ押し戻し（探索ループが処理する）
    if (OW.done) renderPanel();
  }
  function transition(kind) {
    return new Promise(res => {
      const dur = KY.reduced() ? 200 : kind === 'out' ? 900 : 380;
      OW.trans = { kind, t0: now(), dur, res };
    });
  }

  /* ═════════════════════════ 描く ═════════════════════════ */
  function frame(ts) {
    if (!OW.active) { OW.raf = 0; return; }
    OW.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    try { update(ts); draw(ts); } catch (e) { if (!OW.drawErr) { OW.drawErr = 1; console.error('[KY_WORLD] draw', e); } }
  }
  function lerpPos(o, ts) {
    if (o.mv) { const t = clamp((ts - o.mv.t0) / o.mv.dur, 0, 1); return [(o.mv.fx + (o.mv.tx - o.mv.fx) * t) * TS, (o.mv.fy + (o.mv.ty - o.mv.fy) * t) * TS, t]; }
    return [o.x * TS, o.y * TS, 0];
  }
  // 網点（濃さ 1〜4 段）の模様：フェードと周辺減光に使う
  const PATS = {};
  function pat(ctx, col, lv) {
    const key = col[0] + lv; if (PATS[key]) return PATS[key];
    const c = document.createElement('canvas'); c.width = 4; c.height = 4; const x = c.getContext('2d'); x.fillStyle = col[0];
    const on = { 1: [[0, 0], [2, 2]], 2: [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]] }[lv];
    if (lv >= 4) x.fillRect(0, 0, 4, 4);
    else if (lv === 3) { x.fillRect(0, 0, 4, 4); x.clearRect(0, 0, 1, 1); x.clearRect(2, 2, 1, 1); }
    else (on || []).forEach(([a, b]) => x.fillRect(a, b, 1, 1));
    return (PATS[key] = ctx.createPattern(c, 'repeat'));
  }
  function shade(ctx, col, lv, x, y, w, h) { if (lv <= 0) return; ctx.fillStyle = pat(ctx, col, Math.min(4, lv)); ctx.fillRect(x, y, w, h); }
  function draw(ts) {
    if (D.stageWrap) { const k = D.stageWrap.clientWidth + 'x' + D.stageWrap.clientHeight + '/' + (OW.m && OW.m.id) + '/' + (root.devicePixelRatio || 1); if (k !== OW.wrapKey) { OW.wrapKey = k; fitView(); } }
    const ctx = OWD.ctx, m = OW.m; if (!m || !OW.stat) return;
    buildStatic();
    const col = palColors(OW.palK);
    const [ppx, ppy, pt] = lerpPos(OW.p, ts);
    const mw = m.w * TS, mh = m.h * TS;
    // カメラ：画面より小さい部屋は真ん中に（まわりは地の色）、大きい地図は端で止める
    let camX = mw <= CW ? -Math.floor((CW - mw) / 2) : clamp(Math.round(ppx + 8 - CW / 2), 0, mw - CW);
    let camY = mh <= CH ? -Math.floor((CH - mh) / 2) : clamp(Math.round(ppy + 8 - CH / 2), 0, mh - CH);
    OW.camX = camX; OW.camY = camY;
    ctx.fillStyle = col[0]; ctx.fillRect(0, 0, CW, CH);
    let stat = OW.stat;
    if (OW.flick) { if (ts > OW.flick.until) OW.flick = null; else if (((ts - OW.flick.t0) / 60 | 0) % 2 === 0) stat = OW.flick.prev; }
    ctx.drawImage(stat, -camX, -camY);
    // 動くマス
    const x0 = Math.max(0, Math.floor(camX / TS)), y0 = Math.max(0, Math.floor(camY / TS)), x1 = Math.min(m.w - 1, Math.floor((camX + CW) / TS) + 1), y1 = Math.min(m.h - 1, Math.floor((camY + CH) / TS) + 1);
    const nOn = noiseOn(), list = OW.mode === 'field' ? (OW.list || []) : null, fr = (ts / 120) | 0;
    const ind = !!(m.def && m.def.indoor);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = m.g[ty][tx], ox = tx * TS - camX, oy = ty * TS - camY;
      if (ch === '~') { const sh = ((ts / 400) | 0) % 4; ctx.fillStyle = col[2]; ctx.fillRect(ox + ((hash(tx, ty, 1) + sh * 2) % 10) + 2, oy + 6 + (sh % 2), 4, 1); ctx.fillRect(ox + ((hash(tx, ty, 2) + 16 - sh * 2) % 8) + 3, oy + 11, 3, 1); }
      else if (ch === 'n' && nOn) {
        const hs = hash(tx, ty, fr);
        for (let i = 0; i < 14; i++) { const v = hash(i, hs, 5); ctx.fillStyle = col[v % 3 === 0 ? 0 : v % 3 === 1 ? 1 : 3]; ctx.fillRect(ox + (v >> 3) % 15, oy + (v >> 7) % 15, 2, 1); }
        if (fr % 5 === 0) { ctx.fillStyle = col[1]; ctx.fillRect(ox, oy + (hs % 14), 16, 1); }
      }
      else if (ch === 'Z') {
        const wp = MP.warpAt(m, tx, ty); const on = wp && list && resolveEntrance(wp);
        if (on) { const ph = ((ts / 150) | 0) % 4; ctx.fillStyle = col[0]; ctx.fillRect(ox + 5, oy + 1, 6, 14); ctx.fillStyle = col[ph % 2 ? 2 : 3]; ctx.fillRect(ox + 6, oy + 2 + ph, 4, 10 - ph); ctx.fillStyle = col[1]; ctx.fillRect(ox + 3 - (ph % 2), oy + 6, 1, 4); ctx.fillRect(ox + 12 + (ph % 2), oy + 4, 1, 5); }
      }
      else if (ch === 'K' && ind && OW.world !== 'B' && KT) {
        // サーバーラックの LED
        KT.LEDS.forEach(([lx, ly], i) => { const v = hash(tx * 7 + i, ty, (fr >> 1) + i * 3); if (OW.world === 'C' && i % 3) return; ctx.fillStyle = col[v % 3 === 0 ? 3 : v % 3 === 1 ? 2 : 0]; ctx.fillRect(ox + lx, oy + ly, 1, 1); });
      }
      if (OW.mode === 'field') { const wx = MP.warpAt(m, tx, ty); if (wx && wx.extra) { const q = spriteCanvas('q', 'd', 0, OW.palK); ctx.drawImage(q, ox, oy - 2); } }
      // 町の入口の目印（行ける場所だけ・はずむ矢印）
      if (OW.mode === 'field' && ch !== 'Z') {
        const wp = MP.warpAt(m, tx, ty);
        if (wp && resolveEntrance(wp) && !(MP.warpAt(m, tx - 1, ty) && resolveEntrance(MP.warpAt(m, tx - 1, ty)))) {
          const by = oy - 9 + [0, 1, 2, 1][((ts / 160) | 0) % 4];
          ctx.fillStyle = col[0]; ctx.fillRect(ox + 4, by, 9, 4); ctx.fillRect(ox + 5, by + 4, 7, 1); ctx.fillRect(ox + 6, by + 5, 5, 1); ctx.fillRect(ox + 7, by + 6, 3, 1);
          ctx.fillStyle = col[3]; ctx.fillRect(ox + 5, by + 1, 7, 2); ctx.fillRect(ox + 6, by + 3, 5, 1); ctx.fillRect(ox + 7, by + 4, 3, 1); ctx.fillRect(ox + 8, by + 5, 1, 1);
        }
      }
    }
    // 人物・物（下にいるものほど手前）
    const ents = [];
    for (const o of OW.objs) if (o.sprite) ents.push({ y: o.y * TS, x: o.x * TS, spr: o.sprite, dir: o.dir || 'd', frame: 0, o });
    for (const a of OW.amb) { const [ax, ay, at] = lerpPos(a, ts); ents.push({ y: ay, x: ax, spr: a.sprite, dir: a.dir, frame: a.mv ? (at < 0.5 ? 1 : 0) : 0 }); }
    if (OW.follower) { const f = OW.follower; let fx = f.x * TS, fy = f.y * TS, moving = false; if (f.t0) { const t = clamp((ts - f.t0) / f.dur, 0, 1); fx = (f.fx + (f.tx - f.fx) * t) * TS; fy = (f.fy + (f.ty - f.fy) * t) * TS; moving = t < 1; } const fd = f.tx > f.fx ? 'r' : f.tx < f.fx ? 'l' : 'd'; ents.push({ y: fy, x: fx, spr: 'shiro', dir: fd, frame: moving || ((ts / 420) | 0) % 2 ? 1 : 0 }); }
    for (const o of OW.objs) if (o.sprite === 'shiro') { const e = ents.find(v => v.o === o); if (e) e.frame = ((ts / 420) | 0) % 2; }
    const pf = OW.p.mv ? (pt < 0.5 ? (OW.p.step % 2 ? 1 : 2) : 0) : 0;
    ents.push({ y: ppy, x: ppx, spr: 'player', dir: OW.p.dir, frame: pf, me: true });
    ents.sort((a, b) => a.y - b.y || (a.me ? 1 : -1));
    for (const e of ents) {
      const person = PERSON.has(e.spr);
      const cv = spriteCanvas(e.spr, e.dir, e.frame, OW.palK);
      const lift = person ? 4 : 0;
      const sx = Math.round(e.x - camX), sy = Math.round(e.y - camY - lift - (person && e.frame ? 1 : 0));
      // 足もとの影
      if (person || e.spr === 'shiro') { ctx.fillStyle = col[1]; ctx.fillRect(sx + 4, Math.round(e.y - camY) + 11, 8, 1); ctx.fillRect(sx + 5, Math.round(e.y - camY) + 12, 6, 1); }
      ctx.drawImage(cv, sx, sy);
    }
    // 調べられる物の目印：まだ調べていない物の上に、はずむ「！」の吹き出し
    const bounce = [0, -1, -2, -1][((ts / 140) | 0) % 4];
    for (const o of OW.objs) {
      if (o.seen || !o.live) continue;
      const wallItem = !MP.walkable(MP.at(m, o.x, o.y)) && !o.sprite;
      const ox = o.x * TS - camX + 4, oy = o.y * TS - camY - (o.person ? 16 : wallItem ? 12 : 10) + bounce;
      if (ox < -16 || oy < -16 || ox > CW || oy > CH) continue;
      ctx.fillStyle = col[0]; ctx.fillRect(ox, oy, 8, 10); ctx.fillRect(ox + 2, oy + 10, 3, 1); ctx.fillRect(ox + 2, oy + 11, 1, 1);
      ctx.fillStyle = col[3]; ctx.fillRect(ox + 1, oy + 1, 6, 8); ctx.fillRect(ox + 2, oy + 9, 2, 1);
      ctx.fillStyle = col[0]; ctx.fillRect(ox + 3, oy + 2, 2, 4); ctx.fillRect(ox + 3, oy + 7, 2, 1);
    }
    // 正面の調べられる物：四隅のかっこ
    const tg = OW.done && !OW.busy && !OW.p.mv ? OW.nearT : null;
    if (tg && ((ts / 400) | 0) % 3 !== 2) {
      const bx = tg[0] * TS - camX, by = tg[1] * TS - camY - (tg[2] ? 4 : 0);
      ctx.fillStyle = col[0];
      [[-1, -1, 5, 2], [-1, -1, 2, 5], [12, -1, 5, 2], [15, -1, 2, 5], [-1, 15, 5, 2], [-1, 12, 2, 5], [12, 15, 5, 2], [15, 12, 2, 5]].forEach(([x, y, w, h]) => ctx.fillRect(bx + x, by + y, w, h));
      ctx.fillStyle = col[3];
      ctx.fillRect(bx, by, 3, 1); ctx.fillRect(bx, by, 1, 3); ctx.fillRect(bx + 13, by, 3, 1); ctx.fillRect(bx + 15, by, 1, 3); ctx.fillRect(bx, by + 15, 3, 1); ctx.fillRect(bx, by + 13, 1, 3); ctx.fillRect(bx + 13, by + 15, 3, 1); ctx.fillRect(bx + 15, by + 13, 1, 3);
    }
    // 世界ごとの空気：B は周りが少し暗い（古い写真）、C は埃が舞う
    {
      if (OW.world === 'B') { shade(ctx, col, 1, 0, 0, CW, 6); shade(ctx, col, 1, 0, CH - 6, CW, 6); shade(ctx, col, 1, 0, 6, 6, CH - 12); shade(ctx, col, 1, CW - 6, 6, 6, CH - 12); shade(ctx, col, 2, 0, 0, CW, 2); shade(ctx, col, 2, 0, CH - 2, CW, 2); }
      else if (OW.world === 'C') {
        const tt = KY.reduced() ? 0 : ts / 1000;
        ctx.fillStyle = col[2];
        for (let i = 0; i < 18; i++) { const v = hash(i, 7, 77); const x = ((v % 997) + tt * (6 + v % 5)) % CW, y = (((v >> 10) % 991) + tt * (9 + (v >> 4) % 7)) % CH; ctx.fillRect(x | 0, y | 0, 1, 1); }
      }
    }
    // 安定度が低いと、ときどき横にずれる
    const st = S().stability;
    if (st < 30 && !KY.reduced() && Math.random() < (30 - st) / 300) { const y = (Math.random() * CH) | 0, hh = 3 + (Math.random() * 10 | 0); try { ctx.drawImage(OWD.cv, 0, y, CW, hh, ((Math.random() - 0.5) * 12) | 0, y, CW, hh); } catch (e) {} }
    // 大写しの間は、地図を網点で暗くする
    if (OW.cut) shade(ctx, col, 2, 0, 0, CW, CH);
    // 扉・出入口のフェード（網点 4 段）
    if (OW.fade) {
      const f = OW.fade, t = clamp((now() - f.t0) / f.dur, 0, 1);
      const lv = f.dir === 'out' ? Math.ceil(t * 4) : 4 - Math.floor(t * 4);
      shade(ctx, col, lv, 0, 0, CW, CH);
      if (t >= 1 && f.dir === 'in') OW.fade = null;
      if (t >= 1 && f.dir === 'out' && now() - f.t0 > f.dur + 1500) OW.fade = { dir: 'in', t0: now(), dur: 200 };
    }
    // 戦闘の入り・明け
    if (OW.trans) {
      const tr = OW.trans, t = clamp((now() - tr.t0) / tr.dur, 0, 1);
      if (tr.kind === 'out') {
        if (t < 0.4) { if (((t * 10) | 0) % 2 === 0) { ctx.fillStyle = col[3]; ctx.fillRect(0, 0, CW, CH); } }
        else spiral(ctx, col, (t - 0.4) / 0.6);
      } else spiral(ctx, col, 1 - t);
      if (t >= 1) { OW.trans = null; tr.res(); }
    }
    placeTag();
  }
  // 外側からうず巻きに黒く埋める（8×8 のブロック）
  let SPIRAL = null, SPK = '';
  function spiralList() {
    const k = CW + 'x' + CH; if (SPIRAL && SPK === k) return SPIRAL;
    const W = Math.ceil(CW / 8), H = Math.ceil(CH / 8), out = []; let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    while (x0 <= x1 && y0 <= y1) { for (let x = x0; x <= x1; x++) out.push([x, y0]); for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]); if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]); if (x0 < x1) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]); x0++; y0++; x1--; y1--; }
    SPK = k; return (SPIRAL = out);
  }
  function spiral(ctx, col, t) { const L = spiralList(); const n = Math.floor(L.length * clamp(t, 0, 1)); ctx.fillStyle = col[0]; for (let i = 0; i < n; i++) ctx.fillRect(L[i][0] * 8, L[i][1] * 8, 8, 8); }

  /* ═════════════════════════ 自動プレイ・テスト用（画面タップと同じ動き） ═════════════════════════ */
  API.state = () => ({ active: OW.active, mode: OW.mode, map: OW.mapId, world: OW.world, x: OW.p.x, y: OW.p.y, dir: OW.p.dir, moving: !!OW.p.mv, busy: OW.busy, ready: !!OW.done && !OW.busy && !OW.p.mv && !(OW.path && OW.path.length) && !OW.pathThen && !OW.pendingA && !OW.trans && !KY._OV.length, cut: OW.cut, steps: OW.steps, pal: OW.palK });
  API.objects = () => OW.objs.map(o => ({ x: o.x, y: o.y, sprite: o.sprite, person: !!o.person, seen: o.seen, unmapped: !!o.unmapped, spots: o.spots.map(sp => ({ id: sp.id, label: sp.label, acts: (sp.acts || ['look']).slice() })) }));
  API.entrances = () => OW.mode !== 'field' ? [] : OW.m.warps.map(w => ({ to: w.to, x: w.x, y: w.y, go: resolveEntrance(w), rift: !!w.rift }));
  API.exits = () => OW.mode !== 'area' ? [] : OW.m.warps.map(w => ({ to: w.to, x: w.x, y: w.y }));
  API.goTo = (x, y, interact) => goTo(x, y, interact !== false);
  API.walkToSpot = id => { const o = OW.objs.find(v => v.spots.some(sp => sp.id === id)); return o ? goTo(o.x, o.y, true) : false; };
  API.walkToArea = id => {
    if (OW.mode !== 'field') return false;
    const w = OW.m.warps.find(v => resolveEntrance(v) === id); if (!w) return false;
    const p = MP.path(OW.m, OW.p.x, OW.p.y, (x, y) => x === w.x && y === w.y, blockSet());
    if (!p) return false; OW.path = p; OW.pathThen = null; return true;
  };
  API.walkToExit = to => {
    if (OW.mode !== 'area') return false;
    const ws = OW.m.warps.filter(v => v.to === (to || 'town')); if (!ws.length) return false;
    const p = MP.path(OW.m, OW.p.x, OW.p.y, (x, y) => ws.some(v => v.x === x && v.y === y), blockSet());
    if (!p) return false; OW.path = p; OW.pathThen = null; return true;
  };
  API.available = () => availList().slice();
  API.pressA = pressA;
  API.openMenu = openMenu;
  API.startBattle = (id, ctx) => startBattle(id, Object.assign({ area: OW.mapId, world: OW.world, danger: dangerHere() }, ctx || {}));
  API.noiseTiles = () => { const out = []; if (!OW.m) return out; OW.m.g.forEach((r, y) => r.forEach((c, x) => { if (c === 'n') out.push([x, y]); })); return out; };
  API.noiseOn = () => !!(OW.m && noiseOn());
  // 見た目の確認用（スクリーンショット）：探索の流れとは別に、その場所・世界の地図をそのまま出す
  API.preview = (id, world, at) => {
    world = String(world || 'A').toUpperCase(); const s = S(); s.world = world;
    OW.mode = id === 'town' ? 'field' : 'area'; OW.objs = [];
    try { KY.scene(sceneOf(id, world), world); } catch (e) {}
    setMap(id, world, null);
    const m = OW.m;
    let pos = at || (id === 'town' ? MP.entryFor(m, { x: MP.ENTRANCES['@center'][0], y: MP.ENTRANCES['@center'][1] }) : MP.arrival(m, 'town'));
    OW.p.x = pos[0]; OW.p.y = pos[1]; OW.p.dir = pos[2] || 'u';
    if (id !== 'town') buildObjects();
    activate(); fadeIn();
    if (OW.done) { const keep = OW.mode; renderPanel(); OW.mode = keep; }
    showName((id === 'town' ? '月代町' : KY.areaName(id)) + (world !== 'A' ? '（' + KY.WORLD_LABEL[world] + '）' : ''));
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
