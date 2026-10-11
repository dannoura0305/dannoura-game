// tobinezumi/client/touch.js — スマホ・タブレットの画面ボタン（仮想スティック・方向パッド・ボタン）
// 縦向き：ゲーム画面の下の帯に並べる。横向き：画面の左右の端に重ねる。PC（タッチなし）では作っても出さない。
// ボタンは Input.press/hold（キーと同じ）か、直接の動作（チャットはキーボードを出すため押した瞬間に入力欄へ）。
import { el } from './ui.js';
import { stickVector } from './touch-logic.js';

/** 画面ごとのボタン。key＝押した瞬間、hold＝押している間、act＝動作、toggle＝切り替え */
const LAYOUTS = {
  field: {
    pad: 'stick', strip: 196,
    main: [{ id: 'jump', label: 'ジャンプ', key: 'Space', big: true }, { id: 'use', label: '調べる', key: 'KeyE' }],
    sys: [{ id: 'inv', label: '持ち物', key: 'KeyI' }, { id: 'chat', label: 'チャット', act: 'chat' }, { id: 'menu', label: 'メニュー', key: 'Escape' }],
  },
  walk: {
    pad: 'dpad', strip: 204,
    main: [{ id: 'jump', label: 'ジャンプ', key: 'Space', big: true }, { id: 'use', label: '調べる', key: 'KeyE' }],
    sys: [{ id: 'build', label: 'ビルド', key: 'KeyB' }, { id: 'inv', label: '持ち物', key: 'KeyI' }, { id: 'chat', label: 'チャット', act: 'chat' }, { id: 'menu', label: 'メニュー', key: 'Escape' }],
  },
  build: {
    pad: null, strip: 118,
    main: [],
    sys: [{ id: 'pan', label: '見回し', toggle: 'pan' }, { id: 'undo', label: '取り消し', act: 'undo' }, { id: 'rot', label: '向き', key: 'KeyR' },
      { id: 'zin', label: '拡大＋', act: 'zoomIn' }, { id: 'zout', label: '縮小－', act: 'zoomOut' }, { id: 'walk', label: '歩く', key: 'Tab' }, { id: 'inv', label: '持ち物', key: 'KeyI' }],
  },
};

export class TouchControls {
  constructor(game, parent) {
    this.game = game;
    this.enabled = false;      // タッチ用の画面か
    this.hidden = false;       // 利用者が隠した
    this.layoutName = null;
    this.flags = { pan: false };
    this.handlers = {};        // act 名 → 関数（画面が登録する）
    this.root = el('div', 'tb-touch hidden');
    this.root.id = 'tb-touch';
    parent.appendChild(this.root);
    this.showBtn = el('button', 'tc-show hidden', '操作を表示');
    this.showBtn.addEventListener('click', () => this.setHidden(false));
    parent.appendChild(this.showBtn);
    for (const ev of ['contextmenu', 'selectstart', 'dblclick']) this.root.addEventListener(ev, e => e.preventDefault());
  }
  setEnabled(on) { this.enabled = !!on; this._apply(); }
  setHidden(h) {
    this.hidden = !!h;
    const s = this.game.settings; if (s) { s.touchHidden = this.hidden; this.game.saveSettings && this.game.saveSettings(); }
    this._apply();
  }
  /** 画面が変わった：その画面のボタンに並べかえる（null で何も出さない） */
  setLayout(name) {
    if (name === this.layoutName) { this._apply(); return; }
    this.layoutName = name;
    this.flags.pan = false;
    this._build();
    this._apply();
  }
  get active() { return this.enabled && !this.hidden && !!this.layoutName; }
  _apply() {
    const vis = this.active;
    this.root.classList.toggle('hidden', !vis);
    this.showBtn.classList.toggle('hidden', !(this.enabled && this.hidden && this.layoutName));
    const L = LAYOUTS[this.layoutName];
    this.game.screen.setControls(vis, L ? L.strip : 0);
    if (!vis) this._releasePad();
  }
  /** 入力をふさぐもの（持ち物・チャット）が開いているあいだは方向とボタンを隠す */
  setBusy(b) {
    if (b === this._busy) return;
    this._busy = b;
    this.root.classList.toggle('busy', !!b);
    if (b) this._releasePad();
  }
  _releasePad() {
    const inp = this.game.input;
    inp.virt.mx = 0; inp.virt.my = 0;
    for (const c of this._held || []) inp.hold(c, false);
    this._held = new Set();
    if (this.knob) this.knob.style.transform = '';
    if (this.base && this.baseHome) this._placeBase(null);
  }

  _build() {
    this.root.innerHTML = '';
    this.knob = null; this.base = null; this._held = new Set();
    const L = LAYOUTS[this.layoutName];
    this.root.dataset.layout = this.layoutName || '';
    if (!L) return;
    if (L.pad) this._mountPad(L.pad);
    const main = el('div', 'tc-main');
    for (const b of L.main) main.appendChild(this._button(b, 'tc-btn' + (b.big ? ' big' : '')));
    this.root.appendChild(main);
    const sys = el('div', 'tc-sys');
    for (const b of L.sys) sys.appendChild(this._button(b, 'tc-sbtn'));
    const hide = this._button({ id: 'hide', label: '隠す', act: () => this.setHidden(true) }, 'tc-sbtn dim');
    sys.appendChild(hide);
    this.root.appendChild(sys);
    this.buttons = {};
    for (const b of this.root.querySelectorAll('[data-id]')) this.buttons[b.dataset.id] = b;
  }

  _button(def, cls) {
    const b = el('button', cls, `<span>${def.label}</span>`);
    b.type = 'button'; b.dataset.id = def.id;
    const inp = this.game.input;
    const down = e => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      b.classList.add('on');
      if (navigator.vibrate && def.big) try { navigator.vibrate(8); } catch (err) {}
      if (def.key) { inp.hold(def.key, true); this._held.add(def.key); }
      else if (def.toggle) { this.flags[def.toggle] = !this.flags[def.toggle]; b.classList.toggle('lit', this.flags[def.toggle]); const h = this.handlers['toggle:' + def.toggle]; if (h) h(this.flags[def.toggle]); }
      else if (typeof def.act === 'function') def.act();
      else if (def.act && def.act !== 'chat') this._act(def.act);
    };
    const up = e => {
      b.classList.remove('on');
      if (def.key) { inp.hold(def.key, false); this._held.delete(def.key); }
      void e;
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
    // キーボード（外付け）でボタンにフォーカスが残っても、Enter/Space で二重に動かないように
    b.addEventListener('click', e => { e.preventDefault(); if (def.act === 'chat') this._act('chat'); });   // キーボードは click の中で focus すると確実に出る（iOS）
    b.tabIndex = -1;
    return b;
  }
  _act(name) {
    const g = this.game;
    if (name === 'chat') { if (!g.ui.busy() && g.ui.chatWrap) g.ui.openChat(true); return; }
    const h = this.handlers[name];
    if (h) h();
  }
  /** 画面から：ボタンの動作を登録 */
  on(name, fn) { this.handlers[name] = fn; }
  setLit(id, on) { const b = this.buttons && this.buttons[id]; if (b) b.classList.toggle('lit', !!on); }
  setFlag(name, on) { this.flags[name] = !!on; this.setLit(name, on); }

  // ── 仮想スティック（地上）／方向パッド（巣の中）──
  _mountPad(kind) {
    const zone = el('div', 'tc-zone ' + kind);
    const base = el('div', 'tc-base');
    if (kind === 'dpad') base.innerHTML = '<i class="u">▲</i><i class="d">▼</i><i class="l">◀</i><i class="r">▶</i>';
    const knob = el('div', 'tc-knob');
    base.appendChild(knob);
    zone.appendChild(base);
    this.root.appendChild(zone);
    this.zone = zone; this.base = base; this.knob = knob; this.padKind = kind;
    this.baseHome = true;
    let pid = null, cx = 0, cy = 0;
    const R = () => base.offsetWidth * 0.42 || 50;
    const upd = e => {
      const dx = e.clientX - cx, dy = e.clientY - cy, r = R();
      const v = stickVector(dx, dy, r, kind === 'dpad' ? 0.28 : 0.22);
      const inp = this.game.input;
      inp.virt.mx = v.mx; inp.virt.my = v.my;
      knob.style.transform = `translate(${v.nx}px, ${v.ny}px)`;
      base.dataset.dir = (v.my < 0 ? 'u' : v.my > 0 ? 'd' : '') + (v.mx < 0 ? 'l' : v.mx > 0 ? 'r' : '');
    };
    zone.addEventListener('pointerdown', e => {
      if (pid != null) return;
      e.preventDefault();
      pid = e.pointerId;
      try { zone.setPointerCapture(pid); } catch (err) {}
      const br = base.getBoundingClientRect();
      const inBase = e.clientX >= br.left - 10 && e.clientX <= br.right + 10 && e.clientY >= br.top - 10 && e.clientY <= br.bottom + 10;
      if (kind === 'stick' && !inBase) this._placeBase(e);   // 左側のどこを触っても、そこがスティックの中心になる
      const r2 = base.getBoundingClientRect();
      cx = r2.left + r2.width / 2; cy = r2.top + r2.height / 2;
      base.classList.add('on');
      upd(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === pid) upd(e); });
    const end = e => {
      if (e.pointerId !== pid) return;
      pid = null; base.classList.remove('on'); base.dataset.dir = '';
      this._releasePad();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }
  _placeBase(e) {
    const base = this.base, zone = this.zone;
    if (!base) return;
    if (!e) { base.style.left = ''; base.style.top = ''; base.style.bottom = ''; base.style.right = ''; this.baseHome = true; return; }
    const zr = zone.getBoundingClientRect(), w = base.offsetWidth, h = base.offsetHeight;
    const x = Math.max(0, Math.min(zr.width - w, e.clientX - zr.left - w / 2));
    const y = Math.max(0, Math.min(zr.height - h, e.clientY - zr.top - h / 2));
    Object.assign(base.style, { left: x + 'px', top: y + 'px', bottom: 'auto', right: 'auto' });
    this.baseHome = false;
  }
}

/** タッチの画面か（設定 'on'/'off'/'auto'。auto は指で操作する端末、または ?touch=1） */
export function detectTouch(pref = 'auto', search = (globalThis.location && location.search) || '') {
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  const q = new URLSearchParams(search).get('touch');
  if (q === '1') return true;
  if (q === '0') return false;
  try { if (matchMedia('(pointer: coarse)').matches) return true; } catch (e) {}
  try { if (matchMedia('(hover: none)').matches && navigator.maxTouchPoints > 0) return true; } catch (e) {}
  return false;
}
