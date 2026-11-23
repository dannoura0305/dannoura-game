// ══════════════════════════════════════════════════════════
// 入力管理（InputManager）：ゲームパッドの違いを吸収して、共通の「論理ボタン」と「アクション」に変える
//
//  ・ゲームの進行ロジックは Gamepad API を直接読まない。ここ（window.INPUT）を経由する。
//    画面の操作は input/pad-ui.js が「論理ボタン → 既存のキー操作／画面のボタン」に橋渡しする。
//  ・論理ボタン（位置で決める。表示名は機種ごとに変える）
//      A＝下 B＝右 X＝左 Y＝上（Xbox の配置。PlayStation なら × ○ □ △、Nintendo なら B A Y X）
//      LB RB LT RT SELECT（View・Create・−） START（Menu・Options・＋） L3 R3 UP DOWN LEFT RIGHT HOME
//      軸：LX LY（左スティック） RX RY（右スティック） 値は -1〜1（遊び＝デッドゾーンを除いて付け直し）
//  ・アクション（ゲーム共通の意味）：confirm（決定）cancel（キャンセル）up/down/left/right（方向）
//      status（ステータス）menu（メニュー＝一時停止）help（操作方法）tabPrev/tabNext（メニュー切替）
//      fast（早送り）cursor（仮想カーソル）click（カーソルで押す）
//    「決定ボタンの位置」は設定で 下（A／×）か 右（B／○）を選べる（初期値は下。右なら A と B を入れ替える）。
//  ・標準配置（mapping==='standard'）でない機種は、ボタン番号をそのまま推定し、十字キーはハット軸から読む。
//    合わない機種は、診断画面（gamepad.html）でボタンを 1 つずつ押して覚えさせる（この端末に保存）。
//  ・テスト：tests/input-manager.test.mjs（navigator.getGamepads を偽物にして確かめる）
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  if (root.INPUT && root.INPUT.version) return;

  const BTN = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME'];
  const AXES = ['LX', 'LY', 'RX', 'RY'];
  // 標準配置の番号（W3C Gamepad の Standard Gamepad）
  const STD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
  const STD_AXES = { LX: 0, LY: 1, RX: 2, RY: 3 };

  // 表示名（機種の流儀ごと）
  const LABELS = {
    xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', SELECT: 'View', START: 'Menu', L3: 'L3', R3: 'R3', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', HOME: 'Home', LS: '左スティック', RS: '右スティック', DPAD: '十字キー' },
    ps: { A: '×', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', SELECT: 'Create', START: 'Options', L3: 'L3', R3: 'R3', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', HOME: 'PS', LS: '左スティック', RS: '右スティック', DPAD: '方向キー' },
    // Nintendo の配置は「位置」で数える（下＝B・右＝A）。ブラウザの標準配置も位置で並ぶ
    nintendo: { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', SELECT: '−', START: '＋', L3: 'L3', R3: 'R3', UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→', HOME: 'HOME', LS: '左スティック', RS: '右スティック', DPAD: '十字ボタン' },
  };

  /** コントローラーの名前（Gamepad.id）から流儀を推定する */
  function familyOf(id) {
    const s = String(id || '').toLowerCase();
    if (/054c|playstation|dualsense|dualshock|^wireless controller/.test(s.trim())) return 'ps';
    if (/057e|nintendo|pro controller|joy-con|switch/.test(s)) return 'nintendo';
    return 'xbox';   // Xbox・XInput・GameSir（Nova Lite 2 の Xbox／Android／iOS モード）・その他
  }
  /** 表示用の短い名前 */
  function niceName(id) {
    const s = String(id || '').replace(/\s*\((STANDARD GAMEPAD[^)]*|Vendor:[^)]*)\)\s*/gi, ' ').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').replace(/\s+/g, ' ').trim();
    return s.slice(0, 48) || 'コントローラー';
  }
  /** ハット軸（非標準配置の十字キー：-1〜1 の 8 方向＋中立 >1）を 4 方向に */
  function hatDir(v) {
    if (typeof v !== 'number' || !isFinite(v) || v > 1.05 || v < -1.05) return 0;
    const i = Math.round((v + 1) / (2 / 7));   // 0:上 1:右上 2:右 3:右下 4:下 5:左下 6:左 7:左上
    const T = [1, 1 | 2, 2, 2 | 4, 4, 4 | 8, 8, 8 | 1];
    return T[i] || 0;   // ビット：1 上 2 右 4 下 8 左
  }
  /** スティックの遊び（円形のデッドゾーン。外側は 0〜1 に付け直す） */
  function deadzone(x, y, dz) {
    const m = Math.hypot(x, y);
    if (!(m > dz)) return [0, 0];
    const k = Math.min(1, (m - dz) / (1 - dz)) / m;
    return [x * k, y * k];
  }

  // ── 設定（この端末に保存） ──
  const OPT_KEY = 'dannoura_pad_opts';
  const MAP_KEY = 'dannoura_pad_maps';
  const DEF_OPTS = { confirm: 'south', deadzone: 0.22, rumble: true, cursorSpeed: 1 };
  function lsGet(k) { try { return root.localStorage ? root.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (root.localStorage) root.localStorage.setItem(k, v); } catch (e) { /* 保存できない環境（プライベート等）はそのまま */ } }
  function loadJSON(k, d) { try { const v = JSON.parse(lsGet(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }

  const I = {
    version: 1,
    BTN, AXES, STD, LABELS,
    familyOf, niceName, hatDir, deadzone,
    opts: Object.assign({}, DEF_OPTS, loadJSON(OPT_KEY, {})),
    maps: loadJSON(MAP_KEY, {}),     // { [gamepad.id]: { buttons:{A:3,…}, axes:{LX:0,…}, hat:9 } } 学習した割り当て
    // いまの状態（論理ボタン・軸）。押した瞬間／離した瞬間は pressed / released に入る（1 フレームだけ）
    state: { buttons: {}, values: {}, axes: { LX: 0, LY: 0, RX: 0, RY: 0 }, pressed: {}, released: {}, connected: false, id: '', family: 'xbox', mapping: '', index: -1 },
    device: 'kbm',                   // 最後に使った入力：pad / touch / kbm
    pads: {},                        // index → {id, family, mapping, name, connectedAt}
    profiles: [],                    // 操作の型の積み重ね（いちばん上が今の操作）
    stats: { polls: 0, changes: 0, lagSum: 0, lagN: 0, lagMax: 0, lastPollAt: 0, pollGapSum: 0, pollGapN: 0 },
    _ls: {}, _raf: 0, _running: false, _prevTs: {}, _lastFrame: 0,

    // ── 出来事（press release connect disconnect device frame profile） ──
    on(type, fn) { (this._ls[type] = this._ls[type] || []).push(fn); return () => this.off(type, fn); },
    off(type, fn) { const L = this._ls[type]; if (L) { const i = L.indexOf(fn); if (i >= 0) L.splice(i, 1); } },
    emit(type, a, b) { const L = this._ls[type]; if (!L) return; for (const fn of L.slice()) { try { fn(a, b); } catch (e) { if (root.console) console.error('[input]', type, e); } } },

    // ── 設定 ──
    setOpt(k, v) { this.opts[k] = v; lsSet(OPT_KEY, JSON.stringify(this.opts)); this.emit('opts', this.opts); },
    setMap(id, map) { if (map) this.maps[id] = map; else delete this.maps[id]; lsSet(MAP_KEY, JSON.stringify(this.maps)); },
    /** 論理ボタンの表示名（流儀と「決定ボタンの位置」に合わせる） */
    label(b, fam) {
      const T = LABELS[fam || this.state.family] || LABELS.xbox;
      return T[b] || b;
    },
    /** アクション → 論理ボタン（決定・キャンセルは設定で入れ替わる） */
    actionButton(act) {
      const east = this.opts.confirm === 'east';
      if (act === 'confirm') return east ? 'B' : 'A';
      if (act === 'cancel') return east ? 'A' : 'B';
      return ({ status: 'Y', menu: 'START', help: 'SELECT', tabPrev: 'LB', tabNext: 'RB', fast: 'RT', cursor: 'R3', click: 'RT', up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' })[act] || null;
    },
    /** 物理（論理）ボタン → アクション名（無ければ null） */
    actionOf(b) {
      for (const a of ['confirm', 'cancel', 'status', 'menu', 'help', 'tabPrev', 'tabNext', 'fast', 'cursor']) if (this.actionButton(a) === b) return a;
      return null;
    },

    // ── 操作の型（プロファイル）：ミニゲームの開始で積み、終了で外す ──
    pushProfile(p) { if (!p) return null; const tok = { p }; this.profiles.push(tok); this.emit('profile', this.profile()); return tok; },
    popProfile(tok) { const i = tok ? this.profiles.indexOf(tok) : this.profiles.length - 1; if (i >= 0) { this.profiles.splice(i, 1); this.emit('profile', this.profile()); } },
    profile() { const t = this.profiles[this.profiles.length - 1]; return t ? t.p : null; },

    /** いまコントローラーで遊んでいるか */
    active() { return this.state.connected && this.device === 'pad'; },
    setDevice(d) { if (d !== this.device) { const old = this.device; this.device = d; this.emit('device', d, old); } },
    /** 押しているか（論理ボタン） */
    held(b) { return !!this.state.buttons[b]; },
    /** スティック（'L' か 'R'）→ {x,y}（遊び済み） */
    stick(s) { const A = this.state.axes; return s === 'R' ? { x: A.RX, y: A.RY } : { x: A.LX, y: A.LY }; },

    // ── 振動（対応環境だけ。Chrome・Edge の dual-rumble。iOS Safari などは無し） ──
    canRumble() { const gp = this.raw(); return !!(gp && ((gp.vibrationActuator && gp.vibrationActuator.playEffect) || (gp.hapticActuators && gp.hapticActuators[0]))); },
    rumble(ms, strong, weak) {
      if (!this.opts.rumble) return false;
      const gp = this.raw(); if (!gp) return false;
      try {
        const va = gp.vibrationActuator;
        if (va && va.playEffect) { va.playEffect(va.type || 'dual-rumble', { startDelay: 0, duration: ms || 120, strongMagnitude: strong == null ? 0.6 : strong, weakMagnitude: weak == null ? 0.4 : weak }).catch(() => {}); return true; }
        const ha = gp.hapticActuators && gp.hapticActuators[0];
        if (ha && ha.pulse) { ha.pulse(strong == null ? 0.6 : strong, ms || 120); return true; }
      } catch (e) { /* 振動できない機種 */ }
      return false;
    },

    /** 生の Gamepad 一覧（つながっている物だけ） */
    rawPads() {
      const nav = root.navigator;
      if (!nav || typeof nav.getGamepads !== 'function') return [];
      let ps; try { ps = nav.getGamepads(); } catch (e) { return []; }
      const out = []; for (const p of ps || []) if (p && p.connected !== false) out.push(p);
      return out;
    },
    /** 今使っているコントローラー（最後にボタンを押した物。無ければ最初の物） */
    raw() {
      const ps = this.rawPads(); if (!ps.length) return null;
      return ps.find(p => p.index === this.state.index) || ps[0];
    },

    /** 生の Gamepad 1 台 → 論理ボタン・軸（押した・値） */
    read(gp) {
      const out = { buttons: {}, values: {}, axes: { LX: 0, LY: 0, RX: 0, RY: 0 } };
      const learned = this.maps[gp.id];
      const std = gp.mapping === 'standard' && !learned;
      const bv = i => { const b = gp.buttons && gp.buttons[i]; if (b == null) return 0; if (typeof b === 'number') return b; return b.pressed ? Math.max(b.value || 0, 1) : (b.value || 0); };
      const av = i => { const v = gp.axes && gp.axes[i]; return typeof v === 'number' && isFinite(v) ? v : 0; };
      const bmap = learned && learned.buttons ? learned.buttons : STD;
      const amap = learned && learned.axes ? learned.axes : STD_AXES;
      for (const b of BTN) {
        const i = bmap[b]; let v = i == null ? 0 : bv(i);
        out.values[b] = v; out.buttons[b] = b === 'LT' || b === 'RT' ? v > 0.35 : v > 0.5;
      }
      // 非標準：トリガーが軸のこともある（学習した割り当てに LTa／RTa があれば、-1〜1 の軸を 0〜1 に）
      if (learned && learned.axes) for (const t of ['LT', 'RT']) {
        const ai = learned.axes[t + 'a'];
        if (ai != null) { const v = (av(ai) + 1) / 2; if (v > out.values[t]) { out.values[t] = v; out.buttons[t] = v > 0.35; } }
      }
      // 非標準：十字キーがハット軸（よくあるのは 9 番）
      if (!std) {
        const hi = learned && learned.hat != null ? learned.hat : (gp.axes && gp.axes.length > 9 ? 9 : -1);
        if (hi >= 0) { const h = hatDir(av(hi)); if (h) { out.buttons.UP = out.buttons.UP || !!(h & 1); out.buttons.RIGHT = out.buttons.RIGHT || !!(h & 2); out.buttons.DOWN = out.buttons.DOWN || !!(h & 4); out.buttons.LEFT = out.buttons.LEFT || !!(h & 8); } }
      }
      const dz = +this.opts.deadzone || DEF_OPTS.deadzone;
      const [lx, ly] = deadzone(av(amap.LX), av(amap.LY), dz);
      const [rx, ry] = deadzone(av(amap.RX), av(amap.RY), dz);
      out.axes.LX = lx; out.axes.LY = ly; out.axes.RX = rx; out.axes.RY = ry;
      return out;
    },

    /** 1 回ぶんの読み取り（毎フレーム）。pads と now はテスト用に渡せる */
    poll(now, pads) {
      now = typeof now === 'number' ? now : (root.performance ? performance.now() : Date.now());
      const S = this.state, st = this.stats;
      const list = pads || this.rawPads();
      st.polls++;
      if (st.lastPollAt) { st.pollGapSum += now - st.lastPollAt; st.pollGapN++; }
      st.lastPollAt = now;
      // 接続・切断（イベントが来ない端末もあるので、一覧の出入りでも見る）
      const seen = {};
      for (const gp of list) {
        seen[gp.index] = true;
        if (!this.pads[gp.index] || this.pads[gp.index].id !== gp.id) {
          this.pads[gp.index] = { id: gp.id, family: familyOf(gp.id), mapping: gp.mapping || '', name: niceName(gp.id), connectedAt: now, buttons: (gp.buttons || []).length, axes: (gp.axes || []).length };
          this.emit('connect', this.pads[gp.index], gp);
        }
      }
      for (const k of Object.keys(this.pads)) if (!seen[k]) { const p = this.pads[k]; delete this.pads[k]; this.emit('disconnect', p, Object.keys(this.pads).length); }

      // 全台の論理ボタンを合わせる（どれを使っても動く）。最後に押した台を「今の台」に
      const merged = { buttons: {}, values: {}, axes: { LX: 0, LY: 0, RX: 0, RY: 0 } };
      let anyInput = false;
      for (const gp of list) {
        const r = this.read(gp);
        let touched = false;
        for (const b of BTN) { if (r.buttons[b]) { merged.buttons[b] = true; if (!S.buttons[b]) touched = true; } merged.values[b] = Math.max(merged.values[b] || 0, r.values[b] || 0); }
        for (const a of AXES) if (Math.abs(r.axes[a]) > Math.abs(merged.axes[a])) merged.axes[a] = r.axes[a];
        if (touched || Math.abs(r.axes.LX) + Math.abs(r.axes.LY) + Math.abs(r.axes.RX) + Math.abs(r.axes.RY) > 0.5) { anyInput = true; if (touched) S.index = gp.index; }
        // 入力遅延の目安：コントローラーが値を更新した時刻（timestamp）から、ここで読むまで
        const ts = gp.timestamp;
        if (typeof ts === 'number' && ts > 0 && ts !== this._prevTs[gp.index]) {
          this._prevTs[gp.index] = ts; st.changes++;
          const lag = now - ts; if (lag >= 0 && lag < 1000) { st.lagSum += lag; st.lagN++; if (lag > st.lagMax) st.lagMax = lag; }
        }
      }
      S.pressed = {}; S.released = {};
      for (const b of BTN) {
        const was = !!S.buttons[b], is = !!merged.buttons[b];
        if (is && !was) S.pressed[b] = true;
        if (!is && was) S.released[b] = true;
      }
      S.buttons = merged.buttons; S.values = merged.values; S.axes = merged.axes;
      S.connected = list.length > 0;
      const cur = list.find(p => p.index === S.index) || list[0];
      if (cur) { S.index = cur.index; S.id = cur.id; S.family = familyOf(cur.id); S.mapping = cur.mapping || ''; }
      else { S.index = -1; S.id = ''; S.mapping = ''; }
      if (anyInput) this.setDevice('pad');
      for (const b in S.pressed) this.emit('press', b);
      for (const b in S.released) this.emit('release', b);
      this.emit('frame', S, now);
      return S;
    },

    /** 毎フレームの読み取りを始める（画面が裏にある間は止める） */
    start() {
      if (this._running) return; this._running = true;
      const raf = root.requestAnimationFrame ? root.requestAnimationFrame.bind(root) : (f => setTimeout(() => f(Date.now()), 16));
      const step = t => { this._raf = 0; if (!this._running) return; try { this.poll(t); } catch (e) { if (root.console) console.error('[input] poll', e); } this._raf = raf(step); };
      this._raf = raf(step);
    },
    stop() { this._running = false; },
  };

  // ── 端末の出来事：つないだ・外した、最後に使った入力の種類 ──
  if (root.addEventListener) {
    root.addEventListener('gamepadconnected', () => { try { I.poll(); } catch (e) { /* 次のフレームで拾う */ } });
    root.addEventListener('gamepaddisconnected', () => { try { I.poll(); } catch (e) { /* 次のフレームで拾う */ } });
    const doc = root.document;
    if (doc && doc.addEventListener) {
      doc.addEventListener('pointerdown', e => { if (e.isTrusted) I.setDevice(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'kbm'); }, true);
      doc.addEventListener('keydown', e => { if (e.isTrusted) I.setDevice('kbm'); }, true);
      doc.addEventListener('visibilitychange', () => { if (doc.hidden) I.stop(); else I.start(); });
    }
  }
  root.INPUT = I;
  if (root.document && !root.INPUT_NO_AUTOSTART) I.start();
})(typeof window !== 'undefined' ? window : globalThis);
