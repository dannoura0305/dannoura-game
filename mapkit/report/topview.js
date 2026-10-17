// 上から見た図（SVG）：地形の陰影・道・建物・木・岩・小物・立入禁止・目的地・道案内の道。07 §7 の「上から見た図」。DOM・three.js なし。
// 北（+z）が上・東（+x）が右（地図仕様の「左下が 0,0」と同じ向き）。
import { encodePNG } from '../terrain/png.js';
import { obbCorners } from '../core/geom.js';

/** 陰影の PNG（RGB 8bit・1 升目 1 画素・行 0 が北の端） */
export async function hillshadePNG(hf, pathsMask = null) {
  const { nx, nz, cell } = hf, [lo, hi] = hf.extent(), px = new Uint8Array(nx * nz * 3), L = [-0.5, 0.75, 0.43];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = i * cell, z = j * cell, n = hf.normal(x, z), sh = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), t = (hf.at(x, z) - lo) / (hi - lo + 1e-9), s = hf.slopeDeg(x, z);
    let r = 70 + 60 * t, g = 92 + 50 * t, b = 60 + 40 * t; if (s > 35) { r = 120; g = 112; b = 104; }
    const k = ((nz - 1 - j) * nx + i) * 3; px[k] = Math.min(255, r * (0.35 + 0.85 * sh)); px[k + 1] = Math.min(255, g * (0.35 + 0.85 * sh)); px[k + 2] = Math.min(255, b * (0.35 + 0.85 * sh));
  }
  return encodePNG(nx, nz, px, { channels: 3 });
}
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(u8).toString('base64'); };

/** SVG の文字列。opt = { routes:[{id,pts}], scale: 3, title } */
export async function topViewSVG(layout, hf, opt = {}) {
  const [W, D] = layout.size, S = opt.scale || 3, X = x => (x * S).toFixed(1), Z = z => ((D - z) * S).toFixed(1), out = [];
  const poly = pts => pts.map(([x, z]) => `${X(x)},${Z(z)}`).join(' ');
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${D * S + 40}" viewBox="0 0 ${W * S} ${D * S + 40}" font-family="sans-serif">`);
  out.push(`<image href="data:image/png;base64,${b64(await hillshadePNG(hf))}" x="0" y="0" width="${W * S}" height="${D * S}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`);
  for (const s of layout.keepOut) {
    if (s.kind === 'path') continue;
    if (s.shape === 'circle') out.push(`<circle cx="${X(s.c[0])}" cy="${Z(s.c[1])}" r="${(s.r * S).toFixed(1)}" fill="none" stroke="#ffd060" stroke-dasharray="3 3" stroke-width="1"/>`);
    else if (s.shape === 'obb') out.push(`<polygon points="${poly(obbCorners(s.obb))}" fill="rgba(255,200,60,.25)" stroke="#ffc83c" stroke-width="1"/>`);
  }
  for (const p of layout.paths) out.push(`<polyline points="${p.points.map(q => `${X(q[0])},${Z(q[2])}`).join(' ')}" fill="none" stroke="#c8a878" stroke-width="${(p.width * S).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`);
  for (const b of layout.buildings) {
    out.push(`<polygon points="${poly(obbCorners(b.obb))}" fill="rgba(40,40,48,.35)" stroke="#222" stroke-width="1"/>`);
    for (const p of b.parts) if (p.collide && p.visible !== false) out.push(`<polygon points="${poly(obbCorners({ cx: p.c[0], cz: p.c[2], hx: p.size[0] / 2, hz: p.size[2] / 2, rot: (p.rotY || 0) * Math.PI / 180 }))}" fill="#eee" stroke="#333" stroke-width=".5"/>`);
  }
  for (const o of layout.objects) {
    if (o.cls === 'tree') out.push(`<circle cx="${X(o.at[0])}" cy="${Z(o.at[2])}" r="${(o.size[0] * S * 0.32).toFixed(1)}" fill="${/sugi/.test(o.kind) ? '#1f4a2a' : '#3e6a2c'}" opacity=".8"/>`);
    else if (o.cls === 'rock') out.push(`<circle cx="${X(o.at[0])}" cy="${Z(o.at[2])}" r="${(o.size[0] * S * 0.5).toFixed(1)}" fill="#8a8a8a" stroke="#444" stroke-width=".5"/>`);
    else out.push(`<polygon points="${poly(obbCorners({ cx: o.at[0], cz: o.at[2], hx: o.size[0] / 2, hz: o.size[2] / 2, rot: o.rotY * Math.PI / 180 }))}" fill="#a0603a"/>`);
  }
  const col = ['#ff4d6d', '#4dd2ff', '#ffe14d', '#b84dff', '#4dff88', '#ff9d4d'];
  (opt.routes || []).forEach((r, i) => out.push(`<polyline points="${r.pts.map(q => `${X(q[0])},${Z(q[2])}`).join(' ')}" fill="none" stroke="${col[i % col.length]}" stroke-width="1.6" stroke-dasharray="5 3"/>`));
  out.push(`<circle cx="${X(layout.start[0])}" cy="${Z(layout.start[2])}" r="6" fill="#fff" stroke="#000"/><text x="${+X(layout.start[0]) + 8}" y="${+Z(layout.start[2]) + 4}" font-size="12" fill="#fff" stroke="#000" stroke-width=".4">スタート</text>`);
  layout.goals.forEach((g, i) => out.push(`<circle cx="${X(g.at[0])}" cy="${Z(g.at[2])}" r="5" fill="${col[i % col.length]}" stroke="#000"/><text x="${+X(g.at[0]) + 7}" y="${+Z(g.at[2]) - 5}" font-size="11" fill="#fff" stroke="#000" stroke-width=".35">${g.id}</text>`));
  out.push(`<rect x="0" y="${D * S}" width="${W * S}" height="40" fill="#111"/><text x="8" y="${D * S + 25}" font-size="13" fill="#eee">${opt.title || layout.map}：種 ${layout.seed}・${layout.hash}・木 ${(layout.stats.counts.trees || 0)}・岩 ${(layout.stats.counts.rocks || 0)}・小物 ${(layout.stats.counts.props || 0)}・北が上（${W}×${D}m）</text>`);
  out.push('</svg>');
  return out.join('\n');
}
