// tobinezumi/client/scene-nest-walk.js — D. 巣内閲覧・生活モード（横からの断面を歩く）
// 全体モードと同じ巣データ・同じセル座標（NestView を共有）。← → 歩く、Space ジャンプ、↑↓ 縦通路、坂は ← → だけ。
// 寝床で E → 眠る（演出のみ）、倉庫で E → 預ける／引き出す、入口の縦穴を上まで登ると地上へ。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import { NestView } from './nest-view.js';
import { Sprites } from './sprites.js';
import { nestQuery, CELL, KIND_NAME } from '../shared/nest-rules.js';
import { stepSide, makeSideState, STEP_DT } from '../shared/move.js';
import { FURNITURE, FIXTURES } from '../shared/items.js';

export class NestWalkScene {
  constructor(game) { this.game = game; this.view = new NestView(); }

  enter({ nest, from = 'field' }) {
    const g = this.game;
    const same = this.nest && this.nest.id === nest.id && this.st;
    this.nest = nest;
    this._setData(nest.data);
    const d = nest.data;
    if (from === 'field' || !same) {
      this.st = makeSideState(d.entrance.x * CELL + CELL / 2, (d.surfaceY + 1) * CELL + 6, true);
      this.introDown = 4;     // 着地するまで自動で降りる（方向キーで止まる）
    }
    this.cam = this.cam && same ? this.cam : { x: this.st.x - W / 2, y: this.st.y - H / 2 };
    this.t = 0; this.sleeping = false; this.roomLabelT = 0; this.curRoom = undefined;
    this.peers = nest.own ? [] : this._hosts();
    this.dom = el('div', 'tb-scene tb-walk');
    this.dom.innerHTML = `<div class="tb-wtop">${esc(nest.ownerName)}の巣${nest.canEdit ? '' : '　<span class="tb-dim">（見学中）</span>'}</div>
      <div class="tb-roomlabel"></div>
      <div class="tb-guide"><span><kbd>←</kbd><kbd>→</kbd> 移動</span><span><kbd>Space</kbd> ジャンプ</span><span><kbd>↑</kbd><kbd>↓</kbd> 登る・降りる</span><span><kbd>E</kbd> 調べる</span><span><kbd>B</kbd> ビルドモード</span><span><kbd>Tab</kbd> 全体</span></div>
      <div class="tb-prompt hidden"></div>`;
    this.roomEl = this.dom.querySelector('.tb-roomlabel');
    this.promptEl = this.dom.querySelector('.tb-prompt');
    g.hud.appendChild(this.dom);
    g.ui.showHUD(true, false);
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; this.game.screen.clearUI(); this.game.ui.showHUD(false); }
  _setData(data) { this.data = data; this.q = nestQuery(data); this.view.setData(data, { fill: this._fill() }); }
  _fill() { const s = this.nest.storage || []; let n = 0; for (const it of s) if (it) n += it.n; return Math.min(1, n / 60); }
  /** 見学先の主（オフラインのモカなど）。部屋の床に座っている */
  _hosts() {
    const n = this.nest;
    const r = n.data.rooms.find(q => q.kind === 'plain') || n.data.rooms[0];
    if (!r || !n.hostFur) return [];
    return [{ id: n.owner, name: n.ownerName, fur: n.hostFur, x: (r.x + 2) * CELL, y: (r.y + r.h) * CELL, facing: 1, anim: 'idle' }];
  }
  updateNest(nest) { this.nest = nest; this._setData(nest.data); }

  fixed(dt) {
    const g = this.game, inp = g.input;
    if (this.sleeping) return;
    const locked = g.ui.busy();
    let ax = locked ? { mx: 0, my: 0 } : inp.axis();
    let jump = !locked && !!inp.take('Space');
    if (this.introDown > 0) {
      this.introDown -= dt;
      if (ax.mx || ax.my || !this.st.climbing) this.introDown = 0; else ax = { mx: 0, my: 1 };
    }
    const prev = this.st;
    this.st = stepSide(this.st, { mx: ax.mx, my: ax.my, jump }, dt, this.q);
    if (this.st.exit && !this.exiting) { this.exiting = true; this.exit(); }
    this._sendT = (this._sendT || 0) + dt;
    if (this._sendT > 0.1 && (prev.x !== this.st.x || prev.y !== this.st.y || prev.anim !== this.st.anim || this._sendT > 2)) { this._sendT = 0; g.net.nestMove(this.st); }
  }

  async exit() {
    const g = this.game;
    const res = await g.net.leaveNest();
    this.exiting = false;
    if (!res.ok) { g.ui.toast(res.reason || '出られない', 'bad'); return; }
    g.backToField({ x: res.x, y: res.y });
  }

  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.viewPeers = this._peerList(dt);
    if (this.sleeping) {
      this.promptEl.classList.add('hidden');
      this.sleepT += dt;
      if (this.sleepT > 0.6 && (inp.take('KeyE') || inp.take('Space') || inp.take('Escape') || inp.axis().mx || inp.axis().my)) { this.sleeping = false; g.ui.toast('よく眠った'); }
      return;
    }
    if (!g.ui.busy()) {
      if (inp.take('Tab') || inp.take('KeyB')) { g.toBuild(this.nest); return; }
      if (inp.take('KeyE')) this.interact();
      if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
      if (inp.take('Enter') && !(g.ui._chatClosedAt && performance.now() - g.ui._chatClosedAt < 200)) g.ui.openChat();
      if (inp.take('Escape')) g.openMenu();
    } else if (g.ui.modal && (inp.take('Escape') || (g.ui.invPanel && inp.take('KeyI')))) g.ui.closeModal();
    // カメラ
    const mw = this.data.w * CELL, mh = this.data.h * CELL;
    const tx = Math.max(0, Math.min(mw - W, this.st.x - W / 2)), ty = Math.max(-8, Math.min(mh - H, this.st.y - H / 2 - 10));
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 7); this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 7);
    // 部屋の名前
    const cx = Math.floor(this.st.x / CELL), cy = Math.floor((this.st.y - 1) / CELL);
    const room = this.q.room(cx, cy);
    const rid = room ? room.id : null;
    if (rid !== this.curRoom) {
      this.curRoom = rid;
      if (room) { this.roomEl.textContent = KIND_NAME[room.kind]; this.roomEl.classList.remove('show'); void this.roomEl.offsetWidth; this.roomEl.classList.add('show'); }
    }
    const tgt = this.target();
    this.curTarget = tgt;
    if (tgt && !g.ui.busy()) { this.promptEl.innerHTML = `<b>E</b> ${esc(tgt.label)}`; this.promptEl.classList.remove('hidden'); }
    else this.promptEl.classList.add('hidden');
  }

  /** 足元の近くで調べられるもの */
  target() {
    const s = this.st;
    if (s.climbing) {
      const d = this.data;
      if (Math.floor(s.x / CELL) === d.entrance.x && s.y < (d.surfaceY + 3) * CELL) return { kind: 'exit', label: '↑ で地上へ出る' };
      return null;
    }
    let best = null, bd = 1e9;
    for (const it of this.view.layout.interact) {
      if (s.x < it.x0 || s.x > it.x1 || Math.abs(s.y - it.floorY) > 6) continue;
      const d = Math.abs((it.x0 + it.x1) / 2 - s.x);
      if (d < bd) { bd = d; best = it; }
    }
    if (!best) return null;
    const name = (FURNITURE[best.type] || FIXTURES[best.type] || {}).name || best.type;
    if (best.action === 'sleep') return { kind: 'sleep', it: best, label: '眠る（' + name + '）' };
    if (best.action === 'store') return { kind: 'store', it: best, label: this.nest.canEdit ? '預ける・引き出す（倉庫）' : '倉庫をのぞく' };
    return { kind: 'look', it: best, label: '調べる（' + name + '）' };
  }

  interact() {
    const g = this.game, tgt = this.target();
    if (!tgt) return;
    if (tgt.kind === 'exit') { g.ui.toast('↑ を押し続けると地上へ出る'); return; }
    if (tgt.kind === 'sleep') {
      this.sleeping = true; this.sleepT = 0;
      this.st = { ...this.st, x: (tgt.it.x0 + tgt.it.x1) / 2, anim: 'sleep' };
      g.ui.toast('すやすや…（何かキーで起きる）');
      return;
    }
    if (tgt.kind === 'store') {
      if (!this.nest.canEdit) { g.ui.toast('ほかの子の倉庫だ。中身はいっぱい'); return; }
      g.ui.storagePanel(g.inv(), this.nest.storage, async (dir, item, n) => {
        const r = await g.net.store(this.nest.id, dir, item, n);
        if (!r.ok) { g.ui.toast(r.reason || 'できない', 'bad'); return; }
        g.setInv(r.inv); this.nest.storage = r.storage;
        this.view.setData(this.data, { fill: this._fill() });
        if (g.ui.updateStorage) g.ui.updateStorage(r.inv, r.storage);
      });
      return;
    }
    const f = FURNITURE[tgt.it.type] || FIXTURES[tgt.it.type];
    g.ui.toast(f ? f.desc : '…');
  }

  draw() {
    const sc = this.game.screen, g = sc.g;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.fillStyle = '#140b07'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(-cx, -cy);
    g.drawImage(this.view.base, 0, 0);
    this.view.drawObjects(g, this.t);
    const lift = this.view.lift;
    const peers = this.viewPeers || this.peers;
    for (const p of peers) {
      const fr = this._peerFrame(p);
      Sprites.drawJerboa(g, p.fur, 'side', fr.anim, p.facing > 0 ? 'right' : 'left', fr.frame, p.x, p.y - (p.anim === 'climb' || p.anim === 'climb_idle' ? 0 : lift));
    }
    const s = this.st;
    const fr = this._frame(s);
    const footLift = s.climbing ? 0 : lift;
    Sprites.drawJerboa(g, this.game.character.fur, 'side', fr.anim, s.facing > 0 ? 'right' : 'left', fr.frame, s.x, s.y - footLift);
    g.restore();
    this.view.drawLight(g, W, H, { x: cx, y: cy }, 1, this.sleeping ? 0.8 : 0.6, this.t, [{ x: s.x, y: s.y - 10, r: 34, a: 0.45 }]);
    sc.clearUI();
    sc.nameTag(s.x - cx, s.y - cy - 30 - footLift, this.game.character.name, { me: true });
    const online = this.game.net.mode === 'online';
    for (const p of peers) {
      sc.nameTag(p.x - cx, p.y - cy - 30 - lift, p.name);
      const b = online && this.game.field && this.game.field.bubbles && this.game.field.bubbles.get(p.id);
      if (b && b.until > performance.now()) sc.bubble(p.x - cx, p.y - cy - 38 - lift, b.text);
      else if (!online && this.t < 6) sc.bubble(p.x - cx, p.y - cy - 38 - lift, 'いらっしゃい！ ゆっくりしていってね');
    }
    const b = this.game.myBubble;
    if (b && b.until > performance.now()) sc.bubble(s.x - cx, s.y - cy - 38 - footLift, b.text);
    if (this.sleeping) {
      const k = this.sleepT;
      for (let i = 0; i < 3; i++) { const p = (k * 0.6 + i / 3) % 1; sc.text(s.x - cx + 8 + p * 14, s.y - cy - 20 - p * 24, 'z', { size: 6 + p * 5, color: '#e8f0ff', alpha: 1 - p }); }
    }
  }
  /** オンライン：巣の中のほかのトビネズミ（nest_peers・10Hz）を少しずつ寄せて表示 */
  _peerList(dt) {
    if (this.game.net.mode !== 'online') return this.peers;
    const src = this.game.nestPeers || [];
    if (!this.pv) this.pv = new Map();
    const k = Math.min(1, dt * 12), out = [];
    for (const p of src) {
      let v = this.pv.get(p.id);
      if (!v || Math.hypot(p.x - v.x, p.y - v.y) > 64) { v = { x: p.x, y: p.y }; this.pv.set(p.id, v); }
      v.x += (p.x - v.x) * k; v.y += (p.y - v.y) * k;
      out.push({ ...p, x: v.x, y: v.y });
    }
    return out;
  }
  _peerFrame(p) {
    const n = a => Sprites.frames('side', a);
    if (p.anim === 'walk') return { anim: 'walk', frame: Math.floor(this.t * 6) % n('walk') };
    if (p.anim === 'jump') return { anim: 'jump', frame: 2 };
    if (p.anim === 'climb' || p.anim === 'climb_idle') return { anim: 'climb', frame: p.anim === 'climb' ? Math.floor(this.t * 5) % n('climb') : 1 };
    if (p.anim === 'sleep') return { anim: 'sleep', frame: Math.floor(this.t * 1.5) % n('sleep') };
    return { anim: 'idle', frame: Math.floor(this.t * 2) % 2 };
  }
  _frame(s) {
    const n = a => Sprites.frames('side', a);
    if (this.sleeping) return { anim: 'sleep', frame: Math.floor(this.t * 1.5) % n('sleep') };
    if (s.climbing) return { anim: 'climb', frame: s.anim === 'climb' ? Math.floor((s.hop % 1) * n('climb')) : 1 };
    if (s.anim === 'jump') return { anim: 'jump', frame: s.vy < -120 ? 0 : s.vy < 0 ? 1 : s.vy < 150 ? 2 : 3 };
    if (s.anim === 'walk') return { anim: 'walk', frame: Math.floor((s.hop % 1) * n('walk')) };
    return { anim: 'idle', frame: Math.floor(this.t * 1.2) % 5 === 0 ? 1 : 0 };
  }
}
