// 境界侵食 P14：湯気・煙（おでんの鍋・焼き台・やかん）。インスタンスの四角（カメラを向く板）1 つ＝描画 1 回。
// 動きはシェーダーの中だけ（時間で上がり・広がり・薄れる）＝毎こまの CPU の仕事は uTime を入れるだけ（onBeforeRender）。
import * as THREE from 'three';

const VS = `attribute vec4 iP; attribute vec4 iQ; varying vec2 vUv; varying float vA; uniform float uTime;
void main(){
  float t = fract(uTime * iQ.y + iP.w);
  float h = t * iQ.x;                                     // 上がる高さ
  float s = iQ.z * (0.45 + t * 1.3);                       // 広がる
  vec3 c = iP.xyz + vec3(sin(t * 5.0 + iP.w * 31.0) * 0.05 * t, h, cos(t * 4.0 + iP.w * 17.0) * 0.05 * t);
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * s;
  vUv = position.xy; vA = smoothstep(0.0, 0.18, t) * (1.0 - t) * iQ.w;
  gl_Position = projectionMatrix * mv; }`;
const FS = `varying vec2 vUv; varying float vA; uniform vec3 uCol;
void main(){ float r = length(vUv) * 2.0; if (r > 1.0) discard; float a = (1.0 - r * r) * vA; gl_FragColor = vec4(uCol, a * 0.8); }`;

/** list：[{ p:[x,y,z], n（粒の数）, h（上がる高さ m）, r（板の大きさ m）, k（濃さ 0〜1）, spread（出る所の広さ m） }] → THREE.Mesh（1 回の描画）か null */
export function steamMesh(list, color = 0xf2ece4) {
  if (!list || !list.length) return null;
  const P = [], Q = [];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const s of list) {
    const n = s.n || 10, sp = s.spread ?? 0.25;
    for (let i = 0; i < n; i++) { P.push(s.p[0] + (rnd() - 0.5) * sp, s.p[1], s.p[2] + (rnd() - 0.5) * sp * 0.6, i / n + rnd() * 0.08); Q.push(s.h || 0.7, 0.32 + rnd() * 0.18, s.r || 0.22, s.k ?? 1); }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(P), 4)); g.setAttribute('iQ', new THREE.InstancedBufferAttribute(new Float32Array(Q), 4));
  g.instanceCount = P.length / 4;
  const uniforms = { uTime: { value: 0 }, uCol: { value: new THREE.Color(color) } };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms, transparent: true, depthWrite: false }));
  // 見える範囲（湯気の出る所を囲む）：画面の外なら描かない
  const box = new THREE.Box3(); for (const s of list) box.expandByPoint(new THREE.Vector3(...s.p)); box.max.y += 1.5; box.expandByScalar(0.6);
  g.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); g.boundingBox = box;
  m.renderOrder = 3; m.name = 'steam';
  m.onBeforeRender = () => { uniforms.uTime.value = performance.now() / 1000; };
  return m;
}
