// tobinezumi/shared/festival.js — Ver.0.8「季節のたのしみ」：季節の行事（春・夏・秋・冬に 1 つずつ）。DOM なし・決定的。
//
// 方針（GAME_DESIGN.md §8「競わない」）：行事は みんなで いっしょに楽しむだけ。点数・順位・数の比べ合いは無い。参加は自由。
// ごほうびは「はじめて参加したとき」の図鑑の品（季節の行事の段・巣に飾れる）だけ。
//
// ・いつ：季節（世界の 2 日）の 1 日目 19 時 〜 2 日目 5 時（世界の 10 時間＝実時間 10 分・夜）。世界の時計から決まる（サーバーが正・全員同じ）。
//   季節の始め 〜 19 時は「もうすぐ」（before）、5 時 〜 季節の終わりは「あと」（after）。置いた花・灯り・供えた種は その季節のあいだ残る。
// ・occ（行事の回）＝ 世界の季節の通し番号 floor(世界の ms / 季節の ms)。1 回の行事に 1 匹 1 回だけ参加できる。
// ・春 花の種まき（plant）：自分の巣穴のそば（巣がなければ出発点の広場）に 種子 1 つで花の種をまく → 花が咲いて、みんなに見える。
//   夏 星見の夜（gaze）：はじまりの原の「いわかげの丘」で じっと すわって 空を見る（流れ星がたくさん）。2 匹以上で すわると 小さな きらきら。
//   秋 月見（offer）：オアシスのほとりの 平らな所に 種子 1 つを供える → 種の山が みんなの分だけ 大きくなる。月の明るい夜。
//   冬 灯りの夜（lantern）：自分の巣穴のそば（巣がなければ広場）に 草 1 つで 小さな灯りを置く → 夜の原が みんなの灯りで ほのかに明るい。
// ・開発用：clock.fest = 'on'（いつでも行事の夜）／'off'（行事なし）。サーバーの dev {fest}・オフラインの ?fest=1。
import { HOUR_MS, worldMs, DAY_MS } from './daynight.js';
import { SEASON_MS, seasonFromWorld } from './season.js';
import { POND, HILL, TILE } from './regions.js';
import { hash2 } from './rng.js';

export const FEST = {
  FROM_H: 19, TO_H: 29,      // 季節に入ってからの世界の時間（1 日目 19 時 〜 2 日目 5 時）
  NEAR_HOME: 56,             // 巣穴の入口から この距離（px）まで
  HOME_MIN: 10,              // 入口に近すぎると「巣に入る」になるので、これより少し離れて
  PLAZA_R: 80,               // 巣が無い子：出発点の広場（この半径）
  OFFER_R: 40,               // 月見：供える所から
  HILL_R: (HILL.r + 5) * TILE,   // 星見：いわかげの丘（地域名と同じ広さ）
  SIT_SEC: 3,                // じっと すわる秒数（クライアントはこれだけ待ってから送る・サーバーは 2 秒以上を確かめる）
  SIT_SERVER: 2,
  SPARKLE_D: 72,             // 2 匹が これより近くで すわると きらきら
  MAX_MARKS: 400,            // 1 つの土地の 1 回の行事で 残す印の上限（ふつうは届かない）
};
/** 月見の 供える所（オアシスの南のほとり）・星見の丘の 見晴らしのよい所（丘の西） */
export const OFFER_SPOT = { x: POND.x * TILE + 8, y: (POND.y + 5) * TILE + 4 };
export const HILL_SPOT = { x: 68 * TILE + 8, y: 51 * TILE + 8 };
export const HILL_CENTER = { x: HILL.x * TILE + 8, y: HILL.y * TILE + 8 };
/** NPC（オフライン）の すわる所（丘の西：通れる所） */
export const HILL_SEATS = [{ x: 68 * TILE + 8, y: 49 * TILE + 8 }, { x: 68 * TILE + 4, y: 51 * TILE + 10 }, { x: 69 * TILE + 8, y: 53 * TILE + 6 }];

export const FESTIVALS = {
  spring: { id: 'hana', season: 'spring', name: '花の種まき', act: 'plant', cost: { seed: 1 }, reward: 'pressed_flower', where: '自分の巣穴のそば（巣が無ければ 出発点の広場）',
    verb: '花の種をまく', done: '花の種を まいた。…ぽん、と 小さな花が ひらいた。',
    toast: '今夜は「花の種まき」。巣穴のそばに 種子をひとつ まくと、花が咲く（みんなに見える）', soon: '春のはじめの夜に「花の種まき」' },
  summer: { id: 'hoshi', season: 'summer', name: '星見の夜', act: 'gaze', cost: {}, reward: 'star_sand', where: 'はじまりの原の いわかげの丘',
    verb: 'すわって 星を見る', done: 'みんなで 空を見上げた。流れ星が ひとつ、またひとつ。',
    toast: '今夜は「星見の夜」。いわかげの丘で じっと すわって 空を見よう（流れ星がたくさん）', soon: '夏のはじめの夜に「星見の夜」' },
  autumn: { id: 'tsuki', season: 'autumn', name: '月見', act: 'offer', cost: { seed: 1 }, reward: 'moon_seed', where: 'オアシスのほとり（南の岸）',
    verb: '種子を 供える', done: '月に 種子を ひとつ 供えた。山が すこし 大きくなった。',
    toast: '今夜は「月見」。オアシスの南のほとりに 種子をひとつ 供えよう（まんまるの月）', soon: '秋のはじめの夜に「月見」' },
  winter: { id: 'akari', season: 'winter', name: '灯りの夜', act: 'lantern', cost: { grass: 1 }, reward: 'little_lantern', where: '自分の巣穴のそば（巣が無ければ 出発点の広場）',
    verb: '小さな灯りを置く', done: '小さな灯りを ともした。あたたかい。',
    toast: '今夜は「灯りの夜」。巣穴のそばに 草をひとつ使って 小さな灯りを置こう（みんなの灯りで原が明るい）', soon: '冬のはじめの夜に「灯りの夜」' },
};
export const FEST_IDS = Object.values(FESTIVALS).map(f => f.id);
export const FEST_BY_ID = Object.fromEntries(Object.values(FESTIVALS).map(f => [f.id, f]));
export const FEST_ACTS = Object.fromEntries(Object.values(FESTIVALS).map(f => [f.act, f]));
export const FEST_REWARDS = Object.values(FESTIVALS).map(f => f.reward);

const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];
/**
 * いまの行事：{id, name, season, act, occ, phase:'before'|'during'|'after', startW, endW, w, ...}
 * clock.fest === 'on' ならいつでも 'during'、'off' なら 'before'（開発用）。
 */
export function festivalAt(clock, t) {
  const w = worldMs(clock, t);
  return festivalAtWorld(w, clock && clock.season, clock && clock.fest);
}
export function festivalAtWorld(w, forced = null, fest = null) {
  const occ = Math.floor(w / SEASON_MS);
  const se = seasonFromWorld(w, forced);
  const base = occ * SEASON_MS, startW = base + FEST.FROM_H * HOUR_MS, endW = base + FEST.TO_H * HOUR_MS;
  let phase = w < startW ? 'before' : w < endW ? 'during' : 'after';
  if (fest === 'on') phase = 'during'; else if (fest === 'off') phase = 'before';
  return { ...FESTIVALS[se.id], occ, phase, startW, endW, w };
}
/** 行事の夜か */
export const festOn = f => !!f && f.phase === 'during';
/**
 * 次の行事（メニューの「次の行事：…」）。いまが行事の夜なら いまのもの。
 * {fest, now:bool, inW（世界の ms：始まるまで／終わるまで）}
 */
export function nextFestival(clock, t) {
  const f = festivalAt(clock, t);
  if (f.phase === 'during') return { fest: f, now: true, inW: Math.max(0, f.endW - f.w) };
  if (f.phase === 'before') return { fest: f, now: false, inW: f.startW - f.w };
  const nw = (f.occ + 1) * SEASON_MS;
  const nf = festivalAtWorld(nw + FEST.FROM_H * HOUR_MS, clock && clock.season, null);
  return { fest: { ...nf, phase: 'before', w: f.w }, now: false, inW: nf.startW - f.w };
}
/** 世界の時間（ms）を「1 日 4 時間」のように */
export function worldSpan(ms) {
  const h = Math.max(0, Math.round(ms / HOUR_MS));
  const d = Math.floor(h / 24), hh = h % 24;
  if (!h) return 'まもなく';
  return (d ? d + ' 日' : '') + (d && hh ? 'と ' : '') + (hh ? hh + ' 時間' : '');
}
/** メニューの小さな暦の 1 行（実時間の目安つき）。scale = 時計の速さ */
export function festNote(clock, t) {
  const n = nextFestival(clock, t), f = n.fest, scale = (clock && clock.scale) || 1;
  const realMin = Math.max(1, Math.round(n.inW / scale / 60000));
  if (n.now) return { text: 'いまの行事：' + f.name + ' ― ' + f.where, sub: '世界の時間で あと ' + worldSpan(n.inW) + '（約 ' + realMin + ' 分）', fest: f, now: true };
  return { text: '次の行事：' + f.name, sub: f.soon + '・世界の時間で あと ' + worldSpan(n.inW) + '（約 ' + realMin + ' 分）', fest: f, now: false };
}

// ───────── 参加の条件（サーバーとオフラインで同じ）─────────
const near = (a, b, r) => !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y) <= r;
/** 星見の丘の中か（はじまりの原） */
export const onHill = (region, x, y) => (region || 'plains') === 'plains' && Math.hypot(x - HILL_CENTER.x, y - HILL_CENTER.y) <= FEST.HILL_R;
/** 巣のそば・広場のどこで参加できるか（場所の名前）。null ＝ ここではない */
export function homeSpot(ctx) {
  const p = { x: Number(ctx.x) || 0, y: Number(ctx.y) || 0 };
  if (ctx.entrance && near(p, ctx.entrance, FEST.NEAR_HOME) && !near(p, ctx.entrance, FEST.HOME_MIN)) return 'home';
  if (ctx.spawn && near(p, ctx.spawn, FEST.PLAZA_R)) return 'plaza';
  return null;
}
/** 持っているか（{seed:1} など） */
export function hasCostInv(inv, cost) {
  for (const [k, n] of Object.entries(cost || {})) { let c = 0; for (const s of inv || []) if (s && s.id === k) c += s.n; if (c < n) return false; }
  return true;
}
/**
 * その行事に いま参加できるか。だめなら理由（null ＝ できる）。
 * ctx = {fest（festivalAt）, act, region, x, y, entrance（自分の巣の入口：この土地のものだけ）, spawn（この土地の出発点）, done（この回はもう参加した）, inv, still（じっとしている秒）, place}
 */
export function festActBlock(ctx = {}) {
  const f = ctx.fest;
  if (!f || !FEST_ACTS[ctx.act]) return 'そんな行事は ない';
  if (ctx.place && ctx.place !== 'field') return '地上で';
  if (f.phase !== 'during') return '行事の夜ではない（' + f.name + 'は ' + f.soon.replace(/に「.*$/, '') + '）';
  if (f.act !== ctx.act) return 'いまの行事は「' + f.name + '」';
  if (ctx.region === 'toyama') return 'ここでは できない気がする';
  if (ctx.done) return 'この夜は もう 参加した（また次の季節に）';
  if (ctx.act === 'plant' || ctx.act === 'lantern') {
    if (!homeSpot(ctx)) return ctx.entrance ? '自分の巣穴の すぐそばで（入口から少し はなれて）' : '巣が無いときは 出発点の広場で';
  } else if (ctx.act === 'offer') {
    if ((ctx.region || 'plains') !== 'plains' || !near({ x: ctx.x, y: ctx.y }, OFFER_SPOT, FEST.OFFER_R)) return 'オアシスの南のほとりで';
  } else if (ctx.act === 'gaze') {
    if (!onHill(ctx.region, Number(ctx.x) || 0, Number(ctx.y) || 0)) return 'はじまりの原の いわかげの丘で';
    if ((Number(ctx.still) || 0) < (ctx.sitMin ?? FEST.SIT_SERVER)) return 'じっと すわって';
  }
  if (!hasCostInv(ctx.inv, f.cost)) return Object.keys(f.cost).map(k => ({ seed: '種子', grass: '草' }[k] || k)).join('・') + ' が 要る';
  return null;
}
/** 印（花・灯り・供えた種・すわった所）の形。v は見た目の違い（色など：アカウントと回から決まる） */
export function makeMark({ fest, region, x, y, owner, name, at }) {
  const v = Math.floor(hash2(Number(String(owner).replace(/\D/g, '')) || String(owner).length * 31, fest.occ | 0, 4242) * 4);
  let mx = Math.round(x), my = Math.round(y);
  if (fest.act === 'offer') { mx = OFFER_SPOT.x; my = OFFER_SPOT.y; }
  else if (fest.act === 'plant') my += 10;          // 足もとの少し手前（自分の体で隠れないように）
  else if (fest.act === 'lantern') { mx += 12; my += 3; }   // すぐ横に立てる
  return { kind: fest.act, fest: fest.id, occ: fest.occ, region: region || 'plains', x: mx, y: my, owner, name: String(name || '').slice(0, 12), v, at };
}
/** いま見える印（その季節＝同じ回のものだけ。土地も同じ） */
export function marksVisible(marks, clock, t, region = null) {
  const occ = Math.floor(worldMs(clock, t) / SEASON_MS);
  return (marks || []).filter(m => m.occ === occ && (!region || (m.region || 'plains') === region));
}
/** 月見の種の山の大きさ（0〜4：供えた数で。数そのものは出さない） */
export function offerPileSize(n) { return n <= 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 12 ? 3 : 4; }

// ───────── 星見：いっしょに すわる・流れ星 ─────────
/**
 * いっしょに すわって きらきらしている子（2 匹以上が近くで すわっている）。
 * sitters = [{id, x, y, sit（すわっている秒）}] → Set(id)
 */
export function sparkleSet(sitters, region = 'plains') {
  const ok = sitters.filter(s => (s.sit || 0) >= FEST.SIT_SEC && onHill(region, s.x, s.y));
  const out = new Set();
  for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) {
    if (Math.hypot(ok[i].x - ok[j].x, ok[i].y - ok[j].y) <= FEST.SPARKLE_D) { out.add(ok[i].id); out.add(ok[j].id); }
  }
  return out;
}
export const STAR_SLOT_MS = 1400;
/**
 * 流れ星（画面の上の方を横切る）。サーバーの時計から決まる（同じ時刻なら どの画面でも同じ所・同じ向き）。
 * many：星見の夜（たくさん）。返り値 [{x0, y0, x1, y1, k（0..1 進み）}]（画面の割合 0..1）
 */
export function shootingStars(t, many = false) {
  const out = [], slot = Math.floor(t / STAR_SLOT_MS);
  for (let s = slot - 2; s <= slot; s++) {
    if (hash2(s, 7, 9311) > (many ? 0.85 : 0.08)) continue;
    const t0 = s * STAR_SLOT_MS + hash2(s, 8, 9311) * STAR_SLOT_MS * 0.6, dur = 700 + hash2(s, 9, 9311) * 500;
    const k = (t - t0) / dur;
    if (k < 0 || k > 1) continue;
    const x0 = 0.1 + hash2(s, 10, 9311) * 0.8, y0 = 0.04 + hash2(s, 11, 9311) * 0.3, dir = hash2(s, 12, 9311) < 0.5 ? -1 : 1;
    out.push({ x0, y0, x1: x0 + dir * (0.18 + hash2(s, 13, 9311) * 0.16), y1: y0 + 0.1 + hash2(s, 14, 9311) * 0.1, k, id: s });
  }
  return out;
}

// ───────── オフライン：NPC（ナッツ・モカ・リコ）も参加する（決まった時刻に・決まった所へ）─────────
/**
 * NPC の印（オフライン。保存しない：回と時刻から毎回同じに決まる）。npcs = [{id, name, home:{x, y}}]（入口は home の 20px 上）
 * 行事の夜が始まってから 世界の 1・2.5・4 時間で 1 匹ずつ。星見は印を作らない（丘へ行って すわるだけ）。
 */
export function npcMarks(fest, npcs, w = fest.w) {
  if (!fest || fest.act === 'gaze' || fest.phase === 'before') return [];
  const out = [];
  npcs.forEach((n, i) => {
    const at = fest.startW + (1 + i * 1.5) * HOUR_MS;
    if (fest.phase === 'during' && w >= fest.startW && w < at) return;   // まだ来ていない（開発用の 'on' で時刻の前なら みんな来ている）
    const ex = n.home.x, ey = n.home.y - 20;
    const off = fest.act === 'lantern' ? [[-30, 4], [4, 6], [-26, -12]][i % 3] : [[-18, -4], [16, -2], [-14, -20]][i % 3];   // makeMark が少しずらす（花は 10px 手前・灯りは 12px 横）
    out.push(makeMark({ fest, region: 'plains', x: ex + off[0], y: ey + off[1], owner: n.id, name: n.name, at }));
  });
  return out;
}
/** 星見の夜の NPC の すわる所（i 番目） */
export const npcSeat = i => HILL_SEATS[i % HILL_SEATS.length];

// ───────── 家族のやりとりの文脈 ─────────
/** やりとりに渡す行事の様子：{id, phase}（この季節の行事） */
export function festTalkCtx(clock, t) { const f = festivalAt(clock, t); return { id: f.id, phase: f.phase }; }
/** 富山（Ver.0.8）：行事の夜に ひとつだけ現れる 小さなもの（説明しない）。shared/toyama.js が使う */
export const FEST_SEASON = id => (FEST_BY_ID[id] || {}).season || null;
void DAY_MS; void SEASON_IDS;
