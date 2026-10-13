// tobinezumi/client/scene-field.js — B. 地上共有フィールド（見下ろし 2D）
// 自分：クライアント予測（Predictor）。他人：100ms 遅れの補間（Interp）。採集・巣穴・チャット・ミニマップ。
// Ver.0.3：捕食者（snapshot の preds を補間して描く・「！」・画面の端の赤・効果音）、天気（砂嵐・雨・寒い夜の粒と色）、
//   土地を調べる（L・「土地」）・ミニマップの重ね表示（M・ミニマップをタップ）・引っ越し・ふさいだ入口・草むらに隠れる・つかまった演出。
import { W, H } from './gfx.js';
import { el, esc } from './ui.js';
import * as A from './art.js';
import { Sprites } from './sprites.js';
import { Predictor, Interp } from './net.js';
import { buildFieldMap, T, TILE, regionAt, canDigBurrow, nearWater, POND } from '../shared/regions.js';
import { moveMods } from '../shared/life.js';
import { stepField, makeFieldState, STEP_DT, FIELD } from '../shared/move.js';
import { itemName } from '../shared/items.js';
import { hash2 } from '../shared/rng.js';
import { pickTapTarget, steerToward } from './touch-logic.js';
import { landAt, digTime, overlayColor, buildLands, PLOT_W, PLOT_H, CLIMATES, RARES } from '../shared/lands.js';
import { fieldMods } from '../shared/season.js';
import { threatTo, ALERT_STATES, inGrass, HIDE_AFTER, PRED } from '../shared/predators.js';
import { sfx } from './sfx.js';

const PICK_R = 22, ENT_R = 20;
const HELP_KEYS = 'WASD/方向キー 跳ねる　Space 大ジャンプ　E 調べる・拾う・飲む　Q 食べる　L 土地　M 地図の重ね表示　I 持ち物　F フレンド　Enter チャット　Esc メニュー';
const HELP_TOUCH = 'スティックで跳ねる・地面や採集物をタップでそこへ（メニュー→ヘルプ）';
const HELP_LIFE = '<br><b>くらし</b>：右下（スマホは左上）のハート＝体調・稲妻＝空腹・しずく＝水分。種子を食べる（Q・「食べる」）、オアシスのふちや夜の夜露で E（調べる）で水を飲む、巣の寝床で眠ると体調が戻る。へとへと（体調 25 未満）だと遅く、大ジャンプできない。<br><b>昼と夜</b>：24 分で 1 日。トビネズミは夜行性で、夜は採集物が早く戻り、夜だけの種子と夜露が出る。';
const HELP_DANGER = '<br><b>危険（捕食者）</b>：夜と夕方は<b>フクロウ</b>（空から。地面の影が大きくなったら急降下）と<b>キツネ</b>（地上を追ってくる。低木や岩は越えられない）、昼は<b>ヘビ</b>（岩や草のかげで待ち伏せ・短く飛びかかる）。見つかると頭の上に<b>！</b>。<br>' +
  '逃げ方：<b>大ジャンプ</b>・ジグザグ・<b>入れる巣穴の入口</b>（自分・公開・フレンド）に飛び込む・<b>草むらでじっとする</b>（隠れる）・オアシスのほとりと出発点の広場は安全。跳ねると音で気づかれやすい。<br>' +
  'つかまると体調が大きく減り、持ち物の一部を落とす（だれでも拾える）。安全な所へ戻され、しばらく狙われない（死なない）。<br>' +
  '<b>天気と季節</b>：時計の横に季節と天気。砂嵐は遅くなり、物かげ（岩・低木・巣穴）にいないと体調が減る。雨は水たまり（飲める）ができて草や種がよく育つ。冬の夜は寒く、巣の外では体調が減る。夏の昼・冬に巣で眠ると休眠（よく休める）。<br>' +
  '<b>土地</b>：L（土地）でいる場所の食料・危険・地質・気候・希少資源・景観を調べる。巣は土地を選んで掘り、あとから引っ越しもできる（巣の中身はそのまま）。M でミニマップに危険・食料を重ねる。';
const HELP_FULL_KEYS = '<b>WASD・方向キー</b> 跳ねる／<b>Space</b> 大ジャンプ（小石の山や草むらを越える）<br><b>E</b> 拾う・調べる・巣に入る・巣を掘る・水を飲む<br><b>Q</b> 種子を 1 つ食べる／<b>L</b> 土地を調べる・引っ越す／<b>M</b> ミニマップの重ね表示／<b>I</b> 持ち物／<b>F</b> フレンド／<b>Enter</b> チャット／<b>Esc</b> メニュー／<b>H</b> 下の案内を出す・隠す' + HELP_LIFE + HELP_DANGER;
const HELP_FULL_TOUCH = '<b>左のスティック</b> 跳ねる（左側のどこを触ってもよい）<br><b>ジャンプ</b> 大ジャンプ（小石の山や草むらを越える）<br><b>地面をタップ</b> そこへ跳ねていく<br><b>採集物・巣穴をタップ</b> 歩いて行って拾う・入る<br><b>自分をタップ・調べる</b> 拾う・巣を掘る・巣に入る・水を飲む<br><b>食べる</b> 種子を 1 つ食べる／<b>土地</b> いる場所の土地を調べる・引っ越す／<b>ミニマップをタップ</b> 危険・食料の重ね表示／<b>フレンド</b> メニューから<br><b>持ち物・チャット・メニュー</b> 上の帯のボタン（ホットバーを押しても持ち物）' + HELP_LIFE + HELP_DANGER; 
const PRIO = { [T.SAND]: 0, [T.DIRT]: 1, [T.GRASS]: 2 };

export class FieldScene {
  get touchLayout() { return 'field'; }
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
    this.pred = new Predictor(st, (s, i) => stepField(s, i, STEP_DT, this.map, fieldMods(moveMods(this.game.life), this.game.env)));
    this.pred.onReconcile = info => { this.game.debug.reconciles = (this.game.debug.reconciles || 0) + 1; this.game.debug.lastReconcile = info; };
    this.resources = new Map(world.resources.map(r => [r.id, { ...r }]));
    this.entrances = world.entrances.slice();
    this.players = new Map();
    for (const p of world.players || []) this.addPlayer(p);
    this.bubbles = new Map();
    this.view = { ...st };
    this.clockOffset = (world.serverTime || Date.now()) - Date.now();
    this.ping = null;
    this.preds = new Map(); this.predLatest = []; this.threat = null; this.stillT = 0; this.wx = []; this.shake = 0; this.flash = 0;
    this.danger = world.danger || { predators: 'off', env: false };
    this.ready = true;
  }
  /** フレンドの一覧が変わった：入口の名札・ミニマップの色に使う */
  onFriends(list) { this.friendIds = new Set((list || []).filter(f => f.state === 'friend').map(f => f.id)); }
  isFriend(id) { return !!(this.friendIds && this.friendIds.has(id)); }
  /** ミニマップの点を光らせる（フレンドの巣の場所など） */
  pingAt(x, y, label) { this.ping = { x, y, label, until: this.t + 12 }; }
  onEat() { this.eatT = this.t; }
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
    // 捕食者：補間して描く。消えたものは少し待ってから外す
    const seen = new Set(), me = this.me.id;
    for (const q of m.preds || []) {
      seen.add(q.id);
      let v = this.preds.get(q.id);
      if (!v) { v = { id: q.id, kind: q.kind, interp: new Interp(), prev: null }; this.preds.set(q.id, v); }
      v.interp.push(m.st, q); v.latest = q; v.goneAt = 0;
      // 予告の音（自分が狙われたとき）
      if (q.target === me && q.state !== v.prev) {
        if (q.state === 'alert' || q.state === 'stalk' || q.state === 'rattle') { sfx('alert'); sfx(q.kind === 'owl' ? 'owl' : q.kind === 'fox' ? 'fox' : 'hiss'); }
        else if (q.state === 'dive') sfx('dive');
        else if (q.state === 'lunge') sfx('hiss');
      }
      if (v.prev && ALERT_STATES.has(v.prev) && !ALERT_STATES.has(q.state) && v.wasMine && q.state !== 'leave') { this.game.ui.toast(PRED[q.kind].name + 'から にげきった！'); sfx('safe'); }
      v.wasMine = q.target === me || (v.wasMine && ALERT_STATES.has(q.state));
      v.prev = q.state;
    }
    for (const [id, v] of this.preds) if (!seen.has(id)) { if (!v.goneAt) v.goneAt = m.st; else if (m.st - v.goneAt > 400) this.preds.delete(id); }
    this.predLatest = m.preds || [];
    this.threat = threatTo(this.predLatest, me);
  }
  /** つかまった（サーバー／オフラインから）：安全な所へ戻る・画面がゆれる・落とした物 */
  onCaught(m) {
    if (!this.ready) return;
    this.pred.reset(makeFieldState(m.x, m.y));
    this._snapCam();
    this.autoGo = null;
    this.shake = 0.5; this.flash = 1;
    for (const v of this.preds.values()) v.wasMine = false;
    if (m.inv) { this.inv = m.inv; this.game.ui.setInventory(this.inv); }
    sfx('caught');
  }
  onResGone(m) { const r = this.resources.get(m.id); if (r) { this.resources.delete(m.id); if (m.by !== this.me.id) this.puff(r.x, r.y, '#e8d0a0'); } }
  onResSpawn(m) { this.resources.set(m.res.id, { ...m.res }); }
  onEntrance(m) {
    const e = m.entrance;
    this.entrances = this.entrances.filter(x => x.owner !== e.owner); this.entrances.push(e);
    if (e.own) this.myNest = { ...(this.myNest || {}), id: e.nestId, x: e.x, y: e.y, plugged: !!e.plugged };
    if (m.moved && !e.own) { this.puff(e.x, e.y, '#b98552', 8); if (this.isFriend(e.owner)) { this.game.ui.toast(e.name + ' が 巣を引っ越した（ミニマップで光っている所）'); this.pingAt(e.x, e.y, e.name + 'の巣'); } }
  }
  onChat(m) {
    this.bubbles.set(m.from, { text: m.text, until: performance.now() + 5000 });
  }

  // ───────── 画面の出入り ─────────
  enter(params = {}) {
    const g = this.game;
    this.dom = el('div', 'tb-scene');
    this.regionEl = el('div', 'tb-region'); this.dom.appendChild(this.regionEl);
    this.helpEl = el('div', 'tb-help', g.isTouch ? HELP_TOUCH : HELP_KEYS);
    this.dom.appendChild(this.helpEl);
    // 「E 拾う」の案内。タッチでは押せる（調べるボタンと同じ）
    this.promptEl = el('div', 'tb-prompt tb-ui-block hidden'); this.dom.appendChild(this.promptEl);
    this._promptHTML = null;   // 新しい案内の箱（前の文字を使い回さない）
    this.promptEl.addEventListener('click', () => { if (!g.ui.busy()) this.interact(); });
    this.autoGo = null;
    g.hud.appendChild(this.dom);
    g.ui.mountHotbarOnce();
    g.ui.setInventory(this.inv);
    g.ui.showHUD(true);
    if (params.pos) this.pred.reset(makeFieldState(params.pos.x, params.pos.y));
    this.busyUntil = 0;
    this.lastRegion = null;
    this._snapCam();
  }
  leave() { if (this.dom) this.dom.remove(); this.dom = null; this.autoGo = null; this.game.ui.showHUD(false); }
  onTouchChange(on) { if (this.helpEl) this.helpEl.textContent = on ? HELP_TOUCH : HELP_KEYS; }
  helpHTML() { return this.game.isTouch ? HELP_FULL_TOUCH : HELP_FULL_KEYS; }

  _snapCam() { const v = this.pred.state; this.cam.x = this._clampX(v.x - W / 2); this.cam.y = this._clampY(v.y - H / 2); }
  _clampX(x) { return Math.max(0, Math.min(this.map.pxW - W, x)); }
  _clampY(y) { return Math.max(0, Math.min(this.map.pxH - H, y)); }

  // ───────── 入力と更新 ─────────
  fixed(dt) {
    const g = this.game, inp = g.input;
    const locked = g.ui.busy() || performance.now() < this.busyUntil || (g.net.mode === 'online' && g.net.state !== 'online');   // 再接続中は止まって待つ
    let ax = locked ? { mx: 0, my: 0 } : inp.axis();
    const jump = !locked && !!inp.take('Space');
    if (ax.mx || ax.my || jump) this.autoGo = null;            // 自分で動かしたらタップ移動はやめる
    else if (this.autoGo && !locked) ax = this._steer(dt);
    const i = this.pred.input({ mx: ax.mx, my: ax.my, jump });
    g.net.sendInput(i);
    const st = this.pred.state;
    this.stillT = st.anim === 'idle' && !st.jump ? this.stillT + dt : 0;
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
    let n = 0;
    for (const p of this.fx) { p.t += dt; if (p.t < p.life) this.fx[n++] = p; }
    this.fx.length = n;
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt * 1.4);
    this._weatherFx(dt);
    this.hidden = this.stillT >= HIDE_AFTER && inGrass(this.map, st.x, st.y);
    // 地域名
    const reg = regionAt(this.map, st.x, st.y);
    if (reg !== this.lastRegion) { this.lastRegion = reg; this.regionEl.textContent = reg.name; this.regionEl.classList.remove('flash'); void this.regionEl.offsetWidth; this.regionEl.classList.add('flash'); }
    if (this.t > (g.isTouch ? 6 : 25) && !this._helpPinned) this.helpEl.classList.add('dim');   // 最初の数秒だけ（メニュー→ヘルプでいつでも）
    // 画面のタップ（タッチ）。マウスのクリックは従来どおり何もしない
    for (const ev of inp.takeMouse()) {
      if (ev.pt === 'mouse') continue;
      if (ev.type === 'down') this._tap = g.ui.busy() ? null : { id: ev.id, x: ev.x, y: ev.y, t: this.t };   // パネルを閉じる指は地面のタップにしない
      else if (ev.type === 'up' && this._tap && this._tap.id === ev.id) {
        const tp = this._tap; this._tap = null;
        if (Math.hypot(ev.x - tp.x, ev.y - tp.y) < 10 && this.t - tp.t < 0.6 && !g.ui.busy()) this.tapAt(ev.x, ev.y);
      } else if (ev.type === 'cancel') this._tap = null;
    }
    // キー
    if (!g.ui.busy()) {
      if (inp.take('KeyE')) this.interact();
      if (inp.take('KeyQ')) g.eat('inv');
      if (inp.take('KeyF')) g.openFriends();
      if (inp.take('KeyL')) this.openSurvey();
      if (inp.take('KeyM')) this.cycleOverlay();
      if (inp.take('KeyI')) g.ui.toggleInventory((a, b) => g.moveSlot(a, b));
      if (inp.take('Enter') && !(g.ui._chatClosedAt && performance.now() - g.ui._chatClosedAt < 200)) g.ui.openChat();
      if (inp.take('Escape')) g.openMenu();
      if (inp.take('KeyH')) this.helpEl.classList.toggle('dim');
    } else if (g.ui.modal && (inp.take('Escape') || (g.ui.invPanel && inp.take('KeyI')))) g.ui.closeModal();
    // 近くの対象の案内
    const tgt = this.target();
    this.curTarget = tgt;
    if (tgt && !g.ui.busy()) {
      const html = `<b>${g.isTouch ? '調べる' : 'E'}</b> ${esc(tgt.label)}`;
      if (this._promptHTML !== html) { this._promptHTML = html; this.promptEl.innerHTML = html; }
      this.promptEl.classList.remove('hidden');
    } else this.promptEl.classList.add('hidden');
  }

  // ───────── タップで移動（タッチ）─────────
  /** タップした所（画面の内部座標）へ向かう。採集物・巣穴なら着いたら拾う・入る */
  tapAt(sx, sy) {
    if (this._mm && sx >= this._mm.x0 - 4 && sx <= this._mm.x0 + this._mm.w + 4 && sy >= this._mm.y0 - 4 && sy <= this._mm.y0 + this._mm.h + 4) { this.cycleOverlay(); return; }
    const wx = sx + this.cam.x, wy = sy + this.cam.y, s = this.pred.state;
    // 自分をタップ：調べる（E と同じ）
    if (Math.hypot(wx - s.x, wy - (s.y - 10)) < 12) { this.autoGo = null; this.interact(); return; }
    const hit = pickTapTarget(wx, wy, { resources: [...this.resources.values()], entrances: this.entrances, players: this.remoteViews || [] });
    if (hit && hit.kind === 'res') this.autoGo = { x: hit.ref.x, y: hit.ref.y, kind: 'res', ref: hit.ref, arrive: PICK_R - 8 };
    else if (hit && hit.kind === 'ent') this.autoGo = { x: hit.ref.x, y: hit.ref.y + 2, kind: 'ent', ref: hit.ref, arrive: ENT_R - 8 };
    else if (hit && hit.kind === 'player') this.autoGo = { x: hit.ref.x, y: hit.ref.y, kind: 'player', ref: hit.ref, arrive: 18 };
    else this.autoGo = { x: wx, y: wy, kind: 'spot', arrive: 3 };
    this.autoGo.best = 1e9; this.autoGo.stuck = 0; this.autoGo.t0 = this.t;
  }
  _steer(dt) {
    const a = this.autoGo, s = this.pred.state;
    if (s.jump) return { mx: 0, my: 0 };
    if (a.kind === 'player' && a.ref) { const p = (this.remoteViews || []).find(v => v.id === a.ref.id); if (p) { a.x = p.x; a.y = p.y; } }
    const st = steerToward(s.x, s.y, a.x, a.y, a.arrive);
    if (st.done) {
      this.autoGo = null;
      if (a.kind === 'res' || a.kind === 'ent') { const tgt = this.target(); if (tgt && (tgt.res === a.ref || tgt.ent === a.ref)) this.interact(tgt); }
      return { mx: 0, my: 0 };
    }
    // 岩や水で止まったら（0.8 秒近づけない）あきらめる
    if (st.dist < a.best - 0.5) { a.best = st.dist; a.stuck = 0; } else a.stuck += dt;
    if (a.stuck > 0.8) { this.autoGo = null; if (a.kind !== 'spot' || st.dist > 12) this.game.ui.toast('そこまで行けない'); return { mx: 0, my: 0 }; }
    return st;
  }

  /** いちばん近い対象：採集物 > 巣穴 > 巣を掘る */
  target() {
    const s = this.pred.state;
    if (s.jump) return null;
    let best = null, bd = 1e9;
    for (const r of this.resources.values()) {
      if (r.pending) continue;
      const d = Math.hypot(r.x - s.x, r.y - s.y);
      if (d < PICK_R && d < bd) { bd = d; best = r.kind === 'dew' ? { kind: 'dew', res: r, label: '夜露を飲む' } : r.kind === 'puddle' ? { kind: 'dew', res: r, label: '水たまりの水を飲む' } : { kind: 'res', res: r, label: itemName(r.kind) + (r.n > 1 ? ' ×' + r.n : '') + ' を拾う' + (r.id[0] === 'x' ? '（落とし物）' : '') }; }
    }
    for (const e of this.entrances) {
      const d = Math.hypot(e.x - s.x, e.y - s.y) - 4;   // 同じくらいの近さなら巣穴を優先
      if (d < ENT_R && d < bd) { bd = d; best = { kind: 'ent', ent: e, label: e.own ? '巣に入る（' + e.name + 'の巣）' : e.plugged ? e.name + 'の巣（入口がふさがれている）' : '訪ねる（' + e.name + 'の巣）' }; }
    }
    if (best) return best;
    if (nearWater(this.map, s.x, s.y)) return { kind: 'water', label: '水を飲む' };
    if (!this.myNest) {
      const chk = canDigBurrow(this.map, s.x, s.y, this.entrances);
      return chk.ok ? { kind: 'dig', label: 'ここに巣を掘る' } : { kind: 'nodig', label: '巣を掘れない：' + chk.reason };
    }
    return null;
  }

  async interact(pre) {
    const g = this.game, tgt = pre || this.target();
    if (!tgt) return;
    if (tgt.kind === 'res') {
      const r = tgt.res;
      r.pending = true;
      this.gatherT = this.t;
      const res = await g.net.pickup(r.id);
      if (res.ok) {
        this.resources.delete(r.id);
        this.inv = res.inv; g.ui.setInventory(this.inv);
        g.ui.toast(itemName(res.item) + (res.n > 1 ? ' ×' + res.n : '') + ' を 手に入れた' + (r.id[0] === 'g' ? '（めずらしい！）' : ''));
        this.puff(r.x, r.y, '#fff0c0', 5);
      } else { r.pending = false; g.ui.toast(res.reason || '拾えなかった', 'bad'); }
    } else if (tgt.kind === 'ent') {
      const e = tgt.ent;
      const res = await g.net.enterNest(e.owner);
      if (!res.ok) { g.ui.toast(res.reason || '入れない', 'bad'); return; }
      g.enterNest(res.nest, e);
    } else if (tgt.kind === 'dig') {
      const L = landAt(this.map, this.pred.state.x, this.pred.state.y), dt = digTime(L);
      const ok = await g.ui.confirm('巣を掘る', 'ここに あなたの巣穴を掘りますか？<br>' + g.ui.landSummaryHTML(L) + '<span class="tb-dim">（巣穴は 1 つだけ。あとから中を広げられる。土地は「土地」で調べられ、あとで引っ越しもできる）</span>', '掘る', 'やめる');
      if (!ok) return;
      this.busyUntil = performance.now() + dt * 1000 + 200;
      this.digT = this.t; this.digDur = dt;
      await new Promise(r => setTimeout(r, dt * 1000));
      const s = this.pred.state;
      const res = await g.net.digBurrow(s.x, s.y);
      if (!res.ok) { g.ui.toast(res.reason || '掘れなかった', 'bad'); return; }
      this.onEntrance({ entrance: res.entrance });
      this.myNest = { id: res.entrance.nestId, x: res.entrance.x, y: res.entrance.y, land: res.land };
      if (res.inv) { this.inv = res.inv; g.ui.setInventory(this.inv); }
      this.puff(res.entrance.x, res.entrance.y, '#b98552', 10);
      g.ui.toast(g.isTouch ? '巣穴ができた！ 入口をタップすると入れる' : '巣穴ができた！ 入口で E を押すと入れる');
    } else if (tgt.kind === 'dew' || tgt.kind === 'water') {
      const r = tgt.res;
      if (r) r.pending = true;
      const res = await g.net.drink(r ? r.id : undefined);
      if (r) r.pending = false;
      if (!res.ok) { g.ui.toast(res.reason || '飲めなかった', 'bad'); return; }
      if (r) { this.resources.delete(r.id); this.puff(r.x, r.y, '#bfe8ff', 5); }
      g.setLife(res.life, true);
      this.eatT = this.t;
      g.ui.toast((res.src === 'dew' ? '夜露を飲んだ' : '水を飲んだ') + '（水分 ' + Math.round(res.life.thirst) + '）');
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
    const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 6 * this.shake * 2) : 0;
    const cx = Math.max(0, Math.round(this.cam.x) + sh), cy = Math.round(this.cam.y);
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
      if (e.plugged && !Sprites.drawEntry(g, 'tile.plug', 0, e.x, e.y + 2)) A.drawPlug(g, e.x, e.y + 1);
    }
    if (this.surveyAt && this.t - this.surveyT < 20 && !Sprites.drawEntry(g, 'ui.land_flag', 0, this.surveyAt.x + 6, this.surveyAt.y)) { g.fillStyle = '#6e4a30'; g.fillRect(Math.round(this.surveyAt.x) + 6, Math.round(this.surveyAt.y) - 12, 1, 12); g.fillStyle = '#e05040'; g.fillRect(Math.round(this.surveyAt.x) + 7, Math.round(this.surveyAt.y) - 12, 5, 4); }
    // 採集物
    const tgt = this.curTarget;
    for (const r of this.resources.values()) {
      if (r.x < cx - 16 || r.y < cy - 16 || r.x > cx + W + 16 || r.y > cy + H + 16) continue;
      const hi = tgt && tgt.kind === 'res' && tgt.res === r;
      g.globalAlpha = r.pending ? 0.4 : 1;
      if (r.kind !== 'dew' && !Sprites.has('item.' + r.kind + '.ground')) { g.fillStyle = 'rgba(40,24,10,.25)'; g.fillRect(r.x - 4, r.y + 2, 8, 2); }
      if (hi) { g.fillStyle = 'rgba(255,240,180,' + (0.35 + 0.25 * Math.sin(this.t * 8)) + ')'; g.beginPath(); g.ellipse(r.x, r.y + 1, 8, 4, 0, 0, Math.PI * 2); g.fill(); }
      const bob = hi ? Math.round(Math.sin(this.t * 6) * 1) - 1 : 0;
      if (r.kind === 'dew') A.drawDew(g, r.x, r.y + bob, this.t + r.x * 0.13);
      else if (r.kind === 'puddle') { if (!Sprites.drawEntry(g, 'tile.puddle', (r.x >> 3) & 1, r.x, r.y + 3)) A.drawPuddle(g, r.x, r.y + 1, this.t); const tw = 0.5 + 0.5 * Math.sin(this.t * 3 + r.y); g.fillStyle = `rgba(240,252,255,${0.4 + 0.5 * tw})`; g.fillRect(Math.round(r.x + 2), Math.round(r.y - 1), 1, 1); }
      else if (!Sprites.drawEntry(g, 'item.' + r.kind + '.ground', 0, r.x, r.y + 3 + bob)) A.drawItem(g, r.kind, r.x - 8, r.y - 12 + bob);
      if (r.id && r.id[0] === 'x') { g.fillStyle = 'rgba(255,230,150,' + (0.5 + 0.3 * Math.sin(this.t * 5 + r.x)) + ')'; g.fillRect(Math.round(r.x) - 6, Math.round(r.y) - 11, 1, 1); g.fillRect(Math.round(r.x) + 5, Math.round(r.y) - 9, 1, 1); }
      if (r.id && r.id[0] === 'g') { const tw = (this.t * 1.3 + r.x * 0.01) % 1; g.fillStyle = `rgba(255,250,220,${1 - tw})`; g.fillRect(Math.round(r.x) + 4, Math.round(r.y) - 10 - Math.round(tw * 4), 1, 1); }
      g.globalAlpha = 1;
    }
    // 捕食者：フクロウの影（地面）と、地上の捕食者（並べて描く）
    const now0 = this.serverNow();
    this.predViews = [];
    for (const v of this.preds.values()) {
      const q = v.interp.sample(now0) || v.latest;
      if (!q) continue;
      const pv = { ...v.latest, x: q.x, y: q.y, z: q.z || 0, sx: q.sx ?? v.latest.sx, sy: q.sy ?? v.latest.sy, sr: q.sr ?? v.latest.sr, kind: v.kind, gone: !!v.goneAt };
      this.predViews.push(pv);
      if (pv.kind === 'owl') this.drawOwlShadow(g, pv);
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
    for (const pv of this.predViews) if (pv.kind !== 'owl') list.push({ ...pv, kind: 'pred', pkind: pv.kind });
    const me = this.view;
    let myAnim = me.anim;
    if (this.digT != null && this.t - this.digT < (this.digDur || 1) + 0.2) myAnim = 'dig';
    else if (this.gatherT != null && this.t - this.gatherT < 0.35) myAnim = 'gather';
    else if (this.eatT != null && this.t - this.eatT < 0.7 && me.anim === 'idle') myAnim = 'eat';
    const meV = { kind: 'player', me: true, x: me.x, y: me.y, z: me.z, dir: me.dir, anim: myAnim, hop: me.hop, jump: me.jump, fur: this.me.fur, name: this.me.name, id: this.me.id, cd: me.cd };
    list.push(meV);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.kind === 'player') this.drawJerboa(g, o);
      else if (o.kind === 'pred') this.drawPred(g, o);
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
    // タップで向かっている所
    if (this.autoGo) {
      const a = this.autoGo, k = (this.t * 2) % 1;
      g.strokeStyle = `rgba(255,236,170,${0.9 - k * 0.6})`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5, 3 + k * 4, 1.5 + k * 2, 0, 0, Math.PI * 2); g.stroke();
    }
    // 砂ぼこり
    for (const p of this.fx) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.color; g.fillRect(Math.round(p.x + p.vx * p.t), Math.round(p.y + p.vy * p.t), 2, 1); }
    g.globalAlpha = 1;
    // フクロウの影の輪（トビネズミより上に：影が見えるように）と、空のフクロウ（いちばん上）
    for (const pv of this.predViews) if (pv.kind === 'owl' && (pv.state === 'stalk' || pv.state === 'dive')) {
      const r = pv.sr || 4, x = Math.round(pv.sx ?? pv.x) + 0.5, y = Math.round(pv.sy ?? pv.y) + 0.5, pulse = 0.5 + 0.5 * Math.sin(this.t * 14);
      g.strokeStyle = pv.target === this.me.id ? `rgba(255,80,60,${0.45 + 0.45 * pulse})` : 'rgba(255,200,180,.45)'; g.lineWidth = 1;
      g.setLineDash([2, 2]); g.beginPath(); g.ellipse(x, y, r * 2 + 3, r + 2, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
    for (const pv of this.predViews) if (pv.kind === 'owl') this.drawPred(g, { ...pv, pkind: 'owl' });
    g.restore();
    // 天気・季節の色（夜の暗さより下に塗る）→ 昼夜：色味と暗さ（自分のまわりはほんのり明るい）・水面の星と月 → 天気の粒
    this.drawWeather(g, cx, cy, 'tint');
    this.drawNight(g, cx, cy, list);
    this.drawWeather(g, cx, cy, 'fx');
    // 捕食者の「！」（暗くても見える）・狙われているときの画面の端の赤・つかまった瞬間の赤
    this.drawAlerts(g, cx, cy);
    this.drawMinimap(g);

    // UI レイヤー：名札・吹き出し・巣穴の名前
    sc.clearUI();
    const nowMs = performance.now();
    if (this.overlay && this._mm) sc.text(this._mm.x0 + this._mm.w / 2, this._mm.y0 + this._mm.h + 2, this.overlay === 'danger' ? '危険（緑→赤）' : '食料（多いほど緑）', { size: 6, color: this.overlay === 'danger' ? '#ffb8a0' : '#b8f0a8', alpha: 0.95 });
    for (const e of this.entrances) {
      const x = e.x - cx, y = e.y - cy;
      if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
      const fr = !e.own && this.isFriend(e.owner);
      sc.text(x, y + 14, e.name + 'の巣' + (fr ? '（フレンド）' : ''), { size: 6, color: e.own ? '#ffe9a8' : fr ? '#bff0c8' : '#f2dcc0', alpha: 0.9 });
    }
    for (const o of list) if (o.kind === 'player') {
      const x = o.x - cx, y = o.y - cy - (o.z || 0);
      sc.nameTag(x, y - 29, o.name, { me: !!o.me });
      if (o.me && this.hidden && ((this.predViews && this.predViews.length) || (this.tod && this.tod.period !== 'day'))) sc.text(x, y + 9, 'かくれている', { size: 6, color: '#c8f0a0', alpha: 0.9 });
      const b = this.bubbles.get(o.id);
      if (b && b.until > nowMs) sc.bubble(x, y - 38, b.text, { alpha: Math.min(1, (b.until - nowMs) / 400) });
    }
  }

  drawJerboa(g, o) {
    const fr = this._frame(o);
    // 影（跳ぶと小さく）
    const z = o.z || 0, sh = Math.max(0.45, 1 - z / 28);
    const inv = o.me && this.game.invulnUntil && this.serverNow() < this.game.invulnUntil;
    if (inv && Math.floor(this.t * 10) % 2) return;            // つかまったあと：点滅（しばらく狙われない）
    Sprites.drawShadow(g, o.x, o.y - 1, sh);
    const hid = o.me && this.hidden;
    if (hid) g.globalAlpha = 0.62;                              // 草むらでじっとして隠れている
    Sprites.drawJerboa(g, o.fur, 'field', fr.anim, o.dir || 'down', fr.frame, o.x, o.y - z);
    if (hid) { g.globalAlpha = 1; for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#6f8a3a' : '#8fa84a'; g.fillRect(Math.round(o.x) - 5 + i * 4, Math.round(o.y) - 4 - (i % 2), 1, 4); } }
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
    if (o.anim === 'dig' || o.anim === 'gather' || o.anim === 'eat') return { anim: o.anim, frame: Math.floor(this.t * 8) % n(o.anim) };
    const tw = Math.floor(this.t * 2 + hash2(o.id ? o.id.length : 0, 1, 1) * 7) % 7 === 0;
    return { anim: 'idle', frame: tw ? 1 : 0 };
  }

  /** 夜の暗さ・夕焼けの色。光は自分（大きめ）・ほかのトビネズミ・自分の巣穴の灯り・夜露のきらめき */
  drawNight(g, cx, cy, list) {
    const tod = this.game.tod();
    this.tod = tod;
    const [r, gg, b, a] = tod.tint;
    if (a > 0) { g.fillStyle = `rgba(${r},${gg | 0},${b | 0},${a})`; g.fillRect(0, 0, W, H); }
    if (tod.dark <= 0.01) return;
    if (!this._nl || this._nl.width !== W || this._nl.height !== H) this._nl = A.mk(W, H);
    const lc = this._nl, lg = lc.getContext('2d');
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, W, H);
    lg.fillStyle = `rgba(8,10,34,${tod.dark})`; lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    const hole = (x, y, rad, k) => {
      const gr = lg.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(0.5, `rgba(0,0,0,${k * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    };
    for (const o of list) if (o.kind === 'player') hole(o.x - cx, o.y - cy - 6, o.me ? 74 : 30, o.me ? 0.92 : 0.6);
    for (const e of this.entrances) if (e.own) hole(e.x - cx, e.y - cy, 26 + Math.sin(this.t * 6) * 1.5, 0.7);
    for (const rs of this.resources.values()) if (rs.kind === 'dew') hole(rs.x - cx, rs.y - cy, 9, 0.5);
    g.drawImage(lc, 0, 0);
    // 水面に映る星と月（夜）
    const k = tod.dark / 0.66;
    if (k > 0.3 && this.water.length) {
      g.save();
      const wx0 = (POND.x - POND.rx) * 16 - cx, wy0 = (POND.y - POND.ry) * 16 - cy;
      if (wx0 < W && wy0 < H && wx0 + POND.rx * 32 > 0 && wy0 + POND.ry * 32 > 0) {
        for (const w of this.water) {
          const h = hash2(w.tx, w.ty, 77);
          if (h > 0.35) continue;
          const tw = 0.5 + 0.5 * Math.sin(this.t * (2 + h * 5) + h * 40);
          g.fillStyle = `rgba(240,240,255,${(0.3 + 0.6 * tw) * k})`;
          g.fillRect(w.tx * 16 + Math.floor(h * 37) % 14 + 1 - cx, w.ty * 16 + Math.floor(h * 91) % 14 + 1 - cy, 1, 1);
        }
        // 月の映り込み（ゆらゆら）
        const mx = POND.x * 16 + 18 - cx, my = POND.y * 16 - 10 - cy;
        for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(250,246,200,${0.55 * k - i * 0.1})`; g.fillRect(Math.round(mx - 4 + Math.sin(this.t * 2 + i) * 1.5), Math.round(my + i * 3), 8 - i, 1); }
      }
      g.restore();
    }
    // 夜露のきらめき（暗い中で光る）
    if (k > 0.2) for (const rs of this.resources.values()) if (rs.kind === 'dew') {
      const tw = 0.5 + 0.5 * Math.sin(this.t * 4 + rs.x);
      g.fillStyle = `rgba(220,245,255,${0.5 + 0.5 * tw})`; g.fillRect(Math.round(rs.x - cx), Math.round(rs.y - cy - 3), 1, 1);
    }
  }


  // ───────── 捕食者（Ver.0.3）─────────
  /** フクロウの影：狙っているときは地面の影がだんだん大きく濃くなる（急降下の予告） */
  drawOwlShadow(g, pv) {
    if (pv.state === 'stalk' || pv.state === 'dive') {
      const r = pv.sr || 4, x = pv.sx ?? pv.x, y = pv.sy ?? pv.y;
      g.fillStyle = `rgba(20,10,30,${0.25 + 0.3 * (r / 11)})`;
      g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r * 2, r, 0, 0, Math.PI * 2); g.fill();
    } else if (pv.z > 2) {
      g.fillStyle = 'rgba(20,10,30,0.16)';
      g.beginPath(); g.ellipse(Math.round(pv.x), Math.round(pv.y), 5, 2.4, 0, 0, Math.PI * 2); g.fill();
    }
  }
  /** 捕食者を 1 匹描く（素材があれば素材、無ければコード描画） */
  drawPred(g, o) {
    const flip = o.dir === 'left', k = o.pkind, a = o.gone || o.state === 'leave' ? Math.max(0, 1 - (o.t || 0) / 2.5) : 1;
    if (a <= 0) return;
    g.globalAlpha = a;
    if (k === 'fox') {
      Sprites.drawShadow(g, o.x, o.y - 1, 1.1);
      const run = o.state === 'chase' || o.state === 'leave' || o.state === 'roam' || o.state === 'toNest';
      const spd = o.state === 'chase' ? 14 : o.state === 'roam' ? 6 : 10;
      let col = run ? Math.floor(this.t * spd) % 4 : o.state === 'alert' ? 5 : o.state === 'dig' ? 6 + Math.floor(this.t * 6) % 2 : 4;
      if (!Sprites.drawEntry(g, 'pred.fox', col, o.x, o.y, { flip })) A.drawFox(g, o.x, o.y, { frame: col, flip, dig: o.state === 'dig' });
      if (o.state === 'dig' && Math.random() < 0.3) this.puff(o.x + (flip ? -10 : 10), o.y, '#b98552', 1);
    } else if (k === 'snake') {
      const lurk = o.state === 'lurk' || o.state === 'recover';
      if (lurk) g.globalAlpha = a * 0.7;                       // 待ち伏せ中は見えにくい
      const col = o.state === 'lunge' ? 4 : o.state === 'rattle' ? 2 + Math.floor(this.t * 12) % 2 : Math.floor(this.t * 1.5) % 2;
      const jx = o.state === 'rattle' ? Math.round(Math.sin(this.t * 60)) : 0;
      if (!Sprites.drawEntry(g, 'pred.snake', col, o.x + jx, o.y, { flip })) A.drawSnake(g, o.x + jx, o.y, { frame: col, flip, lunge: o.state === 'lunge' });
    } else if (k === 'owl') {
      const col = o.state === 'dive' ? 2 : Math.floor(this.t * 6) % 2;
      const y = o.y - (o.z || 0) - 8;
      if (!Sprites.drawEntry(g, 'pred.owl', col, o.x, y, { flip })) A.drawOwl(g, o.x, y, { frame: col, flip });
    }
    g.globalAlpha = 1;
  }
  /** 「！」（狙われている）と、画面の端の赤・つかまった瞬間の赤い光 */
  drawAlerts(g, cx, cy) {
    for (const pv of this.predViews || []) {
      if (!ALERT_STATES.has(pv.state)) continue;
      const mine = pv.target === this.me.id;
      const x = pv.x - cx, y = pv.y - cy - (pv.kind === 'owl' ? (pv.z || 0) + 22 : pv.kind === 'fox' ? 26 : 18);
      const bob = Math.round(Math.sin(this.t * 12) * (mine ? 1.5 : 0.5));
      if (!mine) g.globalAlpha = 0.55;
      if (!Sprites.drawEntry(g, 'ui.alert', 0, x, y + bob)) { g.fillStyle = '#ffd84a'; g.fillRect(Math.round(x) - 3, Math.round(y) - 12 + bob, 6, 11); g.fillStyle = '#c8201a'; g.fillRect(Math.round(x) - 1, Math.round(y) - 10 + bob, 2, 5); g.fillRect(Math.round(x) - 1, Math.round(y) - 4 + bob, 2, 2); }
      g.globalAlpha = 1;
    }
    const th = this.threat;
    if (th) {
      const k = 0.35 + 0.25 * Math.sin(this.t * (th.state === 'dive' || th.state === 'lunge' ? 22 : 9));
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
      gr.addColorStop(0, 'rgba(200,20,10,0)'); gr.addColorStop(1, `rgba(200,20,10,${k})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) { g.fillStyle = `rgba(255,60,40,${0.45 * this.flash})`; g.fillRect(0, 0, W, H); }
  }

  // ───────── 天気・季節（Ver.0.3）─────────
  _weatherFx(dt) {
    const env = this.game.env;
    const wx = this.wx;
    let n = 0;
    for (const p of wx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t < p.life) wx[n++] = p; }
    wx.length = n;
    if (!env) return;
    const k = env.weatherK ?? 1;
    if (env.weather === 'sandstorm') { for (let i = 0; i < Math.round(26 * k * dt * 60 / 4); i++) wx.push({ kind: 'sand', x: -10 + Math.random() * 30, y: Math.random() * H, vx: 260 + Math.random() * 160, vy: 20 + Math.random() * 30, t: 0, life: 2.2, len: 3 + Math.random() * 5 }); }
    else if (env.weather === 'rain') { for (let i = 0; i < Math.round(18 * k * dt * 60 / 4); i++) wx.push({ kind: 'rain', x: Math.random() * (W + 60) - 30, y: -8, vx: -40, vy: 300 + Math.random() * 80, t: 0, life: 1 + Math.random() * 0.2, len: 5 }); }
    if (env.season === 'winter' && (env.period === 'night' || env.period === 'dusk') && Math.random() < dt * 8) wx.push({ kind: 'snow', x: Math.random() * W, y: -4, vx: -8 + Math.random() * 16, vy: 16 + Math.random() * 14, t: 0, life: 12 });
    if (wx.length > 600) wx.splice(0, wx.length - 600);
  }
  drawWeather(g, cx, cy, layer = 'tint') {
    const env = this.game.env;
    if (!env) return;
    const k = env.weatherK ?? 1;
    if (layer === 'fx') { this._weatherParticles(g, env); return; }
    // 季節の色味（地面）：夏は明るく黄、秋は橙、冬は白っぽく青
    const st = { summer: 'rgba(255,230,120,0.06)', autumn: 'rgba(230,130,50,0.08)', winter: 'rgba(210,225,255,0.14)', spring: 'rgba(170,230,140,0.04)' }[env.season];
    if (st) { g.fillStyle = st; g.fillRect(0, 0, W, H); }
    if (env.weather === 'sandstorm') {
      g.fillStyle = `rgba(196,140,70,${0.32 * k})`; g.fillRect(0, 0, W, H);
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.6);
      gr.addColorStop(0, 'rgba(170,110,50,0)'); gr.addColorStop(1, `rgba(150,96,44,${0.75 * k})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    } else if (env.weather === 'rain') {
      g.fillStyle = `rgba(60,80,110,${0.22 * k})`; g.fillRect(0, 0, W, H);
    }
    void cx; void cy;
  }
  _weatherParticles(g, env) {
    if (env.cold) {   // 寒い夜：画面の端に霜（暗くても見える）
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.62);
      gr.addColorStop(0, 'rgba(200,225,255,0)'); gr.addColorStop(1, 'rgba(200,225,255,0.32)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    const lit = this.tod ? 0.45 + 0.55 * this.tod.light : 1;     // 夜は粒も暗く
    for (const p of this.wx) {
      const a = Math.min(1, (p.life - p.t) * 2) * lit;
      if (p.kind === 'sand') { g.fillStyle = `rgba(250,220,160,${0.55 * a})`; g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.len), 1); }
      else if (p.kind === 'rain') { g.strokeStyle = `rgba(200,220,255,${0.55 * a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(p.x) + 0.5, Math.round(p.y)); g.lineTo(Math.round(p.x - 1.5) + 0.5, Math.round(p.y + p.len)); g.stroke(); if (p.y > H * 0.2 && p.t > p.life - 0.03) { g.fillStyle = 'rgba(220,235,255,.6)'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y + p.len), 3, 1); } }
      else if (p.kind === 'snow') { g.fillStyle = `rgba(250,252,255,${0.85 * Math.min(1, (p.life - p.t) * 2)})`; g.fillRect(Math.round(p.x + Math.sin(p.t * 2 + p.vx) * 3), Math.round(p.y), 1, 1); }
    }
    void env;
  }

  // ───────── 土地（Ver.0.3）─────────
  /** ミニマップの重ね表示：なし → 危険 → 食料 → なし */
  cycleOverlay() {
    const order = [null, 'danger', 'food'];
    this.overlay = order[(order.indexOf(this.overlay || null) + 1) % order.length];
    this.game.ui.toast(this.overlay === 'danger' ? 'ミニマップ：危険の重ね表示（緑＝安全・赤＝危ない）' : this.overlay === 'food' ? 'ミニマップ：食料の重ね表示（濃い緑ほど多い）' : 'ミニマップ：重ね表示なし');
  }
  /** いる場所の土地を調べる（L・「土地」ボタン）。巣があれば、ここへ引っ越せる */
  async openSurvey() {
    const g = this.game;
    if (this._surveying || g.ui.busy()) return;
    this._surveying = true;
    const r = await g.net.survey();
    this._surveying = false;
    if (!r.ok) { g.ui.toast(r.reason || '調べられなかった', 'bad'); return; }
    this.surveyT = this.t; this.surveyAt = { x: this.pred.state.x, y: this.pred.state.y };
    g.ui.landPanel(r.land, r.here, {
      dig: r.here.canDig && !r.here.hasNest ? () => { g.ui.closeModal(); this.interact({ kind: 'dig' }); } : null,
      relocate: r.here.hasNest ? async () => {
        if (!r.here.canMove || r.here.cooldownMs > 0) return;
        const ok = await g.ui.confirm('引っ越す', `巣の入口を ここ（${esc(r.land.name)}）へ移しますか？<br>巣の中（部屋・家具・倉庫）はそのまま持っていける。<br>費用：${g.ui.costHTML(r.here.relocateCost)}<br><span class="tb-dim">次に引っ越せるのは ${Math.round((g.relocateCooldownMs || 600000) / 60000)} 分後</span>`, '引っ越す', 'やめる');
        if (!ok) return;
        this.busyUntil = performance.now() + (r.here.digTime || 1) * 1000 + 200;
        this.digT = this.t; this.digDur = r.here.digTime || 1;
        await new Promise(res => setTimeout(res, (r.here.digTime || 1) * 1000));
        const x = await g.net.relocate();
        if (!x.ok) { g.ui.toast(x.reason || '引っ越せなかった', 'bad'); return; }
        if (x.from) this.puff(x.from.x, x.from.y, '#b98552', 8);
        this.onEntrance({ entrance: x.entrance });
        this.myNest = { id: x.entrance.nestId, x: x.entrance.x, y: x.entrance.y, land: x.land, plugged: false };
        if (x.inv) { this.inv = x.inv; g.ui.setInventory(this.inv); }
        this.puff(x.entrance.x, x.entrance.y, '#b98552', 12);
        g.ui.toast('引っ越した！ 新しい入口は ' + x.land.name + '（巣の中はそのまま）');
      } : null,
    });
  }

  drawMinimap(g) {
    const m = this.map, s = W < 340 ? 0.5 : 0.75, mw = Math.round(m.w * s), mh = Math.round(m.h * s);
    const x0 = W - mw - 6, y0 = 6;
    const ct = y0 + mh + 5;   // 時計（DOM）はミニマップのすぐ下
    if (this._ct !== ct) { this._ct = ct; this.game.hud.style.setProperty('--clock-top', `calc(var(--u) * ${ct}px)`); }
    // 横向きのタッチ：右の端のボタンの列がミニマップに重ならないよう、ミニマップの下端（画面の px）を CSS へ
    if (this.game.isTouch && (this._mmT == null || this.t - this._mmT > 0.5)) {
      this._mmT = this.t;
      const sr = this.game.screen.stage.getBoundingClientRect(), k = sr.height / H;
      const v = Math.round(sr.top + (y0 + mh + 3) * k) + 'px';
      if (this._mmB !== v) { this._mmB = v; document.documentElement.style.setProperty('--mm-bottom', v); }
    }
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 3, y0 - 3, mw + 6, mh + 6);
    g.fillStyle = '#c8a46a'; g.fillRect(x0 - 2, y0 - 2, mw + 4, mh + 4);
    g.fillStyle = '#2a1a10'; g.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    g.imageSmoothingEnabled = true; g.drawImage(this.minimap, x0, y0, mw, mh); g.imageSmoothingEnabled = false;
    this._mm = { x0, y0, w: mw, h: mh };
    if (this.overlay) {   // 土地の重ね表示（区画ごと）
      for (const L of buildLands(m).values()) {
        const c = overlayColor(L, this.overlay);
        if (!c) continue;
        g.fillStyle = c;
        g.fillRect(Math.round(x0 + L.cx * PLOT_W * s), Math.round(y0 + L.cy * PLOT_H * s), Math.round(PLOT_W * s), Math.round(PLOT_H * s));
      }
    }
    const P = (x, y, c, r = 1) => { g.fillStyle = c; g.fillRect(Math.round(x0 + x / 16 * s) - r, Math.round(y0 + y / 16 * s) - r, r * 2 + 1, r * 2 + 1); };
    for (const e of this.entrances) {
      const fr = !e.own && this.isFriend(e.owner);
      P(e.x, e.y, e.own ? '#ffe070' : fr ? (Math.floor(this.t * 2) % 2 ? '#7ff0a0' : '#2a9050') : '#5a3018', e.own || fr ? 1 : 0);
    }
    if (this.ping && this.t < this.ping.until) {   // 「巣の場所」で光らせた所
      const k = (this.t * 1.5) % 1, px = x0 + this.ping.x / 16 * s, py = y0 + this.ping.y / 16 * s;
      g.strokeStyle = `rgba(150,255,180,${1 - k})`; g.lineWidth = 1;
      g.beginPath(); g.arc(Math.round(px) + 0.5, Math.round(py) + 0.5, 2 + k * 7, 0, Math.PI * 2); g.stroke();
    }
    for (const v of this.remoteViews || []) P(v.x, v.y, '#f4f0e8', 0);
    // 捕食者（自分を狙っているものだけ赤く点滅）
    for (const pv of this.predViews || []) if (pv.target === this.me.id && ALERT_STATES.has(pv.state) && Math.floor(this.t * 6) % 2) P(pv.x, pv.y, '#ff3020', 0);
    // 土地を調べた所（旗）
    if (this.surveyAt && this.t - this.surveyT < 20) P(this.surveyAt.x, this.surveyAt.y, '#ff5040', 0);
    if (Math.floor(this.t * 3) % 3) P(this.view.x, this.view.y, '#e83a2a', 1);
    // 視界の枠
    g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1;
    g.strokeRect(Math.round(x0 + this.cam.x / 16 * s) + 0.5, Math.round(y0 + this.cam.y / 16 * s) + 0.5, Math.round(W / 16 * s), Math.round(H / 16 * s));
    void POND;
  }
}
