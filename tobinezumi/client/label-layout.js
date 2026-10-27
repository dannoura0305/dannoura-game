// tobinezumi/client/label-layout.js — Ver.0.9：名札が重ならないように並べる（DOM なし。tests/tobinezumi-v09.test.mjs で確かめる）
// labels = [{x, y, w, h, prio}]（x は中心、y は下端。prio が大きいほど先に置く＝動かない）
// 重なるなら上へ（step px ずつ・maxLift 回まで）ずらす。それでも重なるなら hidden。返り値は同じ順の [{x, y, hidden, lifted}]
export function layoutLabels(labels, { step = null, maxLift = 2, pad = 1 } = {}) {
  const order = labels.map((l, i) => i).sort((a, b) => (labels[b].prio || 0) - (labels[a].prio || 0) || labels[a].y - labels[b].y || labels[a].x - labels[b].x);
  const placed = [];
  const out = labels.map(l => ({ x: l.x, y: l.y, hidden: false, lifted: 0 }));
  const box = (l, y) => ({ l: l.x - l.w / 2 - pad, r: l.x + l.w / 2 + pad, t: y - l.h - pad, b: y + pad });
  const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  for (const i of order) {
    const l = labels[i], st = step != null ? step : l.h + 1;
    let ok = false;
    for (let k = 0; k <= maxLift; k++) {
      const y = l.y - k * st, bx = box(l, y);
      if (!placed.some(p => hit(p, bx))) { placed.push(bx); out[i] = { x: l.x, y, hidden: false, lifted: k }; ok = true; break; }
    }
    if (!ok) out[i] = { x: l.x, y: l.y, hidden: true, lifted: 0 };
  }
  return out;
}
