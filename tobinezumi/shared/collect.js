// tobinezumi/shared/collect.js — Ver.0.5「広がり」：収集品（図鑑）・実績・富山への「不思議な穴」の条件・巣の豊かさ。DOM なし。
//
// 収集品（CURIOS）：土地・季節・時間帯・天気で、ときどき地上に 1 つ光る物が出る（サーバーの部屋／オフラインの世界が出す）。
//   拾うとアカウントの図鑑に入る（1 種類 1 回。account_collectibles の主キーで二重に入らない）。持ち物の枠は使わない。
//   巣の中に飾れる（家具 curio。同じ巣に同じ物は 1 つ）。図鑑の中身はアカウントにつくので、世代交代してもそのまま。
//   kind：nature（その土地のもの）・sign（しるし：富山への手がかり 3 つ）・crossover（富山だけ：ほかの世界から来たような物）・
//         season（Ver.0.6：富山の季節の品。秋の稲穂・冬のろうそく）・fest（Ver.0.8：季節の行事に はじめて参加したとき。地上には出ない）
// 富山への穴（gateOpen）：みずおとの谷の奥・夜・初めては「冬・雪・しるし 3 つ」がそろったときだけ。一度たどり着いたら夜ならいつでも。
// 実績（ACHIEVEMENTS）：やさしい目標。ごほうびは飾り（家具）が使えるようになるだけ。
import { REGION } from './world.js';

export const CURIO_TICK_MS = 15000;     // 収集品を出すか考える間隔（世界の時間 ×scale で縮む：サーバー・オフライン同じ）
export const CURIO_TTL_MS = 20 * 60 * 1000;   // 拾われないと 20 分（世界の時間）で消える
export const CURIO_MAX = 3;             // 1 つの土地に同時に出ている数
export const CURIO_PICK_RANGE = 28;

/**
 * 収集品の目録。when：{seasons, periods, weathers}（無ければいつでも）・near：出る場所のくせ・rate：1 回の判定で出る見込み
 * 富山の 6 つ（crossover）の説明は企画のイメージどおりの文。
 */
export const CURIOS = {
  // はじまりの原
  clover:      { id: 'clover', name: 'よつばの草', region: 'plains', kind: 'nature', rate: 0.05, near: 'grass', when: { seasons: ['spring', 'summer'] }, desc: '葉が 4 まいある草。見つけると ちょっといいことがありそう。', hint: 'はじまりの原の草むら（春・夏）' },
  shell:       { id: 'shell', name: 'オアシスの貝がら', region: 'plains', kind: 'nature', rate: 0.05, near: 'water', desc: '砂漠なのに貝がら。むかしは ここも海だったのかもしれない。', hint: 'はじまりの原の水べ' },
  starbit:     { id: 'starbit', name: '流れ星のかけら', region: 'plains', kind: 'nature', rate: 0.04, near: 'any', when: { periods: ['night'], weathers: ['clear'] }, desc: '夜空から落ちてきた、まだ少しあたたかい石。', hint: 'はじまりの原（晴れた夜）' },
  // いわばの高台
  ammonite:    { id: 'ammonite', name: 'うずまきの化石', region: 'rocks', kind: 'nature', rate: 0.05, near: 'rock', desc: '岩に うずまきの模様。とても古い生き物のあと。', hint: 'いわばの高台の岩のあいだ' },
  crystal:     { id: 'crystal', name: '水晶のかけら', region: 'rocks', kind: 'nature', rate: 0.04, near: 'rock', when: { periods: ['day', 'dawn', 'dusk'] }, desc: '光にかざすと 小さな虹が見える。', hint: 'いわばの高台（明るいうち）' },
  sign_tablet: { id: 'sign_tablet', name: 'ふるい石板のかけら', region: 'rocks', kind: 'sign', rate: 0.03, near: 'rock', desc: '「雪の夜　谷の奥に…」と刻まれている。続きは欠けている。', hint: 'いわばの高台のどこか' },
  // すなの海
  desert_rose: { id: 'desert_rose', name: '砂漠のバラ', region: 'dunes', kind: 'nature', rate: 0.05, near: 'sand', desc: '砂がかたまって 花びらのようになった石。', hint: 'すなの海' },
  moon_sand:   { id: 'moon_sand', name: '月の砂', region: 'dunes', kind: 'nature', rate: 0.05, near: 'sand', when: { periods: ['night'] }, desc: '夜にだけ 青白く光る砂。', hint: 'すなの海（夜）' },
  sign_glass:  { id: 'sign_glass', name: '青い砂ガラス', region: 'dunes', kind: 'sign', rate: 0.03, near: 'sand', when: { periods: ['night', 'dawn', 'dusk'] }, desc: 'のぞくと、白い山と 水を張った田んぼが一瞬 見えた気がする。', hint: 'すなの海（暗いうち）' },
  // みずおとの谷
  kingfisher:  { id: 'kingfisher', name: 'カワセミの青い羽', region: 'canyon', kind: 'nature', rate: 0.05, near: 'water', desc: '川の上を まっすぐ飛ぶ鳥の羽。宝石みたいな青。', hint: 'みずおとの谷の川べり' },
  acorn:       { id: 'acorn', name: '古い木の実', region: 'canyon', kind: 'nature', rate: 0.05, near: 'grass', when: { seasons: ['autumn', 'winter'] }, desc: 'このあたりでは見ない木の実。どこから流れてきたのだろう。', hint: 'みずおとの谷（秋・冬）' },
  sign_fur:    { id: 'sign_fur', name: '白い毛のひとふさ', region: 'canyon', kind: 'sign', rate: 0.03, near: 'water', when: { seasons: ['autumn', 'winter'] }, desc: '雪みたいに白い。冬の谷の奥へ、点々と続いている。', hint: 'みずおとの谷（寒くなると）' },
  // 富山（他作品とのつながり）
  dragons_card:  { id: 'dragons_card', name: 'ドラゴンズカード', region: 'toyama', kind: 'crossover', rate: 0.05, near: 'house', desc: 'どこかで見た絵が描かれた札', hint: '？？？' },
  machine_part:  { id: 'machine_part', name: '機械の部品', region: 'toyama', kind: 'crossover', rate: 0.05, near: 'house', desc: '人間の世界のものらしい', hint: '？？？' },
  charm:         { id: 'charm', name: '不思議なお守り', region: 'toyama', kind: 'crossover', rate: 0.04, near: 'shrine', desc: '見たことのない紋章が刻まれている', hint: '？？？' },
  black_feather: { id: 'black_feather', name: '黒い羽', region: 'toyama', kind: 'crossover', rate: 0.04, near: 'any', when: { periods: ['night', 'dusk'] }, desc: '大きな鳥のものだろうか…', hint: '？？？' },
  odd_crystal:   { id: 'odd_crystal', name: '謎の結晶', region: 'toyama', kind: 'crossover', rate: 0.04, near: 'paddy', when: { periods: ['night'] }, desc: '別の世界から来たような気がする', hint: '？？？' },
  // Ver.0.6：富山の季節の品（kind 'season'。説明はしない・決めない）
  rice_ear:      { id: 'rice_ear', name: '金色の稲穂', region: 'toyama', kind: 'season', rate: 0.05, near: 'paddy', when: { seasons: ['autumn'] }, desc: '重たく実った ひとふさ。ここでは だれかが 毎年 育てているらしい。', hint: '？？？' },
  candle_stub:   { id: 'candle_stub', name: 'ちびたろうそく', region: 'toyama', kind: 'season', rate: 0.04, near: 'shrine', when: { seasons: ['winter'], periods: ['night', 'dusk'] }, desc: '雪の灯りの そばに落ちていた。まだ少し あたたかい。', hint: '？？？' },
  unknown_card:  { id: 'unknown_card', name: '???の札', region: 'toyama', kind: 'crossover', rate: 0.012, near: 'any', when: { periods: ['night'] }, needs: 4, desc: 'よく分からない絵が描かれている。少し硬い。巣に飾れそうだ。とても貴重なもののようだ…', hint: '？？？', rarest: true },
  // Ver.0.8：季節の行事の品（kind 'fest'・region 'fest'＝地上には出ない。その行事に はじめて参加したときだけ図鑑へ。巣に飾れる）
  pressed_flower: { id: 'pressed_flower', name: '押し花', region: 'fest', kind: 'fest', rate: 0, near: 'any', desc: '花の種まきの夜に咲いた花を、そっと押して 残したもの。', hint: '春の行事「花の種まき」' },
  star_sand:      { id: 'star_sand', name: '星の砂つぶ', region: 'fest', kind: 'fest', rate: 0, near: 'any', desc: '星見の夜、みんなで見上げた丘で 拾った。ときどき ちかっと光る。', hint: '夏の行事「星見の夜」' },
  moon_seed:      { id: 'moon_seed', name: '月見の種', region: 'fest', kind: 'fest', rate: 0, near: 'any', desc: '月見の夜の 種の山から、ひとつぶ もらってきた。まるくて 白い。', hint: '秋の行事「月見」' },
  little_lantern: { id: 'little_lantern', name: '小さな灯り', region: 'fest', kind: 'fest', rate: 0, near: 'any', desc: '灯りの夜に ともした 小さな灯り。巣に飾ると ほんのり あたたかい。', hint: '冬の行事「灯りの夜」' },
};
export const CURIO_ORDER = Object.keys(CURIOS);
export const SIGNS = CURIO_ORDER.filter(id => CURIOS[id].kind === 'sign');
export const CROSSOVER = CURIO_ORDER.filter(id => CURIOS[id].kind === 'crossover');
export const FEST_CURIOS = CURIO_ORDER.filter(id => CURIOS[id].kind === 'fest');   // Ver.0.8
export const isCurio = id => Object.prototype.hasOwnProperty.call(CURIOS, id);

/** いまこの土地で出てよい収集品か（env = shared/season.js の envAt の結果） */
export function curioEligible(def, region, env) {
  if (def.region !== region) return false;
  const w = def.when || {};
  if (w.seasons && !w.seasons.includes(env.season)) return false;
  if (w.periods && !w.periods.includes(env.period)) return false;
  if (w.weathers && !w.weathers.includes(env.weather)) return false;
  return true;
}
/**
 * 1 回の判定（CURIO_TICK_MS ごと）。出すものを 1 つまで選ぶ。
 * ground：いま地上に出ている収集品 [{cid}]・present：この土地にいる子が持っている収集品の集合の配列（だれも持っていない物を優先：
 * 全員が持っている物は出さない）・rnd：乱数
 * ???の札（needs:4）は、その場にいる子のだれかが富山の品を 4 つ以上持っているときだけ。
 */
export function pickCurioSpawn({ region, env, ground = [], present = [], rnd }) {
  if (!present.length || ground.length >= CURIO_MAX) return null;
  for (const id of CURIO_ORDER) {
    const def = CURIOS[id];
    if (!curioEligible(def, region, env)) continue;
    if (ground.some(g => g.cid === id)) continue;
    if (present.every(s => s.has(id))) continue;
    if (def.needs && !present.some(s => CROSSOVER.filter(c => c !== id && s.has(c)).length >= def.needs)) continue;
    if (rnd() < def.rate) return def;
  }
  return null;
}
/** 収集品の出る場所の候補（地図の出現点 → near のくせで絞る） */
export function curioSpots(map, points, near) {
  const T_ = map.tiles, w = map.w;
  const at = (x, y) => { const tx = Math.floor(x / 16), ty = Math.floor(y / 16); return tx < 0 || ty < 0 || tx >= w || ty >= map.h ? -1 : T_[ty * w + tx]; };
  const around = (p, pred, r = 2) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (pred(at(p.x + dx * 16, p.y + dy * 16))) return true; return false; };
  // 6=水場 13=川 14=水田 15=水路 3=岩 5=小石の山 16=家 20=祠 2=草地 9=草の房 0=砂 10=さらさら砂
  const test = {
    water: t => t === 6 || t === 13 || t === 15 || t === 14, rock: t => t === 3 || t === 5 || t === 11, house: t => t === 16, shrine: t => t === 20 || t === 19,
    paddy: t => t === 14 || t === 15, grass: t => t === 9 || t === 2, sand: t => t === 0 || t === 10,
  }[near];
  if (!test) return points;
  const r = near === 'house' || near === 'shrine' ? 3 : 2;
  const out = points.filter(p => around(p, test, r));
  return out.length ? out : points;
}

// ───────── 富山への「不思議な穴」─────────
export const GATE_R = 20;      // 穴に入れる距離
/**
 * 開いているか：みずおとの谷・夜。まだ富山を見つけていない子は「冬・雪・しるし 3 つ（SIGNS）を持っている」も要る。
 * found：一度たどり着いた（アカウントの印）。force：開発用（オフラインの ?toyama=1・サーバーの dev）
 */
export function gateOpen({ region, env, owned, found = false, force = false }) {
  if (region !== 'canyon') return false;
  if (force) return true;
  if (!env || env.period !== 'night') return false;
  if (found) return true;
  const has = s => (owned instanceof Set ? owned.has(s) : !!(owned && owned[s]));
  return env.season === 'winter' && env.weather === 'snow' && SIGNS.every(has);
}
/** 穴が開かない理由（しるしの数など。本人に少しだけ教える） */
export function gateHint({ env, owned, found }) {
  const has = s => (owned instanceof Set ? owned.has(s) : !!(owned && owned[s]));
  const n = SIGNS.filter(has).length;
  if (found) return '夜になると、また穴が開くようだ';
  if (n < SIGNS.length) return 'なにかが足りない気がする（しるし ' + n + '/' + SIGNS.length + '）';
  if (!env || env.season !== 'winter') return '石の標は「ゆきのよる」と言っている';
  if (env.weather !== 'snow') return '雪が降るのを待とう';
  if (env.period !== 'night') return '夜になるのを待とう';
  return '';
}

// ───────── 実績 ─────────
/** reward：ごほうびの飾り（items.js の FURNITURE で unlock がその実績のもの）。secret：とるまで名前が「？？？」 */
export const ACHIEVEMENTS = [
  { id: 'first_burrow', name: 'はじめての巣穴', desc: '自分の巣穴を掘った' },
  { id: 'first_pups', name: 'はじめての赤ちゃん', desc: '巣で赤ちゃんが生まれた' },
  { id: 'gen3', name: '三代目', desc: '3 代目の子が あとをついだ', reward: 'family_tree' },
  { id: 'visit5', name: 'おとなりさん', desc: 'フレンドの巣を 5 つ たずねた' },
  { id: 'sandstorm', name: '砂嵐をこえて', desc: '巣の外で 砂嵐をやりすごした' },
  { id: 'seasons4', name: 'めぐる季節', desc: '春・夏・秋・冬を すべて過ごした', reward: 'wreath' },
  { id: 'regions4', name: '旅するトビネズミ', desc: '4 つの土地を すべて訪れた', reward: 'star_lamp' },
  { id: 'collector5', name: '小さなコレクター', desc: '収集品を 5 つ集めた', reward: 'curio_shelf' },
  { id: 'collector12', name: 'ものしり', desc: '収集品を 12 集めた' },
  { id: 'display3', name: '飾りつけ上手', desc: '巣に 収集品を 3 つ飾った' },
  { id: 'together', name: 'いっしょに暮らす', desc: '共同巣で だれかと暮らしはじめた' },
  { id: 'toyama', name: '知らない土地', desc: '雪の山と田んぼの土地に たどり着いた', secret: true, reward: 'snowman' },
  { id: 'crossover6', name: 'つながる世界', desc: '不思議な品を すべて集めた', secret: true },
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
export const SANDSTORM_MS = 20 * 60 * 1000;    // 巣の外で砂嵐の中にいた世界の時間（20 分）→ やんだら「砂嵐をこえて」
export const VISIT_GOAL = 5;

/** 収集品の数から取れる実績 */
export function collectAchievements(owned) {
  const n = owned instanceof Set ? owned.size : Object.keys(owned || {}).length;
  const has = s => (owned instanceof Set ? owned.has(s) : !!(owned && owned[s]));
  const out = [];
  if (n >= 5) out.push('collector5');
  if (n >= 12) out.push('collector12');
  if (CROSSOVER.every(has)) out.push('crossover6');
  return out;
}
/** 実績で使えるようになる飾りの一覧 */
export function unlockedDecor(achIds) {
  const set = achIds instanceof Set ? achIds : new Set(achIds || []);
  return ACHIEVEMENTS.filter(a => a.reward && set.has(a.id)).map(a => a.reward);
}

// ───────── 巣めぐり（Ver.0.6：順位・点数はつけない）─────────
/**
 * 巣の様子（数えるだけ・比べない）：部屋・家具・飾った収集品・家具の種類。巣めぐりの短い紹介文に使う。
 * Ver.0.5 の「豊かな巣」（点数と順位）は Ver.0.6 でやめた（このゲームは競い合わない）。
 */
export function nestFeatures(data) {
  if (!data) return { rooms: 0, decor: 0, curios: 0, kinds: 0, bed: false, store: false };
  const objs = data.objects || [];
  const curios = objs.filter(o => o.type === 'curio').length;
  const rooms = data.rooms || [];
  return { rooms: rooms.length, decor: objs.length - curios, curios, kinds: new Set(objs.map(o => o.type)).size, bed: rooms.some(r => r.kind === 'bed'), store: rooms.some(r => r.kind === 'store') };
}
/** 巣めぐりの紹介（やさしい短い文。数は「いくつ」だけ） */
export function nestTourDesc(f, { recent = false } = {}) {
  const parts = [];
  if (f.rooms) parts.push('部屋 ' + f.rooms);
  if (f.decor) parts.push('家具 ' + f.decor);
  if (f.curios) parts.push('飾った品 ' + f.curios);
  let mood = f.curios >= 2 ? '飾った品が ならぶ巣' : f.rooms >= 4 ? '通路の長い 広い巣' : f.decor >= 4 ? 'いろいろな家具のある巣' : f.store ? '倉庫のある 落ち着いた巣' : 'こぢんまりした巣';
  if (recent) mood = '最近 手を入れた ' + mood;
  return mood + (parts.length ? '（' + parts.join('・') + '）' : '');
}
