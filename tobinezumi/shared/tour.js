// tobinezumi/shared/tour.js — Ver.0.6「巣めぐり」：たずねられる巣を いくつか紹介する（順位・点数はつけない）。DOM なし・決定的。
//
// ・このゲームは競い合わない（GAME_DESIGN.md「競わない」）。Ver.0.5 の「豊かな巣」（豊かさの点数と上位 10）は Ver.0.6 でやめて、
//   その子が入れる巣（公開・フレンドだけ公開でフレンド・許可リストに入っている）から、見るたびに少しずつ入れかわる紹介にした。
// ・選び方：最近（TOUR.RECENT_MS 以内）手を入れた巣から TOUR.RECENT まで ＋ 残りは「その子 × 時間の枠（TOUR.SLOT_MS）」の種で混ぜて選ぶ。
//   並びも混ぜたまま（大きさ・数で並べない）。自分の巣・自分の住む共同巣は出さない。
import { seedOf } from './genetics.js';
import { mulberry32 } from './rng.js';
import { nestFeatures, nestTourDesc } from './collect.js';

export const TOUR = { MAX: 6, RECENT: 2, RECENT_MS: 24 * 60 * 60 * 1000, SLOT_MS: 10 * 60 * 1000 };

/**
 * @param {Array} cands  [{nestId, name, region, data, updatedAt, policy, friend, x, y}]（もう「入れる巣」に絞ったもの）
 * @param {object} o     {viewer, now}
 * @returns {Array} [{nestId, name, region, desc, rooms, decor, curios, recent, policy, friend, x, y}]
 */
export function pickTour(cands, { viewer = '', now = 0 } = {}) {
  const rng = mulberry32(seedOf('tour', viewer, Math.floor(now / TOUR.SLOT_MS)));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const list = [...cands].sort((a, b) => String(a.nestId).localeCompare(String(b.nestId), 'en', { numeric: true }));
  const recent = shuffle(list.filter(c => now - (c.updatedAt || 0) < TOUR.RECENT_MS)).slice(0, TOUR.RECENT);
  const rest = shuffle(list.filter(c => !recent.includes(c))).slice(0, TOUR.MAX - recent.length);
  return shuffle([...recent, ...rest]).map(c => {
    const f = nestFeatures(c.data), isRecent = recent.includes(c);
    return { nestId: c.nestId, name: c.name, region: c.region || 'plains', desc: nestTourDesc(f, { recent: isRecent }), rooms: f.rooms, decor: f.decor, curios: f.curios, recent: isRecent,
      policy: c.policy, friend: !!c.friend, x: c.x, y: c.y };
  });
}
