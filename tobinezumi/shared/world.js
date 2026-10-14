// tobinezumi/shared/world.js — Ver.0.5「広がり」：いくつもの土地（地図）と、そのつながり。ブラウザとサーバーで同じもの・DOM なし。
//
//   はじまりの原（plains・前からの地図）を真ん中に、北に「いわばの高台」（岩場）、東に「すなの海」（砂丘）、西に「みずおとの谷」（渓谷）。
//   地図の端の「出口」（regions.js の makeGate）に足を入れると、となりの土地へ旅する（サーバーは 1 つの土地 = 1 つの地上の部屋）。
//   隠しエリア「富山」は出口ではつながっていない。渓谷の奥（REGION.canyon.secret）に、条件がそろったときだけ「不思議な穴」が開く
//   （条件は shared/collect.js の gateOpen。サーバーが確かめる）。富山の「来た穴」（toyama.back）からはいつでも谷へ戻れる。
//
//   regionMap(id) … 同じ id なら必ず同じ地図（種から決まる・1 回だけ作って覚える）。地図の大きさはどれも 96×64 タイル。
//   map.region / map.areaAt(px, py)（地域名）/ map.gates（出口）/ map.safe（安全地帯）/ map.climate / map.props（富山の調べられる物）
import { TILE, T, FIELD_W, FIELD_H, FIELD_SEED, buildFieldMap, makeGate, tileAt, TILE_INFO, POND } from './regions.js';
import { mulberry32, hash2, fbm } from './rng.js';

/** 土地の一覧（world map の並び：x, y は地図画面の上の位置） */
export const REGION = {
  plains: { id: 'plains', name: 'はじまりの原', short: '原', seed: FIELD_SEED, climate: null, hidden: false, wm: { x: 1, y: 1 },
    pred: { owl: 1, fox: 1, snake: 1 }, res: 90, desc: '草原と砂漠とオアシス。みんなの出発点。' },
  rocks: { id: 'rocks', name: 'いわばの高台', short: '岩', seed: 20261101, climate: 'cool', hidden: false, wm: { x: 1, y: 0 },
    pred: { owl: 0.9, fox: 0.7, snake: 1.8 }, res: 70, rare: 0.42, desc: '岩が連なる高台。ヘビが多いが、きれいな石がよく見つかる。土は硬い。' },
  dunes: { id: 'dunes', name: 'すなの海', short: '砂', seed: 20261102, climate: 'hot', hidden: false, wm: { x: 2, y: 1 },
    pred: { owl: 1.6, fox: 0.6, snake: 0.3 }, res: 42, rare: 0.18, slow: true, desc: 'さらさらの砂丘。食べ物は少なく、昼は暑い。昼の捕食者は少ないが、夜はフクロウが多い。' },
  canyon: { id: 'canyon', name: 'みずおとの谷', short: '谷', seed: 20261103, climate: 'cool', hidden: false, wm: { x: 0, y: 1 },
    pred: { owl: 1, fox: 1, snake: 0.7 }, res: 100, rare: 0.3, desc: '谷底を川が流れる、草木の多い涼しい土地。段差は下りられるが、上がるのは坂だけ。' },
  toyama: { id: 'toyama', name: '富山', short: '？', seed: 4440444, climate: 'cold', hidden: true, wm: { x: 0, y: 2 },
    pred: { owl: 0, fox: 0, snake: 0 }, res: 46, rare: 0, desc: '雪の山と、水の張られた田んぼ。トビネズミのいるはずのない土地。' },
};
export const REGION_IDS = ['plains', 'rocks', 'dunes', 'canyon', 'toyama'];
export const OPEN_REGIONS = ['plains', 'rocks', 'dunes', 'canyon'];   // ふつうに行ける土地（実績「旅するトビネズミ」）
export const isRegion = id => Object.prototype.hasOwnProperty.call(REGION, id);
export const regionName = id => (REGION[id] || REGION.plains).name;

const cache = new Map();
/** 土地の地図（同じ id なら同じもの） */
export function regionMap(id = 'plains') {
  if (!isRegion(id)) id = 'plains';
  if (cache.has(id)) return cache.get(id);
  const m = id === 'plains' ? buildFieldMap() : GEN[id](REGION[id]);
  m.region = id;
  m.climate = REGION[id].climate;
  if (REGION[id].rare != null) m.rareP = REGION[id].rare;
  m.predMul = REGION[id].pred;
  if (!m.safe) m.safe = [{ id: 'plaza', x: m.spawn.x, y: m.spawn.y, r: 5 * TILE }];
  cache.set(id, m);
  return m;
}
/** 着いたときの場所：行き先の地図で「来た土地」へ向かう出口のそば */
export function arrivalPoint(map, from) {
  const g = (map.gates || []).find(q => q.to === from);
  if (g) return { x: g.ax, y: g.ay, dir: { n: 'down', s: 'up', e: 'left', w: 'right' }[g.dir] };
  return { x: map.spawn.x, y: map.spawn.y, dir: 'down' };
}

// ───────── 地図づくりの道具 ─────────
function blank(seed, fill = T.SAND) {
  const w = FIELD_W, h = FIELD_H;
  const ground = new Uint8Array(w * h).fill(fill), tiles = new Uint8Array(w * h).fill(fill);
  return { w, h, tile: TILE, seed, ground, tiles, pxW: w * TILE, pxH: h * TILE };
}
const idx = (m, x, y) => y * m.w + x;
function setT(m, x, y, t) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[idx(m, x, y)] = t; }
function setG(m, x, y, g) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) { m.ground[idx(m, x, y)] = g; m.tiles[idx(m, x, y)] = g; } }
/** 出口と着く所のまわりをあける（通れる地面に戻す） */
function clearRect(m, x0, y0, x1, y1, keepWater = false) {
  for (let y = Math.max(0, y0); y <= Math.min(m.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(m.w - 1, x1); x++) {
    const t = m.tiles[idx(m, x, y)];
    if (keepWater && TILE_INFO[t] && TILE_INFO[t].water) continue;
    if (TILE_INFO[t] && TILE_INFO[t].block) m.tiles[idx(m, x, y)] = m.ground[idx(m, x, y)];
  }
}
function clearGate(m, g) {
  if (g.dir === 'n' || g.dir === 's') { const c = Math.floor(g.ax / TILE); const y0 = g.dir === 'n' ? 0 : m.h - 6; clearRect(m, c - 3, y0, c + 3, y0 + 5); }
  else { const c = Math.floor(g.ay / TILE); const x0 = g.dir === 'w' ? 0 : m.w - 6; clearRect(m, x0, c - 3, x0 + 5, c + 3); }
}
/** 散らばった飾り・障害物（下地が fill の所だけ） */
function scatter(m, rnd, table) {
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    const i = idx(m, x, y);
    if (m.tiles[i] !== m.ground[i]) continue;
    const list = table[m.ground[i]];
    if (!list) continue;
    let r = rnd();
    for (const [t, p] of list) { if (r < p) { m.tiles[i] = t; break; } r -= p; }
  }
}
function finish(m, def, spawnTx, spawnTy, gates) {
  m.spawn = { x: spawnTx * TILE + 8, y: spawnTy * TILE + 8 };
  m.gates = gates;
  for (const g of gates) clearGate(m, g);
  clearRect(m, spawnTx - 3, spawnTy - 3, spawnTx + 3, spawnTy + 3);
  m.region = def.id;
  return m;
}
const area = (id, name) => ({ id, name });

// ───────── いわばの高台（岩場）─────────
function genRocks(def) {
  const m = blank(def.seed, T.DIRT), s = def.seed, rnd = mulberry32(s);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const n = fbm(x / 9, y / 9, s + 3), n2 = fbm(x / 5, y / 5, s + 9);
    setG(m, x, y, n2 > 0.66 ? T.GRASS : n > 0.6 ? T.SAND : T.DIRT);
  }
  // 岩の尾根（ノイズの高い所）と、そのまわりの小石の山
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const r = fbm(x / 4.5, y / 4.5, s + 31) + (fbm(x / 14, y / 14, s + 5) - 0.5) * 0.5;
    if (r > 0.66) setT(m, x, y, T.ROCK);
    else if (r > 0.6 && hash2(x, y, s) < 0.45) setT(m, x, y, T.STONES);
  }
  scatter(m, rnd, {
    [T.DIRT]: [[T.PEBBLE, 0.05], [T.SHRUB, 0.012], [T.STONES, 0.01], [T.TUFT, 0.015]],
    [T.SAND]: [[T.PEBBLE, 0.04], [T.ROCK, 0.01]],
    [T.GRASS]: [[T.TUFT, 0.08], [T.SHRUB, 0.04]],
  });
  m.areaAt = (px, py) => (py < 20 * TILE ? area('hill', 'いわばの高台・北の尾根') : area('hill', 'いわばの高台'));
  return finish(m, def, 38, 57, [makeGate(m, 's', 38, 'plains')]);
}

// ───────── すなの海（砂丘）─────────
function genDunes(def) {
  const m = blank(def.seed, T.SAND), s = def.seed, rnd = mulberry32(s);
  // 風紋の帯（さらさら砂：跳ねる速さ ×0.85）
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const wv = Math.sin(x * 0.3 + y * 0.85 + fbm(x / 10, y / 10, s + 1) * 6);
    if (wv > 0.45) setT(m, x, y, T.DUNE);
    if (fbm(x / 8, y / 8, s + 17) > 0.72) setG(m, x, y, T.DIRT);
  }
  scatter(m, rnd, {
    [T.SAND]: [[T.PEBBLE, 0.012], [T.SHRUB, 0.006], [T.TUFT, 0.008], [T.ROCK, 0.003], [T.STONES, 0.002]],
    [T.DIRT]: [[T.SHRUB, 0.03], [T.TUFT, 0.04], [T.PEBBLE, 0.03]],
  });
  m.slowTiles = true;
  m.areaAt = (px) => (px > 60 * TILE ? area('desert', 'すなの海・風の丘') : area('desert', 'すなの海'));
  return finish(m, def, 6, 34, [makeGate(m, 'w', 34, 'plains')]);
}

// ───────── みずおとの谷（渓谷）─────────
export const CANYON = { LEDGE1: 20, LEDGE2: 38, RIVER: 51, RAMPS1: [[10, 13], [70, 73]], RAMPS2: [[30, 33], [86, 89]], STONES: [20, 52, 76] };
function genCanyon(def) {
  const m = blank(def.seed, T.GRASS), s = def.seed, rnd = mulberry32(s);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const n = fbm(x / 7, y / 7, s + 2);
    // 上の段は土と砂、下ほど草
    const g = y < CANYON.LEDGE1 ? (n > 0.55 ? T.GRASS : n > 0.38 ? T.DIRT : T.SAND) : y < CANYON.LEDGE2 ? (n > 0.35 ? T.GRASS : T.DIRT) : T.GRASS;
    setG(m, x, y, g);
  }
  // 段差（一方通行）と崖：段差の上の列に崖の岩、坂（ramp）は通れる
  const ledge = (y, ramps) => {
    for (let x = 0; x < m.w; x++) {
      const yy = y + Math.round(Math.sin(x / 6 + s) * 0.6);
      if (ramps.some(([a, b]) => x >= a && x <= b)) continue;
      setT(m, x, yy, T.LEDGE);
      if (hash2(x, yy, s + 4) < 0.35) setT(m, x, yy - 1, T.CLIFF);
    }
  };
  ledge(CANYON.LEDGE1, CANYON.RAMPS1);
  ledge(CANYON.LEDGE2, CANYON.RAMPS2);
  // 川（西から東へ）と飛び石
  for (let x = 0; x < m.w; x++) {
    const c = CANYON.RIVER + Math.round(Math.sin(x / 9 + 1) * 1.5);
    for (let y = c - 1; y <= c + 1; y++) setT(m, x, y, T.RIVER);
    if (CANYON.STONES.some(sx => Math.abs(sx - x) <= 0)) for (let y = c - 1; y <= c + 1; y++) setT(m, x, y, T.PEBBLE);
  }
  scatter(m, rnd, {
    [T.GRASS]: [[T.TUFT, 0.09], [T.SHRUB, 0.035], [T.TREE, 0.006], [T.PEBBLE, 0.01]],
    [T.DIRT]: [[T.PEBBLE, 0.04], [T.SHRUB, 0.02], [T.ROCK, 0.012], [T.STONES, 0.008]],
    [T.SAND]: [[T.PEBBLE, 0.03], [T.ROCK, 0.02]],
  });
  // 木の根元はあける
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.tiles[idx(m, x, y)] === T.TREE) {
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if ((xx !== x || yy !== y) && TILE_INFO[m.tiles[idx(m, xx, yy)]].block && m.tiles[idx(m, xx, yy)] !== T.LEDGE && m.tiles[idx(m, xx, yy)] !== T.RIVER) m.tiles[idx(m, xx, yy)] = m.ground[idx(m, xx, yy)];
  }
  // 谷の奥（上流・西の端）：古い石の標と、雪の夜に「不思議な穴」が開く所
  const sx = 6, sy = 46;
  clearRect(m, sx - 3, sy - 3, sx + 4, sy + 2, true);
  setT(m, sx - 2, sy - 2, T.SHRINE);
  m.secret = { x: sx * TILE + 8, y: sy * TILE + 8, stone: { x: (sx - 2) * TILE + 8, y: (sy - 2) * TILE + 8 } };
  m.props = [{ kind: 'stone', x: (sx - 2) * TILE + 8, y: (sy - 2) * TILE + 14, text: '苔むした古い石の標。「ゆきの よる　しろい もの　ここに あなを あける」……と読める気がする。' }];
  m.areaAt = (px, py) => {
    const ty = py / TILE;
    if (ty < CANYON.LEDGE1) return area('canyon', 'みずおとの谷・上の段');
    if (ty < CANYON.LEDGE2) return area('canyon', 'みずおとの谷・中の段');
    if (px < 14 * TILE && ty > 40) return area('canyon', 'みずおとの谷・谷の奥');
    return area('canyon', 'みずおとの谷・谷底');
  };
  return finish(m, def, 85, 29, [makeGate(m, 'e', 29, 'plains')]);
}

// ───────── 富山（隠しエリア）─────────
// 北に雪の山なみ（地図の上 8 行は山。描くのは画面側）・真ん中に水田とあぜ道と水路・南と東の端に瓦屋根の家（人間の世界：入れない）・桜。
// 調べられる物（props）：古い祠の立て札・かすれた数字の道しるべ・捨てられた機械の部品・光る板（電話の画面）。どれも理由は語らない。
export const TOYAMA = { MOUNT_ROWS: 8, PADDY: { x0: 14, y0: 16, x1: 80, y1: 48, pw: 10, ph: 6 } };
function genToyama(def) {
  const m = blank(def.seed, T.GRASS), s = def.seed, rnd = mulberry32(s);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) setG(m, x, y, fbm(x / 6, y / 6, s + 1) > 0.62 ? T.DIRT : T.GRASS);
  for (let y = 0; y < TOYAMA.MOUNT_ROWS; y++) for (let x = 0; x < m.w; x++) setT(m, x, y, T.MOUNT);
  // 山のふもとの道
  for (let x = 0; x < m.w; x++) { setG(m, x, TOYAMA.MOUNT_ROWS + 1, T.DIRT); setT(m, x, TOYAMA.MOUNT_ROWS + 1, T.PATH); }
  // 水田：区画ごとに水を張った田、まわりはあぜ道、いくつかの境に水路
  const P = TOYAMA.PADDY;
  for (let y = P.y0; y < P.y1; y++) for (let x = P.x0; x < P.x1; x++) {
    const lx = (x - P.x0) % (P.pw + 2), ly = (y - P.y0) % (P.ph + 2);
    if (lx >= P.pw || ly >= P.ph) { setG(m, x, y, T.DIRT); setT(m, x, y, T.PATH); }
    else setT(m, x, y, T.PADDY);
  }
  // 水路（縦に 2 本・横に 1 本。1 マスの幅なので大ジャンプで越えられる）
  for (let y = P.y0 - 2; y < P.y1 + 2; y++) { setT(m, P.x0 - 2, y, T.CHANNEL); setT(m, P.x0 + 4 * (P.pw + 2) - 1, y, T.CHANNEL); }
  for (let x = P.x0 - 2; x < P.x1; x++) if (x !== P.x0 + 4 * (P.pw + 2) - 1) setT(m, x, P.y1 + 1, T.CHANNEL);
  // 水路をまたぐ小さな橋（あぜ道）
  for (const [bx, by] of [[P.x0 - 2, 30], [P.x0 + 4 * (P.pw + 2) - 1, 22], [P.x0 + 4 * (P.pw + 2) - 1, 40], [30, P.y1 + 1], [62, P.y1 + 1]]) setT(m, bx, by, T.PATH);
  // 南の端と東の端に家（瓦屋根：入れない）
  const houses = [];
  for (let x = 4; x < 86; x += 9) { if (x > 40 && x < 50) continue; houses.push({ x, y: 56, w: 6, h: 5 }); }
  for (let y = 14; y < 52; y += 9) houses.push({ x: 88, y, w: 6, h: 5 });
  for (const hs of houses) for (let y = hs.y; y < hs.y + hs.h; y++) for (let x = hs.x; x < hs.x + hs.w; x++) setT(m, x, y, T.HOUSE);
  m.houses = houses;
  // 桜（あぜ道ぞい・祠のまわり）
  for (let x = 10; x < 84; x += 7) setT(m, x, TOYAMA.MOUNT_ROWS + 3, T.SAKURA);
  for (const [x, y] of [[5, 20], [9, 24], [4, 38], [11, 41], [84, 12], [46, 52], [40, 51]]) setT(m, x, y, T.SAKURA);
  scatter(m, rnd, { [T.GRASS]: [[T.TUFT, 0.07], [T.SHRUB, 0.012], [T.PEBBLE, 0.008]], [T.DIRT]: [[T.PEBBLE, 0.02]] });
  // 祠（西）・道しるべ（あぜ道の交わる所）・機械の部品（東の家のそば）・光る板（南）
  setT(m, 7, 16, T.SHRINE);
  const props = [
    { kind: 'shrine', x: 7 * TILE + 8, y: 16 * TILE + 14, text: '小さな祠。立て札の字は かすれて ほとんど読めない。「…の神さま　…まもり…」' },
    { kind: 'post', x: 45 * TILE + 8, y: 50 * TILE + 12, text: '細い道しるべ。かすれた数字だけが読める。「４４４」' },
    { kind: 'machine', x: 82 * TILE + 8, y: 40 * TILE + 12, text: '草の中に、油のにおいのする金属のかたまり。工場で使うもの…だろうか。' },
    { kind: 'phone', x: 60 * TILE + 8, y: 53 * TILE + 10, text: '草の中で、四角い板がぼんやり光っている。画面に文字が流れた。「……」　すぐに暗くなった。' },
    { kind: 'lights', x: 92 * TILE, y: 10 * TILE, text: '山のふもとの向こうに、夜通し灯りのついた大きな建物が見える。' },
  ];
  for (const p of props) if (p.kind !== 'lights') setT(m, Math.floor(p.x / TILE), Math.floor((p.y - 6) / TILE), T.SHRINE);
  m.props = props;
  // 来た穴（ここからいつでも谷へ戻れる）
  const bx = 6, by = 31;
  clearRect(m, bx - 2, by - 2, bx + 3, by + 3);
  m.back = { x: bx * TILE + 8, y: by * TILE + 8 };
  m.noBurrow = 'ここでは 巣を掘る気になれない（土が冷たくて、なにかが違う）';
  m.areaAt = (px, py) => {
    const tx = px / TILE, ty = py / TILE;
    if (ty < TOYAMA.MOUNT_ROWS + 4) return area('toyama', '富山・山のふもと');
    if (tx >= P.x0 - 2 && tx < P.x1 && ty >= P.y0 - 2 && ty < P.y1 + 2) return area('toyama', '富山・田んぼ');
    if (ty > 52 || tx > 86) return area('toyama', '富山・家のそば');
    return area('toyama', '富山');
  };
  m.safe = [{ id: 'all', x: m.pxW / 2, y: m.pxH / 2, r: 9999 }];
  return finish(m, def, bx + 2, by, []);
}

const GEN = { rocks: genRocks, dunes: genDunes, canyon: genCanyon, toyama: genToyama };
void POND; void tileAt;
