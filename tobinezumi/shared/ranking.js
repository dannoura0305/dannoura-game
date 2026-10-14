// tobinezumi/shared/ranking.js — Ver.0.6：「豊かな巣」の週ごとの区切り。DOM なし・決定的。
//
// ・週 = 実時間の ISO 週（日本時間：UTC+9 の月曜 0:00 から日曜 24:00）。鍵は '2026-W42'。
// ・その週の最初に見たときの豊かさ（base）を覚え、「今週ふえた豊かさ」（gain = score − base）で並べる（同じなら豊かさ・巣の id）。
//   週の途中で掘った巣は base 0（その週に作った分がまるごと「ふえた分」）。
// ・週が変わったら、前の週を「しめる」：順位（place）と、やさしい呼び名（title）を決めて残す。呼び名は 1 つの巣に 1 つまで、
//   「今週いちばん育った巣」のほか、飾り・収集品・部屋の多さで別の巣にも贈る（競うより、いろいろな巣をほめる）。
// ・サーバー：rank_weeks 表（migrations/007_life_deploy.js）。オフライン：セーブの rank（同じ関数）。
export const RANK = { TZ_MIN: 9 * 60, TOP: 10, LAST_TOP: 3, REFRESH_MS: 30 * 1000 };
export const TITLES = [
  { id: 'grew', name: '今週いちばん育った巣', by: r => r.gain, min: 1 },
  { id: 'decor', name: 'かざりの名人', by: r => r.decor, min: 3 },
  { id: 'curios', name: 'たからものの巣', by: r => r.curios, min: 1 },
  { id: 'rooms', name: 'ひろびろの巣', by: r => r.rooms, min: 3 },
  { id: 'cozy', name: 'いちばん豊かな巣', by: r => r.score, min: 1 },
];
export const TITLE_NAME = Object.fromEntries(TITLES.map(t => [t.id, t.name]));

/** その時刻の週の鍵（ISO 週・日本時間） */
export function weekKey(ms, tzMin = RANK.TZ_MIN) {
  const d = new Date(ms + tzMin * 60000);
  const day = (d.getUTCDay() + 6) % 7;                      // 月曜 0
  const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 3));
  const y = thu.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((thu - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
/** 週の始まり・終わり（UTC の ms） */
export function weekRange(ms, tzMin = RANK.TZ_MIN) {
  const d = new Date(ms + tzMin * 60000);
  const day = (d.getUTCDay() + 6) % 7;
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day) - tzMin * 60000;
  return { start, end: start + 7 * 86400000 };
}
/** 前の週の鍵 */
export const prevWeekKey = (ms, tzMin = RANK.TZ_MIN) => weekKey(weekRange(ms, tzMin).start - 1, tzMin);

/**
 * いまの巣の豊かさ（rows：[{nestId, owner, name, region, score, rooms, decor, curios}]）と、その週の base（Map nestId → base）から
 * 今週の並び。返り値 [{...row, base, gain, rank}]（gain の大きい順）
 */
export function weekBoard(rows, bases) {
  const out = rows.map(r => { const b = bases.has(r.nestId) ? bases.get(r.nestId) : 0; return { ...r, base: b, gain: Math.max(0, r.score - b) }; });
  out.sort((a, b) => b.gain - a.gain || b.score - a.score || String(a.nestId).localeCompare(String(b.nestId), 'en', { numeric: true }));
  out.forEach((r, i) => { r.rank = i + 1; });
  return out;
}
/** 週をしめる：順位と呼び名（1 つの巣に 1 つまで・TITLES の順に） */
export function finalizeWeek(board) {
  const titles = new Map();
  for (const T of TITLES) {
    let best = null;
    for (const r of board) { if (titles.has(r.nestId)) continue; const v = T.by(r); if (v >= T.min && (!best || v > T.by(best))) best = r; }
    if (best) titles.set(best.nestId, T.id);
  }
  return board.map(r => ({ ...r, place: r.rank, title: titles.get(r.nestId) || null }));
}
/** 先週の「ほめる」一覧（呼び名のある巣だけ・TITLES の順） */
export function lastWeekWinners(final) {
  const order = new Map(TITLES.map((t, i) => [t.id, i]));
  return final.filter(r => r.title).sort((a, b) => order.get(a.title) - order.get(b.title)).map(r => ({ name: r.name, title: r.title, titleName: TITLE_NAME[r.title], gain: r.gain, score: r.score, region: r.region, me: !!r.me }));
}
/** 週の表示（「10月13日〜19日」） */
export function weekLabel(ms, tzMin = RANK.TZ_MIN) {
  const { start, end } = weekRange(ms, tzMin);
  const a = new Date(start + tzMin * 60000), b = new Date(end - 1 + tzMin * 60000);
  return (a.getUTCMonth() + 1) + '月' + a.getUTCDate() + '日〜' + (b.getUTCMonth() !== a.getUTCMonth() ? (b.getUTCMonth() + 1) + '月' : '') + b.getUTCDate() + '日';
}
