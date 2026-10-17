// 足元の面（足音の音色を選ぶ）：家の床の材質（畳・板・土間）・道（土・砂利）・森の床・石（祠の基壇）。DOM なし（node で試験）。
import { nearestOnPath } from '../pcg/paths.js';

export function surfaceIndex(layout) {
  const mats = new Map();
  for (const b of layout.buildings || []) for (const p of b.parts || []) if (p.walk) mats.set(p.id, p.mat);
  return mats;
}
/** (x,z) の面：'tatami'|'wood'|'earth'|'stone'|'gravel'|'dirt'|'forest' */
export function surfaceAt(world, idx, x, z) {
  const f = world.floorAt(x, z), g = world.hf.at(x, z);
  if (f && f.top >= g - 0.05) { const m = idx.get(f.id); return m === 'tatami' ? 'tatami' : m === 'earth' ? 'earth' : m === 'stone' ? 'stone' : 'wood'; }
  for (const p of world.layout.paths || []) { const n = nearestOnPath(p.points, x, z); if (n.d < p.width / 2 + 0.2) return p.kind === 'shrine_approach' ? 'gravel' : 'dirt'; }
  return 'forest';
}
