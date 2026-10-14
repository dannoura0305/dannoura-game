// tobinezumi/shared/lineage.js — 家系図の並べ方（画面・書き出しで同じ）と、Ver.0.6 の書き出し（画像の配置・文字のまとめ）。DOM なし。
//
//   layoutLineage(nodes)                         … 世代ごとの段・親子の線（client/family-ui.js の家系図の画面が使う）
//   lineageExportLayout(nodes, current, opts)    … 画像（PNG）に書き出すときの配置：大きさ・札の位置・文字・線・見出し（描くのはクライアントの canvas）
//   lineageText(nodes, current, opts)            … 文字のまとめ（コピーして貼れる）
// 書き出しの中身はゲームの中のことだけ（名前・世代・形質・役割）。アカウント名・サーバーの場所は入れない。
import { traitWords } from './genetics.js';
import { STAGE_NAME, ageLabel } from './family.js';

export const ROLE_NAME = { player: 'いまの子', pup: '子ども', kin: 'きょうだい', mate: 'つれあい', ancestor: 'ご先祖', left: '巣立った', friend: 'なかま' };
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

export const EXPORT = { CARD_W: 96, CARD_H: 132, PORTRAIT: 64, PAD: 36, HEAD_H: 74, FOOT_H: 40, SCALE_X: 1.5, SCALE_Y: 132 / 104 * 1.32, MAX_W: 4096, MAX_H: 4096 };

/**
 * 画像の配置（決定的・DOM なし）。画面の家系図と同じ並び（layoutLineage）を、書き出し用の大きさへ広げる。
 * @returns {{w, h, scale, title, sub, foot, cards:[{id, x, y, w, h, cur, faded, name, sex, line1, line2, chips:[{k,text,v}], portrait:{x,y,size}}], lines:[{x0,y0,x1,y1,kind:'parent'|'pair'|'kin'}]}}
 */
export function lineageExportLayout(nodes, current, { owner = '', date = '' } = {}) {
  const list = (nodes || []).filter(n => n && n.role !== 'friend');
  const L = layoutLineage(list);
  const E = EXPORT;
  const cw = E.CARD_W, ch = E.CARD_H;
  const xs = [...L.pos.values()].map(p => p.x), ys = [...L.pos.values()].map(p => p.y);
  const minX = xs.length ? Math.min(...xs) : 0, maxX = xs.length ? Math.max(...xs) : 0, maxY = ys.length ? Math.max(...ys) : 0;
  const sx = E.SCALE_X, sy = E.SCALE_Y;
  let w = Math.round((maxX - minX) * sx + cw + E.PAD * 2), h = Math.round(maxY * sy + ch + E.PAD * 2 + E.HEAD_H + E.FOOT_H);
  w = Math.max(w, 420);
  // 大きすぎるときは全体を縮める（4096px まで）
  const scale = Math.min(1, E.MAX_W / w, E.MAX_H / h);
  const ox = w / 2 - ((maxX + minX) / 2) * sx, oy = E.HEAD_H + E.PAD + ch / 2;
  const P = id => { const q = L.pos.get(String(id)); return q ? { x: ox + q.x * sx, y: oy + q.y * sy } : null; };
  const cards = [];
  for (const n of list) {
    const q = P(n.id); if (!q) continue;
    const cur = String(n.id) === String(current);
    const chips = traitWords(n.traits).filter(t => t.k !== 'fur' || t.text.length > 2).slice(0, 4);
    cards.push({ id: n.id, x: q.x - cw / 2, y: q.y - ch / 2, w: cw, h: ch, cur, faded: n.role === 'ancestor' || n.role === 'left',
      name: n.name, sex: n.sex === 'f' ? '♀' : n.sex === 'm' ? '♂' : '', line1: (n.generation || 1) + ' 代目・' + (ROLE_NAME[n.role] || ''),
      line2: (STAGE_NAME[n.stage] || '') + (n.ageMs != null ? '・' + ageLabel(n.ageMs) : ''), chips, portrait: { x: q.x - E.PORTRAIT / 2, y: q.y - ch / 2 + 6, size: E.PORTRAIT } });
  }
  const lines = [];
  for (const k of L.links) {
    const pa = k.a ? P(k.a) : null, pb = k.b ? P(k.b) : null, pk = k.kin ? P(k.kin) : null;
    const par = [pa, pb, pk].filter(Boolean);
    const kids = k.kids.map(P).filter(Boolean);
    if (!par.length || !kids.length) continue;
    if (pa && pb) lines.push({ x0: Math.min(pa.x, pb.x) + cw / 2, y0: pa.y, x1: Math.max(pa.x, pb.x) - cw / 2, y1: pb.y, kind: 'pair' });
    const mx = par.reduce((s, q) => s + q.x, 0) / par.length, top = pa && pb ? pa.y : par[0].y + ch / 2;
    const cy = kids[0].y - ch / 2 - 12, kind = pk ? 'kin' : 'parent';
    lines.push({ x0: mx, y0: top, x1: mx, y1: cy, kind });
    const lo = Math.min(mx, ...kids.map(q => q.x)), hi = Math.max(mx, ...kids.map(q => q.x));
    if (hi > lo) lines.push({ x0: lo, y0: cy, x1: hi, y1: cy, kind });
    for (const q of kids) lines.push({ x0: q.x, y0: cy, x1: q.x, y1: q.y - ch / 2, kind });
  }
  const gens = new Set(list.map(n => n.generation || 1)).size;
  const cur = list.find(n => String(n.id) === String(current));
  return {
    w, h, scale, cards, lines,
    title: (owner || (cur ? cur.name : '')) + 'の家系図',
    sub: list.length + ' 匹・' + gens + ' 代' + (cur ? '　いまの子：' + cur.name + '（' + (cur.generation || 1) + ' 代目）' : ''),
    foot: 'トビネズミMMO（仮称）' + (date ? '　' + date : ''),
  };
}

/** 文字のまとめ（世代ごと。コピーして貼れる） */
export function lineageText(nodes, current, { owner = '', date = '' } = {}) {
  const list = (nodes || []).filter(n => n && n.role !== 'friend');
  const byId = new Map(list.map(n => [String(n.id), n]));
  const gens = [...new Set(list.map(n => n.generation || 1))].sort((a, b) => a - b);
  const cur = list.find(n => String(n.id) === String(current));
  const out = ['【' + (owner || (cur ? cur.name : '')) + 'の家系図】' + list.length + ' 匹・' + gens.length + ' 代' + (date ? '（' + date + '）' : '')];
  for (const g of gens) {
    out.push('― ' + g + ' 代目 ―');
    for (const n of list.filter(x => (x.generation || 1) === g).sort((a, b) => a.id - b.id)) {
      const par = [byId.get(String(n.mother_id)), byId.get(String(n.father_id))].filter(Boolean).map(x => x.name).join('・');
      const tw = traitWords(n.traits).map(t => t.text).join('・');
      out.push((String(n.id) === String(current) ? '★ ' : '・ ') + n.name + (n.sex === 'f' ? '♀' : n.sex === 'm' ? '♂' : '') + '（' + (ROLE_NAME[n.role] || '') + '・' + (STAGE_NAME[n.stage] || '') + '）' +
        (par ? ' 親：' + par : n.kinOf ? ' 親せき' : n.wild ? ' 野生の生まれ' : '') + (tw ? ' ［' + tw + '］' : ''));
    }
  }
  out.push('#トビネズミMMO');
  return out.join('\n');
}
