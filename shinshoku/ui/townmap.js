// 町の地図（一時停止メニューの「地図」）：町全体の見取り図（data/town.js の MACRO）と、自宅のまわり〜商店街の詳しい図（TOWN）。
// 今いる区画を光らせ、商店街（住宅地を含む）にいる時は自分の位置と向きを描く。名前はすべて【仮】。
import { TOWN, MACRO, homeW } from '../data/town.js';

const COL = { rail: '#5a5068', arcade: '#c89ad8', alley: '#8a7aa8', mall: '#7ab0d0', gym: '#d0b070', hospital: '#e88a9a', under: '#5a6a7a', office: '#9ab0a0', lab: '#a070d0', admin: '#b080e0', home: '#ffc890', res: '#4a4060', shop: '#80c8a0' };

/** 町全体（左）＋自宅〜商店街（右）を canvas に描く。here：今の区画 id、pos：{x,z,yaw}（商店街の時だけ） */
export function drawTownMap(cv, here, pos) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = '#100a1c'; g.fillRect(0, 0, W, H);
  const half = W * 0.5;
  // ── 町全体 ──
  {
    const x0 = -260, x1 = 470, z0 = -450, z1 = 190, sc = Math.min((half - 30) / (x1 - x0), (H - 60) / (z1 - z0));
    const P = (x, z) => [16 + (x - x0) * sc, 40 + (z - z0) * sc];
    g.font = `bold ${Math.round(W / 46)}px sans-serif`; g.fillStyle = '#e8dcff'; g.fillText('町の見取り図（名前は仮）', 16, 26);
    for (const r of MACRO.roads) {
      g.strokeStyle = r.water ? '#2a4a7a' : r.rail ? '#8a809a' : '#5a5070'; g.lineWidth = Math.max(2, r.w * sc * (r.water ? 1 : 1.4)); g.setLineDash(r.rail ? [6, 4] : []);
      g.beginPath(); r.pts.forEach(([x, z], i) => { const [px, pz] = P(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke();
    }
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,208,64,.55)'; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); MACRO.bus.forEach(([x, z], i) => { const [px, pz] = P(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke(); g.setLineDash([]);
    g.font = `${Math.round(W / 70)}px sans-serif`;
    for (const d of MACRO.districts) {
      const [ax, az] = P(d.rect[0], d.rect[1]), [bx, bz] = P(d.rect[2], d.rect[3]), on = d.area === here && (here !== 'shotengai' || d.id === 'shotengai' || d.id === 'residential');
      g.fillStyle = COL[d.kind] || '#8a8a9a'; g.globalAlpha = d.kind === 'res' ? 0.6 : on ? 1 : 0.6; g.fillRect(ax, az, Math.max(5, bx - ax), Math.max(5, bz - az)); g.globalAlpha = 1;
      if (on && d.kind !== 'res') { g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(ax - 2, az - 2, Math.max(5, bx - ax) + 4, Math.max(5, bz - az) + 4); }
      const [lx, lz] = P(...(d.label || [d.rect[2], d.rect[1]]));
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, tw = g.measureText(d.name).width, tx = Math.max(16, Math.min(lx, half - 8 - tw));
      g.strokeStyle = 'rgba(200,188,224,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cz); g.lineTo(tx + Math.min(tw, Math.max(0, cx - tx)), lz - 4); g.stroke();
      g.fillStyle = on ? '#ffffff' : '#c8bce0'; g.fillText(d.name, tx, lz);
    }
    g.fillStyle = '#a89cc0'; g.fillText('北 ↑', half - 60, H - 14); g.fillText('━ バス通り（黄の点線）', 16, H - 14);
  }
  // ── 自宅〜商店街 ──
  {
    const B = TOWN.bounds, x0 = B.minX - 2, x1 = B.maxX + 2, z0 = -40, z1 = B.maxZ + 2, sc = Math.min((half - 30) / (x1 - x0), (H - 60) / (z1 - z0));
    const ox = half + 14, P = (x, z) => [ox + (x - x0) * sc, 40 + (z - z0) * sc];
    g.font = `bold ${Math.round(W / 46)}px sans-serif`; g.fillStyle = '#e8dcff'; g.fillText('自宅〜あけぼの通り商店街', ox, 26);
    const R = (r, c) => { const [ax, az] = P(r[0], Math.max(z0, r[1])), [bx, bz] = P(r[2], r[3]); if (bz > az) { g.fillStyle = c; g.fillRect(ax, az, bx - ax, bz - az); } };
    for (const L of TOWN.lots) R(L.rect, L.kind === 'home' ? '#6a4a3a' : L.kind === 'konbini' ? '#3a6a5a' : L.kind === 'parking' ? '#3a3448' : '#2a2238');
    R([-10.5, -72, 10.5, -4], '#3a2a48'); R([-4.5, -72, 4.5, -4], '#c8a8e0');
    R([TOWN.channel.x0, TOWN.channel.z0, TOWN.channel.x1, TOWN.channel.z1], '#2a5a9a');
    for (const w of TOWN.walk) R(w.rect, { main: '#6a5a88', sidewalk: '#8a7aa8', lane: '#7a6a98', forecourt: '#a890c8', park: '#4a7a5a', nook: '#7a6a5a', yard: '#9a7a6a', parking: '#5a5070', bridge: '#8a7aa8' }[w.kind] || '#7a6a98');
    const hh = [...homeW(-6, 6), ...homeW(6, 16)]; R(hh, '#ffc890');
    // 道のり（自宅 → アーケード）
    g.strokeStyle = '#ffd040'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); TOWN.route.forEach(([x, z], i) => { const [px, pz] = P(x, z); if (i) g.lineTo(px, pz); else g.moveTo(px, pz); }); g.stroke(); g.setLineDash([]);
    g.font = `${Math.round(W / 70)}px sans-serif`; g.fillStyle = '#ffffff';
    const lab = (t, x, z) => { const [px, pz] = P(x, z); g.fillText(t, px, pz); };
    lab('商店街（アーケード）', 6, -30); lab('広場', -4, 0); lab('駅前通り', -40, 9); lab('信号', 13, 10); lab('コンビニ', 16, 24); lab('児童公園', -11, 22); lab('用水路', -2, 34); lab('祠', -6, 47); lab('自宅', 37, 53); lab('自宅の前の道', 20, 42);
    if (pos) {
      const [px, pz] = P(pos.x, pos.z); g.save(); g.translate(px, pz); g.rotate(Math.PI - pos.yaw); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
      g.strokeStyle = '#ff9ac8'; g.lineWidth = 2; g.beginPath(); g.arc(px, pz, 12, 0, Math.PI * 2); g.stroke();
    }
  }
}
