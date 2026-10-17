// 決まった乱数（種つき）。DOM・three.js なし（node とブラウザ両方）。docs/wakaba-mapkit/07 §1・§4.1。
// 境界侵食（shinshoku）にあった 3 つの実装をここへ移した（二重の実装を残さない）。作品側は再輸出するだけで、出る数は移す前と同じ。
//   rng(seed)      … 数の種 → [0,1)（mulberry32）。元 shinshoku/ai/brain.js
//   seeded(str)    … 文字列の種 → [0,1) の 1 万段階（FNV-1a ＋ xorshift）。元 shinshoku/data/town.js
//   xorshift(seed) … 数の種 → [0,1) の 10 万段階（xorshift32）。元 shinshoku/render/townmat.js の rng
// mapkit の配置は hashStr（FNV-1a 32bit）と childRng（層ごとの子の種：hash(seed + ':' + layer)）を使う。

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }

export function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

/** 文字列 → 32bit（FNV-1a。UTF-16 の単位ごと） */
export function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** 層ごとの子の種：hash(seed + ':' + layer)。層を足しても他の層の並びは変わらない（07 §4.1） */
export const childSeed = (seed, layer) => hashStr(String(seed) + ':' + layer);
export const childRng = (seed, layer) => rng(childSeed(seed, layer));

/** 乱数の助け（r は () => [0,1)） */
export const range = (r, a, b) => a + (b - a) * r();
export const pick = (r, list) => list[Math.min(list.length - 1, Math.floor(r() * list.length))];

/** 文字列の短い指紋（53bit・16 進）。配置の一致の比べに使う（暗号ではない） */
export function fingerprint(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
