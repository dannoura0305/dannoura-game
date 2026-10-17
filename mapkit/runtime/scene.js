// 山の廃村の場面（three.js）：フェーズ 3＝写実寄り（PBR の材質・部品・夕暮れの空と高さの霧・影・下草・揺れ・落ち葉・後処理）。
// 素材は共有素材ライブラリ（wakaba-assets/catalog.json の web の門が pass の物）から読む。無い素材は灰色の箱（フェーズ 2 の形）のまま描く。
// 当たり・歩き・目的地は layout のまま（このファイルは見た目だけ）。描画呼び出しは段の上限（スマホの段 ≤ 120）の中に収める（play_map.mjs が測る）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AssetBank } from '../render/assets.js';
import { KitSet, objectMatrix } from '../render/kit.js';
import { buildBuildings } from '../render/buildings.js';
import { buildTerrainGeometry, buildTerrainMaterial, treeDensity } from '../render/terrain.js';
import { GroundCover, fallingLeaves } from '../render/foliage.js';
import { sunDirs, installHeightFog, makeSky, makeEnvironment, makeLights } from '../render/atmosphere.js';
import { windUniforms } from '../render/wind.js';
import { Post } from '../render/post.js';

const MAT_COL = { plaster: 0xb7b1a5, wood: 0x6e5641, roof: 0x3b3f47, stone: 0x8d8b86, tatami: 0xa3a172, earth: 0x6b5947, torii: 0xa8402e };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export async function buildScene({ layout, hf, spec, P, canvas, onProgress = () => {} }) {
  const t0 = performance.now(), timing = {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: P.antialias && !P.post, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2) * P.resScale);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = !!P.shadows; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), atm = spec.atmosphere || {}, fogCol = new THREE.Color(atm.fog?.color || '#6a6f7a').multiplyScalar(0.9);
  const fogD = (atm.fog?.density ?? 0.02) * 0.5;
  const sun = sunDirs(atm);
  const [lo] = hf.extent(), village = (layout.buildings.find(b => /jp_house/.test(b.kind)) || { padY: lo + 8 }).padY;
  installHeightFog({ k: atm.fog?.heightFalloff ?? 0.08, base: village, sunDir: sun.sky });
  scene.fog = new THREE.FogExp2(fogCol, fogD);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, Math.min(P.far, 3.6 / fogD));
  // 空・環境光・光
  const sky = makeSky(sun.sky, fogCol); scene.add(sky); scene.userData.sky = sky;
  if (P.envMap) { scene.environment = makeEnvironment(renderer, sky); scene.environmentIntensity = 0.9; }
  const { sun: sunL, hemi } = makeLights(scene, sun.light, P);
  timing.atmosphere = Math.round(performance.now() - t0);
  // 素材
  const bank = new AssetBank(renderer, P, { onProgress });
  await bank.loadCatalog();
  const real = bank.has('mat.ground.forest_floor');
  // 先に読み始める（画像の展開・glb の読み込みと、下の CPU の計算を重ねる）
  const terrainMatP = real ? buildTerrainMaterial(bank, P) : Promise.resolve(new THREE.MeshLambertMaterial({ color: 0x55603a }));
  for (const k of new Set(layout.objects.map(o => o.kind))) bank.kit(k);
  for (const k of ['bld.jp_house.wall_panel', 'bld.jp_house.post', 'bld.jp_house.roof_ridge', 'veg.grass', 'veg.fern']) bank.kit(k);
  // ── 地形
  const tg = buildTerrainGeometry(hf, layout, P.terrainStep);
  timing.terrainGeo = Math.round(performance.now() - t0);
  const terrainMat = await terrainMatP;
  const terrain = new THREE.Mesh(tg, terrainMat); terrain.receiveShadow = true; terrain.name = 'terrain'; scene.add(terrain);
  timing.terrain = Math.round(performance.now() - t0);
  // ── 建物・部品
  const kits = new KitSet(scene, bank, P);
  const useKit = bank.has('bld.jp_house.wall_panel');
  if (useKit) {
    const B = buildBuildings(layout);
    for (const [mid, g] of Object.entries(B.geometries)) {
      const mesh = new THREE.Mesh(g, bank.material(mid, { vc: true })); mesh.castShadow = mesh.receiveShadow = !!P.shadows; mesh.name = 'bld:' + mid; scene.add(mesh);
    }
    for (const [id, items] of Object.entries(B.kitItems)) kits.add(id, items, { cull: id.endsWith('.post') || id.endsWith('wall_panel') ? 160 : 120 });
  } else grayBuildings(scene, layout, P);
  // 物（木・岩・小物・飾り）
  const byKind = {};
  for (const o of layout.objects) (byKind[o.kind] = byKind[o.kind] || []).push(o);
  for (const [kind, list] of Object.entries(byKind)) {
    const tree = /^veg\.tree/.test(kind);
    kits.add(kind, list.map(o => ({ matrix: objectMatrix(o), variant: hash(o.id) % 7, x: o.at[0], y: o.at[1] + o.size[1] / 2, z: o.at[2], r: Math.max(o.size[0], o.size[1], o.size[2]) / 2 })), { cull: tree ? P.treeFar : kind === 'prop.utility_pole' ? 200 : 110 });
  }
  // 遠景の木（見た目だけ）：坂 41° を超える所（操作が入れない＝当たりが要らない）に、木の素材を足す。layout には入れない（UE5 版は Landscape の草木で）
  if (P.bgTrees !== false) for (const [kind, items] of Object.entries(backgroundTrees(hf, layout))) kits.add(kind, items, { cull: P.treeFar });
  await kits.build(s => grayObjects(scene, s, P));
  timing.kits = Math.round(performance.now() - t0);
  // 下草・落ち葉・電線
  const trees = treeDensity(layout);
  const cover = await new GroundCover(scene, layout, hf, P, trees).build(bank);
  const leaves = fallingLeaves(scene, P.leaves);
  wires(scene, layout);
  // ── 人・懐中電灯・道案内の線と目的地の柱
  const player = new THREE.Group();
  // 人（仮の形・写実の段でも浮かないよう布と肌の色・脚・腕・荷物）。キャラクターは charkit の担当（フェーズ 4 以降）
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2c333f, roughness: 0.88 }), pants = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: 0xb08a72, roughness: 0.6 }), pack = new THREE.MeshStandardMaterial({ color: 0x3a3a2c, roughness: 0.9 }), hair = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.7 });
  const parts = [
    [new THREE.CapsuleGeometry(0.2, 0.42, 4, 12).scale(1, 1, 0.75).translate(0, 1.18, 0), cloth],
    [new THREE.CapsuleGeometry(0.085, 0.62, 4, 8).translate(-0.1, 0.43, 0), pants], [new THREE.CapsuleGeometry(0.085, 0.62, 4, 8).translate(0.1, 0.43, 0), pants],
    [new THREE.CapsuleGeometry(0.06, 0.5, 4, 8).rotateZ(0.12).translate(-0.27, 1.12, 0.02), cloth], [new THREE.CapsuleGeometry(0.06, 0.5, 4, 8).rotateZ(-0.12).translate(0.27, 1.12, 0.02), cloth],
    [new THREE.SphereGeometry(0.115, 16, 12).scale(0.92, 1.05, 1).translate(0, 1.62, 0.01), skin], [new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.64, -0.01), hair],
    [new THREE.BoxGeometry(0.32, 0.4, 0.16).translate(0, 1.18, -0.21), pack], [new THREE.BoxGeometry(0.11, 0.06, 0.26).translate(0, 0.06, 0.05).translate(-0.1, 0, 0), pants], [new THREE.BoxGeometry(0.11, 0.06, 0.26).translate(0.1, 0.06, 0.05), pants],
  ];
  const byM = new Map(); for (const [g, m] of parts) { if (!byM.has(m)) byM.set(m, []); byM.get(m).push(g.index ? g.toNonIndexed() : g); }
  for (const [m, gs] of byM) { const mesh = new THREE.Mesh(mergeGeometries(gs.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })), m); mesh.castShadow = !!P.shadows; player.add(mesh); }   // 材質ごとに 1 つ（描画 5 回）
  scene.add(player);
  const hand = new THREE.Group(); scene.add(hand);
  const flash = new THREE.SpotLight(0xfff0d8, 30, 30, 0.5, 0.5, 1.6); flash.position.set(0.2, 1.35, 0.1); flash.target.position.set(0, 0.8, 6); hand.add(flash, flash.target);
  const routeGeo = new THREE.BufferGeometry(); routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(200 * 3), 3)); routeGeo.setDrawRange(0, 0);
  const route = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.7, fog: false })); route.frustumCulled = false; scene.add(route);
  const beams = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 30, 8, 1, true).translate(0, 15, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, fog: false }), layout.goals.length);
  scene.add(beams);
  // 後処理
  const post = P.post ? new Post(renderer, P) : null;
  onProgress(bank.done, bank.pending, '材質の読み込みを待っています');
  await bank.ready();
  timing.textures = Math.round(performance.now() - t0);
  // シェーダーを先に作る（最初のフレームで止まらない）
  // 隠れている組（数 0）も一度だけ見える扱いにして作る＝家に入った時などに止まらない
  const hidden = []; scene.traverse(o => { if ((o.isInstancedMesh || o.isMesh) && !o.visible) { hidden.push([o, o.count]); o.visible = true; if (o.isInstancedMesh) o.count = 1; } });
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
  const fc = []; scene.traverse(o => { if (o.isMesh && o.frustumCulled) { fc.push(o); o.frustumCulled = false; } });
  // 本当の 1 回（影の網の材質なども作られる）。後処理がある段は HDR の絵（トーンマップなし＝別のシェーダー）に描く
  if (post) post.setSize(64, 64);
  renderer.setRenderTarget(post ? post.main : null); renderer.render(scene, camera); renderer.setRenderTarget(null);
  for (const o of fc) o.frustumCulled = true;
  for (const [o, c] of hidden) { o.visible = false; if (o.isInstancedMesh) o.count = c; }
  kits.update(camera, true); cover.update(camera);
  timing.compile = Math.round(performance.now() - t0);
  const far = camera.far, clock = { t: 0 };
  const S = {
    renderer, scene, camera, terrain, player, hand, flash, route, beams, sunL, hemi, fogD, bank, kits, cover, leaves, post, timing, sunDir: sun.light,
    setFog(on) { scene.fog.density = on ? fogD : 0; camera.far = on ? far : 1600; camera.updateProjectionMatrix(); },
    /** 影の箱を人に合わせる（日の向きは変えない） */
    sunFollow(x, y, z) { const R = (P.shadowRange || 40) * 0.5; const s = 150; sunL.target.position.set(x + R * 0, y, z); sunL.position.copy(sunL.target.position).addScaledVector(sun.light, s); },
    setSize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (post) post.setSize(w, h); },
    /** 1 フレーム描く → { calls, triangles } */
    draw(dt = 0) {
      clock.t += dt; windUniforms.uWindTime.value = clock.t; sky.material.uniforms.uTime.value = clock.t;
      sky.position.copy(camera.position); sky.scale.setScalar(camera.far * 0.9);
      kits.update(camera); cover.update(camera);
      if (post) { const r = post.render(scene, camera); return { calls: r.calls, triangles: r.tris, sceneCalls: r.sceneCalls }; }
      renderer.render(scene, camera); return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, sceneCalls: renderer.info.render.calls };
    },
    texMB: () => bank.texMB,
  };
  return S;
}

/** 遠景の木の置き場所（4.5m の格子＋ずらし・坂 41〜62°・近くの木から 3m 以上）。決まった並び（乱数なし・位置のハッシュ） */
export function backgroundTrees(hf, layout) {
  const out = { 'veg.tree.sugi': [], 'veg.tree.broadleaf': [] }, trees = layout.objects.filter(o => o.cls === 'tree'), fr = v => v - Math.floor(v);
  const h = (x, z, k) => fr(Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453);
  const W = layout.size[0], D = layout.size[1];
  for (let z = 3; z < D - 3; z += 4.5) for (let x = 3; x < W - 3; x += 4.5) {
    const X = x + (h(x, z, 1) - 0.5) * 3, Z = z + (h(x, z, 2) - 0.5) * 3;
    const s = Math.min(hf.slopeDeg(X, Z), hf.slopeDeg(X + 1, Z), hf.slopeDeg(X - 1, Z), hf.slopeDeg(X, Z + 1), hf.slopeDeg(X, Z - 1));
    if (s < 41 || s > 62) continue;
    if (trees.some(t => Math.abs(t.at[0] - X) < 3 && Math.abs(t.at[2] - Z) < 3)) continue;
    const sugi = h(x, z, 3) < 0.72, sc = 0.75 + h(x, z, 4) * 0.5, y = Math.min(hf.at(X, Z), hf.at(X + 0.4, Z), hf.at(X - 0.4, Z), hf.at(X, Z + 0.4), hf.at(X, Z - 0.4));
    const o = { id: `bg#${x},${z}`, at: [X, y - 0.1, Z], rotY: h(x, z, 5) * 360, scale: sc, size: sugi ? [4.4 * sc, 14 * sc, 4.4 * sc] : [6 * sc, 9 * sc, 6 * sc] };
    out[sugi ? 'veg.tree.sugi' : 'veg.tree.broadleaf'].push({ matrix: objectMatrix(o), variant: 0, x: X, y: y + o.size[1] / 2, z: Z, r: o.size[1] / 2 });
  }
  return out;
}

/** 電柱の間の電線（たるみ・3 本）。電柱は道に沿って置いた順（layout の id の順） */
function wires(scene, layout) {
  const poles = layout.objects.filter(o => o.kind === 'prop.utility_pole'), pts = [];
  for (let i = 0; i + 1 < poles.length; i++) {
    const a = poles[i], b = poles[i + 1]; if (Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]) > 50) continue;
    for (const x of [-0.55, 0, 0.55]) {
      const pa = new THREE.Vector3(x, 7.72, 0).applyMatrix4(objectMatrix(a)), pb = new THREE.Vector3(x, 7.72, 0).applyMatrix4(objectMatrix(b)), n = 14;
      for (let k = 0; k < n; k++) for (const t of [k / n, (k + 1) / n]) { const p = pa.clone().lerp(pb, t); p.y -= Math.sin(Math.PI * t) * 0.9; pts.push(p.x, p.y, p.z); }
    }
  }
  if (!pts.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x15130f })); l.name = 'wires'; scene.add(l); return l;
}

/** 素材が無い時：フェーズ 2 の灰色の箱の建物 */
function grayBuildings(scene, layout, P) {
  const byMat = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const b of layout.buildings) for (const p of b.parts) {
    if (p.visible === false) continue;
    let g = p.shape === 'cyl' ? new THREE.CylinderGeometry(p.size[0] / 2, p.size[0] / 2 * 1.08, p.size[1], 10) : new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
    e.set((p.tilt || 0) * Math.PI / 180, (p.rotY || 0) * Math.PI / 180, 0, 'YXZ'); q.setFromEuler(e); m4.compose(new THREE.Vector3(...p.c), q, new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m4);
    g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); (byMat[p.mat] = byMat[p.mat] || []).push(g);
  }
  for (const [mat, list] of Object.entries(byMat)) { const mesh = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ color: MAT_COL[mat] ?? 0x999999 })); mesh.castShadow = mesh.receiveShadow = !!P.shadows; scene.add(mesh); }
}
/** 素材が無い部品：灰色の箱（大きさ＝仮の形） */
function grayObjects(scene, s, P) {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0x8a8580 }), s.items.length);
  s.items.forEach((it, i) => im.setMatrixAt(i, it.matrix)); im.castShadow = !!P.shadows; scene.add(im);
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
