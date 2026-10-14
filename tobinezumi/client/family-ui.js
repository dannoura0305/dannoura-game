// tobinezumi/client/family-ui.js — Ver.0.4「いのちをつなぐ」の画面：家族・名前をつける・そろそろ次の世代へ・家系図（つまんで拡大・指で動かす）
import { el, esc } from './ui.js';
import { Sprites } from './sprites.js';
import * as A from './art.js';
import { lookOf, traitWords, TRAIT_NAME } from '../shared/genetics.js';
import { STAGE_NAME, ageLabel, stageOf, PUP, STAGE, BREED, heirBlock } from '../shared/family.js';
import { NAME_MAX } from '../shared/protocol.js';

const ROLE_NAME = { player: 'いまの子', pup: '子ども', kin: 'きょうだい', mate: 'つれあい', ancestor: 'ご先祖', left: '巣立った' };
const SEX = { f: '<span class="tb-sexf" title="女の子">♀</span>', m: '<span class="tb-sexm" title="男の子">♂</span>' };

/** その子の見た目（子ども・若者は小さく） */
export function lookOfInd(m) {
  const st = m.stage || stageOf(m.ageMs);
  return lookOf(m.traits, { pup: st === 'pup', young: st === 'young', ps: (Number(m.id) || 0) % 97 });
}
const portraitCache = new Map();
export function portraitURL(m, size = 48) {
  const L = lookOfInd(m), k = JSON.stringify(L) + size;
  if (portraitCache.has(k)) return portraitCache.get(k);
  const c = Sprites.lookPortrait(L, size);
  const url = c.toDataURL();
  portraitCache.set(k, url);
  return url;
}
export function traitChips(traits) {
  return traitWords(traits).map(w => `<span class="tb-chipt t-${w.k}${w.v > 0 ? ' up' : w.v < 0 ? ' down' : ''}">${esc(w.text)}</span>`).join('');
}
const hours = ms => { const h = ms / (60 * 1000); return h >= 1 ? Math.ceil(h) + ' 時間' : '1 時間'; };   // 世界の 1 時間 = 実時間 1 分

/** 家族の一覧。h = {rename(m), succeed(m), follow(on), lineage(), farewell()} */
export function familyPanel(game, fam, h) {
  const ui = game.ui;
  const p = el('div', 'tb-panel tb-menu tb-family tb-ui-block');
  const me = fam.me;
  const row = (m, extra = '') => {
    const st = m.stage || stageOf(m.ageMs);
    const fed = (m.role === 'pup' || m.role === 'kin') && (st === 'pup' || st === 'young') ? `<span class="tb-fed" title="おなか"><i style="width:${Math.round(m.fed)}%"></i></span>` : '';
    return `<div class="tb-famrow" data-id="${m.id}"><img class="tb-famimg" src="${portraitURL(m, 48)}" alt=""><div class="tb-faminfo">
      <div><b>${esc(m.name)}</b>${m.named === false ? '<span class="tb-dim">（名前をつけよう）</span>' : ''} ${SEX[m.sex] || ''} <span class="tb-dim">${ROLE_NAME[m.role] || ''}・${STAGE_NAME[st]}・${ageLabel(m.ageMs)}</span> ${fed}</div>
      <div class="tb-chips">${traitChips(m.traits)}</div>${extra}</div><div class="tb-fambtns"></div></div>`;
  };
  const kids = fam.members.filter(m => m.role === 'pup' || m.role === 'kin');
  const mate = fam.members.find(m => m.role === 'mate');
  const pend = fam.pending ? (fam.pending.wait ? '<div class="tb-ok">冬のあいだは巣ごもり。春になったら赤ちゃんが生まれる</div>' : `<div class="tb-ok">もうすぐ赤ちゃんが生まれる（あと ${hours(fam.pending.dueIn)}・遊んだ時間で）</div>`) : '';
  const next = me.stage === 'adult' ? (fam.cooldown > 0 ? `<div class="tb-dim">次のお産まで あと ${hours(fam.cooldown)}</div>` : '') : me.stage === 'young' || me.stage === 'pup' ? `<div class="tb-dim">おとな（${STAGE.YOUNG_END} 日）になると、野生のトビネズミと なかよくなれる</div>` : '';
  p.innerHTML = `<div class="tb-ph">家族<button class="tb-x">×</button></div>
    <div class="tb-famlist tb-scroll">
      ${row(me, pend + next)}
      ${mate ? row(mate) : '<div class="tb-dim tb-famhint">つれあいはまだいない。地上の野生のトビネズミに<b>そっと近づいてじっとする</b>か<b>種子をあげる</b>と信頼が増え、なかよしになると ついてくる。そのまま自分の巣へ入ると つれあいに（寝床の部屋・倉庫の種子 ' + BREED.SEEDS + ' 以上・冬は×）。</div>'}
      ${kids.length ? '<div class="tb-sub">子ども・きょうだい（' + kids.length + '）</div>' + kids.map(m => row(m)).join('') : ''}
    </div>
    <label class="tb-check"><input type="checkbox" class="tb-follow" ${fam.follow ? 'checked' : ''}> 若者を地上へ連れて行く（3 匹まで・捕食者が来ると巣へかくれる）</label>
    <div class="tb-menu-items"></div>`;
  for (const r of p.querySelectorAll('.tb-famrow')) {
    const id = r.dataset.id, m = [me, ...fam.members].find(x => String(x.id) === id);
    const bt = r.querySelector('.tb-fambtns');
    const b = (label, fn, cls = '') => { const x = el('button', 'tb-btn small ' + cls, esc(label)); x.type = 'button'; x.onclick = fn; bt.appendChild(x); };
    if (m.role === 'pup' || m.role === 'kin') b('名前', () => h.rename(m));
    if (fam.heirs && fam.heirs.some(x => String(x) === id)) b('次の世代に', () => h.succeed(m), 'primary');
    else if (m.role === 'pup' && heirBlock(me, m)) r.title = '若者（' + STAGE.PUP_END + ' 日）になると 次の世代に選べる';
  }
  p.querySelector('.tb-follow').onchange = e => h.follow(e.target.checked);
  const box = p.querySelector('.tb-menu-items');
  const item = (label, fn, cls = '') => { const x = el('button', 'tb-btn wide ' + cls, esc(label)); x.type = 'button'; x.onclick = fn; box.appendChild(x); };
  item('家系図を見る', () => h.lineage(), 'primary');
  if (me.stage === 'elder' && !(fam.heirs && fam.heirs.length)) item('旅立つ（親せきの子に巣をまかせる）', () => h.farewell());
  item('とじる', () => ui.closeModal());
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  ui._openModal(p);
  return p;
}

/** 生まれた子に名前をつける（おすすめの名前が入っている）。onDone([{id, name}]) */
export function namingDialog(game, pups, onDone) {
  const ui = game.ui;
  const p = el('div', 'tb-panel tb-menu tb-naming tb-ui-block');
  p.innerHTML = `<div class="tb-ph">赤ちゃんが生まれた！<button class="tb-x">×</button></div>
    <div class="tb-dim">${pups.length} 匹。名前をつけてあげよう（あとから「家族」で変えられる）</div>
    <div class="tb-namelist tb-scroll">${pups.map(m => `<label class="tb-namerow"><img class="tb-famimg" src="${portraitURL({ ...m, stage: 'young' }, 48)}" alt=""><span>${SEX[m.sex] || ''}<input data-id="${m.id}" maxlength="${NAME_MAX}" value="${esc(m.name)}"></span><span class="tb-chips">${traitChips(m.traits)}</span></label>`).join('')}</div>
    <div class="tb-btns"><button class="tb-btn primary ok" type="button">この名前にする</button><button class="tb-btn later" type="button">あとで</button></div>`;
  const fin = save => {
    const list = [...p.querySelectorAll('input[data-id]')].map(i => ({ id: Number(i.dataset.id), name: i.value.trim() })).filter(x => x.name);
    ui.closeModal();
    if (save) onDone(list);
  };
  for (const i of p.querySelectorAll('input')) i.addEventListener('keydown', e => { e.stopPropagation(); if (e.isComposing || e.keyCode === 229) return; if (e.key === 'Enter') fin(true); });
  p.querySelector('.ok').onclick = () => fin(true);
  p.querySelector('.later').onclick = () => fin(false);
  p.querySelector('.tb-x').onclick = () => fin(false);
  ui._openModal(p);
  return p;
}

/** 世代交代の見送り（短い場面） */
export function farewellScene(game, retired, heir, onClose) {
  const ui = game.ui;
  const old = retired[0];
  const p = el('div', 'tb-panel tb-dialog tb-farewell tb-ui-block');
  p.innerHTML = `<div class="tb-ph">あとをつぐ</div>
    <div class="tb-farepair"><img src="${portraitURL({ ...old, stage: 'adult' }, 64)}" alt=""><span class="tb-farearrow">→</span><img src="${portraitURL({ ...heir, stage: heir.stage || 'young' }, 64)}" alt=""></div>
    <div class="tb-body"><b>${esc(old.name)}</b> は ご先祖になって、巣の奥でのんびり暮らします。<br>これからは <b>${esc(heir.name)}</b> の番！ 巣も倉庫も持ち物もフレンドも そのまま。</div>
    <div class="tb-btns"><button class="tb-btn primary" type="button">はじめる</button></div>`;
  p.querySelector('button').onclick = () => { ui.closeModal(); if (onClose) onClose(); };
  ui._openModal(p);
}

// ───────── 家系図 ─────────
/** 並べ方：世代ごとの段（つれあいは相手と同じ段）。段の中は親の位置の順。返り値 {pos: Map(id→{x,y}), links:[{a,b,kids}], w, h} */
export function layoutLineage(nodes) {
  const byId = new Map(nodes.map(n => [String(n.id), n]));
  const kidsOf = new Map();
  for (const n of nodes) for (const pid of [n.mother_id, n.father_id, n.kinOf]) if (pid != null && byId.has(String(pid))) { const k = String(pid); if (!kidsOf.has(k)) kidsOf.set(k, []); kidsOf.get(k).push(n); }
  const rowOf = n => {
    const ks = kidsOf.get(String(n.id));
    if (ks && ks.length && n.mother_id == null && n.father_id == null && n.kinOf == null) return Math.max(0, Math.min(...ks.map(k => k.generation)) - 2);
    return Math.max(0, (n.generation || 1) - 1);
  };
  const rows = [];
  for (const n of nodes) { const r = rowOf(n); (rows[r] = rows[r] || []).push(n); }
  const X = new Map(), GAP = 74, RG = 104;
  const partnerOf = n => { for (const k of kidsOf.get(String(n.id)) || []) { const o = String(k.mother_id) === String(n.id) ? k.father_id : k.mother_id; if (o != null && byId.has(String(o))) return byId.get(String(o)); } return null; };
  rows.forEach((list, r) => {
    if (!list) { rows[r] = []; return; }
    const key = n => {
      const ps = [n.mother_id, n.father_id, n.kinOf].map(x => X.get(String(x))).filter(v => v != null);
      if (ps.length) return ps.reduce((a, b) => a + b, 0) / ps.length + (n.id % 1000) * 1e-4;
      const pt = partnerOf(n);
      if (pt && pt !== n && (pt.mother_id != null || pt.father_id != null || pt.kinOf != null) && X.has(String(pt.id))) return X.get(String(pt.id)) + 0.5;
      return -1e6 + (n.role === 'mate' || n.wild ? 0.5 : 0) + Number(n.id) * 1e-3;
    };
    // 親のいる子を先に決める（つれあいはその横）
    const withParents = list.filter(n => n.mother_id != null || n.father_id != null || n.kinOf != null);
    const tmp = new Map();
    withParents.sort((a, b) => key(a) - key(b)).forEach((n, i) => tmp.set(String(n.id), i));
    const order = [...list].sort((a, b) => {
      const ka = tmp.has(String(a.id)) ? tmp.get(String(a.id)) : (() => { const pt = partnerOf(a); return pt && tmp.has(String(pt.id)) ? tmp.get(String(pt.id)) + 0.5 : 1e5 + a.id * 1e-3; })();
      const kb = tmp.has(String(b.id)) ? tmp.get(String(b.id)) : (() => { const pt = partnerOf(b); return pt && tmp.has(String(pt.id)) ? tmp.get(String(pt.id)) + 0.5 : 1e5 + b.id * 1e-3; })();
      return ka - kb;
    });
    if (r === 0) order.sort((a, b) => (partnerOf(a) === b ? -1 : 0) || (a.wild ? 1 : 0) - (b.wild ? 1 : 0) || a.id - b.id);
    // 親の真ん中の下に寄せる（重ならないように左から詰める）
    let last = -1e9;
    const want = n => { const ps = [n.mother_id, n.father_id, n.kinOf].map(x => X.get(String(x))).filter(v => v != null); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null; };
    const groups = [];
    for (const n of order) { const w = want(n); const g = groups[groups.length - 1]; if (g && g.w === w && w != null) g.list.push(n); else groups.push({ w, list: [n] }); }
    for (const g of groups) {
      const width = (g.list.length - 1) * GAP;
      let x0 = g.w != null ? g.w - width / 2 : last + GAP;
      if (x0 < last + GAP) x0 = last + GAP;
      g.list.forEach((n, i) => { X.set(String(n.id), x0 + i * GAP); });
      last = x0 + width;
    }
    rows[r] = order;
  });
  const pos = new Map();
  let minX = 1e9, maxX = -1e9;
  rows.forEach((list, r) => list.forEach(n => { const x = X.get(String(n.id)); pos.set(String(n.id), { x, y: r * RG }); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }));
  for (const v of pos.values()) v.x -= (minX + maxX) / 2;
  const links = [];
  const seen = new Map();
  for (const n of nodes) {
    const a = n.mother_id != null && byId.has(String(n.mother_id)) ? String(n.mother_id) : null, b = n.father_id != null && byId.has(String(n.father_id)) ? String(n.father_id) : null;
    const k = n.kinOf != null && byId.has(String(n.kinOf)) ? String(n.kinOf) : null;
    if (!a && !b && !k) continue;
    const key = (a || '') + '|' + (b || '') + '|' + (k || '');
    if (!seen.has(key)) { const L = { a, b, kin: k, kids: [] }; seen.set(key, L); links.push(L); }
    seen.get(key).kids.push(String(n.id));
  }
  return { pos, links, rows: rows.length, w: maxX - minX, h: (rows.length - 1) * RG };
}

/** 家系図の画面。data = {nodes, current} */
export function lineagePanel(game, data) {
  const ui = game.ui;
  const p = el('div', 'tb-panel tb-lineage tb-ui-block');
  p.innerHTML = `<div class="tb-ph">家系図 <span class="tb-dim">（${data.nodes.length} 匹・${new Set(data.nodes.map(n => n.generation)).size} 代）</span><button class="tb-x">×</button></div>
    <div class="tb-lincv"><canvas></canvas><div class="tb-linzoom"><button class="tb-btn small zin" type="button">＋</button><button class="tb-btn small zout" type="button">－</button><button class="tb-btn small zfit" type="button">全体</button></div></div>
    <div class="tb-lininfo tb-dim">${game.isTouch ? '指で動かす・2 本指でつまんで拡大・タップでくわしく' : 'ドラッグで動かす・ホイールで拡大・クリックでくわしく'}</div>`;
  ui._openModal(p, () => { cancelAnimationFrame(raf); });
  p.querySelector('.tb-x').onclick = () => ui.closeModal();
  const box = p.querySelector('.tb-lincv'), cv = box.querySelector('canvas'), info = p.querySelector('.tb-lininfo');
  const L = layoutLineage(data.nodes);
  const byId = new Map(data.nodes.map(n => [String(n.id), n]));
  const pics = new Map();
  for (const n of data.nodes) pics.set(String(n.id), Sprites.lookPortrait(lookOfInd(n), 48));
  const NW = 60, NH = 82;
  let z = 1, tx = 0, ty = 0, sel = String(data.current), raf = 0, dirty = true;
  const size = () => { const r = box.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(10, Math.round(r.width * dpr)); cv.height = Math.max(10, Math.round(r.height * dpr)); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; return { w: r.width, h: r.height, dpr }; };
  let S = size();
  const fit = () => {
    S = size();
    const w = L.w + NW + 20, h = L.h + NH + 24;
    z = Math.max(0.35, Math.min(2.2, Math.min(S.w / w, S.h / h)));
    tx = S.w / 2; ty = (S.h - L.h * z) / 2;
    dirty = true;
  };
  fit();
  const frameImg = Sprites.get('ui.lineage_frame');
  const traitsIdx = n => Sprites.nameIndex('ui.traits', n);
  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (!dirty) return;
    dirty = false;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(S.dpr * z, 0, 0, S.dpr * z, S.dpr * tx, S.dpr * ty);
    g.imageSmoothingEnabled = false;
    // 線（親 → 子）
    g.lineWidth = 2 / Math.max(0.6, z); g.strokeStyle = '#c9a24a';
    for (const k of L.links) {
      const pa = k.a ? L.pos.get(k.a) : null, pb = k.b ? L.pos.get(k.b) : null, pk = k.kin ? L.pos.get(k.kin) : null;
      const par = [pa, pb, pk].filter(Boolean);
      if (!par.length) continue;
      const mx = par.reduce((s, q) => s + q.x, 0) / par.length, my = par[0].y + NH / 2 + 2;
      if (pa && pb) { g.strokeStyle = '#e8485a'; g.beginPath(); g.moveTo(pa.x + (pa.x < pb.x ? NW / 2 : -NW / 2), pa.y); g.lineTo(pb.x + (pb.x < pa.x ? NW / 2 : -NW / 2), pb.y); g.stroke(); g.strokeStyle = '#c9a24a'; }
      const kids = k.kids.map(id => L.pos.get(id)).filter(Boolean);
      const cy = kids[0].y - NH / 2 - 10;
      g.setLineDash(pk ? [4, 3] : []);
      g.beginPath(); g.moveTo(mx, pa && pb ? par[0].y : my); g.lineTo(mx, cy);
      const xs = kids.map(q => q.x);
      g.moveTo(Math.min(mx, ...xs), cy); g.lineTo(Math.max(mx, ...xs), cy);
      for (const q of kids) { g.moveTo(q.x, cy); g.lineTo(q.x, q.y - NH / 2); }
      g.stroke(); g.setLineDash([]);
    }
    // 札
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (const n of data.nodes) {
      const q = L.pos.get(String(n.id)); if (!q) continue;
      const x0 = q.x - NW / 2, y0 = q.y - NH / 2, cur = String(n.id) === String(data.current), on = String(n.id) === sel;
      g.fillStyle = n.role === 'ancestor' || n.role === 'left' ? '#2e2218' : '#3a2a1e';
      g.fillRect(x0, y0, NW, NH);
      if (frameImg) nine(g, frameImg, cur ? 1 : 0, x0 - 2, y0 - 2, NW + 4, 56);
      else { g.strokeStyle = cur ? '#e8c060' : '#a88c68'; g.strokeRect(x0, y0, NW, 52); }
      g.globalAlpha = n.role === 'ancestor' || n.role === 'left' ? 0.85 : 1;
      g.drawImage(pics.get(String(n.id)), q.x - 24, y0 + 3);
      g.globalAlpha = 1;
      g.fillStyle = cur ? '#ffe9a8' : '#f2dcc0'; g.font = "9px 'DotGothic16','DotGothic16 Local',sans-serif";
      g.fillText((n.sex === 'f' ? '♀' : n.sex === 'm' ? '♂' : '') + n.name, q.x, y0 + 55);
      g.fillStyle = '#b8a48a'; g.font = "7px 'DotGothic16','DotGothic16 Local',sans-serif";
      g.fillText((ROLE_NAME[n.role] || '') + '・' + (STAGE_NAME[n.stage] || ''), q.x, y0 + 65);
      // 形質のアイコン（ふつうと違うもの）
      const ic = traitWords(n.traits).filter(w => w.k !== 'fur' || w.text.length > 3).slice(0, 5);
      let ix = q.x - ic.length * 5.5;
      for (const w of ic) { const i = traitsIdx(w.k === 'tuft' ? 'tail' : w.k); if (i >= 0) Sprites.drawCell(g, 'ui.traits', i, Math.round(ix), y0 + NH - 9); ix += 11; }
      if (on) { g.strokeStyle = '#7fc4b4'; g.lineWidth = 2; g.strokeRect(x0 - 3, y0 - 3, NW + 6, NH + 6); }
    }
  };
  const show = n => {
    if (!n) return;
    const par = [byId.get(String(n.mother_id)), byId.get(String(n.father_id))].filter(Boolean).map(x => esc(x.name)).join('・');
    info.classList.remove('tb-dim');
    info.innerHTML = `<b>${esc(n.name)}</b> ${SEX[n.sex] || ''} <span class="tb-dim">${n.generation} 代目・${ROLE_NAME[n.role] || ''}・${STAGE_NAME[n.stage] || ''}・${ageLabel(n.ageMs)}${par ? '・親 ' + par : n.kinOf ? '・親せき' : n.wild ? '・野生の生まれ' : ''}</span> <span class="tb-chips">${traitChips(n.traits)}</span>`;
  };
  show(byId.get(sel));
  draw();
  // 操作：ドラッグ・ピンチ・ホイール・タップ
  const ptrs = new Map();
  let moved = 0, pinch = null;
  cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z }; } });
  cv.addEventListener('pointermove', e => {
    const o = ptrs.get(e.pointerId); if (!o) return;
    const dx = e.clientX - o.x, dy = e.clientY - o.y;
    o.x = e.clientX; o.y = e.clientY;
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = cv.getBoundingClientRect(), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
      zoomAt(Math.max(0.3, Math.min(3, pinch.z * d / Math.max(1, pinch.d))) / z, cx, cy);
      moved += 10;
    } else if (ptrs.size === 1) { tx += dx; ty += dy; moved += Math.abs(dx) + Math.abs(dy); dirty = true; }
  });
  const up = e => {
    const was = ptrs.size;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (was === 1 && moved < 6 && e.type === 'pointerup') {
      const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left - tx) / z, wy = (e.clientY - r.top - ty) / z;
      for (const n of data.nodes) { const q = L.pos.get(String(n.id)); if (q && Math.abs(wx - q.x) <= NW / 2 && Math.abs(wy - q.y) <= NH / 2) { sel = String(n.id); show(n); dirty = true; break; } }
    }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const zoomAt = (k, cx, cy) => { const nz = Math.max(0.3, Math.min(3, z * k)); tx = cx - (cx - tx) * nz / z; ty = cy - (cy - ty) * nz / z; z = nz; dirty = true; };
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  p.querySelector('.zin').onclick = () => zoomAt(1.25, S.w / 2, S.h / 2);
  p.querySelector('.zout').onclick = () => zoomAt(1 / 1.25, S.w / 2, S.h / 2);
  p.querySelector('.zfit').onclick = () => fit();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const ow = S.w; S = size(); if (Math.abs(ow - S.w) > 2) fit(); dirty = true; }) : null;
  if (ro) ro.observe(box);
  game.debug.lineage = { nodes: data.nodes.length, gens: L.rows, view: () => ({ z, tx, ty }) };
  return p;
}
/** 9 スライスの枠（variant 列） */
function nine(g, e, col, x, y, w, h) {
  const [cw, ch] = e.cell, s = (e.slice || [6, 6, 6, 6])[0], img = e.img, sx = col * cw;
  const parts = [[0, 0, s, s, x, y, s, s], [cw - s, 0, s, s, x + w - s, y, s, s], [0, ch - s, s, s, x, y + h - s, s, s], [cw - s, ch - s, s, s, x + w - s, y + h - s, s, s],
    [s, 0, cw - 2 * s, s, x + s, y, w - 2 * s, s], [s, ch - s, cw - 2 * s, s, x + s, y + h - s, w - 2 * s, s], [0, s, s, ch - 2 * s, x, y + s, s, h - 2 * s], [cw - s, s, s, ch - 2 * s, x + w - s, y + s, s, h - 2 * s]];
  for (const [a, b, c, d, X, Y, W, H] of parts) g.drawImage(img, sx + a, b, c, d, X, Y, W, H);
}
void A; void TRAIT_NAME; void PUP;
