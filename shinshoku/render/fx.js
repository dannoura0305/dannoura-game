// 演出：刀の軌跡・火花・黒い霧（倒れた異形）・一閃の刃の一筋・銃口の光・雨。流血は使わない（Q13 の仮の進め方）。
import * as THREE from 'three';

export class Fx {
  constructor(scene) {
    this.scene = scene; this.items = [];
    // 粒（火花・霧）は 1 つの Points にまとめる
    this.N = 600; this.pPos = new Float32Array(this.N * 3); this.pCol = new Float32Array(this.N * 3); this.pVel = new Float32Array(this.N * 3); this.pLife = new Float32Array(this.N); this.pMax = new Float32Array(this.N); this.pi = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.NormalBlending, fog: true }));
    this.points.frustumCulled = false; scene.add(this.points);
    for (let i = 0; i < this.N; i++) this.pPos[i * 3 + 1] = -99;
    this.trailMat = new THREE.MeshBasicMaterial({ color: 0xe8dcff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    // 黒い霧（柔らかい大きな粒・通常の合成）
    this.M = 260; this.mPos = new Float32Array(this.M * 3); this.mCol = new Float32Array(this.M * 4); this.mVel = new Float32Array(this.M * 3); this.mLife = new Float32Array(this.M); this.mMax = new Float32Array(this.M); this.mi = 0;
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(this.mPos, 3)); mg.setAttribute('color', new THREE.BufferAttribute(this.mCol, 4));
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d', { willReadFrequently: true }); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
    this.mistPts = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.55, map: tex, vertexColors: true, transparent: true, depthWrite: false, fog: true, sizeAttenuation: true }));
    this.mistPts.frustumCulled = false; scene.add(this.mistPts);
    for (let i = 0; i < this.M; i++) this.mPos[i * 3 + 1] = -99;
    this.decals = [];
  }
  /** 柔らかい霧の粒（倒れた異形の黒い霧・ほこり） */
  puff(x, y, z, vx, vy, vz, color, life, alpha = 0.7) {
    const i = this.mi = (this.mi + 1) % this.M; const c = new THREE.Color(color);
    this.mPos.set([x, y, z], i * 3); this.mVel.set([vx, vy, vz], i * 3); this.mCol.set([c.r, c.g, c.b, alpha], i * 4); this.mLife[i] = life; this.mMax[i] = life;
  }
  /** 地面の予兆（赤い円・扇）。kind：'circle'|'arc'|'line'。fill は dur の間に満ちる */
  decal(kind, x, z, opt = {}) {
    const color = opt.color ?? 0xff3040, r = opt.r ?? 2, dur = opt.dur ?? 1;
    let g;
    if (kind === 'arc') g = new THREE.RingGeometry(0.4, r, 32, 1, -((opt.arc ?? 120) * Math.PI / 180) / 2 + Math.PI / 2, (opt.arc ?? 120) * Math.PI / 180);
    else if (kind === 'line') g = new THREE.PlaneGeometry(opt.w ?? 1.6, r);
    else g = new THREE.CircleGeometry(r, 36);
    if (kind === 'line') g.translate(0, r / 2, 0);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: true });
    const mesh = new THREE.Mesh(g, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.035, z);
    if (opt.yaw != null) mesh.rotation.z = opt.yaw - Math.PI;     // 局所の +Y を世界の向き yaw（+z が 0）へ
    const edge = new THREE.Mesh(kind === 'circle' ? new THREE.RingGeometry(r * 0.94, r, 40) : g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    mesh.add(edge); edge.position.z = 0.002;
    this.scene.add(mesh);
    const d = { mesh, edge, t: 0, dur, hold: opt.hold ?? 0.2, follow: opt.follow || null };
    this.decals.push(d); return d;
  }
  clearDecals() { for (const d of this.decals) this.scene.remove(d.mesh); this.decals.length = 0; }
  particle(x, y, z, vx, vy, vz, color, life) {
    const i = this.pi = (this.pi + 1) % this.N; const c = new THREE.Color(color);
    this.pPos.set([x, y, z], i * 3); this.pVel.set([vx, vy, vz], i * 3); this.pCol.set([c.r, c.g, c.b], i * 3); this.pLife[i] = life; this.pMax[i] = life;
  }
  sparks(p, n = 10, color = 0xfff0c0) { for (let k = 0; k < n; k++) this.particle(p.x, p.y, p.z, (Math.random() - 0.5) * 5, Math.random() * 3, (Math.random() - 0.5) * 5, color, 0.25 + Math.random() * 0.2); }
  mist(p, n = 40, h = 1.6) {
    for (let k = 0; k < Math.ceil(n / 3); k++) this.puff(p.x + (Math.random() - 0.5) * 0.7, p.y + Math.random() * h, p.z + (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, Math.random() < 0.2 ? 0x3a1a5a : 0x05040a, 1.4 + Math.random() * 1.4, 0.55);
    for (let k = 0; k < n; k++) this.particle(p.x + (Math.random() - 0.5) * 0.6, p.y + Math.random() * h, p.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.9, (Math.random() - 0.5) * 0.6, Math.random() < 0.15 ? 0x4a2a6a : 0x0a0810, 1.2 + Math.random() * 1.2); }
  dust(p, n = 6) { for (let k = 0; k < n; k++) this.particle(p.x, 0.05, p.z, (Math.random() - 0.5) * 2, Math.random() * 0.6, (Math.random() - 0.5) * 2, 0x6a6470, 0.5); }
  /** 刀の軌跡：刃の根元と先の点の履歴から帯を作る */
  trail(points, color = 0xe8dcff, life = 0.16) {
    if (points.length < 2) return;
    const pos = []; for (let i = 0; i < points.length - 1; i++) { const [a0, a1] = points[i], [b0, b1] = points[i + 1]; pos.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = this.trailMat.clone(); m.color.set(color);
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; this.scene.add(mesh);
    this.items.push({ mesh, life, max: life, kind: 'fade' });
  }
  /** 一閃：空間を横切る細い一筋の光 */
  streak(a, b, color = 0xffffff, life = 0.5, width = 0.05) {
    const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
    const g = new THREE.PlaneGeometry(len, width); const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize()); mesh.rotateX(Math.PI / 2); mesh.renderOrder = 999;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(len * 1.02, width * 7), new THREE.MeshBasicMaterial({ color: 0x9a6aff, transparent: true, opacity: 0.35, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    mesh.add(glow); glow.renderOrder = 998;
    this.scene.add(mesh); this.items.push({ mesh, life, max: life, kind: 'streak' });
  }
  flash(p, color = 0xffd890, size = 0.5) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(p); this.scene.add(m); this.items.push({ mesh: m, life: 0.06, max: 0.06, kind: 'fade' });
  }
  tracer(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.8 })); this.scene.add(l);
    this.items.push({ mesh: l, life: 0.06, max: 0.06, kind: 'fade' });
  }
  /** 予兆のしるし（敵の体の上）：白＝弾ける、赤＝弾けない */
  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.pLife[i] <= 0) continue;
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) { this.pPos[i * 3 + 1] = -99; continue; }
      const k = i * 3; this.pVel[k + 1] -= (this.pCol[k] > 0.5 ? 6 : -0.2) * dt;
      this.pPos[k] += this.pVel[k] * dt; this.pPos[k + 1] += this.pVel[k + 1] * dt; this.pPos[k + 2] += this.pVel[k + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
    let anyM = false;
    for (let i = 0; i < this.M; i++) {
      if (this.mLife[i] <= 0) continue; anyM = true;
      this.mLife[i] -= dt; const k = i * 3;
      if (this.mLife[i] <= 0) { this.mPos[k + 1] = -99; continue; }
      this.mPos[k] += this.mVel[k] * dt; this.mPos[k + 1] += this.mVel[k + 1] * dt; this.mPos[k + 2] += this.mVel[k + 2] * dt;
      this.mVel[k] *= 0.98; this.mVel[k + 2] *= 0.98;
      const f = this.mLife[i] / this.mMax[i]; this.mCol[i * 4 + 3] = Math.min(1, f * 1.5) * Math.min(1, (1 - f) * 6) * 0.65;
    }
    if (anyM || this.mAny) { this.mistPts.geometry.attributes.position.needsUpdate = true; this.mistPts.geometry.attributes.color.needsUpdate = true; }
    this.mAny = anyM;
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]; d.t += dt;
      if (d.follow) { d.mesh.position.x = d.follow.x; d.mesh.position.z = d.follow.z; }
      const k = Math.min(1, d.t / d.dur);
      d.mesh.material.opacity = 0.12 + 0.3 * k; d.edge.material.opacity = 0.5 + 0.5 * Math.sin(d.t * 18) * 0.3;
      if (d.t > d.dur + d.hold) { this.scene.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); this.decals.splice(i, 1); }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i]; it.life -= dt;
      const k = Math.max(0, it.life / it.max);
      if (it.kind === 'streak') { it.mesh.material.opacity = Math.min(1, k * 2); it.mesh.scale.y = 0.4 + k; }
      else if (it.mesh.material) it.mesh.material.opacity = k * 0.8;
      if (it.life <= 0) { this.scene.remove(it.mesh); it.mesh.geometry.dispose(); if (it.mesh.material) it.mesh.material.dispose(); this.items.splice(i, 1); }
    }
  }
}

/** 雨：カメラのまわりに線を降らせる（品質で入り切り） */
export class Rain {
  constructor(scene, n = 900) {
    this.n = n; const pos = new Float32Array(n * 6); this.pos = pos;
    for (let i = 0; i < n; i++) this.reset(i, true);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x8a96b8, transparent: true, opacity: 0.35, fog: true }));
    this.mesh.frustumCulled = false; scene.add(this.mesh); this.center = new THREE.Vector3();
  }
  reset(i, init) {
    const x = (Math.random() - 0.5) * 24, z = (Math.random() - 0.5) * 24, y = init ? Math.random() * 10 : 10;
    this.pos.set([x, y, z, x + 0.03, y - 0.45, z], i * 6);
  }
  update(dt, cx, cz, roofed) {
    this.mesh.position.set(cx, 0, cz);
    const p = this.pos;
    for (let i = 0; i < this.n; i++) {
      const k = i * 6; p[k + 1] -= 14 * dt; p[k + 4] -= 14 * dt;
      if (p[k + 4] < 0) this.reset(i);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.material.opacity = roofed ? 0.0 : 0.35; this.mesh.visible = this.mesh.visible && !roofed;
  }
}
