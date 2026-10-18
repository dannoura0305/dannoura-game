// 境界侵食 P13：区画の組み立て（shinshoku/world/*）を動かし、作った形を 1 つずつ記録する（環境の点検 audit_env.mjs の元データ）。
// ・Builder.add（まとめる前の網）・Builder.box（箱の寸法・回転・地図帳の絵）・Atlas.add（看板の文字＝描いた fillText）を横取りする。
// ・まとめた後の網に入らない物（インスタンス網＝家具・電線・直接置いた網）は、出来た区画の木をたどって記録する。
// ・部品（Blender の glb）は置かない（KIT.on＝false）＝手続きの代わりの網で形を見る（部品の大きさは glb の点検で別に見る）。
// 使い方（node）：await import('./node_env.mjs'); const { recordAreas } = await import('./record.mjs'); const R = await recordAreas(['shotengai', ...])
import * as THREE from 'three';
import { Builder, Atlas } from '../../../shinshoku/world/level.js';
import { BUILDERS } from '../../../shinshoku/world/areas.js';
import '../../../shinshoku/world/areas3.js';
import '../../../shinshoku/world/areas4.js';
import '../../../shinshoku/world/areas5.js';
import '../../../shinshoku/world/areas6.js';
import '../../../shinshoku/world/areas7.js';
import '../../../shinshoku/world/areas8.js';

export const AREA_IDS = Object.keys(BUILDERS);
const HELPERS = new Set(['tb', 'prop', 'addTile', 'pb', 'part', 'bx', 'glowB', 'glass', 'signBox', 'frontSign', 'box', 'add', 'fb', 'R', 'B', 'P', 'G', 'solidBox', 'wb', 'sb', 'gb', 'put', 'dbox', 'pbox', 'wheel', 'tiltB', 'cyl', 'b', 'bx2', 'part2']);
let REC = null;           // 記録中の { pieces, sign: Map(uv→text), area, part }
let curOpt = null;

function frames() {
  const prev = Error.prepareStackTrace, lim = Error.stackTraceLimit;
  Error.prepareStackTrace = (e, cs) => cs; Error.stackTraceLimit = 14;
  const cs = new Error().stack; Error.prepareStackTrace = prev; Error.stackTraceLimit = lim;
  const out = [];
  for (const c of cs) {
    const f = c.getFileName() || ''; if (!/shinshoku\/world\//.test(f)) continue;
    const file = f.replace(/^.*shinshoku\/world\//, ''), fn = c.getFunctionName() || '';
    if (file === 'level.js' && (fn === 'add' || fn === 'box' || fn === 'fb' || /Builder/.test(c.getTypeName() || ''))) continue;
    out.push({ fn, file, line: c.getLineNumber() });
  }
  return out;
}
/** 記録の名前：helper（tb・prop…）を飛ばした最初の名前のある関数＋行 */
function owner(fr) {
  let named = fr.find(f => f.fn && !HELPERS.has(f.fn)) || fr[0] || { fn: '?', file: '?', line: 0 };
  return { fn: named.fn || '(anon)', at: named.file + ':' + named.line, chain: fr.slice(0, 5).map(f => (f.fn || '·') + ':' + f.line).join('<') };
}
function install() {
  if (Builder.prototype.__audit) return;
  const add0 = Builder.prototype.add, box0 = Builder.prototype.box, aadd0 = Atlas.prototype.add;
  Builder.prototype.box = function (key, cx, cy, cz, w, h, d, color, opt = {}) {
    const p = curOpt; curOpt = { key, cx, cy, cz, w, h, d, opt };
    try { return box0.apply(this, arguments); } finally { curOpt = p; }
  };
  Builder.prototype.add = function (key, geo, color, ao) {
    if (REC) {
      geo.computeBoundingBox(); const b = geo.boundingBox, o = curOpt && curOpt.key === key ? curOpt : null;
      const fr = frames(), ow = owner(fr);
      const rot = o ? !!(o.opt.ry || o.opt.rx || o.opt.rz) : true;
      const pc = { i: REC.pieces.length, area: REC.area, part: REC.part, src: 'b', key, tile: o ? o.opt.tile || null : (geo.userData && geo.userData.tile) || null, color: color == null ? 0xffffff : (typeof color === 'number' ? color : new THREE.Color(color).getHex()),
        min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z], aa: !rot, fb: !!this.fbOn, fn: ow.fn, at: ow.at, chain: ow.chain, geo: geo.type || 'BufferGeometry', tris: triCount(geo) };
      if (o && o.opt.uv) { const t = REC.sign.get(o.opt.uv); pc.text = t != null ? t : ''; pc.signFace = o.opt.face; }
      else if (key === 'sign') pc.text = uvText(geo);
      REC.pieces.push(pc);
    }
    return add0.apply(this, arguments);
  };
  Atlas.prototype.add = function (draw) {
    if (!REC) return aadd0.call(this, draw);
    const texts = []; const g = this.g, ft = g.fillText, st = g.strokeText;
    g.fillText = (t) => { texts.push(String(t)); }; g.strokeText = () => {};
    let uv; try { uv = aadd0.call(this, draw); } finally { g.fillText = ft; g.strokeText = st; }
    REC.sign.set(uv, texts.join(' ').trim()); REC.slots.push({ uv, text: texts.join(' ').trim() });
    return uv;
  };
  Builder.prototype.__audit = true;
}
function triCount(g) { return g.index ? g.index.count / 3 : g.attributes.position.count / 3; }
function uvText(geo) {
  const uv = geo.attributes.uv; if (!uv) return '';
  let u0 = 1, u1 = 0, v0 = 1, v1 = 0; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  for (const s of REC.slots) { const r = s.uv; if (u0 >= r.u0 - 0.002 && u1 <= r.u1 + 0.002 && v0 >= r.v0 - 0.002 && v1 <= r.v1 + 0.002 && (u1 - u0) > 1e-4) return s.text; }
  return '';
}

/** 出来た区画の木から、Builder 以外の網を記録する（インスタンス網は 1 つの箱＝36 頂点ごとに部分を分ける） */
function walkRoot(root, area, part) {
  root.updateMatrixWorld(true);
  const M = new THREE.Matrix4(), v = new THREE.Vector3();
  root.traverse(o => {
    if (o.userData && o.userData.isEdgeLines) return;
    if (/^lv_/.test(o.name) && (o.isMesh || o.isLineSegments)) return;            // Builder の網（記録済み）
    if (o.visible === false) return;
    if (o.userData && (o.userData.stains || o.userData.decal) || /^(stains|shafts|debris)$/.test(o.name)) return;   // 貼り絵（しみ）・光の筋・壊れた破片（最初は大きさ 0）
    if (o.isInstancedMesh) {
      const g = o.geometry, P = g.attributes.position, n = P.count, per = 36, parts = n % per === 0 ? n / per : 1;
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, M); M.premultiply(o.matrixWorld);
        const inst = { name: o.name || 'inst', k };
        for (let p = 0; p < parts; p++) {
          const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; const a = parts === 1 ? 0 : p * per, z = parts === 1 ? n : a + per;
          for (let i = a; i < z; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); mn[0] = Math.min(mn[0], v.x); mn[1] = Math.min(mn[1], v.y); mn[2] = Math.min(mn[2], v.z); mx[0] = Math.max(mx[0], v.x); mx[1] = Math.max(mx[1], v.y); mx[2] = Math.max(mx[2], v.z); }
          REC.pieces.push({ i: REC.pieces.length, area, part, src: 'inst', key: 'inst', inst: inst.name, ik: k, ip: p, min: mn, max: mx, aa: false, fb: !!o.userData.kitFallback, fn: 'inst:' + inst.name, at: 'inst', chain: '', tile: null, color: 0 });
        }
      }
      return;
    }
    if (o.isLineSegments && !o.userData.isEdgeLines) {                                // 電線：区間ごと
      const P = o.geometry.attributes.position; if (!P) return;
      for (let i = 0; i + 1 < P.count; i += 2) {
        const a = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld), b = new THREE.Vector3().fromBufferAttribute(P, i + 1).applyMatrix4(o.matrixWorld);
        REC.pieces.push({ i: REC.pieces.length, area, part, src: 'wire', key: 'wire', min: [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)], max: [Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)], seg: [a.toArray(), b.toArray()], aa: false, fn: 'wire:' + (o.name || ''), at: 'wire', chain: '', tile: null, color: 0 });
      }
      return;
    }
    if (o.isMesh && o.geometry) {
      const nm = o.name || '';
      if (/sky|dome|cloud|mountain|range|rain|pools|halo|splash|fx|shaft|moon|star/i.test(nm) || (o.material && o.material.transparent && o.material.blending === THREE.AdditiveBlending)) return;
      const g = o.geometry; if (!g.attributes.position) return;
      const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) return;
      if (bb.max.x - bb.min.x > 400) return;                                             // 空の半球など
      REC.pieces.push({ i: REC.pieces.length, area, part, src: 'mesh', key: 'mesh', min: bb.min.toArray(), max: bb.max.toArray(), aa: false, fn: 'mesh:' + (nm || o.parent?.name || '?'), at: 'mesh', chain: '', tile: null, color: 0 });
    }
  });
}

/** 区画を組み立てて記録する。戻り値：{ [area]: { pieces, A（区画：boxes・spots・bounds…）} } */
export async function recordAreas(ids = AREA_IDS) {
  install();
  const out = {};
  for (const id of ids) {
    REC = { pieces: [], sign: new Map(), slots: [], area: id, part: 'main' };
    const A = BUILDERS[id]();
    walkRoot(A.root, id, 'main');
    const far = [];                                                                       // P16：後回しの部分の結果（植物の置き場所 vegItems など）も返す
    if (A.pending) for (const p of A.pending) { REC.part = 'far'; const r = p(); walkRoot(r.root, id, 'far'); far.push(r); }
    out[id] = { pieces: REC.pieces, A, far };
    REC = null;
  }
  return out;
}
