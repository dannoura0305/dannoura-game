// tobinezumi/client/world-ui.js — Ver.0.5「広がり」の画面：世界地図・図鑑（収集品）・実績・豊かな巣（穏やかなランキング）・共同巣
// どれも DOM のパネル（ui.js のモーダル 1 つ）。指で押せる大きさ（ボタン 40px 以上・枠 48px 以上）。文字は短く。
import { el, esc, iconURL, fmtWhen } from './ui.js';
import { Sprites } from './sprites.js';
import { REGION, REGION_IDS, OPEN_REGIONS } from '../shared/world.js';
import { CURIOS, CURIO_ORDER, SIGNS, CROSSOVER, ACHIEVEMENTS } from '../shared/collect.js';
import { FURNITURE } from '../shared/items.js';
import * as A from './art.js';

const DIR_JA = { n: '北', s: '南', e: '東', w: '西' };
const KIND_JA = { nature: 'その土地のもの', sign: 'しるし', crossover: '不思議な品' };

/** 収集品のアイコン（素材が無ければコード描画） */
export function curioIconURL(cid) { return iconURL('curio.' + cid); }

// ───────── 世界地図 ─────────
/** world = {region, you:{nest, home}, friends}。土地の位置・出口・自分の巣・フレンドのいる土地・富山（見つけるまで霧） */
export function worldMapPanel(game) {
  const ui = game.ui, net = game.net;
  const here = (net.region || 'plains'), col = game.collection || {}, found = !!col.found;
  const p = el('div', 'tb-panel tb-menu tb-worldmap tb-ui-block');
  p.innerHTML = `<div class="tb-ph">世界地図<button class="tb-x">×</button></div><div class="tb-wm"><canvas class="tb-wmc" width="192" height="144"></canvas></div><div class="tb-wmlist tb-scroll"></div>`;
  const cv = p.querySelector('canvas'), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const man = Sprites.get('ui.worldmap');
  const cells = (man && man.cells) || { rocks: [96, 30], canyon: [40, 76], plains: [96, 76], dunes: [152, 76], toyama: [34, 124] };
  let t = 0, raf = 0;
  const myNest = game.field && game.field.myNest, home = game.field && game.field.home;
  const friendsHere = {};
  for (const f of game.friends || []) if (f.state === 'friend' && f.online && f.region) friendsHere[f.region] = (friendsHere[f.region] || 0) + 1;
  const draw = () => {
    g.clearRect(0, 0, 192, 144);
    if (!Sprites.drawCell(g, 'ui.worldmap', 0, 0, 0)) { g.fillStyle = '#e0cca0'; g.fillRect(0, 0, 192, 144); for (const id of OPEN_REGIONS) { const [x, y] = cells[id]; g.fillStyle = { plains: '#c8b470', rocks: '#9a8a76', dunes: '#e8bc78', canyon: '#6e9a4c' }[id]; g.beginPath(); g.ellipse(x, y, 24, 18, 0, 0, Math.PI * 2); g.fill(); } }
    // 富山：見つけるまでは霧
    if (!found) {
      const [x, y] = cells.toyama;
      for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 6 + (i % 7) * 4; g.fillStyle = `rgba(236,232,224,${0.55 + 0.25 * Math.sin(t * 0.8 + i)})`; g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 14, 9, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.font = '7px DotGothic16, "DotGothic16 Local", monospace'; g.textAlign = 'center';
    for (const id of REGION_IDS) {
      if (id === 'toyama' && !found) { const [x, y] = cells.toyama; g.fillStyle = '#5a4a3a'; g.fillText('？？？', x, y + 2); continue; }
      const [x, y] = cells[id];
      g.fillStyle = 'rgba(255,248,230,.85)'; const tw = g.measureText(REGION[id].name).width; g.fillRect(x - tw / 2 - 2, y + 10, tw + 4, 9);
      g.fillStyle = '#3a2412'; g.fillText(REGION[id].name, x, y + 17);
      if (friendsHere[id]) { g.fillStyle = '#2a9050'; g.fillText('フレンド ' + friendsHere[id], x, y - 12); }
    }
    // 自分の巣・共同巣・いる所
    const mark = (id, color, dx) => { const [x, y] = cells[id] || cells.plains; g.fillStyle = color; g.fillRect(x + dx - 2, y - 2, 5, 5); g.fillStyle = '#2a1a10'; g.fillRect(x + dx - 1, y - 4, 3, 2); };
    if (myNest && myNest.region) mark(myNest.region, '#ffe070', -8);
    if (home && home.region) mark(home.region, '#ffb0c8', 8);
    const [hx, hy] = cells[here] || cells.plains;
    const k = (t * 1.5) % 1;
    g.strokeStyle = `rgba(232,58,42,${1 - k})`; g.lineWidth = 1; g.beginPath(); g.arc(hx + 0.5, hy + 0.5, 3 + k * 8, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e83a2a'; g.fillRect(hx - 1, hy - 1, 3, 3);
  };
  const loop = () => { t += 1 / 30; draw(); raf = setTimeout(loop, 33); };
  loop();
  const list = p.querySelector('.tb-wmlist');
  const rows = [];
  for (const id of REGION_IDS) {
    const R = REGION[id];
    if (id === 'toyama' && !found) { rows.push(`<div class="tb-wmrow dim"><b>？？？</b><span>南西の霧の向こう。……なにかがあるような気がする。</span></div>`); continue; }
    const exits = id === 'toyama' ? '「来た穴」から谷へ戻れる' : (id === 'plains' ? '北の端 → いわばの高台　東の端 → すなの海　西の端 → みずおとの谷' : '〜の端 → はじまりの原'.replace('〜', DIR_JA[{ rocks: 's', dunes: 'w', canyon: 'e' }[id]]));
    rows.push(`<div class="tb-wmrow${id === here ? ' here' : ''}"><b>${esc(R.name)}${id === here ? '（いまここ）' : ''}</b><span>${esc(R.desc)}</span><small>${esc(exits)}</small></div>`);
  }
  list.innerHTML = `<div class="tb-dim tb-wmnote">地図の端の出口（矢印のある所）まで跳ねていくと、となりの土地へ旅する。巣はどの土地にも掘れて、あとから土地をまたいで引っ越せる。</div>` + rows.join('');
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p, () => clearTimeout(raf));
  return p;
}

// ───────── 図鑑 ─────────
export async function collectionPanel(game) {
  const ui = game.ui;
  const r = await game.net.collection();
  if (r && r.ok) game.setCollection({ owned: r.owned, achievements: r.achievements, found: r.stats && r.stats.found });
  const owned = (game.collection && game.collection.owned) || {};
  const found = !!(game.collection && game.collection.found);
  const n = CURIO_ORDER.filter(id => owned[id]).length;
  const p = el('div', 'tb-panel tb-menu tb-zukan tb-ui-block');
  p.innerHTML = `<div class="tb-ph">図鑑 <span class="tb-dim">${n} / ${CURIO_ORDER.length}</span><button class="tb-x">×</button></div>
    <div class="tb-zgrid tb-scroll"></div><div class="tb-zdetail">品を押すと説明。手に入れた品は巣の全体モードの「家具」から飾れる。</div>`;
  const grid = p.querySelector('.tb-zgrid'), det = p.querySelector('.tb-zdetail');
  let section = null;
  for (const id of CURIO_ORDER) {
    const c = CURIOS[id];
    const sec = c.region === 'toyama' ? 'toyama' : c.region;
    if (sec !== section) {
      section = sec;
      const name = sec === 'toyama' ? (found ? '富山（他の世界とのつながり？）' : '？？？') : REGION[sec].name;
      grid.appendChild(el('div', 'tb-zsec', esc(name)));
    }
    const have = !!owned[id];
    const hidden = c.region === 'toyama' && !found && !have;
    const b = el('button', 'tb-zslot' + (have ? ' have' : '') + (c.rarest ? ' rare' : ''), have ? `<img src="${curioIconURL(id)}" alt="">` : '<span>？</span>');
    b.type = 'button';
    b.title = have ? c.name : '？？？';
    b.onclick = () => {
      for (const x of grid.querySelectorAll('.tb-zslot')) x.classList.toggle('sel', x === b);
      det.innerHTML = have
        ? `<b>${esc(c.name)}</b> <span class="tb-dim">（${esc(KIND_JA[c.kind])}・${esc(c.region === 'toyama' ? '富山' : REGION[c.region].name)}・${fmtWhen(owned[id])}）</span><br>${esc(c.desc)}`
        : `<b>？？？</b><br><span class="tb-dim">${hidden ? 'まだ知らない土地の品のようだ。' : esc(c.hint)}</span>`;
    };
    grid.appendChild(b);
  }
  const signN = SIGNS.filter(id => owned[id]).length;
  if (!found && signN) det.innerHTML += `<br><span class="tb-ok">しるし ${signN} / ${SIGNS.length}：どれも「冬の谷」を指しているようだ…</span>`;
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p);
  return p;
}

// ───────── 実績 ─────────
export async function achievementsPanel(game) {
  const ui = game.ui;
  const r = await game.net.collection();
  if (r && r.ok) game.setCollection({ owned: r.owned, achievements: r.achievements, found: r.stats && r.stats.found });
  const got = (game.collection && game.collection.achievements) || {};
  const st = (r && r.stats) || {};
  const n = ACHIEVEMENTS.filter(a => got[a.id]).length;
  const p = el('div', 'tb-panel tb-menu tb-achv tb-ui-block');
  const prog = {
    seasons4: (st.seasons || []).length + '/4', regions4: (st.regions || []).filter(x => OPEN_REGIONS.includes(x)).length + '/4', visit5: (st.visited || 0) + '/5',
    collector5: Object.keys(game.collection.owned || {}).length + '/5', collector12: Object.keys(game.collection.owned || {}).length + '/12',
  };
  p.innerHTML = `<div class="tb-ph">実績 <span class="tb-dim">${n} / ${ACHIEVEMENTS.length}</span><button class="tb-x">×</button></div><div class="tb-alist tb-scroll">${ACHIEVEMENTS.map(a => {
    const have = !!got[a.id], secret = a.secret && !have;
    const reward = a.reward && FURNITURE[a.reward] ? `<small class="${have ? 'tb-ok' : 'tb-dim'}">ごほうび：${esc(FURNITURE[a.reward].name)}${have ? '（巣の家具に追加）' : ''}</small>` : '';
    return `<div class="tb-arow${have ? ' have' : ''}"><i class="tb-medal">${have ? '★' : '☆'}</i><div><b>${secret ? '？？？' : esc(a.name)}</b>${have ? ` <span class="tb-dim">${fmtWhen(got[a.id])}</span>` : prog[a.id] ? ` <span class="tb-dim">${prog[a.id]}</span>` : ''}<span>${secret ? 'まだ ひみつ' : esc(a.desc)}</span>${secret ? '' : reward}</div></div>`;
  }).join('')}</div>`;
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p);
  return p;
}

// ───────── 豊かな巣（穏やかなランキング）─────────
export async function rankingPanel(game) {
  const ui = game.ui;
  const r = await game.net.ranking();
  if (!r || !r.ok) { ui.toast((r && r.reason) || '見られない', 'bad'); return; }
  const p = el('div', 'tb-panel tb-menu tb-rank tb-ui-block');
  const row = x => `<div class="tb-rrow${x.me ? ' me' : ''}"><b>${x.rank}</b><span class="nm">${esc(x.name)}の巣</span><span class="tb-dim">${esc((REGION[x.region] || REGION.plains).name)}</span><span class="sc">${x.score}</span><small>部屋 ${x.rooms}・家具 ${x.decor}・飾った品 ${x.curios}</small></div>`;
  p.innerHTML = `<div class="tb-ph">豊かな巣<button class="tb-x">×</button></div>
    <div class="tb-dim tb-rnote">部屋・家具・飾った収集品から数えた「豊かさ」。競うためより、見せ合うための目安。</div>
    <div class="tb-rlist tb-scroll">${r.list.length ? r.list.map(row).join('') : '<div class="tb-dim">まだ巣がない</div>'}${r.mine && r.mine.rank > 10 ? '<div class="tb-dim">…</div>' + row(r.mine) : ''}</div>`;
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p);
  return p;
}

// ───────── 共同巣 ─────────
export async function residentsPanel(game) {
  const ui = game.ui, net = game.net;
  const r = await net.residents();
  const p = el('div', 'tb-panel tb-menu tb-resid tb-ui-block');
  p.innerHTML = `<div class="tb-ph">共同巣<button class="tb-x">×</button></div><div class="tb-rbody tb-scroll"></div>`;
  const body = p.querySelector('.tb-rbody');
  const act = async (fn, okText) => { const x = await fn(); if (!x.ok) { ui.toast(x.reason || 'できなかった', 'bad'); return; } if (okText) ui.toast(okText); render(x); if (game.onResidents) game.onResidents(x); };
  const render = info => {
    if (info.offline) { body.innerHTML = '<div class="tb-dim">共同巣（フレンドといっしょに 1 つの巣に住む）は オンラインで使えます。</div>'; return; }
    const h = [];
    h.push('<div class="tb-sub">あなたの巣に いっしょに住む子 <span class="tb-dim">（フレンドから ' + info.max + ' 匹まで。住人は いつでも入れて・掘れて・倉庫を使えて・眠れて・子を育てられる。訪問設定を決めるのは あなただけ）</span></div>');
    if (!info.mine) h.push('<div class="tb-dim">まだ巣が無い（先に巣を掘ろう）</div>');
    else {
      h.push('<div class="tb-names res">' + info.mine.residents.map(x => `<span class="tb-chip">${esc(x.name)}<button type="button" data-rm="${x.id}" title="外す">×</button></span>`).join('') +
        info.mine.invites.map(x => `<span class="tb-chip dim">${esc(x.name)}（返事待ち）<button type="button" data-rm="${x.id}" title="取り消す">×</button></span>`).join('') +
        (info.mine.residents.length + info.mine.invites.length < info.max ? '<span class="tb-chipadd"><input maxlength="10" placeholder="フレンドのなまえ"><button type="button" class="tb-btn small tb-inv">誘う</button></span>' : '') + '</div>');
    }
    h.push('<div class="tb-sub">あなたが住んでいる巣</div>');
    h.push(info.home ? `<div class="tb-frow"><span class="nm">${esc(info.home.ownerName)}の巣</span><span class="tb-dim">${esc((REGION[info.home.region] || REGION.plains).name)}</span><span class="bt"><button type="button" class="tb-btn small tb-leave">出る</button></span></div>` : '<div class="tb-dim">どこにも住んでいない</div>');
    if (info.invites.length) {
      h.push('<div class="tb-sub">誘いが来ている</div>');
      for (const v of info.invites) h.push(`<div class="tb-frow"><span class="nm">${esc(v.ownerName)}の巣</span><span class="tb-dim">${esc((REGION[v.region] || REGION.plains).name)}</span><span class="bt"><button type="button" class="tb-btn small primary" data-yes="${v.nestId}">住む</button><button type="button" class="tb-btn small" data-no="${v.nestId}">見送る</button></span></div>`);
    }
    body.innerHTML = h.join('');
    const inp = body.querySelector('.tb-chipadd input');
    const go = () => { const v = inp.value.trim(); if (v) act(() => net.residentInvite(v), v + ' を誘った（返事を待とう）'); };
    if (inp) { body.querySelector('.tb-inv').onclick = go; inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') go(); }); }
    for (const b of body.querySelectorAll('[data-rm]')) b.onclick = () => act(() => net.residentRemove(Number(b.dataset.rm)), '外した');
    for (const b of body.querySelectorAll('[data-yes]')) b.onclick = () => act(() => net.residentAnswer(Number(b.dataset.yes), true), 'いっしょに住むことになった！（その巣が あなたの家になる）');
    for (const b of body.querySelectorAll('[data-no]')) b.onclick = () => act(() => net.residentAnswer(Number(b.dataset.no), false), '見送った');
    const lv = body.querySelector('.tb-leave');
    if (lv) lv.onclick = async () => { if (await ui.confirmInline(lv.closest('.tb-frow'), '共同巣を出る？')) act(() => net.residentLeave(), '共同巣を出た'); };
  };
  render(r && r.ok ? r : { offline: true });
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p);
  return p;
}

/** 収集品を見つけたときの小さなお知らせ（パネルではなく大きめのトースト） */
export function discoveryCard(game, cid) {
  const c = CURIOS[cid];
  if (!c) return;
  const card = el('div', 'tb-found tb-ui-block', `<img src="${curioIconURL(cid)}" alt=""><div><b>${esc(c.name)}</b><span>${esc(c.desc)}</span><small>図鑑に加わった${c.kind === 'sign' ? '（しるし）' : c.kind === 'crossover' ? '（不思議な品）' : ''}</small></div>`);
  game.hud.appendChild(card);
  setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 500); }, 4200);
}
/** 土地に着いたときの名前の札 */
export function regionCard(game, id) {
  const R = REGION[id];
  if (!R) return;
  for (const old of game.hud.querySelectorAll('.tb-regcard')) old.remove();
  const card = el('div', 'tb-regcard', `<b>${esc(R.name)}</b>${id === 'toyama' ? '<span>……ここは どこだろう</span>' : ''}`);
  game.hud.appendChild(card);
  setTimeout(() => { card.classList.add('out'); setTimeout(() => card.remove(), 700); }, 2400);
}
void A; void CROSSOVER;
