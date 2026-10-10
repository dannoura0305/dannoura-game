// tobinezumi/client/input.js — キーボードとマウス（座標は内部解像度 480×270）
import { W, H } from './gfx.js';

export class Input {
  constructor(stage) {
    this.stage = stage;
    this.down = new Set();
    this.pressed = new Map();     // code → 押した時刻（take で 1 回だけ取り出す）
    this.mouse = { x: 0, y: 0, inside: false, buttons: 0, wheel: 0 };
    this.mouseEvents = [];        // {type:'down'|'up'|'move', button, x, y}
    this.blocked = () => false;   // 入力欄に文字を打っている間などは true
    addEventListener('keydown', e => {
      if (this._typing(e)) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || (e.ctrlKey && e.code === 'KeyZ')) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.set(e.code, { t: performance.now(), ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
      this.down.add(e.code);
    });
    addEventListener('keyup', e => { this.down.delete(e.code); });
    addEventListener('blur', () => { this.down.clear(); });
    const pos = e => {
      const r = stage.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('.tb-ui-block')) return;
      const p = pos(e); Object.assign(this.mouse, p, { inside: true }); this.mouse.buttons = e.buttons;
      this.mouseEvents.push({ type: 'down', button: e.button, x: p.x, y: p.y, shift: e.shiftKey });
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', e => {
      const p = pos(e); Object.assign(this.mouse, p, { inside: true }); this.mouse.buttons = e.buttons;
      this.mouseEvents.push({ type: 'move', x: p.x, y: p.y, buttons: e.buttons });
    });
    stage.addEventListener('pointerup', e => {
      const p = pos(e); Object.assign(this.mouse, p); this.mouse.buttons = e.buttons;
      this.mouseEvents.push({ type: 'up', button: e.button, x: p.x, y: p.y });
    });
    stage.addEventListener('pointerleave', () => { this.mouse.inside = false; });
    stage.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('wheel', e => {
      if (e.target.closest && e.target.closest('.tb-ui-block')) return;
      e.preventDefault(); this.mouse.wheel += Math.sign(e.deltaY);
    }, { passive: false });
  }
  _typing(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }
  isDown(code) { return !this.blocked() && this.down.has(code); }
  /** 押された瞬間を 1 回だけ取り出す（info を返す） */
  take(code) {
    if (this.blocked()) return null;
    const p = this.pressed.get(code);
    if (!p) return null;
    this.pressed.delete(code);
    return p;
  }
  peek(code) { return this.pressed.get(code) || null; }
  /** 方向（-1/0/1） */
  axis() {
    if (this.blocked()) return { mx: 0, my: 0 };
    const d = c => this.down.has(c);
    const mx = (d('ArrowRight') || d('KeyD') ? 1 : 0) - (d('ArrowLeft') || d('KeyA') ? 1 : 0);
    const my = (d('ArrowDown') || d('KeyS') ? 1 : 0) - (d('ArrowUp') || d('KeyW') ? 1 : 0);
    return { mx, my };
  }
  takeMouse() { const m = this.mouseEvents; this.mouseEvents = []; return m; }
  takeWheel() { const w = this.mouse.wheel; this.mouse.wheel = 0; return w; }
  endFrame() {
    const now = performance.now();
    for (const [k, v] of this.pressed) if (now - v.t > 300) this.pressed.delete(k);
  }
  clear() { this.pressed.clear(); this.mouseEvents = []; this.mouse.wheel = 0; }
}
