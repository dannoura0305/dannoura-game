// 夜空（紫と赤の遠い空：イメージ資料 concept_01）。球の内側に色の段差・雲・月を描くだけ（描画 1 回・霧なし）。
// opt.mountains：遠い山なみ（雪の残る稜線。北陸の町らしさ：場所は決めない）。opt.clouds：雲の濃さ（0〜1）。
import * as THREE from 'three';
export function skyDome(opt = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(opt.top ?? 0x07050e) }, uMid: { value: new THREE.Color(opt.mid ?? 0x1c0c2a) }, uHor: { value: new THREE.Color(opt.horizon ?? 0x4a1424) }, uMoon: { value: new THREE.Vector3(...(opt.moon || [0.5, 0.32, -0.8])).normalize() }, uMount: { value: opt.mountains ? 1 : 0 }, uCloud: { value: opt.clouds ?? 0.6 }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uMid, uHor, uMoon; uniform float uMount, uCloud, uTime; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){ float y = clamp(vD.y, -0.2, 1.0);
        vec3 c = y < 0.18 ? mix(uHor, uMid, smoothstep(-0.05, 0.18, y)) : mix(uMid, uTop, smoothstep(0.18, 0.7, y));
        float m = max(0.0, dot(vD, uMoon));
        // 雲（月の明かりで縁が明るい）
        vec2 cp = vD.xz / (vD.y + 0.25) * 1.6 + vec2(uTime * 0.004, 0.0);
        float cl = smoothstep(0.48, 0.78, fbm(cp)) * smoothstep(0.02, 0.3, y) * uCloud;
        vec3 cc = mix(uMid * 1.25, vec3(0.42, 0.30, 0.48), pow(m, 6.0) * 0.8);
        c = mix(c, cc, cl * 0.85);
        // 月（雲が前にあれば隠れる）
        c += (vec3(0.75, 0.12, 0.18) * pow(m, 260.0) * 1.4 + vec3(0.35, 0.06, 0.12) * pow(m, 18.0) * 0.45) * (1.0 - cl * 0.8);
        // 星（雲の無い所に少し）
        float st = step(0.9985, h(floor(vD.xz / (vD.y + 0.3) * 160.0))) * smoothstep(0.25, 0.6, y) * (1.0 - cl);
        c += vec3(0.6, 0.55, 0.75) * st * 0.6;
        // 遠い山なみ
        if (uMount > 0.5) {
          float a = atan(vD.z, vD.x);
          float mh = 0.05 + 0.045 * sin(a * 2.0 + 1.3) + 0.03 * sin(a * 5.1 + 0.4) + 0.014 * sin(a * 13.7) + 0.006 * sin(a * 31.0);
          mh *= 0.75 + 0.25 * sin(a + 2.2);
          if (vD.y < mh) {
            vec3 mc = mix(uHor * 0.55, vec3(0.10, 0.08, 0.16), 0.6);
            float snow = smoothstep(mh - 0.018, mh - 0.004, vD.y) * smoothstep(0.075, 0.1, mh);
            mc = mix(mc, vec3(0.34, 0.30, 0.42), snow * 0.55);
            c = mix(c, mc, smoothstep(mh, mh - 0.004, vD.y));
          }
          c = mix(c, uHor * 0.9, smoothstep(0.06, -0.02, vD.y) * 0.5);
        }
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false; mesh.name = 'sky';
  mesh.onBeforeRender = (r, s, cam) => { mesh.position.copy(cam.position); m.uniforms.uTime.value = performance.now() / 1000; };
  return mesh;
}
