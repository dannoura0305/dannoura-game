// 下草（草の株・シダ）と落ち葉。layout.instances の下草の点（u16 の cm）から、カメラの近く（段の grassFar）だけをインスタンスで描く。
// 1 点あたり段の grassDensity 株（ずらして置く）。森の中（木の密度が高い所）・坂ではシダが多い。点の選び方は点の番号で決まる＝毎回同じ。
// 落ち葉：カメラのまわりに段の leaves 枚。頂点の影の中で落ちて回る（CPU は何もしない）。
import * as THREE from 'three';
import { unb64 } from '../pcg/scatter.js';
import { windUniforms } from './wind.js';

const frac = x => x - Math.floor(x);
const h1 = (i, k) => frac(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);

export class GroundCover {
  constructor(scene, layout, hf, P, trees) {
    this.scene = scene; this.P = P; this.hf = hf; this.pts = []; this.meshes = []; this.last = null;
    if (!P.grass || !P.grassDensity) return;
    const every = Math.max(1, Math.round(1 / P.grass));
    for (const I of layout.instances || []) {
      const d = unb64(I.data);
      for (let i = 0, n = 0; i < d.length; i += 2, n++) {
        if (n % every) continue;
        const x = d[i] / 100, z = d[i + 1] / 100, td = trees ? trees.at(x, z) : 0, sl = hf.slopeDeg(x, z);
        for (let k = 0; k < P.grassDensity; k++) {
          const ox = k ? (h1(n, k) - 0.5) * 1.1 : 0, oz = k ? (h1(n, k + 7) - 0.5) * 1.1 : 0, X = x + ox, Z = z + oz;
          const fern = h1(n, k + 3) < 0.08 + 0.35 * Math.min(1, td / 2) + 0.2 * Math.min(1, sl / 30);
          this.pts.push({ x: X, z: Z, y: hf.at(X, Z), fern, rot: h1(n, k + 11) * Math.PI * 2, s: 0.65 + h1(n, k + 13) * 0.7 });
        }
      }
    }
  }
  /**
   * 境界侵食 P16：地図（layout）の下草の点の代わりに、作品の側で決めた点の列から作る。pts＝[{ x, y, z, fern（2 つ目の部品）, rot, s }]・
   * ids＝[1 つ目, 2 つ目] の部品の id（build に渡す）。描き方（カメラの近くだけ・遠い所は小さくして消す・揺れ）は同じ
   */
  static fromPoints(scene, pts, P) {
    const g = new GroundCover(scene, { instances: [] }, null, Object.assign({}, P, { grass: 0 }), null);
    g.P = P; g.pts = pts; return g;
  }
  async build(bank, ids = ['veg.grass', 'veg.fern']) {
    if (!this.pts.length) return this;
    const [grass, fern] = await Promise.all(ids.map(id => bank.kit(id)));
    const mk = (kit, n) => {
      if (!kit) return [];
      const prims = kit.nodes.LOD0 || Object.values(kit.nodes)[0];
      return prims.map(({ geometry, material }) => { const m = new THREE.InstancedMesh(geometry, material, n); m.count = 0; m.frustumCulled = false; m.receiveShadow = !!this.P.shadows; m.castShadow = false; this.scene.add(m); this.meshes.push(m); return m; });
    };
    const nf = this.pts.filter(p => p.fern).length;
    this.grassM = mk(grass, Math.max(1, this.pts.length - nf)); this.fernM = mk(fern, Math.max(1, nf));
    return this;
  }
  update(cam) {
    if (!this.meshes.length) return;
    const p = cam.position;
    if (this.last && Math.hypot(p.x - this.last.x, p.z - this.last.z) < 2.5) return;
    this.last = { x: p.x, z: p.z };
    const R = this.P.grassFar, R2 = R * R, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3();
    let ng = 0, nf = 0;
    for (const q of this.pts) {
      const dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz; if (d2 > R2) continue;
      const fade = 1 - Math.max(0, (Math.sqrt(d2) - R * 0.7) / (R * 0.3));     // 遠い所は小さくして消す
      Q.setFromAxisAngle(V.set(0, 1, 0), q.rot); S.setScalar(q.s * (q.fern ? 1.1 : 1) * Math.max(0.05, fade)); M.compose(V.set(q.x, q.y - 0.02, q.z), Q, S);
      if (q.fern) { for (const m of this.fernM) m.setMatrixAt(nf, M); nf++; } else { for (const m of this.grassM) m.setMatrixAt(ng, M); ng++; }
    }
    for (const m of this.grassM || []) { m.count = ng; m.visible = ng > 0; m.instanceMatrix.needsUpdate = true; }
    for (const m of this.fernM || []) { m.count = nf; m.visible = nf > 0; m.instanceMatrix.needsUpdate = true; }
    this.count = { grass: ng, fern: nf };
  }
}

/** 落ち葉（カメラのまわりの箱の中をくり返し落ちる）。tex＝広葉樹の葉の色（無ければ単色） */
function leafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.translate(32, 32); x.rotate(0.6);
  const gr = x.createLinearGradient(-26, 0, 26, 0); gr.addColorStop(0, '#5a3a18'); gr.addColorStop(0.6, '#8a5a24'); gr.addColorStop(1, '#a0702c');
  x.fillStyle = gr; x.beginPath(); x.moveTo(-28, 0); x.quadraticCurveTo(0, -17, 28, 0); x.quadraticCurveTo(0, 17, -28, 0); x.fill();
  x.strokeStyle = 'rgba(40,24,8,0.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-28, 0); x.lineTo(26, 0); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function fallingLeaves(scene, n, tex = null) {
  if (!n) return null;
  tex = tex || leafTexture();
  const g = new THREE.PlaneGeometry(0.06, 0.06), seeds = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) seeds.set([h1(i, 1), h1(i, 2), h1(i, 3), h1(i, 4)], i * 4);
  const ig = new THREE.InstancedBufferGeometry().copy(g); ig.instanceCount = n; ig.setAttribute('seed', new THREE.InstancedBufferAttribute(seeds, 4));
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex || null, side: THREE.DoubleSide, roughness: 0.8, alphaTest: tex ? 0.4 : 0 });
  if (!tex) m.color.setRGB(0.42, 0.3, 0.12);
  m.onBeforeCompile = sh => {
    sh.uniforms.uWindTime = windUniforms.uWindTime; sh.uniforms.uCam = { value: new THREE.Vector3() }; m.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 seed; uniform float uWindTime; uniform vec3 uCam;')
      .replace('#include <begin_vertex>', `
      float t = uWindTime * (0.35 + seed.w * 0.3) + seed.z * 40.0;
      vec3 box = vec3(26.0, 9.0, 26.0);
      vec3 c = vec3(seed.x, 1.0 - fract(t / 9.0 * 0.6 + seed.y), seed.y) * box - box * vec3(0.5, 0.0, 0.5);
      c.x += sin(t * 1.3 + seed.x * 6.0) * 0.8; c.z += cos(t * 1.1 + seed.z * 6.0) * 0.8;
      vec3 org = floor((uCam - c) / box * vec3(1.0, 0.0, 1.0)) * box * vec3(1.0, 0.0, 1.0);
      vec3 wpos = c + vec3(floor((uCam.x - c.x) / box.x + 0.5) * box.x, uCam.y - 2.0, floor((uCam.z - c.z) / box.z + 0.5) * box.z);
      float a = t * 3.0 + seed.x * 10.0, b = t * 2.1;
      mat3 R = mat3(cos(a), sin(a), 0.0, -sin(a), cos(a), 0.0, 0.0, 0.0, 1.0) * mat3(1.0, 0.0, 0.0, 0.0, cos(b), sin(b), 0.0, -sin(b), cos(b));
      vec3 toC = wpos - uCam; float dc = length(toC.xz); if (dc < 2.5) wpos.xz += normalize(toC.xz + vec2(0.001)) * (2.5 - dc);   // 目の前には来ない
      vec3 transformed = R * position + wpos;
      objectNormal = R * objectNormal;`)
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>');
  };
  m.customProgramCacheKey = () => 'leaves';
  const mesh = new THREE.Mesh(ig, m); mesh.frustumCulled = false; mesh.castShadow = false; scene.add(mesh);
  mesh.onBeforeRender = (r, s, cam) => { if (m.userData.sh) m.userData.sh.uniforms.uCam.value.copy(cam.position); };
  return mesh;
}
