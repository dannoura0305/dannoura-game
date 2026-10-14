// 銃⇄刀の持ち替え時間（COMBAT_SYSTEM_SPEC §3.4）。DOM なし・純粋関数。
import { COMBAT } from '../data/combat.js';
import { WEAPONS } from '../data/weapons.js';

/**
 * 持ち替えにかかるフレーム数。
 * ctx.sinceFire：最後に撃ってからのフレーム（拳銃→刀）
 * ctx.recoveryFrame：刀の連撃の「戻り」の何フレーム目か（刀→拳銃の切替撃ち）。戻り中でなければ undefined
 */
export function swapFrames(from, to, ctx = {}, C = COMBAT) {
  if (from === to) return 0;
  const s = C.swap;
  const wf = WEAPONS[from] || {}, wt = WEAPONS[to] || {};
  if (wf.heavy || wt.heavy) {
    const w = Math.max(wf.weight || 1, wt.weight || 1);              // 重いほど長い（18〜27f）
    return Math.round(s.heavyMin + (s.heavyMax - s.heavyMin) * Math.min(1, (w - 1) / 2));
  }
  if (from === 'katana' && to === 'handgun') {
    if (ctx.recoveryFrame != null && ctx.recoveryFrame >= s.quickShotFrom) return s.quickShot;
    return s.katanaToGun;
  }
  if (from === 'handgun' && to === 'katana') {
    if (ctx.sinceFire != null && ctx.sinceFire <= s.afterFireSpan) return s.afterFire;
    return s.gunToKatana;
  }
  return s.katanaToGun;
}

/** 切替撃ちになるか（戻りの 8f 目以降） */
export function isQuickShot(recoveryFrame, C = COMBAT) {
  return recoveryFrame != null && recoveryFrame >= C.swap.quickShotFrom;
}
