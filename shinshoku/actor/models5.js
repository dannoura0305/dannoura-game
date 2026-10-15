// フェーズ6 で作り直した／増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自（concept_04・05 は雰囲気の参考だけ）。
// ・巨大猫又（だんのうらの巨大な姿・男性の化け猫）：長い脚・深い胸・低く構えた頭の、気高く猛々しい白い獣。首と胸のたてがみ、背の逆立つ毛、
//   肩・ひじ・腿の房、長く曲がった紫の爪、二本の長い尾。毛先と脚・尾に紫の炎（加算の「炎の毛」＝描画呼び出し +1）。めがね・ピンクの花・黒い帯はそのまま。
// ・境界の先触れ（第4章のボス・作り直し）：背を丸めた黒い巨体に、角の冠・縦に裂けた胸の「縁の輪」・目の並ぶ 6 本の翼の触腕と膜・長い鉤爪の腕。
// ・継接（つぎはぎ・第5章のボス）：いくつもの可能性の体がつながった中ボス。縫い目（紫の糸）、仮面のような 3 つの顔と目の群れ、
//   戸を叩く長い右腕・鞄を抱く左腕・帰り道を歩く脚、背の触腕。部分ごとに壊れる（骨の大きさを 0 にして隠す）。
// ・収容者（旧研究棟の被験者）：病衣・拘束の帯・被験者番号の札。顔は布で覆われ、目だけが光る。
// 異形は不気味だが流血・欠損の表現はしない（壊れた部分は黒い霧になって消える）。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlas } from './skin.js';
import { humanBody, humanHead, glowEyes, xfm, torus } from './models.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chain(sb, prefix, parent, start, offs) { const names = []; let par = parent; offs.forEach((o, i) => { const p = i === 0 ? start : o; sb.addBone(prefix + i, par, p[0], p[1], p[2]); names.push(prefix + i); par = prefix + i; }); return names; }
const chainW = (sb, names) => sb.along(names.map((nm, i) => [i / (names.length - 1), nm]));
const lerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))).getHex();
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm3 = a => { const L = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / L, a[1] / L, a[2] / L]; };

/**
 * 尖った毛の房（平たい管の先細り）。root から dir へ len、途中で bend（下・後ろへの垂れ）。色は根もと → 先。
 * opt：{ w, bend:[x,y,z], col0, col1, weights, out, segs, sides, group, oth }
 */
function tuft(sb, root, dir, len, opt = {}) {
  const d = norm3(dir), b = opt.bend || [0, -0.25, -0.2];
  const p1 = add3(add3(root, d, len * 0.5), b, len * 0.12), p2 = add3(add3(root, d, len), b, len * 0.42);
  const c0 = opt.col0 ?? 0xf6f2fc, c1 = opt.col1 ?? 0xd8c8f4;
  return sb.strand([root, p1, p2], opt.w || 0.03, { flat: opt.flat ?? 0.5, taper: opt.taper ?? 0.75, bulge: opt.bulge ?? 0.55, segs: opt.segs || 4, sides: opt.sides || 4, out: opt.out || [0, 1, 0],
    weights: opt.weights, group: opt.group, color: (p, t) => lerpC(c0, c1, t * 1.1 - 0.1), oth: opt.oth ?? ((p, t) => 0.12 * (1 - t)) });
}
/** 炎の舌（glow の組・加算）：根もとが明るく先が黒＝見えない。oth＝揺れ（先ほど大きい） */
function flame(sb, root, dir, len, opt = {}) {
  const d = norm3(dir), b = opt.bend || [0, 0.3, -0.1];
  const p1 = add3(add3(root, d, len * 0.45), b, len * 0.1), p2 = add3(add3(root, d, len), b, len * 0.35);
  const c0 = opt.col ?? 0xa050ff, c1 = opt.col1 ?? 0x2a0858;
  return sb.strand([root, p1, p2], opt.w || 0.035, { flat: 0.55, taper: 0.8, bulge: 0.7, segs: 4, sides: 5, out: opt.out || [1, 0, 0], group: 'glow', weights: opt.weights,
    color: (p, t) => (t > 0.92 ? 0x000000 : lerpC(c0, c1, Math.pow(t, 0.8))), oth: (p, t) => t });
}

// ───────────────────────── 巨大猫又（だんのうらの巨大な姿） ─────────────────────────
/** 足もとを原点・+z が前。作る時は 1/8 の大きさ（scale を掛けて使う）。頭の高さ ≈ 1.05（×8 ≈ 8.4m） */
export function buildGiantNekomata() {
  const sb = new SkinBody(DIM), r = rng(505);
  const FUR = 0xf7f4fd, FUR2 = 0xe6def6, SH = 0xc8bae6, PINK = 0xff9ccc, FL = 0x9a48ff, FL2 = 0xcf9cff, BK = 0x15101c, CLAW = 0xb868ff;
  const BODY_Y = 0.86;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('gBody', null, 0, BODY_Y, -0.3); B('gChest', 'gBody', 0, 0.05, 0.54); B('gNeck', 'gChest', 0, 0.12, 0.2); B('gHead', 'gNeck', 0, 0.07, 0.15); B('gJaw', 'gHead', 0, -0.06, 0.08);
  B('gEarL', 'gHead', 0.1, 0.11, -0.03); B('gEarR', 'gHead', -0.1, 0.11, -0.03);
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    B('gFLu' + s, 'gChest', sx * 0.17, -0.1, 0.04); B('gFLl' + s, 'gFLu' + s, 0, -0.39, -0.03); B('gFLp' + s, 'gFLl' + s, 0, -0.35, 0.03);
    B('gHLu' + s, 'gBody', sx * 0.16, -0.03, -0.3); B('gHLl' + s, 'gHLu' + s, 0, -0.32, 0.14); B('gHLh' + s, 'gHLl' + s, 0, -0.3, -0.18); B('gHLp' + s, 'gHLh' + s, 0, -0.13, 0.07);
  }
  const W = n => sb.W(n), rw = n => sb.rigid(n), bi = n => sb.bi(n);
  const mixW = (a, b, k) => () => [[bi(a), 1 - k], [bi(b), k]];
  // 毛の色：白い地に紫の炎の模様（上へ揺らぐ筋）。k が大きいほど紫が濃い（脚の先・尾の先）
  const flameCol = (p, k) => { const s = Math.sin(p.x * 37 + p.y * 11) * 0.5 + Math.sin(p.z * 29 - p.y * 23 + p.x * 5) * 0.5; const v = k + s * 0.22; return v > 0.66 ? (v > 0.84 ? FL : FL2) : v > 0.5 ? FUR2 : FUR; };
  // ── 胴（尻 → 胸）：深く厚い胸・くびれた腰・力のある尻 ──
  const T = [[-0.7, 0.1, 0.1, 0.9], [-0.63, 0.2, 0.22, 0.9], [-0.48, 0.225, 0.25, 0.89], [-0.3, 0.2, 0.21, 0.88], [-0.12, 0.205, 0.23, 0.88], [0.06, 0.235, 0.28, 0.88], [0.24, 0.255, 0.31, 0.88], [0.4, 0.245, 0.3, 0.91], [0.52, 0.2, 0.24, 0.95], [0.58, 0.13, 0.15, 0.98]];
  sb.tube(T.map(([z, rx, ry, y]) => ({ c: [0, y - (z > 0 ? z * 0.1 : 0), z], r: [rx, ry], shape: a => { const k = 1 + Math.sin(a * 6 + z * 9) * 0.035; return [k, a > Math.PI ? (z > -0.2 ? 1.1 : 0.95) : 0.97]; } })), { sides: 24, sub: 2, ref: [0, 1, 0], weights: sb.along([[0, 'gBody'], [0.55, 'gBody'], [0.78, 'gChest'], [1, 'gChest']]), color: p => (p.y < 0.68 ? lerpC(FUR2, SH, (0.68 - p.y) * 3) : flameCol(p, 0.16 + Math.max(0, -p.z - 0.35) * 0.6)), capStart: true, capEnd: true, oth: 1, fold: 0.2 });
  // 首（太く前へ）
  sb.tube([{ c: [0, 0.94, 0.34], r: [0.19, 0.21] }, { c: [0, 1.02, 0.44], r: [0.15, 0.16] }, { c: [0, 1.08, 0.54], r: [0.12, 0.12] }], { sides: 18, ref: [1, 0, 0], weights: sb.along([[0, 'gChest'], [0.5, 'gNeck'], [1, 'gHead']]), color: FUR, capStart: false, capEnd: false, oth: 0.9 });
  // ── たてがみ（首から胸・肩へ：放射状の毛の房を 3 列）── 気高い量感とシルエットの要
  for (let row = 0; row < 3; row++) {
    const cz = 0.52 - row * 0.1, cy = 1.04 - row * 0.05, n = 18 - row * 2;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.92 + i / (n - 1) * Math.PI * 1.84 + (r() - 0.5) * 0.12;
      const ox = Math.sin(a), oy = Math.cos(a) * 0.95;
      const root = [ox * (0.13 + row * 0.04), cy + oy * (0.13 + row * 0.04), cz - row * 0.02];
      const dir = [ox * 0.55, oy * 0.45 - 0.25, -1];
      const len = (0.24 + row * 0.06 + r() * 0.07) * (oy < -0.3 ? 0.75 : 1);
      tuft(sb, root, dir, len, { w: 0.08 + row * 0.012, bend: [0, -0.22, -0.15], col0: FUR, col1: row === 2 ? FL2 : 0xebe2fa, weights: row ? mixW('gChest', 'gNeck', 0.3) : mixW('gNeck', 'gChest', 0.3), out: [ox, oy, 0] });
    }
  }
  // 胸のよだれ掛けの毛（下へ垂れる）
  for (let i = 0; i < 12; i++) { const x = (i / 11 - 0.5) * 0.32, y = 0.86 - Math.abs(x) * 0.4 - r() * 0.05, z = 0.48 + Math.cos(x * 4) * 0.08; tuft(sb, [x, y, z], [x * 0.6, -1, 0.3], 0.16 + r() * 0.06, { w: 0.06, bend: [0, -0.1, -0.15], col0: FUR, col1: FUR2, weights: rw('gChest'), out: [0, 0, 1] }); }
  // 背の逆立つ毛（肩 → 尻：後ろへ流れる）と、その間の炎
  for (let i = 0; i < 15; i++) {
    const z = 0.34 - i * 0.07, top = 0.88 + (z > 0 ? 0.3 - z * 0.2 : 0.22 + z * 0.06);
    for (const sx of [-1, 0, 1]) {
      if (sx && i % 2) continue;
      tuft(sb, [sx * 0.1, top - Math.abs(sx) * 0.04, z], [sx * 0.3, 0.42, -1], 0.15 + r() * 0.06 + (i < 6 ? 0.06 : 0), { w: 0.075, bend: [sx * 0.05, -0.12, -0.2], col0: FUR, col1: i > 10 ? FL2 : 0xe6dafa, weights: z > -0.05 ? rw('gChest') : rw('gBody'), out: [0, 1, 0] });
    }
    if (i % 3 === 1) flame(sb, [0, top + 0.02, z], [0, 1, -0.5], 0.16 + r() * 0.08, { w: 0.07, weights: z > -0.05 ? rw('gChest') : rw('gBody') });
  }
  // 脇・腹の房（下と後ろへ）
  for (let i = 0; i < 16; i++) { const z = 0.3 - r() * 0.9, a = (r() < 0.5 ? -1 : 1) * (1.2 + r() * 0.5); const y = 0.88 + Math.cos(a) * 0.24, x = Math.sin(a) * 0.23; tuft(sb, [x, y, z], [Math.sign(x) * 0.35, -0.45, -1], 0.15 + r() * 0.06, { w: 0.075, col0: FUR, col1: r() < 0.3 ? FL2 : FUR2, weights: z > -0.05 ? rw('gChest') : rw('gBody'), out: [Math.sign(x), 0, 0] }); }
  // ── 頭：猫の頭骨（額は低く広い）・短く太い鼻づら・眉の張り（険しい目）・顔の縁の房・牙 ── 座標は頭の骨（HC）からの相対
  const hd = rw('gHead'), HC = W('gHead'), h3 = (x, y, z) => [HC.x + x, HC.y + y, HC.z + z];
  sb.blob(h3(0, 0.04, -0.01), [0.12, 0.098, 0.125], { weights: hd, color: FUR, w: 24, h: 16, deform: v => { if (v.y > 0.3) v.y *= 0.85; if (v.z > 0.3 && v.y < 0) v.y *= 0.9; return v; } });   // 頭
  sb.blob(h3(0, -0.035, 0.112), [0.056, 0.042, 0.072], { weights: hd, color: FUR, w: 16, h: 10 });                                                                       // 鼻づら
  sb.blob(h3(0, 0.008, 0.12), [0.042, 0.03, 0.07], { rot: [-0.32, 0, 0], weights: hd, color: FUR, w: 12, h: 8 });                                                        // 鼻すじ
  for (const sx of [1, -1]) sb.blob(h3(sx * 0.024, -0.05, 0.158), [0.026, 0.02, 0.022], { weights: hd, color: FUR, w: 10, h: 8 });                                    // ひげの付け根
  sb.blob(h3(0, -0.012, 0.182), [0.016, 0.011, 0.01], { rot: [0.35, 0, 0], weights: hd, color: 0xb05090, w: 10, h: 6, oth: 0.3, deform: v => { if (v.y < 0) v.x *= 0.45 + (v.y + 1) * 0.55; return v; } });   // 鼻（逆三角）
  sb.box(h3(0, -0.034, 0.181), [0.003, 0.022, 0.003], { weights: hd, color: 0x3a1a34, oth: 0 });
  for (const sx of [1, -1]) {
    sb.blob(h3(sx * 0.055, 0.062, 0.093), [0.054, 0.019, 0.03], { rot: [0.2, sx * 0.36, sx * 0.4], weights: hd, color: FUR, w: 10, h: 6, oth: 0.8 });                  // 眉の張り（内側が下がる＝険しい）
    for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.32; tuft(sb, h3(sx * 0.105, -0.015 + Math.sin(a) * 0.065, 0.03 - k * 0.006), [sx * 1, Math.sin(a) * 0.9 - 0.15, -0.6], 0.1 + Math.cos(a) * 0.03 + r() * 0.02, { w: 0.055, bend: [0, -0.12, -0.2], col0: FUR, col1: k > 4 ? FL2 : 0xe8e0fa, weights: hd, out: [0, 0, 1] }); }   // 顔の縁の房
    for (let k = 0; k < 3; k++) sb.tube([{ c: h3(sx * 0.05, -0.04 - k * 0.007, 0.172), r: [0.002, 0.002] }, { c: h3(sx * 0.18, -0.02 - k * 0.025, 0.14), r: [0.0006, 0.0006] }], { sides: 3, weights: hd, color: 0xf8f4ff, oth: 0 });   // ひげ
    sb.tube([{ c: h3(sx * 0.026, -0.066, 0.16), r: [0.0065, 0.0065] }, { c: h3(sx * 0.024, -0.093, 0.156), r: [0.001, 0.001] }], { sides: 5, weights: hd, color: 0xfffaf0, oth: 0 });                // 牙（上）
  }
  sb.blob(h3(0, -0.072, 0.115), [0.042, 0.018, 0.05], { weights: hd, color: 0x3a0a2a, w: 10, h: 6, oth: 0 });                                                           // 口の中
  sb.blob(h3(0, -0.085, 0.1), [0.048, 0.02, 0.06], { weights: rw('gJaw'), color: FUR2, w: 12, h: 6, oth: 0.6 });                                                   // 下あご
  for (const sx of [1, -1]) sb.tube([{ c: h3(sx * 0.018, -0.08, 0.148), r: [0.005, 0.005] }, { c: h3(sx * 0.018, -0.058, 0.148), r: [0.001, 0.001] }], { sides: 5, weights: rw('gJaw'), color: 0xfffaf0, oth: 0 });
  for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.0; tuft(sb, h3(Math.sin(a) * 0.075, 0.115 + Math.cos(a) * 0.02, 0.0 - Math.abs(a) * 0.03), [Math.sin(a) * 0.4, 0.9, -1], 0.12 + r() * 0.05, { w: 0.042, bend: [0, -0.2, -0.2], col0: FUR, col1: 0xebe4fb, weights: hd, out: [0, 1, 0] }); }   // 頭の上の毛
  // 目（吊り上がった・光る瞳と縦の瞳孔）：頭の前の面に半分埋める
  const eyes = [];
  for (const sx of [1, -1]) {
    const c = h3(sx * 0.054, 0.034, 0.1), rot = [0, sx * 0.42, sx * 0.3];
    sb.blob(c, [0.031, 0.0135, 0.013], { rot, weights: hd, color: 0x2a0a3a, w: 12, h: 8, oth: 0 });
    sb.blob([c[0] + sx * 0.002, c[1] - 0.001, c[2] + 0.006], [0.025, 0.0095, 0.01], { rot, weights: hd, color: 0xf2c0ff, w: 12, h: 8, oth: 0 });
    sb.blob([c[0] + sx * 0.002, c[1] - 0.001, c[2] + 0.0128], [0.0032, 0.0085, 0.002], { rot, weights: hd, color: 0x18061e, w: 6, h: 6, oth: 0 });
    const e = new THREE.Object3D(); e.position.set(c[0] - HC.x, c[1] - HC.y, c[2] - HC.z + 0.012); sb.B.gHead.add(e); eyes.push(e);
  }
  // めがね（黒い四角い枠：人の姿と同じ意匠）。目の前に浮かせる
  for (const sx of [1, -1]) {
    const cx = HC.x + sx * 0.056, cy = HC.y + 0.034, cz = HC.z + 0.128, w = 0.078, h = 0.044, t = 0.0045, ry = sx * 0.34;
    const L = (x, y, z, sw, sh) => sb.box([x, y, z], [sw, sh, 0.005], { rot: [0, ry, 0], weights: hd, color: BK, group: 'plain' });
    L(cx, cy + h / 2, cz, w, t * 1.5); L(cx, cy - h / 2, cz, w, t);
    L(cx + Math.cos(ry) * w / 2, cy, cz - Math.sin(ry) * w / 2, t, h); L(cx - Math.cos(ry) * w / 2, cy, cz + Math.sin(ry) * w / 2, t, h);
    sb.box(h3(sx * 0.11, 0.042, 0.05), [0.005, 0.005, 0.13], { rot: [0, -sx * 0.32, 0], weights: hd, color: BK, group: 'plain' });
  }
  sb.box(h3(0, 0.04, 0.146), [0.03, 0.005, 0.005], { weights: hd, color: BK, group: 'plain' });
  // 耳（高く尖った・外へ開く）・耳の先の房（紫）と炎
  const earDeform = v => { const k = (v.y + 1) / 2; v.x *= 1 - k * 0.9; v.z *= 1 - k * 0.75; return v; };
  for (const [nm, sx] of [['gEarL', 1], ['gEarR', -1]]) {
    const Bp = W(nm), xf = new THREE.Matrix4().makeTranslation(Bp.x, Bp.y, Bp.z).multiply(xfm([0, 0.065, 0], [-0.3, sx * 0.25, -sx * 0.4]));
    sb.blob([0, 0, 0], [0.058, 0.1, 0.026], { deform: earDeform, xf, weights: rw(nm), color: p => (p.y > Bp.y + 0.12 ? FL2 : FUR), w: 12, h: 8, oth: 0.9 });
    sb.blob([0, -0.01, 0.013], [0.038, 0.075, 0.01], { deform: earDeform, xf, weights: rw(nm), color: PINK, w: 10, h: 6, oth: 0 });
    const tip = new THREE.Vector3(0, 0.095, 0).applyMatrix4(xf);
    tuft(sb, [tip.x, tip.y - 0.01, tip.z], [sx * 0.3, 1, -0.3], 0.06, { w: 0.025, col0: FL2, col1: FL, weights: rw(nm), bend: [0, 0, -0.1] });
    flame(sb, [tip.x, tip.y - 0.02, tip.z], [sx * 0.2, 1, -0.4], 0.1, { w: 0.04, weights: rw(nm) });
  }
  // ピンクの花（左耳のつけ根）
  const flXf = xfm([0.105, HC.y + 0.1, HC.z - 0.01], [0.2, 1.1, 0.3], 1.1);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * 0.02, Math.sin(a) * 0.02, 0], [0.018, 0.016, 0.007], { rot: [0, 0, a], xf: flXf, weights: hd, color: 0xff8cc8, w: 8, h: 6, oth: 0.3 }); }
  sb.blob([0, 0, 0.006], [0.009, 0.009, 0.006], { xf: flXf, weights: hd, color: 0xffe070, w: 6, h: 4, oth: 0 });
  // ── 胸の黒い帯（肩から斜めに交差）・銀の輪・帯の花 ──
  const strap = (pts, wgt) => sb.tube(pts.map(c => ({ c, r: [0.032, 0.008] })), { sides: 4, weights: wgt, color: BK, capStart: false, capEnd: false, oth: 0.4 });
  strap([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const a = i / 8 * Math.PI * 2; return [Math.sin(a) * 0.27, 0.86 + Math.cos(a) * 0.33, 0.22]; }), rw('gChest'));
  for (const sx of [1, -1]) strap([[sx * 0.2, 1.13, 0.2], [sx * 0.07, 1.04, 0.44], [-sx * 0.1, 0.84, 0.52], [-sx * 0.2, 0.66, 0.4], [-sx * 0.25, 0.6, 0.24]], rw('gChest'));
  torus(sb, 0.03, 0.007, xfm([0.0, 0.95, 0.5], [0, 0, 0]), { weights: rw('gChest'), color: 0xc8c0d8, oth: 0.2 });
  const fl2 = xfm([-0.11, 0.84, 0.52], [0, 0, 0.3], 1.2);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; sb.blob([Math.cos(a) * 0.02, Math.sin(a) * 0.02, 0], [0.017, 0.015, 0.007], { rot: [0, 0, a], xf: fl2, weights: rw('gChest'), color: 0xff8cc8, w: 8, h: 6, oth: 0.3 }); }
  // ── 脚：前脚（太い肩 → ひじの房 → 前腕 → 大きな足・長い紫の爪）／後ろ脚（腿 → ひざ → かかと → 足）。足もとに紫の炎 ──
  const paws = [], claws = [];
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const a = W('gFLu' + s), b = W('gFLl' + s), c = W('gFLp' + s);
    sb.blob([a.x, a.y + 0.05, a.z - 0.02], [0.13, 0.2, 0.17], { weights: () => [[bi('gChest'), 0.5], [bi('gFLu' + s), 0.5]], color: p => flameCol(p, 0.18), w: 14, h: 10, oth: 0.8 });
    sb.tube([{ c: [a.x, a.y, a.z], r: [0.12, 0.13] }, { c: [b.x, b.y + 0.06, b.z], r: [0.088, 0.096] }, { c: [b.x, b.y - 0.02, b.z + 0.005], r: [0.075, 0.08] }, { c: [c.x, c.y + 0.05, c.z], r: [0.066, 0.07] }], { sides: 14, sub: 2, ref: [0, 0, 1], weights: sb.along([[0, 'gFLu' + s], [0.4, 'gFLu' + s], [0.55, 'gFLl' + s], [1, 'gFLl' + s]]), color: p => flameCol(p, 0.88 - (p.y - 0.05) * 1.3), capStart: false, capEnd: false, oth: 0.9 });
    for (let k = 0; k < 5; k++) tuft(sb, [b.x + (k - 2) * 0.018, b.y + 0.08 - k * 0.025, b.z - 0.06], [sx * 0.2, -0.5, -1], 0.09 + r() * 0.03, { w: 0.045, col0: FUR, col1: FL2, weights: rw('gFLl' + s), out: [1, 0, 0] });   // ひじの房
    sb.blob([c.x, 0.055, c.z + 0.045], [0.088, 0.058, 0.11], { weights: rw('gFLp' + s), color: p => flameCol(p, 0.7), w: 12, h: 8, oth: 0.9 });
    for (let k = 0; k < 4; k++) {
      const tx = c.x + (k - 1.5) * 0.036;
      sb.blob([tx, 0.04, c.z + 0.13], [0.024, 0.028, 0.028], { weights: rw('gFLp' + s), color: FUR2, w: 8, h: 6, oth: 0.6 });
      sb.tube([{ c: [tx, 0.045, c.z + 0.145], r: [0.011, 0.013] }, { c: [tx, 0.04, c.z + 0.2], r: [0.007, 0.008] }, { c: [tx, 0.004, c.z + 0.23], r: [0.001, 0.001] }], { sides: 5, weights: rw('gFLp' + s), color: CLAW, oth: 0.2 });
    }
    for (let k = 0; k < 6; k++) flame(sb, [c.x + (k - 2.5) * 0.03, 0.06 + r() * 0.1, c.z + (r() - 0.5) * 0.1], [0, 1, -0.2], 0.18 + r() * 0.12, { w: 0.06, weights: rw('gFLl' + s) });
    flame(sb, [b.x + sx * 0.05, b.y, b.z], [sx * 0.3, 1, -0.4], 0.2, { w: 0.07, weights: rw('gFLl' + s) });
    const pw = new THREE.Object3D(); pw.position.set(0, -0.04, 0.14); sb.B['gFLp' + s].add(pw); paws.push(pw); claws.push(pw);
    // 後ろ脚
    const h1 = W('gHLu' + s), h2 = W('gHLl' + s), h3 = W('gHLh' + s), h4 = W('gHLp' + s);
    sb.blob([h1.x, h1.y - 0.05, h1.z + 0.03], [0.15, 0.23, 0.2], { weights: () => [[bi('gBody'), 0.45], [bi('gHLu' + s), 0.55]], color: p => flameCol(p, 0.25), w: 14, h: 10, oth: 0.9 });
    sb.tube([{ c: [h1.x, h1.y - 0.05, h1.z], r: [0.13, 0.14] }, { c: [h2.x, h2.y, h2.z], r: [0.085, 0.092] }, { c: [h3.x, h3.y, h3.z], r: [0.06, 0.064] }, { c: [h4.x, h4.y + 0.03, h4.z], r: [0.06, 0.06] }], { sides: 12, sub: 2, ref: [1, 0, 0], weights: sb.along([[0, 'gHLu' + s], [0.3, 'gHLu' + s], [0.42, 'gHLl' + s], [0.62, 'gHLl' + s], [0.72, 'gHLh' + s], [1, 'gHLh' + s]]), color: p => flameCol(p, 0.88 - (p.y - 0.05) * 1.3), capStart: false, capEnd: false, oth: 0.9 });
    for (let k = 0; k < 4; k++) tuft(sb, [h3.x, h3.y + 0.06 + k * 0.03, h3.z - 0.05], [sx * 0.2, -0.3, -1], 0.09, { w: 0.045, col0: FUR, col1: FL2, weights: rw('gHLh' + s), out: [1, 0, 0] });     // かかとの房
    sb.blob([h4.x, 0.05, h4.z + 0.05], [0.08, 0.052, 0.105], { weights: rw('gHLp' + s), color: p => flameCol(p, 0.7), w: 12, h: 8, oth: 0.9 });
    for (let k = 0; k < 3; k++) { const tx = h4.x + (k - 1) * 0.034; sb.tube([{ c: [tx, 0.04, h4.z + 0.13], r: [0.009, 0.01] }, { c: [tx, 0.005, h4.z + 0.175], r: [0.001, 0.001] }], { sides: 5, weights: rw('gHLp' + s), color: CLAW, oth: 0.2 }); }
    for (let k = 0; k < 5; k++) flame(sb, [h4.x + (k - 2) * 0.03, 0.06 + r() * 0.1, h4.z + (r() - 0.5) * 0.08], [0, 1, -0.3], 0.16 + r() * 0.1, { w: 0.055, weights: rw('gHLh' + s) });
    const pw2 = new THREE.Object3D(); pw2.position.set(0, -0.04, 0.08); sb.B['gHLp' + s].add(pw2); paws.push(pw2);
  }
  // ── 二本の尾（猫又）：長く S 字に立ち上がる。逆立つ毛の房・先は紫の炎 ──
  const tails = [], tailTips = [], sway = [];
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const names = chain(sb, 'gTail' + s, 'gBody', [sx * 0.07, 0.06, -0.4], [[0, 0, 0], [sx * 0.06, 0.07, -0.13], [sx * 0.09, 0.11, -0.11], [sx * 0.1, 0.14, -0.06], [sx * 0.08, 0.15, 0.0], [sx * 0.05, 0.13, 0.04], [sx * 0.02, 0.1, 0.07], [-sx * 0.01, 0.07, 0.08]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(-sx * 0.015, 0.03, 0.06)));
    const rad = P.map((_, i) => { const t = i / (P.length - 1); return 0.05 + Math.sin(Math.min(1, t * 1.1) * Math.PI * 0.85) * 0.04 - (t > 0.92 ? 0.025 : 0); });
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [rad[i], rad[i]], shape: a => { const k = 1 + Math.sin(a * 7 + i * 1.9) * 0.14; return [k, k]; } })), { sides: 14, sub: 2, weights: chainW(sb, names), color: (p, t) => (t > 0.75 ? (t > 0.88 ? FL : FL2) : t > 0.5 ? flameCol(p, 0.5) : FUR), capStart: true, capEnd: true, capBulge: 0.9, oth: 0.95 });
    for (let i = 1; i < P.length - 1; i++) {
      const p = P[i], q = P[i + 1], d = [q.x - p.x, q.y - p.y, q.z - p.z];
      for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + i; const off = [Math.cos(a) * rad[i], Math.sin(a) * rad[i] * 0.8, 0]; tuft(sb, [p.x + off[0], p.y + off[1], p.z], add3(off.map(v => v * 4), norm3(d), 0.7), 0.07 + i * 0.007 + r() * 0.02, { w: 0.045, bend: [0, -0.05, 0], col0: i > 5 ? FL2 : FUR, col1: i > 4 ? FL : FL2, weights: rw(names[Math.min(names.length - 1, i)]), out: [0, 0, 1] }); }
      if (i > 3) flame(sb, [p.x, p.y + rad[i] * 0.6, p.z], add3([0, 1, 0], norm3(d), 0.3), 0.12 + i * 0.014, { w: 0.065, weights: rw(names[Math.min(names.length - 1, i)]) });
    }
    tails.push(names);
    const tip = new THREE.Object3D(); tip.position.set(-sx * 0.015, 0.03, 0.06); sb.B[names[names.length - 1]].add(tip); tailTips.push(tip);
    sway.push(...names.map((n, i) => ({ b: sb.B[n], k: 24 - i * 2, d: 4.2, gain: -(0.07 + i * 0.018), baseX: 0, amp: 0.09 + i * 0.025, freq: 0.85 + (sx > 0 ? 0 : 0.17), ph: i * 0.5 + (sx > 0 ? 0 : 1.6), tail: true })));
  }
  const m = sb.build(null, { rim: 0.95, rimColor: 0xd8b0ff, outline: 0.004, outlineColor: 0x1a0f26, flameAmp: 0.022, flameK: 1.1 });
  /** 暴走（力があふれて抑えきれない）の見た目：0〜1。毛の縁と炎を赤紫へ寄せて強く。性格や姿（性別）は変えない */
  m.setRampage = k => { const U = m.mats.body.userData.u; U.uRimColor.value.setHex(lerpC(0xd8b0ff, 0xff4a9a, k)); U.uRim.value = 0.95 + k * 0.6; if (m.mats.glow) { const G = m.mats.glow.userData.u; G.uK.value = 1.1 + k * 1.1; G.uAmp.value = 0.022 + k * 0.03; G.uTint.value.setHex(0xff3a8a); G.uTintK.value = k * 0.55; } };
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  return Object.assign(m, { provisional: true, kind: 'giant_nekomata', male: true, height: 1.25, bodyY: BODY_Y, sway, eyes, paws, claws, tailTips, tails, G: sb.B, bodyR: 0.5 });
}
export { lerpC, tuft, flame, chain, chainW, rng, V };

// ───────────────────────── 境界の先触れ（第4章のボス：作り直し） ─────────────────────────
/** 根もとを原点。作る時は 1/13 の大きさ（scale を掛けて使う）。背を丸めた上の重い巨体・角の冠・目の並ぶ 6 本の翼・鉤爪の腕・胸の「縁の輪」（核） */
export function buildSakibure() {
  const sb = new SkinBody(DIM), r = rng(909);
  const D1 = 0x0e0814, D2 = 0x221232, VE = 0x6a2aa0, PK = 0xff4ab8, BONE = 0x3a2a48;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('sBase', null, 0, 0, 0); B('sBody', 'sBase', 0, 0.45, 0); B('sChest', 'sBody', 0, 0.62, 0.02); B('sHead', 'sChest', 0, 0.2, 0.44);
  const vein = p => { const s = Math.sin(p.y * 38 + Math.sin(p.x * 13) * 3) * Math.sin(p.x * 21 + p.z * 17); return s > 0.88 ? PK : s > 0.64 ? VE : (Math.sin(p.y * 7 + p.z * 5) > 0.45 ? D2 : D1); };
  // 胴：下は細く根を張り、上へ向かって肩が大きく張る（逆三角の重い上体）・前へ丸まる
  const rings = []; for (let i = 0; i <= 12; i++) { const t = i / 12, y = t * 1.36; const w = 0.3 + Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) * 0.32 - (t > 0.85 ? (t - 0.85) * 1.6 : 0); rings.push({ c: [Math.sin(t * 5) * 0.03, y, t * t * 0.16], r: [w * (t < 0.2 ? 1.3 - t : 1), w * 0.72], shape: a => { const k = 1 + Math.sin(a * 5 + t * 9) * 0.09 + Math.sin(a * 11 - t * 4) * 0.05; return [k, k]; } }); }
  sb.tube(rings, { sides: 22, sub: 2, ref: [0, 0, 1], weights: sb.along([[0, 'sBase'], [0.25, 'sBase'], [0.4, 'sBody'], [0.7, 'sChest'], [1, 'sChest']]), color: vein, capStart: false, capEnd: true, oth: 1 });
  // 地を這う根（放射状）
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + r() * 0.3, L = 0.9 + r() * 0.8; const pts = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push({ c: [Math.sin(a) * (0.36 + t * L), 0.07 * (1 - t) + Math.sin(t * 9 + i) * 0.025, Math.cos(a) * (0.36 + t * L)], r: [0.1 * (1 - t) + 0.015, 0.07 * (1 - t) + 0.012] }); } sb.tube(pts, { sides: 6, weights: sb.rigid('sBase'), color: vein, capStart: false, capEnd: true, oth: 0.7 }); }
  // 背の骨の突起（背骨に沿って後ろへ）
  for (let i = 0; i < 9; i++) { const t = 0.35 + i * 0.07, y = t * 1.36, z = t * t * 0.16 - 0.32 - Math.sin(t * Math.PI) * 0.1; sb.tube([{ c: [0, y, z], r: [0.05, 0.04] }, { c: [0, y + 0.08, z - 0.22 - i * 0.01], r: [0.004, 0.004] }], { sides: 5, weights: t > 0.6 ? sb.rigid('sChest') : sb.rigid('sBody'), color: BONE, capEnd: true, oth: 0.6 }); }
  // 取り込んだ研究施設の物（配管・槽のガラス・金属の板）
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, y = 0.15 + r() * 0.55, d = 0.38 - y * 0.08; const c = [Math.sin(a) * d, y, Math.cos(a) * d]; if (i % 3 === 0) sb.cyl(c, 0.03, 0.03, 0.4 + r() * 0.3, { rot: [r() * 2, a, r() * 2], weights: sb.rigid('sBody'), color: 0x5a5e68, seg: 8, oth: 0.5 }); else if (i % 3 === 1) sb.box(c, [0.14, 0.2 + r() * 0.1, 0.02], { rot: [r(), a, r()], weights: sb.rigid('sBody'), color: 0xa080ff, oth: 0.3 }); else sb.box(c, [0.2, 0.06, 0.12], { rot: [r(), a, r()], weights: sb.rigid('sBody'), color: 0x3a3e48, oth: 0.6 }); }
  // 胸の「縁の輪」（核）：縦に裂けた瞳・輪のまわりの牙
  const cw = sb.rigid('sChest'), ch = sb.W('sChest'), cc = [0, ch.y + 0.06, 0.6];
  torus(sb, 0.2, 0.03, xfm(cc, [0, 0, 0]), { weights: cw, color: PK, oth: 0.3 });
  torus(sb, 0.25, 0.012, xfm([cc[0], cc[1], cc[2] - 0.01], [0, 0, 0]), { weights: cw, color: 0xffb0e0, oth: 0 });
  sb.blob([cc[0], cc[1], cc[2] - 0.05], [0.19, 0.19, 0.08], { weights: cw, color: 0x2a0418, w: 18, h: 12, oth: 0 });
  sb.blob([cc[0], cc[1], cc[2] + 0.005], [0.03, 0.15, 0.02], { weights: cw, color: 0xff6ad0, w: 10, h: 10, oth: 0 });                 // 縦の裂け目（光る瞳孔）
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; sb.tube([{ c: [cc[0] + Math.cos(a) * 0.24, cc[1] + Math.sin(a) * 0.24, cc[2] - 0.02], r: [0.025, 0.02] }, { c: [cc[0] + Math.cos(a) * 0.38, cc[1] + Math.sin(a) * 0.38, cc[2] + 0.04], r: [0.002, 0.002] }], { sides: 4, weights: cw, color: BONE, capEnd: true, oth: 0.5 }); }
  const core = new THREE.Object3D(); core.position.set(cc[0] - ch.x, cc[1] - ch.y, cc[2] - ch.z + 0.04); sb.B.sChest.add(core);
  // 頭：肩の間から前へ突き出した長い頭・角の冠・二列の目・口の代わりの縦の裂け目
  const hw = sb.rigid('sHead'), hh = sb.W('sHead');
  sb.blob([0, hh.y + 0.05, hh.z + 0.06], [0.17, 0.14, 0.26], { weights: hw, color: D1, w: 16, h: 12, deform: v => { if (v.z > 0) { v.x *= 1 - v.z * 0.45; v.y *= 1 - v.z * 0.3; } return v; } });
  sb.blob([0, hh.y - 0.02, hh.z + 0.3], [0.014, 0.08, 0.02], { weights: hw, color: 0xff3aa0, w: 8, h: 8, oth: 0 });
  for (let i = 0; i < 11; i++) { const a = -1.4 + i / 10 * 2.8; sb.tube([{ c: [Math.sin(a) * 0.12, hh.y + 0.12, hh.z + Math.cos(a) * 0.05 - 0.02], r: [0.032, 0.03] }, { c: [Math.sin(a) * 0.26, hh.y + 0.34 + Math.cos(a * 2) * 0.05, hh.z - 0.12], r: [0.012, 0.012] }, { c: [Math.sin(a) * 0.3, hh.y + 0.44 - Math.abs(a) * 0.05, hh.z - 0.32], r: [0.002, 0.002] }], { sides: 5, weights: hw, color: (p, t) => (t > 0.7 ? 0x5a2a6a : BONE), capEnd: true, oth: 0.6 }); }
  const eyes = [];
  for (const [x, y, z] of [[0.055, 0.1, 0.26], [-0.055, 0.1, 0.26], [0.1, 0.07, 0.2], [-0.1, 0.07, 0.2], [0.035, 0.04, 0.295], [-0.035, 0.04, 0.295], [0.13, 0.01, 0.12], [-0.13, 0.01, 0.12]]) {
    sb.blob([x, hh.y + y, hh.z + z], [0.03, 0.018, 0.012], { rot: [0, Math.atan2(x, 0.2), 0], weights: hw, color: PK, w: 8, h: 6, oth: 0 });
    sb.blob([x, hh.y + y, hh.z + z + 0.011], [0.005, 0.016, 0.004], { rot: [0, Math.atan2(x, 0.2), 0], weights: hw, color: 0x14040e, w: 6, h: 4, oth: 0 });
    if (eyes.length < 4) { const e = new THREE.Object3D(); e.position.set(x, y, z + 0.01); sb.B.sHead.add(e); eyes.push(e); }
  }
  // 翼のように広がる 6 本の触腕（背から）。垂れ下がる羽根の触手に目が並ぶ
  const sway = [], wings = [], arms = [];
  [[0.22, 0.32, -0.12, 1, 1], [-0.22, 0.32, -0.12, -1, 1], [0.2, 0.18, -0.16, 1, 0.82], [-0.2, 0.18, -0.16, -1, 0.82], [0.16, 0.02, -0.18, 1, 0.62], [-0.16, 0.02, -0.18, -1, 0.62]].forEach(([x, y, z, sx, s], wi) => {
    const names = chain(sb, 'sWing' + wi + '_', 'sChest', [x, y, z], [[0, 0, 0], [sx * 0.3 * s, 0.24 * s, -0.08], [sx * 0.32 * s, 0.14 * s, -0.04], [sx * 0.3 * s, 0.02, 0.0], [sx * 0.26 * s, -0.1, 0.04], [sx * 0.2 * s, -0.18, 0.05]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(sx * 0.12, -0.14, 0.03)));
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.085 * (1 - i / P.length) + 0.014, 0.06 * (1 - i / P.length) + 0.012] })), { sides: 10, sub: 2, weights: chainW(sb, names), color: vein, capStart: true, capEnd: true, oth: 0.9 });
    for (let k = 1; k < P.length - 1; k++) {
      const p = P[k], bn = names[Math.min(names.length - 1, k)], bw = sb.rigid(bn);
      // 垂れ下がる羽根の触手（2〜3 本）と目
      for (let j = 0; j < 3; j++) {
        const L = (0.28 + r() * 0.2) * s * (1 - k * 0.08), dx = sx * (0.02 + j * 0.03), dz = -0.04 + j * 0.03;
        sb.tube([{ c: [p.x, p.y, p.z], r: [0.024, 0.018] }, { c: [p.x + dx, p.y - L * 0.5, p.z + dz], r: [0.016, 0.012] }, { c: [p.x + dx * 1.6, p.y - L, p.z + dz * 1.4], r: [0.002, 0.002] }], { sides: 4, weights: bw, color: (q, t) => (t > 0.85 ? VE : D2), capEnd: true, oth: 0.5 });
        if (j === 1) { sb.blob([p.x + dx, p.y - L * 0.45, p.z + dz + 0.02], [0.03, 0.02, 0.012], { weights: bw, color: PK, w: 8, h: 6, oth: 0 }); sb.blob([p.x + dx, p.y - L * 0.45, p.z + dz + 0.031], [0.005, 0.016, 0.003], { weights: bw, color: 0x14040e, w: 6, h: 4, oth: 0 }); }
      }
      sb.blob([p.x, p.y + 0.03, p.z + 0.06], [0.034, 0.02, 0.012], { weights: bw, color: PK, w: 8, h: 6, oth: 0 }); sb.blob([p.x, p.y + 0.03, p.z + 0.071], [0.006, 0.017, 0.003], { weights: bw, color: 0x14040e, w: 6, h: 4, oth: 0 });
      if (k % 2 && wi < 4 && eyes.length < 12) { const e = new THREE.Object3D(); e.position.set(0, 0.03, 0.065); sb.B[bn].add(e); eyes.push(e); }
    }
    wings.push(names);
    sway.push(...names.map((n, i) => ({ b: sb.B[n], k: 9 + i * 1.5, d: 2.4, gain: 0.2, baseX: 0, amp: 0.13 + i * 0.03, freq: 0.45 + wi * 0.06, ph: wi * 1.3 + i * 0.4 })));
  });
  // 前へ伸びる 2 本の長い腕（骨ばった・長い鉤爪）
  for (const sx of [1, -1]) {
    const names = chain(sb, 'sArm' + (sx > 0 ? 'L' : 'R') + '_', 'sChest', [sx * 0.42, 0.16, 0.1], [[0, 0, 0], [sx * 0.16, -0.12, 0.2], [sx * 0.08, -0.26, 0.24], [0, -0.32, 0.18], [-sx * 0.02, -0.26, 0.12]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.06, 0.14)));
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.085 - i * 0.011, 0.07 - i * 0.009], shape: a => { const k = 1 + Math.sin(a * 4 + i) * 0.12; return [k, k]; } })), { sides: 10, sub: 2, weights: chainW(sb, names), color: vein, capStart: true, capEnd: true, oth: 0.9 });
    for (let i = 1; i < P.length - 1; i++) sb.tube([{ c: [P[i].x, P[i].y + 0.05, P[i].z - 0.02], r: [0.02, 0.02] }, { c: [P[i].x + sx * 0.06, P[i].y + 0.16, P[i].z - 0.1], r: [0.002, 0.002] }], { sides: 4, weights: sb.rigid(names[Math.min(names.length - 1, i)]), color: BONE, capEnd: true, oth: 0.5 });
    const tip = P[P.length - 1]; for (let k = 0; k < 4; k++) sb.tube([{ c: [tip.x + (k - 1.5) * 0.04, tip.y, tip.z], r: [0.018, 0.016] }, { c: [tip.x + (k - 1.5) * 0.08, tip.y - 0.08, tip.z + 0.16], r: [0.008, 0.008] }, { c: [tip.x + (k - 1.5) * 0.09, tip.y - 0.16, tip.z + 0.22], r: [0.001, 0.001] }], { sides: 5, weights: sb.rigid(names[names.length - 1]), color: BONE, capEnd: true, oth: 0.5 });
    arms.push(names);
  }
  // 肩から立ちのぼる瘴気（glow の組）
  for (let i = 0; i < 10; i++) { const sx = i % 2 ? 1 : -1; flame(sb, [sx * (0.25 + r() * 0.25), 1.15 + r() * 0.15, -0.05 + r() * 0.1], [sx * 0.2, 1, -0.3], 0.28 + r() * 0.2, { w: 0.07, col: 0xff3aa8, col1: 0x30061e, weights: sb.rigid('sChest') }); }
  const m = sb.build(null, { rim: 0.75, rimColor: 0xff5ac8, outline: 0.004, outlineColor: 0x050208, flameAmp: 0.03, flameK: 0.9 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; };
  return Object.assign(m, { provisional: true, kind: 'sakibure', height: 1.75, bodyR: 0.8, sway, wings, arms, core, eyes, G: sb.B });
}

// ───────────────────────── 収容者（旧研究棟の被験者） ─────────────────────────
/** 病衣・拘束の帯・胸の被験者番号の札。顔は包帯のような布で覆われ、すき間から目だけが光る */
export function buildShuusha(seed = 1, no = 'S-00') {
  const r = rng(seed * 17 + 3);
  const d = Object.assign({}, DIM, { leg: 0.92, thigh: 0.43, shin: 0.42, neck: 0.23, upperArm: 0.31, lowerArm: 0.3, shoulderX: 0.16, headR: 0.112, hipX: 0.08 });
  const sb = new SkinBody(d), R = d.headR;
  const GOWN = [0xc0c8c0, 0xb8c0cc, 0xc8c4b4][seed % 3], GOWN2 = 0x8a948e, SK = 0xb4b8c0, BELT = 0x3a3634;
  humanBody(sb, {
    torso: [[0, 0.09, 0.07, 0], [0.12, 0.114, 0.08, 0], [0.32, 0.106, 0.078, 0], [0.55, 0.114, 0.08, 0.004], [0.8, 0.132, 0.082, 0], [0.93, 0.1, 0.064, 0], [1, 0.042, 0.04, 0]],
    torsoColor: p => (Math.abs(p.y - 1.12) < 0.025 || Math.abs(p.y - 0.98) < 0.022 ? BELT : p.z < -0.05 && Math.abs(p.x) < 0.012 ? GOWN2 : GOWN), torsoFold: 1,
    armR: [0.036, 0.03, 0.025], armColor: (t, w) => (w === 'upper' && t < 0.45 ? GOWN : SK), legR: [0.05, 0.037, 0.039, 0.027], legColor: () => SK,
    skin: SK, shoe: 0xd0d0c8, sole: 0x7a7a80, neckR: 0.03, hand: 1.15, legFold: 0.3,
  });
  const hy = sb.W('hips').y;
  const hemW = p => { const k = Math.max(0, Math.min(1, (hy - p.y) / 0.4)) * 0.6; const wl = Math.max(0, Math.min(1, (p.x + 0.03) / 0.09)) * k, wr = Math.max(0, Math.min(1, (0.03 - p.x) / 0.09)) * k; return [[sb.bi('hips'), 1 - wl - wr], [sb.bi('leftUpperLeg'), wl], [sb.bi('rightUpperLeg'), wr]]; };
  sb.tube([[hy + 0.02, 0.12, 0.09], [hy - 0.15, 0.15, 0.11], [hy - 0.3, 0.165, 0.12], [hy - 0.38, 0.17, 0.122]].map(([y, rx, rz]) => ({ c: [0, y, -0.004], r: [rx, rz] })), { sides: 18, sub: 2, weights: hemW, color: (p, t) => (t > 0.9 ? GOWN2 : GOWN), capStart: false, capEnd: false, oth: 0.85, fold: 1.2 });
  humanHead(sb, { R, skin: 0xd8d4cc, faceless: true, ears: false, jaw: 0.25 });
  // 顔を覆う布（巻いた帯）と、目のすき間
  const hc = sb.hc, hw = sb.rigid('head');
  for (let i = 0; i < 5; i++) { const y = hc.y + R * (0.7 - i * 0.32), rr = R * (1.03 + (i === 2 ? 0.02 : 0)) * Math.sqrt(Math.max(0.15, 1 - ((y - hc.y) / (R * 1.05)) ** 2)); sb.tube([0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => { const a = k / 8 * Math.PI * 2; return { c: [hc.x + Math.sin(a) * rr, y + Math.sin(a * 2 + i) * 0.006, hc.z + Math.cos(a) * rr], r: [0.028, 0.004] }; }), { sides: 4, weights: hw, color: i === 2 ? 0x2a1e2a : [0xe8e4d8, 0xdcd6c8][i % 2], capStart: false, capEnd: false, oth: 0.3 }); }
  // 胸の札（被験者番号）・手首の拘束具・足首の輪
  const cw = sb.rigid('chest'), ch = sb.W('chest');
  sb.card([0.05, ch.y + 0.06, 0.085], [0.07, 0.045], UVR(0, 128, 128, 192), { rot: [0, 0, 0.05], weights: cw });
  for (const HA of ['leftHand', 'rightHand']) { const w = sb.W(HA); sb.tube([{ c: [w.x, w.y + 0.05, 0], r: [0.034, 0.032] }, { c: [w.x, w.y + 0.012, 0], r: [0.034, 0.032] }], { sides: 10, weights: sb.rigid(HA === 'leftHand' ? 'leftLowerArm' : 'rightLowerArm'), color: BELT, capStart: false, capEnd: false, oth: 0.3 }); sb.box([w.x, w.y + 0.03, 0.036], [0.02, 0.02, 0.01], { weights: sb.rigid(HA === 'leftHand' ? 'leftLowerArm' : 'rightLowerArm'), color: 0x9a9890, oth: 0 }); }
  for (const FT of ['leftFoot', 'rightFoot']) { const a = sb.W(FT); torus(sb, 0.034, 0.007, xfm([a.x, a.y + 0.07, 0], [Math.PI / 2, 0, 0]), { weights: sb.rigid(FT === 'leftFoot' ? 'leftLowerLeg' : 'rightLowerLeg'), color: BELT, oth: 0.3 }); }
  // 背中から垂れる拘束の帯の切れ端（揺れる）
  const sway = [];
  [[0.07, 1.12, -0.08], [-0.06, 0.98, -0.08]].forEach((p, i) => {
    const names = chain(sb, 'belt' + i + '_', 'chest', [p[0], p[1] - sb.W('chest').y, p[2]], [[0, 0, 0], [0, -0.12, -0.04], [0, -0.14, -0.02], [0, -0.12, 0.0]]);
    const P = names.map(n => sb.W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.08, 0)));
    sb.tube(P.map(c => ({ c: [c.x, c.y, c.z], r: [0.022, 0.004] })), { sides: 4, weights: chainW(sb, names), color: BELT, capStart: false, capEnd: false, oth: 0.3 });
    sway.push(...names.map((n, k) => ({ b: sb.B[n], k: 14 + k * 2, d: 3.0, gain: 0.35, baseX: 0.08, amp: 0.15, freq: 0.8 + i * 0.3, ph: i + k * 0.5 })));
  });
  const tex = faceAtlas(g => { g.fillStyle = '#f2efe4'; g.fillRect(0, 128, 128, 64); g.strokeStyle = '#3a3a40'; g.lineWidth = 3; g.strokeRect(3, 131, 122, 58); g.fillStyle = '#20202a'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText(no, 64, 172); });
  const m = sb.build(tex, { rim: 0.35, rimColor: 0xb8c8e0, outline: 0.01, outlineColor: 0x08080e, faceEmissive: 0x101010 });
  const eyeGlow = glowEyes(m, m.J, [[R * 0.32, R * 0.06, R * 1.02], [-R * 0.32, R * 0.06, R * 1.02]]);
  return Object.assign(m, { sway, height: 1.78, provisional: true, kind: 'shuusha', bodyR: 0.32, eyeGlow });
}
const UVR = (x0, y0, x1, y1) => [x0 / 256, 1 - y1 / 256, x1 / 256, 1 - y0 / 256];

// ───────────────────────── 継接（第5章のボス） ─────────────────────────
/** 足もとを原点・高さ約 3.6m（背を丸めて）。部分（右腕 tR0・左腕 tL0・脚 tLegs・鞄 tBag）は骨の大きさを 0 にすると消える */
export function buildTsugihagi() {
  const sb = new SkinBody(DIM), r = rng(4242);
  const SK = [0x7e7a88, 0x5e6474, 0x8a7468, 0x4e4a5e, 0x6a7464, 0x938a9a], MASK = 0xe6e0d4, ST = 0x6a2ab8, D = 0x120e18, EYE = 0xff6ad0, BONE = 0xb8b0a0;
  const B = (n, p, x, y, z) => sb.addBone(n, p, x, y, z);
  B('tRoot', null, 0, 0, 0); B('tHip', 'tRoot', 0, 1.3, 0); B('tBody', 'tHip', 0, 0.45, -0.05); B('tChest', 'tBody', 0, 0.55, 0.12);
  B('tHeadA', 'tChest', 0.02, 0.42, 0.34); B('tHeadB', 'tChest', 0.42, 0.24, 0.12); B('tHeadC', 'tChest', -0.4, 0.1, 0.2);
  const names = { R: chain(sb, 'tR', 'tChest', [-0.5, 0.22, 0.06], [[0, 0, 0], [-0.1, -0.64, 0.08], [0.02, -0.72, 0.16], [0.04, -0.5, 0.14]]), L: chain(sb, 'tL', 'tChest', [0.46, 0.1, 0.1], [[0, 0, 0], [0.06, -0.4, 0.24], [-0.22, -0.12, 0.28]]) };
  B('tBag', 'tL2', -0.12, -0.08, 0.1);
  B('tLegs', 'tHip', 0, 0, 0);
  const legs = [['A', 0.28, 0.14, 1, 0], ['B', -0.28, 0.12, 1, 0], ['C', 0.22, -0.3, 0.86, 1], ['D', -0.24, -0.34, 0.8, 1]].map(([k, x, z, s, insect]) => { const n = chain(sb, 'tLeg' + k, 'tLegs', [x, -0.02, z], insect ? [[0, 0, 0], [x * 1.2, 0.1, -0.25], [x * 0.3, -0.75 * s, -0.12], [0, -0.55 * s, 0.1]] : [[0, 0, 0], [x * 0.3, -0.64 * s, 0.06], [0, -0.62 * s, -0.04]]); return { k, n, s, x, z, insect }; });
  const W = n => sb.W(n), rw = n => sb.rigid(n);
  // 継ぎ接ぎの肌：部分ごとに違う色の継ぎ当て。縫い目は暗い溝（光る糸は glow の組）
  const patch = p => { const s = Math.sin(p.x * 9 + p.y * 5) + Math.sin(p.y * 7 - p.z * 11) + Math.sin(p.z * 6 + p.x * 4); const v = (s + 3) * 0.9; const k = Math.floor(v) % SK.length; return Math.abs(v % 1 - 0.5) > 0.45 ? D : SK[k]; };
  const seam = (pts, wgt, w = 0.012) => { sb.tube(pts.map(c => ({ c, r: [w, w] })), { sides: 4, weights: wgt, color: ST, capStart: false, capEnd: false, oth: 0 }); sb.tube(pts.map(c => ({ c, r: [w * 2.4, w * 2.4] })), { sides: 4, weights: wgt, color: (q, t) => lerpC(0x7a30ff, 0x3a1080, t), group: 'glow', capStart: false, capEnd: false, oth: 0.2 }); };
  // 胴：前へ丸めた背・二つの胴が寄り合った胸（左右に歪む）
  sb.tube([[0.9, 0.34, 0.3, 0], [1.3, 0.44, 0.36, 0], [1.6, 0.4, 0.32, 0.04], [1.9, 0.46, 0.34, 0.1], [2.2, 0.56, 0.4, 0.2], [2.42, 0.52, 0.36, 0.28], [2.6, 0.32, 0.24, 0.34]].map(([y, rx, rz, z], i) => ({ c: [Math.sin(i * 1.3) * 0.05, y, z], r: [rx, rz], shape: a => { const k = 1 + Math.sin(a * 3 + i) * 0.14 + Math.sin(a * 7 - i) * 0.06; return [k, k]; } })), { sides: 20, sub: 2, weights: sb.along([[0, 'tHip'], [0.3, 'tHip'], [0.45, 'tBody'], [0.7, 'tChest'], [1, 'tChest']]), color: patch, capStart: true, capEnd: true, oth: 1 });
  sb.blob([0.26, 2.3, 0.16], [0.36, 0.34, 0.3], { weights: rw('tChest'), color: SK[2], w: 14, h: 10 });                // 寄り合ったもう一つの胴
  sb.blob([-0.18, 1.6, -0.12], [0.3, 0.3, 0.26], { weights: rw('tBody'), color: SK[4], w: 12, h: 10 });
  for (let i = 0; i < 7; i++) { const y = 1.2 + i * 0.2, a = r() * 6; seam([-1, -0.5, 0, 0.5, 1].map(k => [Math.sin(a + k * 0.45) * 0.48, y + k * 0.04, Math.cos(a + k * 0.45) * 0.4 + 0.08]), y > 1.9 ? rw('tChest') : y > 1.5 ? rw('tBody') : rw('tHip')); }
  // 背骨の突起・肋のような骨
  for (let i = 0; i < 8; i++) { const y = 1.5 + i * 0.14, z = -0.34 - Math.sin(i / 7 * Math.PI) * 0.06; sb.tube([{ c: [0, y, z], r: [0.05, 0.04] }, { c: [0, y + 0.1, z - 0.24], r: [0.003, 0.003] }], { sides: 5, weights: y > 1.9 ? rw('tChest') : rw('tBody'), color: BONE, capEnd: true, oth: 0.6 }); }
  // 腹から伸びる小さな手（4 本・ゆっくり動く＝揺れの骨）
  const sway = [];
  for (let i = 0; i < 4; i++) { const sx = i % 2 ? -1 : 1, y = 1.45 + Math.floor(i / 2) * 0.28; const nm = chain(sb, 'tHand' + i + '_', 'tBody', [sx * 0.34, y - 1.75, 0.18], [[0, 0, 0], [sx * 0.12, -0.08, 0.16], [sx * 0.06, -0.12, 0.1]]); const P = nm.map(n => W(n)); sb.tube(P.map(c => ({ c: [c.x, c.y, c.z], r: [0.035, 0.035] })), { sides: 6, weights: chainW(sb, nm), color: SK[(i + 1) % SK.length], capStart: false, capEnd: true, oth: 0.6 }); for (let k = 0; k < 3; k++) sb.tube([{ c: [P[2].x, P[2].y, P[2].z], r: [0.012, 0.012] }, { c: [P[2].x + sx * 0.02 + (k - 1) * 0.03, P[2].y - 0.08, P[2].z + 0.05], r: [0.004, 0.004] }], { sides: 4, weights: rw(nm[2]), color: SK[0], oth: 0.3 }); sway.push(...nm.map((n, k) => ({ b: sb.B[n], k: 16, d: 3, gain: 0.3, baseX: 0, amp: 0.25, freq: 1.2 + i * 0.3, ph: i + k }))); }
  // 頭（3 つ）：のっぺりした白い仮面に目の群れ・縫い合わされた口。B は横倒し、C は逆さに垂れる
  const eyes = [];
  [['tHeadA', 0.25, 8, 0], ['tHeadB', 0.17, 5, Math.PI / 2], ['tHeadC', 0.16, 4, Math.PI]].forEach(([hn, R, ne, roll], hi) => {
    const h = W(hn), hw = rw(hn), xf = new THREE.Matrix4().makeTranslation(h.x, h.y, h.z).multiply(new THREE.Matrix4().makeRotationZ(roll));
    const L = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(xf);
    sb.tube([{ c: [h.x * 0.6, h.y - 0.3, h.z * 0.5], r: [R * 0.45, R * 0.45] }, { c: [h.x, h.y - 0.08, h.z], r: [R * 0.4, R * 0.4] }], { sides: 10, weights: sb.along([[0, 'tChest'], [1, hn]]), color: SK[hi + 1], capStart: false, capEnd: false, oth: 0.8 });
    sb.blob([0, R * 0.15, 0], [R, R * 1.18, R * 0.95], { xf, weights: hw, color: MASK, w: 16, h: 12, deform: v => { if (v.z > 0.5) v.z = 0.5 + (v.z - 0.5) * 0.35; return v; } });
    sb.blob([0, R * 0.3, -R * 0.15], [R * 1.05, R * 1.0, R * 0.9], { xf, weights: hw, color: D, w: 12, h: 10, keep: q => q.z < h.z - R * 0.1 || (roll ? false : false) });     // 仮面の後ろの黒い頭
    for (let k = 0; k < ne; k++) {
      const col = Math.floor(k / 2), ex = (k % 2 ? 1 : -1) * R * (0.22 + 0.1 * col), ey = R * (0.5 - col * 0.3);
      const c = L(ex, ey, R * 0.6), c2 = L(ex, ey, R * 0.68);
      sb.blob([c.x, c.y, c.z], [R * 0.16, R * 0.1, R * 0.06], { rot: [0, 0, roll], weights: hw, color: EYE, w: 8, h: 6, oth: 0 });
      sb.blob([c2.x, c2.y, c2.z], [R * 0.035, R * 0.09, R * 0.02], { rot: [0, 0, roll], weights: hw, color: 0x14040e, w: 6, h: 4, oth: 0 });
      if (k < 2) { const e = new THREE.Object3D(); e.position.set(c.x - h.x, c.y - h.y, c.z - h.z + 0.02); sb.B[hn].add(e); eyes.push(e); }
    }
    const m0 = L(0, -R * 0.38, R * 0.62); sb.box([m0.x, m0.y, m0.z], [R * 0.8, R * 0.06, R * 0.05], { rot: [0, 0, roll], weights: hw, color: D, oth: 0 });
    for (let k = -3; k <= 3; k++) { const q = L(k * R * 0.12, -R * 0.38, R * 0.64); sb.box([q.x, q.y, q.z], [R * 0.025, R * 0.24, R * 0.03], { rot: [0, 0, roll], weights: hw, color: ST, oth: 0 }); }
  });
  // 右腕（長い・関節が多い・地を引きずる拳）
  const RP = names.R.map(n => W(n)); RP.push(RP[RP.length - 1].clone().add(V(0, -0.2, 0.06)));
  sb.tube(RP.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.15 - i * 0.015, 0.14 - i * 0.015], shape: a => { const k = 1 + Math.sin(a * 4 + i * 2) * 0.12; return [k, k]; } })), { sides: 12, sub: 2, weights: chainW(sb, names.R), color: patch, capStart: true, capEnd: false, oth: 0.9 });
  for (let i = 1; i < 4; i++) sb.blob([RP[i].x, RP[i].y, RP[i].z], [0.13, 0.11, 0.13], { weights: rw(names.R[Math.min(3, i)]), color: SK[i % SK.length], w: 10, h: 8, oth: 0.8 });
  const fist = RP[RP.length - 1]; sb.blob([fist.x, fist.y - 0.05, fist.z], [0.2, 0.17, 0.2], { weights: rw(names.R[3]), color: SK[3], w: 12, h: 10, oth: 0.9 });
  for (let k = 0; k < 4; k++) sb.tube([{ c: [fist.x - 0.12 + k * 0.08, fist.y + 0.02, fist.z + 0.14], r: [0.035, 0.035] }, { c: [fist.x - 0.13 + k * 0.08, fist.y + 0.12, fist.z + 0.22], r: [0.004, 0.004] }], { sides: 5, weights: rw(names.R[3]), color: BONE, capEnd: true, oth: 0.5 });
  seam([[RP[1].x - 0.15, RP[1].y + 0.2, RP[1].z], [RP[1].x, RP[1].y + 0.24, RP[1].z + 0.14], [RP[1].x + 0.14, RP[1].y + 0.2, RP[1].z]], rw(names.R[1]), 0.014);
  // 左腕（鞄を抱く）と鞄（古い通勤鞄・名札）
  const LP = names.L.map(n => W(n)); LP.push(LP[LP.length - 1].clone().add(V(-0.14, 0.0, 0.0)));
  sb.tube(LP.map((c, i) => ({ c: [c.x, c.y, c.z], r: [0.12 - i * 0.014, 0.11 - i * 0.014] })), { sides: 12, sub: 2, weights: chainW(sb, names.L), color: patch, capStart: true, capEnd: true, oth: 0.9 });
  const bg = W('tBag');
  sb.box([bg.x, bg.y, bg.z], [0.44, 0.32, 0.13], { weights: rw('tBag'), color: 0x5a3a2a, oth: 0.6 });
  sb.box([bg.x, bg.y + 0.18, bg.z], [0.17, 0.05, 0.03], { weights: rw('tBag'), color: 0x2a1c14, oth: 0.3 });
  sb.box([bg.x + 0.13, bg.y - 0.02, bg.z + 0.07], [0.09, 0.055, 0.005], { weights: rw('tBag'), color: 0xf0e8d8, oth: 0 });
  // 脚（4 本：前の 2 本は人の脚・後ろの 2 本は虫のように細く節の多い脚）
  for (const Lg of legs) {
    const P = Lg.n.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(0, -0.02, Lg.insect ? 0.04 : 0.12)));
    const rr0 = Lg.insect ? 0.07 : 0.15;
    sb.tube(P.map((c, i) => ({ c: [c.x, c.y, c.z], r: [(rr0 - i * (Lg.insect ? 0.012 : 0.03)) * Lg.s, (rr0 - i * (Lg.insect ? 0.012 : 0.03)) * Lg.s] })), { sides: 10, sub: 2, weights: chainW(sb, Lg.n), color: Lg.insect ? (q, t) => (t > 0.8 ? BONE : D) : patch, capStart: false, capEnd: true, oth: 0.9 });
    if (!Lg.insect) { const ft = P[P.length - 2]; sb.blob([ft.x, 0.06, ft.z + 0.08], [0.11 * Lg.s, 0.06, 0.17 * Lg.s], { weights: rw(Lg.n[Lg.n.length - 1]), color: 0xb8b4a8, w: 10, h: 6, oth: 0.6 }); }
  }
  // 背の触腕（6 本・揺れる・目が並ぶ）
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 ? -1 : 1, nm = chain(sb, 'tTen' + i + '_', 'tChest', [sx * (0.14 + Math.floor(i / 2) * 0.1), 0.18 + Math.floor(i / 2) * 0.06, -0.32], [[0, 0, 0], [sx * 0.2, 0.32, -0.2], [sx * 0.26, 0.18, -0.24], [sx * 0.2, -0.04, -0.22], [sx * 0.12, -0.24, -0.14]]);
    const P = nm.map(n => W(n)); P.push(P[P.length - 1].clone().add(V(sx * 0.06, -0.18, -0.06)));
    sb.tube(P.map((c, k) => ({ c: [c.x, c.y, c.z], r: [0.075 * (1 - k / P.length) + 0.012, 0.065 * (1 - k / P.length) + 0.012] })), { sides: 7, weights: chainW(sb, nm), color: (p, t) => (t > 0.8 ? ST : D), capStart: true, capEnd: true, oth: 0.6 });
    for (let k = 1; k < P.length - 1; k++) { sb.blob([P[k].x, P[k].y + 0.05, P[k].z + 0.02], [0.045, 0.028, 0.025], { weights: rw(nm[Math.min(nm.length - 1, k)]), color: EYE, w: 6, h: 4, oth: 0 }); sb.blob([P[k].x, P[k].y + 0.05, P[k].z + 0.045], [0.008, 0.024, 0.006], { weights: rw(nm[Math.min(nm.length - 1, k)]), color: 0x14040e, w: 6, h: 4, oth: 0 }); }
    sway.push(...nm.map((n, k) => ({ b: sb.B[n], k: 12 + k * 2, d: 3.0, gain: 0.25, baseX: 0, amp: 0.16 + k * 0.03, freq: 0.6 + i * 0.13, ph: i * 1.7 + k * 0.4 })));
  }
  // 縫い目からもれる紫の気（glow の組）
  for (let i = 0; i < 8; i++) flame(sb, [Math.sin(i * 2.3) * 0.4, 1.4 + i * 0.15, Math.cos(i * 2.3) * 0.32 + 0.06], [Math.sin(i * 2.3) * 0.3, 1, -0.2], 0.26, { w: 0.06, col: 0x9a50ff, col1: 0x1a0638, weights: i > 4 ? rw('tChest') : rw('tBody') });
  const m = sb.build(null, { rim: 0.45, rimColor: 0xb070ff, outline: 0.013, outlineColor: 0x060408, flameAmp: 0.03, flameK: 1.2 });
  m.update = dt => { if (m.mats.glow) m.mats.glow.userData.u.uTime.value += dt; if (m.anim && m.actorRef) m.anim.update(dt, m.actorRef); };
  const weak = new THREE.Object3D(); weak.position.set(0, 0.1, 0.5); sb.B.tChest.add(weak);
  return Object.assign(m, { provisional: true, kind: 'tsugihagi', height: 3.4, bodyR: 0.9, sway, eyes, eyeGlow: eyes, names, legs, G: sb.B, weak, weakColor: 0xc890ff });
}
