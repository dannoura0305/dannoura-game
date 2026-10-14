// tobinezumi/shared/family-life.js — Ver.0.6「くらしの深まり」：巣の家族のしぐさ・ひとこと・なでる。DOM なし・決定的。
//
// ・巣の中の家族（つれあい・子・きょうだい・なかま（ほかの種）・共同巣の NPC の住人）は、**巣の id ＋ 時刻（サーバーの時計）＋ 個体の id**
//   から決まる動きをする（同期の通信は増やさない）。同じ巣・同じ時刻なら、どの画面でも同じしぐさ・同じ位置・同じひとことになる。
//   入力：巣の部屋（巣データから作る：全員が同じものを持っている）・家族の一覧（巣に入ったときに届く）・昼夜（世界の時計）・
//   親（その子の家の子＝プレイヤー）の位置（nest_peers で全員に見えている）。
// ・時間は FAM.SLOT_MS ごとの「枠」に分かれ、枠ごとにしぐさ（歩く・毛づくろい・におい・すわる・よりそう・追いかけっこ・眠る・ほかの部屋へ）を選ぶ。
//   枠の始めに前の枠の位置から歩いて動くので、位置は時刻の連続な関数（部屋を移るときだけ「ひょっこり」現れる）。
// ・昼（トビネズミは夜行性）と、親が眠っているあいだは、子ども・若者は寝床で 1 か所に集まって眠る（小さい順に重なる）。
// ・ひとこと（吹き出し）は FAM.BUBBLE_SLOT_MS ごとに、個体ごとにずらして、一部の子だけが FAM.BUBBLE_MS のあいだ話す。
//   中身は 段階・役割・季節・昼夜・天気・倉庫の種子・おなかで変わる（やさしい言葉だけ）。
// ・なでる（毛づくろいしてあげる）：自分の家族に E。サーバー／オフラインのバックエンドが確かめる（PET）。
import { hash2 } from './rng.js';
import { seedOf } from './genetics.js';

export const FAM = {
  SLOT_MS: 7000,          // しぐさの枠
  WALK_PX_S: 30,          // 歩く速さ（px/秒・子どもは ×0.8）
  BUBBLE_SLOT_MS: 9000,   // ひとことの枠
  BUBBLE_MS: 3600,        // 吹き出しの出ている時間
  CHASE_MS: 2600,         // 追いかけっこの 1 往復
  FOLLOW_GAP: 14, FOLLOW_STEP: 11,
};
export const PET = { COOLDOWN_MS: 90 * 1000, COND: 4, MAX_COND: 100 };
export const ACT_NAME = { wander: '歩く', groom: '毛づくろい', sniff: 'くんくん', sit: 'すわる', snuggle: 'よりそう', chase: '追いかけっこ', sleep: '眠る', pile: 'かたまって眠る', visit: 'ほかの部屋へ', follow: 'ついていく' };

const isSmall = m => m.stage === 'pup' || m.stage === 'young';
const keyOf = k => (typeof k === 'number' ? k >>> 0 : seedOf(k));
/** 0..1 の決まった値（巣・個体・枠・何番目） */
export function famRand(key, id, slot, k = 0) { return hash2(seedOf(key, id) | 0, slot | 0, (keyOf(k) + 7919) | 0); }

/** 巣データ（shared/nest-rules.js の形）から、家族の歩ける部屋（床の左右・高さ px） */
export function famRooms(data, cell = 16) {
  return (data && data.rooms ? data.rooms : []).map(r => ({ id: r.id, kind: r.kind, x0: r.x * cell + 6, x1: (r.x + r.w) * cell - 6, y: (r.y + r.h) * cell }));
}

/**
 * 家族のいまの様子（決定的）。
 * @param {object} o
 *   key：巣の id（文字列・数）／members：[{id, role, stage, fed?, species?, acct?, npc?}]／rooms：famRooms の結果／
 *   bed：{x0, x1, roomId}|null（寝床の家具）／t：時刻（サーバーの時計 ms）／period：'day'|'dawn'|'dusk'|'night'／
 *   parents：{acct|'me' → {x, roomId, facing, sleep}}（その家の子の位置。いなければ無し）／mine：自分の家族か（m → bool）
 * @returns {Map<id, {x, y, roomId, facing, act, anim, pop, partner}>}
 */
export function familyScene({ key, members = [], rooms = [], bed = null, t = 0, period = 'night', parents = {} } = {}) {
  const out = new Map();
  if (!rooms.length || !members.length) return out;
  const bedRoom = (bed && rooms.find(r => r.id === bed.roomId)) || rooms.find(r => r.kind === 'bed') || rooms.find(r => r.kind === 'plain') || rooms[0];
  const slot = Math.floor(t / FAM.SLOT_MS), u = (t - slot * FAM.SLOT_MS) / FAM.SLOT_MS;
  const sorted = [...members].sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
  const small = sorted.filter(isSmall);
  const pairOf = new Map();
  for (let i = 0; i + 1 < small.length; i += 2) { pairOf.set(small[i].id, { a: small[i], b: small[i + 1], lead: true }); pairOf.set(small[i + 1].id, { a: small[i], b: small[i + 1], lead: false }); }
  const parentOf = m => parents[m.acct != null ? m.acct : 'me'] || null;
  const day = period === 'day';
  const roomById = id => rooms.find(r => r.id === id) || bedRoom;
  const clampX = (r, x) => Math.max(r.x0, Math.min(r.x1, x));
  const bedX = bed ? (bed.x0 + bed.x1) / 2 : (bedRoom.x0 + bedRoom.x1) / 2;

  /** 枠 s での「行き先」（位置の連続のために前の枠でも呼ぶ）。追いかけっこ・ついていくは別 */
  const plan = (m, s, idx) => {
    const r = n => famRand(key, m.id, s, n);
    const par = parentOf(m);
    const sleepy = (day || (par && par.sleep)) && (isSmall(m) || r(9) < 0.75 || m.role === 'friend' || !!m.npc);
    if (sleepy) {
      const pile = isSmall(m);
      const i = pile ? small.indexOf(m) : idx;
      const off = pile ? ((i % 6) - 2.5) * 5 : ((idx % 5) - 2) * 11 + 10;
      return { act: pile ? 'pile' : 'sleep', room: bed ? roomById(bed.roomId) : bedRoom, x: clampX(bed ? roomById(bed.roomId) : bedRoom, bedX + off) };
    }
    const pair = pairOf.get(m.id);
    if (pair && famRand(key, 'chase:' + pair.a.id, s, 3) < 0.34) return { act: 'chase', room: bedRoom, pair };
    if (par && isSmall(m) && m.role !== 'friend' && r(4) < 0.45) return { act: 'follow', room: null, par };
    let room = bedRoom;
    const roll = r(1);
    let act;
    if (roll < 0.26) act = 'wander';
    else if (roll < 0.44) act = 'groom';
    else if (roll < 0.58) act = 'sniff';
    else if (roll < 0.72) act = 'sit';
    else if (roll < 0.86) act = 'snuggle';
    else { act = 'visit'; room = rooms[Math.floor(r(2) * rooms.length) % rooms.length]; }
    if (m.role === 'mate' && !par) room = bedRoom;
    let x = room.x0 + r(5) * Math.max(1, room.x1 - room.x0);
    let partner = null;
    if (act === 'snuggle') {
      const mate = sorted.find(o => o.role === 'mate' && o !== m);
      const p2 = mate || sorted.find(o => o !== m) || null;
      if (p2) {
        partner = p2.id;
        const k = sorted.indexOf(p2);
        const px = (bedRoom.x0 + famRand(key, p2.id, s, 5) * Math.max(1, bedRoom.x1 - bedRoom.x0));
        x = clampX(bedRoom, px + (k < idx ? 8 : -8)); room = bedRoom;
      } else act = 'sit';
    }
    return { act, room, x: clampX(room, x), partner };
  };

  sorted.forEach((m, idx) => {
    const cur = plan(m, slot, idx), prev = plan(m, slot - 1, idx);
    const speed = FAM.WALK_PX_S * (m.stage === 'pup' ? 0.8 : 1);
    let x, roomId, facing = famRand(key, m.id, slot, 6) < 0.5 ? -1 : 1, anim = 'idle', pop = false;
    const fromX = prev.act === 'chase' || prev.act === 'follow' ? null : prev.x;
    if (cur.act === 'chase') {
      const R = cur.room, c = (R.x0 + R.x1) / 2, A = Math.max(6, Math.min(40, (R.x1 - R.x0) / 2 - 4));
      const lag = cur.pair.lead ? 0 : 420, ph = 2 * Math.PI * (t - lag) / FAM.CHASE_MS + (seedOf(key, cur.pair.a.id) % 7);
      x = c + A * Math.sin(ph); roomId = R.id;
      facing = Math.cos(ph) >= 0 ? 1 : -1; anim = 'walk';
    } else if (cur.act === 'follow') {
      const p = cur.par, R = roomById(p.roomId);
      const k = sorted.filter(o => isSmall(o) && parentOf(o) === p).indexOf(m);
      x = clampX(R, p.x - (p.facing || 1) * (FAM.FOLLOW_GAP + Math.max(0, k) * FAM.FOLLOW_STEP)); roomId = R.id;
      facing = p.facing || 1; anim = 'walk';
    } else {
      roomId = cur.room.id;
      const sameRoom = prev.room && prev.room.id === cur.room.id && fromX != null;
      const start = sameRoom ? fromX : cur.x;
      if (!sameRoom && u < 0.06) pop = true;
      const dist = cur.x - start, need = Math.abs(dist) / speed * 1000;
      const el = u * FAM.SLOT_MS;
      if (need > 1 && el < need) { x = start + dist * (el / need); facing = dist >= 0 ? 1 : -1; anim = 'walk'; }
      else {
        x = cur.x;
        anim = cur.act === 'sleep' || cur.act === 'pile' ? 'sleep' : cur.act === 'groom' ? 'groom' : cur.act === 'sniff' ? 'sniff' : 'idle';
        if (cur.act === 'snuggle' && cur.partner != null) { const k = sorted.findIndex(o => o.id === cur.partner); facing = k < idx ? -1 : 1; }
      }
    }
    const R = roomById(roomId);
    out.set(m.id, { x: Math.round(x * 10) / 10, y: R.y, roomId, facing, act: cur.act, anim, pop, partner: cur.partner ?? null });
  });
  return out;
}

// ───────── ひとこと ─────────
const L = {
  pupHungry: ['おなかすいた', 'たね たべたい…', 'ぺこぺこ…'],
  pup: ['あそぼ！', 'まてまて〜', 'ぴょん！', 'くすぐったい', 'これ なあに？', 'いっしょに ねよ'],
  pupDay: ['ねむい…', 'ふぁ…', 'まだ ひるだよ…'],
  pupChase: ['まてまて〜', 'つかまえた！', 'こっちだよ！'],
  young: ['そとに いってみたい', 'もっと 高く 跳べるよ', 'きょうは どこまで 行くの？', 'しっぽ、のびてきた'],
  mateLow: ['たねが すくないね…', '倉庫、すこし さみしいね'],
  mateMid: ['たね、いい感じに たまってきた', 'きょうも ありがとう'],
  mateHigh: ['たねが たくさん。冬も あんしんね', '倉庫が いっぱい。えらいね'],
  spring: ['はるの においがする', 'あたたかくなってきたね'],
  summer: ['あついね…巣のなかは すずしい', 'なつは ひるに よく寝ようね'],
  autumn: ['みのりの 季節だね', 'たくさん ためておこう'],
  winter: ['さむいね。くっついていよう', 'ふゆごもりの じゅんび、できてる？'],
  rain: ['あめの音がする', 'しずくの音、すき'],
  sandstorm: ['外は 砂嵐みたい', '入口、だいじょうぶかな'],
  snow: ['ゆき、つもってるかな', 'しんしんと ふってるね'],
  adultDay: ['ふぁ…ひるは ねむいね'],
  adultNight: ['よるだね。おでかけする？', 'いい巣だね', 'のんびり いこう'],
  elder: ['むかしは もっと 遠くまで 跳べたんだ', 'みんな 大きくなったねえ'],
  friend: ['みみが じまんなの', 'すなの海の 夜が なつかしい', 'ここ、すずしくて いいね'],
  sleep: ['すぅ…', 'むにゃ…', 'zzz…'],
  groom: ['けづくろい、けづくろい', 'ふわふわ'],
  npc: ['ただいま', 'この巣、住みごこち いいね', '寝床、ふかふか'],
};
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
/** 倉庫の種子の数 → ことばの段 */
export const seedTone = n => (n < 10 ? 'low' : n >= 40 ? 'high' : 'mid');

/** その子のいまのことば（中身だけ：決定的。r は 0..1） */
export function familyLine(m, ctx = {}, r = 0) {
  const { season = 'spring', period = 'night', weather = 'clear', seeds = 0, act = 'idle' } = ctx;
  if (act === 'sleep' || act === 'pile') return pick(L.sleep, r);
  if (m.npc) return pick(L.npc, r);
  if (m.role === 'friend') return pick(L.friend, r);
  if (m.stage === 'pup') {
    if ((m.fed ?? 100) < 40) return pick(L.pupHungry, r);
    if (act === 'chase') return pick(L.pupChase, r);
    return pick(period === 'day' ? L.pupDay : L.pup, r);
  }
  if (m.stage === 'young') return pick((m.fed ?? 100) < 30 ? L.pupHungry : L.young, r);
  if (act === 'groom') return pick(L.groom, r);
  if (m.role === 'mate') {
    const wx = weather === 'rain' || weather === 'sandstorm' || weather === 'snow' ? L[weather] : null;
    const pool = r < 0.4 ? L['mate' + { low: 'Low', mid: 'Mid', high: 'High' }[seedTone(seeds)]] : r < 0.7 ? (wx || L[season] || L.spring) : (L[season] || L.spring);
    return pick(pool, (r * 7.3) % 1);
  }
  if (m.stage === 'elder') return pick(L.elder, r);
  return pick(period === 'day' ? L.adultDay : L.adultNight, r);
}
/**
 * いま吹き出しを出しているか（決定的）。出していれば {text, t0, t1}。
 * scene = familyScene の結果の 1 つ（act を使う）。ctx = {season, period, weather, seeds}
 */
export function familyBubble({ key, m, t, view = null, ctx = {} }) {
  const off = famRand(key, m.id, 0, 'boff') * FAM.BUBBLE_SLOT_MS;
  const tt = t + off, slot = Math.floor(tt / FAM.BUBBLE_SLOT_MS), into = tt - slot * FAM.BUBBLE_SLOT_MS;
  if (into > FAM.BUBBLE_MS) return null;
  const act = view ? view.act : 'idle';
  let chance = m.stage === 'pup' ? 0.34 : m.role === 'mate' ? 0.3 : 0.22;
  if (m.stage === 'pup' && (m.fed ?? 100) < 40) chance = 0.7;
  if (act === 'sleep' || act === 'pile') chance *= 0.35;
  const r = famRand(key, m.id, slot, 'bub');
  if (r >= chance) return null;
  const text = familyLine(m, { ...ctx, act }, famRand(key, m.id, slot, 'line'));
  const t0 = slot * FAM.BUBBLE_SLOT_MS - off;
  return { text, t0, t1: t0 + FAM.BUBBLE_MS };
}

/** なでられるか（自分の家族・巣の中の子・前になでてから PET.COOLDOWN_MS） */
export function petBlock(m, now) {
  if (!m) return 'その子は 巣にいない';
  if (m.pettedAt && now - m.pettedAt < PET.COOLDOWN_MS) return m.name + ' は さっき なでてもらって まんぞくそう（' + Math.ceil((PET.COOLDOWN_MS - (now - m.pettedAt)) / 1000) + ' 秒）';
  return null;
}
/** なでたときの返事（決定的） */
export function petReply(m, r = 0) {
  if (m.role === 'mate') return pick(['ありがとう。きもちいい', 'ふふ、くすぐったい', 'いっしょに いられて うれしい'], r);
  if (m.role === 'friend') return pick(['みみの うしろが いいの', 'ありがとう、なかま'], r);
  if (m.stage === 'pup') return pick(['えへへ', 'もっと〜', 'きゅう♪'], r);
  return pick(['ありがとう', 'ふわぁ…', 'きもちいい'], r);
}
