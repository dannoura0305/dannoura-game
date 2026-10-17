// フェーズ 4 の見た目：戸と門（インスタンス・材質ごとに 1 回の描画）・敵の「異形」（自作の手続きの形・5 回の描画）・窓から差す光の筋（1 回）。
// 動き（開け具合・位置）は mapkit/game/*.js が決め、ここは毎フレーム行列を写すだけ。three.js を使う。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { panelPoses } from '../game/doors.js';

const D2R = Math.PI / 180;
/** 箱（底の中心が原点・UV＝m） */
function bx(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, ay > 0.5 ? p.getX(i) : ax > 0.5 ? p.getZ(i) : p.getX(i), ay > 0.5 ? p.getZ(i) : p.getY(i)); }
  return g.translate(x, y + h / 2, z);
}
/** 戸の板 1 枚（幅 1・高さ 1 の単位。実際の幅・高さは行列の大きさで伸ばす）：枠／面／格子（障子だけ） */
function panelGeos() {
  const W = 0.93, H = 1.8, sw = 0.05 / W, rh = 0.05 / H, t = 0.035;   // 名目の大きさ（UV の m を合わせるため）
  const frame = mergeGeometries([bx(sw, 1, t, -0.5 + sw / 2), bx(sw, 1, t, 0.5 - sw / 2), bx(1, rh, t, 0, 0), bx(1, rh * 1.4, t, 0, 1 - rh * 1.4), bx(1, rh * 0.7, t, 0, 0.32)]);
  const lattice = [];
  for (let k = 1; k < 3; k++) lattice.push(bx(0.012 / W, 1, t * 0.7, -0.5 + k / 3));
  for (let k = 1; k < 7; k++) lattice.push(bx(1, 0.012 / H, t * 0.7, 0, 0.32 + k * (0.68 / 7)));
  const frameShoji = mergeGeometries([frame.clone(), ...lattice]);
  const face = bx(1, 1, t * 0.4); { const uv = face.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W, uv.getY(i) * H); }
  return { frame, frameShoji, face };
}

export class DoorMeshes {
  /** doors：DoorSet。bank：AssetBank（材質）。灰色の時は bank が無い */
  constructor(scene, doors, bank, P) {
    this.doors = doors; this.scene = scene; this.meshes = {};
    const G = panelGeos(), n = Math.max(1, doors.list.length * 2);
    const mat = (id, fallback, opt = {}) => (bank && bank.has(id) ? bank.material(id, opt) : new THREE.MeshStandardMaterial({ color: fallback, roughness: 0.9 }));
    const wood = mat('mat.wood.cedar', 0x6e5641, { tangents: false }), planks = mat('mat.wood.planks_silver', 0x8a8580);
    const shoji = mat('mat.paper.shoji', 0xd8d2c0, { double: true });
    const fusuma = (bank && bank.has('mat.paper.shoji') ? bank.material('mat.paper.shoji') : shoji).clone(); fusuma.alphaTest = 0; fusuma.transparent = false; fusuma.side = THREE.DoubleSide; fusuma.color = new THREE.Color(0.62, 0.55, 0.43); fusuma.name = 'fusuma';
    const mk = (key, geo, m, cast = true) => { const im = new THREE.InstancedMesh(geo, m, n); im.count = 0; im.visible = false; im.frustumCulled = false; im.castShadow = !!P.shadows && cast; im.receiveShadow = !!P.shadows; im.name = 'door:' + key; scene.add(im); this.meshes[key] = im; return im; };
    mk('frame', G.frame, wood); mk('frameShoji', G.frameShoji, wood); mk('planks', G.face, planks); mk('shoji', G.face, shoji, false); mk('fusuma', G.face, fusuma);
    // 門の柱（動かない）：1 つの網
    const posts = [];
    for (const d of doors.list) for (const p of d.posts || []) posts.push(bx(0.16, d.height + 0.25, 0.16).rotateY(d.rotY * D2R).translate(p[0], p[1], p[2]), bx(0.24, 0.06, 0.24).rotateY(d.rotY * D2R).translate(p[0], p[1] + d.height + 0.25, p[2]));
    if (posts.length) { const m = new THREE.Mesh(mergeGeometries(posts), wood); m.castShadow = m.receiveShadow = !!P.shadows; m.name = 'door:posts'; scene.add(m); }
    this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.S = new THREE.Vector3(); this.V = new THREE.Vector3(); this.last = '';
  }
  /** 柵（門の両側）を部品の柵（prop.fence）で描く：kits（KitSet）に足す物の一覧 */
  fenceItems() {
    const out = [];
    for (const d of this.doors.list) for (const w of d.wings || []) {
      // 柵の部品（2.05m）を 2m 前後の区切りで並べる（1 本を伸ばすと板が間延びする）
      const n = Math.max(1, Math.round(w.len / 2.05)), seg = w.len / n, r = w.rotY * D2R, ux = Math.cos(r), uz = -Math.sin(r);
      for (let k = 0; k < n; k++) {
        const off = -w.len / 2 + seg * (k + 0.5), x = w.c[0] + ux * off, z = w.c[2] + uz * off;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, w.c[1], z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r), new THREE.Vector3(seg / 2.05, 1, 1));
        out.push({ matrix: m, variant: k, x, y: w.c[1] + 0.5, z, r: seg });
      }
    }
    return out;
  }
  update() {
    const key = this.doors.digest(); if (key === this.last) return; this.last = key;
    const cnt = { frame: 0, frameShoji: 0, planks: 0, shoji: 0, fusuma: 0 }, M = this.M, Q = this.Q;
    for (const d of this.doors.list) for (const p of panelPoses(d, d.open)) {
      Q.setFromAxisAngle(this.V.set(0, 1, 0), p.rotY * D2R); M.compose(this.V.set(p.x, p.y, p.z), Q, this.S.set(p.w, p.h, 1));
      const fk = d.kind === 'shoji' ? 'frameShoji' : 'frame', face = d.kind === 'shoji' ? 'shoji' : d.kind === 'fusuma' ? 'fusuma' : 'planks';
      this.meshes[fk].setMatrixAt(cnt[fk]++, M); this.meshes[face].setMatrixAt(cnt[face]++, M);
    }
    for (const [k, im] of Object.entries(this.meshes)) { im.count = cnt[k]; im.visible = cnt[k] > 0; im.instanceMatrix.needsUpdate = true; }
  }
}

/** 敵の「異形」：痩せた背の高い人の形（2.3m）・長い腕・前かがみ・顔のない頭・裾の裂けた衣。自作（手続き）＝license own。描画 5 回（胴・腕 2・脚 2） */
export class EnemyMesh {
  constructor(scene, P) {
    const col = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
    const skin = [0.36, 0.37, 0.38], cloth = [0.05, 0.05, 0.055], dark = [0.02, 0.02, 0.02];
    // 衣：裾がぎざぎざの筒
    const robe = new THREE.CylinderGeometry(0.17, 0.3, 1.25, 14, 4, true), rp = robe.attributes.position;
    for (let i = 0; i < rp.count; i++) { const y = rp.getY(i), a = Math.atan2(rp.getZ(i), rp.getX(i)); if (y < -0.6) rp.setY(i, y - 0.12 * Math.abs(Math.sin(a * 5.0)) - 0.08 * Math.abs(Math.sin(a * 11))); rp.setX(i, rp.getX(i) * (1 + 0.06 * Math.sin(y * 9 + a * 3))); }
    robe.computeVertexNormals();
    const head = new THREE.SphereGeometry(0.13, 14, 10).scale(0.85, 1.35, 0.95);
    const hp = head.attributes.position; for (let i = 0; i < hp.count; i++) if (hp.getZ(i) > 0.07 && Math.abs(hp.getY(i)) < 0.06) hp.setZ(i, hp.getZ(i) - 0.035);   // 目のあたりがくぼむ
    head.computeVertexNormals();
    const body = mergeGeometries([
      col(robe.translate(0, 1.05, 0), cloth),
      col(new THREE.CapsuleGeometry(0.15, 0.55, 4, 10).scale(1.15, 1, 0.75).translate(0, 1.72, 0), cloth),
      col(new THREE.CylinderGeometry(0.045, 0.06, 0.32, 8).rotateX(0.5).translate(0, 2.08, 0.08), skin),
      col(head.rotateZ(0.32).rotateX(0.25).translate(0.04, 2.27, 0.2), skin),
      col(new THREE.SphereGeometry(0.03, 6, 5).translate(-0.03, 2.27, 0.31), dark), col(new THREE.SphereGeometry(0.03, 6, 5).translate(0.08, 2.29, 0.3), dark),
    ]);
    const arm = s => mergeGeometries([col(new THREE.CapsuleGeometry(0.045, 0.62, 3, 6).translate(0, -0.36, 0), cloth), col(new THREE.CapsuleGeometry(0.035, 0.6, 3, 6).translate(0, -1.0, 0.03), skin),
      ...[0, 1, 2, 3].map(k => col(new THREE.CapsuleGeometry(0.011, 0.17, 2, 4).rotateZ((k - 1.5) * 0.18 * s).translate((k - 1.5) * 0.022, -1.42, 0.04), skin))]);
    const leg = () => mergeGeometries([col(new THREE.CapsuleGeometry(0.06, 0.62, 3, 6).translate(0, -0.38, 0), cloth), col(new THREE.CapsuleGeometry(0.045, 0.5, 3, 6).translate(0, -0.9, 0), skin), col(new THREE.BoxGeometry(0.09, 0.05, 0.24).translate(0, -1.18, 0.06), skin)]);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.4 });
    this.g = new THREE.Group(); this.g.name = 'enemy';
    this.root = new THREE.Group(); this.g.add(this.root);
    const mesh = (geo, x, y, z, cast = false) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = !!P.shadows && cast; this.root.add(o); return o; };   // 影は胴だけ（描画の呼び出しを増やさない）
    this.body = mesh(body, 0, 0, 0, true); this.armL = mesh(arm(1), -0.24, 1.92, 0.05); this.armR = mesh(arm(-1), 0.24, 1.92, 0.05);
    this.legL = mesh(leg(), -0.1, 1.2, 0); this.legR = mesh(leg(), 0.1, 1.2, 0);
    scene.add(this.g); this.phase = 0; this.last = null; this.t = 0;
  }
  /** 位置・向き・状態から姿勢を付ける */
  update(dt, enemy) {
    this.t += dt;
    const [x, y, z] = enemy.pos, moved = this.last ? Math.hypot(x - this.last[0], z - this.last[2]) : 0; this.last = [x, y, z];
    this.g.position.set(x, y, z); this.g.rotation.y = enemy.yaw;
    const chase = enemy.state === 'chase', sp = dt > 0 ? moved / dt : 0;
    this.phase += moved * (chase ? 2.2 : 2.6);
    const s = Math.sin(this.phase), amp = Math.min(1, sp / 1.2);
    this.legL.rotation.x = s * 0.55 * amp; this.legR.rotation.x = -s * 0.55 * amp;
    this.armL.rotation.x = -s * 0.35 * amp + (chase ? -0.5 : 0.08); this.armR.rotation.x = s * 0.35 * amp + (chase ? -0.5 : 0.08);
    this.armL.rotation.z = -0.06 + Math.sin(this.t * 1.3) * 0.04; this.armR.rotation.z = 0.06 - Math.sin(this.t * 1.1) * 0.04;
    this.root.rotation.x = chase ? 0.32 : 0.16;   // 前かがみ
    // ときどき首がひきつる（決まった間隔）
    const tw = Math.max(0, Math.sin(this.t * 0.9) - 0.93) * 6; this.body.rotation.z = Math.sin(this.t * 37) * 0.04 * tw;
    this.root.position.y = Math.abs(s) * 0.04 * amp;
  }
  set visible(v) { this.g.visible = v; }
}

/**
 * 窓・扉・屋根の穴から差す光の筋（日の向きに沿った箱・加算・霧なし・奥ほど薄い）。家の中だけで目立つ。1 回の描画。
 * layout の建物の部品：壁の下の段（窓の下）の上＝窓。日が当たる向きの窓だけ
 */
export function lightShafts(scene, layout, sunDir, P) {
  const geos = [], to = sunDir.clone().negate();   // 光の進む向き
  const add = (cx, cy, cz, w, h, nIn, len) => {
    if (to.dot(nIn) < 0.08) return;
    const g = new THREE.BoxGeometry(w, h, len, 1, 1, 6).translate(0, 0, len / 2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), to);
    g.applyQuaternion(q).translate(cx, cy, cz);
    const p = g.attributes.position, a = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const d = new THREE.Vector3(p.getX(i) - cx, p.getY(i) - cy, p.getZ(i) - cz).dot(to); a[i] = Math.max(0, 1 - d / len); }
    g.setAttribute('fade', new THREE.BufferAttribute(a, 1)); g.deleteAttribute('uv'); g.deleteAttribute('normal');
    geos.push(g.index ? g.toNonIndexed() : g);
  };
  for (const b of layout.buildings) {
    if (!/jp_house/.test(b.kind)) continue;
    for (const p of b.parts) {
      if (p.type === 'wall' && /lo$/.test(p.id)) {   // 窓：下の段の上の 0.8m
        const pr = (p.rotY || 0) * D2R, along = p.size[0] >= p.size[2], len = Math.max(p.size[0], p.size[2]);
        const n = along ? new THREE.Vector3(Math.sin(pr), 0, Math.cos(pr)) : new THREE.Vector3(Math.cos(pr), 0, -Math.sin(pr));
        const toC = new THREE.Vector3(b.at[0] - p.c[0], 0, b.at[2] - p.c[2]); if (n.dot(toC) < 0) n.negate();   // 家の中向き
        add(p.c[0], p.c[1] + p.size[1] / 2 + 0.4, p.c[2], len * 0.9, 0.7, n, 3.2);
      }
    }
  }
  if (!geos.length) return null;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(1.0, 0.72, 0.45).multiplyScalar(P.post ? 0.55 : 0.4) } },
    vertexShader: `attribute float fade; varying float vF; varying vec3 vW; void main(){ vF = fade; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uCol; varying float vF; varying vec3 vW;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){ float dust = 0.75 + 0.25 * sin(vW.x * 3.1 + vW.y * 4.7 + uTime * 0.6) * sin(vW.z * 2.3 - uTime * 0.4);
        float a = vF * vF * 0.16 * dust; gl_FragColor = vec4(uCol * a, 1.0); }`,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  mat.toneMapped = false;
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat); mesh.name = 'shafts'; mesh.renderOrder = 5; scene.add(mesh);
  return mesh;
}
