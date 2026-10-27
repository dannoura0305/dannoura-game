// 画面の中の役者：だんのうら（Player）・異形（EnemyActor）・相棒（CompanionActor）・町の人（CivilianActor）。
// 状態機械（combat/fighter.js・ai/*.js）と見た目（actor/models.js・anim.js）をつなぐ。
// 手続きアニメの上に重ねる層：まばたき・ポニーテールと燕尾のばね・当たった時のひるみ（体のねじれ）・当たった光・黒い霧への崩れ。
import * as THREE from 'three';
import { Poser } from './rig.js';
import { dannouraPose, kiroPose, heitenPose, shuuyouPose, companionPose, civilianPose, rollAt, phaseRate, footfall } from './anim.js';
import { attachRigidWeapons } from './models.js';
import { heroPhaseRate, plantFeet, legDims } from './anim8.js';
import { LocoDriver } from '../../charkit/anim/locodriver.js';
import { groundClamp } from '../../charkit/anim/loco.js';
import { FaceDriver, codeFaceAdapter, vrmFaceAdapter } from '../../charkit/face/driver.js';
import { Fighter } from '../combat/fighter.js';
import { COMBAT } from '../data/combat.js';
import { resolveCircle } from '../world/collide.js';

const DT = 1 / 60;
const angWrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const turnTo = (cur, want, rate) => cur + angWrap(want - cur) * Math.min(1, rate);
const HIDE = 1e-4;

const _lv1 = new THREE.Vector3(), _lv2 = new THREE.Vector3(), _lq = new THREE.Quaternion(), _lq2 = new THREE.Quaternion(), _le = new THREE.Euler();
const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
/** 見る先（Vector3 か 役者：頭の骨の位置） */
function lookPoint(t, out) {
  if (!t) return null;
  if (t.isVector3) return out.copy(t);
  const m = t.model, J = m && m.J;
  if (J && J.head) { J.head.getWorldPosition(out); out.y += (m.height || 1.6) * 0.05; return out; }
  if (t.root) { t.root.getWorldPosition(out); out.y += 1.5; return out; }
  return null;
}
/** 共通：まばたき・ひるみ・当たった光（v2 のモデル・VRM は charkit の顔の係：瞬き・文字の口・視線） */
class Looks {
  constructor(model) {
    this.model = model; this.blinkT = 2 + Math.random() * 3; this.blink = 0; this.flinch = { x: 0, y: 0, vx: 0, vy: 0 }; this.flashT = 0;
    this.face = model.v2 && model.mats && model.mats.face ? new FaceDriver(codeFaceAdapter(model), { seed: (Math.random() * 1e6) | 0, blinkPerMin: model.kind === 'dannoura' || model.white ? 14 : 18 })
      : model.isVRM && model.vrm ? new FaceDriver(vrmFaceAdapter(model.vrm), { seed: 5 }) : null;
    this.lk = { yaw: 0, pitch: 0, qn: new THREE.Quaternion(), qh: new THREE.Quaternion(), on: false };
  }
  /** 字幕の文字を話す（口） */
  say(text, dur) { if (this.face) { this.face.say(text, dur); this.model.talkingMouth = true; } }
  /** 視線の分を戻す（姿勢を当てる前に呼ぶ：毎フレーム足し重ねない） */
  unapplyLook(J) { const L = this.lk; if (!L.on || !J.neck || !J.head) return; J.neck.quaternion.multiply(_lq.copy(L.qn).invert()); J.head.quaternion.multiply(_lq.copy(L.qh).invert()); L.on = false; }
  /** 見る先へ首・頭・目を向ける（胸の向きに対して。首 35%・頭 45%・残りは目） */
  applyLook(J, target, dt, weight = 1) {
    const L = this.lk; if (!J.neck || !J.head || !J.chest) return;
    let wy = 0, wp = 0;
    const tp = lookPoint(target, _lv2);
    if (tp && weight > 0) {
      J.head.getWorldPosition(_lv1);
      const d = tp.sub(_lv1); J.chest.getWorldQuaternion(_lq2); d.applyQuaternion(_lq2.invert());
      const yaw = Math.atan2(d.x, d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      if (Math.abs(yaw) < 2.1 && d.length() < 14) { wy = clampN(yaw, -1.1, 1.1) * weight; wp = clampN(pitch, -0.45, 0.35) * weight; }
    }
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 6);
    L.yaw += (wy - L.yaw) * k; L.pitch += (wp - L.pitch) * k;
    if (Math.abs(L.yaw) + Math.abs(L.pitch) < 1e-4) { if (this.face) this.face.lookAt(0, 0); return; }
    L.qn.setFromEuler(_le.set(-L.pitch * 0.3, L.yaw * 0.35, 0, 'YXZ'));
    L.qh.setFromEuler(_le.set(-L.pitch * 0.45, L.yaw * 0.45, 0, 'YXZ'));
    J.neck.quaternion.multiply(L.qn); J.head.quaternion.multiply(L.qh); L.on = true;
    if (this.face) this.face.lookAt(clampN(L.yaw * 0.2 / 0.3, -1, 1), clampN(L.pitch * 0.25 / 0.25, -1, 1));
  }
  tickFace(dt) {
    if (this.face) { this.face.update(dt); if (!this.face.talking) this.model.talkingMouth = false; return; }
    const E = this.model.eyes; if (!E) return;
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = 2.2 + Math.random() * 3.5; }
    let k = 1; if (this.blink > 0) { this.blink -= dt; k = Math.max(0.08, Math.abs(this.blink - 0.065) / 0.065); }
    for (const e of E) e.scale.y = k;
  }
  hit(dirX, dirZ, yaw, power = 1) {
    // 当たった向き（体の向きに対して）でひるむ
    const a = Math.atan2(dirX, dirZ) - yaw;
    this.flinch.vx += -Math.cos(a) * 9 * power; this.flinch.vy += Math.sin(a) * 7 * power;
    this.flashT = 0.12;
  }
  tickFlinch(dt, J) {
    const f = this.flinch;
    // ばねは小さな刻みで解く（描画が遅い端末で dt が大きいと発散するため）
    const T = Math.min(dt, 0.1), n = Math.max(1, Math.ceil(T * 120)), h = T / n;
    for (let i = 0; i < n; i++) { f.vx += (-f.x * 160 - f.vx * 14) * h; f.vy += (-f.y * 160 - f.vy * 14) * h; f.x += f.vx * h; f.y += f.vy * h; }
    if (!Number.isFinite(f.x + f.y + f.vx + f.vy)) { f.x = f.y = f.vx = f.vy = 0; }
    if (J.spine && (Math.abs(f.x) > 1e-3 || Math.abs(f.y) > 1e-3)) { J.spine.rotateX(f.x * 0.5); J.chest.rotateX(f.x * 0.4); J.spine.rotateY(f.y * 0.4); if (J.head) J.head.rotateX(f.x * 0.3); }
    const u = this.model.mats && this.model.mats.body && this.model.mats.body.userData.u;
    if (u) { this.flashT = Math.max(0, this.flashT - dt); u.uFlash.value = this.flashT > 0 ? 0.55 * (this.flashT / 0.12) : 0; }
  }
}

/**
 * 揺れもの（尾・影の帯）のばね。list：[{ b:骨, k, d, gain, baseX, amp, freq, ph, tail }]。
 * 動き（速さ・向きの変化・回避）で後ろへ流れ、止まると base（休みの曲がり）へ戻る。尾はゆっくり左右に振る（猫の尾）。
 */
export class Sway {
  constructor(list = []) { this.list = list.map(s => Object.assign({ x: s.baseX || 0, z: 0, vx: 0, vz: 0 }, s)); }
  step(dt, time, speed, turn, extra = 0) {
    if (!this.list.length) return;
    const T = Math.min(dt, 0.1), n = Math.max(1, Math.ceil(T * 120)), h = T / n;
    for (const s of this.list) {
      const wantX = (s.baseX || 0) - speed * 0.06 * s.gain - extra * s.gain + Math.sin(time * (s.freq || 1.5) * 0.7 + (s.ph || 0)) * (s.amp || 0.05) * 0.3;
      const wantZ = -turn * 0.06 * s.gain + Math.sin(time * (s.freq || 1.5) + (s.ph || 0)) * (s.amp || 0.05) * (s.tail ? 1 : 0.6);
      for (let i = 0; i < n; i++) { s.vx += ((wantX - s.x) * s.k - s.vx * s.d) * h; s.vz += ((wantZ - s.z) * s.k - s.vz * s.d) * h; s.x += s.vx * h; s.z += s.vz * h; }
      if (!Number.isFinite(s.x + s.z + s.vx + s.vz)) { s.x = s.baseX || 0; s.z = 0; s.vx = s.vz = 0; }
      s.b.rotation.x = s.x; s.b.rotation.z = s.z;
    }
  }
}

export class Player {
  constructor(model, opt) {
    this.root = new THREE.Group(); this.root.name = 'dannoura';
    this.pivot = new THREE.Group(); this.pivot.position.y = 0.55; this.root.add(this.pivot);
    this.fighter = new Fighter(opt);
    this.pos = new THREE.Vector3(); this.yaw = Math.PI; this.r = 0.34;
    this.phase = 0; this.speed = 0; this.time = 0; this.moveDir = { x: 0, z: -1 }; this.dodgeDir = { x: 0, z: -1 };
    this.noise = 'none'; this.issenInfo = null; this.hurtDir = 'front';
    this.springs = [];
    this.setModel(model);
  }
  /** 1m あたりの歩きの位相（v2 のモデルは歩きの係の見た目の速さの歩幅：charkit/anim/locodriver.js） */
  phaseRate(v) { if (this.clipAnim && this.clipAnim.hasLoco) return this.clipAnim.phaseRate(v); return this.driver ? this.driver.rate(this.driver.visV > 0.1 ? undefined : Math.max(0.6 * v, 0.12)) : this.model && this.model.legDims ? heroPhaseRate(v, this.model.legScale || 1) : phaseRate(v); }
  /** 字幕の文字を話す */
  say(text, dur) { this.looks.say(text, dur); }
  setModel(model) {
    if (this.model) this.pivot.remove(this.model.root);
    this.model = model; model.root.position.y = -0.55; this.pivot.add(model.root);
    if (model.springs) model.springs.reset();
    this.idleT = 0; this.nextIdle = 7; this.idleVar = null; this.moveT = 0; this.accS = 0; this.prevSpeed = 0; this.turnPh = 0;
    this.poser = new Poser(model.J, model.rest || {}, { tpose: !!model.tpose, hipScale: model.hipScale, vrm0: !!model.vrm0 });
    this.driver = model.legDims ? new LocoDriver({ dims: model.legDims, scale: model.legScale || 1, pers: model.white ? 'white' : model.kind || '' }) : null;
    // 外部のモデル（VRM）＋本物の動き（VRMA のクリップ）：charkit/anim/clipanim.js。無い時・無い動きは手続きの姿勢（予備）
    this.clipAnim = model.clipAnim || null; this.clipRes = null;
    this.exactK = 0; this.turnS = 0;
    if (!model.weapons) model.weapons = attachRigidWeapons(model.J);
    this.looks = new Looks(model);
    this.springs = [];
    for (const [i, b] of (model.tail || []).entries()) this.springs.push({ b, k: i === 0 ? 70 : 45, d: 8, base: 0, x: 0, z: 0, vx: 0, vz: 0, gain: i === 0 ? 0.6 : 0.35 });
    for (const b of model.coat || []) this.springs.push({ b, k: 55, d: 7, base: 0, x: 0, z: 0, vx: 0, vz: 0, gain: 0.5, coat: true });
    this.sway = new Sway(model.sway || []);
    this.earT = 1.5; this.expr = null; this.exprT = 0;
    this.setWeaponVisual();
  }
  /** 表情（skin.js の EXPR の名前）。dur 秒後に base へ戻す */
  setExpr(name, dur = 0) { if (!this.model.setExpr) return; if (this.expr !== name) { this.model.setExpr(name); this.expr = name; } this.exprT = dur; }
  /** 武器の見た目：持っている物・手に持つ物（骨の大きさ／表示） */
  setWeaponVisual() {
    const W = this.model.weapons; if (!W) return;
    const F = this.fighter, n = F.st.name, own = F.owned;
    let hand = F.weapon;
    if (n === 'swap') hand = F.st.f < F.st.total / 2 ? F.st.from : F.st.to;
    if (n === 'issen' && F.weapon !== 'claw') hand = own.includes('katana') ? 'katana' : F.weapon;
    const set = (o, on) => { if (!o) return; if (W.bones) o.scale.setScalar(on ? 1 : HIDE); else o.visible = on; };
    if (this.noWeapons) { for (const k of ['katana', 'gun', 'pipe', 'saya', 'sayaHilt', 'holster', 'holsterGun', 'pipeBack', 'match', 'matchBack']) set(W[k], false); return; }   // 結末の場面（病室・家）では持たない
    set(W.katana, hand === 'katana'); set(W.gun, hand === 'handgun'); set(W.pipe, hand === 'pipe');
    set(W.saya, own.includes('katana')); set(W.sayaHilt, own.includes('katana') && hand !== 'katana');
    set(W.holster, own.includes('handgun')); set(W.holsterGun, own.includes('handgun') && hand !== 'handgun');
    set(W.pipeBack, own.includes('pipe') && hand !== 'pipe' && !this.model.white);
    set(W.match, hand === 'matchlock'); set(W.matchBack, own.includes('matchlock') && hand !== 'matchlock');
    if (this.model.white) { set(W.holster, false); set(W.holsterGun, false); if (hand === 'claw') { set(W.katana, n === 'issen' || (n === 'attack' && !!F.st.blade)); } }
  }
  /** 刃の根元と先（世界座標）：刀か鉄パイプ */
  bladePoints() {
    const W = this.model.weapons; if (!W) return null;
    const F = this.fighter, b = F.weapon === 'pipe' ? W.pipe : W.katana;
    if (!b || (W.bones ? b.scale.x < 0.5 : !b.visible)) return null;
    const a = new THREE.Vector3(0, 0.12, 0), c = new THREE.Vector3(0, F.weapon === 'pipe' ? 0.82 : 0.88, 0);
    b.updateWorldMatrix(true, false); a.applyMatrix4(b.matrixWorld); c.applyMatrix4(b.matrixWorld); return [a, c];
  }
  muzzleWorld(match) { const W = this.model.weapons; const v = new THREE.Vector3(); const mz = match && W && W.mMuzzle ? W.mMuzzle : W && W.muzzle; if (mz) mz.getWorldPosition(v); else v.copy(this.pos).add(new THREE.Vector3(0, 1.3, 0)); return v; }
  /** 進んだ距離で歩きの位相を進める。足が着いたら 'L'|'R' を返す（足音） */
  advance(moved, speed) {
    if (this.driver && speed > 0.08 && !this.wasMoving && this.driver.mode === 'idle') this.phase = this.driver.startPhase(speed);   // 動き出し：左が立脚の真ん中から
    this.wasMoving = speed > 0.08;
    const prev = this.phase; this.phase += moved * this.phaseRate(speed);
    return speed > 0.3 ? footfall(prev, this.phase) : null;
  }
  /** 見た目の更新（描画フレーム） */
  animate(dt, extra = {}) {
    this.time += dt;
    const F = this.fighter, m = this.model;
    const ctx = { st: F.st, f: F.st.f, w: F.weapon, speed: this.speed, phase: this.phase, time: this.time, aiming: F.aimHeld && F.weapon === 'handgun', issen: this.issenInfo, hurtDir: this.hurtDir, white: F.white };
    // v2 のモデル：足の IK・その場の向き替え・立ち止まりの小さな動き・動き出し／止まりの傾き
    const turn0 = this.prevYaw != null ? angWrap(this.yaw - this.prevYaw) / Math.max(dt, 1 / 60) : 0;
    if (m.legDims) {
      ctx.loco = { ik: true, dims: m.legDims, rate: this.phaseRate(this.speed), scale: m.legScale || 1 };
      const moving = this.speed > 0.1;
      this.moveT = moving ? this.moveT + dt : 0;
      const quiet = F.st.name === 'free' && !moving && !extra.override && !ctx.aiming;
      if (quiet && Math.abs(turn0) > 1.2) { this.turnPh += Math.min(Math.abs(turn0), 8) * dt * 1.6; ctx.turnStep = { ph: this.turnPh, turn: turn0 }; }
      this.idleT = quiet && Math.abs(turn0) < 0.3 ? this.idleT + dt : 0;
      if (this.idleVar) { this.idleVar.t += dt; if (this.idleVar.t >= this.idleVar.dur || !quiet) this.idleVar = null; }
      if (!this.idleVar && this.idleT > this.nextIdle) {
        const kinds = F.weapon === 'none' || F.weapon === 'handgun' ? ['glasses', 'look', 'lookR', 'stretch'] : ['look', 'lookR', 'stretch'];
        this.idleVar = { kind: kinds[Math.floor(Math.random() * kinds.length)], t: 0, dur: 2.4 }; this.idleT = 0; this.nextIdle = 6 + Math.random() * 6;
      }
      ctx.idleVar = this.idleVar;
      const acc = (this.speed - this.prevSpeed) / Math.max(dt, 1 / 120); this.prevSpeed = this.speed;
      this.accS += (clampN(acc, -40, 40) - this.accS) * Math.min(1, dt * 6);
      if (this.driver) ctx.basePose = this.driver.update(dt, { speed: this.speed, phase: this.phase, time: this.time, turn: ctx.turnStep || null });
    }
    let { pose, rate } = extra.override || dannouraPose(ctx);
    if (m.legDims && !extra.override) {
      // 足の IK の姿勢（歩きの係）へ戻る時は脚を少しずつ（攻撃・回避の後に脚が飛ばない）
      this.exactK = pose._exactLegs ? Math.min(1, this.exactK + dt * 5) : 0;
      if (pose._exactLegs) pose._legRate = this.driver ? 0.18 + 0.82 * this.exactK * this.exactK : Math.min(1, 0.3 + this.moveT * 7);
      else if (!pose._planted && this.speed <= 0.1 && ['free', 'reload', 'hipfire', 'swap', 'parry', 'cast', 'mcharge', 'mreload', 'hurt'].includes(F.st.name)) pose = plantFeet(Object.assign({}, pose), m.legDims);
      // P13：攻撃・構え・ひるみの姿勢で腰を下げた分、足が床にめり込まないように（姿勢と時間は同じ。足だけ床の上へ）
      if (this.driver && !pose._exactLegs && ['attack', 'charge', 'issen', 'parry', 'hurt', 'cast', 'swap', 'reload', 'hipfire'].includes(F.st.name)) pose = groundClamp(Object.assign({}, pose), m.legDims);
      if (!this.driver) { const lean = clampN(this.accS * 0.012, -0.12, 0.1); if (Math.abs(lean) > 1e-3 && F.st.name === 'free') { const sp = pose.spine || [0, 0, 0]; pose = Object.assign({}, pose, { spine: [sp[0] + lean, sp[1], sp[2]] }); } }
      // 曲がる先を先に見る（首・頭）：進みたい向きと体の向きの差
      if (this.driver && F.st.name === 'free' && this.speed > 0.3 && this.moveDir) {
        const d = clampN(angWrap(Math.atan2(this.moveDir.x, this.moveDir.z) - this.yaw), -0.9, 0.9) * 0.32;
        if (Math.abs(d) > 1e-3) { const nk = pose.neck || [0, 0, 0], hd = pose.head || [0, 0, 0]; pose = Object.assign({}, pose, { neck: [nk[0], nk[1] + d, nk[2]], head: [hd[0], hd[1] + d, hd[2]] }); }
      }
    }
    this.looks.unapplyLook(m.J);
    if (extra.aimPitch != null && ctx.aiming) { pose.rightUpperArm = [(pose.rightUpperArm || [0, 0, 0])[0] - extra.aimPitch, pose.rightUpperArm[1], pose.rightUpperArm[2]]; pose.leftUpperArm = [(pose.leftUpperArm || [0, 0, 0])[0] - extra.aimPitch, pose.leftUpperArm[1], pose.leftUpperArm[2]]; pose.chest = [(pose.chest || [0, 0, 0])[0] - extra.aimPitch * 0.3, (pose.chest || [0, 0, 0])[1], 0]; }
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    if (this.clipAnim) {
      const sn = F.st.name;
      this.clipRes = this.clipAnim.update(dt, { st: sn, f: F.st.f, total: sn === 'dodge' ? COMBAT.dodge.total : sn === 'hurt' ? COMBAT.hurt.stun : 0, atk: F.st.atk, step: F.st.step, heavy: !!F.st.heavy, weapon: F.weapon,
        speed: this.speed, phase: this.phase, turn: turn0, talking: !!(this.looks.face && this.looks.face.talking), override: !!extra.override, armsFromProc: sn === 'free' && F.weapon !== 'none' });
    }
    // 回避の転がり（体ごと前へ回る）
    // 曲がる時は体を内へ傾ける（向きの変わる速さ × 速さ：足の下を軸に）
    { const tr = this.prevYaw != null ? angWrap(this.yaw - this.prevYaw) / Math.max(dt, 1 / 120) : 0; this.turnS += (clampN(tr, -10, 10) - this.turnS) * Math.min(1, dt * 10); }
    const bank = this.driver && F.st.name === 'free' && !extra.override ? clampN(-this.turnS * (this.driver.visV || 0) * 0.022, -0.16, 0.16) : 0;
    if (F.st.name === 'dodge' && !extra.override && !F.st.white && !(this.clipRes && this.clipRes.roll)) { const r = rollAt(F.st.f); this.pivot.rotation.x = r.angle; this.pivot.position.y = 0.55 - r.drop; this.pivot.rotation.z = 0; this.pivot.position.x = 0; }
    else { this.pivot.rotation.x = 0; this.pivot.rotation.z += (bank - this.pivot.rotation.z) * Math.min(1, dt * 8); this.pivot.position.x = -0.55 * Math.sin(this.pivot.rotation.z); this.pivot.position.y = 0.55 * Math.cos(this.pivot.rotation.z); }
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.setWeaponVisual();
    this.looks.tickFace(dt); this.looks.tickFlinch(dt, m.J);
    // 視線：演出の相手（lookTarget）・ロックオンの相手（extra.look）。攻撃などの動きの間は弱める
    { const busy = ['attack', 'issen', 'dodge', 'charge', 'dead'].includes(F.st.name); this.looks.applyLook(m.J, this.lookTarget || extra.look || null, dt, busy ? 0.25 : 1); }
    // 髪・燕尾のばね：速さ・回転・回避で揺れる
    const turn = this.prevYaw != null ? Math.max(-12, Math.min(12, angWrap(this.yaw - this.prevYaw) / Math.max(dt, 1 / 60))) : 0; this.prevYaw = this.yaw;
    const T = Math.min(dt, 0.1), n = Math.max(1, Math.ceil(T * 120)), h = T / n;
    const push = this.speed * 0.09 + (F.st.name === 'dodge' ? 0.5 : 0) + (F.st.name === 'attack' ? 0.15 : 0);
    for (const s of this.springs) {
      const wantX = s.base + push * s.gain + Math.sin(this.time * 2.1 + s.k) * 0.03, wantZ = -turn * 0.05 * s.gain + Math.sin(this.time * 1.7 + s.k) * 0.03;
      for (let i = 0; i < n; i++) { s.vx += ((wantX - s.x) * s.k - s.vx * s.d) * h; s.vz += ((wantZ - s.z) * s.k - s.vz * s.d) * h; s.x += s.vx * h; s.z += s.vz * h; }
      if (!Number.isFinite(s.x + s.z + s.vx + s.vz)) { s.x = s.base; s.z = 0; s.vx = s.vz = 0; }
      s.b.rotation.x = s.coat ? Math.max(-0.05, s.x) : s.x; s.b.rotation.z = s.z;
    }
    this.sway.step(dt, this.time, this.speed, turn, F.st.name === 'dodge' ? 0.6 : 0);
    // 猫耳：ときどきぴくっと動く・走ると後ろへ寝る
    if (m.earBones) {
      this.earT -= dt; const tw = this.earT < 0.12 && this.earT > 0 ? Math.sin(this.earT / 0.12 * Math.PI) * 0.35 : 0; if (this.earT <= 0) this.earT = 1.5 + Math.random() * 3;
      m.earBones.forEach((b, i) => { b.rotation.x = -Math.min(0.5, this.speed * 0.08) - (i ? tw : 0); b.rotation.z = (i ? -1 : 1) * tw * 0.4; });
    }
    if (this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0 && this.baseExpr) this.setExpr(this.baseExpr); }
    if (m.update) m.update(dt);
  }
}

export class EnemyActor {
  constructor(brain, model, opt = {}) {
    this.brain = brain; this.model = model; this.id = brain.id; this.kind = brain.kind;
    this.root = new THREE.Group(); this.root.add(model.root); this.root.name = this.id;
    this.poser = new Poser(model.J, model.rest || {});
    this.r = model.bodyR || 0.34; this.h = model.height || 1.7;
    this.phase = 0; this.speed = 0; this.time = Math.random() * 10; this.mark = null; this.opt = opt;
    this.y = 0; this.looks = new Looks(model); this.weakGlow = 0;
    this.root.position.set(brain.pos.x, 0, brain.pos.z);
    this.outlineBase = model.mats && model.mats.outline ? model.mats.outline.color.getHex() : 0;
    this.sway = new Sway(model.sway || []);
  }
  get pos() { return this.brain.pos; }
  hittable() { const b = this.brain; return b.alive && !b.immune() && this.root.visible; }
  /** 60Hz のステップ（dt は世界の時間） */
  step(dt, sense, boxes, player) {
    const b = this.brain;
    b.tickPoise(dt, COMBAT.poise);
    const out = b.update(dt, sense);
    let moved = 0;
    if (out.move && !this.held) {
      const dx = out.move.x - b.pos.x, dz = out.move.z - b.pos.z, L = Math.hypot(dx, dz);
      if (L > 1e-4) {
        const m = Math.min(L, out.move.speed * dt);
        const before = { x: b.pos.x, z: b.pos.z };
        b.pos.x += dx / L * m; b.pos.z += dz / L * m;
        resolveCircle(b.pos, Math.min(this.r, 0.6), boxes);
        if (player && !player.fighter.dead && !out.dash) {
          const px = b.pos.x - player.pos.x, pz = b.pos.z - player.pos.z, d = Math.hypot(px, pz), min = this.r + player.r * 0.8;
          if (d < min && d > 1e-4) { b.pos.x = player.pos.x + px / d * min; b.pos.z = player.pos.z + pz / d * min; }
        }
        moved = Math.hypot(b.pos.x - before.x, b.pos.z - before.z);
        if (out.dash && b.atk && moved < m * 0.4) b.atk.blocked = true;   // 突進が壁に当たった
      }
    }
    this.speed = dt > 0 ? moved / dt : 0;
    this.phase += moved * phaseRate(this.speed, this.kind === 'heiten' || this.kind === 'shuuyou' ? 0.95 : 0.85);
    if (out.face) b.yaw = turnTo(b.yaw, Math.atan2(out.face.x - b.pos.x, out.face.z - b.pos.z), (out.faceRate || 6) * Math.max(dt, 1e-4) * 1.4);
    return out;
  }
  animate(dt) {
    const b = this.brain; this.time += dt;
    const ctx = { state: b.state, t: b.t, sub: b.sub, speed: this.speed, phase: this.phase, atk: b.atk, atkDef: b.atk ? b.def.attacks[b.atk.name] : null, atStation: b.atStation, step: b.step && b.step.id, stepT: b.stepT };
    const fn = this.poseFn || (this.kind === 'heiten' ? heitenPose : this.kind === 'shuuyou' ? shuuyouPose : kiroPose);
    const { pose, rate } = fn(ctx);
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    this.root.position.set(b.pos.x, this.y, b.pos.z); this.root.rotation.y = b.yaw;
    this.looks.tickFlinch(dt, this.model.J);
    this.sway.step(dt, this.time, this.speed, 0, b.atk && b.atk.phase === 'active' ? 0.5 : 0);
    if (this.alt) this.altAnimate(dt, pose, rate);
    // 見切り状態（青い縁）：輪郭線を青く
    const M = this.model.mats;
    if (M && M.outline) { const want = b.chainable && b.alive ? 0x3a9aff : this.outlineBase; if (M.outline.color.getHex() !== want) M.outline.color.setHex(want); M.outline.userData.u.uOutline.value = b.chainable ? 0.02 : (this.model.outlineThick || 0.011); }
    if (this.model.update) this.model.update(dt);
  }
  /** 化けの姿（模倣する影の「見舞い客」「（相棒）」）。本体と同じ位置に重ね、崩れると本体（影）が現れる */
  setAlt(model, poseFn) {
    this.alt = model; this.altPoseFn = poseFn; this.altPoser = new Poser(model.J, model.rest || {}); this.altLooks = new Looks(model);
    this.model.root.add(model.root); this.altK = 0; this.setReveal(0);
  }
  altAnimate(dt) {
    if (!this.alt.root.visible) return;
    const { pose, rate } = this.altPoseFn({ time: this.time, speed: this.speed, phase: this.phase, talking: true, mode: null });
    this.altPoser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
  }
  /** 化けの崩れ（0＝化けた姿だけ、1＝影だけ） */
  setReveal(k) {
    this.altK = k;
    const A = this.alt && this.alt.mats, M = this.model.mats;
    if (A) for (const m of [A.body, A.face, A.outline]) if (m && m.userData.u) m.userData.u.uDissolve.value = k;
    if (this.alt) this.alt.root.visible = k < 0.999;
    if (M) for (const m of [M.body, M.face, M.outline]) if (m && m.userData.u) m.userData.u.uDissolve.value = 1 - k;
    for (const o of [this.model.mesh, this.model.faceMesh, this.model.outline]) if (o) o.visible = k > 0.001;
  }
  /** 黒い霧になって崩れる（0〜1） */
  setDissolve(k) { const M = this.model.mats; if (!M) return; for (const m of [M.body, M.face, M.outline]) if (m && m.userData.u) m.userData.u.uDissolve.value = k; }
}

export class CompanionActor {
  constructor(model, brain) {
    this.root = new THREE.Group(); this.root.name = 'companion'; this.brain = brain;
    this.speed = 0; this.phase = 0; this.time = 0; this.talking = false; this.anim = null; this.r = 0.3;
    this.setModel(model);
  }
  setModel(model) { if (this.model) this.root.remove(this.model.root); this.model = model; this.root.add(model.root); this.poser = new Poser(model.J, model.rest || {}, { tpose: !!model.tpose, hipScale: model.hipScale, vrm0: !!model.vrm0 }); this.looks = new Looks(model); if (model.springs) model.springs.reset(); this.driver = model.legDims ? new LocoDriver({ dims: model.legDims, scale: model.legScale || 1, pers: model.kind || 'companion' }) : null; this.exactK = 0; this.clipAnim = model.clipAnim || null; this.clipRes = null; this.prevYaw = null; }
  get pos() { return this.brain.pos; }
  phaseRate(v) { if (this.clipAnim && this.clipAnim.hasLoco) return this.clipAnim.phaseRate(v); return this.driver ? this.driver.rate(this.driver.visV > 0.1 ? undefined : Math.max(0.6 * v, 0.12)) : this.model && this.model.legDims ? heroPhaseRate(v, this.model.legScale || 1) : phaseRate(v, 0.75); }
  say(text, dur) { this.looks.say(text, dur); }
  /** 60Hz：AI の結果で動かす */
  step(dt, out, boxes) {
    const b = this.brain; let moved = 0;
    if (out && out.move) {
      const dx = out.move.x - b.pos.x, dz = out.move.z - b.pos.z, L = Math.hypot(dx, dz);
      if (L > 1e-4) { const m = Math.min(L, out.move.speed * dt), bx = b.pos.x, bz = b.pos.z; b.pos.x += dx / L * m; b.pos.z += dz / L * m; resolveCircle(b.pos, this.r, boxes); moved = Math.hypot(b.pos.x - bx, b.pos.z - bz); }
    }
    if (out && out.face) b.yaw = turnTo(b.yaw, Math.atan2(out.face.x - b.pos.x, out.face.z - b.pos.z), 0.18);
    this.speed = moved / dt;
    if (this.driver && this.speed > 0.08 && !this.wasMoving && this.driver.mode === 'idle') this.phase = this.driver.startPhase(this.speed);
    this.wasMoving = this.speed > 0.08;
    this.phase += moved * this.phaseRate(this.speed);
    this.pose = out ? out.pose : this.pose;
  }
  animate(dt) {
    this.time += dt;
    const mode = this.anim || (this.pose === 'hide' ? 'hide' : this.pose === 'grabbed' ? 'grabbed' : this.pose === 'cower' ? 'cower' : null);
    const m = this.model;
    const loco = m.legDims ? { ik: true, dims: m.legDims, rate: this.phaseRate(this.speed), scale: m.legScale || 1 } : undefined;
    const basePose = this.driver ? this.driver.update(dt, { speed: this.speed, phase: this.phase, time: this.time, k: this.talking ? 0.6 : 1 }) : null;
    let { pose, rate } = companionPose({ time: this.time, talking: this.talking, speed: this.speed, phase: this.phase, mode, loco, basePose });
    if (this.driver) { this.exactK = pose._exactLegs ? Math.min(1, this.exactK + dt * 5) : 0; if (pose._exactLegs) pose._legRate = 0.18 + 0.82 * this.exactK * this.exactK; }
    if (m.legDims && !pose._exactLegs && !pose._planted && this.speed <= 0.1 && !mode) pose = plantFeet(Object.assign({}, pose), m.legDims);
    this.looks.unapplyLook(m.J);
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    // P17：相棒も本物の動きのクリップ（VRMA・clips.json の組：だんのうらと同じ係 charkit/anim/clipanim.js）。隠れる・つかまれる・すくむ・演出の姿勢は手続きのまま
    if (this.clipAnim) {
      const turn = this.prevYaw != null ? angWrap(this.brain.yaw - this.prevYaw) / Math.max(dt, 1 / 60) : 0; this.prevYaw = this.brain.yaw;
      this.clipRes = this.clipAnim.update(dt, { st: 'free', f: 0, total: 0, speed: this.speed, phase: this.phase, turn, talking: !!this.talking, override: !!mode || !!this.overridePose, weapon: 'none' });
    }
    this.root.position.set(this.brain.pos.x, this.rootY || 0, this.brain.pos.z); this.root.rotation.y = this.brain.yaw;
    this.root.updateMatrixWorld(true);
    this.looks.tickFace(dt); this.looks.tickFlinch(dt, this.model.J);
    this.looks.applyLook(m.J, this.lookTarget || null, dt, mode === 'hide' || mode === 'grabbed' ? 0 : 1);
    if (this.model.update) this.model.update(dt);
  }
}

export class CivilianActor {
  constructor(model, x, z, yaw, path) {
    this.model = model; this.root = new THREE.Group(); this.root.add(model.root); this.poser = new Poser(model.J, model.rest || {}); this.pos = { x, z }; this.yaw = yaw; this.path = path || null; this.pi = 0; this.speed = 0; this.phase = 0; this.time = Math.random() * 5; this.looks = new Looks(model); this.fade = 1;
    // P13：コードで組んだ町の人（骨の休みの回転なし）も歩きの係（足の IK の歩き・待機）。寸法は骨の位置から
    const J = model.J;
    if (!model.isVRM && J && J.hips && J.leftUpperLeg && J.leftLowerLeg && J.leftFoot && !Object.keys(model.rest || {}).length) {
      this.driver = new LocoDriver({ dims: legDims({ leg: J.hips.position.y, thigh: J.leftLowerLeg.position.length(), shin: J.leftFoot.position.length(), hipX: Math.abs(J.leftUpperLeg.position.x) }), scale: J.leftLowerLeg.position.length() / 0.4, pers: 'civilian' });
    }
  }
  animate(dt) {
    this.time += dt;
    if (this.path) {
      const t = this.path[this.pi]; const dx = t[0] - this.pos.x, dz = t[1] - this.pos.z, L = Math.hypot(dx, dz);
      if (L < 0.3) this.pi = (this.pi + 1) % this.path.length; else { const m = Math.min(L, 1.2 * dt); this.pos.x += dx / L * m; this.pos.z += dz / L * m; this.yaw = turnTo(this.yaw, Math.atan2(dx, dz), 0.1); this.speed = 1.2; this.phase += m * (this.driver ? this.driver.rate() : phaseRate(1.2)); }
    }
    let { pose, rate } = civilianPose({ time: this.time, speed: this.path ? this.speed : 0, phase: this.phase });
    if (this.driver) { pose = this.driver.update(dt, { speed: this.path ? this.speed : 0, phase: this.phase, time: this.time, k: 0.8 }); rate = 0.4; }
    this.poser.apply(pose, 1 - Math.pow(1 - rate, dt * 60));
    this.root.position.set(this.pos.x, 0, this.pos.z); this.root.rotation.y = this.yaw; this.looks.tickFace(dt);
  }
}
export { DT, COMBAT };
