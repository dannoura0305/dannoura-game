// tobinezumi/shared/life.js — 暮らしの数値（空腹・水分・体調）。ブラウザとサーバーで同じものを使う。DOM なし。
//
// ・3 つとも 0〜100。100 が「満ち足りている」。
// ・遊んでいる間（地上・巣の中にいる間）だけ減る。ログアウト中・タイトル画面では減らない（呼ぶ側が dt を渡さない）。
//   満タンから 0 まで：空腹 25 分・水分 20 分・体調 40 分（起きている間の疲れ）。
// ・空腹か水分が 0 になると、体調がさらに減る（1 つ 0 なら +10 分で 0 になる速さ）。それでも 0 で止まり、死にはしない（Ver.0.2）。
// ・体調が 25 未満：跳ねる速さ ×0.7、大ジャンプできない（shared/move.js の stepField に tired を渡す）。
// ・寝床で眠ると体調が 45 秒で全快（時間を早回しした扱い：眠っている間は空腹・水分が 2 倍の速さで減る）。満タンで自然に起きる。
// ・種子 1 つで空腹 +15、水場で 1 口 水分 +30、夜露 1 つで水分 +15。
export const STAT_MAX = 100;
export const LIFE = {
  HUNGER_SEC: 25 * 60,        // 満タン → 0 の秒数
  THIRST_SEC: 20 * 60,
  COND_SEC: 40 * 60,          // 起きている間の疲れ
  STARVE_SEC: 10 * 60,        // 空腹・水分が 0 のとき、1 つにつき体調がこの速さで減る
  SLEEP_FULL_SEC: 45,         // 眠って体調 0 → 100
  SLEEP_DRAIN: 2,             // 眠っている間の空腹・水分の減り（早回し）
  TIRED: 25,                  // これ未満で「へとへと」
  TIRED_SPEED: 0.7,           // へとへとのときの跳ねる速さ
  SEED_FOOD: 15,              // 種子 1 つ
  WATER_DRINK: 30,            // 水場で 1 口
  DEW_DRINK: 15,              // 夜露 1 つ
  LOW: 30,                    // 「おなかがすいた」などの知らせを出す境目
  START: { hunger: 80, thirst: 80, cond: 100 },
  ACTION_GAP_MS: 400,         // 食べる・飲むの連打の間隔（サーバー）
};

const clamp = v => Math.max(0, Math.min(STAT_MAX, Number.isFinite(v) ? v : 0));
const r2 = v => Math.round(v * 100) / 100;

export function makeLife() { return { hunger: LIFE.START.hunger, thirst: LIFE.START.thirst, cond: LIFE.START.cond, sleep: false }; }

/** 壊れた値・古い版（無い）でも落ちない形に */
export function normalizeLife(raw) {
  const L = makeLife();
  if (!raw || typeof raw !== 'object') return L;
  for (const k of ['hunger', 'thirst', 'cond']) if (Number.isFinite(Number(raw[k]))) L[k] = clamp(Number(raw[k]));
  L.sleep = !!raw.sleep;
  return L;
}
/** 保存・送信用（小数 2 桁） */
export function lifeOut(L) { return { hunger: r2(L.hunger), thirst: r2(L.thirst), cond: r2(L.cond), sleep: !!L.sleep }; }

/**
 * dt 秒ぶん進める（L は書き換えない）。sleeping は寝床で眠っているか。
 * 眠っていて体調が満タンになったら sleep=false（自然に起きる）。
 * env（Ver.0.3・shared/season.js の envAt(...).life）：{thirstMul, hungerMul, condPerSec, restMul, sleepDrainMul}
 *   暑さで水分が早く減る・砂嵐や寒い夜で体調が減る・休眠で眠りが深い。無ければ Ver.0.2 と同じ。
 */
export function stepLife(L, dt, { sleeping = !!L.sleep, env = null } = {}) {
  if (!(dt > 0)) return { ...L };
  const n = { ...L };
  const E = env || {};
  const drain = sleeping ? LIFE.SLEEP_DRAIN * (E.sleepDrainMul || 1) : 1;
  n.hunger = clamp(n.hunger - STAT_MAX / LIFE.HUNGER_SEC * dt * drain * (E.hungerMul || 1));
  n.thirst = clamp(n.thirst - STAT_MAX / LIFE.THIRST_SEC * dt * drain * (E.thirstMul || 1));
  const empty = (n.hunger <= 0 ? 1 : 0) + (n.thirst <= 0 ? 1 : 0);
  let dc = -empty * STAT_MAX / LIFE.STARVE_SEC * dt;
  if (sleeping) dc += STAT_MAX / LIFE.SLEEP_FULL_SEC * dt * (empty ? 0.5 : 1) * (E.restMul || 1);   // おなかが空っぽだと眠りが浅い
  else dc -= STAT_MAX / LIFE.COND_SEC * dt;
  if (!sleeping && E.condPerSec) dc += E.condPerSec * dt;     // 砂嵐・寒い夜（負の値）
  n.cond = clamp(n.cond + dc);
  n.sleep = sleeping && n.cond < STAT_MAX;
  return n;
}

/** 捕食者につかまった（Ver.0.3）：体調が大きく減る（死なない）。easy はやさしい設定 */
export const CAUGHT_COND = 35, CAUGHT_COND_EASY = 18;
export function caughtLife(L, easy = false) { return { ...L, cond: clamp(L.cond - (easy ? CAUGHT_COND_EASY : CAUGHT_COND)), sleep: false }; }
/** 珍しい種を食べる：空腹 +40・体調 +10 */
export const RARE_SEED_FOOD = 40, RARE_SEED_COND = 10;
export function eatRareSeed(L) { return { ...L, hunger: clamp(L.hunger + RARE_SEED_FOOD), cond: clamp(L.cond + RARE_SEED_COND) }; }

export function isTired(L) { return !!L && L.cond < LIFE.TIRED; }
/** 移動ルールに渡す補正（shared/move.js の stepField の第 5 引数） */
export function moveMods(L) { return isTired(L) ? { tired: true } : null; }

export function eatSeed(L, n = 1) { return { ...L, hunger: clamp(L.hunger + LIFE.SEED_FOOD * n) }; }
export function drink(L, amount = LIFE.WATER_DRINK) { return { ...L, thirst: clamp(L.thirst + amount) }; }
export const canEat = L => L.hunger < STAT_MAX - 1;
export const canDrink = L => L.thirst < STAT_MAX - 1;

/** 境目をまたいだときの知らせ（before → after）。画面のトースト用 */
export function lifeAlerts(before, after) {
  const out = [];
  const crossed = (k, lv) => before[k] >= lv && after[k] < lv;
  if (crossed('hunger', LIFE.LOW)) out.push('おなかがすいてきた（種子を食べよう）');
  if (crossed('thirst', LIFE.LOW)) out.push('のどがかわいてきた（オアシスや夜露で水を飲もう）');
  if (crossed('cond', LIFE.TIRED)) out.push('へとへとだ…（大ジャンプできない。巣の寝床で眠ろう）');
  if (crossed('hunger', 0.01)) out.push('おなかがぺこぺこ。体調が下がっていく');
  if (crossed('thirst', 0.01)) out.push('のどがからから。体調が下がっていく');
  return out;
}

/** 数値 → 短いことば（HUD の説明） */
export function lifeWord(k, v) {
  if (k === 'cond') return v >= 70 ? '元気' : v >= LIFE.TIRED ? 'すこし疲れた' : v > 0 ? 'へとへと' : 'ふらふら';
  if (k === 'hunger') return v >= 70 ? '満腹' : v >= LIFE.LOW ? 'ふつう' : v > 0 ? 'すいている' : 'ぺこぺこ';
  return v >= 70 ? 'うるおっている' : v >= LIFE.LOW ? 'ふつう' : v > 0 ? 'かわいている' : 'からから';
}
