// 後処理（PC の高い段だけ：段の post）：場面を HDR（半精度）の絵に描き → 明るい所を縮めてぼかす（ブルーム・弱め）→ 合成でトーンマップ・周辺減光・少しの色の調整。
// 外の部品（EffectComposer）は vendor に無いので、小さく自前で持つ（全部で 1+2×段数+1 回の描画）。
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BRIGHT = `uniform sampler2D tSrc; uniform float uThresh; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(c * smoothstep(uThresh, uThresh * 2.0, l), 1.0); }`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270;
  s += (texture2D(tSrc, vUv + uDir * 1.3846153).rgb + texture2D(tSrc, vUv - uDir * 1.3846153).rgb) * 0.3162162;
  s += (texture2D(tSrc, vUv + uDir * 3.2307692).rgb + texture2D(tSrc, vUv - uDir * 3.2307692).rgb) * 0.0702703;
  gl_FragColor = vec4(s, 1.0); }`;
const COMP = `uniform sampler2D tSrc; uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform float uBloom; uniform float uVig; uniform vec2 uRes; uniform float uFxaa; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 fxaa(vec2 uv){
  vec2 px = 1.0 / uRes; vec3 cM = texture2D(tSrc, uv).rgb;
  float lM = lum(cM), lN = lum(texture2D(tSrc, uv + vec2(0.0, px.y)).rgb), lS = lum(texture2D(tSrc, uv - vec2(0.0, px.y)).rgb), lE = lum(texture2D(tSrc, uv + vec2(px.x, 0.0)).rgb), lW = lum(texture2D(tSrc, uv - vec2(px.x, 0.0)).rgb);
  float mn = min(lM, min(min(lN, lS), min(lE, lW))), mx = max(lM, max(max(lN, lS), max(lE, lW)));
  if (mx - mn < max(0.04, mx * 0.12)) return cM;
  vec2 dir = vec2(-((lN + lS) - (lE + lW)) * 0.0, 0.0); dir = vec2(-(lN - lS), (lE - lW)); dir = normalize(dir + 1e-5) * px * 1.2;
  vec3 a = 0.5 * (texture2D(tSrc, uv + dir * -0.33).rgb + texture2D(tSrc, uv + dir * 0.33).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tSrc, uv + dir * -1.0).rgb + texture2D(tSrc, uv + dir).rgb);
  float lb = lum(b); return (lb < mn || lb > mx) ? a : b;
}
void main(){
  vec3 c = uFxaa > 0.5 ? fxaa(vUv) : texture2D(tSrc, vUv).rgb;
  vec3 b = texture2D(tB0, vUv).rgb * 0.5 + texture2D(tB1, vUv).rgb * 0.35 + texture2D(tB2, vUv).rgb * 0.25;
  c += b * uBloom;
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
  c *= mix(1.0, smoothstep(0.95, 0.25, length(q)), uVig);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // 色の量子化の帯を減らす小さな揺らぎ
  gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
}`;

export class Post {
  constructor(renderer, P) {
    this.r = renderer; this.P = P;
    const ht = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const opt = { type: ht, depthBuffer: true, samples: P.post && P.post.msaa ? 4 : 0 };   // MSAA は ultra だけ（high は合成の FXAA）
    this.main = new THREE.WebGLRenderTarget(4, 4, opt); this.main.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.levels = [0, 1, 2].map(() => [new THREE.WebGLRenderTarget(4, 4, { type: ht, depthBuffer: false }), new THREE.WebGLRenderTarget(4, 4, { type: ht, depthBuffer: false })]);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
    this.quad = quad; this.cam = new THREE.Camera(); this.sc = new THREE.Scene(); this.sc.add(quad);
    const mk = (fs, u, tm = false) => { const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false }); m.toneMapped = tm; return m; };
    this.mBright = mk(BRIGHT, { tSrc: { value: null }, uThresh: { value: 1.1 } });
    this.mBlur = mk(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mComp = mk(COMP, { tSrc: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uBloom: { value: P.post && P.post.bloom ? 0.32 : 0 }, uVig: { value: P.post && P.post.vignette ? 0.38 : 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uFxaa: { value: P.post && !P.post.msaa ? 1 : 0 } }, true);
  }
  setSize(w, h) {
    const pr = this.r.getPixelRatio(), W = Math.max(4, Math.floor(w * pr)), H = Math.max(4, Math.floor(h * pr));
    this.main.setSize(W, H);
    this.levels.forEach((L, i) => { const d = 2 ** (i + 1); for (const t of L) t.setSize(Math.max(2, W / d >> 0), Math.max(2, H / d >> 0)); });
    this.mComp.uniforms.uRes.value.set(W, H);
  }
  _pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.sc, this.cam); }
  render(scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.main); r.render(scene, camera);
    const calls = r.info.render.calls, tris = r.info.render.triangles;
    const ac = r.info.autoReset; r.info.autoReset = false;
    let src = this.main.texture;
    this.mBright.uniforms.tSrc.value = src; this._pass(this.mBright, this.levels[0][0]); src = this.levels[0][0].texture;
    this.levels.forEach((L, i) => {
      if (i > 0) { this.mBlur.uniforms.tSrc.value = src; this.mBlur.uniforms.uDir.value.set(0, 0); this._pass(this.mBlur, L[0]); }
      const w = L[0].width, h = L[0].height;
      this.mBlur.uniforms.tSrc.value = L[0].texture; this.mBlur.uniforms.uDir.value.set(1 / w, 0); this._pass(this.mBlur, L[1]);
      this.mBlur.uniforms.tSrc.value = L[1].texture; this.mBlur.uniforms.uDir.value.set(0, 1 / h); this._pass(this.mBlur, L[0]);
      src = L[0].texture;
    });
    const u = this.mComp.uniforms; u.tSrc.value = this.main.texture; u.tB0.value = this.levels[0][0].texture; u.tB1.value = this.levels[1][0].texture; u.tB2.value = this.levels[2][0].texture;
    this._pass(this.mComp, null);
    r.info.autoReset = ac;
    return { calls: r.info.render.calls, sceneCalls: calls, tris };
  }
}
