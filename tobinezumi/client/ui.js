// tobinezumi/client/ui.js — DOM の UI 部品（トースト・チャット・ホットバー・持ち物・ダイアログ・メニュー・倉庫）
// 文字はすべて DOM（ブラウザの文字描画）でくっきり。大きさは --u（拡大率）に合わせる（style.css）。
import { ITEMS, INV_SLOTS, itemName, STACK_MAX } from '../shared/items.js';
import { lifeWord, LIFE } from '../shared/life.js';
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

// 暮らしのアイコン（添付イメージ：赤いハート・黄色の稲妻・水色のしずく）
const LIFE_ORDER = ['cond', 'hunger', 'thirst'];
const LIFE_NAME = { cond: '体調', hunger: '空腹', thirst: '水分' };
const svg = (path, fill) => `<svg class="tb-lic" viewBox="0 0 8 8" aria-hidden="true"><path d="${path}" fill="${fill}" stroke="#2a1a10" stroke-width=".55" stroke-linejoin="round"/></svg>`;
const LIFE_ICON = {
  cond: svg('M4 7 L1 4 Q0 2.6 1 1.6 Q2.4 .6 4 2.2 Q5.6 .6 7 1.6 Q8 2.6 7 4 Z', '#e8483a'),
  hunger: svg('M5.6 .2 L1.1 4.7 L3.4 4.7 L2.2 7.8 L7 3 L4.6 3 Z', '#f2d040'),
  thirst: svg('M4 .6 Q6.6 4 6.6 5.2 Q6.6 7.4 4 7.4 Q1.4 7.4 1.4 5.2 Q1.4 4 4 .6 Z', '#56c8e0'),
};
const SUN_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="2.4" fill="#ffd060" stroke="#2a1a10" stroke-width=".6"/><g stroke="#ffd060" stroke-width=".9" stroke-linecap="round"><path d="M5 .6v1M5 8.4v1M.6 5h1M8.4 5h1M1.9 1.9l.7.7M7.4 7.4l.7.7M1.9 8.1l.7-.7M7.4 2.6l.7-.7"/></g></svg>';
const MOON_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M6.6 1.2 A4 4 0 1 0 8.8 7 A3.2 3.2 0 1 1 6.6 1.2 Z" fill="#f4eebc" stroke="#2a1a10" stroke-width=".6"/></svg>';
export function fmtWhen(at, now = Date.now()) {
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 1) return 'さっき';
  if (m < 60) return m + ' 分前';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' 時間前';
  return Math.round(h / 24) + ' 日前';
}

export class UI {
  constructor(hud) {
    this.hud = hud;
    this.toastBox = el('div', 'tb-toasts'); hud.appendChild(this.toastBox);
    this.modal = null;
    this.chatOpen = false;
  }
  toast(text, kind = '') {
    this.layoutTop();
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
  showHUD(chat, hotbar = chat, life = chat) {
    if (this.hotbar) this.hotbar.classList.toggle('hidden', !hotbar);
    if (this.chatLog) this.chatLog.classList.toggle('hidden', !chat);
    if (this.lifeEl) this.lifeEl.classList.toggle('hidden', !life);
    if (this.clockEl) this.clockEl.classList.toggle('hidden', !life);
    if (this.hud) this.hud.classList.toggle('tb-hud-nohotbar', !hotbar);
    this.layoutTop();
  }
  /**
   * タッチ：左上は「地域名／巣の名前」→ その下に体調・空腹・水分のバー → トーストはバーの下から。
   * 実際の大きさを測って並べるので、名前が 2 行になっても・画面の向きが変わっても重ならない。
   */
  layoutTop() {
    const life = this.lifeEl, tb = this.toastBox;
    const on = !!(this.touch && life && !life.classList.contains('hidden') && life.offsetParent);
    const horiz = document.documentElement.classList.contains('tb-horiz');
    if (this.chatLog && !(on && horiz)) this.chatLog.style.top = '';
    const ck = this.clockEl, ckOn = on && horiz && ck && !ck.classList.contains('hidden');
    if (ck && !ckOn) { ck.style.top = ''; ck.style.left = ''; ck.style.right = ''; }
    if (!on) { if (life) life.style.top = ''; if (tb) tb.style.top = ''; return; }
    const H = this.hud.getBoundingClientRect();
    const title = this.hud.querySelector('.tb-scene .tb-region, .tb-scene .tb-wtop');
    const tr = title && title.offsetParent ? title.getBoundingClientRect() : null;
    const top = Math.round((tr && tr.height ? tr.bottom : H.top + 6) - H.top + 3);
    if (life.style.top !== top + 'px') life.style.top = top + 'px';
    let L = life.getBoundingClientRect();
    if (ckOn) {   // 横向き：右の端はボタンの列なので、時計はバーのすぐ下（左）に
      Object.assign(ck.style, { top: Math.round(L.bottom - H.top + 3) + 'px', left: Math.round(L.left - H.left) + 'px', right: 'auto' });
      L = ck.getBoundingClientRect();
    }
    const tt = Math.round(L.bottom - H.top + 4) + 'px';
    if (tb.style.top !== tt) tb.style.top = tt;
    if (horiz && this.chatLog && this.chatLog.style.top !== tt) this.chatLog.style.top = tt;   // 横向きのチャットログもバーの下
  }

  // ── 暮らしの数値（体調・空腹・水分）。添付イメージのホットバー右の 3 本のバー ──
  mountLife(onTap) {
    if (this.lifeEl) return;
    const box = el('div', 'tb-life tb-ui-block hidden');
    box.title = '体調・空腹・水分（押すとくわしく）';
    for (const k of LIFE_ORDER) {
      const row = el('div', 'tb-lrow ' + k, `${LIFE_ICON[k]}<span class="tb-lbar"><i></i></span>`);
      row.dataset.k = k;
      box.appendChild(row);
    }
    box.addEventListener('click', () => { if (!this.busy() && onTap) onTap(); });
    this.hud.appendChild(box);
    this.lifeEl = box;
    const ck = el('div', 'tb-clock hidden', '<span class="ic"></span><span class="tx"></span>');
    this.hud.appendChild(ck);
    this.clockEl = ck;
  }
  setLife(life) {
    if (!this.lifeEl || !life) return;
    this.life = life;
    for (const row of this.lifeEl.children) {
      const k = row.dataset.k, v = Math.max(0, Math.min(100, life[k] || 0));
      const w = Math.round(v) + '%';
      const bar = row.querySelector('i');
      if (bar.style.width !== w) bar.style.width = w;
      row.classList.toggle('low', v < (k === 'cond' ? LIFE.TIRED : LIFE.LOW));
      row.classList.toggle('empty', v <= 0);
    }
    this.lifeEl.classList.toggle('sleeping', !!life.sleep);
    this.layoutTop();
  }
  /** 時計：tod = shared/daynight.js の timeOfDay */
  setClock(tod) {
    if (!this.clockEl || !tod) return;
    const key = tod.label + tod.period;
    if (this._clockKey === key) return;
    this._clockKey = key;
    this.clockEl.querySelector('.ic').innerHTML = tod.moon ? MOON_SVG : SUN_SVG;
    this.clockEl.querySelector('.tx').textContent = tod.name + ' ' + tod.label;
    this.clockEl.dataset.period = tod.period;
  }
  /** くらしの説明（体調バーを押したとき）。actions = [{label, act}] */
  lifePanel(life, actions = []) {
    const row = k => `<div class="tb-lrow big ${k}">${LIFE_ICON[k]}<b>${LIFE_NAME[k]}</b><span class="tb-lbar"><i style="width:${Math.round(life[k])}%"></i></span><span class="v">${Math.round(life[k])}</span><span class="w">${lifeWord(k, life[k])}</span></div>`;
    const p = this.menu('くらし', `<div class="tb-lifep">${LIFE_ORDER.map(row).join('')}</div>
      <div class="tb-dim tb-lifehint">種子を食べると空腹が戻る（1 つ +${LIFE.SEED_FOOD}）。オアシスのふちで水を飲む（+${LIFE.WATER_DRINK}）。夜は草むらに夜露が出る（+${LIFE.DEW_DRINK}）。<br>
      体調は起きているとゆっくり減り、空腹・水分が 0 だと早く減る。${LIFE.TIRED} 未満だと跳ねるのが遅く、大ジャンプできない。巣の寝床で眠ると戻る。</div>`,
      [...actions, { label: 'とじる', act: () => this.closeModal() }]);
    p.classList.add('tb-lifepanel');
    return p;
  }

  // ── フレンド ──
  /** list = [{id, name, fur, state, online, where, nest}]。h = {request(name), accept(id), remove(id), ping(f)} */
  friendsPanel(list, h, { offline = false } = {}) {
    const p = el('div', 'tb-panel tb-menu tb-friends tb-ui-block');
    p.innerHTML = `<div class="tb-ph">フレンド<button class="tb-x">×</button></div>
      <div class="tb-fadd"><input class="tb-fname" maxlength="10" placeholder="なまえで申請"><button class="tb-btn primary tb-fsend" type="button">申請</button></div>
      <div class="tb-dim tb-fnote">${offline ? 'オフラインでは ナッツ・モカ・リコ とフレンドになれる。' : '相手が受けるとフレンド。オンラインかどうか・巣の場所（ミニマップ）がわかる。'}</div>
      <div class="tb-flist tb-scroll"></div>`;
    const inp = p.querySelector('.tb-fname'), box = p.querySelector('.tb-flist');
    const render = l => {
      box.innerHTML = '';
      if (!l.length) { box.innerHTML = '<div class="tb-dim">まだだれもいない</div>'; return; }
      const order = { incoming: 0, friend: 1, outgoing: 2 };
      for (const f of [...l].sort((a, b) => order[a.state] - order[b.state] || (b.online - a.online))) {
        const st = f.state === 'friend' ? (f.online ? `<span class="tb-on">● オンライン${f.where === 'nest' ? '（巣の中）' : ''}</span>` : '<span class="tb-off">○ オフライン</span>')
          : f.state === 'incoming' ? '<span class="tb-ok">申請が来ている</span>' : '<span class="tb-dim">返事待ち</span>';
        const r = el('div', 'tb-frow', `<span class="nm">${esc(f.name)}</span>${st}<span class="bt"></span>`);
        const bt = r.querySelector('.bt');
        const b = (label, fn, cls = '') => { const x = el('button', 'tb-btn small ' + cls, esc(label)); x.type = 'button'; x.onclick = fn; bt.appendChild(x); };
        if (f.state === 'incoming') { b('受ける', () => h.accept(f.id), 'primary'); b('断る', () => h.remove(f.id)); }
        else if (f.state === 'outgoing') b('取り消す', () => h.remove(f.id));
        else {
          if (f.nest) b('巣の場所', () => h.ping(f));
          b('やめる', async () => { if (await this.confirmInline(r, f.name + ' とのフレンドをやめる？')) h.remove(f.id); });
        }
        box.appendChild(r);
      }
    };
    const send = () => { const v = inp.value.trim(); if (!v) return; inp.value = ''; h.request(v); };
    p.querySelector('.tb-fsend').onclick = send;
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') send(); else if (e.key === 'Escape') this.closeModal(); });
    p.querySelector('.tb-x').onclick = () => this.closeModal();
    this.updateFriends = render;
    render(list);
    this._openModal(p, () => { this.updateFriends = null; });
    return p;
  }
  /** パネルの中の小さな確認（はい／いいえ） */
  confirmInline(row, text) {
    return new Promise(res => {
      const q = el('div', 'tb-inline-q', `<span>${esc(text)}</span>`);
      const y = el('button', 'tb-btn small primary', 'はい'), n = el('button', 'tb-btn small', 'いいえ');
      y.type = n.type = 'button';
      y.onclick = () => { q.remove(); res(true); }; n.onclick = () => { q.remove(); res(false); };
      q.append(y, n); row.after(q);
    });
  }

  // ── 巣の設定（所有者）：訪問設定・許可リスト・共同作業者・最近の訪問者 ──
  /** nest = NestRecord。h = {policy(v, list), builders(list), visitors()→Promise<list>} */
  nestSettings(nest, h, { online = true } = {}) {
    const p = el('div', 'tb-panel tb-menu tb-nestset tb-ui-block');
    const pol = [['private', '非公開', '自分と共同作業者だけ'], ['friends', 'フレンドだけ', 'フレンドなら入れる'], ...(online ? [['list', '許可リスト', '名前で決めた子だけ']] : []), ['public', '公開', 'だれでも訪ねてこられる']];
    p.innerHTML = `<div class="tb-ph">巣の設定<button class="tb-x">×</button></div>
      <div class="tb-sub">だれが入れるか（訪問設定）</div>
      <div class="tb-pols">${pol.map(([v, l, d]) => `<button type="button" class="tb-btn tb-pol" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <div class="tb-listbox hidden"><div class="tb-sub">許可リスト（入ってよい子のなまえ）</div><div class="tb-names vis"></div></div>
      <div class="tb-sub">共同作業者 <span class="tb-dim">（巣をいっしょに掘ったり家具を置いたりできる。素材はその子の持ち物から）</span></div>
      ${online ? '<div class="tb-names bld"></div>' : '<div class="tb-dim">共同作業者はオンラインで使えます。</div>'}
      <div class="tb-sub">最近たずねてきた子</div><div class="tb-visits tb-scroll tb-dim">…</div>`;
    const mark = () => { for (const b of p.querySelectorAll('.tb-pol')) b.classList.toggle('on', b.dataset.v === nest.policy); p.querySelector('.tb-listbox').classList.toggle('hidden', nest.policy !== 'list'); };
    for (const b of p.querySelectorAll('.tb-pol')) b.onclick = async () => {
      const v = b.dataset.v;
      const ok = await h.policy(v, v === 'list' ? (nest.list || []) : undefined);
      if (ok) mark();
    };
    // 名前のリスト（追加・外す）
    const names = (box, get, set, max) => {
      const render = () => {
        const l = get();
        box.innerHTML = '';
        for (const nm of l) {
          const chip = el('span', 'tb-chip', `${esc(nm)}<button type="button" title="外す">×</button>`);
          chip.querySelector('button').onclick = () => set(l.filter(x => x !== nm)).then(render);
          box.appendChild(chip);
        }
        if (l.length < max) {
          const add = el('span', 'tb-chipadd', '<input maxlength="10" placeholder="なまえ"><button type="button" class="tb-btn small">追加</button>');
          const inp = add.querySelector('input');
          const go = () => { const v = inp.value.trim(); if (!v || l.includes(v)) return; set([...l, v]).then(render); };
          add.querySelector('button').onclick = go;
          inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') go(); });
          box.appendChild(add);
        }
      };
      render();
    };
    names(p.querySelector('.vis'), () => nest.list || [], async l => { await h.policy('list', l); }, 30);
    if (online) names(p.querySelector('.bld'), () => nest.builders || [], async l => { await h.builders(l); }, 10);
    mark();
    p.querySelector('.tb-x').onclick = () => this.closeModal();
    this._openModal(p);
    h.visitors().then(list => {
      const box = p.querySelector('.tb-visits');
      if (!box) return;
      box.innerHTML = list && list.length ? list.map(v => `<div>${esc(v.name)} <span class="tb-dim">${fmtWhen(v.at)}</span></div>`).join('') : 'まだだれも来ていない';
    });
    return p;
  }
  /** 留守のあいだに巣を訪ねてきた子（ログインした直後に 1 回） */
  visitorsPanel(list) {
    this.menu('留守のあいだに', `<div class="tb-body">あなたの巣を たずねてきた子がいます。</div><div class="tb-visits tb-scroll">${list.map(v => `<div>${esc(v.name)} <span class="tb-dim">${fmtWhen(v.at)}</span></div>`).join('')}</div>`,
      [{ label: 'とじる', act: () => this.closeModal() }]);
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
        if (it && it.id === 'seed' && this.onEat) {   // 種子は食べられる
          const b = el('button', 'tb-btn small primary tb-eatbtn', '1 つ食べる'); b.type = 'button';
          b.onclick = e => { e.stopPropagation(); this.onEat(); };
          det.appendChild(document.createTextNode(' ')); det.appendChild(b);
        }
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
