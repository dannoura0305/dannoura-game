// LOD（遠い物ほど粗い形）の選び方。DOM・three.js なし（node で試験）。mapkit/render/kit.js が毎フレームではなく、カメラが動いた時に使う。
// dists：[LOD0→1 の距離, LOD1→2 の距離, …]（m・部品の meta.json の kit.lodDist × 段の lodScale）。最後の距離より遠い物は最後の LOD（遠景の板があればそれ）。
// 行ったり来たりしないよう、今の LOD から変える時は hysteresis（割合）だけ余分に越えたら変える。cull＝これより遠いと描かない（霧の奥）。

/** 距離 d → LOD の番号（0 が一番細かい）。prev＝今の番号（無ければ -1）。lodMin＝使う一番細かい番号（スマホ＝1） */
export function lodIndex(d, dists, prev = -1, hysteresis = 0.08, lodMin = 0) {
  let k = 0;
  while (k < dists.length && d > dists[k]) k++;
  if (prev >= 0 && k !== prev) {
    // 境目の近くでは前の番号を保つ
    const edge = k > prev ? dists[k - 1] : dists[k];
    if (edge != null && Math.abs(d - edge) < edge * hysteresis) k = prev;
  }
  return Math.max(lodMin, k);
}

/**
 * 物の列を LOD ごとに分ける。items＝[{ x, y, z, r（半径）, lod?（前の番号・書き換える） }]、cam＝{ x, y, z }。
 * visible(item)＝視野の中か（無ければ全部）。戻り値：buckets[lod]＝[item の番号...]・stats
 */
export function assignLods(items, cam, dists, { cull = Infinity, hysteresis = 0.08, lodMin = 0, visible = null, maxLod = dists.length } = {}) {
  const buckets = Array.from({ length: maxLod + 1 }, () => []);
  let culled = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i], d = Math.hypot(it.x - cam.x, it.y - cam.y, it.z - cam.z) - (it.r || 0);
    if (d > cull || (visible && !visible(it))) { culled++; it.lod = -1; continue; }
    const k = Math.min(maxLod, lodIndex(Math.max(0, d), dists, it.lod ?? -1, hysteresis, lodMin));
    it.lod = k; buckets[k].push(i);
  }
  return { buckets, culled };
}

/** 段の倍率をかけた LOD の距離（最低 4m） */
export function scaledDists(dists, scale = 1) { return (dists || []).map(d => Math.max(4, d * scale)); }
