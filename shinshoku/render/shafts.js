// 安い「光の筋」（窓・格子・非常灯から差す光の帯）と、汚れ・しみの貼り物（デカール）。どちらも区画ごとに描画呼び出し 1 回。
// 光の筋：十字に交わる 2 枚の板を、上から下へ薄くなる加算の帯で描く。見る角度で縁を消す（板の端が見えないように）。霧も効く。
// しみ：1 枚の地図帳（水のしみ・黒ずみ・カビ・こすれ跡・足あと）をインスタンスの四角に貼る。血は使わない（Q13）。
import * as THREE from 'three';

const VS = `
attribute float aT; attribute float aU; attribute float aK; attribute vec3 aCol;
varying float vT; varying float vU; varying float vK; varying vec3 vCol; varying float vFog; varying vec3 vN; varying vec3 vV;
uniform float uFog;
void main(){
  vT = aT; vU = aU; vK = aK; vCol = aCol;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  vFog = exp(-uFog * uFog * mv.z * mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
varying float vT; varying float vU; varying float vK; varying vec3 vCol; varying float vFog; varying vec3 vN; varying vec3 vV;
uniform float uTime;
void main(){
  float edge = 1.0 - abs(vU * 2.0 - 1.0); edge = smoothstep(0.0, 0.6, edge);
  float along = pow(1.0 - vT, 1.4) * smoothstep(0.0, 0.08, vT);
  float face = pow(abs(dot(vN, vV)), 1.5);
  float dust = 0.82 + 0.18 * sin(vT * 23.0 + uTime * 0.7 + vU * 9.0) * sin(vT * 7.0 - uTime * 0.4);
  float a = edge * along * face * vK * dust;
  gl_FragColor = vec4(vCol * a * vFog, 1.0);
}`;

/** list：[{ p:[x,y,z]（上の点）, dir:[x,y,z]（下向き）, len, w0, w1, color, k }] */
export function lightShafts(list) {
  const pos = [], nrm = [], aT = [], aU = [], aK = [], col = [], idx = [];
  const up = new THREE.Vector3(), side = new THREE.Vector3(), d = new THREE.Vector3(), tmp = new THREE.Vector3();
  for (const s of list) {
    d.set(...(s.dir || [0, -1, 0])).normalize();
    const c = new THREE.Color(s.color ?? 0xbfd0ff), top = new THREE.Vector3(...s.p);
    for (let q = 0; q < 2; q++) {
      side.set(q ? 1 : 0, 0, q ? 0 : 1); side.sub(tmp.copy(d).multiplyScalar(side.dot(d))).normalize();
      up.copy(d).cross(side).normalize();
      const base = pos.length / 3, L = s.len || 4;
      for (let j = 0; j <= 4; j++) for (let i = 0; i <= 1; i++) {
        const t = j / 4, w = (s.w0 || 0.6) + ((s.w1 || 1.4) - (s.w0 || 0.6)) * t;
        const p = top.clone().addScaledVector(d, L * t).addScaledVector(side, (i - 0.5) * w);
        pos.push(p.x, p.y, p.z); nrm.push(up.x, up.y, up.z); aT.push(t); aU.push(i); aK.push(s.k ?? 0.35); col.push(c.r, c.g, c.b);
      }
      for (let j = 0; j < 4; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1)); g.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1)); g.setAttribute('aK', new THREE.Float32BufferAttribute(aK, 1)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const uniforms = { uFog: { value: 0.05 }, uTime: { value: 0 } };
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.name = 'light_shafts'; mesh.renderOrder = 6; mesh.frustumCulled = false;
  mesh.userData.shafts = true; mesh.userData.uniforms = uniforms;
  mesh.onBeforeRender = () => { uniforms.uTime.value = performance.now() / 1000; };
  return mesh;
}

let _stainTex = null;
/** しみの地図帳（4×2 の区画）。0 水のしみ 1 黒ずみ 2 カビ 3 こすれ跡 4 足あと 5 水たまり 6 ひび 7 貼り紙の跡 */
export function stainTex() {
  if (_stainTex) return _stainTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d', { willReadFrequently: true });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cell = (i, f) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); f(); g.restore(); };
  const blot = (x, y, r, a, col = '40,30,20') => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  cell(0, () => { for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(70,55,35,${0.35 - k * 0.08})`; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 64, 52 - k * 12 + rnd() * 6, 44 - k * 10, rnd(), 0, 7); g.stroke(); } blot(64, 64, 46, 0.18, '90,70,40'); });
  cell(1, () => { for (let k = 0; k < 14; k++) blot(20 + rnd() * 88, 20 + rnd() * 88, 10 + rnd() * 26, 0.22); });
  cell(2, () => { for (let k = 0; k < 60; k++) blot(10 + rnd() * 108, 10 + rnd() * 108, 2 + rnd() * 6, 0.35, '30,45,30'); });
  cell(3, () => { g.strokeStyle = 'rgba(20,18,16,.35)'; for (let k = 0; k < 18; k++) { g.lineWidth = 1 + rnd() * 3; g.beginPath(); const y = 20 + rnd() * 88; g.moveTo(8, y); g.quadraticCurveTo(64, y + (rnd() - 0.5) * 30, 120, y + (rnd() - 0.5) * 20); g.stroke(); } });
  cell(4, () => { g.fillStyle = 'rgba(30,26,22,.4)'; for (let k = 0; k < 4; k++) { const x = 30 + (k % 2) * 40, y = 110 - k * 28; g.beginPath(); g.ellipse(x, y, 9, 15, 0.1, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y - 18, 7, 6, 0, 0, 7); g.fill(); } });
  cell(5, () => { blot(64, 64, 60, 0.45, '10,14,26'); blot(50, 70, 30, 0.3, '10,14,26'); });
  cell(6, () => { g.strokeStyle = 'rgba(15,12,10,.6)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); let x = 64, y = 64; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } });
  cell(7, () => { g.fillStyle = 'rgba(200,190,160,.25)'; g.fillRect(24, 18, 80, 96); g.strokeStyle = 'rgba(60,50,40,.3)'; g.strokeRect(24, 18, 80, 96); for (const [x, y] of [[26, 20], [100, 20], [26, 110], [100, 110]]) blot(x, y, 5, 0.4); });
  _stainTex = new THREE.CanvasTexture(c); _stainTex.colorSpace = THREE.SRGBColorSpace;
  return _stainTex;
}
/** list：[{ p:[x,y,z], n:'floor'|'+x'|'-x'|'+z'|'-z', size, kind(0〜7), rot, k }] */
export function stainDecals(list) {
  const N = list.length; if (!N) return null;
  const g = new THREE.PlaneGeometry(1, 1);
  const ig = new THREE.InstancedBufferGeometry(); ig.index = g.index; ig.setAttribute('position', g.attributes.position); ig.setAttribute('uv', g.attributes.uv);
  const off = new Float32Array(N * 3); const mats = []; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
  list.forEach((s, i) => { off[i * 3] = (s.kind % 4) / 4; off[i * 3 + 1] = Math.floor(s.kind / 4) / 2; off[i * 3 + 2] = s.k ?? 1; });
  ig.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: stainTex() }, uFog: { value: 0.05 }, fogColor: { value: new THREE.Color(0) } },
    vertexShader: `attribute vec3 iOff; varying vec2 vUv; varying float vK; varying float vFog; uniform float uFog;
      void main(){ vUv = vec2(iOff.x + uv.x * 0.25, 1.0 - (iOff.y + (1.0 - uv.y) * 0.5)); vK = iOff.z; vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vFog = exp(-uFog * uFog * mv.z * mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vK; varying float vFog; void main(){ vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb, c.a * vK * (0.35 + 0.65 * vFog)); }`,
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.InstancedMesh(ig, m, N);
  list.forEach((s, i) => {
    const n = s.n || 'floor', r = s.rot || 0;
    if (n === 'floor') E.set(-Math.PI / 2, 0, r); else if (n === 'ceil') E.set(Math.PI / 2, 0, r); else if (n === '+x') E.set(0, Math.PI / 2, r); else if (n === '-x') E.set(0, -Math.PI / 2, r); else if (n === '+z') E.set(0, 0, r); else E.set(0, Math.PI, r);
    Q.setFromEuler(E); const sz = s.size || 1; S.set(sz, sz * (s.aspect || 1), 1); P.set(...s.p); if (n === 'floor') P.y = Math.max(P.y, 0.012);
    M.compose(P, Q, S); mesh.setMatrixAt(i, M);
  });
  mesh.name = 'stains'; mesh.renderOrder = 2; mesh.frustumCulled = false; mesh.userData.stains = true; void mats;
  return mesh;
}
