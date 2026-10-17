// 建物の見た目（写実）：配置（layout.buildings[].parts＝当たり・床の箱）はそのまま使い、見た目だけを部品（kit）と手続きの網で組む。
// 当たり・床・扉は layout のまま＝歩き・検査は変わらない（mapkit/core/world.js が parts を読む）。
// ・土壁（plaster の wall）：約 0.95m ごとの区画に分け、kit の土壁の区画（4 種：ひび・穴・大穴・小舞）を区画の幅・高さに伸ばして置く。区画の境に柱、上に桁・下に土台
// ・窓（壁の下の段 lo の上）：格子窓。扉：横に寄せた障子（開口は塞がない）と鴨居
// ・仕切り（wood の wall）・床（畳・板・土間）・天井・妻（gable）：手続きの網（UV＝m・部品の中の座標）
// ・屋根（傾いた roof）：細かく割った面をたわませ（傷みに比例）、瓦（苔・トタン）の上面・板の裏・破風。棟は kit の棟瓦を並べる
// ・祠：基壇・石段＝御影石の箱、本殿・屋根・鳥居・灯籠の箱は隠して kit の本殿・鳥居・灯籠を置く
// 返す物：{ meshes（材質ごとに 1 つにまとめた網）, kitItems: { <kit id>: [{ matrix, variant, x, y, z, r }] } }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const D2R = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0);
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return ((h >>> 0) % 100000) / 100000; };

/** 部品の箱 → 部品の中の座標の箱の網（UV＝m・grain＝木目の軸 'x'|'y'|'z'）。底の中心を原点にしない（中心が原点） */
function boxGeo(sx, sy, sz, grain = null, uvScale = 1) {
  const g = new THREE.BoxGeometry(sx, sy, sz), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    let u, v;
    if (ay > 0.5) { [u, v] = grain === 'z' ? [z, x] : [x, z]; }
    else if (ax > 0.5) { [u, v] = grain === 'y' ? [y, z] : [z, y]; }
    else { [u, v] = grain === 'y' ? [y, x] : [x, y]; }
    uv.setXY(i, u * uvScale, v * uvScale);
  }
  return g;
}

/** 屋根の面：x＝棟の向き（幅 w）・z＝流れ（長さ d）・厚さ th。sag＝たわみ（m）。上＝瓦・下＝板・縁＝破風 → { top, bottom, edge } */
function roofGeos(w, d, th, sag, seed) {
  const nx = Math.max(2, Math.ceil(w / 0.5)), nz = Math.max(2, Math.ceil(d / 0.3));
  const top = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2), bot = top.clone();
  const def = (g, y0) => {
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), fx = x / w + 0.5, fz = z / d + 0.5;
      const s = sag * Math.sin(Math.PI * fx) * Math.sin(Math.PI * Math.min(1, fz * 1.2)) + 0.025 * Math.sin(x * 2.3 + seed * 7) * Math.sin(z * 1.7 + seed * 3) * (sag > 0.05 ? 1 : 0.3);
      p.setY(i, y0 - s); uv.setXY(i, x, z);
    }
    g.computeVertexNormals();
  };
  def(top, th / 2); def(bot, -th / 2);
  const b = bot.index.array; for (let i = 0; i < b.length; i += 3) { const t = b[i + 1]; b[i + 1] = b[i + 2]; b[i + 2] = t; }   // 下向き
  bot.computeVertexNormals();
  const e = [boxGeo(w, th + 0.04, 0.05, 'x').translate(0, -0.01, d / 2), boxGeo(w, th + 0.04, 0.05, 'x').translate(0, -0.01, -d / 2), boxGeo(0.05, th + 0.06, d, 'z').translate(w / 2, -sag * 0.3, 0), boxGeo(0.05, th + 0.06, d, 'z').translate(-w / 2, -sag * 0.3, 0)];
  return { top, bottom: bot, edge: mergeGeometries(e) };
}

/** 三角柱（妻）：x＝厚さ・y＝高さ・z＝幅（底の中心が原点の上 h/2） */
function gableGeo(T, h, D) {
  const s = new THREE.Shape(); s.moveTo(-D / 2, -h / 2); s.lineTo(D / 2, -h / 2); s.lineTo(0, h / 2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }); g.translate(0, 0, -T / 2); g.rotateY(Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i), p.getY(i));
  return g;
}

export function buildBuildings(layout, opt = {}) {
  const geos = {}, kit = {}, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const addGeo = (mat, g, matrix, padY) => {
    g = g.index ? g.toNonIndexed() : g; g.applyMatrix4(matrix);
    // 頂点の色＝地面に近いほど暗い（泥はね・湿り）
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const k = 0.72 + 0.28 * Math.min(1, Math.max(0, (p.getY(i) - padY) / 0.9)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    (geos[mat] = geos[mat] || []).push(g);
  };
  const addKit = (id, pos, rotY, scale = [1, 1, 1], variant = 0, extraRot = null, r = 1.5) => {
    tmpQ.setFromAxisAngle(UP, rotY * D2R); if (extraRot) tmpQ.multiply(extraRot);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), tmpQ, new THREE.Vector3(...scale));
    (kit[id] = kit[id] || []).push({ matrix: m, variant, x: pos[0], y: pos[1], z: pos[2], r });
  };
  const partMatrix = p => { tmpQ.setFromEuler(new THREE.Euler((p.tilt || 0) * D2R, (p.rotY || 0) * D2R, 0, 'YXZ')); return tmpM.clone().compose(tmpP.set(...p.c), tmpQ.clone(), tmpS.set(1, 1, 1)); };
  const LAY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);     // 柱（y の向き）→ 梁（x の向き）
  const ARR = 'bld.jp_house';
  for (const b of layout.buildings) {
    const padY = b.padY, decay = b.decay || 0, house = /jp_house/.test(b.kind);
    const roofMat = decay >= 0.9 ? 'mat.roof.kawara_moss' : hash(b.id + 'roof') < 0.34 ? 'mat.metal.tin_rust' : decay >= 0.65 ? 'mat.roof.kawara_moss' : 'mat.roof.kawara';
    let ridgeY = -Infinity; const roofParts = [];
    for (const p of b.parts) {
      if (p.visible === false) continue;
      const [sx, sy, sz] = p.size, M = partMatrix(p), y0 = p.c[1] - sy / 2, rot = p.rotY || 0;
      const along = sx >= sz ? 'x' : 'z', len = Math.max(sx, sz), thick = Math.min(sx, sz);
      if (p.type === 'wall' && p.mat === 'plaster') {
        const n = Math.max(1, Math.round(len / 0.95)), bw = len / n, extraRot = along === 'z' ? new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2) : null;
        for (let k = 0; k < n; k++) {
          const off = -len / 2 + bw * (k + 0.5), lp = along === 'x' ? new THREE.Vector3(off, -sy / 2, 0) : new THREE.Vector3(0, -sy / 2, off);
          lp.applyMatrix4(M);
          const hv = hash(p.id + ':' + k), dv = Math.min(0.95, decay * (b.kind === 'jp_house_collapsed' ? 1.3 : 1));
          const variant = hv < 0.55 - dv * 0.35 ? 0 : hv < 0.78 - dv * 0.15 ? 1 : hv < 0.92 - dv * 0.05 ? 2 : 3;
          addKit(`${ARR}.wall_panel`, [lp.x, lp.y, lp.z], rot, [bw * 1.002, sy, thick / 0.12], variant, extraRot, Math.max(bw, sy));
        }
        // 柱（区画の境・端）：背の高い区画だけ
        if (sy > 1.2 && house) for (let k = 0; k <= n; k++) {
          const off = -len / 2 + bw * k, lp = along === 'x' ? new THREE.Vector3(off, -sy / 2, 0) : new THREE.Vector3(0, -sy / 2, off); lp.applyMatrix4(M);
          addKit(`${ARR}.post`, [lp.x, lp.y, lp.z], rot, [0.13 / 0.12, sy + 0.02, 0.19 / 0.12], 0, null, sy);
        }
        // 桁（上）・土台（下）・鴨居（下が開いている区画）
        const beam = (yy, h, d) => {   // 梁は柱の部品を横に倒して伸ばす（端から長さ len）
          const lp = (along === 'x' ? new THREE.Vector3(-len / 2 - 0.01, yy, 0) : new THREE.Vector3(0, yy, len / 2 + 0.01)).applyMatrix4(M);
          const q = along === 'z' ? new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2).multiply(LAY) : LAY;
          addKit(`${ARR}.post`, [lp.x, lp.y, lp.z], rot, [h / 0.12, len + 0.02, d / 0.12], 0, q, len / 2);
        };
        if (house && sy > 0.5) { beam(sy / 2 - 0.12, 0.13, 0.2); if (y0 - padY < 0.05) beam(-sy / 2, 0.12, 0.2); else beam(-sy / 2 - 0.06, 0.1, 0.18); }
        // 窓（下の段 lo の上に格子）
        if (/lo$/.test(p.id) && house) { const lp = new THREE.Vector3(0, sy / 2, 0).applyMatrix4(M); addKit(`${ARR}.window_koshi`, [lp.x, lp.y, lp.z], rot, [len / 1.2, 0.8 / 0.8, thick / 0.05 * 0.6], 0, along === 'z' ? new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2) : null, 1); }
        continue;
      }
      if (p.type === 'wall') { addGeo('mat.wood.planks_silver', boxGeo(sx, sy, sz, along === 'x' ? 'x' : 'z'), M, padY); continue; }
      if (p.type === 'floor') {
        const mat = p.mat === 'tatami' ? 'mat.floor.tatami' : p.mat === 'earth' ? 'mat.ground.dirt_path' : 'mat.wood.planks_silver';
        addGeo(mat, boxGeo(sx, sy, sz, 'x'), M, padY - 1);
        if (p.id.endsWith('.engawa')) for (const f of [-0.42, 0, 0.42]) { const lp = new THREE.Vector3(f * sx, -sy / 2, sz / 2 - 0.08).applyMatrix4(M); addKit(`${ARR}.post`, [lp.x, lp.y, lp.z], rot, [0.9, sy, 0.9], 0, null, 1); }
        continue;
      }
      if (p.type === 'ceiling') { addGeo('mat.wood.planks_silver', boxGeo(sx, sy, sz, 'x'), M, padY - 3); continue; }
      if (p.type === 'gable') { addGeo('mat.wood.planks_silver', gableGeo(sx, sy, sz), M, padY - 3); continue; }
      if (p.type === 'roof' && house) {
        const sag = Math.min(0.32, 0.04 + decay * decay * (b.kind === 'jp_house_collapsed' ? 0.5 : 0.25));
        const R = roofGeos(sx, sz, sy, sag, hash(p.id));
        addGeo(roofMat, R.top, M, padY - 5); addGeo('mat.wood.planks_silver', R.bottom, M, padY - 5); addGeo('mat.wood.cedar', R.edge, M, padY - 5);
        roofParts.push(p);
        for (const zz of [-sz / 2, sz / 2]) { const v = new THREE.Vector3(0, sy / 2, zz).applyMatrix4(M); ridgeY = Math.max(ridgeY, v.y); }
        continue;
      }
      // 祠
      if (b.kind === 'hokora_small') {
        if (p.type === 'platform' || p.type === 'step') { addGeo('mat.stone.granite', boxGeo(sx, sy, sz), M, padY - 1); continue; }
        if (p.type === 'shrine') { addKit('bld.shrine.honden', [p.c[0], y0, p.c[2]], rot, [1, 1, 1], 0, null, 2); continue; }
        if (p.type === 'lantern') { addKit('prop.stone_lantern', [p.c[0], y0, p.c[2]], rot, [1, 1, 1], 0, null, 1); continue; }
        if (p.mat === 'torii' || p.type === 'roof') continue;        // 鳥居・本殿の屋根は kit が持つ
      }
      addGeo(p.mat === 'stone' ? 'mat.stone.granite' : 'mat.wood.cedar', boxGeo(sx, sy, sz), M, padY);
    }
    // 鳥居（2 本の柱の真ん中）
    const pil = b.parts.filter(p => p.mat === 'torii' && p.type === 'pillar');
    if (pil.length === 2) addKit('bld.shrine.torii', [(pil[0].c[0] + pil[1].c[0]) / 2, pil[0].c[1] - pil[0].size[1] / 2, (pil[0].c[2] + pil[1].c[2]) / 2], b.rot, [1, 1, 1], 0, null, 3);
    // 棟（棟瓦を 1m ごと）
    if (roofParts.length >= 2 && b.kind === 'jp_house_abandoned') {
      const [W] = b.footprint, RW = W + 1.2, n = Math.round(RW), q = new THREE.Quaternion();
      const c = new THREE.Vector3(b.at[0], ridgeY - 0.06, b.at[2]);
      for (let k = 0; k < n; k++) {
        const u = -RW / 2 + (k + 0.5) * RW / n, x = c.x + Math.cos(b.rot * D2R) * u, z = c.z - Math.sin(b.rot * D2R) * u;
        if (roofMat === 'mat.metal.tin_rust') continue;
        addKit(`${ARR}.roof_ridge`, [x, c.y, z], b.rot, [RW / n, 1, 1], 0, q, 1);
      }
    }
    // 扉：横に寄せた障子（外の面）と鴨居
    for (const d of b.doors || []) {
      const r = d.rotY * D2R, fx = Math.sin(r), fz = Math.cos(r), rx = Math.cos(r), rz = -Math.sin(r), out = (d.wallT || 0.15) / 2 + 0.03;
      addKit(`${ARR}.door_shoji`, [d.at[0] + rx * (d.width / 2 + 0.42) + fx * out, d.at[1] + 0.02, d.at[2] + rz * (d.width / 2 + 0.42) + fz * out], d.rotY + (hash(d.id + 'r') - 0.5) * 4, [1, 1, 1], 0, null, 1.2);
      const L = d.width + 0.24; addKit(`${ARR}.post`, [d.at[0] - rx * L / 2, d.at[1] + d.height + 0.055, d.at[2] - rz * L / 2], d.rotY, [0.11 / 0.12, L, 0.17 / 0.12], 0, LAY, 1.2);
    }
  }
  const meshes = {};
  for (const [mat, list] of Object.entries(geos)) meshes[mat] = mergeGeometries(list);
  return { geometries: meshes, kitItems: kit };
}
