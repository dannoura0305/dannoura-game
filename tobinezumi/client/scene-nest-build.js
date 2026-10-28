// tobinezumi/client/scene-nest-build.js — C. 巣の全体モード（地下断面ビルド）
// 左のツール（1〜7）、マウスで編集、置ける所は明るく・置けない所は赤＋理由、素材の数、ホイールで拡大縮小、右ドラッグで移動、
// Ctrl+Z で直前の操作を取り消し（逆操作をサーバーへ送る）、Tab で閲覧モード、B / Esc で閉じる（閲覧モードへ）。
import { W, H } from './gfx.js';
import { el, esc, toolIconURL, furnitureIconURL } from './ui.js';
import { NestView } from './nest-view.js';
import { CELL, validateOp, structureAt, roomEdgeAt, resizeByEdge, tunnelFromDrag, tunnelCells, rectCells, roomAt, inverseOps, KIND_COST, KIND_NAME, ROOM_COST, cellAt, C } from '../shared/nest-rules.js';
import { FURNITURE, FURNITURE_ORDER, countItem, costText, addCost, halfCost } from '../shared/items.js';
import { CURIOS, CURIO_ORDER, ACHIEVEMENTS } from '../shared/collect.js';
import { curioIconURL } from './world-ui.js';
import { Gestures, snapZoom } from './touch-logic.js';
import { sfx } from './sfx.js';
import { cellPath, planDigs, digStrokeNote } from './nest-layout.js';
import { Pops } from './pops.js';

export const TOOLS = [
  { id: 'dig', name: '掘る', key: '1', hint: 'クリック・ドラッグで土を 1 マスずつ掘る' },
  { id: 'tunnel', name: '通路', key: '2', hint: 'ドラッグで通路（横・縦・斜め＝坂）' },
  { id: 'room', name: '部屋', key: '3', hint: 'ドラッグで部屋（4×3 以上）。部屋の辺をドラッグで広げる' },
  { id: 'bed', name: '寝床', key: '4', hint: '部屋をクリックで寝床にする' },
  { id: 'store', name: '倉庫', key: '5', hint: '部屋をクリックで倉庫にする' },
  { id: 'furniture', name: '家具', key: '6', hint: '部屋の中をクリックで置く（R で向き）' },
  { id: 'remove', name: '撤去', key: '7', hint: 'クリックで撤去（素材の一部が戻る）' },
];
/** タッチ用の説明 */
const TOUCH_HINT = {
  dig: 'タップで 1 マス、なぞると続けて掘る', tunnel: 'なぞって通路（横・縦・斜め＝坂）', room: 'なぞって部屋（4×3 以上）。部屋の辺の ● をつかんで広げる',
  bed: '部屋をタップで寝床にする', store: '部屋をタップで倉庫にする', furniture: '部屋の中をタップ（押したまま動かして位置を合わせ、離すと置く）', remove: 'タップで撤去（確認が出ます）',
};
const ZOOMS = [0.5, 1, 2];             // ホイール・ボタンの段階
const ZMIN = 0.5, ZMAX = 3;            // ピンチの範囲

export class NestBuildScene {
  get touchLayout() { return 'build'; }
  constructor(game) {
    this.game = game; this.view = new NestView(); this.undo = []; this.pops = new Pops();
    this.vx = 36;                       // 左のツール欄の幅（内部 px）。DOM の大きさから測る
    this.gest = new Gestures({ slop: 6, holdMs: 220 });
    game.screen.onResize(() => { if (this.dom) this._measure(); });
  }
  get VX() { return this.vx; }
  get VW() { return W - this.vx; }

  enter({ nest }) {
    const g = this.game;
    this.nest = nest;
    this.tool = this.tool || 'dig';
    this.furn = this.furn || 'lamp';
    this.rot = 0;
    this.zf = this.zf != null ? this.zf : 0.5;
    this.drag = null; this.hover = null; this.busy = Promise.resolve(); this.pending = 0;
    this.view.setData(nest.data, { fill: this._fill() });
    if (!this.cam || this._nestId !== nest.id) { this._nestId = nest.id; this.undo = []; this._fit(); this._needHome = true; }
    this._mount();
    g.ui.showHUD(false);
    this.t = 0;
    this.touchPt = null; this.gest.reset(); this.pan = null;
    const tc = g.touch;
    tc.on('undo', () => { if (!g.ui.busy()) this.doUndo(); });
    tc.on('zoomIn', () => this.zoomStep(1));
    tc.on('zoomOut', () => this.zoomStep(-1));
    tc.on('toggle:pan', on => { this.panMode = on; this._syncMenu(); });
    this.panMode = false;
    g.hud.classList.add('tb-hud-build');
    requestAnimationFrame(() => { this._measure(); if (this._needHome) { if (g.isTouch) this._fitHome(); else this._fitWhole(); } this._needHome = false; });
  }
  leave() { if (this.drag && this.drag.kind === 'dig') this._endStroke(); this.drag = null; this.game.hud.style.removeProperty('--tb-toolw'); if (this.dom) this.dom.remove(); this.dom = null; this.game.screen.clearUI(); this.game.hud.classList.remove('tb-hud-build'); }
  /** タッチ：入口と部屋が、ツール欄に隠れない所の真ん中に来るように。1 マスが指で押せる大きさ（約 24px 以上）に */
  _fitHome() {
    const d = this.nest.data, s = this.game.screen.scale || 1;
    let x0 = d.entrance.x, x1 = d.entrance.x + 1, y0 = d.surfaceY, y1 = d.surfaceY + 1;
    for (const r of d.rooms) { x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x + r.w); y0 = Math.min(y0, r.y); y1 = Math.max(y1, r.y + r.h); }
    const need = 24 / (CELL * s);
    this.zf = [0.5, 0.75, 1, 1.5, 2].find(z => z >= need - 1e-6) || 2;
    this.cam.x = (x0 + x1) / 2 * CELL; this.cam.y = (y0 + y1) / 2 * CELL;
    this._clampCam(); this._syncMenu();
  }
  /** Ver.0.9：PC：巣の全体が見える いちばん大きい拡大率（窓が広いと 0.5 より大きく） */
  _fitWhole() {
    const d = this.nest.data, pw = d.w * CELL, ph = d.h * CELL;
    this.zf = [1, 0.75, 0.5].find(z => pw * z <= this.VW - 8 && ph * z <= H - 44) || 0.5;
    this._fit(); this._clampCam(); this._syncMenu();
  }
  helpHTML() {
    if (!this.game.isTouch) return '左のツール（<b>1〜7</b>）を選んでマウスで編集。<b>ホイール</b> 拡大縮小、<b>右ドラッグ</b>・方向キー 見回し、<b>Ctrl+Z</b> 取り消し、<b>R</b> 家具の向き、<b>Tab・B</b> 歩く';
    return '<b>1 本指</b> ツール（タップで 1 回・なぞって続けて。家具は押したまま位置を合わせて離す）<br><b>2 本指</b> 動かす・つまんで拡大縮小<br><b>見回し</b> 1 本指で動かす／<b>取り消し</b>／<b>向き</b> 家具の反転<br>部屋ツールでは辺の <b>●</b> をつかんで広げる。撤去は確認が出ます。左の <b>◂</b> でツール欄をたためる';
  }
  onTouchChange() { if (this.dom) { this.dom.remove(); this._mount(); requestAnimationFrame(() => this._measure()); } }
  /** ツール欄の右端（内部 px）→ 見える範囲の左端 */
  _measure() {
    if (!this.menuEl) return;
    const sr = this.game.screen.stage.getBoundingClientRect(), mr = this.menuEl.getBoundingClientRect();
    const s = this.game.screen.scale || 1;
    this.vx = mr.width ? Math.max(0, Math.min(W * 0.4, Math.ceil((mr.right - sr.left) / s) + 2)) : 0;
    // Ver.0.9：トーストは道具の列の右の、見えている巣の真ん中に（長い文でも道具の列に重ならない）
    this.game.hud.style.setProperty('--tb-toolw', Math.round(mr.width ? Math.max(0, mr.right - sr.left) : 0) + 'px');
  }
  /** ほかの人（所有者）の編集が届いた：見学中の画面を描き直す */
  onRemoteUpdate(nest) { this.nest = nest; this.view.setData(nest.data, { fill: this._fill() }); this.hover = null; }
  _fill() { const s = this.nest.storage || []; let n = 0; for (const it of s) if (it) n += it.n; return Math.min(1, n / 60); }

  get z() { return this.zf; }
  /** ホイール・ボタン：段階を 1 つ進める（d=+1 で拡大）。sx,sy はその点を動かさない */
  zoomStep(d, sx = this.VX + this.VW / 2, sy = H / 2) {
    const z = this.zf;
    let nz = d > 0 ? ZOOMS.find(v => v > z + 1e-6) : [...ZOOMS].reverse().find(v => v < z - 1e-6);
    if (nz == null) nz = d > 0 ? Math.min(ZMAX, ZOOMS[ZOOMS.length - 1]) : ZOOMS[0];
    this.setZoom(nz, sx, sy);
  }
  setZoom(nz, sx, sy) {
    const before = this.toNest(sx, sy);
    this.zf = Math.max(ZMIN, Math.min(ZMAX, nz));
    const after = this.toNest(sx, sy);
    this.cam.x += before[0] - after[0]; this.cam.y += before[1] - after[1];
    this._clampCam(); this._syncMenu();
  }
  _fit() { this.cam = { x: (this.nest.data.w * CELL) / 2, y: (this.nest.data.h * CELL) / 2 + 4 }; }
  toScreen(px, py) { return [(px - this.cam.x) * this.z + this.VX + this.VW / 2, (py - this.cam.y) * this.z + H / 2]; }
  toNest(sx, sy) { return [(sx - this.VX - this.VW / 2) / this.z + this.cam.x, (sy - H / 2) / this.z + this.cam.y]; }

  _mount() {
    const g = this.game, nest = this.nest;
    this.dom = el('div', 'tb-scene tb-build');
    const edit = nest.canEdit;
    const top = el('div', 'tb-btop tb-ui-block');
    const mode = !edit ? '見学中（編集できません）' : nest.own ? '全体モード（ビルド）' : nest.role === 'resident' ? '共同巣の住人として編集' : '共同作業者として編集';
    top.innerHTML = `<span class="tb-bname">${esc(nest.ownerName)}の巣</span><span class="tb-bmode">${mode}</span>` +
      (nest.own ? `<button type="button" class="tb-btn tb-nestset-btn" title="訪問設定・共同作業者">巣の設定</button>` : '') +
      `<span class="tb-zoom"></span>`;
    this.dom.appendChild(top);
    if (nest.own) top.querySelector('.tb-nestset-btn').onclick = () => { if (!g.ui.busy()) g.openNestSettings(nest); };
    this.zoomEl = top.querySelector('.tb-zoom');
    // ツール（タッチでは「ツール ▾」でたためる）
    const menu = el('div', 'tb-tools tb-ui-block' + (edit ? '' : ' disabled') + (this.collapsed ? ' collapsed' : ''));
    if (g.isTouch) {
      const fold = el('button', 'tb-tool tb-fold', this.collapsed ? '▸' : '◂');
      fold.type = 'button';
      fold.onclick = () => { this.collapsed = !this.collapsed; menu.classList.toggle('collapsed', this.collapsed); fold.textContent = this.collapsed ? '▸' : '◂'; requestAnimationFrame(() => this._measure()); };
      menu.appendChild(fold);
    }
    for (const t of TOOLS) {
      const b = el('button', 'tb-tool', `<img src="${toolIconURL(t.id)}" alt=""><span>${t.name}</span><kbd>${t.key}</kbd>`);
      b.dataset.tool = t.id; b.title = g.isTouch ? TOUCH_HINT[t.id] : t.hint;
      b.onclick = () => { if (edit) this.setTool(t.id); };
      menu.appendChild(b);
    }
    this.dom.appendChild(menu);
    this.menuEl = menu;
    // 家具の小メニュー（Ver.0.5：実績のごほうびの飾りは取るまで鍵・図鑑の品を飾る）
    const fm = el('div', 'tb-furn tb-ui-block tb-scroll hidden');
    this.dom.appendChild(fm); this.furnEl = fm;
    this._fillFurn();
    // 下：素材と状態
    const bot = el('div', 'tb-bbot');
    bot.innerHTML = `<div class="tb-mats"></div><div class="tb-status"></div>`;
    this.dom.appendChild(bot);
    this.matsEl = bot.querySelector('.tb-mats'); this.statusEl = bot.querySelector('.tb-status');
    const walk = el('button', 'tb-btn tb-walkbtn tb-ui-block', g.isTouch ? '歩いてみる' : '歩いてみる（Tab）');
    walk.onclick = () => g.toWalk(this.nest);
    this.dom.appendChild(walk);
    g.hud.appendChild(this.dom);
    this._syncMenu(); this._mats();
  }
  /** 家具の一覧（ふつうの家具 → ごほうびの飾り → 図鑑の品） */
  _fillFurn() {
    const g = this.game, fm = this.furnEl;
    fm.innerHTML = '';
    const unl = g.nestCtx ? g.nestCtx().unlocks : new Set();
    for (const id of FURNITURE_ORDER) {
      const f = FURNITURE[id];
      const locked = f.unlock && !unl.has(id);
      const ach = f.unlock ? ACHIEVEMENTS.find(a => a.id === f.unlock) : null;
      const b = el('button', 'tb-furn-b' + (locked ? ' locked' : ''), `<img src="${furnitureIconURL(id, f.w, f.h)}" alt=""><span>${f.name}</span><small>${locked ? '実績「' + (ach && !ach.secret ? ach.name : '？？？') + '」で' : costText(f.cost)}</small>`);
      b.dataset.furn = id; b.onclick = () => { if (locked) { g.ui.toast('実績のごほうび：' + (ach && !ach.secret ? '「' + ach.name + '」' : 'まだ ひみつ') + 'をとると使える', 'bad'); return; } this.furn = id; this.curioItem = null; this._syncMenu(); };
      fm.appendChild(b);
    }
    const owned = Object.keys((g.collection && g.collection.owned) || {}).filter(id => CURIOS[id]).sort((a, b) => CURIO_ORDER.indexOf(a) - CURIO_ORDER.indexOf(b));
    fm.appendChild(el('div', 'tb-furn-sec', '図鑑の品を飾る' + (owned.length ? '' : '<small>（地上で光る物を拾うと増える）</small>')));
    const shown = new Set((this.nest.data.objects || []).filter(o => o.type === 'curio').map(o => o.item));
    for (const cid of owned) {
      const b = el('button', 'tb-furn-b curio' + (shown.has(cid) ? ' placed' : ''), `<img src="${curioIconURL(cid)}" alt=""><span>${CURIOS[cid].name}</span><small>${shown.has(cid) ? '飾ってある' : '素材なし・壁にも床にも'}</small>`);
      b.dataset.furn = 'curio'; b.dataset.item = cid;
      b.onclick = () => { this.furn = 'curio'; this.curioItem = cid; this._syncMenu(); };
      fm.appendChild(b);
    }
  }
  setTool(id) { this.tool = id; this.drag = null; if (id === 'furniture') this._fillFurn(); this._syncMenu(); }
  /** 共同作業者にされた・外された（nest_role）：画面を作りなおす */
  onRoleChange(nest) { this.game.go(this, { nest }); }
  _syncMenu() {
    if (!this.menuEl) return;
    for (const b of this.menuEl.children) if (b.dataset.tool) b.classList.toggle('on', b.dataset.tool === this.tool);
    this.furnEl.classList.toggle('hidden', this.tool !== 'furniture' || !this.nest.canEdit);
    for (const b of this.furnEl.children) b.classList.toggle('on', b.dataset.furn === this.furn && (this.furn !== 'curio' || b.dataset.item === this.curioItem));
    const touch = this.game.isTouch;
    this.zoomEl.textContent = '×' + (Math.round(this.z * 100) / 100) + (touch ? '' : '（ホイール）');
    const t = TOOLS.find(t => t.id === this.tool);
    if (touch) {
      this.baseHint = this.panMode ? '見回し中：なぞって動かす（もう一度「見回し」で編集にもどる）。2 本指でも動かせる・つまんで拡大縮小'
        : this.nest.canEdit ? t.name + '：' + TOUCH_HINT[t.id] + '。2 本指で動かす・つまんで拡大' : '2 本指（または「見回し」）で見回せます。「歩く」で中を歩く。';
    } else this.baseHint = this.nest.canEdit ? t.name + '：' + t.hint : 'マウス右ドラッグで見回せます。Tab で中を歩く。';
  }
  _mats() {
    const inv = this.game.inv();
    this.matsEl.innerHTML = ['grass', 'pebble', 'seed'].map(id => `<span><img src="${this.game.iconURL(id)}" alt="">${{ grass: '草', pebble: '小石', seed: '種子' }[id]} <b>${countItem(inv, id)}</b></span>`).join('');
  }

  // ───────── 入力 ─────────
  fixed() {}
  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.pops.update(dt);
    if (g.ui.busy()) { if (g.ui.modal && inp.take('Escape')) g.ui.closeModal(); inp.takeMouse(); this.gest.reset(); this.touchPt = null; if (this.drag && this.drag.kind === 'dig') { this._endStroke(); this.drag = null; } return; }
    // キー
    if (inp.take('Tab')) { g.toWalk(this.nest); return; }
    if (inp.take('KeyB') || inp.take('Escape')) { g.toWalk(this.nest); return; }
    const zk = inp.take('KeyZ');
    if (zk && zk.ctrl) this.doUndo();
    if (inp.take('KeyR')) { this.rot = this.rot ? 0 : 1; }
    if (this.nest.canEdit) for (const t of TOOLS) if (inp.take('Digit' + t.key) || inp.take('Numpad' + t.key)) this.setTool(t.id);
    if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
    // カーソルキー・WASD でも見回せる
    const ax = inp.axis();
    this.cam.x += ax.mx * 220 * dt / this.z; this.cam.y += ax.my * 220 * dt / this.z;
    const wh = inp.takeWheel();
    if (wh) this.zoomStep(-wh, inp.mouse.x, inp.mouse.y);
    this._clampCam();
    for (const ev of inp.takeMouse()) { if (ev.pt === 'mouse') this.onMouse(ev); else this.onTouch(ev); }
    for (const a of this.gest.tick(performance.now())) this._gesture(a);
    this._updateHover();
  }
  _clampCam() {
    const d = this.nest.data, mw = d.w * CELL, mh = d.h * CELL;
    const hw = this.VW / 2 / this.z, hh = H / 2 / this.z;
    this.cam.x = mw <= hw * 2 ? mw / 2 : Math.max(hw - 24, Math.min(mw - hw + 24, this.cam.x));
    this.cam.y = mh <= hh * 2 ? mh / 2 + 4 : Math.max(hh - 24, Math.min(mh - hh + 24, this.cam.y));
  }

  // ───────── タッチ：1 本指＝ツール（見回し中は移動）、2 本指＝移動・拡大縮小 ─────────
  onTouch(ev) {
    const G = this.gest;
    let acts = [];
    if (ev.type === 'down') acts = G.down(ev.id, ev.x, ev.y, ev.t);
    else if (ev.type === 'move') acts = G.move(ev.id, ev.x, ev.y, ev.t);
    else if (ev.type === 'up') acts = G.up(ev.id, ev.x, ev.y, ev.t);
    else if (ev.type === 'cancel') acts = G.cancel(ev.id);
    for (const a of acts) this._gesture(a);
  }
  _gesture(a) {
    const click = ['bed', 'store', 'furniture', 'remove'].includes(this.tool);
    const pan = this.panMode || !this.nest.canEdit;
    switch (a.type) {
      case 'start':
        if (pan) { this.pan = { x: a.x, y: a.y, cx: this.cam.x, cy: this.cam.y, touch: true }; return; }
        this.touchPt = { x: a.x, y: a.y };
        if (!click) this.onMouse({ type: 'down', button: 0, x: a.x, y: a.y, touch: true });
        return;
      case 'drag':
        if (this.pan && this.pan.touch) { this.cam.x = this.pan.cx - (a.x - this.pan.x) / this.z; this.cam.y = this.pan.cy - (a.y - this.pan.y) / this.z; this._clampCam(); return; }
        this.touchPt = { x: a.x, y: a.y };
        if (!click) this.onMouse({ type: 'move', buttons: 1, x: a.x, y: a.y, touch: true });
        return;
      case 'end':
        if (this.pan && this.pan.touch) { this.pan = null; return; }
        this.touchPt = null;
        if (click) this._touchClick(a.x, a.y);
        else this.onMouse({ type: 'up', button: 0, x: a.x, y: a.y, touch: true });
        return;
      case 'tap':
        if (pan) return;
        if (click) { this._touchClick(a.x, a.y); return; }
        if (this.tool === 'tunnel' || (this.tool === 'room' && !this._edgeAt(a.x, a.y, true))) { this.game.ui.toast(TOUCH_HINT[this.tool]); return; }
        this.onMouse({ type: 'down', button: 0, x: a.x, y: a.y, touch: true });
        this.onMouse({ type: 'up', button: 0, x: a.x, y: a.y, touch: true });
        return;
      case 'abort':
        if (this.drag && this.drag.kind === 'dig') this._endStroke();
        this.drag = null; this.pan = null; this.touchPt = null; return;
      case 'pinch-start': {
        if (this.drag && this.drag.kind === 'dig') this._endStroke();
        this.drag = null; this.pan = null; this.touchPt = null;
        this.pinch = { z0: this.z, anchor: this.toNest(a.cx, a.cy) };
        return;
      }
      case 'pinch': {
        const p = this.pinch; if (!p) return;
        this.zf = Math.max(ZMIN, Math.min(ZMAX, p.z0 * a.scale));
        // つまんだ所が指の真ん中についてくる
        this.cam.x = p.anchor[0] - (a.cx - this.VX - this.VW / 2) / this.zf;
        this.cam.y = p.anchor[1] - (a.cy - H / 2) / this.zf;
        this.pinch.last = { cx: a.cx, cy: a.cy };
        this._clampCam(); this._syncMenu();
        return;
      }
      case 'pinch-end': {
        const p = this.pinch; this.pinch = null;
        if (p) { const c = p.last || { cx: this.VX + this.VW / 2, cy: H / 2 }; this.setZoom(snapZoom(this.zf), c.cx, c.cy); }
        return;
      }
    }
  }
  /** タッチで部屋の辺をつかめるか（指は太いので、当たりを広めに） */
  _edgeAt(sx, sy, touch) {
    const [px, py] = this.toNest(sx, sy);
    const tol = touch ? Math.max(0.4, 9 / (CELL * this.z)) : 0.4;
    return roomEdgeAt(this.nest.data, px / CELL, py / CELL, tol);
  }
  /** タッチの 1 回操作（寝床・倉庫・家具・撤去）。撤去は確認してから */
  async _touchClick(sx, sy) {
    if (!this.nest.canEdit) return;
    const [px, py] = this.toNest(sx, sy);
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    const op = this.opAt(cx, cy, px, py);
    if (!op) { if (this.tool === 'remove') this.game.ui.toast('撤去できる物が無い'); return; }
    if (op._why) { this.game.ui.toast(op._why, 'bad'); return; }
    const v = validateOp(this.nest.data, op, this.game.inv(), this.game.nestCtx ? this.game.nestCtx() : null);
    if (!v.ok) { this.game.ui.toast(v.reason, 'bad'); return; }
    if (op.op === 'remove' || op.op === 'fill' || (op.op === 'set-kind' && this.tool === 'remove')) {
      const back = v.refund && Object.keys(v.refund).length ? '<br><span class="tb-dim">戻る素材：' + esc(costText(v.refund)) + '</span>' : '';
      const ok = await this.game.ui.confirm('撤去', esc(describe(op, this.nest.data).replace(/た$/, 'ますか？')) + back, '撤去する', 'やめる');
      if (!ok) return;
    }
    this.send(op);
  }

  onMouse(ev) {
    const [px, py] = this.toNest(ev.x, ev.y);
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    if (ev.type === 'down' && ev.button === 2) { this.pan = { x: ev.x, y: ev.y, cx: this.cam.x, cy: this.cam.y }; return; }
    if (ev.type === 'move' && this.pan) {
      if (!(ev.buttons & 2)) { this.pan = null; return; }
      this.cam.x = this.pan.cx - (ev.x - this.pan.x) / this.z; this.cam.y = this.pan.cy - (ev.y - this.pan.y) / this.z; return;
    }
    if (ev.type === 'up' && ev.button === 2) { this.pan = null; return; }
    if (!this.nest.canEdit) return;
    const d = this.nest.data;
    if (ev.type === 'down' && ev.button === 0) {
      const t = this.tool;
      if (t === 'dig') { if (this.drag && this.drag.kind === 'dig') this._endStroke(); this.drag = { kind: 'dig', at: null, prev: null }; this.stroke = { n: 0, reason: null, fail: null, already: false, inv: [], last: null }; this._digAt(cx, cy); }
      else if (t === 'tunnel') this.drag = { kind: 'tunnel', x0: cx, y0: cy, x1: cx, y1: cy };
      else if (t === 'room') {
        const edge = this._edgeAt(ev.x, ev.y, !!ev.touch);
        if (edge) this.drag = { kind: 'resize', room: { ...edge.room }, edge: edge.edge, x1: cx, y1: cy };
        else this.drag = { kind: 'room', x0: cx, y0: cy, x1: cx, y1: cy };
      } else { const op = this.opAt(cx, cy, px, py); if (op) this.send(op); }
    } else if (ev.type === 'move' && this.drag) {
      if (this.drag.kind === 'dig') { if (ev.buttons & 1) this._digAt(cx, cy); else { this._endStroke(); this.drag = null; } }
      else { this.drag.x1 = cx; this.drag.y1 = cy; }
    } else if (ev.type === 'up' && ev.button === 0 && this.drag) {
      const dr = this.drag; this.drag = null;
      if (dr.kind === 'dig') { this._digAt(cx, cy, dr); this._endStroke(); return; }
      const op = this._dragOp(dr);
      if (op) this.send(op);
    }
  }
  /**
   * Ver.0.9：なぞって掘る。前に確かめたマスから今のマスまでを順に（指が速くてもマスを飛ばさない）、
   * まだ返事の来ていない掘りも済んだものとした「手元の予想」で確かめて送る。知らせは なぞり終えたときに 1 つだけ（_endStroke）
   */
  _digAt(cx, cy, dr = this.drag) {
    const st = this.stroke;
    if (!dr || !st) return;
    const from = dr.at || dr.prev;
    if (from && from.x === cx && from.y === cy) return;
    const room = 8 - this.pending;
    if (room <= 0) return;                  // 送りすぎない：次に動いたときに続きから
    const path = from ? cellPath(from.x, from.y, cx, cy) : [{ x: cx, y: cy }];
    const plan = planDigs(this._predicted(), path, room);
    dr.prev = { x: cx, y: cy };
    if (plan.at) dr.at = plan.at;
    if (plan.reason && !st.reason) st.reason = plan.reason;
    if (!plan.ops.length && !plan.reason) st.already = true;
    if (!plan.ops.length) return;
    this._pred = plan.data;
    for (const op of plan.ops) { st.last = op; this.send(op, true, false, st); }
  }
  /** 返事を待っている掘りがあれば、それも済んだものとした巣（無ければ今の巣） */
  _predicted() { return this._pred && this.pending > 0 ? this._pred : this.nest.data; }
  /** なぞり終えた：返事がそろってから、知らせを 1 つ（掘れた＝その場に小さく、掘れなかった＝理由のトースト）、取り消しも 1 回ぶんに */
  _endStroke() {
    const st = this.stroke;
    if (!st) return;
    this.stroke = null;
    this.busy = this.busy.then(() => {
      if (st.inv.length) {
        this.undo.push({ ops: st.inv, label: st.n === 1 ? '土を掘った' : '土を ' + st.n + ' マス掘った' });
        if (this.undo.length > 30) this.undo.shift();
      }
      const note = digStrokeNote(st);
      this.game.debug.buildDig = { n: st.n, reason: st.reason, fail: st.fail, pop: note.pop, toast: note.toast && note.toast.text };
      if (this.game.scene !== this) return;
      if (note.pop && st.last) this.pops.add((st.last.x + 0.5) * CELL, st.last.y * CELL + 2, note.pop, { color: '#ffe9b0' });
      if (note.toast) this.game.ui.toast(note.toast.text, note.toast.kind);
    });
  }

  _dragOp(dr) {
    if (dr.kind === 'tunnel') return tunnelFromDrag(dr.x0, dr.y0, dr.x1, dr.y1);
    if (dr.kind === 'room') {
      const x = Math.min(dr.x0, dr.x1), y = Math.min(dr.y0, dr.y1);
      return { op: 'room', x, y, w: Math.abs(dr.x1 - dr.x0) + 1, h: Math.abs(dr.y1 - dr.y0) + 1, kind: 'plain' };
    }
    if (dr.kind === 'resize') { const r = resizeByEdge(dr.room, dr.edge, dr.x1, dr.y1); return { op: 'room-resize', id: dr.room.id, ...r }; }
    return null;
  }

  /** クリック 1 回の操作（寝床・倉庫・家具・撤去） */
  opAt(cx, cy, px, py) {
    const d = this.nest.data;
    if (this.tool === 'bed' || this.tool === 'store') {
      const r = roomAt(d, cx, cy);
      if (!r) return { op: 'set-kind', id: null, kind: this.tool, _why: '部屋をクリックしよう' };
      return { op: 'set-kind', id: r.id, kind: r.kind === this.tool ? 'plain' : this.tool };
    }
    if (this.tool === 'furniture') {
      const f = FURNITURE[this.furn];
      if (this.furn === 'curio' && !this.curioItem) return { op: 'place', type: 'curio', x: cx, y: cy, _why: '飾る品を選ぼう（右の一覧の「図鑑の品」）' };
      const r = roomAt(d, cx, cy);
      let x = cx - Math.floor((f.w - 1) / 2), y = cy;
      if (r) { y = f.mount === 'ceil' ? r.y : f.mount === 'any' ? Math.max(r.y, Math.min(r.y + r.h - f.h, cy)) : r.y + r.h - f.h; x = Math.max(r.x, Math.min(r.x + r.w - f.w, x)); }
      return { op: 'place', type: this.furn, x, y, rot: this.rot, ...(this.furn === 'curio' ? { item: this.curioItem } : {}) };
    }
    if (this.tool === 'remove') {
      const s = structureAt(d, cx, cy);
      if (!s) return null;
      if (s.kind === 'fixture') return { op: 'set-kind', id: s.roomId, kind: 'plain' };
      if (s.kind === 'cell') return { op: 'fill', x: cx, y: cy };
      return { op: 'remove', id: s.id };
    }
    void px; void py;
    return null;
  }

  _updateHover() {
    const inp = this.game.input;
    const touch = inp.lastPointer !== 'mouse';
    const pt = touch ? this.touchPt : inp.mouse;
    const d = this.nest.data, inv = this.game.inv();
    let op = null, edge = null;
    if (!this.nest.canEdit || !pt || (!touch && !inp.mouse.inside) || pt.x < this.VX) {
      this.hover = null;
      // タッチ：直前の結果（送信中など）をしばらく残す
      const msg = esc(this.baseHint) + (this.pending ? '　<span class="tb-dim">送信中…</span>' : '');
      if (this._lastMsg !== msg) { this._lastMsg = msg; this.statusEl.innerHTML = msg; }
      return;
    }
    const [px, py] = this.toNest(pt.x, pt.y);
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    if (this.drag && this.drag.kind !== 'dig') op = this._dragOp(this.drag);
    else if (this.tool === 'dig') op = { op: 'dig', x: cx, y: cy };
    else if (this.tool === 'tunnel') op = null;
    else if (this.tool === 'room') { edge = this._edgeAt(pt.x, pt.y, touch); op = null; }
    else op = this.opAt(cx, cy, px, py);
    let v = null;
    if (op) v = op._why ? { ok: false, reason: op._why } : validateOp(d, op, inv, this.game.nestCtx ? this.game.nestCtx() : null);
    this.hover = { cx, cy, op, v, edge };
    let msg = this.baseHint;
    if (op && v) {
      const costs = v.cost && Object.keys(v.cost).length ? '　必要：' + costText(v.cost) : '';
      const back = v.refund && Object.keys(v.refund).length ? '　戻る：' + costText(v.refund) : '';
      msg = v.ok ? `<b class="ok">○ ${esc(describe(op, d))}</b>${esc(costs + back)}` : `<b class="ng">× ${esc(v.reason)}</b>${esc(costs)}`;
    } else if (edge) msg = `<b class="ok">↔ 辺をドラッグで ${esc(KIND_NAME[edge.room.kind])}を広げる・せばめる</b>`;
    if (this.pending) msg += '　<span class="tb-dim">送信中…</span>';
    if (this._lastMsg !== msg) { this._lastMsg = msg; this.statusEl.innerHTML = msg; }
  }

  // ───────── 送信（順番に・1 つずつ）─────────
  send(op, quiet = false, isUndo = false, stroke = null) {
    const g = this.game;
    this.pending++;
    this.busy = this.busy.then(async () => {
      const before = this.nest.data;
      const res = await g.net.nestOp(this.nest.id, this.nest.rev, op);
      this.pending--;
      if (!res.ok) {
        if (res.code === 'stale_rev' && res.data) { this.nest.data = res.data; this.nest.rev = res.rev; this.view.setData(res.data); }
        if (stroke) { this._pred = null; if (!stroke.fail) stroke.fail = res.reason || 'できなかった'; return false; }   // なぞった掘り：知らせは なぞり終えたときにまとめて
        if (!quiet || res.code !== 'rule') g.ui.toast(res.reason || 'できなかった', 'bad');
        return false;
      }
      this.nest.data = res.data; this.nest.rev = res.rev;
      sfx(op.op === 'remove' ? 'remove' : 'place');
      if (!isUndo && op.op !== 'remove' && this.nest.own !== false) g.goal('build');
      g.setInv(res.inv);
      this.view.setData(res.data, { fill: this._fill() });
      this._mats();
      if ((op.op === 'place' && op.type === 'curio') || op.op === 'remove') { this._fillFurn(); this._syncMenu(); }
      if (stroke) { stroke.n++; const inv = inverseOps(before, op, res); if (inv) stroke.inv.unshift(...inv); }
      else if (!isUndo) {
        const inv = inverseOps(before, op, res);
        if (inv) { this.undo.push({ ops: inv, label: describe(op, before) }); if (this.undo.length > 30) this.undo.shift(); }
      }
      if (!quiet) {
        const got = res.refund && Object.keys(res.refund).length ? '（' + costText(res.refund) + ' が戻った）' : '';
        g.ui.toast(describe(op, before) + (isUndo ? ' を取り消した' : '') + got);
      }
      return true;
    });
    return this.busy;
  }
  async doUndo() {
    const u = this.undo.pop();
    if (!u) { this.game.ui.toast('取り消せる操作が無い'); return; }
    this.pops.list.length = 0;   // 「n マス掘った」が取り消したあとに残らないように
    for (const op of u.ops) { const ok = await this.send(op, true, true); if (!ok) { this.game.ui.toast('取り消せなかった', 'bad'); return; } }
    this.game.ui.toast('「' + u.label + '」を取り消した');
  }

  // ───────── 描画 ─────────
  draw() {
    const sc = this.game.screen, g = sc.g, z = this.z, d = this.nest.data;
    g.fillStyle = '#1a0f0a'; g.fillRect(0, 0, W, H);
    const [ox, oy] = this.toScreen(0, 0);
    g.save();
    g.translate(Math.round(ox), Math.round(oy)); g.scale(z, z);
    g.imageSmoothingEnabled = z < 1;
    g.drawImage(this.view.base, 0, 0);
    g.imageSmoothingEnabled = false;
    this.view.drawObjects(g, this.t);
    // グリッド
    g.globalAlpha = 0.12; g.fillStyle = '#ffe0b0';
    for (let x = 0; x <= d.w; x++) g.fillRect(x * CELL, d.surfaceY * CELL, 1 / z, (d.h - d.surfaceY) * CELL);
    for (let y = d.surfaceY; y <= d.h; y++) g.fillRect(0, y * CELL, d.w * CELL, 1 / z);
    g.globalAlpha = 1;
    // 部屋の種類の札と辺
    const handles = this.game.isTouch && this.tool === 'room' && this.nest.canEdit && !this.panMode;
    for (const r of d.rooms) {
      if (handles) {   // 辺の真ん中の「つまみ」（タッチ）
        const hs = Math.max(3, 4 / z), x0 = r.x * CELL, y0 = r.y * CELL, x1 = (r.x + r.w) * CELL, y1 = (r.y + r.h) * CELL;
        g.fillStyle = 'rgba(255,233,160,.85)';
        for (const [hx, hy] of [[x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1]]) { g.beginPath(); g.arc(hx, hy, hs, 0, Math.PI * 2); g.fill(); }
      }
      g.strokeStyle = r.kind === 'bed' ? 'rgba(240,200,110,.7)' : r.kind === 'store' ? 'rgba(170,210,120,.7)' : 'rgba(255,230,190,.35)';
      g.lineWidth = 1 / z; g.strokeRect(r.x * CELL + 0.5 / z, r.y * CELL + 0.5 / z, r.w * CELL - 1 / z, r.h * CELL - 1 / z);
    }
    // 地表より上の空だけ、昼夜の色（Ver.0.2。巣の中は変えない）
    const tod = this.game.tod ? this.game.tod() : null;
    if (tod) {
      const sh = d.surfaceY * CELL + (this.view.assets ? 8 : 0), k = tod.dark / 0.66;
      if (tod.period === 'day') { g.fillStyle = 'rgba(140,190,235,0.42)'; g.fillRect(0, 0, d.w * CELL, sh); }
      if (k > 0.05) { g.fillStyle = `rgba(10,12,40,${0.75 * k})`; g.fillRect(0, 0, d.w * CELL, sh); }
    }
    this._drawHover(g);
    g.restore();
    // やさしい明かり
    this.view.drawLight(g, W, H, { x: -ox / z, y: -oy / z }, z, 0.22, this.t);
    // 地表の矢印（入口）
    sc.clearUI();
    const [ex, ey] = this.toScreen(d.entrance.x * CELL + 8, d.surfaceY * CELL - 2);
    sc.text(ex, ey - 2, '▼ 入口', { size: 6, color: '#ffe9a8' });
    for (const r of d.rooms) {
      const [rx, ry] = this.toScreen((r.x + r.w / 2) * CELL, r.y * CELL);
      if (r.kind !== 'plain' || z >= 1) sc.text(rx, ry + 9 * Math.max(1, z * 0.8), KIND_NAME[r.kind], { size: 6, color: r.kind === 'bed' ? '#ffe2a0' : r.kind === 'store' ? '#d8f0b0' : '#f0dcc0', alpha: 0.9 });
    }
    // Ver.0.9：掘れた知らせ（その場に小さく）
    this.pops.draw(sc, 0, 0, (x, y) => { const [a, b] = this.toScreen(x, y); return [Math.max(this.VX + 30, Math.min(W - 30, a)), Math.max(24, Math.min(H - 8, b))]; });
    // カーソル脇の理由（タッチでは指に隠れないよう上に）
    const h = this.hover, touch = this.game.input.lastPointer !== 'mouse';
    const m = touch ? (this.touchPt || this.game.input.mouse) : this.game.input.mouse;
    const ty = touch ? -26 : -6, tx = touch ? -20 : 8;
    if (h && h.v && !h.v.ok) sc.text(Math.max(this.VX + 2, m.x + tx), Math.max(10, m.y + ty), h.v.reason, { size: 6.5, color: '#ffb0a0', align: 'left' });
    if (this.rot && this.tool === 'furniture') sc.text(m.x + 8, m.y + 12, touch ? '向き：反転' : '向き：反転（R）', { size: 6, color: '#ffe9a8', align: 'left' });
  }

  _drawHover(g) {
    const h = this.hover; if (!h) return;
    const d = this.nest.data;
    const okC = 'rgba(255,240,170,0.35)', ngC = 'rgba(230,60,40,0.4)';
    const fillCells = (cells, ok) => { g.fillStyle = ok ? okC : ngC; for (const [x, y] of cells) g.fillRect(x * CELL, y * CELL, CELL, CELL); };
    const op = h.op, ok = h.v ? h.v.ok : true;
    const frame = (x, y, w, hh, ok2) => { g.strokeStyle = ok2 ? '#ffe9a0' : '#ff6a50'; g.lineWidth = 1; g.strokeRect(x * CELL + 0.5, y * CELL + 0.5, w * CELL - 1, hh * CELL - 1); };
    if (h.edge && !op) {
      const r = h.edge.room;
      g.fillStyle = 'rgba(255,240,170,0.8)';
      if (h.edge.edge === 'l') g.fillRect(r.x * CELL - 1, r.y * CELL, 3, r.h * CELL);
      if (h.edge.edge === 'r') g.fillRect((r.x + r.w) * CELL - 2, r.y * CELL, 3, r.h * CELL);
      if (h.edge.edge === 't') g.fillRect(r.x * CELL, r.y * CELL - 1, r.w * CELL, 3);
      if (h.edge.edge === 'b') g.fillRect(r.x * CELL, (r.y + r.h) * CELL - 2, r.w * CELL, 3);
      return;
    }
    if (!op) { if (this.tool !== 'dig') { g.strokeStyle = 'rgba(255,240,200,.6)'; g.lineWidth = 1; g.strokeRect(h.cx * CELL + 0.5, h.cy * CELL + 0.5, CELL - 1, CELL - 1); } return; }
    switch (op.op) {
      case 'dig': case 'fill': fillCells([[op.x, op.y]], ok); frame(op.x, op.y, 1, 1, ok); break;
      case 'tunnel': fillCells(tunnelCells(op), ok); break;
      case 'room': case 'room-resize': fillCells(rectCells(op), ok); frame(op.x, op.y, op.w, op.h, ok); break;
      case 'set-kind': { const r = d.rooms.find(q => q.id === op.id); if (r) { fillCells(rectCells(r), ok); frame(r.x, r.y, r.w, r.h, ok); } else fillCells([[h.cx, h.cy]], false); break; }
      case 'place': {
        const f = FURNITURE[op.type];
        g.save(); g.globalAlpha = ok ? 0.8 : 0.45;
        drawGhost(g, op.type, op.x, op.y, f.w, f.h, op.rot, this.t, this.view.lift, op.item);
        g.restore();
        frame(op.x, op.y, f.w, f.h, ok);
        g.globalAlpha = 1;
        break;
      }
      case 'remove': {
        const it = d.rooms.find(r => r.id === op.id) || d.objects.find(o => o.id === op.id);
        if (it && it.w) { const f = FURNITURE[it.type]; const w = f ? f.w : it.w, hh = f ? f.h : it.h; fillCells(rectCells({ x: it.x, y: it.y, w, h: hh }), ok); }
        else if (it) { const f = FURNITURE[it.type]; fillCells(rectCells({ x: it.x, y: it.y, w: f.w, h: f.h }), ok); }
        else { const t = d.tunnels.find(q => q.id === op.id); if (t) fillCells(tunnelCells(t), ok); }
        break;
      }
    }
    void cellAt; void C;
  }
}

import { drawObject } from './nest-view.js';
function drawGhost(g, type, x, y, w, h, rot, t, lift, item = null) {
  drawObject(g, { type, px: x * CELL, py: y * CELL, pw: w * CELL, ph: h * CELL, w, h, rot, item }, t, 0, lift);
}

/** 操作の短い説明（トースト用） */
export function describe(op, d) {
  switch (op.op) {
    case 'dig': return '土を掘った';
    case 'fill': return '土を埋めた';
    case 'tunnel': return op.dir === 'v' ? '縦の通路を掘った' : op.dir === 'h' ? '横の通路を掘った' : '坂の通路を掘った';
    case 'room': return '部屋を作った';
    case 'room-resize': return '部屋の大きさを変えた';
    case 'set-kind': return op.kind === 'plain' ? 'ふつうの部屋に戻した' : KIND_NAME[op.kind] + 'にした';
    case 'place': return op.type === 'curio' ? ((CURIOS[op.item] || {}).name || '品') + 'を飾った' : (FURNITURE[op.type] || {}).name + 'を置いた';
    case 'remove': {
      const it = d && (d.rooms.find(r => r.id === op.id) || d.tunnels.find(r => r.id === op.id) || d.objects.find(r => r.id === op.id));
      if (!it) return '撤去した';
      if (it.type) return (it.type === 'curio' ? (CURIOS[it.item] || {}).name || '品' : (FURNITURE[it.type] || {}).name) + 'を片づけた';
      if (it.dir) return '通路を埋めた';
      return KIND_NAME[it.kind] + 'を土に戻した';
    }
  }
  return op.op;
}
void KIND_COST; void ROOM_COST; void addCost; void halfCost;
