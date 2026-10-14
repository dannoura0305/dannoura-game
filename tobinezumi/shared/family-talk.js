// tobinezumi/shared/family-talk.js — Ver.0.7「小さなできごと」：巣の家族どうしの短いやりとり（2 匹が 2〜3 行の吹き出しを交互に）。DOM なし・決定的。
//
// ・しぐさ（shared/family-life.js）と同じく、**巣の id ＋ サーバーの時計 ＋ 個体の id** から決まる（同期の通信は足さない）。
//   訪問者の画面でも、同じ時刻なら同じ 2 匹が同じ言葉をかわす。
// ・時間は TALK.SLOT_MS ごとの「枠」。枠ごとに TALK.CHANCE の見込みで、枠の始め＋TALK.START_MS から 1 つのやりとりがある。
//   2 匹は「やりとりの始まりの時刻に、同じ部屋で起きている」組から選ぶ（しぐさの計算 familyScene をその時刻で呼ぶ）。
// ・中身は 組の種類（子どもどうし・つれあいと子・なかまと子・なかまとおとな・住人・おとなどうし）と、
//   季節・昼夜・天気・倉庫の種子・おなか・できごと（赤ちゃんが生まれたばかり・世代交代のあと・富山へ行ったことがある・なかまと地上へ出た）で変わる。
//   やさしい言葉だけ。富山のことは ほのめかすだけ（「白い山」「ゆきの国」まで。題名・名前は出さない）。
import { famRand } from './family-life.js';
import { stageOf } from './family.js';
import { DAY_MS } from './daynight.js';

export const TALK = {
  SLOT_MS: 24000,     // やりとりの枠
  START_MS: 1200,     // 枠の始めから、やりとりが始まるまで
  LINE_MS: 2800,      // 1 行の長さ（次の行までの間）
  SHOW_MS: 2500,      // 1 行の吹き出しが出ている長さ（LINE_MS より短い＝交互に見える）
  CHANCE: 0.55,       // 枠ごとに やりとりがある見込み
  NEW_LITTER_MS: 0.5 * DAY_MS,   // 「赤ちゃんが生まれたばかり」：いちばん若い子がこれより若い
};

const stg = m => m.stage || stageOf(m.ageMs);
const isSmall = m => (m.role === 'pup' || m.role === 'kin') && (stg(m) === 'pup' || stg(m) === 'young');
const isAdult = m => !m.npc && m.role !== 'friend' && !isSmall(m);
const hungry = m => isSmall(m) && (m.fed ?? 100) < 40;

/** 組の種類と、話す順の a / b（a が最初に話すとは限らない：行ごとに a / b を指定） */
export function pairType(x, y) {
  if (x.npc || y.npc) return x.npc ? { type: 'npc', a: x, b: y } : { type: 'npc', a: y, b: x };
  if (x.role === 'friend' || y.role === 'friend') {
    const f = x.role === 'friend' ? x : y, o = f === x ? y : x;
    if (o.role === 'friend') return { type: 'adults', a: x, b: y };
    return isSmall(o) ? { type: 'friendKid', a: f, b: o } : { type: 'friendMate', a: f, b: o };
  }
  if (isSmall(x) && isSmall(y)) return { type: 'kids', a: x, b: y };
  if (isSmall(x) || isSmall(y)) {
    const k = isSmall(x) ? x : y, p = k === x ? y : x;
    return { type: 'parent', a: p, b: k };
  }
  // おとなどうし：年寄りがいれば a に
  if (stg(y) === 'elder' && stg(x) !== 'elder') return { type: 'adults', a: y, b: x };
  return { type: 'adults', a: x, b: y };
}

// w：重み。when(c, a, b)：出てよいか（c = 文脈）。lines：[[話す子 'a'|'b', ことば]]。{a} {b} は名前
const D = [
  // ── 子どもどうし ──
  { id: 'k_play', type: 'kids', w: 1, when: c => c.period !== 'day', lines: [['a', '{b}、あそぼ！'], ['b', 'いいよ！ なにする？'], ['a', 'おいかけっこ！']] },
  { id: 'k_sleepy', type: 'kids', w: 1.5, when: c => c.period === 'day' || c.period === 'dawn', lines: [['a', 'ねむくない？'], ['b', '…ちょっとだけ'], ['a', 'じゃあ いっしょに ねよ']] },
  { id: 'k_hungry', type: 'kids', w: 2.5, when: (c, a, b) => hungry(a) || hungry(b), lines: [['a', 'おなか すいたね'], ['b', '倉庫に たね、あるかな']] },
  { id: 'k_spring', type: 'kids', w: 1, when: c => c.season === 'spring', lines: [['a', 'はるの においがする！'], ['b', 'おはな、さいてるかな']] },
  { id: 'k_summer', type: 'kids', w: 1, when: c => c.season === 'summer', lines: [['a', 'そとは まだ あついかな'], ['b', '巣のなかは ひんやりだね']] },
  { id: 'k_autumn', type: 'kids', w: 1, when: c => c.season === 'autumn', lines: [['a', 'みのりの きせつ なんだって'], ['b', 'たね、たくさん あつめようね']] },
  { id: 'k_winter', type: 'kids', w: 1, when: c => c.season === 'winter', lines: [['a', 'そと、さむいのかな'], ['b', 'くっついてると あったかいね'], ['a', 'うん']] },
  { id: 'k_rain', type: 'kids', w: 2, when: c => c.weather === 'rain', lines: [['a', 'あめの音、きこえる？'], ['b', 'ぽつ、ぽつ って いってる']] },
  { id: 'k_snow', type: 'kids', w: 2, when: c => c.weather === 'snow', lines: [['a', 'ゆきって つめたいの？'], ['b', 'ふわふわで、つめたいんだって']] },
  { id: 'k_storm', type: 'kids', w: 2, when: c => c.weather === 'sandstorm', lines: [['a', 'かぜの音、ごうごう いってる'], ['b', '巣のなかなら だいじょうぶ']] },
  { id: 'k_seeds', type: 'kids', w: 1.5, when: c => c.seeds >= 40, lines: [['a', '倉庫、たねで いっぱい！'], ['b', 'ひとつだけ…だめ？'], ['a', 'あとで みんなで たべよ']] },
  { id: 'k_young', type: 'kids', w: 1.2, when: (c, a) => stg(a) === 'young', lines: [['a', 'もうすぐ そとに 行けるんだ'], ['b', 'どこまで 跳べるかな'], ['a', 'いっしょに 行こうね']] },
  { id: 'k_litter', type: 'kids', w: 2.5, when: c => c.newLitter, lines: [['a', 'ちいさい子、ちいさいね'], ['b', 'わたしたちも あんなだったのかな']] },
  { id: 'k_succ', type: 'kids', w: 2, when: c => c.succession, lines: [['a', 'あたらしい あるじ、がんばってるね'], ['b', 'わたしたちも てつだおう']] },
  { id: 'k_toyama', type: 'kids', w: 2, when: c => c.toyama, lines: [['a', 'ねえ、しろい山の はなし、しってる？'], ['b', 'ゆきの むこうの？'], ['a', '…ほんとに あるのかな']] },
  // ── つれあい（おとな）と子 ──
  { id: 'p_day', type: 'parent', w: 1, when: c => c.period !== 'day', lines: [['a', 'きょうは なにを したの？'], ['b', 'ぴょんって 高く 跳べた！'], ['a', 'すごいね']] },
  { id: 'p_rest', type: 'parent', w: 1.5, when: c => c.period === 'day' || c.period === 'dawn', lines: [['a', 'ひるは ねむる じかんよ'], ['b', '…はーい']] },
  { id: 'p_low', type: 'parent', w: 2, when: c => c.seeds < 10, lines: [['b', 'たね、すくないの？'], ['a', 'だいじょうぶ。また さがしてくるからね']] },
  { id: 'p_high', type: 'parent', w: 1.5, when: c => c.seeds >= 40, lines: [['b', '倉庫、いっぱいだね'], ['a', 'みんなで あつめたからね']] },
  { id: 'p_hungry', type: 'parent', w: 2.5, when: (c, a, b) => hungry(b), lines: [['b', 'おなか すいた…'], ['a', 'もうすぐ たねを もってきてくれるよ']] },
  { id: 'p_winter', type: 'parent', w: 1, when: c => c.season === 'winter', lines: [['a', 'さむくない？'], ['b', 'へいき！ ふわふわだもん'], ['a', 'ふふ、そうね']] },
  { id: 'p_summer', type: 'parent', w: 1, when: c => c.season === 'summer', lines: [['b', 'あつい…'], ['a', '巣の奥は すずしいよ。こっちに おいで']] },
  { id: 'p_rain', type: 'parent', w: 2, when: c => c.weather === 'rain', lines: [['b', 'あめ、やむかな'], ['a', 'やんだら くさが のびるよ']] },
  { id: 'p_storm', type: 'parent', w: 2, when: c => c.weather === 'sandstorm', lines: [['b', 'すなあらし、こわい'], ['a', '巣の奥なら だいじょうぶ']] },
  { id: 'p_snow', type: 'parent', w: 2, when: c => c.weather === 'snow', lines: [['b', 'そと、まっしろ？'], ['a', 'きっとね。あしたの 夜 見てみよう']] },
  { id: 'p_young', type: 'parent', w: 1.2, when: (c, a, b) => stg(b) === 'young', lines: [['b', 'そとって ひろい？'], ['a', 'とっても。フクロウには 気をつけてね']] },
  { id: 'p_litter', type: 'parent', w: 2.5, when: c => c.newLitter, lines: [['a', 'ちいさい子の そばでは しずかにね'], ['b', 'うん、そーっとね']] },
  { id: 'p_succ', type: 'parent', w: 2, when: c => c.succession, lines: [['b', 'まえの あるじ、いまごろ どうしてるかな'], ['a', 'きっと のんびりしてるよ']] },
  { id: 'p_toyama', type: 'parent', w: 2, when: c => c.toyama, lines: [['b', 'ゆきの国の はなし して'], ['a', 'しろい山と、水の田んぼが あったんだって'], ['b', '…いつか 行ってみたいな']] },
  // ── なかま（ほかの種）と子 ──
  { id: 'f_ears', type: 'friendKid', w: 1.5, when: () => true, lines: [['a', 'みみ、さわってみる？'], ['b', 'わあ、おっきい！'], ['a', 'すなの海では これで 音を きくの']] },
  { id: 'f_sand', type: 'friendKid', w: 1, when: c => c.period === 'night', lines: [['b', 'すなの海って どんなとこ？'], ['a', 'よるになると、砂が 青く 光るんだよ']] },
  { id: 'f_summer', type: 'friendKid', w: 1, when: c => c.season === 'summer', lines: [['a', 'この巣は すずしいね'], ['b', 'わたしの おきにいりの へやだよ']] },
  { id: 'f_winter', type: 'friendKid', w: 1, when: c => c.season === 'winter', lines: [['b', 'さむくない？'], ['a', 'みみが ちょっと つめたい…'], ['b', 'あたためてあげる']] },
  { id: 'f_out', type: 'friendKid', w: 2.5, when: (c, a) => c.companion != null && String(c.companion) === String(a.id), lines: [['a', 'きょう、そとへ いっしょに 行ったの'], ['b', 'いいなあ！ わたしも 行きたい']] },
  // ── なかまとおとな ──
  { id: 'fm_cool', type: 'friendMate', w: 1, when: () => true, lines: [['a', 'この巣、すずしくて いいね'], ['b', 'ゆっくりしていってね']] },
  { id: 'fm_seeds', type: 'friendMate', w: 1, when: c => c.seeds >= 10, lines: [['b', 'たね、たべる？'], ['a', 'ありがとう。すこしだけ']] },
  { id: 'fm_kids', type: 'friendMate', w: 1.5, when: c => c.smallKids > 0, lines: [['a', '子どもたち、げんきだね'], ['b', 'にぎやかで ごめんね'], ['a', 'ううん、たのしい']] },
  { id: 'fm_out', type: 'friendMate', w: 2.5, when: (c, a) => c.companion != null && String(c.companion) === String(a.id), lines: [['b', 'そと、どうだった？'], ['a', '風が きもちよかった']] },
  { id: 'fm_toyama', type: 'friendMate', w: 2, when: c => c.toyama, lines: [['a', 'しろい山の ゆめを みたの'], ['b', 'ふしぎね。あの子も 同じことを いってた']] },
  // ── 共同巣の NPC の住人 ──
  { id: 'n_home', type: 'npc', w: 1, when: c => c.period !== 'day', lines: [['a', 'ただいま'], ['b', 'おかえり。そとは どうだった？'], ['a', '風が きもちよかったよ']] },
  { id: 'n_bed', type: 'npc', w: 1, when: () => true, lines: [['a', '寝床、ふかふかだね'], ['b', 'いいでしょ']] },
  { id: 'n_rain', type: 'npc', w: 2, when: c => c.weather === 'rain', lines: [['a', 'あめに ふられちゃった'], ['b', 'あらら、こっちで かわかして']] },
  { id: 'n_winter', type: 'npc', w: 1, when: c => c.season === 'winter', lines: [['a', 'ふゆごもり、みんなと だと あったかいね'], ['b', 'うん']] },
  // ── おとなどうし ──
  { id: 'a_night', type: 'adults', w: 1, when: c => c.period === 'night', lines: [['a', 'いい夜だね'], ['b', 'うん。星が きれいだって']] },
  { id: 'a_calm', type: 'adults', w: 1, when: () => true, lines: [['a', 'のんびり しようか'], ['b', 'そうしよう']] },
  { id: 'a_low', type: 'adults', w: 2, when: c => c.seeds < 10, lines: [['a', 'たね、すこし へってきたね'], ['b', 'あしたの 夜、いっしょに さがそう']] },
  { id: 'a_high', type: 'adults', w: 1.5, when: c => c.seeds >= 40, lines: [['a', '倉庫、いっぱいになったね'], ['b', 'これで 冬も あんしん']] },
  { id: 'a_elder', type: 'adults', w: 2, when: (c, a) => stg(a) === 'elder', lines: [['a', 'みんな 大きく なったねえ'], ['b', 'ほんとうに']] },
  { id: 'a_litter', type: 'adults', w: 2.5, when: c => c.newLitter, lines: [['a', '赤ちゃん、よく ねてる'], ['b', 'しーっ、おこさないようにね']] },
  { id: 'a_succ', type: 'adults', w: 2, when: c => c.succession, lines: [['a', 'ここも 代が かわったね'], ['b', '巣は おなじ。においも おなじ']] },
  { id: 'a_toyama', type: 'adults', w: 2, when: c => c.toyama, lines: [['a', 'あの子、ときどき 遠くを 見てるね'], ['b', '…白い山の ほうかな']] },
];
export const DIALOGUES = D;
export const TALK_TYPES = ['kids', 'parent', 'friendKid', 'friendMate', 'npc', 'adults'];

/**
 * 文脈（家族の一覧から決まる分も足す）。ctx = {season, period, weather, seeds, tales:{toyama}, companion}
 * できごと：newLitter（いちばん若い子が TALK.NEW_LITTER_MS より若い）・succession（きょうだい＝前の代の子が巣にいる）・toyama（その家の子が富山へ行ったことがある）
 */
export function talkContext(members, ctx = {}) {
  const pups = members.filter(m => (m.role === 'pup' || m.role === 'kin') && stg(m) === 'pup');
  return {
    season: ctx.season || 'spring', period: ctx.period || 'night', weather: ctx.weather || 'clear', seeds: Number(ctx.seeds) || 0,
    newLitter: pups.some(m => (Number(m.ageMs) || 0) < TALK.NEW_LITTER_MS),
    succession: members.some(m => m.role === 'kin'),
    toyama: !!(ctx.tales && ctx.tales.toyama),
    companion: ctx.companion ?? null,
    smallKids: members.filter(isSmall).length,
  };
}

const byId = (a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true });
const fill = (s, a, b) => s.replace(/\{a\}/g, a.name || '').replace(/\{b\}/g, b.name || '');

/**
 * 枠 slot のやりとり（決定的）。無ければ null。
 * @param {object} o key：巣の id／members：家族（familyScene と同じ形）／slot：枠の番号／sceneAt(t)：familyScene をその時刻で（Map）／ctx：talkContext の入力
 * @returns {{slot, a, b, type, topic, t0, t1, lines:[{id, name, text, t0, t1}]}|null}
 */
export function talkInSlot({ key, members = [], slot, sceneAt, ctx = {} }) {
  if (members.length < 2 || typeof sceneAt !== 'function') return null;
  if (famRand(key, 'talk', slot, 'go') >= TALK.CHANCE) return null;
  const t0 = slot * TALK.SLOT_MS + TALK.START_MS;
  const sc = sceneAt(t0);
  if (!sc) return null;
  const sorted = [...members].sort(byId);
  const awake = sorted.filter(m => { const v = sc.get(m.id); return v && v.act !== 'sleep' && v.act !== 'pile'; });
  const pairs = [];
  for (let i = 0; i < awake.length; i++) for (let j = i + 1; j < awake.length; j++) {
    if (sc.get(awake[i].id).roomId === sc.get(awake[j].id).roomId) pairs.push([awake[i], awake[j]]);
  }
  if (!pairs.length) return null;
  const pr = pairs[Math.floor(famRand(key, 'talkpair', slot, pairs.length) * pairs.length) % pairs.length];
  const flip = famRand(key, 'talkflip', slot, 1) < 0.5;
  const P = pairType(flip ? pr[1] : pr[0], flip ? pr[0] : pr[1]);
  const c = talkContext(members, ctx);
  const opts = D.filter(d => d.type === P.type && d.when(c, P.a, P.b));
  if (!opts.length) return null;
  const sum = opts.reduce((s, d) => s + d.w, 0);
  let r = famRand(key, 'talktopic', slot, 2) * sum, d = opts[opts.length - 1];
  for (const o of opts) { if (r < o.w) { d = o; break; } r -= o.w; }
  const lines = d.lines.map(([who, text], i) => {
    const m = who === 'a' ? P.a : P.b;
    const s = t0 + i * TALK.LINE_MS;
    return { id: m.id, name: m.name, text: fill(text, P.a, P.b), t0: s, t1: s + TALK.SHOW_MS };
  });
  return { slot, a: P.a.id, b: P.b.id, type: P.type, topic: d.id, t0, t1: lines[lines.length - 1].t1, lines };
}
/** 時刻 t のやりとり（その枠に無い・もう終わった・まだ始まっていない → null） */
export function familyTalk(o) {
  const slot = Math.floor(o.t / TALK.SLOT_MS);
  const talk = talkInSlot({ ...o, slot });
  if (!talk || o.t < talk.t0 || o.t > talk.t1) return null;
  return talk;
}
/** いま吹き出しを出している行（{id, text} か null） */
export function talkLineAt(talk, t) {
  if (!talk) return null;
  for (const ln of talk.lines) if (t >= ln.t0 && t < ln.t1) return ln;
  return null;
}
/** t から先で、次にやりとりが始まる時刻（動作確認・テスト用。maxSlots 枠まで探す） */
export function nextTalk(o, maxSlots = 40) {
  const s0 = Math.floor(o.t / TALK.SLOT_MS);
  for (let s = s0; s < s0 + maxSlots; s++) {
    const talk = talkInSlot({ ...o, slot: s });
    if (talk && talk.t1 >= o.t) return talk;
  }
  return null;
}
