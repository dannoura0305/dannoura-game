// 灰色の箱の場面（three.js）：地形の網（頂点の色＝傾き・高さ・道）、建物（材質ごとに 1 つへまとめる）、木・岩・小物・草（インスタンス）、
// 夕暮れの空・霧・光、道案内の線と目的地の柱、人（カプセル）、懐中電灯。描画呼び出しを少なく（スマホの段で ≤ 120）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { unb64 } from '../pcg/scatter.js';
import { nearestOnPath } from '../pcg/paths.js';

const MAT_COL = { plaster: 0xb7b1a5, wood: 0x6e5641, roof: 0x3b3f47, stone: 0x8d8b86, tatami: 0xa3a172, earth: 0x6b5947, torii: 0xa8402e };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildScene({ layout, hf, spec, P, canvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: P.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * P.resScale);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = !!P.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), atm = spec.atmosphere || {}, fogCol = new THREE.Color(atm.fog?.color || '#6a6f7a');
  const fogD = (atm.fog?.density ?? 0.02) * 0.6;                     // 仕様の霧（高さの霧の前提）→ 距離の霧に直す係数 0.6（フェーズ 3 で高さの霧に）
  scene.fog = new THREE.FogExp2(fogCol, fogD); scene.background = fogCol.clone();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, Math.min(P.far, 3.2 / fogD));
  // 空（夕暮れのグラデーション・西が明るい）
  const elev = (atm.sunElevDeg ?? 4) * Math.PI / 180, sunDir = new THREE.Vector3(-Math.cos(elev), Math.sin(elev), -0.25).normalize();
  {
    const g = new THREE.SphereGeometry(900, 24, 12), c = [], pos = g.attributes.position, top = new THREE.Color(0x2a2f4a), hor = new THREE.Color(0x8a7486), sun = new THREE.Color(0xe08a4a), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).normalize(); const h = Math.max(0, v.y), col = hor.clone().lerp(top, Math.pow(h, 0.6)); col.lerp(sun, Math.pow(Math.max(0, v.dot(sunDir)), 6) * (1 - h)); c.push(col.r, col.g, col.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky); scene.userData.sky = sky;
  }
  // 光：夕日（低い・橙）＋空の光（紫〜茶）
  scene.add(new THREE.HemisphereLight(0x9aa2c8, 0x463a2e, 1.7));
  const sunL = new THREE.DirectionalLight(0xffa060, 1.6); sunL.position.copy(sunDir).multiplyScalar(120); scene.add(sunL); scene.add(sunL.target);
  if (P.shadows) { sunL.castShadow = true; sunL.shadow.mapSize.set(P.shadowSize, P.shadowSize); const s = sunL.shadow.camera; s.left = s.bottom = -45; s.right = s.top = 45; s.near = 1; s.far = 300; sunL.shadow.bias = -0.0008; sunL.shadow.normalBias = 0.04; }
  // ── 地形の網
  const step = P.terrainStep, nx = Math.floor((hf.nx - 1) / step) + 1, nz = Math.floor((hf.nz - 1) / step) + 1, cell = hf.cell * step;
  const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), idx = [];
  const cGrass = new THREE.Color(0x4f6234), cGrass2 = new THREE.Color(0x6b6a3c), cRock = new THREE.Color(0x77736c), cDirt = new THREE.Color(0x7a6448), cMoss = new THREE.Color(0x56603c), tmp = new THREE.Color();
  const pathD = (x, z) => { let best = Infinity; for (const p of layout.paths) { const q = nearestOnPath(p.points, x, z); best = Math.min(best, q.d - p.width / 2); } return best; };
  const pads = layout.buildings.map(b => b.obb);
  const [lo, hi] = hf.extent();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = i * cell, z = j * cell, k = j * nx + i, y = hf.at(x, z), n = hf.normal(x, z), s = hf.slopeDeg(x, z), t = (y - lo) / (hi - lo + 1e-6);
    pos.set([x, y, z], k * 3); nor.set(n, k * 3);
    tmp.copy(cGrass).lerp(cGrass2, smooth(0.15, 0.7, t)).lerp(cMoss, smooth(18, 32, s)).lerp(cRock, smooth(30, 42, s));
    const pd = pathD(x, z); if (pd < 1.2) tmp.lerp(cDirt, 1 - smooth(-0.3, 1.2, pd));
    for (const o of pads) { const dx = x - o.cx, dz = z - o.cz, c = Math.cos(o.rot), sn = Math.sin(o.rot), u = Math.abs(dx * c - dz * sn) - o.hx, v = Math.abs(dx * sn + dz * c) - o.hz; if (u < 0.8 && v < 0.8) tmp.lerp(cDirt, 0.55); }
    const nse = ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1; tmp.multiplyScalar(0.92 + nse * 0.12);
    col.set([tmp.r, tmp.g, tmp.b], k * 3);
  }
  for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setIndex(idx);
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true })); terrain.receiveShadow = true; scene.add(terrain);
  // ── 建物（材質ごとに 1 つ）
  const byMat = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const b of layout.buildings) for (const p of b.parts) {
    if (p.visible === false) continue;
    let g;
    if (p.shape === 'cyl') g = new THREE.CylinderGeometry(p.size[0] / 2, p.size[0] / 2 * 1.08, p.size[1], 10);
    else if (p.shape === 'gable') { const w = p.size[0], h = p.size[1], d = p.size[2], s = new THREE.Shape(); s.moveTo(-d / 2, -h / 2); s.lineTo(d / 2, -h / 2); s.lineTo(0, h / 2); s.closePath(); g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2); }
    else g = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
    e.set((p.tilt || 0) * Math.PI / 180, (p.rotY || 0) * Math.PI / 180, 0, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(...p.c), q, new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m4);
    g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed();
    (byMat[p.mat] = byMat[p.mat] || []).push(g);
  }
  for (const [mat, list] of Object.entries(byMat)) {
    const mesh = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ color: MAT_COL[mat] ?? 0x999999, side: mat === 'roof' ? THREE.DoubleSide : THREE.FrontSide }));
    mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'bld.' + mat; scene.add(mesh);
  }
  // ── 物（インスタンス）
  const objs = layout.objects, inst = (geo, mat, list, f, shadow = true) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color();
    list.forEach((o, i) => { const r = f(o, i, V, Q, S, C); M.compose(V, Q, S); im.setMatrixAt(i, M); if (r) im.setColorAt(i, C); });
    im.castShadow = shadow && P.shadows; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); return im;
  };
  const yQ = (Q, deg) => Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * Math.PI / 180);
  const trees = objs.filter(o => o.cls === 'tree'), sugi = trees.filter(o => /sugi/.test(o.kind)), broad = trees.filter(o => !/sugi/.test(o.kind));
  const hsh = (o, k) => (((Math.sin(o.at[0] * 17.1 + o.at[2] * 31.7 + k) * 43758.5) % 1) + 1) % 1;
  inst(new THREE.CylinderGeometry(0.2, 0.32, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x4a3a2c }), trees, (o, i, V, Q, S, C) => { const h = o.size[1] * (/sugi/.test(o.kind) ? 0.55 : 0.45); V.set(...o.at); yQ(Q, o.rotY); S.set(o.col.r / 0.26, h + (o.embed || 0), o.col.r / 0.26); V.y -= o.embed * 0.5; });
  const cone = mergeGeometries([0, 1, 2].map(k => new THREE.ConeGeometry(1 - k * 0.24, 0.36, 8).translate(0, 0.42 + k * 0.17, 0)));
  inst(cone, new THREE.MeshLambertMaterial({ color: 0xffffff }), sugi, (o, i, V, Q, S, C) => { V.set(...o.at); yQ(Q, o.rotY); S.set(o.size[0] / 2, o.size[1], o.size[0] / 2); C.setHSL(0.33 + hsh(o, 1) * 0.05, 0.35, 0.16 + hsh(o, 2) * 0.06); return true; });
  inst(new THREE.IcosahedronGeometry(1, 1).translate(0, 0, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), broad, (o, i, V, Q, S, C) => { V.set(o.at[0], o.at[1] + o.size[1] * 0.62, o.at[2]); yQ(Q, o.rotY); S.set(o.size[0] / 2, o.size[1] * 0.36, o.size[0] / 2); C.setHSL(0.22 + hsh(o, 3) * 0.08, 0.38, 0.2 + hsh(o, 4) * 0.08); return true; });
  inst(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), objs.filter(o => o.cls === 'rock'), (o, i, V, Q, S, C) => { V.set(o.at[0], o.at[1] + o.size[1] / 2, o.at[2]); yQ(Q, o.rotY); S.set(o.size[0], o.size[1] * 1.1, o.size[2]); C.setHSL(0.1, 0.05, 0.36 + hsh(o, 5) * 0.12); return true; });
  const PROP = { 'prop.barrel': [new THREE.CylinderGeometry(0.3, 0.3, 0.85, 10), 0x6d4f36], 'prop.crate': [new THREE.BoxGeometry(0.7, 0.6, 0.7), 0x7c6346], 'prop.planks': [new THREE.BoxGeometry(1.8, 0.35, 0.7), 0x7f6a50], 'prop.debris': [new THREE.DodecahedronGeometry(0.6, 0).scale(1, 0.45, 0.85), 0x6a645c], 'prop.beam': [new THREE.BoxGeometry(2.4, 0.25, 0.25), 0x5a4532], 'prop.kamado': [new THREE.BoxGeometry(0.9, 0.75, 0.6), 0x8a7a6a], 'prop.tansu': [new THREE.BoxGeometry(1.0, 1.1, 0.45), 0x5e4230] };
  for (const [kind, [g, c]] of Object.entries(PROP)) inst(g, new THREE.MeshLambertMaterial({ color: c }), objs.filter(o => o.kind === kind), (o, i, V, Q, S) => { V.set(o.at[0], o.at[1] + o.size[1] / 2, o.at[2]); yQ(Q, o.rotY); S.set(1, 1, 1); });
  // 草（段で間引く）
  for (const I of layout.instances || []) {
    if (!P.grass) continue;
    const d = unb64(I.data), every = Math.max(1, Math.round(1 / P.grass)), list = [];
    for (let i = 0; i < d.length; i += 2 * every) list.push([d[i] / 100, d[i + 1] / 100]);
    const blade = mergeGeometries([0, 1, 2].map(k => new THREE.PlaneGeometry(0.12, 0.42).translate(0, 0.21, 0).rotateY(k * 2.1).translate(Math.cos(k * 2.1) * 0.08, 0, Math.sin(k * 2.1) * 0.08)));
    inst(blade, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), list, (p, i, V, Q, S, C) => { V.set(p[0], hf.at(p[0], p[1]) - 0.02, p[1]); yQ(Q, (i * 137.5) % 360); const s = 0.7 + ((i * 0.618) % 1) * 0.7; S.set(s, s, s); C.setHSL(0.26 + ((i * 0.37) % 1) * 0.06, 0.38, 0.2 + ((i * 0.71) % 1) * 0.07); return true; }, false);
  }
  // ── 人・懐中電灯・道案内の線・目的地の柱
  const player = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries([new THREE.CapsuleGeometry(0.28, 1.0, 4, 10).translate(0, 0.78, 0), new THREE.BoxGeometry(0.16, 0.1, 0.22).translate(0, 1.45, 0.25)]), new THREE.MeshLambertMaterial({ color: 0x8aa0c8 }));
  body.castShadow = !!P.shadows; player.add(body); scene.add(player);
  const hand = new THREE.Group(); scene.add(hand);                  // 懐中電灯は見ている向き（カメラの向き）に向ける
  const flash = new THREE.SpotLight(0xfff0d0, 26, 28, 0.55, 0.45, 1.5); flash.position.set(0.2, 1.35, 0.1); flash.target.position.set(0, 0.8, 6); hand.add(flash, flash.target);
  const routeGeo = new THREE.BufferGeometry(); routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(200 * 3), 3)); routeGeo.setDrawRange(0, 0);
  const route = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.85, fog: false })); route.frustumCulled = false; scene.add(route);
  const beams = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 8, 1, true).translate(0, 15, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false, fog: false }), layout.goals.length);
  scene.add(beams);
  const far = camera.far;
  return { renderer, scene, camera, terrain, player, hand, flash, route, beams, sunL, fogD, setFog(on) { scene.fog.density = on ? fogD : 0; camera.far = on ? far : 1600; camera.updateProjectionMatrix(); } };
}

/** 道案内の線と目的地の柱を更新 */
export function updateGuides(S, layout, nav, routePts) {
  const a = S.route.geometry.attributes.position, n = Math.min(200, routePts.length);
  for (let i = 0; i < n; i++) a.setXYZ(i, routePts[i][0], routePts[i][1] + 0.12, routePts[i][2]);
  a.needsUpdate = true; S.route.geometry.setDrawRange(0, n);
  const M = new THREE.Matrix4(), C = new THREE.Color();
  layout.goals.forEach((g, i) => {
    const done = nav.reached.has(g.id), cur = nav.goal && nav.goal.id === g.id;
    M.makeScale(cur ? 1.3 : 0.8, done ? 0.0001 : 1, cur ? 1.3 : 0.8).setPosition(g.at[0], g.at[1], g.at[2]); S.beams.setMatrixAt(i, M);
    S.beams.setColorAt(i, C.set(cur ? 0x7fe0ff : 0xffd27a));
  });
  S.beams.instanceMatrix.needsUpdate = true; if (S.beams.instanceColor) S.beams.instanceColor.needsUpdate = true;
}
