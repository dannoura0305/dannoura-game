// tobinezumi/client/ui.js — DOM の UI 部品（トースト・チャット・ホットバー・持ち物・ダイアログ・メニュー・倉庫）
// 文字はすべて DOM（ブラウザの文字描画）でくっきり。大きさは --u（拡大率）に合わせる（style.css）。
import { ITEMS, INV_SLOTS, itemName, STACK_MAX } from '../shared/items.js';
import * as A from './art.js';
import { Sprites } from './sprites.js';

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const iconCache = new Map();
/** 家具の種類 → 素材のキー（assets/manifest.json） */
export const FURN_ASSET = {
  lamp: { key: 'nest.lantern' }, rug: { key: 'nest.rug' }, pebble_deco: { key: 'nest.pebble_deco' },
  seed_pile: { key: 'nest.seed_pile', col: 2 }, dried_flower: { key: 'nest.dried_flower' }, shelf: { key: 'nest.shelf' },
  nestbed: { key: 'nest.bed' }, storage: { key: 'nest.shelf' },
};
/** 持ち物アイコンの画像 URL（manifest の item.<id> があればそれ、無ければコード描画） */
export function iconURL(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const c = A.mk(16, 16), g = c.getContext('2d');
  if (!Sprites.drawCell(g, 'item.' + id + '.icon', 0, 0, 0)) A.drawItem(g, id, 0, 0);
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}
export function toolIconURL(tool) {
  const k = 'tool:' + tool;
  if (iconCache.has(k)) return iconCache.get(k);
  const c = A.mk(16, 16), g = c.getContext('2d');
  const i = Sprites.nameIndex('ui.tools', tool);
  if (!(i >= 0 && Sprites.drawCell(g, 'ui.tools', i, 0, 0))) A.drawToolIcon(g, tool, 0, 0);
  const url = c.toDataURL(); iconCache.set(k, url); return url;
}
export function furnitureIconURL(type, w, h) {
  const k = 'furn:' + type;
  if (iconCache.has(k)) return iconCache.get(k);
  const c = A.mk(w * 16, h * 16), g = c.getContext('2d');
  const fa = FURN_ASSET[type];
  if (!(fa && Sprites.drawEntry(g, fa.key, fa.col || 0, w * 8, h * 16))) A.drawFurniture(g, type, 0, 0, w, h, 0, 0, { fill: 0.7 });
  const url = c.toDataURL(); iconCache.set(k, url); return url;
}

export class UI {
  constructor(hud) {
    this.hud = hud;
    this.toastBox = el('div', 'tb-toasts'); hud.appendChild(this.toastBox);
    this.modal = null;
    this.chatOpen = false;
  }
  toast(text, kind = '') {
    const t = el('div', 'tb-toast ' + kind, esc(text));
    this.toastBox.appendChild(t);
    while (this.toastBox.children.length > 3) this.toastBox.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
  }
  /** 入力をふさぐ部品が開いているか */
  busy() { return !!this.modal || this.chatOpen; }

  // ── チャット ──
  mountChat(onSend) {
    this.chatLog = el('div', 'tb-chatlog'); this.hud.appendChild(this.chatLog);
    this.chatWrap = el('div', 'tb-chatin tb-ui-block hidden');
    this.chatInput = el('input'); this.chatInput.maxLength = 80; this.chatInput.placeholder = this.touch ? 'ひとこと（80 文字まで）' : 'Enter で送信／Esc で閉じる';
    this.chatInput.enterKeyHint = 'send'; this.chatInput.autocomplete = 'off';
    const send = el('button', 'tb-btn tb-chat-send', '送信'), x = el('button', 'tb-btn tb-chat-x', '×');
    send.type = 'button'; x.type = 'button';
    this.chatWrap.append(this.chatInput, send, x); this.hud.appendChild(this.chatWrap);
    const go = () => { const v = this.chatInput.value; this.chatInput.value = ''; this.closeChat(); if (v.trim()) onSend(v); };
    // 送信ボタンを押してもキーボードが閉じないうちに送る（pointerdown で preventDefault して入力欄のフォーカスを保つ）
    send.addEventListener('pointerdown', e => e.preventDefault());
    send.addEventListener('click', go);
    x.addEventListener('click', () => this.closeChat());
    this.chatInput.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.isComposing || e.keyCode === 229) return;     // 日本語の変換中の Enter は確定だけ
      if (e.key === 'Enter') go();
      else if (e.key === 'Escape') this.closeChat();
    });
  }
  /** sync=true：タッチのボタンから（キーボードを出すには押した瞬間に focus する必要がある） */
  openChat(sync = false) {
    if (!this.chatWrap) return;
    this.chatOpen = true; this.chatWrap.classList.remove('hidden');
    if (sync) this.chatInput.focus(); else setTimeout(() => this.chatInput.focus(), 0);
    this._kbFollow(this.chatWrap);
  }
  closeChat() { if (!this.chatWrap) return; this.chatOpen = false; this.chatWrap.classList.add('hidden'); this.chatInput.blur(); this._chatClosedAt = performance.now(); this._kbFollow(null); }
  /** 画面キーボードが出ても入力欄が隠れないように、見えている範囲（visualViewport）の下端に合わせる */
  _kbFollow(node) {
    const vv = globalThis.visualViewport;
    if (this._kbOff) { this._kbOff(); this._kbOff = null; }
    if (!node || !vv || !this.touch) { if (node) node.style.bottom = ''; return; }
    const f = () => {
      const kb = Math.max(0, innerHeight - (vv.offsetTop + vv.height));
      node.style.bottom = (kb + 8) + 'px';
    };
    vv.addEventListener('resize', f); vv.addEventListener('scroll', f);
    this._kbOff = () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f); node.style.bottom = ''; };
    f();
  }
  chatLine(name, text, me = false) {
    if (!this.chatLog) return;
    const l = el('div', 'tb-chatline' + (me ? ' me' : ''), `<b>[${esc(name)}]</b> ${esc(text)}`);
    this.chatLog.appendChild(l);
    while (this.chatLog.children.length > 4) this.chatLog.firstChild.remove();
  }

  /** ホットバーとチャットは最初に 1 回だけ作り、画面ごとに見せる／隠す */
  mountHotbarOnce(onChat) {
    if (this.hotbar) return;
    this.mountHotbar();
    this.mountChat(onChat || this._onChat || (() => {}));
  }
  showHUD(chat, hotbar = chat) {
    if (this.hotbar) this.hotbar.classList.toggle('hidden', !hotbar);
    if (this.chatLog) this.chatLog.classList.toggle('hidden', !chat);
  }
  // ── ホットバー（持ち物 8 枠をそのまま映す）──
  mountHotbar() {
    this.hotbar = el('div', 'tb-hotbar tb-ui-block');
    for (let i = 0; i < INV_SLOTS; i++) this.hotbar.appendChild(el('div', 'tb-slot'));
    this.hud.appendChild(this.hotbar);
    // 押すと持ち物を開く（タッチでもマウスでも）
    this.hotbar.addEventListener('click', () => { if (!this.busy() && this.onHotbar) this.onHotbar(); });
  }
  renderSlots(container, inv) {
    [...container.children].forEach((s, i) => {
      const it = inv[i];
      const key = it ? it.id + ':' + it.n : '';
      if (s.dataset.k === key) return;
      s.dataset.k = key;
      s.innerHTML = it ? `<img src="${iconURL(it.id)}" alt=""><span class="n">${it.n}</span>` : '';
      s.title = it ? itemName(it.id) : '';
    });
  }
  setInventory(inv) { this.inv = inv; if (this.hotbar) this.renderSlots(this.hotbar, inv); if (this.invPanel) this._renderInvPanel(); }

  // ── 持ち物（I）──
  toggleInventory(onMove) {
    if (this.invPanel) { this.closeModal(); return; }
    const p = el('div', 'tb-panel tb-inv tb-ui-block');
    const how = this.touch ? '枠をタップで選び、別の枠をタップで入れかえ' : 'ドラッグ、または クリック→クリックで並べ替え';
    p.innerHTML = `<div class="tb-ph">持ち物 <span class="tb-dim">（8 枠・1 枠 ${STACK_MAX} まで）</span><button class="tb-x">×</button></div><div class="tb-grid"></div><div class="tb-detail">${how}。</div>`;
    const grid = p.querySelector('.tb-grid');
    let sel = null;
    const mark = () => { [...grid.children].forEach((c, k) => c.classList.toggle('sel', k === sel)); };
    for (let i = 0; i < INV_SLOTS; i++) {
      const s = el('div', 'tb-slot big'); s.draggable = true; s.dataset.i = i;
      s.addEventListener('click', () => {
        const it = this.inv[i], det = p.querySelector('.tb-detail');
        // 選んでいる枠があれば、ここへ動かす（入れかえ）
        if (sel != null && sel !== i) { const from = sel; sel = null; mark(); onMove(from, i); det.textContent = '入れかえた。'; return; }
        if (sel === i) { sel = null; mark(); det.textContent = how + '。'; return; }
        if (it) { sel = i; mark(); }
        det.textContent = it ? `${itemName(it.id)} ×${it.n} — ${(ITEMS[it.id] || {}).desc || ''}` : '空いている枠。';
      });
      s.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); });
      s.addEventListener('dragover', e => e.preventDefault());
      s.addEventListener('drop', e => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (from !== i) onMove(from, i); });
      grid.appendChild(s);
    }
    p.querySelector('.tb-x').onclick = () => this.closeModal();
    this.invPanel = p;
    this._openModal(p, () => { this.invPanel = null; });
    this._renderInvPanel();
  }
  _renderInvPanel() { if (this.invPanel) this.renderSlots(this.invPanel.querySelector('.tb-grid'), this.inv || []); }

  // ── モーダル（1 つだけ）──
  _openModal(node, onClose) {
    this.closeModal();
    this.modal = { node, onClose };
    this.hud.appendChild(node);
  }
  closeModal() {
    if (!this.modal) return;
    const m = this.modal; this.modal = null;
    m.node.remove();
    if (m.onClose) m.onClose();
  }
  /** はい／いいえ。Promise<boolean> */
  confirm(title, body, yes = 'はい', no = 'いいえ') {
    return new Promise(res => {
      const p = el('div', 'tb-panel tb-dialog tb-ui-block');
      p.innerHTML = `<div class="tb-ph">${esc(title)}</div><div class="tb-body">${body}</div><div class="tb-btns"><button class="tb-btn yes">${esc(yes)}</button><button class="tb-btn no">${esc(no)}</button></div>`;
      let done = false;
      const fin = v => { if (done) return; done = true; document.removeEventListener('keydown', key, true); this.closeModal(); res(v); };
      const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); } else if (e.key === 'Enter' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); fin(true); } };
      document.addEventListener('keydown', key, true);
      p.querySelector('.yes').onclick = () => fin(true);
      p.querySelector('.no').onclick = () => fin(false);
      this._openModal(p, () => fin(false));
    });
  }
  /** Esc メニュー。items = [{label, act, cls}] */
  /** 1 行の入力（OK で文字列、やめると null） */
  prompt(title, body, value = '', yes = '決定', no = 'やめる') {
    return new Promise(res => {
      const p = el('div', 'tb-panel tb-dialog tb-ui-block');
      p.innerHTML = `<div class="tb-ph">${esc(title)}</div><div class="tb-body">${body}</div><input class="tb-prompt-in" maxlength="200"><div class="tb-btns"><button class="tb-btn yes">${esc(yes)}</button><button class="tb-btn no">${esc(no)}</button></div>`;
      const inp = p.querySelector('input'); inp.value = value;
      let done = false;
      const fin = v => { if (done) return; done = true; this.closeModal(); res(v); };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') { e.preventDefault(); fin(inp.value); } else if (e.key === 'Escape') { e.preventDefault(); fin(null); } });
      p.querySelector('.yes').onclick = () => fin(inp.value);
      p.querySelector('.no').onclick = () => fin(null);
      this._openModal(p, () => fin(null));
      setTimeout(() => inp.focus(), 0);
    });
  }
  menu(title, html, items) {
    const p = el('div', 'tb-panel tb-menu tb-ui-block');
    p.innerHTML = `<div class="tb-ph">${esc(title)}<button class="tb-x">×</button></div>${html || ''}<div class="tb-menu-items"></div>`;
    const box = p.querySelector('.tb-menu-items');
    for (const it of items) {
      const b = el('button', 'tb-btn wide ' + (it.cls || ''), esc(it.label));
      b.onclick = () => it.act(b);
      box.appendChild(b);
    }
    p.querySelector('.tb-x').onclick = () => this.closeModal();
    this._openModal(p);
    return p;
  }

  /** 倉庫：持ち物 ⇄ 倉庫。onMove(dir, item, n) */
  storagePanel(inv, storage, onMove) {
    const p = el('div', 'tb-panel tb-storage tb-ui-block');
    p.innerHTML = `<div class="tb-ph">倉庫 <span class="tb-dim">（${this.touch ? 'タップで 1 つ' : 'クリックで 1 つ／Shift+クリックで全部'}）</span><button class="tb-x">×</button></div>
      <div class="tb-amount"><button class="tb-btn one on" type="button">1 つずつ</button><button class="tb-btn all" type="button">全部</button></div>
      <div class="tb-cols"><div><div class="tb-sub">持ち物 → 預ける</div><div class="tb-grid a"></div></div><div><div class="tb-sub">倉庫 → 引き出す</div><div class="tb-grid b"></div></div></div>`;
    const ga = p.querySelector('.a'), gb = p.querySelector('.b');
    let all = false;
    const bOne = p.querySelector('.one'), bAll = p.querySelector('.all');
    const setAll = v => { all = v; bOne.classList.toggle('on', !v); bAll.classList.toggle('on', v); };
    bOne.onclick = () => setAll(false); bAll.onclick = () => setAll(true);
    const fill = (grid, list, dir) => {
      grid.innerHTML = '';
      list.forEach(it => {
        const s = el('div', 'tb-slot big');
        if (it) { s.innerHTML = `<img src="${iconURL(it.id)}" alt=""><span class="n">${it.n}</span>`; s.title = itemName(it.id); s.onclick = e => onMove(dir, it.id, e.shiftKey || all ? it.n : 1); }
        grid.appendChild(s);
      });
    };
    this.updateStorage = (i2, s2) => { fill(ga, i2, 'deposit'); fill(gb, s2.slice(0, 16), 'withdraw'); };
    this.updateStorage(inv, storage);
    p.querySelector('.tb-x').onclick = () => this.closeModal();
    this._openModal(p, () => { this.updateStorage = null; });
  }

  /** つながりなおし中 */
  setOffline(on) {
    if (on && !this.dc) { this.dc = el('div', 'tb-dc', '<div>つながりなおしています…</div>'); this.hud.appendChild(this.dc); }
    if (!on && this.dc) { this.dc.remove(); this.dc = null; }
  }
}
