// 境界侵食 P13：家具・店の表の小さな部品（脚のある椅子・ベンチ・机・腰掛け・カウンター・壁に付けた看板の金具）。
// 形は Builder（world/level.js）の箱・円柱へ入れる＝材質ごとにまとめる網に入る（描画呼び出しは増えない）。
// どの家具も「地面に脚が着く」「背もたれは柱で座面につながる」：tools/shinshoku/audit_env.mjs の点検（浮き・脚の無い家具）を通る形。
import * as THREE from 'three';

/** B：Builder（box・add）。戻り値の関数は世界の座標と Y の回転（ry：+z を 0）で置く */
export function furnKit(B) {
  const loc = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  const bx = (at, ry, y0 = 0) => (key, lx, y, lz, w, h, d, color, opt = {}) => { const [px, pz] = at(lx, lz); return B.box(key, px, y + y0, pz, w, h, d, color, Object.assign({ ry, edges: false }, opt)); };
  const cyl = (key, x, y, z, r0, r1, h, color, seg = 12) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return B.add(key, g, color); };
  return {
    /** 椅子（座る人は +z を向く・背は −z）。o.h：座面の高さ（既定 0.45） */
    chair(x, z, ry, color = 0x6a5a4a, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), h = o.h || 0.45, w = o.w || 0.42, leg = o.leg || 0x2e2c30, t = 0.04;
      b('prop', 0, h - t / 2, 0, w, t, w, color);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b('prop', sx * (w / 2 - 0.03), (h - t) / 2, sz * (w / 2 - 0.03), 0.035, h - t, 0.035, leg);
      for (const sx of [-1, 1]) b('prop', sx * (w / 2 - 0.03), h + 0.22, -(w / 2 - 0.03), 0.035, 0.44, 0.035, leg);
      b('prop', 0, h + 0.3, -(w / 2 - 0.03), w, 0.24, 0.03, color);
    },
    /** 丸い腰掛け（カウンター・屋台）。脚 3 本と足かけの輪 */
    stool(x, z, color = 0x8a3a2a, h = 0.68) {
      cyl('prop', x, h - 0.03, z, 0.17, 0.17, 0.06, color, 14);
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; B.box('prop', x + Math.sin(a) * 0.1, (h - 0.06) / 2, z + Math.cos(a) * 0.1, 0.03, h - 0.06, 0.03, 0x2a2a2e, { edges: false }); }
      cyl('prop', x, 0.25, z, 0.12, 0.12, 0.03, 0x3a3a3e, 10);
    },
    /** ベンチ（長さ len・座る人は +z を向く）。o.back：背もたれ・o.tile：板の絵・o.y0：床の高さ（電停の島など） */
    bench(x, z, ry, len = 1.6, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), h = o.h || 0.44, d = o.d || 0.4, col = o.color ?? 0xffffff, leg = o.leg || 0x34343a, tile = o.tile === undefined ? 'wood' : o.tile;
      const plank = tile ? { tile, ts: 1 } : {};
      b(tile ? 'tex' : 'prop', 0, h - 0.025, 0, len, 0.05, d, col, plank);
      for (const s of [-1, 1]) {
        b('prop', s * (len / 2 - 0.16), (h - 0.05) / 2, 0, 0.05, h - 0.05, d - 0.06, leg);
        b('prop', s * (len / 2 - 0.16), 0.02, 0, 0.08, 0.04, d - 0.02, leg);
      }
      if (o.back) {
        for (const s of [-1, 1]) b('prop', s * (len / 2 - 0.16), h + 0.22, -d / 2 + 0.03, 0.05, 0.44, 0.05, leg);
        b(tile ? 'tex' : 'prop', 0, h + 0.3, -d / 2 + 0.03 - 0.035, len, 0.24, 0.04, col, plank);
      }
    },
    /** 四角い机（w×d・高さ h）：天板と脚 4 本 */
    table(x, z, ry, w = 1.2, d = 0.75, h = 0.72, color = 0x9a6a44, leg = 0x4a3a2e) {
      const b = bx(loc(x, z, ry), ry);
      b('prop', 0, h - 0.025, 0, w, 0.05, d, color);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b('prop', sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06), 0.05, h - 0.05, 0.05, leg);
    },
    /** 丸い机：天板・柱・十字の脚 */
    roundTable(x, z, r = 0.55, h = 0.74, color = 0xd8d4cc, leg = 0x3a3a3e) {
      cyl('prop', x, h - 0.025, z, r, r, 0.05, color, 16);
      B.box('prop', x, (h - 0.05) / 2, z, 0.07, h - 0.05, 0.07, leg, { edges: false });
      B.box('prop', x, 0.02, z, r * 1.1, 0.04, 0.08, leg, { edges: false }); B.box('prop', x, 0.02, z, 0.08, 0.04, r * 1.1, leg, { edges: false });
    },
    // ───── 自宅の家具（モデルハウスの配置用）：どれも床に着く台か脚の上に乗る。ry：家具の「前」（座る人・扉の向き）が +z を 0 とした向き ─────
    /** ソファ（長さ len・座る人は前を向く）：脚・座の台・座面のクッション・背・肘・置いたクッション */
    sofa(x, z, ry, len = 2.2, color = 0x6a6a7a, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), D = o.d || 0.9, cush = o.cushion ?? 0x7c7c8c;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b('prop', sx * (len / 2 - 0.08), 0.05, sz * (D / 2 - 0.08), 0.05, 0.1, 0.05, 0x2a2420);
      b('prop', 0, 0.22, 0, len, 0.24, D, color);                                                   // 座の台
      const n = Math.max(2, Math.round((len - 0.4) / 0.62)), cw = (len - 0.4) / n;
      for (let k = 0; k < n; k++) b('prop', -len / 2 + 0.2 + cw * (k + 0.5), 0.4, 0.06, cw - 0.03, 0.12, D - 0.32, cush);   // 座面のクッション
      b('prop', 0, 0.62, -D / 2 + 0.13, len, 0.56, 0.26, color);                                     // 背
      for (const sx of [-1, 1]) b('prop', sx * (len / 2 - 0.1), 0.47, 0, 0.2, 0.26, D, color);       // 肘
      for (const [dx, c] of o.pillows || [[-len / 2 + 0.42, 0xe8c070], [len / 2 - 0.42, 0xd8a0b0]]) b('prop', dx, 0.65, -D / 2 + 0.36, 0.4, 0.38, 0.12, c, { rx: 0.18 });
    },
    /** ベッド（幅 w・長さ L）：頭は −z（枕）。脚・枠・マットレス・掛け布団（足もとへ折り返し）・枕・頭の板 */
    bed(x, z, ry, w = 1.4, L = 2.05, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), fr = o.frame ?? 0xb08a64, duvet = o.duvet ?? 0x8a9ab8;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b('prop', sx * (w / 2 - 0.05), 0.08, sz * (L / 2 - 0.05), 0.06, 0.16, 0.06, 0x5a4030);
      b('tex', 0, 0.22, 0, w, 0.12, L, fr, { tile: 'wood', ts: 1 });
      b('prop', 0, 0.37, 0, w - 0.04, 0.18, L - 0.04, 0xf4f0ea);                                     // マットレス
      b('prop', 0, 0.475, 0.22, w + 0.02, 0.05, L - 0.48, duvet);                                     // 掛け布団
      b('prop', 0, 0.505, -0.06, w + 0.03, 0.03, 0.34, o.fold ?? 0xe8e4f0);                           // 折り返し
      const np = w > 1.2 ? 2 : 1; for (let k = 0; k < np; k++) b('prop', np === 1 ? 0 : (k - 0.5) * (w / 2), 0.52, -L / 2 + 0.26, np === 1 ? w * 0.6 : w / 2 - 0.1, 0.12, 0.34, 0xffffff);
      b('tex', 0, 0.55, -L / 2 - 0.03, w + 0.08, 1.1, 0.06, fr, { tile: 'wood', ts: 1 });              // 頭の板（床に着く）
    },
    /** 箱の家具（棚・たんす・収納）：台輪の上の箱・前の扉の線と取っ手。o.doors：扉の数・o.drawers：引き出しの段・o.glass：上の段がガラス */
    cabinet(x, z, ry, w = 1.2, h = 0.8, d = 0.45, color = 0xc8a880, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), line = o.line ?? 0x6a5040;
      b('prop', 0, 0.04, -0.02, w - 0.04, 0.08, d - 0.06, 0x3a2e26);                                  // 台輪
      b('tex', 0, 0.08 + (h - 0.08) / 2, 0, w, h - 0.08, d, color, { tile: o.tile || 'wood', ts: 1 });
      const dr = o.drawers || 0, nd = o.doors ?? Math.max(1, Math.round(w / 0.5));
      if (dr) for (let k = 1; k < dr; k++) b('prop', 0, 0.08 + (h - 0.08) * k / dr, d / 2 + 0.005, w - 0.04, 0.012, 0.01, line);
      else for (let k = 1; k < nd; k++) b('prop', -w / 2 + w * k / nd, 0.08 + (h - 0.08) / 2, d / 2 + 0.005, 0.012, h - 0.12, 0.01, line);
      const hy = dr ? null : 0.08 + (h - 0.08) * (h > 1.2 ? 0.45 : 0.75);
      if (dr) for (let k = 0; k < dr; k++) b('prop', 0, 0.08 + (h - 0.08) * (k + 0.5) / dr, d / 2 + 0.015, Math.min(0.3, w * 0.3), 0.025, 0.02, 0xb8bcc0);
      else for (let k = 0; k < nd; k++) b('prop', -w / 2 + w * (k + 0.5) / nd + (k % 2 ? -1 : 1) * (w / nd / 2 - 0.07), hy, d / 2 + 0.015, 0.02, Math.min(0.22, h * 0.3), 0.02, 0xb8bcc0);
      if (o.glass) b('texglow', 0, 0.08 + (h - 0.08) * 0.72, d / 2 + 0.006, w - 0.1, (h - 0.08) * 0.42, 0.01, 0xb0b8c0, { tile: 'shopglass', ts: 1 });
    },
    /** 本棚（前が開いた棚・本と小物） */
    bookshelf(x, z, ry, w = 0.9, h = 1.8, d = 0.32, color = 0xc8a880, o = {}) {
      const b = bx(loc(x, z, ry), ry, o.y0 || 0), n = Math.max(2, Math.round(h / 0.38)), cols = o.books || [0xc06070, 0x6080c0, 0xd0b050, 0x5a8a5a, 0xe8e0d0, 0x8a6a9a];
      b('tex', 0, h / 2, -d / 2 + 0.01, w, h, 0.02, color, { tile: 'wood', ts: 1 });                 // 背板
      for (const sx of [-1, 1]) b('tex', sx * (w / 2 - 0.01), h / 2, 0, 0.02, h, d, color, { tile: 'wood', ts: 1 });
      for (let k = 0; k <= n; k++) b('prop', 0, k === 0 ? 0.04 : Math.min(h - 0.01, k * h / n), 0, w - 0.04, k === 0 ? 0.08 : 0.02, d - 0.02, color);
      let seed = Math.abs(Math.round(x * 31 + z * 17)) % 97;
      for (let k = 0; k < n; k++) { let u = -w / 2 + 0.04; const y0 = k === 0 ? 0.08 : k * h / n + 0.01, room = h / n - 0.06;
        while (u < w / 2 - (k % 2 ? 0.3 : 0.1)) { seed = (seed * 37 + 11) % 97; const bw = 0.025 + (seed % 4) * 0.008, bh = Math.min(room, 0.18 + (seed % 5) * 0.025); b('prop', u + bw / 2, y0 + bh / 2, 0.01, bw, bh, d * 0.7, cols[seed % cols.length]); u += bw + 0.004; }
        if (k % 2) b('prop', w / 2 - 0.16, y0 + 0.06, 0, 0.12, 0.12, 0.12, [0xe8e4dc, 0x7a9a8a, 0xc8a070][k % 3]); }
    },
    /** 流し台の列（長さ L・奥行 0.65・高さ 0.85）：台輪・扉・天板・シンク・水栓・こんろ（右寄り）。o.hob：こんろの位置（左端からの m）・o.sink */
    kitchenRun(x, z, ry, L = 2.55, o = {}) {
      const b = bx(loc(x, z, ry), ry), d = 0.65, h = 0.85, body = o.color ?? 0xf0ece4;
      b('prop', 0, 0.05, -0.04, L - 0.02, 0.1, d - 0.1, 0x3a3a3c);
      b('prop', 0, 0.1 + (h - 0.14) / 2, 0, L, h - 0.14, d, body);
      const nd = Math.round(L / 0.6); for (let k = 1; k < nd; k++) b('prop', -L / 2 + L * k / nd, 0.45, d / 2 + 0.005, 0.01, 0.64, 0.01, 0xb8b4ac);
      for (let k = 0; k < nd; k++) b('prop', -L / 2 + L * (k + 0.5) / nd, 0.74, d / 2 + 0.012, 0.36, 0.02, 0.02, 0x9a9ea2);
      b('prop', 0, h - 0.02, 0.01, L + 0.02, 0.04, d + 0.02, o.top ?? 0x8a8a88);                      // 天板
      const su = -L / 2 + (o.sink ?? 0.7), hu = -L / 2 + (o.hob ?? L - 0.55);
      b('prop', su, h + 0.003, 0.03, 0.62, 0.006, 0.42, 0x3a3e44);                                       // シンク（天板の上の黒い縁）
      b('prop', su, h + 0.15, -d / 2 + 0.1, 0.04, 0.3, 0.04, 0xc8ccd0); b('prop', su, h + 0.29, -d / 2 + 0.2, 0.04, 0.04, 0.2, 0xc8ccd0);   // 水栓
      b('prop', hu, h + 0.005, 0.02, 0.6, 0.01, 0.5, 0x1a1a1e);                                         // こんろ（IH の黒い板）
      for (const [du, dv] of [[-0.14, 0.1], [0.14, 0.1], [0, -0.12]]) b('prop', hu + du, h + 0.012, 0.02 + dv, 0.18, 0.004, 0.18, 0x3a3a40);
      return { su, hu, h, d };
    },
    /** 壁に付けた吊り戸棚（奥の面 ＝ 壁に着ける・下端の高さ y0） */
    wallCabinet(x, z, ry, L = 2.5, y0 = 1.5, h = 0.7, d = 0.35, color = 0xf0ece4) {
      const b = bx(loc(x, z, ry), ry); b('prop', 0, y0 + h / 2, 0, L, h, d, color);
      const nd = Math.round(L / 0.5); for (let k = 1; k < nd; k++) b('prop', -L / 2 + L * k / nd, y0 + h / 2, d / 2 + 0.005, 0.01, h - 0.04, 0.01, 0xb8b4ac);
      b('glow', 0, y0 - 0.006, 0.05, L - 0.2, 0.012, 0.06, 0xfff2dc);                                  // 手元の灯り（棚の下に付く）
    },
    /** 冷蔵庫（扉は前） */
    fridge(x, z, ry, w = 0.68, h = 1.82, d = 0.68, color = 0xe8eaec) {
      const b = bx(loc(x, z, ry), ry); b('prop', 0, h / 2, 0, w, h, d, color);
      b('prop', 0, h * 0.62, d / 2 + 0.005, w - 0.02, 0.012, 0.01, 0xa0a4a8);
      for (const y of [h * 0.8, h * 0.4]) b('prop', w / 2 - 0.08, y, d / 2 + 0.02, 0.03, 0.3, 0.03, 0xa0a4a8);
    },
    /** 吊った灯り（天井 ceil から下げた笠：先 y） */
    pendant(x, z, y, ceil, color = 0xfff0d8, shade = 0xe8e0d0, r = 0.2) {
      B.box('prop', x, (y + ceil) / 2 + 0.1, z, 0.012, ceil - y - 0.2, 0.012, 0x2a2a2e, { edges: false });
      cyl('prop', x, ceil - 0.02, z, 0.06, 0.06, 0.04, 0xf0ece4, 10);
      cyl('prop', x, y + 0.1, z, r * 0.35, r, 0.2, shade, 16); cyl('glow', x, y - 0.005, z, r * 0.9, r * 0.9, 0.01, color, 16);
    },
    /** 洗濯機（ドラム：前が丸い窓） */
    washer(x, z, ry) { const b = bx(loc(x, z, ry), ry); b('tex', 0, 0.45, 0, 0.6, 0.9, 0.62, 0xf0f0f0, { tile: 'panel', ts: 1 }); b('prop', 0, 0.48, 0.315, 0.36, 0.36, 0.01, 0x7a8a9a); b('prop', 0, 0.82, 0.315, 0.5, 0.08, 0.01, 0x3a3e44); },
    /** 洗面台（台・鉢・水栓・壁の鏡は別） */
    vanity(x, z, ry, w = 0.75) { const b = bx(loc(x, z, ry), ry); b('prop', 0, 0.04, -0.02, w - 0.04, 0.08, 0.5, 0x3a3a3c); b('tex', 0, 0.44, 0, w, 0.72, 0.55, 0xf4f2ee, { tile: 'panel', ts: 1 }); b('prop', 0, 0.82, 0.01, w + 0.02, 0.04, 0.57, 0xf8f8f8); b('prop', 0, 0.843, 0.04, w * 0.6, 0.006, 0.36, 0xd8e0e8); b('prop', 0, 0.94, -0.2, 0.04, 0.2, 0.04, 0xc8ccd0); },
    /** トイレ（便器・タンク：後ろの壁に着く） */
    toilet(x, z, ry) { const b = bx(loc(x, z, ry), ry); b('prop', 0, 0.2, 0.05, 0.36, 0.4, 0.5, 0xf8f8f6); b('prop', 0, 0.41, 0.07, 0.38, 0.03, 0.48, 0xf0f0ee); b('prop', 0, 0.62, -0.2, 0.42, 0.42, 0.18, 0xf8f8f6); b('prop', 0, 0.2, -0.2, 0.2, 0.4, 0.16, 0xf0f0ee); },
    /** 浴槽（縁・湯） */
    bathtub(x, z, ry, w = 1.4, d = 0.75) { const b = bx(loc(x, z, ry), ry); b('prop', 0, 0.28, 0, w, 0.56, d, 0xf4f4f2); b('prop', 0, 0.565, 0, w - 0.12, 0.01, d - 0.12, 0x9ac8d8); },
    /** 座卓（低い机）・座布団 */
    zataku(x, z, ry, w = 1.2, d = 0.75, color = 0x7a4a2a) { const b = bx(loc(x, z, ry), ry); b('prop', 0, 0.33, 0, w, 0.05, d, color); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b('prop', sx * (w / 2 - 0.08), 0.155, sz * (d / 2 - 0.08), 0.06, 0.31, 0.06, 0x5a3a20); },
    zabuton(x, z, ry, color = 0x8a3a4a) { B.box('prop', x, 0.075, z, 0.55, 0.07, 0.55, color, { ry, edges: false }); },
    /** 壁の額（絵・写真）：壁の面 wx,wz・外向き n（[nx,nz]）・中の色 */
    frame(wx, wz, n, y, w, h, inner = 0x6a8ab8, color = 0x3a3030) {
      const ax = Math.abs(n[0]) > 0.5; B.box('prop', wx + n[0] * 0.015, y, wz + n[1] * 0.015, ax ? 0.03 : w, h, ax ? w : 0.03, color, { edges: false });
      B.box('prop', wx + n[0] * 0.032, y, wz + n[1] * 0.032, ax ? 0.004 : w - 0.08, h - 0.08, ax ? w - 0.08 : 0.004, inner, { edges: false });
    },
    /** 壁の時計（丸） */
    clock(wx, wz, n, y, r = 0.15) { const g = new THREE.CylinderGeometry(r, r, 0.04, 20); g.rotateX(Math.PI / 2); if (Math.abs(n[0]) > 0.5) g.rotateY(Math.PI / 2); g.translate(wx + n[0] * 0.02, y, wz + n[1] * 0.02); B.add('prop', g, 0xf4f2ee); B.box('prop', wx + n[0] * 0.045, y + 0.04, wz + n[1] * 0.045, 0.012, 0.09, 0.012, 0x1a1a1e, { edges: false }); },
    /** 壁の面の巾木（床の上・壁に沿う） */
    baseboard(x0, z0, x1, z1, n, color = 0x6a5040) { const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0); B.box('prop', (x0 + x1) / 2 + n[0] * 0.006, 0.08, (z0 + z1) / 2 + n[1] * 0.006, ax ? Math.abs(x1 - x0) : 0.012, 0.08, ax ? 0.012 : Math.abs(z1 - z0), color, { edges: false }); },
    /** 壁に付けた看板の金具（壁の面 wx,wz から外へ n＝[nx,nz] の向きに dist だけ出た看板を、上下 2 本の腕で支える） */
    bracket(wx, wz, n, y, dist, span = 0.6, color = 0x2a2a2e) {
      const alongX = Math.abs(n[0]) > 0.5;
      for (const dy of [-span / 2, span / 2]) B.box('prop', wx + n[0] * dist / 2, y + dy, wz + n[1] * dist / 2, alongX ? dist : 0.04, 0.04, alongX ? 0.04 : dist, color, { edges: false });
    },
  };
}
