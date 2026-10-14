// 入力：キーボード＋マウス（ポインタロック）・ゲームパッド（Gamepad API 標準配置）・タッチ（横向き）・入力列の再生（自動テスト）。
// ゲームは 60Hz の 1 ステップごとに sample() を呼び、「押した瞬間」と「押している間」を受け取る（COMBAT_SYSTEM_SPEC §6）。
export const ACTIONS = ['attack', 'heavy', 'aim', 'dodge', 'parry', 'swap', 'reload', 'interact', 'lock', 'heal', 'pause', 'run'];

const KEYMAP = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', Space: 'dodge', KeyF: 'parry', KeyQ: 'heavy', KeyR: 'reload', KeyE: 'interact',
  KeyT: 'lock', KeyH: 'heal', Escape: 'pause', KeyP: 'pause', Tab: 'pause', Digit1: 'weapon1', Digit2: 'weapon2', KeyX: 'swap', KeyC: 'lock',
};

export class Input {
  constructor(el, opt = {}) {
    this.el = el; this.held = new Set(); this.pressQ = new Set(); this.look = { x: 0, y: 0 };
    this.device = 'kbm'; this.sens = opt.sens || 1; this.invertY = false;
    this.touch = { move: { x: 0, y: 0 }, held: new Set(), fireRelease: 0 };
    this.script = []; this.scriptHeld = new Map(); this.frame = 0; this.enabled = true;
    this.padPrev = []; this.padRunToggle = false; this.padUsed = false;
    this.locked = false; this.onPause = null; this.wheelCd = 0;
    this._bind();
  }
  _press(a) { this.pressQ.add(a); }
  _bind() {
    const kd = e => {
      if (e.repeat) { if (KEYMAP[e.code] && !['pause'].includes(KEYMAP[e.code])) e.preventDefault(); return; }
      const a = KEYMAP[e.code]; if (!a) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.device = 'kbm'; this.held.add(a); this._press(a);
    };
    const ku = e => { const a = KEYMAP[e.code]; if (a) this.held.delete(a); };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    addEventListener('blur', () => { this.held.clear(); });
    const el = this.el;
    el.addEventListener('mousedown', e => {
      if (e.pointerType === 'touch') return;
      this.device = 'kbm';
      if (!this.locked && this.wantLock && !this.wantLock()) return;
      if (!this.locked) { this.requestLock(); if (e.button === 0) return; }
      if (e.button === 0) { this.held.add('mouseL'); this._press('attack'); }
      if (e.button === 2) { this.held.add('aim'); }
      if (e.button === 1) { this._press('lock'); e.preventDefault(); }
    });
    addEventListener('mouseup', e => { if (e.button === 0) this.held.delete('mouseL'); if (e.button === 2) this.held.delete('aim'); });
    el.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (this.locked) { this.look.x += e.movementX * 0.0024 * this.sens; this.look.y += e.movementY * 0.0024 * this.sens; } });
    el.addEventListener('wheel', e => { if (!this.locked) return; e.preventDefault(); if (this.wheelCd <= 0) { this._press('swap'); this.wheelCd = 8; } }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked; this.locked = document.pointerLockElement === el;
      if (was && !this.locked) { this.held.delete('mouseL'); this.held.delete('aim'); if (this.onUnlock) this.onUnlock(); }
    });
  }
  requestLock() { try { const p = this.el.requestPointerLock && this.el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 対応していない */ } }
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* */ } }

  /** カメラ用の視点移動（描画フレームごと） */
  consumeLook() {
    const o = { x: this.look.x, y: this.look.y }; this.look.x = this.look.y = 0;
    const g = this._pad();
    if (g) { const rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0); o.x += rx * 0.045 * this.sens; o.y += ry * 0.035 * this.sens; }
    o.x += this.touch.lookX || 0; o.y += this.touch.lookY || 0; this.touch.lookX = this.touch.lookY = 0;
    return o;
  }
  _pad() {
    if (!navigator.getGamepads) return null;
    const ps = navigator.getGamepads(); for (const p of ps) if (p && p.connected) return p;
    return null;
  }
  /** 入力列：[{ f, press:['dodge'] , hold:{aim:20}, move:[x,y,frames] }]（f は今からのステップ数） */
  runScript(list) { const base = this.frame; for (const s of list) this.script.push(Object.assign({}, s, { at: base + (s.f || 0) })); this.script.sort((a, b) => a.at - b.at); }

  sample() {
    const f = this.frame++;
    const o = { moveX: 0, moveY: 0, frame: f };
    for (const a of ACTIONS) o[a] = false;
    if (this.wheelCd > 0) this.wheelCd--;
    // キーボード・マウス
    const h = this.held;
    o.moveX = (h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0);
    o.moveY = (h.has('up') ? 1 : 0) - (h.has('down') ? 1 : 0);
    o.run = h.has('run'); o.aim = h.has('aim'); o.heavy = h.has('heavy');
    for (const a of this.pressQ) {
      if (a === 'weapon1') o.wantWeapon = 'katana'; else if (a === 'weapon2') o.wantWeapon = 'handgun';
      else if (ACTIONS.includes(a) && a !== 'run' && a !== 'aim' && a !== 'heavy') o[a] = true;
      if (a === 'heavy') o.heavy = true;
    }
    this.pressQ.clear();
    // ゲームパッド（標準配置）
    const g = this._pad();
    if (g) {
      const b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.35));
      const pr = i => b(i) && !this.padPrev[i];
      const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0);
      if (Math.abs(lx) + Math.abs(ly) > 0 || g.buttons.some(x => x && x.pressed)) { this.device = 'pad'; this.padUsed = true; }
      if (this.device === 'pad') {
        o.moveX += lx; o.moveY += -ly;
        if (pr(10)) this.padRunToggle = !this.padRunToggle;
        if (Math.hypot(lx, ly) < 0.2) this.padRunToggle = false;
        o.run = o.run || this.padRunToggle || Math.hypot(lx, ly) > 0.95;
        o.aim = o.aim || b(6);
        if (pr(2)) { if (b(6)) o.reload = true; else o.attack = true; }
        if (pr(7)) o.attack = true;                                  // RT：撃つ（構え中）
        o.heavy = o.heavy || b(3);
        if (pr(0)) o.dodge = true; if (pr(1)) o.interact = true; if (pr(4)) o.parry = true; if (pr(5)) o.swap = true;
        if (pr(9)) o.pause = true; if (pr(11)) o.lock = true; if (pr(12)) o.heal = true;
      }
      this.padPrev = g.buttons.map((x, i) => b(i));
    }
    // タッチ
    const T = this.touch;
    if (T.active) {
      o.moveX += T.move.x; o.moveY += T.move.y;
      if (Math.hypot(T.move.x, T.move.y) > 0.92) o.run = true;
      for (const a of T.pressQ || []) o[a] = true; T.pressQ = [];
      if (T.held.has('aim')) o.aim = true;
      if (T.held.has('heavy')) o.heavy = true;
      if (T.fireRelease > 0) { o.aim = true; T.fireRelease--; }
    }
    // 入力列（自動テスト）
    while (this.script.length && this.script[0].at <= f) {
      const s = this.script.shift();
      for (const a of s.press || []) { if (a === 'weapon1') o.wantWeapon = 'katana'; else if (a === 'weapon2') o.wantWeapon = 'handgun'; else o[a] = true; }
      for (const [a, n] of Object.entries(s.hold || {})) this.scriptHeld.set(a, f + n);
      if (s.move) this.scriptMove = { x: s.move[0], y: s.move[1], until: f + (s.move[2] || 1) };
    }
    for (const [a, until] of this.scriptHeld) { if (f < until) o[a] = true; else this.scriptHeld.delete(a); }
    if (this.scriptMove && f < this.scriptMove.until) { o.moveX = this.scriptMove.x; o.moveY = this.scriptMove.y; }
    const m = Math.hypot(o.moveX, o.moveY); if (m > 1) { o.moveX /= m; o.moveY /= m; }
    if (!this.enabled) { for (const a of ACTIONS) if (a !== 'pause') o[a] = false; o.moveX = o.moveY = 0; }
    return o;
  }
}
function dz(v) { return Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82; }
