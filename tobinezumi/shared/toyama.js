// tobinezumi/shared/toyama.js — Ver.0.6「富山の続き」：季節ごとの景色・調べられる物・白い小さな影の現れる所。DOM なし・決定的。
//
// 方針（GAME_DESIGN.md「富山」）：説明しない・決めない。ほのめかすだけ。ゲームの中で他作品の題名・人物の名前は出さない。
// ・地図（shared/world.js の genToyama）は季節で変えない（サーバーとクライアントで同じ・通れる所も同じ）。季節の物は「重ねて描く・調べられる」だけで、ぶつからない。
// ・秋：稲刈りのあとの田（西の田は刈り株）と、あぜ道の はさ掛け（稲を干す木の組み）。
// ・冬：祠のそばの 雪の灯り（夜は ろうそくが ゆれて ほのかに明るい）。
// ・いつでも：山のふもとの道の 古いバス停（2 つめの「読めそうで読めない」文）。季節で張り紙が少し変わる。
// ・白い小さな影：夜、季節ごとに決まった所（春は祠のそばの桜・夏は西の水路・秋は はさ掛け・冬は雪の灯り）に、遠くから見たときだけ。近づくと消える。
import { TOYAMA } from './world.js';

const T = 16, P = TOYAMA.PADDY;
const at = (tx, ty, dy = 12) => ({ x: tx * T + 8, y: ty * T + dy });
/** いつでもある物（2 つめの文） */
export const TOYAMA_BUSSTOP = { kind: 'busstop', ...at(55, TOYAMA.MOUNT_ROWS + 2, 14) };
const BUS_TEXT = {
  spring: '古いバス停。時刻表の文字は にじんで ほとんど読めない。「…行き　…７：４４」　横に「田植えのため　…」と小さな張り紙。',
  summer: '古いバス停。時刻表の文字は にじんで ほとんど読めない。「…行き　…７：４４」　ベンチの下で 虫が鳴いている。',
  autumn: '古いバス停。時刻表の文字は にじんで ほとんど読めない。「…行き　…７：４４」　張り紙：「…まつり　…日　夜」',
  winter: '古いバス停。屋根に雪が つもっている。時刻表は「冬…」とだけ読める。「…７：４４」',
};
/** その季節に重ねて描く・調べられる物（地図の props に足す形：{kind, x, y, text, season}） */
export function toyamaSeasonProps(season) {
  const out = [{ ...TOYAMA_BUSSTOP, text: BUS_TEXT[season] || BUS_TEXT.spring, season: 'all' }];
  if (season === 'autumn') {
    for (const [tx, ty] of [[18, P.y0 + P.ph], [42, P.y0 + P.ph], [30, P.y0 + 2 * (P.ph + 2) + P.ph]]) out.push({ kind: 'hasa', ...at(tx, ty, 14), season, text: 'はさ掛け。刈った稲が 木の組みに かけて干してある。いいにおいがする。' });
  }
  if (season === 'winter') {
    for (const [tx, ty, k] of [[10, 18, 0], [8, 19, 1], [9, 21, 2]]) out.push({ kind: 'lantern', ...at(tx, ty, 13), season, v: k, text: k === 0 ? '雪で作った 小さな灯籠。中で ろうそくが ゆれている。だれが 灯したのだろう。' : '雪の灯り。足あとは ひとつも ない。' });
  }
  return out;
}
/** 秋の田：刈り株か（西の 2 列の田。地図のタイルはそのまま・描き方だけ） */
export function paddyHarvested(season, tx) { return season === 'autumn' && tx >= P.x0 && tx < P.x0 + 2 * (P.pw + 2); }
/** 白い小さな影の現れる所（季節ごと） */
export const GLIMPSE_SPOTS = {
  spring: at(9, 23, 10), summer: at(12, 40, 10), autumn: at(23, P.y0 + P.ph, 10), winter: at(11, 21, 10),
};
export const GLIMPSE = { NEAR: 100, FAR: 300, GAP_MIN: 30, GAP_MAX: 55, LIFE: 5 };
/** 影が出てよいか（夜・その季節の所が 100〜300px 先に見えている）。出る所を返す */
export function glimpseSpot(season, period, px, py) {
  if (period !== 'night') return null;
  const s = GLIMPSE_SPOTS[season] || GLIMPSE_SPOTS.spring;
  const d = Math.hypot(s.x - px, s.y - py);
  return d >= GLIMPSE.NEAR && d <= GLIMPSE.FAR ? s : null;
}
/** 祠の文（季節で少し違う） */
export function shrineText(base, season) {
  const add = { spring: '　桜の花びらが 供えてある。', summer: '　小さな 青い花が 供えてある。', autumn: '　稲穂が ひとふさ 供えてある。', winter: '　しめ縄に 雪が つもっている。' }[season];
  return base + (add || '');
}
