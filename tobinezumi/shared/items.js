// tobinezumi/shared/items.js — 採集物・家具・持ち物（ブラウザと Node の両方で import する。DOM なし）
//
// 持ち物は「8 枠 × 1 枠 99 個まで」の配列：[{id:'seed', n:12}, null, …]
// 巣の倉庫も同じ形（枠数だけ違う：STORAGE_SLOTS）。

export const INV_SLOTS = 8;
export const STACK_MAX = 99;
export const STORAGE_SLOTS = 24;

// 採集物（地上に落ちていて E で拾うもの）
export const ITEMS = {
  seed:   { id: 'seed',   name: '種子', desc: '乾いた草原の植物の種。トビネズミの主食。' },
  grass:  { id: 'grass',  name: '草',   desc: '乾いた細い草。寝床や敷物の材料になる。' },
  pebble: { id: 'pebble', name: '小石', desc: '丸い小石。巣の補強や飾りに使う。' },
};
export const RESOURCE_KINDS = ['seed', 'grass', 'pebble'];

// 家具（巣の全体モードで置く。w/h はセル数。mount: floor=床に置く / ceil=天井から吊る）
export const FURNITURE = {
  lamp:         { id: 'lamp',         name: 'ランタン',   w: 1, h: 1, mount: 'ceil',  cost: { pebble: 1, grass: 1 }, light: 56, desc: 'ほのかな橙の灯り。' },
  rug:          { id: 'rug',          name: '草の敷物',   w: 2, h: 1, mount: 'floor', cost: { grass: 3 },            desc: '編んだ草の敷物。足ざわりがいい。' },
  pebble_deco:  { id: 'pebble_deco',  name: '小石の飾り', w: 1, h: 1, mount: 'floor', cost: { pebble: 3 },           desc: 'きれいな小石を積んだ飾り。' },
  seed_pile:    { id: 'seed_pile',    name: '種の山',     w: 1, h: 1, mount: 'floor', cost: { seed: 5 },             desc: '見ているだけで安心する。' },
  dried_flower: { id: 'dried_flower', name: '乾いた花',   w: 1, h: 1, mount: 'floor', cost: { grass: 2, seed: 1 },   desc: '砂漠の花を乾かしたもの。' },
  shelf:        { id: 'shelf',        name: '棚',         w: 2, h: 2, mount: 'floor', cost: { pebble: 2, grass: 2 }, desc: '小石と草の根で組んだ棚。' },
};
export const FURNITURE_ORDER = ['lamp', 'rug', 'pebble_deco', 'seed_pile', 'dried_flower', 'shelf'];

// 部屋の種類が決める「備え付け」（データには保存せず、部屋の矩形から毎回同じ位置に導く）
export const FIXTURES = {
  nestbed: { id: 'nestbed', name: '寝床', w: 2, h: 1, desc: '草を丸めた寝床。E で眠る。' },
  storage: { id: 'storage', name: '倉庫', w: 2, h: 2, desc: '種や草をしまっておける。E で預ける・引き出す。' },
};

export const START_INVENTORY = [{ id: 'seed', n: 6 }, { id: 'grass', n: 6 }, { id: 'pebble', n: 4 }];

export function itemName(id) {
  return (ITEMS[id] && ITEMS[id].name) || (FURNITURE[id] && FURNITURE[id].name) || id;
}

export function makeInventory(slots = INV_SLOTS, start = null) {
  const inv = new Array(slots).fill(null);
  if (start) for (const s of start) addItem(inv, s.id, s.n);
  return inv;
}

/** 持ち物を正しい形に整える（壊れたセーブ・古い版でも落ちない） */
export function normalizeInventory(inv, slots = INV_SLOTS) {
  const out = new Array(slots).fill(null);
  if (!Array.isArray(inv)) return out;
  for (let i = 0; i < slots && i < inv.length; i++) {
    const s = inv[i];
    if (s && typeof s.id === 'string' && Number.isFinite(s.n) && s.n > 0) out[i] = { id: s.id, n: Math.min(STACK_MAX, Math.floor(s.n)) };
  }
  return out;
}

export function countItem(inv, id) {
  let n = 0;
  for (const s of inv) if (s && s.id === id) n += s.n;
  return n;
}

/** 入る分だけ入れる。入った数を返す（inv は書き換える） */
export function addItem(inv, id, n = 1) {
  let left = n;
  for (const s of inv) {
    if (left <= 0) break;
    if (s && s.id === id && s.n < STACK_MAX) { const k = Math.min(left, STACK_MAX - s.n); s.n += k; left -= k; }
  }
  for (let i = 0; i < inv.length && left > 0; i++) {
    if (!inv[i]) { const k = Math.min(left, STACK_MAX); inv[i] = { id, n: k }; left -= k; }
  }
  return n - left;
}

export function canAdd(inv, id, n = 1) {
  let room = 0;
  for (const s of inv) {
    if (!s) room += STACK_MAX;
    else if (s.id === id) room += STACK_MAX - s.n;
  }
  return room >= n;
}

/** 足りれば取り除いて true。足りなければ何もせず false */
export function removeItem(inv, id, n = 1) {
  if (countItem(inv, id) < n) return false;
  let left = n;
  for (let i = inv.length - 1; i >= 0 && left > 0; i--) {
    const s = inv[i];
    if (s && s.id === id) {
      const k = Math.min(left, s.n); s.n -= k; left -= k;
      if (s.n <= 0) inv[i] = null;
    }
  }
  return true;
}

/** cost = {seed:2, grass:1} を払えるか */
export function hasCost(inv, cost) {
  for (const k in cost || {}) if (countItem(inv, k) < cost[k]) return false;
  return true;
}
export function payCost(inv, cost) {
  if (!hasCost(inv, cost)) return false;
  for (const k in cost || {}) removeItem(inv, k, cost[k]);
  return true;
}
/** 返却（入りきらない分は捨てる）。実際に戻った数を返す */
export function refund(inv, items) {
  const got = {};
  for (const k in items || {}) { const n = addItem(inv, k, items[k]); if (n) got[k] = n; }
  return got;
}
export function costText(cost) {
  const parts = [];
  for (const k in cost || {}) parts.push(itemName(k) + '×' + cost[k]);
  return parts.join(' ') || 'なし';
}
export function addCost(a, b) {
  const o = { ...(a || {}) };
  for (const k in b || {}) o[k] = (o[k] || 0) + b[k];
  return o;
}
/** 撤去で戻る分：半分（切り捨て）。ただし何か使っていれば最低 1 つ（いちばん多く使った素材）は戻る */
export function halfCost(cost) {
  const o = {};
  let top = null;
  for (const k in cost || {}) {
    const v = Math.floor(cost[k] / 2); if (v > 0) o[k] = v;
    if (cost[k] > 0 && (!top || cost[k] > cost[top])) top = k;
  }
  if (top && !Object.keys(o).length) o[top] = 1;
  return o;
}

/** 枠 from を枠 to へ動かす（ドラッグで並べ替え）。同じ物ならまとめ、違えば入れ替える */
export function swapSlots(inv, from, to) {
  if (from === to || from < 0 || to < 0 || from >= inv.length || to >= inv.length) return false;
  const A = inv[from], B = inv[to];
  if (A && B && A.id === B.id) {
    const k = Math.min(A.n, STACK_MAX - B.n); B.n += k; A.n -= k; if (A.n <= 0) inv[from] = null;
    return true;
  }
  inv[from] = B; inv[to] = A;
  return true;
}
