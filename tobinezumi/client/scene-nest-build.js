// tobinezumi/client/scene-nest-build.js — C. 巣の全体モード（地下断面ビルド）
// 左のツール（1〜7）、マウスで編集、置ける所は明るく・置けない所は赤＋理由、素材の数、ホイールで拡大縮小、右ドラッグで移動、
// Ctrl+Z で直前の操作を取り消し（逆操作をサーバーへ送る）、Tab で閲覧モード、B / Esc で閉じる（閲覧モードへ）。
import { W, H } from './gfx.js';
import { el, esc, toolIconURL, furnitureIconURL } from './ui.js';
import { NestView } from './nest-view.js';
import { CELL, validateOp, structureAt, roomEdgeAt, resizeByEdge, tunnelFromDrag, tunnelCells, rectCells, roomAt, inverseOps, KIND_COST, KIND_NAME, ROOM_COST, cellAt, C } from '../shared/nest-rules.js';
import { FURNITURE, FURNITURE_ORDER, countItem, costText, addCost, halfCost } from '../shared/items.js';

export const TOOLS = [
  { id: 'dig', name: '掘る', key: '1', hint: 'クリック・ドラッグで土を 1 マスずつ掘る' },
  { id: 'tunnel', name: '通路', key: '2', hint: 'ドラッグで通路（横・縦・斜め＝坂）' },
  { id: 'room', name: '部屋', key: '3', hint: 'ドラッグで部屋（4×3 以上）。部屋の辺をドラッグで広げる' },
  { id: 'bed', name: '寝床', key: '4', hint: '部屋をクリックで寝床にする' },
  { id: 'store', name: '倉庫', key: '5', hint: '部屋をクリックで倉庫にする' },
  { id: 'furniture', name: '家具', key: '6', hint: '部屋の中をクリックで置く（R で向き）' },
  { id: 'remove', name: '撤去', key: '7', hint: 'クリックで撤去（素材の一部が戻る）' },
];
const ZOOMS = [0.5, 1, 2];
const VX = 36, VW = W - 36;    // 左のツール欄を除いた見える範囲

export class NestBuildScene {
  constructor(game) { this.game = game; this.view = new NestView(); this.undo = []; }

  enter({ nest }) {
    const g = this.game;
    this.nest = nest;
    this.tool = this.tool || 'dig';
    this.furn = this.furn || 'lamp';
    this.rot = 0;
    this.zi = this.zi != null ? this.zi : 0;
    this.drag = null; this.hover = null; this.busy = Promise.resolve(); this.pending = 0;
    this.view.setData(nest.data, { fill: this._fill() });
    if (!this.cam || this._nestId !== nest.id) { this._nestId = nest.id; this.undo = []; this._fit(); }
    this._mount();
    g.ui.showHUD(false);
    this.t = 0;
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; this.game.screen.clearUI(); }
  /** ほかの人（所有者）の編集が届いた：見学中の画面を描き直す */
  onRemoteUpdate(nest) { this.nest = nest; this.view.setData(nest.data, { fill: this._fill() }); this.hover = null; }
  _fill() { const s = this.nest.storage || []; let n = 0; for (const it of s) if (it) n += it.n; return Math.min(1, n / 60); }

  get z() { return ZOOMS[this.zi]; }
  _fit() { this.cam = { x: (this.nest.data.w * CELL) / 2, y: (this.nest.data.h * CELL) / 2 + 4 }; }
  toScreen(px, py) { return [(px - this.cam.x) * this.z + VX + VW / 2, (py - this.cam.y) * this.z + H / 2]; }
  toNest(sx, sy) { return [(sx - VX - VW / 2) / this.z + this.cam.x, (sy - H / 2) / this.z + this.cam.y]; }

  _mount() {
    const g = this.game, nest = this.nest;
    this.dom = el('div', 'tb-scene tb-build');
    const edit = nest.canEdit;
    const top = el('div', 'tb-btop tb-ui-block');
    top.innerHTML = `<span class="tb-bname">${esc(nest.ownerName)}の巣</span><span class="tb-bmode">${edit ? '全体モード（ビルド）' : '見学中（編集できません）'}</span>` +
      (edit ? `<select class="tb-policy" title="巣の訪問設定"><option value="private">非公開</option><option value="public">公開（だれでも）</option>${g.net.mode === 'online' ? '<option value="list">許可リスト（名前で）</option>' : ''}</select>` : '') +
      `<span class="tb-zoom"></span>`;
    this.dom.appendChild(top);
    if (edit) {
      const sel = top.querySelector('.tb-policy'); sel.value = nest.policy || 'private';
      sel.onchange = async () => {
        const v = sel.value;
        let list;
        if (v === 'list') {
          const txt = await g.ui.prompt('許可リスト', '巣に入ってよいトビネズミの<b>なまえ</b>を「、」か「,」で区切って入れてね（30 匹まで）', (nest.list || []).join('、'));
          if (txt == null) { sel.value = nest.policy || 'private'; sel.blur(); return; }
          list = txt.split(/[,、，\s]+/).map(x => x.trim()).filter(Boolean);
        }
        const r = await g.net.setVisitPolicy(v, list);
        if (r.ok) {
          nest.policy = v; if (list) nest.list = r.list || list;
          const msg = { public: '巣を公開した（だれでも訪ねてこられる）', private: '巣を非公開にした', list: '許可リストの子だけ入れるようにした' }[v];
          g.ui.toast(msg + (r.unknown && r.unknown.length ? '（見つからない名前：' + r.unknown.join('、') + '）' : ''));
        } else { sel.value = nest.policy || 'private'; g.ui.toast(r.reason || '変えられなかった', 'bad'); }
        sel.blur();
      };
    }
    this.zoomEl = top.querySelector('.tb-zoom');
    // ツール
    const menu = el('div', 'tb-tools tb-ui-block' + (edit ? '' : ' disabled'));
    for (const t of TOOLS) {
      const b = el('button', 'tb-tool', `<img src="${toolIconURL(t.id)}" alt=""><span>${t.name}</span><kbd>${t.key}</kbd>`);
      b.dataset.tool = t.id; b.title = t.hint;
      b.onclick = () => { if (edit) this.setTool(t.id); };
      menu.appendChild(b);
    }
    this.dom.appendChild(menu);
    this.menuEl = menu;
    // 家具の小メニュー
    const fm = el('div', 'tb-furn tb-ui-block hidden');
    for (const id of FURNITURE_ORDER) {
      const f = FURNITURE[id];
      const b = el('button', 'tb-furn-b', `<img src="${furnitureIconURL(id, f.w, f.h)}" alt=""><span>${f.name}</span><small>${costText(f.cost)}</small>`);
      b.dataset.furn = id; b.onclick = () => { this.furn = id; this._syncMenu(); };
      fm.appendChild(b);
    }
    this.dom.appendChild(fm); this.furnEl = fm;
    // 下：素材と状態
    const bot = el('div', 'tb-bbot');
    bot.innerHTML = `<div class="tb-mats"></div><div class="tb-status"></div>`;
    this.dom.appendChild(bot);
    this.matsEl = bot.querySelector('.tb-mats'); this.statusEl = bot.querySelector('.tb-status');
    const walk = el('button', 'tb-btn tb-walkbtn tb-ui-block', '歩いてみる（Tab）');
    walk.onclick = () => g.toWalk(this.nest);
    this.dom.appendChild(walk);
    g.hud.appendChild(this.dom);
    this._syncMenu(); this._mats();
  }
  setTool(id) { this.tool = id; this.drag = null; this._syncMenu(); }
  _syncMenu() {
    if (!this.menuEl) return;
    for (const b of this.menuEl.children) b.classList.toggle('on', b.dataset.tool === this.tool);
    this.furnEl.classList.toggle('hidden', this.tool !== 'furniture' || !this.nest.canEdit);
    for (const b of this.furnEl.children) b.classList.toggle('on', b.dataset.furn === this.furn);
    this.zoomEl.textContent = '×' + this.z + '（ホイール）';
    const t = TOOLS.find(t => t.id === this.tool);
    this.baseHint = this.nest.canEdit ? t.name + '：' + t.hint : 'マウス右ドラッグで見回せます。Tab で中を歩く。';
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
    if (g.ui.busy()) { if (g.ui.modal && inp.take('Escape')) g.ui.closeModal(); inp.takeMouse(); return; }
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
    if (wh) {
      const before = this.toNest(inp.mouse.x, inp.mouse.y);
      this.zi = Math.max(0, Math.min(ZOOMS.length - 1, this.zi - wh));
      const after = this.toNest(inp.mouse.x, inp.mouse.y);
      this.cam.x += before[0] - after[0]; this.cam.y += before[1] - after[1];
      this._syncMenu();
    }
    this._clampCam();
    for (const ev of inp.takeMouse()) this.onMouse(ev);
    this._updateHover();
  }
  _clampCam() {
    const d = this.nest.data, mw = d.w * CELL, mh = d.h * CELL;
    const hw = VW / 2 / this.z, hh = H / 2 / this.z;
    this.cam.x = mw <= hw * 2 ? mw / 2 : Math.max(hw - 24, Math.min(mw - hw + 24, this.cam.x));
    this.cam.y = mh <= hh * 2 ? mh / 2 + 4 : Math.max(hh - 24, Math.min(mh - hh + 24, this.cam.y));
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
      if (t === 'dig') { this.drag = { kind: 'dig', last: null }; this._digAt(cx, cy); }
      else if (t === 'tunnel') this.drag = { kind: 'tunnel', x0: cx, y0: cy, x1: cx, y1: cy };
      else if (t === 'room') {
        const edge = roomEdgeAt(d, px / CELL, py / CELL);
        if (edge) this.drag = { kind: 'resize', room: { ...edge.room }, edge: edge.edge, x1: cx, y1: cy };
        else this.drag = { kind: 'room', x0: cx, y0: cy, x1: cx, y1: cy };
      } else { const op = this.opAt(cx, cy, px, py); if (op) this.send(op); }
    } else if (ev.type === 'move' && this.drag) {
      if (this.drag.kind === 'dig') { if (ev.buttons & 1) this._digAt(cx, cy); else this.drag = null; }
      else { this.drag.x1 = cx; this.drag.y1 = cy; }
    } else if (ev.type === 'up' && ev.button === 0 && this.drag) {
      const dr = this.drag; this.drag = null;
      const op = this._dragOp(dr);
      if (op) this.send(op);
    }
  }
  _digAt(cx, cy) {
    const k = cx + ',' + cy;
    if (this.drag.last === k) return;
    this.drag.last = k;
    const op = { op: 'dig', x: cx, y: cy };
    // ドラッグ中は前の掘りが確定する前でも、手元の予想（いま掘ってある所の隣）で判定して送る
    if (validateOp(this._predicted(), op, null).ok) this.send(op, true);
  }
  _predicted() { return this._pred && this._predRev === this.nest.rev ? this._pred : this.nest.data; }

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
      const r = roomAt(d, cx, cy);
      let x = cx - Math.floor((f.w - 1) / 2), y = cy;
      if (r) { y = f.mount === 'ceil' ? r.y : r.y + r.h - f.h; x = Math.max(r.x, Math.min(r.x + r.w - f.w, x)); }
      return { op: 'place', type: this.furn, x, y, rot: this.rot };
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
    const [px, py] = this.toNest(inp.mouse.x, inp.mouse.y);
    const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
    const d = this.nest.data, inv = this.game.inv();
    let op = null, edge = null;
    if (!this.nest.canEdit || !inp.mouse.inside || inp.mouse.x < VX) { this.hover = null; this.statusEl.innerHTML = esc(this.baseHint); return; }
    if (this.drag && this.drag.kind !== 'dig') op = this._dragOp(this.drag);
    else if (this.tool === 'dig') op = { op: 'dig', x: cx, y: cy };
    else if (this.tool === 'tunnel') op = null;
    else if (this.tool === 'room') { edge = roomEdgeAt(d, px / CELL, py / CELL); op = null; }
    else op = this.opAt(cx, cy, px, py);
    let v = null;
    if (op) v = op._why ? { ok: false, reason: op._why } : validateOp(d, op, inv);
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
  send(op, quiet = false, isUndo = false) {
    const g = this.game;
    this.pending++;
    this.busy = this.busy.then(async () => {
      const before = this.nest.data;
      const res = await g.net.nestOp(this.nest.id, this.nest.rev, op);
      this.pending--;
      if (!res.ok) {
        if (res.code === 'stale_rev' && res.data) { this.nest.data = res.data; this.nest.rev = res.rev; this.view.setData(res.data); }
        if (!quiet || res.code !== 'rule') g.ui.toast(res.reason || 'できなかった', 'bad');
        return false;
      }
      this.nest.data = res.data; this.nest.rev = res.rev;
      g.setInv(res.inv);
      this.view.setData(res.data, { fill: this._fill() });
      this._mats();
      if (!isUndo) {
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
    for (const r of d.rooms) {
      g.strokeStyle = r.kind === 'bed' ? 'rgba(240,200,110,.7)' : r.kind === 'store' ? 'rgba(170,210,120,.7)' : 'rgba(255,230,190,.35)';
      g.lineWidth = 1 / z; g.strokeRect(r.x * CELL + 0.5 / z, r.y * CELL + 0.5 / z, r.w * CELL - 1 / z, r.h * CELL - 1 / z);
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
    // カーソル脇の理由
    const h = this.hover;
    if (h && h.v && !h.v.ok) { const m = this.game.input.mouse; sc.text(m.x + 8, m.y - 6, h.v.reason, { size: 6.5, color: '#ffb0a0', align: 'left' }); }
    if (this.rot && this.tool === 'furniture') { const m = this.game.input.mouse; sc.text(m.x + 8, m.y + 12, '向き：反転（R）', { size: 6, color: '#ffe9a8', align: 'left' }); }
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
        drawGhost(g, op.type, op.x, op.y, f.w, f.h, op.rot, this.t, this.view.lift);
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
function drawGhost(g, type, x, y, w, h, rot, t, lift) {
  drawObject(g, { type, px: x * CELL, py: y * CELL, pw: w * CELL, ph: h * CELL, w, h, rot }, t, 0, lift);
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
    case 'place': return (FURNITURE[op.type] || {}).name + 'を置いた';
    case 'remove': {
      const it = d && (d.rooms.find(r => r.id === op.id) || d.tunnels.find(r => r.id === op.id) || d.objects.find(r => r.id === op.id));
      if (!it) return '撤去した';
      if (it.type) return (FURNITURE[it.type] || {}).name + 'を片づけた';
      if (it.dir) return '通路を埋めた';
      return KIND_NAME[it.kind] + 'を土に戻した';
    }
  }
  return op.op;
}
void KIND_COST; void ROOM_COST; void addCost; void halfCost;
