// tobinezumi/shared/lands.js — 土地（区画）の性能。ブラウザとサーバーで同じ計算（地図と種から決まる・DOM なし）。
//
// ・地上（96×64 タイル）を 12×8 タイルの区画に分ける → 8×8 = 64 区画。id は 'L<列>-<行>'（例 'L3-5'）。
// ・区画ごとの性能（どれも 0〜5 の整数。数字が大きいほど「多い・強い」）
//     food     食料：種・草の出る場所の多さ
//     danger   危険：捕食者の出やすさ（オアシスのほとり・出発点のまわりは 0＝安全地帯）。巣の襲撃の起きやすさにも効く
//     hardness 地質：土の硬さ 1〜5（砂＝やわらかい、岩場＝硬い）→ 巣穴を掘る手間（時間・素材）・引っ越しの費用
//     scenery  景観：水・木・草花の多さ
//     climate  気候：'mild'（おだやか）/'dry'（乾いた）/'hot'（暑い：夏の昼は のどが早くかわく）/'cool'（冷える：冬の夜が寒い）
//     rare     希少資源：'rare_seed'（珍しい種）/'pretty_stone'（きれいな石）/ null
// ・巣は「入口のある区画」の性能を持つ（nest.land）。引っ越すと入口の区画が変わる。
import { TILE, T, FIELD_W, FIELD_H, POND, HILL, TREES, tileAt, regionAt, resourceSpawnPoints } from './regions.js';
import { hash2 } from './rng.js';

export const PLOT_W = 12, PLOT_H = 8;              // タイル
export const PLOT_COLS = FIELD_W / PLOT_W, PLOT_ROWS = FIELD_H / PLOT_H;
export const CLIMATES = {
  mild: { id: 'mild', name: 'おだやか', desc: '暑さ寒さがやわらぐ' },
  dry:  { id: 'dry',  name: '乾いている', desc: '昼は少しのどがかわきやすい' },
  hot:  { id: 'hot',  name: '暑い', desc: '夏の昼は のどがとても早くかわく' },
  cool: { id: 'cool', name: '冷える', desc: '冬の夜は ひときわ寒い' },
  cold: { id: 'cold', name: '寒い', desc: '雪がよく降る。冬の夜はとても寒い' },   // Ver.0.5：富山
};
export const RARES = {
  rare_seed:    { id: 'rare_seed', name: '珍しい種' },
  pretty_stone: { id: 'pretty_stone', name: 'きれいな石' },
};
export const PROP_NAMES = { food: '食料', danger: '危険', hardness: '地質（硬さ）', scenery: '景観' };

/** 安全地帯（捕食者が入らない）：オアシスのほとりの真ん中と、出発点の広場。px 単位 */
export function safeZones(map) {
  if (map.safe) return map.safe;     // Ver.0.5：ほかの土地の地図は自分で持つ（はじまりの原は下の 2 つ）
  return [
    { id: 'oasis', x: POND.x * TILE, y: POND.y * TILE, r: 11 * TILE },
    { id: 'plaza', x: map.spawn.x, y: map.spawn.y, r: 5 * TILE },
  ];
}
export function inSafeZone(map, x, y, pad = 0) {
  for (const z of safeZones(map)) if (Math.hypot(x - z.x, y - z.y) < z.r + pad) return z;
  return null;
}

export const plotIdOf = (cx, cy) => 'L' + cx + '-' + cy;
export function plotAt(px, py) {
  const cx = Math.max(0, Math.min(PLOT_COLS - 1, Math.floor(px / TILE / PLOT_W)));
  const cy = Math.max(0, Math.min(PLOT_ROWS - 1, Math.floor(py / TILE / PLOT_H)));
  return { cx, cy, id: plotIdOf(cx, cy) };
}
export function parsePlotId(id) {
  const m = /^L(\d+)-(\d+)$/.exec(String(id || ''));
  if (!m) return null;
  const cx = +m[1], cy = +m[2];
  return cx < PLOT_COLS && cy < PLOT_ROWS ? { cx, cy } : null;
}

const clamp5 = v => Math.max(0, Math.min(5, Math.round(v)));
const cache = new WeakMap();

/** 全区画の性能（地図ごとに 1 回だけ計算） */
export function buildLands(map) {
  if (cache.has(map)) return cache.get(map);
  const pts = resourceSpawnPoints(map);
  const zones = safeZones(map);
  const out = new Map();
  const foodCount = [];
  for (let cy = 0; cy < PLOT_ROWS; cy++) for (let cx = 0; cx < PLOT_COLS; cx++) {
    const x0 = cx * PLOT_W, y0 = cy * PLOT_H;
    const n = { sand: 0, dirt: 0, grass: 0, rock: 0, stones: 0, shrub: 0, tuft: 0, water: 0, tree: 0 };
    for (let ty = y0; ty < y0 + PLOT_H; ty++) for (let tx = x0; tx < x0 + PLOT_W; tx++) {
      const g = map.ground[ty * map.w + tx], t = tileAt(map, tx, ty);
      if (g === T.SAND) n.sand++; else if (g === T.DIRT) n.dirt++; else n.grass++;
      if (t === T.ROCK) n.rock++; else if (t === T.STONES) n.stones++; else if (t === T.SHRUB) n.shrub++;
      else if (t === T.TUFT) n.tuft++; else if (t === T.WATER || t === T.RIVER || t === T.PADDY || t === T.CHANNEL) n.water++; else if (t === T.TREE || t === T.SAKURA) n.tree++;
    }
    const px = (x0 + PLOT_W / 2) * TILE, py = (y0 + PLOT_H / 2) * TILE;
    const region = regionAt(map, px, py);
    const food = pts.filter(p => p.kind !== 'pebble' && p.x >= x0 * TILE && p.x < (x0 + PLOT_W) * TILE && p.y >= y0 * TILE && p.y < (y0 + PLOT_H) * TILE).length;
    foodCount.push(food);
    const cells = PLOT_W * PLOT_H;
    // 地質：砂 1.2・草 2.2・土 3、岩・小石の山が多いほど硬い
    const hard = (n.sand * 1.2 + n.grass * 2.2 + n.dirt * 3) / cells + (n.rock * 3 + n.stones * 1.5) / cells * 6;
    // 危険：地域で決まる基本 ＋ ゆらぎ、安全地帯に近いほど下がる
    const base = map.region === 'toyama' ? -9 : ({ oasis: 1, steppe: 2.4, desert: 3, hill: 4, canyon: 2.2 }[region.id] ?? 2);
    let dz = 1e9;
    for (const z of zones) dz = Math.min(dz, Math.hypot(px - z.x, py - z.y) - z.r);
    let danger = base + (hash2(cx, cy, map.seed + 404) - 0.5) * 1.6;
    if (dz < 2 * TILE) danger = 0; else if (dz < 8 * TILE) danger -= 1.5;
    // 景観：水・木・草花・低木
    const scen = n.water * 0.25 + n.tree * 2.2 + n.tuft * 0.12 + n.shrub * 0.1 + n.grass / cells * 1.4 + (region.id === 'oasis' ? 1 : 0) + hash2(cx, cy, map.seed + 77) * 0.8;
    // 気候：地図が決めていればそれ（Ver.0.5：岩場・渓谷は冷える・砂丘は暑い・富山は寒い）。渓谷の川べりはおだやか
    const climate = map.climate ? (map.climate === 'cool' && n.water > 6 ? 'mild' : map.climate)
      : region.id === 'oasis' ? 'mild' : region.id === 'desert' ? 'hot' : region.id === 'hill' ? 'cool' : 'dry';
    // 希少資源：草の多い所に珍しい種、岩・砂の所にきれいな石（区画の 1/4 くらい。岩場はきれいな石が多い）
    const h = hash2(cx, cy, map.seed + 913);
    const rareP = map.rareP != null ? map.rareP : 0.26;
    let rare = null;
    if (h < rareP && danger > 0) rare = (region.id === 'hill' || region.id === 'desert' || n.rock + n.stones > 4) ? 'pretty_stone' : 'rare_seed';
    out.set(plotIdOf(cx, cy), {
      id: plotIdOf(cx, cy), cx, cy, region: region.id, regionName: region.name,
      name: region.name + ' ' + (cx + 1) + '-' + (cy + 1), code: region.name + ' ' + (cx + 1) + '-' + (cy + 1), field: map.region || 'plains', feat: plotFeature(n, region.id, map.region),
      foodRaw: food, danger: clamp5(danger), hardness: Math.max(1, clamp5(hard)), scenery: Math.max(1, clamp5(scen)), climate, rare,
      x: px, y: py,
    });
  }
  // 食料は全体の中での順位で 1〜5（地図ごとの偏りを均す）
  const sorted = [...foodCount].sort((a, b) => a - b);
  for (const L of out.values()) {
    const rank = sorted.indexOf(L.foodRaw) / Math.max(1, sorted.length - 1);
    L.food = L.foodRaw === 0 ? 0 : Math.max(1, Math.min(5, 1 + Math.floor(rank * 5)));
  }
  // Ver.0.8：土地の名前（0.3 の残り「土地の名前の手書き」）。区画の様子から決まる自然な名前・同じ土地（地図）の中で重ならない
  nameLands(out, map);
  cache.set(map, out);
  return out;
}

// ───────── 土地の名前（Ver.0.8）─────────
// 区画の様子（いちばん目立つもの：水・木・岩・砂・草・雪の国の田）から、ことばの組み合わせ「〇〇の＋地形」を決まった順に試して、
// 同じ地図の中でまだ使っていない最初の名前にする（地図と区画の id だけで決まる＝サーバーとクライアントで同じ）。id（'L3-5'）はそのまま。
export const LAND_WORDS = {
  common: ['風の', 'ひだまり', '月見の', '星の', 'しずかな', 'ゆうひの', 'あさつゆの', 'まるい', 'ねむりの', 'はねる', 'とおい', 'ちいさな', 'ゆらぎの', 'こもれびの'],
  water: ['水の', 'せせらぎの', 'つゆの', 'さざなみの', 'みずべの', '青い'],
  tree: ['木かげの', 'こずえの', '木の実の', 'みどりの'],
  rock: ['岩の', '石の', 'こいしの', '苔の', 'かたい', 'いわかげの'],
  sand: ['白砂の', '砂の', 'さらさら', 'こがね色の', 'かげろうの', '砂紋の'],
  grass: ['草の', 'くさぶえの', '花の', 'つばなの', 'のはらの', 'すすきの'],
  snow: ['雪の', '桜の', '田の', 'しずくの', 'あぜの', 'ほたるの'],
};
export const LAND_FORMS = {
  water: ['辺', 'ほとり', '岸', '淵', '入り江', 'みぎわ', '浅瀬', '泉'],
  tree: ['森', '木立', '丘', '辺', '小道', 'しげみ'],
  rock: ['台', '尾根', '岩屋', '坂', 'すそ', '丘', 'いわ間', '崖'],
  sand: ['背', '窪', '丘', '原', '浜', '坂', '波', '道'],
  grass: ['原', '野', '丘', '窪', '辺', 'つつみ', 'しげみ', '小道'],
  canyon: ['谷間', '段', '瀬', '岸', '淵', '坂', '小道', '岩棚'],
  snow: ['あぜ', '田', 'すそ', '辺', '小道', '原', '並木', '野'],
};
/** 区画の目立つもの（名前のことばを選ぶ） */
export function plotFeature(n, regionId, field) {
  if (field === 'toyama') return n.water > 10 ? 'snow_water' : 'snow';
  const cells = PLOT_W * PLOT_H;
  if (n.water > 8) return 'water';
  if (n.tree > 0) return 'tree';
  if (n.rock + n.stones > 10 || regionId === 'hill') return 'rock';
  if (field === 'canyon') return 'canyon';
  return n.sand > cells * 0.55 ? 'sand' : 'grass';
}
function wordsFor(feat) {
  const W = LAND_WORDS, F = LAND_FORMS;
  switch (feat) {
    case 'snow_water': return [W.snow.concat(W.water.slice(0, 2)), F.snow.concat(F.water.slice(0, 3))];
    case 'snow': return [W.snow.concat(['しずかな', 'ゆうひの', 'ちいさな']), F.snow];
    case 'water': return [W.water.concat(W.common), F.water];
    case 'tree': return [W.tree.concat(W.common), F.tree];
    case 'rock': return [W.rock.concat(W.common), F.rock];
    case 'canyon': return [W.water.concat(W.rock, W.common), F.canyon];
    case 'sand': return [W.sand.concat(W.common), F.sand];
    default: return [W.grass.concat(W.common), F.grass];
  }
}
/** 同じことばの重なり（「田の田」「あぜのあぜ」）・言いにくい組み合わせは使わない */
const awkward = (a, b) => { const r = a.replace(/の$/, ''); return b === r || b.startsWith(r) || r.endsWith(b) || (a === 'かたい' && b === 'いわ間') || (a === 'いわかげの' && b === 'いわ間'); };
/** 名前の候補（決まった順）。「の」で終わることばは そのまま、ほかは そのまま続ける（「ひだまり窪」） */
export function landNameCandidates(feat, cx, cy, seed) {
  const [A, B] = wordsFor(feat);
  const out = [];
  for (const a of A) for (const b of B) if (!awkward(a, b)) out.push({ s: a + b, a, h: hash2(cx * 31 + A.indexOf(a), cy * 17 + B.indexOf(b), seed + 5150) });
  // 目立つもののことば（前半）を先に・その中は区画ごとの決まった混ぜ方
  const k = A.length;
  return out.map(o => ({ ...o, pri: A.indexOf(o.a) < Math.min(6, k) ? 0 : 1 })).sort((x, y) => x.pri - y.pri || x.h - y.h).map(o => o.s);
}
/** 地図の全区画に名前をつける（区画の id の順に・同じ地図で重ならない） */
export function nameLands(lands, map) {
  const used = new Set();
  const list = [...lands.values()].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  for (const L of list) {
    let name = null;
    for (const c of landNameCandidates(L.feat, L.cx, L.cy, map.seed | 0)) if (!used.has(c)) { name = c; break; }
    if (!name) { let i = 2; while (used.has(L.code + i)) i++; name = L.code + i; }
    used.add(name);
    L.name = name;
  }
  return lands;
}
/** 区画の id から名前（無ければ null） */
export function landNameOf(map, id) { const L = buildLands(map).get(id); return L ? L.name : null; }

/** (px, py) のある区画の性能 */
export function landAt(map, px, py) { return buildLands(map).get(plotAt(px, py).id); }
export function landById(map, id) { return buildLands(map).get(id) || null; }
/** 送信・保存用の形（余計なものを落とす） */
export function landOut(L) {
  if (!L) return null;
  return { id: L.id, name: L.name, code: L.code, region: L.region, field: L.field || 'plains', food: L.food, danger: L.danger, hardness: L.hardness, scenery: L.scenery, climate: L.climate, rare: L.rare };
}

// ───────── 巣穴を掘る手間・引っ越し ─────────
/** 巣穴を掘る素材（硬い土ほど多い）。1〜3 は素材なし */
export function digCost(L) {
  const h = L ? L.hardness : 2;
  if (h >= 5) return { pebble: 2, grass: 2 };
  if (h >= 4) return { pebble: 1, grass: 1 };
  return {};
}
/** 巣穴を掘る時間（秒）。やわらかい砂 0.9 秒 〜 岩場 2.1 秒 */
export function digTime(L) { return 0.6 + 0.3 * (L ? L.hardness : 2); }
export const RELOCATE_BASE = { pebble: 3, grass: 4 };
export const RELOCATE_COOLDOWN_MS = 10 * 60 * 1000;   // 引っ越しは 10 分に 1 回（実時間）
export const RELOCATE_MIN_DIST = 8 * TILE;            // 今の入口から 8 タイル以上はなれた所へ
/** 引っ越しの費用 = 基本（小石 3・草 4）＋ 掘る手間 */
export function relocateCost(L) {
  const c = { ...RELOCATE_BASE };
  for (const [k, v] of Object.entries(digCost(L))) c[k] = (c[k] || 0) + v;
  return c;
}

/** 区画の性能を、ミニマップの重ね表示の色に（kind = 'danger' | 'food'） */
export function overlayColor(L, kind) {
  if (!L) return null;
  if (kind === 'danger') return ['rgba(80,200,120,.42)', 'rgba(150,210,110,.30)', 'rgba(230,220,90,.30)', 'rgba(240,160,70,.36)', 'rgba(230,90,60,.42)', 'rgba(200,40,40,.5)'][L.danger];
  if (kind === 'food') return ['rgba(40,30,20,.45)', 'rgba(120,100,60,.32)', 'rgba(170,160,70,.30)', 'rgba(150,200,80,.32)', 'rgba(110,210,90,.40)', 'rgba(70,220,100,.5)'][L.food];
  return null;
}
void HILL; void TREES;
