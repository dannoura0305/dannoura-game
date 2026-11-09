// コントローラー（Gamepad API の標準配置）で DOM の画面を操作する：タイトル・一時停止メニュー・設定・セーブ・金庫・調べ物（#sh-puz）・選択肢・倒れた時・スタッフロール。
//  十字キー／左スティック＝焦点を動かす（スライダー・選ぶ欄は左右で値を変える）、A（下）＝決定、B（右）＝戻る・閉じる、LB／RB＝メニューのタブ。
//  焦点は CSS の枠（.sh-padfocus）で見せる。本物の focus() は使わない（Enter・Space がキーボードの操作として二重に効かないように）。
//  遊びの中の操作は core/input.js が読む。ここで使ったボタンは input.swallowPad() で「押した瞬間」を消し、決定の A が回避などに化けないようにする。
//  接続・切断のお知らせ（#sh-padnote）、入力の種類のクラス（body.dev-pad）、表示名（Xbox／PlayStation の名前）もここ。

const STD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const XBOX = { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', L3: 'L3', R3: 'R3', View: 'View', Start: 'Start' };
const PS = { A: '×', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', L3: 'L3', R3: 'R3', View: 'Create', Start: 'Options' };
let style = 'xbox';
/** つながっているコントローラーの名前から、表示の流儀（xbox／ps）を決める */
export function padStyleOf(id) { return /054c|playstation|dualsense|dualshock|^wireless controller/i.test(String(id || '').trim()) ? 'ps' : 'xbox'; }
export function setPadStyle(s) { style = s === 'ps' ? 'ps' : 'xbox'; }
export function getPadStyle() { return style; }
/** ボタンの表示名（'A' → PlayStation なら '×'） */
export function padLabel(k) { const T = style === 'ps' ? PS : XBOX; return T[k] || k; }
/** 文の中のボタン名を今の流儀に（Xbox の名前で書いた文を PlayStation の名前へ） */
export function padText(s) {
  if (style !== 'ps') return s;
  return String(s).replace(/View（Back）|\b(LB|RB|LT|RT|View|Start|A|B|X|Y)\b/g, m => PS[m === 'View（Back）' ? 'View' : m] || m);
}
/** HUD の <kbd>（顔のボタンは色つき） */
export function padKbd(k, extra = '') {
  const face = { A: 'a', B: 'b', X: 'x', Y: 'y' }[k];
  return `<kbd class="sh-pk${face ? ' pk-' + face : ''}${style === 'ps' ? ' ps' : ''}">${padLabel(k)}${extra}</kbd>`;
}
/** キーの割り当て表（キー タブ）に出すコントローラーの配置（標準配置・変更不可） */
export const PAD_BINDS = [
  ['左スティック', '移動'], ['右スティック', 'カメラ'], ['L3', '走る（押すたびに切替）'],
  ['A', '回避・瞬歩／会話を送る／メニューで決定'], ['B', '調べる・話す／演出を飛ばす（長押し）／メニューで戻る'],
  ['X', '攻撃（銃を構えている間は装填）'], ['Y', '強攻撃・居合（長押し）'],
  ['LB', '弾く（パリィ）・幻術／暴走を抑える（連打）'], ['RB', '持ち替え（近接⇄銃）'], ['View＋RB', '近接の武器を順に（刀→鉄パイプ→火縄銃）'],
  ['LT', '銃を構える（押している間）'], ['RT', '撃つ（構えている間）'], ['R3', 'ロックオン'],
  ['十字キー上', '回復の道具'], ['十字キー下', '懐中電灯'], ['十字キー左右', '相手の切替（ロック中）'],
  ['View', '化けを解く／戻す・暴走を抑える（長押し）'], ['Start', '一時停止（もう一度で再開）'],
];

const FOCUSABLE = 'button, select, input[type="range"], input[type="checkbox"]';
const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const sig = el => { const d = Object.entries(el.dataset || {}).map(([k, v]) => k + '=' + v).join('&'); return el.tagName + '|' + (d || (el.textContent || '').trim().slice(0, 24)); };

export class PadNav {
  constructor(game) {
    this.g = game; this.prev = []; this.dirHeld = null; this.dirT = 0; this.focus = null; this.focusSig = null; this.focusIdx = 0; this.layerKey = null;
    this.active = false; this.devShown = null; this.ids = new Map();
    this.note = document.createElement('div'); this.note.id = 'sh-padnote'; document.body.appendChild(this.note);
    addEventListener('gamepadconnected', e => this.onConnect(e.gamepad, true));
    addEventListener('gamepaddisconnected', e => this.onConnect(e.gamepad, false));
    // マウス・キー・タッチを使ったら、焦点の枠を消す（コントローラーに戻ると、また出る）
    const off = () => { if (this.active) { this.active = false; this.paint(); } };
    addEventListener('keydown', off, true); addEventListener('pointerdown', e => { if (e.isTrusted) off(); }, true);
    addEventListener('mousemove', e => { if (e.isTrusted && !document.pointerLockElement && Math.abs(e.movementX) + Math.abs(e.movementY) > 3) off(); }, true);
  }
  pad() {
    if (!navigator.getGamepads) return null;
    let ps; try { ps = navigator.getGamepads(); } catch (e) { return null; }
    for (const p of ps || []) if (p && p.connected) return p;
    return null;
  }
  onConnect(gp, on) {
    if (!gp) return;
    if (on) {
      this.ids.set(gp.index, gp.id); setPadStyle(padStyleOf(gp.id));
      const name = String(gp.id || '').replace(/\s*\((STANDARD GAMEPAD|Vendor:.*)\)\s*/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
      this.notice(`コントローラーをつなぎました${name ? '：' + name : ''}`);
      this.g.metrics.padConnected = (this.g.metrics.padConnected || 0) + 1;
    } else {
      this.ids.delete(gp.index);
      this.notice('コントローラーが外れました');
      this.g.metrics.padDisconnected = (this.g.metrics.padDisconnected || 0) + 1;
      // 遊んでいる最中に外れたら一時停止（操作が止まったまま敵に襲われないように）
      const g = this.g; if (g.mode === 'play' && g.input.device === 'pad' && !g.cut.active && !this.pad()) { g.input.device = 'kbm'; g.pause(); }
    }
  }
  notice(text) { const n = this.note; n.textContent = text; n.classList.remove('on'); void n.offsetWidth; n.classList.add('on'); clearTimeout(this.noteT); this.noteT = setTimeout(() => n.classList.remove('on'), 2600); }

  /** いま前に出ている DOM の画面（無ければ null＝遊びの操作） */
  layer() {
    const g = this.g, ui = g.ui, $ = s => document.querySelector(s);
    const cr = $('#sh-credits'); if (cr) return { key: 'credits', root: cr, back: () => this.clickSel(cr, '.cr-skip') };
    const m = ui.el.menu;
    if (!m.hidden) {
      return {
        key: 'menu', root: m, tabs: true,
        back: () => {
          if (ui.keyWait) { ui.cancelKeyWait(); return; }
          if (m.querySelector('nav [data-close]')) return this.clickSel(m, 'nav [data-close]');   // セーブ（ノートPC）
          if (g.mode === 'title') { ui.closeMenu(); return; }
          g.resume();
        },
      };
    }
    const puz = ui.el.puz; if (!puz.hidden) return { key: 'puz', root: puz, back: () => this.clickSel(puz, '[data-close]') };
    const safe = ui.el.safe; if (!safe.hidden) return { key: 'safe', root: safe, back: () => this.clickSel(safe, '[data-a="close"]') };
    const dead = ui.el.dead; if (!dead.hidden) return { key: 'dead', root: dead, back: null };
    const tt = $('#sh-title');
    if (tt && !tt.hidden) {
      const P = tt.querySelector('.tt-panel');
      if (P && !P.hidden) return { key: 'ttpanel', root: P, back: () => this.clickSel(P, '[data-a="close"]') };
      return { key: 'title', root: tt.querySelector('.tt-menu'), back: null };
    }
    return null;
  }
  clickSel(root, sel) { const b = root.querySelector(sel); if (b && !b.disabled) { b.click(); return true; } return false; }
  items(L) { return [...L.root.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && visible(el)); }

  /** 描画のこまごとに呼ぶ（main.js の frameLoop） */
  poll(dt) {
    const g = this.g, gp = this.pad();
    const L = this.layer();
    const key = L ? L.key : null;
    if (key !== this.layerKey) { this.layerKey = key; this.focus = null; this.focusSig = null; this.focusIdx = 0; }
    if (!gp) { this.prev = []; this.dirHeld = null; this.paint(L); this.devClass(); return; }
    if (!this.ids.has(gp.index)) { this.ids.set(gp.index, gp.id); setPadStyle(padStyleOf(gp.id)); }
    const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const now = gp.buttons.map((x, i) => b(i));
    const prev = this.prev, pr = i => now[i] && !prev[i];
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    let dir = b(STD.UP) || ay < -0.55 ? 'up' : b(STD.DOWN) || ay > 0.55 ? 'down' : b(STD.LEFT) || ax < -0.55 ? 'left' : b(STD.RIGHT) || ax > 0.55 ? 'right' : null;
    if (now.some(x => x) || dir) { if (!this.active) { this.active = true; } g.input.device = 'pad'; g.input.padUsed = true; }
    this.prev = now;
    this.devClass();
    if (!L) { this.dirHeld = null; this.paint(null); return; }
    // 方向：押した瞬間に 1 つ、押し続けると 0.38 秒後から 0.11 秒ごと
    let step = null;
    if (dir) {
      if (dir !== this.dirHeld) { this.dirHeld = dir; this.dirT = 0.38; step = dir; }
      else { this.dirT -= Math.min(dt, 0.1); if (this.dirT <= 0) { this.dirT = 0.11; step = dir; } }   // こまが重い時も、1 回の押しで 2 つ動かない
    } else this.dirHeld = null;
    const list = this.items(L);
    let cur = this.current(list);
    if (step) cur = this.move(step, list, cur) || cur;
    if (pr(STD.A) && cur) { this.swallow(STD.A); try { g.sfx.init(); } catch (e) { /* 音の準備ができない時はそのまま */ } this.activate(cur); }
    else if (pr(STD.B)) { this.swallow(STD.B); if (L.back) L.back(); }
    else if (L.tabs && (pr(STD.LB) || pr(STD.RB))) { this.swallow(STD.LB); this.swallow(STD.RB); this.tab(L.root, pr(STD.RB) ? 1 : -1); }
    if (pr(STD.Y) || pr(STD.X)) { this.swallow(STD.X); this.swallow(STD.Y); }
    this.paint(L);
  }
  swallow(i) { const inp = this.g.input; if (inp.swallowPad) inp.swallowPad(i); }
  devClass() {
    const d = this.g.input.device === 'pad' ? 'pad' : this.g.input.device === 'touch' ? 'touch' : 'kbm';
    if (d !== this.devShown) { this.devShown = d; const B = document.body.classList; B.toggle('dev-pad', d === 'pad'); B.toggle('pad-ps', style === 'ps'); if (this.g.ui && this.g.ui.devChanged) this.g.ui.devChanged(d); }
    else if (document.body.classList.contains('pad-ps') !== (style === 'ps')) { document.body.classList.toggle('pad-ps', style === 'ps'); if (this.g.ui && this.g.ui.devChanged) this.g.ui.devChanged(d); }
  }
  /** 今の焦点（描き直しで要素が入れ替わっても、同じ data-* の物か、同じ順番の物へ） */
  current(list) {
    if (!list.length) { this.focus = null; return null; }
    if (this.focus && this.focus.isConnected && list.includes(this.focus)) return this.focus;
    let el = this.focusSig && list.find(x => sig(x) === this.focusSig);
    if (!el && this.focusSig) el = list[Math.min(this.focusIdx, list.length - 1)];
    if (!el) el = list[0];
    this.set(el, list);
    return el;
  }
  set(el, list) { this.focus = el; this.focusSig = el ? sig(el) : null; this.focusIdx = el ? Math.max(0, list.indexOf(el)) : 0; if (el && this.active) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  /** 空間の向きで次の要素を選ぶ（スライダー・選ぶ欄は左右で値を変える） */
  move(dir, list, cur) {
    if (!cur) return null;
    if ((dir === 'left' || dir === 'right') && this.adjust(cur, dir === 'right' ? 1 : -1)) return cur;
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = Infinity;
    for (const el of list) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      let main, cross;
      if (dir === 'down' || dir === 'up') {
        main = dir === 'down' ? y - cy : cy - y; if (main < 4) continue;
        cross = Math.max(0, Math.max(r.left, r0.left) - Math.min(r.right, r0.right)) + Math.abs(x - cx) * 0.15;
      } else {
        main = dir === 'right' ? x - cx : cx - x; if (main < 4) continue;
        if (r.bottom < r0.top - 4 || r.top > r0.bottom + 4) cross = Math.abs(y - cy) * 3; else cross = Math.abs(y - cy) * 0.3;
      }
      const s = main + cross * 2;
      if (s < bs) { bs = s; best = el; }
    }
    if (best) this.set(best, list);
    return best;
  }
  /** スライダー・選ぶ欄の値を変える */
  adjust(el, d) {
    if (el.tagName === 'INPUT' && el.type === 'range') {
      const st = parseFloat(el.step) || 0.1, mn = parseFloat(el.min), mx = parseFloat(el.max), v = parseFloat(el.value);
      const nv = Math.min(mx, Math.max(mn, Math.round((v + d * st) / st) * st));
      const dec = (String(el.step).split('.')[1] || '').length;
      el.value = nv.toFixed(dec); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (el.tagName === 'SELECT') {
      const n = el.options.length; if (!n) return true;
      el.selectedIndex = (el.selectedIndex + d + n) % n; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }
  activate(el) {
    if (el.tagName === 'SELECT') { this.adjust(el, 1); return; }
    if (el.tagName === 'INPUT' && el.type === 'range') return;
    el.click();                                        // ボタン・チェック（チェックは click で input・change も起きる）
  }
  tab(root, d) {
    const tabs = [...root.querySelectorAll('nav [data-tab]')].filter(b => !['title', 'close'].includes(b.dataset.tab));
    if (!tabs.length) return;
    const i = Math.max(0, tabs.findIndex(b => b.classList.contains('on')));
    const nb = tabs[(i + d + tabs.length) % tabs.length]; this.focusSig = sig(nb); this.focus = null; nb.click();
  }
  /** 焦点の枠：コントローラーを使っている間だけ */
  paint(L) {
    const want = this.active && L ? this.focus : null;
    if (this.painted === want) return;
    if (this.painted) { this.painted.classList.remove('sh-padfocus'); const lb = this.painted.closest('label'); if (lb) lb.classList.remove('sh-padfocus-row'); }
    this.painted = want;
    if (want) { want.classList.add('sh-padfocus'); const lb = want.closest('label'); if (lb) lb.classList.add('sh-padfocus-row'); }
  }
}
