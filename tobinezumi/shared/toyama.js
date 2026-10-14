// tobinezumi/shared/toyama.js — Ver.0.6「富山の続き」：季節ごとの景色・調べられる物・白い小さな影の現れる所。DOM なし・決定的。
//
// 方針（GAME_DESIGN.md「富山」）：説明しない・決めない。ほのめかすだけ。ゲームの中で他作品の題名・人物の名前は出さない。
// ・地図（shared/world.js の genToyama）は季節で変えない（サーバーとクライアントで同じ・通れる所も同じ）。季節の物は「重ねて描く・調べられる」だけで、ぶつからない。
// ・秋：稲刈りのあとの田（西の田は刈り株）と、あぜ道の はさ掛け（稲を干す木の組み）。
// ・冬：祠のそばの 雪の灯り（夜は ろうそくが ゆれて ほのかに明るい）。
// ・いつでも：山のふもとの道の 古いバス停（2 つめの「読めそうで読めない」文）。季節で張り紙が少し変わる。
// ・白い小さな影：夜、季節ごとに決まった所（春は祠のそばの桜・夏は西の水路・秋は はさ掛け・冬は雪の灯り）に、遠くから見たときだけ。近づくと消える。
import { TOYAMA } from './world.js';
import { CROSSOVER } from './collect.js';

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

// ───────── Ver.0.7「小さなできごと」：富山の小さな出来事（1 回だけ。説明しない・決めない）─────────
// ・どれも 1 回だけ（見たら アカウントの印 account_flags 'tev:<id>'／オフラインのセーブ toyamaEvents に残し、二度と起きない）。
// ・board：夏の夜、草の中の光る板に 一行だけ文字が出る（世界の時刻で文字が変わる）。調べたとき。
// ・train：世界の時刻 4:44 ごろ、遠くを 長い音が通りすぎる（季節を問わない）。
// ・footprints：冬、雪の上に小さな足あとが続いて、ふっと途切れている（見るまで、冬のあいだ そこにある）。途切れた所を調べたとき。
// ・white_near：ほかの世界から来たような品（crossover）を ぜんぶ集めたあとの夜、白い小さな影が一度だけ すぐ近くに現れる。
// サーバーは toyama_event で条件を確かめてから記録する（shared の toyamaEventBlock）。
export const TOYAMA_EVENT_IDS = ['board', 'train', 'footprints', 'white_near'];
export const TEV = {
  BOARD_R: 40,                       // 光る板を調べられる距離
  TRAIN_FROM: 4 + 44 / 60, TRAIN_TO: 4 + 50 / 60, TRAIN_SLACK: 8 / 60,   // 世界の時刻（時）。サーバーは少し遅れても受ける
  FOOT_R: 26,                        // 足あとの途切れた所を調べられる距離
  NEAR_D: 44, NEAR_LIFE: 4.5,        // 白い影：自分から 44px の所に 4.5 秒
};
const PHONE = { x: 60 * T + 8, y: 53 * T + 10 };   // 光る板（world.js の props と同じ所）
/** 光る板の一行（世界の時刻の「時」で変わる） */
export const BOARD_LINES = ['まだ そこに いる？', 'ゆきが とけたら また', 'きこえたら へんじして', 'こっちは よるだよ', 'みずの おとが する', '…４４４'];
export const boardLine = hour => BOARD_LINES[((Math.floor(Number(hour) || 0) % BOARD_LINES.length) + BOARD_LINES.length) % BOARD_LINES.length];
export function boardText(hour) {
  return '草の中の 四角い板が、いつもより 明るく光っている。一行だけ、文字が うかんだ。<br>「' + boardLine(hour) + '」<br>…見ているうちに、文字が かわった。<br>「' + boardLine(Number(hour) + 1) + '」<br>そして、暗くなった。';
}
/** 冬の足あと（点の並び：はじまり → 途切れる所）。地図は変えない（描くだけ・ぶつからない） */
export const FOOTPRINTS = (() => {
  const a = { x: 4 * T + 8, y: 47 * T + 4 }, b = { x: 10 * T + 6, y: 43 * T + 10 };
  const n = 11, out = [];
  for (let i = 0; i < n; i++) { const k = i / (n - 1); out.push({ x: Math.round(a.x + (b.x - a.x) * k + (i % 2 ? 2 : -2)), y: Math.round(a.y + (b.y - a.y) * k + (i % 2 ? -2 : 2)), side: i % 2 }); }
  return out;
})();
export const FOOT_END = FOOTPRINTS[FOOTPRINTS.length - 1];
export const FOOT_TEXT = '雪の上に 小さな足あとが 点々と続いている。トビネズミより 少し小さい。<br>――ここで、ふっと 途切れている。';
export const TRAIN_TEXT = '…遠くを、長い音が 通りすぎていった。';
export const NEAR_TEXT = '…すぐ そこに、白い小さな影が いた。こちらを 見ていた気がする。';
/** その世界の時刻（時・0〜24）が 4:44 の音の時刻か */
export const trainTime = (hour, slack = 0) => hour >= TEV.TRAIN_FROM && hour <= TEV.TRAIN_TO + slack;
const ownsAll = owned => { const has = id => (owned instanceof Set ? owned.has(id) : !!(owned && owned[id])); return CROSSOVER.every(has); };
/** 不思議な品（crossover）を ぜんぶ持っているか */
export const crossoverComplete = owned => ownsAll(owned);
/**
 * その出来事が いま起きてよいか。だめなら理由（null ＝ よい）。
 * ctx = {region, season, period, hour（世界の時刻 0〜24）, x, y（自分の位置）, owned（図鑑：Set か {id:…}）, seen（{id:…}）, slack（サーバーの遅れの許し）}
 */
export function toyamaEventBlock(id, ctx = {}) {
  if (!TOYAMA_EVENT_IDS.includes(id)) return 'そんな出来事は ない';
  if (ctx.region !== 'toyama') return 'ここでは ない';
  if (ctx.seen && ctx.seen[id]) return 'もう 見た';
  const near = (p, r) => Math.hypot((Number(ctx.x) || 0) - p.x, (Number(ctx.y) || 0) - p.y) <= r;
  switch (id) {
    case 'board': return ctx.season !== 'summer' ? '夏ではない' : ctx.period !== 'night' ? '夜ではない' : !near(PHONE, TEV.BOARD_R) ? '遠い' : null;
    case 'train': return trainTime(Number(ctx.hour) || 0, ctx.slack || 0) ? null : 'いまではない';
    case 'footprints': return ctx.season !== 'winter' ? '冬ではない' : !near(FOOT_END, TEV.FOOT_R) ? '遠い' : null;
    case 'white_near': return ctx.period !== 'night' ? '夜ではない' : !ownsAll(ctx.owned) ? 'まだ' : null;
  }
  return 'ない';
}

// ───────── Ver.0.8「季節のたのしみ」：行事の夜にだけ、富山にも ひとつだけ 小さなものが現れる（説明しない・決めない）─────────
// ・はじまりの原の 季節の行事（shared/festival.js）の夜（phase 'during'）のあいだだけ。だれが・なぜ は決めない。名前は出さない。
// ・春 花の種まき：祠のそばに 小さな花がひとつ。夏 星見の夜：あぜ道の草が 丸く ねている（空に 山の方へ落ちる流れ星がひとつ・画面だけ）。
//   秋 月見：平らな石の上に 米つぶが すこし。冬 灯りの夜：来た穴のそばに 小さな灯りがひとつ。
// ・地図は変えない（重ねて描く・調べられるだけ・ぶつからない）。記録も残さない（見るだけ）。
export const TOYAMA_FEST = {
  hana:  { kind: 'tflower', ...at(9, 18, 12), text: '祠のそばに、小さな花が ひとつ 咲いている。…さっきまで なかった気がする。' },
  hoshi: { kind: 'tgrass', ...at(20, TOYAMA.MOUNT_ROWS + 5, 12), text: 'あぜ道の草が 小さく 丸く ねている。だれかが ここで 空を 見ていたように。' },
  tsuki: { kind: 'trice', ...at(10, 27, 12), text: '平らな石の上に、米つぶが すこし 供えてある。月が よく 映っている。' },
  akari: { kind: 'tlantern', ...at(8, 33, 12), text: '小さな灯りが ひとつ、ともっている。足あとは ない。…だれの だろう。' },
};
/** 行事の夜の 富山の小さなもの（festival.js の festivalAt の結果を渡す。行事の夜でなければ 空） */
export function toyamaFestProps(fest) {
  if (!fest || fest.phase !== 'during' || !TOYAMA_FEST[fest.id]) return [];
  return [{ ...TOYAMA_FEST[fest.id], season: fest.season, fest: fest.id }];
}
