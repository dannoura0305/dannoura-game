// 第3章で増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自。異形は不気味だが流血・欠損の表現はしない。
// ・だんのうら 白髪形態（化け猫の本来の姿。男性・性格も記憶も同じ。暴走ではない）：白い乱れ髪・白い猫耳（内側ピンク）・白い尾（揺れる）・
//   黒いパーカーに白い帯・白い毛皮の襟・爪・ピンクの花・めがね（イメージ資料 concept_03・05 を参考に独自に組む）
// ・子ども（日向 ユウ・仮）・記録のない患者・模倣する影・写し身（ボス）・守り手
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlas, faceAtlasExpr, UVR, drawEye, drawBrow, drawMouth, drawNose, drawBlush } from './skin.js';
import { humanBody, humanHead, hairCap, onHead, buildWeaponBones, glowEyes, xfm } from './models.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const JP = '"IPAGothic","Noto Sans CJK JP","Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif';
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** 骨の鎖（尾・髪の房・影の帯）。offs：前の骨からのずれの並び。戻り値：骨の名前の並び */
function boneChain(sb, prefix, parent, start, offs) {
  const names = []; let par = parent;
  offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; });
  return names;
}
/** 骨の鎖に沿った管の重み */
const chainW = (sb, names) => { const n = names.length; return sb.along(names.map((nm, i) => [i / (n - 1), nm])); };

// ───────────────────────── だんのうら（白髪形態） ─────────────────────────
export function buildDannouraWhite() {
  const d = Object.assign({}, DIM);
  const sb = new SkinBody(d), R = d.headR, W = n => sb.W(n);
  const SKIN = 0xfbe7de, BK = 0x17131d, BK2 = 0x2a2232, BKS = 0x0e0b12, ST = 0xf3eefb, FUR = 0xf7f3fc, PINK = 0xff9ccc, PANTS = 0x16121b;
  const hy = W('hips').y;
  humanBody(sb, {
    torso: [[0, 0.096, 0.074, 0], [0.1, 0.124, 0.086, -0.006], [0.28, 0.114, 0.08, 0], [0.48, 0.126, 0.085, 0.004], [0.66, 0.144, 0.09, 0.008], [0.82, 0.154, 0.088, 0.004], [0.93, 0.124, 0.074, -0.004], [1, 0.05, 0.045, 0]],
    torsoColor: (p, t) => {
      if (t < 0.06) return PANTS;
      const front = p.z > 0.035;
      if (front && Math.abs(p.x) < 0.006 && p.y < 1.33) return 0x5a4a6a;                                // ファスナー
      if (front && p.y > 1.02 && p.y < 1.12 && p.x > 0.03 && p.x < 0.1) return 0x3a2e48;                 // 胸の当て布
      return Math.abs(p.x) > 0.12 && p.y > 1.04 ? BK2 : BK;
    },
    torsoFold: 0.8, armFold: 1.1, legFold: 1,
    armR: [0.048, 0.042, 0.035], armColor: (t, w) => (w === 'lower' && t > 0.82 ? ST : BK), cuff: BK2, shoulderColor: BK,
    legR: [0.072, 0.051, 0.053, 0.036], legColor: (t, w) => (w === 'upper' && t > 0.42 && t < 0.52 ? ST : PANTS), legSub: 3,
    skin: SKIN, shoe: 0x1c1822, sole: 0xf2eef8, neckR: 0.036,
    shoeDeco: (an, FT) => { for (const z of [0.07, 0.1, 0.13]) sb.box([an.x, an.y + 0.025 + (0.13 - z) * 0.2, an.z + z - 0.02], [0.05, 0.005, 0.006], { weights: sb.rigid(FT), color: ST, oth: 0 }); },
  });
  // パーカーのすそ（腰をおおう程度で、広げない。スカートに見えないよう脚に沿わせる）・白い縁
  const hem = [[hy + 0.03, 0.135, 0.1], [hy - 0.05, 0.142, 0.106], [hy - 0.1, 0.145, 0.108], [hy - 0.115, 0.145, 0.108]];
  const skirtW = p => { const k = Math.max(0, Math.min(1, (hy - p.y) / 0.22)) * 0.55; const wl = Math.max(0, Math.min(1, (p.x + 0.02) / 0.08)) * k, wr = Math.max(0, Math.min(1, (0.02 - p.x) / 0.08)) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube(hem.map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz], shape: a => [1, Math.sin(a) > 0.92 ? 0.9 : 1] })), { sides: 22, sub: 2, weights: skirtW, color: (p, t) => (t > 0.86 ? ST : BK), capStart: false, capEnd: false, oth: 0.85, fold: 1 });
  // 白い帯（胸で交差・腰のベルト・腕と腿の帯）
  for (const sx of [1, -1]) {
    sb.tube([[sx * 0.11, 1.31, 0.06], [sx * 0.05, 1.2, 0.092], [-sx * 0.04, 1.06, 0.098], [-sx * 0.11, 0.95, 0.082], [-sx * 0.135, 0.9, 0.03]].map(c => ({ c, r: [0.013, 0.005] })),
      { sides: 5, weights: p => { const k = Math.max(0, Math.min(1, (1.2 - p.y) / 0.3)); return [[sb.bi('chest'), 1 - k], [sb.bi('spine'), k]]; }, color: ST, capStart: false, capEnd: false, oth: 0.4, ref: [0, 0, 1] });
    sb.tube([[sx * 0.11, 1.31, 0.06], [sx * 0.135, 1.27, -0.05], [sx * 0.07, 1.1, -0.1], [-sx * 0.05, 0.98, -0.1]].map(c => ({ c, r: [0.012, 0.005] })), { sides: 5, weights: sb.rigid('chest'), color: ST, capStart: false, capEnd: false, oth: 0.4, ref: [0, 0, -1] });
    sb.box([-sx * 0.0, 1.11, 0.1], [0.03, 0.03, 0.01], { weights: sb.rigid('chest'), color: 0xc0b8d0, oth: 0 });
  }
  sb.tube([{ c: [0, 0.905, -0.002], r: [0.13, 0.094] }, { c: [0, 0.935, -0.002], r: [0.128, 0.093] }], { sides: 22, weights: sb.rigid('hips'), color: ST, capStart: false, capEnd: false, oth: 0.5 });
  sb.box([0.05, 0.92, 0.095], [0.04, 0.035, 0.012], { weights: sb.rigid('hips'), color: 0xb8b0c8, oth: 0.2 });
  for (const sx of [1, -1]) {
    const UA = sx > 0 ? 'leftUpperArm' : 'rightUpperArm', sh = W(UA), el = W(sx > 0 ? 'leftLowerArm' : 'rightLowerArm');
    const y = (sh.y + el.y) / 2;
    sb.tube([{ c: [sh.x, y + 0.012, 0], r: [0.053, 0.05] }, { c: [sh.x, y - 0.012, 0], r: [0.053, 0.05] }], { sides: 14, weights: sb.rigid(UA), color: ST, capStart: false, capEnd: false, oth: 0.4 });
  }
  // 白い毛皮の襟（フードの縁）：小さな房を首の周りに並べる＝ふわっとした量感
  const fr = rng(31);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 22; i++) {
    const a = -Math.PI * 0.82 + i / 21 * Math.PI * 1.64 + row * 0.07, back = Math.max(0, Math.cos(a));
    const rx = 0.115 + row * 0.03 + fr() * 0.012, rz = 0.085 + row * 0.025;
    const x = Math.sin(a) * rx, z = -Math.cos(a) * rz - 0.025, y = 1.335 - row * 0.03 - (1 - back) * 0.02 + fr() * 0.015;
    const sz = (0.011 + back * 0.016 + fr() * 0.006) * (row ? 0.85 : 1);
    sb.blob([x, y, z], [sz * 1.2, sz, sz * 1.4], { rot: [fr() * 0.8 - 0.4, a, fr() * 0.8 - 0.4], weights: sb.rigid('chest'), color: fr() < 0.3 ? 0xe4ddf0 : FUR, w: 7, h: 5, oth: 0.45 });
  }
  sb.blob([0, 1.29, -0.085], [0.12, 0.06, 0.05], { rot: [0.45, 0, 0], weights: sb.rigid('chest'), color: BK, w: 16, h: 10 });              // フード（下ろしている）
  sb.blob([0, 1.30, -0.1], [0.085, 0.04, 0.03], { rot: [0.45, 0, 0], weights: sb.rigid('chest'), color: 0x2c2436, w: 12, h: 8, oth: 0.3 });
  // 背中の猫の足あと（小さな刺しゅう）
  for (const [x, y, r] of [[0, 1.12, 0.022], [-0.026, 1.155, 0.009], [-0.009, 1.168, 0.009], [0.009, 1.168, 0.009], [0.026, 1.155, 0.009]]) sb.blob([x, y, -0.094], [r, r, 0.004], { weights: sb.rigid('chest'), color: ST, w: 8, h: 4, oth: 0 });
  // 爪（指先から伸びる紫がかった黒の鉤爪）
  for (const [HA, sx] of [['leftHand', 1], ['rightHand', -1]]) {
    const wr = W(HA), w = sb.rigid(HA);
    for (const z of [0.022, 0.0075, -0.0075, -0.021]) {
      const bx = wr.x - sx * 0.031, by = wr.y - 0.012 - 0.068 - 0.044, zz = z + 0.003;
      sb.tube([{ c: [bx, by, zz], r: [0.0055, 0.004] }, { c: [bx - sx * 0.01, by - 0.022, zz], r: [0.0035, 0.0028] }, { c: [bx - sx * 0.028, by - 0.03, zz], r: [0.0008, 0.0008] }], { sides: 5, weights: w, color: 0x3a1a52, capStart: false, capEnd: true, oth: 0.2 });
    }
  }
  humanHead(sb, { R, skin: SKIN, male: true, jaw: 0.3, eyeW: 0.5, eyeH: 0.6, ears: false });
  // ── 白い乱れ髪 ──
  const H = 0xf0ecf8, HD = 0xc9bfde, HL = 0xffffff, HT = 0xe2daf2, hw = sb.rigid('head');
  hairCap(sb, R, { base: H, dark: HD, band: HL, faceZ: 0.22, hairline: 0.42, nape: -0.62, bottom: -0.98, sx: 1.06, sy: 1.08, sz: 1.08 });
  const r = rng(77);
  // 前髪（乱れて重なる・毛先が跳ねる）
  for (let i = 0; i < 9; i++) {
    const x = -0.72 + i / 8 * 1.44 + (r() - 0.5) * 0.08, len = (Math.abs(x) < 0.3 ? 0.04 : Math.abs(x) < 0.55 ? 0.1 : 0.2) + r() * 0.08, lean = (r() - 0.5) * 0.4 + x * 0.25;
    sb.strand([onHead(sb, R, [x * 0.8, 0.86, 0.5], 1.06), onHead(sb, R, [x * 0.92 + lean * 0.3, 0.56, 0.92], 1.18), onHead(sb, R, [x * 1.0 + lean, 0.52 - len, 0.98], 1.2)], R * (0.17 + r() * 0.06), { base: i % 2 ? H : HT, root: HD, tip: HL, weights: hw, out: [x, 0.3, 1], segs: 6, flat: 0.36 });
  }
  // 横と後ろ：外へ跳ねる房（量感）
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI * 0.85 + i / 19 * Math.PI * 1.7, dx = Math.sin(a), dz = -Math.cos(a), up = 0.75 - r() * 0.3, len = 0.35 + r() * 0.5;
    const flick = 0.15 + r() * 0.25;
    sb.strand([onHead(sb, R, [dx * 0.7, up, dz * 0.7], 1.1), onHead(sb, R, [dx * 1.05, 0.1, dz * 1.05], 1.3 + r() * 0.08), onHead(sb, R, [dx * (1.2 + flick), -0.2 - len * 0.55, dz * (1.15 + flick)], 1.36 + r() * 0.1)], R * (0.3 + r() * 0.1), { base: i % 3 ? H : HT, root: HD, tip: HL, weights: hw, out: [dx, 0.1, dz], segs: 6, flat: 0.28, taper: 0.65 });
  }
  // 頭頂のはね毛（数本）
  for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2, x = Math.sin(a) * 0.35, z = Math.cos(a) * 0.35; sb.strand([onHead(sb, R, [x, 1, z], 1.03), onHead(sb, R, [x * 1.4, 1.2, z * 1.4 + 0.1], 1.14), onHead(sb, R, [x * 2.2, 1.0, z * 2.0 + 0.2], 1.2)], R * 0.13, { base: H, tip: HL, weights: hw, out: [x, 1, z], segs: 4, flat: 0.45 }); }
  // ── 猫耳（外は白・内はピンク）。耳の骨（ぴくっと動く） ──
  const earDeform = v => { const k = (v.y + 1) / 2; v.x *= 1 - k * 0.88; v.z *= 1 - k * 0.7; return v; };
  const ears = [];
  for (const sx of [1, -1]) {
    const base = onHead(sb, R, [sx * 0.52, 0.86, -0.08], 0.98), nm = sx > 0 ? 'earL' : 'earR';
    sb.addBone(nm, 'head', base[0] - sb.W('head').x, base[1] - sb.W('head').y, base[2] - sb.W('head').z); ears.push(nm);
    const xf = xfm([0, R * 0.32, 0], [-0.2, sx * 0.25, -sx * 0.32]), B = sb.W(nm);
    const exf = new THREE.Matrix4().makeTranslation(B.x, B.y, B.z).multiply(xf);
    sb.blob([0, 0, 0], [R * 0.36, R * 0.5, R * 0.16], { deform: earDeform, xf: exf, weights: sb.rigid(nm), color: p => (p.y > B.y + R * 0.62 ? HD : H), w: 14, h: 10, oth: 0.9 });
    sb.blob([0, -R * 0.04, R * 0.07], [R * 0.24, R * 0.36, R * 0.07], { deform: earDeform, xf: exf, weights: sb.rigid(nm), color: PINK, w: 12, h: 8, oth: 0 });
    for (let k = 0; k < 3; k++) sb.blob([(k - 1) * R * 0.08, -R * 0.2, R * 0.12], [R * 0.05, R * 0.14, R * 0.04], { rot: [0.3, 0, (k - 1) * 0.4], xf: exf, weights: sb.rigid(nm), color: FUR, w: 6, h: 5, oth: 0 });
  }
  // ── 尾（白・ふわふわ・7 本の骨の鎖：ばねで揺れる） ──
  const tailNames = boneChain(sb, 'ctail', 'hips', [0, -0.04, -0.12], [[0, 0, 0], [0, -0.05, -0.07], [0, -0.08, -0.06], [0, -0.08, -0.05], [0, -0.05, -0.08], [0, 0.0, -0.1], [0, 0.07, -0.09], [0, 0.1, -0.05]]);
  const tp = tailNames.map(n => sb.W(n)), tipP = tp[tp.length - 1].clone().add(V(0, 0.06, -0.03));
  const pts = tp.concat([tipP]);
  const tr = rng(5);
  const rad = pts.map((_, i) => { const t = i / (pts.length - 1); return 0.028 + Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.85) * 0.03 + (t > 0.9 ? -0.012 : 0); });
  sb.tube(pts.map((c, i) => ({ c: [c.x, c.y, c.z], r: [rad[i], rad[i]], shape: a => { const k = 1 + Math.sin(a * 5 + i * 1.7) * 0.12 + (tr() - 0.5) * 0.06; return [k, k]; } })), { sides: 14, sub: 3, weights: chainW(sb, tailNames), color: (p, t) => (t > 0.86 ? 0xd8ccf0 : t < 0.08 ? HD : FUR), capStart: true, capEnd: true, capBulge: 0.9, oth: 0.9 });
  // ── めがね（黒・四角）・ピンクの花 ──
  const FR = 0x16101c;
  for (const sx of [1, -1]) {
    const c = onHead(sb, R, [sx * 0.37, -0.08, 0.93], 1.0);
    const cz = c[2] + 0.016, cx = c[0], cy = c[1], w = R * 0.52, h = R * 0.36, t = 0.0045, ry = sx * 0.22;
    const L = (x, y, z, sw, sh) => sb.box([x, y, z], [sw, sh, 0.004], { rot: [0, ry, 0], weights: hw, color: FR, group: 'plain' });
    L(cx, cy + h / 2, cz, w, t * 1.3); L(cx, cy - h / 2, cz, w, t);
    L(cx + Math.cos(ry) * w / 2, cy, cz - Math.sin(ry) * w / 2, t, h); L(cx - Math.cos(ry) * w / 2, cy, cz + Math.sin(ry) * w / 2, t, h);
    const ex = sx * R * 0.95;
    sb.box([(cx + sx * w / 2 + ex) / 2, cy + h * 0.35, (cz - Math.sin(ry) * w / 2 + sb.hc.z - R * 0.05) / 2], [0.004, 0.004, Math.abs(cz - sb.hc.z) + 0.02], { rot: [0, -sx * 0.2, 0], weights: hw, color: FR, group: 'plain' });
  }
  sb.box([0, onHead(sb, R, [0, -0.02, 1], 1.0)[1] + R * 0.06, onHead(sb, R, [0, -0.02, 1], 1.0)[2] + 0.014], [R * 0.2, 0.005, 0.004], { weights: hw, color: FR, group: 'plain' });
  const flXf = xfm(onHead(sb, R, [0.86, 0.38, 0.28], 1.16), [0, 1.25, 0.2], 1.6);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * R * 0.13, Math.sin(a) * R * 0.13, 0], [R * 0.11, R * 0.1, R * 0.05], { rot: [0, 0, a], xf: flXf, weights: hw, color: 0xff8cc8, w: 8, h: 6, oth: 0.35 }); }
  sb.blob([0, 0, R * 0.04], [R * 0.06, R * 0.06, R * 0.04], { xf: flXf, weights: hw, color: 0xffe070, w: 6, h: 4, oth: 0 });
  const weapons = buildWeaponBones(sb);
  const tex = faceAtlasExpr((g, E) => {
    drawEye(g, 0, 0, { iris: '#b48cff', dark: '#3a1458', light: '#fbefff', lash: '#2a1838', lashW: 9, rw: 40, rh: 46, flick: true, lid: E.lid, happy: E.happy, slit: true, glow: 'rgba(220,170,255,.35)' });
    drawBrow(g, Object.assign({ color: '#cfc4e4', w: 8, arch: 0 }, E.brow, { tilt: 2 + (E.brow.tilt || 0) }));
    drawMouth(g, Object.assign({ color: '#9a4058', smile: 3, w: 4.5 }, E.mouth));
    drawNose(g, { color: 'rgba(190,120,120,.6)' });
    drawBlush(g, { color: 'rgba(255,150,190,.22)', lines: false });
    g.save(); g.translate(128, 128); g.fillStyle = '#141018'; g.fillRect(0, 0, 64, 64); g.restore();
  }, 'calm');
  const m = sb.build(tex, { rim: 0.85, rimColor: 0xe8d8ff, outline: 0.0085, outlineColor: 0x1a1024 });
  const sway = tailNames.map((n, i) => ({ b: sb.B[n], k: 34 - i * 2.5, d: 5.5, gain: -(0.12 + i * 0.03), baseX: 0, amp: 0.08 + i * 0.03, freq: 1.6, ph: i * 0.55, tail: true }));
  return Object.assign(m, { tail: [], coat: [], sway, earBones: ears.map(n => sb.B[n]), weapons, height: 1.66, provisional: true, kind: 'dannoura_white', white: true, eyes: [sb.B.eyeL, sb.B.eyeR], mouth: sb.B.mouth, faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

// ───────────────────────── 子ども（日向 ユウ・仮・7 歳） ─────────────────────────
export function buildChild() {
  const k = 0.7, d = {}; for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  Object.assign(d, { headR: 0.104, neck: d.neck * 0.9 });
  const sb = new SkinBody(d), R = d.headR;
  const PJ = 0x9ec8e8, PJ2 = 0xf2f6fa, CARD = 0xf2c84a, SKIN = 0xffe8dc;
  humanBody(sb, {
    torso: [[0, 0.07, 0.058, 0], [0.12, 0.088, 0.066, 0], [0.32, 0.084, 0.064, 0], [0.55, 0.09, 0.068, 0.004], [0.8, 0.1, 0.066, 0], [0.93, 0.08, 0.055, 0], [1, 0.035, 0.032, 0]],
    torsoColor: (p, t) => (p.z > 0.03 && Math.abs(p.x) < 0.045 ? (Math.floor(p.y * 40) % 2 ? PJ : PJ2) : CARD),
    armR: [0.034, 0.029, 0.025], armColor: () => CARD, cuff: 0xe0b030,
    legR: [0.05, 0.036, 0.038, 0.026], legColor: (t) => (Math.floor(t * 8) % 2 ? PJ : PJ2), skin: SKIN, shoe: 0x6a9ad0, sole: 0xf0f0f0, neckR: 0.027, shoeW: 0.8, hand: 0.75,
  });
  humanHead(sb, { R, skin: SKIN, jaw: 0.42, eyeW: 0.56, eyeH: 0.7, blush: true });
  const H = 0x2a1e1a, HL = 0x4a3830, hw = sb.rigid('head');
  hairCap(sb, R, { base: H, dark: H, band: HL, faceZ: 0.25, hairline: 0.42, nape: -0.6, bottom: -0.8, sx: 1.1, sz: 1.1 });
  for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2; sb.strand([onHead(sb, R, [x * 0.7, 0.85, 0.5], 1.05), onHead(sb, R, [x * 0.9, 0.5, 0.9], 1.1), onHead(sb, R, [x, 0.25, 0.98], 1.08)], R * 0.22, { base: H, tip: HL, weights: hw, out: [x, 0.3, 1], segs: 4 }); }
  const tex = faceAtlasExpr((g, E) => {
    drawEye(g, 0, 0, { iris: '#4a3020', dark: '#1a0e08', light: '#e8c8a8', lashW: 7, rw: 42, rh: 50, lid: E.lid, happy: E.happy, flick: false });
    drawBrow(g, Object.assign({ color: '#2a1e1a', w: 6, arch: 4 }, E.brow));
    drawMouth(g, Object.assign({ color: '#b05060', smile: 4, w: 4 }, E.mouth));
    drawNose(g, {}); drawBlush(g, {});
  }, 'sad');
  const m = sb.build(tex, { rim: 0.4, rimColor: 0xffe0c0 });
  return Object.assign(m, { height: 1.15, provisional: true, kind: 'child', eyes: [sb.B.eyeL, sb.B.eyeR], faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}

// ───────────────────────── 記録のない患者 ─────────────────────────
/** 病衣・裸足の灰色の脚・紙の記録が巻きついた頭（顔は白紙）・点滴の柱（袋が弱点：うっすら光る） */
export function buildKanja(seed = 1) {
  const r = rng(seed * 13 + 1);
  const d = Object.assign({}, DIM, { leg: 0.94, thigh: 0.44, shin: 0.43, neck: 0.24, upperArm: 0.32, lowerArm: 0.31, shoulderX: 0.155, headR: 0.112, hipX: 0.08 });
  const sb = new SkinBody(d), R = d.headR;
  const GOWN = [0xa8c8c0, 0xb0c0d0, 0xc0c8b0][seed % 3], GOWN2 = 0x8aa8a0, SK = 0xbcc0c8;
  humanBody(sb, {
    torso: [[0, 0.09, 0.07, 0], [0.12, 0.112, 0.08, 0], [0.32, 0.104, 0.078, 0], [0.55, 0.112, 0.08, 0.004], [0.8, 0.13, 0.08, 0], [0.93, 0.1, 0.064, 0], [1, 0.042, 0.04, 0]],
    torsoColor: (p) => (p.z < -0.05 && Math.abs(p.x) < 0.012 ? GOWN2 : Math.floor(p.y * 30 + p.x * 20) % 7 === 0 ? GOWN2 : GOWN), torsoFold: 1,
    armR: [0.036, 0.03, 0.025], armColor: (t, w) => (w === 'upper' && t < 0.4 ? GOWN : SK),
    legR: [0.052, 0.038, 0.04, 0.028], legColor: () => SK, skin: SK, shoe: 0xd8d8d0, sole: 0x8a8a90, neckR: 0.03, hand: 1.15, legFold: 0.3,
  });
  const hy = sb.W('hips').y;
  const skirtW = p => { const k = Math.max(0, Math.min(1, (hy - p.y) / 0.4)) * 0.6; const wl = Math.max(0, Math.min(1, (p.x + 0.03) / 0.09)) * k, wr = Math.max(0, Math.min(1, (0.03 - p.x) / 0.09)) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube([[hy + 0.02, 0.12, 0.09], [hy - 0.15, 0.15, 0.11], [hy - 0.33, 0.17, 0.12], [hy - 0.42, 0.175, 0.125]].map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz] })), { sides: 18, sub: 2, weights: skirtW, color: (p, t) => (t > 0.9 ? GOWN2 : GOWN), capStart: false, capEnd: false, oth: 0.85, fold: 1.2 });
  humanHead(sb, { R, skin: 0xe8e4da, faceless: true, ears: false, jaw: 0.25 });
  // 頭に巻きついた白紙の記録（カルテの紙）
  const hc = sb.hc, hw = sb.rigid('head');
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, y = (r() - 0.4) * R * 1.2;
    const p = [hc.x + Math.sin(a) * R * 1.0, hc.y + y, hc.z + Math.cos(a) * R * 1.0];
    sb.card(p, [R * (0.9 + r() * 0.4), R * (0.7 + r() * 0.4)], i % 3 ? UVR(0, 128, 128, 256) : UVR(128, 128, 256, 256), { rot: [(r() - 0.5) * 0.6, a, (r() - 0.5) * 0.8], weights: hw });
  }
  // 点滴の柱（左手）・袋（弱点）・管
  const lh = sb.W('leftHand'), lw = sb.rigid('leftHand');
  sb.cyl([lh.x + 0.03, lh.y + 0.5, lh.z + 0.06], 0.009, 0.009, 1.7, { weights: lw, color: 0xb8bcc4, seg: 8, oth: 0.4 });
  for (const a of [0, 2.1, 4.2]) sb.cyl([lh.x + 0.03 + Math.sin(a) * 0.12, lh.y - 0.3, lh.z + 0.06 + Math.cos(a) * 0.12], 0.006, 0.006, 0.26, { rot: [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9], weights: lw, color: 0x8a8e96, seg: 6, oth: 0.3 });
  sb.blob([lh.x + 0.03, lh.y + 1.22, lh.z + 0.08], [0.05, 0.08, 0.025], { weights: lw, color: 0xd8f0f0, w: 10, h: 8, oth: 0.5 });
  sb.tube([{ c: [lh.x + 0.03, lh.y + 1.14, lh.z + 0.08], r: [0.003, 0.003] }, { c: [lh.x - 0.02, lh.y + 0.6, lh.z + 0.12], r: [0.003, 0.003] }, { c: [lh.x - 0.03, lh.y + 0.15, lh.z + 0.04], r: [0.003, 0.003] }], { sides: 4, weights: lw, color: 0xe0f0f0, oth: 0 });
  // 手首の白いリストバンド（名前が空白）
  for (const HA of ['leftHand', 'rightHand']) { const w = sb.W(HA); sb.tube([{ c: [w.x, w.y + 0.03, 0], r: [0.03, 0.028] }, { c: [w.x, w.y + 0.005, 0], r: [0.03, 0.028] }], { sides: 10, weights: sb.rigid(HA === 'leftHand' ? 'leftLowerArm' : 'rightLowerArm'), color: 0xf4f4f0, capStart: false, capEnd: false, oth: 0.3 }); }
  const tex = faceAtlas(g => {
    for (const [ox, faint] of [[0, 0.22], [128, 0.12]]) {
      g.fillStyle = '#efeadc'; g.fillRect(ox, 128, 128, 128); g.strokeStyle = `rgba(80,100,120,${faint})`; g.lineWidth = 2;
      for (let y = 150; y < 250; y += 12) { g.beginPath(); g.moveTo(ox + 10, y); g.lineTo(ox + 118, y); g.stroke(); }
      g.fillStyle = 'rgba(60,80,110,.35)'; g.font = '14px ' + JP; g.fillText('氏名：', ox + 10, 144);
      g.fillStyle = 'rgba(90,70,60,.18)'; g.beginPath(); g.ellipse(ox + 90, 220, 18, 10, 0.4, 0, 7); g.fill();   // 水のしみ
    }
  });
  const m = sb.build(tex, { rim: 0.35, rimColor: 0xa0d0d0, outline: 0.01, outlineColor: 0x08080e, faceEmissive: 0x101010 });
  const weak = new THREE.Object3D(); weak.position.set(0.03, 1.22, 0.08); m.J.leftHand.add(weak);
  const eyeGlow = glowEyes(m, m.J, [[R * 0.3, R * 0.95, R * 1.0], [-R * 0.3, R * 0.95, R * 1.0]]);
  return Object.assign(m, { height: 1.8, provisional: true, kind: 'kanja', weak, bodyR: 0.32, weakColor: 0x9ff0f0, eyeGlow });
}

// ───────────────────────── 模倣する影 ─────────────────────────
/** 黒紫の人影・白い仮面（写した顔：細い目と、少し広すぎる笑み）・肩と背から垂れる影の帯（揺れる） */
export function buildMimicShadow(opt = {}) {
  const scale = opt.scale || 1, d = {};
  for (const [n, v] of Object.entries(DIM)) d[n] = v * scale;
  Object.assign(d, { upperArm: d.upperArm * 1.12, lowerArm: d.lowerArm * 1.15, neck: d.neck * 1.05 });
  const sb = new SkinBody(d), R = d.headR;
  const SH = opt.color || 0x17101f, SH2 = 0x2a1a3a;
  humanBody(sb, {
    torso: [[0, 0.09 * scale, 0.07 * scale, 0], [0.12, 0.11 * scale, 0.08 * scale, 0], [0.32, 0.1 * scale, 0.075 * scale, 0], [0.55, 0.115 * scale, 0.08 * scale, 0], [0.8, 0.14 * scale, 0.08 * scale, 0], [0.93, 0.11 * scale, 0.066 * scale, 0], [1, 0.045 * scale, 0.042 * scale, 0]],
    torsoColor: (p) => (Math.sin(p.y * 30 + p.x * 12) > 0.85 ? SH2 : SH), torsoFold: 0.2,
    armR: [0.04 * scale, 0.033 * scale, 0.026 * scale], armColor: () => SH, legR: [0.06 * scale, 0.042 * scale, 0.044 * scale, 0.03 * scale], legColor: () => SH,
    skin: SH, shoe: SH, sole: SH, neckR: 0.032 * scale, hand: 1.35 * scale, armFold: 0.2, legFold: 0.2,
  });
  humanHead(sb, { R, skin: 0xeae6f2, jaw: 0.34, eyeW: 0.5, eyeH: 0.4, ears: false });
  // 影の帯（肩・背中から垂れる：骨の鎖でゆれる）
  const ribbons = [];
  const rr = rng(opt.seed || 9);
  const roots = opt.boss ? [[0.12, 1.3, -0.08], [-0.12, 1.3, -0.08], [0.05, 1.15, -0.1], [-0.05, 1.15, -0.1], [0.16, 1.05, -0.05], [-0.16, 1.05, -0.05]] : [[0.12, 1.28, -0.07], [-0.12, 1.28, -0.07], [0, 1.12, -0.1]];
  roots.forEach((p, i) => {
    const names = boneChain(sb, 'rib' + i + '_', 'chest', [p[0] * scale, p[1] * scale - sb.W('chest').y, p[2] * scale], [[0, 0, 0], [0, -0.16 * scale, -0.05 * scale], [0, -0.16 * scale, -0.04 * scale], [0, -0.15 * scale, -0.03 * scale]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V((rr() - 0.5) * 0.05, -0.12 * scale, -0.02)));
    sb.tube(P.map((c, k) => ({ c: [c.x, c.y, c.z], r: [0.03 * scale * (1 - k * 0.18), 0.008 * scale] })), { sides: 5, weights: chainW(sb, names), color: (q, t) => (t > 0.7 ? 0x3a1a5a : SH), capStart: false, capEnd: true, oth: 0.4, ref: [0, 0, 1] });
    ribbons.push(...names.map((n, k) => ({ b: sb.B[n], k: 18 + k * 2, d: 3.5, gain: 0.5, baseX: 0.15, amp: 0.25, freq: 1.1 + rr() * 0.6, ph: i * 1.3 + k * 0.6 })));
  });
  // ボス：だんのうらの影を写した形（ポニーテールの影・小さな帽子の影）
  const hw = sb.rigid('head');
  if (opt.boss) {
    hairCap(sb, R, { base: 0x1c1226, dark: 0x120a18, faceZ: 0.24, hairline: 0.44, nape: -0.62, bottom: -0.98, sx: 1.08 });
    const tie = onHead(sb, R, [0, 0.15, -1], 1.06);
    sb.tube([tie, [tie[0], tie[1] - 0.15, tie[2] - 0.08], [tie[0], tie[1] - 0.4, tie[2] - 0.06], [tie[0], tie[1] - 0.62, tie[2] - 0.02]].map((c, i) => ({ c, r: [0.05 - i * 0.01, 0.04 - i * 0.008] })), { sides: 8, weights: hw, color: 0x1c1226, capEnd: true, oth: 0.8 });
    const hatXf = xfm([sb.hc.x - R * 0.42, sb.hc.y + R * 1.02, sb.hc.z + R * 0.06], [-0.12, 0.25, 0.38], 0.82);
    sb.cyl([0, 0, 0], R * 0.78, R * 0.78, R * 0.06, { xf: hatXf, weights: hw, color: 0x241830, seg: 16 });
    sb.cyl([0, R * 0.36, 0], R * 0.47, R * 0.5, R * 0.66, { xf: hatXf, weights: hw, color: 0x2a1c38, seg: 16 });
    // 腕の先：刃のように長い影の指
    for (const [HA, sx] of [['leftHand', 1], ['rightHand', -1]]) { const wr = sb.W(HA); for (const z of [-0.03, 0, 0.03]) sb.tube([{ c: [wr.x, wr.y - 0.1 * scale, z * scale], r: [0.012 * scale, 0.006 * scale] }, { c: [wr.x - sx * 0.04 * scale, wr.y - 0.35 * scale, z * scale * 1.5], r: [0.008 * scale, 0.004 * scale] }, { c: [wr.x - sx * 0.1 * scale, wr.y - 0.55 * scale, z * scale * 2], r: [0.001, 0.001] }], { sides: 5, weights: sb.rigid(HA), color: 0x2a1640, capEnd: true, oth: 0.5 }); }
  } else hairCap(sb, R, { base: 0x1c1226, dark: 0x120a18, faceZ: 0.3, hairline: 0.5, nape: -0.5, bottom: -0.7 });
  // 仮面の顔（写した顔）
  const tex = faceAtlas(g => {
    drawEye(g, 0, 0, { iris: '#2a1440', dark: '#0a0410', light: '#6a3a9a', lash: '#120818', lashW: 6, rw: 34, rh: 30, lid: 0.35, flick: false, pupil: '#000' });
    drawBrow(g, { color: '#5a4a6a', w: 4, tilt: -6, arch: 6 });
    g.save(); g.translate(128, 48); g.strokeStyle = '#2a1830'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, 16); g.quadraticCurveTo(64, 42, 102, 16); g.stroke(); g.restore();
    if (opt.boss) { g.save(); g.strokeStyle = 'rgba(240,236,250,.9)'; g.lineWidth = 3; g.strokeRect(20, 44, 88, 52); g.restore(); }
  });
  const m = sb.build(tex, { rim: 0.9, rimColor: opt.rim || 0x9a5aff, outline: opt.boss ? 0.016 : 0.011, outlineColor: 0x05030a, faceEmissive: 0x302838 });
  m.mesh.castShadow = false;                                                    // 見分け方：影が無い
  const eyeGlow = glowEyes(m, m.J, [[R * 0.36, R * 0.82, R * 0.96], [-R * 0.36, R * 0.82, R * 0.96]]);
  const weak = new THREE.Object3D(); weak.position.set(0, R * 0.9, R * 0.9); m.J.head.add(weak);
  return Object.assign(m, { sway: ribbons, height: 1.7 * scale, provisional: true, kind: opt.boss ? 'utsushimi' : 'mimic', bodyR: 0.34 * Math.max(1, scale * 0.9), eyeGlow, weak, weakColor: 0xd0a0ff, noShadow: true });
}
export function buildUtsushimi() { return buildMimicShadow({ scale: 1.62, boss: true, seed: 21, rim: 0xb070ff }); }

// ───────────────────────── 守り手 ─────────────────────────
/** 大きな「記録のない患者」：猫背・長い腕・背中から生えた点滴の柱（3 本）・体に巻きついた白紙の記録。腕は子どもを抱えるように丸い */
export function buildMamori() {
  const d = Object.assign({}, DIM, { leg: 1.08, spine: 0.14, chest: 0.34, neck: 0.2, headJ: 0.05, headR: 0.15, shoulderX: 0.3, shoulderY: 0.22, upperArm: 0.5, lowerArm: 0.48, hipX: 0.14, thigh: 0.5, shin: 0.5 });
  const sb = new SkinBody(d), R = d.headR, r = rng(41);
  const GOWN = 0x8fa6a0, GOWN2 = 0x6f8882, SK = 0x9a9ea8;
  humanBody(sb, {
    torso: [[0, 0.18, 0.15, 0], [0.12, 0.22, 0.17, 0], [0.32, 0.22, 0.18, 0.02], [0.55, 0.24, 0.19, 0.03], [0.78, 0.27, 0.18, 0], [0.92, 0.2, 0.13, -0.02], [1, 0.08, 0.07, 0]],
    torsoColor: (p) => (Math.floor(p.y * 14 + Math.sin(p.x * 9) * 1.5) % 4 === 0 ? GOWN2 : GOWN), torsoFold: 1.2,
    armR: [0.1, 0.082, 0.066], armColor: (t, w) => (w === 'upper' && t < 0.6 ? GOWN : SK), legR: [0.13, 0.095, 0.095, 0.062], legColor: (t, w) => (w === 'upper' ? GOWN : SK), skin: SK, shoe: 0xd0d0c8, sole: 0x7a7a80, neckR: 0.06, hand: 1.7, shoeW: 1.4,
  });
  humanHead(sb, { R, skin: 0xe6e2d8, faceless: true, ears: false });
  const hc = sb.hc, hw = sb.rigid('head');
  for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, y = (r() - 0.4) * R * 1.2; sb.card([hc.x + Math.sin(a) * R, hc.y + y, hc.z + Math.cos(a) * R], [R * (0.8 + r() * 0.4), R * (0.6 + r() * 0.4)], UVR(0, 128, 128, 256), { rot: [(r() - 0.5) * 0.6, a, (r() - 0.5) * 0.8], weights: hw }); }
  const ch = sb.W('chest'), cw = sb.rigid('chest');
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, y = ch.y - 0.2 + r() * 0.45; sb.card([Math.sin(a) * 0.25, y, Math.cos(a) * 0.19], [0.16 + r() * 0.08, 0.12 + r() * 0.06], UVR(0, 128, 128, 256), { rot: [(r() - 0.5) * 0.5, a, (r() - 0.5) * 0.9], weights: cw }); }
  // 背中から突き出た点滴の柱の折れた端（背骨のように 3 本・短い）
  for (const [x, rz] of [[-0.14, 0.4], [0.0, 0.0], [0.15, -0.35]]) {
    const xf = xfm([x, ch.y + 0.05, -0.2], [-1.45, 0, rz]);
    sb.cyl([0, 0.16, 0], 0.016, 0.022, 0.34, { xf, weights: cw, color: 0x8a9098, seg: 8, oth: 0.5 });
  }
  // 頭から垂れる白紙の記録の束（顔を覆う簾。下ほど細く・ずれて重なる）
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * 0.75 + (i / 15) * Math.PI * 1.5, x = Math.sin(a) * R * 0.95, z = Math.cos(a) * R * 0.95;
    const len = R * (1.6 + r() * 1.4) * (Math.abs(a) < 0.6 ? 1.15 : 1);
    sb.card([hc.x + x, hc.y - len * 0.42, hc.z + z], [R * 0.42, len], UVR(0, 128, 128, 256), { rot: [(r() - 0.5) * 0.15, a, (r() - 0.5) * 0.12], weights: (p) => { const k = Math.max(0, Math.min(1, (hc.y - p.y) / 0.4)); return [[sb.bi('head'), 1 - k * 0.5], [sb.bi('neck'), k * 0.5]]; } });
  }
  // 腕から垂れる白紙の帯（ゆらゆらしない・重さ）
  for (const [HA, LA] of [['leftHand', 'leftLowerArm'], ['rightHand', 'rightLowerArm']]) { const w = sb.W(LA); for (let i = 0; i < 4; i++) sb.card([w.x + (r() - 0.5) * 0.1, w.y - 0.15 - i * 0.08, w.z + 0.07], [0.09, 0.2], UVR(0, 128, 128, 256), { rot: [0.1, (r() - 0.5) * 1.2, (r() - 0.5) * 0.4], weights: sb.rigid(LA) }); void HA; }
  const tex = faceAtlas(g => { g.fillStyle = '#efeadc'; g.fillRect(0, 128, 128, 128); g.strokeStyle = 'rgba(80,100,120,.2)'; g.lineWidth = 2; for (let y = 150; y < 250; y += 12) { g.beginPath(); g.moveTo(10, y); g.lineTo(118, y); g.stroke(); } g.fillStyle = 'rgba(60,80,110,.35)'; g.font = '14px ' + JP; g.fillText('氏名：', 10, 144); });
  const m = sb.build(tex, { rim: 0.45, rimColor: 0xc0e8e0, outline: 0.014, outlineColor: 0x08080e, faceEmissive: 0x101010 });
  const eyeGlow = glowEyes(m, m.J, [[R * 0.3, R * 0.95, R * 1.0], [-R * 0.3, R * 0.95, R * 1.0]]);
  return Object.assign(m, { height: 2.5, provisional: true, kind: 'mamori', bodyR: 0.6, eyeGlow });
}
