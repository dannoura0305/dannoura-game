// 境界侵食 P12：地面（y＝0）の映り込み（PC の高い段：ultra・high）。鏡に映したカメラで場面を半分の解像度に描き、
// 濡れた道・水たまり・磨いた床（アーケード・体育館・病院）の PBR の材質（envmat.js）が、粗さと濡れに合わせて読む。
// 地面より下は斜めの切り取りの面で描かない（用水路の底・下敷きが映らない）。映す時は雨・光の筋・雨の跳ねを隠す。
// 映した絵は色の調整の前の値（映す描画では envmat の色の調整を止める＝二重にかけない）。スマホ・中・低では作らない（キューブの映り込み＝IBL だけ）。
import * as THREE from 'three';
import { U } from './envmat.js';


export class GroundReflection {
  constructor(scale = 0.5) {
    this.scale = scale;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
    this.rt.texture.colorSpace = THREE.LinearSRGBColorSpace; this.rt.texture.generateMipmaps = false;
    this.cam = new THREE.PerspectiveCamera(); this.hide = [];
    this._p = new THREE.Plane(); this._v = new THREE.Vector3(); this._t = new THREE.Vector3(); this._q = new THREE.Vector4(); this._c = new THREE.Vector4();
    this.bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    U.uRefl.value = this.rt.texture;
  }
  setSize(w, h, pr) { this.rt.setSize(Math.max(4, Math.floor(w * pr * this.scale)), Math.max(4, Math.floor(h * pr * this.scale))); }
  /** 場面を鏡に映して描く。hide：映さない物（雨など） */
  render(renderer, scene, camera, hide = []) {
    const cam = this.cam, src = camera;
    if (src.position.y < 0.05) { U.uReflOn.value = 0; return; }
    // 鏡のカメラ（y を反転：three.js の Reflector と同じ作り方）
    cam.fov = src.fov; cam.aspect = src.aspect; cam.near = src.near; cam.far = src.far;
    cam.position.set(src.position.x, -src.position.y, src.position.z);
    src.getWorldDirection(this._v); this._t.copy(src.position).add(this._v); this._t.y = -this._t.y;
    cam.up.set(0, 1, 0).applyQuaternion(src.quaternion); cam.up.y = -cam.up.y;
    cam.lookAt(this._t); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    // 斜めの切り取り（y＝0.02 より下を描かない）
    this._p.set(new THREE.Vector3(0, 1, 0), -0.02).applyMatrix4(cam.matrixWorldInverse);
    const cp = this._c.set(this._p.normal.x, this._p.normal.y, this._p.normal.z, this._p.constant), P = cam.projectionMatrix.elements, q = this._q;
    q.x = (Math.sign(cp.x) + P[8]) / P[0]; q.y = (Math.sign(cp.y) + P[9]) / P[5]; q.z = -1.0; q.w = (1.0 + P[10]) / P[14];
    cp.multiplyScalar(2.0 / cp.dot(q)); P[2] = cp.x; P[6] = cp.y; P[10] = cp.z + 1.0; P[14] = cp.w;
    U.uReflMat.value.copy(this.bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    const vis = hide.map(o => o && o.visible); hide.forEach(o => { if (o) o.visible = false; });
    U.uReflOn.value = 0; U.uGradeOn.value = 0;
    const prev = renderer.getRenderTarget(), ac = renderer.info.autoReset; renderer.info.autoReset = false;
    renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene, cam); renderer.setRenderTarget(prev);
    renderer.info.autoReset = ac;
    hide.forEach((o, i) => { if (o) o.visible = vis[i]; });
    U.uReflOn.value = 1; U.uGradeOn.value = 1;
  }
}
