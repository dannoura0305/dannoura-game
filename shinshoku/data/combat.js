// 『境界侵食』戦闘の数値（COMBAT_SYSTEM_SPEC §2・§3・§7 の初期値）。
// 単位は 60Hz のフレーム（1f = 16.67ms）。距離は m、速さは m/s。
// DOM・three.js に依存しない（node のテストから読む）。?tune=1 で上書きできるよう、値はここだけに置く。
export const FPS = 60;

export const COMBAT = {
  move: { walk: 2.2, run: 5.0, aim: 1.7, charge: 0.0, reload: 1.6, turn: 14 },
  hp: { max: 100 },
  hitstop: { light: 3, heavy: 5, issen: 8 },
  hurt: { stun: 16, invuln: 30 },
  buffer: 10,                                   // 入力の先行受付（攻撃・回避とも）
  dodge: { total: 24, iStart: 3, iEnd: 14, just: 8, dist: 3.4, chainMax: 2, chainLag: 12, chainGap: 30 },
  justSlow: { scale: 0.3, frames: 36 },          // ジャスト回避の成功：世界 0.3 倍速を実時間 36f
  parry: { before: 6, after: 2, stagger: 54, failLag: 18, guardMul: 0.5 },
  issen: {
    mikiri: { window: 21, dmg: 60, total: 34, strike: 10, slow: 0.25 },   // 見切り一閃：背後へ抜けて斬る
    hajiki: { window: 24, dmg: 50, total: 30, strike: 8, slow: 0.3 },     // 弾き一閃：正面から斬り返す
    iai: { hold: 36, dmg: 55, total: 30, strike: 4, miss: 30 },           // 抜刀一閃：構え中に攻撃が届くと自動で居合
    utsu: { window: 30, dmg: 45, total: 28, strike: 7 },                   // 撃ち一閃：弱点を撃った怯み光の間に刀
    chain: { window: 60, dmg: 45, total: 26, strike: 7, max: 5, range: 7 }, // 連鎖一閃：一閃が当たった直後、近くの「見切り」状態（青い縁）の敵へ跳んで一閃
  },
  // 体幹（よろけの値）：攻撃ごとに削る。0 で大きくよろける（青い縁＝連鎖一閃の相手になる）。数値は敵の def.poise と比べる
  poise: { slash: 10, heavyHit: 35, issen: 100, parried: 45, shot: 6, weak: 30, regenDelay: 3.0, regen: 25 },
  katana: {
    light: [
      { startup: 6, active: 4, recovery: 14, dmg: 10, reach: 2.2, arc: 140, lunge: 0.6, stop: 'light', poise: 10 },
      { startup: 8, active: 4, recovery: 16, dmg: 10, reach: 2.2, arc: 140, lunge: 0.6, stop: 'light', poise: 10 },
      { startup: 10, active: 4, recovery: 22, dmg: 16, reach: 2.6, arc: 120, lunge: 1.6, stop: 'heavy', poise: 20 },
    ],
    heavy: { startup: 18, active: 6, recovery: 26, dmg: 30, reach: 2.8, arc: 160, lunge: 1.0, stop: 'heavy', poise: 35 },
    iaiSwing: { active: 5, recovery: 20, dmg: 30, reach: 3.0, arc: 120, stop: 'heavy', poise: 40 },
  },
  // 鉄パイプ（WEAPON §1：近接・よろけ強・壊れない）。ガードを崩す（guardBreak：構えている敵・体幹を大きく削る）
  pipe: {
    light: [
      { startup: 12, active: 6, recovery: 24, dmg: 14, reach: 2.4, arc: 150, lunge: 0.4, stop: 'heavy', poise: 30, guardBreak: true },
      { startup: 14, active: 6, recovery: 28, dmg: 18, reach: 2.5, arc: 120, lunge: 0.6, stop: 'heavy', poise: 38, guardBreak: true },
    ],
    heavy: { startup: 22, active: 6, recovery: 30, dmg: 34, reach: 2.6, arc: 100, lunge: 0.9, stop: 'heavy', poise: 75, guardBreak: true },
  },
  handgun: { aimIn: 6, interval: 15, hip: 4, dmg: 12, weakMul: 2.5, mag: 12, reload: 84, range: 40, hipCone: 35 },
  // 持ち替え（COMBAT §3.4）
  swap: { katanaToGun: 9, gunToKatana: 9, quickShot: 4, quickShotFrom: 8, afterFire: 12, afterFireSpan: 15, heavyMin: 18, heavyMax: 27 },
  // 難しさ（COMBAT §7）
  difficulty: {
    easy: { just: 12, parryBefore: 10, parryAfter: 3, dmgMul: 0.6, dropMul: 1.5 },
    normal: { just: 8, parryBefore: 6, parryAfter: 2, dmgMul: 1.0, dropMul: 1.0 },
    hard: { just: 6, parryBefore: 4, parryAfter: 1, dmgMul: 1.4, dropMul: 0.7 },
  },
  // 白髪形態（白い姿・化け猫の本来の姿。COMBAT_SYSTEM_SPEC §4）。「速く・軽く」。暴走ではない：妖力が 0 になると静かに紫へ戻る。
  // 値はフェーズ4の初期案【仮】。妖爪 5 段・妖刀（強攻撃＝刃が伸びる刀）・猫火（構え＋撃つ）・瞬歩（回避）・幻術（弾く）。
  white: {
    claw: [
      { startup: 4, active: 3, recovery: 9, dmg: 8, reach: 1.9, arc: 150, lunge: 0.7, stop: 'light', poise: 8, claw: 1 },
      { startup: 4, active: 3, recovery: 9, dmg: 8, reach: 1.9, arc: 150, lunge: 0.7, stop: 'light', poise: 8, claw: 2 },
      { startup: 5, active: 3, recovery: 10, dmg: 9, reach: 2.0, arc: 160, lunge: 0.8, stop: 'light', poise: 10, claw: 1 },
      { startup: 6, active: 4, recovery: 11, dmg: 10, reach: 2.1, arc: 170, lunge: 0.9, stop: 'light', poise: 12, claw: 2 },
      { startup: 8, active: 5, recovery: 18, dmg: 18, reach: 2.6, arc: 200, lunge: 1.6, stop: 'heavy', poise: 30, claw: 3 },
    ],
    blade: { startup: 12, active: 6, recovery: 20, dmg: 34, reach: 4.4, arc: 170, lunge: 1.2, stop: 'heavy', poise: 45, cost: 5 },   // 妖刀：刀の届く距離 ×1.6
    dash: { total: 18, iStart: 2, iEnd: 12, dist: 5.2 },                                                                              // 瞬歩
    foxfire: { cost: 10, n: 3, dmg: 11, speed: 9, turn: 5.5, life: 2.2, cd: 22, burn: 0.8 },                                          // 猫火：追尾する火の玉 3 つ
    illusion: { cost: 15, dur: 3.0, cast: 12 },                                                                                       // 幻術：分身を置いて狙いをそらす
    gauge: { max: 100, start: 60, hit: 2, issen: 15, regen: 1, drain: 2.2, min: 30, purpleHit: 3, purpleIssen: 12 },
    transformHold: 30,                                                                                                                 // 化けを解く：長押し 30f
    comboWindow: 150,                                                                                                                  // 連撃の数が続く間（f）
  },
  touchBonus: 2,                                 // タッチは窓を +2f（指の遅れ）
  assist: { windowBonus: 4, slowBonus: 18 },     // 「一閃の手助け」
};

export const ITEMS = {
  medkit_s: { name: 'ばんそうこう', heal: 25 },
  medkit_l: { name: '救急箱', heal: 60 },
  coffee: { name: '温かい缶コーヒー', heal: 12 },
  ammo_box: { name: '拳銃の弾（12発）', ammo: 12 },
  ammo_small: { name: '拳銃の弾（6発）', ammo: 6 },
  ammo_100: { name: '拳銃の弾（100発）', ammo: 100 },
};

export const f2ms = f => Math.round(f * 1000 / FPS);
export const ms2f = ms => ms * FPS / 1000;
