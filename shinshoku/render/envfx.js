// 境界侵食 P12：雨の跳ね（地面に落ちた雨粒の小さな輪としぶき）。インスタンスの四角 1 つ＝描画 1 回。
// 屋根の下（区画の rainRoof）には出さない。段の splash が false（スマホの低）なら作らない。
import * as THREE from 'three';

const VS = `attribute vec4 iP; varying vec2 vUv; varying float vT; uniform float uTime; uniform float uFog; varying float vFog;
void main(){ vUv = position.xy; float t = fract((uTime + iP.w) * 2.2); vT = t;
  float s = 0.05 + t * 0.22;
  vec3 p = iP.xyz + vec3(position.x * s, 0.0, position.y * s);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vFog = exp(-uFog * uFog * mv.z * mv.z); gl_Position = projectionMatrix * mv; }`;
const FS = `varying vec2 vUv; varying float vT; varying float vFog; uniform vec3 uCol;
void main(){ float r = length(vUv) * 2.0; if (r > 1.0) discard;
  float ring = smoothstep(0.16, 0.0, abs(r - 0.8)) * (1.0 - vT) ;
  float dot0 = smoothstep(0.35, 0.0, r) * smoothstep(0.25, 0.0, vT);
  gl_FragColor = vec4(uCol * (ring * 0.55 + dot0 * 0.8) * vFog, 1.0); }`;

export class RainSplash {
  constructor(n = 180) {
    this.n = n;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    this.p = new Float32Array(n * 4); for (let i = 0; i < n; i++) this.p[i * 4 + 3] = Math.random();
    this.attr = new THREE.InstancedBufferAttribute(this.p, 4).setUsage(THREE.DynamicDrawUsage); g.setAttribute('iP', this.attr); g.instanceCount = n;
    this.uniforms = { uTime: { value: 0 }, uFog: { value: 0.04 }, uCol: { value: new THREE.Color(0x8c98b8) } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; this.mesh.name = 'rain_splash'; this.mesh.visible = false;
    this.phase = new Float32Array(n).fill(-1); this.t = 0;
  }
  /** cx, cz：中心（プレイヤー）・roofed(x,z)：屋根の下か・fog：霧の濃さ */
  update(dt, cx, cz, roofed, fog) {
    this.t += dt; this.uniforms.uTime.value = this.t; this.uniforms.uFog.value = fog;
    const p = this.p; let dirty = false;
    for (let i = 0; i < this.n; i++) {
      const ph = Math.floor((this.t + p[i * 4 + 3]) * 2.2);
      if (ph !== this.phase[i]) {   // 1 回の跳ねが終わったら、別の所へ
        this.phase[i] = ph; const a = Math.random() * 6.283, r = 0.6 + Math.sqrt(Math.random()) * 11, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        if (roofed && roofed(x, z)) { p[i * 4 + 1] = -50; } else { p[i * 4] = x; p[i * 4 + 1] = 0.03; p[i * 4 + 2] = z; }
        dirty = true;
      }
    }
    if (dirty) this.attr.needsUpdate = true;
  }
}
