// tobinezumi/shared/regions.js — 地上フィールドの地図（96×64 タイル・1 タイル 16px）
// サーバーとクライアントが同じ種（seed）から同じ地図を作る。DOM なし。
//
//   西：かれくさの原（乾燥草原：草地・土・低木が多い）
//   東：ゆうやけ砂漠（砂地・小石の山）
//   北の中ほど：オアシス（水場＋木）　南東：いわかげの丘（岩場）
import { mulberry32, hash2, fbm } from './rng.js';

export const TILE = 16;
export const FIELD_W = 96, FIELD_H = 64;
export const FIELD_SEED = 20261010;

// タイルの種類
export const T = { SAND: 0, DIRT: 1, GRASS: 2, ROCK: 3, SHRUB: 4, STONES: 5, WATER: 6, TREE: 7, PEBBLE: 8, TUFT: 9 };
// block：歩いて通れない　high：大ジャンプでも越えられない
export const TILE_INFO = [
  { name: '砂地',     block: false, high: false },
  { name: '土',       block: false, high: false },
  { name: '草地',     block: false, high: false },
  { name: '岩',       block: true,  high: true },
  { name: '低木',     block: true,  high: false },
  { name: '小石の山', block: true,  high: false },
  { name: '水場',     block: true,  high: true },
  { name: '木',       block: true,  high: true },
  { name: '小石',     block: false, high: false },  // 地面の飾り（採集物の小石とは別）
  { name: '草の房',   block: false, high: false },  // 地面の飾り
];
// 飾りタイルの下地（描画用）
export function groundOf(map, tx, ty) { return map.ground[ty * map.w + tx]; }

export const POND = { x: 50, y: 13, rx: 7.5, ry: 4.2 };
export const HILL = { x: 79, y: 49, r: 8 };
export const TREES = [{ x: 42, y: 11 }, { x: 58, y: 9 }, { x: 18, y: 44 }];

export const REGIONS = [
  { id: 'oasis',  name: 'オアシスのほとり' },
  { id: 'hill',   name: 'いわかげの丘' },
  { id: 'steppe', name: 'かれくさの原' },
  { id: 'desert', name: 'ゆうやけ砂漠' },
];

function clearAround(tiles, ground, w, h, cx, cy, r) {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const t = tiles[y * w + x];
    if (t === T.SHRUB || t === T.STONES || t === T.ROCK) tiles[y * w + x] = ground[y * w + x];
  }
}

/** 地図を作る（同じ seed なら必ず同じ結果） */
export function buildFieldMap(seed = FIELD_SEED) {
  const w = FIELD_W, h = FIELD_H;
  const ground = new Uint8Array(w * h);   // 下地（砂・土・草）
  const tiles = new Uint8Array(w * h);    // 上にのるもの込み
  const rnd = mulberry32(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // 西ほど草原、東ほど砂漠。境目はノイズで揺らす
    const west = 1 - x / w + (fbm(x / 14, y / 14, seed) - 0.5) * 0.7;
    const n2 = fbm(x / 6, y / 6, seed + 7);
    let g;
    if (west > 0.66) g = n2 > 0.64 ? T.DIRT : n2 > 0.36 ? T.GRASS : T.SAND;
    else if (west > 0.5) g = n2 > 0.6 ? T.GRASS : n2 > 0.47 ? T.DIRT : T.SAND;
    else g = n2 > 0.72 ? T.DIRT : T.SAND;
    // オアシスのまわりは草
    const pd = Math.hypot((x - POND.x) / (POND.rx + 4), (y - POND.y) / (POND.ry + 3));
    if (pd < 1) g = T.GRASS;
    ground[y * w + x] = g;
    tiles[y * w + x] = g;
  }
  // 水場
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot((x + 0.5 - POND.x) / POND.rx, (y + 0.5 - POND.y) / POND.ry) + (hash2(x, y, seed) - 0.5) * 0.12;
    if (d < 1) tiles[y * w + x] = T.WATER;
  }
  // 岩場（丘）
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x - HILL.x, y - HILL.y);
    const n = fbm(x / 3, y / 3, seed + 31);
    if (d < HILL.r && n > 0.5 - (HILL.r - d) * 0.025) tiles[y * w + x] = T.ROCK;
    else if (d < HILL.r + 3 && n > 0.62) tiles[y * w + x] = T.STONES;
  }
  // 木
  for (const t of TREES) tiles[t.y * w + t.x] = T.TREE;
  // ばらばらの岩・低木・小石の山・飾り
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (tiles[i] !== ground[i]) continue;
    const r = rnd();
    const g = ground[i];
    if (g === T.GRASS || g === T.DIRT) {
      if (r < 0.04) tiles[i] = T.SHRUB;
      else if (r < 0.046) tiles[i] = T.STONES;
      else if (r < 0.085) tiles[i] = T.TUFT;
      else if (r < 0.095) tiles[i] = T.PEBBLE;
    } else {
      if (r < 0.016) tiles[i] = T.SHRUB;
      else if (r < 0.028) tiles[i] = T.STONES;
      else if (r < 0.034) tiles[i] = T.ROCK;
      else if (r < 0.055) tiles[i] = T.PEBBLE;
      else if (r < 0.07) tiles[i] = T.TUFT;
    }
  }
  const spawn = { x: 46 * TILE + 8, y: 32 * TILE + 8 };
  clearAround(tiles, ground, w, h, 46, 32, 3);
  // 木の根元はあける（幹 1 タイルだけ通れない）
  for (const t of TREES) for (let y = t.y - 1; y <= t.y + 1; y++) for (let x = t.x - 1; x <= t.x + 1; x++) {
    if ((x !== t.x || y !== t.y) && tiles[y * w + x] !== T.WATER) tiles[y * w + x] = ground[y * w + x];
  }
  return { w, h, tile: TILE, seed, ground, tiles, spawn, pxW: w * TILE, pxH: h * TILE };
}

export function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return -1;   // 地図の外
  return map.tiles[ty * map.w + tx];
}
/** 歩いて入れないか（地図の外も通れない） */
export function isBlocking(map, tx, ty) {
  const t = tileAt(map, tx, ty);
  return t < 0 || TILE_INFO[t].block;
}
/** 大ジャンプでも越えられないか */
export function isHigh(map, tx, ty) {
  const t = tileAt(map, tx, ty);
  return t < 0 || TILE_INFO[t].high;
}

export function regionAt(map, px, py) {
  const tx = px / TILE, ty = py / TILE;
  if (Math.hypot((tx - POND.x) / (POND.rx + 6), (ty - POND.y) / (POND.ry + 5)) < 1) return REGIONS[0];
  if (Math.hypot(tx - HILL.x, ty - HILL.y) < HILL.r + 5) return REGIONS[1];
  const g = map.ground[Math.max(0, Math.min(map.h - 1, ty | 0)) * map.w + Math.max(0, Math.min(map.w - 1, tx | 0))];
  return g === T.SAND ? REGIONS[3] : REGIONS[2];
}

/** 採集物が出てくる場所（種類ごと）。地形に合わせて決まる */
export function resourceSpawnPoints(map) {
  const pts = [];
  const near = (tx, ty, kind, r) => {
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (tileAt(map, x, y) === kind) return true;
    return false;
  };
  for (let ty = 2; ty < map.h - 2; ty++) for (let tx = 2; tx < map.w - 2; tx++) {
    const t = tileAt(map, tx, ty);
    if (TILE_INFO[t].block) continue;
    const g = map.ground[ty * map.w + tx];
    const hsh = hash2(tx, ty, map.seed + 555);
    let kind = null;
    if (near(tx, ty, T.SHRUB, 1) && hsh < 0.35) kind = 'seed';
    else if (g === T.GRASS && hsh < 0.08) kind = 'grass';
    else if (g === T.GRASS && hsh < 0.11) kind = 'seed';
    else if ((near(tx, ty, T.STONES, 1) || near(tx, ty, T.ROCK, 1)) && hsh < 0.3) kind = 'pebble';
    else if (g === T.SAND && hsh < 0.025) kind = 'pebble';
    else if (g === T.DIRT && hsh < 0.04) kind = 'grass';
    if (!kind) continue;
    const jx = Math.round((hash2(tx, ty, 9) - 0.5) * 6), jy = Math.round((hash2(tx, ty, 13) - 0.5) * 6);
    pts.push({ x: tx * TILE + 8 + jx, y: ty * TILE + 8 + jy, kind });
  }
  return pts;
}

/** 最初に置く採集物（count 個、種から決まる）。id は 'r1'… */
export function initialResources(map, count = 90, seed = map.seed) {
  const pts = resourceSpawnPoints(map);
  const rnd = mulberry32(seed + 99);
  const used = new Set();
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 20 && used.size < pts.length) {
    const i = Math.floor(rnd() * pts.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push({ id: 'r' + (out.length + 1), kind: pts[i].kind, x: pts[i].x, y: pts[i].y });
  }
  return out;
}

/** 取られた採集物の再出現：同じ種類の出現点から、ほかの採集物と重ならない所を選ぶ */
export function pickRespawnPoint(points, kind, occupied, rnd) {
  const cand = points.filter(p => p.kind === kind && !occupied.some(o => Math.abs(o.x - p.x) < 12 && Math.abs(o.y - p.y) < 12));
  if (!cand.length) return null;
  return cand[Math.floor(rnd() * cand.length)];
}
export const RESPAWN_MIN = 120, RESPAWN_MAX = 300;   // 秒（2〜5 分）

export const BURROW_MIN_DIST = 6 * TILE;
/** ここに巣を掘れるか */
export function canDigBurrow(map, px, py, entrances = []) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 2 || ty < 2 || tx > map.w - 3 || ty > map.h - 3) return { ok: false, reason: '地図の端すぎる' };
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
    const t = tileAt(map, x, y);
    if (t === T.WATER) return { ok: false, reason: '水場に近すぎる' };
    if (TILE_INFO[t].block) return { ok: false, reason: 'まわりが混みあっている' };
  }
  for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (tileAt(map, x, y) === T.WATER) return { ok: false, reason: '水場に近すぎる' };
  if (Math.hypot(px - map.spawn.x, py - map.spawn.y) < 3 * TILE) return { ok: false, reason: 'みんなの通り道だ' };
  for (const e of entrances) if (Math.hypot(e.x - px, e.y - py) < BURROW_MIN_DIST) return { ok: false, reason: 'ほかの巣に近すぎる' };
  return { ok: true, x: tx * TILE + 8, y: ty * TILE + 8 };
}
