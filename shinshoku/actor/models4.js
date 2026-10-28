// 第4章で増えたキャラクター（コードで組む仮のモデル・provisional）。デザインは本作独自。異形は不気味だが流血・欠損の表現はしない。
// ・応答体（研究施設の異形・境界応答の産物）：白く細長い人影。顔は無く縦の裂け目が光る。首に拘束の輪、背中から垂れる配線、肩に刺さった槽のガラス片、頭の上の応答灯（輪）。
// ・巨大猫又（だんのうらの巨大な姿・男性）：白い毛並みに紫の炎の模様、二本の尾（猫又）、めがね・ピンクの花はそのまま。胸の黒い帯（concept_04・05 を参考に独自に組む）。
// ・境界の先触れ（第4章のボス・仮名）：黒い膜と触腕の塊。胸に桃色の「縁の輪」と瞳。翼のように広がる 4 本の触腕に小さな目。研究施設の配管・槽の破片を取り込んでいる。
import * as THREE from 'three';
import { SkinBody, DIM, faceAtlas } from './skin.js';
import { humanBody, humanHead, glowEyes, xfm, torus } from './models.js';
import { applyEnemyPack, enemyPackClasses } from './enemypack.js';

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
  const m = sb.build(tex, { rim: 0.85, rimColor: 0xb890ff, outline: 0.0095, outlineColor: 0x0a0812, faceEmissive: 0x101014, classes: enemyPackClasses('outou') });
  applyEnemyPack(m, 'outou');   // P18：Blender の体（読めていれば。?epack=0・読めない時はこのコードの形）
  const eyeGlow = glowEyes(m, m.J, [[0, R * 0.85, R * 1.0]]);
  const weak = new THREE.Object3D(); weak.position.set(0, R * 1.55 + 0.05, 0); m.J.head.add(weak);
  return Object.assign(m, { sway, height: 1.86, provisional: true, kind: 'outou', bodyR: 0.32, eyeGlow, weak, weakColor: 0xe0b0ff });
}

// 巨大猫又はフェーズ6 で作り直した（actor/models5.js）。第4章もそちらを使う。
export { buildGiantNekomata } from './models5.js';

// 境界の先触れもフェーズ6 で作り直した（actor/models5.js）。
export { buildSakibure } from './models5.js';
export { lerpC };
