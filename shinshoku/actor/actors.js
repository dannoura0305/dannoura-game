// 画面の中の役者：だんのうら（Player）・異形（EnemyActor）・相棒（Companion）。
// 状態機械（combat/fighter.js・ai/*.js）と見た目（actor/models.js・anim.js）をつなぐ。
import * as THREE from 'three';
import { Poser } from './rig.js';
import { dannouraPose, kiroPose, heitenPose, companionPose } from './anim.js';
import { Fighter } from '../combat/fighter.js';
import { COMBAT } from '../data/combat.js';
import { resolveCircle } from '../world/collide.js';

const DT = 1 / 60;
const angWrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const turnTo = (cur, want, rate) => cur + angWrap(want - cur) * Math.min(1, rate);

export class Player {
  constructor(model, opt) {
    this.model = model; this.root = new THREE.Group(); this.root.add(model.root); this.root.name = 'dannoura';
    this.poser = new Poser(model.J, model.rest || {});
    this.fighter = new Fighter(opt);
    this.pos = new THREE.Vector3(); this.yaw = Math.PI; this.r = 0.34;
    this.phase = 0; this.speed = 0; this.time = 0; this.moveDir = { x: 0, z: -1 }; this.dodgeDir = { x: 0, z: -1 };
    this.noise = 'none'; this.lunge = 0; this.issenInfo = null; this.tailVel = [0, 0, 0]; this.tailAng = [0, 0, 0];
    this.trailPts = [];
    this.setWeaponVisual();
  }
  setModel(model) {
    this.root.remove(this.model.root); this.model = model; this.root.add(model.root); this.poser = new Poser(model.J, model.rest || {}); this.setWeaponVisual();
  }
  setWeaponVisual() {
    const W = this.model.weapons; if (!W) return;
    const w = this.fighter.weapon, n = this.fighter.st.name;
    const swapping = n === 'swap';
    const katanaOut = (w === 'katana' && !swapping) || n === 'issen' || (swapping && this.fighter.st.f < this.fighter.st.total / 2 && this.fighter.st.from === 'katana');
    const gunOut = (w === 'handgun' && !swapping) || (swapping && this.fighter.st.f >= this.fighter.st.total / 2 && this.fighter.st.to === 'handgun') || (swapping && this.fighter.st.f < this.fighter.st.total / 2 && this.fighter.st.from === 'handgun');
    W.katana.visible = katanaOut && !gunOut; W.sheathed.visible = !W.katana.visible; W.gun.visible = gunOut; W.holster.visible = !gunOut;
  }
  /** 刀の根元と先（世界座標） */
  bladePoints() {
    const W = this.model.weapons; if (!W || !W.katana.visible) return null;
    const a = new THREE.Vector3(0, 0.12, 0), b = new THREE.Vector3(0, 0.88, 0);
    W.katana.localToWorld(a); W.katana.localToWorld(b); return [a, b];
  }
  muzzleWorld() { const W = this.model.weapons; const v = new THREE.Vector3(); if (W) W.muzzle.getWorldPosition(v); else v.copy(this.pos).add(new THREE.Vector3(0, 1.3, 0)); return v; }
  /** 見た目の更新（描画フレーム） */
  animate(dt, extra) {
    this.time += dt;
    const F = this.fighter;
    const ctx = { st: F.st, f: F.st.f, w: F.weapon, speed: this.speed, phase: this.phase, time: this.time, aiming: F.aimHeld && F.weapon === 'handgun', issen: this.issenInfo };
    const { pose, rate } = dannouraPose(ctx);
    if (extra && extra.aimPitch != null && ctx.aiming) { pose.rightUpperArm = [(pose.rightUpperArm || [0, 0, 0])[0] - extra.aimPitch, pose.rightUpperArm[1], pose.rightUpperArm[2]]; pose.leftUpperArm = [(pose.leftUpperArm || [0, 0, 0])[0] - extra.aimPitch, pose.leftUpperArm[1], pose.leftUpperArm[2]]; }
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.setWeaponVisual();
    // ポニーテールと上着のすその揺れ（ばね）
    if (this.model.tail) {
      const sw = Math.sin(this.time * 2.1) * 0.05 + this.speed * 0.06 + (F.st.name === 'dodge' ? 0.3 : 0);
      for (let i = 0; i < this.model.tail.length; i++) {
        const want = i === 0 ? -0.55 - sw : -0.12 - sw * 0.6;
        this.tailVel[i] += ((want - this.tailAng[i]) * 60 - this.tailVel[i] * 9) * dt;
        this.tailAng[i] += this.tailVel[i] * dt;
        this.model.tail[i].rotation.x = this.tailAng[i];
        this.model.tail[i].rotation.z = Math.sin(this.time * 1.7 + i) * 0.06 * (1 + this.speed * 0.2);
      }
      for (const t of this.model.tails) t.rotation.x = -Math.min(0.9, this.speed * 0.12 + (F.st.name === 'dodge' ? 0.5 : 0)) + Math.sin(this.time * 3) * 0.03;
    }
  }
}

export class EnemyActor {
  constructor(brain, model, opt = {}) {
    this.brain = brain; this.model = model; this.id = brain.id; this.kind = brain.kind;
    this.root = new THREE.Group(); this.root.add(model.root); this.root.name = this.id;
    this.poser = new Poser(model.J, model.rest || {});
    this.r = model.bodyR || 0.34; this.h = model.height || 1.7;
    this.phase = 0; this.speed = 0; this.time = Math.random() * 10; this.fade = 1; this.mark = null; this.opt = opt;
    this.y = 0;
    this.root.position.set(brain.pos.x, 0, brain.pos.z);
  }
  get pos() { return this.brain.pos; }
  hittable() { const b = this.brain; return b.alive && !b.immune() && this.root.visible; }
  /** 60Hz のステップ（dt は世界の時間） */
  step(dt, sense, boxes, player) {
    const b = this.brain;
    const out = b.update(dt, sense);
    let moved = 0;
    if (out.move) {
      const dx = out.move.x - b.pos.x, dz = out.move.z - b.pos.z, L = Math.hypot(dx, dz);
      if (L > 1e-4) {
        const m = Math.min(L, out.move.speed * dt);
        const before = { x: b.pos.x, z: b.pos.z };
        b.pos.x += dx / L * m; b.pos.z += dz / L * m;
        resolveCircle(b.pos, Math.min(this.r, 0.4), boxes);
        // プレイヤーと重ならない
        if (player && !player.fighter.dead) {
          const px = b.pos.x - player.pos.x, pz = b.pos.z - player.pos.z, d = Math.hypot(px, pz), min = this.r + player.r * 0.8;
          if (d < min && d > 1e-4) { b.pos.x = player.pos.x + px / d * min; b.pos.z = player.pos.z + pz / d * min; }
        }
        moved = Math.hypot(b.pos.x - before.x, b.pos.z - before.z);
      }
    }
    this.speed = dt > 0 ? moved / dt : 0;
    this.phase += moved * (this.kind === 'heiten' ? 2.6 : 3.4);
    if (out.face) b.yaw = turnTo(b.yaw, Math.atan2(out.face.x - b.pos.x, out.face.z - b.pos.z), (out.faceRate || 6) * Math.max(dt, 1e-4) * 1.4);
    return out;
  }
  animate(dt) {
    const b = this.brain; this.time += dt;
    const ctx = { state: b.state, t: b.t, sub: b.sub, speed: this.speed, phase: this.phase, atk: b.atk, atkDef: b.atk ? b.def.attacks[b.atk.name] : null, atStation: b.atStation, step: b.step && b.step.id, stepT: b.stepT };
    const { pose, rate } = this.kind === 'heiten' ? heitenPose(ctx) : kiroPose(ctx);
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    this.root.position.set(b.pos.x, this.y, b.pos.z); this.root.rotation.y = b.yaw;
    // 弱点の光：構えている時と予兆中に少し見える
    if (this.model.weak && this.model.weak.material.opacity !== undefined && this.kind === 'kiro') this.model.weak.material.opacity = this.weakGlow || 0;
  }
}

export class Companion {
  constructor(model) { this.model = model; this.root = new THREE.Group(); this.root.add(model.root); this.poser = new Poser(model.J, model.rest || {}); this.time = 0; this.talking = false; }
  setModel(model) { this.root.remove(this.model.root); this.model = model; this.root.add(model.root); this.poser = new Poser(model.J, model.rest || {}); }
  animate(dt) { this.time += dt; const { pose, rate } = companionPose({ time: this.time, talking: this.talking }); this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60)); }
}
export { DT, COMBAT };
