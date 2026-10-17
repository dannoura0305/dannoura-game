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
  const { B, signUV, halos, wet, pool, lights } = K;
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
  const sign = (F, text, u, v, y, w, h, d, style, inward = false) => { const uv = signUV(text, style); const [x, z] = F.at(u, v); B.box('sign', x, y, z, F.alongX ? w : d, h, F.alongX ? d : w, 0xffffff, { uv, face: inward ? F.faceIn : F.face, edges: false }); return [x, z]; };

  function unit(rect, f, kind, name, opt = {}) {
    const F = frame(rect, f), r = rng(opt.seed || 7), W = F.W, D = Math.min(F.D, opt.depth || 4.2), H1 = 2.8, H2 = opt.h2 ?? 2.3, H = H1 + H2, t = 0.14;
    const tints = [0x8a6a50, 0x9a7a5a, 0x6a5444, 0xa08870, 0x7a6a5e], tint = opt.tint ?? tints[Math.floor(r() * tints.length)];
    const wallT = opt.wall || ['wood', 'wood', 'mortar', 'siding'][Math.floor(r() * 4)];
    const lit = opt.lit !== false, dw = Math.min(1.7, W * 0.36), dU = Math.max(dw / 2 + 0.45, W * 0.34), winU = Math.min(W - 0.85, dU + dw / 2 + 0.95), winW = Math.min(1.3, W - winU - 0.25) * 2 > 0.8 ? Math.min(1.3, (W - winU - 0.25) * 2) : 0.9;
    const tex = (u, v, y, a, b, h, color, tile, o) => F.box('tex', u, v, y, a, b, h, color, tile, Object.assign({ ts: 2 }, o || {}));
    // ── 外の殻：表の壁（戸口と窓を空ける）・横・奥・2 階（中身の詰まった箱）・屋根 ──
    tex(dU - dw / 2 - (dU - dw / 2) / 2, t / 2, H1 / 2, dU - dw / 2, t, H1, tint, wallT);                 // 表：戸口の左
    tex((dU + dw / 2 + W) / 2, t / 2, H1 / 2, W - dU - dw / 2, t, H1, tint, wallT);                       // 表：戸口の右（窓は面の絵）
    tex(dU, t / 2, (2.05 + H1) / 2, dw, t, H1 - 2.05, tint, wallT);                                       // 表：戸口の上
    for (const u of [t / 2, W - t / 2]) tex(u, D / 2, H1 / 2, t, D, H1, tint, wallT);                    // 横
    tex(W / 2, D - t / 2, H1 / 2, W, t, H1, tint, wallT);                                                 // 奥
    tex(W / 2, D / 2, H1 + H2 / 2, W, D, H2, tint, wallT, { ao: false });                                 // 2 階（詰まった箱）
    F.box('prop', W / 2, D / 2, H + 0.08, W + 0.12, D + 0.12, 0.16, 0x3a3634);                           // 屋上の縁
    F.box('tex', W / 2, D / 2, H1 - 0.1, W - 2 * t, D - 2 * t, 0.2, 0xe8e4dc, 'ceiling', { ts: 1.2 });  // 1 階の天井
    F.box('tex', W / 2, D / 2, 0.01, W - 2 * t, D - 2 * t, 0.02, 0xffffff, kind === 'kissa' || kind === 'snack' ? 'woodfloor' : 'concrete', { ts: 1.5 });
    // ── 戸口：開けた引き戸（片側に寄せた格子戸）・枠・敷居・のれん ──
    F.box('prop', dU - dw / 2 - 0.035, t / 2, 1.05, 0.08, t + 0.04, 2.1, 0x2a1c12); F.box('prop', dU + dw / 2 + 0.035, t / 2, 1.05, 0.08, t + 0.04, 2.1, 0x2a1c12);
    F.box('prop', dU, t / 2, 2.07, dw + 0.16, t + 0.04, 0.08, 0x2a1c12); F.box('prop', dU, t / 2, 0.02, dw, t + 0.02, 0.04, 0x6a6a68);
    F.box(lit ? 'texglow' : 'tex', dU + dw / 4, t + 0.03, 1.02, dw / 2, 0.04, 2.0, lit ? 0xd8c0a0 : 0x8a7a68, lit ? 'koshi_lit' : 'koshi', { fit: true });   // 寄せた戸（店の中の側）
    F.box('prop', dU, -0.06, 2.02, dw + 0.3, 0.04, 0.04, 0x3a2a1a);                                      // のれんの竿（表の面に付く）
    for (const s of [-1, 1]) F.box('prop', dU + s * (dw / 2 + 0.12), -0.02, 2.02, 0.04, 0.08, 0.06, 0x3a2a1a);
    { const nw = dw + 0.2; sign(F, name.replace(/（仮）/, ''), dU, -0.07, 1.74, nw, 0.52, 0.02, { bg: NOREN[kind] || '#2a2a3a', fg: '#f4ecdc', size: 44, serif: true, frame: false });
      for (const k of [-1, 1]) F.box('prop', dU + k * nw / 6, -0.085, 1.66, 0.025, 0.012, 0.36, 0x101014); }   // のれん（切れ目の線）
    // ── 窓（灯りの障子）と窓台・2 階の窓・下屋（ひさし）・名前の看板 ──
    F.box(lit ? 'texglow' : 'tex', winU, -0.02, 1.35, winW, 0.04, 0.9, lit ? 0xd0b898 : 0xffffff, lit ? 'win_shoji' : 'win_dark', { fit: true });
    F.box('prop', winU, -0.04, 1.35, winW + 0.1, 0.04, 1.0, 0x2a1c12); F.box('prop', winU, -0.07, 0.86, winW + 0.16, 0.14, 0.05, 0x4a3a2a);
    F.box(lit && r() < 0.6 ? 'texglow' : 'tex', W / 2, -0.02, H1 + 1.15, Math.min(1.8, W - 1), 0.04, 0.9, 0xc8b8a0, lit && r() < 0.6 ? 'win_lit' : 'win_curtain', { fit: true });
    F.box('prop', W / 2, -0.04, H1 + 1.15, Math.min(1.8, W - 1) + 0.1, 0.04, 1.0, 0x5e6268);
    { const th = 0.36, dep = 0.9, [x, z] = F.at(W / 2, -dep / 2 + 0.02); const o = F.alongX ? { rx: F.out[1] > 0 ? th : -th } : { rz: F.out[0] > 0 ? -th : th };
      B.box('tex', x, H1 + 0.05 - Math.sin(th) * dep / 2 + 0.08, z, F.alongX ? W + 0.1 : dep / Math.cos(th), 0.08, F.alongX ? dep / Math.cos(th) : W + 0.1, 0x9a9ca4, Object.assign({ tile: r() < 0.5 ? 'kawara' : 'galv', ts: 1.4, edges: false }, o)); }
    sign(F, name.replace(/（仮）/, ''), W / 2, -0.04, H1 + 0.42, Math.min(W - 0.6, 2.6), 0.42, 0.08, { bg: kind === 'snack' ? '#2a0a24' : '#1a1010', fg: kind === 'snack' ? '#ff9ad8' : '#ffd890', size: 34, serif: kind !== 'snack' });
    halos.push({ p: [...vec(F.at(W / 2, -0.4), H1 + 0.42)], size: 1.6, color: kind === 'snack' ? 0xff8ad0 : 0xffb070, k: lit ? 0.35 : 0, neon: true });
    // 赤ちょうちん（表の壁から出した腕に吊る）・立て看板
    if (kind !== 'kissa') {
      const cu = opt.lanternRight ? Math.min(W - 0.35, dU + dw / 2 + 0.42) : Math.max(0.35, dU - dw / 2 - 0.42), [ax, az] = F.at(cu, -0.25);
      F.box('prop', cu, -0.25, 2.42, 0.04, 0.5, 0.04, 0x2a1c12);                                         // 腕（表の面から 0.5m）
      F.box('prop', cu, -0.45, 2.27, 0.02, 0.02, 0.27, 0x1a1414);                                        // 吊りひも
      const g = new THREE.CylinderGeometry(0.17, 0.17, 0.44, 12), [lx, lz] = F.at(cu, -0.45); g.translate(lx, 1.92, lz); B.add('glow', g, kind === 'snack' ? 0xf0a0c8 : 0xe0402a);
      for (const dy of [-0.24, 0.24]) F.box('prop', cu, -0.45, 1.92 + dy, 0.26, 0.26, 0.04, 0x1a1414);
      halos.push({ p: [ax + F.out[0] * 0.25, 1.92, az + F.out[1] * 0.25], size: 1.2, color: kind === 'snack' ? 0xff9ad8 : 0xff6040, k: lit ? 0.7 : 0, lantern: false });
      void ax;
    }
    { const su = Math.min(W - 0.4, winU + winW / 2 + 0.05), [sx, sz] = F.at(Math.min(W - 0.35, su), -0.35);
      F.box('prop', Math.min(W - 0.35, su), -0.35, 0.5, 0.42, 0.06, 1.0, 0x2a2a2e);                       // 立て看板（地面に立つ）
      sign(F, MENU[kind][2] || '営業中', Math.min(W - 0.35, su), -0.39, 0.62, 0.36, 0.6, 0.02, { bg: '#121010', fg: '#ffe0a0', size: 24 });
      void sx; void sz; }
    if (lit) { const [px, pz] = F.at(dU, -1.2); pool(px, pz, 2.2, kind === 'snack' ? 0xff9ad8 : 0xffc890, 0.3); wet.push({ p: [px, 0, pz], size: 1.6, color: 0xffb070, k: 0.7 }); halos.push({ p: [...vec(F.at(dU, -0.3), 1.6)], size: 1.4, color: 0xffd0a0, k: 0.35 }); }
    // ── 店の中（戸口から見える）：天井の灯り・カウンター・腰掛け・品書き・棚 ──
    const inner = { u0: t, u1: W - t, v0: t, v1: D - t };
    if (lit && lights) { const [lx, lz] = F.at(W / 2, D * 0.45); lights.push({ id: 'shop_' + kind + '_' + Math.round(lx), pos: [lx, 2.2, lz], color: kind === 'snack' ? 0xff9ad0 : 0xffc890, intensity: 3.2, dist: 6, town: true }); }   // 店の中の灯り（戸口から見える）
    F.box(lit ? 'glow' : 'prop', W / 2, D / 2, H1 - 0.22, Math.min(1.2, W - 1), Math.min(0.5, D - 1), 0.04, lit ? 0xfff0d8 : 0x6a6a6a);  // 天井の灯り（天井に付く）
    const cv = D * 0.58;                                                                                   // カウンターの位置（奥から）
    if (kind === 'oden' || kind === 'yakitori' || kind === 'snack' || kind === 'izakaya' || kind === 'kissa') {
      const cu0 = inner.u0 + 0.05, cu1 = inner.u1 - 0.75;
      F.box('tex', (cu0 + cu1) / 2, cv, 0.5, cu1 - cu0, 0.45, 1.0, 0xffffff, 'wood', { ts: 1 });          // カウンター
      F.box('prop', (cu0 + cu1) / 2, cv - 0.06, 1.025, cu1 - cu0 + 0.04, 0.6, 0.05, 0x7a5434);
      const ns = Math.max(2, Math.floor((cu1 - cu0) / 0.62));
      for (let i = 0; i < ns; i++) { const u = cu0 + (i + 0.5) * (cu1 - cu0) / ns, [x, z] = F.at(u, cv - 0.6); FK.stool(x, z, kind === 'snack' ? 0x6a2a4a : 0x8a3a2a, 0.68); }
      if (kind === 'oden') {   // おでんの鍋（仕切り・湯気の灯り）
        const u = (cu0 + cu1) / 2 - 0.3; F.box('prop', u, cv + 0.05, 1.12, 0.7, 0.42, 0.16, 0xb8bcc0); F.box('glow', u, cv + 0.05, 1.205, 0.62, 0.34, 0.01, 0xc89050);
        for (const du of [-0.12, 0.12]) F.box('prop', u + du, cv + 0.05, 1.2, 0.015, 0.34, 0.02, 0x8a8e92);
      }
      if (kind === 'yakitori') { const u = (cu0 + cu1) / 2 + 0.2; F.box('prop', u, cv + 0.08, 1.12, 0.8, 0.3, 0.14, 0x3a3a3e); F.box('glow', u, cv + 0.08, 1.195, 0.72, 0.22, 0.01, 0xff7030); }
      if (kind === 'kissa') { const u = cu1 - 0.3; F.box('prop', u, cv + 0.05, 1.25, 0.36, 0.34, 0.4, 0x2a2a2e); }
    } else {   // 立ち飲み：高い机 2・ビールのケース
      for (const k of [0, 1]) { const u = inner.u0 + (k + 0.6) * (inner.u1 - inner.u0) / 2.4, [x, z] = F.at(u, D * 0.55); FK.table(x, z, F.ry, 0.7, 0.7, 1.05, 0x6a4a34); }
      F.box('prop', inner.u1 - 0.3, inner.v1 - 0.25, 0.15, 0.45, 0.35, 0.3, 0xc8a020); F.box('prop', inner.u1 - 0.3, inner.v1 - 0.25, 0.45, 0.45, 0.35, 0.3, 0x2a6a3a);
    }
    // 奥の壁：棚（瓶）と品書き
    F.box('prop', W / 2, inner.v1 - 0.15, 1.35, W - 2 * t - 0.2, 0.3, 0.04, 0x6a4a30); F.box('prop', W / 2, inner.v1 - 0.15, 1.75, W - 2 * t - 0.2, 0.3, 0.04, 0x6a4a30);
    for (let i = 0; i < Math.floor((W - 0.6) / 0.22); i++) { const u = 0.3 + i * 0.22 + 0.11; for (const y of [1.37, 1.77]) if ((i * 3 + y * 10) % 4 > 0.6) F.box('prop', u, inner.v1 - 0.15, y + 0.13, 0.08, 0.08, 0.24, [0x2a5a3a, 0x8a5a2a, 0xd8d0c0, 0x5a2a2a][(i + Math.round(y)) % 4]); }
    const M = MENU[kind] || MENU.izakaya;
    for (let i = 0; i < 2; i++) sign(F, M[i], 0.3 + (i + 0.5) * (W - 0.6) / 2, inner.v1 - 0.01, 2.25, (W - 0.6) / 2 - 0.1, 0.32, 0.02, { bg: '#f4ead4', fg: '#2a1a10', size: 24, weight: 'normal' }, true);
    return F;
  }
  const vec = ([x, z], y) => [x, y, z];
  return { unit, frame };
}
