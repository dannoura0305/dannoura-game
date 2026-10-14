// tobinezumi/shared/family.js — 年齢・成長・繁殖・子育て・世代交代（Ver.0.4「いのちをつなぐ」）。ブラウザとサーバーで同じ規則・DOM なし。
//
// ・年齢は「遊んだ世界の時間」で数える（地上か巣の中にいる間だけ進む。ログアウト中・タイトルでは進まない＝暮らしの数値と同じ）。
//   世界の 1 日 = 実時間 24 分。子ども（0〜1.5 日）→ 若者（〜4 日）→ おとな（〜24 日）→ 年寄り。最初の 1 匹は若者（3 日）から始まる。
//   寿命の目安は 30 日（実時間 12 時間ほど）。でも死なない：30 日をすぎると「そろそろ次の世代へ」とやさしく知らせるだけで、
//   世代交代（育った子を選ぶ）か「旅立ち」（子がいないとき・親せきの子が巣を受けつぐ）を選ぶまで、ずっと遊べる。
// ・繁殖：おとなで体調がよく（体調 50・空腹 35・水分 35 以上）、巣に寝床の部屋があり、倉庫に種子が 10 以上、冬でない。
//   野生のトビネズミと「なかよく」なって（shared/wild.js）巣へいっしょに帰ると、つれあいとして巣に住み、世界の半日（遊んだ時間）で
//   2〜6 匹の赤ちゃんが生まれる（春 3〜6・夏 2〜5・秋 2〜4。冬は春まで待つ）。次はつれあいと「なかよくする」で、2 日あけて。
// ・子ども・若者は食べる：おなか（fed 0〜100）が 1 日で 100 減る。50 を切ると倉庫の種子を自動で 1 つ食べる（+40）。
//   親が持ち物の種子をあげることもできる。おなかが空っぽの間は育たない（年齢が進まない）。死なない。
// ・世代交代：自分の子で若者以上の子を選ぶ。巣・倉庫・持ち物・フレンド・血統を受けつぐ。前の子は「ご先祖」に（家系図に残る）。
//   つれあいもいっしょに隠居する。おとなのきょうだいは巣立ち（家系図に残る）、小さいきょうだいは巣に残る。
import { DAY_MS } from './daynight.js';
import { mulberry32 } from './rng.js';
import { inherit, expressTraits, normalizeGenes, founderGenes, seedOf } from './genetics.js';

export const STAGE = { PUP_END: 1.5, YOUNG_END: 4, ELDER_AT: 24, LIFESPAN: 30 };   // 世界の日
export const STAGES = ['pup', 'young', 'adult', 'elder'];
export const STAGE_NAME = { pup: '子ども', young: '若者', adult: 'おとな', elder: '年寄り' };
export const FOUNDER_AGE_DAYS = 3;
export const BREED = { COND: 50, HUNGER: 35, THIRST: 35, SEEDS: 10, GESTATION_DAYS: 0.5, COOLDOWN_DAYS: 2, MAX_KIDS: 10 };
export const PUP = { START: 100, DRAIN_DAY: 100, FEED: 40, AUTO_BELOW: 50 };
export const FAMILY_MAX = 16;          // 巣にいっしょに住める家族（つれあい・子・きょうだい）
export const FOLLOW_MAX = 3;           // 地上へ連れて行ける若者
export const LITTER = {                // 季節ごとの子の数 [最小, 最大, 重み（小さい順）]
  spring: { min: 3, max: 6, w: [1, 3, 3, 2] },
  summer: { min: 2, max: 5, w: [1, 3, 3, 1] },
  autumn: { min: 2, max: 4, w: [3, 3, 1] },
  winter: null,
};
export const ROLES_IN_NEST = new Set(['pup', 'kin', 'mate']);
export const PUP_NAMES = ['ポポ', 'チロ', 'ミミ', 'ココ', 'ピピ', 'ルル', 'モモ', 'ナナ', 'トト', 'キキ', 'ソラ', 'マメ', 'クー', 'ララ', 'ノノ', 'フク', 'チャチャ', 'ハル', 'ユズ', 'コロ', 'ミント', 'サラ', 'ピコ', 'ムギ'];
export const WILD_NAMES = ['サラ', 'ジン', 'ハナ', 'リオ', 'ユキ', 'カイ', 'ノア', 'ミラ', 'セナ', 'トア', 'ルカ', 'エマ', 'アル', 'ニコ'];

export const ageDays = ms => Math.max(0, Number(ms) || 0) / DAY_MS;
export function stageOf(ms) {
  const d = ageDays(ms);
  return d < STAGE.PUP_END ? 'pup' : d < STAGE.YOUNG_END ? 'young' : d < STAGE.ELDER_AT ? 'adult' : 'elder';
}
export const isGrown = ms => ageDays(ms) >= STAGE.PUP_END;
/** 年齢の表示（「3.2 日」） */
export const ageLabel = ms => (Math.floor(ageDays(ms) * 10) / 10).toFixed(1) + ' 日';

/**
 * 個体の記録（オフラインのセーブ・サーバーの送信で同じ形）：
 *   {id, name, sex:'m'|'f', generation, father_id, mother_id, genes, traits, role, ageMs, fed, named, bornAt, retiredAt?}
 *   role：'player'（いま操作している）/ 'pup'（自分の子：巣にいる）/ 'kin'（きょうだい・親せき：巣にいる）/ 'mate'（つれあい）/
 *         'ancestor'（ご先祖・隠居）/ 'left'（巣立った）
 */
export function makeInd({ id, name, sex = 'f', generation = 1, father_id = null, mother_id = null, genes, role = 'pup', ageMs = 0, fed = PUP.START, named = false, bornAt = 0, fur = 'sand' }) {
  const g = normalizeGenes(genes, fur);
  return { id, name, sex, generation, father_id, mother_id, genes: g, traits: expressTraits(g), role, ageMs, fed, named, bornAt };
}
/** 最初の 1 匹 */
export function founderInd({ id, name, fur, sex, seed = 1, bornAt = 0 }) {
  return makeInd({ id, name, sex: sex === 'm' || sex === 'f' ? sex : (seed % 2 ? 'm' : 'f'), generation: 1, genes: founderGenes(fur, seed), role: 'player', ageMs: FOUNDER_AGE_DAYS * DAY_MS, fed: 100, named: true, bornAt, fur });
}
/** 送る・見せる形（genes は家系図の詳細だけで使う） */
export function indOut(m, { genes = false } = {}) {
  const o = { id: m.id, name: m.name, sex: m.sex, generation: m.generation, father_id: m.father_id ?? null, mother_id: m.mother_id ?? null, traits: m.traits, role: m.role,
    ageMs: Math.round(m.ageMs || 0), stage: stageOf(m.ageMs), fed: Math.round((m.fed ?? 100) * 10) / 10, named: !!m.named };
  if (m.retiredAt) o.retiredAt = m.retiredAt;
  if (m.kinOf) o.kinOf = m.kinOf;
  if (genes) o.genes = m.genes;
  return o;
}

// ───────── 繁殖の条件 ─────────
/** なかよくなれるか（野生の子に近づく・種子をあげる）。だめなら理由 */
export function courtBlock({ ageMs, life, season, pending = false, hasMate = false }) {
  const st = stageOf(ageMs);
  if (st === 'pup' || st === 'young') return 'まだ若い（おとなになってから。あと ' + Math.ceil((STAGE.YOUNG_END - ageDays(ageMs)) * 10) / 10 + ' 日）';
  if (st === 'elder') return '年寄りは 子や孫を見守ろう';
  if (season === 'winter') return '冬は 巣ごもりの季節（春になったら）';
  if (pending) return 'もうすぐ 赤ちゃんが生まれる';
  if (hasMate) return 'もう つれあいがいる（巣でなかよくしよう）';
  if (life && (life.cond < BREED.COND || life.hunger < BREED.HUNGER || life.thirst < BREED.THIRST)) return '体調を整えてから（体調 ' + BREED.COND + '・空腹 ' + BREED.HUNGER + '・水分 ' + BREED.THIRST + ' 以上）';
  return null;
}
/** 巣へ迎える（赤ちゃんを授かる）ことができるか。nest = {data, seeds}、fam = 巣の家族の数・前のお産（遊んだ時間）・いまの遊んだ時間 */
export function breedBlock({ ageMs, life, season, nestData, seeds = 0, pending = false, lastBirthMs = null, kids = 0, familyCount = 0 }) {
  const c = courtBlock({ ageMs, life, season, pending });
  if (c) return c;
  if (!nestData) return 'まず巣を掘ろう';
  if (!nestData.rooms || !nestData.rooms.some(r => r.kind === 'bed')) return '巣に寝床の部屋が要る（ビルドで部屋を「寝床」に）';
  if (seeds < BREED.SEEDS) return '倉庫に種子を ' + BREED.SEEDS + ' 以上たくわえてから（いま ' + seeds + '）';
  if (lastBirthMs != null && ageMs - lastBirthMs < BREED.COOLDOWN_DAYS * DAY_MS) return '前のお産から ' + BREED.COOLDOWN_DAYS + ' 日あけて（あと ' + (Math.ceil((BREED.COOLDOWN_DAYS * DAY_MS - (ageMs - lastBirthMs)) / DAY_MS * 10) / 10) + ' 日）';
  if (kids >= BREED.MAX_KIDS) return '巣が子どもでいっぱい（大きくなるまで待とう）';
  if (familyCount >= FAMILY_MAX) return '巣がにぎやかすぎる';
  return null;
}

/** 子の数（季節で変わる。冬は 0） */
export function litterSize(rng, season) {
  const L = LITTER[season];
  if (!L) return 0;
  const tot = L.w.reduce((a, b) => a + b, 0);
  let r = rng() * tot;
  for (let i = 0; i < L.w.length; i++) { r -= L.w[i]; if (r < 0) return L.min + i; }
  return L.max;
}
/** 子の名前の候補（かぶらないように） */
export function defaultNames(rng, n, taken = []) {
  const used = new Set(taken);
  const out = [];
  const pool = PUP_NAMES.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const nm of pool) { if (out.length >= n) break; if (!used.has(nm)) { out.push(nm); used.add(nm); } }
  let k = 2;
  while (out.length < n) { const nm = pool[out.length % pool.length] + k++; if (!used.has(nm)) { out.push(nm); used.add(nm); } }
  return out;
}
/** お産の種（同じ両親・同じ巣・何回目か → 同じ子たち） */
export const litterSeed = (motherId, fatherId, nth, nestId) => seedOf('litter', motherId, fatherId, nth, nestId);
/**
 * 子どもたちを作る（決定的）。ids は子の id を順にくれる関数。mother・father は個体の記録（genes・generation）
 */
export function makeLitter({ mother, father, seed, season, nextId, takenNames = [], bornAt = 0 }) {
  const rng = mulberry32(seed >>> 0);
  const n = litterSize(rng, season);
  const names = defaultNames(rng, n, takenNames);
  const gen = Math.max(mother.generation || 1, father.generation || 1) + 1;
  const pups = [];
  for (let i = 0; i < n; i++) {
    const sex = rng() < 0.5 ? 'f' : 'm';
    const genes = inherit(rng, mother.genes, father.genes);
    pups.push(makeInd({ id: nextId(), name: names[i], sex, generation: gen, father_id: father.id, mother_id: mother.id, genes, role: 'pup', ageMs: 0, fed: PUP.START, named: false, bornAt }));
  }
  return pups;
}

// ───────── 子育て ─────────
export const needsFood = m => (m.role === 'pup' || m.role === 'kin') && stageOf(m.ageMs) !== 'adult' && stageOf(m.ageMs) !== 'elder';
/**
 * 家族の時間を進める（親が遊んでいる間だけ呼ぶ）。dtMs = 世界の ms。seeds = 倉庫の種子の数。
 * 返り値 {members（新しい配列）, used（自動で食べた種子）, events:[{type:'stage', id, name, stage}|{type:'hungry', id, name}]}
 */
export function stepFamily(members, dtMs, { seeds = 0 } = {}) {
  const out = [], events = [];
  let left = seeds, used = 0;
  for (const m0 of members) {
    if (!ROLES_IN_NEST.has(m0.role)) { out.push(m0); continue; }
    const m = { ...m0 };
    if (needsFood(m)) {
      const wasFed = (m.fed ?? 100) > 0;
      m.fed = Math.max(0, (m.fed ?? 100) - PUP.DRAIN_DAY * dtMs / DAY_MS);
      while (m.fed < PUP.AUTO_BELOW && left > 0) { m.fed = Math.min(100, m.fed + PUP.FEED); left--; used++; }
      if (m.fed > 0 || wasFed) {
        const before = stageOf(m.ageMs);
        m.ageMs = (m.ageMs || 0) + (m.fed > 0 ? dtMs : 0);
        const after = stageOf(m.ageMs);
        if (after !== before) events.push({ type: 'stage', id: m.id, name: m.name, stage: after });
      }
      if (wasFed && m.fed <= 0) events.push({ type: 'hungry', id: m.id, name: m.name });
    } else {
      const before = stageOf(m.ageMs);
      m.ageMs = (m.ageMs || 0) + dtMs;
      const after = stageOf(m.ageMs);
      if (after !== before && m.role !== 'mate') events.push({ type: 'stage', id: m.id, name: m.name, stage: after });
    }
    out.push(m);
  }
  return { members: out, used, events };
}
/** 親が種子をあげる */
export function feedOne(m) { return { ...m, fed: Math.min(100, (m.fed ?? 0) + PUP.FEED) }; }

/** 自分の年齢を進める（返り値 {ageMs, crossed:'adult'|'elder'|'lifespan'|null}） */
export function stepAge(ageMs, dtMs) {
  const a = (ageMs || 0) + Math.max(0, dtMs);
  const before = ageDays(ageMs), after = ageDays(a);
  let crossed = null;
  if (before < STAGE.YOUNG_END && after >= STAGE.YOUNG_END) crossed = 'adult';
  else if (before < STAGE.ELDER_AT && after >= STAGE.ELDER_AT) crossed = 'elder';
  else if (before < STAGE.LIFESPAN && after >= STAGE.LIFESPAN) crossed = 'lifespan';
  else if (after >= STAGE.LIFESPAN && Math.floor(after) > Math.floor(before)) crossed = 'lifespan';
  return { ageMs: a, crossed };
}

// ───────── 世代交代 ─────────
/** 次の操作個体にできるか（自分の子・若者以上・巣にいる） */
export function heirBlock(current, heir) {
  if (!current || !heir) return '選んだ子が見つからない';
  if (heir.father_id !== current.id && heir.mother_id !== current.id) return '自分の子だけ選べる';
  if (heir.role !== 'pup' && heir.role !== 'kin') return 'その子は 巣にいない';
  if (!isGrown(heir.ageMs)) return 'まだ小さい（若者になってから）';
  return null;
}
export const heirsOf = (current, members) => members.filter(m => !heirBlock(current, m));
/** 交代の中身：heir が新しい操作個体、current とつれあいはご先祖、おとなのきょうだいは巣立ち、ほかは巣に残る（きょうだい） */
export function successionPlan(current, members, heirId) {
  const heir = members.find(m => m.id === heirId);
  const block = heirBlock(current, heir);
  if (block) return { ok: false, reason: block };
  const retire = [current.id], leave = [], stay = [];
  for (const m of members) {
    if (m.id === heirId) continue;
    if (m.role === 'mate') retire.push(m.id);
    else if (m.role === 'pup' || m.role === 'kin') { const st = stageOf(m.ageMs); if (st === 'adult' || st === 'elder') leave.push(m.id); else stay.push(m.id); }
  }
  return { ok: true, heir, retire, leave, stay };
}
/** 子がいない年寄りの「旅立ち」：親せきの子（若者）が巣を受けつぐ */
export function farewellBlock(current, members) {
  if (ageDays(current.ageMs) < STAGE.ELDER_AT) return 'まだ旅立つには早い（年寄りになってから）';
  if (heirsOf(current, members).length) return '育った子がいる（その子に あとをつがせよう）';
  return null;
}
export function relativeInd({ id, current, seed, bornAt = 0, name }) {
  const rng = mulberry32(seed >>> 0);
  const g = normalizeGenes(current.genes);
  // 親せき：毛色は同じ家の色を 1 つ受けつぐ
  const genes = inherit(rng, g, founderGenes(g.fur, seed ^ 0x9e3779b9));
  const ind = makeInd({ id, name: name || defaultNames(rng, 1, [current.name])[0], sex: rng() < 0.5 ? 'f' : 'm', generation: (current.generation || 1) + 1, genes, role: 'player', ageMs: FOUNDER_AGE_DAYS * DAY_MS, fed: 100, named: true, bornAt });
  ind.kinOf = current.id;
  return ind;
}
