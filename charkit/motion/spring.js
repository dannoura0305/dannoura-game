// charkit の揺れ物（SpringBone）：VRM の SpringBone と同じ考え方（骨の先の点を慣性・ばね・重力で動かし、骨をその向きへ回す）。
// docs/wakaba-charkit/13 §1.2：行き過ぎの上限（maxAngleDeg）・体の当たり（球・カプセル）・落ち着くまでの時間（settleS）。
// ・刻みは固定（hz：60／スマホ低 30）。描画の dt が大きくても刻みを分けて解く（発散しない）。1 回の dt は 0.1 秒で打ち切る
// ・根（キャラクター）が 1 フレームで大きく飛んだ（teleport・網の差し替え）ら、揺れを休みの形へ戻す
// ・鎖ごとに「動かす休みの形」（drive(i, time) → 追加の回転：尾を振るなど）を足せる
// 骨は THREE.Bone（Object3D）なら何でもよい（コードで組むキャラクター・VRM のどちらでも）。
import * as THREE from 'three';


/**
 * chains：[{ name, bones:[Bone…]（根から先へ）, tail:[x,y,z]（最後の骨の先＝最後の骨の中の位置。省くと 1 つ前の骨の長さで同じ向き）,
 *            stiffness（1/s：休みの形へ戻る強さ。VRM の stiffiness）, drag（0〜1）, gravity（m/s²）, gravityDir:[x,y,z], radius（当たりの太さ m）,
 *            maxAngleDeg, drive(i, time)→Quaternion|null, inertia（根の動きをどれだけ受けるか 0〜1・既定 1）, main（スマホ低でも動かす主な鎖）}]
 * colliders：[{ bone, offset:[x,y,z], radius, tail?:[x,y,z]（あればカプセル：offset〜tail） }]
 */
export class SpringBones {
  constructor(chains = [], colliders = [], opt = {}) {
    this.hz = opt.hz || 60; this.time = 0; this.acc = 0; this.enabled = true; this.mainOnly = !!opt.mainOnly;
    this.colliders = colliders.map(c => ({ bone: c.bone, offset: new THREE.Vector3(...(c.offset || [0, 0, 0])), tail: c.tail ? new THREE.Vector3(...c.tail) : null, radius: c.radius || 0.05, a: new THREE.Vector3(), b: new THREE.Vector3() }));
    this.chains = chains.map(c => this.makeChain(c));
    this.stats = { maxAngleDeg: 0, penetrationM: 0, steps: 0, resets: 0, jointSteps: 0, deepSteps: 0 };
    this.lastRoot = null;
  }
  makeChain(c) {
    const joints = [];
    c.bones.forEach((b, i) => {
      const next = c.bones[i + 1];
      let axis;
      if (next) axis = next.position.clone();
      else if (c.tail) axis = new THREE.Vector3(...c.tail);
      else axis = c.bones[i].position.clone().normalize().multiplyScalar(Math.max(0.03, c.bones[i].position.length()));
      const len = Math.max(1e-4, axis.length());
      joints.push({ b, q0: b.quaternion.clone(), axis: axis.clone().normalize(), len, tail: new THREE.Vector3(), prev: new THREE.Vector3(), init: false });
    });
    return Object.assign({ stiffness: 1.2, drag: 0.4, gravity: 0, gravityDir: [0, -1, 0], radius: 0.02, maxAngleDeg: 70, inertia: 1 }, c, { joints, gdir: new THREE.Vector3(...(c.gravityDir || [0, -1, 0])).normalize() });
  }
  /** 揺れを休みの形へ戻す（網の差し替え・瞬間移動のあと） */
  reset() {
    for (const ch of this.chains) for (const j of ch.joints) { j.b.quaternion.copy(j.q0); j.init = false; }
    this.stats.resets++;
  }
  /** rootPos：キャラクターの根の位置、rootQuat：根の向き（大きな飛び・急な向き替えの判定）。dt：秒 */
  update(dt, rootPos = null, rootQuat = null) {
    if (!this.enabled || !this.chains.length) return;
    if (rootPos) {
      if (this.lastRoot && this.lastRoot.distanceToSquared(rootPos) > 1.0) this.reset();
      (this.lastRoot || (this.lastRoot = new THREE.Vector3())).copy(rootPos);
    }
    if (rootQuat) {
      if (this.lastQ && Math.abs(this.lastQ.dot(rootQuat)) < 0.87) this.reset();      // 1 フレームで 60° を超える向き替え（場面の切り替え）
      (this.lastQ || (this.lastQ = new THREE.Quaternion())).copy(rootQuat);
    }
    const h = 1 / this.hz;
    this.acc = Math.min(this.acc + Math.min(Math.max(dt, 0), 0.1), 0.1 + h);
    let n = 0;
    while (this.acc >= h && n < 8) { this.step(h); this.acc -= h; n++; }
    if (n === 0) this.pose();   // 刻みが来なくても骨の向きは今の先の点で合わせる（親が動いた分）
  }
  updateColliders() {
    for (const c of this.colliders) {
      c.a.copy(c.offset).applyMatrix4(c.bone.matrixWorld);
      if (c.tail) c.b.copy(c.tail).applyMatrix4(c.bone.matrixWorld);
    }
  }
  /** 1 刻み */
  step(h) {
    this.time += h; this.stats.steps++;
    for (const ch of this.chains) if (ch.bones[0] && ch.bones[0].parent) ch.bones[0].parent.updateWorldMatrix(true, false);
    this.updateColliders();
    for (const ch of this.chains) {
      if (this.mainOnly && !ch.main) { for (const j of ch.joints) j.b.quaternion.copy(j.q0); continue; }
      this.stepChain(ch, h);
    }
  }
  restQuat(ch, i, j, out) {
    out.copy(j.q0);
    if (ch.drive) { const d = ch.drive(i, this.time); if (d) out.multiply(d); }
    return out;
  }
  stepChain(ch, h) {
    const maxA = (ch.maxAngleDeg ?? 70) * Math.PI / 180;
    const T = this._t || (this._t = { head: new THREE.Vector3(), rd: new THREE.Vector3(), next: new THREE.Vector3(), dir: new THREE.Vector3(), ax: new THREE.Vector3(), s: new THREE.Vector3(), pq: new THREE.Quaternion(), rw: new THREE.Quaternion(), rq: new THREE.Quaternion(), p: new THREE.Vector3() });
    for (let i = 0; i < ch.joints.length; i++) {
      const j = ch.joints[i], b = j.b, par = b.parent;
      par.updateWorldMatrix(false, false);
      const head = T.head.copy(b.position).applyMatrix4(par.matrixWorld);
      par.matrixWorld.decompose(T.p, T.pq, T.s);                         // 親の世界の回転
      const sc = (T.s.x + T.s.y + T.s.z) / 3;
      const restW = T.rw.copy(T.pq).multiply(this.restQuat(ch, i, j, T.rq));
      const rd = T.rd.copy(j.axis).applyQuaternion(restW);                // 休みの向き（世界）
      const L = j.len * sc;
      if (!j.init) { j.tail.copy(head).addScaledVector(rd, L); j.prev.copy(j.tail); j.init = true; }
      const k = Math.min(1, ch.stiffness * h), dr = 1 - ch.drag, gi = ch.gravity * h * h;
      const next = T.next.set(
        j.tail.x + (j.tail.x - j.prev.x) * dr * ch.inertia + (head.x + rd.x * L - j.tail.x) * k + ch.gdir.x * gi,
        j.tail.y + (j.tail.y - j.prev.y) * dr * ch.inertia + (head.y + rd.y * L - j.tail.y) * k + ch.gdir.y * gi,
        j.tail.z + (j.tail.z - j.prev.z) * dr * ch.inertia + (head.z + rd.z * L - j.tail.z) * k + ch.gdir.z * gi);
      const fix = () => { T.dir.copy(next).sub(head); const l = T.dir.length(); if (l < 1e-6) T.dir.copy(rd); else T.dir.divideScalar(l); next.copy(head).addScaledVector(T.dir, L); };
      fix();
      const clamp = () => {
        const a = Math.acos(Math.max(-1, Math.min(1, T.dir.dot(rd))));
        if (a > maxA) { T.ax.crossVectors(rd, T.dir); const al = T.ax.length(); if (al > 1e-6) T.dir.copy(rd).applyAxisAngle(T.ax.divideScalar(al), maxA); else T.dir.copy(rd); next.copy(head).addScaledVector(T.dir, L); }
      };
      clamp();
      for (const c of this.colliders) {
        const r = c.radius + ch.radius;
        let cx = c.a.x, cy = c.a.y, cz = c.a.z;
        if (c.tail) {
          const sx = c.b.x - c.a.x, sy = c.b.y - c.a.y, sz = c.b.z - c.a.z, ss = sx * sx + sy * sy + sz * sz;
          const t = ss > 1e-9 ? Math.max(0, Math.min(1, ((next.x - c.a.x) * sx + (next.y - c.a.y) * sy + (next.z - c.a.z) * sz) / ss)) : 0;
          cx += sx * t; cy += sy * t; cz += sz * t;
        }
        const dx = next.x - cx, dy = next.y - cy, dz = next.z - cz, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r * r) { const d = Math.sqrt(d2) || 1e-6; next.set(cx + dx / d * r, cy + dy / d * r, cz + dz / d * r); fix(); }
      }
      // 行き過ぎの上限
      let ang = Math.acos(Math.max(-1, Math.min(1, T.dir.dot(rd))));
      if (ang > maxA) {
        T.ax.crossVectors(rd, T.dir); const al = T.ax.length();
        if (al > 1e-6) T.dir.copy(rd).applyAxisAngle(T.ax.divideScalar(al), maxA); else T.dir.copy(rd);
        next.copy(head).addScaledVector(T.dir, L); ang = maxA;
      }
      if (!Number.isFinite(next.x + next.y + next.z)) { j.init = false; b.quaternion.copy(j.q0); continue; }
      // 当たりの深さ（直した後に残るもの：計測）
      let deep = false;
      for (const c of this.colliders) {
        let cx = c.a.x, cy = c.a.y, cz = c.a.z;
        if (c.tail) { const sx = c.b.x - c.a.x, sy = c.b.y - c.a.y, sz = c.b.z - c.a.z, ss = sx * sx + sy * sy + sz * sz; const t = ss > 1e-9 ? Math.max(0, Math.min(1, ((next.x - c.a.x) * sx + (next.y - c.a.y) * sy + (next.z - c.a.z) * sz) / ss)) : 0; cx += sx * t; cy += sy * t; cz += sz * t; }
        const pen = c.radius - Math.hypot(next.x - cx, next.y - cy, next.z - cz); if (pen > this.stats.penetrationM) this.stats.penetrationM = pen; if (pen > 0.005) deep = true;
      }
      this.stats.jointSteps++; if (deep) this.stats.deepSteps++;
      this.stats.maxAngleDeg = Math.max(this.stats.maxAngleDeg, ang * 180 / Math.PI);
      j.prev.copy(j.tail); j.tail.copy(next);
      this.aim(j, par, restW);
    }
  }
  /** 骨を先の点へ向ける（restW：休みの世界の回転） */
  aim(j, par, restW) {
    const A = this._a || (this._a = { head: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), q: new THREE.Quaternion(), pq: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() });
    const b = j.b;
    A.head.copy(b.position).applyMatrix4(par.matrixWorld);
    A.from.copy(j.axis).applyQuaternion(restW).normalize();
    A.to.copy(j.tail).sub(A.head).normalize();
    A.q.setFromUnitVectors(A.from, A.to).multiply(restW);
    par.matrixWorld.decompose(A.p, A.pq, A.s);
    b.quaternion.copy(A.pq.invert().multiply(A.q));
    b.updateMatrixWorld(true);
  }
  /** 刻みの無いフレーム：今の先の点で骨を合わせ直す */
  pose() {
    const P = this._p || (this._p = { p: new THREE.Vector3(), s: new THREE.Vector3(), pq: new THREE.Quaternion(), rq: new THREE.Quaternion() });
    for (const ch of this.chains) {
      if (this.mainOnly && !ch.main) continue;
      if (ch.bones[0] && ch.bones[0].parent) ch.bones[0].parent.updateWorldMatrix(true, false);
      ch.joints.forEach((j, i) => { if (!j.init) return; const par = j.b.parent; par.updateWorldMatrix(false, false); par.matrixWorld.decompose(P.p, P.pq, P.s); const restW = new THREE.Quaternion().copy(P.pq).multiply(this.restQuat(ch, i, j, P.rq)); this.aim(j, par, restW); });
    }
  }
  /** 各関節の休みの向きからの角度（度）の最大（試験・計測用） */
  angles() {
    const out = [];
    for (const ch of this.chains) for (const j of ch.joints) out.push(2 * Math.acos(Math.min(1, Math.abs(j.b.quaternion.dot(j.q0)))) * 180 / Math.PI);
    return out;
  }
}
