// 第4章で増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自。異形は不気味だが流血・欠損の表現はしない。
// ・応答体（研究施設の異形・境界応答の産物）：白く細長い人影。顔は無く縦の裂け目が光る。首に拘束の輪、背中から垂れる配線、肩に刺さった槽のガラス片、頭の上の応答灯（輪）。
// ・巨大猫又（だんのうらの巨大な姿・男性）：白い毛並みに紫の炎の模様、二本の尾（猫又）、めがね・ピンクの花はそのまま。胸の黒い帯（concept_04・05 を参考に独自に組む）。
// ・境界の先触れ（第4章のボス・仮名）：黒い膜と触腕の塊。胸に桃色の「縁の輪」と瞳。翼のように広がる 4 本の触腕に小さな目。研究施設の配管・槽の破片を取り込んでいる。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlas } from './skin.js';
import { humanBody, humanHead, glowEyes, xfm, torus } from './models.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chain(sb, prefix, parent, start, offs) { const names = []; let par = parent; offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; }); return names; }
const chainW = (sb, names) => sb.along(names.map((nm, i) => [i / (names.length - 1), nm]));
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();

// ───────────────────────── 応答体 ─────────────────────────
export function buildOutou(seed = 1) {
  const r = rng(seed * 31 + 7);
  const d = Object.assign({}, DIM, { leg: 0.98, thigh: 0.46, shin: 0.46, spine: 0.11, chest: 0.22, neck: 0.25, upperArm: 0.36, lowerArm: 0.38, shoulderX: 0.16, headR: 0.11, hipX: 0.08 });
  const sb = new SkinBody(d), R = d.headR;
  const SK = 0xd6dae2, SK2 = 0xb4bac6, SEAM = 0x6a4a9a;
  humanBody(sb, {
    torso: [[0, 0.08, 0.065, 0], [0.12, 0.094, 0.07, 0], [0.32, 0.088, 0.066, 0], [0.55, 0.1, 0.07, 0.004], [0.8, 0.118, 0.072, 0], [0.93, 0.09, 0.058, 0], [1, 0.04, 0.038, 0]],
    torsoColor: (p) => { if (Math.abs(p.x) < 0.006 && p.z > 0.02) return SEAM; const rib = Math.sin(p.y * 70) > 0.75 && p.y > 1.0 && p.y < 1.3 ? SK2 : SK; return Math.sin(p.y * 13 + p.x * 40) > 0.92 ? 0x9a8ab8 : rib; }, torsoFold: 0.2,
    armR: [0.034, 0.028, 0.022], armColor: (t) => (t > 0.85 ? SK2 : SK), legR: [0.05, 0.036, 0.038, 0.026], legColor: (t) => (t > 0.8 ? SK2 : SK),
    skin: SK, shoe: SK2, sole: 0x8a8e9a, neckR: 0.028, hand: 1.25, armFold: 0.2, legFold: 0.3,
  });
  humanHead(sb, { R, skin: 0xe4e6ee, faceless: true, ears: false, jaw: 0.2 });
  const hc = sb.hc, hw = sb.rigid('head'), cw = sb.rigid('chest');
  // 顔の縦の裂け目（光る）と、首の拘束の輪
  sb.box([hc.x, hc.y - R * 0.05, hc.z + R * 0.97], [R * 0.06, R * 1.25, R * 0.06], { weights: hw, color: 0xd8a0ff, oth: 0 });
  sb.box([hc.x, hc.y - R * 0.05, hc.z + R * 0.95], [R * 0.2, R * 1.35, R * 0.04], { weights: hw, color: 0x2a1840, oth: 0 });
  const nk = sb.W('neck');
  torus(sb, 0.05, 0.012, xfm([0, nk.y + 0.02, 0.0], [Math.PI / 2, 0, 0]), { weights: sb.rigid('neck'), color: 0x3a3e48, oth: 0.4 });
  for (const sx of [1, -1]) sb.box([sx * 0.05, nk.y, 0.02], [0.02, 0.03, 0.02], { weights: sb.rigid('neck'), color: 0x8a8e98, oth: 0.2 });
  // 応答灯（頭の上に浮かぶ輪：弱点）
  torus(sb, R * 0.9, 0.007, xfm([hc.x, hc.y + R * 1.55, hc.z], [Math.PI / 2 + 0.25, 0, 0]), { weights: hw, color: 0xe8d0ff, oth: 0 });
  // 肩に刺さった槽のガラス片
  for (let i = 0; i < 4; i++) { const sx = i % 2 ? 1 : -1; sb.box([sx * (0.1 + r() * 0.05), 1.28 + r() * 0.06, -0.02 + r() * 0.05], [0.012, 0.09 + r() * 0.06, 0.04], { rot: [r() * 0.8 - 0.4, r() * 2, sx * (0.5 + r() * 0.4)], weights: cw, color: 0xb8d8ff, oth: 0.2 }); }
  // 背中から垂れる配線（揺れる）
  const sway = [];
  [[0.06, 1.2, -0.07], [-0.07, 1.16, -0.07], [0.0, 1.05, -0.075]].forEach((p, i) => {
    const names = chain(sb, 'cab' + i + '_', 'chest', [p[0], p[1] - sb.W('chest').y, p[2]], [[0, 0, 0], [0, -0.14, -0.06], [0, -0.16, -0.04], [0, -0.16, -0.02], [0, -0.14, 0.0]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.1, 0.02)));
    sb.tube(P.map((c, k) => ({ c: [c.x, c.y, c.z], r: [0.011, 0.011] })), { sides: 5, weights: chainW(sb, names), color: (q, t) => (t > 0.85 ? 0xd890ff : 0x1a1a22), capStart: false, capEnd: true, oth: 0.3 });
    sway.push(...names.map((n, k) => ({ b: sb.B[n], k: 16 + k * 2, d: 3.2, gain: 0.4, baseX: 0.1, amp: 0.18, freq: 0.9 + i * 0.3, ph: i * 1.1 + k * 0.5 })));
  });
  // 手首の被験者の札・足首の輪
  for (const HA of ['leftHand', 'rightHand']) { const w = sb.W(HA); sb.tube([{ c: [w.x, w.y + 0.035, 0], r: [0.026, 0.024] }, { c: [w.x, w.y + 0.01, 0], r: [0.026, 0.024] }], { sides: 8, weights: sb.rigid(HA === 'leftHand' ? 'leftLowerArm' : 'rightLowerArm'), color: 0xf0f0e8, capStart: false, capEnd: false, oth: 0.3 }); }
  for (const FT of ['leftFoot', 'rightFoot']) { const a = sb.W(FT); torus(sb, 0.032, 0.007, xfm([a.x, a.y + 0.08, 0], [Math.PI / 2, 0, 0]), { weights: sb.rigid(FT === 'leftFoot' ? 'leftLowerLeg' : 'rightLowerLeg'), color: 0x3a3e48, oth: 0.3 }); }
  const tex = faceAtlas(g => { g.fillStyle = '#e4e6ee'; g.fillRect(0, 128, 128, 128); });
  const m = sb.build(tex, { rim: 0.85, rimColor: 0xb890ff, outline: 0.0095, outlineColor: 0x0a0812, faceEmissive: 0x101014 });
  const eyeGlow = glowEyes(m, m.J, [[0, R * 0.85, R * 1.0]]);
  const weak = new THREE.Object3D(); weak.position.set(0, R * 1.55 + 0.05, 0); m.J.head.add(weak);
  return Object.assign(m, { sway, height: 1.86, provisional: true, kind: 'outou', bodyR: 0.32, eyeGlow, weak, weakColor: 0xe0b0ff });
}

// ───────────────────────── 巨大猫又（だんのうらの巨大な姿） ─────────────────────────
/** 足もとを原点・+z が前。作る時は 1/8 の大きさ（scale を掛けて使う） */
export function buildGiantNekomata() {
  const sb = new SkinBody(DIM), r = rng(505);
  const FUR = 0xf6f2fc, FUR2 = 0xe2daf2, SH = 0xc6b8e2, PINK = 0xff9ccc, FL = 0xa45aff, FL2 = 0xd8a8ff, BK = 0x17121e;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('gBody', null, 0, 0.62, -0.1); B('gChest', 'gBody', 0, 0.06, 0.5); B('gNeck', 'gChest', 0, 0.14, 0.16); B('gHead', 'gNeck', 0, 0.16, 0.14); B('gJaw', 'gHead', 0, -0.07, 0.12);
  B('gEarL', 'gHead', 0.11, 0.15, -0.02); B('gEarR', 'gHead', -0.11, 0.15, -0.02);
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    B('gFLu' + s, 'gChest', sx * 0.17, -0.06, 0.02); B('gFLl' + s, 'gFLu' + s, 0, -0.29, 0.02); B('gFLp' + s, 'gFLl' + s, 0, -0.26, 0.02);
    B('gHLu' + s, 'gBody', sx * 0.17, -0.02, -0.36); B('gHLl' + s, 'gHLu' + s, 0, -0.24, 0.1); B('gHLh' + s, 'gHLl' + s, 0, -0.2, -0.14); B('gHLp' + s, 'gHLh' + s, 0, -0.11, 0.08);
  }
  const W = n => sb.W(n), rw = n => sb.rigid(n);
  // 毛の色：白に、手足の先・尾の先へ行くほど紫の炎の模様（独自の模様：上へ揺らぐ筋）
  const flame = (p, k) => { const s = Math.sin(p.x * 31 + p.y * 9) * 0.5 + Math.sin(p.z * 27 - p.y * 17) * 0.5; const v = k + s * 0.25; return v > 0.62 ? (v > 0.8 ? FL : FL2) : v > 0.45 ? FUR2 : FUR; };
  // 胴（尻 → 胸）
  const T = [[-0.68, 0.14, 0.13, 0.66], [-0.56, 0.24, 0.24, 0.64], [-0.34, 0.27, 0.27, 0.63], [-0.1, 0.26, 0.27, 0.64], [0.14, 0.27, 0.29, 0.66], [0.34, 0.28, 0.31, 0.69], [0.5, 0.25, 0.28, 0.72], [0.6, 0.16, 0.18, 0.76]];
  sb.tube(T.map(([z, rx, ry, y]) => ({ c: [0, y, z], r: [rx, ry], shape: a => { const k = 1 + Math.sin(a * 6 + z * 8) * 0.04; return [k, a > Math.PI ? 0.92 : 1]; } })), { sides: 26, sub: 2, ref: [0, 1, 0], weights: sb.along([[0, 'gBody'], [0.55, 'gBody'], [0.82, 'gChest'], [1, 'gChest']]), color: p => flame(p, p.y < 0.5 ? 0.42 : 0.3 + Math.max(0, -p.z - 0.3) * 0.5), capStart: true, capEnd: true, oth: 1, fold: 0.4 });
  // 首・胸のたてがみ（ふわっとした量感）
  sb.tube([{ c: [0, 0.74, 0.45], r: [0.17, 0.18] }, { c: [0, 0.84, 0.56], r: [0.15, 0.16] }, { c: [0, 0.95, 0.66], r: [0.13, 0.14] }], { sides: 18, ref: [1, 0, 0], weights: sb.along([[0, 'gChest'], [0.5, 'gNeck'], [1, 'gHead']]), color: FUR, capStart: false, capEnd: false, oth: 0.9 });
  for (let i = 0; i < 16; i++) { const a = -Math.PI * 0.85 + i / 15 * Math.PI * 1.7, rr = 0.16; const x = Math.sin(a) * rr, yy = 0.8 + Math.cos(a) * rr * 0.75; const sz = 0.075 + r() * 0.02; sb.blob([x, yy, 0.56 + Math.max(0, Math.cos(a)) * 0.03], [sz, sz * 0.85, sz * 1.25], { rot: [0.5, a * 0.5, 0], weights: () => [[sb.bi('gChest'), 0.6], [sb.bi('gNeck'), 0.4]], color: i % 4 ? FUR : FUR2, w: 10, h: 8, oth: 0.2 }); }
  // 背中・脇の毛の房
  for (let i = 0; i < 30; i++) { const z = -0.55 + r() * 0.95, a = (r() - 0.5) * 2.4, y = 0.65 + Math.cos(a) * 0.255, x = Math.sin(a) * 0.27; const sz = 0.03 + r() * 0.025; sb.blob([x, y, z], [sz * 1.1, sz * 0.75, sz * 1.5], { rot: [0.35, 0, a * 0.8], weights: z > 0.2 ? rw('gChest') : rw('gBody'), color: r() < 0.3 ? FUR2 : FUR, w: 8, h: 6, oth: 0.35 }); }
  // 頭：丸い頭・鼻すじ・鼻（桃色）・口・下あご（咆哮で開く）・頬の毛
  const hd = rw('gHead');
  sb.blob([0, 1.0, 0.74], [0.21, 0.185, 0.19], { weights: hd, color: FUR, w: 26, h: 18, deform: v => { if (v.z > 0.5) v.y *= 0.92; return v; } });
  for (let i = 0; i < 9; i++) { const a = -1.2 + i / 8 * 2.4; sb.blob([Math.sin(a) * 0.19, 1.13 + Math.cos(a * 1.3) * 0.02, 0.62 - Math.cos(a) * 0.02], [0.05, 0.045, 0.06], { rot: [0.5, a, 0], weights: hd, color: i % 3 ? FUR : FUR2, w: 8, h: 6, oth: 0.5 }); }   // 頭の上の毛のはね
  sb.blob([0, 0.945, 0.885], [0.085, 0.062, 0.075], { weights: hd, color: FUR, w: 16, h: 10 });
  sb.blob([0, 0.97, 0.958], [0.022, 0.016, 0.014], { weights: hd, color: PINK, w: 8, h: 6, oth: 0.3 });
  sb.box([0, 0.948, 0.966], [0.004, 0.022, 0.004], { weights: hd, color: 0x4a2a4a, oth: 0 });
  for (const sx of [1, -1]) sb.tube([{ c: [0, 0.937, 0.967], r: [0.003, 0.003] }, { c: [sx * 0.012, 0.93, 0.966], r: [0.003, 0.003] }, { c: [sx * 0.026, 0.936, 0.958], r: [0.0025, 0.0025] }], { sides: 4, weights: hd, color: 0x4a2a4a, oth: 0, capStart: false });
  sb.blob([0, 0.92, 0.87], [0.06, 0.03, 0.06], { weights: hd, color: 0x5a1a40, w: 10, h: 6, oth: 0 });           // 口の中（開くと見える）
  for (const sx of [1, -1]) sb.tube([{ c: [sx * 0.025, 0.925, 0.935], r: [0.007, 0.007] }, { c: [sx * 0.025, 0.895, 0.935], r: [0.001, 0.001] }], { sides: 5, weights: hd, color: 0xffffff, oth: 0 });
  sb.blob([0, 0.895, 0.86], [0.07, 0.026, 0.06], { weights: rw('gJaw'), color: FUR2, w: 12, h: 6, oth: 0.6 });
  for (const sx of [1, -1]) { sb.blob([sx * 0.15, 0.95, 0.76], [0.06, 0.07, 0.08], { rot: [0, sx * 0.4, sx * 0.3], weights: hd, color: FUR, w: 10, h: 8, oth: 0.7 }); for (let k = 0; k < 3; k++) sb.tube([{ c: [sx * 0.06, 0.94 - k * 0.01, 0.94], r: [0.0025, 0.0025] }, { c: [sx * 0.22, 0.95 - k * 0.025, 0.93], r: [0.0008, 0.0008] }], { sides: 3, weights: hd, color: 0xf8f4ff, oth: 0 }); }
  // 目（薄紫の光・細い瞳）
  const eyes = [];
  for (const sx of [1, -1]) {
    const c = [sx * 0.078, 1.035, 0.89];
    sb.blob(c, [0.042, 0.034, 0.016], { rot: [0, sx * 0.35, 0], weights: hd, color: 0xf0e0ff, w: 12, h: 8, oth: 0 });
    sb.blob([c[0] + sx * 0.002, c[1], c[2] + 0.008], [0.03, 0.03, 0.01], { rot: [0, sx * 0.35, 0], weights: hd, color: 0xb070ff, w: 10, h: 8, oth: 0 });
    sb.box([c[0] + sx * 0.002, c[1], c[2] + 0.016], [0.006, 0.042, 0.004], { rot: [0, sx * 0.35, 0], weights: hd, color: 0x14081e, oth: 0 });
    sb.box([c[0], c[1] + 0.04, c[2] - 0.004], [0.06, 0.008, 0.01], { rot: [0, sx * 0.35, sx * -0.12], weights: hd, color: 0xd8cce8, oth: 0 });   // 眉の毛
    const e = new THREE.Object3D(); e.position.copy(V(...c).sub(W('gHead'))); e.position.z += 0.02; sb.B.gHead.add(e); eyes.push(e);
  }
  // めがね（黒い四角い枠：人の姿と同じ意匠）
  for (const sx of [1, -1]) {
    const cx = sx * 0.08, cy = 1.035, cz = 0.912, w = 0.11, h = 0.078, t = 0.006, ry = sx * 0.35;
    const L = (x, y, z, sw, sh) => sb.box([x, y, z], [sw, sh, 0.006], { rot: [0, ry, 0], weights: hd, color: BK, group: 'plain' });
    L(cx, cy + h / 2, cz, w, t * 1.4); L(cx, cy - h / 2, cz, w, t);
    L(cx + Math.cos(ry) * w / 2, cy, cz - Math.sin(ry) * w / 2, t, h); L(cx - Math.cos(ry) * w / 2, cy, cz + Math.sin(ry) * w / 2, t, h);
    sb.box([sx * 0.15, cy + 0.01, 0.82], [0.006, 0.006, 0.16], { rot: [0, -sx * 0.5, 0], weights: hd, color: BK, group: 'plain' });
  }
  sb.box([0, 1.045, 0.93], [0.04, 0.006, 0.006], { weights: hd, color: BK, group: 'plain' });
  // 耳（外は白・内は桃色）・耳の毛
  const earDeform = v => { const k = (v.y + 1) / 2; v.x *= 1 - k * 0.85; v.z *= 1 - k * 0.7; return v; };
  for (const [nm, sx] of [['gEarL', 1], ['gEarR', -1]]) {
    const Bp = W(nm), xf = new THREE.Matrix4().makeTranslation(Bp.x, Bp.y, Bp.z).multiply(xfm([0, 0.06, 0], [-0.15, sx * 0.3, -sx * 0.35]));
    sb.blob([0, 0, 0], [0.065, 0.09, 0.03], { deform: earDeform, xf, weights: rw(nm), color: p => (p.y > Bp.y + 0.11 ? FL2 : FUR), w: 12, h: 8, oth: 0.9 });
    sb.blob([0, -0.008, 0.014], [0.042, 0.064, 0.012], { deform: earDeform, xf, weights: rw(nm), color: PINK, w: 10, h: 6, oth: 0 });
  }
  // ピンクの花（左耳のつけ根）
  const flXf = xfm([0.16, 1.13, 0.76], [0.2, 1.1, 0.3], 1);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0], [0.019, 0.017, 0.008], { rot: [0, 0, a], xf: flXf, weights: hd, color: 0xff8cc8, w: 8, h: 6, oth: 0.3 }); }
  sb.blob([0, 0, 0.006], [0.01, 0.01, 0.007], { xf: flXf, weights: hd, color: 0xffe070, w: 6, h: 4, oth: 0 });
  // 胸の黒い帯（ハーネス）・金具・帯の花
  sb.tube([0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2; return { c: [Math.sin(a) * 0.3, 0.7 + Math.cos(a) * 0.315, 0.3], r: [0.045, 0.008] }; }).concat([{ c: [0, 1.015, 0.3], r: [0.045, 0.008] }]), { sides: 4, weights: rw('gChest'), color: BK, capStart: false, capEnd: false, oth: 0.4 });
  torus(sb, 0.03, 0.007, xfm([0.0, 0.73, 0.62], [0, 0, 0]), { weights: rw('gChest'), color: 0xc8c0d8, oth: 0.2 });
  const fl2 = xfm([-0.08, 0.66, 0.635], [0, 0, 0.3], 1.2);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * 0.02, Math.sin(a) * 0.02, 0], [0.017, 0.015, 0.007], { rot: [0, 0, a], xf: fl2, weights: rw('gChest'), color: 0xff8cc8, w: 8, h: 6, oth: 0.3 }); }
  // 脚：前脚（肩 → ひじ → 手首 → 足）・後ろ脚（腿 → ひざ → かかと → 足）。足の先は紫の爪
  const paws = [], claws = [];
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const a = W('gFLu' + s), b = W('gFLl' + s), c = W('gFLp' + s);
    sb.blob([a.x, a.y + 0.03, a.z], [0.11, 0.15, 0.13], { weights: () => [[sb.bi('gChest'), 0.5], [sb.bi('gFLu' + s), 0.5]], color: FUR, w: 14, h: 10, oth: 0.8 });
    sb.tube([{ c: [a.x, a.y, a.z], r: [0.115, 0.12] }, { c: [b.x, b.y + 0.04, b.z], r: [0.088, 0.095] }, { c: [c.x, c.y + 0.02, c.z], r: [0.072, 0.075] }], { sides: 14, sub: 2, ref: [0, 0, 1], weights: sb.along([[0, 'gFLu' + s], [0.45, 'gFLu' + s], [0.55, 'gFLl' + s], [1, 'gFLl' + s]]), color: p => flame(p, 0.75 - (p.y - 0.05) * 1.6), capStart: false, capEnd: false, oth: 0.9 });
    sb.blob([c.x, 0.045, c.z + 0.045], [0.08, 0.05, 0.1], { weights: rw('gFLp' + s), color: p => flame(p, 0.6), w: 12, h: 8, oth: 0.9 });
    for (let k = 0; k < 4; k++) { const tx = c.x + (k - 1.5) * 0.034; sb.blob([tx, 0.035, c.z + 0.13], [0.022, 0.026, 0.026], { weights: rw('gFLp' + s), color: FUR, w: 8, h: 6, oth: 0.6 }); sb.tube([{ c: [tx, 0.03, c.z + 0.15], r: [0.008, 0.008] }, { c: [tx, 0.01, c.z + 0.19], r: [0.001, 0.001] }], { sides: 5, weights: rw('gFLp' + s), color: 0x7a2ad8, oth: 0.2 }); }
    const pw = new THREE.Object3D(); pw.position.set(0, -0.04, 0.12); sb.B['gFLp' + s].add(pw); paws.push(pw); claws.push(pw);
    // 後ろ脚
    const h1 = W('gHLu' + s), h2 = W('gHLl' + s), h3 = W('gHLh' + s), h4 = W('gHLp' + s);
    sb.blob([h1.x, h1.y - 0.06, h1.z + 0.04], [0.13, 0.19, 0.17], { weights: () => [[sb.bi('gBody'), 0.45], [sb.bi('gHLu' + s), 0.55]], color: FUR, w: 14, h: 10, oth: 0.9 });
    sb.tube([{ c: [h1.x, h1.y - 0.04, h1.z], r: [0.12, 0.13] }, { c: [h2.x, h2.y, h2.z], r: [0.09, 0.095] }, { c: [h3.x, h3.y, h3.z], r: [0.062, 0.066] }, { c: [h4.x, h4.y + 0.02, h4.z], r: [0.058, 0.058] }], { sides: 12, sub: 2, ref: [1, 0, 0], weights: sb.along([[0, 'gHLu' + s], [0.3, 'gHLu' + s], [0.4, 'gHLl' + s], [0.62, 'gHLl' + s], [0.72, 'gHLh' + s], [1, 'gHLh' + s]]), color: p => flame(p, 0.75 - (p.y - 0.05) * 1.6), capStart: false, capEnd: false, oth: 0.9 });
    sb.blob([h4.x, 0.045, h4.z + 0.05], [0.075, 0.048, 0.1], { weights: rw('gHLp' + s), color: p => flame(p, 0.6), w: 12, h: 8, oth: 0.9 });
    const pw2 = new THREE.Object3D(); pw2.position.set(0, -0.04, 0.08); sb.B['gHLp' + s].add(pw2); paws.push(pw2);
  }
  // 二本の尾（猫又）：骨の鎖・ふさふさ・先は紫の炎
  const tails = [], tailTips = [], sway = [];
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const names = chain(sb, 'gTail' + s, 'gBody', [sx * 0.07, 0.08, -0.56], [[0, 0, 0], [sx * 0.07, 0.06, -0.12], [sx * 0.09, 0.1, -0.1], [sx * 0.08, 0.12, -0.04], [sx * 0.05, 0.11, 0.02], [sx * 0.02, 0.08, 0.06], [0, 0.04, 0.07]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(-sx * 0.01, 0.0, 0.06)));
    const rad = P.map((_, i) => { const t = i / (P.length - 1); return 0.045 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.9) * 0.04 - (t > 0.9 ? 0.025 : 0); });
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [rad[i], rad[i]], shape: a => { const k = 1 + Math.sin(a * 7 + i * 1.9) * 0.12; return [k, k]; } })), { sides: 16, sub: 3, weights: chainW(sb, names), color: (p, t) => (t > 0.78 ? (t > 0.9 ? FL : FL2) : t > 0.6 ? flame(p, 0.45) : FUR), capStart: true, capEnd: true, capBulge: 0.9, oth: 0.95 });
    tails.push(names);
    const tip = new THREE.Object3D(); tip.position.set(-sx * 0.01, 0.02, 0.06); sb.B[names[names.length - 1]].add(tip); tailTips.push(tip);
    sway.push(...names.map((n, i) => ({ b: sb.B[n], k: 26 - i * 2, d: 4.5, gain: -(0.08 + i * 0.02), baseX: 0, amp: 0.1 + i * 0.03, freq: 0.9 + (sx > 0 ? 0 : 0.17), ph: i * 0.5 + (sx > 0 ? 0 : 1.6), tail: true })));
  }
  const m = sb.build(null, { rim: 0.9, rimColor: 0xd8b8ff, outline: 0.0045, outlineColor: 0x1a0f26 });
  return Object.assign(m, { provisional: true, kind: 'giant_nekomata', male: true, height: 1.2, sway, eyes, paws, claws, tailTips, tails, G: sb.B, bodyR: 0.5 });
}

// ───────────────────────── 境界の先触れ（ボス） ─────────────────────────
/** 根もとを原点。作る時は 1/10 の大きさ（scale を掛けて使う） */
export function buildSakibure() {
  const sb = new SkinBody(DIM), r = rng(909);
  const D1 = 0x120a18, D2 = 0x241430, VE = 0x6a2aa0, PK = 0xff4ab8;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('sBase', null, 0, 0, 0); B('sBody', 'sBase', 0, 0.4, 0); B('sChest', 'sBody', 0, 0.5, 0); B('sHead', 'sChest', 0, 0.36, 0.02);
  const vein = (p) => { const s = Math.sin(p.y * 40 + Math.sin(p.x * 13) * 3) * Math.sin(p.x * 23 + p.z * 19); return s > 0.86 ? PK : s > 0.6 ? VE : (Math.sin(p.y * 7 + p.z * 5) > 0.5 ? D2 : D1); };
  // 胴（根もとは広く、上へ細く）：ゆがんだ断面
  const rings = []; for (let i = 0; i <= 10; i++) { const t = i / 10, y = t * 1.42; rings.push({ c: [Math.sin(t * 5) * 0.04, y, Math.cos(t * 4) * 0.03], r: [0.58 * (1 - t) ** 1.3 + 0.16, 0.5 * (1 - t) ** 1.3 + 0.14], shape: a => { const k = 1 + Math.sin(a * 5 + t * 9) * 0.1 + Math.sin(a * 11 - t * 4) * 0.05; return [k, k]; } }); }
  sb.tube(rings, { sides: 22, sub: 2, ref: [0, 0, 1], weights: sb.along([[0, 'sBase'], [0.25, 'sBase'], [0.4, 'sBody'], [0.65, 'sChest'], [1, 'sHead']]), color: vein, capStart: false, capEnd: true, oth: 1 });
  // 地を這う根（放射状）
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + r() * 0.3, L = 0.9 + r() * 0.7; const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push({ c: [Math.sin(a) * (0.35 + t * L), 0.06 * (1 - t) + Math.sin(t * 9 + i) * 0.02, Math.cos(a) * (0.35 + t * L)], r: [0.09 * (1 - t) + 0.015, 0.06 * (1 - t) + 0.012] }); } sb.tube(pts, { sides: 6, weights: sb.rigid('sBase'), color: vein, capStart: false, capEnd: true, oth: 0.7 }); }
  // 取り込んだ研究施設の物（配管・槽のガラス・金属の板）
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, y = 0.15 + r() * 0.6, d = 0.38 - y * 0.12; const c = [Math.sin(a) * d, y, Math.cos(a) * d]; if (i % 3 === 0) sb.cyl(c, 0.03, 0.03, 0.4 + r() * 0.3, { rot: [r() * 2, a, r() * 2], weights: sb.rigid('sBody'), color: 0x5a5e68, seg: 8, oth: 0.5 }); else if (i % 3 === 1) sb.box(c, [0.14, 0.2 + r() * 0.1, 0.02], { rot: [r(), a, r()], weights: sb.rigid('sBody'), color: 0xa080ff, oth: 0.3 }); else sb.box(c, [0.2, 0.06, 0.12], { rot: [r(), a, r()], weights: sb.rigid('sBody'), color: 0x3a3e48, oth: 0.6 }); }
  // 胸の「縁の輪」と瞳（核）
  const cw = sb.rigid('sChest'), ch = sb.W('sChest');
  torus(sb, 0.16, 0.028, xfm([0, ch.y + 0.04, 0.3], [0, 0, 0]), { weights: cw, color: PK, oth: 0.3 });
  torus(sb, 0.2, 0.01, xfm([0, ch.y + 0.04, 0.29], [0, 0, 0]), { weights: cw, color: 0xffb0e0, oth: 0 });
  sb.blob([0, ch.y + 0.04, 0.27], [0.13, 0.13, 0.05], { weights: cw, color: 0xf4e8f0, w: 16, h: 12, oth: 0 });
  sb.blob([0, ch.y + 0.04, 0.315], [0.06, 0.06, 0.02], { weights: cw, color: PK, w: 12, h: 8, oth: 0 });
  sb.blob([0, ch.y + 0.04, 0.33], [0.016, 0.05, 0.01], { weights: cw, color: 0x14040e, w: 8, h: 6, oth: 0 });
  const core = new THREE.Object3D(); core.position.set(0, 0.04, 0.34); sb.B.sChest.add(core);
  // 頭：とげの冠と小さな目
  const hw = sb.rigid('sHead'), hh = sb.W('sHead');
  sb.blob([0, hh.y + 0.06, 0], [0.16, 0.14, 0.15], { weights: hw, color: D1, w: 14, h: 10 });
  for (let i = 0; i < 9; i++) { const a = -1.2 + i / 8 * 2.4; sb.tube([{ c: [Math.sin(a) * 0.12, hh.y + 0.12, Math.cos(a) * 0.06 - 0.04], r: [0.03, 0.03] }, { c: [Math.sin(a) * 0.22, hh.y + 0.32 + Math.cos(a * 2) * 0.06, Math.cos(a) * 0.04 - 0.1], r: [0.002, 0.002] }], { sides: 5, weights: hw, color: D2, capEnd: true, oth: 0.6 }); }
  const eyes = [];
  for (const [x, y] of [[0.06, 0.08], [-0.06, 0.08], [0.0, 0.14], [0.1, 0.0], [-0.1, 0.0]]) { sb.blob([x, hh.y + y, 0.13], [0.022, 0.016, 0.01], { weights: hw, color: PK, w: 8, h: 6, oth: 0 }); const e = new THREE.Object3D(); e.position.set(x, y, 0.14); sb.B.sHead.add(e); eyes.push(e); }
  // 翼のように広がる 4 本の触腕（目が並ぶ）・前へ伸びる 2 本の腕
  const sway = [], wings = [], arms = [];
  [[0.18, 0.28, -0.05, 1], [-0.18, 0.28, -0.05, -1], [0.14, 0.08, -0.08, 1], [-0.14, 0.08, -0.08, -1]].forEach(([x, y, z, sx], wi) => {
    const lo = wi >= 2, s = lo ? 0.8 : 1;
    const names = chain(sb, 'sWing' + wi + '_', 'sChest', [x, y, z], [[0, 0, 0], [sx * 0.26 * s, 0.2 * s, -0.06], [sx * 0.26 * s, 0.14 * s, -0.02], [sx * 0.24 * s, 0.04, 0.03], [sx * 0.2 * s, -0.08, 0.05], [sx * 0.16 * s, -0.16, 0.06]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(sx * 0.1, -0.12, 0.03)));
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.07 * (1 - i / P.length) + 0.012, 0.05 * (1 - i / P.length) + 0.01] })), { sides: 10, sub: 2, weights: chainW(sb, names), color: vein, capStart: true, capEnd: true, oth: 0.9 });
    // 翼の膜の房（とげ）と目
    for (let k = 1; k < P.length - 1; k++) { const p = P[k]; for (let j = 0; j < 2; j++) sb.tube([{ c: [p.x, p.y, p.z], r: [0.025, 0.02] }, { c: [p.x + sx * 0.05, p.y - 0.12 - j * 0.06, p.z - 0.02 + j * 0.03], r: [0.002, 0.002] }], { sides: 4, weights: sb.rigid(names[Math.min(names.length - 1, k)]), color: D2, capEnd: true, oth: 0.5 }); sb.blob([p.x, p.y + 0.02, p.z + 0.05], [0.018, 0.012, 0.008], { weights: sb.rigid(names[Math.min(names.length - 1, k)]), color: PK, w: 6, h: 4, oth: 0 }); const e = new THREE.Object3D(); e.position.set(0, 0.02, 0.055); sb.B[names[Math.min(names.length - 1, k)]].add(e); if (k % 2) eyes.push(e); }
    wings.push(names);
    sway.push(...names.map((n, i) => ({ b: sb.B[n], k: 10 + i * 1.5, d: 2.6, gain: 0.2, baseX: 0, amp: 0.12 + i * 0.03, freq: 0.5 + wi * 0.07, ph: wi * 1.3 + i * 0.4 })));
  });
  for (const sx of [1, -1]) {
    const names = chain(sb, 'sArm' + (sx > 0 ? 'L' : 'R') + '_', 'sChest', [sx * 0.2, 0.05, 0.12], [[0, 0, 0], [sx * 0.12, -0.1, 0.2], [sx * 0.06, -0.22, 0.22], [0, -0.28, 0.16], [-sx * 0.02, -0.22, 0.1]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.05, 0.12)));
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.08 - i * 0.01, 0.07 - i * 0.008] })), { sides: 10, sub: 2, weights: chainW(sb, names), color: vein, capStart: true, capEnd: true, oth: 0.9 });
    const tip = P[P.length - 1]; for (let k = 0; k < 3; k++) sb.tube([{ c: [tip.x + (k - 1) * 0.04, tip.y, tip.z], r: [0.016, 0.016] }, { c: [tip.x + (k - 1) * 0.07, tip.y - 0.06, tip.z + 0.14], r: [0.001, 0.001] }], { sides: 5, weights: sb.rigid(names[names.length - 1]), color: 0x2a1a38, capEnd: true, oth: 0.5 });
    arms.push(names);
  }
  const m = sb.build(null, { rim: 1.1, rimColor: 0xff5ac8, outline: 0.004, outlineColor: 0x050208 });
  return Object.assign(m, { provisional: true, kind: 'sakibure', height: 1.6, bodyR: 0.8, sway, wings, arms, core, eyes, G: sb.B });
}
export { lerpC };
