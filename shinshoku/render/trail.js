// 刀・鉄パイプの振りの軌跡：刃の根元と先の点を毎描画で記録し、帯（1 つの網・描画 1 回）にする。古い点ほど薄い。
import * as THREE from 'three';

export class SwordTrail {
  constructor(max = 40) {
    this.max = max; this.pts = [];                 // { a:Vector3, b:Vector3, t:秒, brk:bool }
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 2 * 3); this.alpha = new Float32Array(max * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const idx = []; for (let i = 0; i < max - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx); g.setDrawRange(0, 0);
    this.uColor = { value: new THREE.Color(0xd8c8ff) };
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: this.uColor },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * vA, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.name = 'sword_trail'; this.mesh.renderOrder = 6;
    this.life = 0.16; this.time = 0;
  }
  /** すべて消す（演出場面の始まりなど） */
  reset() { this.pts.length = 0; this.mesh.geometry.setDrawRange(0, 0); }
  /** 振りの始まり（前の帯とつなげない） */
  cut() { if (this.pts.length) this.pts[this.pts.length - 1].brk = true; }
  push(a, b, color) { if (color != null) this.uColor.value.set(color); this.pts.push({ a: a.clone(), b: b.clone(), t: this.time, brk: false }); if (this.pts.length > this.max) this.pts.shift(); }
  update(dt) {
    this.time += dt;
    while (this.pts.length && this.time - this.pts[0].t > this.life) this.pts.shift();
    const n = this.pts.length;
    for (let i = 0; i < n; i++) {
      const p = this.pts[i], k = Math.max(0, 1 - (this.time - p.t) / this.life);
      // 刃の先ほど明るく、根元は薄く
      const mid = p.a.clone().lerp(p.b, 0.25);
      this.pos.set([mid.x, mid.y, mid.z, p.b.x, p.b.y, p.b.z], i * 6);
      const cut = (p.brk || (i > 0 && this.pts[i - 1].brk)) ? 0 : 1;
      this.alpha[i * 2] = k * 0.15 * cut; this.alpha[i * 2 + 1] = k * 0.95 * cut;
      if (i === 0) { this.alpha[0] = 0; this.alpha[1] = 0; }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
    g.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }
}
