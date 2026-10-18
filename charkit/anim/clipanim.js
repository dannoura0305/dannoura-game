// クリップ（VRMA など本物の動きのデータ）で人型を動かす係。AnimationMixer＋状態機械＋慣性の混ぜ（inertialization）＋足の固定（IK）＋戦闘のこまの伸縮。
// docs/wakaba-charkit/14 §4.1〜4.4。作品の判定（当たり・無敵・移動の速さ）は作品側（shinshoku/combat/fighter.js・data/combat.js）が正で、ここは見た目だけ。
//
// 1 こまの順番（Player.animate から）：
//   1) 作品の手続きの姿勢（予備）を骨に当てる（Poser）  2) update(dt, ctx)：状態から「源」を選ぶ（clip の組 or 手続き）
//   3) 源が clip なら AnimationMixer の時刻を決めて当てる（移動：速さで重ね・足の位相で時刻をそろえる／攻撃：combatfit で区間ごとに伸縮）
//   4) 源が変わったこまで、前のこまの出力との差（骨ごとの回転のずれ・腰の位置のずれ）を覚え、blendS 秒で 0 へ減らす（慣性の混ぜ）
//   5) 足の固定：移動・待機のクリップで、地面に着いた足の位置を世界に固定して脚を 2 本の骨の IK（charkit/anim/loco.js の solveLeg）で解き直す。床より下へは入れない
//   6) 会話の手（gesture）は上半身だけ重ねる（別の mixer）
// 役割（clips.json の role）：idle・loco（速さ speedMS ごと・足の位相 footL の u をそろえる）・start・stop・turnL・turnR・dodge・attack（match：weapon・heavy・step）・hit・gesture。
// 無い役割は手続きの姿勢のまま（予備）。
import * as THREE from 'three';
import { fitSegments, GAME_FPS } from './combatfit.js';
import { solveLeg } from './loco.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const UPPER = /^(spine|chest|upperChest|neck|head|left(Shoulder|UpperArm|LowerArm|Hand)|right(Shoulder|UpperArm|LowerArm|Hand)|left(Thumb|Index|Middle|Ring|Little)|right(Thumb|Index|Middle|Ring|Little))/;
const ARMS = /^(left|right)(UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/;

/** 区間ごとの対応 map（[[src, dst]...]）で、作品の時間 dst → クリップの時間 src */
export function warpTime(map, dst) {
  if (!map || map.length < 2) return dst;
  if (dst <= map[0][1]) return map[0][0];
  for (let i = 1; i < map.length; i++) {
    const [s0, d0] = map[i - 1], [s1, d1] = map[i];
    if (dst <= d1) return d1 > d0 ? s0 + (s1 - s0) * (dst - d0) / (d1 - d0) : s1;
  }
  return map[map.length - 1][0];
}

/** 速さ v の時の移動のクリップの重み（速さの順に並んだ組。両隣で直線に）。[{ it, w }] */
export function locoWeights(list, v) {
  if (!list.length) return [];
  if (v <= list[0].meta.speedMS) return [{ it: list[0], w: 1 }];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if (v <= b.meta.speedMS) { const t = (v - a.meta.speedMS) / Math.max(1e-6, b.meta.speedMS - a.meta.speedMS); return [{ it: a, w: 1 - t }, { it: b, w: t }].filter(x => x.w > 1e-4); }
  }
  return [{ it: list[list.length - 1], w: 1 }];
}

export class ClipAnimator {
  /**
   * root：AnimationMixer の根（VRM なら vrm.scene）。J：人型の骨（normalized・17 本＋あれば他）。
   * set：loadClipSet の戻り値 { clips: { id: { clip, meta } } }。
   * opt：{ blendS（慣性の混ぜの秒・既定 0.2）, footIK（既定 true）, legDims（loco.js の形・root の局所の単位）, ground（root の局所の床の高さを返す関数）,
   *        sceneScale（root の大きさの倍率：1 周期の距離に掛ける）, vrm0（VRM 0.x：骨の向きが 180° 違う） }
   */
  constructor(root, J, set, opt = {}) {
    this.root = root; this.J = J; this.opt = Object.assign({ blendS: 0.2, footIK: true }, opt);
    this.mixer = new THREE.AnimationMixer(root); this.mixer2 = new THREE.AnimationMixer(root);
    this.items = Object.values((set && set.clips) || {}).map(({ clip, meta }) => ({ id: meta.id, clip, meta, action: null, action2: null }));
    for (const it of this.items) { it.action = this.mixer.clipAction(it.clip); it.action.setLoop(THREE.LoopRepeat, Infinity); if (it.meta.role === 'gesture') { it.action2 = this.mixer2.clipAction(it.clip); it.action2.setLoop(THREE.LoopRepeat, Infinity); } }
    this.loco = this.items.filter(it => it.meta.role === 'loco' && it.meta.speedMS > 0).sort((a, b) => a.meta.speedMS - b.meta.speedMS);
    for (const it of this.loco) { const fl = (it.meta.events || []).find(e => e.t === 'footL' && e.u != null); it.uOff = fl ? fl.u : 0; it.cycleM = it.meta.speedMS * it.clip.duration * (it.meta.strideScale || 1) * (this.opt.sceneScale || 1); }
    this.role = r => this.items.filter(it => it.meta.role === r);
    // 慣性の混ぜの対象：クリップが動かす骨（回転）と J
    const nodes = new Set(Object.values(J));
    for (const it of this.items) for (const t of it.clip.tracks) { const n = t.name.split('.')[0]; const o = root.getObjectByName(n); if (o) nodes.add(o); }
    this.bones = [...nodes];
    this.prevQ = this.bones.map(b => b.quaternion.clone()); this.offQ = this.bones.map(() => new THREE.Quaternion()); this.procQ = this.bones.map(() => new THREE.Quaternion());
    this.isArm = this.bones.map(b => { const k = Object.keys(J).find(n => J[n] === b); return !!(k && ARMS.test(k)); });
    this.isUpper = this.bones.map(b => { const k = Object.keys(J).find(n => J[n] === b); return !!(k && UPPER.test(k)); });
    this.prevHips = J.hips ? J.hips.position.clone() : new THREE.Vector3(); this.offHips = new THREE.Vector3();
    this.key = null; this.blendT = 1; this.visV = 0; this.idleT = 0; this.one = null; this.gestW = 0; this.gestT = 0; this.wasMoving = false;
    this.feet = ['left', 'right'].map(s => ({ s, lock: null, w: 0, planted: false }));
    this.stats = { switches: 0, lastKey: null, ikFrames: 0, lockFrames: 0, fits: {} };
    this._fit = new Map();
    this.active = new Set();
  }
  get hasLoco() { return this.loco.length > 0; }
  /** 1 周期（2 歩）の距離（m）：速さで重ねる。Player の位相の進み（distance matching）に使う */
  cycleLen(v) { const w = locoWeights(this.loco, v); let s = 0; for (const x of w) s += x.w * x.it.cycleM; return s || 1.5; }
  /** 位相の進み（1m あたりのラジアン）。重ねの速さ（なめらかにした見た目の速さ visV）と同じ速さで決める（足の位相と重ねがそろう） */
  //  速さが急に変わった間は、足の運び（歩数）も見た目の速さに合わせる（1m あたりの位相 × 見た目の速さ ÷ 本当の速さ・0.5〜1.5 倍）。ずれた分の足の滑りは足の固定が消す
  phaseRate(v) { const vv = this.visV > 0.1 ? this.visV : v; return 2 * Math.PI / this.cycleLen(Math.max(0.05, vv)) * (v > 0.1 ? clamp(vv / v, 0.5, 1.5) : 1); }
  find(role, ctx = {}) {
    const list = this.role(role); if (!list.length) return null;
    if (role !== 'attack') return list[0];
    const m = list.filter(it => { const q = it.meta.match || {}; return (q.weapon == null || q.weapon === ctx.weapon) && (q.heavy == null || q.heavy === !!ctx.heavy) && (q.step == null || q.step === ctx.step); });
    return m[0] || null;
  }
  fit(it, atk) {
    const k = it.id + ':' + atk.startup + ':' + atk.active + ':' + (atk.recovery || 0);
    if (!this._fit.has(k)) {
      const fps = it.meta.fps || GAME_FPS, frames = it.meta.frames || Math.round(it.clip.duration * fps);
      const f = fitSegments(it.meta.events || [], frames, fps, atk);
      this._fit.set(k, f); this.stats.fits[k] = { ok: f.ok, scales: f.scales.map(x => +x.toFixed(3)), errors: f.errors };
    }
    return this._fit.get(k);
  }
  /**
   * 今のこまの源を選ぶ。ctx：{ st（状態の名前）, f（状態のこま）, total（状態の長さ こま）, atk（startup/active/recovery）, step, heavy, weapon,
   *   speed, phase（ラジアン）, turn（rad/s）, talking, override（演出の姿勢）, aiming }
   * 戻り値：{ key, parts:[{ it, time, w }], ik:bool, roll:bool（回避の転がりをクリップが受け持つ） }
   */
  select(dt, ctx) {
    const st = ctx.st || 'free', speed = ctx.speed || 0, moving = speed > 0.1;
    // 見た目の速さ：急に速さが変わっても歩き → 走りの重ねが 1 こまで跳ばない（約 0.2 秒でなじむ）。止まり始めは今の速さから
    this.visV = this.visV > 0.1 && moving ? this.visV + (speed - this.visV) * (1 - Math.exp(-dt * 5)) : speed;
    if (ctx.override) return { key: 'proc:override', parts: [] };
    if (st === 'attack' && ctx.atk) {
      const it = this.find('attack', ctx);
      if (it) { const f = this.fit(it, ctx.atk); const tGame = (ctx.f || 0) / GAME_FPS; const t = f.map.length ? warpTime(f.map, tGame) : tGame; return { key: 'attack:' + it.id + ':' + (ctx.step ?? '') + (ctx.heavy ? 'h' : ''), parts: [{ it, time: clamp(t, 0, it.clip.duration - 1e-4), w: 1 }] }; }
      return { key: 'proc:attack', parts: [] };
    }
    if (st === 'dodge' || st === 'hurt') {
      const it = this.find(st === 'dodge' ? 'dodge' : 'hit');
      if (it) { const total = ctx.total || it.meta.frames || 24; const t = (ctx.f || 0) / total * it.clip.duration; return { key: st + ':' + it.id, parts: [{ it, time: clamp(t, 0, it.clip.duration - 1e-4), w: 1 }], roll: st === 'dodge' }; }
      return { key: 'proc:' + st, parts: [] };
    }
    if (st !== 'free') { this.one = null; return { key: 'proc:' + st, parts: [] }; }
    // 一度だけの動き（動き出し・止まり・その場の向き替え）
    if (this.one) {
      this.one.t += dt;
      const o = this.one, d = o.it.clip.duration;
      const cancel = (o.role === 'start' && !moving) || (o.role === 'stop' && moving) || ((o.role === 'turnL' || o.role === 'turnR') && moving);
      if (o.t >= d - 1e-3 || cancel) this.one = null;
      else return { key: 'one:' + o.it.id, parts: [{ it: o.it, time: o.t, w: 1 }], ik: true };
    }
    if (moving !== this.wasMoving) {
      const r = moving ? 'start' : 'stop', it = this.find(r);
      this.wasMoving = moving;
      if (it) { this.one = { it, t: 0, role: r }; return { key: 'one:' + it.id, parts: [{ it, time: 0, w: 1 }], ik: true }; }
    }
    if (moving && this.loco.length) {
      const u = (ctx.phase || 0) / (2 * Math.PI);
      const parts = locoWeights(this.loco, this.visV).map(({ it, w }) => { const uu = ((u + it.uOff) % 1 + 1) % 1; return { it, time: Math.min(uu * it.clip.duration, it.clip.duration - 1e-4), w }; });
      return { key: 'loco', parts, ik: true };
    }
    if (!moving) {
      const tr = ctx.turn || 0;
      if (Math.abs(tr) > 1.2) { const it = this.find(tr > 0 ? 'turnL' : 'turnR'); if (it) { this.one = { it, t: 0, role: it.meta.role }; return { key: 'one:' + it.id, parts: [{ it, time: 0, w: 1 }], ik: true }; } }
      const it = this.find('idle');
      if (it) { this.idleT += dt; return { key: 'idle', parts: [{ it, time: this.idleT % it.clip.duration, w: 1 }], ik: true }; }
    }
    return { key: 'proc:free', parts: [] };
  }
  /** 骨に当てる。戻り値：{ used（クリップを当てた）, key, roll } */
  update(dt, ctx = {}) {
    const B = this.bones, J = this.J;
    for (let i = 0; i < B.length; i++) this.procQ[i].copy(B[i].quaternion);
    const procHips = J.hips ? J.hips.position.clone() : null;
    const sel = this.select(dt, ctx);
    const used = sel.parts.length > 0;
    if (used) {
      const want = new Set(sel.parts.map(p => p.it));
      for (const it of this.active) if (!want.has(it)) { it.action.stop(); this.active.delete(it); }
      for (const p of sel.parts) { const a = p.it.action; if (!this.active.has(p.it)) { a.reset(); a.play(); this.active.add(p.it); } a.enabled = true; a.setEffectiveWeight(p.w); a.setEffectiveTimeScale(0); a.time = p.time; }
      this.mixer.update(0);
      // 武器を持っている時などは腕を手続きの姿勢のまま（作品が決める）
      if (ctx.armsFromProc) for (let i = 0; i < B.length; i++) if (this.isArm[i]) B[i].quaternion.copy(this.procQ[i]);
    } else if (this.active.size) { for (const it of this.active) it.action.stop(); this.active.clear(); }
    // 源が変わった：慣性の混ぜを始める
    if (sel.key !== this.key) {
      if (this.key != null) {
        for (let i = 0; i < B.length; i++) this.offQ[i].copy(this.prevQ[i]).multiply(B[i].quaternion.clone().invert());
        if (J.hips) this.offHips.copy(this.prevHips).sub(J.hips.position);
        this.blendT = 0; this.stats.switches++;
      }
      this.key = sel.key; this.stats.lastKey = sel.key;
      if (!sel.key.startsWith('idle')) this.idleT = 0;
    }
    const T = this.opt.blendS;
    if (this.blendT < T) {
      this.blendT += dt;
      const w = 1 - smooth(this.blendT / T);
      const id = new THREE.Quaternion(), q = new THREE.Quaternion();
      for (let i = 0; i < B.length; i++) { q.copy(id).slerp(this.offQ[i], w); B[i].quaternion.premultiply(q); }
      if (J.hips) J.hips.position.addScaledVector(this.offHips, w);
    }
    // 会話の手（上半身だけ）
    const g = ctx.talking && (ctx.st || 'free') === 'free' && (ctx.speed || 0) < 0.3 ? this.find('gesture') : null;
    this.gestW += ((g ? 0.75 : 0) - this.gestW) * Math.min(1, dt * 4);
    if (this.gestW > 0.01) {
      const it = g || this.lastGest; this.lastGest = it;
      if (it && it.action2) {
        const keep = B.map(b => b.quaternion.clone()); const hp = J.hips ? J.hips.position.clone() : null;
        this.gestT += dt; it.action2.play(); it.action2.setEffectiveWeight(1); it.action2.setEffectiveTimeScale(0); it.action2.time = this.gestT % it.clip.duration; this.mixer2.update(0);
        for (let i = 0; i < B.length; i++) { if (this.isUpper[i]) B[i].quaternion.copy(keep[i]).slerp(B[i].quaternion, this.gestW); else B[i].quaternion.copy(keep[i]); }
        if (hp) J.hips.position.copy(hp);
      }
    } else if (this.lastGest && this.lastGest.action2) { this.lastGest.action2.stop(); this.lastGest = null; this.gestT = 0; }
    // 足の固定（クリップの移動・待機の時）
    if (used && sel.ik && this.opt.footIK && this.opt.legDims) this.footIK(dt, ctx); else for (const f of this.feet) { f.lock = null; f.w = 0; f.planted = false; }
    for (let i = 0; i < B.length; i++) this.prevQ[i].copy(B[i].quaternion);
    if (J.hips) this.prevHips.copy(J.hips.position);
    void procHips;
    return { used, key: sel.key, roll: !!sel.roll };
  }
  /** 足を地面に固定する：根（root）の局所で脚を解く。床（ground）より下にも入れない */
  footIK(dt, ctx) {
    const J = this.J, L = this.opt.legDims, R = this.root;
    if (!J.hips || !J.leftUpperLeg || !J.leftLowerLeg || !J.leftFoot) return;
    R.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(R.matrixWorld).invert();
    const rq = new THREE.Quaternion(); R.getWorldQuaternion(rq); const rqi = rq.clone().invert();
    const groundY = this.opt.ground ? this.opt.ground() : 0;
    const ankleH = L.ankleY;                                        // 足首の休みの高さ（床から）
    const loc = (o, out = new THREE.Vector3()) => o.getWorldPosition(out).applyMatrix4(inv);
    const q = new THREE.Quaternion();
    this.stats.ikFrames++;
    for (const f of this.feet) {
      const UL = J[f.s + 'UpperLeg'], LL = J[f.s + 'LowerLeg'], FT = J[f.s + 'Foot'];
      const hj = loc(UL), kn = loc(LL), an = loc(FT);
      const footWQ = FT.getWorldQuaternion(new THREE.Quaternion());
      const anW = FT.getWorldPosition(new THREE.Vector3());
      // 着いている点（かかと・つま先の付け根の低い方）のクリップのままの世界の動きを打ち消す（滑りの残りを消す）。
      // 足首を 1 点に止めない：つま先で転がる間も足首は前へ動けるので、足の裏の転がりは崩れない。離れたら補正を 0.08 秒で 0 へ
      const heelW = new THREE.Vector3(0, -ankleH, -L.heel).applyMatrix4(FT.matrixWorld), ballW = new THREE.Vector3(0, -ankleH, L.ball).applyMatrix4(FT.matrixWorld);
      const gW = new THREE.Vector3(0, groundY, 0).applyMatrix4(R.matrixWorld).y;
      const useBall = ballW.y < heelW.y, pt = useBall ? ballW : heelW, pv = useBall ? f.prevBall : f.prevHeel, prev = pv ? pv.clone() : null;
      const vel = prev && dt > 0 ? Math.hypot(pt.x - prev.x, pt.z - prev.z) / dt : 9;
      (f.prevHeel || (f.prevHeel = new THREE.Vector3())).copy(heelW); (f.prevBall || (f.prevBall = new THREE.Vector3())).copy(ballW);
      const c = f.c || (f.c = new THREE.Vector3());
      f.planted = pt.y - gW < 0.02 * (L.thigh / 0.4) && vel < 0.5;
      if (f.planted && prev) { c.x -= (pt.x - prev.x); c.z -= (pt.z - prev.z); const m = Math.hypot(c.x, c.z), mx = 0.12 * (L.thigh / 0.4); if (m > mx) c.multiplyScalar(mx / m); this.stats.lockFrames++; }
      else c.multiplyScalar(Math.exp(-dt / 0.08));
      f.w = f.planted ? 1 : 0;
      const tgt = anW.clone().add(c).applyMatrix4(inv);
      // 床へ入れない：足の向き（クリップのまま）でかかと・つま先の付け根の低い方が床より下なら足首を上げる
      const fq = rqi.clone().multiply(footWQ);
      const heel = new THREE.Vector3(0, -ankleH, -L.heel).applyQuaternion(fq), ball = new THREE.Vector3(0, -ankleH, L.ball).applyQuaternion(fq);
      const lowPt = tgt.y + Math.min(heel.y, ball.y);
      if (lowPt < groundY) tgt.y += groundY - lowPt;
      if (tgt.distanceToSquared(an) < 1e-8) continue;
      const L1 = LL.position.length(), L2 = FT.position.length();
      // ひざの向き：クリップの太ももの前（骨の +z）。脚が伸び切っていても向きが決まる（ひざの位置からだと裏返ることがある）
      const sg = this.opt.vrm0 ? -1 : 1;                               // VRM 0.x の normalized は骨の向きが 180° 違う（+z が後ろ）
      const pole = new THREE.Vector3(0, 0, sg).applyQuaternion(rqi.clone().multiply(UL.getWorldQuaternion(new THREE.Quaternion()))).toArray(); void kn;
      const r = solveLeg(hj.toArray(), tgt.toArray(), L1, L2, pole);
      // 太もも：root の局所の回転 → 親（腰）の局所
      const parentWQ = UL.parent.getWorldQuaternion(new THREE.Quaternion());
      const parentLQ = rqi.clone().multiply(parentWQ);                         // root の局所での親の回転
      UL.quaternion.copy(parentLQ.invert().multiply(q.fromArray(r.thighQ)));
      if (sg < 0) UL.quaternion.multiply(new THREE.Quaternion(0, 1, 0, 0));
      LL.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), r.knee * sg);
      LL.updateWorldMatrix(true, false);
      const llWQ = LL.getWorldQuaternion(new THREE.Quaternion());
      FT.quaternion.copy(llWQ.invert().multiply(footWQ));
    }
  }
}
