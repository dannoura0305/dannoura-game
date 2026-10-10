// tobinezumi/client/scene-field.js — B. 地上共有フィールド（見下ろし 2D）
// 自分：クライアント予測（Predictor）。他人：100ms 遅れの補間（Interp）。採集・巣穴・チャット・ミニマップ。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import * as A from './art.js';
import { Sprites } from './sprites.js';
import { Predictor, Interp } from './net.js';
import { buildFieldMap, T, TILE, regionAt, canDigBurrow, POND } from '../shared/regions.js';
import { stepField, makeFieldState, STEP_DT, FIELD } from '../shared/move.js';
import { itemName } from '../shared/items.js';
import { hash2 } from '../shared/rng.js';

const PICK_R = 22, ENT_R = 20;
const PRIO = { [T.SAND]: 0, [T.DIRT]: 1, [T.GRASS]: 2 };

export class FieldScene {
  constructor(game) {
    this.game = game;
    this.map = (game.net && game.net.map) || buildFieldMap();
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.fx = [];        // 砂ぼこりなど
    this._prerender();
  }

  // ───────── 地図の下ごしらえ（一度だけ）─────────
  _prerender() {
    const m = this.map;
    const cv = A.mk(m.pxW, m.pxH), g = cv.getContext('2d');
    const useAssets = Sprites.has('tile.sand') && Sprites.has('tile.trans.sand_dirt') && Sprites.has('tile.trans.dirt_grass');
    if (useAssets) {
      // 角（コーナー）ごとの地形：0 砂・1 土・2 草。角はその右下のタイルの地面（見た目だけ半タイルずれる）
      const corner = (cx, cy) => m.ground[Math.max(0, Math.min(m.h - 1, cy)) * m.w + Math.max(0, Math.min(m.w - 1, cx))];
      const lvl = k => k === T.GRASS ? 2 : k === T.DIRT ? 1 : 0;
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const cs = [lvl(corner(tx, ty)), lvl(corner(tx + 1, ty)), lvl(corner(tx + 1, ty + 1)), lvl(corner(tx, ty + 1))];
        const x = tx * 16, y = ty * 16;
        Sprites.drawCell(g, 'tile.sand', Math.floor(hash2(tx, ty, 3) * 4), x, y);
        let bits = cs.reduce((a, c, i) => a | (c >= 1 ? 1 << i : 0), 0);
        if (bits === 15) Sprites.drawCell(g, 'tile.dirt', Math.floor(hash2(tx, ty, 4) * 3), x, y);
        else if (bits) Sprites.drawCell(g, 'tile.trans.sand_dirt', bits, x, y);
        bits = cs.reduce((a, c, i) => a | (c >= 2 ? 1 << i : 0), 0);
        if (bits === 15) Sprites.drawCell(g, 'tile.grass', Math.floor(hash2(tx, ty, 5) * 4), x, y);
        else if (bits) Sprites.drawCell(g, 'tile.trans.dirt_grass', bits, x, y);
      }
    } else {
      const variants = {};
      const tileFor = (kind, v) => {
        const k = kind + ':' + v;
        if (!variants[k]) variants[k] = A.groundTile(kind, v * 3, v * 7, 1);
        return variants[k];
      };
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const gk = m.ground[ty * m.w + tx];
        g.drawImage(tileFor(gk, Math.floor(hash2(tx, ty, 3) * 4)), tx * 16, ty * 16);
      }
      // 境目をぼかす（優先度の高い地面が低い地面へにじむ）
      const col = { [T.DIRT]: A.PAL.dirt, [T.GRASS]: A.PAL.grass };
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        const gk = m.ground[ty * m.w + tx];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
          const nk = m.ground[ny * m.w + nx];
          if (PRIO[nk] <= PRIO[gk]) continue;
          const pal = col[nk];
          for (let i = 0; i < 16; i++) {
            const depth = 1 + Math.floor(hash2(tx * 16 + i, ty * 16 + dx * 3 + dy, 21) * 4);
            for (let d = 0; d < depth; d++) {
              if (hash2(tx * 31 + i, ty * 17 + d, 5) < 0.25 && d === depth - 1) continue;
              const px = dx === 1 ? 15 - d : dx === -1 ? d : i;
              const py = dy === 1 ? 15 - d : dy === -1 ? d : i;
              g.fillStyle = pal[(i + d) % 2 ? 0 : 1];
              g.fillRect(tx * 16 + px, ty * 16 + py, 1, 1);
            }
          }
        }
      }
    }
    // 平たい飾り
    this.tall = [];
    const bigUsed = new Set();
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      const t = m.tiles[ty * m.w + tx], v = Math.floor(hash2(tx, ty, 8) * 6);
      const x = tx * 16 + 8, y = ty * 16 + 8;
      if (t === T.TUFT) { if (!Sprites.drawCell(g, 'tile.grass_tuft', v, x - 8, y - 8)) A.drawTuft(g, x, y + 5, v); }
      else if (t === T.PEBBLE) { if (!Sprites.drawCell(g, 'tile.pebbles', v, x - 8, y - 8)) A.drawPebbleDeco(g, x, y + 4, v); }
      else if (t === T.SHRUB) this.tall.push({ kind: 'shrub', x, y: y + 6, v });
      else if (t === T.ROCK) {
        // 岩場は 2 タイル分の大岩をなるべく使う（右隣も岩で、まだ使っていなければ）
        const right = tx + 1 < m.w && m.tiles[ty * m.w + tx + 1] === T.ROCK && !bigUsed.has(ty * m.w + tx + 1);
        if (bigUsed.has(ty * m.w + tx)) continue;
        if (right && Sprites.has('tile.rock_big')) { bigUsed.add(ty * m.w + tx + 1); this.tall.push({ kind: 'rock_big', x: x + 8, y: y + 6, v }); }
        else this.tall.push({ kind: 'rock', x, y: y + 6, v });
      }
      else if (t === T.STONES) this.tall.push({ kind: 'stones', x, y: y + 5, v });
      else if (t === T.TREE) this.tall.push({ kind: 'tree', x, y: y + 6, v });
    }
    this.water = [];
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) if (m.tiles[ty * m.w + tx] === T.WATER) {
      const isW = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.tiles[y * m.w + x] === T.WATER;
      this.water.push({ tx, ty, edges: { n: !isW(tx, ty - 1), s: !isW(tx, ty + 1), w: !isW(tx - 1, ty), e: !isW(tx + 1, ty) } });
    }
    // 水辺（陸のタイルに重ねる波打ち際）：角が水に接しているもの
    if (Sprites.has('tile.edge.water')) {
      const isW = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.tiles[y * m.w + x] === T.WATER;
      this.shore = [];
      for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
        if (isW(tx, ty)) continue;
        const cw = (cx, cy) => isW(cx - 1, cy - 1) || isW(cx, cy - 1) || isW(cx - 1, cy) || isW(cx, cy);
        const bits = (cw(tx, ty) ? 1 : 0) | (cw(tx + 1, ty) ? 2 : 0) | (cw(tx + 1, ty + 1) ? 4 : 0) | (cw(tx, ty + 1) ? 8 : 0);
        if (bits) this.shore.push({ tx, ty, bits });
      }
    }
    this.ground = cv;
    // ミニマップ（1 タイル 1 ピクセル）
    const mm = A.mk(m.w, m.h), mg = mm.getContext('2d');
    const mcol = ['#e0b87c', '#b07c4a', '#94984a', '#6e6056', '#5a6a2c', '#8a7a6a', '#3e7fb4', '#4e5a26', '#d0aa70', '#a0a24e'];
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) { mg.fillStyle = mcol[m.tiles[ty * m.w + tx]]; mg.fillRect(tx, ty, 1, 1); }
    this.minimap = mm;
  }

  // ───────── 世界の受け取り（joinField の結果）─────────
  init(world) {
    const y = world.you;
    this.me = { id: y.id, name: y.name, fur: y.fur };
    this.inv = y.inv;
    this.myNest = y.nest;
    const st = makeFieldState(y.x, y.y); st.dir = y.dir || 'down';
    this.pred = new Predictor(st, (s, i) => stepField(s, i, STEP_DT, this.map));
    this.pred.onReconcile = info => { this.game.debug.reconciles = (this.game.debug.reconciles || 0) + 1; this.game.debug.lastReconcile = info; };
    this.resources = new Map(world.resources.map(r => [r.id, { ...r }]));
    this.entrances = world.entrances.slice();
    this.players = new Map();
    for (const p of world.players || []) this.addPlayer(p);
    this.bubbles = new Map();
    this.view = { ...st };
    this.clockOffset = (world.serverTime || Date.now()) - Date.now();
    this.ready = true;
  }
  addPlayer(p) {
    if (!p || p.id === this.me.id) return;
    const rp = { id: p.id, name: p.name, fur: p.fur || 'sand', interp: new Interp(), last: { x: p.x, y: p.y, z: 0, dir: p.dir || 'down', anim: 'idle' }, hop: 0 };
    rp.interp.push(this.serverNow() - 200, { x: p.x, y: p.y, z: 0, dir: p.dir || 'down', anim: 'idle' });
    this.players.set(p.id, rp);
  }
  serverNow() { return this.game.net.serverTime ? this.game.net.serverTime() : Date.now(); }

  // ───────── 通信の通知 ─────────
  onSnapshot(m) {
    if (!this.ready) return;
    if (this.game.scene === this) this.pred.reconcile(m.ack, m.you);
    for (const p of m.players || []) {
      let rp = this.players.get(p.id);
      if (!rp) continue;
      rp.interp.push(m.st, p);
    }
  }
  onResGone(m) { const r = this.resources.get(m.id); if (r) { this.resources.delete(m.id); if (m.by !== this.me.id) this.puff(r.x, r.y, '#e8d0a0'); } }
  onResSpawn(m) { this.resources.set(m.res.id, { ...m.res }); }
  onEntrance(m) { const e = m.entrance; this.entrances = this.entrances.filter(x => x.owner !== e.owner); this.entrances.push(e); }
  onChat(m) {
    this.bubbles.set(m.from, { text: m.text, until: performance.now() + 5000 });
  }

  // ───────── 画面の出入り ─────────
  enter(params = {}) {
    const g = this.game;
    this.dom = el('div', 'tb-scene');
    this.regionEl = el('div', 'tb-region'); this.dom.appendChild(this.regionEl);
    this.helpEl = el('div', 'tb-help', 'WASD/方向キー 跳ねる　Space 大ジャンプ　E 調べる・拾う　I 持ち物　Enter チャット　Esc メニュー');
    this.dom.appendChild(this.helpEl);
    this.promptEl = el('div', 'tb-prompt hidden'); this.dom.appendChild(this.promptEl);
    g.hud.appendChild(this.dom);
    g.ui.mountHotbarOnce();
    g.ui.setInventory(this.inv);
    g.ui.showHUD(true);
    if (params.pos) this.pred.reset(makeFieldState(params.pos.x, params.pos.y));
    this.busyUntil = 0;
    this.lastRegion = null;
    this._snapCam();
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; this.game.ui.showHUD(false); }

  _snapCam() { const v = this.pred.state; this.cam.x = this._clampX(v.x - W / 2); this.cam.y = this._clampY(v.y - H / 2); }
  _clampX(x) { return Math.max(0, Math.min(this.map.pxW - W, x)); }
  _clampY(y) { return Math.max(0, Math.min(this.map.pxH - H, y)); }

  // ───────── 入力と更新 ─────────
  fixed(dt) {
    const g = this.game, inp = g.input;
    const locked = g.ui.busy() || performance.now() < this.busyUntil;
    const ax = locked ? { mx: 0, my: 0 } : inp.axis();
    const jump = !locked && !!inp.take('Space');
    const i = this.pred.input({ mx: ax.mx, my: ax.my, jump });
    g.net.sendInput(i);
  }
  update(dt) {
    const g = this.game, inp = g.input;
    this.t += dt;
    this.view = this.pred.view(dt);
    // カメラ
    const tx = this._clampX(this.view.x - W / 2), ty = this._clampY(this.view.y - H / 2);
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 8); this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 8);
    // 着地の砂ぼこり
    const st = this.pred.state;
    if (this._wasJump && !st.jump) { this.puff(st.x, st.y, '#e8cf9a', 6); }
    this._wasJump = !!st.jump;
    if (st.anim === 'hop' && (st.hop % 1) < (this._lastHop % 1) && Math.random() < 0.5) this.puff(st.x - st.fx * 4, st.y, '#e6c690', 2);
    this._lastHop = st.hop;
    for (const p of this.fx) p.t += dt;
    this.fx = this.fx.filter(p => p.t < p.life);
    // 地域名
    const reg = regionAt(this.map, st.x, st.y);
    if (reg !== this.lastRegion) { this.lastRegion = reg; this.regionEl.textContent = reg.name; this.regionEl.classList.remove('flash'); void this.regionEl.offsetWidth; this.regionEl.classList.add('flash'); }
    if (this.t > 25) this.helpEl.classList.add('dim');
    // キー
    if (!g.ui.busy()) {
      if (inp.take('KeyE')) this.interact();
      if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
      if (inp.take('Enter') && !(g.ui._chatClosedAt && performance.now() - g.ui._chatClosedAt < 200)) g.ui.openChat();
      if (inp.take('Escape')) g.openMenu();
      if (inp.take('KeyH')) this.helpEl.classList.toggle('dim');
    } else if (g.ui.modal && (inp.take('Escape') || (g.ui.invPanel && inp.take('KeyI')))) g.ui.closeModal();
    // 近くの対象の案内
    const tgt = this.target();
    this.curTarget = tgt;
    if (tgt && !g.ui.busy()) { this.promptEl.innerHTML = `<b>E</b> ${esc(tgt.label)}`; this.promptEl.classList.remove('hidden'); }
    else this.promptEl.classList.add('hidden');
  }

  /** いちばん近い対象：採集物 > 巣穴 > 巣を掘る */
  target() {
    const s = this.pred.state;
    if (s.jump) return null;
    let best = null, bd = 1e9;
    for (const r of this.resources.values()) {
      if (r.pending) continue;
      const d = Math.hypot(r.x - s.x, r.y - s.y);
      if (d < PICK_R && d < bd) { bd = d; best = { kind: 'res', res: r, label: itemName(r.kind) + ' を拾う' }; }
    }
    for (const e of this.entrances) {
      const d = Math.hypot(e.x - s.x, e.y - s.y) - 4;   // 同じくらいの近さなら巣穴を優先
      if (d < ENT_R && d < bd) { bd = d; best = { kind: 'ent', ent: e, label: e.own ? '巣に入る（' + e.name + 'の巣）' : '訪ねる（' + e.name + 'の巣）' }; }
    }
    if (best) return best;
    if (!this.myNest) {
      const chk = canDigBurrow(this.map, s.x, s.y, this.entrances);
      return chk.ok ? { kind: 'dig', label: 'ここに巣を掘る' } : { kind: 'nodig', label: '巣を掘れない：' + chk.reason };
    }
    return null;
  }

  async interact() {
    const g = this.game, tgt = this.target();
    if (!tgt) return;
    if (tgt.kind === 'res') {
      const r = tgt.res;
      r.pending = true;
      this.gatherT = this.t;
      const res = await g.net.pickup(r.id);
      if (res.ok) {
        this.resources.delete(r.id);
        this.inv = res.inv; g.ui.setInventory(this.inv);
        g.ui.toast(itemName(res.item) + ' を 手に入れた');
        this.puff(r.x, r.y, '#fff0c0', 5);
      } else { r.pending = false; g.ui.toast(res.reason || '拾えなかった', 'bad'); }
    } else if (tgt.kind === 'ent') {
      const e = tgt.ent;
      const res = await g.net.enterNest(e.owner);
      if (!res.ok) { g.ui.toast(res.reason || '入れない', 'bad'); return; }
      g.enterNest(res.nest, e);
    } else if (tgt.kind === 'dig') {
      const ok = await g.ui.confirm('巣を掘る', 'ここに あなたの巣穴を掘りますか？<br><span class="tb-dim">（巣穴は 1 つだけ。あとから中を広げられます）</span>', '掘る', 'やめる');
      if (!ok) return;
      this.busyUntil = performance.now() + 1100;
      this.digT = this.t;
      await new Promise(r => setTimeout(r, 900));
      const s = this.pred.state;
      const res = await g.net.digBurrow(s.x, s.y);
      if (!res.ok) { g.ui.toast(res.reason || '掘れなかった', 'bad'); return; }
      this.onEntrance({ entrance: res.entrance });
      this.myNest = { id: res.entrance.nestId, x: res.entrance.x, y: res.entrance.y };
      this.puff(res.entrance.x, res.entrance.y, '#b98552', 10);
      g.ui.toast('巣穴ができた！ 入口で E を押すと入れる');
    } else if (tgt.kind === 'nodig') {
      g.ui.toast(tgt.label, 'bad');
    }
  }

  puff(x, y, color, n = 4) {
    for (let i = 0; i < n; i++) this.fx.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 10, t: 0, life: 0.4 + Math.random() * 0.3, color });
  }

  // ───────── 描画 ─────────
  draw() {
    const g = this.game.screen.g, sc = this.game.screen;
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.drawImage(this.ground, cx, cy, W, H, 0, 0, W, H);
    g.save(); g.translate(-cx, -cy);
    // 水
    for (const w of this.water) {
      const x = w.tx * 16, y = w.ty * 16;
      if (x < cx - 16 || y < cy - 16 || x > cx + W || y > cy + H) continue;
      if (!Sprites.drawCell(g, 'tile.water', Math.floor(this.t * 3 + (w.tx + w.ty) * 0.5), x, y)) A.drawWater(g, x, y, this.t, w.edges, w.tx, w.ty);
    }
    if (this.shore) for (const w of this.shore) {
      const x = w.tx * 16, y = w.ty * 16;
      if (x < cx - 16 || y < cy - 16 || x > cx + W || y > cy + H) continue;
      Sprites.drawCell(g, 'tile.edge.water', w.bits, x, y, Math.floor(this.t * 3) % 4);
    }
    // 巣穴
    for (const e of this.entrances) {
      if (!Sprites.drawEntry(g, 'tile.burrow', e.own ? 0 : 1, e.x, e.y + 2)) A.drawBurrow(g, e.x, e.y, e.own);
    }
    // 採集物
    const tgt = this.curTarget;
    for (const r of this.resources.values()) {
      if (r.x < cx - 16 || r.y < cy - 16 || r.x > cx + W + 16 || r.y > cy + H + 16) continue;
      const hi = tgt && tgt.kind === 'res' && tgt.res === r;
      g.globalAlpha = r.pending ? 0.4 : 1;
      if (!Sprites.has('item.' + r.kind + '.ground')) { g.fillStyle = 'rgba(40,24,10,.25)'; g.fillRect(r.x - 4, r.y + 2, 8, 2); }
      if (hi) { g.fillStyle = 'rgba(255,240,180,' + (0.35 + 0.25 * Math.sin(this.t * 8)) + ')'; g.beginPath(); g.ellipse(r.x, r.y + 1, 8, 4, 0, 0, Math.PI * 2); g.fill(); }
      const bob = hi ? Math.round(Math.sin(this.t * 6) * 1) - 1 : 0;
      if (!Sprites.drawEntry(g, 'item.' + r.kind + '.ground', 0, r.x, r.y + 3 + bob)) A.drawItem(g, r.kind, r.x - 8, r.y - 12 + bob);
      g.globalAlpha = 1;
    }
    // 背の高いもの＋トビネズミを y でならべる
    const list = [];
    for (const o of this.tall) if (o.x > cx - 40 && o.x < cx + W + 40 && o.y > cy - 10 && o.y < cy + H + 70) list.push(o);
    const now = this.serverNow();
    this.remoteViews = [];
    for (const rp of this.players.values()) {
      const s = rp.interp.sample(now) || rp.last;
      if (s.anim === 'hop' || s.anim === 'walk') rp.hop += 1 / 60 / FIELD.HOP_PERIOD; else rp.hop = 0;
      rp.last = s;
      const v = { kind: 'player', x: s.x, y: s.y, z: s.z || 0, dir: s.dir, anim: s.anim, hop: rp.hop, jump: s.jump, fur: rp.fur, name: rp.name, id: rp.id };
      list.push(v); this.remoteViews.push(v);
    }
    const me = this.view;
    let myAnim = me.anim;
    if (this.digT != null && this.t - this.digT < 1.1) myAnim = 'dig';
    else if (this.gatherT != null && this.t - this.gatherT < 0.35) myAnim = 'gather';
    const meV = { kind: 'player', me: true, x: me.x, y: me.y, z: me.z, dir: me.dir, anim: myAnim, hop: me.hop, jump: me.jump, fur: this.me.fur, name: this.me.name, id: this.me.id, cd: me.cd };
    list.push(meV);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.kind === 'player') this.drawJerboa(g, o);
      else if (o.kind === 'shrub') { if (!Sprites.drawEntry(g, 'tile.shrub', o.v, o.x, o.y)) A.drawShrub(g, o.x, o.y, o.v); }
      else if (o.kind === 'rock') { if (!Sprites.drawEntry(g, 'tile.rock_small', o.v, o.x, o.y)) A.drawRock(g, o.x, o.y, o.v); }
      else if (o.kind === 'rock_big') { Sprites.drawEntry(g, 'tile.rock_big', o.v, o.x, o.y); }
      else if (o.kind === 'stones') {
        // 小石の山（大ジャンプで越えられる）：小石の飾りを 3 つ寄せて積む
        if (Sprites.has('tile.pebbles')) { Sprites.drawEntry(g, 'tile.pebbles', o.v, o.x - 4, o.y + 2); Sprites.drawEntry(g, 'tile.pebbles', o.v + 1, o.x + 4, o.y + 3); Sprites.drawEntry(g, 'tile.pebbles', o.v + 2, o.x, o.y - 1); }
        else A.drawStones(g, o.x, o.y, o.v);
      }
      else if (o.kind === 'tree') { if (!Sprites.drawEntry(g, 'tile.tree', 0, o.x, o.y)) A.drawTree(g, o.x, o.y); }
    }
    // 砂ぼこり
    for (const p of this.fx) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.color; g.fillRect(Math.round(p.x + p.vx * p.t), Math.round(p.y + p.vy * p.t), 2, 1); }
    g.globalAlpha = 1;
    g.restore();
    // 夕暮れの色をうっすら
    g.fillStyle = 'rgba(255,140,80,0.06)'; g.fillRect(0, 0, W, H);
    this.drawMinimap(g);

    // UI レイヤー：名札・吹き出し・巣穴の名前
    sc.clearUI();
    const nowMs = performance.now();
    for (const e of this.entrances) {
      const x = e.x - cx, y = e.y - cy;
      if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
      sc.text(x, y + 14, e.name + 'の巣', { size: 6, color: e.own ? '#ffe9a8' : '#f2dcc0', alpha: 0.9 });
    }
    for (const o of list) if (o.kind === 'player') {
      const x = o.x - cx, y = o.y - cy - (o.z || 0);
      sc.nameTag(x, y - 29, o.name, { me: !!o.me });
      const b = this.bubbles.get(o.id);
      if (b && b.until > nowMs) sc.bubble(x, y - 38, b.text, { alpha: Math.min(1, (b.until - nowMs) / 400) });
    }
  }

  drawJerboa(g, o) {
    const fr = this._frame(o);
    // 影（跳ぶと小さく）
    const z = o.z || 0, sh = Math.max(0.45, 1 - z / 28);
    Sprites.drawShadow(g, o.x, o.y - 1, sh);
    Sprites.drawJerboa(g, o.fur, 'field', fr.anim, o.dir || 'down', fr.frame, o.x, o.y - z);
    if (o.me && o.cd > 0) {   // 大ジャンプのクールダウン
      const k = o.cd / FIELD.JUMP_CD;
      g.fillStyle = 'rgba(42,26,16,.7)'; g.fillRect(Math.round(o.x) - 6, Math.round(o.y) + 2, 12, 2);
      g.fillStyle = '#f0c870'; g.fillRect(Math.round(o.x) - 6, Math.round(o.y) + 2, Math.round(12 * (1 - k)), 2);
    }
  }
  _frame(o) {
    const n = a => Sprites.frames('field', a);
    if (o.anim === 'jump' && o.jump) { const k = Math.min(0.999, o.jump.t / o.jump.dur); return { anim: 'jump', frame: Math.floor(k * n('jump')) }; }
    if (o.anim === 'jump') return { anim: 'jump', frame: 2 };
    if (o.anim === 'hop') return { anim: 'hop', frame: Math.floor(((o.hop || 0) % 1) * n('hop')) };
    if (o.anim === 'dig' || o.anim === 'gather') return { anim: o.anim, frame: Math.floor(this.t * 8) % n(o.anim) };
    const tw = Math.floor(this.t * 2 + hash2(o.id ? o.id.length : 0, 1, 1) * 7) % 7 === 0;
    return { anim: 'idle', frame: tw ? 1 : 0 };
  }

  drawMinimap(g) {
    const m = this.map, s = 0.75, mw = Math.round(m.w * s), mh = Math.round(m.h * s);
    const x0 = W - mw - 6, y0 = 6;
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 3, y0 - 3, mw + 6, mh + 6);
    g.fillStyle = '#c8a46a'; g.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4);
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    g.imageSmoothingEnabled = true; g.drawImage(this.minimap, x0, y0, mw, mh); g.imageSmoothingEnabled = false;
    const P = (x, y, c, r = 1) => { g.fillStyle = c; g.fillRect(Math.round(x0 + x / 16 * s) - r, Math.round(y0 + y / 16 * s) - r, r * 2 + 1, r * 2 + 1); };
    for (const e of this.entrances) P(e.x, e.y, e.own ? '#ffe070' : '#5a3018', e.own ? 1 : 0);
    for (const v of this.remoteViews || []) P(v.x, v.y, '#f4f0e8', 0);
    if (Math.floor(this.t * 3) % 3) P(this.view.x, this.view.y, '#e83a2a', 1);
    // 視界の枠
    g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1;
    g.strokeRect(Math.round(x0 + this.cam.x / 16 * s) + 0.5, Math.round(y0 + this.cam.y / 16 * s) + 0.5, Math.round(W / 16 * s), Math.round(H / 16 * s));
    void POND;
  }
}
