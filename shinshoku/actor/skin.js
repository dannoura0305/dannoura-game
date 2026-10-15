// コードで組むアニメ調の人型（スキン網）。骨（THREE.Bone）を組み、体の部品を「骨の重み」つきの頂点で作って
// 1 つの SkinnedMesh（色は頂点色）＋顔の絵（キャンバスの地図帳・1 つの網）＋裏返しの殻の輪郭線にまとめる。
// → 1 体あたり描画呼び出し 3 回（本体・顔・輪郭線）。関節の境目は重みを混ぜて滑らかに曲がる。
// 武器・帽子などの付属物も同じ網に入れ、出し入れは「専用の骨の大きさを 0 にする」で行う（描画呼び出しを増やさない）。
// 向き：キャラクターは +z を向く。左＝+x。y が上。単位 m。関節の名前は VRM の humanoid と同じ（actor/rig.js の JOINTS）。
import * as THREE from 'three';
import { charMaterial, skinOutlineMaterial, flameMaterial } from '../render/toon.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = c => (c instanceof THREE.Color ? c : new THREE.Color(c));
/** 細かさ（画質の段で変える：高・中 1、低 0.7）。管・球の分割数に掛ける */
let DETAIL = 1;
export function setDetail(k) { DETAIL = Math.max(0.5, Math.min(1.5, k)); }
export const detail = () => DETAIL;
const segs = (n, min = 3) => Math.max(min, Math.round(n * DETAIL));

/** 標準の寸法（だんのうら：男性 164cm・細身） */
export const DIM = {
  leg: 0.86, spine: 0.09, chest: 0.2, neck: 0.205, headJ: 0.045,
  shoulderX: 0.165, shoulderY: 0.185, upperArm: 0.27, lowerArm: 0.235, hipX: 0.085, thigh: 0.4, shin: 0.385,
  headR: 0.122,
};

/**
 * 骨と頂点を集める作り手。
 * new SkinBody(dim) → 部品を足す（tube・blob・box・strand・decal）→ build()
 */
export class SkinBody {
  constructor(d = DIM, opt = {}) {
    this.d = d; this.opt = opt;
    this.root = new THREE.Group(); this.root.name = 'rig';
    this.bones = []; this.B = {}; this.restW = {};
    const bone = (name, parent, x, y, z) => this.addBone(name, parent, x, y, z);
    bone('hips', null, 0, d.leg, 0);
    bone('spine', 'hips', 0, d.spine, 0);
    bone('chest', 'spine', 0, d.chest, 0);
    bone('neck', 'chest', 0, d.neck, 0);
    bone('head', 'neck', 0, d.headJ, 0);
    for (const [s, sx] of [['left', 1], ['right', -1]]) {
      bone(s + 'UpperArm', 'chest', sx * d.shoulderX, d.shoulderY, 0);
      bone(s + 'LowerArm', s + 'UpperArm', 0, -d.upperArm, 0);
      bone(s + 'Hand', s + 'LowerArm', 0, -d.lowerArm, 0);
      bone(s + 'UpperLeg', 'hips', sx * d.hipX, -0.02, 0);
      bone(s + 'LowerLeg', s + 'UpperLeg', 0, -d.thigh, 0);
      bone(s + 'Foot', s + 'LowerLeg', 0, -d.shin, 0);
    }
    this.groups = { body: this.acc(), face: this.acc(), plain: this.acc(), glow: this.acc() };
    // 頭の中心（モデル空間）
    this.hc = this.W('head').clone().add(V(0, d.headR * 0.9, 0));
  }
  acc() { return { pos: [], nrm: [], col: [], uv: [], si: [], sw: [], oth: [], idx: [] }; }
  addBone(name, parent, x, y, z) {
    const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z);
    (parent ? this.B[parent] : this.root).add(b);
    this.B[name] = b; this.bones.push(b);
    this.restW[name] = (parent ? this.restW[parent].clone() : V()).add(V(x, y, z));
    return b;
  }
  /** 骨の休みの姿勢での位置（モデル空間） */
  W(name) { return this.restW[name].clone(); }
  bi(name) { const i = this.bones.indexOf(this.B[name]); if (i < 0) throw new Error('no bone ' + name); return i; }

  // ── 重みの関数 ──
  /** 1 本の骨だけ */
  rigid(name) { const i = this.bi(name); return () => [[i, 1]]; }
  /** 区間の位置 t（0〜1）に沿って骨を混ぜる。stops=[[t, 骨の名前], …] */
  along(stops) {
    const S = stops.map(([t, n]) => [t, this.bi(n)]);
    return (p, t) => {
      if (t <= S[0][0]) return [[S[0][1], 1]];
      for (let k = 0; k < S.length - 1; k++) {
        const [t0, a] = S[k], [t1, b] = S[k + 1];
        if (t <= t1) { const w = smooth(t0, t1, t); return a === b ? [[a, 1]] : [[a, 1 - w], [b, w]]; }
      }
      return [[S[S.length - 1][1], 1]];
    };
  }

  /** 頂点を 1 つの部品ぶんまとめて足す（geo は index つき・法線つき）。weights(p, t, i)・color(p, t, i) */
  push(groupName, geo, { weights, color, t = null, oth = 1, uvKeep = false, fold = 0 } = {}) {
    const g = this.groups[groupName];
    const base = g.pos.length / 3;
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, T = geo.userData.t;
    const p = V();
    for (let i = 0; i < P.count; i++) {
      p.set(P.getX(i), P.getY(i), P.getZ(i));
      const tt = T ? T[i] : (t != null ? t : 0);
      g.pos.push(p.x, p.y, p.z); g.nrm.push(N.getX(i), N.getY(i), N.getZ(i));
      let c = typeof color === 'function' ? col(color(p, tt, i)) : col(color == null ? 0xffffff : color);
      if (U && uvKeep) g.uv.push(U.getX(i), U.getY(i)); else g.uv.push(0, 0);
      let w = weights(p, tt, i);
      w = w.filter(x => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
      // 布のしわ・関節のくぼみ（頂点色に焼く）：2 本の骨が半々に混ざる所（ひじ・ひざ・腰）を暗く、布には斜めのしわの縞
      if (fold) {
        let k = 1;
        if (w.length > 1) { const s2 = w[0][1] + w[1][1]; const a = w[0][1] / s2, b = w[1][1] / s2; k -= 0.16 * Math.min(1, 4 * a * b) * fold; }
        const n = N ? Math.atan2(N.getX(i), N.getZ(i)) : 0;
        const st = Math.sin(p.y * 46 + n * 2.2 + p.x * 9) * 0.5 + Math.sin(p.y * 23 - n * 1.3) * 0.5;
        k -= Math.max(0, st - 0.35) * 0.11 * fold;
        if (k < 1) c = c.clone().multiplyScalar(k);
      }
      g.col.push(c.r, c.g, c.b);
      const sum = w.reduce((s, x) => s + x[1], 0) || 1;
      for (let k = 0; k < 4; k++) { g.si.push(w[k] ? w[k][0] : 0); g.sw.push(w[k] ? w[k][1] / sum : 0); }
      g.oth.push(typeof oth === 'function' ? oth(p, tt) : oth);
    }
    const I = geo.index;
    if (I) for (let i = 0; i < I.count; i++) g.idx.push(base + I.getX(i));
    else for (let i = 0; i < P.count; i++) g.idx.push(base + i);
  }

  /**
   * 管（断面が楕円の輪を中心の線に沿ってつなぐ）。手足・胴・髪の房・帽子に使う。
   * rings：[{ c:[x,y,z], r:[rx,rz], col? }]（モデル空間）。ref：断面の「横」を決める向き（既定 +z を前に）
   * opt：{ sides, capStart, capEnd, weights, color, oth, group, ref, twist }
   */
  tube(rings, opt = {}) {
    if (opt.sub > 1) {                                             // 輪を補間して細かくする（色の境目をくっきり）
      const out = [];
      for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < opt.sub; k++) {
        const a = rings[i], b = rings[i + 1], t = k / opt.sub;
        const L = (x, y) => x.map((v, j) => v + (y[j] - v) * t);
        out.push(Object.assign({}, t < 0.5 ? a : b, { c: L(a.c, b.c), r: L(a.r, b.r), off: L(a.off || [0, 0], b.off || [0, 0]) }));
      }
      out.push(rings[rings.length - 1]); rings = out;
    }
    const sides = segs(opt.sides || 12, 4), n = rings.length;
    const pos = [], tArr = [], idx = [];
    const C = rings.map(r => V(...r.c));
    let prevX = null;
    const ref0 = opt.ref ? V(...opt.ref).normalize() : V(0, 0, 1);
    const frames = [];
    for (let i = 0; i < n; i++) {
      const T = (i === 0 ? C[1].clone().sub(C[0]) : i === n - 1 ? C[n - 1].clone().sub(C[n - 2]) : C[i + 1].clone().sub(C[i - 1])).normalize();
      let X;
      if (!prevX) { X = ref0.clone().cross(T); if (X.lengthSq() < 1e-6) X = V(1, 0, 0).cross(T); X.normalize(); }
      else { X = prevX.clone().sub(T.clone().multiplyScalar(prevX.dot(T))).normalize(); }
      const Z = T.clone().cross(X).normalize();
      frames.push([X, Z]); prevX = X;
    }
    const tOf = i => (n === 1 ? 0 : i / (n - 1));
    for (let i = 0; i < n; i++) {
      const [X, Z] = frames[i], r = rings[i].r, off = rings[i].off || [0, 0];
      for (let s = 0; s < sides; s++) {
        const a = s / sides * Math.PI * 2 + (opt.twist || 0);
        const ca = Math.cos(a), sa = Math.sin(a);
        // 断面の形（前後で少し違う：flatBack など）
        let rx = r[0], rz = r[1];
        if (rings[i].shape) { const k = rings[i].shape(a); rx *= k[0]; rz *= k[1]; }
        const p = C[i].clone().addScaledVector(X, ca * rx + off[0]).addScaledVector(Z, sa * rz + off[1]);
        pos.push(p.x, p.y, p.z); tArr.push(tOf(i));
      }
    }
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < sides; s++) {
      const a = i * sides + s, b = i * sides + (s + 1) % sides, c = (i + 1) * sides + s, d = (i + 1) * sides + (s + 1) % sides;
      idx.push(a, b, c, b, d, c);
    }
    const capAt = (i, outward) => {
      const ci = pos.length / 3; const T = (i === 0 ? C[0].clone().sub(C[1]) : C[n - 1].clone().sub(C[n - 2])).normalize();
      const k = opt.capBulge != null ? opt.capBulge : 0.35;
      const rr = Math.min(rings[i].r[0], rings[i].r[1]);
      const p = C[i].clone().addScaledVector(T, rr * k); pos.push(p.x, p.y, p.z); tArr.push(tOf(i));
      for (let s = 0; s < sides; s++) { const a = i * sides + s, b = i * sides + (s + 1) % sides; if (outward) idx.push(ci, b, a); else idx.push(ci, a, b); }
    };
    if (opt.capStart !== false) capAt(0, true);
    if (opt.capEnd !== false) capAt(n - 1, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData.t = tArr;
    const colorFn = opt.color != null ? opt.color : (p, t) => { const i = Math.min(n - 1, Math.round(t * (n - 1))); return rings[i].col != null ? rings[i].col : 0xffffff; };
    this.push(opt.group || 'body', g, { weights: opt.weights, color: colorFn, oth: opt.oth ?? 1, fold: opt.fold || 0 });
    return g;
  }

  /** 楕円体（変形つき）。c：中心、r：[rx,ry,rz]、rot：[x,y,z]（オイラー）、deform(v)：単位球の上の点を変える */
  blob(c, r, opt = {}) {
    const g = new THREE.SphereGeometry(1, segs(opt.w || 14, 6), segs(opt.h || 10, 4), opt.phiStart || 0, opt.phiLength || Math.PI * 2, opt.thetaStart || 0, opt.thetaLength || Math.PI);
    const P = g.attributes.position, v = V();
    for (let i = 0; i < P.count; i++) {
      v.set(P.getX(i), P.getY(i), P.getZ(i));
      if (opt.deform) opt.deform(v);
      v.set(v.x * r[0], v.y * r[1], v.z * r[2]);
      P.setXYZ(i, v.x, v.y, v.z);
    }
    if (opt.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...opt.rot, 'YXZ')));
    g.translate(...c);
    if (opt.xf) g.applyMatrix4(opt.xf);
    g.computeVertexNormals();
    if (opt.keep) { this.push(opt.group || 'body', filterTris(g, opt.keep), { weights: opt.weights, color: opt.color, oth: opt.oth ?? 1, fold: opt.fold || 0 }); return g; }
    this.push(opt.group || 'body', g, { weights: opt.weights, color: opt.color, oth: opt.oth ?? 1, fold: opt.fold || 0 });
    return g;
  }
  /** 箱（角を少し丸める代わりに分割なし）。size:[w,h,d]、rot、xf */
  box(c, size, opt = {}) {
    const g = new THREE.BoxGeometry(...size);
    if (opt.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...opt.rot, 'YXZ')));
    g.translate(...c);
    if (opt.xf) g.applyMatrix4(opt.xf);
    this.push(opt.group || 'body', g, { weights: opt.weights, color: opt.color, oth: opt.oth ?? 1 });
    return g;
  }
  /** 円柱（帽子・刀の鍔など）。axis は既定で y */
  cyl(c, rt, rb, h, opt = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, opt.seg || 14, 1, !!opt.open);
    if (opt.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...opt.rot, 'YXZ')));
    g.translate(...c);
    if (opt.xf) g.applyMatrix4(opt.xf);
    this.push(opt.group || 'body', g, { weights: opt.weights, color: opt.color, oth: opt.oth ?? 1 });
    return g;
  }
  /**
   * 髪の房：根元から先へ曲がりながら細くなる平たい管。pts：制御点（モデル空間）3〜4 個、w：根元の幅、
   * out：平たい面が向く外側の向き（頭の中心から根元への向きなど）
   */
  strand(pts, w, opt = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
    const N = Math.max(3, Math.round((opt.segs || 7) * Math.min(1, DETAIL))), rings = [];
    const flat = opt.flat ?? 0.42, taper = opt.taper ?? 0.85;
    for (let i = 0; i <= N; i++) {
      const t = i / N, c = curve.getPoint(t);
      const k = Math.max(0.04, Math.pow(1 - t, taper)) * (1 + Math.sin(t * Math.PI) * (opt.bulge || 0.15));
      rings.push({ c: [c.x, c.y, c.z], r: [w * k, w * k * flat] });
    }
    const cfn = opt.color || ((p, t) => (t < 0.2 ? opt.root || opt.base : t > 0.75 ? opt.tip || opt.base : opt.base));
    return this.tube(rings, { sides: opt.sides || 6, sub: opt.sub, capStart: false, capEnd: true, capBulge: 0.2, weights: opt.weights, color: cfn, oth: opt.oth ?? ((p, t) => 0.55 * (1 - t) + 0.15), ref: opt.out, group: opt.group });
  }
  /**
   * 顔の絵（地図帳の uv の範囲を貼る、頭の面に沿って少し曲げた小さな網）。
   * at：顔の上の中心（頭の中心からの単位の向き [x,y,z]）、size：[幅,高さ]（m）、uv：[u0,v0,u1,v1]、bone：重み
   */
  decal(at, size, uv, opt = {}) {
    const surf = opt.surface;                 // (dir:Vector3) → 頭の面の点（モデル空間）
    const nx = opt.nx || 4, ny = opt.ny || 3;
    const pos = [], uvs = [], idx = [];
    const dir0 = V(...at).normalize();
    const right = dir0.clone().cross(V(0, 1, 0)).normalize();          // 見る人から見て右（キャラクターの右＝ -x 側）
    if (opt.roll) right.applyAxisAngle(dir0, opt.roll);
    const up = right.clone().cross(dir0).normalize();
    const center = surf(dir0);
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx - 0.5, v = j / ny - 0.5;
      const q = center.clone().addScaledVector(right, u * size[0]).addScaledVector(up, v * size[1]);
      const dir = q.sub(this.hc).normalize();
      const p = surf(dir).addScaledVector(dir, opt.lift || 0.0025);
      pos.push(p.x, p.y, p.z);
      const uu = opt.mirrorU ? 1 - i / nx : i / nx;
      uvs.push(uv[0] + (uv[2] - uv[0]) * uu, uv[1] + (uv[3] - uv[1]) * (j / ny));
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    this.push('face', g, { weights: opt.weights, color: 0xffffff, uvKeep: true, oth: 0 });
    return g;
  }
  /** 平らな板（顔の地図帳の絵を貼る：札・名札など）。c：中心、size、rot、uv */
  card(c, size, uv, opt = {}) {
    const g = new THREE.PlaneGeometry(size[0], size[1]);
    const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, uv[0] + (uv[2] - uv[0]) * U.getX(i), uv[1] + (uv[3] - uv[1]) * U.getY(i));
    if (opt.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...opt.rot, 'YXZ')));
    g.translate(...c);
    if (opt.xf) g.applyMatrix4(opt.xf);
    this.push('face', g, { weights: opt.weights, color: 0xffffff, uvKeep: true, oth: 0 });
    return g;
  }

  /** 網を作る。faceTex：顔の地図帳（CanvasTexture）。戻り値 { root, J, X, mesh, faceMesh, outline, mats } */
  build(faceTex, opt = {}) {
    this.root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(this.bones);
    const mk = (a, withOth) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nrm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(a.si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(a.sw, 4));
      if (withOth) g.setAttribute('oth', new THREE.Float32BufferAttribute(a.oth, 1));
      g.setIndex(a.idx.length > 65535 ? new THREE.Uint32BufferAttribute(a.idx, 1) : new THREE.Uint16BufferAttribute(a.idx, 1));
      g.computeBoundingSphere(); g.boundingSphere.radius += 0.6;
      return g;
    };
    // 輪郭線のない部品（めがねの細い枠など）も本体と同じ材質なので本体の網へ（oth=0 で殻が出ない）
    const body = this.groups.body, plain = this.groups.plain;
    if (plain.pos.length) {
      const base = body.pos.length / 3;
      for (const k of ['pos', 'nrm', 'col', 'uv', 'si', 'sw']) body[k].push(...plain[k]);
      for (let i = 0; i < plain.oth.length; i++) body.oth.push(0);
      for (const i of plain.idx) body.idx.push(base + i);
    }
    const bodyGeo = mk(body, true);
    const mats = { body: charMaterial({ rim: opt.rim, rimColor: opt.rimColor }) };
    const mesh = new THREE.SkinnedMesh(bodyGeo, mats.body); mesh.name = 'skin_body';
    mesh.castShadow = true; mesh.frustumCulled = true;
    this.root.add(mesh); mesh.bind(skeleton);
    let faceMesh = null;
    if (this.groups.face.pos.length && faceTex) {
      mats.face = charMaterial({ map: faceTex, alphaTest: 0.45, rim: 0, emissive: opt.faceEmissive ?? 0x2a2230 }); mats.face.side = THREE.DoubleSide;
      faceMesh = new THREE.SkinnedMesh(mk(this.groups.face, false), mats.face); faceMesh.name = 'skin_face';
      faceMesh.castShadow = false; this.root.add(faceMesh); faceMesh.bind(skeleton);
    }
    mats.outline = skinOutlineMaterial(opt.outline ?? 0.0085, opt.outlineColor ?? 0x1a1022);
    const outline = new THREE.SkinnedMesh(bodyGeo, mats.outline); outline.name = 'skin_outline';
    outline.castShadow = false; outline.userData.isOutlineHull = true;
    this.root.add(outline); outline.bind(skeleton);
    // 炎の毛（glow の組）：加算の網（描画呼び出し +1）。輪郭線は出さない
    let glowMesh = null;
    if (this.groups.glow.pos.length) {
      mats.glow = flameMaterial({ amp: opt.flameAmp, k: opt.flameK });
      glowMesh = new THREE.SkinnedMesh(mk(this.groups.glow, true), mats.glow); glowMesh.name = 'skin_flame';
      glowMesh.castShadow = false; glowMesh.renderOrder = 5; this.root.add(glowMesh); glowMesh.bind(skeleton);
    }
    const J = {}; for (const n of ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot']) J[n] = this.B[n];
    const X = {}; for (const [n, b] of Object.entries(this.B)) if (!J[n]) X[n] = b;
    return { root: this.root, J, X, mesh, faceMesh, outline, glowMesh, mats, skeleton, tris: (bodyGeo.index.count + (faceMesh ? faceMesh.geometry.index.count : 0)) / 3 };
  }
}

/** 三角形を絞る（keep(中心の点) が true の三角形だけ残す）。髪の帽子の「顔の部分を抜く」などに使う */
export function filterTris(g, keep) {
  const P = g.attributes.position, I = g.index, out = [], c = V();
  for (let i = 0; i < I.count; i += 3) {
    const a = I.getX(i), b = I.getX(i + 1), d = I.getX(i + 2);
    c.set((P.getX(a) + P.getX(b) + P.getX(d)) / 3, (P.getY(a) + P.getY(b) + P.getY(d)) / 3, (P.getZ(a) + P.getZ(b) + P.getZ(d)) / 3);
    if (keep(c)) out.push(a, b, d);
  }
  g.setIndex(out);
  return g;
}

/** アニメ調の頭の形：単位球の点 v を変える（あごを細く・頬を少し・後頭部を丸く）。male：あごを少し角ばらせる */
export function headDeform(v, opt = {}) {
  const y = v.y, z = v.z;
  // 下半分の前側を細く（あご）
  const low = smooth(0.15, -1.0, y), front = smooth(-0.3, 0.8, z);
  v.x *= 1 - (opt.jaw ?? 0.34) * low * (0.35 + 0.65 * front);
  // あごの先を少し前・下へ
  const chin = smooth(-0.45, -1.0, y) * smooth(0.0, 0.9, z);
  v.z += 0.1 * chin; v.y -= 0.07 * chin;
  // 顔の正面を少し平らに
  if (z > 0.55) v.z = 0.55 + (z - 0.55) * 0.82;
  // 頭頂を少し高く・後頭部を少し後ろへ
  if (y > 0) { v.y *= 1.05; v.z -= 0.05 * y * (z < 0 ? 1 : 0.3); }
  if (z < 0) v.z *= 1.06;
  return v;
}

/** キャンバスの地図帳（顔の部品）。256×256。区画：目 [0,0]-[128,128]、眉 [128,0]-[256,48]、口 [128,48]-[256,96]、鼻 [128,96]-[192,128]、頬 [192,96]-[256,128]、自由 [0,128]-[256,256] */
export function faceAtlas(draw) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'); g.clearRect(0, 0, 256, 256); draw(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.flipY = true;
  t.userData.canvas = c;
  return t;
}
/** 地図帳の画素の範囲 → uv（flipY のキャンバス：上が v=1） */
export const UVR = (x0, y0, x1, y1) => [x0 / 256, 1 - y1 / 256, x1 / 256, 1 - y0 / 256];

/**
 * 表情つきの顔の地図帳。draw(g, expr) を表情ごとに描き直す（キャンバス 256² の再アップロード：表情が変わる時だけ）。
 * 戻り値の texture.userData.setExpr(name) で表情を変える。
 */
export function faceAtlasExpr(draw, first = 'neutral') {
  const t = faceAtlas(g => draw(g, EXPR[first] || EXPR.neutral));
  t.userData.expr = first;
  t.userData.setExpr = name => {
    if (!EXPR[name] || t.userData.expr === name) return false;
    t.userData.expr = name; const g = t.userData.canvas.getContext('2d'); g.clearRect(0, 0, 256, 256); draw(g, EXPR[name]); t.needsUpdate = true; return true;
  };
  return t;
}
/** 表情の型（眉・口・まぶた）。brow：{tilt（＋で内側が下がる＝険しい）, arch, y}、mouth：{kind, smile}、lid：上まぶたの下がり 0〜0.45 */
export const EXPR = {
  neutral: { brow: { tilt: 0, arch: 0, y: 0 }, mouth: { kind: 'smile', smile: 2 }, lid: 0.06 },
  smile: { brow: { tilt: -3, arch: 4, y: -2 }, mouth: { kind: 'smile', smile: 7 }, lid: 0.12, happy: true },
  serious: { brow: { tilt: 7, arch: -2, y: 4 }, mouth: { kind: 'line' }, lid: 0.2 },
  angry: { brow: { tilt: 12, arch: -4, y: 7 }, mouth: { kind: 'frown' }, lid: 0.26 },
  surprised: { brow: { tilt: -6, arch: 6, y: -8 }, mouth: { kind: 'o' }, lid: 0 },
  sad: { brow: { tilt: -10, arch: 2, y: 0 }, mouth: { kind: 'frown', smile: -2 }, lid: 0.22 },
  talk: { brow: { tilt: 0, arch: 2, y: 0 }, mouth: { kind: 'open' }, lid: 0.06 },
  calm: { brow: { tilt: 2, arch: 0, y: 2 }, mouth: { kind: 'smile', smile: 1 }, lid: 0.32 },
};
/** アニメ調の目を描く（区画の左上 ox,oy、大きさ 128）。o.lid：上まぶたの下がり、o.slit：猫の瞳、o.glow：瞳の光 */
export function drawEye(g, ox, oy, o = {}) {
  g.save(); g.translate(ox, oy);
  const cx = 64, cy = 70, rw = o.rw || 36, rh = o.rh || 44, lid = o.lid || 0;
  // 白目（上まぶたで切る）
  g.save(); g.beginPath(); g.ellipse(cx, cy, rw, rh * 0.86, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#fbf8ff'; g.fillRect(0, 0, 128, 128);
  // 虹彩（グラデーション＋放射の筋＋縁）
  const ix = cx + (o.look || 0), iy = cy + 5, irw = rw * 0.74, irh = rh * 0.82;
  const gr = g.createLinearGradient(0, iy - irh, 0, iy + irh);
  gr.addColorStop(0, o.dark || '#1b0d2a'); gr.addColorStop(0.42, o.iris || '#8a5cd6'); gr.addColorStop(0.85, o.light || '#f0d6ff'); gr.addColorStop(1, o.iris || '#8a5cd6');
  g.fillStyle = gr; g.beginPath(); g.ellipse(ix, iy, irw, irh, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.beginPath(); g.moveTo(ix + Math.cos(a) * irw * 0.35, iy + Math.sin(a) * irh * 0.35); g.lineTo(ix + Math.cos(a) * irw * 0.85, iy + Math.sin(a) * irh * 0.85); g.stroke(); }
  g.strokeStyle = o.dark || '#1b0d2a'; g.lineWidth = 3; g.beginPath(); g.ellipse(ix, iy, irw, irh, 0, 0, Math.PI * 2); g.stroke();
  // 瞳（猫の姿：縦に細い）
  g.fillStyle = o.pupil || '#160a22'; g.beginPath();
  if (o.slit) g.ellipse(ix, iy + 2, rw * 0.11, rh * 0.5, 0, 0, Math.PI * 2); else g.ellipse(ix, iy + 4, rw * 0.3, rh * 0.38, 0, 0, Math.PI * 2);
  g.fill();
  if (o.glow) { const gg = g.createRadialGradient(ix, iy + 10, 2, ix, iy + 10, irw); gg.addColorStop(0, o.glow); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(0, 0, 128, 128); }
  // 光（大・小・下の照り返し）
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ix - rw * 0.3, iy - irh * 0.4, rw * 0.21, rh * 0.17, -0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(ix + rw * 0.28, iy - irh * 0.12, rw * 0.08, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.55; g.beginPath(); g.ellipse(ix + rw * 0.18, iy + irh * 0.55, rw * 0.22, rh * 0.07, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  // 白目の上の影・まぶたの下がり
  g.fillStyle = 'rgba(80,60,120,.26)'; g.fillRect(0, cy - rh, 128, rh * 0.38 + lid * rh * 1.6);
  g.globalCompositeOperation = 'destination-out';                       // まぶたで隠れた所は透明（頭の肌が見える）
  if (o.happy) { g.beginPath(); g.ellipse(cx, cy + rh * 1.05, rw * 1.2, rh * 0.62, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, cy - rh * 0.86 + lid * rh * 1.7);
  g.globalCompositeOperation = 'source-over';
  g.restore();
  // 上まぶた（太い線＋目じりの跳ね）
  const ly = cy + 6 + lid * rh * 1.4;
  g.strokeStyle = o.lash || '#1a0f24'; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = o.lashW || 9; g.beginPath(); g.ellipse(cx, ly, rw + 3, rh * (0.9 - lid * 0.9) + 2, 0, Math.PI * 1.04, Math.PI * 1.97); g.stroke();
  if (o.flick !== false) { g.lineWidth = 6; g.beginPath(); g.moveTo(cx + rw * 0.95, ly - rh * (0.5 - lid * 0.6)); g.quadraticCurveTo(cx + rw * 1.2, ly - rh * (0.62 - lid * 0.6), cx + rw * 1.3, ly - rh * (0.78 - lid * 0.5)); g.stroke(); }
  // 二重のしわ
  g.lineWidth = 2.2; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(cx + 3, ly - 9, rw * 0.92, rh * 0.86, 0, Math.PI * 1.15, Math.PI * 1.8); g.stroke(); g.globalAlpha = 1;
  // 下まぶた（細い）
  g.lineWidth = 3; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(cx, cy - 2, rw * 0.8, rh * 0.86, 0, Math.PI * 0.25, Math.PI * 0.75); g.stroke(); g.globalAlpha = 1;
  g.restore();
}
export function drawBrow(g, o = {}) {
  g.save(); g.translate(128, 0);
  const tilt = o.tilt || 0, y = o.y || 0;
  g.strokeStyle = o.color || '#3a2058'; g.lineCap = 'round'; g.lineWidth = o.w || 9;
  // 眉頭（内側）は左（x 小）。tilt＋で内側が下がる
  g.beginPath(); g.moveTo(14, 30 + tilt + y); g.quadraticCurveTo(60, 12 + (o.arch || 0) + y, 116, 24 - tilt * 0.4 + y); g.stroke();
  g.lineWidth = (o.w || 9) * 0.45; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(20, 34 + tilt + y); g.quadraticCurveTo(64, 20 + (o.arch || 0) + y, 108, 30 - tilt * 0.4 + y); g.stroke();
  g.restore();
}
export function drawMouth(g, o = {}) {
  g.save(); g.translate(128, 48);
  g.strokeStyle = o.color || '#7a3048'; g.lineCap = 'round'; g.lineWidth = o.w || 5;
  g.beginPath();
  if (o.kind === 'open') { g.fillStyle = '#5a1a2a'; g.moveTo(46, 20); g.quadraticCurveTo(64, 40, 82, 20); g.quadraticCurveTo(64, 26, 46, 20); g.fill(); g.fillStyle = '#e07890'; g.beginPath(); g.ellipse(64, 30, 8, 3.5, 0, 0, Math.PI * 2); g.fill(); }
  else if (o.kind === 'o') { g.fillStyle = '#5a1a2a'; g.ellipse(64, 24, 9, 11, 0, 0, Math.PI * 2); g.fill(); }
  else if (o.kind === 'line') { g.moveTo(46, 25); g.quadraticCurveTo(64, 27, 82, 25); g.stroke(); }
  else if (o.kind === 'frown') { g.moveTo(44, 30); g.quadraticCurveTo(64, 18 - (o.smile || 0), 84, 30); g.stroke(); }
  else { g.moveTo(40, 22); g.quadraticCurveTo(64, 30 + (o.smile ?? 4), 88, 22); g.stroke(); }
  g.restore();
}
export function drawNose(g, o = {}) { g.save(); g.translate(128, 96); g.strokeStyle = o.color || 'rgba(170,100,110,.85)'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, 6); g.quadraticCurveTo(28, 18, 34, 24); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(40, 10, 2.2, 0, 7); g.fill(); g.restore(); }
export function drawBlush(g, o = {}) { g.save(); g.translate(192, 96); const gr = g.createRadialGradient(32, 16, 2, 32, 16, 28); gr.addColorStop(0, o.color || 'rgba(255,130,160,.55)'); gr.addColorStop(1, 'rgba(255,130,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 32); if (o.lines !== false) { g.strokeStyle = 'rgba(255,110,140,.5)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(20 + i * 9, 20); g.lineTo(26 + i * 9, 11); g.stroke(); } } g.restore(); }
