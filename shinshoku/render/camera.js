// 三人称カメラ：ふだんは追従（少し右肩）、構えると肩越しに寄る。壁に当たると手前に寄せる。ロックオンで敵の方へ回る。揺れ。
import * as THREE from 'three';
import { rayBoxes } from '../world/collide.js';

export class ThirdPersonCamera {
  constructor(camera) {
    this.cam = camera; this.yaw = Math.PI; this.pitch = 0.18; this.dist = 4.0;
    this.aimT = 0; this.shakeT = 0; this.shakeA = 0; this.cur = new THREE.Vector3(); this.first = true;
    this.pivot = new THREE.Vector3(); this.fovBase = 62; this.curDist = 4;
  }
  shake(a, t = 0.25) { a *= this.shakeMul ?? 1; if (a <= 0) return; if (a > this.shakeA * (this.shakeT > 0 ? 1 : 0)) { this.shakeA = a; this.shakeT = t; this.shakeD = t; } }
  /** dt：実時間。target：プレイヤーの位置。aim：構え中。lock：ロックオンの相手の位置 */
  update(dt, target, look, boxes, opt = {}) {
    this.yaw -= look.x; this.pitch = Math.max(-0.55, Math.min(0.85, this.pitch + look.y * (this.invertY ? -1 : 1)));
    if (opt.lock) {
      const want = Math.atan2(target.x - opt.lock.x, target.z - opt.lock.z);
      let d = want - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.yaw += d * Math.min(1, dt * 6);
      this.pitch += (0.22 - this.pitch) * Math.min(1, dt * 3);
    }
    this.aimT += ((opt.aim ? 1 : 0) - this.aimT) * Math.min(1, dt * 14);
    const a = this.aimT, sc = opt.scale || 1;                       // sc：巨大猫又の縮尺（遠め・高め）
    const dist = ((opt.indoor ? 3.0 : this.dist) * (1 - a) + 1.55 * a) * sc;
    const shoulder = (0.35 * (1 - a) + 0.62 * a) * (sc > 1 ? 0.4 : 1);
    const height = (1.5 * (1 - a) + 1.55 * a) * (sc > 1 ? sc * 0.95 : 1);
    this.pivot.set(target.x, target.y + height, target.z);
    // 右肩へのずらし（カメラの右）
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const piv = new THREE.Vector3(this.pivot.x + rx * shoulder, this.pivot.y, this.pivot.z + rz * shoulder);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // 壁に当たらない距離
    const hit = rayBoxes(this.pivot, new THREE.Vector3(rx, 0, rz), shoulder, boxes);
    if (hit < shoulder) piv.set(this.pivot.x + rx * Math.max(0, hit - 0.25), this.pivot.y, this.pivot.z + rz * Math.max(0, hit - 0.25));
    // P17：床と天井（opt.range(x, z) → [下, 上]）。下を向いて床にもぐる・見上げて天井や 2 階の床を抜ける代わりに、床と天井の間を滑らせる（向きを平らに寄せる）
    if (opt.range) {
      const want0 = dist, hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz) || 1;
      let cy = piv.y + dir.y * want0;
      const cx = piv.x + dir.x * want0, cz = piv.z + dir.z * want0;
      const r = opt.range(cx, cz) || [0.3, Infinity];
      const lo = Math.min(r[0], piv.y - 0.05), hi = Math.max(r[1], piv.y + 0.05);
      if (cy < lo || cy > hi) {
        cy = Math.max(lo, Math.min(hi, cy));
        const dy = cy - piv.y, hd = Math.sqrt(Math.max(0.01, want0 * want0 - dy * dy));
        dir.set(hx / hl * hd, dy, hz / hl * hd).normalize();
      }
    }
    // 光線を 5 本（真ん中・上下左右に 0.16m ずらした物）＝カメラの近い面の大きさの球を押し出す代わり。狭い部屋・階段で壁の中が映らない
    const ux = -dir.x * dir.y, uy = dir.x * dir.x + dir.z * dir.z, uz = -dir.z * dir.y, ul = Math.hypot(ux, uy, uz) || 1;
    const sx = dir.z, sz = -dir.x, sl = Math.hypot(sx, sz) || 1, R = 0.1;
    let t = rayBoxes(piv, dir, dist, boxes) - 0.22;
    for (const [a, b] of [[R, 0], [-R, 0], [0, R], [0, -R]]) {
      const o = { x: piv.x + sx / sl * a + ux / ul * b, y: piv.y + uy / ul * b, z: piv.z + sz / sl * a + uz / ul * b };
      t = Math.min(t, rayBoxes(o, dir, dist, boxes) - 0.08);
    }
    const want = Math.max(0.6 * sc, Math.min(dist, t));
    this.curDist = want < this.curDist ? want : this.curDist + (want - this.curDist) * Math.min(1, dt * 4);
    const pos = piv.clone().addScaledVector(dir, this.curDist);
    // 近すぎる（壁の角に押された）時：見下ろしの向きへ少し上げる（顔の真後ろに張り付かない）
    if (this.curDist < 1.1 * sc && opt.range) { const r = opt.range(pos.x, pos.z) || [0.3, Infinity]; pos.y = Math.min(Math.max(r[0], pos.y + (1.1 * sc - this.curDist) * 0.35), Math.max(r[1], piv.y)); }
    if (this.shakeT > 0) {
      this.shakeT -= dt; const k = this.shakeA * Math.max(0, this.shakeT / this.shakeD);
      pos.x += (Math.random() - 0.5) * k; pos.y += (Math.random() - 0.5) * k; pos.z += (Math.random() - 0.5) * k;
    }
    this.cam.position.copy(pos);
    this.cam.lookAt(piv.x - dir.x * 10, piv.y - dir.y * 10, piv.z - dir.z * 10);
    const fov = this.fovBase - 14 * a + (opt.fovKick || 0);
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
  }
  /** カメラの前方（水平） */
  forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }
}
