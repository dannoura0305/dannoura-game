// フェーズ8 で増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自（参考画像の雰囲気だけ。他作品の意匠を写さない）。
// ・境界を喰らうもの（終章A のボス）：研究者が境界応答を集めすぎて膨れた巨体。記録の帯（フィルムのこま・書類の束）が重なった体、
//   6 枚の翼（こまの並び・目がいくつも開く）、胸の「淵の目」（黒い瞳・時計の目盛りの輪・二本の針＝核）、時計の針の冠、淵へ垂れる紫の根。流血の表現はしない。
// ・研究者（終章B）：白衣の人影。境界応答の紫の光が縫い目のように走る。顔は光でよく見えない（名前・顔は出さない）。
// ・配偶者に似た異形：記録の光でできた人影（半透明の淡い光）。顔は描かない。戦わない・本人かは決めない（STORY_BIBLE §9）。
// ・娘（4 歳）：結末の家の場面だけ。・だんのうら（結末A）：白と紫が混ざった髪（化けが不安定なだけ。けがではない）＝ models3 の mixed。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlasExpr, drawEye, drawBrow, drawMouth, drawNose, drawBlush } from './skin.js';
import { humanBody, humanHead, hairCap, onHead, torus, xfm, glowEyes } from './models.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chain(sb, prefix, parent, start, offs) { const names = []; let par = parent; offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; }); return names; }
const chainW = (sb, names) => sb.along(names.map((nm, i) => [i / (names.length - 1), nm]));
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();

// ───────────────────────── 境界を喰らうもの（終章A のボス） ─────────────────────────
/** 宙に浮く巨体。原点は淵の上の地面・+z が前。高さ約 2.7（scale 13 で約 35m）・翼を広げて幅約 4.4。
 *  骨：kRoot・kBody・kChest・kCrown・翼 kW{L|R}{0..2}_0..2・根 kT{0..5}_0..3 */
export function buildKuramono() {
  const sb = new SkinBody(DIM), r = rng(4242);
  const DK = 0x16101c, DK2 = 0x2a2032, FR = 0x3e3248, FR2 = 0x5a4a66, PAPER = 0xb8b0c4, GL = 0xd050ff, PK = 0xff3aa8;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z), W = n => sb.W(n), rw = n => sb.rigid(n);
  B('kRoot', null, 0, 0, 0); B('kBody', 'kRoot', 0, 1.2, 0); B('kChest', 'kBody', 0, 0.42, 0.04); B('kCrown', 'kChest', 0, 0.62, -0.02);
  // 翼：左右 3 枚ずつ（上ほど長い）。こまの帯が骨に沿って並ぶ
  const wings = [];
  for (const [s, sx] of [['L', 1], ['R', -1]]) for (let i = 0; i < 3; i++) {
    const len = [0.84, 0.7, 0.56][i], up = [0.42, 0.1, -0.2][i];
    const n = chain(sb, `kW${s}${i}_`, 'kChest', [sx * 0.34, 0.12 - i * 0.16, -0.12], [[0, 0, 0], [sx * len, up * len * 0.9, -0.06], [sx * len * 0.92, up * len * 0.6 + 0.04, -0.04], [sx * len * 0.7, up * len * 0.3 - 0.02, 0.0]]);
    wings.push({ s, sx, i, n });
  }
  const tendrils = [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2 + 0.3; return chain(sb, `kT${i}_`, 'kBody', [Math.sin(a) * 0.3, -0.36, Math.cos(a) * 0.24], [[0, 0, 0], [Math.sin(a) * 0.12, -0.28, Math.cos(a) * 0.1], [Math.sin(a) * 0.1, -0.3, Math.cos(a) * 0.08], [Math.sin(a) * 0.06, -0.32, Math.cos(a) * 0.04]]); });
  // 体：前かがみの卵形の塊（暗い）。記録の帯（薄い板）が何重にも巻きつく
  const bd = W('kBody'), ch = W('kChest');
  sb.blob([0, bd.y + 0.16, 0], [0.5, 0.62, 0.42], { weights: sb.along([[0, 'kBody'], [1, 'kChest']]), color: p => (Math.sin(p.y * 40 + Math.atan2(p.x, p.z) * 3) > 0.7 ? DK2 : DK), w: 26, h: 20, oth: 0.9 });
  for (let k = 0; k < 7; k++) {                                   // 巻きつく帯（こまの縁が明るい）
    const y = bd.y - 0.3 + k * 0.13, rad = 0.46 + Math.sin(k * 1.3) * 0.06, n = 14;
    for (let j = 0; j < n; j++) {
      const a = j / n * Math.PI * 2 + k * 0.4, x = Math.sin(a) * rad, z = Math.cos(a) * rad * 0.86;
      if (z > 0.2 && Math.abs(y - ch.y) < 0.24 && Math.abs(x) < 0.3) continue;                 // 胸の目の所は空ける
      sb.box([x, y, z], [0.2, 0.09, 0.02], { rot: [0, a, (r() - 0.5) * 0.3], weights: y > ch.y - 0.15 ? rw('kChest') : rw('kBody'), color: j % 3 ? FR : FR2, oth: 0.5 });
      if (j % 4 === 0) sb.box([x * 1.02, y, z * 1.02], [0.16, 0.012, 0.004], { rot: [0, a, 0], weights: y > ch.y - 0.15 ? rw('kChest') : rw('kBody'), color: GL, group: 'glow' });
    }
  }
  // 書類の束がはみ出す（白い紙・端が紫に光る）
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, y = bd.y - 0.2 + r() * 0.7; sb.box([Math.sin(a) * 0.5, y, Math.cos(a) * 0.42], [0.12, 0.16, 0.006], { rot: [r() - 0.5, a + (r() - 0.5), r() - 0.5], weights: y > ch.y - 0.15 ? rw('kChest') : rw('kBody'), color: PAPER, oth: 0.3 }); }
  // 胸の「淵の目」：黒い瞳・目盛りの輪（12）・内の輪・二本の針（核）
  const ez = 0.46, ey = ch.y + 0.02;
  sb.blob([0, ey, ez - 0.04], [0.32, 0.32, 0.08], { weights: rw('kChest'), color: 0x020004, w: 20, h: 14, oth: 0 });
  torus(sb, 0.36, 0.028, xfm([0, ey, ez]), { weights: rw('kChest'), color: PK, group: 'glow', ts: 32 });
  torus(sb, 0.17, 0.012, xfm([0, ey, ez + 0.01]), { weights: rw('kChest'), color: 0xff8ad8, group: 'glow', ts: 24 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sb.box([Math.sin(a) * 0.45, ey + Math.cos(a) * 0.45, ez - 0.01], [0.022, i % 3 ? 0.06 : 0.11, 0.01], { rot: [0, 0, -a], weights: rw('kChest'), color: i % 3 ? GL : PK, group: 'glow' }); }
  sb.box([0.06, ey + 0.08, ez + 0.02], [0.012, 0.2, 0.006], { rot: [0, 0, -0.6], weights: rw('kChest'), color: 0xffd0f0, group: 'glow' });
  sb.box([-0.03, ey + 0.05, ez + 0.02], [0.012, 0.13, 0.006], { rot: [0, 0, 0.9], weights: rw('kChest'), color: 0xffd0f0, group: 'glow' });
  const core = new THREE.Object3D(); core.position.set(0, ey - ch.y, ez - ch.z + 0.02); sb.B.kChest.add(core);
  // 冠：時計の針の束（5 本・先が光る）と浮いた輪
  const cr = W('kCrown'), eyes = [];
  sb.blob([0, cr.y - 0.12, -0.02], [0.24, 0.16, 0.2], { weights: rw('kCrown'), color: DK2, w: 16, h: 10 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 4 - 0.5) * 1.6, tip = [Math.sin(a) * 0.36, cr.y + 0.34 + Math.cos(a) * 0.1, -0.04];
    sb.strand([[Math.sin(a) * 0.08, cr.y - 0.06, -0.02], [Math.sin(a) * 0.22, cr.y + 0.16, -0.04], tip], 0.03, { base: 0x4a3e56, tip: 0x8a6ab0, weights: rw('kCrown'), segs: 5, sides: 4, taper: 0.9, flat: 0.2, out: [0, 0, 1] });
    sb.blob(tip, [0.03, 0.03, 0.03], { weights: rw('kCrown'), color: PK, group: 'glow', w: 6, h: 5 });
  }
  torus(sb, 0.3, 0.012, xfm([0, cr.y + 0.5, -0.06], [Math.PI / 2 - 0.25, 0, 0]), { weights: rw('kCrown'), color: GL, group: 'glow', ts: 28 });
  // 翼：こま（暗い板・明るい縁）。こまのいくつかに目（白目＋光る瞳）
  for (const Wg of wings) {
    const P = Wg.n.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(Wg.sx * 0.3, 0, 0)));
    const total = 9 - Wg.i;
    for (let k = 0; k < total; k++) {
      const t = k / (total - 1), seg = Math.min(P.length - 2, Math.floor(t * (P.length - 1))), u = t * (P.length - 1) - seg;
      const q = P[seg].clone().lerp(P[seg + 1], u), wb = Wg.n[Math.min(Wg.n.length - 1, seg + (u > 0.5 ? 1 : 0))];
      const h = (0.34 - t * 0.18) * (1 - Wg.i * 0.12), dir = Math.atan2(P[seg + 1].y - P[seg].y, Math.abs(P[seg + 1].x - P[seg].x));
      sb.box([q.x, q.y - h * 0.3, q.z], [0.15, h, 0.024], { rot: [0, 0, Wg.sx * dir - Wg.sx * 0.3], weights: rw(wb), color: k % 2 ? FR : DK2, oth: 0.6 });
      sb.box([q.x, q.y - h * 0.3 + h / 2, q.z + 0.014], [0.15, 0.01, 0.004], { rot: [0, 0, Wg.sx * dir - Wg.sx * 0.3], weights: rw(wb), color: GL, group: 'glow' });
      if ((k + Wg.i) % 2 === 0 && k > 0) {
        sb.blob([q.x, q.y - h * 0.3, q.z + 0.03], [0.045, 0.03, 0.01], { weights: rw(wb), color: 0xeee6f6, w: 8, h: 6, oth: 0 });
        sb.blob([q.x, q.y - h * 0.3, q.z + 0.04], [0.016, 0.026, 0.006], { weights: rw(wb), color: PK, group: 'glow', w: 6, h: 5 });
        if (eyes.length < 10 && k % 4 === 2) { const o = new THREE.Object3D(); const bp = W(wb); o.position.set(q.x - bp.x, q.y - h * 0.3 - bp.y, q.z + 0.05 - bp.z); sb.B[wb].add(o); eyes.push(o); }
      }
    }
  }
  // 根：淵へ垂れる紫の帯（光る）
  tendrils.forEach((nm, i) => { const P = nm.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.5, 0))); sb.strand(P.map(p => [p.x, p.y, p.z]), 0.05, { weights: chainW(sb, nm), segs: 10, sides: 5, taper: 0.9, flat: 0.3, group: 'glow', out: [0, 0, 1], color: (p, t) => lerpC(0xb040ff, 0x10001a, t) }); });
  const m = sb.build(null, { rim: 0.6, rimColor: 0xd070ff, outline: 0.012, outlineColor: 0x060408, flameAmp: 0.03, flameK: 1.4 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  return Object.assign(m, { provisional: true, kind: 'kuramono', height: 2.7, bodyR: 0.5, eyes, core, wings, tendrils, G: sb.B, sway: [] });
}

// ───────────────────────── 研究者（終章B・人の大きさ） ─────────────────────────
/** 白衣（ひざ下まで）・細身・灰色の髪。紫の光の筋。顔は光（よく見えない）。右手に記録の板（クリップボード） */
export function buildResearcher(opt = {}) {
  const d = Object.assign({}, DIM, { leg: 0.88, neck: 0.2 });
  const sb = new SkinBody(d), R = d.headR;
  const COAT = opt.dim ? 0x8a8a96 : 0xd8d8e0, COAT2 = 0xa8a8b4, SHIRT = 0x2a2a3a, SK = 0xc8beb8, HAIR = 0x3a3840;
  humanBody(sb, {
    torso: [[0, 0.1, 0.075, 0], [0.12, 0.118, 0.082, 0], [0.32, 0.112, 0.078, 0], [0.55, 0.12, 0.082, 0.004], [0.8, 0.138, 0.086, 0], [0.93, 0.104, 0.068, 0], [1, 0.044, 0.042, 0]],
    torsoColor: p => (p.z > 0.05 && Math.abs(p.x) < 0.035 && p.y > 1.0 ? SHIRT : COAT), torsoFold: 1,
    armR: [0.042, 0.036, 0.03], armColor: (t) => (t > 0.92 ? SK : COAT), legR: [0.06, 0.044, 0.044, 0.032], legColor: () => 0x24242e,
    skin: SK, shoe: 0x1a1a20, sole: 0x0a0a0c, neckR: 0.032, hand: 1.0, cuff: COAT2,
  });
  const hy = sb.W('hips').y;
  const hemW = p => { const k = Math.max(0, Math.min(1, (hy - p.y) / 0.4)) * 0.6; const wl = Math.max(0, Math.min(1, (p.x + 0.03) / 0.09)) * k, wr = Math.max(0, Math.min(1, (0.03 - p.x) / 0.09)) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube([[hy + 0.02, 0.13, 0.095], [hy - 0.2, 0.16, 0.12], [hy - 0.44, 0.175, 0.13]].map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz], shape: a => [1, Math.abs(a - Math.PI / 2) < 0.12 ? 0.86 : 1] })), { sides: 18, sub: 2, weights: hemW, color: (p, t) => (t > 0.92 ? COAT2 : COAT), capStart: false, capEnd: false, oth: 0.85, fold: 1 });
  humanHead(sb, { R, skin: SK, faceless: true, ears: true, jaw: 0.36 });
  const hw = sb.rigid('head');
  hairCap(sb, R, { base: HAIR, dark: 0x24222a, band: 0x5a5866, faceZ: 0.26, hairline: 0.5, nape: -0.62, bottom: -0.86, sx: 1.06, sz: 1.06 });
  const rr = rng(808);
  for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2; sb.strand([onHead(sb, R, [x * 0.7, 0.86, 0.5], 1.04), onHead(sb, R, [x * 0.95, 0.5, 0.88], 1.12), onHead(sb, R, [x * 1.05 + (rr() - 0.5) * 0.2, 0.18, 0.96], 1.14)], R * 0.2, { base: HAIR, tip: 0x5a5866, weights: hw, out: [x, 0.3, 1], segs: 4, flat: 0.4 }); }
  // 顔の光（境界応答）：顔の前に淡い紫の光の面（顔立ちは見えない）
  sb.blob(onHead(sb, R, [0, -0.1, 1], 1.02), [R * 0.62, R * 0.7, R * 0.12], { weights: hw, color: 0xe0b0ff, group: 'glow', w: 12, h: 10 });
  // 紫の光の筋（白衣の縫い目のように・腕と胴）
  for (let i = 0; i < 9; i++) { const a = rr() * Math.PI * 2, y = 0.75 + rr() * 0.6; sb.strand([[Math.sin(a) * 0.13, y, Math.cos(a) * 0.09], [Math.sin(a + 0.3) * 0.14, y - 0.08, Math.cos(a + 0.3) * 0.1], [Math.sin(a + 0.6) * 0.15, y - 0.17, Math.cos(a + 0.6) * 0.1]], 0.008, { weights: y > 1.1 ? sb.rigid('chest') : sb.rigid('spine'), segs: 4, sides: 3, group: 'glow', color: () => 0xb050ff }); }
  // 右手の記録の板
  const rh = sb.W('rightHand'), rhw = sb.rigid('rightHand');
  sb.box([rh.x - 0.01, rh.y - 0.12, rh.z + 0.06], [0.02, 0.26, 0.19], { weights: rhw, color: 0x5a4a3a });
  sb.box([rh.x - 0.022, rh.y - 0.12, rh.z + 0.06], [0.004, 0.23, 0.16], { weights: rhw, color: 0xe8e4d8, oth: 0 });
  const m = sb.build(null, { rim: 0.55, rimColor: 0xc080ff, outline: 0.009, outlineColor: 0x0a0812, flameAmp: 0.015, flameK: 1.0 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  const weak = new THREE.Object3D(); weak.position.set(0, 0.1, 0.12); sb.B.chest.add(weak);
  return Object.assign(m, { height: 1.74, provisional: true, kind: 'kenkyusha', bodyR: 0.34, weak, weakColor: 0xd8a0ff });
}

// ───────────────────────── 配偶者に似た異形（記録の光の人影） ─────────────────────────
/** 戦わない。白衣のような長い上着の、淡い光の人影。顔は描かない（本人かどうかは決めない） */
export function buildSpouseLike() {
  const m = buildResearcher({ dim: true });
  const mat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  m.mesh.material = mat; m.mesh.castShadow = false; m.outline.visible = false; m.outline = null; if (m.glowMesh) m.glowMesh.visible = false; if (m.faceMesh) m.faceMesh.visible = false;
  m.mats.ghost = mat;
  return Object.assign(m, { kind: 'spouse_like', provisional: true, ghost: true, weak: null });
}

// ───────────────────────── 娘（4 歳・結末の家の場面だけ） ─────────────────────────
export function buildDaughter() {
  const k = 0.6, d = {}; for (const [n, v] of Object.entries(DIM)) d[n] = v * k;
  Object.assign(d, { headR: 0.098, neck: d.neck * 0.85 });
  const sb = new SkinBody(d), R = d.headR;
  const DR = 0xf4a6c4, DR2 = 0xfff0f6, SKIN = 0xffe8dc;
  humanBody(sb, {
    torso: [[0, 0.075, 0.062, 0], [0.12, 0.092, 0.07, 0], [0.32, 0.088, 0.068, 0], [0.55, 0.09, 0.068, 0.004], [0.8, 0.094, 0.064, 0], [0.93, 0.076, 0.052, 0], [1, 0.034, 0.03, 0]],
    torsoColor: (p) => (p.y > sb.W('chest').y + 0.03 && p.z > 0.02 ? DR2 : DR),
    armR: [0.03, 0.026, 0.023], armColor: (t) => (t > 0.86 ? SKIN : DR2), cuff: DR2,
    legR: [0.044, 0.032, 0.034, 0.024], legColor: (t) => (t < 0.3 ? DR : 0xfff4e8), skin: SKIN, shoe: 0xe86a8a, sole: 0xf0f0f0, neckR: 0.024, shoeW: 0.8, hand: 0.7,
  });
  const hy = sb.W('hips').y;
  sb.tube([[hy + 0.04, 0.09, 0.075], [hy - 0.04, 0.12, 0.1], [hy - 0.1, 0.13, 0.11]].map(([y, rx, rz]) => ({ c: [0, y, 0], r: [rx, rz] })), { sides: 16, weights: sb.rigid('hips'), color: (p, t) => (t > 0.8 ? DR2 : DR), capStart: false, capEnd: false, oth: 0.8 });   // ワンピースのすそ
  humanHead(sb, { R, skin: SKIN, jaw: 0.46, eyeW: 0.6, eyeH: 0.74, blush: true });
  const H = 0x3a2a22, HL = 0x5a4236, hw = sb.rigid('head');
  hairCap(sb, R, { base: H, dark: H, band: HL, faceZ: 0.24, hairline: 0.4, nape: -0.7, bottom: -0.9, sx: 1.12, sz: 1.12 });
  for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2; sb.strand([onHead(sb, R, [x * 0.7, 0.85, 0.5], 1.05), onHead(sb, R, [x * 0.9, 0.5, 0.9], 1.1), onHead(sb, R, [x, 0.22, 0.98], 1.08)], R * 0.22, { base: H, tip: HL, weights: hw, out: [x, 0.3, 1], segs: 4 }); }
  for (const sx of [1, -1]) {                                               // 二つ結び・ピンクのゴム
    const b = onHead(sb, R, [sx * 0.9, 0.1, -0.35], 1.1);
    sb.blob(b, [R * 0.12, R * 0.12, R * 0.12], { weights: hw, color: 0xff6aa0, w: 8, h: 6 });
    sb.strand([b, [b[0] + sx * R * 0.35, b[1] - R * 0.3, b[2] - R * 0.1], [b[0] + sx * R * 0.45, b[1] - R * 0.75, b[2] - R * 0.05]], R * 0.24, { base: H, tip: HL, weights: hw, out: [sx, 0, 0], segs: 5 });
  }
  const tex = faceAtlasExpr((g, E) => {
    drawEye(g, 0, 0, { iris: '#5a3a28', dark: '#1a0e08', light: '#f0d0b0', lashW: 6, rw: 44, rh: 54, lid: E.lid, happy: E.happy, flick: false });
    drawBrow(g, Object.assign({ color: '#3a2a22', w: 5, arch: 5 }, E.brow));
    drawMouth(g, Object.assign({ color: '#c05068', smile: 6, w: 4 }, E.mouth));
    drawNose(g, {}); drawBlush(g, {});
  }, 'smile');
  const m = sb.build(tex, { rim: 0.4, rimColor: 0xffe0c0 });
  return Object.assign(m, { height: 1.0, provisional: true, kind: 'daughter', eyes: [sb.B.eyeL, sb.B.eyeR], faceTex: tex, setExpr: n => tex.userData.setExpr(n) });
}
export { glowEyes };
