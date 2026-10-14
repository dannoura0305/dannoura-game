// 夜空（紫と赤の遠い空：イメージ資料 concept_01）。球の内側に色の段差を描くだけ（描画 1 回・霧なし）。
import * as THREE from 'three';
export function skyDome(opt = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(opt.top ?? 0x07050e) }, uMid: { value: new THREE.Color(opt.mid ?? 0x1c0c2a) }, uHor: { value: new THREE.Color(opt.horizon ?? 0x4a1424) }, uMoon: { value: new THREE.Vector3(...(opt.moon || [0.5, 0.32, -0.8])).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uMid, uHor, uMoon; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main(){ float y = clamp(vD.y, -0.2, 1.0);
        vec3 c = y < 0.18 ? mix(uHor, uMid, smoothstep(-0.05, 0.18, y)) : mix(uMid, uTop, smoothstep(0.18, 0.7, y));
        float m = max(0.0, dot(vD, uMoon)); c += vec3(0.75, 0.12, 0.18) * pow(m, 260.0) * 1.4 + vec3(0.35, 0.06, 0.12) * pow(m, 18.0) * 0.45;
        float cl = sin(vD.x * 7.0 + vD.z * 3.0) * sin(vD.z * 5.0 - vD.x * 2.0); c = mix(c, uMid * 1.6, smoothstep(0.55, 0.95, cl) * smoothstep(0.05, 0.4, y) * 0.35);
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false; mesh.name = 'sky';
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); };
  return mesh;
}
