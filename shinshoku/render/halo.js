// 光のにじみ（安い「選んだ所だけのブルーム」）と、濡れた地面に映る光の筋。
// どちらも 1 回の描画呼び出し（インスタンスの四角をシェーダーでカメラへ向ける）。深度は見る（壁の向こうの光はにじまない）。
// 画面全体のブルーム（描き直し＋ぼかし）はスマホで重いので使わない。
import * as THREE from 'three';

const VS_HALO = `
attribute vec3 iPos; attribute vec4 iCol; attribute float iSize;
varying vec2 vUv; varying vec4 vCol; varying float vFog;
uniform float uFog;
void main(){
  vUv = position.xy; vCol = iCol;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float push = min(iSize * 0.6, -mv.z * 0.5);
  mv.xyz += normalize(-mv.xyz) * push;                       // 手前へ少し出す（光源の網に埋もれない）
  mv.xy += position.xy * iSize;
  vFog = exp(-uFog * uFog * mv.z * mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS_HALO = `
varying vec2 vUv; varying vec4 vCol; varying float vFog;
void main(){
  float r = length(vUv) * 2.0; if (r > 1.0) discard;
  float a = pow(1.0 - r, 2.2) * 0.85 + pow(max(0.0, 1.0 - r * 3.5), 2.0) * 0.6;
  gl_FragColor = vec4(vCol.rgb * a * vCol.a * vFog, 1.0);
}`;
const VS_STREAK = `
attribute vec3 iPos; attribute vec4 iCol; attribute float iSize;
varying vec2 vUv; varying vec4 vCol; varying float vFog;
uniform vec3 uCam; uniform float uFog;
void main(){
  vUv = position.xy; vCol = iCol;
  vec2 d = uCam.xz - iPos.xz; float L = length(d); d = L > 0.001 ? d / L : vec2(0.0, 1.0);
  vec2 sd = vec2(-d.y, d.x);
  float len = iSize * 2.4, wid = iSize * 0.32;
  vec3 p = vec3(iPos.x, 0.03, iPos.z);
  p.xz += d * (position.y + 0.5) * len + sd * position.x * wid;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFog = exp(-uFog * uFog * mv.z * mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS_STREAK = `
varying vec2 vUv; varying vec4 vCol; varying float vFog;
void main(){
  float along = vUv.y + 0.5;                                 // 0：光の真下 → 1：カメラ側
  float side = 1.0 - abs(vUv.x) * 2.0;
  float wob = 0.75 + 0.25 * sin(along * 40.0 + vUv.x * 7.0);
  float a = pow(max(0.0, side), 1.6) * (1.0 - along) * along * 3.2 * wob;
  gl_FragColor = vec4(vCol.rgb * a * vCol.a * vFog * 0.55, 1.0);
}`;

class InstQuads {
  constructor(max, vs, fs, extraUniforms = {}) {
    this.max = max; this.n = 0;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iCol', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('iSize', new THREE.InstancedBufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.uniforms = Object.assign({ uFog: { value: 0.045 } }, extraUniforms);
    const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: this.uniforms, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.base = [];
  }
  clear() { this.n = 0; this.base.length = 0; this.mesh.geometry.instanceCount = 0; }
  /** 足す：p=[x,y,z]、size（m）、color、k（強さ 0〜） 戻り値：番号 */
  add(p, size, color, k = 1) {
    if (this.n >= this.max) return -1;
    const i = this.n++, c = new THREE.Color(color);
    this.pos.set(p, i * 3); this.size[i] = size; this.col.set([c.r, c.g, c.b, k], i * 4);
    this.base[i] = k; this._dirty();
    this.mesh.geometry.instanceCount = this.n; return i;
  }
  setK(i, k) { if (i >= 0 && i < this.n) { this.col[i * 4 + 3] = k; this.dirtyC = true; } }
  setPos(i, x, y, z) { if (i >= 0 && i < this.n) { this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.dirtyP = true; } }
  setColor(i, color) { if (i >= 0 && i < this.n) { const c = new THREE.Color(color); this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b; this.dirtyC = true; } }
  _dirty() { this.dirtyP = this.dirtyC = true; this.dirtyS = true; }
  flush() {
    const g = this.mesh.geometry;
    if (this.dirtyP) { g.attributes.iPos.needsUpdate = true; this.dirtyP = false; }
    if (this.dirtyC) { g.attributes.iCol.needsUpdate = true; this.dirtyC = false; }
    if (this.dirtyS) { g.attributes.iSize.needsUpdate = true; this.dirtyS = false; }
  }
}

export class Halos extends InstQuads { constructor(max = 160) { super(max, VS_HALO, FS_HALO); this.mesh.name = 'halos'; } }
export class WetStreaks extends InstQuads {
  constructor(max = 48) { super(max, VS_STREAK, FS_STREAK, { uCam: { value: new THREE.Vector3() } }); this.mesh.name = 'wet_streaks'; this.mesh.renderOrder = 1; }
  update(camera) { this.uniforms.uCam.value.copy(camera.position); }
}
