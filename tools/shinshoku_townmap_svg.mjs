// 『境界侵食』の町の図（SVG）を data/town.js から作る：node tools/shinshoku_townmap_svg.mjs → docs/shinshoku/town_map.svg
// 左：町全体の見取り図（MACRO）、右：自宅〜商店街（TOWN：歩ける所・区画・用水路・道のり・電柱）。配置を直したら作り直す。
import { writeFileSync } from 'node:fs';
import { TOWN, MACRO, homeW, townLamps } from '../shinshoku/data/town.js';

const W = 1400, H = 760, half = W / 2;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="sans-serif">`, `<rect width="${W}" height="${H}" fill="#120c1e"/>`];
const COL = { rail: '#5a5068', arcade: '#c89ad8', alley: '#8a7aa8', mall: '#7ab0d0', gym: '#d0b070', hospital: '#e88a9a', under: '#5a6a7a', office: '#9ab0a0', lab: '#a070d0', admin: '#b080e0', home: '#ffc890', res: '#4a4060', shop: '#80c8a0' };
// 町全体
{
  const x0 = -260, x1 = 470, z0 = -450, z1 = 190, sc = Math.min((half - 40) / (x1 - x0), (H - 80) / (z1 - z0));
  const P = (x, z) => [20 + (x - x0) * sc, 50 + (z - z0) * sc].map(v => +v.toFixed(1));
  out.push(`<text x="20" y="30" fill="#e8dcff" font-size="18" font-weight="bold">町の見取り図（北が上・名前は仮）</text>`);
  for (const r of MACRO.roads) out.push(`<polyline points="${r.pts.map(p => P(...p).join(',')).join(' ')}" fill="none" stroke="${r.water ? '#2a4a7a' : r.rail ? '#8a809a' : '#5a5070'}" stroke-width="${Math.max(2, r.w * sc * 1.3).toFixed(1)}" ${r.rail ? 'stroke-dasharray="6 4"' : ''}/>`);
  out.push(`<polyline points="${MACRO.bus.map(p => P(...p).join(',')).join(' ')}" fill="none" stroke="#ffd040" stroke-opacity=".6" stroke-width="2" stroke-dasharray="3 3"/>`);
  for (const d of MACRO.districts) {
    const [ax, az] = P(d.rect[0], d.rect[1]), [bx, bz] = P(d.rect[2], d.rect[3]), [lx, lz] = P(...(d.label || [d.rect[2], d.rect[1]]));
    out.push(`<rect x="${ax}" y="${az}" width="${Math.max(5, bx - ax).toFixed(1)}" height="${Math.max(5, bz - az).toFixed(1)}" fill="${COL[d.kind]}" fill-opacity=".8"/>`);
    out.push(`<line x1="${((ax + bx) / 2).toFixed(1)}" y1="${((az + bz) / 2).toFixed(1)}" x2="${lx}" y2="${lz - 4}" stroke="#c8bce0" stroke-opacity=".4"/><text x="${lx}" y="${lz}" fill="#e0d4f4" font-size="12">${esc(d.name)}</text>`);
  }
  for (const r of MACRO.roads) { const [x, z] = P(...r.pts[0]); out.push(`<text x="${x + 4}" y="${z - 4}" fill="#9a90b8" font-size="11">${esc(r.name)}</text>`); }
}
// 自宅〜商店街
{
  const B = TOWN.bounds, x0 = B.minX - 2, x1 = B.maxX + 2, z0 = -76, z1 = B.maxZ + 2, sc = Math.min((half - 40) / (x1 - x0), (H - 80) / (z1 - z0));
  const ox = half + 20, P = (x, z) => [ox + (x - x0) * sc, 50 + (z - z0) * sc].map(v => +v.toFixed(1));
  const R = (r, c, extra = '') => { const [ax, az] = P(r[0], r[1]), [bx, bz] = P(r[2], r[3]); out.push(`<rect x="${ax}" y="${az}" width="${(bx - ax).toFixed(1)}" height="${(bz - az).toFixed(1)}" fill="${c}" ${extra}/>`); };
  out.push(`<text x="${ox}" y="30" fill="#e8dcff" font-size="18" font-weight="bold">自宅〜あけぼの通り商店街（1 マス＝10m）</text>`);
  for (let x = Math.ceil(x0 / 10) * 10; x <= x1; x += 10) { const [a, b] = P(x, z0), [, d] = P(x, z1); out.push(`<line x1="${a}" y1="${b}" x2="${a}" y2="${d}" stroke="#ffffff" stroke-opacity=".05"/>`); }
  for (let z = Math.ceil(z0 / 10) * 10; z <= z1; z += 10) { const [a, b] = P(x0, z), [c] = P(x1, z); out.push(`<line x1="${a}" y1="${b}" x2="${c}" y2="${b}" stroke="#ffffff" stroke-opacity=".05"/>`); }
  for (const L of TOWN.lots) R(L.rect, L.kind === 'home' ? '#6a4a3a' : L.kind === 'konbini' ? '#3a6a5a' : L.kind === 'parking' ? '#3a3448' : L.kind === 'field' ? '#2a3a2a' : '#2a2238', 'stroke="#120c1e" stroke-width="1"');
  R([-10.5, -72, 10.5, -4], '#3a2a48'); R([-4.5, -72, 4.5, -4], '#c8a8e0');
  R([TOWN.channel.x0, TOWN.channel.z0, TOWN.channel.x1, TOWN.channel.z1], '#2a5a9a');
  for (const w of TOWN.walk) R(w.rect, { main: '#6a5a88', sidewalk: '#8a7aa8', lane: '#7a6a98', forecourt: '#a890c8', park: '#4a7a5a', nook: '#7a6a5a', yard: '#9a7a6a', parking: '#5a5070', bridge: '#8a7aa8' }[w.kind] || '#7a6a98');
  R([...homeW(-6, 6), ...homeW(6, 16)], '#ffc890');
  for (const c of TOWN.crossings) R([c.x0, c.z0, c.x1, c.z1], 'url(#zebra)');
  for (const l of townLamps()) { const [x, z] = P(l.x, l.z); out.push(`<circle cx="${x}" cy="${z}" r="2.4" fill="${l.dead ? '#555' : l.kind === 'tall' ? '#ffc890' : '#dfeaff'}"/>`); }
  out.push(`<polyline points="${TOWN.route.map(p => P(...p).join(',')).join(' ')}" fill="none" stroke="#ffd040" stroke-width="2.5" stroke-dasharray="6 4"/>`);
  const lab = (t, x, z, c = '#ffffff') => { const [px, pz] = P(x, z); out.push(`<text x="${px}" y="${pz}" fill="${c}" font-size="12">${esc(t)}</text>`); };
  lab('アーケード（約 68m）', 6, -40); lab('広場', -4, 0); lab('駅前通り（2 車線・歩道）', -40, 9); lab('信号・横断歩道', 13, 10); lab('コンビニ', 16, 24); lab('児童公園', -11, 22); lab('用水路', -2, 33); lab('祠', -6, 48); lab('自宅', 37, 53, '#3a2010'); lab('自宅の前の道（5m）', 16, 42); lab('用水路沿いの道（5m）', 14, 31); lab('裏路地へ（空き店舗の奥）', -30, -66);
}
out.push('<defs><pattern id="zebra" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="6" fill="#e8e6de"/></pattern></defs>');
out.push('</svg>');
writeFileSync(new URL('../docs/shinshoku/town_map.svg', import.meta.url), out.join('\n'));
console.log('docs/shinshoku/town_map.svg');
