// 部品（glb）をインスタンスで描く：部品の id ごと・種類（v<k>）ごと・LOD ごと・材質ごとに InstancedMesh を 1 つ。
// カメラが動いた時だけ、物ごとに LOD を選び（mapkit/render/lod.js）、視野の外・遠すぎる物は描かない。数が 0 の組は visible=false（描画の呼び出しにならない）。
// 物：{ matrix（Matrix4：位置・回転・大きさ）, variant, x, y, z, r（半径・視野の判定）}
import * as THREE from 'three';
import { assignLods, scaledDists } from './lod.js';
import { parseNode } from './assets.js';

export class KitSet {
  constructor(scene, bank, P) { this.scene = scene; this.bank = bank; this.P = P; this.sets = []; this.last = null; this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4(); this.stats = { items: 0, sets: 0 }; }
  /** 置く物を足す（同じ id は 1 つの組にまとめる）。opt：{ cull（m）, shadow, lodScale } */
  add(id, items, opt = {}) {
    let s = this.sets.find(x => x.id === id);
    if (!s) { s = { id, items: [], opt, levels: null, meshes: [] }; this.sets.push(s); }
    s.items.push(...items); return s;
  }
  /** 部品を読んで InstancedMesh を作る。読めない部品は fallback(items) を呼ぶ（灰色の箱など） */
  async build(fallback) {
    await Promise.all(this.sets.map(async s => {
      const kit = await this.bank.kit(s.id);
      if (!kit) { if (fallback) fallback(s); s.dead = true; return; }
      // 種類ごとの LOD の並び（LOD0, LOD1, …, IMP）
      const byVar = {};
      for (const [name, prims] of Object.entries(kit.nodes)) {
        const p = parseNode(name); if (!p) continue;
        (byVar[p.variant] = byVar[p.variant] || {})[p.lod] = prims;
      }
      s.kit = kit; s.vars = {};
      const nVar = Math.max(1, Object.keys(byVar).length);
      for (const it of s.items) it.variant = (it.variant || 0) % nVar;
      for (const [v, lods] of Object.entries(byVar)) {
        const order = Object.keys(lods).filter(k => k !== 'imp').map(Number).sort((a, b) => a - b).map(k => lods[k]);
        if (lods.imp) order.push(lods.imp);
        const its = s.items.filter(it => it.variant === +v);
        const levels = order.map((prims, li) => prims.map(({ geometry, material }) => {
          const m = new THREE.InstancedMesh(geometry, material, Math.max(1, its.length));
          m.count = 0; m.visible = false; m.frustumCulled = false;
          const small = /^(prop|bld\.jp_house|rock)\./.test(s.id);
          m.castShadow = !!this.P.shadows && s.opt.shadow !== false && (li <= 1 || !lods.imp) && !(small && this.P.shadowSmall === false);
          m.receiveShadow = !!this.P.shadows && !(lods.imp && li === order.length - 1);
          m.name = `${s.id}:v${v}:L${li}`; this.scene.add(m); s.meshes.push(m);
          return m;
        }));
        s.vars[v] = { items: its, levels };
      }
      const nl = Math.max(...Object.values(s.vars).map(x => x.levels.length));
      s.dists = scaledDists(kit.lodDist, (this.P.lodScale || 1) * (s.opt.lodScale || 1)).slice(0, nl - 1);
      while (s.dists.length < nl - 1) s.dists.push((s.dists[s.dists.length - 1] || 20) * 2.5);
      this.stats.sets++; this.stats.items += s.items.length;
    }));
    this.sets = this.sets.filter(s => !s.dead);
    return this;
  }
  /** カメラに合わせて LOD と数を決める（動いた時だけ・force で必ず） */
  update(camera, force = false) {
    camera.updateMatrixWorld();
    const p = camera.position, key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)},${camera.quaternion.x.toFixed(3)},${camera.quaternion.y.toFixed(3)},${camera.quaternion.w.toFixed(3)}`;
    if (!force && key === this.last) return; this.last = key;
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pm);
    const sph = new THREE.Sphere(), F = this.frustum, cam = { x: p.x, y: p.y, z: p.z };
    const visible = it => { sph.center.set(it.x, it.y, it.z); sph.radius = it.r || 1; return F.intersectsSphere(sph); };
    for (const s of this.sets) for (const V of Object.values(s.vars)) {
      const maxLod = V.levels.length - 1;
      const { buckets } = assignLods(V.items, cam, s.dists, { cull: camera.far > 1000 ? camera.far : (s.opt.cull || this.P.far), visible, lodMin: Math.min(this.P.lodMin || 0, maxLod), maxLod });
      V.levels.forEach((meshes, li) => {
        const list = buckets[li] || [];
        for (const m of meshes) {
          for (let k = 0; k < list.length; k++) m.setMatrixAt(k, V.items[list[k]].matrix);
          m.count = list.length; m.visible = list.length > 0;
          if (list.length) m.instanceMatrix.needsUpdate = true;
        }
      });
    }
  }
}

/** 物（layout.objects の 1 つ）→ 置く行列（底の中心・Y の回転・大きさ） */
export function objectMatrix(o, extra = null) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (o.rotY || 0) * Math.PI / 180), s = o.scale || 1;
  m.compose(new THREE.Vector3(o.at[0], o.at[1], o.at[2]), q, new THREE.Vector3(s, s, s));
  if (extra) m.multiply(extra);
  return m;
}
