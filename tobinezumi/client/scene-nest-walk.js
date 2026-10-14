// tobinezumi/client/scene-nest-walk.js — D. 巣内閲覧・生活モード（横からの断面を歩く）
// 全体モードと同じ巣データ・同じセル座標（NestView を共有）。← → 歩く、Space ジャンプ、↑↓ 縦通路、坂は ← → だけ。
// 寝床で E → 眠る（Ver.0.2：サーバーが確かめ、体調が 45 秒で戻る。画面は暗くなり、ほかの子には眠っている姿が見える）、
// 種の山で E → 倉庫の種子を食べる、Q → 持ち物の種子を食べる、倉庫で E → 預ける／引き出す、入口の縦穴を上まで登ると地上へ。
// 地上の昼夜は入口から差しこむ光と、地表より上の空（星・月）にだけ出る（巣の中の明るさは変わらない）。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import { NestView } from './nest-view.js';
import { Sprites } from './sprites.js';
import { nestQuery, CELL, KIND_NAME } from '../shared/nest-rules.js';
import { stepSide, makeSideState, STEP_DT } from '../shared/move.js';
import { FURNITURE, FIXTURES } from '../shared/items.js';
import { CURIOS } from '../shared/collect.js';
import { hash2 } from '../shared/rng.js';
import * as A from './art.js';
import { PLUG_COST } from '../shared/protocol.js';
import { sfx } from './sfx.js';
import { lookOfInd } from './family-ui.js';
import { STAGE_NAME, ageLabel, PUP, stageOf } from '../shared/family.js';
import { familyScene, familyBubble, famRooms, petReply, familyLine, PET } from '../shared/family-life.js';
import { talkInSlot, talkLineAt, nextTalk, TALK } from '../shared/family-talk.js';
import { festTalkCtx } from '../shared/festival.js';

const FAM_ROLE = { pup: '子ども', kin: 'きょうだい', mate: 'つれあい', friend: 'なかま', resident: '共同巣の住人' };

const GUIDE_KEYS = '<span><kbd>←</kbd><kbd>→</kbd> 移動</span><span><kbd>Space</kbd> ジャンプ</span><span><kbd>↑</kbd><kbd>↓</kbd> 登る・降りる</span><span><kbd>E</kbd> 調べる・眠る</span><span><kbd>Q</kbd> 食べる</span><span><kbd>K</kbd> 家族</span><span><kbd>B</kbd> ビルドモード</span>';
const GUIDE_TOUCH = '<span>◀ ▶ 移動</span><span>▲ ▼ 登る・降りる（入口の縦穴を▲で地上へ）</span><span>調べる＝寝床で眠る</span><span>ビルド＝全体モード</span>';

export class NestWalkScene {
  get touchLayout() { return 'walk'; }
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
    this.t = 0; this.sleeping = false; this.sleepFade = 0; this.roomLabelT = 0; this.curRoom = undefined;
    this.peers = nest.own ? [] : this._hosts();
    this.fam = new Map();     // Ver.0.4：巣の家族の位置（見た目だけ）
    this.dom = el('div', 'tb-scene tb-walk');
    this.dom.innerHTML = `<div class="tb-wtop">${this._title()}</div>
      <div class="tb-roomlabel"></div>
      <div class="tb-guide">${g.isTouch ? GUIDE_TOUCH : GUIDE_KEYS}</div>
      <div class="tb-prompt tb-ui-block hidden"></div>`;
    this.roomEl = this.dom.querySelector('.tb-roomlabel');
    this.promptEl = this.dom.querySelector('.tb-prompt'); this._promptHTML = null;
    this.promptEl.addEventListener('click', () => { if (!g.ui.busy()) this.interact(); });
    this.guideEl = this.dom.querySelector('.tb-guide');
    if (g.isTouch) setTimeout(() => { if (this.guideEl) this.guideEl.classList.add('fade'); }, 12000);
    g.hud.appendChild(this.dom);
    g.ui.showHUD(true, false, true);
  }
  _title() {
    const n = this.nest;
    return `${esc(n.ownerName)}の巣${n.own ? '' : n.role === 'resident' ? '　<span class="tb-dim">（共同巣の住人）</span>' : n.canEdit ? '　<span class="tb-dim">（共同作業者）</span>' : '　<span class="tb-dim">（見学中）</span>'}${n.plugged ? '　<span class="tb-plugtag">入口：ふさいである</span>' : ''}`;
  }
  _retitle() { const t = this.dom && this.dom.querySelector('.tb-wtop'); if (t) t.innerHTML = this._title(); this.game.ui.layoutTop(); }
  onRoleChange(nest) { this.nest = nest; const t = this.dom && this.dom.querySelector('.tb-wtop'); if (t) t.innerHTML = this._title(); }
  leave() {
    if (this.sleeping) this.wakeUp(true, true);
    if (this.dom) this.dom.remove(); this.dom = null; this.game.screen.clearUI(); this.game.ui.showHUD(false);
  }
  helpHTML() {
    const plug = '<br><b>入口をふさぐ</b>：入口の縦穴の下で 調べる（小石×2）。夜のキツネに掘られても倉庫が無事・ほかの子は入れない。もう一度で ひらく。<br><b>休眠</b>：夏の昼・冬に寝床で眠ると、体調の戻りが早く空腹も減りにくい。';
    return (this.game.isTouch ? '<b>◀ ▶</b> 歩く／<b>▲ ▼</b> はしご・縦の通路を登る・降りる（入口の縦穴を ▲ で地上へ）<br><b>ジャンプ</b>／<b>調べる</b> 寝床で眠る（体調が戻る）・種の山で食べる・倉庫を開く<br><b>食べる</b> 持ち物の種子を食べる／<b>ビルド</b> 全体モード（掘る・部屋・家具）' : '<b>← →</b> 歩く／<b>↑ ↓</b> 登る・降りる／<b>Space</b> ジャンプ<br><b>E</b> 調べる（寝床で眠る＝体調が戻る・種の山で食べる・倉庫）／<b>Q</b> 種子を食べる／<b>B・Tab</b> 全体モード') + plug;
  }
  onTouchChange(on) { if (this.guideEl) this.guideEl.innerHTML = on ? GUIDE_TOUCH : GUIDE_KEYS; }
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
    this._famUpdate(dt);
    this.sleepFade = Math.max(0, Math.min(1, this.sleepFade + (this.sleeping ? dt / 1.2 : -dt / 0.6)));
    if (this.sleeping) {
      this.promptEl.classList.add('hidden');
      this.sleepT += dt;
      if (this.sleepT > 0.8 && (inp.take('KeyE') || inp.take('Space') || inp.take('Escape') || inp.axis().mx || inp.axis().my)) this.wakeUp(true);
      return;
    }
    if (!g.ui.busy()) {
      if (inp.take('Tab') || inp.take('KeyB')) { g.toBuild(this.nest); return; }
      if (inp.take('KeyE')) this.interact();
      if (inp.take('KeyQ')) g.eat('inv');
      if (inp.take('KeyK')) g.openFamily();
      if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
      if (inp.take('Enter') && !(g.ui._chatClosedAt && performance.now() - g.ui._chatClosedAt < 200)) g.ui.openChat();
      if (inp.take('Escape')) g.openMenu();
    } else if (g.ui.modal && (inp.take('Escape') || (g.ui.invPanel && inp.take('KeyI')))) g.ui.closeModal();
    // カメラ
    const mw = this.data.w * CELL, mh = this.data.h * CELL;
    // 巣より画面が大きいときは真ん中に
    const tx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, this.st.x - W / 2));
    const ty = mh + 8 <= H ? (mh - H) / 2 : Math.max(-8, Math.min(mh - H, this.st.y - H / 2 - 10));
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
    if (tgt && !g.ui.busy()) {
      const html = `<b>${g.isTouch ? '調べる' : 'E'}</b> ${esc(g.isTouch ? tgt.label.replace('↑ で', '▲ で') : tgt.label)}`;
      if (this._promptHTML !== html) { this._promptHTML = html; this.promptEl.innerHTML = html; }
      this.promptEl.classList.remove('hidden');
    }
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
    // 入口の縦穴の下：入口をふさぐ・ひらく（Ver.0.3：所有者・共同作業者）
    if (this.nest.canEdit) {
      const d = this.data, ex = d.entrance.x * CELL + CELL / 2;
      if (Math.abs(s.x - ex) < 14 && s.y <= (d.surfaceY + 9) * CELL) return { kind: 'plug', label: this.nest.plugged ? '入口をひらく（小石が 1 つ戻る）' : '入口をふさぐ（小石×' + PLUG_COST.pebble + '・夜のキツネから巣を守る）' };
    }
    // 家族（Ver.0.4）：子に種子をあげる・つれあいと なかよくする
    let fb = null, fd = 13;
    for (const f of this.famViews || []) { const d = Math.abs(f.x - s.x); if (d < fd && Math.abs(f.y - s.y) < 8) { fd = d; fb = f; } }
    if (fb) {
      const m = fb.m, st = m.stage;
      const h = this.game.house;
      if (this._mine(m) && (m.role === 'pup' || m.role === 'kin') && (st === 'pup' || st === 'young') && (m.fed ?? 100) < 60) return { kind: 'feed', m, label: m.name + ' に種子をあげる（おなか ' + Math.round(m.fed) + '）' };
      if (this._mine(m) && m.role === 'mate' && h && !h.pending && !(h.cooldown > 0) && m.species == null && (h.me.stage === 'adult')) return { kind: 'mate', m, label: 'つれあいの' + m.name + 'と なかよくする（赤ちゃん）' };
      if (this._mine(m)) return { kind: 'pet', m, label: m.name + ' を なでる（' + (m.role === 'pup' || m.role === 'kin' ? STAGE_NAME[st] : FAM_ROLE[m.role] || '') + '・体調 +' + PET.COND + '）' };
      return { kind: 'fam', m, label: (m.npc ? m.name + ' にあいさつ（共同巣の住人）' : m.name + ' にあいさつ（' + (FAM_ROLE[m.role] || '') + '・' + STAGE_NAME[st] + '）') };
    }
    let best = null, bd = 1e9;
    for (const it of this.view.layout.interact) {
      if (s.x < it.x0 || s.x > it.x1 || Math.abs(s.y - it.floorY) > 6) continue;
      const d = Math.abs((it.x0 + it.x1) / 2 - s.x);
      if (d < bd) { bd = d; best = it; }
    }
    if (!best) return null;
    const bo = best.type === 'curio' ? this.view.layout.objects.find(x => x.id === best.id) : null;
    const name = bo ? ((CURIOS[bo.item] || {}).name || '飾った品') : (FURNITURE[best.type] || FIXTURES[best.type] || {}).name || best.type;
    if (best.action === 'sleep') return { kind: 'sleep', it: best, label: '眠る（' + name + '・体調が戻る）' };
    if (best.type === 'seed_pile' && (this.nest.own || this.nest.home)) return { kind: 'pile', it: best, label: '種の山から食べる（倉庫の種子）' };
    if (best.action === 'store') return { kind: 'store', it: best, label: this.nest.canEdit ? '預ける・引き出す（倉庫）' : '倉庫をのぞく' };
    return { kind: 'look', it: best, label: '調べる（' + name + '）' };
  }

  interact() {
    const g = this.game, tgt = this.target();
    if (!tgt) return;
    if (tgt.kind === 'exit') { g.ui.toast(g.isTouch ? '▲ を押し続けると地上へ出る' : '↑ を押し続けると地上へ出る'); return; }
    if (tgt.kind === 'sleep') { this.goSleep(tgt); return; }
    if (tgt.kind === 'plug') { this.togglePlug(); return; }
    if (tgt.kind === 'pile') { g.eat('pile'); return; }
    if (tgt.kind === 'feed') { this.feedFam(tgt.m); return; }
    if (tgt.kind === 'mate') { this.mateAgain(tgt.m); return; }
    if (tgt.kind === 'pet') { this.petFam(tgt.m); return; }
    if (tgt.kind === 'fam') { this.greetFam(tgt.m); return; }
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
    if (tgt.it.type === 'curio') {   // Ver.0.5：飾った収集品
      const o = this.view.layout.objects.find(x => x.id === tgt.it.id), c = o && CURIOS[o.item];
      g.ui.note(c ? '<b>' + esc(c.name) + '</b><br>' + esc(c.desc) : '…');
      return;
    }
    const f = FURNITURE[tgt.it.type] || FIXTURES[tgt.it.type];
    g.ui.toast(f ? f.desc : '…');
  }

  async feedFam(m) {
    const g = this.game;
    if (this._asking) return;
    this._asking = true;
    const r = await g.net.feedPup(m.id);
    this._asking = false;
    if (!r.ok) { g.ui.toast(r.reason || 'あげられなかった', 'bad'); return; }
    if (r.inv) g.setInv(r.inv);
    if (r.family) g.setFamily(r.family);
    const v = this.fam.get(m.id); if (v) v.eatT = this.t;
    g.ui.toast(m.name + ' が 種子を食べた（おなか ' + Math.round(r.member.fed) + '）');
  }
  async mateAgain(m) {
    const g = this.game;
    if (this._asking) return;
    this._asking = true;
    const r = await g.net.mateAgain();
    this._asking = false;
    if (!r.ok) { g.ui.toast(r.reason || 'いまは むずかしいみたい', 'bad'); return; }
    if (r.family) g.setFamily(r.family);
    g.ui.toast(m.name + ' と なかよくした。世界の半日ほどで 赤ちゃんが生まれる');
  }
  /** 巣の家族（自分の巣は手元の最新、よその巣は入ったときの様子）。Ver.0.6：オフラインの共同巣の NPC の住人も */
  _family() {
    const me = this.game.account && this.game.account.id;
    let list;
    // 自分の家の巣（所有者・共同巣の住人）：自分の家族は手元の最新、ほかの住人の家族は入ったときの様子（Ver.0.5）
    if ((this.nest.own || this.nest.home) && this.game.house) list = [...this.game.house.members, ...(this.nest.family || []).filter(m => m.acct != null && m.acct !== me)];
    else list = this.nest.family || [];
    if (this.nest.own && this.game.net.mode === 'offline' && this.game.net._npcResMembers) list = [...list, ...this.game.net._npcResMembers()];
    else if (this.nest.npcResidents) list = [...list, ...this.nest.npcResidents];
    return list;
  }
  _mine(m) { return !!((this.nest.own || this.nest.home) && this.game.house && this.game.house.members.some(x => x.id === m.id)); }
  /** 家の子（親）のいま：自分は手元の位置、ほかの家は nest_peers（訪問者の画面でも同じ入力になる） */
  _parents() {
    const out = {};
    const s = this.st, rid = r => (r ? r.id : null);
    const myRoom = this.q.room(Math.floor(s.x / CELL), Math.floor((s.y - 1) / CELL));
    if ((this.nest.own || this.nest.home) && myRoom && !s.climbing) out.me = { x: s.x, roomId: rid(myRoom), facing: s.facing || 1, sleep: !!this.sleeping };
    for (const p of this.viewPeers || this.peers || []) {
      const r = this.q.room(Math.floor(p.x / CELL), Math.floor((p.y - 1) / CELL));
      if (r && p.anim !== 'climb' && p.anim !== 'climb_idle') out[p.id] = { x: p.x, roomId: r.id, facing: p.facing || 1, sleep: p.anim === 'sleep' };
    }
    return out;
  }
  /**
   * 家族の動き（Ver.0.6：shared/family-life.js）。巣の id ＋ サーバーの時計 ＋ 個体の id で決まる（同期の通信なし・どの画面でも同じ）。
   * 子ども・若者は親が同じ部屋にいると ついていく（親の位置は nest_peers で みんなに見えている）。昼・親が眠ると寝床にかたまって眠る。
   */
  _famUpdate(dt) {
    const list = this._family().map(m => ({ ...m, stage: m.stage || stageOf(m.ageMs) }));
    const d = this.data;
    if (!d.rooms.length || !list.length) { this.famViews = []; return; }
    const g = this.game, t = g.net.serverTime ? g.net.serverTime() : Date.now();
    if (!this._famRooms || this._famData !== d) {
      this._famData = d; this._famRooms = famRooms(d, CELL);
      const bi = this.view.layout.interact.find(it => it.action === 'sleep');
      const br = bi ? this.q.room(Math.floor((bi.x0 + bi.x1) / 2 / CELL), Math.floor((bi.floorY - 1) / CELL)) : null;
      this._famBed = bi ? { x0: bi.x0, x1: bi.x1, roomId: br ? br.id : null } : null;
    }
    const tod = g.tod(), env = g.env || {};
    const scene = familyScene({ key: this.nest.id, members: list, rooms: this._famRooms, bed: this._famBed, t, period: tod.period, parents: this._parents() });
    const seeds = (this.nest.storage || []).reduce((a, it) => a + (it && it.id === 'seed' ? it.n : 0), 0);
    const ctx = { season: env.season || 'spring', period: tod.period, weather: env.weather || 'clear', seeds };
    // Ver.0.7：家族どうしの短いやりとり（shared/family-talk.js：巣の id ＋ 時計 ＋ 個体の id で決まる。親の位置は使わない＝訪問者の画面でも同じ）
    const tales = this.nest.tales || null;
    const clk = g.net.clock;
    const tin = { key: this.nest.id, members: list, ctx: { ...ctx, tales, companion: tales ? tales.companion : null, ...(clk ? { festAt: tt => festTalkCtx(clk, tt) } : {}) },   // Ver.0.8：行事の様子は やりとりの始まりの時刻で
      sceneAt: tt => familyScene({ key: this.nest.id, members: list, rooms: this._famRooms, bed: this._famBed, t: tt, period: tod.period, parents: {} }) };
    const tslot = Math.floor(t / TALK.SLOT_MS), tkey = tslot + '|' + list.map(m => m.id + ':' + m.stage + ':' + Math.round(m.fed ?? 100)).join(',') + '|' + JSON.stringify(tin.ctx) + '|' + (clk ? JSON.stringify(festTalkCtx(clk, tslot * TALK.SLOT_MS + TALK.START_MS)) : '');
    if (this._talkKey !== tkey) { this._talkKey = tkey; this._talk = talkInSlot({ ...tin, slot: tslot }); }
    const talk = this._talk && t >= this._talk.t0 - 200 && t <= this._talk.t1 ? this._talk : null;
    const tline = talkLineAt(talk, t);
    const out = [];
    for (const m of list) {
      const q = scene.get(m.id);
      if (!q) continue;
      const inTalk = talk && (String(talk.a) === String(m.id) || String(talk.b) === String(m.id));
      if (inTalk) {   // 話している 2 匹は 向き合う（同じ部屋にいるとき）
        const other = scene.get(String(talk.a) === String(m.id) ? talk.b : talk.a);
        if (other && other.roomId === q.roomId && Math.abs(other.x - q.x) > 2 && q.anim !== 'walk') q.facing = other.x > q.x ? 1 : -1;
      }
      let v = this.fam.get(m.id);
      if (!v || q.pop || v.room !== q.roomId || Math.abs(v.x - q.x) > 60) { if (v && v.room !== q.roomId) v.popT = this.t; v = { ...(v || {}), x: q.x, room: q.roomId, hop: 0 }; this.fam.set(m.id, v); }
      const dx = q.x - v.x;
      v.x += dx * Math.min(1, dt * 10);
      const walking = q.anim === 'walk' || Math.abs(dx) > 1.5;
      v.hop = walking ? v.hop + dt / 0.24 : 0;
      const bub = inTalk ? (tline && String(tline.id) === String(m.id) ? { text: tline.text, talk: true } : null) : talk ? null : familyBubble({ key: this.nest.id, m, t, view: q, ctx });   // やりとりの間は ほかの子は だまって聞く
      const say = v.say && v.say.until > this.t ? v.say.text : bub ? bub.text : null;
      out.push({ m, x: v.x, y: q.y, facing: q.facing, anim: walking ? 'walk' : q.anim, act: q.act, hop: v.hop, eat: v.eatT != null && this.t - v.eatT < 0.8, pop: v.popT != null && this.t - v.popT < 0.4, say, heart: v.heartT != null && this.t - v.heartT < 1.4 ? this.t - v.heartT : null });
    }
    this.famViews = out;
    // 動作確認用：同じ時刻 t でのしぐさ（2 つの画面で同じになるか）
    const inputs = { key: this.nest.id, members: list, rooms: this._famRooms, bed: this._famBed, period: tod.period, parents: this._parents() };
    g.debug.famAt = tt => [...familyScene({ ...inputs, t: tt }).entries()].map(([id, v]) => ({ id, act: v.act, x: v.x, roomId: v.roomId }));
    g.debug.famScene = out.map(f => ({ id: f.m.id, name: f.m.name, act: f.act, anim: f.anim, x: Math.round(f.x), say: f.say || null }));
    const tOut = k => (k ? { a: k.a, b: k.b, type: k.type, topic: k.topic, t0: k.t0, t1: k.t1, lines: k.lines.map(l => ({ id: l.id, name: l.name, text: l.text, t0: l.t0 })) } : null);
    g.debug.famTalk = tOut(talk);
    g.debug.famTalkAt = tt => tOut(talkInSlot({ ...tin, slot: Math.floor(tt / TALK.SLOT_MS) }));   // 同じ時刻のやりとり（2 つの画面で同じか）
    g.debug.famNextTalk = () => tOut(nextTalk({ ...tin, t: g.net.serverTime ? g.net.serverTime() : Date.now() }));
  }
  /** Ver.0.6：なでる（毛づくろいしてあげる）。体調が少し戻り、その子は うれしそうに ひとこと */
  async petFam(m) {
    const g = this.game;
    if (this._asking) return;
    this._asking = true;
    const r = await g.net.petFamily(m.id);
    this._asking = false;
    if (!r.ok) { g.ui.toast(r.reason || 'いまは そっとしておこう', r.code === 'rate' || /さっき/.test(r.reason || '') ? '' : 'bad'); return; }
    if (r.family) g.setFamily(r.family);
    if (r.life) g.setLife(r.life, true);
    const v = this.fam.get(m.id);
    const reply = petReply(m, (this.t * 7.13) % 1);
    if (v) { v.say = { text: reply, until: this.t + 2.6 }; v.heartT = this.t; }
    sfx('safe');
    g.ui.toast(m.name + ' を なでた。' + reply + '（体調 +' + (r.cond || PET.COND) + '）');
    g.debug.pets = (g.debug.pets || 0) + 1;
  }
  /** あいさつ（よその家族・NPC の住人：通信なし） */
  greetFam(m) {
    const v = this.fam.get(m.id);
    const text = m.npc ? familyLine(m, {}, (this.t * 3.7) % 1) : petReply({ ...m, role: m.role === 'mate' ? 'kin' : m.role }, (this.t * 3.7) % 1);
    if (v) { v.say = { text, until: this.t + 2.4 }; v.heartT = this.t; }
    this.game.ui.toast(m.name + '：' + (m.npc ? '共同巣の住人' : (FAM_ROLE[m.role] || '') + '・' + STAGE_NAME[m.stage] + (m.ageMs != null ? '・' + ageLabel(m.ageMs) : '')) + (this.nest.own || m.npc ? '' : '（' + this.nest.ownerName + 'の家族）'));
  }
  onStorage() { this.view.setData(this.data, { fill: this._fill() }); }

  /** 入口をふさぐ・ひらく（サーバーが確かめる：小石 2・巣の中から・所有者か共同作業者） */
  async togglePlug() {
    const g = this.game;
    if (this._asking) return;
    this._asking = true;
    const r = await g.net.plug(!this.nest.plugged);
    this._asking = false;
    if (!r.ok) { g.ui.toast(r.reason || 'できなかった', 'bad'); return; }
    this.nest.plugged = r.plugged;
    if (r.inv) g.setInv(r.inv);
    if (g.field && g.field.myNest && this.nest.own) g.field.myNest.plugged = r.plugged;
    if (g.field) for (const e of g.field.entrances) if (e.nestId === this.nest.id) e.plugged = r.plugged;
    this._retitle();
    sfx('plug');
    g.ui.toast(r.plugged ? '入口を小石でふさいだ（キツネに掘られても無事・ほかの子は入れない）' : '入口をひらいた（小石が 1 つ戻った）');
  }
  /** 寝床で眠る：サーバー（オフラインは同じ API）が寝床の上か確かめる */
  async goSleep(tgt) {
    const g = this.game;
    if (this._asking) return;
    this._asking = true;
    g.net.nestMove(this.st);          // いる場所を先に知らせる（寝床の上かどうかの判定に使う）
    const r = await g.net.sleep();
    this._asking = false;
    if (!r.ok) { g.ui.toast(r.reason || '眠れない', 'bad'); return; }
    this.sleeping = true; this.sleepT = 0;
    this.st = { ...this.st, x: (tgt.it.x0 + tgt.it.x1) / 2, anim: 'sleep' };
    g.net.nestMove(this.st);
    if (r.life) g.setLife(r.life, true);
    g.ui.toast(g.isTouch ? 'すやすや…（体調が戻るまで。ボタンで起きる）' : 'すやすや…（体調が戻るまで。何かキーで起きる）');
  }
  /** 起きる。fromUser=true は自分で起きた（サーバーへ wake）、false は体調が満タンで自然に起きた */
  wakeUp(fromUser = true, silent = false) {
    if (!this.sleeping) return;
    this.sleeping = false;
    this.st = { ...this.st, anim: 'idle' };
    const g = this.game;
    if (fromUser) g.net.wake().then(r => { if (r && r.ok && r.life) g.setLife(r.life, true); });
    g.net.nestMove(this.st);
    if (!silent) g.ui.toast(fromUser ? '目をさました（体調 ' + Math.round((g.life && g.life.cond) || 0) + '）' : 'よく眠った。体調が戻った');
  }

  /** 地表より上（空）：昼夜の色・星・月。巣の中は変えない */
  drawSky(g, tod) {
    const d = this.data, w = d.w * CELL, sh = d.surfaceY * CELL + (this.view.assets ? 8 : 0);
    const k = tod.dark / 0.66;
    if (tod.period === 'day') { g.fillStyle = 'rgba(140,190,235,0.42)'; g.fillRect(0, 0, w, sh); }
    else if (tod.period === 'dawn') { g.fillStyle = `rgba(250,170,190,${0.25 * (1 - k)})`; g.fillRect(0, 0, w, sh); }
    if (k > 0.05) {
      g.fillStyle = `rgba(10,12,40,${0.78 * k})`; g.fillRect(0, 0, w, sh);
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(hash2(i, 3, 5) * w), y = Math.floor(hash2(i, 7, 5) * (sh - 6));
        const tw = 0.5 + 0.5 * Math.sin(this.t * (1 + hash2(i, 1, 9) * 3) + i);
        g.fillStyle = `rgba(255,252,230,${k * (0.35 + 0.65 * tw)})`; g.fillRect(x, y, 1, 1);
      }
      if (tod.moon) {   // 月（三日月）：入口の少し右上
        const mx = Math.round(d.entrance.x * CELL + 70), my = Math.round(sh * 0.32);
        g.fillStyle = `rgba(250,244,200,${k})`; g.beginPath(); g.arc(mx, my, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(16,18,48,${k})`; g.beginPath(); g.arc(mx + 3, my - 2, 5.5, 0, Math.PI * 2); g.fill();
      }
    }
  }

  draw() {
    const sc = this.game.screen, g = sc.g;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.fillStyle = '#140b07'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(-cx, -cy);
    g.drawImage(this.view.base, 0, 0);
    const tod = this.game.tod();
    this.drawSky(g, tod);
    this.view.drawObjects(g, this.t);
    if (this.nest.plugged) { const d = this.data; A.drawPlug(g, d.entrance.x * CELL + CELL / 2, (d.surfaceY + 1) * CELL - 3); A.drawPlug(g, d.entrance.x * CELL + CELL / 2, (d.surfaceY + 1) * CELL + 2); }
    const lift = this.view.lift;
    const peers = this.viewPeers || this.peers;
    // 家族（Ver.0.6：しぐさ。毛づくろい＝前足を口へ（eat）・くんくん＝かがむ（gather）・眠る＝寝床にかたまる）
    const fams = [...(this.famViews || [])].sort((a, b) => (b.m.stage === 'pup') - (a.m.stage === 'pup'));
    for (const f of fams) {
      const L = lookOfInd(f.m);
      let anim = f.anim, frame;
      if (f.eat) anim = 'eat';
      if (anim === 'groom') anim = L.pup ? 'idle' : 'eat';
      else if (anim === 'sniff') anim = L.pup ? 'idle' : 'gather';
      if (anim === 'walk') frame = Math.floor((f.hop % 1) * 4);
      else if (anim === 'sleep') frame = Math.floor(this.t * 1.5 + f.x * 0.05) % 2;
      else if (anim === 'eat' || anim === 'gather') frame = Math.floor(this.t * (f.act === 'groom' ? 4 : 3) + f.x * 0.1) % Math.max(1, Sprites.frames('side', anim));
      else frame = Math.floor(this.t * 1.2 + f.x) % 5 === 0 ? 1 : 0;
      const bob = f.act === 'sniff' && L.pup ? Math.round(Math.sin(this.t * 9 + f.x)) : 0;
      Sprites.drawJerboa(g, L.fur, 'side', anim, f.facing > 0 ? 'right' : 'left', frame, f.x, f.y - lift + bob, L);
      if (f.heart != null) { const k = f.heart / 1.4; if (!Sprites.drawEntry(g, 'ui.heart', 4, f.x, f.y - lift - 24 - k * 10)) { g.fillStyle = `rgba(232,72,90,${1 - k})`; g.fillRect(Math.round(f.x) - 2, Math.round(f.y - lift - 28 - k * 10), 4, 3); } }
    }
    for (const p of peers) {
      const fr = this._peerFrame(p);
      Sprites.drawJerboa(g, p.fur, 'side', fr.anim, p.facing > 0 ? 'right' : 'left', fr.frame, p.x, p.y - (p.anim === 'climb' || p.anim === 'climb_idle' ? 0 : lift), p.look || null);
    }
    const s = this.st;
    const fr = this._frame(s);
    const footLift = s.climbing ? 0 : lift;
    Sprites.drawJerboa(g, this.game.character.fur, 'side', fr.anim, s.facing > 0 ? 'right' : 'left', fr.frame, s.x, s.y - footLift, this.game.look || null);
    g.restore();
    this.view.drawLight(g, W, H, { x: cx, y: cy }, 1, 0.6, this.t, [{ x: s.x, y: s.y - 10, r: 34, a: 0.45 }],
      { entrance: 0.35 + 0.6 * tod.light, entranceTint: tod.dark > 0.3 ? 'rgba(120,150,255,0.10)' : null });
    // 眠り：ゆっくり暗くなる（時間を早回し）
    if (this.sleepFade > 0) { g.fillStyle = `rgba(6,4,14,${0.82 * this.sleepFade})`; g.fillRect(0, 0, W, H); }
    sc.clearUI();
    sc.nameTag(s.x - cx, s.y - cy - 30 - footLift, this.game.character.name, { me: true });
    const bubbles = [];
    for (const f of this.famViews || []) {
      const tall = f.m.stage === 'pup' ? 17 : f.m.stage === 'young' ? 24 : f.m.species === 'longear' ? 34 : 28;
      const tag = (f.m.role === 'mate' ? '♥' : f.m.role === 'friend' ? '☆' : f.m.npc ? '⌂' : '') + f.m.name;
      sc.text(f.x - cx, f.y - cy - lift - tall, tag, { size: 5, color: f.m.role === 'mate' ? '#ffc0cc' : f.m.role === 'friend' ? '#d8e8ff' : f.m.npc ? '#c8f0c0' : '#f2e2c2', alpha: 0.85 });
      if (f.anim === 'sleep') { const q = (this.t * 0.6 + f.x * 0.01) % 1; sc.text(f.x - cx + 6 + q * 8, f.y - cy - lift - 12 - q * 12, 'z', { size: 4 + q * 3, color: '#e8f0ff', alpha: 1 - q }); }
      if (f.say && !this.sleeping) bubbles.push({ x: f.x - cx, y: f.y - cy - lift - tall - 6, text: f.say });
      else if (!f.say && this._mine(f.m) && (f.m.stage === 'pup' || f.m.stage === 'young') && f.m.fed < PUP.AUTO_BELOW / 2 && f.anim !== 'sleep') sc.text(f.x - cx, f.y - cy - lift - tall - 7, 'おなかすいた', { size: 5, color: '#ffb8a0', alpha: 0.9 });
    }
    // ひとこと（重ならないように、近いものは上へずらす）
    bubbles.sort((a, b) => a.x - b.x);
    for (let i = 0; i < bubbles.length; i++) { for (let j = 0; j < i; j++) if (Math.abs(bubbles[i].x - bubbles[j].x) < 46 && Math.abs(bubbles[i].y - bubbles[j].y) < 12) bubbles[i].y = bubbles[j].y - 12; }
    for (const b of bubbles) sc.bubble(b.x, b.y, b.text, { size: 6 });
    const online = this.game.net.mode === 'online';
    for (const p of peers) {
      sc.nameTag(p.x - cx, p.y - cy - 30 - lift, p.name);
      const b = online && this.game.field && this.game.field.bubbles && this.game.field.bubbles.get(p.id);
      if (b && b.until > performance.now()) sc.bubble(p.x - cx, p.y - cy - 38 - lift, b.text);
      else if (!online && this.t < 6) sc.bubble(p.x - cx, p.y - cy - 38 - lift, 'いらっしゃい！ ゆっくりしていってね');
    }
    const b = this.game.myBubble;
    if (b && b.until > performance.now()) sc.bubble(s.x - cx, s.y - cy - 38 - footLift, b.text);
    for (const p of peers) if (p.anim === 'sleep') {   // ほかの子も眠っている
      for (let i = 0; i < 2; i++) { const q = (this.t * 0.6 + i / 2) % 1; sc.text(p.x - cx + 8 + q * 12, p.y - cy - 20 - q * 20 - lift, 'z', { size: 5 + q * 4, color: '#e8f0ff', alpha: 1 - q }); }
    }
    if (this.sleeping || this.sleepFade > 0) {
      const k = this.sleepT || 0, a = this.sleepFade;
      for (let i = 0; i < 3; i++) { const p = (k * 0.6 + i / 3) % 1; sc.text(s.x - cx + 8 + p * 14, s.y - cy - 20 - p * 24, 'z', { size: 6 + p * 5, color: '#e8f0ff', alpha: (1 - p) * Math.max(0.3, a) }); }
      const L = this.game.life;
      if (L && a > 0.3) {
        // 早回しの時計と体調
        const hh = Math.floor((tod.hour + k * 0.25) % 24), cond = Math.round(L.cond);
        sc.text(W / 2, H * 0.28, 'すやすや…', { size: 10, color: '#e8ecff', alpha: a });
        sc.text(W / 2, H * 0.28 + 13, `体調 ${cond} / 100　（時間が早く流れる）`, { size: 7, color: '#ffd0c8', alpha: a });
        const bw = 120, bx = W / 2 - bw / 2, by = H * 0.28 + 18;
        g.fillStyle = `rgba(40,20,20,${0.8 * a})`; g.fillRect(bx, by, bw, 4);
        g.fillStyle = `rgba(232,72,58,${a})`; g.fillRect(bx, by, Math.round(bw * cond / 100), 4);
        void hh;
      }
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
