// tobinezumi/shared/follow.js — Ver.0.6：地上で親についてくる若者の位置（足あとをたどる）。サーバーとオフライン・自分の画面で同じ規則。DOM なし。
//
// ・親の通った所を FOLLOW.STEP px ごとに足あととして残し（FOLLOW.MAX_PTS まで）、i 番目の若者は足あとを
//   FOLLOW.GAP0 + i × FOLLOW.GAP px さかのぼった所にいる（足あとが足りなければ親の少し後ろ）。
// ・オンライン：サーバーが確定位置から足あとを持ち、スナップショットのその子の行に k:[[x,y],…]（若者の位置）と kh（かくれている）を入れる
//   → ほかの子の画面でも、親の通った道どおりに歩く（Ver.0.4 の「見た目だけ各画面で追従」を直した）。自分の画面は予測の位置で同じ計算。
// ・捕食者が FOLLOW.HIDE_R px 以内にいると、若者は巣へかくれる（消える）。いなくなると戻る（サーバーが kh を決める）。
export const FOLLOW = { STEP: 2, MAX_PTS: 90, GAP0: 18, GAP: 16, HIDE_R: 150 };

/** 足あとを足す（前の点から STEP px 以上動いたとき）。tr は配列（そのまま書きかえる） */
export function trailPush(tr, x, y) {
  const last = tr[tr.length - 1];
  if (!last || Math.hypot(x - last.x, y - last.y) > FOLLOW.STEP) { tr.push({ x, y }); if (tr.length > FOLLOW.MAX_PTS) tr.shift(); return true; }
  return false;
}
/** 若者 n 匹の位置（足あとをさかのぼる）。owner = {x, y}。返り値 [{x, y, dir}] */
export function kidSpots(tr, owner, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const want = FOLLOW.GAP0 + i * FOLLOW.GAP;
    let acc = 0, px = owner.x, py = owner.y, q = null, prev = null;
    for (let j = tr.length - 1; j >= 0; j--) {
      const t = tr[j], d = Math.hypot(t.x - px, t.y - py);
      if (acc + d >= want && d > 0) { const k = (want - acc) / d; q = { x: px + (t.x - px) * k, y: py + (t.y - py) * k }; prev = { x: px, y: py }; break; }
      acc += d; px = t.x; py = t.y;
    }
    if (!q) { q = { x: owner.x - 10 - i * 9, y: owner.y + 4 + (i % 2) * 3 }; prev = owner; }
    const dx = prev.x - q.x, dy = prev.y - q.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    out.push({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10, dir });
  }
  return out;
}
/** 捕食者が近いか（若者が巣へかくれる） */
export function kidsHidden(preds, owner) {
  return (preds || []).some(p => !p.gone && p.state !== 'leave' && Math.hypot(p.x - owner.x, p.y - owner.y) < FOLLOW.HIDE_R);
}
/** スナップショットに入れる形 [[x,y],…] → [{x,y,dir}] */
export const packSpots = spots => spots.map(q => [q.x, q.y]);
export function unpackSpots(k) { return Array.isArray(k) ? k.filter(a => Array.isArray(a) && a.length >= 2).map(a => ({ x: Number(a[0]) || 0, y: Number(a[1]) || 0 })) : []; }
