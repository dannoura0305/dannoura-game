// 町の組み立て（フェーズ10）：中央通り（路面電車とバスの通り）・駅前（駅舎・大屋根・電停・バスターミナル・タクシーのりば・駐輪場・時計）・
// ガラスの屋根の広場（総曲輪の広場の雰囲気を参考にした独自の意匠）・横丁・町家（古い商家）・ビル・停まった路面電車とバス・消雪の水の出口とさび・雪囲い。
// world/town.js の buildTown から道具（K）を受け取って同じ Builder へ入れる。配置は data/town.js（当たり判定も同じデータ：townSolids）。
// 名前・看板・意匠はすべて独自（実在の地名・会社・建物の名前やロゴは使わない）。
import * as THREE from 'three';
import { shopKit } from './shopkit.js';
import { machiyaDoors, lotEntrances, fillEntrances } from '../data/town.js';
import { applyTile } from '../render/townmat.js';
import { stopPosts, catenaryPoles, walkwayPosts, canopyColumns, signalPoles } from '../data/town.js';
import { JP_FONT } from '../render/toon.js';

/** 起動の後で組み立てる遠い所（中央通り・駅前・中央通りに面した建物） */
export const isFar = (x, z) => x > 62 || z < -78 || (x > 49 && z < -24);
const FACE = { N: 5, S: 4, E: 0, W: 1 };
const hex = c => '#' + c.toString(16).padStart(6, '0');

/** 角を丸めた折れ線（路面電車の線路）：点の列を返す（step m ごと） */
export function filletPath(pts, r, step = 0.8) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], [cx, cz] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, bz - az), l2 = Math.hypot(cx - bx, cz - bz), d1 = [(bx - ax) / l1, (bz - az) / l1], d2 = [(cx - bx) / l2, (cz - bz) / l2];
    const rr = Math.min(r, l1 / 2, l2 / 2), p0 = [bx - d1[0] * rr, bz - d1[1] * rr], p1 = [bx + d2[0] * rr, bz + d2[1] * rr];
    out.push(p0);
    const n = Math.max(3, Math.ceil(rr * 1.6 / step));
    for (let k = 1; k < n; k++) { const t = k / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * bx + t * t * p1[0], u * u * p0[1] + 2 * u * t * bz + t * t * p1[1]]); }
    out.push(p1);
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
/** 長い区間を max m ごとに分ける（升目ごとの網に入るように・電線のつり下げの間隔） */
export function resample(P, max) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) { const [ax, az] = P[i - 1], [bx, bz] = P[i], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / max)); for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); }
  return out;
}

export function makeTown2(K) {
  const { B, T, tb, prop, signUV, pool, halos, lights, wet, spots, hideSpots, frame, win, roofGable, tree, car, bike, catenaryPts, wirePts, inPart, inRect, seeded, doorFrame, glassDoor, FK } = K;
  const glowB = (x, y, z, w, h, d, color, opt = {}) => B.box('glow', x, y, z, w, h, d, color, Object.assign({ edges: false }, opt));
  const glass = (x, y, z, w, h, d, color = 0x8aa0c0, opt = {}) => B.box('glass2', x, y, z, w, h, d, color, Object.assign({ edges: false }, opt));
  const signBox = (uv, x, y, z, w, h, d, face, opt = {}) => B.box('sign', x, y, z, w, h, d, 0xffffff, Object.assign({ uv, face, edges: false }, opt));
  /** 町家・ビルの前の傾き（表へ下がる）：F.out の向きで rx／rz を選ぶ */
  const tilt = (F, th) => F.alongX ? { rx: F.out[1] > 0 ? th : -th } : { rz: F.out[0] > 0 ? -th : th };
  /** 区画の表の面の看板 */
  const frontSign = (F, uv, u, v, y, w, h, d = 0.1) => { const [x, z] = F.at(u, v); signBox(uv, x, y, z, F.alongX ? w : d, h, F.alongX ? d : w, FACE[F.f]); return [x, z]; };
  const boxLocal = (cx, cz, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (key, lx, y, lz, w, h, d, color, opt = {}) => B.box(key, cx + lx * c + lz * s, y, cz - lx * s + lz * c, w, h, d, color, Object.assign({ ry, edges: false }, opt)); };
  const at2 = (cx, cz, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c]; };

  // ───────────── 区画（町家・ビル・百貨店・奥のビル・駅舎・通行止め） ─────────────
  function lot(L) {
    if (L.kind === 'machiya') machiya(L);
    else if (L.kind === 'tower') tower(L);
    else if (L.kind === 'dept') dept(L);
    else if (L.kind === 'fillB') fillB(L);
    else if (L.kind === 'station') station(L);
    else if (L.kind === 'barrier2') barrier2(L);
  }
  /** 町家（古い商家）：板壁・1 階の格子と暖簾・下屋の瓦・低い 2 階の虫籠窓と漆喰・袖壁・平入りの瓦屋根・屋根看板・行灯 */
  function machiya(L) {
    const F = frame(L), { doors, r } = machiyaDoors(L), W = F.W, D = Math.min(F.D, 12), h1 = 3.3, h2 = 2.6, H = h1 + h2;
    F.box('tex', W / 2, D / 2, H / 2, W - 0.1, D, H, 0xb08a6a, 'wood', { ts: 2, ao: true, edges: true });
    for (const { u: doorU, w: dw, lit, u0, uw } of doors) {
      for (const [a, b] of [[u0 + 0.35, doorU - dw / 2 - 0.12], [doorU + dw / 2 + 0.12, u0 + uw - 0.35]]) if (b - a > 0.3) F.box(lit ? 'texglow' : 'tex', (a + b) / 2, -0.06, 1.5, b - a, 0.08, 2.6, lit ? 0xc8a888 : 0xffffff, lit ? 'koshi_lit' : 'koshi', { ts: 1.0, tsy: 2.6 });
      // フェーズ11：戸口（表の面の前に出す＝以前は壁の中に埋まって見えなかった）：格子戸 2 枚・太い枠・敷居・沓脱石
      F.box(lit ? 'texglow' : 'tex', doorU, -0.06, 1.42, dw, 0.05, 1.6, lit ? 0xe0c8a0 : 0x7a6c60, 'win_shoji', { fit: true });     // 上：障子の入ったガラス戸（灯り）
      F.box('tex', doorU, -0.07, 0.31, dw, 0.06, 0.62, 0x6a4a34, 'wood', { ts: 0.5 });                                                  // 下：腰板
      F.box('prop', doorU, -0.11, 1.12, 0.07, 0.05, 2.2, 0x2a1c12);
      doorFrame(F, doorU, -0.02, 0, dw, 2.24, 0x2a1c12, 0.12);
      F.box('tex', doorU, -0.42, 0.06, Math.min(1.2, dw), 0.5, 0.12, 0xb8b4ac, 'stone', { ts: 0.6 });
      const nuv = signUV(L.sign.replace('（仮）', ''), { bg: hex(L.noren || 0x2a3a5a), fg: '#f2ead8', size: 40, serif: true, frame: false });
      frontSign(F, nuv, doorU, -0.14, 2.15, dw + 0.2, 0.85, 0.03);
      // 行灯
      const [ax, az] = F.at(doorU - dw / 2 - 0.45, -0.25);
      B.box(lit ? 'glow' : 'prop', ax, 1.35, az, 0.32, 0.5, 0.32, lit ? 0xffd8a0 : 0x6a6050, { edges: false });
      if (lit) { halos.push({ p: [ax + F.out[0] * 0.2, 1.35, az + F.out[1] * 0.2], size: 1.2, color: 0xffc080, k: 0.75 }); wet.push({ p: [ax + F.out[0] * 1.2, 0, az + F.out[1] * 1.2], size: 1.4, color: 0xffc080, k: 0.7 }); }
      // 2 階：漆喰と虫籠窓
      F.box('tex', u0 + uw / 2, -0.03, h1 + h2 / 2, uw - 0.7, 0.05, h2 - 0.3, 0xe8e0d0, 'mortar', { ts: 2 });
      const nw = Math.max(1, Math.floor(uw / 2.6));
      for (let i = 0; i < nw; i++) F.box(lit && i === 0 ? 'texglow' : 'tex', u0 + (i + 0.5) * uw / nw, -0.07, h1 + h2 / 2 + 0.05, 1.3, 0.06, 0.8, lit && i === 0 ? 0xb89878 : 0xffffff, lit && i === 0 ? 'koshi_lit' : 'koshi', { fit: true });
    }
    // 下屋の瓦（1 階の上）と屋根看板・袖壁・屋根
    F.box('tex', W / 2, -0.55, h1 + 0.15, W + 0.2, 1.3, 0.12, 0xb8b8c0, 'kawara', Object.assign({ ts: 1.4 }, tilt(F, 0.38)));
    const suv = signUV(L.sign.replace('（仮）', ''), { bg: '#2a1c12', fg: '#f0dcb0', size: 44, serif: true, frameColor: '#8a6a40' });
    frontSign(F, suv, W / 2, -0.12, h1 + 0.95, Math.min(W * 0.55, 5), 0.62, 0.1);
    for (const u of [0.25, W - 0.25]) F.box('tex', u, -0.25, h1 + h2 / 2 + 0.2, 0.32, 0.6, h2 + 0.5, 0xe0d8c8, 'mortar', { ts: 2 });
    roofGable(F, 0, 0, W, D, H, r() < 0.5 ? 'kawara' : 'kawara2', 0xb8b8c0, 0.7, 'mortar', 0xd8d0c0);
  }
  /** ビル（ガラスの壁のビル・古いタイルのビル）・屋上の看板 */
  function tower(L) {
    const F = frame(L), r = seeded(L.id), n = L.floors || 5, fh = 3.4, H = n * fh + 0.6, D = Math.min(F.D, 14), W = F.W, tint = L.tint || 0xb0b0b0;
    F.box('tex', W / 2, D / 2, H / 2, W - 0.2, D, H, tint, L.oldStyle ? 'tilewall' : 'panel', { ts: 3, ao: true, edges: true });
    for (let k = 1; k < n; k++) {
      const y = k * fh + fh / 2;
      if (L.oldStyle) { const m = Math.max(2, Math.floor(W / 3)); for (let i = 0; i < m; i++) win(F, (i + 0.5) * W / m, 0, y, Math.min(2.0, W / m - 0.7), 1.4, ['dark', 'dark', 'lit', 'curtain', 'office', 'office_lit'][Math.floor(r() * 6)]); }
      else { const lit = r() < (L.office ? 0.28 : 0.42); F.box(lit ? 'texglow' : 'tex', W / 2, -0.05, y, W - 1.4, 0.08, fh - 0.55, lit ? 0xc0b8a8 : 0xffffff, lit ? 'curtainwall_lit' : 'curtainwall', { ts: 2.4, tsy: fh - 0.55 }); }
      F.box('prop', W / 2, -0.12, k * fh + 0.05, W - 0.8, 0.24, 0.3, 0x5e626a);
    }
    // 1 階：玄関・ガラス（灯り）・ひさし
    F.box('texglow', W / 2, -0.06, 1.55, W - 2, 0.08, 2.9, L.office ? 0x8890a0 : 0xd0c8b8, L.office ? 'win_office' : 'win_office_lit', { ts: 2.6, tsy: 2.9 });
    F.box('prop', W / 2, -1.1, 3.25, Math.min(W * 0.6, 8), 2.2, 0.16, 0x34383e);
    for (const e of lotEntrances(L)) { glassDoor(F, e.u, -0.08, e.w, 2.5, 2, true, 0x26282c); F.box('prop', e.u, -0.75, 0.012, e.w + 0.6, 1.3, 0.02, 0x2a2826); }   // フェーズ11：玄関（ガラスの両開き・枠・マット）
    { const [x, z] = F.at(W / 2, -1.6); glowB(x, 3.15, z, 1.4, 0.04, 0.3, 0xfff0d8); halos.push({ p: [x, 2.9, z], size: 1.6, color: 0xffe0b0, k: 0.5 }); pool(x, z, 3.2, 0xffe0b0, 0.25); }
    const uv = signUV(L.sign, { bg: L.office ? '#1a2a4a' : '#2a1a2a', fg: L.office ? '#d8e8ff' : '#ffe0a0', size: 40 });
    frontSign(F, uv, W / 2, -0.05, 3.9, Math.min(W - 2, 9), 0.7);
    if (L.litTop) {   // 屋上の看板（光る文字）
      const [x, z] = frontSign(F, uv, W / 2, 0.6, H + 1.1, Math.min(W - 2, 10), 1.5, 0.2);
      F.box('prop', W / 2, 0.75, H + 0.4, Math.min(W - 2, 10), 0.2, 0.8, 0x3a3a40);
      halos.push({ p: [x + F.out[0] * 0.6, H + 1.1, z + F.out[1] * 0.6], size: 6, color: 0xffc070, k: 0.32, neon: true });
    }
    { const [tx, tz] = F.at(W * 0.7, D * 0.6); const g = new THREE.CylinderGeometry(0.8, 0.8, 1.6, 12); g.translate(tx, H + 0.8, tz); B.add('prop', g, 0x8a9096); }
    F.box('prop', W / 2, 0.1, H + 0.2, W, 0.2, 0.4, 0x4a4c50);
  }
  /** 百貨店・まちなかのビル：ガラスの壁（灯り）・縦のルーバー・大きな看板・ショーウインドー・入口のひさし */
  function dept(L) {
    const F = frame(L), r = seeded(L.id), n = L.floors || 6, fh = 3.5, H = n * fh + 0.8, D = Math.min(F.D, 16), W = F.W;
    F.box('tex', W / 2, D / 2, H / 2, W - 0.2, D, H, L.tint || 0xb0aca8, 'panel', { ts: 3.2, ao: true, edges: true });
    for (let k = 1; k < n; k++) {
      const lit = r() < 0.6;
      F.box(lit ? 'texglow' : 'tex', W / 2, -0.05, k * fh + fh / 2, W - 2.4, 0.08, fh - 0.6, lit ? 0xb0a898 : 0xffffff, lit ? 'curtainwall_lit' : 'curtainwall', { ts: 2.4, tsy: fh - 0.6 });
    }
    for (let u = 1.0; u < W; u += 3.2) F.box('tex', u, -0.3, H / 2 + fh / 2, 0.3, 0.5, H - fh, 0xffffff, 'louver', { ts: 1, tsy: 2 });
    F.box('texglow', W / 2, -0.06, 1.6, W - 2, 0.08, 3.0, 0xd8d0c0, 'konbini', { ts: 3, tsy: 3 });
    F.box('prop', W / 2, -1.4, 3.4, W - 1, 2.8, 0.18, 0x2e3036);
    for (const e of lotEntrances(L)) {   // フェーズ11：自動ドア（2 枚の引き戸・枠・上の「自動ドア」の灯り・マット）
      glassDoor(F, e.u, -0.06, e.w, 2.6, 2, true, 0x2a2c30);
      const auv = signUV('自動ドア', { bg: '#1a2a3a', fg: '#e8f4ff', size: 30, frame: false }); frontSign(F, auv, e.u, -0.11, 2.86, 1.2, 0.18, 0.02);
      F.box('prop', e.u, -0.8, 0.012, e.w + 0.8, 1.4, 0.02, 0x2a2826);
    }
    for (let u = 3; u < W - 2; u += 6) { const [x, z] = F.at(u, -1.8); glowB(x, 3.28, z, 1.0, 0.04, 0.6, 0xfff4e0); halos.push({ p: [x, 3.0, z], size: 1.4, color: 0xfff0d8, k: 0.45 }); }
    { const [x, z] = F.at(W / 2, -2.2); pool(x, z, 6, 0xfff0d8, 0.28); wet.push({ p: [x, 0, z - F.out[1] * 0.5], size: 2.4, color: 0xfff0d8, k: 0.6 }); lights.push({ id: 'dept_' + L.id, pos: [x, 3.0, z], color: 0xfff0d8, intensity: 8, dist: 12, town: true }); }
    const uv = signUV(L.sign, { bg: '#1a1420', fg: '#ffffff', size: 44, frameColor: '#c8a0ff' });
    const [sx, sz] = frontSign(F, uv, W / 2, -0.15, H - 1.6, Math.min(W - 3, 12), 1.5, 0.15);
    halos.push({ p: [sx + F.out[0] * 0.6, H - 1.6, sz + F.out[1] * 0.6], size: 5.5, color: 0xd8c8ff, k: 0.3, neon: true });
    F.box('prop', W / 2, 0.09, H + 0.2, W, 0.2, 0.5, 0x3a3c42);
  }
  /** 奥のビルの並び（見えるだけ）：高さの違う箱・窓の帯・屋上の機械 */
  function fillB(L) {
    const [x0, z0, x1, z1] = L.rect, r = seeded(L.id), cw = 12;
    if (x1 - x0 < 4 || z1 - z0 < 4) { const h = 10; B.box('tex', (x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, 0x9a9ca0, { tile: 'panel', ts: 3, edges: false }); return; }
    for (let x = x0; x < x1 - 2; x += cw) for (let z = z0; z < z1 - 2; z += cw) {
      const w = Math.min(cw, x1 - x) - 0.6, d = Math.min(cw, z1 - z) - 0.6, cx = x + 0.3 + w / 2, cz = z + 0.3 + d / 2, h = 8 + Math.floor(r() * 4) * 3.4;
      const tile = ['panel', 'mortar', 'tilewall', 'panel'][Math.floor(r() * 4)];
      B.box('tex', cx, h / 2, cz, w, h, d, [0x9a9ca0, 0xa8a090, 0x8a8478, 0xb0b4b8][Math.floor(r() * 4)], { tile, ts: 3, edges: false });
      for (let y = 4.2; y < h - 1; y += 3.4) if (r() < 0.45) {
        const lit = r() < 0.4, side = r() < 0.5;
        B.box(lit ? 'texglow' : 'tex', side ? cx : x + 0.26, y, side ? z + 0.26 : cz, side ? w * 0.7 : 0.06, 1.2, side ? 0.06 : d * 0.7, lit ? 0xb8b0a0 : 0xffffff, { tile: lit ? 'win_office_lit' : 'win_office', ts: 2.4, tsy: 1.2, edges: false });
      }
      if (r() < 0.5) B.box('prop', cx + (r() - 0.5) * w * 0.4, h + 0.6, cz + (r() - 0.5) * d * 0.4, 2.4, 1.2, 1.6, 0x7a7e84, { edges: false });
    }
    // フェーズ11：道・広場に面した面の出入り口（鉄の戸・枠・ひさし・灯り）：data/town.js の fillEntrances
    for (const e of fillEntrances(L, T)) {
      const [ox, oz] = e.out, along = Math.abs(ox) < 0.5;
      const DF = { alongX: along, out: e.out, at: (u, v) => [e.door[0] + (along ? u : 0) - v * ox, e.door[1] + (along ? 0 : u) - v * oz] };
      DF.box = (key, u, v, y, a2, b2, hh, color, tile, opt = {}) => { const [x, z] = DF.at(u, v); return B.box(key, x, y, z, along ? a2 : b2, hh, along ? b2 : a2, color, Object.assign({ tile, edges: false }, opt)); };
      DF.box('tex', 0, -0.05, 1.05, 1.0, 0.06, 2.1, 0xa0a8b0, 'panel', { fit: true });
      DF.box('prop', 0.36, -0.1, 1.0, 0.04, 0.05, 0.2, 0xc8ccd0);
      doorFrame(DF, 0, 0, 0, 1.0, 2.1, 0x4a4e54, 0.08);
      DF.box('prop', 0, -0.5, 2.45, 1.6, 1.0, 0.08, 0x3a3c42);
      const [lx, lz] = DF.at(0, -0.9); B.box('glow', lx, 2.38, lz, 0.4, 0.04, 0.12, 0xe8f0ff, { edges: false }); halos.push({ p: [lx, 2.3, lz], size: 1.0, color: 0xe8f0ff, k: 0.5 });
    }
  }
  /** 通行止め（中央通りの南の端） */
  function barrier2(L) {
    const [x0, z0, x1] = L.rect, uv = signUV('この先 通行止め', { bg: '#f8f4ea', fg: '#c01818', size: 34 });
    for (let x = x0 + 1.5; x < x1 - 1; x += 3) { prop(x, 0.5, z0 + 0.4, 2.2, 1.0, 0.08, 0xe8e0d0); prop(x, 0.85, z0 + 0.4, 2.0, 0.26, 0.1, 0xe8a020); signBox(uv, x, 0.85, z0 + 0.34, 1.9, 0.24, 0.02, 5); }
    for (let x = x0 + 3; x < x1; x += 6) halos.push({ p: [x, 1.15, z0 + 0.2], size: 0.7, color: 0xffa020, k: 0.8, hazard: true });
    void hideSpots;
  }

  // ───────────── 駅舎（独自の意匠：ガラスの吹き抜け・両翼・大きな時計・大屋根） ─────────────
  function station(L) {
    const S = T.station, F = frame(L), H = 13, A0 = S.atrium[0] - L.rect[0], A1 = S.atrium[1] - L.rect[0], W = F.W, D = F.D;
    for (const [a, b] of [[0, A0], [A1, W]]) {
      const w = b - a, c = (a + b) / 2;
      F.box('tex', c, D / 2, H / 2, w, D, H, 0xb4b8bc, 'panel', { ts: 3.2, ao: true, edges: true });
      F.box('tex', c, -0.05, 9.6, w - 1, 0.1, 5.2, 0xffffff, 'louver', { ts: 2, tsy: 2 });
      F.box('texglow', c, -0.06, 5.7, w - 1.2, 0.08, 1.7, 0xc0b8a8, 'curtainwall_lit', { ts: 2.4, tsy: 1.7 });
      F.box('prop', c, -0.4, 4.6, w, 0.8, 0.2, 0x34363c);
      // 1 階：店（シャッター・灯りの店 1）
      const shops = Math.floor(w / 6.5);
      for (let i = 0; i < shops; i++) {
        const u = a + (i + 0.5) * w / shops, litShop = (i + (a > 0 ? 1 : 0)) % 3 === 0;
        F.box(litShop ? 'texglow' : 'tex', u, -0.06, 1.6, w / shops - 0.8, 0.08, 3.0, litShop ? 0xd8d4cc : 0xffffff, litShop ? 'konbini' : 'shutter', { ts: 2.4, tsy: 3.0 });
        if (litShop) { const [x, z] = F.at(u, -1.2); halos.push({ p: [x, 2.2, z], size: 2.4, color: 0xe8f0ff, k: 0.4 }); }
      }
      const names = a === 0 ? ['みやげ・観光案内（仮）', 'コーヒー（仮）'] : ['のりば案内　バス・タクシー', '駅のパン屋（仮）'];
      names.forEach((t, i) => { const uv = signUV(t, { bg: '#1e2430', fg: '#e8f0ff', size: 32 }); frontSign(F, uv, a + (i + 0.5) * w / 2, -0.05, 3.6, Math.min(8, w / 2 - 1), 0.5); });
    }
    // 吹き抜け（ガラスの壁・方立て）・中央口
    const AW = A1 - A0, AC = (A0 + A1) / 2, AH = 17.5;
    F.box('texglow', AC, 0.4, AH / 2, AW, 0.1, AH, 0xb4c4dc, 'curtainwall_lit', { ts: 3, tsy: 3.5 });
    for (let u = A0 + 0.1; u <= A1; u += 3) F.box('prop', u, -0.05, AH / 2, 0.22, 0.4, AH, 0x5a6068);
    for (let y = 4.2; y < AH; y += 3.5) F.box('prop', AC, -0.05, y, AW, 0.4, 0.16, 0x5a6068);
    F.box('prop', AC, D / 2, AH + 0.3, AW + 1, D, 0.6, 0x3a3c42);
    { const [x, z] = F.at(AC, 1.5); glowB(x, 5.5, z, AW - 2, 11, 0.2, 0x8090a8); lights.push({ id: 'station_hall', pos: [x, 4, z + 3.0 * F.out[1]], color: 0xe0ecff, intensity: 10, dist: 16, town: true }); }
    // 名前（独自）と時計・電光の案内（運転終了）
    const nameUV = signUV('駅　STATION', { bg: '#141820', fg: '#ffffff', size: 46, frameColor: '#6a7a9a' });
    const [nx, nz] = frontSign(F, nameUV, AC, -0.2, AH - 1.7, 13, 2.0, 0.2);
    halos.push({ p: [nx + F.out[0] * 0.8, AH - 1.6, nz + F.out[1] * 0.8], size: 6.5, color: 0xe8f0ff, k: 0.35, neon: true });
    const cuv = signUV('中央口', { bg: '#1e2430', fg: '#ffffff', size: 40 }); frontSign(F, cuv, AC, -0.1, 4.9, 5, 0.8);
    const led = signUV('本日の運転は終了しました', { bg: '#0a0806', fg: '#ffb040', size: 30, frame: false });
    const [lx, lz] = frontSign(F, led, AC, -0.12, 3.7, 7, 0.55); halos.push({ p: [lx, 3.7, lz + 0.5], size: 2.4, color: 0xffa030, k: 0.3 });
    for (const u of [AC - 3.5, AC, AC + 3.5]) F.box('glass', u, -0.1, 1.4, 3.0, 0.06, 2.8, 0x0e141c);
    // 時計（針だけ・数字は決めない）
    { const [cx, cz] = F.at(AC + AW / 2 + 4, -0.2), g = new THREE.CylinderGeometry(1.1, 1.1, 0.16, 28); g.rotateX(Math.PI / 2); g.translate(cx, 11.2, cz); B.add('glow', g, 0xe8ecf0);
      for (const [l, a] of [[0.85, 0.4], [0.6, 2.1]]) { const hg = new THREE.BoxGeometry(0.06, l, 0.04); hg.translate(0, l / 2, 0); hg.rotateZ(a); hg.translate(cx, 11.2, cz + 0.1); B.add('prop', hg, 0x101014); }
      halos.push({ p: [cx, 11.2, cz + 0.4], size: 2.8, color: 0xf0f4ff, k: 0.35 }); }
    spots.push({ id: 'station_board', kind: 'read', x: L.rect[0] + AC, z: S.front + 1.4, r: 1.6, label: '電光の案内を見る', text: 'town_station' });
    // 大屋根（ガラスと鉄骨）・柱（枝分かれ）・下の灯り
    const [cx0, cz0, cx1, cz1, cy] = S.canopy, cw = cx1 - cx0, cd = cz1 - cz0, ccx = (cx0 + cx1) / 2, ccz = (cz0 + cz1) / 2;
    glass(ccx, cy, ccz, cw, 0.06, cd, 0x7088a8);
    for (let x = cx0; x <= cx1 + 0.1; x += 6) prop(x, cy - 0.25, ccz, 0.22, 0.4, cd, 0x4a4e58, { edges: false });
    for (let z = cz0 + 1; z <= cz1; z += 3.3) prop(ccx, cy - 0.12, z, cw, 0.16, 0.12, 0x4a4e58, { edges: false });
    prop(ccx, cy - 0.2, cz1, cw + 0.4, 0.5, 0.3, 0x3a3e46, { edges: false }); glowB(ccx, cy - 0.48, cz1 + 0.16, cw, 0.06, 0.06, 0xe8f0ff);   // 大屋根の縁の灯りの線
    for (const [x, z] of canopyColumns(T)) {
      const g = new THREE.CylinderGeometry(0.2, 0.26, cy - 1.2, 12); g.translate(x, (cy - 1.2) / 2, z); B.add('prop', g, 0x5a5e68);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) prop(x + dx * 0.7, cy - 0.7, z + dz * 0.7, dx ? 1.6 : 0.12, 0.12, dz ? 1.6 : 0.12, 0x5a5e68, { edges: false, rz: dx * 0.6, rx: -dz * 0.6 });
    }
    for (let x = cx0 + 4; x < cx1; x += 8) for (const z of [cz0 + 4, cz1 - 2]) { glowB(x, cy - 0.5, z, 1.2, 0.05, 0.4, 0xf0f4ff); for (const dx of [-0.5, 0.5]) prop(x + dx, cy - 0.25, z, 0.025, 0.46, 0.025, 0x3a3e46, { edges: false }); halos.push({ p: [x, cy - 0.7, z], size: 1.8, color: 0xe8f0ff, k: 0.45 }); pool(x, z, 4.2, 0xe8f0ff, 0.22); }
    lights.push({ id: 'canopy_w', pos: [64, cy - 1, -104], color: 0xe8f0ff, intensity: 9, dist: 15, town: true }, { id: 'canopy_e', pos: [96, cy - 1, -104], color: 0xe8f0ff, intensity: 9, dist: 15, town: true });
  }

  // ───────────── 中央通り：路面・線・横断歩道・消雪の水の出口とさび・側溝・電停・架線・路面電車・バス ─────────────
  function avenue() {
    const A = T.avenue, { x0, x1, z0, z1 } = A;
    // 縁石（駅前通りが突き当たる所は空ける）
    for (const [x, gaps] of [[x0, [[4.5, 11.5]]], [x1, []]]) { let z = z0; for (const [a, b] of gaps.concat([[z1, z1]])) { if (a > z) tb('tex', x, 0.08, (z + a) / 2, 0.22, 0.18, a - z, 0xd0ccc4, 'curb', { ts: 2 }); z = b; } }
    for (const x of [x0 + 0.3, x1 - 0.3]) tb('tex', x, 0.006, (z0 + z1) / 2, 0.45, 0.02, z1 - z0, 0xb0b0ac, 'drain', { ts: 0.9 });
    // 車線の線（破線）・外側線・軌道の線（白い実線）
    for (const x of A.lanes) for (let z = z0 + 2; z < z1 - 2; z += 8) { if (z > -4 && z < 19) continue; prop(x, 0.012, z, 0.14, 0.02, 4, 0xe8e6de); }
    for (const x of [x0 + 0.5, x1 - 0.5, 76.5, 81.5]) { for (const [a, b] of [[z0, -4], [19, z1]]) prop(x, 0.012, (a + b) / 2, 0.12, 0.02, b - a, 0xe8e6de); }
    // 交差点の停止線・バスの字（外側の車線）
    prop(73.0, 0.014, -3.6, 5.6, 0.02, 0.4, 0xeceae2); prop(85.0, 0.014, 18.6, 5.6, 0.02, 0.4, 0xeceae2);
    for (const z of [32, 4.8, -20, -56]) for (const x of [71.8, 86.2]) { const g = new THREE.PlaneGeometry(2.4, 3.4); g.rotateX(-Math.PI / 2); if (x > 80) g.rotateY(Math.PI); g.translate(x, 0.02, z); K.addTile('tex', g, 'busmark', 0xffffff, { fit: true }); }
    // 横断歩道（中央通りを東西に渡る・駅前通りを渡る）
    for (const c of T.crossings) {
      if (!inPart((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2) || c.id === 'x_main' || c.id === 'x_fore') continue;
      if (c.along === 'x') for (let x = c.x0 + 0.4; x < c.x1 - 0.3; x += 0.9) prop(x + 0.22, 0.014, (c.z0 + c.z1) / 2, 0.45, 0.02, c.z1 - c.z0, 0xeceae2);
      else for (let z = c.z0 + 0.5; z < c.z1 - 0.3; z += 0.9) prop((c.x0 + c.x1) / 2, 0.014, z + 0.22, c.x1 - c.x0, 0.02, 0.45, 0xeceae2);
    }
    // 消雪の水の出口（道の真ん中の小さな口）と、さびの跡（橙〜茶色の筋）
    for (const n of A.nozzles) {
      const alongZ = n.x != null;
      for (let t = alongZ ? n.z0 : n.x0; t <= (alongZ ? n.z1 : n.x1); t += n.step) {
        const x = alongZ ? n.x : t, z = alongZ ? t : n.z;
        if (!inPart(x, z)) continue;
        if (alongZ && z > 0.4 && z < 15) continue;                          // 交差点の中は無し
        prop(x, 0.02, z, 0.16, 0.04, 0.16, 0x6a6460);
        const g = new THREE.PlaneGeometry(0.55, 1.5 + ((x * 7 + z * 3) % 1)); g.rotateX(-Math.PI / 2); if (!alongZ) g.rotateY(Math.PI / 2); g.translate(x, 0.017, z); K.addTile('tex', g, 'rust', 0xffffff, { fit: true });
      }
    }
    // 路面の水たまり（濡れた路面の映り込み）
    for (const [x, z, s] of [[72.5, 20, 3], [85, -6, 2.6], [74.5, -50, 3.2], [86, -70, 2.4], [83, 36, 2.8]]) { const g = new THREE.PlaneGeometry(s, s * 0.7); g.rotateX(-Math.PI / 2); g.rotateY((x + z) % 3); g.translate(x, 0.016, z); K.addTile('tex', g, 'puddle', 0xffffff, { fit: true }); }
  }
  /** 路面電車の線路（埋め込みの軌道・2 本のレール・溝）。輪の所は丸める */
  function tracks() {
    const A = T.avenue, g2 = A.gauge / 2;
    for (const tr of A.tracks) {
      const P = resample(filletPath(tr.pts, tr.r, 0.9), 10);
      for (let i = 0; i < P.length - 1; i++) {
        const [ax, az] = P[i], [bx, bz] = P[i + 1], mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (!inPart(mx, mz)) continue;
        const len = Math.hypot(bx - ax, bz - az); if (len < 0.01) continue;
        const ry = Math.atan2(bx - ax, bz - az), nx = Math.cos(ry), nz = -Math.sin(ry);
        B.box('tex', mx, 0.004, mz, 2.3, 0.01, len + 0.04, 0xffffff, { tile: 'trackbed', ts: 2.2, ry, edges: false });
        for (const s of [-1, 1]) { prop(mx + nx * g2 * s, 0.016, mz + nz * g2 * s, 0.075, 0.016, len + 0.02, 0xa8acb2, { ry, edges: false }); prop(mx + nx * (g2 - 0.07) * s, 0.014, mz + nz * (g2 - 0.07) * s, 0.05, 0.012, len + 0.02, 0x141414, { ry, edges: false }); }
      }
    }
  }
  /** 電停（島・点字ブロック・手すり・屋根・ベンチ・名前の札・電光の案内） */
  function stops() {
    for (const st of T.avenue.stops) {
      const [x0, z0, x1, z1] = st.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
      if (!inPart(cx, cz)) continue;
      const alongX = w > d;
      tb('tex', cx, 0.12, cz, w, 0.24, d, 0xc8c4bc, 'concrete', { ts: 2 });
      const edge = alongX ? [cx, z1 + (st.station ? 0.3 : -0.3)] : [st.rail === 'W' ? x1 - 0.35 : x0 + 0.35, cz];
      tb('tex', edge[0], 0.245, edge[1], alongX ? w : 0.3, 0.01, alongX ? 0.3 : d, 0xffffff, 'tactile', { ts: 0.6 });
      if (st.rail) {
        const rx = st.rail === 'W' ? x0 + 0.06 : x1 - 0.06;
        prop(rx, 1.05, (z0 + z1 - 1.2) / 2, 0.06, 0.06, d - 1.2, 0xd8dcd8); prop(rx, 0.6, (z0 + z1 - 1.2) / 2, 0.04, 0.04, d - 1.2, 0xd8dcd8);
        for (let z = z0; z < z1 - 1.2; z += 2) prop(rx, 0.65, z, 0.06, 0.8, 0.06, 0xc8ccc8);
        prop(cx, 1.05, z0 + 0.06, w, 0.06, 0.06, 0xd8dcd8);
        const [za, zb] = st.shelter, sx = st.rail === 'W' ? x0 + 0.25 : x1 - 0.25;
        for (const [px, pz] of stopPosts(st)) prop(px, 1.4, pz, 0.1, 2.8, 0.1, 0x5a6068);
        glass((x0 + x1) / 2, 2.85, (za + zb) / 2, w + 0.06, 0.05, zb - za + 0.6, 0x6a88a8);   // P13：屋根は島の幅（前は電車の側へ出て車体に重なった）
        prop(sx, 2.8, (za + zb) / 2, 0.16, 0.14, zb - za + 0.6, 0x4a4e58);
        glass(sx, 1.5, (za + zb) / 2, 0.04, 1.6, zb - za - 0.6, 0x5a7090);
        glowB(cx, 2.76, (za + zb) / 2, 0.2, 0.04, zb - za - 1, 0xe8f0ff);
        halos.push({ p: [cx, 2.6, (za + zb) / 2 - 2], size: 1.8, color: 0xe8f0ff, k: 0.5 }, { p: [cx, 2.6, (za + zb) / 2 + 2], size: 1.8, color: 0xe8f0ff, k: 0.5 });
        pool(cx, (za + zb) / 2, 4, 0xe8f0ff, 0.2);
        FK.bench(sx + (st.rail === 'W' ? 0.3 : -0.3), (za + zb) / 2, st.rail === 'W' ? Math.PI / 2 : -Math.PI / 2, 2.4, { y0: 0.24, d: 0.42 });   // P13：脚のあるベンチ（前は板だけ浮いていた）
      }
      // 名前の札（柱）・電光の案内
      const [px, pz] = alongX ? [x0 + 1.2, cz] : [cx, z1 - 0.6];
      prop(px, 1.6, pz, 0.08, 3.2, 0.08, 0x8a8e94);
      const nuv = signUV(st.name, { bg: '#f4f4ee', fg: '#1a3a6a', size: 30, frameColor: '#2a6ad0' });
      signBox(nuv, px, 2.85, pz, alongX ? 0.04 : 1.6, 0.42, alongX ? 1.6 : 0.04, alongX ? 0 : 4);
      const led = signUV('次の電車：回送　運転見合わせ中', { bg: '#080604', fg: '#ffb040', size: 26, frame: false });
      const [lx, lz] = alongX ? [cx, z0 + 0.2] : [cx, st.shelter[0] + 1.6];   // P13：屋根の下に吊る（屋根の無い駅前は 2 本の柱）
      prop(lx, 2.5, lz, alongX ? 2.4 : 0.1, 0.5, alongX ? 0.1 : 2.4, 0x2a2c30);
      if (st.rail) for (const o of [-0.9, 0.9]) prop(lx, 2.79, lz + o, 0.03, 0.08, 0.03, 0x3a3e46, { edges: false });
      else for (const o of [-1.0, 1.0]) prop(lx + o, 1.245, lz, 0.07, 2.01, 0.07, 0x5a6068);
      signBox(led, lx + (alongX ? 0 : (st.rail === 'W' ? 0.06 : -0.06)), 2.5, lz + (alongX ? 0.06 : 0), alongX ? 2.2 : 0.02, 0.36, alongX ? 0.02 : 2.2, alongX ? 4 : (st.rail === 'W' ? 0 : 1));
      halos.push({ p: [lx, 2.5, lz + (alongX ? 0.4 : 0)], size: 1.2, color: 0xffa030, k: 0.3 });
      if (st.id === 'tsW') spots.push({ id: 'tram_stop', kind: 'read', x: cx, z: z1 - 1.2, r: 1.3, label: '電停の時刻表', text: 'town_tram' });
      hideSpots.push({ x: cx, z: cz });
    }
  }
  /** 架線の柱と電線（線路の上 5.9m の電車線・6.7m の吊り線・つり下げ） */
  function catenary() {
    const A = T.avenue;
    for (const [x, z] of catenaryPoles(T)) {
      if (!inPart(x, z)) continue;
      const g = new THREE.CylinderGeometry(0.12, 0.16, 7.4, 10); g.translate(x, 3.7, z); B.add('prop', g, 0x6a6e74);
      prop(x, 6.6, z, 3.6, 0.1, 0.1, 0x5a5e64, { edges: false }); prop(x, 6.0, z, 3.0, 0.06, 0.06, 0x5a5e64, { edges: false });
      prop(x, 0.25, z, 0.5, 0.5, 0.5, 0x8a8e94);
    }
    for (const tr of A.tracks) {
      const P = resample(filletPath(tr.pts, tr.r, 3), 5);
      for (const o of [0]) {
        let prev = null;
        P.forEach(([x, z], i) => {
          const zz = (i % 2 ? 0.12 : -0.12) + o, cur = [x + zz * 0.3, 5.9, z];
          if (prev && inPart((prev[0] + x) / 2, (prev[2] + z) / 2)) { wirePts.push(...prev, ...cur); if (i % 2 === 0) { wirePts.push(cur[0], 5.9, cur[2], cur[0], 6.6, cur[2]); } catenaryPts(wirePts, [prev[0], 6.7, prev[2]], [x, 6.7, z], 0.12); }
          prev = cur;
        });
      }
    }
  }
  /** 路面電車（独自の意匠：2 両つなぎの低床車。白い車体・青緑の裾・こはく色の帯・一本腕のパンタグラフ）
   *  P13：台車（車輪 4・裾の覆い）でレールの上に載せる（前は車体が 0.3m 浮いていた）。幅 2.3m（電停の島・架線の柱に当たらない）。
   *  行き先の電光は車体の前の面の外（前は車体の中に埋まって見えなかった）。扉の枠・屋根の冷房・つなぎの幌・連結器。 */
  function tram(t) {
    const L = t.len, cars = [-1, 1], bx = boxLocal(t.x, t.z, t.ry), at = at2(t.x, t.z, t.ry), half = L / 2, cl = (L - 0.5) / 2, W = 2.3;
    const WHITE = 0xe6eaee, TEAL = 0x1c5a62, AMBER = 0xe0a030, DARK = 0x26282c, g2 = T.avenue.gauge / 2;
    // 傾けた部品（前のガラス・パンタグラフの腕）：車体の向き（ry）の前に、車体の座標で傾ける（Builder の rx は世界の軸なので、横向きの電車でずれていた）
    const tiltB = (key, lx, y, lz, w, h, d, color, rx) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateX(rx); g.translate(lx, y, lz); g.rotateY(t.ry); g.translate(t.x, 0, t.z); B.add(key, g, color); };
    const wheel = (lx, lz) => { const g = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14); g.rotateZ(Math.PI / 2); g.translate(lx, 0.3, lz); g.rotateY(t.ry); g.translate(t.x, 0, t.z); B.add('prop', g, 0x1a1a1e); };
    for (const c of cars) {
      const lz = c * (cl / 2 + 0.25);
      bx('prop', 0, 0.75, lz, W, 0.9, cl, TEAL);
      bx(t.lit ? 'glow' : 'glass', 0, 1.85, lz, W - 0.04, 1.25, cl - 0.6, t.lit ? 0xb8c8d4 : 0x10141c);
      for (let k = -cl / 2 + 0.6; k <= cl / 2 - 0.5; k += 1.35) bx('prop', 0, 1.85, lz + k, W + 0.04, 1.27, 0.14, WHITE);
      bx('prop', 0, 2.85, lz, W, 0.75, cl, WHITE);
      bx('prop', 0, 1.18, lz, W + 0.04, 0.1, cl, AMBER);
      bx('prop', 0, 3.33, lz, W - 0.3, 0.24, cl - 0.4, 0x9aa0a6);
      bx('prop', 0, 3.6, lz + c * 0.8, 1.4, 0.32, 2.2, 0xb8bcc0);                                     // 屋根の冷房
      for (const s of [-1, 1]) {                                                                      // 扉（2 枚のガラス・枠）
        bx('glass', s * (W / 2 + 0.015), 1.5, lz - c * 1.6, 0.04, 2.0, 1.3, 0x0c1016);
        bx('prop', s * (W / 2 + 0.02), 1.5, lz - c * 1.6, 0.04, 2.06, 0.06, 0x4a4e54); bx('prop', s * (W / 2 + 0.02), 2.52, lz - c * 1.6, 0.03, 0.05, 1.36, 0x4a4e54);
      }
      // 台車：裾の覆い（黒）と車輪（レールの上）
      const bz = lz - c * 0.2;
      bx('prop', 0, 0.2, bz, W - 0.2, 0.22, 2.3, DARK);
      for (const s of [-1, 1]) for (const wz of [-0.75, 0.75]) wheel(s * g2, bz + wz);
    }
    bx('prop', 0, 1.6, 0, 2.1, 2.6, 0.5, 0x2a2a30);                                                   // つなぎの幌
    bx('prop', 0, 0.2, 0, 2.0, 0.22, 0.6, DARK);
    for (const s of [-1, 1]) for (const wz of [-0.2, 0.2]) wheel(s * g2, wz);
    // 前と後ろ（運転台）
    for (const e of [-1, 1]) {
      const lz = e * (half - 0.15);
      tiltB('glass', 0, 2.05, lz, W - 0.1, 1.35, 0.08, 0x0c1218, e * 0.22);
      bx('prop', 0, 0.9, lz + e * 0.05, W - 0.04, 1.3, 0.3, TEAL); bx('prop', 0, 1.18, lz + e * 0.1, W - 0.02, 0.1, 0.3, AMBER);
      bx('prop', 0, 2.95, lz - e * 0.1, W - 0.1, 0.5, 0.3, WHITE);
      bx('prop', 0, 0.42, lz + e * 0.25, 0.3, 0.14, 0.2, 0x3a3c40);                                  // 連結器のふた
      const dUV = signUV(t.dest, { bg: '#080604', fg: '#ffb040', size: 40, frame: false });
      const [dx, dz] = at(0, e * (half + 0.02)); B.box('sign', dx, 2.95, dz, 1.5, 0.32, 0.04, 0xffffff, { uv: dUV, face: e > 0 ? 4 : 5, ry: t.ry, edges: false });
      for (const s of [-0.8, 0.8]) { bx('glow', s, 0.95, lz + e * 0.22, 0.26, 0.14, 0.04, e > 0 ? 0xfff4d8 : 0xff3020); const [hx, hz] = at(s, lz + e * 0.4); halos.push({ p: [hx, 0.95, hz], size: e > 0 ? 1.2 : 0.8, color: e > 0 ? 0xfff0d0 : 0xff3020, k: e > 0 ? 0.7 : 0.5, hazard: !!t.hazard && e < 0 }); }
    }
    // パンタグラフ（電線 5.9m に届く）：台・下の腕・上の腕・すり板
    { const lz = -(cl / 2 + 0.25); bx('prop', 0, 3.55, lz, 1.0, 0.12, 1.0, 0x3a3c40); tiltB('prop', 0, 4.28, lz - 0.35, 0.08, 1.7, 0.08, 0x2a2c30, 0.62); tiltB('prop', 0, 5.3, lz - 0.2, 0.08, 1.3, 0.08, 0x2a2c30, -0.5); bx('prop', 0, 5.86, lz, 1.5, 0.06, 0.12, 0x2a2c30); }
    if (t.lit) { const [lx, lz] = at(0, 0); lights.push({ id: 'tram_' + t.id, pos: [lx, 2.6, lz], color: 0xd8e8ff, intensity: 6, dist: 10, town: true }); halos.push({ p: [lx, 2.0, lz], size: 3, color: 0xd8e8ff, k: 0.25 }); }
    if (t.hazard) { const [hx, hz] = at(0, half); spots.push({ id: 'tram_stopped', kind: 'read', x: hx + 2.4, z: hz + 1.0, r: 1.6, label: '止まった路面電車', text: 'town_tramcar' }); }
  }
  /** バス（独自の意匠：白に青い帯・行き先の電光） */
  function bus(b) {
    const bx = boxLocal(b.x, b.z, b.ry), at = at2(b.x, b.z, b.ry), L = 10.5, BLUE = 0x2a5aa8, WHITE = 0xe8e8e4;
    bx('prop', 0, 0.85, 0, 2.5, 1.1, L, WHITE); bx('prop', 0, 1.32, 0, 2.52, 0.14, L + 0.04, BLUE);
    bx(b.lit ? 'glow' : 'glass', 0, 2.05, -0.3, 2.48, 1.1, L - 1.4, b.lit ? 0xbcccd8 : 0x0e1218);
    for (let k = -L / 2 + 1.2; k < L / 2 - 1; k += 1.6) bx('prop', 0, 2.05, k, 2.54, 1.12, 0.12, WHITE);
    bx('prop', 0, 2.85, 0, 2.5, 0.5, L, WHITE); bx('prop', 0, 3.15, 0.5, 2.2, 0.25, 4, 0xc8ccd0);
    bx('glass', 0, 1.9, L / 2 - 0.02, 2.3, 1.5, 0.06, 0x0e1218); bx('prop', 0, 0.8, L / 2, 2.46, 0.9, 0.1, WHITE);
    const dUV = signUV(b.dest, { bg: '#080604', fg: '#ffb040', size: 32, frame: false });
    const [dx, dz] = at(0, L / 2 + 0.04); B.box('sign', dx, 2.85, dz, 1.9, 0.32, 0.04, 0xffffff, { uv: dUV, face: 4, ry: b.ry, edges: false });
    for (const s of [-0.95, 0.95]) { bx('glow', s, 0.75, L / 2 + 0.06, 0.3, 0.16, 0.04, 0xfff4d8); bx('glow', s, 0.85, -L / 2 - 0.04, 0.2, 0.3, 0.04, 0xa02018); const [hx, hz] = at(s, L / 2 + 0.3); halos.push({ p: [hx, 0.75, hz], size: 1.0, color: 0xfff0d0, k: 0.55 }); }
    for (const [wx, wz] of [[-1.15, 3.3], [1.15, 3.3], [-1.15, -3.0], [1.15, -3.0]]) { const g = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 14); g.rotateZ(Math.PI / 2); g.translate(wx, 0.48, wz); g.rotateY(b.ry); g.translate(b.x, 0, b.z); B.add('prop', g, 0x18181c); }
    if (b.lit) { const [lx, lz] = at(0, 0); halos.push({ p: [lx, 2.0, lz], size: 2.6, color: 0xd8e8ff, k: 0.22 }); }
  }

  // ───────────── 駅前広場（電停・バスターミナル・タクシーのりば・駐輪場・時計・屋根つきの歩道・植え込み） ─────────────
  function stationPlaza() {
    const S = T.station;
    // 時計の塔（独自の形：細い四角の柱・四面の時計）
    { const [x, z] = S.clock; tb('tex', x, 2.8, z, 0.9, 5.6, 0.9, 0xc8ccd0, 'panel', { ts: 1.2 }); prop(x, 6.6, z, 1.5, 0.3, 1.5, 0x3a3e46);
      for (const [dx, dz, ry] of [[0, 0.62, 0], [0, -0.62, Math.PI], [0.62, 0, Math.PI / 2], [-0.62, 0, -Math.PI / 2]]) { const g = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24); g.rotateX(Math.PI / 2); g.rotateY(ry); g.translate(x + dx, 5.9, z + dz); B.add('glow', g, 0xeef2f4);
        for (const [l, a] of [[0.42, 0.9], [0.3, 2.6]]) { const hg = new THREE.BoxGeometry(0.04, l, 0.03); hg.translate(0, l / 2, 0); hg.rotateZ(a); hg.rotateY(ry); hg.translate(x + dx * 1.08, 5.9, z + dz * 1.08); B.add('prop', hg, 0x101014); } }
      prop(x, 6.0, z, 1.2, 1.4, 1.2, 0x5a5e68);
      halos.push({ p: [x, 5.9, z], size: 2.6, color: 0xf0f4ff, k: 0.4 }); prop(x, 0.3, z, 1.3, 0.6, 1.3, 0x8a8e94);
      const uv = signUV('駅前広場（仮）', { bg: '#1e2430', fg: '#e8f0ff', size: 34 }); signBox(uv, x, 3.6, z + 0.47, 0.8, 0.3, 0.02, 4); }
    // 駐輪場（屋根・ラック・自転車）
    { const [x0, z0, x1, z1] = S.bikes.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      for (const [x, z] of [[x0 + 0.2, z0 + 0.3], [x1 - 0.2, z0 + 0.3], [x0 + 0.2, z1 - 0.3], [x1 - 0.2, z1 - 0.3]]) prop(x, 1.2, z, 0.12, 2.4, 0.12, 0x6a6e74);
      prop(cx, 2.4, cz, x1 - x0 + 0.4, 0.08, z1 - z0 + 0.3, 0x7a8a98); glowB(cx, 2.34, cz, x1 - x0 - 1, 0.03, 0.2, 0xe8f0ff); halos.push({ p: [cx, 2.2, cz], size: 2.2, color: 0xe8f0ff, k: 0.35 });
      for (const z of [z0 + 1.6, z1 - 1.6]) { prop(cx, 0.35, z, x1 - x0 - 0.4, 0.06, 0.06, 0x9aa0a8); for (let x = x0 + 0.8, k = 0; x < x1 - 0.4; x += 0.85, k++) if (k % 5 !== 3) bike(x, z, Math.PI / 2, [0x2a2a30, 0xb03a3a, 0x3a6ab0, 0xe8e8e0, 0x3a7a4a, 0xd8c040][k % 6]); }
      const uv = signUV('駐輪場（仮）　自転車', { bg: '#2a6ad0', fg: '#ffffff', size: 30 }); signBox(uv, cx, 2.15, z1 + 0.05, 2.4, 0.4, 0.04, 4); }
    // タクシーのりば（車の列・屋根・札）
    { const [lx0, lz0, lx1, lz1] = S.taxi.lane;
      B.box('tex', (lx0 + lx1) / 2, 0.003, (lz0 + lz1) / 2, lx1 - lx0, 0.01, lz1 - lz0, 0xffffff, { tile: 'asphalt', ts: 6, edges: false });
      for (const x of [lx0 + 0.15, lx1 - 0.15]) prop(x, 0.012, (lz0 + lz1) / 2, 0.12, 0.02, lz1 - lz0, 0xe8e6de);
      prop(47.4, 0.012, (lz0 + lz1) / 2, 0.12, 0.02, lz1 - lz0 - 4, 0xe8d070);
      for (const [x, z, ry] of S.taxi.cars) { car({ x, z, ry, color: [0x2a2a2e, 0xe8c830, 0x2a4a7a, 0xe8e8e8][Math.round(-z) % 4] }); prop(x, 1.49, z, 0.5, 0.18, 0.2, 0xf0f0e8); glowB(x, 1.49, z + 0.11, 0.42, 0.12, 0.02, 0xffe080); }
      const [sx, sz] = S.taxi.stand;
      for (const dx of [-1.5, 1.5]) prop(sx + dx, 1.2, sz, 0.1, 2.4, 0.1, 0x5a6068);
      glass(sx, 2.45, sz + 0.4, 3.6, 0.05, 1.8, 0x6a88a8); prop(sx, 2.42, sz, 3.6, 0.1, 0.12, 0x4a4e58); glass(sx, 1.3, sz, 2.92, 1.6, 0.04, 0x5a7090); prop(sx, 0.48, sz, 2.92, 0.06, 0.06, 0x4a4e58);
      const uv = signUV('タクシーのりば', { bg: '#1a2a4a', fg: '#ffffff', size: 36 }); signBox(uv, sx, 2.67, sz + 0.04, 2.2, 0.4, 0.04, 4);
      glowB(sx, 2.41, sz + 0.4, 2.4, 0.03, 0.2, 0xe8f0ff); halos.push({ p: [sx, 2.2, sz + 0.6], size: 1.8, color: 0xe8f0ff, k: 0.45 }); }
    // バスターミナル（島・屋根・のりばの札・時刻表）
    { const isl = S.bus.islands;
      B.box('tex', 101, 0.003, -95, 6, 0.01, 22, 0xffffff, { tile: 'asphalt', ts: 6, edges: false });
      isl.forEach(([x0, z0, x1, z1], i) => {
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        tb('tex', cx, 0.12, cz, x1 - x0, 0.24, z1 - z0, 0xc8c4bc, 'concrete', { ts: 2 });
        tb('tex', i === 0 ? x1 - 0.25 : x0 + 0.25, 0.245, cz, 0.3, 0.01, z1 - z0, 0xffffff, 'tactile', { ts: 0.6 });
        for (let z = z0 + 2; z < z1 - 1; z += 5.5) prop(x0 + 0.18, 1.4, z, 0.1, 2.8, 0.1, 0x5a6068);
        glass(cx, 2.85, cz, x1 - x0 + 0.8, 0.05, z1 - z0 - 1, 0x6a88a8); prop(x0 + 0.18, 2.8, cz, 0.14, 0.14, z1 - z0 - 1, 0x4a4e58);
        glowB(cx, 2.78, cz, 0.2, 0.04, z1 - z0 - 3, 0xe8f0ff);
        for (let k = 0; k < 2; k++) {
          const z = z0 + 5 + k * 11, bay = S.bus.bays[i * 2 + k];
          const uv = signUV(bay + '番のりば　' + ['駅前循環', '中央通り経由', '病院方面', '体育館方面'][i * 2 + k] + '（仮）', { bg: '#f4f4ee', fg: '#1a3a6a', size: 28, frameColor: '#2a5aa8' });
          prop(cx, 1.5, z, 0.08, 3.0, 0.08, 0x8a8e94); signBox(uv, cx, 2.45, z, 0.04, 0.42, 1.9, 0);
          glowB(cx + 0.05, 1.3, z + 1.2, 0.04, 0.9, 0.7, 0xd8e8f0); prop(cx, 0.785, z + 1.2, 0.06, 1.09, 0.06, 0x8a8e94); halos.push({ p: [cx + 0.3, 1.3, z + 1.2], size: 1.0, color: 0xd8e8ff, k: 0.3 });
          halos.push({ p: [cx, 2.6, z], size: 1.8, color: 0xe8f0ff, k: 0.45 });
        }
        FK.bench(cx, cz + 3, i === 0 ? Math.PI / 2 : -Math.PI / 2, 2.4, { y0: 0.24, d: 0.42 });
      });
      for (const z of [-101, -90]) { const g = new THREE.PlaneGeometry(2.4, 3.4); g.rotateX(-Math.PI / 2); g.translate(101, 0.02, z); K.addTile('tex', g, 'busmark', 0xffffff, { fit: true }); }
      spots.push({ id: 'bus_board', kind: 'read', x: 97, z: -98.5, r: 1.4, label: 'バスの時刻表', text: 'town_bus' }); }
    // 屋根つきの歩道（大屋根 → 中央通りの東の歩道）
    { const w = S.walkway, cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;
      for (const [x, z] of walkwayPosts(T)) prop(x, 1.4, z, 0.1, 2.8, 0.1, 0x5a6068);
      glass(cx, 2.9, cz, w.x1 - w.x0 + 0.6, 0.05, w.z1 - w.z0, 0x7088a8); for (const x of [w.x0 + 0.1, w.x1 - 0.1]) prop(x, 2.85, cz, 0.12, 0.14, w.z1 - w.z0, 0x4a4e58);
      for (let z = w.z0 + 2; z < w.z1; z += 4) { glowB(cx, 2.86, z, 0.6, 0.03, 0.3, 0xf0f4ff); halos.push({ p: [cx, 2.65, z], size: 1.2, color: 0xe8f0ff, k: 0.45 }); }
      tb('tex', cx, 0.003, cz, w.x1 - w.x0, 0.01, w.z1 - w.z0, 0xffffff, 'granite', { ts: 3 }); }
    // 線路の輪の中の植え込み（雪囲いの木・石の縁）
    { const [x0, z0, x1, z1] = S.island, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      tb('tex', cx, 0.3, cz, x1 - x0, 0.6, z1 - z0, 0xffffff, 'stone', { ts: 1 }); tb('tex', cx, 0.62, cz, x1 - x0 - 0.4, 0.04, z1 - z0 - 0.4, 0xffffff, 'grass', { ts: 2 });
      for (let x = x0 + 2.5; x < x1 - 1; x += 4) yukigakoi(x, cz + (x % 8 < 4 ? -1.5 : 1.5), 0.6);
      tree(cx, cz, 6.5); }
    for (const [x, z] of S.benches) FK.bench(x, z, 0, 1.8, { d: 0.5 });
    // 広場の車の道（タクシー・バスの出入り）・横断歩道
    for (let x = 57; x < 64; x += 0.9) prop(x + 0.22, 0.014, -80.2, 0.45, 0.02, 2.6, 0xeceae2);
    hideSpots.push({ x: 64.5, z: -82.6 }, { x: 55.5, z: -84.2 }, { x: 99.2, z: -86 });
  }
  /** 雪囲い（低い木に竹の骨組みと縄・わら） */
  function yukigakoi(x, z, y0 = 0) {
    const c = new THREE.IcosahedronGeometry(0.6, 1); c.scale(1, 0.9, 1); c.translate(x, y0 + 0.55, z); applyTile(c, 'hedge', { ts: 1 }); B.add('tex', c, 0x8aa080, false);
    const cone = new THREE.ConeGeometry(0.75, 2.0, 8, 1, true); cone.translate(x, y0 + 1.0, z); applyTile(cone, 'straw', { ts: 0.8 }); B.add('tex', cone, 0xd8c8a0, false);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, g = new THREE.CylinderGeometry(0.025, 0.025, 2.4, 4); g.translate(0, 1.2, 0); g.rotateX(-0.36); g.rotateY(a); g.translate(x + Math.sin(a) * 0.78, y0, z + Math.cos(a) * 0.78); B.add('prop', g, 0xb8a060); }
    for (const [ry, rr] of [[0.55, 0.6], [1.25, 0.33]]) { const t = new THREE.TorusGeometry(rr, 0.03, 4, 14); t.rotateX(Math.PI / 2); t.translate(x, y0 + ry, z); B.add('prop', t, 0x4a3018); }
  }

  // ───────────── ガラスの屋根の広場（近い所：起動の時に組み立てる） ─────────────
  function gplaza() {
    const G = T.gplaza, [x0, z0, x1, z1] = G.rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0, ry0 = G.roofY, rY = G.ridgeY;
    // 柱（細い鉄骨）と梁
    for (const [x, z] of G.cols) { prop(x, ry0 / 2, z, 0.4, ry0, 0.4, 0x4a4e58); prop(x, 0.3, z, 0.7, 0.6, 0.7, 0x6a6e74); }
    for (const z of [z0 + 0.3, z1 - 0.3, -20.2]) prop(cx, ry0 - 0.3, z, W, 0.5, 0.3, 0x4a4e58, { edges: false });
    for (const x of [x0 + 0.3, x1 - 0.3]) prop(x, ry0 - 0.3, cz, 0.3, 0.5, D, 0x4a4e58, { edges: false });
    // ガラスの切妻屋根（棟は南北）：2 枚の傾いた面・垂木・母屋・棟
    const half = W / 2, th = Math.atan2(rY - ry0, half), sl = Math.hypot(half, rY - ry0);
    for (const s of [-1, 1]) {
      const mx = cx + s * half / 2, my = (ry0 + rY) / 2;
      glass(mx, my, cz, sl + 0.4, 0.05, D + 0.8, 0x7a98c0, { rz: -s * th });
      for (let z = z0; z <= z1 + 0.01; z += 2.75) prop(mx, my - 0.14, z, sl, 0.16, 0.1, 0x3e424c, { rz: -s * th, edges: false });
      for (const f of [0.25, 0.5, 0.75]) prop(cx + s * half * (1 - f), ry0 + (rY - ry0) * f - 0.12, cz, 0.12, 0.12, D, 0x3e424c, { edges: false });
    }
    prop(cx, rY + 0.05, cz, 0.3, 0.3, D + 0.8, 0x3a3e46, { edges: false });
    // 妻のガラス（南）・横のガラス（建物の屋根の上）
    { const tri = new THREE.BufferGeometry(); const P = [x0, ry0, z1, x1, ry0, z1, cx, rY, z1]; tri.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); B.add('glass2', tri, 0x7a98c0, false); }
    glass(cx, (10.5 + ry0) / 2, z1, W, ry0 - 10.5, 0.04, 0x6a88b0);
    glass(x0, (11 + ry0) / 2, cz, 0.04, ry0 - 11, D, 0x6a88b0);
    glass(x1, (7 + ry0) / 2, cz, 0.04, ry0 - 7, D, 0x6a88b0);
    for (let z = z0 + 2.75; z < z1; z += 2.75) { prop(x0, (11 + ry0) / 2, z, 0.1, ry0 - 11, 0.1, 0x3e424c, { edges: false }); prop(x1, (7 + ry0) / 2, z, 0.1, ry0 - 7, 0.1, 0x3e424c, { edges: false }); }
    // 吊りの灯り（ペンダント）・灯りのたまり・磨いた石の床の映り込み
    for (const [x, z] of [[16, -12], [23.3, -12], [30.6, -12], [16, -21], [30.6, -21], [16, -28], [23.3, -26], [30.6, -28]]) {
      prop(x, (ry0 + 7.2) / 2, z, 0.03, ry0 - 7.2, 0.03, 0x2a2c30, { edges: false });
      glowB(x, 7.0, z, 0.7, 0.35, 0.7, 0xfff0d8); halos.push({ p: [x, 6.9, z], size: 2.2, color: 0xffe8c8, k: 0.6 });
      pool(x, z, 4.5, 0xffe8c8, 0.22); wet.push({ p: [x, 0, z], size: 1.6, color: 0xffe8c8, k: 0.35 });
    }
    lights.push({ id: 'gplaza_1', pos: [19, 6.5, -14], color: 0xffe8c8, intensity: 10, dist: 16, town: true }, { id: 'gplaza_2', pos: [28, 6.5, -26], color: 0xffe8c8, intensity: 10, dist: 16, town: true });
    // 舞台・照明のやぐら・大きな画面（北のビルの壁）
    { const [a, b, c, d] = G.stage, sx = (a + c) / 2, sz = (b + d) / 2;
      tb('tex', sx, 0.3, sz, c - a, 0.6, d - b, 0xffffff, 'wood', { ts: 1.2 }); prop(sx, 0.62, d, c - a, 0.06, 0.08, 0x2a2a2e);
      for (const x of [a + 0.3, c - 0.3]) prop(x, 3.2, b + 0.4, 0.25, 6.4, 0.25, 0x2a2c30);
      prop(sx, 6.4, b + 0.4, c - a, 0.3, 0.3, 0x2a2c30);
      for (let x = a + 2; x < c - 1; x += 2.5) { glowB(x, 6.1, b + 0.6, 0.35, 0.35, 0.3, 0xffd8f0); halos.push({ p: [x, 6.0, b + 0.9], size: 1.0, color: 0xff9ad8, k: 0.35 }); }
      for (const x of [a + 0.8, c - 0.8]) prop(x, 1.3, d - 0.6, 0.7, 1.4, 0.6, 0x1a1a1e);
      const [scx, scz, sw, sh] = G.screen;
      prop(scx, 9.2, scz + 0.05, sw + 0.4, sh + 0.4, 0.2, 0x1a1a20);
      const suv = K.atlas.add((g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1a1040'); gr.addColorStop(1, '#3a1a50'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e0ff'; g.font = `bold 26px ${JP_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ひかり広場（仮）　本日の催しは中止します', w / 2, h / 2); });
      signBox(suv, scx, 9.2, scz + 0.17, sw, sh * 0.5, 0.02, 4);
      halos.push({ p: [scx, 9.2, scz + 1.2], size: 7, color: 0x9a7aff, k: 0.18 }); }
    // 段の席（ひな壇）・机と椅子・植え込み（木）
    for (const [a, b, c, d] of G.steps) { const sx = (a + c) / 2; for (let k = 0; k < 3; k++) tb('tex', sx, 0.135 + k * 0.27, b + k * 0.65 + (d - b - k * 0.65) / 2, c - a, 0.27, d - b - k * 0.65, 0xffffff, k % 2 ? 'wood' : 'concrete', { ts: 1.2 }); }
    for (const [x, z] of G.tables) {
      FK.roundTable(x, z, 0.55, 0.74);                                                     // P13：脚のある机と椅子（前は座面と背もたれが浮いていた）
      for (const [dx, dz] of [[0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) FK.chair(x + dx, z + dz, Math.atan2(-dx, -dz), 0x6a5a4a);
    }
    for (const [x, z] of G.planters) { tb('tex', x, 0.5, z, 1.6, 1.0, 1.6, 0xffffff, 'concrete', { ts: 1 }); tree(x, z, 5.2); }
    // 入口（駅前通りから）の屋根と看板・通り抜けの名前
    { const [a, b, c, d] = T.walk.find(w => w.id === 'gpass').rect, gx = (a + c) / 2;
      glass(gx, 4.3, (b + d) / 2, c - a, 0.05, d - b, 0x7088a8); prop(gx, 4.25, d, c - a + 0.4, 0.4, 0.3, 0x3a3e46);
      const uv = signUV(G.name + '　入口', { bg: '#1a1420', fg: '#ffe8c8', size: 34, frameColor: '#c8a070' });
      signBox(uv, gx, 4.75, d + 0.05, 5.4, 0.6, 0.08, 4); halos.push({ p: [gx, 4.75, d + 0.6], size: 3.2, color: 0xffd8a0, k: 0.4, neon: true });
      glowB(gx, 4.26, (b + d) / 2, 2.4, 0.03, 0.3, 0xfff0d8); halos.push({ p: [gx, 4.0, (b + d) / 2], size: 1.6, color: 0xfff0d8, k: 0.5 });
      wet.push({ p: [gx, 0, d + 1.5], size: 1.8, color: 0xffd8a0, k: 0.7 }); }
    // まわりの建物の壁（広場から見える窓）
    const kinds = ['win_dark', 'win_lit', 'win_curtain', 'win_dark', 'win_office_lit', 'win_office'];
    let n = 0;
    const wall = (xa, za, xb, zb, nx, nz, ys) => { const len = Math.hypot(xb - xa, zb - za), m = Math.max(1, Math.floor(len / 3.2)); for (const y of ys) for (let i = 0; i < m; i++) { const t = (i + 0.5) / m, x = xa + (xb - xa) * t + nx * 0.04, z = za + (zb - za) * t + nz * 0.04, k = kinds[(n++ * 7 + i) % kinds.length], lit = k === 'win_lit' || k === 'win_office_lit'; B.box(lit ? 'texglow' : 'tex', x, y, z, nx ? 0.06 : 1.6, 1.2, nz ? 0.06 : 1.6, lit ? 0xc8b8a0 : 0xffffff, { tile: k, fit: true, edges: false }); } };
    wall(10.5, -34, 10.5, -28, 1, 0, [4.9, 7.6]); wall(10.5, -22, 10.5, -7, 1, 0, [4.9, 7.6]);
    wall(10.6, -6.5, 20, -6.5, 0, -1, [4.4, 7.3]); wall(26, -6.5, 36, -6.5, 0, -1, [4.4]);
    wall(36.06, -19.5, 36.06, -9.6, -1, 0, [4.4, 7.3]); wall(36.06, -34, 36.06, -24, -1, 0, [4.4]);
    hideSpots.push({ x: 13.5, z: -29.8 }, { x: 32.8, z: -16.8 }, { x: 34.4, z: -9.4 });
    spots.push({ id: 'plaza_board', kind: 'read', x: 24, z: -29.4, r: 1.6, label: '広場の掲示（催しの知らせ）', text: 'town_plaza' });
  }
  /** 横丁（広場 → 中央通り）：飲み屋の長屋（南の側）・提灯・入口の門
   *  P13：前は看板（「おでん」など）が何も無い所に浮き、提灯の列も宙に浮いていた。→ 南の側（n7 の裏の空き地）に 2 階建ての
   *  飲み屋の長屋 4 軒（world/shopkit.js：戸口・のれん・赤ちょうちん・窓・店の中のカウンターと品書き）。北の側の提灯は
   *  居酒屋のひさしの縁から吊る。空き地は塀で閉じ、町家の横の面には勝手口・窓・室外機。入口の看板は門の梁に吊る。 */
  function yokocho() {
    const Y = T.walk.find(w => w.id === 'yokocho').rect, [x0, z0, x1, z1] = Y;
    const SK = shopKit({ B, signUV, halos, wet, pool });
    const units = [['焼き鳥（仮）', 'yakitori'], ['おでん（仮）', 'oden'], ['立ち飲み（仮）', 'tachinomi'], ['スナック 雪（仮）', 'snack']];
    units.forEach(([name, kind], i) => SK.unit([44 + i * 4, z1, 48 + i * 4, z1 + 4.4], 'N', kind, name, { seed: 31 + i * 17, lanternRight: i === 2 }));
    // 北の側：居酒屋（w4）のひさしの縁から吊った提灯（赤・白）
    let k = 0;
    for (let x = x0 + 1.5; x < 49.5; x += 2.5) {
      const red = (k++ % 3) !== 2, z = z0 + 1.0, g = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10); g.translate(x, 2.25, z); B.add('glow', g, red ? 0xe0402a : 0xf0e0c0);
      for (const dy of [-0.23, 0.23]) prop(x, 2.25 + dy, z, 0.26, 0.04, 0.26, 0x1a1414, { edges: false });
      prop(x, 2.56, z, 0.02, 0.2, 0.02, 0x1a1414, { edges: false });
      halos.push({ p: [x, 2.25, z + 0.3], size: 1.2, color: red ? 0xff6040 : 0xffe0b0, k: 0.7, lantern: false, flicker: k % 7 === 0 });
    }
    // 北の側の空き地（x 50〜54）：ブロック塀・植木鉢。町家（w1）の横の面：勝手口・窓・室外機・配管
    tb('tex', 52.05, 0.9, z0 - 0.08, 3.9, 1.8, 0.16, 0xffffff, 'block', { ts: 1.2 }); prop(52.05, 1.84, z0 - 0.08, 3.9, 0.08, 0.2, 0x8a8884);
    for (const x of [51, 52.6]) { const g = new THREE.CylinderGeometry(0.2, 0.16, 0.36, 10); g.translate(x, 0.18, z0 + 0.25); B.add('prop', g, 0x8a5a3a); const f = new THREE.IcosahedronGeometry(0.26, 0); f.translate(x, 0.5, z0 + 0.25); B.add('prop', f, 0x3a6a3a); }
    const side = (xc, zf, nz, items) => {   // 町家の横の面（zf：面の z・nz：外の向き）
      const DF = { alongX: true, f: nz < 0 ? 'N' : 'S', out: [0, nz], at: (u, v) => [xc + u, zf - v * nz] };
      DF.box = (key, u, v, y, a2, b2, hh, color, tile, opt = {}) => { const [x, z] = DF.at(u, v); return B.box(key, x, y, z, a2, hh, b2, color, Object.assign({ tile, edges: false }, opt)); };
      if (items.door != null) { DF.box('tex', items.door, -0.03, 1.0, 0.85, 0.06, 2.0, 0x8a9098, 'door_house', { fit: true }); doorFrame(DF, items.door, 0, 0, 0.85, 2.0, 0x3a3430, 0.08); DF.box('prop', items.door, -0.35, 2.25, 1.1, 0.7, 0.06, 0x4a4642); const [lx, lz] = DF.at(items.door + 0.65, -0.07); B.box('glow', lx, 1.95, lz, 0.12, 0.16, 0.12, 0xffd8a0, { edges: false }); halos.push({ p: [lx, 1.95, lz + nz * 0.15], size: 0.8, color: 0xffd8a0, k: 0.6 }); }
      if (items.win != null) { DF.box('texglow', items.win, -0.02, 1.7, 0.9, 0.04, 0.7, 0xc8b090, 'win_shoji', { fit: true }); DF.box('prop', items.win, -0.04, 1.7, 1.0, 0.04, 0.8, 0x2a1c12); }
      if (items.ac != null) { DF.box('tex', items.ac, -0.18, 0.32, 0.8, 0.3, 0.6, 0xffffff, 'acunit', { fit: true }); DF.box('prop', items.ac, -0.03, 1.5, 0.06, 0.06, 2.2, 0x6a6a6a); }
      if (items.crates != null) for (let q = 0; q < 3; q++) DF.box('prop', items.crates + (q % 2) * 0.48, -0.25, 0.15 + Math.floor(q / 2) * 0.3, 0.45, 0.32, 0.3, q % 2 ? 0x2a6a3a : 0xc8a020);
    };
    side(54, z0 - 0.05, 1, { door: 3.2, win: 7.4, ac: 9.6 });
    side(60, z1 + 0.05, -1, { win: 1.8, crates: 3.6 });
    // 入口（広場の側）：門の柱・梁・梁から吊った看板
    for (const z of [z0 + 0.12, z1 - 0.12]) prop(x0 + 0.7, 2.0, z, 0.14, 4.0, 0.14, 0x2a1c14);
    prop(x0 + 0.7, 4.02, (z0 + z1) / 2, 0.16, 0.16, z1 - z0 - 0.1, 0x2a1c14);
    const uv = signUV('横丁（仮）　→ 中央通り', { bg: '#2a1a14', fg: '#ffe0b0', size: 30 }); signBox(uv, x0 + 0.7, 3.69, (z0 + z1) / 2, 0.06, 0.5, 2.4, 1);
    for (const dz of [-1.0, 1.0]) prop(x0 + 0.7, 3.97, (z0 + z1) / 2 + dz, 0.02, 0.06, 0.02, 0x1a1414, { edges: false });
    for (let x = x0 + 3; x < x1; x += 9) wet.push({ p: [x, 0, (z0 + z1) / 2], size: 1.4, color: 0xff7050, k: 0.6 });
    hideSpots.push({ x: x0 + 9, z: z0 + 0.7 }, { x: x1 - 6, z: z1 - 0.7 });
  }
  /** 信号（中央通りの交差点・駅前通りの東の端・電停の前）：歩行者の信号（柱）・車の信号（腕） */
  function newSignals(signals) {
    const poles = signalPoles(T); let pi = 0;
    for (const c of T.crossings) {
      if (!c.signal || c.id === 'x_main') continue;
      const ends = [poles[pi++], poles[pi++]];
      if (!inPart((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2)) continue;
      ends.forEach(([x, z], e) => {
        prop(x, 1.6, z, 0.12, 3.2, 0.12, 0x6a6e70); prop(x, 0.55, z, 0.18, 0.28, 0.1, 0xe8d040);
        const face = c.along === 'x' ? (e === 0 ? [1, 0] : [-1, 0]) : (e === 0 ? [0, -1] : [0, 1]);
        const hx = x + face[0] * 0.18, hz = z + face[1] * 0.18, w = c.along === 'x' ? 0.02 : 0.3, d = c.along === 'x' ? 0.3 : 0.02;
        prop(x, 2.6, z, 0.36, 0.85, 0.36, 0x2a2c30);
        B.box('glow', hx, 2.8, hz, w, 0.3, d, 0x3a1010, { edges: false }); B.box('glow', hx, 2.4, hz, w, 0.3, d, 0x10301a, { edges: false });
        const heads = [halos.push({ p: [hx + face[0] * 0.1, 2.8, hz + face[1] * 0.1], size: 0.8, color: 0xff3030, k: 0, signal: true }) - 1, halos.push({ p: [hx + face[0] * 0.1, 2.4, hz + face[1] * 0.1], size: 0.8, color: 0x40ff90, k: 0, signal: true }) - 1];
        signals.push({ kind: 'ped', heads, phase: c.phase || 0 });
        if (c.along === 'x') {   // 車の信号：歩道の柱から車道の上へ腕
          const dir = e === 0 ? 1 : -1, ax = x + dir * 3.2;
          prop(x + dir * 1.6, 5.2, z, 3.4, 0.1, 0.1, 0x6a6e70); prop(x, 4.0, z, 0.14, 2.6, 0.14, 0x6a6e70);
          prop(ax, 5.0, z, 1.3, 0.42, 0.32, 0x3a3c40);
          const fz = e === 0 ? 0.17 : -0.17, ch = [];
          [-0.42, 0, 0.42].forEach((o, k) => { B.box('glow', ax + o, 5.0, z + fz, 0.24, 0.24, 0.04, [0x1a3a2a, 0x3a3010, 0x3a1010][k], { edges: false }); ch.push(halos.push({ p: [ax + o, 5.0, z + fz * 2], size: 1.1, color: [0x40ffb0, 0xffc030, 0xff3030][k], k: 0, signal: true }) - 1); });
          signals.push({ kind: 'car', heads: ch, phase: c.phase || 0 });
        }
      });
    }
  }

  /** P13：町の縁の外の家並み（遠景の建物）と、深い区画の奥の建物。歩ける所から町の縁の何も無い所（空・地面の果て）が見えないように。
   *  形は窓の帯つきの箱（材質ごとにまとめる網・升目ごとに見えない所は描かない）。駅前通りの西の突き当たりは店の表（シャッター・窓・灯り）。 */
  function backdrop() {
    const bd = T.bounds, r = seeded('backdrop');
    const block = (x0, z0, x1, z1, face, front = false) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; if (!inPart(cx, cz)) { r(); r(); r(); return; }
      const h = front ? 9.6 : 8 + Math.floor(r() * 4) * 2.6, tile = ['mortar', 'tilewall', 'panel', 'siding2'][Math.floor(r() * 4)], tint = [0xa8a090, 0x9a9ca0, 0x8a8478, 0xb0aca4][Math.floor(r() * 4)];
      B.box('tex', cx, h / 2, cz, w, h, d, tint, { tile, ts: 3, edges: false });
      B.box('prop', cx, h + 0.2, cz, w + 0.1, 0.4, d + 0.1, 0x3a3c40, { edges: false });
      const n = face, along = n[0] === 0, fw = along ? w : d, fx = n[0] > 0 ? x1 : n[0] < 0 ? x0 : cx, fz = n[1] > 0 ? z1 : n[1] < 0 ? z0 : cz;
      for (let y = front ? 4.4 : 3.6; y < h - 1; y += 2.8) for (let k = 0; k < Math.max(1, Math.floor(fw / 3.4)); k++) {
        const t = (k + 0.5) / Math.max(1, Math.floor(fw / 3.4)) - 0.5, lit = r() < 0.35, px = along ? cx + t * fw : fx + n[0] * 0.03, pz = along ? fz + n[1] * 0.03 : cz + t * fw;
        B.box(lit ? 'texglow' : 'tex', px, y, pz, along ? 1.6 : 0.06, 1.2, along ? 0.06 : 1.6, lit ? 0xc8b8a0 : 0xffffff, { tile: lit ? 'win_lit' : r() < 0.5 ? 'win_dark' : 'win_curtain', fit: true, edges: false });
      }
      if (front) {   // 1 階：閉じたシャッターの店 2・ひさし・小さな灯り（駅前通りの突き当たり）
        for (const t of [-0.25, 0.25]) { const px = along ? cx + t * fw : fx + n[0] * 0.05, pz = along ? fz + n[1] * 0.05 : cz + t * fw;
          B.box('tex', px, 1.35, pz, along ? fw * 0.42 : 0.08, 2.7, along ? 0.08 : fw * 0.42, 0xffffff, { tile: 'shutter', ts: 2.2, tsy: 2.7, edges: false });
          B.box('glow', along ? px : fx + n[0] * 0.07, 2.95, along ? fz + n[1] * 0.07 : pz, along ? 0.3 : 0.12, 0.12, along ? 0.12 : 0.3, 0xffd8a0, { edges: false });
          halos.push({ p: [px + n[0] * 0.3, 2.9, pz + n[1] * 0.3], size: 1.0, color: 0xffd8a0, k: 0.5 }); }
        B.box('prop', along ? cx : fx + n[0] * 0.5, 3.2, along ? fz + n[1] * 0.5 : cz, along ? fw : 1.0, 0.1, along ? 1.0 : fw, 0x3a3c42, { edges: false });
      }
    };
    // 西（x < −46）：駅前通りの突き当たり（z 1〜14）は店の表のある建物
    for (const [za, zb] of [[-18, -7.6], [-7.4, 0.4], [0.6, 14.4], [14.6, 25], [25.2, 35.6], [35.8, 46], [46.2, 56], [56.2, 65.8]]) block(bd.minX - 8, za, bd.minX, zb, [1, 0], za === 0.6);
    // 南（z > 66）・東（x > 118）・駅の裏（z < −128）
    for (let x = bd.minX - 8; x < bd.maxX + 8; x += 12.5) block(x, bd.maxZ, x + 12, bd.maxZ + 8, [0, -1]);
    for (let z = bd.minZ - 8; z < bd.maxZ; z += 12.5) block(bd.maxX, z, bd.maxX + 8, z + 12, [-1, 0]);
    for (let x = 36; x + 12 <= bd.maxX; x += 12.5) block(x, bd.minZ - 8, x + 12, bd.minZ, [0, 1]);
    // 中央通りの東の区画の奥（建物の裏の空き地：x 108.5〜118）
    for (let z = -78; z < 46; z += 12.4) block(108.6, z + 0.2, 117.8, z + 12, [-1, 0]);
  }
  function build(signals) {
    backdrop();
    if (inPart(23, -20)) { gplaza(); yokocho(); }
    if (inPart(79, -20)) { avenue(); tracks(); stops(); catenary(); for (const t of T.avenue.trams) tram(t); for (const b of T.avenue.buses) bus(b); stationPlaza(); }
    newSignals(signals);
    for (const p of T.props) if (p.kind === 'busstop2' && inPart(p.x, p.z)) busStop2(p);
    for (const p of T.props) if (p.kind === 'yukigakoi' && inPart(p.x, p.z)) { tb('tex', p.x, 0.2, p.z, 1.1, 0.4, 1.1, 0xffffff, 'stone', { ts: 0.8 }); yukigakoi(p.x, p.z, 0.4); }
  }
  /** バス停（屋根・背のガラス・ベンチ・丸い札・時刻表の灯り） */
  function busStop2(p) {
    const bx = boxLocal(p.x, p.z, p.ry || 0), at = at2(p.x, p.z, p.ry || 0);
    for (const s of [-1.5, 1.5]) bx('prop', s, 1.25, -0.25, 0.08, 2.5, 0.08, 0x5a6068);
    bx('glass2', 0, 2.5, 0.1, 3.4, 0.05, 1.3, 0x7088a8); bx('prop', 0, 2.48, -0.3, 3.4, 0.12, 0.12, 0x4a4e58);
    bx('glass', 0, 1.3, -0.3, 3.0, 1.7, 0.04, 0x506070);
    { const [bx0, bz0] = at(0, -0.06); FK.bench(bx0, bz0, p.ry || 0, 2.4, { d: 0.4 }); }
    bx('glow', 0, 2.46, 0.1, 1.8, 0.03, 0.2, 0xe8f0ff); const [hx, hz] = at(0, 0.3); halos.push({ p: [hx, 2.3, hz], size: 1.6, color: 0xd8e8ff, k: 0.5 });
    const [sx, sz] = at(1.9, 0.4); prop(sx, 1.4, sz, 0.07, 2.8, 0.07, 0x8a8a8a);
    const uv = signUV(p.name, { bg: '#2a5aa8', fg: '#ffffff', size: 26 }); B.box('sign', sx, 2.6, sz, 0.9, 0.5, 0.04, 0xffffff, { uv, face: 4, ry: (p.ry || 0), edges: false });
    bx('glow', 1.9, 1.4, 0.44, 0.5, 0.7, 0.03, 0xe8f0f8); pool(hx, hz, 3, 0xd8e8ff, 0.25);
  }
  return { lot, build };
}
