// 連鎖一閃の相手選び（COMBAT_SYSTEM_SPEC §3.3）。DOM なし・純粋関数。
// 一閃が当たった直後、近くに「見切り」状態（青い縁：大きくよろけている）の敵がいれば、その敵へ跳んで一閃できる。最大 5 連鎖。
/**
 * from：{x,z}、enemies：[{ id, x, z, alive, chainable }]、opt：{ exclude:Set|Array, range }
 * 戻り値：いちばん近い相手（無ければ null）
 */
export function pickChainTarget(from, enemies, opt = {}) {
  const ex = new Set(opt.exclude || []), range = opt.range ?? 7;
  let best = null, bd = Infinity;
  for (const e of enemies) {
    if (!e.alive || !e.chainable || ex.has(e.id)) continue;
    const d = Math.hypot(e.x - from.x, e.z - from.z);
    if (d <= range && d < bd) { bd = d; best = e; }
  }
  return best;
}
/** 連鎖を続けられるか（数の上限） */
export function canChain(count, C) { return count < (C.issen.chain.max || 5); }
