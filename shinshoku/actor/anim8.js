// 主要キャラクター（v2 モデル）の歩き・走り：足を地面に固定する（足の IK）。docs/wakaba-charkit/13 §1.1（足の滑り：平らな地面で平均 ≤2cm/s）。
// 考え方：1 歩き周期（位相 2π）で体が進む距離＝歩幅 S（strideLen）。片足は周期の β（立脚の割合）の間だけ地面に着き、その間の
// 「地面に対する足の位置」を動かさない（かかと → 足の裏全体 → つま先の付け根の順に転がる）。腰の高さは着いている脚が届く高さから決め、
// 太もも・すねの角度は 2 本の骨の IK で解く（ひざは前へ曲がる）。位相の進み方は heroPhaseRate（Player・相棒・演出の移動で同じ物を使う）。
// 角度の向き（actor/rig.js）：前へ振る＝x マイナス／ひざを曲げる＝x プラス／足首：つま先を下げる＝x プラス。
const S = Math.sin;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// P13：歩き・走りの本体は charkit/anim/loco.js（クリップ charkit/anim/clips/*.json と性格の値）。ここは前の名前で呼べるようにした入口。
import * as LO from '../../charkit/anim/loco.js';
import { legIK } from '../../charkit/anim/loco.js';
export { legIK };

/** 歩き → 走りの混ぜ具合（0..1） */
export const runK = v => LO.runK(v);
/** 1 周期（2 歩）で進む距離（m）。scale：体の大きさ（脚の長さの比）、pers：性格（id か値） */
export function strideLen(v, scale = 1, pers) { return LO.strideLen(v, scale, LO.personality(pers)); }
/** 進んだ 1m あたりの位相（ラジアン） */
export function heroPhaseRate(v, scale = 1, pers) { return 2 * Math.PI / strideLen(Math.max(0.05, v), scale, pers); }

/** 脚の寸法（skin.js の DIM から）：{ thigh, shin, hipY（股関節の休みの高さ）, ankleY（足首の休みの高さ）, heel, ball, hipX, pelvisY } */
export const legDims = LO.legDims;

/**
 * 歩き・走り（足の IK）。ph：位相、v：速さ（m/s）、o：{ dims, rate（1m あたりの位相）, scale, pers, lean, noArms }
 * 戻り値：姿勢（rig.js の形）＋ hipsT・_exactLegs（脚は補間しないで当てる）・_feet（足首の目標）
 */
export function locomotionIK(ph, v, o = {}) {
  return LO.locoPose(ph, v, { dims: o.dims, scale: o.scale, rate: o.rate, pers: o.pers, lean: o.lean, noArms: o.noArms });
}
/** 立っている（足を地面に置いた IK の待機）。t：秒、o：{ dims, scale, pers, k, turn } */
export function idleIK(t, o = {}) { return LO.idlePose(t, o); }

/** 止まっている時の向き替え（その場で足を踏み替える）：turn（rad/s）から小さな足踏みの姿勢。ph：足踏みの位相 */
export function turnStep(ph, turn, o = {}) {
  const k = clamp(Math.abs(turn) / 3, 0, 1);
  const p = {};
  for (const [side, off] of [['left', 0], ['right', Math.PI]]) {
    const s = S(ph + off), up = Math.max(0, s) * 0.07 * k;
    const L = o.dims || legDims({ leg: 0.86, thigh: 0.4, shin: 0.385, hipX: 0.085 });
    const [th, kn] = legIK(0.02 * s * k, L.ankleY + up - (L.hipY - 0.01), L.thigh, L.shin);
    p[side + 'UpperLeg'] = [th, 0, 0]; p[side + 'LowerLeg'] = [kn, 0, 0]; p[side + 'Foot'] = [-(th + kn), 0, 0];
  }
  p.hipsY = -0.01 * k;
  return p;
}

/**
 * 立っている姿勢の足を地面に置く（腰を下げた構えで足が床にめり込まない）：今の太ももの角度から足の前後の位置を出し、
 * 腰の高さ（hipsY）に合わせて IK で解き直す。p を書き換えて返す
 */
export function plantFeet(p, dims) {
  const L = dims, h = L.hipY + (p.hipsY || 0);
  for (const side of ['left', 'right']) {
    const ul = p[side + 'UpperLeg'] || [0, 0, 0], ll = p[side + 'LowerLeg'] || [0, 0, 0];
    if (Math.abs(ul[0]) > 0.5 || ll[0] > 0.6) continue;               // 大きく脚を上げた姿勢はそのまま
    const x = -(L.thigh * S(ul[0]) + L.shin * S(ul[0] + ll[0]));
    const [th, kn] = legIK(x, L.ankleY - h, L.thigh, L.shin);
    p[side + 'UpperLeg'] = [th, ul[1], ul[2]]; p[side + 'LowerLeg'] = [kn, ll[1], ll[2]];
    const ft = p[side + 'Foot'] || [0, 0, 0];
    p[side + 'Foot'] = [-(th + kn), ft[1], ft[2]];
  }
  return p;
}
