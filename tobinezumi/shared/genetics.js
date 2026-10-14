// tobinezumi/shared/genetics.js — 遺伝（Ver.0.4「いのちをつなぐ」）。ブラウザとサーバーで同じ計算・DOM なし・乱数は種から（決定的）。
//
// 遺伝子 genes（individuals.genes に JSON で保存）：
//   { v:1, fur:'sand'（表に出ている毛色。前の版と同じ鍵）,
//     col:[a,b]   毛色の 1 遺伝子座（2 つの対立遺伝子）。優性の順：sand > rufous > graybrown > cream > white（白っぽいは潜性）
//     pied:[0|1,0|1]  斑（ぶち）。1 が 2 つそろうと斑（潜性・まれ）
//     tuft:[0|1,0|1]  尾の房の色。1 が 2 つそろうと白い房（潜性）。0 は黒い房
//     tint:[4 つ]     濃淡（−1/0/+1 の対立遺伝子 2 座 × 2）。合計 / 4 → −1（淡い）〜 +1（濃い）
//     ear/leg/tail/size:[8 つ]  耳・脚・尾・体格（−1/0/+1 の対立遺伝子 4 座 × 2）。合計 / 8 → −1〜+1（多くの遺伝子が少しずつ効く）}
// ・子は、遺伝子座ごとに母から 1 つ・父から 1 つを受け取る（メンデルの分離）。まれに突然変異（MUT）。
// ・表に出る形質 traits = expressTraits(genes)：{fur, tint, pied, tuft, ear, leg, tail, size}（数値は −1〜+1）。
// ・形質の遊びへの効き目 traitMods(traits)：どれも ±10% まで（CAP）。脚が長い → 跳ねる・大ジャンプが少し遠く、尾が長い → 大ジャンプの
//   待ちが少し短い（体の釣り合い）、耳が大きい → 熱を逃がして水分が減りにくい、体が大きい → 寒さに強いがおなかがすきやすい。
import { mulberry32, hash2 } from './rng.js';

export const GENE_VERSION = 1;
export const FUR_RANK = { sand: 4, rufous: 3, graybrown: 2, cream: 1, white: 0 };   // 大きいほど優性
export const FUR_LIST = ['sand', 'cream', 'rufous', 'graybrown', 'white'];
export const POLY = ['ear', 'leg', 'tail', 'size'];
export const POLY_N = 8, TINT_N = 4;
export const MUT = { poly: 0.03, col: 0.01, pied: 0.004, tuft: 0.006, tint: 0.02 };
export const CAP = 0.10;            // 遊びへの効き目の上限（±10%）
export const EFFECT = {             // 形質 1（いちばん大きい）のときの効き目
  hop: 0.06,       // 脚：跳ねる速さ
  jump: 0.08,      // 脚：大ジャンプの距離
  cd: 0.08,        // 尾：大ジャンプの待ち（短くなる）
  thirst: 0.08,    // 耳：水分の減り（少なくなる）
  hunger: 0.06,    // 体格：空腹の減り（大きいと多い）
  cold: 0.10,      // 体格：寒さで体調が減る速さ（大きいと少ない）
};
export const TRAIT_NAME = { ear: '耳', leg: '脚', tail: '尾', size: '体', fur: '毛色', tint: '濃淡', pied: '斑', tuft: '尾の房' };
export const FUR_NAME = { sand: '砂色', cream: '淡黄', rufous: '赤茶', graybrown: '灰褐', white: '白っぽい' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/** 文字列 → 32bit の種 */
export function seedOf(...parts) {
  let h = 2166136261 >>> 0;
  const s = parts.map(p => String(p)).join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** −1/0/+1 の対立遺伝子を 1 つ（p0 は 0 の出やすさ） */
function allele(rng, p0 = 1 / 3) { const r = rng(); if (r < p0) return 0; return r < p0 + (1 - p0) / 2 ? -1 : 1; }

/** 毛色の対立遺伝子（重みつき） */
function furAllele(rng, weights) {
  const tot = FUR_LIST.reduce((a, f) => a + (weights[f] || 0), 0) || 1;
  let r = rng() * tot;
  for (const f of FUR_LIST) { r -= weights[f] || 0; if (r < 0) return f; }
  return 'sand';
}

/** 毛色の 2 つの対立遺伝子 → 表に出る色（優性のほう） */
export function expressFur(col) {
  const [a, b] = Array.isArray(col) && col.length === 2 ? col : ['sand', 'sand'];
  const ra = FUR_RANK[a] ?? 4, rb = FUR_RANK[b] ?? 4;
  return ra >= rb ? (FUR_RANK[a] != null ? a : 'sand') : b;
}

/**
 * 最初の 1 匹（キャラクター作成）の遺伝子：選んだ毛色を 2 つ持つ（その色が必ず出る）。体つきは「ふつう」（どの形質も 0：前の版と同じ動き）。
 * 斑・白い房の遺伝子を 1 つだけ隠し持っていることがある（種で決まる。表には出ない）→ 野生の子との間で孫の代にまれに現れる
 */
export function founderGenes(fur, seed = 1) {
  const rng = mulberry32(seed >>> 0);
  const f = FUR_RANK[fur] != null ? fur : 'sand';
  const g = { v: GENE_VERSION, fur: f, col: [f, f], pied: [0, rng() < 0.25 ? 1 : 0], tuft: [0, rng() < 0.3 ? 1 : 0], tint: new Array(TINT_N).fill(0) };
  for (const k of POLY) g[k] = new Array(POLY_N).fill(0);
  return g;
}

/** 野生の個体の遺伝子（地域で毛色の出やすさが違う：砂漠は砂色・淡黄、岩場は灰褐、オアシスは白っぽい子も） */
export const REGION_FUR = {
  desert: { sand: 5, cream: 4, rufous: 1, graybrown: 0.5, white: 1 },
  steppe: { sand: 4, cream: 1, rufous: 3, graybrown: 2, white: 0.5 },
  oasis: { sand: 3, cream: 3, rufous: 1, graybrown: 1, white: 2 },
  hill: { sand: 2, cream: 0.5, rufous: 1, graybrown: 5, white: 1 },
};
export function wildGenes(rng, region = 'steppe') {
  const w = REGION_FUR[region] || REGION_FUR.steppe;
  const col = [furAllele(rng, w), furAllele(rng, w)];
  const g = { v: GENE_VERSION, col, pied: [rng() < 0.15 ? 1 : 0, rng() < 0.15 ? 1 : 0], tuft: [rng() < 0.3 ? 1 : 0, rng() < 0.3 ? 1 : 0], tint: [] };
  for (let i = 0; i < TINT_N; i++) g.tint.push(allele(rng, 0.8));
  for (const k of POLY) { g[k] = []; for (let i = 0; i < POLY_N; i++) g[k].push(allele(rng)); }
  g.fur = expressFur(col);
  return g;
}

/** 壊れた・古い形でも使える形へ（足りない所は「ふつう」で埋める） */
export function normalizeGenes(raw, furFallback = 'sand') {
  const g = raw && typeof raw === 'object' ? raw : {};
  const fur = FUR_RANK[g.fur] != null ? g.fur : (FUR_RANK[furFallback] != null ? furFallback : 'sand');
  const col = Array.isArray(g.col) && g.col.length === 2 && g.col.every(c => FUR_RANK[c] != null) ? g.col.slice() : [fur, fur];
  const bits = (a, n) => Array.from({ length: n }, (_, i) => (Array.isArray(a) && (a[i] === 1 || a[i] === 0) ? a[i] : 0));
  const tri = (a, n) => Array.from({ length: n }, (_, i) => (Array.isArray(a) && [-1, 0, 1].includes(a[i]) ? a[i] : 0));
  const out = { v: GENE_VERSION, fur: expressFur(col), col, pied: bits(g.pied, 2), tuft: bits(g.tuft, 2), tint: tri(g.tint, TINT_N) };
  for (const k of POLY) out[k] = tri(g[k], POLY_N);
  return out;
}

/** 表に出る形質 */
export function expressTraits(genes) {
  const g = normalizeGenes(genes);
  const sum = a => a.reduce((s, v) => s + v, 0);
  const t = { fur: expressFur(g.col), tint: r2(sum(g.tint) / TINT_N), pied: g.pied[0] === 1 && g.pied[1] === 1, tuft: g.tuft[0] === 1 && g.tuft[1] === 1 ? 'pale' : 'dark' };
  for (const k of POLY) t[k] = r2(sum(g[k]) / POLY_N);
  return t;
}

/** 親の 1 遺伝子座（2 つ）から 1 つ選ぶ */
function gamete(rng, pair) { return rng() < 0.5 ? pair[0] : pair[1]; }

/**
 * 子の遺伝子：遺伝子座ごとに母から 1 つ・父から 1 つ（どちらが来るかは半々）＋まれに突然変異
 */
export function inherit(rng, motherGenes, fatherGenes) {
  const m = normalizeGenes(motherGenes), f = normalizeGenes(fatherGenes);
  const mutTri = v => (rng() < MUT.poly ? clamp(v + (rng() < 0.5 ? -1 : 1), -1, 1) : v);
  const c = { v: GENE_VERSION };
  c.col = [gamete(rng, m.col), gamete(rng, f.col)].map(a => (rng() < MUT.col ? pick(rng, FUR_LIST) : a));
  c.pied = [gamete(rng, m.pied), gamete(rng, f.pied)].map(a => (a === 0 && rng() < MUT.pied ? 1 : a));
  c.tuft = [gamete(rng, m.tuft), gamete(rng, f.tuft)].map(a => (a === 0 && rng() < MUT.tuft ? 1 : a));
  c.tint = [];
  for (let i = 0; i < TINT_N / 2; i++) {
    c.tint.push(rng() < MUT.tint ? clamp(gamete(rng, [m.tint[2 * i], m.tint[2 * i + 1]]) + (rng() < 0.5 ? -1 : 1), -1, 1) : gamete(rng, [m.tint[2 * i], m.tint[2 * i + 1]]));
    c.tint.push(rng() < MUT.tint ? clamp(gamete(rng, [f.tint[2 * i], f.tint[2 * i + 1]]) + (rng() < 0.5 ? -1 : 1), -1, 1) : gamete(rng, [f.tint[2 * i], f.tint[2 * i + 1]]));
  }
  for (const k of POLY) {
    c[k] = [];
    for (let i = 0; i < POLY_N / 2; i++) {
      c[k].push(mutTri(gamete(rng, [m[k][2 * i], m[k][2 * i + 1]])));
      c[k].push(mutTri(gamete(rng, [f[k][2 * i], f[k][2 * i + 1]])));
    }
  }
  c.fur = expressFur(c.col);
  return c;
}

/**
 * 形質 → 遊びへの効き目（どれも 1 ± CAP の中）。
 *   hop：跳ねる速さ　jump：大ジャンプの距離　cd：大ジャンプの待ち　thirst：水分の減り　hunger：空腹の減り　cold：寒さ・砂嵐で体調が減る速さ
 */
export function traitMods(traits) {
  const t = traits || {};
  const v = k => clamp(Number(t[k]) || 0, -1, 1);
  const m = x => Math.round(clamp(1 + x, 1 - CAP, 1 + CAP) * 1000) / 1000;
  return {
    hop: m(EFFECT.hop * v('leg')),
    jump: m(EFFECT.jump * v('leg')),
    cd: m(-EFFECT.cd * v('tail')),
    thirst: m(-EFFECT.thirst * v('ear')),
    hunger: m(EFFECT.hunger * v('size')),
    cold: m(-EFFECT.cold * v('size')),
  };
}
/** 移動ルール（shared/move.js の stepField）に渡す分だけ。ふつうの子は null（前の版と同じ動き） */
export function traitMoveMods(traits) {
  if (!traits) return null;
  const m = traitMods(traits);
  if (m.hop === 1 && m.jump === 1 && m.cd === 1) return null;
  return { hop: m.hop, jumpDist: m.jump, cd: m.cd };
}

/** 形質を短いことばに（家族・家系図の札） */
export function traitWords(traits) {
  const t = traits || {};
  const out = [];
  const lv = (k, big, small) => { const v = Number(t[k]) || 0; if (v >= 0.35) out.push({ k, text: big, v }); else if (v <= -0.35) out.push({ k, text: small, v }); };
  out.push({ k: 'fur', text: (t.tint >= 0.5 ? '濃い' : t.tint <= -0.5 ? '淡い' : '') + (FUR_NAME[t.fur] || '砂色'), v: 0 });
  if (t.pied) out.push({ k: 'pied', text: '斑', v: 1 });
  lv('ear', '耳が大きい', '耳が小さい');
  lv('leg', '脚が長い', '脚が短い');
  lv('tail', '尾が長い', '尾が短い');
  lv('size', '体が大きい', '体が小さい');
  if (t.tuft === 'pale') out.push({ k: 'tuft', text: '白い房', v: 1 });
  return out;
}

/** 見た目（クライアントの描き分け用。小さい整数にまとめる → 絵のキャッシュの鍵） */
export function lookOf(traits, extra = {}) {
  const t = traits || {};
  const q = (v, n) => Math.round(clamp(Number(v) || 0, -1, 1) * n);
  return {
    fur: FUR_RANK[t.fur] != null ? t.fur : 'sand', tint: q(t.tint, 2), pied: t.pied ? 1 : 0, tuft: t.tuft === 'pale' ? 1 : 0,
    ear: q(t.ear, 2), leg: q(t.leg, 2), tail: q(t.tail, 2), size: q(t.size, 2), ...(extra.pup ? { pup: 1 } : {}), ...(extra.young ? { young: 1 } : {}), ps: extra.ps != null ? extra.ps : 0,
    ...(extra.sp && extra.sp !== 'jerboa' ? { sp: extra.sp } : {}),   // Ver.0.6：近縁種（longear：とても大きな耳・長い鼻先・少し灰色がかった毛）
  };
}
export function lookKey(L) { return L ? [L.fur, L.tint, L.pied, L.tuft, L.ear, L.leg, L.tail, L.size, L.pup ? 1 : 0, L.young ? 1 : 0, L.ps || 0, L.sp || ''].join(',') : 'base'; }

/** 斑の模様の種（個体ごとに模様が違う） */
export function piedSeed(id) { return Math.floor(hash2(Number(id) || seedOf(id), 17, 3) * 1000); }
