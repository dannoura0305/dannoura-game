// 手足の 2 本の骨の IK（世界の位置で解く・骨の休みの向きに依らない）と、攻撃の踏み込みの足の置き場所（StepPlanter）。
// 2026-11-09：攻撃で体ごと前へ出る間（0.6〜1.6m）、足が床を滑っていた（クリップ・手続きの姿勢とも、足は体に付いたまま動く）。
//  → 足を世界に置いて（錨）、体が離れたら一歩ずつ踏み出す（前の足から・次に後ろの足を引き寄せる）。脚は IK で錨へ届かせる。
//  見た目だけ：当たり・移動の量・こま数は作品（shinshoku/combat・game/combat.js）のまま。
// 骨の回転は「世界での回し」を親の局所へ直して掛けるので、VRM（normalized・T ポーズの休み）でもコードで組んだ骨でも同じに使える。
import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeIO = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3();

/** 骨 o を世界で q だけ回す（親の局所へ直す）。子の世界の行列も直す */
export function rotateWorld(o, q) {
  o.parent.getWorldQuaternion(_q2);
  o.getWorldQuaternion(_q3);
  _q3.premultiply(q);
  o.quaternion.copy(_q2.invert().multiply(_q3));
  o.updateWorldMatrix(false, true);
}
/** 骨 o の世界の回転を Q にする */
export function setWorldQuat(o, Q) {
  o.parent.getWorldQuaternion(_q2);
  o.quaternion.copy(_q2.invert().multiply(Q));
  o.updateWorldMatrix(false, true);
}

/**
 * 2 本の骨の IK：A（太もも・上腕）→ B（すね・前腕）→ C（足首・手首）の C を世界の点 target へ。
 * pole：曲がる関節（ひざ・ひじ）を向ける世界の点（無ければ今の曲がる向きのまま）。届かない時は伸ばした所まで。
 * 戻り値：届いたか
 */
export function twoBoneIK(A, B, C, target, pole = null) {
  A.updateWorldMatrix(true, true);
  A.getWorldPosition(_a); B.getWorldPosition(_b); C.getWorldPosition(_c);
  const lab = _a.distanceTo(_b), lbc = _b.distanceTo(_c);
  if (lab < 1e-6 || lbc < 1e-6) return false;
  const D0 = _t.copy(target).sub(_a).length();
  const D = clamp(D0, Math.abs(lab - lbc) + 1e-4, (lab + lbc) * 0.9995);
  // ① 曲げ：B の角度を、A〜target の距離になるように
  _u.copy(_a).sub(_b); _v.copy(_c).sub(_b);
  const cur = _u.angleTo(_v), want = Math.acos(clamp((lab * lab + lbc * lbc - D * D) / (2 * lab * lbc), -1, 1));
  _n.crossVectors(_u, _v);
  if (_n.lengthSq() < 1e-8 * _u.lengthSq() * _v.lengthSq()) {                      // まっすぐ伸びている：pole の側へ曲げる（無ければ下・前）
    if (pole) _n.crossVectors(_u, _t.copy(pole).sub(_b));
    if (_n.lengthSq() < 1e-10) _n.crossVectors(_u, _t.set(0, -1, 0));
    if (_n.lengthSq() < 1e-10) _n.crossVectors(_u, _t.set(0, 0, 1));
  }
  _n.normalize();
  if (Math.abs(want - cur) > 1e-6) rotateWorld(B, _q.setFromAxisAngle(_n, want - cur));
  // ② 振り：A を回して C を target の向きへ
  C.getWorldPosition(_c);
  _u.copy(_c).sub(_a).normalize(); _v.copy(target).sub(_a);
  if (_v.lengthSq() > 1e-10) { _v.normalize(); rotateWorld(A, _q.setFromUnitVectors(_u, _v)); }
  // ③ ねじり：A〜target の線の回りに回して、曲がる関節を pole の側へ
  if (pole && _v.lengthSq() > 0.5) {
    B.getWorldPosition(_b);
    const ax = _v; // 単位
    _u.copy(_b).sub(_a); _u.addScaledVector(ax, -_u.dot(ax));
    _t.copy(pole).sub(_a); _t.addScaledVector(ax, -_t.dot(ax));
    if (_u.lengthSq() > 1e-8 && _t.lengthSq() > 1e-8) {
      _u.normalize(); _t.normalize();
      const ang = Math.atan2(_n.crossVectors(_u, _t).dot(ax), _u.dot(_t));
      if (Math.abs(ang) > 1e-5) rotateWorld(A, _q.setFromAxisAngle(ax, ang));
    }
  }
  return D0 <= (lab + lbc) * 0.9995;
}

/**
 * 攻撃の踏み込みの足：足首を世界に置き、体が離れたら一歩ずつ踏み出す。
 * new StepPlanter(J, { dims })  … J：人型の骨（leftUpperLeg・leftLowerLeg・leftFoot・右も）。dims：脚の寸法（かかと・つま先の付け根の点）
 * update(dt, { active, settle, ground, body })：姿勢（手続き・クリップ）を骨に当てた後に呼ぶ。
 *   active：足を置く間（攻撃・溜め）。settle：踏み込みが終わった（戻り）：小さなずれでも足を姿勢の場所へ置き直す。
 *   ground：床の高さ（世界の y）。body：体の位置（世界・移動の速さを測る）
 */
export class StepPlanter {
  constructor(J, opt = {}) {
    this.J = J; this.opt = Object.assign({ thr: 0.2, settle: 0.045, dur: 0.15, lift: 0.1, out: 0.12, dims: null }, opt);   // dims：脚の寸法（loco.js の legDims：ankleY・heel・ball）。あれば足の裏が床へ入らない
    this.feet = ['left', 'right'].map(s => ({ s, mode: null, P: new THREE.Vector3(), Q: new THREE.Quaternion(), S: new THREE.Vector3(), SQ: new THREE.Quaternion(), E: new THREE.Vector3(), u: 0, dur: 0.15, lift: 0 }));
    this.w = 0; this.on = false; this.vel = new THREE.Vector3(); this.prevBody = null; this.k = 1; this.rest = 0;
    this.stats = { steps: 0 };
    this.ok = !!(J.leftUpperLeg && J.leftLowerLeg && J.leftFoot && J.rightUpperLeg && J.rightLowerLeg && J.rightFoot);
  }
  reset() { this.on = false; this.w = 0; for (const f of this.feet) f.mode = null; this.prevBody = null; }
  update(dt, o) {
    if (!this.ok || dt <= 0) return;
    const J = this.J, O = this.opt, g = o.ground ?? 0;
    // 体の速さ（踏み出す足の着く先を先読みする）
    if (o.body) {
      if (this.prevBody) { _v.copy(o.body).sub(this.prevBody).divideScalar(dt); _v.y = 0; this.vel.lerp(_v, Math.min(1, dt / 0.03)); }
      else this.vel.set(0, 0, 0);
      (this.prevBody || (this.prevBody = new THREE.Vector3())).copy(o.body);
    }
    if (!o.active && this.w <= 0) { if (this.on) this.reset(); return; }
    J.hips.updateWorldMatrix(true, true);
    const anim = this.feet.map(f => ({ p: J[f.s + 'Foot'].getWorldPosition(new THREE.Vector3()), q: J[f.s + 'Foot'].getWorldQuaternion(new THREE.Quaternion()), knee: J[f.s + 'LowerLeg'].getWorldPosition(new THREE.Vector3()), hip: J[f.s + 'UpperLeg'].getWorldPosition(new THREE.Vector3()) }));
    if (o.active && !this.on) {
      // 置き始め：今の足首の場所。低い方の足首の高さを「床に着いた足首の高さ」にする
      this.on = true; this.w = 1;
      this.k = anim[0].hip.distanceTo(anim[0].knee) / 0.4 || 1;
      this.ws = O.dims && O.dims.thigh ? anim[0].hip.distanceTo(anim[0].knee) / O.dims.thigh : 1;   // 寸法の単位 → 世界
      const ys = anim.map(a => a.p.y - g); this.rest = Math.max(0.02 * this.k, Math.min(...ys));
      this.feet.forEach((f, i) => {
        f.Q.copy(anim[i].q);
        if (ys[i] < this.rest + 0.04 * this.k) { f.mode = 'plant'; f.P.copy(anim[i].p); f.P.y = g + this.rest; }
        else { f.mode = 'step'; f.S.copy(anim[i].p); f.SQ.copy(anim[i].q); f.u = 0; f.dur = 0.12; f.lift = 0; f.fresh = true; }
      });
    }
    this.w = o.active ? 1 : Math.max(0, this.w - dt / O.out);
    const k = this.k;
    // 一歩を始める：着いている足で、姿勢の足首との差が大きい方（もう片方が着いている時だけ）
    if (o.active) {
      const thr = (o.settle ? O.settle : O.thr) * k;
      // 先に出すのは、ずれが閾を越えた足のうち姿勢で前にある足（踏み込む足）。もう片方が宙にある時は、届かないほど離れた時だけ（跳ぶように）
      const sp = Math.hypot(this.vel.x, this.vel.z), dir = sp > 0.3 ? _u.set(this.vel.x / sp, 0, this.vel.z / sp) : null;
      let best = -1, bs = -Infinity, be = 0;
      this.feet.forEach((f, i) => {
        if (f.mode !== 'plant') return;
        const e = Math.hypot(anim[i].p.x - f.P.x, anim[i].p.z - f.P.z) + (f.Q.angleTo(anim[i].q) > 0.7 ? thr : 0);
        const other = this.feet[1 - i];
        if (e <= thr || (other.mode !== 'plant' && !(e > 0.45 * k && other.u > 0.5))) return;
        const sc = e + (dir ? (anim[i].p.x * dir.x + anim[i].p.z * dir.z) - (anim[1 - i].p.x * dir.x + anim[1 - i].p.z * dir.z) : 0);
        if (sc > bs) { bs = sc; be = e; best = i; }
      });
      if (best >= 0) {
        const f = this.feet[best];
        f.mode = 'step'; f.S.copy(f.P); f.SQ.copy(f.Q); f.u = 0;
        f.dur = clamp(O.dur - sp * 0.012, 0.08, O.dur);   // 体が速い（大きな踏み込み）ほど速く踏み出す
        f.lift = O.lift * k * clamp(be / (0.25 * k), 0.5, 1);   // 小さな置き直しも床から 5cm は上げる（床をするように見えない）
        f.fresh = true;
        this.stats.steps++;
      }
    }
    // 足首の目標
    this.feet.forEach((f, i) => {
      const a = anim[i];
      let tgt, Q;
      if (f.mode === 'step') {
        f.u = Math.min(1, f.u + dt / f.dur);
        const rem = (1 - f.u) * f.dur;
        // 着く先：姿勢の足首＋体が残りの間に進む分。体が急に止まっても着く先が跳ばないよう、なめらかに追う
        _v.copy(a.p).addScaledVector(this.vel, rem); _v.y = g + this.rest;
        if (f.fresh) { f.E.copy(_v); f.fresh = false; } else f.E.lerp(_v, Math.min(1, dt / 0.04));
        const e = easeIO(f.u);
        tgt = _t.copy(f.S).lerp(f.E, e); tgt.y += Math.sin(f.u * Math.PI) * f.lift;
        Q = _q.copy(f.SQ).slerp(a.q, e);
        if (f.u >= 1) { f.mode = 'plant'; f.P.copy(f.E); f.Q.copy(a.q); }
      } else { tgt = _t.copy(f.P); Q = _q.copy(f.Q); }
      if (this.w < 1) { tgt.lerp(a.p, 1 - this.w); Q.slerp(a.q, 1 - this.w); }
      // ひざを向ける点：姿勢のひざの曲がる向き
      const mid = _c.copy(a.hip).add(a.p).multiplyScalar(0.5);
      const pole = a.knee.clone().sub(mid).multiplyScalar(3).add(a.knee);
      const UL = J[f.s + 'UpperLeg'], LL = J[f.s + 'LowerLeg'], FT = J[f.s + 'Foot'];
      // 足の裏（かかと・つま先の付け根）が床より下なら足首を上げる
      if (O.dims) {
        const D = O.dims, ws = this.ws;
        const yh = _c.set(0, -D.ankleY * ws, -D.heel * ws).applyQuaternion(Q).y, yb = _b.set(0, -D.ankleY * ws, D.ball * ws).applyQuaternion(Q).y;
        const low = tgt.y + Math.min(yh, yb);
        if (low < g) tgt.y += g - low;
      }
      const T = tgt.clone(), QQ = Q.clone();
      twoBoneIK(UL, LL, FT, T, pole);
      setWorldQuat(FT, QQ);
    });
  }
}

/**
 * 両手持ち：左手を右手の持つ武器（刀の柄・鉄パイプ・拳銃）の握る所へ（腕の IK）。2026-11-09：左手が鉄パイプから離れて見えた・強攻撃の溜めで左手が柄から外れた。
 * update(dt, { want（0..1）, weapon（右手に付いた武器の Object3D）, grip（武器の局所の握る点 [x,y,z]）})
 *  左の手首＝握る点＋（右の手首 − 武器の根元：柄の線に直角な分を柄の回りに 180° 回した物）。左手の向きは右手の向きを指の向きで返した物へ寄せる。ひじは姿勢のひじの向き
 */
export class GripIK {
  constructor(J, opt = {}) {
    this.J = J; this.w = 0; this.opt = Object.assign({ inS: 0.07, outS: 0.12, flip: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI) }, opt);
    this.ok = !!(J.leftUpperArm && J.leftLowerArm && J.leftHand && J.rightHand);
    this.last = null;
  }
  update(dt, o) {
    if (!this.ok) return;
    const want = o.weapon ? clamp(o.want || 0, 0, 1) : 0;
    this.w += (want - this.w) * Math.min(1, dt / (want > this.w ? this.opt.inS : this.opt.outS));
    if (want === 0 && this.w < 0.01) { this.w = 0; return; }
    const W = o.weapon || this.last; if (!W) return; this.last = W;
    const J = this.J, UA = J.leftUpperArm, LA = J.leftLowerArm, H = J.leftHand;
    J.chest ? J.chest.updateWorldMatrix(true, true) : UA.updateWorldMatrix(true, true);
    W.updateWorldMatrix(true, false); J.rightHand.updateWorldMatrix(true, false);
    const O = W.getWorldPosition(new THREE.Vector3()), R = J.rightHand.getWorldPosition(new THREE.Vector3());
    const g = o.grip || [0, -0.1, 0];
    // 柄の線（武器の局所 y）の回りに 180°：左手は柄の反対の側から握る（手首のずれも同じに回す）
    const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(W.getWorldQuaternion(new THREE.Quaternion())).normalize(), flipQ = new THREE.Quaternion().setFromAxisAngle(ax, Math.PI);
    const off = R.sub(O); off.addScaledVector(ax, -off.dot(ax)).applyQuaternion(flipQ);
    const tgt = W.localToWorld(new THREE.Vector3(g[0], g[1], g[2])).add(off);
    const cur = H.getWorldPosition(new THREE.Vector3()), sh = UA.getWorldPosition(new THREE.Vector3()), el = LA.getWorldPosition(new THREE.Vector3());
    const bend = el.clone().sub(sh.clone().add(cur).multiplyScalar(0.5));
    if (bend.lengthSq() < 1e-6) bend.set(0, -0.1, -0.05);                                 // 腕が伸び切っている：ひじは下・後ろ
    const pole = bend.multiplyScalar(3).add(el);
    const Qh = H.getWorldQuaternion(new THREE.Quaternion());
    // 左手の向き：右手（の差し込み口）を柄の線の回りに 180° 回した向き（柄の反対の側から握る・親指は同じ向き）。差し込み口が無ければ指の向きで返す
    let Qw;
    const sR = this.opt.sockR, sL = this.opt.sockL;
    if (sR && sL) {
      Qw = sR.getWorldQuaternion(new THREE.Quaternion()).premultiply(flipQ).multiply(sL.quaternion.clone().invert());
    } else Qw = J.rightHand.getWorldQuaternion(new THREE.Quaternion()).multiply(this.opt.flip);
    const w = this.w;
    twoBoneIK(UA, LA, H, cur.clone().lerp(tgt, w), pole);
    setWorldQuat(H, Qh.slerp(Qw, w));
  }
}

/**
 * 指を握る（VRM の normalized の指の骨：T ポーズで指は腕の向き・手のひらは下）。2026-11-09：武器を持っても手が開いたままで、銃・柄が手から浮いて見えた。
 * makeFingers(vrm, vrm0) → { right: [{ b, k }...], left: [...] }。setFingers(F, side, w)：0＝開く・1＝握る（手のひらの側へ曲げる）
 */
const CURL = { Proximal: 1.2, Intermediate: 1.3, Distal: 0.85 };
export function makeFingers(vrm, vrm0 = false) {
  const H = vrm && vrm.humanoid; if (!H || !H.getNormalizedBoneNode) return null;
  const out = { right: [], left: [] };
  for (const side of ['right', 'left']) for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (const [seg, a] of Object.entries(CURL)) {
    const b = H.getNormalizedBoneNode(side + f + seg); if (b) out[side].push({ b, a: a * (side === 'right' ? 1 : -1) * (vrm0 ? -1 : 1), axis: new THREE.Vector3(0, 0, 1) });
  }
  for (const side of ['right', 'left']) {   // 親指：柄を回り込むように少し内へ
    const t = H.getNormalizedBoneNode(side + 'ThumbDistal') || H.getNormalizedBoneNode(side + 'ThumbIntermediate');
    if (t) out[side].push({ b: t, a: 0.6 * (side === 'right' ? -1 : 1) * (vrm0 ? -1 : 1), axis: new THREE.Vector3(0, 1, 0) });
  }
  return out.right.length || out.left.length ? out : null;
}
export function setFingers(F, side, w) {
  if (!F || !F[side]) return;
  for (const f of F[side]) f.b.quaternion.setFromAxisAngle(f.axis, f.a * w);
}
