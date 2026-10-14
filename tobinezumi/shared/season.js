// tobinezumi/shared/season.js — 季節と天気、それが暮らし・移動・捕食者に与える影響（ブラウザとサーバーで同じ計算・DOM なし）。
//
// ・季節：世界の 2 日（実時間 48 分）で 1 つ進む。春 → 夏 → 秋 → 冬（1 年 = 8 日 = 約 3 時間 12 分）。
// ・天気：世界の 4 時間（実時間 4 分）ごとに、世界の時刻と種から決まる（全員同じ・送らなくてよい）。
//     clear 晴れ / sandstorm 砂嵐 / rain 雨。季節で出やすさが変わる（夏は砂嵐、春と秋は雨）。
//     「寒い夜」は天気ではなく「冬の夜」のこと（巣の外にいると体調が減る）。
// ・時計（shared/daynight.js の clock）に weather / season があれば、それに固定（開発用：?weather=… / TOBI_WEATHER）。
// ・影響（envAt）：
//     砂嵐：跳ねる速さ ×0.8・見通し ×0.5（捕食者も見つけにくい）・フクロウとヘビは出ない／巣の外で物かげ（岩・木・低木・小石の山・巣穴の入口のそば）
//           にいないと体調が 12 分で 0 になる速さで減る
//     雨：草むらに水たまり（飲める +20）。採集物の戻りが ×0.7（よく育つ）。見通し ×0.85
//     冬の夜（寒い夜）：巣の外にいると体調が 15 分で 0 になる速さで減る（冷える土地 ×1.5・おだやかな土地 ×0.6）。巣の中なら減らない
//     夏の昼：暑い土地で水分の減り ×1.5（乾いた土地 ×1.2）。春・秋の昼は暑い土地 ×1.2
//     休眠：夏の昼・冬に巣の寝床で眠ると「休眠」— 体調の戻り ×1.5、眠っている間の空腹・水分の減り ×0.5
//     季節の実り：秋は採集物の戻り ×0.85、冬は ×1.3
import { DAY_MS, HOUR_MS, worldMs, dayPhase, periodOf } from './daynight.js';
import { hash2 } from './rng.js';
import { TILE, T, tileAt } from './regions.js';
import { landAt } from './lands.js';

export const SEASON_DAYS = 2;
export const SEASON_MS = SEASON_DAYS * DAY_MS;
export const SEASONS = [
  { id: 'spring', name: '春' }, { id: 'summer', name: '夏' }, { id: 'autumn', name: '秋' }, { id: 'winter', name: '冬' },
];
export const WEATHER_SLOT_MS = 4 * HOUR_MS;
export const WEATHERS = {
  clear:     { id: 'clear', name: '晴れ' },
  sandstorm: { id: 'sandstorm', name: '砂嵐' },
  rain:      { id: 'rain', name: '雨' },
};
// 季節ごとの出やすさ [晴れ, 砂嵐, 雨]
export const WEATHER_TABLE = {
  spring: [0.62, 0.1, 0.28],
  summer: [0.66, 0.29, 0.05],
  autumn: [0.62, 0.14, 0.24],
  winter: [0.8, 0.1, 0.1],
};
export const WEATHER_SEED = 7331;
export const ENV = {
  STORM_SPEED: 0.8, STORM_VIS: 0.5, RAIN_VIS: 0.85,
  STORM_COND_SEC: 12 * 60,          // 砂嵐で物かげにいないと、体調がこの秒数で 100 → 0 の速さで減る
  COLD_COND_SEC: 15 * 60,           // 冬の夜に巣の外
  SHELTER_R: 18,                    // 物かげ：この距離（px）以内に岩・木・低木・小石の山・巣穴の入口
  REST_MUL: 1.5, REST_DRAIN: 0.5,   // 休眠
  PUDDLE_MAX: 10, PUDDLE_SPAWN_MS: 8000, PUDDLE_DRINK: 20,
};

const SEASON_IDS = SEASONS.map(s => s.id);
export const seasonIndex = id => SEASON_IDS.indexOf(id);

/** 季節：{id, name, index, day(この季節の何日目 1〜), progress 0..1} */
export function seasonOf(clock, t) { return seasonFromWorld(worldMs(clock, t), clock && clock.season); }
/** 世界の経過 ms から季節（forced があればそれ） */
export function seasonFromWorld(w, forced = null) {
  const n = Math.floor(w / SEASON_MS);
  let idx = ((n % 4) + 4) % 4;
  if (forced && seasonIndex(forced) >= 0) idx = seasonIndex(forced);
  const into = ((w % SEASON_MS) + SEASON_MS) % SEASON_MS;
  return { ...SEASONS[idx], index: idx, day: Math.floor(into / DAY_MS) + 1, progress: into / SEASON_MS };
}

/** 天気：{id, name, k(0..1 の強さ：変わり目でゆっくり), slot, next(次に変わるまでの世界の ms)} */
export function weatherAt(clock, t) {
  const w = worldMs(clock, t);
  const slot = Math.floor(w / WEATHER_SLOT_MS);
  const into = w - slot * WEATHER_SLOT_MS;
  const k = Math.min(1, Math.min(into, WEATHER_SLOT_MS - into) / (WEATHER_SLOT_MS * 0.08));
  if (clock && clock.weather && WEATHERS[clock.weather]) return { ...WEATHERS[clock.weather], k: 1, slot, next: WEATHER_SLOT_MS - into, forced: true };
  const season = seasonFromWorld(slot * WEATHER_SLOT_MS, clock && clock.season);
  const id = pickWeather(season.id, slot);
  // 前後と同じ天気なら変わり目でも弱めない
  const prevSame = pickWeather(season.id, slot - 1) === id, nextSame = pickWeather(season.id, slot + 1) === id;
  let kk = k;
  if (into < WEATHER_SLOT_MS / 2 && prevSame) kk = 1;
  if (into >= WEATHER_SLOT_MS / 2 && nextSame) kk = 1;
  return { ...WEATHERS[id], k: id === 'clear' ? 1 : kk, slot, next: WEATHER_SLOT_MS - into };
}
/** 天気の札を引く（季節と枠番号から決まる） */
export function pickWeather(seasonId, slot) {
  const p = WEATHER_TABLE[seasonId] || WEATHER_TABLE.spring;
  const h = hash2(slot | 0, Math.floor(slot / 65536), WEATHER_SEED);
  return h < p[0] ? 'clear' : h < p[0] + p[1] ? 'sandstorm' : 'rain';
}

/** 物かげか（砂嵐をしのげる）：岩・木・低木・小石の山のそば、または巣穴の入口のそば */
export function isSheltered(map, x, y, entrances = [], r = ENV.SHELTER_R) {
  const t0x = Math.floor((x - r) / TILE), t1x = Math.floor((x + r) / TILE), t0y = Math.floor((y - r) / TILE), t1y = Math.floor((y + r) / TILE);
  for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
    const t = tileAt(map, tx, ty);
    if (t !== T.ROCK && t !== T.TREE && t !== T.SHRUB && t !== T.STONES) continue;
    const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE)), cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
    if (Math.hypot(cx - x, cy - y) <= r) return true;
  }
  for (const e of entrances) if (Math.hypot(e.x - x, e.y - y) <= r) return true;
  return false;
}

/**
 * いる場所・時刻の影響。opts = {map, x, y, place:'field'|'nest'|'none', entrances, enabled}
 * 返り値：{season, weather, period, cold, heat, sheltered, rest, move:{speed}, life:{thirstMul, hungerMul, condPerSec, restMul, sleepDrainMul},
 *          vis, pred:{owl, fox, snake}, respawnMul, labels:[…]}
 */
export function envAt(clock, t, { map = null, x = 0, y = 0, place = 'field', entrances = [], enabled = true } = {}) {
  const season = seasonOf(clock, t), weather = weatherAt(clock, t), period = periodOf(dayPhase(clock, t));
  const env = {
    season: season.id, seasonName: season.name, weather: weather.id, weatherName: weather.name, weatherK: weather.k, period,
    cold: false, heat: false, sheltered: false, rest: null,
    move: { speed: 1 }, life: { thirstMul: 1, hungerMul: 1, condPerSec: 0, restMul: 1, sleepDrainMul: 1 },
    vis: 1, pred: { owl: 1, fox: 1, snake: 1 }, respawnMul: 1, labels: [],
  };
  if (!enabled) return env;
  const onField = place === 'field';
  const land = map ? landAt(map, x, y) : null;
  const climate = land ? land.climate : 'dry';
  // 季節の実り
  if (season.id === 'autumn') env.respawnMul *= 0.85;
  if (season.id === 'winter') env.respawnMul *= 1.3;
  // 天気
  if (weather.id === 'sandstorm') {
    env.vis = ENV.STORM_VIS; env.pred.owl = 0; env.pred.snake = 0; env.pred.fox = 0.5;
    if (onField) {
      env.move.speed = ENV.STORM_SPEED;
      env.sheltered = map ? isSheltered(map, x, y, entrances) : false;
      if (!env.sheltered) { env.life.condPerSec -= 100 / ENV.STORM_COND_SEC; env.labels.push('砂嵐で体調が減っている（岩や低木のかげ・巣へ）'); }
    }
  } else if (weather.id === 'rain') {
    env.vis = ENV.RAIN_VIS; env.respawnMul *= 0.7; env.pred.owl = 0.5; env.pred.snake = 0.4;
  }
  // 寒い夜（冬の夜）
  if (season.id === 'winter' && period === 'night') {
    env.cold = true;
    env.pred.snake = 0;
    if (onField) {
      const m = climate === 'cool' ? 1.5 : climate === 'mild' ? 0.6 : 1;
      env.life.condPerSec -= 100 / ENV.COLD_COND_SEC * m;
      env.labels.push('寒い夜：巣の外では体調が減る');
    }
  }
  if (season.id === 'winter') env.pred.snake = 0;
  // 暑さ（昼）
  if (period === 'day' && onField) {
    let m = 1;
    if (season.id === 'summer') m = climate === 'hot' ? 1.5 : climate === 'dry' ? 1.2 : 1;
    else if (season.id !== 'winter') m = climate === 'hot' ? 1.2 : 1;
    if (m > 1) { env.heat = true; env.life.thirstMul *= m; }
    if (climate === 'mild') env.life.thirstMul *= 0.9;
  }
  // 休眠（巣の中で眠るとき）：夏の昼・冬
  if (place === 'nest' && ((season.id === 'summer' && period === 'day') || season.id === 'winter')) {
    env.rest = season.id === 'summer' ? 'aestivation' : 'hibernation';
    env.life.restMul = ENV.REST_MUL; env.life.sleepDrainMul = ENV.REST_DRAIN;
  }
  // 季節と捕食者：ヘビは暑い季節、フクロウは冬に多め
  if (season.id === 'summer') env.pred.snake *= 1.3;
  if (season.id === 'winter') env.pred.owl *= 1.3;
  return env;
}

/** 移動ルール（stepField）に渡す補正をまとめる。life の tired と、天気の速さ */
export function fieldMods(lifeMods, env) {
  const sp = env && env.move ? env.move.speed : 1;
  if (!lifeMods && sp === 1) return null;
  return { ...(lifeMods || {}), ...(sp !== 1 ? { speed: sp } : {}) };
}

export const REST_NAME = { aestivation: '夏の休眠', hibernation: '冬眠' };
void SEASON_DAYS;
