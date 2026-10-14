// 装備を戦闘の数値に当てる（DOM なし・純粋関数）。base は変えずに写しを返す。
import { EQUIP, EQUIP_SLOTS } from '../data/equip.js';

export function combatWithEquip(base, ids = []) {
  const C = JSON.parse(JSON.stringify(base));
  for (const id of ids.slice(0, EQUIP_SLOTS)) {
    const e = EQUIP[id]; if (!e) continue;
    for (const [path, dv] of Object.entries(e.mods)) {
      const ks = path.split('.'); let o = C; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
      const k = ks[ks.length - 1]; o[k] = Math.max(1, o[k] + dv);
    }
  }
  return C;
}
/** 装備を付ける・外す（枠の数を守る）。戻り値：新しい一覧 */
export function toggleEquip(list, id) {
  const l = list.slice();
  const i = l.indexOf(id);
  if (i >= 0) { l.splice(i, 1); return l; }
  if (!EQUIP[id]) return l;
  if (l.length >= EQUIP_SLOTS) l.shift();
  l.push(id); return l;
}
