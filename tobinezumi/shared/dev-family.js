// tobinezumi/shared/dev-family.js — 開発用（動作確認・スクリーンショット）：家族をすぐに作る。サーバーは TOBI_DEV=1 のときだけ、オフラインは dev() から。
import { makeInd } from './family.js';
import { DAY_MS } from './daynight.js';

/** 開発用：家族をすぐに作る（{mate:1, pups:3, young:2, friend:1}）。動作確認・スクリーンショット用 */
export function devFamily(h, spec, newId, now = 0) {
  const out = [];
  const FURS = ['sand', 'cream', 'rufous', 'graybrown', 'white'];
  const g = (k) => { const c = FURS[k % 5]; return { ...h.me.genes, col: [c, c], fur: c, pied: k === 3 ? [1, 1] : [0, 0], ear: new Array(8).fill(k === 2 ? 1 : 0), leg: new Array(8).fill(k === 4 ? 1 : 0) }; };
  if (spec.mate && !h.mate) out.push(makeInd({ id: newId(), name: 'サラ', sex: h.me.sex === 'f' ? 'm' : 'f', genes: g(1), role: 'mate', ageMs: 6 * DAY_MS, fed: 100, named: true, bornAt: now }));
  const mate = h.mate || out[0] || null;
  const mo = h.me.sex === 'f' ? h.me.id : mate ? mate.id : null, fa = h.me.sex === 'm' ? h.me.id : mate ? mate.id : null;
  const names = ['ポポ', 'チロ', 'ミミ', 'ココ', 'ピピ', 'ルル'];
  for (let i = 0; i < Math.min(6, spec.pups | 0); i++) out.push(makeInd({ id: newId(), name: names[i], sex: i % 2 ? 'm' : 'f', generation: (h.me.generation || 1) + 1, mother_id: mo, father_id: fa, genes: g(i + 2), role: 'pup', ageMs: 0.3 * DAY_MS, fed: i === 0 ? 30 : 90, named: true, bornAt: now }));
  for (let i = 0; i < Math.min(3, spec.young | 0); i++) out.push(makeInd({ id: newId(), name: ['ソラ', 'ハル', 'ユズ'][i], sex: i % 2 ? 'f' : 'm', generation: (h.me.generation || 1) + 1, mother_id: mo, father_id: fa, genes: g(i + 4), role: 'pup', ageMs: 2 * DAY_MS, fed: 90, named: true, bornAt: now }));
  if (spec.friend) { const f = makeInd({ id: newId(), name: 'ルナ', sex: 'f', genes: g(3), role: 'friend', ageMs: 7 * DAY_MS, fed: 100, named: true, bornAt: now, species: 'longear' }); f.wild = true; out.push(f); }
  h.members.push(...out);
  return out;
}
