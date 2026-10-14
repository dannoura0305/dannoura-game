// コードで組む仮のキャラクター（provisional）。トゥーン材質＋輪郭線。
// 本番は VRM（VRoid Studio 等）に差し替える：shinshoku/assets/characters/manifest.json（actor/vrm.js）。
// デザインはすべて本作独自（他作品の意匠を写さない）。
import * as THREE from 'three';
import { makeRig, JOINTS } from './rig.js';
import { toon, addOutlines, canvasTex, mergeRig } from '../render/toon.js';

const DYN = new Set(JOINTS);
function finish(root, thick, color) { mergeRig(root, DYN); addOutlines(root, thick, color); }

const SEG = 14;
function part(parent, geo, mat, x = 0, y = 0, z = 0, opt = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (opt.rx) m.rotation.x = opt.rx; if (opt.ry) m.rotation.y = opt.ry; if (opt.rz) m.rotation.z = opt.rz;
  if (opt.s) m.scale.set(...opt.s);
  m.castShadow = opt.shadow !== false; m.receiveShadow = false;
  if (opt.noOutline) m.userData.noOutline = true;
  if (opt.thick) m.userData.outlineThick = opt.thick;
  parent.add(m); return m;
}
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 4, SEG);
const sph = (r, w = SEG, h = 10) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt, rb, h, s = SEG) => new THREE.CylinderGeometry(rt, rb, h, s);

/** アニメ調の目（キャンバス）。iris：虹彩の色 */
function eyeTex(iris, opt = {}) {
  return canvasTex(64, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(32, 52, 26, 38, 0, 0, Math.PI * 2); g.fill();
    const gr = g.createLinearGradient(0, 18, 0, 92); gr.addColorStop(0, opt.dark || '#1b0d2a'); gr.addColorStop(0.55, iris); gr.addColorStop(1, opt.light || '#f0d6ff');
    g.fillStyle = gr; g.beginPath(); g.ellipse(32, 56, 20, 32, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#12081c'; g.beginPath(); g.ellipse(32, 58, 9, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(24, 40, 7, 9, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(40, 74, 3.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a0f24'; g.lineWidth = 7; g.beginPath(); g.ellipse(32, 52, 27, 39, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  });
}
function face(head, r, iris, opt = {}) {
  const tex = eyeTex(iris, opt); const y0 = opt.y || 0;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: true, alphaTest: 0.3 });
  for (const sx of [1, -1]) {
    const e = part(head, new THREE.PlaneGeometry(r * 0.42, r * 0.6), mat, sx * r * 0.36, y0 - r * 0.05, r * 0.93, { ry: sx * 0.32, noOutline: true, shadow: false });
    e.userData.eye = true;
    const brow = part(head, new THREE.BoxGeometry(r * 0.34, r * 0.05, r * 0.04), toon(opt.brow || 0x2a1838), sx * r * 0.38, y0 + r * 0.3, r * 0.9, { rz: sx * (opt.browTilt || 0.12), ry: sx * 0.3, noOutline: true });
    void brow;
  }
  part(head, new THREE.BoxGeometry(r * 0.22, r * 0.035, r * 0.03), toon(0x8a3a50), 0, y0 - r * 0.48, r * 0.9, { noOutline: true });
  // ほおの赤み
  const blush = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.35, depthWrite: false });
  for (const sx of [1, -1]) part(head, new THREE.CircleGeometry(r * 0.13, 12), blush, sx * r * 0.55, y0 - r * 0.3, r * 0.82, { ry: sx * 0.6, noOutline: true, shadow: false });
}

/** 共通の人型の体 */
function body(rig, d, c) {
  const J = rig.J;
  const skin = toon(c.skin), top = toon(c.top), top2 = toon(c.top2 || c.top), pants = toon(c.pants), shoe = toon(c.shoe || 0x241a22);
  // 胴
  part(J.hips, cyl(d.waist * 0.95, d.waist * 1.05, 0.16), pants, 0, 0.0, 0);
  part(J.spine, cyl(d.waist * 1.0, d.waist * 0.98, d.chest + 0.04), top, 0, d.chest / 2, 0);
  part(J.chest, cyl(d.chestR * 0.9, d.chestR, d.neck + 0.02), top, 0, d.neck / 2 - 0.01, 0, { s: [1, 1, 0.78] });
  part(J.chest, sph(d.chestR * 0.9), top, 0, d.neck - 0.03, 0, { s: [1.05, 0.38, 0.75] });
  part(J.neck, cyl(0.036, 0.04, 0.1), skin, 0, 0.03, 0);
  // 腕・脚
  for (const s of ['left', 'right']) {
    const sx = s === 'left' ? 1 : -1;
    part(J[s + 'UpperArm'], sph(d.armR * 1.25), top, 0, 0, 0);
    part(J[s + 'UpperArm'], cap(d.armR, d.upperArm - d.armR), top, 0, -d.upperArm / 2, 0);
    part(J[s + 'LowerArm'], cap(d.armR * 0.9, d.lowerArm - d.armR), top2, 0, -d.lowerArm / 2, 0);
    part(J[s + 'LowerArm'], cyl(d.armR * 1.15, d.armR * 1.2, 0.05), c.cuff != null ? toon(c.cuff) : top2, 0, -d.lowerArm + 0.04, 0);
    const hand = part(J[s + 'Hand'], sph(d.armR * 1.0), skin, 0, -0.035, 0.005, { s: [0.9, 1.25, 0.75] });
    hand.userData.hand = s;
    part(J[s + 'UpperLeg'], cap(d.legR, d.thigh - d.legR), pants, 0, -d.thigh / 2, 0);
    part(J[s + 'LowerLeg'], cap(d.legR * 0.82, d.shin - d.legR), pants, 0, -d.shin / 2, 0);
    part(J[s + 'Foot'], new THREE.BoxGeometry(d.legR * 1.5, 0.07, 0.2), shoe, 0, -0.01, 0.05);
    void sx;
  }
  // 頭
  const head = part(J.head, sph(d.headR, 20, 14), skin, 0, d.headR * 0.92, 0.0, { s: [1, 1.04, 1.0] });
  head.userData.headMesh = true;
  return head;
}

const DIM_DAN = { leg: 0.84, spine: 0.08, chest: 0.19, neck: 0.22, headJ: 0.05, shoulderX: 0.16, shoulderY: 0.19, upperArm: 0.26, lowerArm: 0.23, hipX: 0.08, thigh: 0.41, shin: 0.41, headR: 0.126, waist: 0.108, chestR: 0.138, armR: 0.038, legR: 0.056 };

/** だんのうら（紫の姿）。男性・164cm。紫の髪のポニーテール・小さなピンクのシルクハット・めがね・花の髪飾り・ラベンダーの上着 */
export function buildDannoura() {
  const d = DIM_DAN;
  const rig = makeRig(d); const J = rig.J;
  const c = { skin: 0xffe3d6, top: 0xb7a3e6, top2: 0xa892dc, cuff: 0x6c4fb0, pants: 0x2b2740, shoe: 0x2a1c2e };
  const head = body(rig, d, c);
  const hr = d.headR, hc = new THREE.Vector3(0, hr * 0.92, 0);
  face(J.head, hr, '#8a5cd6', { dark: '#2a0f45', light: '#f2dcff', brow: 0x4b2a78, y: hc.y });
  void head;
  // 髪（紫）
  const hair = toon(0x7d4fc4), hairD = toon(0x5a3596);
  const hb = part(J.head, new THREE.SphereGeometry(hr * 1.1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, hc.y + hr * 0.02, -hr * 0.02, { s: [1.04, 1.06, 1.08] });
  hb.rotation.x = -0.45;
  part(J.head, new THREE.SphereGeometry(hr * 1.08, 16, 10, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.5), hair, 0, hc.y - hr * 0.08, -hr * 0.05, { s: [1.02, 1.1, 1.05] });
  // 前髪（房）
  const bangs = [[-0.55, 0.28, 0.5, 0.35], [-0.2, 0.4, 0.62, 0.12], [0.18, 0.42, 0.6, -0.1], [0.55, 0.3, 0.5, -0.35], [0.0, 0.46, 0.66, 0.02]];
  for (const [x, y, len, rz] of bangs) part(J.head, new THREE.ConeGeometry(hr * 0.24, hr * len * 0.75, 6), hair, x * hr, hc.y + (y + 0.14) * hr, hr * 0.84, { rz: rz + Math.PI, rx: 0.35, thick: 0.006 });
  // 横の房
  for (const sx of [1, -1]) part(J.head, new THREE.ConeGeometry(hr * 0.2, hr * 1.05, 6), hair, sx * hr * 0.86, hc.y - hr * 0.45, hr * 0.45, { rz: Math.PI + sx * 0.08, thick: 0.006 });
  // ポニーテール（結び目＋3 節。揺れは actor 側）
  const tieBase = new THREE.Group(); tieBase.position.set(0, hc.y + hr * 0.35, -hr * 0.98); J.head.add(tieBase);
  part(tieBase, new THREE.TorusGeometry(hr * 0.18, hr * 0.07, 6, 12), toon(0xf06aa8), 0, 0, 0, { rx: Math.PI / 2 });
  const tail = []; let par = tieBase;
  const segs = [[0.22, 0.75], [0.19, 0.75], [0.13, 0.7]];
  for (const [r, len] of segs) {
    const gp = new THREE.Group(); gp.userData.dyn = true; gp.position.set(0, par === tieBase ? 0 : -hr * segs[tail.length - 1][1], 0); par.add(gp);
    part(gp, new THREE.CylinderGeometry(hr * r, hr * r * 0.8, hr * len, 8), tail.length === 2 ? hairD : hair, 0, -hr * len / 2, 0, { thick: 0.008 });
    tail.push(gp); par = gp;
  }
  tail[0].rotation.x = -0.5;
  // 小さなピンクのシルクハット（右上に傾けて）
  const hat = new THREE.Group(); hat.position.set(-hr * 0.42, hc.y + hr * 0.98, hr * 0.05); hat.rotation.set(-0.1, 0.2, 0.35); hat.scale.setScalar(0.85); J.head.add(hat);
  part(hat, cyl(hr * 0.75, hr * 0.75, hr * 0.06, 18), toon(0xe86aa6), 0, 0, 0);
  part(hat, cyl(hr * 0.46, hr * 0.5, hr * 0.62, 16), toon(0xf08cbc), 0, hr * 0.33, 0);
  part(hat, cyl(hr * 0.505, hr * 0.505, hr * 0.13, 16), toon(0x8a2a66), 0, hr * 0.1, 0);
  // めがね
  const frame = new THREE.MeshBasicMaterial({ color: 0x241433 });
  const glass = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, depthWrite: false });
  for (const sx of [1, -1]) {
    part(J.head, new THREE.TorusGeometry(hr * 0.22, hr * 0.022, 6, 20), frame, sx * hr * 0.37, hc.y - hr * 0.04, hr * 1.0, { s: [1.1, 0.85, 1], ry: sx * 0.25, noOutline: true });
    part(J.head, new THREE.CircleGeometry(hr * 0.21, 16), glass, sx * hr * 0.37, hc.y - hr * 0.04, hr * 1.0, { s: [1.1, 0.85, 1], ry: sx * 0.25, noOutline: true, shadow: false });
    part(J.head, new THREE.BoxGeometry(hr * 0.5, hr * 0.03, hr * 0.03), frame, sx * hr * 0.78, hc.y + hr * 0.0, hr * 0.62, { ry: sx * 1.2, noOutline: true });
  }
  part(J.head, new THREE.BoxGeometry(hr * 0.18, hr * 0.025, hr * 0.03), frame, 0, hc.y - hr * 0.0, hr * 1.06, { noOutline: true });
  // 花の髪飾り（左の耳の上・ピンク）
  const fl = new THREE.Group(); fl.position.set(hr * 0.86, hc.y + hr * 0.42, hr * 0.12); fl.rotation.set(0, 1.2, 0.2); J.head.add(fl);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(fl, sph(hr * 0.11, 8, 6), toon(0xff8cc8), Math.cos(a) * hr * 0.13, Math.sin(a) * hr * 0.13, 0, { s: [1, 1, 0.5], thick: 0.004 }); }
  part(fl, sph(hr * 0.07, 8, 6), toon(0xffe070), 0, 0, hr * 0.03, { noOutline: true });
  // 上着：えり・すそ（後ろの燕尾）・ボタン
  part(J.chest, new THREE.ConeGeometry(0.1, 0.08, 4, 1, true), toon(0xffffff), 0, d.neck - 0.02, 0.045, { rx: 0.2, ry: Math.PI / 4 });
  for (const sx of [1, -1]) part(J.chest, new THREE.ConeGeometry(0.022, 0.05, 4), toon(0xf06aa8), sx * 0.025, d.neck - 0.07, 0.115, { rz: sx * Math.PI / 2, thick: 0.004 });
  part(J.chest, sph(0.013, 8, 6), toon(0xf06aa8), 0, d.neck - 0.07, 0.12);
  const tails = [];
  for (const sx of [1, -1]) {
    const tg = new THREE.Group(); tg.userData.dyn = true; tg.position.set(sx * 0.07, -0.02, -0.1); J.hips.add(tg);
    part(tg, new THREE.BoxGeometry(0.12, 0.42, 0.025), toon(c.top2), 0, -0.21, 0, { rz: sx * 0.06, thick: 0.007 });
    tails.push(tg);
  }
  part(J.hips, cyl(d.waist * 1.08, d.waist * 1.08, 0.04), toon(0x3a2448), 0, 0.07, 0);
  // 武器（刀：鞘は左腰・抜き身は右手。拳銃：右手）
  const weapons = buildWeapons(J);
  rig.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  finish(rig.root, 0.011);
  return { root: rig.root, J, tail, tails, weapons, height: 1.64, provisional: true, kind: 'dannoura' };
}

function buildWeapons(J) {
  const steel = new THREE.MeshToonMaterial({ color: 0xd8dde8, gradientMap: toon(0xffffff).gradientMap, emissive: 0x30304a });
  const dark = toon(0x1c1822), tsuba = toon(0xb08a3a), saya = toon(0x2a1630), wrap = toon(0x5a2a6a);
  // 抜き身（右手）
  const katana = new THREE.Group(); katana.name = 'katana'; katana.userData.dyn = true;
  part(katana, new THREE.BoxGeometry(0.03, 0.2, 0.034), wrap, 0, -0.02, 0);
  part(katana, cyl(0.045, 0.045, 0.012, 10), tsuba, 0, 0.085, 0);
  const blade = part(katana, new THREE.BoxGeometry(0.012, 0.74, 0.032), steel, 0, 0.46, 0.004, { thick: 0.004 });
  part(katana, new THREE.ConeGeometry(0.017, 0.07, 4), steel, 0, 0.865, 0.004, { s: [0.7, 1, 1.0], thick: 0.004 });
  katana.position.set(0, -0.06, 0.02); katana.rotation.set(2.1, 0, 0);
  J.rightHand.add(katana);
  // 鞘（左腰）
  const sheath = new THREE.Group(); sheath.name = 'saya'; sheath.userData.dyn = true;
  part(sheath, new THREE.BoxGeometry(0.036, 0.78, 0.044), saya, 0, -0.3, 0, { thick: 0.005 });
  const sheathed = new THREE.Group(); sheathed.userData.dyn = true; part(sheathed, new THREE.BoxGeometry(0.03, 0.2, 0.034), wrap, 0, 0.18, 0); part(sheathed, cyl(0.045, 0.045, 0.012, 10), tsuba, 0, 0.08, 0); sheath.add(sheathed);
  sheath.position.set(0.15, 0.02, 0.04); sheath.rotation.set(-1.9, 0, 0.25);
  J.hips.add(sheath);
  // 拳銃
  const gun = new THREE.Group(); gun.name = 'handgun'; gun.userData.dyn = true;
  part(gun, new THREE.BoxGeometry(0.03, 0.045, 0.17), dark, 0, 0.02, 0.06);
  part(gun, new THREE.BoxGeometry(0.028, 0.1, 0.045), dark, 0, -0.03, -0.005, { rx: -0.25 });
  part(gun, new THREE.BoxGeometry(0.02, 0.012, 0.04), toon(0x8888a0), 0, 0.048, 0.12);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.02, 0.15); gun.add(muzzle);
  gun.position.set(0, -0.07, 0.03); gun.rotation.set(0, 0, 0);
  J.rightHand.add(gun);
  // 腰のホルスター（銃を持っていない時）
  const holster = new THREE.Group(); holster.userData.dyn = true; part(holster, new THREE.BoxGeometry(0.05, 0.14, 0.09), toon(0x2a2026), 0, 0, 0);
  holster.position.set(-0.15, -0.06, 0); J.hips.add(holster);
  return { katana, blade, sheath, sheathed, gun, muzzle, holster };
}

/** 相棒（仮 ID companion・名前未定）。外見は未決定（Q8）のため、控えめな仮の姿 */
export function buildCompanion() {
  const d = Object.assign({}, DIM_DAN, { leg: 0.8, chest: 0.19, neck: 0.22, headR: 0.108, waist: 0.11, chestR: 0.145, armR: 0.038, legR: 0.056, shoulderX: 0.16, thigh: 0.39, shin: 0.4 });
  const rig = makeRig(d); const J = rig.J;
  body(rig, d, { skin: 0xffe6da, top: 0xd9c6a8, top2: 0xcdb896, pants: 0x3a3442, shoe: 0x4a3226 });
  const hr = d.headR, hy = hr * 0.92;
  face(J.head, hr, '#6a4a32', { dark: '#22140c', light: '#f3dcc0', brow: 0x3a2618, browTilt: -0.05, y: hy });
  const hair = toon(0x3b2620);
  part(J.head, new THREE.SphereGeometry(hr * 1.12, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, 0, hy + hr * 0.02, -hr * 0.02, { s: [1.05, 1.05, 1.08], rx: -0.15 });
  part(J.head, new THREE.CylinderGeometry(hr * 1.1, hr * 1.18, hr * 1.0, 18, 1, true, Math.PI * 0.62, Math.PI * 1.76), hair, 0, hy - hr * 0.45, -hr * 0.02, { s: [1, 1, 1.02] });
  for (const [x, rz] of [[-0.5, 0.25], [-0.15, 0.08], [0.2, -0.1], [0.55, -0.3]]) part(J.head, new THREE.ConeGeometry(hr * 0.26, hr * 0.5, 6), hair, x * hr, hy + hr * 0.45, hr * 0.84, { rz: rz + Math.PI, rx: 0.3, thick: 0.006 });
  // 長めのコートのすそ・マフラー
  part(J.hips, new THREE.CylinderGeometry(d.waist * 1.15, d.waist * 1.9, 0.5, 16, 1, true), toon(0xd9c6a8), 0, -0.22, 0, { thick: 0.008 });
  part(J.neck, new THREE.TorusGeometry(0.06, 0.03, 8, 16), toon(0x9a3040), 0, 0.0, 0, { rx: Math.PI / 2 });
  part(J.chest, new THREE.BoxGeometry(0.06, 0.2, 0.025), toon(0x9a3040), 0.05, d.neck - 0.12, 0.13, { rz: 0.1 });
  finish(rig.root, 0.01);
  return { root: rig.root, J, height: 1.58, provisional: true, kind: 'companion' };
}

/** 帰路：家に帰る途中の住人。顔は形を失い、帰り道の癖だけが残る。マフラーの色＝自分の家の戸の灯りの色（手掛かり） */
export function buildKiro(color = 0xd04848) {
  const d = Object.assign({}, DIM_DAN, { leg: 0.88, chest: 0.21, neck: 0.25, headR: 0.115, waist: 0.14, chestR: 0.17, armR: 0.042, legR: 0.06, upperArm: 0.33, lowerArm: 0.31 });
  const rig = makeRig(d); const J = rig.J;
  const head = body(rig, d, { skin: 0xc8ccd4, top: 0x3d4656, top2: 0x343c4a, pants: 0x262a33, shoe: 0x1a1a1f });
  head.material = toon(0xd6d9e0);
  // 顔のかわりの黒い窪み
  const hollow = new THREE.MeshBasicMaterial({ color: 0x07070c });
  for (const sx of [1, -1]) part(J.head, sph(d.headR * 0.2, 10, 8), hollow, sx * d.headR * 0.35, d.headR * 0.95, d.headR * 0.84, { s: [1, 1.5, 0.4], noOutline: true });
  part(J.head, sph(d.headR * 0.28, 10, 8), hollow, 0, d.headR * 0.5, d.headR * 0.84, { s: [1.4, 0.5, 0.4], noOutline: true });
  // 弱点（頭の光）：撃つと怯む
  const weak = part(J.head, sph(d.headR * 0.32, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.0, depthWrite: false }), 0, d.headR * 1.25, -d.headR * 0.2, { noOutline: true, shadow: false });
  // マフラー（家の戸の灯りと同じ色）・買い物袋・コートのすそ
  part(J.neck, new THREE.TorusGeometry(0.075, 0.035, 8, 16), toon(color), 0, 0.0, 0, { rx: Math.PI / 2 });
  part(J.chest, new THREE.BoxGeometry(0.08, 0.28, 0.025), toon(color), -0.06, d.neck - 0.17, 0.14, { rz: -0.15 });
  part(J.hips, new THREE.CylinderGeometry(d.waist * 1.2, d.waist * 1.7, 0.55, 14, 1, true), toon(0x3d4656), 0, -0.24, 0, { thick: 0.01 });
  const bag = new THREE.Group(); bag.position.set(0, -0.1, 0); J.leftHand.add(bag);
  part(bag, new THREE.BoxGeometry(0.22, 0.26, 0.1), toon(0xe8e2d0), 0, -0.14, 0);
  finish(rig.root, 0.012, 0x08080e);
  return { root: rig.root, J, height: 1.72, provisional: true, kind: 'kiro', weak, bodyR: 0.34, weakY: 1.62 };
}

/** 閉店：閉店の手順を守り続ける店員。背中のシャッター・右腕のレジ・顔の札が体と混ざっている */
export function buildHeiten() {
  const d = Object.assign({}, DIM_DAN, { leg: 0.98, spine: 0.1, chest: 0.26, neck: 0.3, headR: 0.14, waist: 0.2, chestR: 0.26, armR: 0.06, legR: 0.085, shoulderX: 0.28, upperArm: 0.36, lowerArm: 0.34, thigh: 0.48, shin: 0.48, hipX: 0.12 });
  const rig = makeRig(d); const J = rig.J;
  body(rig, d, { skin: 0xb9b2a6, top: 0x4c6a52, top2: 0x3f5a46, pants: 0x2a2b30, shoe: 0x16161a });
  // エプロン
  part(J.spine, new THREE.BoxGeometry(0.36, 0.62, 0.03), toon(0x2f8f5a), 0, -0.05, d.waist + 0.02, { thick: 0.01 });
  // 背中のシャッター（波板）
  const sh = new THREE.Group(); sh.position.set(0, d.neck * 0.3, -d.chestR - 0.06); sh.rotation.x = 0.12; J.chest.add(sh);
  for (let i = 0; i < 9; i++) part(sh, new THREE.BoxGeometry(0.9, 0.07, 0.04), toon(i % 2 ? 0x8d9299 : 0xa9aeb5), 0, 0.42 - i * 0.075, (i % 2) * 0.015, { thick: 0.008 });
  part(sh, new THREE.BoxGeometry(0.95, 0.12, 0.08), toon(0x5e6268), 0, 0.5, 0);
  // 顔：札（「閉店」）
  const plate = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#efe7d0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b1a1a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#8a1010'; g.font = 'bold 50px ' + '"IPAGothic","Noto Sans CJK JP",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('閉', w / 2, 38); g.fillText('店', w / 2, 92);
  });
  const face = part(J.head, new THREE.BoxGeometry(0.26, 0.3, 0.03), new THREE.MeshBasicMaterial({ map: plate }), 0, d.headR * 0.95, d.headR * 0.95, { thick: 0.008 });
  face.userData.plate = true;
  part(J.head, new THREE.CylinderGeometry(0.004, 0.004, 0.22), toon(0x222222), 0, d.headR * 1.75, d.headR * 0.7, { rz: 0.9, noOutline: true });
  // 右腕：レジ（引き出しが弱点・光る）
  const reg = new THREE.Group(); reg.position.set(0, -0.05, 0.05); J.rightLowerArm.add(reg);
  part(reg, new THREE.BoxGeometry(0.3, 0.22, 0.34), toon(0x30343a), 0, -0.22, 0.04, { thick: 0.01 });
  part(reg, new THREE.BoxGeometry(0.24, 0.08, 0.16), toon(0x9aa0a8), 0, -0.08, -0.02, { rx: -0.4 });
  const weak = part(reg, new THREE.BoxGeometry(0.26, 0.07, 0.3), new THREE.MeshBasicMaterial({ color: 0xffb040 }), 0, -0.35, 0.06, { noOutline: true });
  J.rightHand.visible = false;
  // 左手：値札の束
  part(J.leftHand, new THREE.BoxGeometry(0.06, 0.1, 0.02), toon(0xf2e6c8), 0, -0.08, 0.04);
  finish(rig.root, 0.014, 0x08080e);
  return { root: rig.root, J, height: 2.15, provisional: true, kind: 'heiten', weak, bodyR: 0.5, shutter: sh, plate: face };
}
