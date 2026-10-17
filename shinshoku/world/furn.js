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
    /** 壁に付けた看板の金具（壁の面 wx,wz から外へ n＝[nx,nz] の向きに dist だけ出た看板を、上下 2 本の腕で支える） */
    bracket(wx, wz, n, y, dist, span = 0.6, color = 0x2a2a2e) {
      const alongX = Math.abs(n[0]) > 0.5;
      for (const dy of [-span / 2, span / 2]) B.box('prop', wx + n[0] * dist / 2, y + dy, wz + n[1] * dist / 2, alongX ? dist : 0.04, 0.04, alongX ? 0.04 : dist, color, { edges: false });
    },
  };
}
