// 境界侵食 P13：店の表と浅い店の中（看板の後ろに本当の店があるように）。
// 利用者の指摘「おでん屋と書かれた看板があるが何もない空間」への直し：名前の看板の下に、戸口・のれん・赤ちょうちん・窓と、
// 戸口から見える店の中（カウンター・腰掛け・おでんの鍋・焼き台・棚・品書き・天井の灯り）を作る。
// 形はすべて Builder の箱（材質ごとにまとめる網）＝描画呼び出しは増えない（三角形は 1 軒 約 1〜2 千）。
// 種類：oden（おでん）・yakitori（焼き鳥）・tachinomi（立ち飲み）・snack（スナック）・kissa（喫茶）・izakaya（居酒屋）
import * as THREE from 'three';
import { furnKit } from './furn.js';

const NOREN = { oden: '#2a3a5a', yakitori: '#5a1a14', tachinomi: '#1a3a2a', snack: '#4a1a3a', kissa: '#3a2a1a', izakaya: '#3a1a1a' };
const MENU = {
  oden: ['おでん　大根　玉子　ちくわ', '牛すじ　こんにゃく　がんも', '熱燗　一合'],
  yakitori: ['焼き鳥　ねぎま　つくね', '皮　ぼんじり　手羽先', '生ビール　ハイボール'],
  tachinomi: ['立ち飲み　一杯から', '冷や奴　枝豆　煮込み', 'ホッピー　酎ハイ'],
  snack: ['カラオケ', 'ボトルキープ', 'ご新規さま歓迎'],
  kissa: ['ブレンド　ナポリタン', 'ホットケーキ　クリームソーダ', 'モーニング'],
  izakaya: ['本日のおすすめ', '刺身　焼き魚　揚げ出し', '地酒あります'],
};

/**
 * K = { B, signUV, halos, wet, pool }。戻り値 unit(rect, face, kind, name, opt)：区画の中（rect＝[x0,z0,x1,z1]・face＝表の向き N/S/E/W）に、
 * 間口 W・奥行き D の小さな 2 階建ての店を作る。表の面は区画の表の縁（v＝0）。opt.seed：色の変化・opt.lit：灯り（既定 true）
 */
export function shopKit(K) {
  const { B, signUV, halos, wet, pool, lights } = K;   // K.steam：湯気の出る所（render/steam.js）
  const FK = furnKit(B);
  function frame(rect, f) {
    const [x0, z0, x1, z1] = rect;
    const W = f === 'N' || f === 'S' ? x1 - x0 : z1 - z0, D = f === 'N' || f === 'S' ? z1 - z0 : x1 - x0;
    const at = (u, v) => f === 'N' ? [x0 + u, z0 + v] : f === 'S' ? [x1 - u, z1 - v] : f === 'E' ? [x1 - v, z0 + u] : [x0 + v, z1 - u];
    const out = f === 'N' ? [0, -1] : f === 'S' ? [0, 1] : f === 'E' ? [1, 0] : [-1, 0];
    const alongX = f === 'N' || f === 'S';
    const ry = f === 'N' ? Math.PI : f === 'S' ? 0 : f === 'E' ? Math.PI / 2 : -Math.PI / 2;      // 表（外）を向く Y の回転（+z を 0）
    const box = (key, u, v, y, a, b, h, color, tile, opt = {}) => { const [x, z] = at(u, v); return B.box(key, x, y, z, alongX ? a : b, h, alongX ? b : a, color, Object.assign({ tile, edges: false }, opt)); };
    const face = f === 'N' ? 5 : f === 'S' ? 4 : f === 'E' ? 0 : 1;                                  // 看板の絵の面（外向き）
    const faceIn = f === 'N' ? 4 : f === 'S' ? 5 : f === 'E' ? 1 : 0;                                // 店の中から見る面（奥の壁の品書き）
    return { W, D, at, out, alongX, box, ry, face, faceIn };
  }
  const rng = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
  /** 縦の板の看板（両面）：表の面に垂直に出す（袖看板）か、表の面に平行（along＝true：提灯の字）。字は縦書き（signDraw の vertical） */
  const vsign = (F, text, u, v, y, w, h, style, along = false, both = true) => {
    const uv = signUV(text, Object.assign({ vertical: true, aspect: +(w / h).toFixed(3) }, style)), [x, z] = F.at(u, v);
    for (const side of both ? [1, -1] : [1]) {
      const g = new THREE.PlaneGeometry(w, h), A = g.attributes.uv;
      for (let i = 0; i < A.count; i++) { const sx = A.getX(i), ty = A.getY(i); A.setXY(i, uv.u0 + (uv.u1 - uv.u0) * (1 - ty), uv.v0 + (uv.v1 - uv.v0) * sx); }
      // 面の向き：along＝表の外向き（提灯）／さもなくば表に沿う向き（±）
      const n = along ? F.out : (F.alongX ? [side, 0] : [0, side]);
      g.rotateY(Math.atan2(n[0], n[1])); const off = along ? 0 : 0.031 * side;
      g.translate(x + (F.alongX && !along ? off : 0), y, z + (!F.alongX && !along ? off : 0)); B.add('sign', g, 0xffffff, false);
    }
    return [x, z];
  };
  const sign = (F, text, u, v, y, w, h, d, style, inward = false) => { const uv = signUV(text, style); const [x, z] = F.at(u, v); B.box('sign', x, y, z, F.alongX ? w : d, h, F.alongX ? d : w, 0xffffff, { uv, face: inward ? F.faceIn : F.face, edges: false }); return [x, z]; };

  function unit(rect, f, kind, name, opt = {}) {
    const F = frame(rect, f), r = rng(opt.seed || 7), W = F.W, D = Math.min(F.D, opt.depth || 4.2), H1 = 2.8, H2 = opt.h2 ?? 2.3, H = H1 + H2, t = 0.14;
    const tints = [0x8a6a50, 0x9a7a5a, 0x6a5444, 0xa08870, 0x7a6a5e], tint = opt.tint ?? tints[Math.floor(r() * tints.length)];
    const wallT = opt.wall || ['wood', 'wood', 'mortar', 'siding'][Math.floor(r() * 4)];
    const lit = opt.lit !== false, snack = kind === 'snack', P0 = 0.22, OH = 2.12;                    // P0：表の両端の柱の幅・OH：開口の高さ
    const warm = snack ? 0xc890b0 : 0xd8b088, label = name.replace(/（仮）/, '');
    const tex = (u, v, y, a, b, h, color, tile, o) => F.box('tex', u, v, y, a, b, h, color, tile, Object.assign({ ts: 2 }, o || {}));
    const add = (key, g, color, u, v, y) => { const [x, z] = F.at(u, v); g.translate(x, y, z); return B.add(key, g, color); };
    // P14：表は「柱・格子の窓・広い戸口・寄せた戸」。戸口と窓の格子から、明るい店の中（カウンター・鍋・品書き・棚）が見える。
    const wU1 = Math.min(1.4, W * 0.34), dU0 = wU1, dU1 = W - 1.0, dw = dU1 - dU0, dU = (dU0 + dU1) / 2;     // 窓 u P0..wU1・戸口 dU0..dU1・寄せた戸 dU1..W−P0
    // ── 外の殻 ──
    for (const u of [P0 / 2, W - P0 / 2]) tex(u, t / 2, H1 / 2, P0, t, H1, tint, wallT);                      // 表の両端の柱
    tex(W / 2, t / 2, (OH + H1) / 2, W - 2 * P0, t, H1 - OH, tint, wallT);                                   // 開口の上（幕板）
    tex((P0 + wU1) / 2, t / 2, 0.42, wU1 - P0, t, 0.84, tint, 'wood');                                        // 窓の下の腰板
    for (const u of [t / 2, W - t / 2]) tex(u, D / 2, H1 / 2, t, D, H1, tint, wallT);                        // 横
    tex(W / 2, D - t / 2, H1 / 2, W, t, H1, tint, wallT);                                                     // 奥
    tex(W / 2, D / 2, H1 + H2 / 2, W, D, H2, tint, wallT, { ao: false });                                     // 2 階（詰まった箱）
    F.box('prop', W / 2, D / 2, H + 0.08, W + 0.12, D + 0.12, 0.16, 0x3a3634);                               // 屋上の縁
    F.box(lit ? 'texglow' : 'tex', W / 2, D / 2, H1 - 0.1, W - 2 * t, D - 2 * t, 0.2, lit ? 0x9a8a78 : 0xe8e4dc, 'ceiling', { ts: 1.2 });   // 1 階の天井（灯りの色）
    F.box('tex', W / 2, D / 2, 0.01, W - 2 * t, D - 2 * t, 0.02, 0xffffff, kind === 'kissa' || snack ? 'woodfloor' : 'concrete', { ts: 1.5 });
    // 店の中の壁の内側（灯りに照らされた漆喰：自ら光る絵＝灯りの数に関係なく明るく見える）
    if (lit) {
      F.box('texglow', W / 2, D - t - 0.011, 1.4, W - 2 * t - 0.02, 0.02, 2.6, warm, 'plaster', { ts: 1.5 });
      for (const u of [t + 0.011, W - t - 0.011]) F.box('texglow', u, D / 2 + 0.1, 1.4, 0.02, D - 2 * t - 0.4, 2.6, warm, 'plaster', { ts: 1.5 });
      F.box('texglow', W / 2, t + 0.011, (OH + H1 - 0.2) / 2, W - 2 * P0 - 0.02, 0.02, H1 - 0.2 - OH, warm, 'plaster', { ts: 1.5 });
    }
    // ── 格子の窓（向こうが見える細い桟）・窓台・鴨居 ──
    tex((P0 + wU1) / 2, t / 2, (2.0 + OH) / 2, wU1 - P0, t, OH - 2.0, 0x4a3424, 'wood');                       // 窓の上の鴨居（開口の上と同じ面）
    F.box('prop', (P0 + wU1) / 2, -0.02, 0.87, wU1 - P0 + 0.06, 0.2, 0.05, 0x4a3a2a);                          // 窓台
    if (!snack) { const nb = Math.max(4, Math.round((wU1 - P0) / 0.09)); for (let i = 0; i <= nb; i++) F.box('prop', P0 + (wU1 - P0) * i / nb, 0.03, 1.45, 0.025, 0.035, 1.1, 0x3a2818); F.box('prop', (P0 + wU1) / 2, 0.03, 1.45, wU1 - P0, 0.035, 0.03, 0x3a2818); }
    else F.box(lit ? 'texglow' : 'tex', (P0 + wU1) / 2, 0.06, 1.45, wU1 - P0, 0.04, 1.1, lit ? 0xc890b0 : 0x8a7a8a, 'win_curtain', { fit: true });   // スナック：カーテンの窓
    // ── 戸口：敷居・枠・寄せた格子戸（2 枚・重ねて右へ）・のれん ──
    F.box('prop', dU, t / 2, 0.02, dw, t + 0.02, 0.04, 0x6a6a68);
    for (const u of [dU0 + 0.03, dU1 - 0.03]) F.box('prop', u, t / 2, OH / 2, 0.06, t + 0.03, OH, 0x2a1c12);
    F.box('prop', dU, t / 2, OH - 0.03, dw, t + 0.03, 0.06, 0x2a1c12);
    for (const [k, v] of [[0, t * 0.35], [1, t * 0.7]]) F.box(lit ? 'texglow' : 'tex', W - P0 - 0.4 - k * 0.04, v, 1.02, 0.78, 0.035, 1.98, lit ? 0xd8c0a0 : 0x8a7a68, lit ? 'koshi_lit' : 'koshi', { fit: true });
    if (snack) F.box(lit ? 'texglow' : 'tex', dU, t * 0.5, 1.02, dw - 0.1, 0.035, 1.98, lit ? 0xd8a0c0 : 0x8a7a88, lit ? 'win_shoji' : 'win_dark', { fit: true });   // スナック：閉じたすりガラスの戸（灯り）
    F.box('prop', dU, -0.06, OH - 0.06, dw + 0.2, 0.04, 0.04, 0x3a2a1a);                                      // のれんの竿
    for (const s of [-1, 1]) F.box('prop', dU + s * (dw / 2 + 0.06), -0.03, OH - 0.06, 0.04, 0.06, 0.06, 0x3a2a1a);
    if (!snack) { const nw = dw + 0.1; sign(F, label, dU, -0.07, OH - 0.27, nw, 0.4, 0.02, { bg: NOREN[kind] || '#2a2a3a', fg: '#f4ecdc', size: 46, serif: true, frame: false });
      for (const k of [-1, 1]) F.box('prop', dU + k * nw / 6, -0.085, OH - 0.33, 0.025, 0.012, 0.28, 0x101014); }   // のれん（切れ目の線）
    else sign(F, label, dU, -0.02, OH + 0.33, dw * 0.7, 0.32, 0.02, { bg: '#2a0a24', fg: '#ff9ad8', size: 40 });   // スナック：戸の上の小さな看板
    // ── 2 階の窓・下屋（ひさし）・名前の看板 ──
    F.box(lit && r() < 0.6 ? 'texglow' : 'tex', W / 2, -0.02, H1 + 1.15, Math.min(1.8, W - 1), 0.04, 0.9, 0xc8b8a0, lit && r() < 0.6 ? 'win_lit' : 'win_curtain', { fit: true });
    F.box('prop', W / 2, -0.04, H1 + 1.15, Math.min(1.8, W - 1) + 0.1, 0.04, 1.0, 0x5e6268);
    { const th = 0.36, dep = 0.9, [x, z] = F.at(W / 2, -dep / 2 + 0.02); const o = F.alongX ? { rx: F.out[1] > 0 ? th : -th } : { rz: F.out[0] > 0 ? -th : th };
      B.box('tex', x, H1 + 0.05 - Math.sin(th) * dep / 2 + 0.08, z, F.alongX ? W + 0.1 : dep / Math.cos(th), 0.08, F.alongX ? dep / Math.cos(th) : W + 0.1, 0x9a9ca4, Object.assign({ tile: r() < 0.5 ? 'kawara' : 'galv', ts: 1.4, edges: false }, o)); }
    sign(F, label, W / 2, -0.04, H1 + 0.42, Math.min(W - 0.6, 2.6), 0.42, 0.08, { bg: snack ? '#2a0a24' : '#1a1010', fg: snack ? '#ff9ad8' : '#ffd890', size: 34, serif: !snack });
    halos.push({ p: [...vec(F.at(W / 2, -0.4), H1 + 0.42)], size: 1.6, color: snack ? 0xff8ad0 : 0xffb070, k: lit ? 0.35 : 0, neon: true });
    // ── 袖看板（右の柱から通りへ出した縦の灯りの看板：横丁を歩くと正面に見える）──
    { const su = W - P0 / 2, sv = -0.42, sy = 2.62, sh = 1.15, sw = 0.5;
      F.box(lit ? 'glow' : 'prop', su, sv, sy, 0.055, sw + 0.04, sh + 0.04, lit ? 0xfff0d8 : 0x8a8478);
      for (const dy of [-sh / 2 - 0.035, sh / 2 + 0.035]) F.box('prop', su, sv, sy + dy, 0.07, sw + 0.06, 0.05, 0x2a2420);          // 上下の枠
      const vin = sv + sw / 2 + 0.02; for (const dy of [-sh / 2 + 0.12, sh / 2 - 0.12]) F.box('prop', su, vin / 2, sy + dy, 0.04, -vin + 0.02, 0.04, 0x2a2420);   // 柱から出した腕
      vsign(F, label, su, sv, sy, sw - 0.06, sh - 0.08, { bg: snack ? '#2a0a24' : kind === 'oden' ? '#f4ecd8' : '#f0e8d8', fg: snack ? '#ff9ad8' : kind === 'oden' ? '#1a2a5a' : '#6a1a10', serif: !snack, frameColor: snack ? '#ff9ad8' : '#3a2a1a' });
      if (lit) { const [hx, hz] = F.at(su, sv); halos.push({ p: [hx, sy, hz], size: 1.8, color: snack ? 0xff9ad8 : 0xfff0d0, k: 0.45, neon: true }); } }
    // ── 赤ちょうちん（表の柱から出した腕に吊る：大きく・「おでん」などの字）2 つ ──
    const LTEXT = { oden: 'おでん', yakitori: 'やきとり', tachinomi: '酒', izakaya: '酒', snack: '' };
    if (kind !== 'kissa') for (const cu of opt.oneLantern ? [dU0 - 0.25] : [dU0 - 0.25, Math.min(W - 0.3, dU1 + 0.25)]) {
      F.box('prop', cu, -0.28, 2.5, 0.04, 0.56, 0.04, 0x2a1c12);                                             // 腕（表の面から 0.56m）
      F.box('prop', cu, -0.5, 2.37, 0.02, 0.02, 0.22, 0x1a1414);                                            // 吊りひも
      const g = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14); add('glow', g, snack ? 0xf0a0c8 : 0xe8442a, cu, -0.5, 2.0);
      for (const dy of [-0.27, 0.27]) F.box('prop', cu, -0.5, 2.0 + dy, 0.3, 0.3, 0.04, 0x1a1414);
      if (LTEXT[kind]) vsign(F, LTEXT[kind], cu, -0.705, 2.0, 0.22, 0.42, { bg: '#e8442a', fg: '#1a0a06', serif: true, frame: false }, true, false);
      const [hx, hz] = F.at(cu, -0.75); halos.push({ p: [hx, 2.0, hz], size: 1.3, color: snack ? 0xff9ad8 : 0xff6040, k: lit ? 0.75 : 0, lantern: false });
    }
    // ── 店の前：立て看板・縁台（おでん）・ビールのケース・樽の机（立ち飲み） ──
    const fr = (opt.front || []);
    { const su = fr.includes('bench') || fr.includes('taru') ? W - 0.5 : 0.7; F.box('prop', su, -0.38, 0.5, 0.42, 0.06, 1.0, 0x2a2a2e);
      sign(F, (MENU[kind] || MENU.izakaya)[2] || '営業中', su, -0.42, 0.62, 0.36, 0.6, 0.02, { bg: '#121010', fg: '#ffe0a0', size: 24 }); }
    if (fr.includes('bench')) { const [x, z] = F.at((P0 + wU1) / 2 + 0.05, -0.32); FK.bench(x, z, F.ry, wU1 - P0 - 0.05, { d: 0.38, h: 0.42 }); }
    if (fr.includes('taru')) { const g = new THREE.CylinderGeometry(0.27, 0.3, 0.92, 14); add('prop', g, 0x6a4428, 0.62, -0.5, 0.46); const g2 = new THREE.CylinderGeometry(0.4, 0.4, 0.04, 16); add('prop', g2, 0x8a6a48, 0.62, -0.5, 0.94);
      for (const y of [0.18, 0.74]) { const g3 = new THREE.CylinderGeometry(0.285, 0.29, 0.04, 14); add('prop', g3, 0x2a2a2e, 0.62, -0.5, y); } }
    if (lit) { const [px, pz] = F.at(dU, -1.2); pool(px, pz, 2.4, snack ? 0xff9ad8 : 0xffc890, 0.34); wet.push({ p: [px, 0, pz], size: 1.8, color: 0xffb070, k: 0.75 }); halos.push({ p: [...vec(F.at(dU, -0.3), 1.6)], size: 1.6, color: 0xffd0a0, k: 0.4 }); }
    // ── 店の中：天井の灯り（吊った笠）・カウンター・腰掛け・鍋・棚・品書き ──
    const inner = { u0: t, u1: W - t, v0: t, v1: D - t };
    if (lit && lights) { const [lx, lz] = F.at(W / 2, 1.6); lights.push({ id: 'shop_' + kind + '_' + Math.round(lx), pos: [lx, 2.2, lz], color: snack ? 0xff9ad0 : 0xffc890, intensity: 4, dist: 7, town: true }); }
    for (const u of [W * 0.3, W * 0.7]) {                                                                   // 吊った笠の灯り（コードは天井へ）
      F.box('prop', u, 1.9, 2.42, 0.012, 0.012, 0.36, 0x1a1414);
      const g = new THREE.CylinderGeometry(0.12, 0.2, 0.16, 14); add(lit ? 'glow' : 'prop', g, lit ? 0xfff0d0 : 0x6a6a6a, u, 1.9, 2.18);
      if (lit) { const [hx, hz] = F.at(u, 1.9); halos.push({ p: [hx, 2.1, hz], size: 1.0, color: 0xffe0b0, k: 0.5 }); }
    }
    const cv = 2.05, cu0 = inner.u0 + 0.22, cu1 = inner.u1 - 0.22;                                          // カウンター（表と平行・戸口から正面に見える）
    if (kind !== 'tachinomi') {
      F.box(lit ? 'texglow' : 'tex', (cu0 + cu1) / 2, cv, 0.5, cu1 - cu0, 0.42, 1.0, lit ? 0x8a6a4c : 0xffffff, 'wood', { ts: 1 });          // 灯りに照らされた板（自ら光る絵）
      F.box(lit ? 'texglow' : 'tex', (cu0 + cu1) / 2, cv - 0.06, 1.025, cu1 - cu0 + 0.04, 0.62, 0.05, lit ? 0xd0a878 : 0xb08060, 'wood', { ts: 1 });
      const ns = Math.max(2, Math.floor((cu1 - cu0) / 0.62));
      for (let i = 0; i < ns; i++) { const u = cu0 + (i + 0.5) * (cu1 - cu0) / ns, [x, z] = F.at(u, cv - 0.62); FK.stool(x, z, snack ? 0x6a2a4a : 0x8a3a2a, 0.68); }
    } else {   // 立ち飲み：高い机 2（戸口から見える）・ビールのケース・冷蔵庫（光る戸）
      for (const k of [0, 1]) { const u = inner.u0 + (k + 0.7) * (inner.u1 - inner.u0) / 2.4, [x, z] = F.at(u, 1.7); FK.table(x, z, F.ry, 0.7, 0.7, 1.05, 0x6a4a34); }
      F.box('prop', W / 2, cv + 0.9, 0.5, W - 1.2, 0.42, 1.0, 0x5a3a24);
      F.box('prop', inner.u0 + 0.4, inner.v1 - 0.3, 0.15, 0.45, 0.35, 0.3, 0xc8a020); F.box('prop', inner.u0 + 0.4, inner.v1 - 0.3, 0.45, 0.45, 0.35, 0.3, 0x2a6a3a);
    }
    if (kind === 'tachinomi' || kind === 'izakaya') { F.box('prop', inner.u1 - 0.4, inner.v1 - 0.35, 0.9, 0.6, 0.55, 1.8, 0xd8d8d8); F.box(lit ? 'texglow' : 'tex', inner.u1 - 0.4, inner.v1 - 0.64, 1.0, 0.5, 0.02, 1.4, 0xffffff, lit ? 'konbini' : 'win_dark', { fit: true }); }
    if (kind === 'oden') {   // おでんの鍋（仕切り・大根・玉子・こんにゃく・ちくわ・がんも）・湯気・やかん
      const u = dU - 0.05, v = cv - 0.1;
      F.box('glow', u, v, 1.13, 0.96, 0.5, 0.16, 0x8a8e94); F.box('glow', u, v - 0.255, 1.13, 0.9, 0.012, 0.1, 0xb0b4b8); F.box('glow', u, v, 1.2, 0.9, 0.44, 0.01, 0xc88438);
      for (const du of [-0.15, 0.15]) F.box('prop', u + du, v, 1.2, 0.012, 0.44, 0.02, 0x9a9ea2);
      F.box('prop', u, v, 1.2, 0.9, 0.012, 0.02, 0x9a9ea2);
      const items = [['d', -0.36, -0.1], ['d', -0.3, 0.1], ['d', -0.22, -0.08], ['e', -0.04, -0.1], ['e', 0.04, -0.12], ['e', 0.0, 0.1], ['k', 0.2, -0.1], ['k', 0.3, 0.1], ['c', 0.36, -0.08], ['g', 0.24, 0.08], ['c', -0.08, 0.06]];
      for (const [k, du, dv] of items) {
        let g;
        if (k === 'd') { g = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12); add('glow', g, 0xe8d0a0, u + du, v + dv, 1.215); }
        if (k === 'e') { g = new THREE.SphereGeometry(0.035, 10, 8); g.scale(1, 1.25, 1); add('glow', g, 0xc88a48, u + du, v + dv, 1.22); }
        if (k === 'k') { g = new THREE.CylinderGeometry(0.065, 0.065, 0.025, 3); g.rotateZ(Math.PI / 2); g.rotateY(0.4); add('glow', g, 0x5a4a44, u + du, v + dv, 1.225); }
        if (k === 'c') { g = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10); g.rotateZ(Math.PI / 2); add('glow', g, 0xd8a050, u + du, v + dv, 1.215); }
        if (k === 'g') { g = new THREE.SphereGeometry(0.045, 8, 6); g.scale(1, 0.7, 1); add('glow', g, 0xa87038, u + du, v + dv, 1.215); }
      }
      for (const [du, dv, a] of [[0.3, 0.1, 0.5], [0.22, 0.08, -0.3], [0.04, 0.1, 0.2]]) { const g = new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4); g.rotateX(a); add('prop', g, 0xd8c8a0, u + du, v + dv, 1.3); }   // 串
      for (const du of [-0.2, 0.25]) F.box('prop', u + du, v - 0.4, 1.075, 0.16, 0.16, 0.02, 0xf0ece4);           // 取り皿
      F.box('prop', u + 0.62, v - 0.1, 1.11, 0.08, 0.08, 0.12, 0xe0b040);                                          // からしの入れ物
      if (K.steam) { const [sx, sz] = F.at(u, v); K.steam.push({ p: [sx, 1.24, sz], n: 16, h: 1.0, r: 0.3, spread: 0.75, k: 1 }); }
      // やかん（こんろの上）
      F.box('prop', inner.u1 - 0.45, 3.0, 0.42, 0.5, 0.45, 0.84, 0x8a8e92);
      { const g = new THREE.CylinderGeometry(0.1, 0.13, 0.17, 14); add('prop', g, 0xc8ccd0, inner.u1 - 0.45, 3.0, 0.925); const g2 = new THREE.CylinderGeometry(0.015, 0.025, 0.16, 6); g2.rotateZ(0.9); add('prop', g2, 0xc8ccd0, inner.u1 - 0.45 + 0.13, 3.0, 0.95); const g3 = new THREE.TorusGeometry(0.08, 0.01, 6, 12, Math.PI); add('prop', g3, 0x2a2a2e, inner.u1 - 0.45, 3.0, 1.01); }
      if (K.steam) { const [sx, sz] = F.at(inner.u1 - 0.45 + 0.2, 3.0); K.steam.push({ p: [sx, 1.0, sz], n: 6, h: 0.5, r: 0.12, spread: 0.05, k: 0.7 }); }
    }
    if (kind === 'yakitori') {   // 焼き台（窓の内側＝通りから見える炭の灯り・煙）と、カウンターの上の皿
      const u = (P0 + wU1) / 2, v = 0.45; F.box('prop', u, v, 0.5, wU1 - P0 - 0.1, 0.4, 1.0, 0x3a3a3e); F.box('prop', u, v, 1.08, wU1 - P0 - 0.1, 0.36, 0.16, 0x2a2a2e); F.box('glow', u, v, 1.165, wU1 - P0 - 0.2, 0.28, 0.01, 0xff7030);
      for (let i = 0; i < 6; i++) { const g = new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4); g.rotateX(Math.PI / 2); add('prop', g, 0xd8c8a0, u - 0.4 + i * 0.16, v, 1.19); F.box('prop', u - 0.4 + i * 0.16, v, 1.19, 0.035, 0.12, 0.03, 0x8a4a24); }
      if (K.steam) { const [sx, sz] = F.at(u, v); K.steam.push({ p: [sx, 1.2, sz], n: 14, h: 1.1, r: 0.32, spread: 0.7, k: 0.8 }); }
      const u2 = (cu0 + cu1) / 2 + 0.2; F.box('prop', u2, cv + 0.08, 1.12, 0.8, 0.3, 0.14, 0x3a3a3e); F.box('glow', u2, cv + 0.08, 1.195, 0.72, 0.22, 0.01, 0xff7030);
    }
    if (kind === 'snack') { F.box(lit ? 'glow' : 'prop', W / 2, inner.v1 - 0.03, 1.85, 1.1, 0.04, 0.62, lit ? 0x4a7ad8 : 0x1a1a22); F.box('prop', W / 2, inner.v1 - 0.06, 1.85, 1.2, 0.04, 0.7, 0x1a1a1e); }   // カラオケの画面
    if (kind === 'kissa') { const u = cu1 - 0.3; F.box('prop', u, cv + 0.05, 1.25, 0.36, 0.34, 0.4, 0x2a2a2e); }
    // 奥の壁：棚（一升瓶・徳利）と品書き（短冊の板）
    F.box('prop', W / 2, inner.v1 - 0.15, 1.35, W - 2 * t - 0.2, 0.3, 0.04, 0x6a4a30); F.box('prop', W / 2, inner.v1 - 0.15, 1.75, W - 2 * t - 0.2, 0.3, 0.04, 0x6a4a30);
    for (const s of [-1, 1]) for (const y of [1.35, 1.75]) F.box('prop', W / 2 + s * (W / 2 - t - 0.12), inner.v1 - 0.03, y - 0.06, 0.04, 0.06, 0.1, 0x3a2a1a);   // 棚受け
    for (let i = 0; i < Math.floor((W - 0.6) / 0.2); i++) { const u = 0.3 + i * 0.2 + 0.1; for (const y of [1.37, 1.77]) if ((i * 3 + y * 10) % 4 > 0.6) { const c = [0x1e4a2e, 0x6a3a1a, 0xd8d0c0, 0x4a1a1a][(i + Math.round(y)) % 4];
      const g = new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8); add('prop', g, c, u, inner.v1 - 0.15, y + 0.15); const g2 = new THREE.CylinderGeometry(0.015, 0.03, 0.09, 6); add('prop', g2, c, u, inner.v1 - 0.15, y + 0.325); } }
    const M = MENU[kind] || MENU.izakaya;
    for (let i = 0; i < 2; i++) sign(F, M[i], 0.3 + (i + 0.5) * (W - 0.6) / 2, inner.v1 - 0.035, 2.25, (W - 0.6) / 2 - 0.1, 0.32, 0.02, { bg: '#f4ead4', fg: '#2a1a10', size: 24, weight: 'normal' }, true);
    if (kind === 'oden') sign(F, 'おでん各種', W / 2, inner.v1 - 0.035, 2.62, 1.4, 0.28, 0.02, { bg: '#2a1a10', fg: '#ffe8c0', size: 34, serif: true }, true);
    return F;
  }
  const vec = ([x, z], y) => [x, y, z];
  return { unit, frame };
}
